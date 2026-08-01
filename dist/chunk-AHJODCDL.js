import {
  ARTIFACT_CONTRACT,
  REQUEST_CONTRACT
} from "./chunk-5FW7Q3ZT.js";
import {
  freezeGenerated
} from "./chunk-Z2GYUK7B.js";

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
    "safeRepairOperations": 128,
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
    "safeRepairOperations": 64,
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

export {
  BUDGET_PROFILES,
  DEFAULT_PROFILE,
  tryGetBudgetLimits,
  getBudgetLimits,
  trySelectTighterBudgetProfile,
  restrictLimits,
  REQUEST_CONTRACT_IDENTITY,
  ARTIFACT_CONTRACT_IDENTITY
};
//# sourceMappingURL=chunk-AHJODCDL.js.map