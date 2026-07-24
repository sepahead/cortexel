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
  | 'weightMember'
  | 'weightDerived'
  | 'weightDeclared'
  | 'weightCarryWitness'
  | 'weightWitnesses'
  | 'weightBoundConversion'
  | 'compartmentPlain'
  | 'compartmentAggregate'
  | 'compartmentTimeConversion'
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

function requestFor(name: FixtureName): MutableRecord {
  if (name === 'weightMember') return structuredClone(weightExamples[0]);
  if (name === 'weightDerived') return structuredClone(weightExamples[1]);
  if (name === 'weightDeclared') return structuredClone(weightExamples[2]);
  if (name === 'compartmentPlain') return structuredClone(compartmentExamples[0]);
  if (name === 'compartmentAggregate') return structuredClone(compartmentExamples[1]);
  if (name === 'spikeRaster') return structuredClone(spikeExamples[0]);

  if (name === 'weightCarryWitness' || name === 'weightWitnesses') {
    const request = structuredClone(weightExamples[0]);
    if (name === 'weightWitnesses') {
      request.data.observation.updateSemantics = 'value_before_update';
    }
    request.data.window = {
      start: 50,
      stop: 150,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    return request;
  }

  if (name === 'weightBoundConversion') {
    const request = structuredClone(weightExamples[0]);
    for (const series of request.data.series) {
      series.values.unit = 'nS';
      series.initialWeight.quantity.unit = 'nS';
      if (series.bounds?.lower) {
        series.bounds.lower.unit = 'pS';
        series.bounds.lower.value *= 1000;
      }
      if (series.bounds?.upper) {
        series.bounds.upper.unit = 'pS';
        series.bounds.upper.value *= 1000;
      }
    }
    return request;
  }

  const request = structuredClone(compartmentExamples[0]);
  request.presentation = {
    width: 1200,
    height: 1200,
    budgetProfile: 'agent',
  };
  for (const series of request.data.series) {
    series.time.unit = 's';
    series.time.values = series.time.values.map((value: number) => value / 1000);
  }
  return request;
}

const artifactCache = new Map<FixtureName, MutableRecord>();

function artifactFor(name: FixtureName): MutableRecord {
  let artifact = artifactCache.get(name);
  if (!artifact) {
    const result = buildFigure(requestFor(name));
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

function batchOf(artifact: MutableRecord): MutableRecord {
  return operationsOf(artifact)[0];
}

function firstEntryOf(artifact: MutableRecord): MutableRecord {
  return batchOf(artifact).receipt.seriesReceipts[0];
}

function rewrapBatchOutput(batch: MutableRecord): void {
  batch.outputDigest = canonicalDigest({
    digestDomain: `${batch.parameters.digestDomain}/operation-output`,
    payload: batch.receipt,
  });
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
  mutate: (artifact: MutableRecord) => void,
): void {
  const artifact = artifactFor(fixture);
  mutate(artifact);
  artifact.artifactDigest = canonicalDigestExcluding(artifact, 'artifactDigest');
  expectRefused(artifact, `${fixture}: ${label}`);
}

function legacyOperation(index: number): MutableRecord {
  return {
    id: `legacy.operation.${index}`,
    algorithm: 'cortexel.legacy.open_operation',
    algorithmRevision: 1,
    parameters: { legacyParameter: true },
    receipt: { legacyReceipt: true },
  };
}

describe('FigureArtifactV1 batch trace-preparation operation closure', () => {
  it('accepts the real producer artifact for every closed batch branch', () => {
    for (const fixture of [
      'weightMember',
      'weightDerived',
      'weightDeclared',
      'weightCarryWitness',
      'weightWitnesses',
      'weightBoundConversion',
      'compartmentPlain',
      'compartmentAggregate',
      'compartmentTimeConversion',
    ] as const) {
      expectAccepted(artifactFor(fixture), fixture);
    }

    expect(firstEntryOf(artifactFor('weightMember')).seriesIdentity.kind)
      .toBe('weight_member');
    expect(firstEntryOf(artifactFor('weightDeclared')).seriesIdentity.kind)
      .toBe('declared_weight_aggregate');
    expect(firstEntryOf(artifactFor('compartmentPlain')).seriesIdentity.kind)
      .toBe('compartment_series');
  });

  it('preserves historical open operations only on a matching unrelated artifact', () => {
    const artifact = artifactFor('spikeRaster');
    const legacy = legacyOperation(0);
    legacy.parameters.anotherHistoricalField = { remains: 'accepted' };
    legacy.receipt.anotherHistoricalField = [1, 2, 3];
    operationsOf(artifact).push(legacy);
    artifact.artifactDigest = canonicalDigestExcluding(artifact, 'artifactDigest');
    expectAccepted(artifact, 'spike raster plus one historical open operation');

    const sixtyFour = artifactFor('spikeRaster');
    operationsOf(sixtyFour).push(
      ...Array.from({ length: 63 }, (_unused, index) => legacyOperation(index)),
    );
    sixtyFour.artifactDigest = canonicalDigestExcluding(sixtyFour, 'artifactDigest');
    expectAccepted(sixtyFour, 'one real operation plus 63 historical open operations');

    operationsOf(sixtyFour).push(legacyOperation(63));
    sixtyFour.artifactDigest = canonicalDigestExcluding(sixtyFour, 'artifactDigest');
    expectRefused(sixtyFour, 'global operation maxItems=64');
  });

  it('requires every batch, entry, ordinal, and view-output digest', () => {
    const mutations: readonly [string, (operation: MutableRecord) => void][] = [
      ['operation input', (operation) => delete operation.inputDigest],
      ['operation output', (operation) => delete operation.outputDigest],
      ['global context', (operation) => delete operation.receipt.globalContextDigest],
      ['entry input', (operation) => delete operation.receipt.seriesReceipts[0].inputDigest],
      ['retained ordinals', (operation) => {
        delete operation.receipt.seriesReceipts[0].views[0].retainedSourceOrdinalDigest;
      }],
      ['view output', (operation) => {
        delete operation.receipt.seriesReceipts[0].views[0].outputDigest;
      }],
    ];
    for (const [label, mutate] of mutations) {
      expectMutationRefused('weightMember', label, (artifact) => {
        mutate(batchOf(artifact));
      });
    }
  });

  it('binds fixed ids, revisions, parameters, and family-specific digest domains', () => {
    const weightMutations: readonly [string, (operation: MutableRecord) => void][] = [
      ['weight id', (operation) => {
        operation.id = 'weight.trace.prepare_series';
      }],
      ['weight revision', (operation) => {
        operation.algorithmRevision = 2;
      }],
      ['missing order', (operation) => delete operation.parameters.seriesOrder],
      ['wrong canonicalization', (operation) => {
        operation.parameters.digestCanonicalization = 'json-stringify';
      }],
      ['wrong digest domain', (operation) => {
        operation.parameters.digestDomain =
          'cortexel.compartment_trace.prepare_series_batch/v1';
      }],
    ];
    for (const [label, mutate] of weightMutations) {
      expectMutationRefused('weightMember', label, (artifact) => {
        mutate(batchOf(artifact));
      });
    }

    expectMutationRefused('compartmentPlain', 'compartment id', (artifact) => {
      batchOf(artifact).id = 'compartment.trace.prepare_series';
    });
    expectMutationRefused('compartmentPlain', 'compartment revision', (artifact) => {
      batchOf(artifact).algorithmRevision = 2;
    });
    expectMutationRefused('compartmentPlain', 'compartment digest domain', (artifact) => {
      batchOf(artifact).parameters.digestDomain =
        'cortexel.weight_trace.prepare_series_batch/v1';
    });
  });

  it('closes every batch-owned nested object without closing legacy operation payloads', () => {
    const mutations: readonly [string, (artifact: MutableRecord) => void][] = [
      ['operation', (artifact) => {
        batchOf(artifact).extra = true;
      }],
      ['parameters', (artifact) => {
        batchOf(artifact).parameters.extra = true;
      }],
      ['receipt', (artifact) => {
        batchOf(artifact).receipt.extra = true;
      }],
      ['series entry', (artifact) => {
        firstEntryOf(artifact).extra = true;
      }],
      ['identity', (artifact) => {
        firstEntryOf(artifact).seriesIdentity.extra = true;
      }],
      ['view', (artifact) => {
        firstEntryOf(artifact).views[0].extra = true;
      }],
      ['window', (artifact) => {
        firstEntryOf(artifact).views[0].window.extra = true;
      }],
      ['transforms', (artifact) => {
        firstEntryOf(artifact).transforms.extra = true;
      }],
      ['materialization', (artifact) => {
        firstEntryOf(artifact).materialization.extra = true;
      }],
    ];
    for (const [label, mutate] of mutations) {
      expectMutationRefused('weightMember', label, mutate);
    }

    expectMutationRefused('weightWitnesses', 'context witness', (artifact) => {
      firstEntryOf(artifact).contextWitnesses[0].extra = true;
    });
  });

  it('pairs roles with structured identities and fixes each family view order', () => {
    expectMutationRefused('weightMember', 'wrong weight role', (artifact) => {
      firstEntryOf(artifact).role = 'declared_aggregate';
    });
    expectMutationRefused('compartmentPlain', 'wrong compartment role', (artifact) => {
      firstEntryOf(artifact).role = 'declared_aggregate';
    });

    expectMutationRefused('weightMember', 'state before display', (artifact) => {
      firstEntryOf(artifact).views.reverse();
    });
    expectMutationRefused('weightMember', 'missing state view', (artifact) => {
      firstEntryOf(artifact).views.pop();
    });
    expectMutationRefused('weightMember', 'extra state view', (artifact) => {
      firstEntryOf(artifact).views.push(structuredClone(firstEntryOf(artifact).views[1]));
    });
    expectMutationRefused('compartmentPlain', 'extra state view', (artifact) => {
      const weightStateView = firstEntryOf(artifactFor('weightMember')).views[1];
      firstEntryOf(artifact).views.push(weightStateView);
    });
  });

  it('allows only one carry-in and one look-ahead witness', () => {
    const carryIn = artifactFor('weightCarryWitness');
    expect(firstEntryOf(carryIn).contextWitnesses.map(
      (witness: MutableRecord) => witness.role,
    )).toEqual(['carry_in']);

    const lookAhead = artifactFor('weightWitnesses');
    expect(firstEntryOf(lookAhead).contextWitnesses.map(
      (witness: MutableRecord) => witness.role,
    )).toEqual(['look_ahead']);

    expectMutationRefused('weightCarryWitness', 'duplicate carry-in role', (artifact) => {
      firstEntryOf(artifact).contextWitnesses.push(
        structuredClone(firstEntryOf(artifact).contextWitnesses[0]),
      );
    });
    expectMutationRefused('weightWitnesses', 'duplicate look-ahead role', (artifact) => {
      firstEntryOf(artifact).contextWitnesses.push(
        structuredClone(firstEntryOf(artifact).contextWitnesses[0]),
      );
    });
    expectMutationRefused('weightWitnesses', 'third witness', (artifact) => {
      firstEntryOf(artifact).contextWitnesses.push({
        role: 'carry_in',
        stateObservationIndex: 0,
        observationDigest: `sha256:${'a'.repeat(64)}`,
      });
      firstEntryOf(artifact).contextWitnesses.push({
        role: 'look_ahead',
        stateObservationIndex: 0,
        observationDigest: `sha256:${'b'.repeat(64)}`,
      });
    });
    expectMutationRefused('compartmentPlain', 'impossible compartment witness', (artifact) => {
      firstEntryOf(artifact).contextWitnesses.push({
        role: 'carry_in',
        stateObservationIndex: 0,
        observationDigest: `sha256:${'a'.repeat(64)}`,
      });
    });
  });

  it('forbids aggregate-consumption claims when the request is individual-only', () => {
    expectMutationRefused(
      'weightMember',
      'initial state falsely claimed as aggregate input',
      (artifact) => {
        firstEntryOf(artifact).initialStateConsumedByDerivedAggregate = true;
        rewrapBatchOutput(batchOf(artifact));
      },
    );
    expectMutationRefused(
      'weightWitnesses',
      'context witness falsely claimed as aggregate input',
      (artifact) => {
        firstEntryOf(artifact).contextWitnesses[0].consultedByDerivedAggregate = true;
        rewrapBatchOutput(batchOf(artifact));
      },
    );
  });

  it('accepts producer-emitted exact conversions and rejects extensions', () => {
    const converted = artifactFor('compartmentTimeConversion');
    expect(firstEntryOf(converted).transforms.time).toMatchObject({
      from: 's',
      to: 'ms',
      factor: 1000,
      algorithm: 'exact_rational_round_to_binary64',
    });

    expectMutationRefused('compartmentTimeConversion', 'extended exact factor', (artifact) => {
      firstEntryOf(artifact).transforms.time.exactFactor.extra = 1;
    });
    expectMutationRefused(
      'compartmentTimeConversion',
      'self-consistently rewrapped but numerically false conversion',
      (artifact) => {
        firstEntryOf(artifact).transforms.time.factor = 999;
        rewrapBatchOutput(batchOf(artifact));
      },
    );
    expectMutationRefused(
      'compartmentTimeConversion',
      'valid conversion receipt unrelated to the canonical source carrier',
      (artifact) => {
        firstEntryOf(artifact).transforms.time = structuredClone(
          firstEntryOf(artifactFor('weightBoundConversion'))
            .transforms.renderedUpperBound,
        );
        rewrapBatchOutput(batchOf(artifact));
      },
    );

    const convertedBound = artifactFor('weightBoundConversion');
    expect(firstEntryOf(convertedBound).transforms.renderedUpperBound).toMatchObject({
      from: 'pS',
      to: 'nS',
      factor: 0.001,
      algorithm: 'exact_rational_round_to_binary64',
    });
  });

  it('binds each prepared-view window to the exact request-derived interval', () => {
    expectMutationRefused(
      'compartmentPlain',
      'coherently rewrapped but shortened display window',
      (artifact) => {
        const window = firstEntryOf(artifact).views[0].window;
        window.stop = window.start + (window.stop - window.start) / 2;
        rewrapBatchOutput(batchOf(artifact));
      },
    );
    expectMutationRefused(
      'weightMember',
      'coherently rewrapped but shifted state window',
      (artifact) => {
        firstEntryOf(artifact).views[1].window.start += 1;
        rewrapBatchOutput(batchOf(artifact));
      },
    );
  });

  it('requires explicit materialization and closes event materialization receipts', () => {
    const produced = artifactFor('weightMember');
    expect(firstEntryOf(produced).materialization).toMatchObject({
      kind: 'event_updated',
    });

    expectMutationRefused('weightMember', 'materialization missing', (artifact) => {
      delete firstEntryOf(artifact).materialization;
    });
    expectMutationRefused('weightMember', 'displayed materialization digest missing', (
      artifact,
    ) => {
      delete firstEntryOf(artifact).materialization.displayedOutputDigest;
    });
    expectMutationRefused('compartmentPlain', 'event materialization is impossible', (artifact) => {
      firstEntryOf(artifact).materialization =
        structuredClone(firstEntryOf(artifactFor('weightMember')).materialization);
    });
    expectMutationRefused(
      'weightMember',
      'event-updated source coherently stripped of materialization',
      (artifact) => {
        firstEntryOf(artifact).materialization = null;
        firstEntryOf(artifact).initialStatePainted = false;
        rewrapBatchOutput(batchOf(artifact));
      },
    );

    const pointRequest = structuredClone(weightExamples[0]);
    pointRequest.data.observation = { kind: 'point_sample' };
    for (const series of pointRequest.data.series) delete series.eventKinds;
    const pointResult = buildFigure(pointRequest);
    expect(
      pointResult.ok,
      pointResult.ok ? '' : JSON.stringify(pointResult.errors, null, 2),
    ).toBe(true);
    if (!pointResult.ok) return;
    const pointArtifact = structuredClone(pointResult.artifact) as MutableRecord;
    const fabricatedMaterialization = structuredClone(
      firstEntryOf(artifactFor('weightMember')).materialization,
    );
    firstEntryOf(pointArtifact).materialization = fabricatedMaterialization;
    rewrapBatchOutput(batchOf(pointArtifact));
    pointArtifact.artifactDigest = canonicalDigestExcluding(
      pointArtifact,
      'artifactDigest',
    );
    expectRefused(
      pointArtifact,
      'point-sample source cannot carry event materialization',
    );

    const pointWitnessArtifact = structuredClone(pointResult.artifact) as MutableRecord;
    firstEntryOf(pointWitnessArtifact).contextWitnesses = [{
      role: 'carry_in',
      stateObservationIndex: 0,
      consultedByDerivedAggregate: false,
      observationDigest: `sha256:${'a'.repeat(64)}`,
    }];
    rewrapBatchOutput(batchOf(pointWitnessArtifact));
    pointWitnessArtifact.artifactDigest = canonicalDigestExcluding(
      pointWitnessArtifact,
      'artifactDigest',
    );
    expectRefused(
      pointWitnessArtifact,
      'point-sample source cannot fabricate event-held context evidence',
    );
  });

  it('closes impossible family transforms while retaining produced applicable ones', () => {
    const conversion = structuredClone(
      firstEntryOf(artifactFor('weightBoundConversion')).transforms.renderedUpperBound,
    );

    expectMutationRefused('weightDeclared', 'declared rendered bound', (artifact) => {
      firstEntryOf(artifact).transforms.renderedLowerBound = conversion;
    });
    expectMutationRefused('weightDeclared', 'declared value conversion', (artifact) => {
      firstEntryOf(artifact).transforms.value = conversion;
    });
    expectMutationRefused('weightMember', 'raw uncertainty conversion', (artifact) => {
      firstEntryOf(artifact).transforms.uncertainty = conversion;
    });
    expectMutationRefused('compartmentPlain', 'recorded interval conversion', (artifact) => {
      firstEntryOf(artifact).transforms.recordedInterval = conversion;
    });
  });

  it('enforces view and witness row-budget boundaries', () => {
    for (const field of [
      'inputSourceCount',
      'retainedSourceCount',
      'outputRowCount',
      'missingRetainedSourceCount',
      'duplicateGroupCount',
    ] as const) {
      expectMutationRefused('weightMember', `${field} above 250000`, (artifact) => {
        firstEntryOf(artifact).views[0][field] = 250_001;
      });
    }
    expectMutationRefused('weightWitnesses', 'witness index above 249999', (artifact) => {
      firstEntryOf(artifact).contextWitnesses[0].stateObservationIndex = 250_000;
    });
    expectMutationRefused(
      'weightMember',
      'self-consistently rewrapped count non-conservation',
      (artifact) => {
        const view = firstEntryOf(artifact).views[0];
        view.retainedSourceCount -= 1;
        rewrapBatchOutput(batchOf(artifact));
      },
    );
  });

  it('enforces weight and compartment family maxima in one operation', () => {
    expectMutationRefused('weightMember', '1025 weight entries', (artifact) => {
      const receipt = batchOf(artifact).receipt;
      const seed = structuredClone(receipt.seriesReceipts[0]);
      receipt.seriesReceipts = Array.from(
        { length: 1025 },
        () => structuredClone(seed),
      );
      receipt.seriesCount = 1025;
    });

    expectMutationRefused('compartmentPlain', '8193 compartment entries', (artifact) => {
      const receipt = batchOf(artifact).receipt;
      const seed = structuredClone(receipt.seriesReceipts[0]);
      receipt.seriesReceipts = Array.from(
        { length: 8193 },
        () => structuredClone(seed),
      );
      receipt.seriesCount = 8193;
    });
  });
});
