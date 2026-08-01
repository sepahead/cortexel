/**
 * `cortexel/knowledge-graph` — peer-free preparation and inspection for the
 * experimental pre-1.0 knowledge-graph presentation surface.
 *
 * This entry loads no React, Three, R3F, d3, browser, network, or filesystem
 * module. It validates coherent bounded records; it is not a FigureRequestV1
 * skill, evidence resolver, snapshot authenticator, custody proof, or renderer.
 */

export {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  assertPreparedKnowledgeGraphView,
  assertPreparedGenericKnowledgeGraphPresentation,
  KnowledgeGraphPresentationJsonError,
  assertPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView,
  knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode,
  parseKnowledgeGraphPresentationJson,
  prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView,
  serializePreparedKnowledgeGraphPresentation,
  type KnowledgeGraphPresentationBudgetReceiptV1,
  type KnowledgeGraphPresentationInputAssuranceV1,
  type KnowledgeGraphPresentationInputV1,
  type KnowledgeGraphPresentationMappingAuthorityV1,
  type KnowledgeGraphViewPolicyV1,
  type PreparedKnowledgeGraphPresentationV1,
  type PreparedGenericKnowledgeGraphPresentationV1,
  type PreparedCorpusKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from '../../react/knowledgeGraphPresentation.internal.js';

export {
  CORPUS_GRAPH_RADIUS_MEANING,
  corpusGraphInstanceIdentity,
  corpusGraphRadiusMeaning,
} from '../../react/knowledgeGraph.js';

export {
  prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson,
  type AcceptedKnowledgeGraphFigureSourceV1,
  type KnowledgeGraphFigureHostPolicyV1,
  type KnowledgeGraphFigurePreparationErrorV1,
  type KnowledgeGraphFigureSourceInputAssuranceV1,
  type PrepareCorpusKnowledgeGraphFigureOptionsV1,
  type PrepareCorpusKnowledgeGraphFigureResultV1,
} from '../../react/knowledgeGraphFigure.js';

export type {
  KnowledgeGraph3DEdge,
  KnowledgeGraph3DNode,
  KnowledgeGraphAttributeScalar,
  KnowledgeGraphAttributeValue,
  KnowledgeGraphAttributes,
  KnowledgeGraphContext,
  KnowledgeGraphEdgeKind,
  KnowledgeGraphEpistemic,
  KnowledgeGraphEvidenceRef,
  KnowledgeGraphNodeKind,
  KnowledgeGraphUncalibratedScore,
} from '../../react/knowledgeGraphPresentation.types.js';
