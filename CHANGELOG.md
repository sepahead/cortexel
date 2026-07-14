# Changelog

All notable changes to Cortexel are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — contract kernel (M1)

- **One normative contract authority under `contract/`.** Registries (units, error
  codes, capabilities, semantic validators, disclosures, budget profiles, renderers,
  palettes, identity, the legacy-skill map), Draft 2020-12 shared schemas, the
  request/artifact envelopes, and one self-describing contract file per stable skill.
  A meta-schema (`contract/meta/contract-source.schema.json`) constrains every skill
  contract.
- **The 19 stable single-figure contracts plus the `figure.bundle` artifact kind**,
  each with its scientific purpose, closed request schema, named semantic validators,
  budgets, disclosures, accessibility summary/table, hand-vector evidence flag,
  migration mapping, ownership, and living valid/invalid examples.
- **`scripts/generate-contract.ts`** derives the TypeScript catalog, identity, enum
  schemas, composed per-skill request schemas, the Python mirror, and the contract
  digest from `contract/` — deterministically. `scripts/check-generated.ts` fails if
  any generated file drifts or if generation is nondeterministic. The generator also
  refuses to emit an incoherent contract (a dangling validator id, an open object
  schema, a stable skill on an experimental renderer, or an oracle claimed as passed
  with no receipt).
- **Coordinated contract identity.** A SHA-256 `contractDigest` over the canonicalized
  normative source set, a separate `catalogDigest` over the stable catalog, and
  `getBuildIdentity()` naming every version axis. A local build reports
  `sourceRevision: "unreleased-worktree"` and `release: false` rather than guessing a
  release commit.
- **Dependency-free SHA-256** (checked against the FIPS 180-4 vectors and
  differentially against `node:crypto`) and **RFC 8785 JSON canonicalization** (the
  root of every cross-language digest).
- **A strict raw-JSON parser** that rejects duplicate object members before
  materialization — the check `JSON.parse` cannot perform — enforces resource limits
  during scanning, and builds null-prototype objects. And a **safe snapshot** for
  already-materialized values that inspects property descriptors without ever invoking
  a getter, `toJSON`, or `Symbol.toPrimitive`, survives a throwing Proxy, and returns
  a detached copy.
- **The request/artifact split.** `FigureRequestV1` (what a caller authors) and
  `FigureArtifactV1` (what Cortexel emits) are separate schemas. A caller cannot
  author a library conclusion — validation status, disclosures, digests, calibration —
  and the attempt is rejected with `PROVENANCE_CALLER_ASSURANCE_FORBIDDEN`, checked
  first, on the raw request, so it cannot hide behind a schema error.
- **The validation pipeline** (`parseAndValidateRequest`, `validateRequestValue`):
  boundary → authority → identity → structural (Ajv 2020, strict, no coercion) →
  semantic → canonicalize, returning a branded validated request that rendering will
  later require. The materialized-value boundary honestly reports the weaker
  `duplicateKeys: "not_observable_after_materialization"` assurance.
- **35 named semantic validators** — the rules JSON Schema cannot express: intervals
  formed only within a train, a rate denominator that counts recorded (not spiking)
  neurons, a rank-local snapshot that cannot claim a global out-degree, a multapse
  aggregation that is never "last edge wins", a unit dimension that must match its
  quantity kind, and a unit alias rejected with a repair rather than silently
  converted.
- **The disclosure engine**, deriving mandatory disclosures only from machine-checkable
  artifact facts through the closed rule registry — never from caller text or a flag.
- **Deterministic pre-1.0 migration** (`migrateLegacyRequest`) covering all 26 legacy
  ids: it produces a request plus a report, never an artifact, and refuses to invent a
  fact the legacy payload did not carry.
- **Living-fixture, hostile-input, and identity tests**: 297 contract-example checks,
  a SHA-256 vector + differential suite, an RFC 8785 suite, and hostile parser and
  snapshot corpora.

### Added

- **Pre-1.0 baseline and evidence ledger.** `docs/release/BASELINE-2026-07-14.md`
  freezes commit `16f2da7` with its toolchain, tracked-file inventory digest, and
  the first independently executed command receipts (446 tests passing).
  `docs/release/evidence-ledger.v1.json` records all 155 release gates with an
  explicit `PASS`/`FAIL`/`NOT_RUN`/`NOT_APPLICABLE`/`BLOCKED` state.
- `scripts/check-evidence-ledger.ts` parses the ledger strictly, rejects a `PASS`
  that carries no reproducible receipt, requires a rationale for
  `NOT_APPLICABLE`, and blocks a stable (1.x+) release tag while any
  release-blocking gate is unproven. Pre-1.0 tags assert no stable contract and
  are gated on ledger integrity alone.
- `docs/release/known-consumers.v1.json` records downstream consumers with an
  explicit verification state. Being listed is not certification.
- A release-blocker issue form.

### Changed

- README now carries an explicit pre-1.0 status box. HEAD must not be cited as a
  released product.

---

Repository-wide contract, renderer, and release hardening for agent-authored
visualizations. The skill-axis contract version is now `1.6.0`; callers should
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
- Per-skill `requiredProvenanceFlags` now bind machine-readable envelope flags in
  both strict gates and the portable manifest. Corpus graphs therefore cannot
  contradict their derived/advisory elements by claiming non-advisory or
  paper-local provenance.
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
- Public repair diagnostics never invoke object conversion hooks or thrown-value
  accessors. Display-facing skill, palette, host, route-field, and authoring-error
  identifiers reject or directly escape/bound control/bidi spoofing characters.
- `VizSpecRenderer` is strict/self-describing by default; deleting `spec.skill`
  cannot downgrade validation. The envelope-only path requires explicit
  `trustedEnvelope`, and unchanged spec identities reuse a detached validated
  snapshot instead of synchronously revalidating large arrays on every parent render.

### Fixed

- Per-skill schemas now enforce paired-axis lengths, monotonic time axes, finite and
  non-negative domains where required, integer ids, non-empty phase-plane axes, and
  graph identity/reference invariants. Every one of the 26 skills, including the
  four host-rendered skills, has a real params schema.
- Knowledge-graph evidence now requires a direct snapshot-record, citation, or
  external-source anchor for every node and edge; graph-node references alone
  cannot form a self-referential proof chain. Generation time is RFC 3339, node
  scores are restricted to extraction confidence, stable endpoint ids remain in
  accessible relationship prose, and the legend can disclose immutable graph
  context. The Engram adapter rejects accessors before invoking them.
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
- Raw NEST adapters and derived spike analyses now share one deep, accessor-safe,
  typed-array-aware input snapshot. Recorder output is never assumed chronological;
  sorting occurs only within the relevant sender/trial group, decimal bin geometry
  follows the published binary64 tolerance, and transform output amplification is
  bounded before allocation.
- Shared single-source and per-sender/per-synapse time axes reject duplicate as well
  as descending timestamps. Typed-array preflight reads the intrinsic length slot,
  never an overridable subclass getter.
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

- Clarified standalone repository governance: this repository is the canonical
  writable source; downstream Engram pins released commits and generated contracts.

- Added an agentic NEST connection-snapshot axis with distinct
  `nest.connection_graph`, `nest.adjacency_matrix`, `nest.weight_matrix`,
  `nest.delay_matrix`, `nest.in_degree_distribution`,
  `nest.out_degree_distribution`, and `nest.delay_distribution` contracts.
  Ordered node universes retain isolates, every multapse remains countable,
  matrices use NEST's target-row/source-column convention, absent cells remain
  distinct from present zero-valued aggregates, and typed snapshot scope prevents
  MPI-local evidence from masquerading as a complete global network. The legacy
  edge-list skill `nest.connectivity_matrix` remains valid but is deprecated and
  excluded from automatic routing in favor of `nest.connection_graph`.
- Added `nest.spatial_map_2d`, a measured-position contract with stable node ids,
  explicit center/extent/edge-wrap metadata, MPI position scope, coordinate units,
  equal-aspect rendering, origin-independent extent-relative bounds, and
  fixed-screen-space marker disclosure. Masks and
  probability kernels remain separate future contracts rather than free-text
  geometry claims.
- Added no-throw, accessor-safe transforms for official scalar/singular and
  plural-array SynapseCollection output, graph/matrix/degree/delay derivation, and
  identified 2D GetPosition output. Transform discovery metadata is published to
  agents alongside each applicable skill.
- `cortexel/react/charts` now provides the strict `ReferenceVizSpecFigure`
  agent-spec→accessible-SVG path for nineteen native analysis/topology skills: voltage and
  disclosed astrocyte traces, spike raster, population rate, F-I response, ISI,
  PSTH, correlogram, weight/delay histograms, plasticity dynamics, phase plane,
  connection graph, adjacency/weight/delay matrices, in/out degree distributions,
  and measured 2D spatial maps. Exact
  skill dispatch prevents
  misleading scene reuse; large series/events share compact SVG paths; units,
  normalization, alignment and vector semantics remain visible; unsupported
  topology/KG/host-only skills return an explicit alert.
- Added `adaptEngramCorpusEntityGraph`, a no-guess projection from Engram's
  corpus entity response into the snapshot-bound knowledge-graph params contract.
  It verifies response summaries and conservative scientific flags before the
  resulting params enter the ordinary strict VizSpec gate.
- Added non-suppressing `captionPlacement="footer"` support to
  `VizSpecRenderer`. The chart wrapper forces this layout so mandatory disclosure
  remains part of the rendered figure without covering axes or data; existing
  scene overlays remain the default.
- `validateSkillParams(skillId, params)` provides a low-level structural check for
  every skill without inventing a scene.
- `buildHostRendererInvocation`, `validateHostRendererInvocation`, and
  `validateHostRendererSpec` give every `scene:null` skill the same params,
  provenance, version, route-membership, repair-example, serialization, and caption
  guarantees as a VizSpec.
- Machine-readable `paramConstraints` accompany JSON Schema in discovery and the
  version-8 skills manifest. It now covers every skill and publishes envelope schemas,
  defaults/normalization order, exact-JSON limits + duplicate-member precondition,
  binary64 and UTF-16 semantics, strict invocation/provenance/palette policies,
  caption derivation, versioned params/provenance constraint languages, and complete
  examples at `cortexel/skills.manifest.json`.
- `KnowledgeGraphA11yList`, a keyboard- and screen-reader-accessible DOM mirror with
  paginated nodes, node kinds, and separately paginated directed relationship detail
  for the WebGL graph.
- Native, agent-invocable `nest.isi_distribution`, `nest.psth`, and
  `nest.weight_histogram` contracts for the three previously orphaned analysis
  scenes. Their checked payloads bind bin width, uniform non-overlapping bin
  geometry, normalization, displayed units, trial/alignment or interval scope,
  connection sampling, and source provenance. Probability mass must sum to one,
  ISI density must integrate to one, and ISI bins cannot extend below zero;
  histogram geometry now uses a zero absolute tolerance so tiny physical units
  cannot make a false bin-width claim pass. PSTH bins explicitly aggregate all
  selected senders per trial; count/trial and Hz values must recover a
  non-negative safe-integer raw event count, and the aggregation claim is bound
  into provenance. The portable parameter-constraint language retains those
  derived-count recovery formulas in version 8 alongside the topology rules. Router discovery exposes
  ISI/PSTH as explicit spike-recorder shapes.
- Added `nest.population_rate`, an evidence-preserving time-varying rate contract
  and canonical step chart. Each series carries exact integer spike counts,
  recorded-sender denominator and checked Hz values; uniform half-open bins exactly
  cover the declared window and the gate recomputes every displayed rate.
- Promoted `nest.correlogram` from a host-only envelope to its own canonical scene.
  The redesigned contract binds detector identity, oriented source/target labels,
  symmetric lag geometry, bin width, τ range, counting window, lag convention,
  zero-lag policy, binning, statistic kind and units. Raw counts, weighted sums,
  pair rates and Pearson coefficients have separate closed domains.
- Added no-throw `spikeRecorderToIsiParams`, `spikeTrialsToPsthParams`,
  `spikeRecorderToPopulationRateParams`, and
  `correlationDetectorToCorrelogramParams` transforms for raw NEST/NumPy-style
  arrays. They preserve integer evidence, silent-sender denominators, explicit
  trial alignment and the correlation detector's documented lag orientation.
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

- `corpus.knowledge_graph` is now a breaking, evidence-grade `1.4.0` contract:
  immutable graph/source/snapshot identity, stable edge assertion ids, bounded
  attributes, typed evidence references, derived/advisory epistemic records and
  discriminated scores that are explicitly not calibrated posteriors. Edge-kind
  score semantics and endpoint kinds are checked portably; repeated evidence is
  preserved as identified multiedges, capped at nine assertions per unordered
  pair; its language-neutral rules remain represented in the current version-8
  constraint language.
- The skill axis is now `1.6.0` and the self-describing envelope contract is
  `1.3.0`. Spike routing distinguishes `population_rate` from `fi_response`,
  rejects the ambiguous legacy `rates` discriminator, and routes
  `correlation_detector` directly to the native correlogram.
- The 3D graph routes parallel assertions on deterministic quadratic lanes while
  its force layout uses one spring per unordered pair. Lines, arrowheads and flow
  particles consume the same path; direct React entrypoints reject invalid or
  unreadable relationships; metadata-aware search and the DOM companion preserve
  assertion ids, evidence, attributes, epistemic status and uncalibrated scores.
- Knowledge-graph search now uses the same bounded metadata-aware matcher in WebGL
  and the DOM companion, and applies the query coherently to nodes, edges,
  arrowheads, and flow particles instead of leaving a bright unrelated edge field behind. Selected
  nodes remain available to assistive technology through filtered views, duplicate
  ids fail closed at both direct React entrypoints, relationship disclosures have a
  touch-sized target, and the force-layout clock no longer allocates from `useFrame`.

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
