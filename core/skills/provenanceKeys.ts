// Structured provenance keys — the machine-checkable form of a host's skill
// `provenance_requirements`. A host backend may declare those as free-text prose
// ('spike_recorder id', 'time units', ...) which a gate cannot validate. Here
// they become a closed enum so validateSkillInvocation can assert that an agent
// actually DECLARED the inputs a skill's honesty contract demands.
//
// A human-label lookup is kept for display and for the backend drift test, which
// maps its prose strings onto these keys.

import { z } from 'zod';
import {
  canonicalDigest,
  canonicalize,
} from '../../src/core/canonicalize.js';

export const PROVENANCE_KEYS = Object.freeze([
  'device_id',
  'recorded_variable',
  'units',
  'sampling_interval',
  'recorder_id',
  'sender_ids',
  'population_labels',
  'time_units',
  'source_ids',
  'target_ids',
  'synapse_model',
  'weight_units',
  'extent',
  'spatial_units',
  'mask',
  'kernel',
  'projection_sample_policy',
  'morphology_disclaimer',
  'frame_rate',
  'state_variables',
  'derivation_method',
  'model_context',
  'fixed_parameters',
  'bin_ms',
  'histogram_normalization',
  'interval_scope',
  'event_alignment',
  'psth_aggregation',
  'connection_sample_policy',
  'snapshot_time_ms',
  'snapshot_scope',
  'parallel_edge_policy',
  'matrix_axis_order',
  'matrix_aggregation',
  'delay_units',
  'degree_direction',
  'degree_counting',
  'zero_degree_policy',
  'node_ids',
  'position_scope',
  'detector_id',
  'reference_population',
  'target_population',
  'correlation_normalization',
  'correlation_units',
  'lag_convention',
  'binning_policy',
  'stim_units',
  'rate_normalization',
  'graph_source',
  'graph_snapshot_id',
  'graph_scope',
  'identity_advisory',
] as const);

export type ProvenanceKey = (typeof PROVENANCE_KEYS)[number];

export const ProvenanceKeyEnum = z.enum(PROVENANCE_KEYS);

export const STRICT_PROVENANCE_POLICY = Object.freeze({
  unknownDeclaredInputKeys: 'reject' as const,
  globallyKnownButSkillUnclassifiedKeys: 'reject' as const,
  allowedDeclaredInputKeys: PROVENANCE_KEYS,
  perSkillAllowedKeys:
    'skill.requiredProvenanceKeys union skill.optionalProvenanceKeys' as const,
  requiredKeysSource: 'skill.requiredProvenanceKeys' as const,
  presentKnownValues: 'validate every present per-skill allowed key with provenanceValueConstraints' as const,
  requiredKeysControl: 'required keys control presence; optional keys are allowed only when classified by the selected skill' as const,
  normalizeBeforeValidation: true,
});

export const PROVENANCE_KEY_LABELS: Readonly<Record<ProvenanceKey, string>> = Object.freeze({
  device_id: 'device id',
  recorded_variable: 'recorded variable',
  units: 'units',
  sampling_interval: 'sampling interval',
  recorder_id: 'spike_recorder id',
  sender_ids: 'sender ids',
  population_labels: 'population labels',
  time_units: 'time units',
  source_ids: 'source ids',
  target_ids: 'target ids',
  synapse_model: 'synapse model',
  weight_units: 'weight units',
  extent: 'extent',
  spatial_units: 'spatial coordinate units',
  mask: 'mask',
  kernel: 'kernel',
  projection_sample_policy: 'projection sample policy',
  morphology_disclaimer: 'morphology geometry disclaimer',
  frame_rate: 'frame rate',
  state_variables: 'state variables',
  derivation_method: 'phase-plane derivative derivation method',
  model_context: 'phase-plane model context',
  fixed_parameters: 'phase-plane fixed parameters',
  bin_ms: 'bin width',
  histogram_normalization: 'histogram normalization',
  interval_scope: 'inter-spike interval scope',
  event_alignment: 'event alignment',
  psth_aggregation: 'PSTH sender/trial aggregation',
  connection_sample_policy: 'connection sample policy',
  snapshot_time_ms: 'connection snapshot time in ms',
  snapshot_scope: 'connection snapshot completeness / MPI scope',
  parallel_edge_policy: 'parallel-edge handling policy',
  matrix_axis_order: 'matrix source/target axis order',
  matrix_aggregation: 'parallel-connection matrix aggregation',
  delay_units: 'synaptic delay units',
  degree_direction: 'directed degree orientation',
  degree_counting: 'degree edge-counting policy',
  zero_degree_policy: 'zero-degree node inclusion policy',
  node_ids: 'spatial node ids',
  position_scope: 'spatial position completeness / MPI scope',
  detector_id: 'correlation_detector id',
  reference_population: 'correlogram reference population',
  target_population: 'correlogram target population',
  correlation_normalization: 'correlogram normalization',
  correlation_units: 'correlogram value units',
  lag_convention: 'correlogram lag convention',
  binning_policy: 'bin interval policy',
  stim_units: 'stimulus units',
  rate_normalization: 'rate normalization',
  graph_source: 'graph source',
  graph_snapshot_id: 'immutable graph snapshot id',
  graph_scope: 'graph scope',
  identity_advisory: 'model-identity advisory (structural similarity, not certified sameness)',
});

export function isProvenanceKey(value: unknown): value is ProvenanceKey {
  return (
    typeof value === 'string' &&
    (PROVENANCE_KEYS as readonly string[]).includes(value)
  );
}

export type ProvenanceValueConstraint =
  | { kind: 'positive_finite_number' }
  | { kind: 'nonnegative_finite_number' }
  | { kind: 'literal_true' }
  | { kind: 'nonnegative_safe_integer_or_nonblank_string'; normalize: 'trim' }
  | {
      kind: 'canonical_id_collection';
      normalize: 'trim';
      canonicalization: 'RFC8785';
      idDomain: 'nonnegative_safe_integer';
      unique: true;
      allowDigest: true;
      allowOpaqueDigestCount: true;
    }
  | {
      kind: 'canonical_positive_finite_number_array';
      normalize: 'trim';
      canonicalization: 'RFC8785';
      allowedLengths: readonly number[];
    }
  | { kind: 'string'; allowEmpty: true }
  | { kind: 'nonblank_string'; normalize: 'trim' };

/** Machine-verifiable relationships between checked params and declared
 *  provenance. They do not prove a claim true, but prevent the gate from
 *  blessing contradictions such as params.units='mV' with declared units='pA'. */
export type ProvenanceParamConstraint = (
  | {
      kind: 'equals_param';
      provenanceKey: ProvenanceKey;
      paramKey: string;
      description: string;
    }
  | {
      kind: 'equals_param_path';
      provenanceKey: ProvenanceKey;
      /** Dot-separated own-property path through already checked params. */
      paramPath: string;
      description: string;
    }
  | {
      kind: 'equals_literal';
      provenanceKey: ProvenanceKey;
      value: string | number | true;
      description: string;
    }
  | {
      kind: 'one_of_literals';
      provenanceKey: ProvenanceKey;
      values: readonly (string | number | true)[];
      description: string;
    }
  | {
      kind: 'matches_regular_time_axis';
      provenanceKey: ProvenanceKey;
      /** Dot-separated own-property path to the checked numeric time array. */
      paramPath: string;
      absoluteTolerance: number;
      relativeTolerance: number;
      /** Approximate binary64 roundoff allowance at the two timestamps. */
      roundoffUlps: number;
      /** Never repair more than this fraction of the declared interval. */
      maxRoundoffFraction: number;
      description: string;
    }
  | {
      kind: 'each_label_matches_variable';
      provenanceKey: ProvenanceKey;
      /** Dot-separated own-property path to the checked series-label array. */
      paramPath: string;
      separator: string;
      description: string;
    }
  | {
      kind: 'matches_canonical_json_param';
      provenanceKey: ProvenanceKey;
      /** Dot-separated own-property path to a checked JSON array/tuple. */
      paramPath: string;
      /** Large arrays may be represented by their RFC 8785 SHA-256 digest. */
      allowDigest: boolean;
      description: string;
    }
  | {
      kind: 'matches_projected_id_collection';
      provenanceKey: ProvenanceKey;
      /** Dot-separated own-property path to a checked array. */
      paramPath: string;
      /** Optional own field projected from every array item. */
      field?: string;
      idDomain: 'nonnegative_safe_integer' | 'nonblank_string';
      comparison: 'ordered' | 'set';
      relation: 'equals' | 'contains';
      /** Digest form is sound only for equality, never membership. */
      allowDigest: boolean;
      /** A digest with a separately declared count can establish only a
       * cardinality lower bound for a disclosed external universe. */
      allowOpaqueDigestCount: boolean;
      description: string;
    }
  | {
      kind: 'all_projected_values_equal';
      provenanceKey: ProvenanceKey;
      /** Dot-separated own-property path to a checked object array. */
      paramPath: string;
      field: string;
      /** Empty/all-absent projections are externally unverifiable and pass. */
      emptyPolicy: 'pass_unverifiable';
      description: string;
    }
  | {
      kind: 'canonical_json_array_length_matches_param';
      provenanceKey: ProvenanceKey;
      /** Dot-separated own-property path to a checked non-negative count. */
      paramPath: string;
      idDomain: 'nonnegative_safe_integer' | 'nonblank_string';
      relation: 'equals' | 'at_least' | 'nonempty_if_positive';
      allowOpaqueDigestCount: boolean;
      description: string;
    }
  | {
      kind: 'canonical_json_array_length_equals';
      provenanceKey: ProvenanceKey;
      expectedLength: number;
      description: string;
    }
  | {
      kind: 'canonical_json_array_length_at_least_projected_sum';
      provenanceKey: ProvenanceKey;
      /** Dot-separated own-property path to a checked object array. */
      paramPath: string;
      field: string;
      idDomain: 'nonnegative_safe_integer' | 'nonblank_string';
      allowOpaqueDigestCount: boolean;
      description: string;
    }
) & {
  /** False for a supplemental contradiction check that cannot establish the
   * source-level provenance claim by itself. */
  establishesBinding?: boolean;
};

export const PROVENANCE_PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: '4',
  evaluationOrder: Object.freeze([
    'apply provenanceValueConstraints normalization',
    'validate every present known provenance value',
    'check required provenance-key presence',
    'evaluate provenanceParamConstraints in listed order',
  ]),
  kinds: Object.freeze([
    'equals_param',
    'equals_param_path',
    'equals_literal',
    'one_of_literals',
    'matches_regular_time_axis',
    'each_label_matches_variable',
    'matches_canonical_json_param',
    'matches_projected_id_collection',
    'all_projected_values_equal',
    'canonical_json_array_length_matches_param',
    'canonical_json_array_length_equals',
    'canonical_json_array_length_at_least_projected_sum',
  ] as const),
  semantics: Object.freeze({
    equals_param: 'declared value must equal one checked top-level params property under Object.is',
    equals_param_path: 'declared value must equal the checked scalar reached through a dot-separated sequence of safe own data-property names under Object.is',
    equals_literal: 'declared value must equal the contract literal under Object.is',
    one_of_literals: 'declared value must equal one contract literal under Object.is',
    matches_regular_time_axis: Object.freeze({
      timeArray:
        'the checked array contains at least two finite, strictly increasing binary64 timestamps',
      declaredInterval:
        'a positive finite binary64 number',
      binary64Epsilon: Number.EPSILON,
      relativeScale:
        'max(abs(right-left), abs(declaredInterval))',
      candidateRoundoff:
        'roundoffUlps * binary64Epsilon * max(abs(left), abs(right), abs(declaredInterval))',
      roundoffCap:
        'maxRoundoffFraction * abs(declaredInterval)',
      boundedRoundoff:
        'candidateRoundoff when candidateRoundoff <= roundoffCap, otherwise 0',
      tolerance:
        'absoluteTolerance + relativeTolerance * relativeScale + boundedRoundoff',
      acceptance:
        'for every adjacent pair, abs((right-left)-declaredInterval) <= tolerance',
    }),
    each_label_matches_variable: 'every checked series label must either exactly equal the declared recorded variable or consist of a nonblank series identity, the exact published separator, and the exact declared variable as its terminal segment',
    matches_canonical_json_param: 'the declared string must be either the RFC 8785 canonical JSON serialization of the checked array/tuple or, when allowDigest=true, its sha256:<64 lowercase hex> RFC 8785 digest',
    matches_projected_id_collection: 'project an optional own id field from every item of the checked array; direct id arrays contain unique members in the published idDomain (non-negative safe integers or nonblank strings); ordered equality preserves order, set equality compares unique members, and contains requires every projected member to occur in the declared canonical JSON array; an exact equality digest is sha256 over RFC 8785 canonical JSON of the projected sequence (for set comparison, remove later duplicates while preserving first encounter order); when allowOpaqueDigestCount=true on a supplemental external contains check, sha256:<64 lowercase hex>;count:<n> cannot prove membership or preimage type but must declare at least the number of distinct observed ids',
    all_projected_values_equal: 'when projected values exist, every present projected scalar must equal the declared value under Object.is; an empty or all-absent projection remains externally unverifiable and follows emptyPolicy',
    canonical_json_array_length_matches_param: 'the declared collection is either a canonical JSON array of unique ids in the published idDomain or, when allowed, sha256:<64 lowercase hex>;count:<non-negative safe integer>; relation=equals requires its item count to equal the checked non-negative safe-integer param, relation=at_least requires at least that count, and relation=nonempty_if_positive requires at least one declared id exactly when the checked param is positive (zero permits an empty collection); the last relation rejects a provably empty endpoint universe without claiming to identify its members',
    canonical_json_array_length_equals: 'the declared value must be an RFC 8785 canonical JSON array with exactly expectedLength elements; this per-skill shape check does not establish that an external declaration is true',
    canonical_json_array_length_at_least_projected_sum: 'the declared collection is a unique id array or allowed opaque digest+count, and its item count must be at least the safe-integer sum of the non-negative safe-integer field projected from the checked object array; this checks the disjoint selected-population denominator lower bound without claiming to recover member identity',
  }),
});

/** Exact semantic rule applied to every required declared-input value. Non-TS
 *  hosts consume the same table from skills.manifest.json. */
export const PROVENANCE_VALUE_CONSTRAINTS: Readonly<
  Record<ProvenanceKey, ProvenanceValueConstraint>
> = (() => {
  const constraints = Object.create(null) as Record<
    ProvenanceKey,
    ProvenanceValueConstraint
  >;
  for (const key of PROVENANCE_KEYS) {
    constraints[key] = { kind: 'nonblank_string', normalize: 'trim' };
  }
  for (const key of ['sampling_interval', 'bin_ms', 'frame_rate'] as const) {
    constraints[key] = { kind: 'positive_finite_number' };
  }
  constraints.snapshot_time_ms = { kind: 'nonnegative_finite_number' };
  for (const key of ['device_id', 'recorder_id', 'detector_id'] as const) {
    constraints[key] = {
      kind: 'nonnegative_safe_integer_or_nonblank_string',
      normalize: 'trim',
    };
  }
  for (const key of ['sender_ids', 'source_ids', 'target_ids', 'node_ids'] as const) {
    constraints[key] = {
      kind: 'canonical_id_collection',
      normalize: 'trim',
      canonicalization: 'RFC8785',
      idDomain: 'nonnegative_safe_integer',
      unique: true,
      allowDigest: true,
      allowOpaqueDigestCount: true,
    };
  }
  constraints.extent = {
    kind: 'canonical_positive_finite_number_array',
    normalize: 'trim',
    canonicalization: 'RFC8785',
    allowedLengths: Object.freeze([2, 3]),
  };
  constraints.identity_advisory = { kind: 'literal_true' };
  for (const constraint of Object.values(constraints)) Object.freeze(constraint);
  return Object.freeze(constraints);
})();

/** Basic semantic validation for declared provenance. This cannot prove an
 *  assertion is true, but it prevents meaningless declarations such as
 *  `units:true`, a negative sampling interval, or identity_advisory:"false". */
export function declaredProvenanceValueError(
  key: ProvenanceKey,
  value: string | number | true,
): string | null {
  const constraint = PROVENANCE_VALUE_CONSTRAINTS[key];
  switch (constraint.kind) {
    case 'positive_finite_number':
      return typeof value === 'number' && Number.isFinite(value) && value > 0
        ? null
        : `${key} must be a positive finite number`;
    case 'nonnegative_finite_number':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && !Object.is(value, -0)
        ? null
        : `${key} must be a non-negative finite number`;
    case 'literal_true':
      return value === true
        ? null
        : 'identity_advisory must be literal true (model identity is advisory)';
    case 'nonnegative_safe_integer_or_nonblank_string':
      if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)
          ? null
          : `${key} numeric ids must be non-negative safe integers`;
      }
      return typeof value === 'string' && value.trim().length > 0
        ? null
        : `${key} must be a non-empty string or numeric id`;
    case 'canonical_id_collection': {
      if (typeof value !== 'string') {
        return `${key} must be a canonical id-array or digest string`;
      }
      if (constraint.allowDigest && isCanonicalDigest(value)) return null;
      if (
        constraint.allowOpaqueDigestCount &&
        opaqueDigestCollectionCount(value) !== undefined
      ) {
        return null;
      }
      const parsed = parseCanonicalIdArray(value, key, constraint.idDomain);
      return parsed.ok
        ? null
        : parsed.message;
    }
    case 'canonical_positive_finite_number_array': {
      const parsed = parseCanonicalScalarArray(value, key);
      if (!parsed.ok) return parsed.message;
      if (!constraint.allowedLengths.includes(parsed.values.length)) {
        return `${key} must contain ${constraint.allowedLengths.join(' or ')} elements`;
      }
      return parsed.values.every((element) =>
        typeof element === 'number' &&
        Number.isFinite(element) &&
        element > 0 &&
        !Object.is(element, -0))
        ? null
        : `${key} must contain only strictly positive finite numbers`;
    }
    case 'string':
      return typeof value === 'string' ? null : `${key} must be a string`;
    case 'nonblank_string':
      return typeof value === 'string' && value.trim().length > 0
        ? null
        : `${key} must be a non-empty string`;
  }
}

/** Apply the normalization declared in the portable constraint table. Strict
 *  gates return this normalized value so TypeScript and non-TypeScript hosts do
 *  not disagree about whether whitespace is preserved. */
export function normalizeDeclaredProvenanceValue(
  key: ProvenanceKey,
  value: string | number | true,
): string | number | true {
  const constraint = PROVENANCE_VALUE_CONSTRAINTS[key];
  return 'normalize' in constraint && constraint.normalize === 'trim' && typeof value === 'string'
    ? value.trim()
    : value;
}

export function normalizeDeclaredProvenanceInputs(
  inputs: Record<string, string | number | true>,
): Record<string, string | number | true> {
  const normalized: Record<string, string | number | true> = {};
  for (const key of Object.keys(inputs)) {
    const value = inputs[key];
    Object.defineProperty(normalized, key, {
      value: isProvenanceKey(key)
        ? normalizeDeclaredProvenanceValue(key, value)
        : value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return normalized;
}

type SafeParamPathResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

function resolveSafeParamPath(
  params: Record<string, unknown>,
  paramPath: string,
): SafeParamPathResult {
  const segments = paramPath.split('.');
  if (
    segments.length === 0 ||
    segments.some((segment) =>
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment) ||
      segment === '__proto__' || segment === 'prototype' || segment === 'constructor')
  ) {
    return {
      ok: false,
      message: `params.${paramPath} is not a safe parameter path`,
    };
  }
  let value: unknown = params;
  for (const segment of segments) {
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      !Object.hasOwn(value, segment)
    ) {
      return {
        ok: false,
        message: `params.${paramPath} is absent`,
      };
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, segment);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      return {
        ok: false,
        message: `params.${paramPath} is not an enumerable data property`,
      };
    }
    value = descriptor.value;
  }
  return { ok: true, value };
}

function regularTimeAxisError(
  constraint: Extract<
    ProvenanceParamConstraint,
    { kind: 'matches_regular_time_axis' }
  >,
  actual: string | number | true,
  params: Record<string, unknown>,
): string | null {
  if (
    typeof actual !== 'number' ||
    !Number.isFinite(actual) ||
    actual <= 0
  ) {
    return `${constraint.provenanceKey} must be a positive finite number`;
  }
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  if (
    !Array.isArray(resolved.value) ||
    !resolved.value.every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not a finite numeric array`;
  }
  if (
    !Number.isFinite(constraint.absoluteTolerance) ||
    constraint.absoluteTolerance < 0 ||
    !Number.isFinite(constraint.relativeTolerance) ||
    constraint.relativeTolerance < 0 ||
    !Number.isFinite(constraint.roundoffUlps) ||
    constraint.roundoffUlps < 0 ||
    !Number.isFinite(constraint.maxRoundoffFraction) ||
    constraint.maxRoundoffFraction < 0
  ) {
    return `cannot verify ${constraint.provenanceKey}: the contract has invalid sampling tolerances`;
  }

  const times = resolved.value as number[];
  if (times.length < 2) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} must contain at least two timestamps`;
  }
  for (let index = 1; index < times.length; index++) {
    const left = times[index - 1];
    const right = times[index];
    const delta = right - left;
    if (!(delta > 0) || !Number.isFinite(delta)) {
      return `${constraint.provenanceKey} cannot match params.${constraint.paramPath}: timestamps must be strictly increasing at index ${index}`;
    }
    const relativeScale = Math.max(Math.abs(delta), Math.abs(actual));
    const candidateRoundoff =
      constraint.roundoffUlps *
      Number.EPSILON *
      Math.max(Math.abs(left), Math.abs(right), Math.abs(actual));
    const roundoffCap = constraint.maxRoundoffFraction * Math.abs(actual);
    const boundedRoundoff =
      candidateRoundoff <= roundoffCap ? candidateRoundoff : 0;
    const tolerance =
      constraint.absoluteTolerance +
      constraint.relativeTolerance * relativeScale +
      boundedRoundoff;
    if (Math.abs(delta - actual) > tolerance) {
      return `${constraint.provenanceKey} (${JSON.stringify(actual)}) must match every adjacent delta in params.${constraint.paramPath}; index ${index} has delta ${JSON.stringify(delta)}`;
    }
  }
  return null;
}

function seriesLabelBindingError(
  constraint: Extract<
    ProvenanceParamConstraint,
    { kind: 'each_label_matches_variable' }
  >,
  actual: string | number | true,
  params: Record<string, unknown>,
): string | null {
  if (typeof actual !== 'string' || actual.length === 0) {
    return `${constraint.provenanceKey} must be a nonblank string`;
  }
  if (constraint.separator.length === 0) {
    return `cannot verify ${constraint.provenanceKey}: the contract label separator is empty`;
  }
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  if (
    !Array.isArray(resolved.value) ||
    !resolved.value.every((value) => typeof value === 'string')
  ) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not a string array`;
  }
  const suffix = `${constraint.separator}${actual}`;
  for (let index = 0; index < resolved.value.length; index++) {
    const label = resolved.value[index] as string;
    if (label === actual) continue;
    if (
      label.endsWith(suffix) &&
      label.slice(0, -suffix.length).trim().length > 0
    ) {
      continue;
    }
    return `params.${constraint.paramPath}[${index}] must equal ${JSON.stringify(actual)} or end with ${JSON.stringify(suffix)} after a nonblank series identity`;
  }
  return null;
}

type CanonicalArrayResult =
  | { ok: true; values: readonly (string | number | boolean | null)[] }
  | { ok: false; message: string };

function parseCanonicalScalarArray(
  actual: string | number | true,
  provenanceKey: ProvenanceKey,
): CanonicalArrayResult {
  if (typeof actual !== 'string') {
    return {
      ok: false,
      message: `${provenanceKey} must be a canonical JSON array string`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(actual);
  } catch {
    return {
      ok: false,
      message: `${provenanceKey} must be valid canonical JSON`,
    };
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((value) =>
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)))
  ) {
    return {
      ok: false,
      message: `${provenanceKey} must be a canonical JSON array of finite scalar values`,
    };
  }
  let canonical: string;
  try {
    canonical = canonicalize(parsed);
  } catch {
    return {
      ok: false,
      message: `${provenanceKey} is outside the RFC 8785 canonical JSON domain`,
    };
  }
  if (canonical !== actual) {
    return {
      ok: false,
      message: `${provenanceKey} must use exact RFC 8785 canonical JSON with no insignificant whitespace`,
    };
  }
  return { ok: true, values: parsed };
}

function isCanonicalDigest(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value);
}

function opaqueDigestCollectionCount(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^sha256:[0-9a-f]{64};count:(0|[1-9][0-9]*)$/.exec(value);
  if (!match) return undefined;
  const count = Number(match[1]);
  return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
}

function declaredCollectionCount(
  actual: string | number | true,
  provenanceKey: ProvenanceKey,
  idDomain: 'nonnegative_safe_integer' | 'nonblank_string',
  allowOpaqueDigestCount: boolean,
): { ok: true; count: number } | { ok: false; message: string } {
  if (allowOpaqueDigestCount) {
    const count = opaqueDigestCollectionCount(actual);
    if (count !== undefined) return { ok: true, count };
  }
  const parsed = parseCanonicalIdArray(actual, provenanceKey, idDomain);
  return parsed.ok
    ? { ok: true, count: parsed.values.length }
    : parsed;
}

function jsonScalarKey(value: unknown): string | null {
  if (
    value !== null &&
    typeof value !== 'string' &&
    typeof value !== 'boolean' &&
    !(typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0))
  ) {
    return null;
  }
  try {
    return canonicalize(value);
  } catch {
    return null;
  }
}

function matchesIdDomain(
  value: unknown,
  idDomain: 'nonnegative_safe_integer' | 'nonblank_string',
): value is string | number {
  return idDomain === 'nonblank_string'
    ? typeof value === 'string' && value.trim().length > 0
    : typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value >= 0 &&
      !Object.is(value, -0);
}

function parseCanonicalIdArray(
  actual: string | number | true,
  provenanceKey: ProvenanceKey,
  idDomain: 'nonnegative_safe_integer' | 'nonblank_string',
): CanonicalArrayResult {
  const parsed = parseCanonicalScalarArray(actual, provenanceKey);
  if (!parsed.ok) return parsed;
  if (!parsed.values.every((value) => matchesIdDomain(value, idDomain))) {
    return {
      ok: false,
      message: `${provenanceKey} must contain only ${idDomain === 'nonblank_string' ? 'nonblank-string' : 'non-negative safe-integer'} ids`,
    };
  }
  const keys = parsed.values.map(jsonScalarKey);
  if (new Set(keys).size !== keys.length) {
    return {
      ok: false,
      message: `${provenanceKey} id arrays must not contain duplicates`,
    };
  }
  return parsed;
}

function canonicalCollection(
  values: readonly unknown[],
  comparison: 'ordered' | 'set',
): readonly unknown[] | null {
  const keyed: Array<{ key: string; value: unknown }> = [];
  for (const value of values) {
    const key = jsonScalarKey(value);
    if (key === null) return null;
    keyed.push({ key, value });
  }
  if (comparison === 'ordered') return keyed.map(({ value }) => value);
  const unique = new Map<string, unknown>();
  for (const { key, value } of keyed) unique.set(key, value);
  return [...unique.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([, value]) => value);
}

/** Digest equality commits to the checked projection's encounter order. For set
 *  comparison, later duplicates are removed without imposing an undocumented
 *  lexical order on numeric or string ids. */
function projectedDigestCollection(
  values: readonly unknown[],
  comparison: 'ordered' | 'set',
): readonly unknown[] | null {
  const result: unknown[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = jsonScalarKey(value);
    if (key === null) return null;
    if (comparison === 'set' && seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function projectedValues(
  params: Record<string, unknown>,
  paramPath: string,
  field?: string,
): { ok: true; values: unknown[] } | { ok: false; message: string } {
  const resolved = resolveSafeParamPath(params, paramPath);
  if (!resolved.ok) return resolved;
  if (!Array.isArray(resolved.value)) {
    return {
      ok: false,
      message: `params.${paramPath} is not an array`,
    };
  }
  if (field === undefined) return { ok: true, values: [...resolved.value] };
  if (
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field) ||
    field === '__proto__' ||
    field === 'prototype' ||
    field === 'constructor'
  ) {
    return { ok: false, message: `field ${field} is not a safe own-property name` };
  }
  const values: unknown[] = [];
  for (let index = 0; index < resolved.value.length; index++) {
    const item = resolved.value[index];
    if (
      item === null ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      !Object.hasOwn(item, field)
    ) {
      return {
        ok: false,
        message: `params.${paramPath}[${index}].${field} is absent`,
      };
    }
    const descriptor = Object.getOwnPropertyDescriptor(item, field);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      return {
        ok: false,
        message: `params.${paramPath}[${index}].${field} is not an enumerable data property`,
      };
    }
    values.push(descriptor.value);
  }
  return { ok: true, values };
}

function canonicalJsonParamError(
  constraint: Extract<
    ProvenanceParamConstraint,
    { kind: 'matches_canonical_json_param' }
  >,
  actual: string | number | true,
  params: Record<string, unknown>,
): string | null {
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  if (!Array.isArray(resolved.value)) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not an array`;
  }
  try {
    if (
      constraint.allowDigest &&
      isCanonicalDigest(actual) &&
      actual === canonicalDigest(resolved.value)
    ) {
      return null;
    }
    const parsed = parseCanonicalScalarArray(actual, constraint.provenanceKey);
    if (!parsed.ok) return parsed.message;
    return canonicalize(parsed.values) === canonicalize(resolved.value)
      ? null
      : `${constraint.provenanceKey} must match params.${constraint.paramPath}`;
  } catch {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is outside the RFC 8785 canonical JSON domain`;
  }
}

function projectedCollectionError(
  constraint: Extract<
    ProvenanceParamConstraint,
    { kind: 'matches_projected_id_collection' }
  >,
  actual: string | number | true,
  params: Record<string, unknown>,
): string | null {
  const projected = projectedValues(
    params,
    constraint.paramPath,
    constraint.field,
  );
  if (!projected.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${projected.message}`;
  }
  const expected = canonicalCollection(projected.values, constraint.comparison);
  if (
    !expected ||
    !expected.every((value) => matchesIdDomain(value, constraint.idDomain))
  ) {
    return `cannot verify ${constraint.provenanceKey}: the projected collection is not a valid id collection`;
  }
  const digestCollection = projectedDigestCollection(
    projected.values,
    constraint.comparison,
  );
  if (!digestCollection) {
    return `cannot verify ${constraint.provenanceKey}: the projected collection is outside the RFC 8785 canonical JSON domain`;
  }
  if (
    constraint.relation === 'equals' &&
    constraint.allowDigest &&
    isCanonicalDigest(actual)
  ) {
    return actual === canonicalDigest(digestCollection)
      ? null
      : `${constraint.provenanceKey} digest must match the projected params collection in checked encounter order`;
  }
  if (
    constraint.relation === 'contains' &&
    constraint.establishesBinding === false &&
    constraint.allowOpaqueDigestCount
  ) {
    const opaqueCount = opaqueDigestCollectionCount(actual);
    if (opaqueCount !== undefined) {
      // A digest cannot prove membership. It can still prevent the direct
      // contradiction of claiming fewer universe members than distinct
      // observed ids. The external-claim caption remains mandatory.
      return opaqueCount >= expected.length
        ? null
        : `${constraint.provenanceKey} opaque collection count (${opaqueCount}) must be at least the number of distinct observed ids (${expected.length})`;
    }
  }
  const parsed = parseCanonicalIdArray(
    actual,
    constraint.provenanceKey,
    constraint.idDomain,
  );
  if (!parsed.ok) return parsed.message;
  const declaredCollection = canonicalCollection(parsed.values, constraint.comparison);
  if (!declaredCollection) return `${constraint.provenanceKey} contains invalid values`;
  if (constraint.relation === 'equals') {
    return canonicalize(declaredCollection) === canonicalize(expected)
      ? null
      : `${constraint.provenanceKey} must equal the projected params collection`;
  }
  const declaredKeys = new Set(
    declaredCollection.map((value) => jsonScalarKey(value)),
  );
  return expected.every((value) => declaredKeys.has(jsonScalarKey(value)))
    ? null
    : `${constraint.provenanceKey} must contain every observed value projected from params.${constraint.paramPath}`;
}

function allProjectedValuesEqualError(
  constraint: Extract<
    ProvenanceParamConstraint,
    { kind: 'all_projected_values_equal' }
  >,
  actual: string | number | true,
  params: Record<string, unknown>,
): string | null {
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  if (!Array.isArray(resolved.value)) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not an array`;
  }
  const present: unknown[] = [];
  for (let index = 0; index < resolved.value.length; index++) {
    const item = resolved.value[index];
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath}[${index}] is not an object`;
    }
    if (!Object.hasOwn(item, constraint.field)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(item, constraint.field);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath}[${index}].${constraint.field} is not an enumerable data property`;
    }
    present.push(descriptor.value);
  }
  if (present.length === 0) return null;
  return present.every((value) => Object.is(value, actual))
    ? null
    : `${constraint.provenanceKey} must equal every present params.${constraint.paramPath}[*].${constraint.field} value`;
}

function canonicalJsonArrayLengthError(
  constraint: Extract<
    ProvenanceParamConstraint,
    { kind: 'canonical_json_array_length_matches_param' }
  >,
  actual: string | number | true,
  params: Record<string, unknown>,
): string | null {
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (
    !resolved.ok ||
    typeof resolved.value !== 'number' ||
    !Number.isSafeInteger(resolved.value) ||
    resolved.value < 0
  ) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not a non-negative safe integer`;
  }
  const declaredCount = declaredCollectionCount(
    actual,
    constraint.provenanceKey,
    constraint.idDomain,
    constraint.allowOpaqueDigestCount,
  );
  if (!declaredCount.ok) return declaredCount.message;
  const matches = constraint.relation === 'equals'
    ? declaredCount.count === resolved.value
    : constraint.relation === 'at_least'
      ? declaredCount.count >= resolved.value
      : resolved.value === 0 || declaredCount.count >= 1;
  if (matches) return null;
  if (constraint.relation === 'nonempty_if_positive') {
    return `${constraint.provenanceKey} collection count (${declaredCount.count}) must be at least one when params.${constraint.paramPath} is positive (${resolved.value})`;
  }
  return `${constraint.provenanceKey} collection count (${declaredCount.count}) must ${constraint.relation === 'equals' ? 'equal' : 'be at least'} params.${constraint.paramPath} (${resolved.value})`;
}

function canonicalJsonArrayExactLengthError(
  constraint: Extract<
    ProvenanceParamConstraint,
    { kind: 'canonical_json_array_length_equals' }
  >,
  actual: string | number | true,
): string | null {
  if (
    !Number.isSafeInteger(constraint.expectedLength) ||
    constraint.expectedLength < 0
  ) {
    return `cannot verify ${constraint.provenanceKey}: the contract expectedLength is not a non-negative safe integer`;
  }
  const parsed = parseCanonicalScalarArray(
    actual,
    constraint.provenanceKey,
  );
  if (!parsed.ok) return parsed.message;
  return parsed.values.length === constraint.expectedLength
    ? null
    : `${constraint.provenanceKey} must contain exactly ${constraint.expectedLength} elements`;
}

function canonicalJsonArrayProjectedSumError(
  constraint: Extract<
    ProvenanceParamConstraint,
    { kind: 'canonical_json_array_length_at_least_projected_sum' }
  >,
  actual: string | number | true,
  params: Record<string, unknown>,
): string | null {
  const projected = projectedValues(
    params,
    constraint.paramPath,
    constraint.field,
  );
  if (!projected.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${projected.message}`;
  }
  if (!projected.values.every((value) =>
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0)) {
    return `cannot verify ${constraint.provenanceKey}: projected counts are not non-negative safe integers`;
  }
  let minimum = 0;
  for (const value of projected.values as number[]) {
    minimum += value;
    if (!Number.isSafeInteger(minimum)) {
      return `cannot verify ${constraint.provenanceKey}: projected count sum exceeds the safe-integer domain`;
    }
  }
  const declaredCount = declaredCollectionCount(
    actual,
    constraint.provenanceKey,
    constraint.idDomain,
    constraint.allowOpaqueDigestCount,
  );
  if (!declaredCount.ok) return declaredCount.message;
  return declaredCount.count >= minimum
    ? null
    : `${constraint.provenanceKey} collection count (${declaredCount.count}) must be at least the summed checked sender denominator (${minimum})`;
}

export function provenanceParamConstraintError(
  constraint: ProvenanceParamConstraint,
  params: Record<string, unknown>,
  declared: Record<string, string | number | true>,
): string | null {
  if (!Object.hasOwn(declared, constraint.provenanceKey)) return null;
  const actual = declared[constraint.provenanceKey];
  if (constraint.kind === 'equals_literal') {
    return Object.is(actual, constraint.value)
      ? null
      : `${constraint.provenanceKey} must equal ${JSON.stringify(constraint.value)}`;
  }
  if (constraint.kind === 'one_of_literals') {
    return constraint.values.some((value) => Object.is(actual, value))
      ? null
      : `${constraint.provenanceKey} must equal one of ${JSON.stringify(constraint.values)}`;
  }
  if (constraint.kind === 'matches_regular_time_axis') {
    return regularTimeAxisError(constraint, actual, params);
  }
  if (constraint.kind === 'each_label_matches_variable') {
    return seriesLabelBindingError(constraint, actual, params);
  }
  if (constraint.kind === 'matches_canonical_json_param') {
    return canonicalJsonParamError(constraint, actual, params);
  }
  if (constraint.kind === 'matches_projected_id_collection') {
    return projectedCollectionError(constraint, actual, params);
  }
  if (constraint.kind === 'all_projected_values_equal') {
    return allProjectedValuesEqualError(constraint, actual, params);
  }
  if (constraint.kind === 'canonical_json_array_length_matches_param') {
    return canonicalJsonArrayLengthError(constraint, actual, params);
  }
  if (constraint.kind === 'canonical_json_array_length_equals') {
    return canonicalJsonArrayExactLengthError(constraint, actual);
  }
  if (
    constraint.kind ===
    'canonical_json_array_length_at_least_projected_sum'
  ) {
    return canonicalJsonArrayProjectedSumError(constraint, actual, params);
  }
  const paramPath = constraint.kind === 'equals_param_path'
    ? constraint.paramPath
    : constraint.paramKey;
  const resolved = resolveSafeParamPath(params, paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  return Object.is(actual, resolved.value)
    ? null
    : `${constraint.provenanceKey} (${JSON.stringify(actual)}) must match params.${paramPath} (${JSON.stringify(resolved.value)})`;
}
