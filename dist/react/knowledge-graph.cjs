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
  DEFAULT_A11Y_NODE_PAGE_SIZE: () => DEFAULT_A11Y_NODE_PAGE_SIZE,
  DEFAULT_GRAPH_NODE_RADIUS: () => DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_LAYOUT_TICK_SECONDS: () => GRAPH_LAYOUT_TICK_SECONDS,
  KnowledgeGraph3DScene: () => KnowledgeGraph3DScene,
  KnowledgeGraphA11yList: () => KnowledgeGraphA11yList,
  MAX_A11Y_NODE_PAGE_SIZE: () => MAX_A11Y_NODE_PAGE_SIZE,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME: () => MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS: () => MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_QUERY_LENGTH: () => MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_SCENE_EDGES: () => MAX_KNOWLEDGE_GRAPH_SCENE_EDGES,
  MAX_KNOWLEDGE_GRAPH_SCENE_NODES: () => MAX_KNOWLEDGE_GRAPH_SCENE_NODES,
  advanceGraphLayoutClock: () => advanceGraphLayoutClock,
  assertKnowledgeGraphBudget: () => assertKnowledgeGraphBudget,
  buildAdjacency: () => buildAdjacency,
  defaultEdgeStyles: () => defaultEdgeStyles,
  defaultNodeColors: () => defaultNodeColors,
  filterGraphEdges: () => filterGraphEdges,
  flowParticleCount: () => flowParticleCount,
  graphSignature: () => graphSignature,
  mapCorpusKnowledgeGraph: () => mapCorpusKnowledgeGraph,
  matchesGraphQuery: () => matchesGraphQuery,
  normalizeGraphNodeRadius: () => normalizeGraphNodeRadius,
  normalizeGraphQuery: () => normalizeGraphQuery,
  reducedMotionLayoutTickBudget: () => reducedMotionLayoutTickBudget
});
module.exports = __toCommonJS(KnowledgeGraph3DScene_exports);
var import_react2 = require("react");
var import_fiber = require("@react-three/fiber");
var THREE = __toESM(require("three"), 1);
var import_d3_force_3d = require("d3-force-3d");

// react/knowledgeGraph.ts
var MAX_GRAPH_QUERY_LENGTH = 500;
var DEFAULT_GRAPH_NODE_RADIUS = 4;
var MAX_GRAPH_NODE_RADIUS = 64;
var MAX_KNOWLEDGE_GRAPH_SCENE_NODES = 1e3;
var MAX_KNOWLEDGE_GRAPH_SCENE_EDGES = 4e3;
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
function reducedMotionLayoutTickBudget(nodeCount, edgeCount) {
  assertKnowledgeGraphBudget(nodeCount, edgeCount);
  const estimatedWork = Math.max(1, nodeCount + Math.ceil(edgeCount / 4));
  return Math.min(8, Math.max(2, Math.floor(2e3 / estimatedWork)));
}
function normalizeGraphQuery(query) {
  return query.slice(0, MAX_GRAPH_QUERY_LENGTH).trim().toLowerCase();
}
function matchesGraphQuery(label, kind, normalizedQuery) {
  return normalizedQuery.length === 0 || label.toLowerCase().includes(normalizedQuery) || kind.toLowerCase().includes(normalizedQuery);
}
var GRAPH_LAYOUT_TICK_SECONDS = 1 / 60;
var MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 2;
function advanceGraphLayoutClock(accumulatorSeconds, deltaSeconds) {
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
  return {
    ticks,
    remainderSeconds: Math.min(
      GRAPH_LAYOUT_TICK_SECONDS,
      Math.max(0, available - ticks * GRAPH_LAYOUT_TICK_SECONDS)
    )
  };
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
    const kind = "kind" in edge && typeof edge.kind === "string" ? edge.kind : "";
    const symmetric = kind === "same_as";
    const source = symmetric && edge.source > edge.target ? edge.target : edge.source;
    const target = symmetric && edge.source > edge.target ? edge.source : edge.target;
    const key = JSON.stringify([source, target, kind]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    s += `E${field(e.source)}${field(e.target)}${field(e.color)}${field(e.kind)}${field(
      (e.directed !== false ? 1 : 0) + (e.particles ? 2 : 0)
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
      color: nodeColors[n.kind] ?? palette.inkDim,
      radius,
      kind: n.kind
    };
  });
  const edges = validEdges.map((e) => {
    const style = edgeStyles[e.kind] ?? {
      color: palette.inkFaint,
      directed: true,
      particles: false
    };
    return {
      source: e.source,
      target: e.target,
      color: style.color,
      directed: style.directed,
      kind: e.kind,
      particles: style.particles
    };
  });
  return { nodes, edges };
}

// core/safeRuntime.ts
var PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
  maxIssues: 32,
  maxPathLength: 240,
  maxMessageLength: 500,
  maxTotalLength: 8192,
  maxUnknownKeySamples: 8
});
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
var DEFAULT_A11Y_NODE_PAGE_SIZE = 100;
var MAX_A11Y_NODE_PAGE_SIZE = 200;
function relationshipText(nodeId, edge, byId) {
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  const other = source.id === nodeId ? target : source;
  const direction = edge.directed === false ? "connected to" : source.id === nodeId ? "points to" : "from";
  return `${safeDiagnosticText(edge.kind, 80)}: ${direction} ${safeDiagnosticText(other.label, 240)}`;
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
  const instanceId = (0, import_react.useId)().replace(/:/g, "");
  const safePageSize = Number.isSafeInteger(nodePageSize) ? Math.min(MAX_A11Y_NODE_PAGE_SIZE, Math.max(1, nodePageSize)) : DEFAULT_A11Y_NODE_PAGE_SIZE;
  const { rows, validEdges, byId } = (0, import_react.useMemo)(() => {
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
    const rows2 = nodes.filter(
      (node) => matchesGraphQuery(node.label, node.kind, normalizedQuery)
    ).map((node) => ({ node, relationIndexes: relations.get(node.id) ?? [] }));
    return { rows: rows2, validEdges: validEdges2, byId: byId2 };
  }, [nodes, edges, query]);
  const [nodePage, setNodePage] = (0, import_react.useState)(() => {
    const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
    return selectedIndex < 0 ? 0 : Math.floor(selectedIndex / safePageSize);
  });
  const nodePageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const currentNodePage = Math.min(nodePage, nodePageCount - 1);
  const visibleRows = rows.slice(
    currentNodePage * safePageSize,
    (currentNodePage + 1) * safePageSize
  );
  (0, import_react.useEffect)(() => setNodePage(0), [query, safePageSize]);
  (0, import_react.useEffect)(() => {
    const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
    if (selectedIndex >= 0) setNodePage(Math.floor(selectedIndex / safePageSize));
    else setNodePage((page) => Math.min(page, nodePageCount - 1));
  }, [rows, selectedId, safePageSize, nodePageCount]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className, "aria-label": safeDiagnosticText(label, 240), children: [
    rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: "No graph nodes match this view." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: visibleRows.map(({ node, relationIndexes }, rowOffset) => {
      const rowIndex = currentNodePage * safePageSize + rowOffset;
      const detailsId = `cortexel-kg-${instanceId}-${rowIndex}-details`;
      const preview = relationIndexes.slice(0, INLINE_RELATION_LIMIT).map((index) => relationshipText(node.id, validEdges[index], byId));
      const omitted = relationIndexes.length - preview.length;
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
          ".",
          " ",
          preview.length > 0 ? `${preview.join("; ")}${omitted > 0 ? `; ${omitted} more relationships` : ""}` : "No rendered relationships."
        ] }),
        selectedId === node.id && omitted > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function RelationshipPager({
  nodeId,
  relationIndexes,
  edges,
  byId
}) {
  const [page, setPage] = (0, import_react.useState)(0);
  const pageCount = Math.ceil(relationIndexes.length / RELATION_PAGE_SIZE);
  (0, import_react.useEffect)(() => setPage(0), [nodeId, relationIndexes]);
  const start = page * RELATION_PAGE_SIZE;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
      "Browse all ",
      relationIndexes.length,
      " relationships"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: relationIndexes.slice(start, start + RELATION_PAGE_SIZE).map((edgeIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: relationshipText(nodeId, edges[edgeIndex], byId) }, `${edgeIndex}-${nodeId}`)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { "aria-live": "polite", children: [
      "Page ",
      page + 1,
      " of ",
      pageCount
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        disabled: page === 0,
        onClick: () => setPage((current) => Math.max(0, current - 1)),
        style: { minWidth: 44, minHeight: 44 },
        children: "Previous relationships"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
var import_jsx_runtime2 = require("react/jsx-runtime");
var PARTICLES_PER_EDGE = 4;
var MAX_PARTICLES = 4e3;
var FALLBACK_COLOR = "#64748b";
var MAX_REMEMBERED_POSITIONS = 5e3;
var _dummy = new THREE.Object3D();
var _color = new THREE.Color();
var _dimTarget = new THREE.Color("#030711");
var _a = new THREE.Vector3();
var _b = new THREE.Vector3();
var _direction = new THREE.Vector3();
var _up = new THREE.Vector3(0, 1, 0);
var _box = new THREE.Box3();
var _sphere = new THREE.Sphere();
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
  const rendered = (0, import_react2.useMemo)(() => {
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
  (0, import_react2.useEffect)(() => () => rendered?.texture.dispose(), [rendered]);
  if (!rendered) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("sprite", { scale: [Math.min(160, rendered.aspect * 7), 7, 1], children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "spriteMaterial",
    {
      map: rendered.texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    }
  ) });
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
  const meshRef = (0, import_react2.useRef)(null);
  const linesRef = (0, import_react2.useRef)(null);
  const particlesRef = (0, import_react2.useRef)(null);
  const arrowsRef = (0, import_react2.useRef)(null);
  const labelGroupRef = (0, import_react2.useRef)(null);
  const { camera, gl, invalidate } = (0, import_fiber.useThree)();
  const posMap = (0, import_react2.useRef)(/* @__PURE__ */ new Map());
  const framedRef = (0, import_react2.useRef)(false);
  const flyToIdRef = (0, import_react2.useRef)(null);
  const onHoverRef = (0, import_react2.useRef)(onHover);
  (0, import_react2.useEffect)(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  (0, import_react2.useEffect)(() => () => onHoverRef.current(null), []);
  const attachedControlsRef = (0, import_react2.useRef)(null);
  const onUserGrabRef = (0, import_react2.useRef)(() => {
    framedRef.current = true;
    flyToIdRef.current = null;
  });
  (0, import_react2.useEffect)(
    () => () => {
      attachedControlsRef.current?.removeEventListener?.("start", onUserGrabRef.current);
      attachedControlsRef.current = null;
    },
    []
  );
  const graphKey = (0, import_react2.useMemo)(() => graphSignature(nodes, edges), [nodes, edges]);
  const { simNodes, simLinks, validEdges, index, warmStart } = (0, import_react2.useMemo)(() => {
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
    if (index2.size !== nodes.length) {
      devWarn(
        `KnowledgeGraph3DScene: ${nodes.length - index2.size} duplicate node id(s); edges, labels and the camera will bind to the last occurrence.`
      );
    }
    const validEdges2 = filterGraphEdges(new Set(index2.keys()), edges);
    const simLinks2 = validEdges2.map((e) => ({ source: e.source, target: e.target }));
    if (posMap.current.size > MAX_REMEMBERED_POSITIONS) {
      for (const key of posMap.current.keys()) {
        if (!index2.has(key)) posMap.current.delete(key);
      }
    }
    return { simNodes: simNodes2, simLinks: simLinks2, validEdges: validEdges2, index: index2, warmStart: warmStart2 };
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
  const flowEdges = (0, import_react2.useMemo)(() => validEdges.filter((e) => e.particles), [validEdges]);
  const directedEdges = (0, import_react2.useMemo)(
    () => validEdges.filter((edge) => edge.directed !== false),
    [validEdges]
  );
  const particleCount = flowParticleCount(
    flowEdges.length,
    PARTICLES_PER_EDGE,
    MAX_PARTICLES
  );
  (0, import_react2.useEffect)(() => {
    if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) {
      devWarn(
        `KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ${MAX_PARTICLES}-particle cap; some citation flows are not animated.`
      );
    }
  }, [flowEdges.length]);
  const linePos = (0, import_react2.useMemo)(() => new Float32Array(validEdges.length * 6), [validEdges]);
  const lineCol = (0, import_react2.useMemo)(() => new Float32Array(validEdges.length * 6), [validEdges]);
  const simRef = (0, import_react2.useRef)(null);
  const layoutTickAccumulatorRef = (0, import_react2.useRef)(0);
  const geometryDirtyRef = (0, import_react2.useRef)(true);
  const flowTimeRef = (0, import_react2.useRef)(0);
  (0, import_react2.useEffect)(() => {
    const linkForce = (0, import_d3_force_3d.forceLink)(simLinks).id((d) => d.id).distance(34).strength(0.35);
    const sim = (0, import_d3_force_3d.forceSimulation)(simNodes, 3).force("charge", (0, import_d3_force_3d.forceManyBody)().strength(-140).distanceMax(600)).force("link", linkForce).force("center", (0, import_d3_force_3d.forceCenter)(0, 0, 0).strength(0.04)).force("collide", (0, import_d3_force_3d.forceCollide)((d) => d.r + 3).iterations(2)).alpha(warmStart ? 0.5 : 1).alphaDecay(0.018).velocityDecay(0.42).stop();
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
  const applyEmphasis = (0, import_react2.useCallback)(() => {
    const mesh = meshRef.current;
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusSet = focus ? neighbors.get(focus) : null;
    const q = normalizeGraphQuery(query);
    const isDimmed = (id, label, kind) => {
      if (focus && id !== focus && !focusSet?.has(id)) return 0.8;
      if (!focus && !matchesGraphQuery(label, kind, q)) return 0.82;
      return 0;
    };
    if (mesh) {
      nodes.forEach((n, i) => {
        mesh.setColorAt(i, dim(n.color, isDimmed(n.id, n.label, n.kind)));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    let k = 0;
    for (const e of validEdges) {
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
    const arrows = arrowsRef.current;
    if (arrows) {
      directedEdges.forEach((edge, arrowIndex) => {
        const incident = !focus || edge.source === focus || edge.target === focus;
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
    query,
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
  }, [selectedId, index, flyToSelection, invalidate]);
  (0, import_fiber.useFrame)((_, delta) => {
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
      const advanced = advanceGraphLayoutClock(layoutTickAccumulatorRef.current, delta);
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
      for (let edgeIndex = 0; edgeIndex < validEdges.length; edgeIndex++) {
        const e = validEdges[edgeIndex];
        const s = simNodes[index.get(e.source)];
        const t = simNodes[index.get(e.target)];
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
      const arrows = arrowsRef.current;
      if (arrows) {
        for (let i = 0; i < directedEdges.length; i++) {
          const edge = directedEdges[i];
          const source = simNodes[index.get(edge.source)];
          const target = simNodes[index.get(edge.target)];
          _a.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
          _b.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
          _direction.subVectors(_b, _a);
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
        const e = flowEdges[fe];
        const s = simNodes[index.get(e.source)];
        const t = simNodes[index.get(e.target)];
        _a.set(s.x ?? 0, s.y ?? 0, s.z ?? 0);
        _b.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
        const size = focus && e.source !== focus && e.target !== focus ? 0 : 1.3;
        const phase = fe * 0.618034;
        for (let q = 0; q < PARTICLES_PER_EDGE && p < particleCount; q++) {
          const frac = (base + phase + q / PARTICLES_PER_EDGE) % 1;
          _dummy.position.copy(_a).lerp(_b, frac);
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
  const focusLabel = (0, import_react2.useMemo)(() => {
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    return focus ? nodes.find((n) => n.id === focus)?.label ?? "" : "";
  }, [hoverId, selectedId, index, nodes]);
  const handleMove = (0, import_react2.useCallback)(
    (e) => {
      e.stopPropagation();
      if (e.instanceId == null || e.instanceId >= nodes.length) return;
      const id = nodes[e.instanceId].id;
      if (id !== hoverId) onHover(id);
    },
    [nodes, onHover, hoverId]
  );
  const handleOut = (0, import_react2.useCallback)(() => onHover(null), [onHover]);
  const handleClick = (0, import_react2.useCallback)(
    (e) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < nodes.length) onSelect(nodes[e.instanceId].id);
    },
    [nodes, onSelect]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
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
          blending: THREE.AdditiveBlending
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
              blending: THREE.AdditiveBlending
            }
          )
        ]
      },
      `p-${particleCount}`
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("group", { ref: labelGroupRef, visible: false, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(FocusLabelSprite, { text: focusLabel, color: labelColor }) })
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_A11Y_NODE_PAGE_SIZE,
  DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_LAYOUT_TICK_SECONDS,
  KnowledgeGraph3DScene,
  KnowledgeGraphA11yList,
  MAX_A11Y_NODE_PAGE_SIZE,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_SCENE_EDGES,
  MAX_KNOWLEDGE_GRAPH_SCENE_NODES,
  advanceGraphLayoutClock,
  assertKnowledgeGraphBudget,
  buildAdjacency,
  defaultEdgeStyles,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  graphSignature,
  mapCorpusKnowledgeGraph,
  matchesGraphQuery,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
  reducedMotionLayoutTickBudget
});
//# sourceMappingURL=knowledge-graph.cjs.map