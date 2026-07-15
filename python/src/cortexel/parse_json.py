"""Strict JSON parsing — the Python side of the raw-text boundary.

Like the TypeScript parser, this rejects a duplicate object member (which ``json.loads``
would silently resolve) and prototype-polluting keys, and it reports the honest
distinction between the raw-text boundary and an already-materialized value.

Duplicate detection uses ``object_pairs_hook``: the hook sees every (key, value) pair
before Python collapses them into a dict, so a repeated key is caught rather than lost.
"""

from __future__ import annotations

import json
from typing import Any

_DANGEROUS_KEYS = {"__proto__", "constructor", "prototype"}


class JsonParseError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def _pairs_hook(pairs):
    seen = set()
    result = {}
    for key, value in pairs:
        if key in _DANGEROUS_KEYS:
            raise JsonParseError(
                "JSON_DANGEROUS_KEY",
                f"the member name {key!r} can reach the object prototype and is rejected",
            )
        if key in seen:
            raise JsonParseError(
                "JSON_DUPLICATE_KEY",
                f"the member name {key!r} appears more than once; which value would win is undefined",
            )
        seen.add(key)
        result[key] = value
    return result


def _reject_non_finite(value: Any) -> None:
    if isinstance(value, float):
        # Python's json accepts NaN/Infinity by default; Cortexel does not.
        if value != value or value in (float("inf"), float("-inf")):
            raise JsonParseError(
                "JSON_NON_FINITE_NUMBER",
                "the number is outside the finite binary64 model",
            )
    elif isinstance(value, dict):
        for child in value.values():
            _reject_non_finite(child)
    elif isinstance(value, list):
        for child in value:
            _reject_non_finite(child)


def parse_json_strict(text: str) -> Any:
    """Parse raw JSON text strictly. Raises ``JsonParseError`` with a stable code."""
    if text.startswith("﻿"):
        raise JsonParseError("JSON_BOM_NOT_ALLOWED", "the input begins with a byte-order mark")
    if text.strip() == "":
        raise JsonParseError("JSON_EMPTY_INPUT", "the input contained no JSON value")

    try:
        # allow_nan=False rejects NaN/Infinity literals during parsing.
        value = json.loads(text, object_pairs_hook=_pairs_hook, parse_constant=_reject_constant)
    except JsonParseError:
        raise
    except json.JSONDecodeError as exc:
        raise JsonParseError("JSON_SYNTAX", f"invalid JSON: {exc.msg}") from exc

    _reject_non_finite(value)
    return value


def _reject_constant(_name: str):
    raise JsonParseError("JSON_NON_FINITE_NUMBER", "NaN and Infinity are not valid JSON")
