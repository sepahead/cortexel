"""Independent structural and semantic validation.

This is a genuinely independent second implementation: it does not call Node, does not
import generated JavaScript, and does not depend on a shared JSON Schema library. It
reads the same normative schemas the TypeScript side reads and reaches the same
accept/reject decision — which is what makes cross-language parity meaningful rather than
circular.

The current private development reader implements the structural subset the contract
actually uses (type, required, additionalProperties, enum, const, oneOf/anyOf/allOf,
if/then/else/not,
$ref within the shared schemas, numeric/string/array/object bounds, and pattern) plus
the load-bearing semantic rules: the caller-authority boundary, unit-dimension matching,
an exact spike-raster event-window/source-clock evaluator, an independent PSTH
count/exposure/normalization/baseline evaluator, and an independent response-curve
evaluator for rate-denominator authority, exact integer count-to-rate audits, kernel
identity, and binary64 peak-grid materialization. The remaining semantic validators are
ported incrementally.
"""

from __future__ import annotations

import math
import re
import sys
from collections.abc import Mapping, Sequence
from fractions import Fraction
from importlib.resources import files
from importlib.resources.abc import Traversable
from typing import Any, NotRequired, Optional, TypeAlias, TypeGuard, TypedDict
from urllib.parse import unquote

from .generated.catalog import (
    BUDGET_PROFILES,
    ERROR_STAGES,
    QUANTITY_KIND_DIMENSIONS,
    REQUEST_CONTRACT,
    SKILL_REVISIONS,
    UNITS,
    UNIT_ALIASES,
)
from .parse_json import parse_json_strict


def _contract_root() -> Traversable:
    """Return the package-owned schema projection without consulting the CWD."""
    return files("cortexel").joinpath("contract")


def _split_contract_identity(value: str) -> tuple[str, str]:
    match = re.fullmatch(
        r"([a-z][a-z0-9-]*)/((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))",
        value,
    )
    if match is None:
        raise RuntimeError("REQUEST_CONTRACT is not a canonical contract-name/major.minor identity")
    return match.group(1), match.group(2)


_REQUEST_CONTRACT_NAME, _REQUEST_CONTRACT_VERSION = _split_contract_identity(REQUEST_CONTRACT)


JsonNumber: TypeAlias = int | float
JsonRecord: TypeAlias = dict[str, object]
JsonArray: TypeAlias = list[object]
JsonSequence: TypeAlias = Sequence[object]
ErrorList: TypeAlias = list["CortexelError"]


class IntervalMaterialization(TypedDict):
    accepted: bool
    failureClass: NotRequired[str]
    intervalCount: NotRequired[int]
    edges: NotRequired[tuple[float, ...]]


class ResponseEventScope(TypedDict):
    kind: str
    selectionId: str
    selectedEventTrainCount: int
    recordedSenderCount: Optional[int]
    membershipKind: str


class SnapshotState(TypedDict):
    limits: Mapping[str, int]
    nodes: int
    ancestors: set[int]


class CortexelError:
    def __init__(
        self,
        code: str,
        stage: str,
        instance_path: str,
        message: str,
        *,
        severity: str = "error",
        omitted_count: Optional[int] = None,
        validator_id: Optional[str] = None,
    ) -> None:
        self.code = code
        self.stage = stage
        self.instance_path = instance_path
        self.message = message
        self.severity = severity
        self.omitted_count = omitted_count
        self.validator_id = validator_id

    def as_dict(self) -> dict[str, object]:
        result: dict[str, object] = {
            "code": self.code,
            "stage": self.stage,
            "instancePath": self.instance_path,
            "message": self.message,
            "severity": self.severity,
        }
        if self.omitted_count is not None:
            result["omittedCount"] = self.omitted_count
        if self.validator_id is not None:
            result["validatorId"] = self.validator_id
        return result


# The fields only Cortexel may author — mirror of the TypeScript denylist. A caller who
# sets one is authoring a conclusion, which the contract permits nobody to do.
_LIBRARY_AUTHORED = {
    "artifact", "artifactDigest", "buildIdentity", "canonicalRequest", "inputAssurance",
    "validation", "derivation", "budgetDecision", "assurance", "assurances", "attestations",
    "disclosures", "render", "accessibility", "outputs", "catalogDigest",
    "calibrated_posterior", "calibratedPosterior", "advisory_only", "advisoryOnly",
    "is_paper_local_evidence", "isPaperLocalEvidence", "honesty", "trustedEnvelope",
    "verified", "certified", "validated", "reproduced", "conformant",
    "referenceComparison", "sourceContentVerified", "signatureVerified",
}

_MAX_SAFE_INTEGER = (1 << 53) - 1
_STANDARD_LIMITS = BUDGET_PROFILES["standard"]
_MAX_ERROR_RECORDS = int(_STANDARD_LIMITS["errorRecords"])
_DANGEROUS_KEYS = {"__proto__", "constructor", "prototype"}
# Closed mirror of the direct `$defs/unitCode` property names in the common and
# stable skill request schemas.  Do not infer unit semantics from an arbitrary
# suffix such as "Unit": `observationUnit`, for example, is a categorical policy.
_UNIT_CODE_PROPERTY_NAMES = ("alignmentUnit", "unit", "valueUnit")

_schema_cache: dict[str, JsonRecord] = {}


def _unicode_code_point_sort_key(value: str) -> str:
    """Make the registry's Unicode-code-point ordering explicit.

    Python compares ``str`` values lexicographically by Unicode scalar value. Keeping
    this as a named key prevents an accidental switch to UTF-8/UTF-16 byte ordering and
    mirrors the explicit scalar comparator used by TypeScript.
    """
    return value


def _finalize_errors(errors: ErrorList) -> ErrorList:
    """Sort and apply the sole normative 32-record diagnostic budget."""
    stage_order = {stage: index for index, stage in enumerate(ERROR_STAGES)}
    ordered = sorted(
        errors,
        key=lambda error: (
            stage_order.get(error.stage, len(stage_order)),
            _unicode_code_point_sort_key(error.instance_path),
            _unicode_code_point_sort_key(error.code),
            _unicode_code_point_sort_key(error.validator_id or ""),
        ),
    )
    if len(ordered) <= _MAX_ERROR_RECORDS:
        return ordered

    kept = ordered[:_MAX_ERROR_RECORDS - 1]
    omitted = len(ordered) - len(kept)
    kept.append(CortexelError(
        "ERROR_LIMIT_REACHED",
        "internal",
        "",
        f"{omitted} further diagnostics were suppressed by the diagnostic budget. "
        "Fix the reported errors and revalidate.",
        severity="warning",
        omitted_count=omitted,
    ))
    return kept


def _load_schema(relative: str) -> JsonRecord:
    if relative not in _schema_cache:
        # Every caller supplies a generator-owned relative path. Keeping the path
        # segmented also avoids platform-dependent interpretation of '/' inside a
        # Traversable implementation.
        resource = _contract_root().joinpath(*relative.split("/"))
        if not resource.is_file():
            raise RuntimeError(f"packaged schema {relative!r} is missing")
        loaded = parse_json_strict(resource.read_text(encoding="utf-8"))
        if not isinstance(loaded, dict):
            raise RuntimeError(f"packaged schema {relative!r} is not a JSON object")
        _schema_cache[relative] = loaded
    return _schema_cache[relative]


def _resolve_ref(
    ref: str,
    document_root: Optional[JsonRecord],
) -> tuple[Any, JsonRecord]:
    """Resolve a ``$ref`` and retain the resource that owns its fragment.

    Resolution is offline and closed over the packaged schema set.  A fragment-only
    reference is relative to the CURRENT schema resource, not implicitly to the common
    schema.  That distinction matters now that a skill schema may carry local ``$defs``;
    it also keeps nested fragment references inside an externally referenced common
    definition rooted in common.v1 rather than jumping back to the calling skill.
    """
    base, _, pointer = ref.partition("#")
    if base == "":
        if document_root is None:
            raise ValueError("a fragment-only $ref requires its containing schema resource")
        root: Any = document_root
    else:
        common = _load_schema("schemas/common.v1.schema.json")
        registry = _load_schema("schemas/generated/registry-enums.v1.schema.json")
        if base == common.get("$id"):
            root = common
        elif base == registry.get("$id"):
            root = registry
        else:
            raise ValueError(f"unsupported offline schema reference base: {base!r}")
    pointer = unquote(pointer)
    if pointer != "" and not pointer.startswith("/"):
        # The packaged request schemas use JSON Pointer fragments, not `$anchor`.
        # Refusing an unsupported anchor is safer than accidentally treating its
        # name as a root object member.
        raise ValueError(f"unsupported offline schema anchor fragment: {pointer!r}")
    node: Any = root
    tokens = [] if pointer == "" else pointer[1:].split("/")
    for raw_token in tokens:
        token = raw_token.replace("~1", "/").replace("~0", "~")
        if isinstance(node, list):
            if not re.fullmatch(r"0|[1-9][0-9]*", token):
                raise ValueError(f"invalid array index in schema JSON Pointer: {token!r}")
            node = node[int(token)]
        else:
            node = node[token]
    return node, root


def _pointer(*segments: object) -> str:
    if not segments:
        return ""
    return "".join(
        "/" + str(s).replace("~", "~0").replace("/", "~1") for s in segments
    )


class _SnapshotFailure(Exception):
    """Internal non-throwing control flow for one materialized-boundary diagnostic."""

    def __init__(self, diagnostic: CortexelError) -> None:
        super().__init__(diagnostic.code)
        self.diagnostic = diagnostic


def _snapshot_fail(code: str, path: str, message: str) -> None:
    raise _SnapshotFailure(CortexelError(code, "snapshot", path, message))


def _validate_snapshot_string(
    value: str,
    path: str,
    limit: int,
    *,
    member_name: bool = False,
) -> None:
    """Validate Unicode and the JS code-unit budget in one bounded pass."""
    code_units = 0
    for character in value:
        code_point = ord(character)
        if 0xD800 <= code_point <= 0xDFFF:
            _snapshot_fail(
                "SNAPSHOT_MALFORMED_STRING",
                path,
                "an object member name contains a lone surrogate"
                if member_name
                else "the string contains a lone surrogate and is not well-formed Unicode",
            )
        code_units += 2 if code_point > 0xFFFF else 1
        if code_units > limit:
            _snapshot_fail(
                "SNAPSHOT_STRING_TOO_LONG",
                path,
                "an object member name is longer than the snapshot permits"
                if member_name
                else "the string is longer than the snapshot permits",
            )


def _snapshot_node(
    value: Any,
    path: str,
    depth: int,
    state: SnapshotState,
) -> Any:
    """Detach one exact built-in JSON value without invoking caller overrides."""
    limits = state["limits"]
    if depth > limits["jsonDepth"]:
        _snapshot_fail(
            "SNAPSHOT_DEPTH_EXCEEDED",
            path,
            "the value nests deeper than the snapshot permits",
        )

    state["nodes"] += 1
    if state["nodes"] > limits["jsonTotalNodes"]:
        _snapshot_fail(
            "SNAPSHOT_NODES_EXCEEDED",
            path,
            "the value graph exceeds the total node limit",
        )

    value_type = type(value)
    if value is None or value_type is bool:
        return value
    if value_type is int:
        if abs(value) > _MAX_SAFE_INTEGER:
            _snapshot_fail(
                "SNAPSHOT_INTEGER_OUT_OF_RANGE",
                path,
                "the host integer is outside the interoperable exact range",
            )
        return value
    if value_type is float:
        if not math.isfinite(value):
            _snapshot_fail(
                "SNAPSHOT_NON_FINITE_NUMBER",
                path,
                "NaN and Infinity are not measurements",
            )
        return value
    if value_type is str:
        _validate_snapshot_string(value, path, limits["jsonStringLength"])
        return value

    if value_type not in (list, dict):
        # An exact-type check happens before any method/property access. In particular,
        # a dict/list subclass cannot run an overridden ``items``, ``get`` or iterator.
        code = "SNAPSHOT_UNSUPPORTED_TYPE" if callable(value) else "SNAPSHOT_NON_PLAIN_OBJECT"
        _snapshot_fail(
            code,
            path,
            "only exact built-in JSON values are accepted at the materialized boundary",
        )

    object_id = id(value)
    ancestors = state["ancestors"]
    if object_id in ancestors:
        _snapshot_fail(
            "SNAPSHOT_CIRCULAR_REFERENCE",
            path,
            "the value graph contains a cycle",
        )

    ancestors.add(object_id)
    try:
        if value_type is list:
            length = list.__len__(value)
            if length > limits["jsonArrayItems"]:
                _snapshot_fail(
                    "SNAPSHOT_NODES_EXCEEDED",
                    path,
                    "the array is longer than the snapshot permits",
                )
            return [
                _snapshot_node(
                    list.__getitem__(value, index),
                    path + _pointer(index),
                    depth + 1,
                    state,
                )
                for index in range(length)
            ]

        if dict.__len__(value) > limits["jsonObjectKeys"]:
            _snapshot_fail(
                "SNAPSHOT_NODES_EXCEEDED",
                path,
                "the object has more members than the snapshot permits",
            )
        detached = {}
        for key, child in dict.items(value):
            if type(key) is not str:
                _snapshot_fail(
                    "SNAPSHOT_UNSUPPORTED_TYPE",
                    path,
                    "a JSON object member name must be an exact built-in string",
                )
            _validate_snapshot_string(
                key,
                path,
                limits["jsonStringLength"],
                member_name=True,
            )
            child_path = path + _pointer(key)
            if key in _DANGEROUS_KEYS:
                _snapshot_fail(
                    "SNAPSHOT_DANGEROUS_KEY",
                    child_path,
                    "the member name can reach an object prototype and is rejected",
                )
            detached[key] = _snapshot_node(child, child_path, depth + 1, state)
        return detached
    finally:
        ancestors.remove(object_id)


def _snapshot_materialized(
    value: Any,
    limits: Optional[Mapping[str, int]] = None,
) -> tuple[Any, Optional[CortexelError]]:
    """Total, detached Python counterpart of TypeScript's safe snapshot boundary."""
    state: SnapshotState = {
        "limits": _STANDARD_LIMITS if limits is None else limits,
        "nodes": 0,
        "ancestors": set(),
    }
    try:
        return _snapshot_node(value, "", 0, state), None
    except _SnapshotFailure as error:
        return None, error.diagnostic
    except Exception:
        # Never inspect or stringify an unexpected exception: it may originate in an
        # exotic host value. The public boundary stays total and fails closed.
        return None, CortexelError(
            "INTERNAL_INVARIANT_VIOLATED",
            "internal",
            "",
            "the materialized-value snapshot failed unexpectedly",
        )


def _json_equal(left: Any, right: Any) -> bool:
    """JSON Schema equality, without Python's ``True == 1`` collapse."""
    if isinstance(left, bool) or isinstance(right, bool):
        return isinstance(left, bool) and isinstance(right, bool) and left == right
    if (
        isinstance(left, (int, float)) and not isinstance(left, bool) and
        isinstance(right, (int, float)) and not isinstance(right, bool)
    ):
        return left == right
    if left is None or right is None:
        return left is None and right is None
    if isinstance(left, str) or isinstance(right, str):
        return isinstance(left, str) and isinstance(right, str) and left == right
    if isinstance(left, list) or isinstance(right, list):
        return (
            isinstance(left, list) and isinstance(right, list) and
            len(left) == len(right) and
            all(_json_equal(a, b) for a, b in zip(left, right))
        )
    if isinstance(left, dict) or isinstance(right, dict):
        return (
            isinstance(left, dict) and isinstance(right, dict) and
            left.keys() == right.keys() and
            all(_json_equal(left[key], right[key]) for key in left)
        )
    return bool(left == right)


def _schema_matches(
    value: Any,
    schema: Any,
    path: str,
    document_root: Optional[JsonRecord],
) -> bool:
    local: ErrorList = []
    _validate_schema(value, schema, path, local, document_root)
    return not local


def _is_json_integer(value: object) -> TypeGuard[JsonNumber]:
    """Draft 2020-12 integer: a JSON number with zero fractional part."""
    return (
        isinstance(value, int) and not isinstance(value, bool)
    ) or (
        isinstance(value, float) and math.isfinite(value) and value.is_integer()
    )


def _is_finite_json_number(value: object) -> TypeGuard[JsonNumber]:
    """Narrow one JSON number while excluding Python's bool-as-int subtype."""
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _validate_schema(
    value: Any,
    schema: Any,
    path: str,
    errors: ErrorList,
    document_root: Optional[JsonRecord] = None,
) -> None:
    if document_root is None and isinstance(schema, dict):
        document_root = schema
    if schema is True:
        return
    if schema is False:
        errors.append(CortexelError(
            "SCHEMA_VALIDATION_FAILED", "structural", path,
            "the value is forbidden by the schema"
        ))
        return
    if not isinstance(schema, dict):
        errors.append(CortexelError(
            "SCHEMA_VALIDATION_FAILED", "structural", path,
            "the contract contains a malformed schema node"
        ))
        return

    if "$ref" in schema:
        resolved, resolved_root = _resolve_ref(schema["$ref"], document_root)
        _validate_schema(value, resolved, path, errors, resolved_root)
        # Draft 2020-12 applies siblings of $ref as well.

    if "const" in schema:
        if not _json_equal(value, schema["const"]):
            errors.append(CortexelError("SCHEMA_ENUM_MISMATCH", "structural", path,
                                        f"expected the constant {schema['const']!r}"))

    if "enum" in schema:
        if not any(_json_equal(value, candidate) for candidate in schema["enum"]):
            errors.append(CortexelError("SCHEMA_ENUM_MISMATCH", "structural", path,
                                        "the value is outside the closed enumeration"))

    if "oneOf" in schema:
        branch_errors: ErrorList = []
        matched = 0
        for branch in schema["oneOf"]:
            one_of_errors: ErrorList = []
            _validate_schema(value, branch, path, one_of_errors, document_root)
            if not one_of_errors:
                matched += 1
            else:
                branch_errors.extend(one_of_errors)
        if matched == 0:
            # Surface every branch failure; the single global diagnostic finalizer is
            # the only layer permitted to truncate, and emits ERROR_LIMIT_REACHED.
            errors.extend(branch_errors or [
                CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                              "the value matched no oneOf branch")
            ])
        elif matched != 1:
            errors.append(CortexelError(
                "SCHEMA_VALIDATION_FAILED", "structural", path,
                f"the value matched {matched} oneOf branches; exactly one is required"
            ))

    if "anyOf" in schema:
        branch_errors = []
        matched = 0
        for branch in schema["anyOf"]:
            any_of_errors: ErrorList = []
            _validate_schema(value, branch, path, any_of_errors, document_root)
            if not any_of_errors:
                matched += 1
            else:
                branch_errors.extend(any_of_errors)
        if matched == 0:
            errors.extend(branch_errors or [
                CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                              "the value matched no anyOf branch")
            ])

    if "allOf" in schema:
        for branch in schema["allOf"]:
            _validate_schema(value, branch, path, errors, document_root)

    if "not" in schema and _schema_matches(value, schema["not"], path, document_root):
        errors.append(CortexelError(
            "SCHEMA_VALIDATION_FAILED", "structural", path,
            "the value matched a schema it is required not to match"
        ))

    if "if" in schema:
        if _schema_matches(value, schema["if"], path, document_root):
            if "then" in schema:
                conditional_errors: ErrorList = []
                _validate_schema(
                    value, schema["then"], path, conditional_errors, document_root
                )
                if conditional_errors:
                    errors.extend(conditional_errors)
                    # Ajv reports both the actionable branch failure and its selected
                    # `if` keyword failure. Preserve that stable generic parent record
                    # so independent diagnostic corpora compare exactly.
                    errors.append(CortexelError(
                        "SCHEMA_VALIDATION_FAILED",
                        "structural",
                        path,
                        "the selected then branch failed structural validation",
                    ))
        elif "else" in schema:
            conditional_errors = []
            _validate_schema(
                value, schema["else"], path, conditional_errors, document_root
            )
            if conditional_errors:
                errors.extend(conditional_errors)
                errors.append(CortexelError(
                    "SCHEMA_VALIDATION_FAILED",
                    "structural",
                    path,
                    "the selected else branch failed structural validation",
                ))

    expected_type = schema.get("type")
    if expected_type:
        types = expected_type if isinstance(expected_type, list) else [expected_type]
        if not _type_matches(value, types):
            errors.append(CortexelError("SCHEMA_TYPE_MISMATCH", "structural", path,
                                        f"expected {expected_type}"))
            return

    if isinstance(value, dict):
        properties = schema.get("properties", {})
        for req in schema.get("required", []):
            if req not in value:
                errors.append(CortexelError("SCHEMA_REQUIRED_PROPERTY_MISSING", "structural",
                                            _pointer(req)[1:] and path + _pointer(req),
                                            f"'{req}' is required"))
        if schema.get("additionalProperties") is False:
            for key in value:
                if key not in properties:
                    errors.append(CortexelError("SCHEMA_UNKNOWN_PROPERTY", "structural",
                                                path + _pointer(key),
                                                f"'{key}' is not a property this contract defines"))
        for key, child_schema in properties.items():
            if key in value:
                _validate_schema(
                    value[key], child_schema, path + _pointer(key), errors, document_root
                )
        if "minProperties" in schema and len(value) < schema["minProperties"]:
            errors.append(CortexelError(
                "SCHEMA_VALIDATION_FAILED", "structural", path,
                f"expected at least {schema['minProperties']} properties"
            ))

    elif isinstance(value, list):
        item_schema = schema.get("items")
        if item_schema:
            for index, item in enumerate(value):
                _validate_schema(
                    item, item_schema, path + _pointer(index), errors, document_root
                )
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"expected at least {schema['minItems']} items"))
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"expected at most {schema['maxItems']} items"))

    elif isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"string is shorter than minLength {schema['minLength']}"))
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"string exceeds maxLength {schema['maxLength']}"))
        if "pattern" in schema and re.search(schema["pattern"], value) is None:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        "string does not match the required pattern"))

    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"below minimum {schema['minimum']}"))
        if "exclusiveMinimum" in schema and value <= schema["exclusiveMinimum"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"not above exclusiveMinimum {schema['exclusiveMinimum']}"))
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"above maximum {schema['maximum']}"))
        if "exclusiveMaximum" in schema and value >= schema["exclusiveMaximum"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"not below exclusiveMaximum {schema['exclusiveMaximum']}"))


def _type_matches(value: Any, types: list[Any]) -> bool:
    for t in types:
        if t == "object" and isinstance(value, dict):
            return True
        if t == "array" and isinstance(value, list):
            return True
        if t == "string" and isinstance(value, str):
            return True
        if t == "boolean" and isinstance(value, bool):
            return True
        if t == "null" and value is None:
            return True
        if t == "integer":
            if _is_json_integer(value):
                return True
        if t == "number" and isinstance(value, (int, float)) and not isinstance(value, bool):
            return True
    return False


def _find_authored(node: Any, path: str, errors: ErrorList, depth: int = 0) -> None:
    if depth > 64 or not isinstance(node, (dict, list)):
        return
    if isinstance(node, list):
        for i, item in enumerate(node):
            _find_authored(item, path + _pointer(i), errors, depth + 1)
        return
    for key, child in node.items():
        if key in _LIBRARY_AUTHORED:
            errors.append(CortexelError(
                "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN", "provenance", path + _pointer(key),
                f"'{key}' is a fact Cortexel generates, not one a caller may declare"))
            continue
        _find_authored(child, path + _pointer(key), errors, depth + 1)


def _collect_quantities(
    node: Any,
    path: str,
    out: list[tuple[str, str, str]],
) -> None:
    """Find every registered ``{kind, unit}`` quantity with its parent path."""
    if not isinstance(node, (dict, list)):
        return
    pending = [(node, path)]
    while pending:
        current, current_path = pending.pop()
        if isinstance(current, list):
            for i in range(len(current) - 1, -1, -1):
                child = current[i]
                if isinstance(child, (dict, list)):
                    pending.append((child, current_path + _pointer(i)))
            continue
        kind = current.get("kind")
        unit = current.get("unit")
        if (
            isinstance(unit, str) and isinstance(kind, str) and
            kind in QUANTITY_KIND_DIMENSIONS
        ):
            out.append((kind, unit, current_path))
        for key, child in reversed(list(current.items())):
            if isinstance(child, (dict, list)):
                pending.append((child, current_path + _pointer(key)))


def _collect_bare_units(
    node: Any,
    path: str,
    out: list[tuple[str, str]],
) -> None:
    """Find closed scalar unit-code fields not owned by quantity validation."""
    if not isinstance(node, (dict, list)):
        return
    pending = [(node, path)]
    while pending:
        current, current_path = pending.pop()
        if isinstance(current, list):
            for i in range(len(current) - 1, -1, -1):
                child = current[i]
                if isinstance(child, (dict, list)):
                    pending.append((child, current_path + _pointer(i)))
            continue
        kind = current.get("kind")
        for property_name in _UNIT_CODE_PROPERTY_NAMES:
            unit = current.get(property_name)
            if not isinstance(unit, str):
                continue
            if (
                property_name == "unit" and isinstance(kind, str) and
                kind in QUANTITY_KIND_DIMENSIONS
            ):
                continue
            out.append((unit, current_path + _pointer(property_name)))
        for key, child in reversed(list(current.items())):
            if isinstance(child, (dict, list)):
                pending.append((child, current_path + _pointer(key)))


_TIME_BIN_SKILLS = frozenset({
    "network.delay_distribution",
    "neuro.correlogram",
    "neuro.isi_distribution",
    "neuro.population_rate",
    "neuro.psth",
})
_TIME_PREBINNED_SKILLS = frozenset({
    "neuro.correlogram",
    "neuro.population_rate",
})


def _record(value: object) -> Optional[JsonRecord]:
    return value if isinstance(value, dict) else None


def _array(value: object) -> Optional[JsonArray]:
    return value if isinstance(value, list) else None


def _legal_known_unit(node: Optional[JsonRecord]) -> Optional[str]:
    """Return a canonical unit only when a neighbouring quantity kind permits it."""
    if node is None:
        return None
    unit = node.get("unit")
    if not isinstance(unit, str) or unit not in UNITS:
        return None
    kind = node.get("kind")
    if isinstance(kind, str) and kind in QUANTITY_KIND_DIMENSIONS:
        dimension = UNITS[unit]["dimension"]
        if dimension not in QUANTITY_KIND_DIMENSIONS[kind]:
            return None
    return unit


def _unit_has_dimension(value: object, dimension: str) -> TypeGuard[str]:
    """Narrow a canonical physical unit at a semantic relation boundary."""
    entry = UNITS.get(value) if isinstance(value, str) else None
    actual_dimension = entry.get("dimension") if entry is not None else None
    return (
        isinstance(value, str)
        and isinstance(actual_dimension, str)
        and actual_dimension == dimension
    )


def _registered_unit_dimension(unit: str) -> str:
    """Read one generated invariant without allowing an untyped registry value through."""
    entry = UNITS.get(unit)
    dimension = entry.get("dimension") if entry is not None else None
    if not isinstance(dimension, str):
        raise RuntimeError(f"generated unit {unit!r} has no string dimension")
    return dimension


def _units_can_share_bound_axis(source_unit: str, target_unit: str) -> bool:
    """Mirror the portable conversion relation, including opaque simulator units."""
    source_dimension = _registered_unit_dimension(source_unit)
    target_dimension = _registered_unit_dimension(target_unit)
    if source_dimension == "simulator_defined" or target_dimension == "simulator_defined":
        return source_unit == target_unit
    return source_dimension == target_dimension


def _axes_are_compatible(source_unit: str, target_unit: str) -> bool:
    """Return true only for physical axes in one registered dimension."""
    source_dimension = _registered_unit_dimension(source_unit)
    target_dimension = _registered_unit_dimension(target_unit)
    return (
        source_dimension != "simulator_defined" and
        target_dimension != "simulator_defined" and
        source_dimension == target_dimension
    )


def _reciprocal_unit(unit: str) -> Optional[str]:
    """Return the registry's exact reciprocal code, never a dimension-only guess."""
    candidate = f"/{unit}"
    return candidate if candidate in UNITS else None


def _contextual_unit_error(path: str, message: str) -> CortexelError:
    return CortexelError(
        "SCIENCE_UNIT_DIMENSION_MISMATCH",
        "science",
        path,
        message,
        validator_id="unit.dimension_match",
    )


def _require_time_unit(
    node: Optional[JsonRecord],
    path: str,
    meaning: str,
) -> ErrorList:
    unit = node.get("unit") if node is not None else None
    if not isinstance(unit, str) or unit not in UNITS:
        return []
    dimension = UNITS[unit]["dimension"]
    if dimension == "time":
        return []
    return [_contextual_unit_error(
        path + "/unit",
        f"{meaning} is a time interval and cannot carry unit {unit!r} "
        f"(dimension {dimension})",
    )]


def _require_scalar_time_unit(unit: Any, path: str, meaning: str) -> ErrorList:
    if not isinstance(unit, str) or unit not in UNITS:
        return []
    dimension = UNITS[unit]["dimension"]
    if dimension == "time":
        return []
    return [_contextual_unit_error(
        path,
        f"{meaning} is a time-unit selector and cannot carry {unit!r} "
        f"(dimension {dimension})",
    )]


def _bind_uncertainty_unit(
    errors: ErrorList,
    uncertainty: Optional[JsonRecord],
    values: Optional[JsonRecord],
    path: str,
    label: str,
) -> None:
    uncertainty_unit = _legal_known_unit(uncertainty)
    value_unit = _legal_known_unit(values)
    if (
        uncertainty_unit is None or value_unit is None or
        _units_can_share_bound_axis(uncertainty_unit, value_unit)
    ):
        return
    errors.append(_contextual_unit_error(
        path + "/unit",
        f"{label} is in {uncertainty_unit!r} but qualifies values in {value_unit!r}",
    ))


def _legal_synaptic_weight_axis_unit(node: Optional[JsonRecord]) -> Optional[str]:
    """Return a canonical unit from the closed synaptic-weight dimension family."""
    if node is None:
        return None
    unit = node.get("unit")
    if not isinstance(unit, str) or unit not in UNITS:
        return None
    dimension = UNITS[unit]["dimension"]
    return (
        unit
        if dimension in QUANTITY_KIND_DIMENSIONS["synaptic_weight"]
        else None
    )


def _bind_weight_trace_axis_carrier(
    errors: ErrorList,
    carrier: Optional[JsonRecord],
    target_unit: Optional[str],
    path: str,
    label: str,
) -> None:
    """Mirror one weight-trace carrier's relation to the first series' axis.

    Canonical-code and quantity-kind validation retain sole ownership of aliases,
    unknown codes, and individually illegal dimensions.  This relation runs only
    when both endpoints are legal synaptic-weight carriers, then applies the
    portable conversion rule: physical units may differ only within a dimension,
    while simulator-defined units require exact code identity.
    """
    source_unit = _legal_known_unit(carrier)
    if (
        source_unit is None or target_unit is None or
        _units_can_share_bound_axis(source_unit, target_unit)
    ):
        return
    errors.append(CortexelError(
        "SCIENCE_UNIT_DIMENSION_MISMATCH",
        "science",
        path + "/unit",
        f"{label} in {source_unit!r} cannot be placed on the {target_unit!r} "
        "weight axis; simulator-defined units require exact code identity",
        validator_id="weight_trace.observation_kind_declared",
    ))


def _validate_contextual_units(request: JsonRecord, errors: ErrorList) -> None:
    """Independent mirror of the schema-context relations in unit.dimension_match."""
    skill = _record(request.get("skill")) or {}
    raw_skill_id = skill.get("id")
    skill_id = raw_skill_id if isinstance(raw_skill_id, str) else None
    data = _record(request.get("data")) or {}
    parameters = _record(request.get("parameters")) or {}

    # Bare time axes use structural records without a registered quantity kind.
    errors.extend(_require_time_unit(_record(data.get("window")), "/data/window", "analysis window"))
    # The independent PSTH and response-curve ports below already own these paths.
    # Keeping them out of this fallback avoids two diagnostics for one relation.
    if skill_id != "neuro.psth":
        errors.extend(_require_time_unit(
            _record(data.get("relativeWindow")),
            "/data/relativeWindow",
            "relative analysis window",
        ))
    if skill_id != "neuro.response_curve":
        errors.extend(_require_time_unit(
            _record(data.get("measurementWindow")),
            "/data/measurementWindow",
            "measurement window",
        ))
    errors.extend(_require_time_unit(
        _record(parameters.get("lagRange")), "/parameters/lagRange", "lag range"
    ))
    normalization = _record(parameters.get("normalization")) or {}
    errors.extend(_require_time_unit(
        _record(normalization.get("statisticsWindow")),
        "/parameters/normalization/statisticsWindow",
        "normalization statistics window",
    ))
    if skill_id in _TIME_BIN_SKILLS and skill_id != "neuro.psth":
        errors.extend(_require_time_unit(
            _record(parameters.get("bins")), "/parameters/bins", "bin axis"
        ))
    if skill_id in _TIME_PREBINNED_SKILLS:
        errors.extend(_require_time_unit(
            _record(data.get("binEdges")), "/data/binEdges", "pre-binned axis"
        ))
    if skill_id != "neuro.psth":
        errors.extend(_require_scalar_time_unit(
            data.get("alignmentUnit"), "/data/alignmentUnit", "event-alignment unit"
        ))

    if skill_id == "network.synaptic_weight_trace":
        series = _array(data.get("series")) or []
        first_series = _record(series[0]) if series else None
        target_value_unit = _legal_synaptic_weight_axis_unit(
            _record(first_series.get("values")) if first_series is not None else None
        )
        for index, candidate in enumerate(series):
            entry = _record(candidate)
            if entry is None:
                continue
            errors.extend(_require_time_unit(
                _record(entry.get("recordedInterval")),
                f"/data/series/{index}/recordedInterval",
                f"series {index}'s recordedInterval",
            ))
            values = _record(entry.get("values"))
            value_unit = _legal_known_unit(values)
            initial_weight = _record(entry.get("initialWeight")) or {}
            bounds = _record(entry.get("bounds")) or {}
            references = (
                (
                    _record(initial_weight.get("quantity")),
                    f"/data/series/{index}/initialWeight/quantity",
                    "initial weight",
                ),
                (
                    _record(bounds.get("lower")),
                    f"/data/series/{index}/bounds/lower",
                    "lower bound",
                ),
                (
                    _record(bounds.get("upper")),
                    f"/data/series/{index}/bounds/upper",
                    "upper bound",
                ),
            )
            if value_unit is not None:
                for reference, reference_path, label in references:
                    reference_unit = _legal_known_unit(reference)
                    if (
                        reference_unit is None or
                        _units_can_share_bound_axis(reference_unit, value_unit)
                    ):
                        continue
                    errors.append(_contextual_unit_error(
                        reference_path + "/unit",
                        f"series {index}'s {label} is in {reference_unit!r} but its "
                        f"observed weights are in {value_unit!r}",
                    ))

            _bind_weight_trace_axis_carrier(
                errors,
                values,
                target_value_unit,
                f"/data/series/{index}/values",
                "weight observation",
            )
            for reference, reference_path, label in references:
                _bind_weight_trace_axis_carrier(
                    errors,
                    reference,
                    target_value_unit,
                    reference_path,
                    f"declared {label}",
                )

            uncertainty = _record(entry.get("uncertainty"))
            uncertainty_kind = (
                uncertainty.get("kind") if uncertainty is not None else None
            )
            if uncertainty_kind in {"standard_deviation", "standard_error"}:
                _bind_weight_trace_axis_carrier(
                    errors,
                    uncertainty,
                    target_value_unit,
                    f"/data/series/{index}/uncertainty",
                    "uncertainty values",
                )
            elif uncertainty is not None and uncertainty_kind not in {None, "none"}:
                # Interval/range uncertainty has two independently materialized
                # carriers.  TypeScript reports each failed relation even though
                # both repair at the shared unit declaration.
                for key in ("lower", "upper"):
                    _bind_weight_trace_axis_carrier(
                        errors,
                        uncertainty,
                        target_value_unit,
                        f"/data/series/{index}/uncertainty",
                        f"uncertainty {key}",
                    )
        errors.extend(_require_time_unit(
            _record(data.get("membership")), "/data/membership", "aggregate membership"
        ))

        aggregate = _record(data.get("aggregate"))
        aggregate_values = (
            _record(aggregate.get("values")) if aggregate is not None else None
        )
        aggregate_target_unit = _legal_synaptic_weight_axis_unit(aggregate_values)
        aggregate_uncertainty = (
            _record(aggregate.get("uncertainty")) if aggregate is not None else None
        )
        aggregate_uncertainty_kind = (
            aggregate_uncertainty.get("kind")
            if aggregate_uncertainty is not None
            else None
        )
        if aggregate_uncertainty_kind in {"standard_deviation", "standard_error"}:
            _bind_weight_trace_axis_carrier(
                errors,
                aggregate_uncertainty,
                aggregate_target_unit,
                "/data/aggregate/uncertainty",
                "uncertainty values",
            )
        elif (
            aggregate_uncertainty is not None and
            aggregate_uncertainty_kind not in {None, "none"}
        ):
            for key in ("lower", "upper"):
                _bind_weight_trace_axis_carrier(
                    errors,
                    aggregate_uncertainty,
                    aggregate_target_unit,
                    "/data/aggregate/uncertainty",
                    f"uncertainty {key}",
                )

    if skill_id == "network.weight_distribution":
        if data.get("mode") == "prebinned":
            bin_edges = _record(data.get("binEdges"))
            unit = bin_edges.get("unit") if bin_edges is not None else None
            if isinstance(unit, str) and unit in UNITS:
                dimension = UNITS[unit]["dimension"]
                if dimension not in QUANTITY_KIND_DIMENSIONS["synaptic_weight"]:
                    errors.append(_contextual_unit_error(
                        "/data/binEdges/unit",
                        f"pre-binned weight edges use {unit!r} ({dimension}), which is not "
                        "a registered synaptic-weight dimension",
                    ))
        elif data.get("mode") == "connections":
            bins = _record(parameters.get("bins"))
            bin_unit = bins.get("unit") if bins is not None else None
            connections = _record(data.get("connections")) or {}
            weight_unit = _legal_known_unit(_record(connections.get("weights")))
            if (
                isinstance(bin_unit, str) and bin_unit in UNITS and
                weight_unit is not None and
                not _units_can_share_bound_axis(bin_unit, weight_unit)
            ):
                errors.append(_contextual_unit_error(
                    "/parameters/bins/unit",
                    f"connection-weight bins in {bin_unit!r} cannot represent "
                    f"observed weights in {weight_unit!r}",
                ))

    # A density unit is not merely any reciprocal dimension: it is the exact
    # reciprocal code of the bin axis.  For example, values over ms bins require
    # /ms, not /s with unchanged numbers.  Run only when both carriers are
    # individually legal so an alias/unknown/kind defect retains one owner.
    if parameters.get("normalization") == "density":
        histogram = _record(data.get("histogram"))
        histogram_unit = _legal_known_unit(histogram)
        bin_edges = _record(data.get("binEdges"))
        bins = _record(parameters.get("bins"))
        bin_unit = (
            bin_edges.get("unit") if bin_edges is not None
            else bins.get("unit") if bins is not None
            else None
        )
        if not isinstance(bin_unit, str) or bin_unit not in UNITS:
            bin_unit_is_legal = False
            expected_unit = None
        else:
            if skill_id in {"network.delay_distribution", "neuro.isi_distribution"}:
                bin_unit_is_legal = UNITS[bin_unit]["dimension"] == "time"
            elif skill_id == "network.weight_distribution":
                bin_unit_is_legal = (
                    UNITS[bin_unit]["dimension"] in
                    QUANTITY_KIND_DIMENSIONS["synaptic_weight"]
                )
            else:
                bin_unit_is_legal = False
            expected_unit = _reciprocal_unit(bin_unit) if bin_unit_is_legal else None
        if bin_unit_is_legal and expected_unit is None and histogram_unit is not None:
            # The output-authority evaluator cannot compile a density when the
            # closed registry provides no exact reciprocal for an otherwise legal
            # axis (for example us or nest:delay). Mirror that final render-boundary
            # decision rather than accepting a dimension-only substitute.
            errors.append(CortexelError(
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "science",
                "/data",
                f"density requires a registered reciprocal unit for {bin_unit}",
            ))
        elif (
            expected_unit is not None and histogram_unit is not None and
            histogram_unit != expected_unit
        ):
            errors.append(CortexelError(
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "science",
                "/data/histogram/unit",
                f"a density over bins in {bin_unit!r} requires the exact registered "
                f"reciprocal unit {expected_unit!r}; got {histogram_unit!r}",
                validator_id="histogram.normalization_consistent",
            ))

    if skill_id == "neuro.multisignal_trace":
        series = _array(data.get("series")) or []
        panels = _array(parameters.get("panels")) or []
        normalized = parameters.get("layout") == "normalized_overlay"
        for panel_index, candidate in enumerate(panels):
            panel = _record(candidate)
            if panel is None:
                continue
            panel_id = panel.get("panelId")
            panel_unit = _legal_known_unit(panel)
            if not isinstance(panel_id, str) or panel_unit is None:
                continue
            members = []
            for series_index, series_candidate in enumerate(series):
                entry = _record(series_candidate)
                if entry is None or entry.get("panelId") != panel_id:
                    continue
                unit = _legal_known_unit(_record(entry.get("values")))
                if unit is not None:
                    members.append((series_index, unit))
            if normalized:
                for series_index, unit in members:
                    if UNITS[unit]["dimension"] == "simulator_defined":
                        errors.append(_contextual_unit_error(
                            f"/data/series/{series_index}/values/unit",
                            f"normalized series {series_index} uses opaque simulator unit {unit!r}",
                        ))
                continue
            simulator_members = [
                member for member in members
                if UNITS[member[1]]["dimension"] == "simulator_defined"
            ]
            if simulator_members and len(members) != 1:
                errors.append(_contextual_unit_error(
                    f"/parameters/panels/{panel_index}/unit",
                    f"panel {panel_id!r} mixes an opaque simulator unit with "
                    f"{len(members)} total series",
                ))
                continue
            for series_index, unit in members:
                if _units_can_share_bound_axis(unit, panel_unit):
                    continue
                errors.append(_contextual_unit_error(
                    f"/parameters/panels/{panel_index}/unit",
                    f"panel {panel_id!r} in {panel_unit!r} cannot display series "
                    f"{series_index} in {unit!r}",
                ))
                break

    if skill_id == "neuro.phase_plane":
        axes = _record(data.get("axes")) or {}
        trajectories = _record(data.get("trajectories")) or {}
        vector_field = _record(data.get("vectorField")) or {}
        field_domain = _record(vector_field.get("domain")) or {}
        nullclines = _record(data.get("nullclines")) or {}
        fixed_points = _record(data.get("fixedPoints")) or {}
        for coordinate in ("x", "y"):
            axis_unit = _legal_known_unit(_record(axes.get(coordinate)))
            if axis_unit is None:
                continue
            carriers = (
                (_record(trajectories.get(coordinate)), f"/data/trajectories/{coordinate}"),
                (_record(vector_field.get(coordinate)), f"/data/vectorField/{coordinate}"),
                (_record(field_domain.get(coordinate)), f"/data/vectorField/domain/{coordinate}"),
                (_record(nullclines.get(coordinate)), f"/data/nullclines/{coordinate}"),
                (_record(fixed_points.get(coordinate)), f"/data/fixedPoints/{coordinate}"),
            )
            for carrier, carrier_path in carriers:
                carrier_unit = _legal_known_unit(carrier)
                if (
                    carrier_unit is None or
                    _units_can_share_bound_axis(carrier_unit, axis_unit)
                ):
                    continue
                errors.append(_contextual_unit_error(
                    carrier_path + "/unit",
                    f"phase-plane {coordinate}-axis unit {axis_unit!r} is incompatible "
                    f"with carrier unit {carrier_unit!r}",
                ))

    if skill_id == "neuro.multisignal_trace":
        series = _array(data.get("series")) or []
        for index, candidate in enumerate(series):
            entry = _record(candidate) or {}
            _bind_uncertainty_unit(
                errors,
                _record(entry.get("uncertainty")),
                _record(entry.get("values")),
                f"/data/series/{index}/uncertainty",
                f"series {index}'s uncertainty",
            )
    elif skill_id == "network.synaptic_weight_trace":
        series = _array(data.get("series")) or []
        for index, candidate in enumerate(series):
            entry = _record(candidate) or {}
            _bind_uncertainty_unit(
                errors,
                _record(entry.get("uncertainty")),
                _record(entry.get("values")),
                f"/data/series/{index}/uncertainty",
                f"series {index}'s uncertainty",
            )
        aggregate = _record(data.get("aggregate")) or {}
        _bind_uncertainty_unit(
            errors,
            _record(aggregate.get("uncertainty")),
            _record(aggregate.get("values")),
            "/data/aggregate/uncertainty",
            "aggregate uncertainty",
        )
    elif skill_id in {"neuro.analog_trace", "neuro.compartment_trace"}:
        uncertainty = _record(parameters.get("uncertainty"))
        series = _array(data.get("series")) or []
        for index, candidate in enumerate(series):
            entry = _record(candidate) or {}
            previous_error_count = len(errors)
            _bind_uncertainty_unit(
                errors,
                uncertainty,
                _record(entry.get("values")),
                "/parameters/uncertainty",
                f"figure uncertainty for series {index}",
            )
            # The figure-level declaration has one repair target even when several
            # series prove it incompatible.
            if len(errors) > previous_error_count:
                break


def _validate_trace_axis_units(request: JsonRecord, errors: ErrorList) -> None:
    """Independent unit-only port of ``trace.axis_dimension_compatible``."""
    skill = _record(request.get("skill")) or {}
    skill_id = skill.get("id")
    data = _record(request.get("data")) or {}
    parameters = _record(request.get("parameters")) or {}
    series = data.get("series")
    if not isinstance(series, list) or not series:
        return
    if parameters.get("layout") in {"small_multiples", "normalized_overlay"}:
        return

    units = []
    for index, candidate in enumerate(series):
        entry = _record(candidate)
        values = _record(entry.get("values")) if entry is not None else None
        declared_unit = values.get("unit") if values is not None else None
        if not isinstance(declared_unit, str):
            continue
        unit = _legal_known_unit(values)
        # The canonical/kind owner rejects this carrier.  A shared-axis relation
        # cannot silently remove it and validate a different set of participants.
        if unit is None:
            return
        units.append((index, unit))
    if not units:
        return

    target_unit = parameters.get("valueUnit")
    if isinstance(target_unit, str) and target_unit in UNITS:
        for index, unit in units:
            if unit == target_unit or _units_can_share_bound_axis(unit, target_unit):
                continue
            errors.append(CortexelError(
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "science",
                "/parameters/valueUnit",
                f"valueUnit {target_unit!r} cannot display series {index} in "
                f"{unit!r}; a shared axis may convert scale, never dimension",
                validator_id="trace.axis_dimension_compatible",
            ))
            return

    if len(units) < 2:
        return
    first_index, first_unit = units[0]

    if (
        skill_id == "network.synaptic_weight_trace" and
        UNITS[first_unit]["dimension"] == "simulator_defined" and
        all(unit == first_unit for _, unit in units)
    ):
        comparability = _record(parameters.get("weightComparability")) or {}
        models = [
            entry.get("synapseModel")
            for entry in series
            if isinstance(entry, dict) and isinstance(entry.get("synapseModel"), str)
        ]
        distinct_models = set(models)
        declared_models = comparability.get("comparableModels")
        declared_set = (
            {model for model in declared_models if isinstance(model, str)}
            if isinstance(declared_models, list)
            else set()
        )
        mode = comparability.get("mode")
        claim_matches = (
            mode == "single_synapse_model" and len(distinct_models) == 1
        ) or (
            mode == "declared_comparable_models" and
            declared_set == distinct_models
        )
        if len(models) == len(series) and claim_matches:
            return
        errors.append(CortexelError(
            "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
            "science",
            "/parameters/weightComparability",
            "simulator-defined synaptic weights may share an axis only when the "
            "declared model-comparability claim exactly matches every series model",
            validator_id="trace.axis_dimension_compatible",
        ))
        return

    for index, unit in units[1:]:
        # The all-opaque weight exception above is the only cross-series license
        # for a simulator-defined code. Once one series differs, even two remaining
        # nest:weight codes cannot establish a pairwise physical comparison.
        if _axes_are_compatible(unit, first_unit):
            continue
        errors.append(CortexelError(
            "SCIENCE_UNIT_DIMENSION_MISMATCH",
            "science",
            f"/data/series/{index}/values/unit",
            f"series {index} in {unit!r} cannot share an axis with series "
            f"{first_index} in {first_unit!r}",
            validator_id="trace.axis_dimension_compatible",
        ))
        return


def _validate_units(request: JsonRecord, errors: ErrorList) -> None:
    """Independent port of unit.canonical_code and unit.dimension_match.

    An accepted alias is rejected (never silently converted); a unit whose dimension does
    not match its quantity kind is rejected. This is the same decision the TypeScript
    semantic validators make, implemented independently here.
    """
    quantities: list[tuple[str, str, str]] = []
    bare_units: list[tuple[str, str]] = []
    # Traverse the closed envelope so future reviewed common types cannot place a
    # unit outside today's data/parameters branches and silently evade the mirror.
    _collect_quantities(request, "", quantities)
    _collect_bare_units(request, "", bare_units)

    for kind, unit, path in quantities:
        unit_path = path + _pointer("unit")
        if unit not in UNITS:
            if unit in UNIT_ALIASES:
                errors.append(CortexelError(
                    "SCIENCE_UNIT_ALIAS_NOT_CANONICAL", "science", unit_path,
                    f"'{unit}' is an accepted alias, not a canonical code; use '{UNIT_ALIASES[unit]}'"))
            else:
                errors.append(CortexelError(
                    "SCHEMA_ENUM_MISMATCH", "structural", unit_path,
                    f"'{unit}' is not a unit code in the registry"))
            continue
        dimension = UNITS[unit]["dimension"]
        allowed = QUANTITY_KIND_DIMENSIONS.get(kind, ())
        if dimension not in allowed:
            errors.append(CortexelError(
                "SCIENCE_UNIT_DIMENSION_MISMATCH", "science", unit_path,
                f"kind '{kind}' cannot carry unit '{unit}' (dimension {dimension})"))

    for unit, unit_path in bare_units:
        if unit in UNITS:
            continue
        if unit in UNIT_ALIASES:
            errors.append(CortexelError(
                "SCIENCE_UNIT_ALIAS_NOT_CANONICAL", "science", unit_path,
                f"'{unit}' is an accepted alias, not a canonical code; use '{UNIT_ALIASES[unit]}'"))
        else:
            errors.append(CortexelError(
                "SCHEMA_ENUM_MISMATCH", "structural", unit_path,
                f"'{unit}' is not a unit code in the registry"))

    _validate_contextual_units(request, errors)
    _validate_trace_axis_units(request, errors)


def _unit_scale(unit: str) -> Fraction:
    """Exact registered-unit scale to the canonical unit, independent of TypeScript."""
    entry = UNITS.get(unit) if isinstance(unit, str) else None
    if entry is None or entry.get("to_canonical") is None:
        # This helper is below a hostile-input boundary.  Callers normally establish
        # the unit relation first, but a sibling semantic validator must not turn an
        # already-actionable alias/unknown/dimension diagnostic into KeyError or
        # TypeError merely because semantic validators accumulate independently.
        raise ValueError("exact scaling requires a registered physical unit")
    exponent = entry.get("to_canonical_decimal_exponent")
    if exponent is not None:
        if exponent >= 0:
            return Fraction(10 ** exponent, 1)
        return Fraction(1, 10 ** (-exponent))
    return Fraction.from_float(float(entry["to_canonical"]))


def _convert_binary64(value: float, source_unit: str, target_unit: str) -> float:
    source = UNITS.get(source_unit) if isinstance(source_unit, str) else None
    target = UNITS.get(target_unit) if isinstance(target_unit, str) else None
    if (
        source is None or target is None or
        source.get("to_canonical") is None or target.get("to_canonical") is None
    ):
        raise ValueError("conversion requires two registered physical units")
    if source["dimension"] != target["dimension"]:
        raise ValueError("cross-dimension conversion")
    exact = Fraction.from_float(value) * _unit_scale(source_unit) / _unit_scale(target_unit)
    converted = float(exact)
    if not math.isfinite(converted) or (value != 0.0 and converted == 0.0):
        raise ValueError("unrepresentable conversion")
    return converted


def _spike_raster_source_clock_errors(
    request: JsonRecord,
    window: JsonRecord,
    event_times: JsonRecord,
) -> ErrorList:
    """Bind an origin-relative NEST clock to the profile admitted by revision 2.

    The schema owns the shape of the origin-relative window.  These checks own the
    cross-object provenance claim: a caller may use that source-specific clock only
    when the request consistently identifies the supported NEST serialization.  This
    does not authenticate the digest or reconstruct NEST's hidden integer-tic clock.
    """
    if window.get("kind") != "nest_recording_device_origin_relative":
        return []

    source = request.get("source")
    if not isinstance(source, dict):
        source = {}
    data = request.get("data")
    if not isinstance(data, dict):
        data = {}
    version = source.get("systemVersion")
    digest = source.get("sourceDigest")
    checks = (
        (
            source.get("kind") == "simulation",
            "/source/kind",
            "a NEST origin-relative event clock requires source.kind = simulation.",
        ),
        (
            source.get("system") == "NEST",
            "/source/system",
            "a NEST origin-relative event clock requires source.system = NEST exactly.",
        ),
        (
            isinstance(version, str) and
            re.fullmatch(r"3\.(?:9|10)(?:\.[0-9]+)?", version) is not None,
            "/source/systemVersion",
            "the revision-2 serialized clock profile admits only NEST 3.9, 3.9.x, "
            "3.10, or 3.10.x without a prerelease suffix.",
        ),
        (
            isinstance(digest, str) and
            re.fullmatch(r"sha256:[0-9a-f]{64}", digest) is not None,
            "/source/sourceDigest",
            "the exported recorder object must be bound by a full lowercase "
            "sha256: sourceDigest.",
        ),
        (
            window.get("recordingBackend") == "memory",
            "/data/window/recordingBackend",
            "revision 2 admits only the NEST memory recording backend.",
        ),
        (
            window.get("timeEncoding") == "native_binary64_ms",
            "/data/window/timeEncoding",
            "revision 2 admits only native_binary64_ms (time_in_steps=false), "
            "not reconstructed step/offset clocks.",
        ),
        (
            event_times.get("unit") == "ms",
            "/data/eventTimes/unit",
            "a NEST native-binary64 memory clock must retain its serialized event unit ms.",
        ),
        (
            data.get("timeBase") == "absolute_clock",
            "/data/timeBase",
            "a NEST origin-relative recorder clock is an absolute source clock and "
            "cannot be relabelled trial_relative.",
        ),
    )
    return [
        CortexelError(
            "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
            "provenance",
            path,
            message,
        )
        for valid, path, message in checks
        if not valid
    ]


def _validate_spike_raster(request: JsonRecord, errors: ErrorList) -> None:
    """Independent exact event-window evaluator for spike-raster revision 2.

    Every submitted finite binary64 is decoded to a :class:`Fraction` before unit
    scaling, endpoint addition, or comparison.  Consequently no rounded unit
    conversion and no tolerance can move an event across a declared boundary.
    """
    data = request.get("data")
    parameters = request.get("parameters")
    if not isinstance(data, dict) or not isinstance(parameters, dict):
        return
    window = data.get("window")
    event_times = data.get("eventTimes")
    if not isinstance(window, dict) or not isinstance(event_times, dict):
        return

    window_unit = window.get("unit")
    event_unit = event_times.get("unit")
    if (
        isinstance(window_unit, str) and
        window_unit in UNITS and
        UNITS[window_unit]["dimension"] != "time"
    ):
        # `_validate_contextual_units` owns the bare window relation for every
        # skill. This specialized evaluator must stop before exact scaling without
        # repeating that already-actionable diagnostic at the same repair path.
        return

    origin_relative = (
        window.get("kind") == "nest_recording_device_origin_relative"
    )
    start = window.get("start")
    stop = window.get("stop")
    origin = window.get("origin") if origin_relative else 0
    if not (
        _is_finite_json_number(start)
        and _is_finite_json_number(stop)
        and _is_finite_json_number(origin)
    ):
        # The host-number and structural gates own malformed/non-finite inputs.
        return

    start_fraction = Fraction.from_float(float(start))
    stop_fraction = Fraction.from_float(float(stop))
    source_clock_errors = _spike_raster_source_clock_errors(
        request, window, event_times
    )
    if stop_fraction <= start_fraction:
        errors.append(CortexelError(
            "SCIENCE_WINDOW_INVALID",
            "science",
            "/data/window/stop",
            f"the observation window is empty or inverted (start {start}, stop {stop}). "
            "It must satisfy start < stop.",
        ))
        # Membership has no meaning until the author supplies a real interval. Source
        # provenance is an independent validator, however, and must not be suppressed by
        # this scientific-window error.
        errors.extend(source_clock_errors)
        return

    if not (
        isinstance(window_unit, str) and window_unit in UNITS and
        isinstance(event_unit, str) and event_unit in UNITS
    ):
        errors.extend(source_clock_errors)
        return
    if (
        UNITS[window_unit]["dimension"] != "time" or
        UNITS[event_unit]["dimension"] != "time"
    ):
        # The canonical-code and dimension validators own these errors.
        errors.extend(source_clock_errors)
        return

    window_scale = _unit_scale(window_unit)
    origin_fraction = Fraction.from_float(float(origin))
    lower = (origin_fraction + start_fraction) * window_scale
    upper = (origin_fraction + stop_fraction) * window_scale

    if origin_relative:
        # The renderer must materialize each exact origin-relative endpoint once in
        # the declared window unit.  Refuse overflow or a binary64 collapse instead
        # of drawing a zero-width interval that the exact clock says is non-empty.
        try:
            displayed_start = float(lower / window_scale)
            displayed_stop = float(upper / window_scale)
        except OverflowError:
            displayed_start = math.inf
            displayed_stop = math.inf
        if (
            not math.isfinite(displayed_start) or
            not math.isfinite(displayed_stop) or
            not displayed_stop > displayed_start
        ):
            errors.append(CortexelError(
                "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
                "science",
                "/data/window/stop",
                "the exact NEST endpoints origin + start and origin + stop do not "
                f"remain finite and strictly ordered when rounded once into {window_unit} "
                "for display. Preserve a better-scaled clock segment; Cortexel will "
                "not draw a collapsed interval.",
            ))
            errors.extend(source_clock_errors)
            return

    values = event_times.get("values")
    if not isinstance(values, list):
        errors.extend(source_clock_errors)
        return
    boundary = (
        "(origin+start,origin+stop]"
        if origin_relative
        else window.get("boundary")
    )
    open_start = boundary in (
        "(start,stop]",
        "(origin+start,origin+stop]",
    )
    closed_stop = boundary in (
        "[start,stop]",
        "(start,stop]",
        "(origin+start,origin+stop]",
    )

    event_scale = _unit_scale(event_unit)
    outside = 0
    first_index = -1
    for index, value in enumerate(values):
        if (
            not isinstance(value, (int, float)) or
            isinstance(value, bool) or
            not math.isfinite(value)
        ):
            # Structural and host-number validation own this input.
            continue
        event = Fraction.from_float(float(value)) * event_scale
        before_start = event <= lower if open_start else event < lower
        beyond_stop = event > upper if closed_stop else event >= upper
        if before_start or beyond_stop:
            outside += 1
            if first_index < 0:
                first_index = index

    if outside > 0 and parameters.get("outOfWindowPolicy") != "exclude_and_disclose":
        description = (
            f"(origin {origin} + start {start}, origin {origin} + stop {stop}] {window_unit}"
            if origin_relative
            else f"{boundary} with start {start}, stop {stop} {window_unit}"
        )
        errors.append(CortexelError(
            "SCIENCE_EVENT_OUT_OF_WINDOW",
            "science",
            f"/data/eventTimes/values/{first_index}",
            f"{outside} of {len(values)} events fall outside the declared window "
            f"{description} under exact comparison with the event clock in {event_unit}. "
            "Widen the window or choose exclude_and_disclose; Cortexel will not quietly "
            "ignore an observation you supplied.",
        ))
    errors.extend(source_clock_errors)


def _nearest_integer_ties_positive_infinity(value: float) -> int:
    """Nearest integer for a non-negative binary64, with exact half ties upward."""
    lower_integer = math.floor(value)
    return lower_integer + (1 if value - lower_integer >= 0.5 else 0)


def _materialize_width_intervals(
    start: float,
    stop: float,
    width: float,
) -> IntervalMaterialization:
    """Independent evaluator for cortexel_binary64_nominal_interval_candidates_v1.

    This deliberately does not share the TypeScript helper. Python Fraction preserves the
    exact submitted binary64 values; conversion back to float supplies the independently
    rounded IEEE-754 result used by the normative bounded decimal-intent rule.
    """
    converted_inputs = []
    for value in (start, stop, width):
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            return {"accepted": False, "failureClass": "nonfinite"}
        try:
            converted = float(value)
        except (OverflowError, TypeError, ValueError):
            return {"accepted": False, "failureClass": "nonfinite"}
        if not math.isfinite(converted):
            return {"accepted": False, "failureClass": "nonfinite"}
        # An arbitrary-precision host integer is not a submitted binary64 number when
        # conversion changes it. The raw JSON boundary already prevents this case, but
        # the independent evaluator remains a total fail-closed function on direct use.
        if isinstance(value, int) and int(converted) != value:
            return {"accepted": False, "failureClass": "nonfinite"}
        converted_inputs.append(converted)
    start, stop, width = converted_inputs
    start = 0.0 if start == 0.0 else start
    stop = 0.0 if stop == 0.0 else stop
    if not (width > 0.0 and stop > start):
        return {"accepted": False, "failureClass": "invalid_range"}

    span = Fraction.from_float(stop) - Fraction.from_float(start)
    width_fraction = Fraction.from_float(width)
    try:
        ratio = float(span / width_fraction)
    except OverflowError:
        return {"accepted": False, "failureClass": "too_many"}
    except ZeroDivisionError:
        return {"accepted": False, "failureClass": "invalid_range"}
    if not math.isfinite(ratio):
        return {"accepted": False, "failureClass": "too_many"}
    if ratio == 0.0:
        return {"accepted": False, "failureClass": "non_tiling"}
    count = _nearest_integer_ties_positive_infinity(ratio)
    tolerance = 8.0 * sys.float_info.epsilon * max(1.0, abs(ratio))
    if abs(ratio - count) > tolerance:
        return {"accepted": False, "failureClass": "non_tiling"}
    if count < 1:
        return {"accepted": False, "failureClass": "non_tiling"}
    if count > 100_000 or count > _MAX_SAFE_INTEGER:
        return {"accepted": False, "failureClass": "too_many"}

    edges = [start]
    previous = start
    for index in range(1, count):
        exact_edge = Fraction.from_float(start) + index * width_fraction
        try:
            edge = float(exact_edge)
        except OverflowError:
            return {"accepted": False, "failureClass": "unrepresentable"}
        if exact_edge != 0 and edge == 0.0:
            return {"accepted": False, "failureClass": "unrepresentable"}
        if not math.isfinite(edge) or not (edge > previous and edge < stop):
            return {"accepted": False, "failureClass": "unrepresentable"}
        edges.append(edge)
        previous = edge

    reconstructed_exact = Fraction.from_float(start) + count * width_fraction
    try:
        reconstructed = float(reconstructed_exact)
    except OverflowError:
        return {"accepted": False, "failureClass": "unrepresentable"}
    if not math.isfinite(reconstructed):
        return {"accepted": False, "failureClass": "unrepresentable"}
    endpoint_tolerance = 8.0 * sys.float_info.epsilon * max(
        1.0, abs(start), abs(stop), abs(reconstructed)
    )
    if abs(reconstructed - stop) > endpoint_tolerance:
        return {"accepted": False, "failureClass": "non_tiling"}
    edges.append(stop)
    return {
        "accepted": True,
        "intervalCount": count,
        "edges": tuple(edges),
    }


def _materialized_width_count(start: float, stop: float, width: float) -> Optional[int]:
    result = _materialize_width_intervals(start, stop, width)
    return int(result["intervalCount"]) if result["accepted"] else None


def _is_rounded_aggregate_count_rate_in_unit(
    value: Any,
    integer_factor: Any,
    estimator_denominator: Any,
    duration_value: Any,
    duration_unit: Any,
    rate_unit: Any,
) -> bool:
    """Independent exact-lattice evaluator for binned-count firing rates.

    If ``T`` is the unknown integer total behind the estimator, the submitted numeric
    rate in ``rate_unit`` must be the one-round binary64 value of

        T / (integer_factor * estimator_denominator
             * duration_in_seconds * rate_unit_in_hertz).

    The exact inverse image of the submitted binary64 value is rational. Because the
    forward map is positive and linear in ``T``, only floor/ceil of that inverse point
    can lie in the value's contiguous round-to-nearest interval. The maximum admissible
    total is also tested because the inverse point may sit just above the finite count
    domain while the boundary total still rounds to the submitted value.
    """
    if (
        not isinstance(value, (int, float)) or isinstance(value, bool) or
        not math.isfinite(value) or value < 0 or
        not _is_json_integer(integer_factor) or
        not (1 <= int(integer_factor) <= _MAX_SAFE_INTEGER) or
        not _is_json_integer(estimator_denominator) or
        not (1 <= int(estimator_denominator) <= _MAX_SAFE_INTEGER) or
        not isinstance(duration_value, (int, float)) or isinstance(duration_value, bool) or
        not math.isfinite(duration_value) or not (duration_value > 0) or
        not isinstance(duration_unit, str) or
        not isinstance(rate_unit, str) or
        duration_unit not in UNITS or rate_unit not in UNITS or
        UNITS[duration_unit]["dimension"] != "time" or
        UNITS[rate_unit]["dimension"] != "frequency"
    ):
        return False

    integer_factor = int(integer_factor)
    estimator_denominator = int(estimator_denominator)
    canonical_value = 0.0 if value == 0 else float(value)
    duration = Fraction.from_float(float(duration_value)) * _unit_scale(duration_unit)
    rate_scale = _unit_scale(rate_unit)
    if duration <= 0 or rate_scale <= 0:
        return False

    inverse = (
        Fraction.from_float(canonical_value) *
        integer_factor *
        estimator_denominator *
        duration *
        rate_scale
    )
    floor_total = inverse.numerator // inverse.denominator
    maximum_total = estimator_denominator * _MAX_SAFE_INTEGER
    for total in {floor_total, floor_total + 1, maximum_total}:
        if total < 0 or total > maximum_total:
            continue
        try:
            rounded = _derive_exact_aggregate_count_rate_in_unit(
                total,
                integer_factor,
                estimator_denominator,
                duration_value,
                duration_unit,
                rate_unit,
            )
        except (OverflowError, ValueError):
            continue
        if rounded == canonical_value:
            return True
    return False


def _derive_exact_aggregate_count_rate_in_unit(
    count_total: Any,
    integer_factor: Any,
    estimator_denominator: Any,
    duration_value: Any,
    duration_unit: Any,
    rate_unit: Any,
) -> float:
    """Independent Fraction evaluator for one-round count-level rate derivation."""
    if (
        not isinstance(count_total, int) or isinstance(count_total, bool) or
        count_total < 0 or
        not _is_json_integer(integer_factor) or
        not (1 <= int(integer_factor) <= _MAX_SAFE_INTEGER) or
        not _is_json_integer(estimator_denominator) or
        not (1 <= int(estimator_denominator) <= _MAX_SAFE_INTEGER) or
        count_total > int(estimator_denominator) * _MAX_SAFE_INTEGER or
        not isinstance(duration_value, (int, float)) or isinstance(duration_value, bool) or
        not math.isfinite(duration_value) or not (duration_value > 0) or
        not isinstance(duration_unit, str) or
        not isinstance(rate_unit, str) or
        duration_unit not in UNITS or rate_unit not in UNITS or
        UNITS[duration_unit]["dimension"] != "time" or
        UNITS[rate_unit]["dimension"] != "frequency"
    ):
        raise ValueError("invalid exact aggregate count-rate authority")
    duration = Fraction.from_float(float(duration_value)) * _unit_scale(duration_unit)
    rate_scale = _unit_scale(rate_unit)
    exact_rate = (
        Fraction(count_total, int(integer_factor) * int(estimator_denominator)) /
        duration /
        rate_scale
    )
    rounded = float(exact_rate)
    if not math.isfinite(rounded):
        raise OverflowError("exact aggregate count rate overflowed binary64")
    if count_total != 0 and rounded == 0.0:
        raise ValueError("exact aggregate count rate underflowed binary64")
    return rounded


_PSTH_VALUE_TOLERANCE = 1e-12
_PSTH_MAX_EVENTS = 2_000_000
_PSTH_MAX_BINS = 100_000
_PSTH_MAX_IDENTITIES = 100_000
_PSTH_RATE_NORMALIZATIONS = {
    "total_event_rate_per_trial",
    "mean_rate_per_selected_sender_per_trial",
}


def _psth_error(errors: ErrorList, code: str, path: str, message: str) -> None:
    stage = "budget" if code.startswith("RESOURCE_") else "science"
    errors.append(CortexelError(code, stage, path, message))


def _psth_exact_binary64(value: Fraction, *, reject_underflow: bool = True) -> float:
    """Round one exact rational to binary64, rejecting overflow and material underflow."""
    try:
        rounded = float(value)
    except OverflowError as error:
        raise OverflowError("exact PSTH value overflowed binary64") from error
    if not math.isfinite(rounded):
        raise OverflowError("exact PSTH value overflowed binary64")
    if reject_underflow and value != 0 and rounded == 0.0:
        raise ValueError("exact PSTH value underflowed binary64")
    return rounded


def _psth_exact_unit_sum(terms: list[tuple[float, str]], target_unit: str) -> float:
    if target_unit not in UNITS:
        raise ValueError("unknown target unit")
    target_dimension = UNITS[target_unit]["dimension"]
    exact = Fraction(0)
    for value, unit in terms:
        if unit not in UNITS or UNITS[unit]["dimension"] != target_dimension:
            raise ValueError("cross-dimension conversion")
        exact += Fraction.from_float(float(value)) * _unit_scale(unit) / _unit_scale(target_unit)
    return _psth_exact_binary64(exact)


def _psth_bin_edges(
    bins: JsonRecord,
    errors: ErrorList,
) -> Optional[list[float]]:
    """Resolve the shared width/edge declaration without importing TypeScript output."""
    mode = bins.get("mode")
    if mode == "edges":
        values = bins.get("edges")
        if not isinstance(values, list):
            return None
        edges: list[float] = []
        for value in values:
            if not _is_finite_json_number(value):
                return None
            edges.append(float(value))
    elif mode == "width":
        start = bins.get("start")
        stop = bins.get("stop")
        width = bins.get("width")
        if not (
            _is_finite_json_number(start)
            and _is_finite_json_number(stop)
            and _is_finite_json_number(width)
        ):
            return None
        materialized = _materialize_width_intervals(
            float(start), float(stop), float(width)
        )
        if not materialized["accepted"]:
            _psth_error(
                errors,
                "SCIENCE_BIN_EDGES_INVALID",
                "/parameters/bins/width",
                "the width-mode PSTH bin declaration cannot be materialized as at most "
                f"{_PSTH_MAX_BINS} strictly increasing binary64 bins",
            )
            return None
        edges = list(materialized["edges"])
    else:
        return None

    if len(edges) - 1 > _PSTH_MAX_BINS:
        _psth_error(
            errors,
            "RESOURCE_OBSERVATIONS_EXCEEDED",
            "/parameters/bins",
            f"PSTH derivation materializes at most {_PSTH_MAX_BINS} bins",
        )
        return None
    if len(edges) < 2:
        _psth_error(
            errors,
            "SCIENCE_BIN_EDGES_INVALID",
            "/parameters/bins",
            "a PSTH needs at least two authoritative bin edges",
        )
        return None
    for index, edge in enumerate(edges):
        if not math.isfinite(edge):
            _psth_error(
                errors,
                "SCIENCE_BIN_EDGES_INVALID",
                f"/parameters/bins/edges/{index}",
                "every authoritative PSTH bin edge must be finite",
            )
            return None
        if index > 0 and not edge > edges[index - 1]:
            _psth_error(
                errors,
                "SCIENCE_BIN_EDGES_INVALID",
                f"/parameters/bins/edges/{index}",
                "authoritative PSTH bin edges must be strictly increasing",
            )
            return None
    return edges


def _psth_structural_semantics(request: JsonRecord, errors: ErrorList) -> None:
    """Portable PSTH series, identity, reference, window, and dimension rules."""
    data = request.get("data")
    parameters = request.get("parameters")
    if not isinstance(data, dict) or not isinstance(parameters, dict):
        return

    groups = (
        ("/data/eventTimes/values", data.get("eventTimes", {}).get("values")
         if isinstance(data.get("eventTimes"), dict) else None,
         (("/data/eventSenderIds", data.get("eventSenderIds")),
          ("/data/eventTrialIds", data.get("eventTrialIds")))),
        ("/data/trialIds", data.get("trialIds"),
         (("/data/alignmentTimes", data.get("alignmentTimes")),)),
        ("/data/counts", data.get("counts"),
         (("/data/trialDenominators", data.get("trialDenominators")),
          ("/data/rates/values", data.get("rates", {}).get("values")
           if isinstance(data.get("rates"), dict) else None))),
    )
    for first_path, first, rest in groups:
        if not isinstance(first, list):
            continue
        for path, value in rest:
            if isinstance(value, list) and len(value) != len(first):
                errors.append(CortexelError(
                    "SEMANTIC_LENGTH_MISMATCH",
                    "semantic",
                    path,
                    f"this array has {len(value)} entries but {first_path} has {len(first)}",
                ))

    for path, values in (
        ("/data/recordedSenderIds", data.get("recordedSenderIds")),
        ("/data/trialIds", data.get("trialIds")),
    ):
        if not isinstance(values, list):
            continue
        seen: dict[str, int] = {}
        for index, identifier in enumerate(values):
            if not isinstance(identifier, str):
                continue
            if identifier in seen:
                errors.append(CortexelError(
                    "SEMANTIC_DUPLICATE_ID",
                    "semantic",
                    f"{path}/{index}",
                    f"the id {identifier!r} already appears at index {seen[identifier]}",
                ))
            else:
                seen[identifier] = index

    for references_name, universe_name in (
        ("eventSenderIds", "recordedSenderIds"),
        ("eventTrialIds", "trialIds"),
    ):
        references = data.get(references_name)
        universe_values = data.get(universe_name)
        if not isinstance(references, list) or not isinstance(universe_values, list):
            continue
        universe = {value for value in universe_values if isinstance(value, str)}
        reported: set[str] = set()
        for index, identifier in enumerate(references):
            if (
                not isinstance(identifier, str) or identifier in universe or
                identifier in reported
            ):
                continue
            reported.add(identifier)
            errors.append(CortexelError(
                "SEMANTIC_UNKNOWN_REFERENCE",
                "semantic",
                f"/data/{references_name}/{index}",
                f"{identifier!r} is not in the declared {universe_name} universe",
            ))
            if len(reported) >= 8:
                break

    time_fields = [
        ("/data/alignmentUnit", data.get("alignmentUnit")),
        ("/data/relativeWindow/unit",
         data.get("relativeWindow", {}).get("unit")
         if isinstance(data.get("relativeWindow"), dict) else None),
        ("/parameters/bins/unit",
         parameters.get("bins", {}).get("unit")
         if isinstance(parameters.get("bins"), dict) else None),
    ]
    for path, unit in time_fields:
        if isinstance(unit, str) and unit in UNITS and UNITS[unit]["dimension"] != "time":
            errors.append(CortexelError(
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "science",
                path,
                f"PSTH time coordinates require a registered time unit; got {unit}",
            ))

    window = data.get("relativeWindow")
    if isinstance(window, dict):
        start = window.get("start")
        stop = window.get("stop")
        if (
            isinstance(start, (int, float)) and not isinstance(start, bool) and
            isinstance(stop, (int, float)) and not isinstance(stop, bool) and
            not stop > start
        ):
            errors.append(CortexelError(
                "SCIENCE_WINDOW_INVALID",
                "science",
                "/data/relativeWindow/stop",
                "the PSTH relative window must satisfy start < stop",
            ))


def _psth_rate_fraction(
    count: int,
    trial_denominator: int,
    sender_denominator: int,
    lower: float,
    upper: float,
    time_unit: str,
    rate_unit: str,
) -> Fraction:
    exact_width = (
        Fraction.from_float(float(upper)) - Fraction.from_float(float(lower))
    ) * _unit_scale(time_unit)
    if exact_width <= 0:
        raise ValueError("PSTH exposure must be strictly positive")
    return (
        Fraction(count, trial_denominator * sender_denominator) /
        exact_width /
        _unit_scale(rate_unit)
    )


def _psth_derived_values(
    counts: JsonSequence,
    denominators: JsonSequence,
    edges: list[float],
    time_unit: str,
    normalization: str,
    sender_count: int,
    value_unit: str,
) -> list[Optional[float]]:
    values: list[Optional[float]] = []
    for index, count in enumerate(counts):
        denominator = denominators[index]
        if count is None or denominator is None:
            values.append(None)
            continue
        if not _is_json_integer(count) or not _is_json_integer(denominator):
            raise ValueError("PSTH count authority must contain exact integers")
        integer_count = int(count)
        integer_denominator = int(denominator)
        if normalization == "count":
            values.append(float(integer_count))
        elif normalization == "count_per_trial":
            values.append(_psth_exact_binary64(Fraction(integer_count, integer_denominator)))
        else:
            sender_denominator = (
                sender_count
                if normalization == "mean_rate_per_selected_sender_per_trial"
                else 1
            )
            exact = _psth_rate_fraction(
                integer_count,
                integer_denominator,
                sender_denominator,
                edges[index],
                edges[index + 1],
                time_unit,
                value_unit,
            )
            values.append(_psth_exact_binary64(exact))
    return values


def _psth_within_relative_tolerance(actual: float, expected: float) -> bool:
    if not math.isfinite(actual) or not math.isfinite(expected):
        return False
    scale = abs(expected)
    difference = abs(Fraction.from_float(actual) - Fraction.from_float(expected))
    if scale == 0.0:
        return difference == 0
    return (
        difference <=
        Fraction.from_float(scale) * Fraction.from_float(_PSTH_VALUE_TOLERANCE)
    )


def _validate_psth_baseline(
    baseline: Any,
    normalization: str,
    window_unit: str,
    bin_unit: str,
    edges: list[float],
    counts: JsonSequence,
    denominators: JsonSequence,
    sender_count: int,
    value_unit: str,
    errors: ErrorList,
) -> None:
    if baseline is None:
        return
    if not isinstance(baseline, dict):
        return
    if normalization not in _PSTH_RATE_NORMALIZATIONS:
        _psth_error(
            errors,
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "/parameters/baseline",
            "PSTH baseline subtraction is defined only for a rate normalization",
        )
        return
    start = baseline.get("start")
    stop = baseline.get("stop")
    if not isinstance(start, (int, float)) or not isinstance(stop, (int, float)):
        return
    if not stop > start:
        _psth_error(
            errors,
            "SCIENCE_BIN_EDGES_INVALID",
            "/parameters/baseline/stop",
            "the PSTH baseline interval must have strictly positive width",
        )
        return
    try:
        converted_start = _convert_binary64(float(start), window_unit, bin_unit)
        converted_stop = _convert_binary64(float(stop), window_unit, bin_unit)
    except (OverflowError, ValueError):
        _psth_error(
            errors,
            "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
            "/parameters/baseline",
            "the typed baseline bounds cannot be represented in the bin unit",
        )
        return
    start_matches = [index for index, edge in enumerate(edges) if edge == converted_start]
    stop_matches = [index for index, edge in enumerate(edges) if edge == converted_stop]
    start_index = start_matches[0] if len(start_matches) == 1 else -1
    stop_index = stop_matches[0] if len(stop_matches) == 1 else -1
    if start_index < 0 or stop_index <= start_index:
        _psth_error(
            errors,
            "SCIENCE_BIN_EDGES_INVALID",
            "/parameters/baseline",
            "each PSTH baseline bound must identify exactly one authoritative edge",
        )
        return

    baseline_count = 0
    exposure = Fraction(0)
    for index in range(start_index, stop_index):
        count = counts[index]
        denominator = denominators[index]
        if count is None or denominator is None:
            continue
        if not _is_json_integer(count) or not _is_json_integer(denominator):
            return
        baseline_count += int(count)
        exposure += int(denominator) * (
            Fraction.from_float(edges[index + 1]) - Fraction.from_float(edges[index])
        ) * _unit_scale(bin_unit)
    if exposure <= 0:
        _psth_error(
            errors,
            "SCIENCE_DENOMINATOR_INVALID",
            "/parameters/baseline",
            "no included trial covered any complete bin in the baseline interval",
        )
        return

    sender_factor = (
        sender_count
        if normalization == "mean_rate_per_selected_sender_per_trial"
        else 1
    )
    baseline_fraction = (
        Fraction(baseline_count, sender_factor) /
        exposure /
        _unit_scale(value_unit)
    )
    try:
        _psth_exact_binary64(baseline_fraction)
        for index, count in enumerate(counts):
            denominator = denominators[index]
            if count is None or denominator is None:
                continue
            if not _is_json_integer(count) or not _is_json_integer(denominator):
                return
            bin_fraction = _psth_rate_fraction(
                int(count),
                int(denominator),
                sender_factor,
                edges[index],
                edges[index + 1],
                bin_unit,
                value_unit,
            )
            _psth_exact_binary64(bin_fraction - baseline_fraction)
    except (OverflowError, ValueError):
        _psth_error(
            errors,
            "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
            "/parameters/baseline",
            "the exact aggregate baseline exposure or correction is not representable",
        )


def _validate_psth(request: JsonRecord, errors: ErrorList) -> None:
    """Independent portable PSTH request/derivation acceptance evaluator.

    This mirrors scientific refusals that precede geometry.  It intentionally does not
    certify SVG coordinate separation, the renderer's complete-returned table budget, or
    artifact emission; those remain Node render-stage responsibilities.
    """
    data = request.get("data")
    parameters = request.get("parameters")
    if not isinstance(data, dict) or not isinstance(parameters, dict):
        return

    _psth_structural_semantics(request, errors)
    # The ordinary public path calls `_validate_units` first. A quantity-level unit
    # error (notably eventTimes.kind=time with mV) already has its authoritative
    # diagnostic, and the TypeScript request gate likewise stops before derivation.
    if errors:
        return

    mode = data.get("mode")
    normalization = parameters.get("normalization")
    denominator_policy = parameters.get("denominatorPolicy")
    if mode not in ("events", "prebinned"):
        return
    if not isinstance(normalization, str) or normalization not in {
        "count",
        "count_per_trial",
        "total_event_rate_per_trial",
        "mean_rate_per_selected_sender_per_trial",
    }:
        return
    if denominator_policy not in ("uniform_trial_count", "per_bin_covering_trials"):
        return

    if (
        normalization == "mean_rate_per_selected_sender_per_trial" and
        parameters.get("senderExposurePolicy") !=
            "all_selected_senders_cover_every_counted_trial_bin"
    ):
        _psth_error(
            errors,
            "SCIENCE_DENOMINATOR_INVALID",
            "/parameters/senderExposurePolicy",
            "the per-selected-sender PSTH normalization requires an explicit rectangular exposure assertion",
        )
        return

    bins = parameters.get("bins")
    window = data.get("relativeWindow")
    if not isinstance(bins, dict) or not isinstance(window, dict):
        return
    bin_unit = bins.get("unit")
    window_unit = window.get("unit")
    alignment_unit = data.get("alignmentUnit")
    if not (
        _unit_has_dimension(bin_unit, "time")
        and _unit_has_dimension(window_unit, "time")
        and _unit_has_dimension(alignment_unit, "time")
    ):
        return

    edges = _psth_bin_edges(bins, errors)
    if edges is None:
        return
    closed_window = window.get("boundary") == "[start,stop]"
    expected_bin_boundary = "[lo,hi]" if closed_window else "[lo,hi)"
    if (
        window.get("boundary") not in ("[start,stop)", "[start,stop]") or
        bins.get("boundary") != expected_bin_boundary or
        bins.get("finalEdgeInclusive") is not closed_window
    ):
        _psth_error(
            errors,
            "SCIENCE_BIN_EDGES_INVALID",
            "/parameters/bins",
            "PSTH relative-window and bin placement boundaries must agree",
        )
        return

    start = window.get("start")
    stop = window.get("stop")
    if not _is_finite_json_number(start) or not _is_finite_json_number(stop):
        return
    try:
        exact_extent = (
            Fraction.from_float(float(stop)) - Fraction.from_float(float(start))
        ) * _unit_scale(window_unit) / _unit_scale(bin_unit)
        _psth_exact_binary64(exact_extent)
        converted_start = _convert_binary64(float(start), window_unit, bin_unit)
        converted_stop = _convert_binary64(float(stop), window_unit, bin_unit)
    except (OverflowError, ValueError):
        _psth_error(
            errors,
            "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
            "/data/relativeWindow",
            "the typed relative-window extent cannot be represented in the bin unit",
        )
        return
    if edges[0] != converted_start or edges[-1] != converted_stop:
        _psth_error(
            errors,
            "SCIENCE_BIN_EDGES_INVALID",
            "/parameters/bins",
            "PSTH bins must tile the typed relative window exactly",
        )
        return

    trial_ids = data.get("trialIds")
    alignment_times = data.get("alignmentTimes")
    if not isinstance(trial_ids, list) or not isinstance(alignment_times, list):
        return
    if (
        any(not isinstance(trial_id, str) for trial_id in trial_ids)
        or any(not _is_finite_json_number(value) for value in alignment_times)
    ):
        return
    if len(trial_ids) > _PSTH_MAX_IDENTITIES:
        _psth_error(
            errors, "RESOURCE_OBSERVATIONS_EXCEEDED", "/data/trialIds",
            f"PSTH accepts at most {_PSTH_MAX_IDENTITIES} trial identities",
        )
        return

    counts: JsonSequence
    denominators: JsonSequence
    sender_count: int
    if mode == "events":
        event_times_record = data.get("eventTimes")
        event_times = _array(event_times_record.get("values")) if isinstance(
            event_times_record, dict
        ) else None
        event_unit = (
            event_times_record.get("unit")
            if isinstance(event_times_record, dict) else None
        )
        event_sender_ids = _array(data.get("eventSenderIds"))
        event_trial_ids = _array(data.get("eventTrialIds"))
        recorded_sender_ids = _array(data.get("recordedSenderIds"))
        if (
            event_times is None
            or event_sender_ids is None
            or event_trial_ids is None
            or recorded_sender_ids is None
            or not isinstance(event_unit, str)
        ):
            return
        if denominator_policy != "uniform_trial_count":
            _psth_error(
                errors,
                "SCIENCE_DENOMINATOR_INVALID",
                "/parameters/denominatorPolicy",
                "events-mode per-bin covering denominators require coverage records this revision does not carry",
            )
            return
        if len(event_times) > _PSTH_MAX_EVENTS:
            _psth_error(
                errors, "RESOURCE_OBSERVATIONS_EXCEEDED", "/data/eventTimes/values",
                f"PSTH accepts at most {_PSTH_MAX_EVENTS} events",
            )
            return
        if len(recorded_sender_ids) > _PSTH_MAX_IDENTITIES:
            _psth_error(
                errors, "RESOURCE_OBSERVATIONS_EXCEEDED", "/data/recordedSenderIds",
                f"PSTH accepts at most {_PSTH_MAX_IDENTITIES} selected senders",
            )
            return
        sender_count = len(recorded_sender_ids)
        if sender_count < 1 or len(trial_ids) < 1:
            return
        alignment_by_trial = dict(zip(trial_ids, alignment_times))
        event_counts = [0] * (len(edges) - 1)
        try:
            window_start = _convert_binary64(float(start), window_unit, bin_unit)
            window_stop = _convert_binary64(float(stop), window_unit, bin_unit)
            if not window_stop > window_start:
                raise ValueError("collapsed converted window")
            for index, value in enumerate(event_times):
                trial_id = event_trial_ids[index]
                if not isinstance(trial_id, str):
                    return
                alignment = alignment_by_trial[trial_id]
                if (
                    not _is_finite_json_number(value)
                    or not _is_finite_json_number(alignment)
                ):
                    raise ValueError("event alignment coordinates must be finite numbers")
                relative = _psth_exact_unit_sum(
                    [
                        (float(value), event_unit),
                        (-float(alignment), alignment_unit),
                    ],
                    bin_unit,
                )
                in_window = relative >= window_start and (
                    relative <= window_stop if closed_window else relative < window_stop
                )
                if not in_window:
                    continue
                if relative == edges[-1]:
                    bin_index = len(edges) - 2 if closed_window else -1
                else:
                    bin_index = -1
                    lo = 0
                    hi = len(edges) - 1
                    while lo < hi:
                        middle = (lo + hi + 1) // 2
                        if edges[middle] <= relative:
                            lo = middle
                        else:
                            hi = middle - 1
                    if 0 <= lo < len(edges) - 1 and edges[0] <= relative < edges[-1]:
                        bin_index = lo
                if bin_index < 0:
                    _psth_error(
                        errors,
                        "SCIENCE_EVENT_OUT_OF_WINDOW",
                        f"/data/eventTimes/values/{index}",
                        "an aligned event is inside the relative window but falls in no authoritative bin",
                    )
                    return
                event_counts[bin_index] += 1
        except (KeyError, OverflowError, TypeError, ValueError):
            _psth_error(
                errors,
                "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
                "/data/relativeWindow",
                "an event alignment or converted relative window is not representable",
            )
            return
        counts = event_counts
        denominators = [len(trial_ids)] * len(counts)
    else:
        raw_counts = _array(data.get("counts"))
        raw_denominators = _array(data.get("trialDenominators"))
        if raw_counts is None or raw_denominators is None:
            return
        counts = raw_counts
        denominators = raw_denominators
        if (
            len(counts) > _PSTH_MAX_BINS or len(denominators) > _PSTH_MAX_BINS or
            (isinstance(data.get("rates"), dict) and
             isinstance(data["rates"].get("values"), list) and
             len(data["rates"]["values"]) > _PSTH_MAX_BINS)
        ):
            _psth_error(
                errors, "RESOURCE_OBSERVATIONS_EXCEEDED", "/data/counts",
                f"prebinned PSTH arrays accept at most {_PSTH_MAX_BINS} entries",
            )
            return
        sender_raw = data.get("recordedSenderCount")
        included_raw = data.get("includedTrialCount")
        excluded_raw = data.get("excludedTrialCount")
        if not (
            _is_json_integer(sender_raw)
            and _is_json_integer(included_raw)
            and _is_json_integer(excluded_raw)
        ):
            return
        sender_count = int(sender_raw)
        included_count = int(included_raw)
        excluded_count = int(excluded_raw)
        if not (
            1 <= sender_count <= _MAX_SAFE_INTEGER and
            1 <= included_count <= _MAX_SAFE_INTEGER and
            0 <= excluded_count <= _MAX_SAFE_INTEGER
        ):
            _psth_error(
                errors,
                "SCIENCE_DENOMINATOR_INVALID",
                "/data/includedTrialCount",
                "PSTH sender and trial cardinalities must be exact safe integers",
            )
            return
        if included_count + excluded_count != len(trial_ids):
            _psth_error(
                errors,
                "SCIENCE_DENOMINATOR_INVALID",
                "/data/trialIds",
                "the trial universe length must equal included plus excluded trial counts",
            )
            return
        if len(counts) != len(edges) - 1 or len(denominators) != len(edges) - 1:
            _psth_error(
                errors,
                "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                "/data/counts",
                "prebinned counts and denominators need one entry per authoritative bin",
            )
            return
        for index, (count, denominator) in enumerate(zip(counts, denominators)):
            if (count is None) != (denominator is None):
                _psth_error(
                    errors,
                    "SCIENCE_DENOMINATOR_INVALID",
                    f"/data/trialDenominators/{index}",
                    "a prebinned count and covering-trial denominator must be null together",
                )
                return
            if count is None:
                if denominator_policy == "uniform_trial_count":
                    _psth_error(
                        errors,
                        "SCIENCE_DENOMINATOR_INVALID",
                        f"/data/trialDenominators/{index}",
                        "uniform trial coverage cannot contain an unobserved null bin",
                    )
                    return
                continue
            if not _is_json_integer(count) or not (0 <= int(count) <= _MAX_SAFE_INTEGER):
                _psth_error(
                    errors,
                    "SCIENCE_COUNT_NOT_INTEGER",
                    f"/data/counts/{index}",
                    "a PSTH count must be an exact non-negative safe integer",
                )
                return
            if (
                not _is_json_integer(denominator) or
                not (1 <= int(denominator) <= _MAX_SAFE_INTEGER)
            ):
                _psth_error(
                    errors,
                    "SCIENCE_DENOMINATOR_INVALID",
                    f"/data/trialDenominators/{index}",
                    "a PSTH denominator must be a positive safe integer",
                )
                return
            if int(denominator) > included_count:
                _psth_error(
                    errors,
                    "SCIENCE_DENOMINATOR_INVALID",
                    f"/data/trialDenominators/{index}",
                    "a covering-trial denominator exceeds includedTrialCount",
                )
                return
            if denominator_policy == "uniform_trial_count" and int(denominator) != included_count:
                _psth_error(
                    errors,
                    "SCIENCE_DENOMINATOR_INVALID",
                    f"/data/trialDenominators/{index}",
                    "uniform_trial_count requires includedTrialCount in every observed bin",
                )
                return

    rates = data.get("rates") if mode == "prebinned" else None
    value_unit = "Hz" if normalization in _PSTH_RATE_NORMALIZATIONS else "1"
    if isinstance(rates, dict):
        expected_kind = (
            "count" if normalization == "count" else
            "ratio" if normalization == "count_per_trial" else
            "firing_rate"
        )
        if rates.get("kind") != expected_kind:
            _psth_error(
                errors,
                "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                "/data/rates/kind",
                "the supplied value kind does not match the requested normalization",
            )
            return
        declared_value_unit = rates.get("unit")
        expected_dimension = (
            "frequency" if normalization in _PSTH_RATE_NORMALIZATIONS
            else "dimensionless"
        )
        if (
            not isinstance(declared_value_unit, str)
            or declared_value_unit not in UNITS
            or UNITS[declared_value_unit]["dimension"] != expected_dimension
        ):
            _psth_error(
                errors,
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "/data/rates/unit",
                "the supplied value unit has the wrong normalization dimension",
            )
            return
        value_unit = declared_value_unit

    try:
        expected_values = _psth_derived_values(
            counts,
            denominators,
            edges,
            bin_unit,
            normalization,
            sender_count,
            value_unit,
        )
    except (OverflowError, ValueError):
        _psth_error(
            errors,
            "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
            "/data/counts",
            "the exact PSTH normalization cannot be represented",
        )
        return

    if isinstance(rates, dict) and isinstance(rates.get("values"), list):
        supplied_values = rates["values"]
        if len(supplied_values) != len(expected_values):
            _psth_error(
                errors,
                "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                "/data/rates/values",
                "supplied normalized values need one entry per authoritative bin",
            )
            return
        for index, (actual, expected) in enumerate(zip(supplied_values, expected_values)):
            if (actual is None) != (expected is None):
                _psth_error(
                    errors,
                    "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                    f"/data/rates/values/{index}",
                    "supplied values must share the count/denominator missingness mask",
                )
                return
            if actual is None:
                continue
            if expected is None:
                # The null-mask check above makes this unreachable, but spelling the
                # relation out keeps this hostile-input helper total if its derivation
                # representation changes independently.
                return
            if (
                not isinstance(actual, (int, float)) or isinstance(actual, bool) or
                not math.isfinite(actual) or actual < 0
            ):
                _psth_error(
                    errors,
                    "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                    f"/data/rates/values/{index}",
                    "a supplied count-derived value must be finite and non-negative",
                )
                return
            if normalization == "count":
                matches = (
                    _is_json_integer(actual) and
                    0 <= int(actual) <= _MAX_SAFE_INTEGER and
                    float(actual) == expected
                )
            else:
                matches = _psth_within_relative_tolerance(float(actual), float(expected))
            if not matches:
                _psth_error(
                    errors,
                    "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                    f"/data/rates/values/{index}",
                    "the supplied value disagrees with the exact count-derived normalization",
                )
                return

    _validate_psth_baseline(
        parameters.get("baseline"),
        normalization,
        window_unit,
        bin_unit,
        edges,
        counts,
        denominators,
        sender_count,
        value_unit,
        errors,
    )


def _response_error(errors: ErrorList, path: str, message: str) -> None:
    errors.append(CortexelError(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", path, message
    ))


def _response_event_scope_error(errors: ErrorList, path: str, message: str) -> None:
    errors.append(CortexelError(
        "SCIENCE_EVENT_SCOPE_UNVERIFIABLE", "science", path, message
    ))


def _validate_response_repeat_structure(
    request: JsonRecord,
    carrier: JsonRecord,
    response: JsonRecord,
    errors: ErrorList,
) -> bool:
    """Validate the raw-repeat identity and attempt universe before any ``zip``.

    Python's ``zip`` truncates to the shortest input.  Using it before proving the
    parallel-array lengths would let a missing condition/repeat identity erase trailing
    responses from the independently checked audit.  This boundary therefore mirrors the
    TypeScript ``series.equal_length`` and response-curve identity/accounting rules first.
    ``False`` means the caller must stop all downstream response derivation.
    """

    data = request.get("data")
    conditions = data.get("conditions") if isinstance(data, dict) else None
    declared_ids = _array(conditions.get("ids")) if isinstance(conditions, dict) else None
    condition_ids = _array(carrier.get("conditionIds"))
    repeat_ids = _array(carrier.get("repeatIds"))
    values = _array(response.get("values"))
    attempted_counts = _array(carrier.get("attemptedCounts"))
    if (
        declared_ids is None
        or condition_ids is None
        or repeat_ids is None
        or values is None
        or attempted_counts is None
    ):
        # The structural validator owns missing/wrongly typed fields.
        return False

    if not (len(condition_ids) == len(repeat_ids) == len(values)):
        errors.append(CortexelError(
            "SEMANTIC_LENGTH_MISMATCH",
            "semantic",
            "/data/observations/response/values",
            "conditionIds, repeatIds, and response values must be parallel raw-repeat arrays",
        ))
        return False
    if len(attempted_counts) != len(declared_ids):
        errors.append(CortexelError(
            "SEMANTIC_LENGTH_MISMATCH",
            "semantic",
            "/data/observations/attemptedCounts",
            "attemptedCounts must be parallel to the declared condition universe",
        ))
        return False

    declared_set: set[str] = set()
    declared_condition_ids: list[str] = []
    for index, condition_id in enumerate(declared_ids):
        if not isinstance(condition_id, str):
            return False
        if condition_id in declared_set:
            errors.append(CortexelError(
                "SEMANTIC_DUPLICATE_ID",
                "semantic",
                f"/data/conditions/ids/{index}",
                "a response-curve condition id appears more than once",
            ))
            return False
        declared_set.add(condition_id)
        declared_condition_ids.append(condition_id)

    submitted_counts = {condition_id: 0 for condition_id in declared_condition_ids}
    repeat_sets: dict[str, set[str]] = {
        condition_id: set() for condition_id in declared_condition_ids
    }
    for index, (condition_id, repeat_id) in enumerate(zip(condition_ids, repeat_ids)):
        if not isinstance(condition_id, str) or not isinstance(repeat_id, str):
            return False
        if condition_id not in declared_set:
            errors.append(CortexelError(
                "SEMANTIC_UNKNOWN_REFERENCE",
                "semantic",
                f"/data/observations/conditionIds/{index}",
                "an observation references a condition outside the declared universe",
            ))
            return False
        if repeat_id in repeat_sets[condition_id]:
            errors.append(CortexelError(
                "SEMANTIC_DUPLICATE_ID",
                "semantic",
                f"/data/observations/repeatIds/{index}",
                "a repeat id appears more than once within one condition",
            ))
            return False
        repeat_sets[condition_id].add(repeat_id)
        submitted_counts[condition_id] += 1

    for index, (condition_id, attempted_count) in enumerate(
        zip(declared_condition_ids, attempted_counts)
    ):
        if (
            not _is_json_integer(attempted_count)
            or not 0 <= int(attempted_count) <= _MAX_SAFE_INTEGER
        ):
            errors.append(CortexelError(
                "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
                "science",
                f"/data/observations/attemptedCounts/{index}",
                "an attempted count must be an exact non-negative safe integer",
            ))
            return False
        if int(attempted_count) != submitted_counts[condition_id]:
            _response_error(
                errors,
                f"/data/observations/attemptedCounts/{index}",
                f"condition {condition_id!r} declares {int(attempted_count)} attempted "
                f"repeats but supplies {submitted_counts[condition_id]} rows",
            )
            return False

    parameters = request.get("parameters")
    if (
        isinstance(parameters, dict)
        and parameters.get("repeatDesign") == "paired"
        and declared_condition_ids
    ):
        reference = repeat_sets[declared_condition_ids[0]]
        for condition_id in declared_condition_ids[1:]:
            if repeat_sets[condition_id] != reference:
                errors.append(CortexelError(
                    "SCIENCE_PAIRED_REPEATS_INCOMPLETE",
                    "science",
                    "/data/observations/repeatIds",
                    "paired response conditions must carry identical repeat-id sets",
                ))
                return False

    return True


def _validate_response_binned_peak_lattice(
    request: JsonRecord,
    carrier: JsonRecord,
    response: JsonRecord,
    response_path: str,
    divisor: int,
    errors: ErrorList,
) -> None:
    basis = response.get("basis")
    values = response.get("values")
    if (
        not isinstance(basis, dict) or
        basis.get("estimator") != "binned_count" or
        not isinstance(values, list)
    ):
        return
    width = basis.get("binWidth")
    if (
        not isinstance(width, dict) or
        not isinstance(width.get("unit"), str)
    ):
        return

    request_data = _record(request.get("data"))
    mode = request_data.get("mode") if request_data is not None else None
    aggregate = mode == "aggregates"
    if not aggregate:
        # Raw binned peaks use identified exact peakBinCounts. They are never
        # accepted through an existential inverse lattice.
        return
    parameters = request.get("parameters")
    estimator = parameters.get("estimator") if isinstance(parameters, dict) else None
    sample_counts = carrier.get("sampleCounts")
    if (
        estimator not in ("mean", "median", "trimmed_mean") or
        not isinstance(sample_counts, list) or
        len(sample_counts) != len(values)
    ):
        _response_error(
            errors,
            "/data/aggregates/sampleCounts",
            "aggregate binned peaks require one retained sample count per response",
        )
        return

    for index, value in enumerate(values):
        retained_count = sample_counts[index]
        if (value is None) != (retained_count is None):
            _response_error(
                errors,
                f"/data/aggregates/sampleCounts/{index}",
                "aggregate response and retained sample count must share one null mask",
            )
            return
        if value is None:
            continue
        if (
            not _is_json_integer(retained_count) or
            not (1 <= int(retained_count) <= _MAX_SAFE_INTEGER)
        ):
            _response_error(
                errors,
                f"/data/aggregates/sampleCounts/{index}",
                "a defined aggregate binned peak requires a positive exact retained count",
            )
            return
        retained_count = int(retained_count)
        estimator_denominator = (
            2 if estimator == "median" and retained_count % 2 == 0
            else 1 if estimator == "median"
            else retained_count
        )

        if not _is_rounded_aggregate_count_rate_in_unit(
            value,
            divisor,
            estimator_denominator,
            width.get("value"),
            width.get("unit"),
            response.get("unit"),
        ):
            _response_error(
                errors,
                response_path + f"/values/{index}",
                "binned peak is not on the exact safe-integer count/estimator lattice",
            )
            return


def _validate_response_raw_binned_peak_audit(
    request: JsonRecord,
    carrier: JsonRecord,
    response: JsonRecord,
    response_path: str,
    divisor: int,
    errors: ErrorList,
) -> Optional[dict[str, float]]:
    """Validate identified raw max-bin counts and derive count-level estimates."""
    data = request.get("data")
    basis = response.get("basis")
    values = response.get("values")
    if (
        not isinstance(data, dict) or
        data.get("mode") != "repeats" or
        not isinstance(basis, dict) or
        basis.get("estimator") != "binned_count" or
        not isinstance(values, list)
    ):
        return None

    audit = response.get("audit")
    peak_bin_counts = audit.get("peakBinCounts") if isinstance(audit, dict) else None
    if not isinstance(peak_bin_counts, list):
        _response_error(
            errors,
            response_path + "/audit/peakBinCounts",
            "raw binned peaks require exact parallel peakBinCounts",
        )
        return None
    if len(peak_bin_counts) != len(values):
        errors.append(CortexelError(
            "SEMANTIC_LENGTH_MISMATCH",
            "semantic",
            response_path + "/audit/peakBinCounts",
            "peakBinCounts must be parallel to raw binned-peak response values",
        ))
        return None

    width = basis.get("binWidth")
    if (
        not isinstance(width, dict) or
        not isinstance(width.get("unit"), str) or
        not isinstance(response.get("unit"), str)
    ):
        return None
    duration_value = width.get("value")
    duration_unit = width.get("unit")
    rate_unit = response.get("unit")

    condition_ids = carrier.get("conditionIds")
    repeat_ids = carrier.get("repeatIds")
    if not isinstance(condition_ids, list) or not isinstance(repeat_ids, list):
        return None
    grouped: dict[str, list[tuple[int, str, int]]] = {}
    for index, (count, value) in enumerate(zip(peak_bin_counts, values)):
        if (count is None) != (value is None):
            _response_error(
                errors,
                response_path + f"/audit/peakBinCounts/{index}",
                "peak-bin count and raw peak rate must share one null mask",
            )
            return None
        if count is None:
            continue
        if not _is_json_integer(count) or not (0 <= int(count) <= _MAX_SAFE_INTEGER):
            errors.append(CortexelError(
                "SCIENCE_COUNT_NOT_INTEGER",
                "science",
                response_path + f"/audit/peakBinCounts/{index}",
                "peak-bin count must be an exact non-negative safe integer",
            ))
            return None
        integer_count = int(count)
        try:
            expected = _derive_exact_aggregate_count_rate_in_unit(
                integer_count,
                divisor,
                1,
                duration_value,
                duration_unit,
                rate_unit,
            )
        except (OverflowError, ValueError):
            _response_error(
                errors,
                response_path + f"/values/{index}",
                "raw binned-peak rate is not representable from its exact peak-bin count",
            )
            return None
        if (
            not isinstance(value, (int, float)) or isinstance(value, bool) or
            (0.0 if value == 0 else float(value)) != expected
        ):
            _response_error(
                errors,
                response_path + f"/values/{index}",
                "raw binned-peak rate disagrees with its exact peak-bin count",
            )
            return None
        if index < len(condition_ids) and index < len(repeat_ids):
            condition_id = condition_ids[index]
            repeat_id = repeat_ids[index]
            if isinstance(condition_id, str) and isinstance(repeat_id, str):
                grouped.setdefault(condition_id, []).append(
                    (integer_count, repeat_id, index)
                )

    parameters = request.get("parameters")
    estimator = parameters.get("estimator") if isinstance(parameters, dict) else None
    trim_fraction = (
        parameters.get("trimFraction") if isinstance(parameters, dict) else None
    )
    if estimator not in ("mean", "median", "trimmed_mean"):
        return None

    estimates: dict[str, float] = {}
    for condition_id, rows in grouped.items():
        ordered = sorted(rows, key=lambda row: (row[0], row[1], row[2]))
        if not ordered:
            continue
        if estimator == "median":
            middle = len(ordered) // 2
            selected = (
                [ordered[middle]]
                if len(ordered) % 2 == 1
                else [ordered[middle - 1], ordered[middle]]
            )
        else:
            trim_per_tail = 0
            if estimator == "trimmed_mean":
                if (
                    not isinstance(trim_fraction, (int, float)) or
                    isinstance(trim_fraction, bool) or
                    not math.isfinite(trim_fraction)
                ):
                    return None
                exact_product = Fraction.from_float(float(trim_fraction)) * len(ordered)
                trim_per_tail = exact_product.numerator // exact_product.denominator
            selected = ordered[trim_per_tail:len(ordered) - trim_per_tail]
        if not selected:
            _response_error(
                errors,
                response_path + "/values",
                "raw binned-peak estimator retained no exact counts",
            )
            return None
        total = sum(row[0] for row in selected)
        try:
            estimates[condition_id] = _derive_exact_aggregate_count_rate_in_unit(
                total,
                divisor,
                len(selected),
                duration_value,
                duration_unit,
                rate_unit,
            )
        except (OverflowError, ValueError):
            _response_error(
                errors,
                response_path + "/values",
                "raw binned-peak condition estimator is not representable in binary64",
            )
            return None
    return estimates


def _validate_response_peak_basis(
    data: JsonRecord,
    response: JsonRecord,
    response_path: str,
    errors: ErrorList,
) -> None:
    basis = response.get("basis")
    window = data.get("measurementWindow")
    if not isinstance(basis, dict) or not isinstance(window, dict):
        return
    start = window.get("start")
    stop = window.get("stop")
    window_unit = window.get("unit")
    window_boundary = window.get("boundary", "[start,stop)")
    if (
        not _is_finite_json_number(start)
        or not _is_finite_json_number(stop)
        or not isinstance(window_unit, str)
    ):
        return

    if basis.get("estimator") == "binned_count":
        if window_boundary != "[start,stop)" or basis.get("boundary") != window_boundary:
            _response_error(errors, response_path + "/basis/boundary",
                            "binned peak basis must share the half-open measurement window")
            return
        width = basis.get("binWidth")
        if not isinstance(width, dict):
            return
        width_value = width.get("value")
        width_unit = width.get("unit")
        if not _is_finite_json_number(width_value) or not isinstance(width_unit, str):
            return
        try:
            converted = _convert_binary64(
                float(width_value), width_unit, window_unit
            )
        except (TypeError, ValueError, OverflowError, KeyError):
            _response_error(errors, response_path + "/basis/binWidth",
                            "bin width cannot be converted into the window unit")
            return
        grid = _materialize_width_intervals(float(start), float(stop), converted)
        if not grid["accepted"]:
            _response_error(errors, response_path + "/basis/binWidth",
                            "bin width does not materialize full bins across the window")
        elif grid["intervalCount"] != basis.get("binCount"):
            _response_error(errors, response_path + "/basis/binCount",
                            "declared bin count disagrees with the materialized grid")
        else:
            typed_exposure = (
                Fraction.from_float(float(width_value)) *
                _unit_scale(width_unit)
            )
            window_scale = _unit_scale(window_unit)
            for index, (left, right) in enumerate(zip(grid["edges"], grid["edges"][1:])):
                emitted_exposure = (
                    Fraction.from_float(float(right)) - Fraction.from_float(float(left))
                ) * window_scale
                if emitted_exposure != typed_exposure:
                    _response_error(
                        errors,
                        response_path + "/basis/binWidth",
                        f"emitted bin {index} does not have exact physical exposure equal to the typed binWidth; a max-bin count cannot determine its rate",
                    )
                    break
        return

    if basis.get("estimator") != "kernel":
        return
    shape = basis.get("shape")
    form = basis.get("kernelForm")
    bandwidth_definition = basis.get("bandwidthDefinition")
    support = basis.get("support")
    support = support if isinstance(support, dict) else {}
    support_kind = support.get("kind")
    valid_identity = (
        shape == "gaussian" and form == "symmetric" and
        bandwidth_definition == "standard_deviation" and
        (support_kind == "analytic_infinite" or
         (support_kind == "finite_cutoff" and support.get("geometry") == "symmetric_radius"))
    ) or (
        shape == "boxcar" and form in ("symmetric", "causal_past") and
        bandwidth_definition == "full_width" and support_kind == "finite_full_width"
    ) or (
        shape == "exponential" and form == "causal_past" and
        bandwidth_definition == "time_constant" and
        (support_kind == "analytic_infinite" or
         (support_kind == "finite_cutoff" and support.get("geometry") == "past_horizon"))
    ) or (
        shape == "laplace" and form == "symmetric_laplace" and
        bandwidth_definition == "time_constant" and
        (support_kind == "analytic_infinite" or
         (support_kind == "finite_cutoff" and support.get("geometry") == "symmetric_radius"))
    )
    if not valid_identity:
        _response_error(errors, response_path + "/basis",
                        "kernel identity is not a recognized mathematical combination")
        return
    if basis.get("edgePolicy") == "renormalize_evaluation_mass" and form == "causal_past":
        _response_error(errors, response_path + "/basis/edgePolicy",
                        "causal edge correction is singular at the included window start")
        return

    evaluation = basis.get("evaluation")
    if not isinstance(evaluation, dict):
        return
    if evaluation.get("mode") == "continuous_supremum":
        if evaluation.get("boundary") != window_boundary:
            _response_error(errors, response_path + "/basis/evaluation/boundary",
                            "continuous evaluation boundary disagrees with the window")
        return
    if evaluation.get("mode") != "sampled_grid":
        return
    if window_boundary != "[start,stop)" or evaluation.get("boundary") != window_boundary:
        _response_error(errors, response_path + "/basis/evaluation/boundary",
                        "sampled evaluation must share the half-open measurement window")
        return
    step = evaluation.get("step")
    if not isinstance(step, dict):
        return
    step_value = step.get("value")
    step_unit = step.get("unit")
    if not _is_finite_json_number(step_value) or not isinstance(step_unit, str):
        return
    try:
        converted = _convert_binary64(float(step_value), step_unit, window_unit)
    except (TypeError, ValueError, OverflowError, KeyError):
        _response_error(errors, response_path + "/basis/evaluation/step",
                        "grid step cannot be converted into the window unit")
        return
    materialized = _materialized_width_count(float(start), float(stop), converted)
    if materialized is None:
        _response_error(errors, response_path + "/basis/evaluation/step",
                        "grid step does not materialize full steps across the window")
    elif materialized != evaluation.get("sampleCount"):
        _response_error(errors, response_path + "/basis/evaluation/sampleCount",
                        "declared sample count disagrees with the materialized grid")


def _validate_response_event_scope(
    data: JsonRecord,
    errors: ErrorList,
) -> Optional[ResponseEventScope]:
    """Bind the declared event train/population before interpreting any scalar response."""
    scope = data.get("eventScope")
    if not isinstance(scope, dict):
        _response_event_scope_error(errors, "/data/eventScope",
                                    "every event-derived response must declare one eventScope")
        return None
    selection_id = scope.get("selectionId")
    if not isinstance(selection_id, str) or selection_id == "":
        _response_event_scope_error(
            errors, "/data/eventScope/selectionId",
            "eventScope.selectionId must identify the selection rule or role shared by every condition and repeat",
        )
        return None
    if scope.get("eventKind") != "spike":
        _response_event_scope_error(
            errors, "/data/eventScope/eventKind",
            "response-curve event scope supports spike events only",
        )
        return None
    if scope.get("eventCompleteness") != "complete_for_selection_within_measurement_window":
        _response_event_scope_error(
            errors, "/data/eventScope/eventCompleteness",
            "counts, rates, and no-spike latencies require every selected spike inside the measurement window",
        )
        return None
    kind = scope.get("kind")
    if kind == "single_train":
        if scope.get("poolingOperator") != "identity_single_train":
            _response_event_scope_error(
                errors, "/data/eventScope/poolingOperator",
                "single_train requires identity_single_train pooling",
            )
            return None
        if "recordedSenderCount" in scope:
            _response_event_scope_error(
                errors,
                "/data/eventScope/recordedSenderCount",
                "single_train declares one event train but no recorded-sender cardinality, so recordedSenderCount is inapplicable and forbidden",
            )
            return None
        return {
            "kind": kind,
            "selectionId": selection_id,
            "selectedEventTrainCount": 1,
            "recordedSenderCount": None,
            "membershipKind": "single_train_selection_rule",
        }
    if kind != "pooled_recorded_senders":
        _response_event_scope_error(errors, "/data/eventScope/kind",
                                    "eventScope kind is not recognized")
        return None
    if scope.get("poolingOperator") != "superpose_selected_sender_trains":
        _response_event_scope_error(
            errors, "/data/eventScope/poolingOperator",
            "pooled_recorded_senders requires superpose_selected_sender_trains pooling",
        )
        return None
    count = scope.get("recordedSenderCount")
    if not _is_json_integer(count) or not (1 <= int(count) <= _MAX_SAFE_INTEGER):
        _response_event_scope_error(
            errors,
            "/data/eventScope/recordedSenderCount",
            "pooled_recorded_senders requires a positive exact recordedSenderCount",
        )
        return None
    membership = scope.get("membershipBinding")
    if not isinstance(membership, dict):
        _response_event_scope_error(errors, "/data/eventScope/membershipBinding",
                                    "pooled sender membership is not bound")
        return None
    membership_kind = membership.get("kind")
    if membership_kind == "explicit_sender_ids":
        sender_ids = membership.get("senderIds")
        if not isinstance(sender_ids, list) or len(sender_ids) != int(count):
            _response_event_scope_error(
                errors,
                "/data/eventScope/membershipBinding/senderIds",
                "explicit sender membership length must equal recordedSenderCount",
            )
            return None
        seen = set()
        for index, sender_id in enumerate(sender_ids):
            if not isinstance(sender_id, str) or sender_id == "":
                _response_event_scope_error(
                    errors,
                    f"/data/eventScope/membershipBinding/senderIds/{index}",
                    "every explicit sender id must be a non-empty identifier string",
                )
                return None
            if sender_id in seen:
                _response_event_scope_error(
                    errors,
                    f"/data/eventScope/membershipBinding/senderIds/{index}",
                    "explicit sender membership contains a duplicate id",
                )
                return None
            seen.add(sender_id)
    elif membership_kind == "canonical_sender_ids_digest":
        digest = membership.get("digest")
        if (
            membership.get("algorithm") != "sha256" or
            membership.get("canonicalization") !=
                "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1" or
            not isinstance(digest, str) or
            re.fullmatch(r"sha256:[0-9a-f]{64}", digest) is None
        ):
            _response_event_scope_error(
                errors, "/data/eventScope/membershipBinding",
                "canonical sender membership requires the registered SHA-256 canonicalization and a lowercase sha256 digest",
            )
            return None
    elif membership_kind != "cardinality_only":
        _response_event_scope_error(errors, "/data/eventScope/membershipBinding",
                                    "pooled sender membership binding is not recognized")
        return None
    return {
        "kind": kind,
        "selectionId": selection_id,
        "selectedEventTrainCount": int(count),
        "recordedSenderCount": int(count),
        "membershipKind": membership_kind,
    }


def _validate_response_curve(request: JsonRecord, errors: ErrorList) -> None:
    """Independent response-curve rate/basis evaluator for cross-language parity."""
    data = request.get("data")
    if not isinstance(data, dict):
        return
    measurement_window = data.get("measurementWindow")
    if isinstance(measurement_window, dict):
        window_unit = measurement_window.get("unit")
        if (
            isinstance(window_unit, str) and
            window_unit in UNITS and
            UNITS[window_unit]["dimension"] != "time"
        ):
            errors.append(CortexelError(
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "science",
                "/data/measurementWindow/unit",
                "a response-curve measurement window requires a registered time unit",
            ))
            return
        window_start = measurement_window.get("start")
        window_stop = measurement_window.get("stop")
        if (
            isinstance(window_start, (int, float)) and
            not isinstance(window_start, bool) and
            isinstance(window_stop, (int, float)) and
            not isinstance(window_stop, bool) and
            not (window_stop > window_start)
        ):
            errors.append(CortexelError(
                "SCIENCE_WINDOW_INVALID",
                "science",
                "/data/measurementWindow/stop",
                "the response-curve measurement window must satisfy start < stop",
            ))
            return
    mode = data.get("mode")
    carrier_name = "aggregates" if mode == "aggregates" else "observations"
    carrier = data.get(carrier_name)
    if not isinstance(carrier, dict) or not isinstance(carrier.get("response"), dict):
        return
    response = carrier["response"]
    response_path = f"/data/{carrier_name}/response"
    method = response.get("method")
    values = response.get("values")
    if mode == "repeats" and not _validate_response_repeat_structure(
        request,
        carrier,
        response,
        errors,
    ):
        return
    is_rate = method in ("mean_firing_rate", "peak_firing_rate")
    normalization = response.get("rateNormalization")
    event_scope = _validate_response_event_scope(data, errors)
    divisor: Optional[int] = None

    if is_rate and event_scope is not None:
        if normalization == "single_train_rate":
            if event_scope["kind"] != "single_train":
                _response_error(errors, "/data/eventScope/kind",
                                "single_train_rate requires eventScope.kind single_train")
            else:
                divisor = 1
        elif normalization in ("total_event_rate", "mean_rate_per_recorded_sender"):
            if event_scope["kind"] != "pooled_recorded_senders":
                _response_error(errors, "/data/eventScope/kind",
                                "the declared normalization requires pooled_recorded_senders")
            else:
                divisor = (
                    event_scope["recordedSenderCount"]
                    if normalization == "mean_rate_per_recorded_sender" else 1
                )
        else:
            _response_error(errors, response_path + "/rateNormalization",
                            "a firing-rate response requires a recognized normalization")

    # These are baseline domains of the response estimands, not optional peak/audit
    # refinements.  Check them before the method-specific branches so a Python-only
    # inspection cannot accept a negative firing rate merely because its kernel basis is
    # structurally coherent.  The generated schema establishes number-or-null; this layer
    # establishes what those finite numbers can scientifically mean.
    if isinstance(values, list):
        for index, value in enumerate(values):
            if value is None or not isinstance(value, (int, float)) or isinstance(value, bool):
                continue
            if method in ("mean_firing_rate", "peak_firing_rate") and value < 0:
                errors.append(CortexelError(
                    "SCIENCE_RESPONSE_VALUE_INVALID",
                    "science",
                    response_path + f"/values/{index}",
                    f"{method} is a firing rate and cannot be negative",
                ))
                break
            if method == "event_count":
                if mode == "repeats" and (
                    not _is_json_integer(value) or
                    not (0 <= int(value) <= _MAX_SAFE_INTEGER)
                ):
                    errors.append(CortexelError(
                        "SCIENCE_COUNT_NOT_INTEGER",
                        "science",
                        response_path + f"/values/{index}",
                        "a raw repeat event count must be an exact non-negative safe integer",
                    ))
                    break
                if mode == "aggregates" and value < 0:
                    errors.append(CortexelError(
                        "SCIENCE_RESPONSE_VALUE_INVALID",
                        "science",
                        response_path + f"/values/{index}",
                        "an aggregate estimator over event counts may be fractional but cannot be negative",
                    ))
                    break

    if method == "first_spike_latency":
        if response.get("latencyReference") != "measurement_window_start":
            _response_error(
                errors,
                response_path + "/latencyReference",
                "revision 2 supports latency only from measurement_window_start",
            )
        window = data.get("measurementWindow")
        latency_unit = response.get("unit")
        if (
            isinstance(values, list) and
            isinstance(window, dict) and
            isinstance(latency_unit, str) and
            latency_unit in UNITS and
            UNITS[latency_unit]["dimension"] == "time"
        ):
            start = window.get("start")
            stop = window.get("stop")
            window_unit = window.get("unit")
            if (
                isinstance(start, (int, float)) and not isinstance(start, bool) and
                isinstance(stop, (int, float)) and not isinstance(stop, bool) and
                isinstance(window_unit, str) and window_unit in UNITS and
                UNITS[window_unit]["dimension"] == "time"
            ):
                duration = (
                    Fraction.from_float(float(stop)) -
                    Fraction.from_float(float(start))
                ) * _unit_scale(window_unit)
                closed = window.get("boundary") == "[start,stop]"
                for index, value in enumerate(values):
                    if value is None:
                        continue
                    if (
                        not isinstance(value, (int, float)) or isinstance(value, bool) or
                        not math.isfinite(value) or value < 0
                    ):
                        errors.append(CortexelError(
                            "SCIENCE_RESPONSE_VALUE_INVALID",
                            "science",
                            response_path + f"/values/{index}",
                            "a defined first-spike latency must be non-negative",
                        ))
                        break
                    latency = Fraction.from_float(float(value)) * _unit_scale(latency_unit)
                    if latency > duration or (latency == duration and not closed):
                        errors.append(CortexelError(
                            "SCIENCE_LATENCY_OUTSIDE_WINDOW",
                            "science",
                            response_path + f"/values/{index}",
                            "first-spike latency lies outside the exact typed window",
                        ))
                        break

    if method == "peak_firing_rate":
        _validate_response_peak_basis(data, response, response_path, errors)
        if divisor is not None:
            if mode == "aggregates":
                _validate_response_binned_peak_lattice(
                    request, carrier, response, response_path, divisor, errors
                )
            else:
                _validate_response_raw_binned_peak_audit(
                    request, carrier, response, response_path, divisor, errors
                )

    audit = response.get("audit")
    if method != "mean_firing_rate" or not isinstance(audit, dict) or divisor is None:
        return
    counts = audit.get("eventCounts")
    window = data.get("measurementWindow")
    if not isinstance(values, list) or not isinstance(counts, list) or not isinstance(window, dict):
        return
    if len(values) != len(counts):
        errors.append(CortexelError(
            "SEMANTIC_LENGTH_MISMATCH", "semantic",
            response_path + "/audit/eventCounts",
            "audited event counts must be parallel to response values"
        ))
        return
    start = window.get("start")
    stop = window.get("stop")
    time_unit = window.get("unit")
    rate_unit = response.get("unit")
    if (
        not _is_finite_json_number(start)
        or not _is_finite_json_number(stop)
        or not isinstance(time_unit, str)
        or not isinstance(rate_unit, str)
    ):
        return
    if (
        time_unit not in UNITS or rate_unit not in UNITS or
        UNITS[time_unit]["dimension"] != "time" or
        UNITS[rate_unit]["dimension"] != "frequency"
    ):
        # unit.canonical_code / unit.dimension_match owns the actionable error.
        # The response audit is a sibling semantic rule and must remain total when
        # that earlier rule has already found an alias, unknown, or opaque unit.
        return
    duration = (Fraction.from_float(float(stop)) - Fraction.from_float(float(start))) * _unit_scale(time_unit)
    rate_scale = _unit_scale(rate_unit)
    if duration <= 0:
        return
    for index, (count, value) in enumerate(zip(counts, values)):
        if (count is None) != (value is None):
            _response_error(errors, response_path + f"/audit/eventCounts/{index}",
                            "audited count and response must share one null mask")
            return
        if count is None:
            continue
        if not _is_json_integer(count) or not (0 <= int(count) <= _MAX_SAFE_INTEGER):
            errors.append(CortexelError(
                "SCIENCE_COUNT_NOT_INTEGER", "science",
                response_path + f"/audit/eventCounts/{index}",
                "audited event count must be an exact non-negative safe integer"
            ))
            return
        integer_count = int(count)
        exact = Fraction(integer_count, divisor) / duration / rate_scale
        try:
            expected = float(exact)
        except OverflowError:
            _response_error(errors, response_path + f"/values/{index}",
                            "audited rate overflows binary64")
            return
        if not math.isfinite(expected) or (integer_count != 0 and expected == 0.0):
            _response_error(errors, response_path + f"/values/{index}",
                            "audited rate is not representable in binary64")
            return
        if not isinstance(value, (int, float)) or isinstance(value, bool) or float(value) != expected:
            _response_error(errors, response_path + f"/values/{index}",
                            "supplied rate disagrees with the independently derived exact rate")
            return


def _validate_detached_request_partial(request: Any) -> ErrorList:
    """Validate one exact built-in tree already detached by the snapshot boundary."""
    errors: ErrorList = []

    if type(request) is not dict:
        errors.append(CortexelError("SCHEMA_TYPE_MISMATCH", "structural", "",
                                     "a figure request must be a JSON object"))
        return _finalize_errors(errors)

    # Authority first, on the detached request snapshot.
    _find_authored(request, "", errors)
    if errors:
        return _finalize_errors(errors)

    # Identity.
    contract = request.get("contract")
    if not isinstance(contract, dict):
        errors.append(CortexelError("CONTRACT_MISSING", "identity", "/contract",
                                     "the request does not declare its contract"))
        return _finalize_errors(errors)
    if (
        contract.get("name") != _REQUEST_CONTRACT_NAME
        or contract.get("version") != _REQUEST_CONTRACT_VERSION
    ):
        errors.append(CortexelError("CONTRACT_UNSUPPORTED_VERSION", "identity", "/contract",
                                     "unsupported request-contract version"))
        return _finalize_errors(errors)

    skill = request.get("skill")
    if not isinstance(skill, dict):
        errors.append(CortexelError("SCHEMA_REQUIRED_PROPERTY_MISSING", "structural", "/skill/id",
                                     "the request does not name a skill"))
        return _finalize_errors(errors)
    skill_id = skill.get("id")
    if not isinstance(skill_id, str):
        errors.append(CortexelError("SCHEMA_REQUIRED_PROPERTY_MISSING", "structural", "/skill/id",
                                     "the request does not name a skill"))
        return _finalize_errors(errors)

    # Resolve only a catalog-owned id. Constructing a filesystem path from an
    # unregistered caller string would turn an identity diagnostic into a package
    # resource traversal oracle.
    if skill_id not in SKILL_REVISIONS:
        errors.append(CortexelError("SCHEMA_UNKNOWN_SKILL", "structural", "/skill/id",
                                     f"'{skill_id}' is not a stable catalog id"))
        return _finalize_errors(errors)
    schema_path = f"schemas/skills/{skill_id}.request.v1.schema.json"

    requested_revision = skill.get("revision")
    installed_revision = SKILL_REVISIONS.get(skill_id)
    if (
        isinstance(requested_revision, (int, float))
        and not isinstance(requested_revision, bool)
        and requested_revision != installed_revision
    ):
        errors.append(CortexelError(
            "CONTRACT_SKILL_REVISION_UNSUPPORTED",
            "identity",
            "/skill/revision",
            f"this build provides {skill_id} revision {installed_revision}, "
            f"not {requested_revision}. Omit the field to accept the installed revision.",
        ))
        return _finalize_errors(errors)

    _validate_schema(request, _load_schema(schema_path), "", errors)
    if errors:
        return _finalize_errors(errors)

    # Semantic layer (the subset ported to Python).
    _validate_units(request, errors)
    if skill_id == "neuro.spike_raster":
        _validate_spike_raster(request, errors)
    elif skill_id == "neuro.psth":
        _validate_psth(request, errors)
    elif skill_id == "neuro.response_curve":
        _validate_response_curve(request, errors)
    return _finalize_errors(errors)


def validate_request_partial(request: Any) -> ErrorList:
    """Inspect a request with the semantic subset currently implemented in Python.

    Order mirrors the TypeScript pipeline: snapshot, authority, identity, structure, then
    the semantic subset this Python port implements. That subset includes units, exact
    spike-raster revision-2 window/source-clock authority, PSTH portable
    count/exposure/normalization/baseline authority, and response-curve rate/basis
    authority; other deeper validators (correlogram and topology scope, for example)
    are ported incrementally; see docs/KNOWN_LIMITATIONS.md. Where Python
    implements a rule, it reaches the same decision as TypeScript — which is what the
    cross-language parity test asserts.
    """
    detached, snapshot_error = _snapshot_materialized(request)
    if snapshot_error is not None:
        return _finalize_errors([snapshot_error])
    return _validate_detached_request_partial(detached)


def validate_request(request: Any) -> ErrorList:
    """Fail-closed full validation boundary.

    The independent Python runtime intentionally has not yet ported every semantic
    validator named by every stable skill. Returning an empty list after only the
    implemented subset would falsely certify requests that the TypeScript authority can
    reject. Definite structural or implemented-semantic failures are returned directly;
    otherwise this reader returns ``SEMANTIC_VALIDATOR_UNAVAILABLE`` until the selected
    skill's complete validator set has an independently reviewed Python implementation.

    Use :func:`validate_request_partial` only for explicit development inspection and
    cross-language differential tests. Its empty result is not a validity certificate.
    """
    detached, snapshot_error = _snapshot_materialized(request)
    if snapshot_error is not None:
        return _finalize_errors([snapshot_error])

    errors = _validate_detached_request_partial(detached)
    if errors:
        return errors

    # This diagnostic-only dispatch reads the same detached tree that passed every prior
    # stage. The original caller object is never observed again after the snapshot.
    skill = dict.get(detached, "skill") if type(detached) is dict else None
    skill_id = dict.get(skill, "id") if type(skill) is dict else None
    if type(skill_id) is not str:
        skill_id = None
    return [CortexelError(
        "SEMANTIC_VALIDATOR_UNAVAILABLE",
        "semantic",
        "/skill/id",
        f"the Python reader cannot certify {skill_id!r}: its complete registered "
        "semantic-validator set is not yet ported; use the TypeScript authority for full validation",
    )]


def is_valid(request: Any) -> bool:
    """Return true only after the fail-closed full validation boundary succeeds."""
    return len(validate_request(request)) == 0
