// Paginated DOM companion for KnowledgeGraph3DScene. WebGL meshes do not expose
// this exact textual record themselves; hosts render the list beside (or in a
// disclosure below) the Canvas so node identity and directed-edge semantics are
// present outside pointer-hover and colour encodings.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  KnowledgeGraph3DEdge,
  KnowledgeGraph3DNode,
} from './KnowledgeGraph3DScene';
import {
  filterGraphEdges,
  graphQueryMatchIds,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
} from './knowledgeGraph';
import {
  knowledgeGraphA11yNavigationContextKey,
  planKnowledgeGraphA11yNavigation,
} from './knowledgeGraphA11yNavigation.internal';
import { safeDiagnosticText } from '../core/safeRuntime';
import {
  assertPreparedCorpusKnowledgeGraphPresentation,
  assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView,
  assertPreparedKnowledgeGraphPresentation,
  knowledgeGraphViewContainsNode,
  type PreparedCorpusKnowledgeGraphPresentationV1,
  type PreparedGenericKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from './knowledgeGraphPresentation.internal';
import { assertKnowledgeGraphNodeReference } from
  './knowledgeGraphPresentationProps.internal';
import { graphEdgeIdentityKey } from './knowledgeGraphIdentity.internal';
import { toggledKnowledgeGraphSelection } from
  './knowledgeGraphInteraction.internal';
import {
  knowledgeGraphContrastSafeColor,
  knowledgeGraphEdgeStrokeDescription,
  knowledgeGraphNodeGlyphDescription,
} from './knowledgeGraphVisualEncoding.internal';

const INLINE_RELATION_LIMIT = 8;
const RELATION_PAGE_SIZE = 8;
const INLINE_ATTRIBUTE_LIMIT = 3;
const INLINE_ATTRIBUTE_ARRAY_LIMIT = 3;
const INLINE_EVIDENCE_LIMIT = 2;
export const DEFAULT_A11Y_NODE_PAGE_SIZE = 25;
export const MAX_A11Y_NODE_PAGE_SIZE = 100;

interface KnowledgeGraphA11yListCommonProps {
  /** Exact-source-bound visible subset; omission exposes the full presentation. */
  view?: PreparedKnowledgeGraphViewV1;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  query?: string;
  className?: string;
  label?: string;
  /** Node rows rendered at once. Relationship detail has its own pager. */
  nodePageSize?: number;
}

export interface KnowledgeGraphA11yListProps
  extends KnowledgeGraphA11yListCommonProps {
  /** Direct primitives accept only caller-declared generic visual graphs. */
  presentation: PreparedGenericKnowledgeGraphPresentationV1;
}

interface KnowledgeGraphCorpusA11yListInternalProps
  extends KnowledgeGraphA11yListCommonProps {
  presentation: PreparedCorpusKnowledgeGraphPresentationV1;
}

type KnowledgeGraphA11yListSurfaceProps =
  | KnowledgeGraphA11yListProps
  | KnowledgeGraphCorpusA11yListInternalProps;

interface KnowledgeGraphLegendCommonProps {
  view?: PreparedKnowledgeGraphViewV1;
  className?: string;
  label?: string;
  /** Must match the companion scene; defaults to the scene's dark policy. */
  themeMode?: 'dark' | 'light';
}

export interface KnowledgeGraphLegendProps extends KnowledgeGraphLegendCommonProps {
  /** Direct primitives accept only caller-declared generic visual graphs. */
  presentation: PreparedGenericKnowledgeGraphPresentationV1;
}

interface KnowledgeGraphCorpusLegendInternalProps
  extends KnowledgeGraphLegendCommonProps {
  presentation: PreparedCorpusKnowledgeGraphPresentationV1;
}

type KnowledgeGraphLegendSurfaceProps =
  | KnowledgeGraphLegendProps
  | KnowledgeGraphCorpusLegendInternalProps;

interface KnowledgeGraphA11yListInstanceProps
  extends KnowledgeGraphA11yListCommonProps {
  readonly nodes: readonly KnowledgeGraph3DNode[];
  readonly edges: readonly KnowledgeGraph3DEdge[];
  readonly corpusVisualMapping: boolean;
}

interface AccessibleNode {
  node: KnowledgeGraph3DNode;
  relationIndexes: number[];
  queryMatch: boolean;
}

type EvidenceMetadata = Pick<
  KnowledgeGraph3DNode,
  'detail' | 'attributes' | 'epistemic' | 'evidence' | 'uncalibrated_score'
> & {
  radius?: number;
  radiusMeaning?: string;
};

const CALLER_DEFINED_RADIUS_MEANING =
  'visual size has no declared quantitative interpretation';

function radiusMeaningText(
  value: EvidenceMetadata,
  corpusVisualMapping: boolean,
): string {
  const meaning = safeDiagnosticText(
    value.radiusMeaning ?? CALLER_DEFINED_RADIUS_MEANING,
    400,
  );
  return corpusVisualMapping ? meaning : `Caller-declared: ${meaning}`;
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

function FullMetadata({
  value,
  label,
  corpusVisualMapping,
}: {
  value: EvidenceMetadata;
  label: string;
  corpusVisualMapping: boolean;
}) {
  return (
    <div aria-label={safeDiagnosticText(label, 400)}>
      {value.radius !== undefined && (
        <p>
          Visual radius: {normalizeGraphNodeRadius(value.radius)}. Radius meaning:{' '}
          {radiusMeaningText(value, corpusVisualMapping)}
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
  corpusVisualMapping = false,
}: {
  value: EvidenceMetadata;
  label: string;
  corpusVisualMapping?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!hasMetadata(value)) return null;
  return (
    <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary style={{ minHeight: 44 }}>
        Browse full metadata for {safeDiagnosticText(label, 400)}
      </summary>
      {expanded && (
        <FullMetadata
          value={value}
          label={`Full metadata for ${label}`}
          corpusVisualMapping={corpusVisualMapping}
        />
      )}
    </details>
  );
}

function metadataSummary(
  value: EvidenceMetadata,
  corpusVisualMapping = false,
): string {
  const parts: string[] = [];
  if (value.radius !== undefined) {
    parts.push(
      `Visual radius: ${normalizeGraphNodeRadius(value.radius)}; ` +
        `radius meaning: ${radiusMeaningText(value, corpusVisualMapping)}`,
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

export function KnowledgeGraphA11yList(props: KnowledgeGraphA11yListProps) {
  assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphA11yList(props);
}

/** Package-internal corpus companion used only in the caption-bound composition. */
export function KnowledgeGraphCorpusA11yListInternal(
  props: KnowledgeGraphCorpusA11yListInternalProps,
) {
  assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphA11yList(props);
}

function renderKnowledgeGraphA11yList(props: KnowledgeGraphA11yListSurfaceProps) {
  const { presentation, view, ...interactionProps } = props;
  assertPreparedKnowledgeGraphPresentation(presentation);
  if (view !== undefined) assertPreparedKnowledgeGraphView(view, presentation);
  assertKnowledgeGraphNodeReference(props.selectedId, 'knowledge-graph selected id');
  const selectedId = view !== undefined && props.selectedId !== null &&
      !knowledgeGraphViewContainsNode(view, presentation, props.selectedId)
    ? null
    : props.selectedId;
  return (
    <KnowledgeGraphA11yListInstance
      key={presentation.graphIdentity}
      {...interactionProps}
      selectedId={selectedId}
      nodes={view?.nodes ?? presentation.nodes}
      edges={view?.edges ?? presentation.edges}
      corpusVisualMapping={presentation.profile === 'corpus_entity'}
      view={view}
    />
  );
}

function KnowledgeGraphA11yListInstance({
  nodes,
  edges,
  corpusVisualMapping,
  selectedId,
  onSelect,
  query = '',
  className,
  label = 'Knowledge graph nodes',
  nodePageSize = DEFAULT_A11Y_NODE_PAGE_SIZE,
  view,
}: KnowledgeGraphA11yListInstanceProps) {
  const instanceId = useId().replace(/:/g, '');
  const safePageSize = Number.isSafeInteger(nodePageSize)
    ? Math.min(MAX_A11Y_NODE_PAGE_SIZE, Math.max(1, nodePageSize))
    : DEFAULT_A11Y_NODE_PAGE_SIZE;
  // Preparation owns and freezes both arrays. Reuse topology derivations across
  // selection, disclosure, and page-state renders; a new capability supplies new
  // array identities and therefore recomputes the complete index atomically.
  const { byId, validEdges, relations } = useMemo(() => {
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
    return { byId, validEdges, relations };
  }, [nodes, edges]);
  const normalizedQuery = useMemo(() => normalizeGraphQuery(query), [query]);
  const matchingNodeIds = useMemo(
    () => graphQueryMatchIds(nodes, normalizedQuery, validEdges),
    [nodes, normalizedQuery, validEdges],
  );
  // Query is an emphasis operation in the scene, not a visibility filter. Keep
  // every node operable here and state which rows share that emphasis.
  const rows: AccessibleNode[] = useMemo(() => nodes.map((node) => ({
    node,
    relationIndexes: relations.get(node.id) ?? [],
    queryMatch: normalizedQuery.length === 0 || matchingNodeIds.has(node.id),
  })), [nodes, relations, normalizedQuery, matchingNodeIds]);
  const queryMatchIndexes = useMemo(
    () => rows.flatMap(({ queryMatch }, index) => queryMatch ? [index] : []),
    [rows],
  );
  const queryMatchCount = queryMatchIndexes.length;
  const nodePageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
  const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
  const queryNavigationKey = useMemo(
    () => knowledgeGraphA11yNavigationContextKey(
      normalizedQuery,
      safePageSize,
      selectedId,
      rows.map(({ node }) => node.id),
      queryMatchIndexes.map((index) => rows[index]?.node.id ?? ''),
    ),
    [normalizedQuery, safePageSize, selectedId, rows, queryMatchIndexes],
  );
  const plannedNavigation = useMemo(() => ({
    contextKey: queryNavigationKey,
    ...planKnowledgeGraphA11yNavigation(
      normalizedQuery.length > 0,
      queryMatchIndexes,
      selectedIndex,
      safePageSize,
      nodePageCount,
    ),
  }), [
    queryNavigationKey,
    normalizedQuery,
    queryMatchIndexes,
    selectedIndex,
    safePageSize,
    nodePageCount,
  ]);
  const [navigation, setNavigation] = useState(plannedNavigation);
  const activeNavigation = navigation.contextKey === queryNavigationKey
    ? navigation
    : plannedNavigation;
  const [queryFocusRequestId, setQueryFocusRequestId] = useState<string | null>(null);
  const queryMatchTargetRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    setNavigation((current) => current.contextKey === queryNavigationKey
      ? current
      : plannedNavigation);
    setQueryFocusRequestId(null);
  }, [queryNavigationKey, plannedNavigation]);
  const currentNodePage = Math.min(
    activeNavigation.nodePage,
    nodePageCount - 1,
  );
  const visibleRows = rows.slice(
    currentNodePage * safePageSize,
    (currentNodePage + 1) * safePageSize,
  );
  const currentQueryMatchCursor = Math.min(
    activeNavigation.matchCursor,
    Math.max(0, queryMatchCount - 1),
  );
  const currentQueryMatchRowIndex = queryMatchIndexes[currentQueryMatchCursor];
  const navigatedQueryMatchNode = currentQueryMatchRowIndex === undefined
    ? undefined
    : rows[currentQueryMatchRowIndex]?.node;
  const currentPageStart = currentNodePage * safePageSize;
  const currentPageStop = currentPageStart + safePageSize;
  const currentQueryMatchNode = currentQueryMatchRowIndex !== undefined &&
      currentQueryMatchRowIndex >= currentPageStart &&
      currentQueryMatchRowIndex < currentPageStop
    ? navigatedQueryMatchNode
    : undefined;
  useEffect(() => {
    if (
      queryFocusRequestId === null ||
      currentQueryMatchNode?.id !== queryFocusRequestId ||
      queryMatchTargetRef.current === null
    ) return;
    queryMatchTargetRef.current.focus();
    setQueryFocusRequestId(null);
  }, [queryFocusRequestId, currentQueryMatchNode, currentNodePage]);
  const showQueryMatch = (cursor: number) => {
    const bounded = Math.max(0, Math.min(queryMatchCount - 1, cursor));
    const rowIndex = queryMatchIndexes[bounded];
    if (rowIndex === undefined) return;
    const targetId = rows[rowIndex]?.node.id;
    if (targetId === undefined) return;
    setNavigation({
      contextKey: queryNavigationKey,
      matchCursor: bounded,
      nodePage: Math.floor(rowIndex / safePageSize),
    });
    setQueryFocusRequestId(targetId);
  };
  const showNodePage = (page: number) => {
    const nodePage = Math.max(0, Math.min(nodePageCount - 1, page));
    const pageStart = nodePage * safePageSize;
    const pageStop = pageStart + safePageSize;
    const firstMatchOnPage = queryMatchIndexes.findIndex(
      (rowIndex) => rowIndex >= pageStart && rowIndex < pageStop,
    );
    setNavigation({
      ...activeNavigation,
      contextKey: queryNavigationKey,
      matchCursor: firstMatchOnPage < 0
        ? activeNavigation.matchCursor
        : firstMatchOnPage,
      nodePage,
    });
  };

  return (
    <section className={className} aria-label={safeDiagnosticText(label, 240)}>
      {view !== undefined && (
        <p role="note">
          Filtered view: showing {view.counts.visibleNodes} of {view.counts.sourceNodes}{' '}
          nodes and {view.counts.visibleEdges} of {view.counts.sourceEdges}{' '}
          relationships. Relationships excluded by kind: {' '}
          {view.counts.edgeKindFilteredEdges}. Relationships excluded because a filtered
          endpoint is absent:{' '}
          {view.counts.endpointPrunedEdges}.
        </p>
      )}
      {normalizedQuery.length > 0 && (
        <p role="status">
          Query emphasizes {queryMatchCount} of {rows.length} nodes; all nodes remain
          available below.
        </p>
      )}
      {normalizedQuery.length > 0 && queryMatchCount > 0 && (
        <nav aria-label="Knowledge graph query matches">
          <p aria-live="polite">
            {currentQueryMatchNode === undefined
              ? `Node page ${currentNodePage + 1} has no current query match; ` +
                'use the query-match controls to navigate to one.'
              : `Query match ${currentQueryMatchCursor + 1} of ${queryMatchCount}: ${
                safeDiagnosticText(currentQueryMatchNode.label, 120)
              }. Node id ${safeDiagnosticText(currentQueryMatchNode.id, 120)}.`}
          </p>
          <button
            type="button"
            disabled={currentQueryMatchCursor === 0}
            onClick={() => showQueryMatch(currentQueryMatchCursor - 1)}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Previous query match
          </button>
          <button
            type="button"
            disabled={currentQueryMatchCursor + 1 >= queryMatchCount}
            onClick={() => showQueryMatch(currentQueryMatchCursor + 1)}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Next query match
          </button>
          {currentQueryMatchNode === undefined && (
            <button
              type="button"
              onClick={() => showQueryMatch(currentQueryMatchCursor)}
              style={{ minWidth: 44, minHeight: 44 }}
            >
              Go to current query match
            </button>
          )}
        </nav>
      )}
      {rows.length === 0 ? (
        <p role="status">
          {view === undefined
            ? 'This graph contains no nodes.'
            : `This filtered view contains no nodes; the full source contains ${
              view.counts.sourceNodes
            }.`}
        </p>
      ) : (
        <ul>
          {visibleRows.map(({ node, relationIndexes, queryMatch }, rowOffset) => {
            const rowIndex = currentNodePage * safePageSize + rowOffset;
            const detailsId = `cortexel-kg-${instanceId}-${rowIndex}-details`;
            const preview = relationIndexes.slice(0, INLINE_RELATION_LIMIT).map((index) =>
              relationshipText(node.id, validEdges[index], byId));
            const omitted = relationIndexes.length - preview.length;
            const nodeMetadata = metadataSummary(node, corpusVisualMapping);
            return (
              <li key={node.id}>
                <button
                  type="button"
                  className="cortexel-knowledge-graph-node"
                  aria-pressed={selectedId === node.id}
                  aria-current={currentQueryMatchNode?.id === node.id ? 'true' : undefined}
                  aria-describedby={detailsId}
                  ref={currentQueryMatchNode?.id === node.id
                    ? queryMatchTargetRef
                    : undefined}
                  onClick={() => onSelect(
                    toggledKnowledgeGraphSelection(selectedId, node.id)
                  )}
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  {safeDiagnosticText(node.label, 240)}
                </button>
                <span id={detailsId}>
                  {safeDiagnosticText(node.kind, 80)}. Node id{' '}
                  {safeDiagnosticText(node.id, 120)}.{' '}
                  {normalizedQuery.length > 0
                    ? queryMatch
                      ? currentQueryMatchNode?.id === node.id
                        ? 'Current navigated query match; visually emphasized. '
                        : 'Query match; visually emphasized. '
                      : 'Not a query match; visually de-emphasized but still present. '
                    : ''}
                  {nodeMetadata ? `${nodeMetadata}. ` : ''}
                  {preview.length > 0
                    ? `${preview.join('; ')}${omitted > 0 ? `; ${omitted} more relationships` : ''}`
                    : 'No relationships in this active view.'}
                </span>
                {selectedId === node.id && (
                  <MetadataDisclosure
                    value={node}
                    label={`node ${node.label}`}
                    corpusVisualMapping={corpusVisualMapping}
                  />
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
            onClick={() => showNodePage(currentNodePage - 1)}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Previous nodes
          </button>
          <button
            type="button"
            disabled={currentNodePage + 1 >= nodePageCount}
            onClick={() => showNodePage(currentNodePage + 1)}
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
  nodeGlyph: NonNullable<KnowledgeGraph3DNode['nodeGlyph']>;
}

interface EdgeLegendEntry extends LegendEntry {
  directed: boolean;
  particles: boolean;
  edgeStrokePattern: NonNullable<KnowledgeGraph3DEdge['edgeStrokePattern']>;
}

function compareLegendEntries(a: LegendEntry, b: LegendEntry): number {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  return a.color === b.color ? 0 : a.color < b.color ? -1 : 1;
}

/** Canvas-external decoding companion for interactive views and DOM-inclusive
 * still captures. Text redundantly carries kind, color, direction, and count. */
export function KnowledgeGraphLegend(props: KnowledgeGraphLegendProps) {
  assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphLegend(props);
}

/** Package-internal corpus legend used only in the caption-bound composition. */
export function KnowledgeGraphCorpusLegendInternal(
  props: KnowledgeGraphCorpusLegendInternalProps,
) {
  assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphLegend(props);
}

function renderKnowledgeGraphLegend({
  presentation,
  view,
  className,
  label = 'Knowledge graph legend',
  themeMode = 'dark',
}: KnowledgeGraphLegendSurfaceProps) {
  assertPreparedKnowledgeGraphPresentation(presentation);
  if (view !== undefined) assertPreparedKnowledgeGraphView(view, presentation);
  const nodes = view?.nodes ?? presentation.nodes;
  const edges = view?.edges ?? presentation.edges;
  const { context } = presentation;
  const { nodeEntries, edgeEntries } = useMemo(() => {
    const nodeEntries: NodeLegendEntry[] = [];
    const edgeEntries: EdgeLegendEntry[] = [];
    const nodeGroups = new Map<string, NodeLegendEntry>();
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const radius = normalizeGraphNodeRadius(node.radius);
      const radiusMeaning = radiusMeaningText(
        node,
        presentation.profile === 'corpus_entity',
      );
      const nodeGlyph = node.nodeGlyph ?? 'sphere_outline';
      const key = JSON.stringify([node.kind, node.color, radiusMeaning, nodeGlyph]);
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
          nodeGlyph,
        });
      }
    }
    const edgeGroups = new Map<string, EdgeLegendEntry>();
    const validEdges = filterGraphEdges(
      new Set(nodes.map(({ id }) => id)),
      edges,
    );
    for (let index = 0; index < validEdges.length; index++) {
      const edge = validEdges[index];
      const directed = edge.directed !== false;
      const particles = edge.particles === true;
      const edgeStrokePattern = edge.edgeStrokePattern ?? 'solid';
      const key = JSON.stringify([
        edge.kind,
        edge.color,
        directed,
        particles,
        edgeStrokePattern,
      ]);
      const entry = edgeGroups.get(key);
      if (entry) entry.count += 1;
      else {
        edgeGroups.set(key, {
          kind: edge.kind,
          color: edge.color,
          directed,
          particles,
          edgeStrokePattern,
          count: 1,
        });
      }
    }
    nodeEntries.push(...[...nodeGroups.values()].sort((a, b) =>
      compareLegendEntries(a, b) ||
      (a.radiusMeaning === b.radiusMeaning
        ? 0
        : a.radiusMeaning < b.radiusMeaning ? -1 : 1)));
    edgeEntries.push(...[...edgeGroups.values()].sort((a, b) =>
      compareLegendEntries(a, b) ||
      Number(a.directed) - Number(b.directed) ||
      Number(a.particles) - Number(b.particles)));
    return { nodeEntries, edgeEntries };
  }, [nodes, edges, presentation.profile]);
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
      {view !== undefined && (
        <p role="note">
          Filtered view: showing {view.counts.visibleNodes} of {view.counts.sourceNodes}{' '}
          nodes and {view.counts.visibleEdges} of {view.counts.sourceEdges}{' '}
          relationships.
        </p>
      )}
      {context && (
        <>
          <p>Graph context</p>
          <dl>
            <dt>Graph id</dt><dd>{safeDiagnosticText(context.graph_id, 160)}</dd>
            <dt>Graph source</dt>
            <dd>{safeDiagnosticText(context.graph_source, 200)}</dd>
            <dt>Caller-declared snapshot namespace</dt>
            <dd>{safeDiagnosticText(context.graph_snapshot_id, 200)}</dd>
            <dt>Graph scope</dt><dd>{safeDiagnosticText(context.graph_scope, 80)}</dd>
            <dt>Generated at</dt><dd>{safeDiagnosticText(context.generated_at, 80)}</dd>
          </dl>
        </>
      )}
      <p>Node kinds</p>
      {nodeEntries.length === 0 ? <p>No nodes in this active view.</p> : (
        <ul>
          {nodeEntries.map((entry) => {
            const renderedColor = knowledgeGraphContrastSafeColor(entry.color, themeMode);
            return (
            <li key={JSON.stringify([
              entry.kind,
              entry.color,
              entry.radiusMeaning,
              entry.nodeGlyph,
            ])}>
              <span aria-hidden="true" style={swatchStyle(renderedColor)} />
              {safeDiagnosticText(entry.kind, 80)}: {entry.count}{' '}
              {entry.count === 1 ? 'node' : 'nodes'}; source color{' '}
              {safeDiagnosticText(entry.color, 80)}; intended undimmed scene color{' '}
              {safeDiagnosticText(renderedColor, 80)}; glyph{' '}
              {knowledgeGraphNodeGlyphDescription(entry.nodeGlyph)}; visual radius{' '}
              {entry.minRadius === entry.maxRadius
                ? entry.minRadius
                : `${entry.minRadius}–${entry.maxRadius}`};{' '}
              {entry.radiusMeaning}
            </li>
            );
          })}
        </ul>
      )}
      <p>Relationship kinds</p>
      {edgeEntries.length === 0 ? <p>No relationships in this active view.</p> : (
        <ul>
          {edgeEntries.map((entry) => (
            <li key={JSON.stringify([
              entry.kind,
              entry.color,
              entry.directed,
              entry.particles,
              entry.edgeStrokePattern,
            ])}>
              <span
                aria-hidden="true"
                style={swatchStyle(knowledgeGraphContrastSafeColor(entry.color, themeMode))}
              />
              {safeDiagnosticText(entry.kind, 80)}: {entry.count}{' '}
              {entry.count === 1 ? 'relationship' : 'relationships'};{' '}
              {entry.directed ? 'directed' : 'undirected'}; source color{' '}
              {safeDiagnosticText(entry.color, 80)}; intended undimmed scene color{' '}
              {safeDiagnosticText(
                knowledgeGraphContrastSafeColor(entry.color, themeMode),
                80,
              )}; {knowledgeGraphEdgeStrokeDescription(entry.edgeStrokePattern)}
              {entry.particles ? '; flow markers' : ''}
            </li>
          ))}
        </ul>
      )}
      <p role="note">
        The listed scene colors are the intended undimmed baseline. Glyph shells use{' '}
        {themeMode === 'light' ? '#0f172a' : '#f8fafc'} before dimming. Focus and query
        interactions dim peripheral node fills, glyph shells, relationships, arrows,
        and flow markers without changing their kind glyph, stroke pattern, direction,
        or DOM record. Layout positions and distances are schematic, not quantitative
        evidence.
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
  const pageCount = Math.max(1, Math.ceil(relationIndexes.length / RELATION_PAGE_SIZE));
  // Clamp during render and converge stored page state after commit. If a live
  // graph loses relationships while its pager is on the last page, the DOM never
  // exposes a transient empty/out-of-range page to assistive technology.
  const currentPage = Math.min(page, pageCount - 1);
  // Same-node relationship views retain the user's page. Render-time clamping
  // handles shrinkage; the keyed graph boundary handles a new graph namespace.
  useEffect(() => setPage(0), [nodeId]);
  useEffect(
    () => setPage((current) => Math.min(current, pageCount - 1)),
    [pageCount],
  );
  const start = currentPage * RELATION_PAGE_SIZE;
  return (
    <details>
      <summary style={{ minHeight: 44 }}>
        Browse all {relationIndexes.length} relationships
      </summary>
      <ul>
        {relationIndexes.slice(start, start + RELATION_PAGE_SIZE).map((edgeIndex) => {
          const edge = edges[edgeIndex];
          const humanLabel = edge.label ?? edge.kind;
          const edgeLabel = edge.id === undefined
            ? `${humanLabel} relationship`
            : `${humanLabel} [${edge.id}]`;
          const relationshipKey = graphEdgeIdentityKey(edge);
          return (
            <li key={JSON.stringify([nodeId, relationshipKey])}>
              {relationshipText(nodeId, edge, byId)}
              <MetadataDisclosure value={edge} label={`relationship ${edgeLabel}`} />
            </li>
          );
        })}
      </ul>
      <p aria-live="polite">Page {currentPage + 1} of {pageCount}</p>
      <button
        type="button"
        disabled={currentPage === 0}
        onClick={() => setPage((current) => Math.max(0, current - 1))}
        style={{ minWidth: 44, minHeight: 44 }}
      >
        Previous relationships
      </button>
      <button
        type="button"
        disabled={currentPage + 1 >= pageCount}
        onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
        style={{ minWidth: 44, minHeight: 44 }}
      >
        Next relationships
      </button>
    </details>
  );
}
