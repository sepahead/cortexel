import { m as DisclosureId, w as UncertaintyKind, x as SemanticValidatorId } from "./errors-DLTGhSm-.cjs";
import { t as JsonValue } from "./parse-json-C_C8fdK2.cjs";
//#region src/core/output-authority.d.ts
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
//#endregion
//#region src/generated/catalog.d.ts
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
interface CapabilityCatalogEntry {
  readonly id: string;
  readonly kind: 'skill' | 'export' | 'data_export' | 'contract_source' | 'cli';
  readonly status: 'stable' | 'experimental' | 'deprecated' | 'removed';
  readonly availability: CapabilityAvailability;
  readonly renderer?: string;
  readonly determinismClass?: 'deterministic_svg';
  readonly exportClass?: 'svg+table';
  readonly requiredPeers?: readonly string[];
  readonly owner: string;
  readonly replacement?: string | null;
  readonly removalVersion?: string;
  readonly limitations?: readonly string[];
}
/** Every capability id in deterministic lexicographic order. */
declare const CAPABILITY_IDS: readonly ["cli.catalog", "cli.describe", "cli.identity", "cli.inspect", "cli.migrate", "cli.render", "cli.source", "cli.validate", "cortexel", "cortexel/adapters/nest", "cortexel/authoring", "cortexel/contract", "cortexel/core", "cortexel/figure", "cortexel/knowledge-graph", "cortexel/package.json", "cortexel/react", "cortexel/react/charts", "cortexel/react/knowledge-graph", "cortexel/render-svg", "cortexel/skills.manifest.json", "nest.animation_replay", "nest.connectivity_matrix", "nest.spatial_2d", "nest.stimulus_response", "network.adjacency_matrix", "network.connection_graph", "network.degree_distribution", "network.delay_distribution", "network.delay_matrix", "network.spatial_map_2d", "network.synaptic_weight_trace", "network.weight_distribution", "network.weight_matrix", "neuro.analog_trace", "neuro.compartment_trace", "neuro.correlogram", "neuro.isi_distribution", "neuro.multisignal_trace", "neuro.phase_plane", "neuro.population_rate", "neuro.psth", "neuro.response_curve", "neuro.spike_raster"];
type CapabilityId = (typeof CAPABILITY_IDS)[number];
declare const CAPABILITY_CATALOG: Readonly<Record<CapabilityId, CapabilityCatalogEntry>>;
declare function isCapabilityId(value: unknown): value is CapabilityId;
declare function lookupCapabilityCatalogEntry(value: string): CapabilityCatalogEntry | undefined;
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
//#endregion
export { isStableSkillId as _, CapabilityAvailability as a, EXPERIMENTAL_CAPABILITY_IDS as c, REMOVED_CAPABILITY_IDS as d, SKILL_CATALOG as f, isCapabilityId as g, StableSkillId as h, CAPABILITY_IDS as i, LEGACY_SKILL_MAP as l, SkillCatalogEntry as m, CAPABILITY_AVAILABILITIES as n, CapabilityCatalogEntry as o, STABLE_SKILL_IDS as p, CAPABILITY_CATALOG as r, CapabilityId as s, AdapterCatalogEntry as t, LegacyMapEntry as u, lookupCapabilityCatalogEntry as v, lookupSkillCatalogEntry as y };
