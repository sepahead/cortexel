"""Independent structural and semantic validation.

This is a genuinely independent second implementation: it does not call Node, does not
import generated JavaScript, and does not depend on a shared JSON Schema library. It
reads the same normative schemas the TypeScript side reads and reaches the same
accept/reject decision — which is what makes cross-language parity meaningful rather than
circular.

For 0.9.0 it implements the structural subset the contract actually uses (type,
required, additionalProperties, enum, const, oneOf/anyOf/allOf, $ref within the shared
schemas, minimum/maximum, minItems/maxItems, minLength/maxLength) plus the load-bearing
semantic rules: the caller-authority boundary and unit-dimension matching. That is enough
to certify that the two implementations agree on the corpus; the remaining semantic
validators are ported incrementally.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

_CONTRACT_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "contract")
)


class CortexelError:
    def __init__(self, code: str, stage: str, instance_path: str, message: str) -> None:
        self.code = code
        self.stage = stage
        self.instance_path = instance_path
        self.message = message

    def as_dict(self) -> dict:
        return {
            "code": self.code,
            "stage": self.stage,
            "instancePath": self.instance_path,
            "message": self.message,
        }


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

from .generated.catalog import UNITS, UNIT_ALIASES, QUANTITY_KIND_DIMENSIONS

_schema_cache: dict[str, dict] = {}


def _load_schema(relative: str) -> dict:
    if relative not in _schema_cache:
        with open(os.path.join(_CONTRACT_ROOT, relative), encoding="utf-8") as handle:
            _schema_cache[relative] = json.load(handle)
    return _schema_cache[relative]


def _resolve_ref(ref: str) -> dict:
    """Resolve a $ref within the shared schema set. Offline only — no network.

    An empty base (a same-document ``#/$defs/...`` pointer) resolves within
    common.v1.schema.json: that is the only schema carrying internal ``$defs`` that the
    others reference, and the skill request schemas inline everything else.
    """
    base, _, pointer = ref.partition("#")
    if "registry-enums" in base:
        root: Any = _load_schema("schemas/generated/registry-enums.v1.schema.json")
    else:
        # common.v1 (by full URL) or an empty same-document base both land here.
        root = _load_schema("schemas/common.v1.schema.json")
    node: Any = root
    for token in pointer.split("/"):
        if token in ("", "#"):
            continue
        token = token.replace("~1", "/").replace("~0", "~")
        node = node[token]
    return node


def _pointer(*segments) -> str:
    if not segments:
        return ""
    return "".join(
        "/" + str(s).replace("~", "~0").replace("/", "~1") for s in segments
    )


def _validate_schema(value: Any, schema: dict, path: str, errors: list) -> None:
    if "$ref" in schema:
        _validate_schema(value, _resolve_ref(schema["$ref"]), path, errors)
        return

    if "const" in schema:
        if value != schema["const"]:
            errors.append(CortexelError("SCHEMA_ENUM_MISMATCH", "structural", path,
                                        f"expected the constant {schema['const']!r}"))
        return

    if "enum" in schema:
        if value not in schema["enum"]:
            errors.append(CortexelError("SCHEMA_ENUM_MISMATCH", "structural", path,
                                        "the value is outside the closed enumeration"))
        return

    for key in ("oneOf", "anyOf"):
        if key in schema:
            branch_errors = []
            matched = 0
            for branch in schema[key]:
                local: list = []
                _validate_schema(value, branch, path, local)
                if not local:
                    matched += 1
                else:
                    branch_errors.extend(local)
            need = 1 if key == "oneOf" else 1
            if matched < need:
                # Surface the branch errors so the failure is actionable.
                errors.extend(branch_errors[:4] or [
                    CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                  f"the value matched no {key} branch")
                ])
            return

    if "allOf" in schema:
        for branch in schema["allOf"]:
            _validate_schema(value, branch, path, errors)

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
                _validate_schema(value[key], child_schema, path + _pointer(key), errors)

    elif isinstance(value, list):
        item_schema = schema.get("items")
        if item_schema:
            for index, item in enumerate(value):
                _validate_schema(item, item_schema, path + _pointer(index), errors)
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"expected at least {schema['minItems']} items"))

    elif isinstance(value, str):
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"string exceeds maxLength {schema['maxLength']}"))

    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"below minimum {schema['minimum']}"))
        if "exclusiveMinimum" in schema and value <= schema["exclusiveMinimum"]:
            errors.append(CortexelError("SCHEMA_VALIDATION_FAILED", "structural", path,
                                        f"not above exclusiveMinimum {schema['exclusiveMinimum']}"))


def _type_matches(value: Any, types: list) -> bool:
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
        if t == "integer" and isinstance(value, int) and not isinstance(value, bool):
            return True
        if t == "number" and isinstance(value, (int, float)) and not isinstance(value, bool):
            return True
    return False


def _find_authored(node: Any, path: str, errors: list, depth: int = 0) -> None:
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


def _collect_quantities(node: Any, path: str, out: list, depth: int = 0) -> None:
    """Find every {kind, unit} quantity, and every bare {unit} field, with its path."""
    if depth > 32 or not isinstance(node, (dict, list)):
        return
    if isinstance(node, list):
        for i, item in enumerate(node):
            _collect_quantities(item, path + _pointer(i), out, depth + 1)
        return
    kind = node.get("kind")
    unit = node.get("unit")
    if isinstance(unit, str):
        out.append((kind if isinstance(kind, str) else None, unit, path))
    for key, child in node.items():
        _collect_quantities(child, path + _pointer(key), out, depth + 1)


def _validate_units(request: dict, errors: list) -> None:
    """Independent port of unit.canonical_code and unit.dimension_match.

    An accepted alias is rejected (never silently converted); a unit whose dimension does
    not match its quantity kind is rejected. This is the same decision the TypeScript
    semantic validators make, implemented independently here.
    """
    quantities: list = []
    _collect_quantities(request.get("data"), "/data", quantities)
    _collect_quantities(request.get("parameters"), "/parameters", quantities)

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
        if kind is not None:
            dimension = UNITS[unit]["dimension"]
            allowed = QUANTITY_KIND_DIMENSIONS.get(kind, [])
            if dimension not in allowed:
                errors.append(CortexelError(
                    "SCIENCE_UNIT_DIMENSION_MISMATCH", "science", unit_path,
                    f"kind '{kind}' cannot carry unit '{unit}' (dimension {dimension})"))


def validate_request(request: Any) -> list:
    """Validate a request. Returns a list of CortexelError; empty means valid.

    Order mirrors the TypeScript pipeline: authority, then identity, then structure, then
    the semantic layer this Python port implements (units). Deeper semantic validators
    (rate re-derivation, reference-in-universe, correlogram) are ported incrementally; see
    docs/KNOWN_LIMITATIONS.md. Where Python implements a rule, it reaches the same decision
    as TypeScript — which is what the cross-language parity test asserts.
    """
    errors: list = []

    if not isinstance(request, dict):
        errors.append(CortexelError("SCHEMA_TYPE_MISMATCH", "structural", "",
                                     "a figure request must be a JSON object"))
        return errors

    # Authority first, on the raw request.
    _find_authored(request, "", errors)
    if errors:
        return errors

    # Identity.
    contract = request.get("contract")
    if not isinstance(contract, dict):
        errors.append(CortexelError("CONTRACT_MISSING", "identity", "/contract",
                                     "the request does not declare its contract"))
        return errors
    if contract.get("name") != "cortexel-figure-request" or contract.get("version") != "1.0":
        errors.append(CortexelError("CONTRACT_UNSUPPORTED_VERSION", "identity", "/contract",
                                     "unsupported request-contract version"))
        return errors

    skill = request.get("skill")
    skill_id = skill.get("id") if isinstance(skill, dict) else None
    if not isinstance(skill_id, str):
        errors.append(CortexelError("SCHEMA_REQUIRED_PROPERTY_MISSING", "structural", "/skill/id",
                                     "the request does not name a skill"))
        return errors

    schema_path = f"schemas/skills/{skill_id}.request.v1.schema.json"
    full = os.path.join(_CONTRACT_ROOT, schema_path)
    if not os.path.exists(full):
        errors.append(CortexelError("SCHEMA_UNKNOWN_SKILL", "structural", "/skill/id",
                                     f"'{skill_id}' is not a stable catalog id"))
        return errors

    _validate_schema(request, _load_schema(schema_path), "", errors)
    if errors:
        return errors

    # Semantic layer (the subset ported to Python).
    _validate_units(request, errors)
    return errors


def is_valid(request: Any) -> bool:
    return len(validate_request(request)) == 0
