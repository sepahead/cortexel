/**
 * OutputAuthority / AuthorityAlgebra V1.
 *
 * This module is deliberately separate from every figure compiler.  A compiler's own
 * row count, mark count, or derivation receipt cannot establish that the compiler did
 * not omit a carrier: the same defect can omit the carrier and decrement its receipt.
 * The interpreter therefore consumes facts produced by a registered independent
 * evaluator and compares them with the exposed output.  It never evaluates source text,
 * JSON Pointer, callbacks stored in a contract, or a recursive expression language.
 *
 * The finite influence checker is a regression witness over two declared inputs.  It is
 * useful executable evidence; it is not a universal proof that a field influences every
 * possible request.
 */

import { canonicalDigest, canonicalize } from './canonicalize.js';
import type { DisclosureFacts } from './disclosures.js';
import type { JsonValue } from './parse-json.js';

export type AuthorityCellV1 = string | number | null;
/** Final language-neutral placeholder text; no host-language scalar coercion occurs. */
export type AuthoritySummaryScalarV1 = string;

export interface AuthorityRequestFieldSegmentV1 {
  readonly tag: 'field';
  readonly name: string;
}

export interface AuthorityRequestIndexSegmentV1 {
  readonly tag: 'index';
  readonly index: number;
}

export type AuthorityRequestPathSegmentV1 =
  | AuthorityRequestFieldSegmentV1
  | AuthorityRequestIndexSegmentV1;

export interface AuthorityRequestPathRefV1 {
  readonly tag: 'request_path';
  /** Resolves only through the source contract's finite requestPaths vocabulary. */
  readonly pathId: string;
}

export interface AuthorityDerivationFieldRefV1 {
  readonly tag: 'derivation_field';
  readonly field: string;
}

export type AuthorityRefV1 = AuthorityRequestPathRefV1 | AuthorityDerivationFieldRefV1;

export type AuthorityDerivationValueKindV1 =
  | 'row_sequence'
  | 'geometry_sequence'
  | 'summary_fact_map'
  | 'disclosure_fact_map';

export interface AuthorityDerivationFieldDeclarationV1 {
  readonly id: string;
  readonly valueKind: AuthorityDerivationValueKindV1;
}

export interface AuthorityTableV1 {
  readonly tag: 'row_sequence';
  readonly expectedRows: AuthorityDerivationFieldRefV1;
  readonly carriedValueColumns: readonly string[];
  /** Exact sequence is stronger than multiset equality and preserves meaningful row order. */
  readonly comparison: 'canonical_json_sequence_exact';
  readonly rowsTotal: 'from_verified_expected_rows';
}

export interface AuthorityGeometryClassV1 {
  readonly tag: 'geometry_class';
  readonly id: string;
  readonly cardinality: 'exact';
  readonly order: 'exact';
  readonly provenance: 'exact';
  /**
   * `carrier_only` makes no coordinate claim. `canonical_geometry_exact` is legal only
   * when the registered evaluator independently derives the complete geometry payload.
   */
  readonly payloadAssurance: 'carrier_only' | 'canonical_geometry_exact';
}

export interface AuthorityGeometryV1 {
  readonly tag: 'classified_geometry';
  readonly traversal: 'nested_groups_depth_first_preorder';
  readonly excludedRoles: readonly ['axis', 'text', 'disclosure', 'decorative_mark'];
  /** One global sequence preserves inter-class DFS interleaving as well as class order. */
  readonly expectedSequence: AuthorityDerivationFieldRefV1;
  readonly classes: readonly AuthorityGeometryClassV1[];
}

export interface AuthorityInfluenceWitnessV1 {
  readonly tag: 'paired_input';
  readonly id: string;
  /** Living valid example used as the finite baseline; this is not a universal proof. */
  readonly exampleIndex: number;
  readonly input: AuthorityRequestPathRefV1;
  readonly leftValue: JsonValue;
  readonly rightValue: JsonValue;
  readonly affected: readonly AuthorityDerivationFieldRefV1[];
  readonly protected: readonly AuthorityDerivationFieldRefV1[];
}

export interface AuthorityInfluenceV1 {
  readonly tag: 'finite_paired_witnesses';
  readonly witnesses: readonly AuthorityInfluenceWitnessV1[];
}

export interface AuthoritySummaryV1 {
  readonly tag: 'fact_template';
  readonly expectedFacts: AuthorityDerivationFieldRefV1;
  readonly requiredPlaceholders: readonly string[];
  readonly missingFactPolicy: 'refuse';
  readonly unknownFactPolicy: 'refuse';
}

export interface AuthorityDisclosuresV1 {
  readonly tag: 'derived_disclosures';
  readonly expectedFacts: AuthorityDerivationFieldRefV1;
}

export interface OutputAuthorityV1 {
  readonly version: 1;
  readonly evaluator: {
    readonly tag: 'registered_evaluator';
    readonly id: string;
  };
  readonly requestPaths: readonly {
    readonly id: string;
    readonly segments: readonly AuthorityRequestPathSegmentV1[];
  }[];
  readonly derivationFields: readonly AuthorityDerivationFieldDeclarationV1[];
  readonly table: AuthorityTableV1;
  readonly geometry: AuthorityGeometryV1;
  readonly influence: AuthorityInfluenceV1;
  readonly summary: AuthoritySummaryV1;
  readonly disclosures: AuthorityDisclosuresV1;
}

export interface AuthorityRowSequenceValueV1 {
  readonly tag: 'row_sequence';
  readonly rows: readonly (readonly AuthorityCellV1[])[];
}

export interface AuthorityGeometryCarrierEntryV1 {
  readonly tag: 'carrier';
  readonly classId: string;
  /** Stable scientific carrier identity, not a compiler ordinal or mark count. */
  readonly provenance: JsonValue;
}

export interface AuthorityCanonicalGeometryEntryV1 {
  readonly tag: 'canonical_geometry';
  readonly classId: string;
  /** Stable scientific carrier identity, not a compiler ordinal or mark count. */
  readonly provenance: JsonValue;
  /** Independently derived geometry/encoding, never copied from a plan or receipt. */
  readonly geometry: JsonValue;
}

export type AuthorityGeometryEntryV1 =
  | AuthorityGeometryCarrierEntryV1
  | AuthorityCanonicalGeometryEntryV1;

export interface AuthorityGeometrySequenceValueV1 {
  readonly tag: 'geometry_sequence';
  readonly entries: readonly AuthorityGeometryEntryV1[];
}

export interface AuthoritySummaryFactMapValueV1 {
  readonly tag: 'summary_fact_map';
  readonly facts: Readonly<Record<string, AuthoritySummaryScalarV1>>;
}

export interface AuthorityDisclosureFactMapValueV1 {
  readonly tag: 'disclosure_fact_map';
  readonly facts: Readonly<DisclosureFacts>;
}

export type AuthorityDerivationValueV1 =
  | AuthorityRowSequenceValueV1
  | AuthorityGeometrySequenceValueV1
  | AuthoritySummaryFactMapValueV1
  | AuthorityDisclosureFactMapValueV1;

export interface AuthorityEvaluationV1 {
  readonly evaluatorId: string;
  /** Digest of the validated canonical request supplied to the evaluator. */
  readonly canonicalRequestDigest: string;
  readonly fields: Readonly<Record<string, AuthorityDerivationValueV1>>;
}

export interface AuthorityObservedTableV1 {
  readonly columns: readonly { readonly key: string; readonly header: string }[];
  readonly rows: readonly (readonly AuthorityCellV1[])[];
  readonly rowsInline: number;
  readonly rowsTotal: number;
}

/**
 * The observed geometry grammar is role-tagged at its boundary.  Axis/text/footer and
 * decorative nodes cannot accidentally satisfy a data-mark obligation merely because
 * they share the same SVG primitive.  Groups are the only recursive carrier; traversal
 * below is iterative and detects repeated/cyclic group objects.
 */
export interface AuthorityGeometryGroupNodeV1 {
  readonly tag: 'group';
  readonly children: readonly AuthorityObservedGeometryNodeV1[];
}

export interface AuthorityGeometryDataMarkNodeV1 {
  readonly tag: 'data_mark';
  readonly entry: AuthorityGeometryEntryV1;
}

export interface AuthorityGeometryAxisNodeV1 {
  readonly tag: 'axis';
}

export interface AuthorityGeometryTextNodeV1 {
  readonly tag: 'text';
}

export interface AuthorityGeometryDisclosureNodeV1 {
  readonly tag: 'disclosure';
}

export interface AuthorityGeometryDecorativeNodeV1 {
  readonly tag: 'decorative_mark';
}

export type AuthorityObservedGeometryNodeV1 =
  | AuthorityGeometryGroupNodeV1
  | AuthorityGeometryDataMarkNodeV1
  | AuthorityGeometryAxisNodeV1
  | AuthorityGeometryTextNodeV1
  | AuthorityGeometryDisclosureNodeV1
  | AuthorityGeometryDecorativeNodeV1;

export interface AuthorityObservedOutputV1 {
  readonly table: AuthorityObservedTableV1;
  readonly geometry: readonly AuthorityObservedGeometryNodeV1[];
  readonly summary: string;
  readonly disclosures: readonly AuthorityDisclosureV1[];
}

export interface AuthorityDisclosureV1 {
  readonly id: string;
  readonly severity: 'critical' | 'important' | 'informational';
  readonly text: string;
}

export interface AuthorityTableColumnContractV1 {
  readonly key: string;
  readonly header: string;
  readonly cellType: 'finite_number' | 'string' | 'finite_number_or_string';
  readonly nullable: boolean;
  readonly keyPart: boolean;
}

export interface AuthorityViolationV1 {
  readonly code:
    | 'AUTHORITY_EVALUATOR_MISMATCH'
    | 'AUTHORITY_FIELD_MISSING'
    | 'AUTHORITY_FIELD_TYPE_MISMATCH'
    | 'AUTHORITY_TABLE_COLUMNS_MISMATCH'
    | 'AUTHORITY_TABLE_ROW_WIDTH_MISMATCH'
    | 'AUTHORITY_TABLE_CELL_DOMAIN_MISMATCH'
    | 'AUTHORITY_TABLE_KEY_MISMATCH'
    | 'AUTHORITY_TABLE_ROWS_MISMATCH'
    | 'AUTHORITY_TABLE_TOTAL_MISMATCH'
    | 'AUTHORITY_GEOMETRY_CLASS_UNKNOWN'
    | 'AUTHORITY_GEOMETRY_CLASS_MISSING'
    | 'AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH'
    | 'AUTHORITY_GEOMETRY_GRAPH_INVALID'
    | 'AUTHORITY_SUMMARY_FACTS_MISMATCH'
    | 'AUTHORITY_SUMMARY_MISMATCH'
    | 'AUTHORITY_DISCLOSURE_MISMATCH'
    | 'AUTHORITY_INFLUENCE_PATH_INVALID'
    | 'AUTHORITY_INFLUENCE_NO_WITNESS'
    | 'AUTHORITY_FRAME_LAW_VIOLATED';
  readonly path: string;
  readonly message: string;
}

export interface AuthorityVerificationValidV1 {
  readonly tag: 'valid';
  readonly expectedRowsTotal: number;
}

export interface AuthorityVerificationInvalidV1 {
  readonly tag: 'invalid';
  readonly violations: readonly AuthorityViolationV1[];
}

export type AuthorityVerificationResultV1 =
  | AuthorityVerificationValidV1
  | AuthorityVerificationInvalidV1;

export interface AuthorityInfluenceValidV1 {
  readonly tag: 'valid';
  readonly checkedWitnessIds: readonly string[];
}

export interface AuthorityInfluenceInvalidV1 {
  readonly tag: 'invalid';
  readonly violations: readonly AuthorityViolationV1[];
}

export type AuthorityInfluenceResultV1 = AuthorityInfluenceValidV1 | AuthorityInfluenceInvalidV1;

/**
 * Internal registry member shape. The only evaluator input is a validated canonical
 * request; public callers never register or supply one to the emission gate.
 */
export interface RegisteredAuthorityEvaluatorV1 {
  readonly id: string;
  readonly evaluateCanonicalRequest: (canonicalRequest: JsonValue) => AuthorityEvaluationV1;
}

export interface AuthorityCandidateAcceptedV1 {
  readonly tag: 'accepted';
  readonly canonicalRequest: JsonValue;
}

export interface AuthorityCandidateRejectedV1 {
  readonly tag: 'rejected';
  readonly reasons: readonly string[];
}

export type AuthorityCandidateValidationV1 =
  | AuthorityCandidateAcceptedV1
  | AuthorityCandidateRejectedV1;

export type AuthorityCandidateValidatorV1 = (candidate: JsonValue) => AuthorityCandidateValidationV1;

type MutableJson = null | boolean | number | string | MutableJson[] | { [key: string]: MutableJson };
const MAX_AUTHORITY_VIOLATIONS = 64;
const MAX_AUTHORITY_GEOMETRY_ENTRIES = 1_000_000;
const MAX_AUTHORITY_SUMMARY_FACT_CODE_UNITS = 8_192;
const MAX_AUTHORITY_SUMMARY_CODE_UNITS = 65_536;
const UNSAFE_SUMMARY_CODE_POINT = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff\ufdd0-\ufdef\ufffe\uffff]/u;
const UNPAIRED_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u;

function summaryStringSafe(value: string, maximum: number): boolean {
  if (
    value.length > maximum ||
    UNSAFE_SUMMARY_CODE_POINT.test(value) ||
    UNPAIRED_SURROGATE.test(value)
  ) return false;
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if ((codePoint & 0xffff) === 0xfffe || (codePoint & 0xffff) === 0xffff) return false;
  }
  return true;
}

/** Shared compiler/interpreter predicate for one substituted summary fact. */
export function isOutputAuthoritySummaryFactSafeV1(value: string): boolean {
  return summaryStringSafe(value, MAX_AUTHORITY_SUMMARY_FACT_CODE_UNITS);
}

/** Shared compiler/interpreter predicate for the complete rendered summary. */
export function isOutputAuthoritySummarySafeV1(value: string): boolean {
  return summaryStringSafe(value, MAX_AUTHORITY_SUMMARY_CODE_UNITS);
}

function violation(
  code: AuthorityViolationV1['code'],
  path: string,
  message: string,
): AuthorityViolationV1 {
  return { code, path, message };
}

function recordViolation(
  violations: AuthorityViolationV1[],
  entry: AuthorityViolationV1,
): void {
  if (violations.length < MAX_AUTHORITY_VIOLATIONS) violations.push(entry);
}

function fieldKind(value: AuthorityDerivationValueV1): AuthorityDerivationValueKindV1 {
  return value.tag;
}

function declaredFieldKind(
  authority: OutputAuthorityV1,
  field: string,
): AuthorityDerivationValueKindV1 | undefined {
  return authority.derivationFields.find((entry) => entry.id === field)?.valueKind;
}

function resolveDerivationField(
  authority: OutputAuthorityV1,
  evaluation: AuthorityEvaluationV1,
  ref: AuthorityDerivationFieldRefV1,
  requiredKind: AuthorityDerivationValueKindV1,
  path: string,
  violations: AuthorityViolationV1[],
): AuthorityDerivationValueV1 | null {
  const declaredKind = declaredFieldKind(authority, ref.field);
  if (declaredKind === undefined) {
    recordViolation(violations, violation(
      'AUTHORITY_FIELD_MISSING',
      path,
      `derivation field ${JSON.stringify(ref.field)} is not in the skill's closed vocabulary`,
    ));
    return null;
  }
  if (declaredKind !== requiredKind) {
    recordViolation(violations, violation(
      'AUTHORITY_FIELD_TYPE_MISMATCH',
      path,
      `derivation field ${JSON.stringify(ref.field)} is declared ${declaredKind}, not ${requiredKind}`,
    ));
    return null;
  }
  const value = evaluation.fields[ref.field];
  if (value === undefined) {
    recordViolation(violations, violation(
      'AUTHORITY_FIELD_MISSING',
      path,
      `independent evaluator omitted derivation field ${JSON.stringify(ref.field)}`,
    ));
    return null;
  }
  if (fieldKind(value) !== requiredKind) {
    recordViolation(violations, violation(
      'AUTHORITY_FIELD_TYPE_MISMATCH',
      path,
      `independent evaluator returned ${fieldKind(value)} for ${JSON.stringify(ref.field)}, expected ${requiredKind}`,
    ));
    return null;
  }
  return value;
}

function canonicalValue(value: unknown): string | null {
  try {
    return canonicalize(value as never);
  } catch {
    return null;
  }
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  const leftCanonical = canonicalValue(left);
  const rightCanonical = canonicalValue(right);
  return leftCanonical !== null && rightCanonical !== null && leftCanonical === rightCanonical;
}

function expectedSummary(
  template: string,
  requiredPlaceholders: readonly string[],
  facts: Readonly<Record<string, AuthoritySummaryScalarV1>>,
  disclosures: readonly AuthorityDisclosureV1[],
): string | null {
  if (
    !isOutputAuthoritySummarySafeV1(template)
  ) return null;
  const withoutRecognizedTokens = template.replace(/\{[A-Za-z][A-Za-z0-9]*\}/gu, '');
  if (withoutRecognizedTokens.includes('{') || withoutRecognizedTokens.includes('}')) return null;
  const factKeys = Object.keys(facts);
  if (
    factKeys.length !== requiredPlaceholders.length ||
    factKeys.some((key) => !requiredPlaceholders.includes(key))
  ) return null;

  let missing = false;
  const rendered = template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/gu, (_whole, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(facts, key)) {
      missing = true;
      return '';
    }
    const value = facts[key];
    if (
      typeof value !== 'string' ||
      !isOutputAuthoritySummaryFactSafeV1(value)
    ) {
      missing = true;
      return '';
    }
    return value;
  });
  if (missing || rendered.length > MAX_AUTHORITY_SUMMARY_CODE_UNITS) return null;
  if (disclosures.some((disclosure) =>
    !isOutputAuthoritySummaryFactSafeV1(disclosure.text))) return null;
  if (disclosures.length === 0) return rendered;
  const count = disclosures.length;
  const complete = `${rendered} ${count} ${count === 1 ? 'disclosure applies' : 'disclosures apply'}: ${disclosures
    .map((disclosure) => disclosure.text)
    .join(' ')}`;
  return complete.length <= MAX_AUTHORITY_SUMMARY_CODE_UNITS ? complete : null;
}

function collectObservedGeometry(
  roots: readonly AuthorityObservedGeometryNodeV1[],
  violations: AuthorityViolationV1[],
): AuthorityGeometryEntryV1[] {
  const sequence: AuthorityGeometryEntryV1[] = [];
  const stack: { readonly node: AuthorityObservedGeometryNodeV1; readonly path: string }[] = [];
  for (let index = roots.length - 1; index >= 0; index--) {
    stack.push({ node: roots[index], path: `/geometry/${index}` });
  }
  const seenGroups = new WeakSet<object>();

  while (stack.length > 0) {
    const { node, path } = stack.pop()!;
    if (node === null || typeof node !== 'object') {
      recordViolation(violations, violation(
        'AUTHORITY_GEOMETRY_GRAPH_INVALID',
        path,
        'geometry node is not a tagged object',
      ));
      continue;
    }
    switch ((node as { tag?: unknown }).tag) {
      case 'group': {
        if (seenGroups.has(node)) {
          recordViolation(violations, violation(
            'AUTHORITY_GEOMETRY_GRAPH_INVALID',
            path,
            'nested geometry repeats or cycles through the same group object',
          ));
          break;
        }
        seenGroups.add(node);
        const children = (node as AuthorityGeometryGroupNodeV1).children;
        if (!Array.isArray(children)) {
          recordViolation(violations, violation(
            'AUTHORITY_GEOMETRY_GRAPH_INVALID',
            `${path}/children`,
            'group children must be an array',
          ));
          break;
        }
        for (let index = children.length - 1; index >= 0; index--) {
          stack.push({ node: children[index], path: `${path}/children/${index}` });
        }
        break;
      }
      case 'data_mark': {
        const mark = node as AuthorityGeometryDataMarkNodeV1;
        if (sequence.length >= MAX_AUTHORITY_GEOMETRY_ENTRIES) {
          recordViolation(violations, violation(
            'AUTHORITY_GEOMETRY_GRAPH_INVALID',
            path,
            `geometry carrier sequence exceeds ${MAX_AUTHORITY_GEOMETRY_ENTRIES}`,
          ));
          return sequence;
        }
        sequence.push(mark.entry);
        break;
      }
      case 'axis':
      case 'text':
      case 'disclosure':
      case 'decorative_mark':
        // These roles are intentionally outside data-geometry authority.
        break;
      default:
        recordViolation(violations, violation(
          'AUTHORITY_GEOMETRY_GRAPH_INVALID',
          path,
          'geometry node has an unknown or missing explicit tag',
        ));
    }
  }
  return sequence;
}

/**
 * Low-level algebra interpreter used only by the render emission gate. It is not an
 * attestation API: evaluation and observed-model construction must come from the
 * library-owned registry/extractor in `src/render/output-authority-gate.ts`.
 * Expected table cardinality is computed from expected rows, never from observed
 * `rowsTotal`, a compiler receipt, or an artifact count.
 */
export function interpretOutputAuthorityModelV1(
  authority: OutputAuthorityV1,
  summaryTemplate: string,
  tableColumnContracts: readonly AuthorityTableColumnContractV1[],
  expectedDisclosures: readonly AuthorityDisclosureV1[],
  canonicalRequestDigest: string,
  evaluation: AuthorityEvaluationV1,
  observed: AuthorityObservedOutputV1,
): AuthorityVerificationResultV1 {
  const violations: AuthorityViolationV1[] = [];
  if (evaluation.evaluatorId !== authority.evaluator.id) {
    recordViolation(violations, violation(
      'AUTHORITY_EVALUATOR_MISMATCH',
      '/evaluatorId',
      `evaluation names ${JSON.stringify(evaluation.evaluatorId)}, expected ${JSON.stringify(authority.evaluator.id)}`,
    ));
  }
  if (evaluation.canonicalRequestDigest !== canonicalRequestDigest) {
    recordViolation(violations, violation(
      'AUTHORITY_EVALUATOR_MISMATCH',
      '/canonicalRequestDigest',
      'authority evaluation is not bound to the validated canonical request being emitted',
    ));
  }
  if (!canonicalEqual(observed.disclosures, expectedDisclosures)) {
    recordViolation(violations, violation(
      'AUTHORITY_DISCLOSURE_MISMATCH',
      '/disclosures',
      'actual plan disclosures do not equal the independently derived mandatory disclosure set',
    ));
  }
  const declaredEvaluationFields = authority.derivationFields.map((field) => field.id).sort();
  const actualEvaluationFields = Object.keys(evaluation.fields).sort();
  if (!canonicalEqual(declaredEvaluationFields, actualEvaluationFields)) {
    recordViolation(violations, violation(
      'AUTHORITY_FIELD_MISSING',
      '/fields',
      'independent evaluator fields must exactly equal the skill-local closed derivation vocabulary; missing and unknown fields are refused',
    ));
  }

  const rowValue = resolveDerivationField(
    authority,
    evaluation,
    authority.table.expectedRows,
    'row_sequence',
    '/table/expectedRows',
    violations,
  ) as AuthorityRowSequenceValueV1 | null;
  const expectedRows = rowValue?.rows ?? [];
  const expectedRowsTotal = expectedRows.length;
  const sourceColumns = tableColumnContracts.map(({ key, header }) => ({ key, header }));
  const sourceKeys = tableColumnContracts.map(({ key }) => key);
  if (
    !canonicalEqual(sourceKeys, authority.table.carriedValueColumns) ||
    !canonicalEqual(observed.table.columns, sourceColumns)
  ) {
    recordViolation(violations, violation(
      'AUTHORITY_TABLE_COLUMNS_MISMATCH',
      '/table/columns',
      'observed columns are not the exact ordered source-owned carried-value columns',
    ));
  }
  const expectedBadWidth = expectedRows.findIndex(
    (row) => row.length !== authority.table.carriedValueColumns.length,
  );
  const observedBadWidth = observed.table.rows.findIndex(
    (row) => row.length !== authority.table.carriedValueColumns.length,
  );
  if (expectedBadWidth !== -1 || observedBadWidth !== -1) {
    recordViolation(violations, violation(
      'AUTHORITY_TABLE_ROW_WIDTH_MISMATCH',
      '/table/rows',
      expectedBadWidth !== -1
        ? `independent expected row ${expectedBadWidth} does not carry every declared value column`
        : `observed row ${observedBadWidth} does not carry every declared value column`,
    ));
  }
  if (!canonicalEqual(expectedRows, observed.table.rows)) {
    recordViolation(violations, violation(
      'AUTHORITY_TABLE_ROWS_MISMATCH',
      '/table/rows',
      'observed rows are not the exact evaluator-derived row sequence, including order, duplicate multiplicity, and every carried value',
    ));
  }
  let cellsValid = true;
  for (const row of observed.table.rows) {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      const cell = row[columnIndex];
      const column = tableColumnContracts[columnIndex];
      if (!column) {
        cellsValid = false;
        continue;
      }
      if (cell === null) {
        if (!column.nullable) cellsValid = false;
      } else if (typeof cell === 'number') {
        if (!Number.isFinite(cell) || column.cellType === 'string') cellsValid = false;
      } else if (typeof cell === 'string') {
        if (column.cellType === 'finite_number') cellsValid = false;
      } else {
        cellsValid = false;
      }
    }
  }
  if (!cellsValid) {
    recordViolation(violations, violation(
      'AUTHORITY_TABLE_CELL_DOMAIN_MISMATCH',
      '/table/rows',
      'observed table cells violate a source-owned type, nullability, or finite-number domain',
    ));
  }
  const keyIndices = tableColumnContracts
    .map((column, index) => column.keyPart ? index : -1)
    .filter((index) => index >= 0);
  const rowKeys = observed.table.rows.map((row) => canonicalValue(keyIndices.map((index) => row[index])));
  if (keyIndices.length === 0 || rowKeys.some((key) => key === null) || new Set(rowKeys).size !== rowKeys.length) {
    recordViolation(violations, violation(
      'AUTHORITY_TABLE_KEY_MISMATCH',
      '/table/rows',
      'source-owned composite row keys must exist and be unique over the verified sequence',
    ));
  }
  if (
    observed.table.rowsTotal !== expectedRowsTotal ||
    observed.table.rowsInline !== expectedRowsTotal ||
    observed.table.rows.length !== expectedRowsTotal
  ) {
    recordViolation(violations, violation(
      'AUTHORITY_TABLE_TOTAL_MISMATCH',
      '/table/rowsTotal',
      `rowsTotal must be ${expectedRowsTotal}, derived from verified expected rows; observed rowsTotal=${observed.table.rowsTotal}, rowsInline=${observed.table.rowsInline}, rows.length=${observed.table.rows.length}`,
    ));
  }

  const observedGeometry = collectObservedGeometry(observed.geometry, violations);
  const declaredClassIds = new Set(authority.geometry.classes.map((entry) => entry.id));
  const unknownClassIds = new Set<string>();
  for (const entry of observedGeometry) {
    if (!declaredClassIds.has(entry.classId)) {
      unknownClassIds.add(entry.classId);
      if (unknownClassIds.size > MAX_AUTHORITY_VIOLATIONS) break;
      recordViolation(violations, violation(
        'AUTHORITY_GEOMETRY_CLASS_UNKNOWN',
        '/geometry',
        `observed data geometry uses undeclared class ${JSON.stringify(entry.classId)}`,
      ));
    }
  }
  const geometryValue = resolveDerivationField(
    authority,
    evaluation,
    authority.geometry.expectedSequence,
    'geometry_sequence',
    '/geometry/expectedSequence',
    violations,
  ) as AuthorityGeometrySequenceValueV1 | null;
  if (geometryValue !== null) {
    const classById = new Map(authority.geometry.classes.map((entry) => [entry.id, entry]));
    const comparable = (entries: readonly AuthorityGeometryEntryV1[]): unknown[] => entries.map((entry) => {
      const geometryClass = classById.get(entry.classId);
      return geometryClass?.payloadAssurance === 'canonical_geometry_exact'
        ? entry
        : { tag: 'carrier', classId: entry.classId, provenance: entry.provenance };
    });
    const exactPayloadsAvailable = [...geometryValue.entries, ...observedGeometry].every((entry) => {
      const geometryClass = classById.get(entry.classId);
      return geometryClass?.payloadAssurance !== 'canonical_geometry_exact' || entry.tag === 'canonical_geometry';
    });
    if (
      !exactPayloadsAvailable ||
      !canonicalEqual(comparable(geometryValue.entries), comparable(observedGeometry))
    ) {
      recordViolation(violations, violation(
        'AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH',
        '/geometry',
        'global data-geometry sequence differs in exact cardinality, DFS interleaving, class order, provenance, or independently assured geometry payload',
      ));
    }
  }

  const factValue = resolveDerivationField(
    authority,
    evaluation,
    authority.summary.expectedFacts,
    'summary_fact_map',
    '/summary/expectedFacts',
    violations,
  ) as AuthoritySummaryFactMapValueV1 | null;
  if (factValue !== null) {
    const rendered = expectedSummary(
      summaryTemplate,
      authority.summary.requiredPlaceholders,
      factValue.facts,
      expectedDisclosures,
    );
    if (rendered === null) {
      recordViolation(violations, violation(
        'AUTHORITY_SUMMARY_FACTS_MISMATCH',
        '/summary/facts',
        'summary fact keys must exactly equal the source-owned placeholder vocabulary and every value must be a bounded control-safe string',
      ));
    } else if (rendered !== observed.summary) {
      recordViolation(violations, violation(
        'AUTHORITY_SUMMARY_MISMATCH',
        '/summary',
        'observed summary is not exact fail-closed substitution of independently evaluated facts into the skill template',
      ));
    }
  }

  return violations.length === 0
    ? { tag: 'valid', expectedRowsTotal }
    : { tag: 'invalid', violations };
}

function cloneAndReplaceRequestPath(
  authority: OutputAuthorityV1,
  request: JsonValue,
  ref: AuthorityRequestPathRefV1,
  replacement: JsonValue,
): MutableJson | null {
  const clone = structuredClone(request) as MutableJson;
  const path = authority.requestPaths.find((candidate) => candidate.id === ref.pathId);
  if (!path || path.segments.length === 0 || clone === null || typeof clone !== 'object') return null;
  let cursor: MutableJson = clone;
  for (let index = 0; index < path.segments.length - 1; index++) {
    const segment = path.segments[index];
    if (segment.tag === 'field') {
      if (Array.isArray(cursor) || cursor === null || typeof cursor !== 'object') return null;
      if (!Object.prototype.hasOwnProperty.call(cursor, segment.name)) return null;
      cursor = (cursor as { [key: string]: MutableJson })[segment.name];
    } else {
      if (!Array.isArray(cursor) || segment.index < 0 || segment.index >= cursor.length) return null;
      cursor = cursor[segment.index];
    }
  }
  const last = path.segments[path.segments.length - 1];
  if (last.tag === 'field') {
    if (Array.isArray(cursor) || cursor === null || typeof cursor !== 'object') return null;
    (cursor as { [key: string]: MutableJson })[last.name] = structuredClone(replacement) as MutableJson;
  } else {
    if (!Array.isArray(cursor) || last.index < 0 || last.index >= cursor.length) return null;
    cursor[last.index] = structuredClone(replacement) as MutableJson;
  }
  return clone;
}

function evaluationFieldCanonical(
  evaluation: AuthorityEvaluationV1,
  ref: AuthorityDerivationFieldRefV1,
): string | null {
  const field = evaluation.fields[ref.field];
  return field === undefined ? null : canonicalValue(field);
}

/**
 * Execute the finite paired-input witnesses declared by a skill.  `evaluate` must be
 * the registered independent authority evaluator, not the figure compiler.  The check
 * requires at least one affected fact to change and every protected fact to remain
 * byte-equivalent under canonical JSON (the protected-output frame law).
 */
export function checkFiniteInfluenceWitnessesV1(
  authority: OutputAuthorityV1,
  validExamples: readonly JsonValue[],
  validateCandidate: AuthorityCandidateValidatorV1,
  evaluator: RegisteredAuthorityEvaluatorV1,
): AuthorityInfluenceResultV1 {
  const violations: AuthorityViolationV1[] = [];
  const checkedWitnessIds: string[] = [];
  for (const [index, witness] of authority.influence.witnesses.entries()) {
    const baselineRequest = validExamples[witness.exampleIndex];
    if (baselineRequest === undefined) {
      recordViolation(violations, violation(
        'AUTHORITY_INFLUENCE_PATH_INVALID',
        `/influence/witnesses/${index}/exampleIndex`,
        `finite witness ${JSON.stringify(witness.id)} refers to an unavailable living example`,
      ));
      continue;
    }
    const leftRequest = cloneAndReplaceRequestPath(authority, baselineRequest, witness.input, witness.leftValue);
    const rightRequest = cloneAndReplaceRequestPath(authority, baselineRequest, witness.input, witness.rightValue);
    if (leftRequest === null || rightRequest === null) {
      recordViolation(violations, violation(
        'AUTHORITY_INFLUENCE_PATH_INVALID',
        `/influence/witnesses/${index}/input`,
        `finite witness ${JSON.stringify(witness.id)} does not resolve to a replaceable request field`,
      ));
      continue;
    }
    const leftValidated = validateCandidate(leftRequest);
    const rightValidated = validateCandidate(rightRequest);
    if (leftValidated.tag !== 'accepted' || rightValidated.tag !== 'accepted') {
      recordViolation(violations, violation(
        'AUTHORITY_INFLUENCE_PATH_INVALID',
        `/influence/witnesses/${index}`,
        `both finite paired requests for ${JSON.stringify(witness.id)} must pass structural and semantic validation before influence comparison`,
      ));
      continue;
    }
    if (evaluator.id !== authority.evaluator.id) {
      recordViolation(violations, violation(
        'AUTHORITY_EVALUATOR_MISMATCH',
        `/influence/witnesses/${index}`,
        `finite witness evaluator ${JSON.stringify(evaluator.id)} does not match ${JSON.stringify(authority.evaluator.id)}`,
      ));
      continue;
    }
    const left = evaluator.evaluateCanonicalRequest(leftValidated.canonicalRequest);
    const right = evaluator.evaluateCanonicalRequest(rightValidated.canonicalRequest);
    if (
      left.canonicalRequestDigest !== canonicalDigest(leftValidated.canonicalRequest) ||
      right.canonicalRequestDigest !== canonicalDigest(rightValidated.canonicalRequest)
    ) {
      recordViolation(violations, violation(
        'AUTHORITY_EVALUATOR_MISMATCH',
        `/influence/witnesses/${index}`,
        `finite witness ${JSON.stringify(witness.id)} evaluator output is not bound to both validated canonical requests`,
      ));
      continue;
    }
    if (left.evaluatorId !== authority.evaluator.id || right.evaluatorId !== authority.evaluator.id) {
      recordViolation(violations, violation(
        'AUTHORITY_EVALUATOR_MISMATCH',
        `/influence/witnesses/${index}`,
        `finite witness ${JSON.stringify(witness.id)} was not evaluated by ${JSON.stringify(authority.evaluator.id)}`,
      ));
      continue;
    }

    let affectedChanged = false;
    for (const ref of witness.affected) {
      const leftValue = evaluationFieldCanonical(left, ref);
      const rightValue = evaluationFieldCanonical(right, ref);
      if (leftValue === null || rightValue === null) {
        recordViolation(violations, violation(
          'AUTHORITY_FIELD_MISSING',
          `/influence/witnesses/${index}/affected`,
          `affected derivation field ${JSON.stringify(ref.field)} is missing or not canonicalizable`,
        ));
        continue;
      }
      if (leftValue !== rightValue) affectedChanged = true;
    }
    if (!affectedChanged) {
      recordViolation(violations, violation(
        'AUTHORITY_INFLUENCE_NO_WITNESS',
        `/influence/witnesses/${index}/affected`,
        `finite pair ${JSON.stringify(witness.id)} did not change any declared affected output fact`,
      ));
    }

    for (const ref of witness.protected) {
      const leftValue = evaluationFieldCanonical(left, ref);
      const rightValue = evaluationFieldCanonical(right, ref);
      if (leftValue === null || rightValue === null || leftValue !== rightValue) {
        recordViolation(violations, violation(
          'AUTHORITY_FRAME_LAW_VIOLATED',
          `/influence/witnesses/${index}/protected`,
          `protected derivation field ${JSON.stringify(ref.field)} changed across finite pair ${JSON.stringify(witness.id)}`,
        ));
      }
    }
    checkedWitnessIds.push(witness.id);
  }

  return violations.length === 0
    ? { tag: 'valid', checkedWitnessIds }
    : { tag: 'invalid', violations };
}
