/**
 * Structural validation: does the request have the right SHAPE?
 *
 * JSON Schema Draft 2020-12, compiled by Ajv in strict mode. Coercion, defaults,
 * property removal, and type conversion are all switched OFF. That matters more
 * than it sounds: with coercion on, the string `"5"` becomes the number `5`, and a
 * spike count that arrived as text would be silently accepted as a measurement.
 * Normalization is an explicit, recorded stage — it is not something a validator
 * does behind your back.
 *
 * Schemas are the ones in `contract/`. They are loaded from disk, not duplicated
 * here, so there is exactly one definition of what a request is.
 *
 * ---
 * On Ajv being a runtime dependency.
 *
 * The blueprint's stated target is `dependencies: {}`, with structural validators
 * precompiled ahead of time (Ajv's `standaloneCode`) so that no schema compiler —
 * and no `new Function` — reaches the runtime. That is the better architecture, and
 * it is not what this release does. Ajv 8 is a declared, pinned runtime dependency,
 * it appears in the SBOM, and the packed-artifact tests exercise it.
 *
 * The blueprint permits exactly this, provided the reason is written down rather
 * than glossed over, so: precompilation is a size-and-CSP optimization, not a
 * correctness one. The acceptance decisions are identical either way, and they are
 * pinned by the conformance corpus rather than by the validator's implementation.
 * It is recorded as a known limitation (docs/KNOWN_LIMITATIONS.md) and as an
 * unproven gate in the evidence ledger, not quietly omitted.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';

import { makeError, type CortexelError } from './errors.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locate `contract/` from either the source tree or the packed artifact. The
 * schemas ship WITH the package — a validator that cannot find its contract is a
 * validator that validates nothing.
 */
function findContractRoot(): string {
  const candidates = [
    path.resolve(HERE, '../../contract'), // src/core/ -> repo root
    path.resolve(HERE, '../contract'),
    path.resolve(HERE, '../../../contract'), // dist/core/ -> package root
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'manifest.v1.json'))) return candidate;
  }
  throw new Error(
    'cannot locate the Cortexel contract directory; the package is incomplete or was not packed correctly',
  );
}

const CONTRACT_ROOT = findContractRoot();

function loadSchema(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(CONTRACT_ROOT, relative), 'utf8')) as Record<
    string,
    unknown
  >;
}

let ajv: Ajv2020 | undefined;
const compiled = new Map<string, ValidateFunction>();

function getAjv(): Ajv2020 {
  if (ajv) return ajv;

  const instance = new Ajv2020({
    strict: true,
    allErrors: true,

    // Every one of these is off on purpose.
    coerceTypes: false, // "5" must not become the number 5
    useDefaults: false, // a default is materialized in an explicit, recorded stage
    removeAdditional: false, // an unknown key must FAIL, not vanish
    allowUnionTypes: true,
    validateFormats: false, // no `format` keyword is load-bearing in the contract

    // Two strict checks are switched off. Both are lints that cannot express an
    // exception the contract genuinely needs — so each is re-implemented in
    // scripts/generate-contract.ts, where the exception CAN be stated.
    //
    // `strictRequired` rejects a `required` naming a property not declared in the SAME
    // schema object. That is exactly what a conditional does:
    //
    //   { properties: { scope: {...} },
    //     if:   { properties: { kind: { const: "sampled" } } },
    //     then: { required: ["retainedConnectionCount"] } }
    //
    // The property lives in the enclosing schema; the `then` only says when it becomes
    // mandatory. With this on, the pattern cannot be expressed at all, so several
    // skills would have to drop their conditional requirements — making the contract
    // weaker, not stricter.
    strictRequired: false,

    // `strictTypes` rejects a type-specific keyword used without a `type`. The intent
    // is good — `{maxLength: 5}` applied to a number is silently ignored — but it
    // cannot be satisfied inside a `not`, where adding a type CHANGES THE MEANING:
    //
    //   not: { required: ["x"] }                 rejects any value carrying `x`
    //   not: { type: "object", required: ["x"] } rejects only an OBJECT carrying `x`,
    //                                            and now ACCEPTS a bare string
    //
    // Ajv cannot tell those apart, so satisfying it here would mean silently widening
    // several negative constraints. The generator performs the same check with a `not`
    // exemption instead, which is the version that is actually correct.
    strictTypes: false,
  });

  // The shared $defs, plus the generated enums. Registering them by $id lets the
  // per-skill schemas $ref them without a network fetch — Cortexel never resolves a
  // schema over the wire.
  instance.addSchema(loadSchema('schemas/common.v1.schema.json'));
  instance.addSchema(loadSchema('schemas/generated/registry-enums.v1.schema.json'));

  ajv = instance;
  return instance;
}

/** Compile (once) the request schema for a skill. */
function getSkillValidator(skillId: string): ValidateFunction | undefined {
  const existing = compiled.get(skillId);
  if (existing) return existing;

  const file = path.join(CONTRACT_ROOT, 'schemas', 'skills', `${skillId}.request.v1.schema.json`);
  if (!existsSync(file)) return undefined;

  const schema = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

  let validate: ValidateFunction;
  try {
    validate = getAjv().compile(schema);
  } catch (error) {
    // A schema that will not compile is a CONTRACT defect, and it must say so.
    // Swallowing it would be worse than useless: Ajv registers the $id before it
    // reports the error, so a second attempt fails with "schema already exists" —
    // which points at the cache and hides the actual broken keyword completely.
    throw new Error(
      `the request schema for "${skillId}" failed to compile: ${
        error instanceof Error ? error.message : String(error)
      }\nThis is a defect in contract/skills/${skillId}.v1.json, not in the request being validated.`,
      { cause: error },
    );
  }

  compiled.set(skillId, validate);
  return validate;
}

/**
 * Map one Ajv error to a stable Cortexel code.
 *
 * Tests assert on the CODE and the pointer, never on Ajv's prose — so Ajv can
 * change its wording without breaking a single consumer.
 */
function translate(error: ErrorObject, skillId: string): CortexelError {
  const instancePath = error.instancePath;
  const schemaPath = error.schemaPath;

  switch (error.keyword) {
    case 'additionalProperties': {
      const property = String((error.params as { additionalProperty?: string }).additionalProperty);
      return makeError({
        code: 'SCHEMA_UNKNOWN_PROPERTY',
        stage: 'structural',
        instancePath: `${instancePath}/${property.replace(/~/g, '~0').replace(/\//g, '~1')}`,
        schemaPath,
        skillId,
        message: `"${property}" is not a property this contract defines. Stable schemas are closed, so a mistyped scientific field fails here rather than being silently ignored.`,
        repair: {
          operation: 'remove',
          path: `${instancePath}/${property}`,
          reasonCode: 'SCHEMA_UNKNOWN_PROPERTY',
        },
      });
    }

    case 'required': {
      const property = String((error.params as { missingProperty?: string }).missingProperty);
      return makeError({
        code: 'SCHEMA_REQUIRED_PROPERTY_MISSING',
        stage: 'structural',
        instancePath: `${instancePath}/${property.replace(/~/g, '~0').replace(/\//g, '~1')}`,
        schemaPath,
        skillId,
        message: `"${property}" is required. Cortexel does not infer a scientific fact the source did not state.`,
      });
    }

    case 'type':
      return makeError({
        code: 'SCHEMA_TYPE_MISMATCH',
        stage: 'structural',
        instancePath,
        schemaPath,
        skillId,
        message: `expected ${String((error.params as { type?: string }).type)}. No type coercion is performed.`,
      });

    case 'enum':
    case 'const':
      return makeError({
        code: 'SCHEMA_ENUM_MISMATCH',
        stage: 'structural',
        instancePath,
        schemaPath,
        skillId,
        message: `the value is outside the closed set this field permits. ${error.message ?? ''}`.trim(),
      });

    default:
      return makeError({
        code: 'SCHEMA_VALIDATION_FAILED',
        stage: 'structural',
        instancePath,
        schemaPath,
        skillId,
        message: error.message ?? 'the value failed structural validation',
      });
  }
}

export interface StructuralResult {
  readonly ok: boolean;
  readonly errors: readonly CortexelError[];
}

/** Validate a request against its skill's composed schema. */
export function validateStructure(request: unknown, skillId: string): StructuralResult {
  const validate = getSkillValidator(skillId);

  if (!validate) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'SCHEMA_UNKNOWN_SKILL',
          stage: 'structural',
          instancePath: '/skill/id',
          message: `"${skillId}" is not a stable catalog id. Run \`cortexel catalog\` to list them.`,
        }),
      ],
    };
  }

  if (validate(request)) {
    return { ok: true, errors: [] };
  }

  const raw = validate.errors ?? [];
  const errors = raw
    // Ajv reports the failure of every oneOf branch plus the oneOf itself. The
    // branch failures are the useful ones; the "must match exactly one schema"
    // summary just tells the caller that something, somewhere, was wrong.
    .filter((error) => error.keyword !== 'oneOf' && error.keyword !== 'anyOf')
    .map((error) => translate(error, skillId));

  if (errors.length === 0 && raw.length > 0) {
    errors.push(translate(raw[0], skillId));
  }

  return { ok: false, errors };
}

/** The request envelope, for reading `skill.id` before dispatch. */
export function validateEnvelope(request: unknown): StructuralResult {
  const key = '__envelope__';
  let validate = compiled.get(key);
  if (!validate) {
    validate = getAjv().compile(loadSchema('schemas/figure-request.v1.schema.json'));
    compiled.set(key, validate);
  }
  if (validate(request)) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: (validate.errors ?? []).map((error) => translate(error, 'unknown')),
  };
}

export { CONTRACT_ROOT };
