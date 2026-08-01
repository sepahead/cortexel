// Pure (THREE-free, React-free) knowledge-graph logic + the internal corpus bridge.
//
// KnowledgeGraph3DScene draws ABSTRACT nodes/edges that already carry their own
// color/radius/particles — "the caller owns all domain→visual mapping". But the
// agent-facing skill params (core/skills/params.ts KnowledgeGraph3DParamsSchema)
// carry bounded evidence-shaped entity/assertion metadata. The package-internal
// `mapCorpusKnowledgeGraph` turns strictly gated corpus params into ready-to-render
// records. It is deliberately absent from public entries so the resulting corpus token
// cannot bypass the caption-bound canonical composition.
//
// The small graph helpers (filterGraphEdges / buildAdjacency / flowParticleCount)
// are the exact primitives the scene uses, factored out so they are unit-tested
// (the scene itself needs a GPU/DOM to mount) and shared as one source of truth.

import type { ReadonlySemanticPalette } from '../core/colormaps';
import { KNOWLEDGE_GRAPH_LIMITS } from '../core/skills/knowledgeGraphLimits';
import {
  KnowledgeGraph3DParamsSchema,
  type KnowledgeGraph3DParams,
} from '../core/skills/params';
import { formatValidationIssues } from '../core/safeRuntime';
import type {
  KnowledgeGraph3DEdge,
  KnowledgeGraph3DNode,
  KnowledgeGraphAttributes,
  KnowledgeGraphContext,
  KnowledgeGraphEdgeKind,
  KnowledgeGraphEpistemic,
  KnowledgeGraphEvidenceRef,
  KnowledgeGraphNodeKind,
  KnowledgeGraphUncalibratedScore,
} from './knowledgeGraphPresentation.types';
export type {
  KnowledgeGraphAttributes,
  KnowledgeGraphContext,
  KnowledgeGraphEdgeKind,
  KnowledgeGraphEdgeStrokePattern,
  KnowledgeGraphEpistemic,
  KnowledgeGraphEvidenceRef,
  KnowledgeGraphNodeKind,
  KnowledgeGraphNodeGlyph,
  KnowledgeGraphUncalibratedScore,
} from './knowledgeGraphPresentation.types';
import {
  canonicalGraphNodePair,
  graphEdgeIdentityKey,
} from './knowledgeGraphIdentity.internal';
import {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  prepareCorpusKnowledgeGraphPresentation,
  type PreparedCorpusKnowledgeGraphPresentationV1,
} from './knowledgeGraphPresentation.internal';
import { deriveKnowledgeGraphContextIdentity } from
  './knowledgeGraphContextIdentity.internal';
import {
  CORPUS_EDGE_STROKE_PATTERN_BY_KIND,
  CORPUS_NODE_GLYPH_BY_KIND,
} from './knowledgeGraphVisualEncoding.internal';

type ParamNode = KnowledgeGraph3DParams['nodes'][number];
type ParamEdge = KnowledgeGraph3DParams['edges'][number];

export const MAX_GRAPH_QUERY_LENGTH = 500;
export const DEFAULT_GRAPH_NODE_RADIUS = 4;
/** Collision radii far above the 34-unit link distance create pathological
 * synchronous force work without adding useful visual resolution. */
export const MAX_GRAPH_NODE_RADIUS = 64;
/** Accepted presentation/inspection/DOM bounds, in parity with the params gate. */
export const MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES =
  KNOWLEDGE_GRAPH_LIMITS.maxPresentationNodes;
export const MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES =
  KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges;
/**
 * Conservative main-thread d3-force ceilings. The exact repository/package-smoke
 * runtime uses d3 3.0.6, whose forces build fresh spatial indexes every tick.
 * The supported peer range has no transitive allocation/performance certificate;
 * these bounds make no browser-, device-, frame-rate-, or latency guarantee.
 */
export const MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES =
  KNOWLEDGE_GRAPH_LIMITS.maxLiveForceNodes;
export const MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES =
  KNOWLEDGE_GRAPH_LIMITS.maxLiveForceEdges;
/** Twelve quadratic chords retain bounded geometry while admitting four closed,
 * color-independent relationship stroke patterns within the live-force ceiling. */
export const GRAPH_EDGE_CURVE_SEGMENTS = 12;
export const GRAPH_EDGE_LANE_SPACING = 6;
/** Evidence graphs may carry several independent assertions for one entity pair,
 * but an unbounded bundle is neither readable nor cheap to route interactively. */
export const MAX_GRAPH_PARALLEL_EDGES =
  KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair;
export const MAX_GRAPH_EDGE_LANE_OFFSET =
  ((MAX_GRAPH_PARALLEL_EDGES - 1) / 2) * GRAPH_EDGE_LANE_SPACING;

const DEFAULT_CORPUS_GRAPH_BASE_RADIUS = 4;
const DEFAULT_CORPUS_GRAPH_DEGREE_SCALE = 1.4;
const DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP = 8;

/** Exact disclosure for the radius mapping actually returned to the scene. */
export function corpusGraphRadiusMeaning(
  baseRadius: number,
  degreeScale: number,
  maxRadiusBump: number,
): string {
  if (degreeScale === 0 || maxRadiusBump === 0) {
    return `Constant schematic radius ${String(baseRadius)} world units; ` +
      'relationship degree is not encoded; not quantitative evidence.';
  }
  return `Schematic radius = ${String(baseRadius)} + min(${String(maxRadiusBump)}, ` +
    'sqrt(relationship degree in the complete mapped snapshot before host-side ' +
    `view filters) × ${String(degreeScale)}) world units; not quantitative evidence.`;
}

export const CORPUS_GRAPH_RADIUS_MEANING = corpusGraphRadiusMeaning(
  DEFAULT_CORPUS_GRAPH_BASE_RADIUS,
  DEFAULT_CORPUS_GRAPH_DEGREE_SCALE,
  DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP,
);

export function assertKnowledgeGraphPresentationBudget(
  nodeCount: number,
  edgeCount: number,
): void {
  if (!Number.isSafeInteger(nodeCount) || nodeCount < 0 ||
      nodeCount > MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES) {
    throw new RangeError(
      'knowledge graph presentation nodes must be a non-negative integer <= ' +
        `${MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES}`,
    );
  }
  if (!Number.isSafeInteger(edgeCount) || edgeCount < 0 ||
      edgeCount > MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES) {
    throw new RangeError(
      'knowledge graph presentation edges must be a non-negative integer <= ' +
        `${MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES}`,
    );
  }
}

export function isKnowledgeGraphLiveForceWithinBudget(
  nodeCount: number,
  edgeCount: number,
): boolean {
  return Number.isSafeInteger(nodeCount) && nodeCount >= 0 &&
    nodeCount <= MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES &&
    Number.isSafeInteger(edgeCount) && edgeCount >= 0 &&
    edgeCount <= MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
}

export function assertKnowledgeGraphLiveForceBudget(
  nodeCount: number,
  edgeCount: number,
): void {
  if (!isKnowledgeGraphLiveForceWithinBudget(nodeCount, edgeCount)) {
    throw new RangeError(
      'live knowledge-graph force layout requires non-negative integer counts ' +
        `<= ${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES} nodes and ` +
        `<= ${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES} edges`,
    );
  }
}

export type KnowledgeGraphLiveForceAvailabilityV1 = Readonly<{
  readonly status: 'available' | 'unavailable_resource_limit';
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly maxNodes: number;
  readonly maxEdges: number;
  readonly exceeded: readonly ('nodes' | 'edges')[];
}>;

/** Exact active-view admission record for the allocating main-thread solver. */
export function knowledgeGraphLiveForceAvailability(
  nodeCount: number,
  edgeCount: number,
): KnowledgeGraphLiveForceAvailabilityV1 {
  assertKnowledgeGraphPresentationBudget(nodeCount, edgeCount);
  const exceeded: ('nodes' | 'edges')[] = [];
  if (nodeCount > MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES) exceeded.push('nodes');
  if (edgeCount > MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES) exceeded.push('edges');
  return Object.freeze({
    status: exceeded.length === 0 ? 'available' : 'unavailable_resource_limit',
    nodeCount,
    edgeCount,
    maxNodes: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
    maxEdges: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
    exceeded: Object.freeze(exceeded),
  });
}

/** Validate the caller-declared namespace used to remount stateful graph surfaces.
 * The value is a cache boundary only; validation does not authenticate it. */
export function assertKnowledgeGraphIdentity(
  graphIdentity: unknown,
): asserts graphIdentity is string {
  if (
    typeof graphIdentity !== 'string' ||
    graphIdentity.length < 1 ||
    graphIdentity.length > 1_024
  ) {
    throw new Error(
      'knowledge graph identity must be a non-empty string <= 1024 characters',
    );
  }
}

/** Direct React entrypoints share the strict skill contract's identity invariant:
 * duplicate ids make edge endpoints, selection, and accessible controls ambiguous,
 * so they fail closed instead of choosing an arbitrary occurrence. */
export function assertUniqueGraphNodeIds(
  nodes: readonly { id: string }[],
): void {
  const ids = new Set<string>();
  for (let index = 0; index < nodes.length; index++) {
    const id = nodes[index].id;
    if (ids.has(id)) {
      throw new Error(`knowledge graph node id is duplicated at index ${index}`);
    }
    ids.add(id);
  }
}

export interface GraphEdgeIdentity {
  id?: string;
  source: string;
  target: string;
  kind?: string;
  directed?: boolean;
  particles?: boolean;
  label?: string;
  attributes?: Readonly<KnowledgeGraphAttributes>;
  epistemic?: Readonly<KnowledgeGraphEpistemic>;
  evidence?: readonly KnowledgeGraphEvidenceRef[];
  uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
}

/** Direct React entrypoints must not silently discard scientific relationships.
 * Identified edges are distinct assertions and therefore deduplicate by id;
 * legacy id-less edges use source/target/kind plus their effective direction.
 * Undirected identity is endpoint-order invariant; directed identity is not. */
export function assertRenderableGraphEdges(
  nodes: readonly { id: string }[],
  edges: readonly GraphEdgeIdentity[],
): void {
  const ids = new Set<string>();
  for (let index = 0; index < nodes.length; index++) ids.add(nodes[index].id);
  const relationships = new Set<string>();
  const pairCounts = new Map<string, number>();
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
        `knowledge graph edge at index ${index} is undirected but carries directional particles`,
      );
    }
    const key = graphEdgeIdentityKey(edge);
    if (relationships.has(key)) {
      const identity = typeof edge.id === 'string' ? 'id' : 'relationship';
      throw new Error(`knowledge graph edge ${identity} is duplicated at index ${index}`);
    }
    relationships.add(key);
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    const pairKey = JSON.stringify([source, target]);
    const pairCount = (pairCounts.get(pairKey) ?? 0) + 1;
    if (pairCount > MAX_GRAPH_PARALLEL_EDGES) {
      throw new RangeError(
        `knowledge graph edge bundle exceeds ${MAX_GRAPH_PARALLEL_EDGES} at index ${index}`,
      );
    }
    pairCounts.set(pairKey, pairCount);
  }
}

/** At most one synchronous allocating refinement tick for reduced motion. */
export function reducedMotionLayoutTickBudget(
  nodeCount: number,
  edgeCount: number,
): number {
  assertKnowledgeGraphLiveForceBudget(nodeCount, edgeCount);
  return nodeCount === 0 ? 0 : 1;
}

/** Frame-rate-independent exponential damping for a host-owned camera target.
 * Invalid or non-positive frame intervals make no movement; reduced motion snaps. */
export function graphCameraTargetDamping(
  deltaSeconds: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 1;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return -Math.expm1(-3 * deltaSeconds);
}

function truncateGraphQueryWithoutSplittingPair(value: string): string {
  if (value.length <= MAX_GRAPH_QUERY_LENGTH) return value;
  let end = MAX_GRAPH_QUERY_LENGTH;
  const last = value.charCodeAt(end - 1);
  const next = value.charCodeAt(end);
  if (
    last >= 0xd800 && last <= 0xdbff &&
    next >= 0xdc00 && next <= 0xdfff
  ) end--;
  return value.slice(0, end);
}

export function normalizeGraphQuery(query: string): string {
  // Bound work before case folding, then re-bound expansions such as U+0130.
  const boundedInput = truncateGraphQueryWithoutSplittingPair(query);
  return truncateGraphQueryWithoutSplittingPair(boundedInput.trim().toLowerCase());
}

/** Shared visual/DOM search semantics. Pass a query normalized with
 * `normalizeGraphQuery` so both surfaces reveal and dim the same nodes.
 *
 * The three-argument overload preserves the original label/kind API for direct
 * consumers. Cortexel's graph surfaces use the four-argument form so stable node
 * ids are searchable even when the human-facing label omits them. */
export function matchesGraphQuery(
  label: string,
  kind: string,
  normalizedQuery: string,
): boolean;
export function matchesGraphQuery(
  id: string,
  label: string,
  kind: string,
  normalizedQuery: string,
): boolean;
export function matchesGraphQuery(
  idOrLabel: string,
  labelOrKind: string,
  kindOrQuery: string,
  maybeNormalizedQuery?: string,
): boolean {
  const hasId = maybeNormalizedQuery !== undefined;
  const id = hasId ? idOrLabel : '';
  const label = hasId ? labelOrKind : idOrLabel;
  const kind = hasId ? kindOrQuery : labelOrKind;
  const normalizedQuery = hasId ? maybeNormalizedQuery : kindOrQuery;
  return normalizedQuery.length === 0 ||
    id.toLowerCase().includes(normalizedQuery) ||
    label.toLowerCase().includes(normalizedQuery) ||
    kind.toLowerCase().includes(normalizedQuery);
}

const MAX_GRAPH_SEARCH_ARRAY_ITEMS = 24;
const MAX_GRAPH_SEARCH_RECORD_KEYS = 32;
const MAX_GRAPH_SEARCH_DEPTH = 3;

function graphMetadataMatchesQuery(
  value: unknown,
  normalizedQuery: string,
  depth = 0,
): boolean {
  if (typeof value === 'string') {
    return value.toLowerCase().includes(normalizedQuery);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value).toLowerCase().includes(normalizedQuery);
  }
  if (value === undefined || depth >= MAX_GRAPH_SEARCH_DEPTH) return false;
  if (Array.isArray(value)) {
    const count = Math.min(value.length, MAX_GRAPH_SEARCH_ARRAY_ITEMS);
    for (let index = 0; index < count; index++) {
      if (graphMetadataMatchesQuery(value[index], normalizedQuery, depth + 1)) return true;
    }
    return false;
  }
  if (typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const count = Math.min(keys.length, MAX_GRAPH_SEARCH_RECORD_KEYS);
  for (let index = 0; index < count; index++) {
    const key = keys[index];
    if (key.toLowerCase().includes(normalizedQuery) ||
        graphMetadataMatchesQuery(record[key], normalizedQuery, depth + 1)) {
      return true;
    }
  }
  return false;
}

export interface GraphSearchNode {
  id: string;
  label: string;
  kind: string;
  radius?: number;
  radiusMeaning?: string;
  detail?: string;
  attributes?: Readonly<Record<string, unknown>>;
  epistemic?: unknown;
  evidence?: readonly unknown[];
  uncalibrated_score?: unknown;
}

function graphNodeMatchesQuery(
  node: GraphSearchNode,
  normalizedQuery: string,
): boolean {
  return matchesGraphQuery(node.id, node.label, node.kind, normalizedQuery) ||
    graphMetadataMatchesQuery(node.radius, normalizedQuery) ||
    graphMetadataMatchesQuery(node.radiusMeaning, normalizedQuery) ||
    graphMetadataMatchesQuery(node.detail, normalizedQuery) ||
    graphMetadataMatchesQuery(node.attributes, normalizedQuery) ||
    graphMetadataMatchesQuery(node.epistemic, normalizedQuery) ||
    graphMetadataMatchesQuery(node.evidence, normalizedQuery) ||
    graphMetadataMatchesQuery(node.uncalibrated_score, normalizedQuery);
}

function graphEdgeMetadataMatchesQuery(
  edge: GraphEdgeIdentity,
  normalizedQuery: string,
): boolean {
  return graphMetadataMatchesQuery(edge.id, normalizedQuery) ||
    graphMetadataMatchesQuery(edge.kind, normalizedQuery) ||
    graphMetadataMatchesQuery(edge.label, normalizedQuery) ||
    graphMetadataMatchesQuery(edge.attributes, normalizedQuery) ||
    graphMetadataMatchesQuery(edge.epistemic, normalizedQuery) ||
    graphMetadataMatchesQuery(edge.evidence, normalizedQuery) ||
    graphMetadataMatchesQuery(edge.uncalibrated_score, normalizedQuery);
}

/** Compute the exact node-id set used by query-aware scene emphasis. Matching
 * evidence-shaped edge metadata reveals both incident nodes; WebGL and the DOM
 * companion call this same pure helper. */
export function graphQueryMatchIds(
  nodes: readonly GraphSearchNode[],
  normalizedQuery: string,
  edges: readonly GraphEdgeIdentity[] = [],
): ReadonlySet<string> {
  const matches = new Set<string>();
  const knownIds = new Set<string>();
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

/** Query visibility for an edge: a blank query keeps the complete graph, while
 * an active query retains relationships incident to at least one matching node. */
export function graphEdgeMatchesQuery(
  source: string,
  target: string,
  matchingNodeIds: ReadonlySet<string>,
  normalizedQuery: string,
): boolean {
  return normalizedQuery.length === 0 ||
    matchingNodeIds.has(source) ||
    matchingNodeIds.has(target);
}

export const GRAPH_LAYOUT_TICK_SECONDS = 1 / 60;
export const MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 1;

export interface GraphLayoutClockResult {
  ticks: number;
  remainderSeconds: number;
}

/** Advance a force-layout clock at no more than 60 simulation ticks per second
 * and one tick per rendered frame, without retaining a suspended-tab backlog.
 * Below 60 FPS the layout deliberately settles more slowly instead of doubling
 * the allocation-heavy d3 work in a frame. Mutates and returns `out`. */
export function advanceGraphLayoutClockInto(
  accumulatorSeconds: number,
  deltaSeconds: number,
  out: GraphLayoutClockResult,
): GraphLayoutClockResult {
  const maxRemainder = GRAPH_LAYOUT_TICK_SECONDS - Number.EPSILON;
  const remainder = Number.isFinite(accumulatorSeconds) && accumulatorSeconds > 0
    ? Math.min(accumulatorSeconds, maxRemainder)
    : 0;
  const delta = Number.isFinite(deltaSeconds) && deltaSeconds > 0
    ? Math.min(
        deltaSeconds,
        GRAPH_LAYOUT_TICK_SECONDS * MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
      )
    : 0;
  const available = remainder + delta;
  const ticks = Math.min(
    MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
    Math.floor((available + Number.EPSILON) / GRAPH_LAYOUT_TICK_SECONDS),
  );
  out.ticks = ticks;
  out.remainderSeconds = Math.min(
    maxRemainder,
    Math.max(0, available - ticks * GRAPH_LAYOUT_TICK_SECONDS),
  );
  return out;
}

/** Allocating compatibility wrapper for callers outside the render loop. */
export function advanceGraphLayoutClock(
  accumulatorSeconds: number,
  deltaSeconds: number,
): GraphLayoutClockResult {
  return advanceGraphLayoutClockInto(
    accumulatorSeconds,
    deltaSeconds,
    { ticks: 0, remainderSeconds: 0 },
  );
}

export function normalizeGraphNodeRadius(radius: number): number {
  return Number.isFinite(radius) && radius > 0 && radius <= MAX_GRAPH_NODE_RADIUS
    ? radius
    : DEFAULT_GRAPH_NODE_RADIUS;
}

/** The set of edges this scene can actually render: both endpoints resolve to a
 *  node id in `ids`, AND it is not a self-loop (a self-loop draws a zero-length,
 *  invisible segment and stacks its particles at one point). Every scene path
 *  (layout links, adjacency, endpoints, particles, emphasis) and the mapper agree
 *  on this ONE definition, so their element counts can never disagree. */
export function filterGraphEdges<E extends GraphEdgeIdentity>(
  ids: ReadonlySet<string>,
  edges: readonly E[],
): E[] {
  const seen = new Set<string>();
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

export interface GraphEdgeLane<E extends GraphEdgeIdentity = GraphEdgeIdentity> {
  edge: E;
  edgeIndex: number;
  /** Dimensionless, centered offset: 0 for one edge, ±0.5 for two, −1/0/1 for three. */
  laneOffset: number;
  bundleSize: number;
  /** Converts the edge's source→target vector to the pair's canonical id order. */
  canonicalDirectionSign: 1 | -1;
}

interface GraphEdgeLaneCandidate<E extends GraphEdgeIdentity> {
  edge: E;
  edgeIndex: number;
  semanticKey: string;
}

/** Assign deterministic, order-independent lanes to every relationship sharing
 * an unordered endpoint pair. Stable edge ids are the primary assertion key;
 * the legacy semantic tuple remains the fallback for id-less direct callers. */
export function assignGraphEdgeLanes<E extends GraphEdgeIdentity>(
  edges: readonly E[],
): GraphEdgeLane<E>[] {
  const bundles = new Map<string, GraphEdgeLaneCandidate<E>[]>();
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    const edge = edges[edgeIndex];
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    const pairKey = JSON.stringify([source, target]);
    const semanticKey = JSON.stringify([
      graphEdgeIdentityKey(edge),
      typeof edge.kind === 'string' ? edge.kind : '',
      edge.source,
      edge.target,
    ]);
    const bundle = bundles.get(pairKey);
    const candidate = { edge, edgeIndex, semanticKey };
    if (bundle) bundle.push(candidate);
    else bundles.set(pairKey, [candidate]);
  }

  const lanes = new Array<GraphEdgeLane<E>>(edges.length);
  for (const bundle of bundles.values()) {
    if (bundle.length > MAX_GRAPH_PARALLEL_EDGES) {
      throw new RangeError(
        `knowledge graph edge bundle exceeds ${MAX_GRAPH_PARALLEL_EDGES}`,
      );
    }
    bundle.sort((a, b) =>
      a.semanticKey < b.semanticKey
        ? -1
        : a.semanticKey > b.semanticKey
          ? 1
          : a.edgeIndex - b.edgeIndex,
    );
    const center = (bundle.length - 1) / 2;
    for (let rank = 0; rank < bundle.length; rank++) {
      const candidate = bundle[rank];
      lanes[candidate.edgeIndex] = {
        edge: candidate.edge,
        edgeIndex: candidate.edgeIndex,
        laneOffset: rank - center,
        bundleSize: bundle.length,
        canonicalDirectionSign:
          candidate.edge.source <= candidate.edge.target ? 1 : -1,
      };
    }
  }
  return lanes;
}

export interface GraphTopologyLink {
  source: string;
  target: string;
}

/** The force layout is schematic topology, not an evidence counter. Multiple
 * assertions on one node pair therefore render separately but contribute one
 * canonical, undirected spring rather than silently multiplying attraction. */
export function uniqueGraphTopologyLinks(
  edges: readonly { source: string; target: string }[],
): GraphTopologyLink[] {
  const seen = new Set<string>();
  const links: GraphTopologyLink[] = [];
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index];
    if (edge.source === edge.target) continue;
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    const key = JSON.stringify([source, target]);
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ source, target });
  }
  links.sort((a, b) =>
    a.source < b.source
      ? -1
      : a.source > b.source
        ? 1
        : a.target < b.target
          ? -1
          : a.target > b.target
            ? 1
            : 0,
  );
  return links;
}

export interface GraphPoint3 {
  x: number;
  y: number;
  z: number;
}

/** Write the shared quadratic control point for one routed edge. The Frisvad
 * tangent basis is deterministic in world space and independent of the camera,
 * so orbiting, reduced motion, and still capture preserve lane identity. */
export function graphEdgeControlPointInto<T extends GraphPoint3>(
  source: Readonly<GraphPoint3>,
  target: Readonly<GraphPoint3>,
  lane: Pick<GraphEdgeLane, 'laneOffset' | 'canonicalDirectionSign'>,
  out: T,
): T {
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

  let basisX: number;
  let basisY: number;
  let basisZ: number;
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

/** Allocation-free quadratic Bézier evaluation shared by line chords and flow
 * particles. `t` is clamped so hostile animation deltas cannot extrapolate. */
export function graphEdgeCurvePointInto<T extends GraphPoint3>(
  source: Readonly<GraphPoint3>,
  control: Readonly<GraphPoint3>,
  target: Readonly<GraphPoint3>,
  t: number,
  out: T,
): T {
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

export const GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS = 18;

/**
 * Find the nearest target-side point where a routed quadratic enters the target
 * glyph's conservative radial boundary, then return its unit forward tangent.
 * A fixed chord scan brackets the nearest crossing and fixed bisection bounds
 * work. Returns false when the complete routed curve stays inside the glyph.
 */
export function graphEdgeTargetBoundaryInto<
  P extends GraphPoint3,
  D extends GraphPoint3,
>(
  source: Readonly<GraphPoint3>,
  control: Readonly<GraphPoint3>,
  target: Readonly<GraphPoint3>,
  targetRadius: number,
  pointOut: P,
  directionOut: D,
): boolean {
  if (
    !Number.isFinite(targetRadius) || targetRadius <= 0 ||
    !Number.isFinite(source.x) || !Number.isFinite(source.y) ||
    !Number.isFinite(source.z) || !Number.isFinite(control.x) ||
    !Number.isFinite(control.y) || !Number.isFinite(control.z) ||
    !Number.isFinite(target.x) || !Number.isFinite(target.y) ||
    !Number.isFinite(target.z)
  ) return false;
  const radiusSquared = targetRadius * targetRadius;
  let high = 1;
  let low = -1;
  for (let chord = GRAPH_EDGE_CURVE_SEGMENTS - 1; chord >= 0; chord--) {
    const candidate = chord / GRAPH_EDGE_CURVE_SEGMENTS;
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
  for (let iteration = 0; iteration < GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS;
    iteration++) {
    const candidate = (low + high) * 0.5;
    graphEdgeCurvePointInto(source, control, target, candidate, pointOut);
    const dx = pointOut.x - target.x;
    const dy = pointOut.y - target.y;
    const dz = pointOut.z - target.z;
    if (dx * dx + dy * dy + dz * dz > radiusSquared) low = candidate;
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

/** Undirected neighbor adjacency over the VALID edges only (dangling endpoints
 *  never leak a non-node id into a node's neighbor set). */
export function buildAdjacency(
  ids: ReadonlySet<string>,
  edges: readonly { source: string; target: string }[],
): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const id of ids) m.set(id, new Set());
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    m.get(e.source)!.add(e.target);
    m.get(e.target)!.add(e.source);
  }
  return m;
}

/** Particle instance count for `flowEdgeCount` flow edges, capped so a dense
 *  graph never blows the instanced particle buffer. Never negative. */
export function flowParticleCount(
  flowEdgeCount: number,
  perEdge: number,
  max: number,
): number {
  if (![flowEdgeCount, perEdge, max].every(Number.isFinite)) return 0;
  const edges = Math.max(0, Math.floor(flowEdgeCount));
  const each = Math.max(0, Math.floor(perEdge));
  const ceiling = Math.max(0, Math.floor(max));
  return Math.min(ceiling, edges * each);
}

/** Order-sensitive renderer-state signature of a graph. Two renderer-equivalent
 *  nodes/edges
 *  arrays produce the SAME string even when their identities differ, so the
 *  scene keys its simulation memo on this instead of array identity — a host
 *  that rebuilds the arrays every render (the common React pattern) never
 *  restarts a settled layout. Node `id`/`radius` and every edge field consumed by
 *  memoized renderer state are covered, including stable edge ids. Node
 *  color/label and evidence metadata are deliberately excluded because they
 *  restyle or describe live without changing that state. */
export function graphSignature(
  nodes: readonly { id: string; radius?: number; nodeGlyph?: string }[],
  edges: readonly {
    id?: string;
    source: string;
    target: string;
    color?: string;
    kind?: string;
    directed?: boolean;
    particles?: boolean;
    edgeStrokePattern?: string;
  }[],
): string {
  const field = (value: string | number | boolean | undefined): string => {
    if (value === undefined) return 'u;';
    const type = typeof value === 'string'
      ? 's'
      : typeof value === 'number'
        ? 'n'
        : 'b';
    const text = typeof value === 'number' && Object.is(value, -0)
      ? '-0'
      : String(value);
    return `${type}${text.length}:${text}`;
  };
  let s = '';
  for (const n of nodes) {
    s += `N${field(n.id)}${field(n.radius)}${field(n.nodeGlyph)}`;
  }
  s += '|';
  for (const e of edges) {
    s += `E${field(e.id)}${field(e.source)}${field(e.target)}${field(e.color)}${field(
      e.kind,
    )}${field((e.directed !== false ? 1 : 0) + (e.particles ? 2 : 0))}${field(
      e.edgeStrokePattern,
    )}`;
  }
  return s;
}

/** Default node color per kind, sampled from the active semantic palette. */
export function defaultNodeColors(
  palette: ReadonlySemanticPalette,
): Record<KnowledgeGraphNodeKind, string> {
  return {
    paper: palette.cyan, // sources — cool
    model: palette.amber, // implementations — warm
    family: palette.violet, // groupings — the palette endpoint
  };
}

interface EdgeStyle {
  color: string;
  directed: boolean;
  particles: boolean;
}

/** Default edge styling per kind. Only `cites` carries flow particles (citation
 *  flow); `same_as` is undirected (symmetric advisory identity). */
export function defaultEdgeStyles(
  palette: ReadonlySemanticPalette,
): Record<KnowledgeGraphEdgeKind, EdgeStyle> {
  return {
    cites: { color: palette.excitatory, directed: true, particles: true },
    instantiates: { color: palette.teal, directed: true, particles: false },
    belongs_to_family: { color: palette.inkFaint, directed: true, particles: false },
    same_as: { color: palette.orange, directed: false, particles: false },
    variant_of: { color: palette.pink, directed: true, particles: false },
  };
}

export interface MapCorpusGraphOptions {
  /** All options are trusted host-authored configuration, never raw graph or agent
   * payload. A Proxy is not an inert data boundary and must not be supplied here. */
  /** Sphere radius for a degree-0 node (world units). Default 4. */
  baseRadius?: number;
  /** Extra radius per unit of sqrt(degree), capped by `maxRadiusBump`. Default 1.4. */
  degreeScale?: number;
  /** Max extra radius from degree scaling. Default 8. */
  maxRadiusBump?: number;
  /** Override node colors per kind (defaults derive from the palette). */
  nodeColors?: Partial<Record<KnowledgeGraphNodeKind, string>>;
  /** Override edge colors only. Direction and flow are contract-owned by kind. */
  edgeColors?: Partial<Record<KnowledgeGraphEdgeKind, string>>;
}

const MAP_CORPUS_GRAPH_OPTION_KEYS = new Set([
  'baseRadius',
  'degreeScale',
  'maxRadiusBump',
  'nodeColors',
  'edgeColors',
]);
const KNOWLEDGE_GRAPH_NODE_KINDS = new Set<KnowledgeGraphNodeKind>([
  'paper',
  'model',
  'family',
]);
const KNOWLEDGE_GRAPH_EDGE_KINDS = new Set<KnowledgeGraphEdgeKind>([
  'cites',
  'same_as',
  'variant_of',
  'instantiates',
  'belongs_to_family',
]);
const HEX_COLOR = /^#[0-9a-f]{6}$/iu;

function ownDataRecord(
  value: unknown,
  label: string,
  allowedKeys: ReadonlySet<string>,
): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowedKeys.has(key)) {
      throw new TypeError(`${label} contains an unknown member`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${label}.${key} must be an enumerable data property`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function finiteRadiusOption(
  options: Readonly<Record<string, unknown>>,
  key: 'baseRadius' | 'degreeScale' | 'maxRadiusBump',
  fallback: number,
  strictlyPositive: boolean,
): number {
  const value = options[key];
  if (value === undefined) return fallback;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Object.is(value, -0) ||
    (strictlyPositive ? value <= 0 : value < 0)
  ) {
    const domain = strictlyPositive ? 'positive' : 'non-negative';
    throw new RangeError(`mapCorpusKnowledgeGraph ${key} must be a finite ${domain} number`);
  }
  return value;
}

function normalizeHexColor(value: unknown, label: string): string {
  if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
    throw new TypeError(`${label} must be an exact #rrggbb hex color`);
  }
  return value.toLowerCase();
}

function colorOverrides<K extends string>(
  value: unknown,
  label: string,
  allowedKeys: ReadonlySet<K>,
): Partial<Record<K, string>> {
  if (value === undefined) return {};
  const record = ownDataRecord(value, label, allowedKeys);
  const result: Partial<Record<K, string>> = {};
  for (const [key, color] of Object.entries(record)) {
    result[key as K] = normalizeHexColor(color, `${label}.${key}`);
  }
  return result;
}

export type MappedCorpusGraph = PreparedCorpusKnowledgeGraphPresentationV1 & {
  readonly context: Readonly<KnowledgeGraphContext>;
};

/** Collision-free encoding of the caller-declared graph context for layout/cache
 * continuity. Filtering one declared snapshot keeps this value. This is neither
 * a graph-content digest nor independent authentication of any context field. */
export function corpusGraphInstanceIdentity(
  context: KnowledgeGraphContext,
): string {
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
export function mapCorpusKnowledgeGraph(
  params: KnowledgeGraph3DParams,
  palette: ReadonlySemanticPalette,
  opts: MapCorpusGraphOptions = {},
): MappedCorpusGraph {
  const validatedParams = KnowledgeGraph3DParamsSchema.safeParse(params);
  if (!validatedParams.success) {
    throw new TypeError(
      `mapCorpusKnowledgeGraph requires fully validated corpus.knowledge_graph params: ` +
        formatValidationIssues(validatedParams.error.issues),
    );
  }
  const checkedParams = validatedParams.data;
  assertKnowledgeGraphPresentationBudget(
    checkedParams.nodes.length,
    checkedParams.edges.length,
  );
  assertUniqueGraphNodeIds(checkedParams.nodes);
  assertRenderableGraphEdges(checkedParams.nodes, checkedParams.edges);
  const optionValues = ownDataRecord(
    opts,
    'mapCorpusKnowledgeGraph options',
    MAP_CORPUS_GRAPH_OPTION_KEYS,
  );
  const baseRadius = finiteRadiusOption(
    optionValues,
    'baseRadius',
    DEFAULT_CORPUS_GRAPH_BASE_RADIUS,
    true,
  );
  const degreeScale = finiteRadiusOption(
    optionValues,
    'degreeScale',
    DEFAULT_CORPUS_GRAPH_DEGREE_SCALE,
    false,
  );
  const maxRadiusBump = finiteRadiusOption(
    optionValues,
    'maxRadiusBump',
    DEFAULT_CORPUS_GRAPH_MAX_RADIUS_BUMP,
    false,
  );
  if (baseRadius + maxRadiusBump > MAX_GRAPH_NODE_RADIUS) {
    throw new RangeError(
      `mapCorpusKnowledgeGraph baseRadius + maxRadiusBump must be <= ` +
      `${MAX_GRAPH_NODE_RADIUS}`,
    );
  }
  const nodeColorOverrides = colorOverrides(
    optionValues.nodeColors,
    'mapCorpusKnowledgeGraph nodeColors',
    KNOWLEDGE_GRAPH_NODE_KINDS,
  );
  const edgeColorOverrides = colorOverrides(
    optionValues.edgeColors,
    'mapCorpusKnowledgeGraph edgeColors',
    KNOWLEDGE_GRAPH_EDGE_KINDS,
  );
  const nodeColors = {
    ...Object.fromEntries(
      Object.entries(defaultNodeColors(palette)).map(([kind, color]) => [
        kind,
        normalizeHexColor(color, `palette node color ${kind}`),
      ]),
    ) as Record<KnowledgeGraphNodeKind, string>,
    ...nodeColorOverrides,
  };
  const edgeStyles = defaultEdgeStyles(palette);
  for (const [kind, style] of Object.entries(edgeStyles)) {
    style.color = normalizeHexColor(style.color, `palette edge color ${kind}`);
  }
  const radiusMeaning = corpusGraphRadiusMeaning(
    baseRadius,
    degreeScale,
    maxRadiusBump,
  );

  const renderableEdges = checkedParams.edges as ParamEdge[];

  // Degree over the complete accepted edge sequence (matches what the scene draws).
  const degree = new Map<string, number>();
  for (const e of renderableEdges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const nodes: KnowledgeGraph3DNode[] = checkedParams.nodes.map((n: ParamNode) => {
    const kind = n.kind as KnowledgeGraphNodeKind;
    const nodeGlyph = CORPUS_NODE_GLYPH_BY_KIND[kind];
    if (nodeGlyph === undefined) {
      throw new TypeError(`corpus knowledge-graph node ${n.id} has an invalid kind`);
    }
    const d = degree.get(n.id) ?? 0;
    const radius = baseRadius + Math.min(maxRadiusBump, Math.sqrt(d) * degreeScale);
    return {
      id: n.id,
      label: n.label,
      ...(n.detail === undefined ? {} : { detail: n.detail }),
      attributes: n.attributes,
      epistemic: n.epistemic,
      evidence: n.evidence,
      ...(n.uncalibrated_score === undefined
        ? {}
        : { uncalibrated_score: n.uncalibrated_score }),
      color: nodeColors[kind] ?? palette.inkDim,
      radius,
      radiusMeaning,
      kind: n.kind,
      nodeGlyph,
    };
  });

  const edges: KnowledgeGraph3DEdge[] = renderableEdges.map((e) => {
    const kind = e.kind as KnowledgeGraphEdgeKind;
    const edgeStrokePattern = CORPUS_EDGE_STROKE_PATTERN_BY_KIND[kind];
    if (edgeStrokePattern === undefined) {
      throw new TypeError(
        `corpus knowledge-graph edge ${e.source}→${e.target} has an invalid kind`,
      );
    }
    const style = edgeStyles[kind] ?? {
      color: palette.inkFaint,
      directed: true,
      particles: false,
    };
    const id = 'id' in e && typeof e.id === 'string' ? e.id : undefined;
    return {
      ...(id === undefined ? {} : { id }),
      label: e.label,
      attributes: e.attributes,
      epistemic: e.epistemic,
      evidence: e.evidence,
      ...(e.uncalibrated_score === undefined
        ? {}
        : { uncalibrated_score: e.uncalibrated_score }),
      source: e.source,
      target: e.target,
      color: edgeColorOverrides[kind] ?? style.color,
      directed: style.directed,
      kind: e.kind,
      particles: style.particles,
      edgeStrokePattern,
    };
  });
  assertRenderableGraphEdges(nodes, edges);

  return prepareCorpusKnowledgeGraphPresentation({
    contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
    profile: 'corpus_entity',
    context: {
      graph_id: checkedParams.graph_id,
      graph_source: checkedParams.graph_source,
      graph_snapshot_id: checkedParams.graph_snapshot_id,
      graph_scope: checkedParams.graph_scope,
      generated_at: checkedParams.generated_at,
    },
    nodes,
    edges,
  }) as MappedCorpusGraph;
}
