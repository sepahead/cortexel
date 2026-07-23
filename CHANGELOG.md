# Changelog

All notable changes to Cortexel are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed — synaptic-weight cross-field authority

- The revision-2 synaptic-weight validator now owns the complete raw and
  pre-aggregated boundary: unique/resolvable membership, positive ordered
  non-overlapping intervals, positive recorded-window overlap, every dynamic
  parallel-array length, exact evaluation grids, coherent member/contributor/null
  identities, nested uncertainty, and observation/evaluation compatibility. These
  laws fail before rendering instead of relying on `Map` overwrite behavior or a
  fixed three-series pointer list.
- Synapse-model comparability is now an exact duplicate-free set claim for physical
  and simulator-defined weight units alike, including pre-aggregated input. Optional
  event causes remain exactly row-aligned, and a contradictory lower/upper reference
  bound is refused after exact unit conversion without clamping any observation.
- Decision-critical observation, window, recording, membership, and evaluation times
  now form a checked finite-set order embedding under unit conversion; unequal physical
  times may not collide at one displayed binary64 value, and interval widths may not
  collapse. Hold grids include every denominator/availability transition, sparse declared
  grids are refused, mixed left/right-continuity aggregates fail closed, and closed
  individual/pre-aggregated endpoints are retained instead of silently dropped.
- Weight duplicate aggregation now reads the contract's `{policy, method}` shape;
  event updates cannot be averaged and unidentified shared-grid replicates cannot be
  paired by ordinal. Derived Type-7 quantiles and sample standard deviation use exact
  BigInt rational algorithms, one-contributor dispersion has a null sample count, and
  pre-aggregated uncertainty is denominator-bound. Caller-declared aggregate/interval
  methods and the absence of unique pre-aggregate cardinality are disclosed explicitly.

### Fixed — exact aggregate and phase-normalization arithmetic

- Declared compartment means and sums now keep binary64 values, weights, products,
  cancellation, and the mean denominator exact until one final ties-to-even rounding.
  Equal minimum-subnormal weights therefore preserve their ratio, extreme products may
  cancel before range checking, input permutation cannot change the answer, and a truly
  unrepresentable nonzero result is refused.
- Axis-normalized phase-plane components now divide by the exact difference of the finite
  drawn endpoints. Opposite-sign extreme domains no longer overflow their native span to
  infinity and erase nonzero vectors; the same components feed the table, arrow geometry,
  magnitude legend, derivation receipt, and independent OutputAuthority evaluator.

### Fixed — development and release identity

- The unreleased package now uses paired development identities:
  npm SemVer `0.10.0-dev.0` and PEP 440 `0.10.0.dev0`. Generation checks the
  normalized mapping before emitting the Python runtime package identity.
- Development metadata is explicitly private and carries no `publishConfig`.
  A read-only `release:verify` gate requires coherent final-release metadata, the
  structural evidence ledger, a clean HEAD, and an exact annotated tag; the current
  artifact schema independently blocks release because no release-stamping producer
  exists yet.
- Project `bunfig.toml` disables Bun runtime dotenv loading, including through nested
  package scripts, and an executable sentinel guards that behavior. Because package
  managers, Vite, or a dependency can still read files in the checkout, research
  credentials are kept outside the repository rather than relying on `.gitignore` or
  `env = false` as a filesystem sandbox; any narrowly scoped first-party research client
  must opt in and read its external credential store explicitly.
- The evidence-ledger checker now rejects duplicate JSON members, malformed or stale
  release arguments, and invalid project/release/statement metadata. Publication
  lifecycle checks include the ledger, Python suite, build, full test suite, audit,
  package lint, and clean-install package smoke behind the release verifier.
- The lockfile now overrides Ajv's compatible `fast-uri` range to patched `3.1.4`,
  excluding the high-severity literal-backslash authority-confusion vulnerability in
  `3.0.0` through `3.1.3` without adding a second, incompatible major version.
- CI now exercises every declared Python minor (3.11–3.14) and the closed supported
  Node-major set 22/24/26; `engines.node` names that same set rather than an
  open-ended range that would silently claim untested future majors or EOL Node 20.
  CI also pins current checkout/setup actions by immutable SHA, drops persisted checkout
  credentials, compiles the Python reader before testing, and bounds every job by an
  explicit timeout.
- The Python reader is strict-mypy clean and CI runs pinned mypy and Ruff versions.
  Its generator now projects the exact common, enum, and 19 stable skill schemas into
  the wheel instead of resolving repository-relative files. A reproducible-build smoke
  compares repository-context artifacts with artifacts from an exact VCS-free source
  copy byte-for-byte, requires a closed full-sdist and schema inventory, checks the PEP
  561 marker, MIT license, dependency-free metadata and archive safety, and clean-installs
  from an unrelated directory. Unregistered skill ids are rejected before resource-path
  construction, closing the former development-tree traversal oracle.

### Added — additive packaged FigureRequestV1 surface

- The legacy `cortexel`, `cortexel/core`, `cortexel/react`, chart,
  knowledge-graph, and `cortexel/skills.manifest.json` entry points remain in place.
  FigureRequestV1 is added alongside them at `cortexel/figure`, with deterministic
  headless rendering at `cortexel/render-svg`, the plain-data NEST adapter at
  `cortexel/adapters/nest`, and normative JSON through `cortexel/contract/*`.
- All new code subpaths ship explicit ESM, CommonJS, and declaration conditions. The
  offline CLI is installed as the `cortexel` bin with a Node shebang while preserving
  its strict argument grammar, granular exit codes, import guard, and fail-closed
  output publication rules.
- A post-build gate independently enumerates and strict-parses every normative JSON
  source, reproduces its JCS digest plus the aggregate contract and stable-catalog
  digests, and copies exact bytes once under `dist/contract`. Runtime validation locates
  that module-relative copy and never resolves schemas from the working directory or
  network.
- Package smoke tests install the actual tarball in an isolated consumer and exercise
  old and new ESM/CommonJS imports, declarations, peer isolation, validation from an
  unrelated working directory, shipped digest reproduction, CLI identity and exit
  behavior, and tarball source/secret exclusions. `availability: packaged` remains
  independent of publication and `releaseReady`; every stable skill is still
  `releaseReady: false` pending the recorded scientific release evidence.

### Fixed — correlogram product and role authority

- `neuro.correlogram` and `figure.correlogram` are now revision 2. Revision 1
  accepted a materially different pooled-event/pre-binned request and did not bind
  the role-local authority, exact pair-accounting table, summary, and geometry now
  required; a revision-1 pin is refused rather than reinterpreted.
- The source `neuro.correlogram` contract now has closed raw-event and pre-binned
  auto/cross products. Raw products carry explicit role-local train containers,
  complete recorded-sender universes (including silent senders), parallel event
  identities, fixed `target_time_minus_reference_time` orientation, and an explicit
  self-pair policy; the compiler must derive event counts and duration instead of
  accepting redundant caller authority or inferring roles from active senders.
- Cross products require disjoint reference/target train identities and sender
  universes. Revision 2 admits only `raw_pair_count` and
  `target_rate_per_reference_event`; coefficient-like branches, overlap correction,
  and binned-value switches are absent rather than structurally accepted without a
  renderer. A separate future Pearson design record is explicitly not release ready.
- Pre-binned products carry exact role event counts so the compiler derives one exact
  candidate = counted + out-of-range + excluded-self-pair receipt. Zero eligible
  denominators are represented by a null rate with an explicit status, never by a
  fabricated zero or a validation exception. Caller-supplied rates and weighted pair
  sums remain refused. The pre-1.0 packaged `VizSpec`/NEST adapter remains unchanged.
- Correlogram uncertainty is narrowed to explicit `none` in revision 2. Dispersion
  and interval arrays stay refused until one branch carries them through units,
  missingness, table, summary, legend, and geometry without dropping a field.
- Every correlogram bin is now explicitly left-closed/right-open, including the final
  bin: the negative outer edge is included and the positive outer edge is excluded,
  matching NEST's `correlation_detector` convention.

### Fixed — neuro skill and renderer revision identity

- All ten stable `neuro.*` skill sources now publish revision 2, name the matching
  `.output_authority.v2` evaluator, and reference a revision-2 renderer. The analog,
  multisignal, compartment, population-rate, PSTH, correlogram, distribution, and
  phase-plane renderer entries now expose the corresponding revision; phase-plane
  also declares its emitted arrow mark. Current pins resolve exactly and prior
  revision-1 pins fail closed. This corrects unreleased identity drift after the
  accepted meaning, table, summary, or rendered output changed; it does not declare
  revisions 1 and 2 interchangeable.
- Successful validation now always materializes the resolved installed skill revision
  at `canonicalRequest.skill.revision` in a detached copy. An omitted authored pin and
  an explicit-current pin therefore produce identical canonical bytes, request digest,
  SVG seed, and artifact; prior/future pins still refuse during identity resolution.
  FigureArtifactV1 uses that canonical path as its sole skill-revision stamp and keeps
  renderer identity under `render`, without a duplicate top-level identity. This
  intentionally changes request digests, deterministic SVG ids/metadata, SVG bytes, and
  artifact digests for formerly unpinned requests; explicit-current canonical identity
  is unchanged by this repair alone.

### Fixed — canonical contract identity boundaries

- Normative-source parsing now rejects unsafe bare-integer spellings that round onto a
  different binary64 value while retaining canonical binary64 integer spellings. Every
  JSON meta-schema under `contract/meta/` is deterministically included in the contract
  digest, and canonicalization references in the shared common schema are checked against
  the closed algorithm registry instead of being missed behind `$ref`.
- The identifier-set registry now carries and executes a rejection vector for every
  declared failure class, including non-array input and non-string members. TypeScript
  normalization rejects ill-formed Unicode directly; the independent Python boundary
  rejects lone surrogates in both values and member names with `JSON_INVALID_UNICODE` and
  accepts only exact JSON lists containing exact strings for identifier-set identity.

### Fixed — NEST spike-recorder clock authority

- `neuro.spike_raster` and `figure.spike_raster` are now revision 2. Revision 1
  represented every recorder window as `[start, stop)`, but NEST recording devices use
  `(origin + start, origin + stop]`; archived revision-1 results must not be silently
  reinterpreted. The new request preserves the origin-relative terms and exact closure,
  compares received binary64 quantities without first rounding their sum, and refuses a
  display interval whose one permitted endpoint conversion collapses or overflows.
- The plain-data NEST adapter now admits only explicit NEST 3.9/3.10 memory exports
  with `time_in_steps: false`. This is a fail-closed revision-2 source-declaration
  profile, not upstream certification; the real-environment gate remains `NOT_RUN`.
  It rejects missing encoding status, step/offset clocks,
  ASCII, screen, MPI, and SIONlib boundaries; preserves nonchronological order,
  multiplicity, and fractional milliseconds; requires the complete recorded-sender
  universe; requires the authoritative top-level device-status `n_events` count and
  reconciles it exactly with both event arrays; and binds its detached export snapshot
  with a canonical SHA-256 digest. Missing, unsafe, fractional, or mismatched event-count
  authority fails at `/n_events` instead of being inferred from an apparently complete
  pair of arrays.
- Origin-relative requests are bound to `source.kind: simulation`, `system: NEST`, the
  revision-2-admitted version range, native millisecond events,
  `timeBase: absolute_clock`, and a
  full source digest. A mandatory disclosure states that validation covers the serialized
  binary64 declaration, not NEST's hidden integer-tic state or source authenticity.
- Raster compilation now honors all three generic event closures plus the NEST closure,
  converts window endpoints into the event display clock exactly once, excludes only
  marks under `exclude_and_disclose`, retains every source event with an `inWindow`
  audit cell, preserves duplicate identities, allocates silent sender/trial rows, and
  records accepted/excluded counts and deterministic row/sort policy. The complete
  sender-by-trial row product is preflighted with saturating arithmetic before allocation;
  population grouping is linear in the declared sender universe; and declaring a trial
  universe without the positionally parallel event-trial identities is structurally
  refused rather than silently compiling a sender-only raster.
- The revision-2 spike contract no longer advertises the unimplemented
  `raster_density_bins` path. Over-mark and over-returned-table requests fail closed until
  count-conserving geometry and a digest-bound complete table are both implemented.

### Fixed — exact numeric and unit authority

- Unit conversions now compose registered decimal powers as exact integer ratios and round
  only the final binary64 result. Conversion receipts preserve that exact ratio, and
  window membership, converted differences, clock offsets, duplicate means, baseline
  normalization, and min/max normalization use exact-integer intermediates so cancellation,
  subnormals, or a large coordinate origin cannot silently change the scientific result.
- Linear scales now preserve both endpoints over the complete finite binary64 range.
  Logarithmic and symmetric-logarithmic scales use vendored fdlibm-derived `log`, `log1p`,
  and `exp` kernels with pinned low-bit vectors, monotonicity/property tests, explicit
  inner-resolution refusal, and bounded full-range round-trip error.
- Simulator-defined synaptic weights remain non-convertible, but the weight-trace contract's
  explicit model-comparability declaration is now checked against every series before an
  identical opaque unit code may share an axis.
- Width-bin materialization, bin centres, and bin widths now avoid overflowing finite endpoint
  arithmetic. Population-rate denominators use exact quotient arithmetic, and supplied rates
  are verified in their declared unit without a near-zero absolute-tolerance loophole.
- The binary64 full-bin/full-step acceptance rule is now a normative, generated numeric-policy
  registry rather than an implementation-only convention. It publishes exact 2^-1074 decoding,
  round-to-nearest-even steps, quotient and endpoint tolerances, the materialization cap,
  edge-collapse refusal, failure classes, and cross-language conformance vectors. The
  algorithm and each policy carry a closed, versioned structured semantic identity plus
  typed parameters; source checks reject missing or unknown semantic ids, version or
  parameter drift, incompatible prose, and prose-only mutation. Adversarial vectors cover
  repeated-addition drift, late coordinate collapse at the 2^53 spacing boundary, and an
  endpoint immediately outside the eight-epsilon acceptance bound.

### Fixed — capability/export honesty

- ESM and CommonJS `cortexel/figure` validators now hand their live
  `ValidatedRequest` capabilities to either `cortexel/render-svg` format through one
  package-private module-cache registry. Previously the CommonJS subpaths bundled
  separate `WeakSet` registries and rejected an honestly validated cross-subpath
  request. The shared registry is not global or symbol-forgeable; packed smoke tests
  cover all four format pairings plus copied/proxied-token and private-path refusal.
- `cortexel/render-svg` now exports only the three end-to-end figure builders and their
  result/failure types. The raw RenderPlan construction grammar, resource counter,
  caller-selected digest callback, formatting/scaling primitives, and SVG serializer
  remain internal, closing a public path that could previously label a caller-constructed,
  ungated plan as Cortexel output. Package ESM, CJS, declaration, and deep-import smoke
  tests pin this authority boundary.
- Stable figure capabilities now advertise only `svg+table`. Although the
  renderer can expose a checked in-memory table, the artifact output inventory currently
  binds only the SVG; CLI-authored CSV bytes are therefore not a contract-owned sidecar.
  The render boundary continues to refuse incomplete excerpts, and a new capability
  conformance test renders every stable skill's first valid example and prevents any
  `svg+table+sidecar` claim from returning without canonical sidecar bytes, a matching
  table digest, complete-row semantics, and a bound artifact output.
- Capability maturity and concrete delivery are now separate mandatory axes: all
  nineteen FigureRequestV1 skills are semantically `stable` and the additive runtime
  makes them `packaged`; legacy package exports are also `packaged`, while removed
  tombstones are `unavailable`. Generator/source tests derive package, build-entry, CLI-dispatch,
  skill, renderer, and migration evidence bidirectionally. Metadata-only
  `figure.bundle`, nonexistent `cli.verify`, invented experimental skill/renderer ids,
  and the nonexistent NCP export were deleted instead of being documented as code.
- FigureArtifactV1 now requires render and accessibility evidence, a nonempty output
  inventory containing exactly one normative `image/svg+xml` record, a catalog digest,
  and one canonical request digest. It rejects the impossible artifact-JSON self-output
  cycle and removes every unreachable rejection, compaction, sidecar, PNG, provenance,
  attestation, and reference-oracle branch instead of reserving false capabilities in a
  successful-output schema. `complete_returned` means every table row accompanies the
  artifact in memory; `tableBinding: shape_only`, exact ordered column keys, and one row
  count explicitly bind shape while denying integrity for unbound cell/row bytes.
- Artifact 1.0 no longer implies that a caller can clear source-authenticity or
  credible-interval refusals by supplying an attestation: the current contract has no
  attestation input or verifier, requires the artifact slot to remain empty, always emits
  the authenticity disclosure, and treats `credible_interval` only as diagnostic
  vocabulary that every stable skill refuses.
- The artifact schema now rejects impossible parser-assurance cross-products, phantom
  release stamps, unknown budget/theme/accessibility profiles, and mismatched renderer
  revisions. It embeds the closed stable per-skill request union as a structural
  emission postcondition, while explicitly denying that schema validation recomputes a
  digest. The duplicate `budgetDecision.profileId` was removed; the applied profile has
  one authority in `inputAssurance.budgetProfile`.
- Contract generation now executes the skill-source meta-schema before producing any
  digest or output. The prose ceilings were raised only to reviewed finite bounds that
  contain the living scientific specifications; previously the unexecuted meta-schema
  silently rejected fourteen of nineteen sources it purported to govern.
- The CLI implementation no longer writes an ad hoc lossy CSV and no longer describes its two
  files as a transaction. A non-dry render now requires `--output`; every command uses a
  closed argument grammar; unknown, duplicate, missing-value and extra arguments fail as
  usage errors; and `--url` is not a render option. Final entries are inspected with
  `lstat` so dangling symlinks cannot evade overwrite refusal. Complete SVG and canonical
  artifact JSON bytes are fsynced where supported in short, unpredictable,
  exclusively-created temporary siblings. Non-force publication uses an atomic hard-link
  no-replace operation and refuses rather than falling back to a clobber-prone rename on
  filesystems that cannot provide it. Force mode removes the stale artifact marker before
  replacing the SVG; the new artifact is installed last, and parent-directory changes are
  fsynced where supported. The pair remains non-transactional, and a caller-selected
  directory is not elevated into trusted output authority. Diagnostics do not echo raw
  filesystem paths, imports cannot trigger CLI execution by basename, and direct execution
  sets `process.exitCode` so successful stdout can drain. The budget registry
  removed the metadata-only bundle-panel limit and labels non-`none` compaction algorithms
  and sidecar byte ceilings as inactive future specifications; all current stable skills
  are complete-returned-or-refuse.

### Fixed — binned scientific compilers

- Population-rate rendering now converts event clocks into the declared bin frame, re-derives
  prebinned rates from exact counts and denominators, emits Hz consistently, and records the
  conversion and denominator receipt. Unsupported kernel modes fail closed instead of being
  substituted with a binned step plot.
- ISI rendering now supports both event and supplied-interval modes, exact within-train
  differences, explicit edge and width bins, count/probability/density normalization, log
  axes, exact window-duration checks, bin-range policy, and derivation receipts. Event mode
  counts the complete sender-by-trial train universe, supplied mode reconciles every train
  and its total interval span, and a rounded derived interval that would change exact
  half-open bin ownership is refused.
- Delay and weight distributions now honor declared/prebinned edges, measurement-unit
  conversion, per-connection versus per-ordered-pair counting, multapse aggregation,
  count/probability/density normalization, and log axes. Synapse-model groups are partitioned
  before aggregation and normalized independently; missing weights remain row-aligned and
  invalidate a node-pair observation rather than shrinking its sum. Prebinned histograms are
  no longer replaced by invented empty ten-bin plots, and reject-range policy is enforced in
  both modes.
- Histogram validation now rejects negative probability/density values, requires reciprocal
  density units, uses exact binary64 accumulation for probability totals and density
  integrals, requires safe-integer counts, and reports an explicit no-data refusal instead of
  fabricating an all-zero probability or density when the denominator is zero.
- Unit-bearing derivations now surface their conversion receipts through the mandatory
  `UNIT_CONVERTED` disclosure, and identical simulator-defined trace units no longer attempt
  an impossible physical conversion during affine-integrity checks.
- Histogram exclusions and missing-measurement accounting now reach the accessible summary
  and render-plan audit columns as well as the derivation receipt. Pre-binned and missing-value
  disclosures use observation-neutral wording, and `MULTAPSE_AGGREGATED` fires only when
  connection rows were actually collapsed into a rendered aggregate.
- Unique-neighbor degree rendering now uses the contract spelling
  `count_unique_neighbors`; the former internal British spelling silently selected edge
  counting for a valid contract request and is removed.

### Fixed — response-curve semantics

- `neuro.response_curve` is now skill revision 2 and `figure.response_curve` is renderer
  revision 2. Revision 1 did not bind the selected event-train estimand: identical scalar
  counts, rates, or latencies could describe one train or a pooled sender population without
  an artifact-level distinction. Revision 2 requires a caller-declared event scope and
  surfaces its selection, pooling, completeness, and membership authority throughout the
  checked artifact. This is a documented pre-1.0 scientific erratum, not a patch-level
  reinterpretation of archived revision-1 output.
- Response curves now derive condition estimates through a dedicated scientific layer:
  numeric conditions require unique inputs and sort ascending, while ordinal and nominal
  conditions retain declared order, observations sort by condition and repeat identity,
  duplicate condition/repeat pairs and undeclared condition references fail closed, and
  missing responses remain counted gaps rather than sliding parallel arrays or becoming zero.
- Raw repeats implement a correctly rounded exact-binary64 mean, even-sample median, and
  per-tail trimmed mean over retained observations. The mean accumulates exact 2^-1074
  integer units and rounds once, so it is permutation-invariant and does not overflow merely
  because a finite mean has an unrepresentable sum; a non-zero exact result that would
  underflow to binary64 zero is refused rather than flattened. The same refusal applies to
  the exact midpoint of an even-sample median. Aggregate-only input preserves nullable sample
  counts, emits a mandatory estimator-and-sample-count disclosure, and never implies that
  raw repeats or pairing were inspected.
- The parameter-level response method is now bound to the method that types the response
  object with a dedicated science error; a mean rate, peak rate, latency, or event count can
  no longer be relabelled as another quantity. Revision 2 no longer advertises pre-reduced
  membrane-voltage or generic state-variable responses: those methods lacked the recorded
  variable, sender/compartment scope, sampling grid, reduction interval, missing-sample
  policy, and temporal-versus-cross-sender reduction order needed to make their values
  auditable. Sampled analog evidence remains representable as an analog or multisignal
  trace until a complete reduction-basis contract ships. Every mean or peak rate distinguishes a single
  train, a pooled total over a disclosed sender universe, and a mean per recorded sender;
  the normalization and sender count are visible in the y axis, table, accessible summary,
  derivation output, digest, and receipt. Optional exact mean-rate event-count audits use the
  divisor selected by that normalization, require exact safe-integer counts and the same null
  mask as the responses, and derive the declared frequency unit through one exact rational
  and one final binary64 rounding. Exact equality replaces a relative tolerance that could
  admit large count errors at large magnitudes. Numeric conditions must have unique inputs,
  and duplicate categorical display labels are disambiguated by condition id on every
  displayed tick. The audited sender denominator is bound into the derivation digest and
  receipt. Aggregate missingness now sums declared excluded attempts exactly; a null
  no-attempt condition remains a visible gap but is not fabricated into a missing
  observation. Totals that cannot remain exact safe integers fail closed at validation
  and rendering.
- Peak-rate requests now carry complete mathematical authority. Binned peaks bind width,
  count, half-open origin/boundary, the named bounded-binary64 full-bin materializer, and a
  no-partial-bin policy to the typed measurement window. Kernel peaks bind shape, form,
  bandwidth convention, support/cutoff and tail normalization, direct-sum operator, edge
  correction, and either a continuous supremum or an exact sampled grid. Incoherent kernel
  identities, causal edge renormalization, grid counts, boundaries, and tilings fail closed;
  the full basis is surfaced rather than reduced to a vague bandwidth label.
- Binned peak rates now obey one exact safe-integer count law in both request modes.
  Raw binned peaks require parallel `audit.peakBinCounts`; Cortexel re-derives every defined
  repeat rate, orders and trims defined rows by the exact counts, forms every defined
  mean/median/trimmed-mean condition estimate at count level, and rounds only the final
  declared-unit rate. Aggregate-only binned peaks prove existence
  on the corresponding integer-total lattice. This removes the prior raw-versus-aggregate
  one-ulp ambiguity from averaging already-rounded repeat rates.
- Raw mode now declares attempted counts per condition and verifies every submitted row.
  Trimmed means retain separate retained, symmetrically trimmed, and undefined-excluded
  counts; raw table rows identify retained, trimmed-low, trimmed-high, and undefined roles,
  while aggregate mode verifies `trimmedCount = 2 * floor_exact((retained + trimmed) * f)`.
- Response-method domains are enforced before derivation: rates and aggregate count estimates
  are non-negative, raw counts are exact non-negative safe integers, and a defined first-spike
  latency is non-negative. Revision 2 binds latency only to the measurement-window start:
  zero means the first event occurred exactly at the included start, while null alone means
  no event. The exact typed duration is checked against the window; stimulus-onset latency is
  refused until a typed onset coordinate relative to the window exists. Raw paired designs
  must carry the identical repeat-id set at every condition; missing pairs are refused rather
  than imputed.
- Numeric log axes reject non-positive declared conditions; nominal conditions receive no
  connecting line; ordered guide lines stop at missing conditions and are labelled as guides,
  not fits or interpolation. Undefined conditions receive an explicit vertical x-position
  marker, and an all-undefined curve retains its declared x-axis instead of collapsing to an
  axis-free empty panel. All living valid examples now render populated figures.
- Response y domains now include the meaningful zero baseline, preventing a narrow high-valued
  range from occupying the full panel. An all-zero curve keeps a single exact zero tick at the
  bottom rather than midpointing zero or inventing a positive observed extent. All-null raw
  peak-count audits verify their null mask but report rate/estimator derivation and defined-peak
  facts as not applicable, with accessibility prose that does not claim nonexistent work.
  Mixed-null audits name the derivation algorithm only on defined rows and estimates; aggregate
  all-null binned peaks record zero checked lattice values while leaving verification and
  algorithm facts null/not applicable. Raw trim-boundary ordering is likewise null when no
  defined audited row exists, and aggregate-only input never claims a raw tie-order rule.
- The exact alternative table now carries the contract's response columns for every raw
  repeat and every condition estimate, including explicit rate-normalization, sender-universe,
  estimator-role, and trimmed-count fields. Derivation receipts bind canonical condition
  order, attempted/retained/trimmed/excluded accounting, stable source ordinals and their
  digest, while the accessible plotted range uses complete binary64 spellings and excludes
  raw-repeat extrema that are not themselves plotted.

### Fixed — analog and multi-signal trace semantics

- Replaced the first-series-only trace shortcut for `neuro.analog_trace` and
  `neuro.multisignal_trace` with a shared deterministic derivation that renders every
  declared series and panel. It stably sorts samples, enforces half-open windows, preserves
  missing values as path breaks, applies declared duplicate-time resolution, converts units
  once, applies declared clock offsets, and implements sample-standard-deviation z-scores.
- Shared-axis overlays now use the registered categorical colour/dash/marker tuples and emit
  a visible, accessible-table-backed legend; small multiples retain declared panel order and
  shared-time-axis geometry. Every retained sample from every series reaches the table rather
  than silently disappearing after `series[0]`.
- Duplicate-time validation now understands both the string and structured policy shapes,
  checks shared clocks as well as per-series clocks, and rejects an explicit `reject` policy
  when duplicate timestamps are actually present.
- Trace uncertainty now has contract-generated mark semantics: standard deviation/error use
  capped whiskers, intervals use outlined bands, and missingness masks must agree with the
  central observations and sample counts. The renderer refuses uncertainty transforms whose
  widths collapse or materially distort at binary64 resolution.
- Trace layouts fail closed when mandatory panels, axes, legends, tables, accessibility text,
  and disclosures cannot leave a positive plotting region. Isolated retained observations
  receive visible markers instead of disappearing when they cannot form a path segment.

### Fixed — validation and artifact integrity

- Made validated-request authority identity-based and deeply immutable: the renderer now
  accepts only the exact token minted by this module, so look-alike objects, copied symbol
  brands, hostile proxies, and post-validation nested mutation cannot bypass or invalidate
  the checked request digest.
- Artifacts are assembled and frozen only after their accessibility and render fields are
  final. Their self-digest now recomputes exactly, SVG byte lengths count UTF-8 bytes, and a
  missing stable compiler fails closed instead of returning a schema-invalid partial artifact.
- SVG metadata now names the bound request digest truthfully and declares its XML namespace;
  rendered strings reject XML-forbidden U+FFFE/U+FFFF, and the accessible description carries
  every mandatory disclosure verbatim.

### Fixed — boundary, numeric, and resource authority

- Budget profiles are now a closed, deeply immutable registry. Unknown, inherited,
  accessor-backed, boxed, and proxy-trapped profile selections fail closed; host and request
  profiles compose only by selecting the component-wise tighter published envelope. A
  request-selected tighter profile is re-parsed or re-snapshotted before validation, and the
  effective profile is recorded in the artifact and its mandatory disclosure.
- Raw and materialized boundaries now enforce the same bounded string authority, reject
  non-canonical unsafe bare integer tokens that would diverge between binary64 and
  exact-integer JSON readers, accept only the RFC 8785 spelling needed to re-read an
  emitted binary64 measurement, count UTF-8 without allocating a second input-sized buffer, and remain total for
  hostile API arguments. Canonicalization rejects accessors, symbols, sparse/decorated arrays,
  and uninspectable proxies without invoking ordinary getters, with escaped RFC 6901 paths.
- The independent Python preview no longer treats an empty result from its documented
  semantic subset as a full validity certificate. `validate_request` now fails closed with
  `SEMANTIC_VALIDATOR_UNAVAILABLE` until every registered validator for the selected skill
  is ported; `validate_request_partial` names the development-only subset explicitly.
- The Python materialized-value boundary now snapshots only exact built-in JSON types into
  a detached tree before authority or schema checks. It rejects cycles, subclass overrides,
  dangerous keys, malformed Unicode, non-finite or non-interoperable numbers, and standard
  depth/node/string/container budget violations without invoking caller code. Python and
  TypeScript also share the registry's Unicode-code-point diagnostic ordering, preserve all
  failed union-branch diagnostics until the sole global cap, mirror selected conditional
  branch parent records, and emit the same 32nd `ERROR_LIMIT_REACHED` receipt with its
  exact omitted count.
- Python schema resolution now roots fragment-only references in the schema resource that
  owns them, including skill-local definitions and nested fragments reached through the
  shared common schema. Matrix source schemas no longer make the registered incomplete-node-
  universe semantic refusal structurally unreachable; all three matrix contracts exercise
  the intended `SCOPE_NODE_UNIVERSE_REQUIRED` boundary, and PSTH negative vectors carry the
  complete revision-2 alignment and bin-boundary baseline before testing their one defect.
  PSTH alias refusal also has one diagnostic owner in both runtimes instead of cascading
  into a second, misleading dimension error for an otherwise recognized alias.
- Generated TypeScript and Python registries are recursively immutable; generated object maps
  use null prototypes. Contract generation now rejects duplicate/dangerous map keys and parses
  every normative JSON source with duplicate-member detection, including escaped-equivalent
  names, before emitting any authority.
- Width-mode bins now require an exact, bounded binary64 tiling; correlogram lag bins use the
  contract's centred `2m+1` geometry. Correlogram preflight and filling use monotone windows with
  a hard pair-operation bound and agree with a quadratic oracle over randomized inputs.
- Render preflight now enforces per-series/request observations, graph nodes/edges, exact matrix
  cell products, pairwise operations, drawn marks, text nodes, returned-table completeness, SVG
  bytes, and positive layout geometry. Large extrema no longer use spread calls that overflow
  the JavaScript argument stack, and artifact mark counts equal the SVG data marks actually
  emitted rather than packed path vertices.
- Added adversarial/property suites covering every registered unit pair, 1,500 randomized
  bin/correlogram cases, million-rank topology declarations, hostile boundary objects, immutable
  generated authority, and exact resource receipts. The independent Python mirror carries the
  same integer-domain and immutability checks.

### Fixed — repository hygiene

- Removed tracked Python bytecode caches and one-off scratch repro scripts with stale
  machine-local paths; Python cache artifacts are now ignored so source archives and
  audits contain only reproducible inputs.
- Kept the clean-consumer package smoke bounded and truly core-only at its first stage:
  npm no longer traverses optional React Native/Expo peer metadata before the core probe,
  while every documented peer set is still installed explicitly and exercised.
- Added a complete third-party notice bundle for shipped colour-map data/approximations and
  the fdlibm-derived deterministic kernels. The npm package allowlist and clean-consumer smoke
  now require the notice and every referenced license file to be present in the tarball.

## [0.9.0] — 2026-07-15

### Fixed — adversarial review reconciliation (12 findings)

An adversarial multi-lens review (science, security, honesty, coherence) with independent
verification surfaced 12 confirmed defects; all are resolved. Full record in
`docs/release/evidence/0.9.0/REVIEW-2026-07-15.md`.

- **(P0, honesty) Topology/spatial/scope disclosures were dead.** `disclosureFacts` never
  derived `scopeKind`, node-universe completeness, multapse aggregation, schematic layout,
  or missing positions, and the `forced` disclosures argument was hardcoded empty — so a
  rank-local, sampled, or incomplete network rendered with none of its mandatory
  disclosures, and a correlogram never stated its lag orientation. Both are fixed and
  guarded by `test/disclosureCompleteness.test.ts`: scope/multapse/layout facts are derived
  from the request, and a per-skill forced-disclosure set fires the compiler-only rules.
- **(P1, science) Matrix value arrays lost index alignment on a null**, drawing every later
  cell with another edge's value; and a **pre-binned PSTH rendered as all zeros**. Both
  fixed with index-aligned handling and hand-vector / render regression tests.
- **(P2) Binned branches now honour the request's declared final-edge convention** instead
  of a hardcoded `true`; **omitted uncertainty fails closed** to the not-provided disclosure;
  **themes and budget profiles are now generated enums** with one authority; the generator's
  typed-keyword check covers numeric keywords.
- **(P3)** `cortexel migrate` now routes through the strict parser (limits + duplicate-key
  rejection) instead of raw `JSON.parse`; the generator asserts the renderer id agrees
  between the skill contract and the capability record.

### Added — budgets, accessibility, quarantine, and CI (M5/M6/M7)

- **Runtime observation-budget preflight.** Before any derivation, `buildFigure` counts a
  request's observations and refuses one over the figure's budget — a distinct, tighter
  limit than the parser's node bound. A hard limit fails; it never silently truncates.
- **Value-filled accessibility summaries.** The `{placeholder}` template is replaced with a
  deterministic summary built from the figure's own data — its title, row count, the
  numeric range of its value column, and its disclosures. The same text appears in the
  render plan, the SVG `<desc>`, and the artifact. No interpretive claim ("significant",
  "increased") is generated.
- **Import-boundary test (experimental quarantine, proven).** A static scan
  (`test/importBoundary.test.ts`) asserts the stable core, analysis, render, and CLI layers
  import no `react`, `three`, `@react-three/fiber`, `d3`, or `experimental/` module, and
  that the render layer stays browser-safe (no Node-only imports).
- **CI additions.** A `contract` job runs `check:generated` (freshness + determinism) and
  `check:ledger` (no forged PASS); a `python` job runs the standard-library Python suite.

### Added — independent Python reader and cross-language parity (M3)

- **`python/src/cortexel/`** — a genuinely independent Python implementation that
  validates, canonicalizes, and digests requests without invoking Node or importing any
  generated JavaScript. Pure standard library: no `jsonschema`, no NumPy.
  - Strict parsing rejects duplicate object members (via `object_pairs_hook`),
    prototype-polluting keys, and non-finite numbers.
  - RFC 8785 canonicalization implemented from the scheme's rules, including the
    ECMAScript `Number::toString` algorithm and UTF-16 code-unit key ordering — matching
    the TypeScript canonicalizer to the byte, including astral-character (emoji) sort.
  - Structural validation reads the same normative schemas the TypeScript side reads;
    the caller-authority boundary and the unit rules (alias rejection, dimension matching)
    are ported and agree with TypeScript.
- **`test/crossLanguageParity.test.ts`** — the proof: TypeScript and Python agree
  **byte-for-byte** on the canonical digest of every contract example, and agree on
  acceptance and on rejecting a forged conclusion and a unit alias. It skips gracefully
  when Python 3 is unavailable.
- `python/tests/` (11 tests, standard-library `unittest`), `python/pyproject.toml`
  (pure-stdlib base, adapters as optional extras), and a `test:python` script.

### Added — render compilers for every stable family

- **All 19 stable skills now render end to end.** Family compilers were added for bars
  (ISI / degree / delay / weight distributions and PSTH), spike-raster ticks, matrix
  cells (absent cell stays distinct from a measured zero), 2D spatial scatter (one equal
  x/y scale, positions never jittered), correlogram stems (independent per lag, no
  invented lag-zero), response-curve points with an ordered-only guide line, phase-plane
  trajectories, and a schematic circular connection graph (every node placed, so isolates
  and autapses stay visible). Each calls the same tested `src/analysis` primitives used
  by its hand-computable fixtures; this is internal implementation evidence, not
  external scientific certification.
- `test/renderAllFamilies.test.ts` asserts all 19 families render a byte-deterministic,
  injection-safe SVG with a well-formed artifact digest, and that none falls back to the
  honest `renderPending` state.

### Added — documentation, governance, and repository metadata (M8)

- **Normative docs:** `docs/SCOPE.md` (what Cortexel is and is not), `docs/PROVENANCE.md`
  (the authority boundary and disclosure model), `docs/VERSIONING.md` (coordinated
  identity and compatibility policy), and `docs/SECURITY_MODEL.md` (the STRIDE-style
  threat model). Where prose and a registry disagree, the registry wins and the prose is
  the bug.
- **Governance and community:** `GOVERNANCE.md` (honest about the single-maintainer
  reality; stable scientific-algorithm changes require recorded external review before
  1.0), `SUPPORT.md`, and `ROADMAP.md` (the gate-linked path from 0.9.0 to 1.0).
- **`MIGRATION.md`** — the deterministic outcome for all 26 pre-1.0 skill ids and the
  explicit list of information migration refuses to invent.
- **`CITATION.cff`** with Sepehr Mahmoudian as author. No DOI (added only after a real
  archived release exists).
- **README** rewritten to describe the 0.9.0 product accurately — the request→artifact
  pipeline, the 19 stable contracts, the invariants, and the honest pre-1.0 status — with
  the npm/PyPI/CI badges inactive by design.
- **GitHub repository metadata** set: the provenance-first description and twelve topics.

### Changed

- Package version set to `0.9.0`; description updated. `AGENTS.md` and `SECURITY.md`
  carry 0.9.0 direction notes pointing at the new contract and threat model.

### Added — deterministic rendering and CLI (M4)

- **`RenderPlanV1`** — the framework-neutral figure description compiled between
  validation and drawing. A closed mark union (no raw-SVG escape hatch), no JSX, no
  callback, no random state. Both the headless renderer and (later) React consume the
  same plan, so they cannot disagree about a value.
- **A deterministic, safe SVG serializer.** No clock, no random id, no locale; element
  ids derive from the artifact digest; attribute order is fixed; `-0` is normalized to
  `0`. A purpose-built writer over a closed vocabulary — a hostile title, unit, or note
  becomes escaped text, never a `<script>`, an `on*` handler, a `<foreignObject>`, or an
  external URL, because those are not elements the writer can emit.
- **Deterministic locale-independent number/coordinate formatting and "nice-number"
  linear scales and ticks** (no d3 in the stable render path).
- **`buildFigure`** — the end-to-end pipeline: validate → derive (via `src/analysis`) →
  compile plan → render SVG → assemble `FigureArtifactV1` with disclosures, table, and
  cross-referenced digests. Rendering accepts only a branded validated request; a
  look-alike object cannot be rendered. The population-rate and trace families render end
  to end; other families produce a complete artifact with an honest `renderPending`
  marker (see `docs/KNOWN_LIMITATIONS.md`).
- **The `cortexel` CLI** (`identity`, `catalog`, `validate`, `render`, `inspect`,
  `migrate`): offline, no network, no shell hook, atomic writes that refuse to overwrite
  without `--force`, and stable exit codes (0 ok, 2 usage, 3 parse, 4 schema, 5 semantic,
  6 budget, 7 I/O, 8 internal). `catalog` lists only the 19 stable skills unless
  `--include-experimental` is passed, so an agent cannot select an experiment by accident.
- **`docs/KNOWN_LIMITATIONS.md`** — the honest, gate-referenced list of what 0.9.0 does
  not yet do.

### Added — analysis layer and scientific evidence (M2)

- **`src/analysis/`** — the deterministic scientific core the figures are built on:
  shared half-open binning, the recorder-order-agnostic event model, within-train ISI,
  population rate with an auditable recorded-sender denominator, cross/auto correlogram
  with explicit lag orientation and self-pair handling, and degree/matrix topology that
  preserves multapses and keeps an absent cell distinct from a measured zero. A renderer
  never reimplements any of this — it consumes the output, which is what lets the CLI
  and React produce provably identical figures.
- **Hand-computable golden vectors** (`test/analysis.test.ts`): the half-open bin
  convention, the population-rate formula and its denominator, unit-correct rates in
  microseconds, within-train ISI (including trial separation and coincident events),
  correlogram orientation and self-pair exclusion, multapse degree counting, and the
  sparse-matrix absent-is-not-zero property — every expected value checkable on paper.
- **`reference/`** — the independent oracle scaffold (Elephant / NEST), structurally
  forbidden from importing Cortexel. Its status is honestly `not_run`: no pinned
  reference environment has been executed in this repository, so no contract claims its
  external oracle passed. `test/golden/manifest.v1.json` records this.
- **Evidence ledger:** 26 release gates moved to `PASS`, each carrying a reproducible
  receipt (a test file, a generated artifact, or a schema). The remaining 129 stay
  `NOT_RUN` — the honest state, not an oversight.

### Added — contract kernel (M1)

- **One normative contract authority under `contract/`.** Registries (units, error
  codes, capabilities, semantic validators, disclosures, budget profiles, renderers,
  palettes, identity, the legacy-skill map), Draft 2020-12 shared schemas, the
  request/artifact envelopes, and one self-describing contract file per stable skill.
  A meta-schema (`contract/meta/contract-source.schema.json`) constrains every skill
  contract.
- **The 19 stable single-figure contracts plus the `figure.bundle` artifact kind**,
  each with its scientific purpose, closed request schema, named semantic validators,
  budgets, disclosures, accessibility summary/table, hand-vector evidence flag,
  migration mapping, ownership, and living valid/invalid examples.
- **`scripts/generate-contract.ts`** derives the TypeScript catalog, identity, enum
  schemas, composed per-skill request schemas, the Python mirror, and the contract
  digest from `contract/` — deterministically. `scripts/check-generated.ts` fails if
  any generated file drifts or if generation is nondeterministic. The generator also
  refuses to emit an incoherent contract (a dangling validator id, an open object
  schema, a stable skill on an experimental renderer, or an oracle claimed as passed
  with no receipt).
- **Coordinated contract identity.** A SHA-256 `contractDigest` over the canonicalized
  normative source set, a separate `catalogDigest` over the stable catalog, and
  `getBuildIdentity()` naming every version axis. A local build reports
  `sourceRevision: "unreleased-worktree"` and `release: false` rather than guessing a
  release commit.
- **Dependency-free SHA-256** (checked against the FIPS 180-4 vectors and
  differentially against `node:crypto`) and **RFC 8785 JSON canonicalization** (the
  root of every cross-language digest).
- **A strict raw-JSON parser** that rejects duplicate object members before
  materialization — the check `JSON.parse` cannot perform — enforces resource limits
  during scanning, and builds null-prototype objects. And a **safe snapshot** for
  already-materialized values that inspects property descriptors without ever invoking
  a getter, `toJSON`, or `Symbol.toPrimitive`, survives a throwing Proxy, and returns
  a detached copy.
- **The request/artifact split.** `FigureRequestV1` (what a caller authors) and
  `FigureArtifactV1` (what Cortexel emits) are separate schemas. A caller cannot
  author a library conclusion — validation status, disclosures, digests, calibration —
  and the attempt is rejected with `PROVENANCE_CALLER_ASSURANCE_FORBIDDEN`, checked
  first, on the raw request, so it cannot hide behind a schema error.
- **The validation pipeline** (`parseAndValidateRequest`, `validateRequestValue`):
  boundary → authority → identity → structural (Ajv 2020, strict, no coercion) →
  semantic → canonicalize, returning a branded validated request that rendering will
  later require. The materialized-value boundary honestly reports the weaker
  `duplicateKeys: "not_observable_after_materialization"` assurance.
- **35 named semantic validators** — the rules JSON Schema cannot express: intervals
  formed only within a train, a rate denominator that counts recorded (not spiking)
  neurons, a rank-local snapshot that cannot claim a global out-degree, a multapse
  aggregation that is never "last edge wins", a unit dimension that must match its
  quantity kind, and a unit alias rejected with a repair rather than silently
  converted.
- **The disclosure engine**, deriving mandatory disclosures only from machine-checkable
  artifact facts through the closed rule registry — never from caller text or a flag.
- **Deterministic pre-1.0 migration** (`migrateLegacyRequest`) covering all 26 legacy
  ids: it produces a request plus a report, never an artifact, and refuses to invent a
  fact the legacy payload did not carry.
- **Living-fixture, hostile-input, and identity tests**: 297 contract-example checks,
  a SHA-256 vector + differential suite, an RFC 8785 suite, and hostile parser and
  snapshot corpora.

### Added

- **Pre-1.0 baseline and evidence ledger.** `docs/release/BASELINE-2026-07-14.md`
  freezes commit `16f2da7` with its toolchain, tracked-file inventory digest, and
  the first independently executed command receipts (446 tests passing).
  `docs/release/evidence-ledger.v1.json` records all 155 release gates with an
  explicit `PASS`/`FAIL`/`NOT_RUN`/`NOT_APPLICABLE`/`BLOCKED` state.
- `scripts/check-evidence-ledger.ts` parses the ledger strictly, rejects a `PASS`
  that carries no reproducible receipt, requires a rationale for
  `NOT_APPLICABLE`, and blocks a stable (1.x+) release tag while any
  release-blocking gate is unproven. Pre-1.0 tags assert no stable contract and
  are gated on ledger integrity alone.
- `docs/release/known-consumers.v1.json` records downstream consumers with an
  explicit verification state. Being listed is not certification.
- A release-blocker issue form.

### Changed

- README now carries an explicit pre-1.0 status box. HEAD must not be cited as a
  released product.

---

Repository-wide contract, renderer, and release hardening for agent-authored
visualizations. The skill-axis contract version is now `1.6.0`; callers should
regenerate cached descriptors/manifests before adopting this release.

### Security

- All public validation/routing entrypoints now fail closed on hostile runtime
  values instead of throwing. Registries use prototype-safe lookup, returned
  descriptors/examples are immutable copies, envelopes are strict objects, and
  `params` must be bounded literal JSON (no cycles, sparse/decorated arrays,
  accessors, symbols, raw-JSON/`toJSON` shape changes, class instances, `BigInt`,
  `undefined`, functions, unstable numbers, or pathological nesting).
- Provenance overrides can no longer replace the authoring source, declared inputs,
  or calibrated-posterior boundary. All present known provenance values receive
  semantic checks, unknown claims fail, params↔provenance contradictions fail,
  `advisory_only` defaults to `true`, and unsupported/mismatched contract versions
  receive structured errors. Free-text captions are sanitized and labeled
  `Caller note (unverified)` rather than blending into the mandatory disclosure.
- Per-skill `requiredProvenanceFlags` now bind machine-readable envelope flags in
  both strict gates and the portable manifest. Corpus graphs therefore cannot
  contradict their derived/advisory elements by claiming non-advisory or
  paper-local provenance.
- Added practical and aggregate limits across device dumps, inline skill arrays,
  adapter object/fan-out output, split series, knowledge-graph size, diagnostics,
  strings, edit-distance repairs, and palette registration. Oversized arrays are
  descriptor-preflighted before clone/schema amplification. Dependency audit is
  clean and runs in CI. Browser-bound skill arrays cap at 50,000 samples; raw NEST
  adapters retain a separate 100,000-sample ingestion ceiling.
- Removed Drei/Troika from the runtime graph. The knowledge-graph focus label uses a
  local canvas texture, preventing implicit CDN font or blob-worker activity.
- `formatInvocationErrors` now emits deterministic structured JSON marked as
  untrusted data; control/bidi characters and prompt-shaped ids cannot escape into
  instruction-looking repair lines.
- Public repair diagnostics never invoke object conversion hooks or thrown-value
  accessors. Display-facing skill, palette, host, route-field, and authoring-error
  identifiers reject or directly escape/bound control/bidi spoofing characters.
- `VizSpecRenderer` is strict/self-describing by default; deleting `spec.skill`
  cannot downgrade validation. The envelope-only path requires explicit
  `trustedEnvelope`, and unchanged spec identities reuse a detached validated
  snapshot instead of synchronously revalidating large arrays on every parent render.

### Fixed

- Per-skill schemas now enforce paired-axis lengths, monotonic time axes, finite and
  non-negative domains where required, integer ids, non-empty phase-plane axes, and
  graph identity/reference invariants. Every one of the 26 skills, including the
  four host-rendered skills, has a real params schema.
- Knowledge-graph evidence now requires a direct snapshot-record, citation, or
  external-source anchor for every node and edge; graph-node references alone
  cannot form a self-referential proof chain. Generation time is RFC 3339, node
  scores are restricted to extraction confidence, stable endpoint ids remain in
  accessible relationship prose, and the legend can disclose immutable graph
  context. The Engram adapter rejects accessors before invoking them.
- Spatial skills now require coordinate units; phase planes require per-axis and
  derivative units plus derivation/model/fixed-parameter context; correlograms bind
  normalization to y-axis units and a conditional numeric domain; Ca²⁺ traces are
  non-negative; synaptic delays are strictly positive. Connectivity-only topology
  and force-layout graph geometry carry explicit schematic-layout disclosures.
- NEST adapters preserve timestamps as `Float64Array`, reject values that would
  overflow `Float32Array`, stop guessing unlabeled analog traces are voltage, reject
  ambiguous multi-sender/multi-synapse inputs, validate connection/position indices,
  and expose honest split helpers for multimeter senders and weight-recorder synapses.
  Connectivity no longer invents ring coordinates or default weights; unit labels,
  global position ids, delays, and unpositioned/provided layout status survive.
  Negative-zero identities and non-positive delays fail consistently.
- Raw NEST adapters and derived spike analyses now share one deep, accessor-safe,
  typed-array-aware input snapshot. Recorder output is never assumed chronological;
  sorting occurs only within the relevant sender/trial group, decimal bin geometry
  follows the published binary64 tolerance, and transform output amplification is
  bounded before allocation.
- Shared single-source and per-sender/per-synapse time axes reject duplicate as well
  as descending timestamps. Typed-array preflight reads the intrinsic length slot,
  never an overridable subclass getter.
- `ExpandableNeurons` allocates exactly the requested count, keeps picking aligned
  with its shader transform, disposes GPU resources, bounds inputs, fixes hidden-point
  clipping and reversed smoothing, and uses frame-rate-independent damping. Procedural
  sine-wave “spikes” were removed: activity is explicit caller data and defaults static.
  Noninteractive clouds register no pointer handlers, interactive linear picking has
  a lower safety cap, and population geometry rejects poisoned/unbounded coordinates.
- `KnowledgeGraph3DScene` no longer mutates the host camera unless explicitly opted
  into `autoFrame`/selection fly-to, avoids per-frame allocations and wall-clock
  animation, advances force layout on a capped fixed-60-Hz clock, handles demand
  rendering and reduced motion, scopes pointer state to the canvas, disposes resources,
  and uses collision-resistant content signatures. Direct scene/A11y entrypoints share
  the strict graph-size ceiling, and reduced motion does not re-upload static particles.
  Directed relationships now retain arrowheads in reduced motion and still exports.
- `VizSpecRenderer` reports validation errors after commit rather than during render,
  exposes structured invocation errors, and never treats an explicitly blank skill as
  permission to bypass the strict gate.
- `detectEmptyScene` is a no-throw valid/empty/invalid guard that checks typed channel
  contents, parallel lengths, measurement units, network identity/layout semantics,
  and edge references; hostile or malformed input is never conflated with a legitimately
  blank scene. Accessible graph nodes and relationship detail are independently
  paginated, server rendering starts on the selected node's page, and visual/DOM search
  share one label-or-kind matcher.

### Added

- Clarified standalone repository governance: this repository is the canonical
  writable source; downstream Engram pins released commits and generated contracts.

- Added an agentic NEST connection-snapshot axis with distinct
  `nest.connection_graph`, `nest.adjacency_matrix`, `nest.weight_matrix`,
  `nest.delay_matrix`, `nest.in_degree_distribution`,
  `nest.out_degree_distribution`, and `nest.delay_distribution` contracts.
  Ordered node universes retain isolates, every multapse remains countable,
  matrices use Cortexel's fixed target-row/source-column display policy, absent cells remain
  distinct from present zero-valued aggregates, and typed snapshot scope prevents
  MPI-local evidence from masquerading as a complete global network. The legacy
  edge-list skill `nest.connectivity_matrix` remains valid but is deprecated and
  excluded from automatic routing in favor of `nest.connection_graph`.
- Added `nest.spatial_map_2d`, a measured-position contract with stable node ids,
  explicit center/extent/edge-wrap metadata, MPI position scope, coordinate units,
  equal-aspect rendering, origin-independent extent-relative bounds, and
  fixed-screen-space marker disclosure. Masks and
  probability kernels remain separate future contracts rather than free-text
  geometry claims.
- Added no-throw, accessor-safe transforms for official scalar/singular and
  plural-array SynapseCollection output, graph/matrix/degree/delay derivation, and
  identified 2D GetPosition output. Transform discovery metadata is published to
  agents alongside each applicable skill.
- `cortexel/react/charts` now provides the strict `ReferenceVizSpecFigure`
  agent-spec→accessible-SVG path for nineteen native analysis/topology skills: voltage and
  disclosed astrocyte traces, spike raster, population rate, F-I response, ISI,
  PSTH, correlogram, weight/delay histograms, plasticity dynamics, phase plane,
  connection graph, adjacency/weight/delay matrices, in/out degree distributions,
  and measured 2D spatial maps. Exact
  skill dispatch prevents
  misleading scene reuse; large series/events share compact SVG paths; units,
  normalization, alignment and vector semantics remain visible; unsupported
  topology/KG/host-only skills return an explicit alert.
- Added `adaptEngramCorpusEntityGraph`, a no-guess projection from Engram's
  corpus entity response into the snapshot-bound knowledge-graph params contract.
  It verifies response summaries and conservative scientific flags before the
  resulting params enter the ordinary strict VizSpec gate.
- Added non-suppressing `captionPlacement="footer"` support to
  `VizSpecRenderer`. The chart wrapper forces this layout so mandatory disclosure
  remains part of the rendered figure without covering axes or data; existing
  scene overlays remain the default.
- `validateSkillParams(skillId, params)` provides a low-level structural check for
  every skill without inventing a scene.
- `buildHostRendererInvocation`, `validateHostRendererInvocation`, and
  `validateHostRendererSpec` give every `scene:null` skill the same params,
  provenance, version, route-membership, repair-example, serialization, and caption
  guarantees as a VizSpec.
- Machine-readable `paramConstraints` accompany JSON Schema in discovery and the
  version-8 skills manifest. It now covers every skill and publishes envelope schemas,
  defaults/normalization order, exact-JSON limits + duplicate-member precondition,
  binary64 and UTF-16 semantics, strict invocation/provenance/palette policies,
  caption derivation, versioned params/provenance constraint languages, and complete
  examples at `cortexel/skills.manifest.json`.
- `KnowledgeGraphA11yList`, a keyboard- and screen-reader-accessible DOM mirror with
  paginated nodes, node kinds, and separately paginated directed relationship detail
  for the WebGL graph.
- Native, agent-invocable `nest.isi_distribution`, `nest.psth`, and
  `nest.weight_histogram` contracts for the three previously orphaned analysis
  scenes. Their checked payloads bind bin width, uniform non-overlapping bin
  geometry, normalization, displayed units, trial/alignment or interval scope,
  connection sampling, and source provenance. Probability mass must sum to one,
  ISI density must integrate to one, and ISI bins cannot extend below zero;
  histogram geometry now uses a zero absolute tolerance so tiny physical units
  cannot make a false bin-width claim pass. PSTH bins explicitly aggregate all
  selected senders per trial; count/trial and Hz values must recover a
  non-negative safe-integer raw event count, and the aggregation claim is bound
  into provenance. The portable parameter-constraint language retains those
  derived-count recovery formulas in version 8 alongside the topology rules. Router discovery exposes
  ISI/PSTH as explicit spike-recorder shapes.
- Added `nest.population_rate`, an evidence-preserving time-varying rate contract
  and canonical step chart. Each series carries exact integer spike counts,
  recorded-sender denominator and checked Hz values; uniform half-open bins exactly
  cover the declared window and the gate recomputes every displayed rate.
- Promoted `nest.correlogram` from a host-only envelope to its own canonical scene.
  The redesigned contract binds detector identity, oriented source/target labels,
  symmetric lag geometry, bin width, τ range, counting window, lag convention,
  zero-lag policy, binning, statistic kind and units. Raw counts, weighted sums,
  pair rates and Pearson coefficients have separate closed domains.
- Added no-throw `spikeRecorderToIsiParams`, `spikeTrialsToPsthParams`,
  `spikeRecorderToPopulationRateParams`, and
  `correlationDetectorToCorrelogramParams` transforms for raw NEST/NumPy-style
  arrays. They preserve integer evidence, silent-sender denominators, explicit
  trial alignment and the correlation detector's documented lag orientation.
- `PopulationA11yList` and the paginated `NeuronA11yPager` provide operable DOM
  companions for pointer-driven population and neuron WebGL primitives.
- README visual workflow and agent-repair diagrams, a visualization coverage map,
  and concrete use cases for simulation QA, NEST reporting, corpus exploration,
  cross-language hosts, interactive explainers, and reproducible archives.
- Adversarial core/runtime tests, adapter precision tests, shader/source design-law
  guards, React render-boundary tests, accessibility tests, package metadata linting,
  and clean-room ESM/CJS runtime plus TypeScript-consumer smoke tests across Node 20,
  22, and 24.

### Changed

- `corpus.knowledge_graph` is now a breaking, evidence-grade `1.4.0` contract:
  immutable graph/source/snapshot identity, stable edge assertion ids, bounded
  attributes, typed evidence references, derived/advisory epistemic records and
  discriminated scores that are explicitly not calibrated posteriors. Edge-kind
  score semantics and endpoint kinds are checked portably; repeated evidence is
  preserved as identified multiedges, capped at nine assertions per unordered
  pair; its language-neutral rules remain represented in the current version-8
  constraint language.
- The skill axis is now `1.6.0` and the self-describing envelope contract is
  `1.3.0`. Spike routing distinguishes `population_rate` from `fi_response`,
  rejects the ambiguous legacy `rates` discriminator, and routes
  `correlation_detector` directly to the native correlogram.
- The 3D graph routes parallel assertions on deterministic quadratic lanes while
  its force layout uses one spring per unordered pair. Lines, arrowheads and flow
  particles consume the same path; direct React entrypoints reject invalid or
  unreadable relationships; metadata-aware search and the DOM companion preserve
  assertion ids, evidence, attributes, epistemic status and uncalibrated scores.
- Knowledge-graph search now uses the same bounded metadata-aware matcher in WebGL
  and the DOM companion, and applies the query coherently to nodes, edges,
  arrowheads, and flow particles instead of leaving a bright unrelated edge field behind. Selected
  nodes remain available to assistive technology through filtered views, duplicate
  ids fail closed at both direct React entrypoints, relationship disclosures have a
  touch-sized target, and the force-layout clock no longer allocates from `useFrame`.

- The React peer set is now `react`, `react-dom`, `three`, and
  `@react-three/fiber`; `@react-three/drei` is no longer required.
- Package exports use separate ESM/CJS type conditions, `SECURITY.md` ships in the
  tarball, Bun and CI installs are pinned/frozen, and committed distribution freshness
  includes untracked artifacts.
- Per-skill params objects are closed at the top level; typoed data fails instead of
  surviving into a checked payload. Phase-plane, voltage, stimulus-response,
  compartmental, replay, graph, and GPU-range contracts now contain the data and
  cross-field rules their renderers actually need.

## [0.5.0] — 2026-07-03

Review-and-improvement pass: closes a critical honesty gap, makes the render
boundary actually carry data, and starts decoupling the axis from NEST. Contains
breaking changes to the entry points (see **Changed**).

### Security
- **Honesty caption can no longer be overridden by an agent.**
  `defaultHonestyCaption` previously returned a caller-supplied `provenance.caption`
  *before* the schematic/advisory disclosure, so synthetic data could be captioned
  "Measured recording from Brunel et al. 2000" verbatim. The mandatory disclosure
  is now computed only from the machine-checkable flags and ALWAYS leads; an agent
  caption can only be *appended* as context, never suppress the prefix. New
  exported `mandatoryDisclosure(p)`. This is the library's load-bearing honesty
  boundary (see SECURITY.md).

### Fixed
- **False derived-view caption for the knowledge graph.** The `weak` disclosure
  was hard-coded to "reuses the '<scene>' scene; not a 1:1 rendering", which is
  false for `corpus.knowledge_graph` (knowledge-graph-3d is its *native* scene).
  Each weak skill now declares its own `weakDisclosure` sentence — the KG states
  the real reason (same_as/variant_of edges are advisory structural similarity,
  not certified sameness); astrocyte states Ca²⁺/IP₃ ≠ membrane voltage.
- **`ExpandableNeurons` no longer hides neurons past a magic index.** The reveal
  ramp used a hard-coded `/1200.0` divisor that clipped every neuron past index
  ~1322 even at full expansion (≈40% of a 2000-neuron population invisible). It
  now normalizes to the actual grid count via a `uRevealCount` uniform.
- **`ExpandableNeurons` fade-in now works.** `material.opacity` is a no-op on a
  raw `ShaderMaterial`; the fragment shader now consumes a real `uOpacity` uniform.
- Tightened two loose param schemas so structurally-broken payloads fail the
  strict gate instead of rendering blank: `spatial_3d` `objects` now require
  numeric `x/y/z`; `phase_plane` `grid` now requires numeric-array axes.
- **Hardened `KnowledgeGraph3DScene`** (adversarial review of the one complete
  shipped scene): removed a per-frame array allocation in `useFrame` (Design Law
  L4 — remembered positions are now mutated in place); a stale focus id no longer
  dims the entire graph or freezes an empty label; the camera auto-frame is now
  once-per-mount and the simulation warm-restarts (α 0.5) on a data change instead
  of hard-snapping the camera and re-scattering the settled layout; `node.radius`
  is sanitized (a non-finite/≤0 radius no longer writes a NaN instance matrix or
  poisons `forceCollide`); the fly-to now tracks the node's live position instead
  of a stale snapshot and is cleared when no controls exist; self-loops and
  duplicate ids are handled (self-loops dropped from a single shared valid-edge
  set; duplicate ids dev-warn); an empty graph renders no phantom node; the
  remembered-position cache is bounded; and `dim()` no longer allocates a colour
  per emphasis pass. `edge.directed` is now optional and a `particleColor` prop
  was added.
- **`KnowledgeGraph3DScene`: hover/click and visibility no longer decay as the
  layout drifts** (second hardening pass; proven empirically against three 0.184).
  The node mesh, edge lines and particle cloud stream their geometry every frame,
  but three computes an object's bounding sphere once and caches it — so nodes
  that drifted outside the frame-1 sphere became unhittable (the instanced raycast
  gates on those bounds) and nodes/edges could blink out of view (frustum culling
  consults the same stale sphere). Frustum culling is now disabled on all three
  streamed objects and the node mesh's cached bounds are invalidated after every
  matrix write. Also fixed: a user grab of the controls (`'start'`) permanently
  cancels the scene's camera intents (pending auto-frame, in-flight fly-to) so the
  camera never fights the user's hand; with no host controls, auto-frame now aims
  the camera at the graph (`lookAt`) instead of only positioning it; `onHover`
  fires only when the hovered id *changes* (pointermove is per-frame — an
  unguarded callback re-rendered state-holding hosts on every mouse twitch); the
  pointer cursor clears when the hovered id leaves the graph; and flow particles
  no longer write depth (additive glows shouldn't occlude).

### Added
- **Agent authoring loop (`cortexel/core`).** New helpers that close the
  author → validate → repair cycle an autonomous agent runs, on top of the strict
  gate: `buildVizSpec({ skill, params, source, declaredInputs, … })` assembles a
  spec (defaulting the scene from the skill's contract and provenance from the
  fail-closed baseline) and validates it in one call, returning a render-ready
  `{ spec, scene, caption }` or structured errors; `conservativeProvenance(source,
  declaredInputs)` is the fail-closed provenance scaffold it builds on (an agent can
  only ADD rigor); `validateSpec(payload)` validates a self-describing spec by
  reading `spec.skill` (the core-level form of what `VizSpecRenderer` does);
  `formatInvocationErrors(errors)` renders structured errors as one compact,
  deterministic repair block (path + message + hint + an inlined valid example) a
  model can read and fix. New `AGENTS.md` documents the whole loop.
- `knowledge-graph-3d` scene + `corpus.knowledge_graph` skill — a first-class
  cross-paper corpus knowledge graph. The declarative VizSpec contract adds the
  `KnowledgeGraph3DParamsSchema` (paper/model/family nodes;
  cites/same_as/variant_of/instantiates/belongs_to_family edges), the
  `graph_source`/`node_kinds`/`edge_kinds`/`identity_advisory` provenance keys,
  and a synthetic worked example.
- `KnowledgeGraph3DScene` — a Canvas-less R3F scene primitive (Design Law #5:
  host owns Canvas/OrbitControls/bloom/background). Now shipped at its own subpath
  **`cortexel/react/knowledge-graph`** so `d3-force-3d` stays a truly optional
  peer (the base `cortexel/react` entry no longer imports it). A d3-force-3d
  simulation ticked in an allocation-free `useFrame`, instanced unlit sphere
  nodes, additive line edges, citation-flow particles, and a Billboard focus label.
- **Validated data reaches the renderer.** `RenderSceneArgs` now carries `params`
  (the per-skill-validated scene data) and `provenance`, so a host scene renders
  from Cortexel's checked output instead of re-parsing the raw spec.
- **`mapCorpusKnowledgeGraph`** (`cortexel/react/knowledge-graph`) — the missing
  agent→scene bridge: turns validated `corpus.knowledge_graph` params (id/kind/
  label) + a semantic palette into ready-to-render `KnowledgeGraph3DNode`/`Edge`
  props (colour by kind, radius by degree, citation-flow particles on `cites`
  edges). Ships with the THREE-free graph helpers `filterGraphEdges` /
  `buildAdjacency` / `flowParticleCount` / `graphSignature` (unit-tested, one
  source of truth for the scene's "renderable edge" definition).
- **Self-describing specs.** `VizSpec` gains optional `skill` and `specVersion`
  fields. When present, a stored spec is independently re-validatable and its
  honesty caption is deterministic; `VizSpecRenderer` routes through the strict
  gate from `spec.skill` even without a `skillId` prop. `validateSkillInvocation`
  cross-checks `spec.skill` (new `skill_mismatch` error). New `CORTEXEL_SPEC_VERSION`.
- **Machine-readable param schemas for agents.** The manifest and `describeSkill`
  now emit `paramsJsonSchema` (JSON Schema draft 2020-12, derived from the zod
  schema via `z.toJSONSchema`) so non-TS hosts/agents validate and generate params
  without reverse-engineering types. New `skillParamsJsonSchema(contract)`. Manifest
  bumped to `manifestVersion: '2'` and now carries `specVersion` + per-skill
  `weakDisclosure` + `paramsJsonSchema`.
- **Neutral (non-NEST) axis aliases.** `SKILL_IDS` / `SkillId` / `SKILL_REGISTRY`
  / `isSkillId` — the axis already includes a non-NEST skill (`corpus.knowledge_graph`),
  so `isNestSkillId` was a misnomer (now a deprecated alias of `isSkillId`).
- `unknown_skill` errors now include a `didYouMean` nearest-match (edit distance)
  and attach that skill's example payload, so a typo self-repairs in one shot; the
  hint no longer claims skills are `nest.*`-only.

### Changed
- **KG layouts are deterministic and survive host re-renders.** New nodes are no
  longer seeded with `Math.random()`: d3-force-3d's golden-ratio phyllotaxis
  init and seeded LCG lay the same graph out identically on every mount
  (reproducible reading and screenshots; pinned by a contract test). The
  simulation memo is keyed on graph *content* (`graphSignature`, exported)
  rather than array identity, so a host that rebuilds its nodes/edges arrays
  every render — the common React pattern — never restarts a settled layout;
  any real change still warm-restarts. The scene now honors the library's
  `reducedMotion` prop contract like its Expandable* siblings (pre-settled
  layout, still particles, snap fly-to). Focused emphasis also collapses flow
  particles on peripheral edges (the dimmed periphery no longer sparkles), and
  per-edge golden-ratio phase offsets stop all citation flows pulsing in lockstep.
- **BREAKING: the root `cortexel` entry now re-exports only `cortexel/core`.** It
  previously re-exported the React layer too, which forced a pure-Node consumer of
  `import … from 'cortexel'` to install the "optional" react/three peers. Import
  rendering from `cortexel/react` (and `cortexel/react/knowledge-graph`) explicitly.
- **BREAKING: `KnowledgeGraph3DScene` moved** from `cortexel/react` to
  `cortexel/react/knowledge-graph` (see Added).
- `zod` is now a normal `dependency` (was a required peer), so `cortexel/core`'s
  runtime requirement is installed automatically rather than being a missing-peer
  footgun.
- `d3-force-3d` is now a `devDependency` (in addition to the optional peer) so CI
  installs it and typecheck/build exercise the real dependency graph; added a
  pure-JS contract test that pins the d3-force-3d API the scene uses.
- CI now verifies the committed `dist/` is in sync with source (`git diff
  --exit-code -- dist`).

## [0.4.0] — ExpandableNeurons

### Added
- `ExpandableNeurons` (`cortexel/react`) — the companion to ExpandablePopulation:
  a population voxel hub collapses and this reveals its constituent neurons as
  ray-cast sphere points, clustered at the hub centre and blooming to a 3D grid
  on expand. Single neuron = sphere (design law); allocation-free useFrame.
- `neuronLocalGrid(count, spacing)` / `neuronExpandedScale(expansion)` /
  `NEURON_CLUSTER_SCALE` — the shared grid layout + morph math so an owning scene
  can place synapses on the exact same neuron positions without duplicating it.
- Point-neuron shaders (`NEURON_VERT` / `NEURON_FRAG`) ported to TS strings (no
  Vite `?raw`), so the renderer builds under tsup and is host-portable.

## [0.3.0] — Agent ergonomics & verification

### Added
- `describeSkill(id)` / `describeSkills()` — self-describing discovery: scene,
  required params/provenance, renderer routes, weak flag, and a copyable example
  payload, so an agent never reads TS source to invoke a skill.
- `SKILL_EXAMPLE_PAYLOADS` / `getExamplePayload(id)` — one valid VizSpec per
  renderable skill (synthetic provenance). Asserted to pass their own gate, so
  they are living fixtures, and attached to `invalid_params` / `missing_provenance`
  / `scene_mismatch` errors for one-shot agent self-repair.
- `detectEmptyScene(SceneData)` — cheap "valid but blank" check (Vega-Lite
  scene-graph emptiness, adapted) so an agent can verify a render carries data
  without rendering pixels.
- `splitMultimeterBySender(events)` — splits a flattened multi-sender multimeter
  dump into one monotonic series per sender (the honest alternative to rejecting).
- Per-skill provenance snapshot test, design-law executable guards (allocation-
  free useFrame, bloom-safe emissive ≤1.15, unlit populations), and a published
  `.d.ts` Node-type leak scan.

## [0.2.0] — Agent skill axis

### Added
- **Skill axis (`cortexel/core` skills/):** Cortexel is now the authoring source
  of the agent-invocable NEST visualization skills, not just the render targets.
  - `NEST_SKILL_REGISTRY` (`listSkills()`/`getSkill()`): the 13 `nest.*`
    skills, each mapping a NEST device family → a Cortexel scene (or `null` when
    no honest scene exists yet), with required params, structured provenance
    keys, renderer routes, and a worked example.
  - `validateSkillInvocation(skillId, payload)`: the strict, skill-aware agent
    entrypoint. Enforces per-skill param schemas (closing the opaque-`params`
    hole), required `declared_inputs` provenance keys, scene/contract match, and
    rejects `calibrated_posterior=true` as unsupported (mirrors the 501
    boundary). Returns the resolved honesty caption so the renderer can't drop it.
  - `routeToScene(...)`: the executable `viz_router` — picks a skill/scene from a
    NEST device family (`dataShape.kind` disambiguates `spike_recorder`), fail-
    closed for unknown families and scene-less skills.
  - Host-agnostic `core/nest` adapters (`spikeRecorderToSceneData`,
    `multimeterToSceneData`, `getConnectionsToSceneData`, `getPositionToSceneData`,
    `weightRecorderToSceneData`) + zod device-dict shapes with axis invariants.
  - `SceneData.weightSeries` so plasticity weights are never mislabeled as voltage.
  - `provenance.declared_inputs` + `synthetic` flag (forces the schematic caption).
- **`dist/skills.manifest.json`** — language-neutral artifact non-TS hosts (a
  host Python backend) consume and parity-check against; emitted at build,
  guarded byte-identical by a Vitest test.
- `VizSpecRenderer` `skillId` prop routes through the strict gate and binds the
  honesty caption at the render boundary.
- Pure-Node import guard test: `cortexel/core` (incl. the skill axis) stays
  zero-dep beyond zod — no three/react/@react-three leakage.

## [0.1.0]

### Added
- `core` entrypoint (`cortexel/core`): dependency-free colormaps, palettes, GLSL
  strings, design-law types, `SCENE_NAMES`/`SceneName`, the Zod `VizSpec`
  contract, and the fail-closed provenance model.
- `react` entrypoint (`cortexel/react`): `usePopulationExpand`,
  `ExpandablePopulation`, and `VizSpecRenderer` (host-agnostic via an injected
  `renderScene` callback; no host-app dependency).
- `RenderSceneArgs.camera` so a spec's requested framing is passed through to the
  host renderer instead of being silently dropped.
- ARIA `role="note"` + `aria-live` on the honesty caption.
- `tsup` build emitting ESM + CJS + `.d.ts` for all three entrypoints.
- Vitest unit tests covering the VizSpec validator and the fail-closed honesty
  truth table.
- CI (typecheck + test + build) and open-source governance docs.

### Fixed
- `ExpandablePopulation`: removed a per-frame opacity write race (JSX `opacity`
  prop vs imperative `useFrame` write); the halo ring now honors
  `prefers-reduced-motion`; dark-theme ring brightness capped at a bloom-safe
  ×1.15.

### Notes
- `params` in `VizSpec` is intentionally opaque (not validated per-scene yet).
- A backend Pydantic mirror of the schema is recommended for server-side
  defense-in-depth but is the host's responsibility — Cortexel ships the
  client-side gate only.
