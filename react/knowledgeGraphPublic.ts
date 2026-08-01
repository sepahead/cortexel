/**
 * Public `cortexel/react/knowledge-graph` surface.
 *
 * Direct primitives accept only caller-declared generic visual presentations.
 * Corpus presentations are rendered solely by the caption-bound canonical
 * composition; package-internal corpus implementations are intentionally absent.
 */

export {
  KnowledgeGraph3DScene,
  type ControlsHandle,
  type KnowledgeGraph3DSceneProps,
  type KnowledgeGraph3DEdge,
  type KnowledgeGraph3DNode,
} from './KnowledgeGraph3DScene';

export {
  DEFAULT_A11Y_NODE_PAGE_SIZE,
  MAX_A11Y_NODE_PAGE_SIZE,
  KnowledgeGraphA11yList,
  KnowledgeGraphLegend,
  type KnowledgeGraphA11yListProps,
  type KnowledgeGraphLegendProps,
} from './KnowledgeGraphA11yList';

export {
  KnowledgeGraphStaticRecordView,
  type KnowledgeGraphStaticRecordViewProps,
} from './KnowledgeGraphStaticRecordView';

export {
  KnowledgeGraphAccessibleFigure,
  type KnowledgeGraphAccessibleFigureCommonProps,
  type KnowledgeGraphAccessibleFigureProps,
  type KnowledgeGraphVisualHostContextV1,
  type KnowledgeGraphVisualRenderer,
} from './KnowledgeGraphAccessibleFigure';

export {
  CORPUS_GRAPH_RADIUS_MEANING,
  DEFAULT_GRAPH_NODE_RADIUS,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS,
  GRAPH_LAYOUT_TICK_SECONDS,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_LAYOUT_TICKS_PER_FRAME,
  MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES,
  advanceGraphLayoutClock,
  advanceGraphLayoutClockInto,
  assertKnowledgeGraphLiveForceBudget,
  assertKnowledgeGraphPresentationBudget,
  assertKnowledgeGraphIdentity,
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  assignGraphEdgeLanes,
  buildAdjacency,
  corpusGraphInstanceIdentity,
  corpusGraphRadiusMeaning,
  defaultEdgeStyles,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  graphCameraTargetDamping,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphEdgeTargetBoundaryInto,
  graphQueryMatchIds,
  isKnowledgeGraphLiveForceWithinBudget,
  knowledgeGraphLiveForceAvailability,
  graphSignature,
  matchesGraphQuery,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
  reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks,
  type GraphEdgeIdentity,
  type GraphEdgeLane,
  type GraphLayoutClockResult,
  type GraphPoint3,
  type GraphSearchNode,
  type GraphTopologyLink,
  type KnowledgeGraphAttributes,
  type KnowledgeGraphContext,
  type KnowledgeGraphEdgeKind,
  type KnowledgeGraphEpistemic,
  type KnowledgeGraphEvidenceRef,
  type KnowledgeGraphNodeKind,
  type KnowledgeGraphLiveForceAvailabilityV1,
  type KnowledgeGraphUncalibratedScore,
} from './knowledgeGraph';

export {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  KnowledgeGraphPresentationJsonError,
  assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView,
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
  type PreparedCorpusKnowledgeGraphPresentationV1,
  type PreparedGenericKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from './knowledgeGraphPresentation.internal';

export {
  prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson,
  type AcceptedKnowledgeGraphFigureSourceV1,
  type KnowledgeGraphFigureHostPolicyV1,
  type KnowledgeGraphFigurePreparationErrorV1,
  type KnowledgeGraphFigureSourceInputAssuranceV1,
  type PrepareCorpusKnowledgeGraphFigureOptionsV1,
  type PrepareCorpusKnowledgeGraphFigureResultV1,
} from './knowledgeGraphFigure';
