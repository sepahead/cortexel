# Changelog

All notable changes to Cortexel are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — receipt-bound legacy Engram corpus graphs

- Added a closed `CorpusEntityGraphResponse` branch for Engram's exact
  `engram.corpus-derivation-receipt.v2` entity response. The adapter validates the
  complete source roster, identity-derivation profile, canonical node and assertion
  order, endpoint membership, redundant summaries, conservative authority flags, and
  receipt equality before mapping a graph.
- Required `graphSnapshotId` to equal the RFC 8785 SHA-256 digest of the complete
  defensively captured response. Cortexel creates only presentation-local
  `graph_snapshot_record` references into that snapshot; it does not authenticate the
  receipt, promote upstream claims to paper-local evidence, or alter the historical
  per-element-evidence branch.

### Fixed — deterministic stable-figure layout

- Stable SVG legends now use deterministic, host-font-independent wrapping,
  retain two columns only when every exact label fits, and reserve a protected
  legend band. Long scientific qualifiers no longer overprint adjacent legend
  entries, axes, or data at the default output size.
- Shortened repeated compartment, PSTH, and response-curve axis labels and
  matrix legend keys to their quantitative meaning while retaining complete
  pooling, exposure, event-scope, missing-state, aggregation, and
  rate-normalization qualifiers in the accessible summary, contract table,
  derivation receipt, and mandatory disclosures. This keeps titles, legends,
  axes, and disclosures independently legible without weakening the scientific
  record.

### Fixed — browser-safe legacy Engram capture boundary

- Exported `canonicalize`, `canonicalDigest`, `getBudgetLimits`, and
  `snapshotValue` from the browser-safe `cortexel/core` subpath. This lets the
  legacy Engram corpus adapter capture, serialize, and identify one exact JSON
  value without importing the Node-oriented `cortexel/figure` validation bundle.
  These four utilities do not
  create a validated-request capability, render authority, evidence, or an NCP
  semantic. The package root also carries the additive export because `cortexel`
  re-exports the complete legacy core surface.
- Added a packaged browser-bundle regression that executes the public capture and
  digest path and rejects a build that omits the `cortexel/core` input.

### Added — React-only caption-bound knowledge-graph inspection

- Added the experimental `cortexel/react/knowledge-graph-dom` subpath. Its sole runtime
  export, `KnowledgeGraphDomFigure`, accepts exactly one materialized corpus `VizSpec`
  or raw JSON through a duplicate-member-rejecting boundary in legacy
  `mode: interactive`, runs the existing strict corpus bind, and derives and displays
  the mandatory caption as the first
  child of every accepted figure, owns selection, and keeps
  the legend, operable query/list controls, and full-source paginated record browser
  in ordinary DOM. It exposes no caption replacement, prepared capability, children,
  renderer injection, hover, camera, controls, force-layout, or visual-availability
  authority.
- Extracted one package-private React-only corpus frame shared with the existing
  `KnowledgeGraphAccessibleFigure`. The frame binds validation, caption, exact-source
  views, state invalidation, legend, operable list, and full-source records once; the
  3D wrapper alone injects its guarded visual region. Removed the redundant
  `KnowledgeGraph3DScene` compatibility re-export cycle and redirected DOM declaration
  types away from the 3D module.
- Added source-closure, capability-edge, ESM/CommonJS, declaration, heavy-peer-absence,
  duplicate-JSON, caption-order, invalid-view, exact-token state-reset, and package SSR
  regressions. The DOM path uses the 1,000-node/4,000-relationship presentation bound,
  not the lower 250-node/1,000-relationship live-force ceiling. Its reviewed Cortexel
  source and emitted import closures admit React, the React JSX runtime, and the normal
  Zod dependency, but no ReactDOM, Three, R3F, D3, other external package, or Node
  builtin.
- This remains a legacy experimental inspection composition. It is not a
  FigureRequestV1 renderer or artifact, an evidence/snapshot authenticator, a
  deterministic HTML receipt, a complete no-JavaScript document, or WCAG/browser/
  assistive-technology conformance evidence.

### Fixed — legacy NEST weight-recorder identity boundary

- Replaced the legacy sender/target pair splitter with
  `splitWeightRecorderByRecordedTuple` for caller-verified NEST 3.10
  `record_to=memory,time_in_steps=false` output. It requires the complete parallel
  `times`, `weights`, `senders`, `targets`, `ports`, and `receptors` channels and
  partitions rows only by exact `(sender,target,port,receptor)` equality. It preserves
  source ordinals, first-seen group order, nonchronological/duplicate times, and
  every accepted finite binary64 weight without sorting, deduplication, interpolation,
  or Float32 narrowing. Success returns a deeply frozen detached snapshot. An exact
  empty six-channel capture returns no groups and makes no completeness claim.
  `time_in_steps=true` output carries `offsets` and is rejected rather than projected;
  SharedArrayBuffer-backed typed arrays are rejected rather than copied incoherently
  under a possible concurrent writer, and detached typed arrays cannot masquerade as
  valid empty captures.
  The old `splitWeightRecorderBySynapse` and `weightRecorderToSceneData` names now
  always fail with migration guidance, and pair-only `weightSynapse` SceneData metadata
  is rejected. The separately caller-authored legacy `nest.plasticity_dynamics` skill
  now carries an unsuppressible disclosure that connection identity, continuity,
  topology lifetime, run/recorder scope, and update semantics remain unestablished.
  A recorded tuple remains structural recorder metadata—not an
  authenticated connection id or continuous trace—and creates no stable adapter or
  gate evidence. This corrects the historical pair-as-synapse claim without rewriting
  released changelog/audit records. The boundary follows the pinned NEST 3.10
  [recorded channel registration](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/models/weight_recorder.cpp#L103-L106),
  [event write path](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/models/weight_recorder.cpp#L171-L175),
  [memory time encoding](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/nestkernel/recording_backend_memory.cpp#L194-L241),
  [same-pair multapse test](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/testsuite/pytests/recording/test_weight_recorder.py#L240-L281),
  [receptor test](https://github.com/nest/nest-simulator/blob/acca9704da248750219a027db99fec6cd1f9052a/testsuite/pytests/recording/test_weight_recorder.py#L284-L329),
  and official warning that
  [recorder events need not be chronological](https://nest-simulator.readthedocs.io/en/v3.10/devices/record_from_simulations.html).

### Changed — repository hygiene and CI substrate

- Added an explicit Dependabot policy for the root Bun lock, package-smoke npm
  fixture, Python package and build-backend manifests, and GitHub Actions. Each
  ecosystem sets the routine version-update pull-request limit to zero while
  leaving security updates eligible for review. This is an automation policy,
  not dependency-audit or security-clean evidence.
- Root-anchored the `.superstack` ignore rule as `/.superstack`, covering a root file,
  directory, or dangling symlink without hiding a nested source path of the same name.
  A source-hygiene regression exercises all four cases and rejects a forced tracked
  root entry. The path is absent from the repository; the ignore remains only an
  accidental-commit control and does not deny reads or an explicit forced add.
- Replaced all five `ubuntu-latest` job labels with `ubuntu-24.04`, preventing an alias
  migration from silently changing the intended OS family. GitHub's hosted image still
  rolls; each automatic **Set up job** record supplies observational image/version and
  included-software provenance, not an immutable image or reproducibility receipt.

### Fixed — exact npm topology and sealed TypeScript checking

- Replaced the false npm-major topology rule with closed exact-version profiles.
  npm `10.9.0`, `10.9.8`, and `11.3.0` require exactly the empty scope directories
  derived from excluded scoped lock records beneath live package containers; npm `11.12.1`,
  `11.16.0`, `11.17.0`, and `11.18.0` forbid every such residue. Unknown versions,
  prereleases, build spellings, and future releases now reject before materialization.
  npm `11.3.0` additionally requires the hidden lock to retain every non-omitted,
  runtime-incompatible `optional: true` record with exactly the added
  `ideallyInert: true` member while forbidding its package directory. The other six
  reviewed versions exclude those metadata-only records. Hidden-lock records and
  installed filesystem packages are therefore derived as separate exact closures
  instead of treating npm's legacy inert metadata as a materialized dependency.
  [`@npmcli/arborist` 9.1.5](https://github.com/npm/cli/releases/tag/arborist-v9.1.5)
  first contains npm CLI
  [f6c868d](https://github.com/npm/cli/commit/f6c868d8a2df4d2961983d4e52095d6e7551e9cb),
  and [npm 11.6.1](https://github.com/npm/cli/releases/tag/v11.6.1) first bundles
  that Arborist release; [npm 11.6.0](https://github.com/npm/cli/releases/tag/v11.6.0)
  bundles 9.1.4. This is documented only as the historical source boundary, not as
  a `>=11.6.1` admission rule or substitute for Cortexel's full consumer matrix.
  Both exact 11.6.x versions remain rejected. The manifest/profile check now precedes
  workspace creation, operational-directory creation, and every child command.
- Moved the TypeScript 7.0.2 NodeNext/no-emit consumer check out of execute. The
  native TypeScript launcher attempts `process.execve` when Node exposes it and falls
  back to `child_process.execFileSync`; executing it under the JavaScript guard either
  failed or escaped that guard. Prepare now runs the exact fixed command only after
  the workspace is finalized read-only, requires exact silent success, revalidates
  the package closures, and requires identical workspace seals before and after.
  Prepared state binds that bounded check to the seal. Execute never launches the
  compiler. Its defense-in-depth guard denies the seven reviewed top-level
  `node:child_process` launch functions, `ChildProcess.prototype.spawn`, and
  `process.execve` when Node exposes it; this closes the two native TypeScript launcher
  paths without claiming a hostile-process sandbox.
- Advanced the prepared-state contract and filename from v2 to v3 because the sealed
  TypeScript check is a new required member. Old v2 state therefore rejects instead of
  being reinterpreted under a changed shape. The phase envelope remains v2 because its
  own wire shape is unchanged.
- Routed all 73 execute-phase target/consumer probes through one closed operation inventory,
  including the two CLI import probes, 14 fixed CLI checks, two checks for each of 19
  source-owned stable skill ids, and six exit-status cases. Every command has one
  nonrepeating stable label and bounded terminal-safe underlying diagnostic; process
  output never chooses the skill matrix, and the shared boundary rejects an argument
  targeting TypeScript/`tsc`. Container inventory failures now report bounded
  expected/actual entries without changing acceptance. The two execute preflight Node
  version/identity commands remain separately bound by phase-neutral closed policies.

### Fixed — consumer/build Node separation

- Removed the source-build-only Node floor from packaged `devEngines`. npm evaluates
  that field before `install`/`ci`, so the stricter tsdown floor rejected the declared
  Node 22.12 and 24.0 consumer rows before their packed-runtime smoke could start.
  `engines.node` remains the closed consumer range
  `^22.12.0 || ^24.0.0 || ^26.0.0`.
- Package construction now runs a source-only preflight before loading tsdown and
  accepts final core version strings in `^22.18.0 || ^24.11.0 || ^26.0.0`. Boundary
  and property tests bind that closed predicate, reject Bun- and Deno-marked
  compatibility runtimes, and ensure the build-only policy cannot leak back into the
  source manifest consumed by packing. Runtime-marker rejection is nominal fail-closed
  detection, not provenance, authentication, or an identity binding to later processes;
  the package smoke remains the exact packed-consumer evidence.

### Fixed — portable clean-run authority

- Clean CI installs now acquire the frozen Bun closure through a fresh mode-0700
  cache and materialize `node_modules` with the cross-platform `copyfile` backend,
  then admit only directories, regular files, and symlinks while
  rejecting any regular file that still has another hardlink.
  This closes Linux Bun 1.3.14's intentional global-cache hardlink topology without
  weakening the reviewed TSX gate. `bun run bootstrap` gives developers one command
  that requests force-rematerialization through `copyfile`, but local setup remains
  development convenience: only an initially absent tree plus the fresh-cache CI scan
  supplies a complete regular-file unique-link scan of that clean install.
  Each CI acquisition uses an `env -i` allowlist with separate private
  cache/home/config/temp roots, a resolved Bun executable, and a minimal tool path, so
  ambient credentials or user package configuration are not install inputs. Ambient
  Bun auto-install is disabled so a missing dependency fails instead of silently
  acquiring network authority.
- The CJS bare-`url` cache-poison regression now runs from a private temporary
  consumer containing the copied current runtime fixture, rather than using the
  checkout as its working directory. Hosted runners whose `/home` carries an extended
  default ACL therefore keep failing closed at the reviewed command boundary without
  preventing the intended package semantic probe.
- Python's two `tomllib` imports now occupy the standard-library block required by
  the exact Ruff 0.16.1 CI gate. This is formatting-only; the package supervisor's
  unreaped-leader cleanup order and no-post-reap signaling invariants are unchanged.

### Security — closed build-output authority

- The package build now derives its runtime and declaration roots from the exact
  package manifest, walks literal relative and package-import edges with the
  TypeScript parser, rejects parser diagnostics, enumerated ESM/CommonJS format and
  strict-mode early errors, and unknown output kinds, and removes only an exact
  reviewed set of tool-emitted orphans. It then re-enumerates the output and
  fails if any runtime or declaration is unreachable. Static imports, dynamic imports,
  direct `require`, import-equals, and import-type edges retain their actual conditional
  resolution kind; relative paths, package imports, runtime/declaration externals, and
  Node builtins each have closed context-specific policies. Reserved capability
  targets reached through absolute paths, canonical or noncanonical `file:` URLs,
  query-bearing paths, virtual importers, filesystem aliases, alternate extensions,
  importer-less entry aliases, reserved-specifier suffixes, or an unreviewed pass
  tuple fail closed. A first resolver gate is backed by a final graph/output ownership
  audit: each private capability module must remain one exact importer-free entry and
  appear in exactly its pass-owned private facade, so an intermediate plugin cannot
  smuggle it into another chunk by short-circuiting resolution.
  The exact Rolldown input-plugin roster is sealed without freezing unrelated
  third-party state: every initially present `outputOptions` hook is descriptor-bound
  and frozen, and every absent extensible hook receives an immutable `undefined`
  sentinel. A first pre-ordered authority hook rejects separate output plugins before
  any one can run and erase its own evidence; the last post-ordered authority hook
  independently rejects output plugins introduced by an admitted input hook. Late
  addition/replacement, accessor-backed hook records, unknown hook vocabulary,
  sparse/accessor-backed rosters, and mutation of either authority plugin fail closed.
  Recognizable direct, computed, global/globalThis, and lexical-alias loader forms
  plus enumerated direct `eval`, `Function`, and constructor-recovery forms fail
  closed. This is a direct emitted-syntax closure, not a data-flow proof against
  indirect evaluation, arbitrary reflective alias flow, or code already executing
  with host authority. Generated CommonJS may not
  retain a shadowable bare Node builtin: the sole tool-generated `url` shim is
  rewritten to `node:url` only in its exact reviewed contexts, all remaining output
  is scanned, and a fresh reviewed Node process proves that poisoning the bare
  `require('url')` cache cannot affect the installed validator. This is package-byte
  hardening, not a sandbox against code already executing with host authority.
- Every published runtime source map is now bound to its one exact terminal
  `<owner>.map`, has a strict duplicate-key-safe v3 JSON profile, and admits only the
  exact 124 reviewed source identities plus their aggregate identity/content digest.
  Build verification applies closed map/code/table/line/segment/comparison allocation
  budgets before decoding, resolves each identity only after bounded admission, then
  proves direct, canonical, single-link ancestry and stable-descriptor, canonical
  UTF-8 source bytes equal to decoded
  `sourcesContent`; the installed-package smoke independently rechecks the complete
  identity/content digest so build-tree evidence is not transferred to packed bytes.
  Alternate `@`/block/data/inline annotations, extra or trailing directives,
  `sourceURL`, `debugId`, hidden/config inputs, inconsistent copies, orphan maps, and
  a mapped/mapless policy reversal all fail closed. Declarations are deliberately
  mapless. The shared decoder also enforces the ECMA-426 1/4/5-field grammar,
  canonical 32-bit Base64-VLQ values, safe cumulative state, ordered generated
  columns, complete source/name-index coverage, name text at its mapped original
  UTF-16 coordinate, table bounds, and generated/original line and UTF-16-column
  bounds without admitting final-line EOF as an in-file position. These checks bind
  named mappings and establish structural coordinates; they do not prove that every
  otherwise valid mapping segment points at the semantically corresponding token.
  An HTTP `SourceMap` response header is host behavior outside package-byte authority.
- Before tsdown may clean or write, the executor constructs a fresh option record
  internally from the recursively frozen static authority; no caller-authored live
  options or accessors reach the destructive tool. The repository and any existing `dist` are
  required to be canonical direct directories with only direct, singly linked file
  descendants. Streaming enumeration admits only portable ASCII identities and
  enforces hard depth, per-directory, path (86 bytes beneath `dist/`, hence 91 bytes
  including the package-relative `dist/` prefix), file/directory/node, per-file, aggregate,
  runtime/declaration/map-count, and aggregate-map bounds before materializing code or
  source maps. The boundary is re-established after the compiler. The last build
  step revalidates the complete code graph plus the exact deterministic skills
  manifest, byte-identical contract projection, and directory closure both before and
  after mode normalization. Contract source enumeration, any pre-existing contract
  destination, the CLI shebang read, package manifest read, and tracked/generated mode
  trees now have explicit traversal and byte ceilings with stable descriptor reads
  where bytes are consumed. Mode changes begin only after a complete bounded structural
  and single-link preflight, so a hard-linked file cannot transfer `chmod` authority to
  an outside pathname. These are pathname-time checks under a single-principal build
  premise, not containment against a concurrently mutating same-UID process.

### Changed — current supported development closure

- As reviewed on 2026-08-03, refreshed every direct JavaScript development/runtime
  dependency to the latest release compatible with Cortexel's supported Node, React,
  Three, and package
  contracts. The repository typecheck now runs the current native TypeScript 7
  compiler, while declaration generation uses the current API-bearing TypeScript 6
  release because TypeScript 7 intentionally does not yet expose the compiler API
  required by compiler-API tests and declaration tooling. The build-only tsconfig's
  `ignoreDeprecations: "6.0"` is the compiler's general TypeScript 6 deprecation
  horizon, not a `baseUrl`-specific waiver; it is not applied to the TypeScript 7
  repository gate.
- Replaced the upstream-unmaintained tsup build with current tsdown 0.22.14,
  stable Rolldown 1.2.2, and Magic String 1.1.0. The reviewed static build disables
  ambient environment prefixes, pins the prior ES2022 lowering contract, preserves `node:` builtin
  identities and `.js`/`.cjs` plus `.d.ts`/`.d.cts` package paths. Every runtime and
  declaration pass is wrapped by a first private-capability resolver and a final
  graph/facade ownership audit. Runtime
  source maps are closed and self-contained; declarations carry no dangling map
  metadata. The two explicitly disabled tsdown notices are `legacyCjs`, for the
  intentional CommonJS package surface, and host-load-dependent `pluginTimings`;
  every other warning fails the build. Two isolated migration-audit
  builds from relocated source copies produced byte-identical outputs under
  different `TSDOWN_*` environments; that is local review evidence, not a retained
  cross-platform package-reproducibility receipt.
  tsdown and Rolldown are exact direct development pins. Config loading proves tsdown
  resolves the same physical Rolldown 1.2.2 entry used to construct the reviewed
  hook/filter vocabulary, so a stale or future nested resolver cannot silently split
  the build authority. Vite retains its separately declared compatible Rolldown range;
  Cortexel does not use a global override to force that unrelated tool past its range.
  The generated CommonJS compatibility helper is shipped package code, so
  `THIRD_PARTY_NOTICES.md` and `LICENSES/Rolldown.txt` now carry the exact applicable
  Rolldown, Rollup, and Evan Wallace/esbuild MIT notices rather than treating it as a
  separately installed dependency.
- The direct Bun compatibility run now sends each extended-descriptor supervisor
  fault fixture through one ordinary three-pipe staged-Node broker. Bun 1.3.14 on
  macOS otherwise intermittently loses its internal connection while constructing
  repeated four-extra-pipe `node:child_process` children even after every prior
  `close` and without descriptor growth. The broker performs the exact Node spawn,
  drains every inherited pipe through `close`, and returns one schema-tagged,
  canonical-base64 record. It does not retry, delay, skip, or relax any cleanup or
  protocol assertion.
- Advanced the pinned Lean toolchain from 4.32.0 to 4.32.2. The
  [upstream 4.32.2 release](https://github.com/leanprover/lean4/releases/tag/v4.32.2) fixes
  a kernel soundness defect in 4.32.0/4.32.1; proofs compiled by the affected kernel
  are not carried forward as current release evidence, so the full warning-as-error
  formal build is rerun under 4.32.2.
- Refreshed the exact npm package-smoke consumer manifest and npm 11-generated lock,
  including React 19.2.8, React Three Fiber 9.7.0, current declaration packages, and
  a TypeScript 7 consumer compile. The local Cortexel tarball remains an unbound slot
  in the committed lock and receives integrity only in prepared smoke state. The
  reviewed Ajv closure uses the current compatible Fast URI 3.1.5 release because
  Ajv declares `^3.0.1`; forcing the incompatible Fast URI 4 major would not be a
  valid update. The obsolete vulnerable esbuild branch left by tsup is gone; tsx 4.23.5
  resolves the fixed current esbuild 0.28.1 release and the advisory gate is clean.
- Kept optional peers mandatory in the full package-smoke result while making a
  transient npm behavior recoverable. npm can exit zero after a failed optional
  tarball fetch and prune the affected branch. Only the full profile may repeat its
  identical `npm ci` once, using that profile's same private cache, after an exact classifier
  proves that the hidden lock and filesystem form one reduced closure with no changed
  or extra record and only missing `optional:true` records. Required or
  `devOptional`-only gaps, metadata/header drift, malformed JSON, command/runtime
  failures, and a second incomplete result fail closed. Final hidden-lock, package,
  scope, `.bin`, manifest, and byte equality remains unchanged. npm version/pack,
  core, charts, and full now have four disjoint canonical private cache directories;
  a prepare-local `unused` -> `active` -> `complete` ledger now establishes each
  directory's cold first use rather than inferring it from a fresh pathname. The
  command-adjacent cold activation rebinds the canonical workspace, controlling
  ancestry, role/path, and captured cache inode, reads at most one dirent and requires
  none, rebinds the same identities, then sets and rechecks the exact npm environment
  path. Only that active
  role can execute its closed npm policy. Control completes after `npm pack`; each
  consumer completes only after the ordinary full closure succeeds. The optional-only
  full retry remains active in the same cache across both attempts and never repeats
  the emptiness check. No later consumer inherits an earlier profile's registry cache
  state. This evidence is only the bounded initial observation: it does not prevent an
  external same-UID writer from racing afterward. Lock/integrity checks and the later
  reduced or complete closure proofs remain separate evidence.
- npm's isolated user/global configuration files are now exclusively created with
  owner-only authority, normalized to exact mode `0600` independently of ambient
  umask, installed before even the npm version probe, and revalidated before and
  after every npm command. The command cwd's project `.npmrc` must be absent at both
  boundaries. Every npm command also rechecks its role-bound cache path, device/inode,
  exact mode `0700`, and current-UID ownership before and after execution. Retry
  authorization and the immediate pre-command boundary separately recheck that same
  full-cache authority, config bytes, paths, modes, operational directories, raw consumer
  manifest/lock bytes, and both tarball copies. Permissive and maximally restrictive
  umask regressions cover the creation boundary.
- Raised only the Node 22 consumer floor to 22.12, the first Node 22 release where
  the CommonJS knowledge-graph entry can load its ESM-only `d3-force-3d` peer without
  a flag. Source builds separately require Node 22.18+, 24.11+, or 26.x, without
  admitting unsupported intervening or future majors. CI pins its build runtime,
  exercises exact floor/current pairs 22.12.0/22.23.2, 24.0.0/24.19.0, and
  26.0.0/26.6.0, and binds their exact bundled npm versions 10.9.0, 10.9.8,
  11.3.0, 11.17.0, 11.12.1, and 11.18.0 respectively. Node, npm root, and npm CLI
  must resolve beneath the same setup-node installation prefix before their private
  copy is admitted. Every unlisted npm version, including npm 12, lacks a reviewed
  topology/materialization profile in this milestone and is rejected.
- CI now pins checkout 7.0.1, setup-node 7.0.0, setup-python 7.0.0, and setup-uv
  9.0.0 by immutable upstream commit SHA. setup-uv's changed cache-pruning default is
  inapplicable because this workflow disables its cache; the exact workflow run remains
  the authority for these major-version migrations.
- The zero-state generated-contract check now invokes the canonical installed
  `tsx/dist/cli.mjs` only after proving that it is the exact descendant of the
  resolved `tsx` package authority. Generator source and working directory remain
  inside each independent isolated tree; this path check does not authenticate
  dependency bytes outside the lock/install gates. It is a resolution-time
  topology check, not stable-inode or hostile same-UID containment: a process with
  write authority over `node_modules` can still replace the path before a later
  spawn, so CI relies on its isolated hosted runner and admits no target process
  before generation.
- Replaced one normative capability-registry reference to the retired tsup-specific
  package surface with build-tool-neutral wording. That byte-only documentation
  change moves the contract digest from
  `sha256:a710ef28247ab8c3e49ebf80b30bfcbacc6c64768d8a836828f78eeb4cac597b`
  to `sha256:61286a89091acaaee0ffb70b377b176cdea460f680d8ea0a7ef3f19da4da6dd0`;
  the stable catalog digest remains
  `sha256:e6ef9014ca56f4bd159f8b3545ba8d7cf0241550ff25b9de44b05fde826f0dd5`.
  It does not change a figure schema, skill meaning, renderer, or scientific claim,
  but downstreams that bind the complete normative byte identity must update the
  contract digest explicitly.
- Removed the tracked `.superstack` report/context artifacts and ignored
  `.superstack/` to reduce accidental ordinary tracking. Ignore rules neither deny
  filesystem reads nor prevent an explicit forced add.
- Packaged `MIGRATION.md` and `SUPPORT.md` alongside the agent guide. The README and
  agent quick start now invoke the reviewed installation's concrete CLI module instead
  of `npm exec`, whose missing-local-package behavior can select registry or cache
  state; the evidence-sensitive graph recipe also exact-saves d3-force-3d 3.0.6.

### Fixed — pre-READY guardian failure classification

- The reviewed POSIX supervisor now distinguishes an exact canonical guardian
  sweep intent from the READY frame even when the guardian fails before READY.
  Only the closed set of completion-free reasons reachable in that lifecycle
  state is retained; the supervisor publishes no handshake, `GO`, command
  result, or target output authority, closes its lease idempotently, and waits
  for the same guardian `SIGKILL` plus complete pipe-EOF predicates before a
  bounded terminal diagnostic. Malformed, noncanonical, duplicate-member,
  completion-bearing, and phase-impossible lookalikes still fail as protocol
  violations. Post-READY intents are now checked against their own reachable
  reason set. The guardian remains the sole numeric process-group signaler, and
  neither supervisor nor host adds a post-reap signal or identity probe.

### Added — NEST example visualization coverage V3

- Added a canonical V3 source-only classification for all 98 pinned NEST 3.10
  canonical PyNEST example bodies. A standard-library Python AST oracle verifies
  all 112 selected source-leaf identities and the exact raster/spatial helpers,
  derives a closed 35-row correction union, and labels the other 63 taxonomy rows
  as inherited V2 review. Exact raw authorities, domain-separated semantic
  bindings, strict schemas, deterministic regeneration, ledger integration, and
  property/negative tests fail closed on byte, digest, vocabulary, aggregate, or
  projection drift.
- Corrected raster-helper histogram/rate semantics, HH response-curve axes,
  single-panel intrinsic-current dual-y presentation, two-dimensional spatial
  membership/node/probability/mask operations, shared axes, and equal-scale
  output-coordinate trajectories. Active-sender raster normalization remains
  explicitly distinct from `if_curve.py`'s complete-configured-population
  nonvisual response surface, and output-coordinate paths are not mislabeled as
  phase-plane state dynamics. This adds classification evidence and a roadmap,
  not example execution, adapter admission, renderer parity, or scientific
  certification.
- The differential oracle retains per-row AST evidence, binds each corrected 2D
  spatial callsite to reviewed two-dimensional constructor and helper syntax,
  binds generic trajectory plots to exact readout/target coordinate carriers,
  and retains conservative explicit-binding anchors for `if_curve.py`'s
  recorder-to-retained-surface path. This is not a complete Python alias,
  reflection, mutation, control-flow, or runtime-execution proof.
  Ordinary TypeScript build/check remains Python-free; the isolated no-site Python
  self-check is a separate gate. Generator pathname bytes are identified only as
  reviewed source, never misrepresented as proof of executed bytes.
### Changed — live built-result authority

- Fully successful `FigureResult` objects now receive package-private, identity-based
  runtime authority only after validation, derivation, closed-plan construction,
  request-bound OutputAuthority translation, SVG and output-budget checks, artifact
  assembly, and artifact postconditions all pass. The returned value remains an exact
  ordinary record with the six own string keys `ok`, `artifact`, `svg`, `plan`, `table`,
  and `disclosures`; it has no symbol-keyed runtime marker, and its complete reachable
  object tree is frozen before the exact result identity enters a module-private
  registry. A package-private type-only brand keeps the supported ESM and CommonJS
  declaration graphs nominally compatible without adding a runtime member or granting
  runtime authority: a result type produced through either format is accepted by the
  other, while a complete string-key structural lookalike is no longer assignable to
  `FigureResult`. The registry singleton is shared only by the supported package entry
  points that load one physical installation through the same Node module-cache realm.
  Copies, spreads, structured clones, serialized or reconstructed records, Proxy
  wrappers, another module-cache realm, and another physical installation do not
  inherit authority. This is an internal prerequisite for future composition only: it
  adds no public builder, `FigureBundleV1` contract, cross-figure comparison claim, or
  transferable receipt.

### Changed — composition-safe SVG foundation

- The normative SVG serializer now shares one closed writer with a package-private
  translation-only fragment path for future bounded figure composition. All 19 stable
  authoring examples retain their exact standalone SVG bytes and artifact digests.
  Fragment emission requires Cortexel's live closed RenderPlan capability, uses a
  closed ASCII compiler-supplied ID namespace, rejects noncanonical or unsafe child
  extents, and permits only an integer translation wrapper—never scaling, clipping,
  hiding, or mark rewriting. Future bundle compilation must derive namespaces
  deterministically and prove document-wide uniqueness. This is an internal
  prerequisite only: no
  `FigureBundleV1` contract, public bundle API, or cross-figure comparability claim is
  introduced by this change.

### Added — coherent knowledge-graph presentation boundary

- A new experimental, peer-free `cortexel/knowledge-graph` subpath exposes
  `PreparedKnowledgeGraphPresentationV1`. `prepareKnowledgeGraphPresentation` checks,
  detaches, deeply freezes, and registers one presentation in a module-private WeakSet;
  `parseKnowledgeGraphPresentationJson` adds a bounded raw-text boundary for the generic
  visual input that rejects duplicate object members before materialization.
  `prepareCorpusKnowledgeGraphFigureJson` provides the corresponding no-throw raw-text
  boundary for a complete corpus VizSpec and returns explicit source-input assurance.
  The complete
  accepted presentation record has an
  RFC 8785 canonical serializer that deliberately does not recreate runtime authority.
  A copied, serialized,
  Proxy-wrapped, or structurally similar object has no presentation authority.
- `prepareCorpusKnowledgeGraphFigure` gives agents and servers one no-throw path from a
  complete self-describing legacy `VizSpec` through the strict corpus gate to the exact
  bound caption, mapped presentation, palette snapshot, theme mode, and camera policy.
  It rejects the wrong skill and export mode and performs no I/O.
- All surfaces inside both canonical corpus compositions now consume the exact same
  prepared capability. This removes independent scene/legend/DOM snapshots and binds
  nodes, relationships, context, budgets, and corpus lifecycle identity to one
  publication event. The
  package build routes ESM and CommonJS to the same private runtime registry and shares
  one nominal declaration brand in both directions; packed-runtime probes cover all
  producer/consumer format pairings and public/private import boundaries.
- Preparation uses data descriptors rather than property reads, rejects accessors,
  applies aggregate retained-occurrence/string/inspection budgets, revalidates every
  observed prototype/key/descriptor before publication, and derives corpus identity
  from the complete checked context. The materialized-value assurance states the
  unavoidable limit honestly: JavaScript cannot inspect an arbitrary Proxy without
  executing its internal-method traps. Runtime tokens remain local to one physical
  package instance and realm; serialization, structured clone, workers/processes,
  another realm, or a duplicate install does not transfer them.
- `PreparedKnowledgeGraphViewV1` provides exact-source-bound node/edge-kind filtering.
  Omission means all, `[]` means none, duplicate or source-absent kinds reject, kind and
  endpoint pruning are separately counted, and visible arrays reuse exact frozen source
  record objects. A bounded per-source LRU preserves exact tokens for equivalent hot
  policies.
- `KnowledgeGraphStaticRecordView` provides deterministic paginated access to the
  accepted context, nodes, assertions, typed evidence references, epistemic records,
  attributes, and discriminated uncalibrated scores without force coordinates.
  `KnowledgeGraphAccessibleFigure` is the canonical host-owned-Canvas 3D composition: it
  accepts either a materialized spec or raw `specJson` (never an independent caption),
  keeps the visible honesty caption,
  legend, paginated operable DOM, and full source-record browser mounted, and replaces
  only a failed visual region with an availability status. Its boundary is precisely
  limited to descendant client render/lifecycle failures; hosts report WebGL/context
  availability and explicitly key retries. SSR/no-JS contains only the bounded initial
  node and relationship pages; successfully hydrated controls expose all pages. The
  canonical serializer emits the
  complete presentation inspection record, not caption, view, host policy, or a figure
  artifact. Invalid view policy retains the accepted caption and source-record browser;
  source/view transitions invalidate controlled focus that has become hidden. The
  canonical composition gives an eligible camera a provisional deterministic-seed fit
  and at most one final correction after the force layout settles, including without
  controls; user control and selection intent cancel the final whole-graph correction.
  Each fit works in either direction and includes the node glyph geometry actually
  rendered on that frame plus bounded routed-edge extents. It no longer reserves the
  maximum hypothetical focus-label envelope around every node—a real-browser defect
  that made small graphs unreadably tiny—and hover never restarts either whole-graph
  fit stage. It preserves viewing direction, supports orthographic cameras, and repairs
  near/far clipping only as required to contain the fitted sphere. Only canonical centered
  Three perspective/orthographic projections with identity parent transforms and
  ordinary unit-scale camera matrices/methods qualify; ArrayCamera, view/film offsets,
  asymmetric or reversed orthographic frusta, and custom projection matrices/methods
  fail closed without a camera write. It emits the exact host background required by
  its contrast policy, normalizes undimmed opaque node/edge colors to 3:1 against it,
  discloses source and intended undimmed scene colors, redundantly encodes corpus node/edge kind with
  closed glyph/stroke channels, sizes collision/framing/label/arrow geometry around the
  full glyph envelope, and omits hidden dash chords from GPU buffers. These checks do
  not establish CVD, grayscale, browser, or whole-view accessibility conformance. It
  consumes drag hits without selecting or
  bubbling, toggles selection consistently, and provides identified query-match
  navigation with focus transfer only on explicit activation. Manual pages with no
  query match no longer announce an off-page row.
- Camera classification and projection geometry fail closed before either fit stage:
  unsupported or ambiguous camera flags, zero/nonfinite FOV/aspect/span/zoom, and
  nonfinite position/target/direction make no camera or clipping write and do not mark
  that stage complete. A later valid resize can retry. The Cortexel-authored frame
  callback reuses scratch, including an explicit clipping result object, and does not
  set React state. Its lexical source guard establishes only the absence of reviewed
  direct allocation syntax: the exactly installed d3-force-3d 3.0.6 transitively
  allocates octrees during many-body and collision ticks. The force clock runs at most
  one tick per rendered frame and at most 60 per second, deliberately settling more
  slowly below 60 FPS rather than catching up. This is not an FPS or frame-time
  guarantee. The package peer remains `^3.0.5`; this 3.0.6 inspection does not transfer
  to a future 3.x resolution, so evidence-sensitive hosts must exact-lock or re-audit.
- Preparation and DOM inspection admit at most 1,000 nodes and 4,000 relationships;
  the allocating main-thread live force scene separately admits at most 250 nodes and
  1,000 relationships. Above the live ceiling the canonical 3D composition does not invoke
  the visual renderer but keeps the caption, legend, operable DOM, and complete
  paginated source-record browser. An exact source-bound filtered view can regain the
  visual when it falls within both live limits; some sources have no nonempty eligible
  filter.
- Both canonical React boundaries runtime-enforce an own-property XOR between `spec` and
  `specJson`; both, neither, `spec={undefined}`, and a non-string `specJson` fail before
  graph preparation.
- Raw JSON byte, decoded-string, and numeric-token limits now stop their respective
  loops at the first complete unit beyond the active bound. Tight malformed-number and
  Unicode controls preserve grammar-error precedence while preventing oversized token
  materialization.
- Packed browser evidence now builds both public graph entrypoints with the exact locked
  esbuild and peer closure during the reviewed prepare phase, records only a narrowly
  reviewed class of redundant esbuild `ignored-bare-import` warnings whose targets
  independently
  contribute bundle bytes, seals the bundle and canonical receipt, and executes the
  sealed handoff under the unchanged reviewed network/write/launch-surface guard.
- **Breaking (experimental pre-1.0 subpath):** `KnowledgeGraph3DScene`,
  `KnowledgeGraphLegend`, and `KnowledgeGraphA11yList` no longer accept independent raw
  `nodes`, `edges`, `context`, or `graphIdentity` props. They require one exact
  `presentation` capability, and the canonical figure no longer accepts independent
  `presentation` or `honestyCaption` props. The direct primitives now accept only a
  runtime-checked `generic_visual` capability. `mapCorpusKnowledgeGraph` and all
  package-internal corpus components are absent from both public graph entries; corpus
  rendering goes through `KnowledgeGraphAccessibleFigure`, whose composition owns the
  bound caption. Peer-free corpus preparation remains available for inspection,
  serialization, and view derivation. Scene/list selection callbacks now accept `null`
  so an active node can be cleared. This coherence and focused
  failure-containment evidence
  does not authenticate snapshots or references, make schematic geometry quantitative,
  establish whole-view accessibility conformance, or promote the legacy graph into the
  FigureRequestV1 catalog.

### Added — pinned NEST 3.10 visualization-demand audit

- A canonical, schema-validated V2 audit classifies the exact source bytes of all 98
  official PyNEST example bodies at pinned NEST commit
  `acca9704da248750219a027db99fec6cd1f9052a`, plus the disjoint 11 support/coordinated
  Python bodies. The closed reconciliation is 84 active, one visualization-import-only,
  and 13 non-visual canonical bodies; two active and nine non-visual support bodies;
  three aliases, 92 runner profiles, 12 checked-in visual assets, and the selected
  documentation corpus remain separate denominators.
- The audit names 24 semantic visualization-demand families and keeps source
  classification, stable representability, executable adapters, packaged renderers,
  upstream parity, and scientific certification independent. It records zero
  execution-bound outputs, zero example-specific mappings or executable-adapter
  matches, zero renderer/upstream comparisons, zero upstream executions, and zero
  scientific certifications. Thirteen demands have a plausible complete stable-skill
  candidate, four only a partial candidate, and seven no current stable candidate;
  none of those candidate labels transfers runtime or scientific evidence.
- The accompanying design note specifies a bounded `FigureBundleV1` direction for
  panels, overlays, shared axes, aggregate budgets, artifacts, and disclosure binding;
  a source-adapter sequence for multimeters, step-plus-offset spikes, connection and
  position snapshots, weight/correlation recorders, and later image/animation sources;
  and a non-guessing `source suggest` CLI direction. These are reviewed design inputs,
  not implemented capability or release claims.

### Added — closed agent repair and direct source rendering

- `cortexel/figure` now exports `applySafeRepairs`, a bounded request-in/request-out
  boundary for autonomous hosts. It acquires one detached input snapshot and derives
  authority from the installed contract, never from caller-supplied diagnostics. The
  closed automatic subset can add a wholly absent exact contract identity, replace a
  registered unit alias with its registry-owned canonical code, and remove
  caller-authored library-assurance fields. It never overwrites a present contract,
  deletes an unknown scientific field, migrates a skill, or chooses topology scope,
  direction, or layout.
- Every repair round re-enters the ordinary raw-text or materialized-value request
  boundary under the effective monotone budget profile. Successful output is the same
  branded, deeply frozen `ValidatedRequest` accepted by the renderer; failure returns
  diagnostics and an immutable audit but no candidate and no render authority. The
  caller input is never mutated. Agent and standard profiles independently cap total
  repair operations, and stateful Proxy/options, duplicate-key, idempotence,
  mixed-safe/unsafe, contract non-overwrite, RFC 6901, and complete unit-alias controls
  fail closed. A governing budget or internal stop retains reserved diagnostic capacity
  even when a nested validation batch already exhausted the 32-record cap; inherited
  omitted counts remain exact.
- `cortexel source render <adapter-id> <input|->` now performs source adaptation,
  complete request validation, canonical raw-boundary re-entry, derivation, rendering,
  and existing safe two-file publication in one process. Its versioned JSON result
  binds adapter revision, source-catalog digest and digest domain, request digest, and
  artifact digest while stating `sourceAuthentication: not_performed`. This metadata
  binds the canonical adapted request, not the original source-envelope bytes or
  custody, and is not an authenticated source receipt.
- For successful inputs, direct source rendering and explicit `source adapt` then
  `render` composition produce byte-identical canonical requests, artifacts, and SVGs.
  Direct rendering is recommended for agents because ordinary shell pipeline status
  can mask an upstream adapter failure unless every stage is checked explicitly.
  Parse, adapter, render-budget, and prepublication occupancy/lock/symlink refusals
  retain their existing exit classes and publish no output. Publication remains an
  intentionally ordered two-file boundary: the SVG is installed before its completion
  artifact, so a mid-publication failure may leave an SVG without the artifact; that
  state is incomplete and never reported as success.
- Request validation and figure acceptance are now described separately. `validate`
  proves identity, structure, semantics, scientific/provenance rules, and request
  budgets; `render --dry-run` or `source render --dry-run` is required to prove
  derivation and output-budget acceptance. The Python port distinguishes an absent
  contract from a present malformed member but remains explicitly partial and exposes
  no safe-repair API or repair-parity claim.

### Changed — source-faithful NEST spike-recorder clock profile

- `neuro.spike_raster` is now revision 6, `figure.spike_raster` is revision 7, and
  their coordinated semantic, disclosure, and OutputAuthority identities cover a
  source-faithful NEST 3.10.0 clock profile. The contract retains finite-stop and
  positive-infinity/capture-bounded request shapes without transferring evidence from
  superseded adapter profiles.
- NEST spike-recorder adapter revision 5 is the sole executable profile. Its keyed
  `finiteStop` branch uses projection v1 and capture-authority profile v3, retaining
  `(origin+start,origin+stop]`; `positiveInfinityCaptureBounded` uses projection v2 and
  capture-authority profile v4, retaining `(origin+start,capture]`. Both use one v5
  adapter-input digest domain. Historical adapter v3 and capture-authority v1/v2 records
  remain non-executable migration identities.
- Revision 5 reproduces pinned NEST `Time::get_ms()` as a stored binary64 reciprocal
  followed by a stored multiplication, adds integer tics before projection, and admits
  only a conservative safe-integer, inverse-round-trippable, adjacent-grid-distinguishable
  clock subset below NEST's resolution-adjusted finite-Time ceiling. The exact
  LP64/int64/binary64 build and floating-point profile is caller-declared; structural
  acceptance is not build or active-rounding-mode attestation.
- The positive-infinity branch admits only the typed
  `{ "kind": "nest_time_positive_infinity" }` token. A raw numeric `DBL_MAX` is
  rejected. Capture-authority profile v4 requires a finite `captureTime` immediately
  after a successful *advancing* `Simulate` or `Run` return and before any further
  advance or mutation. Capture is not a configured stop or recorder deactivation, and
  nothing after capture is established.
- `source describe nest-spike-recorder` now gives agents the revision-5 typed-sentinel
  example and both exact branch boundaries. The adapter remains detached plain-data
  code: every build, projection, capture, process, history, wiring, and sender-universe
  fact is caller-declared, not simulator attestation.
- The packed-runtime smoke executes both closed adapter branches from the shipped
  digest-bound source descriptor instead of maintaining a second handwritten capture
  authority fixture. A future adapter revision cannot leave package verification on a
  historical profile without failing its branch-inventory regression.
- The versioned `nest-spike-recorder.v5` conformance profile specifies both branches and
  their positive and negative cases. Release gate R049 remains `NOT_RUN`: source
  inspection, an exact wheel installation, official-example execution, and ad hoc probes
  are not a durable isolated receipt binding the wheel, toolchain, floating-point
  environment, harness bytes, and results.

### Fixed — NEST adapter capability evidence

- Stable-contract adapter metadata now uses composite mappings with stable source ids,
  exactly one primary source, explicit required/optional companions, separate
  feasibility and executable-availability states, and a reserved normative-definition
  boundary. Contract source v1 cannot encode `specified` and requires
  `authorityRequirements: null` until a closed mapping-definition authority exists;
  enum promotion plus prose, pointers, code, schemas or gates cannot forge one. The
  generated TypeScript/Python catalogs and contract manifest retain these boundaries, and
  generation rejects any `packaged` or `source_only` claim absent from the closed
  source implementation inventory. The NEST rank-local degree assessment also states
  explicitly that it supports only complete local in-degree and that out-degree fails
  with `SCOPE_OUT_DEGREE_FROM_RANK_LOCAL`.
- Source ids identify stable mapping roles/profiles rather than runtime instances, so
  role-distinct inputs may share one provider `system` class. The packaged
  spike-recorder implementation, request schema, source identity, and R049 requirement
  do not amount to a separate closed
  source-to-request specification. All feasible prose rows remain honestly
  `not_specified`; core-NWB profiles with no connectivity carrier are assessed
  infeasible rather than left as roadmap entries.
- The implementation inventory and the executable mapping bind the exact immutable
  definition of release gate `R049`. Mutable gate status, evidence, receipts, and
  tested-source identities remain solely in the release ledger, so a valid
  `NOT_RUN`→`PASS` evidence-only authorization does not change generated package
  semantics or create a self-referential release.
- `cortexel/adapters/nest` no longer claims that live PyNEST integration exists in the
  Python package. Neither runtime starts or introspects NEST; the one packaged
  FigureRequestV1 adapter accepts the bounded plain-data shapes of caller-declared exact
  NEST 3.10.0 memory spike-recorder profiles. Its executable revision-5 finite-stop and
  positive-infinity/capture-bounded branches are described above. A final
  status and `n_events` value cannot
  prove that the buffer was not reset, configuration or wiring remained fixed, the
  capture endpoint was reached after a successful return, the kernel clock remained
  monotonic, the NumPy arrays were projected losslessly, or MPI ranks were merged. The adapter
  therefore requires a closed capture-authority declaration covering the branch-specific
  finite-stop or finite-capture endpoint, exact integer-tic/grid preimages, most recent
  buffer epoch and recording-plan mutation, monotonic kernel clock epoch, complete sender
  universe, exact single-process scope, status-read method, and runtime resolution. It
  accepts local thread-sibling merging but refuses MPI/premerged claims.
  The source digest binds only the detached plain-data projection; a second
  domain-separated digest binds that projection to every normalized option. Neither
  digest authenticates the
  runtime or any declared capture fact. NEST 3.9, bare 3.10, and other patches fail
  closed until separately pinned and evidenced. Its broad immutable R049 definition is
  unchanged, its exact conformance obligations live in the versioned adapter profile,
  and its upstream gate remains `NOT_RUN` in the release ledger.
- The versioned `1.1` audit now binds two independently validated source
  artifacts at official NEST v3.10 commit
  `acca9704da248750219a027db99fec6cd1f9052a`: the complete byte-bound
  162-leaf PyNEST `pynest/examples` tree plus its
  documentation/default-runner selector scope, and an exact 784-blob selected
  documentation-source scope. The example artifact inventories 112 Python paths
  and twelve PNG/GIF/SVG assets. All 38 auxiliary leaves are byte-bound and carry
  closed structural roles, but remain outside visualization classification and
  runtime-dependency closure.
  Every selected
  documentation blob carries path bytes, Git mode/SHA-1, independent SHA-256, and byte
  length; bounded classifiers distinguish UserDocs definitions, stored notebook PNGs,
  documentation-script figures/saves, authored diagrams, and public plotting modules.
  These scopes are not a Sphinx/CMake build closure, visualization-definition closure,
  execution receipt, stable mapping, renderer-parity result, or scientific certificate.
  In that retained V1 source-authority artifact, every downstream visualization count
  remains zero and `coverageClaim` remains `none`. The separate V2 semantic
  classification described above closes the reviewed Python bodies without changing
  any execution, example-specific mapping, parity, or certification count from zero.
  The limitations ledger now correctly distinguishes representability from adapter
  evidence: stable `neuro.phase_plane` can encode supplied vector fields,
  trajectories, nullclines, and fixed points, but no executable adapter or executed
  parity result currently binds the pinned `hh_phaseplane.py` example.
- Both generators create worktree-free Git object databases and perform one minimal
  blobless smart-HTTPS fetch for the pinned commit/tree structure under an empty
  controlled home, no ambient Git configuration, `.netrc`, credential helpers,
  proxies, tracing, or exported secrets. They derive their exact tree-selected
  path/blob reference sets, remove the remote, partial-clone configuration and
  checked acquisition sidecars, reject checkout/sparse/alternate/network residue,
  verify retained packs, and prove an exact 137-object commit/tree-only closure
  before importing selected blobs. The example generator alone pins this initial
  Git fetch to `http.version=HTTP/1.1`; the documentation generator makes no such
  transport-version claim.
  A separate shared raw-HTTPS boundary retrieves exactly 160 example references or
  784 documentation references from the fixed
  `raw.githubusercontent.com/<owner>/<repository>/<commit>/<path>` namespace. It
  rejects redirects, authentication/cookies/proxy authority, content encodings,
  ambiguous length/transfer framing, non-binary chunks, byte/event/time overflow,
  and response bytes whose canonical Git blob SHA-1 does not equal the tree-selected
  identity. Exact producer limits are concurrency four, four attempts, a 90-second
  nonempty-body idle deadline, a five-minute absolute request deadline, and a
  15-minute global deadline. Body budgets cover emitted HTTP-200 application chunks,
  not aggregate headers, TLS framing, DNS, or socket/kernel buffering; event-loop
  timers cannot preempt synchronous work or a stalled event loop.
  Accepted bytes are exclusively staged as current-UID mode-`0600` regular files.
  One positional `git hash-object -w --no-filters -- <reviewed staged paths...>`
  invocation must reproduce every identity with exact stdout and empty stderr.
  Staging is removed before a fresh final closure proof: exactly 297 objects for the
  example artifact and 921 for the documentation artifact. Every admitted object is
  then reread with lazy fetching disabled, canonical-Git-rehashed, SHA-256-rehashed,
  and bound by a complete content-set seal. Each Git command uses a staged supported
  Node control runtime, reviewed Git executable authority, copied bounded binary
  input, bounded output/time/status, a closed environment, and the live guardian.
  This does not close Git's helper/dynamic-library graph, provide a reproducible
  acquisition receipt, impose a hostile-server input-byte quota on the initial
  structural pack, or contain a malicious same-UID process that deliberately escapes
  its process group.
  Sparse, checkout, temporary-pack, alternate and network residue fail closed, and both
  generated artifacts must pass their pinned semantic validators before publication.
  Their `--output` paths use exclusive no-clobber publication with required file
  and parent-directory `fsync`; stdout mode remains an ordinary stream. Successful
  `fsync` calls do not prove persistence across power loss, backing-device behavior,
  or storage-stack semantics. Output paths and UTF-8 content now cross primitive
  4-KiB/16-MiB admission bounds before any filesystem work. Deterministic fault
  controls cover a foreign target winning the hard-link race, ambiguous hard-link
  completion after the target was created, later failure, and ambiguous closes
  without descriptor-number retries. A failed publication requires manual inspection
  whenever target absence cannot be established.
  Direct release-metadata reads likewise require primitive 4-KiB paths with at most
  64 components and an exact single-link regular leaf, then open the final no-follow
  pathname nonblocking; a deterministic regular-file-to-FIFO race now fails before
  any blocking read, and a simultaneous read/ambiguous-close failure retains both
  causes without retrying the descriptor number.
  Acquisition roots require current real/effective UID equality, exact `0700`
  permission/special bits, and path/descriptor ACL authority. The complete resolved
  ancestor chain excludes ordinary different-UID entry replacement through unsafe
  writable parents. Darwin uses its native extended-ACL query but does not establish
  filesystem implementation or locality. Linux accepts only the reviewed ext-family
  and tmpfs VFS types through `fstatfs` and `libacl`, and separately
  rejects listed alternate ACL namespaces. Linux VFS types with distinct network,
  stacked, unknown, unsupported, or indeterminate ACL models fail closed. Filesystem
  magic does not establish backing-device locality or exclude lower-layer stacking.
  Linux pathname ACL inspection is nonblocking and rejects FIFOs and other special
  file types. The helper source is read through a bounded no-follow/nonblocking
  descriptor, pinned by SHA-256, executed from those copied bytes on stdin, and
  rechecked by path, descriptor, bytes, and digest after every run. ACL subject
  admission copies only the three enumerable semantic fields without enumerating
  inert non-enumerable or symbol metadata.
  The checks are not containment against root or DAC/ownership-bypassing capabilities,
  mount-namespace changes, or another process with the
  current UID. Additional VFS types require their own
  reviewed profile and native controls. Mutable audit evidence remains outside
  contract/package semantics.
- The offline CLI now exposes compact adapter status in `catalog --json` and a
  `describe <stable-skill-id> [--json]` command generated from the exact packaged
  catalog. Its closed `--section summary|example|schema|all` projection lets an agent
  request the small synthetic fixture before spending prompt budget on the complete
  schema. Non-`all` sections retain only compact identity/routing/availability metadata;
  omitting `--section` retains the full bundle. The full JSON form carries the complete composed per-skill structural schema
  and its two packaged offline reference resources, one living synthetic-fixture request,
  composite source roles, evidence boundaries,
  packaged implementation availability, immutable certification requirements, and
  known limitations. It remains a
  discovery/authoring aid, not a live PyNEST adapter or external-provenance proof.
- The offline CLI now also exposes a separate closed executable source-adapter
  inventory through `source catalog`, complete digest-bound adapter discovery through
  `source describe`, and a bounded duplicate-key-safe
  `source adapt <adapter-id> <input|->` boundary. The only living id is
  `nest-spike-recorder`; its copyable input uses the full caller-declared revision-5
  positive-infinity branch, while finite input uses revision 5's `finiteStop` branch.
  Historical revision-3 input is refused with a migration diagnostic. The CLI emits canonical request JSON only after both the
  adapter and the complete stable FigureRequest pipeline succeed. Candidate mappings,
  live PyNEST capture, other NEST profiles, and mutable R049 status are not promoted by
  discovery. The same deeply frozen source catalog, guarded lookup, and digest are
  available from `cortexel/authoring`.
- A dependency-free `cortexel/authoring` subpath now exposes the same deeply frozen
  catalog metadata, schema resources, versioned Ajv compile profile, and synthetic
  fixtures without loading them into every `cortexel/figure` consumer. The profile
  is bound by `catalogDigest` and records the two intentional Ajv lint exceptions
  whose context-aware equivalents run in the generator. The independent Python reader adds detached
  `list_skills()` / `describe_skill()` discovery while continuing to refuse full
  semantic certification for its explicitly partial validator port.
- `catalogDigest` now uses the registry-owned, domain-separated
  `cortexel-public-stable-catalog.v2` preimage. It binds the exact public stable
  entries plus the shared offline structural-schema resources; stable schemas,
  synthetic examples, scientific/accessibility claims, source mappings,
  availability, evidence boundaries, limits, and known limitations can no longer
  change behind an unchanged digest. The 0.9 line's manifest v1 used an
  implicit tuple-only `{id, revision, renderer}` projection. Verifiers must read the
  shipped `catalogDigestDomain`; package version plus the corresponding manifest
  resolves the algorithm. FigureArtifactV1 contract 1.0 does not duplicate the
  domain field.

### Fixed — bounded cross-language parity subprocesses

- Cross-language parity tests now give each direct Python child a 60-second
  timeout. A stalled synchronous child can no longer bypass Vitest's test timeout
  and block the release gate indefinitely.
- The Python parity child runs with `-B`, and the harness no longer creates an
  unused cache directory. Read-only parity checks therefore leave no ambient
  bytecode or directory state behind.

### Fixed — legacy scientific and portable-contract authority

- Legacy `VizSpec` is now `1.5.0`, the skill axis is `1.8.0`, and the generated
  manifest plus portable constraint language are version `11`. Stored `1.4.0`
  payloads refuse rather than receiving the new skill-aware rules under an old
  stamp.
- `nest.phase_plane` now requires an explicit shared derivative time unit, two
  non-degenerate strictly increasing axes, exact numerator/time unit labels, and
  a portable direction-basis constraint. Per-second components use one binary64
  division by 1000; a nonzero component that would underflow to zero fails
  closed. Zero derivatives remain visible samples and are not promoted to
  equilibria.
- Literal adjacency, weight, and delay matrices plus both degree distributions
  reject target-rank-local snapshots at the raw-transform, strict-schema, and
  independent manifest-evaluator boundaries. Missing cells and zero degrees are
  not accepted without exact rank-owned target and cross-rank edge authority.
- Measured weight/delay aggregates reject multiple observed synapse models while
  the contract has one global unit and no cross-model compatibility/conversion
  authority.
- `synapseCollectionToWeightHistogramParams` derives bounded half-open bins from
  one raw weight/model channel complete for the declared scope, preserves exact
  integer observation mass, rejects clipping and mixed models, and publishes its
  transform metadata.
  Standalone aggregate params carry no raw-entry receipt, so the
  one-entry/one-observation provenance remains explicitly external.
- `correlationDetectorToCorrelogramParams` now requires the documented receptor
  port order, simulation resolution, and simulation bounds; it checks an exact
  positive odd resolution multiple and both `tau_max` edge margins. Population
  labels and caller-supplied source configuration remain external authority, and
  the manifest says so.

### Fixed — renderer accessibility and perception evidence

- The experimental legacy knowledge-graph scene no longer reads or mutates its
  remembered-position authority during React render. A committed effect builds
  detached d3 node/link state plus two bounded cache buffers. Every
  position-changing callback fills only the non-authoritative buffer and swaps the
  complete Map after its simulation, CPU-side matrix/buffer, camera, controls, and
  invalidation steps complete. This is intentionally not evidence that R3F's later
  GPU upload or draw succeeded. Abandoned renders, replayed Strict effects, and
  callback failures therefore cannot seed a later layout with partial or placeholder
  positions, while same-snapshot
  filters retain deterministic warm-start continuity. A changed graph remains
  hidden and its handlers refuse to intercept events until the first complete
  current-runtime CPU preparation callback.
- Knowledge-graph focus-label canvas/GPU resources are now created after commit,
  invalidated for demand rendering, and disposed exactly once by the matching
  layout-effect cleanup or by setup rollback. A throwing host invalidator cannot
  leave a texture attached or skip disposal. R3F store subscriptions select only
  the camera, renderer, and invalidator. Optional host-control cancellation now
  attaches only when an exact add/remove event pair exists, retains cleanup authority
  across throws, and rolls back a partially failed attachment.
- Direct knowledge-graph scene, DOM-list, and legend inputs are budget-checked before
  being copied into detached presentation records; public record fields are readonly.
  The runtime still re-derives content after same-array JavaScript mutations instead
  of retaining stale WebGL identities or DOM relationships. Relationship paging is
  retained across content-equal parent rerenders and clamps synchronously when a live
  graph shrinks, so assistive technology never receives an empty out-of-range page.
- The bounded flow-particle budget is distributed across every marked relationship
  instead of assigning four markers only to the first edges under the live-force cap.
  At the 1,000-edge live ceiling every flow edge retains one static/animated cue, so the
  text legend no longer promises a marker that the scene omitted. The separate 4,000-
  relationship presentation/DOM ceiling does not imply a mounted force scene.
- The experimental legacy knowledge-graph memo signature now uses
  type-and-presence-tagged length framing. An absent optional assertion id, kind, or
  color can no longer collide with an explicit empty string and retain stale
  simulation/edge state across a semantically material React update.
- The legacy corpus mapper now refuses dangling, self-loop, duplicate, or otherwise
  unrenderable assertions instead of silently dropping scientific relationships.
  Edge identity follows effective rendered direction rather than a `same_as` name
  heuristic, undirected edges cannot carry directional flow particles, and
  contract-owned direction/flow can no longer be overridden as host styling.
- The Engram corpus adapter rejects naked `confidence`; an optional score must carry
  its exact uncalibrated discriminator and the stable edge-kind/score gate must
  accept that declared meaning. Edge kind is no longer used to invent semantics.
- The legacy Engram corpus adapter no longer fabricates
  `graph_snapshot_record` anchors from entity/assertion ids. Every upstream node and
  assertion must provide its own typed evidence references; Cortexel validates and
  retains them unchanged. The legacy surface still has no evidence-record inventory,
  so reference shape is not source authentication and the caller-supplied snapshot id
  remains unverified.
- Mapped corpus graphs expose a collision-free encoding of their complete declared
  graph context. Both `KnowledgeGraph3DScene` and `KnowledgeGraphA11yList` require
  that cache namespace and use independent React key boundaries, so a changed
  namespace remounts scene-owned positions, one-time framing status, pending
  selection-camera intent, and accessible pager/disclosure state. Same-key filters
  retain continuity. The host-owned camera/controls target plus controlled selection
  and hover remain host state and must be reset or reframed by that host where required.
  Radius prose now names its full mapped-snapshot degree basis rather than falsely
  implying host-filtered visible degree. The identity is neither a graph-content
  digest nor independent authentication.
- Normative SVGs now expose deduplicated panel summaries and explicit no-data
  reasons through a second referenced description. Essential unencoded spatial,
  graph, and phase-plane marks use the theme axis token instead of the
  low-contrast grid token.
- Palette prose now distinguishes source-described colormap properties and
  structural dash/marker uniqueness from Cortexel-tested evidence. Selected token
  and owned-mark checks are not presented as whole-figure WCAG, grayscale,
  colour-vision-deficiency, host-page, or assistive-technology conformance.
- Legacy React figures bind the mandatory honesty caption with
  `aria-describedby`, render a singleton plasticity observation as a visible
  point, and render zero-derivative phase samples as disclosed rings.
- All fourteen stable renderer identities move one revision because normative
  SVG accessibility/colour bytes changed: phase plane moves from 5 to 6 and the
  other stable renderers move from 4 to 5. The affected skill renderer references
  move in lockstep.

### Fixed — live-guardian Python package subprocess cleanup

- The Python build-evidence gate now launches each reviewed target behind a live
  POSIX session/process-group guardian. An unlinked bounded descriptor carries the
  canonical target request, the supervisor owns an exclusive close-only lease, and
  a non-leader worker remains the target's immediate parent. Killing that parent no
  longer releases the guardian's group-number anchor. The worker restores default
  `INT`/`TERM`/`HUP` dispositions and unblocks them before target launch.
- Target completion, worker loss, timeout, output overflow, and deferred
  `INT`/`TERM`/`HUP` converge on one guardian-local sweep. The guardian publishes a
  nonce-bound canonical status and makes the only group signal with its self-derived
  PGID while it is still the live, unreaped leader. The supervisor contains no
  numeric PID/PGID signal or probe fallback. Stdout and stderr are always piped;
  observed bytes share the fixed budget until an error latches, after which cleanup
  drains and discards without claiming a complete throughput count. `capture_output`
  controls retention only. After EOF or the cleanup deadline the
  supervisor closes descriptors and crosses one guardian
  raw-`waitpid` boundary. Exact `SIGKILL` termination and protocol status are both required;
  external reaping, direct guardian loss, malformed framing, and unexpected exit
  fail closed. Default `SIGCHLD`, one Python/kernel-visible thread, no active
  trace/profile callback, and rejection of callable Python signal handlers outside the
  handled cancellation set establish exclusive reaper authority. The supervisor blocks
  only `SIGCHLD` plus `INT`/`TERM`/`HUP` and restores the caller's exact mask; the target
  receives default, unblocked cancellation signals. The `Popen` destructor
  is disarmed before the one-way syscall, and no signal, query, or second wait follows
  the reap. A negative control raw-reaps the child behind the `Popen` object's back and
  proves that the resulting `ECHILD` path fails closed without `killpg`, numeric PID
  signal, `waitid`, or any other post-reap identity action. Parent launch-resource
  closes are exhaustive. Any close exception is
  ambiguous, so the standalone smoke worker immediately `_exit(70)` and lets kernel
  teardown revoke every possibly-live capability rather than retrying a reusable fd.
- Regression controls cover success, nonzero and signaled targets, timeout, output
  overflow, deferred cancellation, same-group descendants, target-directed worker
  death, direct guardian loss, external reaping, missing-target launch, canonical
  protocol closure, destructor behavior, and deliberate detachment plus inherited-
  pipe retention, including failed-spawn and post-spawn resource-close faults. This is
  still same-authority group cleanup, not hostile process
  containment: same-UID guardian killing, detachment/regrouping, credential or
  security-label changes, retained lease/output descriptors, hostile same-process
  interference, owner death, whole-group `SIGSTOP`, and kernel/OS failure require an
  external cgroup, sandbox, or VM. A stopped guardian cannot consume lease EOF and can
  leave the sole blocking wait hung; observed status plus `SIGKILL` is also not an
  independent receipt that the guardian, rather than a same-UID target in the
  status/self-sweep interval, delivered the signal.

- Reviewed Node command records advance to v4, with guardian READY v3 and lifetime
  authority v2. The exact launcher now creates and actively drains a dedicated
  zero-data lifetime pipe instead of relying on Bun `spawnSync` to wait for an inherited
  stdout writer. It installs data/end/error observers before one exact `ARM` frame lets
  the supervisor create the guardian. The supervisor derives the child endpoint's exact
  `fstat` identity, binds it through the guardian's canonical READY echo, rechecks it,
  and closes its copy exactly once; the guardian retains the endpoint but never passes
  it to the worker or target. The launcher publishes buffered protocol only after both
  supervisor `close` and real peer `end`; bytes and local close/error fail closed without
  masquerading as EOF. This closes the observed Linux/Bun supervisor-`SIGKILL` return
  race while the launcher remains alive. Launcher `SIGKILL`, OOM loss, and the outer
  hard kill still require external owner-death containment and are documented without
  claiming that descendant-held stdout delays Bun's return.

### Fixed — restrictive-umask Python package fixture

- The Python package boundary fixture now assigns exact directory modes after
  creation. It passes under the release harness `umask 077` and still rejects a
  retained package directory whose mode differs from `0755`.

### Fixed — sandbox-portable package supervision tests

- Package supervision tests no longer launch `ps` from reviewed child code.
  macOS `sandbox-exec` rejects that launch even with an allow-default profile.
  Identity-bound FIFO leases now prove when reviewed lifetimes close, without
  postmortem PID/PGID probes. Gated rendezvous tests separately cover worker,
  guardian, and supervisor death before `GO`, supervisor `SIGKILL` after `GO`,
  direct guardian loss, descendant cleanup, and the no-signal boundary after the
  guardian has been reaped.

### Fixed — phase-plane derivative and accessibility authority

- Physical derivative components now compose the exact state-unit and
  reciprocal-time factors with the received binary64 value before one final
  ties-to-even rounding. Axis-normalized components likewise combine any
  reciprocal-time conversion with the exact finite endpoint difference before
  rounding once. Cancelling factors can no longer double-round or erase a
  representable subnormal component.
- The phase-plane derivation receipt records structured coordinate transforms,
  every physical or axis-normalized component transform, exact conversion
  authority, and conversion counts. The bounded mandatory unit disclosure
  inventories those transform classes, including composite derivative
  conversions whose net factor is one, while leaving complete replay factors in
  the receipt. The independent OutputAuthority evaluator uses the same exact
  arithmetic contract while deriving table values and disclosures directly from
  the canonical request.
- FigureArtifactV1 now closes the phase-plane carrier operation at its exact id,
  algorithm revision, parameters, receipt, and input/output digests. Its
  post-schema relation independently replays every converted carrier, trajectory
  table speed, time-authority record, and convergence flag; deleting,
  relabelling, duplicating, or forging the operation remains refused even after
  recomputing the outer artifact digest. Historical open operation payloads
  remain available only to unrelated skills.
- The single trajectory `timeDirection` is explicitly global to one
  FigureRequest and is checked independently within each stably grouped
  trajectory identity, including interleaved and missing-coordinate rows.
  `reject` requires strict time; `keep_replicates` retains equal-time rows in the
  table but makes every equality a hard geometry break with no crossing segment
  or arrow. Accessible spans use the true global minimum and maximum, and marker
  prose now admits disabled, short, equal-time, zero-duration, and
  zero-geometric-length cases that emit no marker. Mixed forward/backward
  portraits require separate FigureRequests.
- The accessibility summary is conditional on the supplied carrier mix.
  Field-only figures no longer claim trajectories or annotations,
  trajectory-only figures no longer claim a vector field, annotation text
  distinguishes nullclines from fixed points, and `directionMarkers.mode =
  none` explicitly states that no trajectory direction markers are drawn.
  Requested marker modes describe their zero-length and insufficient-run cases
  without claiming that an arrow was emitted.
- The at-most-eight nullclines with drawable or isolated finite points use
  mutually distinct registered categorical dash and marker tokens in the plot
  and exact matching legend tokens, so identities within that drawn nullcline
  set remain distinguishable when hue is unavailable. Empty declarations remain
  explicit in the legend and summary count; all-missing declarations also retain
  their supplied missing table rows, and neither receives invented geometry.
  Vector-field legend text now distinguishes
  magnitude-encoded modes from `unit_length`, for which magnitude does not
  affect arrow length. This does not establish uniqueness against trajectory styles, which
  retain the documented eight-style cycling limitation. `neuro.phase_plane`,
  `figure.phase_plane`, and its OutputAuthority evaluator move together to
  revision 5 because both scientific values and normative SVG description/style
  bytes changed.

### Fixed — NEST delay-resolution scientific erratum

- Stable skill revision 4 incorrectly described `sourceResolution` on
  `network.delay_distribution` and `simulationResolution` on
  `network.delay_matrix` as establishing a universal NEST delay lattice. In the
  verified NEST 3.9/3.10 behavior, normal `Connect` assignment rounds to the
  simulation resolution, but `cont_delay_synapse` model defaults supplied through
  `CopyModel` or `SetDefaults`, and per-connection values changed after creation
  through `SynapseCollection.set` (legacy `SetStatus`), can retain valid off-grid delays.
  Revision 5 records resolution as context only, preserves those values without
  snapping, and keeps the model-conditioned lower bound as an explicitly
  unenforced limitation.
- Both affected skills and their OutputAuthority evaluator identities move to
  revision 5. Their shared renderer revisions remain 4 because the rendering
  algorithms did not change. Explicit revision-4 request pins now refuse instead
  of silently receiving the corrected interpretation; existing revision-4
  artifacts retain their recorded identity and are not reinterpreted in place.
  The request and artifact contract lines remain `1.0`, while the contract and
  stable-catalog digests change with the corrected stable promise.
- The NEST entries in both V1 contracts are now labelled as planned mapping
  recipes rather than executable adapters. This repository does not yet ship a
  V1 adapter capable of authenticating the synapse model and assignment path.

### Fixed — legacy topology chart evidence

- The large-parameter preflight now admits schema-valid empty connection-graph
  edge lists and empty adjacency/weight/delay matrix cell lists while retaining
  the existing node, axis, and upper resource bounds. All-absent snapshots
  therefore reach the strict invocation boundary and canonical React renderer
  instead of failing before their schemas can validate them.
- Matrix descriptions and legends now follow the selected analysis: adjacency
  reports binary presence only, delay reports strictly positive delays only, and
  weight alone reports signed values and present zero-weight cells. Adjacency
  presence uses the neutral theme foreground rather than a semantic excitatory
  token, so topology-only evidence cannot imply E/I identity. The default palette
  keeps that foreground distinct from both supported theme backgrounds; registered
  palettes remain subject to the documented contrast limitation. Signed weights
  use cool and warm brand hues for numeric sign only, while delays use neutral teal
  for positive magnitude; none of these colors assert synapse identity. The low-level
  public `ReferenceChartScene` also revalidates its exact registered skill,
  scene, and params before dispatch, so a mismatched discriminator cannot borrow
  another analysis renderer. This low-level guard does not validate provenance
  or bind an honesty caption; untrusted complete specs still require
  `ReferenceVizSpecFigure`.
- Measurement-bearing legacy connection transforms and the measured
  `getConnectionsToSceneData` path now bind a complete per-row synapse-model
  channel to an exact, bounded per-model declaration of whether weight and delay
  are effective, ignored, or unknown. Present channels render only when every
  observed model declares them effective; endpoint-only adapter and graph calls
  retain their model-free API, and unused nonempty declarations fail closed.
  Adapter measurement units are likewise accepted exactly with their raw
  channel; empty measured snapshots validate the claim but omit unit metadata
  when no edge carries a measurement, preserving valid empty `SceneData`.
  Exact official ignored-field semantics for `gap_junction`,
  `rate_connection_instantaneous`, and `diffusion_connection` cannot be
  relabelled by callers; copied/custom names remain explicit caller truth claims.
- Legacy weight-matrix sums and means now reuse the exact finite-binary64
  accumulator: all contributors are combined exactly before one
  round-to-nearest-ties-to-even, the result is permutation-invariant, negative
  zero is canonicalized, and underflow/overflow fail closed instead of turning a
  nonzero aggregate into a measured zero.

### Fixed — exact correlogram and output authority

- `neuro.correlogram` and `figure.correlogram` now publish revision 4, and the
  versioned `correlogram.pair_count_and_rate` derivation publishes algorithm
  revision 2. Raw-event lags are classified from the exact typed difference
  `target_time - reference_time` before one rounded conversion; if that rounded
  value would select a different bin, the request fails closed. Absolute event
  clocks are never converted separately and then subtracted.
- Edge-corrected numerators now use the identical reference-ordinal eligibility
  interval as their denominator. Stable per-train time/source-ordinal ordering and
  exact target slices preflight only the admitted numerator work, so a large but
  lag-sparse or edge-ineligible Cartesian product is not refused merely for being
  large. The published complexity includes the binary searches over the lag-bin
  ladder, and typed failures map back to the exact role-local request field rather
  than collapsing every diagnostic to `/data`.
- Raw-event pair accounting partitions the exact candidate product into counted,
  lag-out-of-range, in-range edge-ineligible, and same-event-self-pair classes.
  Pre-binned input retains only the aggregate not-counted remainder and explicitly
  reports that the finer split is unavailable. An independent OutputAuthority
  evaluator recomputes the same table and summary facts without calling the
  compiler kernel. Unit disclosures identify terms in exact lag differences rather
  than implying that absolute event clocks were individually converted.
- The legacy NEST correlation-detector projection now accepts only documented
  `count_histogram` data with an included zero-lag policy. It no longer invents
  units for NEST's weighted histogram or claims that the upstream detector removed
  same-event self-pairs. Randomized exact-integer and boundary regressions support
  these implementation claims; NEST/Elephant differential evidence remains
  `NOT_RUN`, and the skill remains `releaseReady: false`.

### Fixed — SVG naming and vertical-axis geometry

- Both SVG paths now use the figure `<title>` only for `aria-labelledby` and the
  complete summary only for `aria-describedby`, rather than concatenating the
  description into the accessible name.
- Normative left and right axis labels are rotated in their conventional directions
  around deterministic, viewport-bounded pivots. A bounded `textLength` keeps even
  long labels inside the serialized headless geometry without dropping their text.
- Because these changes alter the serialized output of every stable SVG renderer, all
  nineteen stable skills and all fourteen stable renderers now publish revision 4 as
  one coordinated output-identity boundary. Correlogram had already moved to revision
  4 with its scientific correction; the other eighteen skills and thirteen renderers
  move from revision 3 to 4, and an explicit revision-3 skill pin refuses rather than
  silently receiving changed SVG bytes. The contract requires each OutputAuthority
  evaluator ID to carry its owning skill revision, so the other eighteen evaluator
  registrations also move to `v4` and all nineteen are now aligned. Their
  non-correlogram implementation logic is unchanged; the coordinated identifier is not
  a claim of a new evaluator algorithm.
- These regressions establish deterministic ARIA references and bounded SVG geometry
  only. They do not establish assistive-technology behavior, WCAG conformance,
  palette contrast, zoom/reflow behavior, or publication accessibility.

### Fixed — inspectable package smoke

- The package smoke now has an explicit two-phase release boundary. A networked
  `prepare` uses one reviewed, exact npm lock with install scripts disabled to
  materialize separate core-only, charts-only, and full consumer trees in a
  caller-owned workspace. Its canonical JSON output exposes all three
  `node_modules` roots and a prepared-state digest so an outer release harness can
  inspect the complete installed closure before any consumer code runs.
- `execute` requires that carried state digest, verifies the sealed workspace
  (including read-only modes on POSIX) and fresh package tarball before and after the smoke, invokes no
  package manager, and preloads network/write denial into every Node consumer
  process. The no-argument developer command remains an ephemeral orchestration
  of the same prepare/execute contract.
- Child processes receive a closed operational environment and a fixed executable
  search path. Ambient API keys, package tokens, proxy credentials, Node/loader
  injection controls, npm configuration, and OpenSSL configuration cannot cross
  the package-smoke process boundary.
- Ordinary package-smoke child commands retain an exact 300,000 ms bound. The three
  closed, independently cold-cache npm consumer materializations use disjoint private
  cache directories and the shared reviewed-POSIX
  maximum of 900,000 ms each, under fixed `core`, `charts`, and `full` operation
  labels. These are per-command rather than aggregate or hostile-hard-deadline
  guarantees. Core and charts do not retry; full has only the current strict
  optional-subset same-cache recovery described above. No caller-controlled retry or
  override is admitted. Timeout/overflow
  diagnostics expose the fixed label and bound without argv, cwd, environment,
  executable path, or child output. The CI package-smoke job now has a 60-minute
  outer bound so it does not routinely preempt the three sequential installations.
- Every executable entry point now runs through an operation-scoped,
  descriptor-acquired private copy of the exact reviewed Node bytes. Prepared-state
  v3 retains the original source Node's stable bytes, metadata, and path ancestry—not
  the ephemeral staged pathname, runtime root, or acquisition record—and binds the
  exact admitted npm manifest version, CLI, and bounded recursive package tree. Source
  and staged SHA-256 values must equal that prepared source digest, and their
  authorities are revalidated around every command before the private runtime is
  disposed. Staging
  copies only the bounded known Homebrew-relative `libnode.<number>.dylib` companions;
  neither that inventory nor the deliberately narrow prepared authority scope claims
  a closed Node dynamic-library/OS authority or the TypeScript harness runtime. The
  workspace seal now includes the finalized root identity and mode plus every controlling
  parent identity; the externally carried state digest separately binds the state leaf.
  That excluded leaf is exclusively reserved before sealing and durably published
  through its pinned descriptor, avoiding filesystem-specific root-link-count
  changes and state/seal circularity. Execute retains its first exact file
  authority and revalidates the leaf's digest, identity, ownership, and `0444`
  mode after active work.
  The staged reviewed Node executes a closed identity probe before dependency
  selection; prepared state binds its exact POSIX platform and architecture, requires
  platform agreement with the supervising host, and derives lock `os`/`cpu` selection
  from that runtime rather than Bun's architecture. Selector arrays have canonical
  positive/negative semantics, the singleton `any` spelling is explicit, and `libc`
  remains outside the supported closure. The exact fixture lock was regenerated under
  the reviewed legacy-peer policy: present `dev`, `optional`, and `devOptional` flags
  must be exactly `true`, `devOptional` cannot coexist with either constituent flag,
  and no normalization is allowed to bless an npm-rewritten hidden lock.
  A trusted detached guardian is the live leader of a fresh POSIX session/process
  group. It creates a gated non-leader worker, which alone starts the reviewed
  target. The supervisor holds the guardian's exclusive control lease and publishes
  only a boolean armed handshake; neither the outer caller nor any result contains
  a PID/PGID cleanup handle. Target loader/runtime variables are installed only by
  the worker for the target, never in the supervisor, guardian, or worker.
  Worker completion and guardian-local worker/protocol failures trigger the
  guardian directly. Timeout, output overflow, handled `TERM`/`INT`/`HUP`, and
  supervisor death close the exclusive lease; its EOF reaches the same sweep path.
  The still-live guardian publishes one bounded intent and owns the only explicit
  production process-group signaling site: it self-addresses `SIGKILL` to
  `-process.pid` while its unreaped leader identity pins the group number. The
  supervisor accepts only the exact
  intent, guardian exit by `SIGKILL`, canonical protocol EOF, and bounded
  stdout/stderr EOF. It performs no post-reap signal or identity probe; the outer
  caller has no numeric fallback.
  Host-side regular-file authority reads now use POSIX
  `O_NOFOLLOW|O_NONBLOCK` before descriptor type and identity proof; directory
  synchronization additionally uses `O_DIRECTORY`. Deterministic regressions
  exchange the reviewed Node executable, a finalized host probe, and a workspace
  seal input for FIFOs after `lstat` and prove bounded rejection.
  Direct guardian death, `EPERM`/`ESRCH`, malformed protocol, or a retained pipe
  fails closed without signaling a reusable identity. This boundary covers
  same-authority descendants that remain in the group, but it is not a sandbox
  against guardian discovery/signaling, deliberate detachment/re-grouping,
  inherited-pipe retention, a credential/security-label change, or whole-group
  `SIGSTOP`. A stopped guardian cannot consume lease EOF; the still-live launcher joins
  until its synchronous caller applies the outer hard kill. That kill can return before
  asynchronous group cleanup and is not hostile owner-death containment. These
  capabilities require an external cgroup/sandbox/VM. Windows fails closed until an
  equivalent reviewed Job Object boundary exists.
  One-way regression rendezvous cover pre-`GO` worker/guardian/supervisor
  killpoints, active supervisor `SIGKILL` lease EOF, direct guardian loss, target
  attempts to kill its immediate parent, and the absence of any post-reap signal.
  Binary-safe descriptor-backed output spools avoid base64 expansion in the control
  protocol. Protocol parsing, directory reads, and file hashes are allocation-bounded. Every
  installed package container, scope, package identity,
  `.bin` inventory/shim, and hidden lock entry is derived from the exact
  omit-filtered prepared lock at every nested depth; concealed package-management
  subtrees are rejected. Empty omitted-scope residue is selected only by the exact
  reviewed npm version: `10.9.0`, `10.9.8`, and `11.3.0` use the derived-residue
  profile, while `11.12.1`, `11.16.0`, `11.17.0`, and `11.18.0` forbid it.
- Generated browser-bundle helpers now construct their sealed import matchers from
  JSON-encoded pattern strings. A focused test executes those exact declarations under
  the reviewed Node and proves both accepted and rejected import spellings, preventing
  template-literal escape loss from turning prepare-time evidence into invalid code.
- The prepare boundary now independently decodes the produced gzip/USTAR bytes
  before any install. It rejects extension/link/special entries and archive
  ambiguity, proves exact path/size/mode/content parity with both npm's JSON and
  the reviewed source closure, and then proves each tar-owned installed file is
  byte-for-byte identical. Every bounded packed Markdown document is also scanned
  exactly once for a conservative syntactic over-approximation of inline/reference
  destinations, URI/email autolinks, and raw-HTML-like `href`/`src`/`srcset` targets.
  Code, comments, fences, raw-HTML blocks, and indentation do not suppress this scan;
  it deliberately fails closed on false positives instead of claiming CommonMark
  render equivalence. Angle-reference inspection advances monotonically through nested
  delimiters and has an explicit source-length work bound, so repeated `<` prefixes
  cannot induce suffix rescans. Relative targets must resolve inside the exact tar
  inventory, while external targets require explicit HTTPS. The execute boundary
  repeats the archive proof.

### Fixed — Python artifact and build-runtime closure

- The standalone Python wheel/sdist smoke now has a distinct Python 3.14.x
  package-build runtime, exact `uv` authority, finite subprocess and archive
  budgets, deterministic raw ZIP/gzip/USTAR inspection, and a byte-closed clean
  install probed under isolated no-site/no-bytecode mode. The installed package
  itself remains compatible with Python 3.11 and newer.
- The build backend is provisioned from a retained exact-five-wheel wheelhouse.
  URL, filename, distribution identity, version, and SHA-256 are fixed, and the
  installed site-packages file and directory inventory is compared directly to
  independently parsed wheel bytes. Installed `RECORD` files cannot bless a
  mutated backend or an injected PEP 420 namespace directory.
- Core Metadata fields, archive modes/attributes, hardlink and mutation identity,
  `pyvenv.cfg`, site customization, install metadata, and cumulative resource
  bounds now fail closed at the release-evidence boundary.
- Backend provisioning and the smoke run now share an explicit `umask 022`; the
  gate rejects any different ambient umask before work begins instead of letting
  caller-specific 0600/0700 modes make the exact installed closure irreproducible.
- Offline backend installation now explicitly selects uv's `copy` link mode in
  both CI and the documented recipe, so unique-file authority cannot vary with
  whether the wheelhouse and runtime happen to share a filesystem.
- Release harnesses can request a durable, canonical
  `cortexel-python-package-smoke-result.v1` JSON receipt with
  `verify --result-file ABS`. The exclusive 0644 result binds the final wheel and
  sdist bytes, package/source authority, exact schema counts, reviewed Python and
  uv executable bytes, and the complete retained backend-wheelhouse inventory;
  duplicate members, noncanonical JSON, path ambiguity, permission drift, and
  cross-field tampering fail closed.
- Receipt parsing has an implementation-independent JSON depth bound and stable
  readers rebind every pathname after close. The producer rejects output beneath
  any attested source, runtime, uv, or wheelhouse authority; binds Python/base/uv
  bytes and the already-validated backend-requirements lock before and after active
  work; and repeats source, runtime, wheelhouse, receipt, and parent-authority
  checks after the durable write. Output parents and receipts must have no
  discretionary ACL authority beyond their exact Unix modes. The Python 3.14 CI
  lane now exercises this complete result-mode path and strict reader end to end.
- The independent receipt reader now pins the canonical 0700 parent directory before
  opening the unique 0644 result leaf relative to that descriptor, then rechecks both
  identities and their path/descriptor ACL authority around strict semantic parsing.
  Parent rebinds, leaf replacements, and unsupported ACL APIs fail closed; CI exercises
  real Linux access and default ACLs with `setfacl`.
- The CI evidence lane is pinned to Python 3.14.6 and seals the complete setup-provided
  Python/uv version roots plus their `/opt` ancestor chain against hosted-image
  group/world-write and ACL authority before creating the reviewed venv. This is a
  mutable-filesystem boundary, not an inventory of the complete stdlib/native runtime.

### Fixed — FigureRequestV1 caller-source honesty

- Accepted `source.declaredLimitations` and `source.declaredNote` are now emitted after
  every mandatory disclosure in deterministic order across the visible SVG footer,
  accessible summary, RenderPlan, and returned-table metadata. Renderer-owned
  attribution and FSI/PDI isolation remain separate from `artifact.disclosures`, and
  OutputAuthority independently refuses omissions, reordering, or changed attribution.
- The source-kind policy is now total over the closed seven-kind enum: five kinds map
  to contract-owned rules and `experimental_recording`/`derived_dataset` are explicitly
  recorded as having no kind-specific warning while retaining universal authenticity
  and reference-comparison disclosures. `neuro.population_rate` can no longer omit the
  literature-extraction or manual-entry rule.
- Because this changes accepted visible output, all 19 stable skills and 14 renderers
  now publish revision 3, with coordinated v3 OutputAuthority evaluator identities;
  explicit revision-2 request pins fail closed.

### Fixed — read-only source builds

- Generated-contract checks now confine each determinism pass's `tsx` runtime
  state to a separate short temporary namespace, keeping Unix-domain sockets
  inside the caller's sandbox without sharing cache state between passes.
- Package builds use internally constructed reviewed tsdown options with ambient
  config discovery disabled, avoiding beside-source temporary config authority.
  Finalization normalizes generated `dist` modes while verifying tracked package
  inputs fail-closed instead of attempting to chmod read-only source files.
- Package linting no longer asks Bun to open tracked metadata for writing; the
  independent package smoke remains the authoritative packed-file, mode, install,
  export, and runtime check. A macOS sandbox may acknowledge `EPERM` for the
  invalid-filename fixture only after an exact trusted host probe attests APFS's
  underlying `EILSEQ` rejection.

### Fixed — legacy VizSpec provenance closure

- The exact-match pre-1.0 `VizSpec` version is now `1.4.0`, so stored `1.3.0`
  payloads are refused instead of being silently reinterpreted under materially
  tighter skill and provenance rules. The skill axis is `1.7.0`, the portable
  skills manifest is version 10, and its parameter, provenance-parameter, and
  strict-invocation languages are versions 10, 4, and 3 respectively.
- Required provenance claims now have a total machine-readable classification.
  Checked bindings reject contradictory units, variables, sampling intervals,
  typed identifier universes, snapshot times, population denominators, and
  projected values; irreducibly external claims carry a mandatory disclosure
  rather than being presented as validation conclusions.
- Every external identifier-universe declaration now has a canonical typed
  representation, and positive aggregate connection evidence rejects a provably
  empty opposite endpoint universe without pretending to recover endpoint
  identities. External spatial extents are canonical positive numeric arrays
  with a skill-specific 2D/3D shape check; their truth remains caller-declared.
- Legacy FigureRequest migration entries are explicitly report-only until an
  executable transform exists, and the generator checks bidirectional map/catalog
  ownership. It no longer advertises membrane-voltage inference or emits a
  warning-severity blocking migration error.

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
  exists yet. Its local Git observations now use the exact reviewed runtime, closed
  ambient environment, disabled lazy fetching, and bounded guardian lifecycle rather
  than ambient `spawnSync('git')`; local repository config/indirection/alternates and
  hostile same-UID mutation remain outside that process-boundary claim.
- Project `bunfig.toml` disables Bun runtime dotenv loading, including through nested
  package scripts, and an executable sentinel guards that behavior. Because package
  managers, Vite, or a dependency can still read files in the checkout, research
  credentials are kept outside the repository rather than relying on `.gitignore` or
  `env = false` as a filesystem sandbox; any narrowly scoped first-party research client
  must opt in and read its external credential store explicitly.
- The evidence-ledger checker now rejects duplicate JSON members, malformed or stale
  release arguments, and invalid project/release/statement metadata. Publication
  lifecycle checks include the ledger, Python suite, build, full test suite, Lean
  proof compilation, audit, package lint, and clean-install package smoke behind
  the release verifier.
- The lockfile now overrides Ajv's compatible `fast-uri` range to patched `3.1.4`,
  excluding the high-severity literal-backslash authority-confusion vulnerability in
  `3.0.0` through `3.1.3` without adding a second, incompatible major version.
- The lockfile also overrides compatible PostCSS ranges to patched `8.5.18`,
  excluding the high-severity previous-source-map path-traversal vulnerability in
  `8.5.17` and earlier.
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
  candidate = counted + other-not-counted + excluded-self-pair receipt. Without raw
  events, the lag-out-of-range versus edge-ineligible split remains unavailable. Zero
  eligible denominators are represented by a null rate with an explicit status, never
  by a fabricated zero or a validation exception. Caller-supplied rates and weighted
  pair sums remain refused. The later source-faithful NEST restriction is recorded above.
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
- The plain-data NEST adapter now admits only the exact NEST 3.10.0 memory-export profile
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
  into `autoFrame`/selection fly-to. Its callback reuses first-party scratch and avoids
  wall-clock animation; this is not an allocation-free claim because D3 force ticks
  allocate their spatial index. The clock advances at most one tick per rendered frame
  and no more than 60 per second, with slower settlement below 60 FPS. It handles demand
  rendering and reduced motion, scopes pointer state to the canvas, disposes resources,
  and uses collision-resistant content signatures. The direct scene now enforces the
  live-force ceiling while the accessible DOM surface retains its separate, larger
  presentation ceiling; reduced motion does not re-upload static particles.
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
- `KnowledgeGraphA11yList`, a paginated DOM mirror with
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

- `corpus.knowledge_graph` is now a breaking, evidence-shaped legacy `1.4.0`
  contract—not a stable evidence artifact:
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
  selected nodes remain present in the DOM companion through filtered views, duplicate
  ids fail closed at both direct React entrypoints, relationship disclosures have a
  touch-sized target, and the force-layout clock now mutates a reused result object
  instead of directly allocating one from `useFrame`; D3's force tick remains allocating.

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
  shipped scene): removed a direct per-frame array allocation from `useFrame`
  (remembered positions are now mutated in place; this did not prove callees
  allocation-free); a stale focus id no longer
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
- `knowledge-graph-3d` scene + `corpus.knowledge_graph` skill — an experimental
  legacy cross-paper corpus inspection graph. The declarative VizSpec contract adds the
  `KnowledgeGraph3DParamsSchema` (paper/model/family nodes;
  cites/same_as/variant_of/instantiates/belongs_to_family edges), the
  `graph_source`/`node_kinds`/`edge_kinds`/`identity_advisory` provenance keys,
  and a synthetic worked example.
- `KnowledgeGraph3DScene` — a Canvas-less R3F scene primitive (Design Law #5:
  host owns Canvas/OrbitControls/bloom/background). Now shipped at its own subpath
  **`cortexel/react/knowledge-graph`** so `d3-force-3d` stays a truly optional
  peer (the base `cortexel/react` entry no longer imports it). A d3-force-3d
  simulation ticked from a scratch-reusing `useFrame` callback with no React state
  update; this was not allocation-free execution because D3 ticks allocate spatial
  indexes. The scene used instanced unlit sphere nodes, additive line edges,
  citation-flow particles, and a Billboard focus label.
- **Validated data reaches the renderer.** `RenderSceneArgs` now carries `params`
  (the per-skill-validated scene data) and `provenance`, so a host scene renders
  from Cortexel's checked output instead of re-parsing the raw spec.
- **Corpus mapping bridge** — turns strictly gated `corpus.knowledge_graph` params
  (id/kind/label) plus a semantic palette into ready-to-render
  `KnowledgeGraph3DNode`/`Edge` records (colour by kind, radius by degree,
  citation-flow particles on `cites` edges). The bridge is now package-internal so
  supported callers cannot detach its output from the canonical honesty caption.
  The public subpath still ships the THREE-free graph helpers `filterGraphEdges` /
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
  `reducedMotion` prop contract like its Expandable* siblings (bounded static
  refinement from the deterministic seed, still particles, snap fly-to). Focused
  emphasis also collapses flow
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
  on expand. Single neuron = sphere (design law); its `useFrame` callback reuses
  first-party scratch and contains no reviewed direct allocation syntax.
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
- Per-skill provenance snapshot test, design-law executable guards (first-party
  `useFrame` source discipline, bloom-safe emissive ≤1.15, unlit populations), and a published
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
