/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/registries/.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

import { freezeGenerated } from '../core/deep-freeze.js';

export const ERROR_CODES = freezeGenerated([
  "ADAPTER_ACCESSOR_INPUT_REJECTED",
  "ADAPTER_MAPPING_REQUIRED",
  "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
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
  "JSON_INTEGER_OUT_OF_RANGE",
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
  "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
  "PROVENANCE_SOURCE_REQUIRED",
  "RENDER_DEGENERATE_DOMAIN",
  "RENDER_DIVERGING_SCALE_NO_CENTER",
  "RENDER_LAYOUT_UNAVAILABLE",
  "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
  "RENDER_NO_DATA",
  "RENDER_SERIES_LIMIT_EXCEEDED",
  "RENDER_THEME_NONCONFORMING",
  "RENDER_UNSUPPORTED_SKILL",
  "RENDER_UNVALIDATED_REQUEST",
  "RESOURCE_BUDGET_EXCEEDED",
  "RESOURCE_BUDGET_PROFILE_UNKNOWN",
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
  "SCIENCE_COUNT_ESTIMATOR_INCOHERENT",
  "SCIENCE_COUNT_NOT_INTEGER",
  "SCIENCE_DELAY_NONPOSITIVE",
  "SCIENCE_DENOMINATOR_INVALID",
  "SCIENCE_DENSITY_DOES_NOT_INTEGRATE",
  "SCIENCE_DUPLICATE_TIME_POLICY",
  "SCIENCE_EVENT_OUT_OF_WINDOW",
  "SCIENCE_EVENT_SCOPE_UNVERIFIABLE",
  "SCIENCE_LAG_RANGE_INVALID",
  "SCIENCE_LATENCY_OUTSIDE_WINDOW",
  "SCIENCE_NEGATIVE_INTERVAL",
  "SCIENCE_NORMALIZATION_UNVERIFIABLE",
  "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
  "SCIENCE_PAIRED_REPEATS_INCOMPLETE",
  "SCIENCE_POPULATION_UNIVERSE_REQUIRED",
  "SCIENCE_RESPONSE_INPUT_DUPLICATE",
  "SCIENCE_RESPONSE_METHOD_MISMATCH",
  "SCIENCE_RESPONSE_VALUE_INVALID",
  "SCIENCE_TRIAL_UNIVERSE_REQUIRED",
  "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
  "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
  "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA",
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
  "SEMANTIC_VALIDATOR_UNAVAILABLE",
  "SNAPSHOT_ACCESSOR_PROPERTY",
  "SNAPSHOT_CIRCULAR_REFERENCE",
  "SNAPSHOT_DANGEROUS_KEY",
  "SNAPSHOT_DECORATED_ARRAY",
  "SNAPSHOT_DEPTH_EXCEEDED",
  "SNAPSHOT_HOSTILE_REFLECTION",
  "SNAPSHOT_INTEGER_OUT_OF_RANGE",
  "SNAPSHOT_MALFORMED_STRING",
  "SNAPSHOT_NODES_EXCEEDED",
  "SNAPSHOT_NON_FINITE_NUMBER",
  "SNAPSHOT_NON_PLAIN_OBJECT",
  "SNAPSHOT_SPARSE_ARRAY",
  "SNAPSHOT_STRING_TOO_LONG",
  "SNAPSHOT_SYMBOL_KEY",
  "SNAPSHOT_UNSUPPORTED_TYPE"
] as const);
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_STAGES = freezeGenerated([
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
] as const);
export type ErrorStage = (typeof ERROR_STAGES)[number];

export const ERROR_CODE_META: Readonly<Record<ErrorCode, { readonly stage: ErrorStage; readonly severity: 'error' | 'warning'; readonly summary: string; readonly correctiveAction: string }>> = freezeGenerated({
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
  "JSON_INTEGER_OUT_OF_RANGE": {
    "stage": "parse",
    "severity": "error",
    "summary": "An unsafe bare JSON integer is not the canonical spelling of its parsed binary64 value.",
    "correctiveAction": "Use an exact integer between -(2^53-1) and +(2^53-1). If the value is genuinely a binary64 measurement, use the exact ECMAScript/RFC 8785 spelling of that rounded value or decimal/exponent notation; encode a non-arithmetic identifier as a string."
  },
  "JSON_INVALID_UNICODE": {
    "stage": "parse",
    "severity": "error",
    "summary": "The raw byte stream was not well-formed UTF-8, or the JSON text contained a malformed or lone-surrogate escape sequence.",
    "correctiveAction": "Emit well-formed UTF-8 and use paired surrogate escapes."
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
  "SNAPSHOT_INTEGER_OUT_OF_RANGE": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A host-language arbitrary-precision integer is outside the interoperable exact range.",
    "correctiveAction": "Use an exact safe integer, an IEEE-754 floating value when the quantity is genuinely approximate, or encode a non-arithmetic identifier as a string."
  },
  "SNAPSHOT_STRING_TOO_LONG": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A materialized string exceeds the active profile's length limit.",
    "correctiveAction": "Shorten the string or use a bounded content-addressed reference. Materialized input cannot bypass raw JSON string budgets."
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
    "correctiveAction": "Compare with getBuildIdentity(), then use migrateLegacyRequest() for a supported pre-1.0 request. The packaged CLI equivalents are `cortexel identity --json` and `cortexel migrate`; a repository checkout can run the same implementation with `bun src/cli/main.ts`."
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
    "correctiveAction": "Read STABLE_SKILL_IDS or run `cortexel catalog`. A legacy or experimental id is not accepted here."
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
  "SEMANTIC_VALIDATOR_UNAVAILABLE": {
    "stage": "semantic",
    "severity": "error",
    "summary": "This runtime does not implement every semantic validator required to certify the selected skill.",
    "correctiveAction": "Use a Cortexel runtime whose identity declares complete semantic coverage for this skill. A partial inspection may find definite errors, but it cannot certify validity."
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
    "correctiveAction": "Use the canonical code from the unit registry. A repair is supplied. Aliases are accepted only by adapters and migration operations, never silently in normal validation."
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
    "correctiveAction": "Declare the senders that were recorded. Without it, a mean-per-neuron rate cannot be computed. A skill may also require sender-universe authority for a pooled total-event rate so that its event selection remains identified; consult that skill instead of relabelling pre-pooled data as a single train."
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
  "SCIENCE_COUNT_ESTIMATOR_INCOHERENT": {
    "stage": "science",
    "severity": "error",
    "summary": "An aggregate declared as an estimator over exact integer counts cannot arise from that estimator and sample count.",
    "correctiveAction": "Supply the correctly rounded mean or trimmed mean on the 1/n lattice, or a median on the integer or half-integer lattice implied by sample-count parity. Aggregate count estimates cannot exceed the safe-integer observation domain."
  },
  "SCIENCE_NORMALIZATION_UNVERIFIABLE": {
    "stage": "science",
    "severity": "error",
    "summary": "A derived value, denominator, attempt/trim identity, or declared bin/grid/kernel basis could not be verified from its supplied authority.",
    "correctiveAction": "Supply coherent raw counts and denominators, correct the exact accounting identity, or fully declare a basis that matches the typed window. Cortexel re-derives every portable relation it can and refuses unverifiable normalized claims."
  },
  "SCIENCE_EVENT_SCOPE_UNVERIFIABLE": {
    "stage": "science",
    "severity": "error",
    "summary": "An event-derived response lacks a coherent declaration of the selected event train(s), pooling operation, completeness, or membership binding.",
    "correctiveAction": "Declare one internally coherent eventScope shared across every condition and repeat. Use single_train only for one already-selected train without a sender-cardinality claim; use pooled_recorded_senders only with the exact selected recorded-sender count and an explicit, canonical-digest, or cardinality-only membership binding. Cortexel never infers this authority from responders, labels, or scalar values."
  },
  "SCIENCE_RESPONSE_METHOD_MISMATCH": {
    "stage": "science",
    "severity": "error",
    "summary": "The response method declared in parameters disagrees with the method that types the response values.",
    "correctiveAction": "Use the same registered response method in parameters.responseMethod and the response object. Cortexel never relabels a mean rate, peak rate, latency, or event count as another quantity."
  },
  "SCIENCE_RESPONSE_VALUE_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "A response value lies outside the scientific domain of its declared response method.",
    "correctiveAction": "Rates, count estimates, and defined first-spike latencies must be non-negative. Latency zero means the first event occurred exactly at the included measurement-window start; use null only when no first spike occurred."
  },
  "SCIENCE_RESPONSE_INPUT_DUPLICATE": {
    "stage": "science",
    "severity": "error",
    "summary": "Two response-curve conditions declare the same numeric input value.",
    "correctiveAction": "Combine repeated measurements as repeats within one condition. If sweep direction or another factor distinguishes equal inputs, declare that factor in a future multi-series contract rather than overlapping two conditions at one x coordinate."
  },
  "SCIENCE_LATENCY_OUTSIDE_WINDOW": {
    "stage": "science",
    "severity": "error",
    "summary": "A first-spike latency referenced to the measurement-window start lies outside that declared window.",
    "correctiveAction": "For a half-open window require 0 <= latency < stop - start after exact unit comparison; a closed window may include equality at stop. Latency zero is the included start; use null when no spike occurred inside the window."
  },
  "SCIENCE_PAIRED_REPEATS_INCOMPLETE": {
    "stage": "science",
    "severity": "error",
    "summary": "A raw response curve declared a paired repeat design but did not supply the same repeat identities at every condition.",
    "correctiveAction": "Supply every paired repeat at every declared condition, including rows whose response is null, or declare the design independent. Cortexel never imputes a missing pair."
  },
  "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE": {
    "stage": "science",
    "severity": "error",
    "summary": "A declared conversion, offset, normalization, or uncertainty transform cannot be represented without collapsing or materially distorting a scientific difference in binary64.",
    "correctiveAction": "Choose a better-scaled canonical unit or split the view so the required effect is representable. Cortexel refuses instead of publishing a rounded offset, variation, or uncertainty width as though it still matched the declaration."
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
  "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA": {
    "stage": "science",
    "severity": "error",
    "summary": "The declared reason for omitting uncertainty contradicts the supplied observations or sample accounting.",
    "correctiveAction": "Use a reason supported by the data. In particular, single_trial is false when any condition declares more than one attempted repeat."
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
    "summary": "An attestation presented at a boundary requiring independent verification could not be verified.",
    "correctiveAction": "Contract 1.0 has no request or artifact attestation-verification boundary. Do not put caller-authored verification claims in a request; this append-only code remains reserved for an explicitly versioned boundary that can actually verify them."
  },
  "PROVENANCE_SOURCE_CLOCK_INCONSISTENT": {
    "stage": "provenance",
    "severity": "error",
    "summary": "A source-specific event clock contradicts the request's source, version, digest, backend, encoding, or event unit.",
    "correctiveAction": "For a NEST origin-relative window, export the complete memory-recorder status with time_in_steps=false, retain native milliseconds, declare NEST 3.9 or 3.10, and bind the export with its canonical SHA-256 digest. Do not relabel or reconstruct the clock."
  },
  "RESOURCE_BUDGET_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "The request exceeds a hard limit of the active budget profile.",
    "correctiveAction": "Reduce the input. A hard limit protects the process and cannot be raised from untrusted input; it may only be lowered."
  },
  "RESOURCE_BUDGET_PROFILE_UNKNOWN": {
    "stage": "budget",
    "severity": "error",
    "summary": "The host selected a budget profile that is not in the closed registry.",
    "correctiveAction": "Use a profile returned by the installed Cortexel build. Unknown, inherited, and caller-invented profile ids fail closed."
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
  "RENDER_LAYOUT_UNAVAILABLE": {
    "stage": "render",
    "severity": "error",
    "summary": "The requested dimensions cannot contain a positive plotting region and mandatory figure content.",
    "correctiveAction": "Increase the figure dimensions. Cortexel never emits negative or collapsed panel geometry to make required disclosures fit."
  },
  "MIGRATION_LEGACY_ID_NOT_ACCEPTED": {
    "stage": "structural",
    "severity": "error",
    "summary": "A pre-1.0 skill id was used in normal validation.",
    "correctiveAction": "Use migrateLegacyRequest() or `cortexel migrate`. Legacy ids are never silently aliased, because a silent alias makes a stored artifact ambiguous about what was actually validated."
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
    "summary": "A historical migrator refused to reinterpret the misleadingly named legacy topology id as an adjacency, weight, or delay matrix.",
    "correctiveAction": "Use the current migrator to obtain a partial network.connection_graph request, or explicitly author the desired matrix contract. Optional legacy fields never select matrix semantics."
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
    "correctiveAction": "Check the revision-admitted NEST version and shape profile. The observed keys are reported in a bounded, safe summary."
  },
  "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The NEST recorder time encoding is absent or cannot be represented losslessly by this adapter revision.",
    "correctiveAction": "For revision 2, configure the memory recorder with time_in_steps=false before Simulate and export its complete status. Raw step/offset support remains fail-closed until the downstream contract preserves that pair as the canonical clock."
  },
  "ADAPTER_UNSUPPORTED_VERSION": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The declared upstream source version is not in this adapter revision's admitted profile.",
    "correctiveAction": "Use a version string admitted by this adapter revision. Admission is a fail-closed input rule, not evidence that Cortexel executed or certified that upstream version; Cortexel does not silently widen the range because a resolver installed something newer."
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
    "correctiveAction": "Consult the capability registry and its mandatory availability field. No experimental FigureRequestV1 skill is currently callable; a legacy experimental package export is not a current-contract replacement."
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

export const UNIT_CODES = freezeGenerated([
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
] as const);
export type UnitCode = (typeof UNIT_CODES)[number];

export const QUANTITY_KINDS = freezeGenerated([
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
] as const);
export type QuantityKind = (typeof QUANTITY_KINDS)[number];

export const UNCERTAINTY_KINDS = freezeGenerated([
  "confidence_interval",
  "credible_interval",
  "ensemble_range",
  "none",
  "quantile_interval",
  "standard_deviation",
  "standard_error"
] as const);
export type UncertaintyKind = (typeof UNCERTAINTY_KINDS)[number];

export interface UnitRecord {
  readonly code: string;
  readonly dimension: string;
  readonly toCanonical: number | null;
  /** Exact decimal exponent when the registry scale is a power of ten. */
  readonly toCanonicalDecimalExponent: number | null;
  readonly label: string;
  readonly aliases: readonly string[];
}

export const UNITS: Readonly<Record<string, UnitRecord>> = freezeGenerated({
  "1": {
    "code": "1",
    "dimension": "dimensionless",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": -3,
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
    "toCanonicalDecimalExponent": -6,
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
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": 3,
    "label": "kHz",
    "aliases": [
      "khz"
    ]
  },
  "V": {
    "code": "V",
    "dimension": "voltage",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": -3,
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
    "toCanonicalDecimalExponent": -6,
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
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": -9,
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
    "toCanonicalDecimalExponent": -12,
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
    "toCanonicalDecimalExponent": 0,
    "label": "S",
    "aliases": [
      "siemens"
    ]
  },
  "nS": {
    "code": "nS",
    "dimension": "conductance",
    "toCanonical": 1e-9,
    "toCanonicalDecimalExponent": -9,
    "label": "nS",
    "aliases": [
      "nanosiemens"
    ]
  },
  "pS": {
    "code": "pS",
    "dimension": "conductance",
    "toCanonical": 1e-12,
    "toCanonicalDecimalExponent": -12,
    "label": "pS",
    "aliases": [
      "picosiemens"
    ]
  },
  "mol/L": {
    "code": "mol/L",
    "dimension": "concentration",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": -3,
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
    "toCanonicalDecimalExponent": -6,
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
    "toCanonicalDecimalExponent": -9,
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
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": -3,
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
    "toCanonicalDecimalExponent": -6,
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
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": null,
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
    "toCanonicalDecimalExponent": 0,
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
    "toCanonicalDecimalExponent": 3,
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
    "toCanonicalDecimalExponent": 0,
    "label": "V⁻¹",
    "aliases": [
      "1/V"
    ]
  },
  "/mV": {
    "code": "/mV",
    "dimension": "per_voltage",
    "toCanonical": 1000,
    "toCanonicalDecimalExponent": 3,
    "label": "mV⁻¹",
    "aliases": [
      "1/mV"
    ]
  },
  "/A": {
    "code": "/A",
    "dimension": "per_current",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "A⁻¹",
    "aliases": [
      "1/A"
    ]
  },
  "/nA": {
    "code": "/nA",
    "dimension": "per_current",
    "toCanonical": 1000000000,
    "toCanonicalDecimalExponent": 9,
    "label": "nA⁻¹",
    "aliases": [
      "1/nA"
    ]
  },
  "/pA": {
    "code": "/pA",
    "dimension": "per_current",
    "toCanonical": 1000000000000,
    "toCanonicalDecimalExponent": 12,
    "label": "pA⁻¹",
    "aliases": [
      "1/pA"
    ]
  },
  "/S": {
    "code": "/S",
    "dimension": "per_conductance",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "S⁻¹",
    "aliases": [
      "1/S"
    ]
  },
  "/nS": {
    "code": "/nS",
    "dimension": "per_conductance",
    "toCanonical": 1000000000,
    "toCanonicalDecimalExponent": 9,
    "label": "nS⁻¹",
    "aliases": [
      "1/nS"
    ]
  },
  "/m": {
    "code": "/m",
    "dimension": "per_length",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "m⁻¹",
    "aliases": [
      "1/m"
    ]
  },
  "/mm": {
    "code": "/mm",
    "dimension": "per_length",
    "toCanonical": 1000,
    "toCanonicalDecimalExponent": 3,
    "label": "mm⁻¹",
    "aliases": [
      "1/mm"
    ]
  },
  "/um": {
    "code": "/um",
    "dimension": "per_length",
    "toCanonical": 1000000,
    "toCanonicalDecimalExponent": 6,
    "label": "µm⁻¹",
    "aliases": [
      "1/um"
    ]
  },
  "/1": {
    "code": "/1",
    "dimension": "per_dimensionless",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "",
    "aliases": [
      "1/1"
    ]
  },
  "nest:weight": {
    "code": "nest:weight",
    "dimension": "simulator_defined",
    "toCanonical": null,
    "toCanonicalDecimalExponent": null,
    "label": "weight (NEST)",
    "aliases": []
  },
  "nest:delay": {
    "code": "nest:delay",
    "dimension": "time",
    "toCanonical": 0.001,
    "toCanonicalDecimalExponent": -3,
    "label": "ms",
    "aliases": []
  }
});

/** Alias -> canonical code. Used ONLY by adapters and explicit migration operations; normal
 *  validation rejects an alias with a repair rather than converting it silently. */
export const UNIT_ALIASES: Readonly<Record<string, string>> = freezeGenerated({
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

export const QUANTITY_KIND_DIMENSIONS: Readonly<Record<string, readonly string[]>> = freezeGenerated({
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

export const DISCLOSURE_RULES: readonly { readonly id: string; readonly severity: 'critical' | 'important' | 'informational'; readonly text: string }[] = freezeGenerated([
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
    "text": "Multiple connections between the same endpoint pair were combined using {aggregation}. The drawn value is an aggregate, not a single synapse."
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
    "id": "EVENTS_EXCLUDED_OUT_OF_WINDOW",
    "severity": "important",
    "text": "{excludedCount} observations fell outside the declared observation window and are excluded from this analysis."
  },
  {
    "id": "NEST_SERIALIZED_CLOCK_BOUNDARY",
    "severity": "important",
    "text": "NEST clock boundary — Cortexel checked origin, start, stop, and event times as the exported binary64 millisecond values. It did not inspect NEST's hidden integer-tic state or establish the source export's authenticity; pre-serialization timing remains caller-declared."
  },
  {
    "id": "MISSING_VALUES_PRESENT",
    "severity": "important",
    "text": "Missing observations: {missingCount}. Missing values are omitted rather than interpolated, imputed, or drawn as zero."
  },
  {
    "id": "UNIT_CONVERTED",
    "severity": "informational",
    "text": "Units were converted during derivation: {conversions}. Source values remain in the canonical request embedded in the artifact; converted table values identify their units."
  },
  {
    "id": "UNCERTAINTY_NOT_PROVIDED",
    "severity": "important",
    "text": "No uncertainty is shown ({reason}). The absence of an uncertainty mark means uncertainty was not supplied — not that it is small."
  },
  {
    "id": "UNCERTAINTY_COVERAGE_INCOMPLETE",
    "severity": "important",
    "text": "Complete drawable uncertainty is present for {shownCount} of {seriesCount} displayed series; non-none uncertainty was declared for {declaredCount}. A missing uncertainty mark or bound means drawable uncertainty was absent there — not that it is small."
  },
  {
    "id": "AGGREGATE_WITHOUT_RAW_REPEATS",
    "severity": "important",
    "text": "Responses were supplied as per-condition aggregates ({estimator}, n = {sampleCount}). The individual repeats were not supplied and cannot be shown."
  },
  {
    "id": "EVENT_SCOPE_EXTERNAL_AUTHORITY_UNVERIFIED",
    "severity": "important",
    "text": "Event scope is caller-declared. Cortexel checks internal structure and arithmetic, but cannot establish selection referents, recorded-sender count, completeness, pooling actually performed, membership-digest preimages, or that counts, latencies, and peaks came from that selection without the source records. A single selected train may itself be pre-pooled; its source composition is not bound."
  },
  {
    "id": "EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY",
    "severity": "important",
    "text": "Event-scope membership is cardinality-only. The selected-sender count is declared, but member identities are not bound; Cortexel cannot establish that the same sender population was used across conditions or repeats."
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
    "text": "Input was pre-binned by the caller. Exact aggregate counts and denominators were producer-supplied: Cortexel checks their integer/range consistency and re-derives the normalization, but cannot re-derive them from raw observations. Observation identities, membership partitions, and coverage not explicitly retained by the aggregate fields cannot be recovered."
  },
  {
    "id": "RECTANGULAR_SENDER_EXPOSURE_ASSERTED",
    "severity": "important",
    "text": "Rectangular selected-sender exposure was asserted. The per-selected-sender rate assumes every selected sender was observable in every counted trial and bin; Cortexel cannot verify that exposure from spike-event presence or pre-binned aggregates."
  },
  {
    "id": "DUPLICATE_TIMES_AGGREGATED",
    "severity": "important",
    "text": "Samples sharing a timestamp were combined using {method}."
  },
  {
    "id": "MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE",
    "severity": "important",
    "text": "{missingReplicateCount} missing replicate values were excluded from duplicate-time aggregates. An all-missing replicate group remains a visible gap rather than becoming zero."
  },
  {
    "id": "CALLER_NOTE_UNVERIFIED",
    "severity": "informational",
    "text": "The figure carries a note declared by the caller. Cortexel has not verified it."
  },
  {
    "id": "NONSTANDARD_BUDGET_PROFILE",
    "severity": "important",
    "text": "Rendered under a non-default budget profile ({profileId}). This figure does not claim default conformance."
  }
]);

export type DisclosureId = (typeof DISCLOSURE_RULES)[number]['id'];

export const SEMANTIC_VALIDATOR_IDS = freezeGenerated([
  "bins.strictly_increasing",
  "compartment_trace.series_identity_declared",
  "correlogram.event_trains_valid",
  "correlogram.lag_range_valid",
  "correlogram.prebinned_axis_consistent",
  "correlogram.roles_disjoint",
  "correlogram.statistic_denominator",
  "degree.counting_policy_declared",
  "events.sender_universe_declared",
  "events.source_clock_declared",
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
  "topology.matrix_contract",
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
] as const);
export type SemanticValidatorId = (typeof SEMANTIC_VALIDATOR_IDS)[number];

/** Language-neutral numeric algorithms whose ids are stable request-level acceptance boundaries. */
export const NUMERIC_ALGORITHMS = freezeGenerated({
  "cortexel_binary64_nominal_interval_candidates_v1": {
    "id": "cortexel_binary64_nominal_interval_candidates_v1",
    "revision": 1,
    "semantics": {
      "id": "cortexel_binary64_nominal_interval_candidates_semantics_v1",
      "version": "1.0",
      "status": "normative",
      "parameters": {
        "numberFormat": "ieee754_binary64",
        "binary64Epsilon": 2.220446049250313e-16,
        "arithmeticRoundingMode": "roundTiesToEven",
        "coefficientEncoding": "signed_integer_times_two_to_binary_exponent",
        "coefficientBinaryExponent": -1074,
        "negativeZeroPolicy": "canonical_positive_zero",
        "rangeRule": "width_positive_and_stop_strictly_greater_than_start",
        "quotientRule": "round_exact_span_over_width_once_to_binary64",
        "intervalCountRule": "nearest_integer_ties_toward_positive_infinity",
        "quotientToleranceEpsilonMultiplier": 8,
        "quotientToleranceScale": "max_one_abs_rounded_quotient",
        "quotientToleranceArithmetic": "binary64_left_to_right",
        "maximumMaterializedIntervals": 100000,
        "maximumSafeInteger": 9007199254740991,
        "internalEdgeRule": "round_exact_start_plus_index_times_width_once_to_binary64",
        "internalEdgeOrder": "strictly_increasing_and_strictly_below_submitted_stop",
        "nonzeroInternalEdgeUnderflowPolicy": "refuse_unrepresentable",
        "reconstructedStopRule": "round_exact_start_plus_count_times_width_once_to_binary64",
        "endpointToleranceEpsilonMultiplier": 8,
        "endpointToleranceScale": "max_one_abs_start_abs_stop_abs_reconstructed_stop",
        "endpointToleranceArithmetic": "binary64_left_to_right",
        "finalEdgeAuthority": "submitted_stop",
        "exposureClaim": "endpoint_pairs_authoritative_no_uniform_exposure",
        "nonfiniteInputFailureClass": "nonfinite",
        "invalidRangeFailureClass": "invalid_range",
        "tilingMismatchFailureClass": "non_tiling",
        "budgetOrQuotientOverflowFailureClass": "too_many",
        "edgeRepresentationFailureClass": "unrepresentable"
      }
    },
    "purpose": "Materialize deterministic endpoint-authoritative interval candidates from a nominal binary64 width while accepting bounded decimal-intent tilings such as 0.3 by 0.1, refusing genuine nominal remainder intervals, and detecting every binary64 edge collapse. The emitted endpoint pairs are authoritative and are not claimed to have exact physical exposure equal to the nominal width; a consuming policy must add that stronger check before dividing an event count by the typed width.",
    "inputs": {
      "start": "finite binary64",
      "stop": "finite binary64 strictly greater than start",
      "width": "finite positive binary64 already converted into the start/stop unit with one exact-rational-to-binary64 roundTiesToEven conversion"
    },
    "constants": {
      "binary64MinSubnormalExponent": -1074,
      "binary64Epsilon": 2.220446049250313e-16,
      "quotientToleranceEpsilonMultiplier": 8,
      "endpointToleranceEpsilonMultiplier": 8,
      "maximumMaterializedIntervals": 100000,
      "maximumSafeInteger": 9007199254740991,
      "roundingMode": "roundTiesToEven"
    },
    "algorithm": [
      "Reject with failureClass nonfinite unless start, stop, and width are finite binary64 numbers. Otherwise reject with failureClass invalid_range unless width > 0 and stop > start.",
      "Decode each submitted binary64 exactly as a signed integer multiple of 2^-1074: start = S*2^-1074, stop = E*2^-1074, width = W*2^-1074. Negative zero decodes as zero and is emitted as canonical positive zero in any returned edge. Compute the exact integers span = E-S and W; W must be positive.",
      "Correctly round the exact positive rational span/W once to binary64 using roundTiesToEven, obtaining q. If that conversion overflows finite binary64, reject with failureClass too_many because every such positive quotient exceeds maximumMaterializedIntervals. If it underflows to q = 0, reject with failureClass non_tiling. Otherwise set n to the mathematically nearest integer to the binary64 value q, with an exact half tie toward +infinity; equivalently n = floor(q + 0.5) where the addition and floor express the real-number rule rather than a separately rounded binary64 addition.",
      "Compute quotientTolerance = 8 * binary64Epsilon * max(1, abs(q)) with binary64 multiplication in the written left-to-right order. Reject with failureClass non_tiling when the binary64 value abs(q-n) is greater than quotientTolerance.",
      "Reject with failureClass non_tiling when n < 1. Reject with failureClass too_many unless n is an exact safe integer no greater than maximumMaterializedIntervals (100000).",
      "For every integer i from 1 through n-1, form the exact integer Ui = S + i*W and correctly round Ui*2^-1074 once to binary64 using roundTiesToEven, obtaining edge_i. Reject with failureClass unrepresentable on overflow, when Ui is nonzero but edge_i is zero, or unless edge_i is strictly greater than the preceding emitted edge and strictly less than stop. Every internal edge is checked; checking only the origin is nonconforming.",
      "Form the exact integer R = S + n*W and correctly round R*2^-1074 once to binary64 using roundTiesToEven, obtaining reconstructedStop. Reject with failureClass unrepresentable on overflow or when reconstructedStop is not finite.",
      "Compute endpointTolerance = 8 * binary64Epsilon * max(1, abs(start), abs(stop), abs(reconstructedStop)) with binary64 multiplication in the written left-to-right order. Reject with failureClass non_tiling when the binary64 value abs(reconstructedStop-stop) is greater than endpointTolerance.",
      "Accept with intervalCount n and edges [start, edge_1, ..., edge_(n-1), stop]. The submitted stop, not reconstructedStop, is the final emitted edge. This establishes only a bounded nominal tiling: adjacent endpoint differences are authoritative and may differ from width and from one another. A consumer MUST NOT call these intervals equal-width or divide counts by width unless a separate policy verifies every exact physical endpoint difference against the original typed width."
    ],
    "failureClasses": [
      "nonfinite",
      "invalid_range",
      "non_tiling",
      "too_many",
      "unrepresentable"
    ],
    "conformanceVectors": [
      {
        "name": "exact_quarters",
        "input": {
          "start": 0,
          "stop": 1,
          "width": 0.25
        },
        "result": {
          "accepted": true,
          "intervalCount": 4,
          "edges": [
            0,
            0.25,
            0.5,
            0.75,
            1
          ]
        }
      },
      {
        "name": "decimal_intent_three_tenths",
        "input": {
          "start": 0,
          "stop": 0.3,
          "width": 0.1
        },
        "result": {
          "accepted": true,
          "intervalCount": 3,
          "edges": [
            0,
            0.1,
            0.2,
            0.3
          ]
        }
      },
      {
        "name": "exact_index_times_width_not_repeated_addition",
        "input": {
          "start": 0,
          "stop": 1,
          "width": 0.1
        },
        "result": {
          "accepted": true,
          "intervalCount": 10,
          "edgeAssertions": [
            {
              "index": 0,
              "value": 0
            },
            {
              "index": 6,
              "value": 0.6000000000000001
            },
            {
              "index": 8,
              "value": 0.8
            },
            {
              "index": 10,
              "value": 1
            }
          ]
        }
      },
      {
        "name": "minimum_subnormal_interval",
        "input": {
          "start": 0,
          "stop": 5e-324,
          "width": 5e-324
        },
        "result": {
          "accepted": true,
          "intervalCount": 1,
          "edges": [
            0,
            5e-324
          ]
        }
      },
      {
        "name": "quotient_tolerance_eight_epsilon_boundary",
        "input": {
          "start": 0,
          "stop": 1.0000000000000018,
          "width": 1
        },
        "result": {
          "accepted": true,
          "intervalCount": 1,
          "edges": [
            0,
            1.0000000000000018
          ]
        }
      },
      {
        "name": "quotient_tolerance_nine_epsilon_rejected",
        "input": {
          "start": 0,
          "stop": 1.000000000000002,
          "width": 1
        },
        "result": {
          "accepted": false,
          "failureClass": "non_tiling"
        }
      },
      {
        "name": "endpoint_tolerance_eight_epsilon_boundary",
        "input": {
          "start": -100,
          "stop": 32.000000000000156,
          "width": 2
        },
        "result": {
          "accepted": true,
          "intervalCount": 66,
          "edgeAssertions": [
            {
              "index": 0,
              "value": -100
            },
            {
              "index": 1,
              "value": -98
            },
            {
              "index": 65,
              "value": 30
            },
            {
              "index": 66,
              "value": 32.000000000000156
            }
          ]
        }
      },
      {
        "name": "endpoint_tolerance_just_outside_rejected",
        "input": {
          "start": -100,
          "stop": 32.000000000000185,
          "width": 2
        },
        "result": {
          "accepted": false,
          "failureClass": "non_tiling"
        }
      },
      {
        "name": "genuine_remainder",
        "input": {
          "start": 0,
          "stop": 10,
          "width": 6
        },
        "result": {
          "accepted": false,
          "failureClass": "non_tiling"
        }
      },
      {
        "name": "invalid_zero_width",
        "input": {
          "start": 0,
          "stop": 1,
          "width": 0
        },
        "result": {
          "accepted": false,
          "failureClass": "invalid_range"
        }
      },
      {
        "name": "quotient_underflow_is_non_tiling",
        "input": {
          "start": 0,
          "stop": 5e-324,
          "width": 1.7976931348623157e+308
        },
        "result": {
          "accepted": false,
          "failureClass": "non_tiling"
        }
      },
      {
        "name": "internal_edge_collapse_at_large_origin",
        "input": {
          "start": 10000000000000000,
          "stop": 10000000000000004,
          "width": 1
        },
        "result": {
          "accepted": false,
          "failureClass": "unrepresentable"
        }
      },
      {
        "name": "late_internal_edge_collapse_across_binary64_spacing_boundary",
        "input": {
          "start": 9007199254740988,
          "stop": 9007199254740994,
          "width": 1
        },
        "result": {
          "accepted": false,
          "failureClass": "unrepresentable"
        }
      },
      {
        "name": "reconstructed_endpoint_overflow",
        "input": {
          "start": -1.7976931348623157e+308,
          "stop": 1.7976931348623157e+308,
          "width": 1.1984620899082107e+308
        },
        "result": {
          "accepted": false,
          "failureClass": "unrepresentable"
        }
      },
      {
        "name": "exact_ratio_survives_ordinary_subtraction_overflow",
        "input": {
          "start": -1.7976931348623157e+308,
          "stop": 1.7976931348623157e+308,
          "width": 1.7976931348623157e+308
        },
        "result": {
          "accepted": true,
          "intervalCount": 2,
          "edges": [
            -1.7976931348623157e+308,
            0,
            1.7976931348623157e+308
          ]
        }
      },
      {
        "name": "maximum_materialization_budget_accepted",
        "input": {
          "start": 0,
          "stop": 100000,
          "width": 1
        },
        "result": {
          "accepted": true,
          "intervalCount": 100000,
          "edgeAssertions": [
            {
              "index": 0,
              "value": 0
            },
            {
              "index": 1,
              "value": 1
            },
            {
              "index": 99999,
              "value": 99999
            },
            {
              "index": 100000,
              "value": 100000
            }
          ]
        }
      },
      {
        "name": "materialization_budget",
        "input": {
          "start": 0,
          "stop": 100001,
          "width": 1
        },
        "result": {
          "accepted": false,
          "failureClass": "too_many"
        }
      }
    ]
  },
  "cortexel_binary64_spatial_domain_axis_v1": {
    "id": "cortexel_binary64_spatial_domain_axis_v1",
    "revision": 1,
    "semantics": {
      "id": "cortexel_binary64_spatial_domain_axis_semantics_v1",
      "version": "1.0",
      "status": "normative",
      "parameters": {
        "numberFormat": "ieee754_binary64",
        "binary64Epsilon": 2.220446049250313e-16,
        "arithmeticRoundingMode": "roundTiesToEven",
        "coefficientEncoding": "signed_integer_times_two_to_binary_exponent",
        "coefficientBinaryExponent": -1074,
        "negativeZeroPolicy": "canonical_positive_zero",
        "extentRule": "finite_strictly_positive",
        "endpointRule": "round_exact_two_center_plus_or_minus_extent_over_two_once",
        "endpointOrder": "finite_strictly_increasing",
        "endpointRoundingCapEpsilonMultiplier": 32,
        "endpointRoundingCapScale": "declared_extent_only",
        "membershipBoundary": "closed",
        "membershipToleranceEpsilonMultiplier": 8,
        "membershipToleranceScale": "declared_extent_only",
        "membershipAllowance": "relative_tolerance_plus_exact_compared_endpoint_rounding_error",
        "comparisonArithmetic": "exact_min_subnormal_integer_cross_multiplication",
        "absoluteOriginPolicy": "never_scales_tolerance",
        "nonfiniteInputFailureClass": "nonfinite",
        "invalidExtentFailureClass": "invalid_extent",
        "representationFailureClass": "unrepresentable"
      }
    },
    "purpose": "Materialize a closed binary64 spatial axis from a declared centre and extent, and classify finite positions with an extent-relative allowance that cannot underflow or grow with the absolute coordinate origin.",
    "inputs": {
      "center": "finite binary64 in the selected canonical length unit",
      "extent": "finite strictly positive binary64 in the same canonical length unit",
      "values": "zero or more finite binary64 positions in that unit"
    },
    "constants": {
      "binary64MinSubnormalExponent": -1074,
      "binary64Epsilon": 2.220446049250313e-16,
      "membershipToleranceEpsilonMultiplier": 8,
      "endpointRoundingCapEpsilonMultiplier": 32,
      "roundingMode": "roundTiesToEven",
      "boundary": "closed"
    },
    "algorithm": [
      "Reject with failureClass nonfinite unless center, extent, and every tested value are finite binary64 numbers. Otherwise reject with failureClass invalid_extent unless extent is strictly positive.",
      "Decode center and extent exactly as C*2^-1074 and E*2^-1074. Form the exact rational endpoint numerators 2C-E and 2C+E over denominator 2, round each once to binary64 with roundTiesToEven, and canonicalize negative zero.",
      "Reject with failureClass unrepresentable unless both rounded endpoints are finite and strictly ordered. Compute each exact endpoint-rounding error before rounding; reject when either error is greater than 32*binary64Epsilon*extent, using exact integer cross-multiplication.",
      "For each value V, decode it exactly as an integer multiple of 2^-1074. The lower allowance is 8*binary64Epsilon*extent plus the exact lower-endpoint rounding error; the upper allowance is the same relative term plus the exact upper-endpoint rounding error.",
      "Classify V as inside exactly when V is no less than lower minus its allowance and no greater than upper plus its allowance. Perform both comparisons by exact integer cross-multiplication; do not materialize a tolerance in binary64 and do not include abs(center) in either scale.",
      "Accept with the two rounded endpoints and one boolean membership result per submitted value. The same accepted endpoints and membership operation are authoritative for table rows, summary counts, preflight, domain geometry and output-authority evaluation."
    ],
    "failureClasses": [
      "nonfinite",
      "invalid_extent",
      "unrepresentable"
    ],
    "conformanceVectors": [
      {
        "name": "closed_relative_boundary_without_endpoint_rounding",
        "input": {
          "center": 0,
          "extent": 2,
          "values": [
            1,
            1.0000000000000036,
            1.0000000000000038
          ]
        },
        "result": {
          "accepted": true,
          "lower": -1,
          "upper": 1,
          "membership": [
            true,
            true,
            false
          ]
        }
      },
      {
        "name": "bounded_endpoint_rounding_at_offset_origin",
        "input": {
          "center": 40,
          "extent": 0.4,
          "values": [
            39.8,
            40,
            40.2
          ]
        },
        "result": {
          "accepted": true,
          "lower": 39.8,
          "upper": 40.2,
          "membership": [
            true,
            true,
            true
          ]
        }
      },
      {
        "name": "large_origin_does_not_expand_membership",
        "input": {
          "center": 1000000000000000,
          "extent": 1,
          "values": [
            999999999999999.5,
            1000000000000000.5,
            1000000000000000.6
          ]
        },
        "result": {
          "accepted": true,
          "lower": 999999999999999.5,
          "upper": 1000000000000000.5,
          "membership": [
            true,
            true,
            false
          ]
        }
      },
      {
        "name": "collapsed_large_origin_extent",
        "input": {
          "center": 10000000000000000,
          "extent": 1,
          "values": []
        },
        "result": {
          "accepted": false,
          "failureClass": "unrepresentable"
        }
      },
      {
        "name": "invalid_zero_extent",
        "input": {
          "center": 0,
          "extent": 0,
          "values": []
        },
        "result": {
          "accepted": false,
          "failureClass": "invalid_extent"
        }
      }
    ]
  }
} as const);

export const NUMERIC_POLICIES = freezeGenerated({
  "cortexel_binary64_uniform_exposure_bins_v1": {
    "id": "cortexel_binary64_uniform_exposure_bins_v1",
    "revision": 1,
    "algorithm": "cortexel_binary64_nominal_interval_candidates_v1",
    "semantics": {
      "id": "cortexel_binary64_uniform_exposure_bins_semantics_v1",
      "version": "1.0",
      "status": "normative",
      "parameters": {
        "candidateAlgorithm": "cortexel_binary64_nominal_interval_candidates_v1",
        "resultNoun": "bin",
        "boundary": "[start,stop)",
        "partialIntervalPolicy": "refuse_nominal_remainder_and_nonuniform_physical_exposure",
        "intervalExposure": "require_every_exact_physical_endpoint_difference_to_equal_original_typed_width",
        "declaredCountBinding": "must_equal_interval_count",
        "coordinateSelection": "all_adjacent_emitted_edge_pairs",
        "exposureComparison": "exact_registered_unit_rational_equality_without_conversion_rounding",
        "exposureMismatchPolicy": "reject_first_mismatch"
      }
    },
    "resultNoun": "bin",
    "boundary": "[start,stop)",
    "partialIntervalPolicy": "refuse_nominal_remainder_and_nonuniform_physical_exposure",
    "intervalExposure": "require_every_exact_physical_endpoint_difference_to_equal_original_typed_width",
    "description": "First apply the nominal interval-candidate algorithm. Then, in exact registered-unit rational arithmetic with no conversion rounding, require edges[i+1]-edges[i] to equal the original typed binWidth for every emitted interval. Reject on the first mismatch. Each accepted adjacent edge pair is therefore one half-open uniform-exposure bin, and the declared binCount must equal intervalCount. This postcondition is what makes a maximum bin count sufficient authority for a peak rate."
  },
  "cortexel_binary64_nominal_steps_v1": {
    "id": "cortexel_binary64_nominal_steps_v1",
    "revision": 1,
    "algorithm": "cortexel_binary64_nominal_interval_candidates_v1",
    "semantics": {
      "id": "cortexel_binary64_nominal_steps_semantics_v1",
      "version": "1.0",
      "status": "normative",
      "parameters": {
        "candidateAlgorithm": "cortexel_binary64_nominal_interval_candidates_v1",
        "resultNoun": "sample step",
        "boundary": "[start,stop)",
        "partialIntervalPolicy": "refuse_nominal_remainder",
        "intervalExposure": "emitted_coordinates_authoritative_no_equal_exposure_claim",
        "declaredCountBinding": "must_equal_interval_count",
        "coordinateSelection": "first_interval_count_emitted_edges_excluding_stop",
        "exposureComparison": "none",
        "exposureMismatchPolicy": "not_applicable"
      }
    },
    "resultNoun": "sample step",
    "boundary": "[start,stop)",
    "partialIntervalPolicy": "refuse_nominal_remainder",
    "intervalExposure": "emitted_coordinates_authoritative_no_equal_exposure_claim",
    "description": "Apply the nominal interval-candidate algorithm to a sampled-grid step. The sampled coordinates are the first intervalCount emitted edges and exclude stop; those binary64 coordinates, not an equality claim about adjacent physical differences, are authoritative. The declared sampleCount must equal intervalCount. Consumers may evaluate a function at these coordinates but may not divide counts by the nominal step as if every interval had that exposure."
  },
  "cortexel_binary64_spatial_domain_membership_v1": {
    "id": "cortexel_binary64_spatial_domain_membership_v1",
    "revision": 1,
    "algorithm": "cortexel_binary64_spatial_domain_axis_v1",
    "semantics": {
      "id": "cortexel_binary64_spatial_domain_membership_semantics_v1",
      "version": "1.0",
      "status": "normative",
      "parameters": {
        "candidateAlgorithm": "cortexel_binary64_spatial_domain_axis_v1",
        "resultNoun": "spatial axis membership",
        "boundary": "[lower,upper]",
        "partialIntervalPolicy": "not_applicable",
        "intervalExposure": "extent_relative_membership_only_no_physical_resolution_claim",
        "declaredCountBinding": "not_applicable",
        "coordinateSelection": "each_position_against_materialized_axis",
        "exposureComparison": "exact_min_subnormal_integer_cross_multiplication",
        "exposureMismatchPolicy": "outside_closed_domain"
      }
    },
    "resultNoun": "spatial axis membership",
    "boundary": "[lower,upper]",
    "partialIntervalPolicy": "not_applicable",
    "intervalExposure": "extent_relative_membership_only_no_physical_resolution_claim",
    "description": "Apply the spatial-domain-axis algorithm independently to each canonical length axis. Its once-rounded endpoints are the published rectangle and period bounds. Each finite position is inside only under the closed exact-integer comparison with 8 epsilon times declared extent plus that endpoint's exact rounding error, whose own 32-epsilon extent cap was already enforced. Absolute centre magnitude never scales acceptance; an unrepresentable axis is refused."
  }
} as const);
export const NUMERIC_POLICY_IDS = freezeGenerated([
  "cortexel_binary64_nominal_steps_v1",
  "cortexel_binary64_spatial_domain_membership_v1",
  "cortexel_binary64_uniform_exposure_bins_v1"
] as const);
export type NumericPolicyId = (typeof NUMERIC_POLICY_IDS)[number];

/** Immutable identity algorithms, each bound to the digest of its normative registry entry. */
export const CANONICALIZATION_ALGORITHMS = freezeGenerated({
  "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1": {
    "id": "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1",
    "revision": 1,
    "status": "stable",
    "input": {
      "container": "nonempty_array",
      "itemType": "string",
      "rejectEmptyItems": true,
      "rejectDuplicates": true,
      "unicodeDomain": "well_formed_unicode"
    },
    "equality": {
      "stringEquality": "exact_unicode_sequence",
      "unicodeNormalization": "none"
    },
    "sort": {
      "order": "utf16_code_unit_lexicographic_ascending",
      "locale": "none"
    },
    "serialization": {
      "scheme": "rfc8785",
      "value": "sorted_identifier_array"
    },
    "encoding": "utf-8",
    "digest": "sha256",
    "output": "sha256_colon_64_lowercase_hex",
    "operations": [
      "validate_nonempty_array",
      "validate_nonempty_unique_well_formed_strings",
      "sort_utf16_code_units_ascending",
      "serialize_rfc8785",
      "encode_utf8",
      "digest_sha256",
      "prefix_sha256_colon_lowercase_hex"
    ],
    "conformanceVectors": [
      {
        "name": "single_identifier",
        "outcome": "accept",
        "inputEncoding": "unicode_strings",
        "input": [
          "cell-1"
        ],
        "normalizedInput": [
          "cell-1"
        ],
        "canonicalJson": "[\"cell-1\"]",
        "digest": "sha256:67195d72e6a26feedd72d3a9eda3627d4f12f1ba1f0cafd1ff8aa2347f791faf"
      },
      {
        "name": "permutation_and_numeric_suffixes",
        "outcome": "accept",
        "inputEncoding": "unicode_strings",
        "input": [
          "n7",
          "n2",
          "n6",
          "n1",
          "n5",
          "n3",
          "n4"
        ],
        "normalizedInput": [
          "n1",
          "n2",
          "n3",
          "n4",
          "n5",
          "n6",
          "n7"
        ],
        "canonicalJson": "[\"n1\",\"n2\",\"n3\",\"n4\",\"n5\",\"n6\",\"n7\"]",
        "digest": "sha256:fdb6b814de98ab8daa241acb8895573a50c4ff7e6864cef64c80b023054b29ce"
      },
      {
        "name": "utf16_astral_before_high_bmp",
        "outcome": "accept",
        "inputEncoding": "unicode_strings",
        "input": [
          "",
          "𐀀"
        ],
        "normalizedInput": [
          "𐀀",
          ""
        ],
        "canonicalJson": "[\"𐀀\",\"\"]",
        "digest": "sha256:e8bdee294d4a756532cd1660a49d7d99325bb04ec58c236f78b94ff2718d31de"
      },
      {
        "name": "no_unicode_normalization",
        "outcome": "accept",
        "inputEncoding": "unicode_strings",
        "input": [
          "é",
          "é"
        ],
        "normalizedInput": [
          "é",
          "é"
        ],
        "canonicalJson": "[\"é\",\"é\"]",
        "digest": "sha256:d056a09c651dab55ceb8f30b349ec21de471bdf5ce4a94db7f29dc9594f54ec3"
      },
      {
        "name": "json_string_escaping",
        "outcome": "accept",
        "inputEncoding": "unicode_strings",
        "input": [
          "quote\"",
          "slash\\",
          "line\n"
        ],
        "normalizedInput": [
          "line\n",
          "quote\"",
          "slash\\"
        ],
        "canonicalJson": "[\"line\\n\",\"quote\\\"\",\"slash\\\\\"]",
        "digest": "sha256:2926b92f9ea190405919eac2fa2c0a0d8b7d01bbc15252eff56686969778d0be"
      },
      {
        "name": "empty_array_rejected",
        "outcome": "reject",
        "inputEncoding": "unicode_strings",
        "input": [],
        "failureClass": "empty_set"
      },
      {
        "name": "non_array_rejected",
        "outcome": "reject",
        "inputEncoding": "json_value",
        "input": "cell-1",
        "failureClass": "not_array"
      },
      {
        "name": "non_string_identifier_rejected",
        "outcome": "reject",
        "inputEncoding": "json_value",
        "input": [
          "cell-1",
          1
        ],
        "failureClass": "non_string_identifier"
      },
      {
        "name": "empty_identifier_rejected",
        "outcome": "reject",
        "inputEncoding": "unicode_strings",
        "input": [
          ""
        ],
        "failureClass": "empty_identifier"
      },
      {
        "name": "duplicate_identifier_rejected",
        "outcome": "reject",
        "inputEncoding": "unicode_strings",
        "input": [
          "n1",
          "n1"
        ],
        "failureClass": "duplicate_identifier"
      },
      {
        "name": "lone_high_surrogate_rejected",
        "outcome": "reject",
        "inputEncoding": "utf16_code_units",
        "inputCodeUnits": [
          [
            55296
          ]
        ],
        "failureClass": "ill_formed_unicode"
      }
    ],
    "failureClasses": [
      "not_array",
      "empty_set",
      "non_string_identifier",
      "empty_identifier",
      "duplicate_identifier",
      "ill_formed_unicode"
    ],
    "entryDigest": "sha256:15a260f6a08e48e8240f28c9ab91d07354fcaaa336914d59128e8df63fca3417"
  }
} as const);
export const CANONICALIZATION_IDS = freezeGenerated([
  "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1"
] as const);
export type CanonicalizationId = (typeof CANONICALIZATION_IDS)[number];
