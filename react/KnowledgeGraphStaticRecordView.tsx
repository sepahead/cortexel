import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type {
  KnowledgeGraph3DEdge,
  KnowledgeGraph3DNode,
  KnowledgeGraphEvidenceRef,
} from './knowledgeGraphPresentation.types';
import { graphEdgeIdentityKey } from './knowledgeGraphIdentity.internal';
import {
  assertPreparedCorpusKnowledgeGraphPresentation,
  assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView,
  assertPreparedKnowledgeGraphPresentation,
  type PreparedCorpusKnowledgeGraphPresentationV1,
  type PreparedGenericKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from './knowledgeGraphPresentation.internal';
import { safeDiagnosticText } from '../core/safeRuntime';

interface KnowledgeGraphStaticRecordViewCommonProps {
  /** Optional view disclosure; records below remain the complete source token. */
  readonly view?: PreparedKnowledgeGraphViewV1;
  readonly className?: string;
  readonly label?: string;
  readonly nodePageSize?: number;
  readonly edgePageSize?: number;
}

export interface KnowledgeGraphStaticRecordViewProps
  extends KnowledgeGraphStaticRecordViewCommonProps {
  /** Direct primitives accept only caller-declared generic visual graphs. */
  readonly presentation: PreparedGenericKnowledgeGraphPresentationV1;
}

interface KnowledgeGraphCorpusStaticRecordViewInternalProps
  extends KnowledgeGraphStaticRecordViewCommonProps {
  readonly presentation: PreparedCorpusKnowledgeGraphPresentationV1;
}

type KnowledgeGraphStaticRecordViewSurfaceProps =
  | KnowledgeGraphStaticRecordViewProps
  | KnowledgeGraphCorpusStaticRecordViewInternalProps;

const DEFAULT_STATIC_PAGE_SIZE = 10;
const MAX_STATIC_PAGE_SIZE = 25;
const STATIC_RECORD_INSTANCE_KEYS = new WeakMap<object, string>();
let nextStaticRecordInstanceKey = 0n;

function staticRecordInstanceKey(
  presentation: PreparedKnowledgeGraphPresentationV1,
): string {
  const existing = STATIC_RECORD_INSTANCE_KEYS.get(presentation);
  if (existing !== undefined) return existing;
  const created = `cortexel-kg-record-${nextStaticRecordInstanceKey}`;
  nextStaticRecordInstanceKey += 1n;
  STATIC_RECORD_INSTANCE_KEYS.set(presentation, created);
  return created;
}

function boundedPageSize(value: number | undefined): number {
  return Number.isSafeInteger(value)
    ? Math.max(1, Math.min(MAX_STATIC_PAGE_SIZE, value!))
    : DEFAULT_STATIC_PAGE_SIZE;
}

function codeUnitCompare(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareOptionalString(left: string | undefined, right: string | undefined): number {
  if (left === right) return 0;
  if (left === undefined) return -1;
  if (right === undefined) return 1;
  return codeUnitCompare(left, right);
}

function compareEvidence(
  left: KnowledgeGraphEvidenceRef,
  right: KnowledgeGraphEvidenceRef,
): number {
  const common = codeUnitCompare(left.kind, right.kind) ||
    codeUnitCompare(left.evidence_id, right.evidence_id);
  if (common !== 0 || left.kind !== right.kind) return common;
  switch (left.kind) {
    case 'graph_snapshot_record': {
      const matching = right as typeof left;
      return codeUnitCompare(left.record_id, matching.record_id) ||
        compareOptionalString(left.locator, matching.locator);
    }
    case 'graph_node': {
      const matching = right as typeof left;
      return codeUnitCompare(left.node_id, matching.node_id) ||
        compareOptionalString(left.locator, matching.locator) ||
        compareOptionalString(left.excerpt, matching.excerpt);
    }
    case 'citation': {
      const matching = right as typeof left;
      return codeUnitCompare(left.paper_id, matching.paper_id) ||
        codeUnitCompare(left.citation_id, matching.citation_id) ||
        (left.page ?? -1) - (matching.page ?? -1) ||
        compareOptionalString(left.locator, matching.locator) ||
        compareOptionalString(left.excerpt, matching.excerpt) ||
        compareOptionalString(left.doi, matching.doi);
    }
    case 'external_source': {
      const matching = right as typeof left;
      return codeUnitCompare(left.source_id, matching.source_id) ||
        compareOptionalString(left.locator, matching.locator) ||
        compareOptionalString(left.excerpt, matching.excerpt);
    }
  }
}

function EvidenceReference({ reference }: { reference: KnowledgeGraphEvidenceRef }) {
  return (
    <li>
      <dl>
        <dt>Kind</dt><dd>{reference.kind}</dd>
        <dt>Evidence id</dt><dd>{reference.evidence_id}</dd>
        {reference.kind === 'graph_snapshot_record' && (
          <><dt>Record id</dt><dd>{reference.record_id}</dd></>
        )}
        {reference.kind === 'graph_node' && (
          <><dt>Referenced node id</dt><dd>{reference.node_id}</dd></>
        )}
        {reference.kind === 'citation' && (
          <>
            <dt>Paper id</dt><dd>{reference.paper_id}</dd>
            <dt>Citation id</dt><dd>{reference.citation_id}</dd>
            {reference.page !== undefined && <><dt>Page</dt><dd>{reference.page}</dd></>}
            {reference.doi !== undefined && <><dt>DOI</dt><dd>{reference.doi}</dd></>}
          </>
        )}
        {reference.kind === 'external_source' && (
          <><dt>Source id</dt><dd>{reference.source_id}</dd></>
        )}
        {reference.locator !== undefined && <><dt>Locator</dt><dd>{reference.locator}</dd></>}
        {'excerpt' in reference && reference.excerpt !== undefined && (
          <><dt>Excerpt</dt><dd>{reference.excerpt}</dd></>
        )}
      </dl>
    </li>
  );
}

type EvidenceMetadata = Pick<
  KnowledgeGraph3DNode,
  'detail' | 'attributes' | 'epistemic' | 'evidence' | 'uncalibrated_score'
>;

function scalarText(value: null | boolean | number | string): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  return String(value);
}

function attributeValue(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    return (
      <ol>
        {value.map((item, index) => <li key={index}>{scalarText(item)}</li>)}
      </ol>
    );
  }
  return scalarText(value as null | boolean | number | string);
}

function CompleteMetadata({ value }: { value: EvidenceMetadata }) {
  const attributeEntries = Object.entries(value.attributes ?? {}).sort(([left], [right]) =>
    codeUnitCompare(left, right));
  const evidence = [...(value.evidence ?? [])].sort(compareEvidence);
  return (
    <>
      {value.detail !== undefined && <p>Detail: {value.detail}</p>}
      {attributeEntries.length > 0 && (
        <>
          <p>Attributes</p>
          <dl>
            {attributeEntries.map(([key, item]) => (
              <div key={key}><dt>{key}</dt><dd>{attributeValue(item)}</dd></div>
            ))}
          </dl>
        </>
      )}
      {value.epistemic !== undefined && (
        <>
          <p>Epistemic record</p>
          <dl>
            <dt>Status</dt><dd>{value.epistemic.status}</dd>
            <dt>Advisory only</dt><dd>{String(value.epistemic.advisory_only)}</dd>
            <dt>Paper-local evidence</dt>
            <dd>{String(value.epistemic.is_paper_local_evidence)}</dd>
            <dt>Calibrated posterior</dt>
            <dd>{String(value.epistemic.calibrated_posterior)}</dd>
          </dl>
        </>
      )}
      {value.uncalibrated_score !== undefined && (
        <>
          <p>Uncalibrated score</p>
          <dl>
            <dt>Meaning</dt><dd>{value.uncalibrated_score.kind}</dd>
            <dt>Value</dt><dd>{value.uncalibrated_score.value}</dd>
            <dt>Calibrated posterior</dt>
            <dd>{String(value.uncalibrated_score.calibrated_posterior)}</dd>
          </dl>
        </>
      )}
      {evidence.length > 0 && (
        <>
          <p>Evidence references ({evidence.length})</p>
          <ol>
            {evidence.map((reference) => (
              <EvidenceReference key={reference.evidence_id} reference={reference} />
            ))}
          </ol>
        </>
      )}
    </>
  );
}

function compareNodes(left: KnowledgeGraph3DNode, right: KnowledgeGraph3DNode): number {
  return codeUnitCompare(left.id, right.id) ||
    codeUnitCompare(left.kind, right.kind) ||
    codeUnitCompare(left.label, right.label);
}

function compareEdges(left: KnowledgeGraph3DEdge, right: KnowledgeGraph3DEdge): number {
  if (left.id !== undefined || right.id !== undefined) {
    const byId = compareOptionalString(left.id, right.id);
    if (byId !== 0) return byId;
  }
  return codeUnitCompare(left.source, right.source) ||
    codeUnitCompare(left.target, right.target) ||
    codeUnitCompare(left.kind, right.kind) ||
    Number(left.directed !== false) - Number(right.directed !== false) ||
    compareOptionalString(left.label, right.label);
}

/**
 * Deterministic paginated DOM browser for every record in a prepared graph.
 * Ordering uses exact ECMAScript UTF-16 code-unit comparison and never depends
 * on force-layout geometry, locale data, pointer state, or animation. One page
 * is mounted at a time so the DOM remains bounded at the maximum graph size.
 */
export function KnowledgeGraphStaticRecordView(
  props: KnowledgeGraphStaticRecordViewProps,
) {
  assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphStaticRecordView(props);
}

/** Package-internal corpus records used only in the caption-bound composition. */
export function KnowledgeGraphCorpusStaticRecordViewInternal(
  props: KnowledgeGraphCorpusStaticRecordViewInternalProps,
) {
  assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
  return renderKnowledgeGraphStaticRecordView(props);
}

function renderKnowledgeGraphStaticRecordView(
  props: KnowledgeGraphStaticRecordViewSurfaceProps,
) {
  assertPreparedKnowledgeGraphPresentation(props.presentation);
  if (props.view !== undefined) {
    assertPreparedKnowledgeGraphView(props.view, props.presentation);
  }
  return (
    <KnowledgeGraphStaticRecordViewInstance
      key={staticRecordInstanceKey(props.presentation)}
      {...props}
    />
  );
}

function KnowledgeGraphStaticRecordViewInstance({
  presentation,
  view,
  className,
  label = 'Deterministic paginated knowledge graph record view',
  nodePageSize,
  edgePageSize,
}: KnowledgeGraphStaticRecordViewSurfaceProps) {
  const nodes = useMemo(
    () => [...presentation.nodes].sort(compareNodes),
    [presentation.nodes],
  );
  const edges = useMemo(
    () => [...presentation.edges].sort(compareEdges),
    [presentation.edges],
  );
  const safeNodePageSize = boundedPageSize(nodePageSize);
  const safeEdgePageSize = boundedPageSize(edgePageSize);
  const [nodePage, setNodePage] = useState(0);
  const [edgePage, setEdgePage] = useState(0);
  const nodePageCount = Math.max(1, Math.ceil(nodes.length / safeNodePageSize));
  const edgePageCount = Math.max(1, Math.ceil(edges.length / safeEdgePageSize));
  const currentNodePage = Math.min(nodePage, nodePageCount - 1);
  const currentEdgePage = Math.min(edgePage, edgePageCount - 1);
  useEffect(() => {
    setNodePage((page) => Math.min(page, nodePageCount - 1));
  }, [nodePageCount]);
  useEffect(() => {
    setEdgePage((page) => Math.min(page, edgePageCount - 1));
  }, [edgePageCount]);
  const visibleNodes = nodes.slice(
    currentNodePage * safeNodePageSize,
    (currentNodePage + 1) * safeNodePageSize,
  );
  const visibleEdges = edges.slice(
    currentEdgePage * safeEdgePageSize,
    (currentEdgePage + 1) * safeEdgePageSize,
  );
  return (
    <section className={className} aria-label={safeDiagnosticText(label, 240)}>
      {view !== undefined && (
        <div role="note">
          <p>
            Filtered interactive view: showing {view.counts.visibleNodes} of{' '}
            {view.counts.sourceNodes} nodes and {view.counts.visibleEdges} of{' '}
            {view.counts.sourceEdges} relationships. The paginated records below
            remain the full source presentation.
          </p>
          <dl>
            <dt>Requested node kinds</dt>
            <dd>
              {view.policy.nodeKinds === 'all'
                ? 'all'
                : view.policy.nodeKinds.length === 0
                  ? 'none'
                  : view.policy.nodeKinds.join(', ')}
            </dd>
            <dt>Requested relationship kinds</dt>
            <dd>
              {view.policy.edgeKinds === 'all'
                ? 'all'
                : view.policy.edgeKinds.length === 0
                  ? 'none'
                  : view.policy.edgeKinds.join(', ')}
            </dd>
            <dt>Endpoint-pruned relationships</dt>
            <dd>{view.counts.endpointPrunedEdges}</dd>
            <dt>Kind-filtered relationships</dt>
            <dd>{view.counts.edgeKindFilteredEdges}</dd>
          </dl>
        </div>
      )}
      <h3>Presentation metadata</h3>
      <dl>
        <dt>Prepared contract</dt><dd>{presentation.contract}</dd>
        <dt>Profile</dt><dd>{presentation.profile}</dd>
        <dt>Graph lifecycle identity</dt><dd>{presentation.graphIdentity}</dd>
        <dt>Input boundary</dt><dd>{presentation.inputAssurance.boundary}</dd>
        <dt>Duplicate-member assurance</dt>
        <dd>{presentation.inputAssurance.duplicateMembers}</dd>
        <dt>Proxy-trap assurance</dt><dd>{presentation.inputAssurance.proxyTrapFreedom}</dd>
        <dt>Visual mapping authority</dt><dd>{presentation.mappingAuthority.kind}</dd>
        {presentation.mappingAuthority.kind === 'corpus_visual_mapping' && (
          <>
            <dt>Presentation invariants</dt>
            <dd>{presentation.mappingAuthority.presentationInvariants}</dd>
            <dt>Derivation authentication</dt>
            <dd>{presentation.mappingAuthority.derivationAuthentication}</dd>
          </>
        )}
        <dt>Scientific authority</dt>
        <dd>{presentation.mappingAuthority.scientificAuthority}</dd>
        <dt>Retained input occurrences</dt>
        <dd>{presentation.budget.retainedOccurrences}</dd>
        <dt>Accepted source string code units</dt>
        <dd>{presentation.budget.sourceStringCodeUnits}</dd>
        <dt>Inspection work</dt><dd>{presentation.budget.inspectionWork}</dd>
      </dl>
      {presentation.context !== undefined && (
        <>
          <p>Caller-declared graph context</p>
          <dl>
            <dt>Graph id</dt><dd>{presentation.context.graph_id}</dd>
            <dt>Graph source</dt><dd>{presentation.context.graph_source}</dd>
            <dt>Caller-declared snapshot namespace</dt>
            <dd>{presentation.context.graph_snapshot_id}</dd>
            <dt>Graph scope</dt><dd>{presentation.context.graph_scope}</dd>
            <dt>Generated at</dt><dd>{presentation.context.generated_at}</dd>
          </dl>
        </>
      )}
      <p role="note">
        This view preserves caller-supplied reference identifiers but does not resolve,
        authenticate, or establish custody for them. It contains no force-layout
        coordinates; visual positions and distances are not evidence.
      </p>
      <h3>Nodes ({nodes.length})</h3>
      {nodes.length === 0 && <p>This source presentation contains no nodes.</p>}
      <ol>
        {visibleNodes.map((node) => (
          <li key={node.id}>
            <h4>{node.label}</h4>
            <dl>
              <dt>Node id</dt><dd>{node.id}</dd>
              <dt>Kind</dt><dd>{node.kind}</dd>
              <dt>Visual color</dt><dd>{node.color}</dd>
              <dt>Visual glyph</dt><dd>{node.nodeGlyph ?? 'sphere_outline'}</dd>
              <dt>Visual radius</dt><dd>{node.radius}</dd>
              <dt>Radius meaning</dt>
              <dd>
                {presentation.profile === 'corpus_entity'
                  ? node.radiusMeaning
                  : `Caller-declared: ${
                    node.radiusMeaning ??
                    'visual size has no declared quantitative interpretation.'
                  }`}
              </dd>
            </dl>
            <CompleteMetadata value={node} />
          </li>
        ))}
      </ol>
      {nodes.length > safeNodePageSize && (
        <nav aria-label="Static record node pages">
          <p aria-live="polite">Node page {currentNodePage + 1} of {nodePageCount}</p>
          <button
            type="button"
            style={{ minHeight: 44, minWidth: 44 }}
            disabled={currentNodePage === 0}
            onClick={() => setNodePage(Math.max(0, currentNodePage - 1))}
          >
            Previous node records
          </button>
          <button
            type="button"
            style={{ minHeight: 44, minWidth: 44 }}
            disabled={currentNodePage + 1 >= nodePageCount}
            onClick={() => setNodePage(
              Math.min(nodePageCount - 1, currentNodePage + 1),
            )}
          >
            Next node records
          </button>
        </nav>
      )}
      <h3>Relationships ({edges.length})</h3>
      {edges.length === 0 && (
        <p>This source presentation contains no relationships.</p>
      )}
      <ol>
        {visibleEdges.map((edge) => (
          <li key={graphEdgeIdentityKey(edge)}>
            <h4>{edge.label ?? edge.kind}</h4>
            <dl>
              {edge.id !== undefined && <><dt>Assertion id</dt><dd>{edge.id}</dd></>}
              <dt>Source node id</dt><dd>{edge.source}</dd>
              <dt>Target node id</dt><dd>{edge.target}</dd>
              <dt>Kind</dt><dd>{edge.kind}</dd>
              <dt>Direction</dt>
              <dd>{edge.directed === false ? 'undirected' : 'source to target'}</dd>
              <dt>Visual color</dt><dd>{edge.color}</dd>
              <dt>Visual stroke pattern</dt>
              <dd>{edge.edgeStrokePattern ?? 'solid'}</dd>
              <dt>Flow-marker encoding enabled</dt>
              <dd>{String(edge.particles === true)}</dd>
            </dl>
            <CompleteMetadata value={edge} />
          </li>
        ))}
      </ol>
      {edges.length > safeEdgePageSize && (
        <nav aria-label="Static record relationship pages">
          <p aria-live="polite">
            Relationship page {currentEdgePage + 1} of {edgePageCount}
          </p>
          <button
            type="button"
            style={{ minHeight: 44, minWidth: 44 }}
            disabled={currentEdgePage === 0}
            onClick={() => setEdgePage(Math.max(0, currentEdgePage - 1))}
          >
            Previous relationship records
          </button>
          <button
            type="button"
            style={{ minHeight: 44, minWidth: 44 }}
            disabled={currentEdgePage + 1 >= edgePageCount}
            onClick={() => setEdgePage(
              Math.min(edgePageCount - 1, currentEdgePage + 1),
            )}
          >
            Next relationship records
          </button>
        </nav>
      )}
    </section>
  );
}
