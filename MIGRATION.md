# Migration

## Legacy VizSpec 1.4.0 to 1.5.0

The pre-1.0 `VizSpec` line now stamps `specVersion: "1.5.0"` because its
skill-aware acceptance rules changed. `nest.phase_plane` requires
`derivative_time_unit: "ms" | "s"`, exact derivative-unit labels of
`axis_unit/time_unit`, two strictly increasing coordinates per axis, and a
non-underflowing one-division per-ms conversion. Literal connection matrices and
both degree-distribution skills now refuse `mpi_target_rank_local`; the current
contract cannot establish the exact rank-owned target universe and cross-rank
edge authority needed for honest absence and zero-degree claims.

The coordinated legacy identities are skill axis `1.8.0`, manifest and portable
constraint language `11`, and spec `1.5.0`. The new raw correlogram and weight
histogram transform metadata describe construction helpers, not receipts:
serialized population labels, source configuration, and histogram raw-entry
mapping retain their documented external-authority limits.

A payload stamped `1.4.0` is not silently reinterpreted. Re-author from the
original source through `buildVizSpec` or `buildHostRendererInvocation`; for a
phase plane, explicitly recover the derivative time denominator from the model
calculation rather than guessing from display labels. Do not edit or remove an
old stamp to force acceptance. Retain archived development payloads with the
runtime/manifest that originally accepted them.

## Legacy VizSpec 1.3.0 to 1.4.0

The pre-1.0 `VizSpec` line now stamps `specVersion: "1.4.0"`. This version binds
the tightened strict skill rules as well as the envelope shape: regular analog
traces need at least two strictly increasing samples, sampling intervals and
recorded variables must agree with the checked data, identifier-universe claims
use exact typed unique arrays, exact RFC 8785 SHA-256 digests where equality is
checkable, or explicitly disclosed digest/count forms for external cardinality
checks. The population-rate sender universe must cover the sum of its disjoint
recorded population denominators; positive aggregate connection evidence cannot
claim an empty opposite endpoint universe. External spatial extents use canonical
positive numeric arrays with skill-specific 2D/3D shape checks, without converting
those caller declarations into verified source facts.

A payload stamped `1.3.0` is not silently reinterpreted under these rules; the
current strict gate returns `unsupported_spec_version`. Re-author it from the
original source data through `buildVizSpec` / `buildHostRendererInvocation` and
retain the old object with the runtime or manifest that originally accepted it.
Removing the stamp merely selects the intentionally unversioned legacy path and
is not a migration or evidence that the old payload satisfies 1.4.0.

## From legacy skill ids to the current FigureRequestV1 contract

Every one of the 26 pre-1.0 `nest.*` / `corpus.*` skill ids has a **deterministic**
migration outcome. They are accepted only by the offline CLI's `migrate` command and
the `migrateLegacyRequest` API — never by normal validation, which rejects them with
`MIGRATION_LEGACY_ID_NOT_ACCEPTED` and a repair. That is deliberate: a silent alias
would make a stored artifact ambiguous about *which contract actually validated it*,
which is exactly the ambiguity this contract exists to remove.

```bash
cortexel migrate old-request.json
```

From a repository checkout, `bun src/cli/main.ts migrate old-request.json` runs the
same offline implementation.

Migration produces a **request plus a report** — never a validation receipt, a render
receipt, or an artifact. In the current revision every named per-skill transform is
explicitly `report_only`: `migrateLegacyRequest` reads the legacy id, emits only a
target-contract skeleton (plus a closed fixed parameter such as degree direction
where the registry declares one), and reports unresolved facts. It does **not** copy
or transform legacy params or data. The returned report repeats
`transformExecution: "report_only"` so API consumers do not have to infer this from
the registry. The preservation language in the normative map states obligations for
a future implemented transform, not current behavior.

A target skeleton has not been validated and is not a migrated dataset; complete it
from the original source, then validate and render it. Migration **never invents a
fact** the legacy payload did not carry: if a population count, trial count, unit,
node universe, MPI completeness, uncertainty method, or zero-lag policy is required
and absent, migration returns a skeleton plus a blocking error rather than a guess.

The source authority is `contract/registries/legacy-skill-map.v1.json`; its packaged
exact copy is
[`dist/contract/registries/legacy-skill-map.v1.json`](./dist/contract/registries/legacy-skill-map.v1.json).
Summary:

| Pre-1.0 id | Outcome | FigureRequestV1 target |
|---|---|---|
| `nest.voltage_trace` | report-only target skeleton | `neuro.analog_trace` (never infers membrane voltage, origin, units, identity, window, layout, or duplicate-time policy) |
| `nest.spike_raster` | report-only target skeleton | the installed `neuro.spike_raster` contract (currently revision 6; requires the recorded sender universe and an explicit event-window clock/closure; an exact NEST 3.10.0 memory export must use executable adapter revision 5 with its `finiteStop` or `positiveInfinityCaptureBounded` branch, exact time-build profile, branch-specific projection and capture authority, and unified v5 digest domain; admission is not upstream certification) |
| `nest.population_rate` | report-only target skeleton | `neuro.population_rate` (requires a recorded-sender count) |
| `nest.rate_response` | report-only target skeleton | `neuro.response_curve` (requires input quantity + response method + caller-declared event scope) |
| `nest.isi_distribution` | report-only target skeleton | `neuro.isi_distribution` |
| `nest.psth` | report-only target skeleton | `neuro.psth` (requires a trial universe + alignment) |
| `nest.correlogram` | report-only target skeleton | `neuro.correlogram` (a future transform must drop caller `zeroLagPolicy` and derive self-pair treatment) |
| `nest.phase_plane` | report-only target skeleton | `neuro.phase_plane` |
| `nest.astrocyte_dynamics` | report-only target skeleton | `neuro.multisignal_trace` (a future transform must preserve each signal's actual quantity kind) |
| `nest.compartmental_dynamics` | report-only target skeleton | `neuro.compartment_trace` (the target has a native renderer, not a host route) |
| `nest.connection_graph` | report-only target skeleton | `network.connection_graph` |
| `nest.adjacency_matrix` | report-only target skeleton | `network.adjacency_matrix` |
| `nest.weight_matrix` | report-only target skeleton | `network.weight_matrix` (multapse aggregation required) |
| `nest.delay_matrix` | report-only target skeleton | `network.delay_matrix` |
| `nest.in_degree_distribution` | report-only target skeleton | `network.degree_distribution` (materializes only `direction: in`) |
| `nest.out_degree_distribution` | report-only target skeleton | `network.degree_distribution` (materializes only `direction: out`; caller must establish a compatible scope) |
| `nest.delay_distribution` | report-only target skeleton | `network.delay_distribution` |
| `nest.weight_histogram` | report-only target skeleton | `network.weight_distribution` |
| `nest.spatial_map_2d` | report-only target skeleton | `network.spatial_map_2d` |
| `nest.plasticity_dynamics` | report-only target skeleton | `network.synaptic_weight_trace` (observation kind required) |
| `nest.spatial_3d` | experimental legacy-only | no FigureRequestV1 target; the pre-1.0 WebGL surface is not silently aliased |
| `corpus.knowledge_graph` | experimental legacy-only | no FigureRequestV1 target; the packaged `cortexel/react/knowledge-graph` export remains a legacy surface |
| `nest.animation_replay` | experimental legacy-only | no FigureRequestV1 target or deterministic renderer |
| `nest.connectivity_matrix` | report-only target skeleton with unresolved graph facts | `network.connection_graph`; despite its name the legacy skill was an edge-list topology, never a literal matrix |
| `nest.spatial_2d` | report-only conditional target skeleton | `network.spatial_map_2d`; a future implemented transform may complete it only from a full measured-position contract |
| `nest.stimulus_response` | manual recipe | no target request; separately author and validate trace, rate, and response-curve requests as appropriate |

## Information Cortexel refuses to invent

The current report-only mapper does not inspect candidate replacement fields in the
legacy object: every registry `requires` item remains unresolved in its target
skeleton. A future implemented transform must independently establish each item from
original source evidence and block if it cannot. Neither path may synthesize:

- a recorded-sender population count or a trial count;
- an event-window closure or NEST recorder origin/encoding/backend/version/digest;
- a unit for a quantity that had only a bare number;
- a complete node universe (so isolates and zero-degree nodes survive);
- MPI merge completeness (a rank-local snapshot cannot become a global claim);
- an uncertainty method or level;
- a zero-lag / self-pair policy for a correlogram;
- a calibrated-posterior status.

### Spike-raster revision-1 erratum and NEST adapter branches

Do not relabel a legacy NEST window as revision 2 by copying its old `start` and `stop`.
Revision 1 assumed `[start, stop)`, whereas a NEST recording device records over
`(origin + start, origin + stop]`. A future implemented transform may construct the
generic event-window form only when the legacy producer independently establishes that
closure. For a native NEST memory export, re-run capture through executable adapter
revision 5 and the branch matching the actual configured stop. The `finiteStop` branch
preserves `origin`, `start`, numeric `stop`, `record_to: memory`, explicit
`time_in_steps: false`, projection v1, and capture-authority profile v3; its interval is
`(origin+start,origin+stop]` under the unified v5 digest domain.

NEST's default positive-infinity stop is a different evidence shape. Re-capture it
through revision 5's `positiveInfinityCaptureBounded` branch and named projection v2,
which alone may replace the
exact pinned-runtime PyNEST `DBL_MAX` representation with
`{ "kind": "nest_time_positive_infinity" }`. Do not hand a raw numeric `DBL_MAX` to
the adapter or reinterpret an ordinary large finite value as infinity: both fail
closed. Capture-authority profile v4 must record the finite exact biological time immediately
after a successful *advancing* `Simulate` or `Run` return and before any further
advance or mutation. It has finite origin/start/capture tic preimages but no
`stopTics`, and retains only `(origin+start,capture]`. That closed endpoint is capture,
not device deactivation, and makes no claim about events after capture.

Both branches require the exact NEST 3.10.0 runtime declaration, detached status value,
exact LP64/int64/binary64 time-build profile, runtime resolution, source-faithful
stored-reciprocal time projection, most recent buffer clear or creation, most recent
recorder-plan/wiring mutation, complete sender universe, and exact single-process scope.
A final status cannot reconstruct those facts after the event. Source and revision-5
adapter-input digests are identities, not attestations; all capture and build authority
remains caller-declared. Historical adapter v3 and capture-authority v1/v2 inputs are
non-executable migration identities. R049 remains `NOT_RUN` without a durable isolated
receipt binding the wheel, toolchain, active floating-point environment, harness, and
results.
Step/offset, file-backed, MPI rank-local, caller-premerged MPI, and other runtime
versions have no admitted stable adapter path and remain blocking migrations.

## API vs contract identity

The FigureRequestV1 contract line is versioned independently of the npm package: see
[`docs/VERSIONING.md`](./docs/VERSIONING.md) for the coordinated identity axes and the
compatibility policy that takes effect at 1.0.

## Accepted-request skill-revision stamp

No authored-request rewrite is required. `/skill/revision` remains optional: omission
selects the installed revision, while an explicit prior or future pin refuses. After
successful validation, Cortexel now always writes the resolved revision into the
detached `/canonicalRequest/skill/revision` before computing the request digest.

This pre-1.0 identity repair means re-rendering a formerly unpinned request changes its
request digest, deterministic SVG-id seed and metadata, SVG bytes, and artifact digest.
That is intentional: the old digest omitted an accepted identity axis. The same request
already pinned to the then-current revision keeps its canonical bytes and seed under
this repair alone. Do not rewrite an archived development artifact in place; retain it
with its original build identity, and produce a new artifact from the current build.
FigureArtifactV1 still has no detached reader/verifier, so a consumer comparing stored
objects must recompute both digests explicitly rather than treating schema validity as
tamper evidence.
