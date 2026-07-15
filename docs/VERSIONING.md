# Versioning and compatibility

> **Status: 0.9.0 is a pre-1.0 development preview.** It makes **no** stable-contract
> promise. Any release in the `0.x` line may change any axis described below without a
> migration path. **The stable compatibility promise defined in this document begins at
> `1.0.0`.** Until then, treat `main` as moving and do not cite HEAD as a released
> contract.

This document defines how Cortexel is versioned: the several *named* identities it
carries, what each one means, when each one moves, and the compatibility guarantees
that attach to them once the project reaches `1.0`. It is the authoritative reference
for anyone pinning Cortexel as a dependency, archiving its output, or building a
second implementation against its contract.

The normative source for the axes below is
[`contract/registries/identity.v1.json`](../contract/registries/identity.v1.json).
The stable/experimental/removed capability matrix is
[`contract/registries/capabilities.v1.json`](../contract/registries/capabilities.v1.json).
The append-only error codes referenced here live in
[`contract/registries/error-codes.v1.json`](../contract/registries/error-codes.v1.json).

## Why more than one version number

A single version string cannot honestly describe Cortexel. The published package, the
shape a caller authors, the shape Cortexel emits, the exact bytes of the normative
contract, and the git commit a build came from all change on *different* schedules and
for *different* reasons. Collapsing them into one number forces a lie in one direction
or another: either a cosmetic package release pretends the contract moved, or a
breaking contract change hides behind an unchanged package number.

The pre-1.0 tree already carried five uncoordinated numbers — package `0.5.0`, a
VizSpec version, a skill-axis version, a manifest version, and a constraint-language
version — with no stated relationship between them. Multiple identities are legitimate.
A bare version tuple with **no axis label and no compatibility rule** is not an
identity; it is a number that invites misinterpretation. The coordinated identity model
fixes this by giving every axis a name, an explicit meaning, an explicit compatibility
rule, and an explicit source set, and by returning them **together** from one call.

## The named axes

`getBuildIdentity()` (exported from `cortexel/core`) returns the build-level axes in one
frozen object; the per-skill and per-renderer revisions live on each catalog entry and
are stamped into every artifact a build produces.

| Axis | Where it lives | What it identifies |
|------|----------------|--------------------|
| **Package version** (`packageVersion`) | `package.json`, npm/PyPI | The SemVer of the installed software artifact. |
| **Request contract** (`requestContract`) | `cortexel-figure-request/1.0` | The shape and acceptance rules of what a *caller authors*. |
| **Artifact contract** (`artifactContract`) | `cortexel-figure-artifact/1.0` | The shape of what Cortexel *emits and archives*. |
| **Contract digest** (`contractDigest`) | `sha256:…` | A cryptographic hash over the entire normative contract source set. |
| **Catalog digest** (`catalogDigest`) | `sha256:…` | A hash over the **stable catalog only**. |
| **Skill revision** (`skillRevision`) | per skill, on its catalog entry | A per-skill integer, bumped when that skill's accepted meaning or output changes. |
| **Renderer revision** (`rendererRevision`) | per renderer, on the catalog entry | A per-renderer integer, bumped when that renderer's output changes. |
| **Source revision** (`sourceRevision`) | git commit, or `unreleased-worktree` | The exact commit a release was built from. |

### Package version — SemVer for the software

`packageVersion` is standard Semantic Versioning for the **API surface** of the
installed package. It deliberately says **nothing** about the contract on its own: two
package versions may ship the same contract, and — critically — **a patch release may
never change contract acceptance.** If a change alters which requests are accepted or
what artifact they produce, that is a contract change and must move a contract axis and
the package's minor or major accordingly; it can never arrive as a patch.

### Request contract and artifact contract — the request/artifact split

These are two independently versioned contracts, not one, because a caller and Cortexel
occupy opposite sides of the boundary:

- **`cortexel-figure-request/1.0` — `FigureRequestV1`** is *what a caller authors*: the
  data, its units, its scope, its declared source, and its provenance about the data.
- **`cortexel-figure-artifact/1.0` — `FigureArtifactV1`** is *what Cortexel emits*: the
  validated figure, its disclosures, its digests, its accessibility table, its
  calibration and validation status, and the identity of the build that produced it.

The split is a load-bearing honesty boundary, not bookkeeping. **A caller may declare
what its data *is*; it may never author what Cortexel *concluded* about it.** Validation
status, reference-comparison status, disclosure text, output digests, and calibration
are library-generated assurances. An attempt to set one of them in a request is rejected
up front with `PROVENANCE_CALLER_ASSURANCE_FORBIDDEN`, checked on the raw request before
any schema stage so it cannot hide behind another error. Versioning the two shapes
separately keeps that asymmetry explicit: the request schema can gain an optional field
without touching the artifact schema, and vice versa.

Compatibility rule for each contract line:

- **Request contract.** Additive optional fields with unchanged defaults stay within
  `1.x`. An **incompatible request shape** or an **incompatible semantic change** — one
  that would reject a previously valid request or reinterpret its meaning — requires a
  major bump to `2.0`.
- **Artifact contract.** A `1.x` **writer** emits the current `1.x` revision. A `1.x`
  **reader** must support **every** `1.x` revision it may encounter. This is what lets
  an archive of artifacts written across many `1.x` builds still be read by one current
  reader.

An unsupported declared contract version fails closed with
`CONTRACT_UNSUPPORTED_VERSION`, pointing the caller at `cortexel migrate` and at
`cortexel identity --json`.

### Contract digest — the identity that matters for reproducibility

`contractDigest` is a SHA-256 over the canonicalized **normative source set** under
`contract/`. It is the axis that actually pins reproducibility, because it changes
whenever *anything normative* changes — a schema, a semantic validator, a budget, a
disclosure rule, a unit, a skill contract — even when no human-facing version number
moved. A caller may pin it; a mismatch against the running build fails with
`CONTRACT_DIGEST_MISMATCH`, which is the honest signal that "the contract you validated
against is not the contract in use."

The digest is computed deterministically so that two builds of the same source produce
byte-identical digests:

1. Canonicalize each JSON file with **RFC 8785 (JSON Canonicalization Scheme)**.
2. SHA-256 each canonical UTF-8 byte sequence.
3. Sort entries by repository-relative path in UTF-8 code-unit order.
4. SHA-256 the RFC 8785 canonical JSON of that sorted inventory.

The source set **includes** `contract/meta`, `contract/registries`, `contract/schemas`,
and `contract/skills`. It **excludes** the manifest (it cannot contain its own hash),
the conformance corpus (vectors *test* the contract; they are not the contract), and
prose such as `contract/README.md`. A volatile input — a timestamp, a build host, an
absolute path — is prohibited in any normative file, because it would make the digest
unreproducible and therefore useless. A short prefix of the digest may be *displayed* to
a human; it is never used as an API value.

An additive, compatible change — for example bumping one skill's revision — will change
the contract digest **while leaving the request/artifact contracts at `1.0`.** That is
correct and intended: the digest tracks bytes, the contract line tracks compatibility,
and the two answer different questions.

### Catalog digest — the stable surface, isolated

`catalogDigest` hashes the **stable catalog only**, kept separate from the contract
digest so that editing an experimental capability's description, an example, or an
internal note **cannot** perturb the stable identity. If the catalog digest is
unchanged, the set of stable promises is unchanged, regardless of churn in the
experimental or documentation areas.

### Skill and renderer revisions — pin, don't approximate

Each skill and each renderer carries its own positive-integer revision, bumped when its
accepted meaning or its output changes. A request **may pin** a specific
`skill.revision`. If the installed build does not provide that revision, it **refuses**
with `CONTRACT_SKILL_REVISION_UNSUPPORTED` rather than silently rendering with the
nearest available revision. Approximating a pinned revision would produce a figure that
claims to be one thing and is another; refusal is the only honest outcome.

### Source revision — never lie about provenance

`sourceRevision` is the git commit a release was built from, or the literal
`unreleased-worktree`. A dirty or non-tagged build reports `unreleased-worktree` and
`release: false`; it never guesses a release commit, because a build that lies about its
own provenance is worse than one that admits it has none. The current `0.9.0` local
build honestly reports `sourceRevision: "unreleased-worktree"` and `release: false`.

## What a patch, minor, or major means

The rules below apply to the package once the project reaches `1.0`. Each contract line
(request, artifact) also carries its own major/minor semantics as described above; a
package release rolls up the strongest change in any axis it touches.

- **Patch (`x.y.Z`).** Bug fixes and documentation that do **not** change contract
  acceptance and do **not** change any figure's output for the same input. If a fix
  would change either, it is not a patch. Rendering the *same* request against a patch
  release yields a byte-identical artifact.
- **Minor (`x.Y.0`).** Backward-compatible additions: a new stable skill, a new optional
  request field with an unchanged default, an additive skill or renderer revision, a new
  export. Existing valid requests remain valid and produce the same result; the contract
  digest changes but the request/artifact contract lines stay within their major.
- **Major (`X.0.0`).** Any incompatible change: removing or renaming a capability,
  tightening acceptance so a previously valid request now fails, changing the meaning of
  an existing field, or — see below — a scientific correction that changes results. A
  major bump moves the affected contract line's major (for example
  `cortexel-figure-request/2.0`) and is accompanied by a deterministic migration.

## Stable artifacts are never rewritten in place

A stored `FigureArtifactV1` embeds the identity of the build that produced it —
`packageVersion`, `contractDigest`, `catalogDigest`, `sourceRevision`, and the skill and
renderer revisions in effect at emission. **That artifact is never rewritten in place.**
A later build that fixes or changes a figure produces a *new* artifact with a *new*
identity; it does not reach back and reinterpret an archived one. A `1.x` reader is
required to keep reading every `1.x` artifact revision precisely so that old artifacts
remain interpretable without mutation. This is what makes a figure archive auditable:
you can always recover exactly which contract, which revisions, and which commit
produced a given figure.

## Scientific corrections are errata, and normally major

A correction to Cortexel's *scientific* behavior — a change to a binning convention, a
rate denominator, a correlogram orientation, a unit dimension, an aggregation rule, or
any derivation that makes the figure for an **unchanged** request come out **different**
— is not an ordinary bug fix and is never shipped as a patch. It is:

1. A **documented erratum.** The changelog and the affected skill's contract record
   state plainly what was wrong, what changed, and from which version the corrected
   behavior applies. Silence would let two figures that disagree both claim to be
   "Cortexel output" with no way to tell which computation each used.
2. **Normally a major bump**, and always at least a bump of the affected skill's
   revision. Because the correction changes what a stored request would now produce, it
   changes the contract of that skill; downstream consumers must be able to detect the
   difference by version, not by re-deriving the numbers themselves.

Existing artifacts produced before the correction keep their original identity and are
**not** silently reinterpreted. They record the skill revision that produced them, so an
auditor can see they predate the erratum. The corrected behavior is reachable only by
re-running the request against the new revision.

### Certifying a scientific result before it is a stable claim

A scientific result is promoted to a **stable, certified** claim only after an
independent external reference (for the supported analyses, NEST / Elephant and the
hand-computable golden layer) has been *executed* and *matches*. This is a requirement
the project holds itself to before `1.0`, not a statement that such review has already
happened. As of `0.9.0`:

- Every skill contract's external-oracle status is honestly **`not_run`** — no pinned
  reference environment has been executed in this repository. The executed evidence is
  the hand-computable golden layer, which is the *floor* of scientific evidence, not the
  whole of it. See [`docs/KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) and the machine
  state in [`docs/release/evidence-ledger.v1.json`](./release/evidence-ledger.v1.json).
- Cortexel is maintained by a **single maintainer** (Sepehr Mahmoudian). There is no
  review board, no staffed support desk, and no response-time guarantee. Independent
  external review of the scientific layer is a gate the project intends to satisfy
  before making any stable scientific claim — not a process that currently runs.

No document in this repository claims a scientific result was independently confirmed
until that reference has actually been run and recorded with a reproducible receipt.

## Experimental and removed capabilities

The stable compatibility promise covers only capabilities marked `stable` in the
capability matrix: the **19 stable figure contracts plus the `figure.bundle` artifact
kind**. Everything else is versioned differently on purpose:

- **Experimental** capabilities — 3D spatial (`experimental.network.spatial_3d`), the
  evidence knowledge graph (`experimental.evidence.knowledge_graph`), animation replay
  (`experimental.neuro.animation_replay`), and the NCP adapter
  (`cortexel/adapters/ncp`) — are available, versioned independently, and **explicitly
  outside** the stable contract, determinism, accessibility, and compatibility
  guarantees. They are absent from stable counts, default discovery, root exports, and
  the conformance badge, and must be imported through an explicit experimental subpath.
  Requesting one through a stable entry point fails with `CAPABILITY_EXPERIMENTAL`. The
  NCP adapter will remain experimental until an *immutable* NCP release is certified; it
  is never certified against a moving upstream HEAD.
- **Removed** capabilities are gone from the catalog but retain a **deterministic
  migration outcome** — never a silent alias, because a silent alias would make a stored
  artifact ambiguous about what was actually validated. Requesting one fails with
  `CAPABILITY_REMOVED` or the appropriate `MIGRATION_*` code, and `cortexel migrate`
  produces a request-plus-report that never invents a fact the legacy payload did not
  carry. The removed pre-1.0 skills (`nest.connectivity_matrix`, `nest.spatial_2d`,
  `nest.stimulus_response`, `nest.animation_replay`) each name their replacement in the
  capability matrix and take effect at `removalVersion: 1.0.0`.

## The 0.x line and the road to 1.0

During `0.x`, **nothing above is a promise.** Any release may add, change, or remove any
capability and may move any axis without a compatibility guarantee or a migration path.
This is deliberate: `0.9.0` is a development preview whose purpose is to get the contract
and its invariants right *before* they are frozen, and freezing them prematurely would
be the dishonest move.

The stable compatibility promise begins at **`1.0.0`**. A stable (`1.x+`) release tag is
gated on the evidence ledger: it is blocked while any release-blocking gate is unproven,
and a `PASS` that carries no reproducible receipt is rejected. Pre-1.0 tags assert **no**
stable contract and are gated on ledger integrity alone. Until a `1.0.0` tag exists with
its gates satisfied, Cortexel has no released contract, and the axes in this document
describe how identity is *tracked*, not a stability guarantee that is yet in force.

## See also

- [`contract/registries/identity.v1.json`](../contract/registries/identity.v1.json) — the normative axis definitions.
- [`contract/registries/capabilities.v1.json`](../contract/registries/capabilities.v1.json) — the stable / experimental / removed matrix.
- [`contract/registries/error-codes.v1.json`](../contract/registries/error-codes.v1.json) — the append-only public error codes.
- [`docs/KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) — what `0.9.0` does not yet do.
- [`docs/release/BASELINE-2026-07-14.md`](./release/BASELINE-2026-07-14.md) and [`docs/release/evidence-ledger.v1.json`](./release/evidence-ledger.v1.json) — the frozen baseline and gate ledger.
- [`SECURITY.md`](../SECURITY.md) — the fail-closed honesty and input boundaries this identity model protects.
