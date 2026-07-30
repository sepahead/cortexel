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
type FixtureName = 'combined' | 'physicalMixedUnits' | 'trajectory' | 'converted';

const root = path.resolve(import.meta.dirname, '..');
const phaseContract = JSON.parse(readFileSync(
  path.join(root, 'contract/skills/neuro.phase_plane.v1.json'),
  'utf8',
)) as { examples: { valid: MutableRecord[] } };
const responseCurveContract = JSON.parse(readFileSync(
  path.join(root, 'contract/skills/neuro.response_curve.v1.json'),
  'utf8',
)) as { examples: { valid: MutableRecord[] } };

function requestFor(name: FixtureName): MutableRecord {
  if (name === 'trajectory') {
    return structuredClone(phaseContract.examples.valid[2]);
  }
  if (name === 'physicalMixedUnits') {
    const request = structuredClone(phaseContract.examples.valid[1]);
    request.data.vectorField.dy.unit = '/s';
    return request;
  }
  const request = structuredClone(phaseContract.examples.valid[0]);
  if (name === 'converted') {
    request.data.trajectories.x.unit = 'V';
    request.data.trajectories.x.values =
      request.data.trajectories.x.values.map((value: number | null) =>
        value === null ? null : value / 1000);
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
        `${name} phase fixture did not build:\n${JSON.stringify(result.errors, null, 2)}`,
      );
    }
    artifact = result.artifact as MutableRecord;
    artifactCache.set(name, artifact);
  }
  return structuredClone(artifact);
}

function phaseOperation(artifact: MutableRecord): MutableRecord {
  return artifact.derivation.operations[0];
}

function rewrapArtifact(artifact: MutableRecord): void {
  artifact.artifactDigest =
    canonicalDigestExcluding(artifact, 'artifactDigest');
}

function expectAccepted(artifact: MutableRecord, label: string): void {
  const result = validateArtifactStructure(artifact);
  expect(result.ok, `${label}\n${JSON.stringify(result.errors, null, 2)}`).toBe(true);
}

function expectRefused(artifact: MutableRecord, label: string): void {
  const result = validateArtifactStructure(artifact);
  expect(result.ok, `${label}\n${JSON.stringify(result.errors, null, 2)}`).toBe(false);
}

function expectMutationRefused(
  fixture: FixtureName,
  label: string,
  mutate: (artifact: MutableRecord, operation: MutableRecord) => void,
): void {
  const artifact = artifactFor(fixture);
  mutate(artifact, phaseOperation(artifact));
  rewrapArtifact(artifact);
  expectRefused(artifact, `${fixture}: ${label}`);
}

const forgedDigest = `sha256:${'0'.repeat(64)}`;

describe('FigureArtifactV1 closed phase-plane carrier operation', () => {
  it('accepts genuine producer artifacts across every phase carrier family', () => {
    for (const fixture of [
      'combined',
      'physicalMixedUnits',
      'trajectory',
      'converted',
    ] as const) {
      const artifact = artifactFor(fixture);
      expectAccepted(artifact, fixture);
      expect(phaseOperation(artifact)).toMatchObject({
        id: 'phase_plane.carriers.canonicalize_and_verify',
        algorithm: 'cortexel.phase_plane.canonicalize_carriers',
        algorithmRevision: 3,
      });
    }
  });

  it('binds the phase skill to exactly one correctly labelled closed operation', () => {
    expectMutationRefused('combined', 'operation removed', (artifact) => {
      artifact.derivation.operations = [];
    });
    expectMutationRefused('combined', 'algorithm relabelled as generic', (_artifact, operation) => {
      operation.algorithm = 'cortexel.legacy.open_operation';
    });
    expectMutationRefused('combined', 'phase operation duplicated', (artifact, operation) => {
      const duplicate = structuredClone(operation);
      duplicate.id = 'phase_plane.carriers.duplicate';
      artifact.derivation.operations.push(duplicate);
    });
    expectMutationRefused('combined', 'unrelated side operation appended', (artifact) => {
      artifact.derivation.operations.push({
        id: 'legacy.side.operation',
        algorithm: 'cortexel.legacy.open_operation',
        algorithmRevision: 1,
        parameters: { historical: true },
        receipt: { historical: true },
      });
    });
  });

  it('preserves generic historical operation contracts on unrelated skills', () => {
    const result = buildFigure(structuredClone(responseCurveContract.examples.valid[0]));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    const artifact = structuredClone(result.artifact) as MutableRecord;
    artifact.derivation.operations.push({
      id: 'legacy.side.operation',
      algorithm: 'cortexel.legacy.open_operation',
      algorithmRevision: 1,
      parameters: {
        historical: true,
        openNestedPayload: { remains: ['accepted'] },
      },
      receipt: {
        historical: true,
        openNestedPayload: { remains: ['accepted'] },
      },
    });
    rewrapArtifact(artifact);
    expectAccepted(
      artifact,
      'unrelated response-curve artifact with an open historical operation',
    );
  });

  it('closes operation identity, parameters, receipt presence, and receipt properties', () => {
    const mutations: readonly [
      string,
      (artifact: MutableRecord, operation: MutableRecord) => void,
    ][] = [
      ['wrong operation id', (_artifact, operation) => {
        operation.id = 'phase_plane.carriers.canonicalize';
      }],
      ['wrong algorithm revision', (_artifact, operation) => {
        operation.algorithmRevision = 2;
      }],
      ['valid-but-wrong magnitude parameter', (_artifact, operation) => {
        operation.parameters.magnitudeBasis =
          operation.parameters.magnitudeBasis === 'physical'
            ? 'axis_normalized'
            : 'physical';
      }],
      ['missing trajectory-time semantics', (_artifact, operation) => {
        delete operation.parameters.trajectoryTimeSemantics;
      }],
      ['empty receipt', (_artifact, operation) => {
        operation.receipt = {};
      }],
      ['missing required receipt field', (_artifact, operation) => {
        delete operation.receipt.coordinateTransforms;
      }],
      ['extra receipt field', (_artifact, operation) => {
        operation.receipt.unboundClaim = true;
      }],
    ];
    for (const [label, mutate] of mutations) {
      expectMutationRefused('combined', label, mutate);
    }
  });

  it('replays coordinate conversions and refuses relabelled or forged receipts', () => {
    const mutations: readonly [
      string,
      (artifact: MutableRecord, operation: MutableRecord) => void,
    ][] = [
      ['coordinate carrier relabelled', (_artifact, operation) => {
        operation.receipt.coordinateTransforms[0].carrier = 'trajectory y';
      }],
      ['coordinate count changed', (_artifact, operation) => {
        operation.receipt.conversionCounts.coordinate += 1;
      }],
      ['rounded coordinate factor changed', (_artifact, operation) => {
        operation.receipt.coordinateTransforms[0].conversion.factor = 999;
      }],
      ['exact coordinate factor changed', (_artifact, operation) => {
        operation.receipt.coordinateTransforms[0]
          .conversion.exactFactor.numerator = '2';
      }],
      ['conversion disclosure relabelled', (_artifact, operation) => {
        operation.receipt.conversionDisclosureInventory[0] =
          'phase-plane exact unit transforms: forged';
      }],
    ];
    for (const [label, mutate] of mutations) {
      expectMutationRefused('converted', label, mutate);
    }
  });

  it('replays derivative conversion identity, use, count, and exact factors', () => {
    const mutations: readonly [
      string,
      (artifact: MutableRecord, operation: MutableRecord) => void,
    ][] = [
      ['derivative carrier relabelled', (_artifact, operation) => {
        operation.receipt.derivativeTransforms[0].carrier = 'trajectory';
      }],
      ['derivative component relabelled', (_artifact, operation) => {
        operation.receipt.derivativeTransforms[0].component =
          operation.receipt.derivativeTransforms[0].component === 'x' ? 'y' : 'x';
      }],
      ['derivative use relabelled', (_artifact, operation) => {
        operation.receipt.derivativeTransforms[0].uses = ['table_speed'];
      }],
      ['derivative count changed', (_artifact, operation) => {
        operation.receipt.conversionCounts.axisNormalizedDerivative += 1;
      }],
      ['physical conversion exact factor changed', (_artifact, operation) => {
        const transform = operation.receipt.derivativeTransforms.find(
          (candidate: MutableRecord) => candidate.basis === 'physical',
        );
        transform.conversion.exactFactor.numerator = '2';
      }],
      ['field magnitude unit changed', (_artifact, operation) => {
        operation.receipt.fieldMagnitudeUnit = 'mV /ms';
      }],
    ];
    for (const [label, mutate] of mutations) {
      expectMutationRefused('physicalMixedUnits', label, mutate);
    }
  });

  it('replays trajectory time, table-speed, and convergence authority exactly', () => {
    const mutations: readonly [
      string,
      (artifact: MutableRecord, operation: MutableRecord) => void,
    ][] = [
      ['global time minimum changed', (_artifact, operation) => {
        operation.receipt.trajectoryTimeAuthority.globalMinimumTime += 1;
      }],
      ['per-identity point count changed', (_artifact, operation) => {
        operation.receipt.trajectoryTimeAuthority.trajectories[0].pointCount += 1;
      }],
      ['global direction application relabelled', (_artifact, operation) => {
        const entry =
          operation.receipt.trajectoryTimeAuthority.trajectories[0];
        entry.appliedGlobalTimeDirection =
          entry.appliedGlobalTimeDirection === 'forward' ? 'backward' : 'forward';
      }],
      ['equal-time break count changed', (_artifact, operation) => {
        operation.receipt.trajectoryTimeAuthority.equalTimeBreakCount += 1;
      }],
      ['trajectory table-speed count changed', (_artifact, operation) => {
        operation.receipt.trajectoryTableSpeedCount += 1;
      }],
      ['trajectory table-speed digest changed', (_artifact, operation) => {
        operation.receipt.trajectoryTableSpeedDigest = forgedDigest;
      }],
      ['fixed-point count changed', (_artifact, operation) => {
        operation.receipt.fixedPointCount += 1;
      }],
      ['convergence flag changed', (_artifact, operation) => {
        operation.receipt.convergenceFlags[0] =
          !operation.receipt.convergenceFlags[0];
      }],
    ];
    for (const [label, mutate] of mutations) {
      expectMutationRefused('combined', label, mutate);
    }
  });

  it('recomputes both operation digests instead of trusting a rewrapped artifact', () => {
    expectMutationRefused('combined', 'input digest changed', (_artifact, operation) => {
      operation.inputDigest = forgedDigest;
    });
    expectMutationRefused('combined', 'output digest changed', (_artifact, operation) => {
      operation.outputDigest = forgedDigest;
    });
    expectMutationRefused(
      'combined',
      'forged receipt and attacker-selected operation output digest',
      (_artifact, operation) => {
        operation.receipt.trajectoryTableSpeedCount += 1;
        operation.outputDigest = canonicalDigest({
          attackerSelectedReceipt: operation.receipt,
        });
      },
    );
  });

  it('refuses a self-consistently rewrapped contradictory convergence claim', () => {
    const artifact = artifactFor('combined');
    const operation = phaseOperation(artifact);
    artifact.canonicalRequest.data.fixedPoints.converged[0] =
      !artifact.canonicalRequest.data.fixedPoints.converged[0];
    artifact.provenance.requestDigest =
      canonicalDigest(artifact.canonicalRequest);
    operation.inputDigest = canonicalDigest({
      data: artifact.canonicalRequest.data,
      parameters: artifact.canonicalRequest.parameters,
    });
    rewrapArtifact(artifact);
    expectRefused(
      artifact,
      'contradictory canonical convergence with every public digest rewrapped',
    );
  });
});
