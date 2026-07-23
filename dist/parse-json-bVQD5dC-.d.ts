import { D as DisclosureId, R as Result } from './errors-DUbFUu6n.js';
import { B as BudgetProfileId } from './request-BDtRhnDs.js';

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
 * Disclosures — where honesty is mechanized.
 *
 * A disclosure is never something a caller writes, and never something a flag turns
 * off. Each one is DERIVED from a machine-checkable fact in the artifact, through the
 * closed rule registry. That is the whole design: the only way to remove a
 * disclosure is to remove the fact that causes it. A caller cannot suppress one by
 * omitting a field, weaken one by rewording it, or promote its data by setting a
 * boolean — because none of those change the facts these rules read.
 *
 * The exact same text is then written into four places — the artifact JSON, the
 * visible SVG footer, the SVG accessible description, and the table metadata — and a
 * test asserts all four agree. A disclosure that is visible but not accessible, or
 * accessible but not in the archive, would be a disclosure that some readers do not
 * get.
 */

interface Disclosure {
    readonly id: DisclosureId;
    readonly severity: 'critical' | 'important' | 'informational';
    readonly text: string;
}
/** The facts a disclosure rule may examine. All library-generated; none caller-set. */
interface DisclosureFacts {
    readonly sourceKind: string;
    readonly sourceAuthenticityVerified: boolean;
    readonly referenceComparisonRun: boolean;
    readonly scopeKind?: string;
    readonly rank?: number;
    readonly worldSize?: number;
    readonly nodeUniverseComplete?: boolean;
    readonly excludedOutOfWindow?: number;
    readonly nestSerializedClock?: boolean;
    readonly missingValueCount?: number;
    readonly unitConversions?: readonly string[];
    readonly duplicateTimeAggregateMethod?: string;
    readonly uncertaintyKind?: string;
    readonly uncertaintyReason?: string;
    readonly uncertaintySeriesDeclared?: number;
    readonly uncertaintySeriesShown?: number;
    readonly uncertaintySeriesTotal?: number;
    readonly missingAggregateReplicateCount?: number;
    readonly kernelSmoothed?: boolean;
    readonly preBinned?: boolean;
    readonly rectangularSenderExposureAsserted?: boolean;
    readonly aggregateEstimator?: string;
    readonly aggregateSampleCount?: string;
    readonly eventScopeMembershipCardinalityOnly?: boolean;
    readonly eventScopeExternalAuthorityDeclared?: boolean;
    readonly callerNotePresent?: boolean;
    readonly nonStandardBudgetProfile?: boolean;
    readonly budgetProfileId?: string;
    readonly sampledRetained?: number;
    readonly sampledSource?: number;
    readonly retainedConnectionCount?: number;
    readonly sourceConnectionCount?: number;
    readonly multapseAggregation?: string;
    readonly multapseAggregated?: boolean;
    readonly schematicLayout?: boolean;
    readonly positionsMissing?: number;
    readonly positionsTotal?: number;
}
/**
 * Derive the disclosures for a figure.
 *
 * The list is deterministic: sorted by severity, then by rule id. The compiler may
 * additionally FORCE a rule that depends on facts only it knows (a correlogram always
 * discloses its lag orientation; a matrix discloses that absent is not zero) by
 * passing its id in `forced`. A forced rule still uses the registry text — the
 * compiler decides IF it fires, never WHAT it says.
 */
declare function deriveDisclosures(facts: DisclosureFacts, allowedIds: readonly string[], forced?: readonly string[]): Disclosure[];

/**
 * The raw-JSON boundary.
 *
 * There are exactly two ways into Cortexel, and they can certify different
 * things. That difference is real and the API refuses to blur it:
 *
 *   parseJsonStrict(text)      — sees the TEXT. Can prove there was no duplicate
 *                                object member, because it watches the members go by.
 *   snapshotValue(jsValue)     — sees a value that JSON.parse ALREADY collapsed.
 *                                One duplicate already silently won. No amount of
 *                                inspection can recover which, so it reports the
 *                                lower assurance instead of implying a check it
 *                                cannot perform.
 *
 * This file is the first one. It is a hand-written recursive-descent parser
 * rather than a call to `JSON.parse`, for three reasons:
 *
 *   1. `JSON.parse` silently accepts `{"a":1,"a":2}` and gives you `{a: 2}`.
 *      Which value won is not something a scientific record should shrug at.
 *   2. Limits must bite BEFORE materialization. Handing 32 MiB of nested arrays
 *      to `JSON.parse` and checking the size afterwards is checking too late.
 *   3. Objects are built with a null prototype, so `__proto__` cannot become a
 *      prototype write no matter what the input says.
 */

/** A value inside the JSON domain, with objects null-prototyped. */
type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
interface JsonObject {
    [key: string]: JsonValue;
}
interface ParseOptions {
    readonly limits: BudgetLimits;
    /** Reject a leading UTF-8 BOM. Identical in TypeScript and Python. */
    readonly allowBom?: boolean;
}
/**
 * Parse raw JSON text strictly.
 *
 * This is the ONLY entry point that can certify duplicate-member rejection, which
 * is why `cortexel validate file.json` uses it and why the resulting artifact
 * records `duplicateKeys: "rejected_before_materialization"`.
 */
declare function parseJsonStrict(text: string, options: ParseOptions): Result<JsonValue>;

export { type BudgetLimits as B, type Disclosure as D, type JsonValue as J, type ResolvedBudgetProfile as R, DEFAULT_PROFILE as a, type DisclosureFacts as b, trySelectTighterBudgetProfile as c, deriveDisclosures as d, getBudgetLimits as g, parseJsonStrict as p, restrictLimits as r, tryGetBudgetLimits as t };
