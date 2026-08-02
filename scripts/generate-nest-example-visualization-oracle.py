#!/usr/bin/env python3
"""Build the differential source oracle for NEST example coverage V3.

The oracle is intentionally implemented with only the Python standard library.  It
parses source but never imports or executes NEST, Matplotlib, NumPy, or an upstream
example. Generation requires the 112 selected V2 source leaves and two reviewed
helpers at their exact pinned bytes; offline checking can revalidate a retained
oracle's canonical bytes and domain-separated digest. Uncorrected V2 taxonomy is
inherited, not independently reclassified.

``--check`` without ``--source-root`` proves only retained canonical-byte and
digest self-consistency. Full differential derivation requires ``--source-root``.
"""

from __future__ import annotations

import argparse
import ast
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import stat
import sys
from typing import Any, Iterable, Mapping, Sequence


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
SOURCE_INVENTORY_PATH = REPOSITORY_ROOT / "docs/audit/nest-example-source-inventory.v2.json"
PREDECESSOR_COVERAGE_PATH = REPOSITORY_ROOT / "docs/audit/nest-example-coverage.v2.json"
ORACLE_IDENTITY = "cortexel-nest-example-visualization-oracle.semantic.rfc8785-sha256.v1"
ORACLE_DIGEST_DOMAIN = (ORACLE_IDENTITY + "\0").encode("utf-8")
PINNED_COMMIT = "acca9704da248750219a027db99fec6cd1f9052a"
PINNED_SOURCE_INVENTORY_DIGEST = (
    "sha256:1f039d9b4616ffa2de0c2acb6ca4ef9eaf473185b044a66bd8e6bbea27b1d216"
)
PINNED_SOURCE_INVENTORY_ARTIFACT_SHA256 = (
    "sha256:a8a7da4c62170a5405da3662dbef2602891c87cadbadd7f897196be6966928cd"
)
PINNED_SOURCE_INVENTORY_ARTIFACT_BYTE_LENGTH = 228_211
SOURCE_INVENTORY_IDENTITY = "cortexel-nest-example-source-inventory.rfc8785-sha256.v2"
PINNED_PREDECESSOR_SEMANTIC_DIGEST = (
    "sha256:de833e119cadc2ed5032b4c798be1486c7ac2bd3e3125925c056036af890749c"
)
PINNED_PREDECESSOR_ARTIFACT_SHA256 = (
    "sha256:f640d39b8394ec108065092c5e95c9692d5fcd07ec1f91fb5cb3870b518fc535"
)
PINNED_PREDECESSOR_SCHEMA_SHA256 = (
    "sha256:e62b5bab159dcc5922e325e931a2845dff39da52bfeb6dca78f12460f9d06f4a"
)
PINNED_PREDECESSOR_IMPLEMENTATION_SHA256 = (
    "sha256:4baf15ca72bdb14bf69c8f714af8a4b2d978d7b8f7fefef5b0bdf1d9b4405a68"
)
PINNED_PREDECESSOR_GENERATOR_SHA256 = (
    "sha256:229674bb397d0160d147271b34ac6d7015f48b41231c94beea8cb20ef5f3f1b6"
)

HELPER_AUTHORITIES = (
    (
        "pynest/nest/raster_plot.py",
        "sha256:8d006c7b001fd576b86d1186a47488e022928cf9608fbb22ed5344bb3a4659fc",
    ),
    (
        "pynest/nest/lib/hl_api_spatial.py",
        "sha256:e77aadebb342c0f261a7c63ac8964aba0f0388771d8605d599cee0f1e9b7d1f7",
    ),
)

RASTER_RATE_DEMAND = "active_sender_normalized_rate"
SPATIAL_NEIGHBORHOOD_DEMAND = "spatial_neighborhood_membership_2d"
SPATIAL_NODE_MAP_DEMAND = "spatial_node_map_2d"
SPATIAL_PROBABILITY_DEMAND = "spatial_probability_field_2d"
TRAJECTORY_DEMAND = "trajectory_2d"


class OracleError(RuntimeError):
    """A closed source-oracle precondition failed."""


def _bounded_error(error: BaseException, maximum: int = 240) -> str:
    rendered = str(error).replace("\n", " ")
    return rendered if len(rendered) <= maximum else rendered[: maximum - 1] + "…"


def _load_json(path: Path) -> dict[str, Any]:
    raw = _read_stable_regular_file(path, f"strict JSON {path}", 4 * 1024 * 1024)
    try:
        value = json.loads(raw, object_pairs_hook=_reject_duplicates)
    except (UnicodeError, ValueError) as error:
        raise OracleError(f"cannot read strict JSON {path}: {_bounded_error(error)}") from error
    if not isinstance(value, dict):
        raise OracleError(f"strict JSON {path} root is not an object")
    return value


def _reject_duplicates(pairs: Sequence[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON member: {key}")
        result[key] = value
    return result


def _assert_canonical_domain(value: Any, path: str = "$root") -> None:
    if value is None or isinstance(value, (bool, int, str)):
        return
    if isinstance(value, float):
        raise OracleError(f"{path}: floats are outside this oracle canonicalization profile")
    if isinstance(value, list):
        for index, child in enumerate(value):
            _assert_canonical_domain(child, f"{path}[{index}]")
        return
    if isinstance(value, dict):
        for key, child in value.items():
            if not isinstance(key, str) or not key.isascii():
                raise OracleError(f"{path}: oracle object keys must be ASCII strings")
            _assert_canonical_domain(child, f"{path}.{key}")
        return
    raise OracleError(f"{path}: unsupported canonical value type {type(value).__name__}")


def _canonical_bytes(value: Any) -> bytes:
    _assert_canonical_domain(value)
    return json.dumps(
        value,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def _sha256_bytes(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


def _same_file_authority(left: os.stat_result, right: os.stat_result) -> bool:
    return all(
        getattr(left, member) == getattr(right, member)
        for member in (
            "st_dev",
            "st_ino",
            "st_mode",
            "st_nlink",
            "st_uid",
            "st_gid",
            "st_size",
            "st_mtime_ns",
            "st_ctime_ns",
        )
    )


def _same_directory_identity(left: os.stat_result, right: os.stat_result) -> bool:
    return all(
        getattr(left, member) == getattr(right, member)
        for member in ("st_dev", "st_ino", "st_mode", "st_uid", "st_gid")
    )


def _read_stable_regular_file(path: Path, label: str, maximum_bytes: int) -> bytes:
    """Read one bounded direct regular file through a stable descriptor."""

    try:
        before = path.lstat()
    except OSError as error:
        raise OracleError(f"cannot inspect {label}: {_bounded_error(error)}") from error
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        raise OracleError(f"{label} is not a direct regular file")
    if before.st_nlink != 1:
        raise OracleError(f"{label} must have exactly one hard link")
    if before.st_size < 0 or before.st_size > maximum_bytes:
        raise OracleError(f"{label} exceeds its {maximum_bytes}-byte bound")

    flags = os.O_RDONLY | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_NOFOLLOW", 0)
    descriptor = -1
    try:
        descriptor = os.open(path, flags)
        opened = os.fstat(descriptor)
        if not stat.S_ISREG(opened.st_mode) or not _same_file_authority(before, opened):
            raise OracleError(f"{label} identity changed before its descriptor was inspected")
        chunks: list[bytes] = []
        remaining = opened.st_size
        while remaining:
            chunk = os.read(descriptor, min(remaining, 1024 * 1024))
            if not chunk:
                raise OracleError(f"{label} ended before its reviewed size")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(descriptor, 1):
            raise OracleError(f"{label} grew beyond its reviewed size")
        after_descriptor = os.fstat(descriptor)
        after_path = path.lstat()
        if (
            not _same_file_authority(opened, after_descriptor)
            or not _same_file_authority(opened, after_path)
        ):
            raise OracleError(f"{label} identity changed while it was read")
        return b"".join(chunks)
    except OSError as error:
        raise OracleError(f"cannot read {label}: {_bounded_error(error)}") from error
    finally:
        if descriptor >= 0:
            os.close(descriptor)


def _semantic_digest(value: Mapping[str, Any]) -> str:
    preimage = dict(value)
    preimage.pop("semanticBinding", None)
    return _sha256_bytes(ORACLE_DIGEST_DOMAIN + _canonical_bytes(preimage))


def _load_pinned_source_inventory() -> dict[str, Any]:
    raw = _read_stable_regular_file(
        SOURCE_INVENTORY_PATH,
        "source inventory",
        1_000_000,
    )
    if len(raw) != PINNED_SOURCE_INVENTORY_ARTIFACT_BYTE_LENGTH:
        raise OracleError("source inventory artifact byte length drifted")
    if _sha256_bytes(raw) != PINNED_SOURCE_INVENTORY_ARTIFACT_SHA256:
        raise OracleError("source inventory artifact SHA-256 drifted")
    try:
        inventory = json.loads(raw, object_pairs_hook=_reject_duplicates)
    except (UnicodeError, ValueError) as error:
        raise OracleError(f"source inventory strict JSON failed: {_bounded_error(error)}") from error
    if not isinstance(inventory, dict):
        raise OracleError("source inventory root is not an object")
    if raw != _canonical_bytes(inventory):
        raise OracleError("source inventory bytes are not exact canonical JSON")
    core = dict(inventory)
    claimed = core.pop("inventoryDigest", None)
    recomputed = _sha256_bytes(
        _canonical_bytes({"domain": SOURCE_INVENTORY_IDENTITY, "inventory": core})
    )
    if claimed != recomputed or recomputed != PINNED_SOURCE_INVENTORY_DIGEST:
        raise OracleError("source inventory digest does not bind its complete semantic projection")
    return inventory


def _projection_digest(path: str, projection: Mapping[str, Any]) -> str:
    domain = b"cortexel-nest-example-visualization-projection.rfc8785-sha256.v1\0"
    return _sha256_bytes(domain + _canonical_bytes({"path": path, **projection}))


def _attribute_name(node: ast.AST) -> str | None:
    members: list[str] = []
    current = node
    while isinstance(current, ast.Attribute):
        members.append(current.attr)
        current = current.value
    if isinstance(current, ast.Name):
        members.append(current.id)
        return ".".join(reversed(members))
    return None


def _literal(node: ast.AST) -> Any:
    try:
        return ast.literal_eval(node)
    except (ValueError, TypeError, MemoryError, RecursionError):
        return None


def _calls(tree: ast.AST) -> list[ast.Call]:
    return [node for node in ast.walk(tree) if isinstance(node, ast.Call)]


def _call_name(call: ast.Call) -> str | None:
    return _attribute_name(call.func)


def _call_attribute(call: ast.Call) -> str | None:
    return call.func.attr if isinstance(call.func, ast.Attribute) else None


def _calls_ending(tree: ast.AST, suffix: str) -> list[ast.Call]:
    return [call for call in _calls(tree) if (_call_name(call) or "").endswith(suffix)]


def _keyword(call: ast.Call, name: str) -> ast.AST | None:
    matches = [keyword.value for keyword in call.keywords if keyword.arg == name]
    if len(matches) > 1:
        raise OracleError(f"line {call.lineno}: duplicate {name} keyword in parsed AST")
    return matches[0] if matches else None


def _function(tree: ast.AST, name: str) -> ast.FunctionDef:
    matches = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef) and node.name == name
    ]
    if len(matches) != 1:
        raise OracleError(f"helper function {name!r} did not resolve exactly once")
    return matches[0]


def _same_expression(actual: ast.AST, expected_source: str) -> bool:
    expected = ast.parse(expected_source, mode="eval").body
    return ast.dump(actual, include_attributes=False) == ast.dump(expected, include_attributes=False)


def _same_assignment_target(actual: ast.AST, expected_source: str) -> bool:
    normalized = copy.deepcopy(actual)
    for node in ast.walk(normalized):
        if hasattr(node, "ctx"):
            node.ctx = ast.Load()
    return _same_expression(normalized, expected_source)


def _unpack_write_target(target: ast.AST) -> list[ast.AST]:
    if isinstance(target, (ast.Tuple, ast.List)):
        return [leaf for member in target.elts for leaf in _unpack_write_target(member)]
    if isinstance(target, ast.Starred):
        return _unpack_write_target(target.value)
    return [target]


def _write_targets(node: ast.AST) -> list[ast.AST]:
    """Return leaf targets for explicit assignment-like AST bindings."""

    targets: list[ast.AST]
    if isinstance(node, ast.Assign):
        targets = list(node.targets)
    elif isinstance(node, (ast.AnnAssign, ast.AugAssign, ast.NamedExpr)):
        targets = [node.target]
    elif isinstance(node, ast.Delete):
        targets = list(node.targets)
    elif isinstance(node, (ast.For, ast.AsyncFor, ast.comprehension)):
        targets = [node.target]
    elif isinstance(node, ast.withitem) and node.optional_vars is not None:
        targets = [node.optional_vars]
    else:
        return []
    return [leaf for target in targets for leaf in _unpack_write_target(target)]


def _target_prefixes(target: ast.AST) -> list[ast.AST]:
    prefixes: list[ast.AST] = []
    current = target
    while True:
        prefixes.append(current)
        if isinstance(current, (ast.Attribute, ast.Subscript)):
            current = current.value
            continue
        return prefixes


def _write_nodes(
    tree: ast.AST,
    target_source: str,
    *,
    include_descendants: bool = False,
) -> list[ast.AST]:
    """Find explicit writes to one target, optionally including its descendants."""

    return [
        node
        for node in ast.walk(tree)
        if any(
            any(
                _same_assignment_target(prefix, target_source)
                for prefix in (
                    _target_prefixes(target) if include_descendants else [target]
                )
            )
            for target in _write_targets(node)
        )
    ]


def _assignment_value(node: ast.AST) -> ast.AST | None:
    if isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign, ast.NamedExpr)):
        return node.value
    return None


def _explicit_name_alias_writes(tree: ast.AST, source_name: str) -> list[ast.AST]:
    """Find explicit name bindings whose value contains a load of ``source_name``."""

    result: list[ast.AST] = []
    for node in ast.walk(tree):
        value = _assignment_value(node)
        if value is None or not any(
            isinstance(child, ast.Name)
            and isinstance(child.ctx, ast.Load)
            and child.id == source_name
            for child in ast.walk(value)
        ):
            continue
        if any(
            isinstance(target, ast.Name) and target.id != source_name
            for target in _write_targets(node)
        ):
            result.append(node)
    return result


def _finite_positive_number_literal(node: ast.AST) -> bool:
    value = _literal(node)
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value > 0
    )


def _raster_call_profile(path: str, call: ast.Call) -> dict[str, Any]:
    if any(keyword.arg is None for keyword in call.keywords):
        raise OracleError(f"{path}: raster helper call has an unreviewable **kwargs expansion")
    histogram = _keyword(call, "hist")
    if histogram is not None and _literal(histogram) is not True:
        raise OracleError(f"{path}: raster helper histogram branch is not enabled")
    bin_width = _keyword(call, "hist_binwidth")
    if bin_width is not None and not _finite_positive_number_literal(bin_width):
        raise OracleError(f"{path}: raster helper histogram bin width is not finite and positive")
    return {
        "lineAnchor": call.lineno,
        "histogramArgument": "helper_default_true" if histogram is None else "literal_true",
        "histogramBinWidthMsLiteralValue": (
            "helper_default_5.0" if bin_width is None else repr(_literal(bin_width))
        ),
    }


def _source_bytes(root: Path, relative: str, *, symlink_literal: bool = False) -> bytes:
    path = root / relative
    try:
        info = path.lstat()
    except OSError as error:
        raise OracleError(f"missing pinned source {relative}: {error}") from error
    if symlink_literal:
        if not stat.S_ISLNK(info.st_mode) or info.st_nlink != 1:
            raise OracleError(f"{relative}: expected a symlink source leaf")
        target = os.readlink(path)
        after = path.lstat()
        if not _same_file_authority(info, after):
            raise OracleError(f"{relative}: symlink identity changed while it was read")
        return os.fsencode(target)
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode):
        raise OracleError(f"{relative}: expected a direct regular file")
    return _read_stable_regular_file(path, f"pinned source {relative}", 16 * 1024 * 1024)


def _reviewed_generator_source_authority() -> dict[str, Any]:
    generator_path = Path(__file__).absolute()
    source = _read_stable_regular_file(
        generator_path,
        "oracle generator authority",
        1_000_000,
    )
    return {
        "path": "scripts/generate-nest-example-visualization-oracle.py",
        "sha256": _sha256_bytes(source),
        "byteLength": len(source),
        "profile": "python_stdlib_ast_differential_reviewed_source.v1",
        "executionBinding": "not_established_path_bytes_read_after_interpreter_start",
    }


def _parse_python(relative: str, source: bytes) -> ast.Module:
    try:
        return ast.parse(source, filename=relative, mode="exec", type_comments=True)
    except (SyntaxError, ValueError) as error:
        raise OracleError(f"{relative}: pinned source does not parse: {error}") from error


def _verify_predecessor_authority(predecessor: Mapping[str, Any]) -> None:
    if predecessor.get("protocolVersion") != 2:
        raise OracleError("predecessor visualization coverage is not V2")
    binding = predecessor.get("semanticBinding")
    if not isinstance(binding, dict) or binding.get("semanticDigest") != PINNED_PREDECESSOR_SEMANTIC_DIGEST:
        raise OracleError("predecessor visualization semantic digest drifted")
    exact_files = (
        (PREDECESSOR_COVERAGE_PATH, PINNED_PREDECESSOR_ARTIFACT_SHA256),
        (
            REPOSITORY_ROOT / "docs/audit/nest-example-coverage.v2.schema.json",
            PINNED_PREDECESSOR_SCHEMA_SHA256,
        ),
        (
            REPOSITORY_ROOT / "scripts/lib/nest-example-visualization-coverage.ts",
            PINNED_PREDECESSOR_IMPLEMENTATION_SHA256,
        ),
        (
            REPOSITORY_ROOT / "scripts/generate-nest-example-visualization-coverage.ts",
            PINNED_PREDECESSOR_GENERATOR_SHA256,
        ),
    )
    for path, expected in exact_files:
        raw = _read_stable_regular_file(
            path,
            f"immutable predecessor authority {path.relative_to(REPOSITORY_ROOT)}",
            4 * 1024 * 1024,
        )
        actual = _sha256_bytes(raw)
        if actual != expected:
            raise OracleError(f"immutable predecessor authority drifted: {path.relative_to(REPOSITORY_ROOT)}")


def _verify_inventory_and_parse(
    source_root: Path,
    inventory: Mapping[str, Any],
) -> tuple[dict[str, ast.Module], list[dict[str, Any]]]:
    upstream = inventory.get("upstream")
    if not isinstance(upstream, dict) or upstream.get("commit") != PINNED_COMMIT:
        raise OracleError("source inventory does not bind the pinned NEST commit")
    if inventory.get("inventoryDigest") != PINNED_SOURCE_INVENTORY_DIGEST:
        raise OracleError("source inventory semantic digest drifted")
    source_paths = inventory.get("sourcePaths")
    if not isinstance(source_paths, list) or len(source_paths) != 112:
        raise OracleError("source inventory must contain exactly 112 Python source leaves")

    trees: dict[str, ast.Module] = {}
    verified: list[dict[str, Any]] = []
    seen: set[str] = set()
    for record in source_paths:
        if not isinstance(record, dict):
            raise OracleError("source inventory row is not an object")
        relative = record.get("path")
        kind = record.get("kind")
        expected = record.get("sha256")
        if not isinstance(relative, str) or relative in seen:
            raise OracleError("source inventory paths are missing or duplicated")
        if kind not in {"regular_python", "python_symlink"}:
            raise OracleError(f"{relative}: unsupported source kind {kind!r}")
        if not isinstance(expected, str):
            raise OracleError(f"{relative}: source digest is absent")
        seen.add(relative)
        source = _source_bytes(source_root, relative, symlink_literal=kind == "python_symlink")
        actual = _sha256_bytes(source)
        if actual != expected:
            raise OracleError(f"{relative}: source SHA-256 differs from the V2 inventory")
        if len(source) != record.get("byteLength"):
            raise OracleError(f"{relative}: source byte length differs from the V2 inventory")
        verified.append({"path": relative, "kind": kind, "sha256": actual})
        if kind == "regular_python":
            trees[relative] = _parse_python(relative, source)

    if len(trees) != 109 or len(verified) != 112:
        raise OracleError("verified source partition did not reconcile to 109 regular plus 3 aliases")
    return trees, verified


def _verify_helper_semantics(source_root: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    helper_trees: dict[str, ast.Module] = {}
    for relative, expected in HELPER_AUTHORITIES:
        source = _source_bytes(source_root, relative)
        actual = _sha256_bytes(source)
        if actual != expected:
            raise OracleError(f"{relative}: helper SHA-256 drifted")
        helper_trees[relative] = _parse_python(relative, source)
        records.append({"path": relative, "sha256": actual, "byteLength": len(source)})

    raster_tree = helper_trees[HELPER_AUTHORITIES[0][0]]
    make_plot = _function(raster_tree, "_make_plot")
    positional = [*make_plot.args.posonlyargs, *make_plot.args.args]
    default_offset = len(positional) - len(make_plot.args.defaults)
    defaults = {
        argument.arg: _literal(default)
        for argument, default in zip(positional[default_offset:], make_plot.args.defaults)
    }
    if defaults.get("hist") is not True or defaults.get("hist_binwidth") != 5.0:
        raise OracleError("raster helper no longer defaults to a 5 ms histogram")
    denominator_assignments = [
        node
        for node in ast.walk(make_plot)
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "num_neurons" for target in node.targets)
    ]
    if (
        len(denominator_assignments) != 1
        or not _same_expression(denominator_assignments[0].value, "len(numpy.unique(neurons))")
    ):
        raise OracleError("raster helper active-sender denominator expression drifted")
    height_assignments = [
        node
        for node in ast.walk(make_plot)
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "heights" for target in node.targets)
    ]
    if (
        len(height_assignments) != 1
        or not _same_expression(
            height_assignments[0].value,
            "1000 * n / (hist_binwidth * num_neurons)",
        )
    ):
        raise OracleError("raster helper active-sender rate expression drifted")

    spatial_tree = helper_trees[HELPER_AUTHORITIES[1][0]]
    public_spatial_helpers: dict[str, ast.FunctionDef] = {}
    for name in ("PlotLayer", "PlotTargets", "PlotSources"):
        function = _function(spatial_tree, name)
        public_spatial_helpers[name] = function
        call_names = {_call_name(call) or "" for call in _calls(function)}
        if not any(call_name.endswith(".scatter") for call_name in call_names):
            raise OracleError(f"{name}: expected point-membership scatter is absent")
        if name != "PlotLayer" and any(
            call_name.endswith((".plot", ".plot3D")) for call_name in call_names
        ):
            raise OracleError(f"{name}: unexpected endpoint-connecting line operation")
    probability = _function(spatial_tree, "PlotProbabilityParameter")
    probability_calls = _calls(probability)
    probability_names = {_call_name(call) or "" for call in probability_calls}
    image_calls = [
        call for call in probability_calls if (_call_name(call) or "").endswith(".imshow")
    ]
    if len(image_calls) != 1 or not image_calls[0].args:
        raise OracleError("PlotProbabilityParameter no longer emits a probability image field")
    if not _same_expression(image_calls[0].args[0], "np.minimum(np.maximum(z, 0.0), 1.0)"):
        raise OracleError("PlotProbabilityParameter probability clamp is not exactly [0, 1]")
    if not any(name.endswith("_create_mask_patches") for name in probability_names):
        raise OracleError("PlotProbabilityParameter no longer emits supplied mask geometry")
    draw_extent = _function(spatial_tree, "_draw_extent")
    extent_set_calls = [
        call for call in _calls(draw_extent) if (_call_name(call) or "").endswith(".set")
    ]
    if len(extent_set_calls) != 1:
        raise OracleError("spatial helper extent-axis configuration is absent or ambiguous")
    aspect = _keyword(extent_set_calls[0], "aspect")
    if aspect is None or _literal(aspect) != "equal":
        raise OracleError("spatial helper no longer fixes equal x/y aspect")
    for name, function in public_spatial_helpers.items():
        extent_calls = [
            call
            for call in _calls(function)
            if (_call_name(call) or "").endswith("_draw_extent")
        ]
        if len(extent_calls) != 1:
            raise OracleError(f"{name}: exact 2D equal-aspect _draw_extent call chain drifted")
        two_dimensional_branches = [
            node
            for node in ast.walk(function)
            if isinstance(node, ast.If) and _same_expression(node.test, "len(ext) == 2")
        ]
        if (
            len(two_dimensional_branches) != 1
            or extent_calls[0]
            not in [
                statement.value
                for statement in two_dimensional_branches[0].body
                if isinstance(statement, ast.Expr) and isinstance(statement.value, ast.Call)
            ]
        ):
            raise OracleError(f"{name}: _draw_extent is not confined to the exact 2D branch")

    records[0]["verifiedSemantics"] = {
        "fromDeviceCall": "nest.raster_plot.from_device",
        "histogramDefault": True,
        "histogramBinWidthDefaultMs": 5,
        "rateFormula": "1000 * bin_event_count / (histogram_bin_width_ms * unique_plotted_sender_count)",
        "senderDenominator": "len(numpy.unique(neurons))",
        "senderDenominatorMeaning": "active_senders_present_in_unfiltered_timestamp_carrier",
    }
    records[1]["verifiedSemantics"] = {
        "plotTargets": "point_membership_no_endpoint_lines",
        "plotSources": "point_membership_no_endpoint_lines",
        "probabilityParameter": "bounded_image_field_clamped_to_zero_one",
        "mask": "explicit_patch_geometry_when_supplied",
        "extentAspect": "equal_xy",
        "extentAspectCallChain": "PlotLayer_PlotTargets_PlotSources_to__draw_extent",
    }
    return records


def _projection(row: Mapping[str, Any]) -> dict[str, list[str]]:
    projection: dict[str, list[str]] = {}
    for member in ("semanticDemands", "presentationDemands", "visualOperations"):
        value = row.get(member)
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise OracleError(f"{row.get('path')}: predecessor {member} is not a string array")
        if value != sorted(set(value)):
            raise OracleError(f"{row.get('path')}: predecessor {member} is not sorted and unique")
        projection[member] = list(value)
    return projection


def _verify_hh_response_curve_shape(tree: ast.Module) -> None:
    plot_calls = _calls_ending(tree, ".plot")
    if (
        len(plot_calls) != 1
        or len(plot_calls[0].args) < 2
        or not _same_expression(plot_calls[0].args[0], "amplitudes")
        or not _same_expression(plot_calls[0].args[1], "event_freqs")
    ):
        raise OracleError("hh_psc_alpha response-curve axes drifted")

    amplitude_initializers = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(_same_assignment_target(target, "amplitudes") for target in node.targets)
        and _same_expression(node.value, "np.zeros(n_data)")
    ]
    amplitude_samples = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(_same_assignment_target(target, "amplitudes[i]") for target in node.targets)
        and _same_expression(node.value, "amp")
    ]
    rate_initializers = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(_same_assignment_target(target, "event_freqs") for target in node.targets)
        and _same_expression(node.value, "np.zeros(n_data)")
    ]
    rate_samples = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(_same_assignment_target(target, "event_freqs[i]") for target in node.targets)
        and _same_expression(node.value, "n_events / (simtime / 1000.0)")
    ]
    if not all(
        len(matches) == 1
        for matches in (
            amplitude_initializers,
            amplitude_samples,
            rate_initializers,
            rate_samples,
        )
    ):
        raise OracleError("hh_psc_alpha response-curve carrier derivation drifted")


def _verify_intrinsic_single_panel_dual_axis_shape(tree: ast.Module) -> None:
    figure_assignments = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(_same_assignment_target(target, "fig") for target in node.targets)
        and _same_expression(node.value, "plt.figure()")
    ]
    base_axis_assignments = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(_same_assignment_target(target, "Vax") for target in node.targets)
        and _same_expression(node.value, "fig.add_subplot(111)")
    ]
    twin_axis_assignments = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(_same_assignment_target(target, "Iax") for target in node.targets)
        and _same_expression(node.value, "Vax.twinx()")
    ]
    if not all(
        len(matches) == 1
        for matches in (figure_assignments, base_axis_assignments, twin_axis_assignments)
    ):
        raise OracleError("intrinsic_currents_subthreshold dual-axis derivation drifted")

    panel_calls = [
        call
        for call in _calls(tree)
        if (_call_name(call) or "").endswith(
            (".figure", ".subplots", ".subplot", ".add_subplot", ".add_axes", ".twiny", ".twinx")
        )
    ]
    expected_panel_calls = {
        "plt.figure": 1,
        "fig.add_subplot": 1,
        "Vax.twinx": 1,
    }
    actual_panel_calls: dict[str, int] = {}
    for call in panel_calls:
        name = _call_name(call) or ""
        actual_panel_calls[name] = actual_panel_calls.get(name, 0) + 1
    if actual_panel_calls != expected_panel_calls:
        raise OracleError("intrinsic_currents_subthreshold gained an independent panel or axis")

    voltage_labels = [
        call
        for call in _calls(tree)
        if _call_name(call) == "Vax.set_ylabel"
        and call.args
        and _literal(call.args[0]) == "Voltageinf [mV]"
    ]
    current_labels = [
        call
        for call in _calls(tree)
        if _call_name(call) == "Iax.set_ylabel"
        and call.args
        and _literal(call.args[0]) == "Current [pA]"
    ]
    if len(voltage_labels) != 1 or len(current_labels) != 1:
        raise OracleError("intrinsic_currents_subthreshold physical-axis labels drifted")


def _verify_if_curve_complete_population_shape(tree: ast.Module) -> dict[str, Any]:
    """Bind one conservative straight-line recorder-to-retained-response path."""

    class_matches = [
        node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "IF_curve"
    ]
    if len(class_matches) != 1:
        raise OracleError("if_curve.py does not contain exactly one IF_curve class")
    curve_class = class_matches[0]

    class_neuron_counts = [
        node
        for node in curve_class.body
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "n_neurons" for target in node.targets)
    ]
    if len(class_neuron_counts) != 1 or _literal(class_neuron_counts[0].value) != 100:
        raise OracleError("if_curve.py configured neuron-count authority drifted")
    instance_count_writes = [
        node
        for node in ast.walk(curve_class)
        if isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign))
        and any(
            _same_assignment_target(target, "self.n_neurons")
            for target in (
                node.targets
                if isinstance(node, ast.Assign)
                else [node.target]
            )
        )
    ]
    if instance_count_writes:
        raise OracleError("if_curve.py mutates its configured neuron-count denominator")

    def exact_method(name: str) -> ast.FunctionDef:
        matches = [
            node
            for node in curve_class.body
            if isinstance(node, ast.FunctionDef) and node.name == name
        ]
        if len(matches) != 1:
            raise OracleError(f"if_curve.py {name} method is absent or ambiguous")
        return matches[0]

    build = exact_method("build")
    connect = exact_method("connect")
    output_rate = exact_method("output_rate")
    compute = exact_method("compute_transfer")

    def direct_assignment(
        statements: Sequence[ast.stmt], target_source: str, value_source: str
    ) -> ast.Assign:
        matches = [
            statement
            for statement in statements
            if isinstance(statement, ast.Assign)
            and any(
                _same_assignment_target(target, target_source)
                for target in statement.targets
            )
            and _same_expression(statement.value, value_source)
        ]
        if len(matches) != 1:
            raise OracleError(
                f"if_curve.py direct carrier {target_source} is absent or ambiguous"
            )
        return matches[0]

    def direct_expression_call(
        statements: Sequence[ast.stmt], source: str
    ) -> ast.Call:
        matches = [
            statement.value
            for statement in statements
            if isinstance(statement, ast.Expr)
            and isinstance(statement.value, ast.Call)
            and _same_expression(statement.value, source)
        ]
        if len(matches) != 1:
            raise OracleError(f"if_curve.py direct call {source} is absent or ambiguous")
        return matches[0]

    neuron_create_assignment = direct_assignment(
        build.body,
        "self.neuron",
        "nest.Create(self.model, self.n_neurons, self.params)",
    )
    recorder_create_assignment = direct_assignment(
        build.body,
        "self.spike_recorder",
        'nest.Create("spike_recorder")',
    )
    if _write_nodes(curve_class, "self.neuron", include_descendants=True) != [
        neuron_create_assignment
    ] or _write_nodes(
        curve_class, "self.spike_recorder", include_descendants=True
    ) != [recorder_create_assignment]:
        raise OracleError("if_curve.py complete configured neuron/recorder creation drifted")

    direct_connection_calls = [
        statement.value
        for statement in connect.body
        if isinstance(statement, ast.Expr)
        and isinstance(statement.value, ast.Call)
        and _call_name(statement.value) == "nest.Connect"
    ]
    all_connection_calls = [
        call for call in _calls(connect) if _call_name(call) == "nest.Connect"
    ]
    expected_connections = (
        'nest.Connect(self.noise, self.neuron, "all_to_all")',
        'nest.Connect(self.neuron, self.spike_recorder, "all_to_all")',
    )
    if len(direct_connection_calls) != 2 or all_connection_calls != direct_connection_calls:
        raise OracleError(
            "if_curve.py does not exclusively connect the complete configured population "
            "to its fresh recorder"
        )
    if not all(
        _same_expression(call, expected)
        for call, expected in zip(
            direct_connection_calls, expected_connections, strict=True
        )
    ):
        raise OracleError(
            "if_curve.py does not exclusively connect the complete configured population "
            "to its fresh recorder"
        )
    population_connection = direct_connection_calls[1]

    rebuild_call = direct_expression_call(output_rate.body, "self.build()")
    reconnect_call = direct_expression_call(output_rate.body, "self.connect()")
    simulate_call = direct_expression_call(
        output_rate.body, "nest.Simulate(self.t_sim)"
    )
    for source, direct in (
        ("self.build()", rebuild_call),
        ("self.connect()", reconnect_call),
        ("nest.Simulate(self.t_sim)", simulate_call),
    ):
        if [call for call in _calls(output_rate) if _same_expression(call, source)] != [
            direct
        ]:
            raise OracleError("if_curve.py per-trial complete-population rate path drifted")
    output_rate_assignment = direct_assignment(
        output_rate.body,
        "rate",
        "self.spike_recorder.n_events * 1000.0 / "
        "(1.0 * self.n_neurons * self.t_sim)",
    )
    return_statements = [node for node in ast.walk(output_rate) if isinstance(node, ast.Return)]
    direct_returns = [node for node in output_rate.body if isinstance(node, ast.Return)]
    if (
        _write_nodes(output_rate, "rate") != [output_rate_assignment]
        or len(return_statements) != 1
        or return_statements != direct_returns
        or return_statements[0].value is None
        or not _same_expression(return_statements[0].value, "rate")
    ):
        raise OracleError("if_curve.py per-trial complete-population rate path drifted")
    if not (
        rebuild_call.lineno
        < reconnect_call.lineno
        < simulate_call.lineno
        < output_rate_assignment.lineno
        < return_statements[0].lineno
    ):
        raise OracleError(
            "if_curve.py per-trial build/connect/simulate/rate/return order drifted"
        )

    compute_assignments = [
        direct_assignment(compute.body, target_source, value_source)
        for target_source, value_source in (
            ("self.i_range", "numpy.arange(*i_mean)"),
            ("self.std_range", "numpy.arange(*i_std)"),
            ("self.rate", "numpy.zeros((self.i_range.size, self.std_range.size))"),
        )
    ]
    for target_source, assignment in zip(
        ("self.i_range", "self.std_range"),
        compute_assignments[:2],
        strict=True,
    ):
        if _write_nodes(
            curve_class, target_source, include_descendants=True
        ) != [assignment]:
            raise OracleError(f"if_curve.py computed carrier {target_source} drifted")

    outer_loops = [
        statement
        for statement in compute.body
        if isinstance(statement, ast.For)
        and _same_assignment_target(statement.target, "(n, i)")
        and _same_expression(statement.iter, "enumerate(self.i_range)")
    ]
    if len(outer_loops) != 1:
        raise OracleError("if_curve.py response-surface outer loop drifted")
    outer_loop = outer_loops[0]
    inner_loops = [
        statement
        for statement in outer_loop.body
        if isinstance(statement, ast.For)
        and _same_assignment_target(statement.target, "(m, std)")
        and _same_expression(statement.iter, "enumerate(self.std_range)")
    ]
    if len(inner_loops) != 1:
        raise OracleError("if_curve.py response-surface inner loop drifted")
    inner_loop = inner_loops[0]
    rate_sample_assignment = direct_assignment(
        inner_loop.body, "self.rate[n, m]", "self.output_rate(i, std)"
    )
    if _write_nodes(curve_class, "self.rate", include_descendants=True) != [
        compute_assignments[2],
        rate_sample_assignment,
    ]:
        raise OracleError("if_curve.py computed self.rate carrier writes drifted")
    output_rate_calls = [
        call
        for call in _calls(compute)
        if _call_name(call) == "self.output_rate"
    ]
    if output_rate_calls != [rate_sample_assignment.value]:
        raise OracleError("if_curve.py response-surface sampling path drifted")
    compute_assignments.append(rate_sample_assignment)

    plotting_calls = [
        call
        for call in _calls(tree)
        if (_call_name(call) or "").endswith(
            (".plot", ".scatter", ".bar", ".imshow", ".pcolormesh", ".hist", ".figure", ".subplots")
        )
    ]
    if plotting_calls:
        raise OracleError("if_curve.py unexpectedly gained an active visualization operation")

    transfer_assignment = direct_assignment(
        tree.body, "transfer", "IF_curve(model, params)"
    )
    if _write_nodes(tree, "transfer", include_descendants=True) != [
        transfer_assignment
    ] or _explicit_name_alias_writes(tree, "transfer"):
        raise OracleError("if_curve.py transfer capability is rebound")
    compute_invocation = direct_expression_call(
        tree.body, "transfer.compute_transfer()"
    )
    if [
        call
        for call in _calls(tree)
        if _same_expression(call, "transfer.compute_transfer()")
    ] != [compute_invocation]:
        raise OracleError("if_curve.py computed response invocation is not direct")
    retained_writes = [
        node
        for node in tree.body
        if isinstance(node, ast.With)
        and len(node.items) == 1
        and isinstance(node.items[0].context_expr, ast.Call)
        and _same_expression(
            node.items[0].context_expr, 'shelve.open(model + "_transfer.dat")'
        )
        and node.items[0].optional_vars is not None
        and _same_assignment_target(node.items[0].optional_vars, "dat")
    ]
    if len(retained_writes) != 1:
        raise OracleError("if_curve.py computed response invocation/retained write drifted")
    retained_assignments: list[ast.Assign] = []
    for target_source, value_source in (
        ('dat["I_mean"]', "transfer.i_range"),
        ('dat["I_std"]', "transfer.std_range"),
        ('dat["rate"]', "transfer.rate"),
    ):
        assignment = direct_assignment(
            retained_writes[0].body, target_source, value_source
        )
        if _write_nodes(retained_writes[0], target_source) != [assignment]:
            raise OracleError(f"if_curve.py retained carrier {target_source} drifted")
        retained_assignments.append(assignment)
    if not (
        transfer_assignment.lineno
        < compute_invocation.lineno
        < retained_writes[0].lineno
        < min(node.lineno for node in retained_assignments)
    ):
        raise OracleError("if_curve.py compute-before-publication order drifted")

    anchors = {
        class_neuron_counts[0].lineno,
        neuron_create_assignment.lineno,
        recorder_create_assignment.lineno,
        population_connection.lineno,
        rebuild_call.lineno,
        reconnect_call.lineno,
        simulate_call.lineno,
        output_rate_assignment.lineno,
        return_statements[0].lineno,
        compute.lineno,
        *(node.lineno for node in compute_assignments),
        compute_invocation.lineno,
        retained_writes[0].lineno,
        *(node.lineno for node in retained_assignments),
    }
    return {
        "sourceLineAnchors": sorted(anchors),
        "normalizationFormula": (
            "n_events * 1000.0 / (1.0 * self.n_neurons * self.t_sim)"
        ),
        "populationConnection": "nest.Connect(self.neuron,self.spike_recorder,all_to_all)",
        "trialOrder": "fresh_build_then_connect_then_simulate_then_read_n_events",
    }


def _verify_output_coordinate_trajectory_shape(tree: ast.Module) -> dict[str, Any]:
    """Bind the two e-prop equal-scale paths to readout/target coordinate carriers."""

    output_counts = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(_same_assignment_target(target, "n_out") for target in node.targets)
        and _literal(node.value) == 2
    ]
    expected_carriers = (
        ("readout_signal", 'events_mm_out["readout_signal"]'),
        ("target_signal", 'events_mm_out["target_signal"]'),
        (
            "readout_signal",
            'readout_signal.reshape((n_out, n_iter, batch_size, steps["sequence"]))',
        ),
        (
            "target_signal",
            'target_signal.reshape((n_out, n_iter, batch_size, steps["sequence"]))',
        ),
    )
    carrier_assignments: list[ast.Assign] = []
    for target_source, value_source in expected_carriers:
        matches = [
            node
            for node in ast.walk(tree)
            if isinstance(node, ast.Assign)
            and any(_same_assignment_target(target, target_source) for target in node.targets)
            and _same_expression(node.value, value_source)
        ]
        if len(matches) != 1:
            raise OracleError(f"trajectory coordinate carrier {value_source} drifted")
        carrier_assignments.append(matches[0])

    expected_plots = (
        (
            "readout",
            "readout_signal[0, -1, 0, :]",
            "-readout_signal[1, -1, 0, :]",
        ),
        (
            "target",
            "target_signal[0, -1, 0, :]",
            "-target_signal[1, -1, 0, :]",
        ),
    )
    plot_calls: list[ast.Call] = []
    for label, x_source, y_source in expected_plots:
        matches = [
            call
            for call in _calls(tree)
            if _call_name(call) == "ax.plot"
            and len(call.args) >= 2
            and _same_expression(call.args[0], x_source)
            and _same_expression(call.args[1], y_source)
            and (label_node := _keyword(call, "label")) is not None
            and _literal(label_node) == label
        ]
        if len(matches) != 1:
            raise OracleError(f"trajectory {label} x/y plot carriers drifted")
        plot_calls.append(matches[0])
    equal_axis_calls = [
        call
        for call in _calls(tree)
        if _call_name(call) == "ax.axis"
        and len(call.args) == 1
        and not call.keywords
        and _literal(call.args[0]) == "equal"
    ]
    if len(output_counts) != 1 or len(equal_axis_calls) != 1:
        raise OracleError("trajectory output dimension/equal-axis authority drifted")
    if max(node.lineno for node in carrier_assignments) >= min(call.lineno for call in plot_calls):
        raise OracleError("trajectory carrier materialization does not precede its plots")
    if max(call.lineno for call in plot_calls) >= equal_axis_calls[0].lineno:
        raise OracleError("trajectory equal-scale presentation does not follow its coordinate plots")
    return {
        "carrier": "two_component_readout_and_target_output_coordinates",
        "dimension": 2,
        "sourceLineAnchors": sorted(
            {
                output_counts[0].lineno,
                *(node.lineno for node in carrier_assignments),
                *(call.lineno for call in plot_calls),
                equal_axis_calls[0].lineno,
            }
        ),
    }


def _base_name(node: ast.AST) -> str | None:
    current = node
    while isinstance(current, ast.Subscript):
        current = current.value
    return current.id if isinstance(current, ast.Name) else None


def _two_dimensional_position_constructor(call: ast.Call) -> bool:
    name = _call_name(call) or ""
    if any(keyword.arg is None for keyword in call.keywords):
        return False
    extent = _keyword(call, "extent")
    if extent is not None:
        extent_value = _literal(extent)
        if not (
            isinstance(extent_value, (list, tuple))
            and len(extent_value) == 2
            and all(
                isinstance(member, (int, float))
                and not isinstance(member, bool)
                and math.isfinite(member)
                and member > 0
                for member in extent_value
            )
        ):
            return False
    if name.endswith(".spatial.grid"):
        shape = _keyword(call, "shape")
        if shape is not None and call.args:
            return False
        if shape is None and len(call.args) == 1:
            shape = call.args[0]
        value = _literal(shape) if shape is not None else None
        return (
            isinstance(value, (list, tuple))
            and len(value) == 2
            and all(isinstance(member, int) and not isinstance(member, bool) and member > 0 for member in value)
        )
    if name.endswith(".spatial.free"):
        if len(call.args) != 1 or not isinstance(call.args[0], (ast.List, ast.Tuple)):
            return False
        return len(call.args[0].elts) == 2
    return False


def _verify_spatial_2d_callsite_shape(tree: ast.Module) -> dict[str, Any]:
    """Bind reviewed 2D syntax with a conservative explicit-binding audit."""

    spatial_constructors = [
        call
        for call in _calls(tree)
        if (_call_name(call) or "").endswith((".spatial.grid", ".spatial.free"))
    ]
    if not spatial_constructors or not all(
        _two_dimensional_position_constructor(call) for call in spatial_constructors
    ):
        raise OracleError(
            "spatial correction contains an absent, ambiguous, or non-2D position constructor"
        )
    constructor_ids = {id(call) for call in spatial_constructors}

    position_candidates: dict[str, list[ast.Assign]] = {}
    for node in ast.walk(tree):
        if not (
            isinstance(node, ast.Assign)
            and isinstance(node.value, ast.Call)
            and id(node.value) in constructor_ids
        ):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name):
                position_candidates.setdefault(target.id, []).append(node)
    position_names = {
        name
        for name, assignments in position_candidates.items()
        if _write_nodes(tree, name, include_descendants=True) == assignments
    }

    def positions_are_verified(node: ast.AST | None) -> bool:
        return (
            isinstance(node, ast.Call) and id(node) in constructor_ids
        ) or (isinstance(node, ast.Name) and node.id in position_names)

    layer_candidates: dict[str, list[ast.Assign]] = {}
    for node in ast.walk(tree):
        if not (
            isinstance(node, ast.Assign)
            and isinstance(node.value, ast.Call)
            and (_call_name(node.value) or "").endswith(".Create")
            and positions_are_verified(_keyword(node.value, "positions"))
        ):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name):
                layer_candidates.setdefault(target.id, []).append(node)
    layer_names = {
        name
        for name, assignments in layer_candidates.items()
        if _write_nodes(tree, name, include_descendants=True) == assignments
    }
    layer_assignments = sorted(
        {
            assignment
            for name in layer_names
            for assignment in layer_candidates[name]
        },
        key=lambda node: node.lineno,
    )
    if not layer_names:
        raise OracleError(
            "spatial correction lacks a conservative explicit-binding 2D population"
        )

    spatial_entity_names = set(layer_names)
    changed = True
    while changed:
        changed = False
        alias_candidates: dict[str, list[ast.Assign]] = {}
        for node in ast.walk(tree):
            if not isinstance(node, ast.Assign):
                continue
            if _base_name(node.value) not in spatial_entity_names:
                continue
            for target in node.targets:
                if isinstance(target, ast.Name):
                    alias_candidates.setdefault(target.id, []).append(node)
        for name, assignments in alias_candidates.items():
            if (
                name not in spatial_entity_names
                and _write_nodes(tree, name, include_descendants=True) == assignments
            ):
                spatial_entity_names.add(name)
                changed = True

        for function in [
            node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)
        ]:
            positional = [*function.args.posonlyargs, *function.args.args]
            calls = [
                call
                for call in _calls(tree)
                if isinstance(call.func, ast.Name) and call.func.id == function.name
            ]
            direct_call_name_nodes = {id(call.func) for call in calls}
            function_name_uses_are_direct = all(
                id(node) in direct_call_name_nodes
                for node in ast.walk(tree)
                if isinstance(node, ast.Name)
                and isinstance(node.ctx, ast.Load)
                and node.id == function.name
            )
            for index, argument in enumerate(positional):
                supplied = [call.args[index] for call in calls if len(call.args) > index]
                if (
                    function_name_uses_are_direct
                    and supplied
                    and len(supplied) == len(calls)
                    and all(
                        _base_name(value) in spatial_entity_names for value in supplied
                    )
                    and not _write_nodes(
                        function,
                        argument.arg,
                        include_descendants=True,
                    )
                    and argument.arg not in spatial_entity_names
                ):
                    spatial_entity_names.add(argument.arg)
                    changed = True

    helper_consumers: list[ast.Call] = []
    direct_consumers: list[ast.Call] = []
    unresolved: list[int] = []
    for call in _calls(tree):
        name = _call_name(call) or ""
        layer_argument: ast.AST | None = None
        if name.endswith(".PlotLayer") and call.args:
            layer_argument = call.args[0]
            helper_consumers.append(call)
        elif name.endswith(".PlotTargets") and len(call.args) >= 2:
            layer_argument = call.args[1]
            helper_consumers.append(call)
        elif name.endswith(".PlotSources") and call.args:
            layer_argument = call.args[0]
            helper_consumers.append(call)
        elif name.endswith(".GetTargetPositions") and len(call.args) >= 2:
            layer_argument = call.args[1]
            direct_consumers.append(call)
        elif name.endswith(".GetSourcePositions") and call.args:
            layer_argument = call.args[0]
            direct_consumers.append(call)
        elif name.endswith(".GetPosition") and call.args:
            layer_argument = call.args[0]
            direct_consumers.append(call)
        allowed_names = spatial_entity_names if name.endswith(".GetPosition") else layer_names
        if layer_argument is not None and _base_name(layer_argument) not in allowed_names:
            unresolved.append(call.lineno)
    if unresolved:
        raise OracleError(
            "spatial helper/direct consumer is not bound to a reviewed 2D population at lines "
            + ",".join(str(line) for line in sorted(unresolved))
        )
    if not helper_consumers and not direct_consumers:
        raise OracleError("spatial correction has no position/helper consumer")

    direct_equal_scale = [
        call
        for call in _calls(tree)
        if _call_attribute(call) == "set_aspect"
        and call.args
        and _literal(call.args[0]) == "equal"
    ]
    if not helper_consumers and not direct_equal_scale:
        raise OracleError("direct 2D spatial correction lacks an equal-aspect call")
    equal_scale_anchors = (
        [call.lineno for call in helper_consumers]
        if helper_consumers
        else [call.lineno for call in direct_equal_scale]
    )
    return {
        "constructorLineAnchors": sorted(
            call.lineno for call in spatial_constructors
        ),
        "layerCreationLineAnchors": sorted(node.lineno for node in layer_assignments),
        "consumerLineAnchors": sorted(
            call.lineno for call in [*helper_consumers, *direct_consumers]
        ),
        "equalScaleLineAnchors": sorted(equal_scale_anchors),
        "dimension": 2,
        "helperBranch": "reviewed_2d_constructor_and_helper_branch_syntax",
    }


def _add(values: list[str], member: str) -> None:
    values.append(member)
    values[:] = sorted(set(values))


def _remove(values: list[str], member: str) -> None:
    values[:] = [value for value in values if value != member]


def _ast_evidence(
    path: str,
    tree: ast.Module,
    categories: Iterable[str],
) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    calls = _calls(tree)
    for category in sorted(set(categories)):
        if category == "raster_helper_bundle":
            matches = [call for call in calls if _call_name(call) == "nest.raster_plot.from_device"]
            evidence.append({"kind": category, "lineAnchors": sorted(call.lineno for call in matches)})
        elif category in {"shared_x_axis", "shared_y_axis"}:
            keyword_name = "sharex" if category == "shared_x_axis" else "sharey"
            anchors = [
                call.lineno
                for call in calls
                if (_call_name(call) or "").endswith(".subplots")
                and (value := _keyword(call, keyword_name)) is not None
                and _literal(value) not in (False, None)
            ]
            evidence.append({"kind": category, "lineAnchors": sorted(anchors)})
        elif category == "equal_xy_trajectory":
            profile = _verify_output_coordinate_trajectory_shape(tree)
            evidence.append({"kind": category, "lineAnchors": profile["sourceLineAnchors"]})
        elif category == "response_curve":
            anchors = sorted(
                call.lineno for call in calls if (_call_name(call) or "").endswith(".plot")
            )
            evidence.append({"kind": category, "lineAnchors": anchors})
        elif category == "single_panel_dual_dimension":
            anchors = sorted(
                call.lineno
                for call in calls
                if (_call_name(call) or "").endswith(
                    (".figure", ".add_subplot", ".twinx", ".plot")
                )
            )
            evidence.append({"kind": category, "lineAnchors": anchors})
        elif category.startswith("spatial_"):
            profile = _verify_spatial_2d_callsite_shape(tree)
            anchors = sorted(
                {
                    *profile["constructorLineAnchors"],
                    *profile["layerCreationLineAnchors"],
                    *profile["consumerLineAnchors"],
                    *profile["equalScaleLineAnchors"],
                }
            )
            evidence.append({"kind": category, "lineAnchors": anchors})
        else:
            raise OracleError(f"{path}: unsupported oracle evidence category {category}")
    for record in evidence:
        if not record["lineAnchors"]:
            raise OracleError(f"{path}: AST evidence {record['kind']} has no source anchor")
    return evidence


def _derive_expected_projections(
    predecessor: Mapping[str, Any],
    trees: Mapping[str, ast.Module],
) -> tuple[
    list[dict[str, Any]],
    dict[str, list[Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    rows = predecessor.get("canonicalExamples")
    if not isinstance(rows, list) or len(rows) != 98:
        raise OracleError("predecessor must classify exactly 98 canonical examples")
    row_by_path: dict[str, Mapping[str, Any]] = {}
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("path"), str):
            raise OracleError("predecessor canonical row is malformed")
        path = row["path"]
        if path in row_by_path:
            raise OracleError(f"duplicate predecessor canonical path: {path}")
        row_by_path[path] = row
    canonical_paths = set(row_by_path)

    raster_paths = {
        path
        for path in canonical_paths
        if any(_call_name(call) == "nest.raster_plot.from_device" for call in _calls(trees[path]))
    }
    raster_call_profiles: dict[str, dict[str, Any]] = {}
    for path in raster_paths:
        from_device_calls = [
            call
            for call in _calls(trees[path])
            if _call_name(call) == "nest.raster_plot.from_device"
        ]
        if len(from_device_calls) != 1:
            raise OracleError(f"{path}: raster helper call is absent or ambiguous")
        raster_call_profiles[path] = _raster_call_profile(path, from_device_calls[0])
    shared_x_paths = {
        path
        for path in canonical_paths
        if any(
            (_call_name(call) or "").endswith(".subplots")
            and (value := _keyword(call, "sharex")) is not None
            and _literal(value) not in (False, None)
            for call in _calls(trees[path])
        )
    }
    shared_y_paths = {
        path
        for path in canonical_paths
        if any(
            (_call_name(call) or "").endswith(".subplots")
            and (value := _keyword(call, "sharey")) is not None
            and _literal(value) not in (False, None)
            for call in _calls(trees[path])
        )
    }
    trajectory_paths = {
        path
        for path in canonical_paths
        if any(
            (_call_name(call) or "").endswith(".axis")
            and call.args
            and _literal(call.args[0]) == "equal"
            for call in _calls(trees[path])
        )
    }
    trajectory_profiles = {
        path: _verify_output_coordinate_trajectory_shape(trees[path])
        for path in trajectory_paths
    }
    def has_3d_projection(tree: ast.Module) -> bool:
        return any(
            (projection := _keyword(call, "projection")) is not None
            and _literal(projection) == "3d"
            for call in _calls(tree)
        )

    def has_direct_2d_spatial_shape(tree: ast.Module) -> bool:
        calls = _calls(tree)
        has_position_projection = any(
            (_call_name(call) or "").endswith(
                (".GetPosition", ".GetTargetPositions", ".GetSourcePositions")
            )
            for call in calls
        )
        has_point_plot = any(
            _call_attribute(call) in {"plot", "scatter"}
            for call in calls
        )
        has_equal_aspect = any(
            _call_attribute(call) == "set_aspect"
            and call.args
            and _literal(call.args[0]) == "equal"
            for call in calls
        )
        return has_position_projection and has_point_plot and has_equal_aspect

    spatial_paths = {
        path
        for path in canonical_paths
        if not has_3d_projection(trees[path])
        and (
            any(
                (_call_name(call) or "").endswith(
                    (".PlotLayer", ".PlotTargets", ".PlotSources")
                )
                for call in _calls(trees[path])
            )
            or has_direct_2d_spatial_shape(trees[path])
        )
    }
    predecessor_spatial_paths = {
        path
        for path, row in row_by_path.items()
        if "spatial_connectivity_2d" in _projection(row)["semanticDemands"]
    }
    if spatial_paths != predecessor_spatial_paths:
        raise OracleError(
            "AST-derived 2D spatial correction set does not equal the reviewed V2 candidate set"
        )
    spatial_profiles = {
        path: _verify_spatial_2d_callsite_shape(trees[path])
        for path in spatial_paths
    }
    neighborhood_paths = {
        path
        for path in spatial_paths
        if any(
            (_call_name(call) or "").endswith(
                (".PlotTargets", ".PlotSources", ".GetTargetPositions", ".GetSourcePositions")
            )
            for call in _calls(trees[path])
        )
    }
    node_map_paths = spatial_paths - neighborhood_paths
    probability_paths = {
        path
        for path in spatial_paths
        if any(
            (_call_name(call) or "").endswith(".PlotTargets")
            and _keyword(call, "probability_parameter") is not None
            for call in _calls(trees[path])
        )
    }
    helper_mask_paths = {
        path
        for path in spatial_paths
        if any(
            (_call_name(call) or "").endswith(".PlotTargets")
            and _keyword(call, "mask") is not None
            for call in _calls(trees[path])
        )
    }

    def has_dict_key(tree: ast.Module, key: str) -> bool:
        return any(
            any(_literal(member) == key for member in node.keys if member is not None)
            for node in ast.walk(tree)
            if isinstance(node, ast.Dict)
        )

    direct_mask_paths = {
        path
        for path in spatial_paths
        if has_dict_key(trees[path], "mask")
        and any(
            (_call_name(call) or "").endswith((".Circle", ".Rectangle"))
            for call in _calls(trees[path])
        )
        and any(
            (_call_name(call) or "").endswith(".GetTargetPositions")
            for call in _calls(trees[path])
        )
    }
    mask_paths = helper_mask_paths | direct_mask_paths

    for path in spatial_paths:
        calls = _calls(trees[path])
        helper_equal_aspect = any(
            (_call_name(call) or "").endswith((".PlotLayer", ".PlotTargets", ".PlotSources"))
            for call in calls
        )
        direct_equal_aspect = any(
            _call_attribute(call) == "set_aspect"
            and call.args
            and _literal(call.args[0]) == "equal"
            for call in calls
        )
        if not helper_equal_aspect and not direct_equal_aspect:
            raise OracleError(f"{path}: equal x/y presentation has no verified source/helper basis")

    hh_path = "pynest/examples/hh_psc_alpha.py"
    intrinsic_path = "pynest/examples/intrinsic_currents_subthreshold.py"
    if_curve_path = "pynest/examples/if_curve.py"
    for required in (hh_path, intrinsic_path, if_curve_path):
        if required not in canonical_paths:
            raise OracleError(f"required canonical source is absent: {required}")
    _verify_hh_response_curve_shape(trees[hh_path])
    _verify_intrinsic_single_panel_dual_axis_shape(trees[intrinsic_path])

    expected_sets = {
        "rasterPlotFromDevicePaths": sorted(raster_paths),
        "rasterPlotFromDeviceCallProfiles": [
            {"path": path, **raster_call_profiles[path]} for path in sorted(raster_call_profiles)
        ],
        "sharedXAxisPaths": sorted(shared_x_paths),
        "sharedYAxisPaths": sorted(shared_y_paths),
        "trajectory2dPaths": sorted(trajectory_paths),
        "trajectory2dCallProfiles": [
            {"path": path, **trajectory_profiles[path]} for path in sorted(trajectory_profiles)
        ],
        "spatialReviewedPaths": sorted(spatial_paths),
        "spatial2dCallProfiles": [
            {"path": path, **spatial_profiles[path]} for path in sorted(spatial_profiles)
        ],
        "spatialNeighborhoodMembershipPaths": sorted(neighborhood_paths),
        "spatialNodeMapPaths": sorted(node_map_paths),
        "spatialProbabilityFieldPaths": sorted(probability_paths),
        "spatialMaskPaths": sorted(mask_paths),
    }
    expected_counts = {
        "rasterPlotFromDevicePaths": 9,
        "sharedXAxisPaths": 14,
        "sharedYAxisPaths": 6,
        "trajectory2dPaths": 2,
        "trajectory2dCallProfiles": 2,
        "spatialReviewedPaths": 12,
        "spatial2dCallProfiles": 12,
        "spatialNeighborhoodMembershipPaths": 8,
        "spatialNodeMapPaths": 4,
        "spatialProbabilityFieldPaths": 1,
        "spatialMaskPaths": 6,
    }
    for name, count in expected_counts.items():
        if len(expected_sets[name]) != count:
            raise OracleError(f"AST-derived {name} count is {len(expected_sets[name])}, expected {count}")
    if neighborhood_paths & node_map_paths or neighborhood_paths | node_map_paths != spatial_paths:
        raise OracleError("spatial neighborhood/node-map partition is not exact")

    categories: dict[str, set[str]] = {path: set() for path in canonical_paths}
    for path in raster_paths:
        categories[path].add("raster_helper_bundle")
    for path in shared_x_paths:
        categories[path].add("shared_x_axis")
    for path in shared_y_paths:
        categories[path].add("shared_y_axis")
    for path in trajectory_paths:
        categories[path].add("equal_xy_trajectory")
    for path in neighborhood_paths:
        categories[path].add("spatial_neighborhood_membership")
    for path in node_map_paths:
        categories[path].add("spatial_node_map")
    for path in probability_paths:
        categories[path].add("spatial_probability_field")
    for path in mask_paths:
        categories[path].add("spatial_mask")
    categories[hh_path].add("response_curve")
    categories[intrinsic_path].add("single_panel_dual_dimension")

    expected_rows: list[dict[str, Any]] = []
    corrections: list[dict[str, Any]] = []
    for path in sorted(canonical_paths):
        predecessor_projection = _projection(row_by_path[path])
        projection = copy.deepcopy(predecessor_projection)
        semantic = projection["semanticDemands"]
        presentation = projection["presentationDemands"]
        operations = projection["visualOperations"]

        if path in raster_paths:
            _remove(semantic, "population_rate")
            _add(semantic, RASTER_RATE_DEMAND)
            _remove(presentation, "single_panel")
            _add(presentation, "multi_panel")
            _add(presentation, "cross_capability_bundle")
            _add(operations, "histogram")
        if path == hh_path:
            _remove(semantic, "analog_trace")
            _add(semantic, "response_curve")
        if path == intrinsic_path:
            _remove(presentation, "multi_panel")
            _add(presentation, "single_panel")
            _add(presentation, "dual_y_axis")
        if path in spatial_paths:
            _remove(semantic, "spatial_connectivity_2d")
            _add(presentation, "equal_xy_scale")
            _remove(operations, "network_edges")
        if path in neighborhood_paths:
            _add(semantic, SPATIAL_NEIGHBORHOOD_DEMAND)
        if path in node_map_paths:
            _add(semantic, SPATIAL_NODE_MAP_DEMAND)
        if path in probability_paths:
            _add(semantic, SPATIAL_PROBABILITY_DEMAND)
            _add(operations, "probability_field")
        if path in mask_paths:
            _add(operations, "spatial_mask")
        if path in shared_x_paths:
            _add(presentation, "shared_x_axis")
        if path in shared_y_paths:
            _add(presentation, "shared_y_axis")
        if path in trajectory_paths:
            _add(semantic, TRAJECTORY_DEMAND)
            _add(presentation, "equal_xy_scale")
            _add(operations, "trajectory_2d")

        changed = projection != predecessor_projection
        record = {
            "path": path,
            "sourceSha256": row_by_path[path]["sha256"],
            "classification": "corrected" if changed else "semantic_projection_unchanged",
            "predecessorProjectionDigest": _projection_digest(path, predecessor_projection),
            "v3ProjectionDigest": _projection_digest(path, projection),
            **projection,
        }
        expected_rows.append(record)
        if changed:
            corrections.append(
                {
                    "path": path,
                    "categories": sorted(categories[path]),
                    "astEvidence": _ast_evidence(path, trees[path], categories[path]),
                    "predecessorProjectionDigest": record["predecessorProjectionDigest"],
                    "v3ProjectionDigest": record["v3ProjectionDigest"],
                }
            )
        elif categories[path]:
            raise OracleError(f"{path}: AST correction category did not change its projection")

    changed_paths = {record["path"] for record in corrections}
    if len(changed_paths) != 35 or len(expected_rows) - len(changed_paths) != 63:
        raise OracleError("V3 correction partition must be exactly 35 corrected plus 63 unchanged")
    if changed_paths != {path for path, members in categories.items() if members}:
        raise OracleError("V3 corrected row set does not equal the AST-derived category union")

    if_curve_profile = _verify_if_curve_complete_population_shape(trees[if_curve_path])
    computed_outputs = [
        {
            "path": if_curve_path,
            "sourceSha256": row_by_path[if_curve_path]["sha256"],
            "kind": "computed_response_surface_2d_no_visualization_operation",
            "carrier": "IF_curve.rate",
            "axes": ["I_mean", "I_std"],
            "value": "configured_complete_population_mean_firing_rate_hz",
            "sourceLineAnchors": if_curve_profile["sourceLineAnchors"],
            "sourceLineAnchorMeaning": "ast_derived_navigation_only_full_source_sha256_is_authority",
            "denominator": "configured_self_n_neurons_times_self_t_sim_ms",
            "denominatorMeaning": "all_neurons_created_for_each_trial_not_only_senders_with_recorded_events",
            "normalizationFormula": if_curve_profile["normalizationFormula"],
            "populationConnection": if_curve_profile["populationConnection"],
            "trialOrder": if_curve_profile["trialOrder"],
            "coverageDenominator": "separate_nonvisual_computed_output_not_a_visualization_body",
        }
    ]
    return expected_rows, expected_sets, computed_outputs, corrections


def _count(rows: Sequence[Mapping[str, Any]], member: str, value: str) -> int:
    return sum(value in row[member] for row in rows)


def _build_oracle(source_root: Path) -> dict[str, Any]:
    inventory = _load_pinned_source_inventory()
    predecessor = _load_json(PREDECESSOR_COVERAGE_PATH)
    _verify_predecessor_authority(predecessor)
    trees, verified_sources = _verify_inventory_and_parse(source_root, inventory)
    helper_records = _verify_helper_semantics(source_root)
    expected_rows, derived_sets, computed_outputs, correction_evidence = (
        _derive_expected_projections(predecessor, trees)
    )

    aggregate = {
        "activeSenderNormalizedRateDemandCount": _count(expected_rows, "semanticDemands", RASTER_RATE_DEMAND),
        "analogTraceDemandCount": _count(expected_rows, "semanticDemands", "analog_trace"),
        "populationRateDemandCount": _count(expected_rows, "semanticDemands", "population_rate"),
        "responseCurveDemandCount": _count(expected_rows, "semanticDemands", "response_curve"),
        "spatialNeighborhoodMembershipDemandCount": _count(
            expected_rows, "semanticDemands", SPATIAL_NEIGHBORHOOD_DEMAND
        ),
        "spatialNodeMapDemandCount": _count(expected_rows, "semanticDemands", SPATIAL_NODE_MAP_DEMAND),
        "spatialProbabilityFieldDemandCount": _count(
            expected_rows, "semanticDemands", SPATIAL_PROBABILITY_DEMAND
        ),
        "trajectory2dDemandCount": _count(expected_rows, "semanticDemands", TRAJECTORY_DEMAND),
        "crossCapabilityBundleDemandCount": _count(
            expected_rows, "presentationDemands", "cross_capability_bundle"
        ),
        "dualYAxisDemandCount": _count(expected_rows, "presentationDemands", "dual_y_axis"),
        "equalXYScaleDemandCount": _count(expected_rows, "presentationDemands", "equal_xy_scale"),
        "multiPanelDemandCount": _count(expected_rows, "presentationDemands", "multi_panel"),
        "sharedXAxisDemandCount": _count(expected_rows, "presentationDemands", "shared_x_axis"),
        "sharedYAxisDemandCount": _count(expected_rows, "presentationDemands", "shared_y_axis"),
        "singlePanelDemandCount": _count(expected_rows, "presentationDemands", "single_panel"),
        "histogramOperationCount": _count(expected_rows, "visualOperations", "histogram"),
        "imageOperationCountCanonicalOnly": _count(expected_rows, "visualOperations", "image"),
        "spatialMaskOperationCount": _count(expected_rows, "visualOperations", "spatial_mask"),
        "networkEdgesOperationCount": _count(expected_rows, "visualOperations", "network_edges"),
        "probabilityFieldOperationCount": _count(expected_rows, "visualOperations", "probability_field"),
        "trajectory2dOperationCount": _count(expected_rows, "visualOperations", "trajectory_2d"),
    }
    expected_aggregate = {
        "activeSenderNormalizedRateDemandCount": 9,
        "analogTraceDemandCount": 18,
        "populationRateDemandCount": 4,
        "responseCurveDemandCount": 3,
        "spatialNeighborhoodMembershipDemandCount": 8,
        "spatialNodeMapDemandCount": 4,
        "spatialProbabilityFieldDemandCount": 1,
        "trajectory2dDemandCount": 2,
        "crossCapabilityBundleDemandCount": 30,
        "dualYAxisDemandCount": 5,
        "equalXYScaleDemandCount": 14,
        "multiPanelDemandCount": 43,
        "sharedXAxisDemandCount": 14,
        "sharedYAxisDemandCount": 6,
        "singlePanelDemandCount": 41,
        "histogramOperationCount": 16,
        "imageOperationCountCanonicalOnly": 3,
        "spatialMaskOperationCount": 6,
        "networkEdgesOperationCount": 2,
        "probabilityFieldOperationCount": 1,
        "trajectory2dOperationCount": 2,
    }
    if set(aggregate) != set(expected_aggregate):
        raise OracleError("derived V3 aggregate key set drifted")
    if aggregate != expected_aggregate:
        raise OracleError(f"derived V3 aggregate drifted: {aggregate!r}")

    root: dict[str, Any] = {
        "protocol": "cortexel-nest-example-visualization-oracle",
        "protocolVersion": 1,
        "description": (
            "Differential stdlib-Python AST oracle for the V3 correction projection. It verifies "
            "the selected V2 source leaves and two helpers, derives the closed correction sets, and "
            "inherits 63 unchanged taxonomy rows from V2. It imports and executes no upstream module "
            "and establishes no runtime output, parity, or scientific certification."
        ),
        "upstream": dict(inventory["upstream"]),
        "authorities": {
            "sourceInventory": {
                "path": "docs/audit/nest-example-source-inventory.v2.json",
                "inventoryDigest": PINNED_SOURCE_INVENTORY_DIGEST,
                "verifiedSourceLeafCount": len(verified_sources),
                "verifiedRegularPythonBodyCount": len(trees),
                "verifiedSymlinkLiteralCount": len(verified_sources) - len(trees),
            },
            "predecessorCoverage": {
                "path": "docs/audit/nest-example-coverage.v2.json",
                "semanticDigest": PINNED_PREDECESSOR_SEMANTIC_DIGEST,
                "artifactSha256": PINNED_PREDECESSOR_ARTIFACT_SHA256,
                "schemaSha256": PINNED_PREDECESSOR_SCHEMA_SHA256,
                "implementationSha256": PINNED_PREDECESSOR_IMPLEMENTATION_SHA256,
                "generatorSha256": PINNED_PREDECESSOR_GENERATOR_SHA256,
                "evidenceTransfer": "exact_source_identity_and_predecessor_projection_only",
            },
            "reviewedGeneratorSource": _reviewed_generator_source_authority(),
            "helperSources": helper_records,
        },
        "method": {
            "parser": "python_stdlib_ast_no_import_no_execution",
            "canonicalizationProfile": "ascii_object_keys_integer_string_boolean_null_rfc8785_subset_v1",
            "sourceVerification": "all_112_source_leaf_sha256_and_byte_lengths_against_v2_inventory",
            "closedSetDerivation": "AST call_and_keyword_shapes_plus_exact_helper_semantics",
            "upstreamTreeIdentity": "inherited_exact_v2_inventory_claim_not_independently_reverified_by_oracle",
            "taxonomyBasis": "v2_projection_inherited_with_ast_derived_closed_correction_sets",
            "generatorExecutionAuthority": "not_established",
        },
        "derivedPathSets": derived_sets,
        "correctionEvidence": correction_evidence,
        "expectedCanonicalProjections": expected_rows,
        "computedNonvisualOutputs": computed_outputs,
        "summary": {
            "canonicalExampleCount": 98,
            "correctedCanonicalProjectionCount": sum(
                row["classification"] == "corrected" for row in expected_rows
            ),
            "unchangedCanonicalProjectionCount": sum(
                row["classification"] == "semantic_projection_unchanged" for row in expected_rows
            ),
            "computedNonvisualOutputCount": len(computed_outputs),
            "sourceLeafSha256VerifiedCount": len(verified_sources),
            "helperSourceSha256VerifiedCount": len(helper_records),
            "aggregateExpectations": aggregate,
            "imageOperationCountAllRegularBodies": 4,
        },
        "limitations": [
            "AST review establishes exact pinned syntax plus a conservative audit of explicit assignment targets and direct local-function calls; it is not a complete Python alias, reflection, mutation, or control-flow proof and does not establish which branch runs or whether an example completes.",
            "The oracle classifies source-visible intent and helper-defined presentation semantics; it does not contain an execution-bound output.",
            "The active-sender rate denominator is the unique sender ids present in the helper's unfiltered timestamp carrier, not a declared complete biological population.",
            "PlotTargets and PlotSources draw membership points and optional masks/probability fields; they do not draw endpoint-to-endpoint network edges.",
            "The if_curve response surface uses the complete configured neuron count and simulation duration, not the raster helper's active-sender denominator; it remains separate because its source performs no visualization operation.",
            "Every adapter match, upstream execution, renderer comparison, and scientific certification remains not established or not run.",
            "The reviewed generator source digest identifies pathname bytes read after interpreter startup; it does not prove that those exact bytes were executed.",
        ],
    }
    root["semanticBinding"] = {
        "identityAlgorithm": ORACLE_IDENTITY,
        "digestScope": "all_top_level_members_except_semanticBinding",
        "semanticDigest": _semantic_digest(root),
    }
    return root


def _validate_retained_oracle(raw: bytes) -> dict[str, Any]:
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        raise OracleError("retained oracle must end in exactly one newline")
    try:
        value = json.loads(raw, object_pairs_hook=_reject_duplicates)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        raise OracleError(
            f"retained oracle is not strict UTF-8 JSON: {_bounded_error(error)}"
        ) from error
    if not isinstance(value, dict):
        raise OracleError("retained oracle root is not an object")
    if raw != _canonical_bytes(value) + b"\n":
        raise OracleError("retained oracle is not exact canonical JSON plus one newline")
    binding = value.get("semanticBinding")
    if not isinstance(binding, dict) or binding.get("identityAlgorithm") != ORACLE_IDENTITY:
        raise OracleError("retained oracle identity is invalid")
    if binding.get("semanticDigest") != _semantic_digest(value):
        raise OracleError("retained oracle semantic digest does not match its preimage")
    return value


def _publish_exclusive(path: Path, payload: bytes) -> None:
    if not path.is_absolute():
        raise OracleError("oracle output path must be absolute")
    if path.name in {"", ".", ".."}:
        raise OracleError("oracle output leaf name is invalid")
    path = path.parent.resolve(strict=True) / path.name
    parent_before = path.parent.lstat()
    if not stat.S_ISDIR(parent_before.st_mode) or stat.S_ISLNK(parent_before.st_mode):
        raise OracleError("oracle output parent must be a direct directory")
    if stat.S_IMODE(parent_before.st_mode) != 0o700:
        raise OracleError("oracle output parent must have mode 0700")
    getuid = getattr(os, "getuid", None)
    if getuid is not None and parent_before.st_uid != getuid():
        raise OracleError("oracle output parent must be owned by the invoking uid")
    try:
        path.lstat()
    except FileNotFoundError:
        pass
    else:
        raise OracleError("oracle output path must be absent")

    flags = (
        os.O_WRONLY
        | os.O_CREAT
        | os.O_EXCL
        | getattr(os, "O_CLOEXEC", 0)
        | getattr(os, "O_NOFOLLOW", 0)
        | getattr(os, "O_NONBLOCK", 0)
    )
    descriptor = os.open(path, flags, 0o644)
    try:
        os.fchmod(descriptor, 0o644)
        opened = os.fstat(descriptor)
        if (
            not stat.S_ISREG(opened.st_mode)
            or opened.st_nlink != 1
            or stat.S_IMODE(opened.st_mode) != 0o644
            or opened.st_size != 0
        ):
            raise OracleError("new oracle output descriptor authority is invalid")
        offset = 0
        while offset < len(payload):
            written = os.write(descriptor, payload[offset : offset + 1024 * 1024])
            if written <= 0:
                raise OracleError("oracle output write made no progress")
            offset += written
        os.fsync(descriptor)
        final_descriptor = os.fstat(descriptor)
        final_path = path.lstat()
        if (
            not _same_file_authority(final_descriptor, final_path)
            or final_descriptor.st_size != len(payload)
        ):
            raise OracleError("oracle output identity changed before publication completed")
        directory = os.open(
            path.parent,
            os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_CLOEXEC", 0),
        )
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
        parent_after = path.parent.lstat()
        if not _same_directory_identity(parent_before, parent_after):
            raise OracleError("oracle output parent changed during publication")
    finally:
        os.close(descriptor)


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__,
        epilog=(
            "Offline --check validates retained canonical bytes and their self-digest only. "
            "Supply --source-root to rederive the correction oracle from selected pinned sources."
        ),
    )
    parser.add_argument(
        "--source-root",
        type=Path,
        help="selected pinned NEST checkout; required for generation or full rederivation",
    )
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--output", type=Path)
    action.add_argument("--check", type=Path)
    return parser.parse_args(argv)


def main(argv: Sequence[str]) -> int:
    args = _parse_args(argv)
    try:
        retained: dict[str, Any] | None = None
        retained_raw: bytes | None = None
        if args.check is not None:
            retained_raw = _read_stable_regular_file(
                args.check,
                "retained NEST visualization oracle",
                4 * 1024 * 1024,
            )
            retained = _validate_retained_oracle(retained_raw)
            if args.source_root is None:
                return 0
        if args.source_root is None:
            raise OracleError("--source-root is required when generating an oracle")
        generated = _build_oracle(args.source_root.resolve(strict=True))
        payload = _canonical_bytes(generated) + b"\n"
        embedded_generator = generated.get("authorities", {}).get("reviewedGeneratorSource")
        if embedded_generator != _reviewed_generator_source_authority():
            raise OracleError("reviewed oracle generator source changed during derivation")
        if retained is not None:
            if retained_raw is None or payload != retained_raw:
                raise OracleError("retained oracle differs from the exact pinned-source derivation")
            return 0
        _publish_exclusive(args.output, payload)
        return 0
    except (OracleError, OSError) as error:
        print(f"NEST visualization oracle: {_bounded_error(error, 1000)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
