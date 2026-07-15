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

- **All 19 stable families now render end to end.** Every stable skill's valid example
  derives through `src/analysis` and compiles to a deterministic, byte-stable SVG
  (`test/renderAllFamilies.test.ts` asserts this for all 19, including SVG safety). The
  compilers are geometric approximations sufficient for the contract's semantics —
  faithful to the analysis, but not yet publication-tuned (see the visual-system note
  below). *Gate: R081–R082.*
- **Render compilers are family-based, not one-file-per-skill.** The blueprint's target is
  one compiler file per stable skill for reviewability. 0.9.0 uses a single well-tested
  compiler per geometric family (trace, step, bars, raster, matrix, scatter, stems,
  points-with-guide, trajectory, graph), which is more trustworthy than fifteen
  near-duplicates but is a different file layout. Splitting is a pre-1.0 refactor; it
  changes the layout, never the output.
- **The visual system is functional, not yet publication-tuned.** Figures render with the
  correct semantics, a single accent colour, and fixed layout. The full versioned palette
  application (per-series Okabe-Ito tuples, perceptual colour maps for matrices,
  uncertainty bands), legends, and print/grayscale themes are specified in
  `contract/registries/palettes.v1.json` but not yet fully applied by the compilers.
  *Gate: R096–R106.*
- **Accessibility summaries are not yet fully value-filled.** The deterministic summary
  template is emitted, but its `{placeholder}` tokens are not all substituted with the
  derived values yet, so a screen reader currently hears the template with ellipses in
  place of some numbers. The exact-value **table** and the **disclosures** are complete
  and correct. *Gate: R098, R104–R109.*
- **Text metrics are nominal.** Layout uses fixed margins and a generic font stack rather
  than a bundled metrics table, so a very long tick label could overflow its gutter.
  Byte-determinism holds regardless. *Gate: R083–R085.*

## Cross-language

- **The independent Python reader exists and agrees with TypeScript byte-for-byte on
  digests.** `python/src/cortexel/` provides strict parsing (duplicate-key and
  prototype-key rejection), RFC 8785 canonicalization matching ECMAScript number
  formatting and UTF-16 key ordering, SHA-256 digests, contract identity, and structural
  + unit-semantic validation — all pure standard library, no Node, no `jsonschema`. The
  cross-language parity test (`test/crossLanguageParity.test.ts`) confirms the two agree
  on the canonical digest of every contract example and on acceptance/rejection.
- **The Python semantic-validator port is partial.** The caller-authority boundary and the
  unit rules (alias rejection, dimension matching) are ported and agree with TypeScript.
  The deeper scientific validators (rate re-derivation, reference-in-universe, correlogram
  denominator, topology scope) are TypeScript-only for 0.9.0 and are ported incrementally;
  the parity test asserts agreement only on what Python actually implements. *Gate: R019
  Python side, R071–R076.*

## Adapters

- **The NEST spike-recorder adapter (plain-data path) is implemented** (`src/adapters/nest/`):
  it snapshots an exported NEST spike-recorder object, requires the recorded sender universe
  (never inferring it), does not assume chronological events, and produces a
  `neuro.spike_raster` request that passes the full validation gate and renders end to end.
  The remaining NEST paths (connections, positions, multimeter) and the Neo/NWB/NCP adapters
  are specified in the contracts but not yet implemented. The NCP adapter is and will remain
  `experimental` until an immutable NCP release is certified — never against moving HEAD.
  *Gate: R065–R077.*

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
