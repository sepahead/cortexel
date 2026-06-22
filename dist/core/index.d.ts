export { C as CAMERA_PRESETS, a as CameraPreset, b as CameraPresetName, L as LayerConfig, N as NeuralSceneHandle, c as NeuralSceneMode, d as NeuralSceneProps, P as PlaybackState, S as SCENE_FRAMING, e as SCENE_NAMES, f as STDPSynapse, g as SceneData, h as SceneFraming, i as SceneName } from '../designLaws-DIbEzwRB.js';
import { z } from 'zod';

type RGB = readonly [number, number, number];
type ColormapName = 'viridis' | 'magma' | 'inferno' | 'plasma' | 'cividis' | 'turbo';
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
declare const ENGRAM_PALETTE: {
    readonly voidNavy: "#030711";
    readonly deepNavy: "#050816";
    readonly panel: "#0b1220";
    readonly grid: "#1e293b";
    readonly cyan: "#22d3ee";
    readonly teal: "#2dd4bf";
    readonly violet: "#a78bfa";
    readonly amber: "#fbbf24";
    readonly orange: "#fb923c";
    readonly pink: "#f472b6";
    readonly membrane: "#14f1dd";
    readonly spike: "#fde68a";
    readonly spikeHot: "#fff7ed";
    readonly excitatory: "#38bdf8";
    readonly inhibitory: "#fb7185";
    readonly ltp: "#22d3ee";
    readonly ltd: "#fb923c";
    readonly ink: "#e2e8f0";
    readonly inkDim: "#94a3b8";
    readonly inkFaint: "#64748b";
};
declare const CORTICAL_LAYER_COLORS: Record<string, string>;
/** Categorical neuron/population colors — distinct, colorblind-aware hues. */
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
        readonly excitatory: "#4a6b8a";
        readonly inhibitory: "#8a6b4a";
    };
    readonly light: {
        readonly excitatory: "#7d97b5";
        readonly inhibitory: "#b5977d";
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

declare const ProvenanceSchema: z.ZodObject<{
    source: z.ZodString;
    calibrated_posterior: z.ZodDefault<z.ZodBoolean>;
    advisory_only: z.ZodDefault<z.ZodBoolean>;
    is_paper_local_evidence: z.ZodDefault<z.ZodBoolean>;
    caption: z.ZodOptional<z.ZodString>;
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
}
declare const CONSERVATIVE_PROVENANCE: Readonly<Pick<ProvenanceMetadata, 'calibrated_posterior' | 'advisory_only' | 'is_paper_local_evidence'>>;
/**
 * Whether the renderer must show a non-dismissible "illustrative / not measured"
 * honesty caption. Fail-closed: any non-rigorous flag forces the caption on.
 */
declare function requiresHonestyCaption(p: ProvenanceMetadata): boolean;
/** Default caption text when none is supplied but a caption is required. */
declare function defaultHonestyCaption(p: ProvenanceMetadata): string;

export { AXIS_COLORS, CATEGORICAL, CONSERVATIVE_PROVENANCE, CORTICAL_LAYER_COLORS, type ColormapName, ENGRAM_PALETTE, OKABE_ITO, type ProvenanceMetadata, ProvenanceSchema, type RGB, SYNAPSE_COLORS, TURBO_GLSL, VIRIDIS_GLSL, type VizSpec, VizSpecSchema, type VizSpecValidation, categorical, colormapGradient, colormapHex, colormapRgba, colormapSvgStops, defaultHonestyCaption, requiresHonestyCaption, sampleColormap, validateVizSpec };
