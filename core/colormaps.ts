// Scientific color system for neural-simulation visualizations.
//
// One perceptually-uniform color language shared across every renderer:
// WebGL shaders, React Three Fiber scenes, D3/SVG agent media skills, and
// (a host backend may mirror these in its matplotlib figures).
//
// Why perceptually-uniform maps (viridis, magma, turbo, cividis …)?
//   - Equal steps in data read as equal steps in lightness, so structure is
//     not invented or hidden by the colormap (unlike jet/rainbow).
//   - They stay legible in grayscale and for the most common color-vision
//     deficiencies. cividis is optimized for deuteranopia/protanopia.
// These are the same families matplotlib ships, so a figure rendered on the
// backend and a scene rendered in WebGL share one identity.

export type RGB = readonly [number, number, number]; // 0–255
export type ColormapName =
  | 'viridis'
  | 'magma'
  | 'inferno'
  | 'plasma'
  | 'cividis'
  | 'turbo';

// ───────────────────────── sRGB hex control stops ─────────────────────────
// Evenly-spaced samples of each matplotlib colormap. Interpolating between
// them in sRGB is visually indistinguishable from the full 256-entry table at
// the resolutions we render, and keeps this module dependency-free.

const STOPS: Record<Exclude<ColormapName, 'turbo'>, readonly string[]> = {
  viridis: [
    '#440154', '#472d7b', '#3b528b', '#2c728e', '#21918c',
    '#28ae80', '#5ec962', '#addc30', '#fde725',
  ],
  magma: [
    '#000004', '#180f3e', '#451077', '#721f81', '#9f2f7f',
    '#cd4071', '#f1605d', '#fd9567', '#feca8d', '#fcfdbf',
  ],
  inferno: [
    '#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60',
    '#cf4446', '#ed6925', '#fb9a06', '#f7d13d', '#fcffa4',
  ],
  plasma: [
    '#0d0887', '#41049d', '#6a00a8', '#8f0da4', '#b12a90',
    '#cc4778', '#e16462', '#f2844b', '#fca636', '#fcce25', '#f0f921',
  ],
  cividis: [
    '#00224e', '#123570', '#3b496c', '#575d6d', '#707173',
    '#8a8779', '#a59c74', '#c3b369', '#e1cc55', '#fee838',
  ],
};

function hexToRgb(hex: string): RGB {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const STOP_RGB: Record<Exclude<ColormapName, 'turbo'>, RGB[]> = {
  viridis: STOPS.viridis.map(hexToRgb),
  magma: STOPS.magma.map(hexToRgb),
  inferno: STOPS.inferno.map(hexToRgb),
  plasma: STOPS.plasma.map(hexToRgb),
  cividis: STOPS.cividis.map(hexToRgb),
};

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function sampleStops(stops: readonly RGB[], t: number): RGB {
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= stops.length - 1) return stops[stops.length - 1];
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

// Turbo — Google's improved rainbow (Anton Mikhailov, 2019). Exact polynomial
// fit, so no LUT is needed. It is the one "rainbow" that is reasonably
// perceptual; we reserve it for signed/divergent fields and flow, never for
// magnitude where viridis-family maps are the honest choice.
function turbo(t: number): RGB {
  const x = clamp01(t);
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x3 * x;
  const x5 = x4 * x;
  const r =
    0.13572138 + 4.6153926 * x - 42.66032258 * x2 + 132.13108234 * x3 -
    152.94239396 * x4 + 59.28637943 * x5;
  const g =
    0.09140261 + 2.19418839 * x + 4.84296658 * x2 - 14.18503333 * x3 +
    4.27729857 * x4 + 2.82956604 * x5;
  const b =
    0.1066733 + 12.64194608 * x - 60.58204836 * x2 + 110.36276771 * x3 -
    89.90310912 * x4 + 27.34824973 * x5;
  return [
    Math.round(clamp01(r) * 255),
    Math.round(clamp01(g) * 255),
    Math.round(clamp01(b) * 255),
  ];
}

/** Sample a perceptually-uniform colormap at `t ∈ [0, 1]` → RGB (0–255). */
export function sampleColormap(name: ColormapName, t: number): RGB {
  if (name === 'turbo') return turbo(t);
  return sampleStops(STOP_RGB[name], t);
}

/** Sample a colormap at `t ∈ [0, 1]` → `#rrggbb`. */
export function colormapHex(name: ColormapName, t: number): string {
  const [r, g, b] = sampleColormap(name, t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Sample a colormap → `rgba(r, g, b, a)` with explicit alpha. */
export function colormapRgba(name: ColormapName, t: number, alpha = 1): string {
  const [r, g, b] = sampleColormap(name, t);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A CSS `linear-gradient(...)` spanning a colormap, for legends and bars. */
export function colormapGradient(name: ColormapName, angle = 90, stops = 12): string {
  const parts: string[] = [];
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1);
    parts.push(`${colormapHex(name, t)} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(${angle}deg, ${parts.join(', ')})`;
}

/** SVG `<stop>` entries for a `<linearGradient>` spanning a colormap. */
export function colormapSvgStops(name: ColormapName, stops = 8): string {
  let out = '';
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1);
    out += `<stop offset="${(t * 100).toFixed(1)}%" stop-color="${colormapHex(name, t)}"/>`;
  }
  return out;
}

// ───────────────────────── Semantic palette ─────────────────────────
// Named colors carry meaning consistently across every figure and scene, so a
// reader who learns "cyan = excitatory / potentiation" in one view keeps it in
// the next. Tuned for the deep-navy (#050816 / #030711) canvas the UI uses.

export const CORTEXEL_PALETTE = {
  // Canvas / surfaces
  voidNavy: '#030711',
  deepNavy: '#050816',
  panel: '#0b1220',
  grid: '#1e293b',
  // Brand signal
  cyan: '#22d3ee',
  teal: '#2dd4bf',
  violet: '#a78bfa',
  amber: '#fbbf24',
  orange: '#fb923c',
  pink: '#f472b6',
  // Membrane / spikes
  membrane: '#14f1dd',
  spike: '#fde68a',
  spikeHot: '#fff7ed',
  // Excitatory vs inhibitory (Allen/MICrONS convention: E warm-cyan, I red)
  excitatory: '#38bdf8',
  inhibitory: '#fb7185',
  // Plasticity (LTP potentiation vs LTD depression)
  ltp: '#22d3ee',
  ltd: '#fb923c',
  // Text
  ink: '#e2e8f0',
  inkDim: '#94a3b8',
  inkFaint: '#64748b',
} as const;

// Cortical layers L1–L6 — sampled along viridis so layer order maps to a
// monotone perceptual ramp (deep → superficial reads as a gradient, not a
// random set of hues), while staying distinct.
export const CORTICAL_LAYER_COLORS: Record<string, string> = {
  L1: colormapHex('viridis', 0.05),
  'L2/3': colormapHex('viridis', 0.3),
  L4: colormapHex('viridis', 0.52),
  L5: colormapHex('viridis', 0.72),
  L6: colormapHex('viridis', 0.92),
};

/** Categorical neuron/population colors — distinct, colorblind-aware hues. */
export const CATEGORICAL: readonly string[] = [
  '#22d3ee', '#a78bfa', '#fb923c', '#34d399', '#f472b6',
  '#facc15', '#60a5fa', '#fb7185', '#2dd4bf', '#c084fc',
];

export function categorical(i: number): string {
  return CATEGORICAL[((i % CATEGORICAL.length) + CATEGORICAL.length) % CATEGORICAL.length];
}

// Okabe & Ito (2008) — the reference colorblind-safe categorical set: eight
// hues that stay distinct under deuteranopia, protanopia, and tritanopia. Use
// for E/I and discrete category encodings where viridis (a magnitude ramp) is
// the wrong tool. These are an honest categorical language, NOT semantic status
// colors — never wire them to success/ready/error meaning.
export const OKABE_ITO = {
  black: '#000000',
  orange: '#e69f00',
  skyBlue: '#56b4e9',
  green: '#009e73',
  yellow: '#f0e442',
  blue: '#0072b2',
  vermilion: '#d55e00',
  reddishPurple: '#cc79a7',
} as const;

// ─────────────────────── Subtle synapse E/I wire colours ───────────────────────
// Connection wires read as quiet STRUCTURE, not loud signal: desaturated,
// bloom-safe echoes of the neuron convention (E azure / I vermilion) pulled down
// in saturation + value. Apply at opacity ~0.4–0.5 at the call site (per renderer).
// CB-safe: cool-blue E vs warm-orange I stay separable under deuteranopia/
// protanopia and never collide with the gold spike flash. Use `.excitatory`
// UNIFORMLY where a graph carries no honest E/I metadata — do not invent inhibition.
export const SYNAPSE_COLORS = {
  dark: {
    excitatory: '#4a6b8a',   // muted azure
    inhibitory: '#8a6b4a',   // muted warm
  },
  light: {
    excitatory: '#7d97b5',   // soft blue-grey (lifted for light canvas)
    inhibitory: '#b5977d',   // soft warm-grey (lifted for light canvas)
  },
} as const;

// Axis / tick / grid text colors tuned for WCAG AA on each canvas. The prior
// scattered values (#94a3b8 on dark, #64748b on light) sat just under AA for
// small axis text; these clear it on the deep-navy (#050816) and light
// (#f8fafc) canvases the scenes render against.
export const AXIS_COLORS = {
  lightAxisLabel: '#1f2937', // slate-800 — AA on light canvas
  lightAxisLine: '#475569',  // slate-600
  lightGridLine: '#cbd5e1',  // slate-300 (use with low opacity)
  darkAxisLabel: '#cbd5e1',  // slate-300 — AA on deep-navy canvas
  darkAxisLine: '#64748b',   // slate-500
  darkGridLine: '#334155',   // slate-700 (use with low opacity)
} as const;

// ───────────────────────── GLSL colormap source ─────────────────────────
// Drop-in functions for shaders that map a scalar field → color. Turbo is the
// exact polynomial above; viridis is the well-established analytic fit
// (Mikhailov / Zucker) accurate to within a few LSBs. Inject with string
// concatenation into a ShaderMaterial's GLSL.

export const TURBO_GLSL = /* glsl */ `
vec3 turbo(float x) {
  x = clamp(x, 0.0, 1.0);
  vec4 v4 = vec4(1.0, x, x * x, x * x * x);
  vec2 v2 = v4.zw * v4.z;
  return vec3(
    dot(v4, vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234)) + dot(v2, vec2(-152.94239396, 59.28637943)),
    dot(v4, vec4(0.09140261, 2.19418839,   4.84296658, -14.18503333)) + dot(v2, vec2(  4.27729857,  2.82956604)),
    dot(v4, vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771)) + dot(v2, vec2(-89.90310912, 27.34824973))
  );
}
`;

export const VIRIDIS_GLSL = /* glsl */ `
vec3 viridis(float t) {
  t = clamp(t, 0.0, 1.0);
  const vec3 c0 = vec3(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);
  const vec3 c1 = vec3(0.1050930431085774, 1.404613529898575, 1.384590162594685);
  const vec3 c2 = vec3(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);
  const vec3 c3 = vec3(-4.634230498983486, -5.799100973351585, -19.33244095627987);
  const vec3 c4 = vec3(6.228269936347081, 14.17993336680509, 56.69055260068105);
  const vec3 c5 = vec3(4.776384997670288, -13.74514537774601, -65.35303263337234);
  const vec3 c6 = vec3(-5.435455855934631, 4.645852612178535, 26.3124352495832);
  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}
`;
