from __future__ import annotations

import base64
import copy
import errno
import gzip
import hashlib
import io
import importlib.util
import json
import os
import shutil
import signal
import stat
import subprocess
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
from typing import Any
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

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            old = root / "old-source"
            source.write_bytes(b"original")
            real_fstat = os.fstat
            calls = 0

            def replace_after_final_descriptor_observation(
                file_descriptor: int,
            ) -> os.stat_result:
                nonlocal calls
                status = real_fstat(file_descriptor)
                calls += 1
                if calls == 2:
                    source.rename(old)
                    source.write_bytes(b"replaced")
                return status

            with (
                patch.object(
                    smoke.os,
                    "fstat",
                    side_effect=replace_after_final_descriptor_observation,
                ),
                self.assertRaisesRegex(RuntimeError, "changed identity during or after"),
            ):
                smoke.bounded_regular_file_bytes(
                    source,
                    maximum=64,
                    label="pathname-rebind fixture",
                )
            self.assertEqual(source.read_bytes(), b"replaced")

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

        real_popen = smoke.subprocess.Popen
        with (
            patch.object(smoke.subprocess, "Popen", wraps=real_popen) as launch,
            patch.object(
                real_popen,
                "poll",
                side_effect=AssertionError("run_checked must not poll"),
            ),
        ):
            completed = smoke.run_checked(
                [sys.executable, "-I", "-B", "-c", "raise SystemExit(0)"],
                cwd=ROOT,
                environment={},
                timeout=1,
                label="closed-stdin fixture",
            )
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(launch.call_args.kwargs["stdin"], smoke.subprocess.DEVNULL)
        self.assertTrue(launch.call_args.kwargs["start_new_session"])
        self.assertTrue(launch.call_args.kwargs["close_fds"])

        with self.assertRaisesRegex(RuntimeError, "timeout"):
            smoke.run_checked(
                [sys.executable, "-c", "import time; time.sleep(60)"],
                cwd=ROOT,
                environment={},
                timeout=1,
                label="bounded subprocess fixture",
            )

        with tempfile.TemporaryDirectory() as temporary:
            overflow_child_pid = Path(temporary) / "overflow-child.pid"
            overflow_program = (
                "import os, pathlib, subprocess, sys; "
                "child=subprocess.Popen([sys.executable,'-I','-B','-c',"
                "'import time; time.sleep(60)']); "
                f"pathlib.Path({str(overflow_child_pid)!r}).write_text(str(child.pid)); "
                f"os.write(1, b'x' * {smoke.MAX_SUBPROCESS_OUTPUT_BYTES + 1})"
            )
            with (
                patch.object(smoke.os, "killpg", wraps=os.killpg) as kill_group,
                self.assertRaisesRegex(
                    RuntimeError,
                    "captured-output budget",
                ),
            ):
                smoke.run_checked(
                    [sys.executable, "-I", "-B", "-c", overflow_program],
                    cwd=ROOT,
                    environment={},
                    timeout=10,
                    label="oversized subprocess fixture",
                    capture_output=True,
                )
            self.assertEqual(
                sum(
                    call.args[1] == smoke.signal.SIGTERM
                    for call in kill_group.call_args_list
                ),
                0,
            )
            self.assertEqual(
                sum(
                    call.args[1] == smoke.signal.SIGKILL
                    for call in kill_group.call_args_list
                ),
                1,
            )
            overflow_pid = int(overflow_child_pid.read_text())
            for _attempt in range(100):
                try:
                    os.kill(overflow_pid, 0)
                except ProcessLookupError:
                    break
                time.sleep(0.05)
            else:
                self.fail("output-overflow descendant survived group cleanup")

        with tempfile.TemporaryDirectory() as temporary:
            child_pid = Path(temporary) / "child.pid"
            program = (
                "import pathlib, subprocess, sys, time; "
                "child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)']); "
                f"pathlib.Path({str(child_pid)!r}).write_text(str(child.pid)); "
                "time.sleep(60)"
            )
            with self.assertRaisesRegex(RuntimeError, "timeout"):
                smoke.run_checked(
                    [sys.executable, "-c", program],
                    cwd=ROOT,
                    environment={},
                    timeout=3,
                    label="process-group fixture",
                )
            pid = int(child_pid.read_text())
            for _attempt in range(100):
                try:
                    os.kill(pid, 0)
                except ProcessLookupError:
                    break
                time.sleep(0.05)
            else:
                self.fail("timed-out subprocess descendant survived its process group")

    def test_process_cleanup_signals_only_while_leader_is_unreaped(self) -> None:
        for return_code in (0, 17):
            with self.subTest(return_code=return_code):
                events: list[str] = []
                state = {"reaped": False}
                process_id = 123456789

                class FakeProcess:
                    pid = process_id
                    returncode: int | None = None

                    def wait(self, *, timeout: float) -> int:
                        self.assert_unreaped("wait")
                        self.returncode = return_code
                        state["reaped"] = True
                        return return_code

                    @staticmethod
                    def assert_unreaped(operation: str) -> None:
                        if state["reaped"]:
                            raise AssertionError(f"{operation} occurred after reap")
                        events.append(operation)

                    def poll(self) -> int | None:
                        raise AssertionError("cleanup must not poll")

                    def kill(self) -> None:
                        raise AssertionError("cleanup must not call Popen.kill")

                    def terminate(self) -> None:
                        raise AssertionError("cleanup must not call Popen.terminate")

                process = FakeProcess()
                observer = smoke._UnreapedProcessExitObserver("ordered fixture")
                observer.bind(process_id)

                def observe_child(*args: Any) -> SimpleNamespace:
                    process.assert_unreaped("waitid")
                    self.assertEqual(
                        args,
                        (
                            os.P_PID,
                            process_id,
                            os.WEXITED | os.WNOHANG | os.WNOWAIT,
                        ),
                    )
                    return SimpleNamespace(
                        si_pid=process_id,
                        si_code=os.CLD_EXITED,
                    )

                def signal_group(group_id: int, signal_number: int) -> None:
                    process.assert_unreaped("killpg")
                    self.assertEqual(group_id, process_id)
                    self.assertEqual(signal_number, signal.SIGKILL)

                def direct_signal(*_args: Any) -> None:
                    raise AssertionError("direct signal was not required")

                def drain() -> None:
                    process.assert_unreaped("drain")

                with (
                    patch.object(
                        smoke,
                        "_assert_exclusive_child_reaper_authority",
                    ),
                    patch.object(smoke.os, "waitid", side_effect=observe_child),
                    patch.object(smoke.os, "killpg", side_effect=signal_group),
                    patch.object(smoke.os, "kill", side_effect=direct_signal),
                ):
                    self.assertEqual(
                        smoke._cleanup_private_process_group(
                            process,  # type: ignore[arg-type]
                            observer,
                            label="ordered fixture",
                            before_reap=drain,
                        ),
                        return_code,
                    )
                    first_cleanup_events = list(events)
                    self.assertEqual(
                        smoke._cleanup_private_process_group(
                            process,  # type: ignore[arg-type]
                            observer,
                            label="ordered fixture",
                            before_reap=drain,
                        ),
                        return_code,
                    )

                self.assertEqual(
                    first_cleanup_events,
                    [
                        "waitid",
                        "waitid",
                        "killpg",
                        "waitid",
                        "drain",
                        "waitid",
                        "wait",
                    ],
                )
                self.assertEqual(events, first_cleanup_events)
                self.assertTrue(observer.reaped)

    @unittest.skipUnless(
        os.name == "posix"
        and all(
            hasattr(os, name)
            for name in (
                "waitid",
                "P_PID",
                "WEXITED",
                "WNOHANG",
                "WNOWAIT",
            )
        ),
        "POSIX WNOWAIT child ownership is required",
    )
    def test_process_cleanup_rejects_externally_reaped_leader(self) -> None:
        for observe_before_reap in (False, True):
            with self.subTest(observe_before_reap=observe_before_reap):
                process = subprocess.Popen(
                    [sys.executable, "-I", "-B", "-c", "raise SystemExit(19)"],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    close_fds=True,
                    start_new_session=True,
                )
                observer = smoke._UnreapedProcessExitObserver("external-reaper fixture")
                observer.bind(process.pid)
                if observe_before_reap:
                    deadline = time.monotonic() + 5
                    while not observer.exited():
                        self.assertLess(time.monotonic(), deadline)
                        time.sleep(0.01)
                reaped_pid, status = os.waitpid(process.pid, 0)
                self.assertEqual(reaped_pid, process.pid)
                try:
                    with (
                        patch.object(smoke.os, "killpg") as group_signal,
                        patch.object(smoke.os, "kill") as direct_signal,
                        patch.object(process, "wait", wraps=process.wait) as final_wait,
                        self.assertRaisesRegex(
                            smoke._ChildProcessAnchorLost,
                            "reaped outside",
                        ),
                    ):
                        smoke._cleanup_private_process_group(
                            process,
                            observer,
                            label="external-reaper fixture",
                        )
                    group_signal.assert_not_called()
                    direct_signal.assert_not_called()
                    final_wait.assert_not_called()
                finally:
                    process.returncode = os.waitstatus_to_exitcode(status)

    def test_process_cleanup_rechecks_ownership_after_group_signal_failure(
        self,
    ) -> None:
        process = subprocess.Popen(
            [sys.executable, "-I", "-B", "-c", "raise SystemExit(23)"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True,
            start_new_session=True,
        )
        observer = smoke._UnreapedProcessExitObserver("group-race fixture")
        observer.bind(process.pid)
        deadline = time.monotonic() + 5
        while not observer.exited():
            self.assertLess(time.monotonic(), deadline)
            time.sleep(0.01)
        reaped_status: int | None = None

        def reap_during_group_signal(_process_group_id: int) -> str:
            nonlocal reaped_status
            reaped_pid, reaped_status = os.waitpid(process.pid, 0)
            self.assertEqual(reaped_pid, process.pid)
            raise SystemExit(71)

        try:
            with (
                patch.object(
                    smoke,
                    "_signal_private_process_group",
                    side_effect=reap_during_group_signal,
                ),
                patch.object(
                    smoke.os,
                    "killpg",
                    side_effect=AssertionError("raw killpg followed external reap"),
                ) as raw_group_signal,
                patch.object(smoke.os, "kill") as direct_signal,
                patch.object(process, "wait", wraps=process.wait) as final_wait,
                self.assertRaisesRegex(
                    smoke._ChildProcessAnchorLost,
                    "reaped outside",
                ),
            ):
                smoke._cleanup_private_process_group(
                    process,
                    observer,
                    label="group-race fixture",
                )
            direct_signal.assert_not_called()
            raw_group_signal.assert_not_called()
            final_wait.assert_not_called()
        finally:
            if reaped_status is None:
                process.kill()
                process.wait(timeout=5)
            else:
                process.returncode = os.waitstatus_to_exitcode(reaped_status)

    def test_group_signal_failure_uses_only_anchored_direct_fallback(self) -> None:
        events: list[str] = []
        process_id = 123456789
        observations = iter((False, False, False, True, True))

        class FakeProcess:
            pid = process_id
            returncode: int | None = None

            def wait(self, *, timeout: float) -> int:
                events.append("wait")
                self.returncode = 0
                return 0

        process = FakeProcess()
        observer = smoke._UnreapedProcessExitObserver("direct-fallback fixture")
        observer.bind(process_id)

        def observe_child(*_args: Any) -> SimpleNamespace | None:
            if "wait" in events:
                raise AssertionError("waitid occurred after final reap began")
            exited = next(observations)
            events.append("waitid-exited" if exited else "waitid-running")
            if not exited:
                return None
            return SimpleNamespace(si_pid=process_id, si_code=os.CLD_KILLED)

        def fail_group_signal(_process_group_id: int) -> str:
            events.append("killpg-error")
            raise RuntimeError("synthetic group signal failure")

        def direct_signal(target: int, signal_number: int) -> None:
            if "wait" in events:
                raise AssertionError("direct kill occurred after final reap began")
            self.assertEqual((target, signal_number), (process_id, signal.SIGKILL))
            events.append("direct-kill")

        with (
            patch.object(smoke, "_assert_exclusive_child_reaper_authority"),
            patch.object(smoke.os, "waitid", side_effect=observe_child),
            patch.object(
                smoke,
                "_signal_private_process_group",
                side_effect=fail_group_signal,
            ),
            patch.object(smoke.os, "kill", side_effect=direct_signal),
            self.assertRaisesRegex(RuntimeError, "synthetic group signal failure"),
        ):
            smoke._cleanup_private_process_group(
                process,  # type: ignore[arg-type]
                observer,
                label="direct-fallback fixture",
                before_reap=lambda: events.append("drain"),
            )
        self.assertEqual(
            events,
            [
                "waitid-running",
                "waitid-running",
                "killpg-error",
                "waitid-running",
                "direct-kill",
                "waitid-exited",
                "drain",
                "waitid-exited",
                "wait",
            ],
        )
        self.assertTrue(observer.reaped)

    def test_external_reap_during_pipe_drain_forbids_final_wait(self) -> None:
        process = subprocess.Popen(
            [sys.executable, "-I", "-B", "-c", "raise SystemExit(29)"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True,
            start_new_session=True,
        )
        observer = smoke._UnreapedProcessExitObserver("drain-reaper fixture")
        observer.bind(process.pid)
        deadline = time.monotonic() + 5
        while not observer.exited():
            self.assertLess(time.monotonic(), deadline)
            time.sleep(0.01)
        reaped_status: int | None = None

        def reap_during_drain() -> None:
            nonlocal reaped_status
            reaped_pid, reaped_status = os.waitpid(process.pid, 0)
            self.assertEqual(reaped_pid, process.pid)

        try:
            with (
                patch.object(
                    smoke,
                    "_signal_private_process_group",
                    return_value="absent",
                ) as group_signal,
                patch.object(
                    smoke.os,
                    "killpg",
                    side_effect=AssertionError("raw killpg followed drain-time reap"),
                ) as raw_group_signal,
                patch.object(smoke.os, "kill") as direct_signal,
                patch.object(process, "wait", wraps=process.wait) as final_wait,
                self.assertRaisesRegex(
                    smoke._ChildProcessAnchorLost,
                    "reaped outside",
                ),
            ):
                smoke._cleanup_private_process_group(
                    process,
                    observer,
                    label="drain-reaper fixture",
                    before_reap=reap_during_drain,
                )
            group_signal.assert_called_once_with(process.pid)
            raw_group_signal.assert_not_called()
            direct_signal.assert_not_called()
            final_wait.assert_not_called()
        finally:
            if reaped_status is None:
                process.kill()
                process.wait(timeout=5)
            else:
                process.returncode = os.waitstatus_to_exitcode(reaped_status)

    def test_process_lookup_error_never_claims_an_unreaped_zombie(self) -> None:
        process_id = 123456789

        class FakeProcess:
            pid = process_id

            @staticmethod
            def wait(*, timeout: float) -> int:
                raise AssertionError("unsafe final wait after lost ownership proof")

        observer = smoke._UnreapedProcessExitObserver("lookup-error fixture")
        observer.bind(process_id)
        with (
            patch.object(smoke, "_assert_exclusive_child_reaper_authority"),
            patch.object(
                smoke.os,
                "waitid",
                side_effect=ProcessLookupError(errno.ESRCH, "missing"),
            ),
            patch.object(smoke.os, "killpg") as group_signal,
            patch.object(smoke.os, "kill") as direct_signal,
            self.assertRaisesRegex(RuntimeError, "could not be independently proved"),
        ):
            smoke._cleanup_private_process_group(
                FakeProcess(),  # type: ignore[arg-type]
                observer,
                label="lookup-error fixture",
            )
        group_signal.assert_not_called()
        direct_signal.assert_not_called()

    def test_process_cleanup_retries_only_reap_after_wait_interruption(self) -> None:
        events: list[str] = []
        process_id = 123456789

        class FakeProcess:
            pid = process_id
            returncode: int | None = None
            wait_calls = 0

            def wait(self, *, timeout: float) -> int:
                events.append("wait")
                self.wait_calls += 1
                if self.wait_calls == 1:
                    raise SystemExit(41)
                self.returncode = 0
                return 0

        process = FakeProcess()
        observer = smoke._UnreapedProcessExitObserver("interrupted-reap fixture")
        observer.bind(process_id)

        def observe_child(*_args: Any) -> SimpleNamespace:
            if "wait" in events:
                raise AssertionError("waitid occurred after final reap began")
            events.append("waitid")
            return SimpleNamespace(si_pid=process_id, si_code=os.CLD_EXITED)

        def signal_group(_group_id: int, signal_number: int) -> None:
            if "wait" in events:
                raise AssertionError("killpg occurred after final reap began")
            self.assertEqual(signal_number, signal.SIGKILL)
            events.append("killpg")

        with (
            patch.object(smoke, "_assert_exclusive_child_reaper_authority"),
            patch.object(smoke.os, "waitid", side_effect=observe_child),
            patch.object(smoke.os, "killpg", side_effect=signal_group),
            patch.object(
                smoke.os,
                "kill",
                side_effect=AssertionError("direct signal was not required"),
            ),
            self.assertRaisesRegex(SystemExit, "41"),
        ):
            smoke._cleanup_private_process_group(
                process,  # type: ignore[arg-type]
                observer,
                label="interrupted-reap fixture",
            )
        self.assertEqual(events.count("killpg"), 1)
        self.assertEqual(events[-2:], ["wait", "wait"])
        self.assertTrue(observer.reaped)
        self.assertEqual(observer.return_code, 0)

    def test_process_cleanup_retries_timeout_and_reaps_real_child(self) -> None:
        process = subprocess.Popen(
            [sys.executable, "-I", "-B", "-c", "import time; time.sleep(60)"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True,
            start_new_session=True,
        )
        observer = smoke._UnreapedProcessExitObserver("reap-timeout fixture")
        observer.bind(process.pid)
        real_wait = process.wait
        real_waitid = smoke.os.waitid
        real_killpg = smoke.os.killpg
        wait_started = False
        wait_calls = 0

        def observed_waitid(*args: Any) -> Any:
            if wait_started:
                raise AssertionError("waitid occurred after final reap began")
            return real_waitid(*args)

        def observed_killpg(process_group_id: int, signal_number: int) -> None:
            if wait_started:
                raise AssertionError("killpg occurred after final reap began")
            real_killpg(process_group_id, signal_number)

        def interrupted_wait(*args: Any, **kwargs: Any) -> int:
            nonlocal wait_calls, wait_started
            wait_started = True
            wait_calls += 1
            if wait_calls == 1:
                raise subprocess.TimeoutExpired(["fixture"], 0.01)
            return real_wait(*args, **kwargs)

        try:
            with (
                patch.object(smoke.os, "waitid", side_effect=observed_waitid),
                patch.object(smoke.os, "killpg", side_effect=observed_killpg),
                patch.object(
                    smoke.os,
                    "kill",
                    side_effect=AssertionError("direct kill was not required"),
                ),
                patch.object(process, "wait", side_effect=interrupted_wait),
                self.assertRaises(subprocess.TimeoutExpired),
            ):
                smoke._cleanup_private_process_group(
                    process,
                    observer,
                    label="reap-timeout fixture",
                )
            self.assertEqual(wait_calls, 2)
            self.assertTrue(observer.reaped)
            self.assertIsNotNone(process.returncode)
        finally:
            if process.returncode is None:
                process.kill()
                process.wait(timeout=5)

    def test_real_process_lifecycle_has_no_post_reap_numeric_operation(self) -> None:
        real_waitid = smoke.os.waitid
        real_killpg = smoke.os.killpg
        real_kill = smoke.os.kill
        real_wait = smoke.subprocess.Popen.wait

        for return_code in (0, 7):
            with self.subTest(return_code=return_code):
                events: list[str] = []
                reaped = False

                def observed_waitid(*args: Any) -> Any:
                    if reaped:
                        raise AssertionError("waitid occurred after reap")
                    events.append("waitid")
                    return real_waitid(*args)

                def observed_killpg(
                    process_group_id: int,
                    signal_number: int,
                ) -> None:
                    if reaped:
                        raise AssertionError("killpg occurred after reap")
                    events.append("killpg")
                    real_killpg(process_group_id, signal_number)

                def observed_kill(process_id: int, signal_number: int) -> None:
                    if reaped:
                        raise AssertionError("direct kill occurred after reap")
                    events.append("direct-kill")
                    real_kill(process_id, signal_number)

                def observed_wait(
                    process: subprocess.Popen[bytes],
                    *args: Any,
                    **kwargs: Any,
                ) -> int:
                    nonlocal reaped
                    events.append("wait-enter")
                    result = real_wait(process, *args, **kwargs)
                    reaped = True
                    events.append("wait-return")
                    return result

                def forbidden_poll(
                    _process: subprocess.Popen[bytes],
                    *_args: Any,
                    **_kwargs: Any,
                ) -> int | None:
                    raise AssertionError("run_checked must not poll")

                with (
                    patch.object(smoke.os, "waitid", side_effect=observed_waitid),
                    patch.object(smoke.os, "killpg", side_effect=observed_killpg),
                    patch.object(smoke.os, "kill", side_effect=observed_kill),
                    patch.object(
                        smoke.subprocess.Popen,
                        "wait",
                        autospec=True,
                        side_effect=observed_wait,
                    ),
                    patch.object(
                        smoke.subprocess.Popen,
                        "poll",
                        autospec=True,
                        side_effect=forbidden_poll,
                    ),
                ):
                    if return_code:
                        with self.assertRaises(subprocess.CalledProcessError) as raised:
                            smoke.run_checked(
                                [
                                    sys.executable,
                                    "-I",
                                    "-B",
                                    "-c",
                                    f"raise SystemExit({return_code})",
                                ],
                                cwd=ROOT,
                                environment={},
                                timeout=5,
                                label="real ordering fixture",
                            )
                        self.assertEqual(raised.exception.returncode, return_code)
                    else:
                        completed = smoke.run_checked(
                            [
                                sys.executable,
                                "-I",
                                "-B",
                                "-c",
                                "raise SystemExit(0)",
                            ],
                            cwd=ROOT,
                            environment={},
                            timeout=5,
                            label="real ordering fixture",
                        )
                        self.assertEqual(completed.returncode, 0)
                self.assertTrue(reaped)
                self.assertEqual(events.count("killpg"), 1)
                self.assertNotIn("direct-kill", events)
                self.assertEqual(events[-2:], ["wait-enter", "wait-return"])

    def test_success_cleanup_removes_same_group_pipe_holder(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            child_pid_path = Path(temporary) / "child.pid"
            program = (
                "import pathlib, subprocess, sys; "
                "child=subprocess.Popen([sys.executable,'-I','-B','-c',"
                "'import time; time.sleep(60)']); "
                f"pathlib.Path({str(child_pid_path)!r}).write_text(str(child.pid)); "
                "print('leader-output', flush=True)"
            )
            completed = smoke.run_checked(
                [sys.executable, "-I", "-B", "-c", program],
                cwd=ROOT,
                environment={},
                timeout=5,
                label="pipe-holder fixture",
                capture_output=True,
            )
            self.assertEqual(completed.stdout, b"leader-output\n")
            child_pid = int(child_pid_path.read_text())
            for _attempt in range(100):
                try:
                    os.kill(child_pid, 0)
                except ProcessLookupError:
                    break
                time.sleep(0.05)
            else:
                self.fail("successful subprocess descendant survived group cleanup")

    def test_closed_pipes_do_not_hide_running_leader(self) -> None:
        program = "import os, time; os.close(1); os.close(2); time.sleep(60)"
        with self.assertRaisesRegex(RuntimeError, "timeout"):
            smoke.run_checked(
                [sys.executable, "-I", "-B", "-c", program],
                cwd=ROOT,
                environment={},
                timeout=1,
                label="closed-pipes fixture",
                capture_output=True,
            )

    def test_post_spawn_bind_interruption_still_cleans_and_reaps(self) -> None:
        real_bind = smoke._UnreapedProcessExitObserver.bind
        real_wait = smoke.subprocess.Popen.wait

        for interrupt_after_bind in (False, True):
            with self.subTest(interrupt_after_bind=interrupt_after_bind):
                bind_calls = 0
                wait_calls = 0

                def interrupted_bind(
                    observer: smoke._UnreapedProcessExitObserver,
                    process_id: int,
                ) -> None:
                    nonlocal bind_calls
                    bind_calls += 1
                    if bind_calls == 1:
                        if interrupt_after_bind:
                            real_bind(observer, process_id)
                        raise SystemExit(64)
                    real_bind(observer, process_id)

                def tracked_wait(
                    process: subprocess.Popen[bytes],
                    *args: Any,
                    **kwargs: Any,
                ) -> int:
                    nonlocal wait_calls
                    wait_calls += 1
                    return real_wait(process, *args, **kwargs)

                with (
                    patch.object(
                        smoke._UnreapedProcessExitObserver,
                        "bind",
                        autospec=True,
                        side_effect=interrupted_bind,
                    ),
                    patch.object(
                        smoke.subprocess.Popen,
                        "wait",
                        autospec=True,
                        side_effect=tracked_wait,
                    ),
                    patch.object(smoke.os, "killpg", wraps=os.killpg) as group_signal,
                    self.assertRaisesRegex(SystemExit, "64"),
                ):
                    smoke.run_checked(
                        [
                            sys.executable,
                            "-I",
                            "-B",
                            "-c",
                            "import time; time.sleep(60)",
                        ],
                        cwd=ROOT,
                        environment={},
                        timeout=5,
                        label="post-spawn interruption fixture",
                    )
                self.assertEqual(bind_calls, 1 if interrupt_after_bind else 2)
                self.assertEqual(wait_calls, 1)
                self.assertEqual(
                    sum(
                        call.args[1] == signal.SIGKILL
                        for call in group_signal.call_args_list
                    ),
                    1,
                )

    def test_selector_setup_interruption_still_cleans_and_reaps(self) -> None:
        real_wait = smoke.subprocess.Popen.wait
        wait_calls = 0

        def tracked_wait(
            process: subprocess.Popen[bytes],
            *args: Any,
            **kwargs: Any,
        ) -> int:
            nonlocal wait_calls
            wait_calls += 1
            return real_wait(process, *args, **kwargs)

        with (
            patch.object(
                smoke.selectors,
                "DefaultSelector",
                side_effect=SystemExit(65),
            ),
            patch.object(
                smoke.subprocess.Popen,
                "wait",
                autospec=True,
                side_effect=tracked_wait,
            ),
            patch.object(smoke.os, "killpg", wraps=os.killpg) as group_signal,
            self.assertRaisesRegex(SystemExit, "65"),
        ):
            smoke.run_checked(
                [sys.executable, "-I", "-B", "-c", "import time; time.sleep(60)"],
                cwd=ROOT,
                environment={},
                timeout=5,
                label="selector-setup interruption fixture",
                capture_output=True,
            )
        self.assertEqual(wait_calls, 1)
        self.assertEqual(
            sum(call.args[1] == signal.SIGKILL for call in group_signal.call_args_list),
            1,
        )

    def test_child_reaper_authority_failure_precedes_launch(self) -> None:
        with (
            patch.object(smoke.signal, "getsignal", return_value=signal.SIG_IGN),
            patch.object(smoke.subprocess, "Popen") as launch,
            self.assertRaisesRegex(RuntimeError, "default SIGCHLD authority"),
        ):
            smoke.run_checked(
                [sys.executable, "-I", "-B", "-c", "raise SystemExit(0)"],
                cwd=ROOT,
                environment={},
                timeout=1,
                label="reaper-authority fixture",
            )
        launch.assert_not_called()

        with (
            patch.object(smoke.threading, "active_count", return_value=2),
            patch.object(smoke.subprocess, "Popen") as launch,
            self.assertRaisesRegex(RuntimeError, "single-threaded"),
        ):
            smoke.run_checked(
                [sys.executable, "-I", "-B", "-c", "raise SystemExit(0)"],
                cwd=ROOT,
                environment={},
                timeout=1,
                label="python-thread-authority fixture",
            )
        launch.assert_not_called()

        with (
            patch.object(smoke.threading, "active_count", return_value=1),
            patch.object(smoke, "_operating_system_thread_count", return_value=2),
            patch.object(smoke.subprocess, "Popen") as launch,
            self.assertRaisesRegex(RuntimeError, "single-threaded"),
        ):
            smoke.run_checked(
                [sys.executable, "-I", "-B", "-c", "raise SystemExit(0)"],
                cwd=ROOT,
                environment={},
                timeout=1,
                label="os-thread-authority fixture",
            )
        launch.assert_not_called()

    @unittest.skipUnless(
        os.name == "posix"
        and all(
            hasattr(signal, name)
            for name in ("pthread_sigmask", "sigpending", "SIGINT", "SIGTERM", "SIGHUP")
        ),
        "POSIX cancellation signals are required",
    )
    def test_cancellation_is_delivered_only_after_group_cleanup(self) -> None:
        class Cancellation(BaseException):
            pass

        for cancellation_signal in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
            with (
                self.subTest(signal=cancellation_signal),
                tempfile.TemporaryDirectory() as temporary,
            ):
                previous_handler = signal.getsignal(cancellation_signal)
                sender: subprocess.Popen[bytes] | None = None
                target_reaped = False
                descendant_pid_path = Path(temporary) / "descendant.pid"
                real_wait = smoke.subprocess.Popen.wait

                def cancel(signal_number: int, _frame: Any) -> None:
                    if not target_reaped:
                        raise AssertionError("cancellation was delivered before reap")
                    raise Cancellation(signal_number)

                def tracked_wait(
                    process: subprocess.Popen[bytes],
                    *args: Any,
                    **kwargs: Any,
                ) -> int:
                    nonlocal target_reaped
                    return_code = real_wait(process, *args, **kwargs)
                    target_reaped = True
                    return return_code

                try:
                    signal.signal(cancellation_signal, cancel)
                    sender = subprocess.Popen(
                        [
                            sys.executable,
                            "-I",
                            "-B",
                            "-c",
                            (
                                "import os, time; time.sleep(0.5); "
                                f"os.kill({os.getpid()}, {cancellation_signal})"
                            ),
                        ],
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        close_fds=True,
                    )
                    with (
                        patch.object(
                            smoke.os,
                            "killpg",
                            wraps=os.killpg,
                        ) as group_signal,
                        patch.object(
                            smoke.subprocess.Popen,
                            "wait",
                            autospec=True,
                            side_effect=tracked_wait,
                        ),
                        self.assertRaises(Cancellation) as raised,
                    ):
                        target_program = (
                            "import pathlib, subprocess, sys, time; "
                            "child=subprocess.Popen([sys.executable,'-I','-B','-c',"
                            "'import time; time.sleep(60)']); "
                            f"pathlib.Path({str(descendant_pid_path)!r}).write_text("
                            "str(child.pid)); time.sleep(60)"
                        )
                        smoke.run_checked(
                            [
                                sys.executable,
                                "-I",
                                "-B",
                                "-c",
                                target_program,
                            ],
                            cwd=ROOT,
                            environment={},
                            timeout=5,
                            label="cancellation fixture",
                        )
                    self.assertEqual(raised.exception.args, (cancellation_signal,))
                    self.assertTrue(target_reaped)
                    self.assertEqual(
                        sum(
                            call.args[1] == signal.SIGKILL
                            for call in group_signal.call_args_list
                        ),
                        1,
                    )
                    descendant_pid = int(descendant_pid_path.read_text())
                    for _attempt in range(100):
                        try:
                            os.kill(descendant_pid, 0)
                        except ProcessLookupError:
                            break
                        time.sleep(0.05)
                    else:
                        self.fail("canceled subprocess descendant survived cleanup")
                finally:
                    signal.signal(cancellation_signal, previous_handler)
                    if sender is not None:
                        sender.wait(timeout=5)

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
            self.assertEqual(environment["UV_LINK_MODE"], "copy")
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
            ("UV_LINK_MODE", "hardlink"),
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

    def test_reviewed_python_enforces_runtime_authority(self) -> None:
        with (
            patch.object(smoke.sys, "version_info", (3, 13, 9, "final", 0)),
            self.assertRaisesRegex(RuntimeError, "requires a dedicated CPython 3.14"),
        ):
            smoke.reviewed_python()
        with (
            patch.object(smoke.sys, "version_info", (3, 14, 0, "final", 0)),
            patch.object(
                smoke.sys,
                "implementation",
                SimpleNamespace(name="pypy"),
            ),
            self.assertRaisesRegex(RuntimeError, "requires a dedicated CPython 3.14"),
        ):
            smoke.reviewed_python()
        with (
            patch.object(smoke.sys, "version_info", (3, 14, 0, "final", 0)),
            patch.object(
                smoke.sys,
                "implementation",
                SimpleNamespace(name="pypy"),
            ),
            self.assertRaisesRegex(RuntimeError, "bootstrap requires CPython 3.14"),
        ):
            smoke.download_build_backend_wheelhouse(Path("/unreached"))
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

            def invoke_with_base(candidate: Path) -> str:
                with (
                    patch.object(smoke.sys, "executable", str(executable)),
                    patch.object(smoke.sys, "prefix", str(runtime)),
                    patch.object(smoke.sys, "exec_prefix", str(runtime)),
                    patch.object(smoke.sys, "base_prefix", str(base)),
                    patch.object(smoke.sys, "base_exec_prefix", str(base)),
                    patch.object(smoke.sys, "_base_executable", str(candidate)),
                    patch.object(smoke.sys, "version_info", reviewed_version),
                    patch.object(
                        smoke.sys,
                        "flags",
                        SimpleNamespace(
                            isolated=1,
                            no_site=1,
                            dont_write_bytecode=1,
                        ),
                    ),
                    patch.object(smoke.sys, "path", reviewed_sys_path),
                    patch.dict(os.environ, {}, clear=True),
                ):
                    return smoke.reviewed_python()

            self.assertEqual(invoke_with_base(base_alias), str(executable.resolve()))

            escaped_base_executable = root / "escaped-python3.14"
            escaped_base_executable.write_bytes(b"escaped base python")
            escaped_base_executable.chmod(0o755)
            with self.assertRaisesRegex(RuntimeError, "escapes its protected base prefix"):
                invoke_with_base(escaped_base_executable)

            directory_base_executable = base / "bin" / "python-directory"
            directory_base_executable.mkdir()
            with self.assertRaisesRegex(RuntimeError, "must be a regular file"):
                invoke_with_base(directory_base_executable)

            nonexecutable_base = base / "bin" / "python-nonexecutable"
            nonexecutable_base.write_bytes(b"nonexecutable base python")
            nonexecutable_base.chmod(0o644)
            with self.assertRaisesRegex(RuntimeError, "is not executable"):
                invoke_with_base(nonexecutable_base)

            mutable_base = base / "bin" / "python-mutable"
            mutable_base.write_bytes(b"mutable base python")
            for mode in (0o775, 0o757):
                with self.subTest(base_executable_mode=oct(mode)):
                    mutable_base.chmod(mode)
                    with self.assertRaisesRegex(RuntimeError, "group/world writable"):
                        invoke_with_base(mutable_base)

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
                    for parent in target.relative_to(site_packages).parents:
                        if parent == Path("."):
                            continue
                        (site_packages / parent).chmod(0o755)
                    target.write_bytes(payload)
                    target.chmod(0o644)

            previous_umask = os.umask(0o077)
            try:
                for name, projection in projections.items():
                    write_distribution(name, source=projection)
            finally:
                os.umask(previous_umask)

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

            hatchling_directory = site_packages / "hatchling"
            hatchling_directory.chmod(0o700)
            with self.assertRaisesRegex(RuntimeError, "directory mode"):
                inspect()
            hatchling_directory.chmod(0o755)

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
        expected = smoke.verify_build_backend_requirements()
        self.assertEqual(expected, smoke.BUILD_BACKEND_REQUIREMENTS.read_bytes())
        with (
            patch.object(
                smoke,
                "verify_build_backend_requirements",
                return_value=expected + b"transient",
            ),
            self.assertRaisesRegex(RuntimeError, "requirements authority changed"),
        ):
            smoke.require_build_backend_requirements_unchanged(expected)
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
            "UV_LINK_MODE=copy",
            "--link-mode copy",
            "--no-index",
            "--find-links \"$wheelhouse\"",
            "--require-hashes",
            "--no-deps",
            "command -v setfacl",
            "command -v getfacl",
            "Seal exact Python and uv runtime authority",
            'expected_python_location="/opt/hostedtoolcache/Python/3.14.6/x64"',
            'expected_uv_executable="/opt/hostedtoolcache/uv/0.11.16/x86_64/uv"',
            'expected_uvx_executable="/opt/hostedtoolcache/uv/0.11.16/x86_64/uvx"',
            "SETUP_UV_PATH: ${{ steps.setup_uv.outputs['uv-path'] }}",
            "SETUP_UVX_PATH: ${{ steps.setup_uv.outputs['uvx-path'] }}",
            "uv_version_pattern='^uv 0[.]11[.]16( [(][ -~]+[)])?$'",
            'uv_path="$CORTEXEL_CI_UV"',
            'sudo chown -R root:root -- "$python_version_root" "$uv_version_root"',
            'sudo setfacl -R -b -k -- "$python_version_root" "$uv_version_root"',
            'sudo chmod -R go-w -- "$python_version_root" "$uv_version_root"',
            'sudo chown root:root -- "${authority_chain[@]}"',
            'sudo setfacl -b -k -- "${authority_chain[@]}"',
            'sudo chmod go-w -- "${authority_chain[@]}"',
            'getfacl -R -c -p -P -- "$python_version_root" "$uv_version_root"',
            "-perm /022",
            'result_parent="$temporary/cortexel-python-package-result"',
            'verify --result-file "$result"',
            "read_python_package_smoke_result",
        ):
            self.assertIn(required, workflow)
        self.assertGreaterEqual(workflow.count("umask 022"), 2)
        self.assertNotIn('shutil.which("uv")', workflow)
        self.assertIn(
            "read_python_package_smoke_result(\n"
            "              pathlib.Path(sys.argv[2])\n",
            workflow,
        )
        self.assertNotIn("pathlib.Path(sys.argv[2]).resolve", workflow)
        contributing = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
        self.assertIn("Run the complete block in that one subshell", contributing)
        self.assertIn("umask 022", contributing)
        self.assertIn("UV_LINK_MODE=copy", contributing)
        self.assertIn("--link-mode copy", contributing)
        smoke_source = (ROOT / "scripts" / "smoke-python-package.py").read_text(
            encoding="utf-8"
        )
        self.assertIn('[python, "-I", "-S", "-B", "-c", probe]', smoke_source)
        self.assertNotIn(
            '[str(interpreter), "-I", "-S", "-B", "-c", probe]',
            smoke_source,
        )


@unittest.skipUnless(os.name == "posix", "durable result contract requires POSIX")
class PythonPackageSmokeResultTest(unittest.TestCase):
    VERSION = "0.10.0.dev0"

    def _result(self, root: Path) -> dict[str, Any]:
        inventory = [
            {
                "distribution": distribution,
                "filename": smoke.EXACT_BUILD_BACKEND_WHEEL_FILENAMES[distribution],
                "sha256": (
                    "sha256:"
                    + smoke.EXACT_BUILD_BACKEND_WHEEL_HASHES[distribution]
                ),
                "size": smoke.EXACT_BUILD_BACKEND_WHEEL_SIZES[distribution],
                "version": smoke.EXACT_BUILD_BACKEND_DISTRIBUTIONS[distribution],
            }
            for distribution in sorted(smoke.EXACT_BUILD_BACKEND_DISTRIBUTIONS)
        ]
        prefix = root / "package-python-runtime"
        return {
            "artifacts": {
                "sdist": {
                    "filename": f"cortexel-{self.VERSION}.tar.gz",
                    "sha256": "sha256:" + "1" * 64,
                    "size": 456,
                },
                "wheel": {
                    "filename": f"cortexel-{self.VERSION}-py3-none-any.whl",
                    "sha256": "sha256:" + "2" * 64,
                    "size": 123,
                },
            },
            "backendWheelhouse": {
                "inventory": inventory,
                "path": str(root / "backend-wheelhouse"),
                "sha256": smoke.canonical_value_sha256(
                    "cortexel-python-package-backend-wheelhouse-v1",
                    inventory,
                ),
            },
            "contract": smoke.PYTHON_PACKAGE_SMOKE_RESULT_CONTRACT,
            "packageVersion": self.VERSION,
            "python": {
                "baseExecutable": str(root / "base" / "bin" / "python3.14"),
                "baseExecutableSha256": "sha256:" + "3" * 64,
                "baseExecutableSize": 789,
                "executable": str(prefix / "bin" / "python"),
                "executableSha256": "sha256:" + "4" * 64,
                "executableSize": 321,
                "implementation": "cpython",
                "prefix": str(prefix),
                "version": "3.14.6",
            },
            "resources": {
                "resourceCount": 21,
                "skillSchemaCount": 19,
            },
            "sourceAuthority": {"sha256": "sha256:" + "5" * 64},
            "status": "passed",
            "uv": {
                "executable": str(root / "uv"),
                "sha256": "sha256:" + "6" * 64,
                "size": 654,
                "version": smoke.EXPECTED_UV_VERSION,
            },
        }

    def _write_raw(self, path: Path, payload: bytes, mode: int = 0o644) -> None:
        path.write_bytes(payload)
        path.chmod(mode)

    def test_result_writer_is_exclusive_durable_and_canonical(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            path = root / "python-package-result.json"
            result = self._result(root)
            previous_umask = os.umask(0o077)
            try:
                smoke.write_python_package_smoke_result(path, result)
            finally:
                os.umask(previous_umask)
            self.assertEqual(path.read_bytes(), smoke.canonical_json_bytes(result))
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o644)
            self.assertEqual(path.stat().st_nlink, 1)
            self.assertEqual(smoke.read_python_package_smoke_result(path), result)
            with self.assertRaisesRegex(RuntimeError, "must be absent"):
                smoke.write_python_package_smoke_result(path, result)

    def test_result_reader_requires_canonical_protected_parent(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            parent = root / "reader-parent"
            parent.mkdir(mode=0o700)
            path = parent / "result.json"
            payload = smoke.canonical_json_bytes(self._result(root))
            self._write_raw(path, payload)

            parent.chmod(0o755)
            try:
                with self.assertRaisesRegex(RuntimeError, "mode must be exactly 0700"):
                    smoke.read_python_package_smoke_result(path)
            finally:
                parent.chmod(0o700)

            with (
                patch.object(smoke.os, "geteuid", return_value=os.geteuid() + 1),
                self.assertRaisesRegex(
                    RuntimeError,
                    "effective-owner physical directory",
                ),
            ):
                smoke.read_python_package_smoke_result(path)

            noncanonical = parent / "unused" / ".." / path.name
            with self.assertRaisesRegex(RuntimeError, "normalized absolute path"):
                smoke.read_python_package_smoke_result(noncanonical)

            linked_parent = root / "linked-reader-parent"
            linked_parent.symlink_to(parent, target_is_directory=True)
            with self.assertRaisesRegex(
                RuntimeError,
                "parent must be one canonical.*physical directory",
            ):
                smoke.read_python_package_smoke_result(linked_parent / path.name)

    def test_result_reader_opens_leaf_relative_to_pinned_parent(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            path = root / "result.json"
            result = self._result(root)
            self._write_raw(path, smoke.canonical_json_bytes(result))
            real_open = os.open
            opens: list[tuple[object, int | None, int]] = []

            def recording_open(
                received: str | bytes | os.PathLike[str] | os.PathLike[bytes],
                flags: int,
                mode: int = 0o777,
                *,
                dir_fd: int | None = None,
            ) -> int:
                descriptor = real_open(received, flags, mode, dir_fd=dir_fd)
                opens.append((received, dir_fd, descriptor))
                return descriptor

            with patch.object(smoke.os, "open", side_effect=recording_open):
                self.assertEqual(smoke.read_python_package_smoke_result(path), result)

            self.assertEqual(opens[0][0], path.parent)
            self.assertIsNone(opens[0][1])
            self.assertEqual(opens[1][0], path.name)
            self.assertEqual(opens[1][1], opens[0][2])

    def test_result_reader_rejects_leaf_replacement(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            path = root / "result.json"
            displaced = root / "displaced-result.json"
            payload = smoke.canonical_json_bytes(self._result(root))
            self._write_raw(path, payload)
            real_validate = smoke.validate_python_package_smoke_result
            replaced = False

            def racing_validate(value: object) -> dict[str, object]:
                nonlocal replaced
                result = real_validate(value)
                if not replaced:
                    replaced = True
                    path.rename(displaced)
                    self._write_raw(path, payload)
                return result

            with (
                patch.object(
                    smoke,
                    "validate_python_package_smoke_result",
                    side_effect=racing_validate,
                ),
                self.assertRaisesRegex(RuntimeError, "changed during strict validation"),
            ):
                smoke.read_python_package_smoke_result(path)
            self.assertTrue(replaced)

    def test_result_reader_rejects_parent_rebind(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            parent = root / "reader-parent"
            parent.mkdir(mode=0o700)
            path = parent / "result.json"
            displaced_parent = root / "displaced-reader-parent"
            payload = smoke.canonical_json_bytes(self._result(root))
            self._write_raw(path, payload)
            real_validate = smoke.validate_python_package_smoke_result
            rebound = False

            def racing_validate(value: object) -> dict[str, object]:
                nonlocal rebound
                result = real_validate(value)
                if not rebound:
                    rebound = True
                    parent.rename(displaced_parent)
                    parent.mkdir(mode=0o700)
                    self._write_raw(path, payload)
                return result

            with (
                patch.object(
                    smoke,
                    "validate_python_package_smoke_result",
                    side_effect=racing_validate,
                ),
                self.assertRaisesRegex(RuntimeError, "parent changed during"),
            ):
                smoke.read_python_package_smoke_result(path)
            self.assertTrue(rebound)

    def test_result_file_evidence_hashes_in_fixed_chunks(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            path = root / "streamed.bin"
            payload = b"fixed-chunk-streaming-evidence"
            path.write_bytes(payload)
            with (
                patch.object(smoke, "IO_CHUNK_BYTES", 3),
                patch.object(
                    smoke,
                    "bounded_regular_file_bytes",
                    side_effect=AssertionError("must not materialize the file"),
                ),
            ):
                evidence = smoke.regular_file_sha256_evidence(
                    path,
                    maximum=len(payload),
                    label="streaming result fixture",
                )
            self.assertEqual(
                evidence,
                {
                    "sha256": f"sha256:{hashlib.sha256(payload).hexdigest()}",
                    "size": len(payload),
                },
            )

    def test_result_file_evidence_rejects_rename_and_replace_race(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            path = root / "authority.bin"
            old = root / "old-authority.bin"
            payload = b"same bytes do not preserve inode authority"
            path.write_bytes(payload)
            real_read = os.read
            replaced = False

            def racing_read(file_descriptor: int, maximum: int) -> bytes:
                nonlocal replaced
                chunk = real_read(file_descriptor, maximum)
                if not replaced:
                    replaced = True
                    path.rename(old)
                    path.write_bytes(payload)
                return chunk

            with (
                patch.object(smoke.os, "read", side_effect=racing_read),
                self.assertRaisesRegex(RuntimeError, "changed during or after"),
            ):
                smoke.regular_file_sha256_evidence(
                    path,
                    maximum=len(payload),
                    label="raced result fixture",
                )
            self.assertTrue(replaced)

    def test_backend_wheelhouse_result_is_one_stable_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            wheelhouse = root / "wheelhouse"
            wheelhouse.mkdir(mode=0o700)
            for filename in smoke.EXACT_BUILD_BACKEND_WHEEL_FILENAMES.values():
                path = wheelhouse / filename
                path.write_bytes(b"fixture")
                path.chmod(0o644)
            calls = 0

            def raced_evidence(
                path: Path,
                *,
                maximum: int,
                label: str,
            ) -> dict[str, object]:
                del maximum, label
                nonlocal calls
                calls += 1
                if calls == 2:
                    first_name = smoke.EXACT_BUILD_BACKEND_WHEEL_FILENAMES["hatchling"]
                    first = wheelhouse / first_name
                    replacement = wheelhouse / "replacement"
                    replacement.write_bytes(first.read_bytes())
                    replacement.chmod(0o644)
                    os.replace(replacement, first)
                distribution = next(
                    name
                    for name, filename in smoke.EXACT_BUILD_BACKEND_WHEEL_FILENAMES.items()
                    if filename == path.name
                )
                return {
                    "sha256": (
                        "sha256:"
                        + smoke.EXACT_BUILD_BACKEND_WHEEL_HASHES[distribution]
                    ),
                    "size": smoke.EXACT_BUILD_BACKEND_WHEEL_SIZES[distribution],
                }

            with (
                patch.dict(
                    os.environ,
                    {"CORTEXEL_BUILD_BACKEND_WHEELHOUSE": str(wheelhouse)},
                    clear=False,
                ),
                patch.object(
                    smoke,
                    "regular_file_sha256_evidence",
                    side_effect=raced_evidence,
                ),
                self.assertRaisesRegex(RuntimeError, "changed"),
            ):
                smoke.build_backend_wheelhouse_result()
            self.assertEqual(calls, len(smoke.EXACT_BUILD_BACKEND_DISTRIBUTIONS))

    def test_result_source_seal_uses_only_the_exact_validated_lock_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            fixture = self._result(root)
            requirements = b"initial exact validated requirements\n"
            resources = {
                **{
                    f"schemas/skills/skill-{index}.request.v1.schema.json": b"{}\n"
                    for index in range(19)
                },
                "schemas/common.v1.schema.json": b"{}\n",
                "manifest.v1.json": b"{}\n",
            }
            sources = {"source.txt": b"source authority\n"}
            license_bytes = b"license authority\n"
            with (
                patch.object(
                    smoke,
                    "build_python_runtime_results",
                    return_value=(fixture["python"], fixture["uv"]),
                ),
                patch.object(
                    smoke,
                    "build_backend_wheelhouse_result",
                    return_value=fixture["backendWheelhouse"],
                ),
                patch.object(
                    smoke,
                    "require_build_backend_requirements_unchanged",
                ) as require_unchanged,
            ):
                result = smoke.build_python_package_smoke_result(
                    version=self.VERSION,
                    python=str(root / "runtime" / "bin" / "python"),
                    uv=str(root / "uv"),
                    expected_resources=resources,
                    expected_sources=sources,
                    license_bytes=license_bytes,
                    backend_requirements=requirements,
                    wheel_evidence=fixture["artifacts"]["wheel"] | {},
                    sdist_evidence=fixture["artifacts"]["sdist"] | {},
                )
            require_unchanged.assert_called_once_with(requirements)
            expected_source_seal = smoke.inventory_sha256(
                "cortexel-python-package-source-authority-v1",
                {
                    ".github/requirements/python-package-build.txt": requirements,
                    "LICENSE": license_bytes,
                    "python/source.txt": sources["source.txt"],
                },
            )
            self.assertEqual(
                result["sourceAuthority"],
                {"sha256": expected_source_seal},
            )

    def test_result_rejects_duplicate_and_noncanonical_json(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            result = self._result(root)
            canonical = smoke.canonical_json_bytes(result)
            duplicate = canonical.replace(
                b'"status":"passed"',
                b'"status":"failed","status":"passed"',
            )
            cases = (
                ("duplicate", duplicate, "repeats JSON member"),
                ("malformed", b"{\n", "strict UTF-8 JSON"),
                ("invalid UTF-8", b'"\xff"\n', "strict UTF-8 JSON"),
                (
                    "excessive nesting",
                    b"[" * 2_000 + b"]" * 2_000 + b"\n",
                    "strict UTF-8 JSON",
                ),
                ("missing LF", canonical.rstrip(b"\n"), "not canonical JSON"),
                ("pretty", b"  " + canonical, "not canonical JSON"),
            )
            for name, payload, error in cases:
                with self.subTest(name=name):
                    path = root / f"{name.replace(' ', '-')}.json"
                    self._write_raw(path, payload)
                    with self.assertRaisesRegex(RuntimeError, error):
                        smoke.read_python_package_smoke_result(path)

    def test_result_json_depth_budget_is_runtime_independent(self) -> None:
        maximum = smoke.MAX_RESULT_JSON_DEPTH
        smoke._require_bounded_result_json_depth("[" * maximum + "0" + "]" * maximum)
        smoke._require_bounded_result_json_depth(json.dumps("[{" * (maximum + 1)))
        with self.assertRaisesRegex(ValueError, "JSON depth budget"):
            smoke._require_bounded_result_json_depth(
                "[" * (maximum + 1) + "0" + "]" * (maximum + 1)
            )

    def test_result_exact_keys_and_cross_field_tampering_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            cases: list[tuple[str, dict[str, Any], str]] = []

            extra = copy.deepcopy(self._result(root))
            extra["extra"] = False
            cases.append(("extra key", extra, "key inventory"))

            artifact = copy.deepcopy(self._result(root))
            artifact["artifacts"]["wheel"]["filename"] = "attacker.whl"
            cases.append(("artifact filename", artifact, "differs from packageVersion"))

            backend = copy.deepcopy(self._result(root))
            backend["backendWheelhouse"]["inventory"][0]["size"] += 1
            cases.append(("backend size", backend, "authority differs"))

            uv_version = copy.deepcopy(self._result(root))
            uv_version["uv"]["version"] = "0.11.15"
            cases.append(("uv version", uv_version, "must be exactly"))

            escaped_python = copy.deepcopy(self._result(root))
            escaped_python["python"]["executable"] = str(root / "outside-python")
            cases.append(("python prefix escape", escaped_python, "escapes its prefix"))

            prefix_as_executable = copy.deepcopy(self._result(root))
            prefix_as_executable["python"]["prefix"] = prefix_as_executable[
                "python"
            ]["executable"]
            cases.append(
                (
                    "python prefix is executable",
                    prefix_as_executable,
                    "executable must be below",
                )
            )

            base_as_executable = copy.deepcopy(self._result(root))
            base_as_executable["python"]["baseExecutable"] = base_as_executable[
                "python"
            ]["executable"]
            cases.append(
                ("base is executable", base_as_executable, "distinct paths")
            )

            uv_as_executable = copy.deepcopy(self._result(root))
            uv_as_executable["uv"]["executable"] = uv_as_executable["python"][
                "executable"
            ]
            cases.append(("uv is Python", uv_as_executable, "distinct paths"))

            aliased_prefix = copy.deepcopy(self._result(root))
            aliased_prefix["python"]["prefix"] = (
                f"{root}/alias/../package-python-runtime"
            )
            cases.append(
                ("dot-dot prefix alias", aliased_prefix, "normalized absolute path")
            )

            invalid_digest = copy.deepcopy(self._result(root))
            invalid_digest["sourceAuthority"]["sha256"] = "5" * 64
            cases.append(("digest prefix", invalid_digest, "canonical prefixed"))

            boolean_count = copy.deepcopy(self._result(root))
            boolean_count["resources"]["resourceCount"] = True
            cases.append(("boolean count", boolean_count, "must be an integer"))

            changed_count = copy.deepcopy(self._result(root))
            changed_count["resources"]["resourceCount"] = 20
            cases.append(("changed count", changed_count, "differ from the v1 contract"))

            for name, result, error in cases:
                with self.subTest(name=name), self.assertRaisesRegex(RuntimeError, error):
                    smoke.validate_python_package_smoke_result(result)

    def test_result_file_permissions_links_and_size_are_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            payload = smoke.canonical_json_bytes(self._result(root))

            wrong_mode = root / "wrong-mode.json"
            self._write_raw(wrong_mode, payload, mode=0o600)
            with self.assertRaisesRegex(RuntimeError, "mode must be exactly 0644"):
                smoke.read_python_package_smoke_result(wrong_mode)

            linked = root / "linked.json"
            alias = root / "linked-alias.json"
            self._write_raw(linked, payload)
            os.link(linked, alias)
            with self.assertRaisesRegex(RuntimeError, "exactly one filesystem link"):
                smoke.read_python_package_smoke_result(linked)

            symlink_target = root / "symlink-target.json"
            symlink_leaf = root / "symlink-leaf.json"
            self._write_raw(symlink_target, payload)
            symlink_leaf.symlink_to(symlink_target)
            with self.assertRaisesRegex(
                RuntimeError,
                "canonical.*physical regular file",
            ):
                smoke.read_python_package_smoke_result(symlink_leaf)

            oversized = root / "oversized.json"
            with oversized.open("wb") as stream:
                stream.truncate(smoke.MAX_RESULT_BYTES + 1)
            oversized.chmod(0o644)
            with self.assertRaisesRegex(RuntimeError, "byte budget"):
                smoke.read_python_package_smoke_result(oversized)

    @unittest.skipUnless(sys.platform == "darwin", "Darwin extended ACL regression")
    def test_result_parent_and_file_reject_darwin_extended_acls(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            result = self._result(root)
            parent = root / "acl-parent"
            parent.mkdir(mode=0o700)
            subprocess.run(
                [
                    "/bin/chmod",
                    "+a",
                    "everyone allow list,search,add_file,delete_child,file_inherit",
                    str(parent),
                ],
                check=True,
            )
            try:
                path = parent / "result.json"
                with self.assertRaisesRegex(RuntimeError, "extended ACL"):
                    smoke.write_python_package_smoke_result(path, result)
                self.assertFalse(path.exists())
            finally:
                subprocess.run(["/bin/chmod", "-N", str(parent)], check=True)

            path = root / "acl-result.json"
            self._write_raw(path, smoke.canonical_json_bytes(result))
            subprocess.run(
                ["/bin/chmod", "+a", "everyone allow read,write", str(path)],
                check=True,
            )
            try:
                with self.assertRaisesRegex(RuntimeError, "extended ACL"):
                    smoke.read_python_package_smoke_result(path)
            finally:
                subprocess.run(["/bin/chmod", "-N", str(path)], check=True)

    @unittest.skipUnless(
        sys.platform.startswith("linux"),
        "Linux POSIX ACL regression",
    )
    def test_linux_real_acls_reject_paths_and_open_descriptors(self) -> None:
        setfacl = shutil.which("setfacl")
        if setfacl is None:
            self.fail("Linux POSIX ACL regression requires setfacl")

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            parent = root / "acl-parent"
            parent.mkdir(mode=0o700)
            path = parent / "result.json"
            result = self._result(root)
            self._write_raw(path, smoke.canonical_json_bytes(result))
            acl_uid = 1 if os.geteuid() != 1 else 2

            try:
                subprocess.run(
                    [setfacl, "-m", f"d:u:{acl_uid}:rwx", str(parent)],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(stat.S_IMODE(parent.stat().st_mode), 0o700)
                with self.assertRaisesRegex(RuntimeError, "extended ACL"):
                    smoke.require_no_extended_acl(
                        parent,
                        label="Python package smoke result parent",
                    )
                with self.assertRaisesRegex(RuntimeError, "extended ACL"):
                    smoke.read_python_package_smoke_result(path)

                parent_descriptor = os.open(
                    parent,
                    os.O_RDONLY
                    | os.O_DIRECTORY
                    | os.O_NOFOLLOW
                    | os.O_CLOEXEC,
                )
                try:
                    with self.assertRaisesRegex(RuntimeError, "extended ACL"):
                        smoke.require_no_extended_acl(
                            parent_descriptor,
                            label="Python package smoke result parent",
                        )
                finally:
                    os.close(parent_descriptor)
            finally:
                subprocess.run(
                    [setfacl, "-k", str(parent)],
                    check=True,
                    capture_output=True,
                    text=True,
                )

            try:
                subprocess.run(
                    [
                        setfacl,
                        "-m",
                        f"u:{acl_uid}:r--,m::r--",
                        str(path),
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o644)
                with self.assertRaisesRegex(RuntimeError, "extended ACL"):
                    smoke.require_no_extended_acl(
                        path,
                        label="Python package smoke result",
                    )
                with self.assertRaisesRegex(RuntimeError, "extended ACL"):
                    smoke.read_python_package_smoke_result(path)

                file_descriptor = os.open(
                    path,
                    os.O_RDONLY
                    | os.O_NONBLOCK
                    | os.O_NOFOLLOW
                    | os.O_CLOEXEC,
                )
                try:
                    with self.assertRaisesRegex(RuntimeError, "extended ACL"):
                        smoke.require_no_extended_acl(
                            file_descriptor,
                            label="Python package smoke result",
                        )
                finally:
                    os.close(file_descriptor)
            finally:
                subprocess.run(
                    [setfacl, "-b", str(path)],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            self.assertEqual(stat.S_IMODE(parent.stat().st_mode), 0o700)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o644)
            self.assertEqual(smoke.read_python_package_smoke_result(path), result)

    def test_linux_acl_xattrs_are_rejected_for_paths_and_descriptors(self) -> None:
        inspected: list[tuple[Path | int, bool]] = []

        def acl_xattr(
            value: Path | int,
            *,
            follow_symlinks: bool = True,
        ) -> list[str] | list[bytes]:
            inspected.append((value, follow_symlinks))
            if isinstance(value, Path):
                return ["system.posix_acl_access"]
            return [b"system.posix_acl_default"]

        with (
            patch.object(smoke.sys, "platform", "linux"),
            patch.object(smoke.os, "listxattr", create=True, side_effect=acl_xattr),
            patch.object(smoke.os, "getxattr", create=True),
        ):
            for value in (Path("/result.json"), 17):
                with self.subTest(value=value), self.assertRaisesRegex(
                    RuntimeError,
                    "extended ACL",
                ):
                    smoke.require_no_extended_acl(value, label="test authority")

        self.assertEqual(inspected, [(Path("/result.json"), False), (17, True)])

        for error_number in (errno.ENOTSUP, errno.EOPNOTSUPP):
            for value in (Path("/result.json"), 17):
                with (
                    self.subTest(
                        operation="listxattr",
                        error_number=error_number,
                        value=value,
                    ),
                    patch.object(smoke.sys, "platform", "linux"),
                    patch.object(
                        smoke.os,
                        "listxattr",
                        create=True,
                        side_effect=OSError(error_number, "unsupported"),
                    ),
                    patch.object(smoke.os, "getxattr", create=True),
                    self.assertRaisesRegex(RuntimeError, "cannot be inspected"),
                ):
                    smoke.require_no_extended_acl(value, label="test authority")

                with (
                    self.subTest(
                        operation="getxattr",
                        error_number=error_number,
                        value=value,
                    ),
                    patch.object(smoke.sys, "platform", "linux"),
                    patch.object(
                        smoke.os,
                        "listxattr",
                        create=True,
                        return_value=[],
                    ),
                    patch.object(
                        smoke.os,
                        "getxattr",
                        create=True,
                        side_effect=OSError(error_number, "unsupported"),
                    ),
                    self.assertRaisesRegex(RuntimeError, "cannot be inspected"),
                ):
                    smoke.require_no_extended_acl(value, label="test authority")

        def hidden_acl(
            _value: Path | int,
            attribute: str,
            **_kwargs: object,
        ) -> bytes:
            if attribute == "system.posix_acl_access":
                return b"hidden from listxattr"
            raise OSError(errno.ENODATA, "absent")

        with (
            patch.object(smoke.sys, "platform", "linux"),
            patch.object(smoke.os, "listxattr", create=True, return_value=[]),
            patch.object(smoke.os, "getxattr", create=True, side_effect=hidden_acl),
            self.assertRaisesRegex(RuntimeError, "extended ACL"),
        ):
            smoke.require_no_extended_acl(Path("/result.json"), label="test authority")

    def test_result_output_requires_a_new_canonical_protected_location(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            result = self._result(root)

            relative = Path("relative-result.json")
            with self.assertRaisesRegex(RuntimeError, "canonical absolute path"):
                smoke.write_python_package_smoke_result(relative, result)

            for name, raw_alias in (
                ("redundant separator", f"{root}//raw-alias.json"),
                ("dot segment", f"{root}/./raw-alias.json"),
                ("dot-dot segment", f"{root}/alias/../raw-alias.json"),
            ):
                with self.subTest(name=name), self.assertRaisesRegex(
                    RuntimeError,
                    "normalized absolute path",
                ):
                    smoke._authorize_new_result_path(raw_alias)
            with self.assertRaisesRegex(RuntimeError, "control or surrogate"):
                smoke._authorize_new_result_path(f"{root}/bad\nname.json")

            exposed = root / "exposed"
            exposed.mkdir(mode=0o777)
            exposed.chmod(0o777)
            with self.assertRaisesRegex(RuntimeError, "protected.*physical directory"):
                smoke.write_python_package_smoke_result(
                    exposed / "result.json",
                    result,
                )

            for mode in (0o500, 0o711, 0o755):
                protected = root / f"wrong-parent-mode-{mode:o}"
                protected.mkdir(mode=0o700)
                protected.chmod(mode)
                with self.subTest(mode=oct(mode)), self.assertRaisesRegex(
                    RuntimeError,
                    "exact 0700 mode",
                ):
                    smoke.write_python_package_smoke_result(
                        protected / "result.json",
                        result,
                    )

            existing = root / "existing.json"
            existing.write_text("occupied", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "must be absent"):
                smoke.write_python_package_smoke_result(existing, result)

            target = root / "target"
            target.mkdir(mode=0o700)
            linked_parent = root / "linked-parent"
            linked_parent.symlink_to(target, target_is_directory=True)
            with self.assertRaisesRegex(RuntimeError, "canonical absolute path"):
                smoke.write_python_package_smoke_result(
                    linked_parent / "result.json",
                    result,
                )

    def test_result_output_is_disjoint_from_every_evidence_authority(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            authorities: dict[str, Path] = {}
            for name in ("source", "wheelhouse", "runtime", "base", "uv-bin"):
                authority = root / name
                authority.mkdir(mode=0o700)
                authorities[name] = authority
            scratch = root / "scratch"
            scratch.mkdir(mode=0o700)
            smoke._require_result_path_outside_authorities(
                scratch / "result.json",
                authorities,
            )
            for name, authority in authorities.items():
                with self.subTest(name=name), self.assertRaisesRegex(
                    RuntimeError,
                    f"overlaps {name}",
                ):
                    smoke._require_result_path_outside_authorities(
                        authority / "result.json",
                        authorities,
                    )

    def test_result_parent_authority_is_bound_across_verification(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            parent = root / "scratch"
            parent.mkdir(mode=0o700)
            path = parent / "result.json"
            result = self._result(root)
            authority = smoke._new_result_parent(path)
            original = root / "original-scratch"
            parent.rename(original)
            parent.mkdir(mode=0o700)
            with self.assertRaisesRegex(RuntimeError, "changed after initial"):
                smoke.write_python_package_smoke_result(
                    path,
                    result,
                    expected_parent_authority=authority,
                )
            self.assertFalse(path.exists())

    def test_result_parent_swap_between_authorization_and_open_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve(strict=True)
            parent = root / "scratch"
            parent.mkdir(mode=0o700)
            path = parent / "result.json"
            result = self._result(root)
            original = root / "original-scratch"
            real_open = os.open
            swapped = False

            def racing_open(
                received: str | bytes | os.PathLike[str] | os.PathLike[bytes],
                flags: int,
                mode: int = 0o777,
                *,
                dir_fd: int | None = None,
            ) -> int:
                nonlocal swapped
                received_path = os.fspath(received)
                if (
                    not swapped
                    and dir_fd is None
                    and isinstance(received_path, str)
                    and Path(received_path) == parent
                ):
                    swapped = True
                    parent.rename(original)
                    parent.mkdir(mode=0o700)
                return real_open(received, flags, mode, dir_fd=dir_fd)

            with (
                patch.object(smoke.os, "open", side_effect=racing_open),
                self.assertRaisesRegex(RuntimeError, "changed before creation"),
            ):
                smoke.write_python_package_smoke_result(path, result)
            self.assertTrue(swapped)
            self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
