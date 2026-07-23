# Migration

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
receipt, or an artifact. A migrated request has not been validated; revalidate and
re-render it. And migration **never invents a fact** the legacy payload did not carry:
if a population count, trial count, unit, node universe, MPI completeness, uncertainty
method, or zero-lag policy is required and absent, migration returns a partial request
plus a blocking error rather than a guess.

The full mapping is normative in
[`contract/registries/legacy-skill-map.v1.json`](./contract/registries/legacy-skill-map.v1.json).
Summary:

| Pre-1.0 id | Outcome | FigureRequestV1 target |
|---|---|---|
| `nest.voltage_trace` | migrate | `neuro.analog_trace` (signal mapped as membrane voltage only because the legacy id asserted it) |
| `nest.spike_raster` | migrate | `neuro.spike_raster` revision 2 (requires the recorded sender universe and an explicit event-window clock/closure; a NEST memory export additionally requires origin, start, stop, `time_in_steps: false`, a revision-2-admitted 3.9/3.10 source-version declaration, and an export digest; admission is not upstream certification) |
| `nest.population_rate` | migrate | `neuro.population_rate` (requires a recorded-sender count) |
| `nest.rate_response` | migrate | `neuro.response_curve` (requires input quantity + response method + caller-declared event scope) |
| `nest.isi_distribution` | migrate | `neuro.isi_distribution` |
| `nest.psth` | migrate | `neuro.psth` (requires a trial universe + alignment) |
| `nest.correlogram` | migrate | `neuro.correlogram` (the caller `zeroLagPolicy` is dropped; self-pair treatment is now derived) |
| `nest.phase_plane` | migrate | `neuro.phase_plane` |
| `nest.astrocyte_dynamics` | migrate | `neuro.multisignal_trace` (each signal keeps its real quantity kind) |
| `nest.compartmental_dynamics` | migrate | `neuro.compartment_trace` (now a native renderer, not a host route) |
| `nest.connection_graph` | migrate | `network.connection_graph` |
| `nest.adjacency_matrix` | migrate | `network.adjacency_matrix` |
| `nest.weight_matrix` | migrate | `network.weight_matrix` (multapse aggregation now mandatory) |
| `nest.delay_matrix` | migrate | `network.delay_matrix` |
| `nest.in_degree_distribution` | migrate | `network.degree_distribution` (`direction: in`) |
| `nest.out_degree_distribution` | migrate | `network.degree_distribution` (`direction: out`; blocks if the source scope is rank-local) |
| `nest.delay_distribution` | migrate | `network.delay_distribution` |
| `nest.weight_histogram` | migrate | `network.weight_distribution` |
| `nest.spatial_map_2d` | migrate | `network.spatial_map_2d` |
| `nest.plasticity_dynamics` | migrate | `network.synaptic_weight_trace` (observation kind now required) |
| `nest.spatial_3d` | experimental legacy-only | no FigureRequestV1 target; the pre-1.0 WebGL surface is not silently aliased |
| `corpus.knowledge_graph` | experimental legacy-only | no FigureRequestV1 target; the packaged `cortexel/react/knowledge-graph` export remains a legacy surface |
| `nest.animation_replay` | experimental legacy-only | no FigureRequestV1 target or deterministic renderer |
| `nest.connectivity_matrix` | migrate with unresolved graph facts | `network.connection_graph`; despite its name the legacy skill was an edge-list topology, never a literal matrix |
| `nest.spatial_2d` | conditional | `network.spatial_map_2d`, only if the legacy payload carries the full measured-position contract |
| `nest.stimulus_response` | manual recipe | no target request; separately author and validate trace, rate, and response-curve requests as appropriate |

## Information Cortexel refuses to invent

Migration will not synthesize any of these; if the legacy payload lacks one the target
needs, it blocks:

- a recorded-sender population count or a trial count;
- an event-window closure or NEST recorder origin/encoding/backend/version/digest;
- a unit for a quantity that had only a bare number;
- a complete node universe (so isolates and zero-degree nodes survive);
- MPI merge completeness (a rank-local snapshot cannot become a global claim);
- an uncertainty method or level;
- a zero-lag / self-pair policy for a correlogram;
- a calibrated-posterior status.

### Spike-raster revision-1 erratum

Do not relabel a legacy NEST window as revision 2 by copying its old `start` and `stop`.
Revision 1 assumed `[start, stop)`, whereas a NEST recording device records over
`(origin + start, origin + stop]`. Migration may construct the generic event-window form
only when the legacy producer independently establishes that closure. For a native NEST
memory export, re-read the recorder status and preserve `origin`, `start`, `stop`,
`record_to: memory`, explicit `time_in_steps: false`, the NEST 3.9/3.10 version, and a
digest of the detached export. Step/offset and file-backed exports have no revision-2
adapter path and remain blocking migrations.

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
