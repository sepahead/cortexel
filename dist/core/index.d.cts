import { q as SceneName, o as SceneData } from '../designLaws-DNgmp6mG.cjs';
export { A as AXIS_COLORS, B as BATLOW_GLSL, C as CAMERA_PRESETS, a as CATEGORICAL, b as CORTEXEL_PALETTE, c as CORTICAL_LAYER_COLORS, d as CameraPreset, e as CameraPresetName, f as ColormapName, L as LayerConfig, N as NeuralSceneHandle, g as NeuralSceneMode, h as NeuralSceneProps, O as OKABE_ITO, P as PaletteEntry, i as PaletteMetadata, j as PaletteName, k as PlaybackState, R as RGB, S as SCENE_FRAMING, l as SCENE_NAMES, m as STDPSynapse, n as SYNAPSE_COLORS, p as SceneFraming, r as SemanticPalette, T as TURBO_GLSL, V as VIK_GLSL, s as VIRIDIS_GLSL, t as categorical, u as colormapGradient, v as colormapHex, w as colormapRgba, x as colormapSvgStops, y as getPalette, z as getPaletteEntry, D as isRegisteredPalette, E as listPalettes, F as registerPalette, G as sampleColormap, H as validatePalette } from '../designLaws-DNgmp6mG.cjs';
import { z } from 'zod';

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
    palette: z.ZodOptional<z.ZodString>;
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
    code: 'unknown_skill' | 'invalid_envelope' | 'no_cortexel_scene' | 'scene_mismatch' | 'invalid_params' | 'missing_provenance' | 'calibrated_posterior_unsupported' | 'unknown_palette';
    path: string;
    message: string;
    hint?: string;
    validScenes?: readonly SceneName[];
    validSkills?: readonly string[];
    validPalettes?: string[];
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

export { type AdapterResult, type AstrocyteParams, AstrocyteParamsSchema, CONSERVATIVE_PROVENANCE, CORTEXEL_SKILL_VERSION, type Disambiguator, type EmptySceneResult, type GetConnections, GetConnectionsSchema, type GetPosition2D, GetPosition2DSchema, type GetPosition3D, GetPosition3DSchema, type MultimeterEvents, MultimeterEventsSchema, type MultimeterMultiSender, MultimeterMultiSenderSchema, type MultimeterSenderSeries, type MultimeterSplitResult, NEST_DEVICE_FAMILIES, NEST_SKILL_IDS, NEST_SKILL_REGISTRY, type NestDeviceFamily, type NestSkillId, type NetworkParams, NetworkParamsSchema, PROVENANCE_KEYS, PROVENANCE_KEY_LABELS, type PhasePlaneParams, PhasePlaneParamsSchema, type PlasticityParams, PlasticityParamsSchema, type ProvenanceKey, ProvenanceKeyEnum, type ProvenanceMetadata, ProvenanceSchema, type RateResponseParams, RateResponseParamsSchema, type RendererRoute, type RouteInput, type RouteResult, SKILL_EXAMPLE_PAYLOADS, SceneData, SceneName, type SkillContract, type SkillDescriptor, type SkillExample, type SkillInvocationError, type SkillInvocationResult, type Spatial3DParams, Spatial3DParamsSchema, type SpikeDataKind, type SpikeRasterParams, SpikeRasterParamsSchema, type SpikeRecorderEvents, SpikeRecorderEventsSchema, VALID_RENDERER_ROUTES, VIZ_ROUTER_ID, type VizRouterId, type VizSpec, VizSpecSchema, type VizSpecValidation, type VoltageTraceParams, VoltageTraceParamsSchema, type WeightRecorderEvents, WeightRecorderEventsSchema, defaultHonestyCaption, describeSkill, describeSkills, detectEmptyScene, getConnectionsToSceneData, getExamplePayload, getPositionToSceneData, getSkill, isNestSkillId, isProvenanceKey, listSkills, multimeterToSceneData, requiresHonestyCaption, routeToScene, spikeRecorderToSceneData, splitMultimeterBySender, validateSkillInvocation, validateVizSpec, weightRecorderToSceneData };
