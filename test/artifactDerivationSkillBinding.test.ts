import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  canonicalDigest,
  canonicalDigestExcluding,
} from '../src/core/canonicalize.js';
import { validateArtifactStructure } from '../src/core/structural-validator.js';
import { buildFigure } from '../src/render/buildFigure.js';

type MutableRecord = Record<string, any>;

type FixtureName =
  | 'weightIndividual'
  | 'weightDerived'
  | 'weightPreaggregated'
  | 'compartmentPlain'
  | 'compartmentAggregate'
  | 'spikeRaster';

const root = path.resolve(import.meta.dirname, '..');

function contractExamples(skillId: string): readonly MutableRecord[] {
  const contract = JSON.parse(readFileSync(
    path.join(root, `contract/skills/${skillId}.v1.json`),
    'utf8',
  )) as { examples: { valid: MutableRecord[] } };
  return contract.examples.valid;
}

const weightExamples = contractExamples('network.synaptic_weight_trace');
const compartmentExamples = contractExamples('neuro.compartment_trace');
const spikeExamples = contractExamples('neuro.spike_raster');

const requestByFixture: Readonly<Record<FixtureName, MutableRecord>> = {
  weightIndividual: weightExamples[0],
  weightDerived: weightExamples[1],
  weightPreaggregated: weightExamples[2],
  compartmentPlain: compartmentExamples[0],
  compartmentAggregate: compartmentExamples[1],
  spikeRaster: spikeExamples[0],
};

const artifactCache = new Map<FixtureName, MutableRecord>();

function artifactFor(name: FixtureName): MutableRecord {
  let artifact = artifactCache.get(name);
  if (!artifact) {
    const result = buildFigure(structuredClone(requestByFixture[name]));
    if (!result.ok) {
      throw new Error(
        `${name} fixture did not build:\n${JSON.stringify(result.errors, null, 2)}`,
      );
    }
    artifact = result.artifact as MutableRecord;
    artifactCache.set(name, artifact);
  }
  return structuredClone(artifact);
}

function operationsOf(artifact: MutableRecord): MutableRecord[] {
  return artifact.derivation.operations as MutableRecord[];
}

function expectAccepted(artifact: MutableRecord, label: string): void {
  const result = validateArtifactStructure(artifact);
  expect(result.ok, `${label}\n${JSON.stringify(result.errors, null, 2)}`).toBe(true);
}

function expectRefused(artifact: MutableRecord, label: string): void {
  const result = validateArtifactStructure(artifact);
  expect(result.ok, label).toBe(false);
}

function expectMutationRefused(
  fixture: FixtureName,
  label: string,
  mutate: (artifact: MutableRecord, operations: MutableRecord[]) => void,
): void {
  const artifact = artifactFor(fixture);
  mutate(artifact, operationsOf(artifact));
  artifact.artifactDigest = canonicalDigestExcluding(artifact, 'artifactDigest');
  expectRefused(artifact, `${fixture}: ${label}`);
}

function preparationBatch(fixture: FixtureName): MutableRecord {
  return operationsOf(artifactFor(fixture))[0];
}

function aggregateOperation(fixture: 'weightDerived' | 'compartmentAggregate'): MutableRecord {
  return operationsOf(artifactFor(fixture))[1];
}

function rewrapAggregate(operation: MutableRecord): void {
  const domain = operation.parameters.digestDomain;
  operation.inputDigest = canonicalDigest({
    digestDomain: `${domain}/operation-input`,
    payload: {
      preparationBatchOutputDigest:
        operation.parameters.preparationBatchOutputDigest,
      scientificInputDigest: operation.receipt.scientificInputDigest,
    },
  });
  operation.outputDigest = canonicalDigest({
    digestDomain: `${domain}/operation-output`,
    payload: {
      scientificOutputDigest: operation.receipt.scientificOutputDigest,
      outputUnits: operation.receipt.outputUnits,
    },
  });
}

function rewrapPreparationBatch(operation: MutableRecord): void {
  operation.outputDigest = canonicalDigest({
    digestDomain: `${operation.parameters.digestDomain}/operation-output`,
    payload: operation.receipt,
  });
}

function rechainWeightAggregate(
  preparation: MutableRecord,
  aggregate: MutableRecord,
): void {
  aggregate.parameters.preparationBatchOutputDigest = preparation.outputDigest;
  aggregate.receipt.preparationBatchOutputDigest = preparation.outputDigest;
  const witnessProjection = preparation.receipt.seriesReceipts.flatMap(
    (entry: MutableRecord) => entry.contextWitnesses
      .filter((witness: MutableRecord) =>
        witness.consultedByDerivedAggregate === true)
      .map((witness: MutableRecord) => ({
        seriesIdentity: entry.seriesIdentity,
        role: witness.role,
        stateObservationIndex: witness.stateObservationIndex,
        observationDigest: witness.observationDigest,
      })),
  );
  aggregate.receipt.stateWitnessDigest = canonicalDigest({
    digestDomain:
      'cortexel.weight_trace.aggregate_members/v4/state-witnesses',
    payload: witnessProjection,
  });
  rewrapAggregate(aggregate);
}

describe('FigureArtifactV1 derivation skill, mode, and order binding', () => {
  it('accepts every producer-emitted operation topology covered by the closure', () => {
    for (const fixture of Object.keys(requestByFixture) as FixtureName[]) {
      expectAccepted(artifactFor(fixture), fixture);
    }

    expect(operationsOf(artifactFor('weightIndividual')).map(({ id }) => id)).toEqual([
      'weight.trace.prepare_series_batch',
    ]);
    expect(operationsOf(artifactFor('weightDerived')).map(({ id }) => id)).toEqual([
      'weight.trace.prepare_series_batch',
      'weight.aggregate.membership_bound',
    ]);
    expect(operationsOf(artifactFor('weightPreaggregated')).map(({ id }) => id)).toEqual([
      'weight.trace.prepare_series_batch',
    ]);
    expect(operationsOf(artifactFor('compartmentPlain')).map(({ id }) => id)).toEqual([
      'compartment.trace.prepare_series_batch',
    ]);
    expect(operationsOf(artifactFor('compartmentAggregate')).map(({ id }) => id)).toEqual([
      'compartment.trace.prepare_series_batch',
      'compartment.aggregate.explicit_selection',
    ]);
    expect(operationsOf(artifactFor('spikeRaster')).map(({ id }) => id)).toEqual([
      'spike_raster.partition_and_rows',
    ]);
  });

  it('forbids grafting either preparation-batch family onto the wrong skill', () => {
    const weightBatch = preparationBatch('weightIndividual');
    const compartmentBatch = preparationBatch('compartmentPlain');

    expectMutationRefused('compartmentPlain', 'weight batch replaces compartment batch', (
      _artifact,
      operations,
    ) => {
      operations.splice(0, operations.length, structuredClone(weightBatch));
    });
    expectMutationRefused('weightIndividual', 'compartment batch replaces weight batch', (
      _artifact,
      operations,
    ) => {
      operations.splice(0, operations.length, structuredClone(compartmentBatch));
    });
    expectMutationRefused('spikeRaster', 'weight batch replaces an unrelated operation', (
      _artifact,
      operations,
    ) => {
      operations.splice(0, operations.length, structuredClone(weightBatch));
    });
  });

  it('requires exactly one preparation batch in the first position', () => {
    for (const fixture of [
      'weightIndividual',
      'weightDerived',
      'weightPreaggregated',
      'compartmentPlain',
      'compartmentAggregate',
    ] as const) {
      expectMutationRefused(fixture, 'preparation batch removed', (_artifact, operations) => {
        operations.shift();
      });
      expectMutationRefused(fixture, 'preparation batch duplicated', (_artifact, operations) => {
        operations.splice(1, 0, structuredClone(operations[0]));
      });
    }

    for (const fixture of ['weightDerived', 'compartmentAggregate'] as const) {
      expectMutationRefused(fixture, 'aggregate and preparation batch swapped', (
        _artifact,
        operations,
      ) => {
        operations.reverse();
      });
    }
  });

  it('binds the weight preparation identity branch to edges versus preaggregated mode', () => {
    const memberBatch = preparationBatch('weightIndividual');
    const declaredAggregateBatch = preparationBatch('weightPreaggregated');

    for (const fixture of ['weightIndividual', 'weightDerived'] as const) {
      expectMutationRefused(fixture, 'declared-aggregate identity used for edge series', (
        _artifact,
        operations,
      ) => {
        operations[0] = structuredClone(declaredAggregateBatch);
      });
    }
    expectMutationRefused(
      'weightPreaggregated',
      'member identity used for a caller-declared aggregate',
      (_artifact, operations) => {
        operations[0] = structuredClone(memberBatch);
      },
    );
  });

  it('requires the requested aggregate and forbids an unrequested aggregate', () => {
    expectMutationRefused('weightDerived', 'requested weight aggregate removed', (
      _artifact,
      operations,
    ) => {
      operations.pop();
    });
    expectMutationRefused('compartmentAggregate', 'requested compartment aggregate removed', (
      _artifact,
      operations,
    ) => {
      operations.pop();
    });

    const weightAggregate = aggregateOperation('weightDerived');
    for (const fixture of ['weightIndividual', 'weightPreaggregated'] as const) {
      expectMutationRefused(fixture, 'unrequested weight aggregate appended', (
        _artifact,
        operations,
      ) => {
        const aggregate = structuredClone(weightAggregate);
        aggregate.parameters.preparationBatchOutputDigest = operations[0].outputDigest;
        aggregate.receipt.preparationBatchOutputDigest = operations[0].outputDigest;
        operations.push(aggregate);
      });
    }

    const compartmentAggregate = aggregateOperation('compartmentAggregate');
    expectMutationRefused('compartmentPlain', 'unrequested compartment aggregate appended', (
      _artifact,
      operations,
    ) => {
      const aggregate = structuredClone(compartmentAggregate);
      aggregate.parameters.preparationBatchOutputDigest = operations[0].outputDigest;
      aggregate.receipt.preparationBatchOutputDigest = operations[0].outputDigest;
      operations.push(aggregate);
    });
  });

  it('binds every aggregate to the immediately preceding preparation output digest', () => {
    for (const fixture of ['weightDerived', 'compartmentAggregate'] as const) {
      for (const [label, mutate] of [
        ['parameter link removed', (aggregate: MutableRecord) => {
          delete aggregate.parameters.preparationBatchOutputDigest;
        }],
        ['receipt link removed', (aggregate: MutableRecord) => {
          delete aggregate.receipt.preparationBatchOutputDigest;
        }],
        ['parameter link mismatched', (aggregate: MutableRecord) => {
          aggregate.parameters.preparationBatchOutputDigest = `sha256:${'a'.repeat(64)}`;
        }],
        ['receipt link mismatched', (aggregate: MutableRecord) => {
          aggregate.receipt.preparationBatchOutputDigest = `sha256:${'b'.repeat(64)}`;
        }],
        ['both links agree but mismatch the preparation batch', (aggregate: MutableRecord) => {
          const unrelatedDigest = `sha256:${'c'.repeat(64)}`;
          aggregate.parameters.preparationBatchOutputDigest = unrelatedDigest;
          aggregate.receipt.preparationBatchOutputDigest = unrelatedDigest;
        }],
      ] as const) {
        expectMutationRefused(fixture, label, (_artifact, operations) => {
          mutate(operations[1]);
        });
      }
    }
  });

  it('fixes each aggregate operation id, algorithm, and revision', () => {
    for (const fixture of ['weightDerived', 'compartmentAggregate'] as const) {
      for (const [label, mutate] of [
        ['wrong id', (aggregate: MutableRecord) => {
          aggregate.id = 'unbound.aggregate';
        }],
        ['wrong algorithm', (aggregate: MutableRecord) => {
          aggregate.algorithm = 'cortexel.unbound.aggregate';
        }],
        ['wrong revision', (aggregate: MutableRecord) => {
          aggregate.algorithmRevision = 2;
        }],
      ] as const) {
        expectMutationRefused(fixture, label, (_artifact, operations) => {
          mutate(operations[1]);
        });
      }
    }
  });

  it('rejects coherently rewrapped weight aggregate receipt forgeries', () => {
    for (const [label, mutate] of [
      ['selected member order', (aggregate: MutableRecord) => {
        aggregate.receipt.selectedMemberIds.reverse();
      }],
      ['foreign initial-state contributor', (aggregate: MutableRecord) => {
        aggregate.receipt.initialStateContributorIds = ['not-a-selected-edge'];
      }],
      ['evaluation count', (aggregate: MutableRecord) => {
        aggregate.receipt.evaluationCount -= 1;
      }],
      ['scientific output digest', (aggregate: MutableRecord) => {
        aggregate.receipt.scientificOutputDigest = `sha256:${'d'.repeat(64)}`;
        rewrapAggregate(aggregate);
      }],
      ['registered but wrong output units', (aggregate: MutableRecord) => {
        aggregate.receipt.outputUnits = {
          timeUnit: 's',
          valueUnit: 'mV',
        };
        rewrapAggregate(aggregate);
      }],
      ['output array cardinality with internally refreshed digest', (
        aggregate: MutableRecord,
      ) => {
        aggregate.receipt.output.aggregateValues.pop();
        aggregate.receipt.scientificOutputDigest = canonicalDigest(
          aggregate.receipt.output,
        );
        rewrapAggregate(aggregate);
      }],
      ['descriptive spread sample count with internally refreshed digest', (
        aggregate: MutableRecord,
      ) => {
        const sampleCounts =
          aggregate.receipt.output.uncertainty.sampleCount as (number | null)[];
        const index = sampleCounts.findIndex((candidate) => candidate !== null);
        sampleCounts[index] = Number(sampleCounts[index]) + 1;
        aggregate.receipt.scientificOutputDigest = canonicalDigest(
          aggregate.receipt.output,
        );
        rewrapAggregate(aggregate);
      }],
      ['member count with internally refreshed digest', (aggregate: MutableRecord) => {
        aggregate.receipt.output.memberCounts[0] += 1;
        aggregate.receipt.scientificOutputDigest = canonicalDigest(
          aggregate.receipt.output,
        );
        rewrapAggregate(aggregate);
      }],
      ['out-of-window time with internally refreshed digest', (
        aggregate: MutableRecord,
      ) => {
        aggregate.receipt.output.evaluationTimes[0] = -1;
        aggregate.receipt.scientificOutputDigest = canonicalDigest(
          aggregate.receipt.output,
        );
        rewrapAggregate(aggregate);
      }],
      ['union grid missing the analysis-window start', (
        aggregate: MutableRecord,
      ) => {
        aggregate.receipt.output.evaluationTimes[0] = 1;
        aggregate.receipt.scientificOutputDigest = canonicalDigest(
          aggregate.receipt.output,
        );
        rewrapAggregate(aggregate);
      }],
      ['state witness digest', (aggregate: MutableRecord) => {
        aggregate.receipt.stateWitnessDigest = `sha256:${'f'.repeat(64)}`;
      }],
      ['unrequested conversion receipt', (aggregate: MutableRecord) => {
        aggregate.receipt.membershipTimeConversion = {
          from: 's',
          to: 'ms',
          factor: 1000,
          exactFactor: {
            numerator: '1000',
            denominator: '1',
            binaryExponent: 0,
          },
          algorithm: 'exact_rational_round_to_binary64',
        };
      }],
    ] as const) {
      expectMutationRefused('weightDerived', label, (_artifact, operations) => {
        mutate(operations[1]);
      });
    }
  });

  it('enforces exact one-contributor descriptive interval identities', () => {
    for (const dispersion of [
      { kind: 'ensemble_range' },
      {
        kind: 'quantile_interval',
        lowerQuantile: 0.25,
        upperQuantile: 0.75,
      },
    ]) {
      const request = structuredClone(weightExamples[1]);
      request.data.series = [request.data.series[0]];
      request.data.membership.members = [request.data.membership.members[0]];
      request.parameters.aggregate.dispersion = dispersion;
      const result = buildFigure(request);
      expect(
        result.ok,
        result.ok ? '' : JSON.stringify(result.errors, null, 2),
      ).toBe(true);
      if (!result.ok) continue;
      const artifact = structuredClone(result.artifact) as MutableRecord;
      const aggregate = operationsOf(artifact)[1];
      const center = aggregate.receipt.output.aggregateValues[0];
      aggregate.receipt.output.uncertainty.lower[0] = center - 1;
      aggregate.receipt.output.uncertainty.upper[0] = center + 1;
      aggregate.receipt.scientificOutputDigest = canonicalDigest(
        aggregate.receipt.output,
      );
      rewrapAggregate(aggregate);
      artifact.artifactDigest = canonicalDigestExcluding(
        artifact,
        'artifactDigest',
      );
      expectRefused(
        artifact,
        `${dispersion.kind} cannot widen a one-contributor interval`,
      );
    }
  });

  it('binds shared-grid aggregate cardinality to every selected prepared view', () => {
    const request = structuredClone(weightExamples[1]);
    request.data.series = request.data.series.slice(0, 2);
    request.data.membership.members = request.data.membership.members.slice(0, 2);
    request.data.observation = { kind: 'point_sample' };
    for (const series of request.data.series) delete series.eventKinds;
    request.parameters.aggregate.evaluation = { mode: 'shared_sample_grid' };
    request.parameters.aggregate.dispersion = {
      kind: 'none',
      reason: 'not_computed',
    };
    const result = buildFigure(request);
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;
    const artifact = structuredClone(result.artifact) as MutableRecord;
    const aggregate = operationsOf(artifact)[1];
    aggregate.receipt.evaluationCount -= 1;
    aggregate.receipt.output.evaluationTimes.pop();
    aggregate.receipt.output.aggregateValues.pop();
    aggregate.receipt.output.memberCounts.pop();
    aggregate.receipt.output.contributingCounts.pop();
    aggregate.receipt.scientificOutputDigest = canonicalDigest(
      aggregate.receipt.output,
    );
    rewrapAggregate(aggregate);
    artifact.artifactDigest = canonicalDigestExcluding(artifact, 'artifactDigest');
    expectRefused(
      artifact,
      'shared grid cannot be coherently truncated below prepared-view cardinality',
    );
  });

  it('binds raw-member paint evidence to the request-derived display role', () => {
    const request = structuredClone(weightExamples[1]);
    request.parameters.display = 'aggregate_derived';
    const result = buildFigure(request);
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;

    for (const [label, mutate] of [
      ['painted initial state', (entry: MutableRecord) => {
        entry.initialStatePainted = true;
      }],
      ['presentation-only context witness', (entry: MutableRecord) => {
        entry.contextWitnesses.push({
          role: 'carry_in',
          stateObservationIndex: 0,
          consultedByDerivedAggregate: false,
          observationDigest: `sha256:${'a'.repeat(64)}`,
        });
      }],
      ['non-null displayed materialization commitment', (entry: MutableRecord) => {
        entry.materialization.displayedOutputDigest = `sha256:${'b'.repeat(64)}`;
      }],
    ] as const) {
      const artifact = structuredClone(result.artifact) as MutableRecord;
      const operations = operationsOf(artifact);
      mutate(operations[0].receipt.seriesReceipts[0]);
      rewrapPreparationBatch(operations[0]);
      rechainWeightAggregate(operations[0], operations[1]);
      artifact.artifactDigest = canonicalDigestExcluding(artifact, 'artifactDigest');
      expectRefused(artifact, `unpainted member cannot claim ${label}`);
    }
  });

  it('binds context-witness roles to event update semantics', () => {
    const artifact = artifactFor('weightDerived');
    const operations = operationsOf(artifact);
    operations[0].receipt.seriesReceipts[0].contextWitnesses.push({
      role: 'look_ahead',
      stateObservationIndex: 0,
      consultedByDerivedAggregate: true,
      observationDigest: `sha256:${'c'.repeat(64)}`,
    });
    rewrapPreparationBatch(operations[0]);
    rechainWeightAggregate(operations[0], operations[1]);
    artifact.artifactDigest = canonicalDigestExcluding(artifact, 'artifactDigest');
    expectRefused(
      artifact,
      'value-after update semantics cannot carry a look-ahead state witness',
    );
  });

  it('binds a declared aggregate grid to the exact converted request carrier', () => {
    const request = structuredClone(weightExamples[1]);
    request.parameters.aggregate.evaluation = {
      mode: 'hold_last_observed_at_declared_times',
      times: {
        kind: 'time',
        unit: 'ms',
        values: [0, 400, 500, 800],
      },
    };
    const result = buildFigure(request);
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;
    const artifact = structuredClone(result.artifact) as MutableRecord;
    const aggregate = operationsOf(artifact)[1];
    aggregate.receipt.output.evaluationTimes[1] = 450;
    aggregate.receipt.scientificOutputDigest = canonicalDigest(
      aggregate.receipt.output,
    );
    rewrapAggregate(aggregate);
    artifact.artifactDigest = canonicalDigestExcluding(artifact, 'artifactDigest');
    expectRefused(
      artifact,
      'a coherently rewrapped output axis cannot diverge from the declared grid',
    );
  });

  it('rejects coherently rewrapped compartment aggregate receipt forgeries', () => {
    for (const [label, mutate] of [
      ['selection weight cardinality', (aggregate: MutableRecord) => {
        aggregate.parameters.weights.pop();
      }],
      ['selected count', (aggregate: MutableRecord) => {
        aggregate.receipt.selectedCompartmentCount -= 1;
      }],
      ['missing count', (aggregate: MutableRecord) => {
        aggregate.receipt.missingBecauseAbsentOrAmbiguousCount = 0;
      }],
      ['scientific output digest', (aggregate: MutableRecord) => {
        aggregate.receipt.scientificOutputDigest = `sha256:${'e'.repeat(64)}`;
        rewrapAggregate(aggregate);
      }],
      ['output array cardinality with internally refreshed digest', (
        aggregate: MutableRecord,
      ) => {
        aggregate.receipt.output.value.values.pop();
        aggregate.receipt.scientificOutputDigest = canonicalDigest({
          times: aggregate.receipt.output.time.values,
          values: aggregate.receipt.output.value.values,
          unit: aggregate.receipt.output.value.unit,
        });
        rewrapAggregate(aggregate);
      }],
      ['nonmonotone output axis with internally refreshed digest', (
        aggregate: MutableRecord,
      ) => {
        aggregate.receipt.output.time.values.reverse();
        aggregate.receipt.scientificOutputDigest = canonicalDigest({
          times: aggregate.receipt.output.time.values,
          values: aggregate.receipt.output.value.values,
          unit: aggregate.receipt.output.value.unit,
        });
        rewrapAggregate(aggregate);
      }],
      ['out-of-window output time with internally refreshed digest', (
        aggregate: MutableRecord,
      ) => {
        aggregate.receipt.output.time.values[0] = -1;
        aggregate.receipt.scientificOutputDigest = canonicalDigest({
          times: aggregate.receipt.output.time.values,
          values: aggregate.receipt.output.value.values,
          unit: aggregate.receipt.output.value.unit,
        });
        rewrapAggregate(aggregate);
      }],
      ['self-consistent but request-incompatible output units', (
        aggregate: MutableRecord,
      ) => {
        aggregate.receipt.output.time.unit = 's';
        aggregate.receipt.output.value.unit = 'mV';
        aggregate.receipt.outputUnits = {
          timeUnit: 's',
          valueUnit: 'mV',
        };
        aggregate.receipt.scientificOutputDigest = canonicalDigest({
          times: aggregate.receipt.output.time.values,
          values: aggregate.receipt.output.value.values,
          unit: aggregate.receipt.output.value.unit,
        });
        rewrapAggregate(aggregate);
      }],
    ] as const) {
      expectMutationRefused(
        'compartmentAggregate',
        label,
        (_artifact, operations) => {
          mutate(operations[1]);
        },
      );
    }
  });

  it('forbids trace-preparation batch algorithms on an unrelated skill', () => {
    for (const batchFixture of ['weightIndividual', 'compartmentPlain'] as const) {
      expectMutationRefused('spikeRaster', `${batchFixture} batch appended`, (
        _artifact,
        operations,
      ) => {
        operations.push(preparationBatch(batchFixture));
      });
    }
  });
});
