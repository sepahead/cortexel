import { readFileSync } from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it, vi } from 'vitest';

import { projectStandaloneModule } from '../scripts/lib/precompile-structural-validators.js';
import { validateArtifactStructure, validateEnvelope } from '../src/core/structural-validator.js';
import { SKILL_AUTHORING } from '../src/generated/authoring.js';
import { STABLE_SKILL_IDS } from '../src/generated/catalog.js';
import { CONTRACT_DIGEST } from '../src/generated/identity.js';
import { STRUCTURAL_SCHEMAS } from '../src/generated/structuralSchemas.js';
import {
  STRUCTURAL_VALIDATOR_CONTRACT_DIGEST,
  STRUCTURAL_VALIDATORS,
} from '../src/generated/structuralValidatorCatalog.js';
import { buildFigureFromJson } from '../src/render/index.js';

const contractRoot = path.resolve(import.meta.dirname, '../contract');
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
for (const relative of Object.keys(STRUCTURAL_SCHEMAS)) {
  reference.addSchema(JSON.parse(readFileSync(path.join(contractRoot, relative), 'utf8')));
}

describe('standalone structural decision parity', () => {
  it('exports only the complete current resource closure and contract identity', () => {
    expect(STRUCTURAL_VALIDATOR_CONTRACT_DIGEST).toBe(CONTRACT_DIGEST);
    expect(Object.keys(STRUCTURAL_VALIDATORS)).toEqual(Object.keys(STRUCTURAL_SCHEMAS));
    expect(Object.isFrozen(STRUCTURAL_VALIDATORS)).toBe(true);
  });

  it.each(STABLE_SKILL_IDS)('%s retains live-Ajv acceptance and every raw diagnostic field', (id) => {
    const relative = `schemas/skills/${id}.request.v1.schema.json`;
    const schema = STRUCTURAL_SCHEMAS[relative];
    const live = reference.getSchema(schema.$id as string);
    expect(live).toBeDefined();
    const compiled = STRUCTURAL_VALIDATORS[relative];
    const contract = JSON.parse(readFileSync(path.join(contractRoot, `skills/${id}.v1.json`), 'utf8')) as {
      examples: { valid: Record<string, unknown>[]; invalid: { request: Record<string, unknown> }[] };
    };
    for (const request of [
      ...contract.examples.valid,
      ...contract.examples.invalid.map((item) => item.request),
      { ...contract.examples.valid[0], unknownMember: true },
      { ...contract.examples.valid[0], presentation: { height: '440' } },
    ]) {
      const before = structuredClone(request);
      expect(compiled(request)).toBe(live!(request));
      expect(compiled.errors).toEqual(live!.errors);
      expect(request).toEqual(before);
    }
  });

  it('runs the full public raw request and artifact relations when runtime Function is forbidden', () => {
    const compiler = vi.spyOn(globalThis, 'Function').mockImplementation(() => {
      throw new EvalError('The test forbids runtime code generation.');
    });
    try {
      const request = SKILL_AUTHORING['neuro.analog_trace'].authoringExample;
      const result = buildFigureFromJson(JSON.stringify(request));
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('The full precompiled request control did not build.');
      expect(validateArtifactStructure(result.artifact).ok).toBe(true);
      const invalid = structuredClone(result.artifact);
      invalid.unknownMember = 'not an artifact field';
      expect(validateArtifactStructure(invalid).ok).toBe(false);
      const envelope = { ...request, unknownMember: true };
      expect(validateEnvelope(envelope).ok).toBe(false);
      expect(validateEnvelope(request).ok).toBe(true);
      expect(compiler).not.toHaveBeenCalled();
    } finally {
      compiler.mockRestore();
    }
  });

  it('retains envelope and artifact branch diagnostics from the prior live compiler', () => {
    for (const id of STABLE_SKILL_IDS) {
      const request = SKILL_AUTHORING[id].authoringExample;
      const result = buildFigureFromJson(JSON.stringify(request));
      if (!result.ok) throw new Error(`${id} positive artifact control did not build.`);
      const cases = [
        {
          path: 'schemas/figure-request.v1.schema.json',
          values: [request, { ...request, unknownMember: true }, { ...request, skill: null }],
        },
        {
          path: 'schemas/figure-artifact.v1.schema.json',
          values: [result.artifact, { ...result.artifact, unknownMember: true }, {
            ...result.artifact,
            canonicalRequest: { ...(result.artifact.canonicalRequest as Record<string, unknown>),
              unknownMember: true },
          }],
        },
      ];
      for (const { path: relative, values } of cases) {
        const live = reference.getSchema(STRUCTURAL_SCHEMAS[relative].$id as string)!;
        const compiled = STRUCTURAL_VALIDATORS[relative];
        for (const value of values) {
          expect(compiled(value), `${id} ${relative}`).toBe(live(value));
          expect(compiled.errors, `${id} ${relative}`).toEqual(live.errors);
        }
      }
    }
  });
});

describe('closed standalone compiler-output projection', () => {
  it('converts only exact reviewed helper expressions and preserves strings', () => {
    const output = projectStandaloneModule(
      'const equal = require("ajv/dist/runtime/equal").default;\n' +
      'const length = require("ajv/dist/runtime/ucs2length").default;\n' +
      'export const text = "require(\\\"node:fs\\\")";\n',
    );
    expect(output).toContain('import standaloneEqualModule from "ajv/dist/runtime/equal.js"');
    expect(output).toContain('import standaloneUcs2LengthModule from "ajv/dist/runtime/ucs2length.js"');
    expect(output).toContain('const equal = standaloneEqual;');
    expect(output).toContain('const length = standaloneUcs2Length;');
    expect(output).toContain('export const text = "require(\\\"node:fs\\\")";');
  });

  it.each([
    'const helper = require("node:fs");',
    'const helper = require("ajv/dist/runtime/equal");',
    'const helper = require(dynamicPath).default;',
    'const helper = require("ajv/dist/runtime/equal", "extra").default;',
    'const helper = require("ajv/dist/runtime/other").default;',
    'const validator = new Function("return true");',
    'const validator = Function("return true");',
    'const validator = globalThis.Function("return true");',
    'const value = eval("true");',
    'const dependency = import("node:fs");',
    'import helper from "node:fs";',
    'export { readFile } from "node:fs";',
    'const syntax = ;',
  ])('refuses unreviewed compiler output: %s', (source) => {
    expect(() => projectStandaloneModule(source)).toThrow();
    expect(projectStandaloneModule('export const valid = true;')).toBe('export const valid = true;');
  });
});
