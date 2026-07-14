/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/registries/budget-profiles.v1.json.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

export const BUDGET_PROFILE_IDS = [
  "standard",
  "agent"
] as const;
export type BudgetProfileId = (typeof BUDGET_PROFILE_IDS)[number];

export const BUDGET_PROFILES = Object.freeze({
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
    "inlineTableRows": 500,
    "errorRecords": 32,
    "bundlePanels": 8
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
    "inlineTableRows": 200,
    "errorRecords": 32,
    "bundlePanels": 8
  }
}) as Readonly<Record<BudgetProfileId, Readonly<Record<string, number>>>> as any;

export const COMPACTION_POLICIES = Object.freeze({
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
    "description": "Aggregate events into an explicit time x sender bin grid and draw density. Every event is COUNTED — none is dropped. The bin dimensions and the before/after counts are recorded."
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
    "description": "Merge ONLY adjacent bins, summing raw counts and probability mass (or integrating density before re-normalizing by the wider bin). Extrema sampling is INVALID for a distribution — it would destroy the mass — so it is not offered."
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

export type CompactionPolicyId = keyof typeof COMPACTION_POLICIES;
