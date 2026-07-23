/**
 * The analysis layer — the deterministic scientific core.
 *
 * These are the derivations a figure is built ON. They are pure, dependency-light, and
 * covered by selected hand-computable golden vectors. Those vectors are internal
 * regression evidence, not external scientific certification.
 *
 * A renderer NEVER reimplements any of this. It consumes the output, keeping the
 * supported headless render entry points on one derivation path. That fact alone does
 * not prove scientific correctness or cross-platform output identity.
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
  type EventWindowBoundary,
} from './events.js';
export { computeIsi, type IsiResult } from './isi.js';
export { computePopulationRate, verifyRates, type RateResult } from './rates.js';
export {
  derivePsth,
  PsthDerivationError,
  type PsthBaselineInput,
  type PsthBinsInput,
  type PsthDenominatorPolicy,
  type PsthEventsInput,
  type PsthInput,
  type PsthNormalization,
  type PsthPrebinnedInput,
  type PsthResult,
  type PsthWindowInput,
} from './psth.js';
export {
  DEFAULT_MAX_PAIRWISE_OPERATIONS,
  PairwiseBudgetExceededError,
  countEligibleCorrelogramPairs,
  computeCorrelogram,
  deriveEligibleCorrelogramReferenceCounts,
  deriveCorrelogramPairAccounting,
  deriveCorrelogramTargetRates,
  type CorrelogramPairAccounting,
  type CorrelogramRateBin,
  type CorrelogramRateStatus,
  type CorrelogramResult,
  type CorrelogramTypedWindow,
  type CorrelogramWindowBoundary,
} from './correlogram.js';
export {
  aggregateTopologyScalar,
  computeDegrees,
  computeMatrix,
  type DegreeResult,
  type SparseMatrix,
  type TopologyScalarAggregation,
} from './topology.js';
export {
  SPATIAL_DOMAIN_TOLERANCE_EPSILON_MULTIPLIER,
  SPATIAL_DOMAIN_ENDPOINT_ROUNDING_EPSILON_MULTIPLIER,
  classifySpatialChord,
  reverseSpatialSegments,
  routeSpatialChord,
  spatialDomainAxis,
  spatialDomainAxisContains,
  type RoutedSpatialChord,
  type SpatialChordPathKind,
  type SpatialChordRoute,
  type SpatialDomainAxis,
  type SpatialPoint2D,
  type SpatialRoutingDomain,
} from './spatial.js';
export {
  MATRIX_AXIS_ORDER,
  MatrixDerivationError,
  deriveAdjacencyMatrix,
  deriveDelayMatrix,
  deriveMatrixTopology,
  deriveWeightMatrix,
  type AdjacencyMatrixCell,
  type AdjacencyMatrixResult,
  type DelayMatrixCell,
  type DelayMatrixResult,
  type MatrixAggregation,
  type MatrixCellEnumeration,
  type MatrixCellState,
  type MatrixScope,
  type MatrixTopologyCell,
  type MatrixTopologyInput,
  type MatrixTopologyResult,
  type WeightMatrixCell,
  type WeightMatrixCellState,
  type WeightMatrixResult,
} from './matrices.js';
export {
  deriveResponseCurve,
  exactResponseCurveMean,
  responseCurveEstimate,
  type ResponseCurveAggregatesInput,
  type ResponseCurveAxis,
  type ResponseCurveBinnedPeakAuditInput,
  type ResponseCurveConditionResult,
  type ResponseCurveConditionsInput,
  type ResponseCurveEstimator,
  type ResponseCurveInput,
  type ResponseCurveIssue,
  type ResponseCurveIssueCode,
  type ResponseCurveOutcome,
  type ResponseCurveRepeatRow,
  type ResponseCurveRepeatsInput,
  type ResponseCurveResult,
  type ResponseCurveMethod,
  type ResponseCurveRepeatDesign,
  type ResponseCurveScale,
} from './responseCurve.js';
export {
  deriveDegreeDistribution,
  deriveDelayDistribution,
  deriveExactGroupedHistogram,
  deriveIsiFromEvents,
  deriveIsiFromIntervals,
  derivePopulationRateCounts,
  deriveWeightDistribution,
  exactUnitBinIndex,
  verifyHistogramValues,
  DistributionDerivationError,
  type DegreeDistributionResultV1,
  type DistributionDerivationCode,
  type EdgeDistributionGroupAccounting,
  type EdgeDistributionResultV1,
  type ExactBinsInput,
  type ExactGroupedHistogram,
  type ExactHistogramGroup,
  type GroupedObservation,
  type HistogramNormalization,
  type IsiDistributionResultV1,
  type IsiTrainDeclaration,
  type OutOfRangePolicy,
  type PairAggregation,
  type PopulationRateResultV1,
} from './distributions.js';
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
