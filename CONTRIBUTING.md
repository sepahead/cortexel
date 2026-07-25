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
