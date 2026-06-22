import { listSkills, NEST_SKILL_REGISTRY } from './chunk-X3PTQEFC.js';
import { z } from 'zod';

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
var ProvenanceKeyEnum = z.enum(PROVENANCE_KEYS);
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
var finiteNumberArray = z.array(z.number()).refine((a) => a.every((v) => Number.isFinite(v)), {
  message: "array contains non-finite values (NaN/Inf) \u2014 unusable evidence"
});
var nonEmptyFinite = finiteNumberArray.min(
  1,
  "empty array \u2014 no samples to render"
);
var finiteNum = z.number().refine((v) => Number.isFinite(v), "non-finite value (NaN/Inf)");
var SpikeRecorderEventsSchema = z.object({
  senders: finiteNumberArray,
  // becomes denseIndex Map keys — reject NaN/Inf
  times: finiteNumberArray
}).superRefine((v, ctx) => {
  if (v.senders.length !== v.times.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `senders (${v.senders.length}) and times (${v.times.length}) length mismatch`
    });
  }
});
var MultimeterEventsSchema = z.object({
  times: nonEmptyFinite,
  values: nonEmptyFinite
}).superRefine((v, ctx) => {
  if (v.times.length !== v.values.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `times (${v.times.length}) and values (${v.values.length}) length mismatch`
    });
  }
  for (let i = 1; i < v.times.length; i++) {
    if (v.times[i] < v.times[i - 1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "multimeter times are non-monotonic \u2014 likely multiple senders flattened together; split per sender before adapting"
      });
      break;
    }
  }
});
var GetConnectionsSchema = z.object({
  sources: finiteNumberArray.min(1, "no connections"),
  targets: finiteNumberArray.min(1, "no connections"),
  weights: finiteNumberArray.optional(),
  delays: finiteNumberArray.optional()
}).superRefine((v, ctx) => {
  if (v.sources.length !== v.targets.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `sources (${v.sources.length}) and targets (${v.targets.length}) length mismatch`
    });
  }
  if (v.weights && v.weights.length !== v.sources.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "weights length does not match connection count"
    });
  }
});
var xyz = z.tuple([finiteNum, finiteNum, finiteNum]);
var xy = z.tuple([finiteNum, finiteNum]);
var GetPosition2DSchema = z.object({
  positions: z.array(xy).min(1, "no positions")
});
var GetPosition3DSchema = z.object({
  positions: z.array(xyz).min(1, "no positions"),
  edges: z.array(z.object({ source: z.number(), target: z.number() })).optional()
});
var WeightRecorderEventsSchema = z.object({
  times: nonEmptyFinite,
  weights: nonEmptyFinite,
  senders: finiteNumberArray.optional(),
  targets: finiteNumberArray.optional()
}).superRefine((v, ctx) => {
  if (v.times.length !== v.weights.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
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
      networkNodes: parsed.data.positions.map(([x, y, z3], i) => ({
        id: i,
        x,
        y,
        z: z3,
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

export { AXIS_COLORS, CATEGORICAL, CORTICAL_LAYER_COLORS, ENGRAM_PALETTE, GetConnectionsSchema, GetPosition2DSchema, GetPosition3DSchema, MultimeterEventsSchema, OKABE_ITO, PROVENANCE_KEYS, PROVENANCE_KEY_LABELS, ProvenanceKeyEnum, SYNAPSE_COLORS, SpikeRecorderEventsSchema, TURBO_GLSL, VIRIDIS_GLSL, WeightRecorderEventsSchema, categorical, colormapGradient, colormapHex, colormapRgba, colormapSvgStops, getConnectionsToSceneData, getPositionToSceneData, isProvenanceKey, multimeterToSceneData, routeToScene, sampleColormap, spikeRecorderToSceneData, weightRecorderToSceneData };
//# sourceMappingURL=chunk-JQSEVV6O.js.map
//# sourceMappingURL=chunk-JQSEVV6O.js.map