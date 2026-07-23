<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img alt="Cortexel logo" src="assets/logo-light.svg" width="200">
  </picture>
</p>

# Cortexel

<!-- CI badge activates once the tiered workflow is in place; see ROADMAP.md -->
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](#)
<!-- npm and PyPI badges are intentionally inactive: no package is published yet. -->

> **Status: `0.9.0` is the last tagged pre-1.0 development release. This working tree
> identifies itself as the private, unreleased `0.10.0-dev.0`; it is not a release. There
> is no stable release, published package, or DOI.** `main` may still change. Do not cite
> HEAD or the development version as a released product.
>
> The honest, gate-by-gate state of the release is in
> [`docs/KNOWN_LIMITATIONS.md`](./docs/KNOWN_LIMITATIONS.md) and the machine-readable
> [`docs/release/evidence-ledger.v1.json`](./docs/release/evidence-ledger.v1.json). A
> gate is only `PASS` when it carries a reproducible receipt.

**Cortexel** turns a strict request into a canonical, inspectable **figure artifact**
for neural-simulation data. An agent, an adapter, or a person emits a declarative
JSON request; Cortexel validates its shape and its *scientific meaning*, canonicalizes
it, records honest provenance that **fails closed**, and renders a deterministic,
accessible SVG. The development API also returns an exact-value in-memory table and a
FigureArtifactV1 whose output inventory binds the SVG by SHA-256. A canonical,
digest-bound table sidecar and detached output verifier are not implemented yet; the
render boundary refuses any result that would require an incomplete table excerpt.

The value is in the **contract and its invariants**, not in a pile of chart code.
Cortexel refuses to make a plausible-looking figure from an ambiguous input, and every
output it does make can be inspected, compared, and challenged. Current development
artifacts report `sourceRevision: "unreleased-worktree"`; exact commit recovery requires
a separately retained full SHA until a release-stamping producer exists.

## What it is — and is not

Cortexel is a **closed, versioned catalog of scientifically constrained figure
contracts**. It is deliberately *not* a general visualization grammar, a notebook
environment, a storage format, or a simulator. See [`docs/SCOPE.md`](./docs/SCOPE.md)
for the normative boundary.

The defining rule: **a caller declares what its data *is*; it never declares what
Cortexel concluded about it.** Validation results, disclosures, digests, and
calibration claims are library-generated facts — a request that tries to set one is
rejected, not obeyed. See [`docs/PROVENANCE.md`](./docs/PROVENANCE.md).

## The pipeline

```text
raw JSON text  ──▶  strict parse (rejects duplicate keys before materialization)
               ──▶  caller-authority check (no forged conclusions)
               ──▶  contract identity
               ──▶  structural validation (JSON Schema 2020-12, no coercion)
               ──▶  semantic validation (closed, named scientific rules)
               ──▶  canonicalize (RFC 8785)  ──▶  branded validated request
               ──▶  derive (deterministic analysis)
               ──▶  compile pure render plan
               ──▶  close/freeze plan + OutputAuthority translation gate
               ──▶  deterministic SVG + complete returned exact-value table
               ──▶  FigureArtifactV1 (binds SVG bytes and table shape, not table cells)
```

Every stage is independently testable. Each public rendering entrypoint either validates
its input itself or accepts only the live branded token the validator produces. The raw
RenderPlan model, resource counter, formatter/scale primitives, and SVG serializer are
internal and are not exported from `cortexel/render-svg`. The internal OutputAuthority
gate independently checks exact plan table rows, source-template summary, disclosures,
and role-tagged carrier identities immediately before serialization. It is deliberately
plan-level, non-persisted, and carrier-only; it does not establish SVG bytes, coordinates,
visibility, accessibility effectiveness, or artifact-bound table cells. See
[`docs/OUTPUT_AUTHORITY.md`](./docs/OUTPUT_AUTHORITY.md).

## Additive package surfaces

The installable artifact preserves every legacy entry (`cortexel`, `cortexel/core`,
the three React subpaths, and `cortexel/skills.manifest.json`) and adds explicit
FigureRequestV1 capabilities alongside them:

- `cortexel/figure` — validation, canonicalization, identity, provenance, and migration;
- `cortexel/render-svg` — deterministic headless SVG + complete returned table;
- `cortexel/adapters/nest` — the narrow, revision-2-admitted plain-data NEST adapter
  profile (not upstream certification);
- `cortexel/contract/manifest.json` and `cortexel/contract/*` — the exact normative
  registries, schemas, and skill sources copied once under `dist/contract`;
- `cortexel` (bin) — the offline CLI.

These paths load no React, Three, R3F, or D3. Structural validation reads only the
module-relative packaged contract files; it never resolves a schema from the working
directory or network. **Packaged** describes the output of this repository's build and
tarball. It does not mean the package has been published, and it does not make any
skill `releaseReady`; all nineteen remain `releaseReady: false`.

## Offline CLI

After installing the artifact, invoke the bin directly; from a repository checkout,
`bun src/cli/main.ts ...` exercises the same implementation:

```bash
# What contract and identity is this build?
cortexel identity --json

# List the 19 stable figure contracts (experiments are hidden unless asked).
cortexel catalog

# Validate a request from a file or stdin. Exit code 0 = valid.
cortexel validate request.json

# Render an SVG plus its SVG-binding artifact. Final entries are inspected without
# following symlinks. One cooperative directory-wide lock covers case/Unicode aliases;
# a pre-existing lock is never guessed stale. Non-force publication is atomic no-replace
# (or refuses when unavailable), and the artifact is installed last as the completion
# marker. The pair is not a transaction; the host must own the output directory.
# tableBinding=shape_only records that no canonical row-byte sidecar exists.
cortexel render request.json --output figure.svg

# Machine-readable validation and render receipts use the closed JSON format.
cortexel render request.json --dry-run --format json
```

The CLI is offline: no network, no shell hook, no `--url`. Its packaged interface has
a closed, tested exit-code vocabulary (`0` ok, `2` usage, `3` parse, `4` schema,
`5` semantic, `6` budget, `7` I/O, `8` internal). File and stdin input is bounded before
decoding, malformed UTF-8 and a BOM are rejected rather than normalized, and duplicate
JSON members remain observable to the strict parser. If a writer crashes while holding
the lock, recovery is deliberately manual: remove `.cortexel.figure-emission.lock` only
after establishing that no publisher is alive. `validate` and `render` accept
`--format json`; `migrate` is always JSON.

## The semantically stable packaged catalog

Nineteen single-figure contracts:

**Neural signals & events** — `neuro.analog_trace`, `neuro.spike_raster`,
`neuro.population_rate`, `neuro.response_curve`, `neuro.isi_distribution`,
`neuro.psth`, `neuro.correlogram`, `neuro.phase_plane`, `neuro.multisignal_trace`,
`neuro.compartment_trace`.

**Network topology** — `network.connection_graph`, `network.adjacency_matrix`,
`network.weight_matrix`, `network.delay_matrix`, `network.degree_distribution`,
`network.delay_distribution`, `network.weight_distribution`,
`network.spatial_map_2d`, `network.synaptic_weight_trace`.

Each contract lives in [`contract/skills/`](./contract/skills/) with its scientific
purpose, closed request schema, named validators, budgets, disclosures, an
accessibility table, migration mapping, and living valid/invalid examples that the
test suite executes.

The packaged pre-1.0 React surface still contains legacy WebGL scenes, and its explicit
`cortexel/react/knowledge-graph` subpath is experimental. No 3D, knowledge-graph,
animation, NCP-adapter, or bundle skill/compiler exists in the FigureRequestV1 catalog;
stable validation fails closed instead of inventing those capabilities.

## Why the invariants matter

A few examples of what Cortexel refuses to get subtly wrong:

- A **population rate**'s denominator counts the *recorded* neurons, including the
  silent ones — never the ones that happened to spike, which would inflate every rate.
- An **inter-spike interval** is formed only *within a train*, never between two
  neurons whose spikes happen to be adjacent in time.
- A **rank-local** MPI connection snapshot can support a local in-degree but **can
  never** claim a global out-degree — the outgoing connections live on another rank.
- A **matrix** cell that was never observed stays visibly distinct from a measured
  zero; a **multapse** is never collapsed by "last edge wins".
- A **unit alias** (`milliseconds`) is rejected with a repair pointing at the
  canonical code (`ms`) rather than silently converted — a conversion the caller
  never sees is a number the caller never checked.

## Contract identity

Everything under [`contract/`](./contract/) is the single normative source. TypeScript
types, the runtime catalog, per-skill schemas, the Python mirror, and a SHA-256
contract digest are all **generated** from it (`bun run generate`) and CI fails if any
generated file drifts. Run twice, it is byte-identical.

## Working on Cortexel

```bash
bun install
bun run generate        # derive all generated artifacts from contract/
bun run check:generated # fail if generated files drift or generation is non-deterministic
bun run typecheck
bun run test            # the full suite
```

- [`AGENTS.md`](./AGENTS.md) — building figures *with* Cortexel.
- [`CLAUDE.md`](./CLAUDE.md) / [`CONTRIBUTING.md`](./CONTRIBUTING.md) — working *on* Cortexel.
- [`docs/SCOPE.md`](./docs/SCOPE.md), [`docs/PROVENANCE.md`](./docs/PROVENANCE.md),
  [`docs/VERSIONING.md`](./docs/VERSIONING.md),
  [`docs/SECURITY_MODEL.md`](./docs/SECURITY_MODEL.md),
  [`GOVERNANCE.md`](./GOVERNANCE.md), [`ROADMAP.md`](./ROADMAP.md).

## License

MIT © Sepehr Mahmoudian. See [`LICENSE`](./LICENSE).
