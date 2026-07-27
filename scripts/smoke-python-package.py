#!/usr/bin/env python3
"""Build, inspect, and clean-install the exact standalone Python distributions."""

from __future__ import annotations

import base64
import csv
import ctypes
import errno
import hashlib
import importlib.metadata
import io
import itertools
import json
import os
import re
import selectors
import shlex
import signal
import stat
import struct
import subprocess
import sys
import sysconfig
import tempfile
import threading
import time
import tomllib
import urllib.request
import venv
import zipfile
import zlib
from pathlib import Path, PurePosixPath
from typing import Callable, Literal, NoReturn, overload


ROOT = Path(__file__).resolve().parents[1]
PYTHON_PROJECT = ROOT / "python"
PACKAGED_CONTRACT = PYTHON_PROJECT / "src" / "cortexel" / "contract"
SOURCE_DATE_EPOCH = "946684800"  # 2000-01-01T00:00:00Z
EXPECTED_UV_VERSION = "0.11.16"
EXPECTED_PACKAGE_BUILD_PYTHON = (3, 14)
IO_CHUNK_BYTES = 1024 * 1024
MAX_SOURCE_FILE_BYTES = 16 * 1024 * 1024
MAX_SOURCE_TOTAL_BYTES = 128 * 1024 * 1024
MAX_REQUIREMENTS_BYTES = 16 * 1024
MAX_RUNTIME_FILE_BYTES = 64 * 1024 * 1024
MAX_RUNTIME_TOTAL_BYTES = 512 * 1024 * 1024
MAX_SOURCE_NODES = 20_000
MAX_SOURCE_DEPTH = 32
MAX_DIRECTORY_CHILDREN = 10_000
MAX_BUILD_OUTPUT_ENTRIES = 16
MAX_SUBPROCESS_OUTPUT_BYTES = 64 * 1024
MAX_RESULT_BYTES = 64 * 1024
MAX_RESULT_JSON_DEPTH = 32
UV_POSIX_SHEBANG_LIMIT_BYTES = 127
PROCESS_CLEANUP_TIMEOUT_SECONDS = 2.0
BUILD_TIMEOUT_SECONDS = 300
INSTALL_TIMEOUT_SECONDS = 120
PROBE_TIMEOUT_SECONDS = 60
MAX_WHEEL_FILE_BYTES = 16 * 1024 * 1024
MAX_WHEEL_TOTAL_BYTES = 128 * 1024 * 1024
MAX_WHEEL_ARCHIVE_BYTES = 128 * 1024 * 1024
MAX_SDIST_COMPRESSED_BYTES = 128 * 1024 * 1024
MAX_SDIST_TAR_BYTES = 256 * 1024 * 1024
MAX_SDIST_FILE_BYTES = 16 * 1024 * 1024
MAX_SDIST_TOTAL_BYTES = 128 * 1024 * 1024
NATIVE_WHEEL_SUFFIX = re.compile(
    r"(?:\.so(?:\.[0-9]+)*|\.dylib|\.pyd|\.dll|\.node|\.exe|\.wasm|\.a|\.lib|\.o|\.obj)\Z",
    re.IGNORECASE,
)
NATIVE_WHEEL_MAGICS = (
    b"\x7fELF",
    b"MZ",
    b"\x00asm",
    b"!<arch>\n",
    b"\xce\xfa\xed\xfe",
    b"\xfe\xed\xfa\xce",
    b"\xcf\xfa\xed\xfe",
    b"\xfe\xed\xfa\xcf",
    b"\xca\xfe\xba\xbe",
    b"\xbe\xba\xfe\xca",
    b"\xca\xfe\xba\xbf",
    b"\xbf\xba\xfe\xca",
)
LOCKED_UV_ENVIRONMENT = {
    "UV_LINK_MODE": "copy",
    "UV_NO_CONFIG": "1",
    "UV_NO_SYSTEM_CONFIG": "1",
    "UV_NO_ENV_FILE": "1",
    "UV_PYTHON_DOWNLOADS": "never",
    "UV_OFFLINE": "1",
}
EXACT_BUILD_BACKEND_DISTRIBUTIONS = {
    "hatchling": "1.31.0",
    "packaging": "26.2",
    "pathspec": "1.1.1",
    "pluggy": "1.6.0",
    "trove-classifiers": "2026.6.1.19",
}
EXACT_BUILD_BACKEND_WHEEL_HASHES = {
    "hatchling": "aac80bec8b6fe35e8480f1c335be8910fa210a0e6f735a139be205dadcacb544",
    "packaging": "5fc45236b9446107ff2415ce77c807cee2862cb6fac22b8a73826d0693b0980e",
    "pathspec": "a00ce642f577bf7f473932318056212bc4f8bfdf53128c78bbd5af0b9b20b189",
    "pluggy": "e920276dd6813095e9377c0bc5566d94c932c33b27a3e3945d8389c374dd4746",
    "trove-classifiers": "ab4c4ec93cc4a4e7815fa759906e05e6bb3f2fbd92ea0f897288c6a43efd15b3",
}
EXACT_BUILD_BACKEND_WHEEL_SIZES = {
    "hatchling": 77_747,
    "packaging": 100_195,
    "pathspec": 57_328,
    "pluggy": 20_538,
    "trove-classifiers": 14_211,
}
EXACT_BUILD_BACKEND_WHEEL_FILENAMES = {
    "hatchling": "hatchling-1.31.0-py3-none-any.whl",
    "packaging": "packaging-26.2-py3-none-any.whl",
    "pathspec": "pathspec-1.1.1-py3-none-any.whl",
    "pluggy": "pluggy-1.6.0-py3-none-any.whl",
    "trove-classifiers": "trove_classifiers-2026.6.1.19-py3-none-any.whl",
}
EXACT_BUILD_BACKEND_WHEEL_URLS = {
    "hatchling": "https://files.pythonhosted.org/packages/64/e2/2c0af0a52d16be74a4f194564fcdc417521ed863e9b65e4bc9052dacba6f/hatchling-1.31.0-py3-none-any.whl",
    "packaging": "https://files.pythonhosted.org/packages/df/b2/87e62e8c3e2f4b32e5fe99e0b86d576da1312593b39f47d8ceef365e95ed/packaging-26.2-py3-none-any.whl",
    "pathspec": "https://files.pythonhosted.org/packages/f1/d9/7fb5aa316bc299258e68c73ba3bddbc499654a07f151cba08f6153988714/pathspec-1.1.1-py3-none-any.whl",
    "pluggy": "https://files.pythonhosted.org/packages/54/20/4d324d65cc6d9205fabedc306948156824eb9f0ee1633355a8f7ec5c66bf/pluggy-1.6.0-py3-none-any.whl",
    "trove-classifiers": "https://files.pythonhosted.org/packages/7c/a4/81502f486f01db95bc8320646a8a12511f5e556cb63d5e224d91816605c4/trove_classifiers-2026.6.1.19-py3-none-any.whl",
}
EXACT_BUILD_BACKEND_ENTRY_POINTS = {
    "hatchling": ("hatchling", "hatchling.cli", "hatchling"),
    "trove-classifiers": (
        "trove-classifiers",
        "trove_classifiers.__main__",
        "cli",
    ),
}
BUILD_BACKEND_REQUIREMENTS = ROOT / ".github" / "requirements" / "python-package-build.txt"
PYTHON_PACKAGE_SMOKE_RESULT_CONTRACT = "cortexel-python-package-smoke-result.v1"
PYTHON_PACKAGE_SMOKE_RESOURCE_COUNT = 21
PYTHON_PACKAGE_SMOKE_SKILL_SCHEMA_COUNT = 19


def fail(message: str) -> NoReturn:
    raise RuntimeError(message)


def require_exact_process_umask() -> None:
    """Reject mode creation that cannot reproduce the reviewed 0644/0755 closure."""

    if os.name != "posix":
        fail("the exact package-build umask boundary currently requires POSIX")
    previous = os.umask(0o022)
    try:
        if previous != 0o022:
            fail(
                "the package-build ambient umask must be exactly 022; create the "
                "dedicated runtime, install the exact backend, and run this smoke "
                "inside one shell that begins with `umask 022`"
            )
    finally:
        os.umask(previous)


def safe_archive_name(name: str) -> PurePosixPath:
    try:
        name.encode("ascii", "strict")
    except UnicodeEncodeError as exc:
        raise RuntimeError(f"archive contains a non-ASCII path: {name!r}") from exc
    if "\\" in name or any(ord(character) < 0x20 or ord(character) == 0x7F for character in name):
        fail(f"archive contains a non-portable path: {name!r}")
    path = PurePosixPath(name)
    if (
        path.is_absolute()
        or not path.parts
        or any(part in ("", ".", "..") for part in path.parts)
        or path.as_posix() != name
    ):
        fail(f"archive contains an unsafe path: {name!r}")
    return path


def _stat_identity(value: os.stat_result) -> tuple[object, ...]:
    return (
        value.st_dev,
        value.st_ino,
        value.st_mode,
        value.st_size,
        value.st_nlink,
        getattr(value, "st_uid", None),
        getattr(value, "st_gid", None),
        getattr(value, "st_mtime_ns", None),
        getattr(value, "st_ctime_ns", None),
        getattr(value, "st_flags", None),
        getattr(value, "st_birthtime", None),
    )


def require_no_extended_acl(path_or_descriptor: Path | int, *, label: str) -> None:
    """Reject discretionary ACL authority that Unix mode bits do not represent."""

    if sys.platform == "darwin":
        libc = ctypes.CDLL(None, use_errno=True)
        libc.acl_get_file.argtypes = [ctypes.c_char_p, ctypes.c_int]
        libc.acl_get_file.restype = ctypes.c_void_p
        libc.acl_get_fd_np.argtypes = [ctypes.c_int, ctypes.c_int]
        libc.acl_get_fd_np.restype = ctypes.c_void_p
        libc.acl_free.argtypes = [ctypes.c_void_p]
        libc.acl_free.restype = ctypes.c_int
        ctypes.set_errno(0)
        if isinstance(path_or_descriptor, int):
            acl = libc.acl_get_fd_np(path_or_descriptor, 0x00000100)
        else:
            acl = libc.acl_get_file(os.fsencode(path_or_descriptor), 0x00000100)
        if acl:
            libc.acl_free(acl)
            fail(f"{label} carries an extended ACL")
        error = ctypes.get_errno()
        if error != errno.ENOENT:
            raise RuntimeError(f"{label} ACL authority cannot be inspected") from OSError(
                error,
                os.strerror(error),
            )
        return

    listxattr = getattr(os, "listxattr", None)
    getxattr = getattr(os, "getxattr", None)
    if sys.platform.startswith("linux") and callable(listxattr) and callable(getxattr):
        try:
            attributes = (
                listxattr(path_or_descriptor)
                if isinstance(path_or_descriptor, int)
                else listxattr(path_or_descriptor, follow_symlinks=False)
            )
        except OSError as exc:
            raise RuntimeError(f"{label} ACL authority cannot be inspected") from exc
        acl_attributes = {
            "system.nfs4_acl",
            "system.posix_acl_access",
            "system.posix_acl_default",
            "system.richacl",
            "trusted.SGI_ACL_DEFAULT",
            "trusted.SGI_ACL_FILE",
        }
        if any(os.fsdecode(attribute) in acl_attributes for attribute in attributes):
            fail(f"{label} carries an extended ACL")
        absent_errors = {errno.ENODATA}
        if hasattr(errno, "ENOATTR"):
            absent_errors.add(errno.ENOATTR)
        for attribute in (
            "system.posix_acl_access",
            "system.posix_acl_default",
        ):
            try:
                if isinstance(path_or_descriptor, int):
                    getxattr(path_or_descriptor, attribute)
                else:
                    getxattr(
                        path_or_descriptor,
                        attribute,
                        follow_symlinks=False,
                    )
            except OSError as exc:
                if exc.errno in absent_errors:
                    continue
                raise RuntimeError(
                    f"{label} ACL authority cannot be inspected"
                ) from exc
            fail(f"{label} carries an extended ACL")
        return

    fail(f"{label} ACL inspection is unsupported on this platform")


def bounded_regular_file_bytes(path: Path, *, maximum: int, label: str) -> bytes:
    """Read one stable regular file only after enforcing its allocation bound."""

    try:
        initial = path.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError(f"{label} is unreadable: {path}") from exc
    if not stat.S_ISREG(initial.st_mode):
        fail(f"{label} must be a regular non-symlink file: {path}")
    if initial.st_nlink != 1:
        fail(f"{label} must have exactly one filesystem link: {path}")
    if initial.st_size > maximum:
        fail(f"{label} exceeds its {maximum}-byte budget: {path}")
    try:
        with path.open("rb") as stream:
            opened = os.fstat(stream.fileno())
            if _stat_identity(opened) != _stat_identity(initial):
                fail(f"{label} changed identity before it could be read: {path}")
            payload = stream.read(maximum + 1)
            final = os.fstat(stream.fileno())
        rebound = path.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError(f"{label} could not be read: {path}") from exc
    if (
        len(payload) > maximum
        or len(payload) != opened.st_size
        or _stat_identity(final) != _stat_identity(opened)
    ):
        fail(f"{label} changed size or exceeded its byte budget while being read: {path}")
    if _stat_identity(rebound) != _stat_identity(opened):
        fail(f"{label} changed identity during or after its stable read: {path}")
    return payload


def assert_regular_files_equal(
    left: Path,
    right: Path,
    *,
    maximum: int,
    label: str,
) -> None:
    """Compare bounded artifacts byte-for-byte without materializing either one."""

    try:
        left_initial = left.stat(follow_symlinks=False)
        right_initial = right.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError(f"{label} artifacts are unreadable") from exc
    for path, value in ((left, left_initial), (right, right_initial)):
        if not stat.S_ISREG(value.st_mode):
            fail(f"{label} artifact must be a regular non-symlink file: {path}")
        if value.st_nlink != 1:
            fail(f"{label} artifact must have exactly one filesystem link: {path}")
        if value.st_size > maximum:
            fail(f"{label} artifact exceeds its {maximum}-byte budget: {path}")
    if left_initial.st_size != right_initial.st_size:
        fail(f"{label} artifacts differ in byte length")
    try:
        with left.open("rb") as left_stream, right.open("rb") as right_stream:
            left_opened = os.fstat(left_stream.fileno())
            right_opened = os.fstat(right_stream.fileno())
            if (
                _stat_identity(left_opened) != _stat_identity(left_initial)
                or _stat_identity(right_opened) != _stat_identity(right_initial)
            ):
                fail(f"{label} artifact identity changed before comparison")
            while True:
                left_chunk = left_stream.read(IO_CHUNK_BYTES)
                right_chunk = right_stream.read(IO_CHUNK_BYTES)
                if left_chunk != right_chunk:
                    fail(f"{label} artifacts are not byte-for-byte reproducible")
                if not left_chunk:
                    break
            left_final = os.fstat(left_stream.fileno())
            right_final = os.fstat(right_stream.fileno())
        left_rebound = left.stat(follow_symlinks=False)
        right_rebound = right.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError(f"{label} artifacts could not be compared") from exc
    if (
        _stat_identity(left_final) != _stat_identity(left_opened)
        or _stat_identity(right_final) != _stat_identity(right_opened)
        or _stat_identity(left_rebound) != _stat_identity(left_initial)
        or _stat_identity(right_rebound) != _stat_identity(right_initial)
    ):
        fail(f"{label} artifact changed during or after comparison")


def sha256_regular_file(path: Path, *, maximum: int, label: str) -> str:
    digest = hashlib.sha256()
    payload = bounded_regular_file_bytes(path, maximum=maximum, label=label)
    for offset in range(0, len(payload), IO_CHUNK_BYTES):
        digest.update(payload[offset : offset + IO_CHUNK_BYTES])
    return digest.hexdigest()


def regular_file_sha256_evidence(
    path: Path,
    *,
    maximum: int,
    label: str,
) -> dict[str, object]:
    """Return one stable file's size and uniformly prefixed SHA-256 identity."""

    try:
        initial = path.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError(f"{label} is unreadable: {path}") from exc
    if not stat.S_ISREG(initial.st_mode):
        fail(f"{label} must be a regular non-symlink file: {path}")
    if initial.st_nlink != 1:
        fail(f"{label} must have exactly one filesystem link: {path}")
    if initial.st_size > maximum:
        fail(f"{label} exceeds its {maximum}-byte budget: {path}")
    digest = hashlib.sha256()
    total = 0
    file_descriptor: int | None = None
    try:
        file_descriptor = os.open(
            path,
            os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC,
        )
        opened = os.fstat(file_descriptor)
        if _stat_identity(opened) != _stat_identity(initial):
            fail(f"{label} changed identity before it could be hashed: {path}")
        while chunk := os.read(file_descriptor, IO_CHUNK_BYTES):
            total += len(chunk)
            if total > maximum:
                fail(f"{label} exceeded its byte budget while being hashed: {path}")
            digest.update(chunk)
        final = os.fstat(file_descriptor)
        os.close(file_descriptor)
        file_descriptor = None
        rebound = path.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError(f"{label} could not be hashed: {path}") from exc
    finally:
        if file_descriptor is not None:
            os.close(file_descriptor)
    if (
        total != opened.st_size
        or _stat_identity(final) != _stat_identity(opened)
        or _stat_identity(rebound) != _stat_identity(initial)
    ):
        fail(f"{label} changed during or after its stable hash: {path}")
    return {
        "sha256": f"sha256:{digest.hexdigest()}",
        "size": total,
    }


def canonical_json_bytes(value: object) -> bytes:
    """Encode protocol JSON with one byte representation and one terminal LF."""

    try:
        encoded = json.dumps(
            value,
            allow_nan=False,
            ensure_ascii=True,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("ascii") + b"\n"
    except (RecursionError, TypeError, ValueError) as exc:
        raise RuntimeError("Python package smoke result is not canonical JSON") from exc
    if len(encoded) > MAX_RESULT_BYTES:
        fail("Python package smoke result exceeds its byte budget")
    return encoded


def inventory_sha256(namespace: str, inventory: dict[str, bytes]) -> str:
    """Hash an exact named-byte inventory without concatenation ambiguity."""

    if (
        not namespace
        or not namespace.isascii()
        or any(ord(character) < 0x21 or ord(character) > 0x7E for character in namespace)
    ):
        fail("inventory hash namespace must be printable nonblank ASCII")
    digest = hashlib.sha256()
    digest.update(b"cortexel-named-byte-inventory-v1\0")
    digest.update(len(namespace).to_bytes(8, "big"))
    digest.update(namespace.encode("ascii"))
    for name, payload in sorted(inventory.items()):
        try:
            encoded_name = name.encode("utf-8", "strict")
        except UnicodeEncodeError as exc:
            raise RuntimeError("inventory name is not valid Unicode") from exc
        digest.update(len(encoded_name).to_bytes(8, "big"))
        digest.update(encoded_name)
        digest.update(len(payload).to_bytes(8, "big"))
        digest.update(payload)
    return f"sha256:{digest.hexdigest()}"


def canonical_value_sha256(namespace: str, value: object) -> str:
    """Domain-separate a canonical-JSON value seal from file-byte digests."""

    payload = canonical_json_bytes(value)
    return inventory_sha256(namespace, {"value.json": payload})


def _require_exact_object(
    value: object,
    *,
    keys: frozenset[str],
    label: str,
) -> dict[str, object]:
    if not isinstance(value, dict):
        received: object = type(value).__name__
        fail(f"{label} key inventory is not exact: received={received}")
    if any(not isinstance(key, str) for key in value):
        fail(f"{label} contains a non-string key")
    if set(value) != keys:
        received = sorted(value)
        fail(f"{label} key inventory is not exact: received={received}")
    return value


def _require_string(value: object, *, label: str) -> str:
    if not isinstance(value, str) or not value:
        fail(f"{label} must be one nonempty string")
    return value


def _require_sha256(value: object, *, label: str) -> str:
    received = _require_string(value, label=label)
    if re.fullmatch(r"sha256:[0-9a-f]{64}", received) is None:
        fail(f"{label} must be one canonical prefixed SHA-256 digest")
    return received


def _require_integer(
    value: object,
    *,
    minimum: int,
    maximum: int,
    label: str,
) -> int:
    if type(value) is not int or not minimum <= value <= maximum:
        fail(f"{label} must be an integer in [{minimum}, {maximum}]")
    return value


def _require_canonical_absolute_path(value: object, *, label: str) -> str:
    received = _require_string(value, label=label)
    if any(
        ord(character) < 0x20
        or 0x7F <= ord(character) <= 0x9F
        or 0xD800 <= ord(character) <= 0xDFFF
        for character in received
    ):
        fail(f"{label} contains an unsupported control or surrogate character")
    path = Path(received)
    if (
        not path.is_absolute()
        or str(path) != received
        or Path(os.path.abspath(received)) != path
        or (os.name == "posix" and received.startswith("//"))
    ):
        fail(f"{label} must be one normalized absolute path")
    return received


def validate_python_package_smoke_result(value: object) -> dict[str, object]:
    """Validate the closed, versioned Python package evidence receipt."""

    result = _require_exact_object(
        value,
        keys=frozenset(
            {
                "artifacts",
                "backendWheelhouse",
                "contract",
                "packageVersion",
                "python",
                "resources",
                "sourceAuthority",
                "status",
                "uv",
            }
        ),
        label="Python package smoke result",
    )
    if result["contract"] != PYTHON_PACKAGE_SMOKE_RESULT_CONTRACT:
        fail("Python package smoke result contract is unsupported")
    if result["status"] != "passed":
        fail("Python package smoke result status must be exactly 'passed'")

    package_version = _require_string(
        result["packageVersion"],
        label="Python package smoke packageVersion",
    )
    if re.fullmatch(r"[0-9a-z]+(?:[._][0-9a-z]+)*", package_version) is None:
        fail("Python package smoke packageVersion is not one canonical package token")

    artifacts = _require_exact_object(
        result["artifacts"],
        keys=frozenset({"sdist", "wheel"}),
        label="Python package smoke artifacts",
    )
    expected_artifact_names = {
        "wheel": f"cortexel-{package_version}-py3-none-any.whl",
        "sdist": f"cortexel-{package_version}.tar.gz",
    }
    artifact_limits = {
        "wheel": MAX_WHEEL_ARCHIVE_BYTES,
        "sdist": MAX_SDIST_COMPRESSED_BYTES,
    }
    for kind in ("sdist", "wheel"):
        artifact = _require_exact_object(
            artifacts[kind],
            keys=frozenset({"filename", "sha256", "size"}),
            label=f"Python package smoke {kind} artifact",
        )
        if artifact["filename"] != expected_artifact_names[kind]:
            fail(f"Python package smoke {kind} filename differs from packageVersion")
        _require_sha256(
            artifact["sha256"],
            label=f"Python package smoke {kind} sha256",
        )
        _require_integer(
            artifact["size"],
            minimum=1,
            maximum=artifact_limits[kind],
            label=f"Python package smoke {kind} size",
        )

    backend = _require_exact_object(
        result["backendWheelhouse"],
        keys=frozenset({"inventory", "path", "sha256"}),
        label="Python package smoke backendWheelhouse",
    )
    _require_canonical_absolute_path(
        backend["path"],
        label="Python package smoke backendWheelhouse path",
    )
    _require_sha256(
        backend["sha256"],
        label="Python package smoke backendWheelhouse sha256",
    )
    inventory = backend["inventory"]
    if not isinstance(inventory, list):
        fail("Python package smoke backendWheelhouse inventory must be one array")
    expected_distributions = sorted(EXACT_BUILD_BACKEND_DISTRIBUTIONS)
    if len(inventory) != len(expected_distributions):
        fail("Python package smoke backendWheelhouse inventory length is not exact")
    for record, distribution in zip(inventory, expected_distributions, strict=True):
        item = _require_exact_object(
            record,
            keys=frozenset(
                {"distribution", "filename", "sha256", "size", "version"}
            ),
            label=f"Python package smoke backend wheel {distribution}",
        )
        expected_values = {
            "distribution": distribution,
            "filename": EXACT_BUILD_BACKEND_WHEEL_FILENAMES[distribution],
            "sha256": f"sha256:{EXACT_BUILD_BACKEND_WHEEL_HASHES[distribution]}",
            "version": EXACT_BUILD_BACKEND_DISTRIBUTIONS[distribution],
        }
        for name, expected in expected_values.items():
            if item[name] != expected:
                fail(
                    "Python package smoke backend wheel authority differs for "
                    f"{distribution}.{name}"
                )
        size = _require_integer(
            item["size"],
            minimum=1,
            maximum=MAX_WHEEL_ARCHIVE_BYTES,
            label=f"Python package smoke backend wheel {distribution} size",
        )
        if size != EXACT_BUILD_BACKEND_WHEEL_SIZES[distribution]:
            fail(
                "Python package smoke backend wheel authority differs for "
                f"{distribution}.size"
            )
    if backend["sha256"] != canonical_value_sha256(
        "cortexel-python-package-backend-wheelhouse-v1",
        inventory,
    ):
        fail("Python package smoke backendWheelhouse seal differs from its inventory")

    python_identity = _require_exact_object(
        result["python"],
        keys=frozenset(
            {
                "baseExecutable",
                "baseExecutableSha256",
                "baseExecutableSize",
                "executable",
                "executableSha256",
                "executableSize",
                "implementation",
                "prefix",
                "version",
            }
        ),
        label="Python package smoke python identity",
    )
    if python_identity["implementation"] != "cpython":
        fail("Python package smoke python implementation must be exactly cpython")
    if not isinstance(python_identity["version"], str) or re.fullmatch(
        r"3\.14\.(?:0|[1-9][0-9]*)",
        python_identity["version"],
    ) is None:
        fail("Python package smoke python version must be one canonical 3.14.x version")
    prefix = Path(
        _require_canonical_absolute_path(
            python_identity["prefix"],
            label="Python package smoke python prefix",
        )
    )
    executable = Path(
        _require_canonical_absolute_path(
            python_identity["executable"],
            label="Python package smoke python executable",
        )
    )
    base_executable = Path(
        _require_canonical_absolute_path(
            python_identity["baseExecutable"],
            label="Python package smoke python baseExecutable",
        )
    )
    if executable == prefix:
        fail("Python package smoke python executable must be below its prefix")
    if not executable.is_relative_to(prefix):
        fail("Python package smoke python executable escapes its prefix")
    if base_executable in {executable, prefix}:
        fail("Python package smoke Python authorities must name distinct paths")
    for field in ("baseExecutableSha256", "executableSha256"):
        _require_sha256(
            python_identity[field],
            label=f"Python package smoke python {field}",
        )
    for field in ("baseExecutableSize", "executableSize"):
        _require_integer(
            python_identity[field],
            minimum=1,
            maximum=MAX_RUNTIME_TOTAL_BYTES,
            label=f"Python package smoke python {field}",
        )

    uv_identity = _require_exact_object(
        result["uv"],
        keys=frozenset({"executable", "sha256", "size", "version"}),
        label="Python package smoke uv identity",
    )
    uv_executable = Path(
        _require_canonical_absolute_path(
            uv_identity["executable"],
            label="Python package smoke uv executable",
        )
    )
    if uv_executable in {base_executable, executable, prefix}:
        fail("Python package smoke runtime roles must name distinct paths")
    if uv_identity["version"] != EXPECTED_UV_VERSION:
        fail(f"Python package smoke uv version must be exactly {EXPECTED_UV_VERSION}")
    _require_sha256(uv_identity["sha256"], label="Python package smoke uv sha256")
    _require_integer(
        uv_identity["size"],
        minimum=1,
        maximum=MAX_RUNTIME_TOTAL_BYTES,
        label="Python package smoke uv size",
    )

    resources = _require_exact_object(
        result["resources"],
        keys=frozenset({"resourceCount", "skillSchemaCount"}),
        label="Python package smoke resources",
    )
    resource_count = _require_integer(
        resources["resourceCount"],
        minimum=1,
        maximum=MAX_SOURCE_NODES,
        label="Python package smoke resourceCount",
    )
    skill_schema_count = _require_integer(
        resources["skillSchemaCount"],
        minimum=1,
        maximum=MAX_SOURCE_NODES,
        label="Python package smoke skillSchemaCount",
    )
    if skill_schema_count > resource_count:
        fail("Python package smoke skillSchemaCount exceeds resourceCount")
    if (
        resource_count != PYTHON_PACKAGE_SMOKE_RESOURCE_COUNT
        or skill_schema_count != PYTHON_PACKAGE_SMOKE_SKILL_SCHEMA_COUNT
    ):
        fail("Python package smoke resource counts differ from the v1 contract")
    source_authority = _require_exact_object(
        result["sourceAuthority"],
        keys=frozenset({"sha256"}),
        label="Python package smoke sourceAuthority",
    )
    _require_sha256(
        source_authority["sha256"],
        label="Python package smoke sourceAuthority sha256",
    )
    return result


def _reject_duplicate_json_members(
    pairs: list[tuple[str, object]],
) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            fail(f"Python package smoke result repeats JSON member {key!r}")
        result[key] = value
    return result


def _reject_nonfinite_json_constant(value: str) -> NoReturn:
    fail(f"Python package smoke result contains invalid JSON constant {value!r}")


def _require_bounded_result_json_depth(text: str) -> None:
    """Reject structural amplification independently of CPython recursion policy."""

    depth = 0
    in_string = False
    escaped = False
    for character in text:
        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            continue
        if character == '"':
            in_string = True
        elif character in "[{":
            depth += 1
            if depth > MAX_RESULT_JSON_DEPTH:
                raise ValueError("Python package smoke result exceeds its JSON depth budget")
        elif character in "]}":
            depth -= 1
            if depth < 0:
                raise ValueError("Python package smoke result has unbalanced JSON structure")


def read_python_package_smoke_result(path: Path) -> dict[str, object]:
    """Read one stable, canonical, duplicate-free result receipt fail-closed."""

    if os.name != "posix":
        fail("the strict Python package smoke result reader currently requires POSIX")
    if (
        not path.is_absolute()
        or Path(os.path.abspath(path)) != path
        or str(path).startswith("//")
    ):
        fail("Python package smoke result path must be one normalized absolute path")
    parent = path.parent
    try:
        resolved_parent = parent.resolve(strict=True)
        parent_initial = parent.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError("Python package smoke result parent is unreadable") from exc
    if (
        resolved_parent != parent
        or not stat.S_ISDIR(parent_initial.st_mode)
        or parent_initial.st_nlink < 1
        or parent_initial.st_uid != os.geteuid()
    ):
        fail(
            "Python package smoke result parent must be one canonical, "
            "effective-owner physical directory"
        )
    if stat.S_IMODE(parent_initial.st_mode) != 0o700:
        fail("Python package smoke result parent mode must be exactly 0700")
    require_no_extended_acl(parent, label="Python package smoke result parent")

    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    file_flags = os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW | os.O_CLOEXEC
    parent_descriptor: int | None = None
    file_descriptor: int | None = None
    try:
        parent_descriptor = os.open(parent, directory_flags)
        parent_opened = os.fstat(parent_descriptor)
        parent_rebound = parent.stat(follow_symlinks=False)
        expected_parent_identity = _stat_identity(parent_initial)
        if (
            _stat_identity(parent_opened) != expected_parent_identity
            or _stat_identity(parent_rebound) != expected_parent_identity
        ):
            fail("Python package smoke result parent changed before its strict read")
        if (
            not stat.S_ISDIR(parent_opened.st_mode)
            or parent_opened.st_nlink < 1
            or parent_opened.st_uid != os.geteuid()
            or stat.S_IMODE(parent_opened.st_mode) != 0o700
        ):
            fail("Python package smoke result parent authority is invalid")
        require_no_extended_acl(
            parent_descriptor,
            label="Python package smoke result parent",
        )

        leaf_initial = os.stat(
            path.name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(leaf_initial.st_mode)
            or leaf_initial.st_uid != os.geteuid()
        ):
            fail(
                "Python package smoke result must be one canonical, "
                "effective-owner physical regular file"
            )
        if stat.S_IMODE(leaf_initial.st_mode) != 0o644:
            fail("Python package smoke result mode must be exactly 0644")
        if leaf_initial.st_nlink != 1:
            fail("Python package smoke result must have exactly one filesystem link")
        if leaf_initial.st_size > MAX_RESULT_BYTES:
            fail(
                "Python package smoke result exceeds its "
                f"{MAX_RESULT_BYTES}-byte budget"
            )

        file_descriptor = os.open(
            path.name,
            file_flags,
            dir_fd=parent_descriptor,
        )
        leaf_opened = os.fstat(file_descriptor)
        expected_leaf_identity = _stat_identity(leaf_initial)
        if _stat_identity(leaf_opened) != expected_leaf_identity:
            fail("Python package smoke result changed while being opened")
        require_no_extended_acl(
            file_descriptor,
            label="Python package smoke result",
        )

        chunks = bytearray()
        while len(chunks) <= MAX_RESULT_BYTES:
            chunk = os.read(
                file_descriptor,
                min(IO_CHUNK_BYTES, MAX_RESULT_BYTES + 1 - len(chunks)),
            )
            if not chunk:
                break
            chunks.extend(chunk)
        require_no_extended_acl(
            file_descriptor,
            label="Python package smoke result",
        )
        leaf_final = os.fstat(file_descriptor)
        leaf_rebound = os.stat(
            path.name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            len(chunks) > MAX_RESULT_BYTES
            or len(chunks) != leaf_opened.st_size
            or _stat_identity(leaf_final) != expected_leaf_identity
            or _stat_identity(leaf_rebound) != expected_leaf_identity
        ):
            fail("Python package smoke result changed during or after its strict read")

        payload = bytes(chunks)
        try:
            text = payload.decode("utf-8", "strict")
            _require_bounded_result_json_depth(text)
            decoded = json.loads(
                text,
                object_pairs_hook=_reject_duplicate_json_members,
                parse_constant=_reject_nonfinite_json_constant,
            )
        except (RecursionError, UnicodeDecodeError, ValueError) as exc:
            raise RuntimeError(
                "Python package smoke result is not strict UTF-8 JSON"
            ) from exc
        result = validate_python_package_smoke_result(decoded)
        if canonical_json_bytes(result) != payload:
            fail("Python package smoke result bytes are not canonical JSON with one LF")

        require_no_extended_acl(
            file_descriptor,
            label="Python package smoke result",
        )
        leaf_validated = os.fstat(file_descriptor)
        leaf_path_validated = os.stat(
            path.name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            _stat_identity(leaf_validated) != expected_leaf_identity
            or _stat_identity(leaf_path_validated) != expected_leaf_identity
        ):
            fail("Python package smoke result changed during strict validation")

        require_no_extended_acl(
            parent_descriptor,
            label="Python package smoke result parent",
        )
        parent_final = os.fstat(parent_descriptor)
        require_no_extended_acl(parent, label="Python package smoke result parent")
        parent_path_final = parent.stat(follow_symlinks=False)
        resolved_parent_final = parent.resolve(strict=True)
        if (
            _stat_identity(parent_final) != expected_parent_identity
            or _stat_identity(parent_path_final) != expected_parent_identity
            or resolved_parent_final != parent
        ):
            fail("Python package smoke result parent changed during its strict read")
    except OSError as exc:
        raise RuntimeError("Python package smoke result strict read failed") from exc
    finally:
        if file_descriptor is not None:
            os.close(file_descriptor)
        if parent_descriptor is not None:
            os.close(parent_descriptor)
    return result


def _directory_authority_identity(value: os.stat_result) -> tuple[object, ...]:
    """Exclude timestamps that this protocol's own directory entry creation changes."""

    return (
        value.st_dev,
        value.st_ino,
        value.st_mode,
        getattr(value, "st_uid", None),
        getattr(value, "st_gid", None),
        getattr(value, "st_flags", None),
        getattr(value, "st_birthtime", None),
    )


def _new_result_parent(path: Path) -> tuple[Path, tuple[object, ...]]:
    if os.name != "posix":
        fail("the durable Python package smoke result currently requires POSIX")
    if not path.is_absolute() or str(path) != str(path.resolve(strict=False)):
        fail("Python package smoke result output must be a canonical absolute path")
    parent = path.parent
    try:
        resolved_parent = parent.resolve(strict=True)
        parent_status = parent.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError("Python package smoke result parent is unreadable") from exc
    if (
        resolved_parent != parent
        or not stat.S_ISDIR(parent_status.st_mode)
        or stat.S_IMODE(parent_status.st_mode) != 0o700
        or parent_status.st_uid != os.geteuid()
    ):
        fail(
            "Python package smoke result parent must be one protected, "
            "effective-owner physical directory with exact 0700 mode"
        )
    require_no_extended_acl(parent, label="Python package smoke result parent")
    try:
        path.stat(follow_symlinks=False)
    except FileNotFoundError:
        return parent, _directory_authority_identity(parent_status)
    except OSError as exc:
        raise RuntimeError("Python package smoke result output cannot be inspected") from exc
    fail("Python package smoke result output must be absent")


def _require_result_parent_authority_unchanged(
    authority: tuple[Path, tuple[object, ...]],
) -> None:
    parent, expected_identity = authority
    try:
        resolved = parent.resolve(strict=True)
        status = parent.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError("Python package smoke result parent became unreadable") from exc
    if (
        resolved != parent
        or not stat.S_ISDIR(status.st_mode)
        or _directory_authority_identity(status) != expected_identity
    ):
        fail("Python package smoke result parent changed after initial authorization")
    require_no_extended_acl(parent, label="Python package smoke result parent")


def _authorize_new_result_path(
    argument: str,
) -> tuple[Path, tuple[Path, tuple[object, ...]]]:
    """Retain raw CLI spelling long enough to reject normalized path aliases."""

    path = Path(
        _require_canonical_absolute_path(
            argument,
            label="Python package smoke result output argument",
        )
    )
    return path, _new_result_parent(path)


def _require_result_path_outside_authorities(
    path: Path,
    authorities: dict[str, Path],
) -> None:
    """Prevent the receipt write from invalidating any authority it attests."""

    for label, authority in authorities.items():
        try:
            resolved = authority.resolve(strict=True)
            status = authority.stat(follow_symlinks=False)
        except OSError as exc:
            raise RuntimeError(f"{label} cannot be resolved for result isolation") from exc
        if resolved != authority or not stat.S_ISDIR(status.st_mode):
            fail(f"{label} must be one canonical physical directory")
        if path.is_relative_to(resolved):
            fail(f"Python package smoke result output overlaps {label}")


def _require_result_path_disjoint_from_evidence(
    path: Path,
    *,
    uv: str,
) -> None:
    declared_wheelhouse = os.environ.get("CORTEXEL_BUILD_BACKEND_WHEELHOUSE")
    if declared_wheelhouse is None:
        fail("the retained build-backend wheelhouse is not declared")
    _require_result_path_outside_authorities(
        path,
        {
            "the Cortexel source authority": ROOT,
            "the retained build-backend wheelhouse": Path(declared_wheelhouse),
            "the reviewed Python runtime prefix": Path(sys.prefix),
            "the reviewed Python base prefix": Path(sys.base_prefix),
            "the reviewed uv executable parent": Path(uv).parent,
        },
    )


def write_python_package_smoke_result(
    path: Path,
    value: object,
    *,
    expected_parent_authority: tuple[Path, tuple[object, ...]] | None = None,
) -> None:
    """Durably create one validated receipt without replacing any filesystem object."""

    result = validate_python_package_smoke_result(value)
    payload = canonical_json_bytes(result)
    parent, expected_parent_identity = _new_result_parent(path)
    if expected_parent_authority is not None and expected_parent_authority != (
        parent,
        expected_parent_identity,
    ):
        fail("Python package smoke result parent changed after initial authorization")
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    file_flags = (
        os.O_RDWR
        | os.O_CREAT
        | os.O_EXCL
        | os.O_NOFOLLOW
        | os.O_CLOEXEC
    )
    try:
        parent_descriptor = os.open(parent, directory_flags)
    except OSError as exc:
        raise RuntimeError("Python package smoke result parent cannot be opened") from exc
    file_descriptor: int | None = None
    try:
        parent_opened = os.fstat(parent_descriptor)
        parent_path_status = parent.stat(follow_symlinks=False)
        if (
            _directory_authority_identity(parent_opened) != expected_parent_identity
            or _directory_authority_identity(parent_path_status)
            != expected_parent_identity
        ):
            fail("Python package smoke result parent changed before creation")
        require_no_extended_acl(
            parent_descriptor,
            label="Python package smoke result parent",
        )
        try:
            file_descriptor = os.open(
                path.name,
                file_flags,
                0o600,
                dir_fd=parent_descriptor,
            )
        except OSError as exc:
            raise RuntimeError(
                "Python package smoke result could not be created exclusively"
            ) from exc
        os.fchmod(file_descriptor, 0o644)
        require_no_extended_acl(
            file_descriptor,
            label="Python package smoke result",
        )
        offset = 0
        while offset < len(payload):
            written = os.write(file_descriptor, payload[offset:])
            if written <= 0:
                fail("Python package smoke result write made no progress")
            offset += written
        os.fsync(file_descriptor)
        written_status = os.fstat(file_descriptor)
        if (
            not stat.S_ISREG(written_status.st_mode)
            or stat.S_IMODE(written_status.st_mode) != 0o644
            or written_status.st_nlink != 1
            or written_status.st_size != len(payload)
        ):
            fail("Python package smoke result identity differs after its durable write")
        os.lseek(file_descriptor, 0, os.SEEK_SET)
        reread = bytearray()
        while len(reread) <= len(payload):
            chunk = os.read(file_descriptor, len(payload) + 1 - len(reread))
            if not chunk:
                break
            reread.extend(chunk)
        final_status = os.fstat(file_descriptor)
        require_no_extended_acl(
            file_descriptor,
            label="Python package smoke result",
        )
        if bytes(reread) != payload or _stat_identity(final_status) != _stat_identity(
            written_status
        ):
            fail("Python package smoke result changed during its durable reinspection")
        os.close(file_descriptor)
        file_descriptor = None
        os.fsync(parent_descriptor)
        parent_final = os.fstat(parent_descriptor)
        parent_path_final = parent.stat(follow_symlinks=False)
        require_no_extended_acl(
            parent_descriptor,
            label="Python package smoke result parent",
        )
        if (
            _directory_authority_identity(parent_final) != expected_parent_identity
            or _directory_authority_identity(parent_path_final)
            != expected_parent_identity
        ):
            fail("Python package smoke result parent changed during creation")
        linked_status = os.stat(
            path.name,
            dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        if (
            linked_status.st_dev != final_status.st_dev
            or linked_status.st_ino != final_status.st_ino
        ):
            fail("Python package smoke result directory entry changed after creation")
        require_no_extended_acl(path, label="Python package smoke result")
    except OSError as exc:
        raise RuntimeError("Python package smoke result durable write failed") from exc
    finally:
        if file_descriptor is not None:
            os.close(file_descriptor)
        os.close(parent_descriptor)
    if read_python_package_smoke_result(path) != result:
        fail("Python package smoke result differs after path-level reinspection")
    parent_after = parent.stat(follow_symlinks=False)
    linked_after = path.stat(follow_symlinks=False)
    require_no_extended_acl(parent, label="Python package smoke result parent")
    require_no_extended_acl(path, label="Python package smoke result")
    if (
        _directory_authority_identity(parent_after) != expected_parent_identity
        or linked_after.st_dev != final_status.st_dev
        or linked_after.st_ino != final_status.st_ino
    ):
        fail("Python package smoke result authority changed after path-level reinspection")


def bounded_tree_entries(
    root: Path,
    *,
    label: str,
) -> tuple[list[Path], list[Path]]:
    """Return bounded regular files/directories without following indirection."""

    try:
        root_status = root.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError(f"{label} root is unreadable: {root}") from exc
    if not stat.S_ISDIR(root_status.st_mode):
        fail(f"{label} root must be one physical directory: {root}")
    files: list[Path] = []
    directories: list[Path] = []
    stack: list[tuple[Path, int]] = [(root, 0)]
    nodes = 0
    while stack:
        directory, depth = stack.pop()
        try:
            with os.scandir(directory) as iterator:
                children = list(
                    itertools.islice(iterator, MAX_DIRECTORY_CHILDREN + 1)
                )
        except OSError as exc:
            raise RuntimeError(f"{label} directory is unreadable: {directory}") from exc
        if len(children) > MAX_DIRECTORY_CHILDREN:
            fail(f"{label} directory child budget exceeded: {directory}")
        for child in sorted(children, key=lambda value: value.name, reverse=True):
            path = Path(child.path)
            nodes += 1
            if nodes > MAX_SOURCE_NODES:
                fail(f"{label} filesystem node budget exceeded")
            try:
                child_status = child.stat(follow_symlinks=False)
            except OSError as exc:
                raise RuntimeError(f"{label} entry is unreadable: {path}") from exc
            if stat.S_ISLNK(child_status.st_mode):
                fail(f"{label} contains a symbolic link: {path}")
            if stat.S_ISDIR(child_status.st_mode):
                child_depth = depth + 1
                if child_depth > MAX_SOURCE_DEPTH:
                    fail(f"{label} directory depth budget exceeded: {path}")
                directories.append(path)
                stack.append((path, child_depth))
            elif stat.S_ISREG(child_status.st_mode):
                files.append(path)
            else:
                fail(f"{label} contains a special filesystem entry: {path}")
    return sorted(files), sorted(directories)


def bounded_directory_entries(directory: Path, *, label: str) -> list[Path]:
    try:
        with os.scandir(directory) as iterator:
            entries = list(itertools.islice(iterator, MAX_BUILD_OUTPUT_ENTRIES + 1))
    except OSError as exc:
        raise RuntimeError(f"{label} is unreadable: {directory}") from exc
    if len(entries) > MAX_BUILD_OUTPUT_ENTRIES:
        fail(f"{label} entry budget exceeded")
    return sorted(Path(entry.path) for entry in entries)


def expected_uv_entry_point_script(
    runtime_python: str,
    module: str,
    function: str,
) -> bytes:
    """Reproduce uv 0.11.16's exact POSIX entry-point launcher."""

    if any(character in runtime_python for character in ("\0", "\n", "\r")):
        fail("the reviewed Python path contains an unsupported control character")
    shebang_length = 2 + len(runtime_python.encode("utf-8")) + 1
    if shebang_length > UV_POSIX_SHEBANG_LIMIT_BYTES or " " in runtime_python:
        escaped_python = runtime_python.replace("'", "'\"'\"'")
        shebang = (
            "#!/bin/sh\n"
            f"'''exec' '{escaped_python}' \"$0\" \"$@\"\n"
            "' '''"
        )
    else:
        shebang = f"#!{runtime_python}"
    return (
        f"{shebang}\n"
        "# -*- coding: utf-8 -*-\n"
        "import sys\n"
        f"from {module} import {function}\n"
        'if __name__ == "__main__":\n'
        '    if sys.argv[0].endswith("-script.pyw"):\n'
        "        sys.argv[0] = sys.argv[0][:-11]\n"
        '    elif sys.argv[0].endswith(".exe"):\n'
        "        sys.argv[0] = sys.argv[0][:-4]\n"
        f"    sys.exit({function}())\n"
    ).encode("utf-8")


_SUBPROCESS_CANCELLATION_SIGNALS = frozenset(
    signal_number
    for signal_number in (
        getattr(signal, "SIGINT", None),
        getattr(signal, "SIGTERM", None),
        getattr(signal, "SIGHUP", None),
    )
    if signal_number is not None
)


class _DarwinProcTaskInfo(ctypes.Structure):
    """Darwin proc_taskinfo through its kernel-visible thread count."""

    _fields_ = (
        ("pti_virtual_size", ctypes.c_uint64),
        ("pti_resident_size", ctypes.c_uint64),
        ("pti_total_user", ctypes.c_uint64),
        ("pti_total_system", ctypes.c_uint64),
        ("pti_threads_user", ctypes.c_uint64),
        ("pti_threads_system", ctypes.c_uint64),
        ("pti_policy", ctypes.c_int32),
        ("pti_faults", ctypes.c_int32),
        ("pti_pageins", ctypes.c_int32),
        ("pti_cow_faults", ctypes.c_int32),
        ("pti_messages_sent", ctypes.c_int32),
        ("pti_messages_received", ctypes.c_int32),
        ("pti_syscalls_mach", ctypes.c_int32),
        ("pti_syscalls_unix", ctypes.c_int32),
        ("pti_csw", ctypes.c_int32),
        ("pti_threadnum", ctypes.c_int32),
        ("pti_numrunning", ctypes.c_int32),
        ("pti_priority", ctypes.c_int32),
    )


def _operating_system_thread_count() -> int:
    """Return the kernel-visible thread count on supported package hosts."""

    if sys.platform == "darwin":
        if (
            ctypes.sizeof(_DarwinProcTaskInfo) != 96
            or _DarwinProcTaskInfo.pti_threadnum.offset != 84
        ):
            fail("the Darwin proc_taskinfo layout is unsupported")
        try:
            function = ctypes.CDLL(
                "/usr/lib/libproc.dylib", use_errno=True
            ).proc_pidinfo
        except (AttributeError, OSError) as exc:
            raise RuntimeError(
                "Darwin process-thread authority is unavailable"
            ) from exc
        function.argtypes = (
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_uint64,
            ctypes.c_void_p,
            ctypes.c_int,
        )
        function.restype = ctypes.c_int
        information = _DarwinProcTaskInfo()
        ctypes.set_errno(0)
        result = function(
            os.getpid(),
            4,  # PROC_PIDTASKINFO.
            0,
            ctypes.byref(information),
            ctypes.sizeof(information),
        )
        if result != ctypes.sizeof(information) or information.pti_threadnum <= 0:
            error_number = ctypes.get_errno()
            raise RuntimeError(
                "cannot establish Darwin process-thread authority"
            ) from (
                OSError(error_number, os.strerror(error_number))
                if error_number
                else None
            )
        return information.pti_threadnum
    if sys.platform.startswith("linux"):
        try:
            with os.scandir("/proc/self/task") as entries:
                count = sum(1 for _ in entries)
        except OSError as exc:
            raise RuntimeError(
                "cannot establish Linux process-thread authority"
            ) from exc
        if count <= 0:
            fail("Linux process-thread authority is invalid")
        return count
    fail("the bounded package subprocess boundary lacks kernel thread accounting")


def _assert_exclusive_child_reaper_authority(label: str) -> None:
    """Fail closed unless this process exclusively owns child reaping."""

    if signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL:
        fail(f"{label} requires exclusive default SIGCHLD authority")
    if threading.active_count() != 1 or _operating_system_thread_count() != 1:
        fail(f"{label} requires exclusive single-threaded child-reaping authority")


class _ChildProcessAnchorLost(RuntimeError):
    """The child was reaped outside this lifecycle; numeric identity is unsafe."""


class _UnreapedProcessExitObserver:
    """Observe one owned child without releasing its PID/PGID anchor."""

    def __init__(self, label: str) -> None:
        self.label = label
        self.process_id: int | None = None
        self.reaped = False
        self.return_code: int | None = None

    def bind(self, process_id: int) -> None:
        if self.process_id is not None or process_id <= 1:
            fail(f"{self.label} leader identity is invalid")
        self.process_id = process_id

    def exited(self) -> bool:
        if self.reaped:
            fail(f"{self.label} exit was queried after reaping")
        if self.process_id is None:
            fail(f"{self.label} exit observer is unbound")
        for _ in range(64):
            try:
                result = os.waitid(
                    os.P_PID,
                    self.process_id,
                    os.WEXITED | os.WNOHANG | os.WNOWAIT,
                )
            except ChildProcessError as exc:
                raise _ChildProcessAnchorLost(
                    f"{self.label} leader was reaped outside its owner"
                ) from exc
            except OSError as exc:
                if exc.errno == errno.EINTR:
                    continue
                if exc.errno == errno.ECHILD:
                    raise _ChildProcessAnchorLost(
                        f"{self.label} leader was reaped outside its owner"
                    ) from exc
                raise RuntimeError(f"cannot observe {self.label} leader") from exc
            if result is None or result.si_pid == 0:
                return False
            if result.si_pid != self.process_id:
                fail(f"{self.label} exit observation changed child identity")
            if result.si_code not in {
                os.CLD_EXITED,
                os.CLD_KILLED,
                os.CLD_DUMPED,
            }:
                fail(f"{self.label} exit observation reported an invalid state")
            return True
        fail(f"{self.label} child observation remained interrupted")

    def mark_reaped(self, return_code: int) -> None:
        self.reaped = True
        self.return_code = return_code


def _note_exception(error: BaseException, note: str) -> None:
    add_note = getattr(error, "add_note", None)
    if callable(add_note):
        add_note(note)


def _fresh_unreaped_child_observation(
    observer: _UnreapedProcessExitObserver,
) -> tuple[bool, BaseException | None]:
    """Prove child ownership, retaining transient interruptions until cleanup."""

    interruption: BaseException | None = None
    for _ in range(64):
        try:
            return observer.exited(), interruption
        except _ChildProcessAnchorLost:
            raise
        except BaseException as exc:
            if interruption is None:
                interruption = exc
            else:
                _note_exception(
                    interruption,
                    "additional child-ownership observation interruption: "
                    f"{type(exc).__name__}: {exc}",
                )
    error = RuntimeError(
        f"{observer.label} child ownership could not be independently proved"
    )
    assert interruption is not None
    raise error from interruption


def _signal_private_process_group(process_group_id: int) -> str:
    """Make the sole numeric PGID signal while the leader remains unreaped."""

    try:
        os.killpg(process_group_id, signal.SIGKILL)
    except OSError as exc:
        if exc.errno == errno.ESRCH:
            return "absent"
        if exc.errno == errno.EPERM:
            return "permission_denied"
        raise RuntimeError("cannot signal the package subprocess group") from exc
    return "delivered"


def _wait_for_unreaped_process_exit(
    observer: _UnreapedProcessExitObserver,
    *,
    label: str,
) -> BaseException | None:
    deadline = time.monotonic() + PROCESS_CLEANUP_TIMEOUT_SECONDS
    interruption: BaseException | None = None
    while True:
        exited, observation_interruption = _fresh_unreaped_child_observation(observer)
        if observation_interruption is not None:
            if interruption is None:
                interruption = observation_interruption
            else:
                _note_exception(
                    interruption,
                    "additional exit-confirmation interruption: "
                    f"{type(observation_interruption).__name__}: "
                    f"{observation_interruption}",
                )
        if exited:
            return interruption
        if time.monotonic() >= deadline:
            fail(f"{label} direct process survived group cleanup")
        time.sleep(0.01)


def _cleanup_private_process_group(
    process: subprocess.Popen[bytes],
    observer: _UnreapedProcessExitObserver,
    *,
    label: str,
    before_reap: Callable[[], None] | None = None,
) -> int:
    """Signal once while anchored, drain, and only then reap exactly once."""

    if observer.process_id is not None and observer.process_id != process.pid:
        fail(f"{label} cleanup changed child identity")
    if observer.reaped:
        if observer.return_code is None or observer.process_id is None:
            fail(f"{label} reap state is incomplete")
        return observer.return_code
    if observer.process_id is None:
        observer.bind(process.pid)

    # Establish structural ownership, observe without reaping, then establish
    # structural ownership again and make a final WNOWAIT observation. The last
    # operation before killpg is therefore an independent child-identity proof.
    _assert_exclusive_child_reaper_authority(label)
    _, observation_error = _fresh_unreaped_child_observation(observer)
    _assert_exclusive_child_reaper_authority(label)

    # ECHILD here forbids every later numeric signal and Popen.wait call.
    leader_exited_before_signal, final_observation_error = (
        _fresh_unreaped_child_observation(observer)
    )
    if observation_error is None:
        observation_error = final_observation_error
    elif final_observation_error is not None:
        _note_exception(
            observation_error,
            "final pre-signal observation was also interrupted: "
            f"{type(final_observation_error).__name__}: {final_observation_error}",
        )
    signal_error: BaseException | None = None
    signal_status = "error"
    try:
        signal_status = _signal_private_process_group(process.pid)
    except BaseException as exc:
        signal_error = exc

    darwin_zombie_only = (
        signal_status == "permission_denied"
        and sys.platform == "darwin"
        and leader_exited_before_signal
    )
    absent_after_exit = signal_status == "absent" and leader_exited_before_signal
    group_signal_safe = (
        signal_status == "delivered" or darwin_zombie_only or absent_after_exit
    )
    if not group_signal_safe and signal_error is None:
        if signal_status == "permission_denied":
            signal_error = RuntimeError(f"{label} process-group cleanup was denied")
        elif signal_status == "absent":
            signal_error = RuntimeError(
                f"{label} process group disappeared before leader exit"
            )
        else:
            signal_error = RuntimeError(
                f"{label} process-group cleanup was inconclusive"
            )

    leader_exit_observed = leader_exited_before_signal
    fallback_observation_error: BaseException | None = None
    if not group_signal_safe:
        # The group operation may have raced an external reaper. Re-prove both
        # structural and kernel child authority before any direct PID signal.
        # ECHILD forbids both os.kill and the final Popen.wait.
        _assert_exclusive_child_reaper_authority(label)
        leader_exit_observed, fallback_observation_error = (
            _fresh_unreaped_child_observation(observer)
        )

    # A direct fallback is still anchored here. Popen.kill/terminate are banned:
    # their implementations may poll and reap before sending the signal.
    if not group_signal_safe and not leader_exit_observed:
        try:
            os.kill(process.pid, signal.SIGKILL)
        except OSError as exc:
            if signal_error is None:
                signal_error = RuntimeError(f"cannot kill {label} leader")
                signal_error.__cause__ = exc
        except BaseException as exc:
            if signal_error is None:
                signal_error = exc
            else:
                _note_exception(
                    signal_error,
                    f"direct leader signal was interrupted: {type(exc).__name__}: {exc}",
                )

    # Re-observe even an already-exited leader. This catches an external reap
    # that raced the group operation before entering the final reap-only region.
    exit_confirmation_error: BaseException | None = None
    try:
        exit_confirmation_error = _wait_for_unreaped_process_exit(
            observer,
            label=label,
        )
    except _ChildProcessAnchorLost:
        raise
    except BaseException as exc:
        exit_confirmation_error = exc

    drain_error: BaseException | None = None
    if before_reap is not None:
        try:
            before_reap()
        except BaseException as exc:
            drain_error = exc

    # Draining may be long enough for an uncooperative in-process owner to reap
    # the child. Re-prove structural and kernel ownership one last time. Failure
    # here forbids Popen.wait just as it forbids every earlier numeric fallback.
    _assert_exclusive_child_reaper_authority(label)
    _, final_reap_observation_error = _fresh_unreaped_child_observation(observer)

    # No signal, waitid probe, or process-state query is permitted below this
    # line. Retry only the reap if it is interrupted; signals remain blocked.
    reap_deadline = time.monotonic() + PROCESS_CLEANUP_TIMEOUT_SECONDS
    wait_interruption: BaseException | None = None
    wait_error: BaseException | None = None
    return_code: int | None = None
    wait_attempts = 0
    while return_code is None:
        remaining = reap_deadline - time.monotonic()
        if remaining <= 0:
            wait_error = RuntimeError(f"{label} leader could not be reaped")
            break
        try:
            wait_attempts += 1
            return_code = process.wait(timeout=remaining)
        except subprocess.TimeoutExpired as exc:
            if wait_interruption is None:
                wait_interruption = exc
            else:
                _note_exception(
                    wait_interruption,
                    f"additional leader-reap timeout: {exc}",
                )
            if wait_attempts >= 64:
                wait_error = RuntimeError(f"{label} leader could not be reaped")
                wait_error.__cause__ = exc
                break
        except BaseException as exc:
            if wait_interruption is None:
                wait_interruption = exc
            else:
                _note_exception(
                    wait_interruption,
                    f"additional leader-reap interruption: {type(exc).__name__}: {exc}",
                )
            cached_return_code = getattr(process, "returncode", None)
            if cached_return_code is not None:
                return_code = cached_return_code

    if wait_error is not None:
        for secondary_label, secondary in (
            ("group signal failure", signal_error),
            ("ownership observation failure", observation_error),
            ("fallback observation failure", fallback_observation_error),
            ("exit confirmation failure", exit_confirmation_error),
            ("pipe drain failure", drain_error),
            ("final reap observation failure", final_reap_observation_error),
            ("wait interruption", wait_interruption),
        ):
            if secondary is not None:
                _note_exception(
                    wait_error,
                    f"{secondary_label}: {type(secondary).__name__}: {secondary}",
                )
        raise wait_error
    assert return_code is not None
    observer.mark_reaped(return_code)

    primary = (
        signal_error
        or observation_error
        or fallback_observation_error
        or exit_confirmation_error
        or drain_error
        or final_reap_observation_error
        or wait_interruption
    )
    if primary is not None:
        for secondary_label, secondary in (
            ("group signal failure", signal_error),
            ("ownership observation failure", observation_error),
            ("fallback observation failure", fallback_observation_error),
            ("exit confirmation failure", exit_confirmation_error),
            ("pipe drain failure", drain_error),
            ("final reap observation failure", final_reap_observation_error),
            ("wait interruption", wait_interruption),
        ):
            if secondary is not None and secondary is not primary:
                _note_exception(
                    primary,
                    f"{secondary_label}: {type(secondary).__name__}: {secondary}",
                )
        raise primary
    return return_code


class _DeferredSubprocessCancellation(BaseException):
    def __init__(self, signal_number: int) -> None:
        super().__init__(signal_number)
        self.signal_number = signal_number


def _raise_if_subprocess_cancellation_pending() -> None:
    pending = signal.sigpending() & _SUBPROCESS_CANCELLATION_SIGNALS
    if pending:
        raise _DeferredSubprocessCancellation(min(pending))


def _run_checked_with_blocked_cancellation(
    command: list[str],
    *,
    cwd: Path,
    environment: dict[str, str],
    timeout: int,
    label: str,
    capture_output: bool,
) -> tuple[int, bytes, bytes]:
    """Run one command while retaining its unreaped PID/PGID authority."""

    required_waitid = (
        "P_PID",
        "WEXITED",
        "WNOHANG",
        "WNOWAIT",
        "CLD_EXITED",
        "CLD_KILLED",
        "CLD_DUMPED",
        "waitid",
    )
    if (
        os.name != "posix"
        or not hasattr(os, "killpg")
        or not all(hasattr(os, name) for name in required_waitid)
    ):
        fail("the bounded package subprocess boundary requires POSIX WNOWAIT")
    _assert_exclusive_child_reaper_authority(label)

    # Initialize every lifecycle object and closure before Popen so the child is
    # followed immediately by the cleanup guard. Supported cancellation signals
    # remain blocked across this entire function.
    process: subprocess.Popen[bytes]
    observer = _UnreapedProcessExitObserver(label)
    stdout_target = subprocess.PIPE if capture_output else None
    stderr_target = subprocess.PIPE if capture_output else None
    selector: selectors.BaseSelector | None = None
    stdout_stream: io.BufferedReader | None = None
    stderr_stream: io.BufferedReader | None = None
    captured = {"stdout": bytearray(), "stderr": bytearray()}
    body_error: BaseException | None = None
    cleanup_error: BaseException | None = None
    return_code: int | None = None

    def read_ready_streams(*, deadline: float, retain_output: bool) -> None:
        if selector is None:
            return
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            fail(f"{label} pipe drain timed out")
        for key, _events in selector.select(min(remaining, 0.1)):
            chunk = os.read(key.fd, IO_CHUNK_BYTES)
            if not chunk:
                selector.unregister(key.fileobj)
                continue
            if retain_output:
                captured[key.data].extend(chunk)
                if sum(map(len, captured.values())) > MAX_SUBPROCESS_OUTPUT_BYTES:
                    fail(
                        f"{label} exceeded its {MAX_SUBPROCESS_OUTPUT_BYTES}-byte "
                        "captured-output budget"
                    )

    def drain_after_group_signal() -> None:
        if selector is None:
            return
        deadline = time.monotonic() + PROCESS_CLEANUP_TIMEOUT_SECONDS
        while selector.get_map():
            read_ready_streams(deadline=deadline, retain_output=body_error is None)

    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=stdout_target,
            stderr=stderr_target,
            close_fds=True,
            start_new_session=True,
        )
    except OSError as exc:
        raise RuntimeError(f"{label} could not be launched") from exc

    # No fallible operation occurs between Popen and this lifecycle guard.
    try:
        try:
            observer.bind(process.pid)
            stdout_stream = process.stdout
            stderr_stream = process.stderr
            if capture_output:
                if stdout_stream is None or stderr_stream is None:
                    fail(f"{label} output pipes were not created")
                selector = selectors.DefaultSelector()
                selector.register(stdout_stream, selectors.EVENT_READ, "stdout")
                selector.register(stderr_stream, selectors.EVENT_READ, "stderr")
            deadline = time.monotonic() + timeout
            while not observer.exited():
                _raise_if_subprocess_cancellation_pending()
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    fail(f"{label} exceeded its {timeout}-second timeout")
                if selector is not None and selector.get_map():
                    read_ready_streams(deadline=deadline, retain_output=True)
                else:
                    time.sleep(min(remaining, 0.01))
        except BaseException as exc:
            body_error = exc
    finally:
        try:
            return_code = _cleanup_private_process_group(
                process,
                observer,
                label=label,
                before_reap=drain_after_group_signal,
            )
        except BaseException as exc:
            cleanup_error = exc
        for resource in (selector, process.stdout, process.stderr):
            if resource is not None:
                try:
                    resource.close()
                except BaseException as exc:
                    if cleanup_error is None:
                        cleanup_error = exc
                    else:
                        _note_exception(cleanup_error, f"resource close failed: {exc}")

    if cleanup_error is not None:
        if body_error is not None:
            _note_exception(
                cleanup_error,
                f"suppressed operation error: {type(body_error).__name__}: {body_error}",
            )
        raise cleanup_error
    if body_error is not None:
        raise body_error
    if return_code is None:
        fail(f"{label} leader was not safely reaped")
    return return_code, bytes(captured["stdout"]), bytes(captured["stderr"])


@overload
def run_checked(
    command: list[str],
    *,
    cwd: Path,
    environment: dict[str, str],
    timeout: int,
    label: str,
    capture_output: bool = False,
    text: Literal[False] = False,
) -> subprocess.CompletedProcess[bytes]: ...


@overload
def run_checked(
    command: list[str],
    *,
    cwd: Path,
    environment: dict[str, str],
    timeout: int,
    label: str,
    capture_output: bool,
    text: Literal[True],
) -> subprocess.CompletedProcess[str]: ...


def run_checked(
    command: list[str],
    *,
    cwd: Path,
    environment: dict[str, str],
    timeout: int,
    label: str,
    capture_output: bool = False,
    text: bool = False,
) -> subprocess.CompletedProcess[str] | subprocess.CompletedProcess[bytes]:
    if timeout <= 0:
        fail(f"{label} timeout must be positive")
    if not all(hasattr(signal, name) for name in ("pthread_sigmask", "sigpending")):
        fail("the bounded package subprocess boundary requires POSIX signal masks")
    previous_mask = signal.pthread_sigmask(
        signal.SIG_BLOCK,
        _SUBPROCESS_CANCELLATION_SIGNALS,
    )
    deferred_signal: int | None = None
    result: tuple[int, bytes, bytes] | None = None
    try:
        result = _run_checked_with_blocked_cancellation(
            command,
            cwd=cwd,
            environment=environment,
            timeout=timeout,
            label=label,
            capture_output=capture_output,
        )
    except _DeferredSubprocessCancellation as exc:
        deferred_signal = exc.signal_number
    finally:
        signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)
    if deferred_signal is not None:
        fail(f"{label} cancellation signal was deferred until after cleanup")
    assert result is not None
    return_code, output_bytes, error_bytes = result
    if text:
        output: str | bytes = output_bytes.decode("utf-8", "strict")
        error: str | bytes = error_bytes.decode("utf-8", "strict")
    else:
        output = output_bytes
        error = error_bytes
    if return_code:
        raise subprocess.CalledProcessError(
            return_code,
            command,
            output=output if capture_output else None,
            stderr=error if capture_output else None,
        )
    return subprocess.CompletedProcess(
        command,
        return_code,
        output if capture_output else None,
        error if capture_output else None,
    )


def verify_build_backend_requirements(
    path: Path = BUILD_BACKEND_REQUIREMENTS,
) -> bytes:
    """Bind the bootstrap lock to the exact universal wheels reviewed here."""

    inventories = (
        set(EXACT_BUILD_BACKEND_DISTRIBUTIONS),
        set(EXACT_BUILD_BACKEND_WHEEL_HASHES),
        set(EXACT_BUILD_BACKEND_WHEEL_SIZES),
        set(EXACT_BUILD_BACKEND_WHEEL_FILENAMES),
        set(EXACT_BUILD_BACKEND_WHEEL_URLS),
    )
    if any(inventory != inventories[0] for inventory in inventories[1:]):
        fail("the build-backend wheel authority inventories differ")
    if not set(EXACT_BUILD_BACKEND_ENTRY_POINTS).issubset(inventories[0]):
        fail("the build-backend entry-point authority names an unknown distribution")
    lines: list[str] = []
    for name, version in EXACT_BUILD_BACKEND_DISTRIBUTIONS.items():
        digest = EXACT_BUILD_BACKEND_WHEEL_HASHES[name]
        if re.fullmatch(r"[0-9a-f]{64}", digest) is None:
            fail(f"the reviewed wheel digest is not canonical SHA-256: {name}")
        lines.extend(
            (
                f"{name}=={version} \\\n",
                f"    --hash=sha256:{digest}\n",
            )
        )
    expected = "".join(lines).encode("ascii")
    try:
        actual = bounded_regular_file_bytes(
            path,
            maximum=MAX_REQUIREMENTS_BYTES,
            label="exact build-backend requirements lock",
        )
    except OSError as exc:
        raise RuntimeError("the exact build-backend requirements lock is unreadable") from exc
    if actual != expected:
        fail("the exact wheel-only build-backend requirements lock has drifted")
    return actual


def require_build_backend_requirements_unchanged(
    expected: bytes,
    path: Path = BUILD_BACKEND_REQUIREMENTS,
) -> None:
    """Compare each exact-policy validation with the initially retained bytes."""

    if verify_build_backend_requirements(path) != expected:
        fail("the exact build-backend requirements authority changed")


def download_build_backend_wheelhouse(destination: Path) -> None:
    """Materialize the retained, hash-pinned build wheel evidence exactly once."""

    if (
        sys.implementation.name != "cpython"
        or sys.version_info[:2] != EXPECTED_PACKAGE_BUILD_PYTHON
    ):
        fail("the build-backend wheelhouse bootstrap requires CPython 3.14.x")
    if (
        sys.flags.isolated != 1
        or sys.flags.no_site != 1
        or sys.flags.dont_write_bytecode != 1
    ):
        fail("the wheelhouse bootstrap must run in isolated no-site/no-bytecode mode (-I -S -B)")
    verify_build_backend_requirements()
    if not destination.is_absolute():
        fail("the build-backend wheelhouse destination must be absolute")
    try:
        destination.mkdir(mode=0o700)
    except OSError as exc:
        raise RuntimeError(
            "the build-backend wheelhouse destination must be new and creatable"
        ) from exc
    if destination.resolve(strict=True) != destination:
        fail("the build-backend wheelhouse destination must be a canonical physical path")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for name in EXACT_BUILD_BACKEND_DISTRIBUTIONS:
        filename = EXACT_BUILD_BACKEND_WHEEL_FILENAMES[name]
        url = EXACT_BUILD_BACKEND_WHEEL_URLS[name]
        if url.rsplit("/", 1)[-1] != filename:
            fail(f"the reviewed build-backend URL/filename binding drifted: {name}")
        target = destination / filename
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "cortexel-python-package-evidence/1"},
        )
        try:
            with opener.open(request, timeout=60) as response, target.open("xb") as stream:
                if response.status != 200 or response.geturl() != url:
                    fail(f"the reviewed build-backend download identity drifted: {name}")
                declared_length = response.headers.get("Content-Length")
                if (
                    declared_length is None
                    or not declared_length.isascii()
                    or not declared_length.isdecimal()
                    or int(declared_length) != EXACT_BUILD_BACKEND_WHEEL_SIZES[name]
                ):
                    fail(f"the reviewed build-backend download length is invalid: {name}")
                total = 0
                digest = hashlib.sha256()
                while chunk := response.read(IO_CHUNK_BYTES):
                    total += len(chunk)
                    if total > MAX_WHEEL_ARCHIVE_BYTES:
                        fail(f"the reviewed build-backend wheel is oversized: {name}")
                    digest.update(chunk)
                    stream.write(chunk)
                if total != EXACT_BUILD_BACKEND_WHEEL_SIZES[name]:
                    fail(f"the reviewed build-backend download is truncated: {name}")
                os.fchmod(stream.fileno(), 0o644)
                stream.flush()
                os.fsync(stream.fileno())
        except OSError as exc:
            raise RuntimeError(f"the reviewed build-backend download failed: {name}") from exc
        if digest.hexdigest() != EXACT_BUILD_BACKEND_WHEEL_HASHES[name]:
            fail(f"the reviewed build-backend wheel hash differs: {name}")
        if sha256_regular_file(
            target,
            maximum=MAX_WHEEL_ARCHIVE_BYTES,
            label=f"retained {name} backend wheel",
        ) != EXACT_BUILD_BACKEND_WHEEL_HASHES[name]:
            fail(f"the retained build-backend wheel changed after download: {name}")
    retained_files, retained_directories = bounded_tree_entries(
        destination,
        label="new retained build-backend wheelhouse",
    )
    if retained_directories or {
        path.relative_to(destination).as_posix() for path in retained_files
    } != set(EXACT_BUILD_BACKEND_WHEEL_FILENAMES.values()):
        fail("the new retained build-backend wheelhouse inventory is not exact")
    try:
        directory_descriptor = os.open(destination, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)
    except OSError as exc:
        raise RuntimeError("the retained build-backend wheelhouse is not durable") from exc


def _backend_wheel_files(
    wheel: Path,
    *,
    distribution_name: str,
    version: str,
    expected_digest: str,
) -> tuple[dict[str, bytes], str]:
    """Project one exact hash-rooted backend wheel into installed-file authority."""

    payload = bounded_regular_file_bytes(
        wheel,
        maximum=MAX_WHEEL_ARCHIVE_BYTES,
        label=f"reviewed {distribution_name} backend wheel",
    )
    if hashlib.sha256(payload).hexdigest() != expected_digest:
        fail(f"reviewed backend wheel hash differs from its pinned digest: {distribution_name}")
    canonical_distribution = distribution_name.replace("-", "_")
    dist_info = f"{canonical_distribution}-{version}.dist-info"
    record_path = f"{dist_info}/RECORD"
    files: dict[str, bytes] = {}
    total_bytes = 0
    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            infos = archive.infolist()
            if len(infos) > 10_000:
                fail(f"reviewed backend wheel entry budget exceeded: {distribution_name}")
            for info in infos:
                path = safe_archive_name(info.filename)
                if info.is_dir() or info.filename != path.as_posix():
                    fail(f"reviewed backend wheel contains a non-file path: {info.filename!r}")
                if info.filename in files:
                    fail(f"reviewed backend wheel repeats path {info.filename!r}")
                if path.parts[0].endswith(".data"):
                    fail(f"reviewed backend wheel requires unsupported install remapping: {distribution_name}")
                if info.file_size > MAX_WHEEL_FILE_BYTES:
                    fail(f"reviewed backend wheel member is oversized: {info.filename}")
                total_bytes += info.file_size
                if total_bytes > MAX_WHEEL_TOTAL_BYTES:
                    fail(f"reviewed backend wheel payload budget exceeded: {distribution_name}")
                member = archive.read(info)
                if len(member) != info.file_size:
                    fail(f"reviewed backend wheel member is truncated: {info.filename}")
                reject_native_wheel_payload(info.filename, member)
                files[info.filename] = member
    except zipfile.BadZipFile as exc:
        raise RuntimeError(
            f"reviewed backend wheel is not a valid ZIP: {distribution_name}"
        ) from exc
    foreign_dist_info = {
        path.parts[0]
        for name in files
        if (path := PurePosixPath(name)).parts[0].endswith(".dist-info")
    }
    if foreign_dist_info != {dist_info} or record_path not in files:
        fail(f"reviewed backend wheel identity differs from filename authority: {distribution_name}")
    inspect_wheel_record(files[record_path], files=files, record_path=record_path)
    metadata = files.get(f"{dist_info}/METADATA", b"")
    metadata_headers = metadata.partition(b"\n\n")[0].splitlines()
    if metadata_headers.count(f"Name: {distribution_name}".encode("ascii")) != 1 or (
        metadata_headers.count(f"Version: {version}".encode("ascii")) != 1
    ):
        fail(f"reviewed backend wheel metadata identity differs: {distribution_name}")
    entry_points_path = f"{dist_info}/entry_points.txt"
    entry_point = EXACT_BUILD_BACKEND_ENTRY_POINTS.get(distribution_name)
    if entry_point is None:
        if entry_points_path in files:
            fail(f"reviewed backend wheel has unexpected entry-point authority: {distribution_name}")
    else:
        script_name, module, function = entry_point
        expected_entry_points = (
            f"[console_scripts]\n{script_name} = {module}:{function}\n"
        ).encode("ascii")
        if files.get(entry_points_path) != expected_entry_points:
            fail(f"reviewed backend wheel entry-point authority differs: {distribution_name}")
    return files, dist_info


def reviewed_build_backend_evidence() -> tuple[
    dict[str, dict[str, bytes]], dict[str, str]
]:
    """Read the exact retained wheelhouse and return its independent install projection."""

    declared = os.environ.get("CORTEXEL_BUILD_BACKEND_WHEELHOUSE")
    if declared is None:
        fail(
            "CORTEXEL_BUILD_BACKEND_WHEELHOUSE must name the retained exact-five-wheel evidence"
        )
    wheelhouse = Path(declared)
    if not wheelhouse.is_absolute():
        fail("the retained build-backend wheelhouse must be absolute")
    try:
        resolved = wheelhouse.resolve(strict=True)
        status = wheelhouse.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError("the retained build-backend wheelhouse cannot be resolved") from exc
    if (
        resolved != wheelhouse
        or not stat.S_ISDIR(status.st_mode)
        or status.st_mode & (stat.S_IWGRP | stat.S_IWOTH)
    ):
        fail("the retained build-backend wheelhouse must be one protected physical directory")
    wheel_files, wheel_directories = bounded_tree_entries(
        wheelhouse,
        label="retained build-backend wheelhouse",
    )
    expected_filenames = set(EXACT_BUILD_BACKEND_WHEEL_FILENAMES.values())
    received_filenames = {path.relative_to(wheelhouse).as_posix() for path in wheel_files}
    if wheel_directories or received_filenames != expected_filenames:
        fail(
            "the retained build-backend wheelhouse inventory is not exact: "
            f"expected={sorted(expected_filenames)}, received={sorted(received_filenames)}"
        )
    for wheel_file in wheel_files:
        if stat.S_IMODE(wheel_file.stat(follow_symlinks=False).st_mode) != 0o644:
            fail(f"retained build-backend wheel mode is not exact 0644: {wheel_file.name}")
    projections: dict[str, dict[str, bytes]] = {}
    claimed_installed: set[str] = set()
    dist_infos: dict[str, str] = {}
    for name, version in EXACT_BUILD_BACKEND_DISTRIBUTIONS.items():
        filename = EXACT_BUILD_BACKEND_WHEEL_FILENAMES[name]
        url = EXACT_BUILD_BACKEND_WHEEL_URLS[name]
        if url.rsplit("/", 1)[-1] != filename:
            fail(f"the retained wheel URL/filename authority differs: {name}")
        files, dist_info = _backend_wheel_files(
            wheelhouse / filename,
            distribution_name=name,
            version=version,
            expected_digest=EXACT_BUILD_BACKEND_WHEEL_HASHES[name],
        )
        record_path = f"{dist_info}/RECORD"
        projection = {
            relative: member
            for relative, member in files.items()
            if relative != record_path
        }
        for relative in projection:
            if relative in claimed_installed:
                fail(f"reviewed backend wheels collide at installed path: {relative}")
            claimed_installed.add(relative)
        projections[name] = projection
        dist_infos[name] = dist_info
    return projections, dist_infos


def build_backend_wheelhouse_result() -> dict[str, object]:
    """Re-read the retained exact-five inventory as a portable content receipt."""

    declared = os.environ.get("CORTEXEL_BUILD_BACKEND_WHEELHOUSE")
    if declared is None:
        fail("the retained build-backend wheelhouse is not declared")
    wheelhouse = Path(declared)
    try:
        resolved = wheelhouse.resolve(strict=True)
        status = wheelhouse.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError("the retained build-backend wheelhouse cannot be sealed") from exc
    if (
        wheelhouse != resolved
        or not stat.S_ISDIR(status.st_mode)
        or status.st_mode & (stat.S_IWGRP | stat.S_IWOTH)
    ):
        fail("the retained build-backend wheelhouse identity changed before sealing")
    initial_root_identity = _stat_identity(status)
    files, directories = bounded_tree_entries(
        wheelhouse,
        label="result build-backend wheelhouse",
    )
    if directories or {path.name for path in files} != set(
        EXACT_BUILD_BACKEND_WHEEL_FILENAMES.values()
    ):
        fail("the retained build-backend wheelhouse inventory changed before sealing")
    initial_file_identities = {
        path.name: _stat_identity(path.stat(follow_symlinks=False)) for path in files
    }
    if _stat_identity(wheelhouse.stat(follow_symlinks=False)) != initial_root_identity:
        fail("the retained build-backend wheelhouse changed during initial enumeration")
    inventory: list[dict[str, object]] = []
    for distribution in sorted(EXACT_BUILD_BACKEND_DISTRIBUTIONS):
        filename = EXACT_BUILD_BACKEND_WHEEL_FILENAMES[distribution]
        path = wheelhouse / filename
        if stat.S_IMODE(path.stat(follow_symlinks=False).st_mode) != 0o644:
            fail(f"result backend wheel mode is not exact 0644: {filename}")
        evidence = regular_file_sha256_evidence(
            path,
            maximum=MAX_WHEEL_ARCHIVE_BYTES,
            label=f"result backend wheel {distribution}",
        )
        expected_digest = f"sha256:{EXACT_BUILD_BACKEND_WHEEL_HASHES[distribution]}"
        if evidence["sha256"] != expected_digest:
            fail(f"result backend wheel digest changed: {distribution}")
        if _stat_identity(path.stat(follow_symlinks=False)) != initial_file_identities[
            filename
        ]:
            fail(f"result backend wheel identity changed: {distribution}")
        inventory.append(
            {
                "distribution": distribution,
                "filename": filename,
                "sha256": expected_digest,
                "size": evidence["size"],
                "version": EXACT_BUILD_BACKEND_DISTRIBUTIONS[distribution],
            }
        )
    final_files, final_directories = bounded_tree_entries(
        wheelhouse,
        label="final result build-backend wheelhouse",
    )
    final_filenames = {path.name for path in final_files}
    if final_directories or final_filenames != set(initial_file_identities):
        fail("the retained build-backend wheelhouse inventory changed while sealing")
    try:
        final_resolved = wheelhouse.resolve(strict=True)
        final_root_status = wheelhouse.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError(
            "the retained build-backend wheelhouse disappeared while sealing"
        ) from exc
    if final_resolved != resolved or _stat_identity(final_root_status) != initial_root_identity:
        fail("the retained build-backend wheelhouse root changed while sealing")
    for path in final_files:
        if _stat_identity(path.stat(follow_symlinks=False)) != initial_file_identities[
            path.name
        ]:
            fail(f"result backend wheel changed after hashing: {path.name}")
    return {
        "inventory": inventory,
        "path": str(resolved),
        "sha256": canonical_value_sha256(
            "cortexel-python-package-backend-wheelhouse-v1",
            inventory,
        ),
    }


def resource_bytes() -> dict[str, bytes]:
    resources: dict[str, bytes] = {}
    total = 0
    contract_files, _contract_directories = bounded_tree_entries(
        PACKAGED_CONTRACT,
        label="Python contract source tree",
    )
    for path in contract_files:
        relative = path.relative_to(PACKAGED_CONTRACT).as_posix()
        if path.suffix != ".json":
            fail(f"Python contract source tree contains a non-JSON file: {relative}")
        payload = bounded_regular_file_bytes(
            path,
            maximum=MAX_SOURCE_FILE_BYTES,
            label=f"Python contract source {relative}",
        )
        total += len(payload)
        if total > MAX_SOURCE_TOTAL_BYTES:
            fail("Python contract sources exceed their total byte budget")
        resources[relative] = payload
    if not resources:
        fail("the generator-owned Python contract projection is empty")
    return resources


def _metadata_header(name: str, value: object) -> str:
    if not isinstance(value, str) or not value or any(
        ord(character) < 0x20 or ord(character) == 0x7F for character in value
    ):
        fail(f"python/pyproject.toml contains an invalid Core Metadata value for {name}")
    return f"{name}: {value}"


def expected_core_metadata(project: object, readme: bytes) -> bytes:
    """Derive the one reviewed Core Metadata serialization from source authority."""

    if not isinstance(project, dict):
        fail("python/pyproject.toml must decode to a table")
    table = project.get("project")
    expected_keys = {
        "name",
        "version",
        "description",
        "readme",
        "requires-python",
        "license",
        "license-files",
        "authors",
        "keywords",
        "classifiers",
        "dependencies",
        "urls",
    }
    if not isinstance(table, dict) or set(table) != expected_keys:
        fail("Python project metadata fields differ from the closed release policy")
    if table.get("name") != "cortexel":
        fail("Python project name must be exactly cortexel")
    if table.get("readme") != "README.md":
        fail("Python project readme must be exactly README.md")
    if table.get("license") != "MIT" or table.get("license-files") != ["LICENSE"]:
        fail("Python project license metadata must be the exact MIT license record")
    if table.get("requires-python") != ">=3.11":
        fail("Python project requires-python must be exactly >=3.11")
    if table.get("dependencies") != []:
        fail("the standalone Python package must not declare dependencies")

    authors = table.get("authors")
    if (
        not isinstance(authors, list)
        or not authors
        or any(
            not isinstance(author, dict)
            or set(author) != {"name"}
            or not isinstance(author["name"], str)
            or not author["name"]
            for author in authors
        )
    ):
        fail("Python project authors must contain only nonempty name records")
    keywords = table.get("keywords")
    classifiers = table.get("classifiers")
    urls = table.get("urls")
    if (
        not isinstance(keywords, list)
        or not keywords
        or any(not isinstance(value, str) or not value for value in keywords)
        or len(set(keywords)) != len(keywords)
    ):
        fail("Python project keywords must be unique nonempty strings")
    if (
        not isinstance(classifiers, list)
        or not classifiers
        or any(not isinstance(value, str) or not value for value in classifiers)
        or len(set(classifiers)) != len(classifiers)
    ):
        fail("Python project classifiers must be unique nonempty strings")
    if (
        not isinstance(urls, dict)
        or not urls
        or any(
            not isinstance(name, str)
            or not name
            or not isinstance(value, str)
            or not value
            for name, value in urls.items()
        )
    ):
        fail("Python project URLs must be nonempty string pairs")
    try:
        readme_text = readme.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise RuntimeError("python/README.md is not UTF-8") from exc
    if "\r" in readme_text or "\x00" in readme_text or not readme_text.endswith("\n"):
        fail("python/README.md must be canonical LF-terminated UTF-8")

    headers = [
        "Metadata-Version: 2.4",
        _metadata_header("Name", table["name"]),
        _metadata_header("Version", table["version"]),
        _metadata_header("Summary", table["description"]),
    ]
    headers.extend(
        _metadata_header("Project-URL", f"{name}, {value}")
        for name, value in urls.items()
    )
    headers.append(
        _metadata_header(
            "Author",
            ", ".join(author["name"] for author in authors),
        )
    )
    headers.extend(
        (
            "License-Expression: MIT",
            "License-File: LICENSE",
            _metadata_header("Keywords", ",".join(sorted(keywords))),
        )
    )
    headers.extend(_metadata_header("Classifier", value) for value in sorted(classifiers))
    headers.extend(("Requires-Python: >=3.11", "Description-Content-Type: text/markdown"))
    return ("\n".join(headers) + "\n\n" + readme_text).encode("utf-8")


def inspect_core_metadata(
    payload: bytes,
    label: str,
    expected_version: str,
    expected_payload: bytes,
) -> None:
    metadata = payload.decode("utf-8", "strict")
    if "\r" in metadata or "\x00" in metadata or "\n\n" not in metadata:
        fail(f"{label} is not canonical LF-delimited Core Metadata")
    header_text, _body = metadata.split("\n\n", 1)
    headers: dict[str, list[str]] = {}
    for line in header_text.split("\n"):
        if line.startswith((" ", "\t")) or ": " not in line:
            fail(f"{label} contains a folded or malformed header")
        name, value = line.split(": ", 1)
        if re.fullmatch(r"[A-Za-z][A-Za-z0-9-]*", name) is None or not value:
            fail(f"{label} contains an invalid header name or empty value")
        if any(ord(character) < 0x20 or ord(character) == 0x7F for character in value):
            fail(f"{label} contains a control byte in a header value")
        headers.setdefault(name.casefold(), []).append(value)
    forbidden = {"requires-dist", "provides-extra", "requires-external", "dynamic"}
    if forbidden.intersection(headers):
        fail(f"{label} unexpectedly advertises runtime dependencies or optional extras")
    required = {
        "metadata-version": "2.4",
        "name": "cortexel",
        "version": expected_version,
        "license-expression": "MIT",
        "license-file": "LICENSE",
        "requires-python": ">=3.11",
    }
    for name, value in required.items():
        if headers.get(name) != [value]:
            fail(f"{label} must contain exactly {name}: {value}")
    if payload != expected_payload:
        fail(f"{label} differs from the exact pyproject/README-derived metadata")


def sdist_source_bytes() -> dict[str, bytes]:
    """Return the exact build-input inventory that the sdist may reproduce."""

    selected: dict[str, bytes] = {}
    total = 0
    fixed = (".gitignore", "LICENSE", "README.md", "pyproject.toml", "tests/test_cortexel.py")
    for relative in fixed:
        path = PYTHON_PROJECT / relative
        if path.is_symlink() or not path.is_file():
            fail(f"sdist build input must be a regular file: python/{relative}")
        payload = bounded_regular_file_bytes(
            path,
            maximum=MAX_SOURCE_FILE_BYTES,
            label=f"sdist source python/{relative}",
        )
        total += len(payload)
        if total > MAX_SOURCE_TOTAL_BYTES:
            fail("sdist build inputs exceed their total byte budget")
        selected[relative] = payload

    package_root = PYTHON_PROJECT / "src" / "cortexel"
    package_files, _package_directories = bounded_tree_entries(
        package_root,
        label="Python package source tree",
    )
    for path in package_files:
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
        payload = bounded_regular_file_bytes(
            path,
            maximum=MAX_SOURCE_FILE_BYTES,
            label=f"sdist source python/{relative}",
        )
        total += len(payload)
        if total > MAX_SOURCE_TOTAL_BYTES:
            fail("sdist build inputs exceed their total byte budget")
        selected[relative] = payload
    return selected


def materialize_detached_project(destination: Path, sources: dict[str, bytes]) -> None:
    """Create a VCS-free copy from the exact source inventory, not a broad tree copy."""

    destination.mkdir(mode=0o755)
    destination.chmod(0o755)
    for relative, payload in sorted(sources.items()):
        source_path = safe_archive_name(relative)
        target = destination.joinpath(*source_path.parts)
        target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
        for directory in itertools.takewhile(
            lambda candidate: candidate != destination.parent,
            target.parents,
        ):
            directory.chmod(0o755)
        target.write_bytes(payload)
        target.chmod(0o644)


def verify_detached_project(destination: Path, sources: dict[str, bytes]) -> None:
    files, directories = bounded_tree_entries(
        destination,
        label="detached Python package source",
    )
    actual_names = {path.relative_to(destination).as_posix() for path in files}
    if actual_names != set(sources):
        fail("detached Python package source inventory changed")
    expected_directories = {
        parent.as_posix()
        for relative in sources
        for parent in PurePosixPath(relative).parents
        if parent.parts
    }
    if {
        path.relative_to(destination).as_posix() for path in directories
    } != expected_directories:
        fail("detached Python package directory inventory changed")
    for path in files:
        relative = path.relative_to(destination).as_posix()
        if stat.S_IMODE(path.stat(follow_symlinks=False).st_mode) != 0o644:
            fail(f"detached Python package file mode changed: {relative}")
        if bounded_regular_file_bytes(
            path,
            maximum=MAX_SOURCE_FILE_BYTES,
            label=f"detached Python package source {relative}",
        ) != sources[relative]:
            fail(f"detached Python package source bytes changed: {relative}")
    for path in directories:
        if stat.S_IMODE(path.stat(follow_symlinks=False).st_mode) != 0o755:
            fail(f"detached Python package directory mode changed: {path}")


def verify_source_authority_unchanged(
    expected_resources: dict[str, bytes],
    expected_sources: dict[str, bytes],
    expected_license: bytes,
    expected_backend_requirements: bytes,
) -> None:
    """Re-read every build input so a backend cannot persist source mutations."""

    if resource_bytes() != expected_resources:
        fail("Python contract source authority changed during the package smoke")
    if sdist_source_bytes() != expected_sources:
        fail("Python package source authority changed during the package smoke")
    current_license = bounded_regular_file_bytes(
        ROOT / "LICENSE",
        maximum=MAX_SOURCE_FILE_BYTES,
        label="root project license",
    )
    if current_license != expected_license:
        fail("root project license authority changed during the package smoke")
    require_build_backend_requirements_unchanged(expected_backend_requirements)


def wheel_package_bytes(expected_sources: dict[str, bytes]) -> dict[str, bytes]:
    prefix = "src/cortexel/"
    packaged = {
        relative.removeprefix("src/"): payload
        for relative, payload in expected_sources.items()
        if relative.startswith(prefix)
    }
    if not packaged:
        fail("wheel package source inventory is empty")
    return packaged


def reject_native_wheel_payload(name: str, payload: bytes) -> None:
    if NATIVE_WHEEL_SUFFIX.search(name) is not None or any(
        payload.startswith(magic) for magic in NATIVE_WHEEL_MAGICS
    ):
        fail(f"pure-Python wheel contains a native payload: {name}")


def inspect_wheel_metadata(payload: bytes, hatchling_version: str) -> None:
    expected = (
        "Wheel-Version: 1.0\n"
        f"Generator: hatchling {hatchling_version}\n"
        "Root-Is-Purelib: true\n"
        "Tag: py3-none-any\n"
    ).encode("ascii")
    if payload != expected:
        fail("wheel metadata is not the exact pure py3-none-any Hatchling record")


def inspect_wheel_record(
    payload: bytes,
    *,
    files: dict[str, bytes],
    record_path: str,
    allowed_external_paths: frozenset[str] = frozenset(),
) -> None:
    """Verify every wheel file against one unambiguous RECORD row."""

    try:
        text = payload.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise RuntimeError("wheel RECORD is not UTF-8") from exc
    if "\x00" in text:
        fail("wheel RECORD contains a NUL byte")
    if "\r" in text or not text.endswith("\n"):
        fail("wheel RECORD must use canonical LF-terminated rows")
    try:
        rows = list(csv.reader(io.StringIO(text, newline=""), strict=True))
    except csv.Error as exc:
        raise RuntimeError(f"wheel RECORD is not strict CSV: {exc}") from exc
    if len(rows) != len(files):
        fail("wheel RECORD row count differs from the closed file inventory")
    observed: set[str] = set()
    digest_pattern = re.compile(r"sha256=([A-Za-z0-9_-]{43})\Z")
    for row in rows:
        if len(row) != 3:
            fail("wheel RECORD rows must contain exactly three columns")
        name, encoded_digest, encoded_size = row
        if name not in allowed_external_paths:
            path = safe_archive_name(name)
            if path.as_posix() != name:
                fail(f"wheel RECORD contains a noncanonical path: {name!r}")
        if name in observed:
            fail(f"wheel RECORD contains a duplicate or noncanonical path: {name!r}")
        observed.add(name)
        if name not in files:
            fail(f"wheel RECORD names an unknown file: {name}")
        if name == record_path:
            if encoded_digest or encoded_size:
                fail("wheel RECORD must leave its own digest and size empty")
            continue
        match = digest_pattern.fullmatch(encoded_digest)
        if match is None:
            fail(f"wheel RECORD has a noncanonical SHA-256 digest for {name}")
        expected_digest = base64.urlsafe_b64encode(
            hashlib.sha256(files[name]).digest()
        ).rstrip(b"=").decode("ascii")
        if match.group(1) != expected_digest:
            fail(f"wheel RECORD digest differs from file bytes: {name}")
        expected_size = str(len(files[name]))
        if encoded_size != expected_size:
            fail(f"wheel RECORD size differs from file bytes: {name}")
    if observed != set(files):
        fail("wheel RECORD inventory differs from the wheel file inventory")
    canonical = "".join(",".join(row) + "\n" for row in rows)
    if text != canonical:
        fail("wheel RECORD contains noncanonical CSV quoting or row encoding")


def _inflate_wheel_member(name: str, compressed: bytes, expected_size: int) -> bytes:
    decoder = zlib.decompressobj(-zlib.MAX_WBITS)
    try:
        payload = decoder.decompress(compressed, MAX_WHEEL_FILE_BYTES + 1)
    except zlib.error as exc:
        raise RuntimeError(f"wheel member has an invalid deflate stream: {name}") from exc
    if (
        len(payload) > MAX_WHEEL_FILE_BYTES
        or len(payload) != expected_size
        or not decoder.eof
        or decoder.unconsumed_tail
        or decoder.unused_data
    ):
        fail(f"wheel member is truncated, trailing, concatenated, or oversized: {name}")
    return payload


def _strict_wheel_files(
    wheel: Path,
) -> tuple[bytes, dict[str, bytes]]:
    """Parse the bounded ZIP records and deflate streams independently of zipfile."""

    raw = bounded_regular_file_bytes(
        wheel,
        maximum=MAX_WHEEL_ARCHIVE_BYTES,
        label="wheel archive",
    )
    if not raw:
        fail("wheel compressed-byte budget exceeded")
    if len(raw) < 22 or raw[:4] != b"PK\x03\x04" or raw[-22:-18] != b"PK\x05\x06":
        fail("wheel must be one canonical ZIP archive without prefix or suffix bytes")
    (
        signature,
        disk_number,
        central_disk,
        disk_entries,
        total_entries,
        central_size,
        central_offset,
        comment_length,
    ) = struct.unpack_from("<I4H2IH", raw, len(raw) - 22)
    if (
        signature != 0x06054B50
        or disk_number != 0
        or central_disk != 0
        or disk_entries != total_entries
        or total_entries >= 0xFFFF
        or total_entries > 10_000
        or central_size >= 0xFFFFFFFF
        or central_offset >= 0xFFFFFFFF
        or comment_length != 0
        or central_offset + central_size != len(raw) - 22
    ):
        fail("wheel ZIP end record is split, extended, commented, or inconsistent")

    expected_dos_date = ((2000 - 1980) << 9) | (1 << 5) | 1
    central_cursor = central_offset
    local_cursor = 0
    files: dict[str, bytes] = {}
    total_file_bytes = 0
    for _entry_index in range(total_entries):
        if central_cursor + 46 > len(raw):
            fail("wheel central directory is truncated")
        central = struct.unpack_from("<I6H3I5H2I", raw, central_cursor)
        (
            central_signature,
            version_made,
            version_needed,
            flags,
            compression,
            dos_time,
            dos_date,
            crc32,
            compressed_size,
            file_size,
            name_length,
            extra_length,
            member_comment_length,
            start_disk,
            internal_attributes,
            external_attributes,
            local_offset,
        ) = central
        name_start = central_cursor + 46
        name_end = name_start + name_length
        record_end = name_end + extra_length + member_comment_length
        try:
            member_name = raw[name_start:name_end].decode("ascii", "strict")
        except UnicodeEncodeError as exc:
            raise RuntimeError("wheel paths must be portable ASCII") from exc
        except UnicodeDecodeError as exc:
            raise RuntimeError("wheel paths must be portable ASCII") from exc
        path = safe_archive_name(member_name)
        generated_dist_info = path.parts[0].endswith(".dist-info")
        expected_external_attributes = (
            0o644 << 16
            if generated_dist_info
            else (stat.S_IFREG | 0o644) << 16
        )
        if (
            central_signature != 0x02014B50
            or version_made != 0x0314
            or version_needed != 20
            or flags != 0
            or compression != zipfile.ZIP_DEFLATED
            or dos_time != 0
            or dos_date != expected_dos_date
            or extra_length != 0
            or member_comment_length != 0
            or start_disk != 0
            or internal_attributes != 0
            or record_end > len(raw)
            or member_name != path.as_posix()
        ):
            fail(f"wheel central record is noncanonical or inconsistent: {member_name}")
        if external_attributes != expected_external_attributes:
            fail(
                "wheel external attributes differ from the exact Hatchling path policy: "
                f"{member_name}"
            )
        if member_name in files:
            fail(f"wheel contains duplicate path {member_name!r}")
        if file_size > MAX_WHEEL_FILE_BYTES:
            fail(f"wheel file exceeds its byte budget: {member_name}")
        total_file_bytes += file_size
        if total_file_bytes > MAX_WHEEL_TOTAL_BYTES:
            fail("wheel uncompressed-byte budget exceeded")
        central_cursor = record_end

        if local_offset != local_cursor or local_offset + 30 > central_offset:
            fail(f"wheel local records overlap or contain gaps: {member_name}")
        local = struct.unpack_from("<I5H3I2H", raw, local_offset)
        (
            local_signature,
            local_version,
            local_flags,
            local_compression,
            local_time,
            local_date,
            local_crc32,
            local_compressed_size,
            local_file_size,
            local_name_length,
            local_extra_length,
        ) = local
        local_name_start = local_offset + 30
        local_name_end = local_name_start + local_name_length
        payload_start = local_name_end + local_extra_length
        payload_end = payload_start + local_compressed_size
        if (
            local_signature != 0x04034B50
            or local_version != version_needed
            or local_flags != flags
            or local_compression != compression
            or local_time != dos_time
            or local_date != dos_date
            or local_crc32 != crc32
            or local_compressed_size != compressed_size
            or local_file_size != file_size
            or local_extra_length != 0
            or payload_end > central_offset
            or raw[local_name_start:local_name_end] != raw[name_start:name_end]
        ):
            fail(f"wheel local record is noncanonical or inconsistent: {member_name}")
        payload = _inflate_wheel_member(
            member_name,
            raw[payload_start:payload_end],
            file_size,
        )
        if zlib.crc32(payload) & 0xFFFFFFFF != crc32:
            fail(f"wheel member CRC differs from its bytes: {member_name}")
        files[member_name] = payload
        local_cursor = payload_end

    if central_cursor != len(raw) - 22 or local_cursor != central_offset:
        fail("wheel local or central records do not exactly fill their declared regions")
    return raw, files


def _tar_octal(field: bytes, *, label: str, allow_empty: bool = False) -> int:
    if field and field[0] & 0x80:
        fail(f"sdist uses unsupported base-256 tar metadata for {label}")
    stripped = field.rstrip(b"\0 ").lstrip(b" ")
    if not stripped:
        if allow_empty:
            return 0
        fail(f"sdist tar metadata is empty for {label}")
    if re.fullmatch(rb"[0-7]+", stripped) is None:
        fail(f"sdist tar metadata is not canonical octal for {label}")
    return int(stripped, 8)


def _tar_text(field: bytes, *, label: str) -> str:
    value, separator, remainder = field.partition(b"\0")
    if (separator and any(remainder)) or any(
        byte < 0x20 or byte == 0x7F for byte in value
    ):
        fail(f"sdist tar text contains a control byte for {label}")
    try:
        return value.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise RuntimeError(f"sdist tar text is not UTF-8 for {label}") from exc


def _verify_tar_header(header: bytes, *, label: str) -> None:
    if len(header) != 512:
        fail(f"sdist tar header is truncated at {label}")
    recorded = _tar_octal(header[148:156], label=f"{label} checksum")
    calculated = sum(header[:148]) + 8 * ord(" ") + sum(header[156:])
    if recorded != calculated:
        fail(f"sdist tar header checksum is invalid at {label}")
    for field, pattern, field_label in (
        (header[100:108], rb"[0-7]{7}\0", "mode"),
        (header[108:116], rb"[0-7]{7}\0", "uid"),
        (header[116:124], rb"[0-7]{7}\0", "gid"),
        (header[124:136], rb"[0-7]{11}\0", "size"),
        (header[136:148], rb"[0-7]{11}\0", "mtime"),
        (header[148:156], rb"[0-7]{6}\0 ", "checksum"),
    ):
        if re.fullmatch(pattern, field) is None:
            fail(f"sdist tar metadata encoding is noncanonical for {label} {field_label}")
    if header[257:265] != b"ustar\x0000":
        fail(f"sdist tar header is not exact POSIX ustar at {label}")
    if any(header[345:512]):
        fail(f"sdist tar prefix or reserved authority is unsupported at {label}")
    if _tar_octal(header[108:116], label=f"{label} uid") != 0:
        fail(f"sdist tar uid must be zero at {label}")
    if _tar_octal(header[116:124], label=f"{label} gid") != 0:
        fail(f"sdist tar gid must be zero at {label}")
    if _tar_text(header[265:297], label=f"{label} uname"):
        fail(f"sdist tar uname must be empty at {label}")
    if _tar_text(header[297:329], label=f"{label} gname"):
        fail(f"sdist tar gname must be empty at {label}")
    if _tar_text(header[157:257], label=f"{label} link name"):
        fail(f"sdist tar link authority is unsupported at {label}")
    if _tar_octal(header[329:337], label=f"{label} device major", allow_empty=True):
        fail(f"sdist tar device major must be zero at {label}")
    if _tar_octal(header[337:345], label=f"{label} device minor", allow_empty=True):
        fail(f"sdist tar device minor must be zero at {label}")


def _parse_pax_path(payload: bytes) -> str:
    cursor = 0
    values: dict[str, str] = {}
    while cursor < len(payload):
        separator = payload.find(b" ", cursor)
        if separator < 0:
            fail("sdist PAX record lacks a length separator")
        raw_length = payload[cursor:separator]
        if re.fullmatch(rb"[1-9][0-9]*", raw_length) is None:
            fail("sdist PAX record length is not canonical decimal")
        length = int(raw_length)
        end = cursor + length
        if end > len(payload) or payload[end - 1 : end] != b"\n":
            fail("sdist PAX record length or terminator is invalid")
        record = payload[separator + 1 : end - 1]
        if b"=" not in record:
            fail("sdist PAX record lacks a key/value separator")
        raw_key, raw_value = record.split(b"=", 1)
        try:
            key = raw_key.decode("ascii", "strict")
            value = raw_value.decode("utf-8", "strict")
        except UnicodeDecodeError as exc:
            raise RuntimeError("sdist PAX record text is invalid") from exc
        if key in values:
            fail(f"sdist PAX record repeats key {key!r}")
        values[key] = value
        cursor = end
    if set(values) != {"path"}:
        fail("sdist PAX header may declare only one path key")
    return safe_archive_name(values["path"]).as_posix()


def _decompress_single_gzip(sdist: Path) -> bytes:
    compressed = bounded_regular_file_bytes(
        sdist,
        maximum=MAX_SDIST_COMPRESSED_BYTES,
        label="sdist archive",
    )
    if not compressed:
        fail("sdist compressed-byte budget exceeded")
    if (
        len(compressed) < 18
        or compressed[:4] != b"\x1f\x8b\x08\x00"
        or struct.unpack_from("<I", compressed, 4)[0] != int(SOURCE_DATE_EPOCH)
        or compressed[8:10] != b"\x02\xff"
    ):
        fail("sdist must be one deterministic gzip member")
    decoder = zlib.decompressobj(16 + zlib.MAX_WBITS)
    try:
        raw = decoder.decompress(compressed, MAX_SDIST_TAR_BYTES + 1)
    except zlib.error as exc:
        raise RuntimeError(f"sdist gzip stream is invalid: {exc}") from exc
    if (
        len(raw) > MAX_SDIST_TAR_BYTES
        or not decoder.eof
        or decoder.unconsumed_tail
        or decoder.unused_data
    ):
        fail("sdist gzip stream is truncated, concatenated, trailing, or oversized")
    return raw


def _strict_sdist_files(sdist: Path) -> dict[str, bytes]:
    raw = _decompress_single_gzip(sdist)
    if len(raw) % 10_240 != 0:
        fail("sdist tar stream lacks canonical 10 KiB record padding")
    cursor = 0
    files: dict[str, bytes] = {}
    total_bytes = 0
    pending_pax_path: str | None = None
    entries = 0
    while cursor + 512 <= len(raw):
        header_offset = cursor
        header = raw[cursor : cursor + 512]
        if header == b"\0" * 512:
            if pending_pax_path is not None:
                fail("sdist PAX header is not followed by one file")
            if len(raw) - cursor < 1024 or any(raw[cursor:]):
                fail("sdist tar terminal zero blocks are missing or nonzero")
            return files
        entries += 1
        if entries > 10_000:
            fail("sdist archive entry budget exceeded")
        _verify_tar_header(header, label=f"offset {header_offset}")
        member_type = header[156:157]
        mode = _tar_octal(header[100:108], label=f"offset {header_offset} mode")
        size = _tar_octal(header[124:136], label=f"offset {header_offset} size")
        mtime = _tar_octal(header[136:148], label=f"offset {header_offset} mtime")
        raw_name = _tar_text(header[:100], label=f"offset {header_offset} name")
        cursor += 512
        padded_size = (size + 511) & ~511
        if cursor + padded_size > len(raw):
            fail(f"sdist tar payload is truncated at {raw_name!r}")
        payload = raw[cursor : cursor + size]
        if any(raw[cursor + size : cursor + padded_size]):
            fail(f"sdist tar payload padding is nonzero at {raw_name!r}")
        cursor += padded_size
        if member_type == b"x":
            if pending_pax_path is not None:
                fail("sdist contains consecutive PAX headers")
            if (
                raw_name != "././@PaxHeader"
                or mode != 0
                or mtime != 0
                or size > 4096
            ):
                fail("sdist PAX header metadata is not canonical")
            pending_pax_path = _parse_pax_path(payload)
            continue
        if member_type not in {b"0", b"\0"}:
            fail(f"sdist contains an indirect or special entry: {raw_name}")
        logical_name = pending_pax_path or safe_archive_name(raw_name).as_posix()
        if pending_pax_path is not None:
            encoded = logical_name.encode("utf-8")
            if len(encoded) <= 100 or header[:100] != encoded[:100]:
                fail("sdist PAX path does not match its exact truncated ustar name")
        pending_pax_path = None
        if logical_name in files:
            fail(f"sdist contains duplicate semantic path {logical_name!r}")
        if mode != 0o644:
            fail(f"sdist regular file mode must be exactly 0644: {logical_name}")
        if mtime != int(SOURCE_DATE_EPOCH):
            fail(f"sdist regular file mtime is not SOURCE_DATE_EPOCH: {logical_name}")
        if size > MAX_SDIST_FILE_BYTES:
            fail(f"sdist file exceeds its byte budget: {logical_name}")
        total_bytes += size
        if total_bytes > MAX_SDIST_TOTAL_BYTES:
            fail("sdist uncompressed file-byte budget exceeded")
        files[logical_name] = payload
    fail("sdist tar stream ended without two terminal zero blocks")


def inspect_wheel(
    wheel: Path,
    expected: dict[str, bytes],
    expected_sources: dict[str, bytes],
    license_bytes: bytes,
    version: str,
    hatchling_version: str,
    expected_metadata: bytes,
) -> dict[str, bytes]:
    expected_package = wheel_package_bytes(expected_sources)
    dist_info = f"cortexel-{version}.dist-info"
    metadata_path = f"{dist_info}/METADATA"
    wheel_metadata_path = f"{dist_info}/WHEEL"
    record_path = f"{dist_info}/RECORD"
    license_path = f"{dist_info}/licenses/LICENSE"
    expected_files = {
        *expected_package,
        metadata_path,
        wheel_metadata_path,
        record_path,
        license_path,
    }
    raw, files = _strict_wheel_files(wheel)
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        infos = archive.infolist()
        if len(infos) > 10_000:
            fail("wheel archive entry budget exceeded")
        seen: set[str] = set()
        for info in infos:
            path = safe_archive_name(info.filename)
            if info.is_dir() or info.filename != path.as_posix():
                fail(f"wheel contains a non-canonical path: {info.filename!r}")
            if info.filename in seen:
                fail(f"wheel contains duplicate path {info.filename!r}")
            seen.add(info.filename)
            expected_attributes = (
                0o644 << 16
                if path.parts[0].endswith(".dist-info")
                else (stat.S_IFREG | 0o644) << 16
            )
            if info.external_attr != expected_attributes:
                fail(
                    "wheel external attributes are not exact regular 0644 with no "
                    f"platform authority: {info.filename}"
                )
            if info.file_size > MAX_WHEEL_FILE_BYTES:
                fail(f"wheel file exceeds its byte budget: {info.filename}")
            payload = files[info.filename]
            if archive.read(info) != payload:
                fail(f"independent and standard-library wheel reads differ: {info.filename}")
            reject_native_wheel_payload(info.filename, payload)
        if set(files) != expected_files:
            fail(
                "wheel file inventory is not closed: "
                f"missing={sorted(expected_files - set(files))}, "
                f"extra={sorted(set(files) - expected_files)}"
            )
        for name, source in expected_package.items():
            if files[name] != source:
                fail(f"wheel package bytes drifted from source projection: {name}")
        inspect_core_metadata(
            files[metadata_path],
            "wheel Core Metadata",
            version,
            expected_metadata,
        )
        inspect_wheel_metadata(files[wheel_metadata_path], hatchling_version)
        inspect_wheel_record(
            files[record_path],
            files=files,
            record_path=record_path,
        )
        if files[license_path] != license_bytes:
            fail("wheel does not contain the exact project MIT license")

        prefix = "cortexel/contract/"
        packaged = {
            name.removeprefix(prefix): payload
            for name, payload in files.items()
            if name.startswith(prefix)
        }
        if set(packaged) != set(expected):
            fail(
                "wheel schema inventory differs from the generator-owned projection: "
                f"missing={sorted(set(expected) - set(packaged))}, "
                f"extra={sorted(set(packaged) - set(expected))}"
            )
        for relative, source in expected.items():
            if packaged[relative] != source:
                fail(f"wheel schema bytes drifted from source projection: {relative}")
        if files.get("cortexel/py.typed") != b"":
            fail("wheel is missing its exact empty PEP 561 py.typed marker")
        return files


def inspect_sdist(
    sdist: Path,
    expected: dict[str, bytes],
    expected_sources: dict[str, bytes],
    license_bytes: bytes,
    archive_root: str,
    expected_metadata: bytes,
) -> None:
    packaged: dict[str, bytes] = {}
    root_license: bytes | None = None
    typed_marker: bytes | None = None
    archived_files: dict[str, bytes] = {}
    raw_files = _strict_sdist_files(sdist)
    for name, payload in raw_files.items():
        path = safe_archive_name(name)
        if any(
            part in {".env", ".git", "__pycache__", "uv.lock"}
            for part in path.parts
        ):
            fail(f"sdist contains a local or transient path: {name}")
        if path.parts[0] != archive_root:
            fail(f"sdist member escaped the one expected archive root: {name}")
        relative_path = PurePosixPath(*path.parts[1:])
        if not relative_path.parts:
            fail("sdist archive root is a file")
        relative = relative_path.as_posix()
        archived_files[relative] = payload
        if relative == "LICENSE":
            root_license = payload
        if path.parts[-3:] == ("src", "cortexel", "py.typed"):
            typed_marker = payload
        marker = ("src", "cortexel", "contract")
        for index in range(len(path.parts) - len(marker) + 1):
            if path.parts[index : index + len(marker)] == marker:
                resource = PurePosixPath(
                    *path.parts[index + len(marker) :]
                ).as_posix()
                packaged[resource] = payload
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
    inspect_core_metadata(
        archived_files["PKG-INFO"],
        "sdist PKG-INFO",
        archive_root.removeprefix("cortexel-"),
        expected_metadata,
    )
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


def _strict_json(payload: bytes, *, label: str) -> object:
    try:
        text = payload.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise RuntimeError(f"{label} is not UTF-8") from exc

    def object_without_duplicates(pairs: list[tuple[str, object]]) -> dict[str, object]:
        result: dict[str, object] = {}
        for name, value in pairs:
            if name in result:
                fail(f"{label} repeats JSON member {name!r}")
            result[name] = value
        return result

    try:
        return json.loads(
            text,
            object_pairs_hook=object_without_duplicates,
            parse_constant=lambda value: fail(
                f"{label} contains non-finite JSON token {value}"
            ),
        )
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{label} is invalid JSON: {exc}") from exc


def inspect_uv_cache(payload: bytes, *, label: str) -> None:
    uv_cache = _strict_json(payload, label=label)
    if not isinstance(uv_cache, dict) or set(uv_cache) != {
        "timestamp",
        "commit",
        "tags",
        "env",
        "directories",
    }:
        fail(f"{label} has unknown authority")
    timestamp = uv_cache["timestamp"]
    if (
        not isinstance(timestamp, dict)
        or set(timestamp) != {"secs_since_epoch", "nanos_since_epoch"}
        or isinstance(timestamp["secs_since_epoch"], bool)
        or not isinstance(timestamp["secs_since_epoch"], int)
        or timestamp["secs_since_epoch"] < 0
        or isinstance(timestamp["nanos_since_epoch"], bool)
        or not isinstance(timestamp["nanos_since_epoch"], int)
        or not 0 <= timestamp["nanos_since_epoch"] < 1_000_000_000
        or uv_cache["commit"] is not None
        or uv_cache["tags"] is not None
        or uv_cache["env"] != {}
        or uv_cache["directories"] != {}
    ):
        fail(f"{label} is malformed")


def clean_venv_site_packages(environment: Path) -> Path:
    if os.name != "posix":
        fail("the Python package release boundary currently supports only POSIX hosts")
    site_packages = (
        environment
        / "lib"
        / f"python{sys.version_info.major}.{sys.version_info.minor}"
        / "site-packages"
    )
    try:
        resolved_environment = environment.resolve(strict=True)
        resolved_site = site_packages.resolve(strict=True)
    except OSError as exc:
        raise RuntimeError("clean virtual-environment site-packages is missing") from exc
    if not resolved_site.is_relative_to(resolved_environment) or not resolved_site.is_dir():
        fail("clean virtual-environment site-packages escapes its environment")
    return resolved_site


def inspect_clean_install(
    environment: Path,
    wheel: Path,
    wheel_files: dict[str, bytes],
    version: str,
) -> Path:
    """Close the installed tree and RECORD before any package import executes."""

    site_packages = clean_venv_site_packages(environment)
    dist_info = f"cortexel-{version}.dist-info"
    record_path = f"{dist_info}/RECORD"
    installer_files = {
        f"{dist_info}/INSTALLER": b"uv",
        f"{dist_info}/REQUESTED": b"",
        f"{dist_info}/direct_url.json": json.dumps(
            {"url": wheel.as_uri(), "archive_info": {}},
            ensure_ascii=True,
            separators=(",", ":"),
        ).encode("ascii"),
    }
    expected_names = (set(wheel_files) - {record_path}) | set(installer_files) | {
        record_path,
        f"{dist_info}/uv_cache.json",
    }
    installed_files, installed_directories = bounded_tree_entries(
        site_packages,
        label="clean installed-wheel tree",
    )
    actual: dict[str, bytes] = {}
    total_bytes = 0
    for path in installed_files:
        relative = path.relative_to(site_packages).as_posix()
        status = path.stat(follow_symlinks=False)
        if stat.S_IMODE(status.st_mode) != 0o644:
            fail(f"clean installed-wheel file mode is not exact 0644: {relative}")
        payload = bounded_regular_file_bytes(
            path,
            maximum=MAX_WHEEL_FILE_BYTES,
            label=f"clean installed-wheel file {relative}",
        )
        total_bytes += len(payload)
        if total_bytes > MAX_WHEEL_TOTAL_BYTES:
            fail("clean installed-wheel tree exceeds its total byte budget")
        actual[relative] = payload
    if set(actual) != expected_names:
        fail(
            "clean installed-wheel file inventory is not closed: "
            f"missing={sorted(expected_names - set(actual))}, "
            f"extra={sorted(set(actual) - expected_names)}"
        )

    expected_directories = {
        parent.as_posix()
        for name in expected_names
        for parent in PurePosixPath(name).parents
        if parent.parts
    }
    actual_directories = {
        path.relative_to(site_packages).as_posix() for path in installed_directories
    }
    if actual_directories != expected_directories:
        fail(
            "clean installed-wheel directory inventory is not closed: "
            f"missing={sorted(expected_directories - actual_directories)}, "
            f"extra={sorted(actual_directories - expected_directories)}"
        )
    for path in installed_directories:
        if stat.S_IMODE(path.stat(follow_symlinks=False).st_mode) != 0o755:
            fail(
                "clean installed-wheel directory mode is not exact 0755: "
                f"{path.relative_to(site_packages)}"
            )

    for name, expected_payload in wheel_files.items():
        if name != record_path and actual[name] != expected_payload:
            fail(f"clean installed-wheel bytes differ from the wheel: {name}")
    for name, expected_payload in installer_files.items():
        if actual[name] != expected_payload:
            fail(f"clean installed-wheel installer metadata is not exact: {name}")
    inspect_uv_cache(
        actual[f"{dist_info}/uv_cache.json"],
        label="clean installed-wheel uv_cache.json",
    )
    inspect_wheel_record(
        actual[record_path],
        files=actual,
        record_path=record_path,
    )
    return site_packages


def expected_python_no_site_path(
    base_root: Path,
    platform_library: object,
) -> list[Path]:
    if platform_library not in {"lib", "lib64"}:
        fail("the reviewed Python has an unsupported platform-library layout")
    assert isinstance(platform_library, str)
    stdlib = base_root / platform_library / "python3.14"
    resolved_stdlib = stdlib.resolve(strict=True)
    if not resolved_stdlib.is_relative_to(base_root):
        fail("the reviewed Python stdlib escapes its base prefix")
    zip_candidate = base_root / platform_library / "python314.zip"
    resolved_zip = zip_candidate.resolve(strict=False)
    if not resolved_zip.parent.is_relative_to(base_root):
        fail("the reviewed Python stdlib zip slot escapes its base prefix")
    result = [resolved_zip, resolved_stdlib]
    dynamic_libraries = stdlib / "lib-dynload"
    if dynamic_libraries.exists():
        resolved_dynamic_libraries = dynamic_libraries.resolve(strict=True)
        if not resolved_dynamic_libraries.is_relative_to(base_root):
            fail("the reviewed Python dynamic-library directory escapes its base prefix")
        result.append(resolved_dynamic_libraries)
    return result


def reviewed_python() -> str:
    if (
        sys.implementation.name != "cpython"
        or sys.version_info[:2] != EXPECTED_PACKAGE_BUILD_PYTHON
    ):
        fail(
            "the package build evidence gate requires a dedicated CPython 3.14.x "
            "runtime; the installed cortexel package remains compatible with Python >=3.11"
        )
    if (
        sys.flags.isolated != 1
        or sys.flags.no_site != 1
        or sys.flags.dont_write_bytecode != 1
    ):
        fail(
            "the package smoke must be launched with Python isolated "
            "no-site/no-bytecode mode (-I -S -B)"
        )
    executable = Path(sys.executable)
    if not executable.is_absolute():
        fail("the running Python executable must be absolute")
    try:
        resolved = executable.resolve(strict=True)
    except OSError as exc:
        raise RuntimeError("the running Python executable cannot be resolved") from exc
    try:
        executable_status = executable.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError("the running Python executable cannot be inspected") from exc
    if (
        not stat.S_ISREG(executable_status.st_mode)
        or not resolved.is_file()
        or not os.access(resolved, os.X_OK)
    ):
        fail("the running Python executable is not an executable regular file")
    try:
        runtime_root = Path(sys.prefix).resolve(strict=True)
    except OSError as exc:
        raise RuntimeError("the running Python prefix cannot be resolved") from exc
    if not resolved.is_relative_to(runtime_root):
        fail("the running Python executable escapes its reviewed runtime prefix")
    try:
        runtime_exec_root = Path(sys.exec_prefix).resolve(strict=True)
        base_root = Path(sys.base_prefix).resolve(strict=True)
        base_exec_root = Path(sys.base_exec_prefix).resolve(strict=True)
    except OSError as exc:
        raise RuntimeError("the Python prefix relationships cannot be resolved") from exc
    if runtime_exec_root != runtime_root or base_exec_root != base_root:
        fail("the reviewed Python prefix/exec-prefix relationships are not exact")
    if runtime_root == base_root:
        fail("the build backend must run in a fresh copied virtual environment")
    raw_base_executable = getattr(sys, "_base_executable", None)
    if not isinstance(raw_base_executable, str):
        fail("the reviewed Python does not expose its base executable authority")
    base_executable = Path(raw_base_executable)
    if not base_executable.is_absolute():
        fail("the reviewed Python base executable must be absolute")
    try:
        resolved_base_executable = base_executable.resolve(strict=True)
        base_executable_status = resolved_base_executable.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError("the reviewed Python base executable cannot be resolved") from exc
    if not resolved_base_executable.is_relative_to(base_root):
        fail("the reviewed Python base executable escapes its protected base prefix")
    if not stat.S_ISREG(base_executable_status.st_mode):
        fail("the reviewed Python base executable must be a regular file")
    if not os.access(resolved_base_executable, os.X_OK):
        fail("the reviewed Python base executable is not executable")
    if base_executable_status.st_mode & (stat.S_IWGRP | stat.S_IWOTH):
        fail("the reviewed Python base executable is group/world writable")
    configuration = bounded_regular_file_bytes(
        Path(sys.prefix) / "pyvenv.cfg",
        maximum=MAX_REQUIREMENTS_BYTES,
        label="reviewed Python pyvenv.cfg",
    ).decode("utf-8", "strict")
    if "\r" in configuration or "\x00" in configuration:
        fail("the reviewed Python pyvenv.cfg must be canonical LF-delimited UTF-8")
    configuration_values: dict[str, str] = {}
    for line in configuration.splitlines():
        key, separator, value = line.partition("=")
        normalized_key = key.strip().casefold()
        normalized_value = value.strip()
        if (
            separator != "="
            or not normalized_key
            or not normalized_value
            or normalized_key in configuration_values
        ):
            fail("the reviewed Python pyvenv.cfg contains malformed or duplicate policy")
        configuration_values[normalized_key] = normalized_value
    if set(configuration_values) != {
        "home",
        "include-system-site-packages",
        "version",
        "executable",
        "command",
    }:
        fail("the reviewed Python pyvenv.cfg key inventory is not closed")
    if configuration_values["include-system-site-packages"].casefold() != "false":
        fail("the reviewed Python runtime must disable system site-packages")
    expected_runtime_version = ".".join(str(value) for value in sys.version_info[:3])
    if configuration_values["version"] != expected_runtime_version:
        fail("the reviewed Python pyvenv.cfg version differs from the interpreter")
    for name in ("home", "executable"):
        configured_path = Path(configuration_values[name])
        if not configured_path.is_absolute():
            fail(f"the reviewed Python pyvenv.cfg {name} path must be absolute")
    try:
        configured_home = Path(configuration_values["home"]).resolve(strict=True)
        configured_executable = Path(configuration_values["executable"]).resolve(
            strict=True
        )
    except OSError as exc:
        raise RuntimeError("the reviewed Python pyvenv.cfg base paths cannot be resolved") from exc
    if (
        configured_executable != resolved_base_executable
    ):
        fail("the reviewed Python pyvenv.cfg does not bind the exact base executable")
    command = configuration_values["command"]
    try:
        command_tokens = shlex.split(command, posix=True)
    except ValueError as exc:
        raise RuntimeError("the reviewed Python pyvenv.cfg command is malformed") from exc
    if any(ord(character) < 0x20 or ord(character) == 0x7F for character in command):
        fail("the reviewed Python pyvenv.cfg command is not the copied no-pip policy")
    if len(command_tokens) != 6 or command_tokens[1:5] != [
        "-m",
        "venv",
        "--copies",
        "--without-pip",
    ]:
        fail("the reviewed Python pyvenv.cfg command is not the copied no-pip policy")
    try:
        command_executable = Path(command_tokens[0]).resolve(strict=True)
        command_destination = Path(command_tokens[5]).resolve(strict=True)
    except OSError as exc:
        raise RuntimeError("the reviewed Python pyvenv.cfg command paths cannot be resolved") from exc
    if (
        command_executable != resolved_base_executable
        or Path(command_tokens[0]).parent.resolve(strict=True) != configured_home
        or command_destination != runtime_root
    ):
        fail("the reviewed Python pyvenv.cfg command targets different authority")
    expected_sys_path = expected_python_no_site_path(
        base_root,
        getattr(sys, "platlibdir", None),
    )
    received_sys_path: list[Path] = []
    for entry in sys.path:
        if not entry or not Path(entry).is_absolute():
            fail("isolated Python sys.path contains ambient relative authority")
        received_sys_path.append(Path(entry).resolve(strict=False))
    if received_sys_path != expected_sys_path:
        fail(
            "isolated Python sys.path differs from the exact Python 3.14 base stdlib: "
            f"expected={expected_sys_path}, received={received_sys_path}"
        )
    declared = os.environ.get("UV_PYTHON")
    if declared is not None:
        declared_path = Path(declared)
        if not declared_path.is_absolute():
            fail("UV_PYTHON must be one canonical physical absolute path")
        try:
            declared_resolved = declared_path.resolve(strict=True)
        except OSError as exc:
            raise RuntimeError("UV_PYTHON cannot be resolved") from exc
        if declared_path != declared_resolved:
            fail("UV_PYTHON must be one canonical physical absolute path")
        if declared_path != resolved:
            fail("UV_PYTHON differs from the running reviewed Python")
    return str(resolved)


def reviewed_uv(python: str) -> str:
    declared = os.environ.get("CORTEXEL_UV")
    if declared is None:
        fail("CORTEXEL_UV must affirmatively name the reviewed uv executable")
    candidate = Path(declared)
    if not candidate.is_absolute():
        fail("the reviewed uv executable must be an absolute path")
    try:
        resolved = candidate.resolve(strict=True)
        status = candidate.stat(follow_symlinks=False)
    except OSError as exc:
        raise RuntimeError("the reviewed uv executable cannot be resolved") from exc
    if candidate != resolved:
        fail("CORTEXEL_UV must be one canonical physical absolute path")
    if (
        not stat.S_ISREG(status.st_mode)
        or not resolved.is_file()
        or not os.access(resolved, os.X_OK)
        or status.st_mode & (stat.S_IWGRP | stat.S_IWOTH)
    ):
        fail("the reviewed uv executable is not a protected executable regular file")
    executable_path = os.pathsep.join(
        dict.fromkeys((str(resolved.parent), str(Path(python).parent)))
    )
    version = run_checked(
        [str(resolved), "--version"],
        cwd=ROOT,
        environment={
            "PATH": executable_path,
            **{
                name: os.environ[name]
                for name in ("SYSTEMROOT", "WINDIR")
                if name in os.environ
            },
        },
        capture_output=True,
        text=True,
        timeout=10,
        label="uv version probe",
    )
    if version.stderr or re.fullmatch(
        rf"uv {re.escape(EXPECTED_UV_VERSION)}(?: \([ -~]+\))?\n",
        version.stdout,
    ) is None:
        fail(f"the reviewed uv executable must be exactly uv {EXPECTED_UV_VERSION}")
    return str(resolved)


def build_python_runtime_results(
    python: str,
    uv: str,
) -> tuple[dict[str, object], dict[str, object]]:
    """Bind canonical runtime paths to the exact executable bytes observed last."""

    python_path = Path(python)
    uv_path = Path(uv)
    raw_base_executable = getattr(sys, "_base_executable", None)
    if not isinstance(raw_base_executable, str):
        fail("reviewed Python base executable is unavailable")
    try:
        base_executable = Path(raw_base_executable).resolve(strict=True)
        prefix = Path(sys.prefix).resolve(strict=True)
    except (AttributeError, OSError) as exc:
        raise RuntimeError("reviewed Python identity cannot be sealed") from exc
    python_evidence = regular_file_sha256_evidence(
        python_path,
        maximum=MAX_RUNTIME_TOTAL_BYTES,
        label="result reviewed Python executable",
    )
    base_evidence = regular_file_sha256_evidence(
        base_executable,
        maximum=MAX_RUNTIME_TOTAL_BYTES,
        label="result reviewed Python base executable",
    )
    uv_evidence = regular_file_sha256_evidence(
        uv_path,
        maximum=MAX_RUNTIME_TOTAL_BYTES,
        label="result reviewed uv executable",
    )
    python_result = {
        "baseExecutable": str(base_executable),
        "baseExecutableSha256": base_evidence["sha256"],
        "baseExecutableSize": base_evidence["size"],
        "executable": str(python_path),
        "executableSha256": python_evidence["sha256"],
        "executableSize": python_evidence["size"],
        "implementation": sys.implementation.name,
        "prefix": str(prefix),
        "version": ".".join(str(value) for value in sys.version_info[:3]),
    }
    uv_result = {
        "executable": str(uv_path),
        "sha256": uv_evidence["sha256"],
        "size": uv_evidence["size"],
        "version": EXPECTED_UV_VERSION,
    }
    return python_result, uv_result


def build_python_package_smoke_result(
    *,
    version: str,
    python: str,
    uv: str,
    expected_resources: dict[str, bytes],
    expected_sources: dict[str, bytes],
    license_bytes: bytes,
    backend_requirements: bytes,
    wheel_evidence: dict[str, object],
    sdist_evidence: dict[str, object],
) -> dict[str, object]:
    """Construct the receipt only from evidence re-read after every active probe."""

    python_result, uv_result = build_python_runtime_results(python, uv)
    backend_result = build_backend_wheelhouse_result()
    require_build_backend_requirements_unchanged(backend_requirements)
    source_inventory = {
        ".github/requirements/python-package-build.txt": backend_requirements,
        "LICENSE": license_bytes,
        **{
            f"python/{relative}": payload
            for relative, payload in expected_sources.items()
        },
    }
    skill_schema_count = sum(
        relative.startswith("schemas/skills/")
        and relative.endswith(".request.v1.schema.json")
        for relative in expected_resources
    )
    result = {
        "artifacts": {
            "sdist": {
                "filename": f"cortexel-{version}.tar.gz",
                **sdist_evidence,
            },
            "wheel": {
                "filename": f"cortexel-{version}-py3-none-any.whl",
                **wheel_evidence,
            },
        },
        "backendWheelhouse": backend_result,
        "contract": PYTHON_PACKAGE_SMOKE_RESULT_CONTRACT,
        "packageVersion": version,
        "python": python_result,
        "resources": {
            "resourceCount": len(expected_resources),
            "skillSchemaCount": skill_schema_count,
        },
        "sourceAuthority": {
            "sha256": inventory_sha256(
                "cortexel-python-package-source-authority-v1",
                source_inventory,
            )
        },
        "status": "passed",
        "uv": uv_result,
    }
    return validate_python_package_smoke_result(result)


def exact_hatchling_version(project: object) -> str:
    if not isinstance(project, dict):
        fail("python/pyproject.toml must decode to a table")
    build_system = project.get("build-system")
    if not isinstance(build_system, dict) or set(build_system) != {
        "build-backend",
        "requires",
    }:
        fail("Python build-system authority must contain only backend and requirements")
    if build_system.get("build-backend") != "hatchling.build":
        fail("Python build backend must be exactly hatchling.build")
    requirements = build_system.get("requires")
    if not isinstance(requirements, list) or len(requirements) != 1:
        fail("Python build-system must have one exact Hatchling requirement")
    requirement = requirements[0]
    numeric = r"(?:0|[1-9][0-9]*)"
    match = (
        re.fullmatch(rf"hatchling==({numeric}\.{numeric}\.{numeric})", requirement)
        if isinstance(requirement, str)
        else None
    )
    if match is None:
        fail("Python build-system must pin Hatchling as hatchling==X.Y.Z")
    return match.group(1)


def validate_python_project_configuration(project: object) -> None:
    """Close every build-executable pyproject table before Hatchling runs."""

    if not isinstance(project, dict) or set(project) != {
        "build-system",
        "project",
        "tool",
    }:
        fail("python/pyproject.toml top-level authority is not closed")
    expected_excludes = [
        "**/__pycache__/**",
        "**/*.pyc",
        "**/*.pyo",
        "**/.DS_Store",
    ]
    expected_tool = {
        "hatch": {
            "build": {
                "targets": {
                    "wheel": {
                        "ignore-vcs": True,
                        "packages": ["src/cortexel"],
                        "exclude": expected_excludes,
                    },
                    "sdist": {
                        "ignore-vcs": True,
                        "only-include": [
                            "src/cortexel",
                            "README.md",
                            "LICENSE",
                            "tests/test_cortexel.py",
                        ],
                        "exclude": expected_excludes,
                    },
                }
            }
        },
        "mypy": {
            "python_version": "3.11",
            "strict": True,
            "files": ["src/cortexel"],
            "show_error_codes": True,
            "warn_unused_configs": True,
        },
    }
    if project.get("tool") != expected_tool:
        fail("python/pyproject.toml tool authority differs from the inert build policy")


def _normalized_distribution_name(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).casefold()


def require_preinstalled_hatchling(
    version: str,
    projections: dict[str, dict[str, bytes]],
    dist_infos: dict[str, str],
    runtime_python: str,
) -> None:
    """Bind the installed backend tree to independently hash-rooted wheel bytes."""

    if EXACT_BUILD_BACKEND_DISTRIBUTIONS["hatchling"] != version:
        fail("the exact build-backend closure drifted from python/pyproject.toml")
    if set(projections) != set(EXACT_BUILD_BACKEND_DISTRIBUTIONS) or set(
        dist_infos
    ) != set(EXACT_BUILD_BACKEND_DISTRIBUTIONS):
        fail("the independently reviewed build-backend projection is incomplete")
    runtime_root = Path(sys.prefix).resolve(strict=True)
    expected_distributions = {
        _normalized_distribution_name(name): expected_version
        for name, expected_version in EXACT_BUILD_BACKEND_DISTRIBUTIONS.items()
    }
    site_roots = {
        Path(sysconfig.get_path(kind)).resolve(strict=True)
        for kind in ("purelib", "platlib")
    }
    if any(
        not site_root.is_relative_to(runtime_root) or not site_root.is_dir()
        for site_root in site_roots
    ):
        fail("the reviewed Python site-packages roots escape its runtime prefix")
    expected_files: dict[str, bytes | None] = {}
    per_distribution_files: dict[str, set[str]] = {}
    for name, projection in projections.items():
        dist_info = dist_infos[name]
        generated = {
            f"{dist_info}/INSTALLER": b"uv",
            f"{dist_info}/REQUESTED": b"",
            f"{dist_info}/uv_cache.json": None,
            f"{dist_info}/RECORD": None,
        }
        names = set(projection) | set(generated)
        per_distribution_files[name] = names
        for relative, payload in {**projection, **generated}.items():
            if relative in expected_files:
                fail(f"independent backend projections collide at {relative}")
            expected_files[relative] = payload

    if len(site_roots) != 1:
        fail("the reviewed Python runtime must have one purelib/platlib site root")
    site_root = next(iter(site_roots))
    installed_files, installed_directories = bounded_tree_entries(
        site_root,
        label="reviewed site-packages",
    )
    actual: dict[str, bytes] = {}
    total_bytes = 0
    for installed in installed_files:
        relative = installed.relative_to(site_root).as_posix()
        status = installed.stat(follow_symlinks=False)
        if stat.S_IMODE(status.st_mode) != 0o644:
            fail(f"reviewed site-packages file mode is not exact 0644: {relative}")
        payload = bounded_regular_file_bytes(
            installed,
            maximum=MAX_RUNTIME_FILE_BYTES,
            label=f"reviewed site-packages file {relative}",
        )
        total_bytes += len(payload)
        if total_bytes > MAX_RUNTIME_TOTAL_BYTES:
            fail("the exact build-backend runtime exceeds its total byte budget")
        actual[relative] = payload
    if set(actual) != set(expected_files):
        fail(
            "reviewed site-packages file inventory differs from exact wheel authority: "
            f"missing={sorted(set(expected_files) - set(actual))}, "
            f"extra={sorted(set(actual) - set(expected_files))}"
        )
    expected_directories = {
        parent.as_posix()
        for relative in expected_files
        for parent in PurePosixPath(relative).parents
        if parent.parts
    }
    actual_directories = {
        path.relative_to(site_root).as_posix() for path in installed_directories
    }
    if actual_directories != expected_directories:
        fail(
            "reviewed site-packages directory inventory differs from exact wheel authority: "
            f"missing={sorted(expected_directories - actual_directories)}, "
            f"extra={sorted(actual_directories - expected_directories)}"
        )
    for directory in installed_directories:
        if stat.S_IMODE(directory.stat(follow_symlinks=False).st_mode) != 0o755:
            fail(
                "reviewed site-packages directory mode is not exact 0755: "
                f"{directory.relative_to(site_root)}"
            )
    for relative, expected_payload in expected_files.items():
        if expected_payload is not None and actual[relative] != expected_payload:
            fail(f"installed backend bytes differ from retained wheel authority: {relative}")
    for name, names in per_distribution_files.items():
        dist_info = dist_infos[name]
        inspect_uv_cache(
            actual[f"{dist_info}/uv_cache.json"],
            label=f"installed {name} uv_cache.json",
        )
        subset = {relative: actual[relative] for relative in names}
        allowed_external_paths: frozenset[str] = frozenset()
        entry_point = EXACT_BUILD_BACKEND_ENTRY_POINTS.get(name)
        if entry_point is not None:
            script_name, module, function = entry_point
            external_record_path = f"../../../bin/{script_name}"
            script_path = runtime_root / "bin" / script_name
            script_status = script_path.stat(follow_symlinks=False)
            if (
                not stat.S_ISREG(script_status.st_mode)
                or stat.S_IMODE(script_status.st_mode) != 0o755
            ):
                fail(f"installed backend console script mode differs: {script_name}")
            script_payload = bounded_regular_file_bytes(
                script_path,
                maximum=MAX_RUNTIME_FILE_BYTES,
                label=f"installed backend console script {script_name}",
            )
            expected_script = expected_uv_entry_point_script(
                runtime_python,
                module,
                function,
            )
            if script_payload != expected_script:
                fail(f"installed backend console script bytes differ: {script_name}")
            subset[external_record_path] = script_payload
            allowed_external_paths = frozenset({external_record_path})
        inspect_wheel_record(
            actual[f"{dist_info}/RECORD"],
            files=subset,
            record_path=f"{dist_info}/RECORD",
            allowed_external_paths=allowed_external_paths,
        )

    observed: dict[str, importlib.metadata.Distribution] = {}
    for distribution in importlib.metadata.distributions(path=[str(site_root)]):
        distribution_name = distribution.metadata["Name"]
        if not isinstance(distribution_name, str) or not distribution_name:
            fail("the reviewed Python runtime contains unnamed distribution metadata")
        normalized = _normalized_distribution_name(distribution_name)
        if normalized in observed:
            fail(f"the reviewed Python runtime contains duplicate distribution {normalized}")
        observed[normalized] = distribution
    if set(observed) != set(expected_distributions):
        fail(
            "the reviewed Python runtime distribution closure is not exact: "
            f"expected={sorted(expected_distributions)}, received={sorted(observed)}"
        )
    for name, expected_version in expected_distributions.items():
        if observed[name].version != expected_version:
            fail(
                f"preinstalled {name} differs from the exact build closure: "
                f"expected {expected_version}, received {observed[name].version}"
            )


def isolated_environment(temporary: Path, python: str, uv: str) -> dict[str, str]:
    allowed = {
        name: os.environ[name]
        for name in (
            "SYSTEMROOT",
            "WINDIR",
        )
        if name in os.environ
    }
    for name, expected in LOCKED_UV_ENVIRONMENT.items():
        present = os.environ.get(name)
        if present is not None and present != expected:
            fail(f"{name} must be exactly {expected!r} when supplied")
    home = temporary / "home"
    home.mkdir()
    uv_cache = temporary / "uv-cache"
    uv_cache.mkdir()
    empty_path = temporary / "empty-path"
    empty_path.mkdir()
    return {
        **allowed,
        "PATH": str(empty_path),
        "HOME": str(home),
        "TMPDIR": str(temporary),
        # The build backend is preinstalled. A disposable cache plus offline uv
        # proves the gate cannot turn a missing backend/interpreter into a download.
        "UV_CACHE_DIR": str(uv_cache),
        "UV_PYTHON": python,
        **LOCKED_UV_ENVIRONMENT,
        "PIP_CONFIG_FILE": os.devnull,
        "PIP_DISABLE_PIP_VERSION_CHECK": "1",
        "PIP_NO_INDEX": "1",
        "PIP_NO_INPUT": "1",
        "PYTHONHASHSEED": "0",
        "PYTHONNOUSERSITE": "1",
        "PYTHONSAFEPATH": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "SOURCE_DATE_EPOCH": SOURCE_DATE_EPOCH,
        "TZ": "UTC",
    }


def venv_python(environment: Path) -> Path:
    return environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def main() -> int:
    require_exact_process_umask()
    result_path: Path | None = None
    result_parent_authority: tuple[Path, tuple[object, ...]] | None = None
    if sys.argv[1:]:
        if len(sys.argv) == 3 and sys.argv[1] == "bootstrap-backend-wheelhouse":
            download_build_backend_wheelhouse(Path(sys.argv[2]))
            print(f"retained exact build-backend wheelhouse: {sys.argv[2]}")
            return 0
        if (
            len(sys.argv) == 4
            and sys.argv[1] == "verify"
            and sys.argv[2] == "--result-file"
        ):
            result_path, result_parent_authority = _authorize_new_result_path(
                sys.argv[3]
            )
        else:
            fail("unsupported Python package smoke arguments")
    python = reviewed_python()
    uv = reviewed_uv(python)
    initial_python_identity, initial_uv_identity = build_python_runtime_results(
        python,
        uv,
    )
    if result_path is not None:
        _require_result_path_disjoint_from_evidence(result_path, uv=uv)
    expected = resource_bytes()
    expected_sources = sdist_source_bytes()
    license_bytes = bounded_regular_file_bytes(
        ROOT / "LICENSE",
        maximum=MAX_SOURCE_FILE_BYTES,
        label="root project license",
    )
    if expected_sources["LICENSE"] != license_bytes:
        fail("python/LICENSE has drifted from the root project license")
    try:
        project_text = expected_sources["pyproject.toml"].decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise RuntimeError("python/pyproject.toml is not UTF-8") from exc
    project = tomllib.loads(project_text)
    validate_python_project_configuration(project)
    hatchling_version = exact_hatchling_version(project)
    expected_metadata = expected_core_metadata(project, expected_sources["README.md"])
    backend_requirements = verify_build_backend_requirements()
    backend_projections, backend_dist_infos = reviewed_build_backend_evidence()
    require_preinstalled_hatchling(
        hatchling_version,
        backend_projections,
        backend_dist_infos,
        python,
    )
    version = project["project"]["version"]
    expected_wheel_name = f"cortexel-{version}-py3-none-any.whl"
    expected_sdist_name = f"cortexel-{version}.tar.gz"
    archive_root = f"cortexel-{version}"
    with tempfile.TemporaryDirectory(prefix="cortexel-python-package-") as raw_temporary:
        temporary = Path(raw_temporary)
        detached_project = temporary / "detached-source"
        materialize_detached_project(detached_project, expected_sources)
        verify_detached_project(detached_project, expected_sources)
        builds: list[tuple[Path, Path]] = []
        for name, source in (
            ("repository-context", PYTHON_PROJECT),
            ("detached-vcs-free-context", detached_project),
        ):
            build_runtime = temporary / f"{name}-runtime"
            build_runtime.mkdir()
            environment = isolated_environment(build_runtime, python, uv)
            output = temporary / name
            output.mkdir()
            run_checked(
                [
                    uv,
                    "--no-config",
                    "build",
                    "--no-build-isolation",
                    str(source),
                    "--out-dir",
                    str(output),
                ],
                cwd=temporary,
                environment=environment,
                timeout=BUILD_TIMEOUT_SECONDS,
                label=f"{name} Python package build",
            )
            require_preinstalled_hatchling(
                hatchling_version,
                backend_projections,
                backend_dist_infos,
                python,
            )
            verify_source_authority_unchanged(
                expected,
                expected_sources,
                license_bytes,
                backend_requirements,
            )
            verify_detached_project(detached_project, expected_sources)
            output_entries = bounded_directory_entries(
                output,
                label=f"{name} build output",
            )
            output_names = {path.name for path in output_entries}
            expected_output_names = {
                ".gitignore",
                expected_wheel_name,
                expected_sdist_name,
            }
            if output_names != expected_output_names or any(
                path.is_symlink() or not path.is_file() for path in output_entries
            ):
                fail(
                    "build output inventory is not the exact wheel/sdist pair: "
                    f"received={sorted(output_names)}"
                )
            uv_output_ignore = output / ".gitignore"
            if (
                bounded_regular_file_bytes(
                    uv_output_ignore,
                    maximum=1,
                    label="uv build output .gitignore",
                )
                != b"*"
                or stat.S_IMODE(uv_output_ignore.stat().st_mode) != 0o644
            ):
                fail("uv build output .gitignore is not its exact inert marker")
            builds.append(
                (output / expected_wheel_name, output / expected_sdist_name)
            )

        first_wheel, first_sdist = builds[0]
        second_wheel, second_sdist = builds[1]
        for wheel, sdist in builds:
            if wheel.name != expected_wheel_name or sdist.name != expected_sdist_name:
                fail(
                    "distribution filename identity drifted: "
                    f"wheel={wheel.name!r}, sdist={sdist.name!r}"
                )
        assert_regular_files_equal(
            first_wheel,
            second_wheel,
            maximum=MAX_WHEEL_ARCHIVE_BYTES,
            label="repository-context and detached-source wheels",
        )
        assert_regular_files_equal(
            first_sdist,
            second_sdist,
            maximum=MAX_SDIST_COMPRESSED_BYTES,
            label="repository-context and detached-source sdists",
        )
        wheel_files = inspect_wheel(
            first_wheel,
            expected,
            expected_sources,
            license_bytes,
            version,
            hatchling_version,
            expected_metadata,
        )
        inspect_sdist(
            first_sdist,
            expected,
            expected_sources,
            license_bytes,
            archive_root,
            expected_metadata,
        )
        initial_wheel_digest = sha256_regular_file(
            first_wheel,
            maximum=MAX_WHEEL_ARCHIVE_BYTES,
            label="validated wheel archive",
        )
        initial_sdist_digest = sha256_regular_file(
            first_sdist,
            maximum=MAX_SDIST_COMPRESSED_BYTES,
            label="validated sdist archive",
        )
        for artifact in (first_wheel, first_sdist, second_wheel, second_sdist):
            artifact.chmod(0o444)
            if stat.S_IMODE(artifact.stat(follow_symlinks=False).st_mode) != 0o444:
                fail(f"validated artifact could not be sealed read-only: {artifact.name}")

        clean_environment = temporary / "clean-venv"
        venv.EnvBuilder(
            with_pip=False,
            clear=True,
            symlinks=os.name != "nt",
        ).create(clean_environment)
        clean_runtime = temporary / "clean-install-runtime"
        clean_runtime.mkdir()
        clean_environment_variables = isolated_environment(clean_runtime, python, uv)
        interpreter = venv_python(clean_environment)
        run_checked(
            [
                uv,
                "--no-config",
                "pip",
                "install",
                "--python",
                str(interpreter),
                "--no-index",
                "--no-deps",
                "--link-mode",
                "copy",
                "--only-binary",
                ":all:",
                str(first_wheel),
            ],
            cwd=temporary,
            environment=clean_environment_variables,
            timeout=INSTALL_TIMEOUT_SECONDS,
            label="clean wheel install",
        )
        installed_site_packages = inspect_clean_install(
            clean_environment,
            first_wheel,
            wheel_files,
            version,
        )
        probe = """
import importlib.metadata
import pathlib
import sys

site_packages = pathlib.Path(__SITE_PACKAGES_LITERAL__).resolve(strict=True)
sys.path.insert(0, str(site_packages))

import cortexel
from cortexel.generated import STABLE_SKILL_IDS
from cortexel.validate import _load_schema

package_file = pathlib.Path(cortexel.__file__).resolve(strict=True)
assert package_file.is_relative_to(site_packages)
assert [(item.metadata["Name"], item.version) for item in importlib.metadata.distributions(path=[str(site_packages)])] == [
    ("cortexel", "__CORTEXEL_VERSION__")
]
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
""".replace(
            "__CORTEXEL_VERSION__",
            version,
        ).replace(
            "__SITE_PACKAGES_LITERAL__",
            json.dumps(str(installed_site_packages)),
        )
        probe_environment = {
            **clean_environment_variables,
            "PYTHONNOUSERSITE": "1",
        }
        probe_environment.pop("PYTHONPATH", None)
        probe_environment.pop("PYTHONHOME", None)
        run_checked(
            [python, "-I", "-S", "-B", "-c", probe],
            cwd=temporary,
            environment=probe_environment,
            timeout=PROBE_TIMEOUT_SECONDS,
            label="clean installed-wheel probe",
        )
        inspect_clean_install(
            clean_environment,
            first_wheel,
            wheel_files,
            version,
        )
        require_preinstalled_hatchling(
            hatchling_version,
            backend_projections,
            backend_dist_infos,
            python,
        )
        verify_source_authority_unchanged(
            expected,
            expected_sources,
            license_bytes,
            backend_requirements,
        )
        verify_detached_project(detached_project, expected_sources)
        assert_regular_files_equal(
            first_wheel,
            second_wheel,
            maximum=MAX_WHEEL_ARCHIVE_BYTES,
            label="final repository-context and detached-source wheels",
        )
        assert_regular_files_equal(
            first_sdist,
            second_sdist,
            maximum=MAX_SDIST_COMPRESSED_BYTES,
            label="final repository-context and detached-source sdists",
        )
        final_wheel_evidence = regular_file_sha256_evidence(
            first_wheel,
            maximum=MAX_WHEEL_ARCHIVE_BYTES,
            label="final wheel archive",
        )
        final_sdist_evidence = regular_file_sha256_evidence(
            first_sdist,
            maximum=MAX_SDIST_COMPRESSED_BYTES,
            label="final sdist archive",
        )
        if (
            final_wheel_evidence["sha256"] != f"sha256:{initial_wheel_digest}"
            or final_sdist_evidence["sha256"] != f"sha256:{initial_sdist_digest}"
        ):
            fail("validated Python artifacts changed after their initial inspection")

    final_python = reviewed_python()
    final_uv = reviewed_uv(final_python)
    if final_python != python or final_uv != uv:
        fail("reviewed Python or uv identity changed after package verification")
    final_backend_projections, final_backend_dist_infos = (
        reviewed_build_backend_evidence()
    )
    if (
        final_backend_projections != backend_projections
        or final_backend_dist_infos != backend_dist_infos
    ):
        fail("reviewed build-backend authority changed after package verification")
    require_preinstalled_hatchling(
        hatchling_version,
        final_backend_projections,
        final_backend_dist_infos,
        final_python,
    )
    verify_source_authority_unchanged(
        expected,
        expected_sources,
        license_bytes,
        backend_requirements,
    )
    result = build_python_package_smoke_result(
        version=version,
        python=final_python,
        uv=final_uv,
        expected_resources=expected,
        expected_sources=expected_sources,
        license_bytes=license_bytes,
        backend_requirements=backend_requirements,
        wheel_evidence=final_wheel_evidence,
        sdist_evidence=final_sdist_evidence,
    )
    post_result_python = reviewed_python()
    post_result_uv = reviewed_uv(post_result_python)
    if post_result_python != final_python or post_result_uv != final_uv:
        fail("reviewed runtime identity changed while constructing the result")
    post_python_identity, post_uv_identity = build_python_runtime_results(
        post_result_python,
        post_result_uv,
    )
    if (
        result["python"] != initial_python_identity
        or result["uv"] != initial_uv_identity
        or result["python"] != post_python_identity
        or result["uv"] != post_uv_identity
        or result["backendWheelhouse"] != build_backend_wheelhouse_result()
    ):
        fail(
            "reviewed runtime or wheelhouse evidence changed across package verification"
        )
    verify_source_authority_unchanged(
        expected,
        expected_sources,
        license_bytes,
        backend_requirements,
    )
    if result_path is None:
        print(
            f"Python package smoke passed for {version}: "
            f"wheel {final_wheel_evidence['sha256']}, "
            f"sdist {final_sdist_evidence['sha256']}, "
            f"{len(expected)} exact schema resources"
        )
    else:
        _require_result_path_disjoint_from_evidence(
            result_path,
            uv=post_result_uv,
        )
        write_python_package_smoke_result(
            result_path,
            result,
            expected_parent_authority=result_parent_authority,
        )
        if read_python_package_smoke_result(result_path) != result:
            fail("durable Python package smoke result differs after creation")
        written_python = reviewed_python()
        written_uv = reviewed_uv(written_python)
        written_python_identity, written_uv_identity = build_python_runtime_results(
            written_python,
            written_uv,
        )
        if (
            written_python != final_python
            or written_uv != final_uv
            or written_python_identity != result["python"]
            or written_uv_identity != result["uv"]
            or build_backend_wheelhouse_result() != result["backendWheelhouse"]
        ):
            fail("reviewed runtime or wheelhouse evidence changed after result creation")
        require_preinstalled_hatchling(
            hatchling_version,
            final_backend_projections,
            final_backend_dist_infos,
            written_python,
        )
        verify_source_authority_unchanged(
            expected,
            expected_sources,
            license_bytes,
            backend_requirements,
        )
        if read_python_package_smoke_result(result_path) != result:
            fail("durable Python package smoke result changed after final verification")
        if result_parent_authority is None:
            fail("Python package smoke result parent authority was not retained")
        _require_result_parent_authority_unchanged(result_parent_authority)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
