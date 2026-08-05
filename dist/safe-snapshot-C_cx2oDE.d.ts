import { t as BudgetProfileId } from "./budgets-DXJ69wrM.js";
import { r as Result } from "./errors-DLTGhSm-.js";
import { t as JsonValue } from "./parse-json-lPs8n7A_.js";
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
export { getBudgetLimits as a, trySelectTighterBudgetProfile as c, canonicalDigestExcluding as d, canonicalize as f, ResolvedBudgetProfile as i, CanonicalizationError as l, BudgetLimits as n, restrictLimits as o, DEFAULT_PROFILE as r, tryGetBudgetLimits as s, snapshotValue as t, canonicalDigest as u };
