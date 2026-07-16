"""RFC 8785 JSON Canonicalization Scheme — the independent Python implementation.

This is the second reader. If it and the TypeScript canonicalizer disagree on one byte,
every cross-language digest claim is false — so this is implemented from the scheme's
rules, not by reaching for ``json.dumps(sort_keys=True)``, which differs from JCS in
number formatting, key ordering, and escaping.

The two subtle points, both handled explicitly:

* Numbers use the ECMAScript ``Number::toString`` algorithm, NOT Python's ``repr``.
  Python prints ``100.0`` where JCS requires ``100``, and ``1e-06`` where JCS requires
  ``0.000001``. ``_js_number`` ports the ECMAScript formatting from the shortest
  round-tripping digits.
* ``-0.0`` canonicalizes to ``0`` (``-0.0 == 0.0`` in Python, so this falls out of the
  zero check — but only because it is written deliberately, not by accident).

Object members sort by UTF-16 code unit (RFC 8785 section 3.2.3). Python's default sort
is by code POINT, which differs for characters outside the Basic Multilingual Plane
(astral characters such as emoji). ``_utf16_key`` re-encodes to UTF-16 code units so the
ordering matches JavaScript exactly.
"""

from __future__ import annotations

import hashlib
import math
from typing import Any

_MAX_SAFE_INTEGER = (1 << 53) - 1


class CanonicalizationError(ValueError):
    """A value outside the JCS domain has no canonical form."""


def _js_number(value: float) -> str:
    """Format a finite number exactly as ECMAScript ``Number::toString`` would."""
    if math.isnan(value) or math.isinf(value):
        raise CanonicalizationError("non-finite numbers are outside the JCS domain")

    # -0.0 == 0.0, so both map here; JCS emits "0".
    if value == 0:
        return "0"

    negative = value < 0
    magnitude = -value if negative else value

    # Shortest round-tripping decimal digits and the decimal point position `n`, such that
    # value = s * 10**(n - k) with s a k-digit integer (10**(k-1) <= s < 10**k).
    digits, n = _shortest_digits(magnitude)
    k = len(digits)

    if k <= n <= 21:
        body = digits + "0" * (n - k)
    elif 0 < n <= 21:
        body = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        body = "0." + "0" * (-n) + digits
    else:
        # Exponential form: one digit, optional fraction, "e", signed exponent (n - 1).
        exponent = n - 1
        mantissa = digits[0] if k == 1 else digits[0] + "." + digits[1:]
        sign = "+" if exponent >= 0 else "-"
        body = f"{mantissa}e{sign}{abs(exponent)}"

    return "-" + body if negative else body


def _shortest_digits(magnitude: float) -> tuple[str, int]:
    """Return (significant-digit string without trailing zeros, decimal position n).

    ``repr(float)`` yields the shortest decimal that round-trips (Python 3), the same
    shortest set JavaScript uses; only the *formatting* differs, and that is what this
    function normalizes away.
    """
    text = repr(magnitude)

    mantissa, _, exp_part = text.partition("e")
    exponent = int(exp_part) if exp_part else 0

    int_part, _, frac_part = mantissa.partition(".")
    all_digits = int_part + frac_part
    # `n` counts digits before the decimal point in the un-normalized mantissa, then shifts
    # by the parsed exponent.
    point = len(int_part) + exponent

    # Strip leading zeros (adjusting the point) and trailing zeros.
    stripped = all_digits.lstrip("0")
    point -= len(all_digits) - len(stripped)
    stripped = stripped.rstrip("0")
    if stripped == "":
        stripped = "0"

    return stripped, point


def _utf16_key(key: str) -> list[int]:
    """A UTF-16 code-unit sort key, matching JavaScript's string comparison."""
    return list(key.encode("utf-16-be"))


def _assert_well_formed(text: str) -> None:
    # A lone surrogate has no UTF-8 encoding, so no canonical byte sequence.
    try:
        text.encode("utf-8")
    except UnicodeEncodeError as exc:
        raise CanonicalizationError("string is not well-formed Unicode") from exc


def _escape_string(text: str) -> str:
    _assert_well_formed(text)
    out = ['"']
    for ch in text:
        code = ord(ch)
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif ch == "\b":
            out.append("\\b")
        elif ch == "\f":
            out.append("\\f")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif code < 0x20:
            out.append(f"\\u{code:04x}")
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def canonicalize(value: Any, _depth: int = 0) -> str:
    """Canonicalize a JSON-compatible value to its RFC 8785 string form."""
    if _depth > 128:
        raise CanonicalizationError("value nests deeper than the canonicalizer permits")

    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, bool):  # pragma: no cover - covered by the two lines above
        return "true" if value else "false"
    if isinstance(value, int):
        # Python integers are arbitrary precision, while the JCS data model is IEEE-754.
        # Values outside the I-JSON safe range must be represented as strings or as an
        # explicitly approximate float; silently rounding them would create digest aliases.
        if abs(value) > _MAX_SAFE_INTEGER:
            raise CanonicalizationError("integer is outside the interoperable exact range")
        return str(value)
    if isinstance(value, float):
        return _js_number(value)
    if isinstance(value, str):
        return _escape_string(value)
    if isinstance(value, (list, tuple)):
        # Array order is data; never sorted.
        return "[" + ",".join(canonicalize(item, _depth + 1) for item in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys(), key=_utf16_key)
        parts = []
        for key in keys:
            if not isinstance(key, str):
                raise CanonicalizationError("object keys must be strings")
            child = value[key]
            parts.append(f"{_escape_string(key)}:{canonicalize(child, _depth + 1)}")
        return "{" + ",".join(parts) + "}"

    raise CanonicalizationError(f"values of type {type(value).__name__} are outside the JCS domain")


def canonical_digest(value: Any) -> str:
    """SHA-256 over the canonical bytes: ``sha256:<64 hex>``. Uses the standard library
    hashlib — an independent, well-audited SHA-256, not a reimplementation."""
    canonical = canonicalize(value).encode("utf-8")
    return "sha256:" + hashlib.sha256(canonical).hexdigest()


def canonical_digest_excluding(value: dict, exclude_key: str) -> str:
    """Digest an object with one top-level member removed (for a self-referential digest)."""
    copy = {k: v for k, v in value.items() if k != exclude_key}
    return canonical_digest(copy)
