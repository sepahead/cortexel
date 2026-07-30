import { readFileSync } from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { canonicalDigest } from '../src/core/canonicalize.js';
import { validateRequestValue } from '../src/core/request.js';
import {
  AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
  SKILL_AUTHORING,
  STABLE_CATALOG_SCHEMA_RESOURCES,
} from '../src/generated/authoring.js';
import {
  isStableSkillId,
  lookupSkillCatalogEntry,
  SKILL_CATALOG,
  STABLE_SKILL_IDS,
} from '../src/generated/catalog.js';
import {
  CATALOG_DIGEST,
  CATALOG_DIGEST_DOMAIN,
} from '../src/generated/identity.js';
import { publicCatalogStringProblems } from '../scripts/lib/stable-catalog.js';

const ROOT = path.resolve(import.meta.dirname, '..');

function readJson(relative: string): any {
  return JSON.parse(readFileSync(path.join(ROOT, relative), 'utf8'));
}

function catalogIdentity(): Record<string, unknown> {
  return {
    domain: CATALOG_DIGEST_DOMAIN,
    schemaCompilationProfile: AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
    schemaResources: STABLE_CATALOG_SCHEMA_RESOURCES,
    skills: [...STABLE_SKILL_IDS].sort().map((id) => ({
      ...SKILL_CATALOG[id],
      ...SKILL_AUTHORING[id],
    })),
  };
}

function compileAuthoringSchemas(): Map<string, ReturnType<Ajv2020['compile']>> {
  const ajv = new Ajv2020({
    ...AUTHORING_SCHEMA_COMPILATION_PROFILE_V1.options,
  });
  for (const resource of STABLE_CATALOG_SCHEMA_RESOURCES) {
    ajv.addSchema(structuredClone(resource));
  }
  return new Map(STABLE_SKILL_IDS.map((id) => [
    id,
    ajv.compile(structuredClone(SKILL_AUTHORING[id].requestSchema)),
  ]));
}

function mutateFirstPrimitive(value: unknown): boolean {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      value.push('__catalog_digest_mutation__');
      return true;
    }
    for (const item of value) {
      if (mutateFirstPrimitive(item)) return true;
    }
    value.push('__catalog_digest_mutation__');
    return true;
  }
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const record = value as Record<string, unknown>;
      const item = record[key];
      if (typeof item === 'string') {
        record[key] = `${item}__catalog_digest_mutation__`;
        return true;
      }
      if (typeof item === 'number') {
        record[key] = item + 1;
        return true;
      }
      if (typeof item === 'boolean') {
        record[key] = !item;
        return true;
      }
      if (item === null) {
        record[key] = '__catalog_digest_mutation__';
        return true;
      }
      if (mutateFirstPrimitive(item)) return true;
    }
  }
  return false;
}

function mutateField(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value === 'string') {
    record[key] = `${value}__catalog_digest_mutation__`;
    return true;
  }
  if (typeof value === 'number') {
    record[key] = value + 1;
    return true;
  }
  if (typeof value === 'boolean') {
    record[key] = !value;
    return true;
  }
  if (value === null) {
    record[key] = '__catalog_digest_mutation__';
    return true;
  }
  return mutateFirstPrimitive(value);
}

describe('stable agent discovery and authoring projection', () => {
  it('keeps the finite catalog total for stable ids and optional for raw strings', () => {
    for (const id of STABLE_SKILL_IDS) {
      expect(isStableSkillId(id), id).toBe(true);
      expect(lookupSkillCatalogEntry(id), id).toBe(SKILL_CATALOG[id]);
    }
    for (const id of ['', 'not.a.skill', '__proto__', 'constructor']) {
      expect(isStableSkillId(id), id).toBe(false);
      expect(lookupSkillCatalogEntry(id), id).toBeUndefined();
    }
  });

  it('pins the exact closed Ajv 8 compilation profile included in catalog identity', () => {
    expect(AUTHORING_SCHEMA_COMPILATION_PROFILE_V1).toEqual({
      id: 'cortexel-authoring-schema-compilation-profile.v1',
      dialect: 'https://json-schema.org/draft/2020-12/schema',
      engine: 'ajv-8',
      options: {
        strict: true,
        allErrors: true,
        coerceTypes: false,
        useDefaults: false,
        removeAdditional: false,
        allowUnionTypes: true,
        validateFormats: false,
        strictRequired: false,
        strictTypes: false,
      },
    });
    expect(Object.keys(AUTHORING_SCHEMA_COMPILATION_PROFILE_V1).sort()).toEqual([
      'dialect',
      'engine',
      'id',
      'options',
    ]);
    expect(Object.keys(AUTHORING_SCHEMA_COMPILATION_PROFILE_V1.options).sort()).toEqual([
      'allErrors',
      'allowUnionTypes',
      'coerceTypes',
      'removeAdditional',
      'strict',
      'strictRequired',
      'strictTypes',
      'useDefaults',
      'validateFormats',
    ]);
  });

  it('structurally and semantically validates the selected synthetic fixture for all 19 skills', () => {
    const validators = compileAuthoringSchemas();
    expect(STABLE_SKILL_IDS).toHaveLength(19);
    expect(Object.keys(SKILL_AUTHORING).sort()).toEqual([...STABLE_SKILL_IDS].sort());

    for (const id of STABLE_SKILL_IDS) {
      const authoring = SKILL_AUTHORING[id];
      expect(authoring.authoringExample.source, id).toEqual({ kind: 'synthetic_fixture' });
      const structural = validators.get(id);
      expect(structural, id).toBeDefined();
      expect(structural!(authoring.authoringExample), JSON.stringify(structural!.errors)).toBe(true);
      const full = validateRequestValue(authoring.authoringExample);
      expect(full.ok, full.ok ? id : `${id}: ${full.errors.map((error) => error.code).join(',')}`)
        .toBe(true);
    }
  });

  it('makes the authoring selector normative instead of blindly copying valid[0]', () => {
    const spike = readJson('contract/skills/neuro.spike_raster.v1.json');
    expect(spike.examples.authoring.baseValidExampleIndex).toBe(1);
    expect(validateRequestValue({
      ...structuredClone(spike.examples.valid[0]),
      source: { kind: 'synthetic_fixture' },
    }).ok).toBe(false);
    expect(validateRequestValue(SKILL_AUTHORING['neuro.spike_raster'].authoringExample).ok)
      .toBe(true);
  });

  it('states and proves that schema success is weaker than full acceptance', () => {
    const invalid = readJson(
      'contract/skills/network.adjacency_matrix.v1.json',
    ).examples.invalid[0];
    const structural = compileAuthoringSchemas().get('network.adjacency_matrix')!;
    expect(structural(invalid.request), JSON.stringify(structural.errors)).toBe(true);
    const full = validateRequestValue(invalid.request);
    expect(full.ok).toBe(false);
    if (!full.ok) {
      expect(full.errors.map((error) => error.code)).toContain('SCOPE_MERGE_CONFLICT');
    }
  });

  it('binds every public stable metadata and authoring axis into the v2 digest domain', () => {
    const identity = catalogIdentity();
    expect(canonicalDigest(identity)).toBe(CATALOG_DIGEST);
    const firstSkill = (identity.skills as Record<string, unknown>[])[0];

    for (const field of Object.keys(firstSkill)) {
      const mutated = structuredClone(identity);
      const skill = (mutated.skills as Record<string, unknown>[])[0];
      expect(mutateField(skill, field), `field ${field} must contain identity data`).toBe(true);
      expect(canonicalDigest(mutated), field).not.toBe(CATALOG_DIGEST);
    }

    const changedDomain = structuredClone(identity);
    changedDomain.domain = 'cortexel-public-stable-catalog.test-mutation';
    expect(canonicalDigest(changedDomain)).not.toBe(CATALOG_DIGEST);

    const changedResource = structuredClone(identity);
    (changedResource.schemaResources as Record<string, unknown>[])[0].title =
      '__catalog_digest_mutation__';
    expect(canonicalDigest(changedResource)).not.toBe(CATALOG_DIGEST);

    const changedProfile = structuredClone(identity);
    (changedProfile.schemaCompilationProfile as Record<string, unknown>).engine =
      'different-engine';
    expect(canonicalDigest(changedProfile)).not.toBe(CATALOG_DIGEST);
  });

  it('keeps the discovery projection deeply immutable at runtime', () => {
    expect(Object.isFrozen(SKILL_AUTHORING)).toBe(true);
    expect(Object.isFrozen(AUTHORING_SCHEMA_COMPILATION_PROFILE_V1)).toBe(true);
    expect(Object.isFrozen(AUTHORING_SCHEMA_COMPILATION_PROFILE_V1.options)).toBe(true);
    expect(Object.isFrozen(STABLE_CATALOG_SCHEMA_RESOURCES)).toBe(true);
    expect(Object.isFrozen(SKILL_AUTHORING['neuro.spike_raster'].authoringExample)).toBe(true);
    expect(Object.isFrozen(
      SKILL_AUTHORING['neuro.spike_raster'].authoringExample.source,
    )).toBe(true);
  });

  it('rejects controls, bidi overrides, and lone surrogates anywhere in public data', () => {
    expect(publicCatalogStringProblems(catalogIdentity())).toEqual([]);
    expect(publicCatalogStringProblems({
      nested: ['safe', 'escape\u001bsequence', 'reorder\u202etext', '\ud800'],
      ['key\u202e']: 'value',
    })).toEqual([
      '$.nested[1]: unsafe public string',
      '$.nested[2]: unsafe public string',
      '$.nested[3]: unsafe public string',
      '$: unsafe public object key',
    ].sort());

    const hostileProblems = publicCatalogStringProblems({
      ['evil\u202e\nkey']: 'child\u001b',
      ['x'.repeat(1_000)]: 'long path child\u001b',
    });
    expect(hostileProblems).toHaveLength(3);
    expect(hostileProblems.every((problem) =>
      !/[\u001b\u202e\n]/u.test(problem) && problem.length < 200,
    )).toBe(true);
  });
});
