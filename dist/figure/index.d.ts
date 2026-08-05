import { C as UNIT_CODES, S as UNITS, T as UnitCode, _ as ErrorCode, a as finalizeErrors, b as QuantityKind, c as pointer, d as CANONICALIZATION_IDS, f as CanonicalizationId, g as ERROR_CODE_META, h as ERROR_CODES, i as Severity, l as safeText, m as DisclosureId, n as RepairOperation, o as isSafeDisplayString, p as DISCLOSURE_RULES, r as Result, s as makeError, t as CortexelError, u as CANONICALIZATION_ALGORITHMS, v as ErrorStage, y as QUANTITY_KINDS } from "../errors-DLTGhSm-.js";
import { n as DisclosureFacts, r as deriveDisclosures, t as Disclosure } from "../disclosures-DacKj943.js";
import { n as parseJsonStrict, t as JsonValue } from "../parse-json-lPs8n7A_.js";
import { _ as isStableSkillId, a as CapabilityAvailability, c as EXPERIMENTAL_CAPABILITY_IDS, d as REMOVED_CAPABILITY_IDS, f as SKILL_CATALOG, g as isCapabilityId, h as StableSkillId, i as CAPABILITY_IDS, l as LEGACY_SKILL_MAP, m as SkillCatalogEntry, n as CAPABILITY_AVAILABILITIES, o as CapabilityCatalogEntry, p as STABLE_SKILL_IDS, r as CAPABILITY_CATALOG, s as CapabilityId, t as AdapterCatalogEntry, u as LegacyMapEntry, v as lookupCapabilityCatalogEntry, y as lookupSkillCatalogEntry } from "../catalog-loFdaQY_.js";
import { a as CONTRACT_DIGEST, c as STABLE_SKILL_COUNT, i as CATALOG_DIGEST_DOMAIN, l as getBuildIdentity, n as BuildIdentity, o as PACKAGE_VERSION, r as CATALOG_DIGEST, s as REQUEST_CONTRACT, t as ARTIFACT_CONTRACT } from "../identity-DZ0E0rUc.js";
import { t as BudgetProfileId } from "../budgets-DXJ69wrM.js";
import { InputAssurance, InputAssurance as InputAssurance$1, ValidateOptions, ValidateOptions as ValidateOptions$1, ValidatedRequest, ValidatedRequest as ValidatedRequest$1, ValidationOutcome, isValidatedRequest, parseAndValidateRequest, validateRequestValue } from "#cortexel-request-capability";
//#region src/core/limits.d.ts
interface BudgetLimits {
  readonly rawInputBytes: number;
  readonly jsonDepth: number;
  readonly jsonTotalNodes: number;
  readonly jsonStringLength: number;
  readonly jsonNumberTokenLength: number;
  readonly jsonObjectKeys: number;
  readonly jsonArrayItems: number;
  readonly observationsPerSeries: number;
  readonly observationsPerRequest: number;
  readonly graphNodes: number;
  readonly graphEdges: number;
  readonly matrixCells: number;
  readonly pairwiseOperations: number;
  readonly visibleMarks: number;
  readonly svgTextNodes: number;
  readonly svgBytes: number;
  readonly sidecarBytes: number;
  readonly returnedTableRows: number;
  readonly safeRepairOperations: number;
  readonly errorRecords: number;
}
declare const DEFAULT_PROFILE: BudgetProfileId;
/** Resolve an untrusted profile id without coercion, prototype lookup, or throwing. */
declare function tryGetBudgetLimits(profile?: unknown): BudgetLimits | undefined;
declare function getBudgetLimits(profile?: BudgetProfileId): BudgetLimits;
interface ResolvedBudgetProfile {
  readonly profile: BudgetProfileId;
  readonly limits: BudgetLimits;
}
/**
 * Select the component-wise tighter of two published profiles.
 *
 * Profiles are deliberately ordered resource envelopes. If a future registry adds two
 * incomparable profiles, this returns `undefined` rather than silently mixing them under
 * a misleading profile id. The generator/test suite then has to establish an explicit
 * composition contract first.
 */
declare function trySelectTighterBudgetProfile(hostProfile: unknown, requestedProfile: unknown): ResolvedBudgetProfile | undefined;
/**
 * Lower a limit. There is intentionally no way to RAISE one from here.
 *
 * A host that genuinely needs a larger ceiling must construct a separately named
 * internal profile after an explicit risk review, and the artifact it produces
 * records that non-standard profile and cannot claim default conformance. An
 * untrusted caller can never widen a bound by asking nicely.
 */
declare function restrictLimits(base: BudgetLimits, overrides: Partial<BudgetLimits>): BudgetLimits;
//#endregion
//#region src/core/repairs.d.ts
/** One correction Cortexel applied to its private candidate snapshot. */
interface AppliedSafeRepair {
  readonly operation: 'replace' | 'remove' | 'add';
  readonly path: string;
  readonly value?: JsonValue;
  readonly reasonCode: 'CONTRACT_MISSING' | 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL' | 'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN';
}
/**
 * No unvalidated candidate is returned. The original input is never mutated; only a
 * successful ordinary branded request can cross the render boundary.
 */
type SafeRepairOutcome = {
  readonly ok: true;
  readonly request: ValidatedRequest$1;
  readonly sourceInputAssurance: InputAssurance$1;
  readonly appliedRepairs: readonly AppliedSafeRepair[];
} | {
  readonly ok: false;
  readonly errors: readonly CortexelError[];
  readonly inputAssurance: InputAssurance$1;
  readonly sourceInputAssurance: InputAssurance$1;
  readonly appliedRepairs: readonly AppliedSafeRepair[];
};
/**
 * Apply only the closed semantics-preserving subset and revalidate from stage one.
 *
 * Strings are raw JSON. All other inputs use the materialized-value boundary. One owned
 * snapshot is acquired before diagnostics are derived, so caller mutation cannot swap a
 * different tree under the repair planner. Raw candidates are canonically serialized
 * and reparsed after each batch, retaining duplicate-key-aware final assurance.
 */
declare function applySafeRepairs(input: unknown, options?: ValidateOptions$1): SafeRepairOutcome;
//#endregion
//#region src/core/sha256.d.ts
/** The number of UTF-8 bytes in a string, without allocating a second full-size buffer. */
declare function utf8ByteLength(text: string): number;
/** SHA-256 of a UTF-8 string, as 64 lowercase hex characters. */
declare function sha256Hex(text: string): string;
/**
 * The canonical Cortexel digest form. Always the full 64 hex characters: a
 * truncated hash may be DISPLAYED to a human, but it is never an API value,
 * because a short hash is a collision waiting to be someone's problem.
 */
declare function sha256Digest(text: string): string;
//#endregion
//#region src/core/canonicalize.d.ts
/**
 * RFC 8785 — JSON Canonicalization Scheme (JCS).
 *
 * This is the function that decides whether two independent implementations can
 * agree on what a figure IS. If TypeScript and Python disagree on one byte here,
 * every digest, every artifact identity, and every reproducibility claim in the
 * project is worthless. So it is implemented deliberately, tested against the
 * official RFC 8785 vectors, and never described as "sorted JSON.stringify" —
 * that is a different thing that happens to look similar.
 *
 * The scheme, exactly:
 *
 *   - Object members are sorted by their names, compared as sequences of UTF-16
 *     code units (RFC 8785 §3.2.3). JavaScript's default string `<` and
 *     `Array.prototype.sort()` already compare UTF-16 code units, which is why
 *     a bare `.sort()` is correct here and a locale-aware collator would not be.
 *   - Numbers use the ECMAScript Number-to-String algorithm (§3.2.2.3), which is
 *     what `JSON.stringify` emits. `-0` serializes as `0`.
 *   - Strings use the shortest legal JSON escapes (§3.2.2.2) — which is what
 *     `JSON.stringify` emits.
 *   - No insignificant whitespace anywhere.
 *
 * The JCS domain is finite, well-formed JSON. Values outside it — NaN, Infinity,
 * a lone surrogate — are REJECTED rather than coerced, because there is no
 * canonical form for a value the scheme does not define.
 */
declare class CanonicalizationError extends Error {
  readonly path: string;
  constructor(message: string, path: string);
}
/** Canonicalize a JSON-compatible value to its RFC 8785 byte sequence, as a string. */
declare function canonicalize(value: unknown): string;
/**
 * SHA-256 over the canonical bytes of a value: `sha256:<64 hex>`.
 *
 * Two implementations that agree here agree on identity. That is the whole point.
 */
declare function canonicalDigest(value: unknown): string;
/**
 * Digest an object with one top-level member excluded.
 *
 * An artifact carries its own digest, so that field cannot be part of what is
 * hashed — a self-referential hash has no fixed point. This makes the exclusion
 * explicit and testable rather than an implicit delete somewhere in the builder.
 */
declare function canonicalDigestExcluding(value: Record<string, unknown>, excludeKey: string): string;
//#endregion
//#region src/core/response-curve-basis.d.ts
declare const RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID: "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1";
/**
 * ECMAScript relational comparison is lexicographic over UTF-16 code units.  Keep the
 * comparator explicit: locale collation, Unicode-normalized comparison, and Python's
 * native code-point ordering all define different orders for some valid identifiers.
 */
declare function compareUtf16CodeUnits(left: string, right: string): number;
declare function normalizeResponseEventMemberIds(identifiers: readonly string[]): readonly string[];
/** SHA-256 over RFC 8785 canonical JSON of the UTF-16-sorted identifier array. */
declare function responseEventMembershipDigest(identifiers: readonly string[]): string;
//#endregion
//#region src/core/safe-snapshot.d.ts
/**
 * Take an intrinsic-safe, accessor-free, bounded snapshot of a JavaScript value.
 *
 * The returned value is a fresh, detached, null-prototype structure. Nothing the
 * caller does to the original afterwards can change what Cortexel validated — which
 * closes the time-of-check/time-of-use gap that a live reference would leave open.
 */
declare function snapshotValue(value: unknown, limits: BudgetLimits): Result<JsonValue>;
//#endregion
//#region src/core/units.d.ts
interface Quantity {
  readonly kind: string;
  readonly unit: string;
  readonly value: number;
}
interface QuantitySeries {
  readonly kind: string;
  readonly unit: string;
  readonly values: readonly (number | null)[];
}
declare function isKnownUnit(code: string): boolean;
declare function dimensionOf(code: string): string | undefined;
/** The canonical code an alias means, or undefined when the string is not an alias. */
declare function resolveAlias(code: string): string | undefined;
/**
 * Convert a value between two codes of the same dimension.
 *
 * Multiplies ONCE, by a single exact factor. It never chains through an
 * intermediate unit, because every extra binary64 multiply is another chance to
 * lose a digit for no reason.
 */
declare function convert(value: number, from: string, to: string): number;
/** Convert a duration to seconds. Used wherever a rate denominator is formed. */
declare function toSeconds(value: number, unit: string): number;
/**
 * Whether two quantities may share one numeric axis.
 *
 * Equal array length is not a reason to put two signals on the same axis. A calcium
 * concentration and a membrane potential are both "numbers over time" and mean
 * entirely different things; overlaying them produces a picture that looks like a
 * comparison and is not one.
 */
declare function axesAreCompatible(unitA: string, unitB: string): boolean;
/** The display label for a unit ("" for the dimensionless unit). */
declare function unitLabel(code: string): string;
//#endregion
//#region src/core/migrate-v0.d.ts
interface MigrationReport {
  readonly legacyId: string;
  readonly outcome: LegacyMapEntry['outcome'];
  readonly targetId: string | null;
  /** Execution status of the named transform. Present for mapped target
   * skeletons so callers cannot mistake an outcome label for a data rewrite. */
  readonly transformExecution?: LegacyMapEntry['transformExecution'];
  /** Fields that were renamed or moved, oldPath -> newPath. */
  readonly operations: readonly {
    readonly op: string;
    readonly detail: string;
  }[];
  /** Information the caller must still supply. Non-empty means the request is partial. */
  readonly unresolved: readonly string[];
  /** Warnings — e.g. an ambiguous value that mapped to a weaker accurate target. */
  readonly warnings: readonly CortexelError[];
  /** Blocking reasons. Non-empty means no usable request was produced. */
  readonly errors: readonly CortexelError[];
}
interface MigrationResult {
  /** A report-only target skeleton in the current implementation. Undefined
   * when no current-contract target exists. */
  readonly request?: Record<string, unknown>;
  readonly report: MigrationReport;
}
/**
 * Migrate a legacy request.
 *
 * The heavy per-skill field transforms are deliberately NOT implemented as generic
 * shape-guessing here. Every currently named transform is `report_only`: migration
 * recognizes the legacy id and returns a precise target skeleton and REPORT of what
 * the caller must supply. It copies no legacy params or data. Preservation statements
 * in the registry are obligations for a future implemented transform with its own
 * fixtures, not claims about this execution. A caller is told exactly where they
 * stand, never handed a silently half-converted request that looks complete.
 */
declare function migrateLegacyRequest(input: unknown): MigrationResult;
//#endregion
export { ARTIFACT_CONTRACT, type AdapterCatalogEntry, type AppliedSafeRepair, type BudgetLimits, type BudgetProfileId, type BuildIdentity, CANONICALIZATION_ALGORITHMS, CANONICALIZATION_IDS, CAPABILITY_AVAILABILITIES, CAPABILITY_CATALOG, CAPABILITY_IDS, CATALOG_DIGEST, CATALOG_DIGEST_DOMAIN, CONTRACT_DIGEST, CanonicalizationError, type CanonicalizationId, type CapabilityAvailability, type CapabilityCatalogEntry, type CapabilityId, type CortexelError, DEFAULT_PROFILE, DISCLOSURE_RULES, type Disclosure, type DisclosureFacts, type DisclosureId, ERROR_CODES, ERROR_CODE_META, EXPERIMENTAL_CAPABILITY_IDS, type ErrorCode, type ErrorStage, type InputAssurance, type JsonValue, LEGACY_SKILL_MAP, type LegacyMapEntry, type MigrationReport, type MigrationResult, PACKAGE_VERSION, QUANTITY_KINDS, type Quantity, type QuantityKind, type QuantitySeries, REMOVED_CAPABILITY_IDS, REQUEST_CONTRACT, RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID, type RepairOperation, type ResolvedBudgetProfile, type Result, SKILL_CATALOG, STABLE_SKILL_COUNT, STABLE_SKILL_IDS, type SafeRepairOutcome, type Severity, type SkillCatalogEntry, type StableSkillId, UNITS, UNIT_CODES, type UnitCode, type ValidateOptions, type ValidatedRequest, type ValidationOutcome, applySafeRepairs, axesAreCompatible, canonicalDigest, canonicalDigestExcluding, canonicalize, compareUtf16CodeUnits, convert, deriveDisclosures, dimensionOf, finalizeErrors, getBudgetLimits, getBuildIdentity, isCapabilityId, isKnownUnit, isSafeDisplayString, isStableSkillId, isValidatedRequest, lookupCapabilityCatalogEntry, lookupSkillCatalogEntry, makeError, migrateLegacyRequest, normalizeResponseEventMemberIds, parseAndValidateRequest, parseJsonStrict, pointer, resolveAlias, responseEventMembershipDigest, restrictLimits, safeText, sha256Digest, sha256Hex, snapshotValue, toSeconds, tryGetBudgetLimits, trySelectTighterBudgetProfile, unitLabel, utf8ByteLength, validateRequestValue };
