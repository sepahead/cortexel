import {
  DISCLOSURE_RULES
} from "./chunk-6TQKFRP5.js";

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

export {
  deriveDisclosures
};
//# sourceMappingURL=chunk-GCZJRQIF.js.map