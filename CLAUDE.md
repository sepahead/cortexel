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
bun run build       # tsup → dist/ (ESM + CJS + d.ts) + dist/skills.manifest.json
bun run audit       # dependency advisory gate
bun run lint:package # publint export/package metadata gate
bun run test:package # clean-install ESM/CJS runtime + consumer type smoke
```

Use `bun`. Node ≥ 20. There is no lint step; TypeScript strict mode is the gate.

## Repo shape

| Path | What lives there |
|------|------------------|
| `core/` | zero-dep (beyond `zod`) contract: `vizSpec`, `provenance`, `designLaws`, `colormaps`, `skills/*`, `nest/*` |
| `core/skills/` | the skill axis: ids/registry/router, strict params/provenance, Cortexel + host invocation gates, authoring, examples, verification |
| `react/` | r3f/three render layer: `VizSpecRenderer`, `Expandable*`, `neuronShaders`, and (subpath-only) `KnowledgeGraph3DScene` + `knowledgeGraph` |
| `types/` | ambient shims for deps that ship none (`d3-force-3d`) |
| `scripts/emit-manifest.ts` | generates `dist/skills.manifest.json` from the registry |
| `test/` | vitest; several tests are *executable guards* for the invariants below |
| `dist/` | **committed build output** (see below) |

Entrypoints ascend in dependency weight: `cortexel/core` (zod only) → `cortexel/react`
(+ react/react-dom/three/r3f) → `cortexel/react/knowledge-graph` (+ d3-force-3d). The root
`cortexel` re-exports **only** `core`, so a server import never pulls in three.

## Non-negotiables

These are the things a change most easily breaks. Treat them as hard constraints.

### 1. `dist/` is committed — rebuild it in the same change

Git-dependency consumers install without a build step, so `dist/` is checked in and
**CI fails if it drifts from source** (`git diff --exit-code -- dist`). After any
change under `core/`, `react/`, `index.ts`, `scripts/`, or `tsup.config.ts`, run
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
- **three caches bounding spheres once.** Any object whose geometry/instance matrices
  stream every frame must set `frustumCulled={false}` (and invalidate
  `mesh.boundingSphere` after matrix writes if it needs raycasting), or drifted
  content becomes unhittable / blinks out. This is proven against the installed three.
- **Reduced motion is a shared prop contract** (`reducedMotion`) across the animated
  scenes — honor it in new scenes (pre-settle / hold animation / snap transitions).
- **No implicit network loaders.** The graph label intentionally uses a local
  CanvasTexture rather than Drei/Troika Text (whose defaults fetch CDN fonts and
  create Blob workers). Hosts own any external assets.
- **Camera writes are opt-in.** `KnowledgeGraph3DScene` mutates host controls only
  when `autoFrame` / `flyToSelection` is explicitly enabled.
- **Direction cannot depend on motion.** Directed knowledge-graph edges retain
  arrowheads under reduced motion and in still exports.
- Pair every interactive WebGL graph with `KnowledgeGraphA11yList`; meshes do not
  enter the browser accessibility tree on their own. Keep per-node announcements
  bounded and paginate nodes plus full relationship detail.
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

Cortexel is developed inside the Engram monorepo (`frontend/app/cortexel/`) and
**mirrored** here via `git subtree`. The monorepo directory is canonical; open code
PRs there. This standalone repo is the publish mirror (issues/discussion welcome).

## Commits & PRs

- Commit or push **only when explicitly asked.** If asked and on `main`, branch first.
- **Never** add Claude / an AI / an agent as a commit or PR **co-author**. Do **not**
  add a `Co-Authored-By:` trailer, a "Generated with …" line, or a 🤖 marker to any
  commit message or PR description.
- Keep the working tree honest: if tests fail, say so; don't claim done until
  `bun run check` passes and `dist/` is rebuilt.
