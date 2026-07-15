/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/registries/.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

export const ERROR_CODES = [
  "ADAPTER_ACCESSOR_INPUT_REJECTED",
  "ADAPTER_MAPPING_REQUIRED",
  "ADAPTER_NEST_UNSUPPORTED_SHAPE",
  "ADAPTER_UNSUPPORTED_VERSION",
  "CAPABILITY_EXPERIMENTAL",
  "CAPABILITY_REMOVED",
  "CONTRACT_DIGEST_MISMATCH",
  "CONTRACT_MISSING",
  "CONTRACT_SKILL_REVISION_UNSUPPORTED",
  "CONTRACT_UNSUPPORTED_VERSION",
  "DATA_BYTE_LENGTH_MISMATCH",
  "DATA_DIGEST_MISMATCH",
  "DATA_MEDIA_TYPE_UNSUPPORTED",
  "DATA_REFERENCE_UNRESOLVED",
  "ERROR_LIMIT_REACHED",
  "INTERNAL_INVARIANT_VIOLATED",
  "JSON_ARRAY_TOO_LONG",
  "JSON_BOM_NOT_ALLOWED",
  "JSON_BYTES_EXCEEDED",
  "JSON_COMMENT_NOT_ALLOWED",
  "JSON_DANGEROUS_KEY",
  "JSON_DEPTH_EXCEEDED",
  "JSON_DUPLICATE_KEY",
  "JSON_EMPTY_INPUT",
  "JSON_INVALID_NUMBER",
  "JSON_INVALID_UNICODE",
  "JSON_NON_FINITE_NUMBER",
  "JSON_NUMBER_TOKEN_TOO_LONG",
  "JSON_STRING_TOO_LONG",
  "JSON_SYNTAX",
  "JSON_TOKENS_EXCEEDED",
  "JSON_TOO_MANY_KEYS",
  "JSON_TRAILING_COMMA_NOT_ALLOWED",
  "JSON_TRAILING_DATA",
  "MIGRATION_AMBIGUOUS",
  "MIGRATION_AMBIGUOUS_CONNECTIVITY_MATRIX",
  "MIGRATION_INFORMATION_MISSING",
  "MIGRATION_LEGACY_ID_NOT_ACCEPTED",
  "MIGRATION_NO_STABLE_REPLACEMENT",
  "MIGRATION_UNKNOWN_LEGACY_ID",
  "PROVENANCE_ATTESTATION_UNVERIFIED",
  "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN",
  "PROVENANCE_NOTE_TOO_LONG",
  "PROVENANCE_NOTE_UNSAFE_DISPLAY",
  "PROVENANCE_SOURCE_REQUIRED",
  "RENDER_DEGENERATE_DOMAIN",
  "RENDER_DIVERGING_SCALE_NO_CENTER",
  "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
  "RENDER_NO_DATA",
  "RENDER_SERIES_LIMIT_EXCEEDED",
  "RENDER_THEME_NONCONFORMING",
  "RENDER_UNSUPPORTED_SKILL",
  "RENDER_UNVALIDATED_REQUEST",
  "RESOURCE_BUDGET_EXCEEDED",
  "RESOURCE_COMPACTION_UNAVAILABLE",
  "RESOURCE_MARKS_EXCEEDED",
  "RESOURCE_MATRIX_CELLS_EXCEEDED",
  "RESOURCE_OBSERVATIONS_EXCEEDED",
  "RESOURCE_OUTPUT_BYTES_EXCEEDED",
  "RESOURCE_PAIRWISE_EXCEEDED",
  "RESOURCE_SIDECAR_BYTES_EXCEEDED",
  "SCHEMA_ENUM_MISMATCH",
  "SCHEMA_REQUIRED_PROPERTY_MISSING",
  "SCHEMA_TYPE_MISMATCH",
  "SCHEMA_UNKNOWN_PROPERTY",
  "SCHEMA_UNKNOWN_SKILL",
  "SCHEMA_VALIDATION_FAILED",
  "SCIENCE_AGGREGATION_REQUIRED",
  "SCIENCE_BIN_EDGES_INVALID",
  "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
  "SCIENCE_COUNT_NOT_INTEGER",
  "SCIENCE_DELAY_NONPOSITIVE",
  "SCIENCE_DENOMINATOR_INVALID",
  "SCIENCE_DENSITY_DOES_NOT_INTEGRATE",
  "SCIENCE_DUPLICATE_TIME_POLICY",
  "SCIENCE_EVENT_OUT_OF_WINDOW",
  "SCIENCE_LAG_RANGE_INVALID",
  "SCIENCE_NEGATIVE_INTERVAL",
  "SCIENCE_NORMALIZATION_UNVERIFIABLE",
  "SCIENCE_POPULATION_UNIVERSE_REQUIRED",
  "SCIENCE_TRIAL_UNIVERSE_REQUIRED",
  "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
  "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
  "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
  "SCIENCE_UNIT_ALIAS_NOT_CANONICAL",
  "SCIENCE_UNIT_DIMENSION_MISMATCH",
  "SCIENCE_UNIT_NOT_CONVERTIBLE",
  "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
  "SCIENCE_WINDOW_INVALID",
  "SCIENCE_ZERO_INTERVAL_POLICY",
  "SCOPE_INCOMPATIBLE_WITH_SKILL",
  "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL",
  "SCOPE_MERGE_CONFLICT",
  "SCOPE_MERGE_INCOMPLETE",
  "SCOPE_NODE_UNIVERSE_REQUIRED",
  "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL",
  "SCOPE_POSITION_COVERAGE_INCOMPLETE",
  "SCOPE_REQUIRED",
  "SEMANTIC_DUPLICATE_ID",
  "SEMANTIC_EMPTY_SELECTION",
  "SEMANTIC_LENGTH_MISMATCH",
  "SEMANTIC_UNKNOWN_REFERENCE",
  "SNAPSHOT_ACCESSOR_PROPERTY",
  "SNAPSHOT_CIRCULAR_REFERENCE",
  "SNAPSHOT_DANGEROUS_KEY",
  "SNAPSHOT_DECORATED_ARRAY",
  "SNAPSHOT_DEPTH_EXCEEDED",
  "SNAPSHOT_HOSTILE_REFLECTION",
  "SNAPSHOT_MALFORMED_STRING",
  "SNAPSHOT_NODES_EXCEEDED",
  "SNAPSHOT_NON_FINITE_NUMBER",
  "SNAPSHOT_NON_PLAIN_OBJECT",
  "SNAPSHOT_SPARSE_ARRAY",
  "SNAPSHOT_SYMBOL_KEY",
  "SNAPSHOT_UNSUPPORTED_TYPE"
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_STAGES = [
  "parse",
  "snapshot",
  "identity",
  "structural",
  "semantic",
  "science",
  "scope",
  "provenance",
  "budget",
  "derivation",
  "render",
  "serialize",
  "migrate",
  "adapter",
  "internal"
] as const;
export type ErrorStage = (typeof ERROR_STAGES)[number];

export const ERROR_CODE_META: Readonly<Record<ErrorCode, { readonly stage: ErrorStage; readonly severity: 'error' | 'warning'; readonly summary: string; readonly correctiveAction: string }>> = Object.freeze({
  "JSON_EMPTY_INPUT": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input contained no JSON value.",
    "correctiveAction": "Send a single complete JSON document."
  },
  "JSON_SYNTAX": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input is not well-formed JSON.",
    "correctiveAction": "Fix the reported syntax position. Cortexel never accepts a fault-tolerant parse."
  },
  "JSON_DUPLICATE_KEY": {
    "stage": "parse",
    "severity": "error",
    "summary": "An object contained the same member name twice.",
    "correctiveAction": "Remove the duplicate member. Which value would have won is undefined, so the document is rejected rather than silently resolved. This check is only possible on raw JSON text; it cannot be performed on an already-materialized JavaScript value."
  },
  "JSON_TRAILING_DATA": {
    "stage": "parse",
    "severity": "error",
    "summary": "Content followed the top-level JSON value.",
    "correctiveAction": "Send exactly one top-level value."
  },
  "JSON_INVALID_NUMBER": {
    "stage": "parse",
    "severity": "error",
    "summary": "A numeric token is not a valid JSON number.",
    "correctiveAction": "Use JSON number grammar. NaN, Infinity, hex, and leading '+' are not JSON."
  },
  "JSON_NON_FINITE_NUMBER": {
    "stage": "parse",
    "severity": "error",
    "summary": "A number is outside the finite binary64 model.",
    "correctiveAction": "Cortexel accepts only finite binary64 values. Represent a missing observation as null, not as a non-finite number."
  },
  "JSON_INVALID_UNICODE": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input contained a malformed or lone-surrogate escape sequence.",
    "correctiveAction": "Emit well-formed UTF-8 with paired surrogates."
  },
  "JSON_BOM_NOT_ALLOWED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input began with a byte-order mark.",
    "correctiveAction": "Strip the BOM. The parser profile rejects it in both TypeScript and Python."
  },
  "JSON_COMMENT_NOT_ALLOWED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input contained a comment.",
    "correctiveAction": "Comments are not JSON. Remove them."
  },
  "JSON_TRAILING_COMMA_NOT_ALLOWED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input contained a trailing comma.",
    "correctiveAction": "Trailing commas are not JSON. Remove them."
  },
  "JSON_DEPTH_EXCEEDED": {
    "stage": "parse",
    "severity": "error",
    "summary": "Nesting depth exceeded the parser limit.",
    "correctiveAction": "Flatten the document. The limit is enforced during scanning, before any parse tree is allocated."
  },
  "JSON_BYTES_EXCEEDED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The raw input exceeded the byte limit for the active budget profile.",
    "correctiveAction": "Reduce the payload, or reference bulk arrays with a DataRef instead of inlining them."
  },
  "JSON_TOKENS_EXCEEDED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input exceeded the total token limit.",
    "correctiveAction": "Reduce the document size or use data references."
  },
  "JSON_STRING_TOO_LONG": {
    "stage": "parse",
    "severity": "error",
    "summary": "A single string exceeded the maximum string length.",
    "correctiveAction": "Shorten the string. Labels and notes have explicit bounded lengths."
  },
  "JSON_NUMBER_TOKEN_TOO_LONG": {
    "stage": "parse",
    "severity": "error",
    "summary": "A numeric token was longer than any meaningful binary64 literal.",
    "correctiveAction": "Emit an ordinary binary64 literal. A very long digit string cannot add precision."
  },
  "JSON_ARRAY_TOO_LONG": {
    "stage": "parse",
    "severity": "error",
    "summary": "An array exceeded the maximum member count.",
    "correctiveAction": "Reduce the array or use a data reference."
  },
  "JSON_TOO_MANY_KEYS": {
    "stage": "parse",
    "severity": "error",
    "summary": "An object exceeded the maximum member count.",
    "correctiveAction": "Reduce the object's members."
  },
  "JSON_DANGEROUS_KEY": {
    "stage": "parse",
    "severity": "error",
    "summary": "An object used a prototype-polluting member name.",
    "correctiveAction": "Remove members named __proto__, constructor, or prototype."
  },
  "SNAPSHOT_ACCESSOR_PROPERTY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A property is defined by a getter or setter.",
    "correctiveAction": "Pass plain data. Cortexel inspects property descriptors and will not invoke a caller accessor to discover a value."
  },
  "SNAPSHOT_SYMBOL_KEY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "An object carried a symbol-keyed property.",
    "correctiveAction": "Pass a JSON-compatible object."
  },
  "SNAPSHOT_NON_PLAIN_OBJECT": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A value was a class instance, Map, Set, Date, Promise, Proxy, or other non-plain object.",
    "correctiveAction": "Convert to a plain object or array before validating. Cortexel does not call toJSON, valueOf, or Symbol.toPrimitive on untrusted values."
  },
  "SNAPSHOT_SPARSE_ARRAY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "An array had holes.",
    "correctiveAction": "Use a dense array. Represent a missing observation as an explicit null."
  },
  "SNAPSHOT_DECORATED_ARRAY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "An array carried named (non-index) own properties.",
    "correctiveAction": "Pass a plain dense array with index properties only."
  },
  "SNAPSHOT_CIRCULAR_REFERENCE": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "The value graph contained a cycle.",
    "correctiveAction": "Send an acyclic JSON-compatible value."
  },
  "SNAPSHOT_UNSUPPORTED_TYPE": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A value was a function, symbol, bigint, or undefined.",
    "correctiveAction": "Use only JSON types: null, boolean, finite number, string, array, plain object."
  },
  "SNAPSHOT_NON_FINITE_NUMBER": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A number was NaN or infinite.",
    "correctiveAction": "Use null for a missing observation. A non-finite value is never a measurement."
  },
  "SNAPSHOT_DANGEROUS_KEY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "An object used a prototype-polluting key.",
    "correctiveAction": "Remove keys named __proto__, constructor, or prototype."
  },
  "SNAPSHOT_HOSTILE_REFLECTION": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "Reflecting on the value threw. The value is treated as hostile and is not inspected again.",
    "correctiveAction": "Pass a plain value. A Proxy whose traps throw cannot be safely snapshotted."
  },
  "SNAPSHOT_DEPTH_EXCEEDED": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "Value nesting exceeded the snapshot depth limit.",
    "correctiveAction": "Flatten the value."
  },
  "SNAPSHOT_NODES_EXCEEDED": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "The value graph exceeded the total node limit.",
    "correctiveAction": "Reduce the value or use a data reference."
  },
  "SNAPSHOT_MALFORMED_STRING": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A string was not well-formed Unicode (it contained a lone surrogate).",
    "correctiveAction": "Pass well-formed Unicode strings."
  },
  "CONTRACT_MISSING": {
    "stage": "identity",
    "severity": "error",
    "summary": "The request did not declare its contract.",
    "correctiveAction": "Add {\"contract\":{\"name\":\"cortexel-figure-request\",\"version\":\"1.0\"}}."
  },
  "CONTRACT_UNSUPPORTED_VERSION": {
    "stage": "identity",
    "severity": "error",
    "summary": "The declared request-contract version is not supported by this build.",
    "correctiveAction": "Use a supported version, or run `cortexel migrate`. Compare with `cortexel identity --json`."
  },
  "CONTRACT_DIGEST_MISMATCH": {
    "stage": "identity",
    "severity": "error",
    "summary": "The caller supplied a contractDigest that does not match this build's contract digest.",
    "correctiveAction": "Omit contractDigest, or pin the exact Cortexel build whose digest you recorded. A mismatch means the contract you validated against is not the contract in use."
  },
  "CONTRACT_SKILL_REVISION_UNSUPPORTED": {
    "stage": "identity",
    "severity": "error",
    "summary": "The requested skill revision is not supported by this build.",
    "correctiveAction": "Omit `skill.revision` to accept the installed revision, or install the build that provides it."
  },
  "SCHEMA_VALIDATION_FAILED": {
    "stage": "structural",
    "severity": "error",
    "summary": "The request failed structural schema validation.",
    "correctiveAction": "Correct the value at the reported instancePath. The schemaPath identifies the exact failing keyword."
  },
  "SCHEMA_UNKNOWN_PROPERTY": {
    "stage": "structural",
    "severity": "error",
    "summary": "An object contained a property the contract does not define.",
    "correctiveAction": "Remove the property. Stable schemas are closed: a typo in a scientific field must fail rather than be silently ignored."
  },
  "SCHEMA_REQUIRED_PROPERTY_MISSING": {
    "stage": "structural",
    "severity": "error",
    "summary": "A required property is absent.",
    "correctiveAction": "Supply the property. Cortexel will not infer a scientific fact that the source did not state."
  },
  "SCHEMA_TYPE_MISMATCH": {
    "stage": "structural",
    "severity": "error",
    "summary": "A value had the wrong type.",
    "correctiveAction": "Use the declared type. Cortexel performs no type coercion."
  },
  "SCHEMA_ENUM_MISMATCH": {
    "stage": "structural",
    "severity": "error",
    "summary": "A value was outside a closed enumeration.",
    "correctiveAction": "Use one of the enumerated values listed in the schema."
  },
  "SCHEMA_UNKNOWN_SKILL": {
    "stage": "structural",
    "severity": "error",
    "summary": "The requested skill id is not in the stable catalog.",
    "correctiveAction": "Call `cortexel catalog` for the stable ids. A legacy or experimental id is not accepted here."
  },
  "SEMANTIC_LENGTH_MISMATCH": {
    "stage": "semantic",
    "severity": "error",
    "summary": "Parallel arrays that must have equal length do not.",
    "correctiveAction": "Ensure the parallel arrays have identical lengths. Cortexel never pairs values with times by best effort."
  },
  "SEMANTIC_DUPLICATE_ID": {
    "stage": "semantic",
    "severity": "error",
    "summary": "A declared identifier appeared more than once where identity must be unique.",
    "correctiveAction": "Make the ids unique. An ambiguous identity must fail before it can diverge selection, binding, or search."
  },
  "SEMANTIC_UNKNOWN_REFERENCE": {
    "stage": "semantic",
    "severity": "error",
    "summary": "A row referenced an id that is not in the declared universe.",
    "correctiveAction": "Add the id to the declared universe, or remove the row. Cortexel will not silently extend a universe you declared."
  },
  "SEMANTIC_EMPTY_SELECTION": {
    "stage": "semantic",
    "severity": "error",
    "summary": "A required selection was empty.",
    "correctiveAction": "Select at least one member."
  },
  "SCIENCE_UNIT_DIMENSION_MISMATCH": {
    "stage": "science",
    "severity": "error",
    "summary": "A quantity's unit dimension does not match its declared kind, or two combined quantities have incompatible dimensions.",
    "correctiveAction": "Use a unit whose dimension matches the quantity kind. Cortexel will not place a concentration and a voltage on one numeric axis because their arrays happen to be the same length."
  },
  "SCIENCE_UNIT_ALIAS_NOT_CANONICAL": {
    "stage": "science",
    "severity": "error",
    "summary": "A stable request used an accepted alias rather than the canonical unit code.",
    "correctiveAction": "Use the canonical code from the unit registry. A repair is supplied. Aliases are accepted only by adapters and by `cortexel migrate`, never silently in normal validation."
  },
  "SCIENCE_UNIT_NOT_CONVERTIBLE": {
    "stage": "science",
    "severity": "error",
    "summary": "A conversion was required between units that cannot be converted.",
    "correctiveAction": "Simulator-defined units (such as a NEST weight) have no SI mapping and are never converted or pooled."
  },
  "SCIENCE_BIN_EDGES_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "Histogram bin edges are not strictly increasing, or are not finite.",
    "correctiveAction": "Supply strictly increasing finite edges. n edges define n-1 half-open bins."
  },
  "SCIENCE_WINDOW_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "An analysis window is empty or inverted.",
    "correctiveAction": "Require start < stop. The default convention is the half-open interval [start, stop)."
  },
  "SCIENCE_EVENT_OUT_OF_WINDOW": {
    "stage": "science",
    "severity": "error",
    "summary": "Events fall outside the declared observation window.",
    "correctiveAction": "Widen the window or exclude the events explicitly. The count of excluded events is always recorded; events are never dropped silently."
  },
  "SCIENCE_DENOMINATOR_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "A rate denominator is missing, zero, or negative.",
    "correctiveAction": "Supply a positive recorded-sender count. Cortexel does NOT infer population size from the number of senders that happened to spike — a silent neuron is still a recorded neuron."
  },
  "SCIENCE_POPULATION_UNIVERSE_REQUIRED": {
    "stage": "science",
    "severity": "error",
    "summary": "The figure requires a declared recorded-sender universe and none was supplied.",
    "correctiveAction": "Declare the senders that were recorded. Without it, a mean-per-neuron rate cannot be computed; use a total-event-rate normalization instead."
  },
  "SCIENCE_TRIAL_UNIVERSE_REQUIRED": {
    "stage": "science",
    "severity": "error",
    "summary": "The figure requires a declared trial universe or count and none was supplied.",
    "correctiveAction": "Declare the trials. Cortexel does not infer trial count from the maximum observed trial id: a trial with no events is still a trial."
  },
  "SCIENCE_NEGATIVE_INTERVAL": {
    "stage": "science",
    "severity": "error",
    "summary": "An interval was negative after within-train sorting, which indicates invalid input.",
    "correctiveAction": "Check the event times. After stable sorting within a train, successive differences cannot be negative."
  },
  "SCIENCE_ZERO_INTERVAL_POLICY": {
    "stage": "science",
    "severity": "error",
    "summary": "A zero-length interval was found and the source profile does not permit duplicate same-sender events.",
    "correctiveAction": "Either declare that duplicate same-sender events are permitted, or fix the source data. Zero intervals are never silently removed."
  },
  "SCIENCE_COUNT_NOT_INTEGER": {
    "stage": "science",
    "severity": "error",
    "summary": "A value declared as a count is not a non-negative integer.",
    "correctiveAction": "Counts are exact. Supply integers."
  },
  "SCIENCE_NORMALIZATION_UNVERIFIABLE": {
    "stage": "science",
    "severity": "error",
    "summary": "A supplied normalized value could not be verified against its raw count and denominator.",
    "correctiveAction": "Supply the raw integer count and the denominators, or correct the normalized value. Cortexel re-derives and checks pre-normalized input rather than trusting it."
  },
  "SCIENCE_DENSITY_DOES_NOT_INTEGRATE": {
    "stage": "science",
    "severity": "error",
    "summary": "A density histogram does not integrate to one over its bin widths within tolerance.",
    "correctiveAction": "Re-normalize, or use `count` or `probability` normalization instead."
  },
  "SCIENCE_DELAY_NONPOSITIVE": {
    "stage": "science",
    "severity": "error",
    "summary": "A synaptic delay was zero or negative.",
    "correctiveAction": "Delays must be finite and positive. A zero delay is not physical for the supported source simulators."
  },
  "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE": {
    "stage": "science",
    "severity": "error",
    "summary": "Weights of different declared dimensions or synapse models were combined.",
    "correctiveAction": "Group weights by synapse model or declared dimension. Two numbers are not comparable merely because both are called 'weight'."
  },
  "SCIENCE_AGGREGATION_REQUIRED": {
    "stage": "science",
    "severity": "error",
    "summary": "Multiple connections map to one cell and no multapse aggregation was declared.",
    "correctiveAction": "Declare an aggregation (sum, mean, min, max, or no_aggregation). 'Last edge wins' is never applied."
  },
  "SCIENCE_DUPLICATE_TIME_POLICY": {
    "stage": "science",
    "severity": "error",
    "summary": "A series contained duplicate timestamps and no duplicate-time policy was declared.",
    "correctiveAction": "Declare reject, keep_replicates, or an explicit aggregate with a method. Last-write-wins is never applied."
  },
  "SCIENCE_LAG_RANGE_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "The correlogram lag range or bin width is invalid.",
    "correctiveAction": "Supply a finite lag range and a positive bin width that tiles it."
  },
  "SCIENCE_CORRELATION_DENOMINATOR_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "A correlation coefficient was requested but its required statistics or a valid variance denominator are absent.",
    "correctiveAction": "Supply the required statistics, or use `raw_count` or an explicitly named rate normalization. A scaled pair count is not a correlation coefficient."
  },
  "SCIENCE_UNCERTAINTY_BOUNDS_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "Uncertainty bounds are not ordered, not finite, or do not bracket the estimate where the method requires it.",
    "correctiveAction": "Supply lower <= estimate <= upper with compatible units and matching keys."
  },
  "SCIENCE_UNCERTAINTY_LEVEL_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "An interval level is outside (0,1), or a required sample count is not positive.",
    "correctiveAction": "Supply a valid level and basis. Cortexel never converts an arbitrary range or a standard deviation into a confidence or credible interval."
  },
  "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL": {
    "stage": "science",
    "severity": "error",
    "summary": "This figure does not support the supplied uncertainty variant.",
    "correctiveAction": "Consult the skill's contract for the supported variants."
  },
  "SCOPE_REQUIRED": {
    "stage": "scope",
    "severity": "error",
    "summary": "A network figure did not declare its scope.",
    "correctiveAction": "Declare a NetworkScopeV1. A connection snapshot without scope cannot be interpreted."
  },
  "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL": {
    "stage": "scope",
    "severity": "error",
    "summary": "A rank-local or sampled snapshot was used to make a global completeness claim.",
    "correctiveAction": "Merge every rank's snapshot and declare globalMerged, or keep the output labelled as the partial evidence it is."
  },
  "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL": {
    "stage": "scope",
    "severity": "error",
    "summary": "An out-degree distribution was requested from a target-rank-local snapshot.",
    "correctiveAction": "Under NEST's MPI semantics a rank sees the connections whose TARGET it owns. In-degree is therefore computable for the local target universe; global out-degree is not, until every rank's snapshot has been merged."
  },
  "SCOPE_NODE_UNIVERSE_REQUIRED": {
    "stage": "scope",
    "severity": "error",
    "summary": "A figure whose meaning depends on isolates or zero-degree nodes did not declare its node universe.",
    "correctiveAction": "Declare the complete selected node universe. An edge list alone cannot establish that a node has degree zero — it can only establish that no edge was observed."
  },
  "SCOPE_MERGE_INCOMPLETE": {
    "stage": "scope",
    "severity": "error",
    "summary": "A merge claimed global coverage but not every rank was present.",
    "correctiveAction": "Supply every rank's snapshot. A partial rank set remains partial and cannot be upgraded."
  },
  "SCOPE_MERGE_CONFLICT": {
    "stage": "scope",
    "severity": "error",
    "summary": "Snapshots being merged disagree on simulation, snapshot time, world size, or connection identity.",
    "correctiveAction": "Merge only snapshots from the same run, the same snapshot time, and a consistent world size."
  },
  "SCOPE_POSITION_COVERAGE_INCOMPLETE": {
    "stage": "scope",
    "severity": "error",
    "summary": "Declared positions do not cover the selected node universe.",
    "correctiveAction": "Supply a position for every selected node, or reduce the selection. Nodes with missing positions are reported, never placed at the origin."
  },
  "SCOPE_INCOMPATIBLE_WITH_SKILL": {
    "stage": "scope",
    "severity": "error",
    "summary": "The declared scope cannot support this figure's claim.",
    "correctiveAction": "Consult the skill contract's legal scope/result combinations."
  },
  "PROVENANCE_SOURCE_REQUIRED": {
    "stage": "provenance",
    "severity": "error",
    "summary": "The request did not declare its source.",
    "correctiveAction": "Declare `source.kind`. `unknown` is a valid, honest answer and triggers a disclosure; it is better than invented specificity."
  },
  "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN": {
    "stage": "provenance",
    "severity": "error",
    "summary": "The request tried to set a field that only Cortexel may author.",
    "correctiveAction": "Remove it. Validation results, reference-comparison status, accessibility conformance, completeness, output digests, and disclosure text are library-generated facts. A caller declares what its data IS, never what Cortexel concluded about it."
  },
  "PROVENANCE_NOTE_TOO_LONG": {
    "stage": "provenance",
    "severity": "error",
    "summary": "The caller's declared note exceeded its length limit.",
    "correctiveAction": "Shorten the note. It is rendered as an attributed, unverified caller statement and cannot displace a mandatory disclosure."
  },
  "PROVENANCE_NOTE_UNSAFE_DISPLAY": {
    "stage": "provenance",
    "severity": "error",
    "summary": "The caller's declared note contained control, bidi-override, or zero-width characters.",
    "correctiveAction": "Remove them. Such characters can visually spoof an axis label, a caption, or a mandatory disclosure."
  },
  "PROVENANCE_ATTESTATION_UNVERIFIED": {
    "stage": "provenance",
    "severity": "error",
    "summary": "An attestation was supplied whose signature could not be verified.",
    "correctiveAction": "Supply a verifiable attestation. A request may never assert that its own attestation is verified."
  },
  "RESOURCE_BUDGET_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "The request exceeds a hard limit of the active budget profile.",
    "correctiveAction": "Reduce the input. A hard limit protects the process and cannot be raised from untrusted input; it may only be lowered."
  },
  "RESOURCE_OBSERVATIONS_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "A series or the request as a whole exceeds the observation limit.",
    "correctiveAction": "Reduce the data or supply it as a content-addressed DataRef."
  },
  "RESOURCE_PAIRWISE_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "A pairwise computation (such as a correlogram) would exceed its cost bound.",
    "correctiveAction": "Narrow the lag range, reduce the trains, or select a subset. Cortexel refuses quadratic work rather than attempting it."
  },
  "RESOURCE_MATRIX_CELLS_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "The matrix dimensions exceed the cell budget.",
    "correctiveAction": "Reduce the node universes, or reference the data rather than materializing a dense matrix."
  },
  "RESOURCE_MARKS_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "The compiled figure would exceed the visible-mark budget and no compaction policy applies.",
    "correctiveAction": "Enable a compaction policy that is valid for this figure, or reduce the data. Cortexel never silently truncates."
  },
  "RESOURCE_OUTPUT_BYTES_EXCEEDED": {
    "stage": "serialize",
    "severity": "error",
    "summary": "The serialized output would exceed its byte budget.",
    "correctiveAction": "Reduce the figure's complexity."
  },
  "RESOURCE_SIDECAR_BYTES_EXCEEDED": {
    "stage": "serialize",
    "severity": "error",
    "summary": "The data sidecar would exceed its byte budget.",
    "correctiveAction": "Reference the full data by digest instead of embedding it."
  },
  "RESOURCE_COMPACTION_UNAVAILABLE": {
    "stage": "budget",
    "severity": "error",
    "summary": "The data exceeds the display budget and no scientifically valid compaction exists for this figure.",
    "correctiveAction": "Reduce the data. Extrema sampling is invalid for a distribution, and block aggregation is invalid for a matrix without an explicit statistic — so Cortexel refuses rather than misrepresent."
  },
  "DATA_REFERENCE_UNRESOLVED": {
    "stage": "derivation",
    "severity": "error",
    "summary": "The request referenced data that has not been resolved.",
    "correctiveAction": "The host must resolve the reference to verified bytes and pass them in before invoking Cortexel. Stable core performs no network or filesystem access of its own."
  },
  "DATA_DIGEST_MISMATCH": {
    "stage": "derivation",
    "severity": "error",
    "summary": "Resolved data did not match its declared SHA-256.",
    "correctiveAction": "The resolver returned different bytes than the reference declares. This is treated as a failure, never as a warning."
  },
  "DATA_BYTE_LENGTH_MISMATCH": {
    "stage": "derivation",
    "severity": "error",
    "summary": "Resolved data did not match its declared byte length.",
    "correctiveAction": "Verify byte length and digest before parsing."
  },
  "DATA_MEDIA_TYPE_UNSUPPORTED": {
    "stage": "derivation",
    "severity": "error",
    "summary": "The data reference declared an unsupported media type.",
    "correctiveAction": "Use a supported interchange profile."
  },
  "RENDER_NO_DATA": {
    "stage": "render",
    "severity": "error",
    "summary": "The figure has no valid observations to draw.",
    "correctiveAction": "This is reported as an explicit empty state with a reason. Cortexel never draws an empty coordinate system that resembles measured zero."
  },
  "RENDER_DEGENERATE_DOMAIN": {
    "stage": "render",
    "severity": "error",
    "summary": "A scale domain is degenerate and no fallback is defined.",
    "correctiveAction": "Supply data with extent, or accept the documented fallback for this figure."
  },
  "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN": {
    "stage": "render",
    "severity": "error",
    "summary": "A logarithmic scale was requested for a domain containing zero or negative values.",
    "correctiveAction": "Use a linear or symlog scale, or exclude the non-positive values explicitly and accept the disclosure."
  },
  "RENDER_DIVERGING_SCALE_NO_CENTER": {
    "stage": "render",
    "severity": "error",
    "summary": "A diverging colour scale was requested with no meaningful center.",
    "correctiveAction": "Declare the center. A diverging map without a reference point implies a symmetry that the data may not have."
  },
  "RENDER_SERIES_LIMIT_EXCEEDED": {
    "stage": "render",
    "severity": "error",
    "summary": "More series were supplied than the visual system can distinguish.",
    "correctiveAction": "Use small multiples or group the series. Cortexel refuses to mint dozens of indistinguishable colours."
  },
  "RENDER_UNVALIDATED_REQUEST": {
    "stage": "render",
    "severity": "error",
    "summary": "Rendering was invoked without a validation token minted by this Cortexel instance.",
    "correctiveAction": "Call parseAndValidateRequest or validateRequestValue, require an ok result, and pass that exact frozen token to the renderer. A cast or look-alike object has no validation authority."
  },
  "RENDER_UNSUPPORTED_SKILL": {
    "stage": "render",
    "severity": "error",
    "summary": "No stable render-plan compiler exists for this skill.",
    "correctiveAction": "This is an internal invariant failure if the skill is stable; report it."
  },
  "RENDER_THEME_NONCONFORMING": {
    "stage": "render",
    "severity": "error",
    "summary": "A theme override failed its contrast or format constraints.",
    "correctiveAction": "Use an approved semantic token within the documented limits. Raw CSS, URLs, gradients, and font files are never accepted."
  },
  "MIGRATION_LEGACY_ID_NOT_ACCEPTED": {
    "stage": "structural",
    "severity": "error",
    "summary": "A pre-1.0 skill id was used in normal validation.",
    "correctiveAction": "Run `cortexel migrate`. Legacy ids are never silently aliased, because a silent alias makes a stored artifact ambiguous about what was actually validated."
  },
  "MIGRATION_UNKNOWN_LEGACY_ID": {
    "stage": "migrate",
    "severity": "error",
    "summary": "The legacy id is not in the migration map.",
    "correctiveAction": "Consult MIGRATION.md for every recognized pre-1.0 id."
  },
  "MIGRATION_NO_STABLE_REPLACEMENT": {
    "stage": "migrate",
    "severity": "error",
    "summary": "The legacy capability has no stable 1.0 replacement.",
    "correctiveAction": "Consult MIGRATION.md for the alternatives. Animation replay, for example, has no deterministic stable renderer and is experimental."
  },
  "MIGRATION_AMBIGUOUS_CONNECTIVITY_MATRIX": {
    "stage": "migrate",
    "severity": "error",
    "summary": "The legacy `nest.connectivity_matrix` does not say whether it meant adjacency, weight, or delay.",
    "correctiveAction": "Choose network.adjacency_matrix, network.weight_matrix, or network.delay_matrix. Cortexel will not guess from the shape of the fields, because the three have different absence, zero, and aggregation semantics."
  },
  "MIGRATION_INFORMATION_MISSING": {
    "stage": "migrate",
    "severity": "error",
    "summary": "Migration cannot proceed because the legacy payload lacks information the 1.0 contract requires.",
    "correctiveAction": "Supply the missing fact. Migration never guesses a population count, trial count, unit, node universe, MPI completeness, uncertainty, or zero-lag policy."
  },
  "MIGRATION_AMBIGUOUS": {
    "stage": "migrate",
    "severity": "warning",
    "summary": "A legacy value mapped to a weaker but accurate target because the original was ambiguous.",
    "correctiveAction": "Review the migration report and state the fact explicitly. An ambiguous source never maps to a stronger status."
  },
  "ADAPTER_NEST_UNSUPPORTED_SHAPE": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The NEST status/recorder object had a structure this adapter version does not support.",
    "correctiveAction": "Check the supported NEST version matrix. The observed keys are reported in a bounded, safe summary."
  },
  "ADAPTER_UNSUPPORTED_VERSION": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The upstream source version is not in this adapter's certified matrix.",
    "correctiveAction": "Use a certified version. Cortexel does not silently widen a support range because a resolver installed something newer."
  },
  "ADAPTER_MAPPING_REQUIRED": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The adapter needs an explicit mapping the caller did not supply.",
    "correctiveAction": "Select the channel, recorded variable, sender identity, and window explicitly. A generic blob with no mapping is rejected."
  },
  "ADAPTER_ACCESSOR_INPUT_REJECTED": {
    "stage": "adapter",
    "severity": "error",
    "summary": "Adapter input carried accessor properties.",
    "correctiveAction": "Pass plain data. The adapter rejects accessor-bearing input before any getter can run."
  },
  "CAPABILITY_EXPERIMENTAL": {
    "stage": "structural",
    "severity": "error",
    "summary": "An experimental capability was requested through a stable entry point.",
    "correctiveAction": "Import the explicit experimental subpath. Experimental capabilities carry no stable contract, determinism, or accessibility guarantee."
  },
  "CAPABILITY_REMOVED": {
    "stage": "structural",
    "severity": "error",
    "summary": "The capability was removed from the catalog.",
    "correctiveAction": "See the migration table for its replacement."
  },
  "ERROR_LIMIT_REACHED": {
    "stage": "internal",
    "severity": "warning",
    "summary": "More errors were found than the diagnostic budget permits.",
    "correctiveAction": "Fix the reported errors and revalidate. The omitted count is reported so no failure is hidden."
  },
  "INTERNAL_INVARIANT_VIOLATED": {
    "stage": "internal",
    "severity": "error",
    "summary": "Cortexel detected an internal invariant violation and refused to emit a result.",
    "correctiveAction": "This is a Cortexel defect. Please report it with the reproducer. Cortexel fails rather than emit an artifact it cannot vouch for."
  }
});

export const UNIT_CODES = [
  "/1",
  "/A",
  "/S",
  "/V",
  "/m",
  "/mV",
  "/mm",
  "/ms",
  "/nA",
  "/nS",
  "/pA",
  "/s",
  "/um",
  "1",
  "A",
  "Hz",
  "S",
  "V",
  "deg",
  "kHz",
  "m",
  "mV",
  "mm",
  "mmol/L",
  "mol/L",
  "ms",
  "nA",
  "nS",
  "nest:delay",
  "nest:weight",
  "nmol/L",
  "pA",
  "pS",
  "rad",
  "s",
  "uV",
  "um",
  "umol/L",
  "us"
] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export const QUANTITY_KINDS = [
  "angle",
  "concentration",
  "conductance",
  "correlation",
  "count",
  "current",
  "degree",
  "delay",
  "derivative",
  "duration",
  "firing_rate",
  "frequency",
  "interspike_interval",
  "length",
  "membrane_voltage",
  "position",
  "probability",
  "probability_density",
  "ratio",
  "state_variable",
  "synaptic_weight",
  "time",
  "voltage"
] as const;
export type QuantityKind = (typeof QUANTITY_KINDS)[number];

export interface UnitRecord {
  readonly code: string;
  readonly dimension: string;
  readonly toCanonical: number | null;
  readonly label: string;
  readonly aliases: readonly string[];
}

export const UNITS: Readonly<Record<string, UnitRecord>> = Object.freeze({
  "1": {
    "code": "1",
    "dimension": "dimensionless",
    "toCanonical": 1,
    "label": "",
    "aliases": [
      "",
      "unitless",
      "dimensionless",
      "count",
      "none"
    ]
  },
  "s": {
    "code": "s",
    "dimension": "time",
    "toCanonical": 1,
    "label": "s",
    "aliases": [
      "sec",
      "seconds",
      "second"
    ]
  },
  "ms": {
    "code": "ms",
    "dimension": "time",
    "toCanonical": 0.001,
    "label": "ms",
    "aliases": [
      "msec",
      "milliseconds",
      "millisecond"
    ]
  },
  "us": {
    "code": "us",
    "dimension": "time",
    "toCanonical": 0.000001,
    "label": "µs",
    "aliases": [
      "µs",
      "usec",
      "microseconds",
      "microsecond"
    ]
  },
  "Hz": {
    "code": "Hz",
    "dimension": "frequency",
    "toCanonical": 1,
    "label": "Hz",
    "aliases": [
      "hz",
      "hertz",
      "spikes/s",
      "sp/s"
    ]
  },
  "kHz": {
    "code": "kHz",
    "dimension": "frequency",
    "toCanonical": 1000,
    "label": "kHz",
    "aliases": [
      "khz"
    ]
  },
  "V": {
    "code": "V",
    "dimension": "voltage",
    "toCanonical": 1,
    "label": "V",
    "aliases": [
      "volt",
      "volts"
    ]
  },
  "mV": {
    "code": "mV",
    "dimension": "voltage",
    "toCanonical": 0.001,
    "label": "mV",
    "aliases": [
      "millivolt",
      "millivolts"
    ]
  },
  "uV": {
    "code": "uV",
    "dimension": "voltage",
    "toCanonical": 0.000001,
    "label": "µV",
    "aliases": [
      "µV",
      "microvolt",
      "microvolts"
    ]
  },
  "A": {
    "code": "A",
    "dimension": "current",
    "toCanonical": 1,
    "label": "A",
    "aliases": [
      "amp",
      "amps",
      "ampere"
    ]
  },
  "nA": {
    "code": "nA",
    "dimension": "current",
    "toCanonical": 1e-9,
    "label": "nA",
    "aliases": [
      "nanoamp",
      "nanoampere"
    ]
  },
  "pA": {
    "code": "pA",
    "dimension": "current",
    "toCanonical": 1e-12,
    "label": "pA",
    "aliases": [
      "picoamp",
      "picoampere"
    ]
  },
  "S": {
    "code": "S",
    "dimension": "conductance",
    "toCanonical": 1,
    "label": "S",
    "aliases": [
      "siemens"
    ]
  },
  "nS": {
    "code": "nS",
    "dimension": "conductance",
    "toCanonical": 1e-9,
    "label": "nS",
    "aliases": [
      "nanosiemens"
    ]
  },
  "pS": {
    "code": "pS",
    "dimension": "conductance",
    "toCanonical": 1e-12,
    "label": "pS",
    "aliases": [
      "picosiemens"
    ]
  },
  "mol/L": {
    "code": "mol/L",
    "dimension": "concentration",
    "toCanonical": 1,
    "label": "M",
    "aliases": [
      "M",
      "molar"
    ]
  },
  "mmol/L": {
    "code": "mmol/L",
    "dimension": "concentration",
    "toCanonical": 0.001,
    "label": "mM",
    "aliases": [
      "mM",
      "millimolar"
    ]
  },
  "umol/L": {
    "code": "umol/L",
    "dimension": "concentration",
    "toCanonical": 0.000001,
    "label": "µM",
    "aliases": [
      "µM",
      "uM",
      "micromolar"
    ]
  },
  "nmol/L": {
    "code": "nmol/L",
    "dimension": "concentration",
    "toCanonical": 1e-9,
    "label": "nM",
    "aliases": [
      "nM",
      "nanomolar"
    ]
  },
  "m": {
    "code": "m",
    "dimension": "length",
    "toCanonical": 1,
    "label": "m",
    "aliases": [
      "metre",
      "meter",
      "metres",
      "meters"
    ]
  },
  "mm": {
    "code": "mm",
    "dimension": "length",
    "toCanonical": 0.001,
    "label": "mm",
    "aliases": [
      "millimetre",
      "millimeter"
    ]
  },
  "um": {
    "code": "um",
    "dimension": "length",
    "toCanonical": 0.000001,
    "label": "µm",
    "aliases": [
      "µm",
      "micrometre",
      "micrometer",
      "micron"
    ]
  },
  "rad": {
    "code": "rad",
    "dimension": "angle",
    "toCanonical": 1,
    "label": "rad",
    "aliases": [
      "radian",
      "radians"
    ]
  },
  "deg": {
    "code": "deg",
    "dimension": "angle",
    "toCanonical": 0.017453292519943295,
    "label": "°",
    "aliases": [
      "degree",
      "degrees",
      "°"
    ]
  },
  "/s": {
    "code": "/s",
    "dimension": "per_time",
    "toCanonical": 1,
    "label": "s⁻¹",
    "aliases": [
      "1/s",
      "s^-1"
    ]
  },
  "/ms": {
    "code": "/ms",
    "dimension": "per_time",
    "toCanonical": 1000,
    "label": "ms⁻¹",
    "aliases": [
      "1/ms",
      "ms^-1"
    ]
  },
  "/V": {
    "code": "/V",
    "dimension": "per_voltage",
    "toCanonical": 1,
    "label": "V⁻¹",
    "aliases": [
      "1/V"
    ]
  },
  "/mV": {
    "code": "/mV",
    "dimension": "per_voltage",
    "toCanonical": 1000,
    "label": "mV⁻¹",
    "aliases": [
      "1/mV"
    ]
  },
  "/A": {
    "code": "/A",
    "dimension": "per_current",
    "toCanonical": 1,
    "label": "A⁻¹",
    "aliases": [
      "1/A"
    ]
  },
  "/nA": {
    "code": "/nA",
    "dimension": "per_current",
    "toCanonical": 1000000000,
    "label": "nA⁻¹",
    "aliases": [
      "1/nA"
    ]
  },
  "/pA": {
    "code": "/pA",
    "dimension": "per_current",
    "toCanonical": 1000000000000,
    "label": "pA⁻¹",
    "aliases": [
      "1/pA"
    ]
  },
  "/S": {
    "code": "/S",
    "dimension": "per_conductance",
    "toCanonical": 1,
    "label": "S⁻¹",
    "aliases": [
      "1/S"
    ]
  },
  "/nS": {
    "code": "/nS",
    "dimension": "per_conductance",
    "toCanonical": 1000000000,
    "label": "nS⁻¹",
    "aliases": [
      "1/nS"
    ]
  },
  "/m": {
    "code": "/m",
    "dimension": "per_length",
    "toCanonical": 1,
    "label": "m⁻¹",
    "aliases": [
      "1/m"
    ]
  },
  "/mm": {
    "code": "/mm",
    "dimension": "per_length",
    "toCanonical": 1000,
    "label": "mm⁻¹",
    "aliases": [
      "1/mm"
    ]
  },
  "/um": {
    "code": "/um",
    "dimension": "per_length",
    "toCanonical": 1000000,
    "label": "µm⁻¹",
    "aliases": [
      "1/um"
    ]
  },
  "/1": {
    "code": "/1",
    "dimension": "per_dimensionless",
    "toCanonical": 1,
    "label": "",
    "aliases": [
      "1/1"
    ]
  },
  "nest:weight": {
    "code": "nest:weight",
    "dimension": "simulator_defined",
    "toCanonical": null,
    "label": "weight (NEST)",
    "aliases": []
  },
  "nest:delay": {
    "code": "nest:delay",
    "dimension": "time",
    "toCanonical": 0.001,
    "label": "ms",
    "aliases": []
  }
});

/** Alias -> canonical code. Used ONLY by adapters and `cortexel migrate`; normal
 *  validation rejects an alias with a repair rather than converting it silently. */
export const UNIT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  "sec": "s",
  "seconds": "s",
  "second": "s",
  "msec": "ms",
  "milliseconds": "ms",
  "millisecond": "ms",
  "µs": "us",
  "usec": "us",
  "microseconds": "us",
  "microsecond": "us",
  "hz": "Hz",
  "hertz": "Hz",
  "spikes/s": "Hz",
  "sp/s": "Hz",
  "khz": "kHz",
  "volt": "V",
  "volts": "V",
  "millivolt": "mV",
  "millivolts": "mV",
  "µV": "uV",
  "microvolt": "uV",
  "microvolts": "uV",
  "amp": "A",
  "amps": "A",
  "ampere": "A",
  "nanoamp": "nA",
  "nanoampere": "nA",
  "picoamp": "pA",
  "picoampere": "pA",
  "siemens": "S",
  "nanosiemens": "nS",
  "picosiemens": "pS",
  "M": "mol/L",
  "molar": "mol/L",
  "mM": "mmol/L",
  "millimolar": "mmol/L",
  "µM": "umol/L",
  "uM": "umol/L",
  "micromolar": "umol/L",
  "nM": "nmol/L",
  "nanomolar": "nmol/L",
  "metre": "m",
  "meter": "m",
  "metres": "m",
  "meters": "m",
  "millimetre": "mm",
  "millimeter": "mm",
  "µm": "um",
  "micrometre": "um",
  "micrometer": "um",
  "micron": "um",
  "radian": "rad",
  "radians": "rad",
  "degree": "deg",
  "degrees": "deg",
  "°": "deg",
  "unitless": "1",
  "dimensionless": "1",
  "count": "1",
  "none": "1",
  "1/s": "/s",
  "s^-1": "/s",
  "1/ms": "/ms",
  "ms^-1": "/ms",
  "1/V": "/V",
  "1/mV": "/mV",
  "1/A": "/A",
  "1/nA": "/nA",
  "1/pA": "/pA",
  "1/S": "/S",
  "1/nS": "/nS",
  "1/m": "/m",
  "1/mm": "/mm",
  "1/um": "/um",
  "1/1": "/1"
});

export const QUANTITY_KIND_DIMENSIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "time": [
    "time"
  ],
  "duration": [
    "time"
  ],
  "interspike_interval": [
    "time"
  ],
  "delay": [
    "time"
  ],
  "frequency": [
    "frequency"
  ],
  "firing_rate": [
    "frequency"
  ],
  "membrane_voltage": [
    "voltage"
  ],
  "voltage": [
    "voltage"
  ],
  "current": [
    "current"
  ],
  "conductance": [
    "conductance"
  ],
  "concentration": [
    "concentration"
  ],
  "position": [
    "length"
  ],
  "length": [
    "length"
  ],
  "angle": [
    "angle"
  ],
  "count": [
    "dimensionless"
  ],
  "degree": [
    "dimensionless"
  ],
  "probability": [
    "dimensionless"
  ],
  "probability_density": [
    "per_time",
    "per_voltage",
    "per_current",
    "per_conductance",
    "per_length",
    "per_dimensionless"
  ],
  "correlation": [
    "dimensionless"
  ],
  "ratio": [
    "dimensionless"
  ],
  "synaptic_weight": [
    "simulator_defined",
    "conductance",
    "current",
    "voltage",
    "dimensionless"
  ],
  "state_variable": [
    "voltage",
    "current",
    "conductance",
    "concentration",
    "dimensionless"
  ],
  "derivative": [
    "per_time"
  ]
});

export const DISCLOSURE_RULES: readonly { readonly id: string; readonly severity: 'critical' | 'important' | 'informational'; readonly text: string }[] = Object.freeze([
  {
    "id": "SOURCE_SIMULATION",
    "severity": "important",
    "text": "Simulation output. These values were produced by a model, not measured from a biological system."
  },
  {
    "id": "SOURCE_SYNTHETIC_FIXTURE",
    "severity": "critical",
    "text": "Synthetic fixture. This data was fabricated to exercise the software and carries no scientific meaning whatsoever."
  },
  {
    "id": "SOURCE_KIND_UNKNOWN",
    "severity": "critical",
    "text": "Source unknown. The origin of this data was not declared, so nothing about its provenance can be relied upon."
  },
  {
    "id": "SOURCE_LITERATURE_EXTRACTION",
    "severity": "important",
    "text": "Extracted from published material. Values were transcribed from a publication and have not been re-derived from primary data."
  },
  {
    "id": "SOURCE_MANUAL_ENTRY",
    "severity": "important",
    "text": "Manually entered. These values were typed in by hand rather than exported from an instrument or simulator."
  },
  {
    "id": "SOURCE_AUTHENTICITY_UNVERIFIED",
    "severity": "important",
    "text": "Source authenticity not verified. Cortexel validated the structure and semantics of this request; it did not check that the underlying source bytes are what they claim to be."
  },
  {
    "id": "REFERENCE_COMPARISON_NOT_RUN",
    "severity": "informational",
    "text": "No independent reference comparison was run for this figure."
  },
  {
    "id": "PARTIAL_NETWORK_SCOPE",
    "severity": "critical",
    "text": "Partial network view. This is not the complete network: absent connections here have not been shown to be absent globally."
  },
  {
    "id": "RANK_LOCAL_SCOPE",
    "severity": "critical",
    "text": "Rank-local snapshot (rank {rank} of {worldSize}). Under MPI, a rank holds the connections whose target it owns. In-degree is therefore complete for these local targets; out-degree and global completeness are not."
  },
  {
    "id": "SAMPLED_EDGES",
    "severity": "critical",
    "text": "Edges sampled: {retainedConnectionCount} of {sourceConnectionCount} connections are shown. Degree and completeness cannot be read from this figure."
  },
  {
    "id": "NODE_UNIVERSE_INCOMPLETE",
    "severity": "critical",
    "text": "Node set incomplete. Nodes with no drawn edge may still have connections; a node missing here is not a node with degree zero."
  },
  {
    "id": "MULTAPSE_AGGREGATED",
    "severity": "important",
    "text": "Multiple connections between the same pair were combined using {aggregation}. Each cell shows an aggregate of {contributingCount} connections, not a single synapse."
  },
  {
    "id": "ABSENT_IS_NOT_ZERO",
    "severity": "important",
    "text": "An empty cell means no connection was observed. It is distinct from a connection whose weight is zero, which is drawn as a value."
  },
  {
    "id": "SCHEMATIC_LAYOUT",
    "severity": "important",
    "text": "Layout is schematic. Node placement was chosen for legibility and carries no spatial meaning."
  },
  {
    "id": "POSITIONS_MISSING",
    "severity": "important",
    "text": "{missingCount} of {totalCount} nodes have no declared position and are omitted from the map rather than placed at the origin."
  },
  {
    "id": "DOWNSAMPLED_FOR_RENDERING",
    "severity": "critical",
    "text": "Compacted for display: {countAfter} of {countBefore} observations are drawn, using {policyId}. The complete data is in the attached table and sidecar."
  },
  {
    "id": "COMPACTION_MAY_HIDE_TRANSIENTS",
    "severity": "critical",
    "text": "This display policy does not guarantee that a brief transient survives compaction. Read exact values from the table, not from the drawn shape."
  },
  {
    "id": "TABLE_EXCERPT_ONLY",
    "severity": "important",
    "text": "The inline table shows {tableRowsInline} of {tableRowsTotal} rows. The complete data is in the sidecar identified by digest."
  },
  {
    "id": "EVENTS_EXCLUDED_OUT_OF_WINDOW",
    "severity": "important",
    "text": "{excludedCount} events fell outside the declared observation window and are excluded from this analysis."
  },
  {
    "id": "MISSING_VALUES_PRESENT",
    "severity": "important",
    "text": "{missingCount} observations are missing. Lines are broken at each gap; missing values are never interpolated across or drawn as zero."
  },
  {
    "id": "UNIT_CONVERTED",
    "severity": "informational",
    "text": "Units were converted during canonicalization: {conversions}. The original values are preserved in the artifact."
  },
  {
    "id": "UNCERTAINTY_NOT_PROVIDED",
    "severity": "important",
    "text": "No uncertainty is shown ({reason}). The absence of a band means uncertainty was not supplied — not that it is small."
  },
  {
    "id": "AGGREGATE_WITHOUT_RAW_REPEATS",
    "severity": "important",
    "text": "Points are aggregates ({estimator}, n = {sampleCount}). The individual repeats were not supplied and cannot be shown."
  },
  {
    "id": "KERNEL_SMOOTHED_RATE",
    "severity": "important",
    "text": "Kernel-smoothed rate ({kernel}, bandwidth {bandwidth}). This is an estimate, not a literal count per bin, and it is drawn as a continuous line rather than as steps."
  },
  {
    "id": "ZERO_LAG_SELF_PAIRS_EXCLUDED",
    "severity": "important",
    "text": "Autocorrelation: each event paired with itself is excluded. Distinct events with identical times are retained, so the zero-lag bin is not necessarily empty."
  },
  {
    "id": "LAG_ORIENTATION",
    "severity": "informational",
    "text": "Positive lag means the target train follows the reference train by that lag."
  },
  {
    "id": "PRE_BINNED_INPUT",
    "severity": "informational",
    "text": "Input was pre-binned by the caller. Cortexel re-derived and checked the normalization but did not observe the raw events."
  },
  {
    "id": "DUPLICATE_TIMES_AGGREGATED",
    "severity": "important",
    "text": "Samples sharing a timestamp were combined using {method}."
  },
  {
    "id": "CALLER_NOTE_UNVERIFIED",
    "severity": "informational",
    "text": "The figure carries a note declared by the caller. Cortexel has not verified it."
  },
  {
    "id": "EXPERIMENTAL_RENDERER",
    "severity": "critical",
    "text": "Experimental; not a canonical Cortexel figure. Its output is not deterministic, not covered by the stable contract, and not accessibility-conformant."
  },
  {
    "id": "NONSTANDARD_BUDGET_PROFILE",
    "severity": "important",
    "text": "Rendered under a non-default budget profile ({profileId}). This figure does not claim default conformance."
  }
]);

export type DisclosureId = (typeof DISCLOSURE_RULES)[number]['id'];

export const SEMANTIC_VALIDATOR_IDS = [
  "bins.strictly_increasing",
  "correlogram.lag_range_valid",
  "correlogram.statistic_denominator",
  "degree.counting_policy_declared",
  "events.sender_universe_declared",
  "events.trial_universe_declared",
  "events.within_window",
  "histogram.normalization_consistent",
  "ids.unique",
  "isi.within_train_only",
  "isi.zero_interval_policy",
  "phase_plane.derivative_dimension",
  "provenance.no_caller_assurance",
  "provenance.note_safe_display",
  "psth.alignment_declared",
  "rate.denominator_positive",
  "rate.verify_normalization",
  "response_curve.estimator_declared",
  "series.equal_length",
  "spatial.equal_axis_units",
  "spatial.position_coverage_complete",
  "topology.delay_positive",
  "topology.edge_endpoints_in_universe",
  "topology.multapse_aggregation_declared",
  "topology.node_universe_declared",
  "topology.scope_declared",
  "topology.scope_supports_claim",
  "topology.weight_group_compatible",
  "trace.axis_dimension_compatible",
  "trace.duplicate_time_policy",
  "uncertainty.supported_variant",
  "uncertainty.valid",
  "unit.canonical_code",
  "unit.dimension_match",
  "weight_trace.observation_kind_declared",
  "window.valid"
] as const;
export type SemanticValidatorId = (typeof SEMANTIC_VALIDATOR_IDS)[number];
