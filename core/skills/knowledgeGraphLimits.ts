/**
 * Shared zero-dependency limits for evidence-bearing knowledge-graph records.
 * Render-only entrypoints enforce these without pulling zod into their bundle.
 */
export const KNOWLEDGE_GRAPH_LIMITS = Object.freeze({
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
