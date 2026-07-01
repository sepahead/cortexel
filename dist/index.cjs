'use strict';

var zod = require('zod');
var react = require('react');
var fiber = require('@react-three/fiber');
var THREE3 = require('three');
var jsxRuntime = require('react/jsx-runtime');
var drei = require('@react-three/drei');
var d3Force3d = require('d3-force-3d');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var THREE3__namespace = /*#__PURE__*/_interopNamespace(THREE3);

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
  "weight-histogram",
  "knowledge-graph-3d"
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
  "weight-histogram": { position: [0, 0.6, 7.4], target: [0, 0.6, 0], rotatable: false },
  "knowledge-graph-3d": { position: [0, 0, 260], target: [0, 0, 0], rotatable: true }
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
  "nest.animation_replay",
  "corpus.knowledge_graph"
];
var VIZ_ROUTER_ID = "nest.viz_router";
var NEST_DEVICE_FAMILIES = [
  "multimeter",
  "spike_recorder",
  "get_connections",
  "get_position",
  "weight_recorder",
  "computed",
  // no NEST device — numerically derived (phase plane, replay frames)
  "corpus"
  // no NEST device — corpus/KG structural graph (papers, models, families)
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
  "rate_normalization",
  "graph_source",
  "node_kinds",
  "edge_kinds",
  "identity_advisory"
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
  rate_normalization: "rate normalization",
  graph_source: "graph source",
  node_kinds: "node kinds",
  edge_kinds: "edge kinds",
  identity_advisory: "model-identity advisory (structural similarity, not certified sameness)"
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
var KnowledgeGraphNodeSchema = zod.z.object({
  id: zod.z.string().min(1),
  kind: zod.z.enum(["paper", "model", "family"]),
  label: zod.z.string().min(1),
  group: zod.z.string().optional()
}).strict();
var KnowledgeGraphEdgeSchema = zod.z.object({
  source: zod.z.string().min(1),
  target: zod.z.string().min(1),
  kind: zod.z.enum([
    "cites",
    "same_as",
    "variant_of",
    "instantiates",
    "belongs_to_family"
  ])
}).strict();
var KnowledgeGraph3DParamsSchema = zod.z.object({
  nodes: zod.z.array(KnowledgeGraphNodeSchema).min(1),
  edges: zod.z.array(KnowledgeGraphEdgeSchema)
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
  },
  "corpus.knowledge_graph": {
    scene: "knowledge-graph-3d",
    params: {
      nodes: [
        { id: "p1", kind: "paper", label: "Brunel 2000" },
        { id: "m1", kind: "model", label: "iaf_psc_delta" },
        { id: "f1", kind: "family", label: "LIF family" }
      ],
      edges: [
        { source: "p1", target: "m1", kind: "instantiates" },
        { source: "m1", target: "f1", kind: "belongs_to_family" }
      ]
    },
    mode: "interactive",
    themeMode: "dark",
    // advisory_only:true — identity edges are advisory structural similarity.
    provenance: {
      ...synthetic({
        graph_source: "corpus_kg",
        node_kinds: "paper,model,family",
        edge_kinds: "instantiates,belongs_to_family",
        identity_advisory: true
      }),
      advisory_only: true
    }
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
  },
  "corpus.knowledge_graph": {
    id: "corpus.knowledge_graph",
    version: "1.0.0",
    title: "Corpus knowledge-graph 3D renderer",
    description: "Render a cross-paper corpus knowledge graph in 3D: paper/model/family nodes with citation, instantiation and family edges, plus advisory model-identity (same_as/variant_of) edges.",
    deviceFamily: "corpus",
    scene: "knowledge-graph-3d",
    // weak: identity edges are advisory structural similarity, NOT certified
    // sameness — always carry the derived-view disclosure.
    weak: true,
    requiredInputKeys: ["nodes", "edges"],
    paramsSchema: KnowledgeGraph3DParamsSchema,
    requiredProvenanceKeys: [
      "graph_source",
      "node_kinds",
      "edge_kinds",
      "identity_advisory"
    ],
    rendererRoutes: ["media.model_graph", "fiber"],
    examples: [
      {
        nestExample: "Cross-paper corpus knowledge graph (papers + models + families)",
        sourceUrl: "https://github.com/sepahead/Paper2Brain#knowledge-graph",
        dataShape: "nodes (paper/model/family), edges (cites/same_as/variant_of/instantiates/belongs_to_family)",
        output: "3D force-directed graph with citation-flow particles and focus labels",
        note: "weak:true \u2014 same_as/variant_of are advisory structural similarity, never certified sameness."
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
function usePopulationExpand(controlled) {
  const [localSelected, setLocalSelected] = react.useState(null);
  const [localHovered, setLocalHovered] = react.useState(null);
  const selectedPopId = controlled ? controlled.selectedPopId : localSelected;
  const hoveredPopId = controlled ? controlled.hoveredPopId : localHovered;
  const setSelectedPopId = controlled ? controlled.setSelectedPopId : setLocalSelected;
  const setHoveredPopId = controlled ? controlled.setHoveredPopId : setLocalHovered;
  const toggleSelected = react.useCallback(
    (id) => setSelectedPopId(selectedPopId === id ? null : id),
    [selectedPopId, setSelectedPopId]
  );
  const reset = react.useCallback(() => {
    setSelectedPopId(null);
    setHoveredPopId(null);
  }, [setSelectedPopId, setHoveredPopId]);
  return {
    selectedPopId,
    hoveredPopId,
    setSelectedPopId,
    setHoveredPopId,
    isSelected: (id) => selectedPopId === id,
    isHovered: (id) => hoveredPopId === id,
    isAnySelected: () => selectedPopId !== null,
    toggleSelected,
    reset
  };
}
function ExpandablePopulation({
  position,
  color,
  isSelected,
  isAnySelected,
  isHovered,
  onHover,
  onClick,
  themeMode,
  size = 0.3,
  reducedMotion = false
}) {
  const meshRef = react.useRef(null);
  const ringRef = react.useRef(null);
  const scaleRef = react.useRef(1);
  const opacityRef = react.useRef(1);
  const colorObj = react.useMemo(() => new THREE3__namespace.Color(color), [color]);
  const voxelColor = react.useMemo(() => colorObj.clone().multiplyScalar(0.82), [colorObj]);
  const ringColor = react.useMemo(
    () => themeMode === "light" ? colorObj.clone().multiplyScalar(0.8) : colorObj.clone().multiplyScalar(1.15),
    // bloom-safe cap (was 1.25)
    [colorObj, themeMode]
  );
  const ringInner = size * 0.867;
  const ringOuter = size * 1.067;
  fiber.useFrame((state, delta) => {
    let targetScale = 1;
    let targetOpacity = 1;
    if (isSelected) {
      targetScale = 0;
      targetOpacity = 0;
    } else if (isAnySelected) {
      targetScale = 0.5;
      targetOpacity = 0.05;
    } else if (isHovered) {
      targetScale = 1.25;
      targetOpacity = 1;
    }
    const lerp = reducedMotion ? 1 : 0.15;
    scaleRef.current += (targetScale - scaleRef.current) * lerp;
    opacityRef.current += (targetOpacity - opacityRef.current) * lerp;
    if (meshRef.current) {
      const breathe = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 4) * 0.06 * (isHovered ? 1.5 : 1);
      meshRef.current.scale.setScalar(scaleRef.current * breathe);
      const mat = meshRef.current.material;
      mat.opacity = opacityRef.current;
    }
    if (ringRef.current && opacityRef.current > 0.01) {
      const ringMat = ringRef.current.material;
      if (reducedMotion) {
        ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
        ringMat.opacity = opacityRef.current * 0.25;
      } else {
        const ringTime = state.clock.elapsedTime * 1.5 % 1;
        const ringScale = scaleRef.current * (1 + ringTime * 1.2);
        ringRef.current.scale.set(ringScale, ringScale, 1);
        ringMat.opacity = opacityRef.current * (1 - ringTime) * 0.4;
      }
    }
  });
  return /* @__PURE__ */ jsxRuntime.jsxs("group", { position, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      "mesh",
      {
        ref: meshRef,
        onPointerOver: (e) => {
          e.stopPropagation();
          onHover(true);
        },
        onPointerOut: () => {
          onHover(false);
        },
        onClick: (e) => {
          e.stopPropagation();
          onClick();
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx("boxGeometry", { args: [size, size, size] }),
          /* @__PURE__ */ jsxRuntime.jsx("meshBasicMaterial", { color: voxelColor, transparent: true, toneMapped: true, fog: false })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs("mesh", { ref: ringRef, rotation: [-Math.PI / 2, 0, 0], children: [
      /* @__PURE__ */ jsxRuntime.jsx("ringGeometry", { args: [ringInner, ringOuter, 32] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "meshBasicMaterial",
        {
          color: ringColor,
          transparent: true,
          depthWrite: false,
          side: THREE3__namespace.DoubleSide
        }
      )
    ] })
  ] });
}

// react/neuronShaders.ts
var NEURON_VERT = (
  /* glsl */
  `
attribute float instancePhase;
attribute float neuronIndex;

uniform float uTime;
uniform float uExpansion;
uniform float uSelectedNeuronIndex;
uniform vec3 uCenter;

varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

void main() {
  // Sub-threshold membrane oscillation, phase-offset per neuron.
  float oscillation = sin(uTime * 2.0 + instancePhase) * 0.5 + 0.5;
  vMembranePotential = oscillation;

  // Sparse, cheap "spike": the top of each neuron's own oscillation pops bright.
  // Schematic liveliness only \u2014 not measured spiking.
  vSpikeIntensity = smoothstep(0.93, 1.0, oscillation);

  vIsSelected = abs(neuronIndex - uSelectedNeuronIndex) < 0.1 ? 1.0 : 0.0;

  // Progressive reveal: a small core shows first, outer rows fade in with uExpansion.
  if (neuronIndex > 50.0) {
    float rowThreshold = (neuronIndex - 50.0) / 1200.0;
    float visibility = smoothstep(rowThreshold - 0.06, rowThreshold + 0.06, uExpansion);
    if (visibility <= 0.01) {
      gl_Position = vec4(0.0);
      return;
    }
  }

  // Cluster tightly at the hub centre when collapsed; spread to the full grid as
  // uExpansion goes to 1. The position attribute is the centered local grid offset.
  float scale = mix(0.06, 1.0, uExpansion);
  vec3 pos = uCenter + position * scale;

  float size = mix(1.0, 1.8, uExpansion);
  if (vIsSelected > 0.5) size = 6.5;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`
);
var NEURON_FRAG = (
  /* glsl */
  `
varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

uniform vec3 uBaseColor;
uniform vec3 uSpikeColor;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  // Reconstruct the sphere normal across the point sprite.
  vec3 normal = vec3(center * 2.0, 0.0);
  normal.z = sqrt(max(0.0, 1.0 - dot(normal.xy, normal.xy)));
  normal = normalize(normal);

  vec3 lightDir = normalize(vec3(0.4, 0.6, 0.9));
  float diffuse = max(0.30, dot(normal, lightDir));
  vec3 baseColor = uBaseColor * diffuse * (0.72 + 0.28 * vMembranePotential);

  float fresnel = pow(1.0 - normal.z, 2.5);
  vec3 rim = uBaseColor * fresnel * (0.9 + 0.6 * vMembranePotential);

  float coreGlow = smoothstep(0.5, 0.0, dist);
  vec3 emissive = uBaseColor * coreGlow * (0.35 + 0.55 * vMembranePotential);

  vec3 color = baseColor + rim + emissive;

  // Spike flash \u2014 coloured bloom, capped ~1.15 luminance to stay under the
  // bloom bleach budget (design law).
  if (vSpikeIntensity > 0.001) {
    vec3 flash = mix(uSpikeColor, vec3(1.0), 0.35) * (1.10 + 0.05 * vSpikeIntensity);
    color = mix(color, flash, clamp(vSpikeIntensity * 1.1, 0.0, 1.0));
  }

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(0.0, dot(normal, halfDir)), 22.0);
  color += vec3(0.35) * spec * (1.0 - 0.4 * vSpikeIntensity);

  float alpha = smoothstep(0.5, 0.46, dist);

  // Selected neuron \u2014 gold halo ring.
  if (vIsSelected > 0.5) {
    if (dist > 0.40) {
      float ring = smoothstep(0.40, 0.43, dist);
      color = mix(color, vec3(1.15, 1.0, 0.36), ring);
      alpha = 1.0;
    }
    color += vec3(0.25, 0.22, 0.05);
  }

  gl_FragColor = vec4(max(color, vec3(0.0)), alpha);
}
`
);
var NEURON_CLUSTER_SCALE = 0.06;
function neuronExpandedScale(expansion) {
  return NEURON_CLUSTER_SCALE + (1 - NEURON_CLUSTER_SCALE) * expansion;
}
function neuronLocalGrid(count, spacing = 0.4) {
  const side = Math.max(2, Math.ceil(Math.cbrt(count)));
  const totalCount = side * side * side;
  const positions = new Float32Array(totalCount * 3);
  const phases = new Float32Array(totalCount);
  const neuronIndex = new Float32Array(totalCount);
  const half = (side - 1) / 2;
  for (let i = 0; i < totalCount; i++) {
    const ix = i % side;
    const iy = Math.floor(i / side) % side;
    const iz = Math.floor(i / (side * side));
    positions[i * 3] = (ix - half) * spacing;
    positions[i * 3 + 1] = (iy - half) * spacing;
    positions[i * 3 + 2] = (iz - half) * spacing;
    phases[i] = i * 2.399963 % (Math.PI * 2);
    neuronIndex[i] = i;
  }
  return { positions, phases, neuronIndex, side, totalCount };
}
function ExpandableNeurons({
  count,
  center = [0, 0, 0],
  color,
  spikeColor,
  expanded,
  themeMode,
  reducedMotion = false,
  spacing = 0.4,
  selectedNeuronIndex = null,
  onHoverNeuron,
  onSelectNeuron
}) {
  const grid = react.useMemo(() => neuronLocalGrid(count, spacing), [count, spacing]);
  const geometry = react.useMemo(() => {
    const g = new THREE3__namespace.BufferGeometry();
    g.setAttribute("position", new THREE3__namespace.BufferAttribute(grid.positions, 3));
    g.setAttribute("instancePhase", new THREE3__namespace.BufferAttribute(grid.phases, 1));
    g.setAttribute("neuronIndex", new THREE3__namespace.BufferAttribute(grid.neuronIndex, 1));
    return g;
  }, [grid]);
  const resolvedSpike = spikeColor ?? (themeMode === "light" ? "#b45309" : "#fde68a");
  const material = react.useMemo(() => {
    return new THREE3__namespace.ShaderMaterial({
      vertexShader: NEURON_VERT,
      fragmentShader: NEURON_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uExpansion: { value: 0 },
        uSelectedNeuronIndex: { value: -1 },
        uCenter: { value: new THREE3__namespace.Vector3(center[0], center[1], center[2]) },
        uBaseColor: { value: new THREE3__namespace.Color(color) },
        uSpikeColor: { value: new THREE3__namespace.Color(resolvedSpike) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE3__namespace.NormalBlending
    });
  }, [color, resolvedSpike]);
  const timeRef = react.useRef(0);
  const expansionRef = react.useRef(0);
  const opacityRef = react.useRef(0);
  fiber.useFrame((_, delta) => {
    if (!reducedMotion) timeRef.current += delta;
    const lerp = reducedMotion ? 1 : 0.15;
    const target = expanded ? 1 : 0;
    expansionRef.current += (target - expansionRef.current) * lerp;
    opacityRef.current += (target - opacityRef.current) * lerp;
    const u = material.uniforms;
    u.uTime.value = timeRef.current;
    u.uExpansion.value = expansionRef.current;
    u.uSelectedNeuronIndex.value = selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
    u.uCenter.value.set(center[0], center[1], center[2]);
    material.opacity = opacityRef.current;
  });
  const interactive = expanded;
  return /* @__PURE__ */ jsxRuntime.jsx(
    "points",
    {
      geometry,
      material,
      onPointerOver: (e) => {
        if (!interactive || !onHoverNeuron) return;
        e.stopPropagation();
        if (e.index !== void 0) onHoverNeuron(e.index);
      },
      onPointerOut: () => {
        if (!interactive || !onHoverNeuron) return;
        onHoverNeuron(null);
      },
      onClick: (e) => {
        if (!interactive || !onSelectNeuron) return;
        e.stopPropagation();
        if (e.index !== void 0) onSelectNeuron(e.index);
      }
    }
  );
}
var PARTICLES_PER_EDGE = 4;
var MAX_PARTICLES = 4e3;
var LABEL_OUTLINE = "#030711";
var _dummy = new THREE3__namespace.Object3D();
var _color = new THREE3__namespace.Color();
var _dimTarget = new THREE3__namespace.Color("#030711");
var _a = new THREE3__namespace.Vector3();
var _b = new THREE3__namespace.Vector3();
var _box = new THREE3__namespace.Box3();
var _sphere = new THREE3__namespace.Sphere();
function dim(hex, amount) {
  return _color.set(hex).lerp(_dimTarget, amount).clone();
}
function KnowledgeGraph3DScene({
  nodes,
  edges,
  selectedId,
  query,
  onSelect,
  hoverId,
  onHover,
  controlsRef,
  labelColor = "#e2e8f0"
}) {
  const meshRef = react.useRef(null);
  const linesRef = react.useRef(null);
  const particlesRef = react.useRef(null);
  const labelGroupRef = react.useRef(null);
  const { camera } = fiber.useThree();
  drei.useCursor(hoverId != null);
  const posMap = react.useRef(/* @__PURE__ */ new Map());
  const framedRef = react.useRef(false);
  const flyToRef = react.useRef(null);
  const { simNodes, simLinks, index } = react.useMemo(() => {
    const index2 = /* @__PURE__ */ new Map();
    const simNodes2 = nodes.map((n, i) => {
      index2.set(n.id, i);
      const prev = posMap.current.get(n.id);
      const spread = 90;
      return {
        id: n.id,
        r: n.radius,
        x: prev ? prev[0] : (Math.random() * 2 - 1) * spread,
        y: prev ? prev[1] : (Math.random() * 2 - 1) * spread,
        z: prev ? prev[2] : (Math.random() * 2 - 1) * spread
      };
    });
    const simLinks2 = edges.filter((e) => index2.has(e.source) && index2.has(e.target)).map((e) => ({ source: e.source, target: e.target }));
    return { simNodes: simNodes2, simLinks: simLinks2, index: index2 };
  }, [nodes, edges]);
  const neighbors = react.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    nodes.forEach((n) => m.set(n.id, /* @__PURE__ */ new Set()));
    edges.forEach((e) => {
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    });
    return m;
  }, [nodes, edges]);
  const flowEdges = react.useMemo(
    () => edges.filter((e) => e.particles && index.has(e.source) && index.has(e.target)),
    [edges, index]
  );
  const particleCount = Math.min(MAX_PARTICLES, flowEdges.length * PARTICLES_PER_EDGE);
  const linePos = react.useMemo(() => new Float32Array(simLinks.length * 6), [simLinks]);
  const lineCol = react.useMemo(() => new Float32Array(simLinks.length * 6), [simLinks]);
  const simRef = react.useRef(null);
  react.useEffect(() => {
    const linkForce = d3Force3d.forceLink(simLinks).id((d) => d.id).distance(34).strength(0.35);
    const sim = d3Force3d.forceSimulation(simNodes, 3).force("charge", d3Force3d.forceManyBody().strength(-140).distanceMax(600)).force("link", linkForce).force("center", d3Force3d.forceCenter(0, 0, 0).strength(0.04)).force("collide", d3Force3d.forceCollide((d) => d.r + 3).iterations(2)).alpha(1).alphaDecay(0.018).velocityDecay(0.42).stop();
    simRef.current = sim;
    framedRef.current = false;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [simNodes, simLinks]);
  const applyEmphasis = react.useCallback(() => {
    const mesh = meshRef.current;
    const focus = hoverId ?? selectedId;
    const focusSet = focus ? neighbors.get(focus) : null;
    const q = query.trim().toLowerCase();
    const isDimmed = (id, label) => {
      if (focus && id !== focus && !focusSet?.has(id)) return 0.8;
      if (!focus && q && !label.toLowerCase().includes(q)) return 0.82;
      return 0;
    };
    if (mesh) {
      nodes.forEach((n, i) => {
        mesh.setColorAt(i, dim(n.color, isDimmed(n.id, n.label)));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    let k = 0;
    for (const e of edges) {
      if (!index.has(e.source) || !index.has(e.target)) continue;
      const incident = !focus || e.source === focus || e.target === focus;
      const c = dim(e.color, incident ? 0.25 : 0.86);
      lineCol[k] = c.r;
      lineCol[k + 1] = c.g;
      lineCol[k + 2] = c.b;
      lineCol[k + 3] = c.r;
      lineCol[k + 4] = c.g;
      lineCol[k + 5] = c.b;
      k += 6;
    }
    const geom = linesRef.current?.geometry;
    const attr = geom?.getAttribute("color");
    if (attr) attr.needsUpdate = true;
  }, [nodes, edges, index, neighbors, hoverId, selectedId, query, lineCol]);
  react.useEffect(() => {
    applyEmphasis();
  }, [applyEmphasis]);
  react.useEffect(() => {
    if (!selectedId) return;
    const i = index.get(selectedId);
    if (i == null) return;
    const n = simNodes[i];
    flyToRef.current = new THREE3__namespace.Vector3(n.x, n.y, n.z);
  }, [selectedId, index, simNodes]);
  fiber.useFrame((_, delta) => {
    const sim = simRef.current;
    const mesh = meshRef.current;
    if (!sim || !mesh) return;
    if (sim.alpha() > 8e-3) sim.tick();
    const focus = hoverId ?? selectedId;
    const focusSet = focus ? neighbors.get(focus) : null;
    for (let i = 0; i < simNodes.length; i++) {
      const n = simNodes[i];
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const z5 = n.z ?? 0;
      posMap.current.set(n.id, [x, y, z5]);
      _dummy.position.set(x, y, z5);
      const pop = focus && (n.id === focus || focusSet?.has(n.id)) ? 1.28 : 1;
      _dummy.scale.setScalar(n.r * pop);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    let k = 0;
    for (const e of edges) {
      const si = index.get(e.source);
      const ti = index.get(e.target);
      if (si == null || ti == null) continue;
      const s = simNodes[si];
      const t = simNodes[ti];
      linePos[k] = s.x ?? 0;
      linePos[k + 1] = s.y ?? 0;
      linePos[k + 2] = s.z ?? 0;
      linePos[k + 3] = t.x ?? 0;
      linePos[k + 4] = t.y ?? 0;
      linePos[k + 5] = t.z ?? 0;
      k += 6;
    }
    const posAttr = linesRef.current?.geometry.getAttribute("position");
    if (posAttr) posAttr.needsUpdate = true;
    const pmesh = particlesRef.current;
    if (pmesh && particleCount > 0) {
      const speed = 0.28;
      const base = performance.now() / 1e3 * speed;
      let p = 0;
      for (let fe = 0; fe < flowEdges.length && p < particleCount; fe++) {
        const e = flowEdges[fe];
        const s = simNodes[index.get(e.source)];
        const t = simNodes[index.get(e.target)];
        _a.set(s.x ?? 0, s.y ?? 0, s.z ?? 0);
        _b.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
        for (let q = 0; q < PARTICLES_PER_EDGE && p < particleCount; q++) {
          const frac = ((base + q / PARTICLES_PER_EDGE) % 1 + 1) % 1;
          _dummy.position.copy(_a).lerp(_b, frac);
          _dummy.scale.setScalar(1.3);
          _dummy.updateMatrix();
          pmesh.setMatrixAt(p, _dummy.matrix);
          p++;
        }
      }
      pmesh.instanceMatrix.needsUpdate = true;
    }
    const label = labelGroupRef.current;
    if (label) {
      if (focus) {
        const fi = index.get(focus);
        if (fi != null) {
          const n = simNodes[fi];
          label.position.set(n.x ?? 0, (n.y ?? 0) + n.r + 4, n.z ?? 0);
          label.visible = true;
        }
      } else {
        label.visible = false;
      }
    }
    const controls = controlsRef?.current;
    if (!framedRef.current && sim.alpha() < 0.25) {
      framedRef.current = true;
      _box.makeEmpty();
      for (const n of simNodes) _box.expandByPoint(_a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0));
      const sphere = _box.getBoundingSphere(_sphere);
      const dist = Math.max(120, sphere.radius * 2.4);
      camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + dist);
      if (controls) {
        controls.target.copy(sphere.center);
        controls.update();
      }
    }
    if (flyToRef.current && controls) {
      controls.target.lerp(flyToRef.current, Math.min(1, delta * 3));
      if (controls.target.distanceTo(flyToRef.current) < 0.5) flyToRef.current = null;
      controls.update();
    }
  });
  const focusLabel = react.useMemo(() => {
    const focus = hoverId ?? selectedId;
    return focus ? nodes.find((n) => n.id === focus)?.label ?? "" : "";
  }, [hoverId, selectedId, nodes]);
  const handleMove = react.useCallback(
    (e) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < nodes.length) onHover(nodes[e.instanceId].id);
    },
    [nodes, onHover]
  );
  const handleOut = react.useCallback(() => onHover(null), [onHover]);
  const handleClick = react.useCallback(
    (e) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < nodes.length) onSelect(nodes[e.instanceId].id);
    },
    [nodes, onSelect]
  );
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      "instancedMesh",
      {
        ref: meshRef,
        args: [void 0, void 0, Math.max(1, nodes.length)],
        onPointerMove: handleMove,
        onPointerOut: handleOut,
        onClick: handleClick,
        children: [
          /* @__PURE__ */ jsxRuntime.jsx("sphereGeometry", { args: [1, 20, 20] }),
          /* @__PURE__ */ jsxRuntime.jsx("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `nodes-${nodes.length}`
    ),
    /* @__PURE__ */ jsxRuntime.jsxs("lineSegments", { ref: linesRef, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("bufferGeometry", { children: [
        /* @__PURE__ */ jsxRuntime.jsx("bufferAttribute", { attach: "attributes-position", args: [linePos, 3] }),
        /* @__PURE__ */ jsxRuntime.jsx("bufferAttribute", { attach: "attributes-color", args: [lineCol, 3] })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "lineBasicMaterial",
        {
          vertexColors: true,
          transparent: true,
          opacity: 0.75,
          toneMapped: false,
          depthWrite: false,
          blending: THREE3__namespace.AdditiveBlending
        }
      )
    ] }, `lines-${simLinks.length}`),
    particleCount > 0 ? /* @__PURE__ */ jsxRuntime.jsxs(
      "instancedMesh",
      {
        ref: particlesRef,
        args: [void 0, void 0, particleCount],
        children: [
          /* @__PURE__ */ jsxRuntime.jsx("sphereGeometry", { args: [0.6, 6, 6] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "meshBasicMaterial",
            {
              color: "#8fd3ff",
              toneMapped: false,
              transparent: true,
              opacity: 0.9,
              blending: THREE3__namespace.AdditiveBlending
            }
          )
        ]
      },
      `p-${particleCount}`
    ) : null,
    /* @__PURE__ */ jsxRuntime.jsx("group", { ref: labelGroupRef, visible: false, children: /* @__PURE__ */ jsxRuntime.jsx(drei.Billboard, { children: /* @__PURE__ */ jsxRuntime.jsx(
      drei.Text,
      {
        fontSize: 7,
        color: labelColor,
        anchorX: "center",
        anchorY: "bottom",
        outlineWidth: 0.4,
        outlineColor: LABEL_OUTLINE,
        maxWidth: 160,
        children: focusLabel
      }
    ) }) })
  ] });
}
function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  active = true,
  activePalette,
  onError
}) {
  if (skillId) {
    const gated = validateSkillInvocation(skillId, spec);
    if (!gated.ok) {
      const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
      onError?.(messages);
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
        /* @__PURE__ */ jsxRuntime.jsxs("strong", { children: [
          "Invalid skill invocation (",
          skillId,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("ul", { children: messages.map((e, i) => /* @__PURE__ */ jsxRuntime.jsx("li", { children: e }, i)) })
      ] });
    }
    const palette2 = gated.spec.palette ? getPalette(gated.spec.palette) : activePalette ?? getPalette("crameri");
    return /* @__PURE__ */ jsxRuntime.jsx(
      SceneFrame,
      {
        scene: gated.scene,
        themeMode: gated.spec.themeMode,
        mode: gated.spec.mode,
        camera: gated.spec.camera,
        palette: palette2,
        caption: gated.caption,
        active,
        renderScene
      }
    );
  }
  const result = validateVizSpec(spec);
  if (!result.ok) {
    onError?.(result.errors);
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
      /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Invalid VizSpec" }),
      /* @__PURE__ */ jsxRuntime.jsx("ul", { children: result.errors.map((e, i) => /* @__PURE__ */ jsxRuntime.jsx("li", { children: e }, i)) })
    ] });
  }
  const { scene, themeMode, mode, camera, provenance, palette: paletteHint } = result.spec;
  const caption = requiresHonestyCaption(provenance) ? defaultHonestyCaption(provenance) : null;
  const palette = paletteHint ? getPalette(paletteHint) : activePalette ?? getPalette("crameri");
  return /* @__PURE__ */ jsxRuntime.jsx(
    SceneFrame,
    {
      scene,
      themeMode,
      mode,
      camera,
      palette,
      caption,
      active,
      renderScene
    }
  );
}
function SceneFrame({
  scene,
  themeMode,
  mode,
  camera,
  palette,
  caption,
  active,
  renderScene
}) {
  if (mode === "export") {
    return /* @__PURE__ */ jsxRuntime.jsx("div", { role: "status", className: "cortexel-vizspec-export-unsupported", children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled." });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      className: "cortexel-vizspec",
      style: { position: "relative", width: "100%", height: "100%" },
      children: [
        renderScene({ scene, themeMode, active, camera, palette }),
        caption && /* @__PURE__ */ jsxRuntime.jsx(
          "div",
          {
            className: "cortexel-honesty-caption",
            role: "note",
            "aria-live": "polite",
            "aria-label": "Scientific provenance disclosure",
            style: {
              position: "absolute",
              left: 12,
              bottom: 12,
              maxWidth: "70%",
              padding: "4px 10px",
              borderRadius: 6,
              // Okabe-Ito amber on opaque dark — bloom-safe (DOM, not emissive).
              background: "rgba(20,22,28,0.92)",
              color: "#e69f00",
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: "none"
            },
            children: caption
          }
        )
      ]
    }
  );
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
exports.ExpandableNeurons = ExpandableNeurons;
exports.ExpandablePopulation = ExpandablePopulation;
exports.GetConnectionsSchema = GetConnectionsSchema;
exports.GetPosition2DSchema = GetPosition2DSchema;
exports.GetPosition3DSchema = GetPosition3DSchema;
exports.KnowledgeGraph3DParamsSchema = KnowledgeGraph3DParamsSchema;
exports.KnowledgeGraph3DScene = KnowledgeGraph3DScene;
exports.MultimeterEventsSchema = MultimeterEventsSchema;
exports.MultimeterMultiSenderSchema = MultimeterMultiSenderSchema;
exports.NEST_DEVICE_FAMILIES = NEST_DEVICE_FAMILIES;
exports.NEST_SKILL_IDS = NEST_SKILL_IDS;
exports.NEST_SKILL_REGISTRY = NEST_SKILL_REGISTRY;
exports.NEURON_CLUSTER_SCALE = NEURON_CLUSTER_SCALE;
exports.NEURON_FRAG = NEURON_FRAG;
exports.NEURON_VERT = NEURON_VERT;
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
exports.VizSpecRenderer = VizSpecRenderer;
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
exports.neuronExpandedScale = neuronExpandedScale;
exports.neuronLocalGrid = neuronLocalGrid;
exports.registerPalette = registerPalette;
exports.requiresHonestyCaption = requiresHonestyCaption;
exports.routeToScene = routeToScene;
exports.sampleColormap = sampleColormap;
exports.spikeRecorderToSceneData = spikeRecorderToSceneData;
exports.splitMultimeterBySender = splitMultimeterBySender;
exports.usePopulationExpand = usePopulationExpand;
exports.validatePalette = validatePalette;
exports.validateSkillInvocation = validateSkillInvocation;
exports.validateVizSpec = validateVizSpec;
exports.weightRecorderToSceneData = weightRecorderToSceneData;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map