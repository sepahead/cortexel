import { r as DISCLOSURE_RULES } from "./registry-Cmer76Bg.js";

//#region src/core/disclosures.ts
/**
* Disclosures — where honesty is mechanized.
*
* A disclosure is never something a caller writes, and never something a flag turns
* off. Each one is DERIVED from a machine-checkable fact in the artifact, through the
* closed rule registry. That is the whole design: the only way to remove a
* disclosure is to remove the fact that causes it. A caller cannot suppress one by
* omitting a field, weaken one by rewording it, or promote its data by setting a
* boolean — because none of those change the facts these rules read.
*
* The exact same text is then written into four places — the artifact JSON, the
* visible SVG footer, the programmatically referenced SVG description, and the table
* metadata — and a test asserts all four agree. An omission from any one serialized
* surface would violate that structural parity.
*/
/**
* Each rule is a pure predicate over the facts. The registry text is the SINGLE
* source of the wording — the predicate decides only whether a rule fires. A
* placeholder like `{rank}` is filled from the facts, but the sentence around it is
* never rewritten, because a reworded disclosure is a different disclosure.
*/
const RULE_PREDICATES = {
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
	SCHEMATIC_LAYOUT: (f) => f.schematicLayout === true,
	POSITIONS_MISSING: (f) => (f.positionsMissing ?? 0) > 0,
	EVENTS_EXCLUDED_OUT_OF_WINDOW: (f) => (f.excludedOutOfWindow ?? 0) > 0,
	NEST_SERIALIZED_CLOCK_BOUNDARY: (f) => f.nestSerializedClock === true,
	NEST_CAPTURE_BOUNDED_POSITIVE_INFINITY: (f) => f.nestCaptureBoundedPositiveInfinity === true,
	MISSING_VALUES_PRESENT: (f) => (f.missingValueCount ?? 0) > 0,
	UNIT_CONVERTED: (f) => (f.unitConversions?.length ?? 0) > 0,
	UNCERTAINTY_NOT_PROVIDED: (f) => f.uncertaintyKind === "none",
	UNCERTAINTY_COVERAGE_INCOMPLETE: (f) => (f.uncertaintySeriesDeclared ?? 0) > 0 && (f.uncertaintySeriesShown ?? 0) < (f.uncertaintySeriesTotal ?? 0),
	AGGREGATE_WITHOUT_RAW_REPEATS: () => false,
	EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY: (f) => f.eventScopeMembershipCardinalityOnly === true,
	EVENT_SCOPE_EXTERNAL_AUTHORITY_UNVERIFIED: (f) => f.eventScopeExternalAuthorityDeclared === true,
	KERNEL_SMOOTHED_RATE: (f) => f.kernelSmoothed === true,
	ZERO_LAG_SELF_PAIRS_EXCLUDED: () => false,
	LAG_ORIENTATION: () => false,
	PRE_BINNED_INPUT: (f) => f.preBinned === true,
	RECTANGULAR_SENDER_EXPOSURE_ASSERTED: (f) => f.rectangularSenderExposureAsserted === true,
	DUPLICATE_TIMES_AGGREGATED: (f) => f.duplicateTimeAggregateMethod !== void 0,
	MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE: (f) => (f.missingAggregateReplicateCount ?? 0) > 0,
	CALLER_NOTE_UNVERIFIED: (f) => f.callerNotePresent === true,
	NONSTANDARD_BUDGET_PROFILE: (f) => f.budgetProfileId !== void 0 ? f.budgetProfileId !== "standard" : f.nonStandardBudgetProfile === true
};
const SEVERITY_ORDER = {
	critical: 0,
	important: 1,
	informational: 2
};
/** Fill `{placeholder}` tokens from the facts. The surrounding sentence is untouched. */
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
/**
* Derive the disclosures for a figure.
*
* The list is deterministic: sorted by severity, then by rule id. The compiler may
* additionally FORCE a rule that depends on facts only it knows (a correlogram always
* discloses its lag orientation; a matrix discloses that absent is not zero) by
* passing its id in `forced`. A forced rule still uses the registry text — the
* compiler decides IF it fires, never WHAT it says.
*/
function deriveDisclosures(facts, allowedIds, forced = []) {
	const allowed = new Set(allowedIds);
	const forcedSet = new Set(forced);
	const out = [];
	for (const rule of DISCLOSURE_RULES) {
		if (!allowed.has(rule.id) && !forcedSet.has(rule.id)) continue;
		const predicate = RULE_PREDICATES[rule.id];
		if (!(forcedSet.has(rule.id) || (predicate ? predicate(facts) : false))) continue;
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

//#endregion
export { deriveDisclosures as t };
//# sourceMappingURL=disclosures-CARlLREv.js.map