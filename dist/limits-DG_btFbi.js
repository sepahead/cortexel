import { n as freezeGenerated } from "./deep-freeze-CyWYjAwr.js";

//#region src/generated/budgets.ts
/**
* GENERATED FILE — DO NOT EDIT.
*
* Produced by scripts/generate-contract.ts from contract/registries/budget-profiles.v1.json.
* Edit the normative source and run `bun run generate`.
* `bun run check:generated` fails if this file drifts from its source.
*/
const BUDGET_PROFILE_IDS = freezeGenerated(["standard", "agent"]);
const BUDGET_PROFILES = freezeGenerated({
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
const COMPACTION_POLICIES = freezeGenerated({
	"none": {
		"id": "none",
		"revision": 1,
		"appliesTo": ["*"],
		"preservesExtrema": true,
		"preservesMass": true,
		"deterministic": true,
		"description": "No compaction. The figure is drawn in full or the request is refused."
	},
	"line_envelope_minmax": {
		"id": "line_envelope_minmax",
		"revision": 1,
		"appliesTo": ["trace", "weight_trace"],
		"preservesExtrema": true,
		"preservesMass": false,
		"deterministic": true,
		"description": "Per horizontal pixel bucket, retain the minimum and the maximum sample, plus the first and last sample of the series and every boundary of a missing span. A one-sample transient therefore SURVIVES, which naive averaging would erase."
	},
	"raster_density_bins": {
		"id": "raster_density_bins",
		"revision": 1,
		"appliesTo": ["spike_raster"],
		"preservesExtrema": false,
		"preservesMass": true,
		"deterministic": true,
		"description": "Aggregate events into an explicit time x sender bin grid and draw density. Every event is COUNTED — none is dropped. The bin dimensions and the before/after counts are recorded."
	},
	"histogram_merge_adjacent": {
		"id": "histogram_merge_adjacent",
		"revision": 1,
		"appliesTo": ["distribution"],
		"preservesExtrema": false,
		"preservesMass": true,
		"deterministic": true,
		"description": "Merge ONLY adjacent bins, summing raw counts and probability mass (or integrating density before re-normalizing by the wider bin). Extrema sampling is INVALID for a distribution — it would destroy the mass — so it is not offered."
	},
	"matrix_value_quantize": {
		"id": "matrix_value_quantize",
		"revision": 1,
		"appliesTo": ["matrix"],
		"preservesExtrema": true,
		"preservesMass": true,
		"deterministic": true,
		"description": "Group cells that share a quantized value into one paint path. This is a PAINT optimization only: every cell is retained and remains individually addressable in the table."
	},
	"graph_declared_subset": {
		"id": "graph_declared_subset",
		"revision": 1,
		"appliesTo": ["graph"],
		"preservesExtrema": false,
		"preservesMass": false,
		"deterministic": true,
		"description": "Draw only the caller's explicitly declared edge subset. The retained and source counts are disclosed and no degree claim is permitted."
	}
});

//#endregion
//#region src/core/limits.ts
/**
* Resource limits.
*
* The numbers live in `contract/registries/budget-profiles.v1.json` and are
* GENERATED into `src/generated/budgets.ts`. This module is the typed door to
* them; it holds no numbers of its own, because a limit that exists in two places
* eventually exists at two values.
*
* The distinction that matters:
*
*   A HARD LIMIT protects the process. Input above it FAILS.
*   A DISPLAY BUDGET controls representation. Every current stable skill selects
*   only `none`, so input above it is refused. A future compiler may compact only
*   through a named deterministic policy introduced with complete bound output.
*
* Confusing the two is how a library ends up silently truncating a dataset and
* calling the result a figure.
*/
const DEFAULT_PROFILE = "standard";
/** Resolve an untrusted profile id without coercion, prototype lookup, or throwing. */
function tryGetBudgetLimits(profile = DEFAULT_PROFILE) {
	if (typeof profile !== "string" || !BUDGET_PROFILE_IDS.includes(profile) || !Object.prototype.hasOwnProperty.call(BUDGET_PROFILES, profile)) return;
	return BUDGET_PROFILES[profile];
}
function getBudgetLimits(profile = DEFAULT_PROFILE) {
	const found = tryGetBudgetLimits(profile);
	if (!found) throw new Error("unknown budget profile");
	return found;
}
/**
* Select the component-wise tighter of two published profiles.
*
* Profiles are deliberately ordered resource envelopes. If a future registry adds two
* incomparable profiles, this returns `undefined` rather than silently mixing them under
* a misleading profile id. The generator/test suite then has to establish an explicit
* composition contract first.
*/
function trySelectTighterBudgetProfile(hostProfile, requestedProfile) {
	const host = tryGetBudgetLimits(hostProfile);
	const requested = tryGetBudgetLimits(requestedProfile);
	if (!host || !requested || typeof hostProfile !== "string" || typeof requestedProfile !== "string") return;
	const noGreaterThan = (left, right) => Object.keys(left).every((key) => left[key] <= right[key]);
	if (noGreaterThan(requested, host)) return {
		profile: requestedProfile,
		limits: requested
	};
	if (noGreaterThan(host, requested)) return {
		profile: hostProfile,
		limits: host
	};
}
/**
* Lower a limit. There is intentionally no way to RAISE one from here.
*
* A host that genuinely needs a larger ceiling must construct a separately named
* internal profile after an explicit risk review, and the artifact it produces
* records that non-standard profile and cannot claim default conformance. An
* untrusted caller can never widen a bound by asking nicely.
*/
function restrictLimits(base, overrides) {
	const INVALID_BASE = Symbol("invalid-base-budget");
	const out = Object.create(null);
	const limitKeys = Object.keys(BUDGET_PROFILES[DEFAULT_PROFILE]);
	try {
		for (const key of limitKeys) {
			const descriptor = Object.getOwnPropertyDescriptor(base, key);
			const value = descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : void 0;
			if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw INVALID_BASE;
			out[key] = value;
		}
	} catch (error) {
		if (error === INVALID_BASE) throw new Error("base budget limits must be own finite non-negative data properties");
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

//#endregion
export { trySelectTighterBudgetProfile as a, tryGetBudgetLimits as i, getBudgetLimits as n, BUDGET_PROFILES as o, restrictLimits as r, DEFAULT_PROFILE as t };
//# sourceMappingURL=limits-DG_btFbi.js.map