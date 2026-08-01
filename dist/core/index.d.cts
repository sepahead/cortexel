import { V as VizSpec } from '../vizSpec-Bfwh_kq9.cjs';
export { A as AXIS_COLORS, B as BATLOW_GLSL, C as CATEGORICAL, a as CORTEXEL_JSON_LIMITS, b as CORTEXEL_JSON_POLICY, c as CORTEXEL_PALETTE, d as CORTEXEL_SPEC_VERSION, e as CORTICAL_LAYER_COLORS, f as ColormapName, D as DECLARED_INPUTS_PORTABLE_SCHEMA, E as ENVELOPE_NORMALIZATION_POLICY, J as JSON_BUDGET_SEMANTICS, g as JSON_PARAMS_PORTABLE_SCHEMA, h as JsonParamsSchema, N as NUMERIC_MODEL_POLICY, O as OKABE_ITO, P as PALETTE_REGISTRY_POLICY, i as PaletteEntry, j as PaletteMetadata, k as PaletteName, l as ProvenanceSchema, m as RGB, n as ReadonlyPaletteMetadata, R as ReadonlySemanticPalette, S as SEMANTIC_PALETTE_KEYS, o as STRING_NORMALIZATION_POLICY, p as SYNAPSE_COLORS, q as SemanticPalette, T as TURBO_GLSL, r as VIK_GLSL, s as VIRIDIS_GLSL, t as VizSpecSchema, u as VizSpecValidation, v as categorical, w as colormapGradient, x as colormapHex, y as colormapRgba, z as colormapSvgStops, F as getPalette, G as getPaletteEntry, H as isRegisteredPalette, I as listPalettes, K as registerPalette, L as sampleColormap, M as validatePalette, Q as validateVizSpec } from '../vizSpec-Bfwh_kq9.cjs';
import { N as NestSkillId, b as NestDeviceFamily, S as SceneName, R as RendererRoute, H as HostRendererInvocation, c as HostRendererInvocationResult, d as SkillInvocationResult, a as SkillInvocationError, e as SceneData } from '../hostInvocation-CQH54EH3.cjs';
export { C as CAMERA_PRESETS, f as CONSERVATIVE_PROVENANCE, g as CameraPreset, h as CameraPresetName, i as HONESTY_POLICY, j as HostRendererInvocationSchema, L as LayerConfig, k as NEST_DEVICE_FAMILIES, l as NEST_SKILL_IDS, m as NeuralSceneHandle, n as NeuralSceneMode, o as NeuralSceneProps, p as PlaybackState, P as ProvenanceMetadata, q as SCENE_FRAMING, r as SCENE_NAMES, s as SKILL_IDS, t as STDPSynapse, u as SceneFraming, v as SkillId, w as SkillParamsResult, V as VALID_RENDERER_ROUTES, x as VIZ_ROUTER_ID, y as VizRouterId, z as composeHonestyCaption, A as defaultHonestyCaption, B as isNestSkillId, D as isSkillId, E as mandatoryDisclosure, F as requiresHonestyCaption, G as validateHostRendererInvocation, I as validateHostRendererSpec, J as validateSkillInvocation, K as validateSkillParams } from '../hostInvocation-CQH54EH3.cjs';
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
    globallyKnownButSkillUnclassifiedKeys: "reject";
    allowedDeclaredInputKeys: readonly ["device_id", "recorded_variable", "units", "sampling_interval", "recorder_id", "sender_ids", "population_labels", "time_units", "source_ids", "target_ids", "synapse_model", "weight_units", "extent", "spatial_units", "mask", "kernel", "projection_sample_policy", "morphology_disclaimer", "frame_rate", "state_variables", "derivation_method", "model_context", "fixed_parameters", "bin_ms", "histogram_normalization", "interval_scope", "event_alignment", "psth_aggregation", "connection_sample_policy", "snapshot_time_ms", "snapshot_scope", "parallel_edge_policy", "matrix_axis_order", "matrix_aggregation", "delay_units", "degree_direction", "degree_counting", "zero_degree_policy", "node_ids", "position_scope", "detector_id", "reference_population", "target_population", "correlation_normalization", "correlation_units", "lag_convention", "binning_policy", "stim_units", "rate_normalization", "graph_source", "graph_snapshot_id", "graph_scope", "identity_advisory"];
    perSkillAllowedKeys: "skill.requiredProvenanceKeys union skill.optionalProvenanceKeys";
    requiredKeysSource: "skill.requiredProvenanceKeys";
    presentKnownValues: "validate every present per-skill allowed key with provenanceValueConstraints";
    requiredKeysControl: "required keys control presence; optional keys are allowed only when classified by the selected skill";
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
    kind: 'canonical_id_collection';
    normalize: 'trim';
    canonicalization: 'RFC8785';
    idDomain: 'nonnegative_safe_integer';
    unique: true;
    allowDigest: true;
    allowOpaqueDigestCount: true;
} | {
    kind: 'canonical_positive_finite_number_array';
    normalize: 'trim';
    canonicalization: 'RFC8785';
    allowedLengths: readonly number[];
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
type ProvenanceParamConstraint = ({
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
} | {
    kind: 'one_of_literals';
    provenanceKey: ProvenanceKey;
    values: readonly (string | number | true)[];
    description: string;
} | {
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
} | {
    kind: 'each_label_matches_variable';
    provenanceKey: ProvenanceKey;
    /** Dot-separated own-property path to the checked series-label array. */
    paramPath: string;
    separator: string;
    description: string;
} | {
    kind: 'matches_canonical_json_param';
    provenanceKey: ProvenanceKey;
    /** Dot-separated own-property path to a checked JSON array/tuple. */
    paramPath: string;
    /** Large arrays may be represented by their RFC 8785 SHA-256 digest. */
    allowDigest: boolean;
    description: string;
} | {
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
} | {
    kind: 'all_projected_values_equal';
    provenanceKey: ProvenanceKey;
    /** Dot-separated own-property path to a checked object array. */
    paramPath: string;
    field: string;
    /** Empty/all-absent projections are externally unverifiable and pass. */
    emptyPolicy: 'pass_unverifiable';
    description: string;
} | {
    kind: 'canonical_json_array_length_matches_param';
    provenanceKey: ProvenanceKey;
    /** Dot-separated own-property path to a checked non-negative count. */
    paramPath: string;
    idDomain: 'nonnegative_safe_integer' | 'nonblank_string';
    relation: 'equals' | 'at_least' | 'nonempty_if_positive';
    allowOpaqueDigestCount: boolean;
    description: string;
} | {
    kind: 'canonical_json_array_length_equals';
    provenanceKey: ProvenanceKey;
    expectedLength: number;
    description: string;
} | {
    kind: 'canonical_json_array_length_at_least_projected_sum';
    provenanceKey: ProvenanceKey;
    /** Dot-separated own-property path to a checked object array. */
    paramPath: string;
    field: string;
    idDomain: 'nonnegative_safe_integer' | 'nonblank_string';
    allowOpaqueDigestCount: boolean;
    description: string;
}) & {
    /** False for a supplemental contradiction check that cannot establish the
     * source-level provenance claim by itself. */
    establishesBinding?: boolean;
};
declare const PROVENANCE_PARAM_CONSTRAINT_LANGUAGE: Readonly<{
    version: "4";
    evaluationOrder: readonly string[];
    kinds: readonly ["equals_param", "equals_param_path", "equals_literal", "one_of_literals", "matches_regular_time_axis", "each_label_matches_variable", "matches_canonical_json_param", "matches_projected_id_collection", "all_projected_values_equal", "canonical_json_array_length_matches_param", "canonical_json_array_length_equals", "canonical_json_array_length_at_least_projected_sum"];
    semantics: Readonly<{
        equals_param: "declared value must equal one checked top-level params property under Object.is";
        equals_param_path: "declared value must equal the checked scalar reached through a dot-separated sequence of safe own data-property names under Object.is";
        equals_literal: "declared value must equal the contract literal under Object.is";
        one_of_literals: "declared value must equal one contract literal under Object.is";
        matches_regular_time_axis: Readonly<{
            timeArray: "the checked array contains at least two finite, strictly increasing binary64 timestamps";
            declaredInterval: "a positive finite binary64 number";
            binary64Epsilon: number;
            relativeScale: "max(abs(right-left), abs(declaredInterval))";
            candidateRoundoff: "roundoffUlps * binary64Epsilon * max(abs(left), abs(right), abs(declaredInterval))";
            roundoffCap: "maxRoundoffFraction * abs(declaredInterval)";
            boundedRoundoff: "candidateRoundoff when candidateRoundoff <= roundoffCap, otherwise 0";
            tolerance: "absoluteTolerance + relativeTolerance * relativeScale + boundedRoundoff";
            acceptance: "for every adjacent pair, abs((right-left)-declaredInterval) <= tolerance";
        }>;
        each_label_matches_variable: "every checked series label must either exactly equal the declared recorded variable or consist of a nonblank series identity, the exact published separator, and the exact declared variable as its terminal segment";
        matches_canonical_json_param: "the declared string must be either the RFC 8785 canonical JSON serialization of the checked array/tuple or, when allowDigest=true, its sha256:<64 lowercase hex> RFC 8785 digest";
        matches_projected_id_collection: "project an optional own id field from every item of the checked array; direct id arrays contain unique members in the published idDomain (non-negative safe integers or nonblank strings); ordered equality preserves order, set equality compares unique members, and contains requires every projected member to occur in the declared canonical JSON array; an exact equality digest is sha256 over RFC 8785 canonical JSON of the projected sequence (for set comparison, remove later duplicates while preserving first encounter order); when allowOpaqueDigestCount=true on a supplemental external contains check, sha256:<64 lowercase hex>;count:<n> cannot prove membership or preimage type but must declare at least the number of distinct observed ids";
        all_projected_values_equal: "when projected values exist, every present projected scalar must equal the declared value under Object.is; an empty or all-absent projection remains externally unverifiable and follows emptyPolicy";
        canonical_json_array_length_matches_param: "the declared collection is either a canonical JSON array of unique ids in the published idDomain or, when allowed, sha256:<64 lowercase hex>;count:<non-negative safe integer>; relation=equals requires its item count to equal the checked non-negative safe-integer param, relation=at_least requires at least that count, and relation=nonempty_if_positive requires at least one declared id exactly when the checked param is positive (zero permits an empty collection); the last relation rejects a provably empty endpoint universe without claiming to identify its members";
        canonical_json_array_length_equals: "the declared value must be an RFC 8785 canonical JSON array with exactly expectedLength elements; this per-skill shape check does not establish that an external declaration is true";
        canonical_json_array_length_at_least_projected_sum: "the declared collection is a unique id array or allowed opaque digest+count, and its item count must be at least the safe-integer sum of the non-negative safe-integer field projected from the checked object array; this checks the disjoint selected-population denominator lower bound without claiming to recover member identity";
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

/**
 * Shared zero-dependency limits for evidence-bearing knowledge-graph records.
 * Render-only entrypoints enforce these without pulling zod into their bundle.
 */
declare const KNOWLEDGE_GRAPH_LIMITS: Readonly<{
    /** Accepted presentation/inspection limits. These match the legacy params gate. */
    maxPresentationNodes: 1000;
    maxPresentationEdges: 4000;
    /**
     * Main-thread d3-force refinement limits. Above either bound the canonical
     * composition retains the caption and complete DOM records but does not mount
     * the live 3D solver. These are resource ceilings, not portable FPS claims.
     */
    maxLiveForceNodes: 250;
    maxLiveForceEdges: 1000;
    /**
     * Aggregate presentation limits apply across every retained occurrence. Aliased
     * containers receive no amortization: each occurrence is inspected and copied.
     */
    maxPresentationRetainedOccurrences: 250000;
    maxPresentationStringCodeUnits: 4000000;
    maxPresentationInspectionWork: 1000000;
    /** A view can explicitly name every kind present in its bounded source. */
    maxViewNodeKinds: 1000;
    maxViewEdgeKinds: 4000;
    /** Equivalent hot-path policies reuse one token without unbounded cache growth. */
    maxCachedViewsPerPresentation: 128;
    /** Strong raw-JSON boundary, before a presentation object is materialized. */
    maxPresentationRawInputBytes: 16000000;
    maxPresentationJsonDepth: 8;
    maxPresentationJsonNodes: 300000;
    maxPresentationJsonNumberTokenLength: 100;
    maxNodeIdLength: 120;
    maxNodeLabelLength: 240;
    maxEdgeIdLength: 320;
    maxEdgeLabelLength: 160;
    maxKindLength: 80;
    maxColorLength: 64;
    maxRadiusMeaningLength: 400;
    maxAttributes: 24;
    maxAttributeKeyLength: 80;
    maxAttributeArrayItems: 16;
    maxEvidenceRefsPerElement: 8;
    maxEvidenceIdLength: 384;
    maxRecordIdLength: 320;
    maxLocatorLength: 240;
    maxPaperIdLength: 160;
    maxCitationIdLength: 160;
    maxSourceIdLength: 240;
    maxDoiLength: 240;
    maxParallelEdgesPerPair: 9;
    maxDetailLength: 1000;
    maxAttributeStringLength: 500;
    maxExcerptLength: 1000;
}>;

/** Public validation budgets. Hosts with larger corpora should pass handles or
 *  pre-aggregate instead of sending an unbounded inline payload to a browser. */
declare const PARAM_LIMITS: Readonly<{
    maxSamples: 50000;
    maxSeries: 256;
    maxTopologyNodes: 25000;
    maxTopologyEdges: 20000;
    maxSpatialObjects: 50000;
    maxGraphNodes: 1000;
    maxGraphEdges: 4000;
}>;
/** RFC 3339 timestamp with a required seconds component and explicit UTC/
 * numeric offset. Zod's ISO datetime check validates calendar dates and offset
 * ranges; the second pattern closes its optional-seconds extension so portable
 * hosts receive the same strict contract. */
declare const Rfc3339TimestampSchema: z.ZodISODateTime;
declare const VoltageTraceParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    series: z.ZodArray<z.ZodArray<z.ZodNumber>>;
    series_labels: z.ZodArray<z.ZodString>;
    units: z.ZodString;
}, z.core.$strict>;
type VoltageTraceParams = z.infer<typeof VoltageTraceParamsSchema>;
declare const SpikeRasterParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    senders: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
type SpikeRasterParams = z.infer<typeof SpikeRasterParamsSchema>;
/** Portable tolerances shared by the TypeScript gate and manifest constraints.
 * Geometry is purely scale-relative: a fixed absolute epsilon would have physical
 * units and could dwarf a legitimately tiny time or weight bin. Normalized-mass
 * comparisons use a wider tolerance because they accumulate many binary64 values. */
declare const HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE = 0;
declare const HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE = 1e-9;
/** Bounded allowance for binary64 center ± half-width edge arithmetic. */
declare const HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS = 4;
/** No geometry repair may move a boundary by more than this fraction of its
 * local bin width or half-extent, regardless of absolute coordinate origin. */
declare const GEOMETRY_MAX_ROUNDOFF_FRACTION = 1e-7;
declare const HISTOGRAM_MASS_TOLERANCE = 0.000001;
declare const PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE = 0.000001;
/** Population-rate values are derived from integer event counts. Binary64
 * hosts compare the published rate with the specified operation order and this
 * mixed tolerance; a relative component is necessary for legitimately high
 * rates while the absolute term keeps zero/small rates stable. */
declare const POPULATION_RATE_ABSOLUTE_TOLERANCE = 1e-9;
declare const POPULATION_RATE_RELATIVE_TOLERANCE = 1e-9;
declare const IsiDistributionParamsSchema: z.ZodObject<{
    bin_centers_ms: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
        probability_density: "probability_density";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
        "1/ms": "1/ms";
    }>;
    interval_scope: z.ZodEnum<{
        per_sender: "per_sender";
        single_train: "single_train";
    }>;
}, z.core.$strict>;
type IsiDistributionParams = z.infer<typeof IsiDistributionParamsSchema>;
declare const PsthParamsSchema: z.ZodObject<{
    bin_centers_ms: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    normalization: z.ZodEnum<{
        count: "count";
        count_per_trial: "count_per_trial";
        rate_hz: "rate_hz";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        "count/trial": "count/trial";
        Hz: "Hz";
    }>;
    trial_count: z.ZodNumber;
    alignment_event: z.ZodString;
    aggregation: z.ZodLiteral<"selected_senders_per_trial">;
}, z.core.$strict>;
type PsthParams = z.infer<typeof PsthParamsSchema>;
declare const PopulationRateParamsSchema: z.ZodObject<{
    bin_centers_ms: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    window_start_ms: z.ZodNumber;
    window_stop_ms: z.ZodNumber;
    series: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        recorded_sender_count: z.ZodNumber;
        spike_counts: z.ZodArray<z.ZodNumber>;
        rates_hz: z.ZodArray<z.ZodNumber>;
    }, z.core.$strict>>;
    normalization: z.ZodLiteral<"mean_per_recorded_sender_hz">;
    aggregation: z.ZodLiteral<"selected_senders">;
    binning: z.ZodLiteral<"left_closed_right_open">;
}, z.core.$strict>;
type PopulationRateParams = z.infer<typeof PopulationRateParamsSchema>;
declare const RateResponseParamsSchema: z.ZodObject<{
    stimulus_amplitudes: z.ZodArray<z.ZodNumber>;
    rates_hz: z.ZodArray<z.ZodNumber>;
    stimulus_units: z.ZodString;
}, z.core.$strict>;
type RateResponseParams = z.infer<typeof RateResponseParamsSchema>;
declare const NetworkParamsSchema: z.ZodObject<{
    sources: z.ZodArray<z.ZodNumber>;
    targets: z.ZodArray<z.ZodNumber>;
    weights: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    delays: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    weight_units: z.ZodOptional<z.ZodString>;
    delay_units: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
type NetworkParams = z.infer<typeof NetworkParamsSchema>;
declare const SnapshotScopeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"single_process_complete">;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"mpi_target_rank_local">;
    rank: z.ZodNumber;
    world_size: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"mpi_all_ranks_merged">;
    world_size: z.ZodNumber;
}, z.core.$strict>], "kind">;
type SnapshotScope = z.infer<typeof SnapshotScopeSchema>;
declare const PositionScopeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"single_process_complete">;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"mpi_rank_local">;
    rank: z.ZodNumber;
    world_size: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"mpi_all_ranks_merged">;
    world_size: z.ZodNumber;
}, z.core.$strict>], "kind">;
type PositionScope = z.infer<typeof PositionScopeSchema>;
declare const ConnectionGraphParamsSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        label: z.ZodString;
    }, z.core.$strict>>;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        source: z.ZodNumber;
        target: z.ZodNumber;
        weight: z.ZodOptional<z.ZodNumber>;
        delay_ms: z.ZodOptional<z.ZodNumber>;
        synapse_model: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    weight_units: z.ZodOptional<z.ZodString>;
    delay_units: z.ZodOptional<z.ZodLiteral<"ms">>;
    layout: z.ZodLiteral<"schematic_circle">;
    parallel_edges: z.ZodLiteral<"preserved">;
    self_connections: z.ZodLiteral<"preserved">;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
    sample_policy: z.ZodEnum<{
        complete: "complete";
        deterministic_even_stride: "deterministic_even_stride";
    }>;
    source_connection_count: z.ZodNumber;
    edge_identity: z.ZodEnum<{
        nest_connection_identifier: "nest_connection_identifier";
        canonical_sorted_ordinal: "canonical_sorted_ordinal";
    }>;
}, z.core.$strict>;
type ConnectionGraphParams = z.infer<typeof ConnectionGraphParamsSchema>;
declare const AdjacencyMatrixParamsSchema: z.ZodObject<{
    cells: z.ZodArray<z.ZodObject<{
        source_id: z.ZodNumber;
        target_id: z.ZodNumber;
        connection_count: z.ZodNumber;
    }, z.core.$strict>>;
    display: z.ZodLiteral<"binary_presence">;
    aggregation: z.ZodLiteral<"any_connection">;
    source_ids: z.ZodArray<z.ZodNumber>;
    target_ids: z.ZodArray<z.ZodNumber>;
    axis_order: z.ZodLiteral<"target_rows_source_columns">;
    absent_cell: z.ZodLiteral<"no_connection">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type AdjacencyMatrixParams = z.infer<typeof AdjacencyMatrixParamsSchema>;
declare const WeightMatrixParamsSchema: z.ZodObject<{
    cells: z.ZodArray<z.ZodObject<{
        source_id: z.ZodNumber;
        target_id: z.ZodNumber;
        connection_count: z.ZodNumber;
        value: z.ZodNumber;
    }, z.core.$strict>>;
    weight_units: z.ZodString;
    aggregation: z.ZodEnum<{
        minimum: "minimum";
        maximum: "maximum";
        sum: "sum";
        mean: "mean";
        single_connection: "single_connection";
    }>;
    source_ids: z.ZodArray<z.ZodNumber>;
    target_ids: z.ZodArray<z.ZodNumber>;
    axis_order: z.ZodLiteral<"target_rows_source_columns">;
    absent_cell: z.ZodLiteral<"no_connection">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type WeightMatrixParams = z.infer<typeof WeightMatrixParamsSchema>;
declare const DelayMatrixParamsSchema: z.ZodObject<{
    cells: z.ZodArray<z.ZodObject<{
        source_id: z.ZodNumber;
        target_id: z.ZodNumber;
        connection_count: z.ZodNumber;
        value: z.ZodNumber;
    }, z.core.$strict>>;
    delay_units: z.ZodLiteral<"ms">;
    aggregation: z.ZodEnum<{
        minimum: "minimum";
        maximum: "maximum";
        mean: "mean";
        single_connection: "single_connection";
    }>;
    source_ids: z.ZodArray<z.ZodNumber>;
    target_ids: z.ZodArray<z.ZodNumber>;
    axis_order: z.ZodLiteral<"target_rows_source_columns">;
    absent_cell: z.ZodLiteral<"no_connection">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type DelayMatrixParams = z.infer<typeof DelayMatrixParamsSchema>;
declare const InDegreeDistributionParamsSchema: z.ZodObject<{
    degrees: z.ZodArray<z.ZodNumber>;
    node_counts: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    node_count: z.ZodNumber;
    connection_count: z.ZodNumber;
    direction: z.ZodLiteral<"in">;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    edge_counting: z.ZodLiteral<"each_synapse_collection_entry">;
    zero_degree_policy: z.ZodLiteral<"include_declared_universe">;
    sample_policy: z.ZodLiteral<"complete">;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type InDegreeDistributionParams = z.infer<typeof InDegreeDistributionParamsSchema>;
declare const OutDegreeDistributionParamsSchema: z.ZodObject<{
    degrees: z.ZodArray<z.ZodNumber>;
    node_counts: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    node_count: z.ZodNumber;
    connection_count: z.ZodNumber;
    direction: z.ZodLiteral<"out">;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    edge_counting: z.ZodLiteral<"each_synapse_collection_entry">;
    zero_degree_policy: z.ZodLiteral<"include_declared_universe">;
    sample_policy: z.ZodLiteral<"complete">;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type OutDegreeDistributionParams = z.infer<typeof OutDegreeDistributionParamsSchema>;
declare const DelayDistributionParamsSchema: z.ZodObject<{
    bin_centers_ms: z.ZodArray<z.ZodNumber>;
    delay_counts: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    window_start_ms: z.ZodNumber;
    window_stop_ms: z.ZodNumber;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
        probability_density: "probability_density";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
        "1/ms": "1/ms";
    }>;
    delay_units: z.ZodLiteral<"ms">;
    aggregation: z.ZodLiteral<"each_connection">;
    binning: z.ZodLiteral<"left_closed_right_open">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type DelayDistributionParams = z.infer<typeof DelayDistributionParamsSchema>;
/** Spatial bounds use a dimensionless extent-relative tolerance plus a small,
 * explicitly bounded allowance for the two binary64 operations that derive an
 * axis bound from center ± extent/2. */
declare const SPATIAL_BOUNDS_ROUNDOFF_ULPS = 2;
declare const SpatialMap2DParamsSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        label: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strict>>;
    coordinate_units: z.ZodString;
    extent: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    center: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    edge_wrap: z.ZodBoolean;
    position_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
    marker_size: z.ZodLiteral<"fixed_screen_space">;
}, z.core.$strict>;
type SpatialMap2DParams = z.infer<typeof SpatialMap2DParamsSchema>;
declare const WeightHistogramParamsSchema: z.ZodObject<{
    bin_centers: z.ZodArray<z.ZodNumber>;
    weight_counts: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width: z.ZodNumber;
    window_start: z.ZodNumber;
    window_stop: z.ZodNumber;
    weight_units: z.ZodString;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    aggregation: z.ZodLiteral<"each_connection">;
    binning: z.ZodLiteral<"left_closed_right_open">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type WeightHistogramParams = z.infer<typeof WeightHistogramParamsSchema>;
declare const Spatial3DParamsSchema: z.ZodObject<{
    objects: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$loose>>;
    coordinate_units: z.ZodString;
}, z.core.$strict>;
type Spatial3DParams = z.infer<typeof Spatial3DParamsSchema>;
declare const PlasticityParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    weights: z.ZodArray<z.ZodNumber>;
    weight_units: z.ZodString;
}, z.core.$strict>;
type PlasticityParams = z.infer<typeof PlasticityParamsSchema>;
declare const PhasePlaneParamsSchema: z.ZodObject<{
    grid: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodNumber>>;
    derivatives: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodNumber>>;
    axis_units: z.ZodRecord<z.ZodString, z.ZodString>;
    derivative_units: z.ZodRecord<z.ZodString, z.ZodString>;
    derivative_time_unit: z.ZodEnum<{
        ms: "ms";
        s: "s";
    }>;
    axis_order: z.ZodTuple<[z.ZodString, z.ZodString], null>;
    flattening: z.ZodLiteral<"row-major-last-axis-fastest">;
}, z.core.$strict>;
type PhasePlaneParams = z.infer<typeof PhasePlaneParamsSchema>;
declare const AstrocyteParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    ca_trace: z.ZodArray<z.ZodNumber>;
    units: z.ZodEnum<{
        uM: "uM";
        µM: "µM";
        μM: "μM";
    }>;
}, z.core.$strict>;
type AstrocyteParams = z.infer<typeof AstrocyteParamsSchema>;
declare const CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS: readonly ["paper", "model", "family"];
declare const CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS: readonly ["cites", "same_as", "variant_of", "instantiates", "belongs_to_family"];
declare const KnowledgeGraph3DParamsSchema: z.ZodObject<{
    graph_id: z.ZodString;
    graph_source: z.ZodString;
    graph_snapshot_id: z.ZodString;
    graph_scope: z.ZodLiteral<"corpus_entity">;
    generated_at: z.ZodISODateTime;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            paper: "paper";
            model: "model";
            family: "family";
        }>;
        label: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        attributes: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>, z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>]>>;
        epistemic: z.ZodObject<{
            status: z.ZodLiteral<"derived_advisory">;
            advisory_only: z.ZodLiteral<true>;
            is_paper_local_evidence: z.ZodLiteral<false>;
            calibrated_posterior: z.ZodLiteral<false>;
        }, z.core.$strict>;
        evidence: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"graph_snapshot_record">;
            evidence_id: z.ZodString;
            record_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"graph_node">;
            evidence_id: z.ZodString;
            node_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"citation">;
            evidence_id: z.ZodString;
            paper_id: z.ZodString;
            citation_id: z.ZodString;
            page: z.ZodOptional<z.ZodNumber>;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
            doi: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"external_source">;
            evidence_id: z.ZodString;
            source_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>], "kind">>;
        uncalibrated_score: z.ZodOptional<z.ZodObject<{
            kind: z.ZodEnum<{
                extraction_confidence: "extraction_confidence";
                citation_resolution_confidence: "citation_resolution_confidence";
                structural_similarity: "structural_similarity";
                behavioral_agreement: "behavioral_agreement";
                retrieval_relevance: "retrieval_relevance";
            }>;
            value: z.ZodNumber;
            calibrated_posterior: z.ZodLiteral<false>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        source: z.ZodString;
        target: z.ZodString;
        kind: z.ZodEnum<{
            cites: "cites";
            same_as: "same_as";
            variant_of: "variant_of";
            instantiates: "instantiates";
            belongs_to_family: "belongs_to_family";
        }>;
        label: z.ZodString;
        attributes: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>, z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>]>>;
        epistemic: z.ZodObject<{
            status: z.ZodLiteral<"derived_advisory">;
            advisory_only: z.ZodLiteral<true>;
            is_paper_local_evidence: z.ZodLiteral<false>;
            calibrated_posterior: z.ZodLiteral<false>;
        }, z.core.$strict>;
        evidence: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"graph_snapshot_record">;
            evidence_id: z.ZodString;
            record_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"graph_node">;
            evidence_id: z.ZodString;
            node_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"citation">;
            evidence_id: z.ZodString;
            paper_id: z.ZodString;
            citation_id: z.ZodString;
            page: z.ZodOptional<z.ZodNumber>;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
            doi: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"external_source">;
            evidence_id: z.ZodString;
            source_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>], "kind">>;
        uncalibrated_score: z.ZodOptional<z.ZodObject<{
            kind: z.ZodEnum<{
                extraction_confidence: "extraction_confidence";
                citation_resolution_confidence: "citation_resolution_confidence";
                structural_similarity: "structural_similarity";
                behavioral_agreement: "behavioral_agreement";
                retrieval_relevance: "retrieval_relevance";
            }>;
            value: z.ZodNumber;
            calibrated_posterior: z.ZodLiteral<false>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
type KnowledgeGraph3DParams = z.infer<typeof KnowledgeGraph3DParamsSchema>;
declare const Spatial2DParamsSchema: z.ZodObject<{
    positions: z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    coordinate_units: z.ZodString;
}, z.core.$strict>;
type Spatial2DParams = z.infer<typeof Spatial2DParamsSchema>;
declare const CorrelogramParamsSchema: z.ZodObject<{
    lags_ms: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    tau_max_ms: z.ZodNumber;
    counting_start_ms: z.ZodNumber;
    counting_stop_ms: z.ZodNumber;
    pair: z.ZodObject<{
        reference_label: z.ZodString;
        target_label: z.ZodString;
    }, z.core.$strict>;
    lag_convention: z.ZodLiteral<"positive_target_after_reference">;
    binning: z.ZodLiteral<"left_closed_right_open">;
    zero_lag_policy: z.ZodEnum<{
        included: "included";
        excluded_self_pairs: "excluded_self_pairs";
    }>;
    statistic: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"raw_pair_count">;
        units: z.ZodLiteral<"count">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"weighted_pair_sum">;
        units: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"pair_rate_hz">;
        units: z.ZodLiteral<"Hz">;
        exposure_s: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"pearson_coefficient">;
        units: z.ZodLiteral<"1">;
        sample_count: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type CorrelogramParams = z.infer<typeof CorrelogramParamsSchema>;
declare const StimulusResponseParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    stimulus: z.ZodArray<z.ZodNumber>;
    response: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
type StimulusResponseParams = z.infer<typeof StimulusResponseParamsSchema>;
declare const CompartmentalParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    compartments: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        parent_id: z.ZodNullable<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        values: z.ZodArray<z.ZodNumber>;
    }, z.core.$strict>>;
}, z.core.$strict>;
type CompartmentalParams = z.infer<typeof CompartmentalParamsSchema>;
declare const AnimationReplayParamsSchema: z.ZodObject<{
    frames: z.ZodArray<z.ZodObject<{
        time_ms: z.ZodNumber;
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        annotation: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
type AnimationReplayParams = z.infer<typeof AnimationReplayParamsSchema>;

type EngramCorpusEntityNodeKind = (typeof CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS)[number];
type EngramCorpusEntityEdgeKind = (typeof CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS)[number];
type EngramCorpusEvidenceReference = KnowledgeGraph3DParams['nodes'][number]['evidence'][number];
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
    /** Upstream-supplied references retained exactly; Cortexel never invents anchors. */
    evidence: readonly EngramCorpusEvidenceReference[];
}
interface EngramCorpusEntityEdge {
    /** Newer producers should supply this. A legacy response may omit it only
     * when source/kind/target identifies exactly one assertion. */
    id?: string;
    source: string;
    target: string;
    kind: EngramCorpusEntityEdgeKind;
    /** Optional upstream-declared score meaning. A naked `confidence` is rejected. */
    uncalibrated_score?: {
        kind: 'citation_resolution_confidence' | 'structural_similarity';
        value: number;
        calibrated_posterior: false;
    } | null;
    /** Upstream-supplied references retained exactly; Cortexel never invents anchors. */
    evidence: readonly EngramCorpusEvidenceReference[];
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

type ProvenanceVerificationKind = 'param_bound' | 'literal_bound' | 'derived_bound' | 'external_claim';
interface ExternalProvenanceClaim {
    /** Why the checked params cannot establish this source-level assertion. */
    reason: string;
}
interface ProvenanceVerification {
    kind: ProvenanceVerificationKind;
    /** Present for external claims; absent for mechanically correlated claims. */
    reason?: string;
}
type ExternalProvenanceClaims = Readonly<Partial<Record<ProvenanceKey, ExternalProvenanceClaim>>>;
declare function provenanceVerificationForContract(contract: Pick<SkillContract, 'id' | 'requiredProvenanceKeys' | 'provenanceParamConstraints' | 'externalProvenanceClaims' | 'optionalProvenanceKeys'>): Partial<Record<ProvenanceKey, ProvenanceVerification>>;
declare function externalProvenanceDisclosure(contract: Pick<SkillContract, 'requiredProvenanceKeys' | 'externalProvenanceClaims'>): string | null;
declare const CORTEXEL_SKILL_VERSION = "1.8.0";
declare const STRICT_INVOCATION_POLICY: Readonly<{
    version: "3";
    externalSelection: "validateSkillInvocation(id,payload): explicit id selects; payload.skill is optional but must match when present";
    selfDescribingSelection: "validateSpec(payload): payload.skill is required and selects the contract";
    hostSelection: "host envelopes require payload.skill; explicit id and payload.skill must match";
    unknownSkillIds: "reject";
    cortexelEnvelope: "allowed iff contract.scene is non-null; payload.scene must equal contract.scene";
    hostEnvelope: "allowed iff contract.scene is null; scene is forbidden";
    rendererRoute: "when selected, must occur in contract.rendererRoutes";
    params: "validate paramsJsonSchema then every paramConstraint";
    provenance: "apply strictProvenancePolicy, require every contract.requiredProvenanceFlags value, then evaluate every provenanceParamConstraint";
    provenanceVerification: "every allowed required or optional provenance key is classified exactly once as parameter/literal/derived-bound or an externally unverifiable caller claim with mandatory disclosure; all other declared keys reject";
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
    kind: 'equal_length' | 'each_length_matches' | 'monotonic_non_decreasing' | 'strictly_increasing' | 'non_negative' | 'property_count' | 'unique_field' | 'unique_tuple' | 'references_exist' | 'no_self_loops' | 'same_keys' | 'cartesian_product_length' | 'permutation_of_keys' | 'endpoint_kinds' | 'mapped_value' | 'conditional_numeric_domain' | 'uniform_histogram_bins' | 'normalized_histogram_mass' | 'psth_derived_counts' | 'max_parallel_edges' | 'each_unique_field' | 'each_contains_field_value' | 'node_score_kind' | 'edge_score_kind' | 'ordered_interval' | 'uniform_bin_window' | 'population_rate_derived_values' | 'symmetric_lag_axis' | 'legacy_connection_channels' | 'connection_graph_snapshot' | 'matrix_connection_counts' | 'degree_distribution_consistency' | 'delay_distribution_consistency' | 'weight_histogram_consistency' | 'spatial_extent_bounds' | 'scope_compatibility' | 'phase_plane_direction_basis' | 'acyclic';
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
    /** Required source-level claims that cannot be established from the checked
     * params. These remain structurally validated and receive a mandatory
     * contract-owned disclosure instead of being presented as machine-verified. */
    externalProvenanceClaims?: ExternalProvenanceClaims;
    /** Non-required known claims that receive a consistency check when present. */
    optionalProvenanceKeys?: readonly ProvenanceKey[];
    rendererRoutes: readonly RendererRoute[];
    examples: readonly SkillExample[];
}
/** Versioned evaluator contract for ParamValidationConstraint paths. This is a
 *  deliberately tiny JSONPath subset so non-TS hosts do not have to guess how
 *  `[*]`, `*`, or `?` are interpreted. */
declare const PARAM_CONSTRAINT_LANGUAGE: Readonly<{
    version: "11";
    pathSyntax: "dot-separated object keys";
    arrayWildcard: "[*]";
    objectValueWildcard: "*";
    optionalSuffix: "?";
    evaluationOrder: readonly string[];
    kinds: readonly ["equal_length", "each_length_matches", "monotonic_non_decreasing", "strictly_increasing", "non_negative", "property_count", "unique_field", "unique_tuple", "references_exist", "no_self_loops", "same_keys", "cartesian_product_length", "permutation_of_keys", "endpoint_kinds", "mapped_value", "conditional_numeric_domain", "uniform_histogram_bins", "normalized_histogram_mass", "psth_derived_counts", "max_parallel_edges", "each_unique_field", "each_contains_field_value", "node_score_kind", "edge_score_kind", "ordered_interval", "uniform_bin_window", "population_rate_derived_values", "symmetric_lag_axis", "legacy_connection_channels", "connection_graph_snapshot", "matrix_connection_counts", "degree_distribution_consistency", "delay_distribution_consistency", "weight_histogram_consistency", "spatial_extent_bounds", "scope_compatibility", "phase_plane_direction_basis", "acyclic"];
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
        strictly_increasing: Readonly<{
            pathRoles: "each path resolves an ordered numeric sequence";
            rule: "for every adjacent pair previous < next";
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
            rule: "width and width/2 are positive and finite; every binary64 center-width/2 and center+width/2 edge is finite and strictly straddles its center; every represented edge span approximately equals width; adjacent represented edges meet within the bounded local-width/origin-roundoff tolerance; centers are strictly increasing; each adjacent delta approximately equals width";
            comparison: "abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))";
            internalEdgeComparison: "exact equality passes; otherwise origin-scaled roundoffUlps * 2^-52 must not exceed maxRoundoffFraction * abs(width), and abs(nextLeft-previousRight) <= absoluteTolerance + relativeTolerance * abs(width) + that bounded roundoff";
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
            rule: "width/2 remains positive and finite; every binary64 center-width/2 and center+width/2 edge is finite and strictly straddles its center; every represented edge span approximately equals width; adjacent represented edges meet within the bounded local-width/origin-roundoff tolerance; centers are strictly increasing and uniformly spaced by width; firstCenter-width/2 equals start and lastCenter+width/2 equals stop";
            binning: "left-closed, right-open bins tile [start,stop) within the published bounded binary64 geometry tolerance";
            spacingComparison: "adjacent center deltas use abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual),abs(expected))";
            internalEdgeComparison: "exact equality passes; otherwise origin-scaled roundoffUlps * 2^-52 must not exceed maxRoundoffFraction * abs(width), and abs(nextLeft-previousRight) <= absoluteTolerance + relativeTolerance * abs(width) + that bounded roundoff";
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
            rule: "width/2 remains positive and finite; every binary64 lag-width/2 and lag+width/2 edge is finite, strictly straddles its lag center, and retains the declared width; adjacent represented edges meet within the bounded local-width/origin-roundoff tolerance; lags are strictly increasing, uniformly spaced by width, odd in count, pairwise symmetric about a zero center, and span [-tau_max_ms,+tau_max_ms] under the published comparison";
            comparison: "abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))";
            internalEdgeComparison: "exact equality passes; otherwise origin-scaled roundoffUlps * 2^-52 must not exceed maxRoundoffFraction * abs(width), and abs(nextLeft-previousRight) <= absoluteTolerance + relativeTolerance * abs(width) + that bounded roundoff";
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
            geometry: "a separate uniform_bin_window constraint publishes and evaluates [start,stop) bin geometry within its bounded binary64 tolerance";
        }>;
        weight_histogram_consistency: Readonly<{
            pathRoles: "bin centers, raw weight_counts, displayed values, bin width, connection_count, normalization, value units, weight units, aggregation, and binning in that order";
            rule: "the three bin arrays have equal length; weight_counts are non-negative safe integers whose left-to-right safe-integer sum equals connection_count; displayed counts equal raw counts exactly; displayed probabilities are the exact published binary64 count/connection_count results; non-count normalization requires a non-empty snapshot";
            operationOrder: "probability=count/connection_count using one IEEE-754 binary64 division; per-bin comparison uses exact Object.is-equivalent binary64 identity";
            fixedSemantics: "aggregation=each_connection and binning=left_closed_right_open are checked literals; the advertised raw transform derives exactly one in-window weight per selected SynapseCollection entry, while a standalone serialized params object does not carry that derivation receipt";
            geometry: "a separate uniform_bin_window constraint publishes and evaluates [window_start,window_stop) bin geometry in weight_units within its bounded binary64 tolerance";
        }>;
        spatial_extent_bounds: Readonly<{
            pathRoles: "nodes array, extent tuple, and center tuple in that order";
            rule: "center ± extent/2 must produce a strictly ordered representable interval on each axis; node ids are unique and every coordinate lies within those bounds using a separate tolerance for each axis";
            comparison: "axisTolerance = absoluteTolerance + relativeTolerance * abs(halfExtent) + boundedRoundoff; boundedRoundoff is the roundoffUlps * 2^-52 arithmetic allowance only when it is <= maxRoundoffFraction * abs(halfExtent), otherwise zero; the large absolute spatial origin never multiplies relativeTolerance";
            roundoff: "roundoffUlps and maxRoundoffFraction bound IEEE-754 binary64 repair for deriving center ± extent/2; exact in-bound comparisons remain valid when repair is disabled";
        }>;
        scope_compatibility: Readonly<{
            pathRoles: "scope object and optional degree direction in that order";
            rule: "rank-local scopes require integer 0<=rank<world_size; merged scopes require positive world_size; when allowedFieldValues is present, scope.kind must occur in that closed set; legacy constraints without that field still forbid mpi_target_rank_local for out-degree";
        }>;
        phase_plane_direction_basis: Readonly<{
            pathRoles: "grid object, derivative-array object, coordinate-unit object, derivative-unit object, and shared derivative-time-unit scalar in that order";
            rule: "grid has exactly two axes with at least two finite strictly increasing coordinates each; derivative and unit objects have exactly the grid keys; derivative_time_unit is ms or s; derivative_units[key] is exactly axis_units[key] + \"/\" + derivative_time_unit; a nonzero per-second component must remain nonzero after one binary64 division by 1000";
            canonicalNumericBasis: "renderers perform one binary64 division by 1000 for per-second components before deriving arrow direction or presentation length; this is one declared rounding basis, not a universal claim that independently rounded ms/s source representations are byte-identical";
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
    optionalProvenanceKeys: ProvenanceKey[];
    requiredProvenanceFlags: RequiredProvenanceFlags;
    provenanceVerification: Partial<Record<ProvenanceKey, ProvenanceVerification>>;
    externalProvenanceDisclosure: string | null;
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
/**
 * Canonical nest.GetConnections() snapshot.
 *
 * `synapse_models` becomes mandatory at the consuming authority boundary when
 * a weight or delay channel is present; endpoint-only snapshots retain their
 * model-free legacy shape.
 */
declare const GetConnectionsSchema: z.ZodObject<{
    sources: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    targets: z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>;
    weights: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
    delays: z.ZodOptional<z.ZodType<number[], unknown, z.core.$ZodTypeInternals<number[], unknown>>>;
    synapse_models: z.ZodOptional<z.ZodArray<z.ZodString>>;
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

declare const SYNAPSE_MEASUREMENT_FIELD_SEMANTICS: readonly ["effective", "ignored", "unknown"];
type SynapseMeasurementFieldSemantics = (typeof SYNAPSE_MEASUREMENT_FIELD_SEMANTICS)[number];
interface SynapseModelMeasurementSemantics {
    synapseModel: string;
    weight: SynapseMeasurementFieldSemantics;
    delay: SynapseMeasurementFieldSemantics;
}

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
interface GetConnectionsSceneOptions {
    synapseModelSemantics?: readonly SynapseModelMeasurementSemantics[];
    weightUnits?: string;
    delayUnits?: string;
}
declare function getConnectionsToSceneData(conns: unknown, opts?: GetConnectionsSceneOptions): AdapterResult;
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
    measurement: 'count_histogram';
    referenceLabel: string;
    targetLabel: string;
    zeroLagPolicy: 'included';
    sourceConfiguration: CorrelationDetectorSourceConfiguration;
}
interface CorrelationDetectorSourceConfiguration {
    simulationResolutionMs: number;
    simulationStartMs: number;
    simulationStopMs: number;
    referenceReceptorPort: 0;
    targetReceptorPort: 1;
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
/** Project only documented raw counts without inventing weighted units or self-pair removal. */
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
    maxWeightBins: 50000;
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
    synapseModelSemantics?: readonly SynapseModelMeasurementSemantics[];
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
    synapseModelSemantics: readonly SynapseModelMeasurementSemantics[];
    weightUnits: string;
    aggregation: 'sum' | 'mean' | 'minimum' | 'maximum' | 'single_connection';
}
interface DelayMatrixOptions extends ConnectionSnapshotOptions {
    synapseModelSemantics: readonly SynapseModelMeasurementSemantics[];
    delayUnits: 'ms';
    aggregation: 'mean' | 'minimum' | 'maximum' | 'single_connection';
}
interface DegreeDistributionOptions extends ConnectionSnapshotOptions {
    normalization: 'count' | 'probability';
}
interface DelayDistributionOptions extends ConnectionSnapshotOptions {
    synapseModelSemantics: readonly SynapseModelMeasurementSemantics[];
    delayUnits: 'ms';
    binWidthMs: number;
    windowStartMs: number;
    windowStopMs: number;
    normalization: 'count' | 'probability' | 'probability_density';
}
interface WeightHistogramOptions extends ConnectionSnapshotOptions {
    synapseModelSemantics: readonly SynapseModelMeasurementSemantics[];
    weightUnits: string;
    binWidth: number;
    windowStart: number;
    windowStop: number;
    normalization: 'count' | 'probability';
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
/**
 * Derive a legacy weight histogram complete for its declared snapshot scope from
 * one raw measurement per selected SynapseCollection entry. No observation is
 * clipped or discarded.
 */
declare function synapseCollectionToWeightHistogramParams(input: unknown, options: WeightHistogramOptions): NestTopologyResult<WeightHistogramParams>;
declare function synapseCollectionToWeightHistogramParams(input: unknown, options: unknown): NestTopologyResult<WeightHistogramParams>;
declare function getPositionToSpatialMap2DParams(input: unknown, options: SpatialMap2DOptions): NestTopologyResult<SpatialMap2DParams>;
declare function getPositionToSpatialMap2DParams(input: unknown, options: unknown): NestTopologyResult<SpatialMap2DParams>;

export { type AdaptEngramCorpusEntityGraphOptions, type AdaptEngramCorpusEntityGraphResult, type AdapterResult, type AdjacencyMatrixParams, AdjacencyMatrixParamsSchema, type AnimationReplayParams, AnimationReplayParamsSchema, type AstrocyteParams, AstrocyteParamsSchema, type BuildHostRendererInvocationInput, type BuildVizSpecInput, CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS, CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS, CORTEXEL_SKILL_VERSION, type CompartmentalParams, CompartmentalParamsSchema, type ConnectionGraphOptions, type ConnectionGraphParams, ConnectionGraphParamsSchema, type ConnectionSnapshotOptions, type CorrelationDetectorOptions, type CorrelationDetectorSourceConfiguration, type CorrelationDetectorStatus, CorrelationDetectorStatusSchema, type CorrelogramParams, CorrelogramParamsSchema, type DeclaredInputs, type DegreeDistributionOptions, type DelayDistributionOptions, type DelayDistributionParams, DelayDistributionParamsSchema, type DelayMatrixOptions, type DelayMatrixParams, DelayMatrixParamsSchema, type Disambiguator, type EmptySceneResult, type EngramCorpusEntityEdge, type EngramCorpusEntityEdgeKind, type EngramCorpusEntityGraphResponse, type EngramCorpusEntityNode, type EngramCorpusEntityNodeKind, type EngramCorpusEvidenceReference, type ExternalProvenanceClaim, GEOMETRY_MAX_ROUNDOFF_FRACTION, type GetConnections, type GetConnectionsDataKind, type GetConnectionsSceneOptions, GetConnectionsSchema, type GetPosition2D, GetPosition2DSchema, type GetPosition3D, GetPosition3DSchema, type GetPositionDataKind, HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE, HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE, HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS, HISTOGRAM_MASS_TOLERANCE, HOST_RENDERER_EXAMPLE_PAYLOADS, HostRendererInvocation, HostRendererInvocationResult, type InDegreeDistributionParams, InDegreeDistributionParamsSchema, type IsiAnalysisOptions, type IsiDistributionParams, IsiDistributionParamsSchema, KNOWLEDGE_GRAPH_LIMITS, type KnowledgeGraph3DParams, KnowledgeGraph3DParamsSchema, type MultimeterEvents, MultimeterEventsSchema, type MultimeterMultiSender, MultimeterMultiSenderSchema, type MultimeterSenderSeries, type MultimeterSplitResult, NEST_ADAPTER_LIMITS, NEST_ANALYSIS_LIMITS, NEST_INPUT_LIMITS, NEST_SKILL_REGISTRY, NEST_TOPOLOGY_LIMITS, type NestAnalysisResult, NestDeviceFamily, NestSkillId, type NestTopologyResult, type NetworkParams, NetworkParamsSchema, type NormalizedSynapseCollectionSnapshot, type OutDegreeDistributionParams, OutDegreeDistributionParamsSchema, PARAM_CONSTRAINT_LANGUAGE, PARAM_LIMITS, PARAM_VALIDATION_CONSTRAINTS, POPULATION_RATE_ABSOLUTE_TOLERANCE, POPULATION_RATE_RELATIVE_TOLERANCE, PROVENANCE_KEYS, PROVENANCE_KEY_LABELS, PROVENANCE_PARAM_CONSTRAINT_LANGUAGE, PROVENANCE_VALUE_CONSTRAINTS, PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE, type ParamValidationConstraint, type PhasePlaneParams, PhasePlaneParamsSchema, type PlasticityParams, PlasticityParamsSchema, type PopulationRateOptions, type PopulationRateParams, PopulationRateParamsSchema, type PopulationRatePopulation, type PositionScope, PositionScopeSchema, type ProvenanceKey, ProvenanceKeyEnum, type ProvenanceOverrides, type ProvenanceParamConstraint, type ProvenanceValueConstraint, type ProvenanceVerification, type ProvenanceVerificationKind, type PsthAnalysisOptions, type PsthParams, PsthParamsSchema, ROUTING_DISCRIMINATORS, type RateResponseParams, RateResponseParamsSchema, RendererRoute, type RequiredProvenanceFlags, Rfc3339TimestampSchema, type RouteDataKind, type RouteInput, type RouteResult, SKILL_EXAMPLE_PAYLOADS, SKILL_REGISTRY, SPATIAL_BOUNDS_ROUNDOFF_ULPS, STRICT_INVOCATION_POLICY, STRICT_PROVENANCE_POLICY, SYNAPSE_MEASUREMENT_FIELD_SEMANTICS, SceneData, SceneName, type SkillContract, type SkillDescriptor, type SkillExample, SkillInvocationError, SkillInvocationResult, type SnapshotScope, SnapshotScopeSchema, type Spatial2DParams, Spatial2DParamsSchema, type Spatial3DParams, Spatial3DParamsSchema, type SpatialMap2DOptions, type SpatialMap2DParams, SpatialMap2DParamsSchema, type SpikeDataKind, type SpikeRasterParams, SpikeRasterParamsSchema, type SpikeRecorderEvents, SpikeRecorderEventsSchema, type StimulusResponseParams, StimulusResponseParamsSchema, type SynapseMeasurementFieldSemantics, type SynapseModelMeasurementSemantics, VizSpec, type VoltageTraceParams, VoltageTraceParamsSchema, type WeightHistogramOptions, type WeightHistogramParams, WeightHistogramParamsSchema, type WeightMatrixOptions, type WeightMatrixParams, WeightMatrixParamsSchema, type WeightRecorderEvents, WeightRecorderEventsSchema, type WeightRecorderSplitResult, type WeightSynapseSeries, adaptEngramCorpusEntityGraph, buildHostRendererInvocation, buildVizSpec, conservativeProvenance, correlationDetectorToCorrelogramParams, declaredProvenanceValueError, describeSkill, describeSkills, detectEmptyScene, externalProvenanceDisclosure, formatInvocationErrors, getConnectionsToSceneData, getExamplePayload, getHostRendererExamplePayload, getInvocationExamplePayload, getPositionToSceneData, getPositionToSpatialMap2DParams, getSkill, isProvenanceKey, listSkills, multimeterToSceneData, normalizeDeclaredProvenanceInputs, normalizeDeclaredProvenanceValue, normalizeSynapseCollectionSnapshot, provenanceParamConstraintError, provenanceVerificationForContract, routeToScene, skillParamsJsonSchema, spikeRecorderToIsiParams, spikeRecorderToPopulationRateParams, spikeRecorderToSceneData, spikeTrialsToPsthParams, splitMultimeterBySender, splitWeightRecorderBySynapse, synapseCollectionToAdjacencyMatrixParams, synapseCollectionToConnectionGraphParams, synapseCollectionToDelayDistributionParams, synapseCollectionToDelayMatrixParams, synapseCollectionToInDegreeDistributionParams, synapseCollectionToOutDegreeDistributionParams, synapseCollectionToWeightHistogramParams, synapseCollectionToWeightMatrixParams, toPortableJsonSchema, validateSpec, weightRecorderToSceneData };
