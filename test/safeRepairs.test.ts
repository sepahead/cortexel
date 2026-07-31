import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { getBudgetLimits } from '../src/core/limits.js';
import {
  finalizeErrors,
  finalizeErrorsWithPriority,
  makeError,
} from '../src/core/errors.js';
import { validateRequestValue } from '../src/core/request.js';
import { applySafeRepairs } from '../src/core/repairs.js';

const UNIT_ALIAS_SKILLS = [
  'network.adjacency_matrix',
  'network.connection_graph',
  'network.degree_distribution',
  'network.delay_distribution',
  'network.delay_matrix',
  'network.spatial_map_2d',
  'network.synaptic_weight_trace',
  'network.weight_distribution',
  'network.weight_matrix',
  'neuro.analog_trace',
  'neuro.compartment_trace',
  'neuro.isi_distribution',
  'neuro.multisignal_trace',
  'neuro.phase_plane',
  'neuro.population_rate',
  'neuro.psth',
  'neuro.response_curve',
  'neuro.spike_raster',
] as const;

function livingExample(skill: string, index = 0): Record<string, any> {
  const file = path.resolve(
    import.meta.dirname,
    `../contract/skills/${skill}.v1.json`,
  );
  return structuredClone(JSON.parse(readFileSync(file, 'utf8')).examples.valid[index]);
}

function invalidExample(skill: string, expectedCode: string): Record<string, any> {
  const file = path.resolve(
    import.meta.dirname,
    `../contract/skills/${skill}.v1.json`,
  );
  const contract = JSON.parse(readFileSync(file, 'utf8'));
  const example = contract.examples.invalid.find(
    (entry: { expectedCode: string }) => entry.expectedCode === expectedCode,
  );
  if (example === undefined) throw new Error(`missing ${skill} ${expectedCode} negative`);
  return structuredClone(example.request);
}

function invalidExamples(
  skill: string,
  expectedCode: string,
): readonly Record<string, any>[] {
  const file = path.resolve(
    import.meta.dirname,
    `../contract/skills/${skill}.v1.json`,
  );
  const contract = JSON.parse(readFileSync(file, 'utf8'));
  return contract.examples.invalid
    .filter((entry: { expectedCode: string }) => entry.expectedCode === expectedCode)
    .map((entry: { request: Record<string, any> }) => structuredClone(entry.request));
}

const UNIT_ALIAS_CASES = UNIT_ALIAS_SKILLS.flatMap((skill) => {
  const examples = invalidExamples(skill, 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL');
  if (examples.length === 0) {
    throw new Error(`missing ${skill} SCIENCE_UNIT_ALIAS_NOT_CANONICAL negative`);
  }
  return examples.map((request, index) => ({
    label: `${skill}#${index + 1}`,
    request,
  }));
});

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child, seen);
}

describe('applySafeRepairs — closed self-validating correction boundary', () => {
  it('repairs only exact contract, assurance, and unit defects across gated stages', () => {
    const request = livingExample('neuro.spike_raster');
    delete request.contract;
    request.verified = true;
    request.data.eventTimes.unit = 'milliseconds';
    const before = structuredClone(request);

    const repaired = applySafeRepairs(request);
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) return;
    expect(repaired.request.skillId).toBe('neuro.spike_raster');
    expect(repaired.request.inputAssurance).toMatchObject({
      boundary: 'materialized_value',
      duplicateKeys: 'not_observable_after_materialization',
    });
    expect(repaired.appliedRepairs).toEqual([
      {
        operation: 'remove',
        path: '/verified',
        reasonCode: 'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN',
      },
      {
        operation: 'add',
        path: '/contract',
        value: { name: 'cortexel-figure-request', version: '1.0' },
        reasonCode: 'CONTRACT_MISSING',
      },
      {
        operation: 'replace',
        path: '/data/eventTimes/unit',
        value: 'ms',
        reasonCode: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
      },
    ]);
    expectDeepFrozen(repaired.appliedRepairs);
    expect(request).toEqual(before);
    expect(Object.hasOwn(request, 'contract')).toBe(false);
    expect(request.verified).toBe(true);
  });

  it('preserves duplicate-key-aware assurance for repaired raw JSON text', () => {
    const request = livingExample('neuro.spike_raster');
    delete request.contract;
    request.data.eventTimes.unit = 'milliseconds';
    const repaired = applySafeRepairs(JSON.stringify(request));
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) return;
    expect(repaired.request.inputAssurance).toMatchObject({
      boundary: 'raw_json_text',
      duplicateKeys: 'rejected_before_materialization',
    });
    expect(repaired.appliedRepairs.map(({ reasonCode }) => reasonCode)).toEqual([
      'CONTRACT_MISSING',
      'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
    ]);
  });

  it('captures mutable request and option Proxies exactly once before every repair round', () => {
    const target = livingExample('neuro.spike_raster');
    delete target.contract;
    target.data.eventTimes.unit = 'milliseconds';
    target.presentation = { budgetProfile: 'standard' };
    let presentationReads = 0;
    const request = new Proxy(target, {
      getOwnPropertyDescriptor(object, key) {
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        if (key !== 'presentation' || descriptor === undefined || !('value' in descriptor)) {
          return descriptor;
        }
        presentationReads++;
        return {
          ...descriptor,
          value: presentationReads === 1
            ? { budgetProfile: 'agent' }
            : { budgetProfile: 'standard', unexpectedSecondRead: true },
        };
      },
    });

    const optionTarget = { budgetProfile: 'standard' as const };
    let optionReads = 0;
    const options = new Proxy(optionTarget, {
      getOwnPropertyDescriptor(object, key) {
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        if (key !== 'budgetProfile' || descriptor === undefined || !('value' in descriptor)) {
          return descriptor;
        }
        optionReads++;
        return {
          ...descriptor,
          value: optionReads === 1 ? 'standard' : 'not-a-profile',
        };
      },
    });

    const repaired = applySafeRepairs(request, options);
    expect(repaired.ok).toBe(true);
    if (repaired.ok) {
      expect(repaired.request.inputAssurance.budgetProfile).toBe('agent');
      expect(repaired.appliedRepairs).toHaveLength(2);
    }
    expect(presentationReads).toBe(1);
    expect(optionReads).toBe(1);
  });

  it.each([
    { label: 'null', malformed: null },
    { label: 'string', malformed: 'cortexel-figure-request/1.0' },
    { label: 'array', malformed: [] },
  ])(
    'does not overwrite a present malformed contract member: $label',
    ({ malformed }) => {
      const request = livingExample('neuro.spike_raster');
      request.contract = malformed;
      const repaired = applySafeRepairs(request);
      expect(repaired.ok).toBe(false);
      if (repaired.ok) return;
      expect(repaired.appliedRepairs).toEqual([]);
      expect(repaired.errors).toEqual([
        expect.objectContaining({ code: 'CONTRACT_SHAPE_INVALID' }),
      ]);
      expect(repaired.errors[0]).not.toHaveProperty('repair');
      expect(request.contract).toEqual(malformed);
    },
  );

  it.each([
    {
      label: 'unsupported name',
      mutate: (request: Record<string, any>) => {
        request.contract.name = 'some-other-contract';
      },
      expectedCode: 'CONTRACT_UNSUPPORTED_VERSION',
    },
    {
      label: 'unsupported version',
      mutate: (request: Record<string, any>) => {
        request.contract.version = '2.0';
      },
      expectedCode: 'CONTRACT_UNSUPPORTED_VERSION',
    },
    {
      label: 'wrong digest',
      mutate: (request: Record<string, any>) => {
        request.contractDigest = `sha256:${'0'.repeat(64)}`;
      },
      expectedCode: 'CONTRACT_DIGEST_MISMATCH',
    },
    {
      label: 'unsupported skill revision',
      mutate: (request: Record<string, any>) => {
        request.skill.revision = 999_999;
      },
      expectedCode: 'CONTRACT_SKILL_REVISION_UNSUPPORTED',
    },
  ])(
    'does not overwrite present but wrong contract authority: $label',
    ({ mutate, expectedCode }) => {
      const request = livingExample('neuro.spike_raster');
      mutate(request);
      const before = structuredClone(request);
      const repaired = applySafeRepairs(request);
      expect(repaired.ok).toBe(false);
      if (repaired.ok) return;
      expect(repaired.appliedRepairs).toEqual([]);
      expect(repaired.errors).toContainEqual(expect.objectContaining({
        code: expectedCode,
      }));
      expect(request).toEqual(before);
    },
  );

  it('withholds branded output when a safe repair exposes a remaining unsafe defect', () => {
    const request = livingExample('neuro.spike_raster');
    delete request.contract;
    request.eventTiems = [1];
    const before = structuredClone(request);

    const repaired = applySafeRepairs(request);
    expect(repaired.ok).toBe(false);
    if (repaired.ok) return;
    expect('request' in repaired).toBe(false);
    expect(repaired.appliedRepairs).toEqual([{
      operation: 'add',
      path: '/contract',
      value: { name: 'cortexel-figure-request', version: '1.0' },
      reasonCode: 'CONTRACT_MISSING',
    }]);
    expect(repaired.errors).toContainEqual(expect.objectContaining({
      code: 'SCHEMA_UNKNOWN_PROPERTY',
      instancePath: '/eventTiems',
    }));
    expect(request).toEqual(before);
    expectDeepFrozen(repaired.appliedRepairs);
  });

  it.each(['agent', 'standard'] as const)(
    'fails closed at the published %s safe-repair operation cap',
    (budgetProfile) => {
      const repairLimit = getBudgetLimits(budgetProfile).safeRepairOperations;
      const request = livingExample('neuro.spike_raster');
      delete request.contract;
      request.presentation = { budgetProfile };
      for (let index = 0; index < repairLimit; index++) {
        request[`wrapper${String(index).padStart(3, '0')}`] = { verified: true };
      }
      const before = structuredClone(request);

      const repaired = applySafeRepairs(request, { budgetProfile });
      expect(repaired.ok).toBe(false);
      if (repaired.ok) return;
      expect('request' in repaired).toBe(false);
      expect(repaired.appliedRepairs).toHaveLength(repairLimit);
      expect(repaired.appliedRepairs.every((repair) =>
        repair.reasonCode === 'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN')).toBe(true);
      expect(repaired.errors).toContainEqual(expect.objectContaining({
        code: 'RESOURCE_BUDGET_EXCEEDED',
        limit: {
          name: 'safeRepairOperations',
          limit: repairLimit,
          observed: repairLimit + 1,
        },
      }));
      expect(repaired.appliedRepairs).not.toContainEqual(expect.objectContaining({
        path: '/contract',
      }));
      expect(request).toEqual(before);
      expectDeepFrozen(repaired.appliedRepairs);
    },
  );

  it('retains the governing budget stop after nested diagnostics already hit their cap', () => {
    const request = livingExample('neuro.spike_raster');
    request.presentation = { budgetProfile: 'agent' };
    for (let index = 0; index < 200; index++) {
      request[`wrapper${String(index).padStart(3, '0')}`] = { verified: true };
    }

    const repaired = applySafeRepairs(request, { budgetProfile: 'agent' });
    expect(repaired.ok).toBe(false);
    if (repaired.ok) return;
    expect(repaired.errors).toHaveLength(32);
    expect(repaired.errors).toContainEqual(expect.objectContaining({
      code: 'RESOURCE_BUDGET_EXCEEDED',
      limit: expect.objectContaining({
        name: 'safeRepairOperations',
        limit: getBudgetLimits('agent').safeRepairOperations,
      }),
    }));
    expect(repaired.errors).toContainEqual(expect.objectContaining({
      code: 'ERROR_LIMIT_REACHED',
      omittedCount: expect.any(Number),
    }));
    expect('request' in repaired).toBe(false);
  });

  it('retains an internal stop sentinel when an inherited diagnostic batch is full', () => {
    const nested = finalizeErrors(Array.from({ length: 100 }, (_, index) => makeError({
      code: 'SCHEMA_UNKNOWN_PROPERTY',
      stage: 'structural',
      instancePath: `/field${String(index).padStart(3, '0')}`,
      message: 'closed-schema negative control',
    })));
    const sentinel = makeError({
      code: 'INTERNAL_INVARIANT_VIOLATED',
      stage: 'internal',
      message: 'priority negative control',
    });

    const finalized = finalizeErrorsWithPriority(nested, [sentinel]);
    expect(finalized).toHaveLength(32);
    expect(finalized).toContainEqual(sentinel);
    expect(finalized).toContainEqual(expect.objectContaining({
      code: 'ERROR_LIMIT_REACHED',
      omittedCount: 70,
    }));
    expect(finalized.at(-1)?.code).toBe('ERROR_LIMIT_REACHED');
  });

  it.each(UNIT_ALIAS_CASES)(
    'repairs the complete published canonical-unit alias family: $label',
    ({ request }) => {
      const before = structuredClone(request);
      const repaired = applySafeRepairs(request);
      expect(repaired.ok).toBe(true);
      if (!repaired.ok) return;
      expect(repaired.appliedRepairs.length).toBeGreaterThan(0);
      expect(repaired.appliedRepairs.every((repair) =>
        repair.reasonCode === 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL')).toBe(true);
      expect(validateRequestValue(repaired.request.canonicalRequest).ok).toBe(true);
      expect(request).toEqual(before);
      expectDeepFrozen(repaired.appliedRepairs);
    },
  );

  it('never applies schema-property deletion or legacy migration', () => {
    const unknownProperty = livingExample('neuro.spike_raster');
    unknownProperty.eventTiems = [1];
    const unknown = applySafeRepairs(unknownProperty);
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.errors).toEqual([
        expect.objectContaining({
          code: 'SCHEMA_UNKNOWN_PROPERTY',
          repair: expect.objectContaining({ operation: 'remove' }),
        }),
      ]);
      expect(unknown.appliedRepairs).toEqual([]);
    }
    expect(unknownProperty.eventTiems).toEqual([1]);

    const legacy = livingExample('neuro.spike_raster');
    legacy.skill.id = 'nest.spike_raster';
    const migrated = applySafeRepairs(legacy);
    expect(migrated.ok).toBe(false);
    if (!migrated.ok) {
      expect(migrated.errors).toEqual([
        expect.objectContaining({
          code: 'MIGRATION_LEGACY_ID_NOT_ACCEPTED',
          repair: expect.objectContaining({ operation: 'migrate' }),
        }),
      ]);
      expect(migrated.appliedRepairs).toEqual([]);
    }
    expect(legacy.skill.id).toBe('nest.spike_raster');
  });

  it.each([
    ['bad/key', '/bad~1key'],
    ['bad~key', '/bad~0key'],
  ])('keeps explicit unknown-field repair paths valid RFC 6901 for %s', (key, pointer) => {
    const request = livingExample('neuro.spike_raster');
    request[key] = true;
    const checked = validateRequestValue(request);
    expect(checked.ok).toBe(false);
    if (!checked.ok) {
      const error = checked.errors.find(({ code }) => code === 'SCHEMA_UNKNOWN_PROPERTY');
      expect(error).toMatchObject({
        instancePath: pointer,
        repair: {
          operation: 'remove',
          path: pointer,
          reasonCode: 'SCHEMA_UNKNOWN_PROPERTY',
        },
      });
    }
    const automatic = applySafeRepairs(request);
    expect(automatic.ok).toBe(false);
    if (!automatic.ok) expect(automatic.appliedRepairs).toEqual([]);
    expect(request[key]).toBe(true);
  });

  it('never changes topology scope semantics or figure layout', () => {
    const rankLocal = livingExample('network.degree_distribution', 3);
    rankLocal.parameters.direction = 'out';
    const scope = applySafeRepairs(rankLocal);
    expect(scope.ok).toBe(false);
    if (!scope.ok) {
      expect(scope.errors).toContainEqual(expect.objectContaining({
        code: 'SCOPE_OUT_DEGREE_FROM_RANK_LOCAL',
        repair: expect.objectContaining({ operation: 'replace', value: 'in' }),
      }));
      expect(scope.appliedRepairs).toEqual([]);
    }
    expect(rankLocal.parameters.direction).toBe('out');

    const multisignal = invalidExample(
      'neuro.multisignal_trace',
      'SCIENCE_UNIT_DIMENSION_MISMATCH',
    );
    const layout = applySafeRepairs(multisignal);
    expect(layout.ok).toBe(false);
    if (!layout.ok) {
      expect(layout.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        repair: expect.objectContaining({
          operation: 'replace',
          path: '/parameters/layout',
          value: 'small_multiples',
        }),
      }));
      expect(layout.appliedRepairs).toEqual([]);
    }
    expect(multisignal.parameters.layout).not.toBe('small_multiples');
  });

  it('rejects duplicate members before considering any repair', () => {
    const request = livingExample('neuro.spike_raster');
    const text = JSON.stringify(request).replace(
      '"contract":',
      '"verified":true,"verified":false,"contract":',
    );
    const result = applySafeRepairs(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'JSON_DUPLICATE_KEY',
      }));
      expect(result.appliedRepairs).toEqual([]);
    }
  });

  it('returns a branded ordinary validation result when no repair is needed', () => {
    const request = livingExample('neuro.spike_raster');
    const expected = validateRequestValue(request);
    const result = applySafeRepairs(request);
    expect(expected.ok).toBe(true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appliedRepairs).toEqual([]);
      expect(result.request.requestDigest)
        .toBe(expected.ok ? expected.request.requestDigest : 'unreachable');
    }
  });

  it('is idempotent on its own canonical validated output', () => {
    const request = livingExample('neuro.spike_raster');
    delete request.contract;
    request.verified = true;
    request.data.eventTimes.unit = 'milliseconds';

    const first = applySafeRepairs(request);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.appliedRepairs.length).toBeGreaterThan(0);

    const second = applySafeRepairs(first.request.canonicalRequest);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.appliedRepairs).toEqual([]);
    expect(second.request.requestDigest).toBe(first.request.requestDigest);
    expect(second.request.canonicalRequest).toEqual(first.request.canonicalRequest);
  });
});
