// Pure (THREE-free, React-free) knowledge-graph logic + the agent→scene bridge.
//
// KnowledgeGraph3DScene draws ABSTRACT nodes/edges that already carry their own
// color/radius/particles — "the caller owns all domain→visual mapping". But the
// agent-facing skill params (core/skills/params.ts KnowledgeGraph3DParamsSchema)
// carry bounded evidence-grade entity/assertion metadata. `mapCorpusKnowledgeGraph`
// is the missing bridge: it turns validated corpus.knowledge_graph params into
// ready-to-render KnowledgeGraph3DNode/Edge props using a semantic palette, so an
// agent's VizSpec renders end-to-end without every host reinventing the mapping.
//
// The small graph helpers (filterGraphEdges / buildAdjacency / flowParticleCount)
// are the exact primitives the scene uses, factored out so they are unit-tested
// (the scene itself needs a GPU/DOM to mount) and shared as one source of truth.

import type { ReadonlySemanticPalette } from '../core/colormaps';
import type { KnowledgeGraph3DParams } from '../core/skills/params';
import type {
  KnowledgeGraph3DNode,
  KnowledgeGraph3DEdge,
} from './KnowledgeGraph3DScene';

export type KnowledgeGraphNodeKind = 'paper' | 'model' | 'family';
export type KnowledgeGraphEdgeKind =
  | 'cites'
  | 'same_as'
  | 'variant_of'
  | 'instantiates'
  | 'belongs_to_family';

type ParamNode = KnowledgeGraph3DParams['nodes'][number];
type ParamEdge = KnowledgeGraph3DParams['edges'][number];
export type KnowledgeGraphAttributes = ParamNode['attributes'];
export type KnowledgeGraphEpistemic = ParamNode['epistemic'];
export type KnowledgeGraphEvidenceRef = ParamNode['evidence'][number];
export type KnowledgeGraphUncalibratedScore = NonNullable<
  ParamNode['uncalibrated_score']
>;

export const MAX_GRAPH_QUERY_LENGTH = 500;
export const DEFAULT_GRAPH_NODE_RADIUS = 4;
/** Collision radii far above the 34-unit link distance create pathological
 * synchronous force work without adding useful visual resolution. */
export const MAX_GRAPH_NODE_RADIUS = 64;
/** Browser-interactive budget, kept in parity with the agent params contract. */
export const MAX_KNOWLEDGE_GRAPH_SCENE_NODES = 1_000;
export const MAX_KNOWLEDGE_GRAPH_SCENE_EDGES = 4_000;
/** Four quadratic-curve chords keep separately identified relationships legible
 * without turning the 4,000-edge browser budget into an excessive vertex count. */
export const GRAPH_EDGE_CURVE_SEGMENTS = 4;
export const GRAPH_EDGE_LANE_SPACING = 6;
/** Evidence graphs may carry several independent assertions for one entity pair,
 * but an unbounded bundle is neither readable nor cheap to route interactively. */
export const MAX_GRAPH_PARALLEL_EDGES = 9;
export const MAX_GRAPH_EDGE_LANE_OFFSET =
  ((MAX_GRAPH_PARALLEL_EDGES - 1) / 2) * GRAPH_EDGE_LANE_SPACING;
export const CORPUS_GRAPH_RADIUS_MEANING =
  'Schematic sqrt(rendered relationship degree) scaling; not quantitative evidence.';

export function assertKnowledgeGraphBudget(nodeCount: number, edgeCount: number): void {
  if (!Number.isSafeInteger(nodeCount) || nodeCount < 0 ||
      nodeCount > MAX_KNOWLEDGE_GRAPH_SCENE_NODES) {
    throw new RangeError(
      `knowledge graph nodes must be a non-negative integer <= ${MAX_KNOWLEDGE_GRAPH_SCENE_NODES}`,
    );
  }
  if (!Number.isSafeInteger(edgeCount) || edgeCount < 0 ||
      edgeCount > MAX_KNOWLEDGE_GRAPH_SCENE_EDGES) {
    throw new RangeError(
      `knowledge graph edges must be a non-negative integer <= ${MAX_KNOWLEDGE_GRAPH_SCENE_EDGES}`,
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
  label?: string;
  attributes?: Readonly<KnowledgeGraphAttributes>;
  epistemic?: Readonly<KnowledgeGraphEpistemic>;
  evidence?: readonly KnowledgeGraphEvidenceRef[];
  uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
}

function canonicalPair(
  source: string,
  target: string,
): readonly [source: string, target: string] {
  return source <= target ? [source, target] : [target, source];
}

function graphEdgeIdentityKey(edge: GraphEdgeIdentity): string {
  if (typeof edge.id === 'string') return JSON.stringify(['id', edge.id]);
  const kind = typeof edge.kind === 'string' ? edge.kind : '';
  if (kind === 'same_as') {
    const [source, target] = canonicalPair(edge.source, edge.target);
    return JSON.stringify(['legacy-symmetric', source, target, kind]);
  }
  return JSON.stringify(['legacy-directed', edge.source, edge.target, kind]);
}

/** Direct React entrypoints must not silently discard scientific relationships.
 * Identified edges are distinct assertions and therefore deduplicate by id;
 * legacy id-less edges retain the historical source/target/kind identity. */
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
    const key = graphEdgeIdentityKey(edge);
    if (relationships.has(key)) {
      const identity = typeof edge.id === 'string' ? 'id' : 'relationship';
      throw new Error(`knowledge graph edge ${identity} is duplicated at index ${index}`);
    }
    relationships.add(key);
    const [source, target] = canonicalPair(edge.source, edge.target);
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

/** Tiny synchronous refinement used only for reduced motion. Dense maximum
 * graphs get two ticks so mounting does not become a long main-thread task. */
export function reducedMotionLayoutTickBudget(
  nodeCount: number,
  edgeCount: number,
): number {
  assertKnowledgeGraphBudget(nodeCount, edgeCount);
  const estimatedWork = Math.max(1, nodeCount + Math.ceil(edgeCount / 4));
  return Math.min(8, Math.max(2, Math.floor(2_000 / estimatedWork)));
}

export function normalizeGraphQuery(query: string): string {
  return query.slice(0, MAX_GRAPH_QUERY_LENGTH).trim().toLowerCase();
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
 * evidence-grade edge metadata reveals both incident nodes; WebGL and the DOM
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
export const MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 2;

export interface GraphLayoutClockResult {
  ticks: number;
  remainderSeconds: number;
}

/** Advance a fixed-60-Hz force-layout clock without accumulating an unbounded
 * backlog after a suspended tab. At 30+ FPS this makes wall-clock settling
 * independent of display refresh rate while capping frame work at two ticks.
 * Mutates and returns `out`, allowing useFrame callers to reuse one result. */
export function advanceGraphLayoutClockInto(
  accumulatorSeconds: number,
  deltaSeconds: number,
  out: GraphLayoutClockResult,
): GraphLayoutClockResult {
  const remainder = Number.isFinite(accumulatorSeconds) && accumulatorSeconds > 0
    ? Math.min(accumulatorSeconds, GRAPH_LAYOUT_TICK_SECONDS)
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
    GRAPH_LAYOUT_TICK_SECONDS,
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
    const [source, target] = canonicalPair(edge.source, edge.target);
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
    const [source, target] = canonicalPair(edge.source, edge.target);
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

/** Order-sensitive content signature of a graph. Two content-equal nodes/edges
 *  arrays produce the SAME string even when their identities differ, so the
 *  scene keys its simulation memo on this instead of array identity — a host
 *  that rebuilds the arrays every render (the common React pattern) never
 *  restarts a settled layout. Node `id`/`radius` and the FULL edge content are
 *  covered, including stable edge ids (they feed the memoized sim/edge snapshots);
 *  node color/label are
 *  deliberately excluded — they restyle live without a layout restart. */
export function graphSignature(
  nodes: readonly { id: string; radius?: number }[],
  edges: readonly {
    id?: string;
    source: string;
    target: string;
    color?: string;
    kind?: string;
    directed?: boolean;
    particles?: boolean;
  }[],
): string {
  const field = (value: string | number | boolean | undefined): string => {
    const text = value === undefined ? '' : String(value);
    return `${text.length}:${text}`;
  };
  let s = '';
  for (const n of nodes) s += `N${field(n.id)}${field(n.radius)}`;
  s += '|';
  for (const e of edges) {
    s += `E${field(e.id)}${field(e.source)}${field(e.target)}${field(e.color)}${field(
      e.kind,
    )}${field((e.directed !== false ? 1 : 0) + (e.particles ? 2 : 0))}`;
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
  /** Sphere radius for a degree-0 node (world units). Default 4. */
  baseRadius?: number;
  /** Extra radius per unit of sqrt(degree), capped by `maxRadiusBump`. Default 1.4. */
  degreeScale?: number;
  /** Max extra radius from degree scaling. Default 8. */
  maxRadiusBump?: number;
  /** Override node colors per kind (defaults derive from the palette). */
  nodeColors?: Partial<Record<KnowledgeGraphNodeKind, string>>;
  /** Override edge styles per kind (defaults derive from the palette). */
  edgeStyles?: Partial<Record<KnowledgeGraphEdgeKind, EdgeStyle>>;
}

export interface MappedCorpusGraph {
  context: KnowledgeGraphContext;
  nodes: KnowledgeGraph3DNode[];
  edges: KnowledgeGraph3DEdge[];
}

export interface KnowledgeGraphContext {
  graph_id: string;
  graph_source: string;
  graph_snapshot_id: string;
  graph_scope: string;
  generated_at: string;
}

/**
 * Map validated `corpus.knowledge_graph` params → KnowledgeGraph3DScene props.
 * Node color derives from kind; radius grows gently with degree so a highly-cited
 * paper reads as a hub. Edge color/direction/particles derive from kind (only
 * `cites` flows particles). The strict gate rejects dangling/self-loop edges;
 * this mapper defensively drops them for legacy programmatic callers so its
 * degree/radius calculation still matches the rendered edge set.
 * The honesty boundary (same_as/variant_of are advisory, not certified sameness)
 * is enforced upstream at the skill gate, not here.
 */
export function mapCorpusKnowledgeGraph(
  params: KnowledgeGraph3DParams,
  palette: ReadonlySemanticPalette,
  opts: MapCorpusGraphOptions = {},
): MappedCorpusGraph {
  assertKnowledgeGraphBudget(params.nodes.length, params.edges.length);
  const baseRadius =
    Number.isFinite(opts.baseRadius) && (opts.baseRadius as number) > 0
      ? (opts.baseRadius as number)
      : 4;
  const degreeScale =
    Number.isFinite(opts.degreeScale) && (opts.degreeScale as number) >= 0
      ? (opts.degreeScale as number)
      : 1.4;
  const maxRadiusBump =
    Number.isFinite(opts.maxRadiusBump) && (opts.maxRadiusBump as number) >= 0
      ? (opts.maxRadiusBump as number)
      : 8;
  const nodeColors = { ...defaultNodeColors(palette), ...opts.nodeColors };
  const edgeStyles = { ...defaultEdgeStyles(palette), ...opts.edgeStyles };

  const ids = new Set(params.nodes.map((n) => n.id));
  const validEdges = filterGraphEdges(ids, params.edges as ParamEdge[]);

  // Degree over valid edges only (matches what the scene actually draws).
  const degree = new Map<string, number>();
  for (const e of validEdges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const nodes: KnowledgeGraph3DNode[] = params.nodes.map((n: ParamNode) => {
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
      color: nodeColors[n.kind as KnowledgeGraphNodeKind] ?? palette.inkDim,
      radius,
      radiusMeaning: CORPUS_GRAPH_RADIUS_MEANING,
      kind: n.kind,
    };
  });

  const edges: KnowledgeGraph3DEdge[] = validEdges.map((e) => {
    const style = edgeStyles[e.kind as KnowledgeGraphEdgeKind] ?? {
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
      color: style.color,
      directed: style.directed,
      kind: e.kind,
      particles: style.particles,
    };
  });

  return {
    context: {
      graph_id: params.graph_id,
      graph_source: params.graph_source,
      graph_snapshot_id: params.graph_snapshot_id,
      graph_scope: params.graph_scope,
      generated_at: params.generated_at,
    },
    nodes,
    edges,
  };
}
