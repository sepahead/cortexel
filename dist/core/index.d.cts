import { i as SceneName, g as SceneData } from '../designLaws-DjS3Nx-h.cjs';
export { C as CAMERA_PRESETS, a as CameraPreset, b as CameraPresetName, L as LayerConfig, N as NeuralSceneHandle, c as NeuralSceneMode, d as NeuralSceneProps, P as PlaybackState, S as SCENE_FRAMING, e as SCENE_NAMES, f as STDPSynapse, h as SceneFraming } from '../designLaws-DjS3Nx-h.cjs';
import { z } from 'zod';

type RGB = readonly [number, number, number];
type ColormapName = 'batlow' | 'vik' | 'viridis' | 'magma' | 'inferno' | 'plasma' | 'cividis' | 'turbo';
/** Sample a perceptually-uniform colormap at `t ∈ [0, 1]` → RGB (0–255). */
declare function sampleColormap(name: ColormapName, t: number): RGB;
/** Sample a colormap at `t ∈ [0, 1]` → `#rrggbb`. */
declare function colormapHex(name: ColormapName, t: number): string;
/** Sample a colormap → `rgba(r, g, b, a)` with explicit alpha. */
declare function colormapRgba(name: ColormapName, t: number, alpha?: number): string;
/** A CSS `linear-gradient(...)` spanning a colormap, for legends and bars. */
declare function colormapGradient(name: ColormapName, angle?: number, stops?: number): string;
/** SVG `<stop>` entries for a `<linearGradient>` spanning a colormap. */
declare function colormapSvgStops(name: ColormapName, stops?: number): string;
declare const CORTEXEL_PALETTE: {
    readonly voidNavy: "#030711";
    readonly deepNavy: "#050816";
    readonly panel: "#0b1220";
    readonly grid: "#1e293b";
    readonly cyan: "#275a60";
    readonly teal: "#3a6b54";
    readonly violet: "#faccfa";
    readonly amber: "#c09036";
    readonly orange: "#d89448";
    readonly pink: "#ed9a62";
    readonly membrane: "#52744a";
    readonly spike: "#dd954d";
    readonly spikeHot: "#ef9b67";
    readonly excitatory: "#136697";
    readonly inhibitory: "#983307";
    readonly ltp: "#023175";
    readonly ltd: "#6f1107";
    readonly ink: "#e2e8f0";
    readonly inkDim: "#94a3b8";
    readonly inkFaint: "#64748b";
};
declare const CORTICAL_LAYER_COLORS: Record<string, string>;
/** Categorical neuron/population colors — batlowS (Crameri's categorical set).
 *  Distinct, CVD-friendly hues sampled from the batlow colour map at
 *  perceptually-spaced intervals. Replaces the hand-picked Tailwind set. */
declare const CATEGORICAL: readonly string[];
declare function categorical(i: number): string;
declare const OKABE_ITO: {
    readonly black: "#000000";
    readonly orange: "#e69f00";
    readonly skyBlue: "#56b4e9";
    readonly green: "#009e73";
    readonly yellow: "#f0e442";
    readonly blue: "#0072b2";
    readonly vermilion: "#d55e00";
    readonly reddishPurple: "#cc79a7";
};
declare const SYNAPSE_COLORS: {
    readonly dark: {
        readonly excitatory: "#1a3d5a";
        readonly inhibitory: "#5a3d1a";
    };
    readonly light: {
        readonly excitatory: "#4a7d9a";
        readonly inhibitory: "#9a7d4a";
    };
};
declare const AXIS_COLORS: {
    readonly lightAxisLabel: "#1f2937";
    readonly lightAxisLine: "#475569";
    readonly lightGridLine: "#cbd5e1";
    readonly darkAxisLabel: "#cbd5e1";
    readonly darkAxisLine: "#64748b";
    readonly darkGridLine: "#334155";
};
declare const TURBO_GLSL = "\nvec3 turbo(float x) {\n  x = clamp(x, 0.0, 1.0);\n  vec4 v4 = vec4(1.0, x, x * x, x * x * x);\n  vec2 v2 = v4.zw * v4.z;\n  return vec3(\n    dot(v4, vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234)) + dot(v2, vec2(-152.94239396, 59.28637943)),\n    dot(v4, vec4(0.09140261, 2.19418839,   4.84296658, -14.18503333)) + dot(v2, vec2(  4.27729857,  2.82956604)),\n    dot(v4, vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771)) + dot(v2, vec2(-89.90310912, 27.34824973))\n  );\n}\n";
declare const VIRIDIS_GLSL = "\nvec3 viridis(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 c0 = vec3(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);\n  const vec3 c1 = vec3(0.1050930431085774, 1.404613529898575, 1.384590162594685);\n  const vec3 c2 = vec3(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);\n  const vec3 c3 = vec3(-4.634230498983486, -5.799100973351585, -19.33244095627987);\n  const vec3 c4 = vec3(6.228269936347081, 14.17993336680509, 56.69055260068105);\n  const vec3 c5 = vec3(4.776384997670288, -13.74514537774601, -65.35303263337234);\n  const vec3 c6 = vec3(-5.435455855934631, 4.645852612178535, 26.3124352495832);\n  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));\n}\n";
declare const BATLOW_GLSL = "\nvec3 batlow(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 stops[13] = vec3[13](\n    vec3(0.004,0.098,0.350), vec3(0.051,0.176,0.361), vec3(0.102,0.259,0.376),\n    vec3(0.153,0.353,0.376), vec3(0.227,0.420,0.329), vec3(0.322,0.455,0.290),\n    vec3(0.420,0.482,0.243), vec3(0.541,0.525,0.200), vec3(0.631,0.541,0.169),\n    vec3(0.753,0.565,0.212), vec3(0.847,0.578,0.282), vec3(0.929,0.605,0.385),\n    vec3(0.981,0.800,0.981)\n  );\n  float x = t * 12.0;\n  int i = int(floor(x));\n  float f = x - float(i);\n  if (i >= 12) return stops[12];\n  return mix(stops[i], stops[i + 1], f);\n}\n";
declare const VIK_GLSL = "\nvec3 vik(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 stops[11] = vec3[11](\n    vec3(0.001,0.070,0.380), vec3(0.009,0.193,0.458), vec3(0.075,0.398,0.591),\n    vec3(0.236,0.522,0.674), vec3(0.483,0.713,0.784), vec3(0.858,0.897,0.915),\n    vec3(0.859,0.647,0.518), vec3(0.728,0.368,0.166), vec3(0.596,0.199,0.028),\n    vec3(0.436,0.068,0.026), vec3(0.350,0.000,0.030)\n  );\n  float x = t * 10.0;\n  int i = int(floor(x));\n  float f = x - float(i);\n  if (i >= 10) return stops[10];\n  return mix(stops[i], stops[i + 1], f);\n}\n";

declare const ProvenanceSchema: z.ZodObject<{
    source: z.ZodString;
    calibrated_posterior: z.ZodDefault<z.ZodBoolean>;
    advisory_only: z.ZodDefault<z.ZodBoolean>;
    is_paper_local_evidence: z.ZodDefault<z.ZodBoolean>;
    caption: z.ZodOptional<z.ZodString>;
    declared_inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodLiteral<true>]>>>;
    synthetic: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
declare const VizSpecSchema: z.ZodObject<{
    scene: z.ZodEnum<{
        "live-activity": "live-activity";
        "cortical-column": "cortical-column";
        stdp: "stdp";
        "spike-raster": "spike-raster";
        "network-topology": "network-topology";
        "voltage-trace": "voltage-trace";
        "phase-plane": "phase-plane";
        "brunel-network": "brunel-network";
        "fi-curve": "fi-curve";
        "isi-distribution": "isi-distribution";
        psth: "psth";
        "weight-histogram": "weight-histogram";
    }>;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    mode: z.ZodDefault<z.ZodEnum<{
        interactive: "interactive";
        export: "export";
    }>>;
    themeMode: z.ZodDefault<z.ZodEnum<{
        dark: "dark";
        light: "light";
    }>>;
    camera: z.ZodOptional<z.ZodEnum<{
        default: "default";
        top: "top";
        side: "side";
        close: "close";
        cinematic: "cinematic";
    }>>;
    provenance: z.ZodObject<{
        source: z.ZodString;
        calibrated_posterior: z.ZodDefault<z.ZodBoolean>;
        advisory_only: z.ZodDefault<z.ZodBoolean>;
        is_paper_local_evidence: z.ZodDefault<z.ZodBoolean>;
        caption: z.ZodOptional<z.ZodString>;
        declared_inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodLiteral<true>]>>>;
        synthetic: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
type VizSpec = z.infer<typeof VizSpecSchema>;
type VizSpecValidation = {
    ok: true;
    spec: VizSpec;
} | {
    ok: false;
    errors: string[];
};
/** Validate untrusted input (e.g. an agent payload) into a typed VizSpec. */
declare function validateVizSpec(input: unknown): VizSpecValidation;

interface ProvenanceMetadata {
    /** Origin of the data: a nest_simulation id, a paper id, or synthetic_test. */
    source: string;
    /** True ONLY when a calibrated Bayesian posterior backs the figure. Never set
     *  by the current pipeline — validation/search is candidate ranking. */
    calibrated_posterior: boolean;
    /** True when the figure is advisory evidence only (does not mutate state). */
    advisory_only: boolean;
    /** True only when the data is paper-local evidence (not corpus/global KG). */
    is_paper_local_evidence: boolean;
    /** Optional human-readable caption (e.g. "Illustrative — not measured"). */
    caption?: string;
    /** Explicit synthetic/illustrative flag — forces the schematic caption. */
    synthetic?: boolean;
}
declare const CONSERVATIVE_PROVENANCE: Readonly<Pick<ProvenanceMetadata, 'calibrated_posterior' | 'advisory_only' | 'is_paper_local_evidence'>>;
/**
 * Whether the renderer must show a non-dismissible "illustrative / not measured"
 * honesty caption. Fail-closed: any non-rigorous flag forces the caption on.
 */
declare function requiresHonestyCaption(p: ProvenanceMetadata): boolean;
/** Default caption text when none is supplied but a caption is required. */
declare function defaultHonestyCaption(p: ProvenanceMetadata): string;

declare const NEST_SKILL_IDS: readonly ["nest.voltage_trace", "nest.spike_raster", "nest.rate_response", "nest.connectivity_matrix", "nest.spatial_2d", "nest.spatial_3d", "nest.plasticity_dynamics", "nest.phase_plane", "nest.correlogram", "nest.stimulus_response", "nest.astrocyte_dynamics", "nest.compartmental_dynamics", "nest.animation_replay"];
type NestSkillId = (typeof NEST_SKILL_IDS)[number];
/** The routing meta-skill. Not a renderer — it selects among the 13 above. */
declare const VIZ_ROUTER_ID: "nest.viz_router";
type VizRouterId = typeof VIZ_ROUTER_ID;
declare const NEST_DEVICE_FAMILIES: readonly ["multimeter", "spike_recorder", "get_connections", "get_position", "weight_recorder", "computed"];
type NestDeviceFamily = (typeof NEST_DEVICE_FAMILIES)[number];
declare function isNestSkillId(value: unknown): value is NestSkillId;
declare const VALID_RENDERER_ROUTES: readonly ["media.trace_figure", "media.model_graph", "media.webgl_scene", "media.react_fiber_scene", "media.manim_storyboard", "media.*", "matplotlib", "d3", "three", "fiber", "manim"];
type RendererRoute = (typeof VALID_RENDERER_ROUTES)[number];

declare const PROVENANCE_KEYS: readonly ["device_id", "recorded_variable", "units", "sampling_interval", "recorder_id", "sender_ids", "population_labels", "time_units", "source_ids", "target_ids", "synapse_model", "weight_units", "extent", "mask", "kernel", "projection_sample_policy", "morphology_disclaimer", "frame_rate", "state_variables", "bin_ms", "pair_labels", "stim_units", "rate_normalization"];
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
    mask: "mask";
    kernel: "kernel";
    projection_sample_policy: "projection_sample_policy";
    morphology_disclaimer: "morphology_disclaimer";
    frame_rate: "frame_rate";
    state_variables: "state_variables";
    bin_ms: "bin_ms";
    pair_labels: "pair_labels";
    stim_units: "stim_units";
    rate_normalization: "rate_normalization";
}>;
declare const PROVENANCE_KEY_LABELS: Record<ProvenanceKey, string>;
declare function isProvenanceKey(value: unknown): value is ProvenanceKey;

declare const VoltageTraceParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    series: z.ZodArray<z.ZodArray<z.ZodNumber>>;
    units: z.ZodString;
}, z.core.$loose>;
type VoltageTraceParams = z.infer<typeof VoltageTraceParamsSchema>;
declare const SpikeRasterParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    senders: z.ZodArray<z.ZodNumber>;
}, z.core.$loose>;
type SpikeRasterParams = z.infer<typeof SpikeRasterParamsSchema>;
declare const RateResponseParamsSchema: z.ZodObject<{
    stimulus_amplitudes: z.ZodArray<z.ZodNumber>;
    rates_hz: z.ZodArray<z.ZodNumber>;
    units: z.ZodString;
}, z.core.$loose>;
type RateResponseParams = z.infer<typeof RateResponseParamsSchema>;
declare const NetworkParamsSchema: z.ZodObject<{
    sources: z.ZodArray<z.ZodNumber>;
    targets: z.ZodArray<z.ZodNumber>;
    weights: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$loose>;
type NetworkParams = z.infer<typeof NetworkParamsSchema>;
declare const Spatial3DParamsSchema: z.ZodObject<{
    objects: z.ZodArray<z.ZodUnknown>;
}, z.core.$loose>;
type Spatial3DParams = z.infer<typeof Spatial3DParamsSchema>;
declare const PlasticityParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    weights: z.ZodArray<z.ZodNumber>;
    weight_units: z.ZodString;
}, z.core.$loose>;
type PlasticityParams = z.infer<typeof PlasticityParamsSchema>;
declare const PhasePlaneParamsSchema: z.ZodObject<{
    grid: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$loose>;
type PhasePlaneParams = z.infer<typeof PhasePlaneParamsSchema>;
declare const AstrocyteParamsSchema: z.ZodObject<{
    ca_trace: z.ZodArray<z.ZodNumber>;
    units: z.ZodString;
}, z.core.$loose>;
type AstrocyteParams = z.infer<typeof AstrocyteParamsSchema>;

declare const CORTEXEL_SKILL_VERSION = "1.0.0";
interface SkillExample {
    nestExample: string;
    sourceUrl: string;
    dataShape: string;
    output: string;
    note: string;
}
interface SkillContract {
    id: NestSkillId;
    version: string;
    title: string;
    description: string;
    deviceFamily: NestDeviceFamily;
    /** Cortexel scene this skill renders to, or null when none is honest yet. */
    scene: SceneName | null;
    /** When true, the scene is a derived/approximate target, not a clean 1:1. */
    weak?: boolean;
    /** Top-level param keys an invocation must supply (subset of paramsSchema). */
    requiredInputKeys: string[];
    /** Per-skill zod schema for `params` (undefined when scene is null). */
    paramsSchema?: z.ZodType;
    /** Provenance keys the agent must declare for this skill to render. */
    requiredProvenanceKeys: ProvenanceKey[];
    rendererRoutes: RendererRoute[];
    examples: SkillExample[];
}
declare const NEST_SKILL_REGISTRY: Record<NestSkillId, SkillContract>;
declare function listSkills(): SkillContract[];
declare function getSkill(id: string): SkillContract | undefined;
interface SkillDescriptor {
    id: NestSkillId;
    title: string;
    description: string;
    deviceFamily: NestDeviceFamily;
    scene: SceneName | null;
    renderable: boolean;
    weak: boolean;
    requiredInputKeys: string[];
    requiredProvenanceKeys: ProvenanceKey[];
    rendererRoutes: RendererRoute[];
    examplePayload?: VizSpec;
    examples: SkillExample[];
}
declare function describeSkill(id: string): SkillDescriptor | undefined;
declare function describeSkills(): SkillDescriptor[];

declare const SKILL_EXAMPLE_PAYLOADS: Partial<Record<NestSkillId, VizSpec>>;
declare function getExamplePayload(id: string): VizSpec | undefined;

type SpikeDataKind = 'events' | 'rates' | 'correlation';
interface RouteInput {
    deviceFamily: NestDeviceFamily;
    /** Disambiguator for the spike_recorder family (raster/rate/correlogram). */
    dataShape?: {
        kind?: SpikeDataKind;
    };
    /** General disambiguator for any many-to-one family: name the skill directly.
     *  Must belong to `deviceFamily` or it is ignored. */
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
    reason: 'unknown_family' | 'no_cortexel_scene' | 'ambiguous';
    candidates?: NestSkillId[];
    disambiguateBy?: Disambiguator;
};
declare function routeToScene(input: RouteInput): RouteResult;

interface SkillInvocationError {
    code: 'unknown_skill' | 'invalid_envelope' | 'no_cortexel_scene' | 'scene_mismatch' | 'invalid_params' | 'missing_provenance' | 'calibrated_posterior_unsupported';
    path: string;
    message: string;
    hint?: string;
    validScenes?: readonly SceneName[];
    validSkills?: readonly string[];
    /** A copyable valid payload for this skill, attached to actionable errors so
     *  an autonomous agent can self-repair without reading source. */
    example?: VizSpec;
}
type SkillInvocationResult = {
    ok: true;
    spec: VizSpec;
    scene: SceneName;
    caption: string | null;
} | {
    ok: false;
    errors: SkillInvocationError[];
};
declare function validateSkillInvocation(skillId: string, payload: unknown): SkillInvocationResult;

interface EmptySceneResult {
    empty: boolean;
    /** Which channels carried data (for an actionable message). */
    populated: string[];
    reason?: string;
}
/** Detect whether adapted SceneData has any renderable content. */
declare function detectEmptyScene(data: SceneData): EmptySceneResult;

/** spike_recorder events: nest.GetStatus(sr, 'events') → {senders, times}. */
declare const SpikeRecorderEventsSchema: z.ZodObject<{
    senders: z.ZodArray<z.ZodNumber>;
    times: z.ZodArray<z.ZodNumber>;
}, z.core.$strip>;
type SpikeRecorderEvents = z.infer<typeof SpikeRecorderEventsSchema>;
/** multimeter events: {times, <variable>: values}. The host names the variable;
 *  Cortexel takes a normalized {times, values}. */
declare const MultimeterEventsSchema: z.ZodObject<{
    times: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
}, z.core.$strip>;
type MultimeterEvents = z.infer<typeof MultimeterEventsSchema>;
/** A multimeter recording multiple senders: {times, values, senders} parallel
 *  arrays (the flattened form a single multimeter actually returns). Split per
 *  sender before rendering — each sender's sub-series must be monotonic. */
declare const MultimeterMultiSenderSchema: z.ZodObject<{
    times: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    senders: z.ZodArray<z.ZodNumber>;
}, z.core.$strip>;
type MultimeterMultiSender = z.infer<typeof MultimeterMultiSenderSchema>;
/** nest.GetConnections() → parallel source/target/weight/delay arrays. */
declare const GetConnectionsSchema: z.ZodObject<{
    sources: z.ZodArray<z.ZodNumber>;
    targets: z.ZodArray<z.ZodNumber>;
    weights: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    delays: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
type GetConnections = z.infer<typeof GetConnectionsSchema>;
/** nest.GetPosition(nodes) in 2D → ((x,y), ...). */
declare const GetPosition2DSchema: z.ZodObject<{
    positions: z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
}, z.core.$strip>;
type GetPosition2D = z.infer<typeof GetPosition2DSchema>;
/** nest.GetPosition(nodes) in 3D → ((x,y,z), ...). */
declare const GetPosition3DSchema: z.ZodObject<{
    positions: z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    edges: z.ZodOptional<z.ZodArray<z.ZodObject<{
        source: z.ZodNumber;
        target: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
type GetPosition3D = z.infer<typeof GetPosition3DSchema>;
/** weight_recorder events: {times, weights, senders?, targets?}. */
declare const WeightRecorderEventsSchema: z.ZodObject<{
    times: z.ZodArray<z.ZodNumber>;
    weights: z.ZodArray<z.ZodNumber>;
    senders: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    targets: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
type WeightRecorderEvents = z.infer<typeof WeightRecorderEventsSchema>;

type AdapterResult = {
    ok: true;
    data: SceneData;
    senderIndexMap?: Map<number, number>;
} | {
    ok: false;
    errors: string[];
};
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
declare function getConnectionsToSceneData(conns: unknown): AdapterResult;
declare function getPositionToSceneData(positions: unknown, opts?: {
    dims: 2 | 3;
}): AdapterResult;
declare function weightRecorderToSceneData(events: unknown): AdapterResult;

export { AXIS_COLORS, type AdapterResult, type AstrocyteParams, AstrocyteParamsSchema, BATLOW_GLSL, CATEGORICAL, CONSERVATIVE_PROVENANCE, CORTEXEL_PALETTE, CORTEXEL_SKILL_VERSION, CORTICAL_LAYER_COLORS, type ColormapName, type Disambiguator, type EmptySceneResult, type GetConnections, GetConnectionsSchema, type GetPosition2D, GetPosition2DSchema, type GetPosition3D, GetPosition3DSchema, type MultimeterEvents, MultimeterEventsSchema, type MultimeterMultiSender, MultimeterMultiSenderSchema, type MultimeterSenderSeries, type MultimeterSplitResult, NEST_DEVICE_FAMILIES, NEST_SKILL_IDS, NEST_SKILL_REGISTRY, type NestDeviceFamily, type NestSkillId, type NetworkParams, NetworkParamsSchema, OKABE_ITO, PROVENANCE_KEYS, PROVENANCE_KEY_LABELS, type PhasePlaneParams, PhasePlaneParamsSchema, type PlasticityParams, PlasticityParamsSchema, type ProvenanceKey, ProvenanceKeyEnum, type ProvenanceMetadata, ProvenanceSchema, type RGB, type RateResponseParams, RateResponseParamsSchema, type RendererRoute, type RouteInput, type RouteResult, SKILL_EXAMPLE_PAYLOADS, SYNAPSE_COLORS, SceneData, SceneName, type SkillContract, type SkillDescriptor, type SkillExample, type SkillInvocationError, type SkillInvocationResult, type Spatial3DParams, Spatial3DParamsSchema, type SpikeDataKind, type SpikeRasterParams, SpikeRasterParamsSchema, type SpikeRecorderEvents, SpikeRecorderEventsSchema, TURBO_GLSL, VALID_RENDERER_ROUTES, VIK_GLSL, VIRIDIS_GLSL, VIZ_ROUTER_ID, type VizRouterId, type VizSpec, VizSpecSchema, type VizSpecValidation, type VoltageTraceParams, VoltageTraceParamsSchema, type WeightRecorderEvents, WeightRecorderEventsSchema, categorical, colormapGradient, colormapHex, colormapRgba, colormapSvgStops, defaultHonestyCaption, describeSkill, describeSkills, detectEmptyScene, getConnectionsToSceneData, getExamplePayload, getPositionToSceneData, getSkill, isNestSkillId, isProvenanceKey, listSkills, multimeterToSceneData, requiresHonestyCaption, routeToScene, sampleColormap, spikeRecorderToSceneData, splitMultimeterBySender, validateSkillInvocation, validateVizSpec, weightRecorderToSceneData };
