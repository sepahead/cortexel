# Contributing to Cortexel

Thanks for your interest in Cortexel! This document covers how to develop, test,
and propose changes.

## Source of truth

This standalone repository is the canonical, writable source for Cortexel.
[Engram Neural Labs](https://github.com/sepahead/Paper2Brain) consumes Cortexel as a
pinned git dependency and may vendor generated contract artifacts for backend
validation; it does not own a writable Cortexel source copy.

- **Open Cortexel code PRs here.**
- During pre-1.0 development, downstream consumers adopt only reviewed Cortexel commits
  by their full 40-character SHA and update generated contract snapshots in a separate,
  reviewable change. A branch, tag, abbreviated SHA, or moving ref is not a dependency
  identity.

### Pre-1.0 downstream pin workflow

1. Finish and push the reviewed Cortexel commit, then record the exact output of
   `git rev-parse HEAD`; do not derive a pin from an uncommitted worktree.
2. Put that full 40-character SHA in the downstream git dependency. Do not substitute
   `main`, a release tag, or a short display prefix.
3. Regenerate any downstream contract/OpenAPI snapshots from that checkout in the same
   adoption change.
4. Verify the downstream lock/resolution metadata names the same full SHA, then run its
   complete integration gates. Record both the Cortexel SHA and the downstream commit in
   the adoption receipt.

The private `0.10.0-dev.0` metadata is a development safeguard, not a release. The
read-only `release:verify` command intentionally fails until a final version, public
package metadata, matching release records, an annotated tag on clean HEAD, and a real
artifact source-stamping producer all exist. It is not a normal pull-request success
criterion. Its Git subprocess boundary is exact, offline-lazy-fetch-disabled, bounded,
and guardian-supervised, but it still inspects the caller's local repository rather than
authenticating that repository's own config, `.git` indirection/object alternates, or
excluding hostile same-UID mutation.

## Development

The repository-level `bunfig.toml` disables Bun runtime `.env` loading, including in
nested scripts. It is not a filesystem sandbox: Bun's package manager, Vite, or another
dependency may still inspect files in the checkout. Keep credentials outside the
repository and the build/test environment; `.gitignore` is only an accidental-commit
control. A narrowly scoped first-party client may read its external credential store
explicitly.

```bash
bun install
bun run typecheck  # tsc --noEmit
bun run test       # vitest
bun run build      # tsup → dist/ (ESM + CJS + d.ts) + skills.manifest.json
bun run check      # generated parity + typecheck + test
bun run check:formal # compile every pinned Lean proof with warnings as errors
bun run check:ledger
bun run test:python
bun run check:python
bun run test:python-package
bun run audit
bun run lint:package
bun run test:package
```

The Python distribution smoke deliberately refuses an ambient interpreter or build
backend. The package itself supports Python 3.11+, but this reproducible build-evidence
gate deliberately requires a separate Python 3.14.x interpreter/runtime. Use the exact
`uv 0.11.16` binary and a fresh copied virtual environment;
do not add pip, setuptools, another distribution, a `.pth` file, or a site customization:

```bash
(
umask 022
package_python="$(command -v python3.14)"
package_python="$("$package_python" -I -S -B -c 'import pathlib, sys; print(pathlib.Path(sys.executable).resolve(strict=True))')"
temporary="$("$package_python" -I -S -B -c 'import pathlib, tempfile; print(pathlib.Path(tempfile.mkdtemp()).resolve(strict=True))')"
runtime="$temporary/cortexel-python-package-runtime"
"$package_python" -m venv --copies --without-pip "$runtime"
uv_path="$("$package_python" -c 'import pathlib, shutil; print(pathlib.Path(shutil.which("uv")).resolve(strict=True))')"
mkdir -p "$runtime/bootstrap-home" "$runtime/bootstrap-tmp"
wheelhouse="$runtime/backend-wheelhouse"

env -i \
  HOME="$runtime/bootstrap-home" \
  PATH="$(dirname "$runtime/bin/python"):/usr/bin:/bin" \
  TMPDIR="$runtime/bootstrap-tmp" \
  "$runtime/bin/python" -I -S -B scripts/smoke-python-package.py \
    bootstrap-backend-wheelhouse "$wheelhouse"

env -i \
  HOME="$runtime/bootstrap-home" \
  PATH="$(dirname "$uv_path"):$(dirname "$runtime/bin/python"):/usr/bin:/bin" \
  TMPDIR="$runtime/bootstrap-tmp" \
  UV_NO_CONFIG=1 \
  UV_NO_SYSTEM_CONFIG=1 \
  UV_NO_ENV_FILE=1 \
  UV_PYTHON_DOWNLOADS=never \
  UV_OFFLINE=1 \
  UV_LINK_MODE=copy \
  "$uv_path" pip install \
    --no-config --no-cache --python "$runtime/bin/python" --no-deps \
    --link-mode copy \
    --require-hashes --only-binary :all: \
    --no-index --find-links "$wheelhouse" \
    --requirements .github/requirements/python-package-build.txt

CORTEXEL_UV="$uv_path" \
CORTEXEL_BUILD_BACKEND_WHEELHOUSE="$wheelhouse" \
  "$runtime/bin/python" -I -S -B scripts/smoke-python-package.py
)
```

The no-argument form above keeps the human-readable developer behavior. For a
release run, stay inside that same subshell and replace its final no-argument call
with the block below. The result scratch is a sibling of—not inside—the reviewed
runtime, retained wheelhouse, uv directory, or Cortexel source authority; the
result leaf must be a canonical absolute path that does not yet exist:

```bash
protected_scratch="$temporary/cortexel-python-package-results"
mkdir -m 0700 "$protected_scratch"
result="$protected_scratch/cortexel-python-package-result.json"
CORTEXEL_UV="$uv_path" \
CORTEXEL_BUILD_BACKEND_WHEELHOUSE="$wheelhouse" \
  "$runtime/bin/python" -I -S -B scripts/smoke-python-package.py \
    verify --result-file "$result"
```

`cortexel-python-package-smoke-result.v1` is canonical duplicate-free JSON with one
terminal LF and the exact top-level keys `artifacts`, `backendWheelhouse`,
`contract`, `packageVersion`, `python`, `resources`, `sourceAuthority`, `status`,
and `uv`. Every digest is `sha256:` followed by 64 lowercase hexadecimal digits.
The receipt binds the final stable wheel/sdist filename, size, and digest; the
canonical reviewed Python/base-Python and uv paths plus executable bytes; exact uv
version; the canonical retained wheelhouse path, exact-five inventory, sizes,
digests, and inventory seal; package version; the v1-exact 21-resource and
19-skill-schema counts; and a domain-separated digest of the complete Python
build-input/source authority and backend requirements lock. It is created with
exclusive/no-follow semantics, exact 0644 mode, file and parent-directory `fsync`,
and a stable readback only after the clean install, final artifact comparison,
source reinspection, backend reinspection, and temporary-workspace cleanup have all
succeeded. The gate rejects a result path overlapping any attested authority, binds
the runtime executables before and after active work, then repeats runtime,
wheelhouse, source, receipt, and result-parent checks after the durable write. It
also rejects discretionary filesystem ACLs on the protected parent or receipt;
exact 0700/0644 mode bits are not accepted as a substitute for that authority
check. The independent strict reader repeats that authority boundary: it opens the
canonical 0700 parent first, pins its descriptor identity, opens the unique 0644 leaf
relative to that descriptor without following links, and rechecks path, descriptor,
owner, mode, link count, ACL, and identity before and after parsing. A parent rebind or
leaf replacement therefore invalidates the receipt rather than blessing whichever path
entry won a race. A pre-existing result is never overwritten. Treat a nonzero process
exit, missing receipt, or receipt rejected by this duplicate-aware strict reader as
failure; never recover evidence from stdout.

The two aggregate seals use the script's `inventory_sha256` encoding: SHA-256 over
the ASCII domain prefix `cortexel-named-byte-inventory-v1\0`, then the namespace's
unsigned 64-bit big-endian byte length and ASCII bytes, followed by each
lexicographically sorted entry's unsigned 64-bit big-endian UTF-8 name length, name
bytes, unsigned 64-bit big-endian payload length, and payload bytes. The source seal
names the root `LICENSE`, every exact `python/` build-input path, and the backend
requirements lock. The wheelhouse seal applies the same encoding to one
`value.json` entry containing the canonical inventory-array JSON plus its LF. This
definition is part of result contract v1; changing it requires a new contract id.

Run the complete block in that one subshell. The explicit `umask 022` is part of the
evidence protocol: it deterministically creates the reviewed 0644 backend files and
0755 directories even when the parent shell uses a restrictive umask. The smoke checks
the ambient value before doing work and fails with provisioning guidance if it differs.
The explicit wheelhouse download is the only network-eligible step. Each retained URL,
filename, distribution identity, version, and SHA-256 digest is fixed by the smoke. The
backend install is offline, and the smoke compares every installed backend byte and the
complete file/directory inventory to those independently parsed wheels; a consistently
rewritten installed `RECORD` is not a root of trust. It then uses a new empty uv cache,
removes the ambient `PATH`, disables bytecode writes, and performs both builds and the
clean-wheel install without dependency resolution or interpreter downloads. Top-level
`-S` prevents `.pth` and `sitecustomize.py` execution before the wheel-rooted closure is
inspected; only the subsequently launched, already-validated backend process enables
the closed site-packages tree. `bun run test:python-package` invokes the same
`-I -S -B` entry point and therefore expects `python`, `CORTEXEL_UV`, and
`CORTEXEL_BUILD_BACKEND_WHEELHOUSE` to name that separate, already-provisioned Python
3.14 runtime, exact uv executable, and retained exact-five-wheel evidence. Do not point
this authority at Engram's ordinary developer/test Python (which legitimately contains
pytest, mypy, and ruff); give the integration a distinct package-build runtime.
The bootstrap's empty environment intentionally drops ambient index, proxy, token, and
pip configuration authority. The Python 3.14.6 CI lane first validates the exact
setup-provided Python and uv paths, then root-owns their complete version roots and the
relevant `/opt` ancestor chain, removes extended/default ACLs and group/world writes,
and independently checks the resulting ownership, modes, ACL absence, containment, and
entry types. This closes the hosted image's deliberately permissive `/opt` mutation
authority; it still trusts the pinned setup actions and runner payload, and the receipt
does not inventory the complete stdlib or `libpython` closure. CI also places a
300-second TERM/KILL bound around the network step; the smoke applies finite bounds to
every build, install, and executable probe.
This release-evidence procedure is currently supported on macOS and Linux; the pinned
CI realization runs on Ubuntu. It is not evidence for a Windows package-build boundary.
Result mode additionally requires a filesystem whose path and open-descriptor ACL APIs
are authoritative: `ENOTSUP`/`EOPNOTSUPP` fails closed. Cortexel does not yet classify
network or stacked filesystems, so release evidence must keep the result parent on a
locally administered filesystem with trustworthy ACL semantics.

Every build, install, and runtime probe launched by this Python gate uses a private
POSIX session/process group behind a live guardian. The supervisor passes the exact
target request through an unlinked, byte-bounded descriptor and owns the only write end
of a close-only control lease. The guardian is the new session/process-group leader and
forks a non-leader worker; that worker, not the guardian, is the target's immediate
parent. A target that kills its immediate parent therefore does not release the group
number used for cleanup. Before target launch the worker restores the default
`INT`/`TERM`/`HUP` dispositions and explicitly unblocks those signals; blocking them in
the supervisor is a cleanup mechanism, not a silent change to target signal semantics.

Target completion, worker failure, timeout, output overflow, and deferred
`INT`/`TERM`/`HUP` all converge on the guardian. It first publishes one canonical,
nonce-bound status frame and then makes the sole group signal from inside the still-live
leader with its self-derived process-group identity. The supervisor has no numeric PID
or PGID signal/probe path. Stdout and stderr are always piped. Before an operation or
cleanup error is latched, observed bytes share one fixed budget; after that point the
supervisor drains and discards until EOF or the cleanup deadline rather than claiming a
whole-throughput count. `capture_output` controls retention only. The supervisor closes
every parent-owned launch/output descriptor exactly once. A close exception is an
ambiguous one-way boundary: the descriptor may still be live or its number may already
have been reused. The smoke worker therefore immediately fail-stops with `_exit(70)` so
kernel process teardown closes every capability; it never retries the descriptor or
pretends it can recover in-process. On the ordinary path, only after pipe EOF or the
cleanup deadline does the supervisor disarm the `Popen` destructor and cross one raw
`waitpid` boundary. Acceptance requires both the exact status frame and guardian
termination by `SIGKILL`; an external reap, malformed or absent status, unexpected
guardian exit, or wait failure fails closed. The boundary requires default `SIGCHLD`
authority, exactly one Python/kernel-visible thread, no active trace/profile callback,
and no callable Python signal handler outside the handled cancellation set before
launch. The supervisor temporarily blocks `SIGCHLD` plus `INT`/`TERM`/`HUP`, restores
the caller's exact mask afterward, and the worker restores and unblocks the target's
cancellation signals before execution. No signal, process query, or second wait follows
the raw reap. Result evidence binds the exact
CPython patch version, paths, and executable bytes; CI currently pins CPython 3.14.6.
The current implementation requires POSIX `fork`, `poll`, process groups, sessions, and
signal masks on macOS or Linux; other hosts fail closed.

This boundary covers descendants only while they remain in that group and retain the
guardian's signal authority. It is not a hostile process sandbox. A same-UID target can
discover and kill the guardian, deliberately detach or regroup, retain an inherited
pipe, change credentials or security labels, or signal the supervisor; any of those can
defeat cleanup or its evidence. Abrupt owner death, hostile same-process descriptor or
reaper interference, kernel/OS failure, and Windows likewise remain outside the claim.
Lease EOF provides a cleanup path for ordinary supervisor loss, but it is not an
owner-death guarantee and cannot help if another process retained the lease descriptor.
Likewise, a target can stop the complete group, including the guardian; a stopped
guardian cannot consume lease EOF, and the final blocking wait is not a hostile hard
deadline. The status frame plus observed `SIGKILL` is not a kernel receipt that the
guardian delivered that signal: a same-UID target can kill it after the frame and before
the self-sweep.
Use a cgroup, VM, or an equivalently strong platform lifetime primitive when those
capabilities are in scope.

`bun run test:package` is the backwards-compatible local orchestration. The
reviewed command supervisor currently requires POSIX process-group semantics and
therefore fails closed on Windows; a Windows boundary needs a separately reviewed
Job Object/process-tree implementation. Release harnesses on macOS or Linux must
keep the two phases explicit:

The original canonical Node path is source/provenance authority, not direct execution
authority. Prepare and execute each descriptor-acquire its exact reviewed bytes into
one current-UID mode-`0700`, operation-scoped private runtime. The source and staged
SHA-256 values must equal the prepared source-file digest, and both authorities are
revalidated around every command. The staged Node is both the exact launcher/control
runtime and the exact reviewed target executable; the source pathname is never selected
as an executable at that boundary. The synchronous operation disposes its private
runtime on success or failure before returning.

Ordinary Node/npm version, pack, TypeScript, CLI, and import probes each retain an
exact 300,000 ms command bound. Only the three sequential cold-cache `npm ci`
materializations use the shared reviewed-POSIX maximum of 900,000 ms, under the
closed labels `prepare.npm-ci.core`, `prepare.npm-ci.charts`, and
`prepare.npm-ci.full`. These are per-command availability bounds, not an aggregate
prepare deadline or a hostile hard deadline; there is no retry or environment/CLI
override. Timeout and overflow diagnostics disclose only the fixed operation label
and numeric bound, never argv, cwd, environment, executable pathname, or child output.

The outer synchronous caller starts that exact staged launcher with a fresh closed
environment. The launcher starts a supervisor, which creates a detached guardian as
the live leader of a new POSIX session/process group; the guardian creates a gated
non-leader worker, and only the worker may start the reviewed target. The outer caller
receives a boolean
`guardianArmed` handshake, never a PID or PGID. Target loader/runtime variables are
carried as bounded JSON and installed only for the target, so they cannot preload
the supervisor, guardian, or worker.

The launcher creates a dedicated FIFO/socket pair, immediately installs and activates
the parent-side drain, and only then sends one exact `ARM` frame over the separate
launcher lease. The supervisor cannot create the guardian, publish the public armed
handshake, or send `GO` before that frame. Because the two socket/pipe peers need not
have the same inode identity, authority begins at the supervisor's inherited child
endpoint: it derives signed-decimal `dev`/`ino`/`mode`/`nlink`/`uid`/`gid`/`rdev` plus
endpoint kind, binds that value into the guardian payload, retains it through the
guardian's canonical READY echo, rechecks it, and closes its copy exactly once. The
guardian proves that same child-endpoint identity before it can spawn the worker and
never passes the descriptor to the worker or target. A numeric fd reused by Node for an
unrelated internal pipe therefore cannot satisfy the lifetime gate.

The supervisor is the sole writer of the guardian's control lease. A worker target
completion or guardian-local worker/protocol failure makes the guardian sweep
directly. Timeout, output overflow, handled `TERM`/`INT`/`HUP`, or supervisor death
closes the lease, whose EOF makes the guardian take the same path. The still-live
guardian first writes one bounded sweep-intent frame and then makes the sole
explicit production process-group signaling call:
`process.kill(-process.pid, "SIGKILL")`. Its own unreaped leader identity pins that
group number at the call. A non-leader worker remains the target's immediate parent,
so killing the immediate parent does not remove the group anchor.

The supervisor observes the guardian's exit exactly once, performs no signal or
identity probe after that reap, and separately gives stdout, stderr, and the private
status pipe a bounded interval to reach EOF. It accepts a result only after one
canonical intent, guardian termination by `SIGKILL`, complete protocol framing, and
clean pipe EOF. A retained output pipe instead produces a bounded failure. Separately,
the still-live exact launcher actively drains the zero-data lifetime pipe and withholds
all buffered supervisor protocol until both real peer `end` and supervisor `close` have
occurred; a lifetime byte or local stream error fails closed and is never promoted to
EOF. This join does not depend on Bun waiting for a descendant-held stdout pipe. The
outer caller has no numeric fallback on either success or failure. `EPERM`, `ESRCH`, direct
guardian death, malformed protocol, or uncertain cleanup therefore fail closed
without signaling a potentially reused PID/PGID.

Every POSIX host-side read that expects a regular file now opens the reviewed path
with both `O_NOFOLLOW` and `O_NONBLOCK`, then proves regular-file type and the prior
identity by descriptor before reading. Exchanging the path for a FIFO between
`lstat` and `open` therefore fails closed instead of turning an authority check into
an unbounded blocking open. Directory synchronization uses the corresponding
nonblocking, no-follow, directory-only open profile.
The POSIX ACL helper is also a reviewed input: Cortexel opens its regular source with
the no-follow/nonblocking profile under a 64-KiB ceiling, requires its pinned SHA-256,
executes that exact copied byte sequence through isolated `/usr/bin/python3` stdin,
and repeats path, descriptor, byte, and digest checks after every invocation. The
helper admits only enumerable `kind`, `label`, and `value` subject fields; inert
non-enumerable or symbol metadata is neither enumerated nor propagated, while an
enumerable extra fails within the three-field projection bound.

This is bounded same-authority group cleanup, not hostile containment. A same-UID
target can discover or signal the guardian; a target can create another session or
process group, retain inherited pipes, or change credentials/security labels so the
guardian's sweep no longer reaches it. Killing the guardian before its self-sweep
also removes the only in-process cleanup authority. A target can also stop the whole
group. `SIGSTOP` cannot be handled: a stopped guardian cannot consume lease EOF, and
the dedicated lifetime descriptor keeps the launcher joined until the synchronous
caller's outer timeout kills that launcher. `SIGKILL`, OOM termination, or that hard
timeout can remove the launcher itself; Bun may then return before asynchronous guardian
cleanup, because descendant-held stdout is not a reliable join on Linux. Those are
cooperative bounds, not hostile hard deadlines or owner-death containment. Use an
external cgroup, sandbox, VM, or equivalent lifetime primitive when those capabilities
are in scope.

```bash
bun scripts/smoke-package.ts prepare \
  --workspace /absolute/persistent/workspace \
  --node-executable /absolute/reviewed/node \
  --npm-executable /absolute/reviewed/npm-cli.js

# Capture the canonical `cortexel-package-smoke-phase.v2` JSON. Inspect every
# path in `nodeModules`, retain `stateDigest`, deny network access, and
# mount/retain the workspace read-only.

bun scripts/smoke-package.ts execute \
  --workspace /absolute/persistent/workspace \
  --expected-state-digest sha256:PREPARE_OUTPUT_STATE_DIGEST \
  --node-executable /absolute/reviewed/node
```

`cortexel-package-smoke-phase.v2` is a canonical, status-discriminated transport
envelope: `prepared`/`passed` is written to stdout on exit 0, while `failed` is
written to stderr on exit 1 with the closed `PACKAGE_SMOKE_FAILED` shape. It is not
a durable cleanup or release receipt. In particular, it does not embed the
internal reviewed-command v4 guardian records, a digest of every reviewed command result, or
the complete harness-source/dependency identity. A release system may retain and
hash the success envelope as one input, but must also bind the exact Cortexel
commit/harness bytes, process exit, logs, inspected workspace, and external
containment evidence required by its threat model. Consumers must branch on
`status`; they must not parse a failure record as the success shape.

The execute phase never installs or materializes files. It fails if the prepared
state, package artifact, lock-bound consumer trees, filesystem topology, modes, or
bytes changed across the inspection gap. Preparation makes the workspace
mode-read-only; the release harness must additionally mount or otherwise retain it
read-only. The in-process network/write guard is defense in depth; the release
harness remains responsible for OS-level network denial and for inspecting all
three reported `nodeModules` trees. Every executable JavaScript entry point is invoked
through the operation-scoped staged copy of the exact reviewed Node bytes;
package-local shebang shims are validated but never trusted for runtime selection.

The v2 prepared state is `cortexel-package-smoke-prepared.v2` in
`package-smoke-state.v2.json`. Its `runtimeAuthority` binds the canonical source Node
executable's stable bytes, metadata, and path ancestry and the canonical npm 10 or
11 package root's exact manifest/CLI identity plus a bounded recursive seal of
every directory, ordinary file, and permitted internal direct-file symlink. It does
not retain an ephemeral staged pathname, staged acquisition record, or execution-time
runtime root. A staged acquisition copies the executable and only the bounded, known
Homebrew-relative `libnode.<number>.dylib` companions required by supported layouts;
that inventory is not a closed dynamic-library dependency graph. This scope is
deliberately named `node-executable-and-npm-package-tree.v1`: neither prepared state
nor staging claims to close Node's dynamic libraries, operating-system services, or
the TypeScript harness runtime. A release harness must authenticate those external
authorities independently. The workspace seal binds the finalized root's physical
identity and exact `0555` mode, every controlling parent-directory identity, and
all non-state contents; the caller-supplied state digest separately binds the
excluded state file. Prepare exclusively reserves that leaf before sealing, then
publishes canonical bytes through the retained descriptor with exact mode,
descriptor/path identity, stable readback, and file/directory synchronization.
Execute also retains the first inspected state-file authority and revalidates its
digest, identity, workspace ownership, and exact `0444` mode after active work.
These are change detectors, not hostile same-UID containment.

Before `npm ci`, prepare independently accepts only one canonical npm-portable
gzip member containing regular-file USTAR entries and exactly two end blocks.
It rejects PAX/GNU extensions, links, directories, devices, FIFOs, traversal,
semantic path collisions, nonzero padding and trailing data, then compares every
file's path, size, mode and SHA-256 digest with both npm's inventory and the
reviewed source closure. Bounds are 128 MiB compressed, 512 MiB inflated,
128 MiB per file, 10,000 archive entries, 99 bytes per `package/...` tar path,
20,000 source filesystem nodes, depth 32, and 10,000 children per directory.
After each install, the same closure is checked against every tar-owned file;
the exact omit-filtered prepared lock additionally derives every installed package
container, scope membership, package name/version, `.bin` inventory and target,
and the complete top-level hidden lock across every nested package path. A bounded
whole-tree walk
rejects concealed `node_modules`, `.bin`, or `.package-lock.json` management paths.
npm 10 may retain only the exact empty scope directories implied by omitted scoped
lock siblings; npm 11 must not retain them. The workspace seal independently binds
all remaining registry-package bytes and topology across the inspection gap.

## Design laws (non-negotiable)

These keep visualizations scientifically honest and visually consistent:

1. **A single neuron is a sphere; a population is a glowing voxel cube.**
2. **Passive data uses unlit `MeshBasic` (no emissive).** Emissive > 1.0 is
   reserved for active spike/synapse *events*. Keep emissive bloom-safe (≤ ~1.15)
   so it glows without bleaching to white.
3. **Honesty fails closed.** Provenance flags default to the conservative value;
   every currently accepted spec carries a disclosure because calibrated
   posteriors are unsupported. `calibrated_posterior:true` is rejected by every
   public gate; never add a path that suppresses, replaces, or visually reorders
   the mandatory caption. Caller notes remain explicitly unverified.
   Scene-less skills use the strict host-renderer envelope and its returned caption;
   params-only validation is not an honesty boundary.
4. **First-party frame callbacks reuse state.** Reuse refs/scratch objects, use
   indexed loops, and do not set React state from `useFrame`. The source guard is
   lexical and proves only that Cortexel-authored callback syntax contains no reviewed
   direct allocation pattern; it cannot prove allocation-free callees. In particular,
   the exactly installed `d3-force-3d` 3.0.6 allocates octrees during force ticks.
5. **The library stays host-agnostic; the host owns the frame.** No imports from
   any host app. Concrete scene components are injected via `renderScene`, and
   scene primitives are Canvas-less — the host owns `<Canvas>`, OrbitControls,
   bloom, background and fog; the library renders only scene *contents*.

## Pull request checklist

- [ ] `bun run check` passes
- [ ] `bun run check:formal` passes
- [ ] New behavior has a test
- [ ] Design laws upheld (esp. honesty + bloom safety)
- [ ] Strict params/envelope and language-neutral manifest remain in parity
- [ ] `dist/` rebuilt and clean-room package smoke passes
- [ ] `CHANGELOG.md` updated under `Unreleased`

By contributing you agree your work is licensed under the project's MIT license.
