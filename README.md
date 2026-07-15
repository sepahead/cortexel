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

> **Status: `0.9.0` — a pre-1.0 development preview. There is no stable release, no
> published package, and no DOI.** `main` may still change. Do not cite HEAD as a
> released product.
>
> The honest, gate-by-gate state of the release is in
> [`docs/KNOWN_LIMITATIONS.md`](./docs/KNOWN_LIMITATIONS.md) and the machine-readable
> [`docs/release/evidence-ledger.v1.json`](./docs/release/evidence-ledger.v1.json). A
> gate is only `PASS` when it carries a reproducible receipt.

**Cortexel** turns a strict request into a canonical, inspectable **figure artifact**
for neural-simulation data. An agent, an adapter, or a person emits a declarative
JSON request; Cortexel validates its shape and its *scientific meaning*, canonicalizes
it, records honest provenance that **fails closed**, and renders a deterministic,
accessible SVG — plus an exact-value table and a verifiable artifact bound together by
SHA-256.

The value is in the **contract and its invariants**, not in a pile of chart code.
Cortexel refuses to make a plausible-looking figure from an ambiguous input, and every
output it does make can be inspected, reproduced, and challenged.

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
               ──▶  semantic validation (35 named scientific rules)
               ──▶  canonicalize (RFC 8785)  ──▶  branded validated request
               ──▶  derive (deterministic analysis)
               ──▶  compile pure render plan
               ──▶  deterministic SVG + exact-value table + FigureArtifactV1
```

Every stage is independently testable. No renderer can bypass validation: rendering
accepts only the branded token the validator produces.

## Quick look (CLI)

```bash
# What contract and identity is this build?
cortexel identity --json

# List the 19 stable figure contracts (experiments are hidden unless asked).
cortexel catalog

# Validate a request from a file or stdin. Exit code 0 = valid.
cortexel validate request.json

# Render a deterministic SVG plus an artifact and a data table, written atomically.
cortexel render request.json --output figure.svg
```

The CLI is offline: no network, no shell hook, no `--url`. Exit codes are a stable
contract (`0` ok, `2` usage, `3` parse, `4` schema, `5` semantic, `6` budget, `7` I/O,
`8` internal).

## The stable catalog

Nineteen single-figure contracts plus the `figure.bundle` composition kind:

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

3D scenes, the evidence knowledge graph, and animation are **experimental** — they
carry no stable contract, determinism, or accessibility guarantee, and are never
counted among the stable figures.

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
