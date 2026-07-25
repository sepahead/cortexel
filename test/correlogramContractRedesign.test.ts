import { readFileSync } from 'node:fs';
import path from 'node:path';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CorrelogramDerivationError,
  computeCorrelogram,
  deriveCorrelogramPairAccounting,
  deriveCorrelogramTargetRates,
  deriveEligibleCorrelogramReferenceCounts,
  deriveTypedEventCorrelogram,
  PairwiseBudgetExceededError,
} from '../src/analysis/correlogram.js';
import { canonicalDigest } from '../src/core/canonicalize.js';
import {
  correlogramEventTrainsValid,
  correlogramLagRangeValid,
  correlogramPrebinnedAxisConsistent,
  correlogramRolesDisjoint,
  correlogramStatisticDenominator,
} from '../src/core/semantics/spikes.js';
import { windowValid } from '../src/core/semantics/events.js';
import type { CortexelError } from '../src/core/errors.js';

const root = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(readFileSync(
  path.join(root, 'contract/skills/neuro.correlogram.v1.json'),
  'utf8',
)) as {
  requestSchema: { data: object; parameters: object };
  science: { normalization: string[]; derivation: string[]; uncertaintySupport: string[] };
  accessibility: {
    summaryTemplate: string;
    tableColumns: { key: string; description?: string }[];
  };
  examples: {
    valid: Record<string, any>[];
    invalid: { expectedCode: string; request: Record<string, any> }[];
  };
};

const errorRegistry = JSON.parse(readFileSync(
  path.join(root, 'contract/registries/error-codes.v1.json'),
  'utf8',
)) as {
  codes: { code: string; summary: string; correctiveAction: string }[];
};

function sourceStructuralValidator(): ValidateFunction {
  const generated = JSON.parse(readFileSync(
    path.join(root, 'contract/schemas/skills/neuro.correlogram.request.v1.schema.json'),
    'utf8',
  ));
  generated.properties.data = source.requestSchema.data;
  generated.properties.parameters = source.requestSchema.parameters;

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    strictTypes: false,
  });
  ajv.addSchema(JSON.parse(readFileSync(
    path.join(root, 'contract/schemas/generated/registry-enums.v1.schema.json'),
    'utf8',
  )));
  ajv.addSchema(JSON.parse(readFileSync(
    path.join(root, 'contract/schemas/common.v1.schema.json'),
    'utf8',
  )));
  return ajv.compile(generated);
}

const validateStructure = sourceStructuralValidator();

function semanticErrors(request: Record<string, unknown>): CortexelError[] {
  const context = { request, skillId: 'neuro.correlogram' };
  return [
    ...windowValid({ ...context, parameters: { pointer: '/data/window', unitDimension: 'time' } }),
    ...correlogramEventTrainsValid(context),
    ...correlogramRolesDisjoint(context),
    ...correlogramLagRangeValid(context),
    ...correlogramPrebinnedAxisConsistent(context),
    ...correlogramStatisticDenominator(context),
  ];
}

function structuralSummary(): string {
  return (validateStructure.errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.keyword}: ${error.message ?? ''}`)
    .join('\n');
}

function valid(mode: string): Record<string, any> {
  const request = source.examples.valid.find((candidate) => candidate.data.mode === mode);
  if (!request) throw new Error(`missing living ${mode} example`);
  return structuredClone(request);
}

type LiteralTimeUnit = 'ms' | 'us';

function literalMicroseconds(value: number, unit: LiteralTimeUnit): bigint {
  return BigInt(value) * (unit === 'ms' ? 1_000n : 1n);
}

function literalBinIndex(lag: bigint, edges: readonly number[]): number {
  if (lag < BigInt(edges[0]) || lag >= BigInt(edges[edges.length - 1])) return -1;
  for (let index = 0; index < edges.length - 1; index++) {
    if (lag >= BigInt(edges[index]) && lag < BigInt(edges[index + 1])) return index;
  }
  throw new Error('literal half-open bin oracle failed to classify an in-range lag');
}

function literalTypedCorrelogramOracle(input: {
  readonly referenceTimes: readonly number[];
  readonly referenceTimeUnit: LiteralTimeUnit;
  readonly targetTimes: readonly number[];
  readonly targetTimeUnit: LiteralTimeUnit;
  readonly kind: 'auto' | 'cross';
  readonly edges: readonly number[];
  readonly edgeCorrection: 'none' | 'eligible_reference_events';
  readonly windowBoundary: '[start,stop)' | '[start,stop]' | '(start,stop]';
}): {
  readonly counts: readonly number[];
  readonly eligibleReferenceEventCounts: readonly number[];
  readonly candidatePairCount: number;
  readonly countedPairCount: number;
  readonly notCountedPairCount: number;
  readonly lagOutOfRangePairCount: number;
  readonly edgeIneligibleInRangePairCount: number;
  readonly sameEventSelfPairCountExcluded: number;
  readonly zeroLagRetainedDistinctPairs: number;
} {
  const reference = input.referenceTimes.map((value) =>
    literalMicroseconds(value, input.referenceTimeUnit));
  const target = input.kind === 'auto'
    ? reference
    : input.targetTimes.map((value) => literalMicroseconds(value, input.targetTimeUnit));
  const windowStart = -4_000n;
  const windowStop = 4_000n;
  const eligible = reference.map((time) => input.edges.slice(0, -1).map((lower, index) => {
    if (input.edgeCorrection === 'none') return true;
    const lowerEndpoint = time + BigInt(lower);
    const upperEndpoint = time + BigInt(input.edges[index + 1]);
    const lowerInside = input.windowBoundary === '(start,stop]'
      ? lowerEndpoint > windowStart
      : lowerEndpoint >= windowStart;
    return lowerInside && upperEndpoint <= windowStop;
  }));
  const eligibleReferenceEventCounts = input.edges.slice(0, -1).map((_edge, index) =>
    eligible.filter((bins) => bins[index]).length);
  const counts = new Array<number>(input.edges.length - 1).fill(0);
  let countedPairCount = 0;
  let lagOutOfRangePairCount = 0;
  let edgeIneligibleInRangePairCount = 0;
  let sameEventSelfPairCountExcluded = 0;
  let zeroLagRetainedDistinctPairs = 0;
  for (let referenceOrdinal = 0; referenceOrdinal < reference.length; referenceOrdinal++) {
    for (let targetOrdinal = 0; targetOrdinal < target.length; targetOrdinal++) {
      if (input.kind === 'auto' && referenceOrdinal === targetOrdinal) {
        sameEventSelfPairCountExcluded++;
        continue;
      }
      const lag = target[targetOrdinal] - reference[referenceOrdinal];
      const index = literalBinIndex(lag, input.edges);
      if (index < 0) {
        lagOutOfRangePairCount++;
      } else if (!eligible[referenceOrdinal][index]) {
        edgeIneligibleInRangePairCount++;
      } else {
        counts[index]++;
        countedPairCount++;
        if (lag === 0n) zeroLagRetainedDistinctPairs++;
      }
    }
  }
  const candidatePairCount = reference.length * target.length;
  return {
    counts,
    eligibleReferenceEventCounts,
    candidatePairCount,
    countedPairCount,
    notCountedPairCount: lagOutOfRangePairCount + edgeIneligibleInRangePairCount,
    lagOutOfRangePairCount,
    edgeIneligibleInRangePairCount,
    sameEventSelfPairCountExcluded,
    zeroLagRetainedDistinctPairs,
  };
}

describe('unreleased correlogram role-product contract', () => {
  it('accepts every new living shape structurally and semantically', () => {
    for (const [index, request] of source.examples.valid.entries()) {
      expect(validateStructure(request), `valid[${index}]\n${structuralSummary()}`).toBe(true);
      expect(
        semanticErrors(request).map((error) => [error.code, error.instancePath]),
        `valid[${index}]`,
      ).toEqual([]);
    }
  });

  it('keeps a silent target cross because roles come from containers, not active senders', () => {
    const request = valid('events_cross');
    expect(request.data.targetTrain.eventTimes.values).toEqual([]);
    expect(request.data.targetTrain.recordedSenderIds.length).toBeGreaterThan(0);
    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([]);
    expect(request.data.mode).toBe('events_cross');
  });

  it('treats a completely observed silent role as zero-pair data', () => {
    const result = computeCorrelogram(
      [1, 2],
      [],
      { edges: [-1.5, -0.5, 0.5, 1.5], finalEdgeInclusive: false },
      'cross',
    );
    expect(result.counts).toEqual([0, 0, 0]);
    expect(result.totalPairs).toBe(0);

    const derivation = source.science.derivation.join('\n');
    expect(derivation).toContain('measured zero-event data, not missing data');
    expect(derivation).not.toContain('RENDER_NO_DATA');
    expect(source.accessibility.summaryTemplate).toContain('{candidatePairCount}');
    expect(source.accessibility.summaryTemplate).toContain('{notCountedPairCount}');
    expect(source.accessibility.summaryTemplate).toContain('{notCountedPairBreakdown}');
    expect(source.accessibility.summaryTemplate).toContain('{sourceAuthorityStatement}');
    expect(source.accessibility.summaryTemplate).not.toContain('raw counts and duration are derived');
    expect(source.accessibility.summaryTemplate).not.toMatch(/\{pairsCounted\} pairs counted/u);

    const pairCount = source.accessibility.tableColumns.find((column) => column.key === 'pairCount');
    const value = source.accessibility.tableColumns.find((column) => column.key === 'value');
    const valueStatus = source.accessibility.tableColumns.find(
      (column) => column.key === 'valueStatus',
    );
    expect(pairCount?.description).toContain('numerator');
    expect(value?.description).toContain('null');
    expect(valueStatus?.description).toContain('undefined_zero_eligible_reference_events');
    expect(source.accessibility.tableColumns.find((column) => column.key === 'denominator')?.description)
      .toContain('exposure in seconds');
  });

  it('pins the revision-4 exact typed-time order and corrected-subset claims', () => {
    const normalization = source.science.normalization.join('\n');
    const derivation = source.science.derivation.join('\n');

    expect(normalization).toContain(
      'stably orders internal search records by physical event time and source ordinal',
    );
    expect(normalization).toContain('exact signed physical difference target_time - reference_time');
    expect(normalization).toContain('Absolute event times are never individually rounded');
    expect(derivation).toContain('algorithm revision 2');
    expect(derivation).toContain('Stable typed-time search order changes neither');
    expect(derivation).toContain('one source train in both roles');
    expect(derivation).toContain('IDENTICAL reference-ordinal subset');
    expect(derivation).toContain('the corrected numerator and rate need not be symmetric');
    expect(derivation).toContain('n_reference(log n_target + log B) + P log B + B');
    expect(derivation).toContain(
      'candidate ordered pairs = counted numerator pairs + other not-counted pairs + same-event self-pairs excluded',
    );
    expect(derivation).toContain(
      'a large but lag-sparse or edge-ineligible product is not refused merely for being large',
    );
  });

  it('converts the bin width into the lag unit once and rejects non-time lag axes', () => {
    const converted = valid('events_auto');
    converted.parameters.bins = { unit: 'us', width: 1_000 };
    expect(validateStructure(converted), structuralSummary()).toBe(true);
    expect(semanticErrors(converted)).toEqual([]);

    const voltageAxis = valid('events_auto');
    voltageAxis.parameters.lagRange.unit = 'mV';
    voltageAxis.parameters.bins.unit = 'mV';
    expect(validateStructure(voltageAxis), structuralSummary()).toBe(true);
    expect(semanticErrors(voltageAxis).map((error) => error.code)).toContain(
      'SCIENCE_UNIT_DIMENSION_MISMATCH',
    );
  });

  it('compares a pre-binned axis after one registered unit conversion', () => {
    const request = valid('prebinned_auto');
    request.data.binEdges = {
      unit: 'us',
      edges: request.data.binEdges.edges.map((edge: number) => edge * 1_000),
    };

    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([]);
  });

  it('honors every declared observation-window endpoint closure literally', () => {
    const at = (time: number, boundary: string) => {
      const request = valid('events_auto');
      request.data.window.boundary = boundary;
      request.data.train.eventTimes.values = [time];
      request.data.train.eventSenderIds = ['e1'];
      delete request.data.train.eventIds;
      expect(validateStructure(request), structuralSummary()).toBe(true);
      return semanticErrors(request).map((error) => error.code);
    };

    expect(at(0, '[start,stop)')).not.toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(10, '[start,stop)')).toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(0, '[start,stop]')).not.toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(10, '[start,stop]')).not.toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(0, '(start,stop]')).toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(10, '(start,stop]')).not.toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
  });

  it('keeps zero-denominator rate bins as explicit null-with-reason values', () => {
    const request = valid('events_cross');
    request.data.referenceTrain.eventTimes.values = [];
    request.data.referenceTrain.eventSenderIds = [];
    request.parameters.statistic = 'target_rate_per_reference_event';
    request.parameters.edgeCorrection = 'none';

    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([]);
    expect(deriveCorrelogramTargetRates(
      [0, 2, 0],
      [0, 4, 0],
      { value: 1, unit: 'ms' },
    )).toEqual([
      {
        pairCount: 0,
        eligibleReferenceEvents: 0,
        denominatorSeconds: 0,
        value: null,
        status: 'undefined_zero_eligible_reference_events',
      },
      {
        pairCount: 2,
        eligibleReferenceEvents: 4,
        denominatorSeconds: 0.004,
        value: 500,
        status: 'defined',
      },
      {
        pairCount: 0,
        eligibleReferenceEvents: 0,
        denominatorSeconds: 0,
        value: null,
        status: 'undefined_zero_eligible_reference_events',
      },
    ]);
    expect(() => deriveCorrelogramTargetRates([1], [0], { value: 1, unit: 'ms' })).toThrow(
      'must be zero when no reference event is eligible',
    );
  });

  it('derives eligible-reference counts by exact typed sums and literal window closure', () => {
    const edges = [-500, 500];
    expect(deriveEligibleCorrelogramReferenceCounts(
      [0.5],
      's',
      edges,
      'ms',
      { start: 0, stop: 2, unit: 's', boundary: '[start,stop)' },
    )).toEqual([1]);
    expect(deriveEligibleCorrelogramReferenceCounts(
      [0.5],
      's',
      edges,
      'ms',
      { start: 0, stop: 2, unit: 's', boundary: '(start,stop]' },
    )).toEqual([0]);

    expect(() => deriveEligibleCorrelogramReferenceCounts(
      [0],
      'ms',
      [0.5, -0.5],
      'ms',
      { start: 0, stop: 1, unit: 'ms', boundary: '[start,stop)' },
    )).toThrow('strictly increasing');
  });

  it('matches a literal eligibility oracle across randomized closures without a bins-by-events scan', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -20, max: 30 }), { maxLength: 200 }),
        fc.constantFrom('[start,stop)', '[start,stop]', '(start,stop]'),
        (times, boundary) => {
          const edges = [-5, -3, -1, 1, 3, 5];
          const expected = edges.slice(0, -1).map((lower, index) => {
            const upper = edges[index + 1];
            return times.filter((time) => {
              const lowerInside = boundary === '(start,stop]'
                ? time + lower > 0
                : time + lower >= 0;
              return lowerInside && time + upper <= 10;
            }).length;
          });
          expect(deriveEligibleCorrelogramReferenceCounts(
            times,
            'ms',
            edges,
            'ms',
            { start: 0, stop: 10, unit: 'ms', boundary },
          )).toEqual(expected);
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('classifies a large-origin cross-unit lag before one signed-difference rounding', () => {
    const result = deriveTypedEventCorrelogram({
      kind: 'cross',
      referenceTimes: [1.693447539283061],
      referenceTimeUnit: 's',
      targetTimes: [1.6934475392830612],
      targetTimeUnit: 's',
      bins: {
        edges: [-2.5e-13, -1.5e-13, -0.5e-13, 0.5e-13, 1.5e-13, 2.5e-13],
        unit: 'ms',
        finalEdgeInclusive: false,
      },
      edgeCorrection: 'none',
      maximumPairwiseOperations: 1,
    });

    expect(result.counts).toEqual([0, 0, 0, 0, 1]);
    expect(result.pairAccounting).toEqual({
      candidatePairCount: 1,
      countedPairCount: 1,
      notCountedPairCount: 0,
      sameEventSelfPairCountExcluded: 0,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: 0,
        edgeIneligibleInRangePairCount: 0,
      },
    });
    expect(result.receipt).toMatchObject({
      algorithmRevision: 2,
      lagArithmetic: 'exact_typed_difference_classify_then_one_round',
      pairIteration: 'stable_time_then_source_ordinal_exact_target_slices',
    });
  });

  it('fails closed when the one rounded lag would cross its exact bin boundary', () => {
    const derive = () => deriveTypedEventCorrelogram({
      kind: 'cross',
      referenceTimes: [0],
      referenceTimeUnit: 's',
      targetTimes: [3.0204991232161828e299],
      targetTimeUnit: 's',
      bins: {
        edges: [
          3.0204991232161826e302,
          3.020499123216183e302,
          3.0204991232161833e302,
        ],
        unit: 'ms',
        finalEdgeInclusive: false,
      },
      edgeCorrection: 'none',
      maximumPairwiseOperations: 1,
    });

    expect(derive).toThrow(CorrelogramDerivationError);
    try {
      derive();
      throw new Error('expected exact-to-rounded bin crossing to fail closed');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        instancePath: '/targetTimes/0',
      });
      expect((error as Error).message).toContain('classifies into bin 0');
      expect((error as Error).message).toContain('rounded ms value classifies into bin 1');
    }
  });

  it('uses one reference eligibility subset for the corrected numerator and denominator', () => {
    const result = deriveTypedEventCorrelogram({
      kind: 'cross',
      referenceTimes: [5, 9.8],
      referenceTimeUnit: 'ms',
      targetTimes: [5.1, 9.9],
      targetTimeUnit: 'ms',
      bins: {
        edges: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5],
        unit: 'ms',
        finalEdgeInclusive: false,
      },
      edgeCorrection: 'eligible_reference_events',
      window: { start: 0, stop: 10, unit: 'ms', boundary: '[start,stop)' },
      maximumPairwiseOperations: 4,
    });

    expect(result.counts).toEqual([0, 0, 1, 0, 0]);
    expect(result.eligibleReferenceEventCounts).toEqual([2, 2, 1, 1, 1]);
    expect(result.pairAccounting).toEqual({
      candidatePairCount: 4,
      countedPairCount: 1,
      notCountedPairCount: 3,
      sameEventSelfPairCountExcluded: 0,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: 2,
        edgeIneligibleInRangePairCount: 1,
      },
    });
    expect(deriveCorrelogramTargetRates(
      result.counts,
      result.eligibleReferenceEventCounts,
      { value: 1, unit: 'ms' },
    )[2]).toMatchObject({ pairCount: 1, eligibleReferenceEvents: 1, value: 1_000 });
  });

  it('preserves auto source ordinals while retaining distinct coincident ordered pairs', () => {
    const result = deriveTypedEventCorrelogram({
      kind: 'auto',
      referenceTimes: [0, 0],
      referenceTimeUnit: 'ms',
      bins: { edges: [-0.5, 0.5], unit: 'ms', finalEdgeInclusive: false },
      edgeCorrection: 'none',
      maximumPairwiseOperations: 4,
    });

    expect(result.counts).toEqual([2]);
    expect(result.zeroLagRetainedDistinctPairs).toBe(2);
    expect(result.pairAccounting).toMatchObject({
      candidatePairCount: 4,
      countedPairCount: 2,
      notCountedPairCount: 0,
      sameEventSelfPairCountExcluded: 2,
    });
  });

  it('budgets admitted pair enumeration while preserving sparse role-product accounting', () => {
    const overBudget = () => deriveTypedEventCorrelogram({
      kind: 'cross',
      referenceTimes: [0, 1, 2],
      referenceTimeUnit: 'ms',
      targetTimes: [0, 1, 2],
      targetTimeUnit: 'ms',
      bins: { edges: [-4, 4], unit: 'ms', finalEdgeInclusive: false },
      edgeCorrection: 'none',
      maximumPairwiseOperations: 8,
    });
    expect(overBudget).toThrow(PairwiseBudgetExceededError);
    try {
      overBudget();
      throw new Error('expected typed candidate-product budget failure');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'RESOURCE_PAIRWISE_EXCEEDED',
        instancePath: '/maximumPairwiseOperations',
        limit: 8,
        observedLowerBound: 9,
      });
    }

    const sparse = deriveTypedEventCorrelogram({
      kind: 'cross',
      referenceTimes: new Array<number>(100).fill(0),
      referenceTimeUnit: 'ms',
      targetTimes: new Array<number>(100).fill(1_000_000),
      targetTimeUnit: 'ms',
      bins: { edges: [-1, 1], unit: 'ms', finalEdgeInclusive: false },
      edgeCorrection: 'none',
      maximumPairwiseOperations: 0,
    });
    expect(sparse.counts).toEqual([0]);
    expect(sparse.pairAccounting).toMatchObject({
      candidatePairCount: 10_000,
      countedPairCount: 0,
      notCountedPairCount: 10_000,
      sameEventSelfPairCountExcluded: 0,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: 10_000,
        edgeIneligibleInRangePairCount: 0,
      },
    });

    const edgeIneligible = deriveTypedEventCorrelogram({
      kind: 'cross',
      referenceTimes: new Array<number>(100).fill(9.8),
      referenceTimeUnit: 'ms',
      targetTimes: new Array<number>(100).fill(9.9),
      targetTimeUnit: 'ms',
      bins: { edges: [-0.5, 0.5], unit: 'ms', finalEdgeInclusive: false },
      edgeCorrection: 'eligible_reference_events',
      window: { start: 0, stop: 10, unit: 'ms', boundary: '[start,stop)' },
      maximumPairwiseOperations: 0,
    });
    expect(edgeIneligible.counts).toEqual([0]);
    expect(edgeIneligible.eligibleReferenceEventCounts).toEqual([0]);
    expect(edgeIneligible.pairAccounting).toMatchObject({
      candidatePairCount: 10_000,
      countedPairCount: 0,
      notCountedPairCount: 10_000,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: 0,
        edgeIneligibleInRangePairCount: 10_000,
      },
    });

    try {
      deriveTypedEventCorrelogram({
        kind: 'cross',
        referenceTimes: [0],
        referenceTimeUnit: 'mV',
        targetTimes: [0],
        targetTimeUnit: 'ms',
        bins: { edges: [-1, 1], unit: 'ms', finalEdgeInclusive: false },
        edgeCorrection: 'none',
      });
      throw new Error('expected typed numeric-unit failure');
    } catch (error) {
      expect(error).toBeInstanceOf(CorrelogramDerivationError);
      expect(error).toMatchObject({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        instancePath: '/referenceTimeUnit',
      });
    }
  });

  it('matches a literal exact-integer cross-unit oracle over ordinal role products', () => {
    const train = fc.constantFrom<LiteralTimeUnit>('ms', 'us').chain((unit) => fc.record({
      unit: fc.constant(unit),
      values: fc.array(
        fc.integer(unit === 'ms' ? { min: -3, max: 3 } : { min: -3_000, max: 3_000 }),
        { maxLength: 8 },
      ),
    }));
    const edges = [-2_500, -1_000, 0, 1_000, 2_500] as const;

    fc.assert(
      fc.property(
        train,
        train,
        fc.boolean(),
        fc.constantFrom<'none' | 'eligible_reference_events'>(
          'none',
          'eligible_reference_events',
        ),
        fc.constantFrom<'[start,stop)' | '[start,stop]' | '(start,stop]'>(
          '[start,stop)',
          '[start,stop]',
          '(start,stop]',
        ),
        (reference, target, auto, edgeCorrection, windowBoundary) => {
          const kind = auto ? 'auto' as const : 'cross' as const;
          const expected = literalTypedCorrelogramOracle({
            referenceTimes: reference.values,
            referenceTimeUnit: reference.unit,
            targetTimes: target.values,
            targetTimeUnit: target.unit,
            kind,
            edges,
            edgeCorrection,
            windowBoundary,
          });
          const common = {
            referenceTimes: reference.values,
            referenceTimeUnit: reference.unit,
            bins: { edges, unit: 'us' as const, finalEdgeInclusive: false as const },
            edgeCorrection,
            window: {
              start: -4_000,
              stop: 4_000,
              unit: 'us',
              boundary: windowBoundary,
            },
            maximumPairwiseOperations: 64,
          };
          const actual = kind === 'auto'
            ? deriveTypedEventCorrelogram({ ...common, kind })
            : deriveTypedEventCorrelogram({
                ...common,
                kind,
                targetTimes: target.values,
                targetTimeUnit: target.unit,
              });

          expect(actual.counts).toEqual(expected.counts);
          expect(actual.eligibleReferenceEventCounts).toEqual(
            expected.eligibleReferenceEventCounts,
          );
          expect(actual.zeroLagRetainedDistinctPairs).toBe(
            expected.zeroLagRetainedDistinctPairs,
          );
          expect(actual.pairAccounting).toEqual({
            candidatePairCount: expected.candidatePairCount,
            countedPairCount: expected.countedPairCount,
            notCountedPairCount: expected.notCountedPairCount,
            sameEventSelfPairCountExcluded: expected.sameEventSelfPairCountExcluded,
            notCountedPairBreakdown: {
              kind: 'raw_exact',
              lagOutOfRangePairCount: expected.lagOutOfRangePairCount,
              edgeIneligibleInRangePairCount: expected.edgeIneligibleInRangePairCount,
            },
          });
          expect(
            actual.pairAccounting.countedPairCount +
              actual.pairAccounting.notCountedPairCount +
              actual.pairAccounting.sameEventSelfPairCountExcluded,
          ).toBe(actual.pairAccounting.candidatePairCount);
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('reconciles a pre-binned autocorrelogram numerator with its self-pair denominator', () => {
    const request = valid('prebinned_auto');
    request.data.referenceEventCount = 2;

    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        instancePath: '/data/pairCounts',
      }),
    ]);
  });

  it('admits a third sender only after one explicit role universe owns it', () => {
    const request = valid('events_cross');
    request.data.targetTrain.recordedSenderIds.push('i3');
    request.data.targetTrain.eventTimes.values.push(3);
    request.data.targetTrain.eventSenderIds.push('i3');

    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([]);

    request.data.targetTrain.recordedSenderIds.pop();
    expect(semanticErrors(request).map((error) => error.code)).toContain(
      'SEMANTIC_UNKNOWN_REFERENCE',
    );
  });

  it('scopes optional event ids within a train and rejects duplicates within it', () => {
    const request = valid('events_cross');
    request.data.referenceTrain.eventIds = ['local-1', 'local-2'];
    request.data.targetTrain.eventTimes.values = [3];
    request.data.targetTrain.eventSenderIds = ['i1'];
    request.data.targetTrain.eventIds = ['local-1'];
    expect(semanticErrors(request)).toEqual([]);

    request.data.referenceTrain.eventIds[1] = 'local-1';
    expect(semanticErrors(request).map((error) => error.code)).toContain(
      'SEMANTIC_DUPLICATE_ID',
    );
  });

  it('makes a role swap explicit and digest-visible without changing lag orientation', () => {
    const request = valid('events_cross');
    const swapped = structuredClone(request);
    [swapped.data.referenceTrain, swapped.data.targetTrain] = [
      swapped.data.targetTrain,
      swapped.data.referenceTrain,
    ];

    expect(validateStructure(swapped), structuralSummary()).toBe(true);
    expect(semanticErrors(swapped)).toEqual([]);
    expect(swapped.data.lagOrientation).toEqual({
      definition: 'target_time_minus_reference_time',
      positiveLagMeaning: 'target_follows_reference',
    });
    expect(canonicalDigest(swapped)).not.toBe(canonicalDigest(request));
  });

  it('excludes the positive outer edge and includes the negative outer edge', () => {
    const result = computeCorrelogram(
      [0],
      [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5],
      { edges: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5], finalEdgeInclusive: false },
      'cross',
    );
    expect(result.counts).toEqual([1, 1, 1, 1, 1]);
    expect(result.totalPairs).toBe(5);
    expect(result.receipt).toMatchObject({
      lagConvention: 'target_time - reference_time',
      binBoundary: 'left_closed_right_open',
      positiveOuterEdge: 'excluded',
      pairAccounting: {
        candidatePairCount: 6,
        countedPairCount: 5,
        outOfRangePairCount: 1,
        sameEventSelfPairCountExcluded: 0,
      },
    });
  });

  it('receipts every auto self-pair and assigns every distinct distant pair out of range', () => {
    const result = computeCorrelogram(
      [0, 10],
      [0, 10],
      { edges: [-1.5, -0.5, 0.5, 1.5], finalEdgeInclusive: false },
      'auto',
    );
    expect(result.counts).toEqual([0, 0, 0]);
    expect(result.receipt.pairAccounting).toEqual({
      candidatePairCount: 4,
      countedPairCount: 0,
      outOfRangePairCount: 2,
      sameEventSelfPairCountExcluded: 2,
    });
    expect(result.selfPairsExcluded).toBe(2);
  });

  it('has no structurally or semantically accepted unrendered statistic branch', () => {
    const request = valid('events_auto');
    for (const statistic of ['pearson_coefficient', 'weighted_pair_sum', 'mystery']) {
      const changed = structuredClone(request);
      changed.parameters.statistic = statistic;
      expect(validateStructure(changed), statistic).toBe(false);
      expect(semanticErrors(changed)).toEqual([
        expect.objectContaining({
          code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
          instancePath: '/parameters/statistic',
        }),
      ]);
    }

    const overlap = structuredClone(request);
    overlap.parameters.edgeCorrection = 'valid_overlap_only';
    expect(validateStructure(overlap)).toBe(false);
    expect(semanticErrors(overlap)).toEqual([
      expect.objectContaining({ instancePath: '/parameters/edgeCorrection' }),
    ]);

    const extraCarrier = structuredClone(request);
    extraCarrier.parameters.binValues = 'counts';
    expect(validateStructure(extraCarrier)).toBe(false);

    const droppedUncertainty = structuredClone(request);
    droppedUncertainty.parameters.uncertainty = {
      kind: 'standard_deviation',
      unit: '1',
      values: [0, 0, 0, 0, 0],
      sampleCount: [2, 2, 2, 2, 2],
      basis: 'trials',
    };
    expect(validateStructure(droppedUncertainty)).toBe(false);
    expect(source.science.uncertaintySupport).toEqual(['none']);
  });

  it('makes every admitted mode/statistic/edge-correction product executable', () => {
    const modes = ['events_auto', 'events_cross', 'prebinned_auto', 'prebinned_cross'];
    for (const mode of modes) {
      for (const [statistic, edgeCorrection] of [
        ['raw_pair_count', 'none'],
        ['target_rate_per_reference_event', 'none'],
        ['target_rate_per_reference_event', 'eligible_reference_events'],
      ] as const) {
        const request = valid(mode);
        request.parameters.statistic = statistic;
        request.parameters.edgeCorrection = edgeCorrection;
        if (mode.startsWith('prebinned')) {
          if (edgeCorrection === 'eligible_reference_events') {
            request.data.eligibleReferenceEventCounts =
              mode === 'prebinned_auto' ? [4, 5, 6, 5, 4] : [3, 4, 5, 4, 3];
          } else {
            delete request.data.eligibleReferenceEventCounts;
          }
        }

        expect(validateStructure(request), `${mode}/${statistic}/${edgeCorrection}`).toBe(true);
        expect(
          semanticErrors(request),
          `${mode}/${statistic}/${edgeCorrection}`,
        ).toEqual([]);
      }
    }
  });

  it('enforces exact pre-binned pair conservation and zero-denominator coherence', () => {
    const cross = valid('prebinned_cross');
    cross.data.referenceEventCount = 2;
    cross.data.targetEventCount = 2;
    expect(semanticErrors(cross)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        instancePath: '/data/pairCounts',
      }),
    ]);

    const zeroEligible = valid('prebinned_cross');
    zeroEligible.data.eligibleReferenceEventCounts[0] = 0;
    zeroEligible.data.pairCounts[0] = 0;
    expect(semanticErrors(zeroEligible)).toEqual([]);

    zeroEligible.data.pairCounts[0] = 1;
    expect(semanticErrors(zeroEligible)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_DENOMINATOR_INVALID',
        instancePath: '/data/pairCounts/0',
      }),
    ]);

    const unsafeProduct = valid('prebinned_cross');
    unsafeProduct.data.referenceEventCount = Number.MAX_SAFE_INTEGER;
    unsafeProduct.data.targetEventCount = 2;
    expect(semanticErrors(unsafeProduct)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        instancePath: '/data/targetEventCount',
      }),
    ]);
    expect(() =>
      deriveCorrelogramTargetRates([1], [2], { value: Number.MAX_VALUE, unit: 's' }),
    ).toThrow('exposure at bin 0 is not finite positive binary64');
  });

  it('bounds every pre-binned numerator by its exact eligible-reference Cartesian product', () => {
    const cross = valid('prebinned_cross');
    cross.data.pairCounts = [4, 0, 0, 0, 0];
    cross.data.eligibleReferenceEventCounts = [1, 1, 1, 1, 1];
    expect(semanticErrors(cross)).toEqual([]);

    cross.data.pairCounts[0] = 5;
    expect(semanticErrors(cross)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: '/data/pairCounts/0',
        message: expect.stringContaining(
          '5 exceeds the exact per-bin maximum 4 = 1 eligible reference events multiplied by 4 target-role events',
        ),
      }),
    ]);

    const autoZero = valid('prebinned_auto');
    autoZero.parameters.edgeCorrection = 'eligible_reference_events';
    autoZero.data.eligibleReferenceEventCounts = [1, 1, 1, 1, 1];
    autoZero.data.pairCounts = [0, 0, 5, 0, 0];
    expect(semanticErrors(autoZero)).toEqual([]);

    autoZero.data.pairCounts[2] = 6;
    expect(semanticErrors(autoZero)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: '/data/pairCounts/2',
        message: expect.stringContaining(
          '6 exceeds the exact per-bin maximum 5 = 1 eligible reference events multiplied by 5 distinct target ordinals after same-event self-pair exclusion',
        ),
      }),
    ]);

    const autoNonzero = valid('prebinned_auto');
    autoNonzero.parameters.edgeCorrection = 'eligible_reference_events';
    autoNonzero.data.eligibleReferenceEventCounts = [1, 1, 1, 1, 1];
    autoNonzero.data.pairCounts = [5, 0, 0, 0, 0];
    expect(semanticErrors(autoNonzero)).toEqual([]);

    autoNonzero.data.pairCounts[0] = 6;
    expect(semanticErrors(autoNonzero)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: '/data/pairCounts/0',
        message: expect.stringContaining(
          '6 exceeds the exact per-bin maximum 5 = 1 eligible reference events multiplied by 5 distinct target ordinals after same-event self-pair exclusion',
        ),
      }),
    ]);
  });

  it('publishes truthful repairs for correlogram denominator and pair-accounting failures', () => {
    const impossiblePairCount = valid('prebinned_cross');
    impossiblePairCount.data.eligibleReferenceEventCounts = [1, 1, 1, 1, 1];
    impossiblePairCount.data.pairCounts = [5, 0, 0, 0, 0];
    expect(semanticErrors(impossiblePairCount)).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
      instancePath: '/data/pairCounts/0',
    }));

    const correlationMetadata = errorRegistry.codes.find(
      ({ code }) => code === 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
    );
    expect(correlationMetadata).toBeDefined();
    expect(`${correlationMetadata?.summary}\n${correlationMetadata?.correctiveAction}`)
      .toMatch(/correlogram[\s\S]*pair-accounting[\s\S]*eligible-reference/u);
    expect(correlationMetadata?.correctiveAction).toContain('raw_pair_count');
    expect(correlationMetadata?.correctiveAction).toContain(
      'target_rate_per_reference_event',
    );

    const impossibleEligibleCount = valid('prebinned_cross');
    impossibleEligibleCount.data.eligibleReferenceEventCounts = [6, 4, 5, 4, 3];
    expect(semanticErrors(impossibleEligibleCount)).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_DENOMINATOR_INVALID',
      instancePath: '/data/eligibleReferenceEventCounts/0',
    }));

    const denominatorMetadata = errorRegistry.codes.find(
      ({ code }) => code === 'SCIENCE_DENOMINATOR_INVALID',
    );
    expect(denominatorMetadata).toBeDefined();
    expect(`${denominatorMetadata?.summary}\n${denominatorMetadata?.correctiveAction}`)
      .toMatch(/denominator[\s\S]*eligible-reference/u);
    expect(denominatorMetadata?.correctiveAction).toContain('Zero is allowed only where');
  });

  it('proves the exact accounting partition over randomized bounded products', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000 }),
        fc.integer({ min: 0, max: 1_000 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 1_000_000 }),
        (referenceCount, arbitraryTargetCount, auto, requestedCounted) => {
          const targetCount = auto ? referenceCount : arbitraryTargetCount;
          const candidate = referenceCount * targetCount;
          const selfPairs = auto ? referenceCount : 0;
          const available = candidate - selfPairs;
          const counted = Math.min(requestedCounted, available);
          const accounting = deriveCorrelogramPairAccounting(
            referenceCount,
            targetCount,
            auto ? 'auto' : 'cross',
            counted,
          );

          expect(
            accounting.countedPairCount +
              accounting.outOfRangePairCount +
              accounting.sameEventSelfPairCountExcluded,
          ).toBe(accounting.candidatePairCount);
          expect(accounting.sameEventSelfPairCountExcluded).toBe(auto ? referenceCount : 0);
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('executes every semantic nearest-misuse vector against the named validators', () => {
    const structuralCodes = new Set([
      'SCHEMA_ENUM_MISMATCH',
      'SCHEMA_UNKNOWN_PROPERTY',
      'SCHEMA_REQUIRED_PROPERTY_MISSING',
    ]);
    for (const [index, example] of source.examples.invalid.entries()) {
      if (structuralCodes.has(example.expectedCode)) {
        expect(validateStructure(example.request), `invalid[${index}] was structurally accepted`).toBe(false);
        continue;
      }
      expect(validateStructure(example.request), `invalid[${index}]\n${structuralSummary()}`).toBe(true);
      expect(
        semanticErrors(example.request).map((error) => error.code),
        `invalid[${index}] expected ${example.expectedCode}`,
      ).toContain(example.expectedCode);
    }
  });

  it('has no accepted weighted statistic or caller-supplied raw count/duration authority', () => {
    const request = valid('events_auto');
    request.parameters.statistic = 'weighted_pair_sum';
    expect(validateStructure(request)).toBe(false);

    const redundant = valid('events_auto');
    redundant.data.referenceEventCount = redundant.data.train.eventTimes.values.length;
    redundant.data.effectiveDuration = { kind: 'duration', unit: 'ms', value: 10 };
    expect(validateStructure(redundant)).toBe(false);
  });
});
