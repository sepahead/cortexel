#!/usr/bin/env python3
"""Build, inspect, and clean-install the exact standalone Python distributions."""

from __future__ import annotations

import base64
import csv
import hashlib
import importlib.metadata
import io
import os
import re
import shutil
import stat
import struct
import subprocess
import sys
import tempfile
import tomllib
import venv
import zipfile
import zlib
from pathlib import Path, PurePosixPath
from typing import NoReturn


ROOT = Path(__file__).resolve().parents[1]
PYTHON_PROJECT = ROOT / "python"
PACKAGED_CONTRACT = PYTHON_PROJECT / "src" / "cortexel" / "contract"
SOURCE_DATE_EPOCH = "946684800"  # 2000-01-01T00:00:00Z
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
BUILD_BACKEND_REQUIREMENTS = ROOT / ".github" / "requirements" / "python-package-build.txt"


def fail(message: str) -> NoReturn:
    raise RuntimeError(message)


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


def sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def verify_build_backend_requirements(
    path: Path = BUILD_BACKEND_REQUIREMENTS,
) -> None:
    """Bind the bootstrap lock to the exact universal wheels reviewed here."""

    if set(EXACT_BUILD_BACKEND_DISTRIBUTIONS) != set(
        EXACT_BUILD_BACKEND_WHEEL_HASHES
    ):
        fail("the build-backend version and wheel-hash inventories differ")
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
        actual = path.read_bytes()
    except OSError as exc:
        raise RuntimeError("the exact build-backend requirements lock is unreadable") from exc
    if actual != expected:
        fail("the exact wheel-only build-backend requirements lock has drifted")


def resource_bytes() -> dict[str, bytes]:
    resources = {
        path.relative_to(PACKAGED_CONTRACT).as_posix(): path.read_bytes()
        for path in sorted(PACKAGED_CONTRACT.rglob("*.json"))
    }
    if not resources:
        fail("the generator-owned Python contract projection is empty")
    return resources


def inspect_core_metadata(payload: bytes, label: str, expected_version: str) -> None:
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
        headers.setdefault(name, []).append(value)
    if "Requires-Dist" in headers or "Provides-Extra" in headers:
        fail(f"{label} unexpectedly advertises runtime dependencies or optional extras")
    required = {
        "Metadata-Version": "2.4",
        "Name": "cortexel",
        "Version": expected_version,
        "License-Expression": "MIT",
        "License-File": "LICENSE",
        "Requires-Python": ">=3.11",
    }
    for name, value in required.items():
        if headers.get(name) != [value]:
            fail(f"{label} must contain exactly {name}: {value}")


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
        path = safe_archive_name(name)
        if path.as_posix() != name or name in observed:
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
        payload += decoder.flush()
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
    archive: zipfile.ZipFile,
    infos: list[zipfile.ZipInfo],
) -> dict[str, bytes]:
    """Parse the bounded ZIP records and deflate streams independently of zipfile."""

    raw = wheel.read_bytes()
    if not raw or len(raw) > MAX_WHEEL_ARCHIVE_BYTES:
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
        or total_entries != len(infos)
        or total_entries >= 0xFFFF
        or central_size >= 0xFFFFFFFF
        or central_offset >= 0xFFFFFFFF
        or comment_length != 0
        or central_offset + central_size != len(raw) - 22
        or archive.comment
        or archive.start_dir != central_offset
    ):
        fail("wheel ZIP end record is split, extended, commented, or inconsistent")

    expected_dos_date = ((2000 - 1980) << 9) | (1 << 5) | 1
    central_cursor = central_offset
    local_cursor = 0
    files: dict[str, bytes] = {}
    for info in infos:
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
            expected_name = info.filename.encode("ascii", "strict")
        except UnicodeEncodeError as exc:
            raise RuntimeError("wheel paths must be portable ASCII") from exc
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
            or raw[name_start:name_end] != expected_name
            or info.create_system != 3
            or info.create_version != 20
            or info.extract_version != version_needed
            or info.flag_bits != flags
            or info.compress_type != compression
            or info.date_time != (2000, 1, 1, 0, 0, 0)
            or info.CRC != crc32
            or info.compress_size != compressed_size
            or info.file_size != file_size
            or info.internal_attr != internal_attributes
            or info.external_attr != external_attributes
            or info.header_offset != local_offset
        ):
            fail(f"wheel central record is noncanonical or inconsistent: {info.filename}")
        central_cursor = record_end

        if local_offset != local_cursor or local_offset + 30 > central_offset:
            fail(f"wheel local records overlap or contain gaps: {info.filename}")
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
            or raw[local_name_start:local_name_end] != expected_name
        ):
            fail(f"wheel local record is noncanonical or inconsistent: {info.filename}")
        payload = _inflate_wheel_member(
            info.filename,
            raw[payload_start:payload_end],
            file_size,
        )
        if zlib.crc32(payload) & 0xFFFFFFFF != crc32:
            fail(f"wheel member CRC differs from its bytes: {info.filename}")
        files[info.filename] = payload
        local_cursor = payload_end

    if central_cursor != len(raw) - 22 or local_cursor != central_offset:
        fail("wheel local or central records do not exactly fill their declared regions")
    return files


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
    compressed = sdist.read_bytes()
    if not compressed or len(compressed) > MAX_SDIST_COMPRESSED_BYTES:
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
        raw += decoder.flush()
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
) -> None:
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
    with zipfile.ZipFile(wheel) as archive:
        infos = archive.infolist()
        if len(infos) > 10_000:
            fail("wheel archive entry budget exceeded")
        files = _strict_wheel_files(wheel, archive, infos)
        seen: set[str] = set()
        total_bytes = 0
        for info in infos:
            path = safe_archive_name(info.filename)
            if info.is_dir() or info.filename != path.as_posix():
                fail(f"wheel contains a non-canonical path: {info.filename!r}")
            if info.filename in seen:
                fail(f"wheel contains duplicate path {info.filename!r}")
            seen.add(info.filename)
            mode = info.external_attr >> 16
            file_type = stat.S_IFMT(mode)
            if file_type not in (0, stat.S_IFREG) or stat.S_IMODE(mode) != 0o644:
                fail(f"wheel file mode is not exact non-executable 0644: {info.filename}")
            if info.file_size > MAX_WHEEL_FILE_BYTES:
                fail(f"wheel file exceeds its byte budget: {info.filename}")
            total_bytes += info.file_size
            if total_bytes > MAX_WHEEL_TOTAL_BYTES:
                fail("wheel uncompressed-byte budget exceeded")
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
        inspect_core_metadata(files[metadata_path], "wheel Core Metadata", version)
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


def reviewed_python() -> str:
    executable = Path(sys.executable)
    if not executable.is_absolute():
        fail("the running Python executable must be absolute")
    try:
        resolved = executable.resolve(strict=True)
    except OSError as exc:
        raise RuntimeError("the running Python executable cannot be resolved") from exc
    if not resolved.is_file() or not os.access(resolved, os.X_OK):
        fail("the running Python executable is not an executable regular file")
    try:
        runtime_root = Path(sys.prefix).resolve(strict=True)
    except OSError as exc:
        raise RuntimeError("the running Python prefix cannot be resolved") from exc
    if not resolved.is_relative_to(runtime_root):
        fail("the running Python executable escapes its reviewed runtime prefix")
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


def require_preinstalled_hatchling(version: str) -> None:
    if EXACT_BUILD_BACKEND_DISTRIBUTIONS["hatchling"] != version:
        fail("the exact build-backend closure drifted from python/pyproject.toml")
    runtime_root = Path(sys.prefix).resolve(strict=True)
    for name, expected_version in EXACT_BUILD_BACKEND_DISTRIBUTIONS.items():
        try:
            distribution = importlib.metadata.distribution(name)
        except importlib.metadata.PackageNotFoundError as exc:
            raise RuntimeError(
                f"build-backend distribution {name}=={expected_version} must be "
                "preinstalled in the reviewed Python runtime"
            ) from exc
        if distribution.version != expected_version:
            fail(
                f"preinstalled {name} differs from the exact build closure: "
                f"expected {expected_version}, received {distribution.version}"
            )
        files = distribution.files
        if not files:
            fail(f"preinstalled {name} has no installed-file inventory")
        for relative in files:
            installed = Path(distribution.locate_file(relative))
            try:
                resolved = installed.resolve(strict=True)
            except OSError as exc:
                raise RuntimeError(
                    f"preinstalled {name} inventory entry is missing: {relative}"
                ) from exc
            if not resolved.is_relative_to(runtime_root) or not resolved.is_file():
                fail(
                    f"preinstalled {name} entry escapes the reviewed runtime: "
                    f"{relative}"
                )


def isolated_environment(temporary: Path, python: str) -> dict[str, str]:
    allowed = {
        name: os.environ[name]
        for name in (
            "PATH",
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
    return {
        **allowed,
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
        "SOURCE_DATE_EPOCH": SOURCE_DATE_EPOCH,
        "TZ": "UTC",
    }


def venv_python(environment: Path) -> Path:
    return environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def main() -> int:
    uv = shutil.which("uv")
    if uv is None:
        fail("uv is required for isolated PEP 517 package smoke testing")
    python = reviewed_python()
    expected = resource_bytes()
    expected_sources = sdist_source_bytes()
    license_bytes = (ROOT / "LICENSE").read_bytes()
    if (PYTHON_PROJECT / "LICENSE").read_bytes() != license_bytes:
        fail("python/LICENSE has drifted from the root project license")
    project = tomllib.loads((PYTHON_PROJECT / "pyproject.toml").read_text(encoding="utf-8"))
    hatchling_version = exact_hatchling_version(project)
    verify_build_backend_requirements()
    require_preinstalled_hatchling(hatchling_version)
    version = project["project"]["version"]
    expected_wheel_name = f"cortexel-{version}-py3-none-any.whl"
    expected_sdist_name = f"cortexel-{version}.tar.gz"
    archive_root = f"cortexel-{version}"
    with tempfile.TemporaryDirectory(prefix="cortexel-python-package-") as raw_temporary:
        temporary = Path(raw_temporary)
        environment = isolated_environment(temporary, python)
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
                env=environment,
                check=True,
            )
            output_entries = sorted(output.iterdir())
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
                uv_output_ignore.read_bytes() != b"*"
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
        if first_wheel.read_bytes() != second_wheel.read_bytes():
            fail("repository-context and detached-source wheels are not byte-for-byte reproducible")
        if first_sdist.read_bytes() != second_sdist.read_bytes():
            fail("repository-context and detached-source sdists are not byte-for-byte reproducible")
        inspect_wheel(
            first_wheel,
            expected,
            expected_sources,
            license_bytes,
            version,
            hatchling_version,
        )
        inspect_sdist(first_sdist, expected, expected_sources, license_bytes, archive_root)

        clean_environment = temporary / "clean-venv"
        venv.EnvBuilder(
            with_pip=False,
            clear=True,
            symlinks=os.name != "nt",
        ).create(clean_environment)
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
