/**
 * Pure data types shared by the knowledge-graph mapper, presentation authority,
 * and React surfaces. This module has no value imports and must remain a leaf: the
 * private capability runtime may not depend on React, Three, R3F, or d3 modules.
 */

export type KnowledgeGraphNodeKind = 'paper' | 'model' | 'family';

export type KnowledgeGraphNodeGlyph =
  | 'sphere_outline'
  | 'box_shell'
  | 'diamond_shell';

export type KnowledgeGraphEdgeKind =
  | 'cites'
  | 'same_as'
  | 'variant_of'
  | 'instantiates'
  | 'belongs_to_family';

export type KnowledgeGraphEdgeStrokePattern =
  | 'solid'
  | 'long_dash'
  | 'short_dash'
  | 'dotted';

export type KnowledgeGraphAttributeScalar = null | boolean | number | string;

export type KnowledgeGraphAttributeValue =
  | KnowledgeGraphAttributeScalar
  | readonly KnowledgeGraphAttributeScalar[];

export type KnowledgeGraphAttributes = Readonly<
  Record<string, KnowledgeGraphAttributeValue>
>;

export interface KnowledgeGraphEpistemic {
  readonly status: 'derived_advisory';
  readonly advisory_only: true;
  readonly is_paper_local_evidence: false;
  readonly calibrated_posterior: false;
}

interface KnowledgeGraphEvidenceBase {
  readonly evidence_id: string;
  readonly locator?: string;
}

export type KnowledgeGraphEvidenceRef =
  | (KnowledgeGraphEvidenceBase & {
      readonly kind: 'graph_snapshot_record';
      readonly record_id: string;
    })
  | (KnowledgeGraphEvidenceBase & {
      readonly kind: 'graph_node';
      readonly node_id: string;
      readonly excerpt?: string;
    })
  | (KnowledgeGraphEvidenceBase & {
      readonly kind: 'citation';
      readonly paper_id: string;
      readonly citation_id: string;
      readonly page?: number;
      readonly excerpt?: string;
      readonly doi?: string;
    })
  | (KnowledgeGraphEvidenceBase & {
      readonly kind: 'external_source';
      readonly source_id: string;
      readonly excerpt?: string;
    });

export interface KnowledgeGraphUncalibratedScore {
  readonly kind:
    | 'extraction_confidence'
    | 'citation_resolution_confidence'
    | 'structural_similarity'
    | 'behavioral_agreement'
    | 'retrieval_relevance';
  readonly value: number;
  readonly calibrated_posterior: false;
}

export interface KnowledgeGraphContext {
  readonly graph_id: string;
  readonly graph_source: string;
  readonly graph_snapshot_id: string;
  readonly graph_scope: string;
  readonly generated_at: string;
}

export interface KnowledgeGraph3DNode {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  readonly attributes?: KnowledgeGraphAttributes;
  readonly epistemic?: KnowledgeGraphEpistemic;
  readonly evidence?: readonly KnowledgeGraphEvidenceRef[];
  readonly uncalibrated_score?: KnowledgeGraphUncalibratedScore;
  /** Exact normalized hex presentation color; not evidence. */
  readonly color: string;
  /** Positive bounded schematic radius; not quantitative evidence. */
  readonly radius: number;
  /** Human-readable radius semantics. Omission means caller-defined visual size. */
  readonly radiusMeaning?: string;
  readonly kind: string;
  /** Closed redundant visual-kind channel; defaults to an outlined sphere. */
  readonly nodeGlyph?: KnowledgeGraphNodeGlyph;
}

export interface KnowledgeGraph3DEdge {
  /** Stable assertion identity. Distinct ids may share endpoints and kind. */
  readonly id?: string;
  readonly label?: string;
  readonly attributes?: KnowledgeGraphAttributes;
  readonly epistemic?: KnowledgeGraphEpistemic;
  readonly evidence?: readonly KnowledgeGraphEvidenceRef[];
  readonly uncalibrated_score?: KnowledgeGraphUncalibratedScore;
  readonly source: string;
  readonly target: string;
  /** Exact normalized hex presentation color; not evidence. */
  readonly color: string;
  /** Directed edges receive a persistent arrowhead, including under reduced motion. */
  readonly directed?: boolean;
  readonly kind: string;
  /** Visual source-to-target flow marker. */
  readonly particles?: boolean;
  /** Closed redundant relationship-kind channel; defaults to a solid stroke. */
  readonly edgeStrokePattern?: KnowledgeGraphEdgeStrokePattern;
}
