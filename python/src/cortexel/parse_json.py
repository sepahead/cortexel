"""Strict JSON parsing — the Python side of the raw-text boundary.

Like the TypeScript parser, this rejects a duplicate object member (which ``json.loads``
would silently resolve) and prototype-polluting keys, and it reports the honest
distinction between the raw-text boundary and an already-materialized value.

Duplicate detection uses ``object_pairs_hook``: the hook sees every (key, value) pair
before Python collapses them into a dict, so a repeated key is caught rather than lost.
"""

from __future__ import annotations

import json
import math
from typing import Any, NoReturn

from .canonicalize import _js_number

_DANGEROUS_KEYS = {"__proto__", "constructor", "prototype"}
_MAX_SAFE_INTEGER = (1 << 53) - 1


class JsonParseError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def _assert_well_formed_unicode(value: str) -> None:
    try:
        value.encode("utf-8")
    except UnicodeEncodeError as exc:
        raise JsonParseError(
            "JSON_INVALID_UNICODE",
            "a JSON string or object member name contains an unpaired surrogate",
        ) from exc


def _pairs_hook(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    seen: set[str] = set()
    result: dict[str, Any] = {}
    for key, value in pairs:
        # Validate before hashing/comparing the key so every malformed member name
        # follows the same stable public error path as a malformed string value.
        _assert_well_formed_unicode(key)
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
    if isinstance(value, str):
        _assert_well_formed_unicode(value)
    elif isinstance(value, float):
        # Python's json accepts NaN/Infinity by default; Cortexel does not.
        if value != value or value in (float("inf"), float("-inf")):
            raise JsonParseError(
                "JSON_NON_FINITE_NUMBER",
                "the number is outside the finite binary64 model",
            )
    elif isinstance(value, dict):
        for key, child in value.items():
            _assert_well_formed_unicode(key)
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
        value = json.loads(
            text,
            object_pairs_hook=_pairs_hook,
            parse_constant=_reject_constant,
            parse_int=_parse_integer,
        )
    except JsonParseError:
        raise
    except json.JSONDecodeError as exc:
        raise JsonParseError("JSON_SYNTAX", f"invalid JSON: {exc.msg}") from exc

    _reject_non_finite(value)
    return value


def _reject_constant(_name: str) -> NoReturn:
    raise JsonParseError("JSON_NON_FINITE_NUMBER", "NaN and Infinity are not valid JSON")


def _parse_integer(token: str) -> int | float:
    value = int(token)
    if abs(value) > _MAX_SAFE_INTEGER:
        try:
            binary64 = float(value)
        except (OverflowError, ValueError):
            binary64 = math.inf
        if math.isfinite(binary64) and _js_number(binary64) == token:
            # RFC 8785 emits some binary64 measurements as unsafe-looking bare
            # integers. Returning float is deliberate: the token is accepted as
            # that canonical binary64 measurement, not promoted to a Python bigint.
            return binary64
        raise JsonParseError(
            "JSON_INTEGER_OUT_OF_RANGE",
            "the unsafe bare integer is not the canonical spelling of its parsed binary64 value",
        )
    return value
