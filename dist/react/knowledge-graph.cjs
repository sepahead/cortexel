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

// react/KnowledgeGraph3DScene.tsx
var KnowledgeGraph3DScene_exports = {};
__export(KnowledgeGraph3DScene_exports, {
  CORPUS_GRAPH_RADIUS_MEANING: () => CORPUS_GRAPH_RADIUS_MEANING,
  DEFAULT_A11Y_NODE_PAGE_SIZE: () => DEFAULT_A11Y_NODE_PAGE_SIZE,
  DEFAULT_GRAPH_NODE_RADIUS: () => DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_EDGE_CURVE_SEGMENTS: () => GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING: () => GRAPH_EDGE_LANE_SPACING,
  GRAPH_LAYOUT_TICK_SECONDS: () => GRAPH_LAYOUT_TICK_SECONDS,
  KnowledgeGraph3DScene: () => KnowledgeGraph3DScene,
  KnowledgeGraphA11yList: () => KnowledgeGraphA11yList,
  KnowledgeGraphLegend: () => KnowledgeGraphLegend,
  MAX_A11Y_NODE_PAGE_SIZE: () => MAX_A11Y_NODE_PAGE_SIZE,
  MAX_GRAPH_EDGE_LANE_OFFSET: () => MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME: () => MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS: () => MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES: () => MAX_GRAPH_PARALLEL_EDGES,
  MAX_GRAPH_QUERY_LENGTH: () => MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_SCENE_EDGES: () => MAX_KNOWLEDGE_GRAPH_SCENE_EDGES,
  MAX_KNOWLEDGE_GRAPH_SCENE_NODES: () => MAX_KNOWLEDGE_GRAPH_SCENE_NODES,
  advanceGraphLayoutClock: () => advanceGraphLayoutClock,
  advanceGraphLayoutClockInto: () => advanceGraphLayoutClockInto,
  assertKnowledgeGraphBudget: () => assertKnowledgeGraphBudget,
  assertKnowledgeGraphIdentity: () => assertKnowledgeGraphIdentity,
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
  graphQueryMatchIds: () => graphQueryMatchIds,
  graphSignature: () => graphSignature,
  mapCorpusKnowledgeGraph: () => mapCorpusKnowledgeGraph,
  matchesGraphQuery: () => matchesGraphQuery,
  normalizeGraphNodeRadius: () => normalizeGraphNodeRadius,
  normalizeGraphQuery: () => normalizeGraphQuery,
  reducedMotionLayoutTickBudget: () => reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks: () => uniqueGraphTopologyLinks
});
module.exports = __toCommonJS(KnowledgeGraph3DScene_exports);
var import_react2 = require("react");
var import_fiber = require("@react-three/fiber");
var THREE2 = __toESM(require("three"), 1);
var import_d3_force_3d = require("d3-force-3d");

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
var MAX_GRAPH_QUERY_LENGTH = 500;
var DEFAULT_GRAPH_NODE_RADIUS = 4;
var MAX_GRAPH_NODE_RADIUS = 64;
var MAX_KNOWLEDGE_GRAPH_SCENE_NODES = 1e3;
var MAX_KNOWLEDGE_GRAPH_SCENE_EDGES = 4e3;
var GRAPH_EDGE_CURVE_SEGMENTS = 4;
var GRAPH_EDGE_LANE_SPACING = 6;
var MAX_GRAPH_PARALLEL_EDGES = 9;
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
function assertKnowledgeGraphBudget(nodeCount, edgeCount) {
  if (!Number.isSafeInteger(nodeCount) || nodeCount < 0 || nodeCount > MAX_KNOWLEDGE_GRAPH_SCENE_NODES) {
    throw new RangeError(
      `knowledge graph nodes must be a non-negative integer <= ${MAX_KNOWLEDGE_GRAPH_SCENE_NODES}`
    );
  }
  if (!Number.isSafeInteger(edgeCount) || edgeCount < 0 || edgeCount > MAX_KNOWLEDGE_GRAPH_SCENE_EDGES) {
    throw new RangeError(
      `knowledge graph edges must be a non-negative integer <= ${MAX_KNOWLEDGE_GRAPH_SCENE_EDGES}`
    );
  }
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
  assertKnowledgeGraphBudget(nodeCount, edgeCount);
  const estimatedWork = Math.max(1, nodeCount + Math.ceil(edgeCount / 4));
  return Math.min(8, Math.max(2, Math.floor(2e3 / estimatedWork)));
}
function graphCameraTargetDamping(deltaSeconds, reducedMotion) {
  if (reducedMotion) return 1;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return -Math.expm1(-3 * deltaSeconds);
}
function normalizeGraphQuery(query) {
  return query.slice(0, MAX_GRAPH_QUERY_LENGTH).trim().toLowerCase();
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
var MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 2;
function advanceGraphLayoutClockInto(accumulatorSeconds, deltaSeconds, out) {
  const remainder = Number.isFinite(accumulatorSeconds) && accumulatorSeconds > 0 ? Math.min(accumulatorSeconds, GRAPH_LAYOUT_TICK_SECONDS) : 0;
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
    GRAPH_LAYOUT_TICK_SECONDS,
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
  for (const n of nodes) s += `N${field(n.id)}${field(n.radius)}`;
  s += "|";
  for (const e of edges) {
    s += `E${field(e.id)}${field(e.source)}${field(e.target)}${field(e.color)}${field(
      e.kind
    )}${field((e.directed !== false ? 1 : 0) + (e.particles ? 2 : 0))}`;
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
  const field = (value) => `${value.length}:${value}`;
  return `cortexel-corpus-graph-instance.v1:${field(context.graph_id)}${field(
    context.graph_source
  )}${field(context.graph_snapshot_id)}${field(context.graph_scope)}${field(
    context.generated_at
  )}`;
}
function mapCorpusKnowledgeGraph(params, palette, opts = {}) {
  assertKnowledgeGraphBudget(params.nodes.length, params.edges.length);
  assertUniqueGraphNodeIds(params.nodes);
  assertRenderableGraphEdges(params.nodes, params.edges);
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
  const renderableEdges = params.edges;
  const degree = /* @__PURE__ */ new Map();
  for (const e of renderableEdges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const nodes = params.nodes.map((n) => {
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
      color: nodeColors[n.kind] ?? palette.inkDim,
      radius,
      radiusMeaning,
      kind: n.kind
    };
  });
  const edges = renderableEdges.map((e) => {
    const style = edgeStyles[e.kind] ?? {
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
      color: edgeColorOverrides[e.kind] ?? style.color,
      directed: style.directed,
      kind: e.kind,
      particles: style.particles
    };
  });
  assertRenderableGraphEdges(nodes, edges);
  return {
    context: {
      graph_id: params.graph_id,
      graph_source: params.graph_source,
      graph_snapshot_id: params.graph_snapshot_id,
      graph_scope: params.graph_scope,
      generated_at: params.generated_at
    },
    graphIdentity: corpusGraphInstanceIdentity({
      graph_id: params.graph_id,
      graph_source: params.graph_source,
      graph_snapshot_id: params.graph_snapshot_id,
      graph_scope: params.graph_scope,
      generated_at: params.generated_at
    }),
    nodes,
    edges
  };
}

// react/knowledgeGraphLayout.internal.ts
function snapshotGraphLayoutInputs(nodes, edges) {
  const nodeSnapshot = nodes.map(({ id, radius }) => ({ id, radius }));
  const edgeSnapshot = edges.map(({
    id,
    source,
    target,
    color,
    kind,
    directed,
    particles
  }) => ({ id, source, target, color, kind, directed, particles }));
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
    for (const [id, previous] of remembered) {
      cache.set(id, [previous[0], previous[1], previous[2]]);
    }
    const positionSlots = new Array(nodes.length);
    for (let index = 0; index < nodes.length; index++) {
      const id = nodes[index].id;
      const previous = cache.get(id);
      const slot = previous ?? [0, 0, 0];
      if (previous !== void 0) cache.delete(id);
      cache.set(id, slot);
      positionSlots[index] = slot;
    }
    if (cache.size > maxRememberedPositions) {
      for (const id of cache.keys()) {
        if (cache.size <= maxRememberedPositions) break;
        if (!activeIds.has(id)) cache.delete(id);
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
function installFocusLabelResource({
  sprite,
  material,
  label,
  color,
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
  context.fillStyle = "rgba(3, 7, 17, 0.9)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e2e8f0";
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
    sprite.scale.set(Math.min(160, canvas.width / canvas.height * 7), 7, 1);
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

// core/skills/knowledgeGraphLimits.ts
var KNOWLEDGE_GRAPH_LIMITS = Object.freeze({
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

// react/knowledgeGraphPresentation.internal.ts
function boundedString(value, label, maxLength) {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    throw new TypeError(`${label} must be a non-empty string <= ${maxLength} characters`);
  }
  return value;
}
function optionalBoundedString(value, label, maxLength) {
  return value === void 0 ? void 0 : boundedString(value, label, maxLength);
}
function assertKnowledgeGraphNodeReference(value, label) {
  if (value === null) return;
  boundedString(value, label, KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength);
}
function assertKnowledgeGraphColor(value, label) {
  if (value === void 0) return;
  boundedString(value, label, KNOWLEDGE_GRAPH_LIMITS.maxColorLength);
}
function finiteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return value;
}
function optionalBoolean(value, label) {
  if (value !== void 0 && typeof value !== "boolean") {
    throw new TypeError(`${label} must be boolean when present`);
  }
  return value;
}
function assertAttributeScalar(value) {
  if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    throw new TypeError("knowledge-graph attribute values must be JSON scalars or arrays");
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("knowledge-graph numeric attributes must be finite");
  }
  if (typeof value === "string" && value.length > KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength) {
    throw new RangeError(
      `knowledge-graph attribute strings may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength} characters`
    );
  }
}
function snapshotAttributes(attributes) {
  if (attributes === void 0) return void 0;
  if (attributes === null || typeof attributes !== "object" || Array.isArray(attributes)) {
    throw new TypeError("knowledge-graph attributes must be a plain record");
  }
  const prototype = Object.getPrototypeOf(attributes);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("knowledge-graph attributes must use a plain or null prototype");
  }
  const snapshot = /* @__PURE__ */ Object.create(null);
  let count = 0;
  for (const key in attributes) {
    if (!Object.hasOwn(attributes, key)) continue;
    count += 1;
    if (count > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
      throw new RangeError(
        `knowledge-graph attributes may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributes} keys`
      );
    }
    if (key.length < 1 || key.length > KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength) {
      throw new RangeError(
        `knowledge-graph attribute keys must contain 1 to ${KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength} characters`
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(attributes, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new TypeError("knowledge-graph attribute accessors are not supported");
    }
    const value = descriptor.value;
    if (!Array.isArray(value)) {
      assertAttributeScalar(value);
      snapshot[key] = value;
      continue;
    }
    if (value.length > KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems) {
      throw new RangeError(
        `knowledge-graph attribute arrays may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems} items`
      );
    }
    const items = new Array(value.length);
    for (let index = 0; index < value.length; index++) {
      const item = Object.getOwnPropertyDescriptor(value, String(index));
      if (!item || !("value" in item)) {
        throw new TypeError("knowledge-graph attribute arrays must be dense data arrays");
      }
      assertAttributeScalar(item.value);
      items[index] = item.value;
    }
    snapshot[key] = items;
  }
  return snapshot;
}
function snapshotEpistemic(epistemic) {
  if (epistemic === void 0) return void 0;
  if (epistemic.status !== "derived_advisory" || epistemic.advisory_only !== true || epistemic.is_paper_local_evidence !== false || epistemic.calibrated_posterior !== false) {
    throw new TypeError("knowledge-graph epistemic metadata must remain derived/advisory");
  }
  return {
    status: epistemic.status,
    advisory_only: epistemic.advisory_only,
    is_paper_local_evidence: epistemic.is_paper_local_evidence,
    calibrated_posterior: epistemic.calibrated_posterior
  };
}
function snapshotEvidence(evidence) {
  if (evidence === void 0) return void 0;
  if (evidence.length > KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement) {
    throw new RangeError(
      `knowledge-graph evidence may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement} references`
    );
  }
  const snapshot = new Array(evidence.length);
  for (let index = 0; index < evidence.length; index++) {
    const item = Object.getOwnPropertyDescriptor(evidence, String(index));
    if (!item || !("value" in item) || item.value === null || typeof item.value !== "object") {
      throw new TypeError("knowledge-graph evidence must be a dense data array");
    }
    const reference = item.value;
    switch (reference.kind) {
      case "graph_snapshot_record":
        snapshot[index] = {
          kind: reference.kind,
          evidence_id: boundedString(
            reference.evidence_id,
            "knowledge-graph evidence id",
            KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength
          ),
          record_id: boundedString(
            reference.record_id,
            "knowledge-graph record id",
            KNOWLEDGE_GRAPH_LIMITS.maxRecordIdLength
          ),
          locator: optionalBoundedString(
            reference.locator,
            "knowledge-graph evidence locator",
            KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength
          )
        };
        break;
      case "graph_node":
        snapshot[index] = {
          kind: reference.kind,
          evidence_id: boundedString(
            reference.evidence_id,
            "knowledge-graph evidence id",
            KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength
          ),
          node_id: boundedString(
            reference.node_id,
            "knowledge-graph evidence node id",
            KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength
          ),
          locator: optionalBoundedString(
            reference.locator,
            "knowledge-graph evidence locator",
            KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength
          ),
          excerpt: optionalBoundedString(
            reference.excerpt,
            "knowledge-graph evidence excerpt",
            KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength
          )
        };
        break;
      case "citation":
        if (reference.page !== void 0 && (!Number.isSafeInteger(reference.page) || reference.page < 0)) {
          throw new TypeError("knowledge-graph citation page must be a non-negative integer");
        }
        snapshot[index] = {
          kind: reference.kind,
          evidence_id: boundedString(
            reference.evidence_id,
            "knowledge-graph evidence id",
            KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength
          ),
          paper_id: boundedString(
            reference.paper_id,
            "knowledge-graph evidence paper id",
            KNOWLEDGE_GRAPH_LIMITS.maxPaperIdLength
          ),
          citation_id: boundedString(
            reference.citation_id,
            "knowledge-graph citation id",
            KNOWLEDGE_GRAPH_LIMITS.maxCitationIdLength
          ),
          page: reference.page,
          locator: optionalBoundedString(
            reference.locator,
            "knowledge-graph evidence locator",
            KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength
          ),
          excerpt: optionalBoundedString(
            reference.excerpt,
            "knowledge-graph evidence excerpt",
            KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength
          ),
          doi: optionalBoundedString(
            reference.doi,
            "knowledge-graph evidence DOI",
            KNOWLEDGE_GRAPH_LIMITS.maxDoiLength
          )
        };
        break;
      case "external_source":
        snapshot[index] = {
          kind: reference.kind,
          evidence_id: boundedString(
            reference.evidence_id,
            "knowledge-graph evidence id",
            KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength
          ),
          source_id: boundedString(
            reference.source_id,
            "knowledge-graph evidence source id",
            KNOWLEDGE_GRAPH_LIMITS.maxSourceIdLength
          ),
          locator: optionalBoundedString(
            reference.locator,
            "knowledge-graph evidence locator",
            KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength
          ),
          excerpt: optionalBoundedString(
            reference.excerpt,
            "knowledge-graph evidence excerpt",
            KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength
          )
        };
        break;
      default:
        throw new TypeError("unsupported knowledge-graph evidence reference");
    }
  }
  return snapshot;
}
function snapshotScore(score) {
  if (score === void 0) return void 0;
  const value = finiteNumber(score.value, "knowledge-graph score value");
  if (![
    "extraction_confidence",
    "citation_resolution_confidence",
    "structural_similarity",
    "behavioral_agreement",
    "retrieval_relevance"
  ].includes(score.kind) || score.calibrated_posterior !== false || value < 0 || value > 1) {
    throw new TypeError("knowledge-graph scores must be bounded and explicitly uncalibrated");
  }
  return {
    kind: score.kind,
    value,
    calibrated_posterior: score.calibrated_posterior
  };
}
function snapshotNode(node) {
  if (typeof node.radius !== "number") {
    throw new TypeError("knowledge-graph node radius must be numeric");
  }
  return {
    id: boundedString(
      node.id,
      "knowledge-graph node id",
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength
    ),
    label: boundedString(
      node.label,
      "knowledge-graph node label",
      KNOWLEDGE_GRAPH_LIMITS.maxNodeLabelLength
    ),
    detail: optionalBoundedString(
      node.detail,
      "knowledge-graph node detail",
      KNOWLEDGE_GRAPH_LIMITS.maxDetailLength
    ),
    attributes: snapshotAttributes(node.attributes),
    epistemic: snapshotEpistemic(node.epistemic),
    evidence: snapshotEvidence(node.evidence),
    uncalibrated_score: snapshotScore(node.uncalibrated_score),
    color: boundedString(
      node.color,
      "knowledge-graph node color",
      KNOWLEDGE_GRAPH_LIMITS.maxColorLength
    ),
    radius: node.radius,
    radiusMeaning: optionalBoundedString(
      node.radiusMeaning,
      "knowledge-graph radius meaning",
      KNOWLEDGE_GRAPH_LIMITS.maxRadiusMeaningLength
    ),
    kind: boundedString(
      node.kind,
      "knowledge-graph node kind",
      KNOWLEDGE_GRAPH_LIMITS.maxKindLength
    )
  };
}
function snapshotEdge(edge) {
  return {
    id: optionalBoundedString(
      edge.id,
      "knowledge-graph edge id",
      KNOWLEDGE_GRAPH_LIMITS.maxEdgeIdLength
    ),
    label: optionalBoundedString(
      edge.label,
      "knowledge-graph edge label",
      KNOWLEDGE_GRAPH_LIMITS.maxEdgeLabelLength
    ),
    attributes: snapshotAttributes(edge.attributes),
    epistemic: snapshotEpistemic(edge.epistemic),
    evidence: snapshotEvidence(edge.evidence),
    uncalibrated_score: snapshotScore(edge.uncalibrated_score),
    source: boundedString(
      edge.source,
      "knowledge-graph edge source",
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength
    ),
    target: boundedString(
      edge.target,
      "knowledge-graph edge target",
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength
    ),
    color: boundedString(
      edge.color,
      "knowledge-graph edge color",
      KNOWLEDGE_GRAPH_LIMITS.maxColorLength
    ),
    directed: optionalBoolean(edge.directed, "knowledge-graph edge directed"),
    kind: boundedString(
      edge.kind,
      "knowledge-graph edge kind",
      KNOWLEDGE_GRAPH_LIMITS.maxKindLength
    ),
    particles: optionalBoolean(edge.particles, "knowledge-graph edge particles")
  };
}
function snapshotKnowledgeGraphPresentation(nodes, edges) {
  return {
    nodes: nodes.map(snapshotNode),
    edges: edges.map(snapshotEdge)
  };
}

// react/knowledgeGraphInteraction.internal.ts
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

// react/knowledgeGraphParticles.internal.ts
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

// core/safeRuntime.ts
var PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
  maxIssues: 32,
  maxPathLength: 240,
  maxMessageLength: 500,
  maxTotalLength: 8192,
  maxUnknownKeySamples: 8
});
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

// react/KnowledgeGraphA11yList.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var INLINE_RELATION_LIMIT = 8;
var RELATION_PAGE_SIZE = 25;
var INLINE_ATTRIBUTE_LIMIT = 3;
var INLINE_ATTRIBUTE_ARRAY_LIMIT = 3;
var INLINE_EVIDENCE_LIMIT = 2;
var DEFAULT_A11Y_NODE_PAGE_SIZE = 100;
var MAX_A11Y_NODE_PAGE_SIZE = 200;
var CALLER_DEFINED_RADIUS_MEANING = "Caller-defined visual size; not quantitative evidence.";
function radiusMeaningText(value) {
  return safeDiagnosticText(
    value.radiusMeaning ?? CALLER_DEFINED_RADIUS_MEANING,
    400
  );
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
function FullMetadata({ value, label }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { "aria-label": safeDiagnosticText(label, 400), children: [
    value.radius !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      "Visual radius: ",
      normalizeGraphNodeRadius(value.radius),
      ". Radius meaning:",
      " ",
      radiusMeaningText(value)
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
  label
}) {
  const [expanded, setExpanded] = (0, import_react.useState)(false);
  if (!hasMetadata(value)) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { onToggle: (event) => setExpanded(event.currentTarget.open), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { style: { minHeight: 44 }, children: [
      "Browse full metadata for ",
      safeDiagnosticText(label, 400)
    ] }),
    expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullMetadata, { value, label: `Full metadata for ${label}` })
  ] });
}
function metadataSummary(value) {
  const parts = [];
  if (value.radius !== void 0) {
    parts.push(
      `Visual radius: ${normalizeGraphNodeRadius(value.radius)}; radius meaning: ${radiusMeaningText(value)}`
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
  const { graphIdentity, nodes, edges } = props;
  assertKnowledgeGraphIdentity(graphIdentity);
  assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  const snapshot = snapshotKnowledgeGraphPresentation(nodes, edges);
  assertUniqueGraphNodeIds(snapshot.nodes);
  assertRenderableGraphEdges(snapshot.nodes, snapshot.edges);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    KnowledgeGraphA11yListInstance,
    {
      ...props,
      nodes: snapshot.nodes,
      edges: snapshot.edges
    },
    graphIdentity
  );
}
function KnowledgeGraphA11yListInstance({
  nodes,
  edges,
  selectedId,
  onSelect,
  query = "",
  className,
  label = "Knowledge graph nodes",
  nodePageSize = DEFAULT_A11Y_NODE_PAGE_SIZE
}) {
  const instanceId = (0, import_react.useId)().replace(/:/g, "");
  const safePageSize = Number.isSafeInteger(nodePageSize) ? Math.min(MAX_A11Y_NODE_PAGE_SIZE, Math.max(1, nodePageSize)) : DEFAULT_A11Y_NODE_PAGE_SIZE;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const validEdges = filterGraphEdges(new Set(byId.keys()), edges);
  const relations = /* @__PURE__ */ new Map();
  for (const node of nodes) relations.set(node.id, []);
  for (let index = 0; index < validEdges.length; index++) {
    const edge = validEdges[index];
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target || source.id === target.id) continue;
    relations.get(source.id)?.push(index);
    relations.get(target.id)?.push(index);
  }
  const normalizedQuery = normalizeGraphQuery(query);
  const matchingNodeIds = graphQueryMatchIds(nodes, normalizedQuery, validEdges);
  const rows = nodes.filter(
    (node) => node.id === selectedId || matchingNodeIds.has(node.id)
  ).map((node) => ({ node, relationIndexes: relations.get(node.id) ?? [] }));
  const [nodePage, setNodePage] = (0, import_react.useState)(() => {
    const selectedIndex2 = rows.findIndex(({ node }) => node.id === selectedId);
    return selectedIndex2 < 0 ? 0 : Math.floor(selectedIndex2 / safePageSize);
  });
  const nodePageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const currentNodePage = Math.min(nodePage, nodePageCount - 1);
  const visibleRows = rows.slice(
    currentNodePage * safePageSize,
    (currentNodePage + 1) * safePageSize
  );
  const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
  (0, import_react.useEffect)(() => setNodePage(0), [normalizedQuery, safePageSize]);
  (0, import_react.useEffect)(() => {
    if (selectedIndex >= 0) setNodePage(Math.floor(selectedIndex / safePageSize));
    else setNodePage((page) => Math.min(page, nodePageCount - 1));
  }, [selectedIndex, safePageSize, nodePageCount]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: "No graph nodes match this view." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: visibleRows.map(({ node, relationIndexes }, rowOffset) => {
      const rowIndex = currentNodePage * safePageSize + rowOffset;
      const detailsId = `cortexel-kg-${instanceId}-${rowIndex}-details`;
      const preview = relationIndexes.slice(0, INLINE_RELATION_LIMIT).map((index) => relationshipText(node.id, validEdges[index], byId));
      const omitted = relationIndexes.length - preview.length;
      const nodeMetadata = metadataSummary(node);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "cortexel-knowledge-graph-node",
            "aria-pressed": selectedId === node.id,
            "aria-describedby": detailsId,
            onClick: () => onSelect(node.id),
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
          nodeMetadata ? `${nodeMetadata}. ` : "",
          preview.length > 0 ? `${preview.join("; ")}${omitted > 0 ? `; ${omitted} more relationships` : ""}` : "No rendered relationships."
        ] }),
        selectedId === node.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetadataDisclosure, { value: node, label: `node ${node.label}` }),
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
          onClick: () => setNodePage((page) => Math.max(0, page - 1)),
          style: { minWidth: 44, minHeight: 44 },
          children: "Previous nodes"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          disabled: currentNodePage + 1 >= nodePageCount,
          onClick: () => setNodePage((page) => Math.min(nodePageCount - 1, page + 1)),
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
function KnowledgeGraphLegend({
  nodes,
  edges,
  context,
  className,
  label = "Knowledge graph legend"
}) {
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  const snapshot = snapshotKnowledgeGraphPresentation(nodes, edges);
  assertUniqueGraphNodeIds(snapshot.nodes);
  assertRenderableGraphEdges(snapshot.nodes, snapshot.edges);
  const nodeEntries = [];
  const edgeEntries = [];
  {
    const nodeGroups = /* @__PURE__ */ new Map();
    for (let index = 0; index < snapshot.nodes.length; index++) {
      const node = snapshot.nodes[index];
      const radius = normalizeGraphNodeRadius(node.radius);
      const radiusMeaning = radiusMeaningText(node);
      const key = JSON.stringify([node.kind, node.color, radiusMeaning]);
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
          radiusMeaning
        });
      }
    }
    const edgeGroups = /* @__PURE__ */ new Map();
    const validEdges = filterGraphEdges(
      new Set(snapshot.nodes.map(({ id }) => id)),
      snapshot.edges
    );
    for (let index = 0; index < validEdges.length; index++) {
      const edge = validEdges[index];
      const directed = edge.directed !== false;
      const particles = edge.particles === true;
      const key = JSON.stringify([edge.kind, edge.color, directed, particles]);
      const entry = edgeGroups.get(key);
      if (entry) entry.count += 1;
      else {
        edgeGroups.set(key, {
          kind: edge.kind,
          color: edge.color,
          directed,
          particles,
          count: 1
        });
      }
    }
    nodeEntries.push(...[...nodeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || (a.radiusMeaning === b.radiusMeaning ? 0 : a.radiusMeaning < b.radiusMeaning ? -1 : 1)));
    edgeEntries.push(...[...edgeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || Number(a.directed) - Number(b.directed) || Number(a.particles) - Number(b.particles)));
  }
  const swatchStyle = (color) => ({
    display: "inline-block",
    width: 16,
    height: 16,
    marginRight: 8,
    border: "1px solid currentColor",
    backgroundColor: color
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    context && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Graph context" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Graph id" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.graph_id, 160) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Graph source" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.graph_source, 200) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Graph snapshot id" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.graph_snapshot_id, 200) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Graph scope" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.graph_scope, 80) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Generated at" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: safeDiagnosticText(context.generated_at, 80) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Node kinds" }),
    nodeEntries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No rendered nodes." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: nodeEntries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", style: swatchStyle(entry.color) }),
      safeDiagnosticText(entry.kind, 80),
      ": ",
      entry.count,
      " ",
      entry.count === 1 ? "node" : "nodes",
      "; color",
      " ",
      safeDiagnosticText(entry.color, 80),
      "; visual radius",
      " ",
      entry.minRadius === entry.maxRadius ? entry.minRadius : `${entry.minRadius}\u2013${entry.maxRadius}`,
      ";",
      " ",
      entry.radiusMeaning
    ] }, JSON.stringify([entry.kind, entry.color, entry.radiusMeaning]))) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Relationship kinds" }),
    edgeEntries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No rendered relationships." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: edgeEntries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", style: swatchStyle(entry.color) }),
      safeDiagnosticText(entry.kind, 80),
      ": ",
      entry.count,
      " ",
      entry.count === 1 ? "relationship" : "relationships",
      ";",
      " ",
      entry.directed ? "directed" : "undirected",
      "; color",
      " ",
      safeDiagnosticText(entry.color, 80),
      entry.particles ? "; flow markers" : ""
    ] }, JSON.stringify([
      entry.kind,
      entry.color,
      entry.directed,
      entry.particles
    ]))) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "note", children: "Layout positions and distances are schematic, not quantitative evidence." })
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

// react/KnowledgeGraph3DScene.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var PARTICLES_PER_EDGE = 4;
var MAX_PARTICLES = MAX_KNOWLEDGE_GRAPH_SCENE_EDGES;
var FALLBACK_COLOR = "#64748b";
var MAX_REMEMBERED_POSITIONS = 5e3;
var _dummy = new THREE2.Object3D();
var _color = new THREE2.Color();
var _dimTarget = new THREE2.Color("#030711");
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
var selectCamera = (state) => state.camera;
var selectRenderer = (state) => state.gl;
var selectInvalidate = (state) => state.invalidate;
function devWarn(msg) {
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") {
    return;
  }
  if (typeof console !== "undefined" && console.warn) console.warn(`[cortexel] ${msg}`);
}
function dim(hex, amount) {
  _color.set(FALLBACK_COLOR);
  _color.set(hex);
  return _color.lerp(_dimTarget, amount);
}
function FocusLabelSprite({
  text,
  color,
  invalidate
}) {
  const label = safeDiagnosticText(text, 120);
  const spriteRef = (0, import_react2.useRef)(null);
  const materialRef = (0, import_react2.useRef)(null);
  (0, import_react2.useLayoutEffect)(() => {
    const sprite = spriteRef.current;
    const material = materialRef.current;
    if (!sprite || !material) return void 0;
    return installFocusLabelResource({
      sprite,
      material,
      label,
      color,
      invalidate
    });
  }, [label, color, invalidate]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("sprite", { ref: spriteRef, visible: false, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "spriteMaterial",
    {
      ref: materialRef,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    }
  ) });
}
function setEdgeCurve(source, target, lane) {
  _a.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
  _b.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
  graphEdgeControlPointInto(_a, _b, lane, _curveControl);
}
function KnowledgeGraph3DScene(props) {
  const { graphIdentity, nodes, edges } = props;
  assertKnowledgeGraphIdentity(graphIdentity);
  assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
  assertKnowledgeGraphNodeReference(props.hoverId, "knowledge-graph hover id");
  assertKnowledgeGraphColor(props.labelColor, "knowledge-graph label color");
  assertKnowledgeGraphColor(props.particleColor, "knowledge-graph particle color");
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  const snapshot = snapshotKnowledgeGraphPresentation(nodes, edges);
  assertUniqueGraphNodeIds(snapshot.nodes);
  assertRenderableGraphEdges(snapshot.nodes, snapshot.edges);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    KnowledgeGraph3DSceneInstance,
    {
      ...props,
      nodes: snapshot.nodes,
      edges: snapshot.edges
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
  labelColor = "#e2e8f0",
  particleColor = "#8fd3ff",
  reducedMotion = false
}) {
  const meshRef = (0, import_react2.useRef)(null);
  const linesRef = (0, import_react2.useRef)(null);
  const particlesRef = (0, import_react2.useRef)(null);
  const arrowsRef = (0, import_react2.useRef)(null);
  const labelGroupRef = (0, import_react2.useRef)(null);
  const sceneGroupRef = (0, import_react2.useRef)(null);
  const camera = (0, import_fiber.useThree)(selectCamera);
  const gl = (0, import_fiber.useThree)(selectRenderer);
  const invalidate = (0, import_fiber.useThree)(selectInvalidate);
  const [posMap] = (0, import_react2.useState)(() => ({
    current: /* @__PURE__ */ new Map()
  }));
  const readyGraphKeyRef = (0, import_react2.useRef)(null);
  const framedRef = (0, import_react2.useRef)(false);
  const flyToIdRef = (0, import_react2.useRef)(null);
  const onHoverRef = (0, import_react2.useRef)(onHover);
  (0, import_react2.useLayoutEffect)(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  (0, import_react2.useEffect)(() => () => onHoverRef.current(null), []);
  const attachedControlsRef = (0, import_react2.useRef)(null);
  const [onUserGrab] = (0, import_react2.useState)(
    () => () => {
      framedRef.current = true;
      flyToIdRef.current = null;
    }
  );
  (0, import_react2.useEffect)(
    () => () => {
      synchronizeKnowledgeGraphControlsListener(
        attachedControlsRef,
        null,
        onUserGrab
      );
    },
    [onUserGrab]
  );
  const layoutInput = snapshotGraphLayoutInputs(nodes, edges);
  const graphKey = layoutInput.graphKey;
  const normalizedQuery = (0, import_react2.useMemo)(() => normalizeGraphQuery(query), [query]);
  const queryMatchIds = graphQueryMatchIds(nodes, normalizedQuery, edges);
  const queryActive = normalizedQuery.length > 0;
  const visualNodes = nodes.map(({ id, label, color }) => ({ id, label, color }));
  const { layoutNodes, simLinks, validEdges, edgeLanes, index } = (0, import_react2.useMemo)(() => {
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
  const neighbors = (0, import_react2.useMemo)(
    () => buildAdjacency(new Set(index.keys()), validEdges),
    [index, validEdges]
  );
  (0, import_react2.useEffect)(() => {
    if (hoverId == null || !index.has(hoverId)) return;
    const element = gl.domElement;
    const previous = element.style.cursor;
    element.style.cursor = "pointer";
    return () => {
      element.style.cursor = previous;
    };
  }, [gl, hoverId, index]);
  const flowEdges = (0, import_react2.useMemo)(
    () => edgeLanes.filter(({ edge }) => edge.particles),
    [edgeLanes]
  );
  const directedEdges = (0, import_react2.useMemo)(
    () => edgeLanes.filter(({ edge }) => edge.directed !== false),
    [edgeLanes]
  );
  const particleDistribution = planFlowParticleDistribution(
    flowEdges.length,
    PARTICLES_PER_EDGE,
    MAX_PARTICLES
  );
  const particleCount = particleDistribution.total;
  (0, import_react2.useEffect)(() => {
    if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) {
      devWarn(
        `KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ${MAX_PARTICLES}-particle cap at four markers each; marker density is reduced evenly and every flow edge retains at least one marker.`
      );
    }
  }, [flowEdges.length]);
  const linePos = (0, import_react2.useMemo)(
    () => new Float32Array(validEdges.length * GRAPH_EDGE_CURVE_SEGMENTS * 6),
    [validEdges]
  );
  const lineCol = (0, import_react2.useMemo)(
    () => new Float32Array(validEdges.length * GRAPH_EDGE_CURVE_SEGMENTS * 6),
    [validEdges]
  );
  const layoutRuntimeRef = (0, import_react2.useRef)(null);
  const layoutTickAccumulatorRef = (0, import_react2.useRef)(0);
  const geometryDirtyRef = (0, import_react2.useRef)(true);
  const flowTimeRef = (0, import_react2.useRef)(0);
  (0, import_react2.useEffect)(() => {
    const plan = planGraphLayoutCache(
      layoutNodes,
      posMap.current,
      MAX_REMEMBERED_POSITIONS
    );
    const simNodes = plan.nodes;
    const runtimeLinks = simLinks.map(({ source, target }) => ({ source, target }));
    const linkForce = (0, import_d3_force_3d.forceLink)(runtimeLinks).id((d) => d.id).distance(34).strength(0.35);
    const sim = (0, import_d3_force_3d.forceSimulation)(simNodes, 3).force("charge", (0, import_d3_force_3d.forceManyBody)().strength(-140).distanceMax(600)).force("link", linkForce).force("center", (0, import_d3_force_3d.forceCenter)(0, 0, 0).strength(0.04)).force("collide", (0, import_d3_force_3d.forceCollide)((d) => d.r + 3).iterations(2)).alpha(plan.warmStart ? 0.5 : 1).alphaDecay(0.018).velocityDecay(0.42).stop();
    if (reducedMotion) {
      const budget = reducedMotionLayoutTickBudget(simNodes.length, simLinks.length);
      for (let i = 0; i < budget && sim.alpha() > 8e-3; i++) sim.tick();
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
  }, [graphKey, layoutNodes, simLinks, reducedMotion, invalidate]);
  (0, import_react2.useLayoutEffect)(() => {
    beginKnowledgeGraphRuntimeTransition(
      readyGraphKeyRef,
      geometryDirtyRef,
      sceneGroupRef.current,
      invalidate,
      () => onHoverRef.current(null)
    );
  }, [graphKey, reducedMotion, invalidate]);
  const applyEmphasis = (0, import_react2.useCallback)(() => {
    const mesh = meshRef.current;
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusSet = focus ? neighbors.get(focus) : null;
    const isDimmed = (id) => {
      if (focus && id !== focus && !focusSet?.has(id)) return 0.8;
      if (!focus && queryActive && !queryMatchIds.has(id)) return 0.82;
      return 0;
    };
    if (mesh) {
      visualNodes.forEach((n, i) => {
        mesh.setColorAt(i, dim(n.color, isDimmed(n.id)));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    let k = 0;
    for (const e of validEdges) {
      const incident = focus ? e.source === focus || e.target === focus : graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
      const c = dim(e.color, incident ? 0.25 : 0.86);
      for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
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
        arrows.setColorAt(arrowIndex, dim(edge.color, incident ? 0.15 : 0.86));
      });
      if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
    }
  }, [
    visualNodes,
    validEdges,
    directedEdges,
    index,
    neighbors,
    hoverId,
    selectedId,
    queryActive,
    queryMatchIds,
    normalizedQuery,
    lineCol
  ]);
  (0, import_react2.useLayoutEffect)(() => {
    applyEmphasis();
    geometryDirtyRef.current = true;
    invalidate();
  }, [applyEmphasis, invalidate]);
  (0, import_react2.useEffect)(() => {
    flyToIdRef.current = flyToSelection && selectedId && index.has(selectedId) ? selectedId : null;
    if (flyToIdRef.current) invalidate();
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
    if (sim.alpha() > 8e-3) {
      const advanced = advanceGraphLayoutClockInto(
        layoutTickAccumulatorRef.current,
        delta,
        _layoutClockResult
      );
      layoutTickAccumulatorRef.current = advanced.remainderSeconds;
      for (let tick = 0; tick < advanced.ticks && sim.alpha() > 8e-3; tick++) {
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
        const z = n.z ?? 0;
        const remembered = positionSlots[i];
        remembered[0] = x;
        remembered[1] = y;
        remembered[2] = z;
        _dummy.position.set(x, y, z);
        const pop = focus && (n.id === focus || focusSet?.has(n.id)) ? 1.28 : 1;
        _dummy.scale.setScalar(n.r * pop);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.boundingSphere = null;
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
          linePos[k] = _curvePoint.x;
          linePos[k + 1] = _curvePoint.y;
          linePos[k + 2] = _curvePoint.z;
          linePos[k + 3] = _curveNext.x;
          linePos[k + 4] = _curveNext.y;
          linePos[k + 5] = _curveNext.z;
          _curvePoint.copy(_curveNext);
          k += 6;
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
          const target = simNodes[index.get(edge.target)];
          setEdgeCurve(source, target, lane);
          _direction.subVectors(_b, _curveControl);
          if (_direction.lengthSq() <= 1e-12) {
            _dummy.position.copy(_b);
            _dummy.quaternion.identity();
            _dummy.scale.setScalar(0);
          } else {
            _direction.normalize();
            _dummy.position.copy(_b).addScaledVector(_direction, -(target.r + 1.5));
            _dummy.quaternion.setFromUnitVectors(_up, _direction);
            _dummy.scale.set(1.25, 3, 1.25);
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
      const speed = 0.28;
      if (!reducedMotion) flowTimeRef.current += delta;
      const base = reducedMotion ? 0 : flowTimeRef.current * speed;
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
          const frac = (base + phase + q / edgeParticleCount) % 1;
          graphEdgeCurvePointInto(_a, _curveControl, _b, frac, _dummy.position);
          _dummy.scale.setScalar(size);
          _dummy.updateMatrix();
          pmesh.setMatrixAt(p, _dummy.matrix);
          p++;
        }
      }
      pmesh.instanceMatrix.needsUpdate = true;
    }
    const label = labelGroupRef.current;
    if (label) {
      const fi = focus != null ? index.get(focus) : void 0;
      if (fi != null) {
        const n = simNodes[fi];
        label.position.set(n.x ?? 0, (n.y ?? 0) + n.r + 4, n.z ?? 0);
        label.visible = true;
      } else {
        label.visible = false;
      }
    }
    if (autoFrame && controls && !framedRef.current && simNodes.length > 0 && sim.alpha() < 0.25) {
      _box.makeEmpty();
      for (let nodeIndex = 0; nodeIndex < simNodes.length; nodeIndex++) {
        const n = simNodes[nodeIndex];
        _box.expandByPoint(_a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0));
      }
      const sphere = _box.getBoundingSphere(_sphere);
      const dist = Math.max(120, sphere.radius * 2.4);
      camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + dist);
      controls.target.copy(sphere.center);
      controls.update();
      framedRef.current = true;
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
    if (sim.alpha() > 8e-3 || !reducedMotion && particleCount > 0 || flyToIdRef.current !== null) {
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
  const handleMove = (0, import_react2.useCallback)(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      if (readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion) return;
      if (e.instanceId == null || e.instanceId >= visualNodes.length) return;
      e.stopPropagation();
      const id = visualNodes[e.instanceId].id;
      if (id !== hoverId) onHover(id);
    },
    [graphKey, reducedMotion, visualNodes, onHover, hoverId]
  );
  const handleOut = (0, import_react2.useCallback)(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion);
      handleKnowledgeGraphPointerOut(
        ready,
        () => e.stopPropagation(),
        () => onHover(null)
      );
    },
    [graphKey, reducedMotion, onHover]
  );
  const handleClick = (0, import_react2.useCallback)(
    (e) => {
      const runtime = layoutRuntimeRef.current;
      if (readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.graphKey !== graphKey || runtime.reducedMotion !== reducedMotion) return;
      if (e.instanceId != null && e.instanceId < visualNodes.length) {
        e.stopPropagation();
        onSelect(visualNodes[e.instanceId].id);
      }
    },
    [graphKey, reducedMotion, visualNodes, onSelect]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_jsx_runtime2.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("group", { ref: sceneGroupRef, visible: false, children: [
    nodes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "instancedMesh",
      {
        ref: meshRef,
        args: [void 0, void 0, nodes.length],
        frustumCulled: false,
        onPointerMove: handleMove,
        onPointerOut: handleOut,
        onClick: handleClick,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("sphereGeometry", { args: [1, 20, 20] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `nodes-${nodes.length}`
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("lineSegments", { ref: linesRef, frustumCulled: false, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("bufferGeometry", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("bufferAttribute", { attach: "attributes-position", args: [linePos, 3] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("bufferAttribute", { attach: "attributes-color", args: [lineCol, 3] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "lineBasicMaterial",
        {
          vertexColors: true,
          transparent: true,
          opacity: 0.75,
          toneMapped: false,
          depthWrite: false,
          blending: THREE2.AdditiveBlending
        }
      )
    ] }, `lines-${validEdges.length}`),
    directedEdges.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "instancedMesh",
      {
        ref: arrowsRef,
        args: [void 0, void 0, directedEdges.length],
        frustumCulled: false,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("coneGeometry", { args: [1, 1, 8] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `arrows-${directedEdges.length}`
    ) : null,
    particleCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "instancedMesh",
      {
        ref: particlesRef,
        args: [void 0, void 0, particleCount],
        frustumCulled: false,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("sphereGeometry", { args: [0.6, 6, 6] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "meshBasicMaterial",
            {
              color: particleColor,
              toneMapped: false,
              transparent: true,
              opacity: 0.9,
              depthWrite: false,
              blending: THREE2.AdditiveBlending
            }
          )
        ]
      },
      `p-${particleCount}`
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("group", { ref: labelGroupRef, visible: false, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      FocusLabelSprite,
      {
        text: focusLabel,
        color: labelColor,
        invalidate
      }
    ) })
  ] }, `graph-${graphKey}`) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CORPUS_GRAPH_RADIUS_MEANING,
  DEFAULT_A11Y_NODE_PAGE_SIZE,
  DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  GRAPH_LAYOUT_TICK_SECONDS,
  KnowledgeGraph3DScene,
  KnowledgeGraphA11yList,
  KnowledgeGraphLegend,
  MAX_A11Y_NODE_PAGE_SIZE,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_SCENE_EDGES,
  MAX_KNOWLEDGE_GRAPH_SCENE_NODES,
  advanceGraphLayoutClock,
  advanceGraphLayoutClockInto,
  assertKnowledgeGraphBudget,
  assertKnowledgeGraphIdentity,
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
  graphQueryMatchIds,
  graphSignature,
  mapCorpusKnowledgeGraph,
  matchesGraphQuery,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
  reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks
});
//# sourceMappingURL=knowledge-graph.cjs.map