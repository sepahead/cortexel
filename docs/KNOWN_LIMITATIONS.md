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
  `NOT_RUN`. `test/analysis.test.ts` executes hand-computable checks for selected
  binning, population-rate, ISI, correlogram, and topology rules. That is useful unit
  evidence, but it is not an independent golden corpus for every stable contract.
  *Gates: R031–R059.*
- **Multi-rank NEST topology is not certified.** The MPI scope rules are validated
  against hand vectors and the scope validator; they have not been run against a real
  multi-rank NEST simulation. *Gates: R040–R045, R050–R051.*

## Rendering

- **There is a 19-family breadth smoke test, not 19-family semantic certification.**
  `test/renderAllFamilies.test.ts` renders only the **first** valid example from each
  stable contract twice in one process and checks non-empty, byte-identical SVG plus a
  small active-content safety set. It does not cover every valid example, scientific
  mode, normalization, unit conversion, missing-data policy, derivation receipt,
  disclosure, table/sidecar, supported Node/OS tuple, or cross-platform byte identity.
  The per-family derivation and rendering gates therefore remain `NOT_RUN`.
  *Gates: R047, R060–R066, R074–R083.*
- **Render compilers are family-based, not one-file-per-skill.** The blueprint's target is
  one compiler file per stable skill for reviewability. 0.9.0 uses shared compiler
  functions per geometric family (trace, step, bars, raster, matrix, scatter, stems,
  points-with-guide, trajectory, graph). This is a different review surface from the
  one-compiler-per-contract gate and has not earned that gate.
- **The visual system is functional, not yet publication-tuned.** Covered smoke examples
  render with a single accent colour and fixed layout; that statement does not certify
  their scientific derivations. The full versioned palette application (per-series
  Okabe-Ito tuples, perceptual colour maps for matrices,
  uncertainty bands), legends, and print/grayscale themes are specified in
  `contract/registries/palettes.v1.json` but not yet fully applied by the compilers.
  *Gates: R076–R077, R082–R083.*
- **Accessibility summaries are value-filled but generic.** Each figure's accessible
  summary now states its title, row count, the numeric range of its value column, and its
  disclosures with the figure's own numbers (the same text in the plan, the SVG `<desc>`,
  and the artifact). It does not yet include every per-skill detail the summary *template*
  in each contract describes (for example the exact bin width or trial count).
  Exact-table completeness, complete sidecars, and visual/alternative disclosure parity
  are not certified. *Gates: R074–R085.*
- **Text metrics are nominal.** Layout uses fixed margins and a generic font stack rather
  than a bundled metrics table, so a very long tick label could overflow its gutter.
  Covered examples are byte-identical across repeated runs in one process; the
  documented cross-platform identity tuple has not been certified. *Gates: R062, R064.*

## Cross-language

- **The independent Python reader exists and agrees with TypeScript byte-for-byte on
  digests.** `python/src/cortexel/` provides strict parsing (duplicate-key and
  prototype-key rejection), RFC 8785 canonicalization matching ECMAScript number
  formatting and UTF-16 key ordering, SHA-256 digests, contract identity, and structural
  + unit-semantic validation — all pure standard library, no Node, no `jsonschema`.
  `test/crossLanguageParity.test.ts` compares the valid contract examples plus one forged
  caller-assurance case and one unit-alias case when Python is importable. It does not
  establish the full generated-source or positive/negative/boundary/metamorphic/migration
  conformance gates. *Gates: R015, R019.*
- **The Python semantic-validator port is partial.** The caller-authority boundary and the
  unit rules (alias rejection, dimension matching) are ported and agree with TypeScript.
  The deeper scientific validators (rate re-derivation, reference-in-universe, correlogram
  denominator, topology scope) are TypeScript-only for 0.9.0 and are ported incrementally;
  the parity test asserts agreement only on what Python actually implements.
  *Gates: R015, R019, R111.*

## Adapters

- **The NEST spike-recorder adapter (plain-data path) is implemented** (`src/adapters/nest/`):
  it snapshots an exported NEST spike-recorder object, requires the recorded sender universe
  (never inferring it), does not assume chronological events, and produces a
  `neuro.spike_raster` request that passes the implemented validation/render path for the
  repository's plain-object fixtures. It has not been tested against real, version-pinned
  NEST output, so the NEST adapter certification gate remains `NOT_RUN`.
  The remaining NEST paths (connections, positions, multimeter) and the Neo/NWB/NCP adapters
  are specified in the contracts but not yet implemented. The NCP adapter is and will remain
  `experimental` until an immutable NCP release is certified — never against moving HEAD.
  *Gates: R049–R059.*

## Packaging and release

- **The build still targets the pre-1.0 `core/` + `react/` layout.** The new `src/` tree
  (contract kernel, analysis, render, CLI) has development-test coverage but is not yet the packaged
  build output, and the committed `dist/` still reflects the legacy layout. Wiring the new
  entry points into the package export map and untracking `dist/` is packaging work.
  *Gates: R099–R107.*
- **No package is published.** Nothing has been pushed to npm or PyPI, and no DOI has been
  minted. The npm/PyPI/CI badges in the README are inactive by design. *Gate:
  R108, R134–R155.*
- **CI is a development workflow, not a release-certification matrix.** It runs
  contract, TypeScript, Python, and package-smoke jobs, but does not implement the full
  supported Node/OS matrix, nightly/RC soak, clean-room reproduction, or protected
  trusted-publishing workflow. In particular, the package-smoke matrix is Node 20/22/24,
  not the R098 policy's Node 22/24/26 set. *Gates: R098, R103, R116, R134–R155.*

## Flaky test

- `test/coreIsHostAgnostic.test.ts` (a LEGACY test) spawns a subprocess import of the old
  `core/` and can time out at 5 s under parallel load; it passes in isolation. Per the
  blueprint a flaky test is a defect; removal of the legacy tree is not counted as a fix
  until the relevant release check is rerun without quarantine or retry.
