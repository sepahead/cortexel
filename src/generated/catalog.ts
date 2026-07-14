/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/skills/ and contract/registries/capabilities.v1.json.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

import type { SemanticValidatorId, DisclosureId } from './registry.js';

export interface SkillCatalogEntry {
  readonly id: string;
  readonly revision: number;
  readonly status: 'stable' | 'experimental' | 'deprecated' | 'removed';
  readonly releaseReady: boolean;
  readonly title: string;
  readonly canonicalQuestion: string;
  readonly cannotEstablish: readonly string[];
  readonly renderer: { readonly id: string; readonly revision: number };
  readonly semanticValidators: readonly { readonly id: SemanticValidatorId; readonly parameters?: Readonly<Record<string, unknown>> }[];
  readonly disclosures: readonly DisclosureId[];
  readonly budgets: {
    readonly maxObservations: number;
    readonly maxVisibleMarks: number;
    readonly maxInlineTableRows: number;
    readonly compactionPolicies: readonly string[];
    readonly tablePolicy: string;
  };
  readonly uncertaintySupport: readonly string[];
  readonly accessibility: {
    readonly summaryTemplate: string;
    readonly tableColumns: readonly { readonly key: string; readonly header: string; readonly description?: string }[];
  };
  readonly evidence: { readonly handVectors: boolean; readonly externalOracle: unknown };
  readonly legacyIds: readonly string[];
  readonly owner: string;
  readonly knownLimitations: readonly string[];
}

export const SKILL_CATALOG: Readonly<Record<string, SkillCatalogEntry>> = Object.freeze({
  "network.adjacency_matrix": {
    "id": "network.adjacency_matrix",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
    "title": "Connection adjacency matrix (target rows, source columns)",
    "canonicalQuestion": "Over one declared complete, ordered node universe, which cells of the target-row by source-column matrix contain at least one connection — or exactly how many connection entries — and which cells were actually observed, under a declared network scope and snapshot time?",
    "cannotEstablish": [
      "That an empty row means the target has in-degree zero in the wider network. The matrix is complete only over the DECLARED node universe: a target receiving 40 connections from unselected nodes still shows an empty row here.",
      "That an unobserved cell contains no connection. Under a rank-local or sampled scope most cells are unobserved, and unobserved is not absence — it is the snapshot declining to speak.",
      "Connection strength. A cell is present because a connection EXISTS, not because it is strong: a zero-weight synapse is present here and appears as the value 0 in network.weight_matrix. The two figures can disagree and both be right.",
      "Functional or effective connectivity. This is a structural snapshot: a present cell does not mean one neuron influenced another, and an absent cell does not mean the two were independent.",
      "That a visible block or cluster is a property of the network rather than of the declared node ORDER. Reordering can create or destroy every apparent block; Cortexel draws only the declared order and never sorts by connectivity.",
      "That the network still looks like this. The matrix is a snapshot at a declared time; under structural plasticity it says nothing about connectivity before or after that instant.",
      "That multiplicity is strength. Three parallel connections are not three times the influence of one — their weights may differ, may have opposite signs, and adjacency never looks at them.",
      "That a present cell is a monosynaptic pathway of a particular kind. Adjacency pools every declared synapse model in the supplied rows; the models are listed in the table, but the cell does not distinguish them."
    ],
    "renderer": {
      "id": "figure.matrix",
      "revision": 1
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
      "DOWNSAMPLED_FOR_RENDERING",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 200000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "matrix_value_quantize"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
    },
    "uncertaintySupport": [
      "none"
    ],
    "accessibility": {
      "summaryTemplate": "Adjacency matrix for {selectionLabel}: {nodeCount} nodes as target rows by source columns, in target-row by source-column orientation over one declared node universe. Cell mode {cellMode}. {presentCellCount} cells contain at least one connection, derived from {connectionCount} connection rows; multiplicity ranges from {multiplicityMin} to {multiplicityMax}. {observedRowCount} of {nodeCount} rows are fully observed; {unobservedCellCount} cells are unobserved and are not claimed absent. {autapseCellCount} cells are self-connections. Scope: {scopeStatement}. Snapshot time {snapshotTime} {snapshotTimeUnit}. {multapseStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "rowIndex",
          "header": "Row (target index)",
          "description": "Zero-based position in the declared node universe. The order is the declared order and is never derived from the connections."
        },
        {
          "key": "targetId",
          "header": "Target (row)",
          "description": "The connection's TARGET. The orientation is fixed by the contract and is not caller-configurable."
        },
        {
          "key": "columnIndex",
          "header": "Column (source index)",
          "description": "Zero-based position in the declared node universe."
        },
        {
          "key": "sourceId",
          "header": "Source (column)",
          "description": "The connection's SOURCE."
        },
        {
          "key": "cellStatus",
          "header": "Status",
          "description": "present, absent_observed, or unobserved. absent_observed is a measured absence. unobserved means this snapshot cannot speak to the cell, and it is never reported as absent."
        },
        {
          "key": "cellValue",
          "header": "Cell value",
          "description": "1 or 0 in binary_presence mode; the exact multiplicity in multiplicity mode. Empty when the cell is unobserved, because there is no value to report."
        },
        {
          "key": "multiplicity",
          "header": "Connections",
          "description": "The exact count of connection rows in the cell, multapses and autapses included. Present in BOTH cell modes: binary presence stops drawing multiplicity, it never destroys it."
        },
        {
          "key": "isAutapse",
          "header": "Self-connection",
          "description": "True when the row target id equals the column source id. Autapses are always counted and the diagonal cell is never blanked."
        },
        {
          "key": "edgeIds",
          "header": "Contributing connections",
          "description": "The stable ids of every connection row in the cell, or the deterministic ordinal identities assigned after the canonical sort when the caller supplied none."
        },
        {
          "key": "synapseModels",
          "header": "Synapse models",
          "description": "The declared models of the contributing connections. Adjacency pools models by design; they are listed so a reader can see exactly what was pooled."
        },
        {
          "key": "carriedAttributes",
          "header": "Carried weight / delay",
          "description": "Per-connection weight and delay when the snapshot supplied them, with their units. Shown, never used: a cell is present because a connection exists. A zero-weight connection is present."
        },
        {
          "key": "scope",
          "header": "Scope",
          "description": "The scope under which this cell was, or was not, observed."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "nest.GetConnections",
        "version": "3.10.0",
        "status": "not_run",
        "notes": "The intended differential oracle is a deterministic NEST script (Create + Connect with allow_multapses and allow_autapses) whose GetConnections output is compared cell by cell against this contract's derivation, including the target-row convention, multapse counts, autapse diagonal, and rank-local target ownership. A second, adversarial oracle is networkx: its adjacency convention is A[source][target], the TRANSPOSE of Cortexel's, so the comparison must transpose explicitly and a forgotten transpose fails loudly instead of producing a plausible mirrored matrix. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.adjacency_matrix"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Rows and columns share one ordered node universe, so 1.0 draws SQUARE self-connectivity matrices only. A bipartite source-set by target-set matrix (e.g. thalamic sources by cortical targets) is a genuinely different figure and is not expressible here.",
      "There is no way to make a model-restricted absence claim. A caller who supplies only one synapse model's rows must declare a `sampled` / `declared_subset` scope, under which no cell may be called absent — so 'no AMPA connection here' is not expressible in 1.0.",
      "The scope x cellMode restrictions in scopeRules — `sampled` admitting only `binary_presence`, and `mpi_target_rank_local` requiring `localTargetUniverseComplete: true` — are normative but are not machine-checked by a semantic validator for this skill in 1.0; the caller owns them.",
      "The disclosure registry has no rule for 'paint paths merged, every cell retained'. Under `matrix_value_quantize` DOWNSAMPLED_FOR_RENDERING is emitted even though no cell is dropped; the budget receipt records countAfter == countBefore, which is how a reader can tell.",
      "No uncertainty variant is supported. A connection-PROBABILITY matrix over an ensemble of network instantiations is a genuinely different figure, and 1.0 does not have it: this contract draws one exact snapshot, not an estimate.",
      "Cortexel verifies internal consistency, not truth. It can check that the scope, the universe, and the connections agree with each other; it cannot check that the snapshot enumerated the network correctly in the first place.",
      "No data-dependent reordering is offered. A caller who wants a seriated or clustered matrix must compute the order themselves, declare it as the universe order, and own the claim that the block structure is real."
    ]
  },
  "network.connection_graph": {
    "id": "network.connection_graph",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 200000,
      "maxVisibleMarks": 20000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "graph_declared_subset"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
          "description": "`node` or `connection`. A cell that does not apply to the row kind is empty; an empty cell is never a zero."
        },
        {
          "key": "id",
          "header": "Id",
          "description": "The node id, or the connection's edge id (assigned by ordinal after the canonical sort when the source supplied none)."
        },
        {
          "key": "group",
          "header": "Group",
          "description": "The declared group, or empty. A node belongs to at most one group."
        },
        {
          "key": "sourceId",
          "header": "Source",
          "description": "Connection rows only."
        },
        {
          "key": "targetId",
          "header": "Target",
          "description": "Connection rows only. The arrowhead is drawn at this end."
        },
        {
          "key": "isAutapse",
          "header": "Self-connection",
          "description": "True when source equals target."
        },
        {
          "key": "parallelIndex",
          "header": "Parallel index",
          "description": "Which of the pair's parallel connections this row is, in canonical order (1-based)."
        },
        {
          "key": "parallelCount",
          "header": "Parallel count",
          "description": "How many connections exist between this unordered pair. Greater than 1 means a multapse; every one of them has its own row."
        },
        {
          "key": "weight",
          "header": "Weight",
          "description": "Exact declared value, or empty when the source did not supply one. Empty is missing, not zero."
        },
        {
          "key": "weightUnit",
          "header": "Weight unit",
          "description": "`nest:weight` is simulator-defined and has no SI meaning; it is never converted or compared across models."
        },
        {
          "key": "delay",
          "header": "Delay"
        },
        {
          "key": "delayUnit",
          "header": "Delay unit"
        },
        {
          "key": "synapseModel",
          "header": "Synapse model",
          "description": "The declared model. Weights of different models are not pooled."
        },
        {
          "key": "inDegree",
          "header": "In-degree",
          "description": "Node rows only, and only when a degree annotation is declared and the scope supports it."
        },
        {
          "key": "outDegree",
          "header": "Out-degree",
          "description": "Node rows only. Empty under a target-rank-local scope, where it is not computable."
        },
        {
          "key": "degreeCountingPolicy",
          "header": "Degree policy",
          "description": "Whether each connection entry or each unique neighbour was counted, and how an autapse contributed."
        },
        {
          "key": "x",
          "header": "x",
          "description": "Measured coordinate, or empty under a schematic layout. A schematic screen position is not a coordinate and is never reported as one."
        },
        {
          "key": "y",
          "header": "y"
        },
        {
          "key": "positionUnit",
          "header": "Position unit"
        },
        {
          "key": "layoutStatus",
          "header": "Layout",
          "description": "`measured` or `schematic (non-spatial)`."
        },
        {
          "key": "scope",
          "header": "Scope",
          "description": "The declared network scope, repeated on every row so an extracted subset cannot lose it."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "networkx.MultiDiGraph",
        "version": "3.3",
        "status": "not_run",
        "notes": "NetworkX is the intended differential oracle for degree counting, multiedge retention, and self-loop handling ONLY — never for layout, because Cortexel's stable layouts are closed-form and NetworkX's are not normative. The comparison MUST use MultiDiGraph: networkx.DiGraph silently collapses parallel edges, so comparing against it would 'confirm' precisely the deduplication bug this contract exists to prevent. NetworkX also counts a self-loop as 2 in Graph.degree but as 1 each in in_degree/out_degree, so the autapse policy must be matched explicitly before any number agrees for the right reason. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.connection_graph"
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
      "`ids.unique` enforces per-pointer uniqueness on the node ids, edge ids, and position node ids. The cross-group membership partition (a node in at most one group) is NOT enforced by a semantic validator here: the shared implementation reads only its flat `pointers` list, so group-partition uniqueness is an adapter obligation.",
      "`degree.counting_policy_declared` is deliberately NOT declared for this figure. That validator requires a top-level `parameters.countingPolicy` unconditionally, but here a degree is an OPTIONAL annotation whose counting policy is structurally required inside `degreeAnnotation`; the nested requirement is what enforces it.",
      "The scope/degree compatibility refusals (rank-local out-degree, sampled degree) are enforced by the semantic validator only for `network.degree_distribution`. This figure documents the constraints and structurally requires a well-formed `degreeAnnotation`, but does not itself reject a rank-local out-degree annotation at the semantic boundary.",
      "The <=8 distinguishable-group limit is a render-stage concern (RENDER_SERIES_LIMIT_EXCEEDED) with no semantic validator, so it is not checked during request validation; the shared `nodeUniverse` type caps groups at 64. The diverging-scale center requirement, by contrast, IS enforced structurally (an absent center fails with SCHEMA_REQUIRED_PROPERTY_MISSING).",
      "The multapse-aggregation rule fires for ANY unordered pair carrying more than one connection, independent of `parallelEdges.display`. A `separate_lanes` figure with parallel edges must therefore still declare `parameters.multapseAggregation`; the aggregation governs any per-pair derived value while every row is still drawn and tabled.",
      "Bundled parallel edges are drawn as one stroke with a count label. The bundle is a paint decision and every row remains in the table, but a reader who looks only at the drawing sees one stroke where several synapses exist."
    ]
  },
  "network.degree_distribution": {
    "id": "network.degree_distribution",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 200000,
      "maxVisibleMarks": 20000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "histogram_merge_adjacent"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "{direction}-degree distribution for {selectionLabel}. Counting policy {countingPolicy}; autapses {autapsePolicy}{excludedAutapseStatement}. Node universe: {universeNodeCount} nodes, declared complete. Scope: {scopeStatement}. {countedConnectionCount} connections counted. Degrees run from {minDegree} to {maxDegree}; {zeroDegreeNodeCount} nodes have degree 0. {binCount} bins, {binningStatement}. Values are the {normalization} of nodes per degree bin. {uncertaintyStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "degreeLow",
          "header": "Degree (lower)",
          "description": "Inclusive lower degree of the bin. Under per_integer_degree binning it equals the upper."
        },
        {
          "key": "degreeHigh",
          "header": "Degree (upper)",
          "description": "Inclusive upper degree. Degree bins are inclusive integer ranges, never half-open real intervals."
        },
        {
          "key": "nodeCount",
          "header": "Nodes",
          "description": "Exact integer number of NODES whose degree falls in this bin. This is the raw observation, and it is a count of nodes — not of connections."
        },
        {
          "key": "probability",
          "header": "Probability",
          "description": "nodeCount divided by the complete declared node universe, zero-degree nodes included. Present only when normalization is probability."
        },
        {
          "key": "universeNodeCount",
          "header": "Universe nodes",
          "description": "The denominator. Includes every node of degree zero."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "description": "Dimensionless (1). A degree has no unit and is never converted."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        },
        {
          "key": "uncertaintyBasis",
          "header": "Uncertainty basis",
          "description": "Realizations only: ensemble_members, bootstrap_draws or replicates. Within one realization a bin count is exact and carries no sampling uncertainty."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "networkx.MultiDiGraph.in_degree / out_degree",
        "version": "3.3",
        "status": "not_run",
        "notes": "networkx is the intended differential oracle, and it is only meaningful parameter for parameter. MultiDiGraph retains parallel edges, which corresponds to `count_edges`; DiGraph has already collapsed them, which corresponds to `count_unique_neighbors` and from which `count_edges` can never be recovered. A self-loop adds one to in_degree and one to out_degree on a directed graph, while the undirected Graph.degree counts it twice — matching the autapse convention is therefore part of the comparison, not an afterthought. NEST 3.10 is the second intended oracle, for the MPI rank-local scope rules specifically. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.in_degree_distribution",
      "nest.out_degree_distribution"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "This figure computes the degree over a SINGLE declared node universe: every counted connection has both endpoints in it, and the counterpart set is the universe itself. A rectangular selection whose counterpart set differs from the degree universe is not expressible in v1, because the v1 topology validators bind both endpoints to one `nodeUniverse`.",
      "Registry v1 has no `degree.conservation` validator, and this figure's request carries no precomputed histogram values or continuous bin edges, so `bins.strictly_increasing` and `histogram.normalization_consistent` have nothing to check at request time and are not declared. The count_edges conservation identity and the count_unique_neighbors bounds are asserted during derivation (INTERNAL_INVARIANT_VIOLATED), not verified against the request.",
      "Registry v1 has no disclosure id for excluded autapses. Under `autapsePolicy: exclude` the excluded count reaches the accessible summary and the table metadata, but no footer disclosure states it.",
      "MULTAPSE_AGGREGATED is emitted when `count_unique_neighbors` collapses parallel connections. Its registry text is worded for matrix cells, so on this figure {contributingCount} must be read as connections per unordered endpoint pair.",
      "Cortexel v1 does not machine-verify that `observedTargetIds` really is the rank's target set, nor that the node universe stays inside it. It is recorded as a caller ownership declaration; a caller that declares a rank owns targets it does not own has misdeclared its evidence.",
      "Because the schema makes `countingPolicy` and `autapsePolicy` required, a missing policy fails structurally. `degree.counting_policy_declared` therefore acts as defence in depth on the normalized request, and its SCIENCE_AGGREGATION_REQUIRED code is reached mainly through migration.",
      "A sampled snapshot is refused with SCOPE_INCOMPATIBLE_WITH_SKILL rather than a sampling-specific code; registry v1 has no code that names the sampling itself.",
      "Cortexel does not filter rows by synapse model, weight sign, or receptor. A selection is expressed by supplying exactly its rows; a filter applied silently would change every degree in the figure.",
      "Cortexel fits and tests nothing. It draws the empirical histogram; a scale-free, binomial or lognormal claim belongs to the reader, and no log-log axis is offered as a stand-in for a fit.",
      "Cortexel cannot verify that the supplied snapshot is the whole snapshot. It verifies the scope and the universe; it cannot know that GetConnections was called with the selection the caller says it was."
    ]
  },
  "network.delay_distribution": {
    "id": "network.delay_distribution",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
    "title": "Synaptic delay distribution over a declared edge population",
    "canonicalQuestion": "What is the distribution of synaptic transmission delays over an explicitly declared population of connections, counted either once per synapse row or once per ordered node pair, within a network scope that states exactly which connections were observed?",
    "cannotEstablish": [
      "That any signal is actually transmitted with these latencies. A delay is a declared model parameter of a connection; the latency of influence also depends on weight, membrane time constant, and network state, none of which is in this figure.",
      "The functional latency between two populations. A synaptic delay is structural; the peak lag of a cross-correlogram is a network property and can differ from the modal delay by more than the delay's own spread.",
      "Anything about connections that were not supplied. The histogram describes exactly the rows in the declared selection. A row filtered upstream is invisible, and Cortexel cannot see that it ever existed.",
      "The global delay distribution from a rank-local or sampled snapshot. It is complete for the retained edges only; extrapolating requires that retention be independent of delay, which Cortexel cannot check and which a prefix of NEST's rank/thread-ordered rows does not satisfy.",
      "The per-pair distribution from a per-synapse histogram, or the reverse. Where multiplicity covaries with delay -- as under a distance-dependent rule, where near pairs get both more contacts and shorter delays -- the two differ systematically and neither can be recovered from the other.",
      "That an alternating comb in the bars is a property of the network. When the bin width is not an integer multiple of the simulator's resolution, consecutive bins straddle different numbers of grid delays, and a uniform delay population is drawn as structure.",
      "That these were the delays in effect at any time other than the declared snapshot. A delay-modifying operation or structural plasticity between two snapshots of one run changes every value here.",
      "Anything about synaptic strength, sign, or receptor. Weights may ride along on the rows; they never affect, filter, or group a delay, and two synapses with identical delay can differ by orders of magnitude in drive.",
      "That the distribution has any functional form. Cortexel draws the empirical histogram: it fits nothing and tests nothing, and a mean delay is a summary of the rows supplied, not a claim about the rule that generated them.",
      "In prebinned mode, that the counts are the counts of the declared selection. Cortexel re-derives the normalization and checks the conservation identity, but it never saw a row: it cannot verify the counting policy, the endpoints, or the positivity of a single delay."
    ],
    "renderer": {
      "id": "figure.distribution",
      "revision": 1
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
            "/data/connections/edgeIds"
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
        "id": "topology.multapse_aggregation_declared"
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
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 200000,
      "maxVisibleMarks": 20000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "histogram_merge_adjacent"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "Synaptic delay distribution for {selectionLabel}. {consideredConnectionCount} connection rows considered; counting policy {countingPolicy}{pairAggregationStatement}, giving {observationCount} {observationKind} observations in {groupCount} group(s) ({groupByStatement}). Scope: {scopeStatement}. Delays run from {delayMin} to {delayMax} {delayUnit}; declared source resolution {sourceResolution}. {binCount} bins span {binMin} to {binMax} {binUnit} on a {xScale} axis; {underRangeCount} observations fell below and {overRangeCount} above that range. Values are the {normalization} per bin, in {valueUnit}, normalized within each group. {uncertaintyStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "groupId",
          "header": "Group",
          "description": "The series: the synapse model when grouping is on, otherwise the selection itself. Each group is normalized within itself."
        },
        {
          "key": "binStart",
          "header": "Bin start",
          "description": "Inclusive lower edge, in the declared bin unit."
        },
        {
          "key": "binEnd",
          "header": "Bin end",
          "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive."
        },
        {
          "key": "binWidth",
          "header": "Bin width",
          "description": "The LINEAR width. It is the width used by the density denominator even when the axis is logarithmic."
        },
        {
          "key": "binUnit",
          "header": "Bin unit"
        },
        {
          "key": "count",
          "header": "Observations",
          "description": "Exact integer count in this bin. This is the raw observation everything else is derived from; an empty bin is a measured zero, not missing data."
        },
        {
          "key": "observationKind",
          "header": "Observation kind",
          "description": "connection under per_connection, ordered_pair under per_ordered_pair. A count of synapses and a count of pairs are different numbers and both get called `count`."
        },
        {
          "key": "normalization",
          "header": "Normalization",
          "description": "Which quantity the value carries: count, probability, or density. Stated per row so a reader of the table alone never has to infer it from the magnitudes."
        },
        {
          "key": "samplingScope",
          "header": "Scope (sampling)",
          "description": "The declared scope of the rows behind this group: complete, local targets only, or the retained edges of a sample with its sampling method. A partial population is stated in the table, not only in the footer."
        },
        {
          "key": "probability",
          "header": "Probability",
          "description": "count / binned observations of this group. Present only when normalization is probability."
        },
        {
          "key": "density",
          "header": "Density",
          "description": "count / (binned observations of this group x linear bin width). Present only when normalization is density."
        },
        {
          "key": "densityUnit",
          "header": "Density unit",
          "description": "The reciprocal of the bin unit, e.g. /ms for millisecond bins."
        },
        {
          "key": "groupObservationCount",
          "header": "Group observations",
          "description": "The normalization denominator for this group: the observations that fell inside the bin range."
        },
        {
          "key": "consideredConnectionCount",
          "header": "Connections considered",
          "description": "Connection rows considered for this group before the counting policy was applied. Under per_ordered_pair it exceeds the observation count whenever the group contains a multapse."
        },
        {
          "key": "excludedUnderRangeCount",
          "header": "Excluded (below range)",
          "description": "Observations below the first bin edge. Always reported; never silently absorbed."
        },
        {
          "key": "excludedOverRangeCount",
          "header": "Excluded (above range)",
          "description": "Observations above the last bin edge."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        },
        {
          "key": "uncertaintyBasis",
          "header": "Uncertainty basis",
          "description": "Realizations only: ensemble_members, bootstrap_draws or replicates. Within one realization a bin count is exact and carries no sampling uncertainty."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "numpy.histogram",
        "version": "2.1.0",
        "status": "not_run",
        "notes": "numpy.histogram is the intended differential oracle for the binning and normalization only, and it is meaningful only parameter for parameter: its rightmost bin is CLOSED, which matches this contract's final-edge-inclusive rule, and `density=True` divides by the total count and the LINEAR bin width, which is the formula fixed here. It has no notion of a counting policy or an edge selection, so per_ordered_pair aggregation and endpoint binding must be applied before the comparison means anything, and it will happily bin a zero or negative delay that this contract refuses. NEST 3.10 is the second intended oracle, for the delay resolution grid and for the MPI target-rank-local row semantics specifically. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.delay_distribution"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Registry gap: there is no `bins.grid_aligned` validator id. `sourceResolution` is a DECLARED fact that reaches the artifact, the table and the summary, but registry v1 cannot check that a delay is a multiple of it or that a bin width is. The comb artifact is disclosed in prose, not refused.",
      "Registry gap: there is no disclosure id for out-of-range exclusions. Under `exclude_and_report` the under- and over-range counts reach the summary and the table, but no footer disclosure states them. EVENTS_EXCLUDED_OUT_OF_WINDOW is about a time window and is deliberately not reused.",
      "Registry gap: there is no dedicated error code for a delay falling outside the declared bin range under `reject`. SCIENCE_BIN_EDGES_INVALID is used, matching neuro.isi_distribution; a future SCIENCE_BIN_RANGE_INCOMPLETE would be more precise.",
      "Registry gap: there is no conservation validator. `histogram.normalization_consistent` re-derives the probability sum or density integral of the supplied per-bin values (surfacing SCIENCE_NORMALIZATION_UNVERIFIABLE or SCIENCE_DENSITY_DOES_NOT_INTEGRATE), but it does NOT reconcile sum(counts) + under + over against consideredConnectionCount; that identity stays declared context in registry v1.",
      "Registry gap: `series.equal_length` compares only parallel-array lengths, and `histogram.normalization_consistent` silently skips a histogram whose value count does not match the derived bin count, so a miscounted prebinned length is not refused today. A length mismatch among connection rows IS caught and surfaces as SEMANTIC_LENGTH_MISMATCH.",
      "Registry gap: `topology.multapse_aggregation_declared` ignores the counting policy and demands an aggregation for any repeated ordered pair, so a per_connection selection that literally contains a multapse is currently refused with SCIENCE_AGGREGATION_REQUIRED. The connections examples keep one row per pair; multapse handling is exercised under per_ordered_pair.",
      "MULTAPSE_AGGREGATED's registry text is worded for matrix cells. On this figure {contributingCount} must be read as connections per ordered endpoint pair.",
      "MISSING_VALUES_PRESENT can fire only from a ride-along weight series. A null DELAY is refused outright, so it can never be the cause here.",
      "Cortexel does not choose bin edges, and for a grid-quantized delay the choice is unusually consequential: with a 0.1 ms resolution, a 0.15 ms bin width makes consecutive bins span two and one lattice points, drawing a uniform population as a 2:1 sawtooth.",
      "Cortexel cannot verify that the supplied rows are the selection the caller says they are. It verifies scope, endpoints, positivity and conservation; it cannot know which GetConnections call produced the rows.",
      "There is no autapse filter. A self-connection's delay is a delay and is counted like any other; excluding self-connections means not supplying those rows.",
      "Prebinned mode verifies the normalization and the conservation identity but cannot verify positivity, endpoint membership, or the counting policy, because Cortexel never saw an edge. PRE_BINNED_INPUT says so on the figure.",
      "Cortexel fits and tests nothing. A mean, a mode, or an apparent bimodality read off this figure is a property of the rows supplied and of the bins chosen for them."
    ]
  },
  "network.delay_matrix": {
    "id": "network.delay_matrix",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
    "title": "Transmission-delay matrix over a declared target-row / source-column node universe",
    "canonicalQuestion": "For each ordered (source, target) pair in a declared node universe, what is the explicitly named aggregate of the positive transmission delays of the connections observed between them, under a declared network scope?",
    "cannotEstablish": [
      "That an empty cell is a connection with zero delay. An empty cell means no connection was observed under the declared scope; a zero delay is rejected outright, so no cell in this figure is ever drawn at zero.",
      "The delay of any single synapse in a cell that aggregates multapses. A mean over parallel synapses of 1 ms and 9 ms reports 5 ms — a latency no spike in this network ever experiences.",
      "That a source does not connect to a target, when the scope is rank-local or sampled. Those scopes cannot see the whole cross-product, so an empty cell there means 'not observed', not 'not connected'.",
      "The total source-to-target latency when the synapse model splits axonal and dendritic delays and the source reported only the dendritic component. The two are numerically indistinguishable; only the declared delaySemantics tells them apart.",
      "The sign, amplitude, or receptor of any connection. Two cells with identical delay may drive their targets in opposite directions; a delay matrix carries no weight information at all.",
      "Any degree. Row and column marginals of delays are not quantities, are never computed, and are never rendered; a row with three painted cells is not a target with in-degree three, because multapses share a cell.",
      "That the delays hold at any time other than the declared snapshot time. A network with plastic or rewired delays has a different matrix at every snapshot.",
      "Any claim about when a target actually fired. A delay is the latency a synapse imposes on transmission, not evidence about spikes, and this figure contains no spike data.",
      "Any uncertainty or spread within a cell. A cell is one colour; the contributing count, minimum, and maximum are recoverable only from the table and the sidecar."
    ],
    "renderer": {
      "id": "figure.matrix",
      "revision": 1
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
      "NODE_UNIVERSE_INCOMPLETE",
      "MULTAPSE_AGGREGATED",
      "ABSENT_IS_NOT_ZERO",
      "UNIT_CONVERTED",
      "DOWNSAMPLED_FOR_RENDERING",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 200000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "matrix_value_quantize"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
          "description": "Zero-based index into the declared target (row) universe."
        },
        {
          "key": "targetId",
          "header": "Target",
          "description": "The postsynaptic node. Rows are targets."
        },
        {
          "key": "columnIndex",
          "header": "Column",
          "description": "Zero-based index into the declared source (column) universe."
        },
        {
          "key": "sourceId",
          "header": "Source",
          "description": "The presynaptic node. Columns are sources."
        },
        {
          "key": "cellStatus",
          "header": "Cell status",
          "description": "present, absent (no connection observed under a scope that could have seen one), or not_observed (the scope could not see this cell)."
        },
        {
          "key": "delayAggregate",
          "header": "Delay",
          "description": "The declared aggregate. Empty when the cell is absent or not_observed — never zero."
        },
        {
          "key": "displayUnit",
          "header": "Unit"
        },
        {
          "key": "multapseAggregation",
          "header": "Aggregation",
          "description": "The declared policy that produced the cell value."
        },
        {
          "key": "delaySemantics",
          "header": "Delay meaning",
          "description": "total_transmission, or dendritic_component_only when the model splits axonal and dendritic delays."
        },
        {
          "key": "contributingConnectionCount",
          "header": "Connections",
          "description": "How many connection rows contribute to this cell. Greater than one means a multapse was aggregated."
        },
        {
          "key": "delayMin",
          "header": "Delay min",
          "description": "Minimum over the contributing connections. Equal to the aggregate only under min."
        },
        {
          "key": "delayMax",
          "header": "Delay max",
          "description": "Maximum over the contributing connections. The spread a single colour cannot show."
        },
        {
          "key": "contributingEdgeIds",
          "header": "Connection ids",
          "description": "The exact contributing connections, declared or deterministically assigned. The complete list is in the sidecar when the cell exceeds the inline bound."
        },
        {
          "key": "synapseModels",
          "header": "Synapse models",
          "description": "The distinct models contributing to this cell."
        },
        {
          "key": "isAutapse",
          "header": "Autapse",
          "description": "True when source == target. Autapses are retained on the diagonal."
        },
        {
          "key": "scope",
          "header": "Scope",
          "description": "The scope under which this cell was observed, carried per row so an excerpt cannot lose it."
        },
        {
          "key": "snapshotTime",
          "header": "Snapshot time",
          "description": "The declared moment the connection snapshot was taken, with its unit. Carried per row so an excerpt cannot lose the moment the delays belong to."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "nest.GetConnections + SynapseCollection.get(['source','target','delay'])",
        "version": "3.10.0",
        "status": "not_run",
        "notes": "The intended differential oracle is NEST itself: build a fixture network with known multapses, an autapse, an isolate target, and known per-connection delays; read the SynapseCollection; and assert that the derived cell set, the contributing counts, and the min/mean/max aggregates match the constructed truth, and that GetConnections' source/target fields land in columns/rows respectively rather than transposed. Under MPI it must also confirm that rank-local output covers exactly the locally owned targets. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed. The aggregation arithmetic itself is covered by hand vectors, which is the stronger evidence: two libraries can share a convention error, but arithmetic done on paper cannot."
      }
    },
    "legacyIds": [
      "nest.delay_matrix"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "No disclosure id exists for delay semantics. `delaySemantics` is machine-checkable, but disclosures.v1.json has no rule for it, so it is carried in the legend, the accessible summary, and the table rather than the disclosure footer. A DELAY_COMPONENT_SEMANTICS rule is proposed for the registry.",
      "ABSENT_IS_NOT_ZERO's published text names a zero weight. For this figure that clause is vacuous — a zero delay is rejected — and the real hazard it must cover is an empty cell being read as instantaneous transmission at the fast end of the ramp.",
      "DOWNSAMPLED_FOR_RENDERING speaks of observations drawn. Under matrix_value_quantize every cell is retained and individually addressable; only paint paths are grouped, so countAfter equals countBefore and the disclosure reports a reduction in paths, not in data.",
      "`simulationResolution` is recorded but NOT enforced. No registered validator checks that each delay is an integer multiple of the declared resolution, so a delay off the simulator's grid is accepted and displayed.",
      "There is no declared or shared colour domain, so two delay matrices are NOT comparable by colour — compare the legends or the tables. A shared domain needs a clipping disclosure that does not exist in disclosures.v1.json.",
      "Cortexel cannot detect a transposed adapter: if the source and target arrays are swapped, every validator passes and the figure is a plausible lie about direction. The defences are the adapter's own vectors and restating orientation on the axes, legend, caption, and table.",
      "No uncertainty variant is renderable in a cell, so the spread across aggregated multapses is invisible in the colour. It is exact in the table (contributing count, min, max) and never merely summarized.",
      "Delays of different synapse models share one matrix because they share one dimension. That is dimensionally correct, but a matrix mixing a split-delay model with a total-delay model mixes two meanings. The models are carried per cell; no validator refuses the mix.",
      "The matrix is square over one declared node universe: rows (targets) and columns (sources) index the same node set. A rectangular/bipartite matrix over two distinct universes is not offered, because topology.edge_endpoints_in_universe binds both endpoints to the single data.nodeUniverse.",
      "The node universe must be declared complete: topology.node_universe_declared rejects complete == false, so a delay matrix over an explicitly partial node set is not available. Edge-snapshot partiality is expressed through the declared scope instead."
    ]
  },
  "network.spatial_map_2d": {
    "id": "network.spatial_map_2d",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 200000,
      "maxVisibleMarks": 50000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "graph_declared_subset"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
    },
    "uncertaintySupport": [
      "none"
    ],
    "accessibility": {
      "summaryTemplate": "Spatial map {mapLabel}. {drawnNodeCount} of {declaredNodeCount} nodes drawn at {positionStatus} positions in frame {frameId}; {missingPositionCount} have no declared position and are omitted, never placed at the origin. Axes {xAxisLabel} and {yAxisLabel}, both {positionUnit}, one equal scale. Domain: {domainStatement}. Boundary: {boundaryStatement}. {coincidentNodeCount} nodes exactly overlap another node; positions are never jittered. {outsideDomainCount} lie outside the declared domain. Marker radius is fixed screen-space decoration and encodes nothing. Color: {nodeEncodingStatement}. Connections: {connectionStatement}. Node universe: {nodeUniverseStatement}. Scope: {scopeStatement} {uncertaintyStatement} {compactionStatement} {tableStatement}",
      "tableColumns": [
        {
          "key": "rowKind",
          "header": "Row",
          "description": "`node` or `connection`. A cell that does not apply to the row kind is empty; an empty cell is never a zero."
        },
        {
          "key": "id",
          "header": "Id",
          "description": "The node id, or the connection's edge id (assigned by ordinal after the canonical sort when the source supplied none)."
        },
        {
          "key": "group",
          "header": "Group",
          "description": "The declared group, or `ungrouped`. A node belongs to at most one group."
        },
        {
          "key": "x",
          "header": "x",
          "description": "The declared coordinate, exactly as given. Never jittered, clamped, or wrapped."
        },
        {
          "key": "y",
          "header": "y"
        },
        {
          "key": "positionUnit",
          "header": "Position unit",
          "description": "The same unit on both axes after canonicalization. A conversion, if any, is recorded in the derivation and disclosed."
        },
        {
          "key": "positionStatus",
          "header": "Position status",
          "description": "`measured`, `model_generated`, or `supplied`. A NEST layer's coordinates are model_generated, not measured."
        },
        {
          "key": "positionMissing",
          "header": "Position missing",
          "description": "True for a selected node with no declared position. Such a node is omitted from the map and is never drawn at the origin."
        },
        {
          "key": "insideDomain",
          "header": "Inside domain",
          "description": "Closed-interval membership of the declared domain. Empty when no domain was declared."
        },
        {
          "key": "coincidentWith",
          "header": "Coincident with",
          "description": "Other node ids sharing this exact coordinate. Two coincident nodes are one marker on the page and two rows here."
        },
        {
          "key": "value",
          "header": "Value",
          "description": "The declared per-node value, or empty when the source supplied a null. Empty is missing, not zero."
        },
        {
          "key": "valueUnit",
          "header": "Value unit"
        },
        {
          "key": "sourceId",
          "header": "Source",
          "description": "Connection rows only."
        },
        {
          "key": "targetId",
          "header": "Target",
          "description": "Connection rows only. The arrowhead is drawn at this end."
        },
        {
          "key": "chordRule",
          "header": "Chord",
          "description": "`straight`, or `wrapped (minimum image)` when the chord crosses a periodic boundary. A wrapped chord's drawn length is not the modelled separation."
        },
        {
          "key": "parallelCount",
          "header": "Parallel count",
          "description": "How many connections share this unordered endpoint pair. Greater than 1 means one drawn chord and this many rows."
        },
        {
          "key": "weight",
          "header": "Weight",
          "description": "Exact declared value, or empty when none was supplied."
        },
        {
          "key": "weightUnit",
          "header": "Weight unit",
          "description": "`nest:weight` is simulator-defined: never converted, never compared across synapse models."
        },
        {
          "key": "delay",
          "header": "Delay"
        },
        {
          "key": "delayUnit",
          "header": "Delay unit"
        },
        {
          "key": "synapseModel",
          "header": "Synapse model"
        },
        {
          "key": "scope",
          "header": "Scope",
          "description": "The declared scope, repeated on every row so an extracted subset cannot lose it."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "ase.geometry.find_mic",
        "version": "3.23.0",
        "status": "not_run",
        "notes": "ASE's minimum-image-convention helper is the intended differential oracle for the periodic chord rule ONLY — never for the layout, the equal-scale mapping, or the table, which are Cortexel's own normative constructions. The comparison is meaningful only after the conventions are pinned parameter for parameter: ASE takes an orthorhombic cell matrix while Cortexel takes centre plus extent, and the tie at exactly half the period (|d| = P/2, where two images are equally short) is resolved by rounding, which the two libraries need not resolve the same way. A hand vector covers it directly: in a 400 um periodic layer, d = 300 um must map to d' = -100 um, and d = 200 um must map to the positive image. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
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
      "`topology.edge_endpoints_in_universe` checks that every CONNECTION endpoint (`connections.sourceIds`, `connections.targetIds`) resolves into the declared `nodeUniverse`. A `positions.nodeIds` entry outside the universe is not caught by this rule — coverage is checked in the other direction — so an extra positioned id that is not a universe member is a known gap in this revision.",
      "`spatial.position_coverage_complete` runs on every request, independent of `missingPositionPolicy`, so this revision requires a position for every selected node even under `omit_and_disclose`. A map with a hole is refused (SCOPE_POSITION_COVERAGE_INCOMPLETE), never drawn as a partial map.",
      "`topology.node_universe_declared` refuses a `nodeUniverse.complete = false`, so a declared-incomplete universe is rejected (SCOPE_NODE_UNIVERSE_REQUIRED) rather than disclosed in this revision. NODE_UNIVERSE_INCOMPLETE remains reserved for a future revision that can ground a partial-universe reading.",
      "Marker radius is fixed screen-space decoration. Two neurons 1 um apart in a 400 um map are drawn as overlapping dots, and a dot's area is not a soma.",
      "No node compaction policy exists: extrema sampling and averaging both destroy the spatial distribution the figure exists to show, and none in the registry fits a point cloud. Above the visible-mark budget a request is refused (RESOURCE_COMPACTION_UNAVAILABLE), never thinned.",
      "`graph_declared_subset` is the only compaction this figure permits, and it thins the optional edge layer alone. It never removes a node, and its retained/source counts are disclosed (SAMPLED_EDGES).",
      "The shared nodeUniverse type admits 100000 nodes, but this contract draws at most 50000 markers and cannot compact them, so a larger layer is refused rather than shown as a thinned map that would understate its own density.",
      "Coincident nodes overlap exactly and are never separated: a grid layer with an excitatory and an inhibitory population on the same points draws N markers for 2N neurons. The coincident count is reported, but the drawing cannot pull them apart.",
      "Chords between measured positions are straight or wrapped lines, not axonal paths. common.v1 carries no measured axon geometry, and none is invented here.",
      "There is no projection of a 3-D layer. A projected z silently collapses a real axis and can make two distant neurons coincident; a 3-D layer belongs to the experimental 3-D scene, whose table and summary remain the complete route to the data."
    ]
  },
  "network.synaptic_weight_trace": {
    "id": "network.synaptic_weight_trace",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "That the declared initial weight or the declared bounds are true. They are caller or model declarations. They are drawn as reference lines and are never used to clamp, correct, or validate an observed value — a weight above a declared `Wmax` stays drawn where it was observed.",
      "That a poll captured every update. Polling `GetConnections(...).get('weight')` at declared times reveals only the stored value at those times: an update and a counter-update falling between two polls cancel and leave no trace at all.",
      "Anything about synapses held on another MPI rank. A rank holds the connections whose TARGET it owns, so a rank-local weight recorder never saw the rest of them.",
      "That two parallel synapses (a multapse) between the same pair are the same synapse. They are distinct edges with distinct ids and are never merged — and a source that cannot tell them apart cannot be used to plot either of them individually."
    ],
    "renderer": {
      "id": "figure.synaptic_weight_trace",
      "revision": 1
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
          "note": "The reference evaluator resolves each pointer by RFC 6901 and has no index wildcard, so the groups enumerate concrete series indices. A group is compared only within itself: one synapse's time array is checked against that SAME synapse's weight array and never against another synapse's, because two synapses legitimately carry different numbers of updates — one may be potentiated four times while another three. The final group holds the pre-aggregated arrays, which must all share one length. Registry gap: an index wildcard would let every declared series be checked; today only the enumerated indices are.",
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
          "pointer": "/data/window"
        }
      },
      {
        "id": "trace.duplicate_time_policy"
      },
      {
        "id": "trace.axis_dimension_compatible"
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
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2000000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "line_envelope_minmax"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "Synaptic weight trace. {edgeCount} synapses, model {synapseModels}, weight in {weightUnit} ({weightDimensionStatement}), over {windowStart} to {windowStop} {timeUnit}. Observation: {observationStatement}. {observationCount} observations, {missingCount} missing (drawn as gaps; a missing update breaks the hold and is never held across), {excludedCount} outside the window. Display: {displayMode}. {aggregateStatement} {membershipStatement} {referenceStatement} Scope: {scopeStatement}. {uncertaintyStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "seriesId",
          "header": "Synapse / group",
          "description": "The edge id, or the group id on an aggregate row. Two parallel synapses between one pair are two ids and are never merged."
        },
        {
          "key": "seriesLabel",
          "header": "Label"
        },
        {
          "key": "sourceId",
          "header": "Source",
          "description": "Presynaptic node. Descriptive: this figure declares no node universe and makes no connectivity claim. Empty on an aggregate row."
        },
        {
          "key": "targetId",
          "header": "Target",
          "description": "Postsynaptic node. Empty on an aggregate row."
        },
        {
          "key": "synapseModel",
          "header": "Synapse model",
          "description": "The plasticity rule, verbatim from the source, and the comparability mode under which weights of different models were pooled."
        },
        {
          "key": "time",
          "header": "Time",
          "description": "In the window's declared unit, after any recorded conversion."
        },
        {
          "key": "timeUnit",
          "header": "Time unit"
        },
        {
          "key": "value",
          "header": "Weight",
          "description": "The observed weight, or the aggregate on an aggregate row. Empty when the observation is missing. A missing observation is not zero."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "description": "A `nest:weight` is simulator-defined: no SI mapping, never converted, never compared across systems."
        },
        {
          "key": "observationKind",
          "header": "Observation",
          "description": "event_updated (held, drawn as steps), point_sample (joined by straight segments), or interpolated_trajectory (a caller reconstruction, not an observation)."
        },
        {
          "key": "updateSemantics",
          "header": "Held",
          "description": "value_after_update: this value holds forward from its time. value_before_update: it describes the interval ending at its time. The two differ by one inter-update interval on every step edge."
        },
        {
          "key": "heldUntil",
          "header": "Held until",
          "description": "The end of the interval this value is drawn across: the next observed time, the end of the recorded interval, or the window edge — whichever comes first. Never extended past the recorded interval."
        },
        {
          "key": "eventKind",
          "header": "Source event",
          "description": "What produced the observation: a presynaptic spike, a structural update, a poll of the stored value, or a parameter write."
        },
        {
          "key": "missing",
          "header": "Missing",
          "description": "true when the weight was null in the source. A missing update breaks the hold; the following interval is undefined, not unchanged."
        },
        {
          "key": "replicateCount",
          "header": "Replicates",
          "description": "How many observations at this timestamp produced this row. 1 for a single observation; greater than 1 means the row is a duplicate-time aggregate, which is never legal for an event-updated weight."
        },
        {
          "key": "memberCount",
          "header": "Members",
          "description": "Aggregate rows: how many synapses belonged to the group at this time. A mean that rises while this falls is a different fact from a mean that rises while it holds."
        },
        {
          "key": "contributingCount",
          "header": "Aggregate n",
          "description": "Aggregate rows: how many members actually had a value at this time. THIS is the denominator of the mean. Where it is 0 the aggregate is empty, never zero."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        },
        {
          "key": "uncertaintyMethod",
          "header": "Uncertainty method",
          "description": "The variant, level and basis. A dispersion across synapses is never relabelled as a confidence interval."
        },
        {
          "key": "initialWeight",
          "header": "Initial weight",
          "description": "The declared value and its origin (a model parameter or a caller assertion). Drawn as a reference line; never used to clamp a value."
        },
        {
          "key": "bounds",
          "header": "Bounds",
          "description": "The declared lower/upper bound, whether it is hard or soft, and its origin. A weight observed beyond a hard bound is reported here and is still drawn where it was observed."
        },
        {
          "key": "sourceOrdinal",
          "header": "Source row",
          "description": "The observation's index in the caller's original array, before the within-edge stable sort. Every drawn point traces back to the row it came from."
        },
        {
          "key": "scope",
          "header": "Scope",
          "description": "The scope this synapse was observed under. A rank-local snapshot never licenses a claim about another rank's synapses."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "NEST stdp_synapse + weight_recorder microfixture (pinned), cross-checked by hand against the analytic STDP update",
        "version": "NEST 3.10.0",
        "status": "not_run",
        "notes": "There is no library-independent oracle for most of this contract. The hold semantics, the membership-aware denominators, and the missing-update break are conventions of THIS contract and have no equivalent in Elephant, Neo, or NWB, so they rest entirely on the hand vectors. The one thing an external oracle can settle is the question this figure is most easily wrong about: whether the value a NEST weight recorder writes at a presynaptic spike is the weight BEFORE or AFTER the update that spike triggered. That is a property of stdp_synapse::send() in the pinned version, it must be established by executing a two-spike microfixture whose expected weights were computed by hand from the STDP kernel, and until it is, the adapter must not assume a convention — it must require the caller to declare one. The pinned reference environment has NOT been executed in this environment: the status is not_run, and it is not to be reported as anything else."
      }
    },
    "legacyIds": [
      "nest.plasticity_dynamics"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Cortexel cannot verify the update convention. It records the caller's `updateSemantics` and draws it. A wrong declaration produces a fully plausible figure whose every step edge is displaced by one inter-update interval, and no validator can detect it from the numbers.",
      "NEST's weight recorder exposes no per-synapse identity, so parallel synapses between one pair cannot be separated from recorder output alone. This is a limit of the source, not of the contract, and the adapter refuses rather than inventing an edge id.",
      "Cross-dimension pooling on the value axis IS enforced: `trace.axis_dimension_compatible` reads `data.series[].values.unit` and refuses two synapses of different dimensions (for example `nest:weight` and `nS`) on one axis, because this figure declares no small-multiples layout.",
      "Duplicate observation times within one synapse are caught by `trace.duplicate_time_policy`, which reads `data.series[].time.values`. That validator suppresses only on a STRING policy; this figure declares `duplicateTimePolicy` as an object, so it never suppresses the check and a clean recording is required.",
      "Observation kind is declared once in the schema-required `data.observation`, not in `parameters.observationKind`. The registered `weight_trace.observation_kind_declared` reads only that parameters field, so it is not declared here; the required `data.observation` carries the obligation instead.",
      "Edge-id uniqueness and the rule that a declared member names a declared edge have no registered validator here: `ids.unique` reads a flat id list and `topology.edge_endpoints_in_universe` reads `data.connections`/`data.nodeUniverse`, neither of which this figure carries. Structural closure enforces shape; registry gap.",
      "Weight comparability across synapse models is declared in `parameters.weightComparability` and shown in the table, but the registered `topology.weight_group_compatible` reads `data.connections.synapseModels`, a shape this figure does not use, so the model-comparability claim is not semantically enforced. Registry gap.",
      "The aggregate-denominator rules (contributingCount is the mean's denominator; a zero contributing count yields null, never 0; contributingCount <= memberCount) are drawn faithfully but not validator-enforced: `rate.denominator_positive` reads `data.recordedSenderCount`, not the aggregate's counts. Registry gap.",
      "Per-edge and per-aggregate uncertainty is validated structurally by the shared UncertaintyV1 union, but `uncertainty.valid` and `uncertainty.supported_variant` read a single top-level `data.uncertainty`/`parameters.uncertainty` this figure does not carry, so the supported-variant list is not semantically enforced. Registry gap.",
      "`series.equal_length` has no index wildcard in the reference evaluator, so its pointer groups enumerate concrete series indices rather than every synapse. The registry should adopt an index wildcard so an off-by-one in any synapse's arrays fails, not only in the enumerated ones.",
      "UncertaintyV1's `basis` enum has no `synapses` or `edges` member. An across-synapse dispersion must declare the closest existing value, `replicates`, which is not a precise statement about what was varied. Registry gap.",
      "There is no error code for a weight observed beyond a declared HARD bound. Cortexel draws the value where it was observed, draws the bound as declared, never clamps, and reports the violation in the table; it does not fail closed on it. The value is the measurement; the bound is the caller's claim.",
      "`sum` is not offered. Over a membership that changes size it conflates a change in the number of synapses with a change in their weights, and no registered disclosure can carry that.",
      "Line-envelope compaction on a step trace retains the extremes of each horizontal pixel bucket, so a single-update transient always survives. The marks drawn are still not the updates recorded.",
      "Cortexel can verify that a weight's unit dimension matches its kind. It cannot verify that two models' weights are truly comparable, that a `nest:weight` means what the caller believes, or that a declared bound is the model's."
    ]
  },
  "network.weight_distribution": {
    "id": "network.weight_distribution",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 200000,
      "maxVisibleMarks": 20000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "histogram_merge_adjacent"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "Synaptic weight distribution for {selectionLabel}. {inRangeObservationCount} observations ({observationUnit}) from {sourceConnectionCount} connections over {sourceNodeCount} declared sources x {targetNodeCount} declared targets. Scope: {scopeStatement}. Models: {synapseModels}; comparability: {weightComparability}. Weights {signTreatment}, unit {weightUnit}. {missingWeightCount} connections have no weight and are excluded, never counted as zero; {zeroWeightCount} have a measured weight of exactly 0. {binCount} bins span {binMin} to {binMax} {binUnit} on a {xScale} axis. {zeroEdgeStatement} {underRangeCount} observations fell below and {overRangeCount} above that range. Normalization: {normalization}, values in {valueUnit}. {uncertaintyStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "binLow",
          "header": "Weight (lower)",
          "description": "Inclusive lower edge of the bin."
        },
        {
          "key": "binHigh",
          "header": "Weight (upper)",
          "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive so the strongest synapse is never dropped."
        },
        {
          "key": "binWidth",
          "header": "Bin width",
          "description": "The LINEAR width, in the bin unit. It is the density denominator even when the axis is logarithmic."
        },
        {
          "key": "signRegion",
          "header": "Sign",
          "description": "negative, or non_negative. Every bin lies wholly on one side: whenever the range spans zero an exact edge at 0 is required, and no bin may straddle it. This is the non-colour encoding of sign; the non_negative bin that starts at 0 also contains the measured zeros."
        },
        {
          "key": "count",
          "header": "Observations",
          "description": "Exact integer count of observations in the bin. This is the raw number from which probability and density are derived."
        },
        {
          "key": "value",
          "header": "Value",
          "description": "The normalized value under the declared normalization. Equal to count when normalization is count."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "description": "Dimensionless (1) for count and probability; the reciprocal of the bin unit for density."
        },
        {
          "key": "inRangeObservationCount",
          "header": "Binned observations",
          "description": "The probability and density denominator. It excludes missing weights and out-of-range observations, so it can be smaller than the connection count."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        },
        {
          "key": "uncertaintyBasis",
          "header": "Uncertainty basis",
          "description": "Realizations only: ensemble_members, bootstrap_draws, or replicates. Within one realization a bin count is exact and carries no sampling uncertainty."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "numpy.histogram",
        "version": "2.1.0",
        "status": "not_run",
        "notes": "numpy.histogram is the intended differential oracle for the binning and normalization, and it is only meaningful parameter-for-parameter: its bins are half-open except for the last, which is closed on the right — the same convention this contract fixes — and its `density=True` divides by the LINEAR bin width, which is exactly the rule that must hold under a logarithmic axis. It has no notion of a missing value, of an out-of-range policy, or of a zero-straddling bin, so those rules are covered by hand vectors instead. NEST 3.10 GetConnections is the second intended oracle, for the multapse and MPI target-rank-local fixtures specifically. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.weight_histogram"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Registry gap: the error registry has no dedicated code for observations outside the declared bin range, nor for a bin that straddles zero. SCIENCE_BIN_EDGES_INVALID is the closest registered code for both.",
      "The shared `bins.strictly_increasing` validator checks only that edges are finite and strictly increasing. The exact-zero-edge requirement, the no-straddle rule, and out-of-range coverage under `reject` are normative here and are not mechanically enforced.",
      "The shared node-universe validators read one `data.nodeUniverse`; this figure has a two-sided `sourceUniverse` x `targetUniverse` rectangle, so they are not applied. Universes are required complete and their ids checked by `ids.unique`, but per-side endpoint membership is not mechanically enforced.",
      "`topology.multapse_aggregation_declared` has no `observationUnit` awareness and would reject a legitimate per-synapse multapse, so it is not applied. The `node_pair` aggregation requirement and the `no_aggregation` assertion are normative here and not mechanically enforced.",
      "`topology.scope_supports_claim` enforces global-merge rank coverage and the sampling bound only. The scope/observation-unit legality table — `sampled` forbidding `node_pair`, `mpi_target_rank_local` requiring `localTargetUniverseComplete` — is normative here and not mechanically enforced.",
      "`topology.weight_group_compatible` enforces the single-model pooling guard: two or more distinct synapse models may not share one axis undeclared. It does not verify a `declared_comparable_models` set; that comparability claim stays the caller's and is surfaced rather than checked.",
      "Prebinned conservation: `histogram.normalization_consistent` re-derives supplied probability/density values from the counts, but it does not check the conservation identities (sum of counts against the observation totals, or synapse closure). Those are normative here and not mechanically enforced.",
      "`xScale: log` over a non-positive domain is refused at render time; no semantic-stage validator enforces it, so validation accepts such a request and the refusal happens later in the pipeline.",
      "Registry gap: no disclosure id covers `signTreatment: magnitude`, and none covers observations excluded by `outOfRangeWeights`. Both facts reach the derivation receipt, the accessible summary, and the table metadata, but no footer disclosure states them.",
      "PRE_BINNED_INPUT's registry text says the raw EVENTS were not observed. Here it means the raw connection rows. The fact it discloses is correct; only the noun is borrowed.",
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
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
      "DOWNSAMPLED_FOR_RENDERING",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 200000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "matrix_value_quantize"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
    },
    "uncertaintySupport": [
      "none"
    ],
    "accessibility": {
      "summaryTemplate": "Synaptic weight matrix over a declared node universe of {nodeCount} nodes; rows are targets (postsynaptic), columns are sources (presynaptic). {valuedCellCount} cells carry a weight aggregate, {presentWithoutValueCellCount} hold connections whose weight is missing, {absentCellCount} have no observed connection, {unobservedCellCount} were not observed under this scope. Aggregate: {aggregation} over {connectionCount} connections in {weightUnit}, from {aggregateMin} to {aggregateMax}. Comparability: {synapseModelGroupStatement}. Colour scale: {colorScaleStatement}. Scope: {scopeStatement} at {snapshotTime}. {multapseStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "targetId",
          "header": "Target (row)",
          "description": "The postsynaptic node. Rows are targets; this is fixed by the contract and is not caller-configurable."
        },
        {
          "key": "sourceId",
          "header": "Source (column)",
          "description": "The presynaptic node. Null on an unobserved-row record, where the record stands for the entire row."
        },
        {
          "key": "cellState",
          "header": "Cell state",
          "description": "valued | present_without_value | absent | unobserved. Absent means no connection was observed under a scope that can support an absence claim. Unobserved means the scope cannot support one. Neither is a zero."
        },
        {
          "key": "aggregate",
          "header": "Weight aggregate",
          "description": "The named aggregate of the contributing weights, to full binary64 precision. Empty when the cell is not valued."
        },
        {
          "key": "aggregation",
          "header": "Aggregation",
          "description": "The declared formula. There is no default and no 'last edge wins'."
        },
        {
          "key": "weightUnit",
          "header": "Unit",
          "description": "A `nest:weight` unit is simulator-defined: it has no SI mapping and is never converted or compared across systems."
        },
        {
          "key": "contributingConnectionCount",
          "header": "Connections",
          "description": "How many connection rows map to this cell. Greater than 1 means the colour is an aggregate over multapses, not a synapse."
        },
        {
          "key": "contributingWeightCount",
          "header": "Weights used",
          "description": "How many of those connections had a finite weight. This is the denominator of `mean`; it differs from the connection count when any weight is missing."
        },
        {
          "key": "weightMin",
          "header": "Min weight",
          "description": "The smallest contributing weight. With the max and the count, this is the only route to the spread the single cell colour conceals."
        },
        {
          "key": "weightMax",
          "header": "Max weight",
          "description": "The largest contributing weight. A cell whose min is negative and whose max is positive contains cancelling synapses."
        },
        {
          "key": "synapseModels",
          "header": "Synapse model(s)",
          "description": "The distinct declared models contributing to the cell, and the caller-declared comparability group (synapseModelGroup) under which they were pooled, if any."
        },
        {
          "key": "contributingEdgeIds",
          "header": "Contributing edge ids",
          "description": "The stable ids of every contributing connection, or a digest-bound sidecar reference to them. Declared edge ids are preserved; absent ones become deterministic ordinals assigned after the canonical sort."
        },
        {
          "key": "scope",
          "header": "Scope",
          "description": "The snapshot scope and time this cell was observed under."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "scipy.sparse.coo_matrix duplicate summation, cross-checked against a NEST GetConnections weight snapshot",
        "version": "scipy 1.14.1; NEST 3.10.0",
        "status": "not_run",
        "notes": "coo_matrix sums duplicate (row, col) entries when converted to CSR or dense, which makes it an exact differential oracle for `aggregation: sum` and for NOTHING else: it has no mean, min, max, or no_aggregation semantics, and it maps an absent cell to 0.0 — the precise conflation this contract exists to prevent. The comparison is therefore valid only on the present cells and only under `sum`, and the absent-cell handling must be excluded before it is meaningful. Orientation must be pinned explicitly (row = target, col = source) because coo_matrix takes (row, col) positionally and a transposed oracle would agree on every symmetric fixture. The pinned reference environment has NOT been executed here, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.weight_matrix"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "This figure models the weight matrix over a SINGLE declared node universe: rows are targets and columns are sources, both indexed by that universe (a recurrent population's square matrix; a disjoint source/target set is expressed by listing the union). A bipartite projection with two separately declared, differently ordered universes is not offered, because the topology validators read one `data.nodeUniverse`, and a two-universe shape would leave endpoint-in-universe and universe-completeness unenforced. Registry gap.",
      "The diverging colour-domain straddle rule — a diverging scale requires contributing weights on both sides of the centre — is enforced only at the RENDER stage (RENDER_DIVERGING_SCALE_NO_CENTER). The request-validation pipeline has no semantic validator for it, so no living request-level invalid fixture asserts it. Registry gap.",
      "`count_weighted_mean` is named conditionally in the blueprint but is not defined in the multapse-aggregation registry, so it is not offered. Registry gap: it needs a precise definition before any implementation may accept it.",
      "`synapseModelGroup` records a caller-declared comparability claim. Cortexel verifies only that the group was DECLARED when two or more distinct synapse models are present (topology.weight_group_compatible checks presence, not content). It cannot verify that the declared group's model set exactly matches the models in the snapshot, nor that two synapse models' weights are actually comparable — both stay attributed to the caller. No registered disclosure id carries the claim, so it is surfaced through the accessible summary and the synapse-model table column. Registry gap.",
      "A `nest:weight` value has no SI meaning. Cortexel never converts, compares, or pools it across simulators, and it cannot check that the number means what the caller believes.",
      "Under `mpi_target_rank_local` Cortexel cannot enumerate the rank's local target set, so an entirely empty row is reported as unobserved. This is conservative: it never asserts an absence it cannot support, and it therefore never confirms one either.",
      "No colour-domain clamping parameter is offered, because no registered disclosure could carry a saturated-cell fact. The domain is always the extent of the finite aggregates.",
      "Within-cell dispersion is not drawn. A cell is one colour; the spread of its contributing weights is reachable only through the count and min/max table columns.",
      "Axis tick labels are thinned above a bounded row/column count. Thinning a LABEL never removes a cell: every row and column stays individually addressable in the table and the sidecar.",
      "The matrix is materialized sparsely. A dense export of a node universe beyond the profile's matrix-cell limit is refused rather than streamed."
    ]
  },
  "neuro.analog_trace": {
    "id": "neuro.analog_trace",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
          "pointer": "/data/window"
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
      "DOWNSAMPLED_FOR_RENDERING",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2000000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "line_envelope_minmax"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
          "description": "The caller's stable id from the seriesIds vector. Unique across the request."
        },
        {
          "key": "seriesLabel",
          "header": "Label"
        },
        {
          "key": "quantityKind",
          "header": "Quantity",
          "description": "The declared kind. `membrane_voltage` is a claim the caller made, not one Cortexel verified."
        },
        {
          "key": "observationKind",
          "header": "Observation",
          "description": "point_sample (joined by segments) or piecewise_constant (held, drawn as steps)."
        },
        {
          "key": "origin",
          "header": "Origin",
          "description": "recorded, or derived with the method that produced it. A derived value is never presented as a recorded one."
        },
        {
          "key": "time",
          "header": "Time",
          "description": "In the window's declared unit, after any recorded conversion."
        },
        {
          "key": "timeUnit",
          "header": "Time unit"
        },
        {
          "key": "value",
          "header": "Value",
          "description": "Empty when the observation is missing. A missing observation is not zero."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "description": "The unit actually drawn, after any conversion. The original unit is preserved in the artifact."
        },
        {
          "key": "missing",
          "header": "Missing",
          "description": "true when this observation was null in the source."
        },
        {
          "key": "replicateCount",
          "header": "Replicates",
          "description": "How many samples at this timestamp produced this row. 1 for a single observation; greater than 1 means the row is an aggregate."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        },
        {
          "key": "uncertaintyMethod",
          "header": "Uncertainty method",
          "description": "The variant, level, and basis. A dispersion is never relabelled as an interval."
        },
        {
          "key": "sourceOrdinal",
          "header": "Source row",
          "description": "The sample's index in the caller's original array, before stable sorting. Every drawn point can be traced back to the row it came from."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "neo.AnalogSignal",
        "version": "0.13.0",
        "status": "not_run",
        "notes": "Neo is the intended differential oracle for the adapter path only. Neo's AnalogSignal models a REGULARLY sampled signal (t_start plus sampling_rate), while this contract models explicit (time, value) pairs that may be irregular; a comparison is therefore meaningful only for regular sampling, and the expansion of t_start/sampling_rate into an explicit time vector must be matched to the last representable binary64 step before the comparison means anything. Neo has no equivalent of the duplicate-time policy or the missing-value break, so those paths have no oracle and rest on the hand vectors. The pinned reference environment has NOT been executed in this environment: the status is not_run, and it is not to be reported as anything else."
      }
    },
    "legacyIds": [
      "nest.voltage_trace"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Registry 1.0 has no disclosure for a `derived` series, for the segment drawn between point samples, or for partial window coverage, though the blueprint asks for all three. Those facts reach the artifact, table and summary but raise no footer disclosure. The rules belong in the registry.",
      "Per-sample out-of-window exclusion has NO semantic validator in registry 1.0: events.within_window reads data.eventTimes, an events shape an analog trace does not carry, so it is not declared here. The exclusion count, its attribution, and the empty-panel refusal live in the render plan. A trace-shaped within-window validator would close this.",
      "series.equal_length has no index-wildcard pointer in registry 1.0, so the per-series time/value length checks are declared as an explicit enumeration of concrete indices (0..15), capping the figure at 16 series. ids.unique reads one flat id array, so series identity is declared in a single data.seriesIds vector rather than inside each series object.",
      "Uncertainty is declared once at parameters.uncertainty (figure-level): uncertainty.valid and uncertainty.supported_variant read a single top-level object, so per-series uncertainty bands are outside the registry-1.0 validator surface and would need a per-series uncertainty validator.",
      "Registry 1.0 binds `derivative` to the per_time dimension, so a dimensioned derivative such as dV/dt (mV/ms) cannot be expressed. Calling it dimensionless or inventing a unit would be a false statement about the dimension, so the trace is refused. A `voltage_per_time` dimension would close this.",
      "Only extrema-preserving compaction is accepted (`none`, `line_envelope_minmax`), so a one-sample transient always survives and COMPACTION_MAY_HIDE_TRANSIENTS can never fire here. The envelope is still not a resampled signal: marks drawn are not samples taken, and exact values come from the table.",
      "Cortexel can verify that a unit's dimension matches its declared kind. It cannot verify that the channel was what the caller says it was, that a gain or reference was applied correctly upstream, or that a `derived` series was produced by the method it names.",
      "Nothing in this figure can recover a feature shorter than the sampling interval. Cortexel discloses the samples it was given; it cannot disclose what the sampler never saw."
    ]
  },
  "neuro.compartment_trace": {
    "id": "neuro.compartment_trace",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
        "id": "window.valid",
        "parameters": {
          "pointer": "/data/window"
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
      "DOWNSAMPLED_FOR_RENDERING",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2000000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "line_envelope_minmax",
        "matrix_value_quantize"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
          "header": "Cell"
        },
        {
          "key": "rowIndex",
          "header": "Row",
          "description": "Position on the compartment axis, in the declared order. It is not an anatomical coordinate."
        },
        {
          "key": "compartmentId",
          "header": "Compartment"
        },
        {
          "key": "compartmentLabel",
          "header": "Compartment label"
        },
        {
          "key": "parentCompartmentId",
          "header": "Parent",
          "description": "Empty for a root. Declared by the caller; Cortexel does not reconstruct the tree."
        },
        {
          "key": "pathDistance",
          "header": "Path distance",
          "description": "As declared. Empty is empty — it is never 0, because 0 is the soma."
        },
        {
          "key": "pathDistanceUnit",
          "header": "Distance unit"
        },
        {
          "key": "recorded",
          "header": "Recorded",
          "description": "`no` means the compartment was declared but never recorded. That is not the same fact as a missing sample."
        },
        {
          "key": "signalId",
          "header": "Signal"
        },
        {
          "key": "time",
          "header": "Time"
        },
        {
          "key": "timeUnit",
          "header": "Time unit"
        },
        {
          "key": "value",
          "header": "Value",
          "description": "The sample as supplied. Empty means missing; it is never drawn or tabulated as zero."
        },
        {
          "key": "unit",
          "header": "Unit"
        },
        {
          "key": "missing",
          "header": "Missing",
          "description": "true when this observation was null in the source. Distinct from `recorded: no`, which means the compartment has no series at all."
        },
        {
          "key": "sourceOrdinal",
          "header": "Source row",
          "description": "The sample's index in the caller's original array, before the within-series stable sort."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "nest cm_default multicompartment recorder",
        "version": "3.10.0",
        "status": "not_run",
        "notes": "The derivation is near-identity, so the oracle's job is not to check arithmetic: it is to pin the RECORDER-to-CONTRACT mapping. NEST records compartment state under positional keys (v_comp0, v_comp1, ...) whose index is the compartment's position in the model's compartment list; the oracle fixture exists to prove that the adapter binds each key to a declared compartment id rather than to a row position. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
      }
    },
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
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
    "title": "Oriented lag correlogram between two event trains",
    "canonicalQuestion": "How many ordered (reference, target) event pairs fall at each lag, or what normalized lag statistic follows from those pairs, under a fixed lag orientation, an explicit zero-lag bin, a declared self-pair treatment, and a denominator that is stated rather than assumed?",
    "cannotEstablish": [
      "That either train drives the other. A peak at +2 ms is equally consistent with a monosynaptic connection, a common input arriving with different conduction delays, and a shared oscillation. A correlogram cannot separate them.",
      "That a peak is larger than chance. This figure draws no significance band and computes no surrogate, jitter, or shift predictor. The expected count under independence depends on both firing rates and on any nonstationarity, none of which it estimates.",
      "Anything from the symmetry of an autocorrelogram. Forming both ordered pairs of every distinct event pair makes value(-lag) = value(+lag) by construction, up to the bin-edge rule below. The symmetry is a property of the algorithm, not evidence about the neuron.",
      "Fine-timescale synchrony when the two firing rates co-vary slowly across the window. Slow co-modulation produces a broad central peak that is not spike synchrony, and pooling every pair in the window cannot tell the two apart.",
      "Single-neuron refractoriness or bursting from a pooled multi-unit train. A pooled autocorrelogram counts cross-neuron coincidences as pairs, so its central region is not a refractory trough.",
      "That no coupling exists because no peak is visible. The bin width sets the temporal resolution: coupling jittered on a finer scale than the bin is smeared away, and weak coupling can sit inside the sampling noise of the counts.",
      "How self-pairs were treated, from the height of the centre bin. The treatment is recorded from what the algorithm actually did; it is never inferred from a zero-valued or a tall centre bin.",
      "That the two trains were really observed over the declared window. Cortexel sees events, never recording extent. A window that overstates the recording inflates every eligible-reference denominator and depresses the rate."
    ],
    "renderer": {
      "id": "figure.correlogram",
      "revision": 1
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
          "pointer": "/data/window"
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
        "id": "correlogram.lag_range_valid"
      },
      {
        "id": "correlogram.statistic_denominator"
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
      "LAG_ORIENTATION",
      "ZERO_LAG_SELF_PAIRS_EXCLUDED",
      "PRE_BINNED_INPUT",
      "EVENTS_EXCLUDED_OUT_OF_WINDOW",
      "MISSING_VALUES_PRESENT",
      "UNCERTAINTY_NOT_PROVIDED",
      "UNIT_CONVERTED",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 500000,
      "maxVisibleMarks": 20001,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "Correlogram ({correlationKind}) of target {targetLabel} relative to reference {referenceLabel}. Positive lag means the target follows the reference. Lag axis {lagMin} to {lagMax} {lagUnit} in {binCount} bins of {binWidth} {lagUnit}; the zero-lag bin is centred on zero and spans {zeroBinStart} to {zeroBinEnd} {lagUnit}. Statistic: {statistic} in {valueUnit}. Denominator: {denominatorStatement}. {referenceEventCount} reference events and {targetEventCount} target events over {observationDuration} {timeUnit}. {pairsCounted} pairs counted; {pairsOutsideLagRange} pairs fell outside the lag range and are not counted. Self-pair treatment: {selfPairStatement}. Edge correction: {edgeCorrection}. Values range from {valueMin} to {valueMax}. {uncertaintyStatement}",
      "tableColumns": [
        {
          "key": "lagBinStart",
          "header": "Lag bin start",
          "description": "Inclusive lower edge: centre minus half a bin width."
        },
        {
          "key": "lagBinCenter",
          "header": "Lag centre",
          "description": "The lag this bin is centred on. Positive means the target follows the reference."
        },
        {
          "key": "lagBinEnd",
          "header": "Lag bin end",
          "description": "Exclusive upper edge, except for the final bin."
        },
        {
          "key": "pairCount",
          "header": "Pairs",
          "description": "Exact integer count of ordered (reference, target) pairs whose lag falls in this bin. This is the raw observation everything else is derived from."
        },
        {
          "key": "eligibleReferenceEvents",
          "header": "Eligible reference events",
          "description": "Reference events whose lag-shifted bin lies inside the observation window. Equal to the reference event count when the edge correction is none."
        },
        {
          "key": "denominator",
          "header": "Denominator",
          "description": "The exact denominator used for this bin under the declared statistic. Empty for raw_pair_count and weighted_pair_sum, which have none."
        },
        {
          "key": "value",
          "header": "Value",
          "description": "Re-derived and verified from the pair count and the denominator. Empty where the denominator is zero and the statistic is undefined."
        },
        {
          "key": "valueUnit",
          "header": "Unit"
        },
        {
          "key": "sampleCount",
          "header": "Overlap bins (n)",
          "description": "The number of overlapping bin pairs used for a Pearson coefficient at this lag. Empty for the other statistics."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "elephant.spike_train_correlation.cross_correlation_histogram",
        "version": "1.2.1",
        "status": "not_run",
        "notes": "Elephant's CCH is the intended differential oracle, but it is only an oracle once the conventions are reconciled parameter for parameter: it correlates BinnedSpikeTrains rather than enumerating event pairs, its `window` is expressed in bins, its `border_correction` is the classical triangular correction that this contract deliberately does not offer, and `cross_correlation_coefficient=True` normalizes over the whole train rather than over the valid overlap. Until every one of those is matched bin for bin, agreement would be luck and disagreement would be uninformative. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.correlogram"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "The pairwise budget is the binding limit, not the observation limit: two trains of about 7,000 events each already reach the standard profile's 50,000,000-pair preflight bound, and larger trains are refused rather than attempted.",
      "The unit registry has no code for the product of two simulator-defined weights. A weighted_pair_sum is carried under `nest:weight`, whose simulator_defined dimension forbids conversion and pooling, but that code understates it: the quantity is a weight SQUARED in the simulator's terms.",
      "No disclosure id exists for a pooled multi-unit train. The pooled sender universe is stated in the summary and the table, but no mandatory footer line announces that an autocorrelogram is multi-unit; the registry gap is recorded rather than papered over with a caller note.",
      "No disclosure id exists for a pre-binned histogram whose source kept its self-pairs, so such input is refused outright instead of being drawn with a caveat that the registry cannot express.",
      "The figure refuses to compact. Merging adjacent lag bins would widen the bin width, which IS the scientific parameter of a correlogram: a 1 ms coincidence peak merged into 5 ms bins becomes a broad hump indistinguishable from slow rate co-modulation. Oversized lag axes are refused, not summarized.",
      "Pre-binned input cannot be re-binned or re-oriented. Cortexel checks the arithmetic that connects the counts to the values; it cannot check that the source binned or oriented them the way the request declares.",
      "A correlogram is a co-occurrence statistic. Connectivity, causality, and significance are outside it, and Cortexel adds no significance band that would suggest otherwise.",
      "The pre-binned rate check reuses the shared rate vocabulary: recordedSenderCount carries the per-reference-event denominator and normalization its form, so rate.verify_normalization re-derives target_rate_per_reference_event from the integer pair counts.",
      "Raw events are supplied as one pooled, window-shared stream (eventTimes, eventSenderIds, recordedSenderIds) with the reference and target event counts declared separately; the auto/cross distinction is a data-shape fact, not a caller-selected mode."
    ]
  },
  "neuro.isi_distribution": {
    "id": "neuro.isi_distribution",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
          "pointer": "/data/window"
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
        "id": "isi.zero_interval_policy"
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
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2000000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "histogram_merge_adjacent"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "Inter-spike interval distribution for {selectionLabel}. {intervalCount} intervals formed within {trainCount} trains ({senderCount} senders x {trialCount} trials) from {spikeCount} spikes in the window {windowStart} to {windowStop} {timeUnit}. Intervals are formed only between successive spikes of the same train. {trainsWithoutIntervalCount} trains produced no interval. {excludedOutOfWindowCount} spikes fell outside the window. {binCount} bins span {binMin} to {binMax} {intervalUnit} on a {xScale} axis; {underRangeCount} intervals fell below and {overRangeCount} above that range. Normalization: {normalization}, values in {valueUnit}. No interval longer than {windowDuration} {timeUnit} can be observed. {zeroIntervalStatement} {uncertaintyStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "binStart",
          "header": "Bin start",
          "description": "Inclusive lower edge, in the declared bin unit."
        },
        {
          "key": "binEnd",
          "header": "Bin end",
          "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive."
        },
        {
          "key": "binWidth",
          "header": "Bin width",
          "description": "The LINEAR width. It is the width used by the density denominator even when the axis is logarithmic."
        },
        {
          "key": "binUnit",
          "header": "Bin unit"
        },
        {
          "key": "count",
          "header": "Intervals",
          "description": "Exact integer count of intervals in this bin. This is the raw observation everything else is derived from; an empty bin is a measured zero, not missing data."
        },
        {
          "key": "probability",
          "header": "Probability",
          "description": "count / binned-interval total. Present only when normalization is probability."
        },
        {
          "key": "density",
          "header": "Density",
          "description": "count / (binned-interval total x linear bin width). Present only when normalization is density."
        },
        {
          "key": "densityUnit",
          "header": "Density unit",
          "description": "The reciprocal of the bin unit, e.g. /ms for millisecond bins."
        },
        {
          "key": "binnedIntervalCount",
          "header": "Binned intervals",
          "description": "The denominator. N_binned: the formed intervals that fell inside the bin range. Constant across rows. Without it, probability and density cannot be checked against count from the table alone."
        },
        {
          "key": "formedIntervalCount",
          "header": "Formed intervals",
          "description": "Every interval formed within a train, including any the bin range excluded. It equals the denominator ONLY when no interval fell out of range; when it does not, the plotted probabilities describe a subset."
        },
        {
          "key": "underRangeCount",
          "header": "Below bin range",
          "description": "Formed intervals below the first edge, excluded under outOfRangeIntervals: exclude_and_report. Never binned, never clipped into the first bin."
        },
        {
          "key": "overRangeCount",
          "header": "Above bin range",
          "description": "Formed intervals above the last edge, excluded under outOfRangeIntervals: exclude_and_report. Never binned, never clipped into the final bin."
        },
        {
          "key": "trainCount",
          "header": "Trains",
          "description": "Every train in the (selected senders x declared trials) universe, INCLUDING trains that produced no interval. An ISI histogram assembled from 3 of 200 trains is a figure about 3 neurons."
        },
        {
          "key": "spikeCount",
          "header": "In-window spikes",
          "description": "The in-window spikes the intervals were formed from. A train with k in-window spikes yields exactly max(k - 1, 0) intervals — never k."
        },
        {
          "key": "excludedOutOfWindowCount",
          "header": "Spikes excluded (window)",
          "description": "Spikes outside the declared window. They form no interval and are never clipped to the boundary; the right tail is censored by the window, not by the neuron."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "elephant.statistics.isi",
        "version": "1.2.1",
        "status": "not_run",
        "notes": "Elephant's isi() takes successive differences within ONE Neo SpikeTrain, which is the same within-train rule this contract fixes; it returns n-1 intervals for n spikes. Before the comparison means anything, three conventions must be matched parameter for parameter: Elephant does not partition by sender (the caller must present one SpikeTrain per train), it applies no bin-range exclusion, and its t_start/t_stop must be aligned to this contract's half-open window so that boundary-straddling intervals are absent on both sides rather than only on ours. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.isi_distribution"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "The distribution is right-censored by the window. Intervals whose preceding or following spike lies outside it are never formed, so no interval longer than the window can appear and long ones are under-represented. Cortexel discloses the window; it cannot correct the censoring.",
      "The figure is a pooled mixture. Rate heterogeneity across senders inflates the apparent irregularity of the pooled distribution, so a CV or a heavy tail read off this figure is a property of the mixture, not of any neuron in it.",
      "Cortexel does not select bin edges. It records the choice and verifies the normalization; the choice remains the caller's, and it can change what the figure appears to show.",
      "A logarithmic COUNT axis is not offered. An empty bin is a measured zero and has no representable position on a log axis, and the disclosure registry has no rule covering its omission — so the figure declines rather than draw a bar that silently disappears.",
      "Stage boundary: request-stage validation checks bin-edge monotonicity, window validity, id uniqueness, sender and trial-universe membership, unit dimension, undeclared zero-interval policy, and parallel-array length. The invalid examples exercise exactly these.",
      "Value-level checks over SUPPLIED intervals — sign, magnitude against the window, and reconciliation against per-train spike counts — run in the DERIVATION stage after a request is structurally and semantically valid, so they carry no request-stage invalid vector here. The within-train stable sort also makes SCIENCE_NEGATIVE_INTERVAL unreachable for well-formed numeric event input.",
      "Registry gap: the error registry has no dedicated code for formed intervals falling outside the declared bin range. At derivation, SCIENCE_BIN_EDGES_INVALID is reused as the closest registered code; a future SCIENCE_BIN_RANGE_INCOMPLETE would be more precise. At request stage the same code is produced directly by non-increasing bin edges.",
      "Registry gap: the error registry has no dedicated code for an interval count that contradicts its train's spike count. At derivation, SEMANTIC_LENGTH_MISMATCH is reused, which is accurate about the count disagreement but does not name the science. At request stage the same code is produced directly by a sender-linkage array of the wrong length.",
      "Registry gap: the disclosure registry has no rule for `mode: intervals` (raw spike times not observed) or for intervals excluded by outOfRangeIntervals. PRE_BINNED_INPUT is deliberately NOT reused: its text would state something false. Those facts ride in the receipt, table, and summary instead.",
      "Registry gap: ids.unique takes array pointers only, so the composite (senderId, trialId) uniqueness of `trains` is specified normatively in scopeRules and needs a validator-parameter extension before it is mechanically enforced.",
      "Trial-universe completeness is asserted by the caller declaring the full trialIds list; no structural flag or validator mechanically confirms completeness, so an incomplete list would understate the train count without being caught at the request stage.",
      "The log-scale nonpositive-domain refusal (RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN) is a render-stage check and never a request-stage semantic error, so it has no request-stage invalid vector."
    ]
  },
  "neuro.multisignal_trace": {
    "id": "neuro.multisignal_trace",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
          "pointer": "/data/window"
        }
      },
      {
        "id": "window.valid",
        "parameters": {
          "pointer": "/parameters/normalization/statisticsWindow"
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
      "DOWNSAMPLED_FOR_RENDERING",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2000000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "line_envelope_minmax"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
          "header": "Series"
        },
        {
          "key": "seriesLabel",
          "header": "Label"
        },
        {
          "key": "entityId",
          "header": "Entity",
          "description": "The entity the signal was recorded from."
        },
        {
          "key": "entityKind",
          "header": "Entity kind"
        },
        {
          "key": "compartmentId",
          "header": "Compartment"
        },
        {
          "key": "pathwayId",
          "header": "Pathway",
          "description": "The declared signalling pathway or projection. Recorded verbatim; never inferred from a variable name."
        },
        {
          "key": "variableId",
          "header": "Variable",
          "description": "The source model's own name for the variable. A quantity kind alone cannot distinguish calcium from IP3: both are concentrations."
        },
        {
          "key": "panelId",
          "header": "Panel"
        },
        {
          "key": "observationKind",
          "header": "Observation kind",
          "description": "point_sample (joined by a straight segment) or piecewise_constant (held to the next sample and drawn as a step)."
        },
        {
          "key": "origin",
          "header": "Origin",
          "description": "recorded or derived. A derived series is never presented as a recorded one."
        },
        {
          "key": "originMethod",
          "header": "Derivation method",
          "description": "The caller-declared algorithm behind a derived series. Cortexel records and displays it; it never re-derives or verifies it."
        },
        {
          "key": "recordedTime",
          "header": "Recorded time",
          "description": "AS SUPPLIED, before any declared offset. The raw time the source reported."
        },
        {
          "key": "timeOffset",
          "header": "Declared offset",
          "description": "The offset added to the recorded time to place this series on the display clock. Zero under `same_clock`, where no offset may be declared at all."
        },
        {
          "key": "time",
          "header": "Time",
          "description": "On the display clock, after any declared offset. recordedTime + timeOffset."
        },
        {
          "key": "timeUnit",
          "header": "Time unit"
        },
        {
          "key": "value",
          "header": "Value",
          "description": "AS SUPPLIED, before any panel unit conversion or overlay normalization. This is the raw observation everything drawn is derived from."
        },
        {
          "key": "unit",
          "header": "Unit",
          "description": "The unit as supplied."
        },
        {
          "key": "displayValue",
          "header": "Drawn value",
          "description": "The value as drawn: converted into the panel unit, or mapped to a dimensionless ratio under normalized_overlay."
        },
        {
          "key": "displayUnit",
          "header": "Drawn unit"
        },
        {
          "key": "missing",
          "header": "Missing",
          "description": "true when the observation is absent. It is never drawn as zero and never interpolated across."
        },
        {
          "key": "replicateCount",
          "header": "Replicates",
          "description": "How many supplied samples share this timestamp. 1 unless duplicates were kept or aggregated; an aggregate row states how many replicates it combines."
        },
        {
          "key": "uncertaintyKind",
          "header": "Uncertainty kind"
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        },
        {
          "key": "uncertaintyMethod",
          "header": "Uncertainty method",
          "description": "The declared method and level of an interval variant. An interval with no method is never drawn as one."
        },
        {
          "key": "sourceRowIndex",
          "header": "Source row",
          "description": "The original ordinal in the caller's array, retained through stable sorting so any drawn point can be traced back to the row it came from."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "neo.AnalogSignal.rescale + scipy.stats.zscore",
        "version": "neo 0.13.1 / scipy 1.14.1",
        "status": "not_run",
        "notes": "Neo is the intended differential oracle for unit rescaling and SciPy for the z-score. The conventions must be matched parameter for parameter before the comparison means anything: scipy.stats.zscore defaults to ddof = 0 while this contract specifies the sample standard deviation (ddof = 1), and the two disagree by a factor sqrt(N/(N-1)) — 5.4% at N = 10. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.astrocyte_dynamics"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Panel membership (a series' panelId names a declared panel; a declared panel holds at least one series) has no semantic validator in this build, so an undeclared panelId or an empty declared panel is not refused during request validation. A `trace.panel_membership_declared` validator should own it.",
      "`ids.unique` reads one flat identifier array, but this figure's series ids and panel ids live inside arrays of objects (data.series[].seriesId, parameters.panels[].panelId). No resolvable pointer exists, so the validator was removed; series-id and panel-id uniqueness are unenforced until the registry gains object-array pointer support.",
      "`series.equal_length` resolves concrete JSON Pointers, not index wildcards, so its groups are enumerated per series index (0..3). A length mismatch in a later series index would not be caught until the registry adopts index-wildcard pointers.",
      "`uncertainty.valid` and `uncertainty.supported_variant` read a single top-level parameters/data uncertainty; this figure carries uncertainty PER SERIES, which those validators do not traverse. Both were removed and per-series uncertainty is validated only structurally, pending a per-series uncertainty validator.",
      "Because `unit.dimension_match` treats any {kind,unit} object as a physical quantity, a series uncertainty that carries a unit and a non-quantity kind (standard_deviation, confidence_interval, ...) is rejected as a dimension mismatch. Only kind:none series uncertainties validate until the walker excludes uncertainty nodes.",
      "A non-positive `divide_by_baseline_mean` denominator is described by the science but has no semantic validator in this build, so a sign-flipping baseline is not refused at validation time. A normalization validator should own SCIENCE_DENOMINATOR_INVALID for this figure.",
      "Log/symlog domain checks and the empty-panel RENDER_NO_DATA check belong to the render stage, which request validation does not reach; a non-positive log domain is not refused during validation.",
      "Cortexel can verify that a unit's dimension matches its declared kind. It cannot verify that a channel was what the caller says it was, or that a `derived` series was produced by the method it names.",
      "Cortexel cannot verify that two recorders shared a clock. `same_clock` is a caller declaration; all Cortexel can do is refuse to draw signals on one time axis unless the caller states which clock they are on.",
      "Series may be sampled at different intervals. Cortexel never resamples onto a common grid, so a vertical alignment must not be read finer than the coarser series' sampling interval.",
      "`line_envelope_minmax` compacts each series independently. Each series' drawn shape survives, but the drawn samples of two series are no longer paired; read paired values from the table.",
      "Two signals of the same dimension but different species (calcium and IP3 are both concentrations) may legally share an axis. Cortexel cannot know they are different molecules, which is why every series must declare a variableId, so the legend and the table can."
    ]
  },
  "neuro.phase_plane": {
    "id": "neuro.phase_plane",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 250000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
    },
    "uncertaintySupport": [
      "none"
    ],
    "accessibility": {
      "summaryTemplate": "Phase plane: {yLabel} ({yUnit}) against {xLabel} ({xUnit}). {trajectoryCount} trajectories, {trajectoryPointCount} points, times {timeStart} to {timeStop} {timeUnit}, running {timeDirection} along the supplied order; arrowheads mark increasing model time. Vector field: {fieldSampleCount} samples, {latticeKind}, over x {xDomainStart} to {xDomainStop} {xUnit} and y {yDomainStart} to {yDomainStop} {yUnit}; arrow length is a {arrowScalingMode} display normalization, not a physical length; magnitude basis {magnitudeBasis}. {nullclineCount} nullclines and {fixedPointCount} fixed-point annotations, each with a declared method, residual, and convergence status. {missingStatement} {uncertaintyStatement} The path shows where the state went, not how fast; exact values and times are in the table.",
      "tableColumns": [
        {
          "key": "rowKind",
          "header": "Row",
          "description": "trajectory_point, field_sample, nullcline_point, or fixed_point. The four are never merged into one anonymous list of coordinates."
        },
        {
          "key": "elementId",
          "header": "Element",
          "description": "Trajectory id, nullcline curve id, or fixed-point id."
        },
        {
          "key": "time",
          "header": "Time",
          "description": "Trajectory points only, in the declared time unit. This is the only column that distinguishes a fast excursion from a slow one."
        },
        {
          "key": "x",
          "header": "x",
          "description": "The x state coordinate, in the x axis unit. Empty means MISSING, which breaks the path; it never means zero."
        },
        {
          "key": "y",
          "header": "y",
          "description": "The y state coordinate, in the y axis unit."
        },
        {
          "key": "dxdt",
          "header": "dx/dt",
          "description": "Caller-supplied. Cortexel never differentiates a trajectory numerically."
        },
        {
          "key": "dydt",
          "header": "dy/dt"
        },
        {
          "key": "derivativeUnit",
          "header": "Derivative unit",
          "description": "A reciprocal-time code. The FULL unit is the axis unit per this code: `/ms` on an axis in mV means mV per ms, not ms to the minus one."
        },
        {
          "key": "speed",
          "header": "Speed",
          "description": "The magnitude on the declared basis. Axis-normalized speed is a display quantity that depends on the drawn extent; a physical magnitude is present only when both axes share a dimension."
        },
        {
          "key": "method",
          "header": "Method",
          "description": "The named method for a nullcline or fixed point. Blank for measured points."
        },
        {
          "key": "residual",
          "header": "Residual",
          "description": "|dx/dt| and |dy/dt| at a fixed point, or the residual tolerance bounding the derivative along a nullcline."
        },
        {
          "key": "converged",
          "header": "Converged",
          "description": "Re-derived by Cortexel from the residual and the tolerance, not copied from the caller's flag. `no` marks an unconverged candidate, not an equilibrium."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "numpy/scipy FitzHugh-Nagumo reference field and nullcline",
        "version": "numpy 2.1.3 / scipy 1.14.1",
        "status": "not_run",
        "notes": "The intended differential check recomputes the FitzHugh-Nagumo field samples, the analytic V-nullcline, and the Newton fixed point from the published equations, and compares them with the figure's table. It checks the FIXTURE, not Cortexel's derivation: Cortexel integrates nothing and solves nothing, so the hand vectors remain the primary evidence for the parts that are actually Cortexel's - the derivative unit composition (1 mV/ms = 1 V/s exactly, via 1e-3 x 1e3), the axis-normalized speed, the convergence re-derivation from residual and tolerance, and the arrowhead orientation under backward time. The pinned reference environment has not been executed here, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.phase_plane"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "The 1.0 unit registry has no composite state-per-time code (there is no `mV/ms`). A derivative therefore carries only the reciprocal-time factor and inherits its state dimension from its axis. A composite unit dimension is a post-1.0 registry addition.",
      "Because `/s` and `/ms` share the `per_time` dimension, a derivative labelled `/s` whose numbers were computed in `/ms` passes every dimensional check while being wrong by 1000x. No contract can catch this from the values alone.",
      "The semantic-validator registry has no `trajectory.time_monotone` id. Monotonicity against the declared `timeDirection` is enforced at derivation and reported with the closest registered code, SCIENCE_NEGATIVE_INTERVAL, whose name reflects its ISI origin.",
      "There is no registered validator for trajectory-universe membership (`events.sender_universe_declared` is sender-specific and is deliberately not reused). The rule is enforced at the semantic stage and reported as SEMANTIC_UNKNOWN_REFERENCE.",
      "There is no registered validator for the fixed-point convergence re-derivation. It is enforced at derivation and reported as SCIENCE_NORMALIZATION_UNVERIFIABLE, which is the registered code for a derived claim that does not follow from the numbers supplied with it.",
      "`phase_plane.derivative_dimension` only checks that `data.vectorField.dx` and `dy` carry kind `derivative` (SCIENCE_UNIT_DIMENSION_MISMATCH). It does not verify lattice shape (a derivation check); trajectory and fixed-point derivative units are covered by `unit.dimension_match`.",
      "No registered disclosure rule announces the arrow display normalization or an unconverged fixed-point annotation. Both facts reach the artifact, the accessible summary, and the table - but not the footer disclosure list - until such rules are registered.",
      "No registered compaction policy is valid here: `line_envelope_minmax` takes a min/max envelope per pixel column, which would collapse a limit cycle into a filled band. An over-budget figure is refused with RESOURCE_COMPACTION_UNAVAILABLE; arc-length-preserving decimation is post-1.0.",
      "UncertaintyV1 is one-dimensional, so no joint uncertainty region for a point in state space can be expressed. `uncertaintySupport` is therefore `[\"none\"]`, and an ensemble of trajectories must be drawn as trajectories, not as a band.",
      "Cortexel 1.0 does not integrate ODEs, evaluate model equations, compute nullclines, locate fixed points, differentiate trajectories, or draw streamlines. Every such quantity is a caller-supplied sample with a declared method.",
      "A trajectory without recorded times cannot be rendered by this figure. The sample index is not a clock, and substituting it would silently imply uniform sampling.",
      "`trace.axis_dimension_compatible` and `trace.duplicate_time_policy` read a `data.series[]` trace structure this phase plane does not use, so they are not declared. Per-component dimension is covered by `unit.dimension_match`; duplicate-time handling is a derivation concern."
    ]
  },
  "neuro.population_rate": {
    "id": "neuro.population_rate",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
    "title": "Population firing rate over time",
    "canonicalQuestion": "How does the event rate of a declared population change over time, using auditable raw counts and an explicitly declared denominator?",
    "cannotEstablish": [
      "That the recorded senders are representative of any larger population.",
      "That a rate change was caused by any particular input, manipulation, or mechanism.",
      "The rate of neurons that were not recorded. A rate is computed over the DECLARED recorded universe and says nothing about anything outside it.",
      "That a kernel-smoothed estimate reflects a real instantaneous rate rather than the bandwidth that was chosen."
    ],
    "renderer": {
      "id": "figure.population_rate",
      "revision": 1
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
          "pointer": "/data/window"
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
      "SOURCE_AUTHENTICITY_UNVERIFIED",
      "REFERENCE_COMPARISON_NOT_RUN",
      "EVENTS_EXCLUDED_OUT_OF_WINDOW",
      "KERNEL_SMOOTHED_RATE",
      "UNCERTAINTY_NOT_PROVIDED",
      "PRE_BINNED_INPUT",
      "DOWNSAMPLED_FOR_RENDERING",
      "TABLE_EXCERPT_ONLY",
      "UNIT_CONVERTED",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2000000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "line_envelope_minmax"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "Population firing rate for {populationLabel} over {windowStart} to {windowStop} {timeUnit}. {binCount} bins of {binWidth} {timeUnit}. {eventCount} events from {recordedSenderCount} recorded senders. Normalization: {normalization}. Rate ranges from {rateMin} to {rateMax} Hz. {uncertaintyStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "binStart",
          "header": "Bin start",
          "description": "Inclusive lower edge."
        },
        {
          "key": "binEnd",
          "header": "Bin end",
          "description": "Exclusive upper edge, except for the final bin."
        },
        {
          "key": "binWidth",
          "header": "Bin width"
        },
        {
          "key": "count",
          "header": "Events",
          "description": "Exact integer count. This is the raw observation everything else is derived from."
        },
        {
          "key": "recordedSenderCount",
          "header": "Recorded senders",
          "description": "The denominator. Includes senders that never fired."
        },
        {
          "key": "rate",
          "header": "Rate",
          "description": "Derived and verified from the count and the denominator."
        },
        {
          "key": "rateUnit",
          "header": "Unit"
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "elephant.statistics.time_histogram",
        "version": "1.2.1",
        "status": "not_run",
        "notes": "Elephant's time_histogram is the intended differential oracle. Its bin edge and t_stop conventions must be matched parameter for parameter before the comparison means anything. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.population_rate"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Kernel-smoothed rates are estimates whose shape depends on the chosen bandwidth. Cortexel renders what was asked for and discloses the parameters; it does not select a bandwidth for you.",
      "A rate is only as meaningful as the declared recorded universe. Cortexel can verify that the denominator is positive and that events belong to it; it cannot verify that the universe was recorded correctly."
    ]
  },
  "neuro.psth": {
    "id": "neuro.psth",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
    "title": "Peri-event time histogram (trial-aligned event counts)",
    "canonicalQuestion": "How does the event count of a declared set of selected senders vary with time relative to a declared per-trial alignment event, using exact integer counts and an explicitly declared trial and sender denominator?",
    "cannotEstablish": [
      "That the declared alignment times mark the event they are labelled with. Cortexel aligns to the times it is given; it cannot verify that they are stimulus onsets rather than trial starts, or that they were corrected for display latency.",
      "That a modulation around the alignment instant was CAUSED by the aligning event. A PSTH shows temporal coincidence with a declared reference; a stimulus-locked artifact, a periodic background, or a slow drift across the session produce the same shape.",
      "That a response is time-locked rather than latency-jittered. Averaging over trials attenuates a response whose latency varies from trial to trial, so a flat PSTH is not evidence that no response occurred.",
      "That any bin differs significantly from baseline. This contract renders counts, derived values, and declared uncertainty. It performs no test, applies no multiple-comparison correction across bins, and reports no p-value.",
      "The instantaneous rate. A PSTH is an exact count in a finite bin: the height of a peak depends on the bin width that was chosen, and this contract offers no kernel estimate of an underlying intensity function.",
      "The response of senders that were not selected, or of trials that were excluded. Every value is computed over the DECLARED included trials and selected senders and says nothing about anything outside them.",
      "That a bin no included trial covered has a rate of zero. That bin was not observed. It is reported as null, drawn as a gap, and never painted as a measured zero."
    ],
    "renderer": {
      "id": "figure.psth",
      "revision": 1
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
          "pointer": "/data/relativeWindow"
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
      "UNIT_CONVERTED",
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2000000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "histogram_merge_adjacent"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "Peri-event time histogram for {seriesLabel}, aligned to {alignmentLabel} at relative time 0. Relative window {windowStart} to {windowStop} {timeUnit}, {binCount} bins of {binWidth} {timeUnit}. {eventCount} events from {selectedSenderCount} selected senders over {includedTrialCount} included trials, {excludedTrialCount} excluded. Denominator policy: {denominatorPolicy}. Normalization: {normalization}. Values range from {valueMin} to {valueMax} {valueUnit}. {baselineStatement} {missingBinStatement} {excludedEventStatement} {uncertaintyStatement} {compactionStatement}",
      "tableColumns": [
        {
          "key": "binStart",
          "header": "Bin start (relative)",
          "description": "Inclusive lower edge, measured from the alignment instant."
        },
        {
          "key": "binEnd",
          "header": "Bin end (relative)",
          "description": "Exclusive upper edge; inclusive only for the final bin of a closed window."
        },
        {
          "key": "binWidth",
          "header": "Bin width"
        },
        {
          "key": "count",
          "header": "Events",
          "description": "Exact integer count. Null means no included trial covered this bin — it is not a measured zero. This is the raw observation everything else is derived from."
        },
        {
          "key": "trialDenominator",
          "header": "Covering trials",
          "description": "Included trials that fully cover this bin. The denominator for this bin."
        },
        {
          "key": "includedTrialCount",
          "header": "Included trials",
          "description": "Every trial in the analysis. Constant across bins. Under `per_bin_covering_trials` it is the ceiling the covering-trial count is read against, so a bin estimated from fewer trials is visible in the table alone."
        },
        {
          "key": "excludedTrialCount",
          "header": "Excluded trials",
          "description": "Trials recorded, declared, and deliberately excluded. Constant across bins. They enter no numerator and no denominator; the table states them so the denominator basis is readable without the summary."
        },
        {
          "key": "excludedOutOfWindowCount",
          "header": "Events excluded (out of window)",
          "description": "Events whose relative time fell outside the relative window — including one at exactly relStop under the half-open convention — and so entered no bin. Constant across bins. Counted and reported, never silently dropped."
        },
        {
          "key": "selectedSenderCount",
          "header": "Selected senders",
          "description": "Includes senders that never fired. Used only by the per-sender normalization."
        },
        {
          "key": "value",
          "header": "Value",
          "description": "The normalized value, re-derived and verified from the count, the denominator, and the bin width."
        },
        {
          "key": "valueUnit",
          "header": "Unit"
        },
        {
          "key": "baselineCorrectedValue",
          "header": "Value minus baseline",
          "description": "Signed difference from the baseline rate; may be negative. Absent when no baseline was requested. It never replaces the count."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower"
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper"
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "elephant.statistics.time_histogram",
        "version": "1.2.1",
        "status": "not_run",
        "notes": "Elephant's time_histogram is the intended differential oracle for the uniform-denominator policy, with one SpikeTrain per trial. Its conventions must be reconciled parameter for parameter first: its `mean` output divides by the number of SPIKETRAINS, which equals the trial count only when each train pools every selected sender — the exact per-trial versus per-neuron conflation this contract splits into two normalization ids. It also requires the input trains to share t_start and t_stop, so it cannot oracle `per_bin_covering_trials` at all; that policy is covered by hand vectors only. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.psth"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "No BASELINE_CORRECTED disclosure id exists in disclosures.v1.json 1.0, so the baseline window, method, and derived baseline value are surfaced through the deterministic summary and the table rather than through a disclosure rule. A future registry revision should register one.",
      "The unit registry has no `rate_change` quantity kind. A baseline-subtracted value is a signed difference of rates, carried as `firing_rate` in Hz: dimensionally correct, but the kind does not encode that it may be negative. The column is headed \"Value minus baseline\" so it is not read as a rate.",
      "Baseline ratio and z-score modes are not offered. A ratio to baseline is undefined whenever the baseline count is zero — the common case for a sparse neuron — and a z-score needs a dispersion denominator the 1.0 validator registry has no entry for. Cortexel refuses rather than emit an infinity.",
      "`histogram_merge_adjacent` is registered with `appliesTo: [\"distribution\"]`. A PSTH is a binned count over time, but the policy's semantics — merge adjacent bins only, sum raw counts — are what it needs; the tag should be widened. Extrema sampling would drop whole bins and is refused.",
      "Merging is refused when the merged bins do not share a trial denominator: a summed count over a changing exposure has no single rate, and re-deriving one would silently average two different experiments.",
      "Relative times are a binary64 difference of absolute times. At an absolute clock of 1e9 ms the resolution of that difference is about 2.4e-7 ms — far below any realistic bin width — but microsecond bins on a multi-day clock approach that limit, and Cortexel does not currently refuse it.",
      "A per-bin trial denominator means the bins of one figure are not all estimated from the same trials. Each bin's denominator is in the table, but two bins with different denominators are not directly comparable as samples of one thing.",
      "Cortexel validates that a per-bin denominator does not exceed the included-trial count; in prebinned mode it cannot verify that the denominator corresponds to trials that actually covered the bin.",
      "The trial universe is declared columnar: a flat `trialIds` array with a positionally parallel `alignmentTimes`. That is what lets ids.unique read a real array, events.trial_universe_declared read a real universe, and psth.alignment_declared read a real alignment, rather than a `/data/trials/rows/*/id` pointer the pipeline cannot resolve.",
      "Per-trial `included`, `exclusionReason`, and `coverage` metadata are derivation-stage inputs, not fields of this request schema; the semantic layer validates the declared universe, its ids, the alignment, and the denominator, while coverage consistency under `per_bin_covering_trials` is checked when the bins are formed.",
      "`events.within_window` is not declared for this figure: it compares absolute event times against a single absolute `/data/window`, but a PSTH's membership window is RELATIVE and resolved per trial against each alignment time. Relative-window membership and the excluded-event count are enforced at the derivation stage, which owns the alignment.",
      "`rate.verify_normalization` is not declared for this figure: it re-derives count / (recordedSenderCount x binWidth) from a `/data/binEdges` vector — the population-rate denominator — whereas a PSTH divides by a per-bin trial denominator and keeps one authoritative bin vector at `/parameters/bins`. Supplied `rates` are re-derived at the derivation stage instead."
    ]
  },
  "neuro.response_curve": {
    "id": "neuro.response_curve",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
    "title": "Input-response curve across declared conditions",
    "canonicalQuestion": "How does a declared response statistic vary with a declared controlled input across an explicitly declared set of conditions, with every repeat, its sample count, and every exclusion accounted for?",
    "cannotEstablish": [
      "That the input CAUSED the response. Conditions are compared, not randomized; a monotone curve is equally consistent with an uncontrolled covariate that co-varied with condition order (a seed schedule, a warm-up, a parameter changed alongside the input).",
      "The response at any input level that was not run. There is no interpolation between conditions and no extrapolation beyond them; the guide line has no value between two points and is not a prediction.",
      "A threshold, a slope, a gain, a rheobase, or an EC50. Revision 1 renders no fitted model, and a threshold read off a guide line is an artifact of the condition spacing, not a measurement.",
      "That the curve is smooth or monotone between conditions. A response that is strongly non-monotone at an unsampled input would produce exactly this figure.",
      "That the repeats are independent. Repeats sharing a seed, a network realization, or a cell are not n independent samples, and a standard error computed as if they were is too small by an unknown factor. Cortexel records the declared design; it cannot check it.",
      "That a peak response is a property of the system rather than of the bin width or bandwidth used to estimate it. Halving the bin width can roughly double a reported peak rate.",
      "That the response values are raw. Cortexel cannot detect a baseline subtraction, a normalization, or any other transform the caller applied before sending.",
      "That the conditions are comparable. They are usually separate simulation runs, and nothing in this contract can verify that they shared a model, a network realization, or a seed policy."
    ],
    "renderer": {
      "id": "figure.response_curve",
      "revision": 1
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
              "/data/aggregates/response/values",
              "/data/aggregates/sampleCounts",
              "/data/aggregates/excludedCounts",
              "/parameters/uncertainty/values",
              "/parameters/uncertainty/lower",
              "/parameters/uncertainty/upper",
              "/parameters/uncertainty/sampleCount"
            ],
            [
              "/data/observations/conditionIds",
              "/data/observations/repeatIds",
              "/data/observations/response/values",
              "/data/observations/response/audit/eventCounts"
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
          "pointer": "/data/measurementWindow"
        }
      },
      {
        "id": "response_curve.estimator_declared"
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
      "AGGREGATE_WITHOUT_RAW_REPEATS",
      "UNCERTAINTY_NOT_PROVIDED",
      "MISSING_VALUES_PRESENT",
      "UNIT_CONVERTED",
      "TABLE_EXCERPT_ONLY",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 20000,
      "maxVisibleMarks": 50000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
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
      "summaryTemplate": "Response curve {curveLabel}: {responseMethod} in {responseUnit} against {inputLabel} in {inputUnit} on a {inputScale} scale, across {conditionCount} {axisKind} conditions. Estimator {estimator} over {retainedCount} of {attemptedCount} repeats; {excludedCount} repeats had an undefined response and were excluded. Repeat design: {repeatDesign}. Response basis: {responseBasis}. Measurement window {windowStart} to {windowStop} {timeUnit}. Response ranges from {responseMin} to {responseMax} {responseUnit}. {uncertaintyStatement} {aggregationStatement} {lineStatement}",
      "tableColumns": [
        {
          "key": "conditionId",
          "header": "Condition"
        },
        {
          "key": "conditionLabel",
          "header": "Condition label"
        },
        {
          "key": "input",
          "header": "Input",
          "description": "The controlled input level. Empty on an ordinal or nominal axis, which has no numeric input and must not be given one."
        },
        {
          "key": "inputUnit",
          "header": "Input unit"
        },
        {
          "key": "repeatId",
          "header": "Repeat",
          "description": "Present on a raw repeat row. Empty on an aggregate row."
        },
        {
          "key": "response",
          "header": "Response",
          "description": "The measured response of this repeat, or the estimate on an aggregate row."
        },
        {
          "key": "responseUnit",
          "header": "Response unit"
        },
        {
          "key": "responseMethod",
          "header": "Method",
          "description": "What the number is: a mean rate, a peak rate, a first-spike latency, a count, a voltage, or a declared state variable."
        },
        {
          "key": "missing",
          "header": "Undefined",
          "description": "True when the repeat was attempted and its response is undefined. It is never rendered as zero and never removed from the attempted count."
        },
        {
          "key": "estimator",
          "header": "Estimator"
        },
        {
          "key": "sampleCount",
          "header": "n retained",
          "description": "Repeats entering the estimator. Never the attempted count."
        },
        {
          "key": "excludedCount",
          "header": "n excluded",
          "description": "Repeats attempted whose response was undefined."
        },
        {
          "key": "responseBasis",
          "header": "Basis",
          "description": "The bin width or kernel that produced a peak response, and the measurement window otherwise. A peak rate has no value independent of it."
        },
        {
          "key": "uncertaintyKind",
          "header": "Uncertainty"
        },
        {
          "key": "uncertaintyValue",
          "header": "Uncertainty value",
          "description": "The DISPERSION (standard deviation or standard error) for this condition. A dispersion is not an interval: it is reported here and never in the bound columns, because +/- one SD is not a coverage statement."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower",
          "description": "The lower BOUND of an interval variant. Empty for a dispersion."
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper",
          "description": "The upper BOUND of an interval variant. Empty for a dispersion."
        },
        {
          "key": "uncertaintyBasis",
          "header": "Uncertainty basis",
          "description": "What the uncertainty was computed over (trials, neurons, ensemble members, bootstrap draws, replicates), plus the level or quantiles and the method where the variant carries them."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "elephant.statistics.mean_firing_rate",
        "version": "1.2.1",
        "status": "not_run",
        "notes": "Elephant divides the event count of ONE SpikeTrain by (t_stop - t_start); Cortexel additionally divides by the recorded-sender count, so the comparison is only parameter-for-parameter meaningful with recordedSenderCount = 1 and an identical half-open window. scipy.stats.trim_mean is the intended oracle for the trimming convention, where the fraction is removed from EACH tail. The pinned reference environment has NOT been executed here, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.rate_response"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Revision 1 renders no fitted model. Cortexel has no optimizer with which to re-derive a fit, and the disclosure registry has no rule that would mark a caller-supplied fit as unverified — an unmarked fitted line is indistinguishable from measured data, so the figure refuses it.",
      "Revision 1 accepts no baseline subtraction or response normalization. A baseline-corrected response is a different quantity and there is no registered disclosure to mark it; a caller who pre-transforms must say so in source.declaredLimitations, where it is rendered as an unverified caller statement.",
      "The 1.0 registry has no reference-in-universe rule aimable at an arbitrary field; `events.sender_universe_declared` is hard-wired to recordedSenderIds/eventSenderIds, not a condition axis, so it is NOT declared here. A conditionId absent from conditions.ids is therefore not machine-checked in 1.0; `reference.in_universe` is proposed for 1.1.",
      "The registry has no composite-key uniqueness rule, and `ids.unique` enforces only flat whole-array uniqueness. A repeatId legitimately recurs across conditions under a paired design, so `ids.unique` is applied to conditions.ids only; within-condition repeat uniqueness is NOT machine-checked in 1.0 (ids.unique_composite proposed for 1.1).",
      "Per-repeat rate re-derivation is not machine-checked in 1.0: the registry's `rate.verify_normalization` re-derives from bin edges (the population_rate shape) and does not fit a per-repeat window audit, so it is not declared here. `rate.denominator_positive` still checks the recorded-sender denominator is a positive integer; a window-based audit rule is proposed for 1.1.",
      "Unit-bearing uncertainty variants (SD, SE, confidence/quantile interval, ensemble range) are declared supported, but in the 1.0 build `unit.dimension_match` walks the uncertainty object and rejects its variant `kind` as a quantity kind. The living valid examples therefore use `{kind: none}`; excluding that subtree is proposed for 1.1.",
      "The registry has no cross-array value-equality rule. Where the supplied uncertainty carries its own sampleCount it must be elementwise identical to aggregates.sampleCounts — they describe the same repeats — but only the lengths are machine-checked in 1.0.",
      "Cortexel does not re-derive a supplied dispersion from the raw repeats: `uncertainty.valid` checks bounds, ordering, units, lengths, and positive sample counts, not that a supplied standard error equals that of the repeats in the same request. `uncertainty.verify_from_repeats` is proposed for 1.1.",
      "No disclosure rule surfaces a peak response's dependence on the smoothing that produced it. KERNEL_SMOOTHED_RATE cannot be reused: its text asserts a continuous line rather than steps, which is false of a curve. `PEAK_DEPENDS_ON_SMOOTHING` is proposed for 1.1.",
      "Because no such disclosure exists, the peak basis is instead required structurally and surfaced in the deterministic summary and the `responseBasis` table column rather than in the footer.",
      "This figure declares no compaction policy. Above the visible-mark budget it fails rather than thinning repeats: extrema sampling would fabricate an inflated spread, and merging repeats would fabricate measurements that were never run. Supply aggregates instead, and accept the aggregation disclosure."
    ]
  },
  "neuro.spike_raster": {
    "id": "neuro.spike_raster",
    "revision": 1,
    "status": "stable",
    "releaseReady": false,
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
      "revision": 1
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
          "pointer": "/data/window"
        }
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
      "DOWNSAMPLED_FOR_RENDERING",
      "COMPACTION_MAY_HIDE_TRANSIENTS",
      "TABLE_EXCERPT_ONLY",
      "UNIT_CONVERTED",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2000000,
      "maxVisibleMarks": 100000,
      "maxInlineTableRows": 500,
      "compactionPolicies": [
        "none",
        "raster_density_bins"
      ],
      "tablePolicy": "excerpt_inline_with_complete_sidecar"
    },
    "uncertaintySupport": [
      "none"
    ],
    "accessibility": {
      "summaryTemplate": "Spike raster. {eventCount} events, {excludedCount} outside the window, from {activeSenderCount} of {recordedSenderCount} recorded senders across {trialCount} trials, over {windowStart} to {windowStop} {timeUnit}, boundary {windowBoundary}, time base {timeBase}. {rowCount} rows ordered by {rowOrder}; the order is declared and is never sorted by an observed statistic. Sender universe complete: {senderUniverseComplete}. Marks drawn: {markCount}. {compactionStatement} Tick density is not a firing rate, and overlapping ticks are not separately visible; exact event times are in the table.",
      "tableColumns": [
        {
          "key": "sourceRowIndex",
          "header": "Source row",
          "description": "The event's original index in the caller's arrays. This is the audit anchor: sorting for display never changes it."
        },
        {
          "key": "eventId",
          "header": "Event id",
          "description": "Declared id, or the deterministic ordinal identity assigned when none was declared."
        },
        {
          "key": "time",
          "header": "Time",
          "description": "The event time as supplied, after canonical unit conversion."
        },
        {
          "key": "timeUnit",
          "header": "Unit"
        },
        {
          "key": "senderId",
          "header": "Sender"
        },
        {
          "key": "trialId",
          "header": "Trial",
          "description": "Empty when no trials were declared."
        },
        {
          "key": "populationId",
          "header": "Population",
          "description": "Empty when no populations were declared."
        },
        {
          "key": "rowIndex",
          "header": "Row",
          "description": "The row this event was drawn on, in the final row order. Rows with no events appear in the row legend, not here."
        },
        {
          "key": "inWindow",
          "header": "In window",
          "description": "False for an event excluded by the window. Excluded events remain listed: an event removed from the table is an event nobody can find again."
        }
      ]
    },
    "evidence": {
      "handVectors": true,
      "externalOracle": {
        "name": "nest-simulator spike_recorder",
        "version": "3.10.0",
        "status": "not_run",
        "notes": "The intended differential oracle is NEST's own spike recorder, compared fixture for fixture on the conventions that actually differ between implementations: whether an event at exactly `stop` is recorded, whether recorder output is chronological across threads and ranks, and whether a duplicate event row can occur. A secondary parity check imports the same trains through Neo SpikeTrain (t_start/t_stop) and asserts an identical accepted event set. Neither has been executed here: the pinned reference environment has not been run in this environment, so the status is not_run rather than assumed. No claim of oracle agreement may be made until it is."
      }
    },
    "legacyIds": [
      "nest.spike_raster"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "The disclosure registry has no rule keyed to `senderUniverseComplete`, so a declared sender subset appears in the deterministic summary, the artifact, and the table metadata rather than in the disclosure footer.",
      "NODE_UNIVERSE_INCOMPLETE is the nearest existing rule to that gap, but its text is about edges and degree and would be false on a raster, so it is deliberately not emitted. A wrong disclosure is worse than a missing one.",
      "There is likewise no disclosure id for a caller-sampled event set. Rather than emit a rule that does not fit, the contract refuses the sampled value outright.",
      "Cortexel verifies that every event's sender is in the declared universe. It cannot verify that the recorder observed every spike of those senders, so an empty row is evidence of no RECORDED event; reading it as silence rests on the recorder, not on Cortexel.",
      "Below the mark budget every event is drawn, but two events closer than one device pixel overlap. The table count is authoritative; the visible tick count is not, and no figure caption can make it so.",
      "raster_density_bins preserves every event's count but not its individual identity in the drawn image, and does not preserve extrema: a single spike inside a busy tile is not distinguishable. That is exactly why COMPACTION_MAY_HIDE_TRANSIENTS is emitted alongside it.",
      "No uncertainty variant is renderable. An event is an observation, not an estimate, and a band drawn around one would be a fabrication."
    ]
  }
});

/** The stable catalog, in a deliberate discovery order: traces, events, distributions, topology, spatial. */
export const STABLE_SKILL_IDS = [
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
] as const;
export type StableSkillId = (typeof STABLE_SKILL_IDS)[number];

export const EXPERIMENTAL_CAPABILITY_IDS = [
  "experimental.evidence.knowledge_graph",
  "experimental.network.spatial_3d",
  "experimental.neuro.animation_replay"
] as const;

export const REMOVED_CAPABILITY_IDS = [
  "nest.animation_replay",
  "nest.connectivity_matrix",
  "nest.spatial_2d",
  "nest.stimulus_response"
] as const;

export interface LegacyMapEntry {
  readonly legacyId: string;
  readonly outcome: 'migrate' | 'migrate_conditional' | 'experimental' | 'removed' | 'blocked' | 'recipe';
  readonly targetId: string | null;
  readonly transform: string | null;
  readonly errorCode?: string;
  readonly notes: string;
  readonly requires?: readonly string[];
  readonly alternatives?: readonly string[];
  readonly materializedParameters?: Readonly<Record<string, unknown>>;
}

/** Every pre-1.0 id has a deterministic outcome here. There is no fall-through. */
export const LEGACY_SKILL_MAP: Readonly<Record<string, LegacyMapEntry>> = Object.freeze({
  "nest.voltage_trace": {
    "legacyId": "nest.voltage_trace",
    "outcome": "migrate",
    "targetId": "neuro.analog_trace",
    "transform": "voltageTraceToAnalogTrace",
    "notes": "The signal is mapped with kind `membrane_voltage` ONLY because the legacy id asserted it was a voltage trace. The general contract does not assume every analog signal is a membrane potential.",
    "requires": [
      "an explicit time unit",
      "an explicit value unit"
    ]
  },
  "nest.spike_raster": {
    "legacyId": "nest.spike_raster",
    "outcome": "migrate",
    "targetId": "neuro.spike_raster",
    "transform": "spikeRasterToSpikeRaster",
    "notes": "Event identity and order are preserved. The RECORDED sender universe must be supplied: the legacy payload did not distinguish senders that were recorded from senders that happened to fire.",
    "requires": [
      "recordedSenderIds",
      "an observation window"
    ]
  },
  "nest.population_rate": {
    "legacyId": "nest.population_rate",
    "outcome": "migrate",
    "targetId": "neuro.population_rate",
    "transform": "populationRateToPopulationRate",
    "notes": "Raw bin counts and the recorded-sender denominator are preserved, and the rate is re-derived and checked.",
    "requires": [
      "recordedSenderCount"
    ]
  },
  "nest.rate_response": {
    "legacyId": "nest.rate_response",
    "outcome": "migrate",
    "targetId": "neuro.response_curve",
    "transform": "rateResponseToResponseCurve",
    "notes": "The current-only F-I assumption is NOT hard-coded into the neutral contract: the input quantity and the response method must both be declared.",
    "requires": [
      "an input quantity with a unit",
      "a response method"
    ]
  },
  "nest.isi_distribution": {
    "legacyId": "nest.isi_distribution",
    "outcome": "migrate",
    "targetId": "neuro.isi_distribution",
    "transform": "isiToIsiDistribution",
    "notes": "Per-sender interval derivation, edge policy, bins, normalization, and exclusions are preserved.",
    "requires": [
      "a zero-interval policy"
    ]
  },
  "nest.psth": {
    "legacyId": "nest.psth",
    "outcome": "migrate",
    "targetId": "neuro.psth",
    "transform": "psthToPsth",
    "notes": "Trial alignment, selected senders, and the trial denominator are preserved.",
    "requires": [
      "a trial universe or count",
      "an alignment reference"
    ]
  },
  "nest.correlogram": {
    "legacyId": "nest.correlogram",
    "outcome": "migrate",
    "targetId": "neuro.correlogram",
    "transform": "correlogramToCorrelogram",
    "notes": "The legacy caller-selected `zeroLagPolicy` is DROPPED. Self-pair treatment is now DERIVED by the registered algorithm from event identity and reported as a fact; it is no longer something a caller can assert.",
    "requires": [
      "an explicit kind (auto|cross)",
      "an ordered (reference, target) pair",
      "a statistic"
    ]
  },
  "nest.phase_plane": {
    "legacyId": "nest.phase_plane",
    "outcome": "migrate",
    "targetId": "neuro.phase_plane",
    "transform": "phasePlaneToPhasePlane",
    "notes": "State-variable quantities and trajectory ordering are preserved. An unverified nullcline annotation becomes a caller note or is dropped.",
    "requires": [
      "x and y state quantities with units"
    ]
  },
  "nest.astrocyte_dynamics": {
    "legacyId": "nest.astrocyte_dynamics",
    "outcome": "migrate",
    "targetId": "neuro.multisignal_trace",
    "transform": "astrocyteToMultisignalTrace",
    "notes": "Each signal keeps its REAL quantity kind and unit. Calcium and IP3 are never relabelled as membrane voltage, and dimensionally incompatible signals become small multiples rather than one forced axis. Astrocytes get a recipe, not a renderer branch.",
    "requires": [
      "a quantity kind and unit per signal"
    ]
  },
  "nest.compartmental_dynamics": {
    "legacyId": "nest.compartmental_dynamics",
    "outcome": "migrate",
    "targetId": "neuro.compartment_trace",
    "transform": "compartmentalToCompartmentTrace",
    "notes": "This was a host-only (`scene: null`) route. It now has a native renderer: small multiples below a bounded compartment count, a time-by-compartment heatmap above it.",
    "requires": [
      "cellId",
      "compartment ids",
      "a signal quantity with a unit"
    ]
  },
  "nest.connection_graph": {
    "legacyId": "nest.connection_graph",
    "outcome": "migrate",
    "targetId": "network.connection_graph",
    "transform": "connectionGraphToConnectionGraph",
    "notes": "Isolates, autapses, multapses, and directedness are preserved.",
    "requires": [
      "a complete node universe",
      "a network scope"
    ]
  },
  "nest.adjacency_matrix": {
    "legacyId": "nest.adjacency_matrix",
    "outcome": "migrate",
    "targetId": "network.adjacency_matrix",
    "transform": "adjacencyToAdjacencyMatrix",
    "notes": "NEST's target-row / source-column convention is frozen and stated on the axes, in the table, and in the caption.",
    "requires": [
      "complete row (target) and column (source) universes",
      "a cell mode",
      "a network scope"
    ]
  },
  "nest.weight_matrix": {
    "legacyId": "nest.weight_matrix",
    "outcome": "migrate",
    "targetId": "network.weight_matrix",
    "transform": "weightMatrixToWeightMatrix",
    "notes": "A multapse aggregation is now MANDATORY. The legacy behavior had no declared policy for repeated connections mapping to one cell.",
    "requires": [
      "a multapse aggregation",
      "a weight quantity with a declared dimension"
    ]
  },
  "nest.delay_matrix": {
    "legacyId": "nest.delay_matrix",
    "outcome": "migrate",
    "targetId": "network.delay_matrix",
    "transform": "delayMatrixToDelayMatrix",
    "notes": "Delays must be finite and positive. A multapse aggregation is mandatory.",
    "requires": [
      "a multapse aggregation"
    ]
  },
  "nest.in_degree_distribution": {
    "legacyId": "nest.in_degree_distribution",
    "outcome": "migrate",
    "targetId": "network.degree_distribution",
    "transform": "inDegreeToDegreeDistribution",
    "notes": "Merged into one contract with a closed `direction` discriminator, set here to `in`. The complete node universe is required so that zero-degree nodes survive.",
    "requires": [
      "a complete node universe",
      "a counting policy"
    ],
    "materializedParameters": {
      "direction": "in"
    }
  },
  "nest.out_degree_distribution": {
    "legacyId": "nest.out_degree_distribution",
    "outcome": "migrate",
    "targetId": "network.degree_distribution",
    "transform": "outDegreeToDegreeDistribution",
    "notes": "Direction is set to `out`. If the source scope is target-rank-local, migration BLOCKS with SCOPE_OUT_DEGREE_FROM_RANK_LOCAL: rank-local target evidence cannot be promoted to a global out-degree, because the connections from a local source to a remote target live on another rank.",
    "requires": [
      "a complete node universe",
      "a counting policy",
      "a scope that can support an out-degree claim"
    ],
    "materializedParameters": {
      "direction": "out"
    }
  },
  "nest.delay_distribution": {
    "legacyId": "nest.delay_distribution",
    "outcome": "migrate",
    "targetId": "network.delay_distribution",
    "transform": "delayDistributionToDelayDistribution",
    "notes": "The exact edge population, sampling status, unit, bins, and normalization are preserved.",
    "requires": [
      "an edge scope",
      "a normalization"
    ]
  },
  "nest.weight_histogram": {
    "legacyId": "nest.weight_histogram",
    "outcome": "migrate",
    "targetId": "network.weight_distribution",
    "transform": "weightHistogramToWeightDistribution",
    "notes": "Signs are preserved. Weights are never absolute-valued or sign-split unless requested, and never pooled across incompatible dimensions or synapse models.",
    "requires": [
      "an edge scope",
      "a weight quantity with a declared dimension"
    ]
  },
  "nest.spatial_map_2d": {
    "legacyId": "nest.spatial_map_2d",
    "outcome": "migrate",
    "targetId": "network.spatial_map_2d",
    "transform": "spatialMap2dToSpatialMap2d",
    "notes": "Coordinate frame, center/extent, and periodic-wrap metadata are preserved.",
    "requires": [
      "a coordinate frame",
      "positions covering the node universe"
    ]
  },
  "nest.plasticity_dynamics": {
    "legacyId": "nest.plasticity_dynamics",
    "outcome": "migrate",
    "targetId": "network.synaptic_weight_trace",
    "transform": "plasticityToSynapticWeightTrace",
    "notes": "The observation kind must be declared: event-updated weights are piecewise-constant and are drawn as STEPS, while sampled continuous values are drawn as a line. Drawing an STDP update as a smooth line would invent values that never existed.",
    "requires": [
      "a stable synapse identity",
      "an observation kind"
    ]
  },
  "nest.spatial_3d": {
    "legacyId": "nest.spatial_3d",
    "outcome": "experimental",
    "targetId": "experimental.network.spatial_3d",
    "transform": null,
    "notes": "Moved out of the stable catalog. Import the explicit experimental subpath. There is NO stable alias, because a stable alias would let an agent select a nondeterministic WebGL scene while believing it selected a conformant figure.",
    "errorCode": "CAPABILITY_EXPERIMENTAL"
  },
  "corpus.knowledge_graph": {
    "legacyId": "corpus.knowledge_graph",
    "outcome": "experimental",
    "targetId": "experimental.evidence.knowledge_graph",
    "transform": null,
    "notes": "Moved out of the stable catalog. The evidence table/JSON export remains available and is the authoritative view; the force-directed 3D geometry is explicitly schematic.",
    "errorCode": "CAPABILITY_EXPERIMENTAL"
  },
  "nest.animation_replay": {
    "legacyId": "nest.animation_replay",
    "outcome": "experimental",
    "targetId": "experimental.neuro.animation_replay",
    "transform": null,
    "notes": "No stable renderer and no safe deterministic export exist for it. Its former unbounded payload is replaced by a strict event union.",
    "errorCode": "MIGRATION_NO_STABLE_REPLACEMENT"
  },
  "nest.connectivity_matrix": {
    "legacyId": "nest.connectivity_matrix",
    "outcome": "blocked",
    "targetId": null,
    "transform": null,
    "errorCode": "MIGRATION_AMBIGUOUS_CONNECTIVITY_MATRIX",
    "notes": "The caller must choose network.adjacency_matrix, network.weight_matrix, or network.delay_matrix. Cortexel will NOT guess from which fields happen to be present: the three differ in how they treat an absent cell, a zero value, and a repeated connection, so guessing wrong would silently change what the figure claims.",
    "alternatives": [
      "network.adjacency_matrix",
      "network.weight_matrix",
      "network.delay_matrix"
    ]
  },
  "nest.spatial_2d": {
    "legacyId": "nest.spatial_2d",
    "outcome": "migrate_conditional",
    "targetId": "network.spatial_map_2d",
    "transform": "spatial2dToSpatialMap2d",
    "errorCode": "MIGRATION_INFORMATION_MISSING",
    "notes": "A host-only route with no Cortexel-owned output. It migrates ONLY when the legacy payload already carries the complete measured-position contract — node ids bound to positions, a coordinate frame, and units. Otherwise migration returns a field-by-field error rather than fabricating a coordinate frame.",
    "requires": [
      "node ids bound to positions",
      "a coordinate frame",
      "position units"
    ]
  },
  "nest.stimulus_response": {
    "legacyId": "nest.stimulus_response",
    "outcome": "recipe",
    "targetId": "figure.bundle",
    "transform": "stimulusResponseToBundleDraft",
    "errorCode": "MIGRATION_NO_STABLE_REPLACEMENT",
    "notes": "There is no one-to-one replacement, because this was never one figure. `cortexel migrate` emits a DRAFT bundle — a stimulus trace panel, a response trace panel, and a response-curve panel — and lists every input it could not resolve. The caller completes it.",
    "alternatives": [
      "figure.bundle containing neuro.analog_trace + neuro.population_rate + neuro.response_curve"
    ]
  }
});

export const RENDERERS = Object.freeze({
  "figure.analog_trace": {
    "id": "figure.analog_trace",
    "revision": 1,
    "status": "stable",
    "marks": [
      "line",
      "point",
      "rule",
      "text"
    ],
    "notes": "Lines with optional points. No smoothing by default — a smoothed trace is a separate derived artifact with a declared method. Paths BREAK at every missing sample."
  },
  "figure.multisignal_trace": {
    "id": "figure.multisignal_trace",
    "revision": 1,
    "status": "stable",
    "marks": [
      "line",
      "point",
      "rule",
      "text"
    ],
    "notes": "Aligned small multiples by default. Signals are overlaid only when their dimensions are compatible."
  },
  "figure.compartment_trace": {
    "id": "figure.compartment_trace",
    "revision": 1,
    "status": "stable",
    "marks": [
      "line",
      "rect",
      "text"
    ],
    "notes": "Small multiples below a bounded compartment count; a time-by-compartment heatmap above it, with an explicit row order that is disclosed as anatomical, path-distance, or arbitrary."
  },
  "figure.spike_raster": {
    "id": "figure.spike_raster",
    "revision": 1,
    "status": "stable",
    "marks": [
      "rule",
      "point",
      "rect",
      "text"
    ],
    "notes": "Exact ticks below the mark cap; a count-preserving density grid above it. Y order is explicit and NEVER silently sorted by observed rate."
  },
  "figure.population_rate": {
    "id": "figure.population_rate",
    "revision": 1,
    "status": "stable",
    "marks": [
      "path",
      "line",
      "rule",
      "text"
    ],
    "notes": "Literal bins render as horizontal STEPS with visible interval boundaries. A kernel estimate renders as a continuous line and may not reuse the step legend."
  },
  "figure.psth": {
    "id": "figure.psth",
    "revision": 1,
    "status": "stable",
    "marks": [
      "rect",
      "path",
      "rule",
      "text"
    ],
    "notes": "Bars or steps with the alignment reference at zero, and the trial and sender denominators stated."
  },
  "figure.correlogram": {
    "id": "figure.correlogram",
    "revision": 1,
    "status": "stable",
    "marks": [
      "rule",
      "point",
      "rect",
      "text"
    ],
    "notes": "Independent stems. Nonadjacent retained bins start new subpaths; a lag-zero bin is never invented, mirrored, or bridged."
  },
  "figure.distribution": {
    "id": "figure.distribution",
    "revision": 1,
    "status": "stable",
    "marks": [
      "rect",
      "path",
      "rule",
      "text"
    ],
    "notes": "Shared by ISI, degree, delay, and weight distributions. Renders LITERAL bins with exact edges. An empty histogram is an explicit empty state, never a zero line."
  },
  "figure.response_curve": {
    "id": "figure.response_curve",
    "revision": 1,
    "status": "stable",
    "marks": [
      "point",
      "line",
      "area",
      "rule",
      "text"
    ],
    "notes": "Points are primary. A connecting line appears only for ORDERED conditions and is labelled a guide unless a fitted model is present."
  },
  "figure.phase_plane": {
    "id": "figure.phase_plane",
    "revision": 1,
    "status": "stable",
    "marks": [
      "line",
      "point",
      "path",
      "text"
    ],
    "notes": "Trajectories with direction markers plus a bounded vector field. Arrow length may be normalized for display, but the magnitude is retained and the normalization is recorded."
  },
  "figure.connection_graph": {
    "id": "figure.connection_graph",
    "revision": 1,
    "status": "stable",
    "marks": [
      "line",
      "path",
      "point",
      "text"
    ],
    "notes": "Preserves isolates, autapses (as visible loops), and every multapse on its own deterministic lane. Direction survives without colour or motion. Schematic layout is labelled as such."
  },
  "figure.matrix": {
    "id": "figure.matrix",
    "revision": 1,
    "status": "stable",
    "marks": [
      "rect",
      "rule",
      "text"
    ],
    "notes": "Shared by adjacency, weight, and delay matrices. Target rows, source columns. A cell that was never observed is drawn as ABSENT and is visually distinct from a measured zero."
  },
  "figure.spatial_map_2d": {
    "id": "figure.spatial_map_2d",
    "revision": 1,
    "status": "stable",
    "marks": [
      "point",
      "line",
      "rule",
      "text"
    ],
    "notes": "One equal x/y scale. Measured positions are never jittered. Marker radius is fixed screen-space decoration and is disclosed as such."
  },
  "figure.synaptic_weight_trace": {
    "id": "figure.synaptic_weight_trace",
    "revision": 1,
    "status": "stable",
    "marks": [
      "path",
      "line",
      "point",
      "area",
      "text"
    ],
    "notes": "STEPS for event-updated piecewise-constant weights; a line for sampled continuous values. Never connects across a missing observation without a declared hold or interpolation policy."
  },
  "figure.bundle": {
    "id": "figure.bundle",
    "revision": 1,
    "status": "stable",
    "marks": [
      "group"
    ],
    "notes": "Composes validated child artifacts. Performs NO analysis of its own."
  },
  "experimental.spatial_3d": {
    "id": "experimental.spatial_3d",
    "revision": 1,
    "status": "experimental",
    "marks": [],
    "notes": "WebGL. No deterministic output and no byte-stable export."
  },
  "experimental.knowledge_graph": {
    "id": "experimental.knowledge_graph",
    "revision": 1,
    "status": "experimental",
    "marks": [],
    "notes": "Iterative force layout. Geometry is schematic."
  },
  "experimental.animation_replay": {
    "id": "experimental.animation_replay",
    "revision": 1,
    "status": "experimental",
    "marks": [],
    "notes": "Animated. Never autoplays; always offers a static key-frame alternative."
  }
});

export const THEMES = Object.freeze({
  "light": {
    "id": "light",
    "background": "#ffffff",
    "text": "#111418",
    "mutedText": "#4a5158",
    "axis": "#3a4046",
    "grid": "#e2e6ea",
    "focus": "#0072b2",
    "missing": "#767e87",
    "warning": "#8a4600",
    "error": "#a4123f"
  },
  "dark": {
    "id": "dark",
    "background": "#0f1419",
    "text": "#f2f5f7",
    "mutedText": "#aeb6be",
    "axis": "#c2c9cf",
    "grid": "#252c33",
    "focus": "#56b4e9",
    "missing": "#98a1aa",
    "warning": "#e69f00",
    "error": "#ff8ba5"
  },
  "print": {
    "id": "print",
    "background": "#ffffff",
    "text": "#000000",
    "mutedText": "#333333",
    "axis": "#000000",
    "grid": "#d9d9d9",
    "focus": "#000000",
    "missing": "#6b6b6b",
    "warning": "#000000",
    "error": "#000000"
  },
  "grayscale": {
    "id": "grayscale",
    "background": "#ffffff",
    "text": "#000000",
    "mutedText": "#3d3d3d",
    "axis": "#000000",
    "grid": "#dcdcdc",
    "focus": "#000000",
    "missing": "#6b6b6b",
    "warning": "#000000",
    "error": "#000000"
  }
});

export const CATEGORICAL_SERIES_STYLES = Object.freeze([
  {
    "index": 0,
    "color": "#0072b2",
    "dash": "none",
    "marker": "circle",
    "label": "series 1"
  },
  {
    "index": 1,
    "color": "#d55e00",
    "dash": "6 3",
    "marker": "square",
    "label": "series 2"
  },
  {
    "index": 2,
    "color": "#009e73",
    "dash": "2 2",
    "marker": "triangle",
    "label": "series 3"
  },
  {
    "index": 3,
    "color": "#cc79a7",
    "dash": "8 2 2 2",
    "marker": "diamond",
    "label": "series 4"
  },
  {
    "index": 4,
    "color": "#e69f00",
    "dash": "1 3",
    "marker": "cross",
    "label": "series 5"
  },
  {
    "index": 5,
    "color": "#56b4e9",
    "dash": "10 4",
    "marker": "star",
    "label": "series 6"
  },
  {
    "index": 6,
    "color": "#8a6d00",
    "dash": "4 2 1 2",
    "marker": "plus",
    "label": "series 7"
  },
  {
    "index": 7,
    "color": "#000000",
    "dash": "3 3",
    "marker": "hexagon",
    "label": "series 8"
  }
]);

export const MAX_STABLE_SERIES = 8;
