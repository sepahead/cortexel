/**
 * Shared zero-dependency limits for evidence-bearing knowledge-graph records.
 * Render-only entrypoints enforce these without pulling zod into their bundle.
 */
export const KNOWLEDGE_GRAPH_LIMITS = Object.freeze({
  /** Accepted presentation/inspection limits. These match the legacy params gate. */
  maxPresentationNodes: 1_000,
  maxPresentationEdges: 4_000,
  /**
   * Main-thread d3-force refinement limits. Above either bound the canonical
   * composition retains the caption and complete DOM records but does not mount
   * the live 3D solver. These are resource ceilings, not portable FPS claims.
   */
  maxLiveForceNodes: 250,
  maxLiveForceEdges: 1_000,
  /**
   * Aggregate presentation limits apply across every retained occurrence. Aliased
   * containers receive no amortization: each occurrence is inspected and copied.
   */
  maxPresentationRetainedOccurrences: 250_000,
  maxPresentationStringCodeUnits: 4_000_000,
  maxPresentationInspectionWork: 1_000_000,
  /** A view can explicitly name every kind present in its bounded source. */
  maxViewNodeKinds: 1_000,
  maxViewEdgeKinds: 4_000,
  /** Equivalent hot-path policies reuse one token without unbounded cache growth. */
  maxCachedViewsPerPresentation: 128,
  /** Strong raw-JSON boundary, before a presentation object is materialized. */
  maxPresentationRawInputBytes: 16_000_000,
  maxPresentationJsonDepth: 8,
  maxPresentationJsonNodes: 300_000,
  maxPresentationJsonNumberTokenLength: 100,
  maxNodeIdLength: 120,
  maxNodeLabelLength: 240,
  maxEdgeIdLength: 320,
  maxEdgeLabelLength: 160,
  maxKindLength: 80,
  maxColorLength: 64,
  maxRadiusMeaningLength: 400,
  maxAttributes: 24,
  maxAttributeKeyLength: 80,
  maxAttributeArrayItems: 16,
  maxEvidenceRefsPerElement: 8,
  maxEvidenceIdLength: 384,
  maxRecordIdLength: 320,
  maxLocatorLength: 240,
  maxPaperIdLength: 160,
  maxCitationIdLength: 160,
  maxSourceIdLength: 240,
  maxDoiLength: 240,
  maxParallelEdgesPerPair: 9,
  maxDetailLength: 1_000,
  maxAttributeStringLength: 500,
  maxExcerptLength: 1_000,
});

/** One strict-parser profile shared by generic presentations and corpus VizSpecs. */
export const KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS = Object.freeze({
  rawInputBytes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationRawInputBytes,
  jsonDepth: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonDepth,
  jsonTotalNodes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonNodes,
  jsonStringLength: Math.max(
    1_024,
    KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength,
    KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength,
  ),
  jsonNumberTokenLength:
    KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonNumberTokenLength,
  jsonObjectKeys: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
  jsonArrayItems: KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges,
});
