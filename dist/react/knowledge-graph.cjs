"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// react/knowledgeGraphPublic.ts
var knowledgeGraphPublic_exports = {};
__export(knowledgeGraphPublic_exports, {
  CORPUS_GRAPH_RADIUS_MEANING: () => CORPUS_GRAPH_RADIUS_MEANING,
  DEFAULT_A11Y_NODE_PAGE_SIZE: () => DEFAULT_A11Y_NODE_PAGE_SIZE,
  DEFAULT_GRAPH_NODE_RADIUS: () => DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_EDGE_CURVE_SEGMENTS: () => GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING: () => GRAPH_EDGE_LANE_SPACING,
  GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS: () => GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS,
  GRAPH_LAYOUT_TICK_SECONDS: () => GRAPH_LAYOUT_TICK_SECONDS,
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1: () => import_knowledgeGraphPresentation8.KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  KnowledgeGraph3DScene: () => KnowledgeGraph3DScene,
  KnowledgeGraphA11yList: () => KnowledgeGraphA11yList,
  KnowledgeGraphAccessibleFigure: () => KnowledgeGraphAccessibleFigure,
  KnowledgeGraphLegend: () => KnowledgeGraphLegend,
  KnowledgeGraphPresentationJsonError: () => import_knowledgeGraphPresentation8.KnowledgeGraphPresentationJsonError,
  KnowledgeGraphStaticRecordView: () => KnowledgeGraphStaticRecordView,
  MAX_A11Y_NODE_PAGE_SIZE: () => MAX_A11Y_NODE_PAGE_SIZE,
  MAX_GRAPH_EDGE_LANE_OFFSET: () => MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME: () => MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS: () => MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES: () => MAX_GRAPH_PARALLEL_EDGES,
  MAX_GRAPH_QUERY_LENGTH: () => MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES: () => MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES: () => MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES: () => MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES: () => MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1: () => import_knowledgeGraphPresentation8.PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1: () => import_knowledgeGraphPresentation8.PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  advanceGraphLayoutClock: () => advanceGraphLayoutClock,
  advanceGraphLayoutClockInto: () => advanceGraphLayoutClockInto,
  assertKnowledgeGraphIdentity: () => assertKnowledgeGraphIdentity,
  assertKnowledgeGraphLiveForceBudget: () => assertKnowledgeGraphLiveForceBudget,
  assertKnowledgeGraphPresentationBudget: () => assertKnowledgeGraphPresentationBudget,
  assertPreparedGenericKnowledgeGraphPresentation: () => import_knowledgeGraphPresentation8.assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphPresentation: () => import_knowledgeGraphPresentation8.assertPreparedKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView: () => import_knowledgeGraphPresentation8.assertPreparedKnowledgeGraphView,
  assertRenderableGraphEdges: () => assertRenderableGraphEdges,
  assertUniqueGraphNodeIds: () => assertUniqueGraphNodeIds,
  assignGraphEdgeLanes: () => assignGraphEdgeLanes,
  buildAdjacency: () => buildAdjacency,
  corpusGraphInstanceIdentity: () => corpusGraphInstanceIdentity,
  corpusGraphRadiusMeaning: () => corpusGraphRadiusMeaning,
  defaultEdgeStyles: () => defaultEdgeStyles,
  defaultNodeColors: () => defaultNodeColors,
  filterGraphEdges: () => filterGraphEdges,
  flowParticleCount: () => flowParticleCount,
  graphCameraTargetDamping: () => graphCameraTargetDamping,
  graphEdgeControlPointInto: () => graphEdgeControlPointInto,
  graphEdgeCurvePointInto: () => graphEdgeCurvePointInto,
  graphEdgeMatchesQuery: () => graphEdgeMatchesQuery,
  graphEdgeTargetBoundaryInto: () => graphEdgeTargetBoundaryInto,
  graphQueryMatchIds: () => graphQueryMatchIds,
  graphSignature: () => graphSignature,
  isKnowledgeGraphLiveForceWithinBudget: () => isKnowledgeGraphLiveForceWithinBudget,
  isPreparedKnowledgeGraphPresentation: () => import_knowledgeGraphPresentation8.isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView: () => import_knowledgeGraphPresentation8.isPreparedKnowledgeGraphView,
  knowledgeGraphLiveForceAvailability: () => knowledgeGraphLiveForceAvailability,
  knowledgeGraphPresentationContainsNode: () => import_knowledgeGraphPresentation8.knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode: () => import_knowledgeGraphPresentation8.knowledgeGraphViewContainsNode,
  matchesGraphQuery: () => matchesGraphQuery,
  normalizeGraphNodeRadius: () => normalizeGraphNodeRadius,
  normalizeGraphQuery: () => normalizeGraphQuery,
  parseKnowledgeGraphPresentationJson: () => import_knowledgeGraphPresentation8.parseKnowledgeGraphPresentationJson,
  prepareCorpusKnowledgeGraphFigure: () => prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson: () => prepareCorpusKnowledgeGraphFigureJson,
  prepareKnowledgeGraphPresentation: () => import_knowledgeGraphPresentation8.prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView: () => import_knowledgeGraphPresentation8.prepareKnowledgeGraphView,
  reducedMotionLayoutTickBudget: () => reducedMotionLayoutTickBudget,
  serializePreparedKnowledgeGraphPresentation: () => import_knowledgeGraphPresentation8.serializePreparedKnowledgeGraphPresentation,
  uniqueGraphTopologyLinks: () => uniqueGraphTopologyLinks
});
module.exports = __toCommonJS(knowledgeGraphPublic_exports);

// react/KnowledgeGraph3DScene.tsx
var import_react4 = require("react");
var import_fiber = require("@react-three/fiber");
var THREE2 = __toESM(require("three"), 1);
var import_d3_force_3d = require("d3-force-3d");

// core/skills/knowledgeGraphLimits.ts
var KNOWLEDGE_GRAPH_LIMITS = Object.freeze({
  /** Accepted presentation/inspection limits. These match the legacy params gate. */
  maxPresentationNodes: 1e3,
  maxPresentationEdges: 4e3,
  /**
   * Main-thread d3-force refinement limits. Above either bound the canonical
   * composition retains the caption and complete DOM records but does not mount
   * the live 3D solver. These are resource ceilings, not portable FPS claims.
   */
  maxLiveForceNodes: 250,
  maxLiveForceEdges: 1e3,
  /**
   * Aggregate presentation limits apply across every retained occurrence. Aliased
   * containers receive no amortization: each occurrence is inspected and copied.
   */
  maxPresentationRetainedOccurrences: 25e4,
  maxPresentationStringCodeUnits: 4e6,
  maxPresentationInspectionWork: 1e6,
  /** A view can explicitly name every kind present in its bounded source. */
  maxViewNodeKinds: 1e3,
  maxViewEdgeKinds: 4e3,
  /** Equivalent hot-path policies reuse one token without unbounded cache growth. */
  maxCachedViewsPerPresentation: 128,
  /** Strong raw-JSON boundary, before a presentation object is materialized. */
  maxPresentationRawInputBytes: 16e6,
  maxPresentationJsonDepth: 8,
  maxPresentationJsonNodes: 3e5,
  maxPresentationJsonNumberTokenLength: 100,
  maxNodeIdLength: 120,
  maxNodeLabelLength: 240,
  maxEdgeIdLength: 320,
  maxEdgeLabelLength: 160,
  maxKindLength: 80,
  maxColorLength: 64,
  maxRadiusMeaningLength: 400,
  maxAttributes: 24,
  maxAttributeKeyLength: 80,
  maxAttributeArrayItems: 16,
  maxEvidenceRefsPerElement: 8,
  maxEvidenceIdLength: 384,
  maxRecordIdLength: 320,
  maxLocatorLength: 240,
  maxPaperIdLength: 160,
  maxCitationIdLength: 160,
  maxSourceIdLength: 240,
  maxDoiLength: 240,
  maxParallelEdgesPerPair: 9,
  maxDetailLength: 1e3,
  maxAttributeStringLength: 500,
  maxExcerptLength: 1e3
});
var KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS = Object.freeze({
  rawInputBytes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationRawInputBytes,
  jsonDepth: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonDepth,
  jsonTotalNodes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonNodes,
  jsonStringLength: Math.max(
    1024,
    KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength,
    KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength
  ),
  jsonNumberTokenLength: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonNumberTokenLength,
  jsonObjectKeys: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
  jsonArrayItems: KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges
});

// core/skills/params.ts
var import_zod = require("zod");

// core/safeRuntime.ts
function safeErrorMessage(error) {
  try {
    if (typeof error === "string") {
      return safeDiagnosticText(error, 240);
    }
    if (error !== null && (typeof error === "object" || typeof error === "function")) {
      const message = Object.getOwnPropertyDescriptor(error, "message");
      if (message && "value" in message && typeof message.value === "string") {
        return safeDiagnosticText(message.value, 240);
      }
    }
  } catch {
  }
  return "unknown error";
}
var PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
  maxIssues: 32,
  maxPathLength: 240,
  maxMessageLength: 500,
  maxTotalLength: 8192,
  maxUnknownKeySamples: 8
});
var SAFE_DISPLAY_STRING_PATTERN = /^[^\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]*$/u;
var TYPED_ARRAY_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  "length"
)?.get;
function clipText(value, max) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}\u2026`;
}
function safeDiagnosticText(value, max) {
  const boundedSource = clipText(value, max);
  const escaped = boundedSource.replace(
    /[\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
  return clipText(escaped, max);
}
function safePrimitiveDiagnostic(value, max = 120) {
  let text;
  switch (typeof value) {
    case "string":
      text = value;
      break;
    case "number":
      text = Object.is(value, -0) ? "-0" : `${value}`;
      break;
    case "bigint":
      text = `${value}`;
      break;
    case "boolean":
      text = value ? "true" : "false";
      break;
    case "undefined":
      text = "undefined";
      break;
    case "symbol":
      text = "<symbol>";
      break;
    case "function":
      text = "<function>";
      break;
    case "object":
      text = value === null ? "null" : "<object>";
      break;
    default:
      text = "<unknown>";
  }
  return safeDiagnosticText(text, max);
}
function printablePathSegment(value) {
  return safePrimitiveDiagnostic(value, 80);
}
function boundValidationIssue(issue) {
  const path = clipText(
    issue.path?.map(printablePathSegment).join(".") || "(root)",
    PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength
  );
  let message;
  if (issue.code === "unrecognized_keys" && Array.isArray(issue.keys)) {
    const samples = issue.keys.slice(0, PUBLIC_DIAGNOSTIC_LIMITS.maxUnknownKeySamples).map((key) => JSON.stringify(safePrimitiveDiagnostic(key, 60)));
    const omitted = issue.keys.length - samples.length;
    message = `unrecognized keys (${issue.keys.length}): ${samples.join(", ")}` + (omitted > 0 ? `; ${omitted} more omitted` : "");
  } else {
    message = typeof issue.message === "string" ? issue.message : "validation failed";
  }
  return {
    path,
    message: safeDiagnosticText(message, PUBLIC_DIAGNOSTIC_LIMITS.maxMessageLength)
  };
}
function formatValidationIssues(issues) {
  const output = [];
  let total = 0;
  const count = Math.min(issues.length, PUBLIC_DIAGNOSTIC_LIMITS.maxIssues);
  for (let index = 0; index < count; index++) {
    const bounded = boundValidationIssue(issues[index]);
    const line = `${bounded.path}: ${bounded.message}`;
    if (total + line.length > PUBLIC_DIAGNOSTIC_LIMITS.maxTotalLength) {
      output.push("(root): additional validation detail omitted by the diagnostic budget");
      return output;
    }
    output.push(line);
    total += line.length;
  }
  if (issues.length > count) {
    output.push(`(root): ${issues.length - count} additional validation issues omitted`);
  }
  return output;
}
function readOwnEnumerableDataProperty(input, key) {
  if (input === null || typeof input !== "object") return { kind: "absent" };
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor) return { kind: "absent" };
  return "value" in descriptor && descriptor.enumerable ? { kind: "value", value: descriptor.value } : { kind: "invalid" };
}

// core/skills/params.ts
var PARAM_LIMITS = Object.freeze({
  // Inline JSON is defensively cloned and schema-validated more than once at
  // the trust boundary. Larger recordings must be decimated/aggregated or
  // referenced out-of-band instead of freezing a browser render.
  maxSamples: 5e4,
  maxSeries: 256,
  maxTopologyNodes: 25e3,
  maxTopologyEdges: 2e4,
  maxSpatialObjects: 5e4,
  maxGraphNodes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationNodes,
  maxGraphEdges: KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges
});
var FLOAT32_MAX = 34028234663852886e22;
var timeArray = import_zod.z.array(import_zod.z.number()).max(PARAM_LIMITS.maxSamples);
var gpuNumber = import_zod.z.number().min(-FLOAT32_MAX, "value exceeds the finite Float32 range used by render buffers").max(FLOAT32_MAX, "value exceeds the finite Float32 range used by render buffers");
var gpuArray = import_zod.z.array(gpuNumber).max(PARAM_LIMITS.maxSamples);
var idArray = import_zod.z.array(
  import_zod.z.number().int("node/sender ids must be integers").nonnegative("node/sender ids must be non-negative").max(Number.MAX_SAFE_INTEGER, "node/sender ids must be safe integers")
).max(PARAM_LIMITS.maxSamples);
var displayText = (max) => import_zod.z.string().trim().min(1).max(max).regex(SAFE_DISPLAY_STRING_PATTERN, "display text must not contain control or bidi characters").meta({ "x-cortexel-normalize": "trim" });
var Rfc3339TimestampSchema = import_zod.z.iso.datetime({ offset: true }).max(80).regex(
  /T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  "timestamp must be RFC 3339 with seconds and an explicit UTC/numeric offset"
);
var units = displayText(80);
var normalizedRecordKey = import_zod.z.string().min(1).max(80).regex(
  /^\S(?:[\s\S]*\S)?$/,
  "record keys must already be trimmed and contain a non-whitespace character"
).regex(SAFE_DISPLAY_STRING_PATTERN, "record keys must not contain control or bidi characters");
function equalLengthIssue(ctx, path, expectedName, expected, actual) {
  if (actual !== expected) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: [path],
      message: `${path} length (${actual}) must match ${expectedName} length (${expected})`
    });
  }
}
function requireMonotonic(values, ctx, path) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: [path, i],
        message: `${path} must be monotonically non-decreasing`
      });
      return;
    }
  }
}
function requireStrictlyIncreasing(values, ctx, path) {
  for (let i = 1; i < values.length; i++) {
    if (!(values[i] > values[i - 1])) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: [path, i],
        message: `${path} must be strictly increasing`
      });
      return;
    }
  }
}
var VoltageTraceParamsSchema = import_zod.z.object({
  // At least two samples are required because the strict provenance contract
  // promises to cross-check the declared device sampling interval.
  times_ms: timeArray.min(2),
  series: import_zod.z.array(gpuArray.min(1)).min(1).max(PARAM_LIMITS.maxSeries),
  series_labels: import_zod.z.array(displayText(120)).min(1).max(PARAM_LIMITS.maxSeries),
  /** One shared unit for every series. Heterogeneous recorded variables must
   *  be authored as separate specs rather than sharing a misleading axis. */
  units
}).strict().superRefine((value, ctx) => {
  requireStrictlyIncreasing(value.times_ms, ctx, "times_ms");
  value.series.forEach((series, index) => {
    equalLengthIssue(
      ctx,
      `series.${index}`,
      "times_ms",
      value.times_ms.length,
      series.length
    );
  });
  equalLengthIssue(
    ctx,
    "series_labels",
    "series",
    value.series.length,
    value.series_labels.length
  );
});
var SpikeRasterParamsSchema = import_zod.z.object({
  times_ms: timeArray.min(1),
  senders: idArray.min(1)
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "senders",
    "times_ms",
    value.times_ms.length,
    value.senders.length
  );
});
var HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE = 0;
var HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE = 1e-9;
var HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS = 4;
var GEOMETRY_MAX_ROUNDOFF_FRACTION = 1e-7;
var HISTOGRAM_MASS_TOLERANCE = 1e-6;
var PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE = 1e-6;
var POPULATION_RATE_ABSOLUTE_TOLERANCE = 1e-9;
var POPULATION_RATE_RELATIVE_TOLERANCE = 1e-9;
function approximatelyEqual(actual, expected, absoluteTolerance, relativeTolerance) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return Math.abs(actual - expected) <= absoluteTolerance + relativeTolerance * Math.max(Math.abs(actual), Math.abs(expected));
}
function requireUniformHistogramBins(centers, width, ctx, centerPath, nonNegativeLowerEdge = false) {
  if (!Number.isFinite(width) || width <= 0) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: [centerPath],
      message: "histogram bin width must be a positive finite number"
    });
    return;
  }
  const halfWidth = width / 2;
  if (!Number.isFinite(halfWidth) || !(halfWidth > 0)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: [centerPath],
      message: "histogram bin half-width must remain positive and finite in binary64"
    });
    return;
  }
  let previousRight;
  for (let index = 0; index < centers.length; index++) {
    const center = centers[index];
    const left = center - halfWidth;
    const right = center + halfWidth;
    const representedWidth = right - left;
    if (!Number.isFinite(left) || !Number.isFinite(right) || !(left < center) || !(center < right) || !approximatelyEqual(
      representedWidth,
      width,
      HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: [centerPath, index],
        message: "histogram bin edges must remain finite, strictly straddle their center, and retain the declared width in binary64"
      });
      return;
    }
    if (previousRight !== void 0) {
      const difference = Math.abs(left - previousRight);
      if (difference !== 0) {
        const previousCenter = centers[index - 1];
        const arithmeticTolerance = HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS * Number.EPSILON * Math.max(
          Math.abs(previousCenter),
          Math.abs(center),
          Math.abs(previousRight),
          Math.abs(left),
          Math.abs(halfWidth)
        );
        if (arithmeticTolerance > GEOMETRY_MAX_ROUNDOFF_FRACTION * Math.abs(width) || difference > HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE + HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.abs(width) + arithmeticTolerance) {
          ctx.addIssue({
            code: import_zod.z.ZodIssueCode.custom,
            path: [centerPath, index],
            message: "adjacent histogram bin edges must meet within the published bounded binary64 tolerance"
          });
          return;
        }
      }
    }
    previousRight = right;
  }
  if (nonNegativeLowerEdge && centers.length > 0) {
    const lowerEdge = centers[0] - halfWidth;
    const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE + HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.max(Math.abs(centers[0]), Math.abs(halfWidth));
    if (!Number.isFinite(lowerEdge) || lowerEdge < -tolerance) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: [centerPath, 0],
        message: "the first ISI bin lower edge cannot be negative"
      });
      return;
    }
  }
  for (let index = 1; index < centers.length; index++) {
    if (!(centers[index] > centers[index - 1])) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: [centerPath, index],
        message: "histogram bin centers must be strictly increasing"
      });
      return;
    }
    const delta = centers[index] - centers[index - 1];
    if (!approximatelyEqual(
      delta,
      width,
      HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: [centerPath, index],
        message: "adjacent histogram bin centers must differ by the declared bin width"
      });
      return;
    }
  }
}
function requireNormalizedHistogramMass(normalization, values, width, rules, ctx) {
  const rule = rules[normalization];
  if (!rule) return;
  let mass = 0;
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) return;
    mass += value;
  }
  if (rule.measure === "density_integral") mass *= width;
  if (!approximatelyEqual(
    mass,
    rule.target,
    HISTOGRAM_MASS_TOLERANCE,
    HISTOGRAM_MASS_TOLERANCE
  )) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["values"],
      message: rule.measure === "density_integral" ? "probability-density values times bin width must integrate to 1" : "probability values must sum to 1"
    });
  }
}
var isiValueUnits = {
  count: "count",
  probability: "probability",
  probability_density: "1/ms"
};
var IsiDistributionParamsSchema = import_zod.z.object({
  bin_centers_ms: timeArray.min(1),
  values: gpuArray.min(1),
  bin_width_ms: import_zod.z.number().positive().max(Number.MAX_VALUE),
  normalization: import_zod.z.enum(["count", "probability", "probability_density"]),
  value_units: import_zod.z.enum(["count", "probability", "1/ms"]),
  interval_scope: import_zod.z.enum(["per_sender", "single_train"])
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "values",
    "bin_centers_ms",
    value.bin_centers_ms.length,
    value.values.length
  );
  requireMonotonic(value.bin_centers_ms, ctx, "bin_centers_ms");
  requireUniformHistogramBins(
    value.bin_centers_ms,
    value.bin_width_ms,
    ctx,
    "bin_centers_ms",
    true
  );
  for (let index = 0; index < value.bin_centers_ms.length; index++) {
    if (value.bin_centers_ms[index] < 0) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["bin_centers_ms", index],
        message: "inter-spike interval bin centers cannot be negative"
      });
      break;
    }
  }
  if (value.value_units !== isiValueUnits[value.normalization]) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["value_units"],
      message: `value_units must be '${isiValueUnits[value.normalization]}' for ${value.normalization}`
    });
  }
  for (let index = 0; index < value.values.length; index++) {
    const sample = value.values[index];
    if (sample < 0 || value.normalization === "probability" && sample > 1 || value.normalization === "count" && !Number.isSafeInteger(sample)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values", index],
        message: value.normalization === "count" ? "histogram counts must be non-negative safe integers" : value.normalization === "probability" ? "probability values must lie in [0, 1]" : "histogram values cannot be negative"
      });
      break;
    }
  }
  requireNormalizedHistogramMass(
    value.normalization,
    value.values,
    value.bin_width_ms,
    {
      probability: { measure: "sum", target: 1 },
      probability_density: { measure: "density_integral", target: 1 }
    },
    ctx
  );
});
var psthValueUnits = {
  count: "count",
  count_per_trial: "count/trial",
  rate_hz: "Hz"
};
function requirePsthDerivedCounts(normalization, values, trialCount, binWidthMs, ctx) {
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    let rawCount;
    switch (normalization) {
      case "count":
        rawCount = value;
        break;
      case "count_per_trial":
        rawCount = value * trialCount;
        break;
      case "rate_hz":
        rawCount = value * trialCount;
        rawCount *= binWidthMs;
        rawCount /= 1e3;
        break;
    }
    const rounded = Math.round(rawCount);
    const exactCount = normalization === "count";
    if (!Number.isFinite(rawCount) || rawCount < 0 || !Number.isSafeInteger(rounded) || (exactCount ? !Number.isSafeInteger(rawCount) : Math.abs(rawCount - rounded) > PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values", index],
        message: exactCount ? "aggregate PSTH counts must be non-negative safe integers" : "normalized PSTH values must recover a non-negative safe-integer aggregate spike count"
      });
      return;
    }
  }
}
var PsthParamsSchema = import_zod.z.object({
  bin_centers_ms: timeArray.min(1),
  values: gpuArray.min(1),
  bin_width_ms: import_zod.z.number().positive().max(Number.MAX_VALUE),
  normalization: import_zod.z.enum(["count", "count_per_trial", "rate_hz"]),
  value_units: import_zod.z.enum(["count", "count/trial", "Hz"]),
  trial_count: import_zod.z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  alignment_event: displayText(240),
  aggregation: import_zod.z.literal("selected_senders_per_trial")
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "values",
    "bin_centers_ms",
    value.bin_centers_ms.length,
    value.values.length
  );
  requireMonotonic(value.bin_centers_ms, ctx, "bin_centers_ms");
  requireUniformHistogramBins(
    value.bin_centers_ms,
    value.bin_width_ms,
    ctx,
    "bin_centers_ms"
  );
  if (value.value_units !== psthValueUnits[value.normalization]) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["value_units"],
      message: `value_units must be '${psthValueUnits[value.normalization]}' for ${value.normalization}`
    });
  }
  for (let index = 0; index < value.values.length; index++) {
    const sample = value.values[index];
    if (sample < 0) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values", index],
        message: "histogram values cannot be negative"
      });
      break;
    }
  }
  requirePsthDerivedCounts(
    value.normalization,
    value.values,
    value.trial_count,
    value.bin_width_ms,
    ctx
  );
});
var PopulationRateSeriesSchema = import_zod.z.object({
  id: displayText(120),
  label: displayText(240),
  recorded_sender_count: import_zod.z.number().int("recorded_sender_count must be an integer").positive("recorded_sender_count must be positive").max(Number.MAX_SAFE_INTEGER, "recorded_sender_count must be a safe integer"),
  spike_counts: import_zod.z.array(
    import_zod.z.number().int("spike counts must be integers").nonnegative("spike counts cannot be negative").max(Number.MAX_SAFE_INTEGER, "spike counts must be safe integers")
  ).min(1).max(PARAM_LIMITS.maxSamples),
  rates_hz: gpuArray.min(1)
}).strict();
function requireUniformBinWindow(centers, width, start, stop, ctx, paths = {
  centers: "bin_centers_ms",
  start: "window_start_ms",
  stop: "window_stop_ms"
}) {
  if (!(stop > start)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: [paths.stop],
      message: `${paths.stop} must be greater than ${paths.start}`
    });
    return;
  }
  if (centers.length === 0 || !Number.isFinite(width) || width <= 0) return;
  const halfWidth = width / 2;
  const firstCenter = centers[0];
  const lastCenter = centers[centers.length - 1];
  const firstEdge = firstCenter - halfWidth;
  const lastEdge = lastCenter + halfWidth;
  const edgeMatches = (edge, expected, center) => {
    const difference = Math.abs(edge - expected);
    if (difference === 0) return true;
    const arithmeticTolerance = HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS * Number.EPSILON * Math.max(
      Math.abs(center),
      Math.abs(halfWidth),
      Math.abs(edge),
      Math.abs(expected)
    );
    if (arithmeticTolerance > GEOMETRY_MAX_ROUNDOFF_FRACTION * Math.abs(width)) {
      return false;
    }
    const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE + HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.abs(width) + arithmeticTolerance;
    return Number.isFinite(edge) && Number.isFinite(expected) && difference <= tolerance;
  };
  if (!edgeMatches(firstEdge, start, firstCenter)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: [paths.centers, 0],
      message: `the first left-closed bin edge must match ${paths.start} within the published bounded binary64 tolerance`
    });
  }
  if (!edgeMatches(lastEdge, stop, lastCenter)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: [paths.centers, centers.length - 1],
      message: `the final right-open bin edge must match ${paths.stop} within the published bounded binary64 tolerance`
    });
  }
}
function requirePopulationRateValues(series, binCount, binWidthMs, ctx) {
  const ids = /* @__PURE__ */ new Set();
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const item = series[seriesIndex];
    if (ids.has(item.id)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["series", seriesIndex, "id"],
        message: `duplicate population-rate series id '${item.id}'`
      });
    }
    ids.add(item.id);
    equalLengthIssue(
      ctx,
      `series.${seriesIndex}.spike_counts`,
      "bin_centers_ms",
      binCount,
      item.spike_counts.length
    );
    equalLengthIssue(
      ctx,
      `series.${seriesIndex}.rates_hz`,
      "bin_centers_ms",
      binCount,
      item.rates_hz.length
    );
    const sampleCount = Math.min(item.spike_counts.length, item.rates_hz.length);
    for (let binIndex = 0; binIndex < sampleCount; binIndex++) {
      const rate = item.rates_hz[binIndex];
      if (rate < 0) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["series", seriesIndex, "rates_hz", binIndex],
          message: "population rates cannot be negative"
        });
        continue;
      }
      let expected = item.spike_counts[binIndex] * 1e3;
      const denominator = item.recorded_sender_count * binWidthMs;
      expected /= denominator;
      if (!Number.isFinite(denominator) || !approximatelyEqual(
        rate,
        expected,
        POPULATION_RATE_ABSOLUTE_TOLERANCE,
        POPULATION_RATE_RELATIVE_TOLERANCE
      )) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["series", seriesIndex, "rates_hz", binIndex],
          message: "rate must equal spike_count \xD7 1000 / (recorded_sender_count \xD7 bin_width_ms)"
        });
      }
    }
  }
}
var PopulationRateParamsSchema = import_zod.z.object({
  bin_centers_ms: timeArray.min(1),
  bin_width_ms: import_zod.z.number().positive().max(Number.MAX_VALUE),
  window_start_ms: import_zod.z.number(),
  window_stop_ms: import_zod.z.number(),
  series: import_zod.z.array(PopulationRateSeriesSchema).min(1).max(PARAM_LIMITS.maxSeries),
  normalization: import_zod.z.literal("mean_per_recorded_sender_hz"),
  aggregation: import_zod.z.literal("selected_senders"),
  binning: import_zod.z.literal("left_closed_right_open")
}).strict().superRefine((value, ctx) => {
  requireUniformHistogramBins(
    value.bin_centers_ms,
    value.bin_width_ms,
    ctx,
    "bin_centers_ms"
  );
  requireUniformBinWindow(
    value.bin_centers_ms,
    value.bin_width_ms,
    value.window_start_ms,
    value.window_stop_ms,
    ctx
  );
  requirePopulationRateValues(
    value.series,
    value.bin_centers_ms.length,
    value.bin_width_ms,
    ctx
  );
});
var RateResponseParamsSchema = import_zod.z.object({
  stimulus_amplitudes: gpuArray.min(1),
  rates_hz: gpuArray.min(1),
  stimulus_units: units
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "rates_hz",
    "stimulus_amplitudes",
    value.stimulus_amplitudes.length,
    value.rates_hz.length
  );
  for (let index = 0; index < value.rates_hz.length; index++) {
    const rate = value.rates_hz[index];
    if (rate < 0) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["rates_hz", index],
        message: "firing rates cannot be negative"
      });
      break;
    }
  }
});
var NetworkParamsSchema = import_zod.z.object({
  sources: idArray.min(1),
  targets: idArray.min(1),
  weights: gpuArray.optional(),
  delays: gpuArray.optional(),
  weight_units: units.optional(),
  delay_units: units.optional()
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "targets",
    "sources",
    value.sources.length,
    value.targets.length
  );
  if (value.weights) {
    equalLengthIssue(
      ctx,
      "weights",
      "sources",
      value.sources.length,
      value.weights.length
    );
  }
  if (value.delays) {
    equalLengthIssue(
      ctx,
      "delays",
      "sources",
      value.sources.length,
      value.delays.length
    );
    const index = value.delays.findIndex((delay) => delay <= 0);
    if (index >= 0) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["delays", index],
        message: "connection delays must be strictly positive"
      });
    }
  }
  if (value.weights !== void 0 !== (value.weight_units !== void 0)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["weight_units"],
      message: "weight_units must be present exactly when weights are present"
    });
  }
  if (value.delays !== void 0 !== (value.delay_units !== void 0)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["delay_units"],
      message: "delay_units must be present exactly when delays are present"
    });
  }
});
var topologyCount = import_zod.z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0), "topology counts and ranks must not be negative zero");
var topologyPositiveCount = topologyCount.positive();
var MpiTargetRankLocalScopeSchema = import_zod.z.object({
  kind: import_zod.z.literal("mpi_target_rank_local"),
  rank: topologyCount,
  world_size: topologyPositiveCount
}).strict().superRefine((value, ctx) => {
  if (value.rank >= value.world_size) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["rank"],
      message: "MPI rank must be smaller than world_size"
    });
  }
});
var SnapshotScopeSchema = import_zod.z.discriminatedUnion("kind", [
  import_zod.z.object({ kind: import_zod.z.literal("single_process_complete") }).strict(),
  MpiTargetRankLocalScopeSchema,
  import_zod.z.object({
    kind: import_zod.z.literal("mpi_all_ranks_merged"),
    world_size: topologyPositiveCount
  }).strict()
]);
var MpiRankLocalPositionScopeSchema = import_zod.z.object({
  kind: import_zod.z.literal("mpi_rank_local"),
  rank: topologyCount,
  world_size: topologyPositiveCount
}).strict().superRefine((value, ctx) => {
  if (value.rank >= value.world_size) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["rank"],
      message: "MPI rank must be smaller than world_size"
    });
  }
});
var PositionScopeSchema = import_zod.z.discriminatedUnion("kind", [
  import_zod.z.object({ kind: import_zod.z.literal("single_process_complete") }).strict(),
  MpiRankLocalPositionScopeSchema,
  import_zod.z.object({
    kind: import_zod.z.literal("mpi_all_ranks_merged"),
    world_size: topologyPositiveCount
  }).strict()
]);
var ConnectionGraphNodeSchema = import_zod.z.object({
  id: idArray.element,
  label: displayText(120)
}).strict();
var ConnectionGraphEdgeSchema = import_zod.z.object({
  id: displayText(240),
  source: idArray.element,
  target: idArray.element,
  weight: gpuNumber.optional(),
  delay_ms: gpuNumber.positive().optional(),
  synapse_model: displayText(120).optional()
}).strict();
function canonicalEdgeIdInteger(value) {
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return void 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && String(parsed) === value ? parsed : void 0;
}
var ConnectionGraphParamsSchema = import_zod.z.object({
  nodes: import_zod.z.array(ConnectionGraphNodeSchema).min(1).max(PARAM_LIMITS.maxTopologyNodes),
  edges: import_zod.z.array(ConnectionGraphEdgeSchema).max(PARAM_LIMITS.maxTopologyEdges),
  weight_units: units.optional(),
  delay_units: import_zod.z.literal("ms").optional(),
  layout: import_zod.z.literal("schematic_circle"),
  parallel_edges: import_zod.z.literal("preserved"),
  self_connections: import_zod.z.literal("preserved"),
  snapshot_time_ms: import_zod.z.number().finite().nonnegative(),
  snapshot_scope: SnapshotScopeSchema,
  sample_policy: import_zod.z.enum(["complete", "deterministic_even_stride"]),
  source_connection_count: topologyCount,
  edge_identity: import_zod.z.enum(["nest_connection_identifier", "canonical_sorted_ordinal"])
}).strict().superRefine((value, ctx) => {
  const nodeIds = /* @__PURE__ */ new Set();
  for (let index = 0; index < value.nodes.length; index++) {
    const id2 = value.nodes[index].id;
    if (nodeIds.has(id2)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["nodes", index, "id"],
        message: "graph node ids must be unique"
      });
    }
    nodeIds.add(id2);
  }
  const edgeIds = /* @__PURE__ */ new Set();
  let weightCount = 0;
  let delayCount = 0;
  let modelCount = 0;
  for (let index = 0; index < value.edges.length; index++) {
    const edge = value.edges[index];
    if (edgeIds.has(edge.id)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index, "id"],
        message: "graph edge ids must be unique"
      });
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index, "source"],
        message: "graph edge source must reference a declared node"
      });
    }
    if (!nodeIds.has(edge.target)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index, "target"],
        message: "graph edge target must reference a declared node"
      });
    }
    if (edge.weight !== void 0) weightCount += 1;
    if (edge.delay_ms !== void 0) delayCount += 1;
    if (edge.synapse_model !== void 0) modelCount += 1;
    const idParts = edge.id.split(":");
    if (value.edge_identity === "canonical_sorted_ordinal") {
      const ordinal = idParts.length === 2 && idParts[0] === "connection" ? canonicalEdgeIdInteger(idParts[1]) : void 0;
      if (ordinal === void 0 || ordinal >= value.source_connection_count) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["edges", index, "id"],
          message: "canonical edge ids must be connection:<source ordinal> within source_connection_count"
        });
      }
    } else {
      const components = idParts.length === 6 && idParts[0] === "connection" ? idParts.slice(1).map(canonicalEdgeIdInteger) : [];
      if (components.length !== 5 || components.some((component) => component === void 0) || components[0] !== edge.source || components[1] !== edge.target) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["edges", index, "id"],
          message: "NEST edge ids must be connection:source:target:target_thread:synapse_id:port and match the edge endpoints"
        });
      }
    }
  }
  for (const [field, count] of [
    ["weight", weightCount],
    ["delay_ms", delayCount],
    ["synapse_model", modelCount]
  ]) {
    if (count !== 0 && count !== value.edges.length) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges"],
        message: `${field} must be present on every graph edge or none`
      });
    }
  }
  if (weightCount > 0 !== (value.weight_units !== void 0)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["weight_units"],
      message: "weight_units must be present exactly when every edge carries weight"
    });
  }
  if (delayCount > 0 !== (value.delay_units !== void 0)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["delay_units"],
      message: "delay_units must be present exactly when every edge carries delay_ms"
    });
  }
  if (value.sample_policy === "complete") {
    if (value.source_connection_count !== value.edges.length) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["source_connection_count"],
        message: "complete graph output must contain every source connection"
      });
    }
  } else if (value.edges.length === 0 || value.source_connection_count <= value.edges.length) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["source_connection_count"],
      message: "deterministic_even_stride requires a non-empty strict subset of source connections"
    });
  }
});
var MatrixCellBaseSchema = import_zod.z.object({
  source_id: idArray.element,
  target_id: idArray.element,
  connection_count: topologyPositiveCount
}).strict();
var AdjacencyMatrixCellSchema = MatrixCellBaseSchema;
var WeightMatrixCellSchema = MatrixCellBaseSchema.extend({ value: gpuNumber }).strict();
var DelayMatrixCellSchema = MatrixCellBaseSchema.extend({ value: gpuNumber.positive() }).strict();
var matrixBaseShape = {
  source_ids: idArray.min(1),
  target_ids: idArray.min(1),
  axis_order: import_zod.z.literal("target_rows_source_columns"),
  absent_cell: import_zod.z.literal("no_connection"),
  sample_policy: import_zod.z.literal("complete"),
  connection_count: topologyCount,
  snapshot_time_ms: import_zod.z.number().finite().nonnegative(),
  snapshot_scope: SnapshotScopeSchema
};
function refineSparseMatrix(value, ctx) {
  if (value.snapshot_scope.kind === "mpi_target_rank_local") {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["snapshot_scope", "kind"],
      message: "literal matrices require a complete single-process or all-ranks-merged snapshot"
    });
  }
  const sourceIds = new Set(value.source_ids);
  const targetIds = new Set(value.target_ids);
  if (sourceIds.size !== value.source_ids.length) {
    ctx.addIssue({ code: import_zod.z.ZodIssueCode.custom, path: ["source_ids"], message: "source_ids must be unique" });
  }
  if (targetIds.size !== value.target_ids.length) {
    ctx.addIssue({ code: import_zod.z.ZodIssueCode.custom, path: ["target_ids"], message: "target_ids must be unique" });
  }
  const pairs = /* @__PURE__ */ new Set();
  let total = 0;
  for (let index = 0; index < value.cells.length; index++) {
    const cell = value.cells[index];
    if (!sourceIds.has(cell.source_id)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["cells", index, "source_id"],
        message: "matrix cell source_id must occur in source_ids"
      });
    }
    if (!targetIds.has(cell.target_id)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["cells", index, "target_id"],
        message: "matrix cell target_id must occur in target_ids"
      });
    }
    const pair = `${cell.source_id}\0${cell.target_id}`;
    if (pairs.has(pair)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["cells", index],
        message: "matrix cells must contain at most one entry per source-target pair"
      });
    }
    pairs.add(pair);
    total += cell.connection_count;
    if (!Number.isSafeInteger(total)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["connection_count"],
        message: "matrix connection count sum exceeds the safe-integer range"
      });
      return;
    }
  }
  if (total !== value.connection_count) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["connection_count"],
      message: "connection_count must equal the sum of sparse cell connection_count values"
    });
  }
}
var AdjacencyMatrixParamsSchema = import_zod.z.object({
  ...matrixBaseShape,
  cells: import_zod.z.array(AdjacencyMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
  display: import_zod.z.literal("binary_presence"),
  aggregation: import_zod.z.literal("any_connection")
}).strict().superRefine(refineSparseMatrix);
var WeightMatrixParamsSchema = import_zod.z.object({
  ...matrixBaseShape,
  cells: import_zod.z.array(WeightMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
  weight_units: units,
  aggregation: import_zod.z.enum(["sum", "mean", "minimum", "maximum", "single_connection"])
}).strict().superRefine((value, ctx) => {
  refineSparseMatrix(value, ctx);
  if (value.aggregation === "single_connection") {
    const index = value.cells.findIndex((cell) => cell.connection_count !== 1);
    if (index >= 0) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["cells", index, "connection_count"],
        message: "single_connection aggregation requires exactly one connection per cell"
      });
    }
  }
});
var DelayMatrixParamsSchema = import_zod.z.object({
  ...matrixBaseShape,
  cells: import_zod.z.array(DelayMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
  delay_units: import_zod.z.literal("ms"),
  aggregation: import_zod.z.enum(["mean", "minimum", "maximum", "single_connection"])
}).strict().superRefine((value, ctx) => {
  refineSparseMatrix(value, ctx);
  if (value.aggregation === "single_connection") {
    const index = value.cells.findIndex((cell) => cell.connection_count !== 1);
    if (index >= 0) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["cells", index, "connection_count"],
        message: "single_connection aggregation requires exactly one connection per cell"
      });
    }
  }
});
var DEGREE_VALUE_ABSOLUTE_TOLERANCE = 1e-12;
var DEGREE_VALUE_RELATIVE_TOLERANCE = 1e-12;
function degreeDistributionSchema(direction) {
  return import_zod.z.object({
    degrees: import_zod.z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
    node_counts: import_zod.z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
    values: gpuArray.min(1),
    node_count: topologyPositiveCount,
    connection_count: topologyCount,
    direction: import_zod.z.literal(direction),
    normalization: import_zod.z.enum(["count", "probability"]),
    value_units: import_zod.z.enum(["count", "probability"]),
    edge_counting: import_zod.z.literal("each_synapse_collection_entry"),
    zero_degree_policy: import_zod.z.literal("include_declared_universe"),
    sample_policy: import_zod.z.literal("complete"),
    snapshot_time_ms: import_zod.z.number().finite().nonnegative(),
    snapshot_scope: SnapshotScopeSchema
  }).strict().superRefine((value, ctx) => {
    equalLengthIssue(ctx, "node_counts", "degrees", value.degrees.length, value.node_counts.length);
    equalLengthIssue(ctx, "values", "degrees", value.degrees.length, value.values.length);
    for (let index = 0; index < value.degrees.length; index++) {
      if (value.degrees[index] !== index) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["degrees", index],
          message: "degrees must be the contiguous integer range beginning at zero"
        });
        break;
      }
    }
    let countedNodes = 0;
    let countedConnections = 0;
    for (let index = 0; index < value.node_counts.length; index++) {
      countedNodes += value.node_counts[index];
      countedConnections += index * value.node_counts[index];
    }
    if (!Number.isSafeInteger(countedNodes) || countedNodes !== value.node_count) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["node_count"],
        message: "node_count must equal the sum of node_counts"
      });
    }
    if (!Number.isSafeInteger(countedConnections) || countedConnections !== value.connection_count) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["connection_count"],
        message: "connection_count must equal the degree-weighted sum of node_counts"
      });
    }
    const expectedUnits = value.normalization === "count" ? "count" : "probability";
    if (value.value_units !== expectedUnits) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["value_units"],
        message: `value_units must be '${expectedUnits}' for ${value.normalization}`
      });
    }
    let displayedMass = 0;
    for (let index = 0; index < Math.min(value.values.length, value.node_counts.length); index++) {
      const displayed = value.values[index];
      if (displayed < 0) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["values", index],
          message: "displayed degree values cannot be negative"
        });
        break;
      }
      const expected = value.normalization === "count" ? value.node_counts[index] : value.node_counts[index] / value.node_count;
      const matches = value.normalization === "count" ? Number.isSafeInteger(displayed) && displayed === expected : approximatelyEqual(
        displayed,
        expected,
        DEGREE_VALUE_ABSOLUTE_TOLERANCE,
        DEGREE_VALUE_RELATIVE_TOLERANCE
      );
      if (!matches) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["values", index],
          message: "displayed degree value must be derived from node_counts and node_count"
        });
        break;
      }
      displayedMass += displayed;
    }
    if (value.normalization === "probability" && !approximatelyEqual(
      displayedMass,
      1,
      DEGREE_VALUE_ABSOLUTE_TOLERANCE,
      DEGREE_VALUE_RELATIVE_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values"],
        message: "displayed degree probabilities must sum to one"
      });
    }
    if (value.snapshot_scope.kind === "mpi_target_rank_local") {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["snapshot_scope", "kind"],
        message: `${direction}-degree requires a complete single-process or all-ranks-merged snapshot`
      });
    }
  });
}
var InDegreeDistributionParamsSchema = degreeDistributionSchema("in");
var OutDegreeDistributionParamsSchema = degreeDistributionSchema("out");
var delayDistributionValueUnits = {
  count: "count",
  probability: "probability",
  probability_density: "1/ms"
};
var DelayDistributionParamsSchema = import_zod.z.object({
  bin_centers_ms: timeArray.min(1),
  delay_counts: import_zod.z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
  values: gpuArray.min(1),
  bin_width_ms: import_zod.z.number().finite().positive(),
  window_start_ms: import_zod.z.number().finite().nonnegative(),
  window_stop_ms: import_zod.z.number().finite().positive(),
  normalization: import_zod.z.enum(["count", "probability", "probability_density"]),
  value_units: import_zod.z.enum(["count", "probability", "1/ms"]),
  delay_units: import_zod.z.literal("ms"),
  aggregation: import_zod.z.literal("each_connection"),
  binning: import_zod.z.literal("left_closed_right_open"),
  sample_policy: import_zod.z.literal("complete"),
  connection_count: topologyCount,
  snapshot_time_ms: import_zod.z.number().finite().nonnegative(),
  snapshot_scope: SnapshotScopeSchema
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(ctx, "delay_counts", "bin_centers_ms", value.bin_centers_ms.length, value.delay_counts.length);
  equalLengthIssue(ctx, "values", "bin_centers_ms", value.bin_centers_ms.length, value.values.length);
  requireUniformHistogramBins(value.bin_centers_ms, value.bin_width_ms, ctx, "bin_centers_ms", true);
  requireUniformBinWindow(
    value.bin_centers_ms,
    value.bin_width_ms,
    value.window_start_ms,
    value.window_stop_ms,
    ctx
  );
  const expectedUnits = delayDistributionValueUnits[value.normalization];
  if (value.value_units !== expectedUnits) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["value_units"],
      message: `value_units must be '${expectedUnits}' for ${value.normalization}`
    });
  }
  let total = 0;
  for (const count of value.delay_counts) total += count;
  if (!Number.isSafeInteger(total) || total !== value.connection_count) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["connection_count"],
      message: "connection_count must equal the sum of delay_counts"
    });
  }
  if (value.connection_count === 0 && value.normalization !== "count") {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["normalization"],
      message: "an empty delay snapshot cannot be probability-normalized"
    });
  }
  const densityDenominator = value.connection_count * value.bin_width_ms;
  if (value.normalization === "probability_density" && (!Number.isFinite(densityDenominator) || densityDenominator <= 0)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["bin_width_ms"],
      message: "connection_count \xD7 bin_width_ms must be finite for probability density"
    });
  }
  let displayedMass = 0;
  for (let index = 0; index < Math.min(value.values.length, value.delay_counts.length); index++) {
    const count = value.delay_counts[index];
    const displayed = value.values[index];
    if (displayed < 0) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values", index],
        message: "displayed delay values cannot be negative"
      });
      break;
    }
    const expected = value.normalization === "count" ? count : value.normalization === "probability" ? count / value.connection_count : count / densityDenominator;
    const matches = value.normalization === "count" ? Number.isSafeInteger(displayed) && displayed === expected : Object.is(displayed, expected);
    if (!matches) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values", index],
        message: "displayed delay value must be recoverable from delay_counts"
      });
      break;
    }
    displayedMass += displayed;
  }
  if (value.normalization !== "count") {
    const normalizedMass = value.normalization === "probability_density" ? displayedMass * value.bin_width_ms : displayedMass;
    if (!approximatelyEqual(
      normalizedMass,
      1,
      HISTOGRAM_MASS_TOLERANCE,
      HISTOGRAM_MASS_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values"],
        message: value.normalization === "probability_density" ? "displayed delay density must integrate to one" : "displayed delay probabilities must sum to one"
      });
    }
  }
});
var SpatialMap2DNodeSchema = import_zod.z.object({
  id: idArray.element,
  label: displayText(120),
  x: gpuNumber,
  y: gpuNumber
}).strict();
var SPATIAL_BOUNDS_ROUNDOFF_ULPS = 2;
function spatialBoundsTolerance(center, halfExtent, minimum, maximum) {
  const extentTolerance = HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.abs(halfExtent);
  const arithmeticTolerance = SPATIAL_BOUNDS_ROUNDOFF_ULPS * Number.EPSILON * Math.max(
    Math.abs(center),
    Math.abs(halfExtent),
    Math.abs(minimum),
    Math.abs(maximum)
  );
  const boundedArithmeticTolerance = arithmeticTolerance <= GEOMETRY_MAX_ROUNDOFF_FRACTION * Math.abs(halfExtent) ? arithmeticTolerance : 0;
  return extentTolerance + boundedArithmeticTolerance;
}
var SpatialMap2DParamsSchema = import_zod.z.object({
  nodes: import_zod.z.array(SpatialMap2DNodeSchema).min(1).max(PARAM_LIMITS.maxSpatialObjects),
  coordinate_units: units,
  extent: import_zod.z.tuple([gpuNumber.positive(), gpuNumber.positive()]),
  center: import_zod.z.tuple([gpuNumber, gpuNumber]),
  edge_wrap: import_zod.z.boolean(),
  position_scope: PositionScopeSchema,
  marker_size: import_zod.z.literal("fixed_screen_space")
}).strict().superRefine((value, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  const halfWidth = value.extent[0] / 2;
  const halfHeight = value.extent[1] / 2;
  const minX = value.center[0] - halfWidth;
  const maxX = value.center[0] + halfWidth;
  const minY = value.center[1] - halfHeight;
  const maxY = value.center[1] + halfHeight;
  if (!(minX < maxX)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["extent", 0],
      message: "x extent must remain representable at the declared center"
    });
  }
  if (!(minY < maxY)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["extent", 1],
      message: "y extent must remain representable at the declared center"
    });
  }
  const xTolerance = spatialBoundsTolerance(value.center[0], halfWidth, minX, maxX);
  const yTolerance = spatialBoundsTolerance(value.center[1], halfHeight, minY, maxY);
  for (let index = 0; index < value.nodes.length; index++) {
    const node = value.nodes[index];
    if (ids.has(node.id)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["nodes", index, "id"],
        message: "spatial node ids must be unique"
      });
    }
    ids.add(node.id);
    if (node.x < minX - xTolerance || node.x > maxX + xTolerance || node.y < minY - yTolerance || node.y > maxY + yTolerance) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["nodes", index],
        message: "spatial node coordinates must lie inside center \xB1 extent/2"
      });
    }
  }
});
var weightHistogramValueUnits = {
  count: "count",
  probability: "probability"
};
var WeightHistogramParamsSchema = import_zod.z.object({
  bin_centers: gpuArray.min(1),
  weight_counts: import_zod.z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
  values: gpuArray.min(1),
  bin_width: gpuNumber.positive(),
  window_start: import_zod.z.number().finite(),
  window_stop: import_zod.z.number().finite(),
  weight_units: units,
  normalization: import_zod.z.enum(["count", "probability"]),
  value_units: import_zod.z.enum(["count", "probability"]),
  aggregation: import_zod.z.literal("each_connection"),
  binning: import_zod.z.literal("left_closed_right_open"),
  sample_policy: import_zod.z.literal("complete"),
  connection_count: topologyCount,
  snapshot_time_ms: import_zod.z.number().finite().nonnegative(),
  snapshot_scope: SnapshotScopeSchema
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "values",
    "bin_centers",
    value.bin_centers.length,
    value.values.length
  );
  equalLengthIssue(
    ctx,
    "weight_counts",
    "bin_centers",
    value.bin_centers.length,
    value.weight_counts.length
  );
  requireUniformHistogramBins(
    value.bin_centers,
    value.bin_width,
    ctx,
    "bin_centers"
  );
  requireUniformBinWindow(
    value.bin_centers,
    value.bin_width,
    value.window_start,
    value.window_stop,
    ctx,
    {
      centers: "bin_centers",
      start: "window_start",
      stop: "window_stop"
    }
  );
  if (value.value_units !== weightHistogramValueUnits[value.normalization]) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["value_units"],
      message: `value_units must be '${weightHistogramValueUnits[value.normalization]}' for ${value.normalization}`
    });
  }
  let total = 0;
  for (const count of value.weight_counts) {
    total += count;
    if (!Number.isSafeInteger(total)) break;
  }
  if (!Number.isSafeInteger(total) || total !== value.connection_count) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["connection_count"],
      message: "connection_count must equal the sum of weight_counts"
    });
  }
  if (value.connection_count === 0 && value.normalization !== "count") {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["normalization"],
      message: "an empty weight snapshot cannot be probability-normalized"
    });
  }
  for (let index = 0; index < Math.min(value.values.length, value.weight_counts.length); index++) {
    const sample = value.values[index];
    const expected = value.normalization === "count" ? value.weight_counts[index] : value.weight_counts[index] / value.connection_count;
    const matches = value.normalization === "count" ? Number.isSafeInteger(sample) && sample === expected : Object.is(sample, expected);
    if (!matches) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values", index],
        message: "displayed weight value must be exactly recoverable from weight_counts and connection_count"
      });
      break;
    }
  }
});
var Spatial3DObjectSchema = import_zod.z.object({
  x: gpuNumber,
  y: gpuNumber,
  z: gpuNumber
}).passthrough();
var Spatial3DParamsSchema = import_zod.z.object({
  objects: import_zod.z.array(Spatial3DObjectSchema).min(1).max(PARAM_LIMITS.maxSpatialObjects),
  coordinate_units: units
}).strict();
var PlasticityParamsSchema = import_zod.z.object({
  times_ms: timeArray.min(1),
  weights: gpuArray.min(1),
  weight_units: units
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "weights",
    "times_ms",
    value.times_ms.length,
    value.weights.length
  );
  requireMonotonic(value.times_ms, ctx, "times_ms");
});
var PhasePlaneDerivativeTimeUnitSchema = import_zod.z.enum(["ms", "s"]);
var PhasePlaneParamsSchema = import_zod.z.object({
  grid: import_zod.z.record(normalizedRecordKey, gpuArray.min(2)).refine((g) => Object.keys(g).length === 2, {
    message: "phase-plane grid must declare exactly two state-variable axes with at least two coordinates each"
  }),
  derivatives: import_zod.z.record(normalizedRecordKey, gpuArray.min(1)),
  axis_units: import_zod.z.record(normalizedRecordKey, units),
  derivative_units: import_zod.z.record(normalizedRecordKey, units),
  derivative_time_unit: PhasePlaneDerivativeTimeUnitSchema,
  axis_order: import_zod.z.tuple([normalizedRecordKey, normalizedRecordKey]).refine(([first, second]) => first !== second, {
    message: "axis_order must name two distinct state variables"
  }),
  flattening: import_zod.z.literal("row-major-last-axis-fastest")
}).strict().superRefine((value, ctx) => {
  const axes = Object.keys(value.grid);
  const derivativeNames = Object.keys(value.derivatives);
  for (const axis of axes) {
    requireStrictlyIncreasing(value.grid[axis], ctx, `grid.${axis}`);
  }
  if (value.axis_order.some((axis) => !Object.hasOwn(value.grid, axis)) || axes.some((axis) => !value.axis_order.includes(axis))) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["axis_order"],
      message: "axis_order must be a permutation of the two grid state variables"
    });
  }
  if (derivativeNames.length !== axes.length || axes.some((axis) => !Object.hasOwn(value.derivatives, axis))) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["derivatives"],
      message: "derivatives must declare the same two state variables as grid"
    });
    return;
  }
  for (const [field, values] of [
    ["axis_units", value.axis_units],
    ["derivative_units", value.derivative_units]
  ]) {
    const names = Object.keys(values);
    if (names.length !== axes.length || axes.some((axis) => !Object.hasOwn(values, axis))) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: [field],
        message: `${field} must declare units for the same two state variables as grid`
      });
    }
  }
  for (const axis of axes) {
    if (Object.hasOwn(value.axis_units, axis) && Object.hasOwn(value.derivative_units, axis)) {
      const expected2 = `${value.axis_units[axis]}/${value.derivative_time_unit}`;
      if (value.derivative_units[axis] !== expected2) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["derivative_units", axis],
          message: `derivative_units.${axis} must equal axis_units.${axis}/${value.derivative_time_unit}`
        });
      }
    }
  }
  if (value.derivative_time_unit === "s") {
    for (const axis of derivativeNames) {
      for (let index = 0; index < value.derivatives[axis].length; index++) {
        const derivative = value.derivatives[axis][index];
        if (derivative !== 0 && derivative / 1e3 === 0) {
          ctx.addIssue({
            code: import_zod.z.ZodIssueCode.custom,
            path: ["derivatives", axis, index],
            message: "a nonzero per-second derivative must remain nonzero after canonical per-ms conversion"
          });
        }
      }
    }
  }
  if (axes.length !== 2) {
    return;
  }
  const expected = value.grid[axes[0]].length * value.grid[axes[1]].length;
  for (const axis of axes) {
    equalLengthIssue(
      ctx,
      `derivatives.${axis}`,
      "the Cartesian phase-plane grid",
      expected,
      value.derivatives[axis].length
    );
  }
});
var AstrocyteParamsSchema = import_zod.z.object({
  times_ms: timeArray.min(2),
  ca_trace: gpuArray.min(1),
  /** The legacy Ca-only skill follows the NEST astrocyte examples' explicit
   * micromolar concentration axis. Other quantities or converted units need
   * a typed analog-trace contract rather than overloading ca_trace. */
  units: import_zod.z.enum(["uM", "\xB5M", "\u03BCM"])
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "ca_trace",
    "times_ms",
    value.times_ms.length,
    value.ca_trace.length
  );
  requireStrictlyIncreasing(value.times_ms, ctx, "times_ms");
  for (let index = 0; index < value.ca_trace.length; index++) {
    if (value.ca_trace[index] < 0) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["ca_trace", index],
        message: "absolute Ca\xB2\u207A concentration cannot be negative"
      });
      break;
    }
  }
});
var CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS = [
  "paper",
  "model",
  "family"
];
var CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS = [
  "cites",
  "same_as",
  "variant_of",
  "instantiates",
  "belongs_to_family"
];
var KnowledgeGraphAttributeScalarSchema = import_zod.z.union([
  import_zod.z.string().max(KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength).regex(
    SAFE_DISPLAY_STRING_PATTERN,
    "attribute strings must not contain control or bidi characters"
  ),
  import_zod.z.number(),
  import_zod.z.boolean(),
  import_zod.z.null()
]);
var KnowledgeGraphAttributeValueSchema = import_zod.z.union([
  KnowledgeGraphAttributeScalarSchema,
  import_zod.z.array(KnowledgeGraphAttributeScalarSchema).max(KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems)
]);
var KnowledgeGraphAttributeKeySchema = normalizedRecordKey.max(
  KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength
);
var KnowledgeGraphAttributesSchema = import_zod.z.record(KnowledgeGraphAttributeKeySchema, KnowledgeGraphAttributeValueSchema).superRefine((value, ctx) => {
  if (Object.keys(value).length > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      message: `knowledge-graph attributes may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributes} keys`
    });
  }
});
var KnowledgeGraphEvidenceRefSchema = import_zod.z.discriminatedUnion("kind", [
  import_zod.z.object({
    kind: import_zod.z.literal("graph_snapshot_record"),
    evidence_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength),
    record_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxRecordIdLength),
    locator: displayText(KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength).optional()
  }).strict(),
  import_zod.z.object({
    kind: import_zod.z.literal("graph_node"),
    evidence_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength),
    node_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength),
    locator: displayText(KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength).optional(),
    excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional()
  }).strict(),
  import_zod.z.object({
    kind: import_zod.z.literal("citation"),
    evidence_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength),
    paper_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxPaperIdLength),
    citation_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxCitationIdLength),
    page: import_zod.z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0), "page must not be negative zero").optional(),
    locator: displayText(KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength).optional(),
    excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional(),
    doi: displayText(KNOWLEDGE_GRAPH_LIMITS.maxDoiLength).optional()
  }).strict(),
  import_zod.z.object({
    kind: import_zod.z.literal("external_source"),
    evidence_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength),
    source_id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxSourceIdLength),
    locator: displayText(KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength).optional(),
    excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional()
  }).strict()
]);
var KnowledgeGraphEvidenceRefsSchema = import_zod.z.array(KnowledgeGraphEvidenceRefSchema).min(1).max(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement).superRefine((evidence, ctx) => {
  if (!evidence.some((reference) => reference.kind !== "graph_node")) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      message: "evidence must contain at least one direct source anchor (graph_snapshot_record, citation, or external_source); graph_node references are supplemental only"
    });
  }
});
var KnowledgeGraphUncalibratedScoreSchema = import_zod.z.object({
  kind: import_zod.z.enum([
    "extraction_confidence",
    "citation_resolution_confidence",
    "structural_similarity",
    "behavioral_agreement",
    "retrieval_relevance"
  ]),
  value: import_zod.z.number().min(0).max(1),
  calibrated_posterior: import_zod.z.literal(false)
}).strict();
var DerivedAdvisoryEpistemicSchema = import_zod.z.object({
  status: import_zod.z.literal("derived_advisory"),
  advisory_only: import_zod.z.literal(true),
  is_paper_local_evidence: import_zod.z.literal(false),
  calibrated_posterior: import_zod.z.literal(false)
}).strict();
var KnowledgeGraphNodeSchema = import_zod.z.object({
  id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength),
  kind: import_zod.z.enum(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS),
  label: displayText(KNOWLEDGE_GRAPH_LIMITS.maxNodeLabelLength),
  detail: displayText(KNOWLEDGE_GRAPH_LIMITS.maxDetailLength).optional(),
  attributes: KnowledgeGraphAttributesSchema,
  epistemic: DerivedAdvisoryEpistemicSchema,
  evidence: KnowledgeGraphEvidenceRefsSchema,
  uncalibrated_score: KnowledgeGraphUncalibratedScoreSchema.optional()
}).strict();
var KnowledgeGraphEdgeSchema = import_zod.z.object({
  id: displayText(KNOWLEDGE_GRAPH_LIMITS.maxEdgeIdLength),
  source: displayText(KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength),
  target: displayText(KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength),
  kind: import_zod.z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS),
  label: displayText(KNOWLEDGE_GRAPH_LIMITS.maxEdgeLabelLength),
  attributes: KnowledgeGraphAttributesSchema,
  epistemic: DerivedAdvisoryEpistemicSchema,
  evidence: KnowledgeGraphEvidenceRefsSchema,
  uncalibrated_score: KnowledgeGraphUncalibratedScoreSchema.optional()
}).strict();
var KnowledgeGraph3DParamsSchema = import_zod.z.object({
  graph_id: displayText(160),
  graph_source: displayText(200),
  graph_snapshot_id: displayText(200),
  graph_scope: import_zod.z.literal("corpus_entity"),
  generated_at: Rfc3339TimestampSchema,
  nodes: import_zod.z.array(KnowledgeGraphNodeSchema).min(1).max(PARAM_LIMITS.maxGraphNodes),
  edges: import_zod.z.array(KnowledgeGraphEdgeSchema).max(PARAM_LIMITS.maxGraphEdges)
}).strict().superRefine((value, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  const nodeKinds = /* @__PURE__ */ new Map();
  const edgeIds = /* @__PURE__ */ new Set();
  const parallelCounts = /* @__PURE__ */ new Map();
  let issueCount = 0;
  const addIssue = (issue) => {
    if (issueCount >= 16) return;
    issueCount += 1;
    ctx.addIssue(issue);
  };
  value.nodes.forEach((node, index) => {
    if (ids.has(node.id)) {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["nodes", index, "id"],
        message: `duplicate node id '${node.id}'`
      });
    }
    ids.add(node.id);
    nodeKinds.set(node.id, node.kind);
  });
  value.edges.forEach((edge, index) => {
    if (edgeIds.has(edge.id)) {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index, "id"],
        message: `duplicate edge id '${edge.id}'`
      });
    }
    edgeIds.add(edge.id);
    const pairSource = edge.source > edge.target ? edge.target : edge.source;
    const pairTarget = edge.source > edge.target ? edge.source : edge.target;
    const pairKey = JSON.stringify([pairSource, pairTarget]);
    const parallelCount = (parallelCounts.get(pairKey) ?? 0) + 1;
    parallelCounts.set(pairKey, parallelCount);
    if (parallelCount > KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair) {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: `at most ${KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair} parallel edges may connect one unordered node pair`
      });
    }
    if (!ids.has(edge.source)) {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index, "source"],
        message: `edge source '${edge.source}' does not reference a node`
      });
    }
    if (!ids.has(edge.target)) {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index, "target"],
        message: `edge target '${edge.target}' does not reference a node`
      });
    }
    if (edge.source === edge.target) {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: "self-loop edges are not renderable"
      });
    }
    const sourceKind = nodeKinds.get(edge.source);
    const targetKind = nodeKinds.get(edge.target);
    const expected = {
      cites: ["paper", "paper"],
      same_as: ["model", "model"],
      variant_of: ["model", "model"],
      instantiates: ["paper", "model"],
      belongs_to_family: ["model", "family"]
    };
    const [expectedSource, expectedTarget] = expected[edge.kind];
    if (sourceKind !== void 0 && targetKind !== void 0 && (sourceKind !== expectedSource || targetKind !== expectedTarget)) {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: `${edge.kind} requires ${expectedSource} \u2192 ${expectedTarget} endpoints`
      });
    }
    const allowedScoreKinds = {
      cites: ["citation_resolution_confidence"],
      same_as: ["structural_similarity"],
      variant_of: ["structural_similarity"],
      instantiates: [],
      belongs_to_family: []
    };
    if (edge.uncalibrated_score && !allowedScoreKinds[edge.kind].includes(edge.uncalibrated_score.kind)) {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["edges", index, "uncalibrated_score", "kind"],
        message: `${edge.kind} does not allow score kind '${edge.uncalibrated_score.kind}'`
      });
    }
    const evidenceIds = /* @__PURE__ */ new Set();
    for (let evidenceIndex = 0; evidenceIndex < edge.evidence.length; evidenceIndex++) {
      const evidence = edge.evidence[evidenceIndex];
      if (evidenceIds.has(evidence.evidence_id)) {
        addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["edges", index, "evidence", evidenceIndex, "evidence_id"],
          message: `duplicate evidence id '${evidence.evidence_id}' on edge '${edge.id}'`
        });
      }
      evidenceIds.add(evidence.evidence_id);
      if (evidence.kind === "graph_node" && !ids.has(evidence.node_id)) {
        addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["edges", index, "evidence", evidenceIndex, "node_id"],
          message: `edge evidence node '${evidence.node_id}' does not reference a node`
        });
      }
    }
  });
  value.nodes.forEach((node, nodeIndex) => {
    if (node.uncalibrated_score && node.uncalibrated_score.kind !== "extraction_confidence") {
      addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["nodes", nodeIndex, "uncalibrated_score", "kind"],
        message: `knowledge-graph nodes only allow score kind 'extraction_confidence'; received '${node.uncalibrated_score.kind}'`
      });
    }
    const evidenceIds = /* @__PURE__ */ new Set();
    for (let evidenceIndex = 0; evidenceIndex < node.evidence.length; evidenceIndex++) {
      const evidence = node.evidence[evidenceIndex];
      if (evidenceIds.has(evidence.evidence_id)) {
        addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["nodes", nodeIndex, "evidence", evidenceIndex, "evidence_id"],
          message: `duplicate evidence id '${evidence.evidence_id}' on node '${node.id}'`
        });
      }
      evidenceIds.add(evidence.evidence_id);
      if (evidence.kind === "graph_node" && !ids.has(evidence.node_id)) {
        addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["nodes", nodeIndex, "evidence", evidenceIndex, "node_id"],
          message: `node evidence node '${evidence.node_id}' does not reference a node`
        });
      }
    }
  });
});
var Spatial2DParamsSchema = import_zod.z.object({
  positions: import_zod.z.array(import_zod.z.tuple([gpuNumber, gpuNumber])).min(1).max(PARAM_LIMITS.maxSpatialObjects),
  coordinate_units: units
}).strict();
var CorrelogramPairSchema = import_zod.z.object({
  reference_label: displayText(240),
  target_label: displayText(240)
}).strict();
var CorrelogramStatisticSchema = import_zod.z.discriminatedUnion("kind", [
  import_zod.z.object({ kind: import_zod.z.literal("raw_pair_count"), units: import_zod.z.literal("count") }).strict(),
  import_zod.z.object({ kind: import_zod.z.literal("weighted_pair_sum"), units }).strict(),
  import_zod.z.object({
    kind: import_zod.z.literal("pair_rate_hz"),
    units: import_zod.z.literal("Hz"),
    exposure_s: import_zod.z.number().positive().max(Number.MAX_VALUE)
  }).strict(),
  import_zod.z.object({
    kind: import_zod.z.literal("pearson_coefficient"),
    units: import_zod.z.literal("1"),
    sample_count: import_zod.z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
  }).strict()
]);
function requireSymmetricLagAxis(lags, width, tauMax, ctx) {
  requireUniformHistogramBins(lags, width, ctx, "lags_ms");
  if (lags.length === 0 || !Number.isFinite(tauMax) || tauMax <= 0) return;
  if (lags.length % 2 === 0) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["lags_ms"],
      message: "a symmetric correlogram axis must contain an odd number of lag centers"
    });
    return;
  }
  if (!approximatelyEqual(
    lags[0],
    -tauMax,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
  )) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["lags_ms", 0],
      message: "the first lag center must equal -tau_max_ms"
    });
  }
  const lastIndex = lags.length - 1;
  if (!approximatelyEqual(
    lags[lastIndex],
    tauMax,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
  )) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["lags_ms", lastIndex],
      message: "the final lag center must equal tau_max_ms"
    });
  }
  const middle = Math.floor(lags.length / 2);
  if (!approximatelyEqual(
    lags[middle],
    0,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
  )) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["lags_ms", middle],
      message: "the middle lag center must be zero"
    });
  }
  for (let index = 0; index < middle; index++) {
    if (!approximatelyEqual(
      lags[index],
      -lags[lastIndex - index],
      HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["lags_ms", index],
        message: "lag centers must be pairwise symmetric around zero"
      });
      break;
    }
  }
}
var CorrelogramParamsSchema = import_zod.z.object({
  lags_ms: timeArray.min(1),
  values: gpuArray.min(1),
  bin_width_ms: import_zod.z.number().positive().max(Number.MAX_VALUE),
  tau_max_ms: import_zod.z.number().positive().max(Number.MAX_VALUE),
  counting_start_ms: import_zod.z.number(),
  counting_stop_ms: import_zod.z.number(),
  pair: CorrelogramPairSchema,
  lag_convention: import_zod.z.literal("positive_target_after_reference"),
  binning: import_zod.z.literal("left_closed_right_open"),
  zero_lag_policy: import_zod.z.enum(["included", "excluded_self_pairs"]),
  statistic: CorrelogramStatisticSchema
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "values",
    "lags_ms",
    value.lags_ms.length,
    value.values.length
  );
  requireSymmetricLagAxis(
    value.lags_ms,
    value.bin_width_ms,
    value.tau_max_ms,
    ctx
  );
  if (!(value.counting_stop_ms > value.counting_start_ms)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["counting_stop_ms"],
      message: "counting_stop_ms must be greater than counting_start_ms"
    });
  }
  for (let index = 0; index < value.values.length; index++) {
    const sample = value.values[index];
    const invalid = value.statistic.kind === "pearson_coefficient" ? sample < -1 || sample > 1 : value.statistic.kind === "raw_pair_count" ? sample < 0 || !Number.isSafeInteger(sample) : value.statistic.kind === "pair_rate_hz" ? sample < 0 : false;
    if (invalid) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["values", index],
        message: value.statistic.kind === "pearson_coefficient" ? "Pearson coefficients must lie in [-1, 1]" : value.statistic.kind === "raw_pair_count" ? "raw pair counts must be non-negative safe integers" : "pair rates cannot be negative"
      });
      break;
    }
  }
});
var StimulusResponseParamsSchema = import_zod.z.object({
  times_ms: timeArray.min(1),
  stimulus: gpuArray.min(1),
  response: gpuArray.min(1)
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "stimulus",
    "times_ms",
    value.times_ms.length,
    value.stimulus.length
  );
  equalLengthIssue(
    ctx,
    "response",
    "times_ms",
    value.times_ms.length,
    value.response.length
  );
  requireMonotonic(value.times_ms, ctx, "times_ms");
});
var CompartmentalParamsSchema = import_zod.z.object({
  // A declared sampling interval is required for this host envelope, so a
  // one-point axis would leave that claim mechanically unverifiable.
  times_ms: timeArray.min(2),
  compartments: import_zod.z.array(
    import_zod.z.object({
      id: displayText(120),
      parent_id: displayText(120).nullable(),
      label: displayText(240).optional(),
      values: gpuArray.min(1)
    }).strict()
  ).min(1).max(PARAM_LIMITS.maxSeries)
}).strict().superRefine((value, ctx) => {
  requireStrictlyIncreasing(value.times_ms, ctx, "times_ms");
  const ids = /* @__PURE__ */ new Set();
  const parents = /* @__PURE__ */ new Map();
  let roots = 0;
  value.compartments.forEach((compartment, index) => {
    if (ids.has(compartment.id)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["compartments", index, "id"],
        message: `duplicate compartment id '${compartment.id}'`
      });
    }
    ids.add(compartment.id);
    parents.set(compartment.id, compartment.parent_id);
    if (compartment.parent_id === null) roots += 1;
    equalLengthIssue(
      ctx,
      `compartments.${index}.values`,
      "times_ms",
      value.times_ms.length,
      compartment.values.length
    );
  });
  if (roots === 0) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: ["compartments"],
      message: "at least one root compartment must have parent_id:null"
    });
  }
  value.compartments.forEach((compartment, index) => {
    if (compartment.parent_id !== null && !ids.has(compartment.parent_id)) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        path: ["compartments", index, "parent_id"],
        message: `parent '${compartment.parent_id}' does not reference a compartment`
      });
    }
    const seen = /* @__PURE__ */ new Set();
    let cursor = compartment.id;
    while (cursor !== null && parents.has(cursor)) {
      if (seen.has(cursor)) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: ["compartments", index, "parent_id"],
          message: "compartment parent graph must be acyclic"
        });
        break;
      }
      seen.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
  });
});
var AnimationReplayParamsSchema = import_zod.z.object({
  frames: import_zod.z.array(
    import_zod.z.object({
      time_ms: import_zod.z.number().nonnegative(),
      state: import_zod.z.record(normalizedRecordKey, import_zod.z.unknown()).refine((state) => Object.keys(state).length > 0, {
        message: "frame state must contain at least one field"
      }),
      annotation: displayText(500).optional()
    }).strict()
  ).min(1).max(1e4)
}).strict().superRefine((value, ctx) => {
  requireMonotonic(
    value.frames.map((frame) => frame.time_ms),
    ctx,
    "frames.time_ms"
  );
});

// react/knowledgeGraphIdentity.internal.ts
function canonicalGraphNodePair(source, target) {
  return source <= target ? [source, target] : [target, source];
}
function graphEdgeIdentityKey(edge) {
  if (typeof edge.id === "string") return JSON.stringify(["id", edge.id]);
  const kind = typeof edge.kind === "string" ? edge.kind : "";
  if (edge.directed === false) {
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    return JSON.stringify(["legacy-undirected", source, target, kind]);
  }
  return JSON.stringify(["legacy-directed", edge.source, edge.target, kind]);
}

// react/knowledgeGraph.ts
var import_knowledgeGraphPresentation = require("#cortexel-knowledge-graph-presentation-capability");

// react/knowledgeGraphContextIdentity.internal.ts
function deriveKnowledgeGraphContextIdentity(context) {
  const field = (value) => `${value.length}:${value}`;
  return `cortexel-corpus-graph-instance.v1:${field(context.graph_id)}${field(
    context.graph_source
  )}${field(context.graph_snapshot_id)}${field(context.graph_scope)}${field(
    context.generated_at
  )}`;
}

// react/knowledgeGraphVisualEncoding.internal.ts
var KNOWLEDGE_GRAPH_NODE_GLYPHS = Object.freeze([
  "sphere_outline",
  "box_shell",
  "diamond_shell"
]);
var KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS = Object.freeze([
  "solid",
  "long_dash",
  "short_dash",
  "dotted"
]);
var CORPUS_NODE_GLYPH_BY_KIND = Object.freeze({
  paper: "sphere_outline",
  model: "box_shell",
  family: "diamond_shell"
});
var CORPUS_EDGE_STROKE_PATTERN_BY_KIND = Object.freeze({
  cites: "solid",
  same_as: "solid",
  variant_of: "long_dash",
  instantiates: "short_dash",
  belongs_to_family: "dotted"
});
var KNOWLEDGE_GRAPH_BACKGROUND_COLORS = Object.freeze({
  dark: "#030711",
  light: "#f8fafc"
});
var KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST = 3;
var KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE = 1.28;
var KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH = 3;
var KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE = Object.freeze({
  sphere_outline: 1.08,
  // Every cube-edge midpoint remains outside the opaque unit sphere:
  // 1.30 * sqrt(2/3) > 1.06.
  box_shell: 1.3,
  // Every octahedron-edge midpoint remains outside the opaque unit sphere:
  // 1.50 / sqrt(2) > 1.06.
  diamond_shell: 1.5
});
var KNOWLEDGE_GRAPH_BOX_SHELL_SIDE = 2 * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.box_shell / Math.sqrt(3);
var NODE_GLYPH_SET = new Set(KNOWLEDGE_GRAPH_NODE_GLYPHS);
var EDGE_STROKE_PATTERN_SET = new Set(
  KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS
);
var HEX_COLOR = /^#[0-9a-f]{6}$/u;
function knowledgeGraphNodeGlyphDescription(glyph) {
  switch (glyph) {
    case "sphere_outline":
      return "outlined sphere";
    case "box_shell":
      return "sphere with box shell";
    case "diamond_shell":
      return "sphere with diamond shell";
  }
}
function knowledgeGraphEdgeStrokeDescription(pattern) {
  switch (pattern) {
    case "solid":
      return "solid stroke";
    case "long_dash":
      return "long-dash stroke";
    case "short_dash":
      return "short-dash stroke";
    case "dotted":
      return "dotted stroke";
  }
}
function knowledgeGraphEdgeStrokeSegmentVisible(pattern, chordIndex, chordCount) {
  if (!Number.isSafeInteger(chordIndex) || !Number.isSafeInteger(chordCount) || chordCount < 1 || chordIndex < 0 || chordIndex >= chordCount) {
    throw new RangeError("knowledge-graph stroke segment index is invalid");
  }
  switch (pattern) {
    case "solid":
      return true;
    case "long_dash":
      return chordIndex % 4 !== 3;
    case "short_dash":
      return chordIndex % 2 === 0;
    case "dotted":
      return chordIndex % 3 === 0;
  }
}
function linearChannel(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function luminance(red, green, blue) {
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
}
function contrastRatio(first, second) {
  const a = luminance(...first);
  const b = luminance(...second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
function parseHexColor(value) {
  if (!HEX_COLOR.test(value)) return null;
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16)
  ];
}
function encodeHexColor(channels) {
  return `#${channels.map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0")).join("")}`;
}
function knowledgeGraphContrastSafeColor(sourceColor, themeMode) {
  const source = parseHexColor(sourceColor);
  const background = parseHexColor(KNOWLEDGE_GRAPH_BACKGROUND_COLORS[themeMode]);
  if (source === null || background === null) {
    return themeMode === "light" ? "#0f172a" : "#f8fafc";
  }
  if (contrastRatio(source, background) >= KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST) {
    return sourceColor;
  }
  const endpoint = themeMode === "light" ? 0 : 255;
  for (let step = 1; step <= 255; step++) {
    const amount = step / 255;
    const candidate = source.map((channel) => Math.round(
      channel + (endpoint - channel) * amount
    ));
    if (contrastRatio(candidate, background) >= KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST) {
      return encodeHexColor(candidate);
    }
  }
  return endpoint === 0 ? "#000000" : "#ffffff";
}
function knowledgeGraphRenderedNodeScale(emphasized) {
  return emphasized ? KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE : 1;
}
function knowledgeGraphNodeEmphasisDimAmount(nodeId, focus, focusSet, queryActive, queryMatchIds) {
  if (focus !== null) {
    return nodeId === focus || focusSet?.has(nodeId) === true ? 0 : 0.8;
  }
  return queryActive && !queryMatchIds.has(nodeId) ? 0.82 : 0;
}
function knowledgeGraphRenderedNodeRadialExtent(radius, glyph, emphasized) {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError("knowledge-graph node radius must be positive and finite");
  }
  return radius * knowledgeGraphRenderedNodeScale(emphasized) * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE[glyph];
}
function knowledgeGraphAutoFrameNodeRadialExtent(radius, glyph, focused) {
  return knowledgeGraphRenderedNodeRadialExtent(radius, glyph, focused);
}

// react/knowledgeGraph.ts
var MAX_GRAPH_QUERY_LENGTH = 500;
var DEFAULT_GRAPH_NODE_RADIUS = 4;
var MAX_GRAPH_NODE_RADIUS = 64;
var MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES = KNOWLEDGE_GRAPH_LIMITS.maxPresentationNodes;
var MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES = KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges;
var MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES = KNOWLEDGE_GRAPH_LIMITS.maxLiveForceNodes;
var MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES = KNOWLEDGE_GRAPH_LIMITS.maxLiveForceEdges;
var GRAPH_EDGE_CURVE_SEGMENTS = 12;
var GRAPH_EDGE_LANE_SPACING = 6;
var MAX_GRAPH_PARALLEL_EDGES = KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair;
var MAX_GRAPH_EDGE_LANE_OFFSET = (MAX_GRAPH_PARALLEL_EDGES - 1) / 2 * GRAPH_EDGE_LANE_SPACING;
var DEFAULT_CORPUS_GRAPH_BASE_RADIUS = 4;
var DEFAULT_CORPUS_GRAPH_DEGREE_SCALE = 1.4;
var DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP = 8;
function corpusGraphRadiusMeaning(baseRadius, degreeScale, maxRadiusBump) {
  if (degreeScale === 0 || maxRadiusBump === 0) {
    return `Constant schematic radius ${String(baseRadius)} world units; relationship degree is not encoded; not quantitative evidence.`;
  }
  return `Schematic radius = ${String(baseRadius)} + min(${String(maxRadiusBump)}, sqrt(relationship degree in the complete mapped snapshot before host-side view filters) \xD7 ${String(degreeScale)}) world units; not quantitative evidence.`;
}
var CORPUS_GRAPH_RADIUS_MEANING = corpusGraphRadiusMeaning(
  DEFAULT_CORPUS_GRAPH_BASE_RADIUS,
  DEFAULT_CORPUS_GRAPH_DEGREE_SCALE,
  DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP
);
function assertKnowledgeGraphPresentationBudget(nodeCount, edgeCount) {
  if (!Number.isSafeInteger(nodeCount) || nodeCount < 0 || nodeCount > MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES) {
    throw new RangeError(
      `knowledge graph presentation nodes must be a non-negative integer <= ${MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES}`
    );
  }
  if (!Number.isSafeInteger(edgeCount) || edgeCount < 0 || edgeCount > MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES) {
    throw new RangeError(
      `knowledge graph presentation edges must be a non-negative integer <= ${MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES}`
    );
  }
}
function isKnowledgeGraphLiveForceWithinBudget(nodeCount, edgeCount) {
  return Number.isSafeInteger(nodeCount) && nodeCount >= 0 && nodeCount <= MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES && Number.isSafeInteger(edgeCount) && edgeCount >= 0 && edgeCount <= MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
}
function assertKnowledgeGraphLiveForceBudget(nodeCount, edgeCount) {
  if (!isKnowledgeGraphLiveForceWithinBudget(nodeCount, edgeCount)) {
    throw new RangeError(
      `live knowledge-graph force layout requires non-negative integer counts <= ${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES} nodes and <= ${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES} edges`
    );
  }
}
function knowledgeGraphLiveForceAvailability(nodeCount, edgeCount) {
  assertKnowledgeGraphPresentationBudget(nodeCount, edgeCount);
  const exceeded = [];
  if (nodeCount > MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES) exceeded.push("nodes");
  if (edgeCount > MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES) exceeded.push("edges");
  return Object.freeze({
    status: exceeded.length === 0 ? "available" : "unavailable_resource_limit",
    nodeCount,
    edgeCount,
    maxNodes: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
    maxEdges: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
    exceeded: Object.freeze(exceeded)
  });
}
function assertKnowledgeGraphIdentity(graphIdentity) {
  if (typeof graphIdentity !== "string" || graphIdentity.length < 1 || graphIdentity.length > 1024) {
    throw new Error(
      "knowledge graph identity must be a non-empty string <= 1024 characters"
    );
  }
}
function assertUniqueGraphNodeIds(nodes) {
  const ids = /* @__PURE__ */ new Set();
  for (let index = 0; index < nodes.length; index++) {
    const id2 = nodes[index].id;
    if (ids.has(id2)) {
      throw new Error(`knowledge graph node id is duplicated at index ${index}`);
    }
    ids.add(id2);
  }
}
function assertRenderableGraphEdges(nodes, edges) {
  const ids = /* @__PURE__ */ new Set();
  for (let index = 0; index < nodes.length; index++) ids.add(nodes[index].id);
  const relationships = /* @__PURE__ */ new Set();
  const pairCounts = /* @__PURE__ */ new Map();
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index];
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      throw new Error(`knowledge graph edge at index ${index} has a missing endpoint`);
    }
    if (edge.source === edge.target) {
      throw new Error(`knowledge graph edge at index ${index} is a self-loop`);
    }
    if (edge.directed === false && edge.particles === true) {
      throw new Error(
        `knowledge graph edge at index ${index} is undirected but carries directional particles`
      );
    }
    const key = graphEdgeIdentityKey(edge);
    if (relationships.has(key)) {
      const identity = typeof edge.id === "string" ? "id" : "relationship";
      throw new Error(`knowledge graph edge ${identity} is duplicated at index ${index}`);
    }
    relationships.add(key);
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    const pairKey = JSON.stringify([source, target]);
    const pairCount = (pairCounts.get(pairKey) ?? 0) + 1;
    if (pairCount > MAX_GRAPH_PARALLEL_EDGES) {
      throw new RangeError(
        `knowledge graph edge bundle exceeds ${MAX_GRAPH_PARALLEL_EDGES} at index ${index}`
      );
    }
    pairCounts.set(pairKey, pairCount);
  }
}
function reducedMotionLayoutTickBudget(nodeCount, edgeCount) {
  assertKnowledgeGraphLiveForceBudget(nodeCount, edgeCount);
  return nodeCount === 0 ? 0 : 1;
}
function graphCameraTargetDamping(deltaSeconds, reducedMotion) {
  if (reducedMotion) return 1;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return -Math.expm1(-3 * deltaSeconds);
}
function truncateGraphQueryWithoutSplittingPair(value) {
  if (value.length <= MAX_GRAPH_QUERY_LENGTH) return value;
  let end = MAX_GRAPH_QUERY_LENGTH;
  const last = value.charCodeAt(end - 1);
  const next = value.charCodeAt(end);
  if (last >= 55296 && last <= 56319 && next >= 56320 && next <= 57343) end--;
  return value.slice(0, end);
}
function normalizeGraphQuery(query) {
  const boundedInput = truncateGraphQueryWithoutSplittingPair(query);
  return truncateGraphQueryWithoutSplittingPair(boundedInput.trim().toLowerCase());
}
function matchesGraphQuery(idOrLabel, labelOrKind, kindOrQuery, maybeNormalizedQuery) {
  const hasId = maybeNormalizedQuery !== void 0;
  const id2 = hasId ? idOrLabel : "";
  const label = hasId ? labelOrKind : idOrLabel;
  const kind = hasId ? kindOrQuery : labelOrKind;
  const normalizedQuery = hasId ? maybeNormalizedQuery : kindOrQuery;
  return normalizedQuery.length === 0 || id2.toLowerCase().includes(normalizedQuery) || label.toLowerCase().includes(normalizedQuery) || kind.toLowerCase().includes(normalizedQuery);
}
var MAX_GRAPH_SEARCH_ARRAY_ITEMS = 24;
var MAX_GRAPH_SEARCH_RECORD_KEYS = 32;
var MAX_GRAPH_SEARCH_DEPTH = 3;
function graphMetadataMatchesQuery(value, normalizedQuery, depth = 0) {
  if (typeof value === "string") {
    return value.toLowerCase().includes(normalizedQuery);
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value).toLowerCase().includes(normalizedQuery);
  }
  if (value === void 0 || depth >= MAX_GRAPH_SEARCH_DEPTH) return false;
  if (Array.isArray(value)) {
    const count2 = Math.min(value.length, MAX_GRAPH_SEARCH_ARRAY_ITEMS);
    for (let index = 0; index < count2; index++) {
      if (graphMetadataMatchesQuery(value[index], normalizedQuery, depth + 1)) return true;
    }
    return false;
  }
  if (typeof value !== "object") return false;
  const record2 = value;
  const keys = Object.keys(record2);
  const count = Math.min(keys.length, MAX_GRAPH_SEARCH_RECORD_KEYS);
  for (let index = 0; index < count; index++) {
    const key = keys[index];
    if (key.toLowerCase().includes(normalizedQuery) || graphMetadataMatchesQuery(record2[key], normalizedQuery, depth + 1)) {
      return true;
    }
  }
  return false;
}
function graphNodeMatchesQuery(node, normalizedQuery) {
  return matchesGraphQuery(node.id, node.label, node.kind, normalizedQuery) || graphMetadataMatchesQuery(node.radius, normalizedQuery) || graphMetadataMatchesQuery(node.radiusMeaning, normalizedQuery) || graphMetadataMatchesQuery(node.detail, normalizedQuery) || graphMetadataMatchesQuery(node.attributes, normalizedQuery) || graphMetadataMatchesQuery(node.epistemic, normalizedQuery) || graphMetadataMatchesQuery(node.evidence, normalizedQuery) || graphMetadataMatchesQuery(node.uncalibrated_score, normalizedQuery);
}
function graphEdgeMetadataMatchesQuery(edge, normalizedQuery) {
  return graphMetadataMatchesQuery(edge.id, normalizedQuery) || graphMetadataMatchesQuery(edge.kind, normalizedQuery) || graphMetadataMatchesQuery(edge.label, normalizedQuery) || graphMetadataMatchesQuery(edge.attributes, normalizedQuery) || graphMetadataMatchesQuery(edge.epistemic, normalizedQuery) || graphMetadataMatchesQuery(edge.evidence, normalizedQuery) || graphMetadataMatchesQuery(edge.uncalibrated_score, normalizedQuery);
}
function graphQueryMatchIds(nodes, normalizedQuery, edges = []) {
  const matches = /* @__PURE__ */ new Set();
  const knownIds = /* @__PURE__ */ new Set();
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    knownIds.add(node.id);
    if (normalizedQuery.length === 0 || graphNodeMatchesQuery(node, normalizedQuery)) {
      matches.add(node.id);
    }
  }
  if (normalizedQuery.length > 0) {
    for (let index = 0; index < edges.length; index++) {
      const edge = edges[index];
      if (!graphEdgeMetadataMatchesQuery(edge, normalizedQuery)) continue;
      if (knownIds.has(edge.source)) matches.add(edge.source);
      if (knownIds.has(edge.target)) matches.add(edge.target);
    }
  }
  return matches;
}
function graphEdgeMatchesQuery(source, target, matchingNodeIds, normalizedQuery) {
  return normalizedQuery.length === 0 || matchingNodeIds.has(source) || matchingNodeIds.has(target);
}
var GRAPH_LAYOUT_TICK_SECONDS = 1 / 60;
var MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 1;
function advanceGraphLayoutClockInto(accumulatorSeconds, deltaSeconds, out) {
  const maxRemainder = GRAPH_LAYOUT_TICK_SECONDS - Number.EPSILON;
  const remainder = Number.isFinite(accumulatorSeconds) && accumulatorSeconds > 0 ? Math.min(accumulatorSeconds, maxRemainder) : 0;
  const delta = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? Math.min(
    deltaSeconds,
    GRAPH_LAYOUT_TICK_SECONDS * MAX_GRAPH_LAYOUT_TICKS_PER_FRAME
  ) : 0;
  const available = remainder + delta;
  const ticks = Math.min(
    MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
    Math.floor((available + Number.EPSILON) / GRAPH_LAYOUT_TICK_SECONDS)
  );
  out.ticks = ticks;
  out.remainderSeconds = Math.min(
    maxRemainder,
    Math.max(0, available - ticks * GRAPH_LAYOUT_TICK_SECONDS)
  );
  return out;
}
function advanceGraphLayoutClock(accumulatorSeconds, deltaSeconds) {
  return advanceGraphLayoutClockInto(
    accumulatorSeconds,
    deltaSeconds,
    { ticks: 0, remainderSeconds: 0 }
  );
}
function normalizeGraphNodeRadius(radius) {
  return Number.isFinite(radius) && radius > 0 && radius <= MAX_GRAPH_NODE_RADIUS ? radius : DEFAULT_GRAPH_NODE_RADIUS;
}
function filterGraphEdges(ids, edges) {
  const seen = /* @__PURE__ */ new Set();
  return edges.filter((edge) => {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) {
      return false;
    }
    const key = graphEdgeIdentityKey(edge);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function assignGraphEdgeLanes(edges) {
  const bundles = /* @__PURE__ */ new Map();
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    const edge = edges[edgeIndex];
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    const pairKey = JSON.stringify([source, target]);
    const semanticKey = JSON.stringify([
      graphEdgeIdentityKey(edge),
      typeof edge.kind === "string" ? edge.kind : "",
      edge.source,
      edge.target
    ]);
    const bundle = bundles.get(pairKey);
    const candidate = { edge, edgeIndex, semanticKey };
    if (bundle) bundle.push(candidate);
    else bundles.set(pairKey, [candidate]);
  }
  const lanes = new Array(edges.length);
  for (const bundle of bundles.values()) {
    if (bundle.length > MAX_GRAPH_PARALLEL_EDGES) {
      throw new RangeError(
        `knowledge graph edge bundle exceeds ${MAX_GRAPH_PARALLEL_EDGES}`
      );
    }
    bundle.sort(
      (a, b) => a.semanticKey < b.semanticKey ? -1 : a.semanticKey > b.semanticKey ? 1 : a.edgeIndex - b.edgeIndex
    );
    const center = (bundle.length - 1) / 2;
    for (let rank = 0; rank < bundle.length; rank++) {
      const candidate = bundle[rank];
      lanes[candidate.edgeIndex] = {
        edge: candidate.edge,
        edgeIndex: candidate.edgeIndex,
        laneOffset: rank - center,
        bundleSize: bundle.length,
        canonicalDirectionSign: candidate.edge.source <= candidate.edge.target ? 1 : -1
      };
    }
  }
  return lanes;
}
function uniqueGraphTopologyLinks(edges) {
  const seen = /* @__PURE__ */ new Set();
  const links = [];
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index];
    if (edge.source === edge.target) continue;
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    const key = JSON.stringify([source, target]);
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ source, target });
  }
  links.sort(
    (a, b) => a.source < b.source ? -1 : a.source > b.source ? 1 : a.target < b.target ? -1 : a.target > b.target ? 1 : 0
  );
  return links;
}
function graphEdgeControlPointInto(source, target, lane, out) {
  const midpointX = (source.x + target.x) * 0.5;
  const midpointY = (source.y + target.y) * 0.5;
  const midpointZ = (source.z + target.z) * 0.5;
  const sign = lane.canonicalDirectionSign;
  let dx = (target.x - source.x) * sign;
  let dy = (target.y - source.y) * sign;
  let dz = (target.z - source.z) * sign;
  const length = Math.hypot(dx, dy, dz);
  if (!(length > 1e-12) || lane.laneOffset === 0) {
    out.x = midpointX;
    out.y = midpointY;
    out.z = midpointZ;
    return out;
  }
  dx /= length;
  dy /= length;
  dz /= length;
  let basisX;
  let basisY;
  let basisZ;
  if (dz < -0.9999999) {
    basisX = 0;
    basisY = -1;
    basisZ = 0;
  } else {
    const scale = 1 / (1 + dz);
    const xy = -dx * dy * scale;
    basisX = 1 - dx * dx * scale;
    basisY = xy;
    basisZ = -dx;
  }
  const laneOffset = lane.laneOffset * GRAPH_EDGE_LANE_SPACING;
  out.x = midpointX + basisX * laneOffset;
  out.y = midpointY + basisY * laneOffset;
  out.z = midpointZ + basisZ * laneOffset;
  return out;
}
function graphEdgeCurvePointInto(source, control, target, t, out) {
  const clamped = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  const inverse = 1 - clamped;
  const sourceWeight = inverse * inverse;
  const controlWeight = 2 * inverse * clamped;
  const targetWeight = clamped * clamped;
  out.x = source.x * sourceWeight + control.x * controlWeight + target.x * targetWeight;
  out.y = source.y * sourceWeight + control.y * controlWeight + target.y * targetWeight;
  out.z = source.z * sourceWeight + control.z * controlWeight + target.z * targetWeight;
  return out;
}
var GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS = 18;
function graphEdgeTargetBoundaryInto(source, control, target, targetRadius, pointOut, directionOut) {
  if (!Number.isFinite(targetRadius) || targetRadius <= 0 || !Number.isFinite(source.x) || !Number.isFinite(source.y) || !Number.isFinite(source.z) || !Number.isFinite(control.x) || !Number.isFinite(control.y) || !Number.isFinite(control.z) || !Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) return false;
  const radiusSquared = targetRadius * targetRadius;
  let high = 1;
  let low = -1;
  for (let chord = GRAPH_EDGE_CURVE_SEGMENTS - 1; chord >= 0; chord--) {
    const candidate = chord / GRAPH_EDGE_CURVE_SEGMENTS;
    graphEdgeCurvePointInto(source, control, target, candidate, pointOut);
    const dx2 = pointOut.x - target.x;
    const dy2 = pointOut.y - target.y;
    const dz2 = pointOut.z - target.z;
    if (dx2 * dx2 + dy2 * dy2 + dz2 * dz2 > radiusSquared) {
      low = candidate;
      break;
    }
    high = candidate;
  }
  if (low < 0) return false;
  for (let iteration = 0; iteration < GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS; iteration++) {
    const candidate = (low + high) * 0.5;
    graphEdgeCurvePointInto(source, control, target, candidate, pointOut);
    const dx2 = pointOut.x - target.x;
    const dy2 = pointOut.y - target.y;
    const dz2 = pointOut.z - target.z;
    if (dx2 * dx2 + dy2 * dy2 + dz2 * dz2 > radiusSquared) low = candidate;
    else high = candidate;
  }
  const t = (low + high) * 0.5;
  graphEdgeCurvePointInto(source, control, target, t, pointOut);
  const inverse = 1 - t;
  let dx = 2 * (inverse * (control.x - source.x) + t * (target.x - control.x));
  let dy = 2 * (inverse * (control.y - source.y) + t * (target.y - control.y));
  let dz = 2 * (inverse * (control.z - source.z) + t * (target.z - control.z));
  const length = Math.hypot(dx, dy, dz);
  if (!(length > 1e-12) || !Number.isFinite(length)) return false;
  dx /= length;
  dy /= length;
  dz /= length;
  directionOut.x = dx;
  directionOut.y = dy;
  directionOut.z = dz;
  return true;
}
function buildAdjacency(ids, edges) {
  const m = /* @__PURE__ */ new Map();
  for (const id2 of ids) m.set(id2, /* @__PURE__ */ new Set());
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    m.get(e.source).add(e.target);
    m.get(e.target).add(e.source);
  }
  return m;
}
function flowParticleCount(flowEdgeCount, perEdge, max) {
  if (![flowEdgeCount, perEdge, max].every(Number.isFinite)) return 0;
  const edges = Math.max(0, Math.floor(flowEdgeCount));
  const each = Math.max(0, Math.floor(perEdge));
  const ceiling = Math.max(0, Math.floor(max));
  return Math.min(ceiling, edges * each);
}
function graphSignature(nodes, edges) {
  const field = (value) => {
    if (value === void 0) return "u;";
    const type = typeof value === "string" ? "s" : typeof value === "number" ? "n" : "b";
    const text = typeof value === "number" && Object.is(value, -0) ? "-0" : String(value);
    return `${type}${text.length}:${text}`;
  };
  let s = "";
  for (const n of nodes) {
    s += `N${field(n.id)}${field(n.radius)}${field(n.nodeGlyph)}`;
  }
  s += "|";
  for (const e of edges) {
    s += `E${field(e.id)}${field(e.source)}${field(e.target)}${field(e.color)}${field(
      e.kind
    )}${field((e.directed !== false ? 1 : 0) + (e.particles ? 2 : 0))}${field(
      e.edgeStrokePattern
    )}`;
  }
  return s;
}
function defaultNodeColors(palette) {
  return {
    paper: palette.cyan,
    // sources — cool
    model: palette.amber,
    // implementations — warm
    family: palette.violet
    // groupings — the palette endpoint
  };
}
function defaultEdgeStyles(palette) {
  return {
    cites: { color: palette.excitatory, directed: true, particles: true },
    instantiates: { color: palette.teal, directed: true, particles: false },
    belongs_to_family: { color: palette.inkFaint, directed: true, particles: false },
    same_as: { color: palette.orange, directed: false, particles: false },
    variant_of: { color: palette.pink, directed: true, particles: false }
  };
}
var MAP_CORPUS_GRAPH_OPTION_KEYS = /* @__PURE__ */ new Set([
  "baseRadius",
  "degreeScale",
  "maxRadiusBump",
  "nodeColors",
  "edgeColors"
]);
var KNOWLEDGE_GRAPH_NODE_KINDS = /* @__PURE__ */ new Set([
  "paper",
  "model",
  "family"
]);
var KNOWLEDGE_GRAPH_EDGE_KINDS = /* @__PURE__ */ new Set([
  "cites",
  "same_as",
  "variant_of",
  "instantiates",
  "belongs_to_family"
]);
var HEX_COLOR2 = /^#[0-9a-f]{6}$/iu;
function ownDataRecord(value, label, allowedKeys) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const result = /* @__PURE__ */ Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      throw new TypeError(`${label} contains an unknown member`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${label}.${key} must be an enumerable data property`);
    }
    result[key] = descriptor.value;
  }
  return result;
}
function finiteRadiusOption(options, key, fallback, strictlyPositive) {
  const value = options[key];
  if (value === void 0) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0) || (strictlyPositive ? value <= 0 : value < 0)) {
    const domain = strictlyPositive ? "positive" : "non-negative";
    throw new RangeError(`mapCorpusKnowledgeGraph ${key} must be a finite ${domain} number`);
  }
  return value;
}
function normalizeHexColor(value, label) {
  if (typeof value !== "string" || !HEX_COLOR2.test(value)) {
    throw new TypeError(`${label} must be an exact #rrggbb hex color`);
  }
  return value.toLowerCase();
}
function colorOverrides(value, label, allowedKeys) {
  if (value === void 0) return {};
  const record2 = ownDataRecord(value, label, allowedKeys);
  const result = {};
  for (const [key, color] of Object.entries(record2)) {
    result[key] = normalizeHexColor(color, `${label}.${key}`);
  }
  return result;
}
function corpusGraphInstanceIdentity(context) {
  return deriveKnowledgeGraphContextIdentity(context);
}
function mapCorpusKnowledgeGraph(params, palette, opts = {}) {
  const validatedParams = KnowledgeGraph3DParamsSchema.safeParse(params);
  if (!validatedParams.success) {
    throw new TypeError(
      `mapCorpusKnowledgeGraph requires fully validated corpus.knowledge_graph params: ` + formatValidationIssues(validatedParams.error.issues)
    );
  }
  const checkedParams = validatedParams.data;
  assertKnowledgeGraphPresentationBudget(
    checkedParams.nodes.length,
    checkedParams.edges.length
  );
  assertUniqueGraphNodeIds(checkedParams.nodes);
  assertRenderableGraphEdges(checkedParams.nodes, checkedParams.edges);
  const optionValues = ownDataRecord(
    opts,
    "mapCorpusKnowledgeGraph options",
    MAP_CORPUS_GRAPH_OPTION_KEYS
  );
  const baseRadius = finiteRadiusOption(
    optionValues,
    "baseRadius",
    DEFAULT_CORPUS_GRAPH_BASE_RADIUS,
    true
  );
  const degreeScale = finiteRadiusOption(
    optionValues,
    "degreeScale",
    DEFAULT_CORPUS_GRAPH_DEGREE_SCALE,
    false
  );
  const maxRadiusBump = finiteRadiusOption(
    optionValues,
    "maxRadiusBump",
    DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP,
    false
  );
  if (baseRadius + maxRadiusBump > MAX_GRAPH_NODE_RADIUS) {
    throw new RangeError(
      `mapCorpusKnowledgeGraph baseRadius + maxRadiusBump must be <= ${MAX_GRAPH_NODE_RADIUS}`
    );
  }
  const nodeColorOverrides = colorOverrides(
    optionValues.nodeColors,
    "mapCorpusKnowledgeGraph nodeColors",
    KNOWLEDGE_GRAPH_NODE_KINDS
  );
  const edgeColorOverrides = colorOverrides(
    optionValues.edgeColors,
    "mapCorpusKnowledgeGraph edgeColors",
    KNOWLEDGE_GRAPH_EDGE_KINDS
  );
  const nodeColors = {
    ...Object.fromEntries(
      Object.entries(defaultNodeColors(palette)).map(([kind, color]) => [
        kind,
        normalizeHexColor(color, `palette node color ${kind}`)
      ])
    ),
    ...nodeColorOverrides
  };
  const edgeStyles = defaultEdgeStyles(palette);
  for (const [kind, style] of Object.entries(edgeStyles)) {
    style.color = normalizeHexColor(style.color, `palette edge color ${kind}`);
  }
  const radiusMeaning = corpusGraphRadiusMeaning(
    baseRadius,
    degreeScale,
    maxRadiusBump
  );
  const renderableEdges = checkedParams.edges;
  const degree = /* @__PURE__ */ new Map();
  for (const e of renderableEdges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const nodes = checkedParams.nodes.map((n) => {
    const kind = n.kind;
    const nodeGlyph = CORPUS_NODE_GLYPH_BY_KIND[kind];
    if (nodeGlyph === void 0) {
      throw new TypeError(`corpus knowledge-graph node ${n.id} has an invalid kind`);
    }
    const d = degree.get(n.id) ?? 0;
    const radius = baseRadius + Math.min(maxRadiusBump, Math.sqrt(d) * degreeScale);
    return {
      id: n.id,
      label: n.label,
      ...n.detail === void 0 ? {} : { detail: n.detail },
      attributes: n.attributes,
      epistemic: n.epistemic,
      evidence: n.evidence,
      ...n.uncalibrated_score === void 0 ? {} : { uncalibrated_score: n.uncalibrated_score },
      color: nodeColors[kind] ?? palette.inkDim,
      radius,
      radiusMeaning,
      kind: n.kind,
      nodeGlyph
    };
  });
  const edges = renderableEdges.map((e) => {
    const kind = e.kind;
    const edgeStrokePattern = CORPUS_EDGE_STROKE_PATTERN_BY_KIND[kind];
    if (edgeStrokePattern === void 0) {
      throw new TypeError(
        `corpus knowledge-graph edge ${e.source}\u2192${e.target} has an invalid kind`
      );
    }
    const style = edgeStyles[kind] ?? {
      color: palette.inkFaint,
      directed: true,
      particles: false
    };
    const id2 = "id" in e && typeof e.id === "string" ? e.id : void 0;
    return {
      ...id2 === void 0 ? {} : { id: id2 },
      label: e.label,
      attributes: e.attributes,
      epistemic: e.epistemic,
      evidence: e.evidence,
      ...e.uncalibrated_score === void 0 ? {} : { uncalibrated_score: e.uncalibrated_score },
      source: e.source,
      target: e.target,
      color: edgeColorOverrides[kind] ?? style.color,
      directed: style.directed,
      kind: e.kind,
      particles: style.particles,
      edgeStrokePattern
    };
  });
  assertRenderableGraphEdges(nodes, edges);
  return (0, import_knowledgeGraphPresentation.prepareCorpusKnowledgeGraphPresentation)({
    contract: import_knowledgeGraphPresentation.KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
    profile: "corpus_entity",
    context: {
      graph_id: checkedParams.graph_id,
      graph_source: checkedParams.graph_source,
      graph_snapshot_id: checkedParams.graph_snapshot_id,
      graph_scope: checkedParams.graph_scope,
      generated_at: checkedParams.generated_at
    },
    nodes,
    edges
  });
}

// react/knowledgeGraphLayout.internal.ts
function snapshotGraphLayoutInputs(nodes, edges) {
  const nodeSnapshot = nodes.map(({ id: id2, radius, nodeGlyph }) => ({
    id: id2,
    radius,
    nodeGlyph
  }));
  const edgeSnapshot = edges.map(({
    id: id2,
    source,
    target,
    color,
    kind,
    directed,
    particles,
    edgeStrokePattern
  }) => ({
    id: id2,
    source,
    target,
    color,
    kind,
    directed,
    particles,
    edgeStrokePattern
  }));
  return {
    graphKey: graphSignature(nodeSnapshot, edgeSnapshot),
    nodes: nodeSnapshot,
    edges: edgeSnapshot
  };
}
function planGraphLayoutCache(nodes, remembered, maxRememberedPositions) {
  if (!Number.isSafeInteger(maxRememberedPositions) || maxRememberedPositions < nodes.length) {
    throw new RangeError(
      "max remembered graph positions must be an integer at least as large as the active graph"
    );
  }
  const activeIds = /* @__PURE__ */ new Set();
  const plannedNodes = new Array(nodes.length);
  let warmStart = false;
  for (let index = 0; index < nodes.length; index++) {
    const input = nodes[index];
    if (activeIds.has(input.id)) {
      throw new RangeError("graph layout node ids must be unique");
    }
    activeIds.add(input.id);
    const r = normalizeGraphNodeRadius(input.radius);
    const previous = remembered.get(input.id);
    if (previous === void 0) {
      plannedNodes[index] = { id: input.id, r };
      continue;
    }
    warmStart = true;
    plannedNodes[index] = {
      id: input.id,
      r,
      x: previous[0],
      y: previous[1],
      z: previous[2]
    };
  }
  const makeBuffer = () => {
    const cache = /* @__PURE__ */ new Map();
    for (const [id2, previous] of remembered) {
      cache.set(id2, [previous[0], previous[1], previous[2]]);
    }
    const positionSlots = new Array(nodes.length);
    for (let index = 0; index < nodes.length; index++) {
      const id2 = nodes[index].id;
      const previous = cache.get(id2);
      const slot = previous ?? [0, 0, 0];
      if (previous !== void 0) cache.delete(id2);
      cache.set(id2, slot);
      positionSlots[index] = slot;
    }
    if (cache.size > maxRememberedPositions) {
      for (const id2 of cache.keys()) {
        if (cache.size <= maxRememberedPositions) break;
        if (!activeIds.has(id2)) cache.delete(id2);
      }
    }
    if (cache.size > maxRememberedPositions) {
      throw new Error("active graph positions exceeded the validated cache authority");
    }
    return { cache, positionSlots };
  };
  return {
    nodes: plannedNodes,
    cacheBuffers: [makeBuffer(), makeBuffer()],
    warmStart
  };
}
function publishGraphLayoutCache(authority, buffered, completedBufferIndex) {
  if (completedBufferIndex !== buffered.nextCacheBufferIndex) {
    throw new Error("graph layout cache publication is out of sequence");
  }
  buffered.nextCacheBufferIndex = completedBufferIndex === 0 ? 1 : 0;
  authority.current = buffered.cacheBuffers[completedBufferIndex].cache;
}

// react/focusLabelResource.internal.ts
var THREE = __toESM(require("three"), 1);
var FOCUS_LABEL_MAX_WORLD_WIDTH = 160;
var FOCUS_LABEL_WORLD_HEIGHT = 7;
var FOCUS_LABEL_NODE_GAP = 4;
function knowledgeGraphFocusLabelSpriteCenterY(nodeRadius, nodeGlyph) {
  return -(knowledgeGraphRenderedNodeRadialExtent(nodeRadius, nodeGlyph, true) + FOCUS_LABEL_NODE_GAP) / FOCUS_LABEL_WORLD_HEIGHT;
}
var FOCUS_LABEL_THEME = Object.freeze({
  dark: Object.freeze({
    background: "#030711",
    text: "#e2e8f0"
  }),
  light: Object.freeze({
    background: "#f8fafc",
    text: "#0f172a"
  })
});
function installFocusLabelResource({
  sprite,
  material,
  label,
  color,
  themeMode,
  invalidate,
  createCanvas = () => typeof document === "undefined" ? null : document.createElement("canvas"),
  createTexture = (canvas) => new THREE.CanvasTexture(canvas)
}) {
  sprite.visible = false;
  material.map = null;
  material.needsUpdate = true;
  if (!label) {
    invalidate();
    return void 0;
  }
  const canvas = createCanvas();
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    invalidate();
    return void 0;
  }
  const fontSize = 42;
  const paddingX = 24;
  const paddingY = 14;
  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  const measured = Math.ceil(context.measureText(label).width);
  canvas.width = Math.min(1024, Math.max(96, measured + paddingX * 2));
  canvas.height = fontSize + paddingY * 2;
  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const theme = FOCUS_LABEL_THEME[themeMode];
  context.fillStyle = theme.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = theme.text;
  context.fillStyle = color;
  context.fillText(label, canvas.width / 2, canvas.height / 2, canvas.width - paddingX * 2);
  const texture = createTexture(canvas);
  try {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    material.map = texture;
    material.needsUpdate = true;
    sprite.scale.set(
      Math.min(
        FOCUS_LABEL_MAX_WORLD_WIDTH,
        canvas.width / canvas.height * FOCUS_LABEL_WORLD_HEIGHT
      ),
      FOCUS_LABEL_WORLD_HEIGHT,
      1
    );
    sprite.visible = true;
    invalidate();
  } catch (setupError) {
    if (material.map === texture) {
      material.map = null;
      material.needsUpdate = true;
      sprite.visible = false;
    }
    try {
      texture.dispose();
    } catch (disposeError) {
      throw new AggregateError(
        [setupError, disposeError],
        "focus-label setup and rollback both failed"
      );
    }
    throw setupError;
  }
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    let shouldInvalidate = false;
    if (material.map === texture) {
      material.map = null;
      material.needsUpdate = true;
      sprite.visible = false;
      shouldInvalidate = true;
    }
    let disposeFailed = false;
    let disposeError;
    try {
      texture.dispose();
    } catch (error) {
      disposeFailed = true;
      disposeError = error;
    }
    let invalidateFailed = false;
    let invalidateError;
    if (shouldInvalidate) {
      try {
        invalidate();
      } catch (error) {
        invalidateFailed = true;
        invalidateError = error;
      }
    }
    if (disposeFailed && invalidateFailed) {
      throw new AggregateError(
        [disposeError, invalidateError],
        "focus-label disposal and invalidation both failed"
      );
    }
    if (disposeFailed) throw disposeError;
    if (invalidateFailed) throw invalidateError;
  };
}

// react/KnowledgeGraph3DScene.tsx
var import_knowledgeGraphPresentation6 = require("#cortexel-knowledge-graph-presentation-capability");

// react/knowledgeGraphPresentationProps.internal.ts
function hasWellFormedUtf16(value) {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 55296 && unit <= 56319) {
      if (index + 1 >= value.length) return false;
      const next = value.charCodeAt(index + 1);
      if (next < 56320 || next > 57343) return false;
      index += 1;
    } else if (unit >= 56320 && unit <= 57343) {
      return false;
    }
  }
  return true;
}
function assertKnowledgeGraphNodeReference(value, label) {
  if (value === null) return;
  if (typeof value !== "string" || value.length < 1 || value.length > KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength || !hasWellFormedUtf16(value) || !SAFE_DISPLAY_STRING_PATTERN.test(value)) {
    throw new TypeError(
      `${label} must be a non-empty well-formed display-safe string <= ${KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength} characters or null`
    );
  }
}
function assertKnowledgeGraphColor(value, label) {
  if (value === void 0) return;
  if (typeof value !== "string" || value.length < 1 || value.length > KNOWLEDGE_GRAPH_LIMITS.maxColorLength || !hasWellFormedUtf16(value) || !SAFE_DISPLAY_STRING_PATTERN.test(value)) {
    throw new TypeError(
      `${label} must be a non-empty well-formed display-safe string <= ${KNOWLEDGE_GRAPH_LIMITS.maxColorLength} characters`
    );
  }
}

// react/knowledgeGraphInteraction.internal.ts
var KNOWLEDGE_GRAPH_CLICK_MAX_DELTA = 2;
function isKnowledgeGraphInstanceId(instanceId, instanceCount) {
  return instanceId !== void 0 && instanceId !== null && Number.isSafeInteger(instanceId) && instanceId >= 0 && Number.isSafeInteger(instanceCount) && instanceCount >= 0 && instanceId < instanceCount;
}
function isIntentionalKnowledgeGraphClick(delta) {
  return Number.isFinite(delta) && delta >= 0 && delta <= KNOWLEDGE_GRAPH_CLICK_MAX_DELTA;
}
function handleKnowledgeGraphNodeClick(ready, instanceId, instanceCount, delta, stopPropagation, activate) {
  if (!ready || !isKnowledgeGraphInstanceId(instanceId, instanceCount)) return;
  stopPropagation();
  if (isIntentionalKnowledgeGraphClick(delta)) activate(instanceId);
}
function toggledKnowledgeGraphSelection(selectedId, activatedId) {
  return selectedId === activatedId ? null : activatedId;
}
function hasCompleteStartEventSurface(value) {
  return value !== null && typeof value.addEventListener === "function" && typeof value.removeEventListener === "function";
}
function synchronizeKnowledgeGraphControlsListener(authority, candidate, listener) {
  const previous = authority.current;
  const attachableCandidate = hasCompleteStartEventSurface(candidate) ? candidate : null;
  if (previous === attachableCandidate) return;
  if (hasCompleteStartEventSurface(previous)) {
    previous.removeEventListener("start", listener);
  }
  authority.current = null;
  if (attachableCandidate) {
    try {
      attachableCandidate.addEventListener("start", listener);
    } catch (addError) {
      authority.current = attachableCandidate;
      try {
        attachableCandidate.removeEventListener("start", listener);
      } catch (rollbackError) {
        throw new AggregateError(
          [addError, rollbackError],
          "controls-listener attachment and rollback both failed"
        );
      }
      authority.current = null;
      throw addError;
    }
    authority.current = attachableCandidate;
  }
}
function beginKnowledgeGraphRuntimeTransition(readyGraphKey, geometryDirty, group, invalidate, clearHover) {
  readyGraphKey.current = null;
  geometryDirty.current = true;
  if (group) group.visible = false;
  let invalidateFailed = false;
  let invalidateError;
  try {
    invalidate();
  } catch (error) {
    invalidateFailed = true;
    invalidateError = error;
  }
  let hoverFailed = false;
  let hoverError;
  try {
    clearHover();
  } catch (error) {
    hoverFailed = true;
    hoverError = error;
  }
  if (invalidateFailed && hoverFailed) {
    throw new AggregateError(
      [invalidateError, hoverError],
      "graph invalidation and hover cleanup both failed"
    );
  }
  if (invalidateFailed) throw invalidateError;
  if (hoverFailed) throw hoverError;
}
function handleKnowledgeGraphPointerOut(ready, stopPropagation, clearHover) {
  if (ready) stopPropagation();
  clearHover();
}

// react/knowledgeGraphCamera.internal.ts
var KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN = 1.12;
var KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE = 120;
var KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN = 1.25;
var KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR = 1e-3;
var IDENTITY_MATRIX_ELEMENTS = Object.freeze([
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1
]);
function finiteEqual(observed, expected) {
  if (!Number.isFinite(observed) || !Number.isFinite(expected)) return false;
  const scale = Math.max(1, Math.abs(observed), Math.abs(expected));
  return Math.abs(observed - expected) <= Number.EPSILON * 64 * scale;
}
function isKnowledgeGraphIdentityMatrixElements(elements) {
  if (elements.length !== 16) return false;
  for (let index = 0; index < 16; index++) {
    if (!finiteEqual(elements[index], IDENTITY_MATRIX_ELEMENTS[index])) return false;
  }
  return true;
}
function areKnowledgeGraphMatrixElementsEqual(first, second) {
  if (first.length !== 16 || second.length !== 16) return false;
  for (let index = 0; index < 16; index++) {
    if (!finiteEqual(first[index], second[index])) return false;
  }
  return true;
}
function isKnowledgeGraphCameraSelfTransformCanonical(input) {
  const { position, quaternion, scale } = input;
  if (!input.matrixAutoUpdate || !isKnowledgeGraphCameraVectorFinite(position.x, position.y, position.z) || !isKnowledgeGraphCameraVectorFinite(scale.x, scale.y, scale.z) || scale.x !== 1 || scale.y !== 1 || scale.z !== 1 || !Number.isFinite(quaternion.x) || !Number.isFinite(quaternion.y) || !Number.isFinite(quaternion.z) || !Number.isFinite(quaternion.w) || input.matrix.elements.length !== 16 || input.matrixWorld.elements.length !== 16) return false;
  const norm = quaternion.x * quaternion.x + quaternion.y * quaternion.y + quaternion.z * quaternion.z + quaternion.w * quaternion.w;
  if (!finiteEqual(norm, 1)) return false;
  const x2 = quaternion.x + quaternion.x;
  const y2 = quaternion.y + quaternion.y;
  const z22 = quaternion.z + quaternion.z;
  const xx = quaternion.x * x2;
  const xy = quaternion.x * y2;
  const xz = quaternion.x * z22;
  const yy = quaternion.y * y2;
  const yz = quaternion.y * z22;
  const zz = quaternion.z * z22;
  const wx = quaternion.w * x2;
  const wy = quaternion.w * y2;
  const wz = quaternion.w * z22;
  const matrix = input.matrix.elements;
  if (!(finiteEqual(matrix[0], 1 - (yy + zz)) && finiteEqual(matrix[1], xy + wz) && finiteEqual(matrix[2], xz - wy) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], xy - wz) && finiteEqual(matrix[5], 1 - (xx + zz)) && finiteEqual(matrix[6], yz + wx) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], xz + wy) && finiteEqual(matrix[9], yz - wx) && finiteEqual(matrix[10], 1 - (xx + yy)) && finiteEqual(matrix[11], 0) && finiteEqual(matrix[12], position.x) && finiteEqual(matrix[13], position.y) && finiteEqual(matrix[14], position.z) && finiteEqual(matrix[15], 1))) return false;
  return areKnowledgeGraphMatrixElementsEqual(matrix, input.matrixWorld.elements);
}
function isKnowledgeGraphCameraParentChainIdentity(parent) {
  let cursor = parent;
  let depth = 0;
  while (cursor !== null) {
    depth++;
    if (depth > 64) return false;
    if (cursor.position.x !== 0 || cursor.position.y !== 0 || cursor.position.z !== 0 || cursor.quaternion.x !== 0 || cursor.quaternion.y !== 0 || cursor.quaternion.z !== 0 || cursor.quaternion.w !== 1 || cursor.scale.x !== 1 || cursor.scale.y !== 1 || cursor.scale.z !== 1 || !isKnowledgeGraphIdentityMatrixElements(cursor.matrix.elements) || !isKnowledgeGraphIdentityMatrixElements(cursor.matrixWorld.elements)) return false;
    cursor = cursor.parent;
  }
  return true;
}
function canonicalPerspectiveProjection(input) {
  if (!Number.isFinite(input.fovDegrees) || input.fovDegrees <= 0 || input.fovDegrees >= 180 || !Number.isFinite(input.aspect) || input.aspect <= 0 || !Number.isFinite(input.zoom) || input.zoom <= 0 || !Number.isFinite(input.near) || input.near <= 0 || !Number.isFinite(input.far) || input.far <= input.near || !Number.isFinite(input.filmOffset) || input.filmOffset !== 0 || input.projectionMatrixElements.length !== 16) return false;
  const halfFov = input.fovDegrees * Math.PI / 360;
  const y = input.zoom / Math.tan(halfFov);
  const x = y / input.aspect;
  const c = -(input.far + input.near) / (input.far - input.near);
  const d = -2 * input.far * input.near / (input.far - input.near);
  const matrix = input.projectionMatrixElements;
  return finiteEqual(matrix[0], x) && finiteEqual(matrix[1], 0) && finiteEqual(matrix[2], 0) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], 0) && finiteEqual(matrix[5], y) && finiteEqual(matrix[6], 0) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], 0) && finiteEqual(matrix[9], 0) && finiteEqual(matrix[10], c) && finiteEqual(matrix[11], -1) && finiteEqual(matrix[12], 0) && finiteEqual(matrix[13], 0) && finiteEqual(matrix[14], d) && finiteEqual(matrix[15], 0);
}
function canonicalOrthographicProjection(input) {
  if (!Number.isFinite(input.left) || !Number.isFinite(input.right) || !Number.isFinite(input.top) || !Number.isFinite(input.bottom) || input.right <= input.left || input.top <= input.bottom || !finiteEqual(input.left, -input.right) || !finiteEqual(input.bottom, -input.top) || !Number.isFinite(input.zoom) || input.zoom <= 0 || !Number.isFinite(input.near) || input.near < 0 || !Number.isFinite(input.far) || input.far <= input.near || input.projectionMatrixElements.length !== 16) return false;
  const x = 2 * input.zoom / (input.right - input.left);
  const y = 2 * input.zoom / (input.top - input.bottom);
  const c = -2 / (input.far - input.near);
  const d = -(input.far + input.near) / (input.far - input.near);
  const matrix = input.projectionMatrixElements;
  return finiteEqual(matrix[0], x) && finiteEqual(matrix[1], 0) && finiteEqual(matrix[2], 0) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], 0) && finiteEqual(matrix[5], y) && finiteEqual(matrix[6], 0) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], 0) && finiteEqual(matrix[9], 0) && finiteEqual(matrix[10], c) && finiteEqual(matrix[11], 0) && finiteEqual(matrix[12], 0) && finiteEqual(matrix[13], 0) && finiteEqual(matrix[14], d) && finiteEqual(matrix[15], 1);
}
function isKnowledgeGraphCenteredAutoFrameProjectionSupported(input) {
  if (input.isArrayCamera || input.viewEnabled || !input.parentTransformIdentity || !input.selfTransformCanonical || !input.cameraMethodsCanonical || !input.projectionMethodCanonical || !input.webGlCoordinateSystem) return false;
  if (input.kind === "perspective") {
    return input.effectiveFovMethodCanonical && canonicalPerspectiveProjection(input);
  }
  return canonicalOrthographicProjection(input);
}
function isKnowledgeGraphPerspectiveProjectionReady(effectiveFovDegrees, aspect) {
  return Number.isFinite(effectiveFovDegrees) && effectiveFovDegrees > 0 && effectiveFovDegrees < 180 && Number.isFinite(aspect) && aspect > 0;
}
function isKnowledgeGraphOrthographicProjectionReady(horizontalSpan, verticalSpan, zoom) {
  return Number.isFinite(horizontalSpan) && horizontalSpan > 0 && Number.isFinite(verticalSpan) && verticalSpan > 0 && Number.isFinite(zoom) && zoom > 0;
}
function isKnowledgeGraphCameraVectorFinite(x, y, z5) {
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z5);
}
function knowledgeGraphCameraProjectionKind(camera) {
  const perspective = camera.isPerspectiveCamera === true;
  const orthographic = camera.isOrthographicCamera === true;
  if (perspective === orthographic) return null;
  if (perspective) return "perspective";
  if (orthographic) return "orthographic";
  return null;
}
function planKnowledgeGraphCameraClippingInto(kind, currentNearValue, currentFarValue, distanceValue, contentRadiusValue, target) {
  const radius = positiveFinite(contentRadiusValue, 1);
  const distance = positiveFinite(
    distanceValue,
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE
  );
  const minimumNear = kind === "perspective" ? KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR : 0;
  const maximumNear = Math.max(
    minimumNear,
    distance - radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN
  );
  const fallbackNear = kind === "perspective" ? Math.min(0.1, maximumNear) : 0;
  const currentNear = Number.isFinite(currentNearValue) && currentNearValue >= minimumNear ? currentNearValue : fallbackNear;
  const near = Math.min(currentNear, maximumNear);
  const requiredFar = Math.max(
    near + KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR,
    distance + radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN
  );
  const currentFar = Number.isFinite(currentFarValue) && currentFarValue > near ? currentFarValue : requiredFar;
  target.near = near;
  target.far = Math.max(currentFar, requiredFar);
  return target;
}
function positiveFinite(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
function planKnowledgeGraphPerspectiveCameraFitInto(contentRadius, currentCameraDistance, verticalFovDegrees, aspectRatio, target) {
  const radius = positiveFinite(contentRadius, 1);
  positiveFinite(currentCameraDistance, 0);
  const paddedRadius = radius * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN;
  const verticalFov = positiveFinite(verticalFovDegrees, 50);
  const aspect = positiveFinite(aspectRatio, 1);
  const verticalHalf = Math.min(89.5, Math.max(0.5, verticalFov / 2)) * Math.PI / 180;
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect);
  const limitingHalf = Math.max(1e-6, Math.min(
    verticalHalf,
    horizontalHalf
  ));
  const fitDistance = paddedRadius / Math.sin(limitingHalf);
  target.distance = Math.max(
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE,
    fitDistance
  );
  target.orthographicZoom = void 0;
  return target;
}
function planKnowledgeGraphOrthographicCameraFitInto(contentRadius, currentCameraDistance, horizontalSpan, verticalSpan, currentCameraZoom, target) {
  const radius = positiveFinite(contentRadius, 1);
  positiveFinite(currentCameraDistance, 0);
  const paddedRadius = radius * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN;
  const horizontalHalf = positiveFinite(horizontalSpan, 2) / 2;
  const verticalHalf = positiveFinite(verticalSpan, 2) / 2;
  const fitZoom = Math.min(horizontalHalf, verticalHalf) / paddedRadius;
  const currentZoom = positiveFinite(currentCameraZoom, 1);
  target.distance = Math.max(
    KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE,
    paddedRadius * 2
  );
  target.orthographicZoom = positiveFinite(fitZoom, currentZoom);
  return target;
}

// react/knowledgeGraphParticles.internal.ts
var KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND = 0.28;
var MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS = 0.1;
function advanceKnowledgeGraphFlowPhase(currentPhase, deltaSeconds) {
  const normalized = Number.isFinite(currentPhase) ? (currentPhase % 1 + 1) % 1 : 0;
  const delta = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? Math.min(deltaSeconds, MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS) : 0;
  return (normalized + delta * KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND) % 1;
}
function reducedMotionFlowParticleFraction(particleIndex, particlesOnEdge) {
  if (!Number.isSafeInteger(particlesOnEdge) || particlesOnEdge < 1 || !Number.isSafeInteger(particleIndex) || particleIndex < 0 || particleIndex >= particlesOnEdge) {
    throw new RangeError(
      "reduced-motion particle index must belong to a positive finite allocation"
    );
  }
  return (particleIndex + 1) / (particlesOnEdge + 1);
}
function planFlowParticleDistribution(flowEdgeCount, requestedPerEdge, maxParticles) {
  const edges = Number.isFinite(flowEdgeCount) ? Math.max(0, Math.floor(flowEdgeCount)) : 0;
  const total = flowParticleCount(edges, requestedPerEdge, maxParticles);
  if (edges === 0) return { total: 0, basePerEdge: 0, extraEdgeCount: 0 };
  if (total < edges) {
    throw new RangeError("flow-particle cap must retain at least one marker per edge");
  }
  const basePerEdge = Math.floor(total / edges);
  return {
    total,
    basePerEdge,
    extraEdgeCount: total - basePerEdge * edges
  };
}

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
  if (!Number.isFinite(t)) throw new RangeError("colormap sample t must be finite");
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function sampleStops(stops, t) {
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
  if (name !== "turbo" && !Object.hasOwn(STOP_RGB, name)) {
    throw new RangeError(`unknown colormap '${String(name)}'`);
  }
  if (name === "turbo") return turbo(t);
  return sampleStops(STOP_RGB[name], t);
}
function colormapHex(name, t) {
  const [r, g, b] = sampleColormap(name, t);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
var PALETTE_REGISTRY_POLICY = Object.freeze({
  version: "1",
  validation: "selected palette name must exist in the active runtime registry",
  manifestPalettes: "build-time discovery snapshot only",
  runtimeExtensionsAllowed: true,
  registration: "strict descriptor snapshot, validated then frozen",
  fallbackIsNotValidation: true
});
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
Object.freeze(CORTEXEL_PALETTE);
var SEMANTIC_PALETTE_KEYS = Object.freeze(
  Object.keys(CORTEXEL_PALETTE)
);
var HEX_RE = /^#[0-9a-fA-F]{6}$/;
function snapshotPalette(p) {
  if (p === null || typeof p !== "object" || Array.isArray(p)) {
    throw new TypeError("palette must be an object");
  }
  const prototype = Object.getPrototypeOf(p);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("palette must be a plain object");
  }
  const ownKeys = Reflect.ownKeys(p);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    throw new Error("Palette may not contain symbol keys");
  }
  const keys = ownKeys;
  const missing = SEMANTIC_PALETTE_KEYS.filter((key) => !keys.includes(key));
  const extra = keys.filter(
    (key) => !SEMANTIC_PALETTE_KEYS.includes(key)
  );
  if (missing.length > 0) throw new Error(`Palette is missing colors: ${missing.join(", ")}`);
  if (extra.length > 0) throw new Error(`Palette has unknown colors: ${extra.join(", ")}`);
  const snapshot = {};
  for (const key of SEMANTIC_PALETTE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(p, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      throw new Error(`Palette color '${key}' must be an enumerable data property`);
    }
    const val = descriptor.value;
    if (typeof val !== "string") {
      throw new Error(`Palette color '${key}' must be a string`);
    }
    if (!HEX_RE.test(val)) {
      throw new Error(`Palette color '${key}' is not a valid #rrggbb hex: '${val}'`);
    }
    snapshot[key] = val;
  }
  if (snapshot.excitatory.toLowerCase() === snapshot.inhibitory.toLowerCase()) {
    throw new Error("Palette excitatory and inhibitory colors must differ");
  }
  if (snapshot.ltp.toLowerCase() === snapshot.ltd.toLowerCase()) {
    throw new Error("Palette ltp and ltd colors must differ");
  }
  return snapshot;
}
function validatePalette(p) {
  snapshotPalette(p);
}
_paletteRegistry.set("crameri", Object.freeze({
  palette: CORTEXEL_PALETTE,
  metadata: Object.freeze({
    label: "Crameri",
    source: "Crameri 2018, Nature Comms 2020 (batlow + vik)",
    diverging: true
  })
}));
function getPalette(name = "crameri") {
  const entry = _paletteRegistry.get(name);
  if (entry) return entry.palette;
  const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  if (name && name !== "crameri" && !isProduction) {
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

// core/vizSpec.ts
var import_zod2 = require("zod");

// core/designLaws.ts
var SCENE_NAMES = Object.freeze([
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
  "population-rate",
  "correlogram",
  "weight-histogram",
  "connection-matrix",
  "degree-distribution",
  "delay-distribution",
  "spatial-map-2d",
  "knowledge-graph-3d"
]);

// core/vizSpec.ts
var CORTEXEL_SPEC_VERSION = "1.5.0";
var CORTEXEL_JSON_LIMITS = Object.freeze({
  maxDepth: 32,
  maxNodes: 5e5,
  maxObjectKeys: 1e4,
  maxStringLength: 1e5,
  maxTotalStringLength: 5e6
});
var CORTEXEL_JSON_POLICY = Object.freeze({
  finiteNumbersOnly: true,
  rejectNegativeZero: true,
  plainObjectsOnly: true,
  enumerableDataPropertiesOnly: true,
  rejectAccessors: true,
  rejectSymbolKeys: true,
  rejectSparseArrays: true,
  rejectNamedArrayProperties: true,
  rejectCircularReferences: true,
  rejectRawJson: true,
  duplicateObjectMemberNames: "reject before materialization",
  rawJsonParsingPrecondition: "detect duplicate member names in raw JSON text before converting to an object",
  rejectedObjectKeys: Object.freeze(["__proto__"])
});
var STRING_NORMALIZATION_POLICY = Object.freeze({
  version: "1",
  lengthModel: "ECMAScript UTF-16 code units",
  portableLengthKeyword: "x-cortexel-max-utf16-code-units",
  trimAlgorithm: "ECMA-262 String.prototype.trim / TrimString",
  trimCodePointsHex: Object.freeze([
    "0009-000D",
    "0020",
    "00A0",
    "1680",
    "2000-200A",
    "2028",
    "2029",
    "202F",
    "205F",
    "3000",
    "FEFF"
  ]),
  regexDialect: "ECMA-262 Unicode-aware regular expressions",
  unicodeNormalization: "none",
  wellFormedUnicodeOnly: true,
  displayStringPattern: SAFE_DISPLAY_STRING_PATTERN.source,
  displayStringControls: "reject C0/C1, bidi, zero-width, and BOM controls"
});
var NUMERIC_MODEL_POLICY = Object.freeze({
  version: "1",
  representation: "IEEE-754 binary64",
  coerceBeforeValidation: true,
  finiteOnly: true,
  negativeZeroRejected: true,
  integerIdentityFields: "safe integers only",
  constraintEvaluationUsesCoercedValues: true
});
var JSON_BUDGET_SEMANTICS = Object.freeze({
  version: "1",
  scope: "one snapshot of the complete invocation envelope",
  rootDepth: 0,
  nodeCount: "every scalar, array, and object value; property names are not nodes",
  objectKeyCount: "per object",
  stringLengthModel: "UTF-16 code units",
  totalStringLength: "all string values plus every object property name",
  repeatedReference: "counted once per JSON occurrence; cycles reject"
});
var JSON_PARAMS_PORTABLE_SCHEMA = Object.freeze({
  type: "object",
  maxProperties: CORTEXEL_JSON_LIMITS.maxObjectKeys,
  propertyNames: Object.freeze({
    type: "string",
    maxLength: CORTEXEL_JSON_LIMITS.maxStringLength,
    "x-cortexel-max-utf16-code-units": CORTEXEL_JSON_LIMITS.maxStringLength,
    not: Object.freeze({ const: "__proto__" })
  }),
  additionalProperties: true
});
var DECLARED_INPUTS_PORTABLE_SCHEMA = Object.freeze({
  type: "object",
  maxProperties: 64,
  propertyNames: Object.freeze({
    type: "string",
    minLength: 1,
    maxLength: 80,
    "x-cortexel-max-utf16-code-units": 80,
    allOf: Object.freeze([
      Object.freeze({ pattern: "^\\S(?:[\\s\\S]*\\S)?$" }),
      Object.freeze({ pattern: SAFE_DISPLAY_STRING_PATTERN.source })
    ])
  }),
  additionalProperties: Object.freeze({
    anyOf: Object.freeze([
      Object.freeze({
        type: "string",
        maxLength: 5e3,
        "x-cortexel-max-utf16-code-units": 5e3,
        pattern: SAFE_DISPLAY_STRING_PATTERN.source
      }),
      Object.freeze({ type: "number" }),
      Object.freeze({ type: "boolean", const: true })
    ])
  })
});
var ENVELOPE_NORMALIZATION_POLICY = Object.freeze({
  version: "1",
  evaluationOrder: Object.freeze([
    "parse/coerce every JSON number to IEEE-754 binary64",
    "validate and snapshot the raw envelope with exact-JSON budgets",
    "normalize fields carrying x-cortexel-normalize",
    "materialize envelope defaults",
    "validate the envelope JSON Schema",
    "validate skill params, provenance values, and portable constraints",
    "derive and display the mandatory honesty caption"
  ]),
  vizSpecDefaults: Object.freeze({
    params: Object.freeze({}),
    mode: "interactive",
    themeMode: "dark"
  }),
  honestyDefaults: Object.freeze({
    calibrated_posterior: false,
    advisory_only: true,
    is_paper_local_evidence: false,
    synthetic: false
  }),
  jsonSchemaDefaultsAreAnnotations: true,
  missingHonestyFlagsMustUseConservativeDefaults: true
});
var normalizedRecordKey2 = import_zod2.z.string().min(1).max(80).regex(
  /^\S(?:[\s\S]*\S)?$/,
  "record keys must already be trimmed and contain a non-whitespace character"
).regex(SAFE_DISPLAY_STRING_PATTERN, "record keys must not contain display control characters");
function cloneExactJson(root) {
  const ancestors = /* @__PURE__ */ new WeakSet();
  let visited = 0;
  let totalStringLength = 0;
  const fail = (path, message) => ({
    ok: false,
    issue: { path, message }
  });
  function inspectString(value, path) {
    if (value.length > CORTEXEL_JSON_LIMITS.maxStringLength) {
      return {
        path,
        message: `JSON string exceeds ${CORTEXEL_JSON_LIMITS.maxStringLength} characters`
      };
    }
    totalStringLength += value.length;
    if (totalStringLength > CORTEXEL_JSON_LIMITS.maxTotalStringLength) {
      return {
        path,
        message: `JSON strings exceed ${CORTEXEL_JSON_LIMITS.maxTotalStringLength} total characters`
      };
    }
    for (let index = 0; index < value.length; index++) {
      const codeUnit = value.charCodeAt(index);
      if (codeUnit >= 55296 && codeUnit <= 56319) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 56320 && next <= 57343)) {
          return { path, message: "strings must not contain an unpaired high surrogate" };
        }
        index += 1;
      } else if (codeUnit >= 56320 && codeUnit <= 57343) {
        return { path, message: "strings must not contain an unpaired low surrogate" };
      }
    }
    return null;
  }
  function visit(value, path, depth) {
    visited += 1;
    if (visited > CORTEXEL_JSON_LIMITS.maxNodes) {
      return fail(path, `JSON value exceeds ${CORTEXEL_JSON_LIMITS.maxNodes} nodes`);
    }
    if (depth > CORTEXEL_JSON_LIMITS.maxDepth) {
      return fail(path, `JSON nesting exceeds ${CORTEXEL_JSON_LIMITS.maxDepth} levels`);
    }
    if (value === null || typeof value === "boolean") {
      return { ok: true, value };
    }
    if (typeof value === "string") {
      const issue = inspectString(value, path);
      return issue ? { ok: false, issue } : { ok: true, value };
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return fail(path, "JSON numbers must be finite (NaN/Infinity are not allowed)");
      }
      return Object.is(value, -0) ? fail(path, "negative zero is not stable through JSON.stringify") : { ok: true, value };
    }
    if (typeof value !== "object") {
      return fail(path, `value of type '${typeof value}' is not JSON-serializable`);
    }
    const object = value;
    if (ancestors.has(object)) return fail(path, "circular JSON reference");
    ancestors.add(object);
    try {
      const isRawJson = JSON.isRawJSON;
      if (isRawJson?.(value)) {
        return fail(path, "JSON.rawJSON values are not literal objects and are not allowed");
      }
      if (Array.isArray(value)) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
        if (!lengthDescriptor || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
          return fail(path, "JSON arrays must have an ordinary non-negative length");
        }
        const length = lengthDescriptor.value;
        if (length > CORTEXEL_JSON_LIMITS.maxNodes - visited) {
          return fail(path, `JSON value exceeds ${CORTEXEL_JSON_LIMITS.maxNodes} nodes`);
        }
        const ownKeys2 = Reflect.ownKeys(value);
        for (const key of ownKeys2) {
          if (key === "length") continue;
          if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length) {
            return fail(
              path,
              "JSON arrays may not carry symbol, named, or out-of-range properties"
            );
          }
        }
        const clone2 = new Array(length);
        for (let i = 0; i < length; i++) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
          if (!descriptor) {
            return fail([...path, i], "sparse arrays are not allowed in exact JSON");
          }
          if (!("value" in descriptor) || !descriptor.enumerable) {
            return fail(
              [...path, i],
              "JSON array entries must be enumerable data properties, not accessors"
            );
          }
          const nested = visit(descriptor.value, [...path, i], depth + 1);
          if (!nested.ok) return nested;
          clone2[i] = nested.value;
        }
        return { ok: true, value: clone2 };
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail(path, "exact JSON must contain plain objects, not class instances");
      }
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) => typeof key === "symbol")) {
        return fail(path, "JSON objects may not contain symbol keys");
      }
      const keys = ownKeys;
      if (keys.length > CORTEXEL_JSON_LIMITS.maxObjectKeys) {
        return fail(path, `JSON object exceeds ${CORTEXEL_JSON_LIMITS.maxObjectKeys} keys`);
      }
      const clone = {};
      for (const key of keys) {
        if (key === "__proto__") {
          return fail(
            [...path, key],
            "the '__proto__' key is not preserved by the runtime schema parser"
          );
        }
        const keyIssue = inspectString(key, [...path, key]);
        if (keyIssue) return { ok: false, issue: keyIssue };
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          return fail(
            [...path, key],
            "JSON object fields must be enumerable data properties, not accessors"
          );
        }
        const nested = visit(descriptor.value, [...path, key], depth + 1);
        if (!nested.ok) return nested;
        Object.defineProperty(clone, key, {
          value: nested.value,
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
      return { ok: true, value: clone };
    } finally {
      ancestors.delete(object);
    }
  }
  return visit(root, [], 0);
}
var JsonParamsSchema = import_zod2.z.unknown().transform((params, ctx) => {
  const result = cloneExactJson(params);
  if (!result.ok) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: result.issue.path,
      message: result.issue.message
    });
    return import_zod2.z.NEVER;
  }
  if (result.value === null || typeof result.value !== "object" || Array.isArray(result.value)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      message: "exact JSON envelope must be a plain object"
    });
    return import_zod2.z.NEVER;
  }
  return result.value;
});
var ProvenanceSchema = import_zod2.z.object({
  source: import_zod2.z.string().trim().min(1).max(200).regex(SAFE_DISPLAY_STRING_PATTERN),
  calibrated_posterior: import_zod2.z.literal(false).default(false),
  // fail-closed + portable
  advisory_only: import_zod2.z.boolean().default(true),
  is_paper_local_evidence: import_zod2.z.boolean().default(false),
  caption: import_zod2.z.string().trim().max(500).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  /** Machine-checkable record of the inputs an agent declared. Keys are
   *  open here (lenient envelope) — validateSkillInvocation enforces the
   *  closed ProvenanceKey set a skill demands, so an unknown key surfaces as a
   *  clear missing_provenance error rather than zod's opaque invalid_key.
   *  The strict gate closes the key set, validates every present known value,
   *  and checks portable params↔claim consistency; factual truth remains the
   *  producer's responsibility. */
  declared_inputs: JsonParamsSchema.pipe(
    import_zod2.z.record(
      normalizedRecordKey2,
      import_zod2.z.union([
        import_zod2.z.string().max(5e3).regex(SAFE_DISPLAY_STRING_PATTERN),
        import_zod2.z.number(),
        import_zod2.z.literal(true)
      ])
    )
  ).refine((inputs) => Object.keys(inputs).length <= 64, {
    message: "declared_inputs may contain at most 64 keys"
  }).optional(),
  /** Explicit synthetic/illustrative discriminator — forces the schematic
   *  caption regardless of the other flags. */
  synthetic: import_zod2.z.boolean().default(false)
}).strict();
var VizSpecSchema = import_zod2.z.object({
  scene: import_zod2.z.enum(SCENE_NAMES),
  /** Optional self-describing skill id (e.g. 'nest.spike_raster'). When present,
   *  a stored spec is independently re-validatable and its honesty caption is
   *  deterministic: validateSkillInvocation cross-checks it, and VizSpecRenderer
   *  uses it when no explicit `skillId` prop is passed. Scene→skill is many-to-one
   *  (voltage-trace ← voltage_trace AND astrocyte_dynamics), so the scene alone
   *  cannot recover the skill — this field closes that gap. */
  skill: import_zod2.z.string().trim().min(1).max(80).regex(SAFE_DISPLAY_STRING_PATTERN, "skill must not contain display control characters").optional(),
  /** Optional contract version this spec targets (see CORTEXEL_SPEC_VERSION). */
  specVersion: import_zod2.z.literal(CORTEXEL_SPEC_VERSION).optional(),
  // Scene-specific data/options. The envelope path guarantees bounded literal
  // JSON; the strict agent path `validateSkillInvocation` additionally enforces
  // the per-skill shape and cross-field invariants before render.
  params: JsonParamsSchema.default({}),
  mode: import_zod2.z.enum(["interactive", "export"]).default("interactive"),
  themeMode: import_zod2.z.enum(["dark", "light"]).default("dark"),
  camera: import_zod2.z.enum(["default", "top", "side", "close", "cinematic"]).optional(),
  /** Optional palette hint — an agent can request a named semantic palette
   *  (e.g. 'crameri', 'okabe-ito'). On the strict skill path an unregistered name
   *  is rejected with 'unknown_palette'; on the lenient validateVizSpec path an
   *  unregistered name is tolerated and getPalette falls back to the default (with
   *  a dev-mode warning). When absent, the host's active palette is used. */
  palette: import_zod2.z.string().trim().min(1).max(60).regex(SAFE_DISPLAY_STRING_PATTERN, "palette must not contain display control characters").optional(),
  provenance: ProvenanceSchema
}).strict();
function validateVizSpec(input) {
  try {
    const exact = JsonParamsSchema.safeParse(input);
    if (!exact.success) {
      return {
        ok: false,
        errors: formatValidationIssues(exact.error.issues)
      };
    }
    const result = VizSpecSchema.safeParse(exact.data);
    if (result.success) return { ok: true, spec: result.data };
    return {
      ok: false,
      errors: formatValidationIssues(result.error.issues)
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        `(root): validation could not safely inspect the payload: ${safeErrorMessage(error)}`
      ]
    };
  }
}

// core/skills/registry.ts
var import_zod4 = require("zod");

// core/skills/skillIds.ts
var NEST_SKILL_IDS = Object.freeze([
  "nest.voltage_trace",
  "nest.spike_raster",
  "nest.isi_distribution",
  "nest.psth",
  "nest.population_rate",
  "nest.rate_response",
  "nest.connectivity_matrix",
  "nest.connection_graph",
  "nest.adjacency_matrix",
  "nest.weight_matrix",
  "nest.delay_matrix",
  "nest.in_degree_distribution",
  "nest.out_degree_distribution",
  "nest.delay_distribution",
  "nest.weight_histogram",
  "nest.spatial_2d",
  "nest.spatial_map_2d",
  "nest.spatial_3d",
  "nest.plasticity_dynamics",
  "nest.phase_plane",
  "nest.correlogram",
  "nest.stimulus_response",
  "nest.astrocyte_dynamics",
  "nest.compartmental_dynamics",
  "nest.animation_replay",
  "corpus.knowledge_graph"
]);
var SKILL_IDS = NEST_SKILL_IDS;
var NEST_DEVICE_FAMILIES = Object.freeze([
  "multimeter",
  "spike_recorder",
  "correlation_detector",
  "get_connections",
  "get_position",
  "weight_recorder",
  "computed",
  // no NEST device — numerically derived (phase plane, replay frames)
  "corpus"
  // no NEST device — corpus/KG structural graph (papers, models, families)
]);
function isSkillId(value) {
  return typeof value === "string" && SKILL_IDS.includes(value);
}
var VALID_RENDERER_ROUTES = Object.freeze([
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
]);

// core/skills/provenanceKeys.ts
var import_zod3 = require("zod");

// src/core/sha256.ts
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var rotr = (x, n) => x >>> n | x << 32 - n;
function sha256Bytes(message) {
  const h = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  const bitLength = message.length * 8;
  const paddedLength = (message.length + 8 >> 6) + 1 << 6;
  const block = new Uint8Array(paddedLength);
  block.set(message);
  block[message.length] = 128;
  const hi = Math.floor(bitLength / 4294967296);
  const lo = bitLength >>> 0;
  const lengthOffset = paddedLength - 8;
  block[lengthOffset] = hi >>> 24 & 255;
  block[lengthOffset + 1] = hi >>> 16 & 255;
  block[lengthOffset + 2] = hi >>> 8 & 255;
  block[lengthOffset + 3] = hi & 255;
  block[lengthOffset + 4] = lo >>> 24 & 255;
  block[lengthOffset + 5] = lo >>> 16 & 255;
  block[lengthOffset + 6] = lo >>> 8 & 255;
  block[lengthOffset + 7] = lo & 255;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = (block[j] << 24 | block[j + 1] << 16 | block[j + 2] << 8 | block[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const temp1 = hh + S1 + ch + K[i] + w[i] >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + temp1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 >>> 0;
    }
    h[0] = h[0] + a >>> 0;
    h[1] = h[1] + b >>> 0;
    h[2] = h[2] + c >>> 0;
    h[3] = h[3] + d >>> 0;
    h[4] = h[4] + e >>> 0;
    h[5] = h[5] + f >>> 0;
    h[6] = h[6] + g >>> 0;
    h[7] = h[7] + hh >>> 0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = h[i] >>> 24 & 255;
    out[i * 4 + 1] = h[i] >>> 16 & 255;
    out[i * 4 + 2] = h[i] >>> 8 & 255;
    out[i * 4 + 3] = h[i] & 255;
  }
  return out;
}
var HEX = "0123456789abcdef";
function toHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i] >>> 4 & 15] + HEX[bytes[i] & 15];
  }
  return out;
}
var UTF8 = new TextEncoder();
function sha256Hex(text) {
  return toHex(sha256Bytes(UTF8.encode(text)));
}
function sha256Digest(text) {
  return `sha256:${sha256Hex(text)}`;
}

// src/core/canonicalize.ts
var CanonicalizationError = class extends Error {
  path;
  constructor(message, path) {
    super(message);
    this.name = "CanonicalizationError";
    this.path = path;
  }
};
function assertWellFormed(text, path) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (!(next >= 56320 && next <= 57343)) {
        throw new CanonicalizationError("unpaired high surrogate", path);
      }
      i++;
    } else if (code >= 56320 && code <= 57343) {
      throw new CanonicalizationError("unpaired low surrogate", path);
    }
  }
}
function serializeNumber(value, path) {
  if (!Number.isFinite(value)) {
    throw new CanonicalizationError(
      "non-finite numbers are outside the JCS domain and have no canonical form",
      path
    );
  }
  return JSON.stringify(value);
}
function safeOwnKeys(value, path) {
  try {
    return Reflect.ownKeys(value);
  } catch {
    throw new CanonicalizationError("object keys could not be inspected without executing a hostile trap", path);
  }
}
function safeDescriptor(value, key, path) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor) return descriptor;
  } catch {
  }
  throw new CanonicalizationError("an object member could not be inspected safely", path);
}
function childPath(path, key) {
  return `${path}/${key.replace(/~/gu, "~0").replace(/\//gu, "~1")}`;
}
function serialize(value, path, depth) {
  if (depth > 128) {
    throw new CanonicalizationError("value nests deeper than the canonicalizer permits", path);
  }
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return serializeNumber(value, path);
    case "string":
      assertWellFormed(value, path);
      return JSON.stringify(value);
    case "object":
      break;
    default:
      throw new CanonicalizationError(
        `values of type ${typeof value} are outside the JCS domain`,
        path
      );
  }
  let array = false;
  try {
    array = Array.isArray(value);
  } catch {
    throw new CanonicalizationError("the value could not be inspected safely", path);
  }
  if (array) {
    const keys2 = safeOwnKeys(value, path);
    const lengthDescriptor = safeDescriptor(value, "length", path);
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new CanonicalizationError("array length is outside the canonical JSON domain", path);
    }
    const indexKeys = [];
    for (const key of keys2) {
      if (typeof key === "symbol") {
        throw new CanonicalizationError("symbol-keyed array members are outside the JSON domain", path);
      }
      if (key === "length") continue;
      const index = Number(key);
      if (!/^(0|[1-9][0-9]*)$/u.test(key) || !Number.isSafeInteger(index) || index >= length) {
        throw new CanonicalizationError("named array members are outside the JSON domain", path);
      }
      const descriptor = safeDescriptor(value, key, childPath(path, key));
      if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        throw new CanonicalizationError("array accessors and hidden members are outside the JSON domain", path);
      }
      indexKeys.push(key);
    }
    if (indexKeys.length !== length) {
      throw new CanonicalizationError("sparse arrays are outside the canonical JSON domain", path);
    }
    indexKeys.sort((left, right) => Number(left) - Number(right));
    const parts2 = [];
    for (const key of indexKeys) {
      const at = childPath(path, key);
      const descriptor = safeDescriptor(value, key, at);
      parts2.push(serialize(descriptor.value, at, depth + 1));
    }
    return `[${parts2.join(",")}]`;
  }
  const record2 = value;
  let prototype;
  try {
    prototype = Object.getPrototypeOf(record2);
  } catch {
    throw new CanonicalizationError("the object prototype could not be inspected safely", path);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalizationError(
      "only plain objects can be canonicalized; a class instance has no canonical JSON form",
      path
    );
  }
  const ownKeys = safeOwnKeys(record2, path);
  const keys = [];
  for (const key of ownKeys) {
    if (typeof key === "symbol") {
      throw new CanonicalizationError("symbol-keyed members are outside the JSON domain", path);
    }
    const descriptor = safeDescriptor(record2, key, childPath(path, key));
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw new CanonicalizationError("accessors and hidden members are outside the JSON domain", path);
    }
    keys.push(key);
  }
  keys.sort();
  const parts = [];
  for (const key of keys) {
    assertWellFormed(key, path);
    const at = childPath(path, key);
    const child = safeDescriptor(record2, key, at).value;
    if (child === void 0) {
      throw new CanonicalizationError(
        `member ${JSON.stringify(key)} is undefined; undefined is not a JSON value`,
        at
      );
    }
    parts.push(`${JSON.stringify(key)}:${serialize(child, at, depth + 1)}`);
  }
  return `{${parts.join(",")}}`;
}
function canonicalize(value) {
  return serialize(value, "", 0);
}
var UTF82 = new TextEncoder();
function canonicalDigest(value) {
  return sha256Digest(canonicalize(value));
}

// core/skills/provenanceKeys.ts
var PROVENANCE_KEYS = Object.freeze([
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
  "spatial_units",
  "mask",
  "kernel",
  "projection_sample_policy",
  "morphology_disclaimer",
  "frame_rate",
  "state_variables",
  "derivation_method",
  "model_context",
  "fixed_parameters",
  "bin_ms",
  "histogram_normalization",
  "interval_scope",
  "event_alignment",
  "psth_aggregation",
  "connection_sample_policy",
  "snapshot_time_ms",
  "snapshot_scope",
  "parallel_edge_policy",
  "matrix_axis_order",
  "matrix_aggregation",
  "delay_units",
  "degree_direction",
  "degree_counting",
  "zero_degree_policy",
  "node_ids",
  "position_scope",
  "detector_id",
  "reference_population",
  "target_population",
  "correlation_normalization",
  "correlation_units",
  "lag_convention",
  "binning_policy",
  "stim_units",
  "rate_normalization",
  "graph_source",
  "graph_snapshot_id",
  "graph_scope",
  "identity_advisory"
]);
var ProvenanceKeyEnum = import_zod3.z.enum(PROVENANCE_KEYS);
var STRICT_PROVENANCE_POLICY = Object.freeze({
  unknownDeclaredInputKeys: "reject",
  globallyKnownButSkillUnclassifiedKeys: "reject",
  allowedDeclaredInputKeys: PROVENANCE_KEYS,
  perSkillAllowedKeys: "skill.requiredProvenanceKeys union skill.optionalProvenanceKeys",
  requiredKeysSource: "skill.requiredProvenanceKeys",
  presentKnownValues: "validate every present per-skill allowed key with provenanceValueConstraints",
  requiredKeysControl: "required keys control presence; optional keys are allowed only when classified by the selected skill",
  normalizeBeforeValidation: true
});
var PROVENANCE_KEY_LABELS = Object.freeze({
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
  spatial_units: "spatial coordinate units",
  mask: "mask",
  kernel: "kernel",
  projection_sample_policy: "projection sample policy",
  morphology_disclaimer: "morphology geometry disclaimer",
  frame_rate: "frame rate",
  state_variables: "state variables",
  derivation_method: "phase-plane derivative derivation method",
  model_context: "phase-plane model context",
  fixed_parameters: "phase-plane fixed parameters",
  bin_ms: "bin width",
  histogram_normalization: "histogram normalization",
  interval_scope: "inter-spike interval scope",
  event_alignment: "event alignment",
  psth_aggregation: "PSTH sender/trial aggregation",
  connection_sample_policy: "connection sample policy",
  snapshot_time_ms: "connection snapshot time in ms",
  snapshot_scope: "connection snapshot completeness / MPI scope",
  parallel_edge_policy: "parallel-edge handling policy",
  matrix_axis_order: "matrix source/target axis order",
  matrix_aggregation: "parallel-connection matrix aggregation",
  delay_units: "synaptic delay units",
  degree_direction: "directed degree orientation",
  degree_counting: "degree edge-counting policy",
  zero_degree_policy: "zero-degree node inclusion policy",
  node_ids: "spatial node ids",
  position_scope: "spatial position completeness / MPI scope",
  detector_id: "correlation_detector id",
  reference_population: "correlogram reference population",
  target_population: "correlogram target population",
  correlation_normalization: "correlogram normalization",
  correlation_units: "correlogram value units",
  lag_convention: "correlogram lag convention",
  binning_policy: "bin interval policy",
  stim_units: "stimulus units",
  rate_normalization: "rate normalization",
  graph_source: "graph source",
  graph_snapshot_id: "immutable graph snapshot id",
  graph_scope: "graph scope",
  identity_advisory: "model-identity advisory (structural similarity, not certified sameness)"
});
function isProvenanceKey(value) {
  return typeof value === "string" && PROVENANCE_KEYS.includes(value);
}
var PROVENANCE_PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: "4",
  evaluationOrder: Object.freeze([
    "apply provenanceValueConstraints normalization",
    "validate every present known provenance value",
    "check required provenance-key presence",
    "evaluate provenanceParamConstraints in listed order"
  ]),
  kinds: Object.freeze([
    "equals_param",
    "equals_param_path",
    "equals_literal",
    "one_of_literals",
    "matches_regular_time_axis",
    "each_label_matches_variable",
    "matches_canonical_json_param",
    "matches_projected_id_collection",
    "all_projected_values_equal",
    "canonical_json_array_length_matches_param",
    "canonical_json_array_length_equals",
    "canonical_json_array_length_at_least_projected_sum"
  ]),
  semantics: Object.freeze({
    equals_param: "declared value must equal one checked top-level params property under Object.is",
    equals_param_path: "declared value must equal the checked scalar reached through a dot-separated sequence of safe own data-property names under Object.is",
    equals_literal: "declared value must equal the contract literal under Object.is",
    one_of_literals: "declared value must equal one contract literal under Object.is",
    matches_regular_time_axis: Object.freeze({
      timeArray: "the checked array contains at least two finite, strictly increasing binary64 timestamps",
      declaredInterval: "a positive finite binary64 number",
      binary64Epsilon: Number.EPSILON,
      relativeScale: "max(abs(right-left), abs(declaredInterval))",
      candidateRoundoff: "roundoffUlps * binary64Epsilon * max(abs(left), abs(right), abs(declaredInterval))",
      roundoffCap: "maxRoundoffFraction * abs(declaredInterval)",
      boundedRoundoff: "candidateRoundoff when candidateRoundoff <= roundoffCap, otherwise 0",
      tolerance: "absoluteTolerance + relativeTolerance * relativeScale + boundedRoundoff",
      acceptance: "for every adjacent pair, abs((right-left)-declaredInterval) <= tolerance"
    }),
    each_label_matches_variable: "every checked series label must either exactly equal the declared recorded variable or consist of a nonblank series identity, the exact published separator, and the exact declared variable as its terminal segment",
    matches_canonical_json_param: "the declared string must be either the RFC 8785 canonical JSON serialization of the checked array/tuple or, when allowDigest=true, its sha256:<64 lowercase hex> RFC 8785 digest",
    matches_projected_id_collection: "project an optional own id field from every item of the checked array; direct id arrays contain unique members in the published idDomain (non-negative safe integers or nonblank strings); ordered equality preserves order, set equality compares unique members, and contains requires every projected member to occur in the declared canonical JSON array; an exact equality digest is sha256 over RFC 8785 canonical JSON of the projected sequence (for set comparison, remove later duplicates while preserving first encounter order); when allowOpaqueDigestCount=true on a supplemental external contains check, sha256:<64 lowercase hex>;count:<n> cannot prove membership or preimage type but must declare at least the number of distinct observed ids",
    all_projected_values_equal: "when projected values exist, every present projected scalar must equal the declared value under Object.is; an empty or all-absent projection remains externally unverifiable and follows emptyPolicy",
    canonical_json_array_length_matches_param: "the declared collection is either a canonical JSON array of unique ids in the published idDomain or, when allowed, sha256:<64 lowercase hex>;count:<non-negative safe integer>; relation=equals requires its item count to equal the checked non-negative safe-integer param, relation=at_least requires at least that count, and relation=nonempty_if_positive requires at least one declared id exactly when the checked param is positive (zero permits an empty collection); the last relation rejects a provably empty endpoint universe without claiming to identify its members",
    canonical_json_array_length_equals: "the declared value must be an RFC 8785 canonical JSON array with exactly expectedLength elements; this per-skill shape check does not establish that an external declaration is true",
    canonical_json_array_length_at_least_projected_sum: "the declared collection is a unique id array or allowed opaque digest+count, and its item count must be at least the safe-integer sum of the non-negative safe-integer field projected from the checked object array; this checks the disjoint selected-population denominator lower bound without claiming to recover member identity"
  })
});
var PROVENANCE_VALUE_CONSTRAINTS = (() => {
  const constraints = /* @__PURE__ */ Object.create(null);
  for (const key of PROVENANCE_KEYS) {
    constraints[key] = { kind: "nonblank_string", normalize: "trim" };
  }
  for (const key of ["sampling_interval", "bin_ms", "frame_rate"]) {
    constraints[key] = { kind: "positive_finite_number" };
  }
  constraints.snapshot_time_ms = { kind: "nonnegative_finite_number" };
  for (const key of ["device_id", "recorder_id", "detector_id"]) {
    constraints[key] = {
      kind: "nonnegative_safe_integer_or_nonblank_string",
      normalize: "trim"
    };
  }
  for (const key of ["sender_ids", "source_ids", "target_ids", "node_ids"]) {
    constraints[key] = {
      kind: "canonical_id_collection",
      normalize: "trim",
      canonicalization: "RFC8785",
      idDomain: "nonnegative_safe_integer",
      unique: true,
      allowDigest: true,
      allowOpaqueDigestCount: true
    };
  }
  constraints.extent = {
    kind: "canonical_positive_finite_number_array",
    normalize: "trim",
    canonicalization: "RFC8785",
    allowedLengths: Object.freeze([2, 3])
  };
  constraints.identity_advisory = { kind: "literal_true" };
  for (const constraint of Object.values(constraints)) Object.freeze(constraint);
  return Object.freeze(constraints);
})();
function declaredProvenanceValueError(key, value) {
  const constraint = PROVENANCE_VALUE_CONSTRAINTS[key];
  switch (constraint.kind) {
    case "positive_finite_number":
      return typeof value === "number" && Number.isFinite(value) && value > 0 ? null : `${key} must be a positive finite number`;
    case "nonnegative_finite_number":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 && !Object.is(value, -0) ? null : `${key} must be a non-negative finite number`;
    case "literal_true":
      return value === true ? null : "identity_advisory must be literal true (model identity is advisory)";
    case "nonnegative_safe_integer_or_nonblank_string":
      if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0) ? null : `${key} numeric ids must be non-negative safe integers`;
      }
      return typeof value === "string" && value.trim().length > 0 ? null : `${key} must be a non-empty string or numeric id`;
    case "canonical_id_collection": {
      if (typeof value !== "string") {
        return `${key} must be a canonical id-array or digest string`;
      }
      if (constraint.allowDigest && isCanonicalDigest(value)) return null;
      if (constraint.allowOpaqueDigestCount && opaqueDigestCollectionCount(value) !== void 0) {
        return null;
      }
      const parsed = parseCanonicalIdArray(value, key, constraint.idDomain);
      return parsed.ok ? null : parsed.message;
    }
    case "canonical_positive_finite_number_array": {
      const parsed = parseCanonicalScalarArray(value, key);
      if (!parsed.ok) return parsed.message;
      if (!constraint.allowedLengths.includes(parsed.values.length)) {
        return `${key} must contain ${constraint.allowedLengths.join(" or ")} elements`;
      }
      return parsed.values.every((element) => typeof element === "number" && Number.isFinite(element) && element > 0 && !Object.is(element, -0)) ? null : `${key} must contain only strictly positive finite numbers`;
    }
    case "string":
      return typeof value === "string" ? null : `${key} must be a string`;
    case "nonblank_string":
      return typeof value === "string" && value.trim().length > 0 ? null : `${key} must be a non-empty string`;
  }
}
function normalizeDeclaredProvenanceValue(key, value) {
  const constraint = PROVENANCE_VALUE_CONSTRAINTS[key];
  return "normalize" in constraint && constraint.normalize === "trim" && typeof value === "string" ? value.trim() : value;
}
function normalizeDeclaredProvenanceInputs(inputs) {
  const normalized = {};
  for (const key of Object.keys(inputs)) {
    const value = inputs[key];
    Object.defineProperty(normalized, key, {
      value: isProvenanceKey(key) ? normalizeDeclaredProvenanceValue(key, value) : value,
      enumerable: true,
      writable: true,
      configurable: true
    });
  }
  return normalized;
}
function resolveSafeParamPath(params, paramPath) {
  const segments = paramPath.split(".");
  if (segments.length === 0 || segments.some((segment) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment) || segment === "__proto__" || segment === "prototype" || segment === "constructor")) {
    return {
      ok: false,
      message: `params.${paramPath} is not a safe parameter path`
    };
  }
  let value = params;
  for (const segment of segments) {
    if (value === null || typeof value !== "object" || Array.isArray(value) || !Object.hasOwn(value, segment)) {
      return {
        ok: false,
        message: `params.${paramPath} is absent`
      };
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, segment);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      return {
        ok: false,
        message: `params.${paramPath} is not an enumerable data property`
      };
    }
    value = descriptor.value;
  }
  return { ok: true, value };
}
function regularTimeAxisError(constraint, actual, params) {
  if (typeof actual !== "number" || !Number.isFinite(actual) || actual <= 0) {
    return `${constraint.provenanceKey} must be a positive finite number`;
  }
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  if (!Array.isArray(resolved.value) || !resolved.value.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not a finite numeric array`;
  }
  if (!Number.isFinite(constraint.absoluteTolerance) || constraint.absoluteTolerance < 0 || !Number.isFinite(constraint.relativeTolerance) || constraint.relativeTolerance < 0 || !Number.isFinite(constraint.roundoffUlps) || constraint.roundoffUlps < 0 || !Number.isFinite(constraint.maxRoundoffFraction) || constraint.maxRoundoffFraction < 0) {
    return `cannot verify ${constraint.provenanceKey}: the contract has invalid sampling tolerances`;
  }
  const times = resolved.value;
  if (times.length < 2) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} must contain at least two timestamps`;
  }
  for (let index = 1; index < times.length; index++) {
    const left = times[index - 1];
    const right = times[index];
    const delta = right - left;
    if (!(delta > 0) || !Number.isFinite(delta)) {
      return `${constraint.provenanceKey} cannot match params.${constraint.paramPath}: timestamps must be strictly increasing at index ${index}`;
    }
    const relativeScale = Math.max(Math.abs(delta), Math.abs(actual));
    const candidateRoundoff = constraint.roundoffUlps * Number.EPSILON * Math.max(Math.abs(left), Math.abs(right), Math.abs(actual));
    const roundoffCap = constraint.maxRoundoffFraction * Math.abs(actual);
    const boundedRoundoff = candidateRoundoff <= roundoffCap ? candidateRoundoff : 0;
    const tolerance = constraint.absoluteTolerance + constraint.relativeTolerance * relativeScale + boundedRoundoff;
    if (Math.abs(delta - actual) > tolerance) {
      return `${constraint.provenanceKey} (${JSON.stringify(actual)}) must match every adjacent delta in params.${constraint.paramPath}; index ${index} has delta ${JSON.stringify(delta)}`;
    }
  }
  return null;
}
function seriesLabelBindingError(constraint, actual, params) {
  if (typeof actual !== "string" || actual.length === 0) {
    return `${constraint.provenanceKey} must be a nonblank string`;
  }
  if (constraint.separator.length === 0) {
    return `cannot verify ${constraint.provenanceKey}: the contract label separator is empty`;
  }
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  if (!Array.isArray(resolved.value) || !resolved.value.every((value) => typeof value === "string")) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not a string array`;
  }
  const suffix = `${constraint.separator}${actual}`;
  for (let index = 0; index < resolved.value.length; index++) {
    const label = resolved.value[index];
    if (label === actual) continue;
    if (label.endsWith(suffix) && label.slice(0, -suffix.length).trim().length > 0) {
      continue;
    }
    return `params.${constraint.paramPath}[${index}] must equal ${JSON.stringify(actual)} or end with ${JSON.stringify(suffix)} after a nonblank series identity`;
  }
  return null;
}
function parseCanonicalScalarArray(actual, provenanceKey) {
  if (typeof actual !== "string") {
    return {
      ok: false,
      message: `${provenanceKey} must be a canonical JSON array string`
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(actual);
  } catch {
    return {
      ok: false,
      message: `${provenanceKey} must be valid canonical JSON`
    };
  }
  if (!Array.isArray(parsed) || !parsed.every((value) => value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0))) {
    return {
      ok: false,
      message: `${provenanceKey} must be a canonical JSON array of finite scalar values`
    };
  }
  let canonical;
  try {
    canonical = canonicalize(parsed);
  } catch {
    return {
      ok: false,
      message: `${provenanceKey} is outside the RFC 8785 canonical JSON domain`
    };
  }
  if (canonical !== actual) {
    return {
      ok: false,
      message: `${provenanceKey} must use exact RFC 8785 canonical JSON with no insignificant whitespace`
    };
  }
  return { ok: true, values: parsed };
}
function isCanonicalDigest(value) {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}
function opaqueDigestCollectionCount(value) {
  if (typeof value !== "string") return void 0;
  const match = /^sha256:[0-9a-f]{64};count:(0|[1-9][0-9]*)$/.exec(value);
  if (!match) return void 0;
  const count = Number(match[1]);
  return Number.isSafeInteger(count) && count >= 0 ? count : void 0;
}
function declaredCollectionCount(actual, provenanceKey, idDomain, allowOpaqueDigestCount) {
  if (allowOpaqueDigestCount) {
    const count = opaqueDigestCollectionCount(actual);
    if (count !== void 0) return { ok: true, count };
  }
  const parsed = parseCanonicalIdArray(actual, provenanceKey, idDomain);
  return parsed.ok ? { ok: true, count: parsed.values.length } : parsed;
}
function jsonScalarKey(value) {
  if (value !== null && typeof value !== "string" && typeof value !== "boolean" && !(typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0))) {
    return null;
  }
  try {
    return canonicalize(value);
  } catch {
    return null;
  }
}
function matchesIdDomain(value, idDomain) {
  return idDomain === "nonblank_string" ? typeof value === "string" && value.trim().length > 0 : typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
}
function parseCanonicalIdArray(actual, provenanceKey, idDomain) {
  const parsed = parseCanonicalScalarArray(actual, provenanceKey);
  if (!parsed.ok) return parsed;
  if (!parsed.values.every((value) => matchesIdDomain(value, idDomain))) {
    return {
      ok: false,
      message: `${provenanceKey} must contain only ${idDomain === "nonblank_string" ? "nonblank-string" : "non-negative safe-integer"} ids`
    };
  }
  const keys = parsed.values.map(jsonScalarKey);
  if (new Set(keys).size !== keys.length) {
    return {
      ok: false,
      message: `${provenanceKey} id arrays must not contain duplicates`
    };
  }
  return parsed;
}
function canonicalCollection(values, comparison) {
  const keyed = [];
  for (const value of values) {
    const key = jsonScalarKey(value);
    if (key === null) return null;
    keyed.push({ key, value });
  }
  if (comparison === "ordered") return keyed.map(({ value }) => value);
  const unique = /* @__PURE__ */ new Map();
  for (const { key, value } of keyed) unique.set(key, value);
  return [...unique.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([, value]) => value);
}
function projectedDigestCollection(values, comparison) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const value of values) {
    const key = jsonScalarKey(value);
    if (key === null) return null;
    if (comparison === "set" && seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}
function projectedValues(params, paramPath, field) {
  const resolved = resolveSafeParamPath(params, paramPath);
  if (!resolved.ok) return resolved;
  if (!Array.isArray(resolved.value)) {
    return {
      ok: false,
      message: `params.${paramPath} is not an array`
    };
  }
  if (field === void 0) return { ok: true, values: [...resolved.value] };
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field) || field === "__proto__" || field === "prototype" || field === "constructor") {
    return { ok: false, message: `field ${field} is not a safe own-property name` };
  }
  const values = [];
  for (let index = 0; index < resolved.value.length; index++) {
    const item = resolved.value[index];
    if (item === null || typeof item !== "object" || Array.isArray(item) || !Object.hasOwn(item, field)) {
      return {
        ok: false,
        message: `params.${paramPath}[${index}].${field} is absent`
      };
    }
    const descriptor = Object.getOwnPropertyDescriptor(item, field);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      return {
        ok: false,
        message: `params.${paramPath}[${index}].${field} is not an enumerable data property`
      };
    }
    values.push(descriptor.value);
  }
  return { ok: true, values };
}
function canonicalJsonParamError(constraint, actual, params) {
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  if (!Array.isArray(resolved.value)) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not an array`;
  }
  try {
    if (constraint.allowDigest && isCanonicalDigest(actual) && actual === canonicalDigest(resolved.value)) {
      return null;
    }
    const parsed = parseCanonicalScalarArray(actual, constraint.provenanceKey);
    if (!parsed.ok) return parsed.message;
    return canonicalize(parsed.values) === canonicalize(resolved.value) ? null : `${constraint.provenanceKey} must match params.${constraint.paramPath}`;
  } catch {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is outside the RFC 8785 canonical JSON domain`;
  }
}
function projectedCollectionError(constraint, actual, params) {
  const projected = projectedValues(
    params,
    constraint.paramPath,
    constraint.field
  );
  if (!projected.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${projected.message}`;
  }
  const expected = canonicalCollection(projected.values, constraint.comparison);
  if (!expected || !expected.every((value) => matchesIdDomain(value, constraint.idDomain))) {
    return `cannot verify ${constraint.provenanceKey}: the projected collection is not a valid id collection`;
  }
  const digestCollection = projectedDigestCollection(
    projected.values,
    constraint.comparison
  );
  if (!digestCollection) {
    return `cannot verify ${constraint.provenanceKey}: the projected collection is outside the RFC 8785 canonical JSON domain`;
  }
  if (constraint.relation === "equals" && constraint.allowDigest && isCanonicalDigest(actual)) {
    return actual === canonicalDigest(digestCollection) ? null : `${constraint.provenanceKey} digest must match the projected params collection in checked encounter order`;
  }
  if (constraint.relation === "contains" && constraint.establishesBinding === false && constraint.allowOpaqueDigestCount) {
    const opaqueCount = opaqueDigestCollectionCount(actual);
    if (opaqueCount !== void 0) {
      return opaqueCount >= expected.length ? null : `${constraint.provenanceKey} opaque collection count (${opaqueCount}) must be at least the number of distinct observed ids (${expected.length})`;
    }
  }
  const parsed = parseCanonicalIdArray(
    actual,
    constraint.provenanceKey,
    constraint.idDomain
  );
  if (!parsed.ok) return parsed.message;
  const declaredCollection = canonicalCollection(parsed.values, constraint.comparison);
  if (!declaredCollection) return `${constraint.provenanceKey} contains invalid values`;
  if (constraint.relation === "equals") {
    return canonicalize(declaredCollection) === canonicalize(expected) ? null : `${constraint.provenanceKey} must equal the projected params collection`;
  }
  const declaredKeys = new Set(
    declaredCollection.map((value) => jsonScalarKey(value))
  );
  return expected.every((value) => declaredKeys.has(jsonScalarKey(value))) ? null : `${constraint.provenanceKey} must contain every observed value projected from params.${constraint.paramPath}`;
}
function allProjectedValuesEqualError(constraint, actual, params) {
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  if (!Array.isArray(resolved.value)) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not an array`;
  }
  const present = [];
  for (let index = 0; index < resolved.value.length; index++) {
    const item = resolved.value[index];
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath}[${index}] is not an object`;
    }
    if (!Object.hasOwn(item, constraint.field)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(item, constraint.field);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath}[${index}].${constraint.field} is not an enumerable data property`;
    }
    present.push(descriptor.value);
  }
  if (present.length === 0) return null;
  return present.every((value) => Object.is(value, actual)) ? null : `${constraint.provenanceKey} must equal every present params.${constraint.paramPath}[*].${constraint.field} value`;
}
function canonicalJsonArrayLengthError(constraint, actual, params) {
  const resolved = resolveSafeParamPath(params, constraint.paramPath);
  if (!resolved.ok || typeof resolved.value !== "number" || !Number.isSafeInteger(resolved.value) || resolved.value < 0) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramPath} is not a non-negative safe integer`;
  }
  const declaredCount = declaredCollectionCount(
    actual,
    constraint.provenanceKey,
    constraint.idDomain,
    constraint.allowOpaqueDigestCount
  );
  if (!declaredCount.ok) return declaredCount.message;
  const matches = constraint.relation === "equals" ? declaredCount.count === resolved.value : constraint.relation === "at_least" ? declaredCount.count >= resolved.value : resolved.value === 0 || declaredCount.count >= 1;
  if (matches) return null;
  if (constraint.relation === "nonempty_if_positive") {
    return `${constraint.provenanceKey} collection count (${declaredCount.count}) must be at least one when params.${constraint.paramPath} is positive (${resolved.value})`;
  }
  return `${constraint.provenanceKey} collection count (${declaredCount.count}) must ${constraint.relation === "equals" ? "equal" : "be at least"} params.${constraint.paramPath} (${resolved.value})`;
}
function canonicalJsonArrayExactLengthError(constraint, actual) {
  if (!Number.isSafeInteger(constraint.expectedLength) || constraint.expectedLength < 0) {
    return `cannot verify ${constraint.provenanceKey}: the contract expectedLength is not a non-negative safe integer`;
  }
  const parsed = parseCanonicalScalarArray(
    actual,
    constraint.provenanceKey
  );
  if (!parsed.ok) return parsed.message;
  return parsed.values.length === constraint.expectedLength ? null : `${constraint.provenanceKey} must contain exactly ${constraint.expectedLength} elements`;
}
function canonicalJsonArrayProjectedSumError(constraint, actual, params) {
  const projected = projectedValues(
    params,
    constraint.paramPath,
    constraint.field
  );
  if (!projected.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${projected.message}`;
  }
  if (!projected.values.every((value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0)) {
    return `cannot verify ${constraint.provenanceKey}: projected counts are not non-negative safe integers`;
  }
  let minimum = 0;
  for (const value of projected.values) {
    minimum += value;
    if (!Number.isSafeInteger(minimum)) {
      return `cannot verify ${constraint.provenanceKey}: projected count sum exceeds the safe-integer domain`;
    }
  }
  const declaredCount = declaredCollectionCount(
    actual,
    constraint.provenanceKey,
    constraint.idDomain,
    constraint.allowOpaqueDigestCount
  );
  if (!declaredCount.ok) return declaredCount.message;
  return declaredCount.count >= minimum ? null : `${constraint.provenanceKey} collection count (${declaredCount.count}) must be at least the summed checked sender denominator (${minimum})`;
}
function provenanceParamConstraintError(constraint, params, declared) {
  if (!Object.hasOwn(declared, constraint.provenanceKey)) return null;
  const actual = declared[constraint.provenanceKey];
  if (constraint.kind === "equals_literal") {
    return Object.is(actual, constraint.value) ? null : `${constraint.provenanceKey} must equal ${JSON.stringify(constraint.value)}`;
  }
  if (constraint.kind === "one_of_literals") {
    return constraint.values.some((value) => Object.is(actual, value)) ? null : `${constraint.provenanceKey} must equal one of ${JSON.stringify(constraint.values)}`;
  }
  if (constraint.kind === "matches_regular_time_axis") {
    return regularTimeAxisError(constraint, actual, params);
  }
  if (constraint.kind === "each_label_matches_variable") {
    return seriesLabelBindingError(constraint, actual, params);
  }
  if (constraint.kind === "matches_canonical_json_param") {
    return canonicalJsonParamError(constraint, actual, params);
  }
  if (constraint.kind === "matches_projected_id_collection") {
    return projectedCollectionError(constraint, actual, params);
  }
  if (constraint.kind === "all_projected_values_equal") {
    return allProjectedValuesEqualError(constraint, actual, params);
  }
  if (constraint.kind === "canonical_json_array_length_matches_param") {
    return canonicalJsonArrayLengthError(constraint, actual, params);
  }
  if (constraint.kind === "canonical_json_array_length_equals") {
    return canonicalJsonArrayExactLengthError(constraint, actual);
  }
  if (constraint.kind === "canonical_json_array_length_at_least_projected_sum") {
    return canonicalJsonArrayProjectedSumError(constraint, actual, params);
  }
  const paramPath = constraint.kind === "equals_param_path" ? constraint.paramPath : constraint.paramKey;
  const resolved = resolveSafeParamPath(params, paramPath);
  if (!resolved.ok) {
    return `cannot verify ${constraint.provenanceKey}: ${resolved.message}`;
  }
  return Object.is(actual, resolved.value) ? null : `${constraint.provenanceKey} (${JSON.stringify(actual)}) must match params.${paramPath} (${JSON.stringify(resolved.value)})`;
}

// core/skills/examples.ts
var synthetic = (declared_inputs) => ({
  source: "synthetic_test",
  calibrated_posterior: false,
  advisory_only: true,
  is_paper_local_evidence: false,
  synthetic: true,
  declared_inputs
});
var SKILL_EXAMPLE_PAYLOADS = {
  "nest.voltage_trace": {
    scene: "voltage-trace",
    params: {
      times_ms: [0, 1, 2],
      series: [[-65, -64, -63]],
      series_labels: ["neuron 1 \xB7 V_m"],
      units: "mV"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      device_id: "mm_1",
      recorded_variable: "V_m",
      units: "mV",
      sampling_interval: 1
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
      population_labels: '["E"]',
      time_units: "ms"
    })
  },
  "nest.isi_distribution": {
    scene: "isi-distribution",
    params: {
      bin_centers_ms: [0.5, 1.5, 2.5],
      values: [2, 5, 1],
      bin_width_ms: 1,
      normalization: "count",
      value_units: "count",
      interval_scope: "per_sender"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1,2]",
      population_labels: "E",
      time_units: "ms",
      bin_ms: 1,
      histogram_normalization: "count",
      interval_scope: "per_sender"
    })
  },
  "nest.psth": {
    scene: "psth",
    params: {
      bin_centers_ms: [2.5, 7.5, 12.5],
      values: [200, 800, 400],
      bin_width_ms: 5,
      normalization: "rate_hz",
      value_units: "Hz",
      trial_count: 1,
      alignment_event: "simulation origin",
      aggregation: "selected_senders_per_trial"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1]",
      population_labels: "gamma generator",
      time_units: "ms",
      bin_ms: 5,
      histogram_normalization: "rate_hz",
      event_alignment: "simulation origin",
      psth_aggregation: "selected_senders_per_trial"
    })
  },
  "nest.population_rate": {
    scene: "population-rate",
    params: {
      bin_centers_ms: [2.5, 7.5, 12.5],
      bin_width_ms: 5,
      window_start_ms: 0,
      window_stop_ms: 15,
      series: [{
        id: "E",
        label: "Excitatory population",
        recorded_sender_count: 2,
        spike_counts: [1, 4, 2],
        rates_hz: [100, 400, 200]
      }],
      normalization: "mean_per_recorded_sender_hz",
      aggregation: "selected_senders",
      binning: "left_closed_right_open"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1,2]",
      population_labels: '["E"]',
      time_units: "ms",
      bin_ms: 5,
      rate_normalization: "mean_per_recorded_sender_hz",
      binning_policy: "left_closed_right_open"
    })
  },
  "nest.correlogram": {
    scene: "correlogram",
    params: {
      lags_ms: [-2, -1, 0, 1, 2],
      values: [1, 4, 10, 4, 1],
      bin_width_ms: 1,
      tau_max_ms: 2,
      counting_start_ms: 0,
      counting_stop_ms: 1e3,
      pair: {
        reference_label: "E",
        target_label: "E"
      },
      lag_convention: "positive_target_after_reference",
      binning: "left_closed_right_open",
      zero_lag_policy: "included",
      statistic: {
        kind: "raw_pair_count",
        units: "count"
      }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      detector_id: "cd_1",
      reference_population: "E",
      target_population: "E",
      bin_ms: 1,
      correlation_normalization: "raw_pair_count",
      correlation_units: "count",
      lag_convention: "positive_target_after_reference",
      binning_policy: "left_closed_right_open"
    })
  },
  "nest.rate_response": {
    scene: "fi-curve",
    params: {
      stimulus_amplitudes: [0, 100, 200],
      rates_hz: [0, 12, 31],
      stimulus_units: "pA"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ stim_units: "pA", bin_ms: 100, rate_normalization: "spikes/s" })
  },
  "nest.connectivity_matrix": {
    scene: "network-topology",
    params: {
      sources: [1, 2],
      targets: [2, 3],
      weights: [1, 0.5],
      weight_units: "pA"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[2,3]",
      synapse_model: "static_synapse",
      weight_units: "pA",
      connection_sample_policy: "complete"
    })
  },
  "nest.connection_graph": {
    scene: "network-topology",
    params: {
      nodes: [
        { id: 1, label: "1" },
        { id: 2, label: "2" },
        { id: 3, label: "3" }
      ],
      edges: [
        { id: "connection:0", source: 1, target: 2, weight: 1, delay_ms: 1.5, synapse_model: "static_synapse" },
        { id: "connection:1", source: 1, target: 2, weight: 0.5, delay_ms: 2, synapse_model: "static_synapse" }
      ],
      weight_units: "pA",
      delay_units: "ms",
      layout: "schematic_circle",
      parallel_edges: "preserved",
      self_connections: "preserved",
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" },
      sample_policy: "complete",
      source_connection_count: 2,
      edge_identity: "canonical_sorted_ordinal"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,3]",
      target_ids: "[2,3]",
      synapse_model: "static_synapse",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "preserved",
      weight_units: "pA",
      delay_units: "ms"
    })
  },
  "nest.adjacency_matrix": {
    scene: "connection-matrix",
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2 }],
      axis_order: "target_rows_source_columns",
      absent_cell: "no_connection",
      sample_policy: "complete",
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" },
      display: "binary_presence",
      aggregation: "any_connection"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "preserved_as_connection_count",
      matrix_axis_order: "target_rows_source_columns",
      matrix_aggregation: "any_connection"
    })
  },
  "nest.weight_matrix": {
    scene: "connection-matrix",
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2, value: 0 }],
      weight_units: "pA",
      aggregation: "sum",
      axis_order: "target_rows_source_columns",
      absent_cell: "no_connection",
      sample_policy: "complete",
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      weight_units: "pA",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "preserved_as_connection_count",
      matrix_axis_order: "target_rows_source_columns",
      matrix_aggregation: "sum"
    })
  },
  "nest.delay_matrix": {
    scene: "connection-matrix",
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2, value: 1.5 }],
      delay_units: "ms",
      aggregation: "mean",
      axis_order: "target_rows_source_columns",
      absent_cell: "no_connection",
      sample_policy: "complete",
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      delay_units: "ms",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "preserved_as_connection_count",
      matrix_axis_order: "target_rows_source_columns",
      matrix_aggregation: "mean"
    })
  },
  "nest.in_degree_distribution": {
    scene: "degree-distribution",
    params: {
      degrees: [0, 1, 2],
      node_counts: [1, 0, 1],
      values: [1, 0, 1],
      node_count: 2,
      connection_count: 2,
      direction: "in",
      normalization: "count",
      value_units: "count",
      edge_counting: "each_synapse_collection_entry",
      zero_degree_policy: "include_declared_universe",
      sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "count_each_connection",
      degree_direction: "in",
      degree_counting: "each_synapse_collection_entry",
      zero_degree_policy: "include_declared_universe",
      histogram_normalization: "count"
    })
  },
  "nest.out_degree_distribution": {
    scene: "degree-distribution",
    params: {
      degrees: [0, 1],
      node_counts: [1, 2],
      values: [1, 2],
      node_count: 3,
      connection_count: 2,
      direction: "out",
      normalization: "count",
      value_units: "count",
      edge_counting: "each_synapse_collection_entry",
      zero_degree_policy: "include_declared_universe",
      sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2,3]",
      target_ids: "[4,5]",
      synapse_model: "static_synapse",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "count_each_connection",
      degree_direction: "out",
      degree_counting: "each_synapse_collection_entry",
      zero_degree_policy: "include_declared_universe",
      histogram_normalization: "count"
    })
  },
  "nest.delay_distribution": {
    scene: "delay-distribution",
    params: {
      bin_centers_ms: [0.5, 1.5, 2.5],
      delay_counts: [0, 1, 1],
      values: [0, 1, 1],
      bin_width_ms: 1,
      window_start_ms: 0,
      window_stop_ms: 3,
      normalization: "count",
      value_units: "count",
      delay_units: "ms",
      aggregation: "each_connection",
      binning: "left_closed_right_open",
      sample_policy: "complete",
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      delay_units: "ms",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "count_each_connection",
      bin_ms: 1,
      histogram_normalization: "count",
      binning_policy: "left_closed_right_open"
    })
  },
  "nest.weight_histogram": {
    scene: "weight-histogram",
    params: {
      bin_centers: [-2, -1, 0, 1, 2],
      weight_counts: [3, 5, 0, 7, 2],
      values: [3, 5, 0, 7, 2],
      bin_width: 1,
      window_start: -2.5,
      window_stop: 2.5,
      weight_units: "pA",
      normalization: "count",
      value_units: "count",
      aggregation: "each_connection",
      binning: "left_closed_right_open",
      sample_policy: "complete",
      connection_count: 17,
      snapshot_time_ms: 1e3,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      weight_units: "pA",
      histogram_normalization: "count",
      connection_sample_policy: "complete",
      snapshot_time_ms: 1e3,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "count_each_connection"
    })
  },
  "nest.spatial_map_2d": {
    scene: "spatial-map-2d",
    params: {
      nodes: [
        { id: 41, label: "41", x: -0.5, y: 0 },
        { id: 99, label: "99", x: 0.5, y: 0 }
      ],
      coordinate_units: "model units",
      extent: [2, 1],
      center: [0, 0],
      edge_wrap: false,
      position_scope: { kind: "single_process_complete" },
      marker_size: "fixed_screen_space"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      node_ids: "[41,99]",
      spatial_units: "model units",
      extent: "[2,1]",
      position_scope: "single_process_complete"
    })
  },
  "nest.spatial_3d": {
    scene: "network-topology",
    params: {
      objects: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      coordinate_units: "mm"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      extent: "[1,1,1]",
      spatial_units: "mm",
      projection_sample_policy: "all"
    })
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
    params: {
      grid: { v: [-70, -50], w: [0, 1] },
      derivatives: {
        v: [0.2, 0.1, -0.1, -0.2],
        w: [-0.05, 0.05, -0.05, 0.05]
      },
      axis_units: { v: "mV", w: "1" },
      derivative_units: { v: "mV/ms", w: "1/ms" },
      derivative_time_unit: "ms",
      axis_order: ["v", "w"],
      flattening: "row-major-last-axis-fastest"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      state_variables: '["v","w"]',
      derivation_method: "model equations evaluated on Cartesian grid",
      model_context: "Hodgkin-Huxley reduced phase plane",
      fixed_parameters: "all non-plotted state variables clamped to declared values"
    })
  },
  "nest.astrocyte_dynamics": {
    scene: "voltage-trace",
    params: { times_ms: [0, 1, 2], ca_trace: [0.1, 0.2, 0.15], units: "uM" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorded_variable: "Ca",
      units: "uM",
      time_units: "ms",
      sampling_interval: 1
    })
  },
  "corpus.knowledge_graph": {
    scene: "knowledge-graph-3d",
    params: {
      graph_id: "corpus-entity-graph",
      graph_source: "engram:corpus_entity_graph",
      graph_snapshot_id: "caller-declared-example-snapshot",
      graph_scope: "corpus_entity",
      generated_at: "2026-07-11T00:00:00Z",
      nodes: [
        {
          id: "p1",
          kind: "paper",
          label: "Brunel 2000",
          detail: "Balanced random network paper",
          attributes: { family: "LIF", n_neurons: 2, n_synapses: 2 },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-node-p1",
            record_id: "node:p1"
          }]
        },
        {
          id: "m1",
          kind: "model",
          label: "iaf_psc_delta",
          attributes: { family: "LIF", paper_count: 1 },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-node-m1",
            record_id: "node:m1"
          }]
        },
        {
          id: "m2",
          kind: "model",
          label: "iaf_psc_alpha",
          attributes: { family: "LIF", paper_count: 1 },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-node-m2",
            record_id: "node:m2"
          }]
        },
        {
          id: "f1",
          kind: "family",
          label: "LIF family",
          attributes: { paper_count: 2 },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-node-f1",
            record_id: "node:f1"
          }]
        }
      ],
      edges: [
        {
          id: "edge:p1-instantiates-m1",
          source: "p1",
          target: "m1",
          kind: "instantiates",
          label: "instantiates",
          attributes: {},
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-edge-p1-m1",
            record_id: "edge:p1-instantiates-m1"
          }]
        },
        {
          id: "edge:m2-variant-m1",
          source: "m2",
          target: "m1",
          kind: "variant_of",
          label: "variant of",
          attributes: { delta_summary: "alpha-shaped postsynaptic current" },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-edge-m2-m1",
            record_id: "edge:m2-variant-m1"
          }],
          uncalibrated_score: {
            kind: "structural_similarity",
            value: 0.72,
            calibrated_posterior: false
          }
        },
        {
          id: "edge:m1-family-f1",
          source: "m1",
          target: "f1",
          kind: "belongs_to_family",
          label: "belongs to family",
          attributes: {},
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-edge-m1-f1",
            record_id: "edge:m1-family-f1"
          }]
        }
      ]
    },
    mode: "interactive",
    themeMode: "dark",
    // advisory_only:true — identity edges are advisory structural similarity.
    provenance: {
      ...synthetic({
        graph_source: "engram:corpus_entity_graph",
        graph_snapshot_id: "caller-declared-example-snapshot",
        graph_scope: "corpus_entity",
        identity_advisory: true
      }),
      advisory_only: true
    }
  }
};
var HOST_RENDERER_EXAMPLE_PAYLOADS = {
  "nest.spatial_2d": {
    skill: "nest.spatial_2d",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "d3",
    params: { positions: [[0, 0], [1, 1]], coordinate_units: "mm" },
    provenance: synthetic({
      extent: "[1,1]",
      spatial_units: "mm",
      mask: "none",
      kernel: "none"
    })
  },
  "nest.stimulus_response": {
    skill: "nest.stimulus_response",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "matplotlib",
    params: {
      times_ms: [0, 1, 2],
      stimulus: [0, 1, 0],
      response: [-65, -60, -64]
    },
    provenance: synthetic({ stim_units: "pA", units: "mV", time_units: "ms" })
  },
  "nest.compartmental_dynamics": {
    skill: "nest.compartmental_dynamics",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "d3",
    params: {
      times_ms: [0, 1, 2],
      compartments: [
        {
          id: "soma",
          parent_id: null,
          label: "soma",
          values: [-65, -64, -63]
        }
      ]
    },
    provenance: synthetic({
      morphology_disclaimer: "schematic topology; no inferred geometry",
      recorded_variable: "V_m",
      units: "mV",
      time_units: "ms",
      sampling_interval: 1
    })
  },
  "nest.animation_replay": {
    skill: "nest.animation_replay",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "manim",
    params: { frames: [{ time_ms: 0, state: { status: "initial" } }] },
    provenance: synthetic({ frame_rate: 30 })
  }
};
function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) deepFreezeJson(child);
  Object.freeze(value);
}
for (const [skill, payload] of Object.entries(SKILL_EXAMPLE_PAYLOADS)) {
  if (!payload) continue;
  payload.skill = skill;
  payload.specVersion = CORTEXEL_SPEC_VERSION;
  deepFreezeJson(payload);
}
Object.setPrototypeOf(SKILL_EXAMPLE_PAYLOADS, null);
Object.freeze(SKILL_EXAMPLE_PAYLOADS);
for (const payload of Object.values(HOST_RENDERER_EXAMPLE_PAYLOADS)) {
  if (payload) deepFreezeJson(payload);
}
Object.setPrototypeOf(HOST_RENDERER_EXAMPLE_PAYLOADS, null);
Object.freeze(HOST_RENDERER_EXAMPLE_PAYLOADS);
function getExamplePayload(id2) {
  if (!isSkillId(id2)) return void 0;
  const payload = SKILL_EXAMPLE_PAYLOADS[id2];
  return payload ? JSON.parse(JSON.stringify(payload)) : void 0;
}
function getHostRendererExamplePayload(id2) {
  if (!isSkillId(id2)) return void 0;
  const payload = HOST_RENDERER_EXAMPLE_PAYLOADS[id2];
  return payload ? JSON.parse(JSON.stringify(payload)) : void 0;
}
function getInvocationExamplePayload(id2) {
  return getExamplePayload(id2) ?? getHostRendererExamplePayload(id2);
}

// core/skills/registry.ts
function externalClaims(claims) {
  return claims;
}
function constraintEstablishesBinding(constraint) {
  return constraint.establishesBinding !== false;
}
function verificationKindForConstraints(constraints) {
  if (constraints.every((constraint) => constraint.kind === "equals_literal" || constraint.kind === "one_of_literals")) {
    return "literal_bound";
  }
  if (constraints.every((constraint) => constraint.kind === "equals_param" || constraint.kind === "equals_param_path")) {
    return "param_bound";
  }
  return "derived_bound";
}
function provenanceVerificationForContract(contract) {
  const verification = /* @__PURE__ */ Object.create(null);
  const classifiedKeys = [
    ...contract.requiredProvenanceKeys,
    ...contract.optionalProvenanceKeys ?? []
  ];
  for (const key of classifiedKeys) {
    const constraints = (contract.provenanceParamConstraints ?? []).filter(
      (constraint) => constraint.provenanceKey === key && constraintEstablishesBinding(constraint)
    );
    const external = contract.externalProvenanceClaims?.[key];
    if (constraints.length > 0 === (external !== void 0)) {
      throw new Error(
        `skill '${contract.id}' must classify required provenance '${key}' exactly once as mechanically bound or external`
      );
    }
    verification[key] = external ? { kind: "external_claim", reason: external.reason } : { kind: verificationKindForConstraints(constraints) };
  }
  return verification;
}
function externalProvenanceDisclosure(contract) {
  const labels = contract.requiredProvenanceKeys.filter((key) => contract.externalProvenanceClaims?.[key] !== void 0).map((key) => PROVENANCE_KEY_LABELS[key]);
  if (labels.length === 0) return null;
  return `Caller-declared provenance \u2014 Cortexel checked structure but could not verify against the checked payload or source: ${labels.join(", ")}.`;
}
var CORTEXEL_SKILL_VERSION = "1.8.0";
var STRICT_INVOCATION_POLICY = Object.freeze({
  version: "3",
  externalSelection: "validateSkillInvocation(id,payload): explicit id selects; payload.skill is optional but must match when present",
  selfDescribingSelection: "validateSpec(payload): payload.skill is required and selects the contract",
  hostSelection: "host envelopes require payload.skill; explicit id and payload.skill must match",
  unknownSkillIds: "reject",
  cortexelEnvelope: "allowed iff contract.scene is non-null; payload.scene must equal contract.scene",
  hostEnvelope: "allowed iff contract.scene is null; scene is forbidden",
  rendererRoute: "when selected, must occur in contract.rendererRoutes",
  params: "validate paramsJsonSchema then every paramConstraint",
  provenance: "apply strictProvenancePolicy, require every contract.requiredProvenanceFlags value, then evaluate every provenanceParamConstraint",
  provenanceVerification: "every allowed required or optional provenance key is classified exactly once as parameter/literal/derived-bound or an externally unverifiable caller claim with mandatory disclosure; all other declared keys reject"
});
var PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: "11",
  pathSyntax: "dot-separated object keys",
  arrayWildcard: "[*]",
  objectValueWildcard: "*",
  optionalSuffix: "?",
  evaluationOrder: Object.freeze([
    "normalize fields carrying x-cortexel-normalize",
    "validate paramsJsonSchema",
    "evaluate paramConstraints in listed order"
  ]),
  kinds: Object.freeze([
    "equal_length",
    "each_length_matches",
    "monotonic_non_decreasing",
    "strictly_increasing",
    "non_negative",
    "property_count",
    "unique_field",
    "unique_tuple",
    "references_exist",
    "no_self_loops",
    "same_keys",
    "cartesian_product_length",
    "permutation_of_keys",
    "endpoint_kinds",
    "mapped_value",
    "conditional_numeric_domain",
    "uniform_histogram_bins",
    "normalized_histogram_mass",
    "psth_derived_counts",
    "max_parallel_edges",
    "each_unique_field",
    "each_contains_field_value",
    "node_score_kind",
    "edge_score_kind",
    "ordered_interval",
    "uniform_bin_window",
    "population_rate_derived_values",
    "symmetric_lag_axis",
    "legacy_connection_channels",
    "connection_graph_snapshot",
    "matrix_connection_counts",
    "degree_distribution_consistency",
    "delay_distribution_consistency",
    "weight_histogram_consistency",
    "spatial_extent_bounds",
    "scope_compatibility",
    "phase_plane_direction_basis",
    "acyclic"
  ]),
  semantics: Object.freeze({
    equal_length: Object.freeze({
      pathRoles: "all paths resolve to arrays",
      rule: "all present arrays have identical length",
      optionalAbsent: "skip a path ending in ?"
    }),
    each_length_matches: Object.freeze({
      pathRoles: "first path resolves zero or more arrays; last path is the reference array",
      rule: "every first-path array length equals the reference-array length"
    }),
    monotonic_non_decreasing: Object.freeze({
      pathRoles: "each path resolves an ordered numeric sequence",
      rule: "for every adjacent pair previous <= next"
    }),
    strictly_increasing: Object.freeze({
      pathRoles: "each path resolves an ordered numeric sequence",
      rule: "for every adjacent pair previous < next"
    }),
    non_negative: Object.freeze({
      pathRoles: "each path resolves numeric values",
      rule: "every resolved number is >= 0"
    }),
    property_count: Object.freeze({
      pathRoles: "each path resolves objects",
      rule: "own enumerable property count is within optional min/max inclusive"
    }),
    unique_field: Object.freeze({
      pathRoles: "the first path resolves an array of objects; field names the key",
      rule: "field values are unique under JSON scalar equality"
    }),
    unique_tuple: Object.freeze({
      pathRoles: "paths resolve equal-length scalar sequences zipped by index",
      rule: "zipped JSON tuples are unique; when the final kind value is in symmetricKinds, canonicalize the first two tuple values lexicographically"
    }),
    references_exist: Object.freeze({
      pathRoles: "all paths except the last resolve references; the last resolves the allowed-id set",
      rule: "every non-null reference occurs in the allowed-id set"
    }),
    no_self_loops: Object.freeze({
      pathRoles: "first and second paths resolve equal-length source and target sequences",
      rule: "source[index] !== target[index] for every index"
    }),
    same_keys: Object.freeze({
      pathRoles: "paths resolve objects",
      rule: "all objects have exactly the same own enumerable string-key set"
    }),
    cartesian_product_length: Object.freeze({
      pathRoles: "first path resolves axis arrays; second path resolves output arrays",
      rule: "every output-array length equals the product of all axis-array lengths"
    }),
    permutation_of_keys: Object.freeze({
      pathRoles: "first path resolves a scalar sequence; second path resolves an object",
      rule: "the sequence contains every object key exactly once"
    }),
    endpoint_kinds: Object.freeze({
      pathRoles: "first path resolves edges with source/target/kind; second resolves nodes with id/kind",
      rule: "each edge endpoint node kind equals allowedEndpointKinds[edge.kind]"
    }),
    mapped_value: Object.freeze({
      pathRoles: "first path resolves a discriminator scalar; second path resolves its dependent scalar",
      rule: "the second value equals allowedValues[first value]"
    }),
    conditional_numeric_domain: Object.freeze({
      pathRoles: "first path resolves a discriminator scalar; second path resolves numeric values",
      rule: "every numeric value satisfies numericDomains[discriminator] inclusive min/max and optional integer requirement"
    }),
    uniform_histogram_bins: Object.freeze({
      pathRoles: "first path resolves the ordered bin-center array; second path resolves one numeric bin width",
      rule: "width and width/2 are positive and finite; every binary64 center-width/2 and center+width/2 edge is finite and strictly straddles its center; every represented edge span approximately equals width; adjacent represented edges meet within the bounded local-width/origin-roundoff tolerance; centers are strictly increasing; each adjacent delta approximately equals width",
      comparison: "abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))",
      internalEdgeComparison: "exact equality passes; otherwise origin-scaled roundoffUlps * 2^-52 must not exceed maxRoundoffFraction * abs(width), and abs(nextLeft-previousRight) <= absoluteTolerance + relativeTolerance * abs(width) + that bounded roundoff",
      nonNegativeLowerEdge: "when true, firstCenter-width/2 must be >= -tolerance, where tolerance uses firstCenter and width/2 in the same comparison formula"
    }),
    normalized_histogram_mass: Object.freeze({
      pathRoles: "first path resolves normalization mode; second resolves histogram values; third resolves bin width",
      absentMode: "when normalizationRules has no entry for the selected mode, skip the constraint",
      accumulation: "values must be finite and non-negative and are summed from index 0 to length-1 using IEEE-754 binary64 addition",
      measures: Object.freeze({
        sum: "compare the left-to-right value sum with target",
        density_integral: "multiply the left-to-right value sum by the positive finite width, then compare with target"
      }),
      comparison: "abs(actual-target) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(target))"
    }),
    psth_derived_counts: Object.freeze({
      pathRoles: "normalization mode, values array, positive safe-integer trial count, positive finite bin width in ms, and aggregation literal in that order",
      aggregation: "selected_senders_per_trial means each bin count is the aggregate number of raw spike events from all selected senders across the declared trials",
      recovery: Object.freeze({
        count: "rawCount = value",
        count_per_trial: "rawCount = value * trialCount",
        rate_hz: "rawCount = ((value * trialCount) * binWidthMs) / 1000"
      }),
      operationOrder: "evaluate the displayed rate_hz expression left-to-right with IEEE-754 binary64 operations; do not fuse or algebraically reorder it",
      nearestInteger: "round rawCount to the nearest mathematical integer; exact half ties go toward positive infinity (half ties necessarily fail the 1e-6 recovery tolerance)",
      rule: "count values are exact non-negative safe integers; normalized values pass only when rawCount and rounded are finite, rounded is a non-negative safe integer, and abs(rawCount-rounded) <= absoluteTolerance",
      relativeTolerance: "none; this constraint uses absoluteTolerance only"
    }),
    max_parallel_edges: Object.freeze({
      pathRoles: "the first path resolves an array of edges with source and target ids",
      pairIdentity: "source/target direction is ignored; canonicalize each pair by ECMAScript UTF-16 lexicographic order",
      rule: "the number of edges for every canonical unordered endpoint pair is <= max"
    }),
    each_unique_field: Object.freeze({
      pathRoles: "the first path resolves zero or more arrays of objects; field names the key",
      rule: "within each resolved array, field values are unique under JSON scalar equality"
    }),
    each_contains_field_value: Object.freeze({
      pathRoles: "the first path resolves zero or more arrays of objects; field names the key",
      rule: "within each resolved array, at least one object field value occurs in allowedFieldValues under JSON string equality"
    }),
    node_score_kind: Object.freeze({
      pathRoles: "the first path resolves an array of nodes with kind and optional uncalibrated_score.kind",
      absentScore: "an absent uncalibrated_score passes",
      rule: "a present score discriminator occurs in allowedScoreKinds[node.kind]"
    }),
    edge_score_kind: Object.freeze({
      pathRoles: "the first path resolves an array of edges with kind and optional uncalibrated_score.kind",
      absentScore: "an absent uncalibrated_score passes",
      rule: "a present score discriminator occurs in allowedScoreKinds[edge.kind]; an empty allowed list forbids scores for that edge kind"
    }),
    ordered_interval: Object.freeze({
      pathRoles: "first path resolves one finite interval start; second resolves one finite interval stop",
      rule: "stop is strictly greater than start"
    }),
    uniform_bin_window: Object.freeze({
      pathRoles: "ordered bin-center array, positive finite bin width, finite window start, finite window stop in that order",
      rule: "width/2 remains positive and finite; every binary64 center-width/2 and center+width/2 edge is finite and strictly straddles its center; every represented edge span approximately equals width; adjacent represented edges meet within the bounded local-width/origin-roundoff tolerance; centers are strictly increasing and uniformly spaced by width; firstCenter-width/2 equals start and lastCenter+width/2 equals stop",
      binning: "left-closed, right-open bins tile [start,stop) within the published bounded binary64 geometry tolerance",
      spacingComparison: "adjacent center deltas use abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual),abs(expected))",
      internalEdgeComparison: "exact equality passes; otherwise origin-scaled roundoffUlps * 2^-52 must not exceed maxRoundoffFraction * abs(width), and abs(nextLeft-previousRight) <= absoluteTolerance + relativeTolerance * abs(width) + that bounded roundoff",
      edgeComparison: "exact edge equality passes; otherwise the binary64 allowance must be <= maxRoundoffFraction * abs(binWidth), then abs(edge-expected) <= absoluteTolerance + relativeTolerance * abs(binWidth) + roundoffUlps * 2^-52 * max(abs(center),abs(binWidth/2),abs(edge),abs(expected)); an unresolved absolute origin fails closed"
    }),
    population_rate_derived_values: Object.freeze({
      pathRoles: "series array, shared bin-center array, positive finite bin width, normalization, aggregation, and binning literals in that order",
      fixedSemantics: "normalization=mean_per_recorded_sender_hz; aggregation=selected_senders; binning=left_closed_right_open",
      seriesRule: "series ids are unique; recorded_sender_count is a positive safe integer; spike_counts are non-negative safe integers; spike_counts and rates_hz each match the shared bin count",
      rateFormula: "expected = (spikeCount * 1000) / (recordedSenderCount * binWidthMs)",
      operationOrder: "multiply spikeCount by 1000; multiply recordedSenderCount by binWidthMs; divide the first result by the second using IEEE-754 binary64; do not fuse or algebraically reorder",
      comparison: "abs(rate-expected) <= absoluteTolerance + relativeTolerance * max(abs(rate), abs(expected))"
    }),
    symmetric_lag_axis: Object.freeze({
      pathRoles: "ordered lag-center array, positive finite bin width, positive finite tau_max_ms in that order",
      rule: "width/2 remains positive and finite; every binary64 lag-width/2 and lag+width/2 edge is finite, strictly straddles its lag center, and retains the declared width; adjacent represented edges meet within the bounded local-width/origin-roundoff tolerance; lags are strictly increasing, uniformly spaced by width, odd in count, pairwise symmetric about a zero center, and span [-tau_max_ms,+tau_max_ms] under the published comparison",
      comparison: "abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))",
      internalEdgeComparison: "exact equality passes; otherwise origin-scaled roundoffUlps * 2^-52 must not exceed maxRoundoffFraction * abs(width), and abs(nextLeft-previousRight) <= absoluteTolerance + relativeTolerance * abs(width) + that bounded roundoff"
    }),
    legacy_connection_channels: Object.freeze({
      pathRoles: "optional weights array, optional weight_units, optional delays array, and optional delay_units in that order",
      rule: "weights and weight_units occur together; delays and delay_units occur together; every present delay is finite and strictly positive",
      emptyChannels: "a present empty measurement array still requires its matching unit"
    }),
    connection_graph_snapshot: Object.freeze({
      pathRoles: "nodes array, edges array, sample_policy, source_connection_count, optional weight_units, optional delay_units, and edge_identity in that order",
      rule: "node and edge ids are unique; every edge endpoint exists; weight, delay_ms, and synapse_model are each present on every edge or none; measurement units occur exactly with their channel; complete output has edges.length=source_connection_count; deterministic_even_stride is a non-empty strict subset",
      identity: "canonical_sorted_ordinal requires connection:<safe ordinal> with ordinal < source_connection_count; nest_connection_identifier requires connection:source:target:target_thread:synapse_id:port with canonical nonnegative safe-integer components and endpoint correlation"
    }),
    matrix_connection_counts: Object.freeze({
      pathRoles: "ordered source_ids, ordered target_ids, sparse cells, total connection_count, and aggregation in that order",
      rule: "axis ids are unique; every cell has a unique in-universe source/target pair and positive safe-integer connection_count; the left-to-right safe-integer cell-count sum equals connection_count; single_connection requires every cell count to equal one",
      absence: "a missing sparse cell means no_connection; a present zero-valued weight cell remains a connection because connection_count is positive"
    }),
    degree_distribution_consistency: Object.freeze({
      pathRoles: "degrees, node_counts, displayed values, node_count, connection_count, direction, normalization, value_units, edge_counting, and zero_degree_policy in that order",
      rule: "degrees equal contiguous integers 0..N; counts and nonnegative values match their length; sum(node_counts)=node_count; sum(degree*node_count)=connection_count; displayed counts equal raw counts exactly; probabilities match raw count/node_count and sum to one",
      fixedSemantics: "edge_counting=each_synapse_collection_entry and zero_degree_policy=include_declared_universe"
    }),
    delay_distribution_consistency: Object.freeze({
      pathRoles: "bin centers, raw delay_counts, displayed values, bin width, connection_count, normalization, value units, delay units, aggregation, and binning in that order",
      rule: "the three bin arrays have equal length; displayed values are finite and nonnegative; sum(delay_counts)=connection_count; displayed counts equal raw counts exactly; probabilities or densities exactly equal the published binary64 recovery result and globally sum or integrate to one within the accumulated-mass tolerance; non-count normalization requires a non-empty snapshot and finite density denominator",
      operationOrder: "probability=count/connection_count; probability_density=count/(connection_count*bin_width_ms) using IEEE-754 binary64; per-bin comparison uses exact Object.is-equivalent binary64 identity, while absoluteTolerance/relativeTolerance apply only to accumulated normalized mass",
      geometry: "a separate uniform_bin_window constraint publishes and evaluates [start,stop) bin geometry within its bounded binary64 tolerance"
    }),
    weight_histogram_consistency: Object.freeze({
      pathRoles: "bin centers, raw weight_counts, displayed values, bin width, connection_count, normalization, value units, weight units, aggregation, and binning in that order",
      rule: "the three bin arrays have equal length; weight_counts are non-negative safe integers whose left-to-right safe-integer sum equals connection_count; displayed counts equal raw counts exactly; displayed probabilities are the exact published binary64 count/connection_count results; non-count normalization requires a non-empty snapshot",
      operationOrder: "probability=count/connection_count using one IEEE-754 binary64 division; per-bin comparison uses exact Object.is-equivalent binary64 identity",
      fixedSemantics: "aggregation=each_connection and binning=left_closed_right_open are checked literals; the advertised raw transform derives exactly one in-window weight per selected SynapseCollection entry, while a standalone serialized params object does not carry that derivation receipt",
      geometry: "a separate uniform_bin_window constraint publishes and evaluates [window_start,window_stop) bin geometry in weight_units within its bounded binary64 tolerance"
    }),
    spatial_extent_bounds: Object.freeze({
      pathRoles: "nodes array, extent tuple, and center tuple in that order",
      rule: "center \xB1 extent/2 must produce a strictly ordered representable interval on each axis; node ids are unique and every coordinate lies within those bounds using a separate tolerance for each axis",
      comparison: "axisTolerance = absoluteTolerance + relativeTolerance * abs(halfExtent) + boundedRoundoff; boundedRoundoff is the roundoffUlps * 2^-52 arithmetic allowance only when it is <= maxRoundoffFraction * abs(halfExtent), otherwise zero; the large absolute spatial origin never multiplies relativeTolerance",
      roundoff: "roundoffUlps and maxRoundoffFraction bound IEEE-754 binary64 repair for deriving center \xB1 extent/2; exact in-bound comparisons remain valid when repair is disabled"
    }),
    scope_compatibility: Object.freeze({
      pathRoles: "scope object and optional degree direction in that order",
      rule: "rank-local scopes require integer 0<=rank<world_size; merged scopes require positive world_size; when allowedFieldValues is present, scope.kind must occur in that closed set; legacy constraints without that field still forbid mpi_target_rank_local for out-degree"
    }),
    phase_plane_direction_basis: Object.freeze({
      pathRoles: "grid object, derivative-array object, coordinate-unit object, derivative-unit object, and shared derivative-time-unit scalar in that order",
      rule: 'grid has exactly two axes with at least two finite strictly increasing coordinates each; derivative and unit objects have exactly the grid keys; derivative_time_unit is ms or s; derivative_units[key] is exactly axis_units[key] + "/" + derivative_time_unit; a nonzero per-second component must remain nonzero after one binary64 division by 1000',
      canonicalNumericBasis: "renderers perform one binary64 division by 1000 for per-second components before deriving arrow direction or presentation length; this is one declared rounding basis, not a universal claim that independently rounded ms/s source representations are byte-identical"
    }),
    acyclic: Object.freeze({
      pathRoles: "first path resolves node ids; second resolves each node parent id or null",
      rule: "following parent links from any id never revisits an id"
    })
  })
});
var NEST_SKILL_REGISTRY = {
  "nest.voltage_trace": {
    id: "nest.voltage_trace",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST voltage trace renderer",
    description: "Render labeled multimeter/voltmeter series for one recorded variable and unit.",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    requiredInputKeys: ["times_ms", "series", "series_labels", "units"],
    paramsSchema: VoltageTraceParamsSchema,
    requiredProvenanceKeys: [
      "device_id",
      "recorded_variable",
      "units",
      "sampling_interval"
    ],
    externalProvenanceClaims: externalClaims({
      device_id: {
        reason: "The multimeter/voltmeter source-device identity is not represented in trace params."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "units",
        paramKey: "units",
        description: "Declared units must match the rendered trace-axis units."
      },
      {
        kind: "equals_literal",
        provenanceKey: "units",
        value: "mV",
        description: "The legacy voltage_trace skill is restricted to NEST membrane-potential millivolts; other analog quantities require a typed analog-trace contract."
      },
      {
        kind: "equals_literal",
        provenanceKey: "recorded_variable",
        value: "V_m",
        description: "The legacy voltage_trace skill is restricted to the NEST V_m variable."
      },
      {
        kind: "matches_regular_time_axis",
        provenanceKey: "sampling_interval",
        paramPath: "times_ms",
        absoluteTolerance: 0,
        relativeTolerance: 1e-12,
        roundoffUlps: 4,
        maxRoundoffFraction: 1e-7,
        description: "The declared device sampling interval must match every adjacent trace timestamp delta."
      },
      {
        kind: "each_label_matches_variable",
        provenanceKey: "recorded_variable",
        paramPath: "series_labels",
        separator: " \xB7 ",
        description: "Every trace label must identify the exact declared recorded variable."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "One neuron example / multimeter recording",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/one_neuron.html",
        dataShape: "times_ms + same-unit series split and labeled by sender",
        output: "Labeled same-unit trace series over the checked millisecond axis",
        note: "Use one invocation per variable/unit; never mix mV, pA and nS on one axis."
      }
    ]
  },
  "nest.spike_raster": {
    id: "nest.spike_raster",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST spike raster renderer",
    description: "Render exact spike_recorder event times and sender ids as a sender-time raster.",
    deviceFamily: "spike_recorder",
    scene: "spike-raster",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "events" },
    requiredInputKeys: ["times_ms", "senders"],
    paramsSchema: SpikeRasterParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units"
    ],
    externalProvenanceClaims: externalClaims({
      recorder_id: {
        reason: "The spike-recorder source identity is not represented in event params."
      },
      sender_ids: {
        reason: "Observed events cannot establish the complete recorded-sender universe because silent senders disappear."
      },
      population_labels: {
        reason: "Event params carry sender ids but no source population-identity mapping."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      },
      {
        kind: "matches_projected_id_collection",
        provenanceKey: "sender_ids",
        paramPath: "senders",
        idDomain: "nonnegative_safe_integer",
        comparison: "set",
        relation: "contains",
        allowDigest: false,
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "Every observed event sender must occur in the caller-declared recorded-sender universe; silent senders remain externally unverifiable."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Random balanced Brunel network",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html",
        dataShape: "spike_recorder events: times_ms, senders, population labels",
        output: "Exact sender-time raster with no invented rate bins or synthetic events",
        note: "Use exact spike times first; aggregate only when too dense to read."
      }
    ]
  },
  "nest.isi_distribution": {
    id: "nest.isi_distribution",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST inter-spike interval distribution renderer",
    description: "Render an explicitly normalized histogram of within-sender or single-train inter-spike intervals.",
    deviceFamily: "spike_recorder",
    scene: "isi-distribution",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "isi" },
    requiredInputKeys: [
      "bin_centers_ms",
      "values",
      "bin_width_ms",
      "normalization",
      "value_units",
      "interval_scope"
    ],
    paramsSchema: IsiDistributionParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units",
      "bin_ms",
      "histogram_normalization",
      "interval_scope"
    ],
    externalProvenanceClaims: externalClaims({
      recorder_id: {
        reason: "The source recorder identity is not retained by the derived histogram params."
      },
      sender_ids: {
        reason: "ISI aggregation does not retain the selected sender universe."
      },
      population_labels: {
        reason: "ISI aggregation does not retain population identity or membership."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "Inter-spike interval bin centers and widths are expressed in milliseconds."
      },
      {
        kind: "equals_param",
        provenanceKey: "bin_ms",
        paramKey: "bin_width_ms",
        description: "Declared bin width must match params.bin_width_ms."
      },
      {
        kind: "equals_param",
        provenanceKey: "histogram_normalization",
        paramKey: "normalization",
        description: "Declared histogram normalization must match params.normalization."
      },
      {
        kind: "equals_param",
        provenanceKey: "interval_scope",
        paramKey: "interval_scope",
        description: "Declared interval scope must match the rendered interval calculation."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Sinusoidal gamma generator example",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/sinusoidal_gamma_generator.html",
        dataShape: "ordered ISI bin centers plus counts, probabilities, or probability density",
        output: "Inter-spike interval histogram with explicit scope and normalization",
        note: "Compute intervals within each sender; never difference a globally interleaved recorder stream."
      }
    ]
  },
  "nest.psth": {
    id: "nest.psth",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST peri-stimulus time histogram renderer",
    description: "Render trial-aligned aggregate spike counts across selected senders, counts per trial, or firing rates around a declared event.",
    deviceFamily: "spike_recorder",
    scene: "psth",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "psth" },
    requiredInputKeys: [
      "bin_centers_ms",
      "values",
      "bin_width_ms",
      "normalization",
      "value_units",
      "trial_count",
      "alignment_event",
      "aggregation"
    ],
    paramsSchema: PsthParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units",
      "bin_ms",
      "histogram_normalization",
      "event_alignment",
      "psth_aggregation"
    ],
    externalProvenanceClaims: externalClaims({
      recorder_id: {
        reason: "The source recorder identity is not retained by PSTH params."
      },
      sender_ids: {
        reason: "PSTH aggregation retains recoverable counts but not selected sender identities."
      },
      population_labels: {
        reason: "PSTH params do not retain a population-identity mapping."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "PSTH bin centers and widths are expressed in milliseconds."
      },
      {
        kind: "equals_param",
        provenanceKey: "bin_ms",
        paramKey: "bin_width_ms",
        description: "Declared bin width must match params.bin_width_ms."
      },
      {
        kind: "equals_param",
        provenanceKey: "histogram_normalization",
        paramKey: "normalization",
        description: "Declared histogram normalization must match params.normalization."
      },
      {
        kind: "equals_param",
        provenanceKey: "event_alignment",
        paramKey: "alignment_event",
        description: "Declared event alignment must match params.alignment_event."
      },
      {
        kind: "equals_param",
        provenanceKey: "psth_aggregation",
        paramKey: "aggregation",
        description: "Declared PSTH aggregation must match params.aggregation."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Sinusoidal gamma generator example (one selected sender, one trial)",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/sinusoidal_gamma_generator.html",
        dataShape: "single-trial time bins aggregated across the selected sender set",
        output: "Peri-stimulus time histogram with auditable normalization",
        note: "The linked example is one trial; keep sender aggregation, trial count, bin width and alignment event in the checked payload."
      }
    ]
  },
  "nest.population_rate": {
    id: "nest.population_rate",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST population-rate renderer",
    description: "Render auditable mean firing-rate series derived from raw per-bin spike counts and the exact recorded-sender denominator.",
    deviceFamily: "spike_recorder",
    scene: "population-rate",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "population_rate" },
    requiredInputKeys: [
      "bin_centers_ms",
      "bin_width_ms",
      "window_start_ms",
      "window_stop_ms",
      "series",
      "normalization",
      "aggregation",
      "binning"
    ],
    paramsSchema: PopulationRateParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units",
      "bin_ms",
      "rate_normalization",
      "binning_policy"
    ],
    externalProvenanceClaims: externalClaims({
      recorder_id: {
        reason: "The source recorder identity is not represented in rate params."
      },
      sender_ids: {
        reason: "Per-series sender counts do not establish the identities of the selected senders."
      },
      population_labels: {
        reason: "Series display ids/labels are not a structured source population-identity mapping."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "canonical_json_array_length_at_least_projected_sum",
        provenanceKey: "sender_ids",
        paramPath: "series",
        field: "recorded_sender_count",
        idDomain: "nonnegative_safe_integer",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "The declared sender universe must be large enough for the summed disjoint per-population sender denominators; identities remain externally unverifiable."
      },
      {
        kind: "matches_projected_id_collection",
        provenanceKey: "population_labels",
        paramPath: "series",
        field: "id",
        idDomain: "nonblank_string",
        comparison: "set",
        relation: "equals",
        allowDigest: true,
        allowOpaqueDigestCount: false,
        establishesBinding: false,
        description: "The caller-declared population-label tokens must match the checked population-rate series ids; source population identity remains external."
      },
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "Population-rate bin centers, widths, and window bounds are expressed in milliseconds."
      },
      {
        kind: "equals_param",
        provenanceKey: "bin_ms",
        paramKey: "bin_width_ms",
        description: "Declared bin width must match params.bin_width_ms."
      },
      {
        kind: "equals_param",
        provenanceKey: "rate_normalization",
        paramKey: "normalization",
        description: "Declared rate normalization must match params.normalization."
      },
      {
        kind: "equals_param",
        provenanceKey: "binning_policy",
        paramKey: "binning",
        description: "Declared bin interval policy must match params.binning."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Population firing-rate trace derived from spike_recorder events",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html",
        dataShape: "uniform [start,stop) bins, raw population spike counts, sender denominator, and derived mean rates",
        output: "One or more auditable mean-per-recorded-sender population-rate traces",
        note: "Preserve raw counts and the exact recorded sender count; never divide by an undeclared population size."
      }
    ]
  },
  "nest.rate_response": {
    id: "nest.rate_response",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST rate / IF response renderer",
    description: "Render firing-rate / IF response points against declared stimulus amplitudes.",
    deviceFamily: "spike_recorder",
    scene: "fi-curve",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "fi_response" },
    requiredInputKeys: ["stimulus_amplitudes", "rates_hz", "stimulus_units"],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "bin_ms", "rate_normalization"],
    externalProvenanceClaims: externalClaims({
      bin_ms: {
        reason: "The response params contain no observation window, raw counts, or bin axis from which to verify this duration."
      },
      rate_normalization: {
        reason: "The response params contain rates only, without the denominator or derivation needed to verify normalization."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "stim_units",
        paramKey: "stimulus_units",
        description: "Declared stimulus units must match params.stimulus_units."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "IF curve example",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/if_curve.html",
        dataShape: "stimulus amplitudes and rates_hz with declared stimulus units",
        output: "F-I response line and points with declared stimulus and rate units",
        note: "Show the declared bin width and rate normalization; this legacy envelope carries no counting-window bounds."
      }
    ]
  },
  "nest.connectivity_matrix": {
    id: "nest.connectivity_matrix",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST connectivity edge-list topology renderer",
    description: "Render SynapseCollection endpoint pairs and optional unit-bound weight and delay channels as schematic node-link topology (legacy skill id; not a literal matrix heatmap).",
    deviceFamily: "get_connections",
    scene: "network-topology",
    // Connectivity evidence contains endpoints and optional measured channels, not spatial
    // coordinates. Any node placement in the topology scene is schematic.
    weak: true,
    weakDisclosure: "Schematic topology layout \u2014 node positions and distances are derived for readability; only the declared endpoint pairs and optional measurement channels are evidence.",
    deprecation: {
      since: "1.6.0",
      replacement: "nest.connection_graph",
      message: "Legacy edge-list skill id; use nest.connection_graph for explicit graph, snapshot, sampling, and multapse semantics."
    },
    routerEligibility: { bareFamilyCandidate: false },
    requiredInputKeys: ["sources", "targets"],
    paramsSchema: NetworkParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy"
    ],
    externalProvenanceClaims: externalClaims({
      source_ids: {
        reason: "The deprecated edge list retains observed endpoints, not the complete selected source universe."
      },
      target_ids: {
        reason: "The deprecated edge list retains observed endpoints, not the complete selected target universe."
      },
      synapse_model: {
        reason: "The deprecated edge-list params do not retain a snapshot-level synapse model."
      },
      connection_sample_policy: {
        reason: "The deprecated edge-list params do not retain a sampling/completeness policy."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "matches_projected_id_collection",
        provenanceKey: "source_ids",
        paramPath: "sources",
        idDomain: "nonnegative_safe_integer",
        comparison: "set",
        relation: "contains",
        allowDigest: false,
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "Every observed legacy edge source must occur in the caller-declared source universe."
      },
      {
        kind: "matches_projected_id_collection",
        provenanceKey: "target_ids",
        paramPath: "targets",
        idDomain: "nonnegative_safe_integer",
        comparison: "set",
        relation: "contains",
        allowDigest: false,
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "Every observed legacy edge target must occur in the caller-declared target universe."
      },
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "When declared, legacy graph weight units must match params.weight_units."
      },
      {
        kind: "equals_param",
        provenanceKey: "delay_units",
        paramKey: "delay_units",
        description: "When declared, legacy graph delay units must match params.delay_units."
      }
    ],
    optionalProvenanceKeys: ["weight_units", "delay_units"],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Plot weight matrices example / SynapseCollection",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html",
        dataShape: "parallel source/target endpoint arrays plus optional unit-bound weights and delays",
        output: "Schematic node-edge topology from the checked edge list",
        note: "Optional weights and delays remain edge measurements; topology positions and distances are schematic."
      }
    ]
  },
  "nest.connection_graph": {
    id: "nest.connection_graph",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST connection topology graph renderer",
    description: "Render a complete or explicitly deterministic sample of a SynapseCollection snapshot while preserving isolates, autapses, multapses, and measured channels.",
    deviceFamily: "get_connections",
    scene: "network-topology",
    weak: true,
    weakDisclosure: "Schematic topology layout \u2014 circle positions and distances are derived for readability; edges are complete or deterministically sampled exactly as declared.",
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: "connection_graph"
    },
    transform: {
      id: "synapseCollectionToConnectionGraphParams",
      rawFields: [
        "source|sources",
        "target|targets",
        "weight|weights?",
        "delay|delays?",
        "synapse_model|synapse_models? (required when weight or delay is present)",
        "target_thread|target_threads?",
        "synapse_id|synapse_ids?",
        "port|ports?"
      ],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope",
        "samplePolicy",
        "synapseModelSemantics when weight or delay is present",
        "weightUnits when weight is present",
        "delayUnits='ms' when delay is present"
      ],
      outputSkill: "nest.connection_graph"
    },
    requiredInputKeys: [
      "nodes",
      "edges",
      "layout",
      "parallel_edges",
      "self_connections",
      "snapshot_time_ms",
      "snapshot_scope",
      "sample_policy",
      "source_connection_count",
      "edge_identity"
    ],
    paramsSchema: ConnectionGraphParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy"
    ],
    externalProvenanceClaims: externalClaims({
      source_ids: {
        reason: "Graph params preserve a role-erased node union; observed edges cannot establish isolated selected sources."
      },
      target_ids: {
        reason: "Graph params preserve a role-erased node union; observed edges cannot establish isolated selected targets."
      },
      synapse_model: {
        reason: "Edge-level model values can prevent contradictions when present but do not establish a snapshot-level model for empty or model-omitting graphs."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "matches_projected_id_collection",
        provenanceKey: "source_ids",
        paramPath: "edges",
        field: "source",
        idDomain: "nonnegative_safe_integer",
        comparison: "set",
        relation: "contains",
        allowDigest: false,
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "Every rendered edge source must occur in the caller-declared source universe; isolated selected sources remain externally unverifiable."
      },
      {
        kind: "matches_projected_id_collection",
        provenanceKey: "target_ids",
        paramPath: "edges",
        field: "target",
        idDomain: "nonnegative_safe_integer",
        comparison: "set",
        relation: "contains",
        allowDigest: false,
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "Every rendered edge target must occur in the caller-declared target universe; isolated selected targets remain externally unverifiable."
      },
      {
        kind: "all_projected_values_equal",
        provenanceKey: "synapse_model",
        paramPath: "edges",
        field: "synapse_model",
        emptyPolicy: "pass_unverifiable",
        establishesBinding: false,
        description: "Whenever edge-level synapse models are present, every one must match the caller-declared snapshot model."
      },
      {
        kind: "equals_param",
        provenanceKey: "connection_sample_policy",
        paramKey: "sample_policy",
        description: "Declared graph sampling must match params.sample_policy."
      },
      {
        kind: "equals_param",
        provenanceKey: "snapshot_time_ms",
        paramKey: "snapshot_time_ms",
        description: "Declared snapshot time must match params.snapshot_time_ms."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "snapshot_scope",
        paramPath: "snapshot_scope.kind",
        description: "Declared snapshot scope must match params.snapshot_scope.kind."
      },
      {
        kind: "equals_param",
        provenanceKey: "parallel_edge_policy",
        paramKey: "parallel_edges",
        description: "Declared parallel-edge policy must match params.parallel_edges."
      },
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "When declared, graph weight units must match params.weight_units."
      },
      {
        kind: "equals_param",
        provenanceKey: "delay_units",
        paramKey: "delay_units",
        description: "When declared, graph delay units must match params.delay_units."
      }
    ],
    optionalProvenanceKeys: ["weight_units", "delay_units"],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [{
      nestExample: "SynapseCollection connection inspection",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/v3.10/synapses/synapse_specification.html#inspecting-connections",
      dataShape: "explicit node universe plus one preserved graph edge per selected SynapseCollection entry",
      output: "Schematic directed topology graph with disclosed completeness and snapshot scope",
      note: "Circle placement is schematic; complete and deterministic samples are never conflated."
    }]
  },
  "nest.adjacency_matrix": {
    id: "nest.adjacency_matrix",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST binary adjacency matrix renderer",
    description: "Render sparse connection presence with target rows, source columns, and explicit multapse counts.",
    deviceFamily: "get_connections",
    scene: "connection-matrix",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "adjacency_matrix" },
    transform: {
      id: "synapseCollectionToAdjacencyMatrixParams",
      rawFields: ["source|sources", "target|targets"],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope (not target-rank-local)"
      ],
      outputSkill: "nest.adjacency_matrix"
    },
    requiredInputKeys: [
      "source_ids",
      "target_ids",
      "cells",
      "axis_order",
      "absent_cell",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope",
      "display",
      "aggregation"
    ],
    paramsSchema: AdjacencyMatrixParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "matrix_axis_order",
      "matrix_aggregation"
    ],
    externalProvenanceClaims: externalClaims({
      synapse_model: {
        reason: "Adjacency-matrix params do not retain the snapshot synapse model."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "matches_canonical_json_param",
        provenanceKey: "source_ids",
        paramPath: "source_ids",
        allowDigest: true,
        description: "Declared source axes must equal the exact ordered matrix source_ids or their RFC 8785 SHA-256 digest."
      },
      {
        kind: "matches_canonical_json_param",
        provenanceKey: "target_ids",
        paramPath: "target_ids",
        allowDigest: true,
        description: "Declared target axes must equal the exact ordered matrix target_ids or their RFC 8785 SHA-256 digest."
      },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Only complete connection snapshots may form a literal matrix." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Declared snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Declared snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "preserved_as_connection_count", description: "Parallel connections are preserved as each sparse cell count." },
      { kind: "equals_param", provenanceKey: "matrix_axis_order", paramKey: "axis_order", description: "Declared matrix axes must match params." },
      { kind: "equals_param", provenanceKey: "matrix_aggregation", paramKey: "aggregation", description: "Declared matrix aggregation must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "Explicit adjacency representation",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/v3.10/synapses/connectivity_concepts.html#explicit-connections",
      dataShape: "ordered source/target axes plus sparse positive connection-count cells",
      output: "Binary adjacency heatmap with target rows and source columns",
      note: "Absent cells mean no connection; multapses remain visible through connection_count."
    }]
  },
  "nest.weight_matrix": {
    id: "nest.weight_matrix",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST connection-weight matrix renderer",
    description: "Render explicitly aggregated SynapseCollection weights without conflating absent and zero-valued cells.",
    deviceFamily: "get_connections",
    scene: "connection-matrix",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "weight_matrix" },
    transform: {
      id: "synapseCollectionToWeightMatrixParams",
      rawFields: [
        "source|sources",
        "target|targets",
        "weight|weights",
        "synapse_model|synapse_models"
      ],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope (not target-rank-local)",
        "synapseModelSemantics (exactly one observed model for a nonempty measured aggregate)",
        "weightUnits",
        "aggregation"
      ],
      outputSkill: "nest.weight_matrix"
    },
    requiredInputKeys: [
      "source_ids",
      "target_ids",
      "cells",
      "weight_units",
      "aggregation",
      "axis_order",
      "absent_cell",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: WeightMatrixParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "weight_units",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "matrix_axis_order",
      "matrix_aggregation"
    ],
    externalProvenanceClaims: externalClaims({
      synapse_model: {
        reason: "Weight-matrix params do not retain the snapshot synapse model."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "matches_canonical_json_param",
        provenanceKey: "source_ids",
        paramPath: "source_ids",
        allowDigest: true,
        description: "Declared source axes must equal the exact ordered matrix source_ids or their RFC 8785 SHA-256 digest."
      },
      {
        kind: "matches_canonical_json_param",
        provenanceKey: "target_ids",
        paramPath: "target_ids",
        allowDigest: true,
        description: "Declared target axes must equal the exact ordered matrix target_ids or their RFC 8785 SHA-256 digest."
      },
      { kind: "equals_param", provenanceKey: "weight_units", paramKey: "weight_units", description: "Weight units must match params." },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Only complete connection snapshots may form a literal matrix." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "preserved_as_connection_count", description: "Parallel connections remain auditable via connection_count." },
      { kind: "equals_param", provenanceKey: "matrix_axis_order", paramKey: "axis_order", description: "Matrix axis order must match params." },
      { kind: "equals_param", provenanceKey: "matrix_aggregation", paramKey: "aggregation", description: "Weight aggregation must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "Plot weight matrices example",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/v3.10/auto_examples/plot_weight_matrices.html",
      dataShape: "ordered node axes plus sparse measured-weight cells and multapse counts",
      output: "Unit-labelled weight heatmap",
      note: "A present zero/cancelled cell remains distinct from an absent connection."
    }]
  },
  "nest.delay_matrix": {
    id: "nest.delay_matrix",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST synaptic-delay matrix renderer",
    description: "Render explicitly aggregated positive synaptic delays in milliseconds.",
    deviceFamily: "get_connections",
    scene: "connection-matrix",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "delay_matrix" },
    transform: {
      id: "synapseCollectionToDelayMatrixParams",
      rawFields: [
        "source|sources",
        "target|targets",
        "delay|delays",
        "synapse_model|synapse_models"
      ],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope (not target-rank-local)",
        "synapseModelSemantics (exactly one observed model for a nonempty measured aggregate)",
        "delayUnits='ms'",
        "aggregation"
      ],
      outputSkill: "nest.delay_matrix"
    },
    requiredInputKeys: [
      "source_ids",
      "target_ids",
      "cells",
      "delay_units",
      "aggregation",
      "axis_order",
      "absent_cell",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: DelayMatrixParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "delay_units",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "matrix_axis_order",
      "matrix_aggregation"
    ],
    externalProvenanceClaims: externalClaims({
      synapse_model: {
        reason: "Delay-matrix params do not retain the snapshot synapse model."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "matches_canonical_json_param",
        provenanceKey: "source_ids",
        paramPath: "source_ids",
        allowDigest: true,
        description: "Declared source axes must equal the exact ordered matrix source_ids or their RFC 8785 SHA-256 digest."
      },
      {
        kind: "matches_canonical_json_param",
        provenanceKey: "target_ids",
        paramPath: "target_ids",
        allowDigest: true,
        description: "Declared target axes must equal the exact ordered matrix target_ids or their RFC 8785 SHA-256 digest."
      },
      { kind: "equals_param", provenanceKey: "delay_units", paramKey: "delay_units", description: "Delay units must match params." },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Only complete connection snapshots may form a literal matrix." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "preserved_as_connection_count", description: "Parallel connections remain auditable via connection_count." },
      { kind: "equals_param", provenanceKey: "matrix_axis_order", paramKey: "axis_order", description: "Matrix axis order must match params." },
      { kind: "equals_param", provenanceKey: "matrix_aggregation", paramKey: "aggregation", description: "Delay aggregation must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "SynapseCollection delay inspection",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/v3.10/synapses/synapse_specification.html#inspecting-connections",
      dataShape: "ordered node axes plus sparse positive delay cells and multapse counts",
      output: "Millisecond delay heatmap",
      note: "Parallel-delay aggregation is always explicit."
    }]
  },
  "nest.in_degree_distribution": {
    id: "nest.in_degree_distribution",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST in-degree distribution renderer",
    description: "Render the measured incoming-edge distribution over the complete declared target universe.",
    deviceFamily: "get_connections",
    scene: "degree-distribution",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "in_degree_distribution" },
    transform: {
      id: "synapseCollectionToInDegreeDistributionParams",
      rawFields: ["source|sources", "target|targets"],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope (not target-rank-local)",
        "normalization"
      ],
      outputSkill: "nest.in_degree_distribution"
    },
    requiredInputKeys: [
      "degrees",
      "node_counts",
      "values",
      "node_count",
      "connection_count",
      "direction",
      "normalization",
      "value_units",
      "edge_counting",
      "zero_degree_policy",
      "sample_policy",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: InDegreeDistributionParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "degree_direction",
      "degree_counting",
      "zero_degree_policy",
      "histogram_normalization"
    ],
    externalProvenanceClaims: externalClaims({
      source_ids: {
        reason: "The aggregate degree distribution does not retain source identities."
      },
      target_ids: {
        reason: "The aggregate degree distribution retains a target count but not target identities."
      },
      synapse_model: {
        reason: "The aggregate degree params do not retain the snapshot synapse model."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "canonical_json_array_length_matches_param",
        provenanceKey: "source_ids",
        paramPath: "connection_count",
        idDomain: "nonnegative_safe_integer",
        relation: "nonempty_if_positive",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "A positive in-degree connection count requires at least one source id; aggregate degree params still do not identify that source universe."
      },
      {
        kind: "canonical_json_array_length_matches_param",
        provenanceKey: "target_ids",
        paramPath: "node_count",
        idDomain: "nonnegative_safe_integer",
        relation: "equals",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "The declared target-universe count must equal the checked in-degree node_count; aggregate params still do not retain identities."
      },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Degree input must be complete for its declared scope." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "count_each_connection", description: "Every multapse contributes one degree edge." },
      { kind: "equals_param", provenanceKey: "degree_direction", paramKey: "direction", description: "Degree direction must match params." },
      { kind: "equals_param", provenanceKey: "degree_counting", paramKey: "edge_counting", description: "Degree counting must match params." },
      { kind: "equals_param", provenanceKey: "zero_degree_policy", paramKey: "zero_degree_policy", description: "Zero-degree policy must match params." },
      { kind: "equals_param", provenanceKey: "histogram_normalization", paramKey: "normalization", description: "Degree normalization must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "Directed connectivity degree concepts",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/v3.10/synapses/connectivity_concepts.html",
      dataShape: "contiguous degree bins, exact node counts, and explicit zero-degree inclusion",
      output: "In-degree count or probability distribution",
      note: "Each SynapseCollection entry counts, including multapses; target-rank-local snapshots are rejected without exact target-ownership authority."
    }]
  },
  "nest.out_degree_distribution": {
    id: "nest.out_degree_distribution",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST out-degree distribution renderer",
    description: "Render the measured outgoing-edge distribution over the complete declared source universe.",
    deviceFamily: "get_connections",
    scene: "degree-distribution",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "out_degree_distribution" },
    transform: {
      id: "synapseCollectionToOutDegreeDistributionParams",
      rawFields: ["source|sources", "target|targets"],
      requiredOptions: ["sourceIds", "targetIds", "snapshotTimeMs", "snapshotScope (not target-rank-local)", "normalization"],
      outputSkill: "nest.out_degree_distribution"
    },
    requiredInputKeys: [
      "degrees",
      "node_counts",
      "values",
      "node_count",
      "connection_count",
      "direction",
      "normalization",
      "value_units",
      "edge_counting",
      "zero_degree_policy",
      "sample_policy",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: OutDegreeDistributionParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "degree_direction",
      "degree_counting",
      "zero_degree_policy",
      "histogram_normalization"
    ],
    externalProvenanceClaims: externalClaims({
      source_ids: {
        reason: "The aggregate degree distribution retains a source count but not source identities."
      },
      target_ids: {
        reason: "The aggregate degree distribution does not retain target identities."
      },
      synapse_model: {
        reason: "The aggregate degree params do not retain the snapshot synapse model."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "canonical_json_array_length_matches_param",
        provenanceKey: "source_ids",
        paramPath: "node_count",
        idDomain: "nonnegative_safe_integer",
        relation: "equals",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "The declared source-universe count must equal the checked out-degree node_count; aggregate params still do not retain identities."
      },
      {
        kind: "canonical_json_array_length_matches_param",
        provenanceKey: "target_ids",
        paramPath: "connection_count",
        idDomain: "nonnegative_safe_integer",
        relation: "nonempty_if_positive",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "A positive out-degree connection count requires at least one target id; aggregate degree params still do not identify that target universe."
      },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Degree input must be complete for its declared scope." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "count_each_connection", description: "Every multapse contributes one degree edge." },
      { kind: "equals_param", provenanceKey: "degree_direction", paramKey: "direction", description: "Degree direction must match params." },
      { kind: "equals_param", provenanceKey: "degree_counting", paramKey: "edge_counting", description: "Degree counting must match params." },
      { kind: "equals_param", provenanceKey: "zero_degree_policy", paramKey: "zero_degree_policy", description: "Zero-degree policy must match params." },
      { kind: "equals_param", provenanceKey: "histogram_normalization", paramKey: "normalization", description: "Degree normalization must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "Directed connectivity degree concepts",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/v3.10/synapses/connectivity_concepts.html",
      dataShape: "contiguous degree bins, exact node counts, and explicit zero-degree inclusion",
      output: "Out-degree count or probability distribution",
      note: "Target-rank-local GetConnections evidence is rejected for out-degree."
    }]
  },
  "nest.delay_distribution": {
    id: "nest.delay_distribution",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST synaptic-delay distribution renderer",
    description: "Render checked left-closed/right-open bins over one delay value per selected connection.",
    deviceFamily: "get_connections",
    scene: "delay-distribution",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "delay_distribution" },
    transform: {
      id: "synapseCollectionToDelayDistributionParams",
      rawFields: [
        "source|sources",
        "target|targets",
        "delay|delays",
        "synapse_model|synapse_models"
      ],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope",
        "synapseModelSemantics (exactly one observed model for a nonempty measured aggregate)",
        "delayUnits='ms'",
        "binWidthMs",
        "windowStartMs",
        "windowStopMs",
        "normalization"
      ],
      outputSkill: "nest.delay_distribution"
    },
    requiredInputKeys: [
      "bin_centers_ms",
      "delay_counts",
      "values",
      "bin_width_ms",
      "window_start_ms",
      "window_stop_ms",
      "normalization",
      "value_units",
      "delay_units",
      "aggregation",
      "binning",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: DelayDistributionParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "delay_units",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "bin_ms",
      "histogram_normalization",
      "binning_policy"
    ],
    externalProvenanceClaims: externalClaims({
      source_ids: {
        reason: "The aggregate delay histogram does not retain source identities."
      },
      target_ids: {
        reason: "The aggregate delay histogram does not retain target identities."
      },
      synapse_model: {
        reason: "The aggregate delay params do not retain the snapshot synapse model."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "canonical_json_array_length_matches_param",
        provenanceKey: "source_ids",
        paramPath: "connection_count",
        idDomain: "nonnegative_safe_integer",
        relation: "nonempty_if_positive",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "A positive delay-observation count requires at least one source id; aggregate histogram params still do not identify the source universe."
      },
      {
        kind: "canonical_json_array_length_matches_param",
        provenanceKey: "target_ids",
        paramPath: "connection_count",
        idDomain: "nonnegative_safe_integer",
        relation: "nonempty_if_positive",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "A positive delay-observation count requires at least one target id; aggregate histogram params still do not identify the target universe."
      },
      { kind: "equals_param", provenanceKey: "delay_units", paramKey: "delay_units", description: "Delay units must match params." },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Delay histogram input must be complete for its scope." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "count_each_connection", description: "Every selected connection contributes one delay." },
      { kind: "equals_param", provenanceKey: "bin_ms", paramKey: "bin_width_ms", description: "Delay bin width must match params." },
      { kind: "equals_param", provenanceKey: "histogram_normalization", paramKey: "normalization", description: "Delay normalization must match params." },
      { kind: "equals_param", provenanceKey: "binning_policy", paramKey: "binning", description: "Delay binning policy must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "SynapseCollection delay inspection",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/v3.10/synapses/synapse_specification.html#inspecting-connections",
      dataShape: "one positive millisecond delay per selected connection in checked uniform bins",
      output: "Delay count, probability, or probability-density histogram",
      note: "Out-of-window delays are transform errors, never silently discarded."
    }]
  },
  "nest.weight_histogram": {
    id: "nest.weight_histogram",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST connection-weight histogram renderer",
    description: "Render the measured weight distribution of a declared GetConnections snapshot.",
    deviceFamily: "get_connections",
    scene: "weight-histogram",
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: "weight_distribution"
    },
    transform: {
      id: "synapseCollectionToWeightHistogramParams",
      rawFields: [
        "source|sources",
        "target|targets",
        "weight|weights",
        "synapse_model|synapse_models"
      ],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope",
        "synapseModelSemantics (exactly one observed model for a nonempty measured aggregate)",
        "weightUnits",
        "binWidth",
        "windowStart",
        "windowStop",
        "normalization"
      ],
      outputSkill: "nest.weight_histogram"
    },
    requiredInputKeys: [
      "bin_centers",
      "weight_counts",
      "values",
      "bin_width",
      "window_start",
      "window_stop",
      "weight_units",
      "normalization",
      "value_units",
      "aggregation",
      "binning",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: WeightHistogramParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "weight_units",
      "histogram_normalization",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy"
    ],
    externalProvenanceClaims: externalClaims({
      source_ids: {
        reason: "The aggregate weight histogram does not retain source identities."
      },
      target_ids: {
        reason: "The aggregate weight histogram does not retain target identities."
      },
      synapse_model: {
        reason: "The aggregate weight params do not retain the snapshot synapse model."
      },
      parallel_edge_policy: {
        reason: "The serialized histogram retains aggregate counts but no raw-entry derivation receipt from which to authenticate the claimed one-entry/one-observation mapping."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "canonical_json_array_length_matches_param",
        provenanceKey: "source_ids",
        paramPath: "connection_count",
        idDomain: "nonnegative_safe_integer",
        relation: "nonempty_if_positive",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "A positive weight-observation count requires at least one source id; aggregate histogram params still do not identify the source universe."
      },
      {
        kind: "canonical_json_array_length_matches_param",
        provenanceKey: "target_ids",
        paramPath: "connection_count",
        idDomain: "nonnegative_safe_integer",
        relation: "nonempty_if_positive",
        allowOpaqueDigestCount: true,
        establishesBinding: false,
        description: "A positive weight-observation count requires at least one target id; aggregate histogram params still do not identify the target universe."
      },
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "Declared weight units must match params.weight_units."
      },
      {
        kind: "equals_param",
        provenanceKey: "histogram_normalization",
        paramKey: "normalization",
        description: "Declared histogram normalization must match params.normalization."
      },
      {
        kind: "equals_param",
        provenanceKey: "connection_sample_policy",
        paramKey: "sample_policy",
        description: "Declared connection sampling must match params.sample_policy."
      },
      {
        kind: "equals_param",
        provenanceKey: "snapshot_time_ms",
        paramKey: "snapshot_time_ms",
        description: "Declared snapshot time must match params.snapshot_time_ms."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "snapshot_scope",
        paramPath: "snapshot_scope.kind",
        description: "Declared snapshot scope must match params.snapshot_scope.kind."
      },
      {
        kind: "equals_literal",
        provenanceKey: "parallel_edge_policy",
        value: "count_each_connection",
        establishesBinding: false,
        description: "The declared one-entry/one-observation policy must equal the contract literal; serialized aggregate params alone do not authenticate the raw mapping."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Plot weight matrices example / SynapseCollection snapshot",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html",
        dataShape: "raw per-bin connection counts complete for one typed declared GetConnections snapshot scope",
        output: "Connection-weight count or probability histogram",
        note: "The advertised raw transform derives one observation per selected connection; a serialized params object carries no transform receipt, and weight_recorder update events are a different, biased sample."
      }
    ]
  },
  "nest.spatial_2d": {
    id: "nest.spatial_2d",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST legacy 2D position host envelope",
    description: "Validate anonymous 2D position tuples and coordinate units for an explicitly selected host renderer; Cortexel supplies no scene.",
    deviceFamily: "get_position",
    scene: null,
    // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    deprecation: {
      since: "1.6.0",
      replacement: "nest.spatial_map_2d",
      message: "Legacy host-only coordinate list; use nest.spatial_map_2d for identified nodes and explicit layer/MPI semantics."
    },
    routerEligibility: { bareFamilyCandidate: false },
    requiredInputKeys: ["positions", "coordinate_units"],
    paramsSchema: Spatial2DParamsSchema,
    requiredProvenanceKeys: ["extent", "spatial_units", "mask", "kernel"],
    externalProvenanceClaims: externalClaims({
      extent: {
        reason: "Anonymous point bounds are not the declared layer extent and params contain no center/extent object."
      },
      mask: {
        reason: "The network-generation mask is source configuration, not measured position data."
      },
      kernel: {
        reason: "The network-generation kernel is source configuration, not measured position data."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "canonical_json_array_length_equals",
        provenanceKey: "extent",
        expectedLength: 2,
        establishesBinding: false,
        description: "A 2D host envelope requires a canonical two-axis extent; this shape check does not verify the caller-declared layer extent."
      },
      {
        kind: "equals_param",
        provenanceKey: "spatial_units",
        paramKey: "coordinate_units",
        description: "Declared spatial units must match the coordinate axis units."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Circular mask, Gaussian kernel, grid/free spatial examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/connex.html",
        dataShape: "anonymous x/y position tuples plus coordinate units",
        output: "Validated host envelope only; the selected host owns rendering and caption display.",
        note: "Extent, mask, and kernel are caller-declared metadata, not structured render data; use nest.spatial_map_2d for identified measured positions."
      }
    ]
  },
  "nest.spatial_map_2d": {
    id: "nest.spatial_map_2d",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST measured 2D spatial map renderer",
    description: "Render identified 2D GetPosition coordinates inside the declared layer extent with explicit periodic-boundary and MPI completeness semantics.",
    deviceFamily: "get_position",
    scene: "spatial-map-2d",
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: "positions_2d"
    },
    transform: {
      id: "getPositionToSpatialMap2DParams",
      rawFields: ["positions", "node_ids?"],
      requiredOptions: [
        "nodeIds",
        "coordinateUnits",
        "extent",
        "center",
        "edgeWrap",
        "positionScope"
      ],
      outputSkill: "nest.spatial_map_2d"
    },
    requiredInputKeys: [
      "nodes",
      "coordinate_units",
      "extent",
      "center",
      "edge_wrap",
      "position_scope",
      "marker_size"
    ],
    paramsSchema: SpatialMap2DParamsSchema,
    requiredProvenanceKeys: [
      "node_ids",
      "spatial_units",
      "extent",
      "position_scope"
    ],
    provenanceParamConstraints: [
      {
        kind: "matches_projected_id_collection",
        provenanceKey: "node_ids",
        paramPath: "nodes",
        field: "id",
        idDomain: "nonnegative_safe_integer",
        comparison: "set",
        relation: "equals",
        allowDigest: true,
        allowOpaqueDigestCount: false,
        description: "Declared node ids must equal the measured node-id set or its RFC 8785 SHA-256 digest."
      },
      {
        kind: "equals_param",
        provenanceKey: "spatial_units",
        paramKey: "coordinate_units",
        description: "Declared spatial units must match params.coordinate_units."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "position_scope",
        paramPath: "position_scope.kind",
        description: "Declared position scope must match params.position_scope.kind."
      },
      {
        kind: "matches_canonical_json_param",
        provenanceKey: "extent",
        paramPath: "extent",
        allowDigest: false,
        description: "Declared numeric extent must exactly equal params.extent in canonical JSON."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [{
      nestExample: "Spatial layer and GetPosition",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/v3.10/ref_material/pynest_api/nest.lib.hl_api_spatial.html#nest.lib.hl_api_spatial.GetPosition",
      dataShape: "identified x/y coordinates plus layer extent, center, edge-wrap, units, and completeness scope",
      output: "Equal-aspect measured spatial node map",
      note: "Masks and probability kernels are separate analyses and are not invented from GetPosition."
    }]
  },
  "nest.spatial_3d": {
    id: "nest.spatial_3d",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST 3D spatial renderer",
    description: "Render 3D population/node positions for spatial inspection.",
    deviceFamily: "get_position",
    scene: "network-topology",
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: "positions_3d"
    },
    requiredInputKeys: ["objects", "coordinate_units"],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ["extent", "spatial_units", "projection_sample_policy"],
    externalProvenanceClaims: externalClaims({
      extent: {
        reason: "Position bounds are not a layer extent and params contain no center/extent object."
      },
      projection_sample_policy: {
        reason: "The positioned-object params do not retain a structured projection sampling policy."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "canonical_json_array_length_equals",
        provenanceKey: "extent",
        expectedLength: 3,
        establishesBinding: false,
        description: "A 3D positioned-node scene requires a canonical three-axis extent; this shape check does not verify the caller-declared layer extent."
      },
      {
        kind: "equals_param",
        provenanceKey: "spatial_units",
        paramKey: "coordinate_units",
        description: "Declared spatial units must match the coordinate axis units."
      }
    ],
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
        dataShape: "x/y/z positioned objects plus coordinate units",
        output: "Unit-labelled 3D positioned-node scene for host rendering",
        note: "Extent and projection-sample policy are caller declarations, not edge data; use 3D only as a positioned-node inspection aid."
      }
    ]
  },
  "nest.plasticity_dynamics": {
    id: "nest.plasticity_dynamics",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST plasticity dynamics renderer",
    description: "Render recorded synaptic-weight samples over time.",
    deviceFamily: "weight_recorder",
    scene: "stdp",
    requiredInputKeys: ["times_ms", "weights", "weight_units"],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ["synapse_model", "weight_units"],
    externalProvenanceClaims: externalClaims({
      synapse_model: {
        reason: "Weight traces do not retain the recorded synapse/model identity."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "Declared weight units must match the rendered weight axis."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Urbanczik-Senn / Clopath / Tsodyks short-term plasticity",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/urbanczik_synapse_example.html",
        dataShape: "weight-recorder times_ms and weights in one declared unit",
        output: "Measured synaptic-weight trace over time",
        note: "This contract does not contain an STDP window or pre/post spike protocol; do not invent either."
      }
    ]
  },
  "nest.phase_plane": {
    id: "nest.phase_plane",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST phase-plane renderer",
    description: "Render checked numeric derivative directions on a non-degenerate Cartesian phase-plane grid with one shared time basis.",
    deviceFamily: "computed",
    scene: "phase-plane",
    requiredInputKeys: [
      "grid",
      "derivatives",
      "axis_units",
      "derivative_units",
      "derivative_time_unit",
      "axis_order",
      "flattening"
    ],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: [
      "state_variables",
      "derivation_method",
      "model_context",
      "fixed_parameters"
    ],
    externalProvenanceClaims: externalClaims({
      derivation_method: {
        reason: "The vector-field params contain derivative values but no structured derivation method/version."
      },
      model_context: {
        reason: "The vector-field params contain no structured model identity/version."
      },
      fixed_parameters: {
        reason: "The vector-field params do not retain the fixed-parameter map and units."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "matches_canonical_json_param",
        provenanceKey: "state_variables",
        paramPath: "axis_order",
        allowDigest: false,
        description: "Declared state variables must exactly match params.axis_order in canonical JSON."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Numerical phase-plane analysis of the Hodgkin-Huxley neuron",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/hh_phaseplane.html",
        dataShape: "strictly increasing state-variable axes, flattened derivative arrays, one explicit shared derivative time unit, and explicit ordering",
        output: "Unit-labelled numeric derivative directions normalized in plotted coordinate space",
        note: "Arrow direction is derived after conversion to one shared per-ms numeric basis; arrow length is presentation-only and no nullcline, trajectory, or equilibrium is present."
      }
    ]
  },
  "nest.correlogram": {
    id: "nest.correlogram",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST correlogram / synchrony renderer",
    description: "Render a symmetric correlation_detector lag histogram with explicit pair orientation, interval policy, counting window, zero-lag handling, and statistic semantics.",
    deviceFamily: "correlation_detector",
    scene: "correlogram",
    transform: {
      id: "correlationDetectorToCorrelogramParams",
      rawFields: [
        "delta_tau",
        "tau_max",
        "Tstart",
        "Tstop",
        "count_histogram"
      ],
      requiredOptions: [
        "measurement='count_histogram'",
        "referenceLabel",
        "targetLabel",
        "zeroLagPolicy='included'",
        "sourceConfiguration.simulationResolutionMs",
        "sourceConfiguration.simulationStartMs",
        "sourceConfiguration.simulationStopMs",
        "sourceConfiguration.referenceReceptorPort=0",
        "sourceConfiguration.targetReceptorPort=1"
      ],
      outputSkill: "nest.correlogram"
    },
    requiredInputKeys: [
      "lags_ms",
      "values",
      "bin_width_ms",
      "tau_max_ms",
      "counting_start_ms",
      "counting_stop_ms",
      "pair",
      "lag_convention",
      "binning",
      "zero_lag_policy",
      "statistic"
    ],
    paramsSchema: CorrelogramParamsSchema,
    requiredProvenanceKeys: [
      "detector_id",
      "reference_population",
      "target_population",
      "bin_ms",
      "correlation_normalization",
      "correlation_units",
      "lag_convention",
      "binning_policy"
    ],
    externalProvenanceClaims: externalClaims({
      detector_id: {
        reason: "The source correlation-detector identity is not represented in correlogram params."
      },
      reference_population: {
        reason: "The reference label is caller supplied and does not authenticate which external population was wired to detector receptor port 0."
      },
      target_population: {
        reason: "The target label is caller supplied and does not authenticate which external population was wired to detector receptor port 1."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "bin_ms",
        paramKey: "bin_width_ms",
        description: "Declared bin width must match params.bin_width_ms."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "reference_population",
        paramPath: "pair.reference_label",
        establishesBinding: false,
        description: "Declared reference population must match params.pair.reference_label."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "target_population",
        paramPath: "pair.target_label",
        establishesBinding: false,
        description: "Declared target population must match params.pair.target_label."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "correlation_normalization",
        paramPath: "statistic.kind",
        description: "Declared normalization/statistic must match params.statistic.kind."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "correlation_units",
        paramPath: "statistic.units",
        description: "Declared value units must match params.statistic.units."
      },
      {
        kind: "equals_param",
        provenanceKey: "lag_convention",
        paramKey: "lag_convention",
        description: "Declared lag convention must match params.lag_convention."
      },
      {
        kind: "equals_param",
        provenanceKey: "binning_policy",
        paramKey: "binning",
        description: "Declared bin interval policy must match params.binning."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Auto- and crosscorrelation functions for spike trains",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/cross_check_mip_corrdet.html",
        dataShape: "symmetric lag centers, values, bin/tau/counting-window semantics, oriented population pair, and discriminated statistic",
        output: "Canonical correlogram distinct from ISI and other time histograms",
        note: "The raw transform requires the documented port order, resolution, and simulation-window margins, but serialized labels/configuration remain source claims; positive lag means target follows reference."
      }
    ]
  },
  "nest.stimulus_response": {
    id: "nest.stimulus_response",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST stimulus-response host envelope",
    description: "Validate aligned time, stimulus, and response arrays for an explicitly selected host renderer; Cortexel supplies no scene.",
    deviceFamily: "multimeter",
    scene: null,
    // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ["times_ms", "stimulus", "response"],
    paramsSchema: StimulusResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "units", "time_units"],
    externalProvenanceClaims: externalClaims({
      stim_units: {
        reason: "Stimulus-response params contain an untyped stimulus array without a unit field."
      },
      units: {
        reason: "Stimulus-response params contain an untyped response array without a unit field."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Sinusoidal generator / pulse packet / repeated stimulation",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/pulsepacket.html",
        dataShape: "aligned times_ms, stimulus, and response arrays",
        output: "Validated host envelope only; the selected host owns any composite panels.",
        note: "The envelope carries no spike-event or epoch structure; the host must not infer either."
      }
    ]
  },
  "nest.astrocyte_dynamics": {
    id: "nest.astrocyte_dynamics",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST astrocyte concentration-trace renderer",
    description: "Render one declared non-negative glial concentration trace carried as ca_trace.",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    weak: true,
    // analog-trace reuse: Ca/IP3 are not membrane voltage
    weakDisclosure: "Derived view \u2014 a declared glial concentration trace is shown through the analog-trace scene; it is not membrane voltage.",
    requiredInputKeys: ["times_ms", "ca_trace", "units"],
    paramsSchema: AstrocyteParamsSchema,
    requiredProvenanceKeys: [
      "recorded_variable",
      "units",
      "time_units",
      "sampling_interval"
    ],
    externalProvenanceClaims: externalClaims({
      recorded_variable: {
        reason: "The legacy ca_trace field does not distinguish the NEST Ca and Ca_astro source-variable names."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "units",
        paramKey: "units",
        description: "Declared units must match the rendered glial trace units."
      },
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      },
      {
        kind: "one_of_literals",
        provenanceKey: "recorded_variable",
        values: ["Ca", "Ca_astro"],
        establishesBinding: false,
        description: "The legacy ca_trace field carries only the NEST Ca/Ca_astro concentration variable."
      },
      {
        kind: "matches_regular_time_axis",
        provenanceKey: "sampling_interval",
        paramPath: "times_ms",
        absoluteTolerance: 0,
        relativeTolerance: 1e-12,
        roundoffUlps: 4,
        maxRoundoffFraction: 1e-7,
        description: "The declared device sampling interval must match every adjacent glial timestamp delta."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Single astrocyte / tripartite interaction examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/astrocytes/astrocyte_single.html",
        dataShape: "times_ms, one ca_trace array, and its declared units",
        output: "One glial concentration trace via the analog-trace scene (flagged derived)",
        note: "The legacy envelope carries neither multiple state variables nor linked neuronal events."
      }
    ]
  },
  "nest.compartmental_dynamics": {
    id: "nest.compartmental_dynamics",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST compartment-tree trace host envelope",
    description: "Validate an id/parent compartment topology and aligned per-compartment values for an explicitly selected host renderer.",
    deviceFamily: "multimeter",
    scene: null,
    // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ["times_ms", "compartments"],
    paramsSchema: CompartmentalParamsSchema,
    requiredProvenanceKeys: [
      "morphology_disclaimer",
      "recorded_variable",
      "units",
      "time_units",
      "sampling_interval"
    ],
    externalProvenanceClaims: externalClaims({
      morphology_disclaimer: {
        reason: "Morphology geometry is absent; this caller text cannot substitute for a contract-owned geometry disclosure."
      },
      recorded_variable: {
        reason: "Compartment traces do not carry a structured shared/per-series recorded variable."
      },
      units: {
        reason: "Compartment traces do not carry a structured shared/per-series unit."
      }
    }),
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      },
      {
        kind: "matches_regular_time_axis",
        provenanceKey: "sampling_interval",
        paramPath: "times_ms",
        absoluteTolerance: 0,
        relativeTolerance: 1e-12,
        roundoffUlps: 4,
        maxRoundoffFraction: 1e-7,
        description: "The declared device sampling interval must match every adjacent compartment timestamp delta."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Receptors/current and two-compartment neuron examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/compartmental_model/receptors_and_current.html",
        dataShape: "times_ms plus compartments with id, parent_id, optional label, and aligned values",
        output: "Validated host envelope for a schematic compartment tree and aligned traces.",
        note: "The envelope carries no receptor-port or morphology-geometry data; the host must not invent either."
      }
    ]
  },
  "nest.animation_replay": {
    id: "nest.animation_replay",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST state replay / animation storyboard renderer",
    description: "Render time-evolution storyboards and inspectable state replays.",
    deviceFamily: "computed",
    scene: null,
    // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ["frames"],
    paramsSchema: AnimationReplayParamsSchema,
    requiredProvenanceKeys: ["frame_rate"],
    externalProvenanceClaims: externalClaims({
      frame_rate: {
        reason: "Playback frame rate is not derivable from simulation timestamps without an explicit playback time scale."
      }
    }),
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
    version: CORTEXEL_SKILL_VERSION,
    title: "Corpus knowledge-graph 3D renderer",
    description: "Render a bounded, evidence-shaped cross-paper entity multigraph: paper/model/family nodes plus identified citation, instantiation, family and advisory identity assertions. Every element carries typed caller-declared evidence-reference metadata; the legacy envelope does not resolve or authenticate those references. Every numeric score is discriminated and explicitly uncalibrated.",
    deviceFamily: "corpus",
    scene: "knowledge-graph-3d",
    // weak: identity edges are advisory structural similarity, NOT certified
    // sameness, and force-layout geometry is algorithmic rather than evidence.
    // This is NOT scene reuse — knowledge-graph-3d is the native scene — so the
    // disclosure is about DATA semantics, not fidelity of the renderer.
    weak: true,
    weakDisclosure: "Advisory graph \u2014 every corpus-entity assertion is derived; same_as/variant_of edges are structural similarity, not certified sameness; force-layout positions and distances are schematic, not quantitative evidence.",
    requiredInputKeys: [
      "graph_id",
      "graph_source",
      "graph_snapshot_id",
      "graph_scope",
      "generated_at",
      "nodes",
      "edges"
    ],
    paramsSchema: KnowledgeGraph3DParamsSchema,
    requiredProvenanceKeys: [
      "graph_source",
      "graph_snapshot_id",
      "graph_scope",
      "identity_advisory"
    ],
    requiredProvenanceFlags: {
      advisory_only: true,
      is_paper_local_evidence: false
    },
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "graph_source",
        paramKey: "graph_source",
        description: "The declared graph source must match params.graph_source."
      },
      {
        kind: "equals_param",
        provenanceKey: "graph_snapshot_id",
        paramKey: "graph_snapshot_id",
        description: "The declared snapshot namespace must match params.graph_snapshot_id."
      },
      {
        kind: "equals_param",
        provenanceKey: "graph_scope",
        paramKey: "graph_scope",
        description: "The declared graph scope must match params.graph_scope."
      },
      {
        kind: "equals_literal",
        provenanceKey: "identity_advisory",
        value: true,
        description: "Corpus identity and genealogy assertions are always advisory."
      }
    ],
    rendererRoutes: ["media.model_graph", "fiber"],
    examples: [
      {
        nestExample: "Cross-paper corpus knowledge graph (papers + models + families)",
        sourceUrl: "https://github.com/sepahead/Paper2Brain#knowledge-graph",
        dataShape: "caller-declared-snapshot paper/model/family nodes and stable-id multigraph edges, each with typed evidence-reference metadata, bounded attributes, derived/advisory epistemic status and optional uncalibrated scores",
        output: "Advisory 3D force-directed multigraph with citation-flow particles and programmatically exposed DOM reference detail",
        note: "Legacy 1.4 inspection contract: references are not resolved or authenticated; identity edges are advisory and force-layout geometry is non-evidentiary."
      }
    ]
  }
};
var PARAM_VALIDATION_CONSTRAINTS = {
  "nest.voltage_trace": [
    {
      kind: "equal_length",
      paths: ["series", "series_labels"],
      description: "Every trace series must have one non-empty label."
    },
    {
      kind: "each_length_matches",
      paths: ["series[*]", "times_ms"],
      description: "Every trace series must contain one value per times_ms sample."
    },
    {
      kind: "strictly_increasing",
      paths: ["times_ms"],
      description: "Trace timestamps must be strictly increasing."
    }
  ],
  "nest.spike_raster": [
    {
      kind: "equal_length",
      paths: ["times_ms", "senders"],
      description: "Every spike timestamp must have one sender id."
    }
  ],
  "nest.isi_distribution": [
    {
      kind: "equal_length",
      paths: ["bin_centers_ms", "values"],
      description: "Every ISI histogram bin center must have one value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["bin_centers_ms"],
      description: "ISI bin centers must be monotonically non-decreasing."
    },
    {
      kind: "uniform_histogram_bins",
      paths: ["bin_centers_ms", "bin_width_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      nonNegativeLowerEdge: true,
      description: "ISI bins must be strictly increasing, uniformly spaced by bin_width_ms, and have a non-negative lower edge."
    },
    {
      kind: "non_negative",
      paths: ["bin_centers_ms[*]", "values[*]"],
      description: "ISI bin centers and histogram values cannot be negative."
    },
    {
      kind: "mapped_value",
      paths: ["normalization", "value_units"],
      allowedValues: {
        count: "count",
        probability: "probability",
        probability_density: "1/ms"
      },
      description: "Each ISI normalization has one unambiguous value unit."
    },
    {
      kind: "conditional_numeric_domain",
      paths: ["normalization", "values[*]"],
      numericDomains: {
        count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        probability: { min: 0, max: 1 },
        probability_density: { min: 0 }
      },
      description: "ISI counts are safe integers, probabilities lie in [0,1], and density values are non-negative."
    },
    {
      kind: "normalized_histogram_mass",
      paths: ["normalization", "values", "bin_width_ms"],
      absoluteTolerance: HISTOGRAM_MASS_TOLERANCE,
      relativeTolerance: HISTOGRAM_MASS_TOLERANCE,
      normalizationRules: {
        probability: { measure: "sum", target: 1 },
        probability_density: { measure: "density_integral", target: 1 }
      },
      description: "ISI probability mass must sum to one and probability density must integrate to one."
    }
  ],
  "nest.psth": [
    {
      kind: "equal_length",
      paths: ["bin_centers_ms", "values"],
      description: "Every PSTH bin center must have one value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["bin_centers_ms"],
      description: "PSTH bin centers must be monotonically non-decreasing."
    },
    {
      kind: "uniform_histogram_bins",
      paths: ["bin_centers_ms", "bin_width_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "PSTH bins must be strictly increasing and uniformly spaced by bin_width_ms."
    },
    {
      kind: "non_negative",
      paths: ["values[*]"],
      description: "PSTH values cannot be negative."
    },
    {
      kind: "mapped_value",
      paths: ["normalization", "value_units"],
      allowedValues: {
        count: "count",
        count_per_trial: "count/trial",
        rate_hz: "Hz"
      },
      description: "Each PSTH normalization has one unambiguous value unit."
    },
    {
      kind: "conditional_numeric_domain",
      paths: ["normalization", "values[*]"],
      numericDomains: {
        count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        count_per_trial: { min: 0 },
        rate_hz: { min: 0 }
      },
      description: "PSTH counts are safe integers and all normalized values are non-negative."
    },
    {
      kind: "psth_derived_counts",
      paths: ["normalization", "values", "trial_count", "bin_width_ms", "aggregation"],
      absoluteTolerance: PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE,
      description: "Every displayed PSTH value must recover an integer aggregate spike-event count across the selected senders and trials."
    }
  ],
  "nest.population_rate": [
    {
      kind: "each_length_matches",
      paths: ["series[*].spike_counts", "bin_centers_ms"],
      description: "Every population spike-count series has one value per shared time bin."
    },
    {
      kind: "each_length_matches",
      paths: ["series[*].rates_hz", "bin_centers_ms"],
      description: "Every population-rate series has one value per shared time bin."
    },
    {
      kind: "unique_field",
      paths: ["series"],
      field: "id",
      description: "Population-rate series ids must be unique."
    },
    {
      kind: "ordered_interval",
      paths: ["window_start_ms", "window_stop_ms"],
      description: "The population-rate counting window must have positive duration."
    },
    {
      kind: "uniform_bin_window",
      paths: ["bin_centers_ms", "bin_width_ms", "window_start_ms", "window_stop_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "Uniform left-closed/right-open bins must cover the declared [window_start_ms,window_stop_ms) interval within the bounded binary64 geometry tolerance."
    },
    {
      kind: "population_rate_derived_values",
      paths: [
        "series",
        "bin_centers_ms",
        "bin_width_ms",
        "normalization",
        "aggregation",
        "binning"
      ],
      absoluteTolerance: POPULATION_RATE_ABSOLUTE_TOLERANCE,
      relativeTolerance: POPULATION_RATE_RELATIVE_TOLERANCE,
      description: "Every mean-per-recorded-sender rate must be recoverable from its raw integer spike count, sender denominator, and bin width."
    }
  ],
  "nest.rate_response": [
    {
      kind: "equal_length",
      paths: ["stimulus_amplitudes", "rates_hz"],
      description: "Every stimulus amplitude must have one firing-rate value."
    },
    {
      kind: "non_negative",
      paths: ["rates_hz[*]"],
      description: "Firing rates cannot be negative."
    }
  ],
  "nest.connectivity_matrix": [
    {
      kind: "equal_length",
      paths: ["sources", "targets", "weights?", "delays?"],
      description: "Connection endpoints and optional measurement channels are parallel arrays."
    },
    {
      kind: "legacy_connection_channels",
      paths: ["weights?", "weight_units?", "delays?", "delay_units?"],
      description: "Legacy optional measurement channels remain unit-bound and delays remain strictly positive."
    }
  ],
  "nest.connection_graph": [
    {
      kind: "connection_graph_snapshot",
      paths: [
        "nodes",
        "edges",
        "sample_policy",
        "source_connection_count",
        "weight_units?",
        "delay_units?",
        "edge_identity"
      ],
      description: "Graph identity, endpoint, optional-channel, unit, and sample-count semantics remain auditable."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      description: "Snapshot MPI rank metadata must be internally valid."
    }
  ],
  "nest.adjacency_matrix": [
    {
      kind: "matrix_connection_counts",
      paths: ["source_ids", "target_ids", "cells", "connection_count", "aggregation"],
      description: "Sparse adjacency cells are unique, in-universe, positive-count entries whose counts recover the snapshot total."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      allowedFieldValues: [
        "single_process_complete",
        "mpi_all_ranks_merged"
      ],
      description: "Literal matrices require a complete single-process or all-ranks-merged snapshot."
    }
  ],
  "nest.weight_matrix": [
    {
      kind: "matrix_connection_counts",
      paths: ["source_ids", "target_ids", "cells", "connection_count", "aggregation"],
      description: "Sparse weight cells are unique, in-universe, positive-count entries whose counts recover the snapshot total."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      allowedFieldValues: [
        "single_process_complete",
        "mpi_all_ranks_merged"
      ],
      description: "Literal matrices require a complete single-process or all-ranks-merged snapshot."
    }
  ],
  "nest.delay_matrix": [
    {
      kind: "matrix_connection_counts",
      paths: ["source_ids", "target_ids", "cells", "connection_count", "aggregation"],
      description: "Sparse delay cells are unique, in-universe, positive-count entries whose counts recover the snapshot total."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      allowedFieldValues: [
        "single_process_complete",
        "mpi_all_ranks_merged"
      ],
      description: "Literal matrices require a complete single-process or all-ranks-merged snapshot."
    }
  ],
  "nest.in_degree_distribution": [
    {
      kind: "degree_distribution_consistency",
      paths: [
        "degrees",
        "node_counts",
        "values",
        "node_count",
        "connection_count",
        "direction",
        "normalization",
        "value_units",
        "edge_counting",
        "zero_degree_policy"
      ],
      absoluteTolerance: 1e-12,
      relativeTolerance: 1e-12,
      description: "In-degree bins, raw node counts, totals, normalization, and displayed values agree exactly."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope", "direction"],
      allowedFieldValues: [
        "single_process_complete",
        "mpi_all_ranks_merged"
      ],
      description: "In-degree requires a complete single-process or all-ranks-merged snapshot."
    }
  ],
  "nest.out_degree_distribution": [
    {
      kind: "degree_distribution_consistency",
      paths: [
        "degrees",
        "node_counts",
        "values",
        "node_count",
        "connection_count",
        "direction",
        "normalization",
        "value_units",
        "edge_counting",
        "zero_degree_policy"
      ],
      absoluteTolerance: 1e-12,
      relativeTolerance: 1e-12,
      description: "Out-degree bins, raw node counts, totals, normalization, and displayed values agree exactly."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope", "direction"],
      allowedFieldValues: [
        "single_process_complete",
        "mpi_all_ranks_merged"
      ],
      description: "Out-degree requires a complete single-process or all-ranks-merged snapshot."
    }
  ],
  "nest.delay_distribution": [
    {
      kind: "uniform_bin_window",
      paths: ["bin_centers_ms", "bin_width_ms", "window_start_ms", "window_stop_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "Uniform left-closed/right-open delay bins cover the declared window within the bounded binary64 geometry tolerance."
    },
    {
      kind: "delay_distribution_consistency",
      paths: [
        "bin_centers_ms",
        "delay_counts",
        "values",
        "bin_width_ms",
        "connection_count",
        "normalization",
        "value_units",
        "delay_units",
        "aggregation",
        "binning"
      ],
      absoluteTolerance: HISTOGRAM_MASS_TOLERANCE,
      relativeTolerance: HISTOGRAM_MASS_TOLERANCE,
      description: "Raw delay counts, normalization, and displayed values recover one another."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      description: "Snapshot MPI rank metadata must be internally valid."
    }
  ],
  "nest.spatial_map_2d": [
    {
      kind: "spatial_extent_bounds",
      paths: ["nodes", "extent", "center"],
      absoluteTolerance: 0,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: SPATIAL_BOUNDS_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "Every identified 2D node lies within the declared center \xB1 extent/2 bounds."
    },
    {
      kind: "scope_compatibility",
      paths: ["position_scope"],
      description: "Position MPI rank metadata must be internally valid."
    }
  ],
  "nest.weight_histogram": [
    {
      kind: "uniform_bin_window",
      paths: [
        "bin_centers",
        "bin_width",
        "window_start",
        "window_stop"
      ],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "Uniform left-closed/right-open weight bins cover the declared weight window within the bounded binary64 geometry tolerance."
    },
    {
      kind: "weight_histogram_consistency",
      paths: [
        "bin_centers",
        "weight_counts",
        "values",
        "bin_width",
        "connection_count",
        "normalization",
        "value_units",
        "weight_units",
        "aggregation",
        "binning"
      ],
      description: "Raw connection counts, normalization, and displayed weight-histogram values recover one another exactly."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      description: "Snapshot MPI rank metadata must be internally valid."
    }
  ],
  "nest.plasticity_dynamics": [
    {
      kind: "equal_length",
      paths: ["times_ms", "weights"],
      description: "Every plasticity timestamp must have one weight value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Plasticity timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.phase_plane": [
    {
      kind: "phase_plane_direction_basis",
      paths: [
        "grid",
        "derivatives",
        "axis_units",
        "derivative_units",
        "derivative_time_unit"
      ],
      description: "Both non-degenerate axes and both derivative components share one exact, machine-checkable time denominator before renderer normalization."
    },
    {
      kind: "property_count",
      paths: ["grid"],
      min: 2,
      max: 2,
      description: "A phase plane has exactly two state-variable axes."
    },
    {
      kind: "same_keys",
      paths: ["grid", "derivatives"],
      description: "Derivative fields must use the same state-variable names as the grid."
    },
    {
      kind: "same_keys",
      paths: ["grid", "axis_units"],
      description: "Every phase-plane axis must declare its coordinate units."
    },
    {
      kind: "same_keys",
      paths: ["grid", "derivative_units"],
      description: "Every phase-plane derivative field must declare its units."
    },
    {
      kind: "cartesian_product_length",
      paths: ["grid.*", "derivatives.*"],
      description: "Each derivative field has one value per Cartesian grid point."
    },
    {
      kind: "permutation_of_keys",
      paths: ["axis_order", "grid"],
      description: "axis_order must contain every grid key exactly once, in flattening order."
    }
  ],
  "nest.correlogram": [
    {
      kind: "equal_length",
      paths: ["lags_ms", "values"],
      description: "Every lag must have one correlogram value."
    },
    {
      kind: "symmetric_lag_axis",
      paths: ["lags_ms", "bin_width_ms", "tau_max_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "Correlogram lag centers must be strictly increasing, uniform, odd, zero-centered, symmetric, and span [-tau_max_ms,+tau_max_ms]."
    },
    {
      kind: "ordered_interval",
      paths: ["counting_start_ms", "counting_stop_ms"],
      description: "The correlogram counting window must have positive duration."
    },
    {
      kind: "conditional_numeric_domain",
      paths: ["statistic.kind", "values[*]"],
      numericDomains: {
        raw_pair_count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        weighted_pair_sum: { min: -34028234663852886e22, max: 34028234663852886e22 },
        pair_rate_hz: { min: 0, max: 34028234663852886e22 },
        pearson_coefficient: { min: -1, max: 1 }
      },
      description: "Correlogram values must obey the numeric domain implied by their discriminated statistic."
    }
  ],
  "nest.stimulus_response": [
    {
      kind: "equal_length",
      paths: ["times_ms", "stimulus", "response"],
      description: "Time, stimulus, and response samples must align one-to-one."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Stimulus-response timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.astrocyte_dynamics": [
    {
      kind: "equal_length",
      paths: ["times_ms", "ca_trace"],
      description: "Every glial sample must have one timestamp."
    },
    {
      kind: "strictly_increasing",
      paths: ["times_ms"],
      description: "Glial timestamps must be strictly increasing."
    },
    {
      kind: "non_negative",
      paths: ["ca_trace[*]"],
      description: "The declared Ca\xB2\u207A concentration trace cannot be negative."
    }
  ],
  "nest.compartmental_dynamics": [
    {
      kind: "each_length_matches",
      paths: ["compartments[*].values", "times_ms"],
      description: "Every compartment trace has one value per timestamp."
    },
    {
      kind: "unique_field",
      paths: ["compartments"],
      field: "id",
      description: "Compartment ids must be unique."
    },
    {
      kind: "references_exist",
      paths: ["compartments[*].parent_id", "compartments[*].id"],
      description: "Every non-null parent id must reference a declared compartment."
    },
    {
      kind: "acyclic",
      paths: ["compartments[*].id", "compartments[*].parent_id"],
      description: "The compartment parent graph must be acyclic."
    },
    {
      kind: "strictly_increasing",
      paths: ["times_ms"],
      description: "Compartment timestamps must be strictly increasing."
    }
  ],
  "nest.animation_replay": [
    {
      kind: "monotonic_non_decreasing",
      paths: ["frames[*].time_ms"],
      description: "Replay frame timestamps must be monotonically non-decreasing."
    },
    {
      kind: "property_count",
      paths: ["frames[*].state"],
      min: 1,
      description: "Every replay frame state must contain at least one field."
    }
  ],
  "corpus.knowledge_graph": [
    {
      kind: "unique_field",
      paths: ["nodes"],
      field: "id",
      description: "Node ids must be unique."
    },
    {
      kind: "unique_field",
      paths: ["edges"],
      field: "id",
      description: "Edge assertion ids must be unique; parallel assertions remain distinct by id."
    },
    {
      kind: "max_parallel_edges",
      paths: ["edges"],
      max: KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair,
      description: "At most nine identified assertions may connect one unordered node pair."
    },
    {
      kind: "references_exist",
      paths: ["edges[*].source", "edges[*].target", "nodes[*].id"],
      description: "Every edge endpoint must reference a declared node id."
    },
    {
      kind: "no_self_loops",
      paths: ["edges[*].source", "edges[*].target"],
      description: "Self-loop edges are not renderable by this scene."
    },
    {
      kind: "property_count",
      paths: ["nodes[*].attributes"],
      max: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
      description: "Node attribute maps are bounded."
    },
    {
      kind: "property_count",
      paths: ["edges[*].attributes"],
      max: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
      description: "Edge attribute maps are bounded."
    },
    {
      kind: "each_unique_field",
      paths: ["nodes[*].evidence"],
      field: "evidence_id",
      description: "Evidence ids must be unique within each node evidence bundle."
    },
    {
      kind: "each_contains_field_value",
      paths: ["nodes[*].evidence"],
      field: "kind",
      allowedFieldValues: [
        "graph_snapshot_record",
        "citation",
        "external_source"
      ],
      description: "Every node evidence bundle must contain a direct source anchor; graph_node references may only supplement it."
    },
    {
      kind: "each_unique_field",
      paths: ["edges[*].evidence"],
      field: "evidence_id",
      description: "Evidence ids must be unique within each edge evidence bundle."
    },
    {
      kind: "each_contains_field_value",
      paths: ["edges[*].evidence"],
      field: "kind",
      allowedFieldValues: [
        "graph_snapshot_record",
        "citation",
        "external_source"
      ],
      description: "Every edge evidence bundle must contain a direct source anchor; graph_node references may only supplement it."
    },
    {
      kind: "references_exist",
      paths: ["nodes[*].evidence[*].node_id?", "nodes[*].id"],
      description: "Every graph_node evidence reference on a node must resolve."
    },
    {
      kind: "references_exist",
      paths: ["edges[*].evidence[*].node_id?", "nodes[*].id"],
      description: "Every graph_node evidence reference on an edge must resolve."
    },
    {
      kind: "node_score_kind",
      paths: ["nodes"],
      allowedScoreKinds: {
        paper: ["extraction_confidence"],
        model: ["extraction_confidence"],
        family: ["extraction_confidence"]
      },
      description: "An optional node score may only report extraction confidence; other quantities lack a node-kind context."
    },
    {
      kind: "edge_score_kind",
      paths: ["edges"],
      allowedScoreKinds: {
        cites: ["citation_resolution_confidence"],
        same_as: ["structural_similarity"],
        variant_of: ["structural_similarity"],
        instantiates: [],
        belongs_to_family: []
      },
      description: "An optional edge score must state the quantity that edge kind actually computes."
    },
    {
      kind: "endpoint_kinds",
      paths: ["edges", "nodes"],
      allowedEndpointKinds: {
        cites: ["paper", "paper"],
        same_as: ["model", "model"],
        variant_of: ["model", "model"],
        instantiates: ["paper", "model"],
        belongs_to_family: ["model", "family"]
      },
      description: "Each semantic edge kind has a fixed source-kind and target-kind contract."
    }
  ]
};
Object.setPrototypeOf(PARAM_VALIDATION_CONSTRAINTS, null);
for (const constraints of Object.values(PARAM_VALIDATION_CONSTRAINTS)) {
  constraints?.forEach((constraint) => {
    Object.freeze(constraint.paths);
    if (constraint.symmetricKinds) Object.freeze(constraint.symmetricKinds);
    if (constraint.allowedEndpointKinds) {
      Object.values(constraint.allowedEndpointKinds).forEach(Object.freeze);
      Object.freeze(constraint.allowedEndpointKinds);
    }
    if (constraint.allowedValues) Object.freeze(constraint.allowedValues);
    if (constraint.numericDomains) {
      Object.values(constraint.numericDomains).forEach(Object.freeze);
      Object.freeze(constraint.numericDomains);
    }
    if (constraint.normalizationRules) {
      Object.values(constraint.normalizationRules).forEach(Object.freeze);
      Object.freeze(constraint.normalizationRules);
    }
    if (constraint.allowedScoreKinds) {
      Object.values(constraint.allowedScoreKinds).forEach(Object.freeze);
      Object.freeze(constraint.allowedScoreKinds);
    }
    if (constraint.allowedFieldValues) Object.freeze(constraint.allowedFieldValues);
    Object.freeze(constraint);
  });
  if (constraints) Object.freeze(constraints);
}
Object.freeze(PARAM_VALIDATION_CONSTRAINTS);
for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  contract.paramConstraints = PARAM_VALIDATION_CONSTRAINTS[contract.id];
}
Object.setPrototypeOf(NEST_SKILL_REGISTRY, null);
for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  provenanceVerificationForContract(contract);
  const allowedConstraintKeys = /* @__PURE__ */ new Set([
    ...contract.requiredProvenanceKeys,
    ...contract.optionalProvenanceKeys ?? []
  ]);
  for (const constraint of contract.provenanceParamConstraints ?? []) {
    if (!allowedConstraintKeys.has(constraint.provenanceKey)) {
      throw new Error(
        `skill '${contract.id}' constraint targets unclassified provenance '${constraint.provenanceKey}'`
      );
    }
  }
  for (const key of Object.keys(contract.externalProvenanceClaims ?? {})) {
    if (!contract.requiredProvenanceKeys.includes(key)) {
      throw new Error(
        `skill '${contract.id}' external provenance '${key}' is not required`
      );
    }
  }
  Object.freeze(contract.requiredInputKeys);
  Object.freeze(contract.requiredProvenanceKeys);
  if (contract.optionalProvenanceKeys) Object.freeze(contract.optionalProvenanceKeys);
  if (contract.externalProvenanceClaims) {
    Object.values(contract.externalProvenanceClaims).forEach((claim) => {
      if (claim) Object.freeze(claim);
    });
    Object.freeze(contract.externalProvenanceClaims);
  }
  if (contract.requiredProvenanceFlags) Object.freeze(contract.requiredProvenanceFlags);
  if (contract.deprecation) Object.freeze(contract.deprecation);
  if (contract.routerEligibility) Object.freeze(contract.routerEligibility);
  if (contract.transform) {
    Object.freeze(contract.transform.rawFields);
    Object.freeze(contract.transform.requiredOptions);
    Object.freeze(contract.transform);
  }
  contract.provenanceParamConstraints?.forEach((constraint) => {
    if (constraint.kind === "one_of_literals") Object.freeze(constraint.values);
    Object.freeze(constraint);
  });
  if (contract.provenanceParamConstraints) {
    Object.freeze(contract.provenanceParamConstraints);
  }
  Object.freeze(contract.rendererRoutes);
  if (contract.paramConstraints) Object.freeze(contract.paramConstraints);
  contract.examples.forEach(Object.freeze);
  Object.freeze(contract.examples);
  Object.freeze(contract);
}
Object.freeze(NEST_SKILL_REGISTRY);
function getSkill(id2) {
  return isSkillId(id2) ? NEST_SKILL_REGISTRY[id2] : void 0;
}

// core/provenance.ts
var CONSERVATIVE_PROVENANCE = Object.freeze({
  calibrated_posterior: false,
  advisory_only: true,
  is_paper_local_evidence: false,
  synthetic: false
});
var HONESTY_POLICY = Object.freeze({
  version: "3",
  calibratedPosteriorAccepted: false,
  captionRequiredWhenAny: Object.freeze([
    "synthetic=true",
    "calibrated_posterior=false",
    "advisory_only=true",
    "is_paper_local_evidence=false"
  ]),
  precedence: Object.freeze([
    "synthetic",
    "advisory_only",
    "not_paper_local",
    "not_calibrated"
  ]),
  templates: Object.freeze({
    synthetic: "Schematic \u2014 illustrative synthetic data, not measured.",
    advisory_only: "Advisory \u2014 advisory evidence only; not a calibrated posterior.",
    not_paper_local: "Advisory \u2014 not paper-local evidence; candidate ranking only.",
    not_calibrated: "Illustrative \u2014 not a calibrated posterior."
  }),
  callerCaption: "append_only_unverified",
  callerCaptionLabel: "Caller note (unverified):",
  callerCaptionControls: "escape C0/C1, bidi, zero-width, and BOM controls",
  bidiIsolationRequired: true,
  contractDisclosureOrder: Object.freeze([
    "weak_skill",
    "external_provenance",
    "flag_derived_mandatory",
    "caller_note"
  ]),
  weakSkillDisclosure: "contract_owned_first",
  externalProvenanceDisclosure: "contract_owned_after_weak_before_flag_derived_mandatory",
  flagDerivedMandatoryDisclosure: "derived_only_from_provenance_flags_and_always_before_caller_note"
});
function requiresHonestyCaption(p) {
  return !!p.synthetic || !p.calibrated_posterior || p.advisory_only || !p.is_paper_local_evidence;
}
function mandatoryDisclosure(p) {
  if (p.synthetic) {
    return HONESTY_POLICY.templates.synthetic;
  }
  if (p.advisory_only) {
    return HONESTY_POLICY.templates.advisory_only;
  }
  if (!p.is_paper_local_evidence) {
    return HONESTY_POLICY.templates.not_paper_local;
  }
  return HONESTY_POLICY.templates.not_calibrated;
}
function composeHonestyCaption(p, contractDisclosures = {}) {
  const parts = [];
  if (contractDisclosures.weakSkill) {
    parts.push(contractDisclosures.weakSkill);
  }
  if (contractDisclosures.externalProvenance) {
    parts.push(contractDisclosures.externalProvenance);
  }
  if (requiresHonestyCaption(p)) {
    parts.push(mandatoryDisclosure(p));
  }
  const note = p.caption?.trim();
  if (note) {
    parts.push(`Caller note (unverified): ${safeDiagnosticText(note, 500)}`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

// core/skills/paramPreflight.ts
var FLOAT32_MAX2 = 34028234663852886e22;
var MAX_SAMPLES = PARAM_LIMITS.maxSamples;
var ALLOWED_PARAM_FIELDS = Object.freeze({
  "nest.voltage_trace": ["times_ms", "series", "series_labels", "units"],
  "nest.spike_raster": ["times_ms", "senders"],
  "nest.isi_distribution": [
    "bin_centers_ms",
    "values",
    "bin_width_ms",
    "normalization",
    "value_units",
    "interval_scope"
  ],
  "nest.psth": [
    "bin_centers_ms",
    "values",
    "bin_width_ms",
    "normalization",
    "value_units",
    "trial_count",
    "alignment_event",
    "aggregation"
  ],
  "nest.population_rate": [
    "bin_centers_ms",
    "bin_width_ms",
    "window_start_ms",
    "window_stop_ms",
    "series",
    "normalization",
    "aggregation",
    "binning"
  ],
  "nest.rate_response": ["stimulus_amplitudes", "rates_hz", "stimulus_units"],
  "nest.connectivity_matrix": [
    "sources",
    "targets",
    "weights",
    "delays",
    "weight_units",
    "delay_units"
  ],
  "nest.connection_graph": [
    "nodes",
    "edges",
    "weight_units",
    "delay_units",
    "layout",
    "parallel_edges",
    "self_connections",
    "snapshot_time_ms",
    "snapshot_scope",
    "sample_policy",
    "source_connection_count",
    "edge_identity"
  ],
  "nest.adjacency_matrix": [
    "source_ids",
    "target_ids",
    "cells",
    "axis_order",
    "absent_cell",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope",
    "display",
    "aggregation"
  ],
  "nest.weight_matrix": [
    "source_ids",
    "target_ids",
    "cells",
    "weight_units",
    "aggregation",
    "axis_order",
    "absent_cell",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.delay_matrix": [
    "source_ids",
    "target_ids",
    "cells",
    "delay_units",
    "aggregation",
    "axis_order",
    "absent_cell",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.in_degree_distribution": [
    "degrees",
    "node_counts",
    "values",
    "node_count",
    "connection_count",
    "direction",
    "normalization",
    "value_units",
    "edge_counting",
    "zero_degree_policy",
    "sample_policy",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.out_degree_distribution": [
    "degrees",
    "node_counts",
    "values",
    "node_count",
    "connection_count",
    "direction",
    "normalization",
    "value_units",
    "edge_counting",
    "zero_degree_policy",
    "sample_policy",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.delay_distribution": [
    "bin_centers_ms",
    "delay_counts",
    "values",
    "bin_width_ms",
    "window_start_ms",
    "window_stop_ms",
    "normalization",
    "value_units",
    "delay_units",
    "aggregation",
    "binning",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.weight_histogram": [
    "bin_centers",
    "weight_counts",
    "values",
    "bin_width",
    "window_start",
    "window_stop",
    "weight_units",
    "normalization",
    "value_units",
    "aggregation",
    "binning",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.spatial_2d": ["positions", "coordinate_units"],
  "nest.spatial_map_2d": [
    "nodes",
    "coordinate_units",
    "extent",
    "center",
    "edge_wrap",
    "position_scope",
    "marker_size"
  ],
  "nest.spatial_3d": ["objects", "coordinate_units"],
  "nest.plasticity_dynamics": ["times_ms", "weights", "weight_units"],
  "nest.phase_plane": [
    "grid",
    "derivatives",
    "axis_units",
    "derivative_units",
    "derivative_time_unit",
    "axis_order",
    "flattening"
  ],
  "nest.correlogram": [
    "lags_ms",
    "values",
    "bin_width_ms",
    "tau_max_ms",
    "counting_start_ms",
    "counting_stop_ms",
    "pair",
    "lag_convention",
    "binning",
    "zero_lag_policy",
    "statistic"
  ],
  "nest.stimulus_response": ["times_ms", "stimulus", "response"],
  "nest.astrocyte_dynamics": ["times_ms", "ca_trace", "units"],
  "nest.compartmental_dynamics": ["times_ms", "compartments"],
  "nest.animation_replay": ["frames"],
  "corpus.knowledge_graph": [
    "graph_id",
    "graph_source",
    "graph_snapshot_id",
    "graph_scope",
    "generated_at",
    "nodes",
    "edges"
  ]
});
var INVOCATION_FIELDS = /* @__PURE__ */ new Set([
  "scene",
  "skill",
  "specVersion",
  "params",
  "mode",
  "themeMode",
  "camera",
  "palette",
  "provenance",
  "rendererRoute"
]);
var PROVENANCE_FIELDS = /* @__PURE__ */ new Set([
  "source",
  "calibrated_posterior",
  "advisory_only",
  "is_paper_local_evidence",
  "caption",
  "declared_inputs",
  "synthetic"
]);
var finite = (value) => typeof value === "number" && Number.isFinite(value);
var gpu = (value) => finite(value) && Math.abs(value) <= FLOAT32_MAX2;
var id = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function largeArray(value, path, check, expected, options = {}) {
  if (!Array.isArray(value)) return null;
  const min = options.min ?? 1;
  const max = options.max ?? MAX_SAMPLES;
  if (value.length < min || value.length > max) {
    return {
      path,
      message: `expected ${min}\u2013${max} items; received ${value.length}`
    };
  }
  for (let index = 0; index < value.length; index++) {
    if (!check(value[index])) {
      return { path: `${path}.${index}`, message: `expected ${expected}` };
    }
  }
  return null;
}
function numericFields(params, fields) {
  for (const [field, check, expected] of fields) {
    const issue = largeArray(params[field], field, check, expected);
    if (issue) return issue;
  }
  return null;
}
function boundedText(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}
function preflightLargeSkillParams(skillId, params) {
  const time = (field = "times_ms") => [field, finite, "a finite number"];
  const gpuField = (field) => [field, gpu, "a finite Float32-range number"];
  const idField = (field) => [field, id, "a non-negative safe integer"];
  switch (skillId) {
    case "nest.spike_raster":
      return numericFields(params, [time(), idField("senders")]);
    case "nest.isi_distribution": {
      const issue = numericFields(params, [
        time("bin_centers_ms"),
        gpuField("values")
      ]);
      if (issue) return issue;
      for (const [field, message] of [
        ["bin_centers_ms", "inter-spike interval bin centers cannot be negative"],
        ["values", "histogram values cannot be negative"]
      ]) {
        const values = params[field];
        if (Array.isArray(values)) {
          const index = values.findIndex(
            (value) => typeof value === "number" && value < 0
          );
          if (index >= 0) return { path: `${field}.${index}`, message };
        }
      }
      return null;
    }
    case "nest.psth": {
      const issue = numericFields(params, [
        time("bin_centers_ms"),
        gpuField("values")
      ]);
      if (issue) return issue;
      const values = params.values;
      if (Array.isArray(values)) {
        const index = values.findIndex(
          (value) => typeof value === "number" && value < 0
        );
        if (index >= 0) {
          return { path: `values.${index}`, message: "histogram values cannot be negative" };
        }
      }
      return null;
    }
    case "nest.population_rate": {
      const issue = numericFields(params, [time("bin_centers_ms")]);
      if (issue) return issue;
      if (!Array.isArray(params.series)) return null;
      const outer = largeArray(
        params.series,
        "series",
        (series) => {
          const item = record(series);
          return !!item && Object.keys(item).every((key) => ["id", "label", "recorded_sender_count", "spike_counts", "rates_hz"].includes(key)) && boundedText(item.id, 120) && boundedText(item.label, 240) && typeof item.recorded_sender_count === "number" && Number.isSafeInteger(item.recorded_sender_count) && item.recorded_sender_count > 0 && Array.isArray(item.spike_counts) && item.spike_counts.length >= 1 && Array.isArray(item.rates_hz) && item.rates_hz.length >= 1;
        },
        "a closed population-rate series with id, label, sender count, spike counts, and rates",
        { max: PARAM_LIMITS.maxSeries }
      );
      if (outer) return outer;
      for (let index = 0; index < params.series.length; index++) {
        const item = record(params.series[index]);
        if (!item) continue;
        const counts = largeArray(
          item.spike_counts,
          `series.${index}.spike_counts`,
          (value) => id(value),
          "a non-negative safe-integer spike count"
        );
        if (counts) return counts;
        const rates = largeArray(
          item.rates_hz,
          `series.${index}.rates_hz`,
          (value) => gpu(value) && value >= 0,
          "a non-negative finite Float32-range rate"
        );
        if (rates) return rates;
      }
      return null;
    }
    case "nest.rate_response": {
      const issue = numericFields(params, [
        gpuField("stimulus_amplitudes"),
        gpuField("rates_hz")
      ]);
      if (issue) return issue;
      const rates = params.rates_hz;
      if (Array.isArray(rates)) {
        const index = rates.findIndex((rate) => typeof rate === "number" && rate < 0);
        if (index >= 0) return { path: `rates_hz.${index}`, message: "firing rates cannot be negative" };
      }
      return null;
    }
    case "nest.connectivity_matrix":
      return numericFields(params, [
        idField("sources"),
        idField("targets"),
        gpuField("weights"),
        gpuField("delays")
      ]);
    case "nest.connection_graph": {
      const nodes = largeArray(
        params.nodes,
        "nodes",
        (value) => {
          const node = record(value);
          return !!node && id(node.id) && boundedText(node.label, 120);
        },
        "a closed graph node with a safe id and bounded label",
        { max: PARAM_LIMITS.maxTopologyNodes }
      );
      if (nodes) return nodes;
      return largeArray(
        params.edges,
        "edges",
        (value) => {
          const edge = record(value);
          return !!edge && boundedText(edge.id, 240) && id(edge.source) && id(edge.target) && (edge.weight === void 0 || gpu(edge.weight)) && (edge.delay_ms === void 0 || gpu(edge.delay_ms) && edge.delay_ms > 0);
        },
        "a closed graph edge with safe endpoints and optional finite measurements",
        { min: 0, max: PARAM_LIMITS.maxTopologyEdges }
      );
    }
    case "nest.adjacency_matrix":
    case "nest.weight_matrix":
    case "nest.delay_matrix": {
      const axes = numericFields(params, [idField("source_ids"), idField("target_ids")]);
      if (axes) return axes;
      return largeArray(
        params.cells,
        "cells",
        (value) => {
          const cell = record(value);
          return !!cell && id(cell.source_id) && id(cell.target_id) && id(cell.connection_count) && cell.connection_count > 0 && (cell.value === void 0 || gpu(cell.value));
        },
        "a sparse matrix cell with safe endpoint ids and positive connection count",
        { min: 0, max: PARAM_LIMITS.maxSamples }
      );
    }
    case "nest.in_degree_distribution":
    case "nest.out_degree_distribution":
      return numericFields(params, [
        idField("degrees"),
        idField("node_counts"),
        gpuField("values")
      ]);
    case "nest.delay_distribution":
      return numericFields(params, [
        time("bin_centers_ms"),
        idField("delay_counts"),
        gpuField("values")
      ]);
    case "nest.weight_histogram": {
      const issue = numericFields(params, [
        gpuField("bin_centers"),
        idField("weight_counts"),
        gpuField("values")
      ]);
      if (issue) return issue;
      const values = params.values;
      if (Array.isArray(values)) {
        const index = values.findIndex(
          (value) => typeof value === "number" && value < 0
        );
        if (index >= 0) {
          return { path: `values.${index}`, message: "histogram values cannot be negative" };
        }
      }
      return null;
    }
    case "nest.plasticity_dynamics":
      return numericFields(params, [time(), gpuField("weights")]);
    case "nest.astrocyte_dynamics": {
      const issue = numericFields(params, [time(), gpuField("ca_trace")]);
      if (issue) return issue;
      const trace = params.ca_trace;
      if (Array.isArray(trace)) {
        const index = trace.findIndex((sample) => typeof sample === "number" && sample < 0);
        if (index >= 0) {
          return { path: `ca_trace.${index}`, message: "absolute Ca\xB2\u207A concentration cannot be negative" };
        }
      }
      return null;
    }
    case "nest.correlogram":
      return numericFields(params, [time("lags_ms"), gpuField("values")]);
    case "nest.stimulus_response":
      return numericFields(params, [
        time(),
        gpuField("stimulus"),
        gpuField("response")
      ]);
    case "nest.voltage_trace": {
      const issue = numericFields(params, [time()]);
      if (issue) return issue;
      if (Array.isArray(params.series)) {
        const outer = largeArray(
          params.series,
          "series",
          (series) => Array.isArray(series) && series.length >= 1 && series.length <= MAX_SAMPLES,
          "a non-empty numeric series",
          { max: 256 }
        );
        if (outer) return outer;
        for (let index = 0; index < params.series.length; index++) {
          const nested = largeArray(
            params.series[index],
            `series.${index}`,
            gpu,
            "a finite Float32-range number"
          );
          if (nested) return nested;
        }
      }
      const labels = largeArray(
        params.series_labels,
        "series_labels",
        (label) => boundedText(label, 120),
        "a bounded non-blank label",
        { max: 256 }
      );
      if (labels) return labels;
      return null;
    }
    case "nest.phase_plane": {
      for (const field of ["grid", "derivatives"]) {
        const collection = record(params[field]);
        if (!collection) continue;
        for (const [name, values] of Object.entries(collection)) {
          const issue = largeArray(
            values,
            `${field}.${name}`,
            gpu,
            "a finite Float32-range number"
          );
          if (issue) return issue;
        }
      }
      return null;
    }
    case "nest.spatial_2d":
      return largeArray(
        params.positions,
        "positions",
        (position) => Array.isArray(position) && position.length === 2 && position.every(gpu),
        "an exact [x,y] Float32-range tuple",
        { max: PARAM_LIMITS.maxSpatialObjects }
      );
    case "nest.spatial_map_2d":
      return largeArray(
        params.nodes,
        "nodes",
        (value) => {
          const node = record(value);
          return !!node && id(node.id) && boundedText(node.label, 120) && gpu(node.x) && gpu(node.y);
        },
        "an identified 2D node with finite coordinates",
        { max: PARAM_LIMITS.maxSpatialObjects }
      );
    case "nest.spatial_3d":
      return largeArray(
        params.objects,
        "objects",
        (object) => {
          const item = record(object);
          return !!item && gpu(item.x) && gpu(item.y) && gpu(item.z);
        },
        "an object with finite Float32-range x/y/z",
        { max: PARAM_LIMITS.maxSpatialObjects }
      );
    case "nest.compartmental_dynamics": {
      const issue = numericFields(params, [time()]);
      if (issue) return issue;
      if (Array.isArray(params.compartments)) {
        const outer = largeArray(
          params.compartments,
          "compartments",
          (compartment) => {
            const item = record(compartment);
            if (!item) return false;
            const keys = Object.keys(item);
            return keys.every((key) => ["id", "parent_id", "label", "values"].includes(key)) && boundedText(item.id, 120) && (item.parent_id === null || boundedText(item.parent_id, 120)) && (item.label === void 0 || boundedText(item.label, 240)) && Array.isArray(item.values) && item.values.length >= 1;
          },
          "a closed compartment with id, parent_id, and non-empty values",
          { max: 256 }
        );
        if (outer) return outer;
        for (let index = 0; index < params.compartments.length; index++) {
          const item = record(params.compartments[index]);
          if (!item) continue;
          const nested = largeArray(
            item.values,
            `compartments.${index}.values`,
            gpu,
            "a finite Float32-range number"
          );
          if (nested) return nested;
        }
      }
      return null;
    }
    case "nest.animation_replay":
      return largeArray(
        params.frames,
        "frames",
        (frame) => {
          const item = record(frame);
          const state = item ? record(item.state) : void 0;
          return !!item && Object.keys(item).every((key) => ["time_ms", "state", "annotation"].includes(key)) && finite(item.time_ms) && item.time_ms >= 0 && !!state && Object.keys(state).length > 0 && Object.keys(state).every(
            (key) => key.length >= 1 && key.length <= 80 && key.trim() === key
          ) && (item.annotation === void 0 || boundedText(item.annotation, 500));
        },
        "a frame with non-negative time_ms and an object state",
        { max: 1e4 }
      );
    case "corpus.knowledge_graph": {
      const nodeKinds = new Set(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS);
      const edgeKinds = new Set(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS);
      const attributesAreBounded = (value) => {
        const attributes = record(value);
        if (!attributes || Object.keys(attributes).length > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
          return false;
        }
        return Object.values(attributes).every(
          (attribute) => !Array.isArray(attribute) || attribute.length <= KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems
        );
      };
      const evidenceIsBounded = (value) => Array.isArray(value) && value.length >= 1 && value.length <= KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement;
      const epistemicIsDerived = (value) => {
        const epistemic = record(value);
        return !!epistemic && epistemic.status === "derived_advisory" && epistemic.advisory_only === true && epistemic.is_paper_local_evidence === false && epistemic.calibrated_posterior === false;
      };
      return largeArray(
        params.nodes,
        "nodes",
        (node) => {
          const item = record(node);
          return !!item && Object.keys(item).every((key) => [
            "id",
            "kind",
            "label",
            "detail",
            "attributes",
            "epistemic",
            "evidence",
            "uncalibrated_score"
          ].includes(key)) && boundedText(item.id, 120) && boundedText(item.label, 240) && (item.detail === void 0 || boundedText(item.detail, KNOWLEDGE_GRAPH_LIMITS.maxDetailLength)) && attributesAreBounded(item.attributes) && epistemicIsDerived(item.epistemic) && evidenceIsBounded(item.evidence) && nodeKinds.has(item.kind);
        },
        "a bounded, evidence-carrying paper/model/family node",
        { max: PARAM_LIMITS.maxGraphNodes }
      ) ?? largeArray(
        params.edges,
        "edges",
        (edge) => {
          const item = record(edge);
          return !!item && Object.keys(item).every((key) => [
            "id",
            "source",
            "target",
            "kind",
            "label",
            "attributes",
            "epistemic",
            "evidence",
            "uncalibrated_score"
          ].includes(key)) && boundedText(item.id, 320) && boundedText(item.source, 120) && boundedText(item.target, 120) && boundedText(item.label, 160) && attributesAreBounded(item.attributes) && epistemicIsDerived(item.epistemic) && evidenceIsBounded(item.evidence) && edgeKinds.has(item.kind);
        },
        "a bounded, identified, evidence-carrying knowledge-graph edge",
        { min: 0, max: PARAM_LIMITS.maxGraphEdges }
      );
    }
    default:
      return null;
  }
}
function preflightRawSkillParams(skillId, params) {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(params);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const allowed = ALLOWED_PARAM_FIELDS[skillId];
  if (allowed) {
    const allowedSet = new Set(allowed);
    const fields = Reflect.ownKeys(params);
    if (fields.some((field) => typeof field !== "string" || !allowedSet.has(field))) {
      return {
        path: "(root)",
        message: "params contain an unknown, symbol, or unsupported top-level field"
      };
    }
  }
  const ownValue = (key) => {
    const descriptor = Object.getOwnPropertyDescriptor(params, key);
    return descriptor && "value" in descriptor && descriptor.enumerable ? descriptor.value : void 0;
  };
  const arrayLength = (value) => {
    if (!Array.isArray(value)) return void 0;
    const length = Object.getOwnPropertyDescriptor(value, "length");
    return length && "value" in length && Number.isSafeInteger(length.value) ? length.value : void 0;
  };
  const tooLongValue = (value, path, max) => {
    const length = arrayLength(value);
    return length !== void 0 && length > max ? { path, message: `${path} may contain at most ${max} items` } : null;
  };
  const tooLong = (key, max) => {
    return tooLongValue(ownValue(key), key, max);
  };
  const tooManyKeys = (key, max) => {
    const value = ownValue(key);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const count = Reflect.ownKeys(value).length;
    return count > max ? { path: key, message: `${key} may contain at most ${max} properties` } : null;
  };
  const directArrays = (fields, max = MAX_SAMPLES) => {
    for (const field of fields) {
      const issue = tooLong(field, max);
      if (issue) return issue;
    }
    return null;
  };
  const nestedArrays = (outerKey, outerMax, innerKey) => {
    const outer = ownValue(outerKey);
    const outerIssue = tooLongValue(outer, outerKey, outerMax);
    if (outerIssue || !Array.isArray(outer)) return outerIssue;
    const length = arrayLength(outer);
    if (length === void 0 || length > outerMax) return null;
    for (let index = 0; index < length; index++) {
      const itemDescriptor = Object.getOwnPropertyDescriptor(outer, String(index));
      if (!itemDescriptor || !("value" in itemDescriptor) || !itemDescriptor.enumerable) {
        continue;
      }
      let nested = itemDescriptor.value;
      if (innerKey) {
        if (nested === null || typeof nested !== "object" || Array.isArray(nested)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(nested, innerKey);
        nested = descriptor && "value" in descriptor && descriptor.enumerable ? descriptor.value : void 0;
      }
      const issue = tooLongValue(
        nested,
        innerKey ? `${outerKey}.${index}.${innerKey}` : `${outerKey}.${index}`,
        MAX_SAMPLES
      );
      if (issue) return issue;
    }
    return null;
  };
  const recordValueArrays = (key) => {
    const collection = ownValue(key);
    if (collection === null || typeof collection !== "object" || Array.isArray(collection)) {
      return null;
    }
    const keys = Reflect.ownKeys(collection);
    if (keys.length > 2) {
      return { path: key, message: `${key} may contain at most 2 properties` };
    }
    for (const name of keys) {
      if (typeof name !== "string") continue;
      const descriptor = Object.getOwnPropertyDescriptor(collection, name);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) continue;
      const issue = tooLongValue(descriptor.value, `${key}.${name}`, MAX_SAMPLES);
      if (issue) return issue;
    }
    return null;
  };
  const graphElementBudgets = (key, max) => {
    const collection = ownValue(key);
    const outerIssue = tooLongValue(collection, key, max);
    if (outerIssue || !Array.isArray(collection)) return outerIssue;
    const length = arrayLength(collection);
    if (length === void 0 || length > max) return null;
    for (let index = 0; index < length; index++) {
      const itemDescriptor = Object.getOwnPropertyDescriptor(collection, String(index));
      if (!itemDescriptor || !("value" in itemDescriptor) || !itemDescriptor.enumerable) {
        continue;
      }
      const item = itemDescriptor.value;
      if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
      const attributesDescriptor = Object.getOwnPropertyDescriptor(item, "attributes");
      const attributes = attributesDescriptor && "value" in attributesDescriptor && attributesDescriptor.enumerable ? attributesDescriptor.value : void 0;
      if (attributes !== null && typeof attributes === "object" && !Array.isArray(attributes)) {
        let attributeCount = 0;
        for (const attributeKey in attributes) {
          if (!Object.hasOwn(attributes, attributeKey)) continue;
          attributeCount += 1;
          if (attributeCount > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
            return {
              path: `${key}.${index}.attributes`,
              message: `attributes may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributes} properties`
            };
          }
          const attributeDescriptor = Object.getOwnPropertyDescriptor(attributes, attributeKey);
          if (!attributeDescriptor || !("value" in attributeDescriptor) || !attributeDescriptor.enumerable) continue;
          const valueIssue = tooLongValue(
            attributeDescriptor.value,
            `${key}.${index}.attributes.${attributeKey}`,
            KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems
          );
          if (valueIssue) return valueIssue;
        }
      }
      const evidenceDescriptor = Object.getOwnPropertyDescriptor(item, "evidence");
      const evidence = evidenceDescriptor && "value" in evidenceDescriptor && evidenceDescriptor.enumerable ? evidenceDescriptor.value : void 0;
      const evidenceIssue = tooLongValue(
        evidence,
        `${key}.${index}.evidence`,
        KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement
      );
      if (evidenceIssue) return evidenceIssue;
    }
    return null;
  };
  switch (skillId) {
    case "nest.voltage_trace":
      return directArrays(["times_ms"]) ?? nestedArrays("series", PARAM_LIMITS.maxSeries) ?? tooLong("series_labels", PARAM_LIMITS.maxSeries);
    case "nest.spike_raster":
      return directArrays(["times_ms", "senders"]);
    case "nest.isi_distribution":
    case "nest.psth":
      return directArrays(["bin_centers_ms", "values"]);
    case "nest.population_rate":
      return directArrays(["bin_centers_ms"]) ?? nestedArrays("series", PARAM_LIMITS.maxSeries, "spike_counts") ?? nestedArrays("series", PARAM_LIMITS.maxSeries, "rates_hz");
    case "nest.rate_response":
      return directArrays(["stimulus_amplitudes", "rates_hz"]);
    case "nest.connectivity_matrix":
      return directArrays(["sources", "targets", "weights", "delays"]);
    case "nest.connection_graph":
      return tooLong("nodes", PARAM_LIMITS.maxTopologyNodes) ?? tooLong("edges", PARAM_LIMITS.maxTopologyEdges);
    case "nest.adjacency_matrix":
    case "nest.weight_matrix":
    case "nest.delay_matrix":
      return directArrays(["source_ids", "target_ids"]) ?? tooLong("cells", PARAM_LIMITS.maxSamples);
    case "nest.in_degree_distribution":
    case "nest.out_degree_distribution":
      return directArrays(["degrees", "node_counts", "values"]);
    case "nest.delay_distribution":
      return directArrays(["bin_centers_ms", "delay_counts", "values"]);
    case "nest.weight_histogram":
      return directArrays(["bin_centers", "weight_counts", "values"]);
    case "nest.spatial_2d":
      return tooLong("positions", PARAM_LIMITS.maxSpatialObjects);
    case "nest.spatial_map_2d":
      return tooLong("nodes", PARAM_LIMITS.maxSpatialObjects);
    case "nest.spatial_3d":
      return tooLong("objects", PARAM_LIMITS.maxSpatialObjects);
    case "nest.plasticity_dynamics":
      return directArrays(["times_ms", "weights"]);
    case "nest.compartmental_dynamics":
      return directArrays(["times_ms"]) ?? nestedArrays("compartments", PARAM_LIMITS.maxSeries, "values");
    case "nest.correlogram":
      return directArrays(["lags_ms", "values"]);
    case "nest.stimulus_response":
      return directArrays(["times_ms", "stimulus", "response"]);
    case "nest.astrocyte_dynamics":
      return directArrays(["times_ms", "ca_trace"]);
    case "nest.animation_replay":
      return tooLong("frames", 1e4);
    case "corpus.knowledge_graph":
      return graphElementBudgets("nodes", PARAM_LIMITS.maxGraphNodes) ?? graphElementBudgets("edges", PARAM_LIMITS.maxGraphEdges);
    case "nest.phase_plane":
      return tooManyKeys("grid", 2) ?? tooManyKeys("derivatives", 2) ?? tooManyKeys("axis_units", 2) ?? tooManyKeys("derivative_units", 2) ?? recordValueArrays("grid") ?? recordValueArrays("derivatives") ?? tooLong("axis_order", 2);
    default:
      return null;
  }
}
function preflightRawEnvelopeParams(skillId, payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(payload);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const fields = Reflect.ownKeys(payload);
  if (fields.some((field) => typeof field !== "string" || !INVOCATION_FIELDS.has(field))) {
    return {
      scope: "envelope",
      path: "(root)",
      message: "invocation contains an unknown, symbol, or unsupported top-level field"
    };
  }
  const provenance = Object.getOwnPropertyDescriptor(payload, "provenance");
  if (provenance && "value" in provenance && provenance.enumerable && provenance.value !== null && typeof provenance.value === "object" && !Array.isArray(provenance.value)) {
    const provenancePrototype = Object.getPrototypeOf(provenance.value);
    if (provenancePrototype === Object.prototype || provenancePrototype === null) {
      const provenanceFields = Reflect.ownKeys(provenance.value);
      if (provenanceFields.some(
        (field) => typeof field !== "string" || !PROVENANCE_FIELDS.has(field)
      )) {
        return {
          scope: "envelope",
          path: "provenance",
          message: "provenance contains an unknown, symbol, or unsupported field"
        };
      }
    }
  }
  const descriptor = Object.getOwnPropertyDescriptor(payload, "params");
  const issue = descriptor && "value" in descriptor && descriptor.enumerable ? preflightRawSkillParams(skillId, descriptor.value) : null;
  return issue ? { ...issue, scope: "params" } : null;
}

// core/skills/validateSkillInvocation.ts
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}
function nearestSkill(id2) {
  if (id2.length === 0 || id2.length > 80) return void 0;
  let best;
  let bestD = Infinity;
  for (const candidate of NEST_SKILL_IDS) {
    const d = editDistance(id2, candidate);
    if (d < bestD) {
      bestD = d;
      best = candidate;
    }
  }
  return best !== void 0 && bestD <= Math.max(3, Math.ceil(id2.length * 0.4)) ? best : void 0;
}
var MAX_INVOCATION_ERRORS = 32;
function validateSkillInvocationUnsafe(skillId, payload) {
  const errors = [];
  const contract = getSkill(skillId);
  if (!contract) {
    const suggestion = typeof skillId === "string" ? nearestSkill(skillId) : void 0;
    return {
      ok: false,
      errors: [
        {
          code: "unknown_skill",
          path: "skillId",
          message: `unknown skill '${safePrimitiveDiagnostic(skillId)}'`,
          hint: suggestion ? `Did you mean '${suggestion}'? Otherwise use one of the ids in validSkills.` : "Use one of the ids in validSkills (nest.* and corpus.*).",
          validSkills: NEST_SKILL_IDS,
          didYouMean: suggestion,
          // Attach the nearest skill's example so a typo self-repairs in one shot.
          example: suggestion ? getInvocationExamplePayload(suggestion) : void 0
        }
      ]
    };
  }
  if (contract.scene === null) {
    return {
      ok: false,
      errors: [
        {
          code: "no_cortexel_scene",
          path: "skillId",
          message: `skill '${skillId}' has no Cortexel scene (route to a host renderer)`,
          hint: `Renderer routes: ${contract.rendererRoutes.join(", ")}.`
        }
      ]
    };
  }
  const example = getExamplePayload(contract.id);
  const rawParamPreflight = preflightRawEnvelopeParams(contract.id, payload);
  if (rawParamPreflight) {
    const envelopeIssue = rawParamPreflight.scope === "envelope";
    return {
      ok: false,
      errors: [{
        code: envelopeIssue ? "invalid_envelope" : "invalid_params",
        path: envelopeIssue ? rawParamPreflight.path : `params.${rawParamPreflight.path}`,
        message: rawParamPreflight.message,
        hint: envelopeIssue ? "Use only fields declared by the strict invocation envelope." : `Required params: ${contract.requiredInputKeys.join(", ")}.`,
        example
      }]
    };
  }
  const rawProvenance = readOwnEnumerableDataProperty(payload, "provenance");
  const rawCalibrated = rawProvenance.kind === "value" ? readOwnEnumerableDataProperty(rawProvenance.value, "calibrated_posterior") : { kind: "absent" };
  if (rawCalibrated.kind === "value" && rawCalibrated.value === true) {
    return {
      ok: false,
      errors: [
        {
          code: "calibrated_posterior_unsupported",
          path: "provenance.calibrated_posterior",
          message: "calibrated_posterior=true is not implemented and is rejected at the visualization boundary",
          hint: "Validation/search is candidate ranking; leave calibrated_posterior=false.",
          example
        }
      ]
    };
  }
  const rawVersionProperty = readOwnEnumerableDataProperty(payload, "specVersion");
  const rawVersion = rawVersionProperty.kind === "value" ? rawVersionProperty.value : void 0;
  if (rawVersionProperty.kind === "value" && rawVersion !== CORTEXEL_SPEC_VERSION) {
    return {
      ok: false,
      errors: [
        {
          code: "unsupported_spec_version",
          path: "specVersion",
          message: `unsupported spec version '${safePrimitiveDiagnostic(rawVersion)}'`,
          hint: `Re-author from the original source through buildVizSpec so '${CORTEXEL_SPEC_VERSION}' is stamped only after current validation; do not edit or remove an existing version stamp.`,
          example
        }
      ]
    };
  }
  const envelope = validateVizSpec(payload);
  if (!envelope.ok) {
    return {
      ok: false,
      errors: envelope.errors.slice(0, MAX_INVOCATION_ERRORS).map((formatted, index) => {
        const separator = formatted.indexOf(": ");
        const path = separator >= 0 ? formatted.slice(0, separator) : "(spec)";
        const message = separator >= 0 ? formatted.slice(separator + 2) : formatted;
        return {
          code: "invalid_envelope",
          path,
          message,
          hint: "Match the VizSpec envelope shape shown in the attached skill example.",
          validScenes: SCENE_NAMES,
          example: index === 0 ? example : void 0
        };
      })
    };
  }
  let spec = envelope.spec;
  if (spec.skill && spec.skill !== skillId) {
    errors.push({
      code: "skill_mismatch",
      path: "skill",
      message: `spec.skill '${spec.skill}' does not match the skill '${skillId}' it is being validated under`,
      hint: `Validate this spec with skillId '${spec.skill}', or set spec.skill to '${skillId}'.`,
      example
    });
  }
  if (spec.scene !== contract.scene) {
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
    const preflight = preflightLargeSkillParams(contract.id, spec.params);
    const parsed = preflight ? void 0 : contract.paramsSchema.safeParse(spec.params);
    if (preflight) {
      errors.push({
        code: "invalid_params",
        path: `params.${preflight.path}`,
        message: preflight.message,
        hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`,
        example
      });
    } else if (parsed && !parsed.success) {
      const issues = parsed.error.issues;
      const available = Math.max(0, MAX_INVOCATION_ERRORS - errors.length);
      const detailedCount = Math.min(issues.length, Math.max(0, available - 1));
      for (const issue of issues.slice(0, detailedCount)) {
        const bounded = boundValidationIssue(issue);
        errors.push({
          code: "invalid_params",
          path: `params.${bounded.path}`,
          message: bounded.message,
          hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`,
          // One example is enough; repeating it on every issue bloats serialized
          // tool output quadratically for malformed arrays.
          example: errors.some((error) => error.example) ? void 0 : example
        });
      }
      if (issues.length > detailedCount && errors.length < MAX_INVOCATION_ERRORS) {
        errors.push({
          code: "invalid_params",
          path: "params.(root)",
          message: `additional validation issues omitted after ${MAX_INVOCATION_ERRORS} errors`,
          hint: "Fix the reported shape first, then validate again."
        });
      }
    } else if (parsed?.success) {
      spec = { ...spec, params: parsed.data };
    }
  }
  let prov = spec.provenance;
  for (const flag of [
    "advisory_only",
    "is_paper_local_evidence",
    "synthetic"
  ]) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    const required = contract.requiredProvenanceFlags?.[flag];
    if (required !== void 0 && prov[flag] !== required) {
      errors.push({
        code: "invalid_provenance",
        path: `provenance.${flag}`,
        message: `skill '${skillId}' requires provenance.${flag}=${required}; received ${prov[flag]}`,
        hint: "Use the skill contract requiredProvenanceFlags value; element-level epistemic status cannot be overridden by the envelope.",
        example: errors.some((error) => error.example) ? void 0 : example
      });
    }
  }
  const declared = normalizeDeclaredProvenanceInputs(
    prov.declared_inputs ?? {}
  );
  if (prov.declared_inputs) {
    prov = { ...prov, declared_inputs: declared };
    spec = { ...spec, provenance: prov };
  }
  const invalidDeclaredKeys = /* @__PURE__ */ new Set();
  const allowedDeclaredKeys = /* @__PURE__ */ new Set([
    ...contract.requiredProvenanceKeys,
    ...contract.optionalProvenanceKeys ?? []
  ]);
  for (const key of Object.keys(declared)) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    if (!isProvenanceKey(key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "invalid_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `unknown declared provenance key '${key}'`,
        hint: "Use only keys from PROVENANCE_KEYS and the selected skill contract.",
        example: errors.some((error) => error.example) ? void 0 : example
      });
      continue;
    }
    if (!allowedDeclaredKeys.has(key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "invalid_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `declared provenance key '${key}' is not classified for skill '${skillId}'`,
        hint: `Use only this skill's required or optional provenance keys: ${[...allowedDeclaredKeys].join(", ")}.`,
        example: errors.some((error) => error.example) ? void 0 : example
      });
      continue;
    }
    const message = declaredProvenanceValueError(key, declared[key]);
    if (message) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "invalid_provenance",
        path: `provenance.declared_inputs.${key}`,
        message,
        hint: `Declare a meaningful value for '${key}' that matches its provenance constraint.`,
        example: errors.some((error) => error.example) ? void 0 : example
      });
    }
  }
  for (const key of contract.requiredProvenanceKeys) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    if (!Object.hasOwn(declared, key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "missing_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `missing required provenance: ${key}`,
        hint: `Skill '${skillId}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(", ")}.`,
        example: errors.some((error) => error.example) ? void 0 : example
      });
    }
  }
  if (!errors.some((error) => error.code === "invalid_params")) {
    for (const constraint of contract.provenanceParamConstraints ?? []) {
      if (errors.length >= MAX_INVOCATION_ERRORS) break;
      if (invalidDeclaredKeys.has(constraint.provenanceKey)) continue;
      const message = provenanceParamConstraintError(
        constraint,
        spec.params,
        declared
      );
      if (message) {
        errors.push({
          code: "invalid_provenance",
          path: `provenance.declared_inputs.${constraint.provenanceKey}`,
          message,
          hint: constraint.description,
          example: errors.some((error) => error.example) ? void 0 : example
        });
      }
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
  const externalDisclosure = externalProvenanceDisclosure(contract);
  let weakDisclosure = null;
  if (contract.weak) {
    weakDisclosure = contract.weakDisclosure ?? `Derived view \u2014 ${skillId} reuses the '${contract.scene}' scene; not a 1:1 rendering.`;
  }
  const caption = composeHonestyCaption(prov, {
    weakSkill: weakDisclosure,
    externalProvenance: externalDisclosure
  });
  return {
    ok: true,
    spec,
    skill: contract.id,
    scene: contract.scene,
    caption
  };
}
function validateSkillInvocation(skillId, payload) {
  try {
    return validateSkillInvocationUnsafe(skillId, payload);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_envelope",
          path: "(spec)",
          message: `validation could not safely inspect the payload: ${safeErrorMessage(error)}`,
          validScenes: SCENE_NAMES
        }
      ]
    };
  }
}

// core/skills/authoring.ts
function validateSpec(payload) {
  let skillProperty;
  try {
    skillProperty = readOwnEnumerableDataProperty(payload, "skill");
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_envelope",
          path: "(spec)",
          message: `validation could not safely inspect spec.skill: ${safeErrorMessage(error)}`
        }
      ]
    };
  }
  const skill = skillProperty.kind === "value" ? skillProperty.value : void 0;
  const normalizedSkill = typeof skill === "string" && skill.length <= 80 ? skill.trim() : skill;
  if (typeof normalizedSkill !== "string" || normalizedSkill.length === 0) {
    return {
      ok: false,
      errors: [
        {
          code: "unknown_skill",
          path: "skill",
          message: "spec has no `skill` field \u2014 validateSpec needs a self-describing spec",
          hint: "Set spec.skill to a skill id (see validSkills), or call validateSkillInvocation(skillId, spec) with an explicit id.",
          validSkills: SKILL_IDS
        }
      ]
    };
  }
  return validateSkillInvocation(normalizedSkill, payload);
}

// src/core/errors.ts
var STAGE_ORDER = Object.freeze([
  "parse",
  "snapshot",
  "identity",
  "structural",
  "semantic",
  "science",
  "scope",
  "provenance",
  "budget",
  "derivation",
  "render",
  "serialize",
  "migrate",
  "adapter",
  "internal"
]);
var MAX_ERROR_RECORDS = 32;
var MAX_MESSAGE_LENGTH = 500;
var MAX_PATH_LENGTH = 240;
var MAX_SUMMARY_LENGTH = 120;
var UNSAFE_DISPLAY_CLASS = "[\\u0000-\\u001f\\u061c\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff\\ufffe-\\uffff]";
function isSafeDisplayString(value) {
  return typeof value === "string" && !new RegExp(UNSAFE_DISPLAY_CLASS, "u").test(value);
}
function safeText(value, max) {
  if (typeof value !== "string" || !Number.isSafeInteger(max) || max <= 0) return "";
  let out = "";
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    const character = String.fromCodePoint(codePoint);
    const next = index + character.length;
    const loneSurrogate = codePoint >= 55296 && codePoint <= 57343;
    const token = !loneSurrogate && isSafeDisplayString(character) ? character : `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
    const capacity = next < value.length ? max - 1 : max;
    if (out.length + token.length > capacity) return `${out}\u2026`;
    out += token;
    index = next;
  }
  return out;
}
function summarizeValue(value) {
  switch (typeof value) {
    case "string":
      return safeText(`string(length=${value.length})`, MAX_SUMMARY_LENGTH);
    case "number":
      return Object.is(value, -0) ? "number(-0)" : `number(${value})`;
    case "boolean":
      return `boolean(${value ? "true" : "false"})`;
    case "bigint":
      return "bigint";
    case "undefined":
      return "undefined";
    case "symbol":
      return "<symbol>";
    case "function":
      return "<function>";
    case "object": {
      if (value === null) return "null";
      try {
        if (Array.isArray(value)) return "<array>";
      } catch {
        return "<uninspectable-object>";
      }
      return "<object>";
    }
    default:
      return "<unknown>";
  }
}
function makeError(init) {
  const error = {
    code: init.code,
    severity: init.severity ?? "error",
    stage: init.stage,
    instancePath: safeText(init.instancePath ?? "", MAX_PATH_LENGTH),
    message: safeText(init.message, MAX_MESSAGE_LENGTH)
  };
  if (init.schemaPath !== void 0) error.schemaPath = safeText(init.schemaPath, MAX_PATH_LENGTH);
  if (init.skillId !== void 0) error.skillId = safeText(init.skillId, 64);
  if (init.validatorId !== void 0) error.validatorId = safeText(init.validatorId, 64);
  if (init.limit !== void 0) error.limit = init.limit;
  if ("actual" in init) error.actualSummary = summarizeValue(init.actual);
  if (init.repair !== void 0) {
    error.repair = {
      operation: init.repair.operation,
      path: safeText(init.repair.path, MAX_PATH_LENGTH),
      ..."value" in init.repair ? { value: init.repair.value } : {},
      reasonCode: init.repair.reasonCode
    };
  }
  return error;
}
function compareUnicodeCodePoints(left, right) {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftPoint = left.codePointAt(leftIndex);
    const rightPoint = right.codePointAt(rightIndex);
    if (leftPoint !== rightPoint) return leftPoint < rightPoint ? -1 : 1;
    leftIndex += leftPoint > 65535 ? 2 : 1;
    rightIndex += rightPoint > 65535 ? 2 : 1;
  }
  if (leftIndex === left.length && rightIndex === right.length) return 0;
  return leftIndex === left.length ? -1 : 1;
}
function compareErrors(a, b) {
  const stageDelta = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
  if (stageDelta !== 0) return stageDelta;
  const pathDelta = compareUnicodeCodePoints(a.instancePath, b.instancePath);
  if (pathDelta !== 0) return pathDelta;
  const codeDelta = compareUnicodeCodePoints(a.code, b.code);
  if (codeDelta !== 0) return codeDelta;
  const av = a.validatorId ?? "";
  const bv = b.validatorId ?? "";
  return compareUnicodeCodePoints(av, bv);
}
function finalizeErrors(errors) {
  const sorted = [...errors].sort(compareErrors);
  if (sorted.length <= MAX_ERROR_RECORDS) return sorted;
  const kept = sorted.slice(0, MAX_ERROR_RECORDS - 1);
  const omitted = sorted.length - kept.length;
  const limitRecord = makeError({
    code: "ERROR_LIMIT_REACHED",
    severity: "warning",
    stage: "internal",
    message: `${omitted} further diagnostics were suppressed by the diagnostic budget. Fix the reported errors and revalidate.`
  });
  limitRecord.omittedCount = omitted;
  kept.push(limitRecord);
  return kept;
}
function ok(value, warnings = []) {
  return { ok: true, value, warnings };
}
function err(errors) {
  return { ok: false, errors: finalizeErrors(errors) };
}

// src/core/parse-json.ts
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var ParseFailure = class extends Error {
  diagnostic;
  constructor(diagnostic) {
    super(diagnostic.message);
    this.name = "ParseFailure";
    this.diagnostic = diagnostic;
  }
};
function boundedUtf8ByteLength(text, limit) {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const first = text.charCodeAt(index);
    if (first <= 127) {
      bytes += 1;
    } else if (first <= 2047) {
      bytes += 2;
    } else if (first >= 55296 && first <= 56319) {
      const second = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (second >= 56320 && second <= 57343) {
        bytes += 4;
        index++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
    if (bytes > limit) return bytes;
  }
  return bytes;
}
var Scanner = class {
  text;
  limits;
  index = 0;
  nodes = 0;
  /** Path segments to the value being read, for a precise JSON Pointer on failure. */
  path = [];
  constructor(text, limits) {
    this.text = text;
    this.limits = limits;
  }
  pointer() {
    if (this.path.length === 0) return "";
    return this.path.map((segment) => `/${String(segment).replace(/~/g, "~0").replace(/\//g, "~1")}`).join("");
  }
  fail(code, message, extra) {
    throw new ParseFailure(
      makeError({
        code,
        stage: "parse",
        instancePath: this.pointer(),
        message,
        ...extra?.limit ? { limit: extra.limit } : {}
      })
    );
  }
  countNode() {
    this.nodes++;
    if (this.nodes > this.limits.jsonTotalNodes) {
      this.fail("JSON_TOKENS_EXCEEDED", "the document exceeds the total node limit", {
        limit: { name: "jsonTotalNodes", limit: this.limits.jsonTotalNodes, observed: this.nodes }
      });
    }
  }
  skipWhitespace() {
    while (this.index < this.text.length) {
      const ch = this.text[this.index];
      if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        this.index++;
        continue;
      }
      if (ch === "/") {
        this.fail("JSON_COMMENT_NOT_ALLOWED", "comments are not valid JSON");
      }
      return;
    }
  }
  expect(ch) {
    if (this.text[this.index] !== ch) {
      this.fail("JSON_SYNTAX", `expected ${JSON.stringify(ch)} at offset ${this.index}`);
    }
    this.index++;
  }
  parseTopLevel() {
    this.skipWhitespace();
    if (this.index >= this.text.length) {
      this.fail("JSON_EMPTY_INPUT", "the input contained no JSON value");
    }
    const value = this.parseValue(0);
    this.skipWhitespace();
    if (this.index < this.text.length) {
      this.fail(
        "JSON_TRAILING_DATA",
        `unexpected content after the top-level value at offset ${this.index}`
      );
    }
    return value;
  }
  parseValue(depth) {
    if (depth > this.limits.jsonDepth) {
      this.fail("JSON_DEPTH_EXCEEDED", "nesting is deeper than the parser permits", {
        limit: { name: "jsonDepth", limit: this.limits.jsonDepth, observed: depth }
      });
    }
    this.skipWhitespace();
    const ch = this.text[this.index];
    switch (ch) {
      case "{":
        return this.parseObject(depth);
      case "[":
        return this.parseArray(depth);
      case '"':
        this.countNode();
        return this.parseString();
      case "t":
        this.countNode();
        this.literal("true");
        return true;
      case "f":
        this.countNode();
        this.literal("false");
        return false;
      case "n":
        this.countNode();
        this.literal("null");
        return null;
      default:
        this.countNode();
        return this.parseNumber();
    }
  }
  literal(word) {
    if (this.text.startsWith(word, this.index)) {
      this.index += word.length;
      return;
    }
    this.fail("JSON_SYNTAX", `expected ${word} at offset ${this.index}`);
  }
  parseObject(depth) {
    this.countNode();
    this.expect("{");
    const object = /* @__PURE__ */ Object.create(null);
    const seen = /* @__PURE__ */ new Set();
    this.skipWhitespace();
    if (this.text[this.index] === "}") {
      this.index++;
      return object;
    }
    for (; ; ) {
      this.skipWhitespace();
      if (this.text[this.index] === "}") {
        this.fail("JSON_TRAILING_COMMA_NOT_ALLOWED", "trailing commas are not valid JSON");
      }
      if (this.text[this.index] !== '"') {
        this.fail("JSON_SYNTAX", `expected a member name at offset ${this.index}`);
      }
      const key = this.parseString();
      if (DANGEROUS_KEYS.has(key)) {
        this.path.push(key);
        this.fail(
          "JSON_DANGEROUS_KEY",
          `the member name ${JSON.stringify(key)} can reach Object.prototype and is rejected`
        );
      }
      if (seen.has(key)) {
        this.path.push(key);
        this.fail(
          "JSON_DUPLICATE_KEY",
          `the member name ${JSON.stringify(key)} appears more than once; which value would win is undefined`
        );
      }
      seen.add(key);
      if (seen.size > this.limits.jsonObjectKeys) {
        this.fail("JSON_TOO_MANY_KEYS", "the object has more members than the parser permits", {
          limit: { name: "jsonObjectKeys", limit: this.limits.jsonObjectKeys, observed: seen.size }
        });
      }
      this.skipWhitespace();
      this.expect(":");
      this.path.push(key);
      object[key] = this.parseValue(depth + 1);
      this.path.pop();
      this.skipWhitespace();
      const next = this.text[this.index];
      if (next === ",") {
        this.index++;
        continue;
      }
      if (next === "}") {
        this.index++;
        return object;
      }
      this.fail("JSON_SYNTAX", `expected ',' or '}' at offset ${this.index}`);
    }
  }
  parseArray(depth) {
    this.countNode();
    this.expect("[");
    const array = [];
    this.skipWhitespace();
    if (this.text[this.index] === "]") {
      this.index++;
      return array;
    }
    for (; ; ) {
      this.skipWhitespace();
      if (this.text[this.index] === "]") {
        this.fail("JSON_TRAILING_COMMA_NOT_ALLOWED", "trailing commas are not valid JSON");
      }
      this.path.push(array.length);
      array.push(this.parseValue(depth + 1));
      this.path.pop();
      if (array.length > this.limits.jsonArrayItems) {
        this.fail("JSON_ARRAY_TOO_LONG", "the array has more members than the parser permits", {
          limit: {
            name: "jsonArrayItems",
            limit: this.limits.jsonArrayItems,
            observed: array.length
          }
        });
      }
      this.skipWhitespace();
      const next = this.text[this.index];
      if (next === ",") {
        this.index++;
        continue;
      }
      if (next === "]") {
        this.index++;
        return array;
      }
      this.fail("JSON_SYNTAX", `expected ',' or ']' at offset ${this.index}`);
    }
  }
  parseString() {
    this.expect('"');
    let out = "";
    for (; ; ) {
      if (this.index >= this.text.length) {
        this.fail("JSON_SYNTAX", "the input ended inside a string");
      }
      const ch = this.text[this.index];
      if (ch === '"') {
        this.index++;
        return out;
      }
      if (ch === "\\") {
        this.index++;
        out = this.appendStringFragment(out, this.parseEscape());
        continue;
      }
      const code = this.text.charCodeAt(this.index);
      if (code < 32) {
        this.fail(
          "JSON_SYNTAX",
          `a raw control character (U+${code.toString(16).padStart(4, "0").toUpperCase()}) is not valid inside a JSON string`
        );
      }
      if (code >= 55296 && code <= 56319) {
        const next = this.text.charCodeAt(this.index + 1);
        if (!(next >= 56320 && next <= 57343)) {
          this.fail("JSON_INVALID_UNICODE", "an unpaired high surrogate is not well-formed Unicode");
        }
        out = this.appendStringFragment(
          out,
          this.text[this.index] + this.text[this.index + 1]
        );
        this.index += 2;
        continue;
      }
      if (code >= 56320 && code <= 57343) {
        this.fail("JSON_INVALID_UNICODE", "an unpaired low surrogate is not well-formed Unicode");
      }
      out = this.appendStringFragment(out, ch);
      this.index++;
    }
  }
  /** Enforce the decoded UTF-16 budget before appending the next fragment. */
  appendStringFragment(current, fragment) {
    const observed = current.length + fragment.length;
    if (observed > this.limits.jsonStringLength) {
      this.fail("JSON_STRING_TOO_LONG", "a string is longer than the parser permits", {
        limit: {
          name: "jsonStringLength",
          limit: this.limits.jsonStringLength,
          observed
        }
      });
    }
    return current + fragment;
  }
  parseEscape() {
    const ch = this.text[this.index];
    this.index++;
    switch (ch) {
      case '"':
        return '"';
      case "\\":
        return "\\";
      case "/":
        return "/";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "	";
      case "u":
        return this.parseUnicodeEscape();
      default:
        this.fail("JSON_SYNTAX", `invalid escape sequence \\${String(ch)}`);
    }
  }
  parseUnicodeEscape() {
    const hex = this.text.slice(this.index, this.index + 4);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
      this.fail("JSON_INVALID_UNICODE", "a \\u escape must be followed by four hex digits");
    }
    this.index += 4;
    const code = Number.parseInt(hex, 16);
    if (code >= 55296 && code <= 56319) {
      if (this.text[this.index] !== "\\" || this.text[this.index + 1] !== "u") {
        this.fail("JSON_INVALID_UNICODE", "an escaped high surrogate must be followed by a low surrogate");
      }
      const lowHex = this.text.slice(this.index + 2, this.index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(lowHex)) {
        this.fail("JSON_INVALID_UNICODE", "a \\u escape must be followed by four hex digits");
      }
      const low = Number.parseInt(lowHex, 16);
      if (!(low >= 56320 && low <= 57343)) {
        this.fail("JSON_INVALID_UNICODE", "an escaped high surrogate must be followed by a low surrogate");
      }
      this.index += 6;
      return String.fromCharCode(code, low);
    }
    if (code >= 56320 && code <= 57343) {
      this.fail("JSON_INVALID_UNICODE", "an unpaired escaped low surrogate is not well-formed Unicode");
    }
    return String.fromCharCode(code);
  }
  parseNumber() {
    const start = this.index;
    if (this.text[this.index] === "-") {
      const first = this.text[this.index + 1];
      if (first !== "0" && !this.isDigit(first)) {
        this.fail("JSON_SYNTAX", `unexpected token at offset ${this.index + 1}`);
      }
      this.advanceNumberCodeUnit(start);
    }
    if (this.text[this.index] === "0") {
      this.advanceNumberCodeUnit(start);
    } else if (this.isDigit(this.text[this.index])) {
      while (this.isDigit(this.text[this.index])) this.advanceNumberCodeUnit(start);
    } else {
      this.fail("JSON_SYNTAX", `unexpected token at offset ${this.index}`);
    }
    if (this.text[this.index] === ".") {
      if (!this.isDigit(this.text[this.index + 1])) {
        this.fail("JSON_INVALID_NUMBER", "a decimal point must be followed by at least one digit");
      }
      this.advanceNumberCodeUnit(start);
      while (this.isDigit(this.text[this.index])) this.advanceNumberCodeUnit(start);
    }
    if (this.text[this.index] === "e" || this.text[this.index] === "E") {
      let requiredDigitIndex = this.index + 1;
      if (this.text[requiredDigitIndex] === "+" || this.text[requiredDigitIndex] === "-") requiredDigitIndex++;
      if (!this.isDigit(this.text[requiredDigitIndex])) {
        this.fail("JSON_INVALID_NUMBER", "an exponent must have at least one digit");
      }
      this.advanceNumberCodeUnit(start);
      if (this.text[this.index] === "+" || this.text[this.index] === "-") {
        this.advanceNumberCodeUnit(start);
      }
      while (this.isDigit(this.text[this.index])) this.advanceNumberCodeUnit(start);
    }
    const token = this.text.slice(start, this.index);
    if (token.length === 0) {
      this.fail("JSON_SYNTAX", `unexpected token at offset ${start}`);
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      this.fail(
        "JSON_NON_FINITE_NUMBER",
        "the number is outside the finite binary64 model; use null for a missing observation"
      );
    }
    if (!/[.eE]/u.test(token)) {
      const integer = BigInt(token);
      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      const isCanonicalBinary64Spelling = JSON.stringify(value) === token;
      if ((integer < -maxSafe || integer > maxSafe) && !isCanonicalBinary64Spelling) {
        this.fail(
          "JSON_INTEGER_OUT_OF_RANGE",
          "the unsafe bare integer is not the canonical spelling of its parsed binary64 value; use an exact safe integer, the canonical binary64 measurement spelling, or a string identifier"
        );
      }
    }
    return value;
  }
  /** Stop scanning a number at the first code unit beyond its token budget. */
  advanceNumberCodeUnit(start) {
    this.index++;
    const observed = this.index - start;
    if (observed > this.limits.jsonNumberTokenLength) {
      this.fail(
        "JSON_NUMBER_TOKEN_TOO_LONG",
        "the numeric token is longer than any meaningful binary64 literal",
        {
          limit: {
            name: "jsonNumberTokenLength",
            limit: this.limits.jsonNumberTokenLength,
            observed
          }
        }
      );
    }
  }
  isDigit(ch) {
    return ch !== void 0 && ch >= "0" && ch <= "9";
  }
};
function parseJsonStrict(text, options) {
  if (typeof text !== "string") {
    return err([
      makeError({
        code: "JSON_SYNTAX",
        stage: "parse",
        message: "the strict JSON boundary accepts a text string only"
      })
    ]);
  }
  const limitKeys = [
    "rawInputBytes",
    "jsonDepth",
    "jsonTotalNodes",
    "jsonStringLength",
    "jsonNumberTokenLength",
    "jsonObjectKeys",
    "jsonArrayItems"
  ];
  const limitsSnapshot = /* @__PURE__ */ Object.create(null);
  let allowBom = false;
  try {
    if (options === null || typeof options !== "object") throw new Error("invalid options");
    const limitsDescriptor = Object.getOwnPropertyDescriptor(options, "limits");
    if (limitsDescriptor === void 0 || !Object.prototype.hasOwnProperty.call(limitsDescriptor, "value")) {
      throw new Error("invalid limits");
    }
    const supplied = limitsDescriptor.value;
    if (supplied === null || typeof supplied !== "object") throw new Error("invalid limits");
    for (const key of limitKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(supplied, key);
      if (descriptor === void 0 || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        throw new Error("invalid limit");
      }
      const value = descriptor.value;
      if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid limit");
      limitsSnapshot[key] = value;
    }
    const bomDescriptor = Object.getOwnPropertyDescriptor(options, "allowBom");
    if (bomDescriptor !== void 0) {
      if (!Object.prototype.hasOwnProperty.call(bomDescriptor, "value")) {
        throw new Error("invalid allowBom");
      }
      allowBom = bomDescriptor.value === true;
    }
  } catch {
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the strict parser requires a valid finite non-negative budget object"
      })
    ]);
  }
  const limits = Object.freeze(limitsSnapshot);
  const byteLength = boundedUtf8ByteLength(text, limits.rawInputBytes);
  if (byteLength > limits.rawInputBytes) {
    return err([
      makeError({
        code: "JSON_BYTES_EXCEEDED",
        stage: "parse",
        message: "the raw input is larger than the active budget profile permits",
        limit: { name: "rawInputBytes", limit: limits.rawInputBytes, observed: byteLength }
      })
    ]);
  }
  let source = text;
  if (source.charCodeAt(0) === 65279) {
    if (!allowBom) {
      return err([
        makeError({
          code: "JSON_BOM_NOT_ALLOWED",
          stage: "parse",
          message: "the input begins with a byte-order mark; strip it"
        })
      ]);
    }
    source = source.slice(1);
  }
  try {
    return ok(new Scanner(source, limits).parseTopLevel());
  } catch (error) {
    if (error instanceof ParseFailure) {
      return err([error.diagnostic]);
    }
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the parser failed in an unexpected way; this is a Cortexel defect"
      })
    ]);
  }
}

// react/knowledgeGraphFigure.ts
var import_knowledgeGraphPresentation2 = require("#cortexel-knowledge-graph-presentation-capability");
var MATERIALIZED_SOURCE_INPUT_ASSURANCE = Object.freeze({
  boundary: "materialized_javascript_value",
  duplicateMembers: "not_observable_after_materialization"
});
var RAW_JSON_SOURCE_INPUT_ASSURANCE = Object.freeze({
  boundary: "raw_json_text",
  duplicateMembers: "rejected_before_materialization"
});
function snapshotHostPalette(value) {
  validatePalette(value);
  const snapshot = /* @__PURE__ */ Object.create(null);
  for (const key of SEMANTIC_PALETTE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === void 0 || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`active palette ${key} must remain an enumerable data property`);
    }
    snapshot[key] = descriptor.value;
  }
  validatePalette(snapshot);
  return Object.freeze(snapshot);
}
function failure(error, acceptedSource) {
  const result = {
    ok: false,
    errors: Object.freeze([Object.freeze(error)])
  };
  if (acceptedSource !== void 0) {
    result.acceptedSource = Object.freeze(acceptedSource);
  }
  return Object.freeze(result);
}
function prepareCorpusKnowledgeGraphFigureWithAssurance(spec, options, sourceInputAssurance) {
  const gated = validateSpec(spec);
  if (!gated.ok) {
    return {
      ok: false,
      errors: Object.freeze(gated.errors.slice(0, 16).map((error) => Object.freeze({
        code: "strict_gate_rejected",
        path: safeDiagnosticText(error.path, 240),
        message: safeDiagnosticText(error.message, 600),
        gateCode: safeDiagnosticText(error.code, 120)
      })))
    };
  }
  if (gated.skill !== "corpus.knowledge_graph") {
    return failure({
      code: "wrong_skill",
      path: "skill",
      message: `requires corpus.knowledge_graph; received ${safeDiagnosticText(gated.skill, 80)}`
    });
  }
  if (gated.spec.mode !== "interactive") {
    return failure({
      code: "unsupported_mode",
      path: "mode",
      message: "requires interactive mode; use an explicit export workflow for mode=export"
    });
  }
  if (gated.caption === null || gated.caption.length < 1) {
    return failure({
      code: "missing_bound_caption",
      path: "provenance",
      message: "the strict gate did not return the required honesty caption"
    });
  }
  try {
    const selectedPalette = gated.spec.palette !== void 0 ? getPalette(gated.spec.palette) : options.activePalette ?? getPalette("crameri");
    const palette = snapshotHostPalette(selectedPalette);
    const presentation = mapCorpusKnowledgeGraph(
      gated.spec.params,
      palette
    );
    let view;
    try {
      view = options.viewPolicy === void 0 ? void 0 : (0, import_knowledgeGraphPresentation2.prepareKnowledgeGraphView)(presentation, options.viewPolicy);
    } catch (error) {
      return failure({
        code: "view_preparation_failed",
        path: "viewPolicy",
        message: `knowledge-graph view preparation failed: ${safeErrorMessage(error)}`
      }, {
        caption: gated.caption,
        sourceInputAssurance,
        presentation
      });
    }
    const hostPolicy = Object.freeze({
      presentation,
      view,
      sourceInputAssurance,
      palette,
      themeMode: gated.spec.themeMode,
      backgroundColor: KNOWLEDGE_GRAPH_BACKGROUND_COLORS[gated.spec.themeMode],
      camera: gated.spec.camera,
      liveForceAvailability: knowledgeGraphLiveForceAvailability(
        view?.nodes.length ?? presentation.nodes.length,
        view?.edges.length ?? presentation.edges.length
      )
    });
    return Object.freeze({
      ok: true,
      caption: gated.caption,
      sourceInputAssurance,
      presentation,
      view,
      hostPolicy
    });
  } catch (error) {
    return failure({
      code: "presentation_preparation_failed",
      path: "params",
      message: `knowledge-graph presentation preparation failed: ${safeErrorMessage(error)}`
    });
  }
}
function prepareCorpusKnowledgeGraphFigure(spec, options = {}) {
  return prepareCorpusKnowledgeGraphFigureWithAssurance(
    spec,
    options,
    MATERIALIZED_SOURCE_INPUT_ASSURANCE
  );
}
function prepareCorpusKnowledgeGraphFigureJson(text, options = {}) {
  const parsed = parseJsonStrict(text, {
    limits: KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS
  });
  if (!parsed.ok) {
    return Object.freeze({
      ok: false,
      errors: Object.freeze(parsed.errors.slice(0, 16).map((error) => Object.freeze({
        code: "raw_json_rejected",
        path: safeDiagnosticText(error.instancePath || "(input)", 240),
        message: safeDiagnosticText(error.message, 600),
        gateCode: safeDiagnosticText(error.code, 120)
      })))
    });
  }
  return prepareCorpusKnowledgeGraphFigureWithAssurance(
    parsed.value,
    options,
    RAW_JSON_SOURCE_INPUT_ASSURANCE
  );
}

// react/KnowledgeGraphA11yList.tsx
var import_react = require("react");

// react/knowledgeGraphA11yNavigation.internal.ts
function planKnowledgeGraphA11yNavigation(queryActive, queryMatchIndexes, selectedIndex, pageSize, pageCount) {
  const boundedPageCount = Math.max(1, pageCount);
  if (queryActive && queryMatchIndexes.length > 0) {
    const selectedCursor = selectedIndex < 0 ? -1 : queryMatchIndexes.indexOf(selectedIndex);
    const matchCursor = selectedCursor < 0 ? 0 : selectedCursor;
    const rowIndex = queryMatchIndexes[matchCursor] ?? 0;
    return Object.freeze({
      matchCursor,
      nodePage: Math.min(
        boundedPageCount - 1,
        Math.max(0, Math.floor(rowIndex / pageSize))
      )
    });
  }
  return Object.freeze({
    matchCursor: 0,
    nodePage: selectedIndex < 0 ? 0 : Math.min(
      boundedPageCount - 1,
      Math.max(0, Math.floor(selectedIndex / pageSize))
    )
  });
}
function knowledgeGraphA11yNavigationContextKey(normalizedQuery, pageSize, selectedId, orderedNodeIds, orderedMatchIds) {
  return JSON.stringify([
    normalizedQuery,
    pageSize,
    selectedId,
    orderedNodeIds,
    orderedMatchIds
  ]);
}

// react/KnowledgeGraphA11yList.tsx
var import_knowledgeGraphPresentation3 = require("#cortexel-knowledge-graph-presentation-capability");
var import_jsx_runtime = require("react/jsx-runtime");
var INLINE_RELATION_LIMIT = 8;
var RELATION_PAGE_SIZE = 8;
var INLINE_ATTRIBUTE_LIMIT = 3;
var INLINE_ATTRIBUTE_ARRAY_LIMIT = 3;
var INLINE_EVIDENCE_LIMIT = 2;
var DEFAULT_A11Y_NODE_PAGE_SIZE = 25;
var MAX_A11Y_NODE_PAGE_SIZE = 100;
var CALLER_DEFINED_RADIUS_MEANING = "visual size has no declared quantitative interpretation";
function radiusMeaningText(value, corpusVisualMapping) {
  const meaning = safeDiagnosticText(
    value.radiusMeaning ?? CALLER_DEFINED_RADIUS_MEANING,
    400
  );
  return corpusVisualMapping ? meaning : `Caller-declared: ${meaning}`;
}
function attributeValueText(value) {
  if (Array.isArray(value)) {
    const shown = value.slice(0, INLINE_ATTRIBUTE_ARRAY_LIMIT).map((item) => safeDiagnosticText(String(item), 80));
    const omitted = value.length - shown.length;
    return `[${shown.join(", ")}${omitted > 0 ? `, ${omitted} more` : ""}]`;
  }
  return safeDiagnosticText(String(value), 120);
}
function evidenceRefText(item) {
  const prefix = `${safeDiagnosticText(item.kind, 80)} ` + safeDiagnosticText(item.evidence_id, 384);
  switch (item.kind) {
    case "graph_snapshot_record":
      return `${prefix}; record ${safeDiagnosticText(item.record_id, 320)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
    case "graph_node":
      return `${prefix}; node ${safeDiagnosticText(item.node_id, 120)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
    case "citation":
      return `${prefix}; paper ${safeDiagnosticText(item.paper_id, 160)}; citation ${safeDiagnosticText(item.citation_id, 160)}` + (item.page === void 0 ? "" : `; page ${item.page}`) + (item.doi ? `; DOI ${safeDiagnosticText(item.doi, 240)}` : "") + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
    case "external_source":
      return `${prefix}; source ${safeDiagnosticText(item.source_id, 240)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
  }
}
function fullEvidenceRefText(item) {
  const summary = evidenceRefText(item);
  return "excerpt" in item && item.excerpt ? `${summary}; excerpt ${safeDiagnosticText(item.excerpt, 1e3)}` : summary;
}
function fullAttributeValueText(value) {
  return Array.isArray(value) ? value.map((item) => safeDiagnosticText(String(item), 500)).join(", ") : safeDiagnosticText(String(value), 500);
}
function hasMetadata(value) {
  return value.radius !== void 0 || value.detail !== void 0 || value.attributes !== void 0 && Object.keys(value.attributes).length > 0 || value.epistemic !== void 0 || value.evidence !== void 0 && value.evidence.length > 0 || value.uncalibrated_score !== void 0;
}
function FullMetadata({
  value,
  label,
  corpusVisualMapping
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { "aria-label": safeDiagnosticText(label, 400), children: [
    value.radius !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      "Visual radius: ",
      normalizeGraphNodeRadius(value.radius),
      ". Radius meaning:",
      " ",
      radiusMeaningText(value, corpusVisualMapping)
    ] }),
    value.detail && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      "Detail: ",
      safeDiagnosticText(value.detail, 1e3)
    ] }),
    value.attributes && Object.keys(value.attributes).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "All attributes" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", { children: Object.entries(value.attributes).map(([key, item]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: safeDiagnosticText(key, 80) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: fullAttributeValueText(item) })
      ] }, key)) })
    ] }),
    value.epistemic && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Full epistemic status" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Status" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(value.epistemic.status, 80) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Advisory only" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: String(value.epistemic.advisory_only) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Paper-local evidence" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: String(value.epistemic.is_paper_local_evidence) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: String(value.epistemic.calibrated_posterior) })
      ] })
    ] }),
    value.evidence && value.evidence.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        "All evidence references (",
        value.evidence.length,
        ")"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { children: value.evidence.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: fullEvidenceRefText(item) }, item.evidence_id)) })
    ] }),
    value.uncalibrated_score && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Full uncalibrated score" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Kind" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(value.uncalibrated_score.kind, 80) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Value" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: value.uncalibrated_score.value }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: String(value.uncalibrated_score.calibrated_posterior) })
      ] })
    ] })
  ] });
}
function MetadataDisclosure({
  value,
  label,
  corpusVisualMapping = false
}) {
  const [expanded, setExpanded] = (0, import_react.useState)(false);
  if (!hasMetadata(value)) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { onToggle: (event) => setExpanded(event.currentTarget.open), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { style: { minHeight: 44 }, children: [
      "Browse full metadata for ",
      safeDiagnosticText(label, 400)
    ] }),
    expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      FullMetadata,
      {
        value,
        label: `Full metadata for ${label}`,
        corpusVisualMapping
      }
    )
  ] });
}
function metadataSummary(value, corpusVisualMapping = false) {
  const parts = [];
  if (value.radius !== void 0) {
    parts.push(
      `Visual radius: ${normalizeGraphNodeRadius(value.radius)}; radius meaning: ${radiusMeaningText(value, corpusVisualMapping)}`
    );
  }
  if (value.detail) parts.push(`Detail: ${safeDiagnosticText(value.detail, 300)}`);
  if (value.attributes) {
    const entries = Object.entries(value.attributes);
    const shown = entries.slice(0, INLINE_ATTRIBUTE_LIMIT).map(([key, item]) => `${safeDiagnosticText(key, 80)}=${attributeValueText(item)}`);
    if (shown.length > 0) {
      const omitted = entries.length - shown.length;
      parts.push(`Attributes: ${shown.join(", ")}${omitted > 0 ? `; ${omitted} more` : ""}`);
    }
  }
  if (value.epistemic) {
    parts.push(
      `Epistemic: ${safeDiagnosticText(value.epistemic.status, 80)}; advisory only; not paper-local evidence; uncalibrated`
    );
  }
  if (value.evidence) {
    const shown = value.evidence.slice(0, INLINE_EVIDENCE_LIMIT).map(evidenceRefText);
    const omitted = value.evidence.length - shown.length;
    parts.push(
      `Evidence (${value.evidence.length}): ${shown.join(", ")}` + (omitted > 0 ? `; ${omitted} more` : "")
    );
  }
  if (value.uncalibrated_score) {
    parts.push(
      `Uncalibrated score: ${safeDiagnosticText(value.uncalibrated_score.kind, 80)} ${value.uncalibrated_score.value}`
    );
  }
  return parts.join(". ");
}
function relationshipText(nodeId, edge, byId) {
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  const other = source.id === nodeId ? target : source;
  const direction = edge.directed === false ? "connected to" : source.id === nodeId ? "points to" : "from";
  const assertion = edge.id === void 0 ? "" : ` [${safeDiagnosticText(edge.id, 320)}]`;
  const kind = safeDiagnosticText(edge.kind, 80);
  const label = edge.label && edge.label !== edge.kind ? `${safeDiagnosticText(edge.label, 160)} (${kind})` : kind;
  const metadata = metadataSummary(edge);
  return `${label}${assertion}: ${direction} ${safeDiagnosticText(other.label, 240)} (node id ${safeDiagnosticText(other.id, 120)})` + (metadata ? `. ${metadata}` : "");
}
function KnowledgeGraphA11yList(props) {
  (0, import_knowledgeGraphPresentation3.assertPreparedGenericKnowledgeGraphPresentation)(props.presentation);
  return renderKnowledgeGraphA11yList(props);
}
function KnowledgeGraphCorpusA11yListInternal(props) {
  (0, import_knowledgeGraphPresentation3.assertPreparedCorpusKnowledgeGraphPresentation)(props.presentation);
  return renderKnowledgeGraphA11yList(props);
}
function renderKnowledgeGraphA11yList(props) {
  const { presentation, view, ...interactionProps } = props;
  (0, import_knowledgeGraphPresentation3.assertPreparedKnowledgeGraphPresentation)(presentation);
  if (view !== void 0) (0, import_knowledgeGraphPresentation3.assertPreparedKnowledgeGraphView)(view, presentation);
  assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
  const selectedId = view !== void 0 && props.selectedId !== null && !(0, import_knowledgeGraphPresentation3.knowledgeGraphViewContainsNode)(view, presentation, props.selectedId) ? null : props.selectedId;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    KnowledgeGraphA11yListInstance,
    {
      ...interactionProps,
      selectedId,
      nodes: view?.nodes ?? presentation.nodes,
      edges: view?.edges ?? presentation.edges,
      corpusVisualMapping: presentation.profile === "corpus_entity",
      view
    },
    presentation.graphIdentity
  );
}
function KnowledgeGraphA11yListInstance({
  nodes,
  edges,
  corpusVisualMapping,
  selectedId,
  onSelect,
  query = "",
  className,
  label = "Knowledge graph nodes",
  nodePageSize = DEFAULT_A11Y_NODE_PAGE_SIZE,
  view
}) {
  const instanceId = (0, import_react.useId)().replace(/:/g, "");
  const safePageSize = Number.isSafeInteger(nodePageSize) ? Math.min(MAX_A11Y_NODE_PAGE_SIZE, Math.max(1, nodePageSize)) : DEFAULT_A11Y_NODE_PAGE_SIZE;
  const { byId, validEdges, relations } = (0, import_react.useMemo)(() => {
    const byId2 = new Map(nodes.map((node) => [node.id, node]));
    const validEdges2 = filterGraphEdges(new Set(byId2.keys()), edges);
    const relations2 = /* @__PURE__ */ new Map();
    for (const node of nodes) relations2.set(node.id, []);
    for (let index = 0; index < validEdges2.length; index++) {
      const edge = validEdges2[index];
      const source = byId2.get(edge.source);
      const target = byId2.get(edge.target);
      if (!source || !target || source.id === target.id) continue;
      relations2.get(source.id)?.push(index);
      relations2.get(target.id)?.push(index);
    }
    return { byId: byId2, validEdges: validEdges2, relations: relations2 };
  }, [nodes, edges]);
  const normalizedQuery = (0, import_react.useMemo)(() => normalizeGraphQuery(query), [query]);
  const matchingNodeIds = (0, import_react.useMemo)(
    () => graphQueryMatchIds(nodes, normalizedQuery, validEdges),
    [nodes, normalizedQuery, validEdges]
  );
  const rows = (0, import_react.useMemo)(() => nodes.map((node) => ({
    node,
    relationIndexes: relations.get(node.id) ?? [],
    queryMatch: normalizedQuery.length === 0 || matchingNodeIds.has(node.id)
  })), [nodes, relations, normalizedQuery, matchingNodeIds]);
  const queryMatchIndexes = (0, import_react.useMemo)(
    () => rows.flatMap(({ queryMatch }, index) => queryMatch ? [index] : []),
    [rows]
  );
  const queryMatchCount = queryMatchIndexes.length;
  const nodePageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
  const queryNavigationKey = (0, import_react.useMemo)(
    () => knowledgeGraphA11yNavigationContextKey(
      normalizedQuery,
      safePageSize,
      selectedId,
      rows.map(({ node }) => node.id),
      queryMatchIndexes.map((index) => rows[index]?.node.id ?? "")
    ),
    [normalizedQuery, safePageSize, selectedId, rows, queryMatchIndexes]
  );
  const plannedNavigation = (0, import_react.useMemo)(() => ({
    contextKey: queryNavigationKey,
    ...planKnowledgeGraphA11yNavigation(
      normalizedQuery.length > 0,
      queryMatchIndexes,
      selectedIndex,
      safePageSize,
      nodePageCount
    )
  }), [
    queryNavigationKey,
    normalizedQuery,
    queryMatchIndexes,
    selectedIndex,
    safePageSize,
    nodePageCount
  ]);
  const [navigation, setNavigation] = (0, import_react.useState)(plannedNavigation);
  const activeNavigation = navigation.contextKey === queryNavigationKey ? navigation : plannedNavigation;
  const [queryFocusRequestId, setQueryFocusRequestId] = (0, import_react.useState)(null);
  const queryMatchTargetRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    setNavigation((current) => current.contextKey === queryNavigationKey ? current : plannedNavigation);
    setQueryFocusRequestId(null);
  }, [queryNavigationKey, plannedNavigation]);
  const currentNodePage = Math.min(
    activeNavigation.nodePage,
    nodePageCount - 1
  );
  const visibleRows = rows.slice(
    currentNodePage * safePageSize,
    (currentNodePage + 1) * safePageSize
  );
  const currentQueryMatchCursor = Math.min(
    activeNavigation.matchCursor,
    Math.max(0, queryMatchCount - 1)
  );
  const currentQueryMatchRowIndex = queryMatchIndexes[currentQueryMatchCursor];
  const navigatedQueryMatchNode = currentQueryMatchRowIndex === void 0 ? void 0 : rows[currentQueryMatchRowIndex]?.node;
  const currentPageStart = currentNodePage * safePageSize;
  const currentPageStop = currentPageStart + safePageSize;
  const currentQueryMatchNode = currentQueryMatchRowIndex !== void 0 && currentQueryMatchRowIndex >= currentPageStart && currentQueryMatchRowIndex < currentPageStop ? navigatedQueryMatchNode : void 0;
  (0, import_react.useEffect)(() => {
    if (queryFocusRequestId === null || currentQueryMatchNode?.id !== queryFocusRequestId || queryMatchTargetRef.current === null) return;
    queryMatchTargetRef.current.focus();
    setQueryFocusRequestId(null);
  }, [queryFocusRequestId, currentQueryMatchNode, currentNodePage]);
  const showQueryMatch = (cursor) => {
    const bounded = Math.max(0, Math.min(queryMatchCount - 1, cursor));
    const rowIndex = queryMatchIndexes[bounded];
    if (rowIndex === void 0) return;
    const targetId = rows[rowIndex]?.node.id;
    if (targetId === void 0) return;
    setNavigation({
      contextKey: queryNavigationKey,
      matchCursor: bounded,
      nodePage: Math.floor(rowIndex / safePageSize)
    });
    setQueryFocusRequestId(targetId);
  };
  const showNodePage = (page) => {
    const nodePage = Math.max(0, Math.min(nodePageCount - 1, page));
    const pageStart = nodePage * safePageSize;
    const pageStop = pageStart + safePageSize;
    const firstMatchOnPage = queryMatchIndexes.findIndex(
      (rowIndex) => rowIndex >= pageStart && rowIndex < pageStop
    );
    setNavigation({
      ...activeNavigation,
      contextKey: queryNavigationKey,
      matchCursor: firstMatchOnPage < 0 ? activeNavigation.matchCursor : firstMatchOnPage,
      nodePage
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    view !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { role: "note", children: [
      "Filtered view: showing ",
      view.counts.visibleNodes,
      " of ",
      view.counts.sourceNodes,
      " ",
      "nodes and ",
      view.counts.visibleEdges,
      " of ",
      view.counts.sourceEdges,
      " ",
      "relationships. Relationships excluded by kind: ",
      " ",
      view.counts.edgeKindFilteredEdges,
      ". Relationships excluded because a filtered endpoint is absent:",
      " ",
      view.counts.endpointPrunedEdges,
      "."
    ] }),
    normalizedQuery.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { role: "status", children: [
      "Query emphasizes ",
      queryMatchCount,
      " of ",
      rows.length,
      " nodes; all nodes remain available below."
    ] }),
    normalizedQuery.length > 0 && queryMatchCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { "aria-label": "Knowledge graph query matches", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { "aria-live": "polite", children: currentQueryMatchNode === void 0 ? `Node page ${currentNodePage + 1} has no current query match; use the query-match controls to navigate to one.` : `Query match ${currentQueryMatchCursor + 1} of ${queryMatchCount}: ${safeDiagnosticText(currentQueryMatchNode.label, 120)}. Node id ${safeDiagnosticText(currentQueryMatchNode.id, 120)}.` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          disabled: currentQueryMatchCursor === 0,
          onClick: () => showQueryMatch(currentQueryMatchCursor - 1),
          style: { minWidth: 44, minHeight: 44 },
          children: "Previous query match"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          disabled: currentQueryMatchCursor + 1 >= queryMatchCount,
          onClick: () => showQueryMatch(currentQueryMatchCursor + 1),
          style: { minWidth: 44, minHeight: 44 },
          children: "Next query match"
        }
      ),
      currentQueryMatchNode === void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          onClick: () => showQueryMatch(currentQueryMatchCursor),
          style: { minWidth: 44, minHeight: 44 },
          children: "Go to current query match"
        }
      )
    ] }),
    rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: view === void 0 ? "This graph contains no nodes." : `This filtered view contains no nodes; the full source contains ${view.counts.sourceNodes}.` }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: visibleRows.map(({ node, relationIndexes, queryMatch }, rowOffset) => {
      const rowIndex = currentNodePage * safePageSize + rowOffset;
      const detailsId = `cortexel-kg-${instanceId}-${rowIndex}-details`;
      const preview = relationIndexes.slice(0, INLINE_RELATION_LIMIT).map((index) => relationshipText(node.id, validEdges[index], byId));
      const omitted = relationIndexes.length - preview.length;
      const nodeMetadata = metadataSummary(node, corpusVisualMapping);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "cortexel-knowledge-graph-node",
            "aria-pressed": selectedId === node.id,
            "aria-current": currentQueryMatchNode?.id === node.id ? "true" : void 0,
            "aria-describedby": detailsId,
            ref: currentQueryMatchNode?.id === node.id ? queryMatchTargetRef : void 0,
            onClick: () => onSelect(
              toggledKnowledgeGraphSelection(selectedId, node.id)
            ),
            style: { minWidth: 44, minHeight: 44 },
            children: safeDiagnosticText(node.label, 240)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { id: detailsId, children: [
          safeDiagnosticText(node.kind, 80),
          ". Node id",
          " ",
          safeDiagnosticText(node.id, 120),
          ".",
          " ",
          normalizedQuery.length > 0 ? queryMatch ? currentQueryMatchNode?.id === node.id ? "Current navigated query match; visually emphasized. " : "Query match; visually emphasized. " : "Not a query match; visually de-emphasized but still present. " : "",
          nodeMetadata ? `${nodeMetadata}. ` : "",
          preview.length > 0 ? `${preview.join("; ")}${omitted > 0 ? `; ${omitted} more relationships` : ""}` : "No relationships in this active view."
        ] }),
        selectedId === node.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          MetadataDisclosure,
          {
            value: node,
            label: `node ${node.label}`,
            corpusVisualMapping
          }
        ),
        selectedId === node.id && relationIndexes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          RelationshipPager,
          {
            nodeId: node.id,
            relationIndexes,
            edges: validEdges,
            byId
          }
        )
      ] }, node.id);
    }) }),
    rows.length > safePageSize && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { "aria-label": "Knowledge graph node pages", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { "aria-live": "polite", children: [
        "Node page ",
        currentNodePage + 1,
        " of ",
        nodePageCount,
        "; ",
        rows.length,
        " nodes"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          disabled: currentNodePage === 0,
          onClick: () => showNodePage(currentNodePage - 1),
          style: { minWidth: 44, minHeight: 44 },
          children: "Previous nodes"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          disabled: currentNodePage + 1 >= nodePageCount,
          onClick: () => showNodePage(currentNodePage + 1),
          style: { minWidth: 44, minHeight: 44 },
          children: "Next nodes"
        }
      )
    ] })
  ] });
}
function compareLegendEntries(a, b) {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  return a.color === b.color ? 0 : a.color < b.color ? -1 : 1;
}
function KnowledgeGraphLegend(props) {
  (0, import_knowledgeGraphPresentation3.assertPreparedGenericKnowledgeGraphPresentation)(props.presentation);
  return renderKnowledgeGraphLegend(props);
}
function KnowledgeGraphCorpusLegendInternal(props) {
  (0, import_knowledgeGraphPresentation3.assertPreparedCorpusKnowledgeGraphPresentation)(props.presentation);
  return renderKnowledgeGraphLegend(props);
}
function renderKnowledgeGraphLegend({
  presentation,
  view,
  className,
  label = "Knowledge graph legend",
  themeMode = "dark"
}) {
  (0, import_knowledgeGraphPresentation3.assertPreparedKnowledgeGraphPresentation)(presentation);
  if (view !== void 0) (0, import_knowledgeGraphPresentation3.assertPreparedKnowledgeGraphView)(view, presentation);
  const nodes = view?.nodes ?? presentation.nodes;
  const edges = view?.edges ?? presentation.edges;
  const { context } = presentation;
  const { nodeEntries, edgeEntries } = (0, import_react.useMemo)(() => {
    const nodeEntries2 = [];
    const edgeEntries2 = [];
    const nodeGroups = /* @__PURE__ */ new Map();
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const radius = normalizeGraphNodeRadius(node.radius);
      const radiusMeaning = radiusMeaningText(
        node,
        presentation.profile === "corpus_entity"
      );
      const nodeGlyph = node.nodeGlyph ?? "sphere_outline";
      const key = JSON.stringify([node.kind, node.color, radiusMeaning, nodeGlyph]);
      const entry = nodeGroups.get(key);
      if (entry) {
        entry.count += 1;
        entry.minRadius = Math.min(entry.minRadius, radius);
        entry.maxRadius = Math.max(entry.maxRadius, radius);
      } else {
        nodeGroups.set(key, {
          kind: node.kind,
          color: node.color,
          count: 1,
          minRadius: radius,
          maxRadius: radius,
          radiusMeaning,
          nodeGlyph
        });
      }
    }
    const edgeGroups = /* @__PURE__ */ new Map();
    const validEdges = filterGraphEdges(
      new Set(nodes.map(({ id: id2 }) => id2)),
      edges
    );
    for (let index = 0; index < validEdges.length; index++) {
      const edge = validEdges[index];
      const directed = edge.directed !== false;
      const particles = edge.particles === true;
      const edgeStrokePattern = edge.edgeStrokePattern ?? "solid";
      const key = JSON.stringify([
        edge.kind,
        edge.color,
        directed,
        particles,
        edgeStrokePattern
      ]);
      const entry = edgeGroups.get(key);
      if (entry) entry.count += 1;
      else {
        edgeGroups.set(key, {
          kind: edge.kind,
          color: edge.color,
          directed,
          particles,
          edgeStrokePattern,
          count: 1
        });
      }
    }
    nodeEntries2.push(...[...nodeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || (a.radiusMeaning === b.radiusMeaning ? 0 : a.radiusMeaning < b.radiusMeaning ? -1 : 1)));
    edgeEntries2.push(...[...edgeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || Number(a.directed) - Number(b.directed) || Number(a.particles) - Number(b.particles)));
    return { nodeEntries: nodeEntries2, edgeEntries: edgeEntries2 };
  }, [nodes, edges, presentation.profile]);
  const swatchStyle = (color) => ({
    display: "inline-block",
    width: 16,
    height: 16,
    marginRight: 8,
    border: "1px solid currentColor",
    backgroundColor: color
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    view !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { role: "note", children: [
      "Filtered view: showing ",
      view.counts.visibleNodes,
      " of ",
      view.counts.sourceNodes,
      " ",
      "nodes and ",
      view.counts.visibleEdges,
      " of ",
      view.counts.sourceEdges,
      " ",
      "relationships."
    ] }),
    context && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Graph context" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Graph id" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.graph_id, 160) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Graph source" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.graph_source, 200) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Caller-declared snapshot namespace" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.graph_snapshot_id, 200) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Graph scope" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.graph_scope, 80) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Generated at" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.generated_at, 80) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Node kinds" }),
    nodeEntries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No nodes in this active view." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: nodeEntries.map((entry) => {
      const renderedColor = knowledgeGraphContrastSafeColor(entry.color, themeMode);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", style: swatchStyle(renderedColor) }),
        safeDiagnosticText(entry.kind, 80),
        ": ",
        entry.count,
        " ",
        entry.count === 1 ? "node" : "nodes",
        "; source color",
        " ",
        safeDiagnosticText(entry.color, 80),
        "; intended undimmed scene color",
        " ",
        safeDiagnosticText(renderedColor, 80),
        "; glyph",
        " ",
        knowledgeGraphNodeGlyphDescription(entry.nodeGlyph),
        "; visual radius",
        " ",
        entry.minRadius === entry.maxRadius ? entry.minRadius : `${entry.minRadius}\u2013${entry.maxRadius}`,
        ";",
        " ",
        entry.radiusMeaning
      ] }, JSON.stringify([
        entry.kind,
        entry.color,
        entry.radiusMeaning,
        entry.nodeGlyph
      ]));
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Relationship kinds" }),
    edgeEntries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No relationships in this active view." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: edgeEntries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          "aria-hidden": "true",
          style: swatchStyle(knowledgeGraphContrastSafeColor(entry.color, themeMode))
        }
      ),
      safeDiagnosticText(entry.kind, 80),
      ": ",
      entry.count,
      " ",
      entry.count === 1 ? "relationship" : "relationships",
      ";",
      " ",
      entry.directed ? "directed" : "undirected",
      "; source color",
      " ",
      safeDiagnosticText(entry.color, 80),
      "; intended undimmed scene color",
      " ",
      safeDiagnosticText(
        knowledgeGraphContrastSafeColor(entry.color, themeMode),
        80
      ),
      "; ",
      knowledgeGraphEdgeStrokeDescription(entry.edgeStrokePattern),
      entry.particles ? "; flow markers" : ""
    ] }, JSON.stringify([
      entry.kind,
      entry.color,
      entry.directed,
      entry.particles,
      entry.edgeStrokePattern
    ]))) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { role: "note", children: [
      "The listed scene colors are the intended undimmed baseline. Glyph shells use",
      " ",
      themeMode === "light" ? "#0f172a" : "#f8fafc",
      " before dimming. Focus and query interactions dim peripheral node fills, glyph shells, relationships, arrows, and flow markers without changing their kind glyph, stroke pattern, direction, or DOM record. Layout positions and distances are schematic, not quantitative evidence."
    ] })
  ] });
}
function RelationshipPager({
  nodeId,
  relationIndexes,
  edges,
  byId
}) {
  const [page, setPage] = (0, import_react.useState)(0);
  const pageCount = Math.max(1, Math.ceil(relationIndexes.length / RELATION_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  (0, import_react.useEffect)(() => setPage(0), [nodeId]);
  (0, import_react.useEffect)(
    () => setPage((current) => Math.min(current, pageCount - 1)),
    [pageCount]
  );
  const start = currentPage * RELATION_PAGE_SIZE;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { style: { minHeight: 44 }, children: [
      "Browse all ",
      relationIndexes.length,
      " relationships"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: relationIndexes.slice(start, start + RELATION_PAGE_SIZE).map((edgeIndex) => {
      const edge = edges[edgeIndex];
      const humanLabel = edge.label ?? edge.kind;
      const edgeLabel = edge.id === void 0 ? `${humanLabel} relationship` : `${humanLabel} [${edge.id}]`;
      const relationshipKey = graphEdgeIdentityKey(edge);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        relationshipText(nodeId, edge, byId),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetadataDisclosure, { value: edge, label: `relationship ${edgeLabel}` })
      ] }, JSON.stringify([nodeId, relationshipKey]));
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { "aria-live": "polite", children: [
      "Page ",
      currentPage + 1,
      " of ",
      pageCount
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        disabled: currentPage === 0,
        onClick: () => setPage((current) => Math.max(0, current - 1)),
        style: { minWidth: 44, minHeight: 44 },
        children: "Previous relationships"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        disabled: currentPage + 1 >= pageCount,
        onClick: () => setPage((current) => Math.min(pageCount - 1, current + 1)),
        style: { minWidth: 44, minHeight: 44 },
        children: "Next relationships"
      }
    )
  ] });
}

// react/KnowledgeGraphStaticRecordView.tsx
var import_react2 = require("react");
var import_knowledgeGraphPresentation4 = require("#cortexel-knowledge-graph-presentation-capability");
var import_jsx_runtime2 = require("react/jsx-runtime");
var DEFAULT_STATIC_PAGE_SIZE = 10;
var MAX_STATIC_PAGE_SIZE = 25;
var STATIC_RECORD_INSTANCE_KEYS = /* @__PURE__ */ new WeakMap();
var nextStaticRecordInstanceKey = 0n;
function staticRecordInstanceKey(presentation) {
  const existing = STATIC_RECORD_INSTANCE_KEYS.get(presentation);
  if (existing !== void 0) return existing;
  const created = `cortexel-kg-record-${nextStaticRecordInstanceKey}`;
  nextStaticRecordInstanceKey += 1n;
  STATIC_RECORD_INSTANCE_KEYS.set(presentation, created);
  return created;
}
function boundedPageSize(value) {
  return Number.isSafeInteger(value) ? Math.max(1, Math.min(MAX_STATIC_PAGE_SIZE, value)) : DEFAULT_STATIC_PAGE_SIZE;
}
function codeUnitCompare(left, right) {
  return left === right ? 0 : left < right ? -1 : 1;
}
function compareOptionalString(left, right) {
  if (left === right) return 0;
  if (left === void 0) return -1;
  if (right === void 0) return 1;
  return codeUnitCompare(left, right);
}
function compareEvidence(left, right) {
  const common = codeUnitCompare(left.kind, right.kind) || codeUnitCompare(left.evidence_id, right.evidence_id);
  if (common !== 0 || left.kind !== right.kind) return common;
  switch (left.kind) {
    case "graph_snapshot_record": {
      const matching = right;
      return codeUnitCompare(left.record_id, matching.record_id) || compareOptionalString(left.locator, matching.locator);
    }
    case "graph_node": {
      const matching = right;
      return codeUnitCompare(left.node_id, matching.node_id) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt);
    }
    case "citation": {
      const matching = right;
      return codeUnitCompare(left.paper_id, matching.paper_id) || codeUnitCompare(left.citation_id, matching.citation_id) || (left.page ?? -1) - (matching.page ?? -1) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt) || compareOptionalString(left.doi, matching.doi);
    }
    case "external_source": {
      const matching = right;
      return codeUnitCompare(left.source_id, matching.source_id) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt);
    }
  }
}
function EvidenceReference({ reference }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Kind" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.kind }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Evidence id" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.evidence_id }),
    reference.kind === "graph_snapshot_record" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Record id" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.record_id })
    ] }),
    reference.kind === "graph_node" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Referenced node id" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.node_id })
    ] }),
    reference.kind === "citation" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Paper id" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.paper_id }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Citation id" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.citation_id }),
      reference.page !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Page" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.page })
      ] }),
      reference.doi !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "DOI" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.doi })
      ] })
    ] }),
    reference.kind === "external_source" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Source id" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.source_id })
    ] }),
    reference.locator !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Locator" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.locator })
    ] }),
    "excerpt" in reference && reference.excerpt !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Excerpt" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: reference.excerpt })
    ] })
  ] }) });
}
function scalarText(value) {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return String(value);
}
function attributeValue(value) {
  if (Array.isArray(value)) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ol", { children: value.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: scalarText(item) }, index)) });
  }
  return scalarText(value);
}
function CompleteMetadata({ value }) {
  const attributeEntries = Object.entries(value.attributes ?? {}).sort(([left], [right]) => codeUnitCompare(left, right));
  const evidence = [...value.evidence ?? []].sort(compareEvidence);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    value.detail !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
      "Detail: ",
      value.detail
    ] }),
    attributeEntries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "Attributes" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dl", { children: attributeEntries.map(([key, item]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: key }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: attributeValue(item) })
      ] }, key)) })
    ] }),
    value.epistemic !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "Epistemic record" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Status" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: value.epistemic.status }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Advisory only" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: String(value.epistemic.advisory_only) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Paper-local evidence" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: String(value.epistemic.is_paper_local_evidence) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: String(value.epistemic.calibrated_posterior) })
      ] })
    ] }),
    value.uncalibrated_score !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "Uncalibrated score" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Meaning" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: value.uncalibrated_score.kind }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Value" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: value.uncalibrated_score.value }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: String(value.uncalibrated_score.calibrated_posterior) })
      ] })
    ] }),
    evidence.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
        "Evidence references (",
        evidence.length,
        ")"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ol", { children: evidence.map((reference) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(EvidenceReference, { reference }, reference.evidence_id)) })
    ] })
  ] });
}
function compareNodes(left, right) {
  return codeUnitCompare(left.id, right.id) || codeUnitCompare(left.kind, right.kind) || codeUnitCompare(left.label, right.label);
}
function compareEdges(left, right) {
  if (left.id !== void 0 || right.id !== void 0) {
    const byId = compareOptionalString(left.id, right.id);
    if (byId !== 0) return byId;
  }
  return codeUnitCompare(left.source, right.source) || codeUnitCompare(left.target, right.target) || codeUnitCompare(left.kind, right.kind) || Number(left.directed !== false) - Number(right.directed !== false) || compareOptionalString(left.label, right.label);
}
function KnowledgeGraphStaticRecordView(props) {
  (0, import_knowledgeGraphPresentation4.assertPreparedGenericKnowledgeGraphPresentation)(props.presentation);
  return renderKnowledgeGraphStaticRecordView(props);
}
function KnowledgeGraphCorpusStaticRecordViewInternal(props) {
  (0, import_knowledgeGraphPresentation4.assertPreparedCorpusKnowledgeGraphPresentation)(props.presentation);
  return renderKnowledgeGraphStaticRecordView(props);
}
function renderKnowledgeGraphStaticRecordView(props) {
  (0, import_knowledgeGraphPresentation4.assertPreparedKnowledgeGraphPresentation)(props.presentation);
  if (props.view !== void 0) {
    (0, import_knowledgeGraphPresentation4.assertPreparedKnowledgeGraphView)(props.view, props.presentation);
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    KnowledgeGraphStaticRecordViewInstance,
    {
      ...props
    },
    staticRecordInstanceKey(props.presentation)
  );
}
function KnowledgeGraphStaticRecordViewInstance({
  presentation,
  view,
  className,
  label = "Deterministic paginated knowledge graph record view",
  nodePageSize,
  edgePageSize
}) {
  const nodes = (0, import_react2.useMemo)(
    () => [...presentation.nodes].sort(compareNodes),
    [presentation.nodes]
  );
  const edges = (0, import_react2.useMemo)(
    () => [...presentation.edges].sort(compareEdges),
    [presentation.edges]
  );
  const safeNodePageSize = boundedPageSize(nodePageSize);
  const safeEdgePageSize = boundedPageSize(edgePageSize);
  const [nodePage, setNodePage] = (0, import_react2.useState)(0);
  const [edgePage, setEdgePage] = (0, import_react2.useState)(0);
  const nodePageCount = Math.max(1, Math.ceil(nodes.length / safeNodePageSize));
  const edgePageCount = Math.max(1, Math.ceil(edges.length / safeEdgePageSize));
  const currentNodePage = Math.min(nodePage, nodePageCount - 1);
  const currentEdgePage = Math.min(edgePage, edgePageCount - 1);
  (0, import_react2.useEffect)(() => {
    setNodePage((page) => Math.min(page, nodePageCount - 1));
  }, [nodePageCount]);
  (0, import_react2.useEffect)(() => {
    setEdgePage((page) => Math.min(page, edgePageCount - 1));
  }, [edgePageCount]);
  const visibleNodes = nodes.slice(
    currentNodePage * safeNodePageSize,
    (currentNodePage + 1) * safeNodePageSize
  );
  const visibleEdges = edges.slice(
    currentEdgePage * safeEdgePageSize,
    (currentEdgePage + 1) * safeEdgePageSize
  );
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    view !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { role: "note", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
        "Filtered interactive view: showing ",
        view.counts.visibleNodes,
        " of",
        " ",
        view.counts.sourceNodes,
        " nodes and ",
        view.counts.visibleEdges,
        " of",
        " ",
        view.counts.sourceEdges,
        " relationships. The paginated records below remain the full source presentation."
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Requested node kinds" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: view.policy.nodeKinds === "all" ? "all" : view.policy.nodeKinds.length === 0 ? "none" : view.policy.nodeKinds.join(", ") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Requested relationship kinds" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: view.policy.edgeKinds === "all" ? "all" : view.policy.edgeKinds.length === 0 ? "none" : view.policy.edgeKinds.join(", ") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Endpoint-pruned relationships" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: view.counts.endpointPrunedEdges }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Kind-filtered relationships" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: view.counts.edgeKindFilteredEdges })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "Presentation metadata" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Prepared contract" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.contract }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Profile" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.profile }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Graph lifecycle identity" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.graphIdentity }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Input boundary" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.inputAssurance.boundary }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Duplicate-member assurance" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.inputAssurance.duplicateMembers }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Proxy-trap assurance" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.inputAssurance.proxyTrapFreedom }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Visual mapping authority" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.mappingAuthority.kind }),
      presentation.mappingAuthority.kind === "corpus_visual_mapping" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Presentation invariants" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.mappingAuthority.presentationInvariants }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Derivation authentication" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.mappingAuthority.derivationAuthentication })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Scientific authority" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.mappingAuthority.scientificAuthority }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Retained input occurrences" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.budget.retainedOccurrences }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Accepted source string code units" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.budget.sourceStringCodeUnits }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Inspection work" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.budget.inspectionWork })
    ] }),
    presentation.context !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "Caller-declared graph context" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Graph id" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.context.graph_id }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Graph source" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.context.graph_source }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Caller-declared snapshot namespace" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.context.graph_snapshot_id }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Graph scope" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.context.graph_scope }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Generated at" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.context.generated_at })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { role: "note", children: "This view preserves caller-supplied reference identifiers but does not resolve, authenticate, or establish custody for them. It contains no force-layout coordinates; visual positions and distances are not evidence." }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h3", { children: [
      "Nodes (",
      nodes.length,
      ")"
    ] }),
    nodes.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "This source presentation contains no nodes." }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ol", { children: visibleNodes.map((node) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { children: node.label }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Node id" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: node.id }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Kind" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: node.kind }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Visual color" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: node.color }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Visual glyph" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: node.nodeGlyph ?? "sphere_outline" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Visual radius" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: node.radius }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Radius meaning" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: presentation.profile === "corpus_entity" ? node.radiusMeaning : `Caller-declared: ${node.radiusMeaning ?? "visual size has no declared quantitative interpretation."}` })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CompleteMetadata, { value: node })
    ] }, node.id)) }),
    nodes.length > safeNodePageSize && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("nav", { "aria-label": "Static record node pages", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { "aria-live": "polite", children: [
        "Node page ",
        currentNodePage + 1,
        " of ",
        nodePageCount
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          style: { minHeight: 44, minWidth: 44 },
          disabled: currentNodePage === 0,
          onClick: () => setNodePage(Math.max(0, currentNodePage - 1)),
          children: "Previous node records"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          style: { minHeight: 44, minWidth: 44 },
          disabled: currentNodePage + 1 >= nodePageCount,
          onClick: () => setNodePage(
            Math.min(nodePageCount - 1, currentNodePage + 1)
          ),
          children: "Next node records"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h3", { children: [
      "Relationships (",
      edges.length,
      ")"
    ] }),
    edges.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "This source presentation contains no relationships." }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ol", { children: visibleEdges.map((edge) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { children: edge.label ?? edge.kind }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("dl", { children: [
        edge.id !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Assertion id" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: edge.id })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Source node id" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: edge.source }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Target node id" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: edge.target }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Kind" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: edge.kind }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Direction" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: edge.directed === false ? "undirected" : "source to target" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Visual color" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: edge.color }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Visual stroke pattern" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: edge.edgeStrokePattern ?? "solid" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dt", { children: "Flow-marker encoding enabled" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("dd", { children: String(edge.particles === true) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CompleteMetadata, { value: edge })
    ] }, graphEdgeIdentityKey(edge))) }),
    edges.length > safeEdgePageSize && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("nav", { "aria-label": "Static record relationship pages", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { "aria-live": "polite", children: [
        "Relationship page ",
        currentEdgePage + 1,
        " of ",
        edgePageCount
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          style: { minHeight: 44, minWidth: 44 },
          disabled: currentEdgePage === 0,
          onClick: () => setEdgePage(Math.max(0, currentEdgePage - 1)),
          children: "Previous relationship records"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          style: { minHeight: 44, minWidth: 44 },
          disabled: currentEdgePage + 1 >= edgePageCount,
          onClick: () => setEdgePage(
            Math.min(edgePageCount - 1, currentEdgePage + 1)
          ),
          children: "Next relationship records"
        }
      )
    ] })
  ] });
}

// react/KnowledgeGraphAccessibleFigure.tsx
var import_react3 = require("react");
var import_knowledgeGraphPresentation5 = require("#cortexel-knowledge-graph-presentation-capability");
var import_jsx_runtime3 = require("react/jsx-runtime");
var KnowledgeGraphVisualBoundary = class extends import_react3.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error, _info) {
  }
  componentDidUpdate(previous) {
    if ((previous.resetToken !== this.props.resetToken || !Object.is(previous.retryToken, this.props.retryToken)) && this.state.failed) {
      this.setState({ failed: false });
    }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
};
function KnowledgeGraphVisualMount({ renderVisual, scene, context }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children: renderVisual(scene, context) });
}
function inputBoundaryFailure(message) {
  return Object.freeze({
    ok: false,
    errors: Object.freeze([Object.freeze({
      code: "input_boundary_rejected",
      path: "spec/specJson",
      message
    })])
  });
}
function KnowledgeGraphAccessibleFigure(props) {
  const {
    renderVisual,
    selectedId,
    onSelect,
    hoverId,
    onHover,
    visualAvailable = true,
    visualRetryKey,
    viewPolicy,
    query = "",
    controlsRef,
    autoFrame = true,
    flyToSelection,
    labelColor,
    particleColor,
    reducedMotion,
    nodePageSize,
    recordNodePageSize,
    recordEdgePageSize,
    activePalette,
    className,
    label = "Interactive knowledge graph"
  } = props;
  const hasSpec = Object.hasOwn(props, "spec");
  const hasSpecJson = Object.hasOwn(props, "specJson");
  const spec = hasSpec ? props.spec : void 0;
  const specJson = hasSpecJson ? props.specJson : void 0;
  const preparedSource = (0, import_react3.useMemo)(
    () => {
      if (hasSpec === hasSpecJson) {
        return inputBoundaryFailure(
          "provide exactly one own input property: spec or specJson"
        );
      }
      if (hasSpecJson) {
        if (typeof specJson !== "string") {
          return inputBoundaryFailure("specJson must be a string");
        }
        return prepareCorpusKnowledgeGraphFigureJson(specJson, { activePalette });
      }
      return prepareCorpusKnowledgeGraphFigure(spec, { activePalette });
    },
    [hasSpec, hasSpecJson, spec, specJson, activePalette]
  );
  const preparedView = (0, import_react3.useMemo)(() => {
    if (!preparedSource.ok || viewPolicy === void 0) {
      return { ok: true, view: void 0 };
    }
    try {
      return {
        ok: true,
        view: (0, import_knowledgeGraphPresentation5.prepareKnowledgeGraphView)(preparedSource.presentation, viewPolicy)
      };
    } catch (error) {
      return {
        ok: false,
        message: `knowledge-graph view preparation failed: ${safeErrorMessage(error)}`
      };
    }
  }, [preparedSource, viewPolicy]);
  const hostPolicy = (0, import_react3.useMemo)(
    () => {
      if (!preparedSource.ok || !preparedView.ok) return void 0;
      const activeNodes = preparedView.view?.nodes ?? preparedSource.presentation.nodes;
      const activeEdges = preparedView.view?.edges ?? preparedSource.presentation.edges;
      return Object.freeze({
        ...preparedSource.hostPolicy,
        view: preparedView.view,
        liveForceAvailability: knowledgeGraphLiveForceAvailability(
          activeNodes.length,
          activeEdges.length
        )
      });
    },
    [preparedSource, preparedView]
  );
  const captionId = `cortexel-kg-caption-${(0, import_react3.useId)().replace(/:/gu, "")}`;
  const selectionInvalidation = (0, import_react3.useRef)(null);
  const hoverInvalidation = (0, import_react3.useRef)(null);
  const activeToken = preparedSource.ok && preparedView.ok ? preparedView.view ?? preparedSource.presentation : void 0;
  const selectedIsInvalid = preparedSource.ok && preparedView.ok && selectedId !== null && !(preparedView.view === void 0 ? (0, import_knowledgeGraphPresentation5.knowledgeGraphPresentationContainsNode)(preparedSource.presentation, selectedId) : (0, import_knowledgeGraphPresentation5.knowledgeGraphViewContainsNode)(
    preparedView.view,
    preparedSource.presentation,
    selectedId
  ));
  const hoverIsInvalid = preparedSource.ok && preparedView.ok && hoverId !== null && !(preparedView.view === void 0 ? (0, import_knowledgeGraphPresentation5.knowledgeGraphPresentationContainsNode)(preparedSource.presentation, hoverId) : (0, import_knowledgeGraphPresentation5.knowledgeGraphViewContainsNode)(
    preparedView.view,
    preparedSource.presentation,
    hoverId
  ));
  (0, import_react3.useEffect)(() => {
    if (!selectedIsInvalid || activeToken === void 0 || selectedId === null) {
      selectionInvalidation.current = null;
      return;
    }
    const previous = selectionInvalidation.current;
    if (previous?.token === activeToken && previous.id === selectedId) return;
    selectionInvalidation.current = { token: activeToken, id: selectedId };
    onSelect(null);
  }, [activeToken, onSelect, selectedId, selectedIsInvalid]);
  (0, import_react3.useEffect)(() => {
    if (!hoverIsInvalid || activeToken === void 0 || hoverId === null) {
      hoverInvalidation.current = null;
      return;
    }
    const previous = hoverInvalidation.current;
    if (previous?.token === activeToken && previous.id === hoverId) return;
    hoverInvalidation.current = { token: activeToken, id: hoverId };
    onHover(null);
  }, [activeToken, hoverId, hoverIsInvalid, onHover]);
  if (!preparedSource.ok) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { role: "alert", "aria-label": "Invalid knowledge graph figure", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: "Knowledge graph figure rejected" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { children: preparedSource.errors.map((error, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { children: safeDiagnosticText(`${error.path}: ${error.message}`, 840) }, index)) })
    ] });
  }
  if (!preparedView.ok) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "figure",
      {
        className,
        "aria-label": safeDiagnosticText(label, 240),
        "aria-describedby": captionId,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("figcaption", { id: captionId, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: preparedSource.caption }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { role: "alert", "aria-label": "Invalid knowledge graph view policy", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: "Knowledge graph view rejected" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: safeDiagnosticText(`viewPolicy: ${preparedView.message}`, 840) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            KnowledgeGraphCorpusStaticRecordViewInternal,
            {
              presentation: preparedSource.presentation,
              nodePageSize: recordNodePageSize,
              edgePageSize: recordEdgePageSize
            }
          )
        ]
      }
    );
  }
  if (hostPolicy === void 0) {
    throw new Error("knowledge-graph host policy invariant failed");
  }
  const { caption, presentation } = preparedSource;
  const { view } = preparedView;
  const visualUnavailableStatus = /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { role: "status", children: "The host-owned interactive 3D view is unavailable. The paginated graph-record browser remains below; its controls expose every accepted record after hydration." });
  const { liveForceAvailability } = hostPolicy;
  const liveForceAvailable = liveForceAvailability.status === "available";
  const liveForceLimitStatus = /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { role: "status", children: [
    "The host-owned interactive 3D force view was not mounted: this active view has",
    " ",
    liveForceAvailability.nodeCount,
    " nodes and ",
    liveForceAvailability.edgeCount,
    " ",
    "relationships; the reviewed main-thread ceiling is",
    " ",
    liveForceAvailability.maxNodes,
    " nodes and ",
    liveForceAvailability.maxEdges,
    " ",
    "relationships. If an available exact kind filter reduces this source below the ceiling, that filtered view can mount the visual; some single-kind sources have no nonempty eligible view. The bound caption, legend, interactive DOM controls, and paginated source-record browser remain below; after hydration the browser controls expose every accepted source record."
  ] });
  const scene = liveForceAvailable ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    KnowledgeGraphCorpus3DSceneInternal,
    {
      presentation,
      view,
      selectedId,
      query,
      onSelect,
      hoverId,
      onHover,
      controlsRef,
      autoFrame,
      flyToSelection,
      labelColor,
      particleColor,
      themeMode: hostPolicy.themeMode,
      reducedMotion
    }
  ) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "figure",
    {
      className,
      "aria-label": safeDiagnosticText(label, 240),
      "aria-describedby": captionId,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("figcaption", { id: captionId, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: caption }) }),
        view !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { role: "note", children: [
          "Filtered view: showing ",
          view.counts.visibleNodes,
          " of ",
          view.counts.sourceNodes,
          " ",
          "nodes and ",
          view.counts.visibleEdges,
          " of ",
          view.counts.sourceEdges,
          " ",
          "relationships. Relationships excluded by kind: ",
          " ",
          view.counts.edgeKindFilteredEdges,
          "; excluded because an endpoint is hidden:",
          " ",
          view.counts.endpointPrunedEdges,
          ". The caption and record browser remain bound to the full source."
        ] }),
        visualAvailable && liveForceAvailable && scene !== null ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          KnowledgeGraphVisualBoundary,
          {
            resetToken: view ?? presentation,
            retryToken: visualRetryKey,
            fallback: visualUnavailableStatus,
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              KnowledgeGraphVisualMount,
              {
                renderVisual,
                scene,
                context: hostPolicy
              }
            )
          }
        ) : liveForceAvailable ? visualUnavailableStatus : liveForceLimitStatus,
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          KnowledgeGraphCorpusLegendInternal,
          {
            presentation,
            view,
            themeMode: hostPolicy.themeMode
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          KnowledgeGraphCorpusA11yListInternal,
          {
            presentation,
            view,
            selectedId,
            onSelect,
            query,
            nodePageSize
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          KnowledgeGraphCorpusStaticRecordViewInternal,
          {
            presentation,
            view,
            nodePageSize: recordNodePageSize,
            edgePageSize: recordEdgePageSize
          }
        )
      ]
    }
  );
}

// react/KnowledgeGraph3DScene.tsx
var import_knowledgeGraphPresentation7 = require("#cortexel-knowledge-graph-presentation-capability");
var import_jsx_runtime4 = require("react/jsx-runtime");
var PARTICLES_PER_EDGE = 4;
var GRAPH_DIRECTION_MARKER_PADDING = 2;
var GRAPH_LAYOUT_SETTLED_ALPHA = 8e-3;
var MAX_PARTICLES = MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
var FALLBACK_COLOR = "#64748b";
var MAX_REMEMBERED_POSITIONS = 5e3;
var _dummy = new THREE2.Object3D();
var _color = new THREE2.Color();
var _darkDimTarget = new THREE2.Color("#030711");
var _lightDimTarget = new THREE2.Color("#f8fafc");
var _a = new THREE2.Vector3();
var _b = new THREE2.Vector3();
var _curveControl = new THREE2.Vector3();
var _curvePoint = new THREE2.Vector3();
var _curveNext = new THREE2.Vector3();
var _direction = new THREE2.Vector3();
var _up = new THREE2.Vector3(0, 1, 0);
var _box = new THREE2.Box3();
var _sphere = new THREE2.Sphere();
var _layoutClockResult = { ticks: 0, remainderSeconds: 0 };
var _cameraFitResult = { distance: 0, orthographicZoom: void 0 };
var _cameraClippingResult = { near: 0, far: 0 };
var _perspectiveAutoFrameProjection = {
  kind: "perspective",
  isArrayCamera: false,
  viewEnabled: false,
  parentTransformIdentity: false,
  selfTransformCanonical: false,
  cameraMethodsCanonical: false,
  projectionMethodCanonical: false,
  effectiveFovMethodCanonical: false,
  webGlCoordinateSystem: false,
  fovDegrees: 0,
  aspect: 0,
  zoom: 0,
  near: 0,
  far: 0,
  filmOffset: 0,
  projectionMatrixElements: []
};
var _orthographicAutoFrameProjection = {
  kind: "orthographic",
  isArrayCamera: false,
  viewEnabled: false,
  parentTransformIdentity: false,
  selfTransformCanonical: false,
  cameraMethodsCanonical: false,
  projectionMethodCanonical: false,
  webGlCoordinateSystem: false,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  zoom: 0,
  near: 0,
  far: 0,
  projectionMatrixElements: []
};
var selectCamera = (state) => state.camera;
var selectRenderer = (state) => state.gl;
var selectInvalidate = (state) => state.invalidate;
var disableKnowledgeGraphGlyphRaycast = () => {
};
function devWarn(msg) {
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") {
    return;
  }
  if (typeof console !== "undefined" && console.warn) console.warn(`[cortexel] ${msg}`);
}
function dim(hex, amount, themeMode) {
  _color.set(FALLBACK_COLOR);
  _color.set(hex);
  return _color.lerp(
    themeMode === "light" ? _lightDimTarget : _darkDimTarget,
    amount
  );
}
function FocusLabelSprite({
  spriteRef,
  text,
  color,
  themeMode,
  invalidate
}) {
  const label = safeDiagnosticText(text, 120);
  const materialRef = (0, import_react4.useRef)(null);
  (0, import_react4.useLayoutEffect)(() => {
    const sprite = spriteRef.current;
    const material = materialRef.current;
    if (!sprite || !material) return void 0;
    return installFocusLabelResource({
      sprite,
      material,
      label,
      color,
      themeMode,
      invalidate
    });
  }, [label, color, themeMode, invalidate]);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "sprite",
    {
      ref: spriteRef,
      visible: false,
      frustumCulled: false,
      renderOrder: 1e3,
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "spriteMaterial",
        {
          ref: materialRef,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false
        }
      )
    }
  );
}
function setEdgeCurve(source, target, lane) {
  _a.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
  _b.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
  graphEdgeControlPointInto(_a, _b, lane, _curveControl);
}
function updateKnowledgeGraphGlyphMatrices(glyphMesh, nodeIndexes, simNodes, focus, focusSet) {
  if (glyphMesh === null) return;
  for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
    const node = simNodes[nodeIndexes[glyphIndex]];
    const scale = knowledgeGraphRenderedNodeScale(
      focus !== null && (node.id === focus || focusSet?.has(node.id) === true)
    );
    _dummy.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    _dummy.quaternion.identity();
    _dummy.scale.setScalar(node.r * scale);
    _dummy.updateMatrix();
    glyphMesh.setMatrixAt(glyphIndex, _dummy.matrix);
  }
  glyphMesh.instanceMatrix.needsUpdate = true;
  glyphMesh.boundingSphere = null;
}
function updateKnowledgeGraphGlyphColors(glyphMesh, nodeIndexes, visualNodes, glyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode) {
  if (glyphMesh === null) return;
  for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
    const node = visualNodes[nodeIndexes[glyphIndex]];
    const amount = knowledgeGraphNodeEmphasisDimAmount(
      node.id,
      focus,
      focusSet,
      queryActive,
      queryMatchIds
    );
    glyphMesh.setColorAt(glyphIndex, dim(glyphColor, amount, themeMode));
  }
  if (glyphMesh.instanceColor) glyphMesh.instanceColor.needsUpdate = true;
}
function KnowledgeGraph3DScene(props) {
  (0, import_knowledgeGraphPresentation6.assertPreparedGenericKnowledgeGraphPresentation)(props.presentation);
  if (props.view !== void 0) {
    (0, import_knowledgeGraphPresentation6.assertPreparedKnowledgeGraphView)(props.view, props.presentation);
  }
  const nodes = props.view?.nodes ?? props.presentation.nodes;
  const edges = props.view?.edges ?? props.presentation.edges;
  assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
  return renderKnowledgeGraph3DScene(props);
}
function KnowledgeGraphCorpus3DSceneInternal(props) {
  (0, import_knowledgeGraphPresentation6.assertPreparedCorpusKnowledgeGraphPresentation)(props.presentation);
  if (props.view !== void 0) {
    (0, import_knowledgeGraphPresentation6.assertPreparedKnowledgeGraphView)(props.view, props.presentation);
  }
  const nodes = props.view?.nodes ?? props.presentation.nodes;
  const edges = props.view?.edges ?? props.presentation.edges;
  assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
  return renderKnowledgeGraph3DScene(props);
}
function renderKnowledgeGraph3DScene(props) {
  const { presentation, view, ...interactionProps } = props;
  (0, import_knowledgeGraphPresentation6.assertPreparedKnowledgeGraphPresentation)(presentation);
  if (view !== void 0) (0, import_knowledgeGraphPresentation6.assertPreparedKnowledgeGraphView)(view, presentation);
  const { graphIdentity } = presentation;
  const nodes = view?.nodes ?? presentation.nodes;
  const edges = view?.edges ?? presentation.edges;
  const selectedId = view !== void 0 && props.selectedId !== null && !(0, import_knowledgeGraphPresentation6.knowledgeGraphViewContainsNode)(view, presentation, props.selectedId) ? null : props.selectedId;
  const hoverId = view !== void 0 && props.hoverId !== null && !(0, import_knowledgeGraphPresentation6.knowledgeGraphViewContainsNode)(view, presentation, props.hoverId) ? null : props.hoverId;
  assertKnowledgeGraphIdentity(graphIdentity);
  assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
  assertKnowledgeGraphNodeReference(props.hoverId, "knowledge-graph hover id");
  assertKnowledgeGraphColor(props.labelColor, "knowledge-graph label color");
  assertKnowledgeGraphColor(props.particleColor, "knowledge-graph particle color");
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    KnowledgeGraph3DSceneInstance,
    {
      ...interactionProps,
      selectedId,
      hoverId,
      autoFrame: nodes.length > 0 ? props.autoFrame : false,
      graphIdentity,
      nodes,
      edges
    },
    graphIdentity
  );
}
function KnowledgeGraph3DSceneInstance({
  graphIdentity,
  nodes,
  edges,
  selectedId,
  query,
  onSelect,
  hoverId,
  onHover,
  controlsRef,
  autoFrame = false,
  flyToSelection = false,
  labelColor,
  particleColor,
  themeMode = "dark",
  reducedMotion = false
}) {
  const meshRef = (0, import_react4.useRef)(null);
  const linesRef = (0, import_react4.useRef)(null);
  const particlesRef = (0, import_react4.useRef)(null);
  const arrowsRef = (0, import_react4.useRef)(null);
  const sphereGlyphsRef = (0, import_react4.useRef)(null);
  const boxGlyphsRef = (0, import_react4.useRef)(null);
  const diamondGlyphsRef = (0, import_react4.useRef)(null);
  const labelSpriteRef = (0, import_react4.useRef)(null);
  const sceneGroupRef = (0, import_react4.useRef)(null);
  const camera = (0, import_fiber.useThree)(selectCamera);
  const gl = (0, import_fiber.useThree)(selectRenderer);
  const invalidate = (0, import_fiber.useThree)(selectInvalidate);
  const cameraProjectionKind = knowledgeGraphCameraProjectionKind(camera);
  const perspectiveCamera = camera;
  const orthographicCamera = camera;
  const resolvedLabelColor = labelColor ?? (themeMode === "light" ? "#0f172a" : "#e2e8f0");
  const resolvedParticleColor = particleColor ?? (themeMode === "light" ? "#0369a1" : "#8fd3ff");
  const resolvedGlyphColor = themeMode === "light" ? "#0f172a" : "#f8fafc";
  (0, import_react4.useEffect)(() => {
    if (autoFrame && cameraProjectionKind === null) {
      devWarn(
        "knowledge-graph auto-frame supports only perspective and orthographic cameras"
      );
    }
  }, [autoFrame, cameraProjectionKind]);
  const [posMap] = (0, import_react4.useState)(() => ({
    current: /* @__PURE__ */ new Map()
  }));
  const readyGraphKeyRef = (0, import_react4.useRef)(null);
  const autoFrameStageRef = (0, import_react4.useRef)(0);
  const flyToIdRef = (0, import_react4.useRef)(null);
  const onHoverRef = (0, import_react4.useRef)(onHover);
  const hoverIdRef = (0, import_react4.useRef)(hoverId);
  (0, import_react4.useLayoutEffect)(() => {
    onHoverRef.current = onHover;
    hoverIdRef.current = hoverId;
  }, [onHover, hoverId]);
  (0, import_react4.useEffect)(() => () => {
    if (hoverIdRef.current === null) return;
    hoverIdRef.current = null;
    onHoverRef.current(null);
  }, []);
  const attachedControlsRef = (0, import_react4.useRef)(null);
  const [onUserGrab] = (0, import_react4.useState)(
    () => () => {
      autoFrameStageRef.current = 2;
      flyToIdRef.current = null;
    }
  );
  (0, import_react4.useEffect)(
    () => () => {
      synchronizeKnowledgeGraphControlsListener(
        attachedControlsRef,
        null,
        onUserGrab
      );
    },
    [onUserGrab]
  );
  const layoutInput = (0, import_react4.useMemo)(
    () => snapshotGraphLayoutInputs(nodes, edges),
    [nodes, edges]
  );
  const graphKey = layoutInput.graphKey;
  const normalizedQuery = (0, import_react4.useMemo)(() => normalizeGraphQuery(query), [query]);
  const queryMatchIds = (0, import_react4.useMemo)(
    () => graphQueryMatchIds(nodes, normalizedQuery, edges),
    [nodes, normalizedQuery, edges]
  );
  const queryActive = normalizedQuery.length > 0;
  const visualNodes = (0, import_react4.useMemo)(
    () => nodes.map(({ id: id2, label, color, nodeGlyph }) => ({
      id: id2,
      label,
      color: knowledgeGraphContrastSafeColor(color, themeMode),
      nodeGlyph: nodeGlyph ?? "sphere_outline"
    })),
    [nodes, themeMode]
  );
  const glyphNodeIndexes = (0, import_react4.useMemo)(() => ({
    sphere: visualNodes.flatMap((node, index2) => node.nodeGlyph === "sphere_outline" ? [index2] : []),
    box: visualNodes.flatMap((node, index2) => node.nodeGlyph === "box_shell" ? [index2] : []),
    diamond: visualNodes.flatMap((node, index2) => node.nodeGlyph === "diamond_shell" ? [index2] : [])
  }), [visualNodes]);
  const { layoutNodes, simLinks, validEdges, edgeLanes, index } = (0, import_react4.useMemo)(() => {
    const index2 = /* @__PURE__ */ new Map();
    const layoutNodes2 = layoutInput.nodes.map((n, i) => {
      index2.set(n.id, i);
      return { id: n.id, radius: n.radius };
    });
    const validEdges2 = filterGraphEdges(new Set(index2.keys()), layoutInput.edges);
    const edgeLanes2 = assignGraphEdgeLanes(validEdges2);
    const simLinks2 = uniqueGraphTopologyLinks(validEdges2);
    return { layoutNodes: layoutNodes2, simLinks: simLinks2, validEdges: validEdges2, edgeLanes: edgeLanes2, index: index2 };
  }, [graphKey]);
  const neighbors = (0, import_react4.useMemo)(
    () => buildAdjacency(new Set(index.keys()), validEdges),
    [index, validEdges]
  );
  (0, import_react4.useEffect)(() => {
    if (hoverId == null || !index.has(hoverId)) return;
    const element = gl.domElement;
    const previous = element.style.cursor;
    element.style.cursor = "pointer";
    return () => {
      element.style.cursor = previous;
    };
  }, [gl, hoverId, index]);
  const flowEdges = (0, import_react4.useMemo)(
    () => edgeLanes.filter(({ edge }) => edge.particles),
    [edgeLanes]
  );
  const directedEdges = (0, import_react4.useMemo)(
    () => edgeLanes.filter(({ edge }) => edge.directed !== false),
    [edgeLanes]
  );
  const edgeDisplayColors = (0, import_react4.useMemo)(
    () => validEdges.map((edge) => knowledgeGraphContrastSafeColor(edge.color, themeMode)),
    [validEdges, themeMode]
  );
  const particleDistribution = (0, import_react4.useMemo)(
    () => planFlowParticleDistribution(
      flowEdges.length,
      PARTICLES_PER_EDGE,
      MAX_PARTICLES
    ),
    [flowEdges.length]
  );
  const particleCount = particleDistribution.total;
  (0, import_react4.useEffect)(() => {
    if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) {
      devWarn(
        `KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ${MAX_PARTICLES}-particle cap at four markers each; marker density is reduced evenly and every flow edge retains at least one marker.`
      );
    }
  }, [flowEdges.length]);
  const visibleLineSegmentCount = (0, import_react4.useMemo)(
    () => validEdges.reduce((count, edge) => {
      let visible = 0;
      for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
        if (knowledgeGraphEdgeStrokeSegmentVisible(
          edge.edgeStrokePattern ?? "solid",
          chord,
          GRAPH_EDGE_CURVE_SEGMENTS
        )) visible++;
      }
      return count + visible;
    }, 0),
    [validEdges]
  );
  const linePos = (0, import_react4.useMemo)(
    () => new Float32Array(visibleLineSegmentCount * 6),
    [visibleLineSegmentCount]
  );
  const lineCol = (0, import_react4.useMemo)(
    () => new Float32Array(visibleLineSegmentCount * 6),
    [visibleLineSegmentCount]
  );
  (0, import_react4.useLayoutEffect)(() => {
    meshRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    sphereGlyphsRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    boxGlyphsRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    diamondGlyphsRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    arrowsRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    particlesRef.current?.instanceMatrix.setUsage(THREE2.DynamicDrawUsage);
    const position = linesRef.current?.geometry.getAttribute("position");
    if (position instanceof THREE2.BufferAttribute) {
      position.setUsage(THREE2.DynamicDrawUsage);
    }
  }, [
    linePos,
    nodes.length,
    directedEdges.length,
    particleCount,
    glyphNodeIndexes.sphere.length,
    glyphNodeIndexes.box.length,
    glyphNodeIndexes.diamond.length
  ]);
  const layoutRuntimeRef = (0, import_react4.useRef)(null);
  const layoutTickAccumulatorRef = (0, import_react4.useRef)(0);
  const geometryDirtyRef = (0, import_react4.useRef)(true);
  const flowPhaseRef = (0, import_react4.useRef)(0);
  (0, import_react4.useEffect)(() => {
    const plan = planGraphLayoutCache(
      layoutNodes,
      posMap.current,
      MAX_REMEMBERED_POSITIONS
    );
    const simNodes = plan.nodes;
    const runtimeLinks = simLinks.map(({ source, target }) => ({ source, target }));
    const linkForce = (0, import_d3_force_3d.forceLink)(runtimeLinks).id((d) => d.id).distance(34).strength(0.35);
    const sim = (0, import_d3_force_3d.forceSimulation)(simNodes, 3).force("charge", (0, import_d3_force_3d.forceManyBody)().strength(-140).distanceMax(600)).force("link", linkForce).force("center", (0, import_d3_force_3d.forceCenter)(0, 0, 0).strength(0.04)).force("collide", (0, import_d3_force_3d.forceCollide)((d) => {
      const node = d;
      const visualNode = visualNodes[index.get(node.id)];
      return knowledgeGraphRenderedNodeRadialExtent(
        node.r,
        visualNode.nodeGlyph,
        true
      ) + 3;
    }).iterations(2)).alpha(plan.warmStart ? 0.5 : 1).alphaDecay(0.018).velocityDecay(0.42).stop();
    if (reducedMotion) {
      const budget = reducedMotionLayoutTickBudget(simNodes.length, simLinks.length);
      for (let i = 0; i < budget && sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA; i++) sim.tick();
      sim.alpha(0);
    }
    const runtime = {
      graphKey,
      reducedMotion,
      sim,
      nodes: simNodes,
      cacheBuffers: plan.cacheBuffers,
      nextCacheBufferIndex: 0
    };
    layoutRuntimeRef.current = runtime;
    layoutTickAccumulatorRef.current = 0;
    geometryDirtyRef.current = true;
    invalidate();
    return () => {
      sim.stop();
      if (layoutRuntimeRef.current === runtime) layoutRuntimeRef.current = null;
    };
  }, [
    graphKey,
    layoutNodes,
    simLinks,
    visualNodes,
    index,
    reducedMotion,
    invalidate
  ]);
  (0, import_react4.useLayoutEffect)(() => {
    beginKnowledgeGraphRuntimeTransition(
      readyGraphKeyRef,
      geometryDirtyRef,
      sceneGroupRef.current,
      invalidate,
      () => {
        if (hoverIdRef.current === null) return;
        hoverIdRef.current = null;
        onHoverRef.current(null);
      }
    );
  }, [graphKey, reducedMotion, invalidate]);
  const applyEmphasis = (0, import_react4.useCallback)(() => {
    const mesh = meshRef.current;
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusSet = focus ? neighbors.get(focus) : null;
    if (mesh) {
      visualNodes.forEach((n, i) => {
        mesh.setColorAt(i, dim(
          n.color,
          knowledgeGraphNodeEmphasisDimAmount(
            n.id,
            focus,
            focusSet,
            queryActive,
            queryMatchIds
          ),
          themeMode
        ));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    updateKnowledgeGraphGlyphColors(
      sphereGlyphsRef.current,
      glyphNodeIndexes.sphere,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode
    );
    updateKnowledgeGraphGlyphColors(
      boxGlyphsRef.current,
      glyphNodeIndexes.box,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode
    );
    updateKnowledgeGraphGlyphColors(
      diamondGlyphsRef.current,
      glyphNodeIndexes.diamond,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode
    );
    let k = 0;
    for (let edgeIndex = 0; edgeIndex < validEdges.length; edgeIndex++) {
      const e = validEdges[edgeIndex];
      const incident = focus ? e.source === focus || e.target === focus : graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
      const c = dim(
        edgeDisplayColors[edgeIndex],
        focus === null && !queryActive ? 0 : incident ? 0 : 0.86,
        themeMode
      );
      for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
        if (!knowledgeGraphEdgeStrokeSegmentVisible(
          e.edgeStrokePattern ?? "solid",
          chord,
          GRAPH_EDGE_CURVE_SEGMENTS
        )) continue;
        lineCol[k] = c.r;
        lineCol[k + 1] = c.g;
        lineCol[k + 2] = c.b;
        lineCol[k + 3] = c.r;
        lineCol[k + 4] = c.g;
        lineCol[k + 5] = c.b;
        k += 6;
      }
    }
    const geom = linesRef.current?.geometry;
    const attr = geom?.getAttribute("color");
    if (attr) attr.needsUpdate = true;
    const arrows = arrowsRef.current;
    if (arrows) {
      directedEdges.forEach(({ edge }, arrowIndex) => {
        const incident = focus ? edge.source === focus || edge.target === focus : graphEdgeMatchesQuery(
          edge.source,
          edge.target,
          queryMatchIds,
          normalizedQuery
        );
        arrows.setColorAt(
          arrowIndex,
          dim(
            edgeDisplayColors[directedEdges[arrowIndex].edgeIndex],
            focus === null && !queryActive ? 0 : incident ? 0 : 0.86,
            themeMode
          )
        );
      });
      if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
    }
  }, [
    visualNodes,
    glyphNodeIndexes,
    resolvedGlyphColor,
    validEdges,
    directedEdges,
    index,
    neighbors,
    hoverId,
    selectedId,
    queryActive,
    queryMatchIds,
    normalizedQuery,
    lineCol,
    edgeDisplayColors,
    themeMode
  ]);
  (0, import_react4.useLayoutEffect)(() => {
    applyEmphasis();
    geometryDirtyRef.current = true;
    invalidate();
  }, [applyEmphasis, invalidate]);
  (0, import_react4.useEffect)(() => {
    flyToIdRef.current = flyToSelection && selectedId && index.has(selectedId) ? selectedId : null;
    if (flyToIdRef.current) {
      autoFrameStageRef.current = 2;
      invalidate();
    }
  }, [graphIdentity, selectedId, index, flyToSelection, invalidate]);
  (0, import_fiber.useFrame)((_, delta) => {
    const runtime = layoutRuntimeRef.current;
    const mesh = meshRef.current;
    const controls = controlsRef?.current ?? null;
    synchronizeKnowledgeGraphControlsListener(
      attachedControlsRef,
      controls,
      onUserGrab
    );
    if (!runtime || runtime.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion || !mesh) return;
    const sim = runtime.sim;
    const simNodes = runtime.nodes;
    let positionsChanged = geometryDirtyRef.current;
    if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA) {
      const advanced = advanceGraphLayoutClockInto(
        layoutTickAccumulatorRef.current,
        delta,
        _layoutClockResult
      );
      layoutTickAccumulatorRef.current = advanced.remainderSeconds;
      for (let tick = 0; tick < advanced.ticks && sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA; tick++) {
        sim.tick();
        positionsChanged = true;
      }
    } else {
      layoutTickAccumulatorRef.current = 0;
    }
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusSet = focus ? neighbors.get(focus) : null;
    const completedCacheBufferIndex = runtime.nextCacheBufferIndex;
    if (positionsChanged) {
      geometryDirtyRef.current = true;
      const sceneGroup = sceneGroupRef.current;
      if (sceneGroup) sceneGroup.visible = false;
      const positionSlots = runtime.cacheBuffers[completedCacheBufferIndex].positionSlots;
      _dummy.quaternion.identity();
      for (let i = 0; i < simNodes.length; i++) {
        const n = simNodes[i];
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        const z5 = n.z ?? 0;
        const remembered = positionSlots[i];
        remembered[0] = x;
        remembered[1] = y;
        remembered[2] = z5;
        _dummy.position.set(x, y, z5);
        const pop = knowledgeGraphRenderedNodeScale(
          focus !== null && (n.id === focus || focusSet?.has(n.id) === true)
        );
        _dummy.scale.setScalar(n.r * pop);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.boundingSphere = null;
      updateKnowledgeGraphGlyphMatrices(
        sphereGlyphsRef.current,
        glyphNodeIndexes.sphere,
        simNodes,
        focus,
        focusSet
      );
      updateKnowledgeGraphGlyphMatrices(
        boxGlyphsRef.current,
        glyphNodeIndexes.box,
        simNodes,
        focus,
        focusSet
      );
      updateKnowledgeGraphGlyphMatrices(
        diamondGlyphsRef.current,
        glyphNodeIndexes.diamond,
        simNodes,
        focus,
        focusSet
      );
      let k = 0;
      for (let edgeIndex = 0; edgeIndex < edgeLanes.length; edgeIndex++) {
        const lane = edgeLanes[edgeIndex];
        const e = lane.edge;
        const s = simNodes[index.get(e.source)];
        const t = simNodes[index.get(e.target)];
        setEdgeCurve(s, t, lane);
        _curvePoint.copy(_a);
        for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
          graphEdgeCurvePointInto(
            _a,
            _curveControl,
            _b,
            (chord + 1) / GRAPH_EDGE_CURVE_SEGMENTS,
            _curveNext
          );
          const chordVisible = knowledgeGraphEdgeStrokeSegmentVisible(
            e.edgeStrokePattern ?? "solid",
            chord,
            GRAPH_EDGE_CURVE_SEGMENTS
          );
          if (chordVisible) {
            linePos[k] = _curvePoint.x;
            linePos[k + 1] = _curvePoint.y;
            linePos[k + 2] = _curvePoint.z;
            linePos[k + 3] = _curveNext.x;
            linePos[k + 4] = _curveNext.y;
            linePos[k + 5] = _curveNext.z;
            k += 6;
          }
          _curvePoint.copy(_curveNext);
        }
      }
      const posAttr = linesRef.current?.geometry.getAttribute("position");
      if (posAttr) posAttr.needsUpdate = true;
      const arrows = arrowsRef.current;
      if (arrows) {
        for (let i = 0; i < directedEdges.length; i++) {
          const lane = directedEdges[i];
          const edge = lane.edge;
          const source = simNodes[index.get(edge.source)];
          const targetIndex = index.get(edge.target);
          const target = simNodes[targetIndex];
          setEdgeCurve(source, target, lane);
          const targetExtent = knowledgeGraphRenderedNodeRadialExtent(
            target.r,
            visualNodes[targetIndex].nodeGlyph,
            focus !== null && (target.id === focus || focusSet?.has(target.id) === true)
          );
          if (!graphEdgeTargetBoundaryInto(
            _a,
            _curveControl,
            _b,
            targetExtent,
            _curveNext,
            _direction
          )) {
            _dummy.position.copy(_b);
            _dummy.quaternion.identity();
            _dummy.scale.setScalar(0);
          } else {
            _dummy.position.copy(_curveNext).addScaledVector(
              _direction,
              -KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH / 2
            );
            _dummy.quaternion.setFromUnitVectors(_up, _direction);
            _dummy.scale.set(
              1.25,
              KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH,
              1.25
            );
          }
          _dummy.updateMatrix();
          arrows.setMatrixAt(i, _dummy.matrix);
        }
        arrows.instanceMatrix.needsUpdate = true;
        arrows.boundingSphere = null;
      }
    }
    const pmesh = particlesRef.current;
    if (pmesh && particleCount > 0 && (positionsChanged || !reducedMotion)) {
      _dummy.quaternion.identity();
      if (!reducedMotion) {
        flowPhaseRef.current = advanceKnowledgeGraphFlowPhase(
          flowPhaseRef.current,
          delta
        );
      }
      const base = reducedMotion ? 0 : flowPhaseRef.current;
      let p = 0;
      for (let fe = 0; fe < flowEdges.length && p < particleCount; fe++) {
        const lane = flowEdges[fe];
        const e = lane.edge;
        const s = simNodes[index.get(e.source)];
        const t = simNodes[index.get(e.target)];
        setEdgeCurve(s, t, lane);
        const queryIncident = graphEdgeMatchesQuery(
          e.source,
          e.target,
          queryMatchIds,
          normalizedQuery
        );
        let size = 1.3;
        if (focus) {
          if (e.source !== focus && e.target !== focus) size = 0;
        } else if (!queryIncident) {
          size = 0;
        }
        const phase = fe * 0.618034;
        const edgeParticleCount = particleDistribution.basePerEdge + (fe < particleDistribution.extraEdgeCount ? 1 : 0);
        for (let q = 0; q < edgeParticleCount && p < particleCount; q++) {
          const frac = reducedMotion ? reducedMotionFlowParticleFraction(q, edgeParticleCount) : (base + phase + q / edgeParticleCount) % 1;
          graphEdgeCurvePointInto(_a, _curveControl, _b, frac, _dummy.position);
          _dummy.scale.setScalar(size);
          _dummy.updateMatrix();
          pmesh.setMatrixAt(p, _dummy.matrix);
          p++;
        }
      }
      pmesh.instanceMatrix.needsUpdate = true;
    }
    const label = labelSpriteRef.current;
    if (label) {
      const fi = focus != null ? index.get(focus) : void 0;
      if (fi != null) {
        const n = simNodes[fi];
        label.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        label.center.set(
          0.5,
          knowledgeGraphFocusLabelSpriteCenterY(
            n.r,
            visualNodes[fi].nodeGlyph
          )
        );
        label.visible = true;
      } else {
        label.visible = false;
      }
    }
    const layoutSettled = sim.alpha() <= GRAPH_LAYOUT_SETTLED_ALPHA;
    if (autoFrame && autoFrameStageRef.current < 2 && (autoFrameStageRef.current === 0 || layoutSettled) && simNodes.length > 0 && cameraProjectionKind !== null) {
      const cameraParentIdentity = isKnowledgeGraphCameraParentChainIdentity(
        camera.parent
      );
      const cameraSelfTransformCanonical = isKnowledgeGraphCameraSelfTransformCanonical(camera);
      const cameraMethodsCanonical = camera.getWorldDirection === THREE2.Camera.prototype.getWorldDirection && camera.lookAt === THREE2.Object3D.prototype.lookAt && camera.updateMatrixWorld === THREE2.Camera.prototype.updateMatrixWorld && camera.updateWorldMatrix === THREE2.Camera.prototype.updateWorldMatrix;
      let centeredProjectionSupported = false;
      if (cameraProjectionKind === "perspective") {
        _perspectiveAutoFrameProjection.isArrayCamera = camera.isArrayCamera === true;
        _perspectiveAutoFrameProjection.viewEnabled = perspectiveCamera.view?.enabled === true;
        _perspectiveAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
        _perspectiveAutoFrameProjection.selfTransformCanonical = cameraSelfTransformCanonical;
        _perspectiveAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
        _perspectiveAutoFrameProjection.projectionMethodCanonical = camera.updateProjectionMatrix === THREE2.PerspectiveCamera.prototype.updateProjectionMatrix;
        _perspectiveAutoFrameProjection.effectiveFovMethodCanonical = perspectiveCamera.getEffectiveFOV === THREE2.PerspectiveCamera.prototype.getEffectiveFOV;
        _perspectiveAutoFrameProjection.webGlCoordinateSystem = camera.coordinateSystem === THREE2.WebGLCoordinateSystem;
        _perspectiveAutoFrameProjection.fovDegrees = perspectiveCamera.fov;
        _perspectiveAutoFrameProjection.aspect = perspectiveCamera.aspect;
        _perspectiveAutoFrameProjection.zoom = perspectiveCamera.zoom;
        _perspectiveAutoFrameProjection.near = perspectiveCamera.near;
        _perspectiveAutoFrameProjection.far = perspectiveCamera.far;
        _perspectiveAutoFrameProjection.filmOffset = perspectiveCamera.filmOffset;
        _perspectiveAutoFrameProjection.projectionMatrixElements = perspectiveCamera.projectionMatrix.elements;
        centeredProjectionSupported = isKnowledgeGraphCenteredAutoFrameProjectionSupported(
          _perspectiveAutoFrameProjection
        );
      } else {
        _orthographicAutoFrameProjection.isArrayCamera = camera.isArrayCamera === true;
        _orthographicAutoFrameProjection.viewEnabled = orthographicCamera.view?.enabled === true;
        _orthographicAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
        _orthographicAutoFrameProjection.selfTransformCanonical = cameraSelfTransformCanonical;
        _orthographicAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
        _orthographicAutoFrameProjection.projectionMethodCanonical = camera.updateProjectionMatrix === THREE2.OrthographicCamera.prototype.updateProjectionMatrix;
        _orthographicAutoFrameProjection.webGlCoordinateSystem = camera.coordinateSystem === THREE2.WebGLCoordinateSystem;
        _orthographicAutoFrameProjection.left = orthographicCamera.left;
        _orthographicAutoFrameProjection.right = orthographicCamera.right;
        _orthographicAutoFrameProjection.top = orthographicCamera.top;
        _orthographicAutoFrameProjection.bottom = orthographicCamera.bottom;
        _orthographicAutoFrameProjection.zoom = orthographicCamera.zoom;
        _orthographicAutoFrameProjection.near = orthographicCamera.near;
        _orthographicAutoFrameProjection.far = orthographicCamera.far;
        _orthographicAutoFrameProjection.projectionMatrixElements = orthographicCamera.projectionMatrix.elements;
        centeredProjectionSupported = isKnowledgeGraphCenteredAutoFrameProjectionSupported(
          _orthographicAutoFrameProjection
        );
      }
      const perspectiveFov = centeredProjectionSupported && cameraProjectionKind === "perspective" ? perspectiveCamera.getEffectiveFOV() : 0;
      const horizontalSpan = cameraProjectionKind === "orthographic" ? Math.abs(orthographicCamera.right - orthographicCamera.left) : 0;
      const verticalSpan = cameraProjectionKind === "orthographic" ? Math.abs(orthographicCamera.top - orthographicCamera.bottom) : 0;
      const projectionReady = centeredProjectionSupported && (cameraProjectionKind === "perspective" ? isKnowledgeGraphPerspectiveProjectionReady(
        perspectiveFov,
        perspectiveCamera.aspect
      ) : isKnowledgeGraphOrthographicProjectionReady(
        horizontalSpan,
        verticalSpan,
        orthographicCamera.zoom
      ));
      const cameraPositionReady = isKnowledgeGraphCameraVectorFinite(
        camera.position.x,
        camera.position.y,
        camera.position.z
      );
      const controlsTargetReady = controls === null || isKnowledgeGraphCameraVectorFinite(
        controls.target.x,
        controls.target.y,
        controls.target.z
      );
      if (projectionReady && cameraPositionReady && controlsTargetReady) {
        _box.makeEmpty();
        for (let nodeIndex = 0; nodeIndex < simNodes.length; nodeIndex++) {
          const n = simNodes[nodeIndex];
          const glyph = visualNodes[nodeIndex].nodeGlyph;
          const radius = knowledgeGraphAutoFrameNodeRadialExtent(
            n.r,
            glyph,
            visualNodes[nodeIndex].id === focus
          );
          _box.expandByPoint(_a.set(
            (n.x ?? 0) - radius,
            (n.y ?? 0) - radius,
            (n.z ?? 0) - radius
          ));
          _box.expandByPoint(_b.set(
            (n.x ?? 0) + radius,
            (n.y ?? 0) + radius,
            (n.z ?? 0) + radius
          ));
        }
        if (validEdges.length > 0) {
          _box.expandByScalar(
            MAX_GRAPH_EDGE_LANE_OFFSET + GRAPH_DIRECTION_MARKER_PADDING
          );
        }
        const sphere = _box.getBoundingSphere(_sphere);
        const currentDistance = controls ? camera.position.distanceTo(controls.target) : camera.position.distanceTo(sphere.center);
        if (controls && camera.position.distanceToSquared(controls.target) > 1e-12) {
          _direction.copy(camera.position).sub(controls.target).normalize();
        } else {
          camera.getWorldDirection(_direction).multiplyScalar(-1);
        }
        const directionReady = isKnowledgeGraphCameraVectorFinite(
          _direction.x,
          _direction.y,
          _direction.z
        );
        if (directionReady) {
          if (_direction.lengthSq() <= 1e-12) _direction.set(0, 0, 1);
          else _direction.normalize();
          const fit = cameraProjectionKind === "orthographic" ? planKnowledgeGraphOrthographicCameraFitInto(
            sphere.radius,
            currentDistance,
            horizontalSpan,
            verticalSpan,
            orthographicCamera.zoom,
            _cameraFitResult
          ) : planKnowledgeGraphPerspectiveCameraFitInto(
            sphere.radius,
            currentDistance,
            perspectiveFov,
            perspectiveCamera.aspect,
            _cameraFitResult
          );
          camera.position.copy(sphere.center).addScaledVector(_direction, fit.distance);
          if (cameraProjectionKind === "orthographic" && fit.orthographicZoom !== void 0) {
            orthographicCamera.zoom = fit.orthographicZoom;
          }
          const projected = camera;
          const clipping = planKnowledgeGraphCameraClippingInto(
            cameraProjectionKind,
            projected.near,
            projected.far,
            fit.distance,
            sphere.radius,
            _cameraClippingResult
          );
          projected.near = clipping.near;
          projected.far = clipping.far;
          projected.updateProjectionMatrix();
          if (controls) {
            controls.target.copy(sphere.center);
            controls.update();
          } else {
            camera.lookAt(sphere.center);
            camera.updateMatrixWorld();
          }
          autoFrameStageRef.current = layoutSettled ? 2 : 1;
        }
      }
    }
    if (flyToIdRef.current) {
      const fi = index.get(flyToIdRef.current);
      if (fi == null) {
        flyToIdRef.current = null;
      } else if (controls) {
        const n = simNodes[fi];
        _a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        controls.target.lerp(_a, graphCameraTargetDamping(delta, reducedMotion));
        controls.update();
        if (controls.target.distanceTo(_a) < 0.5) flyToIdRef.current = null;
      } else {
        flyToIdRef.current = null;
      }
    }
    if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA || !reducedMotion && particleCount > 0 || flyToIdRef.current !== null) {
      invalidate();
    }
    if (positionsChanged) {
      publishGraphLayoutCache(posMap, runtime, completedCacheBufferIndex);
      geometryDirtyRef.current = false;
      readyGraphKeyRef.current = graphKey;
      const group = sceneGroupRef.current;
      if (group) group.visible = true;
    }
  });
  const focusLabelId = hoverId ?? selectedId;
  const focusLabelIndex = focusLabelId != null && index.has(focusLabelId) ? index.get(focusLabelId) : void 0;
  const focusLabel = focusLabelIndex == null ? "" : visualNodes[focusLabelIndex]?.label ?? "";
  const handleMove = (0, import_react4.useCallback)(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      if (readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion) return;
      if (!isKnowledgeGraphInstanceId(e.instanceId, visualNodes.length)) return;
      e.stopPropagation();
      const id2 = visualNodes[e.instanceId].id;
      if (id2 !== hoverIdRef.current) {
        hoverIdRef.current = id2;
        onHoverRef.current(id2);
      }
    },
    [graphKey, reducedMotion, visualNodes]
  );
  const handleOut = (0, import_react4.useCallback)(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion);
      handleKnowledgeGraphPointerOut(
        ready,
        () => e.stopPropagation(),
        () => {
          if (hoverIdRef.current === null) return;
          hoverIdRef.current = null;
          onHoverRef.current(null);
        }
      );
    },
    [graphKey, reducedMotion]
  );
  const handleClick = (0, import_react4.useCallback)(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion);
      handleKnowledgeGraphNodeClick(
        ready,
        e.instanceId,
        visualNodes.length,
        e.delta,
        () => e.stopPropagation(),
        (instanceId) => {
          const id2 = visualNodes[instanceId].id;
          onSelect(toggledKnowledgeGraphSelection(selectedId, id2));
        }
      );
    },
    [graphKey, reducedMotion, visualNodes, onSelect, selectedId]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_jsx_runtime4.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("group", { ref: sceneGroupRef, visible: false, children: [
    nodes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "instancedMesh",
      {
        ref: meshRef,
        args: [void 0, void 0, nodes.length],
        frustumCulled: false,
        onPointerMove: handleMove,
        onPointerOut: handleOut,
        onClick: handleClick,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("sphereGeometry", { args: [1, 20, 20] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `nodes-${nodes.length}`
    ) : null,
    glyphNodeIndexes.sphere.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "instancedMesh",
      {
        ref: sphereGlyphsRef,
        args: [void 0, void 0, glyphNodeIndexes.sphere.length],
        frustumCulled: false,
        raycast: disableKnowledgeGraphGlyphRaycast,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("sphereGeometry", { args: [
            KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.sphere_outline,
            12,
            12
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "meshBasicMaterial",
            {
              color: "#ffffff",
              wireframe: true,
              toneMapped: false
            }
          )
        ]
      }
    ) : null,
    glyphNodeIndexes.box.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "instancedMesh",
      {
        ref: boxGlyphsRef,
        args: [void 0, void 0, glyphNodeIndexes.box.length],
        frustumCulled: false,
        raycast: disableKnowledgeGraphGlyphRaycast,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("boxGeometry", { args: [
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            1,
            1,
            1
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "meshBasicMaterial",
            {
              color: "#ffffff",
              wireframe: true,
              toneMapped: false
            }
          )
        ]
      }
    ) : null,
    glyphNodeIndexes.diamond.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "instancedMesh",
      {
        ref: diamondGlyphsRef,
        args: [void 0, void 0, glyphNodeIndexes.diamond.length],
        frustumCulled: false,
        raycast: disableKnowledgeGraphGlyphRaycast,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("octahedronGeometry", { args: [
            KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell,
            0
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "meshBasicMaterial",
            {
              color: "#ffffff",
              wireframe: true,
              toneMapped: false
            }
          )
        ]
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("lineSegments", { ref: linesRef, frustumCulled: false, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("bufferGeometry", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("bufferAttribute", { attach: "attributes-position", args: [linePos, 3] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("bufferAttribute", { attach: "attributes-color", args: [lineCol, 3] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "lineBasicMaterial",
        {
          vertexColors: true,
          toneMapped: false,
          depthWrite: false,
          blending: THREE2.NormalBlending
        }
      )
    ] }, `lines-${validEdges.length}`),
    directedEdges.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "instancedMesh",
      {
        ref: arrowsRef,
        args: [void 0, void 0, directedEdges.length],
        frustumCulled: false,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("coneGeometry", { args: [1, 1, 8] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `arrows-${directedEdges.length}`
    ) : null,
    particleCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "instancedMesh",
      {
        ref: particlesRef,
        args: [void 0, void 0, particleCount],
        frustumCulled: false,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("sphereGeometry", { args: [0.6, 6, 6] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "meshBasicMaterial",
            {
              color: resolvedParticleColor,
              toneMapped: false,
              transparent: true,
              opacity: 0.9,
              depthWrite: false,
              blending: themeMode === "light" ? THREE2.NormalBlending : THREE2.AdditiveBlending
            }
          )
        ]
      },
      `p-${particleCount}`
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      FocusLabelSprite,
      {
        spriteRef: labelSpriteRef,
        text: focusLabel,
        color: resolvedLabelColor,
        themeMode,
        invalidate
      }
    )
  ] }, `graph-${graphKey}`) });
}

// react/knowledgeGraphPublic.ts
var import_knowledgeGraphPresentation8 = require("#cortexel-knowledge-graph-presentation-capability");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CORPUS_GRAPH_RADIUS_MEANING,
  DEFAULT_A11Y_NODE_PAGE_SIZE,
  DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS,
  GRAPH_LAYOUT_TICK_SECONDS,
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  KnowledgeGraph3DScene,
  KnowledgeGraphA11yList,
  KnowledgeGraphAccessibleFigure,
  KnowledgeGraphLegend,
  KnowledgeGraphPresentationJsonError,
  KnowledgeGraphStaticRecordView,
  MAX_A11Y_NODE_PAGE_SIZE,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  advanceGraphLayoutClock,
  advanceGraphLayoutClockInto,
  assertKnowledgeGraphIdentity,
  assertKnowledgeGraphLiveForceBudget,
  assertKnowledgeGraphPresentationBudget,
  assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView,
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  assignGraphEdgeLanes,
  buildAdjacency,
  corpusGraphInstanceIdentity,
  corpusGraphRadiusMeaning,
  defaultEdgeStyles,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  graphCameraTargetDamping,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphEdgeTargetBoundaryInto,
  graphQueryMatchIds,
  graphSignature,
  isKnowledgeGraphLiveForceWithinBudget,
  isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView,
  knowledgeGraphLiveForceAvailability,
  knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode,
  matchesGraphQuery,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
  parseKnowledgeGraphPresentationJson,
  prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson,
  prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView,
  reducedMotionLayoutTickBudget,
  serializePreparedKnowledgeGraphPresentation,
  uniqueGraphTopologyLinks
});
//# sourceMappingURL=knowledge-graph.cjs.map