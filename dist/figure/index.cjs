"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/figure/index.ts
var figure_exports = {};
__export(figure_exports, {
  ARTIFACT_CONTRACT: () => ARTIFACT_CONTRACT,
  CANONICALIZATION_ALGORITHMS: () => CANONICALIZATION_ALGORITHMS,
  CANONICALIZATION_IDS: () => CANONICALIZATION_IDS,
  CATALOG_DIGEST: () => CATALOG_DIGEST,
  CONTRACT_DIGEST: () => CONTRACT_DIGEST,
  CanonicalizationError: () => CanonicalizationError,
  DEFAULT_PROFILE: () => DEFAULT_PROFILE,
  DISCLOSURE_RULES: () => DISCLOSURE_RULES,
  ERROR_CODES: () => ERROR_CODES,
  ERROR_CODE_META: () => ERROR_CODE_META,
  EXPERIMENTAL_CAPABILITY_IDS: () => EXPERIMENTAL_CAPABILITY_IDS,
  LEGACY_SKILL_MAP: () => LEGACY_SKILL_MAP,
  PACKAGE_VERSION: () => PACKAGE_VERSION,
  QUANTITY_KINDS: () => QUANTITY_KINDS,
  REMOVED_CAPABILITY_IDS: () => REMOVED_CAPABILITY_IDS,
  REQUEST_CONTRACT: () => REQUEST_CONTRACT,
  RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID: () => RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID,
  SKILL_CATALOG: () => SKILL_CATALOG,
  STABLE_SKILL_COUNT: () => STABLE_SKILL_COUNT,
  STABLE_SKILL_IDS: () => STABLE_SKILL_IDS,
  UNITS: () => UNITS,
  UNIT_CODES: () => UNIT_CODES,
  axesAreCompatible: () => axesAreCompatible,
  canonicalDigest: () => canonicalDigest,
  canonicalDigestExcluding: () => canonicalDigestExcluding,
  canonicalize: () => canonicalize,
  compareUtf16CodeUnits: () => compareUtf16CodeUnits,
  convert: () => convert,
  deriveDisclosures: () => deriveDisclosures,
  dimensionOf: () => dimensionOf,
  finalizeErrors: () => finalizeErrors,
  getBudgetLimits: () => getBudgetLimits,
  getBuildIdentity: () => getBuildIdentity,
  isKnownUnit: () => isKnownUnit,
  isSafeDisplayString: () => isSafeDisplayString,
  isValidatedRequest: () => import_request.isValidatedRequest,
  makeError: () => makeError,
  migrateLegacyRequest: () => migrateLegacyRequest,
  normalizeResponseEventMemberIds: () => normalizeResponseEventMemberIds,
  parseAndValidateRequest: () => import_request.parseAndValidateRequest,
  parseJsonStrict: () => parseJsonStrict,
  pointer: () => pointer,
  resolveAlias: () => resolveAlias,
  responseEventMembershipDigest: () => responseEventMembershipDigest,
  restrictLimits: () => restrictLimits,
  safeText: () => safeText,
  sha256Digest: () => sha256Digest,
  sha256Hex: () => sha256Hex,
  snapshotValue: () => snapshotValue,
  toSeconds: () => toSeconds,
  tryGetBudgetLimits: () => tryGetBudgetLimits,
  trySelectTighterBudgetProfile: () => trySelectTighterBudgetProfile,
  unitLabel: () => unitLabel,
  utf8ByteLength: () => utf8ByteLength,
  validateRequestValue: () => import_request.validateRequestValue
});
module.exports = __toCommonJS(figure_exports);

// src/generated/identity.ts
var PACKAGE_VERSION = "0.10.0-dev.0";
var REQUEST_CONTRACT = "cortexel-figure-request/1.0";
var ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";
var CONTRACT_DIGEST = "sha256:02c8581a22d6417560cf8c6a890f25416243287b29ad7a9d5a8714915bae216e";
var CATALOG_DIGEST = "sha256:801aa157a57212ca58b092319d57edd8ab8649a80202a8a577510ca9f7162c09";
var STABLE_SKILL_COUNT = 19;
function getBuildIdentity() {
  return Object.freeze({
    packageVersion: PACKAGE_VERSION,
    requestContract: REQUEST_CONTRACT,
    artifactContract: ARTIFACT_CONTRACT,
    contractDigest: CONTRACT_DIGEST,
    catalogDigest: CATALOG_DIGEST,
    stableSkillCount: STABLE_SKILL_COUNT,
    sourceRevision: "unreleased-worktree",
    release: false
  });
}

// src/core/deep-freeze.ts
function freezeGenerated(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeGenerated(item)));
  }
  const clone = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(value)) {
    clone[key] = freezeGenerated(value[key]);
  }
  return Object.freeze(clone);
}

// src/generated/catalog.ts
var CAPABILITY_AVAILABILITIES = freezeGenerated([
  "packaged",
  "source_only",
  "unavailable"
]);
var SKILL_CATALOG = freezeGenerated({
  "network.adjacency_matrix": {
    "id": "network.adjacency_matrix",
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Connection adjacency matrix (target rows, source columns)",
    "canonicalQuestion": "Over one declared complete, ordered node universe, which cells of the target-row by source-column matrix contain at least one connection \u2014 or exactly how many connection entries \u2014 and which cells were actually observed, under a declared network scope and snapshot time?",
    "cannotEstablish": [
      "That an empty row means the target has in-degree zero in the wider network. The matrix is complete only over the DECLARED node universe: a target receiving 40 connections from unselected nodes still shows an empty row here.",
      "That a not_observed cell contains no connection. Under a rank-local or sampled scope many cells are not_observed, and not_observed is not absence \u2014 it is the snapshot declining to speak.",
      "Connection strength. A cell is present because a connection EXISTS, not because it is strong: a zero-weight synapse is present here and appears as the value 0 in network.weight_matrix. The two figures can disagree and both be right.",
      "Functional or effective connectivity. This is a structural snapshot: a present cell does not mean one neuron influenced another, and an absent cell does not mean the two were independent.",
      "That a visible block or cluster is a property of the network rather than of the declared node ORDER. Reordering can create or destroy every apparent block; Cortexel draws only the declared order and never sorts by connectivity.",
      "That the network still looks like this. The matrix is a snapshot at a declared time; under structural plasticity it says nothing about connectivity before or after that instant.",
      "That multiplicity is strength. Three parallel connections are not three times the influence of one \u2014 their weights may differ, may have opposite signs, and adjacency never looks at them.",
      "That a present cell is a monosynaptic pathway of a particular kind. Adjacency pools every declared synapse model in the supplied rows; the models are listed in the table, but the cell does not distinguish them."
    ],
    "renderer": {
      "id": "figure.matrix",
      "revision": 2,
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
      "maxObservations": 2e5,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true,
          "description": "Zero-based position in the declared node universe. The order is the declared order and is never derived from the connections."
        },
        {
          "key": "targetId",
          "header": "Target (row)",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The connection's TARGET. The orientation is fixed by the contract and is not caller-configurable."
        },
        {
          "key": "columnIndex",
          "header": "Column (source index)",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Zero-based position in the declared node universe."
        },
        {
          "key": "sourceId",
          "header": "Source (column)",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The connection's SOURCE."
        },
        {
          "key": "cellStatus",
          "header": "Status",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "present, absent, or not_observed. Absent is measured absence inside an observed target row. not_observed means this scope cannot speak to the cell."
        },
        {
          "key": "cellValue",
          "header": "Cell value",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "1 or 0 in binary_presence mode; the exact multiplicity in multiplicity mode. Null when not_observed; zero is reserved for observed absence."
        },
        {
          "key": "multiplicity",
          "header": "Complete-cell connections",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The exact full-cell multiplicity, multapses and autapses included, only when connectionSetComplete is true. Null for sampled evidence: retained rows prove presence but cannot prove that no additional cell rows were omitted."
        },
        {
          "key": "retainedConnectionRows",
          "header": "Retained rows",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact count of request rows retained in this cell. Under sampled scope this is a sample-row count, not the network cell multiplicity."
        },
        {
          "key": "connectionSetComplete",
          "header": "Complete cell set",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "True only when the declared scope completely observes this target row, so zero means absence and multiplicity is exact. False for every sampled cell and every non-owned rank-local row."
        },
        {
          "key": "isAutapse",
          "header": "Self-connection",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "True when the row target id equals the column source id. Autapses are always counted and the diagonal cell is never blanked."
        },
        {
          "key": "edgeIds",
          "header": "Contributing connections",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Canonical array of caller-supplied ids contributing to the cell. It is null when the snapshot supplied no edge-id channel; revision 2 never synthesizes ordinal identities. A dense observed-absent cell has an empty array when the id channel exists."
        },
        {
          "key": "synapseModels",
          "header": "Synapse models",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The declared models of the contributing connections. Adjacency pools models by design; they are listed so a reader can see exactly what was pooled."
        },
        {
          "key": "carriedAttributes",
          "header": "Carried weight / delay",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Per-connection weight and delay when supplied, with units and that same record's caller edgeId and synapseModel when those channels exist. The separately canonical edgeIds and synapseModels columns are contributor summaries, not positional joins. No ordinal identity is synthesized when edgeId is absent. Shown, never used: a zero-weight connection remains present."
        },
        {
          "key": "scopeSummary",
          "header": "Scope summary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A bounded canonical projection of the scope under which this cell was, or was not, observed. For global_merged, validator-proven complete coverage is represented as all_ranks_0_through_worldSize_minus_1 rather than repeating the redundant mergedRanks array in every row. The canonical request retains the exact raw scope once and the live in-process requestDigest covers that request. Artifact 1.0 binds table shape only: it does not bind these table-cell bytes and provides no detached verification or persisted assurance receipt."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.adjacency_matrix.output_authority.v2"
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
      "There is no way to make a model-restricted absence claim. A caller who supplies only one synapse model's rows must declare a `sampled` / `declared_subset` scope, under which no cell may be called absent \u2014 so 'no AMPA connection here' is not expressible in 1.0.",
      "topology.matrix_contract checks the scope x cellMode x aggregation restrictions: sampled admits only binary_presence with sum over retained rows; rank-local requires complete local targets, one unique observedTargetIds subset, and every returned connection target in that owned set.",
      "No matrix paint-path quantizer is implemented in revision 2. The contract advertises only compaction policy `none`; any request that exceeds the visible-mark or complete-returned-table budget is refused rather than grouped, sampled, or excerpted.",
      "No uncertainty variant is supported. A connection-PROBABILITY matrix over an ensemble of network instantiations is a genuinely different figure, and 1.0 does not have it: this contract draws one exact snapshot, not an estimate.",
      "Cortexel verifies internal consistency, not truth. It can check that the scope, the universe, and the connections agree with each other; it cannot check that the snapshot enumerated the network correctly in the first place.",
      "No data-dependent reordering is offered. A caller who wants a seriated or clustered matrix must compute the order themselves, declare it as the universe order, and own the claim that the block structure is real."
    ]
  },
  "network.connection_graph": {
    "id": "network.connection_graph",
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
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
      "revision": 2
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
      "maxObservations": 2e5,
      "maxVisibleMarks": 2e4,
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
          "nullable": false,
          "keyPart": true,
          "description": "`node` or `connection`. A cell that does not apply to the row kind is empty; an empty cell is never a zero."
        },
        {
          "key": "id",
          "header": "Id",
          "cellType": "string",
          "nullable": true,
          "keyPart": true,
          "description": "The declared node id on a node row or caller-supplied edge id on a connection row. A connection without a supplied edge id has a null cell; revision 2 never assigns a replacement ordinal."
        },
        {
          "key": "group",
          "header": "Group",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The declared group, or empty. A node belongs to at most one group."
        },
        {
          "key": "sourceId",
          "header": "Source",
          "cellType": "string",
          "nullable": true,
          "keyPart": true,
          "description": "Connection rows only."
        },
        {
          "key": "targetId",
          "header": "Target",
          "cellType": "string",
          "nullable": true,
          "keyPart": true,
          "description": "Connection rows only. The arrowhead is drawn at this end."
        },
        {
          "key": "isAutapse",
          "header": "Self-connection",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "True when source equals target."
        },
        {
          "key": "parallelIndex",
          "header": "Parallel index",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": true,
          "description": "Which connection row this is within the unordered endpoint pair, in declared connection-row order (1-based)."
        },
        {
          "key": "parallelCount",
          "header": "Parallel count",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "How many connections exist between this unordered pair. Greater than 1 means a multapse; every one of them has its own row."
        },
        {
          "key": "weight",
          "header": "Weight",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Exact declared value, or empty when the source did not supply one. Empty is missing, not zero."
        },
        {
          "key": "weightUnit",
          "header": "Weight unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "`nest:weight` is simulator-defined and has no SI meaning; it is never converted or compared across models."
        },
        {
          "key": "delay",
          "header": "Delay",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "delayUnit",
          "header": "Delay unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "synapseModel",
          "header": "Synapse model",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The declared model. Weights of different models are not pooled."
        },
        {
          "key": "inDegree",
          "header": "In-degree",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Node rows only, and only when a degree annotation is declared and the scope supports it."
        },
        {
          "key": "outDegree",
          "header": "Out-degree",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Node rows only. Empty under a target-rank-local scope, where it is not computable."
        },
        {
          "key": "degreeCountingPolicy",
          "header": "Degree policy",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Whether each connection entry or each unique neighbour was counted, and how an autapse contributed."
        },
        {
          "key": "x",
          "header": "x",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Measured coordinate, or empty under a schematic layout. A schematic screen position is not a coordinate and is never reported as one."
        },
        {
          "key": "y",
          "header": "y",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "positionUnit",
          "header": "Position unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "layoutStatus",
          "header": "Layout",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "`measured` or `schematic (non-spatial)`."
        },
        {
          "key": "scopeSummary",
          "header": "Scope summary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A bounded canonical projection of the declared network scope. `global_merged` records complete-rank coverage and world size without repeating `mergedRanks`; the exact raw scope remains once in the canonical request and is covered by the live in-process request digest. Artifact 1.0 binds this table's shape only, not table-cell bytes, and supplies no detached verification or persisted assurance receipt."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.connection_graph.output_authority.v2"
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
      "handVectors": true,
      "externalOracle": {
        "name": "networkx.MultiDiGraph",
        "version": "3.3",
        "status": "not_run",
        "notes": "NetworkX is the intended differential oracle for degree counting, multiedge retention, and self-loop handling ONLY \u2014 never for layout, because Cortexel's stable layouts are closed-form and NetworkX's are not normative. The comparison MUST use MultiDiGraph: networkx.DiGraph silently collapses parallel edges, so comparing against it would 'confirm' precisely the deduplication bug this contract exists to prevent. NetworkX also counts a self-loop as 2 in Graph.degree but as 1 each in in_degree/out_degree, so the autapse policy must be matched explicitly before any number agrees for the right reason. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
      }
    },
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
      "There is no graph-specific budget profile. The `standard` and `agent` profiles' graphNodes/graphEdges ceilings apply, and this contract additionally caps visible marks at 20000 \u2014 far below the profile's 100000 \u2014 because a node-link diagram with 100000 marks is a hairball that conveys nothing.",
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "In- and out-degree distribution over a declared node universe",
    "canonicalQuestion": "What is the exact in- or out-degree distribution of a complete, declared node universe, under an explicitly stated connection-counting policy and autapse policy, within a network scope that can actually support the claim?",
    "cannotEstablish": [
      "That the degree distribution follows any functional form. Cortexel draws the empirical histogram; it fits nothing and tests nothing, and a heavy right tail on a log axis is not evidence of scale-freeness.",
      "A global out-degree from an MPI target-rank-local snapshot. A rank holds the connections whose TARGET it owns; the ones leaving a local source for a remote target sit on another rank and are simply absent from the evidence.",
      "The degree of any node outside the declared universe. A node that was not declared is not a node of degree zero \u2014 it is a node that was not looked at.",
      "The in-degree of a node an MPI rank does not own. A rank-local figure is complete only for the targets the rank observed, which is why those ids must be declared rather than assumed.",
      "Functional or effective connectivity. A structural degree counts connections; it says nothing about whether they carry signal, in which direction of influence, or with what sign.",
      "Anything about synaptic strength or latency. Two nodes with identical degree can differ by orders of magnitude in total drive; supplied weights and delays do not affect a degree and are never used to filter one.",
      "The distribution of the whole network from a sampled edge subset. Every degree read from a subset is a lower bound of unknown tightness, and a histogram of lower bounds looks exactly like a histogram of degrees.",
      "That a difference between two degree distributions is meaningful. No statistical test is performed and no null model is assumed.",
      "That the network had this structure at any time other than the declared snapshot time. Structural plasticity can change every degree between two snapshots of one run."
    ],
    "renderer": {
      "id": "figure.distribution",
      "revision": 2
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
      "maxObservations": 2e5,
      "maxVisibleMarks": 2e4,
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
          "nullable": false,
          "keyPart": true,
          "description": "Inclusive lower degree of the bin. Under per_integer_degree binning it equals the upper."
        },
        {
          "key": "degreeHigh",
          "header": "Degree (upper)",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Inclusive upper degree. Degree bins are inclusive integer ranges, never half-open real intervals."
        },
        {
          "key": "nodeCount",
          "header": "Nodes",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact integer number of NODES whose degree falls in this bin. This is the raw observation, and it is a count of nodes \u2014 not of connections."
        },
        {
          "key": "probability",
          "header": "Probability",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "nodeCount divided by the complete declared node universe, zero-degree nodes included. Present only when normalization is probability."
        },
        {
          "key": "universeNodeCount",
          "header": "Universe nodes",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The denominator. Includes every node of degree zero."
        },
        {
          "key": "countedConnectionCount",
          "header": "Raw connections",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Rows remaining after the autapse policy. Constant across rows."
        },
        {
          "key": "countedIncidenceCount",
          "header": "Counted incidences",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact sum(degree \xD7 nodeCount). Equal to raw connections for count_edges and no greater for count_unique_neighbors."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Dimensionless (1). A degree has no unit and is never converted."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.degree_distribution.output_authority.v2"
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
      "handVectors": true,
      "externalOracle": {
        "name": "networkx.MultiDiGraph.in_degree / out_degree",
        "version": "3.3",
        "status": "not_run",
        "notes": "networkx is the intended differential oracle, and it is only meaningful parameter for parameter. MultiDiGraph retains parallel edges, which corresponds to `count_edges`; DiGraph has already collapsed them, which corresponds to `count_unique_neighbors` and from which `count_edges` can never be recovered. A self-loop adds one to in_degree and one to out_degree on a directed graph, while the undirected Graph.degree counts it twice \u2014 matching the autapse convention is therefore part of the comparison, not an afterthought. NEST 3.10 is the second intended oracle, for the MPI rank-local scope rules specifically. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
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
      "revision": 2
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
      "maxObservations": 2e5,
      "maxVisibleMarks": 2e4,
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
          "nullable": false,
          "keyPart": true,
          "description": "The series: the synapse model when grouping is on, otherwise the selection itself. Each group is normalized within itself."
        },
        {
          "key": "binStart",
          "header": "Bin start",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Inclusive lower edge, in the declared bin unit."
        },
        {
          "key": "binEnd",
          "header": "Bin end",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive."
        },
        {
          "key": "binWidth",
          "header": "Bin width",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The LINEAR width. It is the width used by the density denominator even when the axis is logarithmic."
        },
        {
          "key": "binUnit",
          "header": "Bin unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "count",
          "header": "Observations",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact integer count in this bin. This is the raw observation everything else is derived from; an empty bin is a measured zero, not missing data."
        },
        {
          "key": "observationKind",
          "header": "Observation kind",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "connection under per_connection, ordered_pair under per_ordered_pair. A count of synapses and a count of pairs are different numbers and both get called `count`."
        },
        {
          "key": "normalization",
          "header": "Normalization",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Which quantity the value carries: count, probability, or density. Stated per row so a reader of the table alone never has to infer it from the magnitudes."
        },
        {
          "key": "scopeSummary",
          "header": "Scope summary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A bounded canonical projection of the declared network scope. `global_merged` records complete-rank coverage and world size without repeating `mergedRanks`; the exact raw scope remains once in the canonical request and is covered by the live in-process request digest. Artifact 1.0 binds this table's shape only, not table-cell bytes, and supplies no detached verification or persisted assurance receipt."
        },
        {
          "key": "probability",
          "header": "Probability",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "count / binned observations of this group. Present only when normalization is probability."
        },
        {
          "key": "density",
          "header": "Density",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "count / (binned observations of this group x linear bin width). Present only when normalization is density."
        },
        {
          "key": "densityUnit",
          "header": "Density unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The reciprocal of the bin unit, e.g. /ms for millisecond bins."
        },
        {
          "key": "groupObservationCount",
          "header": "Group observations",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The normalization denominator for this group: the observations that fell inside the bin range."
        },
        {
          "key": "consideredConnectionCount",
          "header": "Connections considered",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Connection rows considered for this group before the counting policy was applied. Under per_ordered_pair it exceeds the observation count whenever the group contains a multapse."
        },
        {
          "key": "excludedUnderRangeCount",
          "header": "Excluded (below range)",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Observations below the first bin edge. Always reported; never silently absorbed."
        },
        {
          "key": "excludedOverRangeCount",
          "header": "Excluded (above range)",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Observations above the last bin edge."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.delay_distribution.output_authority.v2"
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
      "Revision 2 executes conservation, exact prebinned length, normalized-value re-derivation, endpoint binding, group partition and counting-policy-specific multapse semantics inside topology.delay_positive. In particular, per_connection preserves every multapse row and forbids pair aggregation.",
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Transmission-delay matrix over a declared target-row / source-column node universe",
    "canonicalQuestion": "For each ordered (source, target) pair in a declared node universe, what is the explicitly named aggregate of the positive transmission delays of the connections observed between them, under a declared network scope?",
    "cannotEstablish": [
      "That an empty cell is a connection with zero delay. An empty cell means no connection was observed under the declared scope; a zero delay is rejected outright, so no cell in this figure is ever drawn at zero.",
      "The delay of any single synapse in a cell that aggregates multapses. A mean over parallel synapses of 1 ms and 9 ms reports 5 ms \u2014 a latency no spike in this network ever experiences.",
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
      "revision": 2,
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
      "maxObservations": 2e5,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true,
          "description": "Zero-based index into the declared target (row) universe."
        },
        {
          "key": "targetId",
          "header": "Target",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The postsynaptic node. Rows are targets."
        },
        {
          "key": "columnIndex",
          "header": "Column",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Zero-based index into the declared source (column) universe."
        },
        {
          "key": "sourceId",
          "header": "Source",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The presynaptic node. Columns are sources."
        },
        {
          "key": "cellStatus",
          "header": "Cell status",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "present, absent (no connection observed under a scope that could have seen one), or not_observed (the scope could not see this cell)."
        },
        {
          "key": "delayAggregate",
          "header": "Delay",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The declared aggregate. Empty when the cell is absent or not_observed \u2014 never zero."
        },
        {
          "key": "displayUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "multapseAggregation",
          "header": "Aggregation",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The declared policy that produced the cell value."
        },
        {
          "key": "delaySemantics",
          "header": "Delay meaning",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "total_transmission, or dendritic_component_only when the model splits axonal and dendritic delays."
        },
        {
          "key": "contributingConnectionCount",
          "header": "Connections",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "How many connection rows contribute to this cell. Greater than one means a multapse was aggregated."
        },
        {
          "key": "delayMin",
          "header": "Delay min",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Minimum over the contributing connections. Equal to the aggregate only under min."
        },
        {
          "key": "delayMax",
          "header": "Delay max",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Maximum over the contributing connections. The spread a single colour cannot show."
        },
        {
          "key": "contributingEdgeIds",
          "header": "Connection ids",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Canonical array of caller-supplied ids contributing to the cell, or null when the snapshot supplied no edge-id channel. Revision 2 never assigns a replacement ordinal."
        },
        {
          "key": "synapseModels",
          "header": "Synapse models",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The distinct models contributing to this cell."
        },
        {
          "key": "isAutapse",
          "header": "Autapse",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "True when source == target. Autapses are retained on the diagonal."
        },
        {
          "key": "scopeSummary",
          "header": "Scope summary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A bounded canonical projection of the observation scope, including snapshotTime verbatim. For global_merged, validator-proven complete coverage is represented as all_ranks_0_through_worldSize_minus_1 rather than repeating the redundant mergedRanks array in every row. The canonical request retains the exact raw scope once and the live in-process requestDigest covers that request. Artifact 1.0 binds table shape only: it does not bind these table-cell bytes and provides no detached verification or persisted assurance receipt. A separate snapshotTime column would duplicate this closed summary and is deliberately omitted in revision 2."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.delay_matrix.output_authority.v2"
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
      "ABSENT_IS_NOT_ZERO's published text names a zero weight. For this figure that clause is vacuous \u2014 a zero delay is rejected \u2014 and the real hazard it must cover is an empty cell being read as instantaneous transmission at the fast end of the ramp.",
      "The registered `matrix_value_quantize` policy is not advertised or executed by revision 2. Every accepted cell is painted directly and an over-budget request is refused, so no quantization receipt, downsampling fact, or downsampling disclosure is produced. A future paint-only implementation would have to retain every cell and bind a complete evidence table before this skill could advertise it.",
      "`simulationResolution` is recorded but NOT enforced. No registered validator checks that each delay is an integer multiple of the declared resolution, so a delay off the simulator's grid is accepted and displayed.",
      "There is no declared or shared colour domain, so two delay matrices are NOT comparable by colour \u2014 compare the legends or the tables. A shared domain needs a clipping disclosure that does not exist in disclosures.v1.json.",
      "Cortexel cannot detect a transposed adapter: if the source and target arrays are swapped, every validator passes and the figure is a plausible lie about direction. The defences are the adapter's own vectors and restating orientation on the axes, legend, caption, and table.",
      "No uncertainty variant is renderable in a cell, so the spread across aggregated multapses is invisible in the colour. The complete returned table preserves contributor count and observed minimum/maximum, but those values are an empirical range rather than an uncertainty estimate.",
      "Delays of different synapse models share one matrix because they share one dimension. That is dimensionally correct, but a matrix mixing a split-delay model with a total-delay model mixes two meanings. The models are carried per cell; no validator refuses the mix.",
      "The matrix is square over one declared node universe: rows (targets) and columns (sources) index the same node set. A rectangular/bipartite matrix over two distinct universes is not offered, because topology.edge_endpoints_in_universe binds both endpoints to the single data.nodeUniverse.",
      "The node universe must be declared complete: topology.node_universe_declared rejects complete == false, so a delay matrix over an explicitly partial node set is not available. Edge-snapshot partiality is expressed through the declared scope instead."
    ]
  },
  "network.spatial_map_2d": {
    "id": "network.spatial_map_2d",
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Two-dimensional spatial map of declared node positions",
    "canonicalQuestion": "Where, in a declared two-dimensional coordinate frame, were the nodes of a declared universe positioned at one snapshot \u2014 drawn at one equal scale on both axes, with every coordinate preserved exactly, every missing position reported rather than placed at the origin, and periodic-boundary metadata used to choose an edge chord rather than to invent duplicate nodes?",
    "cannotEstablish": [
      "That the drawn nodes are all the nodes in the region. Emptiness on this map is emptiness in the DECLARED universe under the declared scope; a sampled or rank-local scope shows a fraction of the layer, and its empty regions may be full.",
      "Areal density. This contract derives none: units.v1 has no area code and no per-area quantity kind, and a reader who divides marker count by drawn area is measuring the selection, not the tissue.",
      "That two overlapping markers are one node. Coincident coordinates overlap exactly and are never jittered, so a grid layer holding an excitatory and an inhibitory population at the same points draws N markers for 2N neurons.",
      "Anything about a third dimension. There is no projection mode: projecting a 3-D layer would collapse a real axis and make distant neurons coincident.",
      "Soma size, arbor extent, or any physical size. Marker radius is fixed screen-space decoration; it does not scale with the data and it is not a length.",
      "Connectivity, when no connections are supplied \u2014 and, when they are, only the connections inside the declared scope. A drawn chord is a declared synapse, never a measured axonal path.",
      "Separation across a periodic boundary read straight off the page. Under a wrapped chord the drawn segments end at the domain edge; the modelled separation is the minimum image, not the on-page length.",
      "That a per-node value was measured over any particular window. The value is whatever the caller bound to the node; this figure carries no analysis window for it and re-derives nothing about it.",
      "Localization uncertainty. There is no positional error channel: a 1-D uncertainty array cannot express a 2-D error, and drawing it as a disc would assert an isotropy the source never declared.",
      "What the layout is at any other time. This is one snapshot; under structural plasticity the node set at another time is a different node set.",
      "That the coordinate frame corresponds to anatomical space. Cortexel records the declared frame id. It performs no registration and no frame transform."
    ],
    "renderer": {
      "id": "figure.spatial_map_2d",
      "revision": 2
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
      "maxObservations": 2e5,
      "maxVisibleMarks": 5e4,
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
          "nullable": false,
          "keyPart": true,
          "description": "`node` or `connection`. A cell that does not apply to the row kind is empty; an empty cell is never a zero."
        },
        {
          "key": "id",
          "header": "Id",
          "cellType": "string",
          "nullable": false,
          "keyPart": true,
          "description": "The caller-supplied node id on a node row. On a connection row this is the caller-supplied edge id when present; otherwise `connection-row-N` is a deterministic renderer-local row address derived from the source ordinal. That fallback binds the row and DOM mark but is NOT a claim that the source identified a synapse."
        },
        {
          "key": "group",
          "header": "Group",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Node rows: the declared group, or `ungrouped`; a node belongs to at most one group. Connection rows use `not_applicable`."
        },
        {
          "key": "x",
          "header": "x",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The coordinate after the two axes are canonicalized to the finest compatible supplied unit. Never jittered, clamped, or wrapped; any conversion has a derivation receipt."
        },
        {
          "key": "y",
          "header": "y",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The coordinate in the same canonical unit as x. Connection rows are empty."
        },
        {
          "key": "positionUnit",
          "header": "Position unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The same unit on both axes after canonicalization. A conversion, if any, is recorded in the derivation and disclosed."
        },
        {
          "key": "positionStatus",
          "header": "Position status",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "`measured`, `model_generated`, or `supplied`. A NEST layer's coordinates are model_generated, not measured."
        },
        {
          "key": "positionMissing",
          "header": "Position missing",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Node rows: true for a selected node with no declared position; such a node is omitted and never drawn at the origin. Connection rows use `not_applicable`."
        },
        {
          "key": "insideDomain",
          "header": "Inside domain",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Closed-interval membership under `cortexel_binary64_spatial_domain_membership_v1`: 8 epsilon times declared extent plus the exact one-round endpoint error, itself capped at 32 epsilon times extent. Empty when no domain was declared."
        },
        {
          "key": "coincidentWith",
          "header": "Coincident with",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Other node ids sharing this exact coordinate. Two coincident nodes are one marker on the page and two rows here."
        },
        {
          "key": "value",
          "header": "Value",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The declared per-node value, or empty when the source supplied a null. Empty is missing, not zero."
        },
        {
          "key": "valueUnit",
          "header": "Value unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "sourceId",
          "header": "Source",
          "cellType": "string",
          "nullable": true,
          "keyPart": true,
          "description": "Connection rows only."
        },
        {
          "key": "targetId",
          "header": "Target",
          "cellType": "string",
          "nullable": true,
          "keyPart": true,
          "description": "Connection rows only. The arrowhead is drawn at this end."
        },
        {
          "key": "chordRule",
          "header": "Chord",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The exact physical path kind shared by this row's unordered endpoint pair: `autapse_loop`, `straight_chord`, `minimum_image_direct`, or `minimum_image_wrapped`, with `_half_period_tie_x`, `_half_period_tie_y`, or `_half_period_tie_xy` appended when applicable. Reciprocal rows report the same path kind because they reverse one physical route. A wrapped chord's on-page segment length is not a measured axonal path."
        },
        {
          "key": "parallelCount",
          "header": "Parallel count",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "How many connections share this unordered measured endpoint chord. Greater than 1 means one chord and this many source rows; reciprocal directions retain separate arrowheads and per-direction count labels."
        },
        {
          "key": "weight",
          "header": "Weight",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Exact declared value, or empty when none was supplied."
        },
        {
          "key": "weightUnit",
          "header": "Weight unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "`nest:weight` is simulator-defined: never converted, never compared across synapse models."
        },
        {
          "key": "delay",
          "header": "Delay",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "delayUnit",
          "header": "Delay unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "synapseModel",
          "header": "Synapse model",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "scopeSummary",
          "header": "Scope summary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A bounded canonical projection of the declared network scope. `global_merged` records complete-rank coverage and world size without repeating `mergedRanks`; the exact raw scope remains once in the canonical request and is covered by the live in-process request digest. Artifact 1.0 binds this table's shape only, not table-cell bytes, and supplies no detached verification or persisted assurance receipt."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.spatial_map_2d.output_authority.v2"
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
      "handVectors": true,
      "externalOracle": {
        "name": "ase.geometry.find_mic",
        "version": "3.23.0",
        "status": "not_run",
        "notes": "ASE's minimum-image-convention helper is the intended differential oracle for the periodic chord rule ONLY \u2014 never for the layout, the equal-scale mapping, or the table, which are Cortexel's own normative constructions. The comparison is meaningful only after the conventions are pinned parameter for parameter: ASE takes an orthorhombic cell matrix while Cortexel takes centre plus extent, and the tie at exactly half the period (|d| = P/2, where two images are equally short) is resolved by rounding, which the two libraries need not resolve the same way. A hand vector covers it directly: in a 400 um periodic layer, d = 300 um must map to d' = -100 um, and d = 200 um must map to the positive image. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.spatial_map_2d",
      "nest.spatial_2d"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Blueprint 30.18 permits an anisotropic display when the frame authorizes it. No disclosure rule can state 'the axes carry different scales', so honesty cannot fail closed for it and this revision refuses anisotropic display. Closing the gap needs a new disclosure id, not a skill change.",
      "The closed semantic-validator registry has no `spatial.positions_within_extent` rule and no matching error code, so a position outside the declared domain cannot be REFUSED. It is drawn exactly where it was declared \u2014 visibly outside the domain rectangle \u2014 and counted in the summary and the table.",
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Synaptic weight over time, for identified synapses or a declared group",
    "canonicalQuestion": "How did the weight of a set of individually identified synapses \u2014 or the explicitly named aggregate of a declared group of synapses whose membership may change \u2014 evolve over a declared time window, under one declared observation semantics that says exactly what was observed and when?",
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
      "That two parallel synapses (a multapse) between the same pair are the same synapse. They are distinct edges with distinct ids and are never merged \u2014 and a source that cannot tell them apart cannot be used to plot either of them individually."
    ],
    "renderer": {
      "id": "figure.synaptic_weight_trace",
      "revision": 2
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
      "maxObservations": 2e6,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true,
          "description": "The edge id, or the group id on an aggregate row. Two parallel synapses between one pair are two ids and are never merged."
        },
        {
          "key": "seriesLabel",
          "header": "Label",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "sourceId",
          "header": "Source",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Presynaptic node. Descriptive: this figure declares no node universe and makes no connectivity claim. Empty on an aggregate row."
        },
        {
          "key": "targetId",
          "header": "Target",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Postsynaptic node. Empty on an aggregate row."
        },
        {
          "key": "synapseModel",
          "header": "Synapse model",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Every row carries canonical structured text containing its exact actual model set, the complete caller-declared model set, and the `weightComparability` mode. A raw row therefore remains auditable after detachment from its request, while a derived aggregate preserves the ordered model set; physical dimension compatibility alone is never presented as a model-level comparability proof."
        },
        {
          "key": "time",
          "header": "Time",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "In the window's declared unit, after any recorded conversion."
        },
        {
          "key": "timeUnit",
          "header": "Time unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "value",
          "header": "Weight",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The observed weight, or the aggregate on an aggregate row. Empty when the observation is missing. A missing observation is not zero."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A `nest:weight` is simulator-defined: no SI mapping, never converted, never compared across systems."
        },
        {
          "key": "observationKind",
          "header": "Observation",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "event_updated (held, emitted as steps), point_sample (consecutive finite samples joined by straight segments only within one valid render run), or interpolated_trajectory (supplied linear reconstruction vertices, not observations). Missingness and membership/recording availability transitions break applicable runs."
        },
        {
          "key": "updateSemantics",
          "header": "Held",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "value_after_update: this value holds forward from its time. value_before_update: it describes the interval ending at its time. The two differ by one inter-update interval on every step edge."
        },
        {
          "key": "paintedInterval",
          "header": "Painted interval",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Canonical structured {from,until,unit} only when this carrier owns an emitted positive-duration event hold in the exact frozen RenderPlan runs. `from` and `until` are the endpoints of that horizontal RenderPlan span, not a separate claim about mathematical endpoint closure or pixel visibility. The span is clipped by the analysis window, recorded interval and any membership lifetime. Null for table-only carriers, missing values, point/reconstruction vertices and closed-stop singleton points."
        },
        {
          "key": "renderRunOrdinal",
          "header": "Render run",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Zero-based ordinal of the exact explicit primary trace run owned by this carrier within the frozen RenderPlan. A run may be a line/path carrier sequence or a contract-mandated singleton marker. Within line/path geometry, equal ordinals identify the same explicit RenderPlan run and different ordinals require distinct RenderPlan subpaths. Null means the carrier owns no primary run. Optional observation/reconstruction markers do not create a run, while a mandatory closed-stop singleton is itself an explicit singleton run with an ordinal but no line segment or paintedInterval. The ordinal is bound into primary line/path provenance where such a subpath exists. This is a RenderPlan topology check, not assurance of serialized SVG paths, clipping, or pixel visibility."
        },
        {
          "key": "eventKind",
          "header": "Source event",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "What produced the observation: a presynaptic spike, a structural update, a poll of the stored value, or a parameter write."
        },
        {
          "key": "missing",
          "header": "Missing",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "true when the weight was null in the source. A missing update breaks the hold; the following interval is undefined, not unchanged."
        },
        {
          "key": "replicateCount",
          "header": "Source multiplicity",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "For a retained source-observation or reconstruction row, how many raw caller rows produced this carrier. Greater than one identifies a named duplicate-time aggregate. Null on derived evaluations, initial states, and context witnesses."
        },
        {
          "key": "memberCount",
          "header": "Members",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Aggregate rows: how many synapses belonged to the group at this time. A mean that rises while this falls is a different fact from a mean that rises while it holds."
        },
        {
          "key": "contributingCount",
          "header": "Aggregate n",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Aggregate rows: how many members actually had a value at this time. THIS is the denominator of the mean. Where it is 0 the aggregate is empty, never zero."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "uncertaintyMethod",
          "header": "Uncertainty method",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The variant, level and basis. A dispersion across synapses is never relabelled as a confidence interval."
        },
        {
          "key": "initialWeight",
          "header": "Initial weight",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The declared value and its origin (a model parameter or a caller assertion). It may seed an explicitly attributed leading hold or derived aggregate, and is drawn as an additional reference line only when requested. It never clamps or corrects an observed value."
        },
        {
          "key": "bounds",
          "header": "Bounds",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The declared lower/upper bound, whether it is hard or soft, and its origin. A weight observed beyond a hard bound is reported here and, when that member series is displayed, remains at its observed value; aggregate-only display may hide member geometry but retains the exact row."
        },
        {
          "key": "carrierKind",
          "header": "Carrier kind",
          "cellType": "string",
          "nullable": false,
          "keyPart": true,
          "description": "One of source_observation, source_state_witness, caller_reconstruction_point, derived_aggregate_evaluation, declared_aggregate_point, or declared_initial_state. This discriminator prevents a source row, context state witness, reconstruction vertex, initial state, and aggregate evaluation at one time from being conflated; a context witness may itself be directly painted."
        },
        {
          "key": "carrierOrdinal",
          "header": "Carrier ordinal",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Zero-based ordinal within this series and carrier kind after exact preparation. Together with series, time, and carrierKind it gives every returned carrier a unique row identity."
        },
        {
          "key": "carrierMetadata",
          "header": "Carrier metadata",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Canonical structured metadata owned by the carrier kind. Reconstruction rows bind method/interpolant/author; every duplicate-collapsed source/reconstruction carrier binds the named aggregate policy and method; context witnesses bind carry-in/look-ahead, directly-painted and derived-consultation status; initial-state rows bind declaration time separately from direct paint and derived consumption. Null where no extra carrier metadata is required."
        },
        {
          "key": "sourceOrdinal",
          "header": "Source lineage",
          "cellType": "finite_number_or_string",
          "nullable": true,
          "keyPart": false,
          "description": "Canonical scalar/array lineage into caller rows before within-edge stable sorting and named duplicate collapse. Present for retained source observations, reconstruction vertices, and source-state witnesses; null for derived evaluations and declared initial states."
        },
        {
          "key": "scopeSummary",
          "header": "Scope summary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A bounded canonical projection of the scope this synapse was observed under. `global_merged` records complete-rank coverage and world size without repeating `mergedRanks`; the exact raw scope remains once in the canonical request and is covered by the live in-process request digest. Artifact 1.0 binds this table's shape only, not table-cell bytes, and supplies no detached verification or persisted assurance receipt. A rank-local snapshot never licenses a claim about another rank's synapses."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.synaptic_weight_trace.output_authority.v2"
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
            "leftValue": true,
            "rightValue": false,
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
      "handVectors": true,
      "externalOracle": {
        "name": "NEST stdp_synapse + weight_recorder microfixture (pinned), cross-checked by hand against the analytic STDP update",
        "version": "NEST 3.10.0",
        "status": "not_run",
        "notes": "There is no library-independent oracle for most of this contract. The hold semantics, the membership-aware denominators, and the missing-update break are conventions of THIS contract and have no equivalent in Elephant, Neo, or NWB, so they rest entirely on the hand vectors. The one thing an external oracle can settle is the question this figure is most easily wrong about: whether the value a NEST weight recorder writes at a presynaptic spike is the weight BEFORE or AFTER the update that spike triggered. That is a property of stdp_synapse::send() in the pinned version, it must be established by executing a two-spike microfixture whose expected weights were computed by hand from the STDP kernel, and until it is, the adapter must not assume a convention \u2014 it must require the caller to declare one. The pinned reference environment has NOT been executed in this environment: the status is not_run, and it is not to be reported as anything else."
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Synaptic weight distribution over a declared edge population",
    "canonicalQuestion": "What is the distribution of synaptic weights over an explicitly declared edge population \u2014 a declared source universe, a declared target universe, and a network scope that says how completely those connections were observed \u2014 without hiding the sign, the synapse model, the multapse structure, or any sampling?",
    "cannotEstablish": [
      "That a negative weight is inhibitory or a positive weight excitatory. In a conductance-based model an inhibitory synapse carries a POSITIVE conductance weight and its sign of effect comes from the reversal potential, which is a property of the neuron model and is not in this figure at all.",
      "That the postsynaptic effect is proportional to the weight. The effect depends on the synapse model, the receptor port, the reversal potential, the membrane state at arrival, and short-term plasticity \u2014 none of which a weight histogram contains.",
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
      "revision": 2
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
      "maxObservations": 2e5,
      "maxVisibleMarks": 2e4,
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
          "nullable": false,
          "keyPart": true,
          "description": "The histogram group id. `all` when grouping is none; otherwise the declared synapse model. Required to keep independently normalized grouped rows distinguishable."
        },
        {
          "key": "binLow",
          "header": "Weight (lower)",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Inclusive lower edge of the bin."
        },
        {
          "key": "binHigh",
          "header": "Weight (upper)",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive so the strongest synapse is never dropped."
        },
        {
          "key": "binWidth",
          "header": "Bin width",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The LINEAR width, in the bin unit. It is the density denominator even when the axis is logarithmic."
        },
        {
          "key": "signRegion",
          "header": "Sign",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "negative, or non_negative. Every bin lies wholly on one side: whenever the range spans zero an exact edge at 0 is required, and no bin may straddle it. This is the non-colour encoding of sign; the non_negative bin that starts at 0 also contains the measured zeros."
        },
        {
          "key": "count",
          "header": "Observations",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact integer count of observations in the bin. This is the raw number from which probability and density are derived."
        },
        {
          "key": "value",
          "header": "Value",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The normalized value under the declared normalization. Equal to count when normalization is count."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Dimensionless (1) for count and probability; the reciprocal of the bin unit for density."
        },
        {
          "key": "inRangeObservationCount",
          "header": "Binned observations",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The probability and density denominator. It excludes missing weights and out-of-range observations, so it can be smaller than the connection count."
        },
        {
          "key": "missingObservationCount",
          "header": "Missing observations",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Missing after the declared observation-unit rule. Distinct from measured zero."
        },
        {
          "key": "sourceConnectionCount",
          "header": "Source connections",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Raw rows before aggregation and missing exclusion. Constant across rows."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.weight_distribution.output_authority.v2"
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
      "handVectors": true,
      "externalOracle": {
        "name": "numpy.histogram",
        "version": "2.1.0",
        "status": "not_run",
        "notes": "numpy.histogram is the intended differential oracle for the binning and normalization, and it is only meaningful parameter-for-parameter: its bins are half-open except for the last, which is closed on the right \u2014 the same convention this contract fixes \u2014 and its `density=True` divides by the LINEAR bin width, which is exactly the rule that must hold under a logarithmic axis. It has no notion of a missing value, of an out-of-range policy, or of a zero-straddling bin, so those rules are covered by hand vectors instead. NEST 3.10 GetConnections is the second intended oracle, for the multapse and MPI target-rank-local fixtures specifically. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Synaptic weight matrix (target rows, source columns)",
    "canonicalQuestion": "For a declared node universe drawn as target rows and source columns, and a declared snapshot time, what is the explicitly named aggregate of the synaptic weights of every observed connection in each cell?",
    "cannotEstablish": [
      "That an empty cell is a connection whose weight is zero. An absent cell means no connection was observed under the declared scope. A measured zero weight is a drawn value with its own colour.",
      "That a cell's colour describes one synapse. Unless `no_aggregation` is in force a cell is an aggregate over every multapse mapping to it, and the aggregate hides how many synapses and how much spread produced it.",
      "That a net-zero cell contains no connection or only zero-valued ones. A sum of +8.0 and -8.0 is 0.0 \u2014 numerically identical to a single measured zero synapse. Only the contributing count and the min/max columns separate them.",
      "The functional strength or sign of a connection's influence. A weight is a model parameter: in NEST it may act as a current amplitude, a conductance, or a dimensionless factor depending on the synapse and neuron model.",
      "That the weights are current. This is a SNAPSHOT at the declared time. Under a plastic synapse model the weights at any other moment are different, and this figure says nothing about them.",
      "Anything about connections held on another MPI rank under a rank-local scope, or about any node outside the declared node universe.",
      "That the node ordering carries structure. The order is the caller's declared order; Cortexel never seriates or clusters, so an apparent block is only as real as the declared ordering."
    ],
    "renderer": {
      "id": "figure.matrix",
      "revision": 2,
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
      "maxObservations": 2e5,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true,
          "description": "Zero-based position in the exact caller-declared target-row universe."
        },
        {
          "key": "targetId",
          "header": "Target (row)",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The postsynaptic node. Rows are targets; this is fixed by Cortexel and is not caller-configurable."
        },
        {
          "key": "columnIndex",
          "header": "Column index",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Zero-based position in the same exact caller-declared source-column universe."
        },
        {
          "key": "sourceId",
          "header": "Source (column)",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The presynaptic node. Dense not_observed cells retain their exact source column; no row-level wildcard is used."
        },
        {
          "key": "cellState",
          "header": "Cell state",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "valued | present_with_missing_value | present_without_value | absent | not_observed. Missing contributors invalidate the complete aggregate but never turn a present connection into absence or zero."
        },
        {
          "key": "aggregate",
          "header": "Weight aggregate",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The named aggregate of the contributing weights, to full binary64 precision. Empty when the cell is not valued."
        },
        {
          "key": "aggregation",
          "header": "Aggregation",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The declared formula. There is no default and no 'last edge wins'."
        },
        {
          "key": "weightUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A `nest:weight` unit is simulator-defined: it has no SI mapping and is never converted or compared across systems."
        },
        {
          "key": "contributingConnectionCount",
          "header": "Connections",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Exact returned connection-row count for present or observed-absent cells. Null for not_observed, where zero returned rows is not a claim of zero real connections."
        },
        {
          "key": "contributingWeightCount",
          "header": "Measured weights",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "How many contributing rows had a finite measured weight. Null for not_observed. A mean is emitted only when this equals the connection count."
        },
        {
          "key": "missingWeightCount",
          "header": "Missing weights",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Exact connection count minus measured-weight count for present/observed cells; null for not_observed. Any positive value makes the complete aggregate null."
        },
        {
          "key": "weightMin",
          "header": "Min weight",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The smallest contributing weight. With the max and the count, this is the only route to the spread the single cell colour conceals."
        },
        {
          "key": "weightMax",
          "header": "Max weight",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The largest contributing weight. A cell whose min is negative and whose max is positive contains cancelling synapses."
        },
        {
          "key": "synapseModels",
          "header": "Synapse model(s)",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The distinct declared models contributing to the cell, and the caller-declared comparability group (synapseModelGroup) under which they were pooled, if any."
        },
        {
          "key": "contributingEdgeIds",
          "header": "Contributing edge ids",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Canonical array of caller-supplied ids contributing to the cell, or null when the snapshot supplied no edge-id channel. Revision 2 never synthesizes replacement ordinals."
        },
        {
          "key": "scopeSummary",
          "header": "Scope summary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "A bounded canonical projection of the snapshot scope and time. For global_merged, validator-proven complete coverage is represented as all_ranks_0_through_worldSize_minus_1 rather than repeating the redundant mergedRanks array in every row. The canonical request retains the exact raw scope once and the live in-process requestDigest covers that request. Artifact 1.0 binds table shape only: it does not bind these table-cell bytes and provides no detached verification or persisted assurance receipt."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "network.weight_matrix.output_authority.v2"
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
      "handVectors": true,
      "externalOracle": {
        "name": "scipy.sparse.coo_matrix duplicate summation, cross-checked against a NEST GetConnections weight snapshot",
        "version": "scipy 1.14.1; NEST 3.10.0",
        "status": "not_run",
        "notes": "coo_matrix sums duplicate (row, col) entries when converted to CSR or dense, which makes it an exact differential oracle for `aggregation: sum` and for NOTHING else: it has no mean, min, max, or no_aggregation semantics, and it maps an absent cell to 0.0 \u2014 the precise conflation this contract exists to prevent. The comparison is therefore valid only on the present cells and only under `sum`, and the absent-cell handling must be excluded before it is meaningful. Orientation must be pinned explicitly (row = target, col = source) because coo_matrix takes (row, col) positionally and a transposed oracle would agree on every symmetric fixture. The pinned reference environment has NOT been executed here, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.weight_matrix"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "This figure models the weight matrix over a SINGLE declared node universe: rows are targets and columns are sources, both indexed by that universe (a recurrent population's square matrix; a disjoint source/target set is expressed by listing the union). A bipartite projection with two separately declared, differently ordered universes is not offered, because the topology validators read one `data.nodeUniverse`, and a two-universe shape would leave endpoint-in-universe and universe-completeness unenforced. Registry gap.",
      "`count_weighted_mean` is named conditionally in the blueprint but is not defined in the multapse-aggregation registry, so it is not offered. Registry gap: it needs a precise definition before any implementation may accept it.",
      "`synapseModelGroup` records a caller-declared comparability claim. Cortexel verifies only that the group was DECLARED when two or more distinct synapse models are present (topology.weight_group_compatible checks presence, not content). It cannot verify that the declared group's model set exactly matches the models in the snapshot, nor that two synapse models' weights are actually comparable \u2014 both stay attributed to the caller. No registered disclosure id carries the claim, so it is surfaced through the accessible summary and the synapse-model table column. Registry gap.",
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Analog quantities over a declared time axis",
    "canonicalQuestion": "How did one or more declared analog quantities \u2014 each with its own kind and unit \u2014 evolve over a declared time window, without pretending that every signal is a membrane potential and without inventing values between the samples that were actually taken?",
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
      "revision": 2
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
      "maxObservations": 2e6,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true,
          "description": "The caller's stable id from the seriesIds vector. Unique across the request."
        },
        {
          "key": "seriesLabel",
          "header": "Label",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "quantityKind",
          "header": "Quantity",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The declared kind. `membrane_voltage` is a claim the caller made, not one Cortexel verified."
        },
        {
          "key": "observationKind",
          "header": "Observation",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "point_sample (joined by segments) or piecewise_constant (held, drawn as steps)."
        },
        {
          "key": "origin",
          "header": "Origin",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "recorded, or derived with the method that produced it. A derived value is never presented as a recorded one."
        },
        {
          "key": "time",
          "header": "Time",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "In the window's declared unit, after any recorded conversion."
        },
        {
          "key": "timeUnit",
          "header": "Time unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "value",
          "header": "Value",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Empty when the observation is missing. A missing observation is not zero."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The unit actually drawn, after any conversion. The original unit is preserved in the artifact."
        },
        {
          "key": "missing",
          "header": "Missing",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "true when this observation was null in the source."
        },
        {
          "key": "replicateCount",
          "header": "Replicates",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "How many samples at this timestamp produced this row. 1 for a single observation; greater than 1 means the row is an aggregate."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "uncertaintyMethod",
          "header": "Uncertainty declaration",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The exact variant metadata for this row: basis and sample count for dispersions/ranges; method, level and coverage for confidence intervals; method and both quantiles for quantile intervals. A dispersion is never relabelled as an interval."
        },
        {
          "key": "sourceOrdinal",
          "header": "Source row",
          "cellType": "finite_number_or_string",
          "nullable": false,
          "keyPart": true,
          "description": "The sample's index in the caller's original array, before stable sorting. Every drawn point can be traced back to the row it came from."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.analog_trace.output_authority.v2"
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
            "leftValue": true,
            "rightValue": false,
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
      "Uncertainty is declared once at parameters.uncertainty (figure-level). The strict request validators check the object, and the render boundary checks bounds, lengths and unit conversion, but a non-`none` declaration can qualify only a one-series figure. Per-series uncertainty for multi-series analog figures would require a new request shape and validator.",
      "Registry 1.0 binds `derivative` to the per_time dimension, so a dimensioned derivative such as dV/dt (mV/ms) cannot be expressed. Calling it dimensionless or inventing a unit would be a false statement about the dimension, so the trace is refused. A `voltage_per_time` dimension would close this.",
      "Revision 2 advertises and executes only compaction policy `none`; `line_envelope_minmax` is registered but unimplemented for this skill. Accepted traces are drawn in full and a request above the visible-mark or complete-returned-table budget is refused. A future envelope implementation must preserve one-sample extrema and bind an exact complete table before it can be advertised.",
      "Cortexel can verify that a unit's dimension matches its declared kind. It cannot verify that the channel was what the caller says it was, that a gain or reference was applied correctly upstream, or that a `derived` series was produced by the method it names.",
      "Nothing in this figure can recover a feature shorter than the sampling interval. Cortexel discloses the samples it was given; it cannot disclose what the sampler never saw."
    ]
  },
  "neuro.compartment_trace": {
    "id": "neuro.compartment_trace",
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
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
      "revision": 2
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
      "maxObservations": 2e6,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "rowIndex",
          "header": "Row",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Position on the compartment axis, in the declared order. It is not an anatomical coordinate."
        },
        {
          "key": "compartmentId",
          "header": "Compartment",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "compartmentLabel",
          "header": "Compartment label",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "parentCompartmentId",
          "header": "Parent",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Empty for a root. Declared by the caller; Cortexel does not reconstruct the tree."
        },
        {
          "key": "pathDistance",
          "header": "Path distance",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "As declared. Empty is empty \u2014 it is never 0, because 0 is the soma."
        },
        {
          "key": "pathDistanceUnit",
          "header": "Distance unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "recorded",
          "header": "Recorded",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "`no` means the compartment was declared but never recorded. That is not the same fact as a missing sample."
        },
        {
          "key": "signalId",
          "header": "Signal",
          "cellType": "string",
          "nullable": true,
          "keyPart": true
        },
        {
          "key": "time",
          "header": "Time",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": true
        },
        {
          "key": "timeUnit",
          "header": "Time unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "value",
          "header": "Value",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The sample as supplied. Empty means missing; it is never drawn or tabulated as zero."
        },
        {
          "key": "unit",
          "header": "Unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "missing",
          "header": "Missing",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "true when this observation was null in the source. Distinct from `recorded: no`, which means the compartment has no series at all."
        },
        {
          "key": "sourceOrdinal",
          "header": "Source row",
          "cellType": "finite_number_or_string",
          "nullable": true,
          "keyPart": true,
          "description": "The sample's index in the caller's original array, before the within-series stable sort."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.compartment_trace.output_authority.v2"
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
      "Registry gap: `topology.node_universe_declared` requires a COMPLETE node universe, so it is NOT declared here \u2014 this figure is designed to disclose an incomplete compartment universe (a recorded subset), which that validator would reject. The universe is still structurally required.",
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
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
      "That the two trains were really observed over the declared window. Cortexel sees events, never recording extent. A window that overstates the recording inflates every eligible-reference denominator and depresses the rate.",
      "That a declared recordedSenderIds array is externally complete. Cortexel proves that every supplied event belongs to exactly one explicit role universe and that cross universes are disjoint; only a bound source export can establish that silent recorded senders were not omitted."
    ],
    "renderer": {
      "id": "figure.correlogram",
      "revision": 2
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
      "maxObservations": 5e5,
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
      "summaryTemplate": "Correlogram ({correlationKind}): target {targetLabel} relative to reference {referenceLabel}. Positive lag means target follows reference. Declared senders, including silent: {referenceRecordedSenderCount} reference, {targetRecordedSenderCount} target. {binCount} left-closed/right-open bins of {binWidth} {lagUnit}, centred from {lagMin} to {lagMax}; positive outer edge excluded. {statistic} ({valueUnit}); denominator {denominatorStatement}. Events: {referenceEventCount} reference, {targetEventCount} target, over {observationDuration} {timeUnit}; {sourceAuthorityStatement}. Exact pairs: {candidatePairCount} candidate = {countedPairCount} in-range + {outOfRangePairCount} out-of-range + {sameEventSelfPairCountExcluded} same-event self-pairs excluded. {undefinedRateBinCount} rate bins are null because their eligible-reference count is zero. {uncertaintyStatement}",
      "tableColumns": [
        {
          "key": "lagBinStart",
          "header": "Lag bin start",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Inclusive lower edge: centre minus half a bin width."
        },
        {
          "key": "lagBinCenter",
          "header": "Lag centre",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The lag this bin is centred on. Positive means the target follows the reference."
        },
        {
          "key": "lagBinEnd",
          "header": "Lag bin end",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exclusive upper edge for every bin, including the positive outer edge."
        },
        {
          "key": "pairCount",
          "header": "Pairs",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact integer count of ordered (reference, target) event pairs whose lag falls in this bin. It is the value for raw_pair_count and the numerator for target_rate_per_reference_event."
        },
        {
          "key": "eligibleReferenceEvents",
          "header": "Eligible reference events",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Reference events whose lag-shifted bin lies inside the observation window. Null for raw_pair_count, which has no denominator; for target_rate_per_reference_event it equals the reference event count when edge correction is none."
        },
        {
          "key": "denominator",
          "header": "Denominator",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Reference-event exposure in seconds: eligibleReferenceEvents multiplied by the typed bin width converted to seconds. It is 0 when the rate is undefined for zero exposure, and null for raw_pair_count, which has no denominator."
        },
        {
          "key": "value",
          "header": "Value",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Re-derived from the exact pair count and branch denominator. Raw counts are always defined. A target-rate bin with zero eligible reference events is null, never fabricated as zero or NaN; valueStatus states that reason."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "valueStatus",
          "header": "Value status",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Exactly `defined` or `undefined_zero_eligible_reference_events`. The latter requires value null, denominator zero, eligibleReferenceEvents zero, and pairCount zero."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.correlogram.output_authority.v2"
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
          "outOfRangePairCount",
          "sameEventSelfPairCountExcluded",
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
      "The unit registry has no code for a product of two simulator-defined incoming connection weights, and raw spike times do not retain those weights. weighted_pair_sum is therefore absent from the accepted statistic enum; supporting it later requires an explicit upstream weight authority, product quantity, unit semantics and verified summation rule.",
      "No disclosure id exists for a pooled multi-unit train. The pooled sender universe is stated in the summary and the table, but no mandatory footer line announces that an autocorrelogram is multi-unit; the registry gap is recorded rather than papered over with a caller note.",
      "No disclosure id exists for a pre-binned histogram whose source kept its self-pairs, so such input is refused outright instead of being drawn with a caveat that the registry cannot express.",
      "The figure refuses to compact. Merging adjacent lag bins would widen the bin width, which IS the scientific parameter of a correlogram: a 1 ms coincidence peak merged into 5 ms bins becomes a broad hump indistinguishable from slow rate co-modulation. Oversized lag axes are refused, not summarized.",
      "Pre-binned input cannot be re-binned or re-oriented. Cortexel checks the arithmetic that connects the counts to the values; it cannot check that the source binned or oriented them the way the request declares.",
      "A correlogram is a co-occurrence statistic. Connectivity, causality, and significance are outside it, and Cortexel adds no significance band that would suggest otherwise.",
      "Revision 2 accepts uncertainty kind none only. Dispersion or interval input needs a future branch whose units, missingness mask, table cells, summary, legend and geometry are all executable; accepting those arrays before that path exists would silently discard caller data.",
      "A pre-binned target rate retains exact pair counts, exact role event counts, and either the referenceEventCount under edgeCorrection none or parallel eligibleReferenceEventCounts. Zero denominators are admitted only with zero numerator and compile to an explicit null-with-reason value. Cortexel derives every defined rate and the exact in-range/out-of-range/self-pair partition; it accepts no caller-supplied rate or accounting remainder. It still cannot verify that the upstream source counted or oriented events as declared.",
      "Raw auto and cross inputs are separate products. events_auto has one train in both roles; events_cross has explicit referenceTrain and targetTrain containers with disjoint complete sender universes. Event counts and duration are derived from those role-local arrays and the shared typed window, never supplied twice."
    ]
  },
  "neuro.isi_distribution": {
    "id": "neuro.isi_distribution",
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
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
      "revision": 2
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
      "maxObservations": 2e6,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true,
          "description": "Inclusive lower edge, in the declared bin unit."
        },
        {
          "key": "binEnd",
          "header": "Bin end",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exclusive upper edge, except for the final bin, whose upper edge is inclusive."
        },
        {
          "key": "binWidth",
          "header": "Bin width",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The LINEAR width. It is the width used by the density denominator even when the axis is logarithmic."
        },
        {
          "key": "binUnit",
          "header": "Bin unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "count",
          "header": "Intervals",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact integer count of intervals in this bin. This is the raw observation everything else is derived from; an empty bin is a measured zero, not missing data."
        },
        {
          "key": "probability",
          "header": "Probability",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "count / binned-interval total. Present only when normalization is probability."
        },
        {
          "key": "density",
          "header": "Density",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "count / (binned-interval total x linear bin width). Present only when normalization is density."
        },
        {
          "key": "densityUnit",
          "header": "Density unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The reciprocal of the bin unit, e.g. /ms for millisecond bins."
        },
        {
          "key": "binnedIntervalCount",
          "header": "Binned intervals",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The denominator. N_binned: the formed intervals that fell inside the bin range. Constant across rows. Without it, probability and density cannot be checked against count from the table alone."
        },
        {
          "key": "formedIntervalCount",
          "header": "Formed intervals",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Every interval formed within a train, including any the bin range excluded. It equals the denominator ONLY when no interval fell out of range; when it does not, the plotted probabilities describe a subset."
        },
        {
          "key": "underRangeCount",
          "header": "Below bin range",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Formed intervals below the first edge, excluded under outOfRangeIntervals: exclude_and_report. Never binned, never clipped into the first bin."
        },
        {
          "key": "overRangeCount",
          "header": "Above bin range",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Formed intervals above the last edge, excluded under outOfRangeIntervals: exclude_and_report. Never binned, never clipped into the final bin."
        },
        {
          "key": "trainCount",
          "header": "Trains",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Every train in the (selected senders x declared trials) universe, INCLUDING trains that produced no interval. An ISI histogram assembled from 3 of 200 trains is a figure about 3 neurons."
        },
        {
          "key": "spikeCount",
          "header": "In-window spikes",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The in-window spikes the intervals were formed from. A train with k in-window spikes yields exactly max(k - 1, 0) intervals \u2014 never k."
        },
        {
          "key": "excludedOutOfWindowCount",
          "header": "Spikes excluded (window)",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Spikes outside the declared window. They form no interval and are never clipped to the boundary; the right tail is censored by the window, not by the neuron."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.isi_distribution.output_authority.v2"
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
      "A logarithmic COUNT axis is not offered. An empty bin is a measured zero and has no representable position on a log axis, and the disclosure registry has no rule covering its omission \u2014 so the figure declines rather than draw a bar that silently disappears.",
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Multiple biologically distinct signals on one declared clock",
    "canonicalQuestion": "How do several biologically distinct time-varying signals \u2014 each carrying its own entity, variable identity, quantity kind, and unit \u2014 evolve together on one declared clock, without any signal being relabelled, unit-coerced, or forced onto an axis whose dimension it does not share?",
    "cannotEstablish": [
      "That one signal caused another. Co-variation on a shared clock is co-variation: an IP3 rise preceding a calcium transient is consistent with IP3-gated release and does not demonstrate it.",
      "The relative magnitude of two signals in different panels. Panels carry independent units and independent y domains, so a taller curve is not a larger effect \u2014 the panel height is a layout choice.",
      "Any magnitude comparison under `normalized_overlay`. Each series is mapped separately to a dimensionless ratio, so two curves at the same height mean only that each sits equally far from ITS OWN reference statistic.",
      "A lead or lag finer than the sampling interval. Signals sampled every 1 ms cannot establish a 0.2 ms lead, and Cortexel does not resample or interpolate to pretend otherwise.",
      "That the signals really do share a clock. `same_clock` is a caller declaration; Cortexel checks that the times are internally consistent, never that two recorders were physically synchronized.",
      "That the drawn signals are the complete state of the system. A model has state variables that were not recorded, and their absence from this figure is not evidence that they were constant.",
      "That the trace between two samples followed the drawn path. A line segment renders adjacency between two measurements; it is not itself a measurement of the interval."
    ],
    "renderer": {
      "id": "figure.multisignal_trace",
      "revision": 2
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
      "maxObservations": 2e6,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true
        },
        {
          "key": "seriesLabel",
          "header": "Label",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "entityId",
          "header": "Entity",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The entity the signal was recorded from."
        },
        {
          "key": "entityKind",
          "header": "Entity kind",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "compartmentId",
          "header": "Compartment",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "pathwayId",
          "header": "Pathway",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The declared signalling pathway or projection. Recorded verbatim; never inferred from a variable name."
        },
        {
          "key": "variableId",
          "header": "Variable",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The source model's own name for the variable. A quantity kind alone cannot distinguish calcium from IP3: both are concentrations."
        },
        {
          "key": "panelId",
          "header": "Panel",
          "cellType": "string",
          "nullable": false,
          "keyPart": true
        },
        {
          "key": "observationKind",
          "header": "Observation kind",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "point_sample (joined by a straight segment) or piecewise_constant (held to the next sample and drawn as a step)."
        },
        {
          "key": "origin",
          "header": "Origin",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "recorded or derived. A derived series is never presented as a recorded one."
        },
        {
          "key": "originMethod",
          "header": "Derivation method",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The caller-declared algorithm behind a derived series. Cortexel records and displays it; it never re-derives or verifies it."
        },
        {
          "key": "recordedTime",
          "header": "Recorded time",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "AS SUPPLIED, before any declared offset. The raw time the source reported."
        },
        {
          "key": "recordedTimeUnit",
          "header": "Recorded time unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The source clock unit AS SUPPLIED. It may differ from the display-clock unit."
        },
        {
          "key": "timeOffset",
          "header": "Declared offset",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The offset added to the recorded time to place this series on the display clock. Zero under `same_clock`, where no offset may be declared at all."
        },
        {
          "key": "timeOffsetUnit",
          "header": "Declared offset unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The offset unit AS SUPPLIED. The derivation receipt records its one-step conversion into the display-clock unit."
        },
        {
          "key": "time",
          "header": "Time",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "On the display clock, after any declared offset. recordedTime + timeOffset."
        },
        {
          "key": "timeUnit",
          "header": "Time unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "value",
          "header": "Value",
          "cellType": "finite_number_or_string",
          "nullable": true,
          "keyPart": false,
          "description": "AS SUPPLIED, before any panel unit conversion or overlay normalization. A duplicate-time aggregate carries the contributing raw values as a canonical JSON array; otherwise this is the scalar source observation."
        },
        {
          "key": "unit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The unit as supplied."
        },
        {
          "key": "displayValue",
          "header": "Drawn value",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The value as drawn: converted into the panel unit, or mapped to a dimensionless ratio under normalized_overlay."
        },
        {
          "key": "displayUnit",
          "header": "Drawn unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "missing",
          "header": "Missing",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "true when the observation is absent. It is never drawn as zero and never interpolated across."
        },
        {
          "key": "replicateCount",
          "header": "Replicates",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "How many supplied samples produced this table row. Kept replicates remain separate rows with 1 each; an aggregate row states how many replicates it combines."
        },
        {
          "key": "uncertaintyKind",
          "header": "Uncertainty kind",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "uncertaintyMethod",
          "header": "Uncertainty declaration",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The exact row-level declaration: basis and sample count for dispersions/ranges; method, level and coverage for confidence intervals; method and both quantiles for quantile intervals. An interval with no method is never drawn as one."
        },
        {
          "key": "normalizationParameters",
          "header": "Normalization parameters",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Null outside normalized_overlay. Otherwise the exact per-series statistics window, sample count, and constants used for the affine map, serialized deterministically so every displayed value can be re-derived from the raw value."
        },
        {
          "key": "sourceRowIndex",
          "header": "Source row",
          "cellType": "finite_number_or_string",
          "nullable": false,
          "keyPart": true,
          "description": "The original ordinal in the caller's array, retained through stable sorting. A duplicate-time aggregate carries the contributing ordinals as a canonical JSON array."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.multisignal_trace.output_authority.v2"
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
            "leftValue": false,
            "rightValue": true,
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
      "handVectors": true,
      "externalOracle": {
        "name": "neo.AnalogSignal.rescale + scipy.stats.zscore",
        "version": "neo 0.13.1 / scipy 1.14.1",
        "status": "not_run",
        "notes": "Neo is the intended differential oracle for unit rescaling and SciPy for the z-score. The conventions must be matched parameter for parameter before the comparison means anything: scipy.stats.zscore defaults to ddof = 0 while this contract specifies the sample standard deviation (ddof = 1), and the two disagree by a factor sqrt(N/(N-1)) \u2014 5.4% at N = 10. The pinned reference environment has not been executed in this environment, so the status is not_run rather than assumed."
      }
    },
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
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
      "revision": 2
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
      "maxObservations": 25e4,
      "maxVisibleMarks": 1e5,
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
      "summaryTemplate": "Phase plane: {yLabel} ({yUnit}) against {xLabel} ({xUnit}). {trajectoryCount} trajectories, {trajectoryPointCount} points, times {timeStart} to {timeStop} {timeUnit}, running {timeDirection} along the supplied order; arrowheads mark increasing model time. Vector field: {fieldSampleCount} samples, {latticeKind}, over x {xDomainStart} to {xDomainStop} {xUnit} and y {yDomainStart} to {yDomainStop} {yUnit}; arrow length is a {arrowScalingMode} display normalization, not a physical length; magnitude basis {magnitudeBasis}. {nullclineCount} nullclines and {fixedPointCount} fixed-point annotations, each with a declared method, residual, and convergence status. {missingStatement} {uncertaintyStatement} The path shows where the state went, not how fast; exact values and times are in the table.",
      "tableColumns": [
        {
          "key": "rowKind",
          "header": "Row",
          "cellType": "string",
          "nullable": false,
          "keyPart": true,
          "description": "trajectory_point, field_sample, nullcline_point, or fixed_point. The four are never merged into one anonymous list of coordinates."
        },
        {
          "key": "elementId",
          "header": "Element",
          "cellType": "string",
          "nullable": true,
          "keyPart": true,
          "description": "Trajectory id, nullcline curve id, or fixed-point id."
        },
        {
          "key": "sourceOrdinal",
          "header": "Source ordinal",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": true,
          "description": "Zero-based index within the owning trajectory-point, vector-field, nullcline-point, or fixed-point parallel-array carrier. Null only for a declared trajectory-universe member with no recorded point. It preserves duplicate field samples without inventing an external identity."
        },
        {
          "key": "time",
          "header": "Time",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Trajectory points only, in the declared time unit. This is the only column that distinguishes a fast excursion from a slow one."
        },
        {
          "key": "x",
          "header": "x",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The x state coordinate, in the x axis unit. Empty means MISSING, which breaks the path; it never means zero."
        },
        {
          "key": "y",
          "header": "y",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The y state coordinate, in the y axis unit."
        },
        {
          "key": "dxdt",
          "header": "dx/dt",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Caller-supplied. Cortexel never differentiates a trajectory numerically."
        },
        {
          "key": "dydt",
          "header": "dy/dt",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "derivativeUnit",
          "header": "Derivative unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "A reciprocal-time code. The FULL unit is the axis unit per this code: `/ms` on an axis in mV means mV per ms, not ms to the minus one."
        },
        {
          "key": "speed",
          "header": "Speed",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The magnitude on the declared basis. Axis-normalized speed is a display quantity that depends on the drawn extent; a physical magnitude is present only when both axes share a dimension."
        },
        {
          "key": "method",
          "header": "Method",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The named method for a nullcline or fixed point. Blank for measured points."
        },
        {
          "key": "residual",
          "header": "Residual",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "|dx/dt| and |dy/dt| at a fixed point, or the residual tolerance bounding the derivative along a nullcline."
        },
        {
          "key": "converged",
          "header": "Converged",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Re-derived by Cortexel from the residual and the tolerance, not copied from the caller's flag. `no` marks an unconverged candidate, not an equilibrium."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.phase_plane.output_authority.v2"
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
          "trajectoryCount",
          "trajectoryPointCount",
          "timeStart",
          "timeStop",
          "timeUnit",
          "timeDirection",
          "fieldSampleCount",
          "latticeKind",
          "xDomainStart",
          "xDomainStop",
          "yDomainStart",
          "yDomainStop",
          "arrowScalingMode",
          "magnitudeBasis",
          "nullclineCount",
          "fixedPointCount",
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
      'UncertaintyV1 is one-dimensional, so no joint uncertainty region for a point in state space can be expressed. `uncertaintySupport` is therefore `["none"]`, and an ensemble of trajectories must be drawn as trajectories, not as a band.',
      "Cortexel 1.0 does not integrate ODEs, evaluate model equations, compute nullclines, locate fixed points, differentiate trajectories, or draw streamlines. Every such quantity is a caller-supplied sample with a declared method.",
      "A trajectory without recorded times cannot be rendered by this figure. The sample index is not a clock, and substituting it would silently imply uniform sampling.",
      "`trace.axis_dimension_compatible` and `trace.duplicate_time_policy` read a `data.series[]` trace structure this phase plane does not use, so they are not declared. Per-component dimension is covered by `unit.dimension_match`; duplicate-time handling is a derivation concern."
    ]
  },
  "neuro.population_rate": {
    "id": "neuro.population_rate",
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
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
      "revision": 2
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
      "SOURCE_AUTHENTICITY_UNVERIFIED",
      "REFERENCE_COMPARISON_NOT_RUN",
      "UNCERTAINTY_NOT_PROVIDED",
      "PRE_BINNED_INPUT",
      "UNIT_CONVERTED",
      "CALLER_NOTE_UNVERIFIED",
      "NONSTANDARD_BUDGET_PROFILE"
    ],
    "budgets": {
      "maxObservations": 2e6,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true,
          "description": "Inclusive lower edge."
        },
        {
          "key": "binEnd",
          "header": "Bin end",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exclusive upper edge, including the final bin."
        },
        {
          "key": "binWidth",
          "header": "Bin width",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "count",
          "header": "Events",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact integer count. This is the raw observation everything else is derived from."
        },
        {
          "key": "recordedSenderCount",
          "header": "Recorded senders",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The denominator. Includes senders that never fired."
        },
        {
          "key": "rate",
          "header": "Rate",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Derived and verified from the count and the denominator."
        },
        {
          "key": "rateUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.population_rate.output_authority.v2"
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
      "Kernel-smoothed rates are intentionally unsupported in revision 2. Cortexel does not accept a bandwidth it cannot execute and surface completely.",
      "A rate is only as meaningful as the declared recorded universe. Cortexel can verify that the denominator is positive and that events belong to it; it cannot verify that the universe was recorded correctly."
    ]
  },
  "neuro.psth": {
    "id": "neuro.psth",
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
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
      "revision": 2
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
      "maxObservations": 2e6,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": true,
          "description": "Stable caller-declared series identity, repeated so a detached CSV does not rely on a mutable or colliding label."
        },
        {
          "key": "seriesLabel",
          "header": "Series",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The caller-declared series label, or the stable series id when no display label was supplied; repeated so a detached CSV remains interpretable."
        },
        {
          "key": "alignmentLabel",
          "header": "Alignment",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The caller-declared meaning of relative time zero; unverified as an experimental fact."
        },
        {
          "key": "binStart",
          "header": "Bin start (relative)",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": true,
          "description": "Inclusive lower edge, measured from the alignment instant."
        },
        {
          "key": "binEnd",
          "header": "Bin end (relative)",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exclusive upper edge; inclusive only for the final bin of a closed window."
        },
        {
          "key": "binWidth",
          "header": "Bin width",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "binUnit",
          "header": "Bin unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Registered unit shared by binStart, binEnd, and binWidth."
        },
        {
          "key": "relativeWindowStart",
          "header": "Relative-window start",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "relativeWindowStop",
          "header": "Relative-window stop",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "relativeWindowUnit",
          "header": "Relative-window unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "relativeWindowBoundary",
          "header": "Relative-window boundary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The membership convention, retained independently of the bin-placement convention."
        },
        {
          "key": "binBoundary",
          "header": "Bin boundary",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The placement convention. PSTH requires it to agree with the relative-window membership boundary."
        },
        {
          "key": "finalEdgeInclusive",
          "header": "Final edge inclusive",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Whether the last authoritative bin accepts its final edge. A closed relative window requires true."
        },
        {
          "key": "count",
          "header": "Events",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Exact integer count. Null means no included trial covered this bin \u2014 it is not a measured zero. This is the raw observation everything else is derived from."
        },
        {
          "key": "trialDenominator",
          "header": "Covering trials",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Included trials that fully cover this bin. The denominator for this bin."
        },
        {
          "key": "includedTrialCount",
          "header": "Included trials",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact included cardinality, constant across bins. Under `per_bin_covering_trials` it is the ceiling the covering-trial count is read against. Prebinned mode does not retain which trial ids are included."
        },
        {
          "key": "excludedTrialCount",
          "header": "Excluded trials",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact excluded cardinality, constant across bins. Excluded trials enter no numerator or denominator. Prebinned mode does not retain which trial ids are excluded."
        },
        {
          "key": "excludedOutOfWindowCount",
          "header": "Events excluded (out of window)",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "In events mode, events whose relative time fell outside the relative window \u2014 including one at exactly relStop under the half-open convention \u2014 and so entered no bin. Constant across bins, counted, and reported. Null in prebinned mode because no source event list exists to audit."
        },
        {
          "key": "selectedSenderCount",
          "header": "Selected senders",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "Exact selected cardinality, including silent selected senders. Used only by the per-sender normalization. Prebinned mode does not retain sender identities."
        },
        {
          "key": "normalization",
          "header": "Normalization",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The closed normalization id, repeated so `Value` cannot be detached from its denominator semantics."
        },
        {
          "key": "denominatorPolicy",
          "header": "Denominator policy",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "senderExposurePolicy",
          "header": "Sender-exposure policy",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Null unless the per-selected-sender rate is requested; otherwise the explicit nonverifiable rectangular-exposure assertion."
        },
        {
          "key": "value",
          "header": "Value",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The normalized value, re-derived and verified from the count, the denominator, and the bin width."
        },
        {
          "key": "valueUnit",
          "header": "Unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "baselineCorrectedValue",
          "header": "Value minus baseline",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "One-round exact signed difference from the aggregate baseline rate; may be negative. Null when no baseline was requested. It never replaces the count."
        },
        {
          "key": "baselineMode",
          "header": "Baseline mode",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "The closed correction id; null when no baseline was requested."
        },
        {
          "key": "baselineRate",
          "header": "Baseline rate",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Aggregate raw-count-over-exposure baseline in valueUnit; null when absent."
        },
        {
          "key": "baselineStart",
          "header": "Baseline start",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "baselineStop",
          "header": "Baseline stop",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "baselineUnit",
          "header": "Baseline unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.psth.output_authority.v2"
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
      "handVectors": true,
      "externalOracle": {
        "name": "elephant.statistics.time_histogram",
        "version": "1.2.1",
        "status": "not_run",
        "notes": "Elephant's time_histogram is the intended differential oracle for the uniform-denominator policy, with one SpikeTrain per trial. Its conventions must be reconciled parameter for parameter first: its `mean` output divides by the number of SPIKETRAINS, which equals the trial count only when each train pools every selected sender \u2014 the exact per-trial versus per-neuron conflation this contract splits into two normalization ids. It also requires the input trains to share t_start and t_stop, so it cannot oracle `per_bin_covering_trials` at all; that policy is covered by hand vectors only. The pinned reference environment has NOT been executed in this environment, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.psth"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "No BASELINE_CORRECTED disclosure id exists in disclosures.v1.json 1.0, so the baseline window, method, and derived baseline value are surfaced through the deterministic summary and the table rather than through a disclosure rule. A future registry revision should register one.",
      'The unit registry has no `rate_change` quantity kind. A baseline-subtracted value is a signed difference of rates, carried as `firing_rate` in the declared frequency unit (Hz in the events-mode default): dimensionally correct, but the kind does not encode that it may be negative. The column is headed "Value minus baseline" so it is not read as a rate.',
      "Baseline ratio and z-score modes are not offered. A ratio to baseline is undefined whenever the baseline count is zero \u2014 the common case for a sparse neuron \u2014 and a z-score needs a dispersion denominator the 1.0 validator registry has no entry for. Cortexel refuses rather than emit an infinity.",
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
      "`rate.verify_normalization` is not declared for this figure: it re-derives count / (recordedSenderCount x binWidth) from a `/data/binEdges` vector \u2014 the population-rate denominator \u2014 whereas a PSTH divides by a per-bin trial denominator and keeps one authoritative bin vector at `/parameters/bins`. Supplied `rates` are re-derived at the derivation stage instead."
    ]
  },
  "neuro.response_curve": {
    "id": "neuro.response_curve",
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
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
      "revision": 2
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
      "maxObservations": 2e4,
      "maxVisibleMarks": 5e4,
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
          "nullable": false,
          "keyPart": true
        },
        {
          "key": "conditionLabel",
          "header": "Condition label",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "input",
          "header": "Input",
          "cellType": "finite_number_or_string",
          "nullable": true,
          "keyPart": false,
          "description": "The controlled input level. Empty on an ordinal or nominal axis, which has no numeric input and must not be given one."
        },
        {
          "key": "inputUnit",
          "header": "Input unit",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "repeatId",
          "header": "Repeat",
          "cellType": "string",
          "nullable": true,
          "keyPart": true,
          "description": "Present on a raw repeat row. Empty on an aggregate row."
        },
        {
          "key": "response",
          "header": "Response",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The measured response of this repeat, or the estimate on an aggregate row."
        },
        {
          "key": "responseUnit",
          "header": "Response unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "responseMethod",
          "header": "Method",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "What the number is: a mean firing rate, a peak firing rate, a first-spike latency, or an event count."
        },
        {
          "key": "rateNormalization",
          "header": "Rate normalization",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "For a rate: single_train_rate, pooled total_event_rate, or mean_rate_per_recorded_sender. Empty for non-rate responses. A frequency unit alone does not identify this denominator."
        },
        {
          "key": "recordedSenderCount",
          "header": "Recorded senders",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The selected recorded-sender cardinality, including silent senders, for pooled_recorded_senders. Empty for single_train because one event train does not prove one underlying recorded sender. Only mean_rate_per_recorded_sender uses this value as an arithmetic divisor."
        },
        {
          "key": "missing",
          "header": "Undefined",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "True when a raw repeat response or aggregate condition estimate is undefined. An attempted undefined repeat is never rendered as zero and never removed from the attempted count."
        },
        {
          "key": "estimator",
          "header": "Estimator",
          "cellType": "string",
          "nullable": true,
          "keyPart": false
        },
        {
          "key": "sampleCount",
          "header": "n retained",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Repeats entering the estimator on a condition-estimate row; null on a raw-repeat row. Never the attempted count."
        },
        {
          "key": "excludedCount",
          "header": "n excluded",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "Repeats attempted whose response was undefined on a condition-estimate row; null on a raw-repeat row."
        },
        {
          "key": "responseBasis",
          "header": "Basis",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The event-selection scope and pooling order, full rate normalization and sender denominator where applicable, measurement window, and\u2014when the response is a peak\u2014the bin or mathematically identified kernel support/evaluation policy. A response has no scope-independent meaning."
        },
        {
          "key": "uncertaintyKind",
          "header": "Uncertainty",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Condition-estimate uncertainty kind; null on a raw-repeat row."
        },
        {
          "key": "uncertaintyValue",
          "header": "Uncertainty value",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The DISPERSION (standard deviation or standard error) for this condition. A dispersion is not an interval: it is reported here and never in the bound columns, because +/- one SD is not a coverage statement."
        },
        {
          "key": "uncertaintyLower",
          "header": "Uncertainty lower",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The lower BOUND of an interval variant. Empty for a dispersion."
        },
        {
          "key": "uncertaintyUpper",
          "header": "Uncertainty upper",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "The upper BOUND of an interval variant. Empty for a dispersion."
        },
        {
          "key": "uncertaintyBasis",
          "header": "Uncertainty basis",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "What the uncertainty was computed over (trials, neurons, ensemble members, bootstrap draws, replicates), plus the level or quantiles and the method where the variant carries them."
        },
        {
          "key": "estimatorRole",
          "header": "Estimator role",
          "cellType": "string",
          "nullable": false,
          "keyPart": true,
          "description": "Raw rows are retained, trimmed_low, trimmed_high, or undefined; aggregate rows are aggregate_estimate. This makes every raw observation's treatment explicit."
        },
        {
          "key": "trimmedCount",
          "header": "n trimmed",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "On an aggregate row, the total number of finite responses removed symmetrically from the two tails. Zero for mean and median. Empty on raw rows, whose estimatorRole identifies each trimmed observation."
        },
        {
          "key": "peakBinCount",
          "header": "Peak-bin count audit",
          "cellType": "finite_number",
          "nullable": true,
          "keyPart": false,
          "description": "For a raw binned-count peak, the exact caller-supplied max-bin event count bound to this repeat. Empty for aggregate rows, kernel peaks, and non-peak responses."
        },
        {
          "key": "peakCountDerivationAlgorithm",
          "header": "Peak-count derivation",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Names the exact count-level one-round algorithm used to re-derive this defined raw binned repeat rate or defined condition estimate. Empty on undefined rows/estimates, when no raw peak-bin count audit applies, or when that audit is entirely null and no derivation was applicable."
        },
        {
          "key": "eventScopeKind",
          "header": "Declared event scope",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "single_train means one selected spike train with no recorded-sender-cardinality claim. pooled_recorded_senders means the declared sender trains were superposed before the temporal response operation."
        },
        {
          "key": "eventSelectionId",
          "header": "Declared event selection",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "The stable caller-declared identity of the selection shared by every condition and repeat. Cortexel binds and surfaces it but cannot verify it against an unavailable external recorder."
        },
        {
          "key": "eventMembershipBinding",
          "header": "Membership binding",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "How sender membership is identified: the single-train identity, explicit unique sender ids (shown through a canonical membership digest), an externally retained canonical sender-id digest, or cardinality-only with a mandatory limitation disclosure."
        },
        {
          "key": "selectedEventTrainCount",
          "header": "Selected event trains",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The number of event trains entering the declared pooling operator: one for single_train and recordedSenderCount for pooled_recorded_senders. This is structural authority, not verification against an external recorder."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.response_curve.output_authority.v2"
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
      "handVectors": true,
      "externalOracle": {
        "name": "elephant.statistics.mean_firing_rate",
        "version": "1.2.1",
        "status": "not_run",
        "notes": "Elephant 1.2 mean_firing_rate over one SpikeTrain counts the documented [t_start,t_stop] interval inclusively, so it is an oracle for Cortexel single_train_rate only when endpoint membership is made identical\u2014for example a closed Cortexel window, or a half-open window with no event exactly at the excluded stop. Equal numeric endpoints alone are insufficient. A pooled or per-sender Cortexel rate is comparable only after also making Elephant's train axis/pooling behavior and sender universe parameter-for-parameter identical. Elephant instantaneous_rate exposes sampling period, kernel, cutoff/trim, centering, border correction, and train pooling as distinct choices; Cortexel therefore binds the corresponding mathematical kernel form, support, grid, edge policy, and rate normalization rather than inferring them. scipy.stats.trim_mean is an oracle only for the per-tail interpretation away from exact-product floor boundaries: SciPy computes int(binary64(proportiontocut * n)), whereas Cortexel floors the exact rational product of the declared binary64 value and n. The pinned reference environment has NOT been executed here, so the status is not_run rather than assumed."
      }
    },
    "legacyIds": [
      "nest.rate_response"
    ],
    "owner": "Sepehr Mahmoudian",
    "knownLimitations": [
      "Revision 2 renders no fitted model. Cortexel has no optimizer with which to re-derive a fit, and the disclosure registry has no rule that would mark a caller-supplied fit as unverified \u2014 an unmarked fitted line is indistinguishable from measured data, so the figure refuses it.",
      "Revision 2 accepts no baseline subtraction or response normalization. A baseline-corrected response is a different quantity and there is no registered disclosure to mark it; a caller who pre-transforms must say so in source.declaredLimitations, where it is rendered as an unverified caller statement.",
      "Revision 2 supports only mean firing rate, peak firing rate, first-spike latency, and event count. Mean/peak membrane voltage and mean state-variable responses are intentionally unrepresentable until a future revision binds the exact recorded variable, sender/compartment scope, sampling grid and completeness, reduction interval and boundary, missing-sample policy, and temporal-versus-cross-sender reduction order. A bare pre-reduced analog number cannot establish those choices; preserve the sampled signal with neuro.analog_trace or neuro.multisignal_trace instead.",
      "Portable validation establishes only internal structure and arithmetic. For every response method\u2014not only audited mean rates\u2014Cortexel cannot establish against unavailable source records that selectionId or member identifiers refer to the claimed records, recordedSenderCount is true, eventCompleteness is true, the declared pooling was actually performed, a membership digest has the claimed preimage/cardinality, or a supplied count, latency, or peak was computed from that selection. The mandatory external-authority disclosure and granular receipt preserve that boundary.",
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
    "revision": 2,
    "status": "stable",
    "availability": "packaged",
    "releaseReady": false,
    "title": "Spike raster: event times by identified sender and trial",
    "canonicalQuestion": "At what times, and from which identified senders and trials, were events recorded inside a declared window \u2014 with every event preserved, and with every recorded sender and every declared trial keeping its row even when nothing happened on it?",
    "cannotEstablish": [
      "A firing rate. Apparent tick density depends on mark width, row height, and the pixels available: at 800 px across a 1000 ms window one pixel column spans 1.25 ms, so ticks saturate long before the rate does. Use neuro.population_rate.",
      "Synchrony. Two ticks that look vertically aligned may be a whole pixel column apart \u2014 1.25 ms at the geometry above, which is longer than many monosynaptic delays. Alignment in a raster is a fact about the display, not about the spikes.",
      "That an empty row is a silent neuron. It shows only that no event was RECORDED for that sender in that window. Cortexel can verify that the declared universe is internally consistent; it cannot verify that the recorder saw every spike.",
      "Causality or propagation. A left-to-right sequence of ticks across rows is an ordering of observations, not evidence that one neuron drove another.",
      "That two neighbouring rows are related. Row order is a declared display order; vertical proximity carries no measured similarity, distance, or connectivity.",
      "Correlation structure. The eye reliably invents structure in a raster that a shuffle control removes. Use neuro.correlogram, which has a denominator.",
      "That the recorded senders are representative of any larger population.",
      "The exact number of events at one instant, read from the image: ticks closer than one device pixel are drawn on top of each other. Only the table is exact."
    ],
    "renderer": {
      "id": "figure.spike_raster",
      "revision": 2
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
      "maxObservations": 2e6,
      "maxVisibleMarks": 1e5,
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
          "nullable": false,
          "keyPart": false,
          "description": "The event's original zero-based index in the caller's parallel arrays. This is the audit anchor: sorting for display never changes it."
        },
        {
          "key": "eventId",
          "header": "Event id",
          "cellType": "string",
          "nullable": false,
          "keyPart": true,
          "description": "Declared id, or the deterministic ordinal identity assigned when none was declared."
        },
        {
          "key": "time",
          "header": "Event time",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The event time exactly as supplied; only the window endpoints are converted into this declared event clock for display."
        },
        {
          "key": "timeUnit",
          "header": "Time unit",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "senderId",
          "header": "Sender",
          "cellType": "string",
          "nullable": false,
          "keyPart": false
        },
        {
          "key": "trialId",
          "header": "Trial",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Empty when no trials were declared."
        },
        {
          "key": "populationId",
          "header": "Population",
          "cellType": "string",
          "nullable": true,
          "keyPart": false,
          "description": "Empty when no populations were declared."
        },
        {
          "key": "rowKey",
          "header": "Row key",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Collision-free JSON tuple identity [senderId, trialId-or-null]; labels are never used as identities."
        },
        {
          "key": "rowIndex",
          "header": "Row index",
          "cellType": "finite_number",
          "nullable": false,
          "keyPart": false,
          "description": "The zero-based row this event was assigned in the final row order. Rows with no events still appear on the axis."
        },
        {
          "key": "rowLabel",
          "header": "Row label",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "Human display label, separate from the collision-free row key."
        },
        {
          "key": "inWindow",
          "header": "In window",
          "cellType": "string",
          "nullable": false,
          "keyPart": false,
          "description": "False for an event excluded by the window. Excluded events remain listed: an event removed from the table is an event nobody can find again."
        }
      ]
    },
    "outputAuthority": {
      "version": 1,
      "evaluator": {
        "tag": "registered_evaluator",
        "id": "neuro.spike_raster.output_authority.v2"
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
            "leftValue": true,
            "rightValue": false,
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
      "handVectors": true,
      "externalOracle": {
        "name": "nest-simulator spike_recorder",
        "version": "3.10.0",
        "status": "not_run",
        "notes": "The intended differential oracle is NEST's own memory spike recorder, compared fixture for fixture on the conventions that actually differ between implementations: the open origin+start endpoint, the closed origin+stop endpoint, non-zero origin, native fractional milliseconds, nonchronological output, and duplicate rows. NEST 3.9 and 3.10 source were inspected for this repair, but the pinned executable reference environment has not been run here; status therefore remains not_run and no oracle-agreement claim is made."
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
      "For a NEST origin-relative window, exact comparisons are exact over the exported finite binary64 millisecond values. Cortexel does not inspect NEST's hidden integer-tic state, prove that the serialized status came from NEST, or recover pre-serialization timing; the mandatory NEST clock-boundary disclosure states this on every such figure.",
      "NEST `time_in_steps:true` is deliberately unsupported in revision 2. A step index plus offset is a different canonical clock representation, not a millisecond array; support requires preserving the raw pair and NEST grid authority rather than reconstructing and discarding it.",
      "Below the mark budget every event is drawn, but two events closer than one device pixel overlap. The table count is authoritative; the visible tick count is not, and no figure caption can make it so.",
      "No raster compaction or complete-table sidecar is implemented in revision 2. Requests over the exact-mark or complete-returned-table budget fail closed; the registered future raster_density_bins policy is not advertised by this skill until both surfaces exist.",
      "No uncertainty variant is renderable. An event is an observation, not an estimate, and a band drawn around one would be a fabrication."
    ]
  }
});
var CAPABILITY_CATALOG = freezeGenerated({
  "neuro.analog_trace": {
    "id": "neuro.analog_trace",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.analog_trace",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "neuro.spike_raster": {
    "id": "neuro.spike_raster",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.spike_raster",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Revision 2 returns only a complete in-memory table alongside the artifact. It refuses any request that would require an excerpt, sidecar, or raster compaction."
    ]
  },
  "neuro.population_rate": {
    "id": "neuro.population_rate",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.population_rate",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "neuro.response_curve": {
    "id": "neuro.response_curve",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.response_curve",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "neuro.isi_distribution": {
    "id": "neuro.isi_distribution",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.distribution",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "neuro.psth": {
    "id": "neuro.psth",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.psth",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "neuro.correlogram": {
    "id": "neuro.correlogram",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.correlogram",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "neuro.phase_plane": {
    "id": "neuro.phase_plane",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.phase_plane",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "neuro.multisignal_trace": {
    "id": "neuro.multisignal_trace",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.multisignal_trace",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "neuro.compartment_trace": {
    "id": "neuro.compartment_trace",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.compartment_trace",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.connection_graph": {
    "id": "network.connection_graph",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.connection_graph",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.adjacency_matrix": {
    "id": "network.adjacency_matrix",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.matrix",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.weight_matrix": {
    "id": "network.weight_matrix",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.matrix",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.delay_matrix": {
    "id": "network.delay_matrix",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.matrix",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.degree_distribution": {
    "id": "network.degree_distribution",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.distribution",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.delay_distribution": {
    "id": "network.delay_distribution",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.distribution",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.weight_distribution": {
    "id": "network.weight_distribution",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.distribution",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.spatial_map_2d": {
    "id": "network.spatial_map_2d",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.spatial_map_2d",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "network.synaptic_weight_trace": {
    "id": "network.synaptic_weight_trace",
    "kind": "skill",
    "status": "stable",
    "availability": "packaged",
    "renderer": "figure.synaptic_weight_trace",
    "determinismClass": "deterministic_svg",
    "exportClass": "svg+table",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian"
  },
  "nest.connectivity_matrix": {
    "id": "nest.connectivity_matrix",
    "kind": "skill",
    "status": "removed",
    "availability": "unavailable",
    "owner": "Sepehr Mahmoudian",
    "replacement": "network.connection_graph",
    "removalVersion": "1.0.0",
    "limitations": [
      "The pre-1.0 id named a schematic edge-list topology despite its misleading name. Migration targets network.connection_graph but remains partial until the caller supplies the node universe, identities, snapshot scope, and multapse/autapse policies; it is never reinterpreted as a matrix from whichever optional channel happens to be present."
    ]
  },
  "nest.spatial_2d": {
    "id": "nest.spatial_2d",
    "kind": "skill",
    "status": "removed",
    "availability": "unavailable",
    "owner": "Sepehr Mahmoudian",
    "replacement": "network.spatial_map_2d",
    "removalVersion": "1.0.0",
    "limitations": [
      "A host-only (`scene: null`) duplicate. Cortexel could validate the request but could not enforce the caption or own the output, so it was never a stable guarantee."
    ]
  },
  "nest.stimulus_response": {
    "id": "nest.stimulus_response",
    "kind": "skill",
    "status": "removed",
    "availability": "unavailable",
    "owner": "Sepehr Mahmoudian",
    "replacement": null,
    "removalVersion": "1.0.0",
    "limitations": [
      "There is no one-to-one replacement and no FigureBundleV1 implementation. Migration returns a manual recipe for separately validated trace, rate, and response-curve requests; it does not emit or name a bundle capability."
    ]
  },
  "nest.animation_replay": {
    "id": "nest.animation_replay",
    "kind": "skill",
    "status": "removed",
    "availability": "unavailable",
    "owner": "Sepehr Mahmoudian",
    "replacement": null,
    "removalVersion": "1.0.0",
    "limitations": [
      "No FigureRequestV1 skill schema or compiler exists. A pre-1.0 package may still recognize the legacy id, but that does not make it a current contract capability."
    ]
  },
  "cortexel": {
    "id": "cortexel",
    "kind": "export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "The package root intentionally remains the legacy 0.9 pure-core export. FigureRequestV1 is additive at cortexel/figure."
    ]
  },
  "cortexel/core": {
    "id": "cortexel/core",
    "kind": "export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "This subpath intentionally remains the legacy 0.9 core surface. FigureRequestV1 is additive at cortexel/figure."
    ]
  },
  "cortexel/figure": {
    "id": "cortexel/figure",
    "kind": "export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Pure FigureRequestV1 validation and identity surface. Packaged availability is not publication or release certification."
    ]
  },
  "cortexel/render-svg": {
    "id": "cortexel/render-svg",
    "kind": "export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Headless deterministic FigureRequestV1 builders only: each public rendering entrypoint validates its input or requires Cortexel's live validated-request capability. Raw RenderPlan construction, resource accounting, formatting/scaling primitives, and SVG serialization are internal and not exported. No React, browser, WebGL, or network dependency."
    ]
  },
  "cortexel/react": {
    "id": "cortexel/react",
    "kind": "export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [
      "three",
      "@react-three/fiber",
      "react",
      "react-dom"
    ],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "This remains the packaged legacy React/WebGL surface; the new FigureRequest renderer is the separate headless cortexel/render-svg export."
    ]
  },
  "cortexel/react/charts": {
    "id": "cortexel/react/charts",
    "kind": "export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [
      "react"
    ],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "The packaged reference-chart surface consumes the legacy VizSpec contract."
    ]
  },
  "cortexel/react/knowledge-graph": {
    "id": "cortexel/react/knowledge-graph",
    "kind": "export",
    "status": "experimental",
    "availability": "packaged",
    "requiredPeers": [
      "three",
      "@react-three/fiber",
      "d3-force-3d",
      "react",
      "react-dom"
    ],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "The packaged force-directed legacy knowledge-graph view is nondeterministic and is not a FigureRequestV1 skill/compiler."
    ]
  },
  "cortexel/skills.manifest.json": {
    "id": "cortexel/skills.manifest.json",
    "kind": "data_export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "This packaged data export continues to describe the legacy VizSpec skill axis. FigureRequestV1 contract data is separately exported under cortexel/contract/*."
    ]
  },
  "cortexel/adapters/nest": {
    "id": "cortexel/adapters/nest",
    "kind": "export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "The packaged plain-data bridge currently implements only the revision-2-admitted spike-recorder mapping; unsupported NEST shapes fail closed. This availability record is not upstream-execution or certification evidence."
    ]
  },
  "cortexel/contract": {
    "id": "cortexel/contract",
    "kind": "data_export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Normative JSON is copied once under dist/contract and exported as cortexel/contract/manifest.json plus exact registry, schema, and skill paths. Packaged does not mean published or release-ready."
    ]
  },
  "cortexel/package.json": {
    "id": "cortexel/package.json",
    "kind": "data_export",
    "status": "stable",
    "availability": "packaged",
    "requiredPeers": [],
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Explicit metadata export makes package metadata addressable without weakening exports-map encapsulation."
    ]
  },
  "cli.identity": {
    "id": "cli.identity",
    "kind": "cli",
    "status": "stable",
    "availability": "packaged",
    "owner": "Sepehr Mahmoudian"
  },
  "cli.catalog": {
    "id": "cli.catalog",
    "kind": "cli",
    "status": "stable",
    "availability": "packaged",
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Lists FigureRequest skill capabilities only. No experimental FigureRequest skill currently exists; `--include-experimental` is a forward-compatible explicit opt-in and does not list packaged legacy experimental exports."
    ]
  },
  "cli.validate": {
    "id": "cli.validate",
    "kind": "cli",
    "status": "stable",
    "availability": "packaged",
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Bounds raw file/stdin bytes before fatal UTF-8 decoding and uses the strict raw-text parser, so malformed encoding, a BOM, and duplicate JSON members remain rejectable rather than being normalized away."
    ]
  },
  "cli.render": {
    "id": "cli.render",
    "kind": "cli",
    "status": "stable",
    "availability": "packaged",
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Offline. One fixed O_EXCL lock serializes cooperative publication in the resolved physical output directory, including case/Unicode filename aliases; an existing lock is never guessed stale. Non-force publication uses same-directory O_EXCL temporaries plus atomic hard-link no-replace publication (or refuses when unavailable); force installs the artifact last. The two output files are still not one transaction, and a trusted output-directory owner remains required."
    ]
  },
  "cli.inspect": {
    "id": "cli.inspect",
    "kind": "cli",
    "status": "stable",
    "availability": "packaged",
    "owner": "Sepehr Mahmoudian"
  },
  "cli.migrate": {
    "id": "cli.migrate",
    "kind": "cli",
    "status": "stable",
    "availability": "packaged",
    "owner": "Sepehr Mahmoudian",
    "limitations": [
      "Machine output is always JSON; it uses the same bounded fatal-UTF-8 and strict raw-JSON input boundary as validation."
    ]
  }
});
var STABLE_SKILL_IDS = freezeGenerated([
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
]);
var EXPERIMENTAL_CAPABILITY_IDS = freezeGenerated([]);
var REMOVED_CAPABILITY_IDS = freezeGenerated([
  "nest.animation_replay",
  "nest.connectivity_matrix",
  "nest.spatial_2d",
  "nest.stimulus_response"
]);
var LEGACY_SKILL_MAP = freezeGenerated({
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
    "notes": "The current-only F-I assumption is NOT hard-coded into the neutral contract: the input quantity, response method, and event-selection scope must all be declared. Migration cannot infer one train versus a pooled sender population, membership, completeness, or pooling order from the legacy scalar curve.",
    "requires": [
      "an input quantity with a unit",
      "a response method",
      "a caller-declared event scope"
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
    "notes": "Cortexel's target-row / source-column display convention is frozen and stated on the axes, in the table, and in the caption. A NEST SynapseCollection is an edge list rather than a matrix-axis authority; the official NEST plotting example uses source rows and target columns, so Cortexel does not attribute its transposed display convention to NEST (https://nest-simulator.readthedocs.io/en/v3.0/auto_examples/synapsecollection.html).",
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
    "targetId": null,
    "transform": null,
    "notes": "There is no FigureRequestV1 skill schema, compiler, or experimental target id. The pre-1.0 package may still render the legacy WebGL scene through its legacy React surface, but migration fails closed instead of inventing a current-contract capability.",
    "errorCode": "MIGRATION_NO_STABLE_REPLACEMENT"
  },
  "corpus.knowledge_graph": {
    "legacyId": "corpus.knowledge_graph",
    "outcome": "experimental",
    "targetId": null,
    "transform": null,
    "notes": "There is no FigureRequestV1 skill schema or compiler. The pre-1.0 force-directed view remains available only through the packaged legacy `cortexel/react/knowledge-graph` export; migration fails closed and does not alias that legacy surface into the new contract.",
    "errorCode": "MIGRATION_NO_STABLE_REPLACEMENT"
  },
  "nest.animation_replay": {
    "legacyId": "nest.animation_replay",
    "outcome": "experimental",
    "targetId": null,
    "transform": null,
    "notes": "No FigureRequestV1 skill schema, compiler, deterministic renderer, or safe deterministic export exists. A legacy package may still recognize the pre-1.0 host route, but migration has no current-contract target.",
    "errorCode": "MIGRATION_NO_STABLE_REPLACEMENT"
  },
  "nest.connectivity_matrix": {
    "legacyId": "nest.connectivity_matrix",
    "outcome": "migrate",
    "targetId": "network.connection_graph",
    "transform": "connectivityEdgeListToConnectionGraph",
    "notes": "Despite its historical name, the pre-1.0 registry bound this id to the network-topology scene and accepted endpoint pairs with optional unit-bound weight and delay channels; it was not a literal matrix. Migration therefore targets network.connection_graph and reports every graph fact the edge list could not carry. It never infers isolates from endpoints, promotes an unknown scope to global, or invents edge identity and multapse/autapse semantics. A caller who wants a matrix must separately author the matching adjacency, weight, or delay request.",
    "requires": [
      "a complete node universe including isolates",
      "stable node and edge identities",
      "a network scope with snapshot time",
      "explicit multapse and autapse policies"
    ]
  },
  "nest.spatial_2d": {
    "legacyId": "nest.spatial_2d",
    "outcome": "migrate_conditional",
    "targetId": "network.spatial_map_2d",
    "transform": "spatial2dToSpatialMap2d",
    "errorCode": "MIGRATION_INFORMATION_MISSING",
    "notes": "A host-only route with no Cortexel-owned output. It migrates ONLY when the legacy payload already carries the complete measured-position contract \u2014 node ids bound to positions, a coordinate frame, and units. Otherwise migration returns a field-by-field error rather than fabricating a coordinate frame.",
    "requires": [
      "node ids bound to positions",
      "a coordinate frame",
      "position units"
    ]
  },
  "nest.stimulus_response": {
    "legacyId": "nest.stimulus_response",
    "outcome": "recipe",
    "targetId": null,
    "transform": null,
    "errorCode": "MIGRATION_NO_STABLE_REPLACEMENT",
    "notes": "There is no one-to-one replacement and no FigureBundleV1 implementation. Migration returns this manual recipe only: author and validate separate `neuro.analog_trace`, `neuro.population_rate`, and `neuro.response_curve` requests as scientifically appropriate. It emits no draft request.",
    "alternatives": [
      "neuro.analog_trace",
      "neuro.population_rate",
      "neuro.response_curve"
    ]
  }
});
var RENDERERS = freezeGenerated({
  "figure.analog_trace": {
    "id": "figure.analog_trace",
    "revision": 2,
    "status": "stable",
    "marks": [
      "line",
      "point",
      "rule",
      "text"
    ],
    "notes": "Lines with optional points. No smoothing by default \u2014 a smoothed trace is a separate derived artifact with a declared method. Paths BREAK at every missing sample."
  },
  "figure.multisignal_trace": {
    "id": "figure.multisignal_trace",
    "revision": 2,
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
    "revision": 2,
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
    "revision": 2,
    "status": "stable",
    "marks": [
      "rule",
      "point",
      "text"
    ],
    "notes": "Exact ticks or points below the mark cap; over-budget input fails closed because no raster compaction plus complete-sidecar implementation ships in revision 2. Event-window closure is rendered from the request, NEST origin-relative windows are converted exactly once at the presentation edge, and Y order is explicit and NEVER silently sorted by observed rate."
  },
  "figure.population_rate": {
    "id": "figure.population_rate",
    "revision": 2,
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
    "revision": 2,
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
    "revision": 2,
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
    "revision": 2,
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
    "revision": 2,
    "status": "stable",
    "marks": [
      "point",
      "line",
      "rule",
      "text"
    ],
    "notes": "Points are primary. A straight guide appears only for ordered conditions, breaks across gaps, and is never a fit or interpolation. Revision 2 renders no uncertainty area and accepts no fitted model."
  },
  "figure.phase_plane": {
    "id": "figure.phase_plane",
    "revision": 2,
    "status": "stable",
    "marks": [
      "line",
      "point",
      "path",
      "arrow",
      "text"
    ],
    "notes": "Trajectories with direction markers plus a bounded vector field. Arrow length may be normalized for display, but the magnitude is retained and the normalization is recorded."
  },
  "figure.connection_graph": {
    "id": "figure.connection_graph",
    "revision": 2,
    "status": "stable",
    "marks": [
      "line",
      "path",
      "point",
      "arrow",
      "text"
    ],
    "notes": "Preserves isolates, autapses (as visible loops), and every multapse on its own deterministic lane. Direction survives without colour or motion. Schematic layout is labelled as such."
  },
  "figure.matrix": {
    "id": "figure.matrix",
    "revision": 2,
    "status": "stable",
    "marks": [
      "rect",
      "rule",
      "text"
    ],
    "notes": "Shared by adjacency, weight, and delay matrices. Target rows, source columns. not_observed is distinct from observed absence and is never drawn as absent; both remain visually distinct from a measured numeric zero."
  },
  "figure.spatial_map_2d": {
    "id": "figure.spatial_map_2d",
    "revision": 2,
    "status": "stable",
    "marks": [
      "point",
      "line",
      "rule",
      "arrow",
      "text"
    ],
    "notes": "One equal x/y scale. Measured positions are never jittered. Marker radius is fixed screen-space decoration and is disclosed as such."
  },
  "figure.synaptic_weight_trace": {
    "id": "figure.synaptic_weight_trace",
    "revision": 2,
    "status": "stable",
    "marks": [
      "path",
      "line",
      "point",
      "area",
      "text"
    ],
    "notes": "STEPS for event-updated piecewise-constant weights; a line for sampled continuous values. Never connects across a missing observation without a declared hold or interpolation policy."
  }
});
var THEMES = freezeGenerated({
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
var CATEGORICAL_SERIES_STYLES = freezeGenerated([
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
var UNCERTAINTY_STYLES_BY_KIND = freezeGenerated({
  "confidence_interval": {
    "kind": "confidence_interval",
    "mark": "band",
    "label": "{level}% {coverage} {method} confidence interval (over {basis}, n = {sampleCount})",
    "note": "The legend states exactly what is drawn. It never says merely 'error'."
  },
  "credible_interval": {
    "kind": "credible_interval",
    "mark": "band",
    "label": "{level}% {coverage} {method} credible interval (over {basis}, n = {sampleCount})",
    "note": "Diagnostic vocabulary only in contract 1.0. Every stable skill refuses this kind; no attestation-verification boundary exists."
  },
  "quantile_interval": {
    "kind": "quantile_interval",
    "mark": "band",
    "label": "{lowerQuantile}-{upperQuantile} quantile interval ({method}, over {basis}, n = {sampleCount})"
  },
  "standard_deviation": {
    "kind": "standard_deviation",
    "mark": "whisker",
    "label": "+/-1 SD (n = {sampleCount}, over {basis})",
    "note": "A dispersion, drawn as a whisker. It is NOT an interval and is never relabelled as one."
  },
  "standard_error": {
    "kind": "standard_error",
    "mark": "whisker",
    "label": "+/-1 SEM (n = {sampleCount}, over {basis})"
  },
  "ensemble_range": {
    "kind": "ensemble_range",
    "mark": "band",
    "label": "observed min-max across {basis} (n = {sampleCount})",
    "note": "Carries NO coverage probability. Never drawn or captioned as a confidence interval."
  },
  "none": {
    "kind": "none",
    "mark": "none",
    "label": "no uncertainty shown ({reason})",
    "note": "Rendered as an explicit statement. The renderer never invents a ribbon to fill the space."
  }
});

// src/generated/registry.ts
var ERROR_CODES = freezeGenerated([
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
]);
var ERROR_STAGES = freezeGenerated([
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
]);
var ERROR_CODE_META = freezeGenerated({
  "JSON_EMPTY_INPUT": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input contained no JSON value.",
    "correctiveAction": "Send a single complete JSON document."
  },
  "JSON_SYNTAX": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input is not well-formed JSON.",
    "correctiveAction": "Fix the reported syntax position. Cortexel never accepts a fault-tolerant parse."
  },
  "JSON_DUPLICATE_KEY": {
    "stage": "parse",
    "severity": "error",
    "summary": "An object contained the same member name twice.",
    "correctiveAction": "Remove the duplicate member. Which value would have won is undefined, so the document is rejected rather than silently resolved. This check is only possible on raw JSON text; it cannot be performed on an already-materialized JavaScript value."
  },
  "JSON_TRAILING_DATA": {
    "stage": "parse",
    "severity": "error",
    "summary": "Content followed the top-level JSON value.",
    "correctiveAction": "Send exactly one top-level value."
  },
  "JSON_INVALID_NUMBER": {
    "stage": "parse",
    "severity": "error",
    "summary": "A numeric token is not a valid JSON number.",
    "correctiveAction": "Use JSON number grammar. NaN, Infinity, hex, and leading '+' are not JSON."
  },
  "JSON_NON_FINITE_NUMBER": {
    "stage": "parse",
    "severity": "error",
    "summary": "A number is outside the finite binary64 model.",
    "correctiveAction": "Cortexel accepts only finite binary64 values. Represent a missing observation as null, not as a non-finite number."
  },
  "JSON_INTEGER_OUT_OF_RANGE": {
    "stage": "parse",
    "severity": "error",
    "summary": "An unsafe bare JSON integer is not the canonical spelling of its parsed binary64 value.",
    "correctiveAction": "Use an exact integer between -(2^53-1) and +(2^53-1). If the value is genuinely a binary64 measurement, use the exact ECMAScript/RFC 8785 spelling of that rounded value or decimal/exponent notation; encode a non-arithmetic identifier as a string."
  },
  "JSON_INVALID_UNICODE": {
    "stage": "parse",
    "severity": "error",
    "summary": "The raw byte stream was not well-formed UTF-8, or the JSON text contained a malformed or lone-surrogate escape sequence.",
    "correctiveAction": "Emit well-formed UTF-8 and use paired surrogate escapes."
  },
  "JSON_BOM_NOT_ALLOWED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input began with a byte-order mark.",
    "correctiveAction": "Strip the BOM. The parser profile rejects it in both TypeScript and Python."
  },
  "JSON_COMMENT_NOT_ALLOWED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input contained a comment.",
    "correctiveAction": "Comments are not JSON. Remove them."
  },
  "JSON_TRAILING_COMMA_NOT_ALLOWED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input contained a trailing comma.",
    "correctiveAction": "Trailing commas are not JSON. Remove them."
  },
  "JSON_DEPTH_EXCEEDED": {
    "stage": "parse",
    "severity": "error",
    "summary": "Nesting depth exceeded the parser limit.",
    "correctiveAction": "Flatten the document. The limit is enforced during scanning, before any parse tree is allocated."
  },
  "JSON_BYTES_EXCEEDED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The raw input exceeded the byte limit for the active budget profile.",
    "correctiveAction": "Reduce the payload, or reference bulk arrays with a DataRef instead of inlining them."
  },
  "JSON_TOKENS_EXCEEDED": {
    "stage": "parse",
    "severity": "error",
    "summary": "The input exceeded the total token limit.",
    "correctiveAction": "Reduce the document size or use data references."
  },
  "JSON_STRING_TOO_LONG": {
    "stage": "parse",
    "severity": "error",
    "summary": "A single string exceeded the maximum string length.",
    "correctiveAction": "Shorten the string. Labels and notes have explicit bounded lengths."
  },
  "JSON_NUMBER_TOKEN_TOO_LONG": {
    "stage": "parse",
    "severity": "error",
    "summary": "A numeric token was longer than any meaningful binary64 literal.",
    "correctiveAction": "Emit an ordinary binary64 literal. A very long digit string cannot add precision."
  },
  "JSON_ARRAY_TOO_LONG": {
    "stage": "parse",
    "severity": "error",
    "summary": "An array exceeded the maximum member count.",
    "correctiveAction": "Reduce the array or use a data reference."
  },
  "JSON_TOO_MANY_KEYS": {
    "stage": "parse",
    "severity": "error",
    "summary": "An object exceeded the maximum member count.",
    "correctiveAction": "Reduce the object's members."
  },
  "JSON_DANGEROUS_KEY": {
    "stage": "parse",
    "severity": "error",
    "summary": "An object used a prototype-polluting member name.",
    "correctiveAction": "Remove members named __proto__, constructor, or prototype."
  },
  "SNAPSHOT_ACCESSOR_PROPERTY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A property is defined by a getter or setter.",
    "correctiveAction": "Pass plain data. Cortexel inspects property descriptors and will not invoke a caller accessor to discover a value."
  },
  "SNAPSHOT_SYMBOL_KEY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "An object carried a symbol-keyed property.",
    "correctiveAction": "Pass a JSON-compatible object."
  },
  "SNAPSHOT_NON_PLAIN_OBJECT": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A value was a class instance, Map, Set, Date, Promise, Proxy, or other non-plain object.",
    "correctiveAction": "Convert to a plain object or array before validating. Cortexel does not call toJSON, valueOf, or Symbol.toPrimitive on untrusted values."
  },
  "SNAPSHOT_SPARSE_ARRAY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "An array had holes.",
    "correctiveAction": "Use a dense array. Represent a missing observation as an explicit null."
  },
  "SNAPSHOT_DECORATED_ARRAY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "An array carried named (non-index) own properties.",
    "correctiveAction": "Pass a plain dense array with index properties only."
  },
  "SNAPSHOT_CIRCULAR_REFERENCE": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "The value graph contained a cycle.",
    "correctiveAction": "Send an acyclic JSON-compatible value."
  },
  "SNAPSHOT_UNSUPPORTED_TYPE": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A value was a function, symbol, bigint, or undefined.",
    "correctiveAction": "Use only JSON types: null, boolean, finite number, string, array, plain object."
  },
  "SNAPSHOT_NON_FINITE_NUMBER": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A number was NaN or infinite.",
    "correctiveAction": "Use null for a missing observation. A non-finite value is never a measurement."
  },
  "SNAPSHOT_INTEGER_OUT_OF_RANGE": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A host-language arbitrary-precision integer is outside the interoperable exact range.",
    "correctiveAction": "Use an exact safe integer, an IEEE-754 floating value when the quantity is genuinely approximate, or encode a non-arithmetic identifier as a string."
  },
  "SNAPSHOT_STRING_TOO_LONG": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A materialized string exceeds the active profile's length limit.",
    "correctiveAction": "Shorten the string or use a bounded content-addressed reference. Materialized input cannot bypass raw JSON string budgets."
  },
  "SNAPSHOT_DANGEROUS_KEY": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "An object used a prototype-polluting key.",
    "correctiveAction": "Remove keys named __proto__, constructor, or prototype."
  },
  "SNAPSHOT_HOSTILE_REFLECTION": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "Reflecting on the value threw. The value is treated as hostile and is not inspected again.",
    "correctiveAction": "Pass a plain value. A Proxy whose traps throw cannot be safely snapshotted."
  },
  "SNAPSHOT_DEPTH_EXCEEDED": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "Value nesting exceeded the snapshot depth limit.",
    "correctiveAction": "Flatten the value."
  },
  "SNAPSHOT_NODES_EXCEEDED": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "The value graph exceeded the total node limit.",
    "correctiveAction": "Reduce the value or use a data reference."
  },
  "SNAPSHOT_MALFORMED_STRING": {
    "stage": "snapshot",
    "severity": "error",
    "summary": "A string was not well-formed Unicode (it contained a lone surrogate).",
    "correctiveAction": "Pass well-formed Unicode strings."
  },
  "CONTRACT_MISSING": {
    "stage": "identity",
    "severity": "error",
    "summary": "The request did not declare its contract.",
    "correctiveAction": 'Add {"contract":{"name":"cortexel-figure-request","version":"1.0"}}.'
  },
  "CONTRACT_UNSUPPORTED_VERSION": {
    "stage": "identity",
    "severity": "error",
    "summary": "The declared request-contract version is not supported by this build.",
    "correctiveAction": "Compare with getBuildIdentity(), then use migrateLegacyRequest() for a supported pre-1.0 request. The packaged CLI equivalents are `cortexel identity --json` and `cortexel migrate`; a repository checkout can run the same implementation with `bun src/cli/main.ts`."
  },
  "CONTRACT_DIGEST_MISMATCH": {
    "stage": "identity",
    "severity": "error",
    "summary": "The caller supplied a contractDigest that does not match this build's contract digest.",
    "correctiveAction": "Omit contractDigest, or pin the exact Cortexel build whose digest you recorded. A mismatch means the contract you validated against is not the contract in use."
  },
  "CONTRACT_SKILL_REVISION_UNSUPPORTED": {
    "stage": "identity",
    "severity": "error",
    "summary": "The requested skill revision is not supported by this build.",
    "correctiveAction": "Omit `skill.revision` to accept the installed revision, or install the build that provides it."
  },
  "SCHEMA_VALIDATION_FAILED": {
    "stage": "structural",
    "severity": "error",
    "summary": "The request failed structural schema validation.",
    "correctiveAction": "Correct the value at the reported instancePath. The schemaPath identifies the exact failing keyword."
  },
  "SCHEMA_UNKNOWN_PROPERTY": {
    "stage": "structural",
    "severity": "error",
    "summary": "An object contained a property the contract does not define.",
    "correctiveAction": "Remove the property. Stable schemas are closed: a typo in a scientific field must fail rather than be silently ignored."
  },
  "SCHEMA_REQUIRED_PROPERTY_MISSING": {
    "stage": "structural",
    "severity": "error",
    "summary": "A required property is absent.",
    "correctiveAction": "Supply the property. Cortexel will not infer a scientific fact that the source did not state."
  },
  "SCHEMA_TYPE_MISMATCH": {
    "stage": "structural",
    "severity": "error",
    "summary": "A value had the wrong type.",
    "correctiveAction": "Use the declared type. Cortexel performs no type coercion."
  },
  "SCHEMA_ENUM_MISMATCH": {
    "stage": "structural",
    "severity": "error",
    "summary": "A value was outside a closed enumeration.",
    "correctiveAction": "Use one of the enumerated values listed in the schema."
  },
  "SCHEMA_UNKNOWN_SKILL": {
    "stage": "structural",
    "severity": "error",
    "summary": "The requested skill id is not in the stable catalog.",
    "correctiveAction": "Read STABLE_SKILL_IDS or run `cortexel catalog`. A legacy or experimental id is not accepted here."
  },
  "SEMANTIC_LENGTH_MISMATCH": {
    "stage": "semantic",
    "severity": "error",
    "summary": "Parallel arrays that must have equal length do not.",
    "correctiveAction": "Ensure the parallel arrays have identical lengths. Cortexel never pairs values with times by best effort."
  },
  "SEMANTIC_DUPLICATE_ID": {
    "stage": "semantic",
    "severity": "error",
    "summary": "A declared identifier appeared more than once where identity must be unique.",
    "correctiveAction": "Make the ids unique. An ambiguous identity must fail before it can diverge selection, binding, or search."
  },
  "SEMANTIC_UNKNOWN_REFERENCE": {
    "stage": "semantic",
    "severity": "error",
    "summary": "A row referenced an id that is not in the declared universe.",
    "correctiveAction": "Add the id to the declared universe, or remove the row. Cortexel will not silently extend a universe you declared."
  },
  "SEMANTIC_EMPTY_SELECTION": {
    "stage": "semantic",
    "severity": "error",
    "summary": "A required selection was empty.",
    "correctiveAction": "Select at least one member."
  },
  "SEMANTIC_VALIDATOR_UNAVAILABLE": {
    "stage": "semantic",
    "severity": "error",
    "summary": "This runtime does not implement every semantic validator required to certify the selected skill.",
    "correctiveAction": "Use a Cortexel runtime whose identity declares complete semantic coverage for this skill. A partial inspection may find definite errors, but it cannot certify validity."
  },
  "SCIENCE_UNIT_DIMENSION_MISMATCH": {
    "stage": "science",
    "severity": "error",
    "summary": "A quantity's unit dimension does not match its declared kind, or two combined quantities have incompatible dimensions.",
    "correctiveAction": "Use a unit whose dimension matches the quantity kind. Cortexel will not place a concentration and a voltage on one numeric axis because their arrays happen to be the same length."
  },
  "SCIENCE_UNIT_ALIAS_NOT_CANONICAL": {
    "stage": "science",
    "severity": "error",
    "summary": "A stable request used an accepted alias rather than the canonical unit code.",
    "correctiveAction": "Use the canonical code from the unit registry. A repair is supplied. Aliases are accepted only by adapters and migration operations, never silently in normal validation."
  },
  "SCIENCE_UNIT_NOT_CONVERTIBLE": {
    "stage": "science",
    "severity": "error",
    "summary": "A conversion was required between units that cannot be converted.",
    "correctiveAction": "Simulator-defined units (such as a NEST weight) have no SI mapping and are never converted or pooled."
  },
  "SCIENCE_BIN_EDGES_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "Histogram bin edges are not strictly increasing, or are not finite.",
    "correctiveAction": "Supply strictly increasing finite edges. n edges define n-1 half-open bins."
  },
  "SCIENCE_WINDOW_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "An analysis window is empty or inverted.",
    "correctiveAction": "Require start < stop. The default convention is the half-open interval [start, stop)."
  },
  "SCIENCE_EVENT_OUT_OF_WINDOW": {
    "stage": "science",
    "severity": "error",
    "summary": "Events fall outside the declared observation window.",
    "correctiveAction": "Widen the window or exclude the events explicitly. The count of excluded events is always recorded; events are never dropped silently."
  },
  "SCIENCE_DENOMINATOR_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "A rate denominator is missing, zero, or negative.",
    "correctiveAction": "Supply a positive recorded-sender count. Cortexel does NOT infer population size from the number of senders that happened to spike \u2014 a silent neuron is still a recorded neuron."
  },
  "SCIENCE_POPULATION_UNIVERSE_REQUIRED": {
    "stage": "science",
    "severity": "error",
    "summary": "The figure requires a declared recorded-sender universe and none was supplied.",
    "correctiveAction": "Declare the senders that were recorded. Without it, a mean-per-neuron rate cannot be computed. A skill may also require sender-universe authority for a pooled total-event rate so that its event selection remains identified; consult that skill instead of relabelling pre-pooled data as a single train."
  },
  "SCIENCE_TRIAL_UNIVERSE_REQUIRED": {
    "stage": "science",
    "severity": "error",
    "summary": "The figure requires a declared trial universe or count and none was supplied.",
    "correctiveAction": "Declare the trials. Cortexel does not infer trial count from the maximum observed trial id: a trial with no events is still a trial."
  },
  "SCIENCE_NEGATIVE_INTERVAL": {
    "stage": "science",
    "severity": "error",
    "summary": "An interval was negative after within-train sorting, which indicates invalid input.",
    "correctiveAction": "Check the event times. After stable sorting within a train, successive differences cannot be negative."
  },
  "SCIENCE_ZERO_INTERVAL_POLICY": {
    "stage": "science",
    "severity": "error",
    "summary": "A zero-length interval was found and the source profile does not permit duplicate same-sender events.",
    "correctiveAction": "Either declare that duplicate same-sender events are permitted, or fix the source data. Zero intervals are never silently removed."
  },
  "SCIENCE_COUNT_NOT_INTEGER": {
    "stage": "science",
    "severity": "error",
    "summary": "A value declared as a count is not a non-negative integer.",
    "correctiveAction": "Counts are exact. Supply integers."
  },
  "SCIENCE_COUNT_ESTIMATOR_INCOHERENT": {
    "stage": "science",
    "severity": "error",
    "summary": "An aggregate declared as an estimator over exact integer counts cannot arise from that estimator and sample count.",
    "correctiveAction": "Supply the correctly rounded mean or trimmed mean on the 1/n lattice, or a median on the integer or half-integer lattice implied by sample-count parity. Aggregate count estimates cannot exceed the safe-integer observation domain."
  },
  "SCIENCE_NORMALIZATION_UNVERIFIABLE": {
    "stage": "science",
    "severity": "error",
    "summary": "A derived value, denominator, attempt/trim identity, or declared bin/grid/kernel basis could not be verified from its supplied authority.",
    "correctiveAction": "Supply coherent raw counts and denominators, correct the exact accounting identity, or fully declare a basis that matches the typed window. Cortexel re-derives every portable relation it can and refuses unverifiable normalized claims."
  },
  "SCIENCE_EVENT_SCOPE_UNVERIFIABLE": {
    "stage": "science",
    "severity": "error",
    "summary": "An event-derived response lacks a coherent declaration of the selected event train(s), pooling operation, completeness, or membership binding.",
    "correctiveAction": "Declare one internally coherent eventScope shared across every condition and repeat. Use single_train only for one already-selected train without a sender-cardinality claim; use pooled_recorded_senders only with the exact selected recorded-sender count and an explicit, canonical-digest, or cardinality-only membership binding. Cortexel never infers this authority from responders, labels, or scalar values."
  },
  "SCIENCE_RESPONSE_METHOD_MISMATCH": {
    "stage": "science",
    "severity": "error",
    "summary": "The response method declared in parameters disagrees with the method that types the response values.",
    "correctiveAction": "Use the same registered response method in parameters.responseMethod and the response object. Cortexel never relabels a mean rate, peak rate, latency, or event count as another quantity."
  },
  "SCIENCE_RESPONSE_VALUE_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "A response value lies outside the scientific domain of its declared response method.",
    "correctiveAction": "Rates, count estimates, and defined first-spike latencies must be non-negative. Latency zero means the first event occurred exactly at the included measurement-window start; use null only when no first spike occurred."
  },
  "SCIENCE_RESPONSE_INPUT_DUPLICATE": {
    "stage": "science",
    "severity": "error",
    "summary": "Two response-curve conditions declare the same numeric input value.",
    "correctiveAction": "Combine repeated measurements as repeats within one condition. If sweep direction or another factor distinguishes equal inputs, declare that factor in a future multi-series contract rather than overlapping two conditions at one x coordinate."
  },
  "SCIENCE_LATENCY_OUTSIDE_WINDOW": {
    "stage": "science",
    "severity": "error",
    "summary": "A first-spike latency referenced to the measurement-window start lies outside that declared window.",
    "correctiveAction": "For a half-open window require 0 <= latency < stop - start after exact unit comparison; a closed window may include equality at stop. Latency zero is the included start; use null when no spike occurred inside the window."
  },
  "SCIENCE_PAIRED_REPEATS_INCOMPLETE": {
    "stage": "science",
    "severity": "error",
    "summary": "A raw response curve declared a paired repeat design but did not supply the same repeat identities at every condition.",
    "correctiveAction": "Supply every paired repeat at every declared condition, including rows whose response is null, or declare the design independent. Cortexel never imputes a missing pair."
  },
  "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE": {
    "stage": "science",
    "severity": "error",
    "summary": "A declared conversion, offset, normalization, or uncertainty transform cannot be represented without collapsing or materially distorting a scientific difference in binary64.",
    "correctiveAction": "Choose a better-scaled canonical unit or split the view so the required effect is representable. Cortexel refuses instead of publishing a rounded offset, variation, or uncertainty width as though it still matched the declaration."
  },
  "SCIENCE_DENSITY_DOES_NOT_INTEGRATE": {
    "stage": "science",
    "severity": "error",
    "summary": "A density histogram does not integrate to one over its bin widths within tolerance.",
    "correctiveAction": "Re-normalize, or use `count` or `probability` normalization instead."
  },
  "SCIENCE_DELAY_NONPOSITIVE": {
    "stage": "science",
    "severity": "error",
    "summary": "A synaptic delay was zero or negative.",
    "correctiveAction": "Delays must be finite and positive. A zero delay is not physical for the supported source simulators."
  },
  "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE": {
    "stage": "science",
    "severity": "error",
    "summary": "Weights of different declared dimensions or synapse models were combined.",
    "correctiveAction": "Group weights by synapse model or declared dimension. Two numbers are not comparable merely because both are called 'weight'."
  },
  "SCIENCE_AGGREGATION_REQUIRED": {
    "stage": "science",
    "severity": "error",
    "summary": "Multiple connections map to one cell and no multapse aggregation was declared.",
    "correctiveAction": "Declare an aggregation (sum, mean, min, max, or no_aggregation). 'Last edge wins' is never applied."
  },
  "SCIENCE_DUPLICATE_TIME_POLICY": {
    "stage": "science",
    "severity": "error",
    "summary": "A series contained duplicate timestamps and no duplicate-time policy was declared.",
    "correctiveAction": "Declare reject, keep_replicates, or an explicit aggregate with a method. Last-write-wins is never applied."
  },
  "SCIENCE_LAG_RANGE_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "The correlogram lag range or bin width is invalid.",
    "correctiveAction": "Supply a finite lag range and a positive bin width that tiles it."
  },
  "SCIENCE_CORRELATION_DENOMINATOR_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "A correlation coefficient was requested but its required statistics or a valid variance denominator are absent.",
    "correctiveAction": "Supply the required statistics, or use `raw_count` or an explicitly named rate normalization. A scaled pair count is not a correlation coefficient."
  },
  "SCIENCE_UNCERTAINTY_BOUNDS_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "Uncertainty bounds are not ordered, not finite, or do not bracket the estimate where the method requires it.",
    "correctiveAction": "Supply lower <= estimate <= upper with compatible units and matching keys."
  },
  "SCIENCE_UNCERTAINTY_LEVEL_INVALID": {
    "stage": "science",
    "severity": "error",
    "summary": "An interval level is outside (0,1), or a required sample count is not positive.",
    "correctiveAction": "Supply a valid level and basis. Cortexel never converts an arbitrary range or a standard deviation into a confidence or credible interval."
  },
  "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL": {
    "stage": "science",
    "severity": "error",
    "summary": "This figure does not support the supplied uncertainty variant.",
    "correctiveAction": "Consult the skill's contract for the supported variants."
  },
  "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA": {
    "stage": "science",
    "severity": "error",
    "summary": "The declared reason for omitting uncertainty contradicts the supplied observations or sample accounting.",
    "correctiveAction": "Use a reason supported by the data. In particular, single_trial is false when any condition declares more than one attempted repeat."
  },
  "SCOPE_REQUIRED": {
    "stage": "scope",
    "severity": "error",
    "summary": "A network figure did not declare its scope.",
    "correctiveAction": "Declare a NetworkScopeV1. A connection snapshot without scope cannot be interpreted."
  },
  "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL": {
    "stage": "scope",
    "severity": "error",
    "summary": "A rank-local or sampled snapshot was used to make a global completeness claim.",
    "correctiveAction": "Merge every rank's snapshot and declare globalMerged, or keep the output labelled as the partial evidence it is."
  },
  "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL": {
    "stage": "scope",
    "severity": "error",
    "summary": "An out-degree distribution was requested from a target-rank-local snapshot.",
    "correctiveAction": "Under NEST's MPI semantics a rank sees the connections whose TARGET it owns. In-degree is therefore computable for the local target universe; global out-degree is not, until every rank's snapshot has been merged."
  },
  "SCOPE_NODE_UNIVERSE_REQUIRED": {
    "stage": "scope",
    "severity": "error",
    "summary": "A figure whose meaning depends on isolates or zero-degree nodes did not declare its node universe.",
    "correctiveAction": "Declare the complete selected node universe. An edge list alone cannot establish that a node has degree zero \u2014 it can only establish that no edge was observed."
  },
  "SCOPE_MERGE_INCOMPLETE": {
    "stage": "scope",
    "severity": "error",
    "summary": "A merge claimed global coverage but not every rank was present.",
    "correctiveAction": "Supply every rank's snapshot. A partial rank set remains partial and cannot be upgraded."
  },
  "SCOPE_MERGE_CONFLICT": {
    "stage": "scope",
    "severity": "error",
    "summary": "Snapshots being merged disagree on simulation, snapshot time, world size, or connection identity.",
    "correctiveAction": "Merge only snapshots from the same run, the same snapshot time, and a consistent world size."
  },
  "SCOPE_POSITION_COVERAGE_INCOMPLETE": {
    "stage": "scope",
    "severity": "error",
    "summary": "Declared positions do not cover the selected node universe.",
    "correctiveAction": "Supply a position for every selected node, or reduce the selection. Nodes with missing positions are reported, never placed at the origin."
  },
  "SCOPE_INCOMPATIBLE_WITH_SKILL": {
    "stage": "scope",
    "severity": "error",
    "summary": "The declared scope cannot support this figure's claim.",
    "correctiveAction": "Consult the skill contract's legal scope/result combinations."
  },
  "PROVENANCE_SOURCE_REQUIRED": {
    "stage": "provenance",
    "severity": "error",
    "summary": "The request did not declare its source.",
    "correctiveAction": "Declare `source.kind`. `unknown` is a valid, honest answer and triggers a disclosure; it is better than invented specificity."
  },
  "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN": {
    "stage": "provenance",
    "severity": "error",
    "summary": "The request tried to set a field that only Cortexel may author.",
    "correctiveAction": "Remove it. Validation results, reference-comparison status, accessibility conformance, completeness, output digests, and disclosure text are library-generated facts. A caller declares what its data IS, never what Cortexel concluded about it."
  },
  "PROVENANCE_NOTE_TOO_LONG": {
    "stage": "provenance",
    "severity": "error",
    "summary": "The caller's declared note exceeded its length limit.",
    "correctiveAction": "Shorten the note. It is rendered as an attributed, unverified caller statement and cannot displace a mandatory disclosure."
  },
  "PROVENANCE_NOTE_UNSAFE_DISPLAY": {
    "stage": "provenance",
    "severity": "error",
    "summary": "The caller's declared note contained control, bidi-override, or zero-width characters.",
    "correctiveAction": "Remove them. Such characters can visually spoof an axis label, a caption, or a mandatory disclosure."
  },
  "PROVENANCE_ATTESTATION_UNVERIFIED": {
    "stage": "provenance",
    "severity": "error",
    "summary": "An attestation presented at a boundary requiring independent verification could not be verified.",
    "correctiveAction": "Contract 1.0 has no request or artifact attestation-verification boundary. Do not put caller-authored verification claims in a request; this append-only code remains reserved for an explicitly versioned boundary that can actually verify them."
  },
  "PROVENANCE_SOURCE_CLOCK_INCONSISTENT": {
    "stage": "provenance",
    "severity": "error",
    "summary": "A source-specific event clock contradicts the request's source, version, digest, backend, encoding, or event unit.",
    "correctiveAction": "For a NEST origin-relative window, export the complete memory-recorder status with time_in_steps=false, retain native milliseconds, declare NEST 3.9 or 3.10, and bind the export with its canonical SHA-256 digest. Do not relabel or reconstruct the clock."
  },
  "RESOURCE_BUDGET_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "The request exceeds a hard limit of the active budget profile.",
    "correctiveAction": "Reduce the input. A hard limit protects the process and cannot be raised from untrusted input; it may only be lowered."
  },
  "RESOURCE_BUDGET_PROFILE_UNKNOWN": {
    "stage": "budget",
    "severity": "error",
    "summary": "The host selected a budget profile that is not in the closed registry.",
    "correctiveAction": "Use a profile returned by the installed Cortexel build. Unknown, inherited, and caller-invented profile ids fail closed."
  },
  "RESOURCE_OBSERVATIONS_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "A series or the request as a whole exceeds the observation limit.",
    "correctiveAction": "Reduce the data or supply it as a content-addressed DataRef."
  },
  "RESOURCE_PAIRWISE_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "A pairwise computation (such as a correlogram) would exceed its cost bound.",
    "correctiveAction": "Narrow the lag range, reduce the trains, or select a subset. Cortexel refuses quadratic work rather than attempting it."
  },
  "RESOURCE_MATRIX_CELLS_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "The matrix dimensions exceed the cell budget.",
    "correctiveAction": "Reduce the node universes, or reference the data rather than materializing a dense matrix."
  },
  "RESOURCE_MARKS_EXCEEDED": {
    "stage": "budget",
    "severity": "error",
    "summary": "The compiled figure would exceed the visible-mark budget and no compaction policy applies.",
    "correctiveAction": "Enable a compaction policy that is valid for this figure, or reduce the data. Cortexel never silently truncates."
  },
  "RESOURCE_OUTPUT_BYTES_EXCEEDED": {
    "stage": "serialize",
    "severity": "error",
    "summary": "The serialized output would exceed its byte budget.",
    "correctiveAction": "Reduce the figure's complexity."
  },
  "RESOURCE_SIDECAR_BYTES_EXCEEDED": {
    "stage": "serialize",
    "severity": "error",
    "summary": "The data sidecar would exceed its byte budget.",
    "correctiveAction": "Reference the full data by digest instead of embedding it."
  },
  "RESOURCE_COMPACTION_UNAVAILABLE": {
    "stage": "budget",
    "severity": "error",
    "summary": "The data exceeds the display budget and no scientifically valid compaction exists for this figure.",
    "correctiveAction": "Reduce the data. Extrema sampling is invalid for a distribution, and block aggregation is invalid for a matrix without an explicit statistic \u2014 so Cortexel refuses rather than misrepresent."
  },
  "DATA_REFERENCE_UNRESOLVED": {
    "stage": "derivation",
    "severity": "error",
    "summary": "The request referenced data that has not been resolved.",
    "correctiveAction": "The host must resolve the reference to verified bytes and pass them in before invoking Cortexel. Stable core performs no network or filesystem access of its own."
  },
  "DATA_DIGEST_MISMATCH": {
    "stage": "derivation",
    "severity": "error",
    "summary": "Resolved data did not match its declared SHA-256.",
    "correctiveAction": "The resolver returned different bytes than the reference declares. This is treated as a failure, never as a warning."
  },
  "DATA_BYTE_LENGTH_MISMATCH": {
    "stage": "derivation",
    "severity": "error",
    "summary": "Resolved data did not match its declared byte length.",
    "correctiveAction": "Verify byte length and digest before parsing."
  },
  "DATA_MEDIA_TYPE_UNSUPPORTED": {
    "stage": "derivation",
    "severity": "error",
    "summary": "The data reference declared an unsupported media type.",
    "correctiveAction": "Use a supported interchange profile."
  },
  "RENDER_NO_DATA": {
    "stage": "render",
    "severity": "error",
    "summary": "The figure has no valid observations to draw.",
    "correctiveAction": "This is reported as an explicit empty state with a reason. Cortexel never draws an empty coordinate system that resembles measured zero."
  },
  "RENDER_DEGENERATE_DOMAIN": {
    "stage": "render",
    "severity": "error",
    "summary": "A scale domain is degenerate and no fallback is defined.",
    "correctiveAction": "Supply data with extent, or accept the documented fallback for this figure."
  },
  "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN": {
    "stage": "render",
    "severity": "error",
    "summary": "A logarithmic scale was requested for a domain containing zero or negative values.",
    "correctiveAction": "Use a linear or symlog scale, or exclude the non-positive values explicitly and accept the disclosure."
  },
  "RENDER_DIVERGING_SCALE_NO_CENTER": {
    "stage": "render",
    "severity": "error",
    "summary": "A diverging colour scale was requested with no meaningful center.",
    "correctiveAction": "Declare the center. A diverging map without a reference point implies a symmetry that the data may not have."
  },
  "RENDER_SERIES_LIMIT_EXCEEDED": {
    "stage": "render",
    "severity": "error",
    "summary": "More series were supplied than the visual system can distinguish.",
    "correctiveAction": "Use small multiples or group the series. Cortexel refuses to mint dozens of indistinguishable colours."
  },
  "RENDER_UNVALIDATED_REQUEST": {
    "stage": "render",
    "severity": "error",
    "summary": "Rendering was invoked without a validation token minted by this Cortexel instance.",
    "correctiveAction": "Call parseAndValidateRequest or validateRequestValue, require an ok result, and pass that exact frozen token to the renderer. A cast or look-alike object has no validation authority."
  },
  "RENDER_UNSUPPORTED_SKILL": {
    "stage": "render",
    "severity": "error",
    "summary": "No stable render-plan compiler exists for this skill.",
    "correctiveAction": "This is an internal invariant failure if the skill is stable; report it."
  },
  "RENDER_THEME_NONCONFORMING": {
    "stage": "render",
    "severity": "error",
    "summary": "A theme override failed its contrast or format constraints.",
    "correctiveAction": "Use an approved semantic token within the documented limits. Raw CSS, URLs, gradients, and font files are never accepted."
  },
  "RENDER_LAYOUT_UNAVAILABLE": {
    "stage": "render",
    "severity": "error",
    "summary": "The requested dimensions cannot contain a positive plotting region and mandatory figure content.",
    "correctiveAction": "Increase the figure dimensions. Cortexel never emits negative or collapsed panel geometry to make required disclosures fit."
  },
  "MIGRATION_LEGACY_ID_NOT_ACCEPTED": {
    "stage": "structural",
    "severity": "error",
    "summary": "A pre-1.0 skill id was used in normal validation.",
    "correctiveAction": "Use migrateLegacyRequest() or `cortexel migrate`. Legacy ids are never silently aliased, because a silent alias makes a stored artifact ambiguous about what was actually validated."
  },
  "MIGRATION_UNKNOWN_LEGACY_ID": {
    "stage": "migrate",
    "severity": "error",
    "summary": "The legacy id is not in the migration map.",
    "correctiveAction": "Consult MIGRATION.md for every recognized pre-1.0 id."
  },
  "MIGRATION_NO_STABLE_REPLACEMENT": {
    "stage": "migrate",
    "severity": "error",
    "summary": "The legacy capability has no stable 1.0 replacement.",
    "correctiveAction": "Consult MIGRATION.md for the alternatives. Animation replay, for example, has no deterministic stable renderer and is experimental."
  },
  "MIGRATION_AMBIGUOUS_CONNECTIVITY_MATRIX": {
    "stage": "migrate",
    "severity": "error",
    "summary": "A historical migrator refused to reinterpret the misleadingly named legacy topology id as an adjacency, weight, or delay matrix.",
    "correctiveAction": "Use the current migrator to obtain a partial network.connection_graph request, or explicitly author the desired matrix contract. Optional legacy fields never select matrix semantics."
  },
  "MIGRATION_INFORMATION_MISSING": {
    "stage": "migrate",
    "severity": "error",
    "summary": "Migration cannot proceed because the legacy payload lacks information the 1.0 contract requires.",
    "correctiveAction": "Supply the missing fact. Migration never guesses a population count, trial count, unit, node universe, MPI completeness, uncertainty, or zero-lag policy."
  },
  "MIGRATION_AMBIGUOUS": {
    "stage": "migrate",
    "severity": "warning",
    "summary": "A legacy value mapped to a weaker but accurate target because the original was ambiguous.",
    "correctiveAction": "Review the migration report and state the fact explicitly. An ambiguous source never maps to a stronger status."
  },
  "ADAPTER_NEST_UNSUPPORTED_SHAPE": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The NEST status/recorder object had a structure this adapter version does not support.",
    "correctiveAction": "Check the revision-admitted NEST version and shape profile. The observed keys are reported in a bounded, safe summary."
  },
  "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The NEST recorder time encoding is absent or cannot be represented losslessly by this adapter revision.",
    "correctiveAction": "For revision 2, configure the memory recorder with time_in_steps=false before Simulate and export its complete status. Raw step/offset support remains fail-closed until the downstream contract preserves that pair as the canonical clock."
  },
  "ADAPTER_UNSUPPORTED_VERSION": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The declared upstream source version is not in this adapter revision's admitted profile.",
    "correctiveAction": "Use a version string admitted by this adapter revision. Admission is a fail-closed input rule, not evidence that Cortexel executed or certified that upstream version; Cortexel does not silently widen the range because a resolver installed something newer."
  },
  "ADAPTER_MAPPING_REQUIRED": {
    "stage": "adapter",
    "severity": "error",
    "summary": "The adapter needs an explicit mapping the caller did not supply.",
    "correctiveAction": "Select the channel, recorded variable, sender identity, and window explicitly. A generic blob with no mapping is rejected."
  },
  "ADAPTER_ACCESSOR_INPUT_REJECTED": {
    "stage": "adapter",
    "severity": "error",
    "summary": "Adapter input carried accessor properties.",
    "correctiveAction": "Pass plain data. The adapter rejects accessor-bearing input before any getter can run."
  },
  "CAPABILITY_EXPERIMENTAL": {
    "stage": "structural",
    "severity": "error",
    "summary": "An experimental capability was requested through a stable entry point.",
    "correctiveAction": "Consult the capability registry and its mandatory availability field. No experimental FigureRequestV1 skill is currently callable; a legacy experimental package export is not a current-contract replacement."
  },
  "CAPABILITY_REMOVED": {
    "stage": "structural",
    "severity": "error",
    "summary": "The capability was removed from the catalog.",
    "correctiveAction": "See the migration table for its replacement."
  },
  "ERROR_LIMIT_REACHED": {
    "stage": "internal",
    "severity": "warning",
    "summary": "More errors were found than the diagnostic budget permits.",
    "correctiveAction": "Fix the reported errors and revalidate. The omitted count is reported so no failure is hidden."
  },
  "INTERNAL_INVARIANT_VIOLATED": {
    "stage": "internal",
    "severity": "error",
    "summary": "Cortexel detected an internal invariant violation and refused to emit a result.",
    "correctiveAction": "This is a Cortexel defect. Please report it with the reproducer. Cortexel fails rather than emit an artifact it cannot vouch for."
  }
});
var UNIT_CODES = freezeGenerated([
  "/1",
  "/A",
  "/S",
  "/V",
  "/m",
  "/mV",
  "/mm",
  "/ms",
  "/nA",
  "/nS",
  "/pA",
  "/s",
  "/um",
  "1",
  "A",
  "Hz",
  "S",
  "V",
  "deg",
  "kHz",
  "m",
  "mV",
  "mm",
  "mmol/L",
  "mol/L",
  "ms",
  "nA",
  "nS",
  "nest:delay",
  "nest:weight",
  "nmol/L",
  "pA",
  "pS",
  "rad",
  "s",
  "uV",
  "um",
  "umol/L",
  "us"
]);
var QUANTITY_KINDS = freezeGenerated([
  "angle",
  "concentration",
  "conductance",
  "correlation",
  "count",
  "current",
  "degree",
  "delay",
  "derivative",
  "duration",
  "firing_rate",
  "frequency",
  "interspike_interval",
  "length",
  "membrane_voltage",
  "position",
  "probability",
  "probability_density",
  "ratio",
  "state_variable",
  "synaptic_weight",
  "time",
  "voltage"
]);
var UNCERTAINTY_KINDS = freezeGenerated([
  "confidence_interval",
  "credible_interval",
  "ensemble_range",
  "none",
  "quantile_interval",
  "standard_deviation",
  "standard_error"
]);
var UNITS = freezeGenerated({
  "1": {
    "code": "1",
    "dimension": "dimensionless",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
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
    "code": "s",
    "dimension": "time",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "s",
    "aliases": [
      "sec",
      "seconds",
      "second"
    ]
  },
  "ms": {
    "code": "ms",
    "dimension": "time",
    "toCanonical": 1e-3,
    "toCanonicalDecimalExponent": -3,
    "label": "ms",
    "aliases": [
      "msec",
      "milliseconds",
      "millisecond"
    ]
  },
  "us": {
    "code": "us",
    "dimension": "time",
    "toCanonical": 1e-6,
    "toCanonicalDecimalExponent": -6,
    "label": "\xB5s",
    "aliases": [
      "\xB5s",
      "usec",
      "microseconds",
      "microsecond"
    ]
  },
  "Hz": {
    "code": "Hz",
    "dimension": "frequency",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "Hz",
    "aliases": [
      "hz",
      "hertz",
      "spikes/s",
      "sp/s"
    ]
  },
  "kHz": {
    "code": "kHz",
    "dimension": "frequency",
    "toCanonical": 1e3,
    "toCanonicalDecimalExponent": 3,
    "label": "kHz",
    "aliases": [
      "khz"
    ]
  },
  "V": {
    "code": "V",
    "dimension": "voltage",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "V",
    "aliases": [
      "volt",
      "volts"
    ]
  },
  "mV": {
    "code": "mV",
    "dimension": "voltage",
    "toCanonical": 1e-3,
    "toCanonicalDecimalExponent": -3,
    "label": "mV",
    "aliases": [
      "millivolt",
      "millivolts"
    ]
  },
  "uV": {
    "code": "uV",
    "dimension": "voltage",
    "toCanonical": 1e-6,
    "toCanonicalDecimalExponent": -6,
    "label": "\xB5V",
    "aliases": [
      "\xB5V",
      "microvolt",
      "microvolts"
    ]
  },
  "A": {
    "code": "A",
    "dimension": "current",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "A",
    "aliases": [
      "amp",
      "amps",
      "ampere"
    ]
  },
  "nA": {
    "code": "nA",
    "dimension": "current",
    "toCanonical": 1e-9,
    "toCanonicalDecimalExponent": -9,
    "label": "nA",
    "aliases": [
      "nanoamp",
      "nanoampere"
    ]
  },
  "pA": {
    "code": "pA",
    "dimension": "current",
    "toCanonical": 1e-12,
    "toCanonicalDecimalExponent": -12,
    "label": "pA",
    "aliases": [
      "picoamp",
      "picoampere"
    ]
  },
  "S": {
    "code": "S",
    "dimension": "conductance",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "S",
    "aliases": [
      "siemens"
    ]
  },
  "nS": {
    "code": "nS",
    "dimension": "conductance",
    "toCanonical": 1e-9,
    "toCanonicalDecimalExponent": -9,
    "label": "nS",
    "aliases": [
      "nanosiemens"
    ]
  },
  "pS": {
    "code": "pS",
    "dimension": "conductance",
    "toCanonical": 1e-12,
    "toCanonicalDecimalExponent": -12,
    "label": "pS",
    "aliases": [
      "picosiemens"
    ]
  },
  "mol/L": {
    "code": "mol/L",
    "dimension": "concentration",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "M",
    "aliases": [
      "M",
      "molar"
    ]
  },
  "mmol/L": {
    "code": "mmol/L",
    "dimension": "concentration",
    "toCanonical": 1e-3,
    "toCanonicalDecimalExponent": -3,
    "label": "mM",
    "aliases": [
      "mM",
      "millimolar"
    ]
  },
  "umol/L": {
    "code": "umol/L",
    "dimension": "concentration",
    "toCanonical": 1e-6,
    "toCanonicalDecimalExponent": -6,
    "label": "\xB5M",
    "aliases": [
      "\xB5M",
      "uM",
      "micromolar"
    ]
  },
  "nmol/L": {
    "code": "nmol/L",
    "dimension": "concentration",
    "toCanonical": 1e-9,
    "toCanonicalDecimalExponent": -9,
    "label": "nM",
    "aliases": [
      "nM",
      "nanomolar"
    ]
  },
  "m": {
    "code": "m",
    "dimension": "length",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "m",
    "aliases": [
      "metre",
      "meter",
      "metres",
      "meters"
    ]
  },
  "mm": {
    "code": "mm",
    "dimension": "length",
    "toCanonical": 1e-3,
    "toCanonicalDecimalExponent": -3,
    "label": "mm",
    "aliases": [
      "millimetre",
      "millimeter"
    ]
  },
  "um": {
    "code": "um",
    "dimension": "length",
    "toCanonical": 1e-6,
    "toCanonicalDecimalExponent": -6,
    "label": "\xB5m",
    "aliases": [
      "\xB5m",
      "micrometre",
      "micrometer",
      "micron"
    ]
  },
  "rad": {
    "code": "rad",
    "dimension": "angle",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "rad",
    "aliases": [
      "radian",
      "radians"
    ]
  },
  "deg": {
    "code": "deg",
    "dimension": "angle",
    "toCanonical": 0.017453292519943295,
    "toCanonicalDecimalExponent": null,
    "label": "\xB0",
    "aliases": [
      "degree",
      "degrees",
      "\xB0"
    ]
  },
  "/s": {
    "code": "/s",
    "dimension": "per_time",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "s\u207B\xB9",
    "aliases": [
      "1/s",
      "s^-1"
    ]
  },
  "/ms": {
    "code": "/ms",
    "dimension": "per_time",
    "toCanonical": 1e3,
    "toCanonicalDecimalExponent": 3,
    "label": "ms\u207B\xB9",
    "aliases": [
      "1/ms",
      "ms^-1"
    ]
  },
  "/V": {
    "code": "/V",
    "dimension": "per_voltage",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "V\u207B\xB9",
    "aliases": [
      "1/V"
    ]
  },
  "/mV": {
    "code": "/mV",
    "dimension": "per_voltage",
    "toCanonical": 1e3,
    "toCanonicalDecimalExponent": 3,
    "label": "mV\u207B\xB9",
    "aliases": [
      "1/mV"
    ]
  },
  "/A": {
    "code": "/A",
    "dimension": "per_current",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "A\u207B\xB9",
    "aliases": [
      "1/A"
    ]
  },
  "/nA": {
    "code": "/nA",
    "dimension": "per_current",
    "toCanonical": 1e9,
    "toCanonicalDecimalExponent": 9,
    "label": "nA\u207B\xB9",
    "aliases": [
      "1/nA"
    ]
  },
  "/pA": {
    "code": "/pA",
    "dimension": "per_current",
    "toCanonical": 1e12,
    "toCanonicalDecimalExponent": 12,
    "label": "pA\u207B\xB9",
    "aliases": [
      "1/pA"
    ]
  },
  "/S": {
    "code": "/S",
    "dimension": "per_conductance",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "S\u207B\xB9",
    "aliases": [
      "1/S"
    ]
  },
  "/nS": {
    "code": "/nS",
    "dimension": "per_conductance",
    "toCanonical": 1e9,
    "toCanonicalDecimalExponent": 9,
    "label": "nS\u207B\xB9",
    "aliases": [
      "1/nS"
    ]
  },
  "/m": {
    "code": "/m",
    "dimension": "per_length",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "m\u207B\xB9",
    "aliases": [
      "1/m"
    ]
  },
  "/mm": {
    "code": "/mm",
    "dimension": "per_length",
    "toCanonical": 1e3,
    "toCanonicalDecimalExponent": 3,
    "label": "mm\u207B\xB9",
    "aliases": [
      "1/mm"
    ]
  },
  "/um": {
    "code": "/um",
    "dimension": "per_length",
    "toCanonical": 1e6,
    "toCanonicalDecimalExponent": 6,
    "label": "\xB5m\u207B\xB9",
    "aliases": [
      "1/um"
    ]
  },
  "/1": {
    "code": "/1",
    "dimension": "per_dimensionless",
    "toCanonical": 1,
    "toCanonicalDecimalExponent": 0,
    "label": "",
    "aliases": [
      "1/1"
    ]
  },
  "nest:weight": {
    "code": "nest:weight",
    "dimension": "simulator_defined",
    "toCanonical": null,
    "toCanonicalDecimalExponent": null,
    "label": "weight (NEST)",
    "aliases": []
  },
  "nest:delay": {
    "code": "nest:delay",
    "dimension": "time",
    "toCanonical": 1e-3,
    "toCanonicalDecimalExponent": -3,
    "label": "ms",
    "aliases": []
  }
});
var UNIT_ALIASES = freezeGenerated({
  "sec": "s",
  "seconds": "s",
  "second": "s",
  "msec": "ms",
  "milliseconds": "ms",
  "millisecond": "ms",
  "\xB5s": "us",
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
  "\xB5V": "uV",
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
  "\xB5M": "umol/L",
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
  "\xB5m": "um",
  "micrometre": "um",
  "micrometer": "um",
  "micron": "um",
  "radian": "rad",
  "radians": "rad",
  "degree": "deg",
  "degrees": "deg",
  "\xB0": "deg",
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
});
var QUANTITY_KIND_DIMENSIONS = freezeGenerated({
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
});
var DISCLOSURE_RULES = freezeGenerated([
  {
    "id": "SOURCE_SIMULATION",
    "severity": "important",
    "text": "Simulation output. These values were produced by a model, not measured from a biological system."
  },
  {
    "id": "SOURCE_SYNTHETIC_FIXTURE",
    "severity": "critical",
    "text": "Synthetic fixture. This data was fabricated to exercise the software and carries no scientific meaning whatsoever."
  },
  {
    "id": "SOURCE_KIND_UNKNOWN",
    "severity": "critical",
    "text": "Source unknown. The origin of this data was not declared, so nothing about its provenance can be relied upon."
  },
  {
    "id": "SOURCE_LITERATURE_EXTRACTION",
    "severity": "important",
    "text": "Extracted from published material. Values were transcribed from a publication and have not been re-derived from primary data."
  },
  {
    "id": "SOURCE_MANUAL_ENTRY",
    "severity": "important",
    "text": "Manually entered. These values were typed in by hand rather than exported from an instrument or simulator."
  },
  {
    "id": "SOURCE_AUTHENTICITY_UNVERIFIED",
    "severity": "important",
    "text": "Source authenticity not verified. Cortexel validated the structure and semantics of this request; it did not check that the underlying source bytes are what they claim to be."
  },
  {
    "id": "REFERENCE_COMPARISON_NOT_RUN",
    "severity": "informational",
    "text": "No independent reference comparison was run for this figure."
  },
  {
    "id": "PARTIAL_NETWORK_SCOPE",
    "severity": "critical",
    "text": "Partial network view. This is not the complete network: absent connections here have not been shown to be absent globally."
  },
  {
    "id": "RANK_LOCAL_SCOPE",
    "severity": "critical",
    "text": "Rank-local snapshot (rank {rank} of {worldSize}). Under MPI, a rank holds the connections whose target it owns. In-degree is therefore complete for these local targets; out-degree and global completeness are not."
  },
  {
    "id": "SAMPLED_EDGES",
    "severity": "critical",
    "text": "Edges sampled: {retainedConnectionCount} of {sourceConnectionCount} connections are shown. Degree and completeness cannot be read from this figure."
  },
  {
    "id": "NODE_UNIVERSE_INCOMPLETE",
    "severity": "critical",
    "text": "Node set incomplete. Nodes with no drawn edge may still have connections; a node missing here is not a node with degree zero."
  },
  {
    "id": "MULTAPSE_AGGREGATED",
    "severity": "important",
    "text": "Multiple connections between the same endpoint pair were combined using {aggregation}. The drawn value is an aggregate, not a single synapse."
  },
  {
    "id": "ABSENT_IS_NOT_ZERO",
    "severity": "important",
    "text": "An empty cell means no connection was observed. It is distinct from a connection whose weight is zero, which is drawn as a value."
  },
  {
    "id": "SCHEMATIC_LAYOUT",
    "severity": "important",
    "text": "Layout is schematic. Node placement was chosen for legibility and carries no spatial meaning."
  },
  {
    "id": "POSITIONS_MISSING",
    "severity": "important",
    "text": "{missingCount} of {totalCount} nodes have no declared position and are omitted from the map rather than placed at the origin."
  },
  {
    "id": "EVENTS_EXCLUDED_OUT_OF_WINDOW",
    "severity": "important",
    "text": "{excludedCount} observations fell outside the declared observation window and are excluded from this analysis."
  },
  {
    "id": "NEST_SERIALIZED_CLOCK_BOUNDARY",
    "severity": "important",
    "text": "NEST clock boundary \u2014 Cortexel checked origin, start, stop, and event times as the exported binary64 millisecond values. It did not inspect NEST's hidden integer-tic state or establish the source export's authenticity; pre-serialization timing remains caller-declared."
  },
  {
    "id": "MISSING_VALUES_PRESENT",
    "severity": "important",
    "text": "Missing observations: {missingCount}. Missing values are omitted rather than interpolated, imputed, or drawn as zero."
  },
  {
    "id": "UNIT_CONVERTED",
    "severity": "informational",
    "text": "Units were converted during derivation: {conversions}. Source values remain in the canonical request embedded in the artifact; converted table values identify their units."
  },
  {
    "id": "UNCERTAINTY_NOT_PROVIDED",
    "severity": "important",
    "text": "No uncertainty is shown ({reason}). The absence of an uncertainty mark means uncertainty was not supplied \u2014 not that it is small."
  },
  {
    "id": "UNCERTAINTY_COVERAGE_INCOMPLETE",
    "severity": "important",
    "text": "Complete drawable uncertainty is present for {shownCount} of {seriesCount} displayed series; non-none uncertainty was declared for {declaredCount}. A missing uncertainty mark or bound means drawable uncertainty was absent there \u2014 not that it is small."
  },
  {
    "id": "AGGREGATE_WITHOUT_RAW_REPEATS",
    "severity": "important",
    "text": "Responses were supplied as per-condition aggregates ({estimator}, n = {sampleCount}). The individual repeats were not supplied and cannot be shown."
  },
  {
    "id": "EVENT_SCOPE_EXTERNAL_AUTHORITY_UNVERIFIED",
    "severity": "important",
    "text": "Event scope is caller-declared. Cortexel checks internal structure and arithmetic, but cannot establish selection referents, recorded-sender count, completeness, pooling actually performed, membership-digest preimages, or that counts, latencies, and peaks came from that selection without the source records. A single selected train may itself be pre-pooled; its source composition is not bound."
  },
  {
    "id": "EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY",
    "severity": "important",
    "text": "Event-scope membership is cardinality-only. The selected-sender count is declared, but member identities are not bound; Cortexel cannot establish that the same sender population was used across conditions or repeats."
  },
  {
    "id": "KERNEL_SMOOTHED_RATE",
    "severity": "important",
    "text": "Kernel-smoothed rate ({kernel}, bandwidth {bandwidth}). This is an estimate, not a literal count per bin, and it is drawn as a continuous line rather than as steps."
  },
  {
    "id": "ZERO_LAG_SELF_PAIRS_EXCLUDED",
    "severity": "important",
    "text": "Autocorrelation: each event paired with itself is excluded. Distinct events with identical times are retained, so the zero-lag bin is not necessarily empty."
  },
  {
    "id": "LAG_ORIENTATION",
    "severity": "informational",
    "text": "Positive lag means the target train follows the reference train by that lag."
  },
  {
    "id": "PRE_BINNED_INPUT",
    "severity": "informational",
    "text": "Input was pre-binned by the caller. Exact aggregate counts and denominators were producer-supplied: Cortexel checks their integer/range consistency and re-derives the normalization, but cannot re-derive them from raw observations. Observation identities, membership partitions, and coverage not explicitly retained by the aggregate fields cannot be recovered."
  },
  {
    "id": "RECTANGULAR_SENDER_EXPOSURE_ASSERTED",
    "severity": "important",
    "text": "Rectangular selected-sender exposure was asserted. The per-selected-sender rate assumes every selected sender was observable in every counted trial and bin; Cortexel cannot verify that exposure from spike-event presence or pre-binned aggregates."
  },
  {
    "id": "DUPLICATE_TIMES_AGGREGATED",
    "severity": "important",
    "text": "Samples sharing a timestamp were combined using {method}."
  },
  {
    "id": "MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE",
    "severity": "important",
    "text": "{missingReplicateCount} missing replicate values were excluded from duplicate-time aggregates. An all-missing replicate group remains a visible gap rather than becoming zero."
  },
  {
    "id": "CALLER_NOTE_UNVERIFIED",
    "severity": "informational",
    "text": "The figure carries a note declared by the caller. Cortexel has not verified it."
  },
  {
    "id": "NONSTANDARD_BUDGET_PROFILE",
    "severity": "important",
    "text": "Rendered under a non-default budget profile ({profileId}). This figure does not claim default conformance."
  }
]);
var SEMANTIC_VALIDATOR_IDS = freezeGenerated([
  "bins.strictly_increasing",
  "compartment_trace.series_identity_declared",
  "correlogram.event_trains_valid",
  "correlogram.lag_range_valid",
  "correlogram.prebinned_axis_consistent",
  "correlogram.roles_disjoint",
  "correlogram.statistic_denominator",
  "degree.counting_policy_declared",
  "events.sender_universe_declared",
  "events.source_clock_declared",
  "events.trial_universe_declared",
  "events.within_window",
  "histogram.normalization_consistent",
  "ids.unique",
  "isi.within_train_only",
  "isi.zero_interval_policy",
  "phase_plane.derivative_dimension",
  "provenance.no_caller_assurance",
  "provenance.note_safe_display",
  "psth.alignment_declared",
  "rate.denominator_positive",
  "rate.verify_normalization",
  "response_curve.estimator_declared",
  "series.equal_length",
  "spatial.equal_axis_units",
  "spatial.position_coverage_complete",
  "topology.delay_positive",
  "topology.edge_endpoints_in_universe",
  "topology.matrix_contract",
  "topology.multapse_aggregation_declared",
  "topology.node_universe_declared",
  "topology.scope_declared",
  "topology.scope_supports_claim",
  "topology.weight_group_compatible",
  "trace.axis_dimension_compatible",
  "trace.duplicate_time_policy",
  "uncertainty.supported_variant",
  "uncertainty.valid",
  "unit.canonical_code",
  "unit.dimension_match",
  "weight_trace.observation_kind_declared",
  "window.valid"
]);
var NUMERIC_ALGORITHMS = freezeGenerated({
  "cortexel_binary64_nominal_interval_candidates_v1": {
    "id": "cortexel_binary64_nominal_interval_candidates_v1",
    "revision": 1,
    "semantics": {
      "id": "cortexel_binary64_nominal_interval_candidates_semantics_v1",
      "version": "1.0",
      "status": "normative",
      "parameters": {
        "numberFormat": "ieee754_binary64",
        "binary64Epsilon": 2220446049250313e-31,
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
        "maximumMaterializedIntervals": 1e5,
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
      "binary64Epsilon": 2220446049250313e-31,
      "quotientToleranceEpsilonMultiplier": 8,
      "endpointToleranceEpsilonMultiplier": 8,
      "maximumMaterializedIntervals": 1e5,
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
          "accepted": true,
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
          "accepted": true,
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
          "accepted": true,
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
          "accepted": true,
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
          "accepted": true,
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
          "accepted": false,
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
          "accepted": true,
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
          "accepted": false,
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
          "accepted": false,
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
          "accepted": false,
          "failureClass": "invalid_range"
        }
      },
      {
        "name": "quotient_underflow_is_non_tiling",
        "input": {
          "start": 0,
          "stop": 5e-324,
          "width": 17976931348623157e292
        },
        "result": {
          "accepted": false,
          "failureClass": "non_tiling"
        }
      },
      {
        "name": "internal_edge_collapse_at_large_origin",
        "input": {
          "start": 1e16,
          "stop": 10000000000000004,
          "width": 1
        },
        "result": {
          "accepted": false,
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
          "accepted": false,
          "failureClass": "unrepresentable"
        }
      },
      {
        "name": "reconstructed_endpoint_overflow",
        "input": {
          "start": -17976931348623157e292,
          "stop": 17976931348623157e292,
          "width": 11984620899082107e292
        },
        "result": {
          "accepted": false,
          "failureClass": "unrepresentable"
        }
      },
      {
        "name": "exact_ratio_survives_ordinary_subtraction_overflow",
        "input": {
          "start": -17976931348623157e292,
          "stop": 17976931348623157e292,
          "width": 17976931348623157e292
        },
        "result": {
          "accepted": true,
          "intervalCount": 2,
          "edges": [
            -17976931348623157e292,
            0,
            17976931348623157e292
          ]
        }
      },
      {
        "name": "maximum_materialization_budget_accepted",
        "input": {
          "start": 0,
          "stop": 1e5,
          "width": 1
        },
        "result": {
          "accepted": true,
          "intervalCount": 1e5,
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
              "index": 1e5,
              "value": 1e5
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
          "accepted": false,
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
        "binary64Epsilon": 2220446049250313e-31,
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
      "binary64Epsilon": 2220446049250313e-31,
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
          "accepted": true,
          "lower": -1,
          "upper": 1,
          "membership": [
            true,
            true,
            false
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
          "accepted": true,
          "lower": 39.8,
          "upper": 40.2,
          "membership": [
            true,
            true,
            true
          ]
        }
      },
      {
        "name": "large_origin_does_not_expand_membership",
        "input": {
          "center": 1e15,
          "extent": 1,
          "values": [
            9999999999999995e-1,
            10000000000000005e-1,
            10000000000000006e-1
          ]
        },
        "result": {
          "accepted": true,
          "lower": 9999999999999995e-1,
          "upper": 10000000000000005e-1,
          "membership": [
            true,
            true,
            false
          ]
        }
      },
      {
        "name": "collapsed_large_origin_extent",
        "input": {
          "center": 1e16,
          "extent": 1,
          "values": []
        },
        "result": {
          "accepted": false,
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
          "accepted": false,
          "failureClass": "invalid_extent"
        }
      }
    ]
  }
});
var NUMERIC_POLICIES = freezeGenerated({
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
});
var NUMERIC_POLICY_IDS = freezeGenerated([
  "cortexel_binary64_nominal_steps_v1",
  "cortexel_binary64_spatial_domain_membership_v1",
  "cortexel_binary64_uniform_exposure_bins_v1"
]);
var CANONICALIZATION_ALGORITHMS = freezeGenerated({
  "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1": {
    "id": "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1",
    "revision": 1,
    "status": "stable",
    "input": {
      "container": "nonempty_array",
      "itemType": "string",
      "rejectEmptyItems": true,
      "rejectDuplicates": true,
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
        "canonicalJson": '["cell-1"]',
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
        "canonicalJson": '["n1","n2","n3","n4","n5","n6","n7"]',
        "digest": "sha256:fdb6b814de98ab8daa241acb8895573a50c4ff7e6864cef64c80b023054b29ce"
      },
      {
        "name": "utf16_astral_before_high_bmp",
        "outcome": "accept",
        "inputEncoding": "unicode_strings",
        "input": [
          "\uE000",
          "\u{10000}"
        ],
        "normalizedInput": [
          "\u{10000}",
          "\uE000"
        ],
        "canonicalJson": '["\u{10000}","\uE000"]',
        "digest": "sha256:e8bdee294d4a756532cd1660a49d7d99325bb04ec58c236f78b94ff2718d31de"
      },
      {
        "name": "no_unicode_normalization",
        "outcome": "accept",
        "inputEncoding": "unicode_strings",
        "input": [
          "\xE9",
          "e\u0301"
        ],
        "normalizedInput": [
          "e\u0301",
          "\xE9"
        ],
        "canonicalJson": '["e\u0301","\xE9"]',
        "digest": "sha256:d056a09c651dab55ceb8f30b349ec21de471bdf5ce4a94db7f29dc9594f54ec3"
      },
      {
        "name": "json_string_escaping",
        "outcome": "accept",
        "inputEncoding": "unicode_strings",
        "input": [
          'quote"',
          "slash\\",
          "line\n"
        ],
        "normalizedInput": [
          "line\n",
          'quote"',
          "slash\\"
        ],
        "canonicalJson": '["line\\n","quote\\"","slash\\\\"]',
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
});
var CANONICALIZATION_IDS = freezeGenerated([
  "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1"
]);

// src/core/index.ts
var import_request = require("#cortexel-request-capability");

// src/core/errors.ts
var STAGE_ORDER = Object.freeze([
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
]);
var MAX_ERROR_RECORDS = 32;
var MAX_MESSAGE_LENGTH = 500;
var MAX_PATH_LENGTH = 240;
var MAX_SUMMARY_LENGTH = 120;
var UNSAFE_DISPLAY_CLASS = "[\\u0000-\\u001f\\u061c\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff\\ufffe-\\uffff]";
function isSafeDisplayString(value) {
  return typeof value === "string" && !new RegExp(UNSAFE_DISPLAY_CLASS, "u").test(value);
}
function safeText(value, max) {
  if (typeof value !== "string" || !Number.isSafeInteger(max) || max <= 0) return "";
  let out = "";
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    const character = String.fromCodePoint(codePoint);
    const next = index + character.length;
    const loneSurrogate = codePoint >= 55296 && codePoint <= 57343;
    const token = !loneSurrogate && isSafeDisplayString(character) ? character : `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
    const capacity = next < value.length ? max - 1 : max;
    if (out.length + token.length > capacity) return `${out}\u2026`;
    out += token;
    index = next;
  }
  return out;
}
function summarizeValue(value) {
  switch (typeof value) {
    case "string":
      return safeText(`string(length=${value.length})`, MAX_SUMMARY_LENGTH);
    case "number":
      return Object.is(value, -0) ? "number(-0)" : `number(${value})`;
    case "boolean":
      return `boolean(${value ? "true" : "false"})`;
    case "bigint":
      return "bigint";
    case "undefined":
      return "undefined";
    case "symbol":
      return "<symbol>";
    case "function":
      return "<function>";
    case "object": {
      if (value === null) return "null";
      try {
        if (Array.isArray(value)) return "<array>";
      } catch {
        return "<uninspectable-object>";
      }
      return "<object>";
    }
    default:
      return "<unknown>";
  }
}
function escapePointerToken(token) {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
function pointer(...segments) {
  if (segments.length === 0) return "";
  return segments.map((segment) => `/${escapePointerToken(String(segment))}`).join("");
}
function makeError(init) {
  const error = {
    code: init.code,
    severity: init.severity ?? "error",
    stage: init.stage,
    instancePath: safeText(init.instancePath ?? "", MAX_PATH_LENGTH),
    message: safeText(init.message, MAX_MESSAGE_LENGTH)
  };
  if (init.schemaPath !== void 0) error.schemaPath = safeText(init.schemaPath, MAX_PATH_LENGTH);
  if (init.skillId !== void 0) error.skillId = safeText(init.skillId, 64);
  if (init.validatorId !== void 0) error.validatorId = safeText(init.validatorId, 64);
  if (init.limit !== void 0) error.limit = init.limit;
  if ("actual" in init) error.actualSummary = summarizeValue(init.actual);
  if (init.repair !== void 0) {
    error.repair = {
      operation: init.repair.operation,
      path: safeText(init.repair.path, MAX_PATH_LENGTH),
      ..."value" in init.repair ? { value: init.repair.value } : {},
      reasonCode: init.repair.reasonCode
    };
  }
  return error;
}
function compareUnicodeCodePoints(left, right) {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftPoint = left.codePointAt(leftIndex);
    const rightPoint = right.codePointAt(rightIndex);
    if (leftPoint !== rightPoint) return leftPoint < rightPoint ? -1 : 1;
    leftIndex += leftPoint > 65535 ? 2 : 1;
    rightIndex += rightPoint > 65535 ? 2 : 1;
  }
  if (leftIndex === left.length && rightIndex === right.length) return 0;
  return leftIndex === left.length ? -1 : 1;
}
function compareErrors(a, b) {
  const stageDelta = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
  if (stageDelta !== 0) return stageDelta;
  const pathDelta = compareUnicodeCodePoints(a.instancePath, b.instancePath);
  if (pathDelta !== 0) return pathDelta;
  const codeDelta = compareUnicodeCodePoints(a.code, b.code);
  if (codeDelta !== 0) return codeDelta;
  const av = a.validatorId ?? "";
  const bv = b.validatorId ?? "";
  return compareUnicodeCodePoints(av, bv);
}
function finalizeErrors(errors) {
  const sorted = [...errors].sort(compareErrors);
  if (sorted.length <= MAX_ERROR_RECORDS) return sorted;
  const kept = sorted.slice(0, MAX_ERROR_RECORDS - 1);
  const omitted = sorted.length - kept.length;
  const limitRecord = makeError({
    code: "ERROR_LIMIT_REACHED",
    severity: "warning",
    stage: "internal",
    message: `${omitted} further diagnostics were suppressed by the diagnostic budget. Fix the reported errors and revalidate.`
  });
  limitRecord.omittedCount = omitted;
  kept.push(limitRecord);
  return kept;
}
function ok(value, warnings = []) {
  return { ok: true, value, warnings };
}
function err(errors) {
  return { ok: false, errors: finalizeErrors(errors) };
}

// src/core/sha256.ts
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var rotr = (x, n) => x >>> n | x << 32 - n;
function sha256Bytes(message) {
  const h = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  const bitLength2 = message.length * 8;
  const paddedLength = (message.length + 8 >> 6) + 1 << 6;
  const block = new Uint8Array(paddedLength);
  block.set(message);
  block[message.length] = 128;
  const hi = Math.floor(bitLength2 / 4294967296);
  const lo = bitLength2 >>> 0;
  const lengthOffset = paddedLength - 8;
  block[lengthOffset] = hi >>> 24 & 255;
  block[lengthOffset + 1] = hi >>> 16 & 255;
  block[lengthOffset + 2] = hi >>> 8 & 255;
  block[lengthOffset + 3] = hi & 255;
  block[lengthOffset + 4] = lo >>> 24 & 255;
  block[lengthOffset + 5] = lo >>> 16 & 255;
  block[lengthOffset + 6] = lo >>> 8 & 255;
  block[lengthOffset + 7] = lo & 255;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = (block[j] << 24 | block[j + 1] << 16 | block[j + 2] << 8 | block[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const temp1 = hh + S1 + ch + K[i] + w[i] >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + temp1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 >>> 0;
    }
    h[0] = h[0] + a >>> 0;
    h[1] = h[1] + b >>> 0;
    h[2] = h[2] + c >>> 0;
    h[3] = h[3] + d >>> 0;
    h[4] = h[4] + e >>> 0;
    h[5] = h[5] + f >>> 0;
    h[6] = h[6] + g >>> 0;
    h[7] = h[7] + hh >>> 0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = h[i] >>> 24 & 255;
    out[i * 4 + 1] = h[i] >>> 16 & 255;
    out[i * 4 + 2] = h[i] >>> 8 & 255;
    out[i * 4 + 3] = h[i] & 255;
  }
  return out;
}
var HEX = "0123456789abcdef";
function toHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i] >>> 4 & 15] + HEX[bytes[i] & 15];
  }
  return out;
}
var UTF8 = new TextEncoder();
function utf8ByteLength(text) {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const first = text.charCodeAt(index);
    if (first <= 127) {
      bytes += 1;
    } else if (first <= 2047) {
      bytes += 2;
    } else if (first >= 55296 && first <= 56319) {
      const second = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (second >= 56320 && second <= 57343) {
        bytes += 4;
        index++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
function sha256Hex(text) {
  return toHex(sha256Bytes(UTF8.encode(text)));
}
function sha256Digest(text) {
  return `sha256:${sha256Hex(text)}`;
}

// src/core/canonicalize.ts
var CanonicalizationError = class extends Error {
  path;
  constructor(message, path) {
    super(message);
    this.name = "CanonicalizationError";
    this.path = path;
  }
};
function assertWellFormed(text, path) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (!(next >= 56320 && next <= 57343)) {
        throw new CanonicalizationError("unpaired high surrogate", path);
      }
      i++;
    } else if (code >= 56320 && code <= 57343) {
      throw new CanonicalizationError("unpaired low surrogate", path);
    }
  }
}
function serializeNumber(value, path) {
  if (!Number.isFinite(value)) {
    throw new CanonicalizationError(
      "non-finite numbers are outside the JCS domain and have no canonical form",
      path
    );
  }
  return JSON.stringify(value);
}
function safeOwnKeys(value, path) {
  try {
    return Reflect.ownKeys(value);
  } catch {
    throw new CanonicalizationError("object keys could not be inspected without executing a hostile trap", path);
  }
}
function safeDescriptor(value, key, path) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor) return descriptor;
  } catch {
  }
  throw new CanonicalizationError("an object member could not be inspected safely", path);
}
function childPath(path, key) {
  return `${path}/${key.replace(/~/gu, "~0").replace(/\//gu, "~1")}`;
}
function serialize(value, path, depth) {
  if (depth > 128) {
    throw new CanonicalizationError("value nests deeper than the canonicalizer permits", path);
  }
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return serializeNumber(value, path);
    case "string":
      assertWellFormed(value, path);
      return JSON.stringify(value);
    case "object":
      break;
    default:
      throw new CanonicalizationError(
        `values of type ${typeof value} are outside the JCS domain`,
        path
      );
  }
  let array = false;
  try {
    array = Array.isArray(value);
  } catch {
    throw new CanonicalizationError("the value could not be inspected safely", path);
  }
  if (array) {
    const keys2 = safeOwnKeys(value, path);
    const lengthDescriptor = safeDescriptor(value, "length", path);
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new CanonicalizationError("array length is outside the canonical JSON domain", path);
    }
    const indexKeys = [];
    for (const key of keys2) {
      if (typeof key === "symbol") {
        throw new CanonicalizationError("symbol-keyed array members are outside the JSON domain", path);
      }
      if (key === "length") continue;
      const index = Number(key);
      if (!/^(0|[1-9][0-9]*)$/u.test(key) || !Number.isSafeInteger(index) || index >= length) {
        throw new CanonicalizationError("named array members are outside the JSON domain", path);
      }
      const descriptor = safeDescriptor(value, key, childPath(path, key));
      if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        throw new CanonicalizationError("array accessors and hidden members are outside the JSON domain", path);
      }
      indexKeys.push(key);
    }
    if (indexKeys.length !== length) {
      throw new CanonicalizationError("sparse arrays are outside the canonical JSON domain", path);
    }
    indexKeys.sort((left, right) => Number(left) - Number(right));
    const parts2 = [];
    for (const key of indexKeys) {
      const at = childPath(path, key);
      const descriptor = safeDescriptor(value, key, at);
      parts2.push(serialize(descriptor.value, at, depth + 1));
    }
    return `[${parts2.join(",")}]`;
  }
  const record = value;
  let prototype;
  try {
    prototype = Object.getPrototypeOf(record);
  } catch {
    throw new CanonicalizationError("the object prototype could not be inspected safely", path);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalizationError(
      "only plain objects can be canonicalized; a class instance has no canonical JSON form",
      path
    );
  }
  const ownKeys = safeOwnKeys(record, path);
  const keys = [];
  for (const key of ownKeys) {
    if (typeof key === "symbol") {
      throw new CanonicalizationError("symbol-keyed members are outside the JSON domain", path);
    }
    const descriptor = safeDescriptor(record, key, childPath(path, key));
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw new CanonicalizationError("accessors and hidden members are outside the JSON domain", path);
    }
    keys.push(key);
  }
  keys.sort();
  const parts = [];
  for (const key of keys) {
    assertWellFormed(key, path);
    const at = childPath(path, key);
    const child = safeDescriptor(record, key, at).value;
    if (child === void 0) {
      throw new CanonicalizationError(
        `member ${JSON.stringify(key)} is undefined; undefined is not a JSON value`,
        at
      );
    }
    parts.push(`${JSON.stringify(key)}:${serialize(child, at, depth + 1)}`);
  }
  return `{${parts.join(",")}}`;
}
function canonicalize(value) {
  return serialize(value, "", 0);
}
var UTF82 = new TextEncoder();
function canonicalDigest(value) {
  return sha256Digest(canonicalize(value));
}
function canonicalDigestExcluding(value, excludeKey) {
  const copy = /* @__PURE__ */ Object.create(null);
  for (const key of safeOwnKeys(value, "")) {
    if (typeof key === "symbol") {
      throw new CanonicalizationError("symbol-keyed members are outside the JSON domain", "");
    }
    const descriptor = safeDescriptor(value, key, childPath("", key));
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw new CanonicalizationError("accessors and hidden members are outside the JSON domain", "");
    }
    if (key !== excludeKey) copy[key] = descriptor.value;
  }
  return canonicalDigest(copy);
}

// src/core/exact-binary64.ts
var FRACTION_BITS = 52n;
var FRACTION_MASK = (1n << FRACTION_BITS) - 1n;
var HIDDEN_BIT = 1n << FRACTION_BITS;
var SIGN_BIT = 1n << 63n;
var scratch = new DataView(new ArrayBuffer(8));
function finiteValueInMinSubnormalUnits(value) {
  if (!Number.isFinite(value)) throw new Error("exact binary64 accumulation requires finite values");
  scratch.setFloat64(0, value, false);
  const bits = scratch.getBigUint64(0, false);
  const negative = (bits & SIGN_BIT) !== 0n;
  const exponentBits = Number(bits >> FRACTION_BITS & 0x7ffn);
  const fraction = bits & FRACTION_MASK;
  if (exponentBits === 0 && fraction === 0n) return 0n;
  const mantissa = exponentBits === 0 ? fraction : HIDDEN_BIT + fraction;
  const shift = exponentBits === 0 ? 0n : BigInt(exponentBits - 1);
  const units = mantissa << shift;
  return negative ? -units : units;
}
function finiteBinary64ToMinSubnormalUnits(value) {
  return finiteValueInMinSubnormalUnits(value);
}
function bitLength(value) {
  return value === 0n ? 0 : value.toString(2).length;
}
function roundedQuotientEven(numerator, denominator) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const doubled = remainder << 1n;
  if (doubled > denominator || doubled === denominator && (quotient & 1n) === 1n) {
    return quotient + 1n;
  }
  return quotient;
}
function binary64FromBits(bits) {
  scratch.setBigUint64(0, bits, false);
  return scratch.getFloat64(0, false);
}
function floorBinaryLogarithmOfRational(numerator, denominator) {
  let exponent = bitLength(numerator) - bitLength(denominator);
  const numeratorAtExponent = exponent >= 0 ? denominator << BigInt(exponent) : denominator;
  const denominatorAtExponent = exponent >= 0 ? numerator : numerator << BigInt(-exponent);
  if (denominatorAtExponent < numeratorAtExponent) exponent--;
  return exponent;
}
function roundedScaledQuotient(numerator, denominator, binaryShift) {
  return binaryShift >= 0 ? roundedQuotientEven(numerator << BigInt(binaryShift), denominator) : roundedQuotientEven(numerator, denominator << BigInt(-binaryShift));
}
function roundRationalWithBinaryExponent(signedNumerator, denominator, binaryExponent) {
  if (denominator <= 0n) throw new Error("exact binary64 denominator must be positive");
  if (signedNumerator === 0n) return { value: 0, exactNonZero: false };
  const negative = signedNumerator < 0n;
  const numerator = negative ? -signedNumerator : signedNumerator;
  let exponentBits;
  let fraction;
  let valueExponent = floorBinaryLogarithmOfRational(numerator, denominator) + binaryExponent;
  if (valueExponent < -1022) {
    const subnormal = roundedScaledQuotient(
      numerator,
      denominator,
      binaryExponent + 1074
    );
    if (subnormal === 0n) return { value: negative ? -0 : 0, exactNonZero: true };
    if (subnormal >= HIDDEN_BIT) {
      exponentBits = 1;
      fraction = 0n;
    } else {
      exponentBits = 0;
      fraction = subnormal;
    }
  } else {
    let mantissa = roundedScaledQuotient(
      numerator,
      denominator,
      binaryExponent + 52 - valueExponent
    );
    if (mantissa === HIDDEN_BIT << 1n) {
      mantissa >>= 1n;
      valueExponent++;
    }
    exponentBits = valueExponent + 1023;
    if (exponentBits >= 2047) {
      throw new Error("exact binary64 result overflows the finite range");
    }
    fraction = mantissa - HIDDEN_BIT;
  }
  const bits = (negative ? SIGN_BIT : 0n) | BigInt(exponentBits) << FRACTION_BITS | fraction;
  return { value: binary64FromBits(bits), exactNonZero: true };
}
function exactRationalToBinary64(numerator, denominator, binaryExponent = 0) {
  const rounded = roundRationalWithBinaryExponent(numerator, denominator, binaryExponent);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
function exactBinary64MultiplyByRational(value, numerator, denominator, binaryExponent = 0) {
  return exactRationalToBinary64(
    finiteValueInMinSubnormalUnits(value) * numerator,
    denominator,
    binaryExponent - 1074
  );
}

// src/core/units.ts
function isKnownUnit(code) {
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(UNITS, code);
}
function dimensionOf(code) {
  return typeof code === "string" && isKnownUnit(code) ? UNITS[code].dimension : void 0;
}
function resolveAlias(code) {
  if (typeof code !== "string") return void 0;
  if (isKnownUnit(code)) return void 0;
  return Object.prototype.hasOwnProperty.call(UNIT_ALIASES, code) ? UNIT_ALIASES[code] : void 0;
}
function powerOfTen(exponent) {
  return 10n ** BigInt(exponent);
}
function exactUnitScale(unit) {
  const decimalExponent = unit.toCanonicalDecimalExponent;
  if (decimalExponent !== null) {
    return decimalExponent >= 0 ? { numerator: powerOfTen(decimalExponent), denominator: 1n, binaryExponent: 0 } : { numerator: 1n, denominator: powerOfTen(-decimalExponent), binaryExponent: 0 };
  }
  if (unit.toCanonical === null) {
    throw new Error("simulator-defined unit has no exact conversion scale");
  }
  return {
    numerator: finiteBinary64ToMinSubnormalUnits(unit.toCanonical),
    denominator: 1n,
    binaryExponent: -1074
  };
}
function exactScaleRatio(from, to) {
  const source = exactUnitScale(from);
  const target = exactUnitScale(to);
  return {
    numerator: source.numerator * target.denominator,
    denominator: source.denominator * target.numerator,
    binaryExponent: source.binaryExponent - target.binaryExponent
  };
}
function convert(value, from, to) {
  if (!Number.isFinite(value) || typeof from !== "string" || typeof to !== "string") {
    throw new Error("conversion requires a finite value and two registered unit codes");
  }
  const fromUnit = UNITS[from];
  const toUnit = UNITS[to];
  if (!fromUnit || !toUnit) {
    throw new Error(`unknown unit in conversion: ${from} -> ${to}`);
  }
  if (fromUnit.dimension !== toUnit.dimension) {
    throw new Error(
      `refusing to convert across dimensions: ${from} (${fromUnit.dimension}) -> ${to} (${toUnit.dimension})`
    );
  }
  if (fromUnit.toCanonical === null || toUnit.toCanonical === null) {
    throw new Error(
      `refusing to convert a simulator-defined unit: ${from} -> ${to}. Its physical meaning depends on the source model and has no SI mapping.`
    );
  }
  if (from === to) return value;
  const ratio = exactScaleRatio(fromUnit, toUnit);
  let converted;
  try {
    converted = exactBinary64MultiplyByRational(
      value,
      ratio.numerator,
      ratio.denominator,
      ratio.binaryExponent
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("overflows")) {
      throw new Error("unit conversion overflowed binary64");
    }
    throw error;
  }
  if (!Number.isFinite(converted) || value !== 0 && converted === 0) {
    throw new Error("unit conversion overflowed or underflowed binary64");
  }
  return converted;
}
function toSeconds(value, unit) {
  const dimension = dimensionOf(unit);
  if (dimension !== "time") {
    throw new Error(`${unit} is not a time unit (${String(dimension)})`);
  }
  return convert(value, unit, "s");
}
function axesAreCompatible(unitA, unitB) {
  if (typeof unitA !== "string" || typeof unitB !== "string") return false;
  const a = dimensionOf(unitA);
  const b = dimensionOf(unitB);
  if (a === void 0 || b === void 0) return false;
  if (a === "simulator_defined" || b === "simulator_defined") return false;
  return a === b;
}
function unitLabel(code) {
  return typeof code === "string" && isKnownUnit(code) ? UNITS[code].label : "";
}

// src/core/response-curve-basis.ts
var RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID = "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1";
function compareUtf16CodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function isWellFormedUnicode(value) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 55296 && code <= 56319) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 56320 && next <= 57343)) return false;
      index++;
    } else if (code >= 56320 && code <= 57343) {
      return false;
    }
  }
  return true;
}
function normalizeResponseEventMemberIds(identifiers) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    throw new RangeError("identifier set must be a non-empty array");
  }
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < identifiers.length; index++) {
    const identifier = identifiers[index];
    if (typeof identifier !== "string" || identifier.length === 0) {
      throw new TypeError(`identifier-set member ${index} must be a non-empty string`);
    }
    if (!isWellFormedUnicode(identifier)) {
      throw new TypeError(`identifier-set member ${index} must be well-formed Unicode`);
    }
    if (seen.has(identifier)) {
      throw new RangeError(`identifier-set member ${JSON.stringify(identifier)} is duplicated`);
    }
    seen.add(identifier);
  }
  return [...seen].sort(compareUtf16CodeUnits);
}
function responseEventMembershipDigest(identifiers) {
  return canonicalDigest(normalizeResponseEventMemberIds(identifiers));
}

// src/core/parse-json.ts
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var ParseFailure = class extends Error {
  diagnostic;
  constructor(diagnostic) {
    super(diagnostic.message);
    this.name = "ParseFailure";
    this.diagnostic = diagnostic;
  }
};
var Scanner = class {
  text;
  limits;
  index = 0;
  nodes = 0;
  /** Path segments to the value being read, for a precise JSON Pointer on failure. */
  path = [];
  constructor(text, limits) {
    this.text = text;
    this.limits = limits;
  }
  pointer() {
    if (this.path.length === 0) return "";
    return this.path.map((segment) => `/${String(segment).replace(/~/g, "~0").replace(/\//g, "~1")}`).join("");
  }
  fail(code, message, extra) {
    throw new ParseFailure(
      makeError({
        code,
        stage: "parse",
        instancePath: this.pointer(),
        message,
        ...extra?.limit ? { limit: extra.limit } : {}
      })
    );
  }
  countNode() {
    this.nodes++;
    if (this.nodes > this.limits.jsonTotalNodes) {
      this.fail("JSON_TOKENS_EXCEEDED", "the document exceeds the total node limit", {
        limit: { name: "jsonTotalNodes", limit: this.limits.jsonTotalNodes, observed: this.nodes }
      });
    }
  }
  skipWhitespace() {
    while (this.index < this.text.length) {
      const ch = this.text[this.index];
      if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        this.index++;
        continue;
      }
      if (ch === "/") {
        this.fail("JSON_COMMENT_NOT_ALLOWED", "comments are not valid JSON");
      }
      return;
    }
  }
  expect(ch) {
    if (this.text[this.index] !== ch) {
      this.fail("JSON_SYNTAX", `expected ${JSON.stringify(ch)} at offset ${this.index}`);
    }
    this.index++;
  }
  parseTopLevel() {
    this.skipWhitespace();
    if (this.index >= this.text.length) {
      this.fail("JSON_EMPTY_INPUT", "the input contained no JSON value");
    }
    const value = this.parseValue(0);
    this.skipWhitespace();
    if (this.index < this.text.length) {
      this.fail(
        "JSON_TRAILING_DATA",
        `unexpected content after the top-level value at offset ${this.index}`
      );
    }
    return value;
  }
  parseValue(depth) {
    if (depth > this.limits.jsonDepth) {
      this.fail("JSON_DEPTH_EXCEEDED", "nesting is deeper than the parser permits", {
        limit: { name: "jsonDepth", limit: this.limits.jsonDepth, observed: depth }
      });
    }
    this.skipWhitespace();
    const ch = this.text[this.index];
    switch (ch) {
      case "{":
        return this.parseObject(depth);
      case "[":
        return this.parseArray(depth);
      case '"':
        this.countNode();
        return this.parseString();
      case "t":
        this.countNode();
        this.literal("true");
        return true;
      case "f":
        this.countNode();
        this.literal("false");
        return false;
      case "n":
        this.countNode();
        this.literal("null");
        return null;
      default:
        this.countNode();
        return this.parseNumber();
    }
  }
  literal(word) {
    if (this.text.startsWith(word, this.index)) {
      this.index += word.length;
      return;
    }
    this.fail("JSON_SYNTAX", `expected ${word} at offset ${this.index}`);
  }
  parseObject(depth) {
    this.countNode();
    this.expect("{");
    const object = /* @__PURE__ */ Object.create(null);
    const seen = /* @__PURE__ */ new Set();
    this.skipWhitespace();
    if (this.text[this.index] === "}") {
      this.index++;
      return object;
    }
    for (; ; ) {
      this.skipWhitespace();
      if (this.text[this.index] === "}") {
        this.fail("JSON_TRAILING_COMMA_NOT_ALLOWED", "trailing commas are not valid JSON");
      }
      if (this.text[this.index] !== '"') {
        this.fail("JSON_SYNTAX", `expected a member name at offset ${this.index}`);
      }
      const key = this.parseString();
      if (DANGEROUS_KEYS.has(key)) {
        this.path.push(key);
        this.fail(
          "JSON_DANGEROUS_KEY",
          `the member name ${JSON.stringify(key)} can reach Object.prototype and is rejected`
        );
      }
      if (seen.has(key)) {
        this.path.push(key);
        this.fail(
          "JSON_DUPLICATE_KEY",
          `the member name ${JSON.stringify(key)} appears more than once; which value would win is undefined`
        );
      }
      seen.add(key);
      if (seen.size > this.limits.jsonObjectKeys) {
        this.fail("JSON_TOO_MANY_KEYS", "the object has more members than the parser permits", {
          limit: { name: "jsonObjectKeys", limit: this.limits.jsonObjectKeys, observed: seen.size }
        });
      }
      this.skipWhitespace();
      this.expect(":");
      this.path.push(key);
      object[key] = this.parseValue(depth + 1);
      this.path.pop();
      this.skipWhitespace();
      const next = this.text[this.index];
      if (next === ",") {
        this.index++;
        continue;
      }
      if (next === "}") {
        this.index++;
        return object;
      }
      this.fail("JSON_SYNTAX", `expected ',' or '}' at offset ${this.index}`);
    }
  }
  parseArray(depth) {
    this.countNode();
    this.expect("[");
    const array = [];
    this.skipWhitespace();
    if (this.text[this.index] === "]") {
      this.index++;
      return array;
    }
    for (; ; ) {
      this.skipWhitespace();
      if (this.text[this.index] === "]") {
        this.fail("JSON_TRAILING_COMMA_NOT_ALLOWED", "trailing commas are not valid JSON");
      }
      this.path.push(array.length);
      array.push(this.parseValue(depth + 1));
      this.path.pop();
      if (array.length > this.limits.jsonArrayItems) {
        this.fail("JSON_ARRAY_TOO_LONG", "the array has more members than the parser permits", {
          limit: {
            name: "jsonArrayItems",
            limit: this.limits.jsonArrayItems,
            observed: array.length
          }
        });
      }
      this.skipWhitespace();
      const next = this.text[this.index];
      if (next === ",") {
        this.index++;
        continue;
      }
      if (next === "]") {
        this.index++;
        return array;
      }
      this.fail("JSON_SYNTAX", `expected ',' or ']' at offset ${this.index}`);
    }
  }
  parseString() {
    this.expect('"');
    let out = "";
    for (; ; ) {
      if (this.index >= this.text.length) {
        this.fail("JSON_SYNTAX", "the input ended inside a string");
      }
      const ch = this.text[this.index];
      if (ch === '"') {
        this.index++;
        if (out.length > this.limits.jsonStringLength) {
          this.fail("JSON_STRING_TOO_LONG", "a string is longer than the parser permits", {
            limit: {
              name: "jsonStringLength",
              limit: this.limits.jsonStringLength,
              observed: out.length
            }
          });
        }
        return out;
      }
      if (ch === "\\") {
        this.index++;
        out += this.parseEscape();
        continue;
      }
      const code = this.text.charCodeAt(this.index);
      if (code < 32) {
        this.fail(
          "JSON_SYNTAX",
          `a raw control character (U+${code.toString(16).padStart(4, "0").toUpperCase()}) is not valid inside a JSON string`
        );
      }
      if (code >= 55296 && code <= 56319) {
        const next = this.text.charCodeAt(this.index + 1);
        if (!(next >= 56320 && next <= 57343)) {
          this.fail("JSON_INVALID_UNICODE", "an unpaired high surrogate is not well-formed Unicode");
        }
        out += this.text[this.index] + this.text[this.index + 1];
        this.index += 2;
        continue;
      }
      if (code >= 56320 && code <= 57343) {
        this.fail("JSON_INVALID_UNICODE", "an unpaired low surrogate is not well-formed Unicode");
      }
      out += ch;
      this.index++;
    }
  }
  parseEscape() {
    const ch = this.text[this.index];
    this.index++;
    switch (ch) {
      case '"':
        return '"';
      case "\\":
        return "\\";
      case "/":
        return "/";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "	";
      case "u":
        return this.parseUnicodeEscape();
      default:
        this.fail("JSON_SYNTAX", `invalid escape sequence \\${String(ch)}`);
    }
  }
  parseUnicodeEscape() {
    const hex = this.text.slice(this.index, this.index + 4);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
      this.fail("JSON_INVALID_UNICODE", "a \\u escape must be followed by four hex digits");
    }
    this.index += 4;
    const code = Number.parseInt(hex, 16);
    if (code >= 55296 && code <= 56319) {
      if (this.text[this.index] !== "\\" || this.text[this.index + 1] !== "u") {
        this.fail("JSON_INVALID_UNICODE", "an escaped high surrogate must be followed by a low surrogate");
      }
      const lowHex = this.text.slice(this.index + 2, this.index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(lowHex)) {
        this.fail("JSON_INVALID_UNICODE", "a \\u escape must be followed by four hex digits");
      }
      const low = Number.parseInt(lowHex, 16);
      if (!(low >= 56320 && low <= 57343)) {
        this.fail("JSON_INVALID_UNICODE", "an escaped high surrogate must be followed by a low surrogate");
      }
      this.index += 6;
      return String.fromCharCode(code, low);
    }
    if (code >= 56320 && code <= 57343) {
      this.fail("JSON_INVALID_UNICODE", "an unpaired escaped low surrogate is not well-formed Unicode");
    }
    return String.fromCharCode(code);
  }
  parseNumber() {
    const start = this.index;
    if (this.text[this.index] === "-") this.index++;
    if (this.text[this.index] === "0") {
      this.index++;
    } else if (this.isDigit(this.text[this.index])) {
      while (this.isDigit(this.text[this.index])) this.index++;
    } else {
      this.fail("JSON_SYNTAX", `unexpected token at offset ${this.index}`);
    }
    if (this.text[this.index] === ".") {
      this.index++;
      if (!this.isDigit(this.text[this.index])) {
        this.fail("JSON_INVALID_NUMBER", "a decimal point must be followed by at least one digit");
      }
      while (this.isDigit(this.text[this.index])) this.index++;
    }
    if (this.text[this.index] === "e" || this.text[this.index] === "E") {
      this.index++;
      if (this.text[this.index] === "+" || this.text[this.index] === "-") this.index++;
      if (!this.isDigit(this.text[this.index])) {
        this.fail("JSON_INVALID_NUMBER", "an exponent must have at least one digit");
      }
      while (this.isDigit(this.text[this.index])) this.index++;
    }
    const token = this.text.slice(start, this.index);
    if (token.length === 0) {
      this.fail("JSON_SYNTAX", `unexpected token at offset ${start}`);
    }
    if (token.length > this.limits.jsonNumberTokenLength) {
      this.fail(
        "JSON_NUMBER_TOKEN_TOO_LONG",
        "the numeric token is longer than any meaningful binary64 literal",
        {
          limit: {
            name: "jsonNumberTokenLength",
            limit: this.limits.jsonNumberTokenLength,
            observed: token.length
          }
        }
      );
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      this.fail(
        "JSON_NON_FINITE_NUMBER",
        "the number is outside the finite binary64 model; use null for a missing observation"
      );
    }
    if (!/[.eE]/u.test(token)) {
      const integer = BigInt(token);
      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      const isCanonicalBinary64Spelling = JSON.stringify(value) === token;
      if ((integer < -maxSafe || integer > maxSafe) && !isCanonicalBinary64Spelling) {
        this.fail(
          "JSON_INTEGER_OUT_OF_RANGE",
          "the unsafe bare integer is not the canonical spelling of its parsed binary64 value; use an exact safe integer, the canonical binary64 measurement spelling, or a string identifier"
        );
      }
    }
    return value;
  }
  isDigit(ch) {
    return ch !== void 0 && ch >= "0" && ch <= "9";
  }
};
function parseJsonStrict(text, options) {
  if (typeof text !== "string") {
    return err([
      makeError({
        code: "JSON_SYNTAX",
        stage: "parse",
        message: "the strict JSON boundary accepts a text string only"
      })
    ]);
  }
  const limitKeys = [
    "rawInputBytes",
    "jsonDepth",
    "jsonTotalNodes",
    "jsonStringLength",
    "jsonNumberTokenLength",
    "jsonObjectKeys",
    "jsonArrayItems"
  ];
  const limitsSnapshot = /* @__PURE__ */ Object.create(null);
  let allowBom = false;
  try {
    if (options === null || typeof options !== "object") throw new Error("invalid options");
    const limitsDescriptor = Object.getOwnPropertyDescriptor(options, "limits");
    if (limitsDescriptor === void 0 || !Object.prototype.hasOwnProperty.call(limitsDescriptor, "value")) {
      throw new Error("invalid limits");
    }
    const supplied = limitsDescriptor.value;
    if (supplied === null || typeof supplied !== "object") throw new Error("invalid limits");
    for (const key of limitKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(supplied, key);
      if (descriptor === void 0 || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        throw new Error("invalid limit");
      }
      const value = descriptor.value;
      if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid limit");
      limitsSnapshot[key] = value;
    }
    const bomDescriptor = Object.getOwnPropertyDescriptor(options, "allowBom");
    if (bomDescriptor !== void 0) {
      if (!Object.prototype.hasOwnProperty.call(bomDescriptor, "value")) {
        throw new Error("invalid allowBom");
      }
      allowBom = bomDescriptor.value === true;
    }
  } catch {
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the strict parser requires a valid finite non-negative budget object"
      })
    ]);
  }
  const limits = Object.freeze(limitsSnapshot);
  const byteLength = utf8ByteLength(text);
  if (byteLength > limits.rawInputBytes) {
    return err([
      makeError({
        code: "JSON_BYTES_EXCEEDED",
        stage: "parse",
        message: "the raw input is larger than the active budget profile permits",
        limit: { name: "rawInputBytes", limit: limits.rawInputBytes, observed: byteLength }
      })
    ]);
  }
  let source = text;
  if (source.charCodeAt(0) === 65279) {
    if (!allowBom) {
      return err([
        makeError({
          code: "JSON_BOM_NOT_ALLOWED",
          stage: "parse",
          message: "the input begins with a byte-order mark; strip it"
        })
      ]);
    }
    source = source.slice(1);
  }
  try {
    return ok(new Scanner(source, limits).parseTopLevel());
  } catch (error) {
    if (error instanceof ParseFailure) {
      return err([error.diagnostic]);
    }
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the parser failed in an unexpected way; this is a Cortexel defect"
      })
    ]);
  }
}

// src/core/safe-snapshot.ts
var DANGEROUS_KEYS2 = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var SnapshotFailure = class extends Error {
  diagnostic;
  constructor(diagnostic) {
    super(diagnostic.message);
    this.name = "SnapshotFailure";
    this.diagnostic = diagnostic;
  }
};
function reflect(operation, path) {
  try {
    return operation();
  } catch {
    throw new SnapshotFailure(
      makeError({
        code: "SNAPSHOT_HOSTILE_REFLECTION",
        stage: "snapshot",
        instancePath: path,
        message: "reflecting on this value threw; it is treated as hostile and is not inspected again"
      })
    );
  }
}
function isWellFormedString(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
      if (!(next >= 56320 && next <= 57343)) return false;
      i++;
    } else if (code >= 56320 && code <= 57343) {
      return false;
    }
  }
  return true;
}
function fail(code, path, message, actual) {
  throw new SnapshotFailure(
    makeError({
      code,
      stage: "snapshot",
      instancePath: path,
      message,
      ...actual !== void 0 ? { actual } : {}
    })
  );
}
function snapshotNode(value, path, depth, state) {
  if (depth > state.limits.jsonDepth) {
    fail("SNAPSHOT_DEPTH_EXCEEDED", path, "the value nests deeper than the snapshot permits");
  }
  state.nodes++;
  if (state.nodes > state.limits.jsonTotalNodes) {
    fail("SNAPSHOT_NODES_EXCEEDED", path, "the value graph exceeds the total node limit");
  }
  if (value === null) return null;
  switch (typeof value) {
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) {
        fail(
          "SNAPSHOT_NON_FINITE_NUMBER",
          path,
          "NaN and Infinity are not measurements; use null for a missing observation",
          value
        );
      }
      return value;
    case "string":
      if (!isWellFormedString(value)) {
        fail(
          "SNAPSHOT_MALFORMED_STRING",
          path,
          "the string contains a lone surrogate and is not well-formed Unicode"
        );
      }
      if (value.length > state.limits.jsonStringLength) {
        fail(
          "SNAPSHOT_STRING_TOO_LONG",
          path,
          `the string contains ${value.length} UTF-16 code units, over the active limit of ${state.limits.jsonStringLength}`
        );
      }
      return value;
    case "undefined":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "undefined is not a JSON value", value);
    // eslint-disable-next-line no-fallthrough
    case "function":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "a function is not data", value);
    // eslint-disable-next-line no-fallthrough
    case "symbol":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "a symbol is not a JSON value", value);
    // eslint-disable-next-line no-fallthrough
    case "bigint":
      fail(
        "SNAPSHOT_UNSUPPORTED_TYPE",
        path,
        "a bigint has no JSON representation; send a number or a string",
        value
      );
    // eslint-disable-next-line no-fallthrough
    case "object":
      break;
    default:
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "the value is of an unsupported type", value);
  }
  const object = value;
  if (state.seen.has(object)) {
    fail("SNAPSHOT_CIRCULAR_REFERENCE", path, "the value graph contains a cycle");
  }
  if (reflect(() => ArrayBuffer.isView(object), path)) {
    fail(
      "SNAPSHOT_NON_PLAIN_OBJECT",
      path,
      "a typed array or DataView is not part of the JSON request contract; use a plain array"
    );
  }
  const isArray = reflect(() => Array.isArray(object), path);
  const prototype = reflect(() => Object.getPrototypeOf(object), path);
  if (!isArray && prototype !== Object.prototype && prototype !== null) {
    fail(
      "SNAPSHOT_NON_PLAIN_OBJECT",
      path,
      "only plain objects and arrays are accepted; a class instance, Date, Map, Set, or Promise is not data"
    );
  }
  state.seen.add(object);
  try {
    return isArray ? snapshotArray(object, path, depth, state) : snapshotObject(object, path, depth, state);
  } finally {
    state.seen.delete(object);
  }
}
function snapshotArray(array, path, depth, state) {
  const lengthDescriptor = reflect(
    () => Object.getOwnPropertyDescriptor(array, "length"),
    path
  );
  if (lengthDescriptor === void 0 || !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")) {
    fail("SNAPSHOT_NON_PLAIN_OBJECT", path, "the array has no intrinsic data length");
  }
  const length = lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length < 0) {
    fail("SNAPSHOT_NON_PLAIN_OBJECT", path, "the array reports an implausible length");
  }
  if (length > state.limits.jsonArrayItems) {
    fail("SNAPSHOT_NODES_EXCEEDED", path, "the array is longer than the snapshot permits");
  }
  const keys = reflect(() => Reflect.ownKeys(array), path);
  const out = [];
  for (let index = 0; index < length; index++) {
    const descriptor = reflect(
      () => Object.getOwnPropertyDescriptor(array, index),
      `${path}/${index}`
    );
    if (descriptor === void 0) {
      fail(
        "SNAPSHOT_SPARSE_ARRAY",
        `${path}/${index}`,
        "the array has a hole; use an explicit null for a missing observation"
      );
    }
    if (!("value" in descriptor)) {
      fail(
        "SNAPSHOT_ACCESSOR_PROPERTY",
        `${path}/${index}`,
        "the element is defined by a getter; Cortexel will not invoke caller code to read data"
      );
    }
    out.push(snapshotNode(descriptor.value, `${path}/${index}`, depth + 1, state));
  }
  for (const key of keys) {
    if (typeof key === "symbol") {
      fail("SNAPSHOT_SYMBOL_KEY", path, "the array carries a symbol-keyed property");
    }
    if (key === "length") continue;
    const canonicalIndex = /^(?:0|[1-9][0-9]*)$/u.test(key) ? Number(key) : -1;
    if (Number.isSafeInteger(canonicalIndex) && canonicalIndex >= 0 && canonicalIndex < length) {
      continue;
    }
    fail(
      "SNAPSHOT_DECORATED_ARRAY",
      path,
      `the array carries the named property ${JSON.stringify(String(key))}, which a JSON array cannot represent`
    );
  }
  return out;
}
function snapshotObject(object, path, depth, state) {
  const keys = reflect(() => Reflect.ownKeys(object), path);
  const out = /* @__PURE__ */ Object.create(null);
  let count = 0;
  for (const key of keys) {
    if (typeof key === "symbol") {
      fail("SNAPSHOT_SYMBOL_KEY", path, "the object carries a symbol-keyed property");
    }
    const childPath2 = `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    if (DANGEROUS_KEYS2.has(key)) {
      fail(
        "SNAPSHOT_DANGEROUS_KEY",
        childPath2,
        `the key ${JSON.stringify(key)} can reach Object.prototype and is rejected`
      );
    }
    const descriptor = reflect(() => Object.getOwnPropertyDescriptor(object, key), childPath2);
    if (descriptor === void 0) continue;
    if (!descriptor.enumerable) continue;
    if (!("value" in descriptor)) {
      fail(
        "SNAPSHOT_ACCESSOR_PROPERTY",
        childPath2,
        "the property is defined by a getter or setter; Cortexel inspects descriptors and will not invoke caller code to read data"
      );
    }
    count++;
    if (count > state.limits.jsonObjectKeys) {
      fail("SNAPSHOT_NODES_EXCEEDED", path, "the object has more members than the snapshot permits");
    }
    out[key] = snapshotNode(descriptor.value, childPath2, depth + 1, state);
  }
  return out;
}
function snapshotValue(value, limits) {
  const state = { limits, nodes: 0, seen: /* @__PURE__ */ new Set() };
  try {
    return ok(snapshotNode(value, "", 0, state));
  } catch (error) {
    if (error instanceof SnapshotFailure) {
      return err([error.diagnostic]);
    }
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the snapshot failed in an unexpected way; this is a Cortexel defect"
      })
    ]);
  }
}

// src/generated/budgets.ts
var BUDGET_PROFILE_IDS = freezeGenerated([
  "standard",
  "agent"
]);
var BUDGET_PROFILES = freezeGenerated({
  "standard": {
    "rawInputBytes": 33554432,
    "jsonDepth": 64,
    "jsonTotalNodes": 1e6,
    "jsonStringLength": 65536,
    "jsonNumberTokenLength": 64,
    "jsonObjectKeys": 4096,
    "jsonArrayItems": 2e6,
    "observationsPerSeries": 25e4,
    "observationsPerRequest": 2e6,
    "graphNodes": 1e5,
    "graphEdges": 2e5,
    "matrixCells": 16e6,
    "pairwiseOperations": 5e7,
    "visibleMarks": 1e5,
    "svgTextNodes": 2e4,
    "svgBytes": 20971520,
    "sidecarBytes": 104857600,
    "returnedTableRows": 500,
    "errorRecords": 32
  },
  "agent": {
    "rawInputBytes": 4194304,
    "jsonDepth": 32,
    "jsonTotalNodes": 2e5,
    "jsonStringLength": 8192,
    "jsonNumberTokenLength": 64,
    "jsonObjectKeys": 1024,
    "jsonArrayItems": 2e5,
    "observationsPerSeries": 5e4,
    "observationsPerRequest": 2e5,
    "graphNodes": 2e4,
    "graphEdges": 5e4,
    "matrixCells": 1e6,
    "pairwiseOperations": 5e6,
    "visibleMarks": 25e3,
    "svgTextNodes": 5e3,
    "svgBytes": 5242880,
    "sidecarBytes": 20971520,
    "returnedTableRows": 200,
    "errorRecords": 32
  }
});
var COMPACTION_POLICIES = freezeGenerated({
  "none": {
    "id": "none",
    "revision": 1,
    "appliesTo": [
      "*"
    ],
    "preservesExtrema": true,
    "preservesMass": true,
    "deterministic": true,
    "description": "No compaction. The figure is drawn in full or the request is refused."
  },
  "line_envelope_minmax": {
    "id": "line_envelope_minmax",
    "revision": 1,
    "appliesTo": [
      "trace",
      "weight_trace"
    ],
    "preservesExtrema": true,
    "preservesMass": false,
    "deterministic": true,
    "description": "Per horizontal pixel bucket, retain the minimum and the maximum sample, plus the first and last sample of the series and every boundary of a missing span. A one-sample transient therefore SURVIVES, which naive averaging would erase."
  },
  "raster_density_bins": {
    "id": "raster_density_bins",
    "revision": 1,
    "appliesTo": [
      "spike_raster"
    ],
    "preservesExtrema": false,
    "preservesMass": true,
    "deterministic": true,
    "description": "Aggregate events into an explicit time x sender bin grid and draw density. Every event is COUNTED \u2014 none is dropped. The bin dimensions and the before/after counts are recorded."
  },
  "histogram_merge_adjacent": {
    "id": "histogram_merge_adjacent",
    "revision": 1,
    "appliesTo": [
      "distribution"
    ],
    "preservesExtrema": false,
    "preservesMass": true,
    "deterministic": true,
    "description": "Merge ONLY adjacent bins, summing raw counts and probability mass (or integrating density before re-normalizing by the wider bin). Extrema sampling is INVALID for a distribution \u2014 it would destroy the mass \u2014 so it is not offered."
  },
  "matrix_value_quantize": {
    "id": "matrix_value_quantize",
    "revision": 1,
    "appliesTo": [
      "matrix"
    ],
    "preservesExtrema": true,
    "preservesMass": true,
    "deterministic": true,
    "description": "Group cells that share a quantized value into one paint path. This is a PAINT optimization only: every cell is retained and remains individually addressable in the table."
  },
  "graph_declared_subset": {
    "id": "graph_declared_subset",
    "revision": 1,
    "appliesTo": [
      "graph"
    ],
    "preservesExtrema": false,
    "preservesMass": false,
    "deterministic": true,
    "description": "Draw only the caller's explicitly declared edge subset. The retained and source counts are disclosed and no degree claim is permitted."
  }
});

// src/core/limits.ts
var DEFAULT_PROFILE = "standard";
function tryGetBudgetLimits(profile = DEFAULT_PROFILE) {
  if (typeof profile !== "string" || !BUDGET_PROFILE_IDS.includes(profile) || !Object.prototype.hasOwnProperty.call(BUDGET_PROFILES, profile)) {
    return void 0;
  }
  return BUDGET_PROFILES[profile];
}
function getBudgetLimits(profile = DEFAULT_PROFILE) {
  const found = tryGetBudgetLimits(profile);
  if (!found) {
    throw new Error("unknown budget profile");
  }
  return found;
}
function trySelectTighterBudgetProfile(hostProfile, requestedProfile) {
  const host = tryGetBudgetLimits(hostProfile);
  const requested = tryGetBudgetLimits(requestedProfile);
  if (!host || !requested || typeof hostProfile !== "string" || typeof requestedProfile !== "string") {
    return void 0;
  }
  const noGreaterThan = (left, right) => Object.keys(left).every((key) => left[key] <= right[key]);
  if (noGreaterThan(requested, host)) {
    return { profile: requestedProfile, limits: requested };
  }
  if (noGreaterThan(host, requested)) {
    return { profile: hostProfile, limits: host };
  }
  return void 0;
}
function restrictLimits(base, overrides) {
  const INVALID_BASE = /* @__PURE__ */ Symbol("invalid-base-budget");
  const out = /* @__PURE__ */ Object.create(null);
  const limitKeys = Object.keys(BUDGET_PROFILES[DEFAULT_PROFILE]);
  try {
    for (const key of limitKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(base, key);
      const value = descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : void 0;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw INVALID_BASE;
      }
      out[key] = value;
    }
  } catch (error) {
    if (error === INVALID_BASE) {
      throw new Error("base budget limits must be own finite non-negative data properties");
    }
    throw new Error("base budget limits could not be inspected safely");
  }
  let keys;
  try {
    keys = Reflect.ownKeys(overrides);
  } catch {
    return freezeGenerated(out);
  }
  for (const key of keys) {
    if (typeof key !== "string" || !limitKeys.includes(key)) continue;
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(overrides, key);
    } catch {
      return freezeGenerated(out);
    }
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) continue;
    const value = descriptor.value;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    const current = out[key];
    out[key] = Math.min(current, value);
  }
  return freezeGenerated(out);
}

// src/core/disclosures.ts
var RULE_PREDICATES = {
  SOURCE_SIMULATION: (f) => f.sourceKind === "simulation",
  SOURCE_SYNTHETIC_FIXTURE: (f) => f.sourceKind === "synthetic_fixture",
  SOURCE_KIND_UNKNOWN: (f) => f.sourceKind === "unknown",
  SOURCE_LITERATURE_EXTRACTION: (f) => f.sourceKind === "literature_extraction",
  SOURCE_MANUAL_ENTRY: (f) => f.sourceKind === "manual_entry",
  SOURCE_AUTHENTICITY_UNVERIFIED: (f) => !f.sourceAuthenticityVerified,
  REFERENCE_COMPARISON_NOT_RUN: (f) => !f.referenceComparisonRun,
  PARTIAL_NETWORK_SCOPE: (f) => f.scopeKind === "sampled" || f.scopeKind === "mpi_target_rank_local",
  RANK_LOCAL_SCOPE: (f) => f.scopeKind === "mpi_target_rank_local",
  SAMPLED_EDGES: (f) => f.scopeKind === "sampled",
  NODE_UNIVERSE_INCOMPLETE: (f) => f.nodeUniverseComplete === false,
  MULTAPSE_AGGREGATED: (f) => f.multapseAggregated === true && f.multapseAggregation !== void 0 && f.multapseAggregation !== "no_aggregation",
  ABSENT_IS_NOT_ZERO: () => false,
  // matrix compilers set this explicitly
  SCHEMATIC_LAYOUT: (f) => f.schematicLayout === true,
  POSITIONS_MISSING: (f) => (f.positionsMissing ?? 0) > 0,
  EVENTS_EXCLUDED_OUT_OF_WINDOW: (f) => (f.excludedOutOfWindow ?? 0) > 0,
  NEST_SERIALIZED_CLOCK_BOUNDARY: (f) => f.nestSerializedClock === true,
  MISSING_VALUES_PRESENT: (f) => (f.missingValueCount ?? 0) > 0,
  UNIT_CONVERTED: (f) => (f.unitConversions?.length ?? 0) > 0,
  UNCERTAINTY_NOT_PROVIDED: (f) => f.uncertaintyKind === "none",
  UNCERTAINTY_COVERAGE_INCOMPLETE: (f) => (f.uncertaintySeriesDeclared ?? 0) > 0 && (f.uncertaintySeriesShown ?? 0) < (f.uncertaintySeriesTotal ?? 0),
  AGGREGATE_WITHOUT_RAW_REPEATS: () => false,
  // response-curve compiler sets this
  EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY: (f) => f.eventScopeMembershipCardinalityOnly === true,
  EVENT_SCOPE_EXTERNAL_AUTHORITY_UNVERIFIED: (f) => f.eventScopeExternalAuthorityDeclared === true,
  KERNEL_SMOOTHED_RATE: (f) => f.kernelSmoothed === true,
  ZERO_LAG_SELF_PAIRS_EXCLUDED: () => false,
  // correlogram compiler sets this
  LAG_ORIENTATION: () => false,
  // correlogram compiler always emits this
  PRE_BINNED_INPUT: (f) => f.preBinned === true,
  RECTANGULAR_SENDER_EXPOSURE_ASSERTED: (f) => f.rectangularSenderExposureAsserted === true,
  DUPLICATE_TIMES_AGGREGATED: (f) => f.duplicateTimeAggregateMethod !== void 0,
  MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE: (f) => (f.missingAggregateReplicateCount ?? 0) > 0,
  CALLER_NOTE_UNVERIFIED: (f) => f.callerNotePresent === true,
  NONSTANDARD_BUDGET_PROFILE: (f) => f.budgetProfileId !== void 0 ? f.budgetProfileId !== "standard" : f.nonStandardBudgetProfile === true
};
var SEVERITY_ORDER = {
  critical: 0,
  important: 1,
  informational: 2
};
function fillTemplate(text, facts) {
  const values = {
    rank: facts.rank,
    worldSize: facts.worldSize,
    retainedConnectionCount: facts.retainedConnectionCount ?? facts.sampledRetained,
    sourceConnectionCount: facts.sourceConnectionCount ?? facts.sampledSource,
    excludedCount: facts.excludedOutOfWindow,
    missingCount: facts.missingValueCount ?? facts.positionsMissing,
    totalCount: facts.positionsTotal,
    reason: facts.uncertaintyReason,
    aggregation: facts.multapseAggregation,
    conversions: facts.unitConversions?.join(", "),
    method: facts.duplicateTimeAggregateMethod,
    declaredCount: facts.uncertaintySeriesDeclared,
    shownCount: facts.uncertaintySeriesShown,
    seriesCount: facts.uncertaintySeriesTotal,
    missingReplicateCount: facts.missingAggregateReplicateCount,
    estimator: facts.aggregateEstimator,
    sampleCount: facts.aggregateSampleCount,
    profileId: facts.budgetProfileId ?? (facts.nonStandardBudgetProfile ? "custom" : "standard")
  };
  return text.replace(/\{(\w+)\}/g, (whole, key) => {
    const value = values[key];
    return value === void 0 || value === null ? whole : String(value);
  });
}
function deriveDisclosures(facts, allowedIds, forced = []) {
  const allowed = new Set(allowedIds);
  const forcedSet = new Set(forced);
  const out = [];
  for (const rule of DISCLOSURE_RULES) {
    if (!allowed.has(rule.id) && !forcedSet.has(rule.id)) continue;
    const predicate = RULE_PREDICATES[rule.id];
    const fires = forcedSet.has(rule.id) || (predicate ? predicate(facts) : false);
    if (!fires) continue;
    out.push({
      id: rule.id,
      severity: rule.severity,
      text: fillTemplate(rule.text, facts)
    });
  }
  out.sort((a, b) => {
    const severityDelta = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return severityDelta !== 0 ? severityDelta : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return out;
}

// src/core/contract-identity.ts
var CONTRACT_VALUE = /^([a-z][a-z0-9-]*)\/((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/u;
function splitContractIdentity(value, axis) {
  const match = CONTRACT_VALUE.exec(value);
  if (!match) {
    throw new Error(`${axis} is not a canonical contract-name/major.minor identity`);
  }
  return Object.freeze({ value, name: match[1], version: match[2] });
}
var REQUEST_CONTRACT_IDENTITY = splitContractIdentity(
  REQUEST_CONTRACT,
  "REQUEST_CONTRACT"
);
var ARTIFACT_CONTRACT_IDENTITY = splitContractIdentity(
  ARTIFACT_CONTRACT,
  "ARTIFACT_CONTRACT"
);

// src/core/migrate-v0.ts
function migrateLegacyRequest(input) {
  const snapshot = snapshotValue(input, getBudgetLimits("standard"));
  if (!snapshot.ok) {
    return {
      report: {
        legacyId: "(none)",
        outcome: "blocked",
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: snapshot.errors
      }
    };
  }
  if (typeof snapshot.value !== "object" || snapshot.value === null || Array.isArray(snapshot.value)) {
    return {
      report: {
        legacyId: "(none)",
        outcome: "blocked",
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: "MIGRATION_INFORMATION_MISSING",
            stage: "migrate",
            message: "a legacy request must be a JSON object."
          })
        ]
      }
    };
  }
  const request = snapshot.value;
  const skill = request.skill;
  const legacyId = typeof skill === "object" && skill !== null && !Array.isArray(skill) ? skill.id : request.skillId;
  if (typeof legacyId !== "string") {
    return {
      report: {
        legacyId: "(none)",
        outcome: "blocked",
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: "MIGRATION_UNKNOWN_LEGACY_ID",
            stage: "migrate",
            message: "the legacy request does not name a skill id."
          })
        ]
      }
    };
  }
  const entry = LEGACY_SKILL_MAP[legacyId];
  if (!entry) {
    return {
      report: {
        legacyId,
        outcome: "blocked",
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: "MIGRATION_UNKNOWN_LEGACY_ID",
            stage: "migrate",
            message: `"${legacyId}" is not a recognized pre-1.0 id. See MIGRATION.md for every recognized id.`
          })
        ]
      }
    };
  }
  const base = {
    legacyId,
    outcome: entry.outcome,
    targetId: entry.targetId
  };
  switch (entry.outcome) {
    case "blocked":
      return {
        report: {
          ...base,
          operations: [],
          unresolved: [],
          warnings: [],
          errors: [
            makeError({
              code: entry.errorCode ?? "MIGRATION_INFORMATION_MISSING",
              stage: "migrate",
              message: entry.notes
            })
          ]
        }
      };
    case "experimental":
      return {
        report: {
          ...base,
          operations: [],
          unresolved: [],
          warnings: [],
          errors: [
            makeError({
              code: entry.errorCode ?? "CAPABILITY_EXPERIMENTAL",
              stage: "migrate",
              message: entry.targetId === null ? `${entry.notes} No FigureRequestV1 target is emitted.` : `${entry.notes} Target: ${entry.targetId}.`
            })
          ]
        }
      };
    case "recipe":
      return {
        report: {
          ...base,
          operations: [],
          unresolved: entry.alternatives ? [...entry.alternatives] : [],
          warnings: [],
          errors: [
            makeError({
              code: entry.errorCode ?? "MIGRATION_NO_STABLE_REPLACEMENT",
              stage: "migrate",
              message: entry.notes
            })
          ]
        }
      };
    case "migrate":
    case "migrate_conditional": {
      const unresolved = entry.requires ? [...entry.requires] : [];
      const warnings = [];
      if (entry.outcome === "migrate_conditional") {
        warnings.push(
          makeError({
            code: "MIGRATION_AMBIGUOUS",
            stage: "migrate",
            severity: "warning",
            message: `${entry.notes} Migration proceeds only if every required field is present.`
          })
        );
      }
      const migrated = {
        contract: {
          name: REQUEST_CONTRACT_IDENTITY.name,
          version: REQUEST_CONTRACT_IDENTITY.version
        },
        skill: { id: entry.targetId },
        ...entry.materializedParameters ? { parameters: { ...entry.materializedParameters } } : {}
      };
      return {
        request: migrated,
        report: {
          ...base,
          operations: [
            { op: "rename-skill", detail: `${legacyId} -> ${entry.targetId}` },
            ...entry.materializedParameters ? [
              {
                op: "materialize-parameters",
                detail: JSON.stringify(entry.materializedParameters)
              }
            ] : []
          ],
          unresolved,
          warnings,
          errors: unresolved.length > 0 ? [
            makeError({
              code: "MIGRATION_INFORMATION_MISSING",
              stage: "migrate",
              severity: "warning",
              message: `the 1.0 ${entry.targetId} contract requires information the legacy payload did not carry: ${unresolved.join(", ")}. Supply it and revalidate. Migration will not guess it.`
            })
          ] : []
        }
      };
    }
    default:
      return {
        report: {
          ...base,
          operations: [],
          unresolved: [],
          warnings: [],
          errors: [
            makeError({
              code: "MIGRATION_UNKNOWN_LEGACY_ID",
              stage: "migrate",
              message: `no migration path is defined for outcome "${entry.outcome}".`
            })
          ]
        }
      };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ARTIFACT_CONTRACT,
  CANONICALIZATION_ALGORITHMS,
  CANONICALIZATION_IDS,
  CATALOG_DIGEST,
  CONTRACT_DIGEST,
  CanonicalizationError,
  DEFAULT_PROFILE,
  DISCLOSURE_RULES,
  ERROR_CODES,
  ERROR_CODE_META,
  EXPERIMENTAL_CAPABILITY_IDS,
  LEGACY_SKILL_MAP,
  PACKAGE_VERSION,
  QUANTITY_KINDS,
  REMOVED_CAPABILITY_IDS,
  REQUEST_CONTRACT,
  RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID,
  SKILL_CATALOG,
  STABLE_SKILL_COUNT,
  STABLE_SKILL_IDS,
  UNITS,
  UNIT_CODES,
  axesAreCompatible,
  canonicalDigest,
  canonicalDigestExcluding,
  canonicalize,
  compareUtf16CodeUnits,
  convert,
  deriveDisclosures,
  dimensionOf,
  finalizeErrors,
  getBudgetLimits,
  getBuildIdentity,
  isKnownUnit,
  isSafeDisplayString,
  isValidatedRequest,
  makeError,
  migrateLegacyRequest,
  normalizeResponseEventMemberIds,
  parseAndValidateRequest,
  parseJsonStrict,
  pointer,
  resolveAlias,
  responseEventMembershipDigest,
  restrictLimits,
  safeText,
  sha256Digest,
  sha256Hex,
  snapshotValue,
  toSeconds,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile,
  unitLabel,
  utf8ByteLength,
  validateRequestValue
});
//# sourceMappingURL=index.cjs.map