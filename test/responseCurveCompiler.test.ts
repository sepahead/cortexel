import { readFileSync } from 'node:fs';
import path from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  deriveResponseCurve,
  exactResponseCurveMean,
  responseCurveEstimate,
} from '../src/analysis/index.js';
import { validateRequestValue } from '../src/core/request.js';
import { verifyPeakBasisAgainstWindow } from '../src/core/response-curve-basis.js';
import {
  deriveExactAggregateCountRateInUnit,
  deriveExactCountRateInUnit,
  isRoundedAggregateCountRateInUnit,
} from '../src/core/units.js';
import { buildFigure } from '../src/render/index.js';

function examples(): Record<string, any>[] {
  return (JSON.parse(readFileSync(
    path.resolve(import.meta.dirname, '../contract/skills/neuro.response_curve.v1.json'),
    'utf8',
  )) as { examples: { valid: Record<string, any>[] } }).examples.valid;
}

function built(request: Record<string, unknown>) {
  const result = buildFigure(request);
  if (!result.ok) {
    throw new Error(result.errors.map((error) => `${error.code}: ${error.message}`).join('\n'));
  }
  return result;
}

function aggregateRows(result: ReturnType<typeof built>) {
  return result.table.rows.filter((row) => row[4] === null);
}

function operation(result: ReturnType<typeof built>): any {
  return (result.artifact.derivation as any).operations[0];
}

function panelSummary(result: ReturnType<typeof built>): string {
  return result.plan.accessibility.panelSummaries.join(' ');
}

function singleEventScope(selectionId = 'test_single_train') {
  return {
    kind: 'single_train',
    selectionId,
    eventKind: 'spike',
    eventCompleteness: 'complete_for_selection_within_measurement_window',
    poolingOperator: 'identity_single_train',
  };
}

function pooledEventScope(recordedSenderCount: number, selectionId = 'test_sender_population') {
  return {
    kind: 'pooled_recorded_senders',
    selectionId,
    eventKind: 'spike',
    eventCompleteness: 'complete_for_selection_within_measurement_window',
    poolingOperator: 'superpose_selected_sender_trains',
    recordedSenderCount,
    membershipBinding: { kind: 'cardinality_only' },
  };
}

function expectNormalizationRefusal(
  request: Record<string, any>,
  instancePath: string,
  code = 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
): void {
  const validation = validateRequestValue(request);
  expect(validation.ok).toBe(false);
  if (!validation.ok) {
    expect(validation.errors).toContainEqual(expect.objectContaining({
      code,
      instancePath,
    }));
  }
  const rendered = buildFigure(request);
  expect(rendered.ok).toBe(false);
  if (!rendered.ok) {
    expect(rendered.errors).toContainEqual(expect.objectContaining({
      code,
      instancePath,
    }));
  }
}

function exactFloorBinary64ProductOracle(value: number, factor: number): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value, false);
  const bits = view.getBigUint64(0, false);
  const exponentBits = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  const significand = exponentBits === 0 ? fraction : (1n << 52n) + fraction;
  const binaryExponent = exponentBits === 0 ? -1074 : exponentBits - 1023 - 52;
  const numerator = significand * BigInt(factor);
  const integer = binaryExponent >= 0
    ? numerator << BigInt(binaryExponent)
    : numerator >> BigInt(-binaryExponent);
  return Number(integer);
}

describe('response-curve derivation and rendering', () => {
  it('publishes and enforces the revision-2 skill and renderer identities', () => {
    const contract = JSON.parse(readFileSync(
      path.resolve(import.meta.dirname, '../contract/skills/neuro.response_curve.v1.json'),
      'utf8',
    )) as { revision: number; renderer: { id: string; revision: number } };
    const rendererRegistry = JSON.parse(readFileSync(
      path.resolve(import.meta.dirname, '../contract/registries/renderers.v1.json'),
      'utf8',
    )) as { renderers: Array<{ id: string; revision: number }> };
    const registeredRenderer = rendererRegistry.renderers.find(
      (renderer) => renderer.id === contract.renderer.id,
    );

    expect(contract.revision).toBe(2);
    expect(contract.renderer).toEqual({ id: 'figure.response_curve', revision: 2 });
    expect(registeredRenderer?.revision).toBe(contract.renderer.revision);

    const unpinned = validateRequestValue(examples()[0]);
    expect(unpinned.ok).toBe(true);
    if (unpinned.ok) expect(unpinned.request.skillRevision).toBe(2);

    const pinnedCurrent = structuredClone(examples()[0]);
    pinnedCurrent.skill.revision = 2;
    expect(validateRequestValue(pinnedCurrent).ok).toBe(true);
    expect((built(pinnedCurrent).artifact.render as { rendererRevision: number }).rendererRevision)
      .toBe(2);

    const pinnedPrior = structuredClone(examples()[0]);
    pinnedPrior.skill.revision = 1;
    const refused = validateRequestValue(pinnedPrior);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.errors).toContainEqual(expect.objectContaining({
        code: 'CONTRACT_SKILL_REVISION_UNSUPPORTED',
        stage: 'identity',
        instancePath: '/skill/revision',
      }));
    }
  });

  it('renders every living valid example without a false empty state', () => {
    const valid = examples().map(built);
    expect(valid).toHaveLength(8);
    for (const result of valid) {
      expect(result.plan.panels[0].noData).toBeUndefined();
      expect(result.plan.panels[0].marks.some((mark) => mark.type === 'point')).toBe(true);
      expect(result.table.columns.map((column) => column.key)).toEqual([
        'conditionId',
        'conditionLabel',
        'input',
        'inputUnit',
        'repeatId',
        'response',
        'responseUnit',
        'responseMethod',
        'rateNormalization',
        'recordedSenderCount',
        'missing',
        'estimator',
        'sampleCount',
        'excludedCount',
        'responseBasis',
        'uncertaintyKind',
        'uncertaintyValue',
        'uncertaintyLower',
        'uncertaintyUpper',
        'uncertaintyBasis',
        'estimatorRole',
        'trimmedCount',
        'peakBinCount',
        'peakCountDerivationAlgorithm',
        'eventScopeKind',
        'eventSelectionId',
        'eventMembershipBinding',
        'selectedEventTrainCount',
      ]);
      expect(operation(result).algorithm).toBe(
        'cortexel.response_curve.exact_condition_estimator',
      );
    }

    expect(aggregateRows(valid[0]).map((row) => row[5])).toEqual([0, 13, 30]);
    expect(aggregateRows(valid[1]).map((row) => row[5])).toEqual([null, 42.5, 18.25]);
    expect(aggregateRows(valid[1]).map((row) => row[12])).toEqual([null, 8, 10]);
    expect(aggregateRows(valid[2]).map((row) => row[5])).toEqual([
      8.233333333333333,
      41.93333333333333,
      1.1,
    ]);
    expect(aggregateRows(valid[3]).map((row) => row[5])).toEqual([null, 59.875, 6.75]);
    expect(aggregateRows(valid[4]).map((row) => row[5])).toEqual([45, 120, 180, 60]);
    expect(aggregateRows(valid[5]).map((row) => row[5])).toEqual([
      0.3333333333333333,
      3.5,
    ]);
    expect(aggregateRows(valid[5]).map((row) => row[12])).toEqual([3, 2]);
    expect(aggregateRows(valid[5]).map((row) => row[21])).toEqual([2, 0]);
    expect(aggregateRows(valid[6]).map((row) => row[5])).toEqual([40, 80]);
    expect(aggregateRows(valid[7]).map((row) => row[5])).toEqual([
      deriveExactAggregateCountRateInUnit(2n, 1, 3, 100, 'ms', 'Hz'),
    ]);
    expect(aggregateRows(valid[6]).every((row) =>
      row[8] === 'total_event_rate' &&
      row[9] === 5 &&
      String(row[14]).includes('10 bins with exact physical exposure 100 ms verified for every emitted interval') &&
      String(row[14]).includes('[start,stop)')
    )).toBe(true);
    expect(operation(valid[6]).receipt).toMatchObject({
      rateNormalization: 'total_event_rate',
      declaredRecordedSenderCount: 5,
      rateIntegerDivisor: 1,
      peakBasisVerified: true,
      callerSuppliedPeakValue: true,
      peakValueRecomputed: false,
      peakBasisKind: 'binned_count',
      peakBasisMaterializedCount: 10,
      peakBasisUniformExposureVerified: true,
      peakBasisWidthOrStepInWindowUnit: 100,
      peakBasisWindowUnit: 'ms',
    });
    expect(operation(valid[7]).receipt).toMatchObject({
      submittedRowsMatchDeclaredAttemptedCounts: true,
      declaredPairedRepeatIdSetsEqual: null,
      peakBasisVerified: true,
      peakBinCountsSupplied: true,
      peakBinCountNullMaskVerified: true,
      rawBinnedPeakRatesRederived: true,
      conditionPeakEstimatorDerivedAtCountLevel: true,
      peakBinCountIntegerDivisor: 1,
      peakBinCountAlgorithm:
        'exact_peak_bin_count_to_condition_estimator_rate_one_round',
      peakBinCountEstimatorOrder:
        'exact_peak_bin_count_then_code_unit_repeat_id_then_source_ordinal',
      sumOfDefinedPeakBinCounts: '2',
      definedPeakBinCount: 3,
      undefinedPeakBinCount: 0,
      binnedPeakValueLatticeVerified: null,
      auditEventCountsSupplied: null,
    });
    expect(operation(valid[7]).parameters).toMatchObject({
      trimBoundaryTieOrder:
        'exact_peak_bin_count_then_code_unit_repeat_id_then_source_ordinal',
      peakCountDerivationAlgorithm:
        'exact_peak_bin_count_to_condition_estimator_rate_one_round',
    });
    expect(valid[7].table.rows.filter((row) => row[4] !== null).map((row) => row[22]))
      .toEqual([1, 0, 1]);
    expect(valid[7].table.rows.every((row) =>
      row[23] === 'exact_peak_bin_count_to_condition_estimator_rate_one_round'
    )).toBe(true);
    expect(valid[0].plan.accessibility.summary).toContain('Response ranges from 0 to 30 Hz.');
    expect(valid[0].plan.accessibility.summary).not.toContain('Response ranges from 0 to 31 Hz.');
    expect(valid[1].plan.accessibility.summary).toContain('Declared repeat design: paired.');
    expect(valid[1].plan.accessibility.summary).toContain('against Stimulus intensity');
    expect(operation(valid[0]).receipt).toMatchObject({
      submittedRowsMatchDeclaredAttemptedCounts: true,
      declaredPairedRepeatIdSetsEqual: null,
      peakBasisVerified: null,
      auditEventCountsSupplied: true,
      auditNullMaskVerified: true,
      auditRateNormalizationVerified: true,
      auditRateUnit: 'Hz',
      auditRateNormalization: 'mean_rate_per_recorded_sender',
      auditRecordedSenderCount: 1,
      auditIntegerDivisor: 1,
      auditNormalizationAlgorithm:
        'exact_integer_count_to_declared_rate_unit_one_round_equality',
      sumOfDefinedAuditedEventCounts: '86',
      definedAuditedEventCount: 6,
      undefinedAuditedEventCount: 0,
    });
    expect(operation(valid[1]).receipt).toMatchObject({
      submittedRowsMatchDeclaredAttemptedCounts: null,
      declaredPairedRepeatIdSetsEqual: null,
      peakBasisVerified: null,
      peakBinCountsSupplied: null,
      auditEventCountsSupplied: null,
    });
    expect(operation(valid[2]).receipt).toMatchObject({
      submittedRowsMatchDeclaredAttemptedCounts: true,
      declaredPairedRepeatIdSetsEqual: true,
    });
  });

  it('preserves gaps, uses declared axis semantics, and never connects nominal categories', () => {
    const valid = examples();
    const ordinal = built(valid[1]);
    const ordinalLine = ordinal.plan.panels[0].marks.find((mark) => mark.type === 'line');
    expect(ordinalLine).toMatchObject({
      type: 'line',
      subpaths: [expect.any(Array)],
    });
    if (ordinalLine?.type === 'line') expect(ordinalLine.subpaths[0]).toHaveLength(2);
    expect(ordinal.plan.panels[0].axes[0]).toMatchObject({ transform: 'band' });
    expect(ordinal.plan.panels[0].axes[0].ticks.map((tick) => tick.label)).toEqual([
      'Low',
      'Medium',
      'High',
    ]);

    const nominal = built(valid[2]);
    expect(nominal.plan.panels[0].marks.some((mark) => mark.type === 'line')).toBe(false);
    expect(nominal.plan.legend?.map((entry) => entry.label)).not.toContain(
      'Ordered-condition guide (not a fit or interpolation)',
    );

    const logarithmic = built(valid[3]);
    expect(logarithmic.plan.panels[0].axes[0].transform).toBe('log');
    const line = logarithmic.plan.panels[0].marks.find((mark) => mark.type === 'line');
    if (line?.type === 'line') expect(line.subpaths).toHaveLength(1);
  });

  it('keeps the non-negative response baseline visible without midpointing all-zero curves', () => {
    const narrowRequest = structuredClone(examples()[4]);
    narrowRequest.data.aggregates.response.values = [100, 101, 100, 101];
    const narrow = built(narrowRequest);
    const narrowPanel = narrow.plan.panels[0];
    const narrowAxis = narrowPanel.axes.find((axis) => axis.orientation === 'left');
    expect(narrowAxis?.ticks).toContainEqual(expect.objectContaining({ label: '0' }));
    const narrowPoints = narrowPanel.marks.find((mark) => mark.type === 'point');
    expect(narrowPoints?.type).toBe('point');
    if (narrowPoints?.type === 'point') {
      const ys = narrowPoints.points.map((point) => point.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(narrowPanel.height * 0.02);
    }

    const zeroRequest = structuredClone(examples()[4]);
    zeroRequest.data.aggregates.response.values = [0, 0, 0, 0];
    const zero = built(zeroRequest);
    const zeroPanel = zero.plan.panels[0];
    const zeroAxis = zeroPanel.axes.find((axis) => axis.orientation === 'left');
    const zeroTick = zeroAxis?.ticks.find((tick) => tick.label === '0');
    expect(zeroTick?.position).toBe(zeroPanel.y + zeroPanel.height);
    const zeroPoints = zeroPanel.marks.find((mark) => mark.type === 'point');
    expect(zeroPoints?.type).toBe('point');
    if (zeroPoints?.type === 'point') {
      expect(zeroPoints.points.every(
        (point) => point.y === zeroPanel.y + zeroPanel.height,
      )).toBe(true);
    }
  });

  it('does not claim rate or estimator derivation for an all-null raw peak-count audit', () => {
    const request = structuredClone(examples()[7]);
    request.data.observations.response.values = [null, null, null];
    request.data.observations.response.audit.peakBinCounts = [null, null, null];
    const result = built(request);
    const receipt = operation(result).receipt;

    expect(receipt).toMatchObject({
      peakBasisVerified: true,
      peakBinCountsSupplied: true,
      peakBinCountNullMaskVerified: true,
      callerSuppliedPeakValue: null,
      peakValueRecomputed: null,
      definedPeakValueCount: 0,
      undefinedPeakValueCount: 3,
      rawBinnedPeakRatesRederived: null,
      conditionPeakEstimatorDerivedAtCountLevel: null,
      peakBinCountAlgorithm: null,
      peakBinCountEstimatorOrder: null,
      sumOfDefinedPeakBinCounts: '0',
      definedPeakBinCount: 0,
      undefinedPeakBinCount: 3,
    });
    expect(operation(result).parameters).toMatchObject({
      peakCountDerivationAlgorithm: null,
      trimBoundaryTieOrder: null,
    });
    expect(result.table.rows.every((row) => row[23] === null)).toBe(true);
    expect(panelSummary(result)).toContain(
      'no repeat rate or condition estimator existed to re-derive',
    );
    expect(panelSummary(result)).not.toContain(
      'Cortexel re-derived every repeat rate',
    );
  });

  it('does not claim count-to-rate equality work for an all-null mean-rate audit', () => {
    const request = structuredClone(examples()[0]);
    request.data.observations.response.values = [null, null, null, null, null, null];
    request.data.observations.response.audit.eventCounts = [null, null, null, null, null, null];
    const receipt = operation(built(request)).receipt;

    expect(receipt).toMatchObject({
      auditEventCountsSupplied: true,
      auditNullMaskVerified: true,
      auditRateNormalizationVerified: null,
      auditNormalizationAlgorithm: null,
      sumOfDefinedAuditedEventCounts: '0',
      definedAuditedEventCount: 0,
      undefinedAuditedEventCount: 6,
    });
  });

  it('discloses aggregate-only evidence with filled, machine-derived accounting', () => {
    const ordinal = built(examples()[1]);
    const disclosure = ordinal.disclosures.find(
      (entry) => entry.id === 'AGGREGATE_WITHOUT_RAW_REPEATS',
    );
    expect(disclosure?.text).toContain(
      'median, n = 8-10 by condition where defined; 1 condition undefined',
    );
    expect(disclosure?.text).not.toMatch(/\{[^}]+\}/);
    expect(ordinal.disclosures.find((entry) => entry.id === 'MISSING_VALUES_PRESENT')?.text)
      .toContain('Missing observations: 12');

    const peak = built(examples()[4]);
    expect(peak.disclosures.find(
      (entry) => entry.id === 'AGGREGATE_WITHOUT_RAW_REPEATS',
    )?.text).toContain('mean, n = 10');
    expect(aggregateRows(peak).every((row) =>
      String(row[14]).includes('gaussian symmetric kernel, standard_deviation 5 ms') &&
      String(row[14]).includes('mean_rate_per_recorded_sender') &&
      String(row[14]).includes('sampled grid of 1000 points')
    )).toBe(true);
    expect(panelSummary(peak)).toContain(
      'Defined peak values were supplied by the caller; Cortexel verified basis consistency but did not rederive peaks',
    );
  });

  it('preserves exact declared basis numbers in the table and derivation identity', () => {
    const request = structuredClone(examples()[4]);
    request.data.measurementWindow.start = 0.123456789;
    request.data.measurementWindow.stop = 1000.123456789;
    request.data.aggregates.response.basis.bandwidth.value = 0.123456789;
    const result = built(request);
    expect(aggregateRows(result).every((row) =>
      String(row[14]).includes('standard_deviation 0.123456789 ms')
    )).toBe(true);
    expect(panelSummary(result)).toContain(
      'Measurement window [start,stop) 0.123456789 to 1000.123456789 ms.',
    );

    const changed = structuredClone(request);
    changed.data.aggregates.response.basis.bandwidth.value = 0.123456788;
    const changedResult = built(changed);
    expect(operation(changedResult).outputDigest).not.toBe(operation(result).outputDigest);
  });

  it('makes rate scope and its exact divisor visible and digest-bound', () => {
    const perSender = built(structuredClone(examples()[0]));
    expect(aggregateRows(perSender).every((row) =>
      row[8] === 'mean_rate_per_recorded_sender' && row[9] === 1
    )).toBe(true);
    expect(perSender.plan.panels[0].axes[1].label).toContain('mean per sender, 1 sender');
    expect(perSender.plan.accessibility.summary).toContain(
      'mean_rate_per_recorded_sender (pooled total divided by 1 recorded sender)',
    );
    expect(operation(perSender).receipt).toMatchObject({
      rateNormalization: 'mean_rate_per_recorded_sender',
      declaredRecordedSenderCount: 1,
      rateIntegerDivisor: 1,
    });

    const singleRequest = structuredClone(examples()[0]);
    singleRequest.data.observations.response.rateNormalization = 'single_train_rate';
    singleRequest.data.eventScope = singleEventScope();
    const single = built(singleRequest);
    expect(aggregateRows(single).every((row) =>
      row[8] === 'single_train_rate' && row[9] === null && row[27] === 1
    )).toBe(true);
    expect(single.plan.panels[0].axes[1].label).toContain('single train');

    const totalRequest = structuredClone(examples()[0]);
    totalRequest.data.observations.response.rateNormalization = 'total_event_rate';
    totalRequest.data.eventScope = pooledEventScope(7);
    const total = built(totalRequest);
    expect(aggregateRows(total).every((row) =>
      row[8] === 'total_event_rate' && row[9] === 7
    )).toBe(true);
    expect(total.plan.panels[0].axes[1].label).toContain('pooled total, 7 senders');
    expect(operation(total).receipt).toMatchObject({
      eventScopeVariantRecognized: true,
      eventScopeSelectionIdStructurallyValid: true,
      eventKindAndCompletenessLiteralsValidated: true,
      eventPoolingLiteralMatchesVariant: true,
      declaredEventScopeKind: 'pooled_recorded_senders',
      declaredEventSelectionId: 'test_sender_population',
      declaredEventPoolingOperator: 'superpose_selected_sender_trains',
      declaredEventMembershipBinding: 'cardinality_only',
      structurallyDerivedSelectedEventTrainCount: 7,
      rateNormalization: 'total_event_rate',
      declaredRecordedSenderCount: 7,
      rateIntegerDivisor: 1,
      externalEventScopeClaimsVerification: 'not_performed_source_unavailable',
      externalMemberIdentifierReferentsVerification: 'not_performed_source_unavailable',
    });
    expect(operation(total).inputDigest).not.toBe(operation(single).inputDigest);
    expect(operation(total).outputDigest).not.toBe(operation(single).outputDigest);

    const totalWithoutUniverse = structuredClone(totalRequest);
    delete totalWithoutUniverse.data.eventScope.recordedSenderCount;
    let result = validateRequestValue(totalWithoutUniverse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
        instancePath: '/data/eventScope/recordedSenderCount',
      }));
    }

    const singleWithUniverse = structuredClone(singleRequest);
    singleWithUniverse.data.eventScope.recordedSenderCount = 1;
    result = validateRequestValue(singleWithUniverse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
        instancePath: '/data/eventScope/recordedSenderCount',
      }));
    }

    const perSenderWithoutUniverse = structuredClone(examples()[0]);
    delete perSenderWithoutUniverse.data.eventScope.recordedSenderCount;
    result = validateRequestValue(perSenderWithoutUniverse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
        instancePath: '/data/eventScope/recordedSenderCount',
      }));
    }
  });

  it('binds event selection and pooling for counts and latencies, including mandatory membership limits', () => {
    const singleCountRequest = structuredClone(examples()[5]);
    singleCountRequest.data.eventScope.selectionId = 'shared_numeric_counterexample';
    const pooledCountRequest = structuredClone(singleCountRequest);
    pooledCountRequest.data.eventScope = pooledEventScope(7, 'shared_numeric_counterexample');

    const singleCount = built(singleCountRequest);
    const pooledCount = built(pooledCountRequest);
    expect(aggregateRows(singleCount).map((row) => row[5])).toEqual(
      aggregateRows(pooledCount).map((row) => row[5]),
    );
    expect(operation(singleCount).inputDigest).not.toBe(operation(pooledCount).inputDigest);
    expect(operation(singleCount).outputDigest).not.toBe(operation(pooledCount).outputDigest);
    expect(operation(singleCount).receipt).toMatchObject({
      eventScopeVariantRecognized: true,
      declaredEventScopeKind: 'single_train',
      declaredEventSelectionId: 'shared_numeric_counterexample',
      declaredRecordedSenderCount: null,
      structurallyDerivedSelectedEventTrainCount: 1,
      declaredEventMembershipBinding: 'single_train_selection_rule',
      externalEventScopeClaimsVerification: 'not_performed_source_unavailable',
    });
    expect(operation(pooledCount).receipt).toMatchObject({
      eventScopeVariantRecognized: true,
      declaredEventScopeKind: 'pooled_recorded_senders',
      declaredEventSelectionId: 'shared_numeric_counterexample',
      declaredRecordedSenderCount: 7,
      structurallyDerivedSelectedEventTrainCount: 7,
      declaredEventMembershipBinding: 'cardinality_only',
    });
    expect(pooledCount.disclosures.map((disclosure) => disclosure.id)).toContain(
      'EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY',
    );
    expect(singleCount.disclosures.map((disclosure) => disclosure.id)).not.toContain(
      'EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY',
    );
    for (const result of [singleCount, pooledCount]) {
      expect(result.disclosures.map((disclosure) => disclosure.id)).toContain(
        'EVENT_SCOPE_EXTERNAL_AUTHORITY_UNVERIFIED',
      );
    }
    expect(singleCount.plan.panels[0].axes[1].label).toContain(
      'declared selection shared_numeric_counterexample; count in one selected train',
    );
    expect(pooledCount.plan.panels[0].axes[1].label).toContain(
      'pooled total count over 7 declared sender trains',
    );
    expect(pooledCount.plan.accessibility.summary).toContain(
      'cardinality_only (member identities not bound)',
    );
    expect(pooledCount.table.rows.every((row) =>
      row[24] === 'pooled_recorded_senders' &&
      row[25] === 'shared_numeric_counterexample' &&
      String(row[26]).includes('cardinality_only')
    )).toBe(true);

    const singleLatencyRequest = structuredClone(examples()[1]);
    singleLatencyRequest.data.eventScope.selectionId = 'shared_latency_counterexample';
    const pooledLatencyRequest = structuredClone(singleLatencyRequest);
    pooledLatencyRequest.data.eventScope = pooledEventScope(3, 'shared_latency_counterexample');
    const singleLatency = built(singleLatencyRequest);
    const pooledLatency = built(pooledLatencyRequest);
    expect(aggregateRows(singleLatency).map((row) => row[5])).toEqual(
      aggregateRows(pooledLatency).map((row) => row[5]),
    );
    expect(operation(singleLatency).outputDigest).not.toBe(operation(pooledLatency).outputDigest);
    expect(singleLatency.plan.panels[0].axes[1].label).toContain(
      'first event in one selected train',
    );
    expect(pooledLatency.plan.panels[0].axes[1].label).toContain(
      'minimum first-event latency over pooled union of 3 declared sender trains',
    );
    expect(pooledLatency.plan.accessibility.summary).toContain(
      'minimum over the superposed union',
    );

    const explicit = structuredClone(pooledCountRequest);
    explicit.data.eventScope.membershipBinding = {
      kind: 'explicit_sender_ids',
      senderIds: ['n3', 'n1', 'n2', 'n4', 'n5', 'n6', 'n7'],
    };
    const explicitResult = built(explicit);
    expect(explicitResult.disclosures.map((disclosure) => disclosure.id)).not.toContain(
      'EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY',
    );
    expect(String(explicitResult.table.rows[0][26])).toMatch(
      /^explicit_sender_ids \(7 unique ids; cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1; canonical membership digest sha256:fdb6b814de98ab8daa241acb8895573a50c4ff7e6864cef64c80b023054b29ce\)$/u,
    );
    expect(operation(explicitResult).receipt).toMatchObject({
      declaredMembershipCanonicalizationId:
        'cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1',
      derivedExplicitMembershipDigest:
        'sha256:fdb6b814de98ab8daa241acb8895573a50c4ff7e6864cef64c80b023054b29ce',
      explicitMemberIdentifiersUniqueVerified: true,
      explicitMemberIdentifierCountMatchVerified: true,
      explicitMemberIdentifierOrderNormalizedForSemanticDigest: true,
    });

    const permuted = structuredClone(explicit);
    permuted.data.eventScope.membershipBinding.senderIds =
      ['n7', 'n5', 'n3', 'n1', 'n6', 'n4', 'n2'];
    const permutedResult = built(permuted);
    expect(permutedResult.plan.sourceRequestDigest).not.toBe(explicitResult.plan.sourceRequestDigest);
    expect(operation(permutedResult).inputDigest).toBe(operation(explicitResult).inputDigest);
    expect(operation(permutedResult).outputDigest).toBe(operation(explicitResult).outputDigest);
    expect(operation(permutedResult).receipt.eventScopeDigest).toBe(
      operation(explicitResult).receipt.eventScopeDigest,
    );

    const changedMembership = structuredClone(explicit);
    changedMembership.data.eventScope.membershipBinding.senderIds[6] = 'n8';
    const changedMembershipResult = built(changedMembership);
    expect(operation(changedMembershipResult).inputDigest).not.toBe(operation(explicitResult).inputDigest);
    expect(operation(changedMembershipResult).outputDigest).not.toBe(operation(explicitResult).outputDigest);

    const canonical = structuredClone(pooledCountRequest);
    canonical.data.eventScope.membershipBinding = {
      kind: 'canonical_sender_ids_digest',
      algorithm: 'sha256',
      canonicalization: 'cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1',
      digest: 'sha256:fdb6b814de98ab8daa241acb8895573a50c4ff7e6864cef64c80b023054b29ce',
    };
    const canonicalResult = built(canonical);
    expect(operation(canonicalResult).receipt).toMatchObject({
      canonicalMembershipDigestSyntaxAndCanonicalizationVerified: true,
      canonicalMembershipPreimageMatchVerification: 'not_evaluable_preimage_unavailable',
      canonicalMembershipPreimageCardinalityVerification: 'not_evaluable_preimage_unavailable',
    });

    const cardinalityOne = structuredClone(pooledCountRequest);
    cardinalityOne.data.eventScope = pooledEventScope(1, 'one_sender_without_identity');
    const cardinalityOneResult = built(cardinalityOne);
    expect(cardinalityOneResult.disclosures.map((disclosure) => disclosure.id)).toContain(
      'EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY',
    );

    const duplicate = structuredClone(explicit);
    duplicate.data.eventScope.membershipBinding.senderIds[6] = 'n1';
    expectNormalizationRefusal(
      duplicate,
      '/data/eventScope/membershipBinding/senderIds/6',
      'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
    );

    const wrongLength = structuredClone(explicit);
    wrongLength.data.eventScope.membershipBinding.senderIds.pop();
    expectNormalizationRefusal(
      wrongLength,
      '/data/eventScope/membershipBinding/senderIds',
      'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
    );
  });

  it('uses rateNormalization—not unit spelling—to select the audited integer divisor', () => {
    const perSender = structuredClone(examples()[0]);
    perSender.data.eventScope = pooledEventScope(2);
    perSender.data.observations.response.values =
      perSender.data.observations.response.audit.eventCounts.map(
        (count: number | null) => count === null ? null : count / 2,
      );
    expect(validateRequestValue(perSender).ok).toBe(true);
    expect(buildFigure(perSender).ok).toBe(true);

    const wrongTotal = structuredClone(perSender);
    wrongTotal.data.observations.response.rateNormalization = 'total_event_rate';
    let result = validateRequestValue(wrongTotal);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/observations/response/values/2',
      }));
    }

    const total = structuredClone(examples()[0]);
    total.data.eventScope = pooledEventScope(2);
    total.data.observations.response.rateNormalization = 'total_event_rate';
    total.data.observations.response.values = total.data.observations.response.audit.eventCounts;
    expect(validateRequestValue(total).ok).toBe(true);
    expect(buildFigure(total).ok).toBe(true);
  });

  it('binds binned peak geometry to exact physical exposure, not tolerant nominal tiling', () => {
    const request = structuredClone(examples()[4]);
    request.data.aggregates.response.basis = {
      estimator: 'binned_count',
      binWidth: { kind: 'duration', unit: 's', value: 0.25 },
      binCount: 4,
      origin: 'measurement_window_start',
      boundary: '[start,stop)',
      tilingPolicy: 'cortexel_binary64_uniform_exposure_bins_v1',
      partialBinPolicy: 'refuse',
    };
    const builtRequest = built(request);
    expect(aggregateRows(builtRequest).every((row) =>
      String(row[14]).includes('4 bins with exact physical exposure 0.25 s verified for every emitted interval') &&
      String(row[14]).includes('cortexel_binary64_uniform_exposure_bins_v1')
    )).toBe(true);
    expect(operation(builtRequest).receipt).toMatchObject({
      peakBasisVerified: true,
      callerSuppliedPeakValue: true,
      peakValueRecomputed: false,
      peakBasisKind: 'binned_count',
      peakBasisMaterializedCount: 4,
      peakBasisWidthOrStepInWindowUnit: 250,
      peakBasisWindowUnit: 'ms',
    });

    const wrongCount = structuredClone(request);
    wrongCount.data.aggregates.response.basis.binCount = 3;
    let result = validateRequestValue(wrongCount);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/response/basis/binCount',
      }));
    }
    expect(buildFigure(wrongCount).ok).toBe(false);

    const partial = structuredClone(request);
    partial.data.aggregates.response.basis.binWidth.value = 0.3;
    result = validateRequestValue(partial);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/response/basis/binWidth',
      }));
    }

    const closed = structuredClone(request);
    closed.data.measurementWindow.boundary = '[start,stop]';
    result = validateRequestValue(closed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/response/basis/boundary',
      }));
    }

    const decimalIntentWindow = {
      start: 0,
      stop: 0.3,
      unit: 's',
      boundary: '[start,stop)',
    };
    const decimalIntentBasis = {
      estimator: 'binned_count',
      binWidth: {
        kind: 'duration',
        unit: 's',
        value: 0.1,
      },
      binCount: 3,
      origin: 'measurement_window_start',
      boundary: '[start,stop)',
      tilingPolicy: 'cortexel_binary64_uniform_exposure_bins_v1',
      partialBinPolicy: 'refuse',
    };
    const decimalIntent = verifyPeakBasisAgainstWindow(decimalIntentBasis, decimalIntentWindow);
    expect(decimalIntent).toMatchObject({ ok: false, path: '/basis/binWidth' });
    if (!decimalIntent.ok) expect(decimalIntent.message).toContain('exact physical exposure');

    const toleranceSliver = verifyPeakBasisAgainstWindow(
      { ...decimalIntentBasis, binWidth: { kind: 'duration', unit: 's', value: 1 }, binCount: 1 },
      { ...decimalIntentWindow, stop: 1 + 8 * Number.EPSILON },
    );
    expect(toleranceSliver).toMatchObject({ ok: false, path: '/basis/binWidth' });

    const crossUnitDecimal = verifyPeakBasisAgainstWindow(
      { ...decimalIntentBasis, binWidth: { kind: 'duration', unit: 'ms', value: 100 } },
      decimalIntentWindow,
    );
    expect(crossUnitDecimal).toMatchObject({ ok: false, path: '/basis/binWidth' });

    expect(verifyPeakBasisAgainstWindow(
      { ...decimalIntentBasis, binWidth: { kind: 'duration', unit: 'ms', value: 100 } },
      { ...decimalIntentWindow, stop: 300, unit: 'ms' },
    )).toMatchObject({
      ok: true,
      kind: 'binned_count',
      materializedCount: 3,
      widthInWindowUnit: 100,
      uniformExposureVerified: true,
    });
  });

  it('re-derives every raw binned peak from identified exact counts across units and sender divisors', () => {
    const request = structuredClone(examples()[0]);
    request.data.eventScope = pooledEventScope(5);
    request.data.observations.response = {
      method: 'peak_firing_rate',
      kind: 'firing_rate',
      unit: 'kHz',
      rateNormalization: 'mean_rate_per_recorded_sender',
      values: [0, 0.002, 0.004, 0.006, 0.008, 0.01],
      audit: {
        peakBinCounts: [0, 1, 2, 3, 4, 5],
      },
      basis: {
        estimator: 'binned_count',
        binWidth: { kind: 'duration', unit: 'ms', value: 100 },
        binCount: 10,
        origin: 'measurement_window_start',
        boundary: '[start,stop)',
        tilingPolicy: 'cortexel_binary64_uniform_exposure_bins_v1',
        partialBinPolicy: 'refuse',
      },
    };
    request.parameters.responseMethod = 'peak_firing_rate';

    expect(validateRequestValue(request).ok).toBe(true);
    const rendered = built(request);
    expect(operation(rendered).receipt).toMatchObject({
      rateIntegerDivisor: 5,
      binnedPeakValueLatticeVerified: null,
      peakBinCountsSupplied: true,
      rawBinnedPeakRatesRederived: true,
      conditionPeakEstimatorDerivedAtCountLevel: true,
      peakBinCountIntegerDivisor: 5,
      sumOfDefinedPeakBinCounts: '15',
      definedPeakBinCount: 6,
      undefinedPeakBinCount: 0,
    });

    const mixed = structuredClone(request);
    mixed.data.observations.response.values[0] = null;
    mixed.data.observations.response.audit.peakBinCounts[0] = null;
    const mixedRendered = built(mixed);
    const mixedRawRows = mixedRendered.table.rows.filter((row) => row[4] !== null);
    expect(mixedRawRows[0][5]).toBeNull();
    expect(mixedRawRows[0][23]).toBeNull();
    expect(mixedRawRows.slice(1).every(
      (row) => row[23] === 'exact_peak_bin_count_to_condition_estimator_rate_one_round',
    )).toBe(true);
    expect(aggregateRows(mixedRendered).every(
      (row) => row[5] === null ||
        row[23] === 'exact_peak_bin_count_to_condition_estimator_rate_one_round',
    )).toBe(true);
    expect(panelSummary(mixedRendered)).toContain(
      're-derived every defined repeat rate and formed each defined condition estimator',
    );

    const betweenCountLevels = structuredClone(request);
    betweenCountLevels.data.observations.response.values[1] = 0.003;
    expectNormalizationRefusal(
      betweenCountLevels,
      '/data/observations/response/values/1',
    );

    const missingAudit = structuredClone(request);
    delete missingAudit.data.observations.response.audit;
    const missingValidation = validateRequestValue(missingAudit);
    expect(missingValidation.ok).toBe(false);
    if (!missingValidation.ok) {
      expect(missingValidation.errors.map((error) => error.code)).toContain(
        'SCHEMA_REQUIRED_PROPERTY_MISSING',
      );
    }

    const mismatchedMask = structuredClone(request);
    mismatchedMask.data.observations.response.audit.peakBinCounts[0] = null;
    expectNormalizationRefusal(
      mismatchedMask,
      '/data/observations/response/audit/peakBinCounts/0',
    );

    const unsafeCount = structuredClone(request);
    unsafeCount.data.observations.response.audit.peakBinCounts[0] =
      Number.MAX_SAFE_INTEGER + 1;
    const unsafeValidation = validateRequestValue(unsafeCount);
    expect(unsafeValidation.ok).toBe(false);
    if (!unsafeValidation.ok) {
      expect(unsafeValidation.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_COUNT_NOT_INTEGER',
        instancePath: '/data/observations/response/audit/peakBinCounts/0',
      }));
    }
  });

  it('derives raw and aggregate binned means from the same count rational with one final rounding', () => {
    const rawRequest = structuredClone(examples()[7]);
    rawRequest.data.measurementWindow.stop = 9;
    rawRequest.data.observations.response.basis.binWidth.value = 3;
    const oneCountRate = deriveExactCountRateInUnit(1, 1, 0, 3, 'ms', 'Hz');
    rawRequest.data.observations.response.values = [oneCountRate, 0, oneCountRate];
    const directCountMean = deriveExactAggregateCountRateInUnit(
      2n,
      1,
      3,
      3,
      'ms',
      'Hz',
    );
    const meanOfRoundedRates = exactResponseCurveMean([oneCountRate, 0, oneCountRate]);
    expect(directCountMean).not.toBe(meanOfRoundedRates);

    const raw = built(rawRequest);
    expect(aggregateRows(raw).map((row) => row[5])).toEqual([directCountMean]);

    const aggregateRequest = structuredClone(rawRequest);
    aggregateRequest.data.mode = 'aggregates';
    delete aggregateRequest.data.observations;
    aggregateRequest.data.aggregates = {
      response: {
        method: 'peak_firing_rate',
        kind: 'firing_rate',
        unit: 'Hz',
        rateNormalization: 'single_train_rate',
        values: [directCountMean],
        basis: {
          estimator: 'binned_count',
          binWidth: { kind: 'duration', unit: 'ms', value: 3 },
          binCount: 3,
          origin: 'measurement_window_start',
          boundary: '[start,stop)',
          tilingPolicy: 'cortexel_binary64_uniform_exposure_bins_v1',
          partialBinPolicy: 'refuse',
        },
      },
      sampleCounts: [3],
      excludedCounts: [0],
    };
    const aggregate = built(aggregateRequest);
    expect(aggregateRows(aggregate).map((row) => row[5])).toEqual([directCountMean]);
    expect(operation(aggregate).receipt).toMatchObject({
      submittedRowsMatchDeclaredAttemptedCounts: null,
      declaredPairedRepeatIdSetsEqual: null,
      peakBinCountsSupplied: null,
      binnedPeakValueLatticeVerified: true,
    });
    expect(operation(raw).outputDigest).not.toBe(operation(aggregate).outputDigest);
  });

  it('uses exact peak-bin counts for raw median selection and trimmed-tail membership', () => {
    const request = structuredClone(examples()[7]);
    request.data.measurementWindow.stop = 500;
    request.data.observations.attemptedCounts = [5];
    request.data.observations.conditionIds = Array(5).fill('drive');
    request.data.observations.repeatIds = ['r1', 'r2', 'r3', 'r4', 'r5'];
    request.data.observations.response.basis.binCount = 5;
    request.data.observations.response.audit.peakBinCounts = [0, 1, 2, 100, 101];
    request.data.observations.response.values = [0, 10, 20, 1000, 1010];

    const medianRequest = structuredClone(request);
    medianRequest.parameters.estimator = 'median';
    const median = built(medianRequest);
    expect(aggregateRows(median).map((row) => row[5])).toEqual([
      deriveExactAggregateCountRateInUnit(2n, 1, 1, 100, 'ms', 'Hz'),
    ]);

    const evenMedianRequest = structuredClone(request);
    evenMedianRequest.parameters.estimator = 'median';
    evenMedianRequest.data.measurementWindow.stop = 400;
    evenMedianRequest.data.observations.attemptedCounts = [4];
    evenMedianRequest.data.observations.conditionIds =
      evenMedianRequest.data.observations.conditionIds.slice(0, 4);
    evenMedianRequest.data.observations.repeatIds =
      evenMedianRequest.data.observations.repeatIds.slice(0, 4);
    evenMedianRequest.data.observations.response.values =
      evenMedianRequest.data.observations.response.values.slice(0, 4);
    evenMedianRequest.data.observations.response.audit.peakBinCounts =
      evenMedianRequest.data.observations.response.audit.peakBinCounts.slice(0, 4);
    evenMedianRequest.data.observations.response.basis.binCount = 4;
    const evenMedian = built(evenMedianRequest);
    expect(aggregateRows(evenMedian).map((row) => row[5])).toEqual([
      deriveExactAggregateCountRateInUnit(3n, 1, 2, 100, 'ms', 'Hz'),
    ]);

    const trimmedRequest = structuredClone(request);
    trimmedRequest.parameters.estimator = 'trimmed_mean';
    trimmedRequest.parameters.trimFraction = 0.2;
    const trimmed = built(trimmedRequest);
    expect(aggregateRows(trimmed).map((row) => row[5])).toEqual([
      deriveExactAggregateCountRateInUnit(103n, 1, 3, 100, 'ms', 'Hz'),
    ]);
    expect(trimmed.table.rows.filter((row) => row[4] !== null).map((row) => [
      row[22],
      row[20],
    ])).toEqual([
      [0, 'trimmed_low'],
      [1, 'retained'],
      [2, 'retained'],
      [100, 'retained'],
      [101, 'trimmed_high'],
    ]);
  });

  it('proves aggregate binned-peak means and trimmed means against their effective-n count lattice', () => {
    const meanRequest = structuredClone(examples()[6]);
    expect(validateRequestValue(meanRequest).ok).toBe(true);
    expect(operation(built(meanRequest)).receipt).toMatchObject({
      binnedPeakValueLatticeVerified: true,
      binnedPeakValueLatticeCheckedValueCount: 2,
      binnedPeakValueLatticeEstimatorDenominatorMinimum: 3,
      binnedPeakValueLatticeEstimatorDenominatorMaximum: 3,
    });

    const allNull = structuredClone(meanRequest);
    allNull.data.aggregates.response.values = [null, null];
    allNull.data.aggregates.sampleCounts = [null, null];
    allNull.data.aggregates.excludedCounts = [0, 0];
    const allNullResult = built(allNull);
    expect(operation(allNullResult).receipt).toMatchObject({
      callerSuppliedPeakValue: null,
      peakValueRecomputed: null,
      definedPeakValueCount: 0,
      undefinedPeakValueCount: 2,
      binnedPeakValueLatticeVerified: null,
      binnedPeakValueLatticeCheckedValueCount: 0,
      binnedPeakValueLatticeEstimatorDenominatorMinimum: null,
      binnedPeakValueLatticeEstimatorDenominatorMaximum: null,
      binnedPeakValueLatticeAlgorithm: null,
    });

    const impossibleMean = structuredClone(meanRequest);
    impossibleMean.data.aggregates.response.values[0] = 45;
    expectNormalizationRefusal(
      impossibleMean,
      '/data/aggregates/response/values/0',
    );

    const trimmedRequest = structuredClone(meanRequest);
    trimmedRequest.parameters.estimator = 'trimmed_mean';
    trimmedRequest.parameters.trimFraction = 0.2;
    trimmedRequest.data.aggregates.trimmedCounts = [2, 2];
    expect(validateRequestValue(trimmedRequest).ok).toBe(true);
    expect(operation(built(trimmedRequest)).receipt).toMatchObject({
      binnedPeakValueLatticeVerified: true,
      binnedPeakValueLatticeCheckedValueCount: 2,
      binnedPeakValueLatticeEstimatorDenominatorMinimum: 3,
      binnedPeakValueLatticeEstimatorDenominatorMaximum: 3,
    });

    const impossibleTrimmedMean = structuredClone(trimmedRequest);
    impossibleTrimmedMean.data.aggregates.response.values[1] = 45;
    expectNormalizationRefusal(
      impossibleTrimmedMean,
      '/data/aggregates/response/values/1',
    );
  });

  it('uses the raw-count lattice for odd medians and the exact half-sum lattice for even medians', () => {
    const request = structuredClone(examples()[6]);
    request.parameters.estimator = 'median';
    request.data.aggregates.sampleCounts = [3, 4];
    request.data.aggregates.response.values = [40, 45];

    expect(validateRequestValue(request).ok).toBe(true);
    expect(operation(built(request)).receipt).toMatchObject({
      binnedPeakValueLatticeVerified: true,
      binnedPeakValueLatticeCheckedValueCount: 2,
      binnedPeakValueLatticeEstimatorDenominatorMinimum: 1,
      binnedPeakValueLatticeEstimatorDenominatorMaximum: 2,
    });

    const impossibleOddMedian = structuredClone(request);
    impossibleOddMedian.data.aggregates.response.values[0] = 45;
    expectNormalizationRefusal(
      impossibleOddMedian,
      '/data/aggregates/response/values/0',
    );

    const impossibleEvenMedian = structuredClone(request);
    impossibleEvenMedian.data.aggregates.response.values[1] = 42;
    expectNormalizationRefusal(
      impossibleEvenMedian,
      '/data/aggregates/response/values/1',
    );
  });

  it('keeps the exact safe-count boundary when its rounded inverse center lies above the domain', () => {
    const binWidthMs = 0.014416046999394893;
    const maximumRate = deriveExactCountRateInUnit(
      Number.MAX_SAFE_INTEGER,
      3,
      0,
      binWidthMs,
      'ms',
      'Hz',
    );
    expect(isRoundedAggregateCountRateInUnit(
      maximumRate,
      3,
      3,
      binWidthMs,
      'ms',
      'Hz',
    )).toBe(true);

    const aboveMaximum = maximumRate + Math.abs(maximumRate) * Number.EPSILON;
    expect(aboveMaximum).toBeGreaterThan(maximumRate);
    expect(isRoundedAggregateCountRateInUnit(
      aboveMaximum,
      3,
      3,
      binWidthMs,
      'ms',
      'Hz',
    )).toBe(false);
  });

  it('refuses kernel identities, support, edge correction, and grids that are not mathematical authority', () => {
    const request = structuredClone(examples()[4]);

    const causalGaussian = structuredClone(request);
    causalGaussian.data.aggregates.response.basis.kernelForm = 'causal_past';
    let result = validateRequestValue(causalGaussian);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/response/basis',
      }));
    }

    const wrongGridCount = structuredClone(request);
    wrongGridCount.data.aggregates.response.basis.evaluation.sampleCount = 999;
    result = validateRequestValue(wrongGridCount);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/response/basis/evaluation/sampleCount',
      }));
    }

    const causalRenormalization = structuredClone(request);
    causalRenormalization.data.aggregates.response.basis = {
      estimator: 'kernel',
      shape: 'exponential',
      kernelForm: 'causal_past',
      bandwidthDefinition: 'time_constant',
      bandwidth: { kind: 'duration', unit: 'ms', value: 5 },
      support: {
        kind: 'finite_cutoff',
        geometry: 'past_horizon',
        cutoff: { kind: 'duration', unit: 'ms', value: 25 },
        cutoffBoundary: 'inclusive',
        tailPolicy: 'renormalize_to_unit_integral',
      },
      normalization: 'unit_integral_on_declared_support',
      evaluationOperator: 'direct_kernel_sum',
      edgePolicy: 'renormalize_evaluation_mass',
      evaluation: {
        mode: 'continuous_supremum',
        domain: 'measurement_window',
        boundary: '[start,stop)',
      },
    };
    result = validateRequestValue(causalRenormalization);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/response/basis/edgePolicy',
      }));
    }

    causalRenormalization.data.aggregates.response.basis.edgePolicy = 'none';
    expect(validateRequestValue(causalRenormalization).ok).toBe(true);
    const causal = built(causalRenormalization);
    expect(operation(causal).receipt).toMatchObject({
      peakBasisVerified: true,
      callerSuppliedPeakValue: true,
      peakValueRecomputed: false,
      peakBasisKind: 'kernel_continuous',
      peakBasisMaterializedCount: null,
    });

    const laplace = structuredClone(causalRenormalization);
    laplace.data.aggregates.response.basis.shape = 'laplace';
    laplace.data.aggregates.response.basis.kernelForm = 'symmetric_laplace';
    laplace.data.aggregates.response.basis.support.geometry = 'symmetric_radius';
    laplace.data.aggregates.response.basis.edgePolicy = 'renormalize_evaluation_mass';
    expect(validateRequestValue(laplace).ok).toBe(true);
    expect(buildFigure(laplace).ok).toBe(true);

    const mislabeledLaplace = structuredClone(laplace);
    mislabeledLaplace.data.aggregates.response.basis.shape = 'exponential';
    result = validateRequestValue(mislabeledLaplace);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/response/basis',
      }));
    }

    const wrongBoundary = structuredClone(request);
    wrongBoundary.data.aggregates.response.basis.evaluation = {
      mode: 'continuous_supremum',
      domain: 'measurement_window',
      boundary: '[start,stop]',
    };
    result = validateRequestValue(wrongBoundary);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/response/basis/evaluation/boundary',
      }));
    }
  });

  it('accounts for every trimmed raw observation and reports effective retained n', () => {
    const request = structuredClone(examples()[3]);
    request.data.conditions = {
      axis: 'ordinal',
      ids: ['only'],
      labels: ['Only'],
      inputLabel: 'Condition',
    };
    request.data.observations.attemptedCounts = [5];
    request.data.observations.conditionIds = Array.from({ length: 5 }, () => 'only');
    request.data.observations.repeatIds = ['r1', 'r2', 'r3', 'r4', 'r5'];
    request.data.observations.response = {
      method: 'event_count',
      kind: 'count',
      unit: '1',
      values: [0, 1, 2, 3, 100],
    };
    request.parameters.responseMethod = 'event_count';
    request.parameters.trimFraction = 0.2;
    const result = built(request);
    const rows = result.table.rows;
    expect(rows.slice(0, 5).map((row) => row[20])).toEqual([
      'trimmed_low',
      'retained',
      'retained',
      'retained',
      'trimmed_high',
    ]);
    expect(aggregateRows(result)[0][12]).toBe(3);
    expect(aggregateRows(result)[0][21]).toBe(2);
    expect(operation(result).receipt).toMatchObject({
      attemptedCount: 5,
      retainedCount: 3,
      trimmedCount: 2,
      excludedCount: 0,
    });
    expect(result.plan.accessibility.summary).toContain(
      '2 defined responses were removed symmetrically by trimming',
    );
  });

  it('validates aggregate trimmed-count authority and exact-floor boundaries', () => {
    expect(validateRequestValue(examples()[5]).ok).toBe(true);
    expect(buildFigure(examples()[5]).ok).toBe(true);

    const missing = structuredClone(examples()[5]);
    delete missing.data.aggregates.trimmedCounts;
    let validation = validateRequestValue(missing);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/trimmedCounts',
      }));
    }

    const unused = structuredClone(examples()[1]);
    unused.data.aggregates.trimmedCounts = [0, 0, 0];
    validation = validateRequestValue(unused);
    expect(validation.ok).toBe(false);

    const odd = structuredClone(examples()[5]);
    odd.data.aggregates.trimmedCounts[0] = 1;
    validation = validateRequestValue(odd);
    expect(validation.ok).toBe(false);

    const nullTrimmed = structuredClone(examples()[5]);
    nullTrimmed.data.aggregates.response.values[0] = null;
    nullTrimmed.data.aggregates.sampleCounts[0] = null;
    validation = validateRequestValue(nullTrimmed);
    expect(validation.ok).toBe(false);

    const exactBoundary = structuredClone(examples()[5]);
    exactBoundary.data.conditions = {
      axis: 'ordinal',
      ids: ['only'],
      labels: ['Only'],
      inputLabel: 'Condition',
    };
    exactBoundary.data.aggregates.response.values = [1 / 3];
    exactBoundary.data.aggregates.sampleCounts = [3];
    exactBoundary.data.aggregates.trimmedCounts = [0];
    exactBoundary.data.aggregates.excludedCounts = [0];
    exactBoundary.parameters.trimFraction = 0.3333333333333333;
    expect(3 * exactBoundary.parameters.trimFraction).toBe(1);
    expect(validateRequestValue(exactBoundary).ok).toBe(true);
    expect(buildFigure(exactBoundary).ok).toBe(true);
  });

  it('distinguishes a never-attempted aggregate condition from a missing observation', () => {
    const request = structuredClone(examples()[1]);
    request.data.aggregates.excludedCounts = request.data.aggregates.excludedCounts.map(() => 0);
    const result = built(request);
    expect(result.disclosures.find((entry) => entry.id === 'MISSING_VALUES_PRESENT')).toBeUndefined();
    expect(panelSummary(result)).toContain(
      '1 condition has no usable estimate and retains an explicit gap',
    );
  });

  it('counts only attempted undefined responses as missing observations', () => {
    const request = structuredClone(examples()[1]);
    request.data.aggregates.response.values = [null, 42.5, null];
    request.data.aggregates.sampleCounts = [null, 8, null];
    request.data.aggregates.excludedCounts = [0, 2, 0];
    const result = built(request);
    expect(result.disclosures.find((entry) => entry.id === 'MISSING_VALUES_PRESENT')?.text)
      .toContain('Missing observations: 2');
  });

  it('refuses aggregate accounting whose exact attempted total exceeds safe-integer authority', () => {
    const request = structuredClone(examples()[1]);
    request.data.aggregates.response.values = [null, null, null];
    request.data.aggregates.sampleCounts = [null, null, null];
    request.data.aggregates.excludedCounts = [Number.MAX_SAFE_INTEGER, 1, 0];
    const validation = validateRequestValue(request);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        instancePath: '/data/aggregates',
      }));
    }
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      }));
    }
  });

  it('binds the audited sender denominator into derivation identity and receipt', () => {
    const oneSender = structuredClone(examples()[0]);
    oneSender.data.observations.response.values = oneSender.data.observations.response.values
      .map(() => 0);
    oneSender.data.observations.response.audit.eventCounts =
      oneSender.data.observations.response.audit.eventCounts.map(() => 0);
    const twoSenders = structuredClone(oneSender);
    twoSenders.data.eventScope = pooledEventScope(2);

    const first = operation(built(oneSender));
    const second = operation(built(twoSenders));
    expect(first.inputDigest).not.toBe(second.inputDigest);
    expect(first.receipt.auditRecordedSenderCount).toBe(1);
    expect(second.receipt.auditRecordedSenderCount).toBe(2);
  });

  it('sorts rows canonically while retaining and digesting caller source ordinals', () => {
    const originalRequest = examples()[0];
    const original = built(originalRequest);
    const permutedRequest = structuredClone(originalRequest);
    const permutation = [5, 2, 0, 4, 1, 3];
    for (const key of ['conditionIds', 'repeatIds']) {
      permutedRequest.data.observations[key] = permutation.map(
        (index) => permutedRequest.data.observations[key][index],
      );
    }
    permutedRequest.data.observations.response.values = permutation.map(
      (index) => permutedRequest.data.observations.response.values[index],
    );
    permutedRequest.data.observations.response.audit.eventCounts = permutation.map(
      (index) => permutedRequest.data.observations.response.audit.eventCounts[index],
    );
    const permuted = built(permutedRequest);

    expect(permuted.table).toEqual(original.table);
    expect(operation(permuted).outputDigest).toBe(operation(original).outputDigest);
    expect(operation(permuted).receipt.sourceOrdinals).not.toEqual(
      operation(original).receipt.sourceOrdinals,
    );
    expect(operation(permuted).receipt.sourceOrdinalDigest).not.toBe(
      operation(original).receipt.sourceOrdinalDigest,
    );

    const reorderedConditions = structuredClone(originalRequest);
    const conditionPermutation = [2, 0, 1];
    for (const key of ['ids', 'labels']) {
      reorderedConditions.data.conditions[key] = conditionPermutation.map(
        (index) => reorderedConditions.data.conditions[key][index],
      );
    }
    reorderedConditions.data.conditions.input.values = conditionPermutation.map(
      (index) => reorderedConditions.data.conditions.input.values[index],
    );
    const reordered = built(reorderedConditions);
    expect(reordered.table).toEqual(original.table);
    expect(operation(reordered).receipt.conditionOrder).toEqual(['I000', 'I100', 'I200']);
  });

  it('fails closed on unknown condition references and duplicate composite repeat ids', () => {
    const unknown = structuredClone(examples()[0]);
    unknown.data.observations.conditionIds[0] = 'undeclared';
    const unknownValidation = validateRequestValue(unknown);
    expect(unknownValidation.ok).toBe(false);
    if (!unknownValidation.ok) {
      expect(unknownValidation.errors).toContainEqual(expect.objectContaining({
        code: 'SEMANTIC_UNKNOWN_REFERENCE',
        instancePath: '/data/observations/conditionIds/0',
      }));
    }
    const unknownResult = buildFigure(unknown);
    expect(unknownResult.ok).toBe(false);
    if (!unknownResult.ok) {
      expect(unknownResult.errors).toContainEqual(expect.objectContaining({
        code: 'SEMANTIC_UNKNOWN_REFERENCE',
        instancePath: '/data/observations/conditionIds/0',
      }));
    }

    const duplicate = structuredClone(examples()[0]);
    duplicate.data.observations.repeatIds[1] = duplicate.data.observations.repeatIds[0];
    const duplicateValidation = validateRequestValue(duplicate);
    expect(duplicateValidation.ok).toBe(false);
    if (!duplicateValidation.ok) {
      expect(duplicateValidation.errors).toContainEqual(expect.objectContaining({
        code: 'SEMANTIC_DUPLICATE_ID',
        instancePath: '/data/observations/repeatIds/1',
      }));
    }
    const duplicateResult = buildFigure(duplicate);
    expect(duplicateResult.ok).toBe(false);
    if (!duplicateResult.ok) {
      expect(duplicateResult.errors).toContainEqual(expect.objectContaining({
        code: 'SEMANTIC_DUPLICATE_ID',
        instancePath: '/data/observations/repeatIds/1',
      }));
    }
  });

  it('requires submitted raw rows to match each declared attempted count', () => {
    const request = structuredClone(examples()[0]);
    for (const index of [5, 3, 1]) {
      request.data.observations.conditionIds.splice(index, 1);
      request.data.observations.repeatIds.splice(index, 1);
      request.data.observations.response.values.splice(index, 1);
      request.data.observations.response.audit.eventCounts.splice(index, 1);
    }
    const validation = validateRequestValue(request);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/observations/attemptedCounts/0',
      }));
    }
    expect(buildFigure(request).ok).toBe(false);
  });

  it('refuses duplicate numeric input conditions that would overlap at one x coordinate', () => {
    const request = structuredClone(examples()[0]);
    request.data.conditions.input.values[1] = request.data.conditions.input.values[0];
    const validation = validateRequestValue(request);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_RESPONSE_INPUT_DUPLICATE',
        instancePath: '/data/conditions/input/values/1',
      }));
    }
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
  });

  it('refuses to relabel response values through a contradictory parameter method', () => {
    const request = structuredClone(examples()[0]);
    request.parameters.responseMethod = 'first_spike_latency';
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_RESPONSE_METHOD_MISMATCH',
        stage: 'science',
        instancePath: '/parameters/responseMethod',
      }));
    }
  });

  it('does not advertise analog reductions without a complete sampling and reduction basis', () => {
    const contract = JSON.parse(readFileSync(
      path.resolve(import.meta.dirname, '../contract/skills/neuro.response_curve.v1.json'),
      'utf8',
    )) as any;
    const responseMethods = contract.requestSchema.data.oneOf.flatMap((mode: any) => {
      const response = mode.properties.observations?.properties.response
        ?? mode.properties.aggregates?.properties.response;
      return response.oneOf.flatMap((branch: any) => {
        const method = branch.properties.method;
        return method.const === undefined ? method.enum : [method.const];
      });
    });
    const parameterMethods = contract.requestSchema.parameters.oneOf.flatMap(
      (branch: any) => branch.properties.responseMethod.enum,
    );
    const unsupported = [
      'mean_membrane_voltage',
      'peak_membrane_voltage',
      'mean_state_variable',
    ];
    for (const method of unsupported) {
      expect(responseMethods).not.toContain(method);
      expect(parameterMethods).not.toContain(method);

      const request = structuredClone(examples()[3]);
      request.parameters.responseMethod = method;
      request.data.observations.response = method === 'mean_state_variable'
        ? {
          method,
          kind: 'state_variable',
          unit: '1',
          variableLabel: 'unbound state',
          values: [1, 2, 3, 4, 5, 6],
        }
        : {
          method,
          kind: 'membrane_voltage',
          unit: 'mV',
          values: [-70, -69, -68, -67, -66, -65],
        };
      expect(validateRequestValue(request).ok).toBe(false);
      expect(buildFigure(request).ok).toBe(false);
    }
  });

  it('enforces the scientific domain of every response method', () => {
    const negativeRate = structuredClone(examples()[0]);
    negativeRate.data.observations.response.values[0] = -1;
    delete negativeRate.data.observations.response.audit;
    let result = buildFigure(negativeRate);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_RESPONSE_VALUE_INVALID',
        instancePath: '/data/observations/response/values/0',
      }));
    }

    const negativeLatency = structuredClone(examples()[3]);
    const latencyIndex = negativeLatency.data.observations.response.values.findIndex(
      (value: number | null) => value !== null,
    );
    negativeLatency.data.observations.response.values[latencyIndex] = -1;
    result = buildFigure(negativeLatency);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_RESPONSE_VALUE_INVALID',
        instancePath: `/data/observations/response/values/${latencyIndex}`,
      }));
    }

    const fractionalRawCount = structuredClone(examples()[0]);
    fractionalRawCount.parameters.responseMethod = 'event_count';
    fractionalRawCount.data.observations.response = {
      method: 'event_count',
      kind: 'count',
      unit: '1',
      values: [...fractionalRawCount.data.observations.response.values],
    };
    fractionalRawCount.data.observations.response.values[0] = 1.5;
    result = buildFigure(fractionalRawCount);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_COUNT_NOT_INTEGER',
        instancePath: '/data/observations/response/values/0',
      }));
    }

    const negativeAggregateCount = structuredClone(examples()[4]);
    negativeAggregateCount.parameters.responseMethod = 'event_count';
    negativeAggregateCount.data.aggregates.response = {
      method: 'event_count',
      kind: 'count',
      unit: '1',
      values: [...negativeAggregateCount.data.aggregates.response.values],
    };
    negativeAggregateCount.data.eventScope = singleEventScope();
    negativeAggregateCount.data.aggregates.response.values[0] = -0.5;
    result = buildFigure(negativeAggregateCount);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_RESPONSE_VALUE_INVALID',
        instancePath: '/data/aggregates/response/values/0',
      }));
    }

    negativeAggregateCount.data.aggregates.response.values[0] = 3.5;
    expect(buildFigure(negativeAggregateCount).ok).toBe(true);
  });

  it('binds measurement-window-start latency to the exact typed window boundary', () => {
    const request = structuredClone(examples()[3]);
    request.data.measurementWindow = {
      start: 0,
      stop: 500,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    request.data.observations.response.latencyReference = 'measurement_window_start';
    request.data.observations.response.values = request.data.observations.response.values.map(
      (value: number | null) => value === null ? null : 500,
    );
    let result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_LATENCY_OUTSIDE_WINDOW',
        instancePath: expect.stringMatching(/^\/data\/observations\/response\/values\/\d+$/),
      }));
    }

    request.data.measurementWindow.boundary = '[start,stop]';
    result = buildFigure(request);
    expect(result.ok).toBe(true);
  });

  it('renders zero latency as an event at the included window start, not as missing', () => {
    const request = structuredClone(examples()[3]);
    const targetCondition = request.data.conditions.ids.at(-1);
    request.data.observations.response.values = request.data.observations.response.values.map(
      (value: number | null, index: number) =>
        request.data.observations.conditionIds[index] === targetCondition ? 0 : value,
    );

    const validation = validateRequestValue(request);
    expect(validation.ok).toBe(true);
    const result = built(request);
    const condition = aggregateRows(result).find((row) => row[0] === targetCondition);
    expect(condition?.[5]).toBe(0);
    expect(condition?.[10]).toBe('false');
    const rawZeroRows = result.table.rows.filter(
      (row) => row[0] === targetCondition && row[4] !== null,
    );
    expect(rawZeroRows.map((row) => row[5])).toEqual([0, 0]);
    expect(rawZeroRows.every((row) => row[10] === 'false')).toBe(true);

    const panel = result.plan.panels[0];
    const zeroTick = panel.axes
      .find((axis) => axis.orientation === 'left')
      ?.ticks.find((tick) => tick.label === '0');
    expect(zeroTick?.position).toBe(panel.y + panel.height);
    const points = panel.marks.find((mark) => mark.type === 'point');
    expect(points?.type).toBe('point');
    if (points?.type === 'point') {
      expect(points.points.some((point) => point.y === panel.y + panel.height)).toBe(true);
    }
  });

  it('refuses stimulus-onset latency until the onset has a typed window coordinate', () => {
    const request = structuredClone(examples()[3]);
    request.data.observations.response.latencyReference = 'stimulus_onset';

    const validation = validateRequestValue(request);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        code: 'SCHEMA_ENUM_MISMATCH',
        instancePath: '/data/observations/response/latencyReference',
      }));
    }

    const rendered = buildFigure(request);
    expect(rendered.ok).toBe(false);
    if (!rendered.ok) {
      expect(rendered.errors).toContainEqual(expect.objectContaining({
        code: 'SCHEMA_ENUM_MISMATCH',
        instancePath: '/data/observations/response/latencyReference',
      }));
    }
  });

  it('requires a time unit for the measurement window', () => {
    const request = structuredClone(examples()[0]);
    request.data.measurementWindow.unit = 'mV';
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        instancePath: '/data/measurementWindow/unit',
        validatorId: 'window.valid',
      }));
    }
  });

  it('checks aggregate count estimates against the exact estimator lattice', () => {
    const request = structuredClone(examples()[4]);
    request.parameters.estimator = 'median';
    request.parameters.responseMethod = 'event_count';
    request.data.aggregates.response = {
      method: 'event_count',
      kind: 'count',
      unit: '1',
      values: request.data.aggregates.response.values.map(() => Math.PI),
    };
    request.data.eventScope = singleEventScope();
    request.data.aggregates.sampleCounts = request.data.aggregates.sampleCounts.map(() => 9);
    let result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_COUNT_ESTIMATOR_INCOHERENT',
        instancePath: '/data/aggregates/response/values/0',
      }));
    }

    request.data.aggregates.response.values = request.data.aggregates.response.values.map(() => 3);
    expect(buildFigure(request).ok).toBe(true);
    request.data.aggregates.sampleCounts = request.data.aggregates.sampleCounts.map(() => 10);
    request.data.aggregates.response.values = request.data.aggregates.response.values.map(() => 3.5);
    expect(buildFigure(request).ok).toBe(true);
  });

  it('requires complete repeat-id coverage for a raw paired design', () => {
    const request = structuredClone(examples()[2]);
    const removed = request.data.observations.conditionIds.findIndex(
      (conditionId: string) => conditionId === request.data.conditions.ids[1],
    );
    request.data.observations.conditionIds.splice(removed, 1);
    request.data.observations.repeatIds.splice(removed, 1);
    request.data.observations.response.values.splice(removed, 1);
    if (request.data.observations.response.audit) {
      request.data.observations.response.audit.eventCounts.splice(removed, 1);
    }
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_PAIRED_REPEATS_INCOMPLETE',
        instancePath: '/data/observations/repeatIds',
      }));
    }
  });

  it('refuses non-positive logarithmic domains without rejecting a representable exact mean', () => {
    const nonpositive = structuredClone(examples()[3]);
    nonpositive.data.conditions.input.values[0] = 0;
    const nonpositiveValidation = validateRequestValue(nonpositive);
    expect(nonpositiveValidation.ok).toBe(false);
    if (!nonpositiveValidation.ok) {
      expect(nonpositiveValidation.errors.map((error) => error.code)).toContain(
        'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
      );
    }
    const nonpositiveResult = buildFigure(nonpositive);
    expect(nonpositiveResult.ok).toBe(false);
    if (!nonpositiveResult.ok) {
      expect(nonpositiveResult.errors.map((error) => error.code)).toContain(
        'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
      );
    }

    const finiteMean = structuredClone(examples()[0]);
    finiteMean.data.observations.response.values = finiteMean.data.observations.response.values.map(
      () => Number.MAX_VALUE,
    );
    delete finiteMean.data.observations.response.audit;
    finiteMean.data.eventScope = singleEventScope();
    finiteMean.data.observations.response.rateNormalization = 'single_train_rate';
    const finiteMeanResult = built(finiteMean);
    expect(aggregateRows(finiteMeanResult).map((row) => row[5])).toEqual([
      Number.MAX_VALUE,
      Number.MAX_VALUE,
      Number.MAX_VALUE,
    ]);

    const underflow = structuredClone(examples()[0]);
    underflow.data.conditions = {
      axis: 'ordinal',
      ids: ['only'],
      labels: ['Only'],
      inputLabel: 'Condition',
    };
    underflow.data.observations.conditionIds = ['only', 'only'];
    underflow.data.observations.repeatIds = ['r1', 'r2'];
    underflow.data.observations.attemptedCounts = [2];
    underflow.data.observations.response.values = [Number.MIN_VALUE, 0];
    delete underflow.data.observations.response.audit;
    underflow.data.eventScope = singleEventScope();
    underflow.data.observations.response.rateNormalization = 'single_train_rate';
    const underflowValidation = validateRequestValue(underflow);
    expect(underflowValidation.ok).toBe(false);
    if (!underflowValidation.ok) {
      expect(underflowValidation.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        instancePath: '/data/observations/response/values',
      }));
    }
    const underflowResult = buildFigure(underflow);
    expect(underflowResult.ok).toBe(false);
    if (!underflowResult.ok) {
      expect(underflowResult.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        stage: 'science',
        instancePath: '/data/observations/response/values',
      }));
    }
  });

  it('binds optional event-count audits to exact counts, mask, and denominator authority', () => {
    const responseMissing = structuredClone(examples()[0]);
    responseMissing.data.observations.response.values[0] = null;
    let result = buildFigure(responseMissing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/observations/response/audit/eventCounts/0',
      }));
    }

    const countMissing = structuredClone(examples()[0]);
    countMissing.data.observations.response.audit.eventCounts[0] = null;
    result = buildFigure(countMissing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/observations/response/audit/eventCounts/0',
      }));
    }

    const unsafeCount = structuredClone(examples()[0]);
    unsafeCount.data.observations.response.audit.eventCounts[0] = Number.MAX_SAFE_INTEGER + 1;
    result = buildFigure(unsafeCount);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_COUNT_NOT_INTEGER',
        instancePath: '/data/observations/response/audit/eventCounts/0',
      }));
    }

    const missingDenominator = structuredClone(examples()[0]);
    delete missingDenominator.data.eventScope.recordedSenderCount;
    result = buildFigure(missingDenominator);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
        instancePath: '/data/eventScope/recordedSenderCount',
      }));
    }

    const contradictoryRate = structuredClone(examples()[0]);
    contradictoryRate.data.observations.response.values[0] += 1;
    result = buildFigure(contradictoryRate);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/observations/response/values/0',
      }));
    }

    const exactLargeRate = structuredClone(examples()[0]);
    exactLargeRate.data.observations.response.audit.eventCounts[0] = 1_000_000_000_000;
    exactLargeRate.data.observations.response.values[0] = 1_000_000_000_000;
    expect(validateRequestValue(exactLargeRate).ok).toBe(true);
    expect(buildFigure(exactLargeRate).ok).toBe(true);

    const largeAbsoluteError = structuredClone(exactLargeRate);
    largeAbsoluteError.data.observations.response.values[0] += 999;
    const validation = validateRequestValue(largeAbsoluteError);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/observations/response/values/0',
      }));
    }
    result = buildFigure(largeAbsoluteError);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/observations/response/values/0',
      }));
    }
  });

  it('rejects response accounting contradictions at the validate-only boundary', () => {
    const aggregateMask = structuredClone(examples()[1]);
    aggregateMask.data.aggregates.sampleCounts[1] = null;
    let result = validateRequestValue(aggregateMask);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregates/sampleCounts/1',
      }));
    }

    const auditMask = structuredClone(examples()[0]);
    auditMask.data.observations.response.audit.eventCounts[0] = null;
    result = validateRequestValue(auditMask);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/observations/response/audit/eventCounts/0',
      }));
    }

    const unauditedPerSender = structuredClone(examples()[0]);
    delete unauditedPerSender.data.observations.response.audit;
    result = validateRequestValue(unauditedPerSender);
    expect(result.ok).toBe(true);

    const latencyDenominator = structuredClone(examples()[3]);
    latencyDenominator.data.eventScope.recordedSenderCount = 7;
    result = validateRequestValue(latencyDenominator);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
        instancePath: '/data/eventScope/recordedSenderCount',
      }));
    }

    const impossibleReason = structuredClone(examples()[0]);
    impossibleReason.parameters.uncertainty.reason = 'single_trial';
    result = validateRequestValue(impossibleReason);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA',
        instancePath: '/parameters/uncertainty/reason',
      }));
    }

    const unsafeSampleCount = structuredClone(examples()[4]);
    unsafeSampleCount.data.aggregates.sampleCounts[0] = Number.MAX_SAFE_INTEGER + 1;
    result = validateRequestValue(unsafeSampleCount);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        instancePath: '/data/aggregates/sampleCounts/0',
      }));
    }
  });

  it('omits empty unit parentheses on a dimensionless response axis', () => {
    const request = structuredClone(examples()[0]);
    request.parameters.responseMethod = 'event_count';
    request.data.observations.response = {
      method: 'event_count',
      kind: 'count',
      unit: '1',
      values: request.data.observations.response.audit.eventCounts,
    };
    request.data.eventScope = singleEventScope();
    const result = built(request);
    expect(result.plan.panels[0].axes[1].label).toBe(
      'event count [declared selection test_single_train; count in one selected train]',
    );
  });

  it('preflights the known missing-sidecar boundary before response derivation', () => {
    const request = structuredClone(examples()[0]);
    const rows = 499;
    request.data.conditions = {
      axis: 'ordinal',
      ids: ['only'],
      labels: ['Only'],
      inputLabel: 'Condition',
    };
    request.data.observations.conditionIds = Array.from({ length: rows }, () => 'only');
    request.data.observations.repeatIds = Array.from(
      { length: rows },
      (_value, index) => `r${index}`,
    );
    request.data.observations.response.values = Array.from({ length: rows }, () => 0);
    request.data.observations.response.audit.eventCounts = Array.from(
      { length: rows },
      () => 0,
    );
    request.data.observations.attemptedCounts = [rows];
    const result = buildFigure(request);
    expect(result.ok).toBe(true);

    request.data.observations.conditionIds.push('only');
    request.data.observations.repeatIds.push(`r${rows}`);
    request.data.observations.response.values.push(0);
    request.data.observations.response.audit.eventCounts.push(0);
    request.data.observations.attemptedCounts[0]++;
    const over = buildFigure(request);
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.errors).toContainEqual(expect.objectContaining({
        code: 'RESOURCE_COMPACTION_UNAVAILABLE',
        stage: 'budget',
        limit: { name: 'returnedTableRows', limit: 500, observed: 501 },
      }));
    }
  });

  it('bounds categorical tick labels without dropping conditions, points, or rows', () => {
    const request = structuredClone(examples()[4]);
    const count = 500;
    request.data.conditions = {
      axis: 'nominal',
      ids: Array.from({ length: count }, (_value, index) => `c${index}`),
      labels: Array.from({ length: count }, (_value, index) => `Condition ${index}`),
      inputLabel: 'Condition',
    };
    request.data.aggregates.response.values = Array.from(
      { length: count },
      (_value, index) => index,
    );
    request.data.aggregates.sampleCounts = Array.from({ length: count }, () => 10);
    request.data.aggregates.excludedCounts = Array.from({ length: count }, () => 0);
    const result = built(request);
    expect(result.plan.panels[0].axes[0].ticks.length).toBeLessThanOrEqual(12);
    const points = result.plan.panels[0].marks.find((mark) => mark.type === 'point');
    expect(points?.type).toBe('point');
    if (points?.type === 'point') {
      expect(points.points).toHaveLength(count);
      expect(points.points[0]).toEqual(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }));
    }
    expect(result.table.rowsTotal).toBe(count);
    expect(result.table.rowsInline).toBe(count);
  });

  it('disambiguates repeated categorical labels with stable condition identity', () => {
    const request = structuredClone(examples()[1]);
    request.data.conditions.labels = request.data.conditions.ids.map(() => 'Same');
    const result = built(request);
    const tickLabels = result.plan.panels[0].axes[0].ticks.map((tick) => tick.label);
    expect(tickLabels).toEqual(
      request.data.conditions.ids.map((conditionId: string) => `Same [${conditionId}]`),
    );
    expect(new Set(tickLabels).size).toBe(tickLabels.length);

    const craftedCollision = structuredClone(examples()[1]);
    craftedCollision.data.conditions.ids = ['a', 'b', 'c'];
    craftedCollision.data.conditions.labels = ['Same', 'Same', 'Same [a]'];
    const collisionLabels = built(craftedCollision).plan.panels[0].axes[0].ticks
      .map((tick) => tick.label);
    expect(new Set(collisionLabels).size).toBe(collisionLabels.length);
  });

  it('keeps distinct binary64 response extrema distinct in accessible prose', () => {
    const request = structuredClone(examples()[4]);
    request.data.aggregates.response.values = [
      1,
      1.0000000000000002,
      1,
      1.0000000000000002,
    ];
    const summary = built(request).plan.accessibility.summary;
    expect(summary).toContain('Response ranges from 1 to 1.0000000000000002 Hz.');
    expect(summary).not.toContain('Response ranges from 1 to 1 Hz.');
  });

  it('uses explicit empty state when every declared condition estimate is undefined', () => {
    const empty = structuredClone(examples()[3]);
    empty.data.observations.response.values = empty.data.observations.response.values.map(
      () => null,
    );
    const result = built(empty);
    expect(result.plan.panels[0].axes).toHaveLength(1);
    expect(result.plan.panels[0].axes[0].orientation).toBe('bottom');
    expect(result.plan.panels[0].marks).toContainEqual(expect.objectContaining({
      type: 'rule',
      orientation: 'vertical',
      lines: expect.arrayContaining([expect.objectContaining({ position: expect.any(Number) })]),
    }));
    expect(result.plan.panels[0].noData).toEqual({
      reason: 'no declared condition has a usable response estimate',
    });
    expect(aggregateRows(result).map((row) => row[5])).toEqual([null, null, null]);
    expect(result.disclosures.find((entry) => entry.id === 'MISSING_VALUES_PRESENT')?.text)
      .toContain('Missing observations: 6');
  });

  it('marks a missing numeric condition at its exact x position', () => {
    const request = structuredClone(examples()[0]);
    request.data.conditions.input.values = [0, 123, 1000];
    for (let index = 0; index < request.data.observations.conditionIds.length; index++) {
      if (request.data.observations.conditionIds[index] === 'I100') {
        request.data.observations.response.values[index] = null;
        request.data.observations.response.audit.eventCounts[index] = null;
      }
    }
    const result = built(request);
    const rule = result.plan.panels[0].marks.find((mark) => mark.type === 'rule');
    expect(rule).toMatchObject({
      type: 'rule',
      orientation: 'vertical',
      lines: [expect.objectContaining({ position: expect.any(Number) })],
    });
    expect(result.plan.legend?.map((entry) => entry.label)).toContain(
      'Declared condition with undefined response (x position only)',
    );
  });
});

describe('response-curve estimator arithmetic', () => {
  it('implements the published exact mean, even-median, and per-tail trimming conventions', () => {
    expect(exactResponseCurveMean([1e16, 1, -1e16])).toBe(1 / 3);
    expect(exactResponseCurveMean([Number.MAX_VALUE, Number.MAX_VALUE])).toBe(Number.MAX_VALUE);
    expect(exactResponseCurveMean([
      -4.446430218105462e-11,
      -7.31816576603336e-11,
      -0.06198650490841828,
    ])).toBe(-0.020662168342021413);
    expect(responseCurveEstimate([-Number.MAX_VALUE, Number.MAX_VALUE], 'median')).toBe(0);
    expect(responseCurveEstimate([Number.MAX_VALUE, Number.MAX_VALUE], 'median')).toBe(
      Number.MAX_VALUE,
    );
    expect(() => responseCurveEstimate([0, Number.MIN_VALUE], 'median')).toThrow(
      /underflows to zero/,
    );
    expect(responseCurveEstimate([0, 1, 2, 3, 100], 'trimmed_mean', 0.2)).toBe(2);
    expect(responseCurveEstimate([0, 1, 100], 'trimmed_mean', 0.3333333333333333)).toBe(
      101 / 3,
    );
    expect(responseCurveEstimate([], 'mean')).toBeNull();
  });

  it('matches independent exact small-integer estimator oracles', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), {
          minLength: 1,
          maxLength: 80,
        }),
        fc.integer({ min: 0, max: 49 }),
        (values, trimPercent) => {
          const ordered = [...values].sort((left, right) => left - right);
          const sum = values.reduce((total, value) => total + value, 0);
          expect(responseCurveEstimate(values, 'mean')).toBe(sum / values.length);

          const middle = Math.floor(ordered.length / 2);
          const median = ordered.length % 2 === 1
            ? ordered[middle]
            : (ordered[middle - 1] + ordered[middle]) / 2;
          expect(responseCurveEstimate(values, 'median')).toBe(median);

          const fraction = trimPercent / 100;
          const perTail = exactFloorBinary64ProductOracle(fraction, values.length);
          const retained = ordered.slice(perTail, ordered.length - perTail);
          const trimmed = retained.reduce((total, value) => total + value, 0) / retained.length;
          expect(responseCurveEstimate(values, 'trimmed_mean', fraction)).toBe(trimmed);
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('is invariant to caller row permutation after the specified stable identity sort', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({
          min: 0,
          max: 1e100,
          noNaN: true,
          noDefaultInfinity: true,
        }), { minLength: 1, maxLength: 50 }),
        (values) => {
          const ids = values.map((_value, index) => `r${String(index).padStart(3, '0')}`);
          const forward = deriveResponseCurve({
            conditions: { axis: 'ordinal', ids: ['c'] },
            estimator: 'mean',
            responseMethod: 'mean_firing_rate',
            repeatDesign: 'independent',
            repeats: {
              conditionIds: values.map(() => 'c'),
              repeatIds: ids,
              responses: values,
              attemptedCounts: [values.length],
            },
          });
          const reverseOrder = values.map((_value, index) => values.length - index - 1);
          const reversed = deriveResponseCurve({
            conditions: { axis: 'ordinal', ids: ['c'] },
            estimator: 'mean',
            responseMethod: 'mean_firing_rate',
            repeatDesign: 'independent',
            repeats: {
              conditionIds: reverseOrder.map(() => 'c'),
              repeatIds: reverseOrder.map((index) => ids[index]),
              responses: reverseOrder.map((index) => values[index]),
              attemptedCounts: [values.length],
            },
          });
          expect(reversed.ok).toBe(forward.ok);
          if (forward.ok && reversed.ok) {
            expect(reversed.result.conditions[0].estimate).toBe(
              forward.result.conditions[0].estimate,
            );
            expect(reversed.result.sortedRepeats.map(({ sourceOrdinal: _ordinal, ...row }) => row))
              .toEqual(forward.result.sortedRepeats.map(({ sourceOrdinal: _ordinal, ...row }) => row));
          } else if (!forward.ok && !reversed.ok) {
            expect(reversed.issue).toEqual(forward.issue);
          }
        },
      ),
      { numRuns: 1_000 },
    );
  });

  it('keeps aggregate accounting inside the exact safe-integer domain', () => {
    const result = deriveResponseCurve({
      conditions: { axis: 'ordinal', ids: ['a', 'b'] },
      estimator: 'mean',
      responseMethod: 'mean_firing_rate',
      repeatDesign: 'independent',
      aggregates: {
        responses: [1, 2],
        sampleCounts: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        excludedCounts: [0, 0],
      },
    });
    expect(result).toEqual({
      ok: false,
      issue: expect.objectContaining({
        code: 'invalid_numeric',
        path: '/data/aggregates',
      }),
    });
  });
});
