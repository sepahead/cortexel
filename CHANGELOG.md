# Changelog

All notable changes to Cortexel are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `core` entrypoint (`cortexel/core`): dependency-free colormaps, palettes, GLSL
  strings, design-law types, `SCENE_NAMES`/`SceneName`, the Zod `VizSpec`
  contract, and the fail-closed provenance model.
- `react` entrypoint (`cortexel/react`): `usePopulationExpand`,
  `ExpandablePopulation`, and `VizSpecRenderer` (host-agnostic via an injected
  `renderScene` callback; no host-app dependency).
- `RenderSceneArgs.camera` so a spec's requested framing is passed through to the
  host renderer instead of being silently dropped.
- ARIA `role="note"` + `aria-live` on the honesty caption.
- `tsup` build emitting ESM + CJS + `.d.ts` for all three entrypoints.
- Vitest unit tests covering the VizSpec validator and the fail-closed honesty
  truth table.
- CI (typecheck + test + build) and open-source governance docs.

### Fixed
- `ExpandablePopulation`: removed a per-frame opacity write race (JSX `opacity`
  prop vs imperative `useFrame` write); the halo ring now honors
  `prefers-reduced-motion`; dark-theme ring brightness capped at a bloom-safe
  ×1.15.

### Notes
- `params` in `VizSpec` is intentionally opaque (not validated per-scene yet).
- A backend Pydantic mirror of the schema is recommended for server-side
  defense-in-depth but is the host's responsibility — Cortexel ships the
  client-side gate only.
