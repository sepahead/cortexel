<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img alt="Cortexel logo" src="assets/logo-light.svg" width="200">
  </picture>
</p>

# Cortexel

[![CI](https://github.com/sepahead/cortexel/actions/workflows/ci.yml/badge.svg)](https://github.com/sepahead/cortexel/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](#)

**Cortexel** is an agent-consumable scientific-visualization *contract* for neural
simulations. An AI agent emits a declarative **`VizSpec`** (plain JSON); Cortexel
validates it, routes it to a scene, and enforces **scientific-honesty provenance
fail-closed** — then a checked renderer draws it. Cortexel ships canonical,
accessible SVG figures for nineteen native analysis/topology skills, reusable 3D
scene primitives (a population voxel hub and point-neuron cloud), and a complete
evidence-carrying 3D knowledge graph.

It is built for AI agents — with a custom harness and skills — that need a *typed,
honest path* from simulator output to a figure without hand-rolling validation or
provenance: a paper → simulation → visualization pipeline. The whole agent-facing
API lives in `cortexel/core`, which is dependency-free beyond `zod` and runs
server-side.

> **What Cortexel is (and isn't).** It is the validation, routing, honesty and
> design-contract layer with a canonical SVG figure path for analysis charts. The
> host still owns WebGL framing and injects application-specific 3D scenes; Cortexel
> does not invent a matrix, morphology, protocol panel, or animation for a contract
> that lacks the necessary data. Headless render-to-image/video remains on the
> roadmap. `0.5.0` — pre-`1.0`, APIs may still change.

**New here?**
[**AGENTS.md**](./AGENTS.md) is the integration guide for an agent *building figures
with* Cortexel; [**CLAUDE.md**](./CLAUDE.md) is for *working on* Cortexel itself.

## Visual overview

```mermaid
flowchart LR
  A["Simulation arrays<br/>NEST device dumps<br/>Corpus graphs"] --> B["Discover<br/>describeSkills / routeToScene"]
  B --> C{"Honest Cortexel scene?"}
  C -- Yes --> D["buildVizSpec"]
  C -- No --> E["buildHostRendererInvocation"]
  D --> F["Strict params + provenance<br/>exact-JSON + resource gate"]
  E --> F
  F -- Invalid --> G["Structured repair JSON<br/>hint + example + didYouMean"]
  G --> B
  F -- Valid --> H["Checked payload<br/>mandatory honesty caption"]
  H --> I["Canonical accessible SVG chart"]
  H --> J["Host-injected R3F scene"]
  H --> K["Checked host D3 / matplotlib / Manim route"]
```

### Visualization coverage

| Visualization | Skill or primitive | Render target | Typical use | Shipping status |
|---------------|--------------------|---------------|-------------|-----------------|
| Spike raster | `nest.spike_raster` | `spike-raster` | Population timing, synchrony, burst structure | Canonical accessible SVG figure |
| ISI and peri-stimulus histograms | `nest.isi_distribution`, `nest.psth` | `isi-distribution`, `psth` | Spike-train regularity and trial-aligned aggregate response across selected senders | Canonical accessible SVG figures |
| Population rate over time | `nest.population_rate` | `population-rate` | Auditable mean rate from raw bin counts and recorded-sender denominators | Canonical accessible SVG step figure |
| Correlogram | `nest.correlogram` | `correlogram` | Oriented raw/weighted/rate/Pearson lag statistics | Canonical accessible SVG stem figure |
| Voltage or analog trace | `nest.voltage_trace`, `nest.astrocyte_dynamics` | `voltage-trace` | Membrane dynamics or explicitly disclosed glial signals | Canonical accessible SVG figures |
| F-I / rate-response curve | `nest.rate_response` | `fi-curve` | Excitability and stimulus-response comparison | Canonical accessible SVG figure |
| Connection topology | `nest.connection_graph` | `network-topology` | Directed synapses with isolates, autapses, multapses, snapshot scope and honest schematic layout | Canonical accessible SVG figure + host scene route |
| Connection matrices | `nest.adjacency_matrix`, `nest.weight_matrix`, `nest.delay_matrix` | `connection-matrix` | Target-row/source-column presence, weight and delay snapshots with explicit aggregation | Canonical accessible sparse SVG heatmaps |
| In/out degree distributions | `nest.in_degree_distribution`, `nest.out_degree_distribution` | `degree-distribution` | Exact zero-inclusive node-degree counts from a declared node universe | Canonical accessible SVG figures |
| Connection-delay distribution | `nest.delay_distribution` | `delay-distribution` | Auditable count/probability/density views over positive NEST delays | Canonical accessible SVG figure |
| Measured 2D spatial map | `nest.spatial_map_2d` | `spatial-map-2d` | Identified positions with units, center/extent, edge wrap and MPI scope | Canonical equal-aspect accessible SVG figure |
| 3D spatial network | `nest.spatial_3d` | `network-topology` | Unit-labelled 3D positions | Contract + host-injected scene |
| Plasticity dynamics | `nest.plasticity_dynamics` | `stdp` | Measured weight evolution over time | Canonical accessible SVG figure |
| Synaptic-weight distribution | `nest.weight_histogram` | `weight-histogram` | Unit-labelled connection-weight snapshots with explicit sampling policy | Canonical accessible SVG figure |
| Phase plane | `nest.phase_plane` | `phase-plane` | Checked state-space vector field | Canonical accessible SVG figure |
| Corpus knowledge graph | `corpus.knowledge_graph` | `knowledge-graph-3d` | Snapshot-bound paper → model → family evidence exploration | Complete routed-multigraph R3F scene + full DOM evidence companion |
| Population and neuron expansion | `ExpandablePopulation`, `ExpandableNeurons` | Host Canvas | Interactive multiscale neural explainers | Reusable R3F primitives + DOM companions |
| Legacy 2D spatial, protocol, morphology, replay | Four `scene:null` skills | D3 / matplotlib / Manim | Stored legacy envelopes and analyses with no native scene yet | Strict checked host-renderer route |

## Use cases

| Goal | Cortexel workflow | Why it helps |
|------|-------------------|--------------|
| Autonomous NEST report generation | Normalize a raw device dict into host `SceneData`, or derive checked spike, connection-snapshot, degree, matrix, delay and spatial params, then author the matching skill with `buildVizSpec`. | Deterministic transforms and the VizSpec gate stay distinct, and the agent never invents a scene, units, bins, node universes, aggregation, or provenance shape. |
| Simulation QA and regression figures | Validate axes and identities, call `detectEmptyScene`, and reject malformed or blank render data before pixels exist. | Broken recorder output fails before it becomes a convincing but empty figure. |
| Paper-to-simulation evidence maps | Adapt an Engram entity graph with `adaptEngramCorpusEntityGraph`, author `corpus.knowledge_graph`, map it with `mapCorpusKnowledgeGraph`, and render the supplied 3D graph plus its DOM companions. | Snapshot identity, typed evidence, uncalibrated scores, advisory assertions, and schematic layout stay machine-checkable. |
| Agent-to-figure analysis charts | Pass a validated or raw self-describing agent spec to `ReferenceVizSpecFigure` from `cortexel/react/charts`. | The strict gate, exact skill dispatch, accessible SVG, and non-dismissible caption are supplied together. |
| Safety gateway for LLM-generated visuals | Put `validateSpec` or `validateHostRendererSpec` between agent output and every renderer. | Unknown fields, contradictory units, oversized inputs, and unsupported claims fail closed. |
| Python or Rust visualization backends | Consume `cortexel/skills.manifest.json` and implement its JSON Schemas, defaults, portable constraints, and honesty policy. | Non-TypeScript agents share the same versioned contract as the TypeScript runtime. |
| Interactive neural explainers | Combine population/neuron primitives with host-owned Canvas controls and the exported DOM selection companions. | One interaction model serves pointer, keyboard, screen-reader, and reduced-motion users. |
| Reproducible figure archives | Store the self-describing validated envelope (`skill` + `specVersion`) and re-run the strict gate when loading it. | The figure request remains auditable without an undocumented side channel. |

## Install

```bash
# Until the first npm-registry release, install the repository package:
npm install github:sepahead/cortexel

# Once the registry package is published:
npm install cortexel                 # pulls zod automatically

# The canonical SVG chart subpath needs only React:
npm install react react-dom

# The 3D react rendering layer additionally needs these peers:
npm install react react-dom three @react-three/fiber

# TypeScript projects also need the React/three declarations:
npm install --save-dev @types/react @types/react-dom @types/three

# Only if you render the 3D knowledge graph (cortexel/react/knowledge-graph):
npm install d3-force-3d
```

`cortexel/core` is dependency-free beyond `zod` and safe to import server-side.
`cortexel/react/charts` needs only React. `cortexel/react` needs React, Three and
React Three Fiber; `d3-force-3d` is needed **only** by
`cortexel/react/knowledge-graph`.

## Quickstart

**Author + validate a spec in one call** (pure Node, no react). This is the agent's
happy path: `buildVizSpec` fills in the scene and the fail-closed provenance baseline,
then runs the strict gate — you get back a render-ready spec or the exact fix.

```ts
import { buildVizSpec, formatInvocationErrors } from 'cortexel/core';

const result = buildVizSpec({
  skill: 'nest.spike_raster',
  params: { times_ms: [1, 2, 3, 5, 8], senders: [1, 2, 1, 3, 2] },
  source: 'nest_simulation:run-42',
  declaredInputs: {                       // the keys this skill's honesty contract needs
    recorder_id: 'sr_1',
    sender_ids: '[1,2,3]',
    population_labels: 'E',
    time_units: 'ms',
  },
});

if (result.ok) {
  render(result.spec, result.caption);    // caption is the fail-closed disclosure
} else {
  console.error(formatInvocationErrors(result.errors)); // a copyable repair block
}
```

**Render a canonical analysis figure** (react). The spec is self-describing
(`skill` + `specVersion`), so this wrapper re-runs the strict gate, dispatches by
the exact skill (not only its scene), and keeps the bound caption in the figure
footer. It supports voltage/glial traces, rasters, F-I, ISI, PSTH,
population-rate steps, correlograms, weight/delay histograms, plasticity traces,
phase planes, connection graphs, adjacency/weight/delay matrices, in/out-degree
distributions, and measured 2D spatial maps:

```tsx
import { ReferenceVizSpecFigure } from 'cortexel/react/charts';

export function Figure({ spec }) {
  return <ReferenceVizSpecFigure spec={spec} width={960} height={540} />;
}
```

Legacy topology, 3D spatial, knowledge-graph and host-only skills return an
explicit alert rather than borrowing a misleading chart. A host that owns a
custom/WebGL surface uses `VizSpecRenderer` from `cortexel/react` and injects
`renderScene` as before.

## The agent loop

An autonomous agent runs four steps; **[AGENTS.md](./AGENTS.md) is the full guide.**
The core API in one glance:

```ts
import {
  describeSkills,          // 1. discover: scene, params (JSON Schema), provenance, example
  routeToScene,            //    or route a device family → a skill/scene (fail-closed)
  buildVizSpec,            // 2. author + validate in one call
  buildHostRendererInvocation, // scene:null equivalent; binds provenance + caption
  validateSkillParams,     // low-level params-only diagnostic (not a render gate)
  formatInvocationErrors,  // 3. prompt-safe structured JSON repair block
  validateSpec,            // 4. re-validate a stored self-describing spec (reads spec.skill)
  validateHostRendererSpec,//    re-validate a stored scene:null envelope
  spikeRecorderToIsiParams,
  spikeTrialsToPsthParams,
  spikeRecorderToPopulationRateParams,
  correlationDetectorToCorrelogramParams,
  adaptEngramCorpusEntityGraph, // Engram response → strict snapshot-bound KG params
} from 'cortexel/core';
```

```mermaid
sequenceDiagram
  participant Agent
  participant Cortexel
  participant Host
  Agent->>Cortexel: describeSkills() or routeToScene(...)
  Cortexel-->>Agent: skill, scene/host route, schema, provenance keys
  Agent->>Cortexel: buildVizSpec(...) or buildHostRendererInvocation(...)
  alt invocation is invalid
    Cortexel-->>Agent: structured errors + repair example
    Agent->>Cortexel: corrected invocation
  else invocation is valid
    Cortexel-->>Agent: checked envelope + mandatory caption
    Agent->>Host: serialize or render checked result
    Host-->>Host: revalidate, render, display caption
  end
```

- **Discover** — `describeSkills()` returns every skill's scene, required params (as a
  **JSON Schema**), cross-field constraints, provenance keys, and a worked example.
  `routeToScene({ deviceFamily, … })` maps a NEST device family to a skill/scene and
  fails closed on unknown, mismatched, or ambiguous discriminators, handing back
  exactly what's needed to retry. Spike-recorder routing distinguishes
  `population_rate` from `fi_response` (the ambiguous legacy `rates` value fails),
  while `correlation_detector` routes directly to the correlogram. GetConnections
  routing distinguishes graph, adjacency/weight/delay matrix, in/out degree,
  weight-distribution and delay-distribution requests; GetPosition distinguishes
  measured 2D maps from 3D positions. Raw field presence never guesses the view.
- **Author + validate** — `buildVizSpec` (above), or the lower-level
  `validateSkillInvocation(skillId, payload)` if you assemble the envelope yourself.
  For a `scene: null` skill, use `buildHostRendererInvocation` (or
  `validateHostRendererInvocation`) so params, provenance, selected route, and the
  mandatory caption remain one checked contract. `validateSkillParams` alone is not
  a final render boundary.
- **Repair** — every error carries a `hint`, a copyable `example`, and a `didYouMean`
  for a mistyped id; `formatInvocationErrors` emits deterministic JSON marked
  `untrustedData:true`, with dynamic values safely quoted for model repair.
- **Emit** — the validated spec is serializable and independently re-validatable via
  `validateSpec` (or `validateHostRendererSpec` for scene-less envelopes). Non-TS
  hosts consume the generated **`dist/skills.manifest.json`**
  (also exported as `cortexel/skills.manifest.json`) with a schema and explicit
  cross-field constraints for every skill, complete examples, exact-JSON budgets,
  envelope/default/normalization rules, binary64 + UTF-16 semantics, strict
  invocation/provenance policy, palette policy, and the caption derivation policy.
  Manifest v8 additionally exposes per-skill deprecation, router eligibility and
  raw-output transform metadata, with the authoritative family/shape routing map
  in `routingDiscriminators` for Engram and other non-TypeScript agents.

There are **26 skills** (25 `nest.*` simulation/analysis skills + `corpus.knowledge_graph`);
**22 render to a Cortexel scene**, and 4 declare `scene: null` because no honest scene
matches those specific payload contracts (legacy 2D spatial, protocol, morphology,
replay) — those route to a host renderer rather than being mis-drawn. See the full
catalog in [AGENTS.md](./AGENTS.md).

PSTH normalization is mechanically auditable: bins aggregate raw events from all
selected senders across `trial_count`; `count_per_trial` divides that integer total
by the trial count, and `rate_hz` additionally divides by the bin duration in
seconds. Cortexel recovers and verifies the underlying integer count before a PSTH
payload can render.

Population-rate normalization is equally mechanical: each series retains its raw
integer bin counts and exact recorded-sender denominator, and the gate verifies
`rate_hz = count × 1000 / (sender_count × bin_width_ms)` for every value. The
transform layer accepts NEST's nonchronological recorder output and supplies exact
half-open bins for ISI, PSTH and population-rate params; the correlation-detector
adapter preserves NEST's positive-lag orientation and raw-versus-weighted statistic.

Connection transforms accept either the official singular/scalar SynapseCollection
shape or canonical plural arrays, require one form consistently per snapshot, and
never broadcast scalars or deduplicate rows.
Agents must supply the complete source/target node universes so isolates and
zero-degree nodes survive. Every result carries simulation snapshot time and a
typed single-process, MPI target-rank-local, or all-ranks-merged scope. Matrices
freeze NEST's target-row/source-column convention and explicit multapse aggregation;
rank-local evidence may render with disclosure, but cannot produce a supposedly
global out-degree distribution. Spatial maps likewise require matching node ids,
position scope, center, extent, edge-wrap metadata and units.

> **Naming.** The axis is not NEST-only (`corpus.knowledge_graph` has no NEST device).
> Prefer the neutral aliases `SKILL_IDS` / `SkillId` / `SKILL_REGISTRY` / `isSkillId`;
> the `NEST_`-prefixed names remain for back-compat.

## VizSpec contract

`core/vizSpec.ts` is the runtime source of truth (Zod; `VizSpec` is inferred from it):

```ts
{ scene, params, provenance, skill?, specVersion?, mode?, themeMode?, camera?, palette? }
```

- `scene` — one of `SCENE_NAMES` (the `SceneName` union and the Zod enum derive from
  the same tuple, so they cannot drift).
- `params` — literal, bounded JSON only: finite numbers, strings, booleans, null,
  arrays and plain objects with ordinary enumerable data properties. Cycles, sparse
  or decorated arrays, accessors, symbols, `toJSON`/raw-JSON tricks, class instances,
  functions, `undefined`, `BigInt`, non-finite/unstable values, and pathological
  depth/size fail before a spec is called render-ready. Skill schemas are closed at
  the top level, so typoed fields fail rather than being silently ignored.
  The complete envelope is capped at 500,000 JSON value nodes. Per-skill inline
  limits include 50,000 scientific samples, 50,000 spatial objects, and 1,000
  knowledge-graph nodes / 4,000 edges; aggregate/decimate larger recordings or
  pass a host-side data handle.
- `provenance` — see below; **required**. Build it fail-closed with
  `conservativeProvenance(source, declaredInputs)` (what `buildVizSpec` does for you).
- `skill?` — a self-describing skill id. When present, a stored spec is independently
  re-validatable and its honesty caption is deterministic (scene→skill is many-to-one,
  so the scene alone can't recover the skill).
- `specVersion?` — the contract era this spec targets (`CORTEXEL_SPEC_VERSION`);
  when present it must match the running contract exactly.
- `mode` — `interactive` (default) or `export`. `export` (headless) is not yet
  implemented and returns an explicit notice rather than faking a render.
- `themeMode`, `camera`, `palette` — presentation hints.

A host backend **should** mirror this schema server-side (e.g. a Pydantic model with
the same conservative defaults) as a defense-in-depth gate. Cortexel ships the
client-side gate.

Object APIs receive already-materialized values. If a payload arrives as raw JSON
text, reject duplicate object member names before parsing: ordinary `JSON.parse`
cannot reveal that an earlier member was overwritten. Stored JSON emitted by a
validated Cortexel spec is safe to parse normally.

## Honesty model (fail-closed)

Every spec carries `provenance` with the fail-closed defaults
`calibrated_posterior:false`, `advisory_only:true`,
`is_paper_local_evidence:false`, and `synthetic:false`. The renderer
shows a non-dismissible disclosure caption (`role="note"` / `aria-live`) unless the
provenance is fully rigorous — and because `calibrated_posterior=true` is rejected at
**every** entrypoint, there is currently **no accepted spec that suppresses the
caption**. Synthetic data (declared `synthetic:true`, or a `synthetic`-prefixed
source) is captioned as *schematic*; other non-rigorous data is *advisory*.

Strict gates reject unknown declared-input keys, validate every present known
value (not just required keys), and enforce portable params↔provenance consistency
where the contract can detect a contradiction—units, millisecond axes,
normalization, and similar claims. These checks cannot establish factual truth;
the producer remains responsible for truthful declarations.

The mandatory schematic/advisory prefix is derived only from machine-checkable
provenance flags. A strict gate may prepend its contract-owned weak-skill disclosure,
and an agent-supplied `provenance.caption` is appended only as a bidi-isolated,
explicit **“Caller note (unverified)”**. Neither can replace, reorder, or suppress
the mandatory prefix. This boundary is load-bearing — see
[SECURITY.md](./SECURITY.md).

A `weak` skill (a render whose *fidelity* or *data semantics* need a caveat) carries a
mandatory **derived-view** disclosure, declared per-skill so it states the real reason:
connectivity-only topology uses schematic positions/distances; astrocyte Ca²⁺/IP₃
shown through the analog-trace scene is *not* membrane voltage; and a knowledge
graph's identity edges plus force-layout geometry are advisory/non-evidentiary.

### Two rendering paths

1. **Agent path (default)** (`VizSpecRenderer` + `skillId`, or a spec with a `skill`
   field):
   validates through the strict skill gate — per-skill params, declared provenance,
   `calibrated_posterior` rejection, and the weak/derived-view disclosure — then binds
   the caption at the render boundary. **Use this for untrusted agent payloads.**
   A missing skill fails closed; deleting the discriminator cannot downgrade the gate.
2. **Trusted-envelope path** (`<VizSpecRenderer trustedEnvelope … />`): validates
   only the generic VizSpec envelope and does **not** enforce per-skill params or
   the weak disclosure. The explicit opt-in is only for trusted host-authored
   showcases, never agent/network payloads. `requiresHonestyCaption` and
   `defaultHonestyCaption` only derive disclosure text from already-validated
   trusted provenance; they are not validation gates.

Both paths always show the fail-closed caption; only the agent path additionally
enforces per-skill params and the derived-view disclosure.

The four `scene:null` skills do not use `VizSpecRenderer`; their strict equivalent is
`validateHostRendererInvocation`, whose successful result carries the checked host
envelope, allowed `rendererRoutes`, and the same mandatory caption. Hosts must display
that caption alongside their D3/matplotlib/Manim output.

## Design laws

These keep figures consistent and honest (mirrored in [CONTRIBUTING.md](./CONTRIBUTING.md)):

1. **A single neuron is a sphere; a population is a glowing voxel cube**
   (`BoxGeometry` + unlit `MeshBasic`, dimmed ×0.82 so it self-luminates under bloom
   without bleaching white).
2. **Passive data uses unlit `MeshBasic` (no emissive).** Emissive > 1.0 is reserved
   for active spike/synapse *events*; keep it bloom-safe (≤ ~1.15).
3. **Honesty fails closed** (see above).
4. **`useFrame` is allocation-free** (reuse refs / module-scope scratch objects).
5. **The library stays host-agnostic; the host owns the frame.** No host-app imports;
   scene components are injected via `renderScene`, and scene primitives are
   Canvas-less — the host owns `<Canvas>`, OrbitControls, bloom and background.

Laws 3–5 have executable guards in the test suite.

## Colour system

One perceptually-uniform colour language across every renderer (WebGL shaders, r3f
scenes, D3/SVG, and a host's matplotlib). The default is **Crameri** scientific colour
maps — `batlow` (sequential; the recommended replacement for jet/viridis) and `vik`
(diverging, for signed E/I and LTP/LTD fields). Palettes are **runtime-extensible**:
`registerPalette(name, palette, metadata)` at startup, and an agent can request one via
`VizSpec.palette` (validated against the registry on the skill path). Scene components
consume the resolved palette from `RenderSceneArgs.palette`, never module-level imports.

## Architecture

Dependency-ascending layers, each its own entrypoint:

| Entry | Deps | Contents | Status |
|-------|------|----------|--------|
| `cortexel/core` (and the root `cortexel`) | `zod` | VizSpec contract, skill axis (registry/router/validate/**author**/adapters), colormaps + palettes, GLSL strings, design-law types, provenance/honesty model, manifest | available |
| `cortexel/react/charts` | + react | Strict canonical SVG analysis, matrix, topology and spatial figures | available |
| `cortexel/react` | + react / react-dom / three / r3f | `VizSpecRenderer`, `usePopulationExpand`, `ExpandablePopulation`, `ExpandableNeurons`, DOM selection companions, `neuronShaders` | available |
| `cortexel/react/knowledge-graph` | + d3-force-3d | `KnowledgeGraph3DScene`, `KnowledgeGraphA11yList`, `mapCorpusKnowledgeGraph` | available |
| `cortexel/three` | three only | headless `Scene*Builder → THREE.Group` | planned |
| `cortexel/headless` | node | render-to-PNG/MP4 | planned |

The root `cortexel` entry re-exports **only** `core`, so `import … from 'cortexel'` is
always safe server-side and never pulls in react/three. Import rendering explicitly
from `cortexel/react`.

## Scene primitives

The `react` layer ships the reusable pieces the concrete scenes are built from:

- **`ReferenceVizSpecFigure`** (`cortexel/react/charts`) — the strict
  agent-spec→accessible-SVG path for nineteen analysis/topology skills. It reuses
  `VizSpecRenderer`, has no trusted-envelope bypass, dispatches by skill, combines
  large series/events into bounded SVG paths, discloses units/normalization,
  preserves literal population-rate bins and oriented correlogram semantics, and
  keeps the mandatory caption in normal document flow. The subpath imports no
  Three, R3F or d3.
- **`ExpandablePopulation`** — the population voxel hub. Click/tap selects it; the
  owning scene collapses the hub and expands the constituent neurons. Honors
  `prefers-reduced-motion` and demand rendering. Pair it with the exported
  `PopulationA11yList`; WebGL meshes are not keyboard or screen-reader controls.
- **`ExpandableNeurons`** — the companion point-neuron sphere cloud that blooms from
  the hub centre into a 3D grid. It allocates exactly the requested neuron count (no
  phantom padding), centers partial grids, and accepts explicit normalized
  `membraneIntensity`/`spikeIntensity` arrays. Omitted activity is static zero—this
  primitive never fabricates spikes for visual liveliness. `neuronLocalGrid` /
  `neuronExpandedScale` are exported for aligned synapse placement. Linear pointer
  picking has a 25,000-neuron cap; noninteractive clouds are supported up to
  1,000,000 neurons.
  Pair selectable clouds with the paginated `NeuronA11yPager` DOM companion.
- **`usePopulationExpand`** — THREE-free selection/hover state (with an optional
  controlled override so a scene that already owns the state doesn't get a second owner).
- **`KnowledgeGraph3DScene`** (`cortexel/react/knowledge-graph`) — a complete,
  Canvas-less 3D force-directed multigraph: instanced unlit nodes, deterministic
  routed lanes for parallel assertions, additive edges with persistent arrowheads,
  citation-flow particles, hover/selection emphasis and a network-free canvas-texture
  focus label, all
  ticked in an allocation-free `useFrame`. Layouts are deterministic (the same graph
  reproduces the same shape on every mount) and keyed on graph *content*, so hosts that
  rebuild their nodes/edges arrays every render never restart a settled layout; user
  camera ownership stays with the host unless it explicitly opts into `autoFrame` or
  selection fly-to; honors `reducedMotion`.
  Its companion **`mapCorpusKnowledgeGraph(params, palette)`** turns validated
  `corpus.knowledge_graph` params into the scene's node/edge props while preserving
  stable assertion ids, typed evidence, bounded attributes, epistemic status and
  explicitly uncalibrated scores. Search uses one metadata-aware predicate across
  nodes, routed edges, arrows, particles, and the DOM mirror. Duplicate identities,
  dangling/self-loop relationships and unreadable edge bundles fail closed; the
  schematic force simulation uses one spring per unordered node pair rather than
  overweighting repeated evidence. `KnowledgeGraphLegend` decodes node/edge
  colors, direction, flow and counts while repeating the schematic-layout note;
  pass it the mapper's snapshot context to expose the graph id, source, immutable
  snapshot id, scope and RFC-3339 generation time in the DOM. Every element must
  carry a direct snapshot/citation/external-source anchor (node references are
  supplemental), node scores are extraction-confidence only, and the strict gate
  fixes the envelope itself to advisory, non-paper-local provenance.
  `KnowledgeGraphA11yList` provides the required
  keyboard- and screen-reader-accessible, paginated evidence/relationship mirror for
  the otherwise pointer-driven WebGL graph.

## Roadmap

Known gaps, roughly in priority order — contributions welcome:

- **Headless export** (`mode: 'export'`, `cortexel/three`, `cortexel/headless`) — render
  a VizSpec to PNG/MP4/SVG without a browser, so an autonomous agent can produce a
  figure *artifact*. Today `export` returns an explicit 501-style notice.
- **Spatial probability and projection diagnostics** — separately contract NEST
  masks, kernels, connection-probability-versus-distance plots and sampled spatial
  projections. They are intentionally not inferred from measured GetPosition data.
- **Interactive large-network topology** — add an optional isolated R3F topology
  subpath with instanced nodes, deterministic parallel/self-edge routing and a full
  DOM companion. The canonical static SVG graph remains the render/export baseline.
- **Simulator-neutral axis** — a `generic` data-source family (plain `{times,senders}` /
  `{times,values}` arrays) so Brian2 / NEURON / arbitrary data route without claiming to
  be NEST.
- **Time-evolution** — a first-class `time` request (window/speed/loop) for animated
  scenes, instead of only the offline storyboard route.
- **Multi-figure composition** — a panel/layout envelope so an agent can request a
  multi-panel paper figure with one honesty policy.
- **Out-of-band data handles** — reference large arrays (e.g. a Brunel network's
  millions of spikes) by handle instead of inlining them in the agent's JSON.

## Development

```bash
bun install
bun run check   # typecheck + tests
bun run build   # tsup → dist/ (ESM + CJS + d.ts) + dist/skills.manifest.json
bun run audit          # dependency advisories
bun run lint:package   # export/types/package metadata validation
bun run test:package   # clean-room ESM/CJS + optional-peer smoke test
```

`dist/` is committed (git-dependency consumers install without a build step); CI
verifies it stays in sync with source. See [CLAUDE.md](./CLAUDE.md) for the invariants a
change must uphold, and [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow.

## License

[MIT](./LICENSE) © Sepehr Mahmoudian
