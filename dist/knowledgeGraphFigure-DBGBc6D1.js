import { En as validatePalette, a as validateSpec, bn as getPalette, q as KnowledgeGraph3DParamsSchema, un as SEMANTIC_PALETTE_KEYS } from "./authoring-C_HlbARb.js";
import { d as safeErrorMessage, n as KNOWLEDGE_GRAPH_LIMITS, o as formatValidationIssues, t as KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS, u as safeDiagnosticText } from "./knowledgeGraphLimits-Du09-etI.js";
import { t as parseJsonStrict } from "./parse-json-BkdHHhtc.js";
import { _ as canonicalGraphNodePair, g as deriveKnowledgeGraphContextIdentity, n as CORPUS_NODE_GLYPH_BY_KIND, r as KNOWLEDGE_GRAPH_BACKGROUND_COLORS, t as CORPUS_EDGE_STROKE_PATTERN_BY_KIND, v as graphEdgeIdentityKey } from "./knowledgeGraphVisualEncoding.internal-Bk0I-Mgt.js";
import { KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1, prepareCorpusKnowledgeGraphPresentation, prepareKnowledgeGraphView } from "#cortexel-knowledge-graph-presentation-capability";

//#region react/knowledgeGraph.ts
const MAX_GRAPH_QUERY_LENGTH = 500;
const DEFAULT_GRAPH_NODE_RADIUS = 4;
/** Collision radii far above the 34-unit link distance create pathological
* synchronous force work without adding useful visual resolution. */
const MAX_GRAPH_NODE_RADIUS = 64;
/** Accepted presentation/inspection/DOM bounds, in parity with the params gate. */
const MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES = KNOWLEDGE_GRAPH_LIMITS.maxPresentationNodes;
const MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES = KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges;
/**
* Conservative main-thread d3-force ceilings. The exact repository/package-smoke
* runtime uses d3 3.0.6, whose forces build fresh spatial indexes every tick.
* The supported peer range has no transitive allocation/performance certificate;
* these bounds make no browser-, device-, frame-rate-, or latency guarantee.
*/
const MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES = KNOWLEDGE_GRAPH_LIMITS.maxLiveForceNodes;
const MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES = KNOWLEDGE_GRAPH_LIMITS.maxLiveForceEdges;
/** Twelve quadratic chords retain bounded geometry while admitting four closed,
* color-independent relationship stroke patterns within the live-force ceiling. */
const GRAPH_EDGE_CURVE_SEGMENTS = 12;
const GRAPH_EDGE_LANE_SPACING = 6;
/** Evidence graphs may carry several independent assertions for one entity pair,
* but an unbounded bundle is neither readable nor cheap to route interactively. */
const MAX_GRAPH_PARALLEL_EDGES = KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair;
const MAX_GRAPH_EDGE_LANE_OFFSET = (MAX_GRAPH_PARALLEL_EDGES - 1) / 2 * 6;
const DEFAULT_CORPUS_GRAPH_BASE_RADIUS = 4;
const DEFAULT_CORPUS_GRAPH_DEGREE_SCALE = 1.4;
const DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP = 8;
/** Exact disclosure for the radius mapping actually returned to the scene. */
function corpusGraphRadiusMeaning(baseRadius, degreeScale, maxRadiusBump) {
	if (degreeScale === 0 || maxRadiusBump === 0) return `Constant schematic radius ${String(baseRadius)} world units; relationship degree is not encoded; not quantitative evidence.`;
	return `Schematic radius = ${String(baseRadius)} + min(${String(maxRadiusBump)}, sqrt(relationship degree in the complete mapped snapshot before host-side view filters) × ${String(degreeScale)}) world units; not quantitative evidence.`;
}
const CORPUS_GRAPH_RADIUS_MEANING = corpusGraphRadiusMeaning(DEFAULT_CORPUS_GRAPH_BASE_RADIUS, DEFAULT_CORPUS_GRAPH_DEGREE_SCALE, DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP);
function assertKnowledgeGraphPresentationBudget(nodeCount, edgeCount) {
	if (!Number.isSafeInteger(nodeCount) || nodeCount < 0 || nodeCount > MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES) throw new RangeError(`knowledge graph presentation nodes must be a non-negative integer <= ${MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES}`);
	if (!Number.isSafeInteger(edgeCount) || edgeCount < 0 || edgeCount > MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES) throw new RangeError(`knowledge graph presentation edges must be a non-negative integer <= ${MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES}`);
}
function isKnowledgeGraphLiveForceWithinBudget(nodeCount, edgeCount) {
	return Number.isSafeInteger(nodeCount) && nodeCount >= 0 && nodeCount <= MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES && Number.isSafeInteger(edgeCount) && edgeCount >= 0 && edgeCount <= MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
}
function assertKnowledgeGraphLiveForceBudget(nodeCount, edgeCount) {
	if (!isKnowledgeGraphLiveForceWithinBudget(nodeCount, edgeCount)) throw new RangeError(`live knowledge-graph force layout requires non-negative integer counts <= ${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES} nodes and <= ${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES} edges`);
}
/** Exact active-view admission record for the allocating main-thread solver. */
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
/** Validate the caller-declared namespace used to remount stateful graph surfaces.
* The value is a cache boundary only; validation does not authenticate it. */
function assertKnowledgeGraphIdentity(graphIdentity) {
	if (typeof graphIdentity !== "string" || graphIdentity.length < 1 || graphIdentity.length > 1024) throw new Error("knowledge graph identity must be a non-empty string <= 1024 characters");
}
/** Direct React entrypoints share the strict skill contract's identity invariant:
* duplicate ids make edge endpoints, selection, and accessible controls ambiguous,
* so they fail closed instead of choosing an arbitrary occurrence. */
function assertUniqueGraphNodeIds(nodes) {
	const ids = /* @__PURE__ */ new Set();
	for (let index = 0; index < nodes.length; index++) {
		const id = nodes[index].id;
		if (ids.has(id)) throw new Error(`knowledge graph node id is duplicated at index ${index}`);
		ids.add(id);
	}
}
/** Direct React entrypoints must not silently discard scientific relationships.
* Identified edges are distinct assertions and therefore deduplicate by id;
* legacy id-less edges use source/target/kind plus their effective direction.
* Undirected identity is endpoint-order invariant; directed identity is not. */
function assertRenderableGraphEdges(nodes, edges) {
	const ids = /* @__PURE__ */ new Set();
	for (let index = 0; index < nodes.length; index++) ids.add(nodes[index].id);
	const relationships = /* @__PURE__ */ new Set();
	const pairCounts = /* @__PURE__ */ new Map();
	for (let index = 0; index < edges.length; index++) {
		const edge = edges[index];
		if (!ids.has(edge.source) || !ids.has(edge.target)) throw new Error(`knowledge graph edge at index ${index} has a missing endpoint`);
		if (edge.source === edge.target) throw new Error(`knowledge graph edge at index ${index} is a self-loop`);
		if (edge.directed === false && edge.particles === true) throw new Error(`knowledge graph edge at index ${index} is undirected but carries directional particles`);
		const key = graphEdgeIdentityKey(edge);
		if (relationships.has(key)) {
			const identity = typeof edge.id === "string" ? "id" : "relationship";
			throw new Error(`knowledge graph edge ${identity} is duplicated at index ${index}`);
		}
		relationships.add(key);
		const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
		const pairKey = JSON.stringify([source, target]);
		const pairCount = (pairCounts.get(pairKey) ?? 0) + 1;
		if (pairCount > MAX_GRAPH_PARALLEL_EDGES) throw new RangeError(`knowledge graph edge bundle exceeds ${MAX_GRAPH_PARALLEL_EDGES} at index ${index}`);
		pairCounts.set(pairKey, pairCount);
	}
}
/** At most one synchronous allocating refinement tick for reduced motion. */
function reducedMotionLayoutTickBudget(nodeCount, edgeCount) {
	assertKnowledgeGraphLiveForceBudget(nodeCount, edgeCount);
	return nodeCount === 0 ? 0 : 1;
}
/** Frame-rate-independent exponential damping for a host-owned camera target.
* Invalid or non-positive frame intervals make no movement; reduced motion snaps. */
function graphCameraTargetDamping(deltaSeconds, reducedMotion) {
	if (reducedMotion) return 1;
	if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
	return -Math.expm1(-3 * deltaSeconds);
}
function truncateGraphQueryWithoutSplittingPair(value) {
	if (value.length <= 500) return value;
	let end = 500;
	const last = value.charCodeAt(end - 1);
	const next = value.charCodeAt(end);
	if (last >= 55296 && last <= 56319 && next >= 56320 && next <= 57343) end--;
	return value.slice(0, end);
}
function normalizeGraphQuery(query) {
	return truncateGraphQueryWithoutSplittingPair(truncateGraphQueryWithoutSplittingPair(query).trim().toLowerCase());
}
function matchesGraphQuery(idOrLabel, labelOrKind, kindOrQuery, maybeNormalizedQuery) {
	const hasId = maybeNormalizedQuery !== void 0;
	const id = hasId ? idOrLabel : "";
	const label = hasId ? labelOrKind : idOrLabel;
	const kind = hasId ? kindOrQuery : labelOrKind;
	const normalizedQuery = hasId ? maybeNormalizedQuery : kindOrQuery;
	return normalizedQuery.length === 0 || id.toLowerCase().includes(normalizedQuery) || label.toLowerCase().includes(normalizedQuery) || kind.toLowerCase().includes(normalizedQuery);
}
const MAX_GRAPH_SEARCH_ARRAY_ITEMS = 24;
const MAX_GRAPH_SEARCH_RECORD_KEYS = 32;
const MAX_GRAPH_SEARCH_DEPTH = 3;
function graphMetadataMatchesQuery(value, normalizedQuery, depth = 0) {
	if (typeof value === "string") return value.toLowerCase().includes(normalizedQuery);
	if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value).toLowerCase().includes(normalizedQuery);
	if (value === void 0 || depth >= MAX_GRAPH_SEARCH_DEPTH) return false;
	if (Array.isArray(value)) {
		const count = Math.min(value.length, MAX_GRAPH_SEARCH_ARRAY_ITEMS);
		for (let index = 0; index < count; index++) if (graphMetadataMatchesQuery(value[index], normalizedQuery, depth + 1)) return true;
		return false;
	}
	if (typeof value !== "object") return false;
	const record = value;
	const keys = Object.keys(record);
	const count = Math.min(keys.length, MAX_GRAPH_SEARCH_RECORD_KEYS);
	for (let index = 0; index < count; index++) {
		const key = keys[index];
		if (key.toLowerCase().includes(normalizedQuery) || graphMetadataMatchesQuery(record[key], normalizedQuery, depth + 1)) return true;
	}
	return false;
}
function graphNodeMatchesQuery(node, normalizedQuery) {
	return matchesGraphQuery(node.id, node.label, node.kind, normalizedQuery) || graphMetadataMatchesQuery(node.radius, normalizedQuery) || graphMetadataMatchesQuery(node.radiusMeaning, normalizedQuery) || graphMetadataMatchesQuery(node.detail, normalizedQuery) || graphMetadataMatchesQuery(node.attributes, normalizedQuery) || graphMetadataMatchesQuery(node.epistemic, normalizedQuery) || graphMetadataMatchesQuery(node.evidence, normalizedQuery) || graphMetadataMatchesQuery(node.uncalibrated_score, normalizedQuery);
}
function graphEdgeMetadataMatchesQuery(edge, normalizedQuery) {
	return graphMetadataMatchesQuery(edge.id, normalizedQuery) || graphMetadataMatchesQuery(edge.kind, normalizedQuery) || graphMetadataMatchesQuery(edge.label, normalizedQuery) || graphMetadataMatchesQuery(edge.attributes, normalizedQuery) || graphMetadataMatchesQuery(edge.epistemic, normalizedQuery) || graphMetadataMatchesQuery(edge.evidence, normalizedQuery) || graphMetadataMatchesQuery(edge.uncalibrated_score, normalizedQuery);
}
/** Compute the exact node-id set used by query-aware scene emphasis. Matching
* evidence-shaped edge metadata reveals both incident nodes; WebGL and the DOM
* companion call this same pure helper. */
function graphQueryMatchIds(nodes, normalizedQuery, edges = []) {
	const matches = /* @__PURE__ */ new Set();
	const knownIds = /* @__PURE__ */ new Set();
	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index];
		knownIds.add(node.id);
		if (normalizedQuery.length === 0 || graphNodeMatchesQuery(node, normalizedQuery)) matches.add(node.id);
	}
	if (normalizedQuery.length > 0) for (let index = 0; index < edges.length; index++) {
		const edge = edges[index];
		if (!graphEdgeMetadataMatchesQuery(edge, normalizedQuery)) continue;
		if (knownIds.has(edge.source)) matches.add(edge.source);
		if (knownIds.has(edge.target)) matches.add(edge.target);
	}
	return matches;
}
/** Query visibility for an edge: a blank query keeps the complete graph, while
* an active query retains relationships incident to at least one matching node. */
function graphEdgeMatchesQuery(source, target, matchingNodeIds, normalizedQuery) {
	return normalizedQuery.length === 0 || matchingNodeIds.has(source) || matchingNodeIds.has(target);
}
const GRAPH_LAYOUT_TICK_SECONDS = 1 / 60;
const MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 1;
/** Advance a force-layout clock at no more than 60 simulation ticks per second
* and one tick per rendered frame, without retaining a suspended-tab backlog.
* Below 60 FPS the layout deliberately settles more slowly instead of doubling
* the allocation-heavy d3 work in a frame. Mutates and returns `out`. */
function advanceGraphLayoutClockInto(accumulatorSeconds, deltaSeconds, out) {
	const maxRemainder = GRAPH_LAYOUT_TICK_SECONDS - Number.EPSILON;
	const available = (Number.isFinite(accumulatorSeconds) && accumulatorSeconds > 0 ? Math.min(accumulatorSeconds, maxRemainder) : 0) + (Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? Math.min(deltaSeconds, GRAPH_LAYOUT_TICK_SECONDS * 1) : 0);
	const ticks = Math.min(1, Math.floor((available + Number.EPSILON) / GRAPH_LAYOUT_TICK_SECONDS));
	out.ticks = ticks;
	out.remainderSeconds = Math.min(maxRemainder, Math.max(0, available - ticks * GRAPH_LAYOUT_TICK_SECONDS));
	return out;
}
/** Allocating compatibility wrapper for callers outside the render loop. */
function advanceGraphLayoutClock(accumulatorSeconds, deltaSeconds) {
	return advanceGraphLayoutClockInto(accumulatorSeconds, deltaSeconds, {
		ticks: 0,
		remainderSeconds: 0
	});
}
function normalizeGraphNodeRadius(radius) {
	return Number.isFinite(radius) && radius > 0 && radius <= 64 ? radius : 4;
}
/** The set of edges this scene can actually render: both endpoints resolve to a
*  node id in `ids`, AND it is not a self-loop (a self-loop draws a zero-length,
*  invisible segment and stacks its particles at one point). Every scene path
*  (layout links, adjacency, endpoints, particles, emphasis) and the mapper agree
*  on this ONE definition, so their element counts can never disagree. */
function filterGraphEdges(ids, edges) {
	const seen = /* @__PURE__ */ new Set();
	return edges.filter((edge) => {
		if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) return false;
		const key = graphEdgeIdentityKey(edge);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
/** Assign deterministic, order-independent lanes to every relationship sharing
* an unordered endpoint pair. Stable edge ids are the primary assertion key;
* the legacy semantic tuple remains the fallback for id-less direct callers. */
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
		const candidate = {
			edge,
			edgeIndex,
			semanticKey
		};
		if (bundle) bundle.push(candidate);
		else bundles.set(pairKey, [candidate]);
	}
	const lanes = new Array(edges.length);
	for (const bundle of bundles.values()) {
		if (bundle.length > MAX_GRAPH_PARALLEL_EDGES) throw new RangeError(`knowledge graph edge bundle exceeds ${MAX_GRAPH_PARALLEL_EDGES}`);
		bundle.sort((a, b) => a.semanticKey < b.semanticKey ? -1 : a.semanticKey > b.semanticKey ? 1 : a.edgeIndex - b.edgeIndex);
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
/** The force layout is schematic topology, not an evidence counter. Multiple
* assertions on one node pair therefore render separately but contribute one
* canonical, undirected spring rather than silently multiplying attraction. */
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
		links.push({
			source,
			target
		});
	}
	links.sort((a, b) => a.source < b.source ? -1 : a.source > b.source ? 1 : a.target < b.target ? -1 : a.target > b.target ? 1 : 0);
	return links;
}
/** Write the shared quadratic control point for one routed edge. The Frisvad
* tangent basis is deterministic in world space and independent of the camera,
* so orbiting, reduced motion, and still capture preserve lane identity. */
function graphEdgeControlPointInto(source, target, lane, out) {
	const midpointX = (source.x + target.x) * .5;
	const midpointY = (source.y + target.y) * .5;
	const midpointZ = (source.z + target.z) * .5;
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
	if (dz < -.9999999) {
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
	const laneOffset = lane.laneOffset * 6;
	out.x = midpointX + basisX * laneOffset;
	out.y = midpointY + basisY * laneOffset;
	out.z = midpointZ + basisZ * laneOffset;
	return out;
}
/** Allocation-free quadratic Bézier evaluation shared by line chords and flow
* particles. `t` is clamped so hostile animation deltas cannot extrapolate. */
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
const GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS = 18;
/**
* Find the nearest target-side point where a routed quadratic enters the target
* glyph's conservative radial boundary, then return its unit forward tangent.
* A fixed chord scan brackets the nearest crossing and fixed bisection bounds
* work. Returns false when the complete routed curve stays inside the glyph.
*/
function graphEdgeTargetBoundaryInto(source, control, target, targetRadius, pointOut, directionOut) {
	if (!Number.isFinite(targetRadius) || targetRadius <= 0 || !Number.isFinite(source.x) || !Number.isFinite(source.y) || !Number.isFinite(source.z) || !Number.isFinite(control.x) || !Number.isFinite(control.y) || !Number.isFinite(control.z) || !Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) return false;
	const radiusSquared = targetRadius * targetRadius;
	let high = 1;
	let low = -1;
	for (let chord = 11; chord >= 0; chord--) {
		const candidate = chord / 12;
		graphEdgeCurvePointInto(source, control, target, candidate, pointOut);
		const dx = pointOut.x - target.x;
		const dy = pointOut.y - target.y;
		const dz = pointOut.z - target.z;
		if (dx * dx + dy * dy + dz * dz > radiusSquared) {
			low = candidate;
			break;
		}
		high = candidate;
	}
	if (low < 0) return false;
	for (let iteration = 0; iteration < 18; iteration++) {
		const candidate = (low + high) * .5;
		graphEdgeCurvePointInto(source, control, target, candidate, pointOut);
		const dx = pointOut.x - target.x;
		const dy = pointOut.y - target.y;
		const dz = pointOut.z - target.z;
		if (dx * dx + dy * dy + dz * dz > radiusSquared) low = candidate;
		else high = candidate;
	}
	const t = (low + high) * .5;
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
/** Undirected neighbor adjacency over the VALID edges only (dangling endpoints
*  never leak a non-node id into a node's neighbor set). */
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
/** Particle instance count for `flowEdgeCount` flow edges, capped so a dense
*  graph never blows the instanced particle buffer. Never negative. */
function flowParticleCount(flowEdgeCount, perEdge, max) {
	if (![
		flowEdgeCount,
		perEdge,
		max
	].every(Number.isFinite)) return 0;
	return Math.min(Math.max(0, Math.floor(max)), Math.max(0, Math.floor(flowEdgeCount)) * Math.max(0, Math.floor(perEdge)));
}
function graphSignatureField(value) {
	if (value === void 0) return "u;";
	const type = typeof value === "string" ? "s" : typeof value === "number" ? "n" : "b";
	const text = typeof value === "number" && Object.is(value, -0) ? "-0" : String(value);
	return `${type}${text.length}:${text}`;
}
/** Order-sensitive force-layout signature. Style, assertion identity, edge
* direction, stroke, and animation do not affect D3's node/collision/topology
* inputs, so changing them must not discard a settled simulation. Node order,
* radius/glyph collision geometry, and the exact undirected endpoint-pair set do. */
function graphLayoutSignature(nodes, edges) {
	let signature = "";
	const nodeIds = /* @__PURE__ */ new Set();
	for (const node of nodes) {
		nodeIds.add(node.id);
		signature += `N${graphSignatureField(node.id)}${graphSignatureField(node.radius)}${graphSignatureField(node.nodeGlyph)}`;
	}
	signature += "|";
	const topology = uniqueGraphTopologyLinks(edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)));
	for (const edge of topology) signature += `T${graphSignatureField(edge.source)}${graphSignatureField(edge.target)}`;
	return signature;
}
/** Order-sensitive renderer-state signature of a graph. Two renderer-equivalent
*  nodes/edges
*  arrays produce the SAME string even when their identities differ. This key
*  binds rendered edge routing/style and readiness, while `graphLayoutSignature`
*  separately controls force-simulation lifetime. Node `id`/`radius` and every
*  edge field consumed by memoized renderer state are covered, including stable
*  edge ids. Node color/label and evidence metadata are deliberately excluded
*  because they restyle or describe live without changing that state. */
function graphSignature(nodes, edges) {
	let s = "";
	for (const n of nodes) s += `N${graphSignatureField(n.id)}${graphSignatureField(n.radius)}${graphSignatureField(n.nodeGlyph)}`;
	s += "|";
	for (const e of edges) s += `E${graphSignatureField(e.id)}${graphSignatureField(e.source)}${graphSignatureField(e.target)}${graphSignatureField(e.color)}${graphSignatureField(e.kind)}${graphSignatureField((e.directed !== false ? 1 : 0) + (e.particles ? 2 : 0))}${graphSignatureField(e.edgeStrokePattern)}`;
	return s;
}
/** Default node color per kind, sampled from the active semantic palette. */
function defaultNodeColors(palette) {
	return {
		paper: palette.cyan,
		model: palette.amber,
		family: palette.violet
	};
}
/** Default edge styling per kind. Only `cites` carries flow particles (citation
*  flow); `same_as` is undirected (symmetric advisory identity). */
function defaultEdgeStyles(palette) {
	return {
		cites: {
			color: palette.excitatory,
			directed: true,
			particles: true
		},
		instantiates: {
			color: palette.teal,
			directed: true,
			particles: false
		},
		belongs_to_family: {
			color: palette.inkFaint,
			directed: true,
			particles: false
		},
		same_as: {
			color: palette.orange,
			directed: false,
			particles: false
		},
		variant_of: {
			color: palette.pink,
			directed: true,
			particles: false
		}
	};
}
const MAP_CORPUS_GRAPH_OPTION_KEYS = /* @__PURE__ */ new Set([
	"baseRadius",
	"degreeScale",
	"maxRadiusBump",
	"nodeColors",
	"edgeColors"
]);
const KNOWLEDGE_GRAPH_NODE_KINDS = /* @__PURE__ */ new Set([
	"paper",
	"model",
	"family"
]);
const KNOWLEDGE_GRAPH_EDGE_KINDS = /* @__PURE__ */ new Set([
	"cites",
	"same_as",
	"variant_of",
	"instantiates",
	"belongs_to_family"
]);
const HEX_COLOR = /^#[0-9a-f]{6}$/iu;
function ownDataRecord(value, label, allowedKeys) {
	if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError(`${label} must be a plain object`);
	const result = Object.create(null);
	for (const key of Reflect.ownKeys(value)) {
		if (typeof key !== "string" || !allowedKeys.has(key)) throw new TypeError(`${label} contains an unknown member`);
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError(`${label}.${key} must be an enumerable data property`);
		result[key] = descriptor.value;
	}
	return result;
}
function finiteRadiusOption(options, key, fallback, strictlyPositive) {
	const value = options[key];
	if (value === void 0) return fallback;
	if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0) || (strictlyPositive ? value <= 0 : value < 0)) throw new RangeError(`mapCorpusKnowledgeGraph ${key} must be a finite ${strictlyPositive ? "positive" : "non-negative"} number`);
	return value;
}
function normalizeHexColor(value, label) {
	if (typeof value !== "string" || !HEX_COLOR.test(value)) throw new TypeError(`${label} must be an exact #rrggbb hex color`);
	return value.toLowerCase();
}
function colorOverrides(value, label, allowedKeys) {
	if (value === void 0) return {};
	const record = ownDataRecord(value, label, allowedKeys);
	const result = {};
	for (const [key, color] of Object.entries(record)) result[key] = normalizeHexColor(color, `${label}.${key}`);
	return result;
}
/** Collision-free encoding of the caller-declared graph context for layout/cache
* continuity. Filtering one declared snapshot keeps this value. This is neither
* a graph-content digest nor independent authentication of any context field. */
function corpusGraphInstanceIdentity(context) {
	return deriveKnowledgeGraphContextIdentity(context);
}
/**
* Map validated `corpus.knowledge_graph` params → KnowledgeGraph3DScene props.
* Node color derives from kind; radius grows gently with total relationship degree
* so a highly connected entity reads as a hub. Edge color/direction/particles derive from kind (only
* `cites` flows particles). This package-internal bridge rechecks duplicate nodes and every
* edge's renderability. It refuses rather than discarding a dangling, self-loop,
* or duplicate scientific assertion, then preserves the complete accepted edge
* sequence.
* `opts` is trusted host configuration. Validate or materialize any untrusted value
* before this call; JavaScript Proxy traps are executable behavior, not plain data.
* The honesty boundary (same_as/variant_of are advisory, not certified sameness)
* is enforced upstream at the skill gate, not here.
*/
function mapCorpusKnowledgeGraph(params, palette, opts = {}) {
	const validatedParams = KnowledgeGraph3DParamsSchema.safeParse(params);
	if (!validatedParams.success) throw new TypeError(`mapCorpusKnowledgeGraph requires fully validated corpus.knowledge_graph params: ` + formatValidationIssues(validatedParams.error.issues));
	const checkedParams = validatedParams.data;
	assertKnowledgeGraphPresentationBudget(checkedParams.nodes.length, checkedParams.edges.length);
	assertUniqueGraphNodeIds(checkedParams.nodes);
	assertRenderableGraphEdges(checkedParams.nodes, checkedParams.edges);
	const optionValues = ownDataRecord(opts, "mapCorpusKnowledgeGraph options", MAP_CORPUS_GRAPH_OPTION_KEYS);
	const baseRadius = finiteRadiusOption(optionValues, "baseRadius", DEFAULT_CORPUS_GRAPH_BASE_RADIUS, true);
	const degreeScale = finiteRadiusOption(optionValues, "degreeScale", DEFAULT_CORPUS_GRAPH_DEGREE_SCALE, false);
	const maxRadiusBump = finiteRadiusOption(optionValues, "maxRadiusBump", DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP, false);
	if (baseRadius + maxRadiusBump > 64) throw new RangeError(`mapCorpusKnowledgeGraph baseRadius + maxRadiusBump must be <= ${64}`);
	const nodeColorOverrides = colorOverrides(optionValues.nodeColors, "mapCorpusKnowledgeGraph nodeColors", KNOWLEDGE_GRAPH_NODE_KINDS);
	const edgeColorOverrides = colorOverrides(optionValues.edgeColors, "mapCorpusKnowledgeGraph edgeColors", KNOWLEDGE_GRAPH_EDGE_KINDS);
	const nodeColors = {
		...Object.fromEntries(Object.entries(defaultNodeColors(palette)).map(([kind, color]) => [kind, normalizeHexColor(color, `palette node color ${kind}`)])),
		...nodeColorOverrides
	};
	const edgeStyles = defaultEdgeStyles(palette);
	for (const [kind, style] of Object.entries(edgeStyles)) style.color = normalizeHexColor(style.color, `palette edge color ${kind}`);
	const radiusMeaning = corpusGraphRadiusMeaning(baseRadius, degreeScale, maxRadiusBump);
	const renderableEdges = checkedParams.edges;
	const degree = /* @__PURE__ */ new Map();
	for (const e of renderableEdges) {
		degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
		degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
	}
	const nodes = checkedParams.nodes.map((n) => {
		const kind = n.kind;
		const nodeGlyph = CORPUS_NODE_GLYPH_BY_KIND[kind];
		if (nodeGlyph === void 0) throw new TypeError(`corpus knowledge-graph node ${n.id} has an invalid kind`);
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
		if (edgeStrokePattern === void 0) throw new TypeError(`corpus knowledge-graph edge ${e.source}→${e.target} has an invalid kind`);
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

//#endregion
//#region react/knowledgeGraphFigure.ts
/**
* Peer-free bind-and-prepare boundary for the experimental legacy corpus graph.
* Agents and hosts should use this instead of independently pairing a strict
* caption with a separately mapped presentation.
*/
const MATERIALIZED_SOURCE_INPUT_ASSURANCE = Object.freeze({
	boundary: "materialized_javascript_value",
	duplicateMembers: "not_observable_after_materialization"
});
const RAW_JSON_SOURCE_INPUT_ASSURANCE = Object.freeze({
	boundary: "raw_json_text",
	duplicateMembers: "rejected_before_materialization"
});
function snapshotHostPalette(value) {
	validatePalette(value);
	const snapshot = Object.create(null);
	for (const key of SEMANTIC_PALETTE_KEYS) {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor === void 0 || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) throw new TypeError(`active palette ${key} must remain an enumerable data property`);
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
	if (acceptedSource !== void 0) result.acceptedSource = Object.freeze(acceptedSource);
	return Object.freeze(result);
}
/**
* Strictly validate one self-describing legacy VizSpec, require the exact corpus
* skill and interactive intent, derive its mandatory caption, map only the
* checked params, and return one bound immutable presentation/host-policy pair.
*
* This function performs no I/O and never throws for data/policy rejection. It
* does not authenticate snapshot declarations, evidence references, mapper
* provenance, or scientific claims, and it does not make WebGL deterministic.
*/
function prepareCorpusKnowledgeGraphFigureWithAssurance(spec, options, sourceInputAssurance) {
	const gated = validateSpec(spec);
	if (!gated.ok) return {
		ok: false,
		errors: Object.freeze(gated.errors.slice(0, 16).map((error) => Object.freeze({
			code: "strict_gate_rejected",
			path: safeDiagnosticText(error.path, 240),
			message: safeDiagnosticText(error.message, 600),
			gateCode: safeDiagnosticText(error.code, 120)
		})))
	};
	if (gated.skill !== "corpus.knowledge_graph") return failure({
		code: "wrong_skill",
		path: "skill",
		message: `requires corpus.knowledge_graph; received ${safeDiagnosticText(gated.skill, 80)}`
	});
	if (gated.spec.mode !== "interactive") return failure({
		code: "unsupported_mode",
		path: "mode",
		message: "requires interactive mode; use an explicit export workflow for mode=export"
	});
	if (gated.caption === null || gated.caption.length < 1) return failure({
		code: "missing_bound_caption",
		path: "provenance",
		message: "the strict gate did not return the required honesty caption"
	});
	try {
		const palette = snapshotHostPalette(gated.spec.palette !== void 0 ? getPalette(gated.spec.palette) : options.activePalette ?? getPalette("crameri"));
		const presentation = mapCorpusKnowledgeGraph(gated.spec.params, palette);
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
			liveForceAvailability: knowledgeGraphLiveForceAvailability(view?.nodes.length ?? presentation.nodes.length, view?.edges.length ?? presentation.edges.length)
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
/**
* Materialized-value boundary for a complete corpus VizSpec. It runs the same
* strict skill, mapping, caption, view, and host-policy pipeline as the raw-text
* entry, while recording honestly that duplicate JSON members are no longer
* observable after a host has materialized the value.
*/
function prepareCorpusKnowledgeGraphFigure(spec, options = {}) {
	return prepareCorpusKnowledgeGraphFigureWithAssurance(spec, options, MATERIALIZED_SOURCE_INPUT_ASSURANCE);
}
/**
* Strict raw-text boundary for a complete corpus VizSpec. It rejects duplicate
* members and parser-budget violations before materialization, then runs the
* same strict skill, mapping, caption, view, and host-policy pipeline as the
* materialized-value entry. Ordinary rejection is returned and never thrown.
*/
function prepareCorpusKnowledgeGraphFigureJson(text, options = {}) {
	const parsed = parseJsonStrict(text, { limits: KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS });
	if (!parsed.ok) return Object.freeze({
		ok: false,
		errors: Object.freeze(parsed.errors.slice(0, 16).map((error) => Object.freeze({
			code: "raw_json_rejected",
			path: safeDiagnosticText(error.instancePath || "(input)", 240),
			message: safeDiagnosticText(error.message, 600),
			gateCode: safeDiagnosticText(error.code, 120)
		})))
	});
	return prepareCorpusKnowledgeGraphFigureWithAssurance(parsed.value, options, RAW_JSON_SOURCE_INPUT_ASSURANCE);
}

//#endregion
export { defaultNodeColors as A, graphSignature as B, assertRenderableGraphEdges as C, corpusGraphInstanceIdentity as D, buildAdjacency as E, graphEdgeCurvePointInto as F, normalizeGraphQuery as G, knowledgeGraphLiveForceAvailability as H, graphEdgeMatchesQuery as I, reducedMotionLayoutTickBudget as K, graphEdgeTargetBoundaryInto as L, flowParticleCount as M, graphCameraTargetDamping as N, corpusGraphRadiusMeaning as O, graphEdgeControlPointInto as P, graphLayoutSignature as R, assertKnowledgeGraphPresentationBudget as S, assignGraphEdgeLanes as T, matchesGraphQuery as U, isKnowledgeGraphLiveForceWithinBudget as V, normalizeGraphNodeRadius as W, MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES as _, GRAPH_EDGE_CURVE_SEGMENTS as a, assertKnowledgeGraphIdentity as b, GRAPH_LAYOUT_TICK_SECONDS as c, MAX_GRAPH_NODE_RADIUS as d, MAX_GRAPH_PARALLEL_EDGES as f, MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES as g, MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES as h, DEFAULT_GRAPH_NODE_RADIUS as i, filterGraphEdges as j, defaultEdgeStyles as k, MAX_GRAPH_EDGE_LANE_OFFSET as l, MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES as m, prepareCorpusKnowledgeGraphFigureJson as n, GRAPH_EDGE_LANE_SPACING as o, MAX_GRAPH_QUERY_LENGTH as p, uniqueGraphTopologyLinks as q, CORPUS_GRAPH_RADIUS_MEANING as r, GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS as s, prepareCorpusKnowledgeGraphFigure as t, MAX_GRAPH_LAYOUT_TICKS_PER_FRAME as u, advanceGraphLayoutClock as v, assertUniqueGraphNodeIds as w, assertKnowledgeGraphLiveForceBudget as x, advanceGraphLayoutClockInto as y, graphQueryMatchIds as z };
//# sourceMappingURL=knowledgeGraphFigure-DBGBc6D1.js.map