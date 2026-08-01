from __future__ import annotations

import ctypes
import errno
import importlib.util
import os
from pathlib import Path
import shutil
import stat
from types import ModuleType, SimpleNamespace
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
INSPECTOR_PATH = ROOT / "scripts" / "inspect-posix-acl.py"


def _load_inspector() -> ModuleType:
    specification = importlib.util.spec_from_file_location(
        "cortexel_inspect_posix_acl",
        INSPECTOR_PATH,
    )
    if specification is None or specification.loader is None:
        raise RuntimeError("ACL inspector module cannot be loaded")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


INSPECTOR = _load_inspector()
REGULAR_FILE_STAT = SimpleNamespace(st_mode=stat.S_IFREG | 0o600)


class InspectPosixAclTests(unittest.TestCase):
    def test_darwin_deny_delete_acl_serialization_is_exact(self) -> None:
        reviewed = INSPECTOR._DARWIN_REVIEWED_DENY_DELETE_ACL_TEXT
        self.assertEqual(
            reviewed,
            b"!#acl 1\n"
            b"group:ABCDEFAB-CDEF-ABCD-EFAB-CDEF0000000C:"
            b"everyone:12:deny:delete\n",
        )
        self.assertTrue(
            INSPECTOR._darwin_acl_text_is_reviewed_deny_delete(reviewed)
        )
        for unsupported in (
            reviewed.replace(b":deny:", b":allow:"),
            reviewed.replace(b":delete\n", b":read\n"),
            reviewed.replace(b":deny:", b":deny,file_inherit:"),
            reviewed + reviewed.split(b"\n", maxsplit=1)[1],
            reviewed.removeprefix(b"!#acl 1\n"),
            reviewed.replace(b":everyone:12:", b":wheel:0:"),
            reviewed + b"\0",
        ):
            with self.subTest(serialized=unsupported):
                self.assertFalse(
                    INSPECTOR._darwin_acl_text_is_reviewed_deny_delete(
                        unsupported
                    )
                )

    def test_darwin_acl_text_ambiguity_and_translation_errors_fail_closed(
        self,
    ) -> None:
        expected = INSPECTOR._DARWIN_REVIEWED_DENY_DELETE_ACL_TEXT
        invalid_storage = ctypes.create_string_buffer(expected + b"X")
        invalid_pointer = ctypes.addressof(invalid_storage)
        freed: list[int] = []

        def invalid_text(_acl: int, length_pointer: object) -> int:
            length = ctypes.cast(
                length_pointer,
                ctypes.POINTER(ctypes.c_ssize_t),
            )
            length.contents.value = len(expected)
            return invalid_pointer

        def free_object(pointer: int) -> int:
            freed.append(pointer)
            return 0

        invalid_library = SimpleNamespace(
            acl_to_text=invalid_text,
            acl_free=free_object,
        )
        with self.assertRaisesRegex(
            RuntimeError,
            "cannot be parsed unambiguously",
        ):
            INSPECTOR._darwin_acl_is_reviewed_deny_delete(
                invalid_library,
                1,
                "invalid serialization fixture",
            )
        self.assertEqual(freed, [invalid_pointer])

        def failed_text(_acl: int, _length_pointer: object) -> None:
            ctypes.set_errno(errno.EINVAL)
            return None

        failed_library = SimpleNamespace(
            acl_to_text=failed_text,
            acl_free=free_object,
        )
        with self.assertRaisesRegex(
            RuntimeError,
            "ACL authority cannot be inspected",
        ):
            INSPECTOR._darwin_acl_is_reviewed_deny_delete(
                failed_library,
                1,
                "failed translation fixture",
            )
        self.assertEqual(freed, [invalid_pointer])

        valid_storage = ctypes.create_string_buffer(expected)
        valid_pointer = ctypes.addressof(valid_storage)

        def valid_text(_acl: int, length_pointer: object) -> int:
            length = ctypes.cast(
                length_pointer,
                ctypes.POINTER(ctypes.c_ssize_t),
            )
            length.contents.value = len(expected)
            return valid_pointer

        def failed_free(_pointer: int) -> int:
            ctypes.set_errno(errno.EIO)
            return -1

        failed_free_library = SimpleNamespace(
            acl_to_text=valid_text,
            acl_free=failed_free,
        )
        with self.assertRaisesRegex(
            RuntimeError,
            "ACL authority cannot be inspected",
        ):
            INSPECTOR._darwin_acl_is_reviewed_deny_delete(
                failed_free_library,
                1,
                "failed free fixture",
            )

    @unittest.skipUnless(sys.platform == "darwin", "Darwin ACL integration")
    def test_darwin_admits_only_real_everyone_deny_delete_acl(self) -> None:
        with tempfile.TemporaryDirectory(prefix="cortexel-darwin-acl-") as root:
            reviewed = Path(root, "reviewed")
            reviewed.mkdir(mode=0o700)
            subprocess.run(
                [
                    "/bin/chmod",
                    "+a",
                    "group:everyone deny delete",
                    reviewed,
                ],
                check=True,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            try:
                INSPECTOR._require_reviewed_non_authorizing_acl(
                    reviewed,
                    "reviewed ACL path",
                )
                descriptor = os.open(reviewed, os.O_RDONLY)
                try:
                    INSPECTOR._require_reviewed_non_authorizing_acl(
                        descriptor,
                        "reviewed ACL descriptor",
                    )
                finally:
                    os.close(descriptor)
            finally:
                subprocess.run(
                    ["/bin/chmod", "-N", reviewed],
                    check=True,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )

            for name, acl_entries in (
                ("allow", ("group:everyone allow list",)),
                (
                    "inheritance-flag",
                    ("group:everyone deny delete,file_inherit",),
                ),
                (
                    "additional-entry",
                    (
                        "group:everyone deny delete",
                        "group:everyone deny read",
                    ),
                ),
            ):
                with self.subTest(acl_entries=acl_entries):
                    unsupported = Path(root, name)
                    unsupported.mkdir(mode=0o700)
                    descriptor = os.open(unsupported, os.O_RDONLY)
                    try:
                        try:
                            for acl_entry in acl_entries:
                                subprocess.run(
                                    ["/bin/chmod", "+a", acl_entry, unsupported],
                                    check=True,
                                    stdin=subprocess.DEVNULL,
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE,
                                )
                            with self.assertRaisesRegex(
                                RuntimeError,
                                "extended ACL",
                            ):
                                INSPECTOR._require_reviewed_non_authorizing_acl(
                                    unsupported,
                                    f"{name} ACL path",
                                )
                            with self.assertRaisesRegex(
                                RuntimeError,
                                "extended ACL",
                            ):
                                INSPECTOR._require_reviewed_non_authorizing_acl(
                                    descriptor,
                                    f"{name} ACL descriptor",
                                )
                        finally:
                            subprocess.run(
                                ["/bin/chmod", "-N", unsupported],
                                check=True,
                                stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                            )
                    finally:
                        os.close(descriptor)

    @unittest.skipUnless(sys.platform.startswith("linux"), "Linux libacl integration")
    def test_linux_setfacl_path_descriptor_default_and_procfs_controls(self) -> None:
        setfacl = shutil.which("setfacl")
        self.assertIsNotNone(setfacl, "Linux ACL integration requires setfacl")
        assert setfacl is not None
        with tempfile.TemporaryDirectory(prefix="cortexel-linux-acl-") as root:
            acl_directory = Path(root, "acl-directory")
            acl_directory.mkdir(mode=0o700)
            subprocess.run(
                [setfacl, "--modify", "user:65534:r-x", "--", acl_directory],
                check=True,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            with self.assertRaisesRegex(RuntimeError, "carries an extended ACL"):
                INSPECTOR._require_reviewed_non_authorizing_acl(
                    acl_directory,
                    "Linux ACL path",
                )

            descriptor = os.open(acl_directory, os.O_RDONLY)
            try:
                moved_directory = Path(root, "moved-acl-directory")
                acl_directory.rename(moved_directory)
                acl_directory.mkdir(mode=0o700)
                INSPECTOR._require_reviewed_non_authorizing_acl(
                    acl_directory,
                    "replacement clean path",
                )
                with self.assertRaisesRegex(RuntimeError, "carries an extended ACL"):
                    INSPECTOR._require_reviewed_non_authorizing_acl(
                        descriptor,
                        "Linux ACL descriptor",
                    )
            finally:
                os.close(descriptor)

            default_acl_directory = Path(root, "default-acl-directory")
            default_acl_directory.mkdir(mode=0o700)
            subprocess.run(
                [
                    setfacl,
                    "--modify",
                    "default:user:65534:r-x",
                    "--",
                    default_acl_directory,
                ],
                check=True,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            with self.assertRaisesRegex(
                RuntimeError,
                "carries an extended default ACL",
            ):
                INSPECTOR._require_reviewed_non_authorizing_acl(
                    default_acl_directory,
                    "Linux default ACL path",
                )

            with self.assertRaisesRegex(
                RuntimeError,
                "filesystem ACL model is unsupported",
            ):
                INSPECTOR._require_reviewed_non_authorizing_acl(
                    Path("/proc"),
                    "Linux procfs path",
                )
            INSPECTOR._require_reviewed_non_authorizing_acl(
                Path("/dev/shm"),
                "Linux clean tmpfs path",
            )

    def test_linux_unknown_filesystem_fails_closed(self) -> None:
        with (
            mock.patch.object(
                INSPECTOR,
                "_linux_filesystem_magic",
                return_value=0x794C7630,
            ),
            mock.patch.object(
                INSPECTOR.os,
                "fstat",
                return_value=REGULAR_FILE_STAT,
            ),
        ):
            with self.assertRaisesRegex(RuntimeError, "filesystem ACL model is unsupported"):
                INSPECTOR._require_no_extended_linux_acl(0, "overlay fixture")

    def test_linux_enotsup_and_eopnotsupp_fail_closed(self) -> None:
        for error_number in {errno.ENOTSUP, errno.EOPNOTSUPP}:
            with self.subTest(error_number=error_number):
                def unsupported_acl(_descriptor: int) -> None:
                    ctypes.set_errno(error_number)
                    return None

                library = SimpleNamespace(acl_get_fd=unsupported_acl)
                with (
                    mock.patch.object(
                        INSPECTOR,
                        "_linux_filesystem_magic",
                        return_value=0x0000EF53,
                    ),
                    mock.patch.object(
                        INSPECTOR,
                        "_linux_acl_library",
                        return_value=library,
                    ),
                    mock.patch.object(
                        INSPECTOR,
                        "_require_no_alternate_linux_acl",
                        return_value=None,
                    ),
                    mock.patch.object(
                        INSPECTOR.os,
                        "fstat",
                        return_value=REGULAR_FILE_STAT,
                    ),
                ):
                    with self.assertRaisesRegex(
                        RuntimeError,
                        "ACL authority cannot be inspected",
                    ):
                        INSPECTOR._require_no_extended_linux_acl(
                            0,
                            "unsupported ACL fixture",
                        )

    def test_linux_alternate_acl_attribute_fails_closed(self) -> None:
        with (
            mock.patch.object(
                INSPECTOR,
                "_linux_filesystem_magic",
                return_value=0x0000EF53,
            ),
            mock.patch.object(
                INSPECTOR.os,
                "listxattr",
                return_value=["system.richacl"],
                create=True,
            ),
            mock.patch.object(
                INSPECTOR.os,
                "fstat",
                return_value=REGULAR_FILE_STAT,
            ),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "unsupported alternate ACL authority",
            ):
                INSPECTOR._require_no_extended_linux_acl(
                    0,
                    "alternate ACL fixture",
                )

    def test_linux_alternate_acl_list_enotsup_fails_closed(self) -> None:
        with mock.patch.object(
            INSPECTOR.os,
            "listxattr",
            side_effect=OSError(errno.EOPNOTSUPP, "unsupported"),
            create=True,
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "alternate ACL authority cannot be inspected",
            ):
                INSPECTOR._require_no_alternate_linux_acl(
                    0,
                    "alternate ACL list fixture",
                )

    def test_linux_acl_equivalence_detects_extended_entries(self) -> None:
        def get_acl(_descriptor: int) -> int:
            return 1

        def extended_acl(_acl: int, _mode: object) -> int:
            return 1

        def free_acl(_acl: int) -> int:
            return 0

        library = SimpleNamespace(
            acl_get_fd=get_acl,
            acl_equiv_mode=extended_acl,
            acl_free=free_acl,
        )
        with (
            mock.patch.object(
                INSPECTOR,
                "_linux_filesystem_magic",
                return_value=0x0000EF53,
            ),
            mock.patch.object(
                INSPECTOR,
                "_linux_acl_library",
                return_value=library,
            ),
            mock.patch.object(
                INSPECTOR,
                "_require_no_alternate_linux_acl",
                return_value=None,
            ),
            mock.patch.object(
                INSPECTOR.os,
                "fstat",
                return_value=REGULAR_FILE_STAT,
            ),
        ):
            with self.assertRaisesRegex(RuntimeError, "carries an extended ACL"):
                INSPECTOR._require_no_extended_linux_acl(0, "extended ACL fixture")

    def test_linux_rejects_special_descriptors_before_acl_queries(self) -> None:
        read_descriptor, write_descriptor = os.pipe()
        try:
            with self.assertRaisesRegex(
                RuntimeError,
                "unsupported special file type",
            ):
                INSPECTOR._require_no_extended_linux_acl(
                    read_descriptor,
                    "pipe descriptor fixture",
                )
        finally:
            os.close(read_descriptor)
            os.close(write_descriptor)

    @unittest.skipUnless(sys.platform.startswith("linux"), "Linux FIFO integration")
    def test_linux_fifo_path_fails_without_blocking(self) -> None:
        with tempfile.TemporaryDirectory(prefix="cortexel-linux-acl-fifo-") as root:
            fifo = Path(root, "subject.fifo")
            os.mkfifo(fifo, mode=0o600)
            result = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-B",
                    "-S",
                    INSPECTOR_PATH,
                    "--path",
                    "FIFO path fixture",
                    fifo,
                ],
                check=False,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=2,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(b"unsupported special file type", result.stderr)

    def test_linux_non_null_zero_entry_default_acl_is_clean(self) -> None:
        def get_access_acl(_descriptor: int) -> int:
            return 1

        def equivalent_access_acl(_acl: int, _mode: object) -> int:
            return 0

        def get_default_acl(_path: bytes, _acl_type: int) -> int:
            return 2

        def zero_entries(_acl: int) -> int:
            return 0

        def free_acl(_acl: int) -> int:
            return 0

        library = SimpleNamespace(
            acl_get_fd=get_access_acl,
            acl_equiv_mode=equivalent_access_acl,
            acl_get_file=get_default_acl,
            acl_entries=zero_entries,
            acl_free=free_acl,
        )
        directory_stat = SimpleNamespace(st_mode=0o040700, st_dev=7, st_ino=11)
        with (
            mock.patch.object(
                INSPECTOR,
                "_linux_filesystem_magic",
                return_value=0x0000EF53,
            ),
            mock.patch.object(
                INSPECTOR,
                "_linux_acl_library",
                return_value=library,
            ),
            mock.patch.object(
                INSPECTOR,
                "_require_no_alternate_linux_acl",
                return_value=None,
            ),
            mock.patch.object(INSPECTOR.os, "fstat", return_value=directory_stat),
            mock.patch.object(INSPECTOR.Path, "stat", return_value=directory_stat),
        ):
            INSPECTOR._require_no_extended_linux_acl(0, "clean default ACL fixture")

    def test_linux_unreadable_proc_descriptor_fails_closed(self) -> None:
        def get_access_acl(_descriptor: int) -> int:
            return 1

        def equivalent_access_acl(_acl: int, _mode: object) -> int:
            return 0

        def free_acl(_acl: int) -> int:
            return 0

        library = SimpleNamespace(
            acl_get_fd=get_access_acl,
            acl_equiv_mode=equivalent_access_acl,
            acl_free=free_acl,
        )
        directory_stat = SimpleNamespace(st_mode=0o040700, st_dev=7, st_ino=11)
        with (
            mock.patch.object(
                INSPECTOR,
                "_linux_filesystem_magic",
                return_value=0x0000EF53,
            ),
            mock.patch.object(
                INSPECTOR,
                "_linux_acl_library",
                return_value=library,
            ),
            mock.patch.object(
                INSPECTOR,
                "_require_no_alternate_linux_acl",
                return_value=None,
            ),
            mock.patch.object(INSPECTOR.os, "fstat", return_value=directory_stat),
            mock.patch.object(
                INSPECTOR.Path,
                "stat",
                side_effect=PermissionError(errno.EACCES, "unreadable procfs"),
            ),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "default ACL authority cannot be inspected",
            ):
                INSPECTOR._require_no_extended_linux_acl(
                    0,
                    "unreadable procfs fixture",
                )


if __name__ == "__main__":
    unittest.main()
