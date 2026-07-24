# Roadmap — from the current pre-1.0 tree to 1.0

`0.9.0` is Cortexel's last tagged pre-1.0 release. The working source is the private,
unreleased `0.10.0-dev.0`; neither identity makes a stable-contract claim. Nothing has
been published to npm or PyPI, and no DOI has been minted. This document is the honest
path from the current tree to a `1.0.0` that would be allowed to make those claims.

It is derived from two sources, and they — not this prose — are authoritative:

- [`docs/KNOWN_LIMITATIONS.md`](./docs/KNOWN_LIMITATIONS.md) — the gate-referenced list
  of what the current development tree does not yet do.
- [`docs/release/evidence-ledger.v1.json`](./docs/release/evidence-ledger.v1.json) —
  the machine-readable state of all release gates. Counts are deliberately not
  copied into this prose: they would become a second, stale authority. Read the live
  ledger (or run `bun run check:ledger`) for its current state. A gate is `PASS` only
  when a linked receipt (a test file, a generated artifact, or a schema) actually
  exists; a label without evidence is a marketing label, so it is not used.

Everything below is described as work with a closing gate, never as a date. No dates
are promised, because most of the remaining gates depend on environments and reviewers
that are not yet available (see the next section). The internal work is tracked as
milestones **M0–M9**; this document groups that work by the deliverables a consumer
would care about.

### Fixed checklist entries that are outside the current capability scope

The release ledger is a fixed 1.0-target checklist, not a generated mirror of whatever
the current capability registry happens to contain. Four retained entries name proposed
surfaces that the present FigureRequestV1 contract deliberately does **not** provide:

- **R002** assumes `FigureBundleV1` is in the stable catalog, and **R070** assumes its
  panel, scale, output, and sidecar budget implementation;
- **R055** assumes a pure, immutable-release-tested NCP adapter; and
- **R091** assumes an experimental MCP surface with its own consent and security tests.

Those are unresolved historical/future target-scope requirements, not evidence that a
bundle, NCP adapter, or MCP capability exists. The current capability registry contains
none of them, and stable validation must continue to refuse rather than infer them.

The ledger is authoritative for each entry's current state. For a stable tag, however,
**`PASS` is the only closing state**: `NOT_RUN`, `NOT_APPLICABLE`, `BLOCKED`, and `FAIL`
all remain unmet. `NOT_APPLICABLE` with a rationale can honestly say that an entry does
not apply to today's implemented scope; it is not a waiver of a fixed release-blocking
requirement. Before 1.0, each scope conflict must therefore be resolved by either
implementing the named capability and recording its receipt, or by a reviewed contract
and governance change that removes or replaces the requirement itself. Merely changing
the gate's status cannot silently shrink the promised 1.0 scope.

## The one invariant the whole roadmap serves

Cortexel's load-bearing property is **fail-closed scientific honesty**: a caller
declares what its data *is*, never what Cortexel *concluded* about it
(`PROVENANCE_CALLER_ASSURANCE_FORBIDDEN`, enforced first, on the raw request). The
mandatory disclosure prefix is derived only from machine-checkable provenance flags,
and `calibrated_posterior:true` is rejected at every entry point, so there is currently
**no accepted spec that suppresses the caption**. See [SECURITY.md](./SECURITY.md).

The single most important consequence for this roadmap: **1.0 may not claim a scientific
result that Cortexel has not independently reproduced.** Today every skill contract's
`evidence.externalOracle.status` is `not_run`, and this roadmap treats closing that gap
as a release blocker rather than rounding a passing unit test up to "scientifically
verified."

## Two preconditions 1.0 cannot skip

These are not milestones with code deliverables; they are the reason 1.0 is not close.

1. **Reproducible reference environments.** No pinned NEST, Elephant, Neo, or PyNWB
   environment has been executed anywhere in this repository. The independent oracle
   (`reference/`) is scaffolded and is structurally forbidden from importing Cortexel,
   but it has not been run. Until those environments are installed, pinned, and
   executed, the external evidence layer for the scientific and adapter gates stays
   honestly `not_run`.

2. **Independent external review.** Cortexel has a **single maintainer, Sepehr
   Mahmoudian.** There is no review board, no staffed support rota, and no
   response-time SLA — and this document will not invent one. But a stable scientific
   contract should not be self-certified. 1.0 therefore *requires* at least one
   independent scientific reviewer and at least one external package consumer to have
   reviewed the release candidate (ledger gates **R132**, **R147**). That external
   review is a hard precondition that a single-maintainer project does not yet have,
   and stating the requirement honestly is the point: the bar is set now, before there
   is anyone to meet it.

---

## Milestone: Independent scientific oracle execution (NEST / Elephant)

**Status today.** `test/analysis.test.ts` executes selected **hand-computable vectors**:
the half-open bin convention, the population-rate formula and its recorded-sender
denominator, unit-correct rates, within-train ISI including trial separation and
coincident events, correlogram lag orientation and self-pair exclusion, multapse degree
counting, and the sparse-matrix "absent is not a measured zero" property. Those tests
are useful internal evidence. Gate **R031 remains `NOT_RUN`** because its release
requirement is an independent golden-vector suite covering every stable figure contract;
selected hand vectors do not satisfy that broader receipt.

**What remains.**

- Install and pin a reference environment and run the `reference/` oracle against it,
  so every stable contract is checked against an *independent* second computation
  (NEST / Elephant), not only against hand vectors generated by the same authors.
- Record, for every scientific reference comparison, the upstream version, the source
  command, the tolerance rationale, and the reviewer (gate **R048**) — a differential
  claim with no recorded environment is not evidence.
- Certify multi-rank NEST topology against a real multi-rank simulation. The MPI scope
  rules (`SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL`, `SCOPE_OUT_DEGREE_FROM_RANK_LOCAL`) are
  today validated only against hand vectors and the scope validator, not against an
  actual multi-rank run.

**Why it blocks 1.0.** This is the difference between "internally self-consistent" and
"independently confirmed." The external-oracle layer of the *Scientific semantics*
(R031–R048) and *Adapters and ecosystem* (R049–R059) ledger sections stays `not_run`
until a real environment executes, and gate **R150** — that no unresolved
scientific-semantic defect can produce a plausible but materially wrong figure — cannot
be signed without it.

## Milestone: Remaining per-family render compilers

**Status today.** `RenderPlanV1` (a framework-neutral, closed mark union with no
raw-SVG escape hatch), the deterministic safe SVG serializer, and `buildFigure` exist
and are tested. **All 19 stable families have end-to-end render paths** with mandatory
disclosures wired (`test/renderAllFamilies.test.ts`,
`test/disclosureCompleteness.test.ts`). That is internal implementation and regression
evidence; it does not certify every scientific derivation, SVG encoding, accessibility
presentation, or supported-platform byte-identity claim.

**What remains.**

- Split the family-based compilers toward the blueprint target of **one pure compiler
  per stable skill** with exhaustive generated dispatch (gate **R061**). The current
  tree uses one well-tested compiler per geometric family — more trustworthy than fifteen
  near-duplicates, but a different file layout. This is a layout refactor: it changes
  the file structure, never the output.
- Publication-tune the visual system: apply the versioned per-series palette tuples,
  perceptual colour maps for matrices, legends, uncertainty bands, and print/grayscale
  themes that `contract/registries/palettes.v1.json` already specifies.
- Extend the value-filled accessibility summary with the full per-skill detail its
  contract template describes (exact bin width, trial count, and so on). The generic
  summary, the exact-value **table**, and the **disclosures** are already complete.
- Replace nominal text metrics with a bundled metrics table so a very long tick label
  cannot overflow its gutter. Byte-determinism already holds regardless.

**Why it blocks 1.0.** The visual system is functional, not yet publication-grade, and
the compilers are family-based rather than one-per-skill. The *Rendering, output, budgets, and performance*
(R060–R073) and *Accessibility and visual communication* (R074–R085) ledger sections
close here, including `RENDER_UNSUPPORTED_SKILL` being provably unreachable for any
stable skill.

## Milestone: Independent Python validator

**Status today.** An independent, standard-library Python reader now strictly parses,
canonicalizes, hashes, structurally validates, and evaluates a named subset of semantic
rules without invoking Node or importing generated JavaScript. Generated registries in
`python/src/cortexel/generated` keep its vocabulary aligned with the TypeScript source;
the parser, canonicalizer, and partial semantic evaluator are separately implemented.
`validate_request` fails closed with `SEMANTIC_VALIDATOR_UNAVAILABLE` until a selected
skill's full validator set is ported, so this is a real but scientifically partial
second reader, not a full-validation certificate.

**What remains.**

- Complete the Python semantic-validator set for every stable skill while preserving
  the fail-closed full-validation boundary.
- Run the shared positive / negative / boundary / metamorphic / migration conformance
  corpus in **both** TypeScript and Python, from source and from packed artifacts
  (gates **R019**, **R111**), and pin a shared source digest across the generated
  TypeScript validators, Python models, manifest descriptors, and schemas (gate
  **R015**).
- Build and clean-install the Python wheel and sdist across the supported Python/OS
  matrix, retaining exact artifact and metadata receipts (gates **R104–R105**).

**Why it blocks 1.0.** A partial second reader and selected parity vectors do not prove
full cross-language acceptance parity. Every required decision needs independent
implementation coverage, the shared conformance corpus, and installable Python artifact
receipts before the Python gates can pass.

## Milestone: Adapters (NEST / Neo / NWB / NCP)

**Status today.** The narrow plain-data NEST spike-recorder adapter exists and admits a
revision-2 declaration profile for NEST 3.9/3.10 memory exports with
`time_in_steps: false`. It has not been executed against a real pinned NEST environment,
so that admitted profile is not an upstream certification. Other NEST recorder/
connection mappings and the Neo, Elephant, NWB, and NCP adapters are not implemented.

**What remains.**

- Execute the existing narrow spike-recorder adapter and implement/test the remaining
  NEST recorder and connection adapters against **real**, version-pinned NEST output:
  preserve source/target, synapse model/id, weight, delay, autapses,
  multapses, snapshot time, the declared node universe, and MPI scope, and never assume
  chronological recorder order (gates **R049–R051**).
- Implement the Neo, Elephant, and NWB adapters with their unit/timestamp/segment and
  object-path/identity semantics preserved (gates **R052–R054**).
- Publish a support matrix listing the exact tested upstream versions and status —
  supported, partial, experimental, or rejected — so a resolver installing something
  newer cannot silently widen the range (`ADAPTER_UNSUPPORTED_VERSION`, gate **R058**).
  Unsupported forms must fail explicitly (`ADAPTER_NEST_UNSUPPORTED_SHAPE`,
  `ADAPTER_MAPPING_REQUIRED`) rather than fall through to a generic array, and adapter
  output must pass the same strict request/artifact gate as direct input.
- Do not advertise an NCP adapter before one exists. If introduced, keep it
  **experimental**, pure, and read-only (no Zenoh, no network, no simulator control),
  and certify it only against an *immutable* NCP release — never against NCP's moving
  HEAD (gate **R055**). It stays out of the stable catalog, stable counts, and default
  discovery until implementation and certification both exist.

**Why it blocks 1.0.** An adapter profile never exercised against real upstream output
is an unverified implementation, not certified interoperability. The stable-vs-experimental boundary
(`capabilities.v1.json`) is only enforceable when each stable adapter has a tested
version matrix behind it.

## Milestone: Packaging rewire and untracking `dist/`

**Status today.** The build is now additive: it preserves the pre-1.0 root/core/React
paths and installs the new FigureRequest kernel, headless renderer, NEST adapter,
normative contract data, and offline CLI through capability-named paths. `dist/` remains
checked in because git-dependency consumers install without a build step. Packaged
availability is explicitly independent of publication and `releaseReady` evidence.

**What remains.**

- Retain the executable import-graph, export-map, conditional declarations, ESM/CJS,
  bin/shebang/import-guard, module-relative contract, digest-inventory, and exact-tarball
  smoke gates as the package evolves (gates **R099–R103**).
- Run those gates against the complete supported Node/OS matrix and retain the clean-room
  receipts; one local or development-CI pack smoke is not release certification.
- **Untrack the committed `dist/`** (or document an immutable reason to keep it) once
  the clean build and generated-freshness checks are enforced from a clean checkout
  (gate **R107**). Removing the legacy `core/` tree in the source-layout migration also
  resolves the one known flaky test (`test/coreIsHostAgnostic.test.ts`), which can time
  out under parallel load — a flaky test is treated as a defect, not tuned green.

**Why it blocks 1.0.** A released package must ship the code that is actually tested and
certified, from a reproducible build, without a committed build artifact drifting from
source. This milestone is what makes the *Packaging and runtime compatibility*
(R098–R109) section provable.

## Milestone: Tiered CI / nightly / release workflows

**Status today.** Development CI has separate contract, TypeScript/build, Python, and
package-smoke jobs. It is not a release-certification workflow: scheduled/nightly and
protected release workflows are absent, the supported release matrix is incomplete,
and the README's npm / PyPI / CI badges are inactive by design.

**What remains.**

- Restrict the Node engine policy to the tested majors (`^22 || ^24 || ^26`) and run CI
  against Node 22, 24, and 26 (gate **R098**).
- Configure the supply-chain gates: dependency review, lockfile integrity,
  vulnerability scanning, CodeQL, secret scanning, and pinned actions (gate **R094**);
  and least-privilege, protected-environment release jobs with **no long-lived registry
  token** (gate **R095**).
- Build the release pipeline that checks out the intended signed/tagged commit, verifies
  a clean tree, builds every artifact **once**, tests against those exact built
  artifacts, and publishes only through the protected workflow with npm/PyPI trusted
  publishing and provenance, GitHub artifact attestations, and an SBOM covering the
  JavaScript, Python, and optional/experimental dependency graphs (gates
  **R134–R140**). Post-publish verification then installs unauthenticated from the
  public registries and re-checks imports, CLI, schemas, digests, and attestations
  (gate **R145**).
- Replace the current rebuild-capable `prepublishOnly` lifecycle with a protected
  **pack-once, attest-once, publish-the-same-bytes** flow. The future workflow must build
  the npm tarball and Python wheel/sdist once from the reviewed checkout, freeze and
  digest those files, run every install/smoke/security check against those exact files,
  attach provenance/SBOM/attestations to those digests, and then publish those same
  already-tested files. Any package-manager hook retained at publication time may only
  verify the frozen inputs; if it would regenerate or rebuild content, publication must
  refuse because the tested and attested bytes would no longer be the bytes released.
  The present `prepublishOnly` chain remains a development fail-closed backstop, not the
  future release authority.

**Why it blocks 1.0.** The honesty guarantees are only as trustworthy as the pipeline
that ships them. A manually built or manually published artifact cannot carry the
provenance a 1.0 claims. Until this exists, the *Supply chain and release* section
stays `not_run` and no badge is activated.

## Milestone: Three-pass release certification

1.0 is authorized by three independent review passes, each signed with all findings
closed or explicitly non-blocking:

1. **Architecture / contract review (gate R146).** `NOT_RUN`. No signed review-pass
   receipt is recorded in the evidence ledger.
2. **Scientific / interoperability review (gate R147).** `NOT_RUN`. Depends on the
   oracle-execution and adapter milestones above and on the independent scientific
   reviewer named in the preconditions.
3. **Security / accessibility / release review (gate R148).** `NOT_RUN`. Depends on the
   threat model, fuzzing, accessibility conformance, and the release pipeline.

Beyond the three passes, authorization requires: no open P0/P1/P2 release issue; no
unresolved scientific-semantic defect that could yield a plausible-but-wrong figure
(**R150**); no parser/security defect permitting code execution, network access,
prototype effects, unbounded resource use, or disclosure suppression in stable paths
(**R151**); no flaky required check reran into green without root-cause (**R152**); RC
artifacts having completed a soak **and at least one external clean-room reproduction**
(**R153**); the maintainer explicitly signing the `RELEASE_AUTHORIZATION.md`
identity/digest list (**R154**); and the release being made **only** by the protected
workflow, never a manual local publish (**R155**).

**Why it blocks 1.0.** This is where "we believe it is correct" becomes "an independent
party reproduced it and signed." With a single maintainer and no external reviewer yet,
the certification passes that a stable scientific release requires are, honestly, not
yet runnable — and that is the true distance between the current tree and 1.0.

---

## How the milestones gate each other

- Oracle execution and the Python validator can proceed in parallel; both depend only on
  their environments, not on each other.
- The render compilers and the adapters are independent of the oracle in code, but
  their scientific certification (R147, R150) depends on the oracle having run.
- Packaging rewire depends on the `src/` tree being the intended build; it does not need
  every render compiler finished, but the eventual release build does.
- CI/nightly/release workflows depend on packaging being settled.
- Three-pass certification is last and depends on all of the above plus the two
  preconditions.

## Design constraints intended to survive to 1.0

The migration path and present invariants are documented so consumers can inspect and
pin an exact pre-1.0 commit. This is design intent, not a compatibility promise: any
`0.x` source or contract axis may still change before 1.0.

- **The honesty model.** Fail-closed provenance, the machine-derived mandatory
  disclosure, and the caller-assurance boundary are correctness properties, not features
  to be relaxed. Any change that let advisory or synthetic data render without its
  caption is a defect.
- **The current catalog shape.** 19 single-figure contracts. No `FigureBundleV1`,
  experimental 3D/knowledge-graph/animation skill, or NCP adapter is currently claimed;
  any future addition must arrive with executable source, an explicit availability
  value, and the applicable evidence rather than being inferred from roadmap prose or
  legacy package code.
- **Append-only, stable error codes.** Codes in `error-codes.v1.json` are append-only
  within contract 1.x: prose may improve, a code's meaning may not change, and a code is
  never reused.
- **Determinism and single-source-of-truth generation.** Canonicalization, digests, and
  the generated contract/manifest/Python mirror stay reproducible and derived, never
  hand-edited.

---

*Maintainer: Sepehr Mahmoudian. This repository is Cortexel's canonical, writable
source; downstream consumers pin released commits. Contributions toward any milestone
above are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).*
