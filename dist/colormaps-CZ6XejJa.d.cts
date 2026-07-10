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
/** Palette names are open-ended: hosts register arbitrary names at runtime. */
type PaletteName = string;
/** Metadata describing a palette's color-theory properties. */
interface PaletteMetadata {
    /** Human-readable label for UI display. */
    label: string;
    /** Color theory source (e.g. "Crameri 2018", "Okabe & Ito 2008"). */
    source: string;
    /** Whether the E/I and LTP/LTD colors use a diverging scheme (recommended
     *  for signed data). Sequential palettes on signed data invent structure. */
    diverging: boolean;
}
interface SemanticPalette {
    voidNavy: string;
    deepNavy: string;
    panel: string;
    grid: string;
    cyan: string;
    teal: string;
    violet: string;
    amber: string;
    orange: string;
    pink: string;
    membrane: string;
    spike: string;
    spikeHot: string;
    excitatory: string;
    inhibitory: string;
    ltp: string;
    ltd: string;
    ink: string;
    inkDim: string;
    inkFaint: string;
}
type ReadonlySemanticPalette = Readonly<SemanticPalette>;
type ReadonlyPaletteMetadata = Readonly<PaletteMetadata>;
/** A registered palette entry: the colors plus metadata. */
interface PaletteEntry {
    readonly palette: ReadonlySemanticPalette;
    readonly metadata: ReadonlyPaletteMetadata;
}
declare const PALETTE_REGISTRY_POLICY: Readonly<{
    version: "1";
    validation: "selected palette name must exist in the active runtime registry";
    manifestPalettes: "build-time discovery snapshot only";
    runtimeExtensionsAllowed: true;
    registration: "strict descriptor snapshot, validated then frozen";
    fallbackIsNotValidation: true;
}>;
/** Default palette — Crameri scientific colour maps (batlow + vik). */
declare const CORTEXEL_PALETTE: ReadonlySemanticPalette;
declare const SEMANTIC_PALETTE_KEYS: readonly (keyof SemanticPalette)[];
/** Validate a palette's exact shape, hex values and E/I distinctness. */
declare function validatePalette(p: ReadonlySemanticPalette): void;
/** Register a palette at runtime. Hosts call this at app startup to add their
 *  color identities. Validates hex format and E/I distinctness. Throws on
 *  invalid input. Overwriting an existing name is allowed (for hot-reload). */
declare function registerPalette(name: PaletteName, palette: ReadonlySemanticPalette, metadata: ReadonlyPaletteMetadata): void;
/** Select a semantic palette by name. Falls back to the default ('crameri')
 *  if the name is not registered. In dev mode, warns on non-default fallback
 *  so missing registrations surface during development instead of silently
 *  producing the wrong colors. */
declare function getPalette(name?: PaletteName): ReadonlySemanticPalette;
/** Get full palette entry (colors + metadata) by name. Returns undefined if
 *  not registered. */
declare function getPaletteEntry(name: PaletteName): PaletteEntry | undefined;
/** List all registered palette names with their metadata. Agents use this for
 *  discoverability; the manifest serializes it for non-TS hosts. */
declare function listPalettes(): {
    readonly name: PaletteName;
    readonly metadata: ReadonlyPaletteMetadata;
}[];
/** Check whether a palette name is registered. */
declare function isRegisteredPalette(name: string): boolean;
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
declare const TURBO_GLSL = "\nvec3 turbo(float x) {\n  x = clamp(x, 0.0, 1.0);\n  vec4 v4 = vec4(1.0, x, x * x, x * x * x);\n  vec2 v2 = v4.zw * v4.z;\n  return clamp(vec3(\n    dot(v4, vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234)) + dot(v2, vec2(-152.94239396, 59.28637943)),\n    dot(v4, vec4(0.09140261, 2.19418839,   4.84296658, -14.18503333)) + dot(v2, vec2(  4.27729857,  2.82956604)),\n    dot(v4, vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771)) + dot(v2, vec2(-89.90310912, 27.34824973))\n  ), 0.0, 1.0);\n}\n";
declare const VIRIDIS_GLSL = "\nvec3 viridis(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 c0 = vec3(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);\n  const vec3 c1 = vec3(0.1050930431085774, 1.404613529898575, 1.384590162594685);\n  const vec3 c2 = vec3(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);\n  const vec3 c3 = vec3(-4.634230498983486, -5.799100973351585, -19.33244095627987);\n  const vec3 c4 = vec3(6.228269936347081, 14.17993336680509, 56.69055260068105);\n  const vec3 c5 = vec3(4.776384997670288, -13.74514537774601, -65.35303263337234);\n  const vec3 c6 = vec3(-5.435455855934631, 4.645852612178535, 26.3124352495832);\n  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));\n}\n";
declare const BATLOW_GLSL = "\nvec3 batlow(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 stops[13] = vec3[13](\n    vec3(0.004,0.098,0.350), vec3(0.051,0.176,0.361), vec3(0.102,0.259,0.376),\n    vec3(0.153,0.353,0.376), vec3(0.227,0.420,0.329), vec3(0.322,0.455,0.290),\n    vec3(0.420,0.482,0.243), vec3(0.541,0.525,0.200), vec3(0.631,0.541,0.169),\n    vec3(0.753,0.565,0.212), vec3(0.847,0.578,0.282), vec3(0.929,0.605,0.385),\n    vec3(0.981,0.800,0.981)\n  );\n  float x = t * 12.0;\n  int i = int(floor(x));\n  float f = x - float(i);\n  if (i >= 12) return stops[12];\n  return mix(stops[i], stops[i + 1], f);\n}\n";
declare const VIK_GLSL = "\nvec3 vik(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 stops[11] = vec3[11](\n    vec3(0.001,0.070,0.380), vec3(0.009,0.193,0.458), vec3(0.075,0.398,0.591),\n    vec3(0.236,0.522,0.674), vec3(0.483,0.713,0.784), vec3(0.858,0.897,0.915),\n    vec3(0.859,0.647,0.518), vec3(0.728,0.368,0.166), vec3(0.596,0.199,0.028),\n    vec3(0.436,0.068,0.026), vec3(0.350,0.000,0.030)\n  );\n  float x = t * 10.0;\n  int i = int(floor(x));\n  float f = x - float(i);\n  if (i >= 10) return stops[10];\n  return mix(stops[i], stops[i + 1], f);\n}\n";

export { AXIS_COLORS as A, BATLOW_GLSL as B, CATEGORICAL as C, OKABE_ITO as O, PALETTE_REGISTRY_POLICY as P, type ReadonlySemanticPalette as R, SEMANTIC_PALETTE_KEYS as S, TURBO_GLSL as T, VIK_GLSL as V, CORTEXEL_PALETTE as a, CORTICAL_LAYER_COLORS as b, type ColormapName as c, type PaletteEntry as d, type PaletteMetadata as e, type PaletteName as f, type RGB as g, type ReadonlyPaletteMetadata as h, SYNAPSE_COLORS as i, type SemanticPalette as j, VIRIDIS_GLSL as k, categorical as l, colormapGradient as m, colormapHex as n, colormapRgba as o, colormapSvgStops as p, getPalette as q, getPaletteEntry as r, isRegisteredPalette as s, listPalettes as t, registerPalette as u, sampleColormap as v, validatePalette as w };
