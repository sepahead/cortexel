# Contributing to Cortexel

Thanks for your interest in Cortexel! This document covers how to develop, test,
and propose changes.

## Source of truth

Cortexel is developed inside the [Engram Neural Labs](https://github.com/sepahead/Paper2Brain)
monorepo at `frontend/app/cortexel/` and **mirrored** to this standalone
repository via `git subtree`. The monorepo directory is the canonical, writable
source; this repo is a downstream publish mirror.

- **Open PRs against the monorepo** for code changes. Maintainers sync them out.
- Issues and discussion are welcome here.

## Development

```bash
bun install        # or npm install / pnpm install
bun run typecheck  # tsc --noEmit
bun run test       # vitest
bun run build      # tsup → dist/ (ESM + CJS + d.ts)
bun run check      # typecheck + test
```

## Design laws (non-negotiable)

These keep visualizations scientifically honest and visually consistent:

1. **A single neuron is a sphere; a population is a glowing voxel cube.**
2. **Passive data uses unlit `MeshBasic` (no emissive).** Emissive > 1.0 is
   reserved for active spike/synapse *events*. Keep emissive bloom-safe (≤ ~1.15)
   so it glows without bleaching to white.
3. **Honesty fails closed.** Provenance flags default to the conservative value;
   the renderer shows a disclosure caption unless a spec explicitly asserts a
   calibrated, paper-local posterior. Never weaken this.
4. **`useFrame` is allocation-free.** Reuse refs/scratch objects; never allocate
   per frame.
5. **The library stays host-agnostic.** No imports from any host app; concrete
   scene components are injected via `renderScene`.

## Pull request checklist

- [ ] `bun run check` passes
- [ ] New behavior has a test
- [ ] Design laws upheld (esp. honesty + bloom safety)
- [ ] `CHANGELOG.md` updated under `Unreleased`

By contributing you agree your work is licensed under the project's MIT license.
