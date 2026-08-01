# NEST 3.10 example visualization classification V2

This audit answers a deliberately narrower question than “does Cortexel support
all NEST visualizations?” It classifies the visualization intent visible in the
exact source bytes of every canonical official PyNEST example body at pinned NEST
commit `acca9704da248750219a027db99fec6cd1f9052a`. It does not run NEST, Matplotlib,
Sphinx, or any example.

The machine-readable source of truth is
[`nest-example-coverage.v2.json`](./nest-example-coverage.v2.json), validated by
[`nest-example-coverage.v2.schema.json`](./nest-example-coverage.v2.schema.json)
and `scripts/lib/nest-example-visualization-coverage.ts`. The generated artifact
is canonical RFC 8785 JSON and binds the complete reviewed projection with a
domain-separated SHA-256 digest.

## Closed denominators

The pinned source inventory supplies the identities and bytes. V2 keeps its
denominators disjoint:

| Denominator | Partition | Meaning |
|---|---:|---|
| 98 canonical official bodies | 84 active, 1 import-only, 13 no visualization operation | Each canonical body is classified exactly once. |
| 11 support/coordinated bodies | 2 active helpers, 9 no visualization operation | These are not extra official examples. |
| 109 regular Python bodies | 86 active, 1 import-only, 22 no visualization operation | Reconciliation of the two body sets above. |
| 3 Python symlink aliases | aliases only | They resolve to canonical bodies and never increase the body count. |
| 92 default-runner profiles | selector definitions only | Runner selection is neither a new body nor execution evidence. |
| 12 example-tree visual assets | checked-in source assets only | Presence is not proof that an example emitted or semantically matches an asset. |
| selected documentation corpus | separate 784-blob source inventory | Script definitions, notebook stored output, media, and directives are not example-body execution evidence. |

The sole import-only body is `pynest/examples/hpc_benchmark.py`, which imports
`nest.raster_plot` at line 98 but contains no active visualization call. Its
docstring also refers to the separately inventoried checked-in
`hpc_benchmark_connectivity.svg`; that static documentation reference is not an
active Python visualization operation. The two active support helpers are
`EI_clustered_network/helper.py` and `sudoku/helpers_sudoku.py`.

“Active” means an uncommented source-level plotting or visualization operation
was found in a complete review of the pinned body. It does not mean the relevant
branch ran, the program completed, the figure was nonempty, or any output existed.
The line anchors in the artifact are navigation aids. The full source SHA-256 and
Git blob identity, inherited from the pinned source inventory, bind the reviewed
bytes.

For an independent review during this milestone, all 109 regular Python bodies
were retrieved from the official GitHub raw-content endpoint at the exact commit.
Every retrieved body reproduced both the source inventory's SHA-256 and Git blob
SHA-1 before review. That temporary review checkout was not retained as a durable
execution receipt, so the existing source inventory—not this review procedure—is
the durable byte authority. No upstream source was imported or executed.

## What the capability axes mean

V2 names 24 semantic demand families. Thirteen have a plausible complete stable
skill candidate, four have only a partial candidate, and seven have no current
stable candidate. Those words describe source-level representability only.

Each family keeps five axes independent:

1. `stableRepresentability` identifies only a source-review candidate stable
   skill. It is not an admitted mapping from an official example.
2. `executableAdapter` records executable package reality. The only candidate is
   exact `nest-spike-recorder.v5`, and no official example is asserted to match
   that profile.
3. `renderer` identifies a packaged renderer candidate for a validated stable
   request. It is not an upstream comparison.
4. `upstreamParity` is `not_run` for every demand.
5. `scientificCertification` is `not_run` for every demand.

Accordingly, all execution-bound output, example-specific mapping, executable
adapter match, renderer-parity, upstream-execution, and scientific-certification
counts remain zero. V2 is a semantic source classification, not a coverage
certificate.

The most frequent source demands across the 86 active regular bodies are spike
raster (27 bodies), analog trace (19), multisignal trace (17), measured 2D spatial
connectivity (12), and weight matrix (10). Presentation is equally important:
37 active bodies require multiple panels, 37 require same-axis overlays, and 23
combine more than one semantic capability. A collection of isolated chart skills
therefore cannot reproduce the reviewed presentation intent by itself.

## Minimal FigureBundleV1 presentation grammar

Complete semantic representability needs a bounded composition contract; it does
not need arbitrary HTML, CSS, plotting code, or callback execution. A minimal
`FigureBundleV1` should contain:

- an exact bundle contract identity and a bounded ordered panel list;
- a fixed grid with integer row, column, and span coordinates and closed panel
  limits;
- one independently validated `FigureRequestV1` skill revision per panel;
- explicit same-capability series overlays, plus a separate cross-capability
  overlay rule that is admitted only when coordinate dimensions, units, domains,
  missing-value policy, and source identities are compatible;
- explicit shared-axis groups, with no implicit normalization, interpolation,
  resampling, or unit conversion;
- bounded legends, color-scale placement, panel titles, factual rules, and
  caller-authored annotations marked as unverified declarations;
- closed policies for uncertainty bands, error bars, and secondary axes rather
  than renderer-specific escape hatches;
- a deterministic bundle artifact containing the composed SVG, the ordered
  panel artifacts/tables, panel-to-mark identities, and a visible caption index;
- aggregate budgets for panels, marks, labels, serialized bytes, and sidecars;
  exceeding any budget must fail closed rather than omit content silently.

Every panel keeps its own provenance, OutputAuthority, caption, and source table.
A bundle-level caption may summarize them but cannot replace, weaken, reorder, or
hide any panel disclosure. Bundle publication needs one receipt binding the exact
panel requests, panel artifacts, layout grammar, renderer revisions, and output
bytes.

`FigureBundleV1` must not be used to disguise a missing data contract. Three-
dimensional measured geometry, covariance-matrix history, categorical grids,
source-bound images, and animation timing need their own semantic/artifact
contracts first. Animation should use a separately versioned artifact with frame
identity, duration, ordering, loop policy, reduced-motion fallback, and a static
representative view; an array of untyped PNG paths is insufficient.

## Source-adapter roadmap

The lowest-friction honest boundary is:

```text
optional isolated PyNEST capture
  -> durable typed source receipt
  -> offline Cortexel source adapter
  -> validated FigureRequestV1 or FigureBundleV1
  -> deterministic artifact + visible disclosure
```

The capture component should be optional and separately packaged so the
JavaScript library remains offline and does not import PyNEST. A durable receipt
must bind the exact NEST wheel/build, Python runtime, toolchain, active floating-
point profile, MPI/process scope, kernel clock epoch, recorder/device status,
capture timing, source projection bytes, and output digest. Caller declarations
that cannot be authenticated must remain labelled as such.

Recommended implementation order:

1. Add an exact memory-multimeter profile for dynamic recordables, including
   interval/resolution constraints, recorder window semantics, sender universe,
   ordering, and separate native-ms versus step-plus-offset clock forms. This
   unlocks analog, multisignal, compartment, and population-summary candidates.
2. Add the missing step-plus-offset spike-recorder profile without converting the
   source pair into an inexact scalar time.
3. Add detached `GetConnections` snapshot profiles that preserve multapses,
   autapses, node universes, weights, delays, singular/plural source forms, and
   exact single-process, target-rank-local, or explicitly merged MPI scope.
4. Add detached `GetPosition`/distance/displacement profiles with ordered node
   identity, dimension, extent, units, and the same explicit locality scope.
5. Add weight-recorder event history and correlation/correlospin detector profiles,
   preserving receptor order, lag/bin geometry, statistic kind, recording window,
   and matrix dimensions rather than flattening unlike quantities.
6. Add closed source contracts for direct rate histories, learning diagnostics,
   categorical state grids, images, and animation sequences only after their
   scientific meanings and artifact custody are explicit.
7. Treat ASCII recorder file sets, SIONlib, and MPI collection as separate backend
   profiles. Filename patterns or a single local file cannot certify a complete
   distributed recording.

## Agent-friendly CLI without guessing

The current `cortexel source catalog/describe/example/adapt/render` sequence is a
sound offline base. Complete NEST ergonomics should add discovery, not inference:

```text
cortexel source suggest --system nest --source-kind multimeter.memory \
  --intent analog-trace --json
cortexel source describe nest-multimeter-memory --json
cortexel source example nest-multimeter-memory > capture.template.json
cortexel source render nest-multimeter-memory capture.json \
  --output figure.svg --format json
cortexel bundle validate bundle.json
cortexel bundle render bundle.json --output figure.svg --format json
```

`source suggest` must require both a declared source kind and scientific intent.
If several skills are plausible, it returns a bounded ambiguity with required
discriminators; it never chooses from field presence or a filename. Examples stay
guarded templates, never executable evidence. The CLI should report exact missing
authority fields and offer copyable JSON pointers, while safe repair remains
limited to registry-owned aliases and absent contract identity.

An optional capture command may make setup easier, but it must run in the user's
explicit Python environment and publish a receipt before the offline adapter is
invoked. It must never silently install NEST, use ambient credentials, mutate the
simulation, advance biological time, or promote a live object reference into
custody evidence.
