import type { KnowledgeGraphContext } from './knowledgeGraphPresentation.types';

/** Collision-free encoding of the complete caller-declared corpus context. */
export function deriveKnowledgeGraphContextIdentity(context: KnowledgeGraphContext): string {
  const field = (value: string): string => `${value.length}:${value}`;
  return `cortexel-corpus-graph-instance.v1:${field(context.graph_id)}${field(
    context.graph_source,
  )}${field(context.graph_snapshot_id)}${field(context.graph_scope)}${field(
    context.generated_at,
  )}`;
}
