// Structured provenance keys — the machine-checkable form of a host's skill
// `provenance_requirements`. A host backend may declare those as free-text prose
// ('spike_recorder id', 'time units', ...) which a gate cannot validate. Here
// they become a closed enum so validateSkillInvocation can assert that an agent
// actually DECLARED the inputs a skill's honesty contract demands.
//
// A human-label lookup is kept for display and for the backend drift test, which
// maps its prose strings onto these keys.

import { z } from 'zod';

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
  allowedDeclaredInputKeys: PROVENANCE_KEYS,
  requiredKeysSource: 'skill.requiredProvenanceKeys' as const,
  presentKnownValues: 'validate every present known key with provenanceValueConstraints' as const,
  requiredKeysControl: 'presence only; value rules apply whether required or extra' as const,
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
  | { kind: 'string'; allowEmpty: true }
  | { kind: 'nonblank_string'; normalize: 'trim' };

/** Machine-verifiable relationships between checked params and declared
 *  provenance. They do not prove a claim true, but prevent the gate from
 *  blessing contradictions such as params.units='mV' with declared units='pA'. */
export type ProvenanceParamConstraint =
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
    };

export const PROVENANCE_PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: '2',
  evaluationOrder: Object.freeze([
    'apply provenanceValueConstraints normalization',
    'validate every present known provenance value',
    'check required provenance-key presence',
    'evaluate provenanceParamConstraints in listed order',
  ]),
  kinds: Object.freeze(['equals_param', 'equals_param_path', 'equals_literal'] as const),
  semantics: Object.freeze({
    equals_param: 'declared value must equal one checked top-level params property under Object.is',
    equals_param_path: 'declared value must equal the checked scalar reached through a dot-separated sequence of safe own data-property names under Object.is',
    equals_literal: 'declared value must equal the contract literal under Object.is',
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
  const paramPath = constraint.kind === 'equals_param_path'
    ? constraint.paramPath
    : constraint.paramKey;
  const segments = paramPath.split('.');
  if (
    segments.length === 0 ||
    segments.some((segment) =>
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment) ||
      segment === '__proto__' || segment === 'prototype' || segment === 'constructor')
  ) {
    return `cannot verify ${constraint.provenanceKey}: params.${paramPath} is not a safe parameter path`;
  }
  let expected: unknown = params;
  for (const segment of segments) {
    if (expected === null || typeof expected !== 'object' || Array.isArray(expected) ||
        !Object.hasOwn(expected, segment)) {
      return `cannot verify ${constraint.provenanceKey}: params.${paramPath} is absent`;
    }
    const descriptor = Object.getOwnPropertyDescriptor(expected, segment);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      return `cannot verify ${constraint.provenanceKey}: params.${paramPath} is not an enumerable data property`;
    }
    expected = descriptor.value;
  }
  return Object.is(actual, expected)
    ? null
    : `${constraint.provenanceKey} (${JSON.stringify(actual)}) must match params.${paramPath} (${JSON.stringify(expected)})`;
}
