"""Budgeted strict JSON parsing at the Python raw-text boundary.

The parser is intentionally independent from :mod:`json`. Duplicate members and
resource limits must be checked while tokens are still visible and before an
unbounded object graph is materialized. The public entry point uses Cortexel's
generated ``standard`` budget profile and returns only ordinary built-in values.
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any, NoReturn

from .canonicalize import _js_number
from .generated.catalog import BUDGET_PROFILES

_DANGEROUS_KEYS = {"__proto__", "constructor", "prototype"}
_MAX_SAFE_INTEGER = (1 << 53) - 1
_LIMIT_KEYS = (
    "rawInputBytes",
    "jsonDepth",
    "jsonTotalNodes",
    "jsonStringLength",
    "jsonNumberTokenLength",
    "jsonObjectKeys",
    "jsonArrayItems",
)
_HEX_DIGITS = frozenset("0123456789abcdefABCDEF")


class JsonParseError(ValueError):
    """A strict-parser rejection with a stable machine-readable error code."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def _bounded_utf8_byte_length(text: str, limit: int) -> int:
    """Count through the first complete code point that exceeds ``limit``."""
    byte_count = 0
    index = 0
    while index < len(text):
        code = ord(text[index])
        if code <= 0x7F:
            byte_count += 1
        elif code <= 0x7FF:
            byte_count += 2
        elif 0xD800 <= code <= 0xDBFF:
            if index + 1 < len(text) and 0xDC00 <= ord(text[index + 1]) <= 0xDFFF:
                byte_count += 4
                index += 1
            else:
                # Match UTF-8 replacement behavior for the budget check. The
                # scanner subsequently rejects the malformed Unicode itself.
                byte_count += 3
        elif code <= 0xFFFF:
            byte_count += 3
        else:
            byte_count += 4
        index += 1
        if byte_count > limit:
            return byte_count
    return byte_count


def _snapshot_limits(limits: Mapping[str, int]) -> dict[str, int]:
    try:
        snapshot: dict[str, int] = {}
        for key in _LIMIT_KEYS:
            value = limits[key]
            if type(value) is not int or value < 0:  # bool is not a budget integer
                raise ValueError("invalid limit")
            snapshot[key] = value
        return snapshot
    except (KeyError, TypeError, ValueError) as exc:
        raise JsonParseError(
            "INTERNAL_INVARIANT_VIOLATED",
            "the strict parser requires a complete non-negative integer budget object",
        ) from exc


class _Scanner:
    __slots__ = ("_index", "_limits", "_nodes", "_text")

    def __init__(self, text: str, limits: Mapping[str, int]) -> None:
        self._text = text
        self._limits = limits
        self._index = 0
        self._nodes = 0

    def _fail(self, code: str, message: str) -> NoReturn:
        raise JsonParseError(code, message)

    def _character(self, offset: int = 0) -> str | None:
        index = self._index + offset
        return self._text[index] if index < len(self._text) else None

    def _skip_whitespace(self) -> None:
        while self._index < len(self._text):
            character = self._text[self._index]
            if character in " \t\n\r":
                self._index += 1
                continue
            if character == "/":
                self._fail("JSON_COMMENT_NOT_ALLOWED", "comments are not valid JSON")
            return

    def _expect(self, character: str) -> None:
        if self._character() != character:
            self._fail(
                "JSON_SYNTAX",
                f"expected {character!r} at offset {self._index}",
            )
        self._index += 1

    def _count_node(self) -> None:
        self._nodes += 1
        if self._nodes > self._limits["jsonTotalNodes"]:
            self._fail("JSON_TOKENS_EXCEEDED", "the document exceeds the total node limit")

    def parse_top_level(self) -> Any:
        self._skip_whitespace()
        if self._index >= len(self._text):
            self._fail("JSON_EMPTY_INPUT", "the input contained no JSON value")
        value = self._parse_value(0)
        self._skip_whitespace()
        if self._index < len(self._text):
            self._fail(
                "JSON_TRAILING_DATA",
                f"unexpected content after the top-level value at offset {self._index}",
            )
        return value

    def _parse_value(self, depth: int) -> Any:
        if depth > self._limits["jsonDepth"]:
            self._fail("JSON_DEPTH_EXCEEDED", "nesting is deeper than the parser permits")
        self._skip_whitespace()
        character = self._character()
        if character == "{":
            return self._parse_object(depth)
        if character == "[":
            return self._parse_array(depth)
        if character == '"':
            self._count_node()
            return self._parse_string()
        if character == "t":
            self._count_node()
            self._literal("true")
            return True
        if character == "f":
            self._count_node()
            self._literal("false")
            return False
        if character == "n":
            self._count_node()
            self._literal("null")
            return None
        self._count_node()
        return self._parse_number()

    def _literal(self, word: str) -> None:
        if self._text.startswith(word, self._index):
            self._index += len(word)
            return
        self._fail("JSON_SYNTAX", f"expected {word} at offset {self._index}")

    def _parse_object(self, depth: int) -> dict[str, Any]:
        self._count_node()
        self._expect("{")
        result: dict[str, Any] = {}
        seen: set[str] = set()

        self._skip_whitespace()
        if self._character() == "}":
            self._index += 1
            return result

        while True:
            self._skip_whitespace()
            if self._character() == "}":
                self._fail("JSON_TRAILING_COMMA_NOT_ALLOWED", "trailing commas are not valid JSON")
            if self._character() != '"':
                self._fail("JSON_SYNTAX", f"expected a member name at offset {self._index}")

            key = self._parse_string()
            if key in _DANGEROUS_KEYS:
                self._fail(
                    "JSON_DANGEROUS_KEY",
                    f"the member name {key!r} can reach the object prototype and is rejected",
                )
            if key in seen:
                self._fail(
                    "JSON_DUPLICATE_KEY",
                    f"the member name {key!r} appears more than once; which value would win is undefined",
                )
            seen.add(key)
            if len(seen) > self._limits["jsonObjectKeys"]:
                self._fail("JSON_TOO_MANY_KEYS", "the object has more members than the parser permits")

            self._skip_whitespace()
            self._expect(":")
            result[key] = self._parse_value(depth + 1)

            self._skip_whitespace()
            character = self._character()
            if character == ",":
                self._index += 1
                continue
            if character == "}":
                self._index += 1
                return result
            self._fail("JSON_SYNTAX", f"expected ',' or '}}' at offset {self._index}")

    def _parse_array(self, depth: int) -> list[Any]:
        self._count_node()
        self._expect("[")
        result: list[Any] = []

        self._skip_whitespace()
        if self._character() == "]":
            self._index += 1
            return result

        while True:
            self._skip_whitespace()
            if self._character() == "]":
                self._fail("JSON_TRAILING_COMMA_NOT_ALLOWED", "trailing commas are not valid JSON")
            result.append(self._parse_value(depth + 1))
            if len(result) > self._limits["jsonArrayItems"]:
                self._fail("JSON_ARRAY_TOO_LONG", "the array has more members than the parser permits")

            self._skip_whitespace()
            character = self._character()
            if character == ",":
                self._index += 1
                continue
            if character == "]":
                self._index += 1
                return result
            self._fail("JSON_SYNTAX", f"expected ',' or ']' at offset {self._index}")

    def _append_string_fragment(self, parts: list[str], units: int, fragment: str) -> int:
        fragment_units = sum(2 if ord(character) > 0xFFFF else 1 for character in fragment)
        observed = units + fragment_units
        if observed > self._limits["jsonStringLength"]:
            self._fail("JSON_STRING_TOO_LONG", "a string is longer than the parser permits")
        parts.append(fragment)
        return observed

    def _parse_string(self) -> str:
        self._expect('"')
        parts: list[str] = []
        units = 0

        while True:
            character = self._character()
            if character is None:
                self._fail("JSON_SYNTAX", "the input ended inside a string")
            if character == '"':
                self._index += 1
                return "".join(parts)
            if character == "\\":
                self._index += 1
                units = self._append_string_fragment(parts, units, self._parse_escape())
                continue

            code = ord(character)
            if code < 0x20:
                self._fail("JSON_SYNTAX", "a raw control character is not valid inside a JSON string")
            if 0xD800 <= code <= 0xDBFF:
                following = self._character(1)
                if following is None or not 0xDC00 <= ord(following) <= 0xDFFF:
                    self._fail("JSON_INVALID_UNICODE", "an unpaired high surrogate is not well-formed Unicode")
                scalar = 0x10000 + ((code - 0xD800) << 10) + (ord(following) - 0xDC00)
                units = self._append_string_fragment(parts, units, chr(scalar))
                self._index += 2
                continue
            if 0xDC00 <= code <= 0xDFFF:
                self._fail("JSON_INVALID_UNICODE", "an unpaired low surrogate is not well-formed Unicode")

            units = self._append_string_fragment(parts, units, character)
            self._index += 1

    def _parse_escape(self) -> str:
        character = self._character()
        self._index += 1
        escapes = {
            '"': '"',
            "\\": "\\",
            "/": "/",
            "b": "\b",
            "f": "\f",
            "n": "\n",
            "r": "\r",
            "t": "\t",
        }
        if character in escapes:
            return escapes[character]
        if character == "u":
            return self._parse_unicode_escape()
        self._fail("JSON_SYNTAX", f"invalid escape sequence \\{character}")

    def _parse_unicode_escape(self) -> str:
        hexadecimal = self._text[self._index : self._index + 4]
        if len(hexadecimal) != 4 or any(character not in _HEX_DIGITS for character in hexadecimal):
            self._fail("JSON_INVALID_UNICODE", "a \\u escape must be followed by four hex digits")
        self._index += 4
        code = int(hexadecimal, 16)

        if 0xD800 <= code <= 0xDBFF:
            if self._text[self._index : self._index + 2] != "\\u":
                self._fail(
                    "JSON_INVALID_UNICODE",
                    "an escaped high surrogate must be followed by a low surrogate",
                )
            low_hexadecimal = self._text[self._index + 2 : self._index + 6]
            if len(low_hexadecimal) != 4 or any(
                character not in _HEX_DIGITS for character in low_hexadecimal
            ):
                self._fail("JSON_INVALID_UNICODE", "a \\u escape must be followed by four hex digits")
            low = int(low_hexadecimal, 16)
            if not 0xDC00 <= low <= 0xDFFF:
                self._fail(
                    "JSON_INVALID_UNICODE",
                    "an escaped high surrogate must be followed by a low surrogate",
                )
            self._index += 6
            return chr(0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00))
        if 0xDC00 <= code <= 0xDFFF:
            self._fail(
                "JSON_INVALID_UNICODE",
                "an unpaired escaped low surrogate is not well-formed Unicode",
            )
        return chr(code)

    def _advance_number_character(self, start: int) -> None:
        self._index += 1
        if self._index - start > self._limits["jsonNumberTokenLength"]:
            self._fail(
                "JSON_NUMBER_TOKEN_TOO_LONG",
                "the numeric token is longer than any meaningful binary64 literal",
            )

    @staticmethod
    def _is_digit(character: str | None) -> bool:
        return character is not None and "0" <= character <= "9"

    def _parse_number(self) -> int | float:
        start = self._index
        if self._character() == "-":
            following = self._character(1)
            if following != "0" and not self._is_digit(following):
                self._fail("JSON_SYNTAX", f"unexpected token at offset {self._index + 1}")
            self._advance_number_character(start)

        if self._character() == "0":
            self._advance_number_character(start)
        elif self._is_digit(self._character()):
            while self._is_digit(self._character()):
                self._advance_number_character(start)
        else:
            self._fail("JSON_SYNTAX", f"unexpected token at offset {self._index}")

        if self._character() == ".":
            if not self._is_digit(self._character(1)):
                self._fail("JSON_INVALID_NUMBER", "a decimal point must be followed by at least one digit")
            self._advance_number_character(start)
            while self._is_digit(self._character()):
                self._advance_number_character(start)

        if self._character() in ("e", "E"):
            required_digit_offset = 1
            if self._character(required_digit_offset) in ("+", "-"):
                required_digit_offset += 1
            if not self._is_digit(self._character(required_digit_offset)):
                self._fail("JSON_INVALID_NUMBER", "an exponent must have at least one digit")
            self._advance_number_character(start)
            if self._character() in ("+", "-"):
                self._advance_number_character(start)
            while self._is_digit(self._character()):
                self._advance_number_character(start)

        token = self._text[start : self._index]
        if "." not in token and "e" not in token and "E" not in token:
            return _parse_integer(token)
        try:
            value = float(token)
        except ValueError as exc:
            raise JsonParseError("JSON_SYNTAX", "invalid JSON number") from exc
        if not math.isfinite(value):
            self._fail(
                "JSON_NON_FINITE_NUMBER",
                "the number is outside the finite binary64 model; use null for a missing observation",
            )
        return value


def _parse_json_strict_with_limits(text: str, limits: Mapping[str, int]) -> Any:
    """Private budget-injection seam used by exact-boundary tests."""
    if type(text) is not str:
        raise JsonParseError("JSON_SYNTAX", "the strict JSON boundary accepts an exact text string only")
    snapshot = _snapshot_limits(limits)
    byte_length = _bounded_utf8_byte_length(text, snapshot["rawInputBytes"])
    if byte_length > snapshot["rawInputBytes"]:
        raise JsonParseError(
            "JSON_BYTES_EXCEEDED",
            "the raw input is larger than the active budget profile permits",
        )
    if text.startswith("\ufeff"):
        raise JsonParseError("JSON_BOM_NOT_ALLOWED", "the input begins with a byte-order mark")
    try:
        return _Scanner(text, snapshot).parse_top_level()
    except JsonParseError:
        raise
    except Exception as exc:
        raise JsonParseError(
            "INTERNAL_INVARIANT_VIOLATED",
            "the strict parser failed without a public diagnostic",
        ) from exc


def parse_json_strict(text: str) -> Any:
    """Parse raw JSON under the generated standard budget profile.

    Raises :class:`JsonParseError` for every ordinary rejection. The host remains
    responsible for bounding byte acquisition and UTF-8 decoding before it has a
    Python ``str`` to pass to this boundary.
    """
    return _parse_json_strict_with_limits(text, BUDGET_PROFILES["standard"])


def _parse_integer(token: str) -> int | float:
    value = int(token)
    if abs(value) > _MAX_SAFE_INTEGER:
        try:
            binary64 = float(value)
        except (OverflowError, ValueError):
            binary64 = math.inf
        if math.isfinite(binary64) and _js_number(binary64) == token:
            # RFC 8785 emits some binary64 measurements as unsafe-looking bare
            # integers. Accept only their exact canonical ECMAScript spelling.
            return binary64
        raise JsonParseError(
            "JSON_INTEGER_OUT_OF_RANGE",
            "the unsafe bare integer is not the canonical spelling of its parsed binary64 value",
        )
    return value
