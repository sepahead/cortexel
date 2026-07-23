"""GENERATED FILE - DO NOT EDIT.

Produced by scripts/generate-contract.ts from contract/, package.json, and python/pyproject.toml.
Edit the normative source and run `bun run generate`.
"""

from collections.abc import Mapping
from types import MappingProxyType
from typing import Any, Final


def _freeze(value: Any) -> Any:
    """Recursively detach and freeze generated JSON authority."""
    if isinstance(value, dict):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(_freeze(item) for item in value)
    return value

PACKAGE_VERSION: str = "0.10.0-dev.0"
PYTHON_DISTRIBUTION_VERSION: str = "0.10.0.dev0"
REQUEST_CONTRACT: str = "cortexel-figure-request/1.0"
ARTIFACT_CONTRACT: str = "cortexel-figure-artifact/1.0"
CONTRACT_DIGEST: str = "sha256:02c8581a22d6417560cf8c6a890f25416243287b29ad7a9d5a8714915bae216e"
CATALOG_DIGEST: str = "sha256:801aa157a57212ca58b092319d57edd8ab8649a80202a8a577510ca9f7162c09"

STABLE_SKILL_IDS: Final[tuple[str, ...]] = _freeze([
    "network.adjacency_matrix",
    "network.connection_graph",
    "network.degree_distribution",
    "network.delay_distribution",
    "network.delay_matrix",
    "network.spatial_map_2d",
    "network.synaptic_weight_trace",
    "network.weight_distribution",
    "network.weight_matrix",
    "neuro.analog_trace",
    "neuro.compartment_trace",
    "neuro.correlogram",
    "neuro.isi_distribution",
    "neuro.multisignal_trace",
    "neuro.phase_plane",
    "neuro.population_rate",
    "neuro.psth",
    "neuro.response_curve",
    "neuro.spike_raster"
])

SKILL_REVISIONS: Final[Mapping[str, int]] = _freeze({
    "network.adjacency_matrix": 2,
    "network.connection_graph": 2,
    "network.degree_distribution": 2,
    "network.delay_distribution": 2,
    "network.delay_matrix": 2,
    "network.spatial_map_2d": 2,
    "network.synaptic_weight_trace": 2,
    "network.weight_distribution": 2,
    "network.weight_matrix": 2,
    "neuro.analog_trace": 2,
    "neuro.compartment_trace": 2,
    "neuro.correlogram": 2,
    "neuro.isi_distribution": 2,
    "neuro.multisignal_trace": 2,
    "neuro.phase_plane": 2,
    "neuro.population_rate": 2,
    "neuro.psth": 2,
    "neuro.response_curve": 2,
    "neuro.spike_raster": 2
})

CAPABILITY_AVAILABILITY: Final[Mapping[str, str]] = _freeze({
    "neuro.analog_trace": "packaged",
    "neuro.spike_raster": "packaged",
    "neuro.population_rate": "packaged",
    "neuro.response_curve": "packaged",
    "neuro.isi_distribution": "packaged",
    "neuro.psth": "packaged",
    "neuro.correlogram": "packaged",
    "neuro.phase_plane": "packaged",
    "neuro.multisignal_trace": "packaged",
    "neuro.compartment_trace": "packaged",
    "network.connection_graph": "packaged",
    "network.adjacency_matrix": "packaged",
    "network.weight_matrix": "packaged",
    "network.delay_matrix": "packaged",
    "network.degree_distribution": "packaged",
    "network.delay_distribution": "packaged",
    "network.weight_distribution": "packaged",
    "network.spatial_map_2d": "packaged",
    "network.synaptic_weight_trace": "packaged",
    "nest.connectivity_matrix": "unavailable",
    "nest.spatial_2d": "unavailable",
    "nest.stimulus_response": "unavailable",
    "nest.animation_replay": "unavailable",
    "cortexel": "packaged",
    "cortexel/core": "packaged",
    "cortexel/figure": "packaged",
    "cortexel/render-svg": "packaged",
    "cortexel/react": "packaged",
    "cortexel/react/charts": "packaged",
    "cortexel/react/knowledge-graph": "packaged",
    "cortexel/skills.manifest.json": "packaged",
    "cortexel/adapters/nest": "packaged",
    "cortexel/contract": "packaged",
    "cortexel/package.json": "packaged",
    "cli.identity": "packaged",
    "cli.catalog": "packaged",
    "cli.validate": "packaged",
    "cli.render": "packaged",
    "cli.inspect": "packaged",
    "cli.migrate": "packaged"
})

CAPABILITY_AVAILABILITIES: Final[tuple[str, ...]] = _freeze([
    "packaged",
    "source_only",
    "unavailable"
])

ERROR_CODES: Final[tuple[str, ...]] = _freeze([
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
])

ERROR_STAGES: Final[tuple[str, ...]] = _freeze([
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
])

UNITS: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
    "1": {
        "dimension": "dimensionless",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
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
        "dimension": "time",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "s",
        "aliases": [
            "sec",
            "seconds",
            "second"
        ]
    },
    "ms": {
        "dimension": "time",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "ms",
        "aliases": [
            "msec",
            "milliseconds",
            "millisecond"
        ]
    },
    "us": {
        "dimension": "time",
        "to_canonical": 0.000001,
        "to_canonical_decimal_exponent": -6,
        "label": "µs",
        "aliases": [
            "µs",
            "usec",
            "microseconds",
            "microsecond"
        ]
    },
    "Hz": {
        "dimension": "frequency",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "Hz",
        "aliases": [
            "hz",
            "hertz",
            "spikes/s",
            "sp/s"
        ]
    },
    "kHz": {
        "dimension": "frequency",
        "to_canonical": 1000,
        "to_canonical_decimal_exponent": 3,
        "label": "kHz",
        "aliases": [
            "khz"
        ]
    },
    "V": {
        "dimension": "voltage",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "V",
        "aliases": [
            "volt",
            "volts"
        ]
    },
    "mV": {
        "dimension": "voltage",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "mV",
        "aliases": [
            "millivolt",
            "millivolts"
        ]
    },
    "uV": {
        "dimension": "voltage",
        "to_canonical": 0.000001,
        "to_canonical_decimal_exponent": -6,
        "label": "µV",
        "aliases": [
            "µV",
            "microvolt",
            "microvolts"
        ]
    },
    "A": {
        "dimension": "current",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "A",
        "aliases": [
            "amp",
            "amps",
            "ampere"
        ]
    },
    "nA": {
        "dimension": "current",
        "to_canonical": 1e-9,
        "to_canonical_decimal_exponent": -9,
        "label": "nA",
        "aliases": [
            "nanoamp",
            "nanoampere"
        ]
    },
    "pA": {
        "dimension": "current",
        "to_canonical": 1e-12,
        "to_canonical_decimal_exponent": -12,
        "label": "pA",
        "aliases": [
            "picoamp",
            "picoampere"
        ]
    },
    "S": {
        "dimension": "conductance",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "S",
        "aliases": [
            "siemens"
        ]
    },
    "nS": {
        "dimension": "conductance",
        "to_canonical": 1e-9,
        "to_canonical_decimal_exponent": -9,
        "label": "nS",
        "aliases": [
            "nanosiemens"
        ]
    },
    "pS": {
        "dimension": "conductance",
        "to_canonical": 1e-12,
        "to_canonical_decimal_exponent": -12,
        "label": "pS",
        "aliases": [
            "picosiemens"
        ]
    },
    "mol/L": {
        "dimension": "concentration",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "M",
        "aliases": [
            "M",
            "molar"
        ]
    },
    "mmol/L": {
        "dimension": "concentration",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "mM",
        "aliases": [
            "mM",
            "millimolar"
        ]
    },
    "umol/L": {
        "dimension": "concentration",
        "to_canonical": 0.000001,
        "to_canonical_decimal_exponent": -6,
        "label": "µM",
        "aliases": [
            "µM",
            "uM",
            "micromolar"
        ]
    },
    "nmol/L": {
        "dimension": "concentration",
        "to_canonical": 1e-9,
        "to_canonical_decimal_exponent": -9,
        "label": "nM",
        "aliases": [
            "nM",
            "nanomolar"
        ]
    },
    "m": {
        "dimension": "length",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "m",
        "aliases": [
            "metre",
            "meter",
            "metres",
            "meters"
        ]
    },
    "mm": {
        "dimension": "length",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "mm",
        "aliases": [
            "millimetre",
            "millimeter"
        ]
    },
    "um": {
        "dimension": "length",
        "to_canonical": 0.000001,
        "to_canonical_decimal_exponent": -6,
        "label": "µm",
        "aliases": [
            "µm",
            "micrometre",
            "micrometer",
            "micron"
        ]
    },
    "rad": {
        "dimension": "angle",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "rad",
        "aliases": [
            "radian",
            "radians"
        ]
    },
    "deg": {
        "dimension": "angle",
        "to_canonical": 0.017453292519943295,
        "to_canonical_decimal_exponent": None,
        "label": "°",
        "aliases": [
            "degree",
            "degrees",
            "°"
        ]
    },
    "/s": {
        "dimension": "per_time",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "s⁻¹",
        "aliases": [
            "1/s",
            "s^-1"
        ]
    },
    "/ms": {
        "dimension": "per_time",
        "to_canonical": 1000,
        "to_canonical_decimal_exponent": 3,
        "label": "ms⁻¹",
        "aliases": [
            "1/ms",
            "ms^-1"
        ]
    },
    "/V": {
        "dimension": "per_voltage",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "V⁻¹",
        "aliases": [
            "1/V"
        ]
    },
    "/mV": {
        "dimension": "per_voltage",
        "to_canonical": 1000,
        "to_canonical_decimal_exponent": 3,
        "label": "mV⁻¹",
        "aliases": [
            "1/mV"
        ]
    },
    "/A": {
        "dimension": "per_current",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "A⁻¹",
        "aliases": [
            "1/A"
        ]
    },
    "/nA": {
        "dimension": "per_current",
        "to_canonical": 1000000000,
        "to_canonical_decimal_exponent": 9,
        "label": "nA⁻¹",
        "aliases": [
            "1/nA"
        ]
    },
    "/pA": {
        "dimension": "per_current",
        "to_canonical": 1000000000000,
        "to_canonical_decimal_exponent": 12,
        "label": "pA⁻¹",
        "aliases": [
            "1/pA"
        ]
    },
    "/S": {
        "dimension": "per_conductance",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "S⁻¹",
        "aliases": [
            "1/S"
        ]
    },
    "/nS": {
        "dimension": "per_conductance",
        "to_canonical": 1000000000,
        "to_canonical_decimal_exponent": 9,
        "label": "nS⁻¹",
        "aliases": [
            "1/nS"
        ]
    },
    "/m": {
        "dimension": "per_length",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "m⁻¹",
        "aliases": [
            "1/m"
        ]
    },
    "/mm": {
        "dimension": "per_length",
        "to_canonical": 1000,
        "to_canonical_decimal_exponent": 3,
        "label": "mm⁻¹",
        "aliases": [
            "1/mm"
        ]
    },
    "/um": {
        "dimension": "per_length",
        "to_canonical": 1000000,
        "to_canonical_decimal_exponent": 6,
        "label": "µm⁻¹",
        "aliases": [
            "1/um"
        ]
    },
    "/1": {
        "dimension": "per_dimensionless",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "",
        "aliases": [
            "1/1"
        ]
    },
    "nest:weight": {
        "dimension": "simulator_defined",
        "to_canonical": None,
        "to_canonical_decimal_exponent": None,
        "label": "weight (NEST)",
        "aliases": []
    },
    "nest:delay": {
        "dimension": "time",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "ms",
        "aliases": []
    }
})

UNIT_ALIASES: Final[Mapping[str, str]] = _freeze({
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
})

QUANTITY_KIND_DIMENSIONS: Final[Mapping[str, tuple[str, ...]]] = _freeze({
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
})

NUMERIC_ALGORITHMS: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
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
                    "accepted": True,
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
                    "accepted": True,
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
                    "accepted": True,
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
                    "accepted": True,
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
                    "accepted": True,
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
                    "accepted": False,
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
                    "accepted": True,
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
                    "accepted": False,
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
                    "accepted": False,
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
                    "accepted": False,
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
                    "accepted": False,
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
                    "accepted": False,
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
                    "accepted": False,
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
                    "accepted": False,
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
                    "accepted": True,
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
                    "accepted": True,
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
                    "accepted": False,
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
                    "accepted": True,
                    "lower": -1,
                    "upper": 1,
                    "membership": [
                        True,
                        True,
                        False
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
                    "accepted": True,
                    "lower": 39.8,
                    "upper": 40.2,
                    "membership": [
                        True,
                        True,
                        True
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
                    "accepted": True,
                    "lower": 999999999999999.5,
                    "upper": 1000000000000000.5,
                    "membership": [
                        True,
                        True,
                        False
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
                    "accepted": False,
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
                    "accepted": False,
                    "failureClass": "invalid_extent"
                }
            }
        ]
    }
})

NUMERIC_POLICIES: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
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
})

CANONICALIZATION_ALGORITHMS: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
    "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1": {
        "id": "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1",
        "revision": 1,
        "status": "stable",
        "input": {
            "container": "nonempty_array",
            "itemType": "string",
            "rejectEmptyItems": True,
            "rejectDuplicates": True,
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
})

BUDGET_PROFILES: Final[Mapping[str, Mapping[str, int]]] = _freeze({
    "standard": {
        "rawInputBytes": 33554432,
        "jsonDepth": 64,
        "jsonTotalNodes": 1000000,
        "jsonStringLength": 65536,
        "jsonNumberTokenLength": 64,
        "jsonObjectKeys": 4096,
        "jsonArrayItems": 2000000,
        "observationsPerSeries": 250000,
        "observationsPerRequest": 2000000,
        "graphNodes": 100000,
        "graphEdges": 200000,
        "matrixCells": 16000000,
        "pairwiseOperations": 50000000,
        "visibleMarks": 100000,
        "svgTextNodes": 20000,
        "svgBytes": 20971520,
        "sidecarBytes": 104857600,
        "returnedTableRows": 500,
        "errorRecords": 32
    },
    "agent": {
        "rawInputBytes": 4194304,
        "jsonDepth": 32,
        "jsonTotalNodes": 200000,
        "jsonStringLength": 8192,
        "jsonNumberTokenLength": 64,
        "jsonObjectKeys": 1024,
        "jsonArrayItems": 200000,
        "observationsPerSeries": 50000,
        "observationsPerRequest": 200000,
        "graphNodes": 20000,
        "graphEdges": 50000,
        "matrixCells": 1000000,
        "pairwiseOperations": 5000000,
        "visibleMarks": 25000,
        "svgTextNodes": 5000,
        "svgBytes": 5242880,
        "sidecarBytes": 20971520,
        "returnedTableRows": 200,
        "errorRecords": 32
    }
})
