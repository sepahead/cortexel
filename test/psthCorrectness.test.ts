import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildFigure } from '../src/render/buildFigure.js';
import { derivePsth, PsthDerivationError } from '../src/analysis/psth.js';
import { validateRequestValue } from '../src/core/request.js';

const contract = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../contract/skills/neuro.psth.v1.json'),
    'utf8',
  ),
) as {
  accessibility: { tableColumns: { key: string; header: string }[] };
  budgets: { compactionPolicies: string[]; tablePolicy: string };
  examples: {
    valid: Record<string, any>[];
  };
};

function example(mode: 'events' | 'prebinned'): Record<string, any> {
  return structuredClone(
    contract.examples.valid.find((request) => request.data.mode === mode)!,
  );
}

function operation(result: ReturnType<typeof buildFigure>): Record<string, any> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('expected a rendered PSTH');
  const operations = (result.artifact.derivation as { operations: Record<string, any>[] }).operations;
  expect(operations).toHaveLength(1);
  return operations[0];
}

function column(result: Extract<ReturnType<typeof buildFigure>, { ok: true }>, key: string): unknown[] {
  const index = result.table.columns.findIndex((entry) => entry.key === key);
  expect(index).toBeGreaterThanOrEqual(0);
  return result.table.rows.map((row) => row[index]);
}

function panelSummary(result: Extract<ReturnType<typeof buildFigure>, { ok: true }>): string {
  return result.plan.accessibility.panelSummaries.join(' ');
}

describe('stable PSTH normalization authority', () => {
  it.each([
    { mode: 'events', policy: 'uniform_trial_count', uncertainty: 'none', accepted: true },
    { mode: 'events', policy: 'per_bin_covering_trials', uncertainty: 'none', accepted: false },
    { mode: 'events', policy: 'uniform_trial_count', uncertainty: 'standard_deviation', accepted: false },
    { mode: 'events', policy: 'per_bin_covering_trials', uncertainty: 'standard_deviation', accepted: false },
    { mode: 'prebinned', policy: 'uniform_trial_count', uncertainty: 'none', accepted: true },
    { mode: 'prebinned', policy: 'per_bin_covering_trials', uncertainty: 'none', accepted: true },
    { mode: 'prebinned', policy: 'uniform_trial_count', uncertainty: 'standard_deviation', accepted: false },
    { mode: 'prebinned', policy: 'per_bin_covering_trials', uncertainty: 'standard_deviation', accepted: false },
  ] as const)(
    'closes mode=$mode × policy=$policy × uncertainty=$uncertainty (accepted=$accepted)',
    ({ mode, policy, uncertainty, accepted }) => {
      const request = example(mode);
      request.parameters.denominatorPolicy = policy;
      if (mode === 'prebinned' && policy === 'uniform_trial_count') {
        request.data.counts = [0, 3, 12, 6];
        request.data.trialDenominators = [5, 5, 5, 5];
        request.data.rates.values = [0, 60, 240, 120];
      }
      request.parameters.uncertainty = uncertainty === 'none'
        ? { kind: 'none', reason: 'not_computed' }
        : {
          kind: 'standard_deviation',
          unit: 'Hz',
          values: request.data.mode === 'events' ? [1, 1, 1] : [1, 1, 1, 1],
          sampleCount: request.data.mode === 'events' ? [4, 4, 4] : [5, 5, 5, 5],
          basis: 'trials',
        };

      const validation = validateRequestValue(request);
      expect(validation.ok).toBe(accepted);
      if (!accepted) {
        expect(validation.ok ? [] : validation.errors.map((error) => error.stage)).toEqual(
          expect.arrayContaining(['structural']),
        );
        expect(
          validation.ok ? false : validation.errors.some((error) => error.code.startsWith('SCHEMA_')),
        ).toBe(true);
        return;
      }
      const rendered = buildFigure(request);
      expect(rendered.ok).toBe(true);
    },
  );

  it('applies both the covering-trial and selected-sender denominators in events mode', () => {
    const result = buildFigure(example('events'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(column(result, 'count')).toEqual([0, 5, 2]);
    expect(column(result, 'trialDenominator')).toEqual([4, 4, 4]);
    expect(column(result, 'selectedSenderCount')).toEqual([4, 4, 4]);
    expect(column(result, 'value')).toEqual([0, 31.25, 12.5]);

    const derived = operation(result);
    expect(derived.algorithm).toBe('cortexel.psth.exact_counts_normalization_and_baseline');
    expect(derived.receipt).toMatchObject({
      normalization: 'mean_rate_per_selected_sender_per_trial',
      denominatorPolicy: 'uniform_trial_count',
      countTotalExact: '7',
      selectedSenderCount: 4,
      includedTrialCount: 4,
      trialDenominators: [4, 4, 4],
      senderDenominatorApplied: true,
      senderExposurePolicy: 'all_selected_senders_cover_every_counted_trial_bin',
      senderExposureVerifiableFromInput: false,
      exactExposureAuthority:
        'integer_count_over_integer_denominators_and_exact_typed_endpoint_differences_one_round_to_binary64',
    });
    expect(result.disclosures.map((entry) => entry.id)).toContain(
      'RECTANGULAR_SENDER_EXPOSURE_ASSERTED',
    );
  });

  it('does not divide the selected-group rate by the sender count', () => {
    const request = example('prebinned');
    delete request.parameters.baseline;
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(column(result, 'value')).toEqual([null, 100, 240, 120]);
    expect(operation(result).receipt).toMatchObject({
      normalization: 'total_event_rate_per_trial',
      senderDenominatorApplied: false,
      suppliedNormalizedValues: true,
      suppliedNormalizedValuesVerified: true,
      suppliedValueRelativeTolerance: 1e-12,
    });
  });

  it('refuses a per-selected-sender rate without the rectangular exposure assertion', () => {
    const request = example('events');
    delete request.parameters.senderExposurePolicy;
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ instancePath: '/parameters/senderExposurePolicy' }),
    ]));
  });

  it('derives count-per-trial on the exact integer lattice', () => {
    const result = derivePsth({
      mode: 'prebinned',
      bins: { edges: [0, 1], unit: 's', boundary: '[lo,hi)', finalEdgeInclusive: false },
      relativeWindow: { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' },
      normalization: 'count_per_trial',
      denominatorPolicy: 'uniform_trial_count',
      trialIds: ['a', 'b', 'c'],
      alignmentTimes: [0, 0, 0],
      alignmentUnit: 's',
      counts: [1],
      trialDenominators: [3],
      recordedSenderCount: 99,
      includedTrialCount: 3,
      excludedTrialCount: 0,
    });

    expect(result.values).toEqual([1 / 3]);
    expect(result.receipt.senderDenominatorApplied).toBe(false);
    expect(result.receipt.exactExposureAuthority).toContain('one_round_to_binary64');
  });

  it('rejects a supplied rate that cannot be re-derived from its count and exposure', () => {
    const request = example('prebinned');
    request.data.rates.values[2] = 241;
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/rates/values/2',
      }),
    ]));
  });

  it('rejects a supplied normalized-value missingness mask that contradicts counts', () => {
    const request = example('prebinned');
    request.data.rates.values[0] = 0;
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors[0]).toMatchObject({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      instancePath: '/data/rates/values/0',
    });
  });

  it('refuses a varying pre-binned denominator under uniform_trial_count', () => {
    const request = example('prebinned');
    request.parameters.denominatorPolicy = 'uniform_trial_count';
    delete request.parameters.baseline;
    request.data.counts[0] = 0;
    request.data.trialDenominators[0] = 5;
    request.data.rates.values[0] = 0;
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'SCIENCE_DENOMINATOR_INVALID',
        instancePath: '/data/trialDenominators/1',
      }),
    ]));
  });
});

describe('PSTH exact exposure, baseline, and missing-bin rendering', () => {
  const unequalExposureRequest = (): Record<string, any> => ({
    contract: { name: 'cortexel-figure-request', version: '1.0' },
    skill: { id: 'neuro.psth' },
    data: {
      mode: 'prebinned',
      trialIds: ['t1', 't2'],
      alignmentUnit: 's',
      alignmentTimes: [10, 20],
      counts: [1, 1],
      trialDenominators: [1, 2],
      recordedSenderCount: 1,
      includedTrialCount: 2,
      excludedTrialCount: 0,
      rates: { kind: 'firing_rate', unit: 'Hz', values: [1, 0.25] },
      relativeWindow: { start: 0, stop: 3, unit: 's', boundary: '[start,stop)' },
    },
    parameters: {
      seriesId: 'selected',
      seriesLabel: 'Selected senders',
      alignmentLabel: 'Cue',
      bins: {
        mode: 'edges',
        unit: 's',
        edges: [0, 1, 3],
        boundary: '[lo,hi)',
        finalEdgeInclusive: false,
      },
      normalization: 'total_event_rate_per_trial',
      denominatorPolicy: 'per_bin_covering_trials',
      baseline: { mode: 'subtract_mean_rate', start: 0, stop: 3 },
      uncertainty: { kind: 'none', reason: 'not_computed' },
    },
    source: { kind: 'experimental_recording', system: 'fixture' },
  });

  it('weights the aggregate baseline by exact exposure, not by the mean of bin rates', () => {
    const result = buildFigure(unequalExposureRequest());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Exact exposure is 1 trial*1 s + 2 trials*2 s = 5 trial*s, hence 2/5 Hz.
    expect(operation(result).receipt).toMatchObject({
      baselineCountTotalExact: '2',
      baselineRate: 0.4,
      baselineExposureAuthority:
        'sum_of_integer_covering_trial_weights_times_exact_typed_endpoint_differences',
    });
    expect(column(result, 'value')).toEqual([1, 0.25]);
    expect(column(result, 'baselineCorrectedValue')).toEqual([0.6, -0.15]);

    const rectMark = result.plan.panels[0].marks.find((mark) => mark.type === 'rect');
    expect(rectMark?.type).toBe('rect');
    if (rectMark?.type !== 'rect') return;
    expect(rectMark.rects).toHaveLength(2);
    expect(rectMark.rects[0].y).toBeLessThan(rectMark.rects[1].y);
    expect(result.plan.panels[0].marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'rule', orientation: 'horizontal' }),
      expect.objectContaining({ type: 'rule', orientation: 'vertical' }),
    ]));
    expect(panelSummary(result)).toContain(
      're-derived from raw counts and summed exact exposure',
    );
    expect(panelSummary(result)).toContain(
      'plotted baseline-corrected range is -0.15 to 0.6 Hz',
    );
  });

  it('retains a no-exposure bin as null in every table authority and as a visible gap', () => {
    const request = unequalExposureRequest();
    request.data.counts[0] = null;
    request.data.trialDenominators[0] = null;
    request.data.rates.values[0] = null;
    request.parameters.baseline = { mode: 'subtract_mean_rate', start: 1, stop: 3 };
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(column(result, 'count')).toEqual([null, 1]);
    expect(column(result, 'trialDenominator')).toEqual([null, 2]);
    expect(column(result, 'value')).toEqual([null, 0.25]);
    expect(column(result, 'baselineCorrectedValue')).toEqual([null, 0]);
    expect(result.disclosures.map((entry) => entry.id)).toContain('MISSING_VALUES_PRESENT');

    const rectMark = result.plan.panels[0].marks.find((mark) => mark.type === 'rect');
    expect(rectMark?.type === 'rect' ? rectMark.rects : []).toHaveLength(1);
    expect(result.plan.panels[0].marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'rule', orientation: 'vertical', dash: '2 3' }),
    ]));
    expect(result.plan.legend).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'No included trial covered this bin',
        glyph: 'rule',
      }),
    ]));
    expect(panelSummary(result)).toContain(
      '1 bin has no covering trial and remains a missing gap, not a measured zero.',
    );
    const globalSummary = (result.artifact.accessibility as { summary: string }).summary;
    expect(globalSummary).toContain(
      '1 bin has no covering trial and remains missing, not zero.',
    );
    expect(globalSummary).not.toContain('Reference or missing-data marks:');
  });

  it('refuses baseline subtraction when the aggregate baseline exposure is zero', () => {
    const request = unequalExposureRequest();
    request.data.counts[0] = null;
    request.data.trialDenominators[0] = null;
    request.data.rates.values[0] = null;
    request.parameters.baseline = { mode: 'subtract_mean_rate', start: 0, stop: 1 };
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors[0]).toMatchObject({
      code: 'SCIENCE_DENOMINATOR_INVALID',
      instancePath: '/parameters/baseline',
    });
  });

  it('publishes the contract audit columns instead of a generic three-column histogram table', () => {
    const result = buildFigure(example('prebinned'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.table.columns).toEqual(
      contract.accessibility.tableColumns.map((entry: { key: string; header: string }) => ({
        key: entry.key,
        header: entry.header,
      })),
    );
    expect(result.table.policy).toBe('complete_returned');
    expect(contract.budgets).toMatchObject({
      compactionPolicies: ['none'],
      tablePolicy: 'complete_returned',
    });
  });

  it('keeps extreme finite endpoint arithmetic total and typed', () => {
    const direct = (start: number, stop: number) => derivePsth({
      mode: 'prebinned',
      bins: { edges: [start, stop], unit: 's', boundary: '[lo,hi)', finalEdgeInclusive: false },
      relativeWindow: { start, stop, unit: 's', boundary: '[start,stop)' },
      normalization: 'count',
      denominatorPolicy: 'uniform_trial_count',
      trialIds: ['t1'],
      alignmentTimes: [0],
      alignmentUnit: 's',
      counts: [0],
      trialDenominators: [1],
      recordedSenderCount: 1,
      includedTrialCount: 1,
      excludedTrialCount: 0,
    });

    expect(direct(0, Number.MIN_VALUE).binWidths).toEqual([Number.MIN_VALUE]);
    expect(() => direct(-Number.MAX_VALUE, Number.MAX_VALUE)).toThrowError(
      PsthDerivationError,
    );
    try {
      direct(-Number.MAX_VALUE, Number.MAX_VALUE);
    } catch (error) {
      expect(error).toMatchObject({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        instancePath: '/data/relativeWindow',
      });
    }
  });

  it.each([
    { edges: [0, 0.5, 0.4, 1], failingIndex: 2 },
    { edges: [0, 0.5, 0.5, 1], failingIndex: 2 },
    { edges: [0, Number.POSITIVE_INFINITY, 1], failingIndex: 1 },
  ])('rejects malformed direct-entrypoint bin edges $edges', ({ edges, failingIndex }) => {
    expect(() => derivePsth({
      mode: 'prebinned',
      bins: { edges, unit: 's', boundary: '[lo,hi)', finalEdgeInclusive: false },
      relativeWindow: { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' },
      normalization: 'count',
      denominatorPolicy: 'uniform_trial_count',
      trialIds: ['t1'],
      alignmentTimes: [0],
      alignmentUnit: 's',
      counts: Array.from({ length: edges.length - 1 }, () => 0),
      trialDenominators: Array.from({ length: edges.length - 1 }, () => 1),
      recordedSenderCount: 1,
      includedTrialCount: 1,
      excludedTrialCount: 0,
    })).toThrowError(expect.objectContaining({
      code: 'SCIENCE_BIN_EDGES_INVALID',
      instancePath: `/parameters/bins/edges/${failingIndex}`,
    }));
  });

  it('refuses a 501-bin complete table before evaluating derivation arithmetic', () => {
    const request = example('events');
    request.parameters.bins = {
      mode: 'edges',
      unit: 's',
      edges: Array.from({ length: 502 }, (_unused, index) => index),
      boundary: '[lo,hi)',
      finalEdgeInclusive: false,
    };
    request.data.relativeWindow = {
      start: 0,
      stop: 501,
      unit: 's',
      boundary: '[start,stop)',
    };
    request.data.eventTimes.unit = 's';
    request.data.eventTimes.values[0] = Number.MAX_VALUE;
    request.data.alignmentUnit = 's';
    request.data.alignmentTimes[0] = -Number.MAX_VALUE;

    const refused = buildFigure(request);
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.errors).toHaveLength(1);
    expect(refused.errors[0]).toMatchObject({
      code: 'RESOURCE_COMPACTION_UNAVAILABLE',
      stage: 'budget',
      instancePath: '/parameters/bins',
      limit: { name: 'returnedTableRows', limit: 500, observed: 501 },
    });

    // At the supported 500-row boundary the same deliberately impossible
    // alignment reaches derivation, proving the earlier failure was a preflight.
    request.parameters.bins.edges.pop();
    request.data.relativeWindow.stop = 500;
    const derived = buildFigure(request);
    expect(derived.ok).toBe(false);
    if (derived.ok) return;
    expect(derived.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        stage: 'science',
        instancePath: '/data/eventTimes/values/0',
      }),
    ]));
  });

  it('refuses a non-time alignment unit in prebinned mode', () => {
    const request = example('prebinned');
    request.data.alignmentUnit = 'mV';
    const validation = validateRequestValue(request);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          instancePath: '/data/alignmentUnit',
          validatorId: 'psth.alignment_declared',
        }),
      ]));
    }
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        instancePath: '/data/alignmentUnit',
      }),
    ]));
  });

  it('rejects a non-time bin unit at strict validation, before derivation', () => {
    const request = example('events');
    request.parameters.bins.unit = 'mV';
    const validation = validateRequestValue(request);
    expect(validation.ok).toBe(false);
    if (validation.ok) return;
    expect(validation.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        instancePath: '/parameters/bins/unit',
        validatorId: 'psth.alignment_declared',
      }),
    ]));
  });

  it.each(['events', 'prebinned'] as const)(
    'refuses a closed %s window whose final bin remains half-open',
    (mode) => {
      const request = example(mode);
      request.data.relativeWindow.boundary = '[start,stop]';
      const result = buildFigure(request);
      expect(result.ok).toBe(false);
    },
  );

  it('requires supplied count assertions to equal the exact safe integer', () => {
    const request = example('prebinned');
    request.parameters.normalization = 'count';
    delete request.parameters.baseline;
    request.data.rates = {
      kind: 'count',
      unit: '1',
      values: [null, 3, 12 - 1e-12, 6],
    };
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/rates/values/2',
      }),
    ]));
  });

  it.each([-0.5, 0.5])(
    'does not let a large peak hide an invalid zero-bin supplied rate %s',
    (invalidZeroRate) => {
      const request = example('prebinned');
      request.data.trialIds = ['t1'];
      request.data.alignmentTimes = [0];
      request.data.counts = [1_000_000_000_000, 0];
      request.data.trialDenominators = [1, 1];
      request.data.recordedSenderCount = 1;
      request.data.includedTrialCount = 1;
      request.data.excludedTrialCount = 0;
      request.data.rates = {
        kind: 'firing_rate',
        unit: 'Hz',
        values: [1_000_000_000_000, invalidZeroRate],
      };
      request.data.relativeWindow = {
        start: 0,
        stop: 2,
        unit: 's',
        boundary: '[start,stop)',
      };
      request.parameters.bins = {
        mode: 'edges',
        unit: 's',
        edges: [0, 1, 2],
        boundary: '[lo,hi)',
        finalEdgeInclusive: false,
      };
      request.parameters.denominatorPolicy = 'uniform_trial_count';
      delete request.parameters.baseline;

      const result = buildFigure(request);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          instancePath: '/data/rates/values/1',
        }),
      ]));
    },
  );

  it('rounds a baseline-corrected contrast from one exact signed rational', () => {
    const result = derivePsth({
      mode: 'prebinned',
      bins: {
        edges: [0, 3, 6],
        unit: 's',
        boundary: '[lo,hi)',
        finalEdgeInclusive: false,
      },
      relativeWindow: { start: 0, stop: 6, unit: 's', boundary: '[start,stop)' },
      normalization: 'total_event_rate_per_trial',
      denominatorPolicy: 'uniform_trial_count',
      baseline: { mode: 'subtract_mean_rate', start: 0, stop: 3 },
      trialIds: ['t'],
      alignmentTimes: [0],
      alignmentUnit: 's',
      counts: [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER],
      trialDenominators: [1, 1],
      recordedSenderCount: 1,
      includedTrialCount: 1,
      excludedTrialCount: 0,
    });

    expect(result.baselineCorrectedValues).toEqual([0, 1 / 3]);
    expect(result.receipt.baselineCorrectionAuthority).toBe(
      'single_exact_signed_rational_difference_one_round_to_binary64',
    );
  });

  it('records every rate-unit conversion, including direct output into kHz', () => {
    const events = buildFigure(example('events'));
    expect(events.ok).toBe(true);
    if (!events.ok) return;
    expect(operation(events).receipt.unitConversions).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'ms', to: 's' }),
    ]));
    expect(events.disclosures.map((entry) => entry.id)).toContain('UNIT_CONVERTED');

    const request = example('prebinned');
    request.data.rates.unit = 'kHz';
    request.data.rates.values = [null, 0.1, 0.24, 0.12];
    const converted = buildFigure(request);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(column(converted, 'valueUnit')).toEqual(['kHz', 'kHz', 'kHz', 'kHz']);
    expect(operation(converted).receipt.unitConversions).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'ms', to: 's' }),
      expect.objectContaining({ from: 'Hz', to: 'kHz' }),
    ]));
  });

  it('refuses bins that collapse in the deterministic SVG coordinate grid', () => {
    const request = example('prebinned');
    request.data.trialIds = ['t1'];
    request.data.alignmentTimes = [0];
    request.data.counts = [1, 0];
    request.data.trialDenominators = [1, 1];
    request.data.recordedSenderCount = 1;
    request.data.includedTrialCount = 1;
    request.data.excludedTrialCount = 0;
    delete request.data.rates;
    request.data.relativeWindow = {
      start: 0,
      stop: 1,
      unit: 's',
      boundary: '[start,stop)',
    };
    request.parameters.bins = {
      mode: 'edges',
      unit: 's',
      edges: [0, 1e-300, 1],
      boundary: '[lo,hi)',
      finalEdgeInclusive: false,
    };
    request.parameters.normalization = 'count';
    request.parameters.denominatorPolicy = 'uniform_trial_count';
    delete request.parameters.baseline;

    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'RENDER_DEGENERATE_DOMAIN',
        stage: 'render',
        instancePath: '/parameters/bins',
      }),
    ]));
  });

  it('rejects an extent-scaled endpoint gap instead of hiding it in a tolerance', () => {
    const extent = 2 ** 53;
    expect(() => derivePsth({
      mode: 'prebinned',
      bins: {
        edges: [10, extent],
        unit: 's',
        boundary: '[lo,hi)',
        finalEdgeInclusive: false,
      },
      relativeWindow: { start: 0, stop: extent, unit: 's', boundary: '[start,stop)' },
      normalization: 'count',
      denominatorPolicy: 'uniform_trial_count',
      trialIds: ['t'],
      alignmentTimes: [0],
      alignmentUnit: 's',
      counts: [0],
      trialDenominators: [1],
      recordedSenderCount: 1,
      includedTrialCount: 1,
      excludedTrialCount: 0,
    })).toThrowError(expect.objectContaining({
      code: 'SCIENCE_BIN_EDGES_INVALID',
      instancePath: '/parameters/bins',
    }));
  });

  it('matches cross-unit baseline bounds by one canonical typed conversion', () => {
    const result = derivePsth({
      mode: 'prebinned',
      bins: {
        edges: [0, 1, 2],
        unit: 'us',
        boundary: '[lo,hi)',
        finalEdgeInclusive: false,
      },
      relativeWindow: { start: 0, stop: 0.002, unit: 'ms', boundary: '[start,stop)' },
      normalization: 'total_event_rate_per_trial',
      denominatorPolicy: 'uniform_trial_count',
      baseline: { mode: 'subtract_mean_rate', start: 0, stop: 0.001 },
      trialIds: ['t'],
      alignmentTimes: [0],
      alignmentUnit: 'ms',
      counts: [1, 1],
      trialDenominators: [1, 1],
      recordedSenderCount: 1,
      includedTrialCount: 1,
      excludedTrialCount: 0,
    });
    expect(result.baselineBinStartIndex).toBe(0);
    expect(result.baselineBinStopIndex).toBe(1);
    expect(result.baselineCorrectedValues).toEqual([0, 0]);
  });

  it('keeps the total direct boundary fail-closed for duplicate denominator identities', () => {
    const direct = (recordedSenderIds: string[], trialIds: string[]) => derivePsth({
      mode: 'events',
      bins: {
        edges: [0, 1],
        unit: 's',
        boundary: '[lo,hi)',
        finalEdgeInclusive: false,
      },
      relativeWindow: { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' },
      normalization: 'count',
      denominatorPolicy: 'uniform_trial_count',
      eventTimes: [],
      eventTimeUnit: 's',
      eventSenderIds: [],
      eventTrialIds: [],
      recordedSenderIds,
      trialIds,
      alignmentTimes: trialIds.map(() => 0),
      alignmentUnit: 's',
    });
    expect(() => direct(['s', 's'], ['t'])).toThrowError(expect.objectContaining({
      code: 'SCIENCE_DENOMINATOR_INVALID',
      instancePath: '/data/recordedSenderIds/1',
    }));
    expect(() => direct(['s'], ['t', 't'])).toThrowError(expect.objectContaining({
      code: 'SCIENCE_DENOMINATOR_INVALID',
      instancePath: '/data/trialIds/1',
    }));
  });

  it('places an uncorrected all-zero rate at the non-negative axis baseline', () => {
    const request = example('prebinned');
    request.parameters.denominatorPolicy = 'uniform_trial_count';
    delete request.parameters.baseline;
    request.data.counts = [0, 0, 0, 0];
    request.data.trialDenominators = [5, 5, 5, 5];
    request.data.rates.values = [0, 0, 0, 0];
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.plan.panels[0];
    const leftAxis = panel.axes.find((axis) => axis.orientation === 'left');
    const zeroTick = leftAxis?.ticks.find((tick) => tick.label === '0');
    expect(zeroTick?.position).toBe(panel.y + panel.height);
  });

  it('requires every boundary convention explicitly instead of stringifying a missing default', () => {
    const missingWindowBoundary = example('events');
    delete missingWindowBoundary.data.relativeWindow.boundary;
    const windowResult = buildFigure(missingWindowBoundary);
    expect(windowResult.ok).toBe(false);

    const missingBinBoundary = example('events');
    delete missingBinBoundary.parameters.bins.boundary;
    const binResult = buildFigure(missingBinBoundary);
    expect(binResult.ok).toBe(false);

    const missingFinalRule = example('events');
    delete missingFinalRule.parameters.bins.finalEdgeInclusive;
    const finalResult = buildFigure(missingFinalRule);
    expect(finalResult.ok).toBe(false);
  });

  it('states when the alignment instant is outside a pre-only or post-only view', () => {
    const request = example('prebinned');
    request.data.relativeWindow = {
      start: 10,
      stop: 50,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    request.parameters.bins.edges = [10, 20, 30, 40, 50];
    delete request.parameters.baseline;
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rules = result.plan.panels[0].marks.filter((mark) => mark.type === 'rule');
    expect(rules).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'rule', orientation: 'vertical', dash: '4 3' }),
    ]));
    expect((result.artifact.accessibility as { summary: string }).summary).toContain(
      'Relative time zero lies outside the displayed window',
    );
  });

  it('makes detached audit rows self-describing', () => {
    const result = buildFigure(example('prebinned'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(column(result, 'seriesId')).toEqual(['unit-07', 'unit-07', 'unit-07', 'unit-07']);
    expect(column(result, 'binUnit')).toEqual(['ms', 'ms', 'ms', 'ms']);
    expect(column(result, 'normalization')).toEqual([
      'total_event_rate_per_trial',
      'total_event_rate_per_trial',
      'total_event_rate_per_trial',
      'total_event_rate_per_trial',
    ]);
    expect(column(result, 'relativeWindowBoundary')).toEqual([
      '[start,stop)', '[start,stop)', '[start,stop)', '[start,stop)',
    ]);
    expect(column(result, 'baselineMode')).toEqual([
      'subtract_mean_rate', 'subtract_mean_rate', 'subtract_mean_rate', 'subtract_mean_rate',
    ]);
  });

  it('fails closed when SVG y-coordinate precision would erase a nonzero count', () => {
    const request = example('prebinned');
    request.data.trialIds = ['t'];
    request.data.alignmentTimes = [0];
    request.data.counts = [Number.MAX_SAFE_INTEGER, 1];
    request.data.trialDenominators = [1, 1];
    request.data.recordedSenderCount = 1;
    request.data.includedTrialCount = 1;
    request.data.excludedTrialCount = 0;
    delete request.data.rates;
    request.data.relativeWindow = { start: 0, stop: 2, unit: 's', boundary: '[start,stop)' };
    request.parameters.bins = {
      mode: 'edges', unit: 's', edges: [0, 1, 2], boundary: '[lo,hi)', finalEdgeInclusive: false,
    };
    request.parameters.normalization = 'count';
    request.parameters.denominatorPolicy = 'uniform_trial_count';
    delete request.parameters.baseline;
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'RENDER_DEGENERATE_DOMAIN', stage: 'render' }),
    ]));
  });

  it('preflights serialized rect width, not only independently rounded endpoints', () => {
    const request = example('prebinned');
    const first = 0.5 + 0.00049 / 624;
    const second = first + 0.0001 / 624;
    request.data.trialIds = ['t'];
    request.data.alignmentTimes = [0];
    request.data.counts = [0, 1, 0];
    request.data.trialDenominators = [1, 1, 1];
    request.data.recordedSenderCount = 1;
    request.data.includedTrialCount = 1;
    request.data.excludedTrialCount = 0;
    delete request.data.rates;
    request.data.relativeWindow = { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' };
    request.parameters.bins = {
      mode: 'edges',
      unit: 's',
      edges: [0, first, second, 1],
      boundary: '[lo,hi)',
      finalEdgeInclusive: false,
    };
    request.parameters.normalization = 'count';
    request.parameters.denominatorPolicy = 'uniform_trial_count';
    delete request.parameters.baseline;
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatchObject({ code: 'RENDER_DEGENERATE_DOMAIN' });
  });

  it('guards runtime discriminators and direct-entrypoint budgets for JavaScript callers', () => {
    const valid: Record<string, any> = {
      mode: 'prebinned',
      bins: {
        edges: [0, 1], unit: 's', boundary: '[lo,hi)', finalEdgeInclusive: false,
      },
      relativeWindow: { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' },
      normalization: 'count',
      denominatorPolicy: 'uniform_trial_count',
      trialIds: ['t'],
      alignmentTimes: [0],
      alignmentUnit: 's',
      counts: [0],
      trialDenominators: [1],
      recordedSenderCount: 1,
      includedTrialCount: 1,
      excludedTrialCount: 0,
    };
    for (const [key, value, path] of [
      ['mode', 'relative_events', '/data/mode'],
      ['normalization', 'rate', '/parameters/normalization'],
      ['denominatorPolicy', 'infer_from_spikes', '/parameters/denominatorPolicy'],
    ] as const) {
      const malformed = { ...valid, [key]: value };
      expect(() => derivePsth(malformed as any)).toThrowError(expect.objectContaining({
        instancePath: path,
      }));
    }
    const overBudget = {
      ...valid,
      bins: {
        ...valid.bins,
        edges: Array.from({ length: 100_002 }, (_unused, index) => index),
      },
    };
    expect(() => derivePsth(overBudget as any)).toThrowError(expect.objectContaining({
      code: 'RESOURCE_OBSERVATIONS_EXCEEDED',
      instancePath: '/parameters/bins',
    }));
  });

  it.each([
    {
      boundary: '[start,stop)',
      binBoundary: '[lo,hi)',
      inclusive: false,
      expected: 'lies on the displayed half-open stop boundary',
    },
    {
      boundary: '[start,stop]',
      binBoundary: '[lo,hi]',
      inclusive: true,
      expected: 'is included by the displayed membership window',
    },
  ] as const)(
    'describes zero membership at a $boundary window ending at zero',
    ({ boundary, binBoundary, inclusive, expected }) => {
      const request = example('prebinned');
      request.data.relativeWindow = { start: -40, stop: 0, unit: 'ms', boundary };
      request.parameters.bins = {
        mode: 'edges',
        unit: 'ms',
        edges: [-40, -30, -20, -10, 0],
        boundary: binBoundary,
        finalEdgeInclusive: inclusive,
      };
      delete request.parameters.baseline;
      const result = buildFigure(request);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(panelSummary(result)).toContain(expected);
    },
  );
});
