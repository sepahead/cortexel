export interface GraphEdgeIdentityFields {
  readonly id?: string;
  readonly source: string;
  readonly target: string;
  readonly kind?: string;
  readonly directed?: boolean;
}

export function canonicalGraphNodePair(
  source: string,
  target: string,
): readonly [source: string, target: string] {
  return source <= target ? [source, target] : [target, source];
}

/** Exact private identity domain shared by validation, routing, and DOM keys. */
export function graphEdgeIdentityKey(edge: GraphEdgeIdentityFields): string {
  if (typeof edge.id === 'string') return JSON.stringify(['id', edge.id]);
  const kind = typeof edge.kind === 'string' ? edge.kind : '';
  if (edge.directed === false) {
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    return JSON.stringify(['legacy-undirected', source, target, kind]);
  }
  return JSON.stringify(['legacy-directed', edge.source, edge.target, kind]);
}
