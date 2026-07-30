"""GENERATED FILE - DO NOT EDIT.

Produced by scripts/generate-contract.ts from contract/, package.json, and python/pyproject.toml.
Edit the normative source and run `bun run generate`.
"""

from collections.abc import Mapping
from types import MappingProxyType
from typing import Any, Final


def _freeze(value: Any) -> Any:
    """Recursively detach and freeze generated JSON authority."""
    if isinstance(value, dict):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(_freeze(item) for item in value)
    return value

PACKAGE_VERSION: str = "0.10.0-dev.0"
PYTHON_DISTRIBUTION_VERSION: str = "0.10.0.dev0"
REQUEST_CONTRACT: str = "cortexel-figure-request/1.0"
ARTIFACT_CONTRACT: str = "cortexel-figure-artifact/1.0"
CONTRACT_DIGEST: str = "sha256:a46204c087e224566e304fbe63863b94dbd7b8bf4e8218c591d9d7f2acf79247"
CATALOG_DIGEST: str = "sha256:18fe441ad91d52651cbbe5efa063478a5c458560c29d20d541d63359722addd8"
CATALOG_DIGEST_DOMAIN: str = "cortexel-public-stable-catalog.v2"
AUTHORING_SCHEMA_COMPILATION_PROFILE_V1: Final[Mapping[str, Any]] = _freeze({
    "id": "cortexel-authoring-schema-compilation-profile.v1",
    "dialect": "https://json-schema.org/draft/2020-12/schema",
    "engine": "ajv-8",
    "options": {
        "strict": True,
        "allErrors": True,
        "coerceTypes": False,
        "useDefaults": False,
        "removeAdditional": False,
        "allowUnionTypes": True,
        "validateFormats": False,
        "strictRequired": False,
        "strictTypes": False
    }
})

STABLE_SKILL_IDS: Final[tuple[str, ...]] = _freeze([
    "network.adjacency_matrix",
    "network.connection_graph",
    "network.degree_distribution",
    "network.delay_distribution",
    "network.delay_matrix",
    "network.spatial_map_2d",
    "network.synaptic_weight_trace",
    "network.weight_distribution",
    "network.weight_matrix",
    "neuro.analog_trace",
    "neuro.compartment_trace",
    "neuro.correlogram",
    "neuro.isi_distribution",
    "neuro.multisignal_trace",
    "neuro.phase_plane",
    "neuro.population_rate",
    "neuro.psth",
    "neuro.response_curve",
    "neuro.spike_raster"
])

SKILL_CATALOG: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
    "network.adjacency_matrix": {
        "id": "network.adjacency_matrix",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Connection adjacency matrix (target rows, source columns)",
        "canonicalQuestion": "Over one declared complete, ordered node universe, which cells of the target-row by source-column matrix contain at least one connection — or exactly how many connection entries — and which cells were actually observed, under a declared network scope and snapshot time?",
        "cannotEstablish": [
            "That an empty row means the target has in-degree zero in the wider network. The matrix is complete only over the DECLARED node universe: a target receiving 40 connections from unselected nodes still shows an empty row here.",
            "That a not_observed cell contains no connection. Under a rank-local or sampled scope many cells are not_observed, and not_observed is not absence — it is the snapshot declining to speak.",
            "Connection strength. A cell is present because a connection EXISTS, not because it is strong: a zero-weight synapse is present here and appears as the value 0 in network.weight_matrix. The two figures can disagree and both be right.",
            "Functional or effective connectivity. This is a structural snapshot: a present cell does not mean one neuron influenced another, and an absent cell does not mean the two were independent.",
            "That a visible block or cluster is a property of the network rather than of the declared node ORDER. Reordering can create or destroy every apparent block; Cortexel draws only the declared order and never sorts by connectivity.",
            "That the network still looks like this. The matrix is a snapshot at a declared time; under structural plasticity it says nothing about connectivity before or after that instant.",
            "That multiplicity is strength. Three parallel connections are not three times the influence of one — their weights may differ, may have opposite signs, and adjacency never looks at them.",
            "That a present cell is a monosynaptic pathway of a particular kind. Adjacency pools every declared synapse model in the supplied rows; the models are listed in the table, but the cell does not distinguish them."
        ],
        "renderer": {
            "id": "figure.matrix",
            "revision": 5,
            "axisOrder": "target_rows_source_columns"
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/connections/sourceIds",
                            "/data/connections/targetIds",
                            "/data/connections/edgeIds",
                            "/data/connections/synapseModels",
                            "/data/connections/weights/values",
                            "/data/connections/delays/values"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/nodeUniverse/ids",
                        "/data/connections/edgeIds",
                        "/data/observedTargetIds"
                    ]
                }
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.node_universe_declared"
            },
            {
                "id": "topology.edge_endpoints_in_universe"
            },
            {
                "id": "topology.matrix_contract"
            },
            {
                "id": "topology.scope_supports_claim"
            },
            {
                "id": "topology.multapse_aggregation_declared"
            },
            {
                "id": "topology.delay_positive"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "SAMPLED_EDGES",
            "ABSENT_IS_NOT_ZERO",
            "MULTAPSE_AGGREGATED",
            "MISSING_VALUES_PRESENT",
            "UNIT_CONVERTED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 200000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Adjacency matrix for {selectionLabel}: {nodeCount} nodes as target rows by source columns, in Cortexel's fixed target-row/source-column orientation over one declared node universe. Cell mode {cellMode}. {presentCellCount} cells contain at least one retained connection row, from {connectionCount} retained rows. Exact multiplicity is reported only where connectionSetComplete is true. {observedRowCount} of {nodeCount} rows are fully observed; {absentCellCount} cells are observed absence and {notObservedCellCount} are not_observed. {autapseCellCount} cells are self-connections. Scope: {scopeStatement}. Snapshot time {snapshotTime} {snapshotTimeUnit}. {multapseStatement} {compactionStatement}",
            "tableColumns": [
                {
                    "key": "rowIndex",
                    "header": "Row (target index)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Zero-based position in the declared node universe. The order is the declared order and is never derived from the connections."
                },
                {
                    "key": "targetId",
                    "header": "Target (row)",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The connection's TARGET. The orientation is fixed by the contract and is not caller-configurable."
                },
                {
                    "key": "columnIndex",
                    "header": "Column (source index)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Zero-based position in the declared node universe."
                },
                {
                    "key": "sourceId",
                    "header": "Source (column)",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The connection's SOURCE."
                },
                {
                    "key": "cellStatus",
                    "header": "Status",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "present, absent, or not_observed. Absent is measured absence inside an observed target row. not_observed means this scope cannot speak to the cell."
                },
                {
                    "key": "cellValue",
                    "header": "Cell value",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "1 or 0 in binary_presence mode; the exact multiplicity in multiplicity mode. Null when not_observed; zero is reserved for observed absence."
                },
                {
                    "key": "multiplicity",
                    "header": "Complete-cell connections",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The exact full-cell multiplicity, multapses and autapses included, only when connectionSetComplete is true. Null for sampled evidence: retained rows prove presence but cannot prove that no additional cell rows were omitted."
                },
                {
                    "key": "retainedConnectionRows",
                    "header": "Retained rows",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact count of request rows retained in this cell. Under sampled scope this is a sample-row count, not the network cell multiplicity."
                },
                {
                    "key": "connectionSetComplete",
                    "header": "Complete cell set",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "True only when the declared scope completely observes this target row, so zero means absence and multiplicity is exact. False for every sampled cell and every non-owned rank-local row."
                },
                {
                    "key": "isAutapse",
                    "header": "Self-connection",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "True when the row target id equals the column source id. Autapses are always counted and the diagonal cell is never blanked."
                },
                {
                    "key": "edgeIds",
                    "header": "Contributing connections",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Canonical array of caller-supplied ids contributing to the cell. It is null when the snapshot supplied no edge-id channel; revision 2 never synthesizes ordinal identities. A dense observed-absent cell has an empty array when the id channel exists."
                },
                {
                    "key": "synapseModels",
                    "header": "Synapse models",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The declared models of the contributing connections. Adjacency pools models by design; they are listed so a reader can see exactly what was pooled."
                },
                {
                    "key": "carriedAttributes",
                    "header": "Carried weight / delay",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Per-connection weight and delay when supplied, with units and that same record's caller edgeId and synapseModel when those channels exist. The separately canonical edgeIds and synapseModels columns are contributor summaries, not positional joins. No ordinal identity is synthesized when edgeId is absent. Shown, never used: a zero-weight connection remains present."
                },
                {
                    "key": "scopeSummary",
                    "header": "Scope summary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A bounded canonical projection of the scope under which this cell was, or was not, observed. For global_merged, validator-proven complete coverage is represented as all_ranks_0_through_worldSize_minus_1 rather than repeating the redundant mergedRanks array in every row. The canonical request retains the exact raw scope once and the live in-process requestDigest covers that request. Artifact 1.0 binds table shape only: it does not bind these table-cell bytes and provides no detached verification or persisted assurance receipt."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.adjacency_matrix.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "selectionLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "rowIndex",
                    "targetId",
                    "columnIndex",
                    "sourceId",
                    "cellStatus",
                    "cellValue",
                    "multiplicity",
                    "retainedConnectionRows",
                    "connectionSetComplete",
                    "isAutapse",
                    "edgeIds",
                    "synapseModels",
                    "carriedAttributes",
                    "scopeSummary"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "cells",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority selection A",
                        "rightValue": "Authority selection B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "selectionLabel",
                    "nodeCount",
                    "cellMode",
                    "presentCellCount",
                    "connectionCount",
                    "observedRowCount",
                    "absentCellCount",
                    "notObservedCellCount",
                    "autapseCellCount",
                    "scopeStatement",
                    "snapshotTime",
                    "snapshotTimeUnit",
                    "multapseStatement",
                    "compactionStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "nest.GetConnections",
                "version": "3.10.0",
                "status": "not_run",
                "notes": "The intended differential oracle is a deterministic NEST script (Create + Connect with allow_multapses and allow_autapses) whose GetConnections output is compared cell by cell against this contract's derivation, including the target-row convention, multapse counts, autapse diagonal, and rank-local target ownership. A second, adversarial oracle is networkx: its adjacency convention is A[source][target], the TRANSPOSE of Cortexel's, so the comparison must transpose explicitly and a forgotten transpose fails loudly instead of producing a plausible mirrored matrix. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-getconnections",
                "sources": [
                    {
                        "system": "nest.GetConnections",
                        "role": "primary",
                        "notes": "Supplies only the connection rows. It accepts the official singular/scalar form or canonical plural arrays, never both, never broadcasts an optional scalar across rows, and never deduplicates multapses. Accessor-bearing input is rejected before any getter can run (ADAPTER_ACCESSOR_INPUT_REJECTED). The separately named NodeCollection source is mandatory because an edge list can only show that no connection was observed, never that a selected node has degree zero.",
                        "sourceId": "nest-getconnections"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the complete selected node universe, including isolated and silent nodes, in the order intentionally retained for both matrix axes. The exact selection must be retained from the simulation setup; it is never reconstructed from connection endpoints.",
                        "sourceId": "nest-selected-node-universe"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nest-synapsecollection-mpi-target-rank-local",
                "sources": [
                    {
                        "system": "nest.SynapseCollection (MPI, target-rank-local)",
                        "role": "primary",
                        "notes": "Supplies the rank-local connection rows. Rows are targets and NEST returns only connections whose targets are owned by the executing MPI process, so each owned target row is complete. The output stays mpi_target_rank_local and is never merged implicitly; connection rows alone cannot establish either the selected node universe or which selected targets are locally owned.",
                        "sourceId": "nest-synapsecollection-mpi-target-rank-local"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies both retained selection views that the rank-local rows cannot reconstruct: the complete selected node universe for the matrix axes and the exact local-membership mask of the selected target NodeCollection. `observedTargetIds` is the exact selected-target intersection whose NEST 3.10 `NodeCollection.local` value is true; it is never inferred from targets that happen to have an incoming connection. NEST deprecates rank-specific simulation logic, so this locality view is used only to describe already rank-local evidence, never to change simulation behavior.",
                        "sourceId": "nest-selected-node-and-target-locality"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "networkx-digraph",
                "sources": [
                    {
                        "system": "networkx.DiGraph",
                        "role": "primary",
                        "notes": "networkx's adjacency is A[source][target] — the transpose of Cortexel's convention — so the adapter transposes explicitly and records that it did. The node universe comes from G.nodes so that isolates survive; taking it from G.edges would silently delete every isolate row and column. A MultiDiGraph's parallel edges become distinct connection rows and are never collapsed.",
                        "sourceId": "networkx-digraph"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "dense-numeric-matrix-numpy-scipy-sparse",
                "sources": [
                    {
                        "system": "dense numeric matrix (numpy / scipy.sparse)",
                        "role": "primary",
                        "notes": "A bare array carries no node ids, no orientation, and no way to distinguish a not_observed cell from an observed absence. Those are exactly the three facts this contract exists to pin down, so an array that has lost them cannot be promoted back into a matrix figure. Supply the connection rows and the node universe instead.",
                        "sourceId": "dense-numeric-matrix-numpy-scipy-sparse"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            }
        ],
        "legacyIds": [
            "nest.adjacency_matrix"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Rows and columns share one ordered node universe, so 1.0 draws SQUARE self-connectivity matrices only. A bipartite source-set by target-set matrix (e.g. thalamic sources by cortical targets) is a genuinely different figure and is not expressible here.",
            "There is no way to make a model-restricted absence claim. A caller who supplies only one synapse model's rows must declare a `sampled` / `declared_subset` scope, under which no cell may be called absent — so 'no AMPA connection here' is not expressible in 1.0.",
            "topology.matrix_contract checks the scope x cellMode x aggregation restrictions: sampled admits only binary_presence with sum over retained rows; rank-local requires complete local targets, one unique observedTargetIds subset, and every returned connection target in that owned set.",
            "No matrix paint-path quantizer is implemented in revision 2. The contract advertises only compaction policy `none`; any request that exceeds the visible-mark or complete-returned-table budget is refused rather than grouped, sampled, or excerpted.",
            "No uncertainty variant is supported. A connection-PROBABILITY matrix over an ensemble of network instantiations is a genuinely different figure, and 1.0 does not have it: this contract draws one exact snapshot, not an estimate.",
            "Cortexel verifies internal consistency, not truth. It can check that the scope, the universe, and the connections agree with each other; it cannot check that the snapshot enumerated the network correctly in the first place.",
            "No data-dependent reordering is offered. A caller who wants a seriated or clustered matrix must compute the order themselves, declare it as the universe order, and own the claim that the block structure is real."
        ]
    },
    "network.connection_graph": {
        "id": "network.connection_graph",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Directed connection graph of a declared network snapshot",
        "canonicalQuestion": "Which connections existed between a COMPLETE declared set of nodes at one snapshot, under one declared scope, with every isolate, autapse, multapse, direction, and edge attribute preserved?",
        "cannotEstablish": [
            "That an absent edge does not exist. Under a sampled or rank-local scope, absence in this figure is not evidence of absence in the network. Only a complete scope over a complete node universe supports reading a missing edge as a real one.",
            "A node's degree, unless a degree annotation is declared AND the scope supports it. A drawn graph shows the connections that are in the snapshot, not a node's connectivity.",
            "Any spatial or metric relationship under a schematic layout. Distance, angle, adjacency and crossing count are artifacts of the layout construction, not measurements. Two nodes drawn next to each other are not near each other in any space.",
            "Functional connectivity, causality, or influence. These are structural connections as declared by the source. A drawn edge says a synapse exists, not that it did anything.",
            "That two weights are comparable across synapse models. A NEST weight's physical meaning depends on the model: the same number may be a current amplitude under one and a conductance under another.",
            "What the network looks like at any other simulation time. This is a snapshot. Under STDP or structural plasticity the graph changes, and the declared snapshot time is the only time it describes.",
            "The probability that an edge exists. This figure has no uncertainty channel: an edge is in the snapshot or it is not. A connection rule's `p` is a parameter of a generator, never an uncertainty on a realized edge."
        ],
        "renderer": {
            "id": "figure.connection_graph",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/connections/sourceIds",
                            "/data/connections/targetIds",
                            "/data/connections/edgeIds",
                            "/data/connections/weights/values",
                            "/data/connections/delays/values",
                            "/data/connections/synapseModels"
                        ],
                        [
                            "/data/positions/nodeIds",
                            "/data/positions/x/values",
                            "/data/positions/y/values"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/nodeUniverse/ids",
                        "/data/connections/edgeIds",
                        "/data/positions/nodeIds"
                    ]
                }
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.scope_supports_claim"
            },
            {
                "id": "topology.node_universe_declared"
            },
            {
                "id": "topology.edge_endpoints_in_universe"
            },
            {
                "id": "topology.delay_positive"
            },
            {
                "id": "topology.weight_group_compatible"
            },
            {
                "id": "topology.multapse_aggregation_declared"
            },
            {
                "id": "spatial.position_coverage_complete"
            },
            {
                "id": "spatial.equal_axis_units"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "SAMPLED_EDGES",
            "NODE_UNIVERSE_INCOMPLETE",
            "MULTAPSE_AGGREGATED",
            "SCHEMATIC_LAYOUT",
            "MISSING_VALUES_PRESENT",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 200000,
            "maxVisibleMarks": 20000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Directed connection graph {graphLabel}. {nodeCount} declared nodes, {isolateCount} with no drawn connection. {edgeCount} connections: {multapseRowCount} are parallel connections of an already-connected pair and {autapseCount} are self-connections. Scope: {scopeStatement}. Layout: {layoutMode}, {layoutSpatialStatement}. Node order: {nodeOrder}. Edge value: {edgeValueStatement}. Degree: {degreeStatement}. Direction is shown by an arrowhead at the target end of every edge. {missingValueStatement} {compactionStatement} {tableStatement}",
            "tableColumns": [
                {
                    "key": "rowKind",
                    "header": "Row",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "`node` or `connection`. A cell that does not apply to the row kind is empty; an empty cell is never a zero."
                },
                {
                    "key": "id",
                    "header": "Id",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": True,
                    "description": "The declared node id on a node row or caller-supplied edge id on a connection row. A connection without a supplied edge id has a null cell; revision 2 never assigns a replacement ordinal."
                },
                {
                    "key": "group",
                    "header": "Group",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The declared group, or empty. A node belongs to at most one group."
                },
                {
                    "key": "sourceId",
                    "header": "Source",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": True,
                    "description": "Connection rows only."
                },
                {
                    "key": "targetId",
                    "header": "Target",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": True,
                    "description": "Connection rows only. The arrowhead is drawn at this end."
                },
                {
                    "key": "isAutapse",
                    "header": "Self-connection",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "True when source equals target."
                },
                {
                    "key": "parallelIndex",
                    "header": "Parallel index",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": True,
                    "description": "Which connection row this is within the unordered endpoint pair, in declared connection-row order (1-based)."
                },
                {
                    "key": "parallelCount",
                    "header": "Parallel count",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "How many connections exist between this unordered pair. Greater than 1 means a multapse; every one of them has its own row."
                },
                {
                    "key": "weight",
                    "header": "Weight",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Exact declared value, or empty when the source did not supply one. Empty is missing, not zero."
                },
                {
                    "key": "weightUnit",
                    "header": "Weight unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "`nest:weight` is simulator-defined and has no SI meaning; it is never converted or compared across models."
                },
                {
                    "key": "delay",
                    "header": "Delay",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "delayUnit",
                    "header": "Delay unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "synapseModel",
                    "header": "Synapse model",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The declared model. Weights of different models are not pooled."
                },
                {
                    "key": "inDegree",
                    "header": "In-degree",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Node rows only, and only when a degree annotation is declared and the scope supports it."
                },
                {
                    "key": "outDegree",
                    "header": "Out-degree",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Node rows only. Empty under a target-rank-local scope, where it is not computable."
                },
                {
                    "key": "degreeCountingPolicy",
                    "header": "Degree policy",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Whether each connection entry or each unique neighbour was counted, and how an autapse contributed."
                },
                {
                    "key": "x",
                    "header": "x",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Measured coordinate, or empty under a schematic layout. A schematic screen position is not a coordinate and is never reported as one."
                },
                {
                    "key": "y",
                    "header": "y",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "positionUnit",
                    "header": "Position unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "layoutStatus",
                    "header": "Layout",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "`measured` or `schematic (non-spatial)`."
                },
                {
                    "key": "scopeSummary",
                    "header": "Scope summary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A bounded canonical projection of the declared network scope. `global_merged` records complete-rank coverage and world size without repeating `mergedRanks`; the exact raw scope remains once in the canonical request and is covered by the live in-process request digest. Artifact 1.0 binds this table's shape only, not table-cell bytes, and supplies no detached verification or persisted assurance receipt."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.connection_graph.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "graphLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "rowKind",
                    "id",
                    "group",
                    "sourceId",
                    "targetId",
                    "isAutapse",
                    "parallelIndex",
                    "parallelCount",
                    "weight",
                    "weightUnit",
                    "delay",
                    "delayUnit",
                    "synapseModel",
                    "inDegree",
                    "outDegree",
                    "degreeCountingPolicy",
                    "x",
                    "y",
                    "positionUnit",
                    "layoutStatus",
                    "scopeSummary"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "nodes",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "edges",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority graph A",
                        "rightValue": "Authority graph B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "graphLabel",
                    "nodeCount",
                    "isolateCount",
                    "edgeCount",
                    "multapseRowCount",
                    "autapseCount",
                    "scopeStatement",
                    "layoutMode",
                    "layoutSpatialStatement",
                    "nodeOrder",
                    "edgeValueStatement",
                    "degreeStatement",
                    "missingValueStatement",
                    "compactionStatement",
                    "tableStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "networkx.MultiDiGraph",
                "version": "3.3",
                "status": "not_run",
                "notes": "NetworkX is the intended differential oracle for degree counting, multiedge retention, and self-loop handling ONLY — never for layout, because Cortexel's stable layouts are closed-form and NetworkX's are not normative. The comparison MUST use MultiDiGraph: networkx.DiGraph silently collapses parallel edges, so comparing against it would 'confirm' precisely the deduplication bug this contract exists to prevent. NetworkX also counts a self-loop as 2 in Graph.degree but as 1 each in in_degree/out_degree, so the autapse policy must be matched explicitly before any number agrees for the right reason. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-getconnections",
                "sources": [
                    {
                        "system": "nest.GetConnections",
                        "role": "primary",
                        "notes": "Supplies SynapseCollection.get() connection rows in the official singular/scalar form OR canonical plural arrays, never both, never broadcasting an optional scalar across rows, and never deduplicating multapses. It cannot prove a node has degree zero, so the separately named NodeCollection source is mandatory. The MPI scope must come from the actual run, not from an assumption. A future `global_merged` mapping must be separately profiled with an exact one-run, one-snapshot, every-rank merge authority; this single-query profile does not claim that merge.",
                        "sourceId": "nest-getconnections"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the complete selected node universe, including isolates and silent nodes. GetConnections can prove only that it returned no row for an endpoint; without this companion an isolate would disappear and a missing edge could be misread as evidence of absence.",
                        "sourceId": "nest-selected-node-universe"
                    },
                    {
                        "system": "nest.GetPosition",
                        "role": "optional_companion",
                        "notes": "Measured layout. Node ids are bound to the matching position order; the single-process / rank-local / merged scope of the position query is retained and must agree with the connection scope.",
                        "sourceId": "nest-getposition"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "networkx-multidigraph",
                "sources": [
                    {
                        "system": "networkx.MultiDiGraph",
                        "role": "primary",
                        "notes": "Structure maps cleanly (directed, multiedge, self-loop). NetworkX carries no node-universe completeness flag, no MPI scope, and no units, so the caller must declare all three; the adapter never fabricates them.",
                        "sourceId": "networkx-multidigraph"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo",
                "sources": [
                    {
                        "system": "neo",
                        "role": "primary",
                        "notes": "Neo models recordings, not connectivity. There is no faithful mapping, and an invented one would be worse than none.",
                        "sourceId": "neo"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "nwb-core",
                "sources": [
                    {
                        "system": "nwb.core",
                        "role": "primary",
                        "notes": "NWB core has no connectivity schema. A mapping depends on a community extension (for example ndx-simulation-output); none is certified here, and Cortexel will not invent a table layout.",
                        "sourceId": "nwb-core"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "ncp",
                "sources": [
                    {
                        "system": "ncp",
                        "role": "primary",
                        "notes": "Pending the narrow NCP adapter and its downstream consumer certification.",
                        "sourceId": "ncp"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.connection_graph",
            "nest.connectivity_matrix"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "No force-directed layout exists in the stable contract. Spring layouts depend on iteration order and floating-point accumulation, so they cannot produce byte-identical output, and their distances carry no meaning even when they are reproducible. They remain behind the experimental boundary.",
            "A schematic layout is a drawing, not a measurement. Cortexel labels it non-spatial and discloses it; it cannot stop a reader from measuring it anyway.",
            "`common.v1` connectionRows has no receptor-type field, so a receptor id cannot be carried and two edges differing only in receptor are indistinguishable here. Blueprint 30.11 lists receptor as an optional attribute; closing the gap needs a change to the shared type, not to this skill.",
            "`common.v1` nodeUniverse carries no per-node label, so nodes are labelled by id. A human-readable neuron name cannot be carried without changing the shared type.",
            "`NetworkScopeV1.snapshotTime` is optional in `common.v1`, so this contract cannot make it mandatory. A snapshot without a time cannot be aligned to a plasticity phase, and two snapshots without times cannot be shown to be simultaneous. Declaring it is strongly recommended.",
            "There is no graph-specific budget profile. The `standard` and `agent` profiles' graphNodes/graphEdges ceilings apply, and this contract additionally caps visible marks at 20000 — far below the profile's 100000 — because a node-link diagram with 100000 marks is a hairball that conveys nothing.",
            "Above the mark budget this skill produces no figure at all: it refuses with RESOURCE_MARKS_EXCEEDED and recommends `network.adjacency_matrix`. There is no large-graph mode. A node-link drawing of that network would not be readable, and saying so is more useful than drawing it.",
            "The edge-cap-fallback golden is a generated fixture, not an `examples` entry: reproducing it inline needs over 20000 rows, which would bloat this contract by orders of magnitude for one refusal. The test-suite vector asserts the same RESOURCE_MARKS_EXCEEDED code and matrix repair declared here.",
            "The CROSS-RUN merge conflict is NOT enforced. `global_merged` carries one snapshot time and no per-rank run id, so ranks merged across runs or times are indistinguishable from a legitimate merge; that check is an adapter obligation. The enforced SCOPE_MERGE_CONFLICT triggers are a duplicated merged rank and a sample that retains more connections than its source had; the rank cover is SCOPE_MERGE_INCOMPLETE.",
            "Node marker radius and arrowhead size are fixed screen-space decoration and encode nothing, unless `degreeAnnotation.encodeAsNodeArea` is explicitly enabled.",
            "The `POSITIONS_MISSING` disclosure exists for spatial maps that omit an unpositioned node and disclose it. This figure instead fails closed with SCOPE_POSITION_COVERAGE_INCOMPLETE: omitting a node from a graph deletes an isolate and changes the topology, which a footnote cannot repair.",
            "`ids.unique` enforces per-pointer uniqueness on the node ids, edge ids, and position node ids. The shared semantic validator has no cross-group membership primitive, so the render boundary independently refuses a node present in more than one group with SEMANTIC_DUPLICATE_ID before assigning color, shape, or layout sector.",
            "`degree.counting_policy_declared` is deliberately NOT declared for this figure. That validator requires a top-level `parameters.countingPolicy` unconditionally, but here a degree is an OPTIONAL annotation whose counting policy is structurally required inside `degreeAnnotation`; the nested requirement is what enforces it.",
            "The shared semantic scope/degree validators are specialized for `network.degree_distribution`. This figure therefore re-checks its optional annotation at the render boundary: sampled degree is refused, and target-rank-local scope permits only in-degree.",
            "The <=8 distinguishable-group limit is a render-stage concern (RENDER_SERIES_LIMIT_EXCEEDED) with no semantic validator, so it is not checked during request validation; the shared `nodeUniverse` type caps groups at 64. The diverging-scale center requirement, by contrast, IS enforced structurally (an absent center fails with SCHEMA_REQUIRED_PROPERTY_MISSING).",
            "The multapse-aggregation rule fires for ANY unordered pair carrying more than one connection, independent of `parallelEdges.display`. A `separate_lanes` figure with parallel edges must therefore still declare `parameters.multapseAggregation`; the aggregation governs any per-pair derived value while every row is still drawn and tabled.",
            "Bundled parallel edges in one ordered direction are drawn as one stroke with a count label. Reciprocal directions remain distinct strokes. Bundling is a paint decision and every row remains in the table, but a reader who looks only at the drawing sees one directional stroke where several synapses exist."
        ]
    },
    "network.degree_distribution": {
        "id": "network.degree_distribution",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "In- and out-degree distribution over a declared node universe",
        "canonicalQuestion": "What is the exact in- or out-degree distribution of a complete, declared node universe, under an explicitly stated connection-counting policy and autapse policy, within a network scope that can actually support the claim?",
        "cannotEstablish": [
            "That the degree distribution follows any functional form. Cortexel draws the empirical histogram; it fits nothing and tests nothing, and a heavy right tail on a log axis is not evidence of scale-freeness.",
            "A global out-degree from an MPI target-rank-local snapshot. A rank holds the connections whose TARGET it owns; the ones leaving a local source for a remote target sit on another rank and are simply absent from the evidence.",
            "The degree of any node outside the declared universe. A node that was not declared is not a node of degree zero — it is a node that was not looked at.",
            "The in-degree of a node an MPI rank does not own. A rank-local figure is complete only for the targets the rank observed, which is why those ids must be declared rather than assumed.",
            "Functional or effective connectivity. A structural degree counts connections; it says nothing about whether they carry signal, in which direction of influence, or with what sign.",
            "Anything about synaptic strength or latency. Two nodes with identical degree can differ by orders of magnitude in total drive; supplied weights and delays do not affect a degree and are never used to filter one.",
            "The distribution of the whole network from a sampled edge subset. Every degree read from a subset is a lower bound of unknown tightness, and a histogram of lower bounds looks exactly like a histogram of degrees.",
            "That a difference between two degree distributions is meaningful. No statistical test is performed and no null model is assumed.",
            "That the network had this structure at any time other than the declared snapshot time. Structural plasticity can change every degree between two snapshots of one run."
        ],
        "renderer": {
            "id": "figure.distribution",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/connections/sourceIds",
                            "/data/connections/targetIds",
                            "/data/connections/edgeIds",
                            "/data/connections/weights/values",
                            "/data/connections/delays/values",
                            "/data/connections/synapseModels"
                        ],
                        [
                            "/data/nodeDegrees/nodeIds",
                            "/data/nodeDegrees/degrees"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/nodeUniverse/ids",
                        "/data/connections/edgeIds",
                        "/data/nodeDegrees/nodeIds",
                        "/data/observedTargetIds"
                    ]
                }
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.scope_supports_claim"
            },
            {
                "id": "topology.node_universe_declared"
            },
            {
                "id": "topology.edge_endpoints_in_universe"
            },
            {
                "id": "degree.counting_policy_declared"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "NODE_UNIVERSE_INCOMPLETE",
            "MULTAPSE_AGGREGATED",
            "MISSING_VALUES_PRESENT",
            "PRE_BINNED_INPUT",
            "UNCERTAINTY_NOT_PROVIDED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 200000,
            "maxVisibleMarks": 20000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "{direction}-degree distribution for {selectionLabel}. Counting policy {countingPolicy}; autapses {autapsePolicy}{excludedAutapseStatement}. Node universe: {universeNodeCount} nodes, declared complete. Scope: {scopeStatement}. {countedConnectionCount} raw connections produce {countedIncidenceCount} counted incidences. Degrees run from {minDegree} to {maxDegree}; {zeroDegreeNodeCount} nodes have degree 0. One exact bin is retained per integer degree. Values are the {normalization} of nodes per degree bin. No sampling uncertainty was supplied or rendered.",
            "tableColumns": [
                {
                    "key": "degreeLow",
                    "header": "Degree (lower)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Inclusive lower degree of the bin. Under per_integer_degree binning it equals the upper."
                },
                {
                    "key": "degreeHigh",
                    "header": "Degree (upper)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Inclusive upper degree. Degree bins are inclusive integer ranges, never half-open real intervals."
                },
                {
                    "key": "nodeCount",
                    "header": "Nodes",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact integer number of NODES whose degree falls in this bin. This is the raw observation, and it is a count of nodes — not of connections."
                },
                {
                    "key": "probability",
                    "header": "Probability",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "nodeCount divided by the complete declared node universe, zero-degree nodes included. Present only when normalization is probability."
                },
                {
                    "key": "universeNodeCount",
                    "header": "Universe nodes",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The denominator. Includes every node of degree zero."
                },
                {
                    "key": "countedConnectionCount",
                    "header": "Raw connections",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Rows remaining after the autapse policy. Constant across rows."
                },
                {
                    "key": "countedIncidenceCount",
                    "header": "Counted incidences",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact sum(degree × nodeCount). Equal to raw connections for count_edges and no greater for count_unique_neighbors."
                },
                {
                    "key": "valueUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Dimensionless (1). A degree has no unit and is never converted."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.degree_distribution.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "selectionLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "degreeLow",
                    "degreeHigh",
                    "nodeCount",
                    "probability",
                    "universeNodeCount",
                    "countedConnectionCount",
                    "countedIncidenceCount",
                    "valueUnit"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "bins",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority degree A",
                        "rightValue": "Authority degree B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "direction",
                    "selectionLabel",
                    "countingPolicy",
                    "autapsePolicy",
                    "excludedAutapseStatement",
                    "universeNodeCount",
                    "scopeStatement",
                    "countedConnectionCount",
                    "countedIncidenceCount",
                    "minDegree",
                    "maxDegree",
                    "zeroDegreeNodeCount",
                    "normalization"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "networkx.MultiDiGraph.in_degree / out_degree",
                "version": "3.3",
                "status": "not_run",
                "notes": "networkx is the intended differential oracle, and it is only meaningful parameter for parameter. MultiDiGraph retains parallel edges, which corresponds to `count_edges`; DiGraph has already collapsed them, which corresponds to `count_unique_neighbors` and from which `count_edges` can never be recovered. A self-loop adds one to in_degree and one to out_degree on a directed graph, while the undirected Graph.degree counts it twice — matching the autapse convention is therefore part of the comparison, not an afterthought. NEST 3.10 is the second intended oracle, for the MPI rank-local scope rules specifically. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-getconnections",
                "sources": [
                    {
                        "system": "nest.GetConnections",
                        "role": "primary",
                        "notes": "Supplies the connection rows, preserving every multapse as its own row. Under MPI the returned rows are the ones whose TARGET the rank owns, so the adapter must emit an mpi_target_rank_local scope and declare the rank's targets as observedTargetIds. That scope supports only complete local in-degree; out-degree is rejected with SCOPE_OUT_DEGREE_FROM_RANK_LOCAL because outgoing edges can terminate on other ranks.",
                        "sourceId": "nest-getconnections"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the complete node universe including isolated and silent nodes. Under `mpi_target_rank_local`, this profile also retains the exact local-membership mask of the selected target NodeCollection, so `observedTargetIds` includes locally owned targets with zero incoming rows. GetConnections structurally provides neither fact; without them the zero bin is empty by construction rather than by observation.",
                        "sourceId": "nest-nodecollection"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "networkx-multidigraph",
                "sources": [
                    {
                        "system": "networkx.MultiDiGraph",
                        "role": "primary",
                        "notes": "G.nodes gives the universe and retains isolates. The counting policy must match the graph class: a DiGraph has already collapsed parallel edges, so `count_edges` is refused for it rather than approximated from a collapsed graph.",
                        "sourceId": "networkx-multidigraph"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-block",
                "sources": [
                    {
                        "system": "neo.Block",
                        "role": "primary",
                        "notes": "Neo models electrophysiological signals and spike trains. It carries no connection snapshot, and nothing in it can be mapped to a degree.",
                        "sourceId": "neo-block"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "nwb-core",
                "sources": [
                    {
                        "system": "nwb.core",
                        "role": "primary",
                        "notes": "Core NWB has no standard synaptic-connectivity table. An extension carrying one would need its own certified adapter and its own scope declaration; nothing is mapped today.",
                        "sourceId": "nwb-core"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            }
        ],
        "legacyIds": [
            "nest.in_degree_distribution",
            "nest.out_degree_distribution"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "This figure computes the degree over a SINGLE declared node universe: every counted connection has both endpoints in it, and the counterpart set is the universe itself. A rectangular selection whose counterpart set differs from the degree universe is not expressible in v1, because the v1 topology validators bind both endpoints to one `nodeUniverse`.",
            "Revision 2 executes degree conservation inside the historical `degree.counting_policy_declared` semantic validator id: exact universe coverage, exact raw/incidence identities, policy bounds and the zero-degree universe are checked before rendering.",
            "Registry v1 has no disclosure id for excluded autapses. Under `autapsePolicy: exclude` the excluded count reaches the accessible summary and the table metadata, but no footer disclosure states it.",
            "MULTAPSE_AGGREGATED is emitted when `count_unique_neighbors` collapses parallel connections. Its registry text is worded for matrix cells, so on this figure {contributingCount} must be read as connections per unordered endpoint pair.",
            "Revision 2 verifies exact set equality between `observedTargetIds` and the rank-local node universe, but cannot authenticate the caller's assertion that this is the simulator rank's complete owned-target set.",
            "Because the schema makes `countingPolicy` and `autapsePolicy` required, a missing policy fails structurally. `degree.counting_policy_declared` therefore acts as defence in depth on the normalized request, and its SCIENCE_AGGREGATION_REQUIRED code is reached mainly through migration.",
            "A sampled snapshot is refused with SCOPE_INCOMPATIBLE_WITH_SKILL rather than a sampling-specific code; registry v1 has no code that names the sampling itself.",
            "Cortexel does not filter rows by synapse model, weight sign, or receptor. A selection is expressed by supplying exactly its rows; a filter applied silently would change every degree in the figure.",
            "Cortexel fits and tests nothing. It draws the empirical histogram; a scale-free, binomial or lognormal claim belongs to the reader, and no log-log axis is offered as a stand-in for a fit.",
            "Cortexel cannot verify that the supplied snapshot is the whole snapshot. It verifies the scope and the universe; it cannot know that GetConnections was called with the selection the caller says it was."
        ]
    },
    "network.delay_distribution": {
        "id": "network.delay_distribution",
        "revision": 5,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Synaptic delay distribution over a declared edge population",
        "canonicalQuestion": "What is the distribution of synaptic transmission delays over an explicitly declared population of connections, counted either once per synapse row or once per ordered node pair, within a network scope that states exactly which connections were observed?",
        "cannotEstablish": [
            "That any signal is actually transmitted with these latencies. A delay is a declared model parameter of a connection; the latency of influence also depends on weight, membrane time constant, and network state, none of which is in this figure.",
            "The functional latency between two populations. A synaptic delay is structural; the peak lag of a cross-correlogram is a network property and can differ from the modal delay by more than the delay's own spread.",
            "Anything about connections that were not supplied. The histogram describes exactly the rows in the declared selection. A row filtered upstream is invisible, and Cortexel cannot see that it ever existed.",
            "The global delay distribution from a rank-local or sampled snapshot. It is complete for the retained edges only; extrapolating requires that retention be independent of delay, which Cortexel cannot check and which a prefix of NEST's rank/thread-ordered rows does not satisfy.",
            "The per-pair distribution from a per-synapse histogram, or the reverse. Where multiplicity covaries with delay -- as under a distance-dependent rule, where near pairs get both more contacts and shorter delays -- the two differ systematically and neither can be recovered from the other.",
            "That an alternating comb in the bars is a property of the network. For delays actually produced on a resolution lattice -- for example by ordinary NEST 3.9/3.10 Connect rounding -- a bin width that is not an integer multiple of that resolution can make consecutive bins straddle different numbers of lattice points. `cont_delay_synapse` values retained through model defaults supplied by CopyModel or SetDefaults, or through post-creation SynapseCollection.set (legacy SetStatus), may be off-grid, so source resolution alone cannot establish this mechanism.",
            "That these were the delays in effect at any time other than the declared snapshot. A delay-modifying operation or structural plasticity between two snapshots of one run changes every value here.",
            "Anything about synaptic strength, sign, or receptor. Weights may ride along on the rows; they never affect, filter, or group a delay, and two synapses with identical delay can differ by orders of magnitude in drive.",
            "That the distribution has any functional form. Cortexel draws the empirical histogram: it fits nothing and tests nothing, and a mean delay is a summary of the rows supplied, not a claim about the rule that generated them.",
            "In prebinned mode, that the counts are the counts of the declared selection. Cortexel re-derives the normalization and checks the conservation identity, but it never saw a row: it cannot verify the counting policy, the endpoints, or the positivity of a single delay."
        ],
        "renderer": {
            "id": "figure.distribution",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/connections/sourceIds",
                            "/data/connections/targetIds",
                            "/data/connections/edgeIds",
                            "/data/connections/delays/values",
                            "/data/connections/weights/values",
                            "/data/connections/synapseModels"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/nodeUniverse/ids",
                        "/data/connections/edgeIds",
                        "/data/observedTargetIds"
                    ]
                }
            },
            {
                "id": "bins.strictly_increasing"
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.scope_supports_claim"
            },
            {
                "id": "topology.edge_endpoints_in_universe"
            },
            {
                "id": "topology.delay_positive"
            },
            {
                "id": "histogram.normalization_consistent"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "SAMPLED_EDGES",
            "NODE_UNIVERSE_INCOMPLETE",
            "MULTAPSE_AGGREGATED",
            "MISSING_VALUES_PRESENT",
            "UNIT_CONVERTED",
            "PRE_BINNED_INPUT",
            "UNCERTAINTY_NOT_PROVIDED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 200000,
            "maxVisibleMarks": 20000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Synaptic delay distribution for {selectionLabel}. {consideredConnectionCount} connection rows considered; counting policy {countingPolicy}{pairAggregationStatement}, giving {observationCount} {observationKind} observations in {groupCount} group(s) ({groupByStatement}). Scope: {scopeStatement}. Delays run from {delayMin} to {delayMax} {delayUnit}; declared source resolution {sourceResolution}. {binCount} bins span {binMin} to {binMax} {binUnit} on a {xScale} axis; {underRangeCount} observations fell below and {overRangeCount} above that range. Values are the {normalization} per bin, in {valueUnit}, normalized within each group. No sampling uncertainty was supplied or rendered.",
            "tableColumns": [
                {
                    "key": "groupId",
                    "header": "Group",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "The series: the synapse model when grouping is on, otherwise the selection itself. Each group is normalized within itself."
                },
                {
                    "key": "binStart",
                    "header": "Bin start",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Inclusive lower edge, in the declared bin unit."
                },
                {
                    "key": "binEnd",
                    "header": "Bin end",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive."
                },
                {
                    "key": "binWidth",
                    "header": "Bin width",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The LINEAR width. It is the width used by the density denominator even when the axis is logarithmic."
                },
                {
                    "key": "binUnit",
                    "header": "Bin unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "count",
                    "header": "Observations",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact integer count in this bin. This is the raw observation everything else is derived from; an empty bin is a measured zero, not missing data."
                },
                {
                    "key": "observationKind",
                    "header": "Observation kind",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "connection under per_connection, ordered_pair under per_ordered_pair. A count of synapses and a count of pairs are different numbers and both get called `count`."
                },
                {
                    "key": "normalization",
                    "header": "Normalization",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Which quantity the value carries: count, probability, or density. Stated per row so a reader of the table alone never has to infer it from the magnitudes."
                },
                {
                    "key": "scopeSummary",
                    "header": "Scope summary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A bounded canonical projection of the declared network scope. `global_merged` records complete-rank coverage and world size without repeating `mergedRanks`; the exact raw scope remains once in the canonical request and is covered by the live in-process request digest. Artifact 1.0 binds this table's shape only, not table-cell bytes, and supplies no detached verification or persisted assurance receipt."
                },
                {
                    "key": "probability",
                    "header": "Probability",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "count / binned observations of this group. Present only when normalization is probability."
                },
                {
                    "key": "density",
                    "header": "Density",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "count / (binned observations of this group x linear bin width). Present only when normalization is density."
                },
                {
                    "key": "densityUnit",
                    "header": "Density unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The reciprocal of the bin unit, e.g. /ms for millisecond bins."
                },
                {
                    "key": "groupObservationCount",
                    "header": "Group observations",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The normalization denominator for this group: the observations that fell inside the bin range."
                },
                {
                    "key": "consideredConnectionCount",
                    "header": "Connections considered",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Connection rows considered for this group before the counting policy was applied. Under per_ordered_pair it exceeds the observation count whenever the group contains a multapse."
                },
                {
                    "key": "excludedUnderRangeCount",
                    "header": "Excluded (below range)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Observations below the first bin edge. Always reported; never silently absorbed."
                },
                {
                    "key": "excludedOverRangeCount",
                    "header": "Excluded (above range)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Observations above the last bin edge."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.delay_distribution.output_authority.v5"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "selectionLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "groupId",
                    "binStart",
                    "binEnd",
                    "binWidth",
                    "binUnit",
                    "count",
                    "observationKind",
                    "normalization",
                    "scopeSummary",
                    "probability",
                    "density",
                    "densityUnit",
                    "groupObservationCount",
                    "consideredConnectionCount",
                    "excludedUnderRangeCount",
                    "excludedOverRangeCount"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "bins",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority delay A",
                        "rightValue": "Authority delay B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "selectionLabel",
                    "consideredConnectionCount",
                    "countingPolicy",
                    "pairAggregationStatement",
                    "observationCount",
                    "observationKind",
                    "groupCount",
                    "groupByStatement",
                    "scopeStatement",
                    "delayMin",
                    "delayMax",
                    "delayUnit",
                    "sourceResolution",
                    "binCount",
                    "binMin",
                    "binMax",
                    "binUnit",
                    "xScale",
                    "underRangeCount",
                    "overRangeCount",
                    "normalization",
                    "valueUnit"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "numpy.histogram",
                "version": "2.1.0",
                "status": "not_run",
                "notes": "numpy.histogram is the intended differential oracle for the binning and normalization only, and it is meaningful only parameter for parameter: its rightmost bin is CLOSED, which matches this contract's final-edge-inclusive rule, and `density=True` divides by the total count and the LINEAR bin width, which is the formula fixed here. It has no notion of a counting policy or an edge selection, so per_ordered_pair aggregation and endpoint binding must be applied before the comparison means anything, and it will happily bin a zero or negative delay that this contract refuses. NEST 3.10 is the second intended oracle: verify normal Connect rounding, off-grid `cont_delay_synapse` values retained through model defaults supplied by CopyModel or SetDefaults and post-creation SynapseCollection.set (legacy SetStatus), the lower bound of one simulation resolution, and MPI target-rank-local row semantics. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-getconnections",
                "sources": [
                    {
                        "system": "nest.GetConnections",
                        "role": "primary",
                        "notes": "Provisional source candidate only; Cortexel does not currently ship an executable V1 NEST connection adapter. A base final-snapshot mapping would supply source, target and each observed per-connection delay in milliseconds, preserve every multapse row, and never round or snap values. It would preserve valid off-grid values and make no lattice, rounding or construction-path claim. Under MPI it would remain target-rank-local; the separately named NodeCollection candidate supplies owned-target context that rows cannot reveal.",
                        "sourceId": "nest-getconnections"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the selected endpoint universe and, under `mpi_target_rank_local`, the exact local-membership mask of the selected target NodeCollection. The endpoint universe may be incomplete because this figure makes no isolate claim, but `observedTargetIds` must still include every selected target owned by the rank, including one with no returned connection row.",
                        "sourceId": "nest-selected-endpoints-and-target-locality"
                    },
                    {
                        "system": "nest.GetDefaults(synapse_model)",
                        "role": "required_companion",
                        "notes": "Mapping recipe only; Cortexel does not currently ship an executable V1 NEST connection adapter. Supplies current defaults/status for every observed synapse model. This snapshot does NOT prove the producing NEST runtime, which defaults were active when a connection was created, or whether a row was later changed; it is current model context only. Where a model decomposes total delay, the mapping must export exactly one declared delay quantity and never sum or substitute components silently.",
                        "sourceId": "nest-synapse-model-defaults"
                    },
                    {
                        "system": "host-retained NEST runtime identity",
                        "role": "required_companion",
                        "notes": "Candidate declaration of the producing NEST version/build identity captured from the live run. Model names or final defaults cannot authenticate this fact, and no normative receipt format exists yet.",
                        "sourceId": "host-nest-runtime-identity"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "networkx-multidigraph",
                "sources": [
                    {
                        "system": "networkx.MultiDiGraph",
                        "role": "primary",
                        "notes": "A `delay` edge attribute on a MultiDiGraph retains parallel edges and therefore supports per_connection. A DiGraph has already collapsed them and cannot say with which aggregation, so per_connection is REFUSED from a DiGraph rather than approximated from a collapsed graph.",
                        "sourceId": "networkx-multidigraph"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-block",
                "sources": [
                    {
                        "system": "neo.Block",
                        "role": "primary",
                        "notes": "Neo models electrophysiological signals and spike trains. It carries no connection snapshot, and nothing in it maps to a synaptic delay.",
                        "sourceId": "neo-block"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "nwb-core",
                "sources": [
                    {
                        "system": "nwb.core",
                        "role": "primary",
                        "notes": "Core NWB has no standard synaptic-connectivity table. An extension carrying one would need its own certified adapter and its own scope declaration; nothing is mapped today.",
                        "sourceId": "nwb-core"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "ncp",
                "sources": [
                    {
                        "system": "ncp",
                        "role": "primary",
                        "notes": "Not yet certified. Adapter output is never exempt from the core gate: it is validated by this contract like any other request.",
                        "sourceId": "ncp"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.delay_distribution"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Revision 5 scientific erratum: revision 4 prose incorrectly treated `sourceResolution` as proof that every selected NEST delay lies on one resolution lattice. From revision 5 it is context only: in the verified NEST 3.9/3.10 behavior normal Connect assignment rounds to the resolution, while `cont_delay_synapse` model defaults supplied through CopyModel or SetDefaults and post-creation SynapseCollection.set (legacy SetStatus) can retain valid off-grid values. Revision-4 artifacts retain their recorded identity and must not be reinterpreted as revision 5.",
            "`sourceResolution` is DECLARED context in the request, artifact and summary, not lattice proof. Registry v1 does not bind the NEST version, synapse model, or whether delay assignment used normal Connect, CopyModel/SetDefaults, or post-creation SynapseCollection.set (legacy SetStatus); it therefore neither requires delays to be integer multiples of the resolution nor rejects valid off-grid `cont_delay_synapse` values. It also does not enforce the cited NEST 3.9/3.10 model-conditioned lower bound of one resolution.",
            "Registry gap: there is no disclosure id for out-of-range exclusions. Under `exclude_and_report` the under- and over-range counts reach the summary and the table, but no footer disclosure states them. EVENTS_EXCLUDED_OUT_OF_WINDOW is about a time window and is deliberately not reused.",
            "Registry gap: there is no dedicated error code for a delay falling outside the declared bin range under `reject`. SCIENCE_BIN_EDGES_INVALID is used, matching neuro.isi_distribution; a future SCIENCE_BIN_RANGE_INCOMPLETE would be more precise.",
            "Revision 2 executes conservation, exact prebinned length, normalized-value re-derivation, endpoint binding, group partition and counting-policy-specific multapse semantics inside topology.delay_positive. In particular, per_connection preserves every multapse row and forbids pair aggregation.",
            "MULTAPSE_AGGREGATED's registry text is worded for matrix cells. On this figure {contributingCount} must be read as connections per ordered endpoint pair.",
            "MISSING_VALUES_PRESENT can fire only from a ride-along weight series. A null DELAY is refused outright, so it can never be the cause here.",
            "Cortexel does not choose bin edges. For a population independently known to come from a grid-constrained model or the cited NEST 3.9/3.10 normal Connect assignment, a 0.1 ms lattice cut by 0.15 ms bins makes consecutive bins span two and one lattice points, drawing a uniform population as a 2:1 sawtooth. Off-grid `cont_delay_synapse` values need not show that comb, and `sourceResolution` alone cannot predict it.",
            "Cortexel cannot verify that the supplied rows are the selection the caller says they are. It verifies scope, endpoints, positivity and conservation; it cannot know which GetConnections call produced the rows.",
            "There is no autapse filter. A self-connection's delay is a delay and is counted like any other; excluding self-connections means not supplying those rows.",
            "Prebinned mode verifies the normalization and the conservation identity but cannot verify positivity, endpoint membership, or the counting policy, because Cortexel never saw an edge. PRE_BINNED_INPUT says so on the figure.",
            "Cortexel fits and tests nothing. A mean, a mode, or an apparent bimodality read off this figure is a property of the rows supplied and of the bins chosen for them."
        ]
    },
    "network.delay_matrix": {
        "id": "network.delay_matrix",
        "revision": 5,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Transmission-delay matrix over a declared target-row / source-column node universe",
        "canonicalQuestion": "For each ordered (source, target) pair in a declared node universe, what is the explicitly named aggregate of the positive transmission delays of the connections observed between them, under a declared network scope?",
        "cannotEstablish": [
            "That an empty cell is a connection with zero delay. An empty cell means no connection was observed under the declared scope; a zero delay is rejected outright, so no cell in this figure is ever drawn at zero.",
            "The delay of any single synapse in a cell that aggregates multapses. A mean over parallel synapses of 1 ms and 9 ms reports 5 ms — a latency no spike in this network ever experiences.",
            "That a source does not connect to a target outside the owned rows of a rank-local snapshot. Those rows are not observed; sampled snapshots are refused because they cannot establish complete cell aggregates.",
            "The total source-to-target latency when the synapse model splits axonal and dendritic delays and the source reported only the dendritic component. The two are numerically indistinguishable; only the declared delaySemantics tells them apart.",
            "The sign, amplitude, or receptor of any connection. Two cells with identical delay may drive their targets in opposite directions; a delay matrix carries no weight information at all.",
            "Any degree. Row and column marginals of delays are not quantities, are never computed, and are never rendered; a row with three painted cells is not a target with in-degree three, because multapses share a cell.",
            "That the delays hold at any time other than the declared snapshot time. A network with plastic or rewired delays has a different matrix at every snapshot.",
            "Any claim about when a target actually fired. A delay is the latency a synapse imposes on transmission, not evidence about spikes, and this figure contains no spike data.",
            "Any uncertainty distribution within a cell. A cell is one colour. The complete returned table preserves contributing count, observed minimum and maximum, caller-supplied ids, and models, but that empirical range is not a confidence or uncertainty interval and is not drawn in the heatmap."
        ],
        "renderer": {
            "id": "figure.matrix",
            "revision": 5,
            "axisOrder": "target_rows_source_columns"
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/connections/sourceIds",
                            "/data/connections/targetIds",
                            "/data/connections/edgeIds",
                            "/data/connections/delays/values",
                            "/data/connections/synapseModels"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/nodeUniverse/ids",
                        "/data/connections/edgeIds",
                        "/data/observedTargetIds"
                    ]
                }
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.scope_supports_claim"
            },
            {
                "id": "topology.node_universe_declared"
            },
            {
                "id": "topology.edge_endpoints_in_universe"
            },
            {
                "id": "topology.matrix_contract"
            },
            {
                "id": "topology.multapse_aggregation_declared"
            },
            {
                "id": "topology.delay_positive"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "NODE_UNIVERSE_INCOMPLETE",
            "MULTAPSE_AGGREGATED",
            "ABSENT_IS_NOT_ZERO",
            "UNIT_CONVERTED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 200000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Delay matrix for {matrixLabel}. Rows are targets ({rowCount} declared), columns are sources ({columnCount} declared). {presentCellCount} cells have at least one observed connection, {absentCellCount} have none observed, and {notObservedCellCount} lie outside the declared scope. Cells show the {multapseAggregation} of {delaySemantics} delays over {connectionCount} connections, in {displayUnit}. Delay ranges from {delayMin} to {delayMax} {displayUnit}; the colour domain is that observed extent and does not include zero. Scope: {scopeKind}, snapshot time {snapshotTime} {snapshotTimeUnit}. No uncertainty is drawn: per-cell contributing count, minimum and maximum are in the table. {compactionStatement}",
            "tableColumns": [
                {
                    "key": "rowIndex",
                    "header": "Row",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Zero-based index into the declared target (row) universe."
                },
                {
                    "key": "targetId",
                    "header": "Target",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The postsynaptic node. Rows are targets."
                },
                {
                    "key": "columnIndex",
                    "header": "Column",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Zero-based index into the declared source (column) universe."
                },
                {
                    "key": "sourceId",
                    "header": "Source",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The presynaptic node. Columns are sources."
                },
                {
                    "key": "cellStatus",
                    "header": "Cell status",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "present, absent (no connection observed under a scope that could have seen one), or not_observed (the scope could not see this cell)."
                },
                {
                    "key": "delayAggregate",
                    "header": "Delay",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The declared aggregate. Empty when the cell is absent or not_observed — never zero."
                },
                {
                    "key": "displayUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "multapseAggregation",
                    "header": "Aggregation",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The declared policy that produced the cell value."
                },
                {
                    "key": "delaySemantics",
                    "header": "Delay meaning",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "total_transmission, or dendritic_component_only when the model splits axonal and dendritic delays."
                },
                {
                    "key": "contributingConnectionCount",
                    "header": "Connections",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "How many connection rows contribute to this cell. Greater than one means a multapse was aggregated."
                },
                {
                    "key": "delayMin",
                    "header": "Delay min",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Minimum over the contributing connections. Equal to the aggregate only under min."
                },
                {
                    "key": "delayMax",
                    "header": "Delay max",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Maximum over the contributing connections. The spread a single colour cannot show."
                },
                {
                    "key": "contributingEdgeIds",
                    "header": "Connection ids",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Canonical array of caller-supplied ids contributing to the cell, or null when the snapshot supplied no edge-id channel. Revision 2 never assigns a replacement ordinal."
                },
                {
                    "key": "synapseModels",
                    "header": "Synapse models",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The distinct models contributing to this cell."
                },
                {
                    "key": "isAutapse",
                    "header": "Autapse",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "True when source == target. Autapses are retained on the diagonal."
                },
                {
                    "key": "scopeSummary",
                    "header": "Scope summary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A bounded canonical projection of the observation scope, including snapshotTime verbatim. For global_merged, validator-proven complete coverage is represented as all_ranks_0_through_worldSize_minus_1 rather than repeating the redundant mergedRanks array in every row. The canonical request retains the exact raw scope once and the live in-process requestDigest covers that request. Artifact 1.0 binds table shape only: it does not bind these table-cell bytes and provides no detached verification or persisted assurance receipt. A separate snapshotTime column would duplicate this closed summary and is deliberately omitted in revision 2."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.delay_matrix.output_authority.v5"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "matrixLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "rowIndex",
                    "targetId",
                    "columnIndex",
                    "sourceId",
                    "cellStatus",
                    "delayAggregate",
                    "displayUnit",
                    "multapseAggregation",
                    "delaySemantics",
                    "contributingConnectionCount",
                    "delayMin",
                    "delayMax",
                    "contributingEdgeIds",
                    "synapseModels",
                    "isAutapse",
                    "scopeSummary"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "cells",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority matrix A",
                        "rightValue": "Authority matrix B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "matrixLabel",
                    "rowCount",
                    "columnCount",
                    "presentCellCount",
                    "absentCellCount",
                    "notObservedCellCount",
                    "multapseAggregation",
                    "delaySemantics",
                    "connectionCount",
                    "displayUnit",
                    "delayMin",
                    "delayMax",
                    "scopeKind",
                    "snapshotTime",
                    "snapshotTimeUnit",
                    "compactionStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "nest.GetConnections + SynapseCollection.get(['source','target','delay'])",
                "version": "3.10.0",
                "status": "not_run",
                "notes": "The intended differential oracle is NEST itself: build a fixture with known multapses, an autapse, an isolate target, and known per-connection delays; verify normal Connect rounding, off-grid `cont_delay_synapse` values retained through model defaults supplied by CopyModel or SetDefaults and post-creation SynapseCollection.set (legacy SetStatus), and the lower bound of one simulation resolution. Read the SynapseCollection and assert the derived cells, counts, min/mean/max aggregates, and source-column/target-row orientation. Under MPI also confirm rank-local output covers exactly the locally owned targets. The pinned NEST 3.10 environment has NOT been executed here, so status remains not_run. Aggregation arithmetic is covered separately by hand vectors."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-getconnections",
                "sources": [
                    {
                        "system": "nest.GetConnections",
                        "role": "primary",
                        "notes": "Provisional source candidate only; Cortexel does not currently ship an executable V1 NEST connection adapter. A base final-snapshot mapping would map NEST `target` to rows and `source` to columns, preserve multapses, and copy observed millisecond delays verbatim. It would make no lattice, rounding or construction-path claim, so valid off-grid values remain valid and no historical assignment receipt is required for this base view.",
                        "sourceId": "nest-getconnections"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the complete selected node universe and, for `mpi_target_rank_local`, the exact local-membership mask of the selected target NodeCollection. This retains isolates and locally owned zero-input targets; `observedTargetIds` is never inferred from returned connection targets.",
                        "sourceId": "nest-selected-node-and-target-locality"
                    },
                    {
                        "system": "nest.GetDefaults(synapse_model)",
                        "role": "required_companion",
                        "notes": "Supplies current defaults/status for every observed synapse model and the present model context for choosing one declared delay quantity. It does NOT establish the producing NEST version, historical defaults, construction path or later updates. Models with separate axonal/dendritic components are never silently summed.",
                        "sourceId": "nest-synapse-model-defaults"
                    },
                    {
                        "system": "host-retained NEST runtime identity",
                        "role": "required_companion",
                        "notes": "Candidate declaration of the producing NEST version/build identity captured from the live run. A model name or final status cannot authenticate this identity, and no normative receipt format exists yet.",
                        "sourceId": "host-nest-runtime-identity"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "brian2-synapses",
                "sources": [
                    {
                        "system": "brian2.Synapses",
                        "role": "primary",
                        "notes": "Brian2 carries a per-synapse `delay` with a real unit, but its i/j indices are array positions, not node ids: the caller must supply the index-to-id mapping explicitly. Brian2's pre/post delay distinction must be resolved into delaySemantics rather than assumed.",
                        "sourceId": "brian2-synapses"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "networkx-digraph",
                "sources": [
                    {
                        "system": "networkx.DiGraph",
                        "role": "primary",
                        "notes": "The caller must name the edge attribute holding the delay and declare its unit; NetworkX carries neither units nor scope, so both must be supplied. A MultiDiGraph is required if multapses exist — a DiGraph has already destroyed them before Cortexel is reached, and nothing here can recover them.",
                        "sourceId": "networkx-digraph"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo",
                "sources": [
                    {
                        "system": "neo",
                        "role": "primary",
                        "notes": "Neo models recorded signals and spike trains. It has no connectivity object, so there is nothing to map.",
                        "sourceId": "neo"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "nwb-core",
                "sources": [
                    {
                        "system": "nwb.core",
                        "role": "primary",
                        "notes": "NWB core has no synapse-level connection table carrying delays. A custom extension would be required, and none is certified; a partial or invented mapping would produce a matrix whose absent cells mean nothing.",
                        "sourceId": "nwb-core"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "ncp",
                "sources": [
                    {
                        "system": "ncp",
                        "role": "primary",
                        "notes": "The narrow NCP adapter surface is not yet certified for connection snapshots. It cannot feed this figure until it declares scope explicitly, because a connection export without scope cannot distinguish an absent cell from a not_observed one — and that distinction is the entire content of a sparse matrix.",
                        "sourceId": "ncp"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.delay_matrix"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Revision 5 scientific erratum: revision 4 prose incorrectly treated `simulationResolution` as proof that every selected NEST delay lies on one resolution lattice. From revision 5 it is context only: in the verified NEST 3.9/3.10 behavior normal Connect assignment rounds to the resolution, while `cont_delay_synapse` model defaults supplied through CopyModel or SetDefaults and post-creation SynapseCollection.set (legacy SetStatus) can retain valid off-grid values. Revision-4 artifacts retain their recorded identity and must not be reinterpreted as revision 5.",
            "No disclosure id exists for delay semantics. `delaySemantics` is machine-checkable, but disclosures.v1.json has no rule for it, so it is carried in the legend, the accessible summary, and the table rather than the disclosure footer. A DELAY_COMPONENT_SEMANTICS rule is proposed for the registry.",
            "ABSENT_IS_NOT_ZERO's published text names a zero weight. For this figure that clause is vacuous — a zero delay is rejected — and the real hazard it must cover is an empty cell being read as instantaneous transmission at the fast end of the ramp.",
            "The registered `matrix_value_quantize` policy is not advertised or executed by revision 2. Every accepted cell is painted directly and an over-budget request is refused, so no quantization receipt, downsampling fact, or downsampling disclosure is produced. A future paint-only implementation would have to retain every cell and bind a complete evidence table before this skill could advertise it.",
            "`simulationResolution` is recorded as context but does not establish a delay lattice. No registered validator binds the NEST version or knows whether NEST used normal Connect rounding, `cont_delay_synapse` model defaults supplied through CopyModel or SetDefaults, or post-creation SynapseCollection.set (legacy SetStatus), and no validator enforces the cited NEST 3.9/3.10 model-conditioned lower bound of one resolution. Valid off-grid continuous delays are intentionally accepted and displayed rather than snapped or rejected.",
            "There is no declared or shared colour domain, so two delay matrices are NOT comparable by colour — compare the legends or the tables. A shared domain needs a clipping disclosure that does not exist in disclosures.v1.json.",
            "Cortexel cannot detect a transposed adapter: if the source and target arrays are swapped, every validator passes and the figure is a plausible lie about direction. The defences are the adapter's own vectors and restating orientation on the axes, legend, caption, and table.",
            "No uncertainty variant is renderable in a cell, so the spread across aggregated multapses is invisible in the colour. The complete returned table preserves contributor count and observed minimum/maximum, but those values are an empirical range rather than an uncertainty estimate.",
            "Delays of different synapse models share one matrix because they share one dimension. That is dimensionally correct, but a matrix mixing a split-delay model with a total-delay model mixes two meanings. The models are carried per cell; no validator refuses the mix.",
            "The matrix is square over one declared node universe: rows (targets) and columns (sources) index the same node set. A rectangular/bipartite matrix over two distinct universes is not offered, because topology.edge_endpoints_in_universe binds both endpoints to the single data.nodeUniverse.",
            "The node universe must be declared complete: topology.node_universe_declared rejects complete == false, so a delay matrix over an explicitly partial node set is not available. Edge-snapshot partiality is expressed through the declared scope instead."
        ]
    },
    "network.spatial_map_2d": {
        "id": "network.spatial_map_2d",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Two-dimensional spatial map of declared node positions",
        "canonicalQuestion": "Where, in a declared two-dimensional coordinate frame, were the nodes of a declared universe positioned at one snapshot — drawn at one equal scale on both axes, with every coordinate preserved exactly, every missing position reported rather than placed at the origin, and periodic-boundary metadata used to choose an edge chord rather than to invent duplicate nodes?",
        "cannotEstablish": [
            "That the drawn nodes are all the nodes in the region. Emptiness on this map is emptiness in the DECLARED universe under the declared scope; a sampled or rank-local scope shows a fraction of the layer, and its empty regions may be full.",
            "Areal density. This contract derives none: units.v1 has no area code and no per-area quantity kind, and a reader who divides marker count by drawn area is measuring the selection, not the tissue.",
            "That two overlapping markers are one node. Coincident coordinates overlap exactly and are never jittered, so a grid layer holding an excitatory and an inhibitory population at the same points draws N markers for 2N neurons.",
            "Anything about a third dimension. There is no projection mode: projecting a 3-D layer would collapse a real axis and make distant neurons coincident.",
            "Soma size, arbor extent, or any physical size. Marker radius is fixed screen-space decoration; it does not scale with the data and it is not a length.",
            "Connectivity, when no connections are supplied — and, when they are, only the connections inside the declared scope. A drawn chord is a declared synapse, never a measured axonal path.",
            "Separation across a periodic boundary read straight off the page. Under a wrapped chord the drawn segments end at the domain edge; the modelled separation is the minimum image, not the on-page length.",
            "That a per-node value was measured over any particular window. The value is whatever the caller bound to the node; this figure carries no analysis window for it and re-derives nothing about it.",
            "Localization uncertainty. There is no positional error channel: a 1-D uncertainty array cannot express a 2-D error, and drawing it as a disc would assert an isotropy the source never declared.",
            "What the layout is at any other time. This is one snapshot; under structural plasticity the node set at another time is a different node set.",
            "That the coordinate frame corresponds to anatomical space. Cortexel records the declared frame id. It performs no registration and no frame transform."
        ],
        "renderer": {
            "id": "figure.spatial_map_2d",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/positions/nodeIds",
                            "/data/positions/x/values",
                            "/data/positions/y/values",
                            "/data/positions/value/values"
                        ],
                        [
                            "/data/connections/sourceIds",
                            "/data/connections/targetIds",
                            "/data/connections/edgeIds",
                            "/data/connections/weights/values",
                            "/data/connections/delays/values",
                            "/data/connections/synapseModels"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/nodeUniverse/ids",
                        "/data/positions/nodeIds",
                        "/data/connections/edgeIds"
                    ]
                }
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.scope_supports_claim"
            },
            {
                "id": "topology.node_universe_declared"
            },
            {
                "id": "topology.edge_endpoints_in_universe"
            },
            {
                "id": "topology.delay_positive"
            },
            {
                "id": "topology.weight_group_compatible"
            },
            {
                "id": "topology.multapse_aggregation_declared"
            },
            {
                "id": "spatial.position_coverage_complete"
            },
            {
                "id": "spatial.equal_axis_units"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant",
                "parameters": {
                    "supported": [
                        "none"
                    ]
                }
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "SAMPLED_EDGES",
            "NODE_UNIVERSE_INCOMPLETE",
            "POSITIONS_MISSING",
            "MULTAPSE_AGGREGATED",
            "MISSING_VALUES_PRESENT",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 200000,
            "maxVisibleMarks": 50000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Spatial map {mapLabel}. {drawnNodeCount} of {declaredNodeCount} nodes drawn at {positionStatus} positions in frame {frameId}; {missingPositionCount} have no declared position and are omitted, never placed at the origin. Axes {xAxisLabel} and {yAxisLabel}, both {positionUnit}, one equal scale. Domain: {domainStatement}. Boundary: {boundaryStatement}. {minimumImageTieChordCount} unordered physical chords contain {minimumImageTieAxisCount} exact half-period axis ties; every tie uses the positive axis direction. {coincidentNodeCount} nodes exactly overlap another node; positions are never jittered. {outsideDomainCount} lie outside the declared domain. Marker radius is fixed screen-space decoration and encodes nothing. Color: {nodeEncodingStatement}. Connections: {connectionStatement}. Node universe: {nodeUniverseStatement}. Scope: {scopeStatement} {uncertaintyStatement} {compactionStatement} {tableStatement}",
            "tableColumns": [
                {
                    "key": "rowKind",
                    "header": "Row",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "`node` or `connection`. A cell that does not apply to the row kind is empty; an empty cell is never a zero."
                },
                {
                    "key": "id",
                    "header": "Id",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "The caller-supplied node id on a node row. On a connection row this is the caller-supplied edge id when present; otherwise `connection-row-N` is a deterministic renderer-local row address derived from the source ordinal. That fallback binds the row and DOM mark but is NOT a claim that the source identified a synapse."
                },
                {
                    "key": "group",
                    "header": "Group",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Node rows: the declared group, or `ungrouped`; a node belongs to at most one group. Connection rows use `not_applicable`."
                },
                {
                    "key": "x",
                    "header": "x",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The coordinate after the two axes are canonicalized to the finest compatible supplied unit. Never jittered, clamped, or wrapped; any conversion has a derivation receipt."
                },
                {
                    "key": "y",
                    "header": "y",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The coordinate in the same canonical unit as x. Connection rows are empty."
                },
                {
                    "key": "positionUnit",
                    "header": "Position unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The same unit on both axes after canonicalization. A conversion, if any, is recorded in the derivation and disclosed."
                },
                {
                    "key": "positionStatus",
                    "header": "Position status",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "`measured`, `model_generated`, or `supplied`. A NEST layer's coordinates are model_generated, not measured."
                },
                {
                    "key": "positionMissing",
                    "header": "Position missing",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Node rows: true for a selected node with no declared position; such a node is omitted and never drawn at the origin. Connection rows use `not_applicable`."
                },
                {
                    "key": "insideDomain",
                    "header": "Inside domain",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Closed-interval membership under `cortexel_binary64_spatial_domain_membership_v1`: 8 epsilon times declared extent plus the exact one-round endpoint error, itself capped at 32 epsilon times extent. Empty when no domain was declared."
                },
                {
                    "key": "coincidentWith",
                    "header": "Coincident with",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Other node ids sharing this exact coordinate. Two coincident nodes are one marker on the page and two rows here."
                },
                {
                    "key": "value",
                    "header": "Value",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The declared per-node value, or empty when the source supplied a null. Empty is missing, not zero."
                },
                {
                    "key": "valueUnit",
                    "header": "Value unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "sourceId",
                    "header": "Source",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": True,
                    "description": "Connection rows only."
                },
                {
                    "key": "targetId",
                    "header": "Target",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": True,
                    "description": "Connection rows only. The arrowhead is drawn at this end."
                },
                {
                    "key": "chordRule",
                    "header": "Chord",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The exact physical path kind shared by this row's unordered endpoint pair: `autapse_loop`, `straight_chord`, `minimum_image_direct`, or `minimum_image_wrapped`, with `_half_period_tie_x`, `_half_period_tie_y`, or `_half_period_tie_xy` appended when applicable. Reciprocal rows report the same path kind because they reverse one physical route. A wrapped chord's on-page segment length is not a measured axonal path."
                },
                {
                    "key": "parallelCount",
                    "header": "Parallel count",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "How many connections share this unordered measured endpoint chord. Greater than 1 means one chord and this many source rows; reciprocal directions retain separate arrowheads and per-direction count labels."
                },
                {
                    "key": "weight",
                    "header": "Weight",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Exact declared value, or empty when none was supplied."
                },
                {
                    "key": "weightUnit",
                    "header": "Weight unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "`nest:weight` is simulator-defined: never converted, never compared across synapse models."
                },
                {
                    "key": "delay",
                    "header": "Delay",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "delayUnit",
                    "header": "Delay unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "synapseModel",
                    "header": "Synapse model",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "scopeSummary",
                    "header": "Scope summary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A bounded canonical projection of the declared network scope. `global_merged` records complete-rank coverage and world size without repeating `mergedRanks`; the exact raw scope remains once in the canonical request and is covered by the live in-process request digest. Artifact 1.0 binds this table's shape only, not table-cell bytes, and supplies no detached verification or persisted assurance receipt."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.spatial_map_2d.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "mapLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "rowKind",
                    "id",
                    "group",
                    "x",
                    "y",
                    "positionUnit",
                    "positionStatus",
                    "positionMissing",
                    "insideDomain",
                    "coincidentWith",
                    "value",
                    "valueUnit",
                    "sourceId",
                    "targetId",
                    "chordRule",
                    "parallelCount",
                    "weight",
                    "weightUnit",
                    "delay",
                    "delayUnit",
                    "synapseModel",
                    "scopeSummary"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "nodes",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "connections",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority map A",
                        "rightValue": "Authority map B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "mapLabel",
                    "drawnNodeCount",
                    "declaredNodeCount",
                    "positionStatus",
                    "frameId",
                    "missingPositionCount",
                    "xAxisLabel",
                    "yAxisLabel",
                    "positionUnit",
                    "domainStatement",
                    "boundaryStatement",
                    "minimumImageTieChordCount",
                    "minimumImageTieAxisCount",
                    "coincidentNodeCount",
                    "outsideDomainCount",
                    "nodeEncodingStatement",
                    "connectionStatement",
                    "nodeUniverseStatement",
                    "scopeStatement",
                    "uncertaintyStatement",
                    "compactionStatement",
                    "tableStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "ase.geometry.find_mic",
                "version": "3.23.0",
                "status": "not_run",
                "notes": "ASE's minimum-image-convention helper is the intended differential oracle for the periodic chord rule ONLY — never for the layout, the equal-scale mapping, or the table, which are Cortexel's own normative constructions. The comparison is meaningful only after the conventions are pinned parameter for parameter: ASE takes an orthorhombic cell matrix while Cortexel takes centre plus extent, and the tie at exactly half the period (|d| = P/2, where two images are equally short) is resolved by rounding, which the two libraries need not resolve the same way. A hand vector covers it directly: in a 400 um periodic layer, d = 300 um must map to d' = -100 um, and d = 200 um must map to the positive image. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-getposition",
                "sources": [
                    {
                        "system": "nest.GetPosition",
                        "role": "primary",
                        "notes": "Binds node ids to the matching position order — never by array index alone — and retains the single-process / rank-local / merged scope of the position query. The layer's centre, extent and edge_wrap are carried only when the source actually declares them; they are never reconstructed from the coordinates, and a connection mask or kernel is never reconstructed from them at all. NEST layer coordinates are bare numbers: the adapter requires the caller to declare the length unit and never guesses one.",
                        "sourceId": "nest-getposition"
                    },
                    {
                        "system": "nest.GetConnections",
                        "role": "optional_companion",
                        "notes": "The optional edge layer. SynapseCollection.get() in the official singular/scalar form OR canonical plural arrays, never both, never broadcasting an optional scalar across rows, and never deduplicating multapses. The connection scope must come from the actual run, and its snapshot time must match the position query's.",
                        "sourceId": "nest-getconnections"
                    },
                    {
                        "system": "host-retained NEST position snapshot declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for producing runtime/build, run and biological time, exact selected node-id/order digest, coordinate unit, layer centre/extent/edge-wrap metadata, query scope, rank/world/merge completeness, and returned-position digest. Bare coordinate arrays cannot authenticate any of those facts, and Cortexel defines no normative receipt yet.",
                        "sourceId": "host-nest-position-snapshot-declaration"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "optional_companion",
                        "notes": "Candidate authority paired with the optional edge layer. It binds the exact connection query, selected endpoint digests, run/time, rank/world/local-ownership context and returned-row digest to the same position snapshot. It is absent when no edge layer is requested; no normative receipt exists yet.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb",
                "sources": [
                    {
                        "system": "nwb",
                        "role": "primary",
                        "notes": "NWB carries positions in the electrode table and as ophys ROI centroids. The declared unit and what real files actually store do not always agree, so the adapter requires the caller to declare the unit and select the table explicitly; it never infers either. NWB carries no node-universe completeness flag and no MPI scope, so the caller declares both.",
                        "sourceId": "nwb"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo",
                "sources": [
                    {
                        "system": "neo",
                        "role": "primary",
                        "notes": "Neo models recordings, not spatial layouts. There is no faithful mapping, and an invented one would be worse than none.",
                        "sourceId": "neo"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "ncp",
                "sources": [
                    {
                        "system": "ncp",
                        "role": "primary",
                        "notes": "Pending the narrow NCP adapter and its downstream consumer certification.",
                        "sourceId": "ncp"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.spatial_map_2d",
            "nest.spatial_2d"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Blueprint 30.18 permits an anisotropic display when the frame authorizes it. No disclosure rule can state 'the axes carry different scales', so honesty cannot fail closed for it and this revision refuses anisotropic display. Closing the gap needs a new disclosure id, not a skill change.",
            "The closed semantic-validator registry has no `spatial.positions_within_extent` rule and no matching error code, so a position outside the declared domain cannot be REFUSED. It is drawn exactly where it was declared — visibly outside the domain rectangle — and counted in the summary and the table.",
            "UncertaintyV1 is a 1-D per-point channel, so a 2-D localization error cannot be expressed. Rendering a single array as an isotropic disc would assert an isotropy nobody declared, so only `none` is supported.",
            "units.v1 has no area code and no per-area quantity kind, so an areal density cannot be emitted as a typed quantity. The summary reports the node count and the declared extent; the figure makes no density claim of its own.",
            "One scope governs the whole snapshot: `data.scope` is read by both topology.scope_declared and topology.scope_supports_claim. There is no separate connection scope field, so the position and connection layers cannot declare conflicting snapshot times; a single declared scope binds them together.",
            "`spatial.position_coverage_complete` runs on every request, independent of `missingPositionPolicy`, so this revision requires a position for every selected node even under `omit_and_disclose`. A map with a hole is refused (SCOPE_POSITION_COVERAGE_INCOMPLETE), never drawn as a partial map.",
            "`topology.node_universe_declared` refuses a `nodeUniverse.complete = false`, so a declared-incomplete universe is rejected (SCOPE_NODE_UNIVERSE_REQUIRED) rather than disclosed in this revision. NODE_UNIVERSE_INCOMPLETE remains reserved for a future revision that can ground a partial-universe reading.",
            "Marker radius is fixed screen-space decoration. Two neurons 1 um apart in a 400 um map are drawn as overlapping dots, and a dot's area is not a soma.",
            "No node compaction policy exists: extrema sampling and averaging both destroy the spatial distribution the figure exists to show, and none in the registry fits a point cloud. Above the visible-mark budget a request is refused (RESOURCE_COMPACTION_UNAVAILABLE), never thinned.",
            "The registered `graph_declared_subset` policy is not advertised or executed by this skill. A caller may supply an already sampled optional edge layer only by declaring its sampled source scope and retained/source counts; that is an input-scope claim disclosed by SAMPLED_EDGES, not renderer compaction. Cortexel never chooses edges to drop and never removes a node.",
            "The shared nodeUniverse type admits 100000 nodes, but this contract draws at most 50000 markers and cannot compact them, so a larger layer is refused rather than shown as a thinned map that would understate its own density.",
            "Coincident nodes overlap exactly and are never separated: a grid layer with an excitatory and an inhibitory population on the same points draws N markers for 2N neurons. The coincident count is reported, but the drawing cannot pull them apart.",
            "Chords between measured positions are straight or wrapped lines, not axonal paths. common.v1 carries no measured axon geometry, and none is invented here.",
            "There is no projection of a 3-D layer. A projected z silently collapses a real axis and can make two distant neurons coincident; a 3-D layer belongs to the experimental 3-D scene, whose table and summary remain the complete route to the data."
        ]
    },
    "network.synaptic_weight_trace": {
        "id": "network.synaptic_weight_trace",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Synaptic weight over time, for identified synapses or a declared group",
        "canonicalQuestion": "How did the weight of a set of individually identified synapses — or the explicitly named aggregate of a declared group of synapses whose membership may change — evolve over a declared time window, under one declared observation semantics that says exactly what was observed and when?",
        "cannotEstablish": [
            "What the weight was between two observations. An event-updated weight is drawn as a step because the value is HELD from its update until the next one; a polled or sampled weight is drawn as a line whose segments are a drawing convention. Neither asserts that anything was measured in between.",
            "That a flat stretch means the plasticity rule was inactive. In NEST an STDP synapse is updated LAZILY, only at a presynaptic spike: postsynaptic activity in between accrues in the postsynaptic trace and is applied at the NEXT presynaptic spike.",
            "That the drawn step is the weight a spike arriving at that instant would have carried. It is the STORED weight, and plasticity pending from postsynaptic activity has not been applied to it yet.",
            "That a flat stretch means the rule stopped acting. A weight sitting at a hard bound (an STDP `Wmax`) stops moving while the rule keeps firing. Saturation and inactivity are visually identical, and this figure cannot separate them.",
            "That the plasticity rule named in `synapseModel` CAUSED the change. Spike-timing-dependent plasticity, homeostatic scaling, structural rewiring and a caller's own `SetStatus` write all produce a weight trajectory, and a weight trajectory alone does not distinguish them.",
            "The physical strength of the synapse. A `nest:weight` is simulator-defined: the same value 10.0 may act as a postsynaptic current amplitude under one neuron model and as a conductance under another. It has no SI mapping, is never converted, and is never compared across simulators.",
            "That the plotted synapses are representative of a projection, a population, or a network. The aggregate is over EXACTLY the declared members, its denominator is the number of members that actually had a value at that time, and both counts are printed.",
            "That the declared initial weight or the declared bounds are true. They are caller or model declarations. An initial weight may seed an explicitly attributed leading hold or derived aggregate, and either declaration may be shown as an optional reference line, but Cortexel does not verify the declaration against the simulator. Bounds never clamp, correct, or suppress an observed value: when that member series is displayed, a weight above a declared `Wmax` remains at its observed value; when member geometry is hidden by aggregate-only display, its exact observed row remains in the complete table.",
            "That a poll captured every update. Polling `GetConnections(...).get('weight')` at declared times reveals only the stored value at those times: an update and a counter-update falling between two polls cancel and leave no trace at all.",
            "Anything about synapses held on another MPI rank. A rank holds the connections whose TARGET it owns, so a rank-local weight recorder never saw the rest of them.",
            "That two parallel synapses (a multapse) between the same pair are the same synapse. They are distinct edges with distinct ids and are never merged — and a source that cannot tell them apart cannot be used to plot either of them individually."
        ],
        "renderer": {
            "id": "figure.synaptic_weight_trace",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "note": "This generic pointer evaluator remains a compatibility backstop for the three living edge examples and the pre-aggregated carrier. A group is compared only within itself: one synapse's time array is checked against that SAME synapse's weight array and never against another synapse's, because two synapses legitimately carry different numbers of updates. The dedicated `weight_trace.observation_kind_declared` evaluator dynamically checks every declared series and all pre-aggregated arrays, so correctness does not depend on this registry's lack of an index wildcard.",
                    "groups": [
                        [
                            "/data/series/0/time/values",
                            "/data/series/0/values/values"
                        ],
                        [
                            "/data/series/1/time/values",
                            "/data/series/1/values/values"
                        ],
                        [
                            "/data/series/2/time/values",
                            "/data/series/2/values/values"
                        ],
                        [
                            "/data/aggregate/time/values",
                            "/data/aggregate/values/values",
                            "/data/aggregate/memberCounts",
                            "/data/aggregate/contributingCounts"
                        ]
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/window",
                    "unitDimension": "time"
                }
            },
            {
                "id": "trace.duplicate_time_policy"
            },
            {
                "id": "trace.axis_dimension_compatible"
            },
            {
                "id": "weight_trace.observation_kind_declared"
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.scope_supports_claim"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "SAMPLED_EDGES",
            "AGGREGATE_WITHOUT_RAW_REPEATS",
            "MISSING_VALUES_PRESENT",
            "DUPLICATE_TIMES_AGGREGATED",
            "EVENTS_EXCLUDED_OUT_OF_WINDOW",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "UNCERTAINTY_COVERAGE_INCOMPLETE",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 2000000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none",
            "standard_deviation",
            "quantile_interval",
            "ensemble_range"
        ],
        "accessibility": {
            "summaryTemplate": "Synaptic weight trace. Cardinality: {synapseCardinalityStatement} Model {synapseModels}, weight in {weightUnit} ({weightDimensionStatement}), over {windowStart} to {windowStop} {timeUnit}. Observation semantics: {observationStatement}. {duplicateTimeStatement} Source evidence: {sourceReadingCount} raw readings in {retainedSourceRowCount} retained source rows; {missingCount} raw readings are missing and {excludedCount} are outside the window. Reconstruction evidence: {reconstructionPointCount} raw vertices in {retainedReconstructionRowCount} retained reconstruction rows; {missingReconstructionPointCount} retained vertices are missing and {excludedReconstructionPointCount} are outside the window. {carrierStatement} Display: {displayMode}. {aggregateStatement} {membershipStatement} {referenceStatement} Scope: {scopeStatement}. {uncertaintyStatement} {compactionStatement}",
            "tableColumns": [
                {
                    "key": "seriesId",
                    "header": "Synapse / group",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "The edge id, or the group id on an aggregate row. Two parallel synapses between one pair are two ids and are never merged."
                },
                {
                    "key": "seriesLabel",
                    "header": "Label",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "sourceId",
                    "header": "Source",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Presynaptic node. Descriptive: this figure declares no node universe and makes no connectivity claim. Empty on an aggregate row."
                },
                {
                    "key": "targetId",
                    "header": "Target",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Postsynaptic node. Empty on an aggregate row."
                },
                {
                    "key": "synapseModel",
                    "header": "Synapse model",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Every row carries canonical structured text containing its exact actual model set, the complete caller-declared model set, and the `weightComparability` mode. A raw row therefore remains auditable after detachment from its request, while a derived aggregate preserves the ordered model set; physical dimension compatibility alone is never presented as a model-level comparability proof."
                },
                {
                    "key": "time",
                    "header": "Time",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "In the window's declared unit, after any recorded conversion."
                },
                {
                    "key": "timeUnit",
                    "header": "Time unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "value",
                    "header": "Weight",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The observed weight, or the aggregate on an aggregate row. Empty when the observation is missing. A missing observation is not zero."
                },
                {
                    "key": "valueUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A `nest:weight` is simulator-defined: no SI mapping, never converted, never compared across systems."
                },
                {
                    "key": "observationKind",
                    "header": "Observation",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "event_updated (held, emitted as steps), point_sample (consecutive finite samples joined by straight segments only within one valid render run), or interpolated_trajectory (supplied linear reconstruction vertices, not observations). Missingness and membership/recording availability transitions break applicable runs."
                },
                {
                    "key": "updateSemantics",
                    "header": "Held",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "value_after_update: this value holds forward from its time. value_before_update: it describes the interval ending at its time. The two differ by one inter-update interval on every step edge."
                },
                {
                    "key": "paintedInterval",
                    "header": "Painted interval",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Canonical structured {from,until,unit} only when this carrier owns an emitted positive-duration event hold in the exact frozen RenderPlan runs. `from` and `until` are the endpoints of that horizontal RenderPlan span, not a separate claim about mathematical endpoint closure or pixel visibility. The span is clipped by the analysis window, recorded interval and any membership lifetime. Null for table-only carriers, missing values, point/reconstruction vertices and closed-stop singleton points."
                },
                {
                    "key": "renderRunOrdinal",
                    "header": "Render run",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Zero-based ordinal of the exact explicit primary trace run owned by this carrier within the frozen RenderPlan. A run may be a line/path carrier sequence or a contract-mandated singleton marker. Within line/path geometry, equal ordinals identify the same explicit RenderPlan run and different ordinals require distinct RenderPlan subpaths. Null means the carrier owns no primary run. Optional observation/reconstruction markers do not create a run, while a mandatory closed-stop singleton is itself an explicit singleton run with an ordinal but no line segment or paintedInterval. The ordinal is bound into primary line/path provenance where such a subpath exists. This is a RenderPlan topology check, not assurance of serialized SVG paths, clipping, or pixel visibility."
                },
                {
                    "key": "eventKind",
                    "header": "Source event",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "What produced the observation: a presynaptic spike, a structural update, a poll of the stored value, or a parameter write."
                },
                {
                    "key": "missing",
                    "header": "Missing",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "true when the weight was null in the source. A missing update breaks the hold; the following interval is undefined, not unchanged."
                },
                {
                    "key": "replicateCount",
                    "header": "Source multiplicity",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "For a retained source-observation or reconstruction row, how many raw caller rows produced this carrier. Greater than one identifies a named duplicate-time aggregate. Null on derived evaluations, initial states, and context witnesses."
                },
                {
                    "key": "memberCount",
                    "header": "Members",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Aggregate rows: how many synapses belonged to the group at this time. A mean that rises while this falls is a different fact from a mean that rises while it holds."
                },
                {
                    "key": "contributingCount",
                    "header": "Aggregate n",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Aggregate rows: how many members actually had a value at this time. THIS is the denominator of the mean. Where it is 0 the aggregate is empty, never zero."
                },
                {
                    "key": "uncertaintyLower",
                    "header": "Uncertainty lower",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "uncertaintyUpper",
                    "header": "Uncertainty upper",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "uncertaintyMethod",
                    "header": "Uncertainty method",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The variant, level and basis. A dispersion across synapses is never relabelled as a confidence interval."
                },
                {
                    "key": "initialWeight",
                    "header": "Initial weight",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The declared value and its origin (a model parameter or a caller assertion). It may seed an explicitly attributed leading hold or derived aggregate, and is drawn as an additional reference line only when requested. It never clamps or corrects an observed value."
                },
                {
                    "key": "bounds",
                    "header": "Bounds",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The declared lower/upper bound, whether it is hard or soft, and its origin. A weight observed beyond a hard bound is reported here and, when that member series is displayed, remains at its observed value; aggregate-only display may hide member geometry but retains the exact row."
                },
                {
                    "key": "carrierKind",
                    "header": "Carrier kind",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "One of source_observation, source_state_witness, caller_reconstruction_point, derived_aggregate_evaluation, declared_aggregate_point, or declared_initial_state. This discriminator prevents a source row, context state witness, reconstruction vertex, initial state, and aggregate evaluation at one time from being conflated; a context witness may itself be directly painted."
                },
                {
                    "key": "carrierOrdinal",
                    "header": "Carrier ordinal",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Zero-based ordinal within this series and carrier kind after exact preparation. Together with series, time, and carrierKind it gives every returned carrier a unique row identity."
                },
                {
                    "key": "carrierMetadata",
                    "header": "Carrier metadata",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Canonical structured metadata owned by the carrier kind. Reconstruction rows bind method/interpolant/author; every duplicate-collapsed source/reconstruction carrier binds the named aggregate policy and method; context witnesses bind carry-in/look-ahead, directly-painted and derived-consultation status; initial-state rows bind declaration time separately from direct paint and derived consumption. Null where no extra carrier metadata is required."
                },
                {
                    "key": "sourceOrdinal",
                    "header": "Source lineage",
                    "cellType": "finite_number_or_string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Canonical scalar/array lineage into caller rows before within-edge stable sorting and named duplicate collapse. Present for retained source observations, reconstruction vertices, and source-state witnesses; null for derived evaluations and declared initial states."
                },
                {
                    "key": "scopeSummary",
                    "header": "Scope summary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A bounded canonical projection of the scope this synapse was observed under. `global_merged` records complete-rank coverage and world size without repeating `mergedRanks`; the exact raw scope remains once in the canonical request and is covered by the live in-process request digest. Artifact 1.0 binds this table's shape only, not table-cell bytes, and supplies no detached verification or persisted assurance receipt. A rank-local snapshot never licenses a claim about another rank's synapses."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.synaptic_weight_trace.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "showObservationMarkers"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "seriesId",
                    "seriesLabel",
                    "sourceId",
                    "targetId",
                    "synapseModel",
                    "time",
                    "timeUnit",
                    "value",
                    "valueUnit",
                    "observationKind",
                    "updateSemantics",
                    "paintedInterval",
                    "renderRunOrdinal",
                    "eventKind",
                    "missing",
                    "replicateCount",
                    "memberCount",
                    "contributingCount",
                    "uncertaintyLower",
                    "uncertaintyUpper",
                    "uncertaintyMethod",
                    "initialWeight",
                    "bounds",
                    "carrierKind",
                    "carrierOrdinal",
                    "carrierMetadata",
                    "sourceOrdinal",
                    "scopeSummary"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "observations",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "reconstruction",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "series_paths",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "uncertainty",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "references",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": True,
                        "rightValue": False,
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "geometry.sequence"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "synapseCardinalityStatement",
                    "synapseModels",
                    "weightUnit",
                    "weightDimensionStatement",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "observationStatement",
                    "duplicateTimeStatement",
                    "sourceReadingCount",
                    "retainedSourceRowCount",
                    "missingCount",
                    "excludedCount",
                    "reconstructionPointCount",
                    "retainedReconstructionRowCount",
                    "missingReconstructionPointCount",
                    "excludedReconstructionPointCount",
                    "carrierStatement",
                    "displayMode",
                    "aggregateStatement",
                    "membershipStatement",
                    "referenceStatement",
                    "scopeStatement",
                    "uncertaintyStatement",
                    "compactionStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "NEST stdp_synapse + weight_recorder microfixture (pinned), cross-checked by hand against the analytic STDP update",
                "version": "NEST 3.10.0",
                "status": "not_run",
                "notes": "There is no library-independent oracle for most of this contract. The hold semantics, the membership-aware denominators, and the missing-update break are conventions of THIS contract and have no equivalent in Elephant, Neo, or NWB, so they rest entirely on the hand vectors. The one thing an external oracle can settle is the question this figure is most easily wrong about: whether the value a NEST weight recorder writes at a presynaptic spike is the weight BEFORE or AFTER the update that spike triggered. That is a property of stdp_synapse::send() in the pinned version, it must be established by executing a two-spike microfixture whose expected weights were computed by hand from the STDP kernel, and until it is, the adapter must not assume a convention — it must require the caller to declare one. The pinned reference environment has NOT been executed in this environment: the status is not_run, and it is not to be reported as anything else."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-weight-recorder",
                "sources": [
                    {
                        "system": "nest.weight_recorder",
                        "role": "primary",
                        "notes": "Exact NEST 3.10 weight_recorder output includes sender, target, receptor, port, time and weight. The upstream test suite distinguishes same-pair multapses by (source,target,port), so Cortexel must not claim the device lacks all per-synapse discrimination. That tuple is still not a self-authenticating global edge id: a future mapping must bind it to the exact post-prepare connection inventory, recorder and synapse-model/port namespace from the same run. Whether the written weight precedes or follows the update triggered by a spike is a property of the exact synapse implementation/runtime and must also be bound rather than guessed. No such normative receipt or adapter exists, so this candidate mapping remains not_assessed.",
                        "sourceId": "nest-weight-recorder"
                    },
                    {
                        "system": "nest.SynapseCollection post-prepare inventory",
                        "role": "required_companion",
                        "notes": "Candidate authority for binding each recorded (source,target,port,receptor) tuple to one exact connection after recorder preparation. It must preserve same-pair multapses and bind the exact run, biological time, query, synapse model and port namespace. A final free-floating row list is insufficient, and Cortexel does not yet define or consume this receipt.",
                        "sourceId": "nest-weight-recorder-connection-inventory"
                    },
                    {
                        "system": "host-retained NEST recorder/runtime declaration",
                        "role": "required_companion",
                        "notes": "Candidate authority for the producing runtime/build, recorder identity and interval, synapse-model namespace, rank/world scope and model-specific pre/post-update convention. Until a closed digest-bound receipt exists, these remain caller declarations rather than authenticated NEST evidence.",
                        "sourceId": "host-nest-weight-recorder-context"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nest-getconnections-polling",
                "sources": [
                    {
                        "system": "nest.GetConnections polling",
                        "role": "primary",
                        "notes": "Repeatedly calling GetConnections(...).get('weight') at declared times yields `point_sample` observations of the STORED weight. Two facts must travel with them. NEST's STDP synapses are updated lazily, only at a presynaptic spike, so a poll returns the last APPLIED weight and not one that includes plasticity pending from postsynaptic activity since. And a poll sees only the moments it looked: an update and a counter-update that both fall between two polls cancel and leave no trace, so a polled trace can never establish that a synapse was quiet.",
                        "sourceId": "nest-getconnections-polling"
                    },
                    {
                        "system": "host-retained NEST weight-polling receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound receipt for the producing runtime/build and run, exact connection inventory and model/port namespace, each biological poll coordinate, query/filter/rank scope, and every returned-row digest. It must bind the same connection identity across polls and disclose model-specific lazy-update semantics. No normative receipt or adapter exists, so this mapping remains not_assessed.",
                        "sourceId": "host-nest-weight-polling-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "brian2-statemonitor-over-synapses",
                "sources": [
                    {
                        "system": "brian2.StateMonitor over Synapses",
                        "role": "primary",
                        "notes": "Brian records synaptic variables on a regular clock. For an event-driven (on_pre / on_post) rule the underlying variable is piecewise-constant between events while the monitor samples it on the clock, so the samples are point samples OF a step function: joining them with straight segments invents ramps that the model never had, and the mapping must therefore either declare `point_sample` honestly or reconstruct the update events. Not certified until a version matrix and fixtures exist.",
                        "sourceId": "brian2-statemonitor-over-synapses"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-nwb",
                "sources": [
                    {
                        "system": "neo / nwb",
                        "role": "primary",
                        "notes": "Neither models a synaptic weight. Forcing a weight trace into a Neo AnalogSignal or an NWB TimeSeries would lose the synapse identity, the update semantics, and the simulator-defined unit, and would present a lazily-updated step function as a regularly sampled continuous signal. A weight trace is not an analog trace: `neuro.analog_trace` closes its quantity-kind enum against `synaptic_weight` for exactly this reason.",
                        "sourceId": "neo-nwb"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "ncp-observation",
                "sources": [
                    {
                        "system": "ncp.observation",
                        "role": "primary",
                        "notes": "An NCP adapter must consume an already-authenticated, already-admitted observation from an immutable pinned NCP release. NCP's declarations are carried, never upgraded: `is_simulation_output=true` becomes `source.kind: simulation`, and an absent calibrated-posterior claim stays absent.",
                        "sourceId": "ncp-observation"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.plasticity_dynamics"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Cortexel cannot verify the update convention. It records the caller's `updateSemantics` and draws it. A wrong declaration produces a fully plausible figure whose every step edge is displaced by one inter-update interval, and no validator can detect it from the numbers.",
            "Exact NEST 3.10 weight_recorder output carries port and receptor fields, and upstream tests distinguish same-pair multapses by (source,target,port). Cortexel has not established the namespace/lifetime needed to promote that tuple to a stable edge id across recorder, model and run boundaries; a future adapter therefore needs an exact post-prepare connection inventory and runtime/recorder receipt rather than either discarding the fields or treating them as globally unique.",
            "Cross-dimension pooling on the value axis IS enforced: `trace.axis_dimension_compatible` reads `data.series[].values.unit` and refuses two synapses of different dimensions (for example `nest:weight` and `nS`) on one axis, because this figure declares no small-multiples layout.",
            "Duplicate carrier times are checked across every edge by the generic policy validator and the weight-specific coherence boundary. Revision 2 refuses every actual `keep_replicates` duplicate: event rows lack same-time side/event identity, repeated point samples would become an invented vertical trajectory, and two reconstruction values at one time are not a function. Point-sample and linear-reconstruction duplicates may instead use a named aggregate because raw edge uncertainty is fixed to none; shared-grid pairing of unresolved replicates remains refused because cross-member replicate identity is absent.",
            "Cortexel-derived hold aggregates support only `value_after_update` and half-open recorded intervals in revision 2. Side-qualified denominator transitions and a terminal value-before carrier are not present in Artifact 1.0. Individual and caller-declared preaggregated traces still honor both update conventions and their registered recorded/window closure directly.",
            "Weight comparability across synapse models is declared in `parameters.weightComparability`, checked as an exact duplicate-free set against every raw series or the declared pre-aggregate model, and shown in the table. This establishes only that the caller made a complete claim matching the models present; Cortexel still cannot establish that distinct models' weights are physically comparable.",
            "Every identified raw edge is limited to `uncertainty:none`: one synapse from one run supplies no aligned repeat universe or repeat-level evidence for a per-time SD, SE, interval, or reconstructed band. Caller-declared preaggregates and Cortexel-derived aggregates may name descriptive across-synapse SD (around a mean), empirical quantiles, or observed range with `basis: ensemble_members`; that states only that the values are concurrent members of the exact declared ensemble. Standard error and confidence intervals are unavailable because no sampling design, estimand, exchangeability claim, repeat universe, or coverage procedure exists.",
            "There is no error code for a weight observed beyond a declared HARD bound. Cortexel never clamps and reports the violation in the table; when that member series and its requested reference are displayed, the observed value and declared bound retain their values. Aggregate-only display may omit raw-member geometry and references, but the exact row remains in the complete table. The value is the measurement; the bound is the caller's claim.",
            "`sum` is not offered. Over a membership that changes size it conflates a change in the number of synapses with a change in their weights, and no registered disclosure can carry that.",
            "Revision 2 executes no line-envelope compaction: accepted step traces are drawn in full and an over-budget request is refused. A future line-envelope policy would have to retain every bucket extremum, bind a complete exact table, and disclose that drawn marks are not recorded updates before this skill could advertise it.",
            "Cortexel can verify that a weight's unit dimension matches its kind. It cannot verify that two models' weights are truly comparable, that a `nest:weight` means what the caller believes, or that a declared bound is the model's."
        ]
    },
    "network.weight_distribution": {
        "id": "network.weight_distribution",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Synaptic weight distribution over a declared edge population",
        "canonicalQuestion": "What is the distribution of synaptic weights over an explicitly declared edge population — a declared source universe, a declared target universe, and a network scope that says how completely those connections were observed — without hiding the sign, the synapse model, the multapse structure, or any sampling?",
        "cannotEstablish": [
            "That a negative weight is inhibitory or a positive weight excitatory. In a conductance-based model an inhibitory synapse carries a POSITIVE conductance weight and its sign of effect comes from the reversal potential, which is a property of the neuron model and is not in this figure at all.",
            "That the postsynaptic effect is proportional to the weight. The effect depends on the synapse model, the receptor port, the reversal potential, the membrane state at arrival, and short-term plasticity — none of which a weight histogram contains.",
            "That two synapse models' weights are comparable. Cortexel checks that a comparability claim was MADE and that it matches the models present; it cannot check that the claim is true, and the claim stays attributed to the caller.",
            "The total drive onto any neuron. That is a sum over a neuron's in-edges and needs the degree and the weights jointly; a marginal weight histogram cannot recover it, because it has thrown away which synapse landed on which target.",
            "That the distribution is stationary. This is one snapshot at one declared time. Under STDP the weight distribution at t = 1 s and at t = 100 s can be unrecognizably different, and neither is 'the' distribution of the network.",
            "That the weights follow any functional form. Cortexel draws the empirical histogram; it fits nothing and tests nothing. A long right tail is not evidence of lognormality, and a log axis is not a fit.",
            "The distribution of the whole network from a sampled edge subset or a rank-local snapshot. Both describe exactly the connections they retained, and a biased retention looks identical to an unbiased one once it is drawn.",
            "That a synapse of weight zero is absent. A zero weight is a PRESENT connection whose strength was measured as zero; a connection that does not exist contributes nothing to this figure at all. The two are different facts and are never merged.",
            "Anything about connections outside the declared source x target rectangle. External Poisson drive, devices, and unselected populations are not in the population unless the caller put them in it.",
            "That the weights are what the caller believes they are, when the unit is `nest:weight`. A simulator-defined unit has no SI meaning; Cortexel never converts it, never pools it across simulators, and cannot check what it stands for."
        ],
        "renderer": {
            "id": "figure.distribution",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/connections/sourceIds",
                            "/data/connections/targetIds",
                            "/data/connections/edgeIds",
                            "/data/connections/weights/values",
                            "/data/connections/delays/values",
                            "/data/connections/synapseModels"
                        ],
                        [
                            "/data/counts",
                            "/data/histogram/values"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/sourceUniverse/ids",
                        "/data/targetUniverse/ids",
                        "/data/connections/edgeIds",
                        "/data/observedTargetIds"
                    ]
                }
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.scope_supports_claim"
            },
            {
                "id": "topology.weight_group_compatible"
            },
            {
                "id": "bins.strictly_increasing"
            },
            {
                "id": "histogram.normalization_consistent"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "SAMPLED_EDGES",
            "MULTAPSE_AGGREGATED",
            "MISSING_VALUES_PRESENT",
            "PRE_BINNED_INPUT",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 200000,
            "maxVisibleMarks": 20000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Synaptic weight distribution for {selectionLabel}. {inRangeObservationCount} observations ({observationUnit}) from {sourceConnectionCount} connections over {sourceNodeCount} declared sources x {targetNodeCount} declared targets. Scope: {scopeStatement}. Models: {synapseModels}; comparability: {weightComparability}. Weights {signTreatment}, unit {weightUnit}. {missingWeightCount} rows produce {missingObservationCount} missing observations and are excluded, never counted as zero; {zeroWeightCount} observations have a measured weight of exactly 0. {binCount} bins span {binMin} to {binMax} {binUnit} on a {xScale} axis. {zeroEdgeStatement} {underRangeCount} observations fell below and {overRangeCount} above that range. Normalization: {normalization}, values in {valueUnit}. No sampling uncertainty was supplied or rendered.",
            "tableColumns": [
                {
                    "key": "groupId",
                    "header": "Group",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "The histogram group id. `all` when grouping is none; otherwise the declared synapse model. Required to keep independently normalized grouped rows distinguishable."
                },
                {
                    "key": "binLow",
                    "header": "Weight (lower)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Inclusive lower edge of the bin."
                },
                {
                    "key": "binHigh",
                    "header": "Weight (upper)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive so the strongest synapse is never dropped."
                },
                {
                    "key": "binWidth",
                    "header": "Bin width",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The LINEAR width, in the bin unit. It is the density denominator even when the axis is logarithmic."
                },
                {
                    "key": "signRegion",
                    "header": "Sign",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "negative, or non_negative. Every bin lies wholly on one side: whenever the range spans zero an exact edge at 0 is required, and no bin may straddle it. This is the non-colour encoding of sign; the non_negative bin that starts at 0 also contains the measured zeros."
                },
                {
                    "key": "count",
                    "header": "Observations",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact integer count of observations in the bin. This is the raw number from which probability and density are derived."
                },
                {
                    "key": "value",
                    "header": "Value",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The normalized value under the declared normalization. Equal to count when normalization is count."
                },
                {
                    "key": "valueUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Dimensionless (1) for count and probability; the reciprocal of the bin unit for density."
                },
                {
                    "key": "inRangeObservationCount",
                    "header": "Binned observations",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The probability and density denominator. It excludes missing weights and out-of-range observations, so it can be smaller than the connection count."
                },
                {
                    "key": "missingObservationCount",
                    "header": "Missing observations",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Missing after the declared observation-unit rule. Distinct from measured zero."
                },
                {
                    "key": "sourceConnectionCount",
                    "header": "Source connections",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Raw rows before aggregation and missing exclusion. Constant across rows."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.weight_distribution.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "selectionLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "groupId",
                    "binLow",
                    "binHigh",
                    "binWidth",
                    "signRegion",
                    "count",
                    "value",
                    "valueUnit",
                    "inRangeObservationCount",
                    "missingObservationCount",
                    "sourceConnectionCount"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "bins",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority weight A",
                        "rightValue": "Authority weight B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "selectionLabel",
                    "inRangeObservationCount",
                    "observationUnit",
                    "sourceConnectionCount",
                    "sourceNodeCount",
                    "targetNodeCount",
                    "scopeStatement",
                    "synapseModels",
                    "weightComparability",
                    "signTreatment",
                    "weightUnit",
                    "missingWeightCount",
                    "missingObservationCount",
                    "zeroWeightCount",
                    "binCount",
                    "binMin",
                    "binMax",
                    "binUnit",
                    "xScale",
                    "zeroEdgeStatement",
                    "underRangeCount",
                    "overRangeCount",
                    "normalization",
                    "valueUnit"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "numpy.histogram",
                "version": "2.1.0",
                "status": "not_run",
                "notes": "numpy.histogram is the intended differential oracle for the binning and normalization, and it is only meaningful parameter-for-parameter: its bins are half-open except for the last, which is closed on the right — the same convention this contract fixes — and its `density=True` divides by the LINEAR bin width, which is exactly the rule that must hold under a logarithmic axis. It has no notion of a missing value, of an out-of-range policy, or of a zero-straddling bin, so those rules are covered by hand vectors instead. NEST 3.10 GetConnections is the second intended oracle, for the multapse and MPI target-rank-local fixtures specifically. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-getconnections",
                "sources": [
                    {
                        "system": "nest.GetConnections",
                        "role": "primary",
                        "notes": "Supplies source, target, weight, delay and synapse_model per connection, preserving every multapse as its own row. Under MPI the returned rows are the ones whose TARGET the rank owns, so the adapter must emit an mpi_target_rank_local scope with the rank's local target universe; it may never emit a global claim from one rank.",
                        "sourceId": "nest-getconnections"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the complete presynaptic source universe of the queried selection rectangle. It is a role-distinct NodeCollection from the target universe even when both happen to contain the same recurrent population; GetConnections rows cannot reconstruct silent selected sources.",
                        "sourceId": "nest-source-nodecollection"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the complete postsynaptic target universe of the queried selection rectangle. Under `mpi_target_rank_local`, this retained collection is exactly the selected targets whose pinned NEST 3.10 local-membership value is true, including owned targets with no returned row; `observedTargetIds` equals that set. Rows cannot reconstruct either the selected target universe or ownership authority.",
                        "sourceId": "nest-target-nodecollection"
                    },
                    {
                        "system": "nest.synapse_defaults",
                        "role": "required_companion",
                        "notes": "Candidate current defaults/status for every observed synapse model. A model's declared weight dimension is insufficient by itself: physical meaning also depends on the postsynaptic neuron model, and current defaults do not authenticate the producing runtime or historical connection state.",
                        "sourceId": "nest-synapse-defaults"
                    },
                    {
                        "system": "host-retained NEST synapse/postsynaptic model semantics",
                        "role": "required_companion",
                        "notes": "Candidate declaration binding every observed synapse model and target neuron model to the exact producing runtime/build, weight quantity and unit, and any cross-model comparability claim. Connection rows cannot establish target-model physics, and Cortexel defines no normative semantics receipt yet.",
                        "sourceId": "host-nest-weight-semantics"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "networkx-multidigraph",
                "sources": [
                    {
                        "system": "networkx.MultiDiGraph",
                        "role": "primary",
                        "notes": "The `weight` edge attribute maps directly and parallel edges are retained, which is what `observationUnit: synapse` requires. A DiGraph has already collapsed parallel edges, so the per-synapse unit is refused for it rather than approximated from a collapsed graph.",
                        "sourceId": "networkx-multidigraph"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-block",
                "sources": [
                    {
                        "system": "neo.Block",
                        "role": "primary",
                        "notes": "Neo models signals and spike trains. It carries no connection snapshot and nothing in it maps to a synaptic weight.",
                        "sourceId": "neo-block"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "nwb-core",
                "sources": [
                    {
                        "system": "nwb.core",
                        "role": "primary",
                        "notes": "Core NWB has no standard synaptic-connectivity table. An extension carrying one would need its own certified adapter and its own scope declaration; nothing is mapped today.",
                        "sourceId": "nwb-core"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            }
        ],
        "legacyIds": [
            "nest.weight_histogram"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Registry gap: the error registry has no dedicated code for observations outside the declared bin range, nor for a bin that straddles zero. SCIENCE_BIN_EDGES_INVALID is the closest registered code for both.",
            "Revision 2 executes exact-zero/no-straddle rules, endpoint rectangle membership, counting-specific multapse aggregation, scope legality, exact comparability-set equality, prebinned conservation and log-domain refusal inside topology.weight_group_compatible before geometry is built.",
            "Registry gap: no disclosure id covers `signTreatment: magnitude`, and none covers observations excluded by `outOfRangeWeights`. Both facts reach the derivation receipt, the accessible summary, and the table metadata, but no footer disclosure states them.",
            "MULTAPSE_AGGREGATED's registry text is worded for matrix cells. Under `observationUnit: node_pair` its {contributingCount} must be read as connections per ordered endpoint pair.",
            "Registry gap: `connectionRows` has no receptor or port field, so receptor grouping is not offered. Two weights on different receptor ports of one neuron are pooled today, and only the synapse-model set can distinguish them.",
            "Registry gap: the unit registry has no reciprocal code for `pS` or `uV`, so `density` is unavailable for weights expressed in those units even though the dimension exists. `count` or `probability` must be used, or the weights converted to `nS` or `mV` first.",
            "A `nest:weight` value's physical meaning depends on the postsynaptic NEURON model as well as the synapse model, and no connection row carries the neuron model. Cortexel checks the synapse-model set and nothing more; the comparability claim stays the caller's.",
            "Cortexel fits and tests nothing. It draws the empirical histogram; a lognormal, heavy-tailed, or bimodal claim belongs to the reader, and no log axis is offered as a stand-in for a fit.",
            "Cortexel cannot verify that the supplied snapshot is the whole snapshot. It verifies id uniqueness, scope merge coverage, the sampling bound, and normalization; it cannot know that GetConnections was called with the selection the caller says it was."
        ]
    },
    "network.weight_matrix": {
        "id": "network.weight_matrix",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Synaptic weight matrix (target rows, source columns)",
        "canonicalQuestion": "For a declared node universe drawn as target rows and source columns, and a declared snapshot time, what is the explicitly named aggregate of the synaptic weights of every observed connection in each cell?",
        "cannotEstablish": [
            "That an empty cell is a connection whose weight is zero. An absent cell means no connection was observed under the declared scope. A measured zero weight is a drawn value with its own colour.",
            "That a cell's colour describes one synapse. Unless `no_aggregation` is in force a cell is an aggregate over every multapse mapping to it, and the aggregate hides how many synapses and how much spread produced it.",
            "That a net-zero cell contains no connection or only zero-valued ones. A sum of +8.0 and -8.0 is 0.0 — numerically identical to a single measured zero synapse. Only the contributing count and the min/max columns separate them.",
            "The functional strength or sign of a connection's influence. A weight is a model parameter: in NEST it may act as a current amplitude, a conductance, or a dimensionless factor depending on the synapse and neuron model.",
            "That the weights are current. This is a SNAPSHOT at the declared time. Under a plastic synapse model the weights at any other moment are different, and this figure says nothing about them.",
            "Anything about connections held on another MPI rank under a rank-local scope, or about any node outside the declared node universe.",
            "That the node ordering carries structure. The order is the caller's declared order; Cortexel never seriates or clusters, so an apparent block is only as real as the declared ordering."
        ],
        "renderer": {
            "id": "figure.matrix",
            "revision": 5,
            "axisOrder": "target_rows_source_columns"
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/connections/sourceIds",
                            "/data/connections/targetIds",
                            "/data/connections/edgeIds",
                            "/data/connections/weights/values",
                            "/data/connections/delays/values",
                            "/data/connections/synapseModels"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/nodeUniverse/ids",
                        "/data/connections/edgeIds",
                        "/data/observedTargetIds"
                    ]
                }
            },
            {
                "id": "topology.scope_declared"
            },
            {
                "id": "topology.scope_supports_claim"
            },
            {
                "id": "topology.node_universe_declared"
            },
            {
                "id": "topology.edge_endpoints_in_universe"
            },
            {
                "id": "topology.matrix_contract"
            },
            {
                "id": "topology.multapse_aggregation_declared"
            },
            {
                "id": "topology.delay_positive"
            },
            {
                "id": "topology.weight_group_compatible"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "PARTIAL_NETWORK_SCOPE",
            "RANK_LOCAL_SCOPE",
            "NODE_UNIVERSE_INCOMPLETE",
            "MULTAPSE_AGGREGATED",
            "ABSENT_IS_NOT_ZERO",
            "MISSING_VALUES_PRESENT",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 200000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Synaptic weight matrix over a declared node universe of {nodeCount} nodes; rows are targets (postsynaptic), columns are sources (presynaptic). {valuedCellCount} cells carry a complete aggregate, {presentWithMissingValueCellCount} contain both measured and missing weights and therefore no aggregate, {presentWithoutValueCellCount} contain only missing weights, {absentCellCount} are observed absence, and {notObservedCellCount} are not_observed. Aggregate: {aggregation} over {connectionCount} connections in {weightUnit}, from {aggregateMin} to {aggregateMax}. Comparability: {synapseModelGroupStatement}. Colour scale: {colorScaleStatement}. Scope: {scopeStatement} at {snapshotTime}. {multapseStatement} {compactionStatement}",
            "tableColumns": [
                {
                    "key": "rowIndex",
                    "header": "Row index",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Zero-based position in the exact caller-declared target-row universe."
                },
                {
                    "key": "targetId",
                    "header": "Target (row)",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The postsynaptic node. Rows are targets; this is fixed by Cortexel and is not caller-configurable."
                },
                {
                    "key": "columnIndex",
                    "header": "Column index",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Zero-based position in the same exact caller-declared source-column universe."
                },
                {
                    "key": "sourceId",
                    "header": "Source (column)",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The presynaptic node. Dense not_observed cells retain their exact source column; no row-level wildcard is used."
                },
                {
                    "key": "cellState",
                    "header": "Cell state",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "valued | present_with_missing_value | present_without_value | absent | not_observed. Missing contributors invalidate the complete aggregate but never turn a present connection into absence or zero."
                },
                {
                    "key": "aggregate",
                    "header": "Weight aggregate",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The named aggregate of the contributing weights, to full binary64 precision. Empty when the cell is not valued."
                },
                {
                    "key": "aggregation",
                    "header": "Aggregation",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The declared formula. There is no default and no 'last edge wins'."
                },
                {
                    "key": "weightUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A `nest:weight` unit is simulator-defined: it has no SI mapping and is never converted or compared across systems."
                },
                {
                    "key": "contributingConnectionCount",
                    "header": "Connections",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Exact returned connection-row count for present or observed-absent cells. Null for not_observed, where zero returned rows is not a claim of zero real connections."
                },
                {
                    "key": "contributingWeightCount",
                    "header": "Measured weights",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "How many contributing rows had a finite measured weight. Null for not_observed. A mean is emitted only when this equals the connection count."
                },
                {
                    "key": "missingWeightCount",
                    "header": "Missing weights",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Exact connection count minus measured-weight count for present/observed cells; null for not_observed. Any positive value makes the complete aggregate null."
                },
                {
                    "key": "weightMin",
                    "header": "Min weight",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The smallest contributing weight. With the max and the count, this is the only route to the spread the single cell colour conceals."
                },
                {
                    "key": "weightMax",
                    "header": "Max weight",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The largest contributing weight. A cell whose min is negative and whose max is positive contains cancelling synapses."
                },
                {
                    "key": "synapseModels",
                    "header": "Synapse model(s)",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The distinct declared models contributing to the cell, and the caller-declared comparability group (synapseModelGroup) under which they were pooled, if any."
                },
                {
                    "key": "contributingEdgeIds",
                    "header": "Contributing edge ids",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Canonical array of caller-supplied ids contributing to the cell, or null when the snapshot supplied no edge-id channel. Revision 2 never synthesizes replacement ordinals."
                },
                {
                    "key": "scopeSummary",
                    "header": "Scope summary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "A bounded canonical projection of the snapshot scope and time. For global_merged, validator-proven complete coverage is represented as all_ranks_0_through_worldSize_minus_1 rather than repeating the redundant mergedRanks array in every row. The canonical request retains the exact raw scope once and the live in-process requestDigest covers that request. Artifact 1.0 binds table shape only: it does not bind these table-cell bytes and provides no detached verification or persisted assurance receipt."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "network.weight_matrix.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "multapseAggregation"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "rowIndex",
                    "targetId",
                    "columnIndex",
                    "sourceId",
                    "cellState",
                    "aggregate",
                    "aggregation",
                    "weightUnit",
                    "contributingConnectionCount",
                    "contributingWeightCount",
                    "missingWeightCount",
                    "weightMin",
                    "weightMax",
                    "synapseModels",
                    "contributingEdgeIds",
                    "scopeSummary"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "cells",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "sum",
                        "rightValue": "mean",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "geometry.sequence"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "nodeCount",
                    "valuedCellCount",
                    "presentWithMissingValueCellCount",
                    "presentWithoutValueCellCount",
                    "absentCellCount",
                    "notObservedCellCount",
                    "aggregation",
                    "connectionCount",
                    "weightUnit",
                    "aggregateMin",
                    "aggregateMax",
                    "synapseModelGroupStatement",
                    "colorScaleStatement",
                    "scopeStatement",
                    "snapshotTime",
                    "multapseStatement",
                    "compactionStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "scipy.sparse.coo_matrix duplicate summation, cross-checked against a NEST GetConnections weight snapshot",
                "version": "scipy 1.14.1; NEST 3.10.0",
                "status": "not_run",
                "notes": "coo_matrix sums duplicate (row, col) entries when converted to CSR or dense, which makes it an exact differential oracle for `aggregation: sum` and for NOTHING else: it has no mean, min, max, or no_aggregation semantics, and it maps an absent cell to 0.0 — the precise conflation this contract exists to prevent. The comparison is therefore valid only on the present cells and only under `sum`, and the absent-cell handling must be excluded before it is meaningful. Orientation must be pinned explicitly (row = target, col = source) because coo_matrix takes (row, col) positionally and a transposed oracle would agree on every symmetric fixture. The pinned reference environment has NOT been executed here, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-synapsecollection",
                "sources": [
                    {
                        "system": "nest.SynapseCollection",
                        "role": "primary",
                        "notes": "Supplies GetConnections plus get(['source', 'target', 'weight', 'synapse_model']). It accepts the official singular/scalar form or canonical plural arrays, never both; it never broadcasts a scalar weight across rows; and it never deduplicates multapses. Accessor-bearing input is rejected before any getter can run. It cannot express an empty selected target row, so the separately named NodeCollection source is mandatory; scope, snapshot time and weight semantics remain explicit mapping authority rather than properties inferred from the rows.",
                        "sourceId": "nest-synapsecollection"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the complete selected node universe, including isolates and targets with zero incoming connections. The matrix uses that one retained universe for both target rows and source columns and never reconstructs it from the endpoints that happen to occur.",
                        "sourceId": "nest-selected-node-universe"
                    },
                    {
                        "system": "host-retained NEST synapse/postsynaptic model semantics",
                        "role": "required_companion",
                        "notes": "Candidate declaration binding every observed synapse model and target neuron model to the exact producing runtime/build, weight quantity and unit, and any cross-model comparability claim. Connection rows cannot establish target-model physics, and Cortexel defines no normative semantics receipt yet.",
                        "sourceId": "host-nest-weight-semantics"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nest-getconnections-under-mpi-target-rank-local",
                "sources": [
                    {
                        "system": "nest.GetConnections under MPI (target-rank-local)",
                        "role": "primary",
                        "notes": "Supplies rank-local connection rows only. The profile produces `mpi_target_rank_local`, never an implicit merge: empty owned rows are observed absence, non-owned rows are not_observed, and every returned edge target must be owned. The exact selected universe and locally owned selected targets come from the separately named NodeCollection companion, not from rows that happen to exist.",
                        "sourceId": "nest-getconnections-under-mpi-target-rank-local"
                    },
                    {
                        "system": "nest.NodeCollection",
                        "role": "required_companion",
                        "notes": "Supplies the complete selected node universe and the local-membership mask of the selected target NodeCollection. `observedTargetIds` is exactly the selected targets whose pinned NEST 3.10 `NodeCollection.local` value is true, including locally owned targets with no incoming rows; localTargetUniverseComplete may be true only for that exact set.",
                        "sourceId": "nest-selected-node-and-target-locality"
                    },
                    {
                        "system": "host-retained NEST synapse/postsynaptic model semantics",
                        "role": "required_companion",
                        "notes": "Candidate declaration binding every observed synapse model and target neuron model to the exact producing runtime/build, weight quantity and unit, and any cross-model comparability claim. Connection rows cannot establish target-model physics, and Cortexel defines no normative semantics receipt yet.",
                        "sourceId": "host-nest-weight-semantics"
                    },
                    {
                        "system": "host-retained NEST connection snapshot receipt",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                        "sourceId": "host-nest-connection-snapshot-receipt"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "connectome-edge-table-source-target-weight-model",
                "sources": [
                    {
                        "system": "connectome edge table (source, target, weight, model)",
                        "role": "primary",
                        "notes": "Accepted only when the table is accompanied by the complete node universe, a scope, a snapshot time, and a declared weight quantity. A bare edge table cannot establish an isolate, a target with no input, or the difference between an absent cell and a measured zero.",
                        "sourceId": "connectome-edge-table-source-target-weight-model"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "scipy-sparse-dense-numpy-weight-matrix",
                "sources": [
                    {
                        "system": "scipy.sparse / dense NumPy weight matrix",
                        "role": "primary",
                        "notes": "Not an input. A COO/CSR/dense matrix has already destroyed the facts this contract requires: duplicate entries were summed (or not) under no recorded policy, an absent cell and a zero weight have both become 0.0, and the contributing edge identities are gone. A matrix is an OUTPUT of this figure, never an input to it.",
                        "sourceId": "scipy-sparse-dense-numpy-weight-matrix"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            },
            {
                "mappingId": "brian2-synapses",
                "sources": [
                    {
                        "system": "brian2.Synapses",
                        "role": "primary",
                        "notes": "Weight arrays are per-synapse and multapses are representable, so the mapping is mechanical. It is not certified until a version matrix and fixtures exist.",
                        "sourceId": "brian2-synapses"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.weight_matrix"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "This figure models the weight matrix over a SINGLE declared node universe: rows are targets and columns are sources, both indexed by that universe (a recurrent population's square matrix; a disjoint source/target set is expressed by listing the union). A bipartite projection with two separately declared, differently ordered universes is not offered, because the topology validators read one `data.nodeUniverse`, and a two-universe shape would leave endpoint-in-universe and universe-completeness unenforced. Registry gap.",
            "`count_weighted_mean` is named conditionally in the blueprint but is not defined in the multapse-aggregation registry, so it is not offered. Registry gap: it needs a precise definition before any implementation may accept it.",
            "`synapseModelGroup` records a caller-declared comparability claim. Cortexel verifies only that the group was DECLARED when two or more distinct synapse models are present (topology.weight_group_compatible checks presence, not content). It cannot verify that the declared group's model set exactly matches the models in the snapshot, nor that two synapse models' weights are actually comparable — both stay attributed to the caller. No registered disclosure id carries the claim, so it is surfaced through the accessible summary and the synapse-model table column. Registry gap.",
            "A `nest:weight` value has no SI meaning. Cortexel never converts, compares, or pools it across simulators, and it cannot check that the number means what the caller believes.",
            "For mpi_target_rank_local the caller declares the exact rank-owned target set. Cortexel can check internal agreement with returned targets, but cannot independently prove that the caller omitted no owned zero-input target; truthfulness of that source declaration remains caller-owned.",
            "No colour-domain clamping parameter is offered, because no registered disclosure could carry a saturated-cell fact. The domain is always the extent of the finite aggregates.",
            "Within-cell dispersion is not drawn. A cell is one colour; the spread of its contributing weights is reachable only through the count and min/max table columns.",
            "Axis tick labels are thinned above a bounded row/column count. Thinning a LABEL never removes a painted cell or a row from the artifact-bound canonical request. Revision 2 returns every present-cell evidence row, including state, aggregation, contributor counts, observed min/max, models, caller-supplied ids, and bounded scopeSummary; it emits no detached sidecar and refuses requests above the complete-returned-table budget.",
            "The matrix is materialized sparsely. A dense export of a node universe beyond the profile's matrix-cell limit is refused rather than streamed."
        ]
    },
    "neuro.analog_trace": {
        "id": "neuro.analog_trace",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Analog quantities over a declared time axis",
        "canonicalQuestion": "How did one or more declared analog quantities — each with its own kind and unit — evolve over a declared time window, without pretending that every signal is a membrane potential and without inventing values between the samples that were actually taken?",
        "cannotEstablish": [
            "What the signal did BETWEEN two samples. The line joining two point samples is a drawing convention, not a measurement: nothing was observed there, and a feature shorter than the sampling interval leaves no trace in the figure at all.",
            "That an unmarked stretch of trace was quiet. At a 0.1 ms recording interval a 0.05 ms event can fall entirely between two samples; its absence from the line is a statement about the sampler, not about the neuron.",
            "That a gap (a missing sample) is a measured zero, a silent period, or a baseline. A null is the absence of an observation and is drawn as a break in the path.",
            "That the declared quantity kind is what the instrument actually recorded. Cortexel verifies that the unit's dimension matches the declared kind; it cannot verify that a channel labelled `V_m` was in fact wired to a membrane potential.",
            "That a series declared `derived` was produced by the method it names. The method is recorded and displayed; it is never re-derived or verified, and a derived series is never re-labelled as recorded.",
            "That two series drawn on one axis are causally related, or that their alignment implies any shared clock beyond the one the caller declared.",
            "Absolute calibration. Any gain, offset, filtering, or reference electrode applied before the data reached Cortexel is invisible here and is not undone.",
            "A firing rate, a spike count, or any per-neuron claim. Those require a declared denominator or a declared event universe and belong to `neuro.population_rate` and `neuro.spike_raster`."
        ],
        "renderer": {
            "id": "figure.analog_trace",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/seriesIds",
                            "/data/series"
                        ],
                        [
                            "/data/series/0/time/values",
                            "/data/series/0/values/values"
                        ],
                        [
                            "/data/series/1/time/values",
                            "/data/series/1/values/values"
                        ],
                        [
                            "/data/series/2/time/values",
                            "/data/series/2/values/values"
                        ],
                        [
                            "/data/series/3/time/values",
                            "/data/series/3/values/values"
                        ],
                        [
                            "/data/series/4/time/values",
                            "/data/series/4/values/values"
                        ],
                        [
                            "/data/series/5/time/values",
                            "/data/series/5/values/values"
                        ],
                        [
                            "/data/series/6/time/values",
                            "/data/series/6/values/values"
                        ],
                        [
                            "/data/series/7/time/values",
                            "/data/series/7/values/values"
                        ],
                        [
                            "/data/series/8/time/values",
                            "/data/series/8/values/values"
                        ],
                        [
                            "/data/series/9/time/values",
                            "/data/series/9/values/values"
                        ],
                        [
                            "/data/series/10/time/values",
                            "/data/series/10/values/values"
                        ],
                        [
                            "/data/series/11/time/values",
                            "/data/series/11/values/values"
                        ],
                        [
                            "/data/series/12/time/values",
                            "/data/series/12/values/values"
                        ],
                        [
                            "/data/series/13/time/values",
                            "/data/series/13/values/values"
                        ],
                        [
                            "/data/series/14/time/values",
                            "/data/series/14/values/values"
                        ],
                        [
                            "/data/series/15/time/values",
                            "/data/series/15/values/values"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/seriesIds"
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/window",
                    "unitDimension": "time"
                }
            },
            {
                "id": "trace.duplicate_time_policy"
            },
            {
                "id": "trace.axis_dimension_compatible"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "MISSING_VALUES_PRESENT",
            "DUPLICATE_TIMES_AGGREGATED",
            "EVENTS_EXCLUDED_OUT_OF_WINDOW",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "UNCERTAINTY_COVERAGE_INCOMPLETE",
            "MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 2000000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none",
            "standard_deviation",
            "standard_error",
            "confidence_interval",
            "quantile_interval",
            "ensemble_range"
        ],
        "accessibility": {
            "summaryTemplate": "Analog trace. {seriesCount} series over {windowStart} to {windowStop} {timeUnit}, layout {layoutMode}. Quantities: {quantitySummary}. {sampleCount} samples retained, {missingCount} missing (drawn as gaps, never interpolated), {excludedCount} outside the window. Point samples are joined by straight segments; nothing was measured between them. Step series are held between samples. Duplicate timestamps: {duplicateTimePolicy}. {unitConversionStatement} {uncertaintyStatement} {compactionStatement}",
            "tableColumns": [
                {
                    "key": "seriesId",
                    "header": "Series",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "The caller's stable id from the seriesIds vector. Unique across the request."
                },
                {
                    "key": "seriesLabel",
                    "header": "Label",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "quantityKind",
                    "header": "Quantity",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The declared kind. `membrane_voltage` is a claim the caller made, not one Cortexel verified."
                },
                {
                    "key": "observationKind",
                    "header": "Observation",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "point_sample (joined by segments) or piecewise_constant (held, drawn as steps)."
                },
                {
                    "key": "origin",
                    "header": "Origin",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "recorded, or derived with the method that produced it. A derived value is never presented as a recorded one."
                },
                {
                    "key": "time",
                    "header": "Time",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "In the window's declared unit, after any recorded conversion."
                },
                {
                    "key": "timeUnit",
                    "header": "Time unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "value",
                    "header": "Value",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Empty when the observation is missing. A missing observation is not zero."
                },
                {
                    "key": "valueUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The unit actually drawn, after any conversion. The original unit is preserved in the artifact."
                },
                {
                    "key": "missing",
                    "header": "Missing",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "true when this observation was null in the source."
                },
                {
                    "key": "replicateCount",
                    "header": "Replicates",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "How many samples at this timestamp produced this row. 1 for a single observation; greater than 1 means the row is an aggregate."
                },
                {
                    "key": "uncertaintyLower",
                    "header": "Uncertainty lower",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "uncertaintyUpper",
                    "header": "Uncertainty upper",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "uncertaintyMethod",
                    "header": "Uncertainty declaration",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The exact variant metadata for this row: basis and sample count for dispersions/ranges; method, level and coverage for confidence intervals; method and both quantiles for quantile intervals. A dispersion is never relabelled as an interval."
                },
                {
                    "key": "sourceOrdinal",
                    "header": "Source row",
                    "cellType": "finite_number_or_string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "The sample's index in the caller's original array, before stable sorting. Every drawn point can be traced back to the row it came from."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.analog_trace.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "showSamplePoints"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "seriesId",
                    "seriesLabel",
                    "quantityKind",
                    "observationKind",
                    "origin",
                    "time",
                    "timeUnit",
                    "value",
                    "valueUnit",
                    "missing",
                    "replicateCount",
                    "uncertaintyLower",
                    "uncertaintyUpper",
                    "uncertaintyMethod",
                    "sourceOrdinal"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "samples",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "series_paths",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "uncertainty",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": True,
                        "rightValue": False,
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "geometry.sequence"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "seriesCount",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "layoutMode",
                    "quantitySummary",
                    "sampleCount",
                    "missingCount",
                    "excludedCount",
                    "duplicateTimePolicy",
                    "unitConversionStatement",
                    "uncertaintyStatement",
                    "compactionStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "neo.AnalogSignal",
                "version": "0.13.0",
                "status": "not_run",
                "notes": "Neo is the intended differential oracle for the adapter path only. Neo's AnalogSignal models a REGULARLY sampled signal (t_start plus sampling_rate), while this contract models explicit (time, value) pairs that may be irregular; a comparison is therefore meaningful only for regular sampling, and the expansion of t_start/sampling_rate into an explicit time vector must be matched to the last representable binary64 step before the comparison means anything. Neo has no equivalent of the duplicate-time policy or the missing-value break, so those paths have no oracle and rest on the hand vectors. The pinned reference environment has NOT been executed in this environment: the status is not_run, and it is not to be reported as anything else."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-multimeter",
                "sources": [
                    {
                        "system": "nest.multimeter",
                        "role": "primary",
                        "notes": "The caller must map each recordable to a quantity kind and unit explicitly. NEST records times in ms and V_m in mV, but a recordable named `V_m` does not license the kind `membrane_voltage` — the adapter never infers a kind from a channel name, because `g_ex`, `I_syn`, and a custom model's state variable arrive through the same interface. The multimeter's `interval` gives point samples, not a held signal, so observationKind is `point_sample` unless the caller declares otherwise.",
                        "sourceId": "nest-multimeter"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected node universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. A bare multimeter event dictionary cannot authenticate these facts, and Cortexel defines no normative receipt yet.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    },
                    {
                        "system": "host-retained NEST recordable semantics",
                        "role": "required_companion",
                        "notes": "Candidate binding from each recorded key to the exact node-model recordable, scientific quantity, unit and producing model/runtime. Similar channel names, model defaults and caller labels are not interchangeable evidence; no normative semantics receipt exists yet.",
                        "sourceId": "host-nest-recordable-semantics"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-analogsignal",
                "sources": [
                    {
                        "system": "neo.AnalogSignal",
                        "role": "primary",
                        "notes": "t_start and sampling_rate expand into an explicit time vector; the unit is taken from the quantity, never guessed. Neo's array_annotations that name a channel are carried into recordedVariable, not into the quantity kind.",
                        "sourceId": "neo-analogsignal"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-timeseries",
                "sources": [
                    {
                        "system": "nwb.TimeSeries",
                        "role": "primary",
                        "notes": "The caller must select `rate` or `timestamps` explicitly — a TimeSeries may carry both, and choosing for them would silently pick a clock. `conversion` and `offset` must be applied by the caller, or the declared unit is a false statement about the stored integers.",
                        "sourceId": "nwb-timeseries"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "ncp-observation",
                "sources": [
                    {
                        "system": "ncp.observation",
                        "role": "primary",
                        "notes": "An NCP observation adapter must consume an already-authenticated, already-admitted observation from an immutable pinned NCP release. NCP's own declarations are carried, never upgraded: `is_simulation_output=true` becomes `source.kind: simulation`, and the absence of a calibrated-posterior claim stays absent.",
                        "sourceId": "ncp-observation"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.voltage_trace"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Registry 1.0 has no disclosure for a `derived` series, for the segment drawn between point samples, or for partial window coverage, though the blueprint asks for all three. Those facts reach the artifact, table and summary but raise no footer disclosure. The rules belong in the registry.",
            "Per-sample out-of-window exclusion has NO semantic validator in registry 1.0: events.within_window reads data.eventTimes, an events shape an analog trace does not carry, so it is not declared here. The exclusion count, its attribution, and the empty-panel refusal live in the render plan. A trace-shaped within-window validator would close this.",
            "series.equal_length has no index-wildcard pointer in registry 1.0, so the per-series time/value length checks are declared as an explicit enumeration of concrete indices (0..15), capping the figure at 16 series. ids.unique reads one flat id array, so series identity is declared in a single data.seriesIds vector rather than inside each series object.",
            "Uncertainty is declared once at parameters.uncertainty (figure-level). The strict request validators check the object, and the render boundary checks bounds, lengths and unit conversion, but a non-`none` declaration can qualify only a one-series figure. Per-series uncertainty for multi-series analog figures would require a new request shape and validator.",
            "Registry 1.0 binds `derivative` to the per_time dimension, so a dimensioned derivative such as dV/dt (mV/ms) cannot be expressed. Calling it dimensionless or inventing a unit would be a false statement about the dimension, so the trace is refused. A `voltage_per_time` dimension would close this.",
            "Revision 2 advertises and executes only compaction policy `none`; `line_envelope_minmax` is registered but unimplemented for this skill. Accepted traces are drawn in full and a request above the visible-mark or complete-returned-table budget is refused. A future envelope implementation must preserve one-sample extrema and bind an exact complete table before it can be advertised.",
            "Cortexel can verify that a unit's dimension matches its declared kind. It cannot verify that the channel was what the caller says it was, that a gain or reference was applied correctly upstream, or that a `derived` series was produced by the method it names.",
            "Nothing in this figure can recover a feature shorter than the sampling interval. Cortexel discloses the samples it was given; it cannot disclose what the sampler never saw."
        ]
    },
    "neuro.compartment_trace": {
        "id": "neuro.compartment_trace",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Signal traces across the identified compartments of one cell",
        "canonicalQuestion": "How does a declared signal evolve over time in each identified compartment of ONE declared cell, with a compartment axis whose ordering basis is declared, disclosed, and never invented by Cortexel?",
        "cannotEstablish": [
            "A morphology. Compartment ids, parent links, and path distances are metadata; this figure never reconstructs or draws a neurite, and never implies a morphology image was supplied.",
            "That a signal travelled between compartments, in which direction, or how fast. A visual sweep down a row-ordered heatmap is a property of the DECLARED row order, not a measured conduction velocity.",
            "That two adjacent rows are anatomically adjacent. Any linear order is a one-dimensional projection of a branched tree: two compartments at the same path distance can sit on different branches.",
            "What the unrecorded compartments did. A declared-but-unrecorded compartment is drawn as unrecorded; its absence is not evidence that it was quiescent.",
            "That a compartment value is a point measurement. It is the model's state for a lumped segment whose size is a discretization choice; refining the discretization changes the value.",
            "That a mean across compartments is 'the cell's' membrane potential. Compartments differ by orders of magnitude in surface area, so an unweighted mean weights a spine head equally with the soma.",
            "Causation. That a dendritic depolarization caused a somatic spike, or was caused by it, cannot be read from co-occurrence in this figure.",
            "That the sampling resolves the model's fastest events. A 0.1 ms sampling interval cannot resolve a 0.5 ms spike upstroke, and Cortexel draws the samples it was given without interpolating between them."
        ],
        "renderer": {
            "id": "figure.compartment_trace",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/compartmentIds",
                            "/data/compartmentParentIds",
                            "/data/compartmentLabels",
                            "/data/compartmentPathDistances/values"
                        ],
                        [
                            "/parameters/compartmentAggregate/compartmentIds",
                            "/parameters/compartmentAggregate/weights"
                        ]
                    ],
                    "note": "Only literal (non-wildcard) pointers are compared, because the registered validator resolves RFC 6901 pointers without an index wildcard. The parallel compartment-axis arrays and the aggregate's weights-to-selection pairing are checked; a series' own time-to-values length is enforced structurally per series and never across series."
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/compartmentIds",
                        "/parameters/overlayCompartmentIds",
                        "/parameters/compartmentAggregate/compartmentIds"
                    ],
                    "note": "The compartment universe, the overlay selection, and the aggregate selection are each id-keyed and must be unambiguous before rows are bound or a table row is addressed. A compartment legitimately carries one series per signal, so series compartment ids are not required unique across signals."
                }
            },
            {
                "id": "compartment_trace.series_identity_declared"
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/window",
                    "unitDimension": "time"
                }
            },
            {
                "id": "trace.duplicate_time_policy"
            },
            {
                "id": "trace.axis_dimension_compatible"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "NODE_UNIVERSE_INCOMPLETE",
            "SCHEMATIC_LAYOUT",
            "EVENTS_EXCLUDED_OUT_OF_WINDOW",
            "MISSING_VALUES_PRESENT",
            "DUPLICATE_TIMES_AGGREGATED",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 2000000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none",
            "standard_deviation",
            "standard_error",
            "confidence_interval",
            "quantile_interval",
            "ensemble_range"
        ],
        "accessibility": {
            "summaryTemplate": "Compartment trace for cell {cellLabel}: {signalLabel} ({quantityKind}) in {unit}, {compartmentCount} compartments over {windowStart} to {windowStop} {timeUnit}. Layout: {layoutMode} ({scaleStatement}). Row order: {compartmentOrderBasis}, declared by the caller and not verified. {recordedCompartmentCount} compartments recorded, {notRecordedCount} declared but not recorded. {sampleCount} samples, {missingSampleCount} missing. Values range from {valueMin} to {valueMax} {unit}. {duplicateTimeStatement} {aggregateStatement} {uncertaintyStatement} {universeStatement} {compactionStatement}",
            "tableColumns": [
                {
                    "key": "cellId",
                    "header": "Cell",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "rowIndex",
                    "header": "Row",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Position on the compartment axis, in the declared order. It is not an anatomical coordinate."
                },
                {
                    "key": "compartmentId",
                    "header": "Compartment",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "compartmentLabel",
                    "header": "Compartment label",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "parentCompartmentId",
                    "header": "Parent",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Empty for a root. Declared by the caller; Cortexel does not reconstruct the tree."
                },
                {
                    "key": "pathDistance",
                    "header": "Path distance",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "As declared. Empty is empty — it is never 0, because 0 is the soma."
                },
                {
                    "key": "pathDistanceUnit",
                    "header": "Distance unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "recorded",
                    "header": "Recorded",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "`no` means the compartment was declared but never recorded. That is not the same fact as a missing sample."
                },
                {
                    "key": "signalId",
                    "header": "Signal",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": True
                },
                {
                    "key": "time",
                    "header": "Time",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": True
                },
                {
                    "key": "timeUnit",
                    "header": "Time unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "value",
                    "header": "Value",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The sample as supplied. Empty means missing; it is never drawn or tabulated as zero."
                },
                {
                    "key": "unit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "missing",
                    "header": "Missing",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "true when this observation was null in the source. Distinct from `recorded: no`, which means the compartment has no series at all."
                },
                {
                    "key": "sourceOrdinal",
                    "header": "Source row",
                    "cellType": "finite_number_or_string",
                    "nullable": True,
                    "keyPart": True,
                    "description": "The sample's index in the caller's original array, before the within-series stable sort."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.compartment_trace.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "data"
                        },
                        {
                            "tag": "field",
                            "name": "cellLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "cellId",
                    "rowIndex",
                    "compartmentId",
                    "compartmentLabel",
                    "parentCompartmentId",
                    "pathDistance",
                    "pathDistanceUnit",
                    "recorded",
                    "signalId",
                    "time",
                    "timeUnit",
                    "value",
                    "unit",
                    "missing",
                    "sourceOrdinal"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "samples",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "series_paths",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "heatmap_cells",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "aggregate",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "uncertainty",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority cell A",
                        "rightValue": "Authority cell B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "cellLabel",
                    "signalLabel",
                    "quantityKind",
                    "unit",
                    "compartmentCount",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "layoutMode",
                    "scaleStatement",
                    "compartmentOrderBasis",
                    "recordedCompartmentCount",
                    "notRecordedCount",
                    "sampleCount",
                    "missingSampleCount",
                    "valueMin",
                    "valueMax",
                    "duplicateTimeStatement",
                    "aggregateStatement",
                    "uncertaintyStatement",
                    "universeStatement",
                    "compactionStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "nest cm_default multicompartment recorder",
                "version": "3.10.0",
                "status": "not_run",
                "notes": "The derivation is near-identity, so the oracle's job is not to check arithmetic: it is to pin the RECORDER-to-CONTRACT mapping. NEST records compartment state under positional keys (v_comp0, v_comp1, ...) whose index is the compartment's position in the model's compartment list; the oracle fixture exists to prove that the adapter binds each key to a declared compartment id rather than to a row position. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-multimeter-cm-default",
                "sources": [
                    {
                        "system": "nest.multimeter.cm_default",
                        "role": "primary",
                        "notes": "NEST exposes compartment state under positional keys (v_comp0, v_comp1, ...). The adapter REQUIRES an explicit key-to-compartmentId mapping and fails with ADAPTER_MAPPING_REQUIRED rather than assuming index order: a model assembled in a different order would otherwise attach the tuft's trace to the soma's row and no validator could see it. Accessor-bearing input is rejected before any getter runs.",
                        "sourceId": "nest-multimeter-cm-default"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected node universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. A bare multimeter event dictionary cannot authenticate these facts, and Cortexel defines no normative receipt yet.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    },
                    {
                        "system": "host-retained NEST compartment/model semantics",
                        "role": "required_companion",
                        "notes": "Candidate exact binding from every positional recordable key to one compartment identity, model morphology, quantity and unit in the producing runtime/build. Neither key order nor a `cm_default` model name authenticates morphology or scientific meaning; no normative mapping receipt exists yet.",
                        "sourceId": "host-nest-compartment-model-semantics"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neuron-vector",
                "sources": [
                    {
                        "system": "neuron.Vector",
                        "role": "primary",
                        "notes": "NEURON records at (section, seg.x), where seg.x is a normalized position within a section rather than a global compartment identity. The caller must supply the (section, position) to compartment-id mapping; it is not derivable from the recorded arrays.",
                        "sourceId": "neuron-vector"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-analogsignal",
                "sources": [
                    {
                        "system": "neo.AnalogSignal",
                        "role": "primary",
                        "notes": "Neo has no compartment concept. The caller must map each channel to a compartment id explicitly; a channel index is not a compartment id.",
                        "sourceId": "neo-analogsignal"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-icephys",
                "sources": [
                    {
                        "system": "nwb.icephys",
                        "role": "primary",
                        "notes": "An NWB intracellular series describes an ELECTRODE, not a compartment of a model tree. A single-electrode recording is `neuro.analog_trace`. Presenting it here would imply a compartmental model that does not exist.",
                        "sourceId": "nwb-icephys"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            }
        ],
        "legacyIds": [
            "nest.compartmental_dynamics"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Registry gap: `topology.node_universe_declared` requires a COMPLETE node universe, so it is NOT declared here — this figure is designed to disclose an incomplete compartment universe (a recorded subset), which that validator would reject. The universe is still structurally required.",
            "Registry gap: `topology.edge_endpoints_in_universe` and `spatial.position_coverage_complete` read a `connections`/`positions` snapshot that a single cell does not carry, so parent-link membership and path-distance completeness are declared-and-disclosed claims rather than machine-checked ones. A single-cell tree/coverage validator is a MINOR addition.",
            "Registry gap: `events.within_window` reads one `eventTimes` array; a multi-series trace has per-series sample times, so an out-of-window trace sample has no dedicated validator. Sample times are still checked for duplicates by `trace.duplicate_time_policy`.",
            "Registry gap: `series.equal_length` and `ids.unique` define no index-wildcard pointer, so a series' own time-to-values length equality and per-series compartment-id uniqueness are enforced structurally rather than cross-checked; the parallel compartment-axis arrays and the aggregate selection are cross-checked.",
            "A unit-bearing uncertainty band is read by `unit.dimension_match` as a quantity whose 'kind' is a dispersion name, so per-series bands are not modelled in v1: uncertainty is declared once via `parameters.uncertainty`. Per-compartment bands are a MINOR addition once the dimension walker excludes uncertainty variants.",
            "A compartment value is a model state over a lumped segment. Cortexel cannot detect an under-discretized model, and refining the discretization changes the values it draws.",
            "The heatmap colour domain is derived from the accepted data, so two heatmaps are not comparable by colour. Compare exact values through the table. A heatmap over the mark budget is REFUSED (RESOURCE_COMPACTION_UNAVAILABLE), not time-averaged."
        ]
    },
    "neuro.correlogram": {
        "id": "neuro.correlogram",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Oriented lag correlogram between two event trains",
        "canonicalQuestion": "How many ordered (reference, target) event pairs fall at each lag, or what normalized lag statistic follows from those pairs, under a fixed lag orientation, an explicit zero-lag bin, a declared self-pair treatment, and a denominator that is stated rather than assumed?",
        "cannotEstablish": [
            "That either train drives the other. A peak at +2 ms is equally consistent with a monosynaptic connection, a common input arriving with different conduction delays, and a shared oscillation. A correlogram cannot separate them.",
            "That a peak is larger than chance. This figure draws no significance band and computes no surrogate, jitter, or shift predictor. The expected count under independence depends on both firing rates and on any nonstationarity, none of which it estimates.",
            "Anything directional from the symmetry or asymmetry of an autocorrelogram. With edgeCorrection none, forming both ordered pairs of every distinct event pair makes opposite-lag counts symmetric except at the published half-open bin edges. With eligible_reference_events, the bin-specific complete-exposure subset can differ at opposite window boundaries, so symmetry is not guaranteed. Either result is a property of the declared algorithm and finite window, not evidence about the neuron.",
            "Fine-timescale synchrony when the two firing rates co-vary slowly across the window. Slow co-modulation produces a broad central peak that is not spike synchrony, and pooling every pair in the window cannot tell the two apart.",
            "Single-neuron refractoriness or bursting from a pooled multi-unit train. A pooled autocorrelogram counts cross-neuron coincidences as pairs, so its central region is not a refractory trough.",
            "That no coupling exists because no peak is visible. The bin width sets the temporal resolution: coupling jittered on a finer scale than the bin is smeared away, and weak coupling can sit inside the sampling noise of the counts.",
            "How self-pairs were treated, from the height of the centre bin. The treatment is recorded from what the algorithm actually did; it is never inferred from a zero-valued or a tall centre bin.",
            "That the two trains were really observed over the declared window. Cortexel sees events, never recording extent. A window that overstates the recording inflates every eligible-reference denominator and depresses the rate.",
            "That a declared recordedSenderIds array is externally complete. Cortexel proves that every supplied event belongs to exactly one explicit role universe and that cross universes are disjoint; only a bound source export can establish that silent recorded senders were not omitted."
        ],
        "renderer": {
            "id": "figure.correlogram",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/window",
                    "unitDimension": "time"
                }
            },
            {
                "id": "correlogram.event_trains_valid"
            },
            {
                "id": "correlogram.roles_disjoint"
            },
            {
                "id": "correlogram.lag_range_valid"
            },
            {
                "id": "correlogram.prebinned_axis_consistent"
            },
            {
                "id": "correlogram.statistic_denominator"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "LAG_ORIENTATION",
            "ZERO_LAG_SELF_PAIRS_EXCLUDED",
            "PRE_BINNED_INPUT",
            "MISSING_VALUES_PRESENT",
            "UNCERTAINTY_NOT_PROVIDED",
            "UNIT_CONVERTED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 500000,
            "maxVisibleMarks": 20001,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Correlogram ({correlationKind}): target {targetLabel} relative to reference {referenceLabel}. Positive lag means target follows reference. Declared senders, including silent: {referenceRecordedSenderCount} reference, {targetRecordedSenderCount} target. {binCount} left-closed/right-open bins of {binWidth} {lagUnit}, centred from {lagMin} to {lagMax}; positive outer edge excluded. {statistic} ({valueUnit}); denominator {denominatorStatement}. Events: {referenceEventCount} reference, {targetEventCount} target, over {observationDuration} {timeUnit}; {sourceAuthorityStatement}. Pair accounting: {candidatePairCount} candidate = {countedPairCount} counted numerator + {notCountedPairCount} other not counted + {sameEventSelfPairCountExcluded} same-event self-pairs excluded. {notCountedPairBreakdown} {undefinedRateBinCount} rate bins are null because their eligible-reference count is zero. {uncertaintyStatement}",
            "tableColumns": [
                {
                    "key": "lagBinStart",
                    "header": "Lag bin start",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Inclusive lower edge: centre minus half a bin width."
                },
                {
                    "key": "lagBinCenter",
                    "header": "Lag centre",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The lag this bin is centred on. Positive means the target follows the reference."
                },
                {
                    "key": "lagBinEnd",
                    "header": "Lag bin end",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exclusive upper edge for every bin, including the positive outer edge."
                },
                {
                    "key": "pairCount",
                    "header": "Pairs",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact integer counted numerator for this bin. For raw_pair_count it contains every non-self pair whose exact lag falls in the bin. For target_rate_per_reference_event with eligible_reference_events it contains only pairs whose reference ordinal belongs to the identical eligible subset used by the denominator."
                },
                {
                    "key": "eligibleReferenceEvents",
                    "header": "Eligible reference events",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Reference events whose entire lag-shifted bin lies inside the observation window and whose pairs are therefore eligible for this numerator. Null for raw_pair_count, which has no denominator; for target_rate_per_reference_event it equals the reference event count when edge correction is none."
                },
                {
                    "key": "denominator",
                    "header": "Denominator",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Reference-event exposure in seconds: eligibleReferenceEvents multiplied by the typed bin width converted to seconds. It is 0 when the rate is undefined for zero exposure, and null for raw_pair_count, which has no denominator."
                },
                {
                    "key": "value",
                    "header": "Value",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Re-derived from the exact pair count and branch denominator. Raw counts are always defined. A target-rate bin with zero eligible reference events is null, never fabricated as zero or NaN; valueStatus states that reason."
                },
                {
                    "key": "valueUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "valueStatus",
                    "header": "Value status",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exactly `defined` or `undefined_zero_eligible_reference_events`. The latter requires value null, denominator zero, eligibleReferenceEvents zero, and pairCount zero."
                },
                {
                    "key": "uncertaintyLower",
                    "header": "Uncertainty lower",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "uncertaintyUpper",
                    "header": "Uncertainty upper",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.correlogram.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "data"
                        },
                        {
                            "tag": "field",
                            "name": "train"
                        },
                        {
                            "tag": "field",
                            "name": "label"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "lagBinStart",
                    "lagBinCenter",
                    "lagBinEnd",
                    "pairCount",
                    "eligibleReferenceEvents",
                    "denominator",
                    "value",
                    "valueUnit",
                    "valueStatus",
                    "uncertaintyLower",
                    "uncertaintyUpper"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "bins",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "uncertainty",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority train A",
                        "rightValue": "Authority train B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "correlationKind",
                    "targetLabel",
                    "referenceLabel",
                    "referenceRecordedSenderCount",
                    "targetRecordedSenderCount",
                    "binCount",
                    "binWidth",
                    "lagUnit",
                    "lagMin",
                    "lagMax",
                    "statistic",
                    "valueUnit",
                    "denominatorStatement",
                    "referenceEventCount",
                    "targetEventCount",
                    "observationDuration",
                    "timeUnit",
                    "sourceAuthorityStatement",
                    "candidatePairCount",
                    "countedPairCount",
                    "notCountedPairCount",
                    "sameEventSelfPairCountExcluded",
                    "notCountedPairBreakdown",
                    "undefinedRateBinCount",
                    "uncertaintyStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "elephant.spike_train_correlation.cross_correlation_histogram",
                "version": "1.2.1",
                "status": "not_run",
                "notes": "Elephant's CCH is the intended differential oracle, but it is only an oracle once the conventions are reconciled parameter for parameter: it correlates BinnedSpikeTrains rather than enumerating event pairs, its `window` is expressed in bins, its `border_correction` is the classical triangular correction that this contract deliberately does not offer, and `cross_correlation_coefficient=True` normalizes over the whole train rather than over the valid overlap. Until every one of those is matched bin for bin, agreement would be luck and disagreement would be uninformative. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-spike-recorder",
                "sources": [
                    {
                        "system": "nest.spike_recorder",
                        "role": "primary",
                        "notes": "Two selected trains plus their declared sender universes. The adapter must state which senders were pooled into each train; it may never infer a train's universe from the senders that happened to spike.",
                        "sourceId": "nest-spike-recorder"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, both recorder identities/statuses/backends, exact disjoint sender-pool universes, observation windows, biological export time, rank/world scope, and detached event-buffer digests. Event rows alone cannot authenticate pool identity or completeness.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nest-correlation-detector",
                "sources": [
                    {
                        "system": "nest.correlation_detector",
                        "role": "primary",
                        "notes": "Pinned NEST 3.10 documentation (https://nest-simulator.readthedocs.io/en/v3.10/models/correlation_detector.html) defines receptor_port 0 as source 1/reference, receptor_port 1 as source 2/target, lag as target minus reference, and all bins as left-closed/right-open, so the positive outer edge is excluded. The legacy adapter accepts only an explicit `measurement: count_histogram` and `zeroLagPolicy: included`; it emits raw_pair_count and never claims that same-event self-pairs were excluded. The weighted `histogram` is rejected because it is a Kahan sum of products of incoming connection weights and revision 4 has no weight-product quantity/unit or upstream per-event weight authority.",
                        "sourceId": "nest-correlation-detector"
                    },
                    {
                        "system": "host-retained NEST correlation configuration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, detector status, exact reference/target sender pools and receptor-port connections, simulation resolution/bounds, delta_tau and counting window, biological export time, rank/world scope, and histogram digest. Detector output alone cannot authenticate pool identity or caller-supplied kernel configuration.",
                        "sourceId": "host-nest-correlation-configuration"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-spiketrain",
                "sources": [
                    {
                        "system": "neo.SpikeTrain",
                        "role": "primary",
                        "notes": "t_start/t_stop map to the shared window and the unit is taken from the quantity, never guessed. Two SpikeTrains recorded over different intervals must be intersected by the caller first.",
                        "sourceId": "neo-spiketrain"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-units-spike-times",
                "sources": [
                    {
                        "system": "nwb.Units.spike_times",
                        "role": "primary",
                        "notes": "The caller must select the unit rows for each train explicitly and declare the recording interval; NWB does not state which units were pooled into an analysis.",
                        "sourceId": "nwb-units-spike-times"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "elephant-cross-correlation-histogram",
                "sources": [
                    {
                        "system": "elephant.cross_correlation_histogram",
                        "role": "primary",
                        "notes": "There is no adapter that imports an Elephant CCH as authoritative. Elephant output may enter only through an explicit pre-binned auto or cross product, with role containers, lag axis, orientation, self-pair treatment, exact pair counts and any required reference-event denominators declared; otherwise Elephant defaults would silently become Cortexel semantics.",
                        "sourceId": "elephant-cross-correlation-histogram"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.correlogram"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "The pairwise budget is the binding limit, not the observation limit: dense trains with more than 50,000,000 non-self pairs admitted to the requested numerator under the standard profile are refused before pair derivation. A larger Cartesian product may still pass when exact typed lower-bound preflight proves that its lag-range and edge-eligible subset is within budget.",
            "The unit registry has no code for a product of two simulator-defined incoming connection weights, and raw spike times do not retain those weights. weighted_pair_sum is therefore absent from the accepted statistic enum; supporting it later requires an explicit upstream weight authority, product quantity, unit semantics and verified summation rule.",
            "No disclosure id exists for a pooled multi-unit train. The pooled sender universe is stated in the summary and the table, but no mandatory footer line announces that an autocorrelogram is multi-unit; the registry gap is recorded rather than papered over with a caller note.",
            "No disclosure id exists for a pre-binned histogram whose source kept its self-pairs, so such input is refused outright instead of being drawn with a caveat that the registry cannot express.",
            "The figure refuses to compact. Merging adjacent lag bins would widen the bin width, which IS the scientific parameter of a correlogram: a 1 ms coincidence peak merged into 5 ms bins becomes a broad hump indistinguishable from slow rate co-modulation. Oversized lag axes are refused, not summarized.",
            "Pre-binned input cannot be re-binned or re-oriented. Cortexel checks the arithmetic that connects the counts to the values; it cannot check that the source binned or oriented them the way the request declares.",
            "A correlogram is a co-occurrence statistic. Connectivity, causality, and significance are outside it, and Cortexel adds no significance band that would suggest otherwise.",
            "Revision 4 accepts uncertainty kind none only. Dispersion or interval input needs a future branch whose units, missingness mask, table cells, summary, legend and geometry are all executable; accepting those arrays before that path exists would silently discard caller data.",
            "A pre-binned target rate retains declared exact pair counts, exact role event counts, and either the referenceEventCount under edgeCorrection none or parallel eligibleReferenceEventCounts. Zero denominators are admitted only with zero numerator and compile to an explicit null-with-reason value. Cortexel derives each defined rate and the aggregate candidate/count/not-counted/self-pair identity, but raw events are absent: it cannot verify that the source used the same eligible-reference subset for numerator and denominator, or split other not-counted pairs between lag-out-of-range and in-range edge-ineligible causes. The artifact states that split is unavailable instead of assigning the whole remainder to one cause.",
            "Raw auto and cross inputs are separate products. events_auto has one train in both roles; events_cross has explicit referenceTrain and targetTrain containers with disjoint complete sender universes. Event counts and duration are derived from those role-local arrays and the shared typed window, never supplied twice."
        ]
    },
    "neuro.isi_distribution": {
        "id": "neuro.isi_distribution",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Inter-spike interval distribution",
        "canonicalQuestion": "How are within-train inter-spike intervals distributed across an explicitly declared selection of senders and trials, using intervals formed only between successive spikes of the same train?",
        "cannotEstablish": [
            "The firing rate. The mean interval is not the reciprocal of the mean rate: 1/E[ISI] and E[1/ISI] differ whenever intervals vary, and the interval mean is dominated by long intervals while the rate is dominated by short ones.",
            "That the train is a renewal or Poisson process. A histogram discards the ORDER of the intervals, so a train with strong serial correlation and one without can produce the identical figure. A CV near 1 is consistent with Poisson; it is not evidence for it.",
            "That a pooled distribution describes any single neuron. Pooling intervals across senders that fire at different rates produces a mixture whose tail looks heavy even when every contributing neuron is perfectly regular.",
            "That the process is stationary. Time order is discarded, so a neuron that fires fast for the first half of the window and slowly for the second is indistinguishable from one that alternates throughout.",
            "Anything about intervals longer than the observation window. No interval longer than stop - start can be formed, and intervals near that length are systematically under-sampled, so the right tail is censored by the window, not by the neuron.",
            "That a peak in the shortest bins is bursting rather than duplicate events in the source recording. The histogram cannot separate them; only the declared zero-interval policy and the source can.",
            "Anything about senders that were not selected, or about trains with fewer than two in-window spikes. They contribute no interval, and their silence is not evidence of long intervals."
        ],
        "renderer": {
            "id": "figure.distribution",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/eventTimes/values",
                            "/data/eventSenderIds",
                            "/data/eventTrialIds"
                        ],
                        [
                            "/data/intervals/values",
                            "/data/intervalSenderIds",
                            "/data/intervalTrialIds"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/recordedSenderIds",
                        "/data/trialIds"
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/window",
                    "unitDimension": "time"
                }
            },
            {
                "id": "bins.strictly_increasing"
            },
            {
                "id": "events.within_window"
            },
            {
                "id": "events.sender_universe_declared"
            },
            {
                "id": "events.trial_universe_declared"
            },
            {
                "id": "isi.within_train_only"
            },
            {
                "id": "histogram.normalization_consistent"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "REFERENCE_COMPARISON_NOT_RUN",
            "EVENTS_EXCLUDED_OUT_OF_WINDOW",
            "UNCERTAINTY_NOT_PROVIDED",
            "MISSING_VALUES_PRESENT",
            "UNIT_CONVERTED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 2000000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Inter-spike interval distribution for {selectionLabel}. {intervalCount} intervals formed within {trainCount} trains ({senderCount} senders x {trialCount} trials) from {spikeCount} spikes in the exact half-open window {windowStart} to {windowStop} {timeUnit}. Intervals are formed only between successive spikes of the same train. {trainsWithoutIntervalCount} trains produced no interval. {excludedOutOfWindowCount} spikes fell outside the window. {binCount} bins span {binMin} to {binMax} {intervalUnit} on a {xScale} axis; {underRangeCount} intervals fell below and {overRangeCount} above that range. Normalization: {normalization}, values in {valueUnit}. No interval longer than {windowDuration} {timeUnit} can be observed. {zeroIntervalStatement} No sampling uncertainty was supplied or rendered.",
            "tableColumns": [
                {
                    "key": "binStart",
                    "header": "Bin start",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Inclusive lower edge, in the declared bin unit."
                },
                {
                    "key": "binEnd",
                    "header": "Bin end",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive."
                },
                {
                    "key": "binWidth",
                    "header": "Bin width",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The LINEAR width. It is the width used by the density denominator even when the axis is logarithmic."
                },
                {
                    "key": "binUnit",
                    "header": "Bin unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "count",
                    "header": "Intervals",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact integer count of intervals in this bin. This is the raw observation everything else is derived from; an empty bin is a measured zero, not missing data."
                },
                {
                    "key": "probability",
                    "header": "Probability",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "count / binned-interval total. Present only when normalization is probability."
                },
                {
                    "key": "density",
                    "header": "Density",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "count / (binned-interval total x linear bin width). Present only when normalization is density."
                },
                {
                    "key": "densityUnit",
                    "header": "Density unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The reciprocal of the bin unit, e.g. /ms for millisecond bins."
                },
                {
                    "key": "binnedIntervalCount",
                    "header": "Binned intervals",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The denominator. N_binned: the formed intervals that fell inside the bin range. Constant across rows. Without it, probability and density cannot be checked against count from the table alone."
                },
                {
                    "key": "formedIntervalCount",
                    "header": "Formed intervals",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Every interval formed within a train, including any the bin range excluded. It equals the denominator ONLY when no interval fell out of range; when it does not, the plotted probabilities describe a subset."
                },
                {
                    "key": "underRangeCount",
                    "header": "Below bin range",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Formed intervals below the first edge, excluded under outOfRangeIntervals: exclude_and_report. Never binned, never clipped into the first bin."
                },
                {
                    "key": "overRangeCount",
                    "header": "Above bin range",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Formed intervals above the last edge, excluded under outOfRangeIntervals: exclude_and_report. Never binned, never clipped into the final bin."
                },
                {
                    "key": "trainCount",
                    "header": "Trains",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Every train in the (selected senders x declared trials) universe, INCLUDING trains that produced no interval. An ISI histogram assembled from 3 of 200 trains is a figure about 3 neurons."
                },
                {
                    "key": "spikeCount",
                    "header": "In-window spikes",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The in-window spikes the intervals were formed from. A train with k in-window spikes yields exactly max(k - 1, 0) intervals — never k."
                },
                {
                    "key": "excludedOutOfWindowCount",
                    "header": "Spikes excluded (window)",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Spikes outside the declared window. They form no interval and are never clipped to the boundary; the right tail is censored by the window, not by the neuron."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.isi_distribution.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "selectionLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "binStart",
                    "binEnd",
                    "binWidth",
                    "binUnit",
                    "count",
                    "probability",
                    "density",
                    "densityUnit",
                    "binnedIntervalCount",
                    "formedIntervalCount",
                    "underRangeCount",
                    "overRangeCount",
                    "trainCount",
                    "spikeCount",
                    "excludedOutOfWindowCount"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "bins",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority ISI A",
                        "rightValue": "Authority ISI B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "selectionLabel",
                    "intervalCount",
                    "trainCount",
                    "senderCount",
                    "trialCount",
                    "spikeCount",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "trainsWithoutIntervalCount",
                    "excludedOutOfWindowCount",
                    "binCount",
                    "binMin",
                    "binMax",
                    "intervalUnit",
                    "xScale",
                    "underRangeCount",
                    "overRangeCount",
                    "normalization",
                    "valueUnit",
                    "windowDuration",
                    "zeroIntervalStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "elephant.statistics.isi",
                "version": "1.2.1",
                "status": "not_run",
                "notes": "Elephant's isi() takes successive differences within ONE Neo SpikeTrain, which is the same within-train rule this contract fixes; it returns n-1 intervals for n spikes. Before the comparison means anything, three conventions must be matched parameter for parameter: Elephant does not partition by sender (the caller must present one SpikeTrain per train), it applies no bin-range exclusion, and its t_start/t_stop must be aligned to this contract's half-open window so that boundary-straddling intervals are absent on both sides rather than only on ours. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-spike-recorder",
                "sources": [
                    {
                        "system": "nest.spike_recorder",
                        "role": "primary",
                        "notes": "The adapter must supply the SELECTED sender universe, which NEST knows and the event list does not, and must not assume the recorder's output is chronological or grouped by sender. Ordering is established within each train by Cortexel.",
                        "sourceId": "nest-spike-recorder"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected sender universe, origin/start/stop and biological export time, rank/world scope, and detached event-buffer digest. Event rows cannot authenticate silent senders or complete exposure.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-spiketrain",
                "sources": [
                    {
                        "system": "neo.SpikeTrain",
                        "role": "primary",
                        "notes": "One SpikeTrain is one train, which matches the within-train rule exactly. t_start/t_stop map to the window; the unit is taken from the quantity, never guessed. Segments of a Block map to trials, and the complete Segment list must be declared even for segments in which the unit was silent.",
                        "sourceId": "neo-spiketrain"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-units-spike-times",
                "sources": [
                    {
                        "system": "nwb.Units.spike_times",
                        "role": "primary",
                        "notes": "The caller must select the unit rows explicitly. NWB carries no trial partition unless the trials table is mapped, so the trial partitioning must be declared rather than inferred; without it the intervals would be formed across trial boundaries.",
                        "sourceId": "nwb-units-spike-times"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "ncp",
                "sources": [
                    {
                        "system": "ncp",
                        "role": "primary",
                        "notes": "Not yet certified. An adapter is never exempt from the core gate: its output is validated by this contract like any other request.",
                        "sourceId": "ncp"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.isi_distribution"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "The distribution is right-censored by the window. Intervals whose preceding or following spike lies outside it are never formed, so no interval longer than the window can appear and long ones are under-represented. Cortexel discloses the window; it cannot correct the censoring.",
            "The figure is a pooled mixture. Rate heterogeneity across senders inflates the apparent irregularity of the pooled distribution, so a CV or a heavy tail read off this figure is a property of the mixture, not of any neuron in it.",
            "Cortexel does not select bin edges. It records the choice and verifies the normalization; the choice remains the caller's, and it can change what the figure appears to show.",
            "A logarithmic COUNT axis is not offered. An empty bin is a measured zero and has no representable position on a log axis, and the disclosure registry has no rule covering its omission — so the figure declines rather than draw a bar that silently disappears.",
            "Request validation now executes value-level checks over supplied intervals, including sign, magnitude against the exact window, per-train counts, composite train uniqueness and complete sender-by-trial train coverage. The within-train stable sort makes SCIENCE_NEGATIVE_INTERVAL unreachable for well-formed numeric event input but supplied interval mode can still reach it.",
            "Registry gap: the error registry has no dedicated code for formed intervals falling outside the declared bin range. At derivation, SCIENCE_BIN_EDGES_INVALID is reused as the closest registered code; a future SCIENCE_BIN_RANGE_INCOMPLETE would be more precise. At request stage the same code is produced directly by non-increasing bin edges.",
            "Registry gap: the error registry has no dedicated code for an interval count that contradicts its train's spike count. At derivation, SEMANTIC_LENGTH_MISMATCH is reused, which is accurate about the count disagreement but does not name the science. At request stage the same code is produced directly by a sender-linkage array of the wrong length.",
            "Registry gap: the disclosure registry has no rule for `mode: intervals` (raw spike times not observed) or for intervals excluded by outOfRangeIntervals. PRE_BINNED_INPUT is deliberately NOT reused: its text would state something false. Those facts ride in the receipt, table, and summary instead.",
            "A declared sender or trial universe can still be false at the source. Revision 2 verifies complete Cartesian train coverage against the declared lists, but cannot authenticate that the lists describe every sender or trial actually recorded.",
            "The log-scale nonpositive-domain refusal (RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN) is a render-stage check and never a request-stage semantic error, so it has no request-stage invalid vector."
        ]
    },
    "neuro.multisignal_trace": {
        "id": "neuro.multisignal_trace",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Multiple biologically distinct signals on one declared clock",
        "canonicalQuestion": "How do several biologically distinct time-varying signals — each carrying its own entity, variable identity, quantity kind, and unit — evolve together on one declared clock, without any signal being relabelled, unit-coerced, or forced onto an axis whose dimension it does not share?",
        "cannotEstablish": [
            "That one signal caused another. Co-variation on a shared clock is co-variation: an IP3 rise preceding a calcium transient is consistent with IP3-gated release and does not demonstrate it.",
            "The relative magnitude of two signals in different panels. Panels carry independent units and independent y domains, so a taller curve is not a larger effect — the panel height is a layout choice.",
            "Any magnitude comparison under `normalized_overlay`. Each series is mapped separately to a dimensionless ratio, so two curves at the same height mean only that each sits equally far from ITS OWN reference statistic.",
            "A lead or lag finer than the sampling interval. Signals sampled every 1 ms cannot establish a 0.2 ms lead, and Cortexel does not resample or interpolate to pretend otherwise.",
            "That the signals really do share a clock. `same_clock` is a caller declaration; Cortexel checks that the times are internally consistent, never that two recorders were physically synchronized.",
            "That the drawn signals are the complete state of the system. A model has state variables that were not recorded, and their absence from this figure is not evidence that they were constant.",
            "That the trace between two samples followed the drawn path. A line segment renders adjacency between two measurements; it is not itself a measurement of the interval."
        ],
        "renderer": {
            "id": "figure.multisignal_trace",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/eventTimes/values",
                            "/data/series/0/values/values"
                        ],
                        [
                            "/data/series/0/time/values",
                            "/data/series/0/values/values"
                        ],
                        [
                            "/data/series/0/values/values",
                            "/data/series/0/uncertainty/values"
                        ],
                        [
                            "/data/series/0/values/values",
                            "/data/series/0/uncertainty/lower"
                        ],
                        [
                            "/data/series/0/values/values",
                            "/data/series/0/uncertainty/upper"
                        ],
                        [
                            "/data/series/0/values/values",
                            "/data/series/0/uncertainty/sampleCount"
                        ],
                        [
                            "/data/eventTimes/values",
                            "/data/series/1/values/values"
                        ],
                        [
                            "/data/series/1/time/values",
                            "/data/series/1/values/values"
                        ],
                        [
                            "/data/series/1/values/values",
                            "/data/series/1/uncertainty/values"
                        ],
                        [
                            "/data/series/1/values/values",
                            "/data/series/1/uncertainty/lower"
                        ],
                        [
                            "/data/series/1/values/values",
                            "/data/series/1/uncertainty/upper"
                        ],
                        [
                            "/data/series/1/values/values",
                            "/data/series/1/uncertainty/sampleCount"
                        ],
                        [
                            "/data/eventTimes/values",
                            "/data/series/2/values/values"
                        ],
                        [
                            "/data/series/2/time/values",
                            "/data/series/2/values/values"
                        ],
                        [
                            "/data/series/2/values/values",
                            "/data/series/2/uncertainty/values"
                        ],
                        [
                            "/data/series/2/values/values",
                            "/data/series/2/uncertainty/lower"
                        ],
                        [
                            "/data/series/2/values/values",
                            "/data/series/2/uncertainty/upper"
                        ],
                        [
                            "/data/series/2/values/values",
                            "/data/series/2/uncertainty/sampleCount"
                        ],
                        [
                            "/data/eventTimes/values",
                            "/data/series/3/values/values"
                        ],
                        [
                            "/data/series/3/time/values",
                            "/data/series/3/values/values"
                        ],
                        [
                            "/data/series/3/values/values",
                            "/data/series/3/uncertainty/values"
                        ],
                        [
                            "/data/series/3/values/values",
                            "/data/series/3/uncertainty/lower"
                        ],
                        [
                            "/data/series/3/values/values",
                            "/data/series/3/uncertainty/upper"
                        ],
                        [
                            "/data/series/3/values/values",
                            "/data/series/3/uncertainty/sampleCount"
                        ]
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/window",
                    "unitDimension": "time"
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/parameters/normalization/statisticsWindow",
                    "unitDimension": "time"
                }
            },
            {
                "id": "events.within_window"
            },
            {
                "id": "trace.duplicate_time_policy"
            },
            {
                "id": "trace.axis_dimension_compatible"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "MISSING_VALUES_PRESENT",
            "DUPLICATE_TIMES_AGGREGATED",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "UNCERTAINTY_COVERAGE_INCOMPLETE",
            "MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 2000000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none",
            "standard_deviation",
            "standard_error",
            "confidence_interval",
            "quantile_interval",
            "ensemble_range"
        ],
        "accessibility": {
            "summaryTemplate": "Multi-signal trace: {seriesCount} signals in {panelCount} panels over {windowStart} to {windowStop} {timeUnit}, window {windowBoundary}. Layout: {layout}. Time alignment: {timeAlignment}. Panels: {panelSummary}. Panels carry independent units and y domains, so heights are not comparable across panels. Signals: {seriesSummary}. {observationKindStatement} {originStatement} {sampleCount} samples, {missingCount} missing; a missing sample breaks the line and is never interpolated across or drawn as zero. Duplicate-time policy: {duplicateTimePolicy}. {normalizationStatement} {uncertaintyStatement} {unitConversionStatement} {compactionStatement}",
            "tableColumns": [
                {
                    "key": "seriesId",
                    "header": "Series",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True
                },
                {
                    "key": "seriesLabel",
                    "header": "Label",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "entityId",
                    "header": "Entity",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The entity the signal was recorded from."
                },
                {
                    "key": "entityKind",
                    "header": "Entity kind",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "compartmentId",
                    "header": "Compartment",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "pathwayId",
                    "header": "Pathway",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The declared signalling pathway or projection. Recorded verbatim; never inferred from a variable name."
                },
                {
                    "key": "variableId",
                    "header": "Variable",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The source model's own name for the variable. A quantity kind alone cannot distinguish calcium from IP3: both are concentrations."
                },
                {
                    "key": "panelId",
                    "header": "Panel",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True
                },
                {
                    "key": "observationKind",
                    "header": "Observation kind",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "point_sample (joined by a straight segment) or piecewise_constant (held to the next sample and drawn as a step)."
                },
                {
                    "key": "origin",
                    "header": "Origin",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "recorded or derived. A derived series is never presented as a recorded one."
                },
                {
                    "key": "originMethod",
                    "header": "Derivation method",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The caller-declared algorithm behind a derived series. Cortexel records and displays it; it never re-derives or verifies it."
                },
                {
                    "key": "recordedTime",
                    "header": "Recorded time",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "AS SUPPLIED, before any declared offset. The raw time the source reported."
                },
                {
                    "key": "recordedTimeUnit",
                    "header": "Recorded time unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The source clock unit AS SUPPLIED. It may differ from the display-clock unit."
                },
                {
                    "key": "timeOffset",
                    "header": "Declared offset",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The offset added to the recorded time to place this series on the display clock. Zero under `same_clock`, where no offset may be declared at all."
                },
                {
                    "key": "timeOffsetUnit",
                    "header": "Declared offset unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The offset unit AS SUPPLIED. The derivation receipt records its one-step conversion into the display-clock unit."
                },
                {
                    "key": "time",
                    "header": "Time",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "On the display clock, after any declared offset. recordedTime + timeOffset."
                },
                {
                    "key": "timeUnit",
                    "header": "Time unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "value",
                    "header": "Value",
                    "cellType": "finite_number_or_string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "AS SUPPLIED, before any panel unit conversion or overlay normalization. A duplicate-time aggregate carries the contributing raw values as a canonical JSON array; otherwise this is the scalar source observation."
                },
                {
                    "key": "unit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The unit as supplied."
                },
                {
                    "key": "displayValue",
                    "header": "Drawn value",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The value as drawn: converted into the panel unit, or mapped to a dimensionless ratio under normalized_overlay."
                },
                {
                    "key": "displayUnit",
                    "header": "Drawn unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "missing",
                    "header": "Missing",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "true when the observation is absent. It is never drawn as zero and never interpolated across."
                },
                {
                    "key": "replicateCount",
                    "header": "Replicates",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "How many supplied samples produced this table row. Kept replicates remain separate rows with 1 each; an aggregate row states how many replicates it combines."
                },
                {
                    "key": "uncertaintyKind",
                    "header": "Uncertainty kind",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "uncertaintyLower",
                    "header": "Uncertainty lower",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "uncertaintyUpper",
                    "header": "Uncertainty upper",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "uncertaintyMethod",
                    "header": "Uncertainty declaration",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The exact row-level declaration: basis and sample count for dispersions/ranges; method, level and coverage for confidence intervals; method and both quantiles for quantile intervals. An interval with no method is never drawn as one."
                },
                {
                    "key": "normalizationParameters",
                    "header": "Normalization parameters",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Null outside normalized_overlay. Otherwise the exact per-series statistics window, sample count, and constants used for the affine map, serialized deterministically so every displayed value can be re-derived from the raw value."
                },
                {
                    "key": "sourceRowIndex",
                    "header": "Source row",
                    "cellType": "finite_number_or_string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "The original ordinal in the caller's array, retained through stable sorting. A duplicate-time aggregate carries the contributing ordinals as a canonical JSON array."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.multisignal_trace.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "showSamplePoints"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "seriesId",
                    "seriesLabel",
                    "entityId",
                    "entityKind",
                    "compartmentId",
                    "pathwayId",
                    "variableId",
                    "panelId",
                    "observationKind",
                    "origin",
                    "originMethod",
                    "recordedTime",
                    "recordedTimeUnit",
                    "timeOffset",
                    "timeOffsetUnit",
                    "time",
                    "timeUnit",
                    "value",
                    "unit",
                    "displayValue",
                    "displayUnit",
                    "missing",
                    "replicateCount",
                    "uncertaintyKind",
                    "uncertaintyLower",
                    "uncertaintyUpper",
                    "uncertaintyMethod",
                    "normalizationParameters",
                    "sourceRowIndex"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "samples",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "series_paths",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "uncertainty",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": False,
                        "rightValue": True,
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "geometry.sequence"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "seriesCount",
                    "panelCount",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "windowBoundary",
                    "layout",
                    "timeAlignment",
                    "panelSummary",
                    "seriesSummary",
                    "observationKindStatement",
                    "originStatement",
                    "sampleCount",
                    "missingCount",
                    "duplicateTimePolicy",
                    "normalizationStatement",
                    "uncertaintyStatement",
                    "unitConversionStatement",
                    "compactionStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "neo.AnalogSignal.rescale + scipy.stats.zscore",
                "version": "neo 0.13.1 / scipy 1.14.1",
                "status": "not_run",
                "notes": "Neo is the intended differential oracle for unit rescaling and SciPy for the z-score. The conventions must be matched parameter for parameter before the comparison means anything: scipy.stats.zscore defaults to ddof = 0 while this contract specifies the sample standard deviation (ddof = 1), and the two disagree by a factor sqrt(N/(N-1)) — 5.4% at N = 10. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-multimeter",
                "sources": [
                    {
                        "system": "nest.multimeter",
                        "role": "primary",
                        "notes": "One node, several recorded variables, one clock. Each recorded variable becomes a series carrying its REAL quantity kind and unit; the adapter must supply them and never defaults an unlabelled channel to membrane voltage.",
                        "sourceId": "nest-multimeter"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected node universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. A bare multimeter event dictionary cannot authenticate these facts.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    },
                    {
                        "system": "host-retained NEST recordable semantics",
                        "role": "required_companion",
                        "notes": "Candidate binding from every recorded key to the exact node-model recordable, scientific quantity, unit and producing model/runtime. Similar channel names and shared sample coordinates are not evidence that different quantities have the declared meanings.",
                        "sourceId": "host-nest-recordable-semantics"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nest-astrocyte-ip3-ca",
                "sources": [
                    {
                        "system": "nest.multimeter",
                        "role": "primary",
                        "notes": "Supplies the actual astrocyte time histories, including `IP3` and `Ca_astro`, from a recorder connected to the selected astrocyte_lr_1994 nodes. A model instance or model name is not a recording and can never be promoted to this primary source.",
                        "sourceId": "nest-astrocyte-multimeter"
                    },
                    {
                        "system": "nest.astrocyte_lr_1994",
                        "role": "required_companion",
                        "notes": "Candidate exact astrocyte model/recordable semantics, not time histories. Under the reviewed NEST 3.10 source, IP3 and Ca_astro are concentrations in umol/L. This profile says nothing about a neuron model's recordables and never infers units from a similarly spelled custom channel.",
                        "sourceId": "nest-astrocyte-model-semantics"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, astrocyte recorder id/status/backend, exact selected astrocyte universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. The model name does not authenticate the recorded rows.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nest-astrocyte-tripartite",
                "sources": [
                    {
                        "system": "nest.multimeter",
                        "role": "primary",
                        "notes": "Candidate astrocyte time-history source for IP3 and Ca_astro. A model instance or name is not a recording. This mapping is separate from the IP3/Ca-only profile because adding neuronal V_m or I_SIC introduces a second recorder, model namespace and quantity authority.",
                        "sourceId": "nest-tripartite-astrocyte-multimeter"
                    },
                    {
                        "system": "nest.multimeter",
                        "role": "required_companion",
                        "notes": "Required neuronal time-history source whenever the figure includes neuronal V_m, I_SIC or another neuron recordable. Its selected nodes, interval, origin and sample coordinates must bind to the astrocyte recorder under one explicit shared-clock policy; no interpolation or same-clock inference is permitted.",
                        "sourceId": "nest-tripartite-neuron-multimeter"
                    },
                    {
                        "system": "nest.astrocyte_lr_1994",
                        "role": "required_companion",
                        "notes": "Candidate exact astrocyte model/recordable semantics for IP3 and Ca_astro, including producing runtime/build and units. Similar spelling in a custom model is not evidence of the same quantity.",
                        "sourceId": "nest-tripartite-astrocyte-model-semantics"
                    },
                    {
                        "system": "host-retained NEST neuron model semantics",
                        "role": "required_companion",
                        "notes": "Candidate exact neuron-model recordable semantics and runtime/configuration binding for every neuronal series. Astrocyte model metadata cannot establish that V_m is membrane voltage or I_SIC is current for a different neuron model.",
                        "sourceId": "host-nest-tripartite-neuron-model-semantics"
                    },
                    {
                        "system": "host-retained NEST shared-recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for one producing runtime/build and run, both recorder identities/statuses/backends, selected astrocyte and neuron universes, exact origin/start/stop/interval values, shared-clock policy, biological export time, rank/world scope, and both detached event-buffer digests. Equal-looking time arrays do not prove shared clock authority.",
                        "sourceId": "host-nest-shared-recorder-export-declaration"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-analogsignal",
                "sources": [
                    {
                        "system": "neo.AnalogSignal",
                        "role": "primary",
                        "notes": "One AnalogSignal per series. t_start and sampling_period give the shared time base; the unit is taken from the quantity and never guessed.",
                        "sourceId": "neo-analogsignal"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-irregularlysampledsignal",
                "sources": [
                    {
                        "system": "neo.IrregularlySampledSignal",
                        "role": "primary",
                        "notes": "Maps to the per-series time base. The times are used exactly as supplied; Cortexel does not resample onto a common grid.",
                        "sourceId": "neo-irregularlysampledsignal"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-timeseries",
                "sources": [
                    {
                        "system": "nwb.TimeSeries",
                        "role": "primary",
                        "notes": "The caller must select the series and declare each one's quantity kind. An NWB unit string is not a Cortexel unit code and is not accepted as one.",
                        "sourceId": "nwb-timeseries"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.astrocyte_dynamics"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Panel membership still has no request-stage semantic validator. The render boundary independently refuses undeclared membership, empty panels and duplicate panel or series identities before it builds geometry, so no series can be silently dropped or duplicated; a future `trace.panel_membership_declared` validator should move the same refusal earlier.",
            "`ids.unique` reads one flat identifier array, but this figure's series ids and panel ids live inside arrays of objects (data.series[].seriesId, parameters.panels[].panelId). The request-stage validator cannot express those paths; the render boundary independently refuses duplicate ids before legend, table or geometry construction.",
            "`series.equal_length` resolves concrete JSON Pointers, not index wildcards, so request-stage groups are enumerated per series index (0..3). The render boundary checks every later series and every uncertainty array before transformation; a future wildcard validator should move the same refusal earlier.",
            "`uncertainty.valid` and `uncertainty.supported_variant` read a single top-level parameters/data uncertainty, while this figure carries uncertainty per series. The render boundary independently validates every series' variant, basis, levels, bounds, lengths, registered unit and dimensional compatibility, and transforms supported bounds through the same conversion/normalization map. A per-series semantic validator would move those checks before rendering.",
            "A non-positive `divide_by_baseline_mean` denominator has no request-stage semantic validator. The render derivation computes the declared statistics window and refuses a non-finite or non-positive denominator with SCIENCE_NORMALIZATION_UNVERIFIABLE before geometry is emitted; a normalization validator should move that refusal earlier and own SCIENCE_DENOMINATOR_INVALID.",
            "Log/symlog domain checks and the empty-panel RENDER_NO_DATA check belong to the render stage rather than request validation. The renderer applies the contract-owned transforms and refuses a non-positive log domain before geometry is emitted.",
            "Cortexel can verify that a unit's dimension matches its declared kind. It cannot verify that a channel was what the caller says it was, or that a `derived` series was produced by the method it names.",
            "Cortexel cannot verify that two recorders shared a clock. `same_clock` is a caller declaration; all Cortexel can do is refuse to draw signals on one time axis unless the caller states which clock they are on.",
            "Series may be sampled at different intervals. Cortexel never resamples onto a common grid, so a vertical alignment must not be read finer than the coarser series' sampling interval.",
            "The registered `line_envelope_minmax` policy is not advertised or executed by revision 2. Every accepted series is drawn in full; a request above the visible-mark or complete-returned-table budget is refused. A future independent per-series envelope would also need to state that its drawn marks are no longer paired and bind the complete exact table before it could be enabled.",
            "Two signals of the same dimension but different species (calcium and IP3 are both concentrations) may legally share an axis. Cortexel cannot know they are different molecules, which is why every series must declare a variableId, so the legend and the table can."
        ]
    },
    "neuro.phase_plane": {
        "id": "neuro.phase_plane",
        "revision": 5,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Phase plane: trajectories and vector field in a two-dimensional state space",
        "canonicalQuestion": "In a state space spanned by two declared state variables, where did the system's trajectory go, and what does a caller-computed vector field say about the flow at the points where it was actually evaluated?",
        "cannotEstablish": [
            "How fast the system moved. The drawn curve is a path, not a speed: a long arc traversed in 1 ms and a short arc traversed in 100 ms look identical. Only the time column distinguishes them.",
            "The stability or type of a fixed point (saddle, node, focus, center). That requires the Jacobian's eigenvalues, which Cortexel neither computes nor accepts in 1.0. A marker is a declared location with a residual, not a proof of stability.",
            "That a nullcline is correct. Cortexel does not solve dx/dt = 0 or dy/dt = 0; it renders the curve the caller computed, labelled with the caller's method and residual tolerance.",
            "Anything about the field between its samples. The field is never interpolated and streamlines are never drawn. A coarse lattice can step straight over a fixed point and show no sign of it.",
            "That the arrows' lengths or angles are physical. Both depend on the axis scaling and on the declared display normalization. Rescale the x axis from mV to V and every drawn arrow rotates.",
            "That the caller's declared derivative unit is the unit its numbers were computed in. `/s` and `/ms` share a dimension, so mislabelling one as the other scales every derivative by 1000 and is undetectable from the values alone.",
            "That the system is two-dimensional. A 2D projection of a higher-dimensional model (4D Hodgkin-Huxley, for example) can show trajectories that appear to cross; trajectories of a genuine autonomous 2D system cannot.",
            "That two curves which appear to touch actually intersect. In a projection they need not, and a drawn break at an integrate-and-fire reset is a discontinuity, not a crossing.",
            "That the vector field and the trajectories came from the same model, the same parameters, or the same run. Cortexel checks that they share axes and units; it cannot check that the caller evaluated the equations that produced the trajectory.",
            "That a rate change, an excursion, or a return to rest was caused by any particular current, input, or mechanism.",
            "Anything outside the declared field domain and the supplied trajectory extent. The absence of drawn structure there is an absence of evaluation, not an absence of dynamics."
        ],
        "renderer": {
            "id": "figure.phase_plane",
            "revision": 6
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "phase_plane.derivative_dimension"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/trajectories/pointTrajectoryIds",
                            "/data/trajectories/times/values",
                            "/data/trajectories/x/values",
                            "/data/trajectories/y/values",
                            "/data/trajectories/dxdt/values",
                            "/data/trajectories/dydt/values"
                        ],
                        [
                            "/data/trajectories/universe/ids",
                            "/data/trajectories/universe/labels"
                        ],
                        [
                            "/data/vectorField/x/values",
                            "/data/vectorField/y/values",
                            "/data/vectorField/dx/values",
                            "/data/vectorField/dy/values"
                        ],
                        [
                            "/data/nullclines/curveIds",
                            "/data/nullclines/labels",
                            "/data/nullclines/zeroDerivativeOf",
                            "/data/nullclines/methods"
                        ],
                        [
                            "/data/nullclines/pointCurveIds",
                            "/data/nullclines/x/values",
                            "/data/nullclines/y/values"
                        ],
                        [
                            "/data/fixedPoints/ids",
                            "/data/fixedPoints/labels",
                            "/data/fixedPoints/x/values",
                            "/data/fixedPoints/y/values",
                            "/data/fixedPoints/methods",
                            "/data/fixedPoints/converged",
                            "/data/fixedPoints/residualDxDt/values",
                            "/data/fixedPoints/residualDyDt/values",
                            "/data/fixedPoints/toleranceDxDt/values",
                            "/data/fixedPoints/toleranceDyDt/values"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/trajectories/universe/ids",
                        "/data/nullclines/curveIds",
                        "/data/fixedPoints/ids"
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/vectorField/domain/x"
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/vectorField/domain/y"
                }
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "MISSING_VALUES_PRESENT",
            "UNIT_CONVERTED",
            "UNCERTAINTY_NOT_PROVIDED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 250000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Phase plane: {yLabel} ({yUnit}) against {xLabel} ({xUnit}). {trajectoryStatement} {directionMarkerStatement} {vectorFieldStatement} {annotationStatement} {missingStatement} {uncertaintyStatement} Exact supplied values and any supplied trajectory times are in the table.",
            "tableColumns": [
                {
                    "key": "rowKind",
                    "header": "Row",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "trajectory_point, field_sample, nullcline_point, or fixed_point. The four are never merged into one anonymous list of coordinates."
                },
                {
                    "key": "elementId",
                    "header": "Element",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": True,
                    "description": "Trajectory id, nullcline curve id, or fixed-point id."
                },
                {
                    "key": "sourceOrdinal",
                    "header": "Source ordinal",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": True,
                    "description": "Zero-based index within the owning trajectory-point, vector-field, nullcline-point, or fixed-point parallel-array carrier. Null only for a declared trajectory-universe member with no recorded point. It preserves duplicate field samples without inventing an external identity."
                },
                {
                    "key": "time",
                    "header": "Time",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Trajectory points only, in the declared time unit. This is the only column that distinguishes a fast excursion from a slow one."
                },
                {
                    "key": "x",
                    "header": "x",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The x state coordinate, in the x axis unit. Empty means MISSING, which breaks the path; it never means zero."
                },
                {
                    "key": "y",
                    "header": "y",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The y state coordinate, in the y axis unit."
                },
                {
                    "key": "dxdt",
                    "header": "dx/dt",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Caller-supplied. Cortexel never differentiates a trajectory numerically."
                },
                {
                    "key": "dydt",
                    "header": "dy/dt",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "derivativeUnit",
                    "header": "Derivative unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "A reciprocal-time code. The FULL unit is the axis unit per this code: `/ms` on an axis in mV means mV per ms, not ms to the minus one."
                },
                {
                    "key": "speed",
                    "header": "Speed",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The magnitude on the declared basis. Axis-normalized speed is a display quantity that depends on the drawn extent; a physical magnitude is present only when both axes share a dimension."
                },
                {
                    "key": "method",
                    "header": "Method",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The named method for a nullcline or fixed point. Blank for measured points."
                },
                {
                    "key": "residual",
                    "header": "Residual",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "|dx/dt| and |dy/dt| at a fixed point, or the residual tolerance bounding the derivative along a nullcline."
                },
                {
                    "key": "converged",
                    "header": "Converged",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Re-derived by Cortexel from the residual and the tolerance, not copied from the caller's flag. `no` marks an unconverged candidate, not an equilibrium."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.phase_plane.output_authority.v5"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "data"
                        },
                        {
                            "tag": "field",
                            "name": "axes"
                        },
                        {
                            "tag": "field",
                            "name": "x"
                        },
                        {
                            "tag": "field",
                            "name": "label"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "rowKind",
                    "elementId",
                    "sourceOrdinal",
                    "time",
                    "x",
                    "y",
                    "dxdt",
                    "dydt",
                    "derivativeUnit",
                    "speed",
                    "method",
                    "residual",
                    "converged"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "field_vectors",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "trajectories",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "nullclines",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "fixed_points",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority x A",
                        "rightValue": "Authority x B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "yLabel",
                    "yUnit",
                    "xLabel",
                    "xUnit",
                    "trajectoryStatement",
                    "directionMarkerStatement",
                    "vectorFieldStatement",
                    "annotationStatement",
                    "missingStatement",
                    "uncertaintyStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "numpy/scipy FitzHugh-Nagumo reference field and nullcline",
                "version": "numpy 2.1.3 / scipy 1.14.1",
                "status": "not_run",
                "notes": "The intended differential check recomputes the FitzHugh-Nagumo field samples, the analytic V-nullcline, and the Newton fixed point from the published equations, and compares them with the figure's table. It checks the FIXTURE, not Cortexel's derivation: Cortexel integrates nothing and solves nothing, so the hand vectors remain the primary evidence for the parts that are actually Cortexel's - the derivative unit composition (1 mV/ms = 1 V/s exactly, via 1e-3 x 1e3), the axis-normalized speed, the convergence re-derivation from residual and tolerance, and the arrowhead orientation under backward time. The pinned reference environment has not been executed here, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-multimeter",
                "sources": [
                    {
                        "system": "nest.multimeter",
                        "role": "primary",
                        "notes": "Two recorded state variables plus times and senders. The adapter maps each recorded variable to an axis with its declared unit and uses the sender as the trajectory id. Recorder order is never assumed: rows are grouped per sender and each sender's own time order is preserved, never sorted globally.",
                        "sourceId": "nest-multimeter"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected node universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. Recorder rows alone cannot authenticate trajectory identity or exposure.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    },
                    {
                        "system": "host-retained NEST state-variable/model semantics",
                        "role": "required_companion",
                        "notes": "Candidate binding from both recorded keys to exact model state variables, units, fixed parameters and producing model/runtime. Recorded trajectories do not provide a derivative field or phase-plane grid; a future mapping must keep a trajectory view distinct from a derivative-field view rather than silently inventing derivatives.",
                        "sourceId": "host-nest-state-variable-model-semantics"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-analogsignal",
                "sources": [
                    {
                        "system": "neo.AnalogSignal",
                        "role": "primary",
                        "notes": "Two channels sharing one time base map to x and y. If two signals were sampled on different clocks the adapter REFUSES rather than resampling: interpolating one signal onto the other's timestamps would fabricate state coordinates the model never produced.",
                        "sourceId": "neo-analogsignal"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-timeseries",
                "sources": [
                    {
                        "system": "nwb.TimeSeries",
                        "role": "primary",
                        "notes": "The caller must select the two channels explicitly and supply canonical unit codes; NWB unit strings are free text and frequently aliases.",
                        "sourceId": "nwb-timeseries"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "matplotlib-streamplot",
                "sources": [
                    {
                        "system": "matplotlib.streamplot",
                        "role": "primary",
                        "notes": "streamplot integrates an interpolated field to draw streamlines. Cortexel refuses that output: a streamline is a computed trajectory, and presenting one as data would show an integration Cortexel never performed and the caller never checked.",
                        "sourceId": "matplotlib-streamplot"
                    }
                ],
                "feasibilityStatus": "assessed_infeasible",
                "definitionStatus": "not_applicable",
                "authorityRequirements": None,
                "implementationAvailability": "not_applicable"
            }
        ],
        "legacyIds": [
            "nest.phase_plane"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "The 1.0 unit registry has no composite state-per-time code (there is no `mV/ms`). A derivative therefore carries only the reciprocal-time factor and inherits its state dimension from its axis. A composite unit dimension is a post-1.0 registry addition.",
            "Because `/s` and `/ms` share the `per_time` dimension, a derivative labelled `/s` whose numbers were computed in `/ms` passes every dimensional check while being wrong by 1000x. No contract can catch this from the values alone.",
            "Revision 5 has one global `data.trajectories.timeDirection` per FigureRequest for compatibility. It is checked separately for every stably grouped trajectory, but it cannot represent a portrait whose identities were integrated in opposite directions. Such identities require separate FigureRequests; Cortexel refuses a contrary identity rather than adding an unversioned per-identity direction side channel.",
            "The semantic-validator registry has no `trajectory.time_monotone` id. Direction is checked independently within each stably grouped trajectory at derivation: reversals use the closest registered code, SCIENCE_NEGATIVE_INTERVAL, whose name reflects its ISI origin; equality under `duplicateTimePolicy: reject` uses SCIENCE_DUPLICATE_TIME_POLICY. Equal times under `keep_replicates` are retained but break geometry.",
            "There is no registered validator for trajectory-universe membership (`events.sender_universe_declared` is sender-specific and is deliberately not reused). The rule is enforced at the semantic stage and reported as SEMANTIC_UNKNOWN_REFERENCE.",
            "There is no registered validator for the fixed-point convergence re-derivation. It is enforced at derivation and reported as SCIENCE_NORMALIZATION_UNVERIFIABLE, which is the registered code for a derived claim that does not follow from the numbers supplied with it.",
            "`phase_plane.derivative_dimension` only checks that `data.vectorField.dx` and `dy` carry kind `derivative` (SCIENCE_UNIT_DIMENSION_MISMATCH). It does not verify lattice shape (a derivation check); trajectory and fixed-point derivative units are covered by `unit.dimension_match`.",
            "No registered disclosure rule announces the arrow display normalization or an unconverged fixed-point annotation. Arrow scaling reaches the canonical request embedded in the artifact and the accessible summary; fixed-point convergence also reaches the table. Neither fact reaches the footer disclosure list until such rules are registered.",
            "The at-most-eight nullclines with drawable or isolated finite points have mutually distinct non-colour dash/marker tuples. An empty nullcline remains declared only in the legend and summary count; an all-missing nullcline also retains its supplied missing table rows. Neither receives invented plot geometry. Trajectory styles cycle after the registered eight-style palette and a trajectory may share a tuple with a nullcline. The legend and complete table retain the identities of carriers they represent; cross-carrier or more-than-eight trajectory identity is not established independently of colour.",
            "No registered compaction policy is valid here: `line_envelope_minmax` takes a min/max envelope per pixel column, which would collapse a limit cycle into a filled band. An over-budget figure is refused with RESOURCE_COMPACTION_UNAVAILABLE; arc-length-preserving decimation is post-1.0.",
            "UncertaintyV1 is one-dimensional, so no joint uncertainty region for a point in state space can be expressed. `uncertaintySupport` is therefore `[\"none\"]`, and an ensemble of trajectories must be drawn as trajectories, not as a band.",
            "Cortexel 1.0 does not integrate ODEs, evaluate model equations, compute nullclines, locate fixed points, differentiate trajectories, or draw streamlines. Every such quantity is a caller-supplied sample with a declared method.",
            "A trajectory without recorded times cannot be rendered by this figure. The sample index is not a clock, and substituting it would silently imply uniform sampling.",
            "`trace.axis_dimension_compatible` and `trace.duplicate_time_policy` read a `data.series[]` trace structure this phase plane does not use, so they are not declared. Per-component dimension is covered by `unit.dimension_match`; duplicate-time handling is a derivation concern."
        ]
    },
    "neuro.population_rate": {
        "id": "neuro.population_rate",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Population firing rate over time",
        "canonicalQuestion": "How does the event rate of a declared population change over time, using auditable raw counts and an explicitly declared denominator?",
        "cannotEstablish": [
            "That the recorded senders are representative of any larger population.",
            "That a rate change was caused by any particular input, manipulation, or mechanism.",
            "The rate of neurons that were not recorded. A rate is computed over the DECLARED recorded universe and says nothing about anything outside it.",
            "An instantaneous or kernel-smoothed rate. Revision 2 accepts literal event-count bins only; a kernel branch remains structurally absent until its executable kernel, edge policy, table, summary, legend and geometry exist together."
        ],
        "renderer": {
            "id": "figure.population_rate",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/eventTimes/values",
                            "/data/eventSenderIds"
                        ],
                        [
                            "/data/counts",
                            "/data/rates/values"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/recordedSenderIds"
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/window",
                    "unitDimension": "time"
                }
            },
            {
                "id": "bins.strictly_increasing"
            },
            {
                "id": "events.within_window"
            },
            {
                "id": "events.sender_universe_declared"
            },
            {
                "id": "rate.denominator_positive"
            },
            {
                "id": "rate.verify_normalization"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "UNCERTAINTY_NOT_PROVIDED",
            "PRE_BINNED_INPUT",
            "UNIT_CONVERTED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 2000000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Population firing rate for {populationLabel} over the exact half-open window {windowStart} to {windowStop} {timeUnit}. {binCount} literal bins contain {eventCount} events from {recordedSenderCount} recorded senders, including silent senders. Normalization: {normalization}. Rate ranges from {rateMin} to {rateMax} Hz. No sampling uncertainty was supplied or rendered.",
            "tableColumns": [
                {
                    "key": "binStart",
                    "header": "Bin start",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Inclusive lower edge."
                },
                {
                    "key": "binEnd",
                    "header": "Bin end",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exclusive upper edge, including the final bin."
                },
                {
                    "key": "binWidth",
                    "header": "Bin width",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "count",
                    "header": "Events",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact integer count. This is the raw observation everything else is derived from."
                },
                {
                    "key": "recordedSenderCount",
                    "header": "Recorded senders",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The denominator. Includes senders that never fired."
                },
                {
                    "key": "rate",
                    "header": "Rate",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Derived and verified from the count and the denominator."
                },
                {
                    "key": "rateUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.population_rate.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "populationLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "binStart",
                    "binEnd",
                    "binWidth",
                    "count",
                    "recordedSenderCount",
                    "rate",
                    "rateUnit"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "bins",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority population A",
                        "rightValue": "Authority population B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "populationLabel",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "binCount",
                    "eventCount",
                    "recordedSenderCount",
                    "normalization",
                    "rateMin",
                    "rateMax"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "elephant.statistics.time_histogram",
                "version": "1.2.1",
                "status": "not_run",
                "notes": "Elephant's time_histogram is the intended differential oracle. Its bin edge and t_stop conventions must be matched parameter for parameter before the comparison means anything. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-spike-recorder",
                "sources": [
                    {
                        "system": "nest.spike_recorder",
                        "role": "primary",
                        "notes": "Events plus the recorded sender universe. The adapter must supply the RECORDED senders, which NEST knows and the event list does not.",
                        "sourceId": "nest-spike-recorder"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, complete recorded sender universe, origin/start/stop and biological export time, rank/world scope, and detached event-buffer digest. Event rows cannot authenticate silent senders, exposure or completeness.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-spiketrain",
                "sources": [
                    {
                        "system": "neo.SpikeTrain",
                        "role": "primary",
                        "notes": "t_start/t_stop map to the window; the unit is taken from the quantity, never guessed.",
                        "sourceId": "neo-spiketrain"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-units-spike-times",
                "sources": [
                    {
                        "system": "nwb.Units.spike_times",
                        "role": "primary",
                        "notes": "The caller must select the unit rows explicitly.",
                        "sourceId": "nwb-units-spike-times"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.population_rate"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Kernel-smoothed rates are intentionally unsupported in revision 2. Cortexel does not accept a bandwidth it cannot execute and surface completely.",
            "A rate is only as meaningful as the declared recorded universe. Cortexel can verify that the denominator is positive and that events belong to it; it cannot verify that the universe was recorded correctly."
        ]
    },
    "neuro.psth": {
        "id": "neuro.psth",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Peri-event time histogram (trial-aligned event counts)",
        "canonicalQuestion": "How does the event count of a declared selected-sender analysis vary with time relative to a declared per-trial alignment event, using exact integer counts and explicit trial and sender cardinality denominators? Events mode retains the selected-sender identities; prebinned mode retains only aggregate cardinality.",
        "cannotEstablish": [
            "That the declared alignment times mark the event they are labelled with. Cortexel aligns to the times it is given; it cannot verify that they are stimulus onsets rather than trial starts, or that they were corrected for display latency.",
            "That a modulation around the alignment instant was CAUSED by the aligning event. A PSTH shows temporal coincidence with a declared reference; a stimulus-locked artifact, a periodic background, or a slow drift across the session produce the same shape.",
            "That a response is time-locked rather than latency-jittered. Averaging over trials attenuates a response whose latency varies from trial to trial, so a flat PSTH is not evidence that no response occurred.",
            "That any bin differs significantly from baseline. This revision renders counts and exact derived values but accepts no uncertainty marks. It performs no test, applies no multiple-comparison correction across bins, and reports no p-value.",
            "The instantaneous rate. A PSTH is an exact count in a finite bin: the height of a peak depends on the bin width that was chosen, and this contract offers no kernel estimate of an underlying intensity function.",
            "The response of senders that were not selected, or of trials that were excluded. Every value is computed over the caller-declared included-trial and selected-sender scope and says nothing about anything outside it. In prebinned mode Cortexel retains only exact scope cardinalities, not selected-sender identities or the included/excluded trial membership partition.",
            "That a bin no included trial covered has a rate of zero. That bin was not observed. It is reported as null, drawn as a gap, and never painted as a measured zero."
        ],
        "renderer": {
            "id": "figure.psth",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/eventTimes/values",
                            "/data/eventSenderIds",
                            "/data/eventTrialIds"
                        ],
                        [
                            "/data/trialIds",
                            "/data/alignmentTimes"
                        ],
                        [
                            "/data/counts",
                            "/data/trialDenominators",
                            "/data/rates/values"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/recordedSenderIds",
                        "/data/trialIds"
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/relativeWindow",
                    "unitDimension": "time"
                }
            },
            {
                "id": "bins.strictly_increasing"
            },
            {
                "id": "events.sender_universe_declared"
            },
            {
                "id": "events.trial_universe_declared"
            },
            {
                "id": "psth.alignment_declared"
            },
            {
                "id": "rate.denominator_positive"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "EVENTS_EXCLUDED_OUT_OF_WINDOW",
            "MISSING_VALUES_PRESENT",
            "UNCERTAINTY_NOT_PROVIDED",
            "PRE_BINNED_INPUT",
            "RECTANGULAR_SENDER_EXPOSURE_ASSERTED",
            "UNIT_CONVERTED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 2000000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Peri-event time histogram for {seriesLabel}, whose relative coordinates are aligned to {alignmentLabel} at time 0. Relative window {windowStart} to {windowStop} {timeUnit} with boundary {windowBoundary}; {zeroVisibilityStatement} {binCount} explicit bins whose individual widths and unit are retained in the complete table. {eventCount} events; selected-sender cardinality {selectedSenderCount}; included-trial cardinality {includedTrialCount}; excluded-trial cardinality {excludedTrialCount}. Denominator policy: {denominatorPolicy}. Normalization: {normalization}. Values range from {valueMin} to {valueMax} {valueUnit}. {baselineStatement} {missingBinStatement} {excludedEventStatement} {uncertaintyStatement}",
            "tableColumns": [
                {
                    "key": "seriesId",
                    "header": "Series id",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Stable caller-declared series identity, repeated so a detached CSV does not rely on a mutable or colliding label."
                },
                {
                    "key": "seriesLabel",
                    "header": "Series",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The caller-declared series label, or the stable series id when no display label was supplied; repeated so a detached CSV remains interpretable."
                },
                {
                    "key": "alignmentLabel",
                    "header": "Alignment",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The caller-declared meaning of relative time zero; unverified as an experimental fact."
                },
                {
                    "key": "binStart",
                    "header": "Bin start (relative)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Inclusive lower edge, measured from the alignment instant."
                },
                {
                    "key": "binEnd",
                    "header": "Bin end (relative)",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exclusive upper edge; inclusive only for the final bin of a closed window."
                },
                {
                    "key": "binWidth",
                    "header": "Bin width",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "binUnit",
                    "header": "Bin unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Registered unit shared by binStart, binEnd, and binWidth."
                },
                {
                    "key": "relativeWindowStart",
                    "header": "Relative-window start",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "relativeWindowStop",
                    "header": "Relative-window stop",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "relativeWindowUnit",
                    "header": "Relative-window unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "relativeWindowBoundary",
                    "header": "Relative-window boundary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The membership convention, retained independently of the bin-placement convention."
                },
                {
                    "key": "binBoundary",
                    "header": "Bin boundary",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The placement convention. PSTH requires it to agree with the relative-window membership boundary."
                },
                {
                    "key": "finalEdgeInclusive",
                    "header": "Final edge inclusive",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Whether the last authoritative bin accepts its final edge. A closed relative window requires true."
                },
                {
                    "key": "count",
                    "header": "Events",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Exact integer count. Null means no included trial covered this bin — it is not a measured zero. This is the raw observation everything else is derived from."
                },
                {
                    "key": "trialDenominator",
                    "header": "Covering trials",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Included trials that fully cover this bin. The denominator for this bin."
                },
                {
                    "key": "includedTrialCount",
                    "header": "Included trials",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact included cardinality, constant across bins. Under `per_bin_covering_trials` it is the ceiling the covering-trial count is read against. Prebinned mode does not retain which trial ids are included."
                },
                {
                    "key": "excludedTrialCount",
                    "header": "Excluded trials",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact excluded cardinality, constant across bins. Excluded trials enter no numerator or denominator. Prebinned mode does not retain which trial ids are excluded."
                },
                {
                    "key": "excludedOutOfWindowCount",
                    "header": "Events excluded (out of window)",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "In events mode, events whose relative time fell outside the relative window — including one at exactly relStop under the half-open convention — and so entered no bin. Constant across bins, counted, and reported. Null in prebinned mode because no source event list exists to audit."
                },
                {
                    "key": "selectedSenderCount",
                    "header": "Selected senders",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Exact selected cardinality, including silent selected senders. Used only by the per-sender normalization. Prebinned mode does not retain sender identities."
                },
                {
                    "key": "normalization",
                    "header": "Normalization",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The closed normalization id, repeated so `Value` cannot be detached from its denominator semantics."
                },
                {
                    "key": "denominatorPolicy",
                    "header": "Denominator policy",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "senderExposurePolicy",
                    "header": "Sender-exposure policy",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Null unless the per-selected-sender rate is requested; otherwise the explicit nonverifiable rectangular-exposure assertion."
                },
                {
                    "key": "value",
                    "header": "Value",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The normalized value, re-derived and verified from the count, the denominator, and the bin width."
                },
                {
                    "key": "valueUnit",
                    "header": "Unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "baselineCorrectedValue",
                    "header": "Value minus baseline",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "One-round exact signed difference from the aggregate baseline rate; may be negative. Null when no baseline was requested. It never replaces the count."
                },
                {
                    "key": "baselineMode",
                    "header": "Baseline mode",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The closed correction id; null when no baseline was requested."
                },
                {
                    "key": "baselineRate",
                    "header": "Baseline rate",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Aggregate raw-count-over-exposure baseline in valueUnit; null when absent."
                },
                {
                    "key": "baselineStart",
                    "header": "Baseline start",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "baselineStop",
                    "header": "Baseline stop",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "baselineUnit",
                    "header": "Baseline unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.psth.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "normalization"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "seriesId",
                    "seriesLabel",
                    "alignmentLabel",
                    "binStart",
                    "binEnd",
                    "binWidth",
                    "binUnit",
                    "relativeWindowStart",
                    "relativeWindowStop",
                    "relativeWindowUnit",
                    "relativeWindowBoundary",
                    "binBoundary",
                    "finalEdgeInclusive",
                    "count",
                    "trialDenominator",
                    "includedTrialCount",
                    "excludedTrialCount",
                    "excludedOutOfWindowCount",
                    "selectedSenderCount",
                    "normalization",
                    "denominatorPolicy",
                    "senderExposurePolicy",
                    "value",
                    "valueUnit",
                    "baselineCorrectedValue",
                    "baselineMode",
                    "baselineRate",
                    "baselineStart",
                    "baselineStop",
                    "baselineUnit"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "bins",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "uncertainty",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "count",
                        "rightValue": "count_per_trial",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "geometry.sequence"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "seriesLabel",
                    "alignmentLabel",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "windowBoundary",
                    "zeroVisibilityStatement",
                    "binCount",
                    "eventCount",
                    "selectedSenderCount",
                    "includedTrialCount",
                    "excludedTrialCount",
                    "denominatorPolicy",
                    "normalization",
                    "valueMin",
                    "valueMax",
                    "valueUnit",
                    "baselineStatement",
                    "missingBinStatement",
                    "excludedEventStatement",
                    "uncertaintyStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "elephant.statistics.time_histogram",
                "version": "1.2.1",
                "status": "not_run",
                "notes": "Elephant's time_histogram is the intended differential oracle for the uniform-denominator policy, with one SpikeTrain per trial. Its conventions must be reconciled parameter for parameter first: its `mean` output divides by the number of SPIKETRAINS, which equals the trial count only when each train pools every selected sender — the exact per-trial versus per-neuron conflation this contract splits into two normalization ids. It also requires the input trains to share t_start and t_stop, so it cannot oracle `per_bin_covering_trials` at all; that policy is covered by hand vectors only. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-spike-recorder",
                "sources": [
                    {
                        "system": "nest.spike_recorder",
                        "role": "primary",
                        "notes": "Supplies only event times and sender ids. NEST has no trial or alignment-event abstraction, so the recorder cannot establish trial identity, coverage, exclusions or exposure. The adapter blocks with ADAPTER_MAPPING_REQUIRED rather than treating each simulation as one implicit trial.",
                        "sourceId": "nest-spike-recorder"
                    },
                    {
                        "system": "host-retained NEST trial and alignment protocol",
                        "role": "required_companion",
                        "notes": "Supplies the complete trial universe, one explicit alignment coordinate per trial, selected-sender universe, relative measurement window, per-trial coverage and every exclusion. Events mode is allowed only when this record establishes full coverage of every declared trial; partial coverage or exclusions require caller-derived prebinned counts and exact denominators. The protocol is external authority and is never reconstructed from recorder boundaries.",
                        "sourceId": "host-nest-trial-alignment-protocol"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, every recorder id/status/backend, selected sender universe, origin/start/stop, biological export time, rank/world scope, and detached event-buffer digest. It must bind each export exactly once to the separately declared trial protocol.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-segment",
                "sources": [
                    {
                        "system": "neo.Segment",
                        "role": "primary",
                        "notes": "One Segment may map to one events-mode trial only when every selected Segment covers the complete relative window. The alignment time must be an explicitly selected Event: a Segment's t_start is a recording boundary, not a stimulus onset, and is never used as an alignment reference by default. Unequal coverage requires prebinned mode.",
                        "sourceId": "neo-segment"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-timeintervals",
                "sources": [
                    {
                        "system": "nwb.TimeIntervals",
                        "role": "primary",
                        "notes": "The alignment column must be named explicitly; start_time is not assumed to be the aligning event. Events mode supports only a selected set of full-window trials. Exclusions or unequal trial coverage must be transformed to prebinned exact counts plus covering-trial denominators before authoring this request.",
                        "sourceId": "nwb-timeintervals"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-units-spike-times",
                "sources": [
                    {
                        "system": "nwb.Units.spike_times",
                        "role": "primary",
                        "notes": "The caller must select the unit rows explicitly; the selected-sender universe is the selection, not every unit in the file.",
                        "sourceId": "nwb-units-spike-times"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.psth"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "No BASELINE_CORRECTED disclosure id exists in disclosures.v1.json 1.0, so the baseline window, method, and derived baseline value are surfaced through the deterministic summary and the table rather than through a disclosure rule. A future registry revision should register one.",
            "The unit registry has no `rate_change` quantity kind. A baseline-subtracted value is a signed difference of rates, carried as `firing_rate` in the declared frequency unit (Hz in the events-mode default): dimensionally correct, but the kind does not encode that it may be negative. The column is headed \"Value minus baseline\" so it is not read as a rate.",
            "Baseline ratio and z-score modes are not offered. A ratio to baseline is undefined whenever the baseline count is zero — the common case for a sparse neuron — and a z-score needs a dispersion denominator the 1.0 validator registry has no entry for. Cortexel refuses rather than emit an infinity.",
            "Revision 2 ships no PSTH compaction and no digest-bound complete table sidecar. A request above the active complete-returned-table limit is refused before derivation; bins are never merged, sampled, excerpted, or silently dropped.",
            "Relative times are formed by one exact typed subtraction and one final rounding to binary64. Cortexel rejects overflow, underflow to an unusable exposure, and converted endpoint collapse, but finite binary64 inputs carry no metadata about the source instrument's precision; it therefore cannot establish that an otherwise representable relative time has scientifically adequate resolution for the chosen bins.",
            "A per-bin trial denominator means the bins of one figure are not all estimated from the same trials. Each bin's denominator is in the table, but two bins with different denominators are not directly comparable as samples of one thing.",
            "Cortexel validates that a per-bin denominator does not exceed the included-trial count; in prebinned mode it cannot verify that the denominator corresponds to trials that actually covered the bin.",
            "Prebinned revision 2 retains exact sender and trial cardinalities but not selected-sender identities or the included/excluded membership partition of `trialIds`. Aggregate counts cannot prove those identities; PRE_BINNED_INPUT states that they are unrecoverable.",
            "Neither raw spike rows nor prebinned counts prove that every selected sender was observable throughout every counted trial/bin. The per-selected-sender normalization therefore requires an explicit rectangular-exposure assertion and emits RECTANGULAR_SENDER_EXPOSURE_ASSERTED; heterogeneous sender exposure requires a future count-and-exposure contract.",
            "A positive scientific bin can be narrower than the deterministic SVG coordinate grid at a requested output width. Cortexel refuses such a render with RENDER_DEGENERATE_DOMAIN rather than invisibly collapse the bin, widen it to a pixel, or overlap its neighbours; the complete numeric request remains valid for a wider output or a scientifically justified wider binning.",
            "The trial universe is declared columnar: a flat `trialIds` array with a positionally parallel `alignmentTimes`. That is what lets ids.unique read a real array, events.trial_universe_declared read a real universe, and psth.alignment_declared read a real alignment, rather than a `/data/trials/rows/*/id` pointer the pipeline cannot resolve.",
            "Revision 2 has no per-trial inclusion or coverage records in events mode. Consequently every declared events-mode trial is included, `excludedTrialCount` is zero, and the root request schema permits only `uniform_trial_count`. Partial coverage must use prebinned counts plus explicit per-bin denominators.",
            "`events.within_window` is not declared for this figure: it compares absolute event times against a single absolute `/data/window`, but a PSTH's membership window is RELATIVE and resolved per trial against each alignment time. Relative-window membership and the excluded-event count are enforced at the derivation stage, which owns the alignment.",
            "`rate.verify_normalization` is not declared for this figure: it re-derives count / (recordedSenderCount x binWidth) from a `/data/binEdges` vector — the population-rate denominator — whereas a PSTH divides by a per-bin trial denominator and keeps one authoritative bin vector at `/parameters/bins`. Supplied `rates` are re-derived at the derivation stage instead."
        ]
    },
    "neuro.response_curve": {
        "id": "neuro.response_curve",
        "revision": 4,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Input-response curve across declared conditions",
        "canonicalQuestion": "How does a declared response statistic vary with a declared controlled input across an explicitly declared set of conditions, with every repeat, its sample count, and every exclusion accounted for?",
        "cannotEstablish": [
            "That the input CAUSED the response. Conditions are compared, not randomized; a monotone curve is equally consistent with an uncontrolled covariate that co-varied with condition order (a seed schedule, a warm-up, a parameter changed alongside the input).",
            "The response at any input level that was not run. There is no interpolation between conditions and no extrapolation beyond them; the guide line has no value between two points and is not a prediction.",
            "A threshold, a slope, a gain, a rheobase, or an EC50. Revision 2 renders no fitted model, and a threshold read off a guide line is an artifact of the condition spacing, not a measurement.",
            "That the curve is smooth or monotone between conditions. A response that is strongly non-monotone at an unsampled input would produce exactly this figure.",
            "That the repeats are independent. Repeats sharing a seed, a network realization, or a cell are not n independent samples, and a standard error computed as if they were is too small by an unknown factor. Cortexel records the declared design; it cannot check it.",
            "That a peak firing rate is a property of the system rather than of the bin width or bandwidth used to estimate it. Halving the bin width can roughly double a reported peak rate.",
            "That the caller-declared event selection matches an unavailable simulator, recorder, or paper. Cortexel checks the eventScope variant, literals, identifier syntax/set cardinality, normalization compatibility, and portable arithmetic; it cannot establish the external referents of selectionId or member identifiers, the truth of recordedSenderCount or completeness, that pooling was actually performed, a digest preimage, or that a supplied count, latency, or peak was computed from that selection.",
            "That the response values are raw. Cortexel cannot detect a baseline subtraction, a normalization, or any other transform the caller applied before sending.",
            "That the conditions are comparable. They are usually separate simulation runs, and nothing in this contract can verify that they shared a model, a network realization, or a seed policy."
        ],
        "renderer": {
            "id": "figure.response_curve",
            "revision": 5
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/conditions/ids",
                            "/data/conditions/labels",
                            "/data/conditions/input/values",
                            "/data/observations/attemptedCounts",
                            "/data/aggregates/response/values",
                            "/data/aggregates/sampleCounts",
                            "/data/aggregates/excludedCounts",
                            "/data/aggregates/trimmedCounts",
                            "/parameters/uncertainty/values",
                            "/parameters/uncertainty/lower",
                            "/parameters/uncertainty/upper",
                            "/parameters/uncertainty/sampleCount"
                        ],
                        [
                            "/data/observations/conditionIds",
                            "/data/observations/repeatIds",
                            "/data/observations/response/values",
                            "/data/observations/response/audit/eventCounts",
                            "/data/observations/response/audit/peakBinCounts"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/conditions/ids"
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/measurementWindow",
                    "unitDimension": "time"
                }
            },
            {
                "id": "response_curve.estimator_declared"
            },
            {
                "id": "uncertainty.valid"
            },
            {
                "id": "uncertainty.supported_variant"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "AGGREGATE_WITHOUT_RAW_REPEATS",
            "EVENT_SCOPE_EXTERNAL_AUTHORITY_UNVERIFIED",
            "EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY",
            "UNCERTAINTY_NOT_PROVIDED",
            "MISSING_VALUES_PRESENT",
            "UNIT_CONVERTED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 20000,
            "maxVisibleMarks": 50000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Response curve {curveLabel}: {responseMethod} in {responseUnit} against {inputLabel} in {inputUnit} on a {inputScale} scale, across {conditionCount} {axisKind} conditions. Caller-declared event scope {eventScopeKind}, selection {eventSelectionId}, membership {eventMembershipBinding}, selected event trains {selectedEventTrainCount}, recorded senders {recordedSenderCount}; rate normalization {rateNormalization}. Estimator {estimator} retained {retainedCount} of {attemptedCount} repeats; {trimmedCount} defined responses were removed symmetrically by trimming and {excludedCount} attempted repeats had an undefined response. Declared repeat design: {repeatDesign}. Response basis: {responseBasis}. Measurement window {windowStart} to {windowStop} {timeUnit}. Response ranges from {responseMin} to {responseMax} {responseUnit}. {uncertaintyStatement} {aggregationStatement} {lineStatement}",
            "tableColumns": [
                {
                    "key": "conditionId",
                    "header": "Condition",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True
                },
                {
                    "key": "conditionLabel",
                    "header": "Condition label",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "input",
                    "header": "Input",
                    "cellType": "finite_number_or_string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The controlled input level. Empty on an ordinal or nominal axis, which has no numeric input and must not be given one."
                },
                {
                    "key": "inputUnit",
                    "header": "Input unit",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "repeatId",
                    "header": "Repeat",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": True,
                    "description": "Present on a raw repeat row. Empty on an aggregate row."
                },
                {
                    "key": "response",
                    "header": "Response",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The measured response of this repeat, or the estimate on an aggregate row."
                },
                {
                    "key": "responseUnit",
                    "header": "Response unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "responseMethod",
                    "header": "Method",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "What the number is: a mean firing rate, a peak firing rate, a first-spike latency, or an event count."
                },
                {
                    "key": "rateNormalization",
                    "header": "Rate normalization",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "For a rate: single_train_rate, pooled total_event_rate, or mean_rate_per_recorded_sender. Empty for non-rate responses. A frequency unit alone does not identify this denominator."
                },
                {
                    "key": "recordedSenderCount",
                    "header": "Recorded senders",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The selected recorded-sender cardinality, including silent senders, for pooled_recorded_senders. Empty for single_train because one event train does not prove one underlying recorded sender. Only mean_rate_per_recorded_sender uses this value as an arithmetic divisor."
                },
                {
                    "key": "missing",
                    "header": "Undefined",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "True when a raw repeat response or aggregate condition estimate is undefined. An attempted undefined repeat is never rendered as zero and never removed from the attempted count."
                },
                {
                    "key": "estimator",
                    "header": "Estimator",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False
                },
                {
                    "key": "sampleCount",
                    "header": "n retained",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Repeats entering the estimator on a condition-estimate row; null on a raw-repeat row. Never the attempted count."
                },
                {
                    "key": "excludedCount",
                    "header": "n excluded",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Repeats attempted whose response was undefined on a condition-estimate row; null on a raw-repeat row."
                },
                {
                    "key": "responseBasis",
                    "header": "Basis",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The event-selection scope and pooling order, full rate normalization and sender denominator where applicable, measurement window, and—when the response is a peak—the bin or mathematically identified kernel support/evaluation policy. A response has no scope-independent meaning."
                },
                {
                    "key": "uncertaintyKind",
                    "header": "Uncertainty",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Condition-estimate uncertainty kind; null on a raw-repeat row."
                },
                {
                    "key": "uncertaintyValue",
                    "header": "Uncertainty value",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The DISPERSION (standard deviation or standard error) for this condition. A dispersion is not an interval: it is reported here and never in the bound columns, because +/- one SD is not a coverage statement."
                },
                {
                    "key": "uncertaintyLower",
                    "header": "Uncertainty lower",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The lower BOUND of an interval variant. Empty for a dispersion."
                },
                {
                    "key": "uncertaintyUpper",
                    "header": "Uncertainty upper",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "The upper BOUND of an interval variant. Empty for a dispersion."
                },
                {
                    "key": "uncertaintyBasis",
                    "header": "Uncertainty basis",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "What the uncertainty was computed over (trials, neurons, ensemble members, bootstrap draws, replicates), plus the level or quantiles and the method where the variant carries them."
                },
                {
                    "key": "estimatorRole",
                    "header": "Estimator role",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Raw rows are retained, trimmed_low, trimmed_high, or undefined; aggregate rows are aggregate_estimate. This makes every raw observation's treatment explicit."
                },
                {
                    "key": "trimmedCount",
                    "header": "n trimmed",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "On an aggregate row, the total number of finite responses removed symmetrically from the two tails. Zero for mean and median. Empty on raw rows, whose estimatorRole identifies each trimmed observation."
                },
                {
                    "key": "peakBinCount",
                    "header": "Peak-bin count audit",
                    "cellType": "finite_number",
                    "nullable": True,
                    "keyPart": False,
                    "description": "For a raw binned-count peak, the exact caller-supplied max-bin event count bound to this repeat. Empty for aggregate rows, kernel peaks, and non-peak responses."
                },
                {
                    "key": "peakCountDerivationAlgorithm",
                    "header": "Peak-count derivation",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Names the exact count-level one-round algorithm used to re-derive this defined raw binned repeat rate or defined condition estimate. Empty on undefined rows/estimates, when no raw peak-bin count audit applies, or when that audit is entirely null and no derivation was applicable."
                },
                {
                    "key": "eventScopeKind",
                    "header": "Declared event scope",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "single_train means one selected spike train with no recorded-sender-cardinality claim. pooled_recorded_senders means the declared sender trains were superposed before the temporal response operation."
                },
                {
                    "key": "eventSelectionId",
                    "header": "Declared event selection",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The stable caller-declared identity of the selection shared by every condition and repeat. Cortexel binds and surfaces it but cannot verify it against an unavailable external recorder."
                },
                {
                    "key": "eventMembershipBinding",
                    "header": "Membership binding",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "How sender membership is identified: the single-train identity, explicit unique sender ids (shown through a canonical membership digest), an externally retained canonical sender-id digest, or cardinality-only with a mandatory limitation disclosure."
                },
                {
                    "key": "selectedEventTrainCount",
                    "header": "Selected event trains",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The number of event trains entering the declared pooling operator: one for single_train and recordedSenderCount for pooled_recorded_senders. This is structural authority, not verification against an external recorder."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.response_curve.output_authority.v4"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "parameters"
                        },
                        {
                            "tag": "field",
                            "name": "curveLabel"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "conditionId",
                    "conditionLabel",
                    "input",
                    "inputUnit",
                    "repeatId",
                    "response",
                    "responseUnit",
                    "responseMethod",
                    "rateNormalization",
                    "recordedSenderCount",
                    "missing",
                    "estimator",
                    "sampleCount",
                    "excludedCount",
                    "responseBasis",
                    "uncertaintyKind",
                    "uncertaintyValue",
                    "uncertaintyLower",
                    "uncertaintyUpper",
                    "uncertaintyBasis",
                    "estimatorRole",
                    "trimmedCount",
                    "peakBinCount",
                    "peakCountDerivationAlgorithm",
                    "eventScopeKind",
                    "eventSelectionId",
                    "eventMembershipBinding",
                    "selectedEventTrainCount"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "conditions",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "series_paths",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    },
                    {
                        "tag": "geometry_class",
                        "id": "uncertainty",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": "Authority response A",
                        "rightValue": "Authority response B",
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "curveLabel",
                    "responseMethod",
                    "responseUnit",
                    "inputLabel",
                    "inputUnit",
                    "inputScale",
                    "conditionCount",
                    "axisKind",
                    "eventScopeKind",
                    "eventSelectionId",
                    "eventMembershipBinding",
                    "selectedEventTrainCount",
                    "recordedSenderCount",
                    "rateNormalization",
                    "estimator",
                    "retainedCount",
                    "attemptedCount",
                    "trimmedCount",
                    "excludedCount",
                    "repeatDesign",
                    "responseBasis",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "responseMin",
                    "responseMax",
                    "uncertaintyStatement",
                    "aggregationStatement",
                    "lineStatement"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "elephant.statistics.mean_firing_rate",
                "version": "1.2.1",
                "status": "not_run",
                "notes": "Elephant 1.2 mean_firing_rate over one SpikeTrain counts the documented [t_start,t_stop] interval inclusively, so it is an oracle for Cortexel single_train_rate only when endpoint membership is made identical—for example a closed Cortexel window, or a half-open window with no event exactly at the excluded stop. Equal numeric endpoints alone are insufficient. A pooled or per-sender Cortexel rate is comparable only after also making Elephant's train axis/pooling behavior and sender universe parameter-for-parameter identical. Elephant instantaneous_rate exposes sampling period, kernel, cutoff/trim, centering, border correction, and train pooling as distinct choices; Cortexel therefore binds the corresponding mathematical kernel form, support, grid, edge policy, and rate normalization rather than inferring them. scipy.stats.trim_mean is an oracle only for the per-tail interpretation away from exact-product floor boundaries: SciPy computes int(binary64(proportiontocut * n)), whereas Cortexel floors the exact rational product of the declared binary64 value and n. The pinned reference environment has NOT been executed here, so the status is not_run rather than assumed."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-spike-recorder",
                "sources": [
                    {
                        "system": "nest.spike_recorder",
                        "role": "primary",
                        "notes": "The recorder yields the events of one repeat, so it can produce only that repeat's response evidence. It cannot produce the controlled input, condition/repeat universe, attempted counts, comparable-run design, measurement window or retained event selection. The adapter never reads any of those facts back out of a device name.",
                        "sourceId": "nest-spike-recorder"
                    },
                    {
                        "system": "host-retained NEST sweep protocol",
                        "role": "required_companion",
                        "notes": "Supplies the complete ordered condition universe, typed controlled inputs, repeat identities and attempted counts, repeat design, measurement window, event selection and the binding from each recorder export to exactly one condition/repeat. It must be retained from the executed sweep; neither Cortexel nor a spike recorder can reconstruct it after the fact. This source remains caller-controlled external authority until a future normative mapping definition authenticates a concrete protocol format.",
                        "sourceId": "host-nest-sweep-protocol"
                    },
                    {
                        "system": "host-retained NEST recorder export declaration",
                        "role": "required_companion",
                        "notes": "Candidate digest-bound declaration for the producing runtime/build and run, every recorder id/status/backend, selected sender universe, origin/start/stop, biological export time, rank/world scope, and detached event-buffer digest. It must bind each export exactly once to the separately declared sweep condition and repeat.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "neo-block",
                "sources": [
                    {
                        "system": "neo.Block",
                        "role": "primary",
                        "notes": "Condition and repeat identity must be selected explicitly from annotations. The adapter will not guess which annotation is the stimulus level, and it never coerces an annotation label into a numeric input.",
                        "sourceId": "neo-block"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-icephys",
                "sources": [
                    {
                        "system": "nwb.icephys",
                        "role": "primary",
                        "notes": "The icephys stimulus/response tables map naturally onto conditions and repeats, but the mapping is not implemented and is therefore not claimed.",
                        "sourceId": "nwb-icephys"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.rate_response"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "Revision 2 renders no fitted model. Cortexel has no optimizer with which to re-derive a fit, and the disclosure registry has no rule that would mark a caller-supplied fit as unverified — an unmarked fitted line is indistinguishable from measured data, so the figure refuses it.",
            "Revision 2 accepts no baseline subtraction or response normalization. A baseline-corrected response is a different quantity and there is no registered disclosure to mark it; a caller who pre-transforms must say so in source.declaredLimitations, where it is rendered as an unverified caller statement.",
            "Revision 2 supports only mean firing rate, peak firing rate, first-spike latency, and event count. Mean/peak membrane voltage and mean state-variable responses are intentionally unrepresentable until a future revision binds the exact recorded variable, sender/compartment scope, sampling grid and completeness, reduction interval and boundary, missing-sample policy, and temporal-versus-cross-sender reduction order. A bare pre-reduced analog number cannot establish those choices; preserve the sampled signal with neuro.analog_trace or neuro.multisignal_trace instead.",
            "Portable validation establishes only internal structure and arithmetic. For every response method—not only audited mean rates—Cortexel cannot establish against unavailable source records that selectionId or member identifiers refer to the claimed records, recordedSenderCount is true, eventCompleteness is true, the declared pooling was actually performed, a membership digest has the claimed preimage/cardinality, or a supplied count, latency, or peak was computed from that selection. The mandatory external-authority disclosure and granular receipt preserve that boundary.",
            "eventScope is one scalar shared by every condition and repeat. A curve whose event selection, selected sender universe, pooling rule, or completeness changes by condition OR repeat is intentionally unrepresentable in revision 2 and must be split into honest curves. explicit ids and canonical digests bind lexical identifier sets, not global entity identity across fresh simulator runs; cardinality_only does not bind even an identifier set. Equal local ids or equal counts therefore never establish the same physical population.",
            "A pooled total-event response whose selected recorded-sender cardinality, completeness, or membership-binding kind is unknown is intentionally unrepresentable in revision 2, even though neuro.population_rate can represent some unknown-universe total rates. Migration and Engram projection must block or withhold such a response rather than relabelling a pre-pooled population train as single_train or inventing a sender universe.",
            "Revision 2 cannot represent latency from stimulus onset because it carries no typed onset coordinate relative to the measurement window. Such a latency could not be proven to name an event inside the window. Use measurement_window_start, or wait for a revision that binds onset kind, value, unit, coordinate frame, and boundary semantics.",
            "Raw mode verifies that submitted rows match the caller-declared attempted count for every condition, and paired mode verifies equality of the submitted repeat-id sets. Cortexel cannot prove that the caller omitted no repeat from every condition or understated every attempted count; external simulator truth remains provenance responsibility, so the receipt names only the declared consistency actually checked.",
            "Revision 2 supports only `{kind: none}` uncertainty. Dispersion and interval variants remain in the common structural union for forward compatibility but are rejected semantically for this skill until the response compiler has truthful marks and repeat-level verification.",
            "No disclosure rule surfaces a peak response's dependence on the smoothing that produced it. KERNEL_SMOOTHED_RATE cannot be reused: its text asserts a continuous line rather than steps, which is false of a curve. `PEAK_DEPENDS_ON_SMOOTHING` is proposed for 1.1.",
            "Because no such disclosure exists, the peak basis is instead required structurally and surfaced in the deterministic summary and the `responseBasis` table column rather than in the footer.",
            "Raw event trains remain unavailable, so Cortexel cannot prove that a declared peak-bin count was actually the maximum count in the source events. Raw binned mode nevertheless requires those exact identified counts, re-derives every defined repeat rate, and computes each defined condition estimator at count level before one final rounding. Aggregate binned mode cannot identify omitted repeat counts and therefore proves only existence on the exact safe-integer estimator lattice. Kernel peaks have no corresponding discrete audit or lattice and remain caller-supplied after complete basis validation. When at least one defined peak exists, the receipt keeps callerSuppliedPeakValue=true and peakValueRecomputed=false because no peak is recomputed from event trains, while separate fields state exactly which count-to-rate and condition-estimator arithmetic was re-derived. For an all-null peak response both flags are null/not applicable.",
            "This figure declares no compaction policy. Above the visible-mark budget it fails rather than thinning repeats: extrema sampling would fabricate an inflated spread, and merging repeats would fabricate measurements that were never run. Supply aggregates instead, and accept the aggregation disclosure.",
            "Revision 2 accepts only a complete returned alternative table. A response curve whose raw-repeat plus condition-estimate table exceeds the active returned-row limit is refused with RESOURCE_COMPACTION_UNAVAILABLE before sorting or aggregation; it is never silently excerpted and no unavailable sidecar is advertised."
        ]
    },
    "neuro.spike_raster": {
        "id": "neuro.spike_raster",
        "revision": 5,
        "status": "stable",
        "availability": "packaged",
        "releaseReady": False,
        "title": "Spike raster: event times by identified sender and trial",
        "canonicalQuestion": "At what times, and from which identified senders and trials, were events recorded inside a declared window — with every event preserved, and with every recorded sender and every declared trial keeping its row even when nothing happened on it?",
        "cannotEstablish": [
            "A firing rate. Apparent tick density depends on mark width, row height, and the pixels available: at 800 px across a 1000 ms window one pixel column spans 1.25 ms, so ticks saturate long before the rate does. Use neuro.population_rate.",
            "Synchrony. Two ticks that look vertically aligned may be a whole pixel column apart — 1.25 ms at the geometry above, which is longer than many monosynaptic delays. Alignment in a raster is a fact about the display, not about the spikes.",
            "That an empty row is a silent neuron. It shows only that no event was RECORDED for that sender in that window. Cortexel can verify that the declared universe is internally consistent; it cannot verify that the recorder saw every spike.",
            "Causality or propagation. A left-to-right sequence of ticks across rows is an ordering of observations, not evidence that one neuron drove another.",
            "That two neighbouring rows are related. Row order is a declared display order; vertical proximity carries no measured similarity, distance, or connectivity.",
            "Correlation structure. The eye reliably invents structure in a raster that a shuffle control removes. Use neuro.correlogram, which has a denominator.",
            "That the recorded senders are representative of any larger population.",
            "The exact number of events at one instant, read from the image: ticks closer than one device pixel are drawn on top of each other. Only the table is exact."
        ],
        "renderer": {
            "id": "figure.spike_raster",
            "revision": 6
        },
        "semanticValidators": [
            {
                "id": "provenance.no_caller_assurance"
            },
            {
                "id": "provenance.note_safe_display"
            },
            {
                "id": "unit.canonical_code"
            },
            {
                "id": "unit.dimension_match"
            },
            {
                "id": "series.equal_length",
                "parameters": {
                    "groups": [
                        [
                            "/data/eventTimes/values",
                            "/data/eventSenderIds",
                            "/data/eventTrialIds",
                            "/data/eventIds"
                        ],
                        [
                            "/data/recordedSenderIds",
                            "/data/senderPopulationIds"
                        ]
                    ]
                }
            },
            {
                "id": "ids.unique",
                "parameters": {
                    "pointers": [
                        "/data/recordedSenderIds",
                        "/data/trialIds",
                        "/data/eventIds"
                    ]
                }
            },
            {
                "id": "window.valid",
                "parameters": {
                    "pointer": "/data/window",
                    "unitDimension": "time"
                }
            },
            {
                "id": "events.source_clock_declared"
            },
            {
                "id": "events.within_window"
            },
            {
                "id": "events.sender_universe_declared"
            },
            {
                "id": "events.trial_universe_declared"
            }
        ],
        "disclosures": [
            "SOURCE_SIMULATION",
            "SOURCE_SYNTHETIC_FIXTURE",
            "SOURCE_KIND_UNKNOWN",
            "SOURCE_LITERATURE_EXTRACTION",
            "SOURCE_MANUAL_ENTRY",
            "SOURCE_AUTHENTICITY_UNVERIFIED",
            "REFERENCE_COMPARISON_NOT_RUN",
            "EVENTS_EXCLUDED_OUT_OF_WINDOW",
            "NEST_SERIALIZED_CLOCK_BOUNDARY",
            "UNIT_CONVERTED",
            "CALLER_NOTE_UNVERIFIED",
            "NONSTANDARD_BUDGET_PROFILE"
        ],
        "budgets": {
            "maxObservations": 2000000,
            "maxVisibleMarks": 100000,
            "maxReturnedTableRows": 500,
            "compactionPolicies": [
                "none"
            ],
            "tablePolicy": "complete_returned"
        },
        "uncertaintySupport": [
            "none"
        ],
        "accessibility": {
            "summaryTemplate": "Spike raster. {eventCount} events, {excludedCount} outside the window, from {activeSenderCount} of {recordedSenderCount} recorded senders across {trialCount} trials, over {windowStart} to {windowStop} {timeUnit}, boundary {windowBoundary}, time base {timeBase}. {rowCount} rows ordered by {rowOrder}; the order is declared and is never sorted by an observed statistic. Sender universe complete: {senderUniverseComplete}. Marks drawn: {markCount}. Tick density is not a firing rate, and overlapping ticks are not separately visible; exact event times are in the table.",
            "tableColumns": [
                {
                    "key": "sourceOrdinal",
                    "header": "Source ordinal",
                    "cellType": "finite_number_or_string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The event's original zero-based index in the caller's parallel arrays. This is the audit anchor: sorting for display never changes it."
                },
                {
                    "key": "eventId",
                    "header": "Event id",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": True,
                    "description": "Declared id, or the deterministic ordinal identity assigned when none was declared."
                },
                {
                    "key": "time",
                    "header": "Event time",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The event time exactly as supplied; only the window endpoints are converted into this declared event clock for display."
                },
                {
                    "key": "timeUnit",
                    "header": "Time unit",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "senderId",
                    "header": "Sender",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False
                },
                {
                    "key": "trialId",
                    "header": "Trial",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Empty when no trials were declared."
                },
                {
                    "key": "populationId",
                    "header": "Population",
                    "cellType": "string",
                    "nullable": True,
                    "keyPart": False,
                    "description": "Empty when no populations were declared."
                },
                {
                    "key": "rowKey",
                    "header": "Row key",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Collision-free JSON tuple identity [senderId, trialId-or-null]; labels are never used as identities."
                },
                {
                    "key": "rowIndex",
                    "header": "Row index",
                    "cellType": "finite_number",
                    "nullable": False,
                    "keyPart": False,
                    "description": "The zero-based row this event was assigned in the final row order. Rows with no events still appear on the axis."
                },
                {
                    "key": "rowLabel",
                    "header": "Row label",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "Human display label, separate from the collision-free row key."
                },
                {
                    "key": "inWindow",
                    "header": "In window",
                    "cellType": "string",
                    "nullable": False,
                    "keyPart": False,
                    "description": "False for an event excluded by the window. Excluded events remain listed: an event removed from the table is an event nobody can find again."
                }
            ]
        },
        "outputAuthority": {
            "version": 1,
            "evaluator": {
                "tag": "registered_evaluator",
                "id": "neuro.spike_raster.output_authority.v5"
            },
            "requestPaths": [
                {
                    "id": "influence.input",
                    "segments": [
                        {
                            "tag": "field",
                            "name": "data"
                        },
                        {
                            "tag": "field",
                            "name": "senderUniverseComplete"
                        }
                    ]
                }
            ],
            "derivationFields": [
                {
                    "id": "table.rows",
                    "valueKind": "row_sequence"
                },
                {
                    "id": "geometry.sequence",
                    "valueKind": "geometry_sequence"
                },
                {
                    "id": "summary.facts",
                    "valueKind": "summary_fact_map"
                },
                {
                    "id": "disclosure.facts",
                    "valueKind": "disclosure_fact_map"
                }
            ],
            "table": {
                "tag": "row_sequence",
                "expectedRows": {
                    "tag": "derivation_field",
                    "field": "table.rows"
                },
                "carriedValueColumns": [
                    "sourceOrdinal",
                    "eventId",
                    "time",
                    "timeUnit",
                    "senderId",
                    "trialId",
                    "populationId",
                    "rowKey",
                    "rowIndex",
                    "rowLabel",
                    "inWindow"
                ],
                "comparison": "canonical_json_sequence_exact",
                "rowsTotal": "from_verified_expected_rows"
            },
            "geometry": {
                "tag": "classified_geometry",
                "traversal": "nested_groups_depth_first_preorder",
                "excludedRoles": [
                    "axis",
                    "text",
                    "disclosure",
                    "decorative_mark"
                ],
                "expectedSequence": {
                    "tag": "derivation_field",
                    "field": "geometry.sequence"
                },
                "classes": [
                    {
                        "tag": "geometry_class",
                        "id": "events",
                        "cardinality": "exact",
                        "order": "exact",
                        "provenance": "exact",
                        "payloadAssurance": "carrier_only"
                    }
                ]
            },
            "influence": {
                "tag": "finite_paired_witnesses",
                "witnesses": [
                    {
                        "tag": "paired_input",
                        "id": "declared_field_changes_owned_output",
                        "exampleIndex": 0,
                        "input": {
                            "tag": "request_path",
                            "pathId": "influence.input"
                        },
                        "leftValue": True,
                        "rightValue": False,
                        "affected": [
                            {
                                "tag": "derivation_field",
                                "field": "summary.facts"
                            }
                        ],
                        "protected": [
                            {
                                "tag": "derivation_field",
                                "field": "table.rows"
                            }
                        ]
                    }
                ]
            },
            "summary": {
                "tag": "fact_template",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "summary.facts"
                },
                "requiredPlaceholders": [
                    "eventCount",
                    "excludedCount",
                    "activeSenderCount",
                    "recordedSenderCount",
                    "trialCount",
                    "windowStart",
                    "windowStop",
                    "timeUnit",
                    "windowBoundary",
                    "timeBase",
                    "rowCount",
                    "rowOrder",
                    "senderUniverseComplete",
                    "markCount"
                ],
                "missingFactPolicy": "refuse",
                "unknownFactPolicy": "refuse"
            },
            "disclosures": {
                "tag": "derived_disclosures",
                "expectedFacts": {
                    "tag": "derivation_field",
                    "field": "disclosure.facts"
                }
            }
        },
        "evidence": {
            "handVectors": True,
            "externalOracle": {
                "name": "nest-simulator spike_recorder",
                "version": "3.10.0",
                "status": "not_run",
                "notes": "The intended differential oracle is NEST's own memory spike recorder, compared fixture for fixture on the conventions that actually differ between implementations: the open origin+start endpoint, the closed origin+stop endpoint, non-zero origin, native fractional milliseconds, nonchronological output, duplicate rows, and clock-reset behavior. The exact NEST 3.10.0 source was inspected and limited ad hoc exact-version runtime probes were performed, but no committed isolated harness or durable profile-bound receipt exists; status therefore remains not_run and no release oracle-agreement claim is made."
            }
        },
        "adapters": [
            {
                "mappingId": "nest-spike-recorder",
                "sources": [
                    {
                        "system": "nest.spike_recorder",
                        "role": "primary",
                        "notes": "Adapter revision 3 supports only an exact NEST 3.10.0 memory-recorder status profile when `time_in_steps` is explicitly false, the named plain-data projection preserves NumPy event-array values and order, origin/start/stop carry exact on-grid integer-tic preimages, and a closed `kind: caller_declaration` record binds the single-process runtime, successful-return closed-stop endpoint, monotonic kernel clock epoch, most recent buffer epoch, most recent recording-plan mutation, and exact sender universe. It preserves nonchronological order, duplicates, origin, and the native (origin+start,origin+stop] boundary. It does not introspect PyNEST or authenticate any declared capture fact. NEST 3.9, other 3.10 patches, step/offset, ASCII, MPI, and SIONlib inputs fail closed until separately pinned and evidenced.",
                        "sourceId": "nest-spike-recorder"
                    },
                    {
                        "system": "host-declared NEST runtime profile",
                        "role": "required_companion",
                        "notes": "The packaged adapter requires literal `nestVersion: 3.10.0`, but this value is caller-declared rather than read from or attested by a live simulator. R049 must execute the adapter against a pinned real runtime before release certification; local structural acceptance alone is not runtime provenance.",
                        "sourceId": "host-nest-runtime-declaration"
                    },
                    {
                        "system": "host-declared NEST recorder export context",
                        "role": "required_companion",
                        "notes": "The host supplies the complete recorded sender universe, capture history and process scope, and may supply run/recorder ids. The source digest binds the detached plain-data status projection; a separate domain-separated adapter-input digest binds that projection to every normalized option. Neither digest authenticates the projection, recorder wiring, silent-sender completeness, clock or buffer resets, configuration history, run identity, process scope or export custody. Those remain attributable caller declarations until an isolated live-capture receipt exists.",
                        "sourceId": "host-nest-recorder-export-declaration"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "packaged",
                "certificationRequirement": {
                    "ledger": "cortexel-release-evidence-ledger.v1",
                    "gate": {
                        "id": "R049",
                        "section": "Adapters and ecosystem",
                        "requirement": "NEST recorder adapters are tested against real supported NEST output and do not assume chronological events.",
                        "releaseBlocking": True
                    },
                    "conformanceProfile": {
                        "registry": "cortexel-adapter-conformance-profiles.v1",
                        "id": "nest-spike-recorder.v3",
                        "digestAlgorithm": "cortexel_adapter_conformance_profile_rfc8785_sha256_v1",
                        "digest": "sha256:9bf23e63c51b23239cf0438fa770323b65d58cd29ff7d25ed5c7626a9e1f2be4"
                    }
                },
                "notes": "Executable code exists for this bounded profile, but Cortexel does not yet publish a separate closed machine-readable source-to-request mapping definition. The implementation inventory, request schema, source identity, and R049 requirement establish different boundaries and must not be relabelled as an independent normative mapping specification."
            },
            {
                "mappingId": "neo-spiketrain",
                "sources": [
                    {
                        "system": "neo.SpikeTrain",
                        "role": "primary",
                        "notes": "One SpikeTrain per sender; t_start/t_stop map to the window and the unit is taken from the quantity, never guessed. Neo has no concept of `recorded but silent`, so the caller must supply the full sender selection explicitly — a list of SpikeTrains alone cannot produce the empty rows.",
                        "sourceId": "neo-spiketrain"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "nwb-units-spike-times",
                "sources": [
                    {
                        "system": "nwb.Units.spike_times",
                        "role": "primary",
                        "notes": "The ragged spike_times/spike_times_index pair maps to the parallel arrays, but the caller must select the unit rows explicitly. The selected rows become recordedSenderIds and senderUniverseComplete is false unless the caller selected every unit.",
                        "sourceId": "nwb-units-spike-times"
                    }
                ],
                "feasibilityStatus": "assessed_feasible",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            },
            {
                "mappingId": "ncp",
                "sources": [
                    {
                        "system": "ncp",
                        "role": "primary",
                        "notes": "Not certified for 1.0. Until a mapping for the recorded-sender universe exists, an NCP payload cannot produce the empty rows and would silently become a raster of only the neurons that fired.",
                        "sourceId": "ncp"
                    }
                ],
                "feasibilityStatus": "not_assessed",
                "definitionStatus": "not_specified",
                "authorityRequirements": None,
                "implementationAvailability": "not_implemented"
            }
        ],
        "legacyIds": [
            "nest.spike_raster"
        ],
        "owner": "Sepehr Mahmoudian",
        "knownLimitations": [
            "The disclosure registry has no rule keyed to `senderUniverseComplete`, so a declared sender subset appears in the deterministic summary, the artifact, and the table metadata rather than in the disclosure footer.",
            "NODE_UNIVERSE_INCOMPLETE is the nearest existing rule to that gap, but its text is about edges and degree and would be false on a raster, so it is deliberately not emitted. A wrong disclosure is worse than a missing one.",
            "There is likewise no disclosure id for a caller-sampled event set. Rather than emit a rule that does not fit, the contract refuses the sampled value outright.",
            "Cortexel verifies that every event's sender is in the declared universe. It cannot verify that the recorder observed every spike of those senders, so an empty row is evidence of no RECORDED event; reading it as silence rests on the recorder, not on Cortexel.",
            "For a NEST origin-relative window, exact comparisons are exact over the exported finite binary64 millisecond values and declared integer-tic preimages. The required `kind: caller_declaration` capture record also binds the named plain-data projection, successful-return closed-stop endpoint, monotonic kernel clock epoch, buffer epoch, recording-plan history, sender universe, runtime profile and single-process scope. Cortexel checks those declarations for internal consistency but cannot observe or authenticate them; the mandatory NEST capture-boundary disclosure states that limitation on every such figure.",
            "NEST `time_in_steps:true` is deliberately unsupported in revision 3. A step index plus offset is a different canonical clock representation, not a millisecond array; support requires preserving the raw pair and NEST grid authority rather than reconstructing and discarding it.",
            "Below the mark budget every event is drawn, but two events closer than one device pixel overlap. The table count is authoritative; the visible tick count is not, and no figure caption can make it so.",
            "No raster compaction or complete-table sidecar is implemented in revision 3. Requests over the exact-mark or complete-returned-table budget fail closed; the registered future raster_density_bins policy is not advertised by this skill until both surfaces exist.",
            "No uncertainty variant is renderable. An event is an observation, not an estimate, and a band drawn around one would be a fabrication."
        ]
    }
})

SKILL_AUTHORING_EXAMPLES: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
    "network.adjacency_matrix": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.adjacency_matrix"
        },
        "data": {
            "nodeUniverse": {
                "ids": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "order": "as_declared",
                "complete": True
            },
            "connections": {
                "sourceIds": [
                    "1",
                    "1",
                    "2",
                    "3",
                    "3"
                ],
                "targetIds": [
                    "2",
                    "2",
                    "3",
                    "3",
                    "4"
                ],
                "edgeIds": [
                    "e1",
                    "e2",
                    "e3",
                    "e4",
                    "e5"
                ],
                "weights": {
                    "kind": "synaptic_weight",
                    "unit": "nest:weight",
                    "values": [
                        1.2,
                        0.9,
                        0,
                        -0.5,
                        2
                    ]
                },
                "delays": {
                    "kind": "delay",
                    "unit": "ms",
                    "values": [
                        1.5,
                        1.5,
                        2,
                        1,
                        1
                    ]
                },
                "synapseModels": [
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse"
                ]
            },
            "scope": {
                "kind": "single_process",
                "complete": True,
                "snapshotTime": {
                    "kind": "time",
                    "unit": "ms",
                    "value": 1000
                }
            }
        },
        "parameters": {
            "selectionId": "l23_microcircuit",
            "selectionLabel": "L2/3 microcircuit",
            "universeLabel": "L2/3 neurons",
            "cellMode": "multiplicity",
            "multapseAggregation": "sum",
            "multiplicityScale": "linear",
            "tableCellEnumeration": "dense"
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "network.connection_graph": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.connection_graph"
        },
        "data": {
            "nodeUniverse": {
                "ids": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "order": "as_declared",
                "groups": [
                    {
                        "id": "exc",
                        "label": "Excitatory",
                        "memberIds": [
                            "1",
                            "2",
                            "3"
                        ]
                    },
                    {
                        "id": "inh",
                        "label": "Inhibitory",
                        "memberIds": [
                            "4"
                        ]
                    }
                ],
                "complete": True
            },
            "connections": {
                "sourceIds": [
                    "1",
                    "1",
                    "2",
                    "1",
                    "3"
                ],
                "targetIds": [
                    "2",
                    "2",
                    "1",
                    "1",
                    "3"
                ],
                "edgeIds": [
                    "e1",
                    "e2",
                    "e3",
                    "e4",
                    "e5"
                ],
                "weights": {
                    "kind": "synaptic_weight",
                    "unit": "nest:weight",
                    "values": [
                        10.5,
                        10.5,
                        -3.2,
                        2,
                        1
                    ]
                },
                "delays": {
                    "kind": "delay",
                    "unit": "ms",
                    "values": [
                        1.5,
                        1.5,
                        2,
                        1,
                        1
                    ]
                },
                "synapseModels": [
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse"
                ]
            },
            "scope": {
                "kind": "single_process",
                "snapshotTime": {
                    "kind": "time",
                    "unit": "ms",
                    "value": 1000
                },
                "complete": True
            }
        },
        "parameters": {
            "graphId": "microcircuit_snapshot",
            "graphLabel": "Microcircuit connections at t = 1000 ms",
            "layout": {
                "mode": "schematic_grouped_circular"
            },
            "parallelEdges": {
                "display": "separate_lanes",
                "maxLanes": 4
            },
            "multapseAggregation": "sum",
            "edgeValueEncoding": {
                "mode": "weight",
                "channel": "width_and_color",
                "colorScale": "diverging",
                "center": 0,
                "scale": "linear"
            },
            "degreeAnnotation": {
                "mode": "total_degree",
                "countingPolicy": "per_connection_entry",
                "autapseContribution": "counts_in_and_out",
                "encodeAsNodeArea": True
            },
            "nodeColorBy": "group",
            "uncertainty": {
                "kind": "none",
                "reason": "not_applicable"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "network.degree_distribution": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.degree_distribution"
        },
        "data": {
            "mode": "connections",
            "nodeUniverse": {
                "ids": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "order": "as_declared",
                "complete": True
            },
            "connections": {
                "sourceIds": [
                    "1",
                    "1",
                    "2",
                    "3",
                    "2"
                ],
                "targetIds": [
                    "2",
                    "2",
                    "3",
                    "2",
                    "2"
                ],
                "edgeIds": [
                    "c1",
                    "c2",
                    "c3",
                    "c4",
                    "c5"
                ]
            },
            "scope": {
                "kind": "single_process",
                "complete": True,
                "snapshotTime": {
                    "kind": "time",
                    "unit": "ms",
                    "value": 1000
                }
            }
        },
        "parameters": {
            "selectionId": "exc",
            "selectionLabel": "Excitatory",
            "direction": "in",
            "countingPolicy": "count_edges",
            "autapsePolicy": "include",
            "binning": {
                "mode": "per_integer_degree"
            },
            "normalization": "count",
            "uncertainty": {
                "kind": "none",
                "reason": "not_applicable"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "network.delay_distribution": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.delay_distribution"
        },
        "data": {
            "mode": "connections",
            "nodeUniverse": {
                "ids": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "order": "as_declared",
                "complete": True
            },
            "connections": {
                "sourceIds": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "targetIds": [
                    "2",
                    "3",
                    "4",
                    "1"
                ],
                "edgeIds": [
                    "c1",
                    "c2",
                    "c3",
                    "c4"
                ],
                "delays": {
                    "kind": "delay",
                    "unit": "ms",
                    "values": [
                        1,
                        1.5,
                        1.5,
                        2
                    ]
                }
            },
            "groupBy": "none",
            "sourceResolution": {
                "kind": "duration",
                "unit": "ms",
                "value": 0.1
            },
            "scope": {
                "kind": "single_process",
                "complete": True,
                "snapshotTime": {
                    "kind": "time",
                    "unit": "ms",
                    "value": 1000
                }
            }
        },
        "parameters": {
            "selectionId": "recurrent_ee",
            "selectionLabel": "Recurrent E to E",
            "countingPolicy": "per_connection",
            "bins": {
                "mode": "width",
                "unit": "ms",
                "width": 0.5,
                "start": 0.5,
                "stop": 3
            },
            "normalization": "count",
            "outOfRangeDelays": "reject",
            "xScale": "linear",
            "uncertainty": {
                "kind": "none",
                "reason": "not_applicable"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "network.delay_matrix": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.delay_matrix"
        },
        "data": {
            "nodeUniverse": {
                "ids": [
                    "1",
                    "2",
                    "3"
                ],
                "order": "as_declared",
                "complete": True
            },
            "connections": {
                "sourceIds": [
                    "1",
                    "1",
                    "2",
                    "3"
                ],
                "targetIds": [
                    "2",
                    "2",
                    "3",
                    "3"
                ],
                "edgeIds": [
                    "c1",
                    "c2",
                    "c3",
                    "c4"
                ],
                "delays": {
                    "kind": "delay",
                    "unit": "ms",
                    "values": [
                        1,
                        9,
                        2.5,
                        4
                    ]
                },
                "synapseModels": [
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse"
                ]
            },
            "scope": {
                "kind": "single_process",
                "complete": True,
                "snapshotTime": {
                    "kind": "time",
                    "unit": "ms",
                    "value": 1000
                }
            },
            "simulationResolution": {
                "kind": "duration",
                "unit": "ms",
                "value": 0.1
            }
        },
        "parameters": {
            "matrixLabel": "Excitatory subnetwork",
            "multapseAggregation": "min",
            "delaySemantics": "total_transmission",
            "displayUnit": {
                "kind": "delay",
                "unit": "ms"
            },
            "scale": {
                "kind": "linear"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "network.spatial_map_2d": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.spatial_map_2d"
        },
        "data": {
            "nodeUniverse": {
                "ids": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "order": "as_declared",
                "groups": [
                    {
                        "id": "exc",
                        "label": "Excitatory",
                        "memberIds": [
                            "1",
                            "2",
                            "3"
                        ]
                    },
                    {
                        "id": "inh",
                        "label": "Inhibitory",
                        "memberIds": [
                            "4"
                        ]
                    }
                ],
                "complete": True
            },
            "positions": {
                "nodeIds": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "x": {
                    "kind": "position",
                    "unit": "um",
                    "values": [
                        -150,
                        150,
                        -150,
                        150
                    ]
                },
                "y": {
                    "kind": "position",
                    "unit": "um",
                    "values": [
                        -150,
                        -150,
                        150,
                        150
                    ]
                },
                "status": "model_generated",
                "frame": {
                    "id": "l4_sheet",
                    "xAxisLabel": "x (medial-lateral)",
                    "yAxisLabel": "y (rostral-caudal)"
                },
                "domain": {
                    "center": {
                        "x": {
                            "kind": "position",
                            "unit": "um",
                            "value": 0
                        },
                        "y": {
                            "kind": "position",
                            "unit": "um",
                            "value": 0
                        }
                    },
                    "extent": {
                        "width": {
                            "kind": "length",
                            "unit": "um",
                            "value": 400
                        },
                        "height": {
                            "kind": "length",
                            "unit": "um",
                            "value": 400
                        }
                    },
                    "boundary": {
                        "kind": "periodic",
                        "x": True,
                        "y": True,
                        "edgeChordRule": "minimum_image"
                    }
                }
            },
            "scope": {
                "kind": "single_process",
                "snapshotTime": {
                    "kind": "time",
                    "unit": "ms",
                    "value": 1000
                },
                "complete": True
            },
            "connections": {
                "sourceIds": [
                    "1",
                    "1",
                    "2",
                    "4"
                ],
                "targetIds": [
                    "2",
                    "2",
                    "1",
                    "4"
                ],
                "edgeIds": [
                    "e1",
                    "e2",
                    "e3",
                    "e4"
                ],
                "weights": {
                    "kind": "synaptic_weight",
                    "unit": "nest:weight",
                    "values": [
                        10.5,
                        10.5,
                        -3.2,
                        -1
                    ]
                },
                "delays": {
                    "kind": "delay",
                    "unit": "ms",
                    "values": [
                        1.5,
                        1.5,
                        2,
                        1
                    ]
                },
                "synapseModels": [
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse"
                ]
            }
        },
        "parameters": {
            "mapId": "l4_layer_map",
            "mapLabel": "L4 layer at t = 1000 ms",
            "missingPositionPolicy": "reject",
            "nodeEncoding": {
                "mode": "group"
            },
            "markerRadiusPx": 3,
            "multapseAggregation": "sum",
            "connectionDisplay": {
                "valueEncoding": "weight",
                "channel": "width_and_color",
                "colorScale": {
                    "kind": "diverging",
                    "center": 0,
                    "transform": "linear"
                }
            },
            "uncertainty": {
                "kind": "none",
                "reason": "not_applicable"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "network.synaptic_weight_trace": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.synaptic_weight_trace"
        },
        "data": {
            "mode": "edges",
            "window": {
                "start": 0,
                "stop": 1000,
                "unit": "ms",
                "boundary": "[start,stop)"
            },
            "scope": {
                "kind": "single_process",
                "complete": True
            },
            "observation": {
                "kind": "event_updated",
                "updateSemantics": "value_after_update"
            },
            "series": [
                {
                    "edgeId": "syn_12_45_0",
                    "label": "12 to 45",
                    "endpoints": {
                        "sourceId": "12",
                        "targetId": "45"
                    },
                    "synapseModel": "stdp_synapse",
                    "recordedInterval": {
                        "start": 0,
                        "stop": 1000,
                        "unit": "ms",
                        "boundary": "[start,stop)"
                    },
                    "time": {
                        "kind": "time",
                        "unit": "ms",
                        "values": [
                            10,
                            60,
                            130,
                            210
                        ]
                    },
                    "values": {
                        "kind": "synaptic_weight",
                        "unit": "nest:weight",
                        "values": [
                            1,
                            1.15,
                            1.09,
                            None
                        ]
                    },
                    "eventKinds": [
                        "presynaptic_spike",
                        "presynaptic_spike",
                        "presynaptic_spike",
                        "presynaptic_spike"
                    ],
                    "initialWeight": {
                        "quantity": {
                            "kind": "synaptic_weight",
                            "unit": "nest:weight",
                            "value": 1
                        },
                        "origin": "model_parameter"
                    },
                    "bounds": {
                        "upper": {
                            "kind": "synaptic_weight",
                            "unit": "nest:weight",
                            "value": 2
                        },
                        "boundKind": "hard",
                        "origin": "model_parameter"
                    },
                    "uncertainty": {
                        "kind": "none",
                        "reason": "single_trial"
                    }
                },
                {
                    "edgeId": "syn_12_46_0",
                    "label": "12 to 46",
                    "endpoints": {
                        "sourceId": "12",
                        "targetId": "46"
                    },
                    "synapseModel": "stdp_synapse",
                    "recordedInterval": {
                        "start": 0,
                        "stop": 1000,
                        "unit": "ms",
                        "boundary": "[start,stop)"
                    },
                    "time": {
                        "kind": "time",
                        "unit": "ms",
                        "values": [
                            10,
                            60,
                            130
                        ]
                    },
                    "values": {
                        "kind": "synaptic_weight",
                        "unit": "nest:weight",
                        "values": [
                            1,
                            0.94,
                            0.9
                        ]
                    },
                    "eventKinds": [
                        "presynaptic_spike",
                        "presynaptic_spike",
                        "presynaptic_spike"
                    ],
                    "initialWeight": {
                        "quantity": {
                            "kind": "synaptic_weight",
                            "unit": "nest:weight",
                            "value": 1
                        },
                        "origin": "model_parameter"
                    },
                    "bounds": {
                        "upper": {
                            "kind": "synaptic_weight",
                            "unit": "nest:weight",
                            "value": 2
                        },
                        "boundKind": "hard",
                        "origin": "model_parameter"
                    },
                    "uncertainty": {
                        "kind": "none",
                        "reason": "single_trial"
                    }
                }
            ]
        },
        "parameters": {
            "display": "individual",
            "weightComparability": {
                "mode": "single_synapse_model"
            },
            "duplicateTimePolicy": {
                "policy": "reject"
            },
            "showObservationMarkers": True,
            "showReferenceLines": True
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "network.weight_distribution": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.weight_distribution"
        },
        "data": {
            "mode": "connections",
            "sourceUniverse": {
                "ids": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "order": "as_declared",
                "complete": True
            },
            "targetUniverse": {
                "ids": [
                    "1",
                    "2",
                    "3",
                    "4"
                ],
                "order": "as_declared",
                "complete": True
            },
            "connections": {
                "sourceIds": [
                    "1",
                    "1",
                    "2",
                    "3",
                    "4",
                    "4"
                ],
                "targetIds": [
                    "2",
                    "2",
                    "3",
                    "1",
                    "3",
                    "2"
                ],
                "edgeIds": [
                    "e1",
                    "e2",
                    "e3",
                    "e4",
                    "e5",
                    "e6"
                ],
                "weights": {
                    "kind": "synaptic_weight",
                    "unit": "pA",
                    "values": [
                        45,
                        45,
                        30.5,
                        -60,
                        -75.25,
                        0
                    ]
                },
                "synapseModels": [
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse"
                ]
            },
            "scope": {
                "kind": "single_process",
                "complete": True,
                "snapshotTime": {
                    "kind": "time",
                    "unit": "ms",
                    "value": 1000
                }
            }
        },
        "parameters": {
            "selectionId": "recurrent-all",
            "observationUnit": "synapse",
            "weightComparability": {
                "mode": "single_synapse_model"
            },
            "signTreatment": "preserve",
            "grouping": "none",
            "normalization": "count",
            "outOfRangeWeights": "reject",
            "uncertainty": {
                "kind": "none",
                "reason": "not_applicable"
            },
            "selectionLabel": "All recurrent connections",
            "bins": {
                "mode": "edges",
                "unit": "pA",
                "edges": [
                    -100,
                    -50,
                    0,
                    50,
                    100
                ],
                "boundary": "[lo,hi)",
                "finalEdgeInclusive": True
            },
            "xScale": "linear"
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "network.weight_matrix": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "network.weight_matrix"
        },
        "data": {
            "nodeUniverse": {
                "ids": [
                    "t1",
                    "t2",
                    "s1",
                    "s2",
                    "s3"
                ],
                "order": "as_declared",
                "complete": True
            },
            "connections": {
                "sourceIds": [
                    "s1",
                    "s1",
                    "s2",
                    "s3"
                ],
                "targetIds": [
                    "t1",
                    "t1",
                    "t2",
                    "t1"
                ],
                "edgeIds": [
                    "e1",
                    "e2",
                    "e3",
                    "e4"
                ],
                "weights": {
                    "kind": "synaptic_weight",
                    "unit": "pA",
                    "values": [
                        12,
                        -8,
                        -4.5,
                        0
                    ]
                },
                "synapseModels": [
                    "static_synapse",
                    "static_synapse",
                    "static_synapse",
                    "static_synapse"
                ]
            },
            "scope": {
                "kind": "single_process",
                "complete": True,
                "snapshotTime": {
                    "kind": "time",
                    "unit": "ms",
                    "value": 1000
                }
            }
        },
        "parameters": {
            "multapseAggregation": "sum",
            "colorScale": {
                "class": "diverging",
                "center": 0
            },
            "uncertainty": {
                "kind": "none",
                "reason": "not_applicable"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.analog_trace": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.analog_trace"
        },
        "data": {
            "window": {
                "start": 0,
                "stop": 0.5,
                "unit": "ms",
                "boundary": "[start,stop)"
            },
            "seriesIds": [
                "cell_1_vm",
                "cell_2_vm"
            ],
            "series": [
                {
                    "label": "Cell 1 membrane potential",
                    "recordedVariable": "V_m",
                    "cellId": "1",
                    "observationKind": "point_sample",
                    "origin": {
                        "kind": "recorded"
                    },
                    "time": {
                        "kind": "time",
                        "unit": "ms",
                        "values": [
                            0,
                            0.1,
                            0.2,
                            0.3,
                            0.4
                        ]
                    },
                    "values": {
                        "kind": "membrane_voltage",
                        "unit": "mV",
                        "values": [
                            -70,
                            -69.2,
                            -68.1,
                            None,
                            -65.4
                        ]
                    }
                },
                {
                    "label": "Cell 2 membrane potential",
                    "recordedVariable": "V_m",
                    "cellId": "2",
                    "observationKind": "point_sample",
                    "origin": {
                        "kind": "recorded"
                    },
                    "time": {
                        "kind": "time",
                        "unit": "ms",
                        "values": [
                            0,
                            0.1,
                            0.2,
                            0.3,
                            0.4
                        ]
                    },
                    "values": {
                        "kind": "membrane_voltage",
                        "unit": "mV",
                        "values": [
                            -70,
                            -70.1,
                            -69.9,
                            -70,
                            -69.8
                        ]
                    }
                }
            ]
        },
        "parameters": {
            "layout": "shared_axis",
            "valueUnit": "mV",
            "duplicateTimePolicy": "reject",
            "showSamplePoints": True,
            "uncertainty": {
                "kind": "none",
                "reason": "single_trial"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.compartment_trace": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.compartment_trace"
        },
        "data": {
            "cellId": "cell_0",
            "cellLabel": "L5 pyramidal (cm_default)",
            "compartmentIds": [
                "soma",
                "dend_1",
                "dend_1_1"
            ],
            "compartmentParentIds": [
                None,
                "soma",
                "dend_1"
            ],
            "compartmentLabels": [
                "Soma",
                "Apical trunk",
                "Apical tuft"
            ],
            "compartmentPathDistances": {
                "kind": "length",
                "unit": "um",
                "values": [
                    0,
                    120,
                    340
                ]
            },
            "compartmentOrderBasis": "path_distance_ascending",
            "compartmentUniverseComplete": True,
            "series": [
                {
                    "compartmentId": "soma",
                    "signalId": "v_m",
                    "signalLabel": "Membrane potential",
                    "time": {
                        "kind": "time",
                        "unit": "ms",
                        "values": [
                            0,
                            0.1,
                            0.2,
                            0.3
                        ]
                    },
                    "values": {
                        "kind": "membrane_voltage",
                        "unit": "mV",
                        "values": [
                            -70,
                            -69.2,
                            -40.5,
                            12.4
                        ]
                    }
                },
                {
                    "compartmentId": "dend_1",
                    "signalId": "v_m",
                    "signalLabel": "Membrane potential",
                    "time": {
                        "kind": "time",
                        "unit": "ms",
                        "values": [
                            0,
                            0.1,
                            0.2,
                            0.3
                        ]
                    },
                    "values": {
                        "kind": "membrane_voltage",
                        "unit": "mV",
                        "values": [
                            -70,
                            -69.8,
                            -55.1,
                            -30.2
                        ]
                    }
                },
                {
                    "compartmentId": "dend_1_1",
                    "signalId": "v_m",
                    "signalLabel": "Membrane potential",
                    "time": {
                        "kind": "time",
                        "unit": "ms",
                        "values": [
                            0,
                            0.1,
                            0.2,
                            0.3
                        ]
                    },
                    "values": {
                        "kind": "membrane_voltage",
                        "unit": "mV",
                        "values": [
                            -70,
                            -70,
                            -68.9,
                            None
                        ]
                    }
                }
            ],
            "window": {
                "start": 0,
                "stop": 0.4,
                "unit": "ms",
                "boundary": "[start,stop)"
            }
        },
        "parameters": {
            "layout": "small_multiples",
            "yScale": "shared",
            "duplicateTimePolicy": "reject",
            "uncertainty": {
                "kind": "none",
                "reason": "single_trial"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.correlogram": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.correlogram"
        },
        "data": {
            "mode": "events_auto",
            "train": {
                "trainId": "pool-E",
                "label": "E aggregate event process",
                "eventProcess": {
                    "aggregation": "pooled_total_event_process",
                    "membership": "complete_recorded_sender_universe_including_silent",
                    "multiplicity": "preserve_each_event_record",
                    "senderNormalization": "none"
                },
                "recordedSenderIds": [
                    "e1",
                    "e2"
                ],
                "eventTimes": {
                    "kind": "time",
                    "unit": "ms",
                    "values": [
                        1,
                        2,
                        5
                    ]
                },
                "eventSenderIds": [
                    "e1",
                    "e1",
                    "e2"
                ],
                "eventIds": [
                    "E-1",
                    "E-2",
                    "E-3"
                ]
            },
            "window": {
                "start": 0,
                "stop": 10,
                "unit": "ms",
                "boundary": "[start,stop)"
            },
            "selfPairPolicy": "exclude_same_event_record_by_ordinal",
            "roleAssignment": "same_train_in_reference_and_target_roles",
            "lagOrientation": {
                "definition": "target_time_minus_reference_time",
                "positiveLagMeaning": "target_follows_reference"
            }
        },
        "parameters": {
            "pairScope": "single_pair",
            "lagRange": {
                "unit": "ms",
                "min": -2,
                "max": 2
            },
            "bins": {
                "unit": "ms",
                "width": 1
            },
            "statistic": "raw_pair_count",
            "edgeCorrection": "none",
            "uncertainty": {
                "kind": "none",
                "reason": "single_trial"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.isi_distribution": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.isi_distribution"
        },
        "data": {
            "mode": "events",
            "eventTimes": {
                "kind": "time",
                "unit": "ms",
                "values": [
                    10,
                    30,
                    12,
                    22,
                    42,
                    5
                ]
            },
            "eventSenderIds": [
                "1",
                "1",
                "2",
                "2",
                "2",
                "1"
            ],
            "eventTrialIds": [
                "t1",
                "t1",
                "t1",
                "t1",
                "t1",
                "t2"
            ],
            "recordedSenderIds": [
                "1",
                "2",
                "3"
            ],
            "trialIds": [
                "t1",
                "t2"
            ],
            "window": {
                "start": 0,
                "stop": 100,
                "unit": "ms",
                "boundary": "[start,stop)"
            }
        },
        "parameters": {
            "selectionId": "exc",
            "selectionLabel": "Excitatory",
            "bins": {
                "mode": "width",
                "unit": "ms",
                "width": 5,
                "start": 0,
                "stop": 25
            },
            "normalization": "count",
            "zeroIntervalPolicy": "reject",
            "outOfRangeIntervals": "reject",
            "xScale": "linear",
            "uncertainty": {
                "kind": "none",
                "reason": "not_computed"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.multisignal_trace": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.multisignal_trace"
        },
        "presentation": {
            "height": 480
        },
        "data": {
            "timeBase": "shared",
            "eventTimes": {
                "kind": "time",
                "unit": "ms",
                "values": [
                    0,
                    10,
                    20,
                    30,
                    40
                ]
            },
            "timeAlignment": {
                "kind": "same_clock",
                "runId": "run-2026-07-14-a"
            },
            "series": [
                {
                    "seriesId": "ca",
                    "label": "Astrocyte Ca",
                    "entityId": "astro-1",
                    "entityKind": "astrocyte",
                    "variableId": "Ca_astro",
                    "panelId": "chemistry",
                    "observationKind": "point_sample",
                    "origin": {
                        "kind": "recorded"
                    },
                    "values": {
                        "kind": "concentration",
                        "unit": "umol/L",
                        "values": [
                            0.073,
                            0.081,
                            0.19,
                            0.42,
                            0.11
                        ]
                    },
                    "uncertainty": {
                        "kind": "none",
                        "reason": "single_trial"
                    }
                },
                {
                    "seriesId": "ip3",
                    "label": "Astrocyte IP3",
                    "entityId": "astro-1",
                    "entityKind": "astrocyte",
                    "variableId": "IP3",
                    "panelId": "chemistry",
                    "observationKind": "point_sample",
                    "origin": {
                        "kind": "recorded"
                    },
                    "values": {
                        "kind": "concentration",
                        "unit": "umol/L",
                        "values": [
                            0.16,
                            0.25,
                            0.61,
                            0.44,
                            0.21
                        ]
                    },
                    "uncertainty": {
                        "kind": "none",
                        "reason": "single_trial"
                    }
                },
                {
                    "seriesId": "vm",
                    "label": "Target neuron V_m",
                    "entityId": "nrn-7",
                    "entityKind": "neuron",
                    "compartmentId": "soma",
                    "variableId": "V_m",
                    "panelId": "membrane",
                    "observationKind": "point_sample",
                    "origin": {
                        "kind": "recorded"
                    },
                    "values": {
                        "kind": "membrane_voltage",
                        "unit": "mV",
                        "values": [
                            -70,
                            -69.8,
                            -68.4,
                            -64.1,
                            -67.2
                        ]
                    },
                    "uncertainty": {
                        "kind": "none",
                        "reason": "single_trial"
                    }
                },
                {
                    "seriesId": "sic",
                    "label": "Slow inward current",
                    "entityId": "nrn-7",
                    "entityKind": "neuron",
                    "compartmentId": "soma",
                    "pathwayId": "astro-1-to-nrn-7",
                    "variableId": "I_SIC",
                    "panelId": "current",
                    "observationKind": "point_sample",
                    "origin": {
                        "kind": "recorded"
                    },
                    "values": {
                        "kind": "current",
                        "unit": "pA",
                        "values": [
                            0,
                            0,
                            12.4,
                            38.9,
                            None
                        ]
                    },
                    "uncertainty": {
                        "kind": "none",
                        "reason": "single_trial"
                    }
                }
            ],
            "window": {
                "start": 0,
                "stop": 50,
                "unit": "ms",
                "boundary": "[start,stop)"
            }
        },
        "parameters": {
            "layout": "small_multiples",
            "panels": [
                {
                    "panelId": "chemistry",
                    "label": "Astrocyte chemistry",
                    "unit": "umol/L",
                    "scale": "linear"
                },
                {
                    "panelId": "membrane",
                    "label": "Membrane potential",
                    "unit": "mV",
                    "scale": "linear"
                },
                {
                    "panelId": "current",
                    "label": "Astrocytic current",
                    "unit": "pA",
                    "scale": "linear"
                }
            ],
            "duplicateTimePolicy": {
                "policy": "reject"
            },
            "panelOrder": "as_declared",
            "showSamplePoints": False
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.phase_plane": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.phase_plane"
        },
        "data": {
            "axes": {
                "x": {
                    "stateId": "Vm",
                    "label": "Membrane potential",
                    "kind": "membrane_voltage",
                    "unit": "mV"
                },
                "y": {
                    "stateId": "w",
                    "label": "Recovery variable",
                    "kind": "state_variable",
                    "unit": "1"
                }
            },
            "trajectories": {
                "universe": {
                    "ids": [
                        "n1"
                    ],
                    "labels": [
                        "Neuron 1"
                    ]
                },
                "timeDirection": "forward",
                "pointTrajectoryIds": [
                    "n1",
                    "n1",
                    "n1",
                    "n1"
                ],
                "times": {
                    "kind": "time",
                    "unit": "ms",
                    "values": [
                        0,
                        0.5,
                        1,
                        1.5
                    ]
                },
                "x": {
                    "kind": "membrane_voltage",
                    "unit": "mV",
                    "values": [
                        -65,
                        -60,
                        -50,
                        -40
                    ]
                },
                "y": {
                    "kind": "state_variable",
                    "unit": "1",
                    "values": [
                        0.05,
                        0.06,
                        0.09,
                        0.14
                    ]
                },
                "dxdt": {
                    "kind": "derivative",
                    "unit": "/ms",
                    "values": [
                        10,
                        18,
                        22,
                        15
                    ]
                },
                "dydt": {
                    "kind": "derivative",
                    "unit": "/ms",
                    "values": [
                        0.02,
                        0.05,
                        0.08,
                        0.1
                    ]
                }
            },
            "vectorField": {
                "x": {
                    "kind": "membrane_voltage",
                    "unit": "mV",
                    "values": [
                        -70,
                        -40,
                        -70,
                        -40
                    ]
                },
                "y": {
                    "kind": "state_variable",
                    "unit": "1",
                    "values": [
                        0,
                        0,
                        0.2,
                        0.2
                    ]
                },
                "dx": {
                    "kind": "derivative",
                    "unit": "/ms",
                    "values": [
                        5,
                        20,
                        2,
                        12
                    ]
                },
                "dy": {
                    "kind": "derivative",
                    "unit": "/ms",
                    "values": [
                        0.01,
                        0.06,
                        -0.02,
                        0.03
                    ]
                },
                "domain": {
                    "x": {
                        "start": -70,
                        "stop": -40,
                        "unit": "mV"
                    },
                    "y": {
                        "start": 0,
                        "stop": 0.2,
                        "unit": "1"
                    }
                },
                "lattice": {
                    "kind": "regular_grid",
                    "nx": 2,
                    "ny": 2
                }
            },
            "nullclines": {
                "curveIds": [
                    "v-nullcline"
                ],
                "labels": [
                    "dV/dt = 0"
                ],
                "zeroDerivativeOf": [
                    "x"
                ],
                "methods": [
                    {
                        "kind": "analytic",
                        "residualTolerance": {
                            "kind": "derivative",
                            "unit": "/ms",
                            "value": 1e-12
                        }
                    }
                ],
                "pointCurveIds": [
                    "v-nullcline",
                    "v-nullcline",
                    "v-nullcline"
                ],
                "x": {
                    "kind": "membrane_voltage",
                    "unit": "mV",
                    "values": [
                        -70,
                        -55,
                        -40
                    ]
                },
                "y": {
                    "kind": "state_variable",
                    "unit": "1",
                    "values": [
                        0.02,
                        0.1,
                        0.18
                    ]
                }
            },
            "fixedPoints": {
                "ids": [
                    "fp1"
                ],
                "labels": [
                    "Resting state"
                ],
                "x": {
                    "kind": "membrane_voltage",
                    "unit": "mV",
                    "values": [
                        -64.5
                    ]
                },
                "y": {
                    "kind": "state_variable",
                    "unit": "1",
                    "values": [
                        0.0511
                    ]
                },
                "methods": [
                    "newton_raphson"
                ],
                "converged": [
                    True
                ],
                "residualDxDt": {
                    "kind": "derivative",
                    "unit": "/ms",
                    "values": [
                        2e-10
                    ]
                },
                "residualDyDt": {
                    "kind": "derivative",
                    "unit": "/ms",
                    "values": [
                        4e-12
                    ]
                },
                "toleranceDxDt": {
                    "kind": "derivative",
                    "unit": "/ms",
                    "values": [
                        1e-8
                    ]
                },
                "toleranceDyDt": {
                    "kind": "derivative",
                    "unit": "/ms",
                    "values": [
                        1e-8
                    ]
                }
            }
        },
        "parameters": {
            "arrowScaling": {
                "mode": "sqrt_magnitude",
                "maxArrowLengthFraction": 0.05
            },
            "magnitudeBasis": "axis_normalized",
            "directionMarkers": {
                "mode": "arrowheads_every_n_points",
                "everyNPoints": 2
            },
            "duplicateTimePolicy": "reject",
            "uncertainty": {
                "kind": "none",
                "reason": "not_applicable"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.population_rate": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.population_rate"
        },
        "data": {
            "mode": "events",
            "eventTimes": {
                "kind": "time",
                "unit": "ms",
                "values": [
                    1,
                    1.5,
                    2.5,
                    2.5,
                    3.75,
                    8
                ]
            },
            "eventSenderIds": [
                "1",
                "2",
                "1",
                "3",
                "2",
                "3"
            ],
            "recordedSenderIds": [
                "1",
                "2",
                "3",
                "4"
            ],
            "window": {
                "start": 0,
                "stop": 10,
                "unit": "ms",
                "boundary": "[start,stop)"
            }
        },
        "parameters": {
            "populationId": "exc",
            "populationLabel": "Excitatory",
            "rateMode": "binned_count",
            "bins": {
                "mode": "width",
                "unit": "ms",
                "width": 5,
                "start": 0,
                "stop": 10,
                "boundary": "[lo,hi)",
                "finalEdgeInclusive": False
            },
            "normalization": "mean_rate_per_recorded_sender",
            "uncertainty": {
                "kind": "none",
                "reason": "single_trial"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.psth": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.psth"
        },
        "data": {
            "mode": "events",
            "eventTimes": {
                "kind": "time",
                "unit": "ms",
                "values": [
                    1002,
                    1005.5,
                    1010,
                    2004,
                    2004,
                    2011.5,
                    3009
                ]
            },
            "eventSenderIds": [
                "1",
                "2",
                "1",
                "1",
                "3",
                "2",
                "3"
            ],
            "eventTrialIds": [
                "t1",
                "t1",
                "t1",
                "t2",
                "t2",
                "t2",
                "t3"
            ],
            "recordedSenderIds": [
                "1",
                "2",
                "3",
                "4"
            ],
            "trialIds": [
                "t1",
                "t2",
                "t3",
                "t4"
            ],
            "alignmentUnit": "ms",
            "alignmentTimes": [
                1000,
                2000,
                3000,
                4000
            ],
            "relativeWindow": {
                "start": -10,
                "stop": 20,
                "unit": "ms",
                "boundary": "[start,stop)"
            }
        },
        "parameters": {
            "seriesId": "exc",
            "seriesLabel": "Excitatory",
            "alignmentLabel": "Stimulus onset",
            "bins": {
                "mode": "width",
                "unit": "ms",
                "width": 10,
                "start": -10,
                "stop": 20,
                "boundary": "[lo,hi)",
                "finalEdgeInclusive": False
            },
            "normalization": "mean_rate_per_selected_sender_per_trial",
            "denominatorPolicy": "uniform_trial_count",
            "senderExposurePolicy": "all_selected_senders_cover_every_counted_trial_bin",
            "uncertainty": {
                "kind": "none",
                "reason": "not_computed"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.response_curve": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.response_curve"
        },
        "data": {
            "eventScope": {
                "kind": "pooled_recorded_senders",
                "selectionId": "fi_output_cell",
                "eventKind": "spike",
                "eventCompleteness": "complete_for_selection_within_measurement_window",
                "poolingOperator": "superpose_selected_sender_trains",
                "recordedSenderCount": 1,
                "membershipBinding": {
                    "kind": "explicit_sender_ids",
                    "senderIds": [
                        "cell-1"
                    ]
                }
            },
            "mode": "repeats",
            "measurementWindow": {
                "start": 0,
                "stop": 1000,
                "unit": "ms",
                "boundary": "[start,stop)"
            },
            "conditions": {
                "axis": "numeric",
                "ids": [
                    "I000",
                    "I100",
                    "I200"
                ],
                "labels": [
                    "0 pA",
                    "100 pA",
                    "200 pA"
                ],
                "input": {
                    "kind": "current",
                    "unit": "pA",
                    "values": [
                        0,
                        100,
                        200
                    ],
                    "label": "Injected current",
                    "scale": "linear"
                }
            },
            "observations": {
                "attemptedCounts": [
                    2,
                    2,
                    2
                ],
                "conditionIds": [
                    "I000",
                    "I000",
                    "I100",
                    "I100",
                    "I200",
                    "I200"
                ],
                "repeatIds": [
                    "r1",
                    "r2",
                    "r1",
                    "r2",
                    "r1",
                    "r2"
                ],
                "response": {
                    "method": "mean_firing_rate",
                    "kind": "firing_rate",
                    "unit": "Hz",
                    "rateNormalization": "mean_rate_per_recorded_sender",
                    "values": [
                        0,
                        0,
                        12,
                        14,
                        31,
                        29
                    ],
                    "audit": {
                        "eventCounts": [
                            0,
                            0,
                            12,
                            14,
                            31,
                            29
                        ]
                    }
                }
            }
        },
        "parameters": {
            "curveId": "fi_curve",
            "curveLabel": "iaf_psc_alpha F-I",
            "estimator": "mean",
            "responseMethod": "mean_firing_rate",
            "repeatDesign": "independent",
            "uncertainty": {
                "kind": "none",
                "reason": "not_computed"
            }
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    },
    "neuro.spike_raster": {
        "contract": {
            "name": "cortexel-figure-request",
            "version": "1.0"
        },
        "skill": {
            "id": "neuro.spike_raster"
        },
        "data": {
            "eventTimes": {
                "kind": "time",
                "unit": "ms",
                "values": [
                    12,
                    48.5,
                    12,
                    95
                ]
            },
            "eventSenderIds": [
                "7",
                "7",
                "7",
                "7"
            ],
            "eventTrialIds": [
                "t1",
                "t1",
                "t2",
                "t3"
            ],
            "eventIds": [
                "ev-1",
                "ev-2",
                "ev-3",
                "ev-4"
            ],
            "recordedSenderIds": [
                "7"
            ],
            "trialIds": [
                "t1",
                "t2",
                "t3",
                "t4"
            ],
            "window": {
                "start": 0,
                "stop": 100,
                "unit": "ms",
                "boundary": "[start,stop)"
            },
            "timeBase": "trial_relative",
            "alignmentLabel": "Stimulus onset",
            "senderUniverseComplete": False,
            "eventCompleteness": "complete_for_recorded_senders"
        },
        "parameters": {
            "rowOrder": "as_declared",
            "markStyle": "point",
            "outOfWindowPolicy": "exclude_and_disclose",
            "aboveMarkBudget": "refuse"
        },
        "source": {
            "kind": "synthetic_fixture"
        }
    }
})

SKILL_REVISIONS: Final[Mapping[str, int]] = _freeze({
    "network.adjacency_matrix": 4,
    "network.connection_graph": 4,
    "network.degree_distribution": 4,
    "network.delay_distribution": 5,
    "network.delay_matrix": 5,
    "network.spatial_map_2d": 4,
    "network.synaptic_weight_trace": 4,
    "network.weight_distribution": 4,
    "network.weight_matrix": 4,
    "neuro.analog_trace": 4,
    "neuro.compartment_trace": 4,
    "neuro.correlogram": 4,
    "neuro.isi_distribution": 4,
    "neuro.multisignal_trace": 4,
    "neuro.phase_plane": 5,
    "neuro.population_rate": 4,
    "neuro.psth": 4,
    "neuro.response_curve": 4,
    "neuro.spike_raster": 5
})

SKILL_ADAPTERS: Final[Mapping[str, tuple[Mapping[str, Any], ...]]] = _freeze({
    "network.adjacency_matrix": [
        {
            "mappingId": "nest-getconnections",
            "sources": [
                {
                    "system": "nest.GetConnections",
                    "role": "primary",
                    "notes": "Supplies only the connection rows. It accepts the official singular/scalar form or canonical plural arrays, never both, never broadcasts an optional scalar across rows, and never deduplicates multapses. Accessor-bearing input is rejected before any getter can run (ADAPTER_ACCESSOR_INPUT_REJECTED). The separately named NodeCollection source is mandatory because an edge list can only show that no connection was observed, never that a selected node has degree zero.",
                    "sourceId": "nest-getconnections"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the complete selected node universe, including isolated and silent nodes, in the order intentionally retained for both matrix axes. The exact selection must be retained from the simulation setup; it is never reconstructed from connection endpoints.",
                    "sourceId": "nest-selected-node-universe"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nest-synapsecollection-mpi-target-rank-local",
            "sources": [
                {
                    "system": "nest.SynapseCollection (MPI, target-rank-local)",
                    "role": "primary",
                    "notes": "Supplies the rank-local connection rows. Rows are targets and NEST returns only connections whose targets are owned by the executing MPI process, so each owned target row is complete. The output stays mpi_target_rank_local and is never merged implicitly; connection rows alone cannot establish either the selected node universe or which selected targets are locally owned.",
                    "sourceId": "nest-synapsecollection-mpi-target-rank-local"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies both retained selection views that the rank-local rows cannot reconstruct: the complete selected node universe for the matrix axes and the exact local-membership mask of the selected target NodeCollection. `observedTargetIds` is the exact selected-target intersection whose NEST 3.10 `NodeCollection.local` value is true; it is never inferred from targets that happen to have an incoming connection. NEST deprecates rank-specific simulation logic, so this locality view is used only to describe already rank-local evidence, never to change simulation behavior.",
                    "sourceId": "nest-selected-node-and-target-locality"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "networkx-digraph",
            "sources": [
                {
                    "system": "networkx.DiGraph",
                    "role": "primary",
                    "notes": "networkx's adjacency is A[source][target] — the transpose of Cortexel's convention — so the adapter transposes explicitly and records that it did. The node universe comes from G.nodes so that isolates survive; taking it from G.edges would silently delete every isolate row and column. A MultiDiGraph's parallel edges become distinct connection rows and are never collapsed.",
                    "sourceId": "networkx-digraph"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "dense-numeric-matrix-numpy-scipy-sparse",
            "sources": [
                {
                    "system": "dense numeric matrix (numpy / scipy.sparse)",
                    "role": "primary",
                    "notes": "A bare array carries no node ids, no orientation, and no way to distinguish a not_observed cell from an observed absence. Those are exactly the three facts this contract exists to pin down, so an array that has lost them cannot be promoted back into a matrix figure. Supply the connection rows and the node universe instead.",
                    "sourceId": "dense-numeric-matrix-numpy-scipy-sparse"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        }
    ],
    "network.connection_graph": [
        {
            "mappingId": "nest-getconnections",
            "sources": [
                {
                    "system": "nest.GetConnections",
                    "role": "primary",
                    "notes": "Supplies SynapseCollection.get() connection rows in the official singular/scalar form OR canonical plural arrays, never both, never broadcasting an optional scalar across rows, and never deduplicating multapses. It cannot prove a node has degree zero, so the separately named NodeCollection source is mandatory. The MPI scope must come from the actual run, not from an assumption. A future `global_merged` mapping must be separately profiled with an exact one-run, one-snapshot, every-rank merge authority; this single-query profile does not claim that merge.",
                    "sourceId": "nest-getconnections"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the complete selected node universe, including isolates and silent nodes. GetConnections can prove only that it returned no row for an endpoint; without this companion an isolate would disappear and a missing edge could be misread as evidence of absence.",
                    "sourceId": "nest-selected-node-universe"
                },
                {
                    "system": "nest.GetPosition",
                    "role": "optional_companion",
                    "notes": "Measured layout. Node ids are bound to the matching position order; the single-process / rank-local / merged scope of the position query is retained and must agree with the connection scope.",
                    "sourceId": "nest-getposition"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "networkx-multidigraph",
            "sources": [
                {
                    "system": "networkx.MultiDiGraph",
                    "role": "primary",
                    "notes": "Structure maps cleanly (directed, multiedge, self-loop). NetworkX carries no node-universe completeness flag, no MPI scope, and no units, so the caller must declare all three; the adapter never fabricates them.",
                    "sourceId": "networkx-multidigraph"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo",
            "sources": [
                {
                    "system": "neo",
                    "role": "primary",
                    "notes": "Neo models recordings, not connectivity. There is no faithful mapping, and an invented one would be worse than none.",
                    "sourceId": "neo"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "nwb-core",
            "sources": [
                {
                    "system": "nwb.core",
                    "role": "primary",
                    "notes": "NWB core has no connectivity schema. A mapping depends on a community extension (for example ndx-simulation-output); none is certified here, and Cortexel will not invent a table layout.",
                    "sourceId": "nwb-core"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "ncp",
            "sources": [
                {
                    "system": "ncp",
                    "role": "primary",
                    "notes": "Pending the narrow NCP adapter and its downstream consumer certification.",
                    "sourceId": "ncp"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "network.degree_distribution": [
        {
            "mappingId": "nest-getconnections",
            "sources": [
                {
                    "system": "nest.GetConnections",
                    "role": "primary",
                    "notes": "Supplies the connection rows, preserving every multapse as its own row. Under MPI the returned rows are the ones whose TARGET the rank owns, so the adapter must emit an mpi_target_rank_local scope and declare the rank's targets as observedTargetIds. That scope supports only complete local in-degree; out-degree is rejected with SCOPE_OUT_DEGREE_FROM_RANK_LOCAL because outgoing edges can terminate on other ranks.",
                    "sourceId": "nest-getconnections"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the complete node universe including isolated and silent nodes. Under `mpi_target_rank_local`, this profile also retains the exact local-membership mask of the selected target NodeCollection, so `observedTargetIds` includes locally owned targets with zero incoming rows. GetConnections structurally provides neither fact; without them the zero bin is empty by construction rather than by observation.",
                    "sourceId": "nest-nodecollection"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "networkx-multidigraph",
            "sources": [
                {
                    "system": "networkx.MultiDiGraph",
                    "role": "primary",
                    "notes": "G.nodes gives the universe and retains isolates. The counting policy must match the graph class: a DiGraph has already collapsed parallel edges, so `count_edges` is refused for it rather than approximated from a collapsed graph.",
                    "sourceId": "networkx-multidigraph"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-block",
            "sources": [
                {
                    "system": "neo.Block",
                    "role": "primary",
                    "notes": "Neo models electrophysiological signals and spike trains. It carries no connection snapshot, and nothing in it can be mapped to a degree.",
                    "sourceId": "neo-block"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "nwb-core",
            "sources": [
                {
                    "system": "nwb.core",
                    "role": "primary",
                    "notes": "Core NWB has no standard synaptic-connectivity table. An extension carrying one would need its own certified adapter and its own scope declaration; nothing is mapped today.",
                    "sourceId": "nwb-core"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        }
    ],
    "network.delay_distribution": [
        {
            "mappingId": "nest-getconnections",
            "sources": [
                {
                    "system": "nest.GetConnections",
                    "role": "primary",
                    "notes": "Provisional source candidate only; Cortexel does not currently ship an executable V1 NEST connection adapter. A base final-snapshot mapping would supply source, target and each observed per-connection delay in milliseconds, preserve every multapse row, and never round or snap values. It would preserve valid off-grid values and make no lattice, rounding or construction-path claim. Under MPI it would remain target-rank-local; the separately named NodeCollection candidate supplies owned-target context that rows cannot reveal.",
                    "sourceId": "nest-getconnections"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the selected endpoint universe and, under `mpi_target_rank_local`, the exact local-membership mask of the selected target NodeCollection. The endpoint universe may be incomplete because this figure makes no isolate claim, but `observedTargetIds` must still include every selected target owned by the rank, including one with no returned connection row.",
                    "sourceId": "nest-selected-endpoints-and-target-locality"
                },
                {
                    "system": "nest.GetDefaults(synapse_model)",
                    "role": "required_companion",
                    "notes": "Mapping recipe only; Cortexel does not currently ship an executable V1 NEST connection adapter. Supplies current defaults/status for every observed synapse model. This snapshot does NOT prove the producing NEST runtime, which defaults were active when a connection was created, or whether a row was later changed; it is current model context only. Where a model decomposes total delay, the mapping must export exactly one declared delay quantity and never sum or substitute components silently.",
                    "sourceId": "nest-synapse-model-defaults"
                },
                {
                    "system": "host-retained NEST runtime identity",
                    "role": "required_companion",
                    "notes": "Candidate declaration of the producing NEST version/build identity captured from the live run. Model names or final defaults cannot authenticate this fact, and no normative receipt format exists yet.",
                    "sourceId": "host-nest-runtime-identity"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "networkx-multidigraph",
            "sources": [
                {
                    "system": "networkx.MultiDiGraph",
                    "role": "primary",
                    "notes": "A `delay` edge attribute on a MultiDiGraph retains parallel edges and therefore supports per_connection. A DiGraph has already collapsed them and cannot say with which aggregation, so per_connection is REFUSED from a DiGraph rather than approximated from a collapsed graph.",
                    "sourceId": "networkx-multidigraph"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-block",
            "sources": [
                {
                    "system": "neo.Block",
                    "role": "primary",
                    "notes": "Neo models electrophysiological signals and spike trains. It carries no connection snapshot, and nothing in it maps to a synaptic delay.",
                    "sourceId": "neo-block"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "nwb-core",
            "sources": [
                {
                    "system": "nwb.core",
                    "role": "primary",
                    "notes": "Core NWB has no standard synaptic-connectivity table. An extension carrying one would need its own certified adapter and its own scope declaration; nothing is mapped today.",
                    "sourceId": "nwb-core"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "ncp",
            "sources": [
                {
                    "system": "ncp",
                    "role": "primary",
                    "notes": "Not yet certified. Adapter output is never exempt from the core gate: it is validated by this contract like any other request.",
                    "sourceId": "ncp"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "network.delay_matrix": [
        {
            "mappingId": "nest-getconnections",
            "sources": [
                {
                    "system": "nest.GetConnections",
                    "role": "primary",
                    "notes": "Provisional source candidate only; Cortexel does not currently ship an executable V1 NEST connection adapter. A base final-snapshot mapping would map NEST `target` to rows and `source` to columns, preserve multapses, and copy observed millisecond delays verbatim. It would make no lattice, rounding or construction-path claim, so valid off-grid values remain valid and no historical assignment receipt is required for this base view.",
                    "sourceId": "nest-getconnections"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the complete selected node universe and, for `mpi_target_rank_local`, the exact local-membership mask of the selected target NodeCollection. This retains isolates and locally owned zero-input targets; `observedTargetIds` is never inferred from returned connection targets.",
                    "sourceId": "nest-selected-node-and-target-locality"
                },
                {
                    "system": "nest.GetDefaults(synapse_model)",
                    "role": "required_companion",
                    "notes": "Supplies current defaults/status for every observed synapse model and the present model context for choosing one declared delay quantity. It does NOT establish the producing NEST version, historical defaults, construction path or later updates. Models with separate axonal/dendritic components are never silently summed.",
                    "sourceId": "nest-synapse-model-defaults"
                },
                {
                    "system": "host-retained NEST runtime identity",
                    "role": "required_companion",
                    "notes": "Candidate declaration of the producing NEST version/build identity captured from the live run. A model name or final status cannot authenticate this identity, and no normative receipt format exists yet.",
                    "sourceId": "host-nest-runtime-identity"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "brian2-synapses",
            "sources": [
                {
                    "system": "brian2.Synapses",
                    "role": "primary",
                    "notes": "Brian2 carries a per-synapse `delay` with a real unit, but its i/j indices are array positions, not node ids: the caller must supply the index-to-id mapping explicitly. Brian2's pre/post delay distinction must be resolved into delaySemantics rather than assumed.",
                    "sourceId": "brian2-synapses"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "networkx-digraph",
            "sources": [
                {
                    "system": "networkx.DiGraph",
                    "role": "primary",
                    "notes": "The caller must name the edge attribute holding the delay and declare its unit; NetworkX carries neither units nor scope, so both must be supplied. A MultiDiGraph is required if multapses exist — a DiGraph has already destroyed them before Cortexel is reached, and nothing here can recover them.",
                    "sourceId": "networkx-digraph"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo",
            "sources": [
                {
                    "system": "neo",
                    "role": "primary",
                    "notes": "Neo models recorded signals and spike trains. It has no connectivity object, so there is nothing to map.",
                    "sourceId": "neo"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "nwb-core",
            "sources": [
                {
                    "system": "nwb.core",
                    "role": "primary",
                    "notes": "NWB core has no synapse-level connection table carrying delays. A custom extension would be required, and none is certified; a partial or invented mapping would produce a matrix whose absent cells mean nothing.",
                    "sourceId": "nwb-core"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "ncp",
            "sources": [
                {
                    "system": "ncp",
                    "role": "primary",
                    "notes": "The narrow NCP adapter surface is not yet certified for connection snapshots. It cannot feed this figure until it declares scope explicitly, because a connection export without scope cannot distinguish an absent cell from a not_observed one — and that distinction is the entire content of a sparse matrix.",
                    "sourceId": "ncp"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "network.spatial_map_2d": [
        {
            "mappingId": "nest-getposition",
            "sources": [
                {
                    "system": "nest.GetPosition",
                    "role": "primary",
                    "notes": "Binds node ids to the matching position order — never by array index alone — and retains the single-process / rank-local / merged scope of the position query. The layer's centre, extent and edge_wrap are carried only when the source actually declares them; they are never reconstructed from the coordinates, and a connection mask or kernel is never reconstructed from them at all. NEST layer coordinates are bare numbers: the adapter requires the caller to declare the length unit and never guesses one.",
                    "sourceId": "nest-getposition"
                },
                {
                    "system": "nest.GetConnections",
                    "role": "optional_companion",
                    "notes": "The optional edge layer. SynapseCollection.get() in the official singular/scalar form OR canonical plural arrays, never both, never broadcasting an optional scalar across rows, and never deduplicating multapses. The connection scope must come from the actual run, and its snapshot time must match the position query's.",
                    "sourceId": "nest-getconnections"
                },
                {
                    "system": "host-retained NEST position snapshot declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for producing runtime/build, run and biological time, exact selected node-id/order digest, coordinate unit, layer centre/extent/edge-wrap metadata, query scope, rank/world/merge completeness, and returned-position digest. Bare coordinate arrays cannot authenticate any of those facts, and Cortexel defines no normative receipt yet.",
                    "sourceId": "host-nest-position-snapshot-declaration"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "optional_companion",
                    "notes": "Candidate authority paired with the optional edge layer. It binds the exact connection query, selected endpoint digests, run/time, rank/world/local-ownership context and returned-row digest to the same position snapshot. It is absent when no edge layer is requested; no normative receipt exists yet.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb",
            "sources": [
                {
                    "system": "nwb",
                    "role": "primary",
                    "notes": "NWB carries positions in the electrode table and as ophys ROI centroids. The declared unit and what real files actually store do not always agree, so the adapter requires the caller to declare the unit and select the table explicitly; it never infers either. NWB carries no node-universe completeness flag and no MPI scope, so the caller declares both.",
                    "sourceId": "nwb"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo",
            "sources": [
                {
                    "system": "neo",
                    "role": "primary",
                    "notes": "Neo models recordings, not spatial layouts. There is no faithful mapping, and an invented one would be worse than none.",
                    "sourceId": "neo"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "ncp",
            "sources": [
                {
                    "system": "ncp",
                    "role": "primary",
                    "notes": "Pending the narrow NCP adapter and its downstream consumer certification.",
                    "sourceId": "ncp"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "network.synaptic_weight_trace": [
        {
            "mappingId": "nest-weight-recorder",
            "sources": [
                {
                    "system": "nest.weight_recorder",
                    "role": "primary",
                    "notes": "Exact NEST 3.10 weight_recorder output includes sender, target, receptor, port, time and weight. The upstream test suite distinguishes same-pair multapses by (source,target,port), so Cortexel must not claim the device lacks all per-synapse discrimination. That tuple is still not a self-authenticating global edge id: a future mapping must bind it to the exact post-prepare connection inventory, recorder and synapse-model/port namespace from the same run. Whether the written weight precedes or follows the update triggered by a spike is a property of the exact synapse implementation/runtime and must also be bound rather than guessed. No such normative receipt or adapter exists, so this candidate mapping remains not_assessed.",
                    "sourceId": "nest-weight-recorder"
                },
                {
                    "system": "nest.SynapseCollection post-prepare inventory",
                    "role": "required_companion",
                    "notes": "Candidate authority for binding each recorded (source,target,port,receptor) tuple to one exact connection after recorder preparation. It must preserve same-pair multapses and bind the exact run, biological time, query, synapse model and port namespace. A final free-floating row list is insufficient, and Cortexel does not yet define or consume this receipt.",
                    "sourceId": "nest-weight-recorder-connection-inventory"
                },
                {
                    "system": "host-retained NEST recorder/runtime declaration",
                    "role": "required_companion",
                    "notes": "Candidate authority for the producing runtime/build, recorder identity and interval, synapse-model namespace, rank/world scope and model-specific pre/post-update convention. Until a closed digest-bound receipt exists, these remain caller declarations rather than authenticated NEST evidence.",
                    "sourceId": "host-nest-weight-recorder-context"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nest-getconnections-polling",
            "sources": [
                {
                    "system": "nest.GetConnections polling",
                    "role": "primary",
                    "notes": "Repeatedly calling GetConnections(...).get('weight') at declared times yields `point_sample` observations of the STORED weight. Two facts must travel with them. NEST's STDP synapses are updated lazily, only at a presynaptic spike, so a poll returns the last APPLIED weight and not one that includes plasticity pending from postsynaptic activity since. And a poll sees only the moments it looked: an update and a counter-update that both fall between two polls cancel and leave no trace, so a polled trace can never establish that a synapse was quiet.",
                    "sourceId": "nest-getconnections-polling"
                },
                {
                    "system": "host-retained NEST weight-polling receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound receipt for the producing runtime/build and run, exact connection inventory and model/port namespace, each biological poll coordinate, query/filter/rank scope, and every returned-row digest. It must bind the same connection identity across polls and disclose model-specific lazy-update semantics. No normative receipt or adapter exists, so this mapping remains not_assessed.",
                    "sourceId": "host-nest-weight-polling-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "brian2-statemonitor-over-synapses",
            "sources": [
                {
                    "system": "brian2.StateMonitor over Synapses",
                    "role": "primary",
                    "notes": "Brian records synaptic variables on a regular clock. For an event-driven (on_pre / on_post) rule the underlying variable is piecewise-constant between events while the monitor samples it on the clock, so the samples are point samples OF a step function: joining them with straight segments invents ramps that the model never had, and the mapping must therefore either declare `point_sample` honestly or reconstruct the update events. Not certified until a version matrix and fixtures exist.",
                    "sourceId": "brian2-statemonitor-over-synapses"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-nwb",
            "sources": [
                {
                    "system": "neo / nwb",
                    "role": "primary",
                    "notes": "Neither models a synaptic weight. Forcing a weight trace into a Neo AnalogSignal or an NWB TimeSeries would lose the synapse identity, the update semantics, and the simulator-defined unit, and would present a lazily-updated step function as a regularly sampled continuous signal. A weight trace is not an analog trace: `neuro.analog_trace` closes its quantity-kind enum against `synaptic_weight` for exactly this reason.",
                    "sourceId": "neo-nwb"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "ncp-observation",
            "sources": [
                {
                    "system": "ncp.observation",
                    "role": "primary",
                    "notes": "An NCP adapter must consume an already-authenticated, already-admitted observation from an immutable pinned NCP release. NCP's declarations are carried, never upgraded: `is_simulation_output=true` becomes `source.kind: simulation`, and an absent calibrated-posterior claim stays absent.",
                    "sourceId": "ncp-observation"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "network.weight_distribution": [
        {
            "mappingId": "nest-getconnections",
            "sources": [
                {
                    "system": "nest.GetConnections",
                    "role": "primary",
                    "notes": "Supplies source, target, weight, delay and synapse_model per connection, preserving every multapse as its own row. Under MPI the returned rows are the ones whose TARGET the rank owns, so the adapter must emit an mpi_target_rank_local scope with the rank's local target universe; it may never emit a global claim from one rank.",
                    "sourceId": "nest-getconnections"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the complete presynaptic source universe of the queried selection rectangle. It is a role-distinct NodeCollection from the target universe even when both happen to contain the same recurrent population; GetConnections rows cannot reconstruct silent selected sources.",
                    "sourceId": "nest-source-nodecollection"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the complete postsynaptic target universe of the queried selection rectangle. Under `mpi_target_rank_local`, this retained collection is exactly the selected targets whose pinned NEST 3.10 local-membership value is true, including owned targets with no returned row; `observedTargetIds` equals that set. Rows cannot reconstruct either the selected target universe or ownership authority.",
                    "sourceId": "nest-target-nodecollection"
                },
                {
                    "system": "nest.synapse_defaults",
                    "role": "required_companion",
                    "notes": "Candidate current defaults/status for every observed synapse model. A model's declared weight dimension is insufficient by itself: physical meaning also depends on the postsynaptic neuron model, and current defaults do not authenticate the producing runtime or historical connection state.",
                    "sourceId": "nest-synapse-defaults"
                },
                {
                    "system": "host-retained NEST synapse/postsynaptic model semantics",
                    "role": "required_companion",
                    "notes": "Candidate declaration binding every observed synapse model and target neuron model to the exact producing runtime/build, weight quantity and unit, and any cross-model comparability claim. Connection rows cannot establish target-model physics, and Cortexel defines no normative semantics receipt yet.",
                    "sourceId": "host-nest-weight-semantics"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "networkx-multidigraph",
            "sources": [
                {
                    "system": "networkx.MultiDiGraph",
                    "role": "primary",
                    "notes": "The `weight` edge attribute maps directly and parallel edges are retained, which is what `observationUnit: synapse` requires. A DiGraph has already collapsed parallel edges, so the per-synapse unit is refused for it rather than approximated from a collapsed graph.",
                    "sourceId": "networkx-multidigraph"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-block",
            "sources": [
                {
                    "system": "neo.Block",
                    "role": "primary",
                    "notes": "Neo models signals and spike trains. It carries no connection snapshot and nothing in it maps to a synaptic weight.",
                    "sourceId": "neo-block"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "nwb-core",
            "sources": [
                {
                    "system": "nwb.core",
                    "role": "primary",
                    "notes": "Core NWB has no standard synaptic-connectivity table. An extension carrying one would need its own certified adapter and its own scope declaration; nothing is mapped today.",
                    "sourceId": "nwb-core"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        }
    ],
    "network.weight_matrix": [
        {
            "mappingId": "nest-synapsecollection",
            "sources": [
                {
                    "system": "nest.SynapseCollection",
                    "role": "primary",
                    "notes": "Supplies GetConnections plus get(['source', 'target', 'weight', 'synapse_model']). It accepts the official singular/scalar form or canonical plural arrays, never both; it never broadcasts a scalar weight across rows; and it never deduplicates multapses. Accessor-bearing input is rejected before any getter can run. It cannot express an empty selected target row, so the separately named NodeCollection source is mandatory; scope, snapshot time and weight semantics remain explicit mapping authority rather than properties inferred from the rows.",
                    "sourceId": "nest-synapsecollection"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the complete selected node universe, including isolates and targets with zero incoming connections. The matrix uses that one retained universe for both target rows and source columns and never reconstructs it from the endpoints that happen to occur.",
                    "sourceId": "nest-selected-node-universe"
                },
                {
                    "system": "host-retained NEST synapse/postsynaptic model semantics",
                    "role": "required_companion",
                    "notes": "Candidate declaration binding every observed synapse model and target neuron model to the exact producing runtime/build, weight quantity and unit, and any cross-model comparability claim. Connection rows cannot establish target-model physics, and Cortexel defines no normative semantics receipt yet.",
                    "sourceId": "host-nest-weight-semantics"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nest-getconnections-under-mpi-target-rank-local",
            "sources": [
                {
                    "system": "nest.GetConnections under MPI (target-rank-local)",
                    "role": "primary",
                    "notes": "Supplies rank-local connection rows only. The profile produces `mpi_target_rank_local`, never an implicit merge: empty owned rows are observed absence, non-owned rows are not_observed, and every returned edge target must be owned. The exact selected universe and locally owned selected targets come from the separately named NodeCollection companion, not from rows that happen to exist.",
                    "sourceId": "nest-getconnections-under-mpi-target-rank-local"
                },
                {
                    "system": "nest.NodeCollection",
                    "role": "required_companion",
                    "notes": "Supplies the complete selected node universe and the local-membership mask of the selected target NodeCollection. `observedTargetIds` is exactly the selected targets whose pinned NEST 3.10 `NodeCollection.local` value is true, including locally owned targets with no incoming rows; localTargetUniverseComplete may be true only for that exact set.",
                    "sourceId": "nest-selected-node-and-target-locality"
                },
                {
                    "system": "host-retained NEST synapse/postsynaptic model semantics",
                    "role": "required_companion",
                    "notes": "Candidate declaration binding every observed synapse model and target neuron model to the exact producing runtime/build, weight quantity and unit, and any cross-model comparability claim. Connection rows cannot establish target-model physics, and Cortexel defines no normative semantics receipt yet.",
                    "sourceId": "host-nest-weight-semantics"
                },
                {
                    "system": "host-retained NEST connection snapshot receipt",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration/receipt for the exact producing runtime/build, run, biological time, GetConnections filters, selected source/target digests, rank/world/local-ownership mask, and returned-row digest. A global merged profile additionally requires every rank exactly once for the same run, time, and query. Cortexel defines no normative receipt yet; this provisional mapping remains not_assessed.",
                    "sourceId": "host-nest-connection-snapshot-receipt"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "connectome-edge-table-source-target-weight-model",
            "sources": [
                {
                    "system": "connectome edge table (source, target, weight, model)",
                    "role": "primary",
                    "notes": "Accepted only when the table is accompanied by the complete node universe, a scope, a snapshot time, and a declared weight quantity. A bare edge table cannot establish an isolate, a target with no input, or the difference between an absent cell and a measured zero.",
                    "sourceId": "connectome-edge-table-source-target-weight-model"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "scipy-sparse-dense-numpy-weight-matrix",
            "sources": [
                {
                    "system": "scipy.sparse / dense NumPy weight matrix",
                    "role": "primary",
                    "notes": "Not an input. A COO/CSR/dense matrix has already destroyed the facts this contract requires: duplicate entries were summed (or not) under no recorded policy, an absent cell and a zero weight have both become 0.0, and the contributing edge identities are gone. A matrix is an OUTPUT of this figure, never an input to it.",
                    "sourceId": "scipy-sparse-dense-numpy-weight-matrix"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        },
        {
            "mappingId": "brian2-synapses",
            "sources": [
                {
                    "system": "brian2.Synapses",
                    "role": "primary",
                    "notes": "Weight arrays are per-synapse and multapses are representable, so the mapping is mechanical. It is not certified until a version matrix and fixtures exist.",
                    "sourceId": "brian2-synapses"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "neuro.analog_trace": [
        {
            "mappingId": "nest-multimeter",
            "sources": [
                {
                    "system": "nest.multimeter",
                    "role": "primary",
                    "notes": "The caller must map each recordable to a quantity kind and unit explicitly. NEST records times in ms and V_m in mV, but a recordable named `V_m` does not license the kind `membrane_voltage` — the adapter never infers a kind from a channel name, because `g_ex`, `I_syn`, and a custom model's state variable arrive through the same interface. The multimeter's `interval` gives point samples, not a held signal, so observationKind is `point_sample` unless the caller declares otherwise.",
                    "sourceId": "nest-multimeter"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected node universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. A bare multimeter event dictionary cannot authenticate these facts, and Cortexel defines no normative receipt yet.",
                    "sourceId": "host-nest-recorder-export-declaration"
                },
                {
                    "system": "host-retained NEST recordable semantics",
                    "role": "required_companion",
                    "notes": "Candidate binding from each recorded key to the exact node-model recordable, scientific quantity, unit and producing model/runtime. Similar channel names, model defaults and caller labels are not interchangeable evidence; no normative semantics receipt exists yet.",
                    "sourceId": "host-nest-recordable-semantics"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-analogsignal",
            "sources": [
                {
                    "system": "neo.AnalogSignal",
                    "role": "primary",
                    "notes": "t_start and sampling_rate expand into an explicit time vector; the unit is taken from the quantity, never guessed. Neo's array_annotations that name a channel are carried into recordedVariable, not into the quantity kind.",
                    "sourceId": "neo-analogsignal"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-timeseries",
            "sources": [
                {
                    "system": "nwb.TimeSeries",
                    "role": "primary",
                    "notes": "The caller must select `rate` or `timestamps` explicitly — a TimeSeries may carry both, and choosing for them would silently pick a clock. `conversion` and `offset` must be applied by the caller, or the declared unit is a false statement about the stored integers.",
                    "sourceId": "nwb-timeseries"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "ncp-observation",
            "sources": [
                {
                    "system": "ncp.observation",
                    "role": "primary",
                    "notes": "An NCP observation adapter must consume an already-authenticated, already-admitted observation from an immutable pinned NCP release. NCP's own declarations are carried, never upgraded: `is_simulation_output=true` becomes `source.kind: simulation`, and the absence of a calibrated-posterior claim stays absent.",
                    "sourceId": "ncp-observation"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "neuro.compartment_trace": [
        {
            "mappingId": "nest-multimeter-cm-default",
            "sources": [
                {
                    "system": "nest.multimeter.cm_default",
                    "role": "primary",
                    "notes": "NEST exposes compartment state under positional keys (v_comp0, v_comp1, ...). The adapter REQUIRES an explicit key-to-compartmentId mapping and fails with ADAPTER_MAPPING_REQUIRED rather than assuming index order: a model assembled in a different order would otherwise attach the tuft's trace to the soma's row and no validator could see it. Accessor-bearing input is rejected before any getter runs.",
                    "sourceId": "nest-multimeter-cm-default"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected node universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. A bare multimeter event dictionary cannot authenticate these facts, and Cortexel defines no normative receipt yet.",
                    "sourceId": "host-nest-recorder-export-declaration"
                },
                {
                    "system": "host-retained NEST compartment/model semantics",
                    "role": "required_companion",
                    "notes": "Candidate exact binding from every positional recordable key to one compartment identity, model morphology, quantity and unit in the producing runtime/build. Neither key order nor a `cm_default` model name authenticates morphology or scientific meaning; no normative mapping receipt exists yet.",
                    "sourceId": "host-nest-compartment-model-semantics"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neuron-vector",
            "sources": [
                {
                    "system": "neuron.Vector",
                    "role": "primary",
                    "notes": "NEURON records at (section, seg.x), where seg.x is a normalized position within a section rather than a global compartment identity. The caller must supply the (section, position) to compartment-id mapping; it is not derivable from the recorded arrays.",
                    "sourceId": "neuron-vector"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-analogsignal",
            "sources": [
                {
                    "system": "neo.AnalogSignal",
                    "role": "primary",
                    "notes": "Neo has no compartment concept. The caller must map each channel to a compartment id explicitly; a channel index is not a compartment id.",
                    "sourceId": "neo-analogsignal"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-icephys",
            "sources": [
                {
                    "system": "nwb.icephys",
                    "role": "primary",
                    "notes": "An NWB intracellular series describes an ELECTRODE, not a compartment of a model tree. A single-electrode recording is `neuro.analog_trace`. Presenting it here would imply a compartmental model that does not exist.",
                    "sourceId": "nwb-icephys"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        }
    ],
    "neuro.correlogram": [
        {
            "mappingId": "nest-spike-recorder",
            "sources": [
                {
                    "system": "nest.spike_recorder",
                    "role": "primary",
                    "notes": "Two selected trains plus their declared sender universes. The adapter must state which senders were pooled into each train; it may never infer a train's universe from the senders that happened to spike.",
                    "sourceId": "nest-spike-recorder"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, both recorder identities/statuses/backends, exact disjoint sender-pool universes, observation windows, biological export time, rank/world scope, and detached event-buffer digests. Event rows alone cannot authenticate pool identity or completeness.",
                    "sourceId": "host-nest-recorder-export-declaration"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nest-correlation-detector",
            "sources": [
                {
                    "system": "nest.correlation_detector",
                    "role": "primary",
                    "notes": "Pinned NEST 3.10 documentation (https://nest-simulator.readthedocs.io/en/v3.10/models/correlation_detector.html) defines receptor_port 0 as source 1/reference, receptor_port 1 as source 2/target, lag as target minus reference, and all bins as left-closed/right-open, so the positive outer edge is excluded. The legacy adapter accepts only an explicit `measurement: count_histogram` and `zeroLagPolicy: included`; it emits raw_pair_count and never claims that same-event self-pairs were excluded. The weighted `histogram` is rejected because it is a Kahan sum of products of incoming connection weights and revision 4 has no weight-product quantity/unit or upstream per-event weight authority.",
                    "sourceId": "nest-correlation-detector"
                },
                {
                    "system": "host-retained NEST correlation configuration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, detector status, exact reference/target sender pools and receptor-port connections, simulation resolution/bounds, delta_tau and counting window, biological export time, rank/world scope, and histogram digest. Detector output alone cannot authenticate pool identity or caller-supplied kernel configuration.",
                    "sourceId": "host-nest-correlation-configuration"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-spiketrain",
            "sources": [
                {
                    "system": "neo.SpikeTrain",
                    "role": "primary",
                    "notes": "t_start/t_stop map to the shared window and the unit is taken from the quantity, never guessed. Two SpikeTrains recorded over different intervals must be intersected by the caller first.",
                    "sourceId": "neo-spiketrain"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-units-spike-times",
            "sources": [
                {
                    "system": "nwb.Units.spike_times",
                    "role": "primary",
                    "notes": "The caller must select the unit rows for each train explicitly and declare the recording interval; NWB does not state which units were pooled into an analysis.",
                    "sourceId": "nwb-units-spike-times"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "elephant-cross-correlation-histogram",
            "sources": [
                {
                    "system": "elephant.cross_correlation_histogram",
                    "role": "primary",
                    "notes": "There is no adapter that imports an Elephant CCH as authoritative. Elephant output may enter only through an explicit pre-binned auto or cross product, with role containers, lag axis, orientation, self-pair treatment, exact pair counts and any required reference-event denominators declared; otherwise Elephant defaults would silently become Cortexel semantics.",
                    "sourceId": "elephant-cross-correlation-histogram"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "neuro.isi_distribution": [
        {
            "mappingId": "nest-spike-recorder",
            "sources": [
                {
                    "system": "nest.spike_recorder",
                    "role": "primary",
                    "notes": "The adapter must supply the SELECTED sender universe, which NEST knows and the event list does not, and must not assume the recorder's output is chronological or grouped by sender. Ordering is established within each train by Cortexel.",
                    "sourceId": "nest-spike-recorder"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected sender universe, origin/start/stop and biological export time, rank/world scope, and detached event-buffer digest. Event rows cannot authenticate silent senders or complete exposure.",
                    "sourceId": "host-nest-recorder-export-declaration"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-spiketrain",
            "sources": [
                {
                    "system": "neo.SpikeTrain",
                    "role": "primary",
                    "notes": "One SpikeTrain is one train, which matches the within-train rule exactly. t_start/t_stop map to the window; the unit is taken from the quantity, never guessed. Segments of a Block map to trials, and the complete Segment list must be declared even for segments in which the unit was silent.",
                    "sourceId": "neo-spiketrain"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-units-spike-times",
            "sources": [
                {
                    "system": "nwb.Units.spike_times",
                    "role": "primary",
                    "notes": "The caller must select the unit rows explicitly. NWB carries no trial partition unless the trials table is mapped, so the trial partitioning must be declared rather than inferred; without it the intervals would be formed across trial boundaries.",
                    "sourceId": "nwb-units-spike-times"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "ncp",
            "sources": [
                {
                    "system": "ncp",
                    "role": "primary",
                    "notes": "Not yet certified. An adapter is never exempt from the core gate: its output is validated by this contract like any other request.",
                    "sourceId": "ncp"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "neuro.multisignal_trace": [
        {
            "mappingId": "nest-multimeter",
            "sources": [
                {
                    "system": "nest.multimeter",
                    "role": "primary",
                    "notes": "One node, several recorded variables, one clock. Each recorded variable becomes a series carrying its REAL quantity kind and unit; the adapter must supply them and never defaults an unlabelled channel to membrane voltage.",
                    "sourceId": "nest-multimeter"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected node universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. A bare multimeter event dictionary cannot authenticate these facts.",
                    "sourceId": "host-nest-recorder-export-declaration"
                },
                {
                    "system": "host-retained NEST recordable semantics",
                    "role": "required_companion",
                    "notes": "Candidate binding from every recorded key to the exact node-model recordable, scientific quantity, unit and producing model/runtime. Similar channel names and shared sample coordinates are not evidence that different quantities have the declared meanings.",
                    "sourceId": "host-nest-recordable-semantics"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nest-astrocyte-ip3-ca",
            "sources": [
                {
                    "system": "nest.multimeter",
                    "role": "primary",
                    "notes": "Supplies the actual astrocyte time histories, including `IP3` and `Ca_astro`, from a recorder connected to the selected astrocyte_lr_1994 nodes. A model instance or model name is not a recording and can never be promoted to this primary source.",
                    "sourceId": "nest-astrocyte-multimeter"
                },
                {
                    "system": "nest.astrocyte_lr_1994",
                    "role": "required_companion",
                    "notes": "Candidate exact astrocyte model/recordable semantics, not time histories. Under the reviewed NEST 3.10 source, IP3 and Ca_astro are concentrations in umol/L. This profile says nothing about a neuron model's recordables and never infers units from a similarly spelled custom channel.",
                    "sourceId": "nest-astrocyte-model-semantics"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, astrocyte recorder id/status/backend, exact selected astrocyte universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. The model name does not authenticate the recorded rows.",
                    "sourceId": "host-nest-recorder-export-declaration"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nest-astrocyte-tripartite",
            "sources": [
                {
                    "system": "nest.multimeter",
                    "role": "primary",
                    "notes": "Candidate astrocyte time-history source for IP3 and Ca_astro. A model instance or name is not a recording. This mapping is separate from the IP3/Ca-only profile because adding neuronal V_m or I_SIC introduces a second recorder, model namespace and quantity authority.",
                    "sourceId": "nest-tripartite-astrocyte-multimeter"
                },
                {
                    "system": "nest.multimeter",
                    "role": "required_companion",
                    "notes": "Required neuronal time-history source whenever the figure includes neuronal V_m, I_SIC or another neuron recordable. Its selected nodes, interval, origin and sample coordinates must bind to the astrocyte recorder under one explicit shared-clock policy; no interpolation or same-clock inference is permitted.",
                    "sourceId": "nest-tripartite-neuron-multimeter"
                },
                {
                    "system": "nest.astrocyte_lr_1994",
                    "role": "required_companion",
                    "notes": "Candidate exact astrocyte model/recordable semantics for IP3 and Ca_astro, including producing runtime/build and units. Similar spelling in a custom model is not evidence of the same quantity.",
                    "sourceId": "nest-tripartite-astrocyte-model-semantics"
                },
                {
                    "system": "host-retained NEST neuron model semantics",
                    "role": "required_companion",
                    "notes": "Candidate exact neuron-model recordable semantics and runtime/configuration binding for every neuronal series. Astrocyte model metadata cannot establish that V_m is membrane voltage or I_SIC is current for a different neuron model.",
                    "sourceId": "host-nest-tripartite-neuron-model-semantics"
                },
                {
                    "system": "host-retained NEST shared-recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for one producing runtime/build and run, both recorder identities/statuses/backends, selected astrocyte and neuron universes, exact origin/start/stop/interval values, shared-clock policy, biological export time, rank/world scope, and both detached event-buffer digests. Equal-looking time arrays do not prove shared clock authority.",
                    "sourceId": "host-nest-shared-recorder-export-declaration"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-analogsignal",
            "sources": [
                {
                    "system": "neo.AnalogSignal",
                    "role": "primary",
                    "notes": "One AnalogSignal per series. t_start and sampling_period give the shared time base; the unit is taken from the quantity and never guessed.",
                    "sourceId": "neo-analogsignal"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-irregularlysampledsignal",
            "sources": [
                {
                    "system": "neo.IrregularlySampledSignal",
                    "role": "primary",
                    "notes": "Maps to the per-series time base. The times are used exactly as supplied; Cortexel does not resample onto a common grid.",
                    "sourceId": "neo-irregularlysampledsignal"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-timeseries",
            "sources": [
                {
                    "system": "nwb.TimeSeries",
                    "role": "primary",
                    "notes": "The caller must select the series and declare each one's quantity kind. An NWB unit string is not a Cortexel unit code and is not accepted as one.",
                    "sourceId": "nwb-timeseries"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "neuro.phase_plane": [
        {
            "mappingId": "nest-multimeter",
            "sources": [
                {
                    "system": "nest.multimeter",
                    "role": "primary",
                    "notes": "Two recorded state variables plus times and senders. The adapter maps each recorded variable to an axis with its declared unit and uses the sender as the trajectory id. Recorder order is never assumed: rows are grouped per sender and each sender's own time order is preserved, never sorted globally.",
                    "sourceId": "nest-multimeter"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, selected node universe, origin/start/stop/interval, biological export time, rank/world scope, and detached event-buffer digest. Recorder rows alone cannot authenticate trajectory identity or exposure.",
                    "sourceId": "host-nest-recorder-export-declaration"
                },
                {
                    "system": "host-retained NEST state-variable/model semantics",
                    "role": "required_companion",
                    "notes": "Candidate binding from both recorded keys to exact model state variables, units, fixed parameters and producing model/runtime. Recorded trajectories do not provide a derivative field or phase-plane grid; a future mapping must keep a trajectory view distinct from a derivative-field view rather than silently inventing derivatives.",
                    "sourceId": "host-nest-state-variable-model-semantics"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-analogsignal",
            "sources": [
                {
                    "system": "neo.AnalogSignal",
                    "role": "primary",
                    "notes": "Two channels sharing one time base map to x and y. If two signals were sampled on different clocks the adapter REFUSES rather than resampling: interpolating one signal onto the other's timestamps would fabricate state coordinates the model never produced.",
                    "sourceId": "neo-analogsignal"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-timeseries",
            "sources": [
                {
                    "system": "nwb.TimeSeries",
                    "role": "primary",
                    "notes": "The caller must select the two channels explicitly and supply canonical unit codes; NWB unit strings are free text and frequently aliases.",
                    "sourceId": "nwb-timeseries"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "matplotlib-streamplot",
            "sources": [
                {
                    "system": "matplotlib.streamplot",
                    "role": "primary",
                    "notes": "streamplot integrates an interpolated field to draw streamlines. Cortexel refuses that output: a streamline is a computed trajectory, and presenting one as data would show an integration Cortexel never performed and the caller never checked.",
                    "sourceId": "matplotlib-streamplot"
                }
            ],
            "feasibilityStatus": "assessed_infeasible",
            "definitionStatus": "not_applicable",
            "authorityRequirements": None,
            "implementationAvailability": "not_applicable"
        }
    ],
    "neuro.population_rate": [
        {
            "mappingId": "nest-spike-recorder",
            "sources": [
                {
                    "system": "nest.spike_recorder",
                    "role": "primary",
                    "notes": "Events plus the recorded sender universe. The adapter must supply the RECORDED senders, which NEST knows and the event list does not.",
                    "sourceId": "nest-spike-recorder"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, recorder id/status/backend, complete recorded sender universe, origin/start/stop and biological export time, rank/world scope, and detached event-buffer digest. Event rows cannot authenticate silent senders, exposure or completeness.",
                    "sourceId": "host-nest-recorder-export-declaration"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-spiketrain",
            "sources": [
                {
                    "system": "neo.SpikeTrain",
                    "role": "primary",
                    "notes": "t_start/t_stop map to the window; the unit is taken from the quantity, never guessed.",
                    "sourceId": "neo-spiketrain"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-units-spike-times",
            "sources": [
                {
                    "system": "nwb.Units.spike_times",
                    "role": "primary",
                    "notes": "The caller must select the unit rows explicitly.",
                    "sourceId": "nwb-units-spike-times"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "neuro.psth": [
        {
            "mappingId": "nest-spike-recorder",
            "sources": [
                {
                    "system": "nest.spike_recorder",
                    "role": "primary",
                    "notes": "Supplies only event times and sender ids. NEST has no trial or alignment-event abstraction, so the recorder cannot establish trial identity, coverage, exclusions or exposure. The adapter blocks with ADAPTER_MAPPING_REQUIRED rather than treating each simulation as one implicit trial.",
                    "sourceId": "nest-spike-recorder"
                },
                {
                    "system": "host-retained NEST trial and alignment protocol",
                    "role": "required_companion",
                    "notes": "Supplies the complete trial universe, one explicit alignment coordinate per trial, selected-sender universe, relative measurement window, per-trial coverage and every exclusion. Events mode is allowed only when this record establishes full coverage of every declared trial; partial coverage or exclusions require caller-derived prebinned counts and exact denominators. The protocol is external authority and is never reconstructed from recorder boundaries.",
                    "sourceId": "host-nest-trial-alignment-protocol"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, every recorder id/status/backend, selected sender universe, origin/start/stop, biological export time, rank/world scope, and detached event-buffer digest. It must bind each export exactly once to the separately declared trial protocol.",
                    "sourceId": "host-nest-recorder-export-declaration"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-segment",
            "sources": [
                {
                    "system": "neo.Segment",
                    "role": "primary",
                    "notes": "One Segment may map to one events-mode trial only when every selected Segment covers the complete relative window. The alignment time must be an explicitly selected Event: a Segment's t_start is a recording boundary, not a stimulus onset, and is never used as an alignment reference by default. Unequal coverage requires prebinned mode.",
                    "sourceId": "neo-segment"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-timeintervals",
            "sources": [
                {
                    "system": "nwb.TimeIntervals",
                    "role": "primary",
                    "notes": "The alignment column must be named explicitly; start_time is not assumed to be the aligning event. Events mode supports only a selected set of full-window trials. Exclusions or unequal trial coverage must be transformed to prebinned exact counts plus covering-trial denominators before authoring this request.",
                    "sourceId": "nwb-timeintervals"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-units-spike-times",
            "sources": [
                {
                    "system": "nwb.Units.spike_times",
                    "role": "primary",
                    "notes": "The caller must select the unit rows explicitly; the selected-sender universe is the selection, not every unit in the file.",
                    "sourceId": "nwb-units-spike-times"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "neuro.response_curve": [
        {
            "mappingId": "nest-spike-recorder",
            "sources": [
                {
                    "system": "nest.spike_recorder",
                    "role": "primary",
                    "notes": "The recorder yields the events of one repeat, so it can produce only that repeat's response evidence. It cannot produce the controlled input, condition/repeat universe, attempted counts, comparable-run design, measurement window or retained event selection. The adapter never reads any of those facts back out of a device name.",
                    "sourceId": "nest-spike-recorder"
                },
                {
                    "system": "host-retained NEST sweep protocol",
                    "role": "required_companion",
                    "notes": "Supplies the complete ordered condition universe, typed controlled inputs, repeat identities and attempted counts, repeat design, measurement window, event selection and the binding from each recorder export to exactly one condition/repeat. It must be retained from the executed sweep; neither Cortexel nor a spike recorder can reconstruct it after the fact. This source remains caller-controlled external authority until a future normative mapping definition authenticates a concrete protocol format.",
                    "sourceId": "host-nest-sweep-protocol"
                },
                {
                    "system": "host-retained NEST recorder export declaration",
                    "role": "required_companion",
                    "notes": "Candidate digest-bound declaration for the producing runtime/build and run, every recorder id/status/backend, selected sender universe, origin/start/stop, biological export time, rank/world scope, and detached event-buffer digest. It must bind each export exactly once to the separately declared sweep condition and repeat.",
                    "sourceId": "host-nest-recorder-export-declaration"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "neo-block",
            "sources": [
                {
                    "system": "neo.Block",
                    "role": "primary",
                    "notes": "Condition and repeat identity must be selected explicitly from annotations. The adapter will not guess which annotation is the stimulus level, and it never coerces an annotation label into a numeric input.",
                    "sourceId": "neo-block"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-icephys",
            "sources": [
                {
                    "system": "nwb.icephys",
                    "role": "primary",
                    "notes": "The icephys stimulus/response tables map naturally onto conditions and repeats, but the mapping is not implemented and is therefore not claimed.",
                    "sourceId": "nwb-icephys"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ],
    "neuro.spike_raster": [
        {
            "mappingId": "nest-spike-recorder",
            "sources": [
                {
                    "system": "nest.spike_recorder",
                    "role": "primary",
                    "notes": "Adapter revision 3 supports only an exact NEST 3.10.0 memory-recorder status profile when `time_in_steps` is explicitly false, the named plain-data projection preserves NumPy event-array values and order, origin/start/stop carry exact on-grid integer-tic preimages, and a closed `kind: caller_declaration` record binds the single-process runtime, successful-return closed-stop endpoint, monotonic kernel clock epoch, most recent buffer epoch, most recent recording-plan mutation, and exact sender universe. It preserves nonchronological order, duplicates, origin, and the native (origin+start,origin+stop] boundary. It does not introspect PyNEST or authenticate any declared capture fact. NEST 3.9, other 3.10 patches, step/offset, ASCII, MPI, and SIONlib inputs fail closed until separately pinned and evidenced.",
                    "sourceId": "nest-spike-recorder"
                },
                {
                    "system": "host-declared NEST runtime profile",
                    "role": "required_companion",
                    "notes": "The packaged adapter requires literal `nestVersion: 3.10.0`, but this value is caller-declared rather than read from or attested by a live simulator. R049 must execute the adapter against a pinned real runtime before release certification; local structural acceptance alone is not runtime provenance.",
                    "sourceId": "host-nest-runtime-declaration"
                },
                {
                    "system": "host-declared NEST recorder export context",
                    "role": "required_companion",
                    "notes": "The host supplies the complete recorded sender universe, capture history and process scope, and may supply run/recorder ids. The source digest binds the detached plain-data status projection; a separate domain-separated adapter-input digest binds that projection to every normalized option. Neither digest authenticates the projection, recorder wiring, silent-sender completeness, clock or buffer resets, configuration history, run identity, process scope or export custody. Those remain attributable caller declarations until an isolated live-capture receipt exists.",
                    "sourceId": "host-nest-recorder-export-declaration"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "packaged",
            "certificationRequirement": {
                "ledger": "cortexel-release-evidence-ledger.v1",
                "gate": {
                    "id": "R049",
                    "section": "Adapters and ecosystem",
                    "requirement": "NEST recorder adapters are tested against real supported NEST output and do not assume chronological events.",
                    "releaseBlocking": True
                },
                "conformanceProfile": {
                    "registry": "cortexel-adapter-conformance-profiles.v1",
                    "id": "nest-spike-recorder.v3",
                    "digestAlgorithm": "cortexel_adapter_conformance_profile_rfc8785_sha256_v1",
                    "digest": "sha256:9bf23e63c51b23239cf0438fa770323b65d58cd29ff7d25ed5c7626a9e1f2be4"
                }
            },
            "notes": "Executable code exists for this bounded profile, but Cortexel does not yet publish a separate closed machine-readable source-to-request mapping definition. The implementation inventory, request schema, source identity, and R049 requirement establish different boundaries and must not be relabelled as an independent normative mapping specification."
        },
        {
            "mappingId": "neo-spiketrain",
            "sources": [
                {
                    "system": "neo.SpikeTrain",
                    "role": "primary",
                    "notes": "One SpikeTrain per sender; t_start/t_stop map to the window and the unit is taken from the quantity, never guessed. Neo has no concept of `recorded but silent`, so the caller must supply the full sender selection explicitly — a list of SpikeTrains alone cannot produce the empty rows.",
                    "sourceId": "neo-spiketrain"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "nwb-units-spike-times",
            "sources": [
                {
                    "system": "nwb.Units.spike_times",
                    "role": "primary",
                    "notes": "The ragged spike_times/spike_times_index pair maps to the parallel arrays, but the caller must select the unit rows explicitly. The selected rows become recordedSenderIds and senderUniverseComplete is false unless the caller selected every unit.",
                    "sourceId": "nwb-units-spike-times"
                }
            ],
            "feasibilityStatus": "assessed_feasible",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        },
        {
            "mappingId": "ncp",
            "sources": [
                {
                    "system": "ncp",
                    "role": "primary",
                    "notes": "Not certified for 1.0. Until a mapping for the recorded-sender universe exists, an NCP payload cannot produce the empty rows and would silently become a raster of only the neurons that fired.",
                    "sourceId": "ncp"
                }
            ],
            "feasibilityStatus": "not_assessed",
            "definitionStatus": "not_specified",
            "authorityRequirements": None,
            "implementationAvailability": "not_implemented"
        }
    ]
})

CAPABILITY_AVAILABILITY: Final[Mapping[str, str]] = _freeze({
    "neuro.analog_trace": "packaged",
    "neuro.spike_raster": "packaged",
    "neuro.population_rate": "packaged",
    "neuro.response_curve": "packaged",
    "neuro.isi_distribution": "packaged",
    "neuro.psth": "packaged",
    "neuro.correlogram": "packaged",
    "neuro.phase_plane": "packaged",
    "neuro.multisignal_trace": "packaged",
    "neuro.compartment_trace": "packaged",
    "network.connection_graph": "packaged",
    "network.adjacency_matrix": "packaged",
    "network.weight_matrix": "packaged",
    "network.delay_matrix": "packaged",
    "network.degree_distribution": "packaged",
    "network.delay_distribution": "packaged",
    "network.weight_distribution": "packaged",
    "network.spatial_map_2d": "packaged",
    "network.synaptic_weight_trace": "packaged",
    "nest.connectivity_matrix": "unavailable",
    "nest.spatial_2d": "unavailable",
    "nest.stimulus_response": "unavailable",
    "nest.animation_replay": "unavailable",
    "cortexel": "packaged",
    "cortexel/core": "packaged",
    "cortexel/figure": "packaged",
    "cortexel/authoring": "packaged",
    "cortexel/render-svg": "packaged",
    "cortexel/react": "packaged",
    "cortexel/react/charts": "packaged",
    "cortexel/react/knowledge-graph": "packaged",
    "cortexel/skills.manifest.json": "packaged",
    "cortexel/adapters/nest": "packaged",
    "cortexel/contract": "packaged",
    "cortexel/package.json": "packaged",
    "cli.identity": "packaged",
    "cli.catalog": "packaged",
    "cli.describe": "packaged",
    "cli.validate": "packaged",
    "cli.render": "packaged",
    "cli.inspect": "packaged",
    "cli.migrate": "packaged"
})

CAPABILITY_AVAILABILITIES: Final[tuple[str, ...]] = _freeze([
    "packaged",
    "source_only",
    "unavailable"
])

ERROR_CODES: Final[tuple[str, ...]] = _freeze([
    "ADAPTER_ACCESSOR_INPUT_REJECTED",
    "ADAPTER_MAPPING_REQUIRED",
    "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
    "ADAPTER_NEST_UNSUPPORTED_SHAPE",
    "ADAPTER_UNSUPPORTED_VERSION",
    "CAPABILITY_EXPERIMENTAL",
    "CAPABILITY_REMOVED",
    "CONTRACT_DIGEST_MISMATCH",
    "CONTRACT_MISSING",
    "CONTRACT_SKILL_REVISION_UNSUPPORTED",
    "CONTRACT_UNSUPPORTED_VERSION",
    "DATA_BYTE_LENGTH_MISMATCH",
    "DATA_DIGEST_MISMATCH",
    "DATA_MEDIA_TYPE_UNSUPPORTED",
    "DATA_REFERENCE_UNRESOLVED",
    "ERROR_LIMIT_REACHED",
    "INTERNAL_INVARIANT_VIOLATED",
    "JSON_ARRAY_TOO_LONG",
    "JSON_BOM_NOT_ALLOWED",
    "JSON_BYTES_EXCEEDED",
    "JSON_COMMENT_NOT_ALLOWED",
    "JSON_DANGEROUS_KEY",
    "JSON_DEPTH_EXCEEDED",
    "JSON_DUPLICATE_KEY",
    "JSON_EMPTY_INPUT",
    "JSON_INTEGER_OUT_OF_RANGE",
    "JSON_INVALID_NUMBER",
    "JSON_INVALID_UNICODE",
    "JSON_NON_FINITE_NUMBER",
    "JSON_NUMBER_TOKEN_TOO_LONG",
    "JSON_STRING_TOO_LONG",
    "JSON_SYNTAX",
    "JSON_TOKENS_EXCEEDED",
    "JSON_TOO_MANY_KEYS",
    "JSON_TRAILING_COMMA_NOT_ALLOWED",
    "JSON_TRAILING_DATA",
    "MIGRATION_AMBIGUOUS",
    "MIGRATION_AMBIGUOUS_CONNECTIVITY_MATRIX",
    "MIGRATION_INFORMATION_MISSING",
    "MIGRATION_LEGACY_ID_NOT_ACCEPTED",
    "MIGRATION_NO_STABLE_REPLACEMENT",
    "MIGRATION_UNKNOWN_LEGACY_ID",
    "PROVENANCE_ATTESTATION_UNVERIFIED",
    "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN",
    "PROVENANCE_NOTE_TOO_LONG",
    "PROVENANCE_NOTE_UNSAFE_DISPLAY",
    "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
    "PROVENANCE_SOURCE_REQUIRED",
    "RENDER_DEGENERATE_DOMAIN",
    "RENDER_DIVERGING_SCALE_NO_CENTER",
    "RENDER_LAYOUT_UNAVAILABLE",
    "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
    "RENDER_NO_DATA",
    "RENDER_SERIES_LIMIT_EXCEEDED",
    "RENDER_THEME_NONCONFORMING",
    "RENDER_UNSUPPORTED_SKILL",
    "RENDER_UNVALIDATED_REQUEST",
    "RESOURCE_BUDGET_EXCEEDED",
    "RESOURCE_BUDGET_PROFILE_UNKNOWN",
    "RESOURCE_COMPACTION_UNAVAILABLE",
    "RESOURCE_MARKS_EXCEEDED",
    "RESOURCE_MATRIX_CELLS_EXCEEDED",
    "RESOURCE_OBSERVATIONS_EXCEEDED",
    "RESOURCE_OUTPUT_BYTES_EXCEEDED",
    "RESOURCE_PAIRWISE_EXCEEDED",
    "RESOURCE_SIDECAR_BYTES_EXCEEDED",
    "SCHEMA_ENUM_MISMATCH",
    "SCHEMA_REQUIRED_PROPERTY_MISSING",
    "SCHEMA_TYPE_MISMATCH",
    "SCHEMA_UNKNOWN_PROPERTY",
    "SCHEMA_UNKNOWN_SKILL",
    "SCHEMA_VALIDATION_FAILED",
    "SCIENCE_AGGREGATION_REQUIRED",
    "SCIENCE_BIN_EDGES_INVALID",
    "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
    "SCIENCE_COUNT_ESTIMATOR_INCOHERENT",
    "SCIENCE_COUNT_NOT_INTEGER",
    "SCIENCE_DELAY_NONPOSITIVE",
    "SCIENCE_DENOMINATOR_INVALID",
    "SCIENCE_DENSITY_DOES_NOT_INTEGRATE",
    "SCIENCE_DUPLICATE_TIME_POLICY",
    "SCIENCE_EVENT_OUT_OF_WINDOW",
    "SCIENCE_EVENT_SCOPE_UNVERIFIABLE",
    "SCIENCE_LAG_RANGE_INVALID",
    "SCIENCE_LATENCY_OUTSIDE_WINDOW",
    "SCIENCE_NEGATIVE_INTERVAL",
    "SCIENCE_NORMALIZATION_UNVERIFIABLE",
    "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
    "SCIENCE_PAIRED_REPEATS_INCOMPLETE",
    "SCIENCE_POPULATION_UNIVERSE_REQUIRED",
    "SCIENCE_RESPONSE_INPUT_DUPLICATE",
    "SCIENCE_RESPONSE_METHOD_MISMATCH",
    "SCIENCE_RESPONSE_VALUE_INVALID",
    "SCIENCE_TRIAL_UNIVERSE_REQUIRED",
    "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
    "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
    "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA",
    "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
    "SCIENCE_UNIT_ALIAS_NOT_CANONICAL",
    "SCIENCE_UNIT_DIMENSION_MISMATCH",
    "SCIENCE_UNIT_NOT_CONVERTIBLE",
    "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
    "SCIENCE_WINDOW_INVALID",
    "SCIENCE_ZERO_INTERVAL_POLICY",
    "SCOPE_INCOMPATIBLE_WITH_SKILL",
    "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL",
    "SCOPE_MERGE_CONFLICT",
    "SCOPE_MERGE_INCOMPLETE",
    "SCOPE_NODE_UNIVERSE_REQUIRED",
    "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL",
    "SCOPE_POSITION_COVERAGE_INCOMPLETE",
    "SCOPE_REQUIRED",
    "SEMANTIC_DUPLICATE_ID",
    "SEMANTIC_EMPTY_SELECTION",
    "SEMANTIC_LENGTH_MISMATCH",
    "SEMANTIC_UNKNOWN_REFERENCE",
    "SEMANTIC_VALIDATOR_UNAVAILABLE",
    "SNAPSHOT_ACCESSOR_PROPERTY",
    "SNAPSHOT_CIRCULAR_REFERENCE",
    "SNAPSHOT_DANGEROUS_KEY",
    "SNAPSHOT_DECORATED_ARRAY",
    "SNAPSHOT_DEPTH_EXCEEDED",
    "SNAPSHOT_HOSTILE_REFLECTION",
    "SNAPSHOT_INTEGER_OUT_OF_RANGE",
    "SNAPSHOT_MALFORMED_STRING",
    "SNAPSHOT_NODES_EXCEEDED",
    "SNAPSHOT_NON_FINITE_NUMBER",
    "SNAPSHOT_NON_PLAIN_OBJECT",
    "SNAPSHOT_SPARSE_ARRAY",
    "SNAPSHOT_STRING_TOO_LONG",
    "SNAPSHOT_SYMBOL_KEY",
    "SNAPSHOT_UNSUPPORTED_TYPE"
])

ERROR_STAGES: Final[tuple[str, ...]] = _freeze([
    "parse",
    "snapshot",
    "identity",
    "structural",
    "semantic",
    "science",
    "scope",
    "provenance",
    "budget",
    "derivation",
    "render",
    "serialize",
    "migrate",
    "adapter",
    "internal"
])

UNITS: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
    "1": {
        "dimension": "dimensionless",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "",
        "aliases": [
            "",
            "unitless",
            "dimensionless",
            "count",
            "none"
        ]
    },
    "s": {
        "dimension": "time",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "s",
        "aliases": [
            "sec",
            "seconds",
            "second"
        ]
    },
    "ms": {
        "dimension": "time",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "ms",
        "aliases": [
            "msec",
            "milliseconds",
            "millisecond"
        ]
    },
    "us": {
        "dimension": "time",
        "to_canonical": 0.000001,
        "to_canonical_decimal_exponent": -6,
        "label": "µs",
        "aliases": [
            "µs",
            "usec",
            "microseconds",
            "microsecond"
        ]
    },
    "Hz": {
        "dimension": "frequency",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "Hz",
        "aliases": [
            "hz",
            "hertz",
            "spikes/s",
            "sp/s"
        ]
    },
    "kHz": {
        "dimension": "frequency",
        "to_canonical": 1000,
        "to_canonical_decimal_exponent": 3,
        "label": "kHz",
        "aliases": [
            "khz"
        ]
    },
    "V": {
        "dimension": "voltage",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "V",
        "aliases": [
            "volt",
            "volts"
        ]
    },
    "mV": {
        "dimension": "voltage",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "mV",
        "aliases": [
            "millivolt",
            "millivolts"
        ]
    },
    "uV": {
        "dimension": "voltage",
        "to_canonical": 0.000001,
        "to_canonical_decimal_exponent": -6,
        "label": "µV",
        "aliases": [
            "µV",
            "microvolt",
            "microvolts"
        ]
    },
    "A": {
        "dimension": "current",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "A",
        "aliases": [
            "amp",
            "amps",
            "ampere"
        ]
    },
    "nA": {
        "dimension": "current",
        "to_canonical": 1e-9,
        "to_canonical_decimal_exponent": -9,
        "label": "nA",
        "aliases": [
            "nanoamp",
            "nanoampere"
        ]
    },
    "pA": {
        "dimension": "current",
        "to_canonical": 1e-12,
        "to_canonical_decimal_exponent": -12,
        "label": "pA",
        "aliases": [
            "picoamp",
            "picoampere"
        ]
    },
    "S": {
        "dimension": "conductance",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "S",
        "aliases": [
            "siemens"
        ]
    },
    "nS": {
        "dimension": "conductance",
        "to_canonical": 1e-9,
        "to_canonical_decimal_exponent": -9,
        "label": "nS",
        "aliases": [
            "nanosiemens"
        ]
    },
    "pS": {
        "dimension": "conductance",
        "to_canonical": 1e-12,
        "to_canonical_decimal_exponent": -12,
        "label": "pS",
        "aliases": [
            "picosiemens"
        ]
    },
    "mol/L": {
        "dimension": "concentration",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "M",
        "aliases": [
            "M",
            "molar"
        ]
    },
    "mmol/L": {
        "dimension": "concentration",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "mM",
        "aliases": [
            "mM",
            "millimolar"
        ]
    },
    "umol/L": {
        "dimension": "concentration",
        "to_canonical": 0.000001,
        "to_canonical_decimal_exponent": -6,
        "label": "µM",
        "aliases": [
            "µM",
            "uM",
            "micromolar"
        ]
    },
    "nmol/L": {
        "dimension": "concentration",
        "to_canonical": 1e-9,
        "to_canonical_decimal_exponent": -9,
        "label": "nM",
        "aliases": [
            "nM",
            "nanomolar"
        ]
    },
    "m": {
        "dimension": "length",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "m",
        "aliases": [
            "metre",
            "meter",
            "metres",
            "meters"
        ]
    },
    "mm": {
        "dimension": "length",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "mm",
        "aliases": [
            "millimetre",
            "millimeter"
        ]
    },
    "um": {
        "dimension": "length",
        "to_canonical": 0.000001,
        "to_canonical_decimal_exponent": -6,
        "label": "µm",
        "aliases": [
            "µm",
            "micrometre",
            "micrometer",
            "micron"
        ]
    },
    "rad": {
        "dimension": "angle",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "rad",
        "aliases": [
            "radian",
            "radians"
        ]
    },
    "deg": {
        "dimension": "angle",
        "to_canonical": 0.017453292519943295,
        "to_canonical_decimal_exponent": None,
        "label": "°",
        "aliases": [
            "degree",
            "degrees",
            "°"
        ]
    },
    "/s": {
        "dimension": "per_time",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "s⁻¹",
        "aliases": [
            "1/s",
            "s^-1"
        ]
    },
    "/ms": {
        "dimension": "per_time",
        "to_canonical": 1000,
        "to_canonical_decimal_exponent": 3,
        "label": "ms⁻¹",
        "aliases": [
            "1/ms",
            "ms^-1"
        ]
    },
    "/V": {
        "dimension": "per_voltage",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "V⁻¹",
        "aliases": [
            "1/V"
        ]
    },
    "/mV": {
        "dimension": "per_voltage",
        "to_canonical": 1000,
        "to_canonical_decimal_exponent": 3,
        "label": "mV⁻¹",
        "aliases": [
            "1/mV"
        ]
    },
    "/A": {
        "dimension": "per_current",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "A⁻¹",
        "aliases": [
            "1/A"
        ]
    },
    "/nA": {
        "dimension": "per_current",
        "to_canonical": 1000000000,
        "to_canonical_decimal_exponent": 9,
        "label": "nA⁻¹",
        "aliases": [
            "1/nA"
        ]
    },
    "/pA": {
        "dimension": "per_current",
        "to_canonical": 1000000000000,
        "to_canonical_decimal_exponent": 12,
        "label": "pA⁻¹",
        "aliases": [
            "1/pA"
        ]
    },
    "/S": {
        "dimension": "per_conductance",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "S⁻¹",
        "aliases": [
            "1/S"
        ]
    },
    "/nS": {
        "dimension": "per_conductance",
        "to_canonical": 1000000000,
        "to_canonical_decimal_exponent": 9,
        "label": "nS⁻¹",
        "aliases": [
            "1/nS"
        ]
    },
    "/m": {
        "dimension": "per_length",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "m⁻¹",
        "aliases": [
            "1/m"
        ]
    },
    "/mm": {
        "dimension": "per_length",
        "to_canonical": 1000,
        "to_canonical_decimal_exponent": 3,
        "label": "mm⁻¹",
        "aliases": [
            "1/mm"
        ]
    },
    "/um": {
        "dimension": "per_length",
        "to_canonical": 1000000,
        "to_canonical_decimal_exponent": 6,
        "label": "µm⁻¹",
        "aliases": [
            "1/um"
        ]
    },
    "/1": {
        "dimension": "per_dimensionless",
        "to_canonical": 1,
        "to_canonical_decimal_exponent": 0,
        "label": "",
        "aliases": [
            "1/1"
        ]
    },
    "nest:weight": {
        "dimension": "simulator_defined",
        "to_canonical": None,
        "to_canonical_decimal_exponent": None,
        "label": "weight (NEST)",
        "aliases": []
    },
    "nest:delay": {
        "dimension": "time",
        "to_canonical": 0.001,
        "to_canonical_decimal_exponent": -3,
        "label": "ms",
        "aliases": []
    }
})

UNIT_ALIASES: Final[Mapping[str, str]] = _freeze({
    "sec": "s",
    "seconds": "s",
    "second": "s",
    "msec": "ms",
    "milliseconds": "ms",
    "millisecond": "ms",
    "µs": "us",
    "usec": "us",
    "microseconds": "us",
    "microsecond": "us",
    "hz": "Hz",
    "hertz": "Hz",
    "spikes/s": "Hz",
    "sp/s": "Hz",
    "khz": "kHz",
    "volt": "V",
    "volts": "V",
    "millivolt": "mV",
    "millivolts": "mV",
    "µV": "uV",
    "microvolt": "uV",
    "microvolts": "uV",
    "amp": "A",
    "amps": "A",
    "ampere": "A",
    "nanoamp": "nA",
    "nanoampere": "nA",
    "picoamp": "pA",
    "picoampere": "pA",
    "siemens": "S",
    "nanosiemens": "nS",
    "picosiemens": "pS",
    "M": "mol/L",
    "molar": "mol/L",
    "mM": "mmol/L",
    "millimolar": "mmol/L",
    "µM": "umol/L",
    "uM": "umol/L",
    "micromolar": "umol/L",
    "nM": "nmol/L",
    "nanomolar": "nmol/L",
    "metre": "m",
    "meter": "m",
    "metres": "m",
    "meters": "m",
    "millimetre": "mm",
    "millimeter": "mm",
    "µm": "um",
    "micrometre": "um",
    "micrometer": "um",
    "micron": "um",
    "radian": "rad",
    "radians": "rad",
    "degree": "deg",
    "degrees": "deg",
    "°": "deg",
    "unitless": "1",
    "dimensionless": "1",
    "count": "1",
    "none": "1",
    "1/s": "/s",
    "s^-1": "/s",
    "1/ms": "/ms",
    "ms^-1": "/ms",
    "1/V": "/V",
    "1/mV": "/mV",
    "1/A": "/A",
    "1/nA": "/nA",
    "1/pA": "/pA",
    "1/S": "/S",
    "1/nS": "/nS",
    "1/m": "/m",
    "1/mm": "/mm",
    "1/um": "/um",
    "1/1": "/1"
})

QUANTITY_KIND_DIMENSIONS: Final[Mapping[str, tuple[str, ...]]] = _freeze({
    "time": [
        "time"
    ],
    "duration": [
        "time"
    ],
    "interspike_interval": [
        "time"
    ],
    "delay": [
        "time"
    ],
    "frequency": [
        "frequency"
    ],
    "firing_rate": [
        "frequency"
    ],
    "membrane_voltage": [
        "voltage"
    ],
    "voltage": [
        "voltage"
    ],
    "current": [
        "current"
    ],
    "conductance": [
        "conductance"
    ],
    "concentration": [
        "concentration"
    ],
    "position": [
        "length"
    ],
    "length": [
        "length"
    ],
    "angle": [
        "angle"
    ],
    "count": [
        "dimensionless"
    ],
    "degree": [
        "dimensionless"
    ],
    "probability": [
        "dimensionless"
    ],
    "probability_density": [
        "per_time",
        "per_voltage",
        "per_current",
        "per_conductance",
        "per_length",
        "per_dimensionless"
    ],
    "correlation": [
        "dimensionless"
    ],
    "ratio": [
        "dimensionless"
    ],
    "synaptic_weight": [
        "simulator_defined",
        "conductance",
        "current",
        "voltage",
        "dimensionless"
    ],
    "state_variable": [
        "voltage",
        "current",
        "conductance",
        "concentration",
        "dimensionless"
    ],
    "derivative": [
        "per_time"
    ]
})

NUMERIC_ALGORITHMS: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
    "cortexel_binary64_nominal_interval_candidates_v1": {
        "id": "cortexel_binary64_nominal_interval_candidates_v1",
        "revision": 1,
        "semantics": {
            "id": "cortexel_binary64_nominal_interval_candidates_semantics_v1",
            "version": "1.0",
            "status": "normative",
            "parameters": {
                "numberFormat": "ieee754_binary64",
                "binary64Epsilon": 2.220446049250313e-16,
                "arithmeticRoundingMode": "roundTiesToEven",
                "coefficientEncoding": "signed_integer_times_two_to_binary_exponent",
                "coefficientBinaryExponent": -1074,
                "negativeZeroPolicy": "canonical_positive_zero",
                "rangeRule": "width_positive_and_stop_strictly_greater_than_start",
                "quotientRule": "round_exact_span_over_width_once_to_binary64",
                "intervalCountRule": "nearest_integer_ties_toward_positive_infinity",
                "quotientToleranceEpsilonMultiplier": 8,
                "quotientToleranceScale": "max_one_abs_rounded_quotient",
                "quotientToleranceArithmetic": "binary64_left_to_right",
                "maximumMaterializedIntervals": 100000,
                "maximumSafeInteger": 9007199254740991,
                "internalEdgeRule": "round_exact_start_plus_index_times_width_once_to_binary64",
                "internalEdgeOrder": "strictly_increasing_and_strictly_below_submitted_stop",
                "nonzeroInternalEdgeUnderflowPolicy": "refuse_unrepresentable",
                "reconstructedStopRule": "round_exact_start_plus_count_times_width_once_to_binary64",
                "endpointToleranceEpsilonMultiplier": 8,
                "endpointToleranceScale": "max_one_abs_start_abs_stop_abs_reconstructed_stop",
                "endpointToleranceArithmetic": "binary64_left_to_right",
                "finalEdgeAuthority": "submitted_stop",
                "exposureClaim": "endpoint_pairs_authoritative_no_uniform_exposure",
                "nonfiniteInputFailureClass": "nonfinite",
                "invalidRangeFailureClass": "invalid_range",
                "tilingMismatchFailureClass": "non_tiling",
                "budgetOrQuotientOverflowFailureClass": "too_many",
                "edgeRepresentationFailureClass": "unrepresentable"
            }
        },
        "purpose": "Materialize deterministic endpoint-authoritative interval candidates from a nominal binary64 width while accepting bounded decimal-intent tilings such as 0.3 by 0.1, refusing genuine nominal remainder intervals, and detecting every binary64 edge collapse. The emitted endpoint pairs are authoritative and are not claimed to have exact physical exposure equal to the nominal width; a consuming policy must add that stronger check before dividing an event count by the typed width.",
        "inputs": {
            "start": "finite binary64",
            "stop": "finite binary64 strictly greater than start",
            "width": "finite positive binary64 already converted into the start/stop unit with one exact-rational-to-binary64 roundTiesToEven conversion"
        },
        "constants": {
            "binary64MinSubnormalExponent": -1074,
            "binary64Epsilon": 2.220446049250313e-16,
            "quotientToleranceEpsilonMultiplier": 8,
            "endpointToleranceEpsilonMultiplier": 8,
            "maximumMaterializedIntervals": 100000,
            "maximumSafeInteger": 9007199254740991,
            "roundingMode": "roundTiesToEven"
        },
        "algorithm": [
            "Reject with failureClass nonfinite unless start, stop, and width are finite binary64 numbers. Otherwise reject with failureClass invalid_range unless width > 0 and stop > start.",
            "Decode each submitted binary64 exactly as a signed integer multiple of 2^-1074: start = S*2^-1074, stop = E*2^-1074, width = W*2^-1074. Negative zero decodes as zero and is emitted as canonical positive zero in any returned edge. Compute the exact integers span = E-S and W; W must be positive.",
            "Correctly round the exact positive rational span/W once to binary64 using roundTiesToEven, obtaining q. If that conversion overflows finite binary64, reject with failureClass too_many because every such positive quotient exceeds maximumMaterializedIntervals. If it underflows to q = 0, reject with failureClass non_tiling. Otherwise set n to the mathematically nearest integer to the binary64 value q, with an exact half tie toward +infinity; equivalently n = floor(q + 0.5) where the addition and floor express the real-number rule rather than a separately rounded binary64 addition.",
            "Compute quotientTolerance = 8 * binary64Epsilon * max(1, abs(q)) with binary64 multiplication in the written left-to-right order. Reject with failureClass non_tiling when the binary64 value abs(q-n) is greater than quotientTolerance.",
            "Reject with failureClass non_tiling when n < 1. Reject with failureClass too_many unless n is an exact safe integer no greater than maximumMaterializedIntervals (100000).",
            "For every integer i from 1 through n-1, form the exact integer Ui = S + i*W and correctly round Ui*2^-1074 once to binary64 using roundTiesToEven, obtaining edge_i. Reject with failureClass unrepresentable on overflow, when Ui is nonzero but edge_i is zero, or unless edge_i is strictly greater than the preceding emitted edge and strictly less than stop. Every internal edge is checked; checking only the origin is nonconforming.",
            "Form the exact integer R = S + n*W and correctly round R*2^-1074 once to binary64 using roundTiesToEven, obtaining reconstructedStop. Reject with failureClass unrepresentable on overflow or when reconstructedStop is not finite.",
            "Compute endpointTolerance = 8 * binary64Epsilon * max(1, abs(start), abs(stop), abs(reconstructedStop)) with binary64 multiplication in the written left-to-right order. Reject with failureClass non_tiling when the binary64 value abs(reconstructedStop-stop) is greater than endpointTolerance.",
            "Accept with intervalCount n and edges [start, edge_1, ..., edge_(n-1), stop]. The submitted stop, not reconstructedStop, is the final emitted edge. This establishes only a bounded nominal tiling: adjacent endpoint differences are authoritative and may differ from width and from one another. A consumer MUST NOT call these intervals equal-width or divide counts by width unless a separate policy verifies every exact physical endpoint difference against the original typed width."
        ],
        "failureClasses": [
            "nonfinite",
            "invalid_range",
            "non_tiling",
            "too_many",
            "unrepresentable"
        ],
        "conformanceVectors": [
            {
                "name": "exact_quarters",
                "input": {
                    "start": 0,
                    "stop": 1,
                    "width": 0.25
                },
                "result": {
                    "accepted": True,
                    "intervalCount": 4,
                    "edges": [
                        0,
                        0.25,
                        0.5,
                        0.75,
                        1
                    ]
                }
            },
            {
                "name": "decimal_intent_three_tenths",
                "input": {
                    "start": 0,
                    "stop": 0.3,
                    "width": 0.1
                },
                "result": {
                    "accepted": True,
                    "intervalCount": 3,
                    "edges": [
                        0,
                        0.1,
                        0.2,
                        0.3
                    ]
                }
            },
            {
                "name": "exact_index_times_width_not_repeated_addition",
                "input": {
                    "start": 0,
                    "stop": 1,
                    "width": 0.1
                },
                "result": {
                    "accepted": True,
                    "intervalCount": 10,
                    "edgeAssertions": [
                        {
                            "index": 0,
                            "value": 0
                        },
                        {
                            "index": 6,
                            "value": 0.6000000000000001
                        },
                        {
                            "index": 8,
                            "value": 0.8
                        },
                        {
                            "index": 10,
                            "value": 1
                        }
                    ]
                }
            },
            {
                "name": "minimum_subnormal_interval",
                "input": {
                    "start": 0,
                    "stop": 5e-324,
                    "width": 5e-324
                },
                "result": {
                    "accepted": True,
                    "intervalCount": 1,
                    "edges": [
                        0,
                        5e-324
                    ]
                }
            },
            {
                "name": "quotient_tolerance_eight_epsilon_boundary",
                "input": {
                    "start": 0,
                    "stop": 1.0000000000000018,
                    "width": 1
                },
                "result": {
                    "accepted": True,
                    "intervalCount": 1,
                    "edges": [
                        0,
                        1.0000000000000018
                    ]
                }
            },
            {
                "name": "quotient_tolerance_nine_epsilon_rejected",
                "input": {
                    "start": 0,
                    "stop": 1.000000000000002,
                    "width": 1
                },
                "result": {
                    "accepted": False,
                    "failureClass": "non_tiling"
                }
            },
            {
                "name": "endpoint_tolerance_eight_epsilon_boundary",
                "input": {
                    "start": -100,
                    "stop": 32.000000000000156,
                    "width": 2
                },
                "result": {
                    "accepted": True,
                    "intervalCount": 66,
                    "edgeAssertions": [
                        {
                            "index": 0,
                            "value": -100
                        },
                        {
                            "index": 1,
                            "value": -98
                        },
                        {
                            "index": 65,
                            "value": 30
                        },
                        {
                            "index": 66,
                            "value": 32.000000000000156
                        }
                    ]
                }
            },
            {
                "name": "endpoint_tolerance_just_outside_rejected",
                "input": {
                    "start": -100,
                    "stop": 32.000000000000185,
                    "width": 2
                },
                "result": {
                    "accepted": False,
                    "failureClass": "non_tiling"
                }
            },
            {
                "name": "genuine_remainder",
                "input": {
                    "start": 0,
                    "stop": 10,
                    "width": 6
                },
                "result": {
                    "accepted": False,
                    "failureClass": "non_tiling"
                }
            },
            {
                "name": "invalid_zero_width",
                "input": {
                    "start": 0,
                    "stop": 1,
                    "width": 0
                },
                "result": {
                    "accepted": False,
                    "failureClass": "invalid_range"
                }
            },
            {
                "name": "quotient_underflow_is_non_tiling",
                "input": {
                    "start": 0,
                    "stop": 5e-324,
                    "width": 1.7976931348623157e+308
                },
                "result": {
                    "accepted": False,
                    "failureClass": "non_tiling"
                }
            },
            {
                "name": "internal_edge_collapse_at_large_origin",
                "input": {
                    "start": 10000000000000000,
                    "stop": 10000000000000004,
                    "width": 1
                },
                "result": {
                    "accepted": False,
                    "failureClass": "unrepresentable"
                }
            },
            {
                "name": "late_internal_edge_collapse_across_binary64_spacing_boundary",
                "input": {
                    "start": 9007199254740988,
                    "stop": 9007199254740994,
                    "width": 1
                },
                "result": {
                    "accepted": False,
                    "failureClass": "unrepresentable"
                }
            },
            {
                "name": "reconstructed_endpoint_overflow",
                "input": {
                    "start": -1.7976931348623157e+308,
                    "stop": 1.7976931348623157e+308,
                    "width": 1.1984620899082107e+308
                },
                "result": {
                    "accepted": False,
                    "failureClass": "unrepresentable"
                }
            },
            {
                "name": "exact_ratio_survives_ordinary_subtraction_overflow",
                "input": {
                    "start": -1.7976931348623157e+308,
                    "stop": 1.7976931348623157e+308,
                    "width": 1.7976931348623157e+308
                },
                "result": {
                    "accepted": True,
                    "intervalCount": 2,
                    "edges": [
                        -1.7976931348623157e+308,
                        0,
                        1.7976931348623157e+308
                    ]
                }
            },
            {
                "name": "maximum_materialization_budget_accepted",
                "input": {
                    "start": 0,
                    "stop": 100000,
                    "width": 1
                },
                "result": {
                    "accepted": True,
                    "intervalCount": 100000,
                    "edgeAssertions": [
                        {
                            "index": 0,
                            "value": 0
                        },
                        {
                            "index": 1,
                            "value": 1
                        },
                        {
                            "index": 99999,
                            "value": 99999
                        },
                        {
                            "index": 100000,
                            "value": 100000
                        }
                    ]
                }
            },
            {
                "name": "materialization_budget",
                "input": {
                    "start": 0,
                    "stop": 100001,
                    "width": 1
                },
                "result": {
                    "accepted": False,
                    "failureClass": "too_many"
                }
            }
        ]
    },
    "cortexel_binary64_spatial_domain_axis_v1": {
        "id": "cortexel_binary64_spatial_domain_axis_v1",
        "revision": 1,
        "semantics": {
            "id": "cortexel_binary64_spatial_domain_axis_semantics_v1",
            "version": "1.0",
            "status": "normative",
            "parameters": {
                "numberFormat": "ieee754_binary64",
                "binary64Epsilon": 2.220446049250313e-16,
                "arithmeticRoundingMode": "roundTiesToEven",
                "coefficientEncoding": "signed_integer_times_two_to_binary_exponent",
                "coefficientBinaryExponent": -1074,
                "negativeZeroPolicy": "canonical_positive_zero",
                "extentRule": "finite_strictly_positive",
                "endpointRule": "round_exact_two_center_plus_or_minus_extent_over_two_once",
                "endpointOrder": "finite_strictly_increasing",
                "endpointRoundingCapEpsilonMultiplier": 32,
                "endpointRoundingCapScale": "declared_extent_only",
                "membershipBoundary": "closed",
                "membershipToleranceEpsilonMultiplier": 8,
                "membershipToleranceScale": "declared_extent_only",
                "membershipAllowance": "relative_tolerance_plus_exact_compared_endpoint_rounding_error",
                "comparisonArithmetic": "exact_min_subnormal_integer_cross_multiplication",
                "absoluteOriginPolicy": "never_scales_tolerance",
                "nonfiniteInputFailureClass": "nonfinite",
                "invalidExtentFailureClass": "invalid_extent",
                "representationFailureClass": "unrepresentable"
            }
        },
        "purpose": "Materialize a closed binary64 spatial axis from a declared centre and extent, and classify finite positions with an extent-relative allowance that cannot underflow or grow with the absolute coordinate origin.",
        "inputs": {
            "center": "finite binary64 in the selected canonical length unit",
            "extent": "finite strictly positive binary64 in the same canonical length unit",
            "values": "zero or more finite binary64 positions in that unit"
        },
        "constants": {
            "binary64MinSubnormalExponent": -1074,
            "binary64Epsilon": 2.220446049250313e-16,
            "membershipToleranceEpsilonMultiplier": 8,
            "endpointRoundingCapEpsilonMultiplier": 32,
            "roundingMode": "roundTiesToEven",
            "boundary": "closed"
        },
        "algorithm": [
            "Reject with failureClass nonfinite unless center, extent, and every tested value are finite binary64 numbers. Otherwise reject with failureClass invalid_extent unless extent is strictly positive.",
            "Decode center and extent exactly as C*2^-1074 and E*2^-1074. Form the exact rational endpoint numerators 2C-E and 2C+E over denominator 2, round each once to binary64 with roundTiesToEven, and canonicalize negative zero.",
            "Reject with failureClass unrepresentable unless both rounded endpoints are finite and strictly ordered. Compute each exact endpoint-rounding error before rounding; reject when either error is greater than 32*binary64Epsilon*extent, using exact integer cross-multiplication.",
            "For each value V, decode it exactly as an integer multiple of 2^-1074. The lower allowance is 8*binary64Epsilon*extent plus the exact lower-endpoint rounding error; the upper allowance is the same relative term plus the exact upper-endpoint rounding error.",
            "Classify V as inside exactly when V is no less than lower minus its allowance and no greater than upper plus its allowance. Perform both comparisons by exact integer cross-multiplication; do not materialize a tolerance in binary64 and do not include abs(center) in either scale.",
            "Accept with the two rounded endpoints and one boolean membership result per submitted value. The same accepted endpoints and membership operation are authoritative for table rows, summary counts, preflight, domain geometry and output-authority evaluation."
        ],
        "failureClasses": [
            "nonfinite",
            "invalid_extent",
            "unrepresentable"
        ],
        "conformanceVectors": [
            {
                "name": "closed_relative_boundary_without_endpoint_rounding",
                "input": {
                    "center": 0,
                    "extent": 2,
                    "values": [
                        1,
                        1.0000000000000036,
                        1.0000000000000038
                    ]
                },
                "result": {
                    "accepted": True,
                    "lower": -1,
                    "upper": 1,
                    "membership": [
                        True,
                        True,
                        False
                    ]
                }
            },
            {
                "name": "bounded_endpoint_rounding_at_offset_origin",
                "input": {
                    "center": 40,
                    "extent": 0.4,
                    "values": [
                        39.8,
                        40,
                        40.2
                    ]
                },
                "result": {
                    "accepted": True,
                    "lower": 39.8,
                    "upper": 40.2,
                    "membership": [
                        True,
                        True,
                        True
                    ]
                }
            },
            {
                "name": "large_origin_does_not_expand_membership",
                "input": {
                    "center": 1000000000000000,
                    "extent": 1,
                    "values": [
                        999999999999999.5,
                        1000000000000000.5,
                        1000000000000000.6
                    ]
                },
                "result": {
                    "accepted": True,
                    "lower": 999999999999999.5,
                    "upper": 1000000000000000.5,
                    "membership": [
                        True,
                        True,
                        False
                    ]
                }
            },
            {
                "name": "collapsed_large_origin_extent",
                "input": {
                    "center": 10000000000000000,
                    "extent": 1,
                    "values": []
                },
                "result": {
                    "accepted": False,
                    "failureClass": "unrepresentable"
                }
            },
            {
                "name": "invalid_zero_extent",
                "input": {
                    "center": 0,
                    "extent": 0,
                    "values": []
                },
                "result": {
                    "accepted": False,
                    "failureClass": "invalid_extent"
                }
            }
        ]
    }
})

NUMERIC_POLICIES: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
    "cortexel_binary64_uniform_exposure_bins_v1": {
        "id": "cortexel_binary64_uniform_exposure_bins_v1",
        "revision": 1,
        "algorithm": "cortexel_binary64_nominal_interval_candidates_v1",
        "semantics": {
            "id": "cortexel_binary64_uniform_exposure_bins_semantics_v1",
            "version": "1.0",
            "status": "normative",
            "parameters": {
                "candidateAlgorithm": "cortexel_binary64_nominal_interval_candidates_v1",
                "resultNoun": "bin",
                "boundary": "[start,stop)",
                "partialIntervalPolicy": "refuse_nominal_remainder_and_nonuniform_physical_exposure",
                "intervalExposure": "require_every_exact_physical_endpoint_difference_to_equal_original_typed_width",
                "declaredCountBinding": "must_equal_interval_count",
                "coordinateSelection": "all_adjacent_emitted_edge_pairs",
                "exposureComparison": "exact_registered_unit_rational_equality_without_conversion_rounding",
                "exposureMismatchPolicy": "reject_first_mismatch"
            }
        },
        "resultNoun": "bin",
        "boundary": "[start,stop)",
        "partialIntervalPolicy": "refuse_nominal_remainder_and_nonuniform_physical_exposure",
        "intervalExposure": "require_every_exact_physical_endpoint_difference_to_equal_original_typed_width",
        "description": "First apply the nominal interval-candidate algorithm. Then, in exact registered-unit rational arithmetic with no conversion rounding, require edges[i+1]-edges[i] to equal the original typed binWidth for every emitted interval. Reject on the first mismatch. Each accepted adjacent edge pair is therefore one half-open uniform-exposure bin, and the declared binCount must equal intervalCount. This postcondition is what makes a maximum bin count sufficient authority for a peak rate."
    },
    "cortexel_binary64_nominal_steps_v1": {
        "id": "cortexel_binary64_nominal_steps_v1",
        "revision": 1,
        "algorithm": "cortexel_binary64_nominal_interval_candidates_v1",
        "semantics": {
            "id": "cortexel_binary64_nominal_steps_semantics_v1",
            "version": "1.0",
            "status": "normative",
            "parameters": {
                "candidateAlgorithm": "cortexel_binary64_nominal_interval_candidates_v1",
                "resultNoun": "sample step",
                "boundary": "[start,stop)",
                "partialIntervalPolicy": "refuse_nominal_remainder",
                "intervalExposure": "emitted_coordinates_authoritative_no_equal_exposure_claim",
                "declaredCountBinding": "must_equal_interval_count",
                "coordinateSelection": "first_interval_count_emitted_edges_excluding_stop",
                "exposureComparison": "none",
                "exposureMismatchPolicy": "not_applicable"
            }
        },
        "resultNoun": "sample step",
        "boundary": "[start,stop)",
        "partialIntervalPolicy": "refuse_nominal_remainder",
        "intervalExposure": "emitted_coordinates_authoritative_no_equal_exposure_claim",
        "description": "Apply the nominal interval-candidate algorithm to a sampled-grid step. The sampled coordinates are the first intervalCount emitted edges and exclude stop; those binary64 coordinates, not an equality claim about adjacent physical differences, are authoritative. The declared sampleCount must equal intervalCount. Consumers may evaluate a function at these coordinates but may not divide counts by the nominal step as if every interval had that exposure."
    },
    "cortexel_binary64_spatial_domain_membership_v1": {
        "id": "cortexel_binary64_spatial_domain_membership_v1",
        "revision": 1,
        "algorithm": "cortexel_binary64_spatial_domain_axis_v1",
        "semantics": {
            "id": "cortexel_binary64_spatial_domain_membership_semantics_v1",
            "version": "1.0",
            "status": "normative",
            "parameters": {
                "candidateAlgorithm": "cortexel_binary64_spatial_domain_axis_v1",
                "resultNoun": "spatial axis membership",
                "boundary": "[lower,upper]",
                "partialIntervalPolicy": "not_applicable",
                "intervalExposure": "extent_relative_membership_only_no_physical_resolution_claim",
                "declaredCountBinding": "not_applicable",
                "coordinateSelection": "each_position_against_materialized_axis",
                "exposureComparison": "exact_min_subnormal_integer_cross_multiplication",
                "exposureMismatchPolicy": "outside_closed_domain"
            }
        },
        "resultNoun": "spatial axis membership",
        "boundary": "[lower,upper]",
        "partialIntervalPolicy": "not_applicable",
        "intervalExposure": "extent_relative_membership_only_no_physical_resolution_claim",
        "description": "Apply the spatial-domain-axis algorithm independently to each canonical length axis. Its once-rounded endpoints are the published rectangle and period bounds. Each finite position is inside only under the closed exact-integer comparison with 8 epsilon times declared extent plus that endpoint's exact rounding error, whose own 32-epsilon extent cap was already enforced. Absolute centre magnitude never scales acceptance; an unrepresentable axis is refused."
    }
})

CANONICALIZATION_ALGORITHMS: Final[Mapping[str, Mapping[str, Any]]] = _freeze({
    "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1": {
        "id": "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1",
        "revision": 1,
        "status": "stable",
        "input": {
            "container": "nonempty_array",
            "itemType": "string",
            "rejectEmptyItems": True,
            "rejectDuplicates": True,
            "unicodeDomain": "well_formed_unicode"
        },
        "equality": {
            "stringEquality": "exact_unicode_sequence",
            "unicodeNormalization": "none"
        },
        "sort": {
            "order": "utf16_code_unit_lexicographic_ascending",
            "locale": "none"
        },
        "serialization": {
            "scheme": "rfc8785",
            "value": "sorted_identifier_array"
        },
        "encoding": "utf-8",
        "digest": "sha256",
        "output": "sha256_colon_64_lowercase_hex",
        "operations": [
            "validate_nonempty_array",
            "validate_nonempty_unique_well_formed_strings",
            "sort_utf16_code_units_ascending",
            "serialize_rfc8785",
            "encode_utf8",
            "digest_sha256",
            "prefix_sha256_colon_lowercase_hex"
        ],
        "conformanceVectors": [
            {
                "name": "single_identifier",
                "outcome": "accept",
                "inputEncoding": "unicode_strings",
                "input": [
                    "cell-1"
                ],
                "normalizedInput": [
                    "cell-1"
                ],
                "canonicalJson": "[\"cell-1\"]",
                "digest": "sha256:67195d72e6a26feedd72d3a9eda3627d4f12f1ba1f0cafd1ff8aa2347f791faf"
            },
            {
                "name": "permutation_and_numeric_suffixes",
                "outcome": "accept",
                "inputEncoding": "unicode_strings",
                "input": [
                    "n7",
                    "n2",
                    "n6",
                    "n1",
                    "n5",
                    "n3",
                    "n4"
                ],
                "normalizedInput": [
                    "n1",
                    "n2",
                    "n3",
                    "n4",
                    "n5",
                    "n6",
                    "n7"
                ],
                "canonicalJson": "[\"n1\",\"n2\",\"n3\",\"n4\",\"n5\",\"n6\",\"n7\"]",
                "digest": "sha256:fdb6b814de98ab8daa241acb8895573a50c4ff7e6864cef64c80b023054b29ce"
            },
            {
                "name": "utf16_astral_before_high_bmp",
                "outcome": "accept",
                "inputEncoding": "unicode_strings",
                "input": [
                    "",
                    "𐀀"
                ],
                "normalizedInput": [
                    "𐀀",
                    ""
                ],
                "canonicalJson": "[\"𐀀\",\"\"]",
                "digest": "sha256:e8bdee294d4a756532cd1660a49d7d99325bb04ec58c236f78b94ff2718d31de"
            },
            {
                "name": "no_unicode_normalization",
                "outcome": "accept",
                "inputEncoding": "unicode_strings",
                "input": [
                    "é",
                    "é"
                ],
                "normalizedInput": [
                    "é",
                    "é"
                ],
                "canonicalJson": "[\"é\",\"é\"]",
                "digest": "sha256:d056a09c651dab55ceb8f30b349ec21de471bdf5ce4a94db7f29dc9594f54ec3"
            },
            {
                "name": "json_string_escaping",
                "outcome": "accept",
                "inputEncoding": "unicode_strings",
                "input": [
                    "quote\"",
                    "slash\\",
                    "line\n"
                ],
                "normalizedInput": [
                    "line\n",
                    "quote\"",
                    "slash\\"
                ],
                "canonicalJson": "[\"line\\n\",\"quote\\\"\",\"slash\\\\\"]",
                "digest": "sha256:2926b92f9ea190405919eac2fa2c0a0d8b7d01bbc15252eff56686969778d0be"
            },
            {
                "name": "empty_array_rejected",
                "outcome": "reject",
                "inputEncoding": "unicode_strings",
                "input": [],
                "failureClass": "empty_set"
            },
            {
                "name": "non_array_rejected",
                "outcome": "reject",
                "inputEncoding": "json_value",
                "input": "cell-1",
                "failureClass": "not_array"
            },
            {
                "name": "non_string_identifier_rejected",
                "outcome": "reject",
                "inputEncoding": "json_value",
                "input": [
                    "cell-1",
                    1
                ],
                "failureClass": "non_string_identifier"
            },
            {
                "name": "empty_identifier_rejected",
                "outcome": "reject",
                "inputEncoding": "unicode_strings",
                "input": [
                    ""
                ],
                "failureClass": "empty_identifier"
            },
            {
                "name": "duplicate_identifier_rejected",
                "outcome": "reject",
                "inputEncoding": "unicode_strings",
                "input": [
                    "n1",
                    "n1"
                ],
                "failureClass": "duplicate_identifier"
            },
            {
                "name": "lone_high_surrogate_rejected",
                "outcome": "reject",
                "inputEncoding": "utf16_code_units",
                "inputCodeUnits": [
                    [
                        55296
                    ]
                ],
                "failureClass": "ill_formed_unicode"
            }
        ],
        "failureClasses": [
            "not_array",
            "empty_set",
            "non_string_identifier",
            "empty_identifier",
            "duplicate_identifier",
            "ill_formed_unicode"
        ],
        "entryDigest": "sha256:15a260f6a08e48e8240f28c9ab91d07354fcaaa336914d59128e8df63fca3417"
    }
})

BUDGET_PROFILES: Final[Mapping[str, Mapping[str, int]]] = _freeze({
    "standard": {
        "rawInputBytes": 33554432,
        "jsonDepth": 64,
        "jsonTotalNodes": 1000000,
        "jsonStringLength": 65536,
        "jsonNumberTokenLength": 64,
        "jsonObjectKeys": 4096,
        "jsonArrayItems": 2000000,
        "observationsPerSeries": 250000,
        "observationsPerRequest": 2000000,
        "graphNodes": 100000,
        "graphEdges": 200000,
        "matrixCells": 16000000,
        "pairwiseOperations": 50000000,
        "visibleMarks": 100000,
        "svgTextNodes": 20000,
        "svgBytes": 20971520,
        "sidecarBytes": 104857600,
        "returnedTableRows": 500,
        "errorRecords": 32
    },
    "agent": {
        "rawInputBytes": 4194304,
        "jsonDepth": 32,
        "jsonTotalNodes": 200000,
        "jsonStringLength": 8192,
        "jsonNumberTokenLength": 64,
        "jsonObjectKeys": 1024,
        "jsonArrayItems": 200000,
        "observationsPerSeries": 50000,
        "observationsPerRequest": 200000,
        "graphNodes": 20000,
        "graphEdges": 50000,
        "matrixCells": 1000000,
        "pairwiseOperations": 5000000,
        "visibleMarks": 25000,
        "svgTextNodes": 5000,
        "svgBytes": 5242880,
        "sidecarBytes": 20971520,
        "returnedTableRows": 200,
        "errorRecords": 32
    }
})
