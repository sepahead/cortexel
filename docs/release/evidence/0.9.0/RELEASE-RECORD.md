# Cortexel 0.9.0 — release record

**0.9.0 is a pre-1.0 development preview.** It is published so a supervisor and
collaborators can review the design and implementation. It makes **no stable-contract
claim**, publishes **no package** to npm or PyPI, and mints **no DOI**. The full 1.0
release process (immutable build, trusted publishing, three-pass certification,
external scientific review) is deliberately *not* run here; see
[`../../../ROADMAP.md`](../../../ROADMAP.md).

## What this release is

A coherent, tested implementation of the contract kernel, the deterministic scientific
core, and a working render/CLI slice — with an honest evidence ledger recording exactly
what was and was not executed.

| Area | State |
|---|---|
| Contract authority (`contract/`) | 19 stable skill contracts + shared schemas + registries, one generated authority |
| Contract kernel (`src/core/`) | strict parser, safe snapshot, RFC 8785 canonicalization, dependency-free SHA-256, validation pipeline, 35 semantic validators, disclosure engine, migration |
| Analysis (`src/analysis/`) | bins, events, ISI, rate, correlogram, topology — certified by hand-computable golden vectors |
| Render (`src/render/`) | RenderPlanV1, deterministic safe SVG, family compilers (population-rate + trace end to end) |
| CLI (`src/cli/`) | identity, catalog, validate, render, inspect, migrate — offline, stable exit codes |
| Docs & governance | SCOPE, PROVENANCE, VERSIONING, SECURITY_MODEL, GOVERNANCE, SUPPORT, ROADMAP, MIGRATION, KNOWN_LIMITATIONS |

## Evidence

- **Tests:** 921 passing across 36 files (plus the independent Python suite) (`bun run test`).
- **Evidence ledger:** 46 of 155 gates `PASS` with reproducible receipts; 109 `NOT_RUN`.
  Every `NOT_RUN` is an honest state, enumerated in
  [`../../KNOWN_LIMITATIONS.md`](../../KNOWN_LIMITATIONS.md). The ledger checker
  ([`scripts/check-evidence-ledger.ts`](../../../scripts/check-evidence-ledger.ts))
  rejects a `PASS` without a receipt.
- **Generated files:** fresh and deterministic (`bun run check:generated`).
- **Build:** `dist/` unchanged and reproducible.

## What is explicitly NOT claimed

- No independent scientific oracle (NEST, Elephant) has been executed. Every skill
  contract's external-oracle status is `not_run`; only the hand-computable golden layer
  has run.
- No package is installable from a registry. The new `src/` tree is tested but is not yet
  the packaged build output.
- The Python package is a generated mirror, not yet an independent validator.
- The adapters are specified in the contracts but not implemented.
- No whole-page accessibility, determinism-across-platforms, or performance claim is
  made beyond what the tests in this repository enforce.

## Toolchain

Node v26.3.0, Bun 1.3.14, TypeScript 5.9.3.

## Authorization

This is a pre-1.0 preview, not a stable release. No stable-release authorization applies.
The tag `v0.9.0` marks the reviewed development preview at this commit.

Author: Sepehr Mahmoudian.
