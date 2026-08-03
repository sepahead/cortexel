# Known limitations of the current pre-1.0 development tree

`0.9.0` is the last tagged pre-1.0 release. The working source identifies itself as the
private, unreleased `0.10.0-dev.0`; neither identity makes a stable-contract claim. This
document is the honest list of what the current tree has not yet done—the alternative to a green
checkmark that isn't earned. Each item names what exists, what does not, and the gate
that closes it.

The machine-readable state of every release gate is in
[`docs/release/evidence-ledger.v1.json`](./release/evidence-ledger.v1.json).

## Scientific evidence

- **Stable FigureRequest evidence and legacy VizSpec checks are separate.**
  OutputAuthority comparisons, artifacts, evidence-ledger receipts, and a stable
  skill's `releaseReady` state apply only to the named `FigureRequestV1` revision.
  They do not certify the pre-1.0 `VizSpec` schemas, manifest v11, React charts, or
  `core/nest` transforms. Conversely, the existence of a legacy transform does not
  establish a stable NEST adapter or satisfy a stable skill's external-oracle gate.
- **No pinned reference environment has been executed.** The independent oracle
  (`reference/`) is scaffolded but not run: NEST, Elephant, Neo, and PyNWB are not
  installed or executed anywhere in this repository. Every skill contract's
  `evidence.externalOracle.status` is `not_run`, and the corresponding ledger gates are
  `NOT_RUN`. `test/analysis.test.ts` executes hand-computable checks for selected
  binning, population-rate, ISI, correlogram, and topology rules. That is useful unit
  evidence, but it is not an independent golden corpus for every stable contract.
  *Gates: R031–R059.*
- **Raw-event correlogram has internal derivation evidence, not release certification.**
  Revision 4 classifies the exact typed `target - reference` difference before one
  rounded conversion, refuses a conversion that would change bins, and uses the same
  reference-ordinal eligibility subset for corrected numerators and denominators.
  Hand vectors, a randomized exact-integer oracle, boundary regressions, and an
  independently implemented OutputAuthority evaluator exercise those rules. They are
  still repository-local evidence: no version-pinned NEST or Elephant differential
  corpus has run, so `neuro.correlogram` remains `releaseReady: false` and the external
  certification gates remain `NOT_RUN`.
  *Gates: R034, R036–R038, R053.*
- **Multi-rank NEST topology is not certified.** The MPI scope rules are validated
  against hand vectors and the scope validator; they have not been run against a real
  multi-rank NEST simulation. In the legacy raw topology boundary, adjacency,
  weight, and delay matrices plus both degree transforms and their strict params
  gates now reject
  `mpi_target_rank_local`: current options bind neither an exact rank-owned target
  universe nor complete cross-rank edge authority, so absence and zero-degree
  claims are unrecoverable. That restriction is consistent with NEST's documented
  rule that
  [`GetConnections()` returns only connections whose targets are on the executing MPI process](https://nest-simulator.readthedocs.io/en/v3.10/ref_material/pynest_api/nest.lib.hl_api_connections.html).
  It is a fail-closed limitation, not evidence that merged multi-rank results are
  correct. *Gates: R040–R045, R050–R051.*
- **Legacy topology aggregates have bounded but incomplete authority.** Nonempty
  weight-matrix transforms reject more than one observed synapse model; delay-matrix
  and delay-distribution transforms do the same. Their one global unit declaration
  carries no bound cross-model compatibility or conversion rule. Endpoint-only
  transforms remain model-agnostic where no measurement is aggregated. A
  hand-authored matrix is checked for its closed shape, axes, sparse-cell rules,
  counts, domains, and declared aggregation, but the strict gate has no raw
  per-connection measurements from which to independently rederive each numeric
  aggregate.
- **Some legacy detector and histogram claims remain source-authored.** The
  correlogram gate checks lag geometry, statistic domains, labels, counting-window
  order, and declared zero-lag policy. Its raw transform requires literal receptor
  ports `0`/`1`, a simulation resolution and simulation bounds, and checks the
  exact odd resolution multiple plus both edge-window margins. Those inputs remain
  caller-supplied configuration: the transform does not independently authenticate
  external detector-pool identity, and serialized params contain no configuration
  or transform receipt. Hand-authored `excluded_self_pairs` likewise remains a
  source claim; the raw transform emits only `included`. NEST documents those
  port and window semantics in the
  [`correlation_detector` reference](https://nest-simulator.readthedocs.io/en/v3.10/models/correlation_detector.html).
  The legacy weight-histogram raw transform now derives one bounded in-window
  observation per selected connection from a weight/model channel complete for
  the declared scope and
  rejects mixed observed models. The serialized schema still contains only
  aggregate integer counts, normalization, and totals—not a raw-entry receipt—so
  the one-entry/one-observation provenance remains contract-disclosed external
  authority.
- **Legacy phase-plane structure is narrowed, not scientifically certified.** The
  gate now requires exactly two distinct state axes with at least two strictly
  increasing finite coordinates each, matching axis/derivative/unit key sets, one
  derivative pair per Cartesian-grid sample, and derivative units expressed as
  the corresponding state-axis unit over one common explicit time denominator.
  Per-second components use one binary64 division by 1000, and a nonzero
  component that would underflow is rejected; this does not make independently
  rounded ms/s source representations universally byte-identical. That structural
  dimension binding does not authenticate the supplied units or model computation
  and does not infer an integration step. Zero-derivative
  samples are visible and disclosed as samples, not promoted to certified
  equilibria; nullclines and trajectories remain outside the claim.
- **Analog response reductions are not a revision-2 response-curve method.** A scalar
  called “mean voltage”, “peak voltage”, or “mean state variable” is not auditable
  without the exact recorded channel, sender/compartment scope, sampling grid and
  completeness, reduction interval and boundary, missing-sample policy, and
  temporal-versus-cross-sender reduction order. Cortexel therefore keeps sampled analog
  evidence in `neuro.analog_trace` or `neuro.multisignal_trace` and refuses those
  pre-reduced response methods until a complete reduction-basis contract ships.

## Rendering

- **Accessibility conformance is not established.** Both SVG paths now reference
  `<title>` as the accessible name and `<desc>` as a separate description. Normative
  left/right axis labels are rotated around deterministic bounded pivots with bounded
  serialized text lengths. Automated regressions establish those ARIA references,
  exact named token pairs, selected owned-mark contrast conditions, and headless SVG
  geometry only; they do not establish browser or assistive-technology behavior.
  Uniqueness of categorical dash/marker tuples is structural evidence, not proof of
  perceptual effectiveness in grayscale or under a colour-vision deficiency.
  The legacy React path now associates its honesty caption with the containing
  figure group and has visible-mark regressions for singleton plasticity and
  zero-derivative phase samples. Those fixes likewise do not establish host-page,
  focus-order, browser, assistive-technology, CVD, grayscale, or whole-figure WCAG
  conformance. The experimental corpus graph now has closed glyph/stroke redundancies
  and 3:1 undimmed opaque-mark normalization against an exact host-policy background,
  but it has not been perceptually tested across browsers, GPUs, CVD simulation,
  grayscale, zoom, touch, or assistive technologies. Focus/query dimming intentionally
  reduces peripheral salience, and a host that does not paint the declared background
  voids the contrast premise. Several multi-series and matrix-sign distinctions remain
  color-dependent, and the legacy React surface lacks exact paginated DOM rows for
  ten of nineteen supported skills. The new FigureRequest tables and mandatory
  disclosure footer remain complete, but broader DOM-companion and host integration
  behavior remains uncertified. *Gates: R074–R079.*
- **Digest-bound complete sidecars are not implemented.** The library returns an exact
  table for accepted figures, but the artifact currently binds only the SVG output; a
  CLI-written CSV was not a substitute for a library-owned canonical sidecar and has
  been removed from the packaged CLI rather than left as a lossy, unbound output. Every
  stable figure capability therefore declares `exportClass: svg+table`, and the render
  boundary returns every row or refuses before any excerpt can escape. Artifact 1.0 calls
  this `complete_returned`, not “inline”: rows travel in the in-memory `FigureResult`, not
  inside the artifact JSON. The artifact records `tableBinding: shape_only`, the exact
  ordered table-column keys, and one row count, so schema/order/cardinality drift is
  detectable, but cell values and row bytes remain unbound.
  Spike-raster revision 2 additionally accepts only `aboveMarkBudget: refuse` and does
  not advertise the registered future `raster_density_bins` policy. Restoring any
  `+sidecar` claim requires deterministic library-owned bytes, artifact output binding,
  exact encoding tests, and byte-for-byte CLI passthrough in the same change.
- **Table unit binding is not yet first-class column metadata.** Every skill source now
  owns the exact ordered `{key, header, cellType, nullable, keyPart}` schema, and
  `test/accessibilityTableParity.test.ts` derives its all-19 cell-domain and composite-key
  checks from that source while rendering every living valid example. Units remain
  expressed through companion unit columns and skill-specific descriptions rather than a
  closed per-column unit-binding field. FigureArtifactV1 also records only ordered keys
  and row count (`tableBinding: shape_only`), so a detached artifact does not carry the
  richer source schema or bind returned cell bytes.
- **Detached artifact verification is not implemented.** FigureArtifactV1 now requires
  render evidence, accessibility evidence, the catalog digest, and exactly one normative
  `image/svg+xml` output; unreachable compaction, rejection, sidecar, PNG, provenance,
  attestation, and reference-oracle branches are not reserved as valid instances. It binds
  deterministic SVG element ids to the request digest rather than creating an
  artifact↔SVG digest cycle. The current writer still has no public duplicate-aware artifact
  reader or executable verifier that checks raw artifact JSON, the SVG bytes/length, and SVG
  metadata together. The internal emission gate now recomputes the logical artifact
  self-digest, canonical-request digest, closed trace-batch/aggregate wrapper relations, and
  carried aggregate-output digests. It also checks request-derived view windows and exact
  conversion inventories, paint/materialization topology, event-witness roles, declared
  evaluation grids, union/shared-grid boundary and cardinality implications, membership
  counts, and sound method-dependent interval identities. Those checks relate carriers
  already present in the request and receipt; they do not re-execute trace preparation or
  either aggregate's scientific values from the raw series.
  Artifact 1.0 omits the intermediate preimages for retained-ordinal, prepared-view,
  context-witness-observation, and event-materialization subdigests, so the gate checks their
  enclosing batch wrapper but cannot recompute those inner commitments. It neither
  authenticates a detached artifact nor receives SVG or table bytes. A future detached SVG
  verifier must receive the SVG bytes; binding table contents additionally requires the
  canonical sidecar described above. Structural validity is not a tamper-verification claim,
  and detached-bundle integrity remains unverified.

- **The legacy corpus knowledge graph is an experimental inspection view, not a stable
  evidence artifact.** `corpus.knowledge_graph` validates bounded element-local typed
  references, advisory epistemic records, stable caller-supplied assertion ids, and
  discriminated uncalibrated scores, but the legacy envelope has no closed top-level
  evidence-record inventory that can resolve those references or authenticate a graph
  snapshot. Its caller-supplied snapshot id is a cache namespace rather than a digest or
  receipt. The peer-free and React graph subpaths now share one detached, deeply frozen
  runtime capability across preparation, exact-source views, scene, legend, paginated
  DOM, and deterministic source-record browsing. The canonical composition preserves
  the DOM surfaces and visible caption when a descendant client render/lifecycle failure
  is caught or the host declares the visual unavailable. It does not catch SSR,
  event-handler or asynchronous errors, and it cannot infer WebGL context loss. Only one
  bounded record page exists during SSR/no-JS; all records become reachable after
  hydration, or are available as complete canonical presentation-inspection bytes.
  Those bytes omit caption/view/host policy, do not rehydrate runtime authority, and do
  not establish a figure or evidence artifact. Runtime tokens are local to one physical
  package instance and realm; structured clone, workers/processes, another realm, or a
  duplicate install requires preparation from original input. Separate built-in
  raw-text preparers reject duplicate members before materialization for the generic
  visual input and the complete corpus VizSpec; their assurances are not transferable
  to a value that arrived through an ordinary JSON parser.
  The materialized-value preparer rejects accessors but cannot inspect an arbitrary
  JavaScript Proxy without executing traps, and says so in `inputAssurance`.
  None of that turns the force simulation into a deterministic FigureRequest renderer:
  its geometry remains schematic, cannot carry quantitative distance meaning, and has no
  stable SVG/table artifact or detached verifier. Required DOM companions improve
  operability but do not establish whole-view accessibility, and a host that hides the
  honesty caption inside collapsed disclosure does not satisfy Cortexel's visible-caption
  obligation. A future stable evidence-graph
  capability must bind a closed evidence inventory, immutable snapshot digest, source
  revision, stable multigraph assertions and score semantics, then emit a deterministic
  2D SVG plus a complete canonical evidence table. Optional 3D may consume that same
  accepted snapshot only as a powerless inspection view; it must not create or strengthen
  evidence.

- **OutputAuthority is a plan-translation gate, not SVG or scientific certification.**
  Every stable source now declares a closed OutputAuthority evaluator. Immediately before
  serialization, the internal gate compares the final detached, deeply frozen plan with
  independently request-derived exact table rows, the source-template summary, the
  registry-derived disclosures, and the ordered class/provenance sequence of role-tagged
  scientific carriers. Every V1 geometry class is `carrier_only`: numeric coordinates,
  scale/encoding correctness, styles, visibility, accessibility effectiveness, SVG bytes,
  and the truth of compiler-authored carrier tags remain outside the claim. The evaluator
  graph also shares an explicit pure-core numeric/unit/canonicalization/disclosure TCB;
  this is not diverse double compilation. The gate emits no receipt and Artifact 1.0
  remains `referenceComparison: not_run` and `tableBinding: shape_only`. Finite influence
  witnesses and living examples are regression evidence, not universal proofs. See
  [`OUTPUT_AUTHORITY.md`](./OUTPUT_AUTHORITY.md).
- **There is all-example structural table/artifact coverage, not 19-family scientific certification.**
  `test/renderAllFamilies.test.ts` renders only the **first** valid example from each
  stable contract twice in one process and checks non-empty, byte-identical SVG plus a
  small active-content safety set. `test/accessibilityTableParity.test.ts` additionally
  renders every living valid example, validates every successful FigureArtifactV1 with
  Ajv, and checks exact columns, row widths, finite cell domains, canonical structured
  cells, declared non-null fields, and row-key uniqueness. Living examples still do not
  exhaust every accepted combination, derivation mutation, visual semantic, supported
  Node/OS tuple, or cross-platform byte-identity claim.
  The per-family derivation and rendering gates therefore remain `NOT_RUN`.
  *Gates: R047, R060–R066, R074–R083.*
- **The pinned NEST example audit is a source classification, not broad NEST support.**
  [`NEST-EXAMPLE-VISUALIZATION-COVERAGE-V3.md`](./audit/NEST-EXAMPLE-VISUALIZATION-COVERAGE-V3.md)
  closes all 98 canonical PyNEST example bodies and 11 support/coordinated Python
  bodies against the exact NEST 3.10 source inventory, then identifies 28 semantic
  visualization-demand families. Fourteen have a plausible complete stable-skill
  candidate, four have only a partial candidate, and ten have no current stable
  candidate. V3 binds 35 AST-derived corrections and explicitly inherits 63 unchanged
  V2 taxonomy rows; its differential oracle is not an independent full reclassification.
  It verifies the exact 112 selected source leaves and two helper blobs, not Git
  metadata or every unselected tree byte. Its reviewed generator-source digest is
  pathname identity read after Python startup, not proof that those bytes executed.
  Its explicit-binding audit rejects reviewed direct, destructuring, and overlapping
  rebinding shapes but is not a complete Python alias, reflection, mutation, or
  control-flow proof.
  Every execution-bound output, example-specific mapping, executable-adapter
  match, upstream execution, renderer-parity result, and scientific-certification count
  is zero. The one packaged spike-recorder adapter is not asserted to match any official
  example without an example-specific detached capture and receipt. The nine reviewed
  raster-helper calls compute rates over active senders present in the timestamp carrier,
  while the separate nonvisual `if_curve.py` surface divides by its complete configured
  neuron count; those denominators are not interchangeable. Presentation gaps include
  multi-panel composition, compatible overlays/shared/dual axes, equal-scale generic
  output-coordinate trajectories, uncertainty,
  source-bound image/animation artifacts, categorical grids, covariance histories, and
  measured 3D geometry.
- **Render compilers are family-based, not one-file-per-skill.** The blueprint's target is
  one compiler file per stable skill for reviewability. The current tree uses shared compiler
  functions per geometric family (trace, step, bars, raster, matrix, scatter, stems,
  points-with-guide, trajectory, graph). This is a different review surface from the
  one-compiler-per-contract gate and has not earned that gate.
- **The visual system is functional, not yet publication-tuned.** Covered smoke examples
  use a fixed layout, and some families apply categorical colour/dash/marker tuples;
  those facts do not certify their scientific derivations or perceptual effectiveness.
  Perceptual matrix colour maps, uncertainty bands, legends, and print/grayscale
  behavior remain incomplete or uncertified.
  *Gates: R076–R077, R082–R083.*
- **Accessibility summaries are exact source-template materializations, but their
  effectiveness is not certified.** Family compilers and request-only evaluators derive
  the complete per-skill fact vocabulary separately; one-pass bounded substitution and
  the final OutputAuthority gate require byte-exact agreement with the plan summary and
  its disclosure suffix. That proves neither that the source prose is sufficient nor
  that a browser, assistive technology, or host presents it effectively. Complete
  sidecars and visual/alternative disclosure parity remain uncertified.
  *Gates: R074–R085.*
- **Text metrics are nominal.** Layout uses fixed margins and a generic font stack rather
  than a bundled metrics table, so a very long tick label could overflow its gutter.
  Covered examples are byte-identical across repeated runs in one process; the
  documented cross-platform identity tuple has not been certified. *Gates: R062, R064.*

## Cross-language

- **The independent Python reader exists and agrees with TypeScript byte-for-byte on
  digests.** `python/src/cortexel/` provides strict parsing (duplicate-key and
  prototype-key rejection, unsafe integer-alias rejection, and rejection of ill-formed
  Unicode in member names or values), RFC 8785 canonicalization matching ECMAScript
  number formatting and UTF-16 key ordering, SHA-256 digests, contract identity, and
  structural + unit-semantic validation — all pure standard library, no Node, no
  `jsonschema`. Its already-materialized Python boundary first copies exact built-in JSON
  values into a detached tree under the standard depth/node/string/container limits; it
  rejects subclasses, cycles, dangerous keys, malformed Unicode and non-finite or
  non-interoperable numbers without invoking caller-overridable methods. Diagnostic batches
  share the 32-record cap, exact omitted-count receipt and Unicode-code-point ordering with
  TypeScript.
  The generator now copies the exact schema subset this reader executes into the Python
  package, and a local smoke compares repository-context output with an exact VCS-free
  source copy, checks byte identity and a closed archive inventory, then clean-installs
  the wheel in an unrelated directory. This closes
  the former repository-relative schema lookup defect; it does not certify the complete
  Python/OS matrix, publish either artifact, or turn partial semantic coverage into full
  validation. *Gates: R104–R105 remain `NOT_RUN` pending release-bound matrix receipts.*
  `test/crossLanguageParity.test.ts` compares every valid contract example, a forged
  caller-assurance case, a unit-alias case, an adversarial PSTH matrix covering typed time
  axes, count/exposure authority, sender-exposure declarations, normalized-value audits,
  per-bin denominators and baseline exposure, and a response-curve decision matrix covering
  denominator authority, exact mean-rate and raw peak-count audits, count-level raw peak
  estimators, aggregate peak lattices, latency-window binding, kernel identity, and the
  generated binary64 interval policy when Python is importable. It does
  not establish the full
  generated-source or positive/negative/boundary/metamorphic/migration conformance gates.
  *Gates: R015, R019.*
- **The Python semantic-validator port is partial and the public full-validation boundary
  fails closed.** `validate_request` returns `SEMANTIC_VALIDATOR_UNAVAILABLE` after an
  otherwise clean request until the selected skill's complete registered validator set is
  ported; `is_valid` therefore never promotes partial coverage into a validity certificate.
  `validate_request_partial` is explicitly a development inspection API whose empty result
  means only that the implemented subset found no error. The caller-authority boundary and
  registered quantity-unit rules (alias rejection and quantity-kind dimension matching)
  are ported and agree with TypeScript. The synaptic-weight trace's shared value axis,
  initial/bound references, and uncertainty-axis unit relations are also independently
  ported, including exact-code-only simulator-defined weights. Contextual interval-unit bindings are not globally
  ported: the response-curve measurement window and PSTH relative window independently
  require time units and `start < stop`; PSTH also binds its alignment, event, and bin axes
  to time. Other skills' `window.valid` parameter bindings remain TypeScript-only unless
  named here.
  The PSTH partial port independently checks exact count versus tolerant normalized-value
  assertions, exact typed per-bin exposures, covering-trial and selected-sender
  denominators, missing-bin masks, trial accounting, and baseline exposure/correction
  representability. It does not check SVG coordinate separation, the renderer's
  complete-returned table preflight, accessibility output, or artifact emission.
  Response-curve rate-denominator authority, exact integer count-to-rate re-derivation,
  raw binned-peak count audits and condition estimators, aggregate binned-peak lattices,
  latency-window binding, kernel identity, and binary64 peak-grid materialization are also
  independently ported. The normative numeric-policy registry is generated into both
  runtimes, while its interval algorithm is separately implemented and exercised against
  the same conformance vectors.
  The response event-scope validator checks internal declarations only: it cannot consult
  source recordings to establish selection/member referents, sender cardinality,
  completeness, pooling actually performed, a membership-digest preimage, or that a
  count/latency/peak came from that selection. This limitation applies to every response
  method and is carried by a mandatory disclosure plus granular receipt fields. Equal local
  sender ids across fresh runs bind lexical roles only, not global entity identity.
  Other deeper scientific validators (reference-in-universe, correlogram denominator,
  topology scope) remain TypeScript-only and are ported incrementally; the parity
  test asserts agreement only on what Python actually implements.
  Python also exposes no successful canonical-request or artifact producer: its public
  canonical digest hashes the exact caller-supplied value and does not materialize the
  installed skill revision. Revision mismatch decisions are independently checked, but
  the accepted-request invariant `canonicalRequest.skill.revision === resolved revision`
  and the resulting SVG seed belong to the TypeScript full-validation/writer boundary.
  *Gates: R015, R019, R111.*

## Adapters

- **Adapter feasibility, definition, implementation, and certification authority are
  separate boundaries.** Each entry is a composite mapping with one primary source
  and explicit required/optional companions. For `not_assessed` mappings, that source
  list is only an exact provisional candidate roster: Cortexel has not established
  that it is complete or sufficient. `feasibilityStatus` is only an assessed
  possibility; `definitionStatus: not_specified` means the prose is not a normative
  implementation recipe; and `implementationAvailability: not_implemented` means
  there is no callable adapter. Contract source v1 deliberately cannot represent
  `specified` and fixes `authorityRequirements` to `null`, because no closed mapping-
  definition authority exists. The packaged spike-recorder code, request schema,
  source identity, prose and release gate cannot counterfeit that missing authority.
  A `sourceId` names a stable mapping role/profile rather than a runtime instance;
  role-distinct sources may share one `system` provider class.
  Generation closes every executable `mappingId` against the source implementation
  inventory and the immutable definition of release gate R049.
  Mutable `PASS`/`FAIL`/`NOT_RUN`/`BLOCKED` status, receipt bytes, and tested-source
  identity remain solely in the release ledger. The generated TypeScript/Python
  catalogs and manifest do not copy them, preserving the tested-candidate /
  evidence-only-authorization release construction.
- **The NEST spike-recorder adapter (plain-data path) is implemented** (`src/adapters/nest/`):
  it snapshots an exported NEST spike-recorder object, requires the recorded sender universe
  (never inferring it), requires the top-level device-status `n_events` field to be a
  non-negative safe integer exactly equal to both event-array lengths, does not assume
  chronological events, and produces an unpinned `neuro.spike_raster` request for
  the bounded shape of caller-declared exact NEST 3.10.0 memory output with
  `time_in_steps: false`. Strict validation resolves the result against installed
  `neuro.spike_raster` revision 6 and `figure.spike_raster` revision 7.

  Executable adapter revision 5 has two closed branch records. `finiteStop` requires
  projection v1 and capture-authority profile v3 with `kind: caller_declaration`, and
  retains `(origin+start,origin+stop]`. `positiveInfinityCaptureBounded` covers NEST's
  default positive-infinity stop with projection v2 and capture-authority profile v4.
  Projection v2 alone converts the exact pinned-runtime PyNEST `DBL_MAX` representation into the
  closed token `{ "kind": "nest_time_positive_infinity" }`; the adapter rejects a raw
  numeric `DBL_MAX` and arbitrary/decorated tokens. This branch has no finite `stopTics`.
  Instead, its authority binds a finite `captureTime` to the exact biological
  time immediately after a successful *advancing* `Simulate` or `Run` return and before
  any further advance or mutation. The emitted request retains
  `(origin+start,capture]`. That endpoint is capture, not a configured finite stop or
  recorder deactivation, and establishes nothing after capture. The two branches use
  distinct authority profiles, projection methods, request shapes, and disclosure facts,
  but one revision-5 adapter-input digest domain; their evidence is not interchangeable.

  Both branches require the exact LP64/int64/binary64 time-build profile, runtime
  resolution/tic grid, source-faithful stored-reciprocal time projection, and a
  declaration that the
  named single-recorder PyNEST NumPy-to-plain-data projection preserved every event-array
  value and its order, single-process rank/thread scope, most recent recorder creation or
  `n_events=0` clear, most recent window/backend/time-encoding/sender-wiring mutation,
  monotonic biological time since the current kernel initialization, and an exact
  complete sender-universe binding. They retain native binary64 milliseconds,
  multiplicity, a digest of the detached plain-data projection, and a branch-specific
  domain-separated digest over that projection plus every normalized adapter option.
  Step/offset,
  ASCII, screen, MPI, and SIONlib paths fail closed: no contract currently preserves their
  raw clock authority. Exact arithmetic proves relations among received binary64 values
  and declared integer-tic preimages; it cannot authenticate those tics, the projection,
  export, runtime/build, clock or buffer history, configuration history, recorder wiring,
  silent-sender completeness, process scope, run identity, or export custody. Every
  capture-authority and build-profile field,
  `nestVersion`, `recordedSenderIds`, and optional run/recorder id is a host declaration;
  neither digest is an attestation. Historical adapter v3 and capture-authority v1/v2
  records are non-executable migration identities. Local thread-sibling status merging is admitted because
  the pinned single-process profile exposes it; MPI rank-local or caller-premerged status is
  not. The adapter has no committed, isolated, durable real-NEST conformance receipt.
  Limited ad hoc exact-version probes do not satisfy the certification profile, so the
  gate remains `NOT_RUN`.
  The packaged offline CLI makes this one executable path discoverable through
  `source catalog` / `source describe` and callable through
  `source adapt nest-spike-recorder`. That command accepts only a strict
  `{ exportedStatus, options }` JSON envelope; its copyable example uses revision 5's
  typed positive-infinity branch and capture-authority profile v4, while finite input
  uses the `finiteStop` branch and profile v3. It runs the same adapter, revalidates its request
  through the full stable gate, and emits canonical request JSON. The discovery inventory
  is separately domain-digested and contains no nonimplemented mapping.
  This improves agent ergonomics but creates no live-PyNEST, source-authentication, or
  R049 evidence.
  Every nonimplemented NEST path is `not_assessed`: its source notes retain reviewed
  constraints and candidate authorities without claiming a closed feasible profile.
  The remaining NEST paths (connections, positions, multimeter) and the planned Neo/NWB/NCP
  mappings are not implemented. No current NCP adapter capability exists; if
  one is introduced, it remains experimental until both real code and certification against
  an immutable NCP release exist — never against moving HEAD.
  *Gates: R049–R059.*
- **No Engram integration is accepted yet.** Cortexel has not received a durable
  cross-repository receipt binding an Engram commit, Cortexel package bytes, a closed
  evidence-graph snapshot, prepare/inspect/execute state, Python wheelhouse authority,
  result receipt, recovery history, and rendered artifact. Engram must supply element
  evidence arrays, stable assertion ids, discriminated scores, a closed evidence-record
  inventory and immutable snapshot identity; Cortexel must never synthesize those from
  entity ids. Any UI integration must keep the bound honesty caption visibly expanded
  adjacent to the graph. Until clean-checkout joint verification passes without ambient
  credentials or package configuration, source compatibility and a legacy adapter do not
  constitute integration evidence.
- **Legacy connection model semantics remain a host-authored source claim.** The
  legacy `core/nest` connection graph, weight/delay matrix, delay-distribution,
  and SceneData adapter paths now require complete synapse-model rows and an
  exact bounded declaration for every observed model before exporting a weight
  or delay. They hard-code the documented ignored fields of the exact built-in
  names `gap_junction`, `rate_connection_instantaneous`, and
  `diffusion_connection`. Cortexel does not infer the ancestry or behavior of a
  copied/custom model name, authenticate the supplied model rows, or inspect
  NEST's installed model registry; those declarations remain attributable to the
  host. A source-header review of all 89 connection/synapse headers at
  [NEST main commit `182eba446a8b89108f21cd2ad54aa4c667afd86a`](https://github.com/nest/nest-simulator/commit/182eba446a8b89108f21cd2ad54aa4c667afd86a)
  found exactly these three
  `set_delay` contradictions and only `diffusion_connection` also rejecting
  per-connection weight. Base `Connection::get_status` can nevertheless report
  delay, and diffusion status reports its unused `weight_`, which is why raw
  field presence is not accepted as semantic effectiveness. This is versioned
  design evidence, not certification against a running NEST installation. This
  legacy boundary is separate from the unimplemented FigureRequestV1 NEST
  connection adapter described above, and neither has been certified against the
  pinned real-NEST oracle.
- **The complete official NEST v3.10 PyNEST example source tree and selected
  documentation source scopes are closed; build and visualization denominators
  remain open.**
  `docs/audit/nest-example-coverage.v1.json` pins NEST v3.10 commit
  `acca9704da248750219a027db99fec6cd1f9052a`, its root tree, documentation
  index, exact default runner and CMake orchestration context. The separately
  digest-bound canonical source artifact closes 112 Python paths (109 regular
  bodies and three orchestration aliases), 98 canonical entrypoint bodies, 92
  definition-only default-runner targets and twelve checked-in PNG/GIF/SVG
  assets. The pinned `pynest/examples` tree contains 162 leaves: those 124 rows plus
  38 auxiliary inputs, documents, and scripts carrying closed structural roles.
  Every leaf row binds its path bytes, Git mode and blob SHA-1, independently
  recomputed content SHA-256 and byte length; the semantic digest commits to all of
  those rows. The auxiliary roles do not classify visualization semantics or close
  runtime dependencies, and the byte binding is not an independent transport,
  toolchain, source-execution, or availability receipt. A separate canonical
  selected-source artifact binds the exact path bytes, Git mode, Git blob SHA-1,
  content SHA-256 and byte length for 784 unique blobs: all 473
  `doc/htmldoc` leaves, all 29 public-module-scan PyNEST Python files, all 278
  direct model/kernel header candidates, and the enumerated build-context files
  (four of which are outside the preceding scopes). Those are explicit selected
  scopes, not all Sphinx/CMake build inputs or all possible visualization
  definitions. Within them, the artifact classifies 146 `BeginUserDocs` blocks,
  50 unverified historical notebook PNG candidates (38
  plot-like and twelve formula renders), eighteen active documentation-script
  figure definitions with seventeen active literal saves, four authored diagram
  directives in three RST sources, and four public visualization modules. The
  source scripts use relative save targets whose Python resolution depends on an
  execution working directory that this source-only audit does not bind; their
  resolved targets and target presence are therefore not assessed, and no save is
  equated with a checked-in asset. The `conn_3d` source contains active plotting
  helpers, but its active top-level figure remains empty because all branch-render
  invocations and the save call are commented, so that candidate is excluded.
  Known inline RST plotting recipes, two figure directives inside UserDocs
  blocks, generated UserDocs/API RST, non-Python files admitted by Sphinx-Gallery
  copy rules, raw-HTML/video surfaces and remote images are outside the explicit
  reviewed visualization classifiers. The 107 figure/image and 53 math counts
  are lexical directive-line counts over static RST; target resolution,
  reachability and build inclusion are unassessed. Notebook output classification
  is PNG-only; 12 `text/latex`, 54 `text/plain` and 19 stream outputs are known
  but not treated as visual-output candidates. Both inventories read Git objects without importing or executing
  upstream Python. Documentation
  references remain selector evidence rather than invented invocations, runner
  target definitions remain definitions rather than runtime receipts, and stored
  notebook/media bytes remain source assets rather than successful executions.
  The pinned `conf.py` bytes configure gallery execution with the literal string
  `"False"` and notebook execution as `"never"`; the inventory did not invoke Sphinx
  and therefore did not witness those settings controlling a build. `conf.py` may
  still download and `git apply` an ambient `patch_url`; its recommended
  requirements contain ranges and unconstrained names rather than a build lock,
  while external Sphinx,
  intersphinx, MathJax, PlantUML, Graphviz and Mermaid dependencies are not closed.
  Network isolation, dependency resolution, complete build-input closure,
  source-mutation exclusion, acquisition-toolchain reproducibility and
  reproducible documentation-build authority are therefore not established. The
  example-source generator performs one blobless structural Git fetch for the pinned
  commit and trees. It alone pins that initial fetch to Git's documented HTTP/1.1
  mode as a reliability and transport-negotiation control, not an authenticity
  boundary; the documentation generator does not make a transport-version claim.
  Both generators derive their exact tree-selected references before removing the
  remote, partial-clone configuration, and checked acquisition sidecars, and they
  prove an exact 137-object commit/tree-only closure before selected-blob import.
  The example reference set contains 160 unique identities: 159 span all 162
  example-tree leaves, while one disjoint identity is the external documentation
  index; four SONATA JSON paths intentionally share one exact blob.
  A separate shared fixed-host raw-HTTPS boundary retrieves the exact 160 or 784
  paths with no redirect, proxy, authentication, cookie, or content-coding surface.
  Exact producer limits are concurrency four, four attempts, a 90-second nonempty-body
  idle deadline, a five-minute absolute request deadline, and a 15-minute global
  deadline. Application-body/event limits are bounded, but they are not aggregate
  header, TLS, DNS, socket/kernel, or hostile wall-clock containment, and event-loop
  timers cannot preempt synchronous work or a stalled event loop. Each response must
  reproduce its tree-selected canonical Git blob SHA-1 before exclusive mode-0600
  staging. No upstream object read can trigger a lazy fetch after network authority
  is removed.
  Every Git command is launched by an exact staged supported Node runtime against
  either canonical protected `/usr/bin/git` or an explicitly acquired exact Git
  executable, with copied bounded binary input, bounded output/time/status, a closed
  environment and the reviewed live guardian. HOME must be canonical root-owned
  `/dev/null` or an empty current-UID mode-0700 directory with the reviewed ACL
  profile; its identity and emptiness are revalidated after every command, including
  command failures. This does not close Git's compiled helper or dynamic-library
  dependency graph, create a retained toolchain/execution receipt, or contain a
  malicious same-UID process that deliberately escapes the guarded process group.
  Git exposes no hostile-server input-byte quota for those transport/`index-pack`
  phases; strict containment requires an external quota/sandbox or custom transport.
  The
  selected-source generator initializes a worktree-free blobless partial
  repository under a
  current-user-owned temporary root whose permission and special bits are exactly
  0700 and whose path and descriptor carry either no extended ACL or only Darwin's
  reviewed deny-only form. Real and effective UIDs must agree. Its resolved ancestor
  chain must be root- or current-UID-owned, satisfy that same ACL policy, and use
  sticky entry protection wherever group/other write is present; this excludes
  ordinary different-UID parent-entry replacement. Darwin uses its native
  extended-ACL API and admits only the canonical single
  `group:everyone deny delete` restriction;
  every allow entry, inheritance flag, additional entry, or unrecognized
  serialization fails closed. This does not establish filesystem implementation or
  locality. On Linux, native `libacl` is required on the reviewed ext-family or
  tmpfs VFS-type allowlist, listed alternate ACL namespaces are rejected
  separately, and directory default-ACL inspection requires a mounted, readable
  `/proc/self/fd` whose resolved entry still matches the open descriptor. Missing,
  unreadable, or mismatched procfs authority fails closed. Linux VFS types with
  distinct network, stacked, unknown,
  unsupported, or indeterminate ACL models fail closed, but filesystem magic does
  not establish backing-device locality or exclude lower-layer stacking. These
  repeated observations do not establish containment against root or
  DAC/ownership-bypassing capabilities (including `CAP_FOWNER`), mount-namespace
  changes, or another process with the current UID during or after
  acquisition or publication. Additional VFS types require their own reviewed
  profile and native controls. The ACL helper also requires an OS-administered
  `/usr/bin/python3` on macOS or Linux. The helper source itself is opened as one
  bounded no-follow/nonblocking regular file, must match its pinned SHA-256, is
  executed from those exact copied bytes through stdin, and is rechecked by path,
  descriptor, bytes, and digest after every run. Linux pathname subjects are opened
  nonblocking and special files fail closed. The interpreter's absolute `-I -B -S`
  invocation and closed environment remove ambient `PATH`, user-site, and
  startup-hook selection, but its version and bytes are not bound by this source
  inventory; replacement by the trusted OS/root authority remains outside the
  evidence. The
  initial blobless Git smart-HTTPS fetch receives
  a minimal environment and an empty controlled home, excluding ambient Git
  configuration, `.netrc`, credential helpers, proxies, tracing and exported
  secrets. After the pinned commit and complete tree closure select the exact 784
  path/blob identities, the generator removes the Git remote, partial-clone
  configuration, and checked promisor and reverse-index sidecars. It rejects checkout, sparse,
  temporary-pack and network-authority residue and requires the local object
  database to contain exactly the pinned commit plus 136 unique tree objects.
  It then requests only those selected paths from the fixed
  `raw.githubusercontent.com` owner/repository/commit namespace over direct TLS,
  with no redirect, proxy, authentication, cookie or content-coding surface and
  with bounded concurrency, attempts, idle/absolute/global time and per-blob,
  successful-total and application-received response-body bytes. This is not a
  transport-wire-byte quota. GitHub Raw is treated only as an untrusted
  byte transport: every complete response must reproduce the selected Git blob
  SHA-1 before it is staged under a current-UID mode-0700 directory as a numeric
  mode-0600 file. One positional
  `git hash-object -w --no-filters -- <784 reviewed staged path arguments>`
  invocation must independently reproduce all identities in order with exact stdout
  and empty stderr. Staging is removed,
  lazy fetch remains disabled, every pack is verified, every admitted object is
  batch-read and independently rehashed from its canonical Git type/length/content
  preimage, and the final object set must be exactly the 137 structural objects plus
  the 784 unique selected blobs. A SHA-256 aggregate additionally seals that complete
  content set across each repository-state snapshot.
  The builder then rereads, parses, Git-SHA-1-verifies and independently
  SHA-256-rehashes every admitted blob, and the generated inventory must pass its
  reviewed pinned semantic validator before any bytes escape. In `--output` mode,
  publication is exclusive, no-clobber, descriptor-bound, file/directory-fsynced
  and repeatedly revalidated under primitive 4-KiB output-path and 16-MiB UTF-8
  content bounds; stdout mode is an ordinary stream. Successful
  `fsync` calls do not establish persistence across power loss, backing-device
  behavior, or storage-stack semantics, and the admitted Linux profile includes
  tmpfs. File publication remains a same-UID-mutable filesystem boundary. That
  acquisition procedure
  is not itself a toolchain-bound reproducibility or availability receipt. Public
  GitHub availability is external, and stock Git does not expose an input-byte
  quota for the initial commit/tree fetch and its `index-pack` work; strict
  hostile-server disk containment requires an external quota or sandbox. The raw
  boundary has exact application-body budgets but does not impose a complete
  transport-wire-byte quota.
  Neither artifact inventories
  built figures, panels,
  overlays, tables, animations, interactive surfaces, stdout reports or explicit
  no-output results. Checked-in assets are not assumed to be emitted outputs.
  Mapping, packaged implementation, rendering, upstream execution and scientific
  comparison therefore remain independently `not_assessed`, `not_established` or
  `not_run`; every visualization count is zero and the coverage claim is `none`.
  This mutable audit evidence is outside `contract/`, generated catalogs, the
  package manifest and build identities; `bun run check:ledger` validates the
  exact bytes of both artifacts, their semantic identities, the ledger schema and
  all no-transfer states.

- **The stable catalog does not yet cover every visualization family used by the
  pinned official examples.** Source inspection of all 109 regular Python bodies in
  the exact NEST v3.10 example tree finds ordinary line, scatter, histogram, bar,
  error-bar, filled-band, image/matrix/`pcolormesh`, 2D/3D spatial,
  multipanel/colorbar/inset, and frame-to-GIF compositions in addition to NEST's
  raster, voltage, spatial, and pydot helpers. The stable catalog can represent
  selected individual rasters, traces, distributions, matrices, 2D positions and
  phase-plane vector fields, trajectories, nullclines, and fixed points, but it has
  no executable NEST adapters for multimeters, weight
  recorders, `GetConnections`, or `GetPosition`; no generic response-surface,
  image-state, error-band, or panel/bundle contract; and no 3D spatial or animation
  compiler. Official
  [`if_curve.py`](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/pynest/examples/if_curve.py)
  produces a two-dimensional response matrix rather than the current one-dimensional
  response-curve shape, while
  [`hh_phaseplane.py`](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/pynest/examples/hh_phaseplane.py)
  uses nullclines and a trajectory that stable `neuro.phase_plane` can structurally
  encode. That representability is not an executable NEST adapter, an authenticated
  derivation, or executed parity with the pinned example. Weight-matrix heat maps,
  3D spatial views, GIF generation,
  and multipanel progress views are likewise visible in the pinned
  [`plot_weight_matrices.py`](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/pynest/examples/plot_weight_matrices.py),
  [`test_3d.py`](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/pynest/examples/spatial/test_3d.py),
  [`generate_gif.py`](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/pynest/examples/pong/generate_gif.py), and
  [`plot_progress.py`](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/pynest/examples/sudoku/plot_progress.py).
  These are semantic gaps rather than style differences. Broad caller-owned display
  contracts may eventually make every bounded official output representable, but each
  source-specific adapter must earn its own authority, execution, parity, and scientific
  evidence. The current audit therefore keeps every downstream numerator at zero.

## Packaging and release

- **The package rewire is additive, not a release certificate.** The build preserves the
  legacy root, `cortexel/core`, all React subpaths, and
  `cortexel/skills.manifest.json`, while installing FigureRequestV1 at
  `cortexel/figure`, `cortexel/render-svg`, `cortexel/adapters/nest`, the offline
  `cortexel` bin, and module-relative normative data under `cortexel/contract/*`.
  The renderer subpath exposes only the three end-to-end builders; package ESM, CJS,
  declaration, and deep-import smoke guards keep raw plan construction, resource
  accounting, formatting/scaling primitives, and SVG serialization internal.
  The pack smoke exercises ESM, CJS, every same-format and mixed-format validated-request
  handoff, copied/proxied-token rejection, declarations, legacy imports, unrelated-cwd
  validation, digest reproduction from shipped bytes, CLI identity/import guard/exit
  codes, executable source discovery/adaptation, peer isolation, the tarball allow-list,
  and exact tar entry modes. A final
  post-emit pass verifies the exact closed `package.files` inventory, refuses
  indirect/non-regular entries under `dist` and `LICENSES`, and normalizes every packed
  ordinary file (including root metadata/notices) to `0644`, the sole CLI entry to
  `0755`, and package directories to `0755`,
  so a restrictive builder umask cannot make the package unreadable. This establishes what the built
  tarball contains; it does **not** mean the tarball has been published, that any skill
  is `releaseReady`, that the supported Node/OS matrix has completed, or that a
  clean-room reproducible release receipt exists. `dist/` also remains committed for
  git-dependency consumers rather than being untracked in this change. *Gates:
  R099–R107 remain governed by their evidence-ledger receipts.*
- **The stable workflow is agent-oriented but not yet frictionless or Python-complete.**
  The offline Node CLI can catalog/describe skills, validate and render one request, and
  discover/adapt/render the one executable NEST spike-recorder source. It still requires
  an installed Node package, has no `doctor`, project initializer, batch manifest,
  bundle/sidecar writer, detached artifact verifier, PNG/PDF export, or producer-side
  PyNEST capture helper. Usage errors are not yet one uniform versioned diagnostic
  envelope with machine-actionable next steps. The separately packaged Python code is
  an independent strict parser/canonicalizer and explicitly partial semantic reader; it
  exposes no console command, renderer, NEST adapter, or full validity certificate.
  A future `cortexel-nest` producer helper should run inside the scientist's PyNEST
  environment and emit a versioned source-capture record, while rendering and detached
  verification remain independent of PyNEST. TypeScript and Python must share a closed
  conformance corpus rather than silently becoming two semantic authorities. Until the
  packages are published and these paths exist, a source checkout remains part of setup.
- **Package-smoke authority is not a hostile process sandbox.** Prepared-state v2
  seals the original source Node executable and npm package tree. Only the reviewed
  npm 10 and npm 11 majors are admitted; current npm 12 is deliberately rejected until
  its exact install topology and residue behavior have a separate reviewed profile and
  CI lane. Prepare and execute
  each descriptor-acquire those exact Node bytes into one ephemeral, operation-scoped
  private runtime; source and staged digests must equal the prepared digest, and both
  authorities are re-bound around every command. Only the staged copy is used as the
  launcher/control runtime and target executable. The prepared state retains neither
  its pathname nor its acquisition record. Staging copies only bounded known
  Homebrew-relative `libnode.<number>.dylib` companions, not a closed dynamic-library
  dependency inventory, so this still does not bind Node's dynamic libraries,
  operating-system services, or the TypeScript harness runtime. Ordinary child
  commands have an exact 300,000 ms bound; npm version/pack uses a separate control
  cache, while the three closed, sequential npm materializations (`core`, `charts`,
  and `full`) each start with a disjoint empty private cache and have the shared
  reviewed-POSIX maximum of 900,000 ms each. These are per-command bounds, not an
  aggregate phase deadline, network-availability guarantee, or hostile hard deadline.
  Empty first use is established by a prepare-local per-role
  `unused` -> `active` -> `complete` state machine. Command-adjacent cold activation
  rebinds the exact canonical workspace, captured ancestry and cache inode, enumerates
  at most one dirent and requires none, rebinds, and only then publishes the role's
  environment path as active. Control completes after pack; consumer roles complete only after
  their ordinary complete-closure proof. The full retry stays active in the same
  nonempty-after-attempt-one cache and does not rerun that cold check. This is bounded
  initial pre/post observation, not atomic exclusion of a hostile concurrent same-UID
  filesystem writer, which can race afterward. Exact lock/integrity checks and later
  reduced/complete closure proofs are separate evidence.
  Core and charts run once. Full permits one identical retry in that same `full` cache,
  never a cache warmed by core or charts, only when the
  first command exits zero and exact hidden-lock plus reduced-filesystem proofs show
  no difference except a nonempty `optional:true` subset that npm pruned. The retry
  never accepts that subset: its final state must satisfy the complete lock, package,
  scope, `.bin`, and filesystem closure. No command failure, required-package gap,
  ambiguous metadata, caller-controlled retry, or caller-controlled timeout is
  admitted. In particular, an npm 10 optional failure that retains an otherwise empty
  scope is conservatively nonretryable because its reduced filesystem closure is not
  exact; a fresh prepare is required. All npm invocations use exact owner-only
  user/global configs and reject a cwd-local `.npmrc`. Every npm-command boundary also
  rechecks the active role's canonical current-UID mode-`0700` directory identity;
  retry authorization and its immediate command boundary recheck that cache authority,
  config identity, raw manifest/lock bytes and modes, and both tarball copies. The
  finalized workspace seal, rather than the per-command directory-identity check, binds
  the resulting cache contents. Bound failures identify only a fixed operation label plus the numeric
  bound. CI's 60-minute job timeout is an outer operational cap; it does not cover the
  theoretical sum of every sequential per-command maximum and is not a completion
  receipt. On the reviewed path,
  a live detached guardian is the sole process-group signal authority
  and the supervisor owns its exclusive control lease. Worker completion and
  guardian-local failures trigger the guardian directly; bounds, handled
  cancellation, and supervisor death close the lease, whose EOF triggers the same
  path. The guardian publishes one bounded intent and self-addresses the group
  exactly once while its own unreaped leader identity pins the PGID. The supervisor observes
  guardian exit, then only drains local pipes under a separate bound; neither it nor
  the outer caller signals or probes any numeric identity after the reap. The outer
  caller receives no PID/PGID and has no fallback.
  A canonical completion-free sweep before READY is accepted only for the closed
  pre-READY reason set and becomes a terminal diagnostic after the same `SIGKILL`
  and EOF checks; it cannot publish the public handshake, `GO`, a command result, or
  target output authority. Completion-bearing, malformed, noncanonical, and
  lifecycle-impossible frames fail as protocol violations. Post-READY reasons are
  checked against a separate closed state set.
  Before guardian creation, the launcher activates a dedicated parent-side drain and
  sends one exact ARM frame. The supervisor derives stable `fstat` identity from the
  different child-side FIFO/socket endpoint, binds it through the guardian's canonical
  identity echo, then rechecks and closes its copy once without retry. A reused numeric
  fd is not authority, and neither worker nor target receives this endpoint. While the
  launcher remains live, it withholds buffered protocol until both supervisor close and
  real lifetime peer EOF; bytes, local close, and stream errors are not EOF evidence.
  Host-side expected-regular reads use POSIX `O_NOFOLLOW|O_NONBLOCK` before
  descriptor type/identity proof, so a file-to-FIFO exchange cannot block at
  `open`; reviewed directory opens additionally require `O_DIRECTORY`.
  This evidence is not an independent kernel receipt that every member was killed.
  Direct guardian death, `EPERM`/`ESRCH`, malformed protocol, or a retained pipe preventing EOF
  fails closed without a later numeric signal. Same-UID guardian discovery/signaling,
  deliberate re-grouping or detachment, inherited-pipe retention, and a
  credential/security-label transition can escape or defeat the group sweep and
  require external cgroup/sandbox/VM containment. A target can also stop the complete
  group. Because `SIGSTOP` is uncatchable, a stopped guardian cannot consume lease
  EOF, so the launcher remains joined until the synchronous caller applies its outer
  hard kill. Launcher `SIGKILL`, OOM loss, and that hard kill can let Bun return before
  asynchronous guardian cleanup; a descendant-held stdout pipe is not a reliable Linux
  join. Neither timeout is a hostile hard deadline or owner-death containment.
  The prepared
  workspace's root, parent ancestry, modes, topology, and bytes are change-bound,
  but mode hardening is not a substitute for an externally enforced read-only
  mount against a hostile same-UID actor.
- **Python package subprocess cleanup is group-bounded.** The macOS/Linux gate uses
  a live session/process-group guardian and a non-leader worker that remains the
  target's immediate parent. The supervisor controls cleanup only by closing an
  exclusive lease. The guardian publishes a bounded nonce-bound status, then owns
  the only group signal and self-addresses its own group while its live leader
  identity still pins the PGID. The worker restores and unblocks
  `INT`/`TERM`/`HUP` before target launch. Stdout/stderr are always piped; observed
  bytes share a fixed budget until an error latches, then cleanup drains/discards
  without claiming a total-throughput count. Capture controls retention. The supervisor
  drains those pipes before disarming the `Popen` destructor and crossing one raw
  guardian `waitpid`; it performs no numeric signal, process probe, or second wait
  afterward. Default `SIGCHLD`, exact single-threaded Python/kernel authority, no active
  trace/profile callback, and no callable Python signal handler outside the handled
  cancellation set are preconditions. The supervisor temporarily blocks `SIGCHLD` plus
  `INT`/`TERM`/`HUP`, restores the caller's exact mask, and the worker unblocks the target's
  cancellation signals. External
  reaping, missing/malformed status, direct guardian
  loss, unexpected exit, and drain uncertainty fail closed without a numeric
  fallback. Any descriptor-close exception is ambiguous and makes the standalone smoke
  worker fail-stop with `_exit(70)`, relying on kernel teardown instead of retrying a
  possibly reused descriptor number. The status-plus-`SIGKILL` observation is not an independent kernel receipt
  that the guardian delivered the signal: a same-UID target could kill it after the
  status write and before its self-sweep. This proves only the reviewed same-authority
  group path. A same-UID target can kill the guardian, detach or regroup, retain
  output or lease descriptors, stop the complete private group, change credentials or
  security labels, or signal the supervisor. A stopped guardian cannot consume lease
  EOF, so the final blocking `waitpid` is not a hostile hard deadline and can
  hang until an external lifetime primitive resumes or removes the group. Hostile
  same-process interference, abrupt owner death, kernel failure, and unsupported hosts
  also remain
  outside the boundary. Those capabilities require an external cgroup, sandbox, VM,
  Job Object, or equivalent lifetime primitive.
- **No package is published.** Nothing has been pushed to npm or PyPI, and no DOI has been
  minted. The npm/PyPI/CI badges in the README are inactive by design. *Gate:
  R108, R134–R155.*
- **CI is a development workflow, not a release-certification matrix.** It runs
  contract, TypeScript, Python, and package-smoke jobs, but does not implement the full
  supported Node/OS matrix, nightly/RC soak, clean-room reproduction, or protected
  trusted-publishing workflow. The package engine and package-smoke definition now
  name the same closed Node 22/24/26 major set, but this change has not yet produced
  an executed release receipt and does not establish OS or prerelease-runtime support.
  *Gates: R098, R103, R116, R134–R155.*
