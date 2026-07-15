# Known limitations of the 0.9.0 development preview

0.9.0 is a **pre-1.0 development preview**. It makes no stable-contract claim, and this
document is the honest list of what is not yet done — the alternative to a green
checkmark that isn't earned. Each item names what exists, what does not, and the gate
that closes it.

The machine-readable state of every release gate is in
[`docs/release/evidence-ledger.v1.json`](./release/evidence-ledger.v1.json).

## Scientific evidence

- **No pinned reference environment has been executed.** The independent oracle
  (`reference/`) is scaffolded but not run: NEST, Elephant, Neo, and PyNWB are not
  installed or executed anywhere in this repository. Every skill contract's
  `evidence.externalOracle.status` is `not_run`, and the corresponding ledger gates are
  `NOT_RUN`. The **hand-computable** golden layer (`test/analysis.test.ts`) IS executed
  and passing; it is the floor of evidence, not the whole of it. *Gate: R031, R047–R064
  external layers.*
- **Multi-rank NEST topology is not certified.** The MPI scope rules are validated
  against hand vectors and the scope validator; they have not been run against a real
  multi-rank NEST simulation. *Gate: R067–R069.*

## Rendering

- **Render-plan compilers cover the trace and population-rate families end to end.** A
  validated request for any other family produces a complete, correct artifact
  (validation, provenance, disclosures, digests) with an explicit `renderPending` marker
  naming the renderer, rather than a crash or a fabricated figure. The remaining family
  compilers (raster, distribution bars, matrix, spatial map, graph, phase plane,
  correlogram, response curve) land incrementally, each with its own goldens. *Gate:
  R081–R082.*
- **The compiler is family-based, not one-file-per-skill.** The blueprint's target is one
  compiler file per stable skill for reviewability. 0.9.0 uses a single well-tested
  compiler per geometric family, which is more trustworthy than fifteen near-duplicates
  but is a different file layout. Splitting is a pre-1.0 refactor; it changes the layout,
  never the output.
- **Accessibility summaries are not yet fully value-filled.** The deterministic summary
  template is emitted, but its `{placeholder}` tokens are not all substituted with the
  derived values yet, so a screen reader currently hears the template with ellipses in
  place of some numbers. The exact-value **table** and the **disclosures** are complete
  and correct. *Gate: R098, R104–R109.*
- **Text metrics are nominal.** Layout uses fixed margins and a generic font stack rather
  than a bundled metrics table, so a very long tick label could overflow its gutter.
  Byte-determinism holds regardless. *Gate: R083–R085.*

## Cross-language

- **The Python package is generated but not a full independent validator yet.** The
  contract, identity, units, and budgets are mirrored into `python/src/cortexel/generated`
  and stay in lockstep via the generator. An independent Python parser, canonicalizer,
  and semantic-validator implementation — the second reader that would let the portable
  schema be cross-checked — is not yet built. *Gate: R019 Python side, R022 Python
  parity, R071–R076, R134–R135.*

## Adapters

- **NEST/Neo/NWB/NCP adapters are specified in the contracts but not implemented.** Each
  skill's `adapters` block records the intended mapping and its status. The NCP adapter is
  and will remain `experimental` until an immutable NCP release is certified; it is never
  certified against NCP's moving HEAD. *Gate: R065–R077.*

## Packaging and release

- **The build still targets the pre-1.0 `core/` + `react/` layout.** The new `src/` tree
  (contract kernel, analysis, render, CLI) is fully tested but is not yet the packaged
  build output, and the committed `dist/` still reflects the legacy layout. Wiring the new
  entry points into the package export map and untracking `dist/` is packaging work.
  *Gate: R097, R127–R140.*
- **No package is published.** Nothing has been pushed to npm or PyPI, and no DOI has been
  minted. The npm/PyPI/CI badges in the README are inactive by design. *Gate:
  R141–R155.*
- **CI still runs the legacy single-gate workflow.** The tiered CI / nightly / release
  workflows described in the blueprint are not yet configured. *Gate: R098.*

## Flaky test

- `test/coreIsHostAgnostic.test.ts` (a LEGACY test) spawns a subprocess import of the old
  `core/` and can time out at 5 s under parallel load; it passes in isolation. Per the
  blueprint a flaky test is a defect — this one is resolved when the legacy `core/` tree
  is removed in the source-layout migration.
