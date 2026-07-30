import type {
  KnowledgeGraph3DEdge,
  KnowledgeGraph3DNode,
} from './KnowledgeGraph3DScene';
import type {
  KnowledgeGraphAttributes,
  KnowledgeGraphEpistemic,
  KnowledgeGraphEvidenceRef,
  KnowledgeGraphUncalibratedScore,
} from './knowledgeGraph';
import { KNOWLEDGE_GRAPH_LIMITS } from '../core/skills/knowledgeGraphLimits';

type AttributeValue = KnowledgeGraphAttributes[string];

function boundedString(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > maxLength) {
    throw new TypeError(`${label} must be a non-empty string <= ${maxLength} characters`);
  }
  return value;
}

function optionalBoundedString(
  value: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  return value === undefined ? undefined : boundedString(value, label, maxLength);
}

export function assertKnowledgeGraphNodeReference(
  value: unknown,
  label: string,
): asserts value is string | null {
  if (value === null) return;
  boundedString(value, label, KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength);
}

export function assertKnowledgeGraphColor(value: unknown, label: string): void {
  if (value === undefined) return;
  boundedString(value, label, KNOWLEDGE_GRAPH_LIMITS.maxColorLength);
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return value;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new TypeError(`${label} must be boolean when present`);
  }
  return value;
}

function assertAttributeScalar(value: unknown): asserts value is Exclude<
  AttributeValue,
  unknown[]
> {
  if (
    value !== null &&
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    throw new TypeError('knowledge-graph attribute values must be JSON scalars or arrays');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError('knowledge-graph numeric attributes must be finite');
  }
  if (
    typeof value === 'string' &&
    value.length > KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength
  ) {
    throw new RangeError(
      `knowledge-graph attribute strings may contain at most ` +
        `${KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength} characters`,
    );
  }
}

function snapshotAttributes(
  attributes: Readonly<KnowledgeGraphAttributes> | undefined,
): KnowledgeGraphAttributes | undefined {
  if (attributes === undefined) return undefined;
  if (attributes === null || typeof attributes !== 'object' || Array.isArray(attributes)) {
    throw new TypeError('knowledge-graph attributes must be a plain record');
  }
  const prototype = Object.getPrototypeOf(attributes);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('knowledge-graph attributes must use a plain or null prototype');
  }

  const snapshot: Record<string, AttributeValue> = Object.create(null) as
    Record<string, AttributeValue>;
  let count = 0;
  for (const key in attributes) {
    if (!Object.hasOwn(attributes, key)) continue;
    count += 1;
    if (count > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
      throw new RangeError(
        `knowledge-graph attributes may contain at most ` +
          `${KNOWLEDGE_GRAPH_LIMITS.maxAttributes} keys`,
      );
    }
    if (key.length < 1 || key.length > KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength) {
      throw new RangeError(
        `knowledge-graph attribute keys must contain 1 to ` +
          `${KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength} characters`,
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(attributes, key);
    if (!descriptor || !('value' in descriptor)) {
      throw new TypeError('knowledge-graph attribute accessors are not supported');
    }
    const value: unknown = descriptor.value;
    if (!Array.isArray(value)) {
      assertAttributeScalar(value);
      snapshot[key] = value;
      continue;
    }
    if (value.length > KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems) {
      throw new RangeError(
        `knowledge-graph attribute arrays may contain at most ` +
          `${KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems} items`,
      );
    }
    const items = new Array<Exclude<AttributeValue, unknown[]>>(value.length);
    for (let index = 0; index < value.length; index++) {
      const item = Object.getOwnPropertyDescriptor(value, String(index));
      if (!item || !('value' in item)) {
        throw new TypeError('knowledge-graph attribute arrays must be dense data arrays');
      }
      assertAttributeScalar(item.value);
      items[index] = item.value;
    }
    snapshot[key] = items;
  }
  return snapshot as KnowledgeGraphAttributes;
}

function snapshotEpistemic(
  epistemic: Readonly<KnowledgeGraphEpistemic> | undefined,
): KnowledgeGraphEpistemic | undefined {
  if (epistemic === undefined) return undefined;
  if (
    epistemic.status !== 'derived_advisory' ||
    epistemic.advisory_only !== true ||
    epistemic.is_paper_local_evidence !== false ||
    epistemic.calibrated_posterior !== false
  ) {
    throw new TypeError('knowledge-graph epistemic metadata must remain derived/advisory');
  }
  return {
    status: epistemic.status,
    advisory_only: epistemic.advisory_only,
    is_paper_local_evidence: epistemic.is_paper_local_evidence,
    calibrated_posterior: epistemic.calibrated_posterior,
  };
}

function snapshotEvidence(
  evidence: readonly KnowledgeGraphEvidenceRef[] | undefined,
): KnowledgeGraphEvidenceRef[] | undefined {
  if (evidence === undefined) return undefined;
  if (evidence.length > KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement) {
    throw new RangeError(
      `knowledge-graph evidence may contain at most ` +
        `${KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement} references`,
    );
  }
  const snapshot = new Array<KnowledgeGraphEvidenceRef>(evidence.length);
  for (let index = 0; index < evidence.length; index++) {
    const item = Object.getOwnPropertyDescriptor(evidence, String(index));
    if (!item || !('value' in item) || item.value === null ||
        typeof item.value !== 'object') {
      throw new TypeError('knowledge-graph evidence must be a dense data array');
    }
    const reference = item.value as KnowledgeGraphEvidenceRef;
    switch (reference.kind) {
      case 'graph_snapshot_record':
        snapshot[index] = {
          kind: reference.kind,
          evidence_id: boundedString(
            reference.evidence_id,
            'knowledge-graph evidence id',
            KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength,
          ),
          record_id: boundedString(
            reference.record_id,
            'knowledge-graph record id',
            KNOWLEDGE_GRAPH_LIMITS.maxRecordIdLength,
          ),
          locator: optionalBoundedString(
            reference.locator,
            'knowledge-graph evidence locator',
            KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength,
          ),
        };
        break;
      case 'graph_node':
        snapshot[index] = {
          kind: reference.kind,
          evidence_id: boundedString(
            reference.evidence_id,
            'knowledge-graph evidence id',
            KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength,
          ),
          node_id: boundedString(
            reference.node_id,
            'knowledge-graph evidence node id',
            KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength,
          ),
          locator: optionalBoundedString(
            reference.locator,
            'knowledge-graph evidence locator',
            KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength,
          ),
          excerpt: optionalBoundedString(
            reference.excerpt,
            'knowledge-graph evidence excerpt',
            KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength,
          ),
        };
        break;
      case 'citation':
        if (
          reference.page !== undefined &&
          (!Number.isSafeInteger(reference.page) || reference.page < 0)
        ) {
          throw new TypeError('knowledge-graph citation page must be a non-negative integer');
        }
        snapshot[index] = {
          kind: reference.kind,
          evidence_id: boundedString(
            reference.evidence_id,
            'knowledge-graph evidence id',
            KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength,
          ),
          paper_id: boundedString(
            reference.paper_id,
            'knowledge-graph evidence paper id',
            KNOWLEDGE_GRAPH_LIMITS.maxPaperIdLength,
          ),
          citation_id: boundedString(
            reference.citation_id,
            'knowledge-graph citation id',
            KNOWLEDGE_GRAPH_LIMITS.maxCitationIdLength,
          ),
          page: reference.page,
          locator: optionalBoundedString(
            reference.locator,
            'knowledge-graph evidence locator',
            KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength,
          ),
          excerpt: optionalBoundedString(
            reference.excerpt,
            'knowledge-graph evidence excerpt',
            KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength,
          ),
          doi: optionalBoundedString(
            reference.doi,
            'knowledge-graph evidence DOI',
            KNOWLEDGE_GRAPH_LIMITS.maxDoiLength,
          ),
        };
        break;
      case 'external_source':
        snapshot[index] = {
          kind: reference.kind,
          evidence_id: boundedString(
            reference.evidence_id,
            'knowledge-graph evidence id',
            KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength,
          ),
          source_id: boundedString(
            reference.source_id,
            'knowledge-graph evidence source id',
            KNOWLEDGE_GRAPH_LIMITS.maxSourceIdLength,
          ),
          locator: optionalBoundedString(
            reference.locator,
            'knowledge-graph evidence locator',
            KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength,
          ),
          excerpt: optionalBoundedString(
            reference.excerpt,
            'knowledge-graph evidence excerpt',
            KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength,
          ),
        };
        break;
      default:
        throw new TypeError('unsupported knowledge-graph evidence reference');
    }
  }
  return snapshot;
}

function snapshotScore(
  score: Readonly<KnowledgeGraphUncalibratedScore> | undefined,
): KnowledgeGraphUncalibratedScore | undefined {
  if (score === undefined) return undefined;
  const value = finiteNumber(score.value, 'knowledge-graph score value');
  if (
    ![
      'extraction_confidence',
      'citation_resolution_confidence',
      'structural_similarity',
      'behavioral_agreement',
      'retrieval_relevance',
    ].includes(score.kind) ||
    score.calibrated_posterior !== false ||
    value < 0 ||
    value > 1
  ) {
    throw new TypeError('knowledge-graph scores must be bounded and explicitly uncalibrated');
  }
  return {
    kind: score.kind,
    value,
    calibrated_posterior: score.calibrated_posterior,
  };
}

function snapshotNode(node: KnowledgeGraph3DNode): KnowledgeGraph3DNode {
  if (typeof node.radius !== 'number') {
    throw new TypeError('knowledge-graph node radius must be numeric');
  }
  return {
    id: boundedString(
      node.id,
      'knowledge-graph node id',
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength,
    ),
    label: boundedString(
      node.label,
      'knowledge-graph node label',
      KNOWLEDGE_GRAPH_LIMITS.maxNodeLabelLength,
    ),
    detail: optionalBoundedString(
      node.detail,
      'knowledge-graph node detail',
      KNOWLEDGE_GRAPH_LIMITS.maxDetailLength,
    ),
    attributes: snapshotAttributes(node.attributes),
    epistemic: snapshotEpistemic(node.epistemic),
    evidence: snapshotEvidence(node.evidence),
    uncalibrated_score: snapshotScore(node.uncalibrated_score),
    color: boundedString(
      node.color,
      'knowledge-graph node color',
      KNOWLEDGE_GRAPH_LIMITS.maxColorLength,
    ),
    radius: node.radius,
    radiusMeaning: optionalBoundedString(
      node.radiusMeaning,
      'knowledge-graph radius meaning',
      KNOWLEDGE_GRAPH_LIMITS.maxRadiusMeaningLength,
    ),
    kind: boundedString(
      node.kind,
      'knowledge-graph node kind',
      KNOWLEDGE_GRAPH_LIMITS.maxKindLength,
    ),
  };
}

function snapshotEdge(edge: KnowledgeGraph3DEdge): KnowledgeGraph3DEdge {
  return {
    id: optionalBoundedString(
      edge.id,
      'knowledge-graph edge id',
      KNOWLEDGE_GRAPH_LIMITS.maxEdgeIdLength,
    ),
    label: optionalBoundedString(
      edge.label,
      'knowledge-graph edge label',
      KNOWLEDGE_GRAPH_LIMITS.maxEdgeLabelLength,
    ),
    attributes: snapshotAttributes(edge.attributes),
    epistemic: snapshotEpistemic(edge.epistemic),
    evidence: snapshotEvidence(edge.evidence),
    uncalibrated_score: snapshotScore(edge.uncalibrated_score),
    source: boundedString(
      edge.source,
      'knowledge-graph edge source',
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength,
    ),
    target: boundedString(
      edge.target,
      'knowledge-graph edge target',
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength,
    ),
    color: boundedString(
      edge.color,
      'knowledge-graph edge color',
      KNOWLEDGE_GRAPH_LIMITS.maxColorLength,
    ),
    directed: optionalBoolean(edge.directed, 'knowledge-graph edge directed'),
    kind: boundedString(
      edge.kind,
      'knowledge-graph edge kind',
      KNOWLEDGE_GRAPH_LIMITS.maxKindLength,
    ),
    particles: optionalBoolean(edge.particles, 'knowledge-graph edge particles'),
  };
}

/**
 * After the public caller checks top-level node/edge counts, capture a graph
 * presentation as detached plain records. Nested container limits are enforced
 * before copying so an untyped direct caller cannot amplify work through one
 * nominally bounded node or edge.
 */
export function snapshotKnowledgeGraphPresentation(
  nodes: readonly KnowledgeGraph3DNode[],
  edges: readonly KnowledgeGraph3DEdge[],
): {
  nodes: KnowledgeGraph3DNode[];
  edges: KnowledgeGraph3DEdge[];
} {
  return {
    nodes: nodes.map(snapshotNode),
    edges: edges.map(snapshotEdge),
  };
}
