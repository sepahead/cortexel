// NEST_SKILL_REGISTRY — the canonical skill axis. Each agent-invocable skill
// declares the NEST device family it consumes, the Cortexel scene it renders to
// (or null when no honest render target exists yet), the params it requires, the
// structured provenance keys its honesty contract demands, renderer routes, and
// a worked example. This is the single source of truth the backend Pydantic
// registry and the frontend mirror DERIVE from (via dist/skills.manifest.json).
//
// Honesty over coverage: spatial_2d, stimulus_response, compartmental_dynamics
// and animation_replay have NO faithful Cortexel scene,
// so scene=null and routeToScene refuses them ("no_cortexel_scene") rather than
// mis-routing to an approximately-similar scene. astrocyte_dynamics renders
// through the generic analog-trace scene but is flagged weak (derived, not 1:1).

import { z } from 'zod';
import type { SceneName } from '../designLaws';
import {
  isSkillId,
  type NestSkillId,
  type NestDeviceFamily,
  type RendererRoute,
} from './skillIds';
import type {
  ProvenanceKey,
  ProvenanceParamConstraint,
} from './provenanceKeys';
import {
  AdjacencyMatrixParamsSchema,
  AnimationReplayParamsSchema,
  AstrocyteParamsSchema,
  CompartmentalParamsSchema,
  ConnectionGraphParamsSchema,
  CorrelogramParamsSchema,
  DelayDistributionParamsSchema,
  DelayMatrixParamsSchema,
  GEOMETRY_MAX_ROUNDOFF_FRACTION,
  HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
  HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
  HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
  HISTOGRAM_MASS_TOLERANCE,
  IsiDistributionParamsSchema,
  InDegreeDistributionParamsSchema,
  KNOWLEDGE_GRAPH_LIMITS,
  KnowledgeGraph3DParamsSchema,
  NetworkParamsSchema,
  OutDegreeDistributionParamsSchema,
  PhasePlaneParamsSchema,
  PlasticityParamsSchema,
  POPULATION_RATE_ABSOLUTE_TOLERANCE,
  POPULATION_RATE_RELATIVE_TOLERANCE,
  PopulationRateParamsSchema,
  PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE,
  PsthParamsSchema,
  RateResponseParamsSchema,
  Spatial2DParamsSchema,
  Spatial3DParamsSchema,
  SPATIAL_BOUNDS_ROUNDOFF_ULPS,
  SpatialMap2DParamsSchema,
  SpikeRasterParamsSchema,
  StimulusResponseParamsSchema,
  VoltageTraceParamsSchema,
  WeightHistogramParamsSchema,
  WeightMatrixParamsSchema,
} from './params';
import { getExamplePayload, getHostRendererExamplePayload } from './examples';

export const CORTEXEL_SKILL_VERSION = '1.6.0';

export const STRICT_INVOCATION_POLICY = Object.freeze({
  version: '2',
  externalSelection: 'validateSkillInvocation(id,payload): explicit id selects; payload.skill is optional but must match when present' as const,
  selfDescribingSelection: 'validateSpec(payload): payload.skill is required and selects the contract' as const,
  hostSelection: 'host envelopes require payload.skill; explicit id and payload.skill must match' as const,
  unknownSkillIds: 'reject' as const,
  cortexelEnvelope: 'allowed iff contract.scene is non-null; payload.scene must equal contract.scene' as const,
  hostEnvelope: 'allowed iff contract.scene is null; scene is forbidden' as const,
  rendererRoute: 'when selected, must occur in contract.rendererRoutes' as const,
  params: 'validate paramsJsonSchema then every paramConstraint' as const,
  provenance: 'apply strictProvenancePolicy, require every contract.requiredProvenanceFlags value, then evaluate every provenanceParamConstraint' as const,
});

export type RequiredProvenanceFlags = Readonly<Partial<{
  advisory_only: boolean;
  is_paper_local_evidence: boolean;
  synthetic: boolean;
}>>;

export interface SkillExample {
  nestExample: string;
  sourceUrl: string;
  dataShape: string;
  output: string;
  note: string;
}

/** Cross-field rules JSON Schema cannot express (such as two arrays having the
 *  same length). Non-TypeScript hosts apply these after paramsJsonSchema. */
export interface ParamValidationConstraint {
  kind:
    | 'equal_length'
    | 'each_length_matches'
    | 'monotonic_non_decreasing'
    | 'non_negative'
    | 'property_count'
    | 'unique_field'
    | 'unique_tuple'
    | 'references_exist'
    | 'no_self_loops'
    | 'same_keys'
    | 'cartesian_product_length'
    | 'permutation_of_keys'
    | 'endpoint_kinds'
    | 'mapped_value'
    | 'conditional_numeric_domain'
    | 'uniform_histogram_bins'
    | 'normalized_histogram_mass'
    | 'psth_derived_counts'
    | 'max_parallel_edges'
    | 'each_unique_field'
    | 'each_contains_field_value'
    | 'node_score_kind'
    | 'edge_score_kind'
    | 'ordered_interval'
    | 'uniform_bin_window'
    | 'population_rate_derived_values'
    | 'symmetric_lag_axis'
    | 'legacy_connection_channels'
    | 'connection_graph_snapshot'
    | 'matrix_connection_counts'
    | 'degree_distribution_consistency'
    | 'delay_distribution_consistency'
    | 'spatial_extent_bounds'
    | 'scope_compatibility'
    | 'acyclic';
  paths: readonly string[];
  field?: string;
  min?: number;
  max?: number;
  symmetricKinds?: readonly string[];
  allowedEndpointKinds?: Readonly<Record<string, readonly [string, string]>>;
  allowedValues?: Readonly<Record<string, string>>;
  numericDomains?: Readonly<Record<
    string,
    Readonly<{ min: number; max?: number; integer?: boolean }>
  >>;
  absoluteTolerance?: number;
  relativeTolerance?: number;
  /** Bounded IEEE-754 roundoff allowance expressed in approximate ULPs. */
  roundoffUlps?: number;
  /** Maximum local-width/half-extent fraction that roundoff may repair. */
  maxRoundoffFraction?: number;
  nonNegativeLowerEdge?: boolean;
  normalizationRules?: Readonly<Record<
    string,
    Readonly<{
      measure: 'sum' | 'density_integral';
      target: number;
    }>
  >>;
  allowedScoreKinds?: Readonly<Record<string, readonly string[]>>;
  allowedFieldValues?: readonly string[];
  description: string;
}

export interface SkillContract {
  id: NestSkillId;
  version: string;
  title: string;
  description: string;
  deviceFamily: NestDeviceFamily;
  /** Cortexel scene this skill renders to, or null when none is honest yet. */
  scene: SceneName | null;
  /** When true, the render carries a mandatory derived-view disclosure. NOTE:
   *  `weak` does NOT always mean "approximate reuse of another scene" — see
   *  `weakDisclosure`. Some skills are weak because the DATA semantics are
   *  advisory (e.g. corpus identity edges), not because the scene is borrowed. */
  weak?: boolean;
  /** The exact honesty sentence shown when `weak` is true. Declared per-skill
   *  because the REASON differs: astrocyte reuses the analog-trace scene (Ca/IP3
   *  ≠ voltage), while the knowledge graph renders in its OWN native scene but its
   *  identity edges are advisory. A single hard-coded "reuses the scene" template
   *  would state a falsehood for the latter. When omitted (but weak), a generic
   *  scene-reuse sentence is used. */
  weakDisclosure?: string;
  /** Machine-readable lifecycle metadata. Deprecated skills remain valid for
   * stored envelopes but agents are directed to the canonical replacement. */
  deprecation?: Readonly<{
    since: string;
    replacement: NestSkillId;
    message: string;
  }>;
  /** Controls derived router discovery without weakening explicit skill-id
   * validation. A deprecated alias can remain valid but disappear from
   * bare-family candidates and data-shape maps. */
  routerEligibility?: Readonly<{
    bareFamilyCandidate: boolean;
    dataShapeKind?: string;
  }>;
  /** Optional deterministic raw-output→params transform advertised to agents. */
  transform?: Readonly<{
    id: string;
    rawFields: readonly string[];
    requiredOptions: readonly string[];
    outputSkill: NestSkillId;
  }>;
  /** Top-level param keys an invocation must supply (subset of paramsSchema). */
  requiredInputKeys: readonly string[];
  /** Per-skill zod schema for `params` (including scene-less host routes). */
  paramsSchema?: z.ZodType;
  /** Portable cross-field rules that complement paramsJsonSchema. */
  paramConstraints?: readonly ParamValidationConstraint[];
  /** Provenance keys the agent must declare for this skill to render. */
  requiredProvenanceKeys: readonly ProvenanceKey[];
  /** Honesty flags whose top-level values are fixed by this skill's epistemic
   * contract. Missing envelope flags materialize conservative defaults first. */
  requiredProvenanceFlags?: RequiredProvenanceFlags;
  /** Deterministic params↔provenance consistency checks. */
  provenanceParamConstraints?: readonly ProvenanceParamConstraint[];
  rendererRoutes: readonly RendererRoute[];
  examples: readonly SkillExample[];
}

/** Versioned evaluator contract for ParamValidationConstraint paths. This is a
 *  deliberately tiny JSONPath subset so non-TS hosts do not have to guess how
 *  `[*]`, `*`, or `?` are interpreted. */
export const PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: '8',
  pathSyntax: 'dot-separated object keys',
  arrayWildcard: '[*]',
  objectValueWildcard: '*',
  optionalSuffix: '?',
  evaluationOrder: Object.freeze([
    'normalize fields carrying x-cortexel-normalize',
    'validate paramsJsonSchema',
    'evaluate paramConstraints in listed order',
  ]),
  kinds: Object.freeze([
    'equal_length',
    'each_length_matches',
    'monotonic_non_decreasing',
    'non_negative',
    'property_count',
    'unique_field',
    'unique_tuple',
    'references_exist',
    'no_self_loops',
    'same_keys',
    'cartesian_product_length',
    'permutation_of_keys',
    'endpoint_kinds',
    'mapped_value',
    'conditional_numeric_domain',
    'uniform_histogram_bins',
    'normalized_histogram_mass',
    'psth_derived_counts',
    'max_parallel_edges',
    'each_unique_field',
    'each_contains_field_value',
    'node_score_kind',
    'edge_score_kind',
    'ordered_interval',
    'uniform_bin_window',
    'population_rate_derived_values',
    'symmetric_lag_axis',
    'legacy_connection_channels',
    'connection_graph_snapshot',
    'matrix_connection_counts',
    'degree_distribution_consistency',
    'delay_distribution_consistency',
    'spatial_extent_bounds',
    'scope_compatibility',
    'acyclic',
  ] as const),
  semantics: Object.freeze({
    equal_length: Object.freeze({
      pathRoles: 'all paths resolve to arrays',
      rule: 'all present arrays have identical length',
      optionalAbsent: 'skip a path ending in ?',
    }),
    each_length_matches: Object.freeze({
      pathRoles: 'first path resolves zero or more arrays; last path is the reference array',
      rule: 'every first-path array length equals the reference-array length',
    }),
    monotonic_non_decreasing: Object.freeze({
      pathRoles: 'each path resolves an ordered numeric sequence',
      rule: 'for every adjacent pair previous <= next',
    }),
    non_negative: Object.freeze({
      pathRoles: 'each path resolves numeric values',
      rule: 'every resolved number is >= 0',
    }),
    property_count: Object.freeze({
      pathRoles: 'each path resolves objects',
      rule: 'own enumerable property count is within optional min/max inclusive',
    }),
    unique_field: Object.freeze({
      pathRoles: 'the first path resolves an array of objects; field names the key',
      rule: 'field values are unique under JSON scalar equality',
    }),
    unique_tuple: Object.freeze({
      pathRoles: 'paths resolve equal-length scalar sequences zipped by index',
      rule: 'zipped JSON tuples are unique; when the final kind value is in symmetricKinds, canonicalize the first two tuple values lexicographically',
    }),
    references_exist: Object.freeze({
      pathRoles: 'all paths except the last resolve references; the last resolves the allowed-id set',
      rule: 'every non-null reference occurs in the allowed-id set',
    }),
    no_self_loops: Object.freeze({
      pathRoles: 'first and second paths resolve equal-length source and target sequences',
      rule: 'source[index] !== target[index] for every index',
    }),
    same_keys: Object.freeze({
      pathRoles: 'paths resolve objects',
      rule: 'all objects have exactly the same own enumerable string-key set',
    }),
    cartesian_product_length: Object.freeze({
      pathRoles: 'first path resolves axis arrays; second path resolves output arrays',
      rule: 'every output-array length equals the product of all axis-array lengths',
    }),
    permutation_of_keys: Object.freeze({
      pathRoles: 'first path resolves a scalar sequence; second path resolves an object',
      rule: 'the sequence contains every object key exactly once',
    }),
    endpoint_kinds: Object.freeze({
      pathRoles: 'first path resolves edges with source/target/kind; second resolves nodes with id/kind',
      rule: 'each edge endpoint node kind equals allowedEndpointKinds[edge.kind]',
    }),
    mapped_value: Object.freeze({
      pathRoles: 'first path resolves a discriminator scalar; second path resolves its dependent scalar',
      rule: 'the second value equals allowedValues[first value]',
    }),
    conditional_numeric_domain: Object.freeze({
      pathRoles: 'first path resolves a discriminator scalar; second path resolves numeric values',
      rule: 'every numeric value satisfies numericDomains[discriminator] inclusive min/max and optional integer requirement',
    }),
    uniform_histogram_bins: Object.freeze({
      pathRoles: 'first path resolves the ordered bin-center array; second path resolves one numeric bin width',
      rule: 'width is positive and finite; centers are strictly increasing; each adjacent delta approximately equals width',
      comparison: 'abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))',
      nonNegativeLowerEdge: 'when true, firstCenter-width/2 must be >= -tolerance, where tolerance uses firstCenter and width/2 in the same comparison formula',
    }),
    normalized_histogram_mass: Object.freeze({
      pathRoles: 'first path resolves normalization mode; second resolves histogram values; third resolves bin width',
      absentMode: 'when normalizationRules has no entry for the selected mode, skip the constraint',
      accumulation: 'values must be finite and non-negative and are summed from index 0 to length-1 using IEEE-754 binary64 addition',
      measures: Object.freeze({
        sum: 'compare the left-to-right value sum with target',
        density_integral: 'multiply the left-to-right value sum by the positive finite width, then compare with target',
      }),
      comparison: 'abs(actual-target) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(target))',
    }),
    psth_derived_counts: Object.freeze({
      pathRoles: 'normalization mode, values array, positive safe-integer trial count, positive finite bin width in ms, and aggregation literal in that order',
      aggregation: 'selected_senders_per_trial means each bin count is the aggregate number of raw spike events from all selected senders across the declared trials',
      recovery: Object.freeze({
        count: 'rawCount = value',
        count_per_trial: 'rawCount = value * trialCount',
        rate_hz: 'rawCount = ((value * trialCount) * binWidthMs) / 1000',
      }),
      operationOrder: 'evaluate the displayed rate_hz expression left-to-right with IEEE-754 binary64 operations; do not fuse or algebraically reorder it',
      nearestInteger: 'round rawCount to the nearest mathematical integer; exact half ties go toward positive infinity (half ties necessarily fail the 1e-6 recovery tolerance)',
      rule: 'count values are exact non-negative safe integers; normalized values pass only when rawCount and rounded are finite, rounded is a non-negative safe integer, and abs(rawCount-rounded) <= absoluteTolerance',
      relativeTolerance: 'none; this constraint uses absoluteTolerance only',
    }),
    max_parallel_edges: Object.freeze({
      pathRoles: 'the first path resolves an array of edges with source and target ids',
      pairIdentity: 'source/target direction is ignored; canonicalize each pair by ECMAScript UTF-16 lexicographic order',
      rule: 'the number of edges for every canonical unordered endpoint pair is <= max',
    }),
    each_unique_field: Object.freeze({
      pathRoles: 'the first path resolves zero or more arrays of objects; field names the key',
      rule: 'within each resolved array, field values are unique under JSON scalar equality',
    }),
    each_contains_field_value: Object.freeze({
      pathRoles: 'the first path resolves zero or more arrays of objects; field names the key',
      rule: 'within each resolved array, at least one object field value occurs in allowedFieldValues under JSON string equality',
    }),
    node_score_kind: Object.freeze({
      pathRoles: 'the first path resolves an array of nodes with kind and optional uncalibrated_score.kind',
      absentScore: 'an absent uncalibrated_score passes',
      rule: 'a present score discriminator occurs in allowedScoreKinds[node.kind]',
    }),
    edge_score_kind: Object.freeze({
      pathRoles: 'the first path resolves an array of edges with kind and optional uncalibrated_score.kind',
      absentScore: 'an absent uncalibrated_score passes',
      rule: 'a present score discriminator occurs in allowedScoreKinds[edge.kind]; an empty allowed list forbids scores for that edge kind',
    }),
    ordered_interval: Object.freeze({
      pathRoles: 'first path resolves one finite interval start; second resolves one finite interval stop',
      rule: 'stop is strictly greater than start',
    }),
    uniform_bin_window: Object.freeze({
      pathRoles: 'ordered bin-center array, positive finite bin width, finite window start, finite window stop in that order',
      rule: 'centers are strictly increasing and uniformly spaced by width; firstCenter-width/2 equals start and lastCenter+width/2 equals stop',
      binning: 'left-closed, right-open bins exactly tile [start,stop)',
      spacingComparison: 'adjacent center deltas use abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual),abs(expected))',
      edgeComparison: 'exact edge equality passes; otherwise the binary64 allowance must be <= maxRoundoffFraction * abs(binWidth), then abs(edge-expected) <= absoluteTolerance + relativeTolerance * abs(binWidth) + roundoffUlps * 2^-52 * max(abs(center),abs(binWidth/2),abs(edge),abs(expected)); an unresolved absolute origin fails closed',
    }),
    population_rate_derived_values: Object.freeze({
      pathRoles: 'series array, shared bin-center array, positive finite bin width, normalization, aggregation, and binning literals in that order',
      fixedSemantics: 'normalization=mean_per_recorded_sender_hz; aggregation=selected_senders; binning=left_closed_right_open',
      seriesRule: 'series ids are unique; recorded_sender_count is a positive safe integer; spike_counts are non-negative safe integers; spike_counts and rates_hz each match the shared bin count',
      rateFormula: 'expected = (spikeCount * 1000) / (recordedSenderCount * binWidthMs)',
      operationOrder: 'multiply spikeCount by 1000; multiply recordedSenderCount by binWidthMs; divide the first result by the second using IEEE-754 binary64; do not fuse or algebraically reorder',
      comparison: 'abs(rate-expected) <= absoluteTolerance + relativeTolerance * max(abs(rate), abs(expected))',
    }),
    symmetric_lag_axis: Object.freeze({
      pathRoles: 'ordered lag-center array, positive finite bin width, positive finite tau_max_ms in that order',
      rule: 'lags are strictly increasing, uniformly spaced by width, odd in count, pairwise symmetric about a zero center, and span exactly [-tau_max_ms,+tau_max_ms]',
      comparison: 'abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))',
    }),
    legacy_connection_channels: Object.freeze({
      pathRoles: 'optional weights array, optional weight_units, optional delays array, and optional delay_units in that order',
      rule: 'weights and weight_units occur together; delays and delay_units occur together; every present delay is finite and strictly positive',
      emptyChannels: 'a present empty measurement array still requires its matching unit',
    }),
    connection_graph_snapshot: Object.freeze({
      pathRoles: 'nodes array, edges array, sample_policy, source_connection_count, optional weight_units, optional delay_units, and edge_identity in that order',
      rule: 'node and edge ids are unique; every edge endpoint exists; weight, delay_ms, and synapse_model are each present on every edge or none; measurement units occur exactly with their channel; complete output has edges.length=source_connection_count; deterministic_even_stride is a non-empty strict subset',
      identity: 'canonical_sorted_ordinal requires connection:<safe ordinal> with ordinal < source_connection_count; nest_connection_identifier requires connection:source:target:target_thread:synapse_id:port with canonical nonnegative safe-integer components and endpoint correlation',
    }),
    matrix_connection_counts: Object.freeze({
      pathRoles: 'ordered source_ids, ordered target_ids, sparse cells, total connection_count, and aggregation in that order',
      rule: 'axis ids are unique; every cell has a unique in-universe source/target pair and positive safe-integer connection_count; the left-to-right safe-integer cell-count sum equals connection_count; single_connection requires every cell count to equal one',
      absence: 'a missing sparse cell means no_connection; a present zero-valued weight cell remains a connection because connection_count is positive',
    }),
    degree_distribution_consistency: Object.freeze({
      pathRoles: 'degrees, node_counts, displayed values, node_count, connection_count, direction, normalization, value_units, edge_counting, and zero_degree_policy in that order',
      rule: 'degrees equal contiguous integers 0..N; counts and nonnegative values match their length; sum(node_counts)=node_count; sum(degree*node_count)=connection_count; displayed counts equal raw counts exactly; probabilities match raw count/node_count and sum to one',
      fixedSemantics: 'edge_counting=each_synapse_collection_entry and zero_degree_policy=include_declared_universe',
    }),
    delay_distribution_consistency: Object.freeze({
      pathRoles: 'bin centers, raw delay_counts, displayed values, bin width, connection_count, normalization, value units, delay units, aggregation, and binning in that order',
      rule: 'the three bin arrays have equal length; displayed values are finite and nonnegative; sum(delay_counts)=connection_count; displayed counts equal raw counts exactly; probabilities or densities exactly equal the published binary64 recovery result and globally sum or integrate to one within the accumulated-mass tolerance; non-count normalization requires a non-empty snapshot and finite density denominator',
      operationOrder: 'probability=count/connection_count; probability_density=count/(connection_count*bin_width_ms) using IEEE-754 binary64; per-bin comparison uses exact Object.is-equivalent binary64 identity, while absoluteTolerance/relativeTolerance apply only to accumulated normalized mass',
      geometry: 'a separate uniform_bin_window constraint publishes and evaluates exact [start,stop) bin geometry',
    }),
    spatial_extent_bounds: Object.freeze({
      pathRoles: 'nodes array, extent tuple, and center tuple in that order',
      rule: 'center ± extent/2 must produce a strictly ordered representable interval on each axis; node ids are unique and every coordinate lies within those bounds using a separate tolerance for each axis',
      comparison: 'axisTolerance = absoluteTolerance + relativeTolerance * abs(halfExtent) + boundedRoundoff; boundedRoundoff is the roundoffUlps * 2^-52 arithmetic allowance only when it is <= maxRoundoffFraction * abs(halfExtent), otherwise zero; the large absolute spatial origin never multiplies relativeTolerance',
      roundoff: 'roundoffUlps and maxRoundoffFraction bound IEEE-754 binary64 repair for deriving center ± extent/2; exact in-bound comparisons remain valid when repair is disabled',
    }),
    scope_compatibility: Object.freeze({
      pathRoles: 'scope object and optional degree direction in that order',
      rule: 'rank-local scopes require integer 0<=rank<world_size; merged scopes require positive world_size; out-degree forbids mpi_target_rank_local',
    }),
    acyclic: Object.freeze({
      pathRoles: 'first path resolves node ids; second resolves each node parent id or null',
      rule: 'following parent links from any id never revisits an id',
    }),
  }),
});

export const NEST_SKILL_REGISTRY: Record<NestSkillId, SkillContract> = {
  'nest.voltage_trace': {
    id: 'nest.voltage_trace',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST voltage trace renderer',
    description:
      'Render labeled multimeter/voltmeter series for one recorded variable and unit.',
    deviceFamily: 'multimeter',
    scene: 'voltage-trace',
    requiredInputKeys: ['times_ms', 'series', 'series_labels', 'units'],
    paramsSchema: VoltageTraceParamsSchema,
    requiredProvenanceKeys: [
      'device_id',
      'recorded_variable',
      'units',
      'sampling_interval',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'units',
        paramKey: 'units',
        description: 'Declared units must match the rendered trace-axis units.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'One neuron example / multimeter recording',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/one_neuron.html',
        dataShape: 'times_ms + same-unit series split and labeled by sender',
        output: 'Labeled same-unit trace series over the checked millisecond axis',
        note: 'Use one invocation per variable/unit; never mix mV, pA and nS on one axis.',
      },
    ],
  },
  'nest.spike_raster': {
    id: 'nest.spike_raster',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST spike raster renderer',
    description:
      'Render exact spike_recorder event times and sender ids as a sender-time raster.',
    deviceFamily: 'spike_recorder',
    scene: 'spike-raster',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'events' },
    requiredInputKeys: ['times_ms', 'senders'],
    paramsSchema: SpikeRasterParamsSchema,
    requiredProvenanceKeys: [
      'recorder_id',
      'sender_ids',
      'population_labels',
      'time_units',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'The times_ms axis is expressed in milliseconds.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Random balanced Brunel network',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html',
        dataShape: 'spike_recorder events: times_ms, senders, population labels',
        output: 'Exact sender-time raster with no invented rate bins or synthetic events',
        note: 'Use exact spike times first; aggregate only when too dense to read.',
      },
    ],
  },
  'nest.isi_distribution': {
    id: 'nest.isi_distribution',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST inter-spike interval distribution renderer',
    description:
      'Render an explicitly normalized histogram of within-sender or single-train inter-spike intervals.',
    deviceFamily: 'spike_recorder',
    scene: 'isi-distribution',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'isi' },
    requiredInputKeys: [
      'bin_centers_ms',
      'values',
      'bin_width_ms',
      'normalization',
      'value_units',
      'interval_scope',
    ],
    paramsSchema: IsiDistributionParamsSchema,
    requiredProvenanceKeys: [
      'recorder_id',
      'sender_ids',
      'population_labels',
      'time_units',
      'bin_ms',
      'histogram_normalization',
      'interval_scope',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'Inter-spike interval bin centers and widths are expressed in milliseconds.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'bin_ms',
        paramKey: 'bin_width_ms',
        description: 'Declared bin width must match params.bin_width_ms.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'histogram_normalization',
        paramKey: 'normalization',
        description: 'Declared histogram normalization must match params.normalization.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'interval_scope',
        paramKey: 'interval_scope',
        description: 'Declared interval scope must match the rendered interval calculation.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'Sinusoidal gamma generator example',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/sinusoidal_gamma_generator.html',
        dataShape: 'ordered ISI bin centers plus counts, probabilities, or probability density',
        output: 'Inter-spike interval histogram with explicit scope and normalization',
        note: 'Compute intervals within each sender; never difference a globally interleaved recorder stream.',
      },
    ],
  },
  'nest.psth': {
    id: 'nest.psth',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST peri-stimulus time histogram renderer',
    description:
      'Render trial-aligned aggregate spike counts across selected senders, counts per trial, or firing rates around a declared event.',
    deviceFamily: 'spike_recorder',
    scene: 'psth',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'psth' },
    requiredInputKeys: [
      'bin_centers_ms',
      'values',
      'bin_width_ms',
      'normalization',
      'value_units',
      'trial_count',
      'alignment_event',
      'aggregation',
    ],
    paramsSchema: PsthParamsSchema,
    requiredProvenanceKeys: [
      'recorder_id',
      'sender_ids',
      'population_labels',
      'time_units',
      'bin_ms',
      'histogram_normalization',
      'event_alignment',
      'psth_aggregation',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'PSTH bin centers and widths are expressed in milliseconds.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'bin_ms',
        paramKey: 'bin_width_ms',
        description: 'Declared bin width must match params.bin_width_ms.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'histogram_normalization',
        paramKey: 'normalization',
        description: 'Declared histogram normalization must match params.normalization.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'event_alignment',
        paramKey: 'alignment_event',
        description: 'Declared event alignment must match params.alignment_event.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'psth_aggregation',
        paramKey: 'aggregation',
        description: 'Declared PSTH aggregation must match params.aggregation.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'Sinusoidal gamma generator example (one selected sender, one trial)',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/sinusoidal_gamma_generator.html',
        dataShape: 'single-trial time bins aggregated across the selected sender set',
        output: 'Peri-stimulus time histogram with auditable normalization',
        note: 'The linked example is one trial; keep sender aggregation, trial count, bin width and alignment event in the checked payload.',
      },
    ],
  },
  'nest.population_rate': {
    id: 'nest.population_rate',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST population-rate renderer',
    description:
      'Render auditable mean firing-rate series derived from raw per-bin spike counts and the exact recorded-sender denominator.',
    deviceFamily: 'spike_recorder',
    scene: 'population-rate',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'population_rate' },
    requiredInputKeys: [
      'bin_centers_ms',
      'bin_width_ms',
      'window_start_ms',
      'window_stop_ms',
      'series',
      'normalization',
      'aggregation',
      'binning',
    ],
    paramsSchema: PopulationRateParamsSchema,
    requiredProvenanceKeys: [
      'recorder_id',
      'sender_ids',
      'population_labels',
      'time_units',
      'bin_ms',
      'rate_normalization',
      'binning_policy',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'Population-rate bin centers, widths, and window bounds are expressed in milliseconds.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'bin_ms',
        paramKey: 'bin_width_ms',
        description: 'Declared bin width must match params.bin_width_ms.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'rate_normalization',
        paramKey: 'normalization',
        description: 'Declared rate normalization must match params.normalization.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'binning_policy',
        paramKey: 'binning',
        description: 'Declared bin interval policy must match params.binning.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'Population firing-rate trace derived from spike_recorder events',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html',
        dataShape: 'uniform [start,stop) bins, raw population spike counts, sender denominator, and derived mean rates',
        output: 'One or more auditable mean-per-recorded-sender population-rate traces',
        note: 'Preserve raw counts and the exact recorded sender count; never divide by an undeclared population size.',
      },
    ],
  },
  'nest.rate_response': {
    id: 'nest.rate_response',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST rate / IF response renderer',
    description:
      'Render firing-rate / IF response points against declared stimulus amplitudes.',
    deviceFamily: 'spike_recorder',
    scene: 'fi-curve',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'fi_response' },
    requiredInputKeys: ['stimulus_amplitudes', 'rates_hz', 'stimulus_units'],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ['stim_units', 'bin_ms', 'rate_normalization'],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'stim_units',
        paramKey: 'stimulus_units',
        description: 'Declared stimulus units must match params.stimulus_units.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'IF curve example',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/if_curve.html',
        dataShape: 'stimulus amplitudes and rates_hz with a declared counting window',
        output: 'F-I response line and points with declared stimulus and rate units',
        note: 'Always show bin width / counting window so rates stay auditable.',
      },
    ],
  },
  'nest.connectivity_matrix': {
    id: 'nest.connectivity_matrix',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST connectivity edge-list topology renderer',
    description:
      'Render SynapseCollection endpoint pairs and optional weights as schematic node-link topology (legacy skill id; not a literal matrix heatmap).',
    deviceFamily: 'get_connections',
    scene: 'network-topology',
    // Connectivity evidence contains endpoints/weights, not measured spatial
    // coordinates. Any node placement in the topology scene is schematic.
    weak: true,
    weakDisclosure:
      'Schematic topology layout — node positions and distances are derived for readability; only the declared edges and weights are evidence.',
    deprecation: {
      since: '1.6.0',
      replacement: 'nest.connection_graph',
      message: 'Legacy edge-list skill id; use nest.connection_graph for explicit graph, snapshot, sampling, and multapse semantics.',
    },
    routerEligibility: { bareFamilyCandidate: false },
    requiredInputKeys: ['sources', 'targets'],
    paramsSchema: NetworkParamsSchema,
    requiredProvenanceKeys: [
      'source_ids',
      'target_ids',
      'synapse_model',
      'connection_sample_policy',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'weight_units',
        paramKey: 'weight_units',
        description: 'When declared, legacy graph weight units must match params.weight_units.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'delay_units',
        paramKey: 'delay_units',
        description: 'When declared, legacy graph delay units must match params.delay_units.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Plot weight matrices example / SynapseCollection',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html',
        dataShape: 'parallel source/target endpoint arrays plus optional weights',
        output: 'Schematic node-edge topology from the checked edge list',
        note: 'Keep absent connections distinct from zero-weight connections; topology positions/distances are schematic.',
      },
    ],
  },
  'nest.connection_graph': {
    id: 'nest.connection_graph',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST connection topology graph renderer',
    description:
      'Render a complete or explicitly deterministic sample of a SynapseCollection snapshot while preserving isolates, autapses, multapses, and measured channels.',
    deviceFamily: 'get_connections',
    scene: 'network-topology',
    weak: true,
    weakDisclosure:
      'Schematic topology layout — circle positions and distances are derived for readability; edges are complete or deterministically sampled exactly as declared.',
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: 'connection_graph',
    },
    transform: {
      id: 'synapseCollectionToConnectionGraphParams',
      rawFields: [
        'source|sources',
        'target|targets',
        'weight|weights?',
        'delay|delays?',
        'synapse_model|synapse_models?',
        'target_thread|target_threads?',
        'synapse_id|synapse_ids?',
        'port|ports?',
      ],
      requiredOptions: [
        'sourceIds',
        'targetIds',
        'snapshotTimeMs',
        'snapshotScope',
        'samplePolicy',
        'weightUnits when weight is present',
        "delayUnits='ms' when delay is present",
      ],
      outputSkill: 'nest.connection_graph',
    },
    requiredInputKeys: [
      'nodes',
      'edges',
      'layout',
      'parallel_edges',
      'self_connections',
      'snapshot_time_ms',
      'snapshot_scope',
      'sample_policy',
      'source_connection_count',
      'edge_identity',
    ],
    paramsSchema: ConnectionGraphParamsSchema,
    requiredProvenanceKeys: [
      'source_ids',
      'target_ids',
      'synapse_model',
      'connection_sample_policy',
      'snapshot_time_ms',
      'snapshot_scope',
      'parallel_edge_policy',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param', provenanceKey: 'connection_sample_policy', paramKey: 'sample_policy',
        description: 'Declared graph sampling must match params.sample_policy.',
      },
      {
        kind: 'equals_param', provenanceKey: 'snapshot_time_ms', paramKey: 'snapshot_time_ms',
        description: 'Declared snapshot time must match params.snapshot_time_ms.',
      },
      {
        kind: 'equals_param_path', provenanceKey: 'snapshot_scope', paramPath: 'snapshot_scope.kind',
        description: 'Declared snapshot scope must match params.snapshot_scope.kind.',
      },
      {
        kind: 'equals_param', provenanceKey: 'parallel_edge_policy', paramKey: 'parallel_edges',
        description: 'Declared parallel-edge policy must match params.parallel_edges.',
      },
      {
        kind: 'equals_param', provenanceKey: 'weight_units', paramKey: 'weight_units',
        description: 'When declared, graph weight units must match params.weight_units.',
      },
      {
        kind: 'equals_param', provenanceKey: 'delay_units', paramKey: 'delay_units',
        description: 'When declared, graph delay units must match params.delay_units.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [{
      nestExample: 'SynapseCollection connection inspection',
      sourceUrl: 'https://nest-simulator.readthedocs.io/en/stable/synapses/synapse_specification.html#inspecting-connections',
      dataShape: 'explicit node universe plus one preserved graph edge per selected SynapseCollection entry',
      output: 'Schematic directed topology graph with disclosed completeness and snapshot scope',
      note: 'Circle placement is schematic; complete and deterministic samples are never conflated.',
    }],
  },
  'nest.adjacency_matrix': {
    id: 'nest.adjacency_matrix',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST binary adjacency matrix renderer',
    description: 'Render sparse connection presence with target rows, source columns, and explicit multapse counts.',
    deviceFamily: 'get_connections',
    scene: 'connection-matrix',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'adjacency_matrix' },
    transform: {
      id: 'synapseCollectionToAdjacencyMatrixParams',
      rawFields: ['source|sources', 'target|targets'],
      requiredOptions: ['sourceIds', 'targetIds', 'snapshotTimeMs', 'snapshotScope'],
      outputSkill: 'nest.adjacency_matrix',
    },
    requiredInputKeys: [
      'source_ids', 'target_ids', 'cells', 'axis_order', 'absent_cell',
      'sample_policy', 'connection_count', 'snapshot_time_ms', 'snapshot_scope',
      'display', 'aggregation',
    ],
    paramsSchema: AdjacencyMatrixParamsSchema,
    requiredProvenanceKeys: [
      'source_ids', 'target_ids', 'synapse_model', 'connection_sample_policy',
      'snapshot_time_ms', 'snapshot_scope', 'parallel_edge_policy',
      'matrix_axis_order', 'matrix_aggregation',
    ],
    provenanceParamConstraints: [
      { kind: 'equals_param', provenanceKey: 'connection_sample_policy', paramKey: 'sample_policy', description: 'Only complete connection snapshots may form a literal matrix.' },
      { kind: 'equals_param', provenanceKey: 'snapshot_time_ms', paramKey: 'snapshot_time_ms', description: 'Declared snapshot time must match params.' },
      { kind: 'equals_param_path', provenanceKey: 'snapshot_scope', paramPath: 'snapshot_scope.kind', description: 'Declared snapshot scope must match params.' },
      { kind: 'equals_literal', provenanceKey: 'parallel_edge_policy', value: 'preserved_as_connection_count', description: 'Parallel connections are preserved as each sparse cell count.' },
      { kind: 'equals_param', provenanceKey: 'matrix_axis_order', paramKey: 'axis_order', description: 'Declared matrix axes must match params.' },
      { kind: 'equals_param', provenanceKey: 'matrix_aggregation', paramKey: 'aggregation', description: 'Declared matrix aggregation must match params.' },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [{
      nestExample: 'Explicit adjacency representation',
      sourceUrl: 'https://nest-simulator.readthedocs.io/en/stable/synapses/connectivity_concepts.html#explicit-connections',
      dataShape: 'ordered source/target axes plus sparse positive connection-count cells',
      output: 'Binary adjacency heatmap with target rows and source columns',
      note: 'Absent cells mean no connection; multapses remain visible through connection_count.',
    }],
  },
  'nest.weight_matrix': {
    id: 'nest.weight_matrix',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST connection-weight matrix renderer',
    description: 'Render explicitly aggregated SynapseCollection weights without conflating absent and zero-valued cells.',
    deviceFamily: 'get_connections',
    scene: 'connection-matrix',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'weight_matrix' },
    transform: {
      id: 'synapseCollectionToWeightMatrixParams',
      rawFields: ['source|sources', 'target|targets', 'weight|weights'],
      requiredOptions: ['sourceIds', 'targetIds', 'snapshotTimeMs', 'snapshotScope', 'weightUnits', 'aggregation'],
      outputSkill: 'nest.weight_matrix',
    },
    requiredInputKeys: [
      'source_ids', 'target_ids', 'cells', 'weight_units', 'aggregation',
      'axis_order', 'absent_cell', 'sample_policy', 'connection_count',
      'snapshot_time_ms', 'snapshot_scope',
    ],
    paramsSchema: WeightMatrixParamsSchema,
    requiredProvenanceKeys: [
      'source_ids', 'target_ids', 'synapse_model', 'weight_units',
      'connection_sample_policy', 'snapshot_time_ms', 'snapshot_scope',
      'parallel_edge_policy', 'matrix_axis_order', 'matrix_aggregation',
    ],
    provenanceParamConstraints: [
      { kind: 'equals_param', provenanceKey: 'weight_units', paramKey: 'weight_units', description: 'Weight units must match params.' },
      { kind: 'equals_param', provenanceKey: 'connection_sample_policy', paramKey: 'sample_policy', description: 'Only complete connection snapshots may form a literal matrix.' },
      { kind: 'equals_param', provenanceKey: 'snapshot_time_ms', paramKey: 'snapshot_time_ms', description: 'Snapshot time must match params.' },
      { kind: 'equals_param_path', provenanceKey: 'snapshot_scope', paramPath: 'snapshot_scope.kind', description: 'Snapshot scope must match params.' },
      { kind: 'equals_literal', provenanceKey: 'parallel_edge_policy', value: 'preserved_as_connection_count', description: 'Parallel connections remain auditable via connection_count.' },
      { kind: 'equals_param', provenanceKey: 'matrix_axis_order', paramKey: 'axis_order', description: 'Matrix axis order must match params.' },
      { kind: 'equals_param', provenanceKey: 'matrix_aggregation', paramKey: 'aggregation', description: 'Weight aggregation must match params.' },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [{
      nestExample: 'Plot weight matrices example',
      sourceUrl: 'https://nest-simulator.readthedocs.io/en/stable/auto_examples/plot_weight_matrices.html',
      dataShape: 'ordered node axes plus sparse measured-weight cells and multapse counts',
      output: 'Unit-labelled weight heatmap',
      note: 'A present zero/cancelled cell remains distinct from an absent connection.',
    }],
  },
  'nest.delay_matrix': {
    id: 'nest.delay_matrix',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST synaptic-delay matrix renderer',
    description: 'Render explicitly aggregated positive synaptic delays in milliseconds.',
    deviceFamily: 'get_connections',
    scene: 'connection-matrix',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'delay_matrix' },
    transform: {
      id: 'synapseCollectionToDelayMatrixParams',
      rawFields: ['source|sources', 'target|targets', 'delay|delays'],
      requiredOptions: ['sourceIds', 'targetIds', 'snapshotTimeMs', 'snapshotScope', "delayUnits='ms'", 'aggregation'],
      outputSkill: 'nest.delay_matrix',
    },
    requiredInputKeys: [
      'source_ids', 'target_ids', 'cells', 'delay_units', 'aggregation',
      'axis_order', 'absent_cell', 'sample_policy', 'connection_count',
      'snapshot_time_ms', 'snapshot_scope',
    ],
    paramsSchema: DelayMatrixParamsSchema,
    requiredProvenanceKeys: [
      'source_ids', 'target_ids', 'synapse_model', 'delay_units',
      'connection_sample_policy', 'snapshot_time_ms', 'snapshot_scope',
      'parallel_edge_policy', 'matrix_axis_order', 'matrix_aggregation',
    ],
    provenanceParamConstraints: [
      { kind: 'equals_param', provenanceKey: 'delay_units', paramKey: 'delay_units', description: 'Delay units must match params.' },
      { kind: 'equals_param', provenanceKey: 'connection_sample_policy', paramKey: 'sample_policy', description: 'Only complete connection snapshots may form a literal matrix.' },
      { kind: 'equals_param', provenanceKey: 'snapshot_time_ms', paramKey: 'snapshot_time_ms', description: 'Snapshot time must match params.' },
      { kind: 'equals_param_path', provenanceKey: 'snapshot_scope', paramPath: 'snapshot_scope.kind', description: 'Snapshot scope must match params.' },
      { kind: 'equals_literal', provenanceKey: 'parallel_edge_policy', value: 'preserved_as_connection_count', description: 'Parallel connections remain auditable via connection_count.' },
      { kind: 'equals_param', provenanceKey: 'matrix_axis_order', paramKey: 'axis_order', description: 'Matrix axis order must match params.' },
      { kind: 'equals_param', provenanceKey: 'matrix_aggregation', paramKey: 'aggregation', description: 'Delay aggregation must match params.' },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [{
      nestExample: 'SynapseCollection delay inspection',
      sourceUrl: 'https://nest-simulator.readthedocs.io/en/stable/synapses/synapse_specification.html#inspecting-connections',
      dataShape: 'ordered node axes plus sparse positive delay cells and multapse counts',
      output: 'Millisecond delay heatmap',
      note: 'Parallel-delay aggregation is always explicit.',
    }],
  },
  'nest.in_degree_distribution': {
    id: 'nest.in_degree_distribution',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST in-degree distribution renderer',
    description: 'Render the measured incoming-edge distribution over the complete declared target universe.',
    deviceFamily: 'get_connections',
    scene: 'degree-distribution',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'in_degree_distribution' },
    transform: {
      id: 'synapseCollectionToInDegreeDistributionParams',
      rawFields: ['source|sources', 'target|targets'],
      requiredOptions: ['sourceIds', 'targetIds', 'snapshotTimeMs', 'snapshotScope', 'normalization'],
      outputSkill: 'nest.in_degree_distribution',
    },
    requiredInputKeys: [
      'degrees', 'node_counts', 'values', 'node_count', 'connection_count',
      'direction', 'normalization', 'value_units', 'edge_counting',
      'zero_degree_policy', 'sample_policy', 'snapshot_time_ms', 'snapshot_scope',
    ],
    paramsSchema: InDegreeDistributionParamsSchema,
    requiredProvenanceKeys: [
      'source_ids', 'target_ids', 'synapse_model', 'connection_sample_policy',
      'snapshot_time_ms', 'snapshot_scope', 'parallel_edge_policy',
      'degree_direction', 'degree_counting', 'zero_degree_policy',
      'histogram_normalization',
    ],
    provenanceParamConstraints: [
      { kind: 'equals_param', provenanceKey: 'connection_sample_policy', paramKey: 'sample_policy', description: 'Degree input must be complete for its declared scope.' },
      { kind: 'equals_param', provenanceKey: 'snapshot_time_ms', paramKey: 'snapshot_time_ms', description: 'Snapshot time must match params.' },
      { kind: 'equals_param_path', provenanceKey: 'snapshot_scope', paramPath: 'snapshot_scope.kind', description: 'Snapshot scope must match params.' },
      { kind: 'equals_literal', provenanceKey: 'parallel_edge_policy', value: 'count_each_connection', description: 'Every multapse contributes one degree edge.' },
      { kind: 'equals_param', provenanceKey: 'degree_direction', paramKey: 'direction', description: 'Degree direction must match params.' },
      { kind: 'equals_param', provenanceKey: 'degree_counting', paramKey: 'edge_counting', description: 'Degree counting must match params.' },
      { kind: 'equals_param', provenanceKey: 'zero_degree_policy', paramKey: 'zero_degree_policy', description: 'Zero-degree policy must match params.' },
      { kind: 'equals_param', provenanceKey: 'histogram_normalization', paramKey: 'normalization', description: 'Degree normalization must match params.' },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [{
      nestExample: 'Directed connectivity degree concepts',
      sourceUrl: 'https://nest-simulator.readthedocs.io/en/stable/synapses/connectivity_concepts.html',
      dataShape: 'contiguous degree bins, exact node counts, and explicit zero-degree inclusion',
      output: 'In-degree count or probability distribution',
      note: 'Each SynapseCollection entry counts, including multapses.',
    }],
  },
  'nest.out_degree_distribution': {
    id: 'nest.out_degree_distribution',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST out-degree distribution renderer',
    description: 'Render the measured outgoing-edge distribution over the complete declared source universe.',
    deviceFamily: 'get_connections',
    scene: 'degree-distribution',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'out_degree_distribution' },
    transform: {
      id: 'synapseCollectionToOutDegreeDistributionParams',
      rawFields: ['source|sources', 'target|targets'],
      requiredOptions: ['sourceIds', 'targetIds', 'snapshotTimeMs', 'snapshotScope (not target-rank-local)', 'normalization'],
      outputSkill: 'nest.out_degree_distribution',
    },
    requiredInputKeys: [
      'degrees', 'node_counts', 'values', 'node_count', 'connection_count',
      'direction', 'normalization', 'value_units', 'edge_counting',
      'zero_degree_policy', 'sample_policy', 'snapshot_time_ms', 'snapshot_scope',
    ],
    paramsSchema: OutDegreeDistributionParamsSchema,
    requiredProvenanceKeys: [
      'source_ids', 'target_ids', 'synapse_model', 'connection_sample_policy',
      'snapshot_time_ms', 'snapshot_scope', 'parallel_edge_policy',
      'degree_direction', 'degree_counting', 'zero_degree_policy',
      'histogram_normalization',
    ],
    provenanceParamConstraints: [
      { kind: 'equals_param', provenanceKey: 'connection_sample_policy', paramKey: 'sample_policy', description: 'Degree input must be complete for its declared scope.' },
      { kind: 'equals_param', provenanceKey: 'snapshot_time_ms', paramKey: 'snapshot_time_ms', description: 'Snapshot time must match params.' },
      { kind: 'equals_param_path', provenanceKey: 'snapshot_scope', paramPath: 'snapshot_scope.kind', description: 'Snapshot scope must match params.' },
      { kind: 'equals_literal', provenanceKey: 'parallel_edge_policy', value: 'count_each_connection', description: 'Every multapse contributes one degree edge.' },
      { kind: 'equals_param', provenanceKey: 'degree_direction', paramKey: 'direction', description: 'Degree direction must match params.' },
      { kind: 'equals_param', provenanceKey: 'degree_counting', paramKey: 'edge_counting', description: 'Degree counting must match params.' },
      { kind: 'equals_param', provenanceKey: 'zero_degree_policy', paramKey: 'zero_degree_policy', description: 'Zero-degree policy must match params.' },
      { kind: 'equals_param', provenanceKey: 'histogram_normalization', paramKey: 'normalization', description: 'Degree normalization must match params.' },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [{
      nestExample: 'Directed connectivity degree concepts',
      sourceUrl: 'https://nest-simulator.readthedocs.io/en/stable/synapses/connectivity_concepts.html',
      dataShape: 'contiguous degree bins, exact node counts, and explicit zero-degree inclusion',
      output: 'Out-degree count or probability distribution',
      note: 'Target-rank-local GetConnections evidence is rejected for out-degree.',
    }],
  },
  'nest.delay_distribution': {
    id: 'nest.delay_distribution',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST synaptic-delay distribution renderer',
    description: 'Render exact half-open bins over one delay value per selected connection.',
    deviceFamily: 'get_connections',
    scene: 'delay-distribution',
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: 'delay_distribution' },
    transform: {
      id: 'synapseCollectionToDelayDistributionParams',
      rawFields: ['source|sources', 'target|targets', 'delay|delays'],
      requiredOptions: [
        'sourceIds', 'targetIds', 'snapshotTimeMs', 'snapshotScope',
        "delayUnits='ms'", 'binWidthMs', 'windowStartMs', 'windowStopMs', 'normalization',
      ],
      outputSkill: 'nest.delay_distribution',
    },
    requiredInputKeys: [
      'bin_centers_ms', 'delay_counts', 'values', 'bin_width_ms',
      'window_start_ms', 'window_stop_ms', 'normalization', 'value_units',
      'delay_units', 'aggregation', 'binning', 'sample_policy',
      'connection_count', 'snapshot_time_ms', 'snapshot_scope',
    ],
    paramsSchema: DelayDistributionParamsSchema,
    requiredProvenanceKeys: [
      'source_ids', 'target_ids', 'synapse_model', 'delay_units',
      'connection_sample_policy', 'snapshot_time_ms', 'snapshot_scope',
      'parallel_edge_policy', 'bin_ms', 'histogram_normalization', 'binning_policy',
    ],
    provenanceParamConstraints: [
      { kind: 'equals_param', provenanceKey: 'delay_units', paramKey: 'delay_units', description: 'Delay units must match params.' },
      { kind: 'equals_param', provenanceKey: 'connection_sample_policy', paramKey: 'sample_policy', description: 'Delay histogram input must be complete for its scope.' },
      { kind: 'equals_param', provenanceKey: 'snapshot_time_ms', paramKey: 'snapshot_time_ms', description: 'Snapshot time must match params.' },
      { kind: 'equals_param_path', provenanceKey: 'snapshot_scope', paramPath: 'snapshot_scope.kind', description: 'Snapshot scope must match params.' },
      { kind: 'equals_literal', provenanceKey: 'parallel_edge_policy', value: 'count_each_connection', description: 'Every selected connection contributes one delay.' },
      { kind: 'equals_param', provenanceKey: 'bin_ms', paramKey: 'bin_width_ms', description: 'Delay bin width must match params.' },
      { kind: 'equals_param', provenanceKey: 'histogram_normalization', paramKey: 'normalization', description: 'Delay normalization must match params.' },
      { kind: 'equals_param', provenanceKey: 'binning_policy', paramKey: 'binning', description: 'Delay binning policy must match params.' },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [{
      nestExample: 'SynapseCollection delay inspection',
      sourceUrl: 'https://nest-simulator.readthedocs.io/en/stable/synapses/synapse_specification.html#inspecting-connections',
      dataShape: 'one positive millisecond delay per selected connection in exact uniform bins',
      output: 'Delay count, probability, or probability-density histogram',
      note: 'Out-of-window delays are transform errors, never silently discarded.',
    }],
  },
  'nest.weight_histogram': {
    id: 'nest.weight_histogram',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST connection-weight histogram renderer',
    description:
      'Render the measured weight distribution of a declared GetConnections snapshot.',
    deviceFamily: 'get_connections',
    scene: 'weight-histogram',
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: 'weight_distribution',
    },
    requiredInputKeys: [
      'bin_centers',
      'values',
      'bin_width',
      'weight_units',
      'normalization',
      'value_units',
      'snapshot_time_ms',
    ],
    paramsSchema: WeightHistogramParamsSchema,
    requiredProvenanceKeys: [
      'source_ids',
      'target_ids',
      'synapse_model',
      'weight_units',
      'histogram_normalization',
      'connection_sample_policy',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'weight_units',
        paramKey: 'weight_units',
        description: 'Declared weight units must match params.weight_units.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'histogram_normalization',
        paramKey: 'normalization',
        description: 'Declared histogram normalization must match params.normalization.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'Plot weight matrices example / SynapseCollection snapshot',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html',
        dataShape: 'binned GetConnections weights at one declared simulation time',
        output: 'Connection-weight count or probability histogram',
        note: 'Use a GetConnections snapshot; weight_recorder events are update-event samples and bias distributions.',
      },
    ],
  },
  'nest.spatial_2d': {
    id: 'nest.spatial_2d',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST 2D spatial renderer',
    description: 'Render 2D layer positions, masks, kernels and sampled projections.',
    deviceFamily: 'get_position',
    scene: null, // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    deprecation: {
      since: '1.6.0',
      replacement: 'nest.spatial_map_2d',
      message: 'Legacy host-only coordinate list; use nest.spatial_map_2d for identified nodes and explicit layer/MPI semantics.',
    },
    routerEligibility: { bareFamilyCandidate: false },
    requiredInputKeys: ['positions', 'coordinate_units'],
    paramsSchema: Spatial2DParamsSchema,
    requiredProvenanceKeys: ['extent', 'spatial_units', 'mask', 'kernel'],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'spatial_units',
        paramKey: 'coordinate_units',
        description: 'Declared spatial units must match the coordinate axis units.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Circular mask, Gaussian kernel, grid/free spatial examples',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/connex.html',
        dataShape: 'node x/y positions, masks, kernels, sampled edges',
        output: 'No Cortexel scene yet — route to a 2D d3 map on the host.',
        note: 'scene:null — render via host d3, not a Cortexel 3D scene.',
      },
    ],
  },
  'nest.spatial_map_2d': {
    id: 'nest.spatial_map_2d',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST measured 2D spatial map renderer',
    description:
      'Render identified 2D GetPosition coordinates inside the declared layer extent with explicit periodic-boundary and MPI completeness semantics.',
    deviceFamily: 'get_position',
    scene: 'spatial-map-2d',
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: 'positions_2d',
    },
    transform: {
      id: 'getPositionToSpatialMap2DParams',
      rawFields: ['positions', 'node_ids?'],
      requiredOptions: [
        'nodeIds',
        'coordinateUnits',
        'extent',
        'center',
        'edgeWrap',
        'positionScope',
      ],
      outputSkill: 'nest.spatial_map_2d',
    },
    requiredInputKeys: [
      'nodes',
      'coordinate_units',
      'extent',
      'center',
      'edge_wrap',
      'position_scope',
      'marker_size',
    ],
    paramsSchema: SpatialMap2DParamsSchema,
    requiredProvenanceKeys: [
      'node_ids',
      'spatial_units',
      'extent',
      'position_scope',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'spatial_units',
        paramKey: 'coordinate_units',
        description: 'Declared spatial units must match params.coordinate_units.',
      },
      {
        kind: 'equals_param_path',
        provenanceKey: 'position_scope',
        paramPath: 'position_scope.kind',
        description: 'Declared position scope must match params.position_scope.kind.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [{
      nestExample: 'Spatial layer and GetPosition',
      sourceUrl: 'https://nest-simulator.readthedocs.io/en/stable/ref_material/pynest_api/nest.lib.hl_api_spatial.html#nest.lib.hl_api_spatial.GetPosition',
      dataShape: 'identified x/y coordinates plus layer extent, center, edge-wrap, units, and completeness scope',
      output: 'Equal-aspect measured spatial node map',
      note: 'Masks and probability kernels are separate analyses and are not invented from GetPosition.',
    }],
  },
  'nest.spatial_3d': {
    id: 'nest.spatial_3d',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST 3D spatial renderer',
    description: 'Render 3D population/node positions for spatial inspection.',
    deviceFamily: 'get_position',
    scene: 'network-topology',
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: 'positions_3d',
    },
    requiredInputKeys: ['objects', 'coordinate_units'],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ['extent', 'spatial_units', 'projection_sample_policy'],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'spatial_units',
        paramKey: 'coordinate_units',
        description: 'Declared spatial units must match the coordinate axis units.',
      },
    ],
    rendererRoutes: [
      'media.webgl_scene',
      'media.react_fiber_scene',
      'three',
      'fiber',
    ],
    examples: [
      {
        nestExample: '3D spatial network with exponential/Gaussian probabilities',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/test_3d.html',
        dataShape: 'node x/y/z positions, extent, sampled edges',
        output: 'Unit-labelled 3D positioned-node scene for host rendering',
        note: 'Use 3D as inspection aid; do not imply biological geometry.',
      },
    ],
  },
  'nest.plasticity_dynamics': {
    id: 'nest.plasticity_dynamics',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST plasticity dynamics renderer',
    description: 'Render recorded synaptic-weight samples over time.',
    deviceFamily: 'weight_recorder',
    scene: 'stdp',
    requiredInputKeys: ['times_ms', 'weights', 'weight_units'],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ['synapse_model', 'weight_units'],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'weight_units',
        paramKey: 'weight_units',
        description: 'Declared weight units must match the rendered weight axis.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib'],
    examples: [
      {
        nestExample: 'Urbanczik-Senn / Clopath / Tsodyks short-term plasticity',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/urbanczik_synapse_example.html',
        dataShape: 'weight-recorder times_ms and weights in one declared unit',
        output: 'Measured synaptic-weight trace over time',
        note: 'This contract does not contain an STDP window or pre/post spike protocol; do not invent either.',
      },
    ],
  },
  'nest.phase_plane': {
    id: 'nest.phase_plane',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST phase-plane renderer',
    description: 'Render a checked Cartesian phase-plane vector field.',
    deviceFamily: 'computed',
    scene: 'phase-plane',
    requiredInputKeys: [
      'grid',
      'derivatives',
      'axis_units',
      'derivative_units',
      'axis_order',
      'flattening',
    ],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: [
      'state_variables',
      'derivation_method',
      'model_context',
      'fixed_parameters',
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Numerical phase-plane analysis of the Hodgkin-Huxley neuron',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/hh_phaseplane.html',
        dataShape: 'state-variable axes plus flattened derivative arrays and explicit ordering',
        output: 'Unit-labelled phase-plane vector field',
        note: 'No nullcline, trajectory, or equilibrium is present in this contract; do not invent one.',
      },
    ],
  },
  'nest.correlogram': {
    id: 'nest.correlogram',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST correlogram / synchrony renderer',
    description:
      'Render a symmetric correlation_detector lag histogram with explicit pair orientation, interval policy, counting window, zero-lag handling, and statistic semantics.',
    deviceFamily: 'correlation_detector',
    scene: 'correlogram',
    requiredInputKeys: [
      'lags_ms',
      'values',
      'bin_width_ms',
      'tau_max_ms',
      'counting_start_ms',
      'counting_stop_ms',
      'pair',
      'lag_convention',
      'binning',
      'zero_lag_policy',
      'statistic',
    ],
    paramsSchema: CorrelogramParamsSchema,
    requiredProvenanceKeys: [
      'detector_id',
      'reference_population',
      'target_population',
      'bin_ms',
      'correlation_normalization',
      'correlation_units',
      'lag_convention',
      'binning_policy',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'bin_ms',
        paramKey: 'bin_width_ms',
        description: 'Declared bin width must match params.bin_width_ms.',
      },
      {
        kind: 'equals_param_path',
        provenanceKey: 'reference_population',
        paramPath: 'pair.reference_label',
        description: 'Declared reference population must match params.pair.reference_label.',
      },
      {
        kind: 'equals_param_path',
        provenanceKey: 'target_population',
        paramPath: 'pair.target_label',
        description: 'Declared target population must match params.pair.target_label.',
      },
      {
        kind: 'equals_param_path',
        provenanceKey: 'correlation_normalization',
        paramPath: 'statistic.kind',
        description: 'Declared normalization/statistic must match params.statistic.kind.',
      },
      {
        kind: 'equals_param_path',
        provenanceKey: 'correlation_units',
        paramPath: 'statistic.units',
        description: 'Declared value units must match params.statistic.units.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'lag_convention',
        paramKey: 'lag_convention',
        description: 'Declared lag convention must match params.lag_convention.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'binning_policy',
        paramKey: 'binning',
        description: 'Declared bin interval policy must match params.binning.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'Auto- and crosscorrelation functions for spike trains',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/cross_check_mip_corrdet.html',
        dataShape: 'symmetric lag centers, values, bin/tau/counting-window semantics, oriented population pair, and discriminated statistic',
        output: 'Canonical correlogram distinct from ISI and other time histograms',
        note: 'Positive lag means the target population spikes after the reference population; never infer orientation from a display label.',
      },
    ],
  },
  'nest.stimulus_response': {
    id: 'nest.stimulus_response',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST stimulus-response protocol renderer',
    description:
      'Render aligned stimulus waveforms, responses, spikes and protocol epochs.',
    deviceFamily: 'multimeter',
    scene: null, // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ['times_ms', 'stimulus', 'response'],
    paramsSchema: StimulusResponseParamsSchema,
    requiredProvenanceKeys: ['stim_units', 'units', 'time_units'],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'The times_ms axis is expressed in milliseconds.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib'],
    examples: [
      {
        nestExample: 'Sinusoidal generator / pulse packet / repeated stimulation',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/pulsepacket.html',
        dataShape: 'stimulus waveform, analog response, spike events, epochs',
        output: 'Composite protocol panels — host-composed, no single scene.',
        note: 'scene:null — multi-panel protocol composed by the host.',
      },
    ],
  },
  'nest.astrocyte_dynamics': {
    id: 'nest.astrocyte_dynamics',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST astrocyte Ca²⁺/IP₃ dynamics renderer',
    description: 'Render tripartite-synapse calcium/IP3 state-variable traces.',
    deviceFamily: 'multimeter',
    scene: 'voltage-trace',
    weak: true, // analog-trace reuse: Ca/IP3 are not membrane voltage
    weakDisclosure:
      "Derived view — Ca²⁺/IP₃ shown through the analog-trace scene; these are glial signals, not membrane voltage.",
    requiredInputKeys: ['times_ms', 'ca_trace', 'units'],
    paramsSchema: AstrocyteParamsSchema,
    requiredProvenanceKeys: [
      'recorded_variable',
      'units',
      'time_units',
      'sampling_interval',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'units',
        paramKey: 'units',
        description: 'Declared units must match the rendered glial trace units.',
      },
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'The times_ms axis is expressed in milliseconds.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib'],
    examples: [
      {
        nestExample: 'Single astrocyte / tripartite interaction examples',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/astrocytes/astrocyte_single.html',
        dataShape: 'Ca/IP3/state variables, linked neuron events',
        output: 'Calcium/IP3 traces via the analog-trace scene (flagged derived)',
        note: 'weak:true — keep glial and neuronal units explicitly separate.',
      },
    ],
  },
  'nest.compartmental_dynamics': {
    id: 'nest.compartmental_dynamics',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST compartmental morphology + dynamics renderer',
    description:
      'Render multi-compartment morphologies, receptor ports and soma/dendrite traces.',
    deviceFamily: 'multimeter',
    scene: null, // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ['times_ms', 'compartments'],
    paramsSchema: CompartmentalParamsSchema,
    requiredProvenanceKeys: [
      'morphology_disclaimer',
      'recorded_variable',
      'units',
      'time_units',
      'sampling_interval',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'The times_ms axis is expressed in milliseconds.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Receptors/current and two-compartment neuron examples',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/compartmental_model/receptors_and_current.html',
        dataShape: 'compartments, receptor ports, soma/dendrite traces',
        output: 'No Cortexel scene — host d3 morphology tree with linked traces.',
        note: 'scene:null — do not invent morphology geometry from labels.',
      },
    ],
  },
  'nest.animation_replay': {
    id: 'nest.animation_replay',
    version: CORTEXEL_SKILL_VERSION,
    title: 'NEST state replay / animation storyboard renderer',
    description: 'Render time-evolution storyboards and inspectable state replays.',
    deviceFamily: 'computed',
    scene: null, // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ['frames'],
    paramsSchema: AnimationReplayParamsSchema,
    requiredProvenanceKeys: ['frame_rate'],
    rendererRoutes: ['media.manim_storyboard', 'manim'],
    examples: [
      {
        nestExample: 'Sudoku progress GIF / Pong replay',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/sudoku/plot_progress.html',
        dataShape: 'frames, entities, metrics, frame rate, annotations',
        output: 'Manim storyboard / source — no live Cortexel scene.',
        note: 'scene:null — offline storyboard, not a real-time render target.',
      },
    ],
  },
  'corpus.knowledge_graph': {
    id: 'corpus.knowledge_graph',
    version: CORTEXEL_SKILL_VERSION,
    title: 'Corpus knowledge-graph 3D renderer',
    description:
      'Render a bounded, traceable cross-paper entity multigraph: paper/model/family nodes plus identified citation, instantiation, family and advisory identity assertions. Every element carries typed source evidence; every numeric score is discriminated and explicitly uncalibrated.',
    deviceFamily: 'corpus',
    scene: 'knowledge-graph-3d',
    // weak: identity edges are advisory structural similarity, NOT certified
    // sameness, and force-layout geometry is algorithmic rather than evidence.
    // This is NOT scene reuse — knowledge-graph-3d is the native scene — so the
    // disclosure is about DATA semantics, not fidelity of the renderer.
    weak: true,
    weakDisclosure:
      'Advisory graph — every corpus-entity assertion is derived; same_as/variant_of edges are structural similarity, not certified sameness; force-layout positions and distances are schematic, not quantitative evidence.',
    requiredInputKeys: [
      'graph_id',
      'graph_source',
      'graph_snapshot_id',
      'graph_scope',
      'generated_at',
      'nodes',
      'edges',
    ],
    paramsSchema: KnowledgeGraph3DParamsSchema,
    requiredProvenanceKeys: [
      'graph_source',
      'graph_snapshot_id',
      'graph_scope',
      'identity_advisory',
    ],
    requiredProvenanceFlags: {
      advisory_only: true,
      is_paper_local_evidence: false,
    },
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'graph_source',
        paramKey: 'graph_source',
        description: 'The declared graph source must match params.graph_source.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'graph_snapshot_id',
        paramKey: 'graph_snapshot_id',
        description: 'The declared immutable snapshot must match params.graph_snapshot_id.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'graph_scope',
        paramKey: 'graph_scope',
        description: 'The declared graph scope must match params.graph_scope.',
      },
      {
        kind: 'equals_literal',
        provenanceKey: 'identity_advisory',
        value: true,
        description: 'Corpus identity and genealogy assertions are always advisory.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'fiber'],
    examples: [
      {
        nestExample: 'Cross-paper corpus knowledge graph (papers + models + families)',
        sourceUrl:
          'https://github.com/sepahead/Paper2Brain#knowledge-graph',
        dataShape: 'snapshot-bound paper/model/family nodes and stable-id multigraph edges, each with typed evidence, bounded attributes, derived/advisory epistemic status and optional uncalibrated scores',
        output: 'Traceable 3D force-directed multigraph with citation-flow particles and accessible evidence detail',
        note: '1.4 contract: every assertion is traceable; identity edges are advisory and force-layout geometry is non-evidentiary.',
      },
    ],
  },
};

export const PARAM_VALIDATION_CONSTRAINTS: Readonly<
  Partial<Record<NestSkillId, readonly ParamValidationConstraint[]>>
> = {
  'nest.voltage_trace': [
    {
      kind: 'equal_length',
      paths: ['series', 'series_labels'],
      description: 'Every trace series must have one non-empty label.',
    },
    {
      kind: 'each_length_matches',
      paths: ['series[*]', 'times_ms'],
      description: 'Every trace series must contain one value per times_ms sample.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Trace timestamps must be monotonically non-decreasing.',
    },
  ],
  'nest.spike_raster': [
    {
      kind: 'equal_length',
      paths: ['times_ms', 'senders'],
      description: 'Every spike timestamp must have one sender id.',
    },
  ],
  'nest.isi_distribution': [
    {
      kind: 'equal_length',
      paths: ['bin_centers_ms', 'values'],
      description: 'Every ISI histogram bin center must have one value.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['bin_centers_ms'],
      description: 'ISI bin centers must be monotonically non-decreasing.',
    },
    {
      kind: 'uniform_histogram_bins',
      paths: ['bin_centers_ms', 'bin_width_ms'],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      nonNegativeLowerEdge: true,
      description: 'ISI bins must be strictly increasing, uniformly spaced by bin_width_ms, and have a non-negative lower edge.',
    },
    {
      kind: 'non_negative',
      paths: ['bin_centers_ms[*]', 'values[*]'],
      description: 'ISI bin centers and histogram values cannot be negative.',
    },
    {
      kind: 'mapped_value',
      paths: ['normalization', 'value_units'],
      allowedValues: {
        count: 'count',
        probability: 'probability',
        probability_density: '1/ms',
      },
      description: 'Each ISI normalization has one unambiguous value unit.',
    },
    {
      kind: 'conditional_numeric_domain',
      paths: ['normalization', 'values[*]'],
      numericDomains: {
        count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        probability: { min: 0, max: 1 },
        probability_density: { min: 0 },
      },
      description: 'ISI counts are safe integers, probabilities lie in [0,1], and density values are non-negative.',
    },
    {
      kind: 'normalized_histogram_mass',
      paths: ['normalization', 'values', 'bin_width_ms'],
      absoluteTolerance: HISTOGRAM_MASS_TOLERANCE,
      relativeTolerance: HISTOGRAM_MASS_TOLERANCE,
      normalizationRules: {
        probability: { measure: 'sum', target: 1 },
        probability_density: { measure: 'density_integral', target: 1 },
      },
      description: 'ISI probability mass must sum to one and probability density must integrate to one.',
    },
  ],
  'nest.psth': [
    {
      kind: 'equal_length',
      paths: ['bin_centers_ms', 'values'],
      description: 'Every PSTH bin center must have one value.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['bin_centers_ms'],
      description: 'PSTH bin centers must be monotonically non-decreasing.',
    },
    {
      kind: 'uniform_histogram_bins',
      paths: ['bin_centers_ms', 'bin_width_ms'],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      description: 'PSTH bins must be strictly increasing and uniformly spaced by bin_width_ms.',
    },
    {
      kind: 'non_negative',
      paths: ['values[*]'],
      description: 'PSTH values cannot be negative.',
    },
    {
      kind: 'mapped_value',
      paths: ['normalization', 'value_units'],
      allowedValues: {
        count: 'count',
        count_per_trial: 'count/trial',
        rate_hz: 'Hz',
      },
      description: 'Each PSTH normalization has one unambiguous value unit.',
    },
    {
      kind: 'conditional_numeric_domain',
      paths: ['normalization', 'values[*]'],
      numericDomains: {
        count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        count_per_trial: { min: 0 },
        rate_hz: { min: 0 },
      },
      description: 'PSTH counts are safe integers and all normalized values are non-negative.',
    },
    {
      kind: 'psth_derived_counts',
      paths: ['normalization', 'values', 'trial_count', 'bin_width_ms', 'aggregation'],
      absoluteTolerance: PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE,
      description: 'Every displayed PSTH value must recover an integer aggregate spike-event count across the selected senders and trials.',
    },
  ],
  'nest.population_rate': [
    {
      kind: 'each_length_matches',
      paths: ['series[*].spike_counts', 'bin_centers_ms'],
      description: 'Every population spike-count series has one value per shared time bin.',
    },
    {
      kind: 'each_length_matches',
      paths: ['series[*].rates_hz', 'bin_centers_ms'],
      description: 'Every population-rate series has one value per shared time bin.',
    },
    {
      kind: 'unique_field',
      paths: ['series'],
      field: 'id',
      description: 'Population-rate series ids must be unique.',
    },
    {
      kind: 'ordered_interval',
      paths: ['window_start_ms', 'window_stop_ms'],
      description: 'The population-rate counting window must have positive duration.',
    },
    {
      kind: 'uniform_bin_window',
      paths: ['bin_centers_ms', 'bin_width_ms', 'window_start_ms', 'window_stop_ms'],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: 'Uniform left-closed/right-open bins must exactly cover the declared [window_start_ms,window_stop_ms) interval.',
    },
    {
      kind: 'population_rate_derived_values',
      paths: [
        'series',
        'bin_centers_ms',
        'bin_width_ms',
        'normalization',
        'aggregation',
        'binning',
      ],
      absoluteTolerance: POPULATION_RATE_ABSOLUTE_TOLERANCE,
      relativeTolerance: POPULATION_RATE_RELATIVE_TOLERANCE,
      description: 'Every mean-per-recorded-sender rate must be recoverable from its raw integer spike count, sender denominator, and bin width.',
    },
  ],
  'nest.rate_response': [
    {
      kind: 'equal_length',
      paths: ['stimulus_amplitudes', 'rates_hz'],
      description: 'Every stimulus amplitude must have one firing-rate value.',
    },
    {
      kind: 'non_negative',
      paths: ['rates_hz[*]'],
      description: 'Firing rates cannot be negative.',
    },
  ],
  'nest.connectivity_matrix': [
    {
      kind: 'equal_length',
      paths: ['sources', 'targets', 'weights?', 'delays?'],
      description: 'Connection endpoints and optional measurement channels are parallel arrays.',
    },
    {
      kind: 'legacy_connection_channels',
      paths: ['weights?', 'weight_units?', 'delays?', 'delay_units?'],
      description: 'Legacy optional measurement channels remain unit-bound and delays remain strictly positive.',
    },
  ],
  'nest.connection_graph': [
    {
      kind: 'connection_graph_snapshot',
      paths: [
        'nodes',
        'edges',
        'sample_policy',
        'source_connection_count',
        'weight_units?',
        'delay_units?',
        'edge_identity',
      ],
      description: 'Graph identity, endpoint, optional-channel, unit, and sample-count semantics remain auditable.',
    },
    {
      kind: 'scope_compatibility',
      paths: ['snapshot_scope'],
      description: 'Snapshot MPI rank metadata must be internally valid.',
    },
  ],
  'nest.adjacency_matrix': [
    {
      kind: 'matrix_connection_counts',
      paths: ['source_ids', 'target_ids', 'cells', 'connection_count', 'aggregation'],
      description: 'Sparse adjacency cells are unique, in-universe, positive-count entries whose counts recover the snapshot total.',
    },
    {
      kind: 'scope_compatibility',
      paths: ['snapshot_scope'],
      description: 'Snapshot MPI rank metadata must be internally valid.',
    },
  ],
  'nest.weight_matrix': [
    {
      kind: 'matrix_connection_counts',
      paths: ['source_ids', 'target_ids', 'cells', 'connection_count', 'aggregation'],
      description: 'Sparse weight cells are unique, in-universe, positive-count entries whose counts recover the snapshot total.',
    },
    {
      kind: 'scope_compatibility',
      paths: ['snapshot_scope'],
      description: 'Snapshot MPI rank metadata must be internally valid.',
    },
  ],
  'nest.delay_matrix': [
    {
      kind: 'matrix_connection_counts',
      paths: ['source_ids', 'target_ids', 'cells', 'connection_count', 'aggregation'],
      description: 'Sparse delay cells are unique, in-universe, positive-count entries whose counts recover the snapshot total.',
    },
    {
      kind: 'scope_compatibility',
      paths: ['snapshot_scope'],
      description: 'Snapshot MPI rank metadata must be internally valid.',
    },
  ],
  'nest.in_degree_distribution': [
    {
      kind: 'degree_distribution_consistency',
      paths: [
        'degrees', 'node_counts', 'values', 'node_count', 'connection_count',
        'direction', 'normalization', 'value_units', 'edge_counting',
        'zero_degree_policy',
      ],
      absoluteTolerance: 1e-12,
      relativeTolerance: 1e-12,
      description: 'In-degree bins, raw node counts, totals, normalization, and displayed values agree exactly.',
    },
    {
      kind: 'scope_compatibility',
      paths: ['snapshot_scope', 'direction'],
      description: 'In-degree accepts valid complete or target-rank-local snapshot scope.',
    },
  ],
  'nest.out_degree_distribution': [
    {
      kind: 'degree_distribution_consistency',
      paths: [
        'degrees', 'node_counts', 'values', 'node_count', 'connection_count',
        'direction', 'normalization', 'value_units', 'edge_counting',
        'zero_degree_policy',
      ],
      absoluteTolerance: 1e-12,
      relativeTolerance: 1e-12,
      description: 'Out-degree bins, raw node counts, totals, normalization, and displayed values agree exactly.',
    },
    {
      kind: 'scope_compatibility',
      paths: ['snapshot_scope', 'direction'],
      description: 'Out-degree rejects target-rank-local evidence and validates merged-rank metadata.',
    },
  ],
  'nest.delay_distribution': [
    {
      kind: 'uniform_bin_window',
      paths: ['bin_centers_ms', 'bin_width_ms', 'window_start_ms', 'window_stop_ms'],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: 'Uniform left-closed/right-open delay bins exactly cover the declared window.',
    },
    {
      kind: 'delay_distribution_consistency',
      paths: [
        'bin_centers_ms', 'delay_counts', 'values', 'bin_width_ms',
        'connection_count', 'normalization', 'value_units', 'delay_units',
        'aggregation', 'binning',
      ],
      absoluteTolerance: HISTOGRAM_MASS_TOLERANCE,
      relativeTolerance: HISTOGRAM_MASS_TOLERANCE,
      description: 'Raw delay counts, normalization, and displayed values recover one another.',
    },
    {
      kind: 'scope_compatibility',
      paths: ['snapshot_scope'],
      description: 'Snapshot MPI rank metadata must be internally valid.',
    },
  ],
  'nest.spatial_map_2d': [
    {
      kind: 'spatial_extent_bounds',
      paths: ['nodes', 'extent', 'center'],
      absoluteTolerance: 0,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: SPATIAL_BOUNDS_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: 'Every identified 2D node lies within the declared center ± extent/2 bounds.',
    },
    {
      kind: 'scope_compatibility',
      paths: ['position_scope'],
      description: 'Position MPI rank metadata must be internally valid.',
    },
  ],
  'nest.weight_histogram': [
    {
      kind: 'equal_length',
      paths: ['bin_centers', 'values'],
      description: 'Every weight histogram bin center must have one value.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['bin_centers'],
      description: 'Weight histogram bin centers must be monotonically non-decreasing.',
    },
    {
      kind: 'uniform_histogram_bins',
      paths: ['bin_centers', 'bin_width'],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      description: 'Weight histogram bins must be strictly increasing and uniformly spaced by bin_width.',
    },
    {
      kind: 'non_negative',
      paths: ['values[*]'],
      description: 'Weight histogram values cannot be negative.',
    },
    {
      kind: 'mapped_value',
      paths: ['normalization', 'value_units'],
      allowedValues: {
        count: 'count',
        probability: 'probability',
      },
      description: 'Each weight histogram normalization has one unambiguous value unit.',
    },
    {
      kind: 'conditional_numeric_domain',
      paths: ['normalization', 'values[*]'],
      numericDomains: {
        count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        probability: { min: 0, max: 1 },
      },
      description: 'Weight counts are safe integers and probabilities lie in [0,1].',
    },
    {
      kind: 'normalized_histogram_mass',
      paths: ['normalization', 'values', 'bin_width'],
      absoluteTolerance: HISTOGRAM_MASS_TOLERANCE,
      relativeTolerance: HISTOGRAM_MASS_TOLERANCE,
      normalizationRules: {
        probability: { measure: 'sum', target: 1 },
      },
      description: 'Weight-histogram probability mass must sum to one.',
    },
  ],
  'nest.plasticity_dynamics': [
    {
      kind: 'equal_length',
      paths: ['times_ms', 'weights'],
      description: 'Every plasticity timestamp must have one weight value.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Plasticity timestamps must be monotonically non-decreasing.',
    },
  ],
  'nest.phase_plane': [
    {
      kind: 'property_count',
      paths: ['grid'],
      min: 2,
      max: 2,
      description: 'A phase plane has exactly two state-variable axes.',
    },
    {
      kind: 'same_keys',
      paths: ['grid', 'derivatives'],
      description: 'Derivative fields must use the same state-variable names as the grid.',
    },
    {
      kind: 'same_keys',
      paths: ['grid', 'axis_units'],
      description: 'Every phase-plane axis must declare its coordinate units.',
    },
    {
      kind: 'same_keys',
      paths: ['grid', 'derivative_units'],
      description: 'Every phase-plane derivative field must declare its units.',
    },
    {
      kind: 'cartesian_product_length',
      paths: ['grid.*', 'derivatives.*'],
      description: 'Each derivative field has one value per Cartesian grid point.',
    },
    {
      kind: 'permutation_of_keys',
      paths: ['axis_order', 'grid'],
      description: 'axis_order must contain every grid key exactly once, in flattening order.',
    },
  ],
  'nest.correlogram': [
    {
      kind: 'equal_length',
      paths: ['lags_ms', 'values'],
      description: 'Every lag must have one correlogram value.',
    },
    {
      kind: 'symmetric_lag_axis',
      paths: ['lags_ms', 'bin_width_ms', 'tau_max_ms'],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      description: 'Correlogram lag centers must be strictly increasing, uniform, odd, zero-centered, symmetric, and span [-tau_max_ms,+tau_max_ms].',
    },
    {
      kind: 'ordered_interval',
      paths: ['counting_start_ms', 'counting_stop_ms'],
      description: 'The correlogram counting window must have positive duration.',
    },
    {
      kind: 'conditional_numeric_domain',
      paths: ['statistic.kind', 'values[*]'],
      numericDomains: {
        raw_pair_count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        weighted_pair_sum: { min: -3.4028234663852886e38, max: 3.4028234663852886e38 },
        pair_rate_hz: { min: 0, max: 3.4028234663852886e38 },
        pearson_coefficient: { min: -1, max: 1 },
      },
      description: 'Correlogram values must obey the numeric domain implied by their discriminated statistic.',
    },
  ],
  'nest.stimulus_response': [
    {
      kind: 'equal_length',
      paths: ['times_ms', 'stimulus', 'response'],
      description: 'Time, stimulus, and response samples must align one-to-one.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Stimulus-response timestamps must be monotonically non-decreasing.',
    },
  ],
  'nest.astrocyte_dynamics': [
    {
      kind: 'equal_length',
      paths: ['times_ms', 'ca_trace'],
      description: 'Every glial sample must have one timestamp.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Glial timestamps must be monotonically non-decreasing.',
    },
    {
      kind: 'non_negative',
      paths: ['ca_trace[*]'],
      description: 'The declared Ca²⁺ concentration trace cannot be negative.',
    },
  ],
  'nest.compartmental_dynamics': [
    {
      kind: 'each_length_matches',
      paths: ['compartments[*].values', 'times_ms'],
      description: 'Every compartment trace has one value per timestamp.',
    },
    {
      kind: 'unique_field',
      paths: ['compartments'],
      field: 'id',
      description: 'Compartment ids must be unique.',
    },
    {
      kind: 'references_exist',
      paths: ['compartments[*].parent_id', 'compartments[*].id'],
      description: 'Every non-null parent id must reference a declared compartment.',
    },
    {
      kind: 'acyclic',
      paths: ['compartments[*].id', 'compartments[*].parent_id'],
      description: 'The compartment parent graph must be acyclic.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Compartment timestamps must be monotonically non-decreasing.',
    },
  ],
  'nest.animation_replay': [
    {
      kind: 'monotonic_non_decreasing',
      paths: ['frames[*].time_ms'],
      description: 'Replay frame timestamps must be monotonically non-decreasing.',
    },
    {
      kind: 'property_count',
      paths: ['frames[*].state'],
      min: 1,
      description: 'Every replay frame state must contain at least one field.',
    },
  ],
  'corpus.knowledge_graph': [
    {
      kind: 'unique_field',
      paths: ['nodes'],
      field: 'id',
      description: 'Node ids must be unique.',
    },
    {
      kind: 'unique_field',
      paths: ['edges'],
      field: 'id',
      description: 'Edge assertion ids must be unique; parallel assertions remain distinct by id.',
    },
    {
      kind: 'max_parallel_edges',
      paths: ['edges'],
      max: KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair,
      description: 'At most nine identified assertions may connect one unordered node pair.',
    },
    {
      kind: 'references_exist',
      paths: ['edges[*].source', 'edges[*].target', 'nodes[*].id'],
      description: 'Every edge endpoint must reference a declared node id.',
    },
    {
      kind: 'no_self_loops',
      paths: ['edges[*].source', 'edges[*].target'],
      description: 'Self-loop edges are not renderable by this scene.',
    },
    {
      kind: 'property_count',
      paths: ['nodes[*].attributes'],
      max: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
      description: 'Node attribute maps are bounded.',
    },
    {
      kind: 'property_count',
      paths: ['edges[*].attributes'],
      max: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
      description: 'Edge attribute maps are bounded.',
    },
    {
      kind: 'each_unique_field',
      paths: ['nodes[*].evidence'],
      field: 'evidence_id',
      description: 'Evidence ids must be unique within each node evidence bundle.',
    },
    {
      kind: 'each_contains_field_value',
      paths: ['nodes[*].evidence'],
      field: 'kind',
      allowedFieldValues: [
        'graph_snapshot_record',
        'citation',
        'external_source',
      ],
      description: 'Every node evidence bundle must contain a direct source anchor; graph_node references may only supplement it.',
    },
    {
      kind: 'each_unique_field',
      paths: ['edges[*].evidence'],
      field: 'evidence_id',
      description: 'Evidence ids must be unique within each edge evidence bundle.',
    },
    {
      kind: 'each_contains_field_value',
      paths: ['edges[*].evidence'],
      field: 'kind',
      allowedFieldValues: [
        'graph_snapshot_record',
        'citation',
        'external_source',
      ],
      description: 'Every edge evidence bundle must contain a direct source anchor; graph_node references may only supplement it.',
    },
    {
      kind: 'references_exist',
      paths: ['nodes[*].evidence[*].node_id?', 'nodes[*].id'],
      description: 'Every graph_node evidence reference on a node must resolve.',
    },
    {
      kind: 'references_exist',
      paths: ['edges[*].evidence[*].node_id?', 'nodes[*].id'],
      description: 'Every graph_node evidence reference on an edge must resolve.',
    },
    {
      kind: 'node_score_kind',
      paths: ['nodes'],
      allowedScoreKinds: {
        paper: ['extraction_confidence'],
        model: ['extraction_confidence'],
        family: ['extraction_confidence'],
      },
      description: 'An optional node score may only report extraction confidence; other quantities lack a node-kind context.',
    },
    {
      kind: 'edge_score_kind',
      paths: ['edges'],
      allowedScoreKinds: {
        cites: ['citation_resolution_confidence'],
        same_as: ['structural_similarity'],
        variant_of: ['structural_similarity'],
        instantiates: [],
        belongs_to_family: [],
      },
      description: 'An optional edge score must state the quantity that edge kind actually computes.',
    },
    {
      kind: 'endpoint_kinds',
      paths: ['edges', 'nodes'],
      allowedEndpointKinds: {
        cites: ['paper', 'paper'],
        same_as: ['model', 'model'],
        variant_of: ['model', 'model'],
        instantiates: ['paper', 'model'],
        belongs_to_family: ['model', 'family'],
      },
      description: 'Each semantic edge kind has a fixed source-kind and target-kind contract.',
    },
  ],
};

Object.setPrototypeOf(PARAM_VALIDATION_CONSTRAINTS, null);
for (const constraints of Object.values(PARAM_VALIDATION_CONSTRAINTS)) {
  constraints?.forEach((constraint) => {
    Object.freeze(constraint.paths);
    if (constraint.symmetricKinds) Object.freeze(constraint.symmetricKinds);
    if (constraint.allowedEndpointKinds) {
      Object.values(constraint.allowedEndpointKinds).forEach(Object.freeze);
      Object.freeze(constraint.allowedEndpointKinds);
    }
    if (constraint.allowedValues) Object.freeze(constraint.allowedValues);
    if (constraint.numericDomains) {
      Object.values(constraint.numericDomains).forEach(Object.freeze);
      Object.freeze(constraint.numericDomains);
    }
    if (constraint.normalizationRules) {
      Object.values(constraint.normalizationRules).forEach(Object.freeze);
      Object.freeze(constraint.normalizationRules);
    }
    if (constraint.allowedScoreKinds) {
      Object.values(constraint.allowedScoreKinds).forEach(Object.freeze);
      Object.freeze(constraint.allowedScoreKinds);
    }
    if (constraint.allowedFieldValues) Object.freeze(constraint.allowedFieldValues);
    Object.freeze(constraint);
  });
  if (constraints) Object.freeze(constraints);
}
Object.freeze(PARAM_VALIDATION_CONSTRAINTS);

for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  contract.paramConstraints = PARAM_VALIDATION_CONSTRAINTS[contract.id];
}

/** Neutral alias for the skill registry (the axis is not NEST-only — see
 *  corpus.knowledge_graph). Prefer this in new code. */
export const SKILL_REGISTRY = NEST_SKILL_REGISTRY;

// This registry is a security boundary, not a customization surface. Freeze
// every contract/array and remove Object.prototype from the index so ids such as
// "__proto__" or "constructor" can never resolve to inherited objects.
Object.setPrototypeOf(NEST_SKILL_REGISTRY, null);
for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  Object.freeze(contract.requiredInputKeys);
  Object.freeze(contract.requiredProvenanceKeys);
  if (contract.requiredProvenanceFlags) Object.freeze(contract.requiredProvenanceFlags);
  if (contract.deprecation) Object.freeze(contract.deprecation);
  if (contract.routerEligibility) Object.freeze(contract.routerEligibility);
  if (contract.transform) {
    Object.freeze(contract.transform.rawFields);
    Object.freeze(contract.transform.requiredOptions);
    Object.freeze(contract.transform);
  }
  contract.provenanceParamConstraints?.forEach(Object.freeze);
  if (contract.provenanceParamConstraints) {
    Object.freeze(contract.provenanceParamConstraints);
  }
  Object.freeze(contract.rendererRoutes);
  if (contract.paramConstraints) Object.freeze(contract.paramConstraints);
  contract.examples.forEach(Object.freeze);
  Object.freeze(contract.examples);
  Object.freeze(contract);
}
Object.freeze(NEST_SKILL_REGISTRY);

export function listSkills(): SkillContract[] {
  return Object.values(NEST_SKILL_REGISTRY);
}

export function getSkill(id: unknown): SkillContract | undefined {
  return isSkillId(id) ? NEST_SKILL_REGISTRY[id] : undefined;
}

// Self-describing descriptor an agent fetches to learn how to invoke a skill
// WITHOUT reading TS source: scene, required params/provenance, renderer routes,
// whether the scene reuse is approximate (weak), and a copyable example payload.
export interface SkillDescriptor {
  id: NestSkillId;
  title: string;
  description: string;
  deviceFamily: NestDeviceFamily;
  scene: SceneName | null;
  renderable: boolean;
  weak: boolean;
  weakDisclosure?: string;
  deprecation?: {
    since: string;
    replacement: NestSkillId;
    message: string;
  };
  routerEligibility: {
    bareFamilyCandidate: boolean;
    dataShapeKind?: string;
  };
  transform?: {
    id: string;
    rawFields: string[];
    requiredOptions: string[];
    outputSkill: NestSkillId;
  };
  requiredInputKeys: string[];
  requiredProvenanceKeys: ProvenanceKey[];
  requiredProvenanceFlags: RequiredProvenanceFlags;
  provenanceParamConstraints: ProvenanceParamConstraint[];
  /** Machine-readable JSON Schema for `params` (JSON Schema draft 2020-12),
   *  derived from the skill's zod schema. Agents and non-TS hosts can validate
   *  params locally and generate conformant payloads without reading TS or
   *  reverse-engineering types from the example. Scene-less skills publish a
   *  schema too because their host-renderer payload still needs validation. */
  paramsJsonSchema?: Record<string, unknown>;
  /** Portable rules for cross-field invariants JSON Schema cannot express. */
  paramConstraints: ParamValidationConstraint[];
  rendererRoutes: RendererRoute[];
  examplePayload?:
    | import('../vizSpec').VizSpec
    | import('./hostInvocation').HostRendererInvocation;
  examples: SkillExample[];
}

/** JSON Schema for a skill's params, or undefined when it has no param schema. */
function annotatePortableStringRules(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(annotatePortableStringRules);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const schema = value as Record<string, unknown>;
  if (schema.type === 'string' && typeof schema.maxLength === 'number') {
    schema['x-cortexel-max-utf16-code-units'] = schema.maxLength;
  }
  if (Array.isArray(schema.prefixItems) && schema.items === undefined) {
    // Zod v4 currently emits tuple prefixItems without closing the tuple under
    // draft 2020-12. Without these keywords [] and extra elements validate.
    schema.minItems = schema.prefixItems.length;
    schema.maxItems = schema.prefixItems.length;
    schema.items = false;
  }
  if (
    schema.type === 'string' &&
    typeof schema.minLength === 'number' &&
    schema.minLength >= 1 &&
    schema.pattern === undefined
  ) {
    // Zod's JSON-Schema emitter cannot represent `.trim()`. Every minLength
    // string in the params schemas is trim-normalized; this pattern preserves
    // validation parity even before a host implements the vendor normalization.
    schema.pattern = '\\S';
    schema['x-cortexel-normalize'] = 'trim';
  }
  Object.values(schema).forEach(annotatePortableStringRules);
}

export function toPortableJsonSchema(schemaSource: z.ZodType): Record<string, unknown> {
  // Emit the accepted INPUT contract. Zod output schemas mark defaulted fields
  // required, which would make non-TS validators reject payloads TS accepts.
  const schema = z.toJSONSchema(schemaSource, { io: 'input' }) as Record<string, unknown>;
  annotatePortableStringRules(schema);
  return schema;
}

export function skillParamsJsonSchema(
  c: SkillContract,
): Record<string, unknown> | undefined {
  return c.paramsSchema ? toPortableJsonSchema(c.paramsSchema) : undefined;
}

export function describeSkill(id: unknown): SkillDescriptor | undefined {
  const c = getSkill(id);
  if (!c) return undefined;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    deviceFamily: c.deviceFamily,
    scene: c.scene,
    renderable: c.scene !== null,
    weak: c.weak ?? false,
    weakDisclosure: c.weakDisclosure,
    deprecation: c.deprecation ? { ...c.deprecation } : undefined,
    routerEligibility: {
      bareFamilyCandidate: c.routerEligibility?.bareFamilyCandidate ?? true,
      ...(c.routerEligibility?.dataShapeKind
        ? { dataShapeKind: c.routerEligibility.dataShapeKind }
        : {}),
    },
    transform: c.transform
      ? {
          id: c.transform.id,
          rawFields: [...c.transform.rawFields],
          requiredOptions: [...c.transform.requiredOptions],
          outputSkill: c.transform.outputSkill,
        }
      : undefined,
    requiredInputKeys: [...c.requiredInputKeys],
    requiredProvenanceKeys: [...c.requiredProvenanceKeys],
    requiredProvenanceFlags: { ...(c.requiredProvenanceFlags ?? {}) },
    provenanceParamConstraints: (c.provenanceParamConstraints ?? []).map(
      (constraint) => ({ ...constraint }),
    ),
    paramsJsonSchema: skillParamsJsonSchema(c),
    paramConstraints: (c.paramConstraints ?? []).map((constraint) => ({
      ...constraint,
      paths: [...constraint.paths],
      ...(constraint.symmetricKinds
        ? { symmetricKinds: [...constraint.symmetricKinds] }
        : {}),
      ...(constraint.allowedEndpointKinds
        ? {
            allowedEndpointKinds: Object.fromEntries(
              Object.entries(constraint.allowedEndpointKinds).map(([kind, pair]) => [
                kind,
                [...pair],
              ]),
            ) as Record<string, [string, string]>,
          }
        : {}),
      ...(constraint.normalizationRules
        ? {
            normalizationRules: Object.fromEntries(
              Object.entries(constraint.normalizationRules).map(([mode, rule]) => [
                mode,
                { ...rule },
              ]),
            ),
          }
        : {}),
      ...(constraint.allowedValues
        ? { allowedValues: { ...constraint.allowedValues } }
        : {}),
      ...(constraint.numericDomains
        ? {
            numericDomains: Object.fromEntries(
              Object.entries(constraint.numericDomains).map(([mode, domain]) => [
                mode,
                { ...domain },
              ]),
            ),
          }
        : {}),
      ...(constraint.allowedScoreKinds
        ? {
            allowedScoreKinds: Object.fromEntries(
              Object.entries(constraint.allowedScoreKinds).map(([kind, scoreKinds]) => [
                kind,
                [...scoreKinds],
              ]),
            ),
          }
        : {}),
      ...(constraint.allowedFieldValues
        ? { allowedFieldValues: [...constraint.allowedFieldValues] }
        : {}),
    })),
    rendererRoutes: [...c.rendererRoutes],
    examplePayload:
      getExamplePayload(c.id) ?? getHostRendererExamplePayload(c.id),
    examples: c.examples.map((e) => ({ ...e })),
  };
}

export function describeSkills(): SkillDescriptor[] {
  return listSkills()
    .map((c) => describeSkill(c.id))
    .filter((d): d is SkillDescriptor => d !== undefined);
}
