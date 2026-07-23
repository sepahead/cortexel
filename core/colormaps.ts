// Scientific color system for neural-simulation visualizations.
//
// One perceptually-uniform color language shared across every renderer:
// WebGL shaders, React Three Fiber scenes, D3/SVG agent media skills, and
// (a host backend may mirror these in its matplotlib figures).
//
// The default sequential colormap is batlow (Crameri 2018, Nature
// Communications 2020) — the scientifically recommended replacement for
// jet/rainbow and the viridis family. It is perceptually uniform, CVD-friendly,
// and readable in black-and-white print. vik is the diverging map for signed
// fields (E/I, LTP/LTD, membrane currents). The semantic palette below derives
// every color from a Crameri map, not from generic UI palettes (Tailwind,
// Material), so the visual identity is grounded in scientific colour theory.
//
// References:
//   Crameri, F. (2018), Geosci. Model Dev., 11, 2541–2562.
//   Crameri, F., Shephard, G.E. & Heron, P.J. (2020), Nature Comms, 11, 5444.
//   www.fabiocrameri.ch/colourmaps — #UseBatlow

export type RGB = readonly [number, number, number]; // 0–255
export type ColormapName =
  | 'batlow'    // default sequential — the scientific rainbow
  | 'vik'       // diverging blue↔red — for signed fields (E/I, LTP/LTD)
  | 'viridis'
  | 'magma'
  | 'inferno'
  | 'plasma'
  | 'cividis'
  | 'turbo';

// ───────────────────────── sRGB hex control stops ─────────────────────────
// Evenly-spaced samples of each colormap. Interpolating between them in sRGB
// is visually indistinguishable from the full 256-entry table at the
// resolutions we render, and keeps this module dependency-free.
//
// batlow and vik stops are sampled from the official Crameri 256-entry tables
// (cmcrameri v8.0). The matplotlib-family stops are from their original
// implementations.

const STOPS: Record<Exclude<ColormapName, 'turbo'>, readonly string[]> = {
  batlow: [
    '#011959', '#0d2d5c', '#1a4260', '#275a60', '#3a6b54',
    '#52744a', '#6b7b3e', '#8a8633', '#a18a2b', '#c09036',
    '#d89448', '#ed9a62', '#faccfa',
  ],
  vik: [
    '#001261', '#023175', '#136697', '#3c85ac', '#7ba9c8',
    '#dbe5e9', '#dba584', '#ba5e2a', '#983307', '#6f1107', '#590008',
  ],
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
  batlow: STOPS.batlow.map(hexToRgb),
  vik: STOPS.vik.map(hexToRgb),
  viridis: STOPS.viridis.map(hexToRgb),
  magma: STOPS.magma.map(hexToRgb),
  inferno: STOPS.inferno.map(hexToRgb),
  plasma: STOPS.plasma.map(hexToRgb),
  cividis: STOPS.cividis.map(hexToRgb),
};

function clamp01(t: number): number {
  if (!Number.isFinite(t)) throw new RangeError('colormap sample t must be finite');
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function sampleStops(stops: readonly RGB[], t: number): RGB {
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= stops.length - 1) {
    const endpoint = stops[stops.length - 1];
    return [endpoint[0], endpoint[1], endpoint[2]];
  }
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

// Turbo — Google's improved rainbow (Anton Mikhailov, 2019). Copyright 2019
// Google LLC, Apache-2.0; modified TypeScript port. Exact polynomial
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
  if (name !== 'turbo' && !Object.hasOwn(STOP_RGB, name)) {
    throw new RangeError(`unknown colormap '${String(name)}'`);
  }
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
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError('alpha must be a finite number in [0, 1]');
  }
  const [r, g, b] = sampleColormap(name, t);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A CSS `linear-gradient(...)` spanning a colormap, for legends and bars. */
export function colormapGradient(name: ColormapName, angle = 90, stops = 12): string {
  if (!Number.isFinite(angle)) throw new RangeError('gradient angle must be finite');
  if (!Number.isSafeInteger(stops) || stops < 2 || stops > 256) {
    throw new RangeError('gradient stops must be an integer in [2, 256]');
  }
  const parts: string[] = [];
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1);
    parts.push(`${colormapHex(name, t)} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(${angle}deg, ${parts.join(', ')})`;
}

/** SVG `<stop>` entries for a `<linearGradient>` spanning a colormap. */
export function colormapSvgStops(name: ColormapName, stops = 8): string {
  if (!Number.isSafeInteger(stops) || stops < 2 || stops > 256) {
    throw new RangeError('SVG stops must be an integer in [2, 256]');
  }
  let out = '';
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1);
    out += `<stop offset="${(t * 100).toFixed(1)}%" stop-color="${colormapHex(name, t)}"/>`;
  }
  return out;
}

// ───────────────────────── Semantic palettes ─────────────────────────
// Named colors carry meaning consistently across every figure and scene, so a
// reader who learns "blue = excitatory / potentiation" in one view keeps it in
// the next.
//
// ARCHITECTURE: Cortexel ships one default palette ('crameri') and a runtime
// registration system. Hosts register their own palettes at startup:
//
//   import { registerPalette } from 'cortexel/core';
//   registerPalette('okabe-ito', okabeItoPalette);
//
// This keeps Cortexel host-agnostic: the library defines the interface and a
// scientifically grounded default, while hosts own their color identity.
// Palette names are open-ended strings (not a closed union) so any host can
// register any number of palettes without forking the library.
//
// The active palette flows as a RENDER POLICY through VizSpec.palette (optional
// agent hint) → validateSkillInvocation (validates the name exists) →
// RenderSceneArgs.palette (passed to the host's scene component). Scene
// components consume it from props, not from module-level imports.
//
// DEFAULT: 'crameri' — Crameri scientific colour maps (batlow sequential, vik
// diverging). Muted, earthy, scientifically honest. Allen/MICrONS E/I
// convention (cool blue E, warm red I). The scientifically recommended
// replacement for jet/rainbow and the viridis family (Crameri 2018, Nature
// Comms 2020).

/** Palette names are open-ended: hosts register arbitrary names at runtime. */
export type PaletteName = string;

/** Metadata describing a palette's color-theory properties. */
export interface PaletteMetadata {
  /** Human-readable label for UI display. */
  label: string;
  /** Color theory source (e.g. "Crameri 2018", "Okabe & Ito 2008"). */
  source: string;
  /** Whether the E/I and LTP/LTD colors use a diverging scheme (recommended
   *  for signed data). Sequential palettes on signed data invent structure. */
  diverging: boolean;
}

export interface SemanticPalette {
  // Canvas / surfaces
  voidNavy: string;
  deepNavy: string;
  panel: string;
  grid: string;
  // Brand signal
  cyan: string;
  teal: string;
  violet: string;
  amber: string;
  orange: string;
  pink: string;
  // Membrane / spikes
  membrane: string;
  spike: string;
  spikeHot: string;
  // Excitatory vs inhibitory
  excitatory: string;
  inhibitory: string;
  // Plasticity
  ltp: string;
  ltd: string;
  // Text
  ink: string;
  inkDim: string;
  inkFaint: string;
}

export type ReadonlySemanticPalette = Readonly<SemanticPalette>;
export type ReadonlyPaletteMetadata = Readonly<PaletteMetadata>;

/** A registered palette entry: the colors plus metadata. */
export interface PaletteEntry {
  readonly palette: ReadonlySemanticPalette;
  readonly metadata: ReadonlyPaletteMetadata;
}

export const PALETTE_REGISTRY_POLICY = Object.freeze({
  version: '1',
  validation: 'selected palette name must exist in the active runtime registry' as const,
  manifestPalettes: 'build-time discovery snapshot only' as const,
  runtimeExtensionsAllowed: true,
  registration: 'strict descriptor snapshot, validated then frozen' as const,
  fallbackIsNotValidation: true,
});

// Internal registry — starts with the default, hosts add more at runtime.
const _paletteRegistry = new Map<PaletteName, PaletteEntry>();

/** Default palette — Crameri scientific colour maps (batlow + vik). */
export const CORTEXEL_PALETTE: ReadonlySemanticPalette = {
  // Canvas / surfaces — the deep navy lets colors pop
  voidNavy: '#030711',
  deepNavy: '#050816',
  panel: '#0b1220',
  grid: '#1e293b',
  // Brand signal — sampled from batlow's distinctive mid-range
  cyan: '#275a60',      // batlow(0.25) — muted teal, not Tailwind cyan
  teal: '#3a6b54',      // batlow(0.30) — green-teal
  violet: '#faccfa',    // batlow(1.0)  — pale magenta, the batlow endpoint
  amber: '#c09036',     // batlow(0.55) — warm gold
  orange: '#d89448',    // batlow(0.70) — warm amber
  pink: '#ed9a62',      // batlow(0.80) — warm coral
  // Membrane / spikes — from batlow sequential
  membrane: '#52744a',  // batlow(0.35) — muted biological green
  spike: '#dd954d',     // batlow(0.78) — warm gold event marker
  spikeHot: '#ef9b67',  // batlow(0.92) — lighter warm for spike bursts
  // Excitatory vs inhibitory — from vik diverging (Allen/MICrONS convention:
  // cool blues for E, warm reds for I)
  excitatory: '#136697', // vik(0.15) — cool blue
  inhibitory: '#983307', // vik(0.85) — warm red-brown
  // Plasticity — from vik (LTP = cool potentiation, LTD = warm depression)
  ltp: '#023175',       // vik(0.08) — deep blue
  ltd: '#6f1107',       // vik(0.92) — deep red
  // Text — WCAG AA on the deep-navy canvas
  ink: '#e2e8f0',
  inkDim: '#94a3b8',
  inkFaint: '#64748b',
};
Object.freeze(CORTEXEL_PALETTE);

export const SEMANTIC_PALETTE_KEYS = Object.freeze(
  Object.keys(CORTEXEL_PALETTE) as (keyof SemanticPalette)[],
);

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function snapshotPalette(p: unknown): SemanticPalette {
  if (p === null || typeof p !== 'object' || Array.isArray(p)) {
    throw new TypeError('palette must be an object');
  }
  const prototype = Object.getPrototypeOf(p);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('palette must be a plain object');
  }
  const ownKeys = Reflect.ownKeys(p);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new Error('Palette may not contain symbol keys');
  }
  const keys = ownKeys as string[];
  const missing = SEMANTIC_PALETTE_KEYS.filter((key) => !keys.includes(key));
  const extra = keys.filter(
    (key) => !(SEMANTIC_PALETTE_KEYS as readonly string[]).includes(key),
  );
  if (missing.length > 0) throw new Error(`Palette is missing colors: ${missing.join(', ')}`);
  if (extra.length > 0) throw new Error(`Palette has unknown colors: ${extra.join(', ')}`);
  const snapshot = {} as SemanticPalette;
  for (const key of SEMANTIC_PALETTE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(p, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new Error(`Palette color '${key}' must be an enumerable data property`);
    }
    const val = descriptor.value;
    if (typeof val !== 'string') {
      throw new Error(`Palette color '${key}' must be a string`);
    }
    if (!HEX_RE.test(val)) {
      throw new Error(`Palette color '${key}' is not a valid #rrggbb hex: '${val}'`);
    }
    snapshot[key] = val;
  }
  // E/I and LTP/LTD must be perceptually distinct (not identical).
  if (snapshot.excitatory.toLowerCase() === snapshot.inhibitory.toLowerCase()) {
    throw new Error('Palette excitatory and inhibitory colors must differ');
  }
  if (snapshot.ltp.toLowerCase() === snapshot.ltd.toLowerCase()) {
    throw new Error('Palette ltp and ltd colors must differ');
  }
  return snapshot;
}

function snapshotPaletteMetadata(metadata: unknown): PaletteMetadata {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('palette metadata must be an object');
  }
  const prototype = Object.getPrototypeOf(metadata);
  const keys = Reflect.ownKeys(metadata);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    keys.length !== 3 ||
    keys.some((key) => typeof key !== 'string' || !['label', 'source', 'diverging'].includes(key))
  ) {
    throw new Error('palette metadata must be a strict plain {label,source,diverging} object');
  }
  const values: Record<string, unknown> = {};
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(metadata, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new Error(`palette metadata '${key}' must be an enumerable data property`);
    }
    values[key] = descriptor.value;
  }
  if (
    typeof values.label !== 'string' ||
    values.label.trim().length === 0 ||
    values.label.length > 120 ||
    typeof values.source !== 'string' ||
    values.source.trim().length === 0 ||
    values.source.length > 500 ||
    typeof values.diverging !== 'boolean'
  ) {
    throw new Error('palette metadata requires bounded label/source strings and diverging boolean');
  }
  return {
    label: values.label.trim(),
    source: values.source.trim(),
    diverging: values.diverging,
  };
}

/** Validate a palette's exact shape, hex values and E/I distinctness. */
export function validatePalette(p: ReadonlySemanticPalette): void {
  snapshotPalette(p);
}

// Register the default at module load. Hosts add more via registerPalette().
_paletteRegistry.set('crameri', Object.freeze({
  palette: CORTEXEL_PALETTE,
  metadata: Object.freeze({
    label: 'Crameri',
    source: 'Crameri 2018, Nature Comms 2020 (batlow + vik)',
    diverging: true,
  }),
}));

/** Register a palette at runtime. Hosts call this at app startup to add their
 *  color identities. Validates hex format and E/I distinctness. Throws on
 *  invalid input. Overwriting an existing name is allowed (for hot-reload). */
export function registerPalette(
  name: PaletteName,
  palette: ReadonlySemanticPalette,
  metadata: ReadonlyPaletteMetadata,
): void {
  if (typeof name !== 'string') {
    throw new TypeError('palette name must be a string');
  }
  const normalizedName = name.trim();
  if (normalizedName.length === 0 || normalizedName.length > 60) {
    throw new Error('palette name must contain 1–60 non-whitespace characters');
  }
  const storedPalette = Object.freeze(snapshotPalette(palette));
  const storedMetadata = Object.freeze(snapshotPaletteMetadata(metadata));
  _paletteRegistry.set(normalizedName, Object.freeze({
    palette: storedPalette,
    metadata: storedMetadata,
  }));
}

/** Select a semantic palette by name. Falls back to the default ('crameri')
 *  if the name is not registered. In dev mode, warns on non-default fallback
 *  so missing registrations surface during development instead of silently
 *  producing the wrong colors. */
export function getPalette(name: PaletteName = 'crameri'): ReadonlySemanticPalette {
  const entry = _paletteRegistry.get(name);
  if (entry) return entry.palette;
  const isProduction =
    typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  if (name && name !== 'crameri' && !isProduction) {
    // Dev-mode warning — silent in production (crameri is a valid fallback).
    try {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          `[cortexel] getPalette('${name}'): not registered, falling back to 'crameri'. ` +
            `Call registerPalette('${name}', ...) at app startup. ` +
            `Available: ${listPalettes().map((p) => p.name).join(', ')}`,
        );
      }
    } catch { /* console may be unavailable in some environments */ }
  }
  return CORTEXEL_PALETTE;
}

/** Get full palette entry (colors + metadata) by name. Returns undefined if
 *  not registered. */
export function getPaletteEntry(name: PaletteName): PaletteEntry | undefined {
  return _paletteRegistry.get(name);
}

/** List all registered palette names with their metadata. Agents use this for
 *  discoverability; the manifest serializes it for non-TS hosts. */
export function listPalettes(): {
  readonly name: PaletteName;
  readonly metadata: ReadonlyPaletteMetadata;
}[] {
  return [..._paletteRegistry.entries()].map(([name, entry]) => ({
    name,
    metadata: entry.metadata,
  }));
}

/** Check whether a palette name is registered. */
export function isRegisteredPalette(name: string): boolean {
  return _paletteRegistry.has(name);
}

// Cortical layers L1–L6 — sampled along batlow so layer order maps to a
// monotone perceptual ramp (deep → superficial reads as a gradient, not a
// random set of hues), while staying distinct.
export const CORTICAL_LAYER_COLORS: Record<string, string> = {
  L1: colormapHex('batlow', 0.05),
  'L2/3': colormapHex('batlow', 0.28),
  L4: colormapHex('batlow', 0.48),
  L5: colormapHex('batlow', 0.68),
  L6: colormapHex('batlow', 0.90),
};

/** Categorical neuron/population colors — batlowS (Crameri's categorical set).
 *  Distinct, CVD-friendly hues sampled from the batlow colour map at
 *  perceptually-spaced intervals. Replaces the hand-picked Tailwind set. */
export const CATEGORICAL: readonly string[] = [
  '#011959', '#faccfa', '#828231', '#226061', '#f19d6b',
  '#4d734d', '#114360', '#fdb4b4', '#c09036', '#175262',
];

export function categorical(i: number): string {
  if (!Number.isFinite(i)) throw new RangeError('categorical index must be finite');
  const index = Math.trunc(i);
  return CATEGORICAL[
    ((index % CATEGORICAL.length) + CATEGORICAL.length) % CATEGORICAL.length
  ];
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
// bloom-safe echoes of the neuron convention (E blue / I red from vik) pulled
// down in saturation + value. Apply at opacity ~0.4–0.5 at the call site (per
// renderer). CB-safe: cool-blue E vs warm-red I stay separable under
// deuteranopia/protanopia and never collide with the gold spike flash. Use
// `.excitatory` UNIFORMLY where a graph carries no honest E/I metadata — do
// not invent inhibition. Derived from vik(0.15)/vik(0.85), desaturated.
export const SYNAPSE_COLORS = {
  dark: {
    excitatory: '#1a3d5a',   // muted vik-blue
    inhibitory: '#5a3d1a',   // muted vik-red
  },
  light: {
    excitatory: '#4a7d9a',   // lifted vik-blue for light canvas
    inhibitory: '#9a7d4a',   // lifted vik-red for light canvas
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
// exact polynomial above; viridis is the CC0 Shadertoy WlfXRN analytic fit,
// preserved by Google Research ZapBench, accurate to within a few LSBs. batlow and vik use a
// 13/11-stop LUT interpolated in sRGB — accurate enough for shader use at the
// resolutions we render. Inject with string concatenation into a ShaderMaterial.

export const TURBO_GLSL = /* glsl */ `
vec3 turbo(float x) {
  x = clamp(x, 0.0, 1.0);
  vec4 v4 = vec4(1.0, x, x * x, x * x * x);
  vec2 v2 = v4.zw * v4.z;
  return clamp(vec3(
    dot(v4, vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234)) + dot(v2, vec2(-152.94239396, 59.28637943)),
    dot(v4, vec4(0.09140261, 2.19418839,   4.84296658, -14.18503333)) + dot(v2, vec2(  4.27729857,  2.82956604)),
    dot(v4, vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771)) + dot(v2, vec2(-89.90310912, 27.34824973))
  ), 0.0, 1.0);
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

// batlow — Crameri scientific rainbow (default sequential). 13-stop LUT.
// Perceptually uniform, CVD-friendly, readable in B&W. #UseBatlow
export const BATLOW_GLSL = /* glsl */ `
vec3 batlow(float t) {
  t = clamp(t, 0.0, 1.0);
  const vec3 stops[13] = vec3[13](
    vec3(0.004,0.098,0.350), vec3(0.051,0.176,0.361), vec3(0.102,0.259,0.376),
    vec3(0.153,0.353,0.376), vec3(0.227,0.420,0.329), vec3(0.322,0.455,0.290),
    vec3(0.420,0.482,0.243), vec3(0.541,0.525,0.200), vec3(0.631,0.541,0.169),
    vec3(0.753,0.565,0.212), vec3(0.847,0.578,0.282), vec3(0.929,0.605,0.385),
    vec3(0.981,0.800,0.981)
  );
  float x = t * 12.0;
  int i = int(floor(x));
  float f = x - float(i);
  if (i >= 12) return stops[12];
  return mix(stops[i], stops[i + 1], f);
}
`;

// vik — Crameri diverging blue↔red. 11-stop LUT. For signed fields (E/I, LTP/LTD).
export const VIK_GLSL = /* glsl */ `
vec3 vik(float t) {
  t = clamp(t, 0.0, 1.0);
  const vec3 stops[11] = vec3[11](
    vec3(0.001,0.070,0.380), vec3(0.009,0.193,0.458), vec3(0.075,0.398,0.591),
    vec3(0.236,0.522,0.674), vec3(0.483,0.713,0.784), vec3(0.858,0.897,0.915),
    vec3(0.859,0.647,0.518), vec3(0.728,0.368,0.166), vec3(0.596,0.199,0.028),
    vec3(0.436,0.068,0.026), vec3(0.350,0.000,0.030)
  );
  float x = t * 10.0;
  int i = int(floor(x));
  float f = x - float(i);
  if (i >= 10) return stops[10];
  return mix(stops[i], stops[i + 1], f);
}
`;
