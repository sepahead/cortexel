#!/usr/bin/env python3
"""Build, inspect, and clean-install the exact standalone Python distributions."""

from __future__ import annotations

import hashlib
import os
import shutil
import stat
import subprocess
import tarfile
import tempfile
import tomllib
import venv
import zipfile
from pathlib import Path, PurePosixPath
from typing import NoReturn


ROOT = Path(__file__).resolve().parents[1]
PYTHON_PROJECT = ROOT / "python"
PACKAGED_CONTRACT = PYTHON_PROJECT / "src" / "cortexel" / "contract"
SOURCE_DATE_EPOCH = "946684800"  # 2000-01-01T00:00:00Z


def fail(message: str) -> NoReturn:
    raise RuntimeError(message)


def safe_archive_name(name: str) -> PurePosixPath:
    if "\\" in name or "\x00" in name:
        fail(f"archive contains a non-portable path: {name!r}")
    path = PurePosixPath(name)
    if path.is_absolute() or not path.parts or any(part in ("", ".", "..") for part in path.parts):
        fail(f"archive contains an unsafe path: {name!r}")
    return path


def sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def exact_files(directory: Path, suffix: str) -> list[Path]:
    files = sorted(path for path in directory.iterdir() if path.name.endswith(suffix))
    if len(files) != 1:
        fail(f"expected exactly one {suffix} in {directory}; found {[path.name for path in files]}")
    return files


def resource_bytes() -> dict[str, bytes]:
    resources = {
        path.relative_to(PACKAGED_CONTRACT).as_posix(): path.read_bytes()
        for path in sorted(PACKAGED_CONTRACT.rglob("*.json"))
    }
    if not resources:
        fail("the generator-owned Python contract projection is empty")
    return resources


def inspect_core_metadata(payload: bytes, label: str) -> None:
    metadata = payload.decode("utf-8", "strict")
    lines = metadata.splitlines()
    forbidden = ("Requires-Dist:", "Provides-Extra:")
    if any(line.startswith(forbidden) for line in lines):
        fail(f"{label} unexpectedly advertises runtime dependencies or optional extras")
    for required in ("Name: cortexel", "License-Expression: MIT", "Requires-Python: >=3.11"):
        if required not in lines:
            fail(f"{label} is missing {required!r}")


def sdist_source_bytes() -> dict[str, bytes]:
    """Return the exact build-input inventory that the sdist may reproduce."""

    selected: dict[str, bytes] = {}
    fixed = (".gitignore", "LICENSE", "README.md", "pyproject.toml", "tests/test_cortexel.py")
    for relative in fixed:
        path = PYTHON_PROJECT / relative
        if path.is_symlink() or not path.is_file():
            fail(f"sdist build input must be a regular file: python/{relative}")
        selected[relative] = path.read_bytes()

    package_root = PYTHON_PROJECT / "src" / "cortexel"
    for path in sorted(package_root.rglob("*")):
        if path.is_symlink():
            fail(f"Python package source contains a symbolic link: {path.relative_to(PYTHON_PROJECT)}")
        if path.is_dir():
            continue
        if not path.is_file():
            fail(f"Python package source contains a special entry: {path.relative_to(PYTHON_PROJECT)}")
        relative = path.relative_to(PYTHON_PROJECT).as_posix()
        parts = PurePosixPath(relative).parts
        transient = (
            "__pycache__" in parts
            or path.suffix in {".pyc", ".pyo"}
            or path.name == ".DS_Store"
        )
        if transient:
            continue
        package_relative = path.relative_to(package_root).as_posix()
        allowed = (
            path.suffix == ".py"
            or package_relative == "py.typed"
            or (package_relative.startswith("contract/") and path.suffix == ".json")
        )
        if not allowed:
            fail(f"Python package source is outside the closed sdist policy: {relative}")
        selected[relative] = path.read_bytes()
    return selected


def materialize_detached_project(destination: Path, sources: dict[str, bytes]) -> None:
    """Create a VCS-free copy from the exact source inventory, not a broad tree copy."""

    destination.mkdir()
    for relative, payload in sorted(sources.items()):
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)


def inspect_wheel(wheel: Path, expected: dict[str, bytes], license_bytes: bytes) -> None:
    with zipfile.ZipFile(wheel) as archive:
        infos = archive.infolist()
        if len(infos) > 10_000:
            fail("wheel archive entry budget exceeded")
        seen: set[str] = set()
        packaged: dict[str, bytes] = {}
        metadata_names: list[str] = []
        license_names: list[str] = []
        for info in infos:
            safe_archive_name(info.filename)
            if info.filename in seen:
                fail(f"wheel contains duplicate path {info.filename!r}")
            seen.add(info.filename)
            mode = info.external_attr >> 16
            file_type = stat.S_IFMT(mode)
            if file_type not in (0, stat.S_IFREG, stat.S_IFDIR):
                fail(f"wheel contains an indirect or special entry: {info.filename}")
            if info.filename.endswith(".dist-info/METADATA"):
                metadata_names.append(info.filename)
            if info.filename.endswith(".dist-info/licenses/LICENSE"):
                license_names.append(info.filename)
            prefix = "cortexel/contract/"
            if info.filename.startswith(prefix) and not info.is_dir():
                packaged[info.filename.removeprefix(prefix)] = archive.read(info)
        if set(packaged) != set(expected):
            fail(
                "wheel schema inventory differs from the generator-owned projection: "
                f"missing={sorted(set(expected) - set(packaged))}, "
                f"extra={sorted(set(packaged) - set(expected))}"
            )
        for relative, source in expected.items():
            if packaged[relative] != source:
                fail(f"wheel schema bytes drifted from source projection: {relative}")
        if len(metadata_names) != 1:
            fail("wheel must contain exactly one Core Metadata record")
        inspect_core_metadata(archive.read(metadata_names[0]), "wheel Core Metadata")
        if "cortexel/py.typed" not in seen or archive.read("cortexel/py.typed") != b"":
            fail("wheel is missing its exact empty PEP 561 py.typed marker")
        if len(license_names) != 1 or archive.read(license_names[0]) != license_bytes:
            fail("wheel does not contain the exact project MIT license")


def inspect_sdist(
    sdist: Path,
    expected: dict[str, bytes],
    expected_sources: dict[str, bytes],
    license_bytes: bytes,
    archive_root: str,
) -> None:
    packaged: dict[str, bytes] = {}
    root_license: bytes | None = None
    typed_marker: bytes | None = None
    archived_files: dict[str, bytes] = {}
    with tarfile.open(sdist, mode="r:gz") as archive:
        members = archive.getmembers()
        if len(members) > 10_000:
            fail("sdist archive entry budget exceeded")
        seen: set[str] = set()
        for member in members:
            path = safe_archive_name(member.name)
            if member.name in seen:
                fail(f"sdist contains duplicate path {member.name!r}")
            seen.add(member.name)
            if not (member.isfile() or member.isdir()):
                fail(f"sdist contains an indirect or special entry: {member.name}")
            if any(part in {".env", ".git", "__pycache__", "uv.lock"} for part in path.parts):
                fail(f"sdist contains a local or transient path: {member.name}")
            if path.parts[0] != archive_root:
                fail(f"sdist member escaped the one expected archive root: {member.name}")
            relative = PurePosixPath(*path.parts[1:])
            if member.isdir():
                if relative.parts and not any(
                    PurePosixPath(name).parts[:len(relative.parts)] == relative.parts
                    for name in {*expected_sources, "PKG-INFO"}
                ):
                    fail(f"sdist contains an unexpected directory: {member.name}")
                continue
            if not relative.parts:
                fail("sdist archive root is a file")
            handle = archive.extractfile(member)
            if handle is None:
                fail(f"cannot read regular sdist member {member.name}")
            payload = handle.read()
            archived_files[relative.as_posix()] = payload
            if relative.as_posix() == "LICENSE":
                root_license = payload
            if member.isfile() and path.parts[-3:] == ("src", "cortexel", "py.typed"):
                typed_marker = payload
            marker = ("src", "cortexel", "contract")
            for index in range(len(path.parts) - len(marker) + 1):
                if path.parts[index:index + len(marker)] == marker and member.isfile():
                    relative = PurePosixPath(*path.parts[index + len(marker):]).as_posix()
                    packaged[relative] = payload
                    break
    expected_archive_files = {*expected_sources, "PKG-INFO"}
    if set(archived_files) != expected_archive_files:
        fail(
            "sdist file inventory is not closed: "
            f"missing={sorted(expected_archive_files - set(archived_files))}, "
            f"extra={sorted(set(archived_files) - expected_archive_files)}"
        )
    for relative, source in expected_sources.items():
        if archived_files[relative] != source:
            fail(f"sdist source bytes drifted from the declared build input: {relative}")
    inspect_core_metadata(archived_files["PKG-INFO"], "sdist PKG-INFO")
    if set(packaged) != set(expected):
        fail(
            "sdist schema inventory differs from the generator-owned projection: "
            f"missing={sorted(set(expected) - set(packaged))}, "
            f"extra={sorted(set(packaged) - set(expected))}"
        )
    for relative, source in expected.items():
        if packaged[relative] != source:
            fail(f"sdist schema bytes drifted from source projection: {relative}")
    if root_license != license_bytes:
        fail("sdist does not contain the exact project MIT license")
    if typed_marker != b"":
        fail("sdist is missing its exact empty PEP 561 py.typed marker")


def isolated_environment(temporary: Path, uv_cache: str) -> dict[str, str]:
    allowed = {
        name: os.environ[name]
        for name in (
            "PATH",
            "SYSTEMROOT",
            "WINDIR",
            "SSL_CERT_FILE",
            "SSL_CERT_DIR",
            "HTTPS_PROXY",
            "HTTP_PROXY",
            "ALL_PROXY",
            "NO_PROXY",
        )
        if name in os.environ
    }
    home = temporary / "home"
    home.mkdir()
    return {
        **allowed,
        "HOME": str(home),
        "TMPDIR": str(temporary),
        # Reuse only uv's content-addressed package cache. A fresh HOME prevents
        # user/project configuration from entering the build, while cache reuse makes
        # the same gate operable offline after its pinned backend has been fetched.
        "UV_CACHE_DIR": uv_cache,
        "UV_NO_CONFIG": "1",
        "UV_NO_SYSTEM_CONFIG": "1",
        "PIP_CONFIG_FILE": os.devnull,
        "PYTHONHASHSEED": "0",
        "SOURCE_DATE_EPOCH": SOURCE_DATE_EPOCH,
        "TZ": "UTC",
    }


def venv_python(environment: Path) -> Path:
    return environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def main() -> int:
    uv = shutil.which("uv")
    if uv is None:
        fail("uv is required for isolated PEP 517 package smoke testing")
    expected = resource_bytes()
    expected_sources = sdist_source_bytes()
    license_bytes = (ROOT / "LICENSE").read_bytes()
    if (PYTHON_PROJECT / "LICENSE").read_bytes() != license_bytes:
        fail("python/LICENSE has drifted from the root project license")
    uv_cache = subprocess.run(
        [uv, "--no-config", "cache", "dir"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if not uv_cache:
        fail("uv did not report a cache directory")
    project = tomllib.loads((PYTHON_PROJECT / "pyproject.toml").read_text(encoding="utf-8"))
    version = project["project"]["version"]
    expected_wheel_name = f"cortexel-{version}-py3-none-any.whl"
    expected_sdist_name = f"cortexel-{version}.tar.gz"
    archive_root = f"cortexel-{version}"
    with tempfile.TemporaryDirectory(prefix="cortexel-python-package-") as raw_temporary:
        temporary = Path(raw_temporary)
        environment = isolated_environment(temporary, uv_cache)
        detached_project = temporary / "detached-source"
        materialize_detached_project(detached_project, expected_sources)
        builds: list[tuple[Path, Path]] = []
        for name, source in (
            ("repository-context", PYTHON_PROJECT),
            ("detached-vcs-free-context", detached_project),
        ):
            output = temporary / name
            output.mkdir()
            subprocess.run(
                [uv, "--no-config", "build", str(source), "--out-dir", str(output)],
                cwd=temporary,
                env=environment,
                check=True,
            )
            builds.append((exact_files(output, ".whl")[0], exact_files(output, ".tar.gz")[0]))

        first_wheel, first_sdist = builds[0]
        second_wheel, second_sdist = builds[1]
        for wheel, sdist in builds:
            if wheel.name != expected_wheel_name or sdist.name != expected_sdist_name:
                fail(
                    "distribution filename identity drifted: "
                    f"wheel={wheel.name!r}, sdist={sdist.name!r}"
                )
        if first_wheel.read_bytes() != second_wheel.read_bytes():
            fail("repository-context and detached-source wheels are not byte-for-byte reproducible")
        if first_sdist.read_bytes() != second_sdist.read_bytes():
            fail("repository-context and detached-source sdists are not byte-for-byte reproducible")
        inspect_wheel(first_wheel, expected, license_bytes)
        inspect_sdist(first_sdist, expected, expected_sources, license_bytes, archive_root)

        clean_environment = temporary / "clean-venv"
        venv.EnvBuilder(with_pip=False, clear=True).create(clean_environment)
        interpreter = venv_python(clean_environment)
        subprocess.run(
            [
                uv,
                "--no-config",
                "pip",
                "install",
                "--python",
                str(interpreter),
                "--no-index",
                "--no-deps",
                str(first_wheel),
            ],
            cwd=temporary,
            env=environment,
            check=True,
        )
        probe = """
import pathlib
import cortexel
from cortexel.generated import STABLE_SKILL_IDS
from cortexel.validate import _load_schema

assert "site-packages" in pathlib.Path(cortexel.__file__).as_posix()
for skill_id in STABLE_SKILL_IDS:
    schema = _load_schema(f"schemas/skills/{skill_id}.request.v1.schema.json")
    assert schema.get("type") == "object"
    request = {
        "contract": {"name": "cortexel-figure-request", "version": "1.0"},
        "skill": {"id": skill_id},
        "data": {},
        "parameters": {},
        "source": {"kind": "simulation"},
    }
    assert cortexel.validate_request_partial(request)
print(f"standalone Python package: {len(STABLE_SKILL_IDS)} schemas load and validate")
"""
        probe_environment = {
            **environment,
            "PYTHONNOUSERSITE": "1",
        }
        probe_environment.pop("PYTHONPATH", None)
        probe_environment.pop("PYTHONHOME", None)
        subprocess.run(
            [str(interpreter), "-I", "-c", probe],
            cwd=temporary,
            env=probe_environment,
            check=True,
        )

        print(
            f"Python package smoke passed for {version}: "
            f"wheel sha256:{sha256(first_wheel.read_bytes())}, "
            f"sdist sha256:{sha256(first_sdist.read_bytes())}, "
            f"{len(expected)} exact schema resources"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
