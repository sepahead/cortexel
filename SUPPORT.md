# Support

Cortexel **0.9.0** is a **pre-1.0 development preview**. It makes no stable-contract
claim, `main` may break, and no package has been published to npm or PyPI. This
document explains where to get help, what the project can and cannot do for you, and
what to realistically expect from a single-maintainer preview.

Reading this first saves everyone time: most of what feels like a "bug" in a
scientific-figure contract is actually the contract refusing to make a claim it cannot
back — and that refusal is the feature, not the failure.

## Before you open anything

1. **Read the docs that already answer most questions.**
   - [`AGENTS.md`](./AGENTS.md) — the integration guide for an agent *building figures
     with* Cortexel.
   - [`CLAUDE.md`](./CLAUDE.md) — the guide for *working on* Cortexel itself.
   - [`docs/KNOWN_LIMITATIONS.md`](./docs/KNOWN_LIMITATIONS.md) — the honest list of
     what 0.9.0 does not yet do. If your problem is listed there, it is a known gap
     with a named release gate, not an undiagnosed bug.
   - [`contract/registries/capabilities.v1.json`](./contract/registries/capabilities.v1.json)
     — the authoritative stable / experimental / removed matrix. Check a capability's
     `status` before reporting that it "doesn't work like the stable ones": the 3D
     scene, the knowledge graph, animation replay, and the NCP adapter are
     **experimental** and are explicitly not covered by the determinism, accessibility,
     or compatibility promises.

2. **Reproduce the structured error first.** When a `VizSpec` or host-renderer
   invocation is rejected, Cortexel returns a machine-readable repair block
   (`formatInvocationErrors`) with a `hint`, a copyable `example`, and a `didYouMean`
   for mistyped ids, and every stable error code is enumerated in
   [`contract/registries/error-codes.v1.json`](./contract/registries/error-codes.v1.json).
   The exact code and the repair block resolve the large majority of "why won't it
   validate?" questions without a maintainer round-trip.

## Where to ask

| You have… | Use | Why |
|---|---|---|
| A usage question, a possible bug, or a feature idea | A **[GitHub issue](https://github.com/sepahead/cortexel/issues)** | Public issues are searchable, so the next person with the same question finds the answer instead of re-asking. |
| A suspected **security or honesty-integrity vulnerability** | **[GitHub private vulnerability reporting](https://github.com/sepahead/cortexel/security/advisories/new)** | Not a public issue — see [Security](#reporting-a-security-issue) below. |
| A change you want to contribute | A PR against `main`, per [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Cortexel is the canonical, writable source; downstream consumers pin published commits. |

When filing an issue, include the Cortexel version (`0.9.0`), the entrypoint you called
(`cortexel/core`, `cortexel/react/charts`, etc.), the skill or scene involved, a minimal
`VizSpec` or params payload, and the full structured error or stack trace. A payload the
maintainer can paste and re-run is worth more than a paragraph describing it.

## What maintenance support can do

- Triage and, where warranted, fix defects in the **contract and its invariants**:
  validation, routing, the fail-closed honesty model, resource/exact-JSON gates,
  strict params/provenance schemas, and manifest parity.
- Clarify the contract: what a skill's params mean, why an invocation was rejected,
  which capability status applies, and how to migrate off a removed skill.
- Review and merge contributions that keep the invariants airtight.
- Correct documentation that is wrong or misleading. Honest docs are load-bearing here.

## What maintenance support cannot do

These are not politeness disclaimers; each one is a direct consequence of what Cortexel
is and what evidence it currently carries.

- **It cannot validate your research conclusion.** Cortexel's honesty model is
  fail-closed and deliberately narrow: a caller declares what its data *is*
  (its source, units, recorder identity, node universe, snapshot scope, whether it is
  synthetic), and the contract checks that the declaration is internally consistent with
  the payload. It never certifies what the data *means*. The maintainer works the same
  way — no one can confirm through an issue thread that your spike train shows
  synchrony, that a weight distribution supports your hypothesis, or that a figure is
  publication-correct. A green validation means "this request is well-formed and
  honestly labeled," never "this scientific claim is true." The producer of the data
  remains responsible for its truthfulness.

- **It cannot vouch for a scientific result as independently confirmed.** No pinned
  reference environment has been executed anywhere in this repository: NEST, Elephant,
  Neo, and PyNWB are not installed or run, so every skill's
  `evidence.externalOracle.status` is `not_run` (see
  [`docs/KNOWN_LIMITATIONS.md`](./docs/KNOWN_LIMITATIONS.md) and
  [`docs/release/evidence-ledger.v1.json`](./docs/release/evidence-ledger.v1.json)).
  The hand-computable golden layer is executed and passing, and that is the current
  floor of evidence — not independent scientific verification. Do not treat any Cortexel
  output as cross-checked against a simulator oracle, because it has not been.

- **It cannot promise experimental capabilities behave like stable ones.** The 3D
  spatial scene, the knowledge graph, and animation replay are non-deterministic
  (GPU/driver- or layout-dependent), and the NCP adapter is `experimental` because no
  immutable NCP release has been certified. Issues about them are welcome, but they are
  outside the determinism, byte-stable-export, and accessibility guarantees that only
  stable capabilities carry.

- **It cannot debug your host, simulator, or agent runtime.** Cortexel is a
  host-agnostic contract layer. It does not own your `<Canvas>`, your NEST installation,
  your Python environment, or your agent framework. Questions about those belong to
  their projects; questions about the *boundary* between them and Cortexel belong here.

## Reporting a security issue

Report suspected vulnerabilities **privately** via GitHub's
[security advisories](https://github.com/sepahead/cortexel/security/advisories/new),
**not** through a public issue. Public disclosure before a fix exists gives the problem
to attackers before it gives it to users.

Cortexel's threat surface is real because it renders untrusted, agent-emitted payloads,
and its **fail-closed honesty model is itself a security property**: any change that lets
synthetic or advisory data render without its mandatory disclosure caption is treated as
a defect, not a cosmetic issue. See [`SECURITY.md`](./SECURITY.md) for the full scope,
the validation entrypoints that form the input boundary, and the reporting process.

## Response expectations

Cortexel is maintained by a **single person, Sepehr Mahmoudian**, on a best-effort
basis. Being honest about this is consistent with the rest of the project:

- **There is no service-level agreement and no guaranteed response time.** Issues and
  advisories are read and addressed as time allows. Security reports are prioritized over
  everything else.
- **There is no staffed support desk, no review board, and no on-call rotation.** A
  clear, reproducible report is the single biggest factor in whether something gets
  fixed quickly.
- **This is a pre-1.0 preview.** APIs may change, `main` may break, and a fix may land as
  part of the ongoing move toward a versioned 1.0 contract rather than as a patch to the
  current shape.

For stable scientific use, Cortexel's own stated intent is that a capability should not be
called stable until it is backed by an executed reference environment and independent
external review — neither of which the single maintainer can supply alone. That
requirement is a goal the project holds itself to, not a service it currently offers, and
it is the reason 0.9.0 is labeled a preview rather than a release.

## Commercial support

**None is offered.** There is no paid support, no consulting arrangement, and no
commercial tier. Do not read the best-effort maintenance above as an implied contract of
any kind. Cortexel is provided under the [MIT License](./LICENSE), "as is," without
warranty.
