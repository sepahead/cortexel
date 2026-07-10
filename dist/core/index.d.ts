export { A as AXIS_COLORS, B as BATLOW_GLSL, C as CATEGORICAL, a as CORTEXEL_PALETTE, b as CORTICAL_LAYER_COLORS, c as ColormapName, O as OKABE_ITO, P as PALETTE_REGISTRY_POLICY, d as PaletteEntry, e as PaletteMetadata, f as PaletteName, g as RGB, h as ReadonlyPaletteMetadata, R as ReadonlySemanticPalette, S as SEMANTIC_PALETTE_KEYS, i as SYNAPSE_COLORS, j as SemanticPalette, T as TURBO_GLSL, V as VIK_GLSL, k as VIRIDIS_GLSL, l as categorical, m as colormapGradient, n as colormapHex, o as colormapRgba, p as colormapSvgStops, q as getPalette, r as getPaletteEntry, s as isRegisteredPalette, t as listPalettes, u as registerPalette, v as sampleColormap, w as validatePalette } from '../colormaps-CZ6XejJa.js';
import { N as NestSkillId, b as NestDeviceFamily, S as SceneName, R as RendererRoute, V as VizSpec, H as HostRendererInvocation, c as HostRendererInvocationResult, d as SkillInvocationResult, a as SkillInvocationError, e as SceneData } from '../hostInvocation-WskS3C9x.js';
export { C as CAMERA_PRESETS, f as CONSERVATIVE_PROVENANCE, g as CORTEXEL_JSON_LIMITS, h as CORTEXEL_JSON_POLICY, i as CORTEXEL_SPEC_VERSION, j as CameraPreset, k as CameraPresetName, D as DECLARED_INPUTS_PORTABLE_SCHEMA, E as ENVELOPE_NORMALIZATION_POLICY, l as HONESTY_POLICY, m as HostRendererInvocationSchema, J as JSON_BUDGET_SEMANTICS, n as JSON_PARAMS_PORTABLE_SCHEMA, o as JsonParamsSchema, L as LayerConfig, p as NEST_DEVICE_FAMILIES, q as NEST_SKILL_IDS, r as NUMERIC_MODEL_POLICY, s as NeuralSceneHandle, t as NeuralSceneMode, u as NeuralSceneProps, v as PlaybackState, P as ProvenanceMetadata, w as ProvenanceSchema, x as SCENE_FRAMING, y as SCENE_NAMES, z as SKILL_IDS, A as STDPSynapse, B as STRING_NORMALIZATION_POLICY, F as SceneFraming, G as SkillId, I as SkillParamsResult, K as VALID_RENDERER_ROUTES, M as VIZ_ROUTER_ID, O as VizRouterId, Q as VizSpecSchema, T as VizSpecValidation, U as defaultHonestyCaption, W as isNestSkillId, X as isSkillId, Y as mandatoryDisclosure, Z as requiresHonestyCaption, _ as validateHostRendererInvocation, $ as validateHostRendererSpec, a0 as validateSkillInvocation, a1 as validateSkillParams, a2 as validateVizSpec } from '../hostInvocation-WskS3C9x.js';
export { A as AnimationReplayParams, a as AnimationReplayParamsSchema, b as AstrocyteParams, c as AstrocyteParamsSchema, C as CompartmentalParams, d as CompartmentalParamsSchema, e as CorrelogramParams, f as CorrelogramParamsSchema, K as KnowledgeGraph3DParams, g as KnowledgeGraph3DParamsSchema, N as NetworkParams, h as NetworkParamsSchema, P as PARAM_LIMITS, i as PhasePlaneParams, j as PhasePlaneParamsSchema, k as PlasticityParams, l as PlasticityParamsSchema, R as RateResponseParams, m as RateResponseParamsSchema, S as Spatial2DParams, n as Spatial2DParamsSchema, o as Spatial3DParams, p as Spatial3DParamsSchema, q as SpikeRasterParams, r as SpikeRasterParamsSchema, s as StimulusResponseParams, t as StimulusResponseParamsSchema, V as VoltageTraceParams, u as VoltageTraceParamsSchema } from '../params-wRfhrStj.js';
import { z } from 'zod';

declare const PROVENANCE_KEYS: readonly ["device_id", "recorded_variable", "units", "sampling_interval", "recorder_id", "sender_ids", "population_labels", "time_units", "source_ids", "target_ids", "synapse_model", "weight_units", "extent", "spatial_units", "mask", "kernel", "projection_sample_policy", "morphology_disclaimer", "frame_rate", "state_variables", "derivation_method", "model_context", "fixed_parameters", "bin_ms", "pair_labels", "correlation_normalization", "correlation_units", "stim_units", "rate_normalization", "graph_source", "node_kinds", "edge_kinds", "identity_advisory"];
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
    pair_labels: "pair_labels";
    correlation_normalization: "correlation_normalization";
    correlation_units: "correlation_units";
    stim_units: "stim_units";
    rate_normalization: "rate_normalization";
    graph_source: "graph_source";
    node_kinds: "node_kinds";
    edge_kinds: "edge_kinds";
    identity_advisory: "identity_advisory";
}>;
declare const STRICT_PROVENANCE_POLICY: Readonly<{
    unknownDeclaredInputKeys: "reject";
    allowedDeclaredInputKeys: readonly ["device_id", "recorded_variable", "units", "sampling_interval", "recorder_id", "sender_ids", "population_labels", "time_units", "source_ids", "target_ids", "synapse_model", "weight_units", "extent", "spatial_units", "mask", "kernel", "projection_sample_policy", "morphology_disclaimer", "frame_rate", "state_variables", "derivation_method", "model_context", "fixed_parameters", "bin_ms", "pair_labels", "correlation_normalization", "correlation_units", "stim_units", "rate_normalization", "graph_source", "node_kinds", "edge_kinds", "identity_advisory"];
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
    kind: 'equals_literal';
    provenanceKey: ProvenanceKey;
    value: string | number | true;
    description: string;
};
declare const PROVENANCE_PARAM_CONSTRAINT_LANGUAGE: Readonly<{
    version: "1";
    evaluationOrder: readonly string[];
    kinds: readonly ["equals_param", "equals_literal"];
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

declare const CORTEXEL_SKILL_VERSION = "1.2.0";
declare const STRICT_INVOCATION_POLICY: Readonly<{
    version: "1";
    externalSelection: "validateSkillInvocation(id,payload): explicit id selects; payload.skill is optional but must match when present";
    selfDescribingSelection: "validateSpec(payload): payload.skill is required and selects the contract";
    hostSelection: "host envelopes require payload.skill; explicit id and payload.skill must match";
    unknownSkillIds: "reject";
    cortexelEnvelope: "allowed iff contract.scene is non-null; payload.scene must equal contract.scene";
    hostEnvelope: "allowed iff contract.scene is null; scene is forbidden";
    rendererRoute: "when selected, must occur in contract.rendererRoutes";
    params: "validate paramsJsonSchema then every paramConstraint";
    provenance: "apply strictProvenancePolicy and every provenanceParamConstraint";
}>;
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
    kind: 'equal_length' | 'each_length_matches' | 'monotonic_non_decreasing' | 'non_negative' | 'property_count' | 'unique_field' | 'unique_tuple' | 'references_exist' | 'no_self_loops' | 'same_keys' | 'cartesian_product_length' | 'permutation_of_keys' | 'endpoint_kinds' | 'mapped_value' | 'conditional_numeric_domain' | 'acyclic';
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
    /** Top-level param keys an invocation must supply (subset of paramsSchema). */
    requiredInputKeys: readonly string[];
    /** Per-skill zod schema for `params` (including scene-less host routes). */
    paramsSchema?: z.ZodType;
    /** Portable cross-field rules that complement paramsJsonSchema. */
    paramConstraints?: readonly ParamValidationConstraint[];
    /** Provenance keys the agent must declare for this skill to render. */
    requiredProvenanceKeys: readonly ProvenanceKey[];
    /** Deterministic params↔provenance consistency checks. */
    provenanceParamConstraints?: readonly ProvenanceParamConstraint[];
    rendererRoutes: readonly RendererRoute[];
    examples: readonly SkillExample[];
}
/** Versioned evaluator contract for ParamValidationConstraint paths. This is a
 *  deliberately tiny JSONPath subset so non-TS hosts do not have to guess how
 *  `[*]`, `*`, or `?` are interpreted. */
declare const PARAM_CONSTRAINT_LANGUAGE: Readonly<{
    version: "2";
    pathSyntax: "dot-separated object keys";
    arrayWildcard: "[*]";
    objectValueWildcard: "*";
    optionalSuffix: "?";
    evaluationOrder: readonly string[];
    kinds: readonly ["equal_length", "each_length_matches", "monotonic_non_decreasing", "non_negative", "property_count", "unique_field", "unique_tuple", "references_exist", "no_self_loops", "same_keys", "cartesian_product_length", "permutation_of_keys", "endpoint_kinds", "mapped_value", "conditional_numeric_domain", "acyclic"];
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
declare const SKILL_REGISTRY: Record<"nest.voltage_trace" | "nest.spike_raster" | "nest.rate_response" | "nest.connectivity_matrix" | "nest.spatial_2d" | "nest.spatial_3d" | "nest.plasticity_dynamics" | "nest.phase_plane" | "nest.correlogram" | "nest.stimulus_response" | "nest.astrocyte_dynamics" | "nest.compartmental_dynamics" | "nest.animation_replay" | "corpus.knowledge_graph", SkillContract>;
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
    requiredInputKeys: string[];
    requiredProvenanceKeys: ProvenanceKey[];
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

type SpikeDataKind = 'events' | 'rates' | 'correlation';
interface RouteInput {
    deviceFamily: NestDeviceFamily;
    /** Disambiguator for the spike_recorder family (raster/rate/correlogram). */
    dataShape?: {
        kind?: SpikeDataKind;
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

export { type AdapterResult, type BuildHostRendererInvocationInput, type BuildVizSpecInput, CORTEXEL_SKILL_VERSION, type DeclaredInputs, type Disambiguator, type EmptySceneResult, type GetConnections, GetConnectionsSchema, type GetPosition2D, GetPosition2DSchema, type GetPosition3D, GetPosition3DSchema, HOST_RENDERER_EXAMPLE_PAYLOADS, HostRendererInvocation, HostRendererInvocationResult, type MultimeterEvents, MultimeterEventsSchema, type MultimeterMultiSender, MultimeterMultiSenderSchema, type MultimeterSenderSeries, type MultimeterSplitResult, NEST_ADAPTER_LIMITS, NEST_INPUT_LIMITS, NEST_SKILL_REGISTRY, NestDeviceFamily, NestSkillId, PARAM_CONSTRAINT_LANGUAGE, PARAM_VALIDATION_CONSTRAINTS, PROVENANCE_KEYS, PROVENANCE_KEY_LABELS, PROVENANCE_PARAM_CONSTRAINT_LANGUAGE, PROVENANCE_VALUE_CONSTRAINTS, type ParamValidationConstraint, type ProvenanceKey, ProvenanceKeyEnum, type ProvenanceOverrides, type ProvenanceParamConstraint, type ProvenanceValueConstraint, RendererRoute, type RouteInput, type RouteResult, SKILL_EXAMPLE_PAYLOADS, SKILL_REGISTRY, STRICT_INVOCATION_POLICY, STRICT_PROVENANCE_POLICY, SceneData, SceneName, type SkillContract, type SkillDescriptor, type SkillExample, SkillInvocationError, SkillInvocationResult, type SpikeDataKind, type SpikeRecorderEvents, SpikeRecorderEventsSchema, VizSpec, type WeightRecorderEvents, WeightRecorderEventsSchema, type WeightRecorderSplitResult, type WeightSynapseSeries, buildHostRendererInvocation, buildVizSpec, conservativeProvenance, declaredProvenanceValueError, describeSkill, describeSkills, detectEmptyScene, formatInvocationErrors, getConnectionsToSceneData, getExamplePayload, getHostRendererExamplePayload, getInvocationExamplePayload, getPositionToSceneData, getSkill, isProvenanceKey, listSkills, multimeterToSceneData, normalizeDeclaredProvenanceInputs, normalizeDeclaredProvenanceValue, provenanceParamConstraintError, routeToScene, skillParamsJsonSchema, spikeRecorderToSceneData, splitMultimeterBySender, splitWeightRecorderBySynapse, toPortableJsonSchema, validateSpec, weightRecorderToSceneData };
