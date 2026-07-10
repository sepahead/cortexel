// Keyboard/screen-reader companion for KnowledgeGraph3DScene. WebGL meshes are
// not part of the accessibility tree; hosts render this DOM list beside (or in
// an accessible disclosure below) the Canvas so node identity and directed edge
// semantics are never conveyed by pointer hover and color alone.

import { useEffect, useId, useMemo, useState } from 'react';
import type {
  KnowledgeGraph3DEdge,
  KnowledgeGraph3DNode,
} from './KnowledgeGraph3DScene';
import {
  assertKnowledgeGraphBudget,
  filterGraphEdges,
  matchesGraphQuery,
  normalizeGraphQuery,
} from './knowledgeGraph';
import { safeDiagnosticText } from '../core/safeRuntime';

const INLINE_RELATION_LIMIT = 8;
const RELATION_PAGE_SIZE = 25;
export const DEFAULT_A11Y_NODE_PAGE_SIZE = 100;
export const MAX_A11Y_NODE_PAGE_SIZE = 200;

export interface KnowledgeGraphA11yListProps {
  nodes: readonly KnowledgeGraph3DNode[];
  edges: readonly KnowledgeGraph3DEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  query?: string;
  className?: string;
  label?: string;
  /** Node rows rendered at once. Relationship detail has its own pager. */
  nodePageSize?: number;
}

interface AccessibleNode {
  node: KnowledgeGraph3DNode;
  relationIndexes: number[];
}

function relationshipText(
  nodeId: string,
  edge: KnowledgeGraph3DEdge,
  byId: ReadonlyMap<string, KnowledgeGraph3DNode>,
): string {
  const source = byId.get(edge.source)!;
  const target = byId.get(edge.target)!;
  const other = source.id === nodeId ? target : source;
  const direction = edge.directed === false
    ? 'connected to'
    : source.id === nodeId
      ? 'points to'
      : 'from';
  return `${safeDiagnosticText(edge.kind, 80)}: ${direction} ${safeDiagnosticText(other.label, 240)}`;
}

export function KnowledgeGraphA11yList({
  nodes,
  edges,
  selectedId,
  onSelect,
  query = '',
  className,
  label = 'Knowledge graph nodes',
  nodePageSize = DEFAULT_A11Y_NODE_PAGE_SIZE,
}: KnowledgeGraphA11yListProps) {
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  const instanceId = useId().replace(/:/g, '');
  const safePageSize = Number.isSafeInteger(nodePageSize)
    ? Math.min(MAX_A11Y_NODE_PAGE_SIZE, Math.max(1, nodePageSize))
    : DEFAULT_A11Y_NODE_PAGE_SIZE;
  const { rows, validEdges, byId } = useMemo<{
    rows: AccessibleNode[];
    validEdges: KnowledgeGraph3DEdge[];
    byId: Map<string, KnowledgeGraph3DNode>;
  }>(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const validEdges = filterGraphEdges(new Set(byId.keys()), edges);
    const relations = new Map<string, number[]>();
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
    const rows = nodes
      .filter(
        (node) =>
          matchesGraphQuery(node.label, node.kind, normalizedQuery),
      )
      .map((node) => ({ node, relationIndexes: relations.get(node.id) ?? [] }));
    return { rows, validEdges, byId };
  }, [nodes, edges, query]);
  const [nodePage, setNodePage] = useState(() => {
    const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
    return selectedIndex < 0 ? 0 : Math.floor(selectedIndex / safePageSize);
  });
  const nodePageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const currentNodePage = Math.min(nodePage, nodePageCount - 1);
  const visibleRows = rows.slice(
    currentNodePage * safePageSize,
    (currentNodePage + 1) * safePageSize,
  );
  useEffect(() => setNodePage(0), [query, safePageSize]);
  useEffect(() => {
    const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
    if (selectedIndex >= 0) setNodePage(Math.floor(selectedIndex / safePageSize));
    else setNodePage((page) => Math.min(page, nodePageCount - 1));
  }, [rows, selectedId, safePageSize, nodePageCount]);

  return (
    <section className={className} aria-label={safeDiagnosticText(label, 240)}>
      {rows.length === 0 ? (
        <p role="status">No graph nodes match this view.</p>
      ) : (
        <ul>
          {visibleRows.map(({ node, relationIndexes }, rowOffset) => {
            const rowIndex = currentNodePage * safePageSize + rowOffset;
            const detailsId = `cortexel-kg-${instanceId}-${rowIndex}-details`;
            const preview = relationIndexes.slice(0, INLINE_RELATION_LIMIT).map((index) =>
              relationshipText(node.id, validEdges[index], byId));
            const omitted = relationIndexes.length - preview.length;
            return (
              <li key={node.id}>
                <button
                  type="button"
                  className="cortexel-knowledge-graph-node"
                  aria-pressed={selectedId === node.id}
                  aria-describedby={detailsId}
                  onClick={() => onSelect(node.id)}
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  {safeDiagnosticText(node.label, 240)}
                </button>
                <span id={detailsId}>
                  {safeDiagnosticText(node.kind, 80)}.{' '}
                  {preview.length > 0
                    ? `${preview.join('; ')}${omitted > 0 ? `; ${omitted} more relationships` : ''}`
                    : 'No rendered relationships.'}
                </span>
                {selectedId === node.id && omitted > 0 && (
                  <RelationshipPager
                    nodeId={node.id}
                    relationIndexes={relationIndexes}
                    edges={validEdges}
                    byId={byId}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > safePageSize && (
        <nav aria-label="Knowledge graph node pages">
          <p aria-live="polite">
            Node page {currentNodePage + 1} of {nodePageCount}; {rows.length} nodes
          </p>
          <button
            type="button"
            disabled={currentNodePage === 0}
            onClick={() => setNodePage((page) => Math.max(0, page - 1))}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Previous nodes
          </button>
          <button
            type="button"
            disabled={currentNodePage + 1 >= nodePageCount}
            onClick={() => setNodePage((page) => Math.min(nodePageCount - 1, page + 1))}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Next nodes
          </button>
        </nav>
      )}
    </section>
  );
}

function RelationshipPager({
  nodeId,
  relationIndexes,
  edges,
  byId,
}: {
  nodeId: string;
  relationIndexes: readonly number[];
  edges: readonly KnowledgeGraph3DEdge[];
  byId: ReadonlyMap<string, KnowledgeGraph3DNode>;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(relationIndexes.length / RELATION_PAGE_SIZE);
  useEffect(() => setPage(0), [nodeId, relationIndexes]);
  const start = page * RELATION_PAGE_SIZE;
  return (
    <details>
      <summary>Browse all {relationIndexes.length} relationships</summary>
      <ul>
        {relationIndexes.slice(start, start + RELATION_PAGE_SIZE).map((edgeIndex) => (
          <li key={`${edgeIndex}-${nodeId}`}>
            {relationshipText(nodeId, edges[edgeIndex], byId)}
          </li>
        ))}
      </ul>
      <p aria-live="polite">Page {page + 1} of {pageCount}</p>
      <button
        type="button"
        disabled={page === 0}
        onClick={() => setPage((current) => Math.max(0, current - 1))}
        style={{ minWidth: 44, minHeight: 44 }}
      >
        Previous relationships
      </button>
      <button
        type="button"
        disabled={page + 1 >= pageCount}
        onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
        style={{ minWidth: 44, minHeight: 44 }}
      >
        Next relationships
      </button>
    </details>
  );
}
