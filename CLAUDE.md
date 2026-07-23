# Working on Cortexel — a guide for Claude Code & coding agents

> **Scope.** This file is for agents (and humans) **modifying Cortexel itself**. If
> you are building an agent that *uses* Cortexel to make figures, read
> [AGENTS.md](./AGENTS.md) instead.

Cortexel is an **agent-consumable scientific-visualization contract** for neural
simulations: an agent emits a declarative `VizSpec`, Cortexel validates it, routes
it to a scene, enforces fail-closed honesty provenance, and a host-injected renderer
draws it. The value is in the **contract and its invariants**, not in a pile of
chart code — most changes are about keeping those invariants airtight.

## Commands

```bash
bun install
bun run typecheck   # tsc --noEmit
bun run test        # vitest run
bun run check       # typecheck + test (run before finishing)
bun run build       # tsup + verified dist/contract copy + legacy skills manifest
bun run audit       # dependency advisory gate
bun run lint:package # publint export/package metadata gate
bun run test:package # clean-install ESM/CJS runtime + consumer type smoke
```

Use `bun`. Supported Node runtimes are exactly the maintained majors 22, 24, and
26 (`^22.0.0 || ^24.0.0 || ^26.0.0`); the package and CI enforce that policy.
There is no separate linter; TypeScript strict mode is the gate.
`bunfig.toml` deliberately sets `env = false` and a regression test checks nested Bun
scripts. That is not a filesystem sandbox: package managers and dependencies may still
read checkout files. Keep credentials outside the repository and outside the invoking
environment; a narrowly scoped first-party client may read its external credential store
explicitly.

## Repo shape

| Path | What lives there |
|------|------------------|
| `core/` | zero-dep (beyond `zod`) contract: `vizSpec`, `provenance`, `designLaws`, `colormaps`, `skills/*`, `nest/*` |
| `core/skills/` | the skill axis: ids/registry/router, strict params/provenance, Cortexel + host invocation gates, authoring, examples, verification |
| `react/` | render layer: strict `VizSpecRenderer`, React-only canonical SVG charts, `Expandable*`, `neuronShaders`, and (subpath-only) `KnowledgeGraph3DScene` + `knowledgeGraph` |
| `src/` | FigureRequestV1 kernel, headless SVG renderer, NEST adapter, offline CLI, and generated contract projections |
| `contract/` | Normative FigureRequestV1 registries/schemas/skills; copied exactly once to `dist/contract` after tsup cleans |
| `types/` | ambient shims for deps that ship none (`d3-force-3d`) |
| `scripts/emit-manifest.ts` | generates `dist/skills.manifest.json` from the registry |
| `test/` | vitest; several tests are *executable guards* for the invariants below |
| `dist/` | **committed build output** (see below) |

The legacy entrypoints ascend in dependency weight: `cortexel/core` (zod only) →
`cortexel/react/charts` (+ React only) → `cortexel/react`
(+ react/react-dom/three/r3f) → `cortexel/react/knowledge-graph` (+ d3-force-3d).
The root `cortexel` re-exports **only** `core`, so a server import never pulls in
React or Three. Additive FigureRequestV1 capabilities live at `cortexel/figure`,
`cortexel/render-svg`, and `cortexel/adapters/nest`; none loads React/Three/R3F/D3.
Normative JSON is exported under `cortexel/contract/*`, and the `cortexel` bin is
offline. Do not replace or silently redirect a legacy path during the migration.

## Non-negotiables

These are the things a change most easily breaks. Treat them as hard constraints.

### 1. `dist/` is committed — rebuild it in the same change

Git-dependency consumers install without a build step, so `dist/` is checked in and
**CI fails if it drifts from source** (`git diff --exit-code -- dist`). After any
change under `core/`, `react/`, `src/`, `index.ts`, `scripts/`, or `tsup.config.ts`, run
`bun run build` and stage the regenerated `dist/`. The build is deterministic —
building twice yields byte-identical output.

### 2. Honesty fails closed — and it is a security property

The mandatory disclosure prefix must be derivable **only** from the
machine-checkable provenance flags, never from caller free text:

- `mandatoryDisclosure(p)` computes the prefix from flags alone; a caller
  `provenance.caption` is appended only as a sanitized **Caller note
  (unverified)** and rendered bidi-isolated.
- `calibrated_posterior` is a portable literal `false` in `ProvenanceSchema`; strict
  Cortexel and host-renderer gates preserve the specific unsupported repair code.
- `scene:null` means a host renderer, not a validation bypass. Use
  `buildHostRendererInvocation` / `validateHostRendererInvocation`, and require the
  host to show the returned caption.
- Never add a path that returns a caller caption verbatim, or that lets a flag
  suppress the prefix. See [SECURITY.md](./SECURITY.md). Changes here need a test.

### 3. Single sources of truth — don't hand-edit derived data

The axis is wired so things can't drift; keep it that way.

- `SCENE_NAMES` (tuple) drives both the `SceneName` type and the `VizSpec` zod enum.
- `SKILL_IDS` (tuple) drives the whole `SKILL_REGISTRY`; the `router`'s family→skill
  index is **derived** from the registry, not hand-written.
- `examples.ts` payloads are asserted valid by the test suite — they double as
  fixtures and cannot rot.
- `dist/skills.manifest.json` is **generated**; never edit it by hand. It mirrors
  envelope schemas/default order, exact-JSON budgets + duplicate-name precondition,
  binary64/UTF-16 normalization semantics, strict invocation/provenance/palette and
  caption policies, the versioned constraint languages, routes, and one complete
  envelope per skill.

Adding a skill means: extend `SKILL_IDS`, add a `SKILL_REGISTRY` entry and closed
params schema (including `scene:null` skills), add a living VizSpec or host-envelope
example, encode non-JSON-Schema constraints, and add any provenance keys/value rules.
Every new constraint kind also needs published semantics, manifest cloning/freezing,
an independent reference-evaluator branch, and a negative parity fixture.

### 4. The five design laws

Mirrored in [CONTRIBUTING.md](./CONTRIBUTING.md); laws 3–5 have executable guards.

1. A single neuron is a sphere; a population is a glowing voxel cube.
2. Passive data uses unlit `MeshBasic`; emissive > 1.0 is only for active events,
   kept bloom-safe (≤ ~1.15).
3. Honesty fails closed (see §2).
4. `useFrame` is allocation-free — module-scope scratch objects / refs and indexed
   loops only; no literals, constructors, or `for…of` iterators per frame.
5. The library stays host-agnostic; the host owns the frame. No host-app imports;
   scene components are injected via `renderScene`; scene primitives are Canvas-less
   (the host owns `<Canvas>`, OrbitControls, bloom, background, fog).

## react-layer gotchas

- **`d3-force-3d` ships no types.** `types/d3-force-3d.d.ts` hand-declares the surface
  used; `test/d3ForceContract.test.ts` pins the real API so an upgrade or ambient
  drift fails in CI, not at runtime.
- **`KnowledgeGraph3DScene` is not re-exported from `cortexel/react`** — it's the only
  scene needing the d3 peer, so it lives at `cortexel/react/knowledge-graph` to keep
  the base react entry d3-free. Its pure logic is in `react/knowledgeGraph.ts`
  (THREE-free, unit-tested) — put testable graph logic there, not in the GPU scene.
- **Canonical charts have their own light subpath.** `cortexel/react/charts` must
  stay free of Three, R3F and d3 imports. `ReferenceVizSpecFigure` always routes
  through the strict `VizSpecRenderer`; it exposes no `trustedEnvelope` escape
  hatch and uses normal-flow caption placement so disclosure cannot cover data.
  Dispatch by `skill`, not `scene`, because multiple skills may share a scene.
- **Binned charts render literal bins.** Population-rate traces use horizontal
  steps; correlograms use independent stems/points. Bounded compaction may retain
  exact extrema, but nonadjacent retained bins must start new subpaths and the DOM
  must disclose source/rendered counts—never interpolate, smooth, bridge, mirror,
  or invent a lag-zero bin.
- **Topology figures preserve structural absence.** Connection matrices use Cortexel's
  target-row/source-column convention and sparse present-cell geometry; a missing
  cell is never painted as a measured zero, while a present zero-valued weight sum
  remains visible. Value quantization may group paint paths but must retain every
  cell. Graph layouts are explicitly schematic, preserve isolates, directed
  arrowheads, autapses and deterministic parallel lanes, and disclose any sampled
  edge subset.
- **Distribution compaction preserves mass.** Degree and delay histograms may merge
  only adjacent bins, summing raw counts and count/probability mass (or integrating
  density before re-normalizing by the wider bin). Extrema sampling is invalid for
  distributions. Spatial maps use one equal x/y scale, never jitter measured
  positions, and disclose that marker radius is fixed screen-space decoration.
  Spatial bound tolerance is extent-relative per axis with only a bounded
  binary64 allowance for `center ± extent/2`; it must never grow with the
  absolute coordinate origin.
- **NEST analyses share one hostile-input boundary.** Raw recorder/detector
  transforms go through `core/nest/safeInput.ts`: typed numeric arrays are allowed,
  accessors are rejected without invocation, output amplification is preflighted,
  and recorder order is never assumed. Sort only within the scientific group
  that owns ordering (for example, within sender for ISI), and keep half-open bin
  semantics plus binary64 tolerance in transform/schema/manifest parity. Boundary
  repair must be bounded to plausible arithmetic roundoff; never scale a snapping
  tolerance with the bin index, because that moves real sub-boundary samples.
- **Connection snapshots carry scope.** SynapseCollection transforms accept the
  official singular/scalar form or canonical plural arrays, never both, never
  broadcast an optional scalar across rows, and never deduplicate multapses. A
  declared node universe is required so isolates and zero-degree nodes survive.
  MPI target-rank-local output remains explicitly local; it cannot produce a
  global out-degree claim. GetPosition transforms likewise bind node ids to the
  matching position order and retain single-process/rank-local/merged scope.
- **three caches bounding spheres once.** Any object whose geometry/instance matrices
  stream every frame must set `frustumCulled={false}` (and invalidate
  `mesh.boundingSphere` after matrix writes if it needs raycasting), or drifted
  content becomes unhittable / blinks out. Source-level regression tests guard this
  behavior for the pinned Three.js version; that is not a proof for future versions.
- **Reduced motion is a shared prop contract** (`reducedMotion`) across the animated
  scenes — honor it in new scenes (pre-settle / hold animation / snap transitions).
- **No implicit network loaders.** The graph label intentionally uses a local
  CanvasTexture rather than Drei/Troika Text (whose defaults fetch CDN fonts and
  create Blob workers). Hosts own any external assets.
- **Camera writes are opt-in.** `KnowledgeGraph3DScene` mutates host controls only
  when `autoFrame` / `flyToSelection` is explicitly enabled.
- **Direction cannot depend on motion.** Directed knowledge-graph edges retain
  arrowheads under reduced motion and in still exports.
- **Evidence cannot terminate inside the graph.** Every corpus node/edge evidence
  list needs a direct snapshot-record, citation, or external-source anchor;
  `graph_node` references are supplemental. Keep top-level advisory/paper-local
  flags bound to the element epistemic contract, preserve immutable snapshot
  context in the DOM legend, and reject accessor-bearing adapter input before any
  getter can run.
- Pair every interactive WebGL graph with `KnowledgeGraphA11yList`; meshes do not
  enter the browser accessibility tree on their own. Keep per-node announcements
  bounded and paginate nodes plus full relationship detail.
- Evidence-bearing multiedges need stable assertion ids. Render each assertion on
  its deterministic routed lane, use one force spring per unordered endpoint pair,
  and keep the core/React maximum parallel-edge bundle in parity. Typed evidence
  and bounded attributes must remain reachable from the DOM companion; a compact
  summary may not be the only route to omitted evidence.
- Direct knowledge-graph scene and DOM entrypoints reject duplicate node ids; an
  ambiguous identity must fail before selection, edge binding, or search can diverge.
- `VizSpecRenderer` is strict/self-describing by default and memoizes a detached
  validated snapshot by spec identity. Envelope-only rendering requires explicit
  `trustedEnvelope`; never use that opt-in for untrusted payloads.
- Large point clouds must not register R3F pointer handlers by default. Keep the
  lower interactive-picking cap unless GPU/indexed picking replaces linear raycasts.
- `ExpandableNeurons` receives explicit normalized activity arrays; never restore
  procedural/sine-wave “spikes” to make measured content look lively.
- Pair interactive population/neuron meshes with `PopulationA11yList` /
  `NeuronA11yPager`; pointer handlers alone are not an accessibility surface.

## Conventions

- TypeScript strict; prefer `import type` for type-only imports (keeps runtime graphs
  clean and avoids react/three cycles).
- zod v4 (`z.toJSONSchema` is used for the manifest's per-skill schemas).
- Params schemas are strict at the top level. Add an explicit bounded field instead
  of `.passthrough()`; typoed scientific data must fail closed.
- New behavior gets a test — especially anything touching honesty or the axis wiring.
- Update `CHANGELOG.md` under the working version.
- Match the surrounding comment density and idiom; comments state *why/constraints*,
  not narration.

## Source of truth & mirroring

This standalone repository is Cortexel's canonical, writable source. Engram consumes
published Cortexel commits as a pinned git dependency and may carry a generated
manifest snapshot for backend validation. Never recreate or edit an Engram
`frontend/app/cortexel/` copy; no in-tree source copy is authoritative. Open Cortexel
code PRs here, then update downstream pins and generated snapshots deliberately.

## Commits & PRs

- Commit or push **only when explicitly asked.** If asked and on `main`, branch first.
- **Never** add Claude / an AI / an agent as a commit or PR **co-author**. Do **not**
  add a `Co-Authored-By:` trailer, a "Generated with …" line, or a 🤖 marker to any
  commit message or PR description.
- Keep the working tree honest: if tests fail, say so; don't claim done until
  `bun run check` passes and `dist/` is rebuilt.
