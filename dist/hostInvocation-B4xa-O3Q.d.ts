import { z } from 'zod';

type NeuralSceneMode = 'hero' | 'background' | 'standalone';
declare const SCENE_NAMES: readonly ["live-activity", "cortical-column", "stdp", "spike-raster", "network-topology", "voltage-trace", "phase-plane", "brunel-network", "fi-curve", "isi-distribution", "psth", "population-rate", "correlogram", "weight-histogram", "connection-matrix", "degree-distribution", "delay-distribution", "spatial-map-2d", "knowledge-graph-3d"];
type SceneName = (typeof SCENE_NAMES)[number];
interface NeuralSceneHandle {
    nextScene: () => void;
    setScene: (scene: SceneName) => void;
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setCameraPreset: (preset: CameraPresetName) => void;
}
interface NeuralSceneProps {
    mode: NeuralSceneMode;
    scene?: SceneName | 'auto';
    opacity?: number;
    cycleInterval?: number;
    themeMode?: 'dark' | 'light';
    /**
     * When false, the WebGL frameloop is suspended (`frameloop="never"`) so a
     * scene hidden behind another tab stops burning GPU/bloom every frame. The
     * last frame stays painted; flipping back to true resumes rendering. Defaults
     * to true so existing call sites are unchanged.
     */
    active?: boolean;
}
interface LayerConfig {
    layer: string;
    y: number;
    count: number;
    color: string;
    label: string;
}
interface STDPSynapse {
    preIdx: number;
    postIdx: number;
    weight: number;
    targetWeight: number;
    lastPreSpike: number;
    lastPostSpike: number;
}
type CameraPresetName = 'default' | 'top' | 'side' | 'close' | 'cinematic';
interface CameraPreset {
    name: CameraPresetName;
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
}
interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    speed: number;
}
interface SceneData {
    spikeTimes?: Float64Array;
    spikeSenders?: Float32Array;
    timeUnits?: string;
    voltageTraces?: Float32Array;
    voltageUnits?: string;
    traceTimes?: Float64Array;
    traceSender?: number;
    weightSeries?: Float32Array;
    weightUnits?: string;
    weightSynapse?: {
        sender: number;
        target: number;
    };
    analogTraces?: {
        values: Float32Array;
        variable: string;
        units: string;
    };
    /** Connectivity dumps do not contain coordinates; absent x/y/z means the
     *  renderer may derive a disclosed layout but must not present it as data. */
    networkNodes?: {
        id: number;
        x?: number;
        y?: number;
        z?: number;
        label: string;
    }[];
    networkEdges?: {
        source: number;
        target: number;
        weight?: number;
        delay?: number;
    }[];
    /** Present whenever networkEdges carry the corresponding measurement. */
    networkWeightUnits?: string;
    networkDelayUnits?: string;
    /** Units for provided network x/y/z coordinates (never inferred). */
    networkCoordinateUnits?: string;
    networkLayout?: 'unpositioned' | 'provided-2d' | 'provided-3d';
    vectorField?: {
        x: number;
        y: number;
        z: number;
        dx: number;
        dy: number;
        dz: number;
    }[];
}
interface SceneFraming {
    position: [number, number, number];
    target: [number, number, number];
    rotatable: boolean;
}
declare const SCENE_FRAMING: Record<SceneName, SceneFraming>;
declare const CAMERA_PRESETS: Record<CameraPresetName, CameraPreset>;

/** The VizSpec contract version. Bumped when the envelope shape changes in a way
 *  a host may need to migrate. A stored payload MAY omit `specVersion` for legacy
 *  compatibility; when stamped, the runtime enforces an exact match. */
declare const CORTEXEL_SPEC_VERSION = "1.3.0";
/** Resource ceilings for the plain-JSON envelope. Per-skill schemas impose
 *  tighter array limits where the renderer has a smaller practical budget. */
declare const CORTEXEL_JSON_LIMITS: Readonly<{
    maxDepth: 32;
    maxNodes: 500000;
    maxObjectKeys: 10000;
    maxStringLength: 100000;
    maxTotalStringLength: 5000000;
}>;
/** Portable exact-JSON policy mirrored into the language-neutral manifest. */
declare const CORTEXEL_JSON_POLICY: Readonly<{
    finiteNumbersOnly: true;
    rejectNegativeZero: true;
    plainObjectsOnly: true;
    enumerableDataPropertiesOnly: true;
    rejectAccessors: true;
    rejectSymbolKeys: true;
    rejectSparseArrays: true;
    rejectNamedArrayProperties: true;
    rejectCircularReferences: true;
    rejectRawJson: true;
    duplicateObjectMemberNames: "reject before materialization";
    rawJsonParsingPrecondition: "detect duplicate member names in raw JSON text before converting to an object";
    rejectedObjectKeys: readonly ["__proto__"];
}>;
declare const STRING_NORMALIZATION_POLICY: Readonly<{
    version: "1";
    lengthModel: "ECMAScript UTF-16 code units";
    portableLengthKeyword: "x-cortexel-max-utf16-code-units";
    trimAlgorithm: "ECMA-262 String.prototype.trim / TrimString";
    trimCodePointsHex: readonly string[];
    regexDialect: "ECMA-262 Unicode-aware regular expressions";
    unicodeNormalization: "none";
    wellFormedUnicodeOnly: true;
    displayStringPattern: string;
    displayStringControls: "reject C0/C1, bidi, zero-width, and BOM controls";
}>;
declare const NUMERIC_MODEL_POLICY: Readonly<{
    version: "1";
    representation: "IEEE-754 binary64";
    coerceBeforeValidation: true;
    finiteOnly: true;
    negativeZeroRejected: true;
    integerIdentityFields: "safe integers only";
    constraintEvaluationUsesCoercedValues: true;
}>;
declare const JSON_BUDGET_SEMANTICS: Readonly<{
    version: "1";
    scope: "one snapshot of the complete invocation envelope";
    rootDepth: 0;
    nodeCount: "every scalar, array, and object value; property names are not nodes";
    objectKeyCount: "per object";
    stringLengthModel: "UTF-16 code units";
    totalStringLength: "all string values plus every object property name";
    repeatedReference: "counted once per JSON occurrence; cycles reject";
}>;
/** Canonical portable fragments for effect schemas Zod cannot faithfully emit.
 *  The manifest grafts these into both public envelope schemas. */
declare const JSON_PARAMS_PORTABLE_SCHEMA: Readonly<{
    type: "object";
    maxProperties: 10000;
    propertyNames: Readonly<{
        type: "string";
        maxLength: 100000;
        'x-cortexel-max-utf16-code-units': 100000;
        not: Readonly<{
            const: "__proto__";
        }>;
    }>;
    additionalProperties: true;
}>;
declare const DECLARED_INPUTS_PORTABLE_SCHEMA: Readonly<{
    type: "object";
    maxProperties: 64;
    propertyNames: Readonly<{
        type: "string";
        minLength: 1;
        maxLength: 80;
        'x-cortexel-max-utf16-code-units': 80;
        allOf: readonly Readonly<{
            pattern: string;
        }>[];
    }>;
    additionalProperties: Readonly<{
        anyOf: readonly (Readonly<{
            type: "string";
            maxLength: 5000;
            'x-cortexel-max-utf16-code-units': 5000;
            pattern: string;
        }> | Readonly<{
            type: "number";
        }> | Readonly<{
            type: "boolean";
            const: true;
        }>)[];
    }>;
}>;
/** Required cross-language processing order. JSON Schema `default` is only an
 *  annotation, so non-TypeScript hosts must materialize these values before
 *  deriving the honesty caption. */
declare const ENVELOPE_NORMALIZATION_POLICY: Readonly<{
    version: "1";
    evaluationOrder: readonly string[];
    vizSpecDefaults: Readonly<{
        params: Readonly<{}>;
        mode: "interactive";
        themeMode: "dark";
    }>;
    honestyDefaults: Readonly<{
        calibrated_posterior: false;
        advisory_only: true;
        is_paper_local_evidence: false;
        synthetic: false;
    }>;
    jsonSchemaDefaultsAreAnnotations: true;
    missingHonestyFlagsMustUseConservativeDefaults: true;
}>;
declare const JsonParamsSchema: z.ZodType<Record<string, unknown>, unknown>;
declare const ProvenanceSchema: z.ZodObject<{
    source: z.ZodString;
    calibrated_posterior: z.ZodDefault<z.ZodLiteral<false>>;
    advisory_only: z.ZodDefault<z.ZodBoolean>;
    is_paper_local_evidence: z.ZodDefault<z.ZodBoolean>;
    caption: z.ZodOptional<z.ZodString>;
    declared_inputs: z.ZodOptional<z.ZodPipe<z.ZodType<Record<string, unknown>, unknown, z.core.$ZodTypeInternals<Record<string, unknown>, unknown>>, z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodLiteral<true>]>>>>;
    synthetic: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
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
        "population-rate": "population-rate";
        correlogram: "correlogram";
        "weight-histogram": "weight-histogram";
        "connection-matrix": "connection-matrix";
        "degree-distribution": "degree-distribution";
        "delay-distribution": "delay-distribution";
        "spatial-map-2d": "spatial-map-2d";
        "knowledge-graph-3d": "knowledge-graph-3d";
    }>;
    skill: z.ZodOptional<z.ZodString>;
    specVersion: z.ZodOptional<z.ZodLiteral<"1.3.0">>;
    params: z.ZodDefault<z.ZodType<Record<string, unknown>, unknown, z.core.$ZodTypeInternals<Record<string, unknown>, unknown>>>;
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
        calibrated_posterior: z.ZodDefault<z.ZodLiteral<false>>;
        advisory_only: z.ZodDefault<z.ZodBoolean>;
        is_paper_local_evidence: z.ZodDefault<z.ZodBoolean>;
        caption: z.ZodOptional<z.ZodString>;
        declared_inputs: z.ZodOptional<z.ZodPipe<z.ZodType<Record<string, unknown>, unknown, z.core.$ZodTypeInternals<Record<string, unknown>, unknown>>, z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodLiteral<true>]>>>>;
        synthetic: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strict>;
}, z.core.$strict>;
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

/** The runtime-validated provenance shape. Derived from VizSpec so the React
 *  render boundary and honesty helpers cannot drift from the Zod contract. */
type ProvenanceMetadata = VizSpec['provenance'];
declare const CONSERVATIVE_PROVENANCE: Readonly<Pick<ProvenanceMetadata, 'calibrated_posterior' | 'advisory_only' | 'is_paper_local_evidence' | 'synthetic'>>;
/** Language-neutral caption derivation contract, emitted in the manifest. */
declare const HONESTY_POLICY: Readonly<{
    version: "2";
    calibratedPosteriorAccepted: false;
    captionRequiredWhenAny: readonly string[];
    syntheticSourceMatch: Readonly<{
        caseInsensitive: true;
        equals: readonly string[];
        prefixes: readonly string[];
    }>;
    precedence: readonly string[];
    templates: Readonly<{
        synthetic: "Schematic — illustrative synthetic data, not measured.";
        advisory_only: "Advisory — advisory evidence only; not a calibrated posterior.";
        not_paper_local: "Advisory — not paper-local evidence; candidate ranking only.";
        not_calibrated: "Illustrative — not a calibrated posterior.";
    }>;
    callerCaption: "append_only_unverified";
    callerCaptionLabel: "Caller note (unverified):";
    callerCaptionControls: "escape C0/C1, bidi, zero-width, and BOM controls";
    bidiIsolationRequired: true;
    weakSkillDisclosure: "prepend";
}>;
/**
 * Whether the renderer must show a non-dismissible "illustrative / not measured"
 * honesty caption. Fail-closed: any non-rigorous flag forces the caption on.
 */
declare function requiresHonestyCaption(p: ProvenanceMetadata): boolean;
/**
 * The mandatory disclosure computed from the provenance FLAGS. This is the
 * load-bearing honesty text: it is derived only from the machine-checkable flags
 * (never from caller-supplied free text) so an agent cannot re-label synthetic or
 * advisory data as measured. Precedence: synthetic → schematic; advisory-only →
 * advisory; non-paper-local → advisory; then the residual posterior disclosure.
 */
declare function mandatoryDisclosure(p: ProvenanceMetadata): string;
/**
 * Caption text when a caption is required. The mandatory disclosure ALWAYS leads;
 * a caller-supplied `caption` is only ever APPENDED as explicitly unverified
 * context, never a replacement. This is deliberate: `provenance.caption` is
 * agent-controllable and content-unchecked (see ProvenanceSchema), so an
 * unlabeled suffix could visibly contradict the disclosure. The disclosure
 * prefix can never be suppressed — the honesty boundary is fail-closed.
 */
declare function defaultHonestyCaption(p: ProvenanceMetadata): string;

declare const NEST_SKILL_IDS: readonly ["nest.voltage_trace", "nest.spike_raster", "nest.isi_distribution", "nest.psth", "nest.population_rate", "nest.rate_response", "nest.connectivity_matrix", "nest.connection_graph", "nest.adjacency_matrix", "nest.weight_matrix", "nest.delay_matrix", "nest.in_degree_distribution", "nest.out_degree_distribution", "nest.delay_distribution", "nest.weight_histogram", "nest.spatial_2d", "nest.spatial_map_2d", "nest.spatial_3d", "nest.plasticity_dynamics", "nest.phase_plane", "nest.correlogram", "nest.stimulus_response", "nest.astrocyte_dynamics", "nest.compartmental_dynamics", "nest.animation_replay", "corpus.knowledge_graph"];
type NestSkillId = (typeof NEST_SKILL_IDS)[number];
/** Neutral aliases — the axis is not NEST-only (see corpus.knowledge_graph).
 *  Prefer these in new code; the NEST_-prefixed names remain for back-compat. */
declare const SKILL_IDS: readonly ["nest.voltage_trace", "nest.spike_raster", "nest.isi_distribution", "nest.psth", "nest.population_rate", "nest.rate_response", "nest.connectivity_matrix", "nest.connection_graph", "nest.adjacency_matrix", "nest.weight_matrix", "nest.delay_matrix", "nest.in_degree_distribution", "nest.out_degree_distribution", "nest.delay_distribution", "nest.weight_histogram", "nest.spatial_2d", "nest.spatial_map_2d", "nest.spatial_3d", "nest.plasticity_dynamics", "nest.phase_plane", "nest.correlogram", "nest.stimulus_response", "nest.astrocyte_dynamics", "nest.compartmental_dynamics", "nest.animation_replay", "corpus.knowledge_graph"];
type SkillId = NestSkillId;
/** The routing meta-skill. Not a renderer — it selects among the skills above
 *  (count derives from SKILL_IDS.length, so this can never drift again). */
declare const VIZ_ROUTER_ID: "nest.viz_router";
type VizRouterId = typeof VIZ_ROUTER_ID;
declare const NEST_DEVICE_FAMILIES: readonly ["multimeter", "spike_recorder", "correlation_detector", "get_connections", "get_position", "weight_recorder", "computed", "corpus"];
type NestDeviceFamily = (typeof NEST_DEVICE_FAMILIES)[number];
/** Membership guard for the closed skill set. Note the set includes non-NEST
 *  skills (corpus.knowledge_graph), so `isSkillId` is the accurate name. */
declare function isSkillId(value: unknown): value is SkillId;
/** @deprecated Misnomer — the set is not NEST-only. Use `isSkillId`. */
declare const isNestSkillId: typeof isSkillId;
declare const VALID_RENDERER_ROUTES: readonly ["media.trace_figure", "media.model_graph", "media.webgl_scene", "media.react_fiber_scene", "media.manim_storyboard", "media.*", "matplotlib", "d3", "three", "fiber", "manim"];
type RendererRoute = (typeof VALID_RENDERER_ROUTES)[number];

interface SkillInvocationError {
    code: 'unknown_skill' | 'invalid_envelope' | 'no_cortexel_scene' | 'cortexel_scene_available' | 'scene_mismatch' | 'skill_mismatch' | 'unsupported_spec_version' | 'invalid_params' | 'missing_provenance' | 'invalid_provenance' | 'calibrated_posterior_unsupported' | 'unknown_palette' | 'invalid_renderer_route';
    path: string;
    message: string;
    hint?: string;
    validScenes?: readonly SceneName[];
    validSkills?: readonly string[];
    validPalettes?: string[];
    /** Nearest registered skill id (edit-distance) for a mistyped `unknown_skill`,
     *  so an agent can self-repair a typo without scanning the full list. */
    didYouMean?: string;
    /** A copyable valid payload for this skill, attached to actionable errors so
     *  an autonomous agent can self-repair without reading source. */
    example?: VizSpec | HostRendererInvocation;
}
type SkillInvocationResult = {
    ok: true;
    spec: VizSpec;
    skill: (typeof NEST_SKILL_IDS)[number];
    scene: SceneName;
    caption: string | null;
} | {
    ok: false;
    errors: SkillInvocationError[];
};
type SkillParamsResult = {
    ok: true;
    params: Record<string, unknown>;
} | {
    ok: false;
    errors: SkillInvocationError[];
};
/** Validate params for any registered skill, including scene-less skills that
 *  route to a host renderer. This is the language-level counterpart to the
 *  manifest's paramsJsonSchema + paramConstraints pair. */
declare function validateSkillParams(skillId: unknown, params: unknown): SkillParamsResult;
/** Strict, skill-aware validation that never throws for malformed runtime input. */
declare function validateSkillInvocation(skillId: unknown, payload: unknown): SkillInvocationResult;

declare const HostRendererInvocationSchema: z.ZodObject<{
    skill: z.ZodString;
    specVersion: z.ZodOptional<z.ZodLiteral<"1.3.0">>;
    params: z.ZodType<Record<string, unknown>, unknown, z.core.$ZodTypeInternals<Record<string, unknown>, unknown>>;
    provenance: z.ZodObject<{
        source: z.ZodString;
        calibrated_posterior: z.ZodDefault<z.ZodLiteral<false>>;
        advisory_only: z.ZodDefault<z.ZodBoolean>;
        is_paper_local_evidence: z.ZodDefault<z.ZodBoolean>;
        caption: z.ZodOptional<z.ZodString>;
        declared_inputs: z.ZodOptional<z.ZodPipe<z.ZodType<Record<string, unknown>, unknown, z.core.$ZodTypeInternals<Record<string, unknown>, unknown>>, z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodLiteral<true>]>>>>;
        synthetic: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strict>;
    rendererRoute: z.ZodOptional<z.ZodEnum<{
        "media.trace_figure": "media.trace_figure";
        "media.model_graph": "media.model_graph";
        "media.webgl_scene": "media.webgl_scene";
        "media.react_fiber_scene": "media.react_fiber_scene";
        "media.manim_storyboard": "media.manim_storyboard";
        "media.*": "media.*";
        matplotlib: "matplotlib";
        d3: "d3";
        three: "three";
        fiber: "fiber";
        manim: "manim";
    }>>;
}, z.core.$strict>;
type HostRendererInvocation = z.infer<typeof HostRendererInvocationSchema>;
type HostRendererInvocationResult = {
    ok: true;
    spec: HostRendererInvocation;
    rendererRoutes: readonly RendererRoute[];
    caption: string | null;
} | {
    ok: false;
    errors: SkillInvocationError[];
};
/** Validate a scene-less skill envelope without ever inventing a scene. */
declare function validateHostRendererInvocation(skillId: unknown, payload: unknown): HostRendererInvocationResult;
/** Re-validate a stored, self-describing host-renderer invocation. */
declare function validateHostRendererSpec(payload: unknown): HostRendererInvocationResult;

export { validateHostRendererSpec as $, type STDPSynapse as A, STRING_NORMALIZATION_POLICY as B, CAMERA_PRESETS as C, DECLARED_INPUTS_PORTABLE_SCHEMA as D, ENVELOPE_NORMALIZATION_POLICY as E, type SceneFraming as F, type SkillId as G, type HostRendererInvocation as H, type SkillParamsResult as I, JSON_BUDGET_SEMANTICS as J, VALID_RENDERER_ROUTES as K, type LayerConfig as L, VIZ_ROUTER_ID as M, type NestSkillId as N, type VizRouterId as O, type ProvenanceMetadata as P, VizSpecSchema as Q, type RendererRoute as R, type SceneName as S, type VizSpecValidation as T, defaultHonestyCaption as U, type VizSpec as V, isNestSkillId as W, isSkillId as X, mandatoryDisclosure as Y, requiresHonestyCaption as Z, validateHostRendererInvocation as _, type SkillInvocationError as a, validateSkillInvocation as a0, validateSkillParams as a1, validateVizSpec as a2, type NestDeviceFamily as b, type HostRendererInvocationResult as c, type SkillInvocationResult as d, type SceneData as e, CONSERVATIVE_PROVENANCE as f, CORTEXEL_JSON_LIMITS as g, CORTEXEL_JSON_POLICY as h, CORTEXEL_SPEC_VERSION as i, type CameraPreset as j, type CameraPresetName as k, HONESTY_POLICY as l, HostRendererInvocationSchema as m, JSON_PARAMS_PORTABLE_SCHEMA as n, JsonParamsSchema as o, NEST_DEVICE_FAMILIES as p, NEST_SKILL_IDS as q, NUMERIC_MODEL_POLICY as r, type NeuralSceneHandle as s, type NeuralSceneMode as t, type NeuralSceneProps as u, type PlaybackState as v, ProvenanceSchema as w, SCENE_FRAMING as x, SCENE_NAMES as y, SKILL_IDS as z };
