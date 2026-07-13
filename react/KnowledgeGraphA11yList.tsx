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
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  filterGraphEdges,
  graphQueryMatchIds,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
  type KnowledgeGraphContext,
} from './knowledgeGraph';
import { safeDiagnosticText } from '../core/safeRuntime';

const INLINE_RELATION_LIMIT = 8;
const RELATION_PAGE_SIZE = 25;
const INLINE_ATTRIBUTE_LIMIT = 3;
const INLINE_ATTRIBUTE_ARRAY_LIMIT = 3;
const INLINE_EVIDENCE_LIMIT = 2;
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

export interface KnowledgeGraphLegendProps {
  nodes: readonly KnowledgeGraph3DNode[];
  edges: readonly KnowledgeGraph3DEdge[];
  /** Immutable corpus/snapshot context returned by mapCorpusKnowledgeGraph. */
  context?: Readonly<KnowledgeGraphContext>;
  className?: string;
  label?: string;
}

interface AccessibleNode {
  node: KnowledgeGraph3DNode;
  relationIndexes: number[];
}

type EvidenceMetadata = Pick<
  KnowledgeGraph3DNode,
  'detail' | 'attributes' | 'epistemic' | 'evidence' | 'uncalibrated_score'
> & {
  radius?: number;
  radiusMeaning?: string;
};

const CALLER_DEFINED_RADIUS_MEANING =
  'Caller-defined visual size; not quantitative evidence.';

function radiusMeaningText(value: EvidenceMetadata): string {
  return safeDiagnosticText(
    value.radiusMeaning ?? CALLER_DEFINED_RADIUS_MEANING,
    400,
  );
}

type EvidenceRef = NonNullable<KnowledgeGraph3DNode['evidence']>[number];

function attributeValueText(value: unknown): string {
  if (Array.isArray(value)) {
    const shown = value
      .slice(0, INLINE_ATTRIBUTE_ARRAY_LIMIT)
      .map((item) => safeDiagnosticText(String(item), 80));
    const omitted = value.length - shown.length;
    return `[${shown.join(', ')}${omitted > 0 ? `, ${omitted} more` : ''}]`;
  }
  return safeDiagnosticText(String(value), 120);
}

function evidenceRefText(item: EvidenceRef): string {
  const prefix = `${safeDiagnosticText(item.kind, 80)} ` +
    safeDiagnosticText(item.evidence_id, 384);
  switch (item.kind) {
    case 'graph_snapshot_record':
      return `${prefix}; record ${safeDiagnosticText(item.record_id, 320)}` +
        (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : '');
    case 'graph_node':
      return `${prefix}; node ${safeDiagnosticText(item.node_id, 120)}` +
        (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : '');
    case 'citation':
      return `${prefix}; paper ${safeDiagnosticText(item.paper_id, 160)}; ` +
        `citation ${safeDiagnosticText(item.citation_id, 160)}` +
        (item.page === undefined ? '' : `; page ${item.page}`) +
        (item.doi ? `; DOI ${safeDiagnosticText(item.doi, 240)}` : '') +
        (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : '');
    case 'external_source':
      return `${prefix}; source ${safeDiagnosticText(item.source_id, 240)}` +
        (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : '');
  }
}

function fullEvidenceRefText(item: EvidenceRef): string {
  const summary = evidenceRefText(item);
  return 'excerpt' in item && item.excerpt
    ? `${summary}; excerpt ${safeDiagnosticText(item.excerpt, 1_000)}`
    : summary;
}

function fullAttributeValueText(value: unknown): string {
  return Array.isArray(value)
    ? value.map((item) => safeDiagnosticText(String(item), 500)).join(', ')
    : safeDiagnosticText(String(value), 500);
}

function hasMetadata(value: EvidenceMetadata): boolean {
  return value.radius !== undefined ||
    value.detail !== undefined ||
    (value.attributes !== undefined && Object.keys(value.attributes).length > 0) ||
    value.epistemic !== undefined ||
    (value.evidence !== undefined && value.evidence.length > 0) ||
    value.uncalibrated_score !== undefined;
}

function FullMetadata({ value, label }: { value: EvidenceMetadata; label: string }) {
  return (
    <div aria-label={safeDiagnosticText(label, 400)}>
      {value.radius !== undefined && (
        <p>
          Visual radius: {normalizeGraphNodeRadius(value.radius)}. Radius meaning:{' '}
          {radiusMeaningText(value)}
        </p>
      )}
      {value.detail && <p>Detail: {safeDiagnosticText(value.detail, 1_000)}</p>}
      {value.attributes && Object.keys(value.attributes).length > 0 && (
        <>
          <p>All attributes</p>
          <dl>
            {Object.entries(value.attributes).map(([key, item]) => (
              <div key={key}>
                <dt>{safeDiagnosticText(key, 80)}</dt>
                <dd>{fullAttributeValueText(item)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {value.epistemic && (
        <>
          <p>Full epistemic status</p>
          <dl>
            <dt>Status</dt><dd>{safeDiagnosticText(value.epistemic.status, 80)}</dd>
            <dt>Advisory only</dt><dd>{String(value.epistemic.advisory_only)}</dd>
            <dt>Paper-local evidence</dt>
            <dd>{String(value.epistemic.is_paper_local_evidence)}</dd>
            <dt>Calibrated posterior</dt>
            <dd>{String(value.epistemic.calibrated_posterior)}</dd>
          </dl>
        </>
      )}
      {value.evidence && value.evidence.length > 0 && (
        <>
          <p>All evidence references ({value.evidence.length})</p>
          <ol>
            {value.evidence.map((item) => (
              <li key={item.evidence_id}>{fullEvidenceRefText(item)}</li>
            ))}
          </ol>
        </>
      )}
      {value.uncalibrated_score && (
        <>
          <p>Full uncalibrated score</p>
          <dl>
            <dt>Kind</dt>
            <dd>{safeDiagnosticText(value.uncalibrated_score.kind, 80)}</dd>
            <dt>Value</dt><dd>{value.uncalibrated_score.value}</dd>
            <dt>Calibrated posterior</dt>
            <dd>{String(value.uncalibrated_score.calibrated_posterior)}</dd>
          </dl>
        </>
      )}
    </div>
  );
}

function MetadataDisclosure({
  value,
  label,
}: {
  value: EvidenceMetadata;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!hasMetadata(value)) return null;
  return (
    <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary style={{ minHeight: 44 }}>
        Browse full metadata for {safeDiagnosticText(label, 400)}
      </summary>
      {expanded && <FullMetadata value={value} label={`Full metadata for ${label}`} />}
    </details>
  );
}

function metadataSummary(value: EvidenceMetadata): string {
  const parts: string[] = [];
  if (value.radius !== undefined) {
    parts.push(
      `Visual radius: ${normalizeGraphNodeRadius(value.radius)}; ` +
        `radius meaning: ${radiusMeaningText(value)}`,
    );
  }
  if (value.detail) parts.push(`Detail: ${safeDiagnosticText(value.detail, 300)}`);
  if (value.attributes) {
    const entries = Object.entries(value.attributes);
    const shown = entries.slice(0, INLINE_ATTRIBUTE_LIMIT).map(([key, item]) =>
      `${safeDiagnosticText(key, 80)}=${attributeValueText(item)}`);
    if (shown.length > 0) {
      const omitted = entries.length - shown.length;
      parts.push(`Attributes: ${shown.join(', ')}${omitted > 0 ? `; ${omitted} more` : ''}`);
    }
  }
  if (value.epistemic) {
    parts.push(
      `Epistemic: ${safeDiagnosticText(value.epistemic.status, 80)}; ` +
        'advisory only; not paper-local evidence; uncalibrated',
    );
  }
  if (value.evidence) {
    const shown = value.evidence.slice(0, INLINE_EVIDENCE_LIMIT).map(evidenceRefText);
    const omitted = value.evidence.length - shown.length;
    parts.push(
      `Evidence (${value.evidence.length}): ${shown.join(', ')}` +
        (omitted > 0 ? `; ${omitted} more` : ''),
    );
  }
  if (value.uncalibrated_score) {
    parts.push(
      `Uncalibrated score: ${safeDiagnosticText(value.uncalibrated_score.kind, 80)} ` +
        `${value.uncalibrated_score.value}`,
    );
  }
  return parts.join('. ');
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
  const assertion = edge.id === undefined
    ? ''
    : ` [${safeDiagnosticText(edge.id, 320)}]`;
  const kind = safeDiagnosticText(edge.kind, 80);
  const label = edge.label && edge.label !== edge.kind
    ? `${safeDiagnosticText(edge.label, 160)} (${kind})`
    : kind;
  const metadata = metadataSummary(edge);
  return `${label}${assertion}: ${direction} ${safeDiagnosticText(other.label, 240)} ` +
    `(node id ${safeDiagnosticText(other.id, 120)})` +
    (metadata ? `. ${metadata}` : '');
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
  assertUniqueGraphNodeIds(nodes);
  assertRenderableGraphEdges(nodes, edges);
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
    const matchingNodeIds = graphQueryMatchIds(nodes, normalizedQuery, validEdges);
    const rows = nodes
      .filter(
        (node) =>
          node.id === selectedId ||
          matchingNodeIds.has(node.id),
      )
      .map((node) => ({ node, relationIndexes: relations.get(node.id) ?? [] }));
    return { rows, validEdges, byId };
  }, [nodes, edges, query, selectedId]);
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
            const nodeMetadata = metadataSummary(node);
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
                  {safeDiagnosticText(node.kind, 80)}. Node id{' '}
                  {safeDiagnosticText(node.id, 120)}.{' '}
                  {nodeMetadata ? `${nodeMetadata}. ` : ''}
                  {preview.length > 0
                    ? `${preview.join('; ')}${omitted > 0 ? `; ${omitted} more relationships` : ''}`
                    : 'No rendered relationships.'}
                </span>
                {selectedId === node.id && (
                  <MetadataDisclosure value={node} label={`node ${node.label}`} />
                )}
                {selectedId === node.id && relationIndexes.length > 0 && (
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

interface LegendEntry {
  kind: string;
  color: string;
  count: number;
}

interface NodeLegendEntry extends LegendEntry {
  minRadius: number;
  maxRadius: number;
  radiusMeaning: string;
}

interface EdgeLegendEntry extends LegendEntry {
  directed: boolean;
  particles: boolean;
}

function compareLegendEntries(a: LegendEntry, b: LegendEntry): number {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  return a.color === b.color ? 0 : a.color < b.color ? -1 : 1;
}

/** Canvas-external decoding companion for interactive views and DOM-inclusive
 * still captures. Text redundantly carries kind, color, direction, and count. */
export function KnowledgeGraphLegend({
  nodes,
  edges,
  context,
  className,
  label = 'Knowledge graph legend',
}: KnowledgeGraphLegendProps) {
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  assertUniqueGraphNodeIds(nodes);
  assertRenderableGraphEdges(nodes, edges);
  const { nodeEntries, edgeEntries } = useMemo(() => {
    const nodeGroups = new Map<string, NodeLegendEntry>();
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
          radiusMeaning,
        });
      }
    }
    const edgeGroups = new Map<string, EdgeLegendEntry>();
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
          count: 1,
        });
      }
    }
    const nodeEntries = [...nodeGroups.values()].sort((a, b) =>
      compareLegendEntries(a, b) ||
      (a.radiusMeaning === b.radiusMeaning
        ? 0
        : a.radiusMeaning < b.radiusMeaning ? -1 : 1));
    const edgeEntries = [...edgeGroups.values()].sort((a, b) =>
      compareLegendEntries(a, b) ||
      Number(a.directed) - Number(b.directed) ||
      Number(a.particles) - Number(b.particles));
    return { nodeEntries, edgeEntries };
  }, [nodes, edges]);
  const swatchStyle = (color: string) => ({
    display: 'inline-block',
    width: 16,
    height: 16,
    marginRight: 8,
    border: '1px solid currentColor',
    backgroundColor: color,
  });
  return (
    <aside className={className} aria-label={safeDiagnosticText(label, 240)}>
      {context && (
        <>
          <p>Graph context</p>
          <dl>
            <dt>Graph id</dt><dd>{safeDiagnosticText(context.graph_id, 160)}</dd>
            <dt>Graph source</dt>
            <dd>{safeDiagnosticText(context.graph_source, 200)}</dd>
            <dt>Graph snapshot id</dt>
            <dd>{safeDiagnosticText(context.graph_snapshot_id, 200)}</dd>
            <dt>Graph scope</dt><dd>{safeDiagnosticText(context.graph_scope, 80)}</dd>
            <dt>Generated at</dt><dd>{safeDiagnosticText(context.generated_at, 80)}</dd>
          </dl>
        </>
      )}
      <p>Node kinds</p>
      {nodeEntries.length === 0 ? <p>No rendered nodes.</p> : (
        <ul>
          {nodeEntries.map((entry) => (
            <li key={JSON.stringify([entry.kind, entry.color, entry.radiusMeaning])}>
              <span aria-hidden="true" style={swatchStyle(entry.color)} />
              {safeDiagnosticText(entry.kind, 80)}: {entry.count}{' '}
              {entry.count === 1 ? 'node' : 'nodes'}; color{' '}
              {safeDiagnosticText(entry.color, 80)}; visual radius{' '}
              {entry.minRadius === entry.maxRadius
                ? entry.minRadius
                : `${entry.minRadius}–${entry.maxRadius}`};{' '}
              {entry.radiusMeaning}
            </li>
          ))}
        </ul>
      )}
      <p>Relationship kinds</p>
      {edgeEntries.length === 0 ? <p>No rendered relationships.</p> : (
        <ul>
          {edgeEntries.map((entry) => (
            <li key={JSON.stringify([
              entry.kind,
              entry.color,
              entry.directed,
              entry.particles,
            ])}>
              <span aria-hidden="true" style={swatchStyle(entry.color)} />
              {safeDiagnosticText(entry.kind, 80)}: {entry.count}{' '}
              {entry.count === 1 ? 'relationship' : 'relationships'};{' '}
              {entry.directed ? 'directed' : 'undirected'}; color{' '}
              {safeDiagnosticText(entry.color, 80)}
              {entry.particles ? '; flow markers' : ''}
            </li>
          ))}
        </ul>
      )}
      <p role="note">
        Layout positions and distances are schematic, not quantitative evidence.
      </p>
    </aside>
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
      <summary style={{ minHeight: 44 }}>
        Browse all {relationIndexes.length} relationships
      </summary>
      <ul>
        {relationIndexes.slice(start, start + RELATION_PAGE_SIZE).map((edgeIndex) => {
          const edge = edges[edgeIndex];
          const edgeLabel = edge.id ?? `${edge.kind} relationship`;
          return (
            <li key={`${edgeIndex}-${nodeId}`}>
              {relationshipText(nodeId, edge, byId)}
              <MetadataDisclosure value={edge} label={`relationship ${edgeLabel}`} />
            </li>
          );
        })}
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
