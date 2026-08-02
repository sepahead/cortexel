export { A as ARTIFACT_CONTRACT, B as BuildIdentity, C as CATALOG_DIGEST, a as CATALOG_DIGEST_DOMAIN, b as CONTRACT_DIGEST, P as PACKAGE_VERSION, R as REQUEST_CONTRACT, S as STABLE_SKILL_COUNT, g as getBuildIdentity } from '../identity-DRWgTSXQ.js';
import { J as JsonValue, L as LegacyMapEntry } from '../catalog-C0useJAP.js';
export { A as AdapterCatalogEntry, C as CAPABILITY_AVAILABILITIES, a as CAPABILITY_CATALOG, b as CAPABILITY_IDS, c as CapabilityAvailability, d as CapabilityCatalogEntry, e as CapabilityId, E as EXPERIMENTAL_CAPABILITY_IDS, m as LEGACY_SKILL_MAP, R as REMOVED_CAPABILITY_IDS, f as SKILL_CATALOG, g as STABLE_SKILL_IDS, h as SkillCatalogEntry, S as StableSkillId, i as isCapabilityId, j as isStableSkillId, l as lookupCapabilityCatalogEntry, k as lookupSkillCatalogEntry, p as parseJsonStrict } from '../catalog-C0useJAP.js';
import { C as CortexelError, R as Result } from '../errors-DOfZeMp8.js';
export { a as CANONICALIZATION_ALGORITHMS, b as CANONICALIZATION_IDS, c as CanonicalizationId, d as DISCLOSURE_RULES, D as DisclosureId, E as ERROR_CODES, e as ERROR_CODE_META, f as ErrorCode, g as ErrorStage, Q as QUANTITY_KINDS, h as QuantityKind, i as RepairOperation, j as Severity, k as UNITS, l as UNIT_CODES, m as UnitCode, n as finalizeErrors, o as isSafeDisplayString, p as makeError, q as pointer, s as safeText } from '../errors-DOfZeMp8.js';
import { B as BudgetProfileId, V as ValidatedRequest, I as InputAssurance, a as ValidateOptions } from '../request-Cim-pRCp.js';
export { b as ValidationOutcome, i as isValidatedRequest, p as parseAndValidateRequest, v as validateRequestValue } from '../request-Cim-pRCp.js';
export { D as Disclosure, a as DisclosureFacts, d as deriveDisclosures } from '../disclosures-B1yMLt1i.js';
import '#cortexel-validated-request-brand';

/**
 * Resource limits.
 *
 * The numbers live in `contract/registries/budget-profiles.v1.json` and are
 * GENERATED into `src/generated/budgets.ts`. This module is the typed door to
 * them; it holds no numbers of its own, because a limit that exists in two places
 * eventually exists at two values.
 *
 * The distinction that matters:
 *
 *   A HARD LIMIT protects the process. Input above it FAILS.
 *   A DISPLAY BUDGET controls representation. Every current stable skill selects
 *   only `none`, so input above it is refused. A future compiler may compact only
 *   through a named deterministic policy introduced with complete bound output.
 *
 * Confusing the two is how a library ends up silently truncating a dataset and
 * calling the result a figure.
 */

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

/**
 * Closed machine-applicable repairs for FigureRequestV1.
 *
 * This is deliberately much smaller than the diagnostic repair vocabulary. A repair
 * hint may recommend a scientific or presentational choice; that does not make the
 * choice safe to automate. This module admits only operations whose intended value can
 * be re-derived from installed contract authority and then revalidates from stage one.
 */

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
    readonly request: ValidatedRequest;
    readonly sourceInputAssurance: InputAssurance;
    readonly appliedRepairs: readonly AppliedSafeRepair[];
} | {
    readonly ok: false;
    readonly errors: readonly CortexelError[];
    readonly inputAssurance: InputAssurance;
    readonly sourceInputAssurance: InputAssurance;
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
declare function applySafeRepairs(input: unknown, options?: ValidateOptions): SafeRepairOutcome;

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

/**
 * The materialized-value boundary.
 *
 * When a caller hands Cortexel a JavaScript object rather than JSON text, the
 * object may be actively hostile: getters that run code, a Proxy whose traps
 * throw, a `toJSON` that returns a different shape the second time it is asked, a
 * class instance that merely looks like data.
 *
 * The governing rule of this file: **never ask the value a question it can answer
 * with code.** No property is READ; property DESCRIPTORS are inspected, and only
 * an own, enumerable, data property is eligible. `String(value)`, `value.toString()`,
 * `JSON.stringify(value)`, `instanceof`, and `Symbol.toPrimitive` are all
 * caller-controlled execution and none of them appears here.
 *
 * And the honest part: this boundary CANNOT detect a duplicate object member. By
 * the time a JavaScript value exists, `JSON.parse` has already discarded one of
 * them. So the result records `duplicateKeys: "not_observable_after_materialization"`
 * rather than implying a check it did not perform.
 */

/**
 * Take an intrinsic-safe, accessor-free, bounded snapshot of a JavaScript value.
 *
 * The returned value is a fresh, detached, null-prototype structure. Nothing the
 * caller does to the original afterwards can change what Cortexel validated — which
 * closes the time-of-check/time-of-use gap that a live reference would leave open.
 */
declare function snapshotValue(value: unknown, limits: BudgetLimits): Result<JsonValue>;

/**
 * Units.
 *
 * A non-blank string is not a unit. `"ms"` and `"milliseconds"` and `""` are three
 * different situations, and a library that treats them the same will eventually
 * multiply something by 1000 when it should not have.
 *
 * Three rules, and the second one is the interesting one:
 *
 *   1. A conversion is legal only WITHIN a dimension. Cross-dimension conversion
 *      is never attempted, so a voltage can never become a current.
 *
 *   2. An accepted ALIAS is rejected in a stable request rather than silently
 *      converted. This looks unfriendly and is deliberate: a silent conversion
 *      changes a number that the caller never sees change. The rejection carries a
 *      machine-applicable repair, so the fix is one operation — but it is the
 *      caller's operation, and it is recorded. Adapters and `cortexel migrate` may
 *      convert aliases, because there the conversion IS the caller's intent.
 *
 *   3. A `simulator_defined` unit — a NEST weight, say — has no SI mapping and is
 *      NEVER converted, compared, or pooled with anything, including another
 *      simulator-defined unit. A NEST weight's physical meaning depends on the
 *      synapse and neuron model: in one model it acts like a current, in another
 *      like a conductance. Two such numbers are not comparable merely because both
 *      are called "weight", and a histogram that pools them is a histogram of nothing.
 */

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

/**
 * Deterministic migration from pre-1.0.
 *
 * The design constraint that shapes everything here: migration produces a REQUEST
 * plus a REPORT. It never produces a validation receipt, a render receipt, or an
 * artifact. A target skeleton has not been validated — the consumer must complete it
 * from original source data, then revalidate and re-render. The current named
 * per-skill transforms are report-only target mappings, not data translators.
 *
 * And it never guesses. If the legacy payload lacks a population count, a trial
 * count, a unit, a node universe, MPI completeness, an uncertainty method, or a
 * zero-lag policy, migration returns a PARTIAL request plus a blocking error — or no
 * request at all. A migration that filled in a plausible denominator would be worse
 * than one that failed, because the failure is visible and the guess is not.
 *
 * This is also why legacy ids are never silently aliased in normal validation. A
 * silent alias would let a stored artifact claim it was validated against the 1.0
 * `neuro.analog_trace` contract when it was really written for `nest.voltage_trace` —
 * and no one downstream could tell the difference.
 */

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

export { type AppliedSafeRepair, type BudgetLimits, BudgetProfileId, CanonicalizationError, CortexelError, DEFAULT_PROFILE, InputAssurance, JsonValue, LegacyMapEntry, type MigrationReport, type MigrationResult, type Quantity, type QuantitySeries, RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID, type ResolvedBudgetProfile, Result, type SafeRepairOutcome, ValidateOptions, ValidatedRequest, applySafeRepairs, axesAreCompatible, canonicalDigest, canonicalDigestExcluding, canonicalize, compareUtf16CodeUnits, convert, dimensionOf, getBudgetLimits, isKnownUnit, migrateLegacyRequest, normalizeResponseEventMemberIds, resolveAlias, responseEventMembershipDigest, restrictLimits, sha256Digest, sha256Hex, snapshotValue, toSeconds, tryGetBudgetLimits, trySelectTighterBudgetProfile, unitLabel, utf8ByteLength };
