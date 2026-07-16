/**
 * The analysis layer — the deterministic scientific core.
 *
 * These are the derivations a figure is built ON. They are pure, dependency-light, and
 * certified by hand-computable golden vectors, because the alternative — trusting that
 * two libraries agree — cannot catch a convention error the two libraries share.
 *
 * A renderer NEVER reimplements any of this. It consumes the output. That is what lets
 * the CLI and React produce provably identical figures: the science happened once, here,
 * before either of them ran.
 */

export {
  MAX_MATERIALIZED_BINS,
  edgesFromWidth,
  tryEdgesFromWidth,
  binIndex,
  binCounts,
  binWidths,
  binCenters,
  type Bins,
} from './bins.js';
export {
  makeEventTable,
  stableEventOrder,
  groupByTrain,
  partitionByWindow,
  type EventTable,
} from './events.js';
export { computeIsi, type IsiResult } from './isi.js';
export { computePopulationRate, verifyRates, type RateResult } from './rates.js';
export {
  DEFAULT_MAX_PAIRWISE_OPERATIONS,
  PairwiseBudgetExceededError,
  countEligibleCorrelogramPairs,
  computeCorrelogram,
  type CorrelogramResult,
} from './correlogram.js';
export {
  computeDegrees,
  computeMatrix,
  type DegreeResult,
  type SparseMatrix,
} from './topology.js';
export {
  applyTraceNormalization,
  binary64EffectWasPreserved,
  prepareTraceSeries,
  type TraceObservationKind,
  type TraceDuplicatePolicy,
  type TraceAggregateMethod,
  type TraceWindow,
  type TraceNormalization,
  type TraceSeriesInput,
  type PrepareTraceOptions,
  type PreparedTraceSeries,
} from './traces.js';
