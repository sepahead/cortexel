# Provenance and honesty model

> **Status: `0.9.0` is the last tagged pre-1.0 release; this document tracks the
> private, unreleased `0.10.0-dev.0` source tree.** It describes a contract, not a
> certified result. Neither identity makes a stable-contract claim, no package is
> published to npm or PyPI, and no DOI has been minted. No pinned
> reference environment (NEST, Elephant, Neo, PyNWB) has been executed, so **no figure
> in this tree has been independently confirmed to be scientifically correct.** The
> honesty machinery described here is the reason that limitation is stated on every
> figure rather than hidden.

Cortexel's central promise is narrow and load-bearing: **a caller declares what its
data *is*; Cortexel authors what it *concluded* about that data, and the two can never
be confused.** Everything in this file follows from that one sentence. The provenance
model is not a metadata convenience — it is a security boundary (see
[SECURITY.md](../SECURITY.md)), and a change that lets a caller author a Cortexel
conclusion, or that lets a disclosure be suppressed, is treated as a defect.

---

## 1. The authority boundary

A figure request has **two authors**, and they are kept structurally separate:

| Author | Owns | Examples |
|--------|------|----------|
| **The caller** (an agent, adapter, or human) | *What the data is* — a declaration of origin and meaning | `source.kind`, units, analysis window, node universe, MPI scope, a free-text note |
| **Cortexel** (the library) | *What Cortexel concluded* — machine-generated assurances | validation status, the assurance level reached, the disclosure list, output digests, reference-comparison status, completeness, accessibility conformance |

This split is enforced by the schema itself: the thing a caller authors
(`FigureRequestV1`) and the thing Cortexel emits (`FigureArtifactV1`) are **separate
schemas**. A caller cannot even *express* a library conclusion in a request, and if it
tries, the attempt is rejected with:

```
PROVENANCE_CALLER_ASSURANCE_FORBIDDEN
  "The request tried to set a field that only Cortexel may author.
   A caller declares what its data IS, never what Cortexel concluded about it."
```

Two properties make this robust rather than cosmetic:

- **It is checked first, on the raw request.** The authority check runs before
  structural schema validation, so a forbidden field cannot hide behind an unrelated
  schema error and slip through on a later pass.
- **The one flag every caller *is* asked about is portably pinned to `false`.**
  `calibrated_posterior` exists so a caller cannot quietly assert that Cortexel
  performed calibrated Bayesian inference. Cortexel does candidate ranking and
  validation, not calibrated posterior estimation, so `calibrated_posterior: true` is
  rejected at **every** entrypoint. There is currently no accepted request that claims
  a calibrated posterior, and therefore no accepted request whose honesty caption can
  be suppressed on that basis.

**Why this matters.** If a caller could set the disclosure text, the validation
status, or the "this was independently checked" flag, then the honesty of a figure
would be exactly as trustworthy as the least honest caller. By making those fields
un-authorable from the request side, Cortexel's guarantees hold *regardless* of who
sent the payload — which is the only useful posture when the payload came from an
autonomous agent.

---

## 2. The closed source-kind union

Every request must declare `source.kind`. It is a **closed enumeration** — a caller
picks one of a fixed set of honest answers and cannot invent a new one:

| `source.kind` | Meaning | Disclosure fired | Severity |
|---------------|---------|------------------|----------|
| `simulation` | Produced by a model, not measured from biology | *"Simulation output. These values were produced by a model, not measured from a biological system."* | important |
| `synthetic_fixture` | Fabricated to exercise the software | *"Synthetic fixture. This data was fabricated to exercise the software and carries no scientific meaning whatsoever."* | **critical** |
| `literature_extraction` | Transcribed from a publication | *"Extracted from published material … have not been re-derived from primary data."* | important |
| `manual_entry` | Typed in by hand | *"Manually entered … rather than exported from an instrument or simulator."* | important |
| `unknown` | Origin not declared | *"Source unknown … nothing about its provenance can be relied upon."* | **critical** |

Two design choices are deliberate:

- **`source` is required, and `unknown` is a first-class, honest answer.** Omitting the
  source is not allowed (`PROVENANCE_SOURCE_REQUIRED`); declaring `unknown` is. A
  caller that genuinely does not know the origin is *better off* saying so — `unknown`
  is honest and simply carries a critical disclosure — than inventing false
  specificity. The contract rewards candor over confidence.
- **The union is closed so a new label cannot smuggle in a missing disclosure.** If
  callers could coin arbitrary source kinds, a kind with no matching rule in the
  registry would render with no disclosure at all. Closing the enumeration means every
  legal source kind has a known honesty consequence, decided in the contract, not by
  the caller.

---

## 3. The disclosure engine

This is where honesty is *mechanized*. The rule set lives in
[`contract/registries/disclosures.v1.json`](../contract/registries/disclosures.v1.json),
a **closed registry**. Every disclosure obeys one invariant:

> **A disclosure fires from a machine-checkable fact in the artifact — never from
> caller text, and never from a caller flag.**

Concretely, each rule has a `trigger` that reads only *derived* artifact facts, and a
fixed `text` that Cortexel owns. A few representative examples:

| Fact in the artifact | Disclosure |
|----------------------|------------|
| `scope.kind == 'sampled'` | *"Edges sampled: N of M connections are shown. Degree and completeness cannot be read from this figure."* |
| `scope.kind == 'mpi_target_rank_local'` | *"Rank-local snapshot … in-degree is complete for these local targets; out-degree and global completeness are not."* |
| `nodeUniverse.complete == false` | *"Node set incomplete … a node missing here is not a node with degree zero."* |
| `validation.referenceComparison.status == 'not_run'` | *"No independent reference comparison was run for this figure."* |
| a matrix figure has sparse cells | *"An empty cell means no connection was observed. It is distinct from a connection whose weight is zero, which is drawn as a value."* |

Artifact 1.0 contains no compacted/excerpt branch or corresponding disclosure. Design
notes for a possible future digest-bound sidecar do not make that vocabulary valid; a
later artifact revision adds it only with a producer and executable verifier.

The consequences of "facts, not text or flags" are precise and worth stating plainly:

- **A caller cannot *suppress* a disclosure by omitting a field.** The disclosure is
  driven by the fact the data creates, not by a field the caller chose to send.
- **A caller cannot *weaken* a disclosure by rewording it.** The text is the
  registry's, not the caller's.
- **A caller cannot *promote* its data by setting a boolean.** There is no flag whose
  truth value removes a disclosure.
- **The only way to remove a disclosure is to remove the fact that causes it.** If you
  do not want the "edges sampled" disclosure, supply the complete edge set — do not
  ask for the disclosure to be turned off. This is the whole point: the disclosure and
  the underlying limitation are the same object, so they cannot drift apart.

### Ordering and non-suppression

- Disclosures are ordered **by severity** — `critical`, then `important`, then
  `informational` — and within a severity by rule id, so ordering is deterministic and
  never a function of caller input.
- In the semantically stable development renderer **no disclosure can be suppressed, reordered below a caller note, or
  visually dominated by one.**
- The visible footer, in-memory table metadata, and accessible description carry the
  same **complete** disclosure list. A
  detached canonical data sidecar is not emitted in the current development tree. The artifact binds the
  exact ordered table-column keys, but not the table row bytes, so no row-integrity claim is
  made.

> **Current development status.** All 19 semantically stable families render end to end, and their
> mandatory disclosures are wired and tested (`test/disclosureCompleteness.test.ts`): a
> rank-local snapshot says so, a correlogram states its lag orientation, a matrix keeps an
> absent cell distinct from a measured zero. The disclosure *engine* is contract-level and
> applies to every family. What is still landing is publication-grade visual tuning, not
> honesty.

---

## 4. The four disclosure locations that must agree

A disclosure that appears in only one place is a disclosure that can be defeated by
looking at a different place. Cortexel therefore renders the **same** disclosure text,
generated from the registry, in **four** locations, and a test asserts all four agree:

1. **The artifact JSON** — the machine-readable record other tools consume.
2. **The visible SVG footer** — what a sighted reader sees on the figure.
3. **The SVG accessible description** — what a screen-reader user hears.
4. **The table metadata** — what travels with the complete in-memory table returned by
   the development API.

All four carry the full set; no surface gets a lower-priority subset. **Why four:** a
figure is copied, embedded, screen-read, and re-parsed by
different audiences through different surfaces. Honesty that is present for a sighted
reader but absent for a screen reader, or present in the pixels but absent in the
machine record, is not honesty — it is honesty theater. Agreement across all four is a
tested invariant, not an aspiration.

---

## 5. Caller notes — attributed, unverified, isolated

Callers legitimately want to attach context ("recorded from layer 4 of the Brunel
network"). Cortexel supports this, but under strict rules so a note can never become a
counterfeit conclusion:

- **A caller note is not a disclosure.** It is rendered *separately*, under an
  attribution that marks it as the caller's unverified statement — the presence of a
  declared note itself fires the informational disclosure *"The figure carries a note
  declared by the caller. Cortexel has not verified it."*
- **It is never merged into mandatory disclosure text.** It cannot replace, reorder,
  or visually displace a mandatory disclosure. A caller note always renders after the
  contract-owned disclosures.
- **It is length-bounded.** An over-long note is rejected (`PROVENANCE_NOTE_TOO_LONG`)
  rather than truncated silently.
- **It is display-sanitized.** Control characters, bidirectional-override characters,
  and zero-width characters are rejected (`PROVENANCE_NOTE_UNSAFE_DISPLAY`) and the
  note is rendered bidi-isolated. Such characters can visually spoof an axis label, a
  caption, or a mandatory disclosure — reordering glyphs so a note *appears* to say
  something a mandatory disclosure denies. Cortexel refuses the input rather than
  render a caption whose displayed order it cannot vouch for.

**Why the caller gets a voice but not authority.** The goal is not to silence the
caller — context is useful — but to make it structurally impossible for caller text to
*impersonate* a Cortexel conclusion. The reader always sees which words are the
library's assurance and which words are an unverified claim from whoever sent the data.

---

## 6. Assurance levels — what "valid" actually means

Cortexel reports how far a request advanced through its pipeline. There are four
levels, and **none of them means "scientifically true."** Naming them precisely is
itself part of the honesty model: an over-broad word like "verified" invites a reader
to assume more than was checked.

| Level | What Cortexel checked | What it does **not** mean |
|-------|-----------------------|---------------------------|
| **Parsed** | The input is well-formed, bounded, literal JSON: finite binary64 numbers, no duplicate object keys, no accessors/getters, no sparse or decorated arrays, no prototype-polluting keys. | That the values are meaningful. |
| **Structurally valid** | The request matches the skill's **closed** schema — required fields present, correct types, enumerated values in range, no unknown properties. | That the numbers are self-consistent. |
| **Semantically valid** | The cross-field rules JSON Schema cannot express hold: parallel arrays align, a rate denominator counts recorded (not merely spiking) neurons, a rank-local snapshot cannot claim a global out-degree, a multapse aggregation is declared rather than "last edge wins", a unit's dimension matches its quantity. | That the underlying measurement is correct, or that a real simulator produced these numbers. |
| **Output-integrity verified (reserved; not implemented in the current development tree)** | A future detached verifier will re-check canonical artifact bytes, every bound payload digest, sidecar structure, and identity. The current writer binds the SVG in its artifact but has no artifact reader/verifier and no bound table sidecar, so it does not issue this assurance level. | Even when implemented, this will not mean the figure is scientifically confirmed: integrity verification will not re-run a simulator or establish scientific truth. |

Artifact schema validity separates three claim classes. **Shape claims** (closed ids,
required fields, exact producer constants, and legal cross-products) are decided by JSON
Schema. **Content-binding claims** (request/SVG digests, byte length, and returned-table
shape matching their actual payloads) require recomputation; their fields are
well-formed in the schema but are not thereby proven true. **Process/provenance claims**
(which parser, validators, renderer, or source actually ran) require trust in the current
producer or a later independent attestation boundary. A forged artifact can therefore
be schema-perfect. Structural validity is a fail-closed writer postcondition and a
descriptive contract, not authentication or tamper verification.

Two honest edges of these levels:

- **The raw-text vs. materialized-value gap is reported, not hidden.** Duplicate object
  member names can only be detected while parsing raw text; once an ordinary
  `JSON.parse` has overwritten an earlier member, the ambiguity is unrecoverable.
  When Cortexel validates an already-materialized value it honestly reports the weaker
  `duplicateKeys: "not_observable_after_materialization"` assurance rather than claiming
  a check it could not perform.
- **No level implies independent scientific confirmation.** The independent oracle
  (`reference/`) is scaffolded but **not run** in this repository — every skill's
  `evidence.externalOracle.status` is `not_run`, and the corresponding disclosure
  (*"No independent reference comparison was run for this figure."*) fires accordingly.
  The hand-computable golden vectors in `test/analysis.test.ts` are executed and
  passing; they are the *floor* of evidence, not proof of scientific correctness.
  **Never read any assurance level as "Cortexel confirmed this result against NEST or
  Elephant."** It did not, and it says so.

---

## 7. Source authenticity vs. source declaration

Every Artifact 1.0 result carries the disclosure *"Source authenticity not verified.
Cortexel validated the structure and semantics of this request; it did not check that
the underlying source bytes are what they claim to be."*

This is a deliberate second boundary. Cortexel checks that a request is *internally*
honest and well-formed; it does not prove that the bytes came from the run the caller
names. A request may **never** assert its own verification result. Artifact 1.0 has no
attestation input, signature verifier, or code path that can clear this disclosure;
its `attestations` member is required to be empty. A later contract revision may add
such a boundary only together with an independently verifiable issuer/integrity model.
The append-only `PROVENANCE_ATTESTATION_UNVERIFIED` code is not an invitation to supply
an attestation to the current API.

---

## 8. Governance reality (stated honestly)

Cortexel is maintained by a **single maintainer, Sepehr Mahmoudian.** There is no
review board, no staffed support desk, no response-time SLA, and no DOI. Security
reports go through GitHub's private security-advisory flow; acknowledgement is a
best-effort within a few business days, not a contractual commitment.

This matters for the honesty model precisely because the model is designed to hold
*without* trusting the maintainer's diligence on any given figure. The guarantees are
mechanical — closed unions, registry-driven disclosures, an authority boundary checked
before schema validation, four agreeing disclosure surfaces — so they do not depend on
a human remembering to add a caveat.

**The desired end state for stable science.** For any capability to graduate to a
*stable scientific* claim (as opposed to a stable software contract), the intended
requirement is **independent external review**: a pinned reference environment actually
executed, cross-language validation by a second implementation, and scientific checks
by someone other than the author. That review has **not** happened yet. Until it does,
the current pre-1.0 tree is a development preview whose figures are honestly labeled as not
independently confirmed — which is the entire reason this provenance model errs, every
time, toward disclosing a limitation rather than asserting a result.

---

## References

- [`contract/registries/disclosures.v1.json`](../contract/registries/disclosures.v1.json) — the closed disclosure rule registry
- [`contract/registries/capabilities.v1.json`](../contract/registries/capabilities.v1.json) — the stable / experimental / removed matrix
- [`contract/registries/error-codes.v1.json`](../contract/registries/error-codes.v1.json) — stable error codes (`PROVENANCE_*`, `SCOPE_*`, `SCIENCE_*`, …)
- [SECURITY.md](../SECURITY.md) — the honesty boundary as a security property
- [docs/KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) — what the current development tree does not yet do
- [docs/release/BASELINE-2026-07-14.md](./release/BASELINE-2026-07-14.md) and [`docs/release/evidence-ledger.v1.json`](./release/evidence-ledger.v1.json) — the frozen baseline and per-gate evidence state
- [AGENTS.md](../AGENTS.md) — building figures *with* Cortexel; [CLAUDE.md](../CLAUDE.md) — working *on* Cortexel

_Cortexel is authored and maintained by Sepehr Mahmoudian. MIT-licensed._
