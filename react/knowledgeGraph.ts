// Pure (THREE-free, React-free) knowledge-graph logic + the agent→scene bridge.
//
// KnowledgeGraph3DScene draws ABSTRACT nodes/edges that already carry their own
// color/radius/particles — "the caller owns all domain→visual mapping". But the
// agent-facing skill params (core/skills/params.ts KnowledgeGraph3DParamsSchema)
// only carry id/kind/label + source/target/kind. `mapCorpusKnowledgeGraph`
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

export const MAX_GRAPH_QUERY_LENGTH = 500;
export const DEFAULT_GRAPH_NODE_RADIUS = 4;
/** Collision radii far above the 34-unit link distance create pathological
 * synchronous force work without adding useful visual resolution. */
export const MAX_GRAPH_NODE_RADIUS = 64;
/** Browser-interactive budget, kept in parity with the agent params contract. */
export const MAX_KNOWLEDGE_GRAPH_SCENE_NODES = 1_000;
export const MAX_KNOWLEDGE_GRAPH_SCENE_EDGES = 4_000;

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
 * `normalizeGraphQuery` so both surfaces reveal and dim the same nodes. */
export function matchesGraphQuery(
  label: string,
  kind: string,
  normalizedQuery: string,
): boolean {
  return normalizedQuery.length === 0 ||
    label.toLowerCase().includes(normalizedQuery) ||
    kind.toLowerCase().includes(normalizedQuery);
}

export const GRAPH_LAYOUT_TICK_SECONDS = 1 / 60;
export const MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 2;

/** Advance a fixed-60-Hz force-layout clock without accumulating an unbounded
 * backlog after a suspended tab. At 30+ FPS this makes wall-clock settling
 * independent of display refresh rate while capping frame work at two ticks. */
export function advanceGraphLayoutClock(
  accumulatorSeconds: number,
  deltaSeconds: number,
): { ticks: number; remainderSeconds: number } {
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
  return {
    ticks,
    remainderSeconds: Math.min(
      GRAPH_LAYOUT_TICK_SECONDS,
      Math.max(0, available - ticks * GRAPH_LAYOUT_TICK_SECONDS),
    ),
  };
}

export function normalizeGraphNodeRadius(radius: number): number {
  return Number.isFinite(radius) && radius > 0 && radius <= MAX_GRAPH_NODE_RADIUS
    ? radius
    : DEFAULT_GRAPH_NODE_RADIUS;
}

type ParamNode = KnowledgeGraph3DParams['nodes'][number];
type ParamEdge = KnowledgeGraph3DParams['edges'][number];

/** The set of edges this scene can actually render: both endpoints resolve to a
 *  node id in `ids`, AND it is not a self-loop (a self-loop draws a zero-length,
 *  invisible segment and stacks its particles at one point). Every scene path
 *  (layout links, adjacency, endpoints, particles, emphasis) and the mapper agree
 *  on this ONE definition, so their element counts can never disagree. */
export function filterGraphEdges<E extends { source: string; target: string }>(
  ids: ReadonlySet<string>,
  edges: readonly E[],
): E[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) {
      return false;
    }
    const kind = 'kind' in edge && typeof edge.kind === 'string' ? edge.kind : '';
    const symmetric = kind === 'same_as';
    const source = symmetric && edge.source > edge.target ? edge.target : edge.source;
    const target = symmetric && edge.source > edge.target ? edge.source : edge.target;
    const key = JSON.stringify([source, target, kind]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
 *  covered (they feed the memoized sim/edge snapshots); node color/label are
 *  deliberately excluded — they restyle live without a layout restart. */
export function graphSignature(
  nodes: readonly { id: string; radius?: number }[],
  edges: readonly {
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
    s += `E${field(e.source)}${field(e.target)}${field(e.color)}${field(e.kind)}${field(
      (e.directed !== false ? 1 : 0) + (e.particles ? 2 : 0),
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
  nodes: KnowledgeGraph3DNode[];
  edges: KnowledgeGraph3DEdge[];
}

/**
 * Map validated `corpus.knowledge_graph` params → KnowledgeGraph3DScene props.
 * Node color derives from kind; radius grows gently with degree so a highly-cited
 * paper reads as a hub. Edge color/direction/particles derive from kind (only
 * `cites` flows particles). Dangling edges (endpoint not in nodes) are dropped —
 * the scene does the same, so degree/radius stay consistent with what renders.
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
      color: nodeColors[n.kind as KnowledgeGraphNodeKind] ?? palette.inkDim,
      radius,
      kind: n.kind,
    };
  });

  const edges: KnowledgeGraph3DEdge[] = validEdges.map((e) => {
    const style = edgeStyles[e.kind as KnowledgeGraphEdgeKind] ?? {
      color: palette.inkFaint,
      directed: true,
      particles: false,
    };
    return {
      source: e.source,
      target: e.target,
      color: style.color,
      directed: style.directed,
      kind: e.kind,
      particles: style.particles,
    };
  });

  return { nodes, edges };
}
