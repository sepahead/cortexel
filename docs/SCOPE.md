# Cortexel — Normative scope

> **Status: 0.9.0, a pre-1.0 development preview.** This document describes the
> boundary Cortexel is being built toward. 0.9.0 makes **no stable-contract claim**,
> no package is published to npm or PyPI, and no DOI has been minted. Where a claim
> below depends on evidence that has not yet been executed, this document says so and
> links the gate. The machine-readable state of every gate is in
> [`release/evidence-ledger.v1.json`](./release/evidence-ledger.v1.json); the honest
> list of what is not yet done is in [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md).

This file is **normative**: it defines what falls inside Cortexel's contract and what
does not. The stable/experimental/removed matrix it refers to is enforced by
[`contract/registries/capabilities.v1.json`](../contract/registries/capabilities.v1.json),
and the failure vocabulary it refers to is
[`contract/registries/error-codes.v1.json`](../contract/registries/error-codes.v1.json).
When prose here and those registries disagree, the registries win and this document
is the bug.

---

## 1. What Cortexel is

Cortexel is a **closed, versioned catalog of scientifically constrained figure
contracts for neural-simulation data**. A caller authors a declarative
`FigureRequestV1` (plain JSON); Cortexel validates it against a fixed catalog,
re-derives the scientific quantities it is willing to draw, renders a deterministic
accessible SVG, and emits a `FigureArtifactV1` that records what was validated, what
was computed, what scope the claim has, and the disclosures that fact set requires.

Four properties define the product, and everything else is subordinate to them:

1. **A closed catalog, not a grammar.** There are exactly nineteen stable figure
   contracts plus one composition artifact kind (`figure.bundle`). Each has a purpose,
   a closed request schema, named semantic validators, budgets, and disclosures. A
   caller selects a contract; it cannot compose an arbitrary new chart. This is the
   whole point: a closed catalog can carry per-figure scientific guarantees that a
   general grammar structurally cannot.

2. **Strict, fail-closed validation.** Schemas are closed — an unknown field is an
   error (`SCHEMA_UNKNOWN_PROPERTY`), never a silently ignored typo in a scientific
   quantity. Cortexel performs no type coercion, infers no fact the source did not
   state, and refuses ambiguous input rather than guessing.

3. **Provenance that fails closed and is a security property.** A caller declares
   what its data **is**; it may never declare what Cortexel **concluded** about it.
   Required disclosures are derived only from machine-checkable artifact facts through
   a closed rule registry, never from caller free text, and in stable mode they cannot
   be suppressed. See §5.

4. **Deterministic, accessible output.** The stable render path is designed to be
   free of clocks, random state, and locale: no `<script>`, no `foreignObject`, no
   event handlers, no external references, no remote fonts. Every stable figure is
   paired with an exact-value table and a data sidecar so the figure is never the only
   route to its numbers.

The unit of value is the **contract and its invariants**, not chart code.

## 2. What Cortexel is not (non-goals)

These are deliberate exclusions. Each exists because including it would weaken one of
the four properties above.

- **Not a general visualization grammar.** Cortexel is not Vega-Lite, ggplot, or
  matplotlib. There is no mark/encoding/transform algebra a caller can drive to
  produce an arbitrary chart. A closed catalog is the mechanism by which each figure
  can make specific scientific promises; an open grammar cannot.

- **Not a notebook, dashboard, or application.** Cortexel produces one validated
  figure (or one bounded bundle) at a time. It owns no layout engine, no interactivity
  framework, no state store, and no page. The host owns the page and its WCAG
  conformance (a stable figure carries its own accessibility surface, but the package
  does not claim whole-page compliance).

- **Not a storage or interchange format.** Cortexel is not NWB, Neo, HDF5, or a
  database. It reads adapter input and emits a figure artifact; it is not a place to
  persist recordings. (Adapters for NEST/Neo/NWB/NCP are *specified* in the contracts;
  most are not yet implemented — see [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md).)

- **Not a simulator.** Cortexel runs no neural model, integrates no equations, and
  generates no data. It draws what a simulator or recorder already produced.

- **Not an arbiter of biological truth.** Cortexel validates the *internal*
  consistency of a figure request — units match quantity kinds, parallel arrays have
  equal length, a rate equals its recomputed value. It does not and cannot check
  whether the underlying measurement is biologically correct, whether a model is a
  faithful reproduction of a paper, whether a correlation implies causation, or whether
  a ranked candidate is the right answer. Validation is a consistency property, not a
  correctness certificate.

- **Not a calibrated-inference engine.** Cortexel does no calibrated Bayesian
  inference and emits no calibrated posterior. A request may not assert one:
  `calibrated_posterior` is a portable literal `false`, and any attempt to author a
  library-owned assurance is rejected with `PROVENANCE_CALLER_ASSURANCE_FORBIDDEN`.

- **Does not execute embedded code.** No stable path evaluates a caller-supplied
  callback, expression, shader, HTML, CSS, or SVG fragment. Hostile input becomes
  escaped text or a validation error — never an instruction.

- **Does not reach the network or filesystem on its own.** Stable core performs no
  network access and opens no arbitrary path. A `DataRef` is resolved by an explicit
  host policy and verified by digest *before* it reaches stable core
  (`DATA_REFERENCE_UNRESOLVED`, `DATA_DIGEST_MISMATCH`).

- **Promises no deterministic WebGL, animation, or video.** The stable determinism
  promise covers the SVG path only. WebGL pixels depend on GPU and driver; there is no
  byte-stable 3D, no reproducible force layout, and no MP4/video export. Everything
  motion- or GPU-dependent is quarantined as experimental (§7).

## 3. The stable catalog (19 figure contracts + `figure.bundle`)

Every stable capability has `determinismClass: deterministic_svg`,
`exportClass: svg+table+sidecar`, and no required peer dependency. Ids use the `neuro.*`
and `network.*` namespaces of the 1.0 contract kernel; pre-1.0 `nest.*` ids from the
0.5-era runtime are migrated deterministically by `cortexel migrate`, never silently
aliased.

| Capability class | Stable contracts | Renderer |
|---|---|---|
| **Continuous traces** | `neuro.analog_trace`, `neuro.multisignal_trace`, `neuro.compartment_trace`, `network.synaptic_weight_trace` | `figure.analog_trace` / `figure.multisignal_trace` / `figure.compartment_trace` / `figure.synaptic_weight_trace` |
| **Spike-event timing & rate** | `neuro.spike_raster`, `neuro.population_rate`, `neuro.psth`, `neuro.isi_distribution`, `neuro.correlogram` | `figure.spike_raster` / `figure.population_rate` / `figure.psth` / `figure.distribution` / `figure.correlogram` |
| **Excitability & dynamical structure** | `neuro.response_curve`, `neuro.phase_plane` | `figure.response_curve` / `figure.phase_plane` |
| **Connectivity & network topology** | `network.connection_graph`, `network.adjacency_matrix`, `network.weight_matrix`, `network.delay_matrix`, `network.degree_distribution`, `network.delay_distribution`, `network.weight_distribution` | `figure.connection_graph` / `figure.matrix` / `figure.distribution` |
| **Spatial layout** | `network.spatial_map_2d` | `figure.spatial_map_2d` |
| **Composition** | `figure.bundle` (artifact kind) | `figure.bundle` |

That is **19 figure contracts and one artifact kind**. Anything not in this table is
outside stable scope.

## 4. Per-class scope

For each class: what Cortexel **validates**, what it **re-derives** rather than
trusting, what it **renders**, what the artifact **records**, and — decisively — what
it **does not establish**. The "does not establish" line is the epistemic boundary; it
is the part callers most often assume they are getting and are not.

### 4.1 Continuous traces — `neuro.analog_trace`, `neuro.multisignal_trace`, `neuro.compartment_trace`, `network.synaptic_weight_trace`

- **Validates:** a monotonic time axis with a declared duplicate-time policy
  (`SCIENCE_DUPLICATE_TIME_POLICY`), parallel-array length equality
  (`SEMANTIC_LENGTH_MISMATCH`), a unit whose dimension matches the recorded quantity
  kind (`SCIENCE_UNIT_DIMENSION_MISMATCH`), and stable channel/synapse identity for the
  multi-channel and weight-over-time variants.
- **Re-derives:** nothing — a trace is drawn from stated samples. It never interpolates
  across a gap, imputes a missing observation, or silently resamples.
- **Renders:** literal polylines over locale-independent linear scales and ticks, with
  gaps preserved as gaps.
- **Records:** units, ordering, missingness handling, channel identity, and any
  excluded-out-of-window count (events are never dropped silently).
- **Does not establish:** that a concentration trace *is* a membrane voltage, that two
  different-dimension signals belong on one axis, or that the recorded variable is
  biologically meaningful. A compartment trace is not a morphology; a synaptic-weight
  trace is not a plasticity-rule proof.

### 4.2 Spike-event timing & rate — `neuro.spike_raster`, `neuro.population_rate`, `neuro.psth`, `neuro.isi_distribution`, `neuro.correlogram`

- **Validates:** event bounds and observation windows (`SCIENCE_WINDOW_INVALID`,
  `SCIENCE_EVENT_OUT_OF_WINDOW`), sender/trial/population identity, a declared
  recorded-sender universe for per-neuron rates (`SCIENCE_POPULATION_UNIVERSE_REQUIRED`),
  a declared trial universe including empty trials (`SCIENCE_TRIAL_UNIVERSE_REQUIRED`),
  strictly increasing finite histogram edges (`SCIENCE_BIN_EDGES_INVALID`), and
  correlogram lag range / bin tiling (`SCIENCE_LAG_RANGE_INVALID`).
- **Re-derives:** the reported rate and normalization from the raw integer counts and
  the declared denominator, and rejects any value it cannot reproduce
  (`SCIENCE_NORMALIZATION_UNVERIFIABLE`). Intervals are formed only *within* an
  identified train; a negative within-train interval is invalid input
  (`SCIENCE_NEGATIVE_INTERVAL`). The correlogram fixes lag orientation — positive lag
  means the target follows the reference — and self-pair policy explicitly.
- **Renders:** literal bins and events — raster ticks, horizontal-step population-rate
  traces, independent correlogram stems. It never interpolates, smooths, bridges,
  mirrors, or invents a lag-zero bin.
- **Records:** the denominator, bin convention (half-open `[start, stop)`), displayed
  vs. total counts, zero-lag policy, and normalization kind.
- **Does not establish:** population size from the neurons that happened to spike (a
  silent neuron is still a recorded neuron; `SCIENCE_DENOMINATOR_INVALID`), that a
  correlation coefficient exists where only a scaled pair count was supplied
  (`SCIENCE_CORRELATION_DENOMINATOR_INVALID`), synchrony, causality, or oscillatory
  significance.

### 4.3 Excitability & dynamical structure — `neuro.response_curve`, `neuro.phase_plane`

- **Validates:** the condition and response variables, repeat structure, and — where
  uncertainty is shown — its method, level/meaning, and sample basis
  (`SCIENCE_UNCERTAINTY_*`). Phase-plane modes distinguish an *observed* trajectory
  from a *supplied or computed* vector field and check variable/derivative unit
  dimensions and grid orientation.
- **Re-derives:** nothing about the underlying dynamics. It will not convert a range or
  a standard deviation into a confidence or credible interval.
- **Renders:** the response curve with declared uncertainty geometry, or the phase-plane
  field/trajectory as supplied.
- **Records:** estimand, repeats, uncertainty semantics, derivation method, model
  context, and fixed parameters.
- **Does not establish:** that the curve is monotone, that a fixed point is stable, that
  the vector field is the true system, or that the response is causal in the stimulus.

### 4.4 Connectivity & network topology — `network.connection_graph`, `network.adjacency_matrix`, `network.weight_matrix`, `network.delay_matrix`, `network.degree_distribution`, `network.delay_distribution`, `network.weight_distribution`

- **Validates:** a declared node universe when isolates or zero-degree completeness
  matter (`SCOPE_NODE_UNIVERSE_REQUIRED`), a network scope (`SCOPE_REQUIRED`), a
  declared multapse aggregation (`SCIENCE_AGGREGATION_REQUIRED` — "last edge wins" is
  never applied), positive strictly-finite delays (`SCIENCE_DELAY_NONPOSITIVE`), and
  weight-group compatibility (`SCIENCE_WEIGHT_GROUP_INCOMPATIBLE`).
- **Re-derives:** degree counts over the declared universe so zero-degree nodes survive,
  and the multapse aggregate exactly as declared.
- **Renders:** directed edges with autapses, multapses, and isolates preserved;
  matrices in NEST's fixed target-row/source-column convention; distributions as literal
  bins. A graph layout is explicitly **schematic** — node position carries no meaning.
- **Records:** scope, snapshot time, node ordering, aggregation, and the distinction
  between an **absent** cell (no connection observed) and a **present zero-valued**
  aggregate. A missing cell is never painted as a measured zero.
- **Does not establish:** a global claim from partial evidence. A rank-local or sampled
  snapshot cannot assert global completeness (`SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL`), and an
  out-degree distribution cannot be computed from a target-rank-local snapshot
  (`SCOPE_OUT_DEGREE_FROM_RANK_LOCAL`) — a rank sees only the connections whose target
  it owns. It establishes no functional connectivity, community structure, or
  small-worldness; the geometry is a schematic, not a measurement.

### 4.5 Spatial layout — `network.spatial_map_2d`

- **Validates:** a coordinate frame, dimensionality, units (`SCIENCE_UNIT_*`), the
  source of positions, the node universe, and scope; declared positions must cover the
  selected universe (`SCOPE_POSITION_COVERAGE_INCOMPLETE`).
- **Re-derives:** nothing — measured positions are drawn as given, never jittered.
- **Renders:** identified positions on one equal x/y scale, with marker radius disclosed
  as fixed screen-space decoration.
- **Records:** center, extent, edge-wrap, position scope, and units. Nodes with missing
  positions are reported, never placed at the origin.
- **Does not establish:** connection-probability-versus-distance, masks, kernels,
  projections, or any physical node radius. Those are separate future contracts, not
  free-text geometry inferred from position data.

### 4.6 Composition — `figure.bundle`

- **Validates:** at most eight panels, one level of composition (a bundle may not
  contain a bundle), and compatible shared scales.
- **Computes:** nothing. **Composition performs no analysis.** A panel that needs a new
  derivation must first be produced as its own validated artifact and then placed.
- **Records:** the constituent artifact identities and their digests.
- **Does not establish:** any relationship between panels beyond adjacency. Laying two
  figures side by side asserts no correlation, no shared axis semantics, and no causal
  story.

## 5. The honesty boundary

Cortexel's core epistemic rule: **a caller declares what its data *is*; it never
declares what Cortexel *concluded*.**

- `FigureRequestV1` (what a caller authors) and `FigureArtifactV1` (what Cortexel emits)
  are separate schemas. Validation status, reference-comparison status, accessibility
  conformance, completeness, output digests, and disclosure text are
  **library-generated facts**. An attempt to author any of them is rejected with
  `PROVENANCE_CALLER_ASSURANCE_FORBIDDEN`, checked first, on the raw request, so it
  cannot hide behind a later schema error.
- Required disclosures are derived only from machine-checkable artifact facts through a
  closed rule registry — synthetic/example data, sampled scope, experimental status,
  aggregation, missingness. Caller free text cannot generate, replace, reorder, or
  suppress a mandatory disclosure; a caller note is rendered as an attributed,
  bidi-isolated **unverified** statement (`PROVENANCE_NOTE_UNSAFE_DISPLAY`,
  `PROVENANCE_NOTE_TOO_LONG`).
- `source.kind: unknown` is a valid, honest answer that triggers a disclosure. Honest
  imprecision is always preferred over invented specificity.

This boundary is a **security property**, not a nicety: a change that lets synthetic or
advisory data render without its disclosure, or that returns a caller caption verbatim
as an assurance, is a defect. See [`../SECURITY.md`](../SECURITY.md).

## 6. Examples of prohibited claims

A Cortexel figure structurally cannot make any of the following claims. Each is
rejected by a named gate or is impossible to express in the request schema.

- **"This figure is a calibrated posterior probability that model X is correct."**
  Cortexel does candidate ranking, not calibrated inference. `calibrated_posterior`
  is fixed `false`; the assurance boundary rejects the attempt.
- **"Cortexel confirms this simulation reproduces Brunel et al. (2000)."** The library
  authors no reproduction or validation conclusion, and no independent scientific
  oracle has been executed (§8). A caller cannot set a library-owned assurance field.
- **"Measured recording"** on data that is synthetic or an example. The disclosure is
  derived from the machine-checkable synthetic/example flag and leads the caption; a
  caller note cannot overwrite it.
- **"This out-degree distribution is complete for the whole network,"** derived from a
  single MPI rank's local snapshot. Rejected by `SCOPE_OUT_DEGREE_FROM_RANK_LOCAL` /
  `SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL`.
- **"These two models are the same,"** from a knowledge-graph `same_as` edge. Identity
  edges are advisory structural similarity, never certified sameness — and knowledge
  graphs are experimental (§7), outside stable scope entirely.
- **A blank coordinate system presented as a measured result.** An empty figure is an
  explicit empty state with a reason (`RENDER_NO_DATA`), never an axis grid that
  resembles measured zero.
- **An absent connection painted as a numeric zero,** or a population size inferred from
  the neurons that happened to spike. Both are refused (`SCIENCE_DENOMINATOR_INVALID`;
  absent-vs-present-zero is preserved by construction).
- **A correlation coefficient synthesized from a scaled pair count**
  (`SCIENCE_CORRELATION_DENOMINATOR_INVALID`), or a confidence interval synthesized from
  an arbitrary range (`SCIENCE_UNCERTAINTY_LEVEL_INVALID`).

## 7. Experimental surface (out of stable scope)

The following capabilities exist, are versioned independently, and are **explicitly not
covered** by the contract, determinism, accessibility, or compatibility promises. They
are absent from stable counts, from default discovery (`cortexel catalog` requires
`--include-experimental`), from the root exports, and from any conformance badge.
Requesting one through a stable entry point fails with `CAPABILITY_EXPERIMENTAL`.

| Experimental capability | Why it is not stable | The stable alternative |
|---|---|---|
| `experimental.network.spatial_3d` (WebGL 3D) | WebGL pixels depend on GPU/driver; no deterministic output, no byte-stable export | `network.spatial_map_2d` plus its exact-value table |
| `experimental.evidence.knowledge_graph` (force layout) | Iterative force-directed layout is not reproducible; geometry is schematic and position carries no meaning | The stable evidence table / JSON export is the authoritative view |
| `experimental.neuro.animation_replay` | No deterministic renderer and no safe deterministic export | A static key-frame alternative is always offered |
| `cortexel/adapters/ncp` | No immutable NCP release has been certified; it is never certified against a moving HEAD | — |

A 3D or animated view is **never the only route to the data**: a complete static
alternative and an exact-value table always exist. Every experimental surface must
visibly state that it is experimental, never autoplay, and honor
`prefers-reduced-motion`.

## 8. What "validated" does and does not mean at 0.9.0

Because the strongest failure mode of a validation library is a green checkmark that
was never earned, the evidence boundary is stated plainly:

- **The hand-computable golden layer is executed and passing.** The bin convention,
  the population-rate formula and its denominator, within-train ISI, correlogram
  orientation and self-pair handling, multapse degree counting, and the
  absent-is-not-zero matrix property are all checkable on paper and are tested.
- **No pinned reference environment has been executed.** NEST, Elephant, Neo, and PyNWB
  are not installed or run anywhere in this repository. Every skill contract's external
  oracle status is honestly `not_run`, and the corresponding ledger gates are
  `NOT_RUN`. **Cortexel therefore claims no independently confirmed scientific result.**
  Passing tests prove internal self-consistency; they do not prove agreement with an
  external tool.
- **Byte-level render determinism across every supported platform is a gate, not yet an
  executed receipt** at 0.9.0 (the SVG serializer is designed to be deterministic; the
  cross-platform certification is pending). See [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md).
- **The independent second reader is not built.** The Python package is generated in
  lockstep with the TypeScript source but is not yet a fully independent validator.

## 9. Governance reality and the standard for stable science

Cortexel has a **single maintainer, Sepehr Mahmoudian.** There is no review board, no
staffed support desk, and no response-time SLA — stating otherwise would itself violate
the honesty principle this project is built on. Security reports go through GitHub's
private advisory route ([`../SECURITY.md`](../SECURITY.md)); best-effort acknowledgement
is the honest commitment, not a guarantee.

The single-maintainer reality does **not** relax the bar for a stable scientific
release. The **desired** standard — recorded as a release-blocking gate that is
currently `NOT_RUN` — is that before any `1.x` tag, at least one **independent scientific
reviewer** and at least one **external package consumer** review the release candidate,
and that the pinned reference environments actually run. Until those receipts exist,
0.9.0 remains a development preview and this document promises the contract's *shape*,
not a certified scientific instrument.

---

**Maintainer:** Sepehr Mahmoudian · **License:** MIT · **Version:** 0.9.0 (pre-1.0
development preview)
