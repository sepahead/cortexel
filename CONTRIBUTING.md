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
  "$uv_path" pip install \
    --no-config --no-cache --python "$runtime/bin/python" --no-deps \
    --require-hashes --only-binary :all: \
    --no-index --find-links "$wheelhouse" \
    --requirements .github/requirements/python-package-build.txt

CORTEXEL_UV="$uv_path" \
CORTEXEL_BUILD_BACKEND_WHEELHOUSE="$wheelhouse" \
  "$runtime/bin/python" -I -S -B scripts/smoke-python-package.py
)
```

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
pip configuration authority. CI also
places a 300-second TERM/KILL bound around that network step; the smoke applies finite
bounds to every build, install, and executable probe.
This release-evidence procedure is currently supported on macOS and Linux; the pinned
CI realization runs on Ubuntu. It is not evidence for a Windows package-build boundary.

`bun run test:package` is the backwards-compatible local orchestration. Release
harnesses must keep the two phases explicit:

```bash
bun scripts/smoke-package.ts prepare \
  --workspace /absolute/persistent/workspace \
  --node-executable /absolute/reviewed/node \
  --npm-executable /absolute/reviewed/npm-cli.js

# Capture the canonical JSON. Inspect every path in `nodeModules`, retain
# `stateDigest`, deny network access, and mount/retain the workspace read-only.

bun scripts/smoke-package.ts execute \
  --workspace /absolute/persistent/workspace \
  --expected-state-digest sha256:PREPARE_OUTPUT_STATE_DIGEST \
  --node-executable /absolute/reviewed/node
```

The execute phase never installs or materializes files. It fails if the prepared
state, package artifact, lock-bound consumer trees, filesystem topology, modes, or
bytes changed across the inspection gap. Preparation makes the workspace
mode-read-only on POSIX; on every platform the release harness must mount or
otherwise retain it read-only. The in-process network/write guard is defense in
depth; the release harness remains responsible for OS-level network denial and
for inspecting all three reported `nodeModules` trees. A Windows `npm.cmd` path is
accepted when its adjacent `node_modules/npm/bin/npm-cli.js` can be resolved, but
the canonical prepared state records and invokes the JavaScript CLI through the
reviewed Node executable.

Before `npm ci`, prepare independently accepts only one canonical npm-portable
gzip member containing regular-file USTAR entries and exactly two end blocks.
It rejects PAX/GNU extensions, links, directories, devices, FIFOs, traversal,
semantic path collisions, nonzero padding and trailing data, then compares every
file's path, size, mode and SHA-256 digest with both npm's inventory and the
reviewed source closure. Bounds are 128 MiB compressed, 512 MiB inflated,
128 MiB per file, 10,000 archive entries, 99 bytes per `package/...` tar path,
20,000 source filesystem nodes, depth 32, and 10,000 children per directory.
After each install, the same closure is checked against every tar-owned file;
the nested `cortexel/node_modules` dependency graft remains lock- and seal-owned.

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
