"""Cortexel — the independent Python reader of the figure contract.

This package validates, canonicalizes, and digests Cortexel requests WITHOUT invoking
Node or importing any generated JavaScript. Its purpose is to be a genuinely independent
second implementation, so that agreement between it and the TypeScript side on the
conformance corpus is evidence rather than tautology.

The current private development reader provides parsing, RFC 8785 canonicalization,
SHA-256 digests, contract identity, and structural + core-semantic validation. Rendering
remains the Node reference implementation's job; Python emits and checks the contract,
not the SVG.
"""

from __future__ import annotations

from .canonicalize import (
    IDENTIFIER_SET_CANONICALIZATION_ID,
    CanonicalizationError,
    canonical_digest,
    canonical_digest_excluding,
    canonical_identifier_set_digest,
    canonicalize,
)
from .discovery import describe_skill, list_skills
from .generated.catalog import (
    AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
    CATALOG_DIGEST,
    CATALOG_DIGEST_DOMAIN,
    CONTRACT_DIGEST,
    PACKAGE_VERSION,
    STABLE_SKILL_IDS,
)
from .identity import get_build_identity
from .parse_json import JsonParseError, parse_json_strict
from .validate import (
    CortexelError,
    is_valid,
    validate_request,
    validate_request_partial,
)

__all__ = [
    "AUTHORING_SCHEMA_COMPILATION_PROFILE_V1",
    "CATALOG_DIGEST",
    "CATALOG_DIGEST_DOMAIN",
    "CONTRACT_DIGEST",
    "IDENTIFIER_SET_CANONICALIZATION_ID",
    "PACKAGE_VERSION",
    "STABLE_SKILL_IDS",
    "CanonicalizationError",
    "CortexelError",
    "JsonParseError",
    "canonical_digest",
    "canonical_digest_excluding",
    "canonical_identifier_set_digest",
    "canonicalize",
    "describe_skill",
    "get_build_identity",
    "is_valid",
    "list_skills",
    "parse_json_strict",
    "validate_request",
    "validate_request_partial",
]
