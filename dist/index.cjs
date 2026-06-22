'use strict';

var zod = require('zod');
var react = require('react');
var fiber = require('@react-three/fiber');
var THREE = require('three');
var jsxRuntime = require('react/jsx-runtime');

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

var THREE__namespace = /*#__PURE__*/_interopNamespace(THREE);

// core/colormaps.ts
var STOPS = {
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
var ENGRAM_PALETTE = {
  // Canvas / surfaces
  voidNavy: "#030711",
  deepNavy: "#050816",
  panel: "#0b1220",
  grid: "#1e293b",
  // Brand signal
  cyan: "#22d3ee",
  teal: "#2dd4bf",
  violet: "#a78bfa",
  amber: "#fbbf24",
  orange: "#fb923c",
  pink: "#f472b6",
  // Membrane / spikes
  membrane: "#14f1dd",
  spike: "#fde68a",
  spikeHot: "#fff7ed",
  // Excitatory vs inhibitory (Allen/MICrONS convention: E warm-cyan, I red)
  excitatory: "#38bdf8",
  inhibitory: "#fb7185",
  // Plasticity (LTP potentiation vs LTD depression)
  ltp: "#22d3ee",
  ltd: "#fb923c",
  // Text
  ink: "#e2e8f0",
  inkDim: "#94a3b8",
  inkFaint: "#64748b"
};
var CORTICAL_LAYER_COLORS = {
  L1: colormapHex("viridis", 0.05),
  "L2/3": colormapHex("viridis", 0.3),
  L4: colormapHex("viridis", 0.52),
  L5: colormapHex("viridis", 0.72),
  L6: colormapHex("viridis", 0.92)
};
var CATEGORICAL = [
  "#22d3ee",
  "#a78bfa",
  "#fb923c",
  "#34d399",
  "#f472b6",
  "#facc15",
  "#60a5fa",
  "#fb7185",
  "#2dd4bf",
  "#c084fc"
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
    excitatory: "#4a6b8a",
    // muted azure
    inhibitory: "#8a6b4a"
    // muted warm
  },
  light: {
    excitatory: "#7d97b5",
    // soft blue-grey (lifted for light canvas)
    inhibitory: "#b5977d"
    // soft warm-grey (lifted for light canvas)
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
var PI_NEST_SKILL_IDS = [
  "pi.nest.voltage_trace",
  "pi.nest.spike_raster",
  "pi.nest.rate_response",
  "pi.nest.connectivity_matrix",
  "pi.nest.spatial_2d",
  "pi.nest.spatial_3d",
  "pi.nest.plasticity_dynamics",
  "pi.nest.phase_plane",
  "pi.nest.correlogram",
  "pi.nest.stimulus_response",
  "pi.nest.astrocyte_dynamics",
  "pi.nest.compartmental_dynamics",
  "pi.nest.animation_replay"
];
var VIZ_ROUTER_ID = "pi.nest.viz_router";
var NEST_DEVICE_FAMILIES = [
  "multimeter",
  "spike_recorder",
  "get_connections",
  "get_position",
  "weight_recorder",
  "computed"
  // no NEST device — numerically derived (phase plane, replay frames)
];
function isPiNestSkillId(value) {
  return typeof value === "string" && PI_NEST_SKILL_IDS.includes(value);
}
var VALID_RENDERER_ROUTES = [
  "pi.media.trace_figure",
  "pi.media.model_graph",
  "pi.media.webgl_scene",
  "pi.media.react_fiber_scene",
  "pi.media.manim_storyboard",
  "pi.media.*",
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

// core/skills/registry.ts
var CORTEXEL_SKILL_VERSION = "1.0.0";
var NEST_SKILL_REGISTRY = {
  "pi.nest.voltage_trace": {
    id: "pi.nest.voltage_trace",
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
    rendererRoutes: ["pi.media.trace_figure", "matplotlib", "d3"],
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
  "pi.nest.spike_raster": {
    id: "pi.nest.spike_raster",
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
    rendererRoutes: ["pi.media.model_graph", "d3"],
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
  "pi.nest.rate_response": {
    id: "pi.nest.rate_response",
    version: "1.0.0",
    title: "NEST rate / IF response renderer",
    description: "Render firing-rate / IF curves and population rates derived from spike counts.",
    deviceFamily: "spike_recorder",
    scene: "fi-curve",
    requiredInputKeys: ["stimulus_amplitudes", "rates_hz", "units"],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "bin_ms", "rate_normalization"],
    rendererRoutes: ["pi.media.trace_figure", "matplotlib", "d3"],
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
  "pi.nest.connectivity_matrix": {
    id: "pi.nest.connectivity_matrix",
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
    rendererRoutes: ["pi.media.model_graph", "d3"],
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
  "pi.nest.spatial_2d": {
    id: "pi.nest.spatial_2d",
    version: "1.0.0",
    title: "NEST 2D spatial renderer",
    description: "Render 2D layer positions, masks, kernels and sampled projections.",
    deviceFamily: "get_position",
    scene: null,
    // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    requiredInputKeys: ["positions"],
    requiredProvenanceKeys: ["extent", "mask", "kernel"],
    rendererRoutes: ["pi.media.model_graph", "d3"],
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
  "pi.nest.spatial_3d": {
    id: "pi.nest.spatial_3d",
    version: "1.0.0",
    title: "NEST 3D spatial renderer",
    description: "Render 3D population/node positions for spatial inspection.",
    deviceFamily: "get_position",
    scene: "network-topology",
    requiredInputKeys: ["objects"],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ["extent", "projection_sample_policy"],
    rendererRoutes: [
      "pi.media.webgl_scene",
      "pi.media.react_fiber_scene",
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
  "pi.nest.plasticity_dynamics": {
    id: "pi.nest.plasticity_dynamics",
    version: "1.0.0",
    title: "NEST plasticity dynamics renderer",
    description: "Render STDP windows, weight adaptation and short-term dynamics.",
    deviceFamily: "weight_recorder",
    scene: "stdp",
    requiredInputKeys: ["times_ms", "weights", "weight_units"],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ["synapse_model", "weight_units"],
    rendererRoutes: ["pi.media.trace_figure", "matplotlib"],
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
  "pi.nest.phase_plane": {
    id: "pi.nest.phase_plane",
    version: "1.0.0",
    title: "NEST phase-plane renderer",
    description: "Render phase planes, vector fields, nullclines and trajectories.",
    deviceFamily: "computed",
    scene: "phase-plane",
    requiredInputKeys: ["grid"],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: ["state_variables"],
    rendererRoutes: ["pi.media.model_graph", "d3"],
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
  "pi.nest.correlogram": {
    id: "pi.nest.correlogram",
    version: "1.0.0",
    title: "NEST correlogram / synchrony renderer",
    description: "Render auto/cross-correlation functions for spike trains.",
    deviceFamily: "spike_recorder",
    scene: null,
    // ISI-histogram scene exists but the math differs — no honest reuse
    requiredInputKeys: ["lags_ms", "correlation"],
    requiredProvenanceKeys: ["bin_ms", "pair_labels"],
    rendererRoutes: ["pi.media.model_graph", "d3"],
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
  "pi.nest.stimulus_response": {
    id: "pi.nest.stimulus_response",
    version: "1.0.0",
    title: "NEST stimulus-response protocol renderer",
    description: "Render aligned stimulus waveforms, responses, spikes and protocol epochs.",
    deviceFamily: "multimeter",
    scene: null,
    // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ["stimulus", "response"],
    requiredProvenanceKeys: ["stim_units", "units"],
    rendererRoutes: ["pi.media.trace_figure", "matplotlib"],
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
  "pi.nest.astrocyte_dynamics": {
    id: "pi.nest.astrocyte_dynamics",
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
    rendererRoutes: ["pi.media.trace_figure", "matplotlib"],
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
  "pi.nest.compartmental_dynamics": {
    id: "pi.nest.compartmental_dynamics",
    version: "1.0.0",
    title: "NEST compartmental morphology + dynamics renderer",
    description: "Render multi-compartment morphologies, receptor ports and soma/dendrite traces.",
    deviceFamily: "multimeter",
    scene: null,
    // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ["compartments"],
    requiredProvenanceKeys: ["morphology_disclaimer", "recorded_variable"],
    rendererRoutes: ["pi.media.model_graph", "d3"],
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
  "pi.nest.animation_replay": {
    id: "pi.nest.animation_replay",
    version: "1.0.0",
    title: "NEST state replay / animation storyboard renderer",
    description: "Render time-evolution storyboards and inspectable state replays.",
    deviceFamily: "computed",
    scene: null,
    // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ["frames"],
    requiredProvenanceKeys: ["frame_rate"],
    rendererRoutes: ["pi.media.manim_storyboard", "manim"],
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

// core/skills/router.ts
var SPIKE_KIND_TO_SKILL = {
  events: "pi.nest.spike_raster",
  rates: "pi.nest.rate_response",
  correlation: "pi.nest.correlogram"
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
          hint: "Use one of the registered pi.nest.* skills.",
          validSkills: PI_NEST_SKILL_IDS
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
      validScenes: [contract.scene]
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
          hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`
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
        hint: `Skill '${skillId}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(", ")}.`
      });
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  let caption = requiresHonestyCaption(prov) ? defaultHonestyCaption(prov) : null;
  if (contract.weak) {
    const weakMsg = `Derived view \u2014 ${skillId} reuses the '${contract.scene}' scene; not a 1:1 rendering.`;
    caption = caption ? `${weakMsg} ${caption}` : weakMsg;
  }
  return { ok: true, spec, scene: contract.scene, caption };
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
  const colorObj = react.useMemo(() => new THREE__namespace.Color(color), [color]);
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
          side: THREE__namespace.DoubleSide
        }
      )
    ] })
  ] });
}
function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  active = true,
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
    return /* @__PURE__ */ jsxRuntime.jsx(
      SceneFrame,
      {
        scene: gated.scene,
        themeMode: gated.spec.themeMode,
        mode: gated.spec.mode,
        camera: gated.spec.camera,
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
  const { scene, themeMode, mode, camera, provenance } = result.spec;
  const caption = requiresHonestyCaption(provenance) ? defaultHonestyCaption(provenance) : null;
  return /* @__PURE__ */ jsxRuntime.jsx(
    SceneFrame,
    {
      scene,
      themeMode,
      mode,
      camera,
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
        renderScene({ scene, themeMode, active, camera }),
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
exports.CAMERA_PRESETS = CAMERA_PRESETS;
exports.CATEGORICAL = CATEGORICAL;
exports.CONSERVATIVE_PROVENANCE = CONSERVATIVE_PROVENANCE;
exports.CORTEXEL_SKILL_VERSION = CORTEXEL_SKILL_VERSION;
exports.CORTICAL_LAYER_COLORS = CORTICAL_LAYER_COLORS;
exports.ENGRAM_PALETTE = ENGRAM_PALETTE;
exports.ExpandablePopulation = ExpandablePopulation;
exports.GetConnectionsSchema = GetConnectionsSchema;
exports.GetPosition2DSchema = GetPosition2DSchema;
exports.GetPosition3DSchema = GetPosition3DSchema;
exports.MultimeterEventsSchema = MultimeterEventsSchema;
exports.NEST_DEVICE_FAMILIES = NEST_DEVICE_FAMILIES;
exports.NEST_SKILL_REGISTRY = NEST_SKILL_REGISTRY;
exports.NetworkParamsSchema = NetworkParamsSchema;
exports.OKABE_ITO = OKABE_ITO;
exports.PI_NEST_SKILL_IDS = PI_NEST_SKILL_IDS;
exports.PROVENANCE_KEYS = PROVENANCE_KEYS;
exports.PROVENANCE_KEY_LABELS = PROVENANCE_KEY_LABELS;
exports.PhasePlaneParamsSchema = PhasePlaneParamsSchema;
exports.PlasticityParamsSchema = PlasticityParamsSchema;
exports.ProvenanceKeyEnum = ProvenanceKeyEnum;
exports.ProvenanceSchema = ProvenanceSchema;
exports.RateResponseParamsSchema = RateResponseParamsSchema;
exports.SCENE_FRAMING = SCENE_FRAMING;
exports.SCENE_NAMES = SCENE_NAMES;
exports.SYNAPSE_COLORS = SYNAPSE_COLORS;
exports.Spatial3DParamsSchema = Spatial3DParamsSchema;
exports.SpikeRasterParamsSchema = SpikeRasterParamsSchema;
exports.SpikeRecorderEventsSchema = SpikeRecorderEventsSchema;
exports.TURBO_GLSL = TURBO_GLSL;
exports.VALID_RENDERER_ROUTES = VALID_RENDERER_ROUTES;
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
exports.getConnectionsToSceneData = getConnectionsToSceneData;
exports.getPositionToSceneData = getPositionToSceneData;
exports.getSkill = getSkill;
exports.isPiNestSkillId = isPiNestSkillId;
exports.isProvenanceKey = isProvenanceKey;
exports.listSkills = listSkills;
exports.multimeterToSceneData = multimeterToSceneData;
exports.requiresHonestyCaption = requiresHonestyCaption;
exports.routeToScene = routeToScene;
exports.sampleColormap = sampleColormap;
exports.spikeRecorderToSceneData = spikeRecorderToSceneData;
exports.usePopulationExpand = usePopulationExpand;
exports.validateSkillInvocation = validateSkillInvocation;
exports.validateVizSpec = validateVizSpec;
exports.weightRecorderToSceneData = weightRecorderToSceneData;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map