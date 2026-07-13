// Cortexel VizSpec — the agent-emitted, declarative scene contract.
//
// An agent (any host — Engram, Hermes, OpenClaw, …) emits a VizSpec as JSON. The
// frontend validates it here before rendering; a host backend SHOULD mirror this
// schema (e.g. a Pydantic model with the same conservative provenance defaults)
// as a server-side gate for defense in depth. The Zod schema is the runtime
// source of truth on the TS side; `VizSpec` is inferred from it.
//
// The envelope first constrains `params` to bounded, literal JSON; the strict
// skill gate then applies the selected skill's typed schema and cross-field
// invariants. The scene enum derives from the same SCENE_NAMES tuple as the TS
// `SceneName` union, so they can never drift.

import { z } from 'zod';
import { SCENE_NAMES } from './designLaws';
import {
  SAFE_DISPLAY_STRING_PATTERN,
  formatValidationIssues,
  safeErrorMessage,
} from './safeRuntime';

/** The VizSpec contract version. Bumped when the envelope shape changes in a way
 *  a host may need to migrate. A stored payload MAY omit `specVersion` for legacy
 *  compatibility; when stamped, the runtime enforces an exact match. */
export const CORTEXEL_SPEC_VERSION = '1.3.0';

/** Resource ceilings for the plain-JSON envelope. Per-skill schemas impose
 *  tighter array limits where the renderer has a smaller practical budget. */
export const CORTEXEL_JSON_LIMITS = Object.freeze({
  maxDepth: 32,
  maxNodes: 500_000,
  maxObjectKeys: 10_000,
  maxStringLength: 100_000,
  maxTotalStringLength: 5_000_000,
});

/** Portable exact-JSON policy mirrored into the language-neutral manifest. */
export const CORTEXEL_JSON_POLICY = Object.freeze({
  finiteNumbersOnly: true,
  rejectNegativeZero: true,
  plainObjectsOnly: true,
  enumerableDataPropertiesOnly: true,
  rejectAccessors: true,
  rejectSymbolKeys: true,
  rejectSparseArrays: true,
  rejectNamedArrayProperties: true,
  rejectCircularReferences: true,
  rejectRawJson: true,
  duplicateObjectMemberNames: 'reject before materialization' as const,
  rawJsonParsingPrecondition:
    'detect duplicate member names in raw JSON text before converting to an object' as const,
  rejectedObjectKeys: Object.freeze(['__proto__'] as const),
});

export const STRING_NORMALIZATION_POLICY = Object.freeze({
  version: '1',
  lengthModel: 'ECMAScript UTF-16 code units' as const,
  portableLengthKeyword: 'x-cortexel-max-utf16-code-units' as const,
  trimAlgorithm: 'ECMA-262 String.prototype.trim / TrimString' as const,
  trimCodePointsHex: Object.freeze([
    '0009-000D', '0020', '00A0', '1680', '2000-200A', '2028', '2029',
    '202F', '205F', '3000', 'FEFF',
  ]),
  regexDialect: 'ECMA-262 Unicode-aware regular expressions' as const,
  unicodeNormalization: 'none' as const,
  wellFormedUnicodeOnly: true,
  displayStringPattern: SAFE_DISPLAY_STRING_PATTERN.source,
  displayStringControls: 'reject C0/C1, bidi, zero-width, and BOM controls',
});

export const NUMERIC_MODEL_POLICY = Object.freeze({
  version: '1',
  representation: 'IEEE-754 binary64' as const,
  coerceBeforeValidation: true,
  finiteOnly: true,
  negativeZeroRejected: true,
  integerIdentityFields: 'safe integers only' as const,
  constraintEvaluationUsesCoercedValues: true,
});

export const JSON_BUDGET_SEMANTICS = Object.freeze({
  version: '1',
  scope: 'one snapshot of the complete invocation envelope' as const,
  rootDepth: 0,
  nodeCount: 'every scalar, array, and object value; property names are not nodes' as const,
  objectKeyCount: 'per object' as const,
  stringLengthModel: 'UTF-16 code units' as const,
  totalStringLength: 'all string values plus every object property name' as const,
  repeatedReference: 'counted once per JSON occurrence; cycles reject' as const,
});

/** Canonical portable fragments for effect schemas Zod cannot faithfully emit.
 *  The manifest grafts these into both public envelope schemas. */
export const JSON_PARAMS_PORTABLE_SCHEMA = Object.freeze({
  type: 'object' as const,
  maxProperties: CORTEXEL_JSON_LIMITS.maxObjectKeys,
  propertyNames: Object.freeze({
    type: 'string' as const,
    maxLength: CORTEXEL_JSON_LIMITS.maxStringLength,
    'x-cortexel-max-utf16-code-units': CORTEXEL_JSON_LIMITS.maxStringLength,
    not: Object.freeze({ const: '__proto__' }),
  }),
  additionalProperties: true as const,
});

export const DECLARED_INPUTS_PORTABLE_SCHEMA = Object.freeze({
  type: 'object' as const,
  maxProperties: 64,
  propertyNames: Object.freeze({
    type: 'string' as const,
    minLength: 1,
    maxLength: 80,
    'x-cortexel-max-utf16-code-units': 80,
    allOf: Object.freeze([
      Object.freeze({ pattern: '^\\S(?:[\\s\\S]*\\S)?$' }),
      Object.freeze({ pattern: SAFE_DISPLAY_STRING_PATTERN.source }),
    ]),
  }),
  additionalProperties: Object.freeze({
    anyOf: Object.freeze([
      Object.freeze({
        type: 'string' as const,
        maxLength: 5_000,
        'x-cortexel-max-utf16-code-units': 5_000,
        pattern: SAFE_DISPLAY_STRING_PATTERN.source,
      }),
      Object.freeze({ type: 'number' as const }),
      Object.freeze({ type: 'boolean' as const, const: true }),
    ]),
  }),
});

/** Required cross-language processing order. JSON Schema `default` is only an
 *  annotation, so non-TypeScript hosts must materialize these values before
 *  deriving the honesty caption. */
export const ENVELOPE_NORMALIZATION_POLICY = Object.freeze({
  version: '1',
  evaluationOrder: Object.freeze([
    'parse/coerce every JSON number to IEEE-754 binary64',
    'validate and snapshot the raw envelope with exact-JSON budgets',
    'normalize fields carrying x-cortexel-normalize',
    'materialize envelope defaults',
    'validate the envelope JSON Schema',
    'validate skill params, provenance values, and portable constraints',
    'derive and display the mandatory honesty caption',
  ]),
  vizSpecDefaults: Object.freeze({
    params: Object.freeze({}),
    mode: 'interactive' as const,
    themeMode: 'dark' as const,
  }),
  honestyDefaults: Object.freeze({
    calibrated_posterior: false as const,
    advisory_only: true as const,
    is_paper_local_evidence: false as const,
    synthetic: false as const,
  }),
  jsonSchemaDefaultsAreAnnotations: true,
  missingHonestyFlagsMustUseConservativeDefaults: true,
});

interface JsonSafetyIssue {
  path: (string | number)[];
  message: string;
}

type ExactJsonValue =
  | null
  | boolean
  | number
  | string
  | ExactJsonValue[]
  | { [key: string]: ExactJsonValue };

type ExactJsonCloneResult =
  | { ok: true; value: ExactJsonValue }
  | { ok: false; issue: JsonSafetyIssue };

const normalizedRecordKey = z
  .string()
  .min(1)
  .max(80)
  .regex(
    /^\S(?:[\s\S]*\S)?$/,
    'record keys must already be trimmed and contain a non-whitespace character',
  )
  .regex(SAFE_DISPLAY_STRING_PATTERN, 'record keys must not contain display control characters');

/**
 * Validate an envelope (and the `params`/declared-input subtrees that reuse this
 * schema) as literal JSON, not merely a JavaScript value that `JSON.stringify`
 * might drop or mutate.
 * This keeps the documented serialize/store/re-validate contract true: BigInt,
 * functions, undefined, class instances, cycles and pathological nesting fail
 * before a spec is called render-ready.
 */
function cloneExactJson(root: unknown): ExactJsonCloneResult {
  const ancestors = new WeakSet<object>();
  let visited = 0;
  let totalStringLength = 0;

  const fail = (path: (string | number)[], message: string): ExactJsonCloneResult => ({
    ok: false,
    issue: { path, message },
  });

  function inspectString(value: string, path: (string | number)[]): JsonSafetyIssue | null {
    if (value.length > CORTEXEL_JSON_LIMITS.maxStringLength) {
      return {
        path,
        message: `JSON string exceeds ${CORTEXEL_JSON_LIMITS.maxStringLength} characters`,
      };
    }
    totalStringLength += value.length;
    if (totalStringLength > CORTEXEL_JSON_LIMITS.maxTotalStringLength) {
      return {
        path,
        message: `JSON strings exceed ${CORTEXEL_JSON_LIMITS.maxTotalStringLength} total characters`,
      };
    }
    for (let index = 0; index < value.length; index++) {
      const codeUnit = value.charCodeAt(index);
      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) {
          return { path, message: 'strings must not contain an unpaired high surrogate' };
        }
        index += 1;
      } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
        return { path, message: 'strings must not contain an unpaired low surrogate' };
      }
    }
    return null;
  }

  function visit(
    value: unknown,
    path: (string | number)[],
    depth: number,
  ): ExactJsonCloneResult {
    visited += 1;
    if (visited > CORTEXEL_JSON_LIMITS.maxNodes) {
      return fail(path, `JSON value exceeds ${CORTEXEL_JSON_LIMITS.maxNodes} nodes`);
    }
    if (depth > CORTEXEL_JSON_LIMITS.maxDepth) {
      return fail(path, `JSON nesting exceeds ${CORTEXEL_JSON_LIMITS.maxDepth} levels`);
    }

    if (value === null || typeof value === 'boolean') {
      return { ok: true, value };
    }
    if (typeof value === 'string') {
      const issue = inspectString(value, path);
      return issue ? { ok: false, issue } : { ok: true, value };
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return fail(path, 'JSON numbers must be finite (NaN/Infinity are not allowed)');
      }
      return Object.is(value, -0)
        ? fail(path, 'negative zero is not stable through JSON.stringify')
        : { ok: true, value };
    }
    if (typeof value !== 'object') {
      return fail(path, `value of type '${typeof value}' is not JSON-serializable`);
    }

    const object = value as object;
    if (ancestors.has(object)) return fail(path, 'circular JSON reference');
    ancestors.add(object);
    try {
      const isRawJson = (
        JSON as unknown as { isRawJSON?: (candidate: unknown) => boolean }
      ).isRawJSON;
      if (isRawJson?.(value)) {
        return fail(path, 'JSON.rawJSON values are not literal objects and are not allowed');
      }
      if (Array.isArray(value)) {
        // Read length through its descriptor exactly once. A Proxy `get` trap may
        // otherwise return a different length after validation.
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
        if (
          !lengthDescriptor ||
          !('value' in lengthDescriptor) ||
          !Number.isSafeInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0
        ) {
          return fail(path, 'JSON arrays must have an ordinary non-negative length');
        }
        const length = lengthDescriptor.value as number;
        if (length > CORTEXEL_JSON_LIMITS.maxNodes - visited) {
          return fail(path, `JSON value exceeds ${CORTEXEL_JSON_LIMITS.maxNodes} nodes`);
        }
        const ownKeys = Reflect.ownKeys(value);
        for (const key of ownKeys) {
          if (key === 'length') continue;
          if (
            typeof key !== 'string' ||
            !/^(0|[1-9]\d*)$/.test(key) ||
            Number(key) >= length
          ) {
            return fail(
              path,
              'JSON arrays may not carry symbol, named, or out-of-range properties',
            );
          }
        }
        const clone: ExactJsonValue[] = new Array(length);
        for (let i = 0; i < length; i++) {
          // Sparse slots stringify as null, which would change the validated data.
          const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
          if (!descriptor) {
            return fail([...path, i], 'sparse arrays are not allowed in exact JSON');
          }
          if (!('value' in descriptor) || !descriptor.enumerable) {
            return fail(
              [...path, i],
              'JSON array entries must be enumerable data properties, not accessors',
            );
          }
          const nested = visit(descriptor.value, [...path, i], depth + 1);
          if (!nested.ok) return nested;
          clone[i] = nested.value;
        }
        return { ok: true, value: clone };
      }

      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail(path, 'exact JSON must contain plain objects, not class instances');
      }
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) => typeof key === 'symbol')) {
        return fail(path, 'JSON objects may not contain symbol keys');
      }
      const keys = ownKeys as string[];
      if (keys.length > CORTEXEL_JSON_LIMITS.maxObjectKeys) {
        return fail(path, `JSON object exceeds ${CORTEXEL_JSON_LIMITS.maxObjectKeys} keys`);
      }
      const clone: { [key: string]: ExactJsonValue } = {};
      for (const key of keys) {
        if (key === '__proto__') {
          return fail(
            [...path, key],
            "the '__proto__' key is not preserved by the runtime schema parser",
          );
        }
        const keyIssue = inspectString(key, [...path, key]);
        if (keyIssue) return { ok: false, issue: keyIssue };
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          return fail(
            [...path, key],
            'JSON object fields must be enumerable data properties, not accessors',
          );
        }
        const nested = visit(descriptor.value, [...path, key], depth + 1);
        if (!nested.ok) return nested;
        // Define rather than assign so even magic-looking ordinary keys cannot
        // invoke Object.prototype setters on the fresh clone.
        Object.defineProperty(clone, key, {
          value: nested.value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      return { ok: true, value: clone };
    } finally {
      ancestors.delete(object);
    }
  }

  return visit(root, [], 0);
}

export const JsonParamsSchema: z.ZodType<Record<string, unknown>, unknown> = z
  .unknown()
  .transform((params, ctx) => {
    const result = cloneExactJson(params);
    if (!result.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: result.issue.path,
        message: result.issue.message,
      });
      return z.NEVER;
    }
    if (
      result.value === null ||
      typeof result.value !== 'object' ||
      Array.isArray(result.value)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'exact JSON envelope must be a plain object',
      });
      return z.NEVER;
    }
    return result.value;
  });

export const ProvenanceSchema = z
  .object({
    source: z.string().trim().min(1).max(200).regex(SAFE_DISPLAY_STRING_PATTERN),
    calibrated_posterior: z.literal(false).default(false), // fail-closed + portable
    advisory_only: z.boolean().default(true),
    is_paper_local_evidence: z.boolean().default(false),
    caption: z.string().trim().max(500).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
    /** Machine-checkable record of the inputs an agent declared. Keys are
     *  open here (lenient envelope) — validateSkillInvocation enforces the
     *  closed ProvenanceKey set a skill demands, so an unknown key surfaces as a
     *  clear missing_provenance error rather than zod's opaque invalid_key.
     *  The strict gate closes the key set, validates every present known value,
     *  and checks portable params↔claim consistency; factual truth remains the
     *  producer's responsibility. */
    declared_inputs: JsonParamsSchema
      // Reuse the descriptor-derived exact-JSON snapshot so Proxy getters,
      // negative zero, accessors, and magic `__proto__` keys cannot be accepted
      // and then change/disappear during serialization.
      .pipe(
        z.record(
          normalizedRecordKey,
          z.union([
            z.string().max(5_000).regex(SAFE_DISPLAY_STRING_PATTERN),
            z.number(),
            z.literal(true),
          ]),
        ),
      )
      .refine((inputs) => Object.keys(inputs).length <= 64, {
        message: 'declared_inputs may contain at most 64 keys',
      })
      .optional(),
    /** Explicit synthetic/illustrative discriminator — forces the schematic
     *  caption regardless of the other flags. */
    synthetic: z.boolean().default(false),
  })
  // Fail closed at the SHARED envelope: a calibrated Bayesian posterior is never
  // produced by the pipeline. Literal false also makes the rule portable in the
  // generated JSON Schema; strict gates retain the more specific repair code.
  .strict();

export const VizSpecSchema = z.object({
  scene: z.enum(SCENE_NAMES),
  /** Optional self-describing skill id (e.g. 'nest.spike_raster'). When present,
   *  a stored spec is independently re-validatable and its honesty caption is
   *  deterministic: validateSkillInvocation cross-checks it, and VizSpecRenderer
   *  uses it when no explicit `skillId` prop is passed. Scene→skill is many-to-one
   *  (voltage-trace ← voltage_trace AND astrocyte_dynamics), so the scene alone
   *  cannot recover the skill — this field closes that gap. */
  skill: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(SAFE_DISPLAY_STRING_PATTERN, 'skill must not contain display control characters')
    .optional(),
  /** Optional contract version this spec targets (see CORTEXEL_SPEC_VERSION). */
  specVersion: z.literal(CORTEXEL_SPEC_VERSION).optional(),
  // Scene-specific data/options. The envelope path guarantees bounded literal
  // JSON; the strict agent path `validateSkillInvocation` additionally enforces
  // the per-skill shape and cross-field invariants before render.
  params: JsonParamsSchema.default({}),
  mode: z.enum(['interactive', 'export']).default('interactive'),
  themeMode: z.enum(['dark', 'light']).default('dark'),
  camera: z
    .enum(['default', 'top', 'side', 'close', 'cinematic'])
    .optional(),
  /** Optional palette hint — an agent can request a named semantic palette
   *  (e.g. 'crameri', 'okabe-ito'). On the strict skill path an unregistered name
   *  is rejected with 'unknown_palette'; on the lenient validateVizSpec path an
   *  unregistered name is tolerated and getPalette falls back to the default (with
   *  a dev-mode warning). When absent, the host's active palette is used. */
  palette: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(SAFE_DISPLAY_STRING_PATTERN, 'palette must not contain display control characters')
    .optional(),
  provenance: ProvenanceSchema,
}).strict();

export type VizSpec = z.infer<typeof VizSpecSchema>;

export type VizSpecValidation =
  | { ok: true; spec: VizSpec }
  | { ok: false; errors: string[] };

/** Validate untrusted input (e.g. an agent payload) into a typed VizSpec. */
export function validateVizSpec(input: unknown): VizSpecValidation {
  try {
    // Snapshot the whole envelope once so the published budgets and exactness
    // policy have one unambiguous scope. Nested schemas may re-check their local
    // fields, but they only ever see this descriptor-derived plain clone.
    const exact = JsonParamsSchema.safeParse(input);
    if (!exact.success) {
      return {
        ok: false,
        errors: formatValidationIssues(exact.error.issues),
      };
    }
    const result = VizSpecSchema.safeParse(exact.data);
    if (result.success) return { ok: true, spec: result.data };
    return {
      ok: false,
      errors: formatValidationIssues(result.error.issues),
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        `(root): validation could not safely inspect the payload: ${
          safeErrorMessage(error)
        }`,
      ],
    };
  }
}
