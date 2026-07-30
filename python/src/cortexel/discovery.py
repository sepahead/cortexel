"""Offline, versioned FigureRequest discovery for Python agents.

The full Cortexel acceptance authority currently remains the TypeScript pipeline. This
module exposes the same generated stable metadata, synthetic fixtures, and structural
schemas without pretending that Python's explicitly partial semantic port is complete.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from importlib.resources import files
from typing import Any, Literal

from .generated.catalog import (
    AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
    CATALOG_DIGEST_DOMAIN,
    SKILL_AUTHORING_EXAMPLES,
    SKILL_CATALOG,
    STABLE_SKILL_IDS,
)
from .identity import get_build_identity

DescribeSection = Literal["summary", "example", "schema", "all"]
_SECTIONS: tuple[DescribeSection, ...] = ("summary", "example", "schema", "all")


def _discovery_identity() -> dict[str, object]:
    return {
        **get_build_identity(),
        "catalogDigestDomain": CATALOG_DIGEST_DOMAIN,
    }


def _thaw(value: Any) -> Any:
    """Return detached JSON-compatible data from recursively frozen generated values."""
    if isinstance(value, Mapping):
        return {str(key): _thaw(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_thaw(item) for item in value]
    return value


def _load_resource(relative: str) -> dict[str, Any]:
    resource = files("cortexel").joinpath("contract", *relative.split("/"))
    value = json.loads(resource.read_text(encoding="utf-8"))
    if type(value) is not dict:
        raise RuntimeError(f"packaged discovery resource {relative!r} is not an object")
    return value


def _summary(skill_id: str) -> dict[str, Any]:
    skill = SKILL_CATALOG[skill_id]
    adapters = []
    for adapter_value in skill["adapters"]:
        adapter = adapter_value
        adapters.append({
            "mappingId": adapter["mappingId"],
            "feasibilityStatus": adapter["feasibilityStatus"],
            "definitionStatus": adapter["definitionStatus"],
            "implementationAvailability": adapter["implementationAvailability"],
        })
    return {
        "id": skill["id"],
        "revision": skill["revision"],
        "title": skill["title"],
        "question": skill["canonicalQuestion"],
        "availability": skill["availability"],
        "releaseReady": skill["releaseReady"],
        "renderer": _thaw(skill["renderer"]),
        "adapters": adapters,
    }


def list_skills() -> dict[str, Any]:
    """Return the closed stable catalog envelope as detached JSON-compatible data."""
    return {
        "protocol": "cortexel-python-catalog",
        "protocolVersion": 1,
        "buildIdentity": _discovery_identity(),
        "skills": [_summary(skill_id) for skill_id in STABLE_SKILL_IDS],
    }


def describe_skill(
    skill_id: str,
    *,
    section: DescribeSection = "all",
) -> dict[str, Any]:
    """Describe one exact stable skill without network or simulator access.

    ``authoringExample`` is synthetic. ``requestSchema`` establishes structural shape
    only. Every real request still needs the full TypeScript validation boundary.
    """
    if type(skill_id) is not str or skill_id not in SKILL_CATALOG:
        raise ValueError("unknown stable Cortexel skill id")
    if type(section) is not str or section not in _SECTIONS:
        raise ValueError("section must be summary, example, schema, or all")

    payload: dict[str, Any] = {
        "protocol": "cortexel-python-describe",
        "protocolVersion": 1,
        "buildIdentity": _discovery_identity(),
        "section": section,
        "skill": (
            _thaw(SKILL_CATALOG[skill_id])
            if section == "all"
            else _summary(skill_id)
        ),
        "acceptanceBoundary": {
            "runtime": "cortexel/figure",
            "note": (
                "Structural schema success and Python partial-semantic success are not "
                "full acceptance. Use the TypeScript Cortexel validation pipeline."
            ),
        },
    }
    if section in ("example", "all"):
        payload["authoringExample"] = _thaw(SKILL_AUTHORING_EXAMPLES[skill_id])
    if section in ("schema", "all"):
        payload["requestSchema"] = _load_resource(
            f"schemas/skills/{skill_id}.request.v1.schema.json",
        )
        payload["schemaResources"] = [
            _load_resource("schemas/common.v1.schema.json"),
            _load_resource("schemas/generated/registry-enums.v1.schema.json"),
        ]
        payload["schemaResources"].sort(key=lambda item: item["$id"])
        payload["schemaCompilationProfile"] = _thaw(
            AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
        )
    return payload
