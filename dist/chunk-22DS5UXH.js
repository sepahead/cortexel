import {
  CORPUS_EDGE_STROKE_PATTERN_BY_KIND,
  CORPUS_NODE_GLYPH_BY_KIND,
  KNOWLEDGE_GRAPH_BACKGROUND_COLORS,
  canonicalGraphNodePair,
  deriveKnowledgeGraphContextIdentity,
  graphEdgeIdentityKey
} from "./chunk-VINPKPR3.js";
import {
  KnowledgeGraph3DParamsSchema,
  SEMANTIC_PALETTE_KEYS,
  getPalette,
  validatePalette,
  validateSpec
} from "./chunk-FFYJVPAY.js";
import {
  KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS,
  KNOWLEDGE_GRAPH_LIMITS,
  formatValidationIssues,
  safeDiagnosticText,
  safeErrorMessage
} from "./chunk-VSZKJBXV.js";
import {
  parseJsonStrict
} from "./chunk-EVZW37W7.js";

// react/knowledgeGraph.ts
import {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  prepareCorpusKnowledgeGraphPresentation
} from "#cortexel-knowledge-graph-presentation-capability";
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
    const id = nodes[index].id;
    if (ids.has(id)) {
      throw new Error(`knowledge graph node id is duplicated at index ${index}`);
    }
    ids.add(id);
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
  const id = hasId ? idOrLabel : "";
  const label = hasId ? labelOrKind : idOrLabel;
  const kind = hasId ? kindOrQuery : labelOrKind;
  const normalizedQuery = hasId ? maybeNormalizedQuery : kindOrQuery;
  return normalizedQuery.length === 0 || id.toLowerCase().includes(normalizedQuery) || label.toLowerCase().includes(normalizedQuery) || kind.toLowerCase().includes(normalizedQuery);
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
  const record = value;
  const keys = Object.keys(record);
  const count = Math.min(keys.length, MAX_GRAPH_SEARCH_RECORD_KEYS);
  for (let index = 0; index < count; index++) {
    const key = keys[index];
    if (key.toLowerCase().includes(normalizedQuery) || graphMetadataMatchesQuery(record[key], normalizedQuery, depth + 1)) {
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
  for (const id of ids) m.set(id, /* @__PURE__ */ new Set());
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
var HEX_COLOR = /^#[0-9a-f]{6}$/iu;
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
  if (typeof value !== "string" || !HEX_COLOR.test(value)) {
    throw new TypeError(`${label} must be an exact #rrggbb hex color`);
  }
  return value.toLowerCase();
}
function colorOverrides(value, label, allowedKeys) {
  if (value === void 0) return {};
  const record = ownDataRecord(value, label, allowedKeys);
  const result = {};
  for (const [key, color] of Object.entries(record)) {
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
    const id = "id" in e && typeof e.id === "string" ? e.id : void 0;
    return {
      ...id === void 0 ? {} : { id },
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
  return prepareCorpusKnowledgeGraphPresentation({
    contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
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

// react/knowledgeGraphFigure.ts
import {
  prepareKnowledgeGraphView
} from "#cortexel-knowledge-graph-presentation-capability";
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
      view = options.viewPolicy === void 0 ? void 0 : prepareKnowledgeGraphView(presentation, options.viewPolicy);
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

export {
  MAX_GRAPH_QUERY_LENGTH,
  DEFAULT_GRAPH_NODE_RADIUS,
  MAX_GRAPH_NODE_RADIUS,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  MAX_GRAPH_PARALLEL_EDGES,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  corpusGraphRadiusMeaning,
  CORPUS_GRAPH_RADIUS_MEANING,
  assertKnowledgeGraphPresentationBudget,
  isKnowledgeGraphLiveForceWithinBudget,
  assertKnowledgeGraphLiveForceBudget,
  knowledgeGraphLiveForceAvailability,
  assertKnowledgeGraphIdentity,
  assertUniqueGraphNodeIds,
  assertRenderableGraphEdges,
  reducedMotionLayoutTickBudget,
  graphCameraTargetDamping,
  normalizeGraphQuery,
  matchesGraphQuery,
  graphQueryMatchIds,
  graphEdgeMatchesQuery,
  GRAPH_LAYOUT_TICK_SECONDS,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  advanceGraphLayoutClockInto,
  advanceGraphLayoutClock,
  normalizeGraphNodeRadius,
  filterGraphEdges,
  assignGraphEdgeLanes,
  uniqueGraphTopologyLinks,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS,
  graphEdgeTargetBoundaryInto,
  buildAdjacency,
  flowParticleCount,
  graphSignature,
  defaultNodeColors,
  defaultEdgeStyles,
  corpusGraphInstanceIdentity,
  prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson
};
//# sourceMappingURL=chunk-22DS5UXH.js.map