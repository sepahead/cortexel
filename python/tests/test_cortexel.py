"""Independent Python tests for canonicalization, digests, parsing, and validation.

Run with the standard library only:

    PYTHONPATH=python/src python3 -m unittest discover -s python/tests
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import cortexel  # noqa: E402
from cortexel.canonicalize import canonicalize, CanonicalizationError  # noqa: E402
from cortexel.generated import BUDGET_PROFILES, STABLE_SKILL_IDS, UNITS  # noqa: E402
from cortexel.parse_json import parse_json_strict, JsonParseError  # noqa: E402
from cortexel.validate import _collect_quantities  # noqa: E402

CONTRACT_SKILLS = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "contract", "skills")
)


class TestCanonicalization(unittest.TestCase):
    def test_number_formatting_matches_ecmascript(self):
        # These are the exact ECMAScript Number.toString outputs the TypeScript side emits.
        cases = {
            0.0: "0", -0.0: "0", 1.0: "1", -1.0: "-1", 2.5: "2.5",
            100.0: "100", 1000.0: "1000", 250.0: "250", -0.5: "-0.5",
            1e6: "1000000", 1e21: "1e+21", 1e-6: "0.000001", 1e-7: "1e-7",
            3.14159: "3.14159", 0.1: "0.1",
        }
        for value, expected in cases.items():
            self.assertEqual(canonicalize(value), expected, f"{value!r}")

    def test_object_keys_sort_by_utf16_code_unit(self):
        self.assertEqual(canonicalize({"b": 1, "a": 2}), '{"a":2,"b":1}')
        # An astral character (emoji) sorts AFTER a BMP one under UTF-16 code-unit order.
        result = canonicalize({chr(0x1F602): 1, "a": 2, chr(0x20AC): 3})
        self.assertLess(result.index('"a"'), result.index('"€"'))
        self.assertLess(result.index('"€"'), result.index(chr(0x1F602)))

    def test_array_order_is_preserved(self):
        self.assertEqual(canonicalize([3, 1, 2]), "[3,1,2]")

    def test_rejects_non_finite(self):
        with self.assertRaises(CanonicalizationError):
            canonicalize(float("nan"))
        with self.assertRaises(CanonicalizationError):
            canonicalize(float("inf"))

    def test_rejects_arbitrary_precision_integers_without_rejecting_large_floats(self):
        with self.assertRaises(CanonicalizationError):
            canonicalize(9007199254740992)
        self.assertEqual(canonicalize(1e21), "1e+21")

    def test_digest_is_key_order_insensitive(self):
        a = cortexel.canonical_digest({"x": 1, "y": 2})
        b = cortexel.canonical_digest({"y": 2, "x": 1})
        self.assertEqual(a, b)
        self.assertRegex(a, r"^sha256:[0-9a-f]{64}$")


class TestStrictParser(unittest.TestCase):
    def test_rejects_duplicate_keys(self):
        with self.assertRaises(JsonParseError) as ctx:
            parse_json_strict('{"a":1,"a":2}')
        self.assertEqual(ctx.exception.code, "JSON_DUPLICATE_KEY")

    def test_rejects_prototype_keys(self):
        with self.assertRaises(JsonParseError) as ctx:
            parse_json_strict('{"__proto__":1}')
        self.assertEqual(ctx.exception.code, "JSON_DANGEROUS_KEY")

    def test_rejects_non_finite(self):
        with self.assertRaises(JsonParseError):
            parse_json_strict("NaN")

    def test_rejects_nonportable_integer_tokens_but_accepts_finite_exponents(self):
        self.assertEqual(parse_json_strict("9007199254740991"), 9007199254740991)
        for token in ("9007199254740992", "-9007199254740992", "9007199254740993"):
            with self.assertRaises(JsonParseError) as ctx:
                parse_json_strict(token)
            self.assertEqual(ctx.exception.code, "JSON_INTEGER_OUT_OF_RANGE")
        self.assertEqual(parse_json_strict("1e21"), 1e21)


class TestGeneratedAuthority(unittest.TestCase):
    def test_generated_registries_are_recursively_immutable(self):
        with self.assertRaises(TypeError):
            UNITS["ms"] = {"dimension": "voltage"}
        with self.assertRaises(TypeError):
            UNITS["ms"]["dimension"] = "voltage"
        with self.assertRaises(TypeError):
            BUDGET_PROFILES["agent"]["rawInputBytes"] = 2**63
        with self.assertRaises(TypeError):
            STABLE_SKILL_IDS[0] = "forged.skill"


class TestValidation(unittest.TestCase):
    def test_unit_collection_has_no_arbitrary_depth_cutoff(self):
        node = {"kind": "time", "unit": "mV"}
        for _ in range(48):
            node = {"nested": node}
        quantities = []
        _collect_quantities(node, "/data", quantities)
        self.assertEqual(len(quantities), 1)
        self.assertEqual(quantities[0][0:2], ("time", "mV"))

    def _contracts(self):
        for name in sorted(os.listdir(CONTRACT_SKILLS)):
            if name.endswith(".json"):
                with open(os.path.join(CONTRACT_SKILLS, name), encoding="utf-8") as handle:
                    yield json.load(handle)

    def test_every_valid_example_passes(self):
        for contract in self._contracts():
            for i, example in enumerate(contract["examples"]["valid"]):
                errors = cortexel.validate_request(example)
                self.assertEqual(
                    [e.code for e in errors], [],
                    f"{contract['id']} valid[{i}] rejected by Python: {[e.code for e in errors]}",
                )

    def test_authority_boundary_rejects_forged_conclusions(self):
        for contract in self._contracts():
            base = contract["examples"]["valid"][0]
            forged = dict(base)
            forged["validation"] = {"structural": {"result": "passed"}}
            codes = [e.code for e in cortexel.validate_request(forged)]
            self.assertIn("PROVENANCE_CALLER_ASSURANCE_FORBIDDEN", codes, contract["id"])
            break  # one is enough; the rule is source-shape, not per-skill

    def test_materialized_python_integer_outside_portable_range_is_rejected(self):
        contract = next(self._contracts())
        request = json.loads(json.dumps(contract["examples"]["valid"][0]))
        request["unsafeInteger"] = 9007199254740992
        errors = cortexel.validate_request(request)
        self.assertEqual(errors[0].code, "SNAPSHOT_INTEGER_OUT_OF_RANGE")

    def test_materialized_nonfinite_number_is_rejected_at_the_snapshot_stage(self):
        contract = next(self._contracts())
        request = json.loads(json.dumps(contract["examples"]["valid"][0]))
        request["nonfinite"] = float("nan")
        errors = cortexel.validate_request(request)
        self.assertEqual(errors[0].code, "SNAPSHOT_NON_FINITE_NUMBER")

    def test_unit_alias_rejected(self):
        # A structurally-valid request whose only fault is a unit alias.
        contract_path = os.path.join(CONTRACT_SKILLS, "neuro.population_rate.v1.json")
        with open(contract_path, encoding="utf-8") as handle:
            contract = json.load(handle)
        for example in contract["examples"]["invalid"]:
            if example["expectedCode"] == "SCIENCE_UNIT_ALIAS_NOT_CANONICAL":
                codes = [e.code for e in cortexel.validate_request(example["request"])]
                self.assertIn("SCIENCE_UNIT_ALIAS_NOT_CANONICAL", codes)


if __name__ == "__main__":
    unittest.main()
