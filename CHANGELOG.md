# Changelog

All notable changes to Cortexel are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Repository-wide contract, renderer, and release hardening for agent-authored
visualizations. The skill-axis contract version is now `1.2.0`; callers should
regenerate cached descriptors/manifests before adopting this release.

### Security

- All public validation/routing entrypoints now fail closed on hostile runtime
  values instead of throwing. Registries use prototype-safe lookup, returned
  descriptors/examples are immutable copies, envelopes are strict objects, and
  `params` must be bounded literal JSON (no cycles, sparse/decorated arrays,
  accessors, symbols, raw-JSON/`toJSON` shape changes, class instances, `BigInt`,
  `undefined`, functions, unstable numbers, or pathological nesting).
- Provenance overrides can no longer replace the authoring source, declared inputs,
  or calibrated-posterior boundary. All present known provenance values receive
  semantic checks, unknown claims fail, params↔provenance contradictions fail,
  `advisory_only` defaults to `true`, and unsupported/mismatched contract versions
  receive structured errors. Free-text captions are sanitized and labeled
  `Caller note (unverified)` rather than blending into the mandatory disclosure.
- Added practical and aggregate limits across device dumps, inline skill arrays,
  adapter object/fan-out output, split series, knowledge-graph size, diagnostics,
  strings, edit-distance repairs, and palette registration. Oversized arrays are
  descriptor-preflighted before clone/schema amplification. Dependency audit is
  clean and runs in CI. Browser-bound skill arrays cap at 50,000 samples; raw NEST
  adapters retain a separate 100,000-sample ingestion ceiling.
- Removed Drei/Troika from the runtime graph. The knowledge-graph focus label uses a
  local canvas texture, preventing implicit CDN font or blob-worker activity.
- `formatInvocationErrors` now emits deterministic structured JSON marked as
  untrusted data; control/bidi characters and prompt-shaped ids cannot escape into
  instruction-looking repair lines.
- `VizSpecRenderer` is strict/self-describing by default; deleting `spec.skill`
  cannot downgrade validation. The envelope-only path requires explicit
  `trustedEnvelope`, and unchanged spec identities reuse a detached validated
  snapshot instead of synchronously revalidating large arrays on every parent render.

### Fixed

- Per-skill schemas now enforce paired-axis lengths, monotonic time axes, finite and
  non-negative domains where required, integer ids, non-empty phase-plane axes, and
  graph identity/reference invariants. Every one of the 14 skills, including the
  five host-rendered skills, has a real params schema.
- Spatial skills now require coordinate units; phase planes require per-axis and
  derivative units plus derivation/model/fixed-parameter context; correlograms bind
  normalization to y-axis units and a conditional numeric domain; Ca²⁺ traces are
  non-negative; synaptic delays are strictly positive. Connectivity-only topology
  and force-layout graph geometry carry explicit schematic-layout disclosures.
- NEST adapters preserve timestamps as `Float64Array`, reject values that would
  overflow `Float32Array`, stop guessing unlabeled analog traces are voltage, reject
  ambiguous multi-sender/multi-synapse inputs, validate connection/position indices,
  and expose honest split helpers for multimeter senders and weight-recorder synapses.
  Connectivity no longer invents ring coordinates or default weights; unit labels,
  global position ids, delays, and unpositioned/provided layout status survive.
  Negative-zero identities and non-positive delays fail consistently.
- `ExpandableNeurons` allocates exactly the requested count, keeps picking aligned
  with its shader transform, disposes GPU resources, bounds inputs, fixes hidden-point
  clipping and reversed smoothing, and uses frame-rate-independent damping. Procedural
  sine-wave “spikes” were removed: activity is explicit caller data and defaults static.
  Noninteractive clouds register no pointer handlers, interactive linear picking has
  a lower safety cap, and population geometry rejects poisoned/unbounded coordinates.
- `KnowledgeGraph3DScene` no longer mutates the host camera unless explicitly opted
  into `autoFrame`/selection fly-to, avoids per-frame allocations and wall-clock
  animation, advances force layout on a capped fixed-60-Hz clock, handles demand
  rendering and reduced motion, scopes pointer state to the canvas, disposes resources,
  and uses collision-resistant content signatures. Direct scene/A11y entrypoints share
  the strict graph-size ceiling, and reduced motion does not re-upload static particles.
  Directed relationships now retain arrowheads in reduced motion and still exports.
- `VizSpecRenderer` reports validation errors after commit rather than during render,
  exposes structured invocation errors, and never treats an explicitly blank skill as
  permission to bypass the strict gate.
- `detectEmptyScene` is a no-throw valid/empty/invalid guard that checks typed channel
  contents, parallel lengths, measurement units, network identity/layout semantics,
  and edge references; hostile or malformed input is never conflated with a legitimately
  blank scene. Accessible graph nodes and relationship detail are independently
  paginated, server rendering starts on the selected node's page, and visual/DOM search
  share one label-or-kind matcher.

### Added

- `validateSkillParams(skillId, params)` provides a low-level structural check for
  every skill without inventing a scene.
- `buildHostRendererInvocation`, `validateHostRendererInvocation`, and
  `validateHostRendererSpec` give every `scene:null` skill the same params,
  provenance, version, route-membership, repair-example, serialization, and caption
  guarantees as a VizSpec.
- Machine-readable `paramConstraints` accompany JSON Schema in discovery and the
  version-4 skills manifest. It now covers every skill and publishes envelope schemas,
  defaults/normalization order, exact-JSON limits + duplicate-member precondition,
  binary64 and UTF-16 semantics, strict invocation/provenance/palette policies,
  caption derivation, versioned params/provenance constraint languages, and complete
  examples at `cortexel/skills.manifest.json`.
- `KnowledgeGraphA11yList`, a keyboard- and screen-reader-accessible DOM mirror with
  paginated nodes, node kinds, and separately paginated directed relationship detail
  for the WebGL graph.
- `PopulationA11yList` and the paginated `NeuronA11yPager` provide operable DOM
  companions for pointer-driven population and neuron WebGL primitives.
- README visual workflow and agent-repair diagrams, a visualization coverage map,
  and concrete use cases for simulation QA, NEST reporting, corpus exploration,
  cross-language hosts, interactive explainers, and reproducible archives.
- Adversarial core/runtime tests, adapter precision tests, shader/source design-law
  guards, React render-boundary tests, accessibility tests, package metadata linting,
  and clean-room ESM/CJS runtime plus TypeScript-consumer smoke tests across Node 20,
  22, and 24.

### Changed

- The React peer set is now `react`, `react-dom`, `three`, and
  `@react-three/fiber`; `@react-three/drei` is no longer required.
- Package exports use separate ESM/CJS type conditions, `SECURITY.md` ships in the
  tarball, Bun and CI installs are pinned/frozen, and committed distribution freshness
  includes untracked artifacts.
- Per-skill params objects are closed at the top level; typoed data fails instead of
  surviving into a checked payload. Phase-plane, voltage, stimulus-response,
  compartmental, replay, graph, and GPU-range contracts now contain the data and
  cross-field rules their renderers actually need.

## [0.5.0] — 2026-07-03

Review-and-improvement pass: closes a critical honesty gap, makes the render
boundary actually carry data, and starts decoupling the axis from NEST. Contains
breaking changes to the entry points (see **Changed**).

### Security
- **Honesty caption can no longer be overridden by an agent.**
  `defaultHonestyCaption` previously returned a caller-supplied `provenance.caption`
  *before* the schematic/advisory disclosure, so synthetic data could be captioned
  "Measured recording from Brunel et al. 2000" verbatim. The mandatory disclosure
  is now computed only from the machine-checkable flags and ALWAYS leads; an agent
  caption can only be *appended* as context, never suppress the prefix. New
  exported `mandatoryDisclosure(p)`. This is the library's load-bearing honesty
  boundary (see SECURITY.md).

### Fixed
- **False derived-view caption for the knowledge graph.** The `weak` disclosure
  was hard-coded to "reuses the '<scene>' scene; not a 1:1 rendering", which is
  false for `corpus.knowledge_graph` (knowledge-graph-3d is its *native* scene).
  Each weak skill now declares its own `weakDisclosure` sentence — the KG states
  the real reason (same_as/variant_of edges are advisory structural similarity,
  not certified sameness); astrocyte states Ca²⁺/IP₃ ≠ membrane voltage.
- **`ExpandableNeurons` no longer hides neurons past a magic index.** The reveal
  ramp used a hard-coded `/1200.0` divisor that clipped every neuron past index
  ~1322 even at full expansion (≈40% of a 2000-neuron population invisible). It
  now normalizes to the actual grid count via a `uRevealCount` uniform.
- **`ExpandableNeurons` fade-in now works.** `material.opacity` is a no-op on a
  raw `ShaderMaterial`; the fragment shader now consumes a real `uOpacity` uniform.
- Tightened two loose param schemas so structurally-broken payloads fail the
  strict gate instead of rendering blank: `spatial_3d` `objects` now require
  numeric `x/y/z`; `phase_plane` `grid` now requires numeric-array axes.
- **Hardened `KnowledgeGraph3DScene`** (adversarial review of the one complete
  shipped scene): removed a per-frame array allocation in `useFrame` (Design Law
  L4 — remembered positions are now mutated in place); a stale focus id no longer
  dims the entire graph or freezes an empty label; the camera auto-frame is now
  once-per-mount and the simulation warm-restarts (α 0.5) on a data change instead
  of hard-snapping the camera and re-scattering the settled layout; `node.radius`
  is sanitized (a non-finite/≤0 radius no longer writes a NaN instance matrix or
  poisons `forceCollide`); the fly-to now tracks the node's live position instead
  of a stale snapshot and is cleared when no controls exist; self-loops and
  duplicate ids are handled (self-loops dropped from a single shared valid-edge
  set; duplicate ids dev-warn); an empty graph renders no phantom node; the
  remembered-position cache is bounded; and `dim()` no longer allocates a colour
  per emphasis pass. `edge.directed` is now optional and a `particleColor` prop
  was added.
- **`KnowledgeGraph3DScene`: hover/click and visibility no longer decay as the
  layout drifts** (second hardening pass; proven empirically against three 0.184).
  The node mesh, edge lines and particle cloud stream their geometry every frame,
  but three computes an object's bounding sphere once and caches it — so nodes
  that drifted outside the frame-1 sphere became unhittable (the instanced raycast
  gates on those bounds) and nodes/edges could blink out of view (frustum culling
  consults the same stale sphere). Frustum culling is now disabled on all three
  streamed objects and the node mesh's cached bounds are invalidated after every
  matrix write. Also fixed: a user grab of the controls (`'start'`) permanently
  cancels the scene's camera intents (pending auto-frame, in-flight fly-to) so the
  camera never fights the user's hand; with no host controls, auto-frame now aims
  the camera at the graph (`lookAt`) instead of only positioning it; `onHover`
  fires only when the hovered id *changes* (pointermove is per-frame — an
  unguarded callback re-rendered state-holding hosts on every mouse twitch); the
  pointer cursor clears when the hovered id leaves the graph; and flow particles
  no longer write depth (additive glows shouldn't occlude).

### Added
- **Agent authoring loop (`cortexel/core`).** New helpers that close the
  author → validate → repair cycle an autonomous agent runs, on top of the strict
  gate: `buildVizSpec({ skill, params, source, declaredInputs, … })` assembles a
  spec (defaulting the scene from the skill's contract and provenance from the
  fail-closed baseline) and validates it in one call, returning a render-ready
  `{ spec, scene, caption }` or structured errors; `conservativeProvenance(source,
  declaredInputs)` is the fail-closed provenance scaffold it builds on (an agent can
  only ADD rigor); `validateSpec(payload)` validates a self-describing spec by
  reading `spec.skill` (the core-level form of what `VizSpecRenderer` does);
  `formatInvocationErrors(errors)` renders structured errors as one compact,
  deterministic repair block (path + message + hint + an inlined valid example) a
  model can read and fix. New `AGENTS.md` documents the whole loop.
- `knowledge-graph-3d` scene + `corpus.knowledge_graph` skill — a first-class
  cross-paper corpus knowledge graph. The declarative VizSpec contract adds the
  `KnowledgeGraph3DParamsSchema` (paper/model/family nodes;
  cites/same_as/variant_of/instantiates/belongs_to_family edges), the
  `graph_source`/`node_kinds`/`edge_kinds`/`identity_advisory` provenance keys,
  and a synthetic worked example.
- `KnowledgeGraph3DScene` — a Canvas-less R3F scene primitive (Design Law #5:
  host owns Canvas/OrbitControls/bloom/background). Now shipped at its own subpath
  **`cortexel/react/knowledge-graph`** so `d3-force-3d` stays a truly optional
  peer (the base `cortexel/react` entry no longer imports it). A d3-force-3d
  simulation ticked in an allocation-free `useFrame`, instanced unlit sphere
  nodes, additive line edges, citation-flow particles, and a Billboard focus label.
- **Validated data reaches the renderer.** `RenderSceneArgs` now carries `params`
  (the per-skill-validated scene data) and `provenance`, so a host scene renders
  from Cortexel's checked output instead of re-parsing the raw spec.
- **`mapCorpusKnowledgeGraph`** (`cortexel/react/knowledge-graph`) — the missing
  agent→scene bridge: turns validated `corpus.knowledge_graph` params (id/kind/
  label) + a semantic palette into ready-to-render `KnowledgeGraph3DNode`/`Edge`
  props (colour by kind, radius by degree, citation-flow particles on `cites`
  edges). Ships with the THREE-free graph helpers `filterGraphEdges` /
  `buildAdjacency` / `flowParticleCount` / `graphSignature` (unit-tested, one
  source of truth for the scene's "renderable edge" definition).
- **Self-describing specs.** `VizSpec` gains optional `skill` and `specVersion`
  fields. When present, a stored spec is independently re-validatable and its
  honesty caption is deterministic; `VizSpecRenderer` routes through the strict
  gate from `spec.skill` even without a `skillId` prop. `validateSkillInvocation`
  cross-checks `spec.skill` (new `skill_mismatch` error). New `CORTEXEL_SPEC_VERSION`.
- **Machine-readable param schemas for agents.** The manifest and `describeSkill`
  now emit `paramsJsonSchema` (JSON Schema draft 2020-12, derived from the zod
  schema via `z.toJSONSchema`) so non-TS hosts/agents validate and generate params
  without reverse-engineering types. New `skillParamsJsonSchema(contract)`. Manifest
  bumped to `manifestVersion: '2'` and now carries `specVersion` + per-skill
  `weakDisclosure` + `paramsJsonSchema`.
- **Neutral (non-NEST) axis aliases.** `SKILL_IDS` / `SkillId` / `SKILL_REGISTRY`
  / `isSkillId` — the axis already includes a non-NEST skill (`corpus.knowledge_graph`),
  so `isNestSkillId` was a misnomer (now a deprecated alias of `isSkillId`).
- `unknown_skill` errors now include a `didYouMean` nearest-match (edit distance)
  and attach that skill's example payload, so a typo self-repairs in one shot; the
  hint no longer claims skills are `nest.*`-only.

### Changed
- **KG layouts are deterministic and survive host re-renders.** New nodes are no
  longer seeded with `Math.random()`: d3-force-3d's golden-ratio phyllotaxis
  init and seeded LCG lay the same graph out identically on every mount
  (reproducible reading and screenshots; pinned by a contract test). The
  simulation memo is keyed on graph *content* (`graphSignature`, exported)
  rather than array identity, so a host that rebuilds its nodes/edges arrays
  every render — the common React pattern — never restarts a settled layout;
  any real change still warm-restarts. The scene now honors the library's
  `reducedMotion` prop contract like its Expandable* siblings (pre-settled
  layout, still particles, snap fly-to). Focused emphasis also collapses flow
  particles on peripheral edges (the dimmed periphery no longer sparkles), and
  per-edge golden-ratio phase offsets stop all citation flows pulsing in lockstep.
- **BREAKING: the root `cortexel` entry now re-exports only `cortexel/core`.** It
  previously re-exported the React layer too, which forced a pure-Node consumer of
  `import … from 'cortexel'` to install the "optional" react/three peers. Import
  rendering from `cortexel/react` (and `cortexel/react/knowledge-graph`) explicitly.
- **BREAKING: `KnowledgeGraph3DScene` moved** from `cortexel/react` to
  `cortexel/react/knowledge-graph` (see Added).
- `zod` is now a normal `dependency` (was a required peer), so `cortexel/core`'s
  runtime requirement is installed automatically rather than being a missing-peer
  footgun.
- `d3-force-3d` is now a `devDependency` (in addition to the optional peer) so CI
  installs it and typecheck/build exercise the real dependency graph; added a
  pure-JS contract test that pins the d3-force-3d API the scene uses.
- CI now verifies the committed `dist/` is in sync with source (`git diff
  --exit-code -- dist`).

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
