# Cortexel security model (technical / threat model)

> **Status: `0.9.0` is the last tagged pre-1.0 release; this document tracks the
> private, unreleased `0.10.0-dev.0` source tree.** It describes the threat model and
> the technical controls that back it. Neither identity makes a stable-contract
> claim**: interfaces, limits, and even control boundaries may change before 1.0. No
> package is published to npm or PyPI, and no DOI has been minted, so the npm/PyPI/DOI
> badges are inactive by design.
>
> Author and sole maintainer: **Sepehr Mahmoudian**. There is no review board, no
> staffed security team, and no response-time SLA. Vulnerability handling is
> single-maintainer, best-effort, through the private channel in [SECURITY.md](../SECURITY.md).

This file complements the root [SECURITY.md](../SECURITY.md). SECURITY.md is the
**policy**: what is in scope, how to report, and the honesty invariant stated as a
rule. This file is the **model**: the assets, the trust boundaries, the attacker,
and — control by control — how each boundary is defended and what remains
unguarded. Where the two overlap, SECURITY.md is normative on policy and this
document is normative on mechanism.

The controls below live in the stable contract kernel and render path: primarily
`src/core/parse-json.ts`, `src/core/safe-snapshot.ts`, `src/core/request.ts`,
`src/core/limits.ts`, `src/render/svg.ts`, and `src/cli/main.ts`. Stable error codes
are enumerated in `contract/registries/error-codes.v1.json`; the
stable/experimental/removed matrix is `contract/registries/capabilities.v1.json`.

---

## 1. What Cortexel is, in security terms

Cortexel turns an **untrusted, machine-authored figure request** (plain JSON, often
emitted by an LLM agent) into a **checked figure artifact** — deterministic SVG, an
exact-value in-memory table, disclosures, and an artifact that currently binds the SVG
digest. The table has no canonical bound sidecar in the current development tree. The request is data
from an unauthenticated source. The output may be embedded in a web page, a paper, a
lab notebook, or a downstream pipeline, and a human or another model will trust it.

Two things follow from that shape, and they define the whole model:

1. **The input is hostile by default.** A request can be malformed, oversized,
   prototype-polluting, accessor-bearing, cyclic, or a live JavaScript object whose
   getters run code. None of it is authenticated. Every boundary assumes this.
2. **The output is an assertion of fact.** A figure that says "measured" when the
   data was synthetic, or that renders an empty coordinate system that looks like a
   measured zero, is a *scientific* integrity failure — and in this project that is
   treated as a security-class defect, not a cosmetic one.

The stable contract kernel does **no network, no caller-selected filesystem access,
no `eval`, no dynamic code loading, no clock, and no random state** during validation
and rendering. Structural validation reads the immutable JSON Schemas shipped beside
the installed module under `dist/contract`; it never searches `process.cwd()` or fetches
a schema URL. After that module-relative load, scientific validation and rendering are
pure functions from bytes to a checked artifact.

Repository tooling has a separate credential boundary. Bun normally loads `.env`
implicitly, including for nested package scripts; Cortexel's checked-in `bunfig.toml`
sets `env = false`, and a nested sentinel test enforces that runtime behavior. Bun's
package manager, Vite, and arbitrary dependencies may still inspect checkout files, so
neither this setting nor `.gitignore` is treated as filesystem isolation. Research and
developer credentials stay outside the repository and outside the build/test environment;
a narrowly scoped first-party client must read its external credential store explicitly.

---

## 2. Assets

The things worth protecting, ranked by what an attacker gains by subverting them:

| Asset | Why it matters |
|-------|----------------|
| **Scientific-honesty integrity** | The disclosure caption and provenance flags are the artifact's claim about *what the data is*. Suppressing, spoofing, or forging them is the highest-value attack: it produces a convincing figure that lies. |
| **Determinism & digests** | The SVG bytes are hashed and cross-referenced. If two callers can make "the same" figure hash two ways, or make different figures collide, reproducibility and any future signing/provenance chain break. |
| **The host process** | An agent backend embeds the kernel. A payload that exhausts memory/CPU, pollutes `Object.prototype`, or runs caller code during validation compromises the host, not just one figure. |
| **The consuming surface** | The SVG is rendered somewhere. If a hostile label can inject `<script>`, an `on*` handler, `<foreignObject>`, or an external URL, Cortexel becomes an XSS/SSRF vector for every downstream viewer. |
| **The caller's environment** | Diagnostics, artifact metadata, and CLI output must not leak secrets, filesystem paths, tokens, or large verbatim chunks of the offending input back to logs or other agents. |
| **Capability maturity and availability** | A metadata record must not turn absent code into a callable capability, and packaged legacy WebGL must not be mistaken for the separately packaged FigureRequestV1 path. Packaged, published, and `releaseReady` are independent facts; conflating them silently downgrades every guarantee a consumer relied on. |

---

## 3. Trust boundaries

A trust boundary is where data crosses from a less-trusted context into a
more-trusted one and must be checked. Cortexel has these, in the order data
traverses them:

1. **Raw JSON text → parsed value** (`src/core/parse-json.ts`). The strongest and
   most-preferred entry. It sees the *text*, so it can certify facts that are
   unrecoverable later (notably, that no object member appeared twice).
2. **Materialized JS value → safe snapshot** (`src/core/safe-snapshot.ts`). When a
   caller passes an already-parsed JavaScript object instead of text. This boundary
   is *deliberately weaker* and reports the weaker assurance
   (`duplicateKeys: "not_observable_after_materialization"`) rather than implying a
   check it cannot perform.
3. **Snapshot → structural schema → semantics → canonical request**
   (`src/core/request.ts`). Ajv 2020 strict schema, then named semantic validators,
   then conservative canonicalization. Identity resolution first refuses a mismatched
   optional skill pin; every success stamps the resolved installed revision into the
   detached `canonicalRequest.skill.revision`. Emits a **branded** `ValidatedRequest`
   that rendering will later *require*; a look-alike object cannot be rendered.
4. **Contract identity & digests** (`src/core/canonicalize.ts`, `sha256.ts`). RFC
   8785 canonicalization and a dependency-free SHA-256 root every cross-language and
   cross-artifact digest. A pinned `contractDigest` may only *narrow* what a caller
   accepts, never assert a digest the build does not have.
5. **Validated request + compiler plan → closed plan authority**
   (`src/render/plan-closure.ts`, `output-authority-gate.ts`). A compiler-only boundary
   detaches and deeply freezes the plan. The gate internally resolves a request-only
   evaluator and compares exact table rows, summary, disclosures, and the ordered
   class/provenance sequence of role-tagged carriers. It is carrier-only, synchronous,
   and non-persisted; see [`OUTPUT_AUTHORITY.md`](./OUTPUT_AUTHORITY.md).
6. **Closed render plan → SVG output plus in-memory table** (`src/render/svg.ts`,
   `buildFigure.ts`). The serializer is the boundary between validated data and a
   document that will be rendered by an untrusted-to-Cortexel viewer. No canonical CSV
   or detached table sidecar is emitted. OutputAuthority does not verify this serialized
   boundary.
7. **Adapters** (`src/adapters/*`). Simulator output (for example a NEST recorder
   object) crosses into the request contract. The NEST entry is packaged and
   semantically stable but not release-certified. No NCP adapter implementation or
   capability exists.
8. **The packaged offline CLI** (`src/cli/main.ts`, installed as `cortexel`). Files, stdin, and the process
   filesystem. It bounds bytes before fatal UTF-8 decoding, uses one fixed cooperative
   lock in the resolved physical output directory, inspects final entries without
   following symlinks, stages complete payloads in short, unique, exclusively-created
   temporary siblings, and uses atomic hard-link no-replace publication for non-force
   writes (refusing filesystems without that primitive). The directory-wide lock covers
   case/Unicode filename aliases and is never guessed stale. Force mode removes the old
   artifact marker before replacing the SVG; canonical artifact JSON is installed last
   as the completion marker. This is not a two-file transaction, and the host must
   provide a trusted output directory. Closed arguments and exit codes; no network.
   Importing either built module is guarded and does not execute the dispatcher.
9. **Legacy WebGL and host resolvers.** The packaged pre-1.0 React/WebGL API is outside
   FigureRequestV1. No new-contract experimental 3D, animation, NCP, resolver, or MCP
   capability currently exists. A `DataRef` is resolved to verified bytes **by the
   host, not by Cortexel** — stable core performs no I/O of its own
   (`DATA_REFERENCE_UNRESOLVED`).

**Out of scope of the kernel, and explicitly the host's responsibility:** actually
displaying the mandatory caption; resolving `DataRef` bytes and verifying their
digest before handing them in; loading any external asset an injected 3D scene
chooses; running WebGL; and mirroring these gates server-side as defense-in-depth.

---

## 4. Attacker capabilities

The model assumes an attacker who can:

- Emit **arbitrary bytes** as a figure request, including non-JSON, oversized,
  deeply nested, or adversarially structured JSON.
- Emit a request that **passes schema validation** but carries hostile *content*:
  bidi/control characters in labels and notes, prototype-polluting member names,
  duplicate members, or numbers engineered to break formatting or scales.
- Pass a **live JavaScript object** (not text) whose properties are getters, whose
  `toJSON`/`valueOf`/`Symbol.toPrimitive` return different shapes on each call, or
  which is a `Proxy` whose traps throw.
- **Lie about provenance** — declare synthetic data as measured, claim a rank-local
  snapshot is a global network, or attach a free-text caption designed to read as an
  official conclusion.
- Get the output **rendered in a victim's browser** or ingested by another agent,
  and try to make it execute script, fetch an external URL, or spoof a UI.

The attacker is assumed **not** to control the host process, the Cortexel build
itself, or the transport. Supply-chain integrity of the installed package, and the
host's own server-side mirroring of these gates, are the host's trust assumptions,
not Cortexel's guarantees.

---

## 5. STRIDE analysis

### Spoofing — passing false data off as true

The signature threat. A caller **declares what its data IS; it never declares what
Cortexel concluded about it.** That asymmetry is enforced, not merely documented.

- **Caller-authored conclusions are rejected first.** Validation-result status,
  reference-comparison outcome, accessibility conformance, completeness, output
  digests, and disclosure text are library-generated facts. Any attempt to set one
  is rejected with `PROVENANCE_CALLER_ASSURANCE_FORBIDDEN`, and the check runs
  **before** identity and schema (`src/core/request.ts`, stage 2, on the raw
  request) so it cannot hide behind a schema error or be smuggled in through a
  default.
- **The disclosure is derived, not supplied.** The mandatory schematic/advisory
  prefix is computed only from machine-checkable provenance flags. A caller's
  free-text note is only ever *appended* as an attributed **"Caller note
  (unverified)"** and can never replace, reorder, or suppress the prefix.
- **`calibrated_posterior: true` is unsupported at every entry point.** The pipeline
  ranks candidates; it does not perform calibrated Bayesian inference. Because that
  flag is rejected everywhere, there is currently no accepted request that suppresses
  the caption.
- **Scope cannot be inflated.** A rank-local or sampled snapshot cannot make a global
  completeness claim (`SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL`), and an out-degree
  distribution cannot be computed from a target-rank-local snapshot
  (`SCOPE_OUT_DEGREE_FROM_RANK_LOCAL`).
- **Visual spoofing of text is blocked.** Control, bidi-override, and zero-width
  characters in a caller note are rejected (`PROVENANCE_NOTE_UNSAFE_DISPLAY`),
  because those characters can make a caption or an axis label render as something
  other than what it says. The raw-JSON parser likewise forbids raw control
  characters inside strings.

**What spoofing controls do *not* do:** they cannot establish factual truth. If a
caller declares `synthetic: false` about data that is in fact fabricated, the schema
and semantics have no way to know. The mitigation for that residual risk is external
scientific review (§7), not a runtime gate.

### Tampering — altering data or output undetectably

- **Duplicate object members are rejected before materialization.** `JSON.parse`
  silently keeps one value for `{"a":1,"a":2}` and discards the other; which one is
  unspecified, so the document has no single meaning. The hand-written
  recursive-descent parser (`src/core/parse-json.ts`) tracks member names as it
  scans and fails with `JSON_DUPLICATE_KEY`. This is only possible on the text
  boundary; the materialized-value boundary honestly reports it cannot check this.
- **Prototype pollution is refused at every depth.** Member names `__proto__`,
  `constructor`, and `prototype` are rejected (`JSON_DANGEROUS_KEY` /
  `SNAPSHOT_DANGEROUS_KEY`), and parsed/snapshotted objects are built with a **null
  prototype**, so even a future bug in the key check cannot become a prototype write.
- **Time-of-check/time-of-use is closed.** `snapshotValue` returns a fresh, detached,
  null-prototype copy. Nothing the caller does to the original afterwards can change
  what Cortexel validated.
- **Output is deterministic to the byte.** The SVG serializer uses no clock, no
  random id, no locale, and no generator timestamp; element ids derive from the
  canonical request digest and deterministic local ids; attribute order is fixed; `-0` normalizes to
  `0`. Two identical figures hash identically, and a tampered figure hashes
  differently.

### Repudiation — "that isn't the figure I validated"

- **Content-addressed identity.** RFC 8785 canonicalization plus a SHA-256 request
  digest, an artifact digest over the logical artifact (which includes the SVG output
  digest), a `contractDigest` over the
  normative source set, and a `catalogDigest` over the stable catalog let any party
  re-derive and confirm exactly what was validated and drawn. A local build reports
  `sourceRevision: "unreleased-worktree"` and `release: false` rather than guessing a
  release commit.
- **Immutable evidence.** The knowledge-graph contract binds an immutable snapshot
  id, source, scope, and RFC-3339 generation time into the artifact so a stored
  figure is unambiguous about the graph state it depicts. The release evidence ledger
  (`docs/release/evidence-ledger.v1.json`) records what was actually executed; a gate
  is `PASS` only with a reproducible receipt.

### Information disclosure — leaking through diagnostics or metadata

- **Diagnostics never echo untrusted content.** Per the error-code policy, a
  diagnostic's `actualSummary` is a bounded *type/length category*, never the raw
  offending token, a secret, a filesystem path, or a large array. At most 32 error
  records are returned; overflow appends a single `ERROR_LIMIT_REACHED` with the
  omitted count so nothing is hidden while nothing is dumped.
- **Repairs are structured data, not prose.** A `repair` is
  `{operation, path, value?, reasonCode}` and is marked untrusted; it is never
  free-form instruction-shaped text that a downstream model could be steered by, and
  it is never auto-applied.
- **The SVG metadata block is public identities only.** It carries the contract id,
  the skill id, and the canonical request digest — no raw source data, no local path,
  no token, no prompt (`src/render/svg.ts`). The artifact digest cannot appear in the
  SVG because the artifact itself binds the SVG digest; doing both would create a
  digest cycle.
- **The CLI leaks no paths into the artifact.** Filesystem errors are reported to
  stderr; the artifact and SVG contain only the checked figure.

### Denial of service — making the process do too much

- **Byte length is checked first, before a single character is parsed.** Checking the
  size of a parse tree you already built is checking too late
  (`JSON_BYTES_EXCEEDED`).
- **Limits bite *during* scanning, not after.** Depth, total nodes, array length,
  object member count, string length, and numeric-token length are all enforced while
  the scanner advances (`JSON_DEPTH_EXCEEDED`, `JSON_TOKENS_EXCEEDED`,
  `JSON_ARRAY_TOO_LONG`, `JSON_TOO_MANY_KEYS`, `JSON_STRING_TOO_LONG`,
  `JSON_NUMBER_TOKEN_TOO_LONG`), so a hostile document is abandoned early rather than
  materialized and then measured. The snapshot boundary enforces the same ceilings.
- **A throwing `Proxy` cannot spin the snapshotter.** Every reflective operation is
  wrapped; a trap that throws collapses to `SNAPSHOT_HOSTILE_REFLECTION` and the value
  is abandoned — the thrown value is *not* re-inspected, because inspecting it would be
  a second chance to run caller code.
- **Quadratic work is refused, not attempted.** A pairwise computation such as a
  correlogram that would exceed its cost bound fails
  (`RESOURCE_PAIRWISE_EXCEEDED`); matrix cell counts, observation counts, visible-mark
  counts, and output/sidecar byte budgets are all bounded
  (`RESOURCE_MATRIX_CELLS_EXCEEDED`, `RESOURCE_OBSERVATIONS_EXCEEDED`,
  `RESOURCE_MARKS_EXCEEDED`, `RESOURCE_OUTPUT_BYTES_EXCEEDED`).
- **Limits are a floor an attacker cannot raise.** `restrictLimits` only ever takes
  `min()`; a caller can lower a bound but never widen one. A host that genuinely needs
  a larger ceiling must construct a separately named internal profile after an
  explicit risk review, and any artifact it produces records that non-standard profile
  and cannot claim default conformance (`src/core/limits.ts`).
- Hard limits are distinguished from display budgets: a hard limit **fails**; a
  display budget may be compacted only by a named, recorded, disclosed policy.
  Cortexel never silently truncates a dataset and calls the result a figure.

### Elevation of privilege — turning data into code or reach

- **The SVG serializer is a closed-vocabulary writer, not string interpolation**
  (`src/render/svg.ts`). It emits only a fixed set of elements and attributes; XML
  text and attribute values are escaped independently. There is **no path** by which a
  caller-supplied title, unit, label, or note can introduce a `<script>`, an `on*`
  event handler, a `<foreignObject>`, or an external URL — those are simply not
  elements the writer can emit. A hostile label becomes escaped text and nothing more.
  This is what keeps Cortexel from being an XSS/SSRF vector for every downstream
  viewer.
- **No network, caller-selected schema path, `eval`, or dynamic load in stable core.**
  The validator opens only its module-relative packaged contract copy; it does not use
  cwd, a URL, or caller path input. The CLI is
  offline by construction — there is no `--url`, no implicit HTTP, and no shell hook —
  because a scientific validator that can be turned into an ETL tool is a validator
  with an attack surface (`src/cli/main.ts`). A `DataRef` is resolved to verified
  bytes by the host *before* Cortexel is invoked; stable core performs no other I/O.
- **The packaged CLI bounds and strictly decodes input, then serializes cooperative
  publication in each resolved physical output directory.** File and stdin reads stop
  at the configured raw-byte limit plus one; fatal UTF-8 decoding preserves malformed
  encoding as an error, while the parser separately rejects a BOM and duplicate members.
  A fixed `.cortexel.figure-emission.lock`, acquired with `O_EXCL` before preflight and
  held through publication fsyncs, makes byte-distinct case/Unicode aliases converge on
  one authority. Cortexel never guesses that an existing lock is stale. It inspects final
  directory entries with `lstat`, so a dangling symlink counts as occupied, and hard-links
  each short, unpredictable, exclusively-created staged sibling into place without
  replacing an entry created by a concurrent writer. If that primitive is unavailable,
  it refuses rather than falling back to a clobber-prone rename. In force mode it removes
  the old artifact completion marker before replacing the SVG and installs the new
  canonical artifact JSON last. Uninstalled temporaries are cleaned best-effort. This is not a
  transaction across the SVG and artifact: a failure after SVG publication can leave an
  SVG with no artifact marker. It also cannot establish output authority against another
  principal who may unlink or rename entries in the caller-selected directory. The CLI
  emits no canonical data sidecar. Whole-emission
  atomicity, trusted output-directory authority, and detached verification remain open
  release gates.
- **Unavailable capabilities cannot leak into the stable surface.** The new-contract
  registry contains no 3D, knowledge-graph, animation, NCP-adapter, or bundle skill.
  Their legacy ids have null-target or blocking migration outcomes, so stable validation
  fails closed instead of inventing an `experimental.*` replacement. The separately
  packaged legacy `cortexel/react/knowledge-graph` export is explicitly experimental
  and nondeterministic; it is not a FigureRequestV1 skill or a byte-stable output path.
- **Closed schemas.** Stable request schemas reject unknown properties
  (`SCHEMA_UNKNOWN_PROPERTY`) and perform no type coercion, so a typo in a scientific
  field fails rather than being silently ignored, and a request cannot smuggle an
  unmodeled field past the gate.
- **Public rendering cannot accept a raw plan.** `parseAndValidateRequest` /
  `validateRequestValue` mint a deeply frozen `ValidatedRequest` whose identity is held
  in a module-private registry. Every packaged ESM and CommonJS entry routes to the same
  package-private CommonJS module-cache instance, so the registry is shared across all
  four producer/renderer format pairings without a forgeable `Symbol.for` or global.
  The package export map is API encapsulation, not a sandbox against code already
  executing in the host process; the physical shared module therefore exports only the
  same validating functions as `cortexel/figure`, never registry membership mutation.
  `buildFigureFromValidated` checks that identity before reading any property; the other
  public builders validate their input first. Raw plan
  construction, resource accounting, formatting/scaling primitives, and SVG serialization
  remain internal to the package, so a plain object that merely looks validated or planned
  cannot reach a supported public renderer.

---

## 6. Control-to-boundary map

A compact index of the mechanisms above against the boundaries they defend.

| Boundary | Primary controls | Representative codes |
|----------|------------------|----------------------|
| Raw JSON text | duplicate-member rejection, prototype-key rejection, null-prototype objects, byte-first + in-scan limits, control-char & lone-surrogate rejection | `JSON_DUPLICATE_KEY`, `JSON_DANGEROUS_KEY`, `JSON_BYTES_EXCEEDED`, `JSON_DEPTH_EXCEEDED`, `JSON_INVALID_UNICODE` |
| Materialized JS value | descriptor-only inspection (no getter/`toJSON`/`Symbol.toPrimitive`), throwing-Proxy safety, sparse/decorated/cyclic rejection, detached copy, honest weaker assurance | `SNAPSHOT_ACCESSOR_PROPERTY`, `SNAPSHOT_HOSTILE_REFLECTION`, `SNAPSHOT_NON_PLAIN_OBJECT`, `SNAPSHOT_SPARSE_ARRAY`, `SNAPSHOT_CIRCULAR_REFERENCE` |
| Structure / semantics / canonical | caller-authority precheck, closed schemas, no coercion, branded output | `PROVENANCE_CALLER_ASSURANCE_FORBIDDEN`, `SCHEMA_UNKNOWN_PROPERTY`, `SCHEMA_TYPE_MISMATCH` |
| Provenance / honesty | derived-only disclosure, `calibrated_posterior` rejection, scope integrity, bidi/control note rejection | `PROVENANCE_NOTE_UNSAFE_DISPLAY`, `SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL`, `SCOPE_OUT_DEGREE_FROM_RANK_LOCAL` |
| Budgets | fail-not-truncate, min-only limits, quadratic refusal, bounded diagnostics | `RESOURCE_PAIRWISE_EXCEEDED`, `RESOURCE_MARKS_EXCEEDED`, `ERROR_LIMIT_REACHED` |
| Frozen-plan OutputAuthority | live validated-request + closed-plan capabilities; closed independent evaluator registry; exact rows, one-pass source summary, disclosures, and carrier class/provenance sequence; evaluator/environment fact separation; no SVG/persisted claim | internal refusal (`INTERNAL_INVARIANT_VIOLATED`) |
| SVG / in-memory table output | closed-vocabulary SVG serializer, independent text/attribute escaping, public-only metadata, complete-returned-or-refuse table boundary; artifact binds table shape only | (structural — no injectable element exists) |
| Adapters | accessor-free typed input, no scalar broadcast, explicit packaged availability independent of revision-admitted source-version declarations; no claimed upstream certification or NCP implementation | `ADAPTER_ACCESSOR_INPUT_REJECTED`, `ADAPTER_UNSUPPORTED_VERSION` |
| Packaged CLI | offline; exact shebang and direct-execution guard; closed arguments; byte-bounded fatal UTF-8 input; one non-reclaimed directory-wide O_EXCL publication lock; lstat-safe final-entry checks; short O_EXCL temporary siblings; atomic non-force no-replace or refusal; force removes stale artifact first; artifact-last completion marker; file/parent fsync where supported; bounded path-free diagnostics; no whole-emission atomicity or trusted output-directory authority | (I/O exit code 7) |
| Legacy WebGL / future host resolvers | separated from FigureRequestV1; mandatory availability evidence; host-owned I/O; legacy KG nondeterminism disclosed | `CAPABILITY_EXPERIMENTAL`, `DATA_REFERENCE_UNRESOLVED` |

---

## 7. Residual risks and the gates that close them

Honesty about what is *not* yet guaranteed is itself a control. Each item names the
residual risk and the gate — a shipped mechanism, or planned work tracked in the
release ledger — that bounds or will close it.

- **Truthfulness of declarations is unverifiable at runtime.** No schema can know
  whether `synthetic: false` is true. **Gate:** independent scientific review. Today
  this is *not run*: no pinned reference environment (NEST, Elephant, Neo, PyNWB) has
  been executed anywhere in this repository, every skill's external-oracle status is
  `not_run`, and the corresponding ledger gates are `NOT_RUN`
  (`docs/KNOWN_LIMITATIONS.md`). The hand-computable golden layer *is* executed and
  passing, and is the floor of evidence — not the whole of it. **The intended
  requirement for stable (1.x) scientific claims is external, independent
  confirmation; until an oracle actually runs, no figure's numbers are claimed to be
  independently verified.** Nothing in this document should be read as such a claim.

- **The materialized-value boundary cannot detect duplicate members.** Once
  `JSON.parse` has run, one duplicate has already silently won. **Gate:** the boundary
  reports `duplicateKeys: "not_observable_after_materialization"`, and the raw-text
  entry (`parseAndValidateRequest`, or `cortexel validate`) is the one that certifies
  `rejected_before_materialization`. Prefer the text boundary at any network edge.

- **The independent Python reader remains partial.** It has an independent strict
  parser, canonicalizer, structural validator, and selected portable semantic evaluators,
  including adversarial cross-language vectors. It intentionally returns
  `SEMANTIC_VALIDATOR_UNAVAILABLE` where a skill's complete semantic rule set has not
  been implemented; it does not turn partial parity into a success claim. **Gate:** the
  remaining cross-language coverage tracked in the ledger (R019/R022 Python side,
  R071–R076).

- **Text metrics are nominal.** Layout uses fixed margins and a generic font stack
  rather than a bundled metrics table, so a very long tick label could overflow its
  gutter. This is a legibility defect, not an injection one — byte-determinism and
  escaping hold regardless. **Gate:** the layout/metrics work in the ledger
  (R083–R085).

- **Legacy WebGL carries no FigureRequestV1 security guarantee.** GPU output is
  nondeterministic, and the packaged legacy knowledge-graph force layout is schematic.
  No current-contract 3D, animation, NCP, resolver, or MCP capability exists; a future
  record must prove concrete availability before it can be callable. **Gate:** the
  package/source availability checker, stable-entry rejection, host-owned I/O, and the
  explicit legacy-export limitations in `contract/registries/capabilities.v1.json`.

- **Host obligations are outside Cortexel's control.** Cortexel returns the mandatory
  caption but the host must *display* it; the host must resolve and digest-verify any
  `DataRef` before invoking Cortexel; the host owns any external asset an injected
  scene loads; and a host accepting requests over a network boundary should mirror
  these gates server-side as defense-in-depth. A host that skips these re-opens risks
  the kernel closed on its own surface.

- **Single-maintainer response.** There is no staffed security rotation and no
  response-time SLA. Reports are handled best-effort by the maintainer through the
  private advisory channel. **Gate:** the disclosure process in
  [SECURITY.md](../SECURITY.md); the automated invariant guards in the test suite are
  what continuously defend the honesty and injection boundaries between human reviews.

---

## 8. Reporting

Report suspected vulnerabilities privately, per [SECURITY.md](../SECURITY.md) — not
in a public issue. A change that lets synthetic or advisory data render without its
disclosure caption, that returns a caller caption verbatim as the mandatory
disclosure, that lets a flag suppress the prefix, or that lets a hostile label reach
the output as anything other than escaped text, is treated as a security defect and
must ship with a regression test.

---

*Cortexel `0.10.0-dev.0` source tree; `0.9.0` is the last tag. © Sepehr Mahmoudian. MIT licensed.
This document describes intended and implemented controls at the current
development state; it is not a certification, an audit, or a warranty.*
