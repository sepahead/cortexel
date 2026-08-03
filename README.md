<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img alt="Cortexel logo" src="assets/logo-light.svg" width="200">
  </picture>
</p>

# Cortexel

<!-- CI badge activates once the tiered workflow is in place; see ROADMAP.md -->
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](#)
<!-- npm and PyPI badges are intentionally inactive: no package is published yet. -->

> **Status: `0.9.0` is the last tagged pre-1.0 development release. This working tree
> identifies itself as the private, unreleased `0.10.0-dev.0`; it is not a release. There
> is no stable release, published package, or DOI.** `main` may still change. Do not cite
> HEAD or the development version as a released product.
>
> The honest, gate-by-gate state of the release is in
> [`docs/KNOWN_LIMITATIONS.md`](./docs/KNOWN_LIMITATIONS.md) and the machine-readable
> [`docs/release/evidence-ledger.v1.json`](./docs/release/evidence-ledger.v1.json). A
> gate is only `PASS` when it carries a reproducible receipt.

**Cortexel** turns a strict request into a canonical, inspectable **figure artifact**
for neural-simulation data. An agent, an adapter, or a person emits a declarative
JSON request; Cortexel validates its shape and its *scientific meaning*, canonicalizes
it, records honest provenance that **fails closed**, and renders deterministic SVG with
distinct programmatic title and description references. The development API also
returns an exact-value in-memory table and a FigureArtifactV1 whose output inventory
binds the SVG by SHA-256. A canonical,
digest-bound table sidecar and detached output verifier are not implemented yet; the
render boundary refuses any result that would require an incomplete table excerpt.

The value is in the **contract and its invariants**, not in a pile of chart code.
Cortexel refuses to make a plausible-looking figure from an ambiguous input, and every
output it does make can be inspected, compared, and challenged. Current development
artifacts report `sourceRevision: "unreleased-worktree"`; exact commit recovery requires
a separately retained full SHA until a release-stamping producer exists.

## What it is — and is not

Cortexel is a **closed, versioned catalog of scientifically constrained figure
contracts**. It is deliberately *not* a general visualization grammar, a notebook
environment, a storage format, or a simulator. See [`docs/SCOPE.md`](./docs/SCOPE.md)
for the normative boundary.

The defining rule: **a caller declares what its data *is*; it never declares what
Cortexel concluded about it.** Validation results, disclosures, digests, and
calibration claims are library-generated facts — a request that tries to set one is
rejected, not obeyed. See [`docs/PROVENANCE.md`](./docs/PROVENANCE.md).

## The pipeline

```text
raw JSON text  ──▶  strict parse (rejects duplicate keys before materialization)
               ──▶  caller-authority check (no forged conclusions)
               ──▶  contract identity
               ──▶  structural validation (JSON Schema 2020-12, no coercion)
               ──▶  semantic validation (closed, named scientific rules)
               ──▶  canonicalize (RFC 8785)  ──▶  branded validated request
               ──▶  derive (deterministic analysis)
               ──▶  compile pure render plan
               ──▶  close/freeze plan + OutputAuthority translation gate
               ──▶  deterministic SVG + complete returned exact-value table
               ──▶  FigureArtifactV1 (binds SVG bytes and table shape, not table cells)
```

Every stage is independently testable. Each public rendering entrypoint either validates
its input itself or accepts only the live branded token the validator produces. The raw
RenderPlan model, resource counter, formatter/scale primitives, and SVG serializer are
internal and are not exported from `cortexel/render-svg`. The internal OutputAuthority
gate independently checks exact plan table rows, source-template summary, disclosures,
and role-tagged carrier identities immediately before serialization. It is deliberately
plan-level, non-persisted, and carrier-only; it does not establish SVG bytes, coordinates,
visibility, accessibility effectiveness, or artifact-bound table cells. See
[`docs/OUTPUT_AUTHORITY.md`](./docs/OUTPUT_AUTHORITY.md).

## Additive package surfaces

The installable artifact preserves every legacy entry (`cortexel`, `cortexel/core`,
the three React subpaths, and `cortexel/skills.manifest.json`) and adds explicit
FigureRequestV1 capabilities alongside them:

- `cortexel/figure` — validation, canonicalization, identity, provenance, and migration;
- `cortexel/authoring` — exact stable discovery metadata, complete offline structural
  schemas, their versioned digest-bound Ajv compile profile, and one synthetic
  full-pipeline-valid fixture per skill;
- `cortexel/render-svg` — deterministic headless SVG + complete returned table;
- `cortexel/adapters/nest` — currently one narrow plain-data NEST 3.10.0
  memory-spike-recorder adapter. Executable revision 5 has closed `finiteStop` and
  `positiveInfinityCaptureBounded` branches, preserving `(origin+start,origin+stop]`
  and caller-declared `(origin+start,capture]` respectively. Both require an exact
  time-build profile, source-faithful integer-tic projection, retained capture history,
  and single-process scope. Strict validation resolves their output against the
  installed contract revision. This is not a live PyNEST bridge, broad NEST coverage,
  or upstream certification;
- `cortexel/knowledge-graph` — experimental, peer-free bounded graph preparation,
  strict corpus-VizSpec binding, exact-source view filtering, and canonical record
  serialization. It is not a renderer, evidence resolver, or stable FigureRequestV1
  skill;
- `cortexel/contract/manifest.json` and `cortexel/contract/*` — the exact normative
  registries, schemas, and skill sources copied once under `dist/contract`;
- `cortexel` (bin) — the offline CLI.

These paths load no React, Three, R3F, or D3. Structural validation reads only the
module-relative packaged contract files; it never resolves a schema from the working
directory or network. **Packaged** describes the output of this repository's build and
tarball. It does not mean the package has been published, and it does not make any
skill `releaseReady`; all nineteen remain `releaseReady: false`.

The stable skill catalog reports source interoperability as composite mappings.
`feasibilityStatus` records only a bounded assessment,
`definitionStatus` distinguishes a feasible but non-normative profile from an
inapplicable one, and
`implementationAvailability` says whether Cortexel ships executable code. Each
executable mapping names one immutable `certificationRequirement`; mutable gate
status, evidence, and receipts remain solely in the release ledger and are never
copied into package semantics. A `sourceId` names a stable mapping role/profile,
not a runtime object instance; role-distinct sources may share one `system` class.
Executable code also does not imply that a separate normative source-to-request
mapping definition exists: the packaged raster adapter remains
`definitionStatus: not_specified`. Contract source v1 deliberately cannot encode
`specified`, and fixes `authorityRequirements` to `null`, because Cortexel does not
yet ship a closed mapping-definition authority. Prose, pointers, code, schemas and
release gates cannot be combined to counterfeit one.
For `not_assessed` mappings, the named sources are only a provisional candidate
roster; neither completeness nor sufficiency has been established.
The only packaged FigureRequestV1 NEST mapping is the bounded plain-data
`nest.spike_recorder` → `neuro.spike_raster` shape profile for a caller-declared
exact NEST 3.10.0 memory export. Stable skill revision 6 and renderer revision 7 use
one executable adapter revision 5 with two noninterchangeable branch records.
`finiteStop` uses projection v1 and capture-authority profile v3;
`positiveInfinityCaptureBounded` uses projection v2 and capture-authority profile v4.
The latter admits NEST's positive-infinity stop only as
`{ "kind": "nest_time_positive_infinity" }`; raw numeric `DBL_MAX` is rejected rather
than guessed to be infinity. It binds a finite `captureTime`
to the exact biological time immediately after a successful *advancing* `Simulate`
or `Run` return and before any further advance or mutation, and preserves only
`(origin+start,capture]`. Capture is not recorder deactivation and establishes nothing
after capture. Both branches use the revision-5 digest domain and require the declared
LP64/int64/binary64 time-build profile plus NEST's stored-reciprocal time projection.
The adapter digest-binds the detached plain-data projection and normalized options; it
does not authenticate the projection, producing runtime or build, active floating-point
environment, kernel clock, recorder wiring, sender-universe completeness, capture timing,
or export custody. Neither JavaScript nor the current Python package starts PyNEST.
Historical adapter v3 and capture-authority v1/v2 inputs are migration identities only.
The pinned
[NEST 3.10 visualization-demand audit](./docs/audit/NEST-EXAMPLE-VISUALIZATION-COVERAGE-V3.md)
classifies all official example bodies and makes the remaining representability,
composition, adapter, execution, parity, and certification gaps explicit; it is not a
claim that those examples are currently supported.

## Offline CLI

The unreleased development package must be installed from a reviewed full Git commit
or a locally reviewed tarball, never from a floating branch. Its engine range is Node
22, 24, or 26; that declared range is not evidence that the still-open release matrix
has passed. Inside an npm project, replace the placeholder with exactly 40 hexadecimal
commit characters and invoke that installation's CLI module directly—without global,
registry-fallback, or `npm exec` selection:

```bash
CORTEXEL_COMMIT=REPLACE_WITH_40_HEX_REVIEWED_COMMIT_SHA
npm install --save-exact "github:sepahead/cortexel#$CORTEXEL_COMMIT"
node ./node_modules/cortexel/dist/cli/main.js identity --json
```

The examples below use bare `cortexel` for readability. In an agent harness, bind that
name to the reviewed local module path above (or to a host-owned package script); do not
let a missing local package trigger registry or cache selection. From a repository
checkout, `bun src/cli/main.ts ...` exercises the same implementation:

```bash
# What contract and identity is this build?
cortexel identity --json

# List the 19 stable figure contracts. This revision has no experimental
# FigureRequest skills; --include-experimental is reserved for that skill axis.
cortexel catalog

# Start with the small synthetic request fixture. Ask for the large schema only
# when repair or code generation needs it.
cortexel describe neuro.spike_raster --json --section example
cortexel describe neuro.spike_raster --json --section schema

# The closed sections are summary, example, schema, and all. Omitting --section
# with --json retains the complete bundle.
cortexel describe neuro.spike_raster --json --section all

# Discover only adapters this installed package can actually execute. Candidate
# mappings in skill prose are intentionally absent from this list.
cortexel source catalog --json

# Get the exact authority statement, limitations, and a guarded synthetic template.
# It is deliberately non-executable. Replace every fixture value with a caller-owned
# capture, then remove its nested guard and submit only inputTemplate.
cortexel source describe nest-spike-recorder --json
cortexel source example nest-spike-recorder > capture.template.json
# after truthful caller-owned replacement: write only inputTemplate to capture.json
cortexel source adapt nest-spike-recorder capture.json > request.json

# Validate a request from a file or stdin. Exit code 0 = valid.
cortexel validate request.json

# Render an SVG plus its SVG-binding artifact. Final entries are inspected without
# following symlinks. One cooperative directory-wide lock covers case/Unicode aliases;
# a pre-existing lock is never guessed stale. Non-force publication is atomic no-replace
# (or refuses when unavailable), and the artifact is installed last as the completion
# marker. The pair is not a transaction; the host must own the output directory.
# tableBinding=shape_only records that no canonical row-byte sidecar exists.
cortexel render request.json --output figure.svg

# Machine-readable validation and render results use the closed JSON format.
cortexel render request.json --dry-run --format json
```

The CLI is offline: no network, no shell hook, no `--url`. Its packaged interface has
a closed, tested exit-code vocabulary (`0` ok, `2` usage, `3` parse, `4` schema,
`5` semantic, `6` budget, `7` I/O, `8` internal). File and stdin input is bounded before
decoding, malformed UTF-8 and a BOM are rejected rather than normalized, and duplicate
JSON members remain observable to the strict parser. If a writer crashes while holding
the lock, recovery is deliberately manual: remove `.cortexel.figure-emission.lock` only
after establishing that no publisher is alive. `validate` and `render` accept
`--format json`; `migrate` is always JSON. `catalog --json` is the compact discovery
surface. For prompt-budgeted agents, `describe <id> --json --section example` is the
recommended first request; non-`all` sections keep catalog metadata compact. `schema`
supplies its complete schema, versioned compiler profile, and reference resources,
while `all` returns the complete scientific/evidence/authority bundle. Its example
illustrates the structural schema—it
neither adapts a live source nor proves the truth of external provenance claims.
`source catalog` is a separate executable inventory. It emits its exact compact digest
preimage, and each entry digest-binds the complete descriptor returned by `source
describe`; verification needs no hidden package constant. Today it contains only
`nest-spike-recorder`. `source describe` returns that adapter's complete
caller-authority statement and a versioned, guarded, template-only revision-5
positive-infinity fixture. Passing the outer example to `source adapt`/`source render`,
or passing its unchanged guarded options to the programmatic adapter, fails closed.
Cortexel never strips the marker or relabels its own synthetic bytes as simulation
evidence. Its typed
stop sentinel must come from the named projection-v2 boundary; `source adapt` rejects a
raw `DBL_MAX`, duplicate members, unknown envelope fields, unsupported source profiles,
and any authored request that the full stable pipeline refuses. The finite-stop branch
uses capture-authority profile v3 under the same revision-5 digest domain. Historical
adapter-v3 and capture-authority-v1/v2 inputs are refused with migration diagnostics. The
command's stdout is canonical request JSON, so it can be piped directly to `validate`
or `render`. For agents, prefer the single-process
`cortexel source render nest-spike-recorder capture.json --output figure.svg --format json` path:
ordinary shell pipelines can mask an upstream adapter failure unless every pipeline
status is checked explicitly. It remains a detached plain-data boundary—not a live
PyNEST capture or an R049 conformance receipt.
Its versioned success metadata binds the canonical adapted request and resulting
artifact, not the original source-envelope bytes or their custody, and is therefore
an execution result rather than an authenticated source receipt.
Schema success is not request acceptance; run `cortexel validate` to execute the
identity, semantic, scientific, provenance, and request-budget gates. Validation does
not prove that a figure fits derivation or output budgets; run `cortexel render --dry-run`
or `cortexel source render ... --dry-run` for that stronger check.

Programmatic agents can load the same immutable resources without invoking a process:

```ts
import { nestSpikeRecorderToRaster } from 'cortexel/adapters/nest';
import { validateRequestValue } from 'cortexel/figure';

// Acquire both values at a real caller-owned capture boundary. Do not pass the
// guarded bytes emitted by `source example` unchanged.
const { exportedStatus, options } = await acquireCallerOwnedNestCapture();
const adapted = nestSpikeRecorderToRaster(exportedStatus, options);
if (!adapted.ok) throw new Error(adapted.errors.map(({ code }) => code).join(', '));
const checked = validateRequestValue(adapted.request);
if (!checked.ok) throw new Error(checked.errors.map(({ code }) => code).join(', '));
```

The guarded fixture is a copyable template, not simulator evidence. A mapping marked feasible or
not implemented does not become a live NEST adapter. The only packaged stable NEST
adapter currently accepts the bounded plain-data shape of a caller-declared exact
NEST 3.10.0 memory spike-recorder profile documented above. Structural acceptance
is not simulator attestation.

## The semantically stable packaged catalog

Nineteen single-figure contracts:

**Neural signals & events** — `neuro.analog_trace`, `neuro.spike_raster`,
`neuro.population_rate`, `neuro.response_curve`, `neuro.isi_distribution`,
`neuro.psth`, `neuro.correlogram`, `neuro.phase_plane`, `neuro.multisignal_trace`,
`neuro.compartment_trace`.

**Network topology** — `network.connection_graph`, `network.adjacency_matrix`,
`network.weight_matrix`, `network.delay_matrix`, `network.degree_distribution`,
`network.delay_distribution`, `network.weight_distribution`,
`network.spatial_map_2d`, `network.synaptic_weight_trace`.

Each source contract lives under `contract/skills/`; the package carries the exact
generated copies in [`dist/contract/skills/`](./dist/contract/skills/). They contain
the scientific purpose, closed request schema, named validators, budgets, disclosures,
an accessibility table, migration mapping, and living valid/invalid examples that the
test suite executes.

The packaged pre-1.0 React surface still contains legacy WebGL scenes, and its explicit
`cortexel/react/knowledge-graph` subpath is experimental. No 3D, knowledge-graph,
animation, NCP-adapter, or bundle skill/compiler exists in the FigureRequestV1 catalog;
stable validation fails closed instead of inventing those capabilities.

The experimental graph API is split deliberately:

- `cortexel/knowledge-graph` is the agent/server boundary. It has no visualization
  peers and can strictly bind a complete corpus `VizSpec` to its derived caption and
  one immutable presentation from either a materialized value or duplicate-safe raw
  text.
- `cortexel/react/knowledge-graph` is the interactive host boundary. It additionally
  requires React 19, Three 0.184–0.185, R3F 9.6, and the declared compatible
  d3-force-3d 3.x range from 3.0.5. Current allocation-path evidence covers only the
  exact repository/package-smoke lock at 3.0.6; it does not transfer to another 3.x.
  Its canonical
  `KnowledgeGraphAccessibleFigure` owns validation and presentation preparation; the
  host supplies only Canvas/runtime policy and controlled interaction state.

Because `0.10.0-dev.0` is not published, install a reviewed full Git SHA (or a locally
packed tarball), never a floating branch:

```bash
CORTEXEL_COMMIT=REPLACE_WITH_40_HEX_REVIEWED_COMMIT_SHA
npm install --save-exact "github:sepahead/cortexel#$CORTEXEL_COMMIT"
# Only for the interactive 3D graph entry:
npm install react@^19 react-dom@^19 three@">=0.184 <0.186" \
  @react-three/fiber@^9.6
npm install --save-exact d3-force-3d@3.0.6
npm install --save-dev @types/react@^19 @types/three@">=0.184 <0.186"
```

Every surface inside the canonical corpus composition consumes the same deeply frozen,
runtime-branded capability across ESM and CommonJS. The peer-free entry exposes no
corpus mapper, and the four direct React primitives runtime-reject corpus presentations;
they remain available for separate caller-declared `generic_visual` graphs. Exact kind
filters produce a source-bound view without copying or minting records. The visible
caption and paginated DOM surfaces remain when the host declares the WebGL region
unavailable or a React descendant client render/lifecycle failure is caught. The
deterministic record browser exposes one bounded page at a time;
SSR/no-JS contains only its initial page, while hydrated controls make all accepted
records reachable. `serializePreparedKnowledgeGraphPresentation` returns the complete
canonical *presentation inspection record*, not its bound caption, view policy, theme,
camera, host policy, or a FigureArtifact. Its bytes carry no runtime brand and are not
an evidence receipt or complete figure export.

The canonical corpus mapper redundantly encodes node kind with three closed 3D shells
and relationship kind with four closed stroke patterns; directed relationships retain
static arrowheads even when motion is reduced. It contrast-normalizes undimmed opaque
node and edge colors against the exact light/dark `hostPolicy.backgroundColor` and
discloses both source and intended undimmed scene colors in the DOM legend. The host must paint that
background behind the Canvas. These are bounded structural/contrast regressions, not
CVD, grayscale, browser, assistive-technology, or whole-view WCAG conformance evidence.

Presentation preparation, the caption, legend, paginated DOM navigation, and complete
static records admit at most 1,000 nodes and 4,000 edges. The allocating d3 live-force
region has a separate 250-node/1,000-edge ceiling. Above the live ceiling, the canonical
figure does not create the 3D solver or call the host visual renderer; it retains every
non-WebGL surface and reports exact active counts and limits. An exact source-bound
filter that falls within the live ceiling can restore the visual without sampling or
inventing records. Cortexel schedules at most one allocating d3 tick per rendered frame,
so settlement slows below 60 FPS and no frame-rate or latency guarantee is claimed.

`prepareCorpusKnowledgeGraphFigureJson` owns the bounded duplicate-member-safe raw
corpus-VizSpec boundary; `parseKnowledgeGraphPresentationJson` does the same for the
separate generic-visual presentation input. Their result assurance records the raw-text
boundary. The materialized-value APIs honestly record that duplicates are no longer
observable and JavaScript Proxy traps cannot be made inert. Runtime capabilities
are local to one physical installed package and realm: that installation shares ESM/CJS
identity, but serialization, structured clone, workers/processes, another realm, or a
duplicate package copy does not. These controls prevent cross-surface drift, but they
do not authenticate a snapshot/reference, resolve evidence, make force geometry
quantitative, establish whole-view accessibility conformance, or promote the legacy
graph into the stable catalog. No experimental graph CLI exists in this revision;
`cortexel catalog` remains the stable FigureRequestV1 catalog.

## Why the invariants matter

A few examples of what Cortexel refuses to get subtly wrong:

- A **population rate**'s denominator counts the *recorded* neurons, including the
  silent ones — never the ones that happened to spike, which would inflate every rate.
- An **inter-spike interval** is formed only *within a train*, never between two
  neurons whose spikes happen to be adjacent in time.
- A **rank-local** MPI connection snapshot can support a local in-degree but **can
  never** claim a global out-degree — the outgoing connections live on another rank.
- A **matrix** cell that was never observed stays visibly distinct from a measured
  zero; a **multapse** is never collapsed by "last edge wins".
- A **unit alias** (`milliseconds`) is rejected with a repair pointing at the
  canonical code (`ms`) rather than silently converted — a conversion the caller
  never sees is a number the caller never checked.

Agent hosts that want bounded mechanical correction may call `applySafeRepairs` from
`cortexel/figure`. It accepts the request itself—not caller-supplied diagnostics—and
can only add a wholly absent exact contract identity, canonicalize a registered unit
alias, or remove a caller-authored library-assurance field from a private snapshot.
It reruns the full request gate and returns either a branded `ValidatedRequest` plus an
immutable audit, or diagnostics with no candidate. Scientific choices, migrations,
unknown-field deletion, topology scope, direction, and layout always remain explicit.

## Contract identity

Everything under the repository's `contract/` tree is the single normative source.
TypeScript types, the runtime catalog, per-skill schemas, the Python mirror, and the
[`dist/contract/`](./dist/contract/) package copy are all **generated** from it (`bun run
generate`) and bound by a SHA-256 contract digest. CI fails if any generated file drifts.
Run twice, generation is byte-identical.

## Working on Cortexel

```bash
bun install
bun run generate        # derive all generated artifacts from contract/
bun run check:generated # fail if generated files drift or generation is non-deterministic
bun run typecheck
bun run test            # the full suite
```

- [`AGENTS.md`](./AGENTS.md) — building figures *with* Cortexel.
- [`CLAUDE.md`](./CLAUDE.md) / [`CONTRIBUTING.md`](./CONTRIBUTING.md) — working *on* Cortexel.
- [`docs/SCOPE.md`](./docs/SCOPE.md), [`docs/PROVENANCE.md`](./docs/PROVENANCE.md),
  [`docs/VERSIONING.md`](./docs/VERSIONING.md),
  [`docs/SECURITY_MODEL.md`](./docs/SECURITY_MODEL.md),
  [`GOVERNANCE.md`](./GOVERNANCE.md), [`ROADMAP.md`](./ROADMAP.md).

## License

MIT © Sepehr Mahmoudian. See [`LICENSE`](./LICENSE).
