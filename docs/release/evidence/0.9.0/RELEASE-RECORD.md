# Cortexel 0.9.0 — release record

**0.9.0 is a pre-1.0 development preview.** It is published so a supervisor and
collaborators can review the design and implementation. It makes **no stable-contract
claim**, publishes **no package** to npm or PyPI, and mints **no DOI**. The full 1.0
release process (immutable build, trusted publishing, three-pass certification,
external scientific review) is deliberately *not* run here; see
[`ROADMAP.md`](../../../../ROADMAP.md).

## What this release is

A development snapshot of the contract kernel, selected scientific-analysis primitives,
and a working render/CLI slice. The evidence ledger was reconciled after an adversarial
receipt audit: only a gate whose cited evidence directly proves the whole requirement
remains `PASS`.

| Area | State |
|---|---|
| Contract authority (`contract/`) | 19 semantically stable, source-only skill contract files plus shared schemas and registries; no `FigureBundleV1` capability or implementation |
| Contract kernel (`src/core/`) | strict parser, safe snapshot, canonicalization, SHA-256, validation pipeline, disclosure engine, and migration code; only the ledger-listed properties are release-certified |
| Analysis (`src/analysis/`) | hand-computable tests for selected binning, rate, ISI, correlogram, and topology rules; not a golden corpus for every stable contract |
| Render (`src/render/`) | RenderPlanV1 and deterministic SVG implementation; one first-valid-example smoke per stable family, not full semantic/compiler certification |
| Adapters (`src/adapters/`) | NEST spike-recorder plain-object adapter fixtures; no real, version-pinned NEST output certification |
| Cross-language (`python/`) | independent Python reader with limited digest/validation parity coverage; the full conformance corpus is not certified |
| CLI (`src/cli/`) | identity, catalog, validate, render, inspect, and migrate commands are implemented in source; package.json has no `bin`, and release packaging and compatibility gates are not certified |
| Docs & governance | SCOPE, PROVENANCE, VERSIONING, SECURITY_MODEL, GOVERNANCE, SUPPORT, ROADMAP, MIGRATION, KNOWN_LIMITATIONS |

## Evidence

- **Historical aggregate test report:** 921 tests across 36 files plus the Python suite
  were reported for the preview. An aggregate green suite is not treated as evidence for
  a gate whose full requirement was not exercised.
- **Evidence ledger:** 4 of 155 gates remain `PASS`; 151 are `NOT_RUN`. The retained
  receipts directly support R009, R012, R013, and R023. See
  [`KNOWN_LIMITATIONS.md`](../../../KNOWN_LIMITATIONS.md). The ledger checker
  ([`scripts/check-evidence-ledger.ts`](../../../../scripts/check-evidence-ledger.ts))
  rejects a `PASS` without a structurally complete receipt; this audit additionally
  checked that each retained receipt proves the gate it is attached to.
- **Generated files:** a deterministic freshness checker exists, but the original R020
  receipt recorded `bun run test`, not a clean-checkout `bun run check:generated`; R020
  is therefore `NOT_RUN`.
- **Build:** no clean-build/reproducibility receipt is retained; R107 is `NOT_RUN`.

## What is explicitly NOT claimed

- No independent scientific oracle (NEST, Elephant) has been executed. Every skill
  contract's external-oracle status is `not_run`; only the hand-computable golden layer
  for selected primitives has run.
- The first-example render smoke does not establish that every contract example, mode,
  unit path, normalization, disclosure, table/sidecar, or cross-platform byte identity is
  correct.
- No package is installable from a registry. The new `src/` tree has development tests
  but is not yet the packaged build output.
- The Python implementation is independent code, but its semantic coverage is partial
  and it does not run the full TypeScript conformance corpus.
- The plain-object spike-recorder adapter exists; real NEST output, the remaining NEST
  adapters, and the Neo/NWB/NCP adapter gates are not certified.
- No whole-page accessibility, determinism-across-platforms, or performance claim is
  made beyond what the tests in this repository enforce.

## Toolchain

Node v26.3.0, Bun 1.3.14, TypeScript 5.9.3.

## Authorization

This is a pre-1.0 preview, not a stable release. No stable-release authorization applies.
The immutable annotated tag `v0.9.0` identifies commit
`d29669e6d5b1766fd96e1eacefb02b3f43c5ce61`. Its annotation preserves the original
46-PASS/109-NOT_RUN count; this later audit corrects the ledger and release record without
rewriting the historical tag.

Author: Sepehr Mahmoudian.
