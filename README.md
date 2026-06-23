# Cortexel

[![CI](https://github.com/sepahead/cortexel/actions/workflows/ci.yml/badge.svg)](https://github.com/sepahead/cortexel/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](#)

**Cortexel** is an agent-consumable scientific-visualization library for neural
simulations. An agent emits a declarative **`VizSpec`** and Cortexel renders the
figure — spike rasters, Brunel networks, STDP curves, cortical columns, and more
— with **scientific-honesty provenance enforced fail-closed**.

It is built for AI agents (Engram, Hermes, OpenClaw, and others) that need to
*request* a figure without knowing React or Three.js.

> **Status:** early (`0.1.0`). The `core` and `react` layers are usable; headless
> render-to-image/video is on the roadmap. APIs may change before `1.0`.

## Install

```bash
npm install cortexel
# core needs `zod`; the react layer additionally needs these peers:
npm install three @react-three/fiber @react-three/drei react
```

`cortexel/core` is dependency-free (beyond `zod`) and safe to use server-side.
`cortexel/react` requires the Three.js / react-three-fiber peers.

## Quickstart

```tsx
import { VizSpecRenderer } from 'cortexel/react';

// An agent emits this JSON; it is validated before anything renders.
const spec = {
  scene: 'spike-raster',
  themeMode: 'dark',
  provenance: { source: 'nest_simulation:run-42' },
  // params is scene-specific (see "VizSpec contract")
  params: { /* senders, times, ... */ },
};

export function Figure() {
  return (
    <VizSpecRenderer
      spec={spec}
      // Cortexel is host-agnostic: you inject the concrete scene component.
      renderScene={({ scene, themeMode, active, camera }) => (
        <MyHostScene scene={scene} themeMode={themeMode} active={active} camera={camera} />
      )}
      onError={(errors) => console.warn('Invalid VizSpec', errors)}
    />
  );
}
```

Validate a spec without rendering:

```ts
import { validateVizSpec } from 'cortexel/core';

const result = validateVizSpec(payload);
if (!result.ok) console.error(result.errors);
```

## Design laws

These keep figures consistent and honest:

- **A single neuron is a sphere; a population is a glowing voxel cube** (`BoxGeometry`
  + unlit `MeshBasic`, dimmed ×0.82 so it self-luminates under bloom without
  bleaching white).
- **Passive data uses unlit `MeshBasic` (no emissive).** Emissive > 1.0 is reserved
  for active spike/synapse *events*; keep it bloom-safe (≤ ~1.15).
- **Honesty fails closed** (see below).
- **`useFrame` is allocation-free**; **the library never imports a host app.**

## Architecture

Dependency-ascending layers, each its own entrypoint:

| Entry | Deps | Contents | Status |
|-------|------|----------|--------|
| `cortexel/core` | `zod` | colormaps, palettes, GLSL strings, design-law types, `SCENE_NAMES`/`SceneName`, `VizSpec` (Zod), provenance | available |
| `cortexel/react` | + three / r3f / drei / react | `usePopulationExpand`, `ExpandablePopulation`, `VizSpecRenderer` | available |
| `cortexel/three` | three only | headless `Scene*Builder → THREE.Group` | planned |
| `cortexel/headless` | node | render-to-PNG/MP4 | planned |

The concrete r3f scene components are **injected by the host** via
`VizSpecRenderer`'s `renderScene` callback, so Cortexel has zero host dependency.

## Agent skill API

Cortexel is the authoring source of the agent-invocable NEST visualization
skills — an agent holding NEST output dicts has a typed path to an honest render:

```ts
import {
  listSkills,            // discover: 13 nest.* skills + contracts
  routeToScene,          // "I have a device family → which scene?"
  spikeRecorderToSceneData, // dict → SceneData adapter (host-agnostic)
  validateSkillInvocation,  // strict gate: params + provenance + honesty
} from 'cortexel/core';

// 1. route a NEST spike_recorder to a skill/scene
routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'events' } });
// → { ok: true, skill: 'nest.spike_raster', scene: 'spike-raster' }

// 2. validate an invocation (fail-closed): per-skill params + declared provenance
const r = validateSkillInvocation('nest.spike_raster', {
  scene: 'spike-raster',
  params: { times_ms, senders },
  provenance: {
    source: 'nest_simulation:run42',
    declared_inputs: { recorder_id, sender_ids, population_labels, time_units },
  },
});
// r.ok ? { spec, scene, caption } : { errors: [{ code, path, message, hint }] }
```

Each skill declares the NEST device family it consumes, the Cortexel `scene` it
renders to (or `null` when no honest scene exists — never mis-routed), required
params, and the structured provenance keys its honesty contract demands.
`validateSkillInvocation` enforces all of them, rejects `calibrated_posterior=true`
as unsupported, and resolves the honesty caption so the renderer can't drop it.

A language-neutral **`dist/skills.manifest.json`** is emitted at build for non-TS
hosts (e.g. a Python backend) to consume and parity-check against — one source of
truth, two derived mirrors.

## VizSpec contract

`core/vizSpec.ts` is the runtime source of truth (Zod; `VizSpec` is inferred from
it). The shape:

```ts
{ scene, params, mode, themeMode, camera?, provenance }
```

- `scene` — one of `SCENE_NAMES` (`SceneName` and the Zod enum derive from the
  same tuple, so they cannot drift).
- `params` — scene-specific. `validateVizSpec` keeps `params` opaque (lenient,
  back-compat). The strict agent path `validateSkillInvocation` enforces the
  per-skill param schema, so malformed/empty params fail at validation, not render.
- `mode` — `interactive` (default) or `export`. `export` is not yet implemented
  and returns an explicit notice rather than faking a render.
- `provenance` — see below; **required**.

A host backend **should** mirror this schema (e.g. a Pydantic model with the same
conservative defaults) as a server-side gate. Cortexel ships the client-side gate.

## Honesty model (fail-closed)

Every spec carries `provenance` with `calibrated_posterior`, `advisory_only`, and
`is_paper_local_evidence`, all defaulting to the conservative value. The renderer
shows a non-dismissible disclosure caption (with `role="note"` / `aria-live`)
**unless** the spec explicitly asserts a calibrated, paper-local posterior. There
is no misconfiguration that silently hides it. Synthetic data is captioned as
schematic. This boundary is load-bearing — see [SECURITY.md](./SECURITY.md).

### Two rendering paths

Hosts can use Cortexel's honesty model through two paths:

1. **Agent path** (`VizSpecRenderer` + `skillId`): an agent emits a VizSpec;
   `VizSpecRenderer` validates it through the strict skill gate
   (`validateSkillInvocation`), rejects `calibrated_posterior=true`, and binds
   the caption at the render boundary. Use for untrusted agent payloads.

2. **Showcase path** (`defaultHonestyCaption` + `requiresHonestyCaption`): a
   host renders its own trusted content (e.g. synthetic demo scenes) and binds
   the caption directly from the provenance functions — no VizSpec to validate,
   but the same fail-closed caption text. Use for host-authored content.

Both paths share the same honesty model; the difference is whether the payload
is untrusted (agent → validate) or trusted (host → bind directly).

## Population expand

Populations expand into their constituent neurons on click/tap.
`usePopulationExpand` owns the selection/hover state (with an optional controlled
override so a scene that already owns the state does not get a second owner);
`ExpandablePopulation` is the shared voxel hub. It honors
`prefers-reduced-motion`.

## Development

```bash
bun install
bun run check   # typecheck + tests
bun run build   # tsup → dist/ (ESM + CJS + d.ts)
```

See [CONTRIBUTING.md](./CONTRIBUTING.md). Cortexel is a standalone library in its
own repository; it is consumed as a git dependency by host applications.

## License

[MIT](./LICENSE) © Sepehr Mahmoudian
