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
bun run bootstrap
bun run typecheck   # tsc --noEmit
bun run test        # vitest run
bun run check       # generated parity + typecheck + test
bun run check:formal # compile every pinned Lean proof with warnings as errors
bun run build       # tsdown + verified dist/contract copy + legacy skills manifest
bun run audit       # dependency advisory gate
bun run lint:package # publint export/package metadata gate
bun run test:package # clean-install ESM/CJS runtime + consumer type smoke
```

Run both `bun run check` and `bun run check:formal` before finishing.

Use `bun`. Published-package Node support is `^22.12.0 || ^24.0.0 || ^26.0.0`;
22.12 is the first Node 22 release that can load the ESM-only graph peer from the
CommonJS graph entry without a flag. Source development additionally requires
Node `^22.18.0 || ^24.11.0 || ^26.0.0`, retaining the current tsdown build-tool
floors without admitting unsupported intervening or future majors. CI pins the build
runtime and separately exercises the exact floor/current pairs 22.12.0/22.23.2,
24.0.0/24.19.0, and 26.0.0/26.6.0 with each release's exact bundled npm.
There is no separate linter; TypeScript strict mode is the gate.
`bun run bootstrap` asks Bun to force-rematerialize the frozen dependency closure with
its cross-platform `copyfile` backend; the reviewed TSX gate still rejects a cache-linked
entry. This is ordinary developer setup rather than a complete installed-tree or release
receipt: only the clean CI path starts from an absent tree, downloads through a fresh
private cache, and scans every installed regular file for additional hardlinks. `bunfig.toml`
deliberately sets `env = false`,
disables ambient auto-install, and regression tests check both policies and nested Bun
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
| `contract/` | Normative FigureRequestV1 registries/schemas/skills; copied exactly once to `dist/contract` after the code build cleans |
| `types/` | ambient shims for deps that ship none (`d3-force-3d`) |
| `scripts/emit-manifest.ts` | generates `dist/skills.manifest.json` from the registry |
| `test/` | vitest; several tests are *executable guards* for the invariants below |
| `dist/` | **committed build output** (see below) |

The legacy entrypoints ascend in dependency weight: `cortexel/core` (zod only) →
`cortexel/react/charts` (+ React only) → `cortexel/react`
(+ react/react-dom/three/r3f) → `cortexel/react/knowledge-graph` (+ d3-force-3d).
The root `cortexel` re-exports **only** `core`, so a server import never pulls in
React or Three. Additive FigureRequestV1 capabilities live at `cortexel/figure`,
`cortexel/authoring`, `cortexel/render-svg`, and `cortexel/adapters/nest`. The
experimental agent/server graph boundary is `cortexel/knowledge-graph`; none of these
five paths loads React/Three/R3F/D3.
Normative JSON is exported under `cortexel/contract/*`, and the `cortexel` bin is
offline. Do not replace or silently redirect a legacy path during the migration.

## Non-negotiables

These are the things a change most easily breaks. Treat them as hard constraints.

### 1. `dist/` is committed — rebuild it in the same change

Git-dependency consumers install without a build step, so `dist/` is checked in and
**CI fails if it drifts from source** (`git diff --exit-code -- dist`). After any
change under `core/`, `react/`, `src/`, `index.ts`, `scripts/`, or `build.config.ts`, run
`bun run build` and stage the regenerated `dist/`. Contract generation is checked in
two independent zero-state trees for byte-identical output. Do not generalize that
evidence to the complete compiled package: clean-tree, toolchain-pinned tarball
reproducibility remains a separate release gate until it has a retained receipt.

Runtime maps have a separate reviewed input boundary in
`scripts/lib/package-source-map-authority.ts`: exact source identities and the
aggregate decoded-content digest are intentional review data, not a generated glob.
After an intentional mapped-source change, inspect the new source closure before
updating the reported observed digest; never bless an unexpected identity merely to
make the build pass. The map gate proves syntax/owner linkage, bounded ECMA-426 mapping
grammar and coordinate/table/name coverage, exact embedded canonical-UTF-8 input bytes,
and mapped-name text at the declared original coordinate—not general source-to-output
semantic correspondence. Its hard allocation limits are review authority: raise them
only after measuring and reviewing the exact emitted closure, never in response to an
untrusted map. HTTP `SourceMap` headers are
host-owned and outside the package-byte gate.

The package build's private request/result/presentation WeakSet modules are graph
capabilities, not ordinary bundle inputs. `build.config.ts` runs their exact-tuple
resolver before tsdown's plugins and a separate ownership audit after graph discovery
and final bundle mutation. Keep both layers: each private module must remain an exact,
importer-free entry and its one pass-specific private facade. Resolver-only tests are
insufficient because another plugin can short-circuit `resolveId`. Emitted paths below
`dist/` have an 86-byte ceiling so the full `dist/...` package-relative identity stays
within the reviewed 91-byte USTAR name profile. Keep tsdown and Rolldown exact-pinned
and physically co-resolved. The first pre-ordered `outputOptions` authority rejects
separate output plugins before they execute, initially admitted intermediate hooks are
descriptor-sealed, and the final post-ordered authority checks the transformed state;
neither bookend is redundant.

### 2. Honesty fails closed — and it is a security property

The flag-derived mandatory disclosure segment must be derivable **only** from the
machine-checkable provenance flags, never from caller free text. Strict gates use
the manifest-published order: weak-skill disclosure, external-provenance
disclosure, flag-derived mandatory disclosure, then caller note:

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
4. Cortexel-authored `useFrame` callbacks reuse scratch objects / refs, avoid React
   state updates, and use indexed loops. Keep direct first-party frame code free of
   literals, constructors, `for…of` iterators, and allocating compatibility helpers.
   The executable guard is lexical: it constrains Cortexel source, not heap allocation
   inside callees.
5. The library stays host-agnostic; the host owns the frame. No host-app imports;
   scene components are injected via `renderScene`; scene primitives are Canvas-less
   (the host owns `<Canvas>`, OrbitControls, bloom, background, fog).

## react-layer gotchas

- **`d3-force-3d` ships no types.** `types/d3-force-3d.d.ts` hand-declares the surface
  used; `test/d3ForceContract.test.ts` pins the real API so an upgrade or ambient
  drift fails in CI, not at runtime.
- **D3 force evidence is version-exact.** The repository and package smoke install
  `d3-force-3d` 3.0.6 exactly, and inspection of that installed source shows that its
  many-body and collision ticks transitively allocate octrees. The package peer range
  remains `^3.0.5`, which can select a future 3.x release; evidence-sensitive hosts must
  exact-lock 3.0.6 or re-audit another resolved version. Neither the lexical first-party
  guard nor the 3.0.6 inspection transfers an allocation or performance claim to that
  wider peer range.
- **An npm zero exit does not prove optional-peer materialization.** The full package
  smoke still requires every selected peer and transitive package. It may repeat the
  identical `npm ci` once with its same private `full` cache only after the first command
  succeeds and an exact reduced-closure proof isolates missing `optional:true` records.
  Never broaden that classifier, parse npm log text as authority, or accept the reduced
  tree. Version/pack control, core, charts, and full use four disjoint initially empty
  cache directories; one consumer must never inherit another consumer's cache state.
  Coldness is a one-time command-adjacent prepare-local state transition, not a
  pathname assumption: bind the canonical workspace, controlling ancestry, role, and
  captured directory identity; enumerate at most one dirent and require none; rebind;
  set/recheck the environment; then admit only the active role's npm policy. Control completes after
  pack, consumer roles only after the ordinary complete closure. Keep `full` active
  across its bounded retry and never rerun its cold check. This proves only the initial
  empty observation; it does not freeze the cache against an external same-UID writer.
  Lock/integrity checks and later reduced/complete closure proofs are separate evidence.
  Every npm command requires its role's prepared canonical current-UID mode-`0700`
  cache identity, the exact private user/global configs, and an absent cwd-local
  `.npmrc`; retry authority rechecks raw manifest/lock bytes, both tarballs, modes,
  cache authority, and config identity again at the immediate second-command boundary.
  The second result must pass the ordinary complete closure proof.
- **`KnowledgeGraph3DScene` is not re-exported from `cortexel/react`** — it's the only
  scene needing the d3 peer, so it lives at `cortexel/react/knowledge-graph` to keep
  the base react entry d3-free. Its pure logic is in `react/knowledgeGraph.ts`
  (THREE-free, unit-tested) — put testable graph logic there, not in the GPU scene.
- **One prepared graph capability owns every canonical corpus surface.** The internal
  scene, legend, paginated DOM, deterministic record browser, and accessible composition
  accept the exact same deeply frozen `PreparedCorpusKnowledgeGraphPresentationV1`;
  never restore independent raw-array snapshots. Public direct primitives accept and
  runtime-check only `PreparedGenericKnowledgeGraphPresentationV1`, and neither public
  package entry may export the corpus mapper or internal corpus components. The
  package-private WeakSet authority and nominal brand must remain singletons across
  ESM/CJS, with both directions exercised by package smoke. Corpus identities are
  derived from complete validated context.
- **Do not promise inert inspection of a materialized Proxy.** The ordinary-value
  preparer rejects accessors and performs descriptor/key/prototype revalidation, but
  those operations necessarily execute Proxy internal methods. Hostile text belongs at
  `parseKnowledgeGraphPresentationJson` for the generic-visual input contract or
  `prepareCorpusKnowledgeGraphFigureJson` for the complete corpus VizSpec; both use the
  same bounded strict parser and reject duplicate members before materialization. Keep
  source-input and presentation-input assurance profiles explicit and never promote a
  presentation capability into evidence authentication or custody.
- **Bind the corpus spec, mapper, and caption once.** Agent/server code uses the
  peer-free `prepareCorpusKnowledgeGraphFigure` for a materialized value or its `Json`
  sibling for raw text; the canonical React composition runtime-enforces exactly one
  own `spec` or `specJson` property and invokes the corresponding boundary. A present
  property with the wrong value type still rejects. Never accept an independent caption
  prop. `mode=export` fails closed because the WebGL composition has no stable artifact
  contract.
- **A filtered view is subordinate to one exact source capability.** Omission means all,
  an empty kind set means none, and duplicate or unknown kinds reject. Views reuse exact
  frozen record references and every consumer checks the source identity. Filtering must
  not hide or rewrite the full caption or full source-record browser. Keep a host's policy
  object identity stable across ordinary interaction renders; the bounded per-source LRU
  must also preserve exact token identity for equivalent hot policies. The canonical
  composition invalidates controlled selected/hovered ids when a new source/view hides
  them.
- **Presentation admission is not live-force admission.** Preparation, captions,
  legends, DOM controls, and the source-record browser admit at most 1,000 nodes and
  4,000 relationships. The allocating main-thread force scene separately admits at
  most 250 nodes and 1,000 relationships. Above the live ceiling the canonical
  composition does not mount or invoke the visual renderer, but it retains the bound
  caption, legend, operable DOM, and complete paginated source-record browser. An exact
  source-bound filtered view can regain the visual when it is within both live limits;
  not every source has such a nonempty filter.
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
- **Bound force work; do not promise a frame rate.** Cortexel's frame callback reuses
  scratch state and does not set React state, but an exact 3.0.6 D3 force tick allocates
  its spatial index. The clock schedules at most one solver tick per rendered frame and
  no more than 60 ticks per second. Below 60 FPS the layout deliberately settles more
  slowly instead of catching up with multiple ticks in one frame, and suspended-tab
  backlog is discarded. These are work bounds, not an FPS or frame-time guarantee.
- **Camera writes are opt-in and projection-aware.** `KnowledgeGraph3DScene` mutates
  the host camera/controls only when `autoFrame` / `flyToSelection` is explicitly
  enabled. A supported camera receives a provisional fit of the deterministic seed
  layout on the first eligible frame and at most one final correction after the bounded
  force layout settles. User control and selection intent cancel that final whole-graph
  correction. Each fit includes the node glyph geometry actually rendered on that
  frame (including an already-active focus scale) and bounded routed-edge extents; it
  never reserves the maximum hypothetical label envelope around every node. Hover does
  not restart either whole-graph fit stage. Fits work in either direction against the
  limiting perspective FOV or orthographic span, preserve the current viewing
  direction, and repair the host near/far planes only as needed to contain the fitted
  sphere. `autoFrame: false` is the retain-zoom path. Only canonical centered Three
  perspective/orthographic
  projections with identity camera-parent transforms and ordinary unit-scale camera
  matrices/methods are eligible. ArrayCamera, view offsets, film offsets,
  asymmetric/reversed orthographic frusta, custom projection matrices/methods,
  unsupported/ambiguous camera classes, nonfinite vectors, and zero/nonfinite
  projection geometry make no camera write and do not commit the pending fit stage; a
  later valid resize may retry. Do not restore the old center-only `+Z` frame,
  containment-only zoom rule, or projection fallbacks inside the scene.
- **Theme and interaction semantics are shared.** The canonical composition passes the
  validated theme and exact required background into the host. Undimmed opaque
  node/edge source colors are normalized to at least 3:1 against that painted
  background, and the legend discloses both source and intended undimmed scene colors.
  Corpus node/edge kinds also use closed, bounded glyph/stroke channels; hidden dash chords
  are omitted from GPU buffers rather than emitted as degenerate primitives. These
  regressions are not CVD, grayscale, browser, or whole-view accessibility
  certification. Mesh and DOM activation both toggle an
  active selection to `null`; pointer travel above the reviewed click threshold is a
  consumed controls drag, not a host/background click; and a text query must provide
  identified, explicitly focusable match navigation while retaining all nodes as context.
- **Direction cannot depend on motion.** Directed knowledge-graph edges retain
  arrowheads under reduced motion and in still exports.
- **Evidence cannot terminate inside the graph.** Every corpus node/edge evidence
  list needs a direct snapshot-record, citation, or external-source anchor;
  `graph_node` references are supplemental. Keep top-level advisory/paper-local
  flags bound to the element epistemic contract, preserve immutable snapshot
  context in the DOM legend, and reject accessor-bearing adapter input before any
  getter can run.
- Prefer `KnowledgeGraphAccessibleFigure` for interactive WebGL graphs: it keeps the
  visible caption, legend, and paginated `KnowledgeGraphA11yList` in normal DOM flow,
  and retains the deterministic paginated source-record browser if only the visual
  region fails. Its error boundary covers descendant client render/lifecycle errors,
  not SSR, event/async errors, or unreported WebGL context loss. SSR/no-JS renders only
  the bounded first record page; complete canonical record bytes come from the peer-free
  serializer, which omits caption/view/host policy and is not a figure artifact. The
  canonical composition defaults to a provisional seed fit plus at most one final
  settled-layout correction; the Canvas-less scene keeps camera mutation opt-in and can
  frame without controls, while fly-to still needs the host-owned controls ref. Meshes
  do not enter the browser accessibility tree. These
  invariants are regression evidence, not whole-view WCAG/browser/assistive-technology
  conformance.
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
  `bun run check` and `bun run check:formal` pass and `dist/` is rebuilt.
