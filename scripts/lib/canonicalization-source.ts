/** Executable integrity checks for the normative identifier canonicalization registry. */

import { canonicalDigest, canonicalize } from '../../src/core/canonicalize.js';

const ALGORITHM_ID = 'cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1';
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const FAILURE_CLASSES = [
  'not_array',
  'empty_set',
  'non_string_identifier',
  'empty_identifier',
  'duplicate_identifier',
  'ill_formed_unicode',
] as const;

export const CANONICALIZATION_SOURCE_LIMITS = Object.freeze({
  conformanceVectors: 256,
  identifiersPerVector: 4096,
  identifierUtf16CodeUnits: 65536,
  totalUtf16CodeUnitsPerVector: 1000000,
});

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function wellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

type ReferenceResult =
  | { readonly ok: true; readonly normalized: readonly string[]; readonly canonicalJson: string; readonly digest: string }
  | { readonly ok: false; readonly failureClass: string };

function referenceCanonicalize(value: unknown): ReferenceResult {
  if (!Array.isArray(value)) return { ok: false, failureClass: 'not_array' };
  if (value.length === 0) return { ok: false, failureClass: 'empty_set' };
  const seen = new Set<string>();
  for (const member of value) {
    if (typeof member !== 'string') return { ok: false, failureClass: 'non_string_identifier' };
    if (member.length === 0) return { ok: false, failureClass: 'empty_identifier' };
    if (!wellFormedUnicode(member)) return { ok: false, failureClass: 'ill_formed_unicode' };
    if (seen.has(member)) return { ok: false, failureClass: 'duplicate_identifier' };
    seen.add(member);
  }
  const normalized = [...seen].sort(compareUtf16);
  return {
    ok: true,
    normalized,
    canonicalJson: canonicalize(normalized),
    digest: canonicalDigest(normalized),
  };
}

function vectorBudgetProblem(value: unknown, where: string): string | undefined {
  if (typeof value === 'string') {
    return value.length > CANONICALIZATION_SOURCE_LIMITS.identifierUtf16CodeUnits
      ? `${where}: string exceeds ${CANONICALIZATION_SOURCE_LIMITS.identifierUtf16CodeUnits} UTF-16 code units`
      : undefined;
  }
  if (!Array.isArray(value)) return undefined;
  if (value.length > CANONICALIZATION_SOURCE_LIMITS.identifiersPerVector) {
    return `${where}: exceeds ${CANONICALIZATION_SOURCE_LIMITS.identifiersPerVector} identifiers`;
  }
  let totalCodeUnits = 0;
  for (const [index, member] of value.entries()) {
    const length = typeof member === 'string'
      ? member.length
      : Array.isArray(member)
        ? member.length
        : 0;
    if (length > CANONICALIZATION_SOURCE_LIMITS.identifierUtf16CodeUnits) {
      return `${where}[${index}]: exceeds ${CANONICALIZATION_SOURCE_LIMITS.identifierUtf16CodeUnits} UTF-16 code units`;
    }
    totalCodeUnits += length;
    if (totalCodeUnits > CANONICALIZATION_SOURCE_LIMITS.totalUtf16CodeUnitsPerVector) {
      return `${where}: exceeds ${CANONICALIZATION_SOURCE_LIMITS.totalUtf16CodeUnitsPerVector} total UTF-16 code units`;
    }
  }
  return undefined;
}

function fromUtf16CodeUnits(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((member) => {
    if (!Array.isArray(member)) return member;
    let decoded = '';
    for (const unit of member) {
      if (!Number.isInteger(unit) || unit < 0 || unit > 0xffff) return member;
      decoded += String.fromCharCode(unit);
    }
    return decoded;
  });
}

/** Return every exact algorithm id declared by a `canonicalization` const. */
export function canonicalizationReferences(value: unknown): string[] {
  const references = new Set<string>();
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const record = node as JsonRecord;
    const properties = record.properties;
    if (isRecord(properties)) {
      const canonicalization = properties.canonicalization;
      if (isRecord(canonicalization) && typeof canonicalization.const === 'string') {
        references.add(canonicalization.const);
      }
    }
    Object.values(record).forEach(visit);
  };
  visit(value);
  return [...references].sort(compareUtf16);
}

export function canonicalizationSourceProblems(registry: unknown): string[] {
  const problems: string[] = [];
  if (!isRecord(registry) || !Array.isArray(registry.algorithms)) {
    return ['canonicalizations: expected an object with an algorithms array'];
  }
  for (const [algorithmIndex, value] of registry.algorithms.entries()) {
    const where = `canonicalizations.algorithms[${algorithmIndex}]`;
    if (!isRecord(value)) {
      problems.push(`${where}: expected an object`);
      continue;
    }
    if (value.id !== ALGORITHM_ID || value.revision !== 1) {
      problems.push(`${where}: unimplemented algorithm id/revision`);
      continue;
    }
    const vectors = value.conformanceVectors;
    if (!Array.isArray(vectors) || vectors.length === 0) {
      problems.push(`${where}.conformanceVectors: expected a non-empty array`);
      continue;
    }
    if (vectors.length > CANONICALIZATION_SOURCE_LIMITS.conformanceVectors) {
      problems.push(
        `${where}.conformanceVectors: exceeds ${CANONICALIZATION_SOURCE_LIMITS.conformanceVectors} vectors`,
      );
      continue;
    }
    const declaredFailureClasses = Array.isArray(value.failureClasses)
      ? value.failureClasses
      : [];
    if (
      JSON.stringify(declaredFailureClasses) !== JSON.stringify(FAILURE_CLASSES)
    ) {
      problems.push(
        `${where}.failureClasses: must declare the complete ordered reference failure set`,
      );
    }
    const names = new Set<string>();
    const coveredFailureClasses = new Set<string>();
    let acceptVectorCount = 0;
    for (const [vectorIndex, vectorValue] of vectors.entries()) {
      const vectorWhere = `${where}.conformanceVectors[${vectorIndex}]`;
      if (!isRecord(vectorValue) || typeof vectorValue.name !== 'string') {
        problems.push(`${vectorWhere}: expected a named vector object`);
        continue;
      }
      if (names.has(vectorValue.name)) problems.push(`${vectorWhere}.name: duplicate vector name`);
      names.add(vectorValue.name);
      const budgetFields = vectorValue.inputEncoding === 'utf16_code_units'
        ? [['inputCodeUnits', vectorValue.inputCodeUnits] as const]
        : [
            ['input', vectorValue.input] as const,
            ['normalizedInput', vectorValue.normalizedInput] as const,
          ];
      let overBudget = false;
      for (const [field, fieldValue] of budgetFields) {
        const problem = vectorBudgetProblem(fieldValue, `${vectorWhere}.${field}`);
        if (problem !== undefined) {
          problems.push(problem);
          overBudget = true;
        }
      }
      if (overBudget) continue;
      const input = vectorValue.inputEncoding === 'utf16_code_units'
        ? fromUtf16CodeUnits(vectorValue.inputCodeUnits)
        : vectorValue.input;
      const actual = referenceCanonicalize(input);
      if (vectorValue.outcome === 'accept') {
        acceptVectorCount++;
        if (!actual.ok) {
          problems.push(`${vectorWhere}: expected acceptance, got ${actual.failureClass}`);
          continue;
        }
        if (JSON.stringify(actual.normalized) !== JSON.stringify(vectorValue.normalizedInput)) {
          problems.push(`${vectorWhere}.normalizedInput: does not match UTF-16 set normalization`);
        }
        if (actual.canonicalJson !== vectorValue.canonicalJson) {
          problems.push(`${vectorWhere}.canonicalJson: does not match RFC 8785 output`);
        }
        if (!DIGEST_PATTERN.test(String(vectorValue.digest)) || actual.digest !== vectorValue.digest) {
          problems.push(`${vectorWhere}.digest: does not match the canonical UTF-8 SHA-256 digest`);
        }
      } else if (vectorValue.outcome === 'reject') {
        if (typeof vectorValue.failureClass === 'string') {
          coveredFailureClasses.add(vectorValue.failureClass);
        }
        if (actual.ok) {
          problems.push(`${vectorWhere}: expected rejection, but the reference accepted it`);
        } else if (actual.failureClass !== vectorValue.failureClass) {
          problems.push(
            `${vectorWhere}.failureClass: expected ${String(vectorValue.failureClass)}, got ${actual.failureClass}`,
          );
        }
      } else {
        problems.push(`${vectorWhere}.outcome: expected accept or reject`);
      }
    }
    if (acceptVectorCount === 0) {
      problems.push(`${where}.conformanceVectors: at least one acceptance vector is required`);
    }
    for (const failureClass of FAILURE_CLASSES) {
      if (!coveredFailureClasses.has(failureClass)) {
        problems.push(
          `${where}.conformanceVectors: missing rejection vector for ${failureClass}`,
        );
      }
    }
  }
  return problems;
}

export function canonicalizationEntryDigest(algorithm: unknown): string {
  return canonicalDigest(algorithm);
}
