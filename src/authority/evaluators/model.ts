/** Shared constructors for canonicalRequest-only independent authority evaluators. */

import { canonicalDigest } from '../../core/canonicalize.js';
import type {
  AuthorityCellV1,
  AuthorityDerivationValueV1,
  AuthorityEvaluationV1,
  AuthorityGeometryEntryV1,
  AuthoritySummaryScalarV1,
  RegisteredAuthorityEvaluatorV1,
} from '../../core/output-authority.js';
import type { DisclosureFacts } from '../../core/disclosures.js';
import type { JsonValue } from '../../core/parse-json.js';

export function authorityEvaluatorId(skillId: string, revision: number): string {
  return `${skillId}.output_authority.v${revision}`;
}

export function rowSequence(
  rows: readonly (readonly AuthorityCellV1[])[],
): AuthorityDerivationValueV1 {
  return { tag: 'row_sequence', rows };
}

export function geometrySequence(
  entries: readonly AuthorityGeometryEntryV1[],
): AuthorityDerivationValueV1 {
  return { tag: 'geometry_sequence', entries };
}

export function summaryFactMap(
  facts: Readonly<Record<string, AuthoritySummaryScalarV1>>,
): AuthorityDerivationValueV1 {
  return { tag: 'summary_fact_map', facts };
}

export function disclosureFactMap(
  facts: Readonly<DisclosureFacts>,
): AuthorityDerivationValueV1 {
  return { tag: 'disclosure_fact_map', facts };
}

export function defineAuthorityEvaluator(
  id: string,
  deriveFields: (
    canonicalRequest: JsonValue,
  ) => Readonly<Record<string, AuthorityDerivationValueV1>>,
): RegisteredAuthorityEvaluatorV1 {
  return Object.freeze({
    id,
    evaluateCanonicalRequest(canonicalRequest: JsonValue): AuthorityEvaluationV1 {
      return {
        evaluatorId: id,
        canonicalRequestDigest: canonicalDigest(canonicalRequest),
        fields: deriveFields(canonicalRequest),
      };
    },
  });
}

export function carrier(
  classId: string,
  provenance: JsonValue,
): AuthorityGeometryEntryV1 {
  return { tag: 'carrier', classId, provenance };
}
