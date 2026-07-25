from __future__ import annotations

import base64
import gzip
import hashlib
import io
import importlib.util
import os
import stat
import sys
import tarfile
import tempfile
import time
import unittest
import zipfile
import zlib
from collections.abc import Sequence
from pathlib import Path, PurePosixPath
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "cortexel_smoke_python_package",
    ROOT / "scripts/smoke-python-package.py",
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("cannot load the Python package smoke helper")
smoke = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(smoke)


class PythonPackageSmokeBoundaryTest(unittest.TestCase):
    VERSION = "1.2.3"
    HATCHLING_VERSION = "1.31.0"
    LICENSE = b"license\n"
    RESOURCES = {"schema.json": b"{}\n"}
    SOURCES = {
        "src/cortexel/__init__.py": b"__all__ = []\n",
        "src/cortexel/contract/schema.json": b"{}\n",
        "src/cortexel/py.typed": b"",
    }

    @staticmethod
    def _zip_info(name: str, mode: int = stat.S_IFREG | 0o644) -> zipfile.ZipInfo:
        info = zipfile.ZipInfo(name, date_time=(2000, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = mode << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        return info

    def _metadata(self, *extra_headers: str) -> bytes:
        return (
            "Metadata-Version: 2.4\n"
            "Name: cortexel\n"
            f"Version: {self.VERSION}\n"
            "License-Expression: MIT\n"
            "License-File: LICENSE\n"
            "Requires-Python: >=3.11\n"
            + "".join(f"{header}\n" for header in extra_headers)
            + "\n"
        ).encode("utf-8")

    def _wheel(
        self,
        root: Path,
        extras: Sequence[tuple[zipfile.ZipInfo, bytes]] = (),
        *,
        metadata: bytes | None = None,
        external_attributes: int | None = None,
        generated_external_attributes: int | None = None,
    ) -> Path:
        dist_info = f"cortexel-{self.VERSION}.dist-info"
        entries = {
            "cortexel/__init__.py": self.SOURCES["src/cortexel/__init__.py"],
            "cortexel/contract/schema.json": self.RESOURCES["schema.json"],
            "cortexel/py.typed": b"",
            f"{dist_info}/METADATA": metadata or self._metadata(),
            f"{dist_info}/WHEEL": (
                "Wheel-Version: 1.0\n"
                f"Generator: hatchling {self.HATCHLING_VERSION}\n"
                "Root-Is-Purelib: true\n"
                "Tag: py3-none-any\n"
            ).encode("utf-8"),
            f"{dist_info}/licenses/LICENSE": self.LICENSE,
        }
        record_path = f"{dist_info}/RECORD"
        records = [
            (
                f"{name},sha256="
                + base64.urlsafe_b64encode(hashlib.sha256(payload).digest())
                .rstrip(b"=")
                .decode("ascii")
                + f",{len(payload)}\n"
            )
            for name, payload in sorted(entries.items())
        ]
        entries[record_path] = ("".join(records) + f"{record_path},,\n").encode()
        wheel = root / f"cortexel-{self.VERSION}-py3-none-any.whl"
        with zipfile.ZipFile(wheel, "w") as archive:
            for name, payload in entries.items():
                info = self._zip_info(name)
                if external_attributes is not None:
                    info.external_attr = external_attributes
                elif PurePosixPath(name).parts[0].endswith(".dist-info"):
                    info.external_attr = (
                        0o644 << 16
                        if generated_external_attributes is None
                        else generated_external_attributes
                    )
                archive.writestr(info, payload)
            for info, payload in extras:
                archive.writestr(info, payload)
        return wheel

    def _sdist(
        self,
        root: Path,
        *,
        mutations: Sequence[tuple[str, bytes, int, bytes]] = (),
    ) -> tuple[Path, dict[str, bytes]]:
        archive_root = f"cortexel-{self.VERSION}"
        sources = {**self.SOURCES, "LICENSE": self.LICENSE}
        package_info = self._metadata()
        entries = [
            (f"{archive_root}/{name}", payload, 0o644, tarfile.REGTYPE)
            for name, payload in sorted({**sources, "PKG-INFO": package_info}.items())
        ]
        entries.extend(mutations)
        stream = io.BytesIO()
        with tarfile.open(
            fileobj=stream,
            mode="w",
            format=tarfile.USTAR_FORMAT,
        ) as archive:
            for name, payload, mode, entry_type in entries:
                info = tarfile.TarInfo(name)
                info.mode = mode
                info.uid = 0
                info.gid = 0
                info.uname = ""
                info.gname = ""
                info.mtime = int(smoke.SOURCE_DATE_EPOCH)
                info.type = entry_type
                info.size = len(payload) if entry_type == tarfile.REGTYPE else 0
                if entry_type == tarfile.SYMTYPE:
                    info.linkname = payload.decode("ascii")
                    archive.addfile(info)
                else:
                    archive.addfile(info, io.BytesIO(payload))
        path = root / f"{archive_root}.tar.gz"
        path.write_bytes(
            gzip.compress(
                stream.getvalue(),
                compresslevel=9,
                mtime=int(smoke.SOURCE_DATE_EPOCH),
            )
        )
        return path, sources

    def _inspect(self, wheel: Path) -> None:
        smoke.inspect_wheel(
            wheel,
            self.RESOURCES,
            self.SOURCES,
            self.LICENSE,
            self.VERSION,
            self.HATCHLING_VERSION,
            self._metadata(),
        )

    def test_exact_pure_python_wheel_is_accepted(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            self._inspect(self._wheel(Path(temporary)))

    def test_native_executable_and_special_wheel_entries_fail_closed(self) -> None:
        cases = (
            (
                "native suffix",
                self._zip_info("cortexel/extension.so"),
                b"not an executable image\n",
                "native payload",
            ),
            (
                "native magic",
                self._zip_info("cortexel/extension.bin"),
                b"\x7fELF" + b"\0" * 32,
                "native payload",
            ),
            (
                "executable",
                self._zip_info("cortexel/tool", stat.S_IFREG | 0o755),
                b"#!/bin/sh\n",
                "external attributes",
            ),
            (
                "symlink",
                self._zip_info("cortexel/link", stat.S_IFLNK | 0o777),
                b"target",
                "external attributes",
            ),
        )
        for label, info, payload, error in cases:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temporary:
                wheel = self._wheel(Path(temporary), [(info, payload)])
                with self.assertRaisesRegex(RuntimeError, error):
                    self._inspect(wheel)

    def test_wheel_external_attributes_are_exact_and_authority_free(self) -> None:
        cases = (
            (
                "DOS read-only authority",
                ((stat.S_IFREG | 0o644) << 16) | 0x01,
            ),
            (
                "missing regular-file type",
                0o644 << 16,
            ),
        )
        for label, attributes in cases:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temporary:
                wheel = self._wheel(
                    Path(temporary),
                    external_attributes=attributes,
                )
                with self.assertRaisesRegex(RuntimeError, "external attributes"):
                    self._inspect(wheel)

        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(
                Path(temporary),
                generated_external_attributes=(stat.S_IFREG | 0o644) << 16,
            )
            with self.assertRaisesRegex(RuntimeError, "external attributes"):
                self._inspect(wheel)

    def test_core_metadata_is_case_insensitive_and_source_closed(self) -> None:
        cases = (
            (
                "lowercase dependency",
                self._metadata("requires-dist: attacker-package==1"),
                "runtime dependencies",
            ),
            (
                "mixed-case duplicate name",
                self._metadata("nAmE: another-project"),
                "exactly name",
            ),
            (
                "unreviewed harmless field",
                self._metadata("Summary: unreviewed drift"),
                "pyproject/README-derived",
            ),
        )
        for label, metadata, error in cases:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temporary:
                wheel = self._wheel(Path(temporary), metadata=metadata)
                with self.assertRaisesRegex(RuntimeError, error):
                    self._inspect(wheel)

    def test_file_byte_budget_is_enforced_before_reading(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            oversized = Path(temporary) / "oversized.bin"
            with oversized.open("wb") as stream:
                stream.truncate(65)
            with self.assertRaisesRegex(RuntimeError, "64-byte budget"):
                smoke.bounded_regular_file_bytes(
                    oversized,
                    maximum=64,
                    label="red-team fixture",
                )

    def test_bounded_file_rejects_hardlinks_and_same_size_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "source"
            alias = Path(temporary) / "alias"
            source.write_bytes(b"same-size")
            os.link(source, alias)
            with self.assertRaisesRegex(RuntimeError, "exactly one filesystem link"):
                smoke.bounded_regular_file_bytes(
                    source,
                    maximum=64,
                    label="hardlink fixture",
                )

        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "source"
            source.write_bytes(b"same-size")
            status = source.stat(follow_symlinks=False)
            stable = SimpleNamespace(**{
                name: getattr(status, name, None)
                for name in (
                    "st_dev",
                    "st_ino",
                    "st_mode",
                    "st_size",
                    "st_nlink",
                    "st_uid",
                    "st_gid",
                    "st_mtime_ns",
                    "st_ctime_ns",
                    "st_flags",
                    "st_birthtime",
                )
            })
            changed = SimpleNamespace(**vars(stable))
            changed.st_mtime_ns += 1
            with (
                patch.object(smoke.os, "fstat", side_effect=[stable, changed]),
                self.assertRaisesRegex(RuntimeError, "changed size or exceeded"),
            ):
                smoke.bounded_regular_file_bytes(
                    source,
                    maximum=64,
                    label="mutation fixture",
                )

    def test_tree_and_subprocess_resource_bounds_are_finite(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for index in range(3):
                (root / f"entry-{index}").write_bytes(b"")
            with (
                patch.object(smoke, "MAX_DIRECTORY_CHILDREN", 2),
                self.assertRaisesRegex(RuntimeError, "child budget exceeded"),
            ):
                smoke.bounded_tree_entries(root, label="bounded tree fixture")

        fake_process = SimpleNamespace(
            pid=123456789,
            wait=lambda timeout: 0,
            poll=lambda: 0,
        )
        with (
            patch.object(smoke.subprocess, "Popen", return_value=fake_process) as launch,
            patch.object(smoke.os, "killpg", side_effect=ProcessLookupError),
        ):
            smoke.run_checked(
                ["fixture"],
                cwd=ROOT,
                environment={},
                timeout=1,
                label="closed-stdin fixture",
            )
        self.assertEqual(launch.call_args.kwargs["stdin"], smoke.subprocess.DEVNULL)
        self.assertTrue(launch.call_args.kwargs["start_new_session"])

        with self.assertRaisesRegex(RuntimeError, "timeout|cleanup was denied"):
            smoke.run_checked(
                [sys.executable, "-c", "import time; time.sleep(60)"],
                cwd=ROOT,
                environment={},
                timeout=1,
                label="bounded subprocess fixture",
            )

        with (
            patch.object(smoke.os, "killpg", wraps=os.killpg) as kill_group,
            self.assertRaisesRegex(
                RuntimeError,
                "captured-output budget|cleanup was denied",
            ),
        ):
            smoke.run_checked(
                [
                    sys.executable,
                    "-c",
                    f"import os; os.write(1, b'x' * {smoke.MAX_SUBPROCESS_OUTPUT_BYTES + 1})",
                ],
                cwd=ROOT,
                environment={},
                timeout=10,
                label="oversized subprocess fixture",
                capture_output=True,
            )
        self.assertLessEqual(
            sum(call.args[1] == smoke.signal.SIGTERM for call in kill_group.call_args_list),
            1,
        )
        self.assertLessEqual(
            sum(call.args[1] == smoke.signal.SIGKILL for call in kill_group.call_args_list),
            1,
        )

        with tempfile.TemporaryDirectory() as temporary:
            child_pid = Path(temporary) / "child.pid"
            program = (
                "import pathlib, signal, subprocess, sys, time; "
                "child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)']); "
                "signal.signal(signal.SIGTERM, lambda *_: (child.wait(), sys.exit(0))); "
                f"pathlib.Path({str(child_pid)!r}).write_text(str(child.pid)); "
                "time.sleep(60)"
            )
            with self.assertRaisesRegex(RuntimeError, "timeout|cleanup was denied"):
                smoke.run_checked(
                    [sys.executable, "-c", program],
                    cwd=ROOT,
                    environment={},
                    timeout=3,
                    label="process-group fixture",
                )
            pid = int(child_pid.read_text())
            for _attempt in range(20):
                try:
                    os.kill(pid, 0)
                except ProcessLookupError:
                    break
                time.sleep(0.05)
            else:
                self.fail("timed-out subprocess descendant survived its process group")

    def test_wheel_inventory_and_source_bytes_are_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            unexpected = self._wheel(
                Path(temporary),
                [(self._zip_info("cortexel/unexpected.txt"), b"unexpected\n")],
            )
            with self.assertRaisesRegex(RuntimeError, "file inventory is not closed"):
                self._inspect(unexpected)

        changed_sources = dict(self.SOURCES)
        changed_sources["src/cortexel/__init__.py"] = b"different\n"
        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(Path(temporary))
            with self.assertRaisesRegex(RuntimeError, "package bytes drifted"):
                smoke.inspect_wheel(
                    wheel,
                    self.RESOURCES,
                    changed_sources,
                    self.LICENSE,
                    self.VERSION,
                    self.HATCHLING_VERSION,
                    self._metadata(),
                )

    def test_wheel_container_rejects_trailing_and_comment_authority(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(Path(temporary))
            wheel.write_bytes(wheel.read_bytes() + b"trailing")
            with self.assertRaisesRegex(RuntimeError, "canonical ZIP archive"):
                self._inspect(wheel)

        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(Path(temporary))
            with zipfile.ZipFile(wheel, "a") as archive:
                archive.comment = b"unreviewed authority"
            with self.assertRaisesRegex(RuntimeError, "canonical ZIP archive|end record"):
                self._inspect(wheel)

    def test_archive_decompression_and_cumulative_budgets_precede_retention(self) -> None:
        compressor = zlib.compressobj(level=9, wbits=-zlib.MAX_WBITS)
        compressed = compressor.compress(b"x" * 1_000_000) + compressor.flush()
        with (
            patch.object(smoke, "MAX_WHEEL_FILE_BYTES", 64),
            self.assertRaisesRegex(RuntimeError, "oversized"),
        ):
            smoke._inflate_wheel_member("bomb", compressed, 1_000_000)

        with tempfile.TemporaryDirectory() as temporary:
            bomb = Path(temporary) / "bomb.tar.gz"
            bomb.write_bytes(
                gzip.compress(
                    b"x" * 1_000_000,
                    compresslevel=9,
                    mtime=int(smoke.SOURCE_DATE_EPOCH),
                )
            )
            with (
                patch.object(smoke, "MAX_SDIST_TAR_BYTES", 64),
                self.assertRaisesRegex(RuntimeError, "oversized"),
            ):
                smoke._decompress_single_gzip(bomb)

        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(Path(temporary))
            with (
                patch.object(smoke, "MAX_WHEEL_ARCHIVE_BYTES", 32),
                patch.object(
                    smoke.zipfile,
                    "ZipFile",
                    side_effect=AssertionError("zipfile ran before raw preflight"),
                ) as parser,
                self.assertRaisesRegex(RuntimeError, "budget"),
            ):
                self._inspect(wheel)
            parser.assert_not_called()

        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(Path(temporary))
            with (
                patch.object(smoke, "MAX_WHEEL_TOTAL_BYTES", 16),
                self.assertRaisesRegex(RuntimeError, "uncompressed-byte budget"),
            ):
                self._inspect(wheel)

    def test_wheel_local_offset_corruption_fails_without_secondary_exception(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(Path(temporary))
            raw = bytearray(wheel.read_bytes())
            central_offset = smoke.struct.unpack_from("<I", raw, len(raw) - 6)[0]
            smoke.struct.pack_into("<I", raw, central_offset + 42, 1)
            wheel.write_bytes(raw)
            with self.assertRaisesRegex(RuntimeError, "overlap|gaps"):
                self._inspect(wheel)

    def test_wheel_record_binds_every_file_digest_and_size(self) -> None:
        dist_info = f"cortexel-{self.VERSION}.dist-info"
        record_path = f"{dist_info}/RECORD"
        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(Path(temporary))
            rewritten = Path(temporary) / "rewritten.whl"
            with zipfile.ZipFile(wheel) as source, zipfile.ZipFile(
                rewritten,
                "w",
            ) as target:
                for info in source.infolist():
                    payload = source.read(info)
                    if info.filename == record_path:
                        payload = payload.replace(b"sha256=", b"sha256=A", 1)
                    target.writestr(info, payload)
            with self.assertRaisesRegex(RuntimeError, "digest"):
                self._inspect(rewritten)

        with tempfile.TemporaryDirectory() as temporary:
            wheel = self._wheel(Path(temporary))
            rewritten = Path(temporary) / "rewritten.whl"
            with zipfile.ZipFile(wheel) as source, zipfile.ZipFile(
                rewritten,
                "w",
            ) as target:
                for info in source.infolist():
                    payload = source.read(info)
                    if info.filename == record_path:
                        lines = payload.splitlines(keepends=True)
                        payload = b"".join([lines[0], lines[0], *lines[1:]])
                    target.writestr(info, payload)
            with self.assertRaisesRegex(RuntimeError, "row count|duplicate"):
                self._inspect(rewritten)

    def test_sdist_rejects_semantic_duplicates_modes_and_special_entries(self) -> None:
        archive_root = f"cortexel-{self.VERSION}"
        cases = (
            (
                "semantic duplicate",
                [
                    (
                        f"{archive_root}/src/cortexel/./__init__.py",
                        b"malicious\n",
                        0o644,
                        tarfile.REGTYPE,
                    )
                ],
                "unsafe path|duplicate semantic path",
            ),
            (
                "executable mode",
                [
                    (
                        f"{archive_root}/extra",
                        b"#!/bin/sh\n",
                        0o755,
                        tarfile.REGTYPE,
                    )
                ],
                "mode must be exactly 0644",
            ),
            (
                "symlink",
                [
                    (
                        f"{archive_root}/link",
                        b"LICENSE",
                        0o777,
                        tarfile.SYMTYPE,
                    )
                ],
                "link authority|indirect or special",
            ),
        )
        for label, mutations, error in cases:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temporary:
                sdist, sources = self._sdist(
                    Path(temporary),
                    mutations=mutations,
                )
                with self.assertRaisesRegex(RuntimeError, error):
                    smoke.inspect_sdist(
                        sdist,
                        self.RESOURCES,
                        sources,
                        self.LICENSE,
                        archive_root,
                        self._metadata(),
                    )

    def test_exact_deterministic_sdist_is_accepted(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            sdist, sources = self._sdist(Path(temporary))
            smoke.inspect_sdist(
                sdist,
                self.RESOURCES,
                sources,
                self.LICENSE,
                f"cortexel-{self.VERSION}",
                self._metadata(),
            )

    def test_uv_environment_is_offline_and_bound_to_reviewed_python(self) -> None:
        python = "/reviewed/python/bin/python"
        uv = "/reviewed/uv/bin/uv"
        with tempfile.TemporaryDirectory() as temporary, patch.dict(
            os.environ,
            {"PATH": "/ambient/authority"},
            clear=True,
        ):
            environment = smoke.isolated_environment(Path(temporary), python, uv)
            self.assertEqual(environment["UV_PYTHON"], python)
            self.assertEqual(environment["UV_PYTHON_DOWNLOADS"], "never")
            self.assertEqual(environment["UV_NO_CONFIG"], "1")
            self.assertEqual(environment["UV_NO_ENV_FILE"], "1")
            self.assertEqual(environment["UV_OFFLINE"], "1")
            self.assertEqual(environment["PIP_NO_INDEX"], "1")
            self.assertEqual(environment["PATH"], str(Path(temporary) / "empty-path"))
            self.assertNotIn("/ambient/authority", environment["PATH"])
            self.assertEqual(environment["PYTHONDONTWRITEBYTECODE"], "1")

        with tempfile.TemporaryDirectory() as temporary:
            first_root = Path(temporary) / "first-build"
            second_root = Path(temporary) / "second-build"
            first_root.mkdir()
            second_root.mkdir()
            first = smoke.isolated_environment(first_root, python, uv)
            second = smoke.isolated_environment(second_root, python, uv)
            for key in ("HOME", "TMPDIR", "UV_CACHE_DIR", "PATH"):
                self.assertNotEqual(first[key], second[key])

        for name, value in (
            ("UV_PYTHON_DOWNLOADS", "automatic"),
            ("UV_NO_CONFIG", "0"),
            ("UV_NO_ENV_FILE", "false"),
            ("UV_OFFLINE", "0"),
        ):
            with (
                self.subTest(name=name),
                tempfile.TemporaryDirectory() as temporary,
                patch.dict(os.environ, {name: value}, clear=True),
                self.assertRaisesRegex(RuntimeError, name),
            ):
                smoke.isolated_environment(Path(temporary), python, uv)

    def test_reviewed_python_rejects_a_different_uv_interpreter(self) -> None:
        with (
            patch.object(smoke.sys, "version_info", (3, 13, 9, "final", 0)),
            self.assertRaisesRegex(RuntimeError, "requires a dedicated Python 3.14"),
        ):
            smoke.reviewed_python()
        with (
            patch.object(smoke.sys, "version_info", (3, 14, 0, "final", 0)),
            patch.object(
                smoke.sys,
                "flags",
                SimpleNamespace(isolated=1, no_site=1, dont_write_bytecode=0),
            ),
            self.assertRaisesRegex(RuntimeError, "no-site/no-bytecode mode"),
        ):
            smoke.reviewed_python()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            runtime = root / "runtime"
            base = root / "base"
            executable = runtime / "bin" / "python"
            other = runtime / "bin" / "other"
            executable.parent.mkdir(parents=True)
            (base / "bin").mkdir(parents=True)
            platform_library = smoke.sys.platlibdir
            stdlib = base / platform_library / "python3.14"
            (stdlib / "lib-dynload").mkdir(parents=True)
            reviewed_sys_path = [
                str(base / platform_library / "python314.zip"),
                str(stdlib),
                str(stdlib / "lib-dynload"),
            ]
            executable.write_bytes(b"python")
            other.write_bytes(b"other")
            executable.chmod(0o755)
            other.chmod(0o755)
            base_executable = base / "bin" / "python3.14"
            base_executable.write_bytes(b"base python")
            base_executable.chmod(0o755)
            base_alias = base / "bin" / "python"
            base_alias.symlink_to(base_executable.name)
            (runtime / "pyvenv.cfg").write_text(
                f"home = {base / 'bin'}\n"
                "include-system-site-packages = false\n"
                "version = 3.14.0\n"
                f"executable = {base_executable}\n"
                f"command = {base_executable} -m venv --copies --without-pip {runtime}\n",
                encoding="utf-8",
            )
            reviewed_version = (3, 14, 0, "final", 0)
            with (
                patch.object(smoke.sys, "executable", str(executable)),
                patch.object(smoke.sys, "prefix", str(runtime)),
                patch.object(smoke.sys, "exec_prefix", str(runtime)),
                patch.object(smoke.sys, "base_prefix", str(base)),
                patch.object(smoke.sys, "base_exec_prefix", str(base)),
                patch.object(smoke.sys, "_base_executable", str(base_alias)),
                patch.object(smoke.sys, "version_info", reviewed_version),
                patch.object(
                    smoke.sys,
                    "flags",
                    SimpleNamespace(isolated=1, no_site=1, dont_write_bytecode=1),
                ),
                patch.object(
                    smoke.sys,
                    "path",
                    reviewed_sys_path,
                ),
                patch.dict(os.environ, {}, clear=True),
            ):
                self.assertEqual(smoke.reviewed_python(), str(executable.resolve()))
            original_configuration = (runtime / "pyvenv.cfg").read_text(encoding="utf-8")
            (runtime / "pyvenv.cfg").write_text(
                original_configuration + "  INCLUDE-SYSTEM-SITE-PACKAGES = true\n",
                encoding="utf-8",
            )
            with (
                patch.object(smoke.sys, "executable", str(executable)),
                patch.object(smoke.sys, "prefix", str(runtime)),
                patch.object(smoke.sys, "exec_prefix", str(runtime)),
                patch.object(smoke.sys, "base_prefix", str(base)),
                patch.object(smoke.sys, "base_exec_prefix", str(base)),
                patch.object(smoke.sys, "_base_executable", str(base_alias)),
                patch.object(smoke.sys, "version_info", reviewed_version),
                patch.object(
                    smoke.sys,
                    "flags",
                    SimpleNamespace(isolated=1, no_site=1, dont_write_bytecode=1),
                ),
                patch.object(smoke.sys, "path", reviewed_sys_path),
                patch.dict(os.environ, {}, clear=True),
                self.assertRaisesRegex(RuntimeError, "duplicate policy"),
            ):
                smoke.reviewed_python()

            (runtime / "pyvenv.cfg").write_text(
                original_configuration,
                encoding="utf-8",
            )
            with (
                patch.object(smoke.sys, "executable", str(executable)),
                patch.object(smoke.sys, "prefix", str(runtime)),
                patch.object(smoke.sys, "exec_prefix", str(runtime)),
                patch.object(smoke.sys, "base_prefix", str(base)),
                patch.object(smoke.sys, "base_exec_prefix", str(base)),
                patch.object(smoke.sys, "_base_executable", str(base_alias)),
                patch.object(smoke.sys, "version_info", reviewed_version),
                patch.object(
                    smoke.sys,
                    "flags",
                    SimpleNamespace(isolated=1, no_site=1, dont_write_bytecode=1),
                ),
                patch.object(
                    smoke.sys,
                    "path",
                    [*reviewed_sys_path, str(root / "attacker")],
                ),
                patch.dict(os.environ, {}, clear=True),
                self.assertRaisesRegex(RuntimeError, "exact Python 3.14 base stdlib"),
            ):
                smoke.reviewed_python()
            with (
                patch.object(smoke.sys, "executable", str(executable)),
                patch.object(smoke.sys, "prefix", str(runtime)),
                patch.object(smoke.sys, "exec_prefix", str(runtime)),
                patch.object(smoke.sys, "base_prefix", str(base)),
                patch.object(smoke.sys, "base_exec_prefix", str(base)),
                patch.object(smoke.sys, "_base_executable", str(base_alias)),
                patch.object(smoke.sys, "version_info", reviewed_version),
                patch.object(
                    smoke.sys,
                    "flags",
                    SimpleNamespace(isolated=1, no_site=1, dont_write_bytecode=1),
                ),
                patch.object(
                    smoke.sys,
                    "path",
                    reviewed_sys_path,
                ),
                patch.dict(os.environ, {"UV_PYTHON": str(other.resolve())}, clear=True),
                self.assertRaisesRegex(RuntimeError, "differs from"),
            ):
                smoke.reviewed_python()
            with (
                patch.object(smoke.sys, "executable", str(executable)),
                patch.object(smoke.sys, "prefix", str(runtime)),
                patch.object(smoke.sys, "exec_prefix", str(runtime)),
                patch.object(smoke.sys, "base_prefix", str(base)),
                patch.object(smoke.sys, "base_exec_prefix", str(base)),
                patch.object(smoke.sys, "_base_executable", str(base_alias)),
                patch.object(smoke.sys, "version_info", reviewed_version),
                patch.object(
                    smoke.sys,
                    "path",
                    reviewed_sys_path,
                ),
                patch.dict(os.environ, {}, clear=True),
                patch.object(
                    smoke.sys,
                    "flags",
                    SimpleNamespace(isolated=0, no_site=1, dont_write_bytecode=1),
                ),
                self.assertRaisesRegex(RuntimeError, "no-site/no-bytecode mode"),
            ):
                smoke.reviewed_python()

    def test_no_site_path_supports_lib64_but_rejects_symlink_escape(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary).resolve() / "base"
            stdlib = base / "lib64" / "python3.14"
            dynamic = stdlib / "lib-dynload"
            dynamic.mkdir(parents=True)
            self.assertEqual(
                smoke.expected_python_no_site_path(base, "lib64"),
                [base / "lib64" / "python314.zip", stdlib, dynamic],
            )
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            base = root / "base"
            outside = root / "outside" / "python3.14"
            outside.mkdir(parents=True)
            (base / "lib64").parent.mkdir(parents=True)
            (base / "lib64").symlink_to(outside.parent, target_is_directory=True)
            with self.assertRaisesRegex(RuntimeError, "stdlib escapes"):
                smoke.expected_python_no_site_path(base, "lib64")

    def test_reviewed_uv_is_canonical_protected_and_exact(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            uv = (Path(temporary) / "uv").resolve()
            uv.write_bytes(b"reviewed uv")
            uv.chmod(0o755)
            completed = SimpleNamespace(
                stdout=f"uv {smoke.EXPECTED_UV_VERSION} (reviewed)\n",
                stderr="",
            )
            with (
                patch.dict(os.environ, {"CORTEXEL_UV": str(uv)}, clear=True),
                patch.object(smoke, "run_checked", return_value=completed),
            ):
                self.assertEqual(smoke.reviewed_uv("/reviewed/python"), str(uv))
            completed.stdout = "uv 0.0.0\n"
            with (
                patch.dict(os.environ, {"CORTEXEL_UV": str(uv)}, clear=True),
                patch.object(smoke, "run_checked", return_value=completed),
                self.assertRaisesRegex(RuntimeError, "must be exactly"),
            ):
                smoke.reviewed_uv("/reviewed/python")
            with (
                patch.dict(
                    os.environ,
                    {"PATH": str(uv.parent)},
                    clear=True,
                ),
                self.assertRaisesRegex(RuntimeError, "must affirmatively name"),
            ):
                smoke.reviewed_uv("/reviewed/python")

    def test_build_backend_and_preinstalled_version_are_exact(self) -> None:
        project = {
            "build-system": {
                "build-backend": "hatchling.build",
                "requires": [f"hatchling=={self.HATCHLING_VERSION}"],
            }
        }
        self.assertEqual(
            smoke.exact_hatchling_version(project),
            self.HATCHLING_VERSION,
        )
        for requirements in (
            ["hatchling>=1.31.0"],
            ["hatchling==1.31.0", "packaging==26.0"],
            [],
        ):
            with self.subTest(requirements=requirements), self.assertRaises(RuntimeError):
                smoke.exact_hatchling_version(
                    {
                        "build-system": {
                            "build-backend": "hatchling.build",
                            "requires": requirements,
                        }
                    }
                )

        with tempfile.TemporaryDirectory() as temporary:
            runtime = Path(temporary).resolve()
            site_packages = runtime / "lib" / "site-packages"
            site_packages.mkdir(parents=True)
            runtime_python = str(runtime / "bin" / "python")
            Path(runtime_python).parent.mkdir(parents=True)
            Path(runtime_python).write_bytes(b"reviewed Python fixture")
            Path(runtime_python).chmod(0o755)
            projections: dict[str, dict[str, bytes]] = {}
            dist_infos: dict[str, str] = {}
            distributions: list[SimpleNamespace] = []
            for name, version in smoke.EXACT_BUILD_BACKEND_DISTRIBUTIONS.items():
                package_name = name.replace("-", "_")
                dist_info = f"{package_name}-{version}.dist-info"
                dist_infos[name] = dist_info
                package_relative = (
                    "hatchling/build.py"
                    if name == "hatchling"
                    else f"{package_name}/__init__.py"
                )
                projections[name] = {
                    package_relative: name.encode(),
                    f"{dist_info}/METADATA": (
                        f"Metadata-Version: 2.4\nName: {name}\nVersion: {version}\n\n"
                    ).encode(),
                }
                distributions.append(SimpleNamespace(
                    version=version,
                    metadata={"Name": name},
                ))

            uv_cache = (
                b'{"timestamp":{"secs_since_epoch":1,"nanos_since_epoch":2},'
                b'"commit":null,"tags":null,"env":{},"directories":{}}'
            )

            def canonical_record(files: dict[str, bytes], record_path: str) -> bytes:
                rows = []
                for relative, payload in sorted(files.items()):
                    if relative == record_path:
                        continue
                    digest = base64.urlsafe_b64encode(
                        hashlib.sha256(payload).digest()
                    ).rstrip(b"=").decode()
                    rows.append(f"{relative},sha256={digest},{len(payload)}\n")
                rows.append(f"{record_path},,\n")
                return "".join(rows).encode()

            def write_distribution(name: str, *, source: dict[str, bytes]) -> None:
                dist_info = dist_infos[name]
                record_path = f"{dist_info}/RECORD"
                installed = {
                    **source,
                    f"{dist_info}/INSTALLER": b"uv",
                    f"{dist_info}/REQUESTED": b"",
                    f"{dist_info}/uv_cache.json": uv_cache,
                    record_path: b"",
                }
                entry_point = smoke.EXACT_BUILD_BACKEND_ENTRY_POINTS.get(name)
                external_path = None
                if entry_point is not None:
                    script_name, module, function = entry_point
                    external_path = f"../../../bin/{script_name}"
                    installed[external_path] = smoke.expected_uv_entry_point_script(
                        runtime_python,
                        module,
                        function,
                    )
                installed[record_path] = canonical_record(installed, record_path)
                for relative, payload in installed.items():
                    if relative == external_path:
                        target = runtime / "bin" / entry_point[0]
                        target.write_bytes(payload)
                        target.chmod(0o755)
                        continue
                    target = site_packages / relative
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(payload)
                    target.chmod(0o644)

            for name, projection in projections.items():
                write_distribution(name, source=projection)

            def inspect() -> None:
                with (
                    patch.object(smoke.sys, "prefix", str(runtime)),
                    patch.object(
                        smoke.importlib.metadata,
                        "distributions",
                        return_value=distributions,
                    ),
                    patch.object(
                        smoke.sysconfig,
                        "get_path",
                        return_value=str(site_packages),
                    ),
                ):
                    smoke.require_preinstalled_hatchling(
                        self.HATCHLING_VERSION,
                        projections,
                        dist_infos,
                        runtime_python,
                    )

            inspect()

            mutated_projection = dict(projections["hatchling"])
            mutated_projection["hatchling/build.py"] = b"attacker-controlled backend\n"
            write_distribution("hatchling", source=mutated_projection)
            with (
                self.assertRaisesRegex(RuntimeError, "retained wheel authority"),
            ):
                inspect()

            write_distribution("hatchling", source=projections["hatchling"])
            hatchling_script = runtime / "bin" / "hatchling"
            hatchling_script.write_bytes(b"#!/bin/sh\nattacker\n")
            hatchling_script.chmod(0o755)
            hatchling_record = site_packages / dist_infos["hatchling"] / "RECORD"
            hatchling_subset = {
                relative: path.read_bytes()
                for relative in projections["hatchling"]
                if (path := site_packages / relative).is_file()
            }
            for suffix in ("INSTALLER", "REQUESTED", "uv_cache.json"):
                relative = f"{dist_infos['hatchling']}/{suffix}"
                hatchling_subset[relative] = (site_packages / relative).read_bytes()
            hatchling_subset["../../../bin/hatchling"] = hatchling_script.read_bytes()
            hatchling_subset[f"{dist_infos['hatchling']}/RECORD"] = b""
            hatchling_record.write_bytes(
                canonical_record(
                    hatchling_subset,
                    f"{dist_infos['hatchling']}/RECORD",
                )
            )
            with self.assertRaisesRegex(RuntimeError, "console script bytes"):
                inspect()

            write_distribution("hatchling", source=projections["hatchling"])
            attacker_namespace = site_packages / "attacker_namespace"
            attacker_namespace.mkdir()
            with self.assertRaisesRegex(RuntimeError, "directory inventory"):
                inspect()

    def test_uv_entry_point_script_matches_exact_posix_forms(self) -> None:
        body = (
            "# -*- coding: utf-8 -*-\n"
            "import sys\n"
            "from hatchling.cli import hatchling\n"
            'if __name__ == "__main__":\n'
            '    if sys.argv[0].endswith("-script.pyw"):\n'
            "        sys.argv[0] = sys.argv[0][:-11]\n"
            '    elif sys.argv[0].endswith(".exe"):\n'
            "        sys.argv[0] = sys.argv[0][:-4]\n"
            "    sys.exit(hatchling())\n"
        ).encode()
        direct = "/opt/reviewed/bin/python"
        self.assertEqual(
            smoke.expected_uv_entry_point_script(
                direct,
                "hatchling.cli",
                "hatchling",
            ),
            f"#!{direct}\n".encode() + body,
        )
        for reviewed_python in (
            "/" + "a" * smoke.UV_POSIX_SHEBANG_LIMIT_BYTES,
            "/opt/reviewed runtime/bin/python",
            "/opt/reviewed quote's/bin/python",
        ):
            with self.subTest(reviewed_python=reviewed_python):
                escaped = reviewed_python.replace("'", "'\"'\"'")
                expected = (
                    "#!/bin/sh\n"
                    f"'''exec' '{escaped}' \"$0\" \"$@\"\n"
                    "' '''\n"
                ).encode() + body
                self.assertEqual(
                    smoke.expected_uv_entry_point_script(
                        reviewed_python,
                        "hatchling.cli",
                        "hatchling",
                    ),
                    expected,
                )
        for control in ("\0", "\n", "\r"):
            with self.subTest(control=repr(control)), self.assertRaisesRegex(
                RuntimeError,
                "control character",
            ):
                smoke.expected_uv_entry_point_script(
                    f"/opt/reviewed{control}/bin/python",
                    "hatchling.cli",
                    "hatchling",
                )

    def test_build_backend_lock_is_exact_and_wheel_only(self) -> None:
        smoke.verify_build_backend_requirements()
        with tempfile.TemporaryDirectory() as temporary:
            changed = Path(temporary) / "requirements.txt"
            changed.write_bytes(smoke.BUILD_BACKEND_REQUIREMENTS.read_bytes() + b"\n")
            with self.assertRaisesRegex(RuntimeError, "requirements lock has drifted"):
                smoke.verify_build_backend_requirements(changed)

    def test_python_project_rejects_build_hook_authority(self) -> None:
        project = smoke.tomllib.loads(
            (ROOT / "python" / "pyproject.toml").read_text(encoding="utf-8")
        )
        smoke.validate_python_project_configuration(project)
        project["tool"]["hatch"]["build"]["hooks"] = {
            "custom": {"path": "attacker.py"}
        }
        with self.assertRaisesRegex(RuntimeError, "tool authority"):
            smoke.validate_python_project_configuration(project)

    def test_detached_source_modes_do_not_depend_on_ambient_umask(self) -> None:
        sources = {
            "README.md": b"readme\n",
            "src/cortexel/__init__.py": b"__all__ = []\n",
        }
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "detached"
            previous_umask = os.umask(0o077)
            try:
                smoke.materialize_detached_project(destination, sources)
            finally:
                os.umask(previous_umask)
            smoke.verify_detached_project(destination, sources)
            files, directories = smoke.bounded_tree_entries(
                destination,
                label="restrictive-umask detached source",
            )
            self.assertEqual(
                {stat.S_IMODE(path.stat().st_mode) for path in files},
                {0o644},
            )
            self.assertEqual(
                {stat.S_IMODE(path.stat().st_mode) for path in directories},
                {0o755},
            )

    def test_package_build_umask_is_exact_and_restrictive_umask_fails_early(self) -> None:
        previous_umask = os.umask(0o077)
        try:
            with self.assertRaisesRegex(RuntimeError, "ambient umask must be exactly 022"):
                smoke.require_exact_process_umask()
            self.assertEqual(os.umask(0o077), 0o077)
            os.umask(0o022)
            smoke.require_exact_process_umask()
            self.assertEqual(os.umask(0o022), 0o022)
        finally:
            os.umask(previous_umask)

    def test_expected_core_metadata_is_derived_from_closed_sources(self) -> None:
        project = {
            "project": {
                "name": "cortexel",
                "version": self.VERSION,
                "description": "summary",
                "readme": "README.md",
                "requires-python": ">=3.11",
                "license": "MIT",
                "license-files": ["LICENSE"],
                "authors": [{"name": "Example Author"}],
                "keywords": ["zeta", "alpha"],
                "classifiers": ["Topic :: Z", "Topic :: A"],
                "dependencies": [],
                "urls": {"Homepage": "https://example.invalid"},
            }
        }
        expected = (
            "Metadata-Version: 2.4\n"
            "Name: cortexel\n"
            f"Version: {self.VERSION}\n"
            "Summary: summary\n"
            "Project-URL: Homepage, https://example.invalid\n"
            "Author: Example Author\n"
            "License-Expression: MIT\n"
            "License-File: LICENSE\n"
            "Keywords: alpha,zeta\n"
            "Classifier: Topic :: A\n"
            "Classifier: Topic :: Z\n"
            "Requires-Python: >=3.11\n"
            "Description-Content-Type: text/markdown\n"
            "\n"
            "# readme\n"
        ).encode()
        self.assertEqual(
            smoke.expected_core_metadata(project, b"# readme\n"),
            expected,
        )

    def test_ci_python_backend_bootstrap_has_closed_network_authority(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text(
            encoding="utf-8"
        )
        for required in (
            "env -i",
            "/usr/bin/timeout --signal=TERM --kill-after=10s 300s",
            "bootstrap-backend-wheelhouse",
            "UV_OFFLINE=1",
            "--no-index",
            "--find-links \"$wheelhouse\"",
            "--require-hashes",
            "--no-deps",
        ):
            self.assertIn(required, workflow)
        self.assertGreaterEqual(workflow.count("umask 022"), 2)
        contributing = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
        self.assertIn("Run the complete block in that one subshell", contributing)
        self.assertIn("umask 022", contributing)
        smoke_source = (ROOT / "scripts" / "smoke-python-package.py").read_text(
            encoding="utf-8"
        )
        self.assertIn('[python, "-I", "-S", "-B", "-c", probe]', smoke_source)
        self.assertNotIn(
            '[str(interpreter), "-I", "-S", "-B", "-c", probe]',
            smoke_source,
        )


if __name__ == "__main__":
    unittest.main()
