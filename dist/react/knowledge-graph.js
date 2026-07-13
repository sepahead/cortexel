import {
  safeDiagnosticText
} from "../chunk-X23XMWZH.js";

// react/KnowledgeGraph3DScene.tsx
import { useCallback, useEffect as useEffect2, useLayoutEffect, useMemo as useMemo2, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide
} from "d3-force-3d";

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
var CORPUS_GRAPH_RADIUS_MEANING = "Schematic sqrt(rendered relationship degree) scaling; not quantitative evidence.";
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
function canonicalPair(source, target) {
  return source <= target ? [source, target] : [target, source];
}
function graphEdgeIdentityKey(edge) {
  if (typeof edge.id === "string") return JSON.stringify(["id", edge.id]);
  const kind = typeof edge.kind === "string" ? edge.kind : "";
  if (kind === "same_as") {
    const [source, target] = canonicalPair(edge.source, edge.target);
    return JSON.stringify(["legacy-symmetric", source, target, kind]);
  }
  return JSON.stringify(["legacy-directed", edge.source, edge.target, kind]);
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
    const key = graphEdgeIdentityKey(edge);
    if (relationships.has(key)) {
      const identity = typeof edge.id === "string" ? "id" : "relationship";
      throw new Error(`knowledge graph edge ${identity} is duplicated at index ${index}`);
    }
    relationships.add(key);
    const [source, target] = canonicalPair(edge.source, edge.target);
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
    const [source, target] = canonicalPair(edge.source, edge.target);
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
    const [source, target] = canonicalPair(edge.source, edge.target);
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
    const text = value === void 0 ? "" : String(value);
    return `${text.length}:${text}`;
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
function mapCorpusKnowledgeGraph(params, palette, opts = {}) {
  assertKnowledgeGraphBudget(params.nodes.length, params.edges.length);
  const baseRadius = Number.isFinite(opts.baseRadius) && opts.baseRadius > 0 ? opts.baseRadius : 4;
  const degreeScale = Number.isFinite(opts.degreeScale) && opts.degreeScale >= 0 ? opts.degreeScale : 1.4;
  const maxRadiusBump = Number.isFinite(opts.maxRadiusBump) && opts.maxRadiusBump >= 0 ? opts.maxRadiusBump : 8;
  const nodeColors = { ...defaultNodeColors(palette), ...opts.nodeColors };
  const edgeStyles = { ...defaultEdgeStyles(palette), ...opts.edgeStyles };
  const ids = new Set(params.nodes.map((n) => n.id));
  const validEdges = filterGraphEdges(ids, params.edges);
  const degree = /* @__PURE__ */ new Map();
  for (const e of validEdges) {
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
      radiusMeaning: CORPUS_GRAPH_RADIUS_MEANING,
      kind: n.kind
    };
  });
  const edges = validEdges.map((e) => {
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
      color: style.color,
      directed: style.directed,
      kind: e.kind,
      particles: style.particles
    };
  });
  return {
    context: {
      graph_id: params.graph_id,
      graph_source: params.graph_source,
      graph_snapshot_id: params.graph_snapshot_id,
      graph_scope: params.graph_scope,
      generated_at: params.generated_at
    },
    nodes,
    edges
  };
}

// react/KnowledgeGraphA11yList.tsx
import { useEffect, useId, useMemo, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsxs("div", { "aria-label": safeDiagnosticText(label, 400), children: [
    value.radius !== void 0 && /* @__PURE__ */ jsxs("p", { children: [
      "Visual radius: ",
      normalizeGraphNodeRadius(value.radius),
      ". Radius meaning:",
      " ",
      radiusMeaningText(value)
    ] }),
    value.detail && /* @__PURE__ */ jsxs("p", { children: [
      "Detail: ",
      safeDiagnosticText(value.detail, 1e3)
    ] }),
    value.attributes && Object.keys(value.attributes).length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "All attributes" }),
      /* @__PURE__ */ jsx("dl", { children: Object.entries(value.attributes).map(([key, item]) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { children: safeDiagnosticText(key, 80) }),
        /* @__PURE__ */ jsx("dd", { children: fullAttributeValueText(item) })
      ] }, key)) })
    ] }),
    value.epistemic && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "Full epistemic status" }),
      /* @__PURE__ */ jsxs("dl", { children: [
        /* @__PURE__ */ jsx("dt", { children: "Status" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(value.epistemic.status, 80) }),
        /* @__PURE__ */ jsx("dt", { children: "Advisory only" }),
        /* @__PURE__ */ jsx("dd", { children: String(value.epistemic.advisory_only) }),
        /* @__PURE__ */ jsx("dt", { children: "Paper-local evidence" }),
        /* @__PURE__ */ jsx("dd", { children: String(value.epistemic.is_paper_local_evidence) }),
        /* @__PURE__ */ jsx("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ jsx("dd", { children: String(value.epistemic.calibrated_posterior) })
      ] })
    ] }),
    value.evidence && value.evidence.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("p", { children: [
        "All evidence references (",
        value.evidence.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("ol", { children: value.evidence.map((item) => /* @__PURE__ */ jsx("li", { children: fullEvidenceRefText(item) }, item.evidence_id)) })
    ] }),
    value.uncalibrated_score && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "Full uncalibrated score" }),
      /* @__PURE__ */ jsxs("dl", { children: [
        /* @__PURE__ */ jsx("dt", { children: "Kind" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(value.uncalibrated_score.kind, 80) }),
        /* @__PURE__ */ jsx("dt", { children: "Value" }),
        /* @__PURE__ */ jsx("dd", { children: value.uncalibrated_score.value }),
        /* @__PURE__ */ jsx("dt", { children: "Calibrated posterior" }),
        /* @__PURE__ */ jsx("dd", { children: String(value.uncalibrated_score.calibrated_posterior) })
      ] })
    ] })
  ] });
}
function MetadataDisclosure({
  value,
  label
}) {
  const [expanded, setExpanded] = useState(false);
  if (!hasMetadata(value)) return null;
  return /* @__PURE__ */ jsxs("details", { onToggle: (event) => setExpanded(event.currentTarget.open), children: [
    /* @__PURE__ */ jsxs("summary", { style: { minHeight: 44 }, children: [
      "Browse full metadata for ",
      safeDiagnosticText(label, 400)
    ] }),
    expanded && /* @__PURE__ */ jsx(FullMetadata, { value, label: `Full metadata for ${label}` })
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
function KnowledgeGraphA11yList({
  nodes,
  edges,
  selectedId,
  onSelect,
  query = "",
  className,
  label = "Knowledge graph nodes",
  nodePageSize = DEFAULT_A11Y_NODE_PAGE_SIZE
}) {
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  assertUniqueGraphNodeIds(nodes);
  assertRenderableGraphEdges(nodes, edges);
  const instanceId = useId().replace(/:/g, "");
  const safePageSize = Number.isSafeInteger(nodePageSize) ? Math.min(MAX_A11Y_NODE_PAGE_SIZE, Math.max(1, nodePageSize)) : DEFAULT_A11Y_NODE_PAGE_SIZE;
  const { rows, validEdges, byId } = useMemo(() => {
    const byId2 = new Map(nodes.map((node) => [node.id, node]));
    const validEdges2 = filterGraphEdges(new Set(byId2.keys()), edges);
    const relations = /* @__PURE__ */ new Map();
    for (const node of nodes) relations.set(node.id, []);
    for (let index = 0; index < validEdges2.length; index++) {
      const edge = validEdges2[index];
      const source = byId2.get(edge.source);
      const target = byId2.get(edge.target);
      if (!source || !target || source.id === target.id) continue;
      relations.get(source.id)?.push(index);
      relations.get(target.id)?.push(index);
    }
    const normalizedQuery = normalizeGraphQuery(query);
    const matchingNodeIds = graphQueryMatchIds(nodes, normalizedQuery, validEdges2);
    const rows2 = nodes.filter(
      (node) => node.id === selectedId || matchingNodeIds.has(node.id)
    ).map((node) => ({ node, relationIndexes: relations.get(node.id) ?? [] }));
    return { rows: rows2, validEdges: validEdges2, byId: byId2 };
  }, [nodes, edges, query, selectedId]);
  const [nodePage, setNodePage] = useState(() => {
    const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
    return selectedIndex < 0 ? 0 : Math.floor(selectedIndex / safePageSize);
  });
  const nodePageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const currentNodePage = Math.min(nodePage, nodePageCount - 1);
  const visibleRows = rows.slice(
    currentNodePage * safePageSize,
    (currentNodePage + 1) * safePageSize
  );
  useEffect(() => setNodePage(0), [query, safePageSize]);
  useEffect(() => {
    const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
    if (selectedIndex >= 0) setNodePage(Math.floor(selectedIndex / safePageSize));
    else setNodePage((page) => Math.min(page, nodePageCount - 1));
  }, [rows, selectedId, safePageSize, nodePageCount]);
  return /* @__PURE__ */ jsxs("section", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    rows.length === 0 ? /* @__PURE__ */ jsx("p", { role: "status", children: "No graph nodes match this view." }) : /* @__PURE__ */ jsx("ul", { children: visibleRows.map(({ node, relationIndexes }, rowOffset) => {
      const rowIndex = currentNodePage * safePageSize + rowOffset;
      const detailsId = `cortexel-kg-${instanceId}-${rowIndex}-details`;
      const preview = relationIndexes.slice(0, INLINE_RELATION_LIMIT).map((index) => relationshipText(node.id, validEdges[index], byId));
      const omitted = relationIndexes.length - preview.length;
      const nodeMetadata = metadataSummary(node);
      return /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsxs("span", { id: detailsId, children: [
          safeDiagnosticText(node.kind, 80),
          ". Node id",
          " ",
          safeDiagnosticText(node.id, 120),
          ".",
          " ",
          nodeMetadata ? `${nodeMetadata}. ` : "",
          preview.length > 0 ? `${preview.join("; ")}${omitted > 0 ? `; ${omitted} more relationships` : ""}` : "No rendered relationships."
        ] }),
        selectedId === node.id && /* @__PURE__ */ jsx(MetadataDisclosure, { value: node, label: `node ${node.label}` }),
        selectedId === node.id && relationIndexes.length > 0 && /* @__PURE__ */ jsx(
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
    rows.length > safePageSize && /* @__PURE__ */ jsxs("nav", { "aria-label": "Knowledge graph node pages", children: [
      /* @__PURE__ */ jsxs("p", { "aria-live": "polite", children: [
        "Node page ",
        currentNodePage + 1,
        " of ",
        nodePageCount,
        "; ",
        rows.length,
        " nodes"
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: currentNodePage === 0,
          onClick: () => setNodePage((page) => Math.max(0, page - 1)),
          style: { minWidth: 44, minHeight: 44 },
          children: "Previous nodes"
        }
      ),
      /* @__PURE__ */ jsx(
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
  assertUniqueGraphNodeIds(nodes);
  assertRenderableGraphEdges(nodes, edges);
  const { nodeEntries, edgeEntries } = useMemo(() => {
    const nodeGroups = /* @__PURE__ */ new Map();
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
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
    const validEdges = filterGraphEdges(new Set(nodes.map(({ id }) => id)), edges);
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
    const nodeEntries2 = [...nodeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || (a.radiusMeaning === b.radiusMeaning ? 0 : a.radiusMeaning < b.radiusMeaning ? -1 : 1));
    const edgeEntries2 = [...edgeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || Number(a.directed) - Number(b.directed) || Number(a.particles) - Number(b.particles));
    return { nodeEntries: nodeEntries2, edgeEntries: edgeEntries2 };
  }, [nodes, edges]);
  const swatchStyle = (color) => ({
    display: "inline-block",
    width: 16,
    height: 16,
    marginRight: 8,
    border: "1px solid currentColor",
    backgroundColor: color
  });
  return /* @__PURE__ */ jsxs("aside", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    context && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "Graph context" }),
      /* @__PURE__ */ jsxs("dl", { children: [
        /* @__PURE__ */ jsx("dt", { children: "Graph id" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_id, 160) }),
        /* @__PURE__ */ jsx("dt", { children: "Graph source" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_source, 200) }),
        /* @__PURE__ */ jsx("dt", { children: "Graph snapshot id" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_snapshot_id, 200) }),
        /* @__PURE__ */ jsx("dt", { children: "Graph scope" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_scope, 80) }),
        /* @__PURE__ */ jsx("dt", { children: "Generated at" }),
        /* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.generated_at, 80) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("p", { children: "Node kinds" }),
    nodeEntries.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No rendered nodes." }) : /* @__PURE__ */ jsx("ul", { children: nodeEntries.map((entry) => /* @__PURE__ */ jsxs("li", { children: [
      /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: swatchStyle(entry.color) }),
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
    /* @__PURE__ */ jsx("p", { children: "Relationship kinds" }),
    edgeEntries.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No rendered relationships." }) : /* @__PURE__ */ jsx("ul", { children: edgeEntries.map((entry) => /* @__PURE__ */ jsxs("li", { children: [
      /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: swatchStyle(entry.color) }),
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
    /* @__PURE__ */ jsx("p", { role: "note", children: "Layout positions and distances are schematic, not quantitative evidence." })
  ] });
}
function RelationshipPager({
  nodeId,
  relationIndexes,
  edges,
  byId
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(relationIndexes.length / RELATION_PAGE_SIZE);
  useEffect(() => setPage(0), [nodeId, relationIndexes]);
  const start = page * RELATION_PAGE_SIZE;
  return /* @__PURE__ */ jsxs("details", { children: [
    /* @__PURE__ */ jsxs("summary", { style: { minHeight: 44 }, children: [
      "Browse all ",
      relationIndexes.length,
      " relationships"
    ] }),
    /* @__PURE__ */ jsx("ul", { children: relationIndexes.slice(start, start + RELATION_PAGE_SIZE).map((edgeIndex) => {
      const edge = edges[edgeIndex];
      const edgeLabel = edge.id ?? `${edge.kind} relationship`;
      return /* @__PURE__ */ jsxs("li", { children: [
        relationshipText(nodeId, edge, byId),
        /* @__PURE__ */ jsx(MetadataDisclosure, { value: edge, label: `relationship ${edgeLabel}` })
      ] }, `${edgeIndex}-${nodeId}`);
    }) }),
    /* @__PURE__ */ jsxs("p", { "aria-live": "polite", children: [
      "Page ",
      page + 1,
      " of ",
      pageCount
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: page === 0,
        onClick: () => setPage((current) => Math.max(0, current - 1)),
        style: { minWidth: 44, minHeight: 44 },
        children: "Previous relationships"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: page + 1 >= pageCount,
        onClick: () => setPage((current) => Math.min(pageCount - 1, current + 1)),
        style: { minWidth: 44, minHeight: 44 },
        children: "Next relationships"
      }
    )
  ] });
}

// react/KnowledgeGraph3DScene.tsx
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var PARTICLES_PER_EDGE = 4;
var MAX_PARTICLES = 4e3;
var FALLBACK_COLOR = "#64748b";
var MAX_REMEMBERED_POSITIONS = 5e3;
var _dummy = new THREE.Object3D();
var _color = new THREE.Color();
var _dimTarget = new THREE.Color("#030711");
var _a = new THREE.Vector3();
var _b = new THREE.Vector3();
var _curveControl = new THREE.Vector3();
var _curvePoint = new THREE.Vector3();
var _curveNext = new THREE.Vector3();
var _direction = new THREE.Vector3();
var _up = new THREE.Vector3(0, 1, 0);
var _box = new THREE.Box3();
var _sphere = new THREE.Sphere();
var _layoutClockResult = { ticks: 0, remainderSeconds: 0 };
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
function FocusLabelSprite({ text, color }) {
  const label = safeDiagnosticText(text, 120);
  const rendered = useMemo2(() => {
    if (!label || typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;
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
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { texture, aspect: canvas.width / canvas.height };
  }, [label, color]);
  useEffect2(() => () => rendered?.texture.dispose(), [rendered]);
  if (!rendered) return null;
  return /* @__PURE__ */ jsx2("sprite", { scale: [Math.min(160, rendered.aspect * 7), 7, 1], children: /* @__PURE__ */ jsx2(
    "spriteMaterial",
    {
      map: rendered.texture,
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
function KnowledgeGraph3DScene({
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
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  assertUniqueGraphNodeIds(nodes);
  assertRenderableGraphEdges(nodes, edges);
  const meshRef = useRef(null);
  const linesRef = useRef(null);
  const particlesRef = useRef(null);
  const arrowsRef = useRef(null);
  const labelGroupRef = useRef(null);
  const { camera, gl, invalidate } = useThree();
  const posMap = useRef(/* @__PURE__ */ new Map());
  const framedRef = useRef(false);
  const flyToIdRef = useRef(null);
  const onHoverRef = useRef(onHover);
  useEffect2(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  useEffect2(() => () => onHoverRef.current(null), []);
  const attachedControlsRef = useRef(null);
  const onUserGrabRef = useRef(() => {
    framedRef.current = true;
    flyToIdRef.current = null;
  });
  useEffect2(
    () => () => {
      attachedControlsRef.current?.removeEventListener?.("start", onUserGrabRef.current);
      attachedControlsRef.current = null;
    },
    []
  );
  const graphKey = useMemo2(() => graphSignature(nodes, edges), [nodes, edges]);
  const normalizedQuery = useMemo2(() => normalizeGraphQuery(query), [query]);
  const queryMatchIds = useMemo2(
    () => graphQueryMatchIds(nodes, normalizedQuery, edges),
    [nodes, edges, normalizedQuery]
  );
  const queryActive = normalizedQuery.length > 0;
  const { simNodes, simLinks, validEdges, edgeLanes, index, warmStart } = useMemo2(() => {
    const index2 = /* @__PURE__ */ new Map();
    let warmStart2 = false;
    const simNodes2 = nodes.map((n, i) => {
      index2.set(n.id, i);
      const r = normalizeGraphNodeRadius(n.radius);
      const prev = posMap.current.get(n.id);
      if (prev) warmStart2 = true;
      else posMap.current.set(n.id, [0, 0, 0]);
      return prev ? { id: n.id, r, x: prev[0], y: prev[1], z: prev[2] } : { id: n.id, r };
    });
    const validEdges2 = filterGraphEdges(new Set(index2.keys()), edges);
    const edgeLanes2 = assignGraphEdgeLanes(validEdges2);
    const simLinks2 = uniqueGraphTopologyLinks(validEdges2);
    if (posMap.current.size > MAX_REMEMBERED_POSITIONS) {
      for (const key of posMap.current.keys()) {
        if (!index2.has(key)) posMap.current.delete(key);
      }
    }
    return { simNodes: simNodes2, simLinks: simLinks2, validEdges: validEdges2, edgeLanes: edgeLanes2, index: index2, warmStart: warmStart2 };
  }, [graphKey]);
  const neighbors = useMemo2(
    () => buildAdjacency(new Set(index.keys()), validEdges),
    [index, validEdges]
  );
  useEffect2(() => {
    if (hoverId == null || !index.has(hoverId)) return;
    const element = gl.domElement;
    const previous = element.style.cursor;
    element.style.cursor = "pointer";
    return () => {
      element.style.cursor = previous;
    };
  }, [gl, hoverId, index]);
  const flowEdges = useMemo2(
    () => edgeLanes.filter(({ edge }) => edge.particles),
    [edgeLanes]
  );
  const directedEdges = useMemo2(
    () => edgeLanes.filter(({ edge }) => edge.directed !== false),
    [edgeLanes]
  );
  const particleCount = flowParticleCount(
    flowEdges.length,
    PARTICLES_PER_EDGE,
    MAX_PARTICLES
  );
  useEffect2(() => {
    if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) {
      devWarn(
        `KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ${MAX_PARTICLES}-particle cap; some citation flows are not animated.`
      );
    }
  }, [flowEdges.length]);
  const linePos = useMemo2(
    () => new Float32Array(validEdges.length * GRAPH_EDGE_CURVE_SEGMENTS * 6),
    [validEdges]
  );
  const lineCol = useMemo2(
    () => new Float32Array(validEdges.length * GRAPH_EDGE_CURVE_SEGMENTS * 6),
    [validEdges]
  );
  const simRef = useRef(null);
  const layoutTickAccumulatorRef = useRef(0);
  const geometryDirtyRef = useRef(true);
  const flowTimeRef = useRef(0);
  useEffect2(() => {
    const linkForce = forceLink(simLinks).id((d) => d.id).distance(34).strength(0.35);
    const sim = forceSimulation(simNodes, 3).force("charge", forceManyBody().strength(-140).distanceMax(600)).force("link", linkForce).force("center", forceCenter(0, 0, 0).strength(0.04)).force("collide", forceCollide((d) => d.r + 3).iterations(2)).alpha(warmStart ? 0.5 : 1).alphaDecay(0.018).velocityDecay(0.42).stop();
    if (reducedMotion) {
      const budget = reducedMotionLayoutTickBudget(simNodes.length, simLinks.length);
      for (let i = 0; i < budget && sim.alpha() > 8e-3; i++) sim.tick();
      sim.alpha(0);
    }
    simRef.current = sim;
    layoutTickAccumulatorRef.current = 0;
    geometryDirtyRef.current = true;
    invalidate();
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [simNodes, simLinks, warmStart, reducedMotion, invalidate]);
  const applyEmphasis = useCallback(() => {
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
      nodes.forEach((n, i) => {
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
    nodes,
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
  useLayoutEffect(() => {
    applyEmphasis();
    geometryDirtyRef.current = true;
    invalidate();
  }, [applyEmphasis, invalidate]);
  useEffect2(() => {
    flyToIdRef.current = flyToSelection && selectedId && index.has(selectedId) ? selectedId : null;
    if (flyToIdRef.current) invalidate();
  }, [selectedId, index, flyToSelection, invalidate]);
  useFrame((_, delta) => {
    const sim = simRef.current;
    const mesh = meshRef.current;
    if (!sim || !mesh) return;
    const controls = controlsRef?.current ?? null;
    if (controls !== attachedControlsRef.current) {
      attachedControlsRef.current?.removeEventListener?.("start", onUserGrabRef.current);
      controls?.addEventListener?.("start", onUserGrabRef.current);
      attachedControlsRef.current = controls;
    }
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
    if (positionsChanged) {
      _dummy.quaternion.identity();
      for (let i = 0; i < simNodes.length; i++) {
        const n = simNodes[i];
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        const z = n.z ?? 0;
        const previous = posMap.current.get(n.id);
        if (previous) {
          previous[0] = x;
          previous[1] = y;
          previous[2] = z;
        }
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
      geometryDirtyRef.current = false;
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
        for (let q = 0; q < PARTICLES_PER_EDGE && p < particleCount; q++) {
          const frac = (base + phase + q / PARTICLES_PER_EDGE) % 1;
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
      framedRef.current = true;
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
    }
    if (flyToIdRef.current) {
      const fi = index.get(flyToIdRef.current);
      if (fi == null) {
        flyToIdRef.current = null;
      } else if (controls) {
        const n = simNodes[fi];
        _a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        controls.target.lerp(_a, reducedMotion ? 1 : Math.min(1, delta * 3));
        controls.update();
        if (controls.target.distanceTo(_a) < 0.5) flyToIdRef.current = null;
      } else {
        flyToIdRef.current = null;
      }
    }
    if (sim.alpha() > 8e-3 || !reducedMotion && particleCount > 0 || flyToIdRef.current !== null) {
      invalidate();
    }
  });
  const focusLabel = useMemo2(() => {
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusIndex = focus ? index.get(focus) : void 0;
    return focusIndex == null ? "" : nodes[focusIndex]?.label ?? "";
  }, [hoverId, selectedId, index, nodes]);
  const handleMove = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.instanceId == null || e.instanceId >= nodes.length) return;
      const id = nodes[e.instanceId].id;
      if (id !== hoverId) onHover(id);
    },
    [nodes, onHover, hoverId]
  );
  const handleOut = useCallback(() => onHover(null), [onHover]);
  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < nodes.length) onSelect(nodes[e.instanceId].id);
    },
    [nodes, onSelect]
  );
  return /* @__PURE__ */ jsxs2(Fragment2, { children: [
    nodes.length > 0 ? /* @__PURE__ */ jsxs2(
      "instancedMesh",
      {
        ref: meshRef,
        args: [void 0, void 0, nodes.length],
        frustumCulled: false,
        onPointerMove: handleMove,
        onPointerOut: handleOut,
        onClick: handleClick,
        children: [
          /* @__PURE__ */ jsx2("sphereGeometry", { args: [1, 20, 20] }),
          /* @__PURE__ */ jsx2("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `nodes-${nodes.length}`
    ) : null,
    /* @__PURE__ */ jsxs2("lineSegments", { ref: linesRef, frustumCulled: false, children: [
      /* @__PURE__ */ jsxs2("bufferGeometry", { children: [
        /* @__PURE__ */ jsx2("bufferAttribute", { attach: "attributes-position", args: [linePos, 3] }),
        /* @__PURE__ */ jsx2("bufferAttribute", { attach: "attributes-color", args: [lineCol, 3] })
      ] }),
      /* @__PURE__ */ jsx2(
        "lineBasicMaterial",
        {
          vertexColors: true,
          transparent: true,
          opacity: 0.75,
          toneMapped: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        }
      )
    ] }, `lines-${validEdges.length}`),
    directedEdges.length > 0 ? /* @__PURE__ */ jsxs2(
      "instancedMesh",
      {
        ref: arrowsRef,
        args: [void 0, void 0, directedEdges.length],
        frustumCulled: false,
        children: [
          /* @__PURE__ */ jsx2("coneGeometry", { args: [1, 1, 8] }),
          /* @__PURE__ */ jsx2("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `arrows-${directedEdges.length}`
    ) : null,
    particleCount > 0 ? /* @__PURE__ */ jsxs2(
      "instancedMesh",
      {
        ref: particlesRef,
        args: [void 0, void 0, particleCount],
        frustumCulled: false,
        children: [
          /* @__PURE__ */ jsx2("sphereGeometry", { args: [0.6, 6, 6] }),
          /* @__PURE__ */ jsx2(
            "meshBasicMaterial",
            {
              color: particleColor,
              toneMapped: false,
              transparent: true,
              opacity: 0.9,
              depthWrite: false,
              blending: THREE.AdditiveBlending
            }
          )
        ]
      },
      `p-${particleCount}`
    ) : null,
    /* @__PURE__ */ jsx2("group", { ref: labelGroupRef, visible: false, children: /* @__PURE__ */ jsx2(FocusLabelSprite, { text: focusLabel, color: labelColor }) })
  ] });
}
export {
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
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  assignGraphEdgeLanes,
  buildAdjacency,
  defaultEdgeStyles,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
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
};
//# sourceMappingURL=knowledge-graph.js.map