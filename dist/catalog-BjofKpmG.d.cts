import { R as Result, S as SemanticValidatorId, D as DisclosureId, U as UncertaintyKind } from './errors-DUbFUu6n.cjs';

/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/registries/budget-profiles.v1.json.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */
declare const BUDGET_PROFILE_IDS: readonly ["standard", "agent"];
type BudgetProfileId = (typeof BUDGET_PROFILE_IDS)[number];

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
interface AdapterSourceEntry {
    /** Stable mapping role/profile identity; not a runtime instance id. */
    readonly sourceId: string;
    /** Provider/profile class; may repeat across role-distinct sourceIds. */
    readonly system: string;
    readonly role: 'primary' | 'required_companion' | 'optional_companion';
    readonly notes: string;
}
interface AdapterCatalogEntry {
    readonly mappingId: string;
    readonly sources: readonly AdapterSourceEntry[];
    /** Bounded feasibility assessment; never an implementation or certification claim. */
    readonly feasibilityStatus: 'assessed_feasible' | 'assessed_infeasible' | 'not_assessed';
    /** V1 has no closed normative mapping-definition authority. */
    readonly definitionStatus: 'not_specified' | 'not_applicable';
    /** Reserved as null until such an authority exists. */
    readonly authorityRequirements: null;
    /** Executable availability; independent of definitionStatus. */
    readonly implementationAvailability: 'packaged' | 'source_only' | 'not_implemented' | 'not_applicable';
    /**
     * Immutable release-ledger gate definition. Mutable status, evidence, and receipts
     * remain solely in the external ledger. Absent when no implementation exists.
     */
    readonly certificationRequirement?: {
        readonly ledger: 'cortexel-release-evidence-ledger.v1';
        readonly gate: {
            readonly id: string;
            readonly section: string;
            readonly requirement: string;
            readonly releaseBlocking: true;
        };
        readonly conformanceProfile: {
            readonly registry: 'cortexel-adapter-conformance-profiles.v1';
            readonly id: string;
            readonly digestAlgorithm: 'cortexel_adapter_conformance_profile_rfc8785_sha256_v1';
            readonly digest: `sha256:${string}`;
        };
    };
    readonly notes?: string;
}
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
    readonly adapters: readonly AdapterCatalogEntry[];
    readonly legacyIds: readonly string[];
    readonly owner: string;
    readonly knownLimitations: readonly string[];
}
/** Stable skill ids in deterministic lexicographic order. */
declare const STABLE_SKILL_IDS: readonly ["network.adjacency_matrix", "network.connection_graph", "network.degree_distribution", "network.delay_distribution", "network.delay_matrix", "network.spatial_map_2d", "network.synaptic_weight_trace", "network.weight_distribution", "network.weight_matrix", "neuro.analog_trace", "neuro.compartment_trace", "neuro.correlogram", "neuro.isi_distribution", "neuro.multisignal_trace", "neuro.phase_plane", "neuro.population_rate", "neuro.psth", "neuro.response_curve", "neuro.spike_raster"];
type StableSkillId = (typeof STABLE_SKILL_IDS)[number];
declare const SKILL_CATALOG: Readonly<Record<StableSkillId, SkillCatalogEntry>>;
declare function isStableSkillId(value: string): value is StableSkillId;
declare function lookupSkillCatalogEntry(value: string): SkillCatalogEntry | undefined;
declare const EXPERIMENTAL_CAPABILITY_IDS: readonly [];
declare const REMOVED_CAPABILITY_IDS: readonly ["nest.animation_replay", "nest.connectivity_matrix", "nest.spatial_2d", "nest.stimulus_response"];
interface LegacyMapEntry {
    readonly legacyId: string;
    readonly outcome: 'migrate' | 'migrate_conditional' | 'experimental' | 'removed' | 'blocked' | 'recipe';
    readonly targetId: string | null;
    readonly transform: string | null;
    readonly transformExecution?: 'report_only' | 'implemented';
    readonly errorCode?: string;
    readonly notes: string;
    readonly requires?: readonly string[];
    readonly alternatives?: readonly string[];
    readonly materializedParameters?: Readonly<Record<string, unknown>>;
}
/** Every pre-1.0 id has a deterministic outcome here. There is no fall-through. */
declare const LEGACY_SKILL_MAP: Readonly<Record<string, LegacyMapEntry>>;

export { type AdapterCatalogEntry as A, type BudgetProfileId as B, DEFAULT_PROFILE as D, EXPERIMENTAL_CAPABILITY_IDS as E, type JsonValue as J, type LegacyMapEntry as L, REMOVED_CAPABILITY_IDS as R, type StableSkillId as S, SKILL_CATALOG as a, STABLE_SKILL_IDS as b, type SkillCatalogEntry as c, type BudgetLimits as d, LEGACY_SKILL_MAP as e, type ResolvedBudgetProfile as f, getBudgetLimits as g, trySelectTighterBudgetProfile as h, isStableSkillId as i, lookupSkillCatalogEntry as l, parseJsonStrict as p, restrictLimits as r, tryGetBudgetLimits as t };
