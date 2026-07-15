# Cortexel governance

> **Status: 0.9.0 — a pre-1.0 development preview.** This document describes how
> decisions are made about Cortexel *today*, honestly reflecting that the project
> currently has **one maintainer**. It does not describe a board, a committee, or a
> staffed organization, because none exists. Where a rule anticipates 1.0, it is
> written as a **desired requirement** and labelled as such, not as an accomplished
> fact.

Cortexel is a closed, versioned catalog of scientifically constrained neural-data
figure contracts. Its whole value proposition is that a stored artifact means exactly
what its provenance says it means and nothing more. Governance exists to protect that
property from the most likely failure mode of a single-author project: **unreviewed
self-certification**. The mechanisms below are deliberately designed so that
"the maintainer decided" is never silently equivalent to "the science was
independently checked."

- [1. Roles and the single-maintainer reality](#1-roles-and-the-single-maintainer-reality)
- [2. How decisions are made](#2-how-decisions-are-made)
- [3. Change classes and the evidence each requires](#3-change-classes-and-the-evidence-each-requires)
- [4. The external-review requirement for stable science](#4-the-external-review-requirement-for-stable-science)
- [5. Breaking changes and deprecation](#5-breaking-changes-and-deprecation)
- [6. Emergency security path](#6-emergency-security-path)
- [7. Amending this document](#7-amending-this-document)

---

## 1. Roles and the single-maintainer reality

Cortexel has exactly one maintainer:

| Role | Holder | Scope |
|------|--------|-------|
| Maintainer / release authority | **Sepehr Mahmoudian** | All merges, all releases, security triage, code of conduct enforcement, roadmap. Named `owner` on every capability in [`contract/registries/capabilities.v1.json`](./contract/registries/capabilities.v1.json). |

There is **no** second maintainer, no review board, no rotating on-call, no staffed
support desk, and no response-time SLA. Stating otherwise would itself be a violation
of the honesty principle the project is built on. Contributions from others are
welcome (see [CONTRIBUTING.md](./CONTRIBUTING.md)) and are reviewed by the maintainer,
but a contributor does not gain merge or release authority by contributing.

**Why name this explicitly.** A single-author scientific tool has a structural
conflict of interest: the person who writes an algorithm is the least able to catch
their own conceptual error in it. The rest of this document is the maintainer binding
their own authority to machine-checkable gates and to a still-unmet external-review
requirement, precisely because self-review is not a substitute for independent review.

---

## 2. How decisions are made

Because there is one maintainer, the *decision* is fast; the *discipline* is in what a
decision is required to leave behind. Every change to Cortexel is accountable to three
durable, machine-readable records, not to a person's recollection:

1. **Git history + [`CHANGELOG.md`](./CHANGELOG.md).** Every user-visible change is
   recorded under the working version's `Unreleased` heading. This is required by the
   pull-request checklist in [CONTRIBUTING.md](./CONTRIBUTING.md).
2. **The coordinated identity model**
   ([`contract/registries/identity.v1.json`](./contract/registries/identity.v1.json)).
   Any change to the normative contract changes the `contractDigest`; a change to the
   stable catalog changes the `catalogDigest`; a change to a skill's accepted meaning
   bumps that skill's `skillRevision`. These are derived deterministically by
   `scripts/generate-contract.ts` and cannot be edited by hand into agreement —
   `scripts/check-generated.ts` fails if generation is stale or nondeterministic.
3. **The evidence ledger**
   ([`docs/release/evidence-ledger.v1.json`](./docs/release/evidence-ledger.v1.json)).
   Every one of the 155 release gates carries an explicit
   `PASS` / `FAIL` / `NOT_RUN` / `NOT_APPLICABLE` / `BLOCKED` state. A gate is `PASS`
   **only** when it links a reproducible receipt (a test file, a generated artifact, a
   schema). `scripts/check-evidence-ledger.ts` rejects a `PASS` with no receipt and
   requires a rationale for `NOT_APPLICABLE`.

The controlling principle is: **the maintainer may decide anything, but may not mark a
gate green that has no evidence.** The ledger is what makes "not done yet" (`NOT_RUN`)
and "cannot be self-certified" (`BLOCKED`) first-class, visible states rather than
quietly missing checkmarks. `docs/KNOWN_LIMITATIONS.md` is the human-readable
companion to those un-green gates.

A decision is considered *made* when it is merged to `main` with its required evidence
(Section 3) present. Pre-1.0, `main` may break between decisions; consumers pin a
commit rather than tracking `HEAD` (see [CONTRIBUTING.md](./CONTRIBUTING.md) on
downstream pinning).

---

## 3. Change classes and the evidence each requires

Not every change carries the same risk, so not every change requires the same
evidence. A change is classified by its **highest-risk** aspect: a pull request that
touches two classes must satisfy the stricter one. All classes require that
`bun run check` (typecheck + test) passes and that `CHANGELOG.md` is updated; the
table below states what each class requires *in addition*.

| Class | What it is | Additional evidence required | May the sole maintainer self-merge? |
|-------|-----------|------------------------------|-------------------------------------|
| **documentation-only** | Prose in `*.md`, comments, examples that are not executed as fixtures. | A read-through for accuracy against the code it describes. No claim may be upgraded (e.g. calling an experimental capability "stable"). | Yes. |
| **implementation-preserving-contract** | Refactor, rename, or performance change that provably does not alter any accepted request, emitted artifact, or canonical bytes. | Full test suite green; `contractDigest` and `catalogDigest` **unchanged** (proof that nothing normative moved). If a digest changes, it is not this class. | Yes. |
| **renderer / presentation** | Layout, color, tick, glyph, or scene-primitive changes that alter pixels/SVG bytes but not the underlying scientific values. | Determinism receipts for the affected renderer; the exact-value table and disclosures must be unchanged in meaning; `rendererRevision` bumped when output bytes change. WebGL/experimental scenes must still visibly declare experimental status. No scientific distinction may become color-only. | Yes. |
| **scientific-algorithm** | Any change to how a measured quantity is computed, binned, normalized, aggregated, or scoped — the analysis layer under `src/analysis/` and the semantic validators. | Hand-computable golden vectors updated and passing (`test/analysis.test.ts`); the change stated in a versioned convention page; **and the external-review gate of Section 4.** The independent oracle layer (`reference/`) remains honestly `not_run` until executed — a change here may **never** be described as "confirmed against NEST/Elephant" while that layer is unrun. | **No** — see Section 4. |
| **semantic-contract / catalog** | Adding, removing, or redefining a figure contract, an error code, a unit, a scope, a disclosure rule, or a budget; anything under `contract/`. | Regenerated sources via `scripts/generate-contract.ts` with `scripts/check-generated.ts` green; living valid/invalid examples; error codes remain **append-only within contract 1.x** (a code's meaning never changes, a code is never reused); a removal carries a deterministic migration outcome (never a silent alias). A change to accepted *meaning* also triggers the compatibility rules of Section 5. | Mechanical parts yes; a change to accepted scientific meaning is also a scientific-algorithm change and inherits Section 4. |
| **security-boundary** | The parser, the value snapshot, the honesty/disclosure engine, provenance authority, resource budgets, or anything in scope of [SECURITY.md](./SECURITY.md). | A regression test that fails before the fix and passes after; a `CHANGELOG` `Security` entry; proof that no gate protecting a boundary was weakened. A change that lets synthetic/advisory data render without its disclosure, or that lets a caller author a library-generated assurance, is a defect, not a feature. | Yes for hardening; a boundary *relaxation* requires the emergency/deliberate review of Section 6 and must never be silent. |
| **dependency / build** | `package.json`, lockfile, `tsup`/build config, generated `dist/`, or the toolchain. | `bun run audit` clean; `bun run lint:package` and `bun run test:package` green; while `dist/` remains committed, it is rebuilt in the same change and byte-stable (a two-build determinism check). New runtime dependencies are added conservatively and justified in the change description. | Yes. |
| **release** | Cutting a tagged version and its GitHub release. | The full release procedure of Section 5, gated by `check-evidence-ledger.ts`. At 0.9.0 this excludes npm, PyPI, and DOI publication, which have not occurred. | Only the maintainer, as the sole release authority. |

If a change does not cleanly fit a class, it is treated as the **most restrictive**
plausible class until shown otherwise. Ambiguity resolves toward more evidence, never
less.

---

## 4. The external-review requirement for stable science

This section states a **desired requirement for the 1.0 stable contract.** It is not
yet met, and this document does not pretend it is.

**The requirement.** Before any `scientific-algorithm` change (Section 3) may be
promoted into a *stable* 1.x figure contract, its scientific correctness must be
reviewed and signed off by a **qualified domain reviewer who is not the author.** The
review — upstream tool versions consulted, the reasoning, the reviewer's identity — is
recorded, not merely asserted. This mirrors release gates **R132** ("at least one
scientific reviewer and one external package consumer have reviewed the release
candidate") and **R147** ("scientific/interoperability review pass is signed").

**Why it exists.** Cortexel's core promise is that a figure is scientifically honest.
A single author cannot independently verify the correctness of their own scientific
reasoning; treating self-review as sufficient would reintroduce exactly the
unaccountable "trust me" that the fail-closed provenance model forbids everywhere else.
The two evidence layers Cortexel currently ships — hand-computable golden vectors
(`test/analysis.test.ts`, executed and passing) and the independent oracle scaffold
(`reference/`, honestly `not_run`) — are the *floor* of scientific evidence, not the
whole of it. External domain review is the missing ceiling.

**Why it is currently BLOCKED, not self-certified.** No second qualified reviewer
exists for this project today. Under those conditions the honest state of the
scientific-review gates (R132, R147, and by extension the 1.0 authorization gates
R150 and R153) is **`BLOCKED`** in the evidence ledger — a capability that cannot be
satisfied under present conditions — **not `NOT_RUN`** (as if merely pending) and
emphatically **not `PASS`**. The maintainer will **not** mark these gates green by
reviewing their own work. Consequently:

- 0.9.0 and any other pre-1.0 tag make **no stable-contract claim** and are gated on
  ledger *integrity* alone (every gate honestly stated), not on the science gates
  passing.
- A `1.0.0` (or later stable) tag is **blocked** by
  `scripts/check-evidence-ledger.ts` while any release-blocking gate — including the
  external-science-review gate — is unproven. The tooling enforces this; it is not a
  matter of the maintainer remembering to wait.

This gate is unblocked only by the arrival of a real, named, independent domain
reviewer whose recorded sign-off becomes the gate's receipt — never by relabeling the
gate.

---

## 5. Breaking changes and deprecation

Compatibility is defined per **named identity axis**
([`identity.v1.json`](./contract/registries/identity.v1.json)); a "version" with no
axis label is a number, not a promise.

**Pre-1.0 (now).** The project is in active pre-1.0 development and `main` may break
between commits. This is not license for silent breakage: a breaking change still
requires a `CHANGELOG` entry and, where it changes accepted meaning, a migration note.
Downstream consumers pin a specific commit and update deliberately.

**At and after 1.0 (desired policy).**

- **Request contract** (`cortexel-figure-request`): an incompatible request shape or an
  incompatible semantic change requires a **major** bump (2.0). Additive optional
  fields whose defaults leave existing requests unchanged remain within 1.x.
- **Artifact contract** (`cortexel-figure-artifact`): a stored artifact is **never
  rewritten in place**; a 1.x reader supports every 1.x revision.
- **Error codes** are **append-only within contract 1.x**: prose may improve, a code's
  meaning may not change, and a code is never reused. Downstream tests assert on the
  code and instance path, so this is a compatibility surface.
- **Skill revision**: a change to a skill's accepted meaning or output bumps its
  `skillRevision`. A request may pin a revision; a build that cannot provide the
  pinned revision **refuses** rather than approximating it.

**Deprecation and removal** follow the status ladder in
[`capabilities.v1.json`](./contract/registries/capabilities.v1.json), whose four
statuses (`stable`, `experimental`, `deprecated`, `removed`) are enforceable rather
than rhetorical:

1. **Deprecate.** The capability keeps working, is marked `deprecated`, names its
   replacement, and is excluded from automatic routing. It is announced in the
   `CHANGELOG`.
2. **Remove.** A removed capability is `removed` with a **deterministic migration
   outcome** — never a silent alias, because a silent alias makes a stored artifact
   ambiguous about what was actually validated. A pre-1.0 id used in normal validation
   fails with a migration error and is handled by the `cortexel migrate` CLI, which
   emits a draft request plus a report and never invents a fact the legacy payload did
   not carry (for example, the ambiguous `nest.connectivity_matrix` refuses to guess
   between adjacency, weight, and delay).

The distinction between `status` (the promise) and `releaseReady` (whether the
evidence for that promise exists) is intentional and is preserved: a label that can be
set without evidence is a marketing label, and Cortexel does not ship those.

**Release procedure (all tiers).**

1. Land all intended changes with their Section 3 evidence; `bun run check`,
   `bun run audit`, `bun run lint:package`, `bun run test:package` green.
2. Rebuild committed `dist/` and confirm it is byte-stable and staged.
3. Reconcile the evidence ledger to the truth: every gate in its real state, `PASS`
   only with a receipt. Run `scripts/check-evidence-ledger.ts`. For a **stable** tag
   it must find no unproven release-blocking gate; for a **pre-1.0** tag it asserts
   only ledger integrity and that no stable-contract claim is made.
4. Update `CHANGELOG.md` and `CITATION.cff` (`version`, `date-released`).
5. Tag and cut the GitHub release. **A DOI is minted only after a real archived
   release exists; a placeholder DOI is never inserted.** At 0.9.0 nothing is
   published to npm or PyPI, and the npm/PyPI/DOI badges are inactive by design.

---

## 6. Emergency security path

Security is reported and handled per [SECURITY.md](./SECURITY.md); this section covers
who acts and how fast, honestly.

**Reporting.** Report privately through GitHub's
[security advisories](https://github.com/sepahead/cortexel/security/advisories/new),
not a public issue. The maintainer is the sole security contact and aims to
acknowledge a report **within a few business days**. That is a good-faith target from
one person, **not** a staffed SLA — there is no on-call rotation, and this document
will not pretend there is one.

**What counts as a security issue here.** In addition to conventional vulnerabilities
(injection, prototype pollution, resource exhaustion, path traversal), Cortexel treats
its **scientific-honesty boundary as a security property.** A change or defect that
lets synthetic or advisory data render **without** its mandatory disclosure caption,
that lets a caller author a library-generated assurance, or that lets caller free text
displace the machine-derived disclosure, is a security defect — not a cosmetic bug.

**Fast-track handling.** For an actively exploitable defect the maintainer may act
unilaterally and immediately — that is the one advantage of a single-owner project —
but the fix is still bound to the non-negotiable minimums:

- It ships with a **regression test** that fails before the fix and passes after.
- It is recorded in the `CHANGELOG` `Security` section (with an embargo window if a
  private reporter needs time).
- It **does not weaken** any gate protecting a boundary. A fix that must *relax* a
  boundary is a deliberate contract change, gets a `security-boundary` entry, and is
  never done silently.
- It never suppresses, reorders, or makes optional the mandatory honesty disclosure,
  and never adds a path that returns a caller caption verbatim.

An emergency fix may bypass the *normal cadence* of review, but it may **never** bypass
the *evidence*. The honesty and safety invariants are exactly the things an emergency
is most tempting to cut, so they are the things this path refuses to cut.

---

## 7. Amending this document

This governance document is itself a `documentation-only` change (Section 3) and is
amended by the maintainer through an ordinary pull request with a `CHANGELOG` note.
Two kinds of amendment carry a higher bar and must be called out explicitly in the
change description:

- **Adding a maintainer or reviewer.** When a second qualified person takes on merge,
  release, or scientific-review authority, this file is updated to name them and their
  scope, and the relevant `BLOCKED` ledger gates (Section 4) may move toward `NOT_RUN`
  or `PASS` **only** on the strength of that real person's recorded work.
- **Relaxing any evidence requirement.** Weakening what a change class in Section 3
  demands is a governance change of record and must state, in the amendment itself, why
  the weaker bar still protects the artifact-honesty property.

Until such an amendment lands, the single-maintainer reality and the blocked
external-science-review gate stand as written — honestly, and without a checkmark that
has not been earned.

---

*Maintained by Sepehr Mahmoudian. Licensed under [MIT](./LICENSE).*
