/** Executable integrity checks for source-owned OutputAuthority V1 declarations. */

import { canonicalize } from '../../src/core/canonicalize.js';

type JsonRecord = Record<string, any>;

const FIELD_ID = /^[a-z][A-Za-z0-9_.-]*$/u;
const PATH_ROOTS = new Set(['data', 'parameters']);
const EXACT_EXCLUDED_ROLES = ['axis', 'text', 'disclosure', 'decorative_mark'];
const MAX_SCHEMA_BRANCHES = 256;
const MAX_SCHEMA_REF_DEPTH = 64;
const UNSAFE_SUMMARY_CODE_POINT = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff\ufdd0-\ufdef\ufffe\uffff]/u;
const UNPAIRED_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactArray(left: unknown, right: readonly unknown[]): boolean {
  return Array.isArray(left) && left.length === right.length &&
    left.every((entry, index) => entry === right[index]);
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalize(left) === canonicalize(right);
  } catch {
    return false;
  }
}

function duplicateStrings(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

/** First-occurrence order is the deterministic substitution order owned by the template. */
export function summaryTemplatePlaceholders(template: unknown): string[] {
  if (typeof template !== 'string') return [];
  const output: string[] = [];
  const seen = new Set<string>();
  for (const match of template.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu)) {
    const key = match[1];
    if (!seen.has(key)) output.push(key);
    seen.add(key);
  }
  return output;
}

function summaryTemplateHasOnlyRecognizedTokens(template: unknown): boolean {
  if (typeof template !== 'string') return false;
  const remainder = template.replace(/\{[A-Za-z][A-Za-z0-9]*\}/gu, '');
  return !remainder.includes('{') && !remainder.includes('}');
}

function summaryTemplateIsDisplaySafe(template: unknown): boolean {
  if (
    typeof template !== 'string' ||
    UNSAFE_SUMMARY_CODE_POINT.test(template) ||
    UNPAIRED_SURROGATE.test(template)
  ) return false;
  for (const character of template) {
    const codePoint = character.codePointAt(0)!;
    if ((codePoint & 0xffff) === 0xfffe || (codePoint & 0xffff) === 0xffff) return false;
  }
  return true;
}

function pathSegments(path: unknown): readonly JsonRecord[] | null {
  if (!isRecord(path) || !Array.isArray(path.segments)) return null;
  return path.segments.every(isRecord) ? path.segments : null;
}

function valueAtPath(value: unknown, segments: readonly JsonRecord[]): { found: boolean; value?: unknown } {
  let cursor = value;
  for (const segment of segments) {
    if (segment.tag === 'field' && typeof segment.name === 'string') {
      if (!isRecord(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment.name)) {
        return { found: false };
      }
      cursor = cursor[segment.name];
    } else if (segment.tag === 'index' && Number.isSafeInteger(segment.index)) {
      if (!Array.isArray(cursor) || segment.index < 0 || segment.index >= cursor.length) {
        return { found: false };
      }
      cursor = cursor[segment.index];
    } else {
      return { found: false };
    }
  }
  return { found: true, value: cursor };
}

function resolveLocalRef(rootRequestSchema: JsonRecord, ref: string): unknown {
  if (!ref.startsWith('#/')) return null;
  const rawSegments = ref.slice(2).split('/').map((segment) =>
    segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  // Source fragments use refs as they will appear in the composed request schema.
  // Redirect those two closed roots back into their source fragments.
  if (rawSegments[0] === 'properties' && rawSegments[1] === 'data') {
    return valueAtPath(rootRequestSchema.data, rawSegments.slice(2).map((name) => ({ tag: 'field', name }))).value;
  }
  if (rawSegments[0] === 'properties' && rawSegments[1] === 'parameters') {
    return valueAtPath(rootRequestSchema.parameters, rawSegments.slice(2).map((name) => ({ tag: 'field', name }))).value;
  }
  return valueAtPath(rootRequestSchema, rawSegments.map((name) => ({ tag: 'field', name }))).value;
}

function schemaBranches(schema: unknown, rootRequestSchema: JsonRecord): JsonRecord[] {
  if (!isRecord(schema)) return [];
  const output: JsonRecord[] = [];
  const pending: { readonly value: unknown; readonly depth: number }[] = [
    { value: schema, depth: 0 },
  ];
  const seen = new WeakSet<object>();
  while (pending.length > 0 && output.length < MAX_SCHEMA_BRANCHES) {
    const { value, depth } = pending.pop()!;
    if (!isRecord(value) || seen.has(value) || depth > MAX_SCHEMA_REF_DEPTH) continue;
    seen.add(value);
    output.push(value);
    if (typeof value.$ref === 'string') {
      pending.push({ value: resolveLocalRef(rootRequestSchema, value.$ref), depth: depth + 1 });
    }
    for (const keyword of ['oneOf', 'anyOf', 'allOf'] as const) {
      if (!Array.isArray(value[keyword])) continue;
      for (let index = value[keyword].length - 1; index >= 0; index--) {
        pending.push({ value: value[keyword][index], depth: depth + 1 });
      }
    }
  }
  return output;
}

/**
 * Conservative literal path check over the closed source schema. There is deliberately
 * no wildcard/query/predicate language. A path is accepted only when every segment can
 * be reached through a declared property or array item in at least one schema branch.
 */
function requestSchemaDeclaresPath(requestSchema: unknown, segments: readonly JsonRecord[]): boolean {
  if (!isRecord(requestSchema) || segments.length < 2) return false;
  const first = segments[0];
  if (first.tag !== 'field' || typeof first.name !== 'string' || !PATH_ROOTS.has(first.name)) {
    return false;
  }
  let candidates: unknown[] = [requestSchema[first.name]];
  for (const segment of segments.slice(1)) {
    const next: unknown[] = [];
    for (const candidate of candidates) {
      for (const branch of schemaBranches(candidate, requestSchema)) {
        if (segment.tag === 'field' && typeof segment.name === 'string' && isRecord(branch.properties)) {
          if (Object.prototype.hasOwnProperty.call(branch.properties, segment.name)) {
            next.push(branch.properties[segment.name]);
          }
        } else if (segment.tag === 'index' && Number.isSafeInteger(segment.index)) {
          const prefixItems = Array.isArray(branch.prefixItems) ? branch.prefixItems : [];
          // JSON Schema 2020-12: prefixItems owns indices inside its tuple; `items`
          // applies only to positions after that prefix, never in parallel with it.
          if (segment.index < prefixItems.length) {
            next.push(prefixItems[segment.index]);
          } else if (isRecord(branch.items)) {
            next.push(branch.items);
          }
        }
      }
    }
    if (next.length === 0) return false;
    candidates = next.slice(0, MAX_SCHEMA_BRANCHES);
  }
  return candidates.length > 0;
}

function derivationRefField(ref: unknown): string | null {
  return isRecord(ref) && ref.tag === 'derivation_field' && typeof ref.field === 'string'
    ? ref.field
    : null;
}

function requestPathRefId(ref: unknown): string | null {
  return isRecord(ref) && ref.tag === 'request_path' && typeof ref.pathId === 'string'
    ? ref.pathId
    : null;
}

function refsIn(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map(derivationRefField).filter((value): value is string => value !== null);
}

/**
 * Source-level laws beyond JSON Schema. This function intentionally knows no compiler,
 * RenderPlan, table result, derivation receipt, artifact, or runtime count.
 */
export function outputAuthoritySourceProblems(skill: unknown): string[] {
  if (!isRecord(skill) || skill.status !== 'stable') return [];
  const problems: string[] = [];
  const where = `skill ${String(skill.id)} outputAuthority`;
  const authority = skill.outputAuthority;
  if (!isRecord(authority)) return [`${where}: missing source-owned OutputAuthority V1 declaration`];

  const expectedEvaluatorId = `${String(skill.id)}.output_authority.v${String(skill.revision)}`;
  if (!isRecord(authority.evaluator) || authority.evaluator.id !== expectedEvaluatorId) {
    problems.push(`${where}.evaluator.id: expected ${JSON.stringify(expectedEvaluatorId)}`);
  }

  const requestPaths = Array.isArray(authority.requestPaths) ? authority.requestPaths : [];
  const requestPathIds = requestPaths.map((entry: unknown) => isRecord(entry) ? entry.id : null);
  for (const duplicate of duplicateStrings(requestPathIds)) {
    problems.push(`${where}.requestPaths: duplicate path id ${JSON.stringify(duplicate)}`);
  }
  for (const [index, path] of requestPaths.entries()) {
    const segments = pathSegments(path);
    if (segments === null || !requestSchemaDeclaresPath(skill.requestSchema, segments)) {
      problems.push(`${where}.requestPaths[${index}]: literal path is not declared by the closed request schema`);
    }
  }

  const fields = Array.isArray(authority.derivationFields) ? authority.derivationFields : [];
  const fieldKinds = new Map<string, string>();
  for (const [index, field] of fields.entries()) {
    if (!isRecord(field) || typeof field.id !== 'string' || typeof field.valueKind !== 'string') continue;
    if (!FIELD_ID.test(field.id)) problems.push(`${where}.derivationFields[${index}].id: invalid field id`);
    if (fieldKinds.has(field.id)) problems.push(`${where}.derivationFields: duplicate field ${JSON.stringify(field.id)}`);
    fieldKinds.set(field.id, field.valueKind);
  }

  const usedFields = new Set<string>();
  const requireField = (ref: unknown, kind: string, path: string): void => {
    const field = derivationRefField(ref);
    if (field === null) {
      problems.push(`${where}.${path}: expected an explicit derivation_field ref`);
      return;
    }
    usedFields.add(field);
    if (fieldKinds.get(field) !== kind) {
      problems.push(`${where}.${path}: field ${JSON.stringify(field)} must have valueKind ${JSON.stringify(kind)}`);
    }
  };

  const table = authority.table;
  if (isRecord(table)) {
    requireField(table.expectedRows, 'row_sequence', 'table.expectedRows');
    const exactColumns = Array.isArray(skill.accessibility?.tableColumns)
      ? skill.accessibility.tableColumns.map((column: JsonRecord) => column.key)
      : [];
    if (!exactArray(table.carriedValueColumns, exactColumns)) {
      problems.push(`${where}.table.carriedValueColumns: must exactly equal accessibility.tableColumns keys in source order`);
    }
    if (table.comparison !== 'canonical_json_sequence_exact') {
      problems.push(`${where}.table.comparison: row permutation must not be silently accepted`);
    }
    if (table.rowsTotal !== 'from_verified_expected_rows') {
      problems.push(`${where}.table.rowsTotal: compiler/self-reported counts are forbidden`);
    }
  }

  const geometry = authority.geometry;
  if (isRecord(geometry)) {
    if (!exactArray(geometry.excludedRoles, EXACT_EXCLUDED_ROLES)) {
      problems.push(`${where}.geometry.excludedRoles: must exactly exclude axis/text/disclosure/decorative roles`);
    }
    if (geometry.traversal !== 'nested_groups_depth_first_preorder') {
      problems.push(`${where}.geometry.traversal: nested groups require the registered iterative preorder`);
    }
    requireField(geometry.expectedSequence, 'geometry_sequence', 'geometry.expectedSequence');
    const classes = Array.isArray(geometry.classes) ? geometry.classes : [];
    const classIds = classes.map((entry: unknown) => isRecord(entry) ? entry.id : null);
    for (const duplicate of duplicateStrings(classIds)) {
      problems.push(`${where}.geometry.classes: duplicate class id ${JSON.stringify(duplicate)}`);
    }
    for (const [index, geometryClass] of classes.entries()) {
      if (!isRecord(geometryClass)) continue;
      if (geometryClass.payloadAssurance !== 'carrier_only') {
        // No independently coordinate-deriving evaluator is registered in V1 yet.
        problems.push(
          `${where}.geometry.classes[${index}].payloadAssurance: canonical_geometry_exact requires a separately reviewed coordinate evaluator; use carrier_only until one exists`,
        );
      }
    }
  }

  const summary = authority.summary;
  if (isRecord(summary)) {
    requireField(summary.expectedFacts, 'summary_fact_map', 'summary.expectedFacts');
    const placeholders = summaryTemplatePlaceholders(skill.accessibility?.summaryTemplate);
    if (!summaryTemplateHasOnlyRecognizedTokens(skill.accessibility?.summaryTemplate)) {
      problems.push(`${where}.summary: template contains a malformed or unrecognized brace token`);
    }
    if (!summaryTemplateIsDisplaySafe(skill.accessibility?.summaryTemplate)) {
      problems.push(`${where}.summary: template contains unsafe control, bidi, zero-width, surrogate, or noncharacter text`);
    }
    if (!exactArray(summary.requiredPlaceholders, placeholders)) {
      problems.push(`${where}.summary.requiredPlaceholders: must exactly equal first-occurrence template placeholders`);
    }
    if (summary.missingFactPolicy !== 'refuse' || summary.unknownFactPolicy !== 'refuse') {
      problems.push(`${where}.summary: both missing and unknown facts must fail closed`);
    }
  }

  const authorityDisclosures = authority.disclosures;
  if (isRecord(authorityDisclosures)) {
    requireField(
      authorityDisclosures.expectedFacts,
      'disclosure_fact_map',
      'disclosures.expectedFacts',
    );
  }

  const pathById = new Map<string, readonly JsonRecord[]>();
  for (const path of requestPaths) {
    if (!isRecord(path) || typeof path.id !== 'string') continue;
    const segments = pathSegments(path);
    if (segments) pathById.set(path.id, segments);
  }
  const witnesses = isRecord(authority.influence) && Array.isArray(authority.influence.witnesses)
    ? authority.influence.witnesses
    : [];
  const witnessIds = witnesses.map((entry: unknown) => isRecord(entry) ? entry.id : null);
  for (const duplicate of duplicateStrings(witnessIds)) {
    problems.push(`${where}.influence.witnesses: duplicate witness id ${JSON.stringify(duplicate)}`);
  }
  for (const [index, witness] of witnesses.entries()) {
    if (!isRecord(witness)) continue;
    const pathId = requestPathRefId(witness.input);
    const segments = pathId === null ? null : pathById.get(pathId) ?? null;
    if (pathId === null || segments === null) {
      problems.push(`${where}.influence.witnesses[${index}].input: unknown registered request_path`);
    }
    const example = Number.isSafeInteger(witness.exampleIndex)
      ? skill.examples?.valid?.[witness.exampleIndex]
      : undefined;
    if (example === undefined || segments === null || !valueAtPath(example, segments).found) {
      problems.push(`${where}.influence.witnesses[${index}]: path must resolve in its declared living valid example`);
    }
    if (canonicalEqual(witness.leftValue, witness.rightValue)) {
      problems.push(`${where}.influence.witnesses[${index}]: paired values must differ`);
    }
    const affected = refsIn(witness.affected);
    const protectedFields = refsIn(witness.protected);
    for (const field of affected) {
      usedFields.add(field);
      if (!fieldKinds.has(field)) problems.push(`${where}.influence.witnesses[${index}].affected: unknown field ${JSON.stringify(field)}`);
    }
    for (const field of protectedFields) {
      usedFields.add(field);
      if (!fieldKinds.has(field)) problems.push(`${where}.influence.witnesses[${index}].protected: unknown field ${JSON.stringify(field)}`);
      if (affected.includes(field)) problems.push(`${where}.influence.witnesses[${index}]: field ${JSON.stringify(field)} cannot be both affected and protected`);
    }
  }

  for (const field of fieldKinds.keys()) {
    if (!usedFields.has(field)) problems.push(`${where}.derivationFields: unused field ${JSON.stringify(field)}`);
  }

  return problems;
}
