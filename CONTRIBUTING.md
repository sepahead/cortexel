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
criterion.

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
POSIX session/process group. The reviewed lifecycle requires a dedicated CPython
3.14.x host on macOS or Linux, default `SIGCHLD`, one kernel-visible host thread,
and `waitid(..., WNOWAIT)`. Result evidence binds the exact patch version, paths,
and executable bytes; CI currently pins CPython 3.14.6. Linux additionally requires
readable `/proc/self/task`; Darwin requires the supported `/usr/lib/libproc.dylib`
`proc_taskinfo` ABI. Missing WNOWAIT, signal-mask, or kernel thread authority fails
closed. Kqueue process registration/readiness is never child-ownership evidence;
Darwin may still use a kqueue-backed selector only for pipe descriptors. The gate
drains captured output under fixed bounds, makes one
`killpg(SIGKILL)` attempt while the direct leader is still unreaped, re-proves child
ownership before any direct-PID fallback, performs a bounded pipe drain, and only then
reaps. If a pre-signal, fallback, exit-confirmation, or final pre-reap observation
reports lost ownership, or cannot ultimately prove current ownership, the gate performs
no later numeric signal or `Popen.wait()` on that identity.
Once final reaping starts, retries are reap-only. `INT`, `TERM`, and `HUP` are deferred
until cleanup finishes; they are not forwarded to the reviewed command.

This boundary covers descendants only while they remain in that group and retain the
caller's signal authority. It is not a hostile process sandbox and does not contain a
descendant that deliberately changes session/group or signaling authority. It also does
not claim safety against hostile same-process native reapers or unrelated signal
handlers racing the final proof, uncatchable owner death, kernel/OS failure, or Windows.
Same-UID descendants can also signal the owner, and a signal outside the deferred
`INT`/`TERM`/`HUP` set can terminate it. Windows and every other host without the
reviewed wait/thread primitives fail closed.
Use a cgroup, VM, or an equivalently strong platform lifetime primitive when those
capabilities are in scope.

`bun run test:package` is the backwards-compatible local orchestration. The
reviewed command supervisor currently requires POSIX process-group semantics and
therefore fails closed on Windows; a Windows boundary needs a separately reviewed
Job Object/process-tree implementation. Release harnesses on macOS or Linux must
keep the two phases explicit:

The supervisor starts a trusted gated wrapper in a new process group. It publishes
the group identifier before the wrapper can start reviewed code. On ordinary target
completion, the still-live wrapper publishes a canonical result over a private pipe
and then sends `SIGKILL` to its own group while its leader identity still pins the
PGID. Timeout, output overflow, and handled `TERM`, `INT`, or `HUP` cancellation are
likewise signaled only while the supervisor still observes that direct leader as
live. No layer probes or signals the PGID after the wrapper leader has been reaped:
POSIX exposes no portable closure receipt for a now-reusable process-group number.
These anchored sweeps cover group members that retain the caller's signal authority;
`EPERM` means that authority was lost and the evidence fails closed.

If the supervisor fails after publication while the outer caller survives and the
wrapper may have started reviewed code, the caller attempts one abnormal-only
terminal sweep and rejects the command. That fallback necessarily addresses a
numeric PGID and retains a residual reuse race. The boundary does not prevent a
same-UID process from signaling its parents, deliberately creating another session
or process group, or changing credentials or a security label so group cleanup no
longer reaches it.
Simultaneous uncatchable death of both the outer caller and supervisor can also
leave the detached group without a sweeper. Use an external OS sandbox/cgroup (or
equivalent process-lifetime authority) when the release threat model includes
those capabilities.

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

The execute phase never installs or materializes files. It fails if the prepared
state, package artifact, lock-bound consumer trees, filesystem topology, modes, or
bytes changed across the inspection gap. Preparation makes the workspace
mode-read-only; the release harness must additionally mount or otherwise retain it
read-only. The in-process network/write guard is defense in depth; the release
harness remains responsible for OS-level network denial and for inspecting all
three reported `nodeModules` trees. Every executable JavaScript entry point is
invoked through the exact reviewed Node path; package-local shebang shims are
validated but never trusted for runtime selection.

The v2 prepared state is `cortexel-package-smoke-prepared.v2` in
`package-smoke-state.v2.json`. Its `runtimeAuthority` binds the canonical Node
executable's stable bytes, metadata, and path ancestry and the canonical npm 10 or
11 package root's exact manifest/CLI identity plus a bounded recursive seal of
every directory, ordinary file, and permitted internal direct-file symlink. This
scope is deliberately named `node-executable-and-npm-package-tree.v1`: it does not
claim to close Node's dynamic libraries, operating-system services, or the
TypeScript harness runtime. A release harness must authenticate those external
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
4. **`useFrame` is allocation-free.** Reuse refs/scratch objects; never allocate
   per frame.
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
