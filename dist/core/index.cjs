'use strict';

var zod = require('zod');

// core/colormaps.ts
var STOPS = {
  batlow: [
    "#011959",
    "#0d2d5c",
    "#1a4260",
    "#275a60",
    "#3a6b54",
    "#52744a",
    "#6b7b3e",
    "#8a8633",
    "#a18a2b",
    "#c09036",
    "#d89448",
    "#ed9a62",
    "#faccfa"
  ],
  vik: [
    "#001261",
    "#023175",
    "#136697",
    "#3c85ac",
    "#7ba9c8",
    "#dbe5e9",
    "#dba584",
    "#ba5e2a",
    "#983307",
    "#6f1107",
    "#590008"
  ],
  viridis: [
    "#440154",
    "#472d7b",
    "#3b528b",
    "#2c728e",
    "#21918c",
    "#28ae80",
    "#5ec962",
    "#addc30",
    "#fde725"
  ],
  magma: [
    "#000004",
    "#180f3e",
    "#451077",
    "#721f81",
    "#9f2f7f",
    "#cd4071",
    "#f1605d",
    "#fd9567",
    "#feca8d",
    "#fcfdbf"
  ],
  inferno: [
    "#000004",
    "#1b0c41",
    "#4a0c6b",
    "#781c6d",
    "#a52c60",
    "#cf4446",
    "#ed6925",
    "#fb9a06",
    "#f7d13d",
    "#fcffa4"
  ],
  plasma: [
    "#0d0887",
    "#41049d",
    "#6a00a8",
    "#8f0da4",
    "#b12a90",
    "#cc4778",
    "#e16462",
    "#f2844b",
    "#fca636",
    "#fcce25",
    "#f0f921"
  ],
  cividis: [
    "#00224e",
    "#123570",
    "#3b496c",
    "#575d6d",
    "#707173",
    "#8a8779",
    "#a59c74",
    "#c3b369",
    "#e1cc55",
    "#fee838"
  ]
};
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [v >> 16 & 255, v >> 8 & 255, v & 255];
}
var STOP_RGB = {
  batlow: STOPS.batlow.map(hexToRgb),
  vik: STOPS.vik.map(hexToRgb),
  viridis: STOPS.viridis.map(hexToRgb),
  magma: STOPS.magma.map(hexToRgb),
  inferno: STOPS.inferno.map(hexToRgb),
  plasma: STOPS.plasma.map(hexToRgb),
  cividis: STOPS.cividis.map(hexToRgb)
};
function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function sampleStops(stops, t) {
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= stops.length - 1) return stops[stops.length - 1];
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f)
  ];
}
function turbo(t) {
  const x = clamp01(t);
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x3 * x;
  const x5 = x4 * x;
  const r = 0.13572138 + 4.6153926 * x - 42.66032258 * x2 + 132.13108234 * x3 - 152.94239396 * x4 + 59.28637943 * x5;
  const g = 0.09140261 + 2.19418839 * x + 4.84296658 * x2 - 14.18503333 * x3 + 4.27729857 * x4 + 2.82956604 * x5;
  const b = 0.1066733 + 12.64194608 * x - 60.58204836 * x2 + 110.36276771 * x3 - 89.90310912 * x4 + 27.34824973 * x5;
  return [
    Math.round(clamp01(r) * 255),
    Math.round(clamp01(g) * 255),
    Math.round(clamp01(b) * 255)
  ];
}
function sampleColormap(name, t) {
  if (name === "turbo") return turbo(t);
  return sampleStops(STOP_RGB[name], t);
}
function colormapHex(name, t) {
  const [r, g, b] = sampleColormap(name, t);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
function colormapRgba(name, t, alpha = 1) {
  const [r, g, b] = sampleColormap(name, t);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function colormapGradient(name, angle = 90, stops = 12) {
  const parts = [];
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1);
    parts.push(`${colormapHex(name, t)} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(${angle}deg, ${parts.join(", ")})`;
}
function colormapSvgStops(name, stops = 8) {
  let out = "";
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1);
    out += `<stop offset="${(t * 100).toFixed(1)}%" stop-color="${colormapHex(name, t)}"/>`;
  }
  return out;
}
var _paletteRegistry = /* @__PURE__ */ new Map();
var CORTEXEL_PALETTE = {
  // Canvas / surfaces — the deep navy lets colors pop
  voidNavy: "#030711",
  deepNavy: "#050816",
  panel: "#0b1220",
  grid: "#1e293b",
  // Brand signal — sampled from batlow's distinctive mid-range
  cyan: "#275a60",
  // batlow(0.25) — muted teal, not Tailwind cyan
  teal: "#3a6b54",
  // batlow(0.30) — green-teal
  violet: "#faccfa",
  // batlow(1.0)  — pale magenta, the batlow endpoint
  amber: "#c09036",
  // batlow(0.55) — warm gold
  orange: "#d89448",
  // batlow(0.70) — warm amber
  pink: "#ed9a62",
  // batlow(0.80) — warm coral
  // Membrane / spikes — from batlow sequential
  membrane: "#52744a",
  // batlow(0.35) — muted biological green
  spike: "#dd954d",
  // batlow(0.78) — warm gold event marker
  spikeHot: "#ef9b67",
  // batlow(0.92) — lighter warm for spike bursts
  // Excitatory vs inhibitory — from vik diverging (Allen/MICrONS convention:
  // cool blues for E, warm reds for I)
  excitatory: "#136697",
  // vik(0.15) — cool blue
  inhibitory: "#983307",
  // vik(0.85) — warm red-brown
  // Plasticity — from vik (LTP = cool potentiation, LTD = warm depression)
  ltp: "#023175",
  // vik(0.08) — deep blue
  ltd: "#6f1107",
  // vik(0.92) — deep red
  // Text — WCAG AA on the deep-navy canvas
  ink: "#e2e8f0",
  inkDim: "#94a3b8",
  inkFaint: "#64748b"
};
var HEX_RE = /^#[0-9a-fA-F]{6}$/;
function validatePalette(p) {
  for (const [key, val] of Object.entries(p)) {
    if (!HEX_RE.test(val)) {
      throw new Error(`Palette color '${key}' is not a valid #rrggbb hex: '${val}'`);
    }
  }
  if (p.excitatory.toLowerCase() === p.inhibitory.toLowerCase()) {
    throw new Error("Palette excitatory and inhibitory colors must differ");
  }
  if (p.ltp.toLowerCase() === p.ltd.toLowerCase()) {
    throw new Error("Palette ltp and ltd colors must differ");
  }
}
_paletteRegistry.set("crameri", {
  palette: CORTEXEL_PALETTE,
  metadata: {
    label: "Crameri",
    source: "Crameri 2018, Nature Comms 2020 (batlow + vik)",
    diverging: true
  }
});
function registerPalette(name, palette, metadata) {
  validatePalette(palette);
  _paletteRegistry.set(name, { palette, metadata });
}
function getPalette(name = "crameri") {
  const entry = _paletteRegistry.get(name);
  if (entry) return entry.palette;
  if (name && name !== "crameri") {
    try {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[cortexel] getPalette('${name}'): not registered, falling back to 'crameri'. Call registerPalette('${name}', ...) at app startup. Available: ${listPalettes().map((p) => p.name).join(", ")}`
        );
      }
    } catch {
    }
  }
  return CORTEXEL_PALETTE;
}
function getPaletteEntry(name) {
  return _paletteRegistry.get(name);
}
function listPalettes() {
  return [..._paletteRegistry.entries()].map(([name, entry]) => ({
    name,
    metadata: entry.metadata
  }));
}
function isRegisteredPalette(name) {
  return _paletteRegistry.has(name);
}
var CORTICAL_LAYER_COLORS = {
  L1: colormapHex("batlow", 0.05),
  "L2/3": colormapHex("batlow", 0.28),
  L4: colormapHex("batlow", 0.48),
  L5: colormapHex("batlow", 0.68),
  L6: colormapHex("batlow", 0.9)
};
var CATEGORICAL = [
  "#011959",
  "#faccfa",
  "#828231",
  "#226061",
  "#f19d6b",
  "#4d734d",
  "#114360",
  "#fdb4b4",
  "#c09036",
  "#175262"
];
function categorical(i) {
  return CATEGORICAL[(i % CATEGORICAL.length + CATEGORICAL.length) % CATEGORICAL.length];
}
var OKABE_ITO = {
  black: "#000000",
  orange: "#e69f00",
  skyBlue: "#56b4e9",
  green: "#009e73",
  yellow: "#f0e442",
  blue: "#0072b2",
  vermilion: "#d55e00",
  reddishPurple: "#cc79a7"
};
var SYNAPSE_COLORS = {
  dark: {
    excitatory: "#1a3d5a",
    // muted vik-blue
    inhibitory: "#5a3d1a"
    // muted vik-red
  },
  light: {
    excitatory: "#4a7d9a",
    // lifted vik-blue for light canvas
    inhibitory: "#9a7d4a"
    // lifted vik-red for light canvas
  }
};
var AXIS_COLORS = {
  lightAxisLabel: "#1f2937",
  // slate-800 — AA on light canvas
  lightAxisLine: "#475569",
  // slate-600
  lightGridLine: "#cbd5e1",
  // slate-300 (use with low opacity)
  darkAxisLabel: "#cbd5e1",
  // slate-300 — AA on deep-navy canvas
  darkAxisLine: "#64748b",
  // slate-500
  darkGridLine: "#334155"
  // slate-700 (use with low opacity)
};
var TURBO_GLSL = (
  /* glsl */
  `
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
`
);
var VIRIDIS_GLSL = (
  /* glsl */
  `
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
`
);
var BATLOW_GLSL = (
  /* glsl */
  `
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
`
);
var VIK_GLSL = (
  /* glsl */
  `
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
`
);

// core/designLaws.ts
var SCENE_NAMES = [
  "live-activity",
  "cortical-column",
  "stdp",
  "spike-raster",
  "network-topology",
  "voltage-trace",
  "phase-plane",
  "brunel-network",
  "fi-curve",
  "isi-distribution",
  "psth",
  "weight-histogram"
];
var SCENE_FRAMING = {
  "live-activity": { position: [0, 0, 9.4], target: [0, 0, 0], rotatable: false },
  "cortical-column": { position: [3.4, 0.4, 10.6], target: [0.4, 0, 0], rotatable: true },
  "stdp": { position: [0, 0.2, 6.8], target: [0, 0, 0], rotatable: true },
  "network-topology": { position: [4.6, 2, 9.2], target: [0, 0, 0], rotatable: true },
  "brunel-network": { position: [0, 1.1, 9.4], target: [0, 0.2, 0], rotatable: true },
  "spike-raster": { position: [0, 0, 8], target: [0, 0, 0], rotatable: false },
  "voltage-trace": { position: [0, 0, 8.2], target: [0, 0, 0], rotatable: false },
  "phase-plane": { position: [0, 0, 7.8], target: [0, 0, 0], rotatable: false },
  "fi-curve": { position: [0, 0.7, 6.4], target: [0, 0.7, 0], rotatable: false },
  "isi-distribution": { position: [0, 0.6, 7.4], target: [0, 0.6, 0], rotatable: false },
  "psth": { position: [0, 0.6, 7.4], target: [0, 0.6, 0], rotatable: false },
  "weight-histogram": { position: [0, 0.6, 7.4], target: [0, 0.6, 0], rotatable: false }
};
var CAMERA_PRESETS = {
  default: { name: "default", position: [0, 0, 8], target: [0, 0, 0], fov: 50 },
  top: { name: "top", position: [0, 12, 0], target: [0, 0, 0], fov: 45 },
  side: { name: "side", position: [12, 0, 0], target: [0, 0, 0], fov: 45 },
  close: { name: "close", position: [0, 2, 4], target: [0, 0, 0], fov: 35 },
  cinematic: { name: "cinematic", position: [6, 4, 6], target: [0, 0, 0], fov: 40 }
};
var ProvenanceSchema = zod.z.object({
  source: zod.z.string().min(1).max(200),
  calibrated_posterior: zod.z.boolean().default(false),
  // fail-closed
  advisory_only: zod.z.boolean().default(false),
  is_paper_local_evidence: zod.z.boolean().default(false),
  caption: zod.z.string().max(500).optional(),
  /** Machine-checkable record of the inputs an agent declared. Keys are
   *  open here (lenient envelope) — validateSkillInvocation enforces the
   *  closed ProvenanceKey set a skill demands, so an unknown key surfaces as a
   *  clear missing_provenance error rather than zod's opaque invalid_key.
   *  Presence-checked only; value truthfulness is the host's responsibility. */
  declared_inputs: zod.z.record(zod.z.string(), zod.z.union([zod.z.string(), zod.z.number(), zod.z.literal(true)])).optional(),
  /** Explicit synthetic/illustrative discriminator — forces the schematic
   *  caption regardless of the other flags. */
  synthetic: zod.z.boolean().default(false)
}).superRefine((p, ctx) => {
  if (p.calibrated_posterior === true) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      path: ["calibrated_posterior"],
      message: "calibrated_posterior=true is not implemented and is rejected at the visualization boundary"
    });
  }
});
var VizSpecSchema = zod.z.object({
  scene: zod.z.enum(SCENE_NAMES),
  // Scene-specific data/options. NOTE (Phase 1): this is intentionally opaque —
  // it is NOT validated per-scene yet, so an empty or malformed `params` passes
  // validation and any error surfaces only at render time. Per-scene typed
  // schemas are planned; until then, consult each scene's documented params.
  params: zod.z.record(zod.z.string(), zod.z.unknown()).default({}),
  mode: zod.z.enum(["interactive", "export"]).default("interactive"),
  themeMode: zod.z.enum(["dark", "light"]).default("dark"),
  camera: zod.z.enum(["default", "top", "side", "close", "cinematic"]).optional(),
  /** Optional palette hint — an agent can request a named semantic palette
   *  (e.g. 'crameri', 'okabe-ito'). The name must be registered (via
   *  registerPalette) at validation time, or the skill gate rejects it with
   *  'unknown_palette'. When absent, the host's active palette is used. */
  palette: zod.z.string().min(1).max(60).optional(),
  provenance: ProvenanceSchema
});
function validateVizSpec(input) {
  const result = VizSpecSchema.safeParse(input);
  if (result.success) return { ok: true, spec: result.data };
  return {
    ok: false,
    errors: result.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
    )
  };
}

// core/provenance.ts
var CONSERVATIVE_PROVENANCE = Object.freeze({
  calibrated_posterior: false,
  advisory_only: false,
  is_paper_local_evidence: false
});
function requiresHonestyCaption(p) {
  return !!p.synthetic || !p.calibrated_posterior || p.advisory_only || !p.is_paper_local_evidence;
}
function defaultHonestyCaption(p) {
  if (p.caption) return p.caption;
  if (p.synthetic || p.source === "synthetic_test" || p.source.startsWith("synthetic")) {
    return "Schematic \u2014 illustrative synthetic data, not measured.";
  }
  if (!p.is_paper_local_evidence) {
    return "Advisory \u2014 not paper-local evidence; candidate ranking only.";
  }
  return "Illustrative \u2014 not a calibrated posterior.";
}

// core/skills/skillIds.ts
var NEST_SKILL_IDS = [
  "nest.voltage_trace",
  "nest.spike_raster",
  "nest.rate_response",
  "nest.connectivity_matrix",
  "nest.spatial_2d",
  "nest.spatial_3d",
  "nest.plasticity_dynamics",
  "nest.phase_plane",
  "nest.correlogram",
  "nest.stimulus_response",
  "nest.astrocyte_dynamics",
  "nest.compartmental_dynamics",
  "nest.animation_replay"
];
var VIZ_ROUTER_ID = "nest.viz_router";
var NEST_DEVICE_FAMILIES = [
  "multimeter",
  "spike_recorder",
  "get_connections",
  "get_position",
  "weight_recorder",
  "computed"
  // no NEST device — numerically derived (phase plane, replay frames)
];
function isNestSkillId(value) {
  return typeof value === "string" && NEST_SKILL_IDS.includes(value);
}
var VALID_RENDERER_ROUTES = [
  "media.trace_figure",
  "media.model_graph",
  "media.webgl_scene",
  "media.react_fiber_scene",
  "media.manim_storyboard",
  "media.*",
  "matplotlib",
  "d3",
  "three",
  "fiber",
  "manim"
];
var PROVENANCE_KEYS = [
  "device_id",
  "recorded_variable",
  "units",
  "sampling_interval",
  "recorder_id",
  "sender_ids",
  "population_labels",
  "time_units",
  "source_ids",
  "target_ids",
  "synapse_model",
  "weight_units",
  "extent",
  "mask",
  "kernel",
  "projection_sample_policy",
  "morphology_disclaimer",
  "frame_rate",
  "state_variables",
  "bin_ms",
  "pair_labels",
  "stim_units",
  "rate_normalization"
];
var ProvenanceKeyEnum = zod.z.enum(PROVENANCE_KEYS);
var PROVENANCE_KEY_LABELS = {
  device_id: "device id",
  recorded_variable: "recorded variable",
  units: "units",
  sampling_interval: "sampling interval",
  recorder_id: "spike_recorder id",
  sender_ids: "sender ids",
  population_labels: "population labels",
  time_units: "time units",
  source_ids: "source ids",
  target_ids: "target ids",
  synapse_model: "synapse model",
  weight_units: "weight units",
  extent: "extent",
  mask: "mask",
  kernel: "kernel",
  projection_sample_policy: "projection sample policy",
  morphology_disclaimer: "morphology geometry disclaimer",
  frame_rate: "frame rate",
  state_variables: "state variables",
  bin_ms: "bin width",
  pair_labels: "pair labels",
  stim_units: "stimulus units",
  rate_normalization: "rate normalization"
};
function isProvenanceKey(value) {
  return typeof value === "string" && PROVENANCE_KEYS.includes(value);
}
var numArray = zod.z.array(zod.z.number());
var VoltageTraceParamsSchema = zod.z.object({
  times_ms: numArray.min(1),
  series: zod.z.array(zod.z.array(zod.z.number())).min(1),
  units: zod.z.string().min(1)
}).passthrough();
var SpikeRasterParamsSchema = zod.z.object({
  times_ms: numArray.min(1),
  senders: numArray.min(1)
}).passthrough();
var RateResponseParamsSchema = zod.z.object({
  stimulus_amplitudes: numArray.min(1),
  rates_hz: numArray.min(1),
  units: zod.z.string().min(1)
}).passthrough();
var NetworkParamsSchema = zod.z.object({
  sources: numArray.min(1),
  targets: numArray.min(1),
  weights: numArray.optional()
}).passthrough();
var Spatial3DParamsSchema = zod.z.object({
  objects: zod.z.array(zod.z.unknown()).min(1)
}).passthrough();
var PlasticityParamsSchema = zod.z.object({
  times_ms: numArray.min(1),
  weights: numArray.min(1),
  weight_units: zod.z.string().min(1)
}).passthrough();
var PhasePlaneParamsSchema = zod.z.object({
  grid: zod.z.record(zod.z.string(), zod.z.unknown())
}).passthrough();
var AstrocyteParamsSchema = zod.z.object({
  ca_trace: numArray.min(1),
  units: zod.z.string().min(1)
}).passthrough();

// core/skills/examples.ts
var synthetic = (declared_inputs) => ({
  source: "synthetic_test",
  calibrated_posterior: false,
  advisory_only: false,
  is_paper_local_evidence: false,
  synthetic: true,
  declared_inputs
});
var SKILL_EXAMPLE_PAYLOADS = {
  "nest.voltage_trace": {
    scene: "voltage-trace",
    params: { times_ms: [0, 1, 2], series: [[-65, -64, -63]], units: "mV" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      device_id: "mm_1",
      recorded_variable: "V_m",
      units: "mV",
      sampling_interval: 0.1
    })
  },
  "nest.spike_raster": {
    scene: "spike-raster",
    params: { times_ms: [1, 2, 3], senders: [1, 2, 1] },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1,2]",
      population_labels: "E",
      time_units: "ms"
    })
  },
  "nest.rate_response": {
    scene: "fi-curve",
    params: { stimulus_amplitudes: [0, 100, 200], rates_hz: [0, 12, 31], units: "Hz" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ stim_units: "pA", bin_ms: 100, rate_normalization: "spikes/s" })
  },
  "nest.connectivity_matrix": {
    scene: "network-topology",
    params: { sources: [1, 2], targets: [2, 3], weights: [1, 0.5] },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[2,3]",
      synapse_model: "static_synapse",
      weight_units: "pA"
    })
  },
  "nest.spatial_3d": {
    scene: "network-topology",
    params: { objects: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ extent: "[1,1,1]", projection_sample_policy: "all" })
  },
  "nest.plasticity_dynamics": {
    scene: "stdp",
    params: { times_ms: [0, 10, 20], weights: [1, 1.1, 1.05], weight_units: "nS" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ synapse_model: "stdp_synapse", weight_units: "nS" })
  },
  "nest.phase_plane": {
    scene: "phase-plane",
    params: { grid: { v: [-70, -50], w: [0, 1] } },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ state_variables: "V,w" })
  },
  "nest.astrocyte_dynamics": {
    scene: "voltage-trace",
    params: { ca_trace: [0.1, 0.2, 0.15], units: "uM" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ recorded_variable: "Ca", units: "uM" })
  }
};
function getExamplePayload(id) {
  return SKILL_EXAMPLE_PAYLOADS[id];
}

// core/skills/registry.ts
var CORTEXEL_SKILL_VERSION = "1.0.0";
var NEST_SKILL_REGISTRY = {
  "nest.voltage_trace": {
    id: "nest.voltage_trace",
    version: "1.0.0",
    title: "NEST voltage trace renderer",
    description: "Render multimeter/voltmeter analog traces (V_m, currents, conductances).",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    requiredInputKeys: ["times_ms", "series", "units"],
    paramsSchema: VoltageTraceParamsSchema,
    requiredProvenanceKeys: [
      "device_id",
      "recorded_variable",
      "units",
      "sampling_interval"
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "One neuron example / multimeter recording",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/one_neuron.html",
        dataShape: "times_ms + V_m/current/conductance series split by sender",
        output: "Selectable trace, spike markers, JSON + SVG export",
        note: "Mirrors NEST voltage_trace while keeping data provenance inspectable."
      }
    ]
  },
  "nest.spike_raster": {
    id: "nest.spike_raster",
    version: "1.0.0",
    title: "NEST spike raster renderer",
    description: "Render spike_recorder events as rasters, spike trains and population plots.",
    deviceFamily: "spike_recorder",
    scene: "spike-raster",
    requiredInputKeys: ["times_ms", "senders"],
    paramsSchema: SpikeRasterParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units"
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Random balanced Brunel network",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html",
        dataShape: "spike_recorder events: times_ms, senders, population labels",
        output: "Sender-time raster, population rate strip, selectable windows",
        note: "Use exact spike times first; aggregate only when too dense to read."
      }
    ]
  },
  "nest.rate_response": {
    id: "nest.rate_response",
    version: "1.0.0",
    title: "NEST rate / IF response renderer",
    description: "Render firing-rate / IF curves and population rates derived from spike counts.",
    deviceFamily: "spike_recorder",
    scene: "fi-curve",
    requiredInputKeys: ["stimulus_amplitudes", "rates_hz", "units"],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "bin_ms", "rate_normalization"],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "IF curve example",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/if_curve.html",
        dataShape: "stimulus amplitudes, rates_hz, spike counts",
        output: "IF curve, population-rate trace, decision crossing markers",
        note: "Always show bin width / counting window so rates stay auditable."
      }
    ]
  },
  "nest.connectivity_matrix": {
    id: "nest.connectivity_matrix",
    version: "1.0.0",
    title: "NEST connectivity matrix renderer",
    description: "Render SynapseCollection connectivity, weights and population blocks.",
    deviceFamily: "get_connections",
    scene: "network-topology",
    requiredInputKeys: ["sources", "targets"],
    paramsSchema: NetworkParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "weight_units"
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Plot weight matrices example / SynapseCollection",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html",
        dataShape: "sources, targets, weights, delays, source/target populations",
        output: "Topology node-edge view, selected block stats, weight histogram",
        note: "Keep absent connections distinct from zero-weight connections."
      }
    ]
  },
  "nest.spatial_2d": {
    id: "nest.spatial_2d",
    version: "1.0.0",
    title: "NEST 2D spatial renderer",
    description: "Render 2D layer positions, masks, kernels and sampled projections.",
    deviceFamily: "get_position",
    scene: null,
    // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    requiredInputKeys: ["positions"],
    requiredProvenanceKeys: ["extent", "mask", "kernel"],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Circular mask, Gaussian kernel, grid/free spatial examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/connex.html",
        dataShape: "node x/y positions, masks, kernels, sampled edges",
        output: "No Cortexel scene yet \u2014 route to a 2D d3 map on the host.",
        note: "scene:null \u2014 render via host d3, not a Cortexel 3D scene."
      }
    ]
  },
  "nest.spatial_3d": {
    id: "nest.spatial_3d",
    version: "1.0.0",
    title: "NEST 3D spatial renderer",
    description: "Render 3D population/node positions for spatial inspection.",
    deviceFamily: "get_position",
    scene: "network-topology",
    requiredInputKeys: ["objects"],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ["extent", "projection_sample_policy"],
    rendererRoutes: [
      "media.webgl_scene",
      "media.react_fiber_scene",
      "three",
      "fiber"
    ],
    examples: [
      {
        nestExample: "3D spatial network with exponential/Gaussian probabilities",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/test_3d.html",
        dataShape: "node x/y/z positions, extent, sampled edges",
        output: "Selectable 3D scene plus SVG projection fallback",
        note: "Use 3D as inspection aid; do not imply biological geometry."
      }
    ]
  },
  "nest.plasticity_dynamics": {
    id: "nest.plasticity_dynamics",
    version: "1.0.0",
    title: "NEST plasticity dynamics renderer",
    description: "Render STDP windows, weight adaptation and short-term dynamics.",
    deviceFamily: "weight_recorder",
    scene: "stdp",
    requiredInputKeys: ["times_ms", "weights", "weight_units"],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ["synapse_model", "weight_units"],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Urbanczik-Senn / Clopath / Tsodyks short-term plasticity",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/urbanczik_synapse_example.html",
        dataShape: "weights, u/x resources, pre/post spikes, delta_t, delta_weight",
        output: "Weight trace, STDP window, spike protocol rugs",
        note: "Preserve pre/post sign convention; label all plasticity parameters."
      }
    ]
  },
  "nest.phase_plane": {
    id: "nest.phase_plane",
    version: "1.0.0",
    title: "NEST phase-plane renderer",
    description: "Render phase planes, vector fields, nullclines and trajectories.",
    deviceFamily: "computed",
    scene: "phase-plane",
    requiredInputKeys: ["grid"],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: ["state_variables"],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Numerical phase-plane analysis of the Hodgkin-Huxley neuron",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/hh_phaseplane.html",
        dataShape: "state variable grid, derivatives, nullcline points, trajectory",
        output: "Vector field, nullclines, trajectory, equilibrium annotations",
        note: "Distinguish clamped state variables from simulated dynamic ones."
      }
    ]
  },
  "nest.correlogram": {
    id: "nest.correlogram",
    version: "1.0.0",
    title: "NEST correlogram / synchrony renderer",
    description: "Render auto/cross-correlation functions for spike trains.",
    deviceFamily: "spike_recorder",
    scene: null,
    // ISI-histogram scene exists but the math differs — no honest reuse
    requiredInputKeys: ["lags_ms", "correlation"],
    requiredProvenanceKeys: ["bin_ms", "pair_labels"],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Auto- and crosscorrelation functions for spike trains",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/cross_check_mip_corrdet.html",
        dataShape: "lags_ms, correlation values, pair labels, bin width",
        output: "No Cortexel scene (distinct from ISI) \u2014 route to host d3.",
        note: "scene:null \u2014 correlogram math differs from the ISI histogram scene."
      }
    ]
  },
  "nest.stimulus_response": {
    id: "nest.stimulus_response",
    version: "1.0.0",
    title: "NEST stimulus-response protocol renderer",
    description: "Render aligned stimulus waveforms, responses, spikes and protocol epochs.",
    deviceFamily: "multimeter",
    scene: null,
    // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ["stimulus", "response"],
    requiredProvenanceKeys: ["stim_units", "units"],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Sinusoidal generator / pulse packet / repeated stimulation",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/pulsepacket.html",
        dataShape: "stimulus waveform, analog response, spike events, epochs",
        output: "Composite protocol panels \u2014 host-composed, no single scene.",
        note: "scene:null \u2014 multi-panel protocol composed by the host."
      }
    ]
  },
  "nest.astrocyte_dynamics": {
    id: "nest.astrocyte_dynamics",
    version: "1.0.0",
    title: "NEST astrocyte Ca\xB2\u207A/IP\u2083 dynamics renderer",
    description: "Render tripartite-synapse calcium/IP3 state-variable traces.",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    weak: true,
    // analog-trace reuse: Ca/IP3 are not membrane voltage
    requiredInputKeys: ["ca_trace", "units"],
    paramsSchema: AstrocyteParamsSchema,
    requiredProvenanceKeys: ["recorded_variable", "units"],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Single astrocyte / tripartite interaction examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/astrocytes/astrocyte_single.html",
        dataShape: "Ca/IP3/state variables, linked neuron events",
        output: "Calcium/IP3 traces via the analog-trace scene (flagged derived)",
        note: "weak:true \u2014 keep glial and neuronal units explicitly separate."
      }
    ]
  },
  "nest.compartmental_dynamics": {
    id: "nest.compartmental_dynamics",
    version: "1.0.0",
    title: "NEST compartmental morphology + dynamics renderer",
    description: "Render multi-compartment morphologies, receptor ports and soma/dendrite traces.",
    deviceFamily: "multimeter",
    scene: null,
    // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ["compartments"],
    requiredProvenanceKeys: ["morphology_disclaimer", "recorded_variable"],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Receptors/current and two-compartment neuron examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/compartmental_model/receptors_and_current.html",
        dataShape: "compartments, receptor ports, soma/dendrite traces",
        output: "No Cortexel scene \u2014 host d3 morphology tree with linked traces.",
        note: "scene:null \u2014 do not invent morphology geometry from labels."
      }
    ]
  },
  "nest.animation_replay": {
    id: "nest.animation_replay",
    version: "1.0.0",
    title: "NEST state replay / animation storyboard renderer",
    description: "Render time-evolution storyboards and inspectable state replays.",
    deviceFamily: "computed",
    scene: null,
    // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ["frames"],
    requiredProvenanceKeys: ["frame_rate"],
    rendererRoutes: ["media.manim_storyboard", "manim"],
    examples: [
      {
        nestExample: "Sudoku progress GIF / Pong replay",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/sudoku/plot_progress.html",
        dataShape: "frames, entities, metrics, frame rate, annotations",
        output: "Manim storyboard / source \u2014 no live Cortexel scene.",
        note: "scene:null \u2014 offline storyboard, not a real-time render target."
      }
    ]
  }
};
function listSkills() {
  return Object.values(NEST_SKILL_REGISTRY);
}
function getSkill(id) {
  return NEST_SKILL_REGISTRY[id];
}
function describeSkill(id) {
  const c = getSkill(id);
  if (!c) return void 0;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    deviceFamily: c.deviceFamily,
    scene: c.scene,
    renderable: c.scene !== null,
    weak: c.weak ?? false,
    requiredInputKeys: [...c.requiredInputKeys],
    requiredProvenanceKeys: [...c.requiredProvenanceKeys],
    rendererRoutes: [...c.rendererRoutes],
    examplePayload: getExamplePayload(c.id),
    examples: c.examples.map((e) => ({ ...e }))
  };
}
function describeSkills() {
  return listSkills().map((c) => describeSkill(c.id)).filter((d) => d !== void 0);
}

// core/skills/router.ts
var SPIKE_KIND_TO_SKILL = {
  events: "nest.spike_raster",
  rates: "nest.rate_response",
  correlation: "nest.correlogram"
};
var FAMILY_MEMBERS = (() => {
  const out = {};
  for (const c of listSkills()) {
    (out[c.deviceFamily] ??= []).push(c.id);
  }
  return out;
})();
function resolve(skill) {
  const contract = NEST_SKILL_REGISTRY[skill];
  if (contract.scene === null) {
    return { ok: false, reason: "no_cortexel_scene", candidates: [skill] };
  }
  return { ok: true, skill, scene: contract.scene };
}
function routeToScene(input) {
  const members = FAMILY_MEMBERS[input.deviceFamily];
  if (!members || members.length === 0) {
    return { ok: false, reason: "unknown_family" };
  }
  if (input.skill && members.includes(input.skill)) {
    return resolve(input.skill);
  }
  if (members.length === 1) return resolve(members[0]);
  if (input.deviceFamily === "spike_recorder" && input.dataShape?.kind) {
    return resolve(SPIKE_KIND_TO_SKILL[input.dataShape.kind]);
  }
  const disambiguateBy = input.deviceFamily === "spike_recorder" ? { field: "dataShape.kind", maps: { ...SPIKE_KIND_TO_SKILL } } : {
    field: "skill",
    maps: Object.fromEntries(members.map((s) => [s, s]))
  };
  return { ok: false, reason: "ambiguous", candidates: members, disambiguateBy };
}

// core/skills/validateSkillInvocation.ts
function validateSkillInvocation(skillId, payload) {
  const errors = [];
  const contract = getSkill(skillId);
  if (!contract) {
    return {
      ok: false,
      errors: [
        {
          code: "unknown_skill",
          path: "skillId",
          message: `unknown skill '${skillId}'`,
          hint: "Use one of the registered nest.* skills.",
          validSkills: NEST_SKILL_IDS
        }
      ]
    };
  }
  const rawProv = payload?.provenance;
  if (rawProv?.calibrated_posterior === true) {
    return {
      ok: false,
      errors: [
        {
          code: "calibrated_posterior_unsupported",
          path: "provenance.calibrated_posterior",
          message: "calibrated_posterior=true is not implemented and is rejected at the visualization boundary",
          hint: "Validation/search is candidate ranking; leave calibrated_posterior=false."
        }
      ]
    };
  }
  const envelope = validateVizSpec(payload);
  if (!envelope.ok) {
    return {
      ok: false,
      errors: envelope.errors.map((message) => ({
        code: "invalid_envelope",
        path: "(spec)",
        message,
        validScenes: SCENE_NAMES
      }))
    };
  }
  const spec = envelope.spec;
  const prov = spec.provenance;
  const example = getExamplePayload(skillId);
  if (contract.scene === null) {
    errors.push({
      code: "no_cortexel_scene",
      path: "skillId",
      message: `skill '${skillId}' has no Cortexel scene (route to a host renderer)`,
      hint: `Renderer routes: ${contract.rendererRoutes.join(", ")}.`
    });
  } else if (spec.scene !== contract.scene) {
    errors.push({
      code: "scene_mismatch",
      path: "scene",
      message: `scene '${spec.scene}' does not match skill '${skillId}' scene '${contract.scene}'`,
      hint: `Set scene: '${contract.scene}'.`,
      validScenes: [contract.scene],
      example
    });
  }
  if (contract.paramsSchema) {
    const parsed = contract.paramsSchema.safeParse(spec.params);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          code: "invalid_params",
          path: `params.${issue.path.join(".") || "(root)"}`,
          message: issue.message,
          hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`,
          example
        });
      }
    }
  }
  const declared = prov.declared_inputs ?? {};
  for (const key of contract.requiredProvenanceKeys) {
    if (!(key in declared)) {
      errors.push({
        code: "missing_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `missing required provenance: ${key}`,
        hint: `Skill '${skillId}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(", ")}.`,
        example
      });
    }
  }
  if (spec.palette && !isRegisteredPalette(spec.palette)) {
    errors.push({
      code: "unknown_palette",
      path: "palette",
      message: `palette '${spec.palette}' is not registered`,
      hint: `Use one of: ${listPalettes().map((p) => p.name).join(", ")}.`,
      validPalettes: listPalettes().map((p) => p.name),
      example
    });
  }
  if (errors.length > 0) return { ok: false, errors };
  let caption = requiresHonestyCaption(prov) ? defaultHonestyCaption(prov) : null;
  if (contract.weak) {
    const weakMsg = `Derived view \u2014 ${skillId} reuses the '${contract.scene}' scene; not a 1:1 rendering.`;
    caption = caption ? `${weakMsg} ${caption}` : weakMsg;
  }
  return { ok: true, spec, scene: contract.scene, caption };
}

// core/skills/verify.ts
function len(a) {
  return a ? a.length : 0;
}
function detectEmptyScene(data) {
  const populated = [];
  if (len(data.spikeTimes) > 0) populated.push("spikeTimes");
  if (len(data.voltageTraces) > 0) populated.push("voltageTraces");
  if (len(data.weightSeries) > 0) populated.push("weightSeries");
  if (len(data.analogTraces?.values) > 0) populated.push("analogTraces");
  if (len(data.networkNodes) > 0) populated.push("networkNodes");
  if (len(data.vectorField) > 0) populated.push("vectorField");
  const empty = populated.length === 0;
  return {
    empty,
    populated,
    reason: empty ? "SceneData has no renderable content \u2014 all channels are empty; the render would be blank" : void 0
  };
}
var finiteNumberArray = zod.z.array(zod.z.number()).refine((a) => a.every((v) => Number.isFinite(v)), {
  message: "array contains non-finite values (NaN/Inf) \u2014 unusable evidence"
});
var nonEmptyFinite = finiteNumberArray.min(
  1,
  "empty array \u2014 no samples to render"
);
var finiteNum = zod.z.number().refine((v) => Number.isFinite(v), "non-finite value (NaN/Inf)");
var SpikeRecorderEventsSchema = zod.z.object({
  senders: finiteNumberArray,
  // becomes denseIndex Map keys — reject NaN/Inf
  times: finiteNumberArray
}).superRefine((v, ctx) => {
  if (v.senders.length !== v.times.length) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: `senders (${v.senders.length}) and times (${v.times.length}) length mismatch`
    });
  }
});
var MultimeterEventsSchema = zod.z.object({
  times: nonEmptyFinite,
  values: nonEmptyFinite
}).superRefine((v, ctx) => {
  if (v.times.length !== v.values.length) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: `times (${v.times.length}) and values (${v.values.length}) length mismatch`
    });
  }
  for (let i = 1; i < v.times.length; i++) {
    if (v.times[i] < v.times[i - 1]) {
      ctx.addIssue({
        code: zod.z.ZodIssueCode.custom,
        message: "multimeter times are non-monotonic \u2014 likely multiple senders flattened together; split per sender before adapting"
      });
      break;
    }
  }
});
var MultimeterMultiSenderSchema = zod.z.object({
  times: nonEmptyFinite,
  values: nonEmptyFinite,
  senders: finiteNumberArray.min(1, "no senders")
}).superRefine((v, ctx) => {
  const n = v.times.length;
  if (v.values.length !== n || v.senders.length !== n) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "times, values and senders must be the same length"
    });
  }
});
var GetConnectionsSchema = zod.z.object({
  sources: finiteNumberArray.min(1, "no connections"),
  targets: finiteNumberArray.min(1, "no connections"),
  weights: finiteNumberArray.optional(),
  delays: finiteNumberArray.optional()
}).superRefine((v, ctx) => {
  if (v.sources.length !== v.targets.length) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: `sources (${v.sources.length}) and targets (${v.targets.length}) length mismatch`
    });
  }
  if (v.weights && v.weights.length !== v.sources.length) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: "weights length does not match connection count"
    });
  }
});
var xyz = zod.z.tuple([finiteNum, finiteNum, finiteNum]);
var xy = zod.z.tuple([finiteNum, finiteNum]);
var GetPosition2DSchema = zod.z.object({
  positions: zod.z.array(xy).min(1, "no positions")
});
var GetPosition3DSchema = zod.z.object({
  positions: zod.z.array(xyz).min(1, "no positions"),
  edges: zod.z.array(zod.z.object({ source: zod.z.number(), target: zod.z.number() })).optional()
});
var WeightRecorderEventsSchema = zod.z.object({
  times: nonEmptyFinite,
  weights: nonEmptyFinite,
  senders: finiteNumberArray.optional(),
  targets: finiteNumberArray.optional()
}).superRefine((v, ctx) => {
  if (v.times.length !== v.weights.length) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: `times (${v.times.length}) and weights (${v.weights.length}) length mismatch`
    });
  }
});

// core/nest/adapters.ts
function zerr(error) {
  return {
    ok: false,
    errors: error.issues.map(
      (i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`
    )
  };
}
function denseIndex(senders) {
  const map = /* @__PURE__ */ new Map();
  const dense = new Float32Array(senders.length);
  let next = 0;
  for (let i = 0; i < senders.length; i++) {
    const s = senders[i];
    let idx = map.get(s);
    if (idx === void 0) {
      idx = next++;
      map.set(s, idx);
    }
    dense[i] = idx;
  }
  return { dense, map };
}
function spikeRecorderToSceneData(events) {
  const parsed = SpikeRecorderEventsSchema.safeParse(events);
  if (!parsed.success) return zerr(parsed.error);
  const { senders, times } = parsed.data;
  const { dense, map } = denseIndex(senders);
  return {
    ok: true,
    data: {
      spikeTimes: Float32Array.from(times),
      spikeSenders: dense
    },
    senderIndexMap: map
  };
}
function multimeterToSceneData(events, opts = {}) {
  const parsed = MultimeterEventsSchema.safeParse(events);
  if (!parsed.success) return zerr(parsed.error);
  const { times, values } = parsed.data;
  const traceTimes = Float32Array.from(times);
  const variable = opts.variable;
  const isVoltage = variable === void 0 || /^v_?m$/i.test(variable) || variable === "V_m";
  if (isVoltage) {
    return { ok: true, data: { traceTimes, voltageTraces: Float32Array.from(values) } };
  }
  return {
    ok: true,
    data: {
      traceTimes,
      analogTraces: {
        values: Float32Array.from(values),
        variable,
        units: opts.units ?? "unknown"
      }
    }
  };
}
function splitMultimeterBySender(events) {
  const parsed = MultimeterMultiSenderSchema.safeParse(events);
  if (!parsed.success) return zerr(parsed.error);
  const { times, values, senders } = parsed.data;
  const byId = /* @__PURE__ */ new Map();
  for (let i = 0; i < senders.length; i++) {
    let bucket = byId.get(senders[i]);
    if (!bucket) {
      bucket = { times: [], values: [] };
      byId.set(senders[i], bucket);
    }
    bucket.times.push(times[i]);
    bucket.values.push(values[i]);
  }
  const series = [];
  const errors = [];
  for (const [sender, b] of byId) {
    for (let i = 1; i < b.times.length; i++) {
      if (b.times[i] < b.times[i - 1]) {
        errors.push(`sender ${sender}: times are non-monotonic after split`);
        break;
      }
    }
    series.push({ sender, times: b.times, values: Float32Array.from(b.values) });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, series };
}
function getConnectionsToSceneData(conns) {
  const parsed = GetConnectionsSchema.safeParse(conns);
  if (!parsed.success) return zerr(parsed.error);
  const { sources, targets, weights } = parsed.data;
  const ids = /* @__PURE__ */ new Set();
  sources.forEach((s) => ids.add(s));
  targets.forEach((t) => ids.add(t));
  const networkNodes = Array.from(ids).map((id, i) => ({
    id,
    // Place on a ring so a topology scene has something honest to draw; the host
    // can override with real GetPosition data via getPositionToSceneData.
    x: Math.cos(2 * Math.PI * i / ids.size),
    y: Math.sin(2 * Math.PI * i / ids.size),
    z: 0,
    label: String(id)
  }));
  const networkEdges = sources.map((source, i) => ({
    source,
    target: targets[i],
    weight: weights ? weights[i] : 1
  }));
  return { ok: true, data: { networkNodes, networkEdges } };
}
function getPositionToSceneData(positions, opts = { dims: 3 }) {
  if (opts.dims === 2) {
    const parsed2 = GetPosition2DSchema.safeParse(positions);
    if (!parsed2.success) return zerr(parsed2.error);
    return {
      ok: true,
      data: {
        networkNodes: parsed2.data.positions.map(([x, y], i) => ({
          id: i,
          x,
          y,
          z: 0,
          label: String(i)
        }))
      }
    };
  }
  const parsed = GetPosition3DSchema.safeParse(positions);
  if (!parsed.success) return zerr(parsed.error);
  return {
    ok: true,
    data: {
      networkNodes: parsed.data.positions.map(([x, y, z5], i) => ({
        id: i,
        x,
        y,
        z: z5,
        label: String(i)
      })),
      networkEdges: parsed.data.edges?.map((e) => ({
        source: e.source,
        target: e.target,
        weight: 1
      }))
    }
  };
}
function weightRecorderToSceneData(events) {
  const parsed = WeightRecorderEventsSchema.safeParse(events);
  if (!parsed.success) return zerr(parsed.error);
  const { times, weights } = parsed.data;
  return {
    ok: true,
    data: {
      traceTimes: Float32Array.from(times),
      weightSeries: Float32Array.from(weights)
    }
  };
}

exports.AXIS_COLORS = AXIS_COLORS;
exports.AstrocyteParamsSchema = AstrocyteParamsSchema;
exports.BATLOW_GLSL = BATLOW_GLSL;
exports.CAMERA_PRESETS = CAMERA_PRESETS;
exports.CATEGORICAL = CATEGORICAL;
exports.CONSERVATIVE_PROVENANCE = CONSERVATIVE_PROVENANCE;
exports.CORTEXEL_PALETTE = CORTEXEL_PALETTE;
exports.CORTEXEL_SKILL_VERSION = CORTEXEL_SKILL_VERSION;
exports.CORTICAL_LAYER_COLORS = CORTICAL_LAYER_COLORS;
exports.GetConnectionsSchema = GetConnectionsSchema;
exports.GetPosition2DSchema = GetPosition2DSchema;
exports.GetPosition3DSchema = GetPosition3DSchema;
exports.MultimeterEventsSchema = MultimeterEventsSchema;
exports.MultimeterMultiSenderSchema = MultimeterMultiSenderSchema;
exports.NEST_DEVICE_FAMILIES = NEST_DEVICE_FAMILIES;
exports.NEST_SKILL_IDS = NEST_SKILL_IDS;
exports.NEST_SKILL_REGISTRY = NEST_SKILL_REGISTRY;
exports.NetworkParamsSchema = NetworkParamsSchema;
exports.OKABE_ITO = OKABE_ITO;
exports.PROVENANCE_KEYS = PROVENANCE_KEYS;
exports.PROVENANCE_KEY_LABELS = PROVENANCE_KEY_LABELS;
exports.PhasePlaneParamsSchema = PhasePlaneParamsSchema;
exports.PlasticityParamsSchema = PlasticityParamsSchema;
exports.ProvenanceKeyEnum = ProvenanceKeyEnum;
exports.ProvenanceSchema = ProvenanceSchema;
exports.RateResponseParamsSchema = RateResponseParamsSchema;
exports.SCENE_FRAMING = SCENE_FRAMING;
exports.SCENE_NAMES = SCENE_NAMES;
exports.SKILL_EXAMPLE_PAYLOADS = SKILL_EXAMPLE_PAYLOADS;
exports.SYNAPSE_COLORS = SYNAPSE_COLORS;
exports.Spatial3DParamsSchema = Spatial3DParamsSchema;
exports.SpikeRasterParamsSchema = SpikeRasterParamsSchema;
exports.SpikeRecorderEventsSchema = SpikeRecorderEventsSchema;
exports.TURBO_GLSL = TURBO_GLSL;
exports.VALID_RENDERER_ROUTES = VALID_RENDERER_ROUTES;
exports.VIK_GLSL = VIK_GLSL;
exports.VIRIDIS_GLSL = VIRIDIS_GLSL;
exports.VIZ_ROUTER_ID = VIZ_ROUTER_ID;
exports.VizSpecSchema = VizSpecSchema;
exports.VoltageTraceParamsSchema = VoltageTraceParamsSchema;
exports.WeightRecorderEventsSchema = WeightRecorderEventsSchema;
exports.categorical = categorical;
exports.colormapGradient = colormapGradient;
exports.colormapHex = colormapHex;
exports.colormapRgba = colormapRgba;
exports.colormapSvgStops = colormapSvgStops;
exports.defaultHonestyCaption = defaultHonestyCaption;
exports.describeSkill = describeSkill;
exports.describeSkills = describeSkills;
exports.detectEmptyScene = detectEmptyScene;
exports.getConnectionsToSceneData = getConnectionsToSceneData;
exports.getExamplePayload = getExamplePayload;
exports.getPalette = getPalette;
exports.getPaletteEntry = getPaletteEntry;
exports.getPositionToSceneData = getPositionToSceneData;
exports.getSkill = getSkill;
exports.isNestSkillId = isNestSkillId;
exports.isProvenanceKey = isProvenanceKey;
exports.isRegisteredPalette = isRegisteredPalette;
exports.listPalettes = listPalettes;
exports.listSkills = listSkills;
exports.multimeterToSceneData = multimeterToSceneData;
exports.registerPalette = registerPalette;
exports.requiresHonestyCaption = requiresHonestyCaption;
exports.routeToScene = routeToScene;
exports.sampleColormap = sampleColormap;
exports.spikeRecorderToSceneData = spikeRecorderToSceneData;
exports.splitMultimeterBySender = splitMultimeterBySender;
exports.validatePalette = validatePalette;
exports.validateSkillInvocation = validateSkillInvocation;
exports.validateVizSpec = validateVizSpec;
exports.weightRecorderToSceneData = weightRecorderToSceneData;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map