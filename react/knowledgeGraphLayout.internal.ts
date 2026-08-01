import { graphSignature, normalizeGraphNodeRadius } from './knowledgeGraph';
import type { SimNode } from 'd3-force-3d';
import type {
  KnowledgeGraphEdgeStrokePattern,
  KnowledgeGraphNodeGlyph,
} from './knowledgeGraphPresentation.types';

export interface GraphLayoutInputNode {
  id: string;
  radius: number;
  nodeGlyph?: KnowledgeGraphNodeGlyph;
}

export interface GraphLayoutInputEdge {
  id?: string;
  source: string;
  target: string;
  color: string;
  kind: string;
  directed?: boolean;
  particles?: boolean;
  edgeStrokePattern?: KnowledgeGraphEdgeStrokePattern;
}

export interface GraphLayoutInputSnapshot {
  graphKey: string;
  nodes: GraphLayoutInputNode[];
  edges: GraphLayoutInputEdge[];
}

/**
 * Read every renderer-relevant prop into detached plain records on each React
 * render, then key memoized mutable state from those records. Public props are
 * readonly, but this runtime snapshot also protects JavaScript callers that
 * mutate the same object/array identities between renders.
 */
export function snapshotGraphLayoutInputs(
  nodes: readonly {
    readonly id: string;
    readonly radius: number;
    readonly nodeGlyph?: KnowledgeGraphNodeGlyph;
  }[],
  edges: readonly {
    readonly id?: string;
    readonly source: string;
    readonly target: string;
    readonly color: string;
    readonly kind: string;
    readonly directed?: boolean;
    readonly particles?: boolean;
    readonly edgeStrokePattern?: KnowledgeGraphEdgeStrokePattern;
  }[],
): GraphLayoutInputSnapshot {
  const nodeSnapshot = nodes.map(({ id, radius, nodeGlyph }) => ({
    id,
    radius,
    nodeGlyph,
  }));
  const edgeSnapshot = edges.map(({
    id,
    source,
    target,
    color,
    kind,
    directed,
    particles,
    edgeStrokePattern,
  }) => ({
    id,
    source,
    target,
    color,
    kind,
    directed,
    particles,
    edgeStrokePattern,
  }));
  return {
    graphKey: graphSignature(nodeSnapshot, edgeSnapshot),
    nodes: nodeSnapshot,
    edges: edgeSnapshot,
  };
}

/** Mutable position slot owned by one committed graph-layout runtime. */
export type GraphLayoutPosition = [x: number, y: number, z: number];

export interface GraphLayoutNode extends SimNode {
  id: string;
  r: number;
}

export interface GraphLayoutCachePlan {
  /** Fresh d3 nodes. Remembered coordinates are copied, never aliased. */
  nodes: GraphLayoutNode[];
  /**
   * Two complete, bounded replacement caches. A successful frame publishes one
   * and the next frame writes only into the other, still-unpublished buffer.
   */
  cacheBuffers: readonly [GraphLayoutCacheBuffer, GraphLayoutCacheBuffer];
  warmStart: boolean;
}

export interface GraphLayoutCacheBuffer {
  cache: Map<string, GraphLayoutPosition>;
  positionSlots: GraphLayoutPosition[];
}

export interface BufferedGraphLayoutCache {
  cacheBuffers: readonly [GraphLayoutCacheBuffer, GraphLayoutCacheBuffer];
  nextCacheBufferIndex: 0 | 1;
}

/**
 * Build a completely detached cache transaction. This module is deliberately
 * absent from the package exports: mutable layout authority is an implementation
 * detail, not a consumer API.
 *
 * Every retained tuple is copied. Current ids are moved to the end of the Map,
 * making deterministic insertion order a bounded least-recently-active eviction
 * order. A discarded effect can mutate any returned node, slot, or cache entry
 * without reaching the currently published authority.
 */
export function planGraphLayoutCache(
  nodes: readonly { id: string; radius: number }[],
  remembered: ReadonlyMap<string, readonly [number, number, number]>,
  maxRememberedPositions: number,
): GraphLayoutCachePlan {
  if (
    !Number.isSafeInteger(maxRememberedPositions) ||
    maxRememberedPositions < nodes.length
  ) {
    throw new RangeError(
      'max remembered graph positions must be an integer at least as large as the active graph',
    );
  }

  const activeIds = new Set<string>();
  const plannedNodes = new Array<GraphLayoutNode>(nodes.length);
  let warmStart = false;
  for (let index = 0; index < nodes.length; index++) {
    const input = nodes[index];
    if (activeIds.has(input.id)) {
      throw new RangeError('graph layout node ids must be unique');
    }
    activeIds.add(input.id);
    const r = normalizeGraphNodeRadius(input.radius);
    const previous = remembered.get(input.id);
    if (previous === undefined) {
      plannedNodes[index] = { id: input.id, r };
      continue;
    }

    warmStart = true;
    plannedNodes[index] = {
      id: input.id,
      r,
      x: previous[0],
      y: previous[1],
      z: previous[2],
    };
  }

  const makeBuffer = (): GraphLayoutCacheBuffer => {
    const cache = new Map<string, GraphLayoutPosition>();
    for (const [id, previous] of remembered) {
      cache.set(id, [previous[0], previous[1], previous[2]]);
    }
    const positionSlots = new Array<GraphLayoutPosition>(nodes.length);
    for (let index = 0; index < nodes.length; index++) {
      const id = nodes[index].id;
      const previous = cache.get(id);
      const slot: GraphLayoutPosition = previous ?? [0, 0, 0];
      // Reinsert current ids so deterministic eviction retains the most recently
      // active positions when filters churn through one graph namespace.
      if (previous !== undefined) cache.delete(id);
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
      throw new Error('active graph positions exceeded the validated cache authority');
    }
    return { cache, positionSlots };
  };

  return {
    nodes: plannedNodes,
    cacheBuffers: [makeBuffer(), makeBuffer()],
    warmStart,
  };
}

/**
 * Publish one already-complete candidate. Call this only as the final authority
 * operation of a successful frame. A throw before this call leaves both the
 * published Map identity and every tuple reachable from it unchanged.
 */
export function publishGraphLayoutCache(
  authority: { current: Map<string, GraphLayoutPosition> },
  buffered: BufferedGraphLayoutCache,
  completedBufferIndex: 0 | 1,
): void {
  if (completedBufferIndex !== buffered.nextCacheBufferIndex) {
    throw new Error('graph layout cache publication is out of sequence');
  }
  buffered.nextCacheBufferIndex = completedBufferIndex === 0 ? 1 : 0;
  authority.current = buffered.cacheBuffers[completedBufferIndex].cache;
}
