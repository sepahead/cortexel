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
  conformance. Several multi-series and matrix-sign distinctions remain
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
  `time_in_steps: false`. Adapter revision 3 additionally requires a closed
  `captureAuthority` with `kind: caller_declaration`: the exact runtime
  resolution/tic grid and successful-return closed-stop capture endpoint, a declaration
  that the named single-recorder PyNEST NumPy-to-plain-data projection preserved every
  event-array value and its order, single-process rank/thread scope, most recent recorder
  creation or `n_events=0` clear, most recent window/backend/
  time-encoding/sender-wiring mutation, monotonic biological time since the current
  kernel initialization, and an exact complete sender-universe binding.
  Strict validation resolves that request against the installed skill revision
  (currently revision 5).
  The request retains `(origin + start, origin + stop]`, native
  binary64 milliseconds, multiplicity, a digest of the detached plain-data projection,
  and a separate domain-separated digest over that projection plus every normalized
  adapter option.
  Step/offset,
  ASCII, screen, MPI, and SIONlib paths fail closed: no contract currently preserves their
  raw clock authority. Exact arithmetic proves relations among received binary64 values
  and declared integer-tic preimages; it cannot authenticate those tics, the projection,
  export, runtime/build, clock or buffer history, configuration history, recorder wiring,
  silent-sender completeness, process scope, run identity, or export custody. Every
  capture-authority field,
  `nestVersion`, `recordedSenderIds`, and optional run/recorder id is a host declaration;
  neither digest is an attestation. Local thread-sibling status merging is admitted because
  the pinned single-process profile exposes it; MPI rank-local or caller-premerged status is
  not. The adapter has no committed, isolated, durable real-NEST conformance receipt.
  Limited ad hoc exact-version probes do not satisfy the certification profile, so the
  gate remains `NOT_RUN`.
  The packaged offline CLI makes this one executable path discoverable through
  `source catalog` / `source describe` and callable through
  `source adapt nest-spike-recorder`. That command accepts only a strict
  `{ exportedStatus, options }` JSON envelope, runs the same adapter, revalidates its
  request through the full stable gate, and emits canonical request JSON. The discovery
  inventory is separately domain-digested and contains no nonimplemented mapping.
  This improves agent ergonomics but creates no live-PyNEST, source-authentication, or
  R049 evidence.
  Every nonimplemented NEST path is `not_assessed`: its source notes retain reviewed
  constraints and candidate authorities without claiming a closed feasible profile.
  The remaining NEST paths (connections, positions, multimeter) and the planned Neo/NWB/NCP
  mappings are not implemented. No current NCP adapter capability exists; if
  one is introduced, it remains experimental until both real code and certification against
  an immutable NCP release exist — never against moving HEAD.
  *Gates: R049–R059.*
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
- **The official NEST v3.10 source denominator is closed; visualization coverage is
  still zero.**
  `docs/audit/nest-example-coverage.v1.json` pins NEST v3.10 commit
  `acca9704da248750219a027db99fec6cd1f9052a`, its root tree, documentation
  index, exact default runner and CMake orchestration context. The separately
  digest-bound canonical source artifact closes 112 Python paths (109 regular
  bodies and three orchestration aliases), 98 canonical entrypoint bodies, 92
  definition-only default-runner targets and twelve checked-in PNG/GIF/SVG
  assets. Its semantic SHA-256 digest binds the pinned Git SHA-1 object identities;
  it does not independently rehash every source blob. It reads Git objects without
  importing or executing upstream Python. Documentation references remain selector
  evidence rather than invented invocations, and runner target definitions remain
  definitions rather than runtime receipts. The inventory has not classified
  plotting callsites, figures, panels,
  overlays, tables, animations, interactive surfaces, stdout reports or explicit
  no-output results. Checked-in assets are not assumed to be emitted outputs.
  Mapping, packaged implementation, rendering, upstream execution and scientific
  comparison therefore remain independently `not_assessed`, `not_generated` or
  `not_run`; every visualization count is zero and the coverage claim is `none`.
  This mutable audit evidence is outside `contract/`, generated catalogs, the
  package manifest and build identities; `bun run check:ledger` validates the
  exact artifact bytes, semantic identities, ledger schema and no-transfer states.

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
- **Package-smoke authority is not a hostile process sandbox.** Prepared-state v2
  seals the exact Node executable and npm package tree, but not Node's dynamic
  libraries, operating-system services, or the TypeScript harness runtime. On the
  reviewed path, a live detached guardian is the sole process-group signal authority
  and the supervisor owns its exclusive control lease. Worker completion and
  guardian-local failures trigger the guardian directly; bounds, handled
  cancellation, and supervisor death close the lease, whose EOF triggers the same
  path. The guardian publishes one bounded intent and self-addresses the group
  exactly once while its own unreaped leader identity pins the PGID. The supervisor observes
  guardian exit, then only drains local pipes under a separate bound; neither it nor
  the outer caller signals or probes any numeric identity after the reap. The outer
  caller receives no PID/PGID and has no fallback.
  This evidence is not an independent kernel receipt that every member was killed.
  Direct guardian death, `EPERM`/`ESRCH`, malformed protocol, or a retained pipe preventing EOF
  fails closed without a later numeric signal. Same-UID guardian discovery/signaling,
  deliberate re-grouping or detachment, inherited-pipe retention, and a
  credential/security-label transition can escape or defeat the group sweep and
  require external cgroup/sandbox/VM containment.
  The prepared
  workspace's root, parent ancestry, modes, topology, and bytes are change-bound,
  but mode hardening is not a substitute for an externally enforced read-only
  mount against a hostile same-UID actor.
- **Python package subprocess cleanup is group-bounded.** The macOS/Linux gate
  requires a dedicated CPython 3.14.x host, default `SIGCHLD`, a single
  kernel-visible thread, and a fresh
  non-reaping `waitid(..., WNOWAIT)` child-ownership proof before its sole group
  signal. It never interprets `ProcessLookupError` as proof of an unreaped zombie,
  and it performs no numeric signal or `Popen.wait()` after an observation reports
  `ECHILD`. Its sole raw `waitpid` is a one-way boundary: an exception is terminal,
  with no retry, second wait, signal, or identity probe after the call begins. Linux
  requires readable `/proc/self/task`; Darwin requires the supported
  `libproc` `proc_taskinfo` ABI. Kqueue process readiness is not ownership evidence.
  This prevents
  the reviewed cleanup path from knowingly addressing a PID/PGID after its leader
  identity was released; it is not an atomic defense against hostile same-process
  native reaping or an unrelated signal handler racing the last proof. Descendants
  that detach, regroup, or shed the caller's signal authority remain outside this
  evidence and require external lifetime containment. Same-UID signaling of the
  owner, owner death, and unsupported hosts likewise remain outside the boundary;
  they fail closed where execution can still be controlled.
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
