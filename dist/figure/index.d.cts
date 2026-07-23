import { J as JsonValue, B as BudgetLimits } from '../parse-json-DLZ2fGD_.cjs';
export { a as DEFAULT_PROFILE, D as Disclosure, b as DisclosureFacts, R as ResolvedBudgetProfile, d as deriveDisclosures, g as getBudgetLimits, p as parseJsonStrict, r as restrictLimits, t as tryGetBudgetLimits, c as trySelectTighterBudgetProfile } from '../parse-json-DLZ2fGD_.cjs';
import { S as SemanticValidatorId, D as DisclosureId, U as UncertaintyKind, R as Result, C as CortexelError } from '../errors-DUbFUu6n.cjs';
export { a as CANONICALIZATION_ALGORITHMS, b as CANONICALIZATION_IDS, c as CanonicalizationId, d as DISCLOSURE_RULES, E as ERROR_CODES, e as ERROR_CODE_META, f as ErrorCode, g as ErrorStage, Q as QUANTITY_KINDS, h as QuantityKind, i as RepairOperation, j as Severity, k as UNITS, l as UNIT_CODES, m as UnitCode, n as finalizeErrors, o as isSafeDisplayString, p as makeError, q as pointer, s as safeText } from '../errors-DUbFUu6n.cjs';
export { B as BudgetProfileId, I as InputAssurance, V as ValidateOptions, a as ValidatedRequest, b as ValidationOutcome, i as isValidatedRequest, p as parseAndValidateRequest, v as validateRequestValue } from '../request-BfsYJWaE.cjs';

/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/ (digest) and package.json (version).
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */
declare const PACKAGE_VERSION = "0.10.0-dev.0";
declare const REQUEST_CONTRACT = "cortexel-figure-request/1.0";
declare const ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";
declare const CONTRACT_DIGEST = "sha256:02c8581a22d6417560cf8c6a890f25416243287b29ad7a9d5a8714915bae216e";
declare const CATALOG_DIGEST = "sha256:801aa157a57212ca58b092319d57edd8ab8649a80202a8a577510ca9f7162c09";
declare const STABLE_SKILL_COUNT = 19;
interface BuildIdentity {
    readonly packageVersion: string;
    readonly requestContract: string;
    readonly artifactContract: string;
    readonly contractDigest: string;
    readonly catalogDigest: string;
    readonly stableSkillCount: number;
    readonly sourceRevision: string;
    readonly release: boolean;
}
/**
 * Every identity axis, named.
 *
 * `sourceRevision` is the literal 'unreleased-worktree' unless a release build
 * stamps it. A build that guessed at a release commit would be lying about its own
 * provenance, which is worse than having none.
 */
declare function getBuildIdentity(): BuildIdentity;

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

interface AuthorityRequestFieldSegmentV1 {
    readonly tag: 'field';
    readonly name: string;
}
interface AuthorityRequestIndexSegmentV1 {
    readonly tag: 'index';
    readonly index: number;
}
type AuthorityRequestPathSegmentV1 = AuthorityRequestFieldSegmentV1 | AuthorityRequestIndexSegmentV1;
interface AuthorityRequestPathRefV1 {
    readonly tag: 'request_path';
    /** Resolves only through the source contract's finite requestPaths vocabulary. */
    readonly pathId: string;
}
interface AuthorityDerivationFieldRefV1 {
    readonly tag: 'derivation_field';
    readonly field: string;
}
type AuthorityDerivationValueKindV1 = 'row_sequence' | 'geometry_sequence' | 'summary_fact_map' | 'disclosure_fact_map';
interface AuthorityDerivationFieldDeclarationV1 {
    readonly id: string;
    readonly valueKind: AuthorityDerivationValueKindV1;
}
interface AuthorityTableV1 {
    readonly tag: 'row_sequence';
    readonly expectedRows: AuthorityDerivationFieldRefV1;
    readonly carriedValueColumns: readonly string[];
    /** Exact sequence is stronger than multiset equality and preserves meaningful row order. */
    readonly comparison: 'canonical_json_sequence_exact';
    readonly rowsTotal: 'from_verified_expected_rows';
}
interface AuthorityGeometryClassV1 {
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
interface AuthorityGeometryV1 {
    readonly tag: 'classified_geometry';
    readonly traversal: 'nested_groups_depth_first_preorder';
    readonly excludedRoles: readonly ['axis', 'text', 'disclosure', 'decorative_mark'];
    /** One global sequence preserves inter-class DFS interleaving as well as class order. */
    readonly expectedSequence: AuthorityDerivationFieldRefV1;
    readonly classes: readonly AuthorityGeometryClassV1[];
}
interface AuthorityInfluenceWitnessV1 {
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
interface AuthorityInfluenceV1 {
    readonly tag: 'finite_paired_witnesses';
    readonly witnesses: readonly AuthorityInfluenceWitnessV1[];
}
interface AuthoritySummaryV1 {
    readonly tag: 'fact_template';
    readonly expectedFacts: AuthorityDerivationFieldRefV1;
    readonly requiredPlaceholders: readonly string[];
    readonly missingFactPolicy: 'refuse';
    readonly unknownFactPolicy: 'refuse';
}
interface AuthorityDisclosuresV1 {
    readonly tag: 'derived_disclosures';
    readonly expectedFacts: AuthorityDerivationFieldRefV1;
}
interface OutputAuthorityV1 {
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

/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/skills/, contract/registries/capabilities.v1.json, and contract/registries/palettes.v1.json.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

declare const CAPABILITY_AVAILABILITIES: readonly ["packaged", "source_only", "unavailable"];
type CapabilityAvailability = (typeof CAPABILITY_AVAILABILITIES)[number];
interface SkillCatalogEntry {
    readonly id: string;
    readonly revision: number;
    readonly status: 'stable' | 'experimental' | 'deprecated' | 'removed';
    readonly availability: CapabilityAvailability;
    readonly releaseReady: boolean;
    readonly title: string;
    readonly canonicalQuestion: string;
    readonly cannotEstablish: readonly string[];
    readonly renderer: {
        readonly id: string;
        readonly revision: number;
    };
    readonly semanticValidators: readonly {
        readonly id: SemanticValidatorId;
        readonly parameters?: Readonly<Record<string, unknown>>;
    }[];
    readonly disclosures: readonly DisclosureId[];
    readonly budgets: {
        readonly maxObservations: number;
        readonly maxVisibleMarks: number;
        readonly maxReturnedTableRows: number;
        readonly compactionPolicies: readonly string[];
        readonly tablePolicy: string;
    };
    readonly uncertaintySupport: readonly UncertaintyKind[];
    readonly accessibility: {
        readonly summaryTemplate: string;
        readonly tableColumns: readonly {
            readonly key: string;
            readonly header: string;
            readonly cellType: 'finite_number' | 'string' | 'finite_number_or_string';
            readonly nullable: boolean;
            readonly keyPart: boolean;
            readonly description?: string;
        }[];
    };
    readonly outputAuthority: OutputAuthorityV1;
    readonly evidence: {
        readonly handVectors: boolean;
        readonly externalOracle: unknown;
    };
    readonly legacyIds: readonly string[];
    readonly owner: string;
    readonly knownLimitations: readonly string[];
}
declare const SKILL_CATALOG: Readonly<Record<string, SkillCatalogEntry>>;
/** The stable catalog, in a deliberate discovery order: traces, events, distributions, topology, spatial. */
declare const STABLE_SKILL_IDS: readonly ["network.adjacency_matrix", "network.connection_graph", "network.degree_distribution", "network.delay_distribution", "network.delay_matrix", "network.spatial_map_2d", "network.synaptic_weight_trace", "network.weight_distribution", "network.weight_matrix", "neuro.analog_trace", "neuro.compartment_trace", "neuro.correlogram", "neuro.isi_distribution", "neuro.multisignal_trace", "neuro.phase_plane", "neuro.population_rate", "neuro.psth", "neuro.response_curve", "neuro.spike_raster"];
type StableSkillId = (typeof STABLE_SKILL_IDS)[number];
declare const EXPERIMENTAL_CAPABILITY_IDS: readonly [];
declare const REMOVED_CAPABILITY_IDS: readonly ["nest.animation_replay", "nest.connectivity_matrix", "nest.spatial_2d", "nest.stimulus_response"];
interface LegacyMapEntry {
    readonly legacyId: string;
    readonly outcome: 'migrate' | 'migrate_conditional' | 'experimental' | 'removed' | 'blocked' | 'recipe';
    readonly targetId: string | null;
    readonly transform: string | null;
    readonly errorCode?: string;
    readonly notes: string;
    readonly requires?: readonly string[];
    readonly alternatives?: readonly string[];
    readonly materializedParameters?: Readonly<Record<string, unknown>>;
}
/** Every pre-1.0 id has a deterministic outcome here. There is no fall-through. */
declare const LEGACY_SKILL_MAP: Readonly<Record<string, LegacyMapEntry>>;

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
 * artifact. A migrated request has not been validated — the consumer must revalidate
 * and re-render. Migration is a translator, not an oracle.
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
    /** A partial or complete 1.0 request. Undefined when migration is blocked. */
    readonly request?: Record<string, unknown>;
    readonly report: MigrationReport;
}
/**
 * Migrate a legacy request.
 *
 * The heavy per-skill field transforms are deliberately NOT implemented as generic
 * shape-guessing here. Each is a named transform whose absence is honest: in the
 * current pre-1.0 implementation,
 * migration recognizes every legacy id and returns a precise, correct REPORT of what
 * the target is and what the caller must supply — the deterministic outcome the
 * blueprint requires — while the per-field data rewrites land incrementally with
 * their own fixtures. A caller is told exactly where they stand, never handed a
 * silently half-converted request that looks complete.
 */
declare function migrateLegacyRequest(input: unknown): MigrationResult;

export { ARTIFACT_CONTRACT, BudgetLimits, type BuildIdentity, CATALOG_DIGEST, CONTRACT_DIGEST, CanonicalizationError, CortexelError, DisclosureId, EXPERIMENTAL_CAPABILITY_IDS, JsonValue, LEGACY_SKILL_MAP, type LegacyMapEntry, type MigrationReport, type MigrationResult, PACKAGE_VERSION, type Quantity, type QuantitySeries, REMOVED_CAPABILITY_IDS, REQUEST_CONTRACT, RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID, Result, SKILL_CATALOG, STABLE_SKILL_COUNT, STABLE_SKILL_IDS, type SkillCatalogEntry, type StableSkillId, axesAreCompatible, canonicalDigest, canonicalDigestExcluding, canonicalize, compareUtf16CodeUnits, convert, dimensionOf, getBuildIdentity, isKnownUnit, migrateLegacyRequest, normalizeResponseEventMemberIds, resolveAlias, responseEventMembershipDigest, sha256Digest, sha256Hex, snapshotValue, toSeconds, unitLabel, utf8ByteLength };
