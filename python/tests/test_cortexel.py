"""Independent Python tests for canonicalization, digests, parsing, and validation.

Run with the standard library only:

    python -m unittest discover -s python/tests
"""

import json
import math
import os
import sys
import unittest
from collections.abc import Mapping
from fractions import Fraction
from importlib.resources import files
from importlib.resources.abc import Traversable

import tomllib

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import cortexel
from cortexel.canonicalize import CanonicalizationError, canonicalize
from cortexel.generated import (
    BUDGET_PROFILES,
    CANONICALIZATION_ALGORITHMS,
    NUMERIC_ALGORITHMS,
    NUMERIC_POLICIES,
    SKILL_ADAPTERS,
    SKILL_REVISIONS,
    STABLE_SKILL_IDS,
    UNITS,
)
from cortexel.parse_json import JsonParseError, parse_json_strict
from cortexel.validate import (
    _UNIT_CODE_PROPERTY_NAMES,
    CortexelError,
    _collect_bare_units,
    _collect_quantities,
    _derive_exact_aggregate_count_rate_in_unit,
    _finalize_errors,
    _is_rounded_aggregate_count_rate_in_unit,
    _load_schema,
    _materialize_width_intervals,
    _nearest_integer_ties_positive_infinity,
    _snapshot_materialized,
    _unit_scale,
    _validate_psth,
    _validate_response_raw_binned_peak_audit,
    _validate_schema,
    _validate_spike_raster,
    _validate_units,
)

CONTRACT_SKILLS = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "contract", "skills")
)


class TestPackagedSchemaResources(unittest.TestCase):
    def test_every_stable_skill_schema_is_package_owned_and_loadable(self):
        root = files("cortexel").joinpath("contract")
        expected = {
            "schemas/common.v1.schema.json",
            "schemas/generated/registry-enums.v1.schema.json",
            *(f"schemas/skills/{skill_id}.request.v1.schema.json"
              for skill_id in STABLE_SKILL_IDS),
        }
        def walk(directory: Traversable, prefix: str = "") -> set[str]:
            found: set[str] = set()
            for child in directory.iterdir():
                relative = f"{prefix}/{child.name}" if prefix else child.name
                if child.is_dir():
                    found.update(walk(child, relative))
                else:
                    found.add(relative)
            return found

        # Traversable deliberately has no recursive glob API. Walk it through the
        # resource abstraction and require an exact closed inventory, including no
        # stale schema from a renamed skill.
        self.assertEqual(walk(root), expected)
        for relative in sorted(expected):
            with self.subTest(relative=relative):
                resource = root.joinpath(*relative.split("/"))
                self.assertTrue(resource.is_file())
                self.assertIsInstance(_load_schema(relative), dict)

    def test_unknown_skill_id_cannot_become_a_resource_path(self):
        request = {
            "contract": {"name": "cortexel-figure-request", "version": "1.0"},
            "skill": {"id": "../../../../outside"},
            "data": {},
            "parameters": {},
            "source": {"kind": "simulation"},
        }
        errors = cortexel.validate_request_partial(request)
        self.assertEqual([error.code for error in errors], ["SCHEMA_UNKNOWN_SKILL"])


class TestAgentDiscovery(unittest.TestCase):
    def test_exact_schema_compilation_profile_is_closed_and_digest_bound(self):
        self.assertEqual(
            cortexel.AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
            {
                "id": "cortexel-authoring-schema-compilation-profile.v1",
                "dialect": "https://json-schema.org/draft/2020-12/schema",
                "engine": "ajv-8",
                "options": {
                    "strict": True,
                    "allErrors": True,
                    "coerceTypes": False,
                    "useDefaults": False,
                    "removeAdditional": False,
                    "allowUnionTypes": True,
                    "validateFormats": False,
                    "strictRequired": False,
                    "strictTypes": False,
                },
            },
        )
        self.assertEqual(
            set(cortexel.AUTHORING_SCHEMA_COMPILATION_PROFILE_V1),
            {"id", "dialect", "engine", "options"},
        )

    def test_all_stable_authoring_examples_match_the_normative_selector(self):
        catalog = cortexel.list_skills()
        self.assertEqual(catalog["protocol"], "cortexel-python-catalog")
        self.assertEqual(catalog["protocolVersion"], 1)
        self.assertEqual(
            [skill["id"] for skill in catalog["skills"]],
            list(STABLE_SKILL_IDS),
        )
        self.assertEqual(
            catalog["buildIdentity"]["catalogDigestDomain"],
            cortexel.CATALOG_DIGEST_DOMAIN,
        )
        self.assertEqual(
            set(cortexel.get_build_identity()),
            {
                "packageVersion",
                "requestContract",
                "artifactContract",
                "contractDigest",
                "catalogDigest",
                "stableSkillCount",
                "sourceRevision",
                "release",
            },
        )
        self.assertEqual(
            set(catalog["buildIdentity"]),
            {*cortexel.get_build_identity(), "catalogDigestDomain"},
        )

        described = []
        for skill_id in STABLE_SKILL_IDS:
            with self.subTest(skill_id=skill_id):
                payload = cortexel.describe_skill(skill_id)
                self.assertEqual(payload["protocol"], "cortexel-python-describe")
                self.assertEqual(payload["protocolVersion"], 1)
                self.assertEqual(payload["section"], "all")
                self.assertEqual(payload["skill"]["id"], skill_id)
                self.assertEqual(
                    payload["authoringExample"]["source"],
                    {"kind": "synthetic_fixture"},
                )

                with open(
                    os.path.join(CONTRACT_SKILLS, f"{skill_id}.v1.json"),
                    encoding="utf-8",
                ) as stream:
                    source = json.load(stream)
                selection = source["examples"]["authoring"]
                expected = json.loads(json.dumps(
                    source["examples"]["valid"][selection["baseValidExampleIndex"]],
                ))
                expected["source"] = selection["source"]
                self.assertEqual(payload["authoringExample"], expected)

                # This is deliberately the partial reader: an empty result is useful
                # differential evidence, but never a full acceptance certificate.
                self.assertEqual(
                    cortexel.validate_request_partial(payload["authoringExample"]),
                    [],
                )
                self.assertEqual(
                    [error.code for error in cortexel.validate_request(
                        payload["authoringExample"],
                    )],
                    ["SEMANTIC_VALIDATOR_UNAVAILABLE"],
                )
                described.append(payload)

        identity = {
            "domain": cortexel.CATALOG_DIGEST_DOMAIN,
            "schemaCompilationProfile": described[0]["schemaCompilationProfile"],
            "schemaResources": described[0]["schemaResources"],
            "skills": [
                {
                    **payload["skill"],
                    "requestSchema": payload["requestSchema"],
                    "authoringExample": payload["authoringExample"],
                }
                for payload in described
            ],
        }
        self.assertEqual(cortexel.canonical_digest(identity), cortexel.CATALOG_DIGEST)

    def test_sections_are_detached_and_unknown_values_fail_closed(self):
        class HostileSection:
            compared = False

            def __eq__(self, _other):
                self.compared = True
                raise AssertionError("section comparison hook ran")

        class StringSubclass(str):
            pass

        summary = cortexel.describe_skill(
            "neuro.spike_raster",
            section="summary",
        )
        example = cortexel.describe_skill(
            "neuro.spike_raster",
            section="example",
        )
        schema = cortexel.describe_skill(
            "neuro.spike_raster",
            section="schema",
        )
        self.assertNotIn("authoringExample", summary)
        self.assertNotIn("requestSchema", summary)
        self.assertIn("authoringExample", example)
        self.assertNotIn("requestSchema", example)
        self.assertIn("requestSchema", schema)
        self.assertIn("schemaCompilationProfile", schema)
        self.assertIn("schemaResources", schema)
        self.assertNotIn("authoringExample", schema)
        for payload in (summary, example, schema):
            for full_only_key in (
                "cannotEstablish",
                "outputAuthority",
                "evidence",
                "knownLimitations",
            ):
                self.assertNotIn(full_only_key, payload["skill"])

        example["authoringExample"]["source"]["kind"] = "caller_mutation"
        fresh = cortexel.describe_skill("neuro.spike_raster", section="example")
        self.assertEqual(
            fresh["authoringExample"]["source"],
            {"kind": "synthetic_fixture"},
        )
        with self.assertRaisesRegex(ValueError, "unknown stable"):
            cortexel.describe_skill("../not-a-skill")
        with self.assertRaisesRegex(ValueError, "unknown stable"):
            cortexel.describe_skill(StringSubclass("neuro.spike_raster"))
        with self.assertRaisesRegex(ValueError, "section must"):
            cortexel.describe_skill("neuro.spike_raster", section="unknown")  # type: ignore[arg-type]
        hostile = HostileSection()
        with self.assertRaisesRegex(ValueError, "section must"):
            cortexel.describe_skill("neuro.spike_raster", section=hostile)  # type: ignore[arg-type]
        self.assertFalse(hostile.compared)

    def test_every_compact_section_has_an_exact_bounded_projection(self):
        expected_skill_keys = {
            "adapters",
            "availability",
            "id",
            "question",
            "releaseReady",
            "renderer",
            "revision",
            "title",
        }
        expected_adapter_keys = {
            "definitionStatus",
            "feasibilityStatus",
            "implementationAvailability",
            "mappingId",
        }
        expected_top_level = {
            "summary": {
                "acceptanceBoundary",
                "buildIdentity",
                "protocol",
                "protocolVersion",
                "section",
                "skill",
            },
            "example": {
                "acceptanceBoundary",
                "authoringExample",
                "buildIdentity",
                "protocol",
                "protocolVersion",
                "section",
                "skill",
            },
            "schema": {
                "acceptanceBoundary",
                "buildIdentity",
                "protocol",
                "protocolVersion",
                "requestSchema",
                "schemaCompilationProfile",
                "schemaResources",
                "section",
                "skill",
            },
        }
        byte_limits = {
            "summary": 16 * 1024,
            "example": 64 * 1024,
            "schema": 256 * 1024,
        }

        for skill_id in STABLE_SKILL_IDS:
            for section in ("summary", "example", "schema"):
                with self.subTest(skill_id=skill_id, section=section):
                    payload = cortexel.describe_skill(skill_id, section=section)
                    self.assertEqual(set(payload), expected_top_level[section])
                    self.assertEqual(set(payload["skill"]), expected_skill_keys)
                    for adapter in payload["skill"]["adapters"]:
                        self.assertEqual(set(adapter), expected_adapter_keys)
                    encoded = json.dumps(
                        payload,
                        ensure_ascii=False,
                        separators=(",", ":"),
                    ).encode("utf-8")
                    self.assertLess(len(encoded), byte_limits[section])


class TestCanonicalization(unittest.TestCase):
    def test_identifier_set_canonicalization_vectors_and_failures(self):
        self.assertEqual(
            cortexel.IDENTIFIER_SET_CANONICALIZATION_ID,
            "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1",
        )
        self.assertEqual(
            cortexel.canonical_identifier_set_digest(["cell-1"]),
            "sha256:67195d72e6a26feedd72d3a9eda3627d4f12f1ba1f0cafd1ff8aa2347f791faf",
        )
        expected = "sha256:fdb6b814de98ab8daa241acb8895573a50c4ff7e6864cef64c80b023054b29ce"
        self.assertEqual(
            cortexel.canonical_identifier_set_digest(
                ["n1", "n2", "n3", "n4", "n5", "n6", "n7"]
            ),
            expected,
        )
        self.assertEqual(
            cortexel.canonical_identifier_set_digest(
                ["n7", "n2", "n6", "n1", "n5", "n3", "n4"]
            ),
            expected,
        )
        self.assertEqual(
            cortexel.canonical_identifier_set_digest([chr(0xE000), chr(0x10000)]),
            "sha256:e8bdee294d4a756532cd1660a49d7d99325bb04ec58c236f78b94ff2718d31de",
        )
        self.assertEqual(
            cortexel.canonical_identifier_set_digest(["é", "e\u0301"]),
            "sha256:d056a09c651dab55ceb8f30b349ec21de471bdf5ce4a94db7f29dc9594f54ec3",
        )
        for invalid in ([], [""], ["n1", "n1"], ["\ud800"]):
            with (
                self.subTest(invalid=repr(invalid)),
                self.assertRaises(CanonicalizationError),
            ):
                cortexel.canonical_identifier_set_digest(invalid)

        class StringSubclass(str):
            pass

        class ListSubclass(list):
            pass

        for invalid in (("n1",), ListSubclass(["n1"]), [StringSubclass("n1")]):
            with (
                self.subTest(non_json_domain=repr(invalid)),
                self.assertRaises(CanonicalizationError),
            ):
                cortexel.canonical_identifier_set_digest(invalid)

    def test_executes_every_normative_identifier_set_vector(self):
        algorithm = CANONICALIZATION_ALGORITHMS[
            "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1"
        ]
        covered_failures = set()
        accepted = 0
        for vector in algorithm["conformanceVectors"]:
            if vector["inputEncoding"] == "utf16_code_units":
                value = [
                    "".join(chr(unit) for unit in member)
                    for member in vector["inputCodeUnits"]
                ]
            elif vector["inputEncoding"] == "unicode_strings":
                # Generated authority is recursively frozen as tuples; materialize
                # the registry's declared JSON array before exercising the boundary.
                value = list(vector["input"])
            else:
                raw_value = vector["input"]
                value = list(raw_value) if isinstance(raw_value, tuple) else raw_value

            if vector["outcome"] == "accept":
                accepted += 1
                self.assertEqual(
                    cortexel.canonical_identifier_set_digest(value),
                    vector["digest"],
                    vector["name"],
                )
            else:
                covered_failures.add(vector["failureClass"])
                with self.assertRaises(CanonicalizationError, msg=vector["name"]):
                    cortexel.canonical_identifier_set_digest(value)

        self.assertGreater(accepted, 0)
        self.assertEqual(covered_failures, set(algorithm["failureClasses"]))

    def test_number_formatting_matches_ecmascript(self):
        # These are the exact ECMAScript Number.toString outputs the TypeScript side emits.
        # A mapping would silently collapse +0.0 and -0.0 because Python considers
        # them equal and gives them the same hash. Keep an ordered vector so both
        # binary64 sign encodings independently exercise the canonicalizer.
        cases = [
            (0.0, "0"), (-0.0, "0"), (1.0, "1"), (-1.0, "-1"), (2.5, "2.5"),
            (100.0, "100"), (1000.0, "1000"), (250.0, "250"), (-0.5, "-0.5"),
            (1e6, "1000000"), (1e21, "1e+21"), (1e-6, "0.000001"), (1e-7, "1e-7"),
            (3.14159, "3.14159"), (0.1, "0.1"),
        ]
        for value, expected in cases:
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

    def test_rejects_ill_formed_unicode_values_and_keys_with_the_public_error(self):
        for value in ("\ud800", {"\udc00": 1}, {1: "not a JSON member"}):
            with (
                self.subTest(value=repr(value)),
                self.assertRaises(CanonicalizationError),
            ):
                canonicalize(value)

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

    def test_rejects_ill_formed_unicode_values_and_member_names(self):
        for text in (
            '"\\ud800"',
            '"\\udc00"',
            '{"value":"\\ud800"}',
            '{"\\udc00":1}',
            '[{"nested":"\\ud800"}]',
        ):
            with self.subTest(text=ascii(text)):
                with self.assertRaises(JsonParseError) as ctx:
                    parse_json_strict(text)
                self.assertEqual(ctx.exception.code, "JSON_INVALID_UNICODE")

        self.assertEqual(parse_json_strict('"\\ud83d\\ude00"'), "😀")

    def test_accepts_canonical_binary64_integer_spellings_and_rejects_lossy_ones(self):
        self.assertEqual(parse_json_strict("9007199254740991"), 9007199254740991)
        self.assertEqual(parse_json_strict("9007199254740992"), float(2**53))
        self.assertEqual(parse_json_strict("-9007199254740992"), -float(2**53))
        self.assertEqual(
            parse_json_strict("295147905179352830000"),
            float(2**68),
        )
        for token in ("9007199254740993", "295147905179352830001"):
            with self.assertRaises(JsonParseError) as ctx:
                parse_json_strict(token)
            self.assertEqual(ctx.exception.code, "JSON_INTEGER_OUT_OF_RANGE")
        self.assertEqual(parse_json_strict("1e21"), 1e21)

        for measurement in (float(2**53), float(2**68), 1e20, -1e20):
            self.assertEqual(parse_json_strict(canonicalize(measurement)), measurement)


class TestGeneratedAuthority(unittest.TestCase):
    def test_unimplemented_adapter_names_are_not_installable_extras(self):
        pyproject = os.path.normpath(
            os.path.join(os.path.dirname(__file__), "..", "pyproject.toml")
        )
        with open(pyproject, "rb") as handle:
            project = tomllib.load(handle)["project"]

        self.assertEqual(project["dependencies"], [])
        advertised_extras = set(project.get("optional-dependencies", {}))
        self.assertTrue(advertised_extras.isdisjoint({"neo", "elephant", "nwb"}))

    def test_generated_registries_are_recursively_immutable(self):
        with self.assertRaises(TypeError):
            UNITS["ms"] = {"dimension": "voltage"}
        with self.assertRaises(TypeError):
            UNITS["ms"]["dimension"] = "voltage"
        with self.assertRaises(TypeError):
            BUDGET_PROFILES["agent"]["rawInputBytes"] = 2**63
        with self.assertRaises(TypeError):
            NUMERIC_ALGORITHMS["cortexel_binary64_nominal_interval_candidates_v1"]["constants"][
                "maximumMaterializedIntervals"
            ] = 1
        with self.assertRaises(TypeError):
            NUMERIC_POLICIES["cortexel_binary64_uniform_exposure_bins_v1"]["algorithm"] = "forged"
        with self.assertRaises(TypeError):
            STABLE_SKILL_IDS[0] = "forged.skill"
        with self.assertRaises(TypeError):
            SKILL_REVISIONS["neuro.response_curve"] = 1
        with self.assertRaises(TypeError):
            SKILL_ADAPTERS["neuro.spike_raster"][0]["feasibilityStatus"] = "not_assessed"
        with self.assertRaises(TypeError):
            SKILL_ADAPTERS["neuro.spike_raster"][0]["sources"][0]["role"] = "optional_companion"

    def test_generated_skill_revisions_match_every_stable_contract(self):
        def thaw(value):
            if isinstance(value, Mapping):
                return {key: thaw(item) for key, item in value.items()}
            if isinstance(value, tuple):
                return [thaw(item) for item in value]
            return value

        expected = {}
        expected_adapters = {}
        for name in sorted(os.listdir(CONTRACT_SKILLS)):
            if not name.endswith(".json"):
                continue
            with open(os.path.join(CONTRACT_SKILLS, name), encoding="utf-8") as handle:
                contract = json.load(handle)
            if contract["status"] == "stable":
                expected[contract["id"]] = contract["revision"]
                expected_adapters[contract["id"]] = contract["adapters"]
        self.assertEqual(dict(SKILL_REVISIONS), expected)
        self.assertEqual(
            {
                skill_id: thaw(adapters)
                for skill_id, adapters in SKILL_ADAPTERS.items()
            },
            expected_adapters,
        )

    def test_executes_every_normative_nominal_interval_candidate_vector(self):
        bins_policy = NUMERIC_POLICIES["cortexel_binary64_uniform_exposure_bins_v1"]
        steps_policy = NUMERIC_POLICIES["cortexel_binary64_nominal_steps_v1"]
        self.assertEqual(
            bins_policy["algorithm"], "cortexel_binary64_nominal_interval_candidates_v1"
        )
        self.assertEqual(steps_policy["algorithm"], bins_policy["algorithm"])
        self.assertEqual(
            bins_policy["intervalExposure"],
            "require_every_exact_physical_endpoint_difference_to_equal_original_typed_width",
        )
        self.assertEqual(
            steps_policy["intervalExposure"],
            "emitted_coordinates_authoritative_no_equal_exposure_claim",
        )

        algorithm = NUMERIC_ALGORITHMS[bins_policy["algorithm"]]
        self.assertEqual(
            dict(algorithm["constants"]),
            {
                "binary64MinSubnormalExponent": -1074,
                "binary64Epsilon": sys.float_info.epsilon,
                "quotientToleranceEpsilonMultiplier": 8,
                "endpointToleranceEpsilonMultiplier": 8,
                "maximumMaterializedIntervals": 100_000,
                "maximumSafeInteger": 9_007_199_254_740_991,
                "roundingMode": "roundTiesToEven",
            },
        )

        for vector in algorithm["conformanceVectors"]:
            actual = _materialize_width_intervals(**dict(vector["input"]))
            expected = dict(vector["result"])
            if expected["accepted"]:
                self.assertEqual(actual["accepted"], True, vector["name"])
                self.assertEqual(
                    actual["intervalCount"], expected["intervalCount"], vector["name"]
                )
                if "edges" in expected:
                    self.assertEqual(actual["edges"], expected["edges"], vector["name"])
                else:
                    for assertion in expected["edgeAssertions"]:
                        self.assertEqual(
                            actual["edges"][assertion["index"]],
                            assertion["value"],
                            f"{vector['name']} edge {assertion['index']}",
                        )
            else:
                self.assertEqual(
                    actual,
                    {
                        "accepted": False,
                        "failureClass": expected["failureClass"],
                    },
                    vector["name"],
                )

    def test_full_interval_evaluator_is_total_on_hostile_host_values(self):
        hostile = (
            None,
            True,
            "1",
            10**400,
            float("nan"),
            float("inf"),
            float("-inf"),
        )
        for value in hostile:
            with self.subTest(value=repr(value)):
                self.assertEqual(
                    _materialize_width_intervals(value, 1, 0.5),
                    {"accepted": False, "failureClass": "nonfinite"},
                )

    def test_nearest_integer_does_not_round_a_pre_half_value_across_the_boundary(self):
        just_below_half = 0.49999999999999994
        self.assertEqual(just_below_half + 0.5, 1.0)
        self.assertEqual(_nearest_integer_ties_positive_infinity(just_below_half), 0)
        self.assertEqual(_nearest_integer_ties_positive_infinity(0.5), 1)

    def test_full_interval_edges_canonicalize_negative_zero(self):
        actual = _materialize_width_intervals(-0.0, 0.3, 0.1)
        self.assertEqual(actual["accepted"], True)
        self.assertEqual(actual["edges"][0], 0.0)
        self.assertEqual(math.copysign(1.0, actual["edges"][0]), 1.0)


class TestValidation(unittest.TestCase):
    def _schema_errors(self, value, schema):
        errors = []
        _validate_schema(value, schema, "", errors)
        return errors

    def test_structural_keyword_subset_matches_json_schema_semantics(self):
        integer_schema = {"type": "integer"}
        for value in (1, 1.0, 1e0, -0.0):
            self.assertEqual(self._schema_errors(value, integer_schema), [], repr(value))
        for value in (1.5, True):
            self.assertNotEqual(self._schema_errors(value, integer_schema), [], repr(value))

        self.assertEqual(self._schema_errors(3, {"type": "number", "maximum": 3}), [])
        self.assertNotEqual(self._schema_errors(4, {"type": "number", "maximum": 3}), [])
        self.assertNotEqual(
            self._schema_errors(3, {"type": "number", "exclusiveMaximum": 3}), []
        )
        self.assertEqual(self._schema_errors("a", {"type": "string", "minLength": 1}), [])
        self.assertNotEqual(self._schema_errors("", {"type": "string", "minLength": 1}), [])
        self.assertEqual(
            self._schema_errors("valid:id", {"type": "string", "pattern": r"^[A-Za-z][A-Za-z:]*$"}),
            [],
        )
        self.assertNotEqual(
            self._schema_errors("invalid id", {"type": "string", "pattern": r"^[A-Za-z][A-Za-z:]*$"}),
            [],
        )
        self.assertEqual(self._schema_errors([1, 2], {"type": "array", "maxItems": 2}), [])
        self.assertNotEqual(
            self._schema_errors([1, 2, 3], {"type": "array", "maxItems": 2}), []
        )
        self.assertNotEqual(
            self._schema_errors({}, {"type": "object", "minProperties": 1}), []
        )

    def test_fragment_refs_resolve_against_the_schema_resource_that_owns_them(self):
        local_schema = {
            "type": "object",
            "properties": {"value": {"$ref": "#/$defs/localNumber"}},
            "required": ["value"],
            "additionalProperties": False,
            "$defs": {"localNumber": {"type": "number"}},
        }
        self.assertEqual(self._schema_errors({"value": 1}, local_schema), [])
        self.assertEqual(
            [error.code for error in self._schema_errors({"value": "1"}, local_schema)],
            ["SCHEMA_TYPE_MISMATCH"],
        )

        # `quantity` lives in common.v1 and itself contains fragment-only refs.  Those
        # nested refs stay rooted in common.v1, not in this calling schema resource.
        external_common_schema = {
            "$ref": (
                "https://sepahead.github.io/cortexel/schemas/v1/"
                "common.v1.schema.json#/$defs/quantity"
            )
        }
        self.assertEqual(
            self._schema_errors(
                {"kind": "time", "unit": "ms", "value": 1},
                external_common_schema,
            ),
            [],
        )

        escaped_schema = {
            "type": "object",
            "properties": {
                "slash": {"$ref": "#/$defs/slash~1name"},
                "tilde": {"$ref": "#/$defs/tilde~0name"},
                "space": {"$ref": "#/$defs/space%20name"},
                "empty": {"$ref": "#/$defs/"},
                "array": {"$ref": "#/$defs/choice/oneOf/0"},
            },
            "required": ["slash", "tilde", "space", "empty", "array"],
            "additionalProperties": False,
            "$defs": {
                "slash/name": {"const": "slash"},
                "tilde~name": {"const": "tilde"},
                "space name": {"const": "space"},
                "": {"const": "empty"},
                "choice": {"oneOf": [{"const": "array"}, {"const": "other"}]},
            },
        }
        self.assertEqual(
            self._schema_errors(
                {
                    "slash": "slash",
                    "tilde": "tilde",
                    "space": "space",
                    "empty": "empty",
                    "array": "array",
                },
                escaped_schema,
            ),
            [],
        )

        # Draft 2020-12 makes `$ref` an applicator, not a sibling-discarding keyword.
        sibling_schema = {
            "$ref": "#/$defs/number",
            "minimum": 2,
            "$defs": {"number": {"type": "number"}},
        }
        self.assertEqual(self._schema_errors(2, sibling_schema), [])
        self.assertNotEqual(self._schema_errors(1, sibling_schema), [])

    def test_structural_combinators_apply_exact_branch_and_conditional_semantics(self):
        one_of = {"oneOf": [{"type": "number"}, {"type": "integer"}]}
        self.assertEqual(self._schema_errors(1.5, one_of), [])
        self.assertNotEqual(self._schema_errors(1, one_of), [])
        self.assertNotEqual(self._schema_errors("1", one_of), [])
        any_of = {"anyOf": [{"type": "number"}, {"type": "integer"}]}
        self.assertEqual(self._schema_errors(1, any_of), [])
        self.assertNotEqual(self._schema_errors("1", any_of), [])

        conditional = {
            "type": "object",
            "properties": {
                "kind": {"enum": ["a", "b"]},
                "requiredForA": {"type": "number"},
                "forbiddenForB": {"type": "number"},
            },
            "required": ["kind"],
            "additionalProperties": False,
            "if": {
                "properties": {"kind": {"const": "a"}},
                "required": ["kind"],
            },
            "then": {"required": ["requiredForA"]},
            "else": {"not": {"required": ["forbiddenForB"]}},
        }
        self.assertEqual(
            self._schema_errors({"kind": "a", "requiredForA": 1}, conditional), []
        )
        self.assertNotEqual(self._schema_errors({"kind": "a"}, conditional), [])
        self.assertEqual(self._schema_errors({"kind": "b"}, conditional), [])
        self.assertNotEqual(
            self._schema_errors({"kind": "b", "forbiddenForB": 1}, conditional), []
        )

    def test_unit_collection_has_no_arbitrary_depth_cutoff(self):
        node = {"kind": "time", "unit": "mV"}
        for _ in range(48):
            node = {"nested": node}
        quantities = []
        _collect_quantities(node, "/data", quantities)
        self.assertEqual(len(quantities), 1)
        self.assertEqual(quantities[0][0:2], ("time", "mV"))

        # `kind` also discriminates non-quantity records. The NEST window remains
        # subject to canonical-unit validation, but its clock-profile kind must not
        # be mistaken for a quantity kind with an empty dimension allow-list.
        quantities = []
        _collect_quantities(
            {
                "kind": "nest_recording_device_origin_relative",
                "unit": "ms",
            },
            "/data/window",
            quantities,
        )
        self.assertEqual(quantities, [])
        bare_units = []
        _collect_bare_units(
            {
                "kind": "nest_recording_device_origin_relative",
                "unit": "ms",
            },
            "/data/window",
            bare_units,
        )
        self.assertEqual(bare_units, [("ms", "/data/window/unit")])

    def test_closed_scalar_unit_property_names_are_validated_without_suffix_guessing(self):
        self.assertEqual(
            _UNIT_CODE_PROPERTY_NAMES,
            ("alignmentUnit", "unit", "valueUnit"),
        )
        node = {
            "alignmentUnit": "milliseconds",
            "valueUnit": "millivolts",
            "observationUnit": "not-a-physical-unit",
        }
        bare_units = []
        _collect_bare_units(node, "/parameters", bare_units)
        self.assertEqual(
            bare_units,
            [
                ("milliseconds", "/parameters/alignmentUnit"),
                ("millivolts", "/parameters/valueUnit"),
            ],
        )

    def _contracts(self):
        for name in sorted(os.listdir(CONTRACT_SKILLS)):
            if name.endswith(".json"):
                with open(os.path.join(CONTRACT_SKILLS, name), encoding="utf-8") as handle:
                    yield json.load(handle)

    def _response_contract(self):
        path = os.path.join(CONTRACT_SKILLS, "neuro.response_curve.v1.json")
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    def _spike_contract(self):
        path = os.path.join(CONTRACT_SKILLS, "neuro.spike_raster.v1.json")
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    def test_contract_absence_is_distinct_from_a_present_malformed_value(self):
        living = self._spike_contract()["examples"]["valid"][0]

        absent = json.loads(json.dumps(living))
        del absent["contract"]
        absent_errors = cortexel.validate_request_partial(absent)
        self.assertEqual(
            [(error.code, error.instance_path) for error in absent_errors],
            [("CONTRACT_MISSING", "/contract")],
        )

        for malformed in (None, "cortexel-figure-request/1.0", []):
            with self.subTest(malformed=malformed):
                present = json.loads(json.dumps(living))
                present["contract"] = malformed
                errors = cortexel.validate_request_partial(present)
                self.assertEqual(
                    [(error.code, error.instance_path) for error in errors],
                    [("CONTRACT_SHAPE_INVALID", "/contract")],
                )
                self.assertFalse(hasattr(errors[0], "repair"))

    def _psth_contract(self):
        path = os.path.join(CONTRACT_SKILLS, "neuro.psth.v1.json")
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    def _psth_request(self, mode="prebinned"):
        contract = self._psth_contract()
        request = next(
            value for value in contract["examples"]["valid"]
            if value["data"]["mode"] == mode
        )
        return json.loads(json.dumps(request))

    def _psth_errors(self, request):
        errors = []
        _validate_units(request, errors)
        _validate_psth(request, errors)
        return errors

    def test_psth_semantic_helper_is_total_on_malformed_event_coordinates(self):
        """The private semantic layer must not leak ``float`` conversion TypeError.

        The public request boundary stops after structural failure, but differential
        tests also exercise this independent evaluator directly. Keep that lower layer
        total so a malformed carrier remains a diagnostic rather than an exception.
        """
        request = self._psth_request(mode="events")
        request["data"]["eventTimes"]["values"][0] = {}

        errors = []
        _validate_psth(request, errors)

        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "/data/relativeWindow")],
        )

    def test_semantic_helpers_defer_unhashable_identifiers_to_structure(self):
        """Malformed containers cannot escape as set/dict-key ``TypeError``."""
        malformed_skill = self._psth_request(mode="events")
        malformed_skill["skill"]["id"] = {}
        unit_errors = []
        _validate_units(malformed_skill, unit_errors)
        self.assertEqual(unit_errors, [])

        malformed_trial = self._psth_request(mode="events")
        malformed_trial["data"]["trialIds"][-1] = []
        psth_errors = []
        _validate_psth(malformed_trial, psth_errors)
        self.assertEqual(psth_errors, [])

    def _spike_request(self, values, window, policy="reject", origin_relative=False):
        contract = self._spike_contract()
        example_index = 0 if origin_relative else 2
        request = json.loads(json.dumps(contract["examples"]["valid"][example_index]))
        request["data"]["eventTimes"]["values"] = list(values)
        sender = request["data"]["recordedSenderIds"][0]
        request["data"]["eventSenderIds"] = [sender] * len(values)
        normalized_window = dict(window)
        if origin_relative:
            authority = json.loads(json.dumps(
                request["data"]["window"]["captureAuthority"]
            ))
            origin = float(normalized_window["origin"])
            start = float(normalized_window["start"])
            stop = float(normalized_window["stop"])
            authority["runtimeStatus"]["resolutionMs"] = 0.125
            authority["runtimeStatus"]["ticsPerMs"] = "1000"
            authority["runtimeStatus"]["resolutionTics"] = "125"
            authority["runtimeStatus"]["timeBuildProfile"] = (
                "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1"
            )

            def fixture_tics(milliseconds):
                scaled = milliseconds * 1000.0
                if (
                    math.isfinite(scaled) and
                    scaled >= 0
                ):
                    candidate = math.trunc(scaled + 0.5)
                    if (
                        candidate <= (1 << 53) - 1 and
                        float(candidate) * (1.0 / 1000.0) == milliseconds
                    ):
                        return str(candidate)
                # Direct malformed-input tests still need a structurally shaped
                # carrier; semantic validation must reject this non-authority.
                return "0"

            authority["runtimeStatus"]["captureBiologicalTimeTics"] = (
                fixture_tics(origin + stop)
            )
            authority["recordingGrid"] = {
                "originTics": fixture_tics(origin),
                "startTics": fixture_tics(start),
                "stopTics": fixture_tics(stop),
            }
            authority["bufferEpoch"]["beganAtBiologicalTimeTics"] = (
                fixture_tics(origin)
            )
            authority["recordingPlan"]["lastMutationAtBiologicalTimeTics"] = (
                fixture_tics(origin + start)
            )
            normalized_window["captureAuthority"] = authority
        request["data"]["window"] = normalized_window
        request["parameters"]["outOfWindowPolicy"] = policy
        return request

    def _positive_infinity_spike_request(self, values=(110.125, 125.0)):
        """Author one exact nonzero-origin mapping-revision-5 capture fixture.

        This is deliberately assembled from the finite compatibility example rather
        than copied from the TypeScript adapter. It exercises the independently
        represented absolute capture endpoint and the absence of a finite stop tic.
        """
        request = json.loads(json.dumps(
            self._spike_contract()["examples"]["valid"][0]
        ))
        authority = request["data"]["window"]["captureAuthority"]
        authority["profile"] = "cortexel-nest-memory-spike-capture-authority.v4"
        authority["runtimeStatus"].update({
            "statusReadMethod":
                "pynest_single_spike_recorder_get_status_plain_projection_v2",
            "timeBuildProfile":
                "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1",
            "captureBiologicalTimeTics": "125000",
            "captureBoundary":
                "after_successful_advancing_simulate_or_run_return_at_exact_"
                "capture_biological_time_before_any_further_advance_or_mutation",
        })
        authority["recordingGrid"] = {
            "originTics": "100000",
            "startTics": "10000",
        }
        authority["bufferEpoch"] = {
            "beganBy": "recorder_creation",
            "beganAtBiologicalTimeTics": "100000",
        }
        authority["recordingPlan"]["lastMutationAtBiologicalTimeTics"] = "110000"
        request["data"]["window"] = {
            "kind":
                "nest_recording_device_positive_infinity_capture_bounded",
            "origin": 100.0,
            "start": 10.0,
            "captureTime": 125.0,
            "unit": "ms",
            "boundary": "(origin+start,capture]",
            "recordingBackend": "memory",
            "timeEncoding": "native_binary64_ms",
            "configuredStop": {
                "kind": "nest_time_positive_infinity",
                "exportedMs": sys.float_info.max,
            },
            "captureAuthority": authority,
        }
        request["data"]["eventTimes"]["values"] = list(values)
        sender = request["data"]["recordedSenderIds"][0]
        request["data"]["eventSenderIds"] = [sender] * len(values)
        return request

    def test_every_valid_example_passes(self):
        for contract in self._contracts():
            for i, example in enumerate(contract["examples"]["valid"]):
                errors = cortexel.validate_request_partial(example)
                self.assertEqual(
                    [e.code for e in errors], [],
                    f"{contract['id']} valid[{i}] rejected by Python: {[e.code for e in errors]}",
                )

    def test_every_living_unit_mutation_keeps_the_python_boundary_total(self):
        """Exercise every registered unit at every living scalar-unit location.

        This deliberately asks more than the schema accepts. Structural rejection is
        fine; an exception is not. In particular, a sibling response/PSTH validator
        must never index the unit registry or request an exact scale after the unit
        validator has already found an unknown, alias, or incompatible dimension.
        """
        def unit_paths(value, current=()):
            found = []
            if isinstance(value, dict):
                for key, child in value.items():
                    path = current + (key,)
                    if key in _UNIT_CODE_PROPERTY_NAMES and isinstance(child, str):
                        found.append(path)
                    if isinstance(child, (dict, list)):
                        found.extend(unit_paths(child, path))
            elif isinstance(value, list):
                for index, child in enumerate(value):
                    path = current + (index,)
                    if isinstance(child, (dict, list)):
                        found.extend(unit_paths(child, path))
            return found

        def replace(root, path, value):
            node = root
            for segment in path[:-1]:
                node = node[segment]
            node[path[-1]] = value

        def pointer(path):
            return "".join(
                "/" + str(segment).replace("~", "~0").replace("/", "~1")
                for segment in path
            )

        mutations = tuple(UNITS) + ("milliseconds", "cortexel:not-a-unit")
        exercised = 0
        for contract in self._contracts():
            for example_index, example in enumerate(contract["examples"]["valid"]):
                for path in unit_paths(example):
                    original = example
                    for unit in mutations:
                        candidate = json.loads(json.dumps(original))
                        replace(candidate, path, unit)
                        errors = cortexel.validate_request_partial(candidate)
                        self.assertTrue(
                            all(isinstance(error, CortexelError) for error in errors),
                            f"{contract['id']} valid[{example_index}] {path} -> {unit!r}",
                        )
                        if unit in ("milliseconds", "cortexel:not-a-unit"):
                            self.assertTrue(
                                errors,
                                f"{contract['id']} valid[{example_index}] {path} -> {unit!r} "
                                "was silently accepted",
                            )
                            canonical_owners = [
                                error for error in errors
                                if error.instance_path == pointer(path) and
                                error.code in {
                                    "SCIENCE_UNIT_ALIAS_NOT_CANONICAL",
                                    "SCHEMA_ENUM_MISMATCH",
                                }
                            ]
                            # Closed oneOf branches can independently own the same
                            # literal-unit repair (both NEST window variants require
                            # ms). The structural mirror intentionally preserves every
                            # branch failure for Ajv parity, so require one actionable
                            # repair identity rather than one emitted branch record.
                            canonical_repairs = {
                                (error.code, error.stage, error.message)
                                for error in canonical_owners
                            }
                            self.assertEqual(
                                len(canonical_repairs),
                                1,
                                f"{contract['id']} valid[{example_index}] {path} -> {unit!r} "
                                "must have exactly one canonical-code repair at the mutated path",
                            )
                        all_dimension_errors = [
                            error for error in errors
                            if error.code == "SCIENCE_UNIT_DIMENSION_MISMATCH"
                        ]
                        at = pointer(path)
                        dimension_errors_at_path = [
                            error for error in all_dimension_errors
                            if error.instance_path == at
                        ]
                        dimension_relation_owners = [
                            error.validator_id for error in dimension_errors_at_path
                        ]
                        self.assertEqual(
                            len(dimension_relation_owners),
                            len(set(dimension_relation_owners)),
                            f"{contract['id']} valid[{example_index}] {path} -> {unit!r} "
                            "has duplicate dimension diagnostics from one relation owner",
                        )
                        self.assertLessEqual(
                            len(dimension_errors_at_path),
                            2,
                            f"{contract['id']} valid[{example_index}] {path} -> {unit!r} "
                            "has more dimension diagnostics than the independent local "
                            "carrier and shared-axis relations can justify",
                        )
                        if unit in ("milliseconds", "cortexel:not-a-unit"):
                            self.assertEqual(
                                all_dimension_errors,
                                [],
                                f"{contract['id']} valid[{example_index}] {path} -> {unit!r} "
                                "must be owned only by canonical-code validation",
                            )
                        exercised += 1
        self.assertGreater(exercised, 5_000)

    def test_exact_unit_scale_has_one_closed_failure_mode(self):
        for unit, metadata in UNITS.items():
            if metadata["to_canonical"] is None:
                with self.assertRaises(ValueError, msg=unit):
                    _unit_scale(unit)
            else:
                self.assertGreater(_unit_scale(unit), 0, unit)

        for invalid in (None, 1, "milliseconds", "cortexel:not-a-unit"):
            with self.assertRaises(ValueError, msg=repr(invalid)):
                _unit_scale(invalid)

    def test_python_unit_subset_binds_density_to_the_exact_reciprocal_axis(self):
        contract = next(
            candidate for candidate in self._contracts()
            if candidate["id"] == "network.delay_distribution"
        )
        density = next(
            json.loads(json.dumps(example))
            for example in contract["examples"]["valid"]
            if example["parameters"]["normalization"] == "density"
        )

        density["data"]["histogram"]["unit"] = "/s"
        errors = cortexel.validate_request_partial(density)
        self.assertIn(
            (
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "/data/histogram/unit",
                "histogram.normalization_consistent",
            ),
            [(error.code, error.instance_path, error.validator_id) for error in errors],
        )

        density = next(
            json.loads(json.dumps(example))
            for example in contract["examples"]["valid"]
            if example["parameters"]["normalization"] == "density"
        )
        density["parameters"]["bins"]["unit"] = "s"
        errors = cortexel.validate_request_partial(density)
        self.assertIn(
            (
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "/data/histogram/unit",
                "histogram.normalization_consistent",
            ),
            [(error.code, error.instance_path, error.validator_id) for error in errors],
        )

        for axis_without_reciprocal in ("us", "nest:delay"):
            density = next(
                json.loads(json.dumps(example))
                for example in contract["examples"]["valid"]
                if example["parameters"]["normalization"] == "density"
            )
            density["parameters"]["bins"]["unit"] = axis_without_reciprocal
            errors = cortexel.validate_request_partial(density)
            self.assertIn(
                ("SCIENCE_UNIT_DIMENSION_MISMATCH", "/data", None),
                [(error.code, error.instance_path, error.validator_id) for error in errors],
            )

    def test_python_unit_subset_rejects_mixed_legal_weight_dimensions(self):
        contract = next(
            candidate for candidate in self._contracts()
            if candidate["id"] == "network.synaptic_weight_trace"
        )
        request = next(
            json.loads(json.dumps(example))
            for example in contract["examples"]["valid"]
            if len(example["data"].get("series", [])) >= 3 and
            all("initialWeight" not in series for series in example["data"]["series"])
        )
        # Both pA and nest:weight are individually legal synaptic-weight dimensions.
        # What fails is the relational claim that all three series share one axis.
        request["data"]["series"][2]["values"]["unit"] = "pA"
        errors = cortexel.validate_request_partial(request)
        self.assertIn(
            (
                "SCIENCE_UNIT_DIMENSION_MISMATCH",
                "/data/series/1/values/unit",
                "trace.axis_dimension_compatible",
            ),
            [(error.code, error.instance_path, error.validator_id) for error in errors],
        )

    def test_full_validation_never_promotes_partial_semantic_coverage(self):
        request = self._response_contract()["examples"]["valid"][0]
        self.assertEqual(cortexel.validate_request_partial(request), [])
        errors = cortexel.validate_request(request)
        self.assertEqual([error.code for error in errors], ["SEMANTIC_VALIDATOR_UNAVAILABLE"])
        self.assertEqual(errors[0].instance_path, "/skill/id")
        self.assertFalse(cortexel.is_valid(request))

    def test_materialized_snapshot_is_total_detached_and_never_invokes_subclass_overrides(self):
        calls = []

        class HostileDict(dict):
            def __len__(self):
                calls.append("dict-len")
                raise RuntimeError("must not execute")

            def __iter__(self):
                calls.append("dict-iter")
                raise RuntimeError("must not execute")

            def __getitem__(self, _key):
                calls.append("dict-getitem")
                raise RuntimeError("must not execute")

            def items(self):
                calls.append("items")
                raise RuntimeError("must not execute")

            def get(self, *_args):
                calls.append("get")
                raise RuntimeError("must not execute")

        class HostileList(list):
            def __len__(self):
                calls.append("len")
                raise RuntimeError("must not execute")

            def __getitem__(self, _index):
                calls.append("getitem")
                raise RuntimeError("must not execute")

            def __iter__(self):
                calls.append("list-iter")
                raise RuntimeError("must not execute")

        for value in (HostileDict(), HostileList()):
            with self.subTest(value_type=type(value).__name__):
                partial = cortexel.validate_request_partial(value)
                full = cortexel.validate_request(value)
                self.assertEqual([error.code for error in partial], ["SNAPSHOT_NON_PLAIN_OBJECT"])
                self.assertEqual([error.code for error in full], ["SNAPSHOT_NON_PLAIN_OBJECT"])
        self.assertEqual(calls, [])

        original = {"outer": [1, {"label": "before"}]}
        snapshot, error = _snapshot_materialized(original)
        self.assertIsNone(error)
        original["outer"][1]["label"] = "after"
        original["outer"].append(2)
        self.assertEqual(snapshot, {"outer": [1, {"label": "before"}]})

        shared = {"label": "shared"}
        snapshot, error = _snapshot_materialized({"left": shared, "right": shared})
        self.assertIsNone(error)
        self.assertEqual(snapshot, {"left": {"label": "shared"}, "right": {"label": "shared"}})
        self.assertIsNot(snapshot["left"], snapshot["right"])

    def test_materialized_snapshot_enforces_the_standard_json_domain(self):
        standard = dict(BUDGET_PROFILES["standard"])
        cases = []

        circular = {}
        circular["self"] = circular
        cases.append((circular, "SNAPSHOT_CIRCULAR_REFERENCE", "/self"))
        cases.append(("\ud800", "SNAPSHOT_MALFORMED_STRING", ""))
        cases.append(({"\ud800": 1}, "SNAPSHOT_MALFORMED_STRING", ""))
        cases.append(({"__proto__": 1}, "SNAPSHOT_DANGEROUS_KEY", "/__proto__"))
        cases.append((float("inf"), "SNAPSHOT_NON_FINITE_NUMBER", ""))
        cases.append(((1 << 53), "SNAPSHOT_INTEGER_OUT_OF_RANGE", ""))
        cases.append(("x" * (standard["jsonStringLength"] + 1), "SNAPSHOT_STRING_TOO_LONG", ""))
        # The boundary stops at limit + 1 code units instead of scanning an unbounded
        # suffix. A surrogate beyond that point therefore cannot replace the earlier
        # resource diagnostic, for either a value or a member name.
        over_limit_then_surrogate = "x" * (standard["jsonStringLength"] + 1) + "\ud800"
        cases.append((over_limit_then_surrogate, "SNAPSHOT_STRING_TOO_LONG", ""))
        cases.append(({over_limit_then_surrogate: 1}, "SNAPSHOT_STRING_TOO_LONG", ""))

        too_deep = {}
        cursor = too_deep
        for _ in range(standard["jsonDepth"] + 1):
            child = {}
            cursor["x"] = child
            cursor = child
        cases.append((too_deep, "SNAPSHOT_DEPTH_EXCEEDED", "/x" * (standard["jsonDepth"] + 1)))

        for value, expected_code, expected_path in cases:
            with self.subTest(code=expected_code):
                errors = cortexel.validate_request_partial(value)
                self.assertEqual(len(errors), 1)
                self.assertEqual(errors[0].code, expected_code)
                self.assertEqual(errors[0].stage, "snapshot")
                self.assertEqual(errors[0].instance_path, expected_path)

        one_utf16_unit = dict(standard)
        one_utf16_unit["jsonStringLength"] = 1
        snapshot, error = _snapshot_materialized("😀", one_utf16_unit)
        self.assertIsNone(snapshot)
        self.assertEqual(error.code, "SNAPSHOT_STRING_TOO_LONG")

        tiny_nodes = dict(standard)
        tiny_nodes["jsonTotalNodes"] = 2
        snapshot, error = _snapshot_materialized([None, None], tiny_nodes)
        self.assertIsNone(snapshot)
        self.assertEqual((error.code, error.instance_path), ("SNAPSHOT_NODES_EXCEEDED", "/1"))

        tiny_array = dict(standard)
        tiny_array["jsonArrayItems"] = 1
        snapshot, error = _snapshot_materialized([None, None], tiny_array)
        self.assertIsNone(snapshot)
        self.assertEqual((error.code, error.instance_path), ("SNAPSHOT_NODES_EXCEEDED", ""))

        tiny_object = dict(standard)
        tiny_object["jsonObjectKeys"] = 1
        snapshot, error = _snapshot_materialized({"a": 1, "b": 2}, tiny_object)
        self.assertIsNone(snapshot)
        self.assertEqual((error.code, error.instance_path), ("SNAPSHOT_NODES_EXCEEDED", ""))

    def test_diagnostic_finalization_is_globally_capped_with_exact_omitted_count(self):
        request = self._psth_request()
        request["data"]["trialIds"] = ["same"] * 40
        request["data"]["alignmentTimes"] = [0] * 40

        errors = cortexel.validate_request_partial(request)
        self.assertEqual(len(errors), BUDGET_PROFILES["standard"]["errorRecords"])
        self.assertTrue(all(error.code == "SEMANTIC_DUPLICATE_ID" for error in errors[:-1]))
        self.assertEqual(errors[-1].code, "ERROR_LIMIT_REACHED")
        self.assertEqual(errors[-1].stage, "internal")
        self.assertEqual(errors[-1].severity, "warning")
        self.assertEqual(errors[-1].omitted_count, 8)
        self.assertEqual(errors[-1].as_dict()["omittedCount"], 8)

        exact_budget = _finalize_errors([
            CortexelError("SCHEMA_TYPE_MISMATCH", "structural", f"/{index}", "same")
            for index in range(BUDGET_PROFILES["standard"]["errorRecords"])
        ])
        self.assertEqual(len(exact_budget), 32)
        self.assertNotEqual(exact_budget[-1].code, "ERROR_LIMIT_REACHED")

        one_over = _finalize_errors([
            CortexelError("SCHEMA_TYPE_MISMATCH", "structural", f"/{index}", "same")
            for index in range(BUDGET_PROFILES["standard"]["errorRecords"] + 1)
        ])
        self.assertEqual(len(one_over), 32)
        self.assertEqual((one_over[-1].code, one_over[-1].omitted_count),
                         ("ERROR_LIMIT_REACHED", 2))

    def test_schema_combinators_delegate_all_truncation_to_the_global_finalizer(self):
        request = self._psth_request()
        request["data"]["counts"][1] = 1.5

        errors = cortexel.validate_request_partial(request)
        diagnostics = [(error.code, error.instance_path) for error in errors]
        self.assertGreater(len(errors), 4)
        self.assertIn(("SCHEMA_TYPE_MISMATCH", "/data/counts/1"), diagnostics)
        self.assertNotIn("ERROR_LIMIT_REACHED", [error.code for error in errors])

        for combinator in ("oneOf", "anyOf"):
            with self.subTest(combinator=combinator):
                branch_errors = []
                _validate_schema({}, {
                    combinator: [
                        {"type": "object", "required": [f"required_{index}"]}
                        for index in range(6)
                    ],
                }, "", branch_errors)
                self.assertEqual(len(branch_errors), 6)
                self.assertTrue(all(
                    error.code == "SCHEMA_REQUIRED_PROPERTY_MISSING"
                    for error in branch_errors
                ))

        for selected_branch, discriminator in (("then", "selected"), ("else", "other")):
            with self.subTest(selected_branch=selected_branch):
                conditional_errors = []
                _validate_schema({"kind": discriminator}, {
                    "if": {
                        "type": "object",
                        "properties": {"kind": {"const": "selected"}},
                        "required": ["kind"],
                    },
                    "then": {"type": "object", "required": ["then_value"]},
                    "else": {"type": "object", "required": ["else_value"]},
                }, "", conditional_errors)
                required_name = "then_value" if selected_branch == "then" else "else_value"
                self.assertEqual(
                    [(error.code, error.instance_path) for error in conditional_errors],
                    [
                        ("SCHEMA_REQUIRED_PROPERTY_MISSING", f"/{required_name}"),
                    ],
                )

        # Suppression is conditional-wrapper-specific. A combinator that genuinely
        # has no causal failing leaf still owns one summary record: both oneOf
        # branches accept this integer, so there is no branch error to surface.
        summary_only_errors = []
        _validate_schema(1, {
            "oneOf": [
                {"type": "number"},
                {"type": "integer"},
            ],
        }, "/value", summary_only_errors)
        self.assertEqual(
            [(error.code, error.instance_path) for error in summary_only_errors],
            [("SCHEMA_VALIDATION_FAILED", "/value")],
        )

        matched_not_errors = []
        _validate_schema({}, {"not": {"type": "object"}}, "/value", matched_not_errors)
        self.assertEqual(
            [(error.code, error.instance_path) for error in matched_not_errors],
            [("SCHEMA_VALIDATION_FAILED", "/value")],
        )

    def test_diagnostics_follow_the_registry_unicode_code_point_order(self):
        request = self._psth_request()
        request["parameters"]["\ue000"] = 1
        request["parameters"]["\U00010000"] = 2

        errors = cortexel.validate_request_partial(request)
        self.assertEqual(
            [error.instance_path for error in errors],
            ["/parameters/\ue000", "/parameters/\U00010000"],
        )

        tied = _finalize_errors([
            CortexelError("SCHEMA_TYPE_MISMATCH", "structural", "/same", "same", validator_id="\U00010000"),
            CortexelError("SCHEMA_TYPE_MISMATCH", "structural", "/same", "same", validator_id="\ue000"),
        ])
        self.assertEqual([error.validator_id for error in tied], ["\ue000", "\U00010000"])
        self.assertEqual(tied[0].as_dict()["validatorId"], "\ue000")

    def test_psth_partial_port_keeps_time_dimensions_and_sender_exposure_explicit(self):
        for path, mutate in (
            ("/data/alignmentUnit", lambda request: request["data"].update(alignmentUnit="mV")),
            ("/data/relativeWindow/unit", lambda request: request["data"]["relativeWindow"].update(unit="mV")),
            ("/parameters/bins/unit", lambda request: request["parameters"]["bins"].update(unit="mV")),
        ):
            with self.subTest(path=path):
                request = self._psth_request()
                mutate(request)
                errors = self._psth_errors(request)
                self.assertIn(
                    ("SCIENCE_UNIT_DIMENSION_MISMATCH", path),
                    [(error.code, error.instance_path) for error in errors],
                )

        event_unit = self._psth_request("events")
        event_unit["data"]["eventTimes"]["unit"] = "mV"
        errors = self._psth_errors(event_unit)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_UNIT_DIMENSION_MISMATCH", "/data/eventTimes/unit")],
        )

        events = self._psth_request("events")
        del events["parameters"]["senderExposurePolicy"]
        errors = self._psth_errors(events)
        self.assertEqual(
            [(error.code, error.stage, error.instance_path) for error in errors],
            [("SCIENCE_DENOMINATOR_INVALID", "science", "/parameters/senderExposurePolicy")],
        )

    def test_psth_count_audits_are_exact_but_normalized_audits_use_exact_relative_tolerance(self):
        exact_count = self._psth_request()
        exact_count["parameters"]["normalization"] = "count"
        exact_count["parameters"].pop("baseline", None)
        exact_count["data"]["rates"] = {
            "kind": "count",
            "unit": "1",
            "values": [None, 3, 12 - 1e-12, 6],
        }
        errors = self._psth_errors(exact_count)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_NORMALIZATION_UNVERIFIABLE", "/data/rates/values/2")],
        )

        within = self._psth_request()
        within["parameters"].pop("baseline", None)
        within["data"]["rates"]["values"][2] = 240 * (1 + 0.5e-12)
        self.assertEqual(self._psth_errors(within), [])

        outside = self._psth_request()
        outside["parameters"].pop("baseline", None)
        outside["data"]["rates"]["values"][2] = 240 * (1 + 2e-12)
        errors = self._psth_errors(outside)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_NORMALIZATION_UNVERIFIABLE", "/data/rates/values/2")],
        )

        zero = self._psth_request()
        zero["parameters"].pop("baseline", None)
        zero["data"]["counts"] = [0, 3, 12, 6]
        zero["data"]["trialDenominators"] = [5, 3, 5, 5]
        zero["data"]["rates"]["values"] = [0.5, 100, 240, 120]
        errors = self._psth_errors(zero)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_NORMALIZATION_UNVERIFIABLE", "/data/rates/values/0")],
        )

    def test_psth_per_bin_exposure_missingness_and_baseline_are_independently_checked(self):
        unequal = self._psth_request()
        unequal["parameters"].pop("baseline", None)
        unequal["parameters"]["bins"] = {
            "mode": "edges",
            "unit": "s",
            "edges": [0, 1, 3, 6, 10],
            "boundary": "[lo,hi)",
            "finalEdgeInclusive": False,
        }
        unequal["data"]["relativeWindow"] = {
            "start": 0,
            "stop": 10,
            "unit": "s",
            "boundary": "[start,stop)",
        }
        unequal["data"]["rates"] = {
            "kind": "firing_rate",
            "unit": "Hz",
            "values": [None, 0.5, 0.8, 0.3],
        }
        self.assertEqual(self._psth_errors(unequal), [])

        above = self._psth_request()
        above["data"]["trialDenominators"][1] = 6
        errors = self._psth_errors(above)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_DENOMINATOR_INVALID", "/data/trialDenominators/1")],
        )

        mask = self._psth_request()
        mask["data"]["trialDenominators"][0] = 1
        errors = self._psth_errors(mask)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_DENOMINATOR_INVALID", "/data/trialDenominators/0")],
        )

        no_baseline_exposure = self._psth_request()
        no_baseline_exposure["parameters"]["baseline"] = {
            "mode": "subtract_mean_rate",
            "start": -20,
            "stop": -10,
        }
        errors = self._psth_errors(no_baseline_exposure)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_DENOMINATOR_INVALID", "/parameters/baseline")],
        )

        off_edge = self._psth_request()
        off_edge["parameters"]["baseline"]["start"] = -9
        errors = self._psth_errors(off_edge)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("SCIENCE_BIN_EDGES_INVALID", "/parameters/baseline")],
        )

    def test_psth_semantic_references_and_direct_budget_guards_are_classified(self):
        mismatched = self._psth_request("events")
        mismatched["data"]["eventSenderIds"].pop()
        errors = self._psth_errors(mismatched)
        self.assertIn(
            ("SEMANTIC_LENGTH_MISMATCH", "semantic", "/data/eventSenderIds"),
            [(error.code, error.stage, error.instance_path) for error in errors],
        )

        unknown = self._psth_request("events")
        unknown["data"]["eventTrialIds"][0] = "not-a-trial"
        errors = self._psth_errors(unknown)
        self.assertIn(
            ("SEMANTIC_UNKNOWN_REFERENCE", "semantic", "/data/eventTrialIds/0"),
            [(error.code, error.stage, error.instance_path) for error in errors],
        )

        too_many_width_bins = self._psth_request("events")
        too_many_width_bins["parameters"]["bins"] = {
            "mode": "width",
            "unit": "s",
            "width": 1,
            "start": 0,
            "stop": 100001,
            "boundary": "[lo,hi)",
            "finalEdgeInclusive": False,
        }
        too_many_width_bins["data"]["relativeWindow"] = {
            "start": 0,
            "stop": 100001,
            "unit": "s",
            "boundary": "[start,stop)",
        }
        errors = self._psth_errors(too_many_width_bins)
        self.assertEqual(
            [(error.code, error.stage, error.instance_path) for error in errors],
            [("SCIENCE_BIN_EDGES_INVALID", "science", "/parameters/bins/width")],
        )

        over_budget_edges = self._psth_request()
        over_budget_edges["parameters"]["bins"] = {
            "mode": "edges",
            "unit": "s",
            "edges": list(range(100002)),
            "boundary": "[lo,hi)",
            "finalEdgeInclusive": False,
        }
        over_budget_edges["data"]["relativeWindow"] = {
            "start": 0,
            "stop": 100001,
            "unit": "s",
            "boundary": "[start,stop)",
        }
        errors = self._psth_errors(over_budget_edges)
        self.assertEqual(
            [(error.code, error.stage, error.instance_path) for error in errors],
            [("RESOURCE_OBSERVATIONS_EXCEEDED", "budget", "/parameters/bins")],
        )

    def test_explicit_skill_revision_is_checked_before_structure_and_semantics(self):
        request = json.loads(json.dumps(self._response_contract()["examples"]["valid"][0]))
        skill_id = request["skill"]["id"]
        installed_revision = SKILL_REVISIONS[skill_id]

        request["skill"]["revision"] = installed_revision
        self.assertEqual(cortexel.validate_request_partial(request), [])

        request["skill"]["revision"] = installed_revision - 1
        errors = cortexel.validate_request_partial(request)
        self.assertEqual(
            [error.code for error in errors],
            ["CONTRACT_SKILL_REVISION_UNSUPPORTED"],
        )
        self.assertEqual(errors[0].stage, "identity")
        self.assertEqual(errors[0].instance_path, "/skill/revision")

    def test_spike_raster_honors_all_generic_endpoint_closures(self):
        cases = (
            ("[start,stop)", "/data/eventTimes/values/1"),
            ("[start,stop]", None),
            ("(start,stop]", "/data/eventTimes/values/0"),
        )
        for boundary, expected_path in cases:
            with self.subTest(boundary=boundary):
                request = self._spike_request(
                    [0, 1],
                    {"start": 0, "stop": 1, "unit": "ms", "boundary": boundary},
                )
                errors = cortexel.validate_request_partial(request)
                if expected_path is None:
                    self.assertEqual(errors, [])
                else:
                    outside = [
                        error for error in errors
                        if error.code == "SCIENCE_EVENT_OUT_OF_WINDOW"
                    ]
                    self.assertEqual(len(outside), 1)
                    self.assertEqual(outside[0].instance_path, expected_path)

    def test_spike_raster_compares_cross_unit_binary64_values_exactly(self):
        # Rounded conversion makes 0.3 ms equal 0.0003 s, but their submitted
        # binary64 rationals are physically distinct: the event is just above stop.
        just_outside = self._spike_request(
            [0.3],
            {"start": 0, "stop": 0.0003, "unit": "s", "boundary": "[start,stop]"},
        )
        errors = cortexel.validate_request_partial(just_outside)
        self.assertIn("SCIENCE_EVENT_OUT_OF_WINDOW", [error.code for error in errors])

        # Reversing the representations makes 0.0003 s just below 0.3 ms. A
        # rounded intermediate would incorrectly place it on the excluded stop.
        just_inside = self._spike_request(
            [0.0003],
            {"start": 0, "stop": 0.3, "unit": "ms", "boundary": "[start,stop)"},
        )
        just_inside["data"]["eventTimes"]["unit"] = "s"
        self.assertEqual(cortexel.validate_request_partial(just_inside), [])

        wrong_dimension = self._spike_request(
            [0],
            {"start": 0, "stop": 1, "unit": "mV", "boundary": "[start,stop)"},
        )
        errors = cortexel.validate_request_partial(wrong_dimension)
        self.assertIn("SCIENCE_UNIT_DIMENSION_MISMATCH", [error.code for error in errors])
        self.assertIn("/data/window/unit", [error.instance_path for error in errors])

    def test_spike_raster_origin_relative_window_is_open_then_closed(self):
        window = {
            "kind": "nest_recording_device_origin_relative",
            "origin": 100,
            "start": 0,
            "stop": 10,
            "unit": "ms",
            "boundary": "(origin+start,origin+stop]",
            "recordingBackend": "memory",
            "timeEncoding": "native_binary64_ms",
        }
        endpoints = self._spike_request(
            [100, 110], window, origin_relative=True
        )
        errors = cortexel.validate_request_partial(endpoints)
        outside = [
            error for error in errors
            if error.code == "SCIENCE_EVENT_OUT_OF_WINDOW"
        ]
        self.assertEqual(len(outside), 1)
        self.assertEqual(outside[0].instance_path, "/data/eventTimes/values/0")

        closed_stop = self._spike_request([110], window, origin_relative=True)
        self.assertEqual(cortexel.validate_request_partial(closed_stop), [])

    def test_spike_raster_nest_combines_tics_before_projecting_endpoints(self):
        """Pin the real NEST get_ms operation order at a decimal edge.

        NEST stores one already-rounded reciprocal and multiplies integer tics by
        it. The absolute boundary is nevertheless formed in Time::tic_t first.
        An evaluator must not compare an event with the rational sum of the
        separately serialized origin and offset fields.
        """
        reciprocal = 1.0 / 1000.0

        def projected(tics):
            return float(tics) * reciprocal

        build_profile = (
            "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1"
        )

        finite_window = {
            "kind": "nest_recording_device_origin_relative",
            "origin": projected(100),
            "start": projected(0),
            "stop": projected(700),
            "unit": "ms",
            "boundary": "(origin+start,origin+stop]",
            "recordingBackend": "memory",
            "timeEncoding": "native_binary64_ms",
        }
        finite = self._spike_request(
            [0.8], finite_window, origin_relative=True
        )
        finite_authority = finite["data"]["window"]["captureAuthority"]
        finite_authority["runtimeStatus"].update({
            "resolutionMs": projected(100),
            "ticsPerMs": "1000",
            "resolutionTics": "100",
            "captureBiologicalTimeTics": "800",
            "timeBuildProfile": build_profile,
        })
        finite_authority["recordingGrid"] = {
            "originTics": "100",
            "startTics": "0",
            "stopTics": "700",
        }
        finite_authority["bufferEpoch"]["beganAtBiologicalTimeTics"] = "100"
        finite_authority["recordingPlan"][
            "lastMutationAtBiologicalTimeTics"
        ] = "100"
        self.assertEqual(projected(800), 0.8)
        self.assertEqual(cortexel.validate_request_partial(finite), [])

        # Stronger double-rounding oracle: adding the two separately serialized
        # fields loses the source's upper endpoint, whereas adding integer tics
        # first and projecting once preserves it.
        finite_double_round = json.loads(json.dumps(finite))
        combined_700_ms = projected(700)
        finite_double_round["data"]["eventTimes"]["values"] = [
            combined_700_ms
        ]
        finite_double_round["data"]["window"]["stop"] = projected(600)
        finite_double_round["data"]["window"]["captureAuthority"][
            "runtimeStatus"
        ]["captureBiologicalTimeTics"] = "700"
        finite_double_round["data"]["window"]["captureAuthority"][
            "recordingGrid"
        ]["stopTics"] = "600"
        separately_added_ms = (
            finite_double_round["data"]["window"]["origin"] +
            finite_double_round["data"]["window"]["stop"]
        )
        self.assertEqual(separately_added_ms, 0.7)
        self.assertEqual(combined_700_ms, 0.7000000000000001)
        self.assertGreater(combined_700_ms, separately_added_ms)
        self.assertEqual(
            cortexel.validate_request_partial(finite_double_round),
            [],
        )

        exact_quotient_substitution = json.loads(json.dumps(finite))
        exact_quotient_substitution["data"]["window"]["stop"] = 0.7
        direct_errors = []
        _validate_spike_raster(exact_quotient_substitution, direct_errors)
        self.assertEqual(
            [(error.code, error.instance_path) for error in direct_errors],
            [(
                "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
                "/data/window/captureAuthority/recordingGrid/stopTics",
            )],
        )

        # Exact NEST 3.10.0 runtime control: SetKernelStatus resolution=0.7
        # reports 0x1.6666666666667p-1, not the exact rational quotient 7/10.
        wheel_resolution = json.loads(json.dumps(finite))
        wheel_resolution_ms = projected(700)
        self.assertEqual(
            wheel_resolution_ms.hex(),
            "0x1.6666666666667p-1",
        )
        wheel_resolution["data"]["eventTimes"]["values"] = [
            wheel_resolution_ms
        ]
        wheel_resolution["data"]["window"].update({
            "origin": 0.0,
            "start": 0.0,
            "stop": wheel_resolution_ms,
        })
        wheel_authority = wheel_resolution["data"]["window"][
            "captureAuthority"
        ]
        wheel_authority["runtimeStatus"].update({
            "resolutionMs": wheel_resolution_ms,
            "resolutionTics": "700",
            "captureBiologicalTimeTics": "700",
        })
        wheel_authority["recordingGrid"] = {
            "originTics": "0",
            "startTics": "0",
            "stopTics": "700",
        }
        wheel_authority["bufferEpoch"]["beganAtBiologicalTimeTics"] = "0"
        wheel_authority["recordingPlan"][
            "lastMutationAtBiologicalTimeTics"
        ] = "0"
        self.assertEqual(
            cortexel.validate_request_partial(wheel_resolution),
            [],
        )

        capture_bounded = self._positive_infinity_spike_request(values=(0.8,))
        capture_window = capture_bounded["data"]["window"]
        capture_window.update({
            "origin": projected(100),
            "start": projected(700),
            "captureTime": projected(900),
        })
        capture_authority = capture_window["captureAuthority"]
        capture_authority["runtimeStatus"].update({
            "resolutionMs": projected(100),
            "ticsPerMs": "1000",
            "resolutionTics": "100",
            "captureBiologicalTimeTics": "900",
            "timeBuildProfile": build_profile,
        })
        capture_authority["recordingGrid"] = {
            "originTics": "100",
            "startTics": "700",
        }
        capture_authority["bufferEpoch"]["beganAtBiologicalTimeTics"] = "100"
        capture_authority["recordingPlan"][
            "lastMutationAtBiologicalTimeTics"
        ] = "800"
        errors = cortexel.validate_request_partial(capture_bounded)
        self.assertEqual(
            [
                (error.code, error.instance_path)
                for error in errors
                if error.code == "SCIENCE_EVENT_OUT_OF_WINDOW"
            ],
            [("SCIENCE_EVENT_OUT_OF_WINDOW", "/data/eventTimes/values/0")],
        )

        capture_double_round = self._positive_infinity_spike_request(
            values=(combined_700_ms,)
        )
        double_round_window = capture_double_round["data"]["window"]
        double_round_window.update({
            "origin": projected(100),
            "start": projected(600),
            "captureTime": projected(800),
        })
        double_round_authority = double_round_window["captureAuthority"]
        double_round_authority["runtimeStatus"].update({
            "resolutionMs": projected(100),
            "ticsPerMs": "1000",
            "resolutionTics": "100",
            "captureBiologicalTimeTics": "800",
            "timeBuildProfile": build_profile,
        })
        double_round_authority["recordingGrid"] = {
            "originTics": "100",
            "startTics": "600",
        }
        double_round_authority["bufferEpoch"][
            "beganAtBiologicalTimeTics"
        ] = "100"
        double_round_authority["recordingPlan"][
            "lastMutationAtBiologicalTimeTics"
        ] = "700"
        double_round_errors = cortexel.validate_request_partial(
            capture_double_round
        )
        self.assertEqual(
            [
                (error.code, error.instance_path)
                for error in double_round_errors
            ],
            [("SCIENCE_EVENT_OUT_OF_WINDOW", "/data/eventTimes/values/0")],
        )

    def test_spike_raster_nest_clock_domain_and_resolution_fail_closed(self):
        maximum_safe_tic = (1 << 53) - 1
        build_profile = (
            "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1"
        )

        # An unsafe resolution is one failed prerequisite, not permission to
        # derive modulo, finite-domain, adjacency, or membership conclusions
        # from a lossy binary64 integer conversion. Other safe primitives remain
        # independently checkable, so this mutation owns exactly one diagnostic.
        unsafe_resolution = json.loads(json.dumps(
            self._spike_contract()["examples"]["valid"][0]
        ))
        unsafe_resolution["data"]["eventTimes"]["values"] = [1000.0]
        unsafe_resolution["data"]["eventSenderIds"] = [
            unsafe_resolution["data"]["recordedSenderIds"][0]
        ]
        unsafe_resolution["data"]["window"]["captureAuthority"][
            "runtimeStatus"
        ]["resolutionTics"] = str(maximum_safe_tic + 1)
        unsafe_resolution_errors = cortexel.validate_request_partial(
            unsafe_resolution
        )
        self.assertEqual(
            [
                (error.code, error.instance_path)
                for error in unsafe_resolution_errors
            ],
            [(
                "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
                "/data/window/captureAuthority/runtimeStatus/resolutionTics",
            )],
        )

        independently_unsafe = json.loads(json.dumps(unsafe_resolution))
        independently_unsafe["data"]["window"]["captureAuthority"][
            "runtimeStatus"
        ].update({
            "captureBiologicalTimeTics": str(maximum_safe_tic + 2),
            "ticsPerMs": str(maximum_safe_tic + 3),
        })
        independent_errors = cortexel.validate_request_partial(
            independently_unsafe
        )
        self.assertEqual(
            [
                (error.code, error.instance_path)
                for error in independent_errors
            ],
            [
                (
                    "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
                    (
                        "/data/window/captureAuthority/runtimeStatus/"
                        "captureBiologicalTimeTics"
                    ),
                ),
                (
                    "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
                    "/data/window/captureAuthority/runtimeStatus/resolutionTics",
                ),
                (
                    "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
                    "/data/window/captureAuthority/runtimeStatus/ticsPerMs",
                ),
            ],
        )

        # At this exact safe-integer boundary, NEST's reciprocal-then-multiply
        # projection maps the retained upper tic and its +1-resolution neighbor
        # to the same binary64 value even though the retained tic itself passes
        # the pinned Time(ms) inverse. The interval is therefore not resolvable.
        tics_per_ms = 3
        upper_tics = maximum_safe_tic - 1
        milliseconds_per_tic = 1.0 / float(tics_per_ms)
        upper_ms = float(upper_tics) * milliseconds_per_tic
        self.assertEqual(
            upper_ms,
            float(upper_tics + 1) * milliseconds_per_tic,
        )
        self.assertEqual(
            math.trunc(upper_ms * float(tics_per_ms) + 0.5),
            upper_tics,
        )
        aliased = self._spike_request(
            (),
            {
                "kind": "nest_recording_device_origin_relative",
                "origin": 0.0,
                "start": 0.0,
                "stop": upper_ms,
                "unit": "ms",
                "boundary": "(origin+start,origin+stop]",
                "recordingBackend": "memory",
                "timeEncoding": "native_binary64_ms",
            },
            origin_relative=True,
        )
        alias_authority = aliased["data"]["window"]["captureAuthority"]
        alias_authority["runtimeStatus"].update({
            "resolutionMs": milliseconds_per_tic,
            "ticsPerMs": str(tics_per_ms),
            "resolutionTics": "1",
            "captureBiologicalTimeTics": str(upper_tics),
            "timeBuildProfile": build_profile,
        })
        alias_authority["recordingGrid"] = {
            "originTics": "0",
            "startTics": "0",
            "stopTics": str(upper_tics),
        }
        alias_authority["bufferEpoch"]["beganAtBiologicalTimeTics"] = "0"
        alias_authority["recordingPlan"][
            "lastMutationAtBiologicalTimeTics"
        ] = "0"
        alias_errors = []
        _validate_spike_raster(aliased, alias_errors)
        self.assertEqual(
            [(error.code, error.instance_path) for error in alias_errors],
            [(
                "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
                "/data/window/captureAuthority/recordingGrid/stopTics",
            )],
        )

        # Each retained Time fits the conservative source subset, but the finite
        # absolute upper sum does not. Reject that authority before membership;
        # Python's unbounded integer must not conceal the cross-runtime overflow.
        combined_overflow = self._spike_request(
            (),
            {
                "kind": "nest_recording_device_origin_relative",
                "origin": maximum_safe_tic - 1,
                "start": 0,
                "stop": 2,
                "unit": "ms",
                "boundary": "(origin+start,origin+stop]",
                "recordingBackend": "memory",
                "timeEncoding": "native_binary64_ms",
            },
            origin_relative=True,
        )
        overflow_authority = combined_overflow["data"]["window"][
            "captureAuthority"
        ]
        overflow_authority["runtimeStatus"].update({
            "resolutionMs": 1.0,
            "ticsPerMs": "1",
            "resolutionTics": "1",
            "captureBiologicalTimeTics": str(maximum_safe_tic - 1),
            "timeBuildProfile": build_profile,
        })
        overflow_authority["recordingGrid"] = {
            "originTics": str(maximum_safe_tic - 1),
            "startTics": "0",
            "stopTics": "2",
        }
        overflow_authority["bufferEpoch"]["beganAtBiologicalTimeTics"] = "0"
        overflow_authority["recordingPlan"][
            "lastMutationAtBiologicalTimeTics"
        ] = "0"
        overflow_errors = []
        _validate_spike_raster(combined_overflow, overflow_errors)
        self.assertIn(
            (
                "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
                "/data/window/captureAuthority/recordingGrid/stopTics",
            ),
            [(error.code, error.instance_path) for error in overflow_errors],
        )
        self.assertNotIn(
            "SCIENCE_EVENT_OUT_OF_WINDOW",
            [error.code for error in overflow_errors],
        )

    def test_spike_raster_capture_authority_uses_exact_tics_grid_and_history(self):
        request = json.loads(json.dumps(
            self._spike_contract()["examples"]["valid"][0]
        ))
        authority = request["data"]["window"]["captureAuthority"]
        authority["runtimeStatus"]["captureBiologicalTimeTics"] = "9875"
        authority["bufferEpoch"]["beganBy"] = "n_events_zero"
        authority["bufferEpoch"]["beganAtBiologicalTimeTics"] = "125"
        authority["recordingPlan"]["lastMutationAtBiologicalTimeTics"] = "125"
        errors = cortexel.validate_request_partial(request)
        self.assertEqual(
            [
                (error.code, error.instance_path)
                for error in errors
                if error.code == "SCIENCE_WINDOW_INVALID"
            ],
            [
                (
                    "SCIENCE_WINDOW_INVALID",
                    (
                        "/data/window/captureAuthority/bufferEpoch/"
                        "beganAtBiologicalTimeTics"
                    ),
                ),
                (
                    "SCIENCE_WINDOW_INVALID",
                    (
                        "/data/window/captureAuthority/recordingPlan/"
                        "lastMutationAtBiologicalTimeTics"
                    ),
                ),
                (
                    "SCIENCE_WINDOW_INVALID",
                    (
                        "/data/window/captureAuthority/runtimeStatus/"
                        "captureBiologicalTimeTics"
                    ),
                ),
            ],
        )

        exact = json.loads(json.dumps(
            self._spike_contract()["examples"]["valid"][0]
        ))
        exact_authority = exact["data"]["window"]["captureAuthority"]
        exact_authority["runtimeStatus"]["resolutionMs"] = 0.125
        exact_authority["runtimeStatus"]["captureBiologicalTimeTics"] = "10000"
        self.assertEqual(cortexel.validate_request_partial(exact), [])

    def test_spike_raster_positive_infinity_capture_is_open_then_closed(self):
        at_capture = self._positive_infinity_spike_request(values=(125.0,))
        self.assertEqual(cortexel.validate_request_partial(at_capture), [])

        at_open_start = self._positive_infinity_spike_request(values=(110.0,))
        errors = cortexel.validate_request_partial(at_open_start)
        self.assertEqual(
            [
                (error.code, error.instance_path)
                for error in errors
                if error.code == "SCIENCE_EVENT_OUT_OF_WINDOW"
            ],
            [("SCIENCE_EVENT_OUT_OF_WINDOW", "/data/eventTimes/values/0")],
        )

        beyond_capture = self._positive_infinity_spike_request(values=(125.125,))
        errors = cortexel.validate_request_partial(beyond_capture)
        self.assertEqual(
            [
                (error.code, error.instance_path)
                for error in errors
                if error.code == "SCIENCE_EVENT_OUT_OF_WINDOW"
            ],
            [("SCIENCE_EVENT_OUT_OF_WINDOW", "/data/eventTimes/values/0")],
        )

    def test_spike_raster_positive_infinity_authority_is_exact_and_closed(self):
        baseline = self._positive_infinity_spike_request()
        direct_errors = []
        _validate_spike_raster(baseline, direct_errors)
        self.assertEqual(direct_errors, [])

        empty_at_open_start = self._positive_infinity_spike_request(values=())
        empty_at_open_start["data"]["window"]["captureTime"] = 110.0
        empty_at_open_start["data"]["window"]["captureAuthority"][
            "runtimeStatus"
        ]["captureBiologicalTimeTics"] = "110000"
        direct_errors = []
        _validate_spike_raster(empty_at_open_start, direct_errors)
        self.assertEqual(
            [(error.code, error.instance_path) for error in direct_errors],
            [(
                "SCIENCE_WINDOW_INVALID",
                (
                    "/data/window/captureAuthority/runtimeStatus/"
                    "captureBiologicalTimeTics"
                ),
            )],
        )

        projection_mismatch = self._positive_infinity_spike_request()
        projection_mismatch["data"]["window"]["captureTime"] = math.nextafter(
            125.0, math.inf
        )
        direct_errors = []
        _validate_spike_raster(projection_mismatch, direct_errors)
        self.assertEqual(
            [(error.code, error.instance_path) for error in direct_errors],
            [(
                "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
                (
                    "/data/window/captureAuthority/runtimeStatus/"
                    "captureBiologicalTimeTics"
                ),
            )],
        )

        off_grid = self._positive_infinity_spike_request()
        off_grid_authority = off_grid["data"]["window"]["captureAuthority"]
        off_grid_authority["runtimeStatus"][
            "captureBiologicalTimeTics"
        ] = "125001"
        off_grid["data"]["window"]["captureTime"] = (
            float(125001) * (1.0 / 1000.0)
        )
        direct_errors = []
        _validate_spike_raster(off_grid, direct_errors)
        self.assertEqual(
            [(error.code, error.instance_path) for error in direct_errors],
            [(
                "SCIENCE_WINDOW_INVALID",
                (
                    "/data/window/captureAuthority/runtimeStatus/"
                    "captureBiologicalTimeTics"
                ),
            )],
        )

        before_open_start = self._positive_infinity_spike_request()
        before_open_start["data"]["window"]["captureAuthority"][
            "runtimeStatus"
        ]["captureBiologicalTimeTics"] = "110000"
        direct_errors = []
        _validate_spike_raster(before_open_start, direct_errors)
        capture_tic_path = (
            "/data/window/captureAuthority/runtimeStatus/"
            "captureBiologicalTimeTics"
        )
        self.assertEqual(
            [(error.code, error.instance_path) for error in direct_errors],
            [
                (
                    "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
                    capture_tic_path,
                ),
                ("SCIENCE_WINDOW_INVALID", capture_tic_path),
            ],
        )

        for field_path, expected_path in (
            (
                ("bufferEpoch", "beganAtBiologicalTimeTics"),
                (
                    "/data/window/captureAuthority/bufferEpoch/"
                    "beganAtBiologicalTimeTics"
                ),
            ),
            (
                ("recordingPlan", "lastMutationAtBiologicalTimeTics"),
                (
                    "/data/window/captureAuthority/recordingPlan/"
                    "lastMutationAtBiologicalTimeTics"
                ),
            ),
        ):
            with self.subTest(field=field_path[0]):
                mutated = self._positive_infinity_spike_request()
                authority = mutated["data"]["window"]["captureAuthority"]
                authority[field_path[0]][field_path[1]] = "110125"
                direct_errors = []
                _validate_spike_raster(mutated, direct_errors)
                self.assertEqual(
                    [(error.code, error.instance_path) for error in direct_errors],
                    [("SCIENCE_WINDOW_INVALID", expected_path)],
                )

        stop_tics = self._positive_infinity_spike_request()
        stop_tics["data"]["window"]["captureAuthority"]["recordingGrid"][
            "stopTics"
        ] = "125000"
        errors = cortexel.validate_request_partial(stop_tics)
        self.assertIn(
            ("SCHEMA_UNKNOWN_PROPERTY",
             "/data/window/captureAuthority/recordingGrid/stopTics"),
            [(error.code, error.instance_path) for error in errors],
        )

    def test_spike_raster_positive_infinity_profile_literals_fail_closed(self):
        baseline = self._positive_infinity_spike_request()
        self.assertEqual(cortexel.validate_request_partial(baseline), [])

        wrong_source_version = self._positive_infinity_spike_request()
        wrong_source_version["source"]["systemVersion"] = "3.11.0"
        clock_errors = [
            error
            for error in cortexel.validate_request_partial(wrong_source_version)
            if error.code == "PROVENANCE_SOURCE_CLOCK_INCONSISTENT"
        ]
        self.assertEqual(
            [error.instance_path for error in clock_errors],
            [
                "/data/window/captureAuthority/runtimeStatus/nestVersion",
                "/source/systemVersion",
            ],
        )

        mutations = (
            (
                ("captureAuthority", "profile"),
                "cortexel-nest-memory-spike-capture-authority.v2",
                "/data/window/captureAuthority/profile",
            ),
            (
                ("captureAuthority", "runtimeStatus", "statusReadMethod"),
                "pynest_single_spike_recorder_get_status_plain_projection_v1",
                "/data/window/captureAuthority/runtimeStatus/statusReadMethod",
            ),
            (
                ("captureAuthority", "runtimeStatus", "captureBoundary"),
                "after_successful_simulate_or_run_return",
                "/data/window/captureAuthority/runtimeStatus/captureBoundary",
            ),
            (
                ("captureAuthority", "runtimeStatus", "timeBuildProfile"),
                "nest_3_10_time_tic_int64_long_int32_ieee754_binary64_v1",
                "/data/window/captureAuthority/runtimeStatus/timeBuildProfile",
            ),
            (
                ("configuredStop", "exportedMs"),
                math.nextafter(sys.float_info.max, 0.0),
                "/data/window/configuredStop/exportedMs",
            ),
            (
                ("configuredStop", "kind"),
                "positive_infinity",
                "/data/window/configuredStop/kind",
            ),
        )
        for path, value, expected_path in mutations:
            with self.subTest(path=path):
                mutated = self._positive_infinity_spike_request()
                node = mutated["data"]["window"]
                for segment in path[:-1]:
                    node = node[segment]
                node[path[-1]] = value
                errors = cortexel.validate_request_partial(mutated)
                self.assertIn(
                    expected_path,
                    [error.instance_path for error in errors],
                )

    def test_spike_raster_positive_infinity_disclosure_does_not_hide_provenance(self):
        request = self._positive_infinity_spike_request(values=(125.125,))
        request["parameters"]["outOfWindowPolicy"] = "exclude_and_disclose"
        request["source"]["system"] = "nest"
        errors = cortexel.validate_request_partial(request)
        self.assertNotIn(
            "SCIENCE_EVENT_OUT_OF_WINDOW",
            [error.code for error in errors],
        )
        self.assertIn(
            ("PROVENANCE_SOURCE_CLOCK_INCONSISTENT", "/source/system"),
            [(error.code, error.instance_path) for error in errors],
        )

    def test_spike_raster_invalid_windows_preempt_membership(self):
        invalid = self._spike_request(
            [1000],
            {"start": 1, "stop": 1, "unit": "ms", "boundary": "[start,stop)"},
        )
        invalid["source"] = {"kind": "unknown"}
        errors = []
        _validate_spike_raster(invalid, errors)
        self.assertEqual([error.code for error in errors], ["SCIENCE_WINDOW_INVALID"])

        # An invalid scientific window suppresses only membership checks. The
        # source-clock declaration is an independent provenance validator and must
        # still run; the public boundary then sorts science before provenance.
        invalid_origin = json.loads(json.dumps(self._spike_contract()["examples"]["valid"][0]))
        invalid_origin["data"]["window"]["stop"] = invalid_origin["data"]["window"]["start"]
        invalid_origin["data"]["window"]["captureAuthority"]["recordingGrid"][
            "stopTics"
        ] = invalid_origin["data"]["window"]["captureAuthority"]["recordingGrid"][
            "startTics"
        ]
        invalid_origin["source"]["system"] = "nest"
        invalid_origin["source"]["systemVersion"] = "3.11"
        invalid_origin["source"].pop("sourceDigest")
        errors = cortexel.validate_request_partial(invalid_origin)
        self.assertEqual(
            [error.code for error in errors],
            ["SCIENCE_WINDOW_INVALID"] +
            ["PROVENANCE_SOURCE_CLOCK_INCONSISTENT"] * 4,
        )
        self.assertEqual(
            [error.instance_path for error in errors],
            [
                "/data/window/captureAuthority/recordingGrid/stopTics",
                "/data/window/captureAuthority/runtimeStatus/nestVersion",
                "/source/sourceDigest",
                "/source/system",
                "/source/systemVersion",
            ],
        )

    def test_spike_raster_exclusion_policy_suppresses_only_membership_error(self):
        request = self._spike_request(
            [10],
            {"start": 0, "stop": 10, "unit": "ms", "boundary": "[start,stop)"},
            policy="exclude_and_disclose",
        )
        self.assertEqual(cortexel.validate_request_partial(request), [])

        origin = json.loads(json.dumps(self._spike_contract()["examples"]["valid"][0]))
        origin["data"]["eventTimes"]["values"] = [0]
        origin["data"]["eventSenderIds"] = ["1"]
        origin["parameters"]["outOfWindowPolicy"] = "exclude_and_disclose"
        origin["source"]["system"] = "nest"
        errors = cortexel.validate_request_partial(origin)
        self.assertNotIn("SCIENCE_EVENT_OUT_OF_WINDOW", [error.code for error in errors])
        self.assertIn(
            "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
            [error.code for error in errors],
        )

    def test_spike_raster_invalid_source_suppresses_membership(self):
        request = json.loads(json.dumps(self._spike_contract()["examples"]["valid"][0]))
        request["data"]["eventTimes"]["values"] = [
            request["data"]["window"]["origin"] + request["data"]["window"]["stop"] + 1
        ]
        request["data"]["eventSenderIds"] = [request["data"]["recordedSenderIds"][0]]
        request["source"]["system"] = "nest"
        errors = cortexel.validate_request_partial(request)
        self.assertEqual(
            [(error.code, error.instance_path) for error in errors],
            [("PROVENANCE_SOURCE_CLOCK_INCONSISTENT", "/source/system")],
        )

    def test_spike_raster_nest_source_clock_binding_is_fail_closed(self):
        contract = self._spike_contract()
        request = json.loads(json.dumps(contract["examples"]["valid"][0]))
        request["source"]["systemVersion"] = "3.10.0"
        self.assertEqual(cortexel.validate_request_partial(request), [])

        for version in (
            None,
            "3.8",
            "3.9",
            "3.9.0",
            "3.9.17",
            "3.10",
            "3.10.123",
            "3.11",
            "v3.10.0",
            "3.10.0rc1",
            "3.10.0.1",
        ):
            with self.subTest(version=version):
                request = json.loads(json.dumps(contract["examples"]["valid"][0]))
                if version is None:
                    request["source"].pop("systemVersion")
                else:
                    request["source"]["systemVersion"] = version
                errors = cortexel.validate_request_partial(request)
                clock_errors = [
                    error for error in errors
                    if error.code == "PROVENANCE_SOURCE_CLOCK_INCONSISTENT"
                ]
                self.assertEqual(
                    [error.instance_path for error in clock_errors],
                    [
                        "/data/window/captureAuthority/runtimeStatus/nestVersion",
                        "/source/systemVersion",
                    ],
                )

        for field, value, expected_path in (
            ("kind", "unknown", "/source/kind"),
            ("system", "nest", "/source/system"),
            ("sourceDigest", None, "/source/sourceDigest"),
        ):
            with self.subTest(field=field):
                request = json.loads(json.dumps(contract["examples"]["valid"][0]))
                if value is None:
                    request["source"].pop(field)
                else:
                    request["source"][field] = value
                errors = cortexel.validate_request_partial(request)
                self.assertIn(
                    expected_path,
                    [
                        error.instance_path for error in errors
                        if error.code == "PROVENANCE_SOURCE_CLOCK_INCONSISTENT"
                    ],
                )

        relative = json.loads(json.dumps(contract["examples"]["valid"][0]))
        relative["data"]["timeBase"] = "trial_relative"
        relative["data"]["alignmentLabel"] = "invented trial boundary"
        relative["data"]["eventTrialIds"] = [
            "t1" for _ in relative["data"]["eventTimes"]["values"]
        ]
        relative["data"]["trialIds"] = ["t1"]
        errors = cortexel.validate_request_partial(relative)
        self.assertIn("SCHEMA_ENUM_MISMATCH", [error.code for error in errors])
        self.assertIn("/data/timeBase", [error.instance_path for error in errors])

        inconsistent = json.loads(json.dumps(contract["examples"]["valid"][0]))
        inconsistent["data"]["eventTimes"]["values"] = [1]
        inconsistent["data"]["eventSenderIds"] = ["1"]
        inconsistent["data"]["eventTimes"]["unit"] = "us"
        inconsistent["data"]["window"]["recordingBackend"] = "ascii"
        inconsistent["data"]["window"]["timeEncoding"] = "step_offset"
        inconsistent["data"]["timeBase"] = "trial_relative"
        inconsistent["source"] = {
            "kind": "experimental_recording",
            "system": "nest",
            "systemVersion": "3.11",
        }
        errors = []
        _validate_spike_raster(inconsistent, errors)
        self.assertEqual(
            [error.code for error in errors],
            ["PROVENANCE_SOURCE_CLOCK_INCONSISTENT"] * 9,
        )
        self.assertTrue(all(error.stage == "provenance" for error in errors))
        self.assertEqual(
            [error.instance_path for error in errors],
            [
                "/source/kind",
                "/source/system",
                "/source/systemVersion",
                "/data/window/captureAuthority/runtimeStatus/nestVersion",
                "/source/sourceDigest",
                "/data/window/recordingBackend",
                "/data/window/timeEncoding",
                "/data/eventTimes/unit",
                "/data/timeBase",
            ],
        )

    def test_response_curve_structural_boundaries_are_not_silently_skipped(self):
        contract = self._response_contract()

        trimmed = json.loads(json.dumps(contract["examples"]["valid"][3]))
        trimmed["parameters"]["trimFraction"] = 0.5
        self.assertNotEqual(cortexel.validate_request_partial(trimmed), [])

        bad_identifier = json.loads(json.dumps(contract["examples"]["valid"][0]))
        original = bad_identifier["data"]["conditions"]["ids"][0]
        bad_identifier["data"]["conditions"]["ids"][0] = "invalid id"
        bad_identifier["data"]["observations"]["conditionIds"] = [
            "invalid id" if value == original else value
            for value in bad_identifier["data"]["observations"]["conditionIds"]
        ]
        self.assertNotEqual(cortexel.validate_request_partial(bad_identifier), [])

    def test_generated_if_then_else_and_not_constraints_are_enforced(self):
        path = os.path.join(CONTRACT_SKILLS, "network.adjacency_matrix.v1.json")
        with open(path, encoding="utf-8") as handle:
            contract = json.load(handle)

        missing_rank_local_authority = next(
            example["request"]
            for example in contract["examples"]["invalid"]
            if example["expectedCode"] == "SCHEMA_REQUIRED_PROPERTY_MISSING"
        )
        self.assertNotEqual(cortexel.validate_request_partial(missing_rank_local_authority), [])

        forbidden_outside_rank_local = json.loads(json.dumps(contract["examples"]["valid"][0]))
        forbidden_outside_rank_local["data"]["observedTargetIds"] = [1, 2]
        self.assertNotEqual(cortexel.validate_request_partial(forbidden_outside_rank_local), [])

    def test_authority_boundary_rejects_forged_conclusions(self):
        for contract in self._contracts():
            base = contract["examples"]["valid"][0]
            forged = dict(base)
            forged["validation"] = {"structural": {"result": "passed"}}
            codes = [e.code for e in cortexel.validate_request_partial(forged)]
            self.assertIn("PROVENANCE_CALLER_ASSURANCE_FORBIDDEN", codes, contract["id"])
            break  # one is enough; the rule is source-shape, not per-skill

    def test_materialized_python_integer_outside_portable_range_is_rejected(self):
        contract = next(self._contracts())
        request = json.loads(json.dumps(contract["examples"]["valid"][0]))
        request["unsafeInteger"] = 9007199254740992
        errors = cortexel.validate_request_partial(request)
        self.assertEqual(errors[0].code, "SNAPSHOT_INTEGER_OUT_OF_RANGE")

    def test_materialized_nonfinite_number_is_rejected_at_the_snapshot_stage(self):
        contract = next(self._contracts())
        request = json.loads(json.dumps(contract["examples"]["valid"][0]))
        request["nonfinite"] = float("nan")
        errors = cortexel.validate_request_partial(request)
        self.assertEqual(errors[0].code, "SNAPSHOT_NON_FINITE_NUMBER")

    def test_unit_alias_rejected(self):
        # A structurally-valid request whose only fault is a unit alias.
        contract_path = os.path.join(CONTRACT_SKILLS, "neuro.population_rate.v1.json")
        with open(contract_path, encoding="utf-8") as handle:
            contract = json.load(handle)
        for example in contract["examples"]["invalid"]:
            if example["expectedCode"] == "SCIENCE_UNIT_ALIAS_NOT_CANONICAL":
                codes = [e.code for e in cortexel.validate_request_partial(example["request"])]
                self.assertIn("SCIENCE_UNIT_ALIAS_NOT_CANONICAL", codes)

    def test_response_curve_living_rate_and_basis_failures_are_rejected(self):
        contract = self._response_contract()
        normalization_curve_ids = {
            "wrong_peak_bin_count",
            "gaussian_causal_mislabel",
            "raw_binned_peak_off_count_lattice",
            "aggregate_binned_peak_mean_off_count_lattice",
        }
        event_scope_curve_ids = {
            "missing_sender_universe",
            "single_train_with_sender_universe",
        }
        curve_ids = normalization_curve_ids | event_scope_curve_ids
        found = set()
        for example in contract["examples"]["invalid"]:
            curve_id = example["request"]["parameters"]["curveId"]
            if curve_id not in curve_ids:
                continue
            found.add(curve_id)
            codes = [e.code for e in cortexel.validate_request_partial(example["request"])]
            expected_code = (
                "SCIENCE_EVENT_SCOPE_UNVERIFIABLE"
                if curve_id in event_scope_curve_ids
                else "SCIENCE_NORMALIZATION_UNVERIFIABLE"
            )
            self.assertIn(expected_code, codes, curve_id)
        self.assertEqual(found, curve_ids)

        missing_audit = next(
            example["request"]
            for example in contract["examples"]["invalid"]
            if example["request"]["parameters"]["curveId"] ==
            "raw_binned_peak_missing_count_audit"
        )
        self.assertIn(
            "SCHEMA_REQUIRED_PROPERTY_MISSING",
            [e.code for e in cortexel.validate_request_partial(missing_audit)],
        )

        stimulus_onset_latency = next(
            example["request"]
            for example in contract["examples"]["invalid"]
            if example["request"]["parameters"]["curveId"] ==
            "stimulus_onset_latency_without_typed_coordinate"
        )
        self.assertIn(
            "SCHEMA_ENUM_MISMATCH",
            [e.code for e in cortexel.validate_request_partial(stimulus_onset_latency)],
        )

    def test_response_curve_exact_audit_uses_normalization_specific_divisor(self):
        contract = self._response_contract()
        base = contract["examples"]["valid"][0]

        def case(normalization, value):
            request = json.loads(json.dumps(base))
            response = request["data"]["observations"]["response"]
            request["data"]["eventScope"] = {
                "kind": "pooled_recorded_senders",
                "selectionId": "python_parity_sender_population",
                "eventKind": "spike",
                "eventCompleteness":
                    "complete_for_selection_within_measurement_window",
                "poolingOperator": "superpose_selected_sender_trains",
                "recordedSenderCount": 100,
                "membershipBinding": {"kind": "cardinality_only"},
            }
            response["rateNormalization"] = normalization
            response["audit"]["eventCounts"] = [10] * 6
            response["values"] = [value] * 6
            return request

        total = case("total_event_rate", 10)
        mean = case("mean_rate_per_recorded_sender", 0.1)
        self.assertEqual(cortexel.validate_request_partial(total), [])
        self.assertEqual(cortexel.validate_request_partial(mean), [])
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [e.code for e in cortexel.validate_request_partial(case("total_event_rate", 0.1))],
        )
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [e.code for e in cortexel.validate_request_partial(case("mean_rate_per_recorded_sender", 10))],
        )

    def test_response_curve_measurement_window_requires_time_and_order(self):
        contract = self._response_contract()
        wrong_unit = json.loads(json.dumps(contract["examples"]["valid"][0]))
        wrong_unit["data"]["measurementWindow"]["unit"] = "mV"
        errors = cortexel.validate_request_partial(wrong_unit)
        self.assertIn("SCIENCE_UNIT_DIMENSION_MISMATCH", [e.code for e in errors])
        self.assertIn(
            "/data/measurementWindow/unit",
            [e.instance_path for e in errors],
        )

        inverted = json.loads(json.dumps(contract["examples"]["valid"][0]))
        inverted["data"]["measurementWindow"]["start"] = 1000
        inverted["data"]["measurementWindow"]["stop"] = 0
        errors = cortexel.validate_request_partial(inverted)
        self.assertIn("SCIENCE_WINDOW_INVALID", [e.code for e in errors])
        self.assertIn(
            "/data/measurementWindow/stop",
            [e.instance_path for e in errors],
        )

    def test_response_curve_unit_failures_remain_diagnostics_not_exceptions(self):
        contract = self._response_contract()
        base = contract["examples"]["valid"][0]
        cases = (
            ("measurementWindow", "cortexel:not-a-unit", "SCHEMA_ENUM_MISMATCH"),
            ("measurementWindow", "msec", "SCIENCE_UNIT_ALIAS_NOT_CANONICAL"),
            ("response", "cortexel:not-a-unit", "SCHEMA_ENUM_MISMATCH"),
            ("response", "hz", "SCIENCE_UNIT_ALIAS_NOT_CANONICAL"),
            ("response", "nest:weight", "SCIENCE_UNIT_DIMENSION_MISMATCH"),
        )
        for location, unit, expected_code in cases:
            with self.subTest(location=location, unit=unit):
                request = json.loads(json.dumps(base))
                if location == "measurementWindow":
                    request["data"]["measurementWindow"]["unit"] = unit
                else:
                    request["data"]["observations"]["response"]["unit"] = unit
                errors = cortexel.validate_request_partial(request)
                self.assertIn(expected_code, [error.code for error in errors])

    def test_response_curve_zero_latency_is_the_included_window_start(self):
        contract = self._response_contract()
        zero = json.loads(json.dumps(contract["examples"]["valid"][3]))
        values = zero["data"]["observations"]["response"]["values"]
        index = next(i for i, value in enumerate(values) if value is not None)
        values[index] = 0
        self.assertEqual(cortexel.validate_request_partial(zero), [])

        negative = json.loads(json.dumps(zero))
        negative["data"]["observations"]["response"]["values"][index] = -1
        errors = cortexel.validate_request_partial(negative)
        self.assertIn("SCIENCE_RESPONSE_VALUE_INVALID", [e.code for e in errors])

        living_negative = next(
            example["request"]
            for example in contract["examples"]["invalid"]
            if example["request"]["parameters"]["curveId"] ==
            "negative_latency_before_window_start"
        )
        errors = cortexel.validate_request_partial(living_negative)
        self.assertIn("SCIENCE_RESPONSE_VALUE_INVALID", [e.code for e in errors])

    def test_response_curve_baseline_domains_are_checked_before_peak_refinements(self):
        contract = self._response_contract()

        negative_peak = json.loads(json.dumps(contract["examples"]["valid"][4]))
        negative_peak["data"]["aggregates"]["response"]["values"][0] = -1
        errors = cortexel.validate_request_partial(negative_peak)
        self.assertIn("SCIENCE_RESPONSE_VALUE_INVALID", [e.code for e in errors])
        self.assertIn(
            "/data/aggregates/response/values/0",
            [e.instance_path for e in errors],
        )

        fractional_raw_count = json.loads(json.dumps(contract["examples"]["valid"][0]))
        fractional_raw_count["data"]["observations"]["response"] = {
            "method": "event_count",
            "kind": "count",
            "unit": "1",
            "values": [0.5, 0, 12, 14, 31, 29],
        }
        fractional_raw_count["parameters"]["responseMethod"] = "event_count"
        errors = cortexel.validate_request_partial(fractional_raw_count)
        self.assertIn("SCIENCE_COUNT_NOT_INTEGER", [e.code for e in errors])

    def test_binned_peak_count_lattice_is_exact_across_estimators_units_and_boundary(self):
        cases = [
            # Mean of three max-bin counts with integer total 12, 100 ms bins.
            (40.0, 1, 3, 100.0, "ms", "Hz", True),
            (40.1, 1, 3, 100.0, "ms", "Hz", False),
            # Odd median stays on the raw integer-count lattice.
            (40.0, 1, 1, 100.0, "ms", "Hz", True),
            (45.0, 1, 1, 100.0, "ms", "Hz", False),
            # Even median is the mean of two central integer counts.
            (45.0, 1, 2, 100.0, "ms", "Hz", True),
            (42.0, 1, 2, 100.0, "ms", "Hz", False),
            # One max-bin event, divided by five senders, expressed in kHz.
            (0.002, 5, 1, 100.0, "ms", "kHz", True),
            (0.003, 5, 1, 100.0, "ms", "kHz", False),
        ]
        for value, divisor, denominator, duration, time_unit, rate_unit, expected in cases:
            self.assertEqual(
                _is_rounded_aggregate_count_rate_in_unit(
                    value, divisor, denominator, duration, time_unit, rate_unit
                ),
                expected,
                (value, divisor, denominator, duration, time_unit, rate_unit),
            )

        # For an even median at the safe-count ceiling, round(MAX_SAFE / 3) lies
        # one aggregate-count unit above the admissible inverse domain. The boundary
        # total itself is nevertheless valid and must be tested explicitly.
        boundary_rate = float(Fraction(2**53 - 1, 3))
        self.assertTrue(
            _is_rounded_aggregate_count_rate_in_unit(
                boundary_rate, 1, 2, 3.0, "s", "Hz"
            )
        )

    def test_response_curve_binned_peak_values_are_bound_to_the_count_lattice(self):
        contract = self._response_contract()
        base = contract["examples"]["valid"][6]

        off_lattice = json.loads(json.dumps(base))
        off_lattice["data"]["aggregates"]["response"]["values"][0] = 40.1
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [e.code for e in cortexel.validate_request_partial(off_lattice)],
        )

        contradictory_null_mask = json.loads(json.dumps(base))
        contradictory_null_mask["data"]["aggregates"]["response"]["values"][0] = None
        errors = cortexel.validate_request_partial(contradictory_null_mask)
        self.assertIn("SCIENCE_NORMALIZATION_UNVERIFIABLE", [e.code for e in errors])
        self.assertIn(
            "/data/aggregates/sampleCounts/0",
            [e.instance_path for e in errors],
        )

        even_median = json.loads(json.dumps(base))
        even_median["parameters"]["estimator"] = "median"
        even_median["data"]["aggregates"]["sampleCounts"] = [4, 4]
        even_median["data"]["aggregates"]["response"]["values"] = [45, 85]
        self.assertEqual(cortexel.validate_request_partial(even_median), [])
        even_median["data"]["aggregates"]["response"]["values"][0] = 42
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [e.code for e in cortexel.validate_request_partial(even_median)],
        )

        converted = json.loads(json.dumps(base))
        response = converted["data"]["aggregates"]["response"]
        response["rateNormalization"] = "mean_rate_per_recorded_sender"
        response["unit"] = "kHz"
        response["values"] = [0.008, 0.016]
        self.assertEqual(cortexel.validate_request_partial(converted), [])
        response["values"][0] = 0.0081
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [e.code for e in cortexel.validate_request_partial(converted)],
        )

    def test_response_curve_binned_peak_requires_exact_uniform_physical_exposure(self):
        contract = self._response_contract()
        exact_ms = json.loads(json.dumps(contract["examples"]["valid"][6]))
        self.assertEqual(cortexel.validate_request_partial(exact_ms), [])

        def with_geometry(stop, window_unit, width, width_unit, count):
            request = json.loads(json.dumps(exact_ms))
            request["data"]["measurementWindow"] = {
                "start": 0,
                "stop": stop,
                "unit": window_unit,
                "boundary": "[start,stop)",
            }
            basis = request["data"]["aggregates"]["response"]["basis"]
            basis["binWidth"] = {
                "kind": "duration",
                "unit": width_unit,
                "value": width,
            }
            basis["binCount"] = count
            return request

        for request in (
            with_geometry(0.3, "s", 0.1, "s", 3),
            with_geometry(1 + 8 * sys.float_info.epsilon, "s", 1, "s", 1),
            with_geometry(0.3, "s", 100, "ms", 3),
        ):
            with self.subTest(window=request["data"]["measurementWindow"]):
                errors = cortexel.validate_request_partial(request)
                self.assertIn("SCIENCE_NORMALIZATION_UNVERIFIABLE", [e.code for e in errors])
                self.assertIn(
                    "/data/aggregates/response/basis/binWidth",
                    [e.instance_path for e in errors],
                )

    def test_raw_binned_peak_audit_binds_counts_rates_masks_and_count_level_mean(self):
        contract = self._response_contract()
        base = contract["examples"]["valid"][7]
        self.assertEqual(cortexel.validate_request_partial(base), [])

        response = base["data"]["observations"]["response"]
        errors = []
        estimates = _validate_response_raw_binned_peak_audit(
            base,
            base["data"]["observations"],
            response,
            "/data/observations/response",
            1,
            errors,
        )
        self.assertEqual(errors, [])
        direct = _derive_exact_aggregate_count_rate_in_unit(
            2, 1, 3, 100, "ms", "Hz"
        )
        self.assertEqual(estimates, {"drive": direct})

        wrong_rate = json.loads(json.dumps(base))
        wrong_rate["data"]["observations"]["response"]["values"][0] = 20
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [e.code for e in cortexel.validate_request_partial(wrong_rate)],
        )

        wrong_count = json.loads(json.dumps(base))
        wrong_count["data"]["observations"]["response"]["audit"]["peakBinCounts"][0] = 2
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [e.code for e in cortexel.validate_request_partial(wrong_count)],
        )

        wrong_mask = json.loads(json.dumps(base))
        wrong_mask["data"]["observations"]["response"]["audit"]["peakBinCounts"][0] = None
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [e.code for e in cortexel.validate_request_partial(wrong_mask)],
        )

        unsafe = json.loads(json.dumps(base))
        unsafe["data"]["observations"]["response"]["audit"]["peakBinCounts"][0] = (
            1 << 53
        )
        self.assertIn(
            "SNAPSHOT_INTEGER_OUT_OF_RANGE",
            [e.code for e in cortexel.validate_request_partial(unsafe)],
        )

    def test_raw_response_repeat_arrays_and_attempt_universe_fail_closed(self):
        contract = self._response_contract()
        base = contract["examples"]["valid"][7]

        shortened_identities = json.loads(json.dumps(base))
        observations = shortened_identities["data"]["observations"]
        observations["conditionIds"] = observations["conditionIds"][:1]
        observations["repeatIds"] = observations["repeatIds"][:1]
        errors = cortexel.validate_request_partial(shortened_identities)
        self.assertIn("SEMANTIC_LENGTH_MISMATCH", [error.code for error in errors])
        self.assertIn(
            "/data/observations/response/values",
            [error.instance_path for error in errors],
        )

        wrong_attempt_count = json.loads(json.dumps(base))
        wrong_attempt_count["data"]["observations"]["attemptedCounts"] = [2]
        errors = cortexel.validate_request_partial(wrong_attempt_count)
        self.assertIn(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            [error.code for error in errors],
        )
        self.assertIn(
            "/data/observations/attemptedCounts/0",
            [error.instance_path for error in errors],
        )

    def test_raw_binned_count_level_median_and_trimmed_mean(self):
        contract = self._response_contract()
        request = json.loads(json.dumps(contract["examples"]["valid"][7]))
        request["data"]["measurementWindow"]["stop"] = 0.5
        observations = request["data"]["observations"]
        observations["attemptedCounts"] = [5]
        observations["conditionIds"] = ["drive"] * 5
        observations["repeatIds"] = ["r1", "r2", "r3", "r4", "r5"]
        response = observations["response"]
        response["basis"]["binCount"] = 5
        response["audit"]["peakBinCounts"] = [0, 1, 2, 100, 101]
        response["values"] = [0, 10, 20, 1000, 1010]

        request["parameters"]["estimator"] = "median"
        errors = []
        median = _validate_response_raw_binned_peak_audit(
            request,
            observations,
            response,
            "/data/observations/response",
            1,
            errors,
        )
        self.assertEqual(errors, [])
        self.assertEqual(
            median,
            {"drive": _derive_exact_aggregate_count_rate_in_unit(
                2, 1, 1, 0.1, "s", "Hz"
            )},
        )

        request["parameters"]["estimator"] = "trimmed_mean"
        request["parameters"]["trimFraction"] = 0.2
        errors = []
        trimmed = _validate_response_raw_binned_peak_audit(
            request,
            observations,
            response,
            "/data/observations/response",
            1,
            errors,
        )
        self.assertEqual(errors, [])
        self.assertEqual(
            trimmed,
            {"drive": _derive_exact_aggregate_count_rate_in_unit(
                103, 1, 3, 0.1, "s", "Hz"
            )},
        )


if __name__ == "__main__":
    unittest.main()
