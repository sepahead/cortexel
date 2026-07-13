export { A as AXIS_COLORS, B as BATLOW_GLSL, C as CATEGORICAL, a as CORTEXEL_PALETTE, b as CORTICAL_LAYER_COLORS, c as ColormapName, O as OKABE_ITO, P as PALETTE_REGISTRY_POLICY, d as PaletteEntry, e as PaletteMetadata, f as PaletteName, g as RGB, h as ReadonlyPaletteMetadata, R as ReadonlySemanticPalette, S as SEMANTIC_PALETTE_KEYS, i as SYNAPSE_COLORS, j as SemanticPalette, T as TURBO_GLSL, V as VIK_GLSL, k as VIRIDIS_GLSL, l as categorical, m as colormapGradient, n as colormapHex, o as colormapRgba, p as colormapSvgStops, q as getPalette, r as getPaletteEntry, s as isRegisteredPalette, t as listPalettes, u as registerPalette, v as sampleColormap, w as validatePalette } from '../colormaps-CZ6XejJa.js';
import { N as NestSkillId, b as NestDeviceFamily, S as SceneName, R as RendererRoute, V as VizSpec, H as HostRendererInvocation, c as HostRendererInvocationResult, d as SkillInvocationResult, a as SkillInvocationError, e as SceneData } from '../hostInvocation-B4xa-O3Q.js';
export { C as CAMERA_PRESETS, f as CONSERVATIVE_PROVENANCE, g as CORTEXEL_JSON_LIMITS, h as CORTEXEL_JSON_POLICY, i as CORTEXEL_SPEC_VERSION, j as CameraPreset, k as CameraPresetName, D as DECLARED_INPUTS_PORTABLE_SCHEMA, E as ENVELOPE_NORMALIZATION_POLICY, l as HONESTY_POLICY, m as HostRendererInvocationSchema, J as JSON_BUDGET_SEMANTICS, n as JSON_PARAMS_PORTABLE_SCHEMA, o as JsonParamsSchema, L as LayerConfig, p as NEST_DEVICE_FAMILIES, q as NEST_SKILL_IDS, r as NUMERIC_MODEL_POLICY, s as NeuralSceneHandle, t as NeuralSceneMode, u as NeuralSceneProps, v as PlaybackState, P as ProvenanceMetadata, w as ProvenanceSchema, x as SCENE_FRAMING, y as SCENE_NAMES, z as SKILL_IDS, A as STDPSynapse, B as STRING_NORMALIZATION_POLICY, F as SceneFraming, G as SkillId, I as SkillParamsResult, K as VALID_RENDERER_ROUTES, M as VIZ_ROUTER_ID, O as VizRouterId, Q as VizSpecSchema, T as VizSpecValidation, U as defaultHonestyCaption, W as isNestSkillId, X as isSkillId, Y as mandatoryDisclosure, Z as requiresHonestyCaption, _ as validateHostRendererInvocation, $ as validateHostRendererSpec, a0 as validateSkillInvocation, a1 as validateSkillParams, a2 as validateVizSpec } from '../hostInvocation-B4xa-O3Q.js';
import { K as KnowledgeGraph3DParams, C as CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS, a as CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS, b as CorrelogramParams, I as IsiDistributionParams, P as PopulationRateParams, c as PsthParams, S as SnapshotScope, d as PositionScope, e as SpatialMap2DParams, A as AdjacencyMatrixParams, f as ConnectionGraphParams, D as DelayDistributionParams, g as DelayMatrixParams, h as InDegreeDistributionParams, O as OutDegreeDistributionParams, W as WeightMatrixParams } from '../params-C6ubJU-Q.js';
export { i as AdjacencyMatrixParamsSchema, j as AnimationReplayParams, k as AnimationReplayParamsSchema, l as AstrocyteParams, m as AstrocyteParamsSchema, n as CompartmentalParams, o as CompartmentalParamsSchema, p as ConnectionGraphParamsSchema, q as CorrelogramParamsSchema, r as DelayDistributionParamsSchema, s as DelayMatrixParamsSchema, G as GEOMETRY_MAX_ROUNDOFF_FRACTION, H as HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE, t as HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE, u as HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS, v as HISTOGRAM_MASS_TOLERANCE, w as InDegreeDistributionParamsSchema, x as IsiDistributionParamsSchema, y as KNOWLEDGE_GRAPH_LIMITS, z as KnowledgeGraph3DParamsSchema, N as NetworkParams, B as NetworkParamsSchema, E as OutDegreeDistributionParamsSchema, F as PARAM_LIMITS, J as POPULATION_RATE_ABSOLUTE_TOLERANCE, L as POPULATION_RATE_RELATIVE_TOLERANCE, M as PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE, Q as PhasePlaneParams, R as PhasePlaneParamsSchema, T as PlasticityParams, U as PlasticityParamsSchema, V as PopulationRateParamsSchema, X as PositionScopeSchema, Y as PsthParamsSchema, Z as RateResponseParams, _ as RateResponseParamsSchema, $ as Rfc3339TimestampSchema, a0 as SPATIAL_BOUNDS_ROUNDOFF_ULPS, a1 as SnapshotScopeSchema, a2 as Spatial2DParams, a3 as Spatial2DParamsSchema, a4 as Spatial3DParams, a5 as Spatial3DParamsSchema, a6 as SpatialMap2DParamsSchema, a7 as SpikeRasterParams, a8 as SpikeRasterParamsSchema, a9 as StimulusResponseParams, aa as StimulusResponseParamsSchema, ab as VoltageTraceParams, ac as VoltageTraceParamsSchema, ad as WeightHistogramParams, ae as WeightHistogramParamsSchema, af as WeightMatrixParamsSchema } from '../params-C6ubJU-Q.js';
import { z } from 'zod';

declare const PROVENANCE_KEYS: readonly ["device_id", "recorded_variable", "units", "sampling_interval", "recorder_id", "sender_ids", "population_labels", "time_units", "source_ids", "target_ids", "synapse_model", "weight_units", "extent", "spatial_units", "mask", "kernel", "projection_sample_policy", "morphology_disclaimer", "frame_rate", "state_variables", "derivation_method", "model_context", "fixed_parameters", "bin_ms", "histogram_normalization", "interval_scope", "event_alignment", "psth_aggregation", "connection_sample_policy", "snapshot_time_ms", "snapshot_scope", "parallel_edge_policy", "matrix_axis_order", "matrix_aggregation", "delay_units", "degree_direction", "degree_counting", "zero_degree_policy", "node_ids", "position_scope", "detector_id", "reference_population", "target_population", "correlation_normalization", "correlation_units", "lag_convention", "binning_policy", "stim_units", "rate_normalization", "graph_source", "graph_snapshot_id", "graph_scope", "identity_advisory"];
type ProvenanceKey = (typeof PROVENANCE_KEYS)[number];
declare const ProvenanceKeyEnum: z.ZodEnum<{
    device_id: "device_id";
    recorded_variable: "recorded_variable";
    units: "units";
    sampling_interval: "sampling_interval";
    recorder_id: "recorder_id";
    sender_ids: "sender_ids";
    population_labels: "population_labels";
    time_units: "time_units";
    source_ids: "source_ids";
    target_ids: "target_ids";
    synapse_model: "synapse_model";
    weight_units: "weight_units";
    extent: "extent";
    spatial_units: "spatial_units";
    mask: "mask";
    kernel: "kernel";
    projection_sample_policy: "projection_sample_policy";
    morphology_disclaimer: "morphology_disclaimer";
    frame_rate: "frame_rate";
    state_variables: "state_variables";
    derivation_method: "derivation_method";
    model_context: "model_context";
    fixed_parameters: "fixed_parameters";
    bin_ms: "bin_ms";
    histogram_normalization: "histogram_normalization";
    interval_scope: "interval_scope";
    event_alignment: "event_alignment";
    psth_aggregation: "psth_aggregation";
    connection_sample_policy: "connection_sample_policy";
    snapshot_time_ms: "snapshot_time_ms";
    snapshot_scope: "snapshot_scope";
    parallel_edge_policy: "parallel_edge_policy";
    matrix_axis_order: "matrix_axis_order";
    matrix_aggregation: "matrix_aggregation";
    delay_units: "delay_units";
    degree_direction: "degree_direction";
    degree_counting: "degree_counting";
    zero_degree_policy: "zero_degree_policy";
    node_ids: "node_ids";
    position_scope: "position_scope";
    detector_id: "detector_id";
    reference_population: "reference_population";
    target_population: "target_population";
    correlation_normalization: "correlation_normalization";
    correlation_units: "correlation_units";
    lag_convention: "lag_convention";
    binning_policy: "binning_policy";
    stim_units: "stim_units";
    rate_normalization: "rate_normalization";
    graph_source: "graph_source";
    graph_snapshot_id: "graph_snapshot_id";
    graph_scope: "graph_scope";
    identity_advisory: "identity_advisory";
}>;
declare const STRICT_PROVENANCE_POLICY: Readonly<{
    unknownDeclaredInputKeys: "reject";
    allowedDeclaredInputKeys: readonly ["device_id", "recorded_variable", "units", "sampling_interval", "recorder_id", "sender_ids", "population_labels", "time_units", "source_ids", "target_ids", "synapse_model", "weight_units", "extent", "spatial_units", "mask", "kernel", "projection_sample_policy", "morphology_disclaimer", "frame_rate", "state_variables", "derivation_method", "model_context", "fixed_parameters", "bin_ms", "histogram_normalization", "interval_scope", "event_alignment", "psth_aggregation", "connection_sample_policy", "snapshot_time_ms", "snapshot_scope", "parallel_edge_policy", "matrix_axis_order", "matrix_aggregation", "delay_units", "degree_direction", "degree_counting", "zero_degree_policy", "node_ids", "position_scope", "detector_id", "reference_population", "target_population", "correlation_normalization", "correlation_units", "lag_convention", "binning_policy", "stim_units", "rate_normalization", "graph_source", "graph_snapshot_id", "graph_scope", "identity_advisory"];
    requiredKeysSource: "skill.requiredProvenanceKeys";
    presentKnownValues: "validate every present known key with provenanceValueConstraints";
    requiredKeysControl: "presence only; value rules apply whether required or extra";
    normalizeBeforeValidation: true;
}>;
declare const PROVENANCE_KEY_LABELS: Readonly<Record<ProvenanceKey, string>>;
declare function isProvenanceKey(value: unknown): value is ProvenanceKey;
type ProvenanceValueConstraint = {
    kind: 'positive_finite_number';
} | {
    kind: 'nonnegative_finite_number';
} | {
    kind: 'literal_true';
} | {
    kind: 'nonnegative_safe_integer_or_nonblank_string';
    normalize: 'trim';
} | {
    kind: 'string';
    allowEmpty: true;
} | {
    kind: 'nonblank_string';
    normalize: 'trim';
};
/** Machine-verifiable relationships between checked params and declared
 *  provenance. They do not prove a claim true, but prevent the gate from
 *  blessing contradictions such as params.units='mV' with declared units='pA'. */
type ProvenanceParamConstraint = {
    kind: 'equals_param';
    provenanceKey: ProvenanceKey;
    paramKey: string;
    description: string;
} | {
    kind: 'equals_param_path';
    provenanceKey: ProvenanceKey;
    /** Dot-separated own-property path through already checked params. */
    paramPath: string;
    description: string;
} | {
    kind: 'equals_literal';
    provenanceKey: ProvenanceKey;
    value: string | number | true;
    description: string;
};
declare const PROVENANCE_PARAM_CONSTRAINT_LANGUAGE: Readonly<{
    version: "2";
    evaluationOrder: readonly string[];
    kinds: readonly ["equals_param", "equals_param_path", "equals_literal"];
    semantics: Readonly<{
        equals_param: "declared value must equal one checked top-level params property under Object.is";
        equals_param_path: "declared value must equal the checked scalar reached through a dot-separated sequence of safe own data-property names under Object.is";
        equals_literal: "declared value must equal the contract literal under Object.is";
    }>;
}>;
/** Exact semantic rule applied to every required declared-input value. Non-TS
 *  hosts consume the same table from skills.manifest.json. */
declare const PROVENANCE_VALUE_CONSTRAINTS: Readonly<Record<ProvenanceKey, ProvenanceValueConstraint>>;
/** Basic semantic validation for declared provenance. This cannot prove an
 *  assertion is true, but it prevents meaningless declarations such as
 *  `units:true`, a negative sampling interval, or identity_advisory:"false". */
declare function declaredProvenanceValueError(key: ProvenanceKey, value: string | number | true): string | null;
/** Apply the normalization declared in the portable constraint table. Strict
 *  gates return this normalized value so TypeScript and non-TypeScript hosts do
 *  not disagree about whether whitespace is preserved. */
declare function normalizeDeclaredProvenanceValue(key: ProvenanceKey, value: string | number | true): string | number | true;
declare function normalizeDeclaredProvenanceInputs(inputs: Record<string, string | number | true>): Record<string, string | number | true>;
declare function provenanceParamConstraintError(constraint: ProvenanceParamConstraint, params: Record<string, unknown>, declared: Record<string, string | number | true>): string | null;

type EngramCorpusEntityNodeKind = (typeof CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS)[number];
type EngramCorpusEntityEdgeKind = (typeof CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS)[number];
interface EngramCorpusEntityNode {
    id: string;
    kind: EngramCorpusEntityNodeKind;
    label: string;
    family: string;
    model_type?: string | null;
    reproducibility_class?: string | null;
    brain_region?: string | null;
    paper_count: number;
    n_neurons: number;
    n_synapses: number;
    pagerank?: number | null;
}
interface EngramCorpusEntityEdge {
    /** Newer producers should supply this. A legacy response may omit it only
     * when source/kind/target identifies exactly one assertion. */
    id?: string;
    source: string;
    target: string;
    kind: EngramCorpusEntityEdgeKind;
    confidence?: number | null;
}
interface EngramCorpusEntityGraphResponse {
    nodes: readonly EngramCorpusEntityNode[];
    edges: readonly EngramCorpusEntityEdge[];
    paper_count: number;
    model_count: number;
    family_count: number;
    edge_counts: Readonly<Record<string, number>>;
    kinds: readonly string[];
    generated_at: string;
    advisory_only: true;
    calibrated_posterior: false;
    is_paper_local_evidence: false;
}
interface AdaptEngramCorpusEntityGraphOptions {
    graphId: string;
    graphSource: string;
    /** Immutable source revision, digest, or archive id. */
    graphSnapshotId: string;
}
type AdaptEngramCorpusEntityGraphResult = {
    ok: true;
    params: KnowledgeGraph3DParams;
} | {
    ok: false;
    errors: string[];
};
/** Convert an unknown JSON value into strict 1.4 corpus graph params. This
 * function never creates a VizSpec or relaxes provenance; callers still pass
 * the result through buildVizSpec/validateSkillInvocation. */
declare function adaptEngramCorpusEntityGraph(graph: EngramCorpusEntityGraphResponse, options: AdaptEngramCorpusEntityGraphOptions): AdaptEngramCorpusEntityGraphResult;
declare function adaptEngramCorpusEntityGraph(graph: unknown, options: unknown): AdaptEngramCorpusEntityGraphResult;

declare const CORTEXEL_SKILL_VERSION = "1.6.0";
declare const STRICT_INVOCATION_POLICY: Readonly<{
    version: "2";
    externalSelection: "validateSkillInvocation(id,payload): explicit id selects; payload.skill is optional but must match when present";
    selfDescribingSelection: "validateSpec(payload): payload.skill is required and selects the contract";
    hostSelection: "host envelopes require payload.skill; explicit id and payload.skill must match";
    unknownSkillIds: "reject";
    cortexelEnvelope: "allowed iff contract.scene is non-null; payload.scene must equal contract.scene";
    hostEnvelope: "allowed iff contract.scene is null; scene is forbidden";
    rendererRoute: "when selected, must occur in contract.rendererRoutes";
    params: "validate paramsJsonSchema then every paramConstraint";
    provenance: "apply strictProvenancePolicy, require every contract.requiredProvenanceFlags value, then evaluate every provenanceParamConstraint";
}>;
type RequiredProvenanceFlags = Readonly<Partial<{
    advisory_only: boolean;
    is_paper_local_evidence: boolean;
    synthetic: boolean;
}>>;
interface SkillExample {
    nestExample: string;
    sourceUrl: string;
    dataShape: string;
    output: string;
    note: string;
}
/** Cross-field rules JSON Schema cannot express (such as two arrays having the
 *  same length). Non-TypeScript hosts apply these after paramsJsonSchema. */
interface ParamValidationConstraint {
    kind: 'equal_length' | 'each_length_matches' | 'monotonic_non_decreasing' | 'non_negative' | 'property_count' | 'unique_field' | 'unique_tuple' | 'references_exist' | 'no_self_loops' | 'same_keys' | 'cartesian_product_length' | 'permutation_of_keys' | 'endpoint_kinds' | 'mapped_value' | 'conditional_numeric_domain' | 'uniform_histogram_bins' | 'normalized_histogram_mass' | 'psth_derived_counts' | 'max_parallel_edges' | 'each_unique_field' | 'each_contains_field_value' | 'node_score_kind' | 'edge_score_kind' | 'ordered_interval' | 'uniform_bin_window' | 'population_rate_derived_values' | 'symmetric_lag_axis' | 'legacy_connection_channels' | 'connection_graph_snapshot' | 'matrix_connection_counts' | 'degree_distribution_consistency' | 'delay_distribution_consistency' | 'spatial_extent_bounds' | 'scope_compatibility' | 'acyclic';
    paths: readonly string[];
    field?: string;
    min?: number;
    max?: number;
    symmetricKinds?: readonly string[];
    allowedEndpointKinds?: Readonly<Record<string, readonly [string, string]>>;
    allowedValues?: Readonly<Record<string, string>>;
    numericDomains?: Readonly<Record<string, Readonly<{
        min: number;
        max?: number;
        integer?: boolean;
    }>>>;
    absoluteTolerance?: number;
    relativeTolerance?: number;
    /** Bounded IEEE-754 roundoff allowance expressed in approximate ULPs. */
    roundoffUlps?: number;
    /** Maximum local-width/half-extent fraction that roundoff may repair. */
    maxRoundoffFraction?: number;
    nonNegativeLowerEdge?: boolean;
    normalizationRules?: Readonly<Record<string, Readonly<{
        measure: 'sum' | 'density_integral';
        target: number;
    }>>>;
    allowedScoreKinds?: Readonly<Record<string, readonly string[]>>;
    allowedFieldValues?: readonly string[];
    description: string;
}
interface SkillContract {
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
declare const PARAM_CONSTRAINT_LANGUAGE: Readonly<{
    version: "8";
    pathSyntax: "dot-separated object keys";
    arrayWildcard: "[*]";
    objectValueWildcard: "*";
    optionalSuffix: "?";
    evaluationOrder: readonly string[];
    kinds: readonly ["equal_length", "each_length_matches", "monotonic_non_decreasing", "non_negative", "property_count", "unique_field", "unique_tuple", "references_exist", "no_self_loops", "same_keys", "cartesian_product_length", "permutation_of_keys", "endpoint_kinds", "mapped_value", "conditional_numeric_domain", "uniform_histogram_bins", "normalized_histogram_mass", "psth_derived_counts", "max_parallel_edges", "each_unique_field", "each_contains_field_value", "node_score_kind", "edge_score_kind", "ordered_interval", "uniform_bin_window", "population_rate_derived_values", "symmetric_lag_axis", "legacy_connection_channels", "connection_graph_snapshot", "matrix_connection_counts", "degree_distribution_consistency", "delay_distribution_consistency", "spatial_extent_bounds", "scope_compatibility", "acyclic"];
    semantics: Readonly<{
        equal_length: Readonly<{
            pathRoles: "all paths resolve to arrays";
            rule: "all present arrays have identical length";
            optionalAbsent: "skip a path ending in ?";
        }>;
        each_length_matches: Readonly<{
            pathRoles: "first path resolves zero or more arrays; last path is the reference array";
            rule: "every first-path array length equals the reference-array length";
        }>;
        monotonic_non_decreasing: Readonly<{
            pathRoles: "each path resolves an ordered numeric sequence";
            rule: "for every adjacent pair previous <= next";
        }>;
        non_negative: Readonly<{
            pathRoles: "each path resolves numeric values";
            rule: "every resolved number is >= 0";
        }>;
        property_count: Readonly<{
            pathRoles: "each path resolves objects";
            rule: "own enumerable property count is within optional min/max inclusive";
        }>;
        unique_field: Readonly<{
            pathRoles: "the first path resolves an array of objects; field names the key";
            rule: "field values are unique under JSON scalar equality";
        }>;
        unique_tuple: Readonly<{
            pathRoles: "paths resolve equal-length scalar sequences zipped by index";
            rule: "zipped JSON tuples are unique; when the final kind value is in symmetricKinds, canonicalize the first two tuple values lexicographically";
        }>;
        references_exist: Readonly<{
            pathRoles: "all paths except the last resolve references; the last resolves the allowed-id set";
            rule: "every non-null reference occurs in the allowed-id set";
        }>;
        no_self_loops: Readonly<{
            pathRoles: "first and second paths resolve equal-length source and target sequences";
            rule: "source[index] !== target[index] for every index";
        }>;
        same_keys: Readonly<{
            pathRoles: "paths resolve objects";
            rule: "all objects have exactly the same own enumerable string-key set";
        }>;
        cartesian_product_length: Readonly<{
            pathRoles: "first path resolves axis arrays; second path resolves output arrays";
            rule: "every output-array length equals the product of all axis-array lengths";
        }>;
        permutation_of_keys: Readonly<{
            pathRoles: "first path resolves a scalar sequence; second path resolves an object";
            rule: "the sequence contains every object key exactly once";
        }>;
        endpoint_kinds: Readonly<{
            pathRoles: "first path resolves edges with source/target/kind; second resolves nodes with id/kind";
            rule: "each edge endpoint node kind equals allowedEndpointKinds[edge.kind]";
        }>;
        mapped_value: Readonly<{
            pathRoles: "first path resolves a discriminator scalar; second path resolves its dependent scalar";
            rule: "the second value equals allowedValues[first value]";
        }>;
        conditional_numeric_domain: Readonly<{
            pathRoles: "first path resolves a discriminator scalar; second path resolves numeric values";
            rule: "every numeric value satisfies numericDomains[discriminator] inclusive min/max and optional integer requirement";
        }>;
        uniform_histogram_bins: Readonly<{
            pathRoles: "first path resolves the ordered bin-center array; second path resolves one numeric bin width";
            rule: "width is positive and finite; centers are strictly increasing; each adjacent delta approximately equals width";
            comparison: "abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))";
            nonNegativeLowerEdge: "when true, firstCenter-width/2 must be >= -tolerance, where tolerance uses firstCenter and width/2 in the same comparison formula";
        }>;
        normalized_histogram_mass: Readonly<{
            pathRoles: "first path resolves normalization mode; second resolves histogram values; third resolves bin width";
            absentMode: "when normalizationRules has no entry for the selected mode, skip the constraint";
            accumulation: "values must be finite and non-negative and are summed from index 0 to length-1 using IEEE-754 binary64 addition";
            measures: Readonly<{
                sum: "compare the left-to-right value sum with target";
                density_integral: "multiply the left-to-right value sum by the positive finite width, then compare with target";
            }>;
            comparison: "abs(actual-target) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(target))";
        }>;
        psth_derived_counts: Readonly<{
            pathRoles: "normalization mode, values array, positive safe-integer trial count, positive finite bin width in ms, and aggregation literal in that order";
            aggregation: "selected_senders_per_trial means each bin count is the aggregate number of raw spike events from all selected senders across the declared trials";
            recovery: Readonly<{
                count: "rawCount = value";
                count_per_trial: "rawCount = value * trialCount";
                rate_hz: "rawCount = ((value * trialCount) * binWidthMs) / 1000";
            }>;
            operationOrder: "evaluate the displayed rate_hz expression left-to-right with IEEE-754 binary64 operations; do not fuse or algebraically reorder it";
            nearestInteger: "round rawCount to the nearest mathematical integer; exact half ties go toward positive infinity (half ties necessarily fail the 1e-6 recovery tolerance)";
            rule: "count values are exact non-negative safe integers; normalized values pass only when rawCount and rounded are finite, rounded is a non-negative safe integer, and abs(rawCount-rounded) <= absoluteTolerance";
            relativeTolerance: "none; this constraint uses absoluteTolerance only";
        }>;
        max_parallel_edges: Readonly<{
            pathRoles: "the first path resolves an array of edges with source and target ids";
            pairIdentity: "source/target direction is ignored; canonicalize each pair by ECMAScript UTF-16 lexicographic order";
            rule: "the number of edges for every canonical unordered endpoint pair is <= max";
        }>;
        each_unique_field: Readonly<{
            pathRoles: "the first path resolves zero or more arrays of objects; field names the key";
            rule: "within each resolved array, field values are unique under JSON scalar equality";
        }>;
        each_contains_field_value: Readonly<{
            pathRoles: "the first path resolves zero or more arrays of objects; field names the key";
            rule: "within each resolved array, at least one object field value occurs in allowedFieldValues under JSON string equality";
        }>;
        node_score_kind: Readonly<{
            pathRoles: "the first path resolves an array of nodes with kind and optional uncalibrated_score.kind";
            absentScore: "an absent uncalibrated_score passes";
            rule: "a present score discriminator occurs in allowedScoreKinds[node.kind]";
        }>;
        edge_score_kind: Readonly<{
            pathRoles: "the first path resolves an array of edges with kind and optional uncalibrated_score.kind";
            absentScore: "an absent uncalibrated_score passes";
            rule: "a present score discriminator occurs in allowedScoreKinds[edge.kind]; an empty allowed list forbids scores for that edge kind";
        }>;
        ordered_interval: Readonly<{
            pathRoles: "first path resolves one finite interval start; second resolves one finite interval stop";
            rule: "stop is strictly greater than start";
        }>;
        uniform_bin_window: Readonly<{
            pathRoles: "ordered bin-center array, positive finite bin width, finite window start, finite window stop in that order";
            rule: "centers are strictly increasing and uniformly spaced by width; firstCenter-width/2 equals start and lastCenter+width/2 equals stop";
            binning: "left-closed, right-open bins exactly tile [start,stop)";
            spacingComparison: "adjacent center deltas use abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual),abs(expected))";
            edgeComparison: "exact edge equality passes; otherwise the binary64 allowance must be <= maxRoundoffFraction * abs(binWidth), then abs(edge-expected) <= absoluteTolerance + relativeTolerance * abs(binWidth) + roundoffUlps * 2^-52 * max(abs(center),abs(binWidth/2),abs(edge),abs(expected)); an unresolved absolute origin fails closed";
        }>;
        population_rate_derived_values: Readonly<{
            pathRoles: "series array, shared bin-center array, positive finite bin width, normalization, aggregation, and binning literals in that order";
            fixedSemantics: "normalization=mean_per_recorded_sender_hz; aggregation=selected_senders; binning=left_closed_right_open";
            seriesRule: "series ids are unique; recorded_sender_count is a positive safe integer; spike_counts are non-negative safe integers; spike_counts and rates_hz each match the shared bin count";
            rateFormula: "expected = (spikeCount * 1000) / (recordedSenderCount * binWidthMs)";
            operationOrder: "multiply spikeCount by 1000; multiply recordedSenderCount by binWidthMs; divide the first result by the second using IEEE-754 binary64; do not fuse or algebraically reorder";
            comparison: "abs(rate-expected) <= absoluteTolerance + relativeTolerance * max(abs(rate), abs(expected))";
        }>;
        symmetric_lag_axis: Readonly<{
            pathRoles: "ordered lag-center array, positive finite bin width, positive finite tau_max_ms in that order";
            rule: "lags are strictly increasing, uniformly spaced by width, odd in count, pairwise symmetric about a zero center, and span exactly [-tau_max_ms,+tau_max_ms]";
            comparison: "abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))";
        }>;
        legacy_connection_channels: Readonly<{
            pathRoles: "optional weights array, optional weight_units, optional delays array, and optional delay_units in that order";
            rule: "weights and weight_units occur together; delays and delay_units occur together; every present delay is finite and strictly positive";
            emptyChannels: "a present empty measurement array still requires its matching unit";
        }>;
        connection_graph_snapshot: Readonly<{
            pathRoles: "nodes array, edges array, sample_policy, source_connection_count, optional weight_units, optional delay_units, and edge_identity in that order";
            rule: "node and edge ids are unique; every edge endpoint exists; weight, delay_ms, and synapse_model are each present on every edge or none; measurement units occur exactly with their channel; complete output has edges.length=source_connection_count; deterministic_even_stride is a non-empty strict subset";
            identity: "canonical_sorted_ordinal requires connection:<safe ordinal> with ordinal < source_connection_count; nest_connection_identifier requires connection:source:target:target_thread:synapse_id:port with canonical nonnegative safe-integer components and endpoint correlation";
        }>;
        matrix_connection_counts: Readonly<{
            pathRoles: "ordered source_ids, ordered target_ids, sparse cells, total connection_count, and aggregation in that order";
            rule: "axis ids are unique; every cell has a unique in-universe source/target pair and positive safe-integer connection_count; the left-to-right safe-integer cell-count sum equals connection_count; single_connection requires every cell count to equal one";
            absence: "a missing sparse cell means no_connection; a present zero-valued weight cell remains a connection because connection_count is positive";
        }>;
        degree_distribution_consistency: Readonly<{
            pathRoles: "degrees, node_counts, displayed values, node_count, connection_count, direction, normalization, value_units, edge_counting, and zero_degree_policy in that order";
            rule: "degrees equal contiguous integers 0..N; counts and nonnegative values match their length; sum(node_counts)=node_count; sum(degree*node_count)=connection_count; displayed counts equal raw counts exactly; probabilities match raw count/node_count and sum to one";
            fixedSemantics: "edge_counting=each_synapse_collection_entry and zero_degree_policy=include_declared_universe";
        }>;
        delay_distribution_consistency: Readonly<{
            pathRoles: "bin centers, raw delay_counts, displayed values, bin width, connection_count, normalization, value units, delay units, aggregation, and binning in that order";
            rule: "the three bin arrays have equal length; displayed values are finite and nonnegative; sum(delay_counts)=connection_count; displayed counts equal raw counts exactly; probabilities or densities exactly equal the published binary64 recovery result and globally sum or integrate to one within the accumulated-mass tolerance; non-count normalization requires a non-empty snapshot and finite density denominator";
            operationOrder: "probability=count/connection_count; probability_density=count/(connection_count*bin_width_ms) using IEEE-754 binary64; per-bin comparison uses exact Object.is-equivalent binary64 identity, while absoluteTolerance/relativeTolerance apply only to accumulated normalized mass";
            geometry: "a separate uniform_bin_window constraint publishes and evaluates exact [start,stop) bin geometry";
        }>;
        spatial_extent_bounds: Readonly<{
            pathRoles: "nodes array, extent tuple, and center tuple in that order";
            rule: "center ± extent/2 must produce a strictly ordered representable interval on each axis; node ids are unique and every coordinate lies within those bounds using a separate tolerance for each axis";
            comparison: "axisTolerance = absoluteTolerance + relativeTolerance * abs(halfExtent) + boundedRoundoff; boundedRoundoff is the roundoffUlps * 2^-52 arithmetic allowance only when it is <= maxRoundoffFraction * abs(halfExtent), otherwise zero; the large absolute spatial origin never multiplies relativeTolerance";
            roundoff: "roundoffUlps and maxRoundoffFraction bound IEEE-754 binary64 repair for deriving center ± extent/2; exact in-bound comparisons remain valid when repair is disabled";
        }>;
        scope_compatibility: Readonly<{
            pathRoles: "scope object and optional degree direction in that order";
            rule: "rank-local scopes require integer 0<=rank<world_size; merged scopes require positive world_size; out-degree forbids mpi_target_rank_local";
        }>;
        acyclic: Readonly<{
            pathRoles: "first path resolves node ids; second resolves each node parent id or null";
            rule: "following parent links from any id never revisits an id";
        }>;
    }>;
}>;
declare const NEST_SKILL_REGISTRY: Record<NestSkillId, SkillContract>;
declare const PARAM_VALIDATION_CONSTRAINTS: Readonly<Partial<Record<NestSkillId, readonly ParamValidationConstraint[]>>>;
/** Neutral alias for the skill registry (the axis is not NEST-only — see
 *  corpus.knowledge_graph). Prefer this in new code. */
declare const SKILL_REGISTRY: Record<"nest.voltage_trace" | "nest.spike_raster" | "nest.isi_distribution" | "nest.psth" | "nest.population_rate" | "nest.rate_response" | "nest.connectivity_matrix" | "nest.connection_graph" | "nest.adjacency_matrix" | "nest.weight_matrix" | "nest.delay_matrix" | "nest.in_degree_distribution" | "nest.out_degree_distribution" | "nest.delay_distribution" | "nest.weight_histogram" | "nest.spatial_2d" | "nest.spatial_map_2d" | "nest.spatial_3d" | "nest.plasticity_dynamics" | "nest.phase_plane" | "nest.correlogram" | "nest.stimulus_response" | "nest.astrocyte_dynamics" | "nest.compartmental_dynamics" | "nest.animation_replay" | "corpus.knowledge_graph", SkillContract>;
declare function listSkills(): SkillContract[];
declare function getSkill(id: unknown): SkillContract | undefined;
interface SkillDescriptor {
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
    examplePayload?: VizSpec | HostRendererInvocation;
    examples: SkillExample[];
}
declare function toPortableJsonSchema(schemaSource: z.ZodType): Record<string, unknown>;
declare function skillParamsJsonSchema(c: SkillContract): Record<string, unknown> | undefined;
declare function describeSkill(id: unknown): SkillDescriptor | undefined;
declare function describeSkills(): SkillDescriptor[];

declare const SKILL_EXAMPLE_PAYLOADS: Partial<Record<NestSkillId, VizSpec>>;
declare const HOST_RENDERER_EXAMPLE_PAYLOADS: Partial<Record<NestSkillId, HostRendererInvocation>>;
declare function getExamplePayload(id: unknown): VizSpec | undefined;
declare function getHostRendererExamplePayload(id: unknown): HostRendererInvocation | undefined;
declare function getInvocationExamplePayload(id: unknown): VizSpec | HostRendererInvocation | undefined;

type SpikeDataKind = 'events' | 'isi' | 'psth' | 'population_rate' | 'fi_response';
type GetConnectionsDataKind = 'connection_graph' | 'adjacency_matrix' | 'weight_matrix' | 'delay_matrix' | 'weight_distribution' | 'delay_distribution' | 'in_degree_distribution' | 'out_degree_distribution';
type GetPositionDataKind = 'positions_2d' | 'positions_3d';
type RouteDataKind = SpikeDataKind | GetConnectionsDataKind | GetPositionDataKind;
interface RouteInput {
    deviceFamily: NestDeviceFamily;
    /** Family-specific analysis discriminator. Raw field presence never selects
     * an analysis because the same simulator snapshot supports many views. */
    dataShape?: {
        kind?: RouteDataKind;
    };
    /** General disambiguator for any many-to-one family: name the skill directly.
     *  Must belong to `deviceFamily` or routing fails explicitly. */
    skill?: NestSkillId;
}
interface Disambiguator {
    /** The RouteInput field an agent should set to retry. */
    field: 'skill' | 'dataShape.kind';
    /** Value → skill it would resolve to (so the agent can pick deterministically). */
    maps: Partial<Record<string, NestSkillId>>;
}
type RouteResult = {
    ok: true;
    skill: NestSkillId;
    scene: SceneName;
} | {
    ok: false;
    reason: 'invalid_input' | 'unknown_family' | 'no_cortexel_scene' | 'ambiguous' | 'invalid_discriminator' | 'skill_family_mismatch';
    candidates?: NestSkillId[];
    disambiguateBy?: Disambiguator;
    rendererRoutes?: readonly RendererRoute[];
    field?: string;
    message?: string;
};
/** Frozen, JSON-friendly discriminator snapshot for agent and non-TS parity. */
declare const ROUTING_DISCRIMINATORS: Readonly<Partial<Record<NestDeviceFamily, Readonly<Record<string, NestSkillId>>>>>;
declare function routeToScene(input: RouteInput): RouteResult;
declare function routeToScene(input: unknown): RouteResult;

/** Machine-checkable declared inputs (the values an agent asserts it used).
 * Strict gates validate every known value and required-key presence; factual
 * truth still remains the caller's responsibility. */
type DeclaredInputs = Record<string, string | number | true>;
/** Provenance overrides an agent may raise ABOVE the conservative baseline.
 *  `source`/`declared_inputs` are set from buildVizSpec's own args, and
 *  `calibrated_posterior` is deliberately omitted — it is rejected at every
 *  entrypoint, so it can never be set here. */
type ProvenanceOverrides = Partial<Pick<VizSpec['provenance'], 'advisory_only' | 'is_paper_local_evidence' | 'synthetic' | 'caption'>>;
/**
 * A fail-closed provenance object: the conservative defaults (nothing asserted
 * rigorous) plus the given source and declared inputs. Because the honesty
 * caption is derived from these flags, an agent that starts here can only ever
 * ADD rigor — it can never accidentally clear the disclosure.
 */
declare function conservativeProvenance(source: string, declaredInputs?: DeclaredInputs): VizSpec['provenance'];
interface BuildVizSpecInput {
    /** The skill id this data renders through (see SKILL_IDS). */
    skill: string;
    /** Scene-specific data/options. Validated against the skill's param schema. */
    params: Record<string, unknown>;
    /** Where the data came from (a nest_simulation id, a paper id, synthetic_test…). */
    source: string;
    /** The inputs this skill's honesty contract requires declared. Missing keys
     *  surface as `missing_provenance` errors naming exactly what to add. */
    declaredInputs?: DeclaredInputs;
    /** Raise provenance above the conservative baseline (advisory_only,
     *  is_paper_local_evidence, synthetic, caption). calibrated_posterior can't be
     *  set — it is rejected at the boundary. */
    provenance?: ProvenanceOverrides;
    /** Override the scene (defaults to the skill's contract scene). */
    scene?: VizSpec['scene'];
    themeMode?: 'dark' | 'light';
    camera?: NonNullable<VizSpec['camera']>;
    /** Named palette hint; rejected with `unknown_palette` if not registered. */
    palette?: string;
    mode?: 'interactive' | 'export';
}
interface BuildHostRendererInvocationInput {
    /** A skill whose contract declares `scene:null`. */
    skill: string;
    params: Record<string, unknown>;
    source: string;
    declaredInputs?: DeclaredInputs;
    provenance?: ProvenanceOverrides;
    /** Optional concrete route; omitted means the validated result returns all
     *  routes allowed by the skill contract. */
    rendererRoute?: RendererRoute;
}
/** Author and strictly validate a scene-less host-renderer invocation. */
declare function buildHostRendererInvocation(input: BuildHostRendererInvocationInput): HostRendererInvocationResult;
/** Author + validate without throwing on malformed runtime input. */
declare function buildVizSpec(input: BuildVizSpecInput): SkillInvocationResult;
/**
 * Validate a SELF-DESCRIBING spec (one that carries a `skill` field) through the
 * strict gate, without passing the id separately — the core-level equivalent of
 * what VizSpecRenderer does when no `skillId` prop is given. Fail-closed: a spec
 * with no `skill` is rejected (use `validateSkillInvocation(id, spec)` with an
 * explicit id, or `validateVizSpec` for the lenient envelope-only path).
 */
declare function validateSpec(payload: unknown): SkillInvocationResult;
/**
 * Render structured skill-invocation errors as a compact, deterministic block an
 * agent can feed straight back to a model to self-repair: each error's code, path,
 * message and hint (plus any nearest-match / allowed-value list), then ONE copyable
 * example payload when the errors carry one. Pure text, no ANSI, no timestamps —
 * safe to drop into a tool result or a prompt.
 */
declare function formatInvocationErrors(errors: SkillInvocationError[]): string;

interface EmptySceneResult {
    /** False means the input was not safely inspectable SceneData. Invalid input
     *  is never conflated with a legitimate, empty render. */
    valid: boolean;
    empty: boolean;
    /** Which channels carried data (for an actionable message). */
    populated: string[];
    reason?: string;
}
/** Detect whether adapted SceneData has any renderable content. No-throw even
 *  when an agent accidentally supplies null, accessors, or a hostile Proxy. */
declare function detectEmptyScene(data: unknown): EmptySceneResult;

declare const NEST_INPUT_LIMITS: Readonly<{
    maxSamples: 100000;
    maxPositions: 50000;
}>;
/** spike_recorder events: nest.GetStatus(sr, 'events') → {senders, times}. */
declare const SpikeRecorderEventsSchema: z.ZodObject<{
    senders: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    times: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
}, z.core.$strict>;
type SpikeRecorderEvents = z.infer<typeof SpikeRecorderEventsSchema>;
/** multimeter events: {times, <variable>: values}. The host names the variable;
 *  Cortexel takes a normalized {times, values}. */
declare const MultimeterEventsSchema: z.ZodObject<{
    times: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    values: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    sender: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
type MultimeterEvents = z.infer<typeof MultimeterEventsSchema>;
/** A multimeter recording multiple senders: {times, values, senders} parallel
 *  arrays (the flattened form a single multimeter actually returns). Split per
 *  sender before rendering — each sender's sub-series must be monotonic. */
declare const MultimeterMultiSenderSchema: z.ZodObject<{
    times: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    values: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    senders: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
}, z.core.$strict>;
type MultimeterMultiSender = z.infer<typeof MultimeterMultiSenderSchema>;
/** nest.GetConnections() → parallel source/target/weight/delay arrays. */
declare const GetConnectionsSchema: z.ZodObject<{
    sources: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    targets: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    weights: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
    delays: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
}, z.core.$strict>;
type GetConnections = z.infer<typeof GetConnectionsSchema>;
/** nest.GetPosition(nodes) in 2D → ((x,y), ...). */
declare const GetPosition2DSchema: z.ZodObject<{
    positions: z.ZodType<[number, number][], unknown, z.core.$ZodTypeInternals<[number, number][], unknown>>;
    node_ids: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
}, z.core.$strict>;
type GetPosition2D = z.infer<typeof GetPosition2DSchema>;
/** nest.GetPosition(nodes) in 3D → ((x,y,z), ...). */
declare const GetPosition3DSchema: z.ZodObject<{
    positions: z.ZodType<[number, number, number][], unknown, z.core.$ZodTypeInternals<[number, number, number][], unknown>>;
    node_ids: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
    edges: z.ZodOptional<z.ZodType<{
        source: number;
        target: number;
    }[], unknown, z.core.$ZodTypeInternals<{
        source: number;
        target: number;
    }[], unknown>>>;
}, z.core.$strict>;
type GetPosition3D = z.infer<typeof GetPosition3DSchema>;
/** weight_recorder events: {times, weights, senders?, targets?}. */
declare const WeightRecorderEventsSchema: z.ZodObject<{
    times: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    weights: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    senders: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
    targets: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
    sender: z.ZodOptional<z.ZodNumber>;
    target: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
type WeightRecorderEvents = z.infer<typeof WeightRecorderEventsSchema>;
/**
 * Strict internal projection of the documented correlation_detector fields.
 * The public adapter descriptor-projects these from a full device status before
 * applying this schema, so unrelated NEST metadata is accepted but never read.
 */
declare const CorrelationDetectorStatusSchema: z.ZodObject<{
    delta_tau: z.ZodNumber;
    tau_max: z.ZodNumber;
    Tstart: z.ZodNumber;
    Tstop: z.ZodNumber;
    count_histogram: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
    histogram: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
}, z.core.$strict>;
type CorrelationDetectorStatus = z.infer<typeof CorrelationDetectorStatusSchema>;

type AdapterResult = {
    ok: true;
    data: SceneData;
    senderIndexMap?: Map<number, number>;
} | {
    ok: false;
    errors: string[];
};
/** Object-producing adapters intentionally use tighter budgets than raw typed
 * device channels. Large simulations should be aggregated or referenced by a
 * host-side handle instead of expanding millions of JS objects/typed arrays. */
declare const NEST_ADAPTER_LIMITS: Readonly<{
    maxRootKeys: 32;
    maxConnections: 20000;
    maxNetworkNodes: 25000;
    maxSplitSeries: 4096;
    maxUniqueSpikeSenders: 50000;
}>;
declare function spikeRecorderToSceneData(events: unknown): AdapterResult;
declare function multimeterToSceneData(events: unknown, opts?: {
    variable?: string;
    units?: string;
}): AdapterResult;
interface MultimeterSenderSeries {
    sender: number;
    times: number[];
    values: Float32Array;
}
type MultimeterSplitResult = {
    ok: true;
    series: MultimeterSenderSeries[];
} | {
    ok: false;
    errors: string[];
};
/** Split a flattened multi-sender multimeter dump ({times,values,senders}) into
 *  one monotonic series per sender — the honest alternative to rejecting it. */
declare function splitMultimeterBySender(events: unknown): MultimeterSplitResult;
declare function getConnectionsToSceneData(conns: unknown, opts?: {
    weightUnits?: string;
    delayUnits?: string;
}): AdapterResult;
declare function getPositionToSceneData(positions: unknown, opts: {
    dims?: 2 | 3;
    coordinateUnits: string;
}): AdapterResult;
declare function weightRecorderToSceneData(events: unknown, opts?: {
    weightUnits?: string;
}): AdapterResult;
interface WeightSynapseSeries {
    sender: number;
    target: number;
    times: number[];
    weights: Float32Array;
}
type WeightRecorderSplitResult = {
    ok: true;
    series: WeightSynapseSeries[];
} | {
    ok: false;
    errors: string[];
};
/** Split a multi-synapse weight_recorder dump into one honest trace per
 *  (sender,target) pair. The single-trace adapter deliberately refuses to merge
 *  these series because doing so invents discontinuous plasticity dynamics. */
declare function splitWeightRecorderBySynapse(events: unknown): WeightRecorderSplitResult;

type NestAnalysisResult<T> = {
    ok: true;
    params: T;
} | {
    ok: false;
    errors: string[];
};
declare const NEST_ANALYSIS_LIMITS: Readonly<{
    maxPopulations: 256;
    maxSelectedSenders: 50000;
    maxTrials: 10000;
    maxTotalEvents: 100000;
    maxOutputBins: 50000;
    maxPopulationBinCells: 100000;
}>;
interface PopulationRatePopulation {
    id: string;
    label: string;
    senderIds: readonly number[];
}
interface PopulationRateOptions {
    startMs: number;
    stopMs: number;
    binWidthMs: number;
    populations: readonly PopulationRatePopulation[];
    unassignedPolicy: 'reject' | 'ignore';
}
interface IsiAnalysisOptions {
    senderIds: readonly number[];
    binWidthMs: number;
    maxIntervalMs: number;
    normalization: 'count' | 'probability' | 'probability_density';
    intervalScope?: 'per_sender';
}
interface PsthAnalysisOptions {
    alignmentTimesMs: readonly number[];
    windowMs: readonly [number, number];
    binWidthMs: number;
    senderIds: readonly number[];
    normalization: 'count' | 'count_per_trial' | 'rate_hz';
    alignmentEvent: string;
}
interface CorrelationDetectorOptions {
    measurement: 'count_histogram' | 'histogram';
    referenceLabel: string;
    targetLabel: string;
    zeroLagPolicy: 'included' | 'excluded_self_pairs';
    weightedUnits?: string;
}
/** Bin unordered NEST spike-recorder events into exact per-population rates. */
declare function spikeRecorderToPopulationRateParams(events: unknown, options: PopulationRateOptions): NestAnalysisResult<PopulationRateParams>;
declare function spikeRecorderToPopulationRateParams(events: unknown, options: unknown): NestAnalysisResult<PopulationRateParams>;
/** Compute consecutive intervals independently within each selected sender. */
declare function spikeRecorderToIsiParams(events: unknown, options: IsiAnalysisOptions): NestAnalysisResult<IsiDistributionParams>;
declare function spikeRecorderToIsiParams(events: unknown, options: unknown): NestAnalysisResult<IsiDistributionParams>;
/** Aggregate explicitly separate trials around their declared alignment times. */
declare function spikeTrialsToPsthParams(trials: unknown, options: PsthAnalysisOptions): NestAnalysisResult<PsthParams>;
declare function spikeTrialsToPsthParams(trials: unknown, options: unknown): NestAnalysisResult<PsthParams>;
/** Project the documented NEST correlation_detector status histogram. */
declare function correlationDetectorToCorrelogramParams(status: unknown, options: CorrelationDetectorOptions): NestAnalysisResult<CorrelogramParams>;
declare function correlationDetectorToCorrelogramParams(status: unknown, options: unknown): NestAnalysisResult<CorrelogramParams>;

type NestTopologyResult<T> = {
    ok: true;
    params: T;
} | {
    ok: false;
    errors: string[];
};
declare const NEST_TOPOLOGY_LIMITS: Readonly<{
    maxConnections: 100000;
    maxGraphNodes: 25000;
    maxGraphEdges: 20000;
    maxMatrixCells: 50000;
    maxDegreeBins: 50000;
    maxDelayBins: 50000;
    maxSpatialNodes: 50000;
}>;
interface NormalizedSynapseCollectionSnapshot {
    sources: number[];
    targets: number[];
    weights?: number[];
    delays_ms?: number[];
    synapse_models?: string[];
    target_threads?: number[];
    synapse_ids?: number[];
    ports?: number[];
}
/**
 * Normalize the documented SynapseCollection `.get()` shape (`source`,
 * `target`, ...) and Cortexel's legacy plural wrapper without broadcasting or
 * invoking accessors. Empty connection arrays are valid evidence.
 */
declare function normalizeSynapseCollectionSnapshot(input: unknown): NestTopologyResult<NormalizedSynapseCollectionSnapshot>;
interface ConnectionSnapshotOptions {
    sourceIds: readonly number[];
    targetIds: readonly number[];
    snapshotTimeMs: number;
    snapshotScope: SnapshotScope;
}
interface ConnectionGraphOptions extends ConnectionSnapshotOptions {
    weightUnits?: string;
    delayUnits?: 'ms';
    samplePolicy: {
        kind: 'complete';
    } | {
        kind: 'deterministic_even_stride';
        maxEdges: number;
    };
}
interface WeightMatrixOptions extends ConnectionSnapshotOptions {
    weightUnits: string;
    aggregation: 'sum' | 'mean' | 'minimum' | 'maximum' | 'single_connection';
}
interface DelayMatrixOptions extends ConnectionSnapshotOptions {
    delayUnits: 'ms';
    aggregation: 'mean' | 'minimum' | 'maximum' | 'single_connection';
}
interface DegreeDistributionOptions extends ConnectionSnapshotOptions {
    normalization: 'count' | 'probability';
}
interface DelayDistributionOptions extends ConnectionSnapshotOptions {
    delayUnits: 'ms';
    binWidthMs: number;
    windowStartMs: number;
    windowStopMs: number;
    normalization: 'count' | 'probability' | 'probability_density';
}
interface SpatialMap2DOptions {
    nodeIds: readonly number[];
    coordinateUnits: string;
    extent: readonly [number, number];
    center: readonly [number, number];
    edgeWrap: boolean;
    positionScope: PositionScope;
}
/** Map a complete or explicitly sampled snapshot to schematic node-link params. */
declare function synapseCollectionToConnectionGraphParams(input: unknown, options: ConnectionGraphOptions): NestTopologyResult<ConnectionGraphParams>;
declare function synapseCollectionToConnectionGraphParams(input: unknown, options: unknown): NestTopologyResult<ConnectionGraphParams>;
declare function synapseCollectionToAdjacencyMatrixParams(input: unknown, options: ConnectionSnapshotOptions): NestTopologyResult<AdjacencyMatrixParams>;
declare function synapseCollectionToAdjacencyMatrixParams(input: unknown, options: unknown): NestTopologyResult<AdjacencyMatrixParams>;
declare function synapseCollectionToWeightMatrixParams(input: unknown, options: WeightMatrixOptions): NestTopologyResult<WeightMatrixParams>;
declare function synapseCollectionToWeightMatrixParams(input: unknown, options: unknown): NestTopologyResult<WeightMatrixParams>;
declare function synapseCollectionToDelayMatrixParams(input: unknown, options: DelayMatrixOptions): NestTopologyResult<DelayMatrixParams>;
declare function synapseCollectionToDelayMatrixParams(input: unknown, options: unknown): NestTopologyResult<DelayMatrixParams>;
declare function synapseCollectionToInDegreeDistributionParams(input: unknown, options: DegreeDistributionOptions): NestTopologyResult<InDegreeDistributionParams>;
declare function synapseCollectionToInDegreeDistributionParams(input: unknown, options: unknown): NestTopologyResult<InDegreeDistributionParams>;
declare function synapseCollectionToOutDegreeDistributionParams(input: unknown, options: DegreeDistributionOptions): NestTopologyResult<OutDegreeDistributionParams>;
declare function synapseCollectionToOutDegreeDistributionParams(input: unknown, options: unknown): NestTopologyResult<OutDegreeDistributionParams>;
declare function synapseCollectionToDelayDistributionParams(input: unknown, options: DelayDistributionOptions): NestTopologyResult<DelayDistributionParams>;
declare function synapseCollectionToDelayDistributionParams(input: unknown, options: unknown): NestTopologyResult<DelayDistributionParams>;
declare function getPositionToSpatialMap2DParams(input: unknown, options: SpatialMap2DOptions): NestTopologyResult<SpatialMap2DParams>;
declare function getPositionToSpatialMap2DParams(input: unknown, options: unknown): NestTopologyResult<SpatialMap2DParams>;

export { type AdaptEngramCorpusEntityGraphOptions, type AdaptEngramCorpusEntityGraphResult, type AdapterResult, AdjacencyMatrixParams, type BuildHostRendererInvocationInput, type BuildVizSpecInput, CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS, CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS, CORTEXEL_SKILL_VERSION, type ConnectionGraphOptions, ConnectionGraphParams, type ConnectionSnapshotOptions, type CorrelationDetectorOptions, type CorrelationDetectorStatus, CorrelationDetectorStatusSchema, CorrelogramParams, type DeclaredInputs, type DegreeDistributionOptions, type DelayDistributionOptions, DelayDistributionParams, type DelayMatrixOptions, DelayMatrixParams, type Disambiguator, type EmptySceneResult, type EngramCorpusEntityEdge, type EngramCorpusEntityEdgeKind, type EngramCorpusEntityGraphResponse, type EngramCorpusEntityNode, type EngramCorpusEntityNodeKind, type GetConnections, type GetConnectionsDataKind, GetConnectionsSchema, type GetPosition2D, GetPosition2DSchema, type GetPosition3D, GetPosition3DSchema, type GetPositionDataKind, HOST_RENDERER_EXAMPLE_PAYLOADS, HostRendererInvocation, HostRendererInvocationResult, InDegreeDistributionParams, type IsiAnalysisOptions, IsiDistributionParams, KnowledgeGraph3DParams, type MultimeterEvents, MultimeterEventsSchema, type MultimeterMultiSender, MultimeterMultiSenderSchema, type MultimeterSenderSeries, type MultimeterSplitResult, NEST_ADAPTER_LIMITS, NEST_ANALYSIS_LIMITS, NEST_INPUT_LIMITS, NEST_SKILL_REGISTRY, NEST_TOPOLOGY_LIMITS, type NestAnalysisResult, NestDeviceFamily, NestSkillId, type NestTopologyResult, type NormalizedSynapseCollectionSnapshot, OutDegreeDistributionParams, PARAM_CONSTRAINT_LANGUAGE, PARAM_VALIDATION_CONSTRAINTS, PROVENANCE_KEYS, PROVENANCE_KEY_LABELS, PROVENANCE_PARAM_CONSTRAINT_LANGUAGE, PROVENANCE_VALUE_CONSTRAINTS, type ParamValidationConstraint, type PopulationRateOptions, PopulationRateParams, type PopulationRatePopulation, PositionScope, type ProvenanceKey, ProvenanceKeyEnum, type ProvenanceOverrides, type ProvenanceParamConstraint, type ProvenanceValueConstraint, type PsthAnalysisOptions, PsthParams, ROUTING_DISCRIMINATORS, RendererRoute, type RequiredProvenanceFlags, type RouteDataKind, type RouteInput, type RouteResult, SKILL_EXAMPLE_PAYLOADS, SKILL_REGISTRY, STRICT_INVOCATION_POLICY, STRICT_PROVENANCE_POLICY, SceneData, SceneName, type SkillContract, type SkillDescriptor, type SkillExample, SkillInvocationError, SkillInvocationResult, SnapshotScope, type SpatialMap2DOptions, SpatialMap2DParams, type SpikeDataKind, type SpikeRecorderEvents, SpikeRecorderEventsSchema, VizSpec, type WeightMatrixOptions, WeightMatrixParams, type WeightRecorderEvents, WeightRecorderEventsSchema, type WeightRecorderSplitResult, type WeightSynapseSeries, adaptEngramCorpusEntityGraph, buildHostRendererInvocation, buildVizSpec, conservativeProvenance, correlationDetectorToCorrelogramParams, declaredProvenanceValueError, describeSkill, describeSkills, detectEmptyScene, formatInvocationErrors, getConnectionsToSceneData, getExamplePayload, getHostRendererExamplePayload, getInvocationExamplePayload, getPositionToSceneData, getPositionToSpatialMap2DParams, getSkill, isProvenanceKey, listSkills, multimeterToSceneData, normalizeDeclaredProvenanceInputs, normalizeDeclaredProvenanceValue, normalizeSynapseCollectionSnapshot, provenanceParamConstraintError, routeToScene, skillParamsJsonSchema, spikeRecorderToIsiParams, spikeRecorderToPopulationRateParams, spikeRecorderToSceneData, spikeTrialsToPsthParams, splitMultimeterBySender, splitWeightRecorderBySynapse, synapseCollectionToAdjacencyMatrixParams, synapseCollectionToConnectionGraphParams, synapseCollectionToDelayDistributionParams, synapseCollectionToDelayMatrixParams, synapseCollectionToInDegreeDistributionParams, synapseCollectionToOutDegreeDistributionParams, synapseCollectionToWeightMatrixParams, toPortableJsonSchema, validateSpec, weightRecorderToSceneData };
