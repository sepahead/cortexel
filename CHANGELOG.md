# Changelog

All notable changes to Cortexel are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] — ExpandableNeurons

### Added
- `ExpandableNeurons` (`cortexel/react`) — the companion to ExpandablePopulation:
  a population voxel hub collapses and this reveals its constituent neurons as
  ray-cast sphere points, clustered at the hub centre and blooming to a 3D grid
  on expand. Single neuron = sphere (design law); allocation-free useFrame.
- `neuronLocalGrid(count, spacing)` / `neuronExpandedScale(expansion)` /
  `NEURON_CLUSTER_SCALE` — the shared grid layout + morph math so an owning scene
  can place synapses on the exact same neuron positions without duplicating it.
- Point-neuron shaders (`NEURON_VERT` / `NEURON_FRAG`) ported to TS strings (no
  Vite `?raw`), so the renderer builds under tsup and is host-portable.

## [0.3.0] — Agent ergonomics & verification

### Added
- `describeSkill(id)` / `describeSkills()` — self-describing discovery: scene,
  required params/provenance, renderer routes, weak flag, and a copyable example
  payload, so an agent never reads TS source to invoke a skill.
- `SKILL_EXAMPLE_PAYLOADS` / `getExamplePayload(id)` — one valid VizSpec per
  renderable skill (synthetic provenance). Asserted to pass their own gate, so
  they are living fixtures, and attached to `invalid_params` / `missing_provenance`
  / `scene_mismatch` errors for one-shot agent self-repair.
- `detectEmptyScene(SceneData)` — cheap "valid but blank" check (Vega-Lite
  scene-graph emptiness, adapted) so an agent can verify a render carries data
  without rendering pixels.
- `splitMultimeterBySender(events)` — splits a flattened multi-sender multimeter
  dump into one monotonic series per sender (the honest alternative to rejecting).
- Per-skill provenance snapshot test, design-law executable guards (allocation-
  free useFrame, bloom-safe emissive ≤1.15, unlit populations), and a published
  `.d.ts` Node-type leak scan.

## [0.2.0] — Agent skill axis

### Added
- **Skill axis (`cortexel/core` skills/):** Cortexel is now the authoring source
  of the agent-invocable NEST visualization skills, not just the render targets.
  - `NEST_SKILL_REGISTRY` (`listSkills()`/`getSkill()`): the 13 `nest.*`
    skills, each mapping a NEST device family → a Cortexel scene (or `null` when
    no honest scene exists yet), with required params, structured provenance
    keys, renderer routes, and a worked example.
  - `validateSkillInvocation(skillId, payload)`: the strict, skill-aware agent
    entrypoint. Enforces per-skill param schemas (closing the opaque-`params`
    hole), required `declared_inputs` provenance keys, scene/contract match, and
    rejects `calibrated_posterior=true` as unsupported (mirrors the 501
    boundary). Returns the resolved honesty caption so the renderer can't drop it.
  - `routeToScene(...)`: the executable `viz_router` — picks a skill/scene from a
    NEST device family (`dataShape.kind` disambiguates `spike_recorder`), fail-
    closed for unknown families and scene-less skills.
  - Host-agnostic `core/nest` adapters (`spikeRecorderToSceneData`,
    `multimeterToSceneData`, `getConnectionsToSceneData`, `getPositionToSceneData`,
    `weightRecorderToSceneData`) + zod device-dict shapes with axis invariants.
  - `SceneData.weightSeries` so plasticity weights are never mislabeled as voltage.
  - `provenance.declared_inputs` + `synthetic` flag (forces the schematic caption).
- **`dist/skills.manifest.json`** — language-neutral artifact non-TS hosts (a
  host Python backend) consume and parity-check against; emitted at build,
  guarded byte-identical by a Vitest test.
- `VizSpecRenderer` `skillId` prop routes through the strict gate and binds the
  honesty caption at the render boundary.
- Pure-Node import guard test: `cortexel/core` (incl. the skill axis) stays
  zero-dep beyond zod — no three/react/@react-three leakage.

## [0.1.0]

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
