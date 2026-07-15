"""Cortexel — the independent Python reader of the figure contract.

This package validates, canonicalizes, and digests Cortexel requests WITHOUT invoking
Node or importing any generated JavaScript. Its purpose is to be a genuinely independent
second implementation, so that agreement between it and the TypeScript side on the
conformance corpus is evidence rather than tautology.

For 0.9.0 it provides parsing, RFC 8785 canonicalization, SHA-256 digests, contract
identity, and structural + core-semantic validation. Rendering remains the Node
reference implementation's job; Python emits and checks the contract, not the SVG.
"""

from __future__ import annotations

from .canonicalize import canonicalize, canonical_digest, canonical_digest_excluding, CanonicalizationError
from .parse_json import parse_json_strict, JsonParseError
from .validate import validate_request, is_valid, CortexelError
from .identity import get_build_identity
from .generated.catalog import (
    PACKAGE_VERSION,
    CONTRACT_DIGEST,
    CATALOG_DIGEST,
    STABLE_SKILL_IDS,
)

__all__ = [
    "canonicalize",
    "canonical_digest",
    "canonical_digest_excluding",
    "CanonicalizationError",
    "parse_json_strict",
    "JsonParseError",
    "validate_request",
    "is_valid",
    "CortexelError",
    "get_build_identity",
    "PACKAGE_VERSION",
    "CONTRACT_DIGEST",
    "CATALOG_DIGEST",
    "STABLE_SKILL_IDS",
]
