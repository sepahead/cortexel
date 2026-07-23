# Known limitations of the current pre-1.0 development tree

`0.9.0` is the last tagged pre-1.0 release. The working source identifies itself as the
private, unreleased `0.10.0-dev.0`; neither identity makes a stable-contract claim. This
document is the honest list of what the current tree has not yet done—the alternative to a green
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
- **Analog response reductions are not a revision-2 response-curve method.** A scalar
  called “mean voltage”, “peak voltage”, or “mean state variable” is not auditable
  without the exact recorded channel, sender/compartment scope, sampling grid and
  completeness, reduction interval and boundary, missing-sample policy, and
  temporal-versus-cross-sender reduction order. Cortexel therefore keeps sampled analog
  evidence in `neuro.analog_trace` or `neuro.multisignal_trace` and refuses those
  pre-reduced response methods until a complete reduction-basis contract ships.

## Rendering

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
  render with a single accent colour and fixed layout; that statement does not certify
  their scientific derivations. The full versioned palette application (per-series
  Okabe-Ito tuples, perceptual colour maps for matrices,
  uncertainty bands), legends, and print/grayscale themes are specified in
  `contract/registries/palettes.v1.json` but not yet fully applied by the compilers.
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

- **The NEST spike-recorder adapter (plain-data path) is implemented** (`src/adapters/nest/`):
  it snapshots an exported NEST spike-recorder object, requires the recorded sender universe
  (never inferring it), requires the top-level device-status `n_events` field to be a
  non-negative safe integer exactly equal to both event-array lengths, does not assume
  chronological events, and produces a revision-2 `neuro.spike_raster` request for
  explicit NEST 3.9/3.10 memory output with
  `time_in_steps: false`. The request retains `(origin + start, origin + stop]`, native
  binary64 milliseconds, multiplicity, and a digest of the detached export. Step/offset,
  ASCII, screen, MPI, and SIONlib paths fail closed: no contract currently preserves their
  raw clock authority. Exact arithmetic proves relations among received binary64 values;
  it cannot recover NEST's hidden integer-tic state or authenticate the export. The adapter
  has not been tested against real, version-pinned NEST output, so the certification gate
  remains `NOT_RUN`.
  The remaining NEST paths (connections, positions, multimeter) and the planned Neo/NWB/NCP
  mappings are described but not implemented. No current NCP adapter capability exists; if
  one is introduced, it remains experimental until both real code and certification against
  an immutable NCP release exist — never against moving HEAD.
  *Gates: R049–R059.*

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
  codes, peer isolation, the tarball allow-list, and exact tar entry modes. A final
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

## Flaky test

- `test/coreIsHostAgnostic.test.ts` (a LEGACY test) spawns a subprocess import of the old
  `core/` and can time out at 5 s under parallel load; it passes in isolation. Per the
  blueprint a flaky test is a defect; removal of the legacy tree is not counted as a fix
  until the relevant release check is rerun without quarantine or retry.
