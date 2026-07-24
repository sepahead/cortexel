/**
 * Closed scientific authority for response-curve rate normalizations and peak bases.
 *
 * A frequency unit alone does not say whether a curve is one train, a pooled event
 * total, or a mean per recorded sender. Likewise, a peak rate is not reproducible
 * without the bin/grid and kernel conventions that produced the maximum. This module
 * owns the cross-field checks shared by request semantics and the defensive render
 * boundary so those two gates cannot drift.
 */

import { materializeWidthBins } from './binning.js';
import { canonicalDigest } from './canonicalize.js';
import {
  compareExactUnitSumToValue,
  convert,
  dimensionOf,
  isRoundedAggregateCountRateInUnit,
} from './units.js';

export type ResponseRateNormalization =
  | 'single_train_rate'
  | 'total_event_rate'
  | 'mean_rate_per_recorded_sender';

export type ResponseEventScopeKind = 'single_train' | 'pooled_recorded_senders';
export type ResponseEventMembershipKind =
  | 'single_train_selection_rule'
  | 'explicit_sender_ids'
  | 'canonical_sender_ids_digest'
  | 'cardinality_only';

export interface ResponseEventScopeAuthority {
  readonly kind: ResponseEventScopeKind;
  readonly selectionId: string;
  readonly eventKind: 'spike';
  readonly eventCompleteness: 'complete_for_selection_within_measurement_window';
  readonly poolingOperator: 'identity_single_train' | 'superpose_selected_sender_trains';
  /** Number of event trains entering the pooling operator; one for single_train. */
  readonly selectedEventTrainCount: number;
  /** Sender cardinality is known only for an explicitly pooled recorded-sender scope. */
  readonly recordedSenderCount: number | null;
  readonly membershipKind: ResponseEventMembershipKind;
  /** Order-normalized scientific authority; safe to use in derived semantic digests. */
  readonly normalizedScope: Readonly<Record<string, unknown>>;
}

export type ResponseEventScopeResult =
  | { readonly ok: true; readonly authority: ResponseEventScopeAuthority }
  | { readonly ok: false; readonly path: string; readonly message: string };

export type RateAuthorityResult =
  | {
      readonly ok: true;
      readonly normalization: ResponseRateNormalization;
      readonly recordedSenderCount: number | null;
      readonly integerDivisor: number;
      readonly eventScope: ResponseEventScopeAuthority;
    }
  | {
      readonly ok: false;
      readonly path: string;
      readonly message: string;
    };

type PlainRecord = Record<string, unknown>;

export const RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID =
  'cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1' as const;

/**
 * ECMAScript relational comparison is lexicographic over UTF-16 code units.  Keep the
 * comparator explicit: locale collation, Unicode-normalized comparison, and Python's
 * native code-point ordering all define different orders for some valid identifiers.
 */
export function compareUtf16CodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

export function normalizeResponseEventMemberIds(
  identifiers: readonly string[],
): readonly string[] {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    throw new RangeError('identifier set must be a non-empty array');
  }
  const seen = new Set<string>();
  for (let index = 0; index < identifiers.length; index++) {
    const identifier = identifiers[index];
    if (typeof identifier !== 'string' || identifier.length === 0) {
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

/** SHA-256 over RFC 8785 canonical JSON of the UTF-16-sorted identifier array. */
export function responseEventMembershipDigest(identifiers: readonly string[]): string {
  return canonicalDigest(normalizeResponseEventMemberIds(identifiers));
}

function record(value: unknown): PlainRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as PlainRecord
    : undefined;
}

/** Validate the event-train selection shared by every response condition and repeat. */
export function verifyResponseEventScope(value: unknown): ResponseEventScopeResult {
  const scope = record(value);
  if (!scope) {
    return {
      ok: false,
      path: '/eventScope',
      message: 'every event-derived response must declare one eventScope.',
    };
  }
  if (typeof scope.selectionId !== 'string' || scope.selectionId.length === 0) {
    return {
      ok: false,
      path: '/eventScope/selectionId',
      message: 'eventScope.selectionId must identify the selection shared by every condition and repeat.',
    };
  }
  if (scope.eventKind !== 'spike') {
    return { ok: false, path: '/eventScope/eventKind', message: 'revision 2 response curves support spike events only.' };
  }
  if (scope.eventCompleteness !== 'complete_for_selection_within_measurement_window') {
    return {
      ok: false,
      path: '/eventScope/eventCompleteness',
      message: 'counts, rates, and no-spike latencies require every selected spike inside the measurement window.',
    };
  }

  if (scope.kind === 'single_train') {
    if (scope.poolingOperator !== 'identity_single_train') {
      return {
        ok: false,
        path: '/eventScope/poolingOperator',
        message: 'single_train requires identity_single_train pooling.',
      };
    }
    if (scope.recordedSenderCount !== undefined) {
      return {
        ok: false,
        path: '/eventScope/recordedSenderCount',
        message: 'single_train declares one event train but no recorded-sender cardinality, so recordedSenderCount is inapplicable and forbidden.',
      };
    }
    return {
      ok: true,
      authority: {
        kind: 'single_train',
        selectionId: scope.selectionId,
        eventKind: 'spike',
        eventCompleteness: 'complete_for_selection_within_measurement_window',
        poolingOperator: 'identity_single_train',
        selectedEventTrainCount: 1,
        recordedSenderCount: null,
        membershipKind: 'single_train_selection_rule',
        normalizedScope: {
          kind: 'single_train',
          declaredSelectionId: scope.selectionId,
          declaredEventKind: 'spike',
          declaredEventCompleteness: 'complete_for_selection_within_measurement_window',
          declaredPoolingOperator: 'identity_single_train',
          structurallyDerivedSelectedEventTrainCount: 1,
          declaredRecordedSenderCount: null,
          membershipBinding: { kind: 'single_train_selection_rule' },
        },
      },
    };
  }

  if (scope.kind !== 'pooled_recorded_senders') {
    return {
      ok: false,
      path: '/eventScope/kind',
      message: 'eventScope.kind must be single_train or pooled_recorded_senders.',
    };
  }
  if (scope.poolingOperator !== 'superpose_selected_sender_trains') {
    return {
      ok: false,
      path: '/eventScope/poolingOperator',
      message: 'pooled_recorded_senders requires superpose_selected_sender_trains pooling.',
    };
  }
  if (!Number.isSafeInteger(scope.recordedSenderCount) || (scope.recordedSenderCount as number) < 1) {
    return {
      ok: false,
      path: '/eventScope/recordedSenderCount',
      message: 'pooled_recorded_senders requires a positive exact recordedSenderCount.',
    };
  }
  const count = scope.recordedSenderCount as number;
  const membership = record(scope.membershipBinding);
  const membershipKind = membership?.kind;
  let normalizedMembership: Readonly<Record<string, unknown>>;
  if (membershipKind === 'explicit_sender_ids') {
    const ids = membership?.senderIds;
    if (!Array.isArray(ids) || ids.length !== count) {
      return {
        ok: false,
        path: '/eventScope/membershipBinding/senderIds',
        message: `explicit sender membership must contain exactly recordedSenderCount=${count} ids.`,
      };
    }
    const seen = new Set<string>();
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      // The generated schema rejects non-strings first, but this helper is also used at
      // the defensive render boundary.  It must remain fail-closed if either caller ever
      // invokes it without a structurally branded request.
      if (typeof id !== 'string' || id.length === 0) {
        return {
          ok: false,
          path: `/eventScope/membershipBinding/senderIds/${index}`,
          message: 'every explicit sender id must be a non-empty identifier string.',
        };
      }
      if (!isWellFormedUnicode(id)) {
        return {
          ok: false,
          path: `/eventScope/membershipBinding/senderIds/${index}`,
          message: 'every explicit sender id must be well-formed Unicode.',
        };
      }
      if (seen.has(id)) {
        return {
          ok: false,
          path: `/eventScope/membershipBinding/senderIds/${index}`,
          message: `explicit sender id ${JSON.stringify(id)} appears more than once.`,
        };
      }
      seen.add(id);
    }
    normalizedMembership = {
      kind: 'explicit_sender_ids',
      senderIds: normalizeResponseEventMemberIds([...seen]),
    };
  } else if (
    membershipKind !== 'canonical_sender_ids_digest' &&
    membershipKind !== 'cardinality_only'
  ) {
    return {
      ok: false,
      path: '/eventScope/membershipBinding',
      message: 'pooled sender membership must be explicit, canonically digest-bound, or explicitly cardinality-only.',
    };
  } else if (membershipKind === 'canonical_sender_ids_digest') {
    if (
      membership?.algorithm !== 'sha256' ||
      membership?.canonicalization !== RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID ||
      typeof membership?.digest !== 'string' ||
      !/^sha256:[0-9a-f]{64}$/u.test(membership.digest)
    ) {
      return {
        ok: false,
        path: '/eventScope/membershipBinding',
        message: 'canonical sender membership requires the registered SHA-256 canonicalization and a lowercase sha256 digest.',
      };
    }
    normalizedMembership = {
      kind: 'canonical_sender_ids_digest',
      algorithm: membership?.algorithm,
      canonicalization: membership?.canonicalization,
      digest: membership?.digest,
    };
  } else {
    normalizedMembership = { kind: 'cardinality_only' };
  }
  return {
    ok: true,
    authority: {
      kind: 'pooled_recorded_senders',
      selectionId: scope.selectionId,
      eventKind: 'spike',
      eventCompleteness: 'complete_for_selection_within_measurement_window',
      poolingOperator: 'superpose_selected_sender_trains',
      selectedEventTrainCount: count,
      recordedSenderCount: count,
      membershipKind: membershipKind as Exclude<ResponseEventMembershipKind, 'single_train_selection_rule'>,
      normalizedScope: {
        kind: 'pooled_recorded_senders',
        declaredSelectionId: scope.selectionId,
        declaredEventKind: 'spike',
        declaredEventCompleteness: 'complete_for_selection_within_measurement_window',
        declaredPoolingOperator: 'superpose_selected_sender_trains',
        structurallyDerivedSelectedEventTrainCount: count,
        declaredRecordedSenderCount: count,
        membershipBinding: normalizedMembership,
      },
    },
  };
}

/** Validate event scope against rate normalization and return the exact count divisor. */
export function verifyResponseRateAuthority(
  normalization: unknown,
  eventScopeValue: unknown,
): RateAuthorityResult {
  if (
    normalization !== 'single_train_rate' &&
    normalization !== 'total_event_rate' &&
    normalization !== 'mean_rate_per_recorded_sender'
  ) {
    return {
      ok: false,
      path: '/rateNormalization',
      message: 'a firing-rate response must declare a recognized rateNormalization.',
    };
  }

  const eventScope = verifyResponseEventScope(eventScopeValue);
  if (!eventScope.ok) return eventScope;

  if (normalization === 'single_train_rate') {
    if (eventScope.authority.kind !== 'single_train') {
      return {
        ok: false,
        path: '/eventScope/kind',
        message: 'single_train_rate requires eventScope.kind single_train.',
      };
    }
    return {
      ok: true,
      normalization,
      recordedSenderCount: null,
      integerDivisor: 1,
      eventScope: eventScope.authority,
    };
  }

  if (eventScope.authority.kind !== 'pooled_recorded_senders') {
    return {
      ok: false,
      path: '/eventScope/kind',
      message: `${normalization} requires eventScope.kind pooled_recorded_senders.`,
    };
  }

  return {
    ok: true,
    normalization,
    recordedSenderCount: eventScope.authority.recordedSenderCount,
    integerDivisor:
      normalization === 'mean_rate_per_recorded_sender'
        ? eventScope.authority.recordedSenderCount as number
        : 1,
    eventScope: eventScope.authority,
  };
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positiveDuration(quantity: unknown): { value: number; unit: string } | undefined {
  const node = record(quantity);
  const value = finite(node?.value);
  const unit = typeof node?.unit === 'string' ? node.unit : undefined;
  return value !== undefined && value > 0 && unit !== undefined && dimensionOf(unit) === 'time'
    ? { value, unit }
    : undefined;
}

export type PeakBasisVerification =
  | {
      readonly ok: true;
      readonly kind: 'binned_count';
      readonly materializedCount: number;
      readonly widthInWindowUnit: number;
      readonly uniformExposureVerified: true;
    }
  | {
      readonly ok: true;
      readonly kind: 'kernel_continuous';
    }
  | {
      readonly ok: true;
      readonly kind: 'kernel_sampled_grid';
      readonly materializedCount: number;
      readonly stepInWindowUnit: number;
    }
  | {
      readonly ok: false;
      readonly path: string;
      readonly message: string;
    };

export type BinnedPeakValueLatticeVerification =
  | {
      readonly ok: true;
      readonly checkedValueCount: number;
      readonly estimatorDenominatorMinimum: number | null;
      readonly estimatorDenominatorMaximum: number | null;
    }
  | {
      readonly ok: false;
      readonly path: string;
      readonly message: string;
    };

function materializeDeclaredGrid(
  quantity: unknown,
  declaredCount: unknown,
  windowStart: number,
  windowStop: number,
  windowUnit: string,
  quantityPath: string,
  countPath: string,
  noun: 'bin' | 'sample',
): PeakBasisVerification {
  const duration = positiveDuration(quantity);
  if (!duration) {
    return {
      ok: false,
      path: quantityPath,
      message: `${noun} width/step must be a positive registered duration.`,
    };
  }
  if (!Number.isSafeInteger(declaredCount) || (declaredCount as number) < 1) {
    return {
      ok: false,
      path: countPath,
      message: `${noun} count must be a positive exact safe integer.`,
    };
  }

  let widthInWindowUnit: number;
  try {
    widthInWindowUnit = convert(duration.value, duration.unit, windowUnit);
  } catch (error) {
    return {
      ok: false,
      path: quantityPath,
      message: `the declared ${noun} width/step cannot be converted into the measurement-window unit (${error instanceof Error ? error.message : 'conversion failed'}).`,
    };
  }
  const materialized = materializeWidthBins(windowStart, windowStop, widthInWindowUnit);
  if (!materialized.ok) {
    const policy = noun === 'bin'
      ? 'cortexel_binary64_uniform_exposure_bins_v1'
      : 'cortexel_binary64_nominal_steps_v1';
    return {
      ok: false,
      path: quantityPath,
      message: `the declared ${noun} width/step does not materialize the measurement window under ${policy} (${materialized.reason}).`,
    };
  }
  const materializedCount = materialized.edges.length - 1;
  if (materializedCount !== declaredCount) {
    return {
      ok: false,
      path: countPath,
      message: `declared ${noun} count ${String(declaredCount)} does not equal the ${materializedCount} endpoint-authoritative ${noun} candidate${materializedCount === 1 ? '' : 's'} materialized from the typed window and width/step.`,
    };
  }
  if (noun === 'bin') {
    for (let index = 0; index < materializedCount; index++) {
      let comparison: -1 | 0 | 1;
      try {
        comparison = compareExactUnitSumToValue(
          [
            { value: materialized.edges[index + 1], unit: windowUnit },
            { value: -materialized.edges[index], unit: windowUnit },
          ],
          duration,
        );
      } catch (error) {
        return {
          ok: false,
          path: quantityPath,
          message: `exact physical exposure comparison failed (${error instanceof Error ? error.message : 'comparison failed'}).`,
        };
      }
      if (comparison !== 0) {
        return {
          ok: false,
          path: quantityPath,
          message: `emitted bin ${index} does not have exact physical exposure equal to the typed binWidth; a max-bin count is insufficient rate authority for a nonuniform grid. Use an exactly representable common unit or explicit per-bin count/exposure data.`,
        };
      }
    }
  }
  return noun === 'bin'
    ? {
      ok: true,
      kind: 'binned_count',
      materializedCount,
      widthInWindowUnit,
      uniformExposureVerified: true,
    }
    : { ok: true, kind: 'kernel_sampled_grid', materializedCount, stepInWindowUnit: widthInWindowUnit };
}

/**
 * Bind a peak-rate estimator basis to its typed measurement window.
 *
 * Candidate coordinates reuse `materializeWidthBins`: widths are converted once,
 * exactly-rationally rounded into the window unit, and then checked with the published
 * bounded binary64 allowance. A sampled kernel grid treats those emitted coordinates as
 * authoritative. A binned-count peak additionally proves that every emitted endpoint
 * difference is exactly the original typed physical width; without that stronger
 * invariant a maximum count does not determine a maximum rate.
 */
export function verifyPeakBasisAgainstWindow(
  basisValue: unknown,
  windowValue: unknown,
): PeakBasisVerification {
  const basis = record(basisValue);
  const window = record(windowValue);
  const windowStart = finite(window?.start);
  const windowStop = finite(window?.stop);
  const windowUnit = typeof window?.unit === 'string' ? window.unit : undefined;
  const windowBoundary = window?.boundary === '[start,stop]' ? '[start,stop]' : '[start,stop)';
  if (
    !basis ||
    windowStart === undefined ||
    windowStop === undefined ||
    !(windowStop > windowStart) ||
    !windowUnit ||
    dimensionOf(windowUnit) !== 'time'
  ) {
    return {
      ok: false,
      path: '/measurementWindow',
      message: 'peak-basis verification requires a finite, strictly ordered measurement window in a registered time unit.',
    };
  }

  if (basis.estimator === 'binned_count') {
    if (windowBoundary !== '[start,stop)' || basis.boundary !== windowBoundary) {
      return {
        ok: false,
        path: '/basis/boundary',
        message: 'binned_count peak estimation requires the same half-open [start,stop) boundary as the measurement window.',
      };
    }
    return materializeDeclaredGrid(
      basis.binWidth,
      basis.binCount,
      windowStart,
      windowStop,
      windowUnit,
      '/basis/binWidth',
      '/basis/binCount',
      'bin',
    );
  }

  if (basis.estimator !== 'kernel') {
    return { ok: false, path: '/basis/estimator', message: 'unknown peak-rate estimator basis.' };
  }

  const shape = basis.shape;
  const form = basis.kernelForm;
  const bandwidthDefinition = basis.bandwidthDefinition;
  const support = record(basis.support);
  const supportKind = support?.kind;
  const symmetric = form === 'symmetric' || form === 'symmetric_laplace';
  const validKernelIdentity =
    (shape === 'gaussian' &&
      form === 'symmetric' &&
      bandwidthDefinition === 'standard_deviation' &&
      (supportKind === 'analytic_infinite' ||
        (supportKind === 'finite_cutoff' && support?.geometry === 'symmetric_radius'))) ||
    (shape === 'boxcar' &&
      (form === 'symmetric' || form === 'causal_past') &&
      bandwidthDefinition === 'full_width' &&
      supportKind === 'finite_full_width') ||
    (shape === 'exponential' &&
      form === 'causal_past' &&
      bandwidthDefinition === 'time_constant' &&
      (supportKind === 'analytic_infinite' ||
        (supportKind === 'finite_cutoff' &&
          support?.geometry === 'past_horizon'))) ||
    (shape === 'laplace' &&
      form === 'symmetric_laplace' &&
      bandwidthDefinition === 'time_constant' &&
      (supportKind === 'analytic_infinite' ||
        (supportKind === 'finite_cutoff' && support?.geometry === 'symmetric_radius')));
  if (!validKernelIdentity) {
    return {
      ok: false,
      path: '/basis',
      message: 'kernel shape, form, bandwidth definition, and support are not a recognized mathematical combination.',
    };
  }
  if (!positiveDuration(basis.bandwidth)) {
    return {
      ok: false,
      path: '/basis/bandwidth',
      message: 'kernel bandwidth must be a positive registered duration.',
    };
  }
  if (supportKind === 'finite_cutoff' && !positiveDuration(support?.cutoff)) {
    return {
      ok: false,
      path: '/basis/support/cutoff',
      message: 'a finite kernel cutoff must be a positive registered duration.',
    };
  }
  if (basis.edgePolicy === 'renormalize_evaluation_mass' && !symmetric) {
    return {
      ok: false,
      path: '/basis/edgePolicy',
      message: 'renormalize_evaluation_mass is refused for causal_past kernels because the available kernel mass is zero at the included window start.',
    };
  }

  const evaluation = record(basis.evaluation);
  if (evaluation?.mode === 'continuous_supremum') {
    if (evaluation.boundary !== windowBoundary) {
      return {
        ok: false,
        path: '/basis/evaluation/boundary',
        message: 'continuous kernel evaluation must use the measurement window boundary verbatim.',
      };
    }
    return { ok: true, kind: 'kernel_continuous' };
  }
  if (evaluation?.mode === 'sampled_grid') {
    if (windowBoundary !== '[start,stop)' || evaluation.boundary !== windowBoundary) {
      return {
        ok: false,
        path: '/basis/evaluation/boundary',
        message: 'sampled-grid kernel evaluation requires the same half-open [start,stop) boundary as the measurement window.',
      };
    }
    return materializeDeclaredGrid(
      evaluation.step,
      evaluation.sampleCount,
      windowStart,
      windowStop,
      windowUnit,
      '/basis/evaluation/step',
      '/basis/evaluation/sampleCount',
      'sample',
    );
  }
  return {
    ok: false,
    path: '/basis/evaluation',
    message: 'kernel peak estimation requires continuous_supremum or a fully declared sampled_grid.',
  };
}

/**
 * Verify the discrete value lattice implied by an aggregate binned-count peak.
 *
 * Raw binned peaks carry exact `audit.peakBinCounts`; their rates and condition estimates
 * are re-derived from those identified counts and are deliberately not accepted through
 * an existential inverse. Aggregate-only input omits the repeats, so mean/trimmed mean is
 * checked as the sum of retained integer max-bin counts divided by retained n; an odd
 * median remains on the raw lattice and an even median is the mean of two integer central
 * order statistics. Existence on that exact lattice is checkable without inventing the
 * omitted counts.
 */
export function verifyBinnedPeakValueLattice(
  valuesValue: unknown,
  basisValue: unknown,
  rateUnitValue: unknown,
  integerDivisor: number,
  mode: 'repeats' | 'aggregates',
  estimatorValue: unknown,
  sampleCountsValue?: unknown,
): BinnedPeakValueLatticeVerification {
  const values = Array.isArray(valuesValue) ? valuesValue : undefined;
  const basis = record(basisValue);
  const binWidth = positiveDuration(basis?.binWidth);
  const rateUnit = typeof rateUnitValue === 'string' ? rateUnitValue : undefined;
  if (
    !values ||
    basis?.estimator !== 'binned_count' ||
    !binWidth ||
    !rateUnit ||
    dimensionOf(rateUnit) !== 'frequency' ||
    !Number.isSafeInteger(integerDivisor) ||
    integerDivisor < 1
  ) {
    return {
      ok: false,
      path: '/basis',
      message: 'binned-peak value-lattice verification requires a complete binned_count basis, a frequency unit, and a positive exact rate divisor.',
    };
  }

  const aggregate = mode === 'aggregates';
  if (!aggregate) {
    return {
      ok: false,
      path: '/audit/peakBinCounts',
      message: 'raw binned peaks require identified exact peakBinCounts and cannot use aggregate existential lattice verification.',
    };
  }
  const sampleCounts = aggregate && Array.isArray(sampleCountsValue)
    ? sampleCountsValue
    : undefined;
  if (aggregate && (!sampleCounts || sampleCounts.length !== values.length)) {
    return {
      ok: false,
      path: '/sampleCounts',
      message: 'aggregate binned-peak lattice verification requires one retained sample count per response value.',
    };
  }
  const estimator =
    estimatorValue === 'mean' ||
    estimatorValue === 'median' ||
    estimatorValue === 'trimmed_mean'
      ? estimatorValue
      : undefined;
  if (aggregate && !estimator) {
    return {
      ok: false,
      path: '/estimator',
      message: 'aggregate binned-peak lattice verification requires a recognized estimator.',
    };
  }

  let checkedValueCount = 0;
  let denominatorMinimum: number | null = null;
  let denominatorMaximum: number | null = null;
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value === null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return {
        ok: false,
        path: `/values/${index}`,
        message: 'a binned peak rate must be finite and non-negative before its exact count lattice can be checked.',
      };
    }

    let estimatorDenominator = 1;
    if (aggregate) {
      const retainedCount = sampleCounts![index];
      if (!Number.isSafeInteger(retainedCount) || (retainedCount as number) < 1) {
        return {
          ok: false,
          path: `/sampleCounts/${index}`,
          message: 'a defined aggregate binned peak requires a positive exact retained sample count.',
        };
      }
      estimatorDenominator =
        estimator === 'median'
          ? (retainedCount as number) % 2 === 0 ? 2 : 1
          : retainedCount as number;
    }

    if (!isRoundedAggregateCountRateInUnit(
      value,
      integerDivisor,
      estimatorDenominator,
      binWidth.value,
      binWidth.unit,
      rateUnit,
    )) {
      const estimatorDescription = aggregate
        ? estimator === 'median'
          ? `${(sampleCounts![index] as number) % 2 === 0 ? 'even' : 'odd'}-sample median`
          : `${estimator} over ${String(sampleCounts![index])} retained repeats`
        : 'raw repeat';
      return {
        ok: false,
        path: `/values/${index}`,
        message: `binned peak ${String(value)} ${rateUnit} cannot be the correctly rounded ${estimatorDescription} of exact non-negative safe-integer max-bin counts under divisor ${integerDivisor} and bin width ${binWidth.value} ${binWidth.unit}.`,
      };
    }

    checkedValueCount++;
    denominatorMinimum = denominatorMinimum === null
      ? estimatorDenominator
      : Math.min(denominatorMinimum, estimatorDenominator);
    denominatorMaximum = denominatorMaximum === null
      ? estimatorDenominator
      : Math.max(denominatorMaximum, estimatorDenominator);
  }

  return {
    ok: true,
    checkedValueCount,
    estimatorDenominatorMinimum: denominatorMinimum,
    estimatorDenominatorMaximum: denominatorMaximum,
  };
}
