"""GENERATED FILE - DO NOT EDIT.

Produced by scripts/generate-contract.ts from contract/.
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

PACKAGE_VERSION: str = "0.9.0"
REQUEST_CONTRACT: str = "cortexel-figure-request/1.0"
ARTIFACT_CONTRACT: str = "cortexel-figure-artifact/1.0"
CONTRACT_DIGEST: str = "sha256:a49097fff2676ff50e0b382576f8933e252c68b4813117c93e9a0c10678e8d56"
CATALOG_DIGEST: str = "sha256:889787eb7b4efb492217e0256fab6ad3e7ed61d31522b00e91e2d16917456691"

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

ERROR_CODES: Final[tuple[str, ...]] = _freeze([
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
    "SCIENCE_COUNT_NOT_INTEGER",
    "SCIENCE_DELAY_NONPOSITIVE",
    "SCIENCE_DENOMINATOR_INVALID",
    "SCIENCE_DENSITY_DOES_NOT_INTEGRATE",
    "SCIENCE_DUPLICATE_TIME_POLICY",
    "SCIENCE_EVENT_OUT_OF_WINDOW",
    "SCIENCE_LAG_RANGE_INVALID",
    "SCIENCE_NEGATIVE_INTERVAL",
    "SCIENCE_NORMALIZATION_UNVERIFIABLE",
    "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
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
        "inlineTableRows": 500,
        "errorRecords": 32,
        "bundlePanels": 8
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
        "inlineTableRows": 200,
        "errorRecords": 32,
        "bundlePanels": 8
    }
})
