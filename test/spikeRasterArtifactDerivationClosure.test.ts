import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalDigestExcluding } from '../src/core/canonicalize.js';
import { validateArtifactStructure } from '../src/core/structural-validator.js';
import { buildFigure } from '../src/render/buildFigure.js';

type MutableRecord = Record<string, any>;
type Fixture =
  | 'nestFinite'
  | 'genericTrials'
  | 'genericDefaultMark'
  | 'genericConvertedWindow'
  | 'nestCapture';

const root = path.resolve(import.meta.dirname, '..');
const contract = JSON.parse(readFileSync(
  path.join(root, 'contract/skills/neuro.spike_raster.v1.json'),
  'utf8',
)) as { examples: { valid: MutableRecord[] } };

function uniqueExample(
  label: string,
  predicate: (request: MutableRecord) => boolean,
): MutableRecord {
  const matches = contract.examples.valid.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one ${label} spike-raster example, found ${matches.length}`,
    );
  }
  return matches[0]!;
}

const nestFinite = uniqueExample(
  'finite NEST',
  ({ data }) => data.window.kind === 'nest_recording_device_origin_relative',
);
const nestCapture = uniqueExample(
  'capture-bounded NEST',
  ({ data }) =>
    data.window.kind ===
      'nest_recording_device_positive_infinity_capture_bounded',
);
const genericTrials = uniqueExample(
  'generic trial-indexed',
  ({ data }) => data.window.kind === undefined && Array.isArray(data.eventTrialIds),
);
const genericDefaultMark = uniqueExample(
  'generic default-mark',
  ({ data, parameters }) =>
    data.window.kind === undefined &&
    !Array.isArray(data.eventTrialIds) &&
    parameters.markStyle === undefined,
);
const genericConvertedWindow = structuredClone(genericDefaultMark);
genericConvertedWindow.data.window = {
  start: 0,
  stop: 0.01,
  unit: 's',
  boundary: '[start,stop)',
};

const requests: Readonly<Record<Fixture, MutableRecord>> = {
  nestFinite,
  genericTrials,
  genericDefaultMark,
  genericConvertedWindow,
  nestCapture,
};

const artifactCache = new Map<Fixture, MutableRecord>();

function artifactFor(fixture: Fixture): MutableRecord {
  const cached = artifactCache.get(fixture);
  if (cached) return structuredClone(cached);
  const built = buildFigure(structuredClone(requests[fixture]));
  if (!built.ok) {
    throw new Error(
      `${fixture} did not build:\n${JSON.stringify(built.errors, null, 2)}`,
    );
  }
  const artifact = built.artifact as MutableRecord;
  artifactCache.set(fixture, artifact);
  return structuredClone(artifact);
}

function operationOf(artifact: MutableRecord): MutableRecord {
  return artifact.derivation.operations[0] as MutableRecord;
}

function rebindOuterDigest(artifact: MutableRecord): void {
  artifact.artifactDigest = canonicalDigestExcluding(artifact, 'artifactDigest');
}

function expectRefusedAfterOuterRebind(
  fixture: Fixture,
  label: string,
  mutate: (artifact: MutableRecord, operation: MutableRecord) => void,
  expectedRelationPath?: string,
): void {
  const artifact = artifactFor(fixture);
  mutate(artifact, operationOf(artifact));
  rebindOuterDigest(artifact);
  const result = validateArtifactStructure(artifact);
  expect(result.ok, `${fixture}: ${label}`).toBe(false);
  if (expectedRelationPath) {
    expect(
      result.errors.some(({ instancePath }) => instancePath === expectedRelationPath),
      `${fixture}: ${label}\n${JSON.stringify(result.errors, null, 2)}`,
    ).toBe(true);
  }
}

describe('persisted spike-raster v4 derivation closure', () => {
  it('accepts finite NEST, capture-bounded NEST, and both generic producer branches', () => {
    for (const fixture of Object.keys(requests) as Fixture[]) {
      const artifact = artifactFor(fixture);
      const result = validateArtifactStructure(artifact);
      expect(
        result.ok,
        `${fixture}\n${JSON.stringify(result.errors, null, 2)}`,
      ).toBe(true);
      expect(artifact.derivation.operations).toHaveLength(1);
    }

    const finite = operationOf(artifactFor('nestFinite'));
    expect(finite.parameters.nestEndpointProjection).toBeDefined();
    expect(finite.receipt.sourceClockMode).toBe(
      'nest_3_10_0_memory_native_binary64_ms_finite_stop',
    );

    const capture = operationOf(artifactFor('nestCapture'));
    expect(capture.parameters.nestEndpointProjection).toBeDefined();
    expect(capture.receipt.sourceClockMode).toBe(
      'nest_3_10_0_memory_native_binary64_ms_positive_infinity_capture_bounded',
    );

    for (const fixture of [
      'genericTrials',
      'genericDefaultMark',
      'genericConvertedWindow',
    ] as const) {
      const generic = operationOf(artifactFor(fixture));
      expect(generic.parameters).not.toHaveProperty('nestEndpointProjection');
      expect(generic.receipt.sourceClockMode).toBe('caller_declared_event_window');
    }
    expect(
      operationOf(artifactFor('genericConvertedWindow')).receipt.windowEndpointConversion,
    ).toMatchObject({
      from: 's',
      to: 'ms',
      algorithm: 'exact_rational_round_to_binary64',
    });
  });

  it('closes operation identity, revision, topology, properties, and both inner digests', () => {
    expectRefusedAfterOuterRebind('genericTrials', 'operation removed', (artifact) => {
      artifact.derivation.operations = [];
    });
    expectRefusedAfterOuterRebind('genericTrials', 'side operation appended', (artifact, operation) => {
      artifact.derivation.operations.push(structuredClone(operation));
    });
    expectRefusedAfterOuterRebind('genericTrials', 'id relabelled', (_artifact, operation) => {
      operation.id = 'spike_raster.partition_only';
    });
    expectRefusedAfterOuterRebind('genericTrials', 'algorithm relabelled', (_artifact, operation) => {
      operation.algorithm = 'cortexel.spike_raster.source_bound_window_partition.v5';
    });
    expectRefusedAfterOuterRebind('genericTrials', 'revision advanced', (_artifact, operation) => {
      operation.algorithmRevision = 5;
    });
    expectRefusedAfterOuterRebind('genericTrials', 'unknown parameter admitted', (_artifact, operation) => {
      operation.parameters.unbound = true;
    });
    expectRefusedAfterOuterRebind('genericTrials', 'unknown receipt admitted', (_artifact, operation) => {
      operation.receipt.unbound = true;
    });
    expectRefusedAfterOuterRebind(
      'genericTrials',
      'input digest forged',
      (_artifact, operation) => {
        operation.inputDigest = `sha256:${'1'.repeat(64)}`;
      },
      '/derivation/operations/0/inputDigest',
    );
    expectRefusedAfterOuterRebind(
      'genericTrials',
      'output digest forged',
      (_artifact, operation) => {
        operation.outputDigest = `sha256:${'2'.repeat(64)}`;
      },
      '/derivation/operations/0/outputDigest',
    );
  });

  it('independently rejects every forged NEST projection carrier after outer digest recomputation', () => {
    const projectionMutations: readonly [string, (projection: MutableRecord) => void][] = [
      ['projection algorithm', (projection) => {
        projection.algorithm = 'nest_3_10_time_get_ms_exact_rational.v1';
      }],
      ['tics per millisecond', (projection) => {
        projection.ticsPerMs = '999';
      }],
      ['resolution tics', (projection) => {
        projection.resolutionTics = '126';
      }],
      ['lower endpoint tics', (projection) => {
        projection.lowerEndpointTics = String(BigInt(projection.lowerEndpointTics) + 1n);
      }],
      ['upper endpoint tics', (projection) => {
        projection.upperEndpointTics = String(BigInt(projection.upperEndpointTics) + 1n);
      }],
      ['finite-time limit', (projection) => {
        projection.finiteTimeLimitTics = String(BigInt(projection.finiteTimeLimitTics) - 1n);
      }],
      ['lower projected milliseconds', (projection) => {
        projection.lowerMilliseconds += 0.125;
      }],
      ['upper projected milliseconds', (projection) => {
        projection.upperMilliseconds += 0.125;
      }],
    ];

    for (const fixture of ['nestFinite', 'nestCapture'] as const) {
      for (const [label, mutateProjection] of projectionMutations) {
        expectRefusedAfterOuterRebind(
          fixture,
          label,
          (_artifact, operation) => {
            mutateProjection(operation.parameters.nestEndpointProjection);
          },
          label === 'projection algorithm'
            ? undefined
            : '/derivation/operations/0/parameters',
        );
      }
    }
  });

  it('derives sourceClockMode from the request branch instead of trusting the receipt', () => {
    expectRefusedAfterOuterRebind(
      'nestFinite',
      'finite stop relabelled as capture bounded',
      (_artifact, operation) => {
        operation.receipt.sourceClockMode =
          'nest_3_10_0_memory_native_binary64_ms_positive_infinity_capture_bounded';
      },
      '/derivation/operations/0/receipt',
    );
    expectRefusedAfterOuterRebind(
      'nestCapture',
      'capture bounded relabelled as finite stop',
      (_artifact, operation) => {
        operation.receipt.sourceClockMode =
          'nest_3_10_0_memory_native_binary64_ms_finite_stop';
      },
      '/derivation/operations/0/receipt',
    );
    expectRefusedAfterOuterRebind(
      'genericTrials',
      'generic clock relabelled as NEST',
      (_artifact, operation) => {
        operation.receipt.sourceClockMode =
          'nest_3_10_0_memory_native_binary64_ms_finite_stop';
      },
      '/derivation/operations/0/receipt',
    );
  });

  it('forbids NEST-only projection fields on generic windows and requires them on NEST windows', () => {
    const finiteProjection = structuredClone(
      operationOf(artifactFor('nestFinite')).parameters.nestEndpointProjection,
    );
    expectRefusedAfterOuterRebind(
      'genericTrials',
      'NEST projection grafted onto generic window',
      (_artifact, operation) => {
        operation.parameters.nestEndpointProjection = finiteProjection;
      },
    );
    expectRefusedAfterOuterRebind(
      'nestFinite',
      'finite NEST projection removed',
      (_artifact, operation) => {
        delete operation.parameters.nestEndpointProjection;
      },
    );
    expectRefusedAfterOuterRebind(
      'nestCapture',
      'capture-bounded NEST projection removed',
      (_artifact, operation) => {
        delete operation.parameters.nestEndpointProjection;
      },
    );
  });

  it('replays policy, counts, and row/event output rather than accepting a plausible receipt', () => {
    expectRefusedAfterOuterRebind(
      'genericTrials',
      'row policy changed only in persisted parameters',
      (_artifact, operation) => {
        operation.parameters.rowOrder = 'canonical_sender_id';
      },
      '/derivation/operations/0/parameters',
    );
    expectRefusedAfterOuterRebind(
      'genericTrials',
      'accepted count changed only in persisted receipt',
      (_artifact, operation) => {
        operation.receipt.acceptedEventCount -= 1;
        operation.receipt.excludedOutOfWindow += 1;
        operation.receipt.excludedAboveOrAtOpenStop += 1;
        operation.receipt.drawnMarkCount -= 1;
      },
      '/derivation/operations/0/receipt',
    );
    expectRefusedAfterOuterRebind(
      'genericDefaultMark',
      'materialized mark-style default changed',
      (_artifact, operation) => {
        operation.parameters.markStyle = 'point';
      },
      '/derivation/operations/0/parameters',
    );
    expectRefusedAfterOuterRebind(
      'genericConvertedWindow',
      'endpoint conversion changed while remaining schema-valid',
      (_artifact, operation) => {
        operation.receipt.windowEndpointConversion.factor = 1;
      },
      '/derivation/operations/0/receipt',
    );
  });
});
