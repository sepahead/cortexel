import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  applyTraceNormalization,
  binary64EffectWasPreserved,
  prepareTraceSeries,
} from '../src/analysis/index.js';

const window = { start: 0, stop: 3, unit: 'ms', finalEdgeInclusive: false } as const;

describe('trace preparation', () => {
  it('stably sorts, aggregates duplicates, preserves missingness, and filters half-open windows', () => {
    const result = prepareTraceSeries(
      {
        id: 's',
        label: 'series',
        observationKind: 'point_sample',
        times: [2, 1, 1, 3, -1],
        timeUnit: 'ms',
        values: [20, 10, 14, 30, null],
        valueUnit: 'mV',
      },
      { window, duplicatePolicy: 'aggregate', aggregateMethod: 'mean' },
    );

    expect(result.times).toEqual([1, 2]);
    expect(result.values).toEqual([12, 20]);
    expect(result.replicateCounts).toEqual([2, 1]);
    expect(result.excludedBelow).toBe(1);
    expect(result.excludedAbove).toBe(1);
    expect(result.duplicateGroups).toBe(1);
  });

  it('rejects duplicate timestamps under an absent or reject policy', () => {
    const input = {
      id: 's',
      label: 'series',
      observationKind: 'point_sample' as const,
      times: [1, 1],
      timeUnit: 'ms',
      values: [1, 2],
      valueUnit: 'mV',
    };
    expect(() => prepareTraceSeries(input, { window })).toThrow(/duplicate/);
    expect(() => prepareTraceSeries(input, { window, duplicatePolicy: 'reject' })).toThrow(/duplicate/);
    expect(prepareTraceSeries(input, { window, duplicatePolicy: 'keep_replicates' }).values).toEqual([1, 2]);
  });

  it('converts time/value units once and applies declared clock offsets before filtering', () => {
    const result = prepareTraceSeries(
      {
        id: 's',
        label: 'series',
        observationKind: 'point_sample',
        times: [0, 0.001, 0.002],
        timeUnit: 's',
        timeOffset: { value: 0.5, unit: 'ms' },
        values: [1000, 2000, 3000],
        valueUnit: 'mV',
      },
      { window, targetValueUnit: 'V', duplicatePolicy: 'reject' },
    );
    expect(result.times).toEqual([0.5, 1.5, 2.5]);
    expect(result.values).toEqual([1, 2, 3]);
    expect(result.valueUnit).toBe('V');
  });

  it('uses the declared sample standard deviation for z-score normalization', () => {
    const result = prepareTraceSeries(
      {
        id: 's',
        label: 'series',
        observationKind: 'point_sample',
        times: [0, 1, 2],
        timeUnit: 'ms',
        values: [1, 2, 3],
        valueUnit: 'mV',
      },
      {
        window,
        duplicatePolicy: 'reject',
        normalization: { method: 'z_score', statisticsWindow: window },
      },
    );
    expect(result.values).toEqual([-1, 0, 1]);
    expect(result.valueUnit).toBe('1');
    expect(result.normalization).toMatchObject({
      method: 'z_score',
      basisCount: 3,
      center: 2,
      sampleStandardDeviation: 1,
    });
  });

  it('stays finite at extreme binary64 exponents and refuses an overflowing clock offset', () => {
    const extremeWindow = { start: 0, stop: 3, unit: 'ms', finalEdgeInclusive: false } as const;
    const base = {
      id: 'extreme',
      label: 'extreme',
      observationKind: 'point_sample' as const,
      times: [0, 1],
      timeUnit: 'ms',
      valueUnit: 'mV',
    };

    const duplicateMean = prepareTraceSeries(
      { ...base, times: [0, 0], values: [1e308, 1e308] },
      { window: extremeWindow, duplicatePolicy: 'aggregate', aggregateMethod: 'mean' },
    );
    expect(duplicateMean.values).toEqual([1e308]);

    const duplicateMedian = prepareTraceSeries(
      { ...base, times: [0, 0], values: [1e308, 1e308] },
      { window: extremeWindow, duplicatePolicy: 'aggregate', aggregateMethod: 'median' },
    );
    expect(duplicateMedian.values).toEqual([1e308]);

    const zscore = prepareTraceSeries(
      { ...base, values: [-1e308, 1e308] },
      {
        window: extremeWindow,
        duplicatePolicy: 'reject',
        normalization: { method: 'z_score', statisticsWindow: extremeWindow },
      },
    );
    expect(zscore.values.every((value) => value !== null && Number.isFinite(value))).toBe(true);
    expect(zscore.normalization!.sampleStandardDeviation! / (Math.SQRT2 * 1e308)).toBeCloseTo(1, 15);

    const minMax = prepareTraceSeries(
      { ...base, values: [-1e308, 1e308] },
      {
        window: extremeWindow,
        duplicatePolicy: 'reject',
        normalization: { method: 'min_max', statisticsWindow: extremeWindow },
      },
    );
    expect(minMax.values).toEqual([0, 1]);

    const baseline = prepareTraceSeries(
      { ...base, values: [1e308, 1e308] },
      {
        window: extremeWindow,
        duplicatePolicy: 'reject',
        normalization: { method: 'divide_by_baseline_mean', statisticsWindow: extremeWindow },
      },
    );
    expect(baseline.values).toEqual([1, 1]);

    expect(() => prepareTraceSeries(
      {
        ...base,
        times: [1e308, 1e308],
        values: [1, 2],
        timeOffset: { value: 1e308, unit: 'ms' },
      },
      { window: extremeWindow, duplicatePolicy: 'keep_replicates' },
    )).toThrow(/overflowed binary64|non-finite time/);
  });

  it('forms extreme centred ratios without overflowing an intermediate subtraction', () => {
    const result = applyTraceNormalization(Number.MAX_VALUE, {
      method: 'z_score',
      statisticsWindow: window,
      basisCount: 4,
      center: -Number.MAX_VALUE / 4,
      sampleStandardDeviation: Number.MAX_VALUE / 2,
    });
    expect(result).toBeCloseTo(2.5, 14);
  });

  it('computes duplicate means independently of replicate order under cancellation', () => {
    const samples = [1e16, 1, -1e16];
    const options = {
      window: { start: 0, stop: 1, unit: 'ms', finalEdgeInclusive: false } as const,
      duplicatePolicy: 'aggregate' as const,
      aggregateMethod: 'mean' as const,
    };
    const derive = (values: number[]) => prepareTraceSeries(
      {
        id: 'mean',
        label: 'mean',
        observationKind: 'point_sample',
        times: values.map(() => 0),
        timeUnit: 'ms',
        values,
        valueUnit: 'mV',
      },
      options,
    ).values[0];
    expect(derive(samples)).toBeCloseTo(1 / 3, 15);
    expect(derive([...samples].reverse())).toBe(derive(samples));
  });

  it('is permutation-invariant for unique timestamps and conserves the window partition', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            time: fc.integer({ min: -100, max: 100 }),
            value: fc.double({ min: -1e6, max: 1e6, noNaN: true }),
          }),
          { minLength: 1, maxLength: 30, selector: (sample) => sample.time },
        ),
        (samples) => {
          const options = {
            window: { start: -50, stop: 51, unit: 'ms', finalEdgeInclusive: false } as const,
            duplicatePolicy: 'reject' as const,
          };
          const makeInput = (ordered: typeof samples) => ({
            id: 'p',
            label: 'property',
            observationKind: 'point_sample' as const,
            times: ordered.map((sample) => sample.time),
            timeUnit: 'ms',
            values: ordered.map((sample) => sample.value),
            valueUnit: 'mV',
          });
          const forward = prepareTraceSeries(makeInput(samples), options);
          const reverse = prepareTraceSeries(makeInput([...samples].reverse()), options);
          expect(reverse.times).toEqual(forward.times);
          expect(reverse.values).toEqual(forward.values);
          expect(forward.outputCount + forward.excludedBelow + forward.excludedAbove).toBe(samples.length);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('normalizes every nonconstant finite sample to zero mean and unit sample variance', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: -1000, max: 1000 }), { minLength: 2, maxLength: 30 }),
        (values) => {
          const localWindow = {
            start: 0,
            stop: values.length,
            unit: 'ms',
            finalEdgeInclusive: true,
          } as const;
          const result = prepareTraceSeries(
            {
              id: 'z',
              label: 'z',
              observationKind: 'point_sample',
              times: values.map((_value, index) => index),
              timeUnit: 'ms',
              values,
              valueUnit: 'mV',
            },
            {
              window: localWindow,
              duplicatePolicy: 'reject',
              normalization: { method: 'z_score', statisticsWindow: localWindow },
            },
          );
          const normalized = result.values as number[];
          const center = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
          const variance = normalized.reduce((sum, value) => sum + (value - center) ** 2, 0) /
            (normalized.length - 1);
          expect(center).toBeCloseTo(0, 11);
          expect(variance).toBeCloseTo(1, 11);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('uses exact baseline authority and refuses a mathematically zero denominator', () => {
    const localWindow = { start: 0, stop: 4, unit: 'ms', finalEdgeInclusive: false } as const;
    const derive = (values: number[]) => prepareTraceSeries(
      {
        id: 'baseline',
        label: 'baseline',
        observationKind: 'point_sample',
        times: values.map((_value, index) => index),
        timeUnit: 'ms',
        values,
        valueUnit: 'mV',
      },
      {
        window: localWindow,
        normalization: { method: 'divide_by_baseline_mean', statisticsWindow: localWindow },
      },
    );

    const ordinary = derive([-3, 1, 1, 2]);
    expect(ordinary.values).toEqual([-12, 4, 4, 8]);
    expect(ordinary.normalization?.baselineMean).toBe(0.25);
    expect(ordinary.normalization?.baselineSumMinSubnormalUnits).toMatch(/^\d+$/);
    expect(() => derive([-19, -1, 20])).toThrow(/strictly positive/);

    const subnormal = derive([Number.MIN_VALUE, -Number.MIN_VALUE, Number.MIN_VALUE]);
    expect(subnormal.values).toEqual([3, -3, 3]);
    expect(subnormal.normalization?.baselineMean).toBeUndefined();
    expect(subnormal.normalization?.baselineSumMinSubnormalUnits).toBe('1');
  });

  it('keeps z-score receipts permutation-invariant and supports legacy receipts', () => {
    const values = [338, 152, 150, -2];
    const derive = (ordered: number[]) => {
      const localWindow = {
        start: 0,
        stop: ordered.length,
        unit: 'ms',
        finalEdgeInclusive: true,
      } as const;
      return prepareTraceSeries(
        {
          id: 'z',
          label: 'z',
          observationKind: 'point_sample',
          times: ordered.map((_value, index) => index),
          timeUnit: 'ms',
          values: ordered,
          valueUnit: 'mV',
        },
        {
          window: localWindow,
          normalization: { method: 'z_score', statisticsWindow: localWindow },
        },
      );
    };
    const forward = derive(values);
    const reverse = derive([...values].reverse());
    expect(reverse.normalization).toEqual(forward.normalization);
    expect([...reverse.values].reverse()).toEqual(forward.values);
    expect(applyTraceNormalization(5, {
      method: 'z_score',
      statisticsWindow: window,
      basisCount: 2,
      center: 5,
      sampleStandardDeviation: 2,
    })).toBe(0);
  });

  it('refuses unit and clock transforms that materially distort adjacent spacings', () => {
    const input = {
      id: 'resolution',
      label: 'resolution',
      observationKind: 'point_sample' as const,
      times: [1000, 1000.0000000000001],
      timeUnit: 'ms',
      values: [1000, 1000.0000000000001],
      valueUnit: 'mV',
    };
    expect(() => prepareTraceSeries(input, {
      window: { start: 0, stop: 3, unit: 's', finalEdgeInclusive: true },
    })).toThrow(/materially distorted/);
    expect(() => prepareTraceSeries({ ...input, times: [0, 1] }, {
      window: { start: 0, stop: 2, unit: 'ms', finalEdgeInclusive: true },
      targetValueUnit: 'V',
    })).toThrow(/materially distorted/);
    expect(() => prepareTraceSeries({
      ...input,
      timeOffset: { value: 1048.2, unit: 'ms' },
    }, {
      window: { start: 2000, stop: 2100, unit: 'ms', finalEdgeInclusive: true },
    })).toThrow(/materially distorted/);
  });

  it('validates the direct analysis boundary and canonicalizes signed zero', () => {
    const base = {
      id: 'boundary',
      label: 'boundary',
      observationKind: 'point_sample' as const,
      times: [-0],
      timeUnit: 'ms',
      values: [-0],
      valueUnit: 'mV',
    };
    const result = prepareTraceSeries(base, {
      window: { start: -1, stop: 1, unit: 'ms', finalEdgeInclusive: true },
    });
    expect(Object.is(result.times[0], -0)).toBe(false);
    expect(Object.is(result.values[0], -0)).toBe(false);

    expect(() => prepareTraceSeries({ ...base, timeUnit: 'frogs' }, {
      window: { start: -1, stop: 1, unit: 'frogs', finalEdgeInclusive: true },
    })).toThrow(/registered time units/);
    expect(() => prepareTraceSeries(base, {
      window: { start: -1, stop: 1, unit: 'ms', finalEdgeInclusive: true },
      normalization: {
        method: 'min_max',
        statisticsWindow: { start: 0, stop: Infinity, unit: 'ms', finalEdgeInclusive: false },
      },
    })).toThrow(/statistics window.*finite increasing/);
    expect(() => prepareTraceSeries(base, {
      window: { start: -1, stop: 1, unit: 'ms', finalEdgeInclusive: true },
      normalization: {
        method: 'min_max',
        statisticsWindow: { start: 0, stop: 1, unit: 's', finalEdgeInclusive: false },
      },
    })).toThrow(/display-time unit/);
    expect(() => prepareTraceSeries({ ...base, timeOffset: { value: Infinity, unit: 'ms' } }, {
      window: { start: -1, stop: 1, unit: 'ms', finalEdgeInclusive: true },
    })).toThrow(/offset must be finite/);
    expect(() => prepareTraceSeries(base, {
      window: { start: -1, stop: 1, unit: 'ms', finalEdgeInclusive: true },
      duplicatePolicy: 'bogus' as never,
    })).toThrow(/unknown trace duplicate policy/);
  });

  it('uses the exact published effect-relative predicate', () => {
    expect(binary64EffectWasPreserved(
      4.765722808368112e-185,
      4.7657228083681035e-185,
    )).toBe(false);
  });

  it('refuses boundary ownership changed by cross-unit rounding', () => {
    const input = {
      id: 'boundary-rounding',
      label: 'boundary rounding',
      observationKind: 'point_sample' as const,
      times: [1000.0000000000001],
      timeUnit: 'ms',
      values: [1],
      valueUnit: 'mV',
    };
    expect(() => prepareTraceSeries(input, {
      window: {
        start: 0,
        stop: 1.0000000000000002,
        unit: 's',
        finalEdgeInclusive: false,
      },
    })).toThrow(/rounds across a display-window boundary/);
    expect(() => prepareTraceSeries(input, {
      window: {
        start: 1.0000000000000002,
        stop: 2,
        unit: 's',
        finalEdgeInclusive: false,
      },
    })).toThrow(/rounds across a display-window boundary/);
  });

  it('rounds a converted clock sum once and refuses a nonzero exact sum that underflows', () => {
    const exact = prepareTraceSeries(
      {
        id: 'sum',
        label: 'sum',
        observationKind: 'point_sample',
        times: [-1.2576252617050679e-05],
        timeUnit: 'ms',
        timeOffset: { value: -0.0005579512586898977, unit: 'ms' },
        values: [1],
        valueUnit: 'mV',
      },
      {
        window: { start: -1, stop: 1, unit: 's', finalEdgeInclusive: true },
      },
    );
    expect(exact.times).toEqual([-5.705275113069484e-7]);

    expect(() => prepareTraceSeries(
      {
        id: 'underflow',
        label: 'underflow',
        observationKind: 'point_sample',
        times: [1000 * Number.MIN_VALUE],
        timeUnit: 'ms',
        timeOffset: { value: -999999 * Number.MIN_VALUE, unit: 'us' },
        values: [1],
        valueUnit: 'mV',
      },
      {
        window: { start: -1, stop: 1, unit: 's', finalEdgeInclusive: true },
      },
    )).toThrow(/underflowed/);
  });
});
