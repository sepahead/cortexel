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
 * visible SVG footer, the SVG accessible description, and the table metadata — and a
 * test asserts all four agree. A disclosure that is visible but not accessible, or
 * accessible but not in the archive, would be a disclosure that some readers do not
 * get.
 */

import { DISCLOSURE_RULES, type DisclosureId } from '../generated/registry.js';

export interface Disclosure {
  readonly id: DisclosureId;
  readonly severity: 'critical' | 'important' | 'informational';
  readonly text: string;
}

/** The facts a disclosure rule may examine. All library-generated; none caller-set. */
export interface DisclosureFacts {
  readonly sourceKind: string;
  readonly sourceAuthenticityVerified: boolean;
  readonly referenceComparisonRun: boolean;
  readonly scopeKind?: string;
  readonly rank?: number;
  readonly worldSize?: number;
  readonly nodeUniverseComplete?: boolean;
  readonly compacted: boolean;
  readonly extremaPreserved?: boolean;
  readonly compactionPolicyId?: string;
  readonly countBefore?: number;
  readonly countAfter?: number;
  readonly tableRowsInline: number;
  readonly tableRowsTotal: number;
  readonly excludedOutOfWindow?: number;
  readonly missingValueCount?: number;
  readonly unitConversions?: readonly string[];
  readonly duplicateTimeAggregateMethod?: string;
  readonly uncertaintyKind?: string;
  readonly uncertaintyReason?: string;
  readonly uncertaintySeriesDeclared?: number;
  readonly uncertaintySeriesShown?: number;
  readonly uncertaintySeriesTotal?: number;
  readonly missingAggregateReplicateCount?: number;
  readonly kernelSmoothed?: boolean;
  readonly preBinned?: boolean;
  readonly callerNotePresent?: boolean;
  readonly experimentalRenderer?: boolean;
  readonly nonStandardBudgetProfile?: boolean;
  readonly budgetProfileId?: string;
  readonly sampledRetained?: number;
  readonly sampledSource?: number;
  readonly retainedConnectionCount?: number;
  readonly sourceConnectionCount?: number;
  readonly multapseAggregation?: string;
  readonly multapseAggregated?: boolean;
  readonly schematicLayout?: boolean;
  readonly positionsMissing?: number;
  readonly positionsTotal?: number;
}

/**
 * Each rule is a pure predicate over the facts. The registry text is the SINGLE
 * source of the wording — the predicate decides only whether a rule fires. A
 * placeholder like `{rank}` is filled from the facts, but the sentence around it is
 * never rewritten, because a reworded disclosure is a different disclosure.
 */
const RULE_PREDICATES: Readonly<Record<string, (facts: DisclosureFacts) => boolean>> = {
  SOURCE_SIMULATION: (f) => f.sourceKind === 'simulation',
  SOURCE_SYNTHETIC_FIXTURE: (f) => f.sourceKind === 'synthetic_fixture',
  SOURCE_KIND_UNKNOWN: (f) => f.sourceKind === 'unknown',
  SOURCE_LITERATURE_EXTRACTION: (f) => f.sourceKind === 'literature_extraction',
  SOURCE_MANUAL_ENTRY: (f) => f.sourceKind === 'manual_entry',
  SOURCE_AUTHENTICITY_UNVERIFIED: (f) => !f.sourceAuthenticityVerified,
  REFERENCE_COMPARISON_NOT_RUN: (f) => !f.referenceComparisonRun,

  PARTIAL_NETWORK_SCOPE: (f) => f.scopeKind === 'sampled' || f.scopeKind === 'mpi_target_rank_local',
  RANK_LOCAL_SCOPE: (f) => f.scopeKind === 'mpi_target_rank_local',
  SAMPLED_EDGES: (f) => f.scopeKind === 'sampled',
  NODE_UNIVERSE_INCOMPLETE: (f) => f.nodeUniverseComplete === false,
  MULTAPSE_AGGREGATED: (f) =>
    f.multapseAggregated === true &&
    f.multapseAggregation !== undefined &&
    f.multapseAggregation !== 'no_aggregation',
  ABSENT_IS_NOT_ZERO: () => false, // matrix compilers set this explicitly
  SCHEMATIC_LAYOUT: (f) => f.schematicLayout === true,
  POSITIONS_MISSING: (f) => (f.positionsMissing ?? 0) > 0,

  DOWNSAMPLED_FOR_RENDERING: (f) => f.compacted,
  COMPACTION_MAY_HIDE_TRANSIENTS: (f) => f.compacted && f.extremaPreserved === false,
  TABLE_EXCERPT_ONLY: (f) => f.tableRowsInline < f.tableRowsTotal,

  EVENTS_EXCLUDED_OUT_OF_WINDOW: (f) => (f.excludedOutOfWindow ?? 0) > 0,
  MISSING_VALUES_PRESENT: (f) => (f.missingValueCount ?? 0) > 0,
  UNIT_CONVERTED: (f) => (f.unitConversions?.length ?? 0) > 0,
  UNCERTAINTY_NOT_PROVIDED: (f) => f.uncertaintyKind === 'none',
  UNCERTAINTY_COVERAGE_INCOMPLETE: (f) =>
    (f.uncertaintySeriesDeclared ?? 0) > 0 &&
    (f.uncertaintySeriesShown ?? 0) < (f.uncertaintySeriesTotal ?? 0),
  AGGREGATE_WITHOUT_RAW_REPEATS: () => false, // response-curve compiler sets this
  KERNEL_SMOOTHED_RATE: (f) => f.kernelSmoothed === true,
  ZERO_LAG_SELF_PAIRS_EXCLUDED: () => false, // correlogram compiler sets this
  LAG_ORIENTATION: () => false, // correlogram compiler always emits this
  PRE_BINNED_INPUT: (f) => f.preBinned === true,
  DUPLICATE_TIMES_AGGREGATED: (f) => f.duplicateTimeAggregateMethod !== undefined,
  MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE: (f) =>
    (f.missingAggregateReplicateCount ?? 0) > 0,

  CALLER_NOTE_UNVERIFIED: (f) => f.callerNotePresent === true,
  EXPERIMENTAL_RENDERER: (f) => f.experimentalRenderer === true,
  NONSTANDARD_BUDGET_PROFILE: (f) =>
    f.budgetProfileId !== undefined
      ? f.budgetProfileId !== 'standard'
      : f.nonStandardBudgetProfile === true,
};

const SEVERITY_ORDER: Readonly<Record<string, number>> = {
  critical: 0,
  important: 1,
  informational: 2,
};

/** Fill `{placeholder}` tokens from the facts. The surrounding sentence is untouched. */
function fillTemplate(text: string, facts: DisclosureFacts): string {
  const values: Record<string, unknown> = {
    rank: facts.rank,
    worldSize: facts.worldSize,
    retainedConnectionCount: facts.retainedConnectionCount ?? facts.sampledRetained,
    sourceConnectionCount: facts.sourceConnectionCount ?? facts.sampledSource,
    countAfter: facts.countAfter,
    countBefore: facts.countBefore,
    policyId: facts.compactionPolicyId,
    tableRowsInline: facts.tableRowsInline,
    tableRowsTotal: facts.tableRowsTotal,
    excludedCount: facts.excludedOutOfWindow,
    missingCount: facts.missingValueCount ?? facts.positionsMissing,
    totalCount: facts.positionsTotal,
    reason: facts.uncertaintyReason,
    aggregation: facts.multapseAggregation,
    conversions: facts.unitConversions?.join(', '),
    method: facts.duplicateTimeAggregateMethod,
    declaredCount: facts.uncertaintySeriesDeclared,
    shownCount: facts.uncertaintySeriesShown,
    seriesCount: facts.uncertaintySeriesTotal,
    missingReplicateCount: facts.missingAggregateReplicateCount,
    profileId:
      facts.budgetProfileId ?? (facts.nonStandardBudgetProfile ? 'custom' : 'standard'),
  };

  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? whole : String(value);
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
export function deriveDisclosures(
  facts: DisclosureFacts,
  allowedIds: readonly string[],
  forced: readonly string[] = [],
): Disclosure[] {
  const allowed = new Set(allowedIds);
  const forcedSet = new Set(forced);
  const out: Disclosure[] = [];

  for (const rule of DISCLOSURE_RULES) {
    if (!allowed.has(rule.id) && !forcedSet.has(rule.id)) continue;

    const predicate = RULE_PREDICATES[rule.id];
    const fires = forcedSet.has(rule.id) || (predicate ? predicate(facts) : false);
    if (!fires) continue;

    out.push({
      id: rule.id as DisclosureId,
      severity: rule.severity,
      text: fillTemplate(rule.text, facts),
    });
  }

  out.sort((a, b) => {
    const severityDelta = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return severityDelta !== 0 ? severityDelta : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return out;
}
