/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/registries/.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */
declare const ERROR_CODES: readonly ["ADAPTER_ACCESSOR_INPUT_REJECTED", "ADAPTER_MAPPING_REQUIRED", "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", "ADAPTER_NEST_UNSUPPORTED_SHAPE", "ADAPTER_UNSUPPORTED_VERSION", "CAPABILITY_EXPERIMENTAL", "CAPABILITY_REMOVED", "CONTRACT_DIGEST_MISMATCH", "CONTRACT_MISSING", "CONTRACT_SKILL_REVISION_UNSUPPORTED", "CONTRACT_UNSUPPORTED_VERSION", "DATA_BYTE_LENGTH_MISMATCH", "DATA_DIGEST_MISMATCH", "DATA_MEDIA_TYPE_UNSUPPORTED", "DATA_REFERENCE_UNRESOLVED", "ERROR_LIMIT_REACHED", "INTERNAL_INVARIANT_VIOLATED", "JSON_ARRAY_TOO_LONG", "JSON_BOM_NOT_ALLOWED", "JSON_BYTES_EXCEEDED", "JSON_COMMENT_NOT_ALLOWED", "JSON_DANGEROUS_KEY", "JSON_DEPTH_EXCEEDED", "JSON_DUPLICATE_KEY", "JSON_EMPTY_INPUT", "JSON_INTEGER_OUT_OF_RANGE", "JSON_INVALID_NUMBER", "JSON_INVALID_UNICODE", "JSON_NON_FINITE_NUMBER", "JSON_NUMBER_TOKEN_TOO_LONG", "JSON_STRING_TOO_LONG", "JSON_SYNTAX", "JSON_TOKENS_EXCEEDED", "JSON_TOO_MANY_KEYS", "JSON_TRAILING_COMMA_NOT_ALLOWED", "JSON_TRAILING_DATA", "MIGRATION_AMBIGUOUS", "MIGRATION_AMBIGUOUS_CONNECTIVITY_MATRIX", "MIGRATION_INFORMATION_MISSING", "MIGRATION_LEGACY_ID_NOT_ACCEPTED", "MIGRATION_NO_STABLE_REPLACEMENT", "MIGRATION_UNKNOWN_LEGACY_ID", "PROVENANCE_ATTESTATION_UNVERIFIED", "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN", "PROVENANCE_NOTE_TOO_LONG", "PROVENANCE_NOTE_UNSAFE_DISPLAY", "PROVENANCE_SOURCE_CLOCK_INCONSISTENT", "PROVENANCE_SOURCE_REQUIRED", "RENDER_DEGENERATE_DOMAIN", "RENDER_DIVERGING_SCALE_NO_CENTER", "RENDER_LAYOUT_UNAVAILABLE", "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN", "RENDER_NO_DATA", "RENDER_SERIES_LIMIT_EXCEEDED", "RENDER_THEME_NONCONFORMING", "RENDER_UNSUPPORTED_SKILL", "RENDER_UNVALIDATED_REQUEST", "RESOURCE_BUDGET_EXCEEDED", "RESOURCE_BUDGET_PROFILE_UNKNOWN", "RESOURCE_COMPACTION_UNAVAILABLE", "RESOURCE_MARKS_EXCEEDED", "RESOURCE_MATRIX_CELLS_EXCEEDED", "RESOURCE_OBSERVATIONS_EXCEEDED", "RESOURCE_OUTPUT_BYTES_EXCEEDED", "RESOURCE_PAIRWISE_EXCEEDED", "RESOURCE_SIDECAR_BYTES_EXCEEDED", "SCHEMA_ENUM_MISMATCH", "SCHEMA_REQUIRED_PROPERTY_MISSING", "SCHEMA_TYPE_MISMATCH", "SCHEMA_UNKNOWN_PROPERTY", "SCHEMA_UNKNOWN_SKILL", "SCHEMA_VALIDATION_FAILED", "SCIENCE_AGGREGATION_REQUIRED", "SCIENCE_BIN_EDGES_INVALID", "SCIENCE_CORRELATION_DENOMINATOR_INVALID", "SCIENCE_COUNT_ESTIMATOR_INCOHERENT", "SCIENCE_COUNT_NOT_INTEGER", "SCIENCE_DELAY_NONPOSITIVE", "SCIENCE_DENOMINATOR_INVALID", "SCIENCE_DENSITY_DOES_NOT_INTEGRATE", "SCIENCE_DUPLICATE_TIME_POLICY", "SCIENCE_EVENT_OUT_OF_WINDOW", "SCIENCE_EVENT_SCOPE_UNVERIFIABLE", "SCIENCE_LAG_RANGE_INVALID", "SCIENCE_LATENCY_OUTSIDE_WINDOW", "SCIENCE_NEGATIVE_INTERVAL", "SCIENCE_NORMALIZATION_UNVERIFIABLE", "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "SCIENCE_PAIRED_REPEATS_INCOMPLETE", "SCIENCE_POPULATION_UNIVERSE_REQUIRED", "SCIENCE_RESPONSE_INPUT_DUPLICATE", "SCIENCE_RESPONSE_METHOD_MISMATCH", "SCIENCE_RESPONSE_VALUE_INVALID", "SCIENCE_TRIAL_UNIVERSE_REQUIRED", "SCIENCE_UNCERTAINTY_BOUNDS_INVALID", "SCIENCE_UNCERTAINTY_LEVEL_INVALID", "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA", "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "SCIENCE_UNIT_ALIAS_NOT_CANONICAL", "SCIENCE_UNIT_DIMENSION_MISMATCH", "SCIENCE_UNIT_NOT_CONVERTIBLE", "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE", "SCIENCE_WINDOW_INVALID", "SCIENCE_ZERO_INTERVAL_POLICY", "SCOPE_INCOMPATIBLE_WITH_SKILL", "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL", "SCOPE_MERGE_CONFLICT", "SCOPE_MERGE_INCOMPLETE", "SCOPE_NODE_UNIVERSE_REQUIRED", "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL", "SCOPE_POSITION_COVERAGE_INCOMPLETE", "SCOPE_REQUIRED", "SEMANTIC_DUPLICATE_ID", "SEMANTIC_EMPTY_SELECTION", "SEMANTIC_LENGTH_MISMATCH", "SEMANTIC_UNKNOWN_REFERENCE", "SEMANTIC_VALIDATOR_UNAVAILABLE", "SNAPSHOT_ACCESSOR_PROPERTY", "SNAPSHOT_CIRCULAR_REFERENCE", "SNAPSHOT_DANGEROUS_KEY", "SNAPSHOT_DECORATED_ARRAY", "SNAPSHOT_DEPTH_EXCEEDED", "SNAPSHOT_HOSTILE_REFLECTION", "SNAPSHOT_INTEGER_OUT_OF_RANGE", "SNAPSHOT_MALFORMED_STRING", "SNAPSHOT_NODES_EXCEEDED", "SNAPSHOT_NON_FINITE_NUMBER", "SNAPSHOT_NON_PLAIN_OBJECT", "SNAPSHOT_SPARSE_ARRAY", "SNAPSHOT_STRING_TOO_LONG", "SNAPSHOT_SYMBOL_KEY", "SNAPSHOT_UNSUPPORTED_TYPE"];
type ErrorCode = (typeof ERROR_CODES)[number];
declare const ERROR_STAGES: readonly ["parse", "snapshot", "identity", "structural", "semantic", "science", "scope", "provenance", "budget", "derivation", "render", "serialize", "migrate", "adapter", "internal"];
type ErrorStage = (typeof ERROR_STAGES)[number];
declare const ERROR_CODE_META: Readonly<Record<ErrorCode, {
    readonly stage: ErrorStage;
    readonly severity: 'error' | 'warning';
    readonly summary: string;
    readonly correctiveAction: string;
}>>;
declare const UNIT_CODES: readonly ["/1", "/A", "/S", "/V", "/m", "/mV", "/mm", "/ms", "/nA", "/nS", "/pA", "/s", "/um", "1", "A", "Hz", "S", "V", "deg", "kHz", "m", "mV", "mm", "mmol/L", "mol/L", "ms", "nA", "nS", "nest:delay", "nest:weight", "nmol/L", "pA", "pS", "rad", "s", "uV", "um", "umol/L", "us"];
type UnitCode = (typeof UNIT_CODES)[number];
declare const QUANTITY_KINDS: readonly ["angle", "concentration", "conductance", "correlation", "count", "current", "degree", "delay", "derivative", "duration", "firing_rate", "frequency", "interspike_interval", "length", "membrane_voltage", "position", "probability", "probability_density", "ratio", "state_variable", "synaptic_weight", "time", "voltage"];
type QuantityKind = (typeof QUANTITY_KINDS)[number];
declare const UNCERTAINTY_KINDS: readonly ["confidence_interval", "credible_interval", "ensemble_range", "none", "quantile_interval", "standard_deviation", "standard_error"];
type UncertaintyKind = (typeof UNCERTAINTY_KINDS)[number];
interface UnitRecord {
    readonly code: string;
    readonly dimension: string;
    readonly toCanonical: number | null;
    /** Exact decimal exponent when the registry scale is a power of ten. */
    readonly toCanonicalDecimalExponent: number | null;
    readonly label: string;
    readonly aliases: readonly string[];
}
declare const UNITS: Readonly<Record<string, UnitRecord>>;
declare const DISCLOSURE_RULES: readonly {
    readonly id: string;
    readonly severity: 'critical' | 'important' | 'informational';
    readonly text: string;
}[];
type DisclosureId = (typeof DISCLOSURE_RULES)[number]['id'];
declare const SEMANTIC_VALIDATOR_IDS: readonly ["bins.strictly_increasing", "compartment_trace.series_identity_declared", "correlogram.event_trains_valid", "correlogram.lag_range_valid", "correlogram.prebinned_axis_consistent", "correlogram.roles_disjoint", "correlogram.statistic_denominator", "degree.counting_policy_declared", "events.sender_universe_declared", "events.source_clock_declared", "events.trial_universe_declared", "events.within_window", "histogram.normalization_consistent", "ids.unique", "isi.within_train_only", "isi.zero_interval_policy", "phase_plane.derivative_dimension", "provenance.no_caller_assurance", "provenance.note_safe_display", "psth.alignment_declared", "rate.denominator_positive", "rate.verify_normalization", "response_curve.estimator_declared", "series.equal_length", "spatial.equal_axis_units", "spatial.position_coverage_complete", "topology.delay_positive", "topology.edge_endpoints_in_universe", "topology.matrix_contract", "topology.multapse_aggregation_declared", "topology.node_universe_declared", "topology.scope_declared", "topology.scope_supports_claim", "topology.weight_group_compatible", "trace.axis_dimension_compatible", "trace.duplicate_time_policy", "uncertainty.supported_variant", "uncertainty.valid", "unit.canonical_code", "unit.dimension_match", "weight_trace.observation_kind_declared", "window.valid"];
type SemanticValidatorId = (typeof SEMANTIC_VALIDATOR_IDS)[number];
/** Immutable identity algorithms, each bound to the digest of its normative registry entry. */
declare const CANONICALIZATION_ALGORITHMS: {
    readonly cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1: {
        readonly id: "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1";
        readonly revision: 1;
        readonly status: "stable";
        readonly input: {
            readonly container: "nonempty_array";
            readonly itemType: "string";
            readonly rejectEmptyItems: true;
            readonly rejectDuplicates: true;
            readonly unicodeDomain: "well_formed_unicode";
        };
        readonly equality: {
            readonly stringEquality: "exact_unicode_sequence";
            readonly unicodeNormalization: "none";
        };
        readonly sort: {
            readonly order: "utf16_code_unit_lexicographic_ascending";
            readonly locale: "none";
        };
        readonly serialization: {
            readonly scheme: "rfc8785";
            readonly value: "sorted_identifier_array";
        };
        readonly encoding: "utf-8";
        readonly digest: "sha256";
        readonly output: "sha256_colon_64_lowercase_hex";
        readonly operations: readonly ["validate_nonempty_array", "validate_nonempty_unique_well_formed_strings", "sort_utf16_code_units_ascending", "serialize_rfc8785", "encode_utf8", "digest_sha256", "prefix_sha256_colon_lowercase_hex"];
        readonly conformanceVectors: readonly [{
            readonly name: "single_identifier";
            readonly outcome: "accept";
            readonly inputEncoding: "unicode_strings";
            readonly input: readonly ["cell-1"];
            readonly normalizedInput: readonly ["cell-1"];
            readonly canonicalJson: "[\"cell-1\"]";
            readonly digest: "sha256:67195d72e6a26feedd72d3a9eda3627d4f12f1ba1f0cafd1ff8aa2347f791faf";
        }, {
            readonly name: "permutation_and_numeric_suffixes";
            readonly outcome: "accept";
            readonly inputEncoding: "unicode_strings";
            readonly input: readonly ["n7", "n2", "n6", "n1", "n5", "n3", "n4"];
            readonly normalizedInput: readonly ["n1", "n2", "n3", "n4", "n5", "n6", "n7"];
            readonly canonicalJson: "[\"n1\",\"n2\",\"n3\",\"n4\",\"n5\",\"n6\",\"n7\"]";
            readonly digest: "sha256:fdb6b814de98ab8daa241acb8895573a50c4ff7e6864cef64c80b023054b29ce";
        }, {
            readonly name: "utf16_astral_before_high_bmp";
            readonly outcome: "accept";
            readonly inputEncoding: "unicode_strings";
            readonly input: readonly ["", "𐀀"];
            readonly normalizedInput: readonly ["𐀀", ""];
            readonly canonicalJson: "[\"𐀀\",\"\"]";
            readonly digest: "sha256:e8bdee294d4a756532cd1660a49d7d99325bb04ec58c236f78b94ff2718d31de";
        }, {
            readonly name: "no_unicode_normalization";
            readonly outcome: "accept";
            readonly inputEncoding: "unicode_strings";
            readonly input: readonly ["é", "é"];
            readonly normalizedInput: readonly ["é", "é"];
            readonly canonicalJson: "[\"é\",\"é\"]";
            readonly digest: "sha256:d056a09c651dab55ceb8f30b349ec21de471bdf5ce4a94db7f29dc9594f54ec3";
        }, {
            readonly name: "json_string_escaping";
            readonly outcome: "accept";
            readonly inputEncoding: "unicode_strings";
            readonly input: readonly ["quote\"", "slash\\", "line\n"];
            readonly normalizedInput: readonly ["line\n", "quote\"", "slash\\"];
            readonly canonicalJson: "[\"line\\n\",\"quote\\\"\",\"slash\\\\\"]";
            readonly digest: "sha256:2926b92f9ea190405919eac2fa2c0a0d8b7d01bbc15252eff56686969778d0be";
        }, {
            readonly name: "empty_array_rejected";
            readonly outcome: "reject";
            readonly inputEncoding: "unicode_strings";
            readonly input: readonly [];
            readonly failureClass: "empty_set";
        }, {
            readonly name: "non_array_rejected";
            readonly outcome: "reject";
            readonly inputEncoding: "json_value";
            readonly input: "cell-1";
            readonly failureClass: "not_array";
        }, {
            readonly name: "non_string_identifier_rejected";
            readonly outcome: "reject";
            readonly inputEncoding: "json_value";
            readonly input: readonly ["cell-1", 1];
            readonly failureClass: "non_string_identifier";
        }, {
            readonly name: "empty_identifier_rejected";
            readonly outcome: "reject";
            readonly inputEncoding: "unicode_strings";
            readonly input: readonly [""];
            readonly failureClass: "empty_identifier";
        }, {
            readonly name: "duplicate_identifier_rejected";
            readonly outcome: "reject";
            readonly inputEncoding: "unicode_strings";
            readonly input: readonly ["n1", "n1"];
            readonly failureClass: "duplicate_identifier";
        }, {
            readonly name: "lone_high_surrogate_rejected";
            readonly outcome: "reject";
            readonly inputEncoding: "utf16_code_units";
            readonly inputCodeUnits: readonly [readonly [55296]];
            readonly failureClass: "ill_formed_unicode";
        }];
        readonly failureClasses: readonly ["not_array", "empty_set", "non_string_identifier", "empty_identifier", "duplicate_identifier", "ill_formed_unicode"];
        readonly entryDigest: "sha256:15a260f6a08e48e8240f28c9ab91d07354fcaaa336914d59128e8df63fca3417";
    };
};
declare const CANONICALIZATION_IDS: readonly ["cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1"];
type CanonicalizationId = (typeof CANONICALIZATION_IDS)[number];

/**
 * The stable diagnostic protocol.
 *
 * Diagnostics are part of the untrusted-input boundary, not a reporting
 * convenience. A validation failure must not become an amplification vector: a
 * caller who sends one hostile string should not be able to get it echoed into
 * logs, agent context, a repair prompt, and the DOM. Two rules follow, and both
 * are enforced here rather than left to each call site.
 *
 *   1. `actualSummary` is a bounded CATEGORY, never the value. Rendering an
 *      untrusted value into a message would invoke its `toString` / `valueOf` /
 *      `Symbol.toPrimitive` hook — i.e. run attacker code while handling an error.
 *
 *   2. A repair is DATA — `{operation, path, value?, reasonCode}` — never
 *      instruction-shaped prose. A downstream language model reads diagnostics;
 *      free text there is an injection surface.
 */

type Severity = 'error' | 'warning';
interface RepairOperation {
    readonly operation: 'replace' | 'remove' | 'add' | 'migrate';
    readonly path: string;
    readonly value?: unknown;
    readonly reasonCode: string;
}
interface CortexelError {
    readonly code: ErrorCode;
    readonly severity: Severity;
    readonly stage: ErrorStage;
    /** RFC 6901 JSON Pointer. The empty string is the root. */
    readonly instancePath: string;
    readonly schemaPath?: string;
    readonly skillId?: string;
    readonly validatorId?: string;
    readonly message: string;
    readonly limit?: {
        readonly name: string;
        readonly limit: number;
        readonly observed?: number;
    };
    readonly actualSummary?: string;
    readonly repair?: RepairOperation;
    readonly omittedCount?: number;
}
/** True when the text is free of unsafe display characters. */
declare function isSafeDisplayString(value: string): boolean;
/** Make text safe to place in a log, a DOM node, or an agent's context window. */
declare function safeText(value: string, max: number): string;
/** Build an RFC 6901 pointer from path segments. The root is the empty string. */
declare function pointer(...segments: readonly (string | number)[]): string;
interface ErrorInit {
    code: ErrorCode;
    severity?: Severity;
    stage: ErrorStage;
    instancePath?: string;
    schemaPath?: string;
    skillId?: string;
    validatorId?: string;
    message: string;
    limit?: {
        name: string;
        limit: number;
        observed?: number;
    };
    actual?: unknown;
    repair?: RepairOperation;
}
/** Construct a bounded, display-safe diagnostic. This is the only way to make one. */
declare function makeError(init: ErrorInit): CortexelError;
/**
 * Sort and cap. When the cap bites, a final ERROR_LIMIT_REACHED record states how
 * many were suppressed — a hidden failure is worse than a reported one.
 */
declare function finalizeErrors(errors: readonly CortexelError[]): CortexelError[];
/** The result of any stage that can fail. */
type Result<T> = {
    readonly ok: true;
    readonly value: T;
    readonly warnings: readonly CortexelError[];
} | {
    readonly ok: false;
    readonly errors: readonly CortexelError[];
};

export { type CortexelError as C, type DisclosureId as D, ERROR_CODES as E, QUANTITY_KINDS as Q, type Result as R, type SemanticValidatorId as S, type UncertaintyKind as U, CANONICALIZATION_ALGORITHMS as a, CANONICALIZATION_IDS as b, type CanonicalizationId as c, DISCLOSURE_RULES as d, ERROR_CODE_META as e, type ErrorCode as f, type ErrorStage as g, type QuantityKind as h, type RepairOperation as i, type Severity as j, UNITS as k, UNIT_CODES as l, type UnitCode as m, finalizeErrors as n, isSafeDisplayString as o, makeError as p, pointer as q, safeText as s };
