#!/usr/bin/env python3
"""Fail closed unless every subject matches the reviewed ACL authority policy."""

from __future__ import annotations

import ctypes
import errno
import os
import stat
import sys
from pathlib import Path
from typing import NoReturn

_LINUX_REVIEWED_POSIX_ACL_FILESYSTEMS = {
    0x0000EF53: "ext-family",
    0x01021994: "tmpfs",
}
_LINUX_ACL_TYPE_DEFAULT = 0x4000
_LINUX_POSIX_ACL_ATTRIBUTES = {
    "system.posix_acl_access",
    "system.posix_acl_default",
}
_DARWIN_ACL_TYPE_EXTENDED = 0x00000100
_DARWIN_REVIEWED_DENY_DELETE_ACL_TEXT = (
    b"!#acl 1\n"
    b"group:ABCDEFAB-CDEF-ABCD-EFAB-CDEF0000000C:everyone:12:deny:delete\n"
)


def _fail(message: str) -> NoReturn:
    raise RuntimeError(message)


def _linux_filesystem_magic(descriptor: int, label: str) -> int:
    libc = ctypes.CDLL(None, use_errno=True)
    libc.fstatfs.argtypes = [ctypes.c_int, ctypes.c_void_p]
    libc.fstatfs.restype = ctypes.c_int
    storage = ctypes.create_string_buffer(512)
    ctypes.set_errno(0)
    if libc.fstatfs(descriptor, ctypes.byref(storage)) != 0:
        error = ctypes.get_errno()
        raise RuntimeError(f"{label} filesystem authority cannot be inspected") from OSError(
            error,
            os.strerror(error),
        )
    signed_magic = ctypes.c_long.from_buffer(storage).value
    width = ctypes.sizeof(ctypes.c_long) * 8
    return signed_magic & ((1 << width) - 1)


def _linux_acl_library(label: str) -> ctypes.CDLL:
    try:
        library = ctypes.CDLL("libacl.so.1", use_errno=True)
    except OSError as error:
        raise RuntimeError(f"{label} ACL authority cannot be inspected") from error
    library.acl_get_fd.argtypes = [ctypes.c_int]
    library.acl_get_fd.restype = ctypes.c_void_p
    library.acl_get_file.argtypes = [ctypes.c_char_p, ctypes.c_int]
    library.acl_get_file.restype = ctypes.c_void_p
    library.acl_equiv_mode.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint)]
    library.acl_equiv_mode.restype = ctypes.c_int
    library.acl_entries.argtypes = [ctypes.c_void_p]
    library.acl_entries.restype = ctypes.c_int
    library.acl_free.argtypes = [ctypes.c_void_p]
    library.acl_free.restype = ctypes.c_int
    return library


def _linux_free_acl(library: ctypes.CDLL, acl: int, label: str) -> None:
    ctypes.set_errno(0)
    if library.acl_free(acl) != 0:
        error = ctypes.get_errno()
        raise RuntimeError(f"{label} ACL authority cannot be inspected") from OSError(
            error,
            os.strerror(error),
        )


def _darwin_acl_library(label: str) -> ctypes.CDLL:
    try:
        library = ctypes.CDLL(None, use_errno=True)
    except OSError as error:
        raise RuntimeError(f"{label} ACL authority cannot be inspected") from error
    library.acl_get_file.argtypes = [ctypes.c_char_p, ctypes.c_int]
    library.acl_get_file.restype = ctypes.c_void_p
    library.acl_get_fd_np.argtypes = [ctypes.c_int, ctypes.c_int]
    library.acl_get_fd_np.restype = ctypes.c_void_p
    library.acl_to_text.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_ssize_t),
    ]
    library.acl_to_text.restype = ctypes.c_void_p
    library.acl_free.argtypes = [ctypes.c_void_p]
    library.acl_free.restype = ctypes.c_int
    return library


def _darwin_free_acl_object(
    library: ctypes.CDLL,
    acl_object: int,
    label: str,
) -> None:
    ctypes.set_errno(0)
    if library.acl_free(acl_object) != 0:
        error = ctypes.get_errno()
        raise RuntimeError(f"{label} ACL authority cannot be inspected") from OSError(
            error,
            os.strerror(error),
        )


def _darwin_acl_text_is_reviewed_deny_delete(serialized: bytes) -> bool:
    return serialized == _DARWIN_REVIEWED_DENY_DELETE_ACL_TEXT


def _darwin_acl_is_reviewed_deny_delete(
    library: ctypes.CDLL,
    acl: int,
    label: str,
) -> bool:
    text_length = ctypes.c_ssize_t(-1)
    ctypes.set_errno(0)
    text_pointer = library.acl_to_text(acl, ctypes.byref(text_length))
    if not text_pointer:
        error = ctypes.get_errno()
        raise RuntimeError(f"{label} ACL authority cannot be inspected") from OSError(
            error,
            os.strerror(error),
        )
    try:
        expected = _DARWIN_REVIEWED_DENY_DELETE_ACL_TEXT
        if text_length.value != len(expected):
            return False
        serialized = ctypes.string_at(text_pointer, len(expected) + 1)
        if serialized[-1:] != b"\0":
            _fail(f"{label} ACL authority cannot be parsed unambiguously")
        return _darwin_acl_text_is_reviewed_deny_delete(serialized[:-1])
    finally:
        _darwin_free_acl_object(library, text_pointer, label)


def _require_no_authorizing_darwin_acl(
    path_or_descriptor: Path | int,
    label: str,
) -> None:
    library = _darwin_acl_library(label)
    ctypes.set_errno(0)
    if isinstance(path_or_descriptor, int):
        acl = library.acl_get_fd_np(
            path_or_descriptor,
            _DARWIN_ACL_TYPE_EXTENDED,
        )
    else:
        acl = library.acl_get_file(
            os.fsencode(path_or_descriptor),
            _DARWIN_ACL_TYPE_EXTENDED,
        )
    if not acl:
        error = ctypes.get_errno()
        if error != errno.ENOENT:
            raise RuntimeError(
                f"{label} ACL authority cannot be inspected"
            ) from OSError(error, os.strerror(error))
        return
    try:
        if not _darwin_acl_is_reviewed_deny_delete(library, acl, label):
            _fail(f"{label} carries an authorizing or unsupported extended ACL")
    finally:
        _darwin_free_acl_object(library, acl, label)


def _require_no_alternate_linux_acl(descriptor: int, label: str) -> None:
    listxattr = getattr(os, "listxattr", None)
    if not callable(listxattr):
        _fail(f"{label} alternate ACL authority cannot be inspected")
    try:
        attributes = {os.fsdecode(value) for value in listxattr(descriptor)}
    except OSError as error:
        raise RuntimeError(
            f"{label} alternate ACL authority cannot be inspected"
        ) from error
    for attribute in attributes:
        namespace = attribute.partition(".")[0].lower()
        if (
            namespace in {"security", "system", "trusted"}
            and "acl" in attribute.lower()
            and attribute not in _LINUX_POSIX_ACL_ATTRIBUTES
        ):
            _fail(f"{label} carries unsupported alternate ACL authority")


def _require_no_extended_linux_acl(descriptor: int, label: str) -> None:
    descriptor_stat = os.fstat(descriptor)
    if not (
        stat.S_ISREG(descriptor_stat.st_mode)
        or stat.S_ISDIR(descriptor_stat.st_mode)
    ):
        _fail(f"{label} is an unsupported special file type")

    filesystem_magic = _linux_filesystem_magic(descriptor, label)
    if filesystem_magic not in _LINUX_REVIEWED_POSIX_ACL_FILESYSTEMS:
        _fail(
            f"{label} filesystem ACL model is unsupported "
            f"(magic 0x{filesystem_magic:x})"
        )

    _require_no_alternate_linux_acl(descriptor, label)
    library = _linux_acl_library(label)
    ctypes.set_errno(0)
    access_acl = library.acl_get_fd(descriptor)
    if not access_acl:
        error = ctypes.get_errno()
        raise RuntimeError(f"{label} ACL authority cannot be inspected") from OSError(
            error,
            os.strerror(error),
        )
    equivalent_mode = ctypes.c_uint()
    try:
        ctypes.set_errno(0)
        equivalence = library.acl_equiv_mode(access_acl, ctypes.byref(equivalent_mode))
        if equivalence < 0:
            error = ctypes.get_errno()
            raise RuntimeError(
                f"{label} ACL authority cannot be inspected"
            ) from OSError(error, os.strerror(error))
        if equivalence != 0:
            _fail(f"{label} carries an extended ACL")
    finally:
        _linux_free_acl(library, access_acl, label)

    if not stat.S_ISDIR(descriptor_stat.st_mode):
        return
    proc_descriptor = Path(f"/proc/self/fd/{descriptor}")
    try:
        proc_stat = proc_descriptor.stat()
    except OSError as error:
        raise RuntimeError(f"{label} default ACL authority cannot be inspected") from error
    if (proc_stat.st_dev, proc_stat.st_ino) != (
        descriptor_stat.st_dev,
        descriptor_stat.st_ino,
    ):
        _fail(f"{label} descriptor identity changed before default ACL inspection")
    ctypes.set_errno(0)
    default_acl = library.acl_get_file(
        os.fsencode(proc_descriptor),
        _LINUX_ACL_TYPE_DEFAULT,
    )
    if not default_acl:
        error = ctypes.get_errno()
        raise RuntimeError(
            f"{label} default ACL authority cannot be inspected"
        ) from OSError(error, os.strerror(error))
    try:
        ctypes.set_errno(0)
        default_entries = library.acl_entries(default_acl)
        if default_entries < 0:
            error = ctypes.get_errno()
            raise RuntimeError(
                f"{label} default ACL authority cannot be inspected"
            ) from OSError(error, os.strerror(error))
        if default_entries > 0:
            _fail(f"{label} carries an extended default ACL")
    finally:
        _linux_free_acl(library, default_acl, label)


def _require_reviewed_non_authorizing_acl(
    path_or_descriptor: Path | int,
    label: str,
) -> None:
    if sys.platform == "darwin":
        _require_no_authorizing_darwin_acl(path_or_descriptor, label)
        return

    if sys.platform.startswith("linux"):
        if isinstance(path_or_descriptor, int):
            _require_no_extended_linux_acl(path_or_descriptor, label)
            return
        flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0)
        no_follow = getattr(os, "O_NOFOLLOW", None)
        if no_follow is None or no_follow == 0:
            _fail(f"{label} no-follow path authority is unavailable")
        non_blocking = getattr(os, "O_NONBLOCK", None)
        if non_blocking is None or non_blocking == 0:
            _fail(f"{label} nonblocking path authority is unavailable")
        flags |= no_follow | non_blocking
        try:
            descriptor = os.open(path_or_descriptor, flags)
        except OSError as error:
            raise RuntimeError(f"{label} ACL authority cannot be inspected") from error
        try:
            _require_no_extended_linux_acl(descriptor, label)
        finally:
            os.close(descriptor)
        return

    _fail(f"{label} ACL inspection is unsupported on this platform")


def _arguments(argv: list[str]) -> list[tuple[Path | int, str]]:
    inspected: list[tuple[Path | int, str]] = []
    index = 0
    while index < len(argv):
        kind = argv[index]
        if kind not in {"--path", "--fd"} or index + 2 >= len(argv):
            _fail("expected repeated --path LABEL PATH or --fd LABEL FD triples")
        label = argv[index + 1]
        value = argv[index + 2]
        if not label or len(label) > 128:
            _fail("ACL label is invalid")
        if kind == "--path":
            inspected.append((Path(value), label))
        else:
            try:
                descriptor = int(value, 10)
            except ValueError as error:
                raise RuntimeError("ACL descriptor is invalid") from error
            if descriptor < 0:
                _fail("ACL descriptor is invalid")
            inspected.append((descriptor, label))
        index += 3
    if not inspected:
        _fail("no ACL subjects were supplied")
    return inspected


def main() -> int:
    try:
        for subject, label in _arguments(sys.argv[1:]):
            _require_reviewed_non_authorizing_acl(subject, label)
    except Exception as error:  # noqa: BLE001 - bounded cross-language diagnostic
        message = str(error).replace("\n", " ").replace("\r", " ")[:1_000]
        sys.stderr.write(f"ACL inspection failed: {message}\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
