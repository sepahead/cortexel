# Migration

## From pre-1.0 skill ids to the 0.9.0 contract

Every one of the 26 pre-1.0 `nest.*` / `corpus.*` skill ids has a **deterministic**
migration outcome. They are accepted only by `cortexel migrate` and the
`migrateLegacyRequest` API — never by normal validation, which rejects them with
`MIGRATION_LEGACY_ID_NOT_ACCEPTED` and a repair. That is deliberate: a silent alias
would make a stored artifact ambiguous about *which contract actually validated it*,
which is exactly the ambiguity this release exists to remove.

```bash
cortexel migrate old-request.json
```

Migration produces a **request plus a report** — never a validation receipt, a render
receipt, or an artifact. A migrated request has not been validated; revalidate and
re-render it. And migration **never invents a fact** the legacy payload did not carry:
if a population count, trial count, unit, node universe, MPI completeness, uncertainty
method, or zero-lag policy is required and absent, migration returns a partial request
plus a blocking error rather than a guess.

The full mapping is normative in
[`contract/registries/legacy-skill-map.v1.json`](./contract/registries/legacy-skill-map.v1.json).
Summary:

| Pre-1.0 id | Outcome | 1.0 target |
|---|---|---|
| `nest.voltage_trace` | migrate | `neuro.analog_trace` (signal mapped as membrane voltage only because the legacy id asserted it) |
| `nest.spike_raster` | migrate | `neuro.spike_raster` (requires the recorded sender universe) |
| `nest.population_rate` | migrate | `neuro.population_rate` (requires a recorded-sender count) |
| `nest.rate_response` | migrate | `neuro.response_curve` (requires input quantity + response method) |
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
| `nest.spatial_3d` | experimental | `experimental.network.spatial_3d` (no stable alias) |
| `corpus.knowledge_graph` | experimental | `experimental.evidence.knowledge_graph` |
| `nest.animation_replay` | experimental | `experimental.neuro.animation_replay` (removed from the stable catalog) |
| `nest.connectivity_matrix` | **blocked** | choose adjacency / weight / delay — Cortexel will not guess from the fields |
| `nest.spatial_2d` | conditional | `network.spatial_map_2d`, only if the legacy payload carries the full measured-position contract |
| `nest.stimulus_response` | recipe | a `figure.bundle` of trace + rate + response-curve panels; no one-to-one alias |

## Information Cortexel refuses to invent

Migration will not synthesize any of these; if the legacy payload lacks one the target
needs, it blocks:

- a recorded-sender population count or a trial count;
- a unit for a quantity that had only a bare number;
- a complete node universe (so isolates and zero-degree nodes survive);
- MPI merge completeness (a rank-local snapshot cannot become a global claim);
- an uncertainty method or level;
- a zero-lag / self-pair policy for a correlogram;
- a calibrated-posterior status.

## API vs contract identity

The 0.9.0 contract line is versioned independently of the npm package: see
[`docs/VERSIONING.md`](./docs/VERSIONING.md) for the coordinated identity axes and the
compatibility policy that takes effect at 1.0.
