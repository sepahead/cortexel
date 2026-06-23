import { listSkills, NEST_SKILL_REGISTRY } from './chunk-GWWXJ7YG.js';
import { z } from 'zod';

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
var MultimeterMultiSenderSchema = z.object({
  times: nonEmptyFinite,
  values: nonEmptyFinite,
  senders: finiteNumberArray.min(1, "no senders")
}).superRefine((v, ctx) => {
  const n = v.times.length;
  if (v.values.length !== n || v.senders.length !== n) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "times, values and senders must be the same length"
    });
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

export { GetConnectionsSchema, GetPosition2DSchema, GetPosition3DSchema, MultimeterEventsSchema, MultimeterMultiSenderSchema, PROVENANCE_KEYS, PROVENANCE_KEY_LABELS, ProvenanceKeyEnum, SpikeRecorderEventsSchema, WeightRecorderEventsSchema, detectEmptyScene, getConnectionsToSceneData, getPositionToSceneData, isProvenanceKey, multimeterToSceneData, routeToScene, spikeRecorderToSceneData, splitMultimeterBySender, weightRecorderToSceneData };
//# sourceMappingURL=chunk-O3S3QSUF.js.map
//# sourceMappingURL=chunk-O3S3QSUF.js.map