import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { canonicalDigest } from '../src/core/canonicalize.js';
import { validateRequestValue } from '../src/core/request.js';
import { validateStructure } from '../src/core/structural-validator.js';
import { SKILL_AUTHORING } from '../src/generated/authoring.js';
import { STABLE_SKILL_IDS } from '../src/generated/catalog.js';
import { CONTRACT_DIGEST } from '../src/generated/identity.js';
import {
  STRUCTURAL_SCHEMA_CONTRACT_DIGEST,
  STRUCTURAL_SCHEMAS,
  STRUCTURAL_SKILL_SCHEMA_PATHS,
} from '../src/generated/structuralSchemas.js';
import { buildFigure, buildFigureFromJson } from '../src/render/index.js';

const CONTRACT = path.resolve(import.meta.dirname, '../contract');
const skillPaths = readdirSync(path.join(CONTRACT, 'schemas/skills'))
  .filter((name) => name.endsWith('.request.v1.schema.json'))
  .sort()
  .map((name) => `schemas/skills/${name}`);
const expectedPaths = [
  'schemas/common.v1.schema.json',
  'schemas/generated/registry-enums.v1.schema.json',
  'schemas/validation-error.v1.schema.json',
  'schemas/figure-request.v1.schema.json',
  'schemas/figure-artifact.v1.schema.json',
  'schemas/stable-figure-request-union.v1.schema.json',
  ...skillPaths,
].sort();

function readSchema(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(CONTRACT, relative), 'utf8')) as
    Record<string, unknown>;
}

// This independent reference retains the former disk-backed resource boundary.
// Only resource delivery changed; every structural accept/reject decision must agree.
const reference = new Ajv2020({
  strict: true,
  allErrors: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
  allowUnionTypes: true,
  validateFormats: false,
  strictRequired: false,
  strictTypes: false,
});
for (const relative of expectedPaths) reference.addSchema(readSchema(relative));

describe('browser-compatible full structural gate', () => {
  it('projects the complete exact normative resource closure under the current digest', () => {
    expect(STRUCTURAL_SCHEMA_CONTRACT_DIGEST).toBe(CONTRACT_DIGEST);
    const manifest = readSchema('manifest.v1.json');
    expect(manifest.contractDigest).toBe(CONTRACT_DIGEST);
    expect(Object.keys(STRUCTURAL_SCHEMAS).sort()).toEqual(expectedPaths);
    expect(STRUCTURAL_SKILL_SCHEMA_PATHS).toEqual(skillPaths);
    for (const relative of expectedPaths) {
      expect(STRUCTURAL_SCHEMAS[relative], relative).toEqual(readSchema(relative));
      expect(Object.isFrozen(STRUCTURAL_SCHEMAS[relative]), relative).toBe(true);
    }
    expect(Object.isFrozen(STRUCTURAL_SCHEMAS)).toBe(true);
    expect(Object.isFrozen(STRUCTURAL_SKILL_SCHEMA_PATHS)).toBe(true);
  });

  it('detects a changed schema value instead of treating the path or digest label as proof', () => {
    const path = 'schemas/common.v1.schema.json';
    const changed = structuredClone(readSchema(path));
    changed.title = 'Changed resource';
    expect(canonicalDigest(changed)).not.toBe(canonicalDigest(STRUCTURAL_SCHEMAS[path]));
    expect(changed).not.toEqual(STRUCTURAL_SCHEMAS[path]);
  });

  it.each(STABLE_SKILL_IDS)('%s retains every living structural accept/reject decision', (id) => {
    const contract = readSchema(`skills/${id}.v1.json`) as unknown as {
      examples: {
        valid: Record<string, unknown>[];
        invalid: { request: Record<string, unknown> }[];
      };
    };
    const validator = reference.getSchema(
      `https://sepahead.github.io/cortexel/schemas/v1/skills/${id}.request.v1.schema.json`,
    );
    expect(validator).toBeDefined();
    for (const request of [
      ...contract.examples.valid,
      ...contract.examples.invalid.map((item) => item.request),
    ]) {
      expect(validateStructure(request, id).ok).toBe(validator!(request));
    }
  });

  it('keeps unknown members and numeric strings rejected without mutating the request', () => {
    const base = structuredClone(SKILL_AUTHORING['neuro.population_rate'].authoringExample);
    for (const rejected of [
      { ...base, extra: 'not a scientific field' },
      { ...base, presentation: { width: '640' } },
    ]) {
      const before = structuredClone(rejected);
      expect(validateStructure(rejected, 'neuro.population_rate').ok).toBe(false);
      expect(rejected).toEqual(before);
    }
    expect(validateStructure(base, 'neuro.population_rate').ok).toBe(true);
  });

  it('retains the full semantic authority gate after structural success', () => {
    const base = structuredClone(SKILL_AUTHORING['neuro.population_rate'].authoringExample);
    const forged = { ...base, calibrated_posterior: true };
    const outcome = validateRequestValue(forged);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('caller-authored assurance must be rejected');
    expect(outcome.errors.map((error) => error.code)).toContain(
      'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN',
    );
    expect(buildFigure(base).ok).toBe(true);
  });

  it('preserves duplicate-key rejection at the public raw figure boundary', () => {
    const base = SKILL_AUTHORING['neuro.population_rate'].authoringExample;
    const body = JSON.stringify(base).slice(1);
    const duplicate = `{"skill":${JSON.stringify(base.skill)},${body}`;
    const outcome = buildFigureFromJson(duplicate);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('duplicate raw members must be rejected');
    expect(outcome.errors.map((error) => error.code)).toContain('JSON_DUPLICATE_KEY');
    expect(buildFigureFromJson(JSON.stringify(base)).ok).toBe(true);
  });

  it('does not resolve inherited or unknown schema identities', () => {
    expect(validateStructure({}, '__proto__').ok).toBe(false);
    expect(validateStructure({}, 'constructor').ok).toBe(false);
    expect(validateStructure({}, 'unknown.figure').ok).toBe(false);
    expect(validateStructure(
      SKILL_AUTHORING['neuro.population_rate'].authoringExample,
      'neuro.population_rate',
    ).ok).toBe(true);
  });
});
