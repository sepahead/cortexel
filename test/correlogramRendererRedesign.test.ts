import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildFigure } from '../src/render/index.js';
import { countPlanResources } from '../src/render/svg.js';

type Request = Record<string, any>;
type SourceContract = {
  readonly accessibility: {
    readonly tableColumns: readonly { readonly key: string; readonly header: string }[];
  };
  readonly examples: { readonly valid: readonly Request[] };
};

const source = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/skills/neuro.correlogram.v1.json'),
  'utf8',
)) as SourceContract;

function example(index: number): Request {
  return structuredClone(source.examples.valid[index]);
}

function built(request: Request, options?: { readonly budgetProfile: 'agent' | 'standard' }) {
  const result = buildFigure(request, options);
  expect(result.ok, result.ok ? '' : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

function rowsByKey(result: ReturnType<typeof built>): Record<string, string | number | null>[] {
  return result.table.rows.map((row) => Object.fromEntries(
    result.table.columns.map((column, index) => [column.key, row[index]]),
  ));
}

function correlogramOperation(result: ReturnType<typeof built>): Record<string, any> {
  const artifact = result.artifact as Record<string, any>;
  const operations = artifact.derivation?.operations as Record<string, any>[];
  expect(operations).toHaveLength(1);
  expect(operations[0]).toMatchObject({
    id: 'correlogram.pair_count_and_rate',
    algorithm: 'cortexel.correlogram.exact_centered_pair_ladder',
    algorithmRevision: 2,
  });
  return operations[0];
}

describe('unreleased correlogram renderer closes the revision-5 product', () => {
  it('renders every living raw/pre-binned auto/cross example with the exact source table', () => {
    const expectedColumns = source.accessibility.tableColumns.map(({ key, header }) => ({ key, header }));
    for (let index = 0; index < source.examples.valid.length; index++) {
      const first = built(example(index));
      const second = built(example(index));
      expect(first.svg).toBe(second.svg);
      expect(first.artifact).toEqual(second.artifact);
      expect(first.table.columns).toEqual(expectedColumns);
      expect(first.table.rows).toHaveLength(5);
      expect(first.table.rowsInline).toBe(first.table.rowsTotal);
      expect(first.table.rowsTotal).toBe(5);
      expect(rowsByKey(first).every((row) =>
        row.valueStatus === 'defined' ||
        row.valueStatus === 'undefined_zero_eligible_reference_events')).toBe(true);
      correlogramOperation(first);
    }
  });

  it('keeps a silent target as cross and never emits the auto self-pair disclosure', () => {
    const result = built(example(1));
    const rows = rowsByKey(result);
    expect(rows.map((row) => row.pairCount)).toEqual([0, 0, 0, 0, 0]);
    expect(rows.map((row) => row.value)).toEqual([0, 0, 0, 0, 0]);
    expect(result.disclosures.map((disclosure) => disclosure.id)).toContain('LAG_ORIENTATION');
    expect(result.disclosures.map((disclosure) => disclosure.id))
      .not.toContain('ZERO_LAG_SELF_PAIRS_EXCLUDED');
    expect(result.plan.accessibility.summary).toContain('Correlogram (cross)');
    expect(result.plan.accessibility.summary).toContain('Events: 2 reference, 0 target');
    expect(result.plan.accessibility.summary)
      .toContain('0 candidate = 0 counted numerator + 0 other not counted + 0 same-event self-pairs excluded');
    expect(correlogramOperation(result).receipt).toMatchObject({
      referenceEventCount: 2,
      targetEventCount: 0,
      candidatePairCount: 0,
      countedPairCount: 0,
      notCountedPairCount: 0,
      sameEventSelfPairCountExcluded: 0,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: 0,
        edgeIneligibleInRangePairCount: 0,
      },
    });
  });

  it('includes the negative outer edge, excludes the positive outer edge, and receipts both', () => {
    const request = example(1);
    request.data.referenceTrain.eventTimes.values = [5];
    request.data.referenceTrain.eventSenderIds = ['e1'];
    request.data.targetTrain.eventTimes.values = [2.5, 7.5];
    request.data.targetTrain.eventSenderIds = ['i1', 'i1'];
    const result = built(request);
    const rows = rowsByKey(result);
    expect(rows.map((row) => row.pairCount)).toEqual([1, 0, 0, 0, 0]);
    expect(rows[0]).toMatchObject({ lagBinStart: -2.5, lagBinCenter: -2, lagBinEnd: -1.5 });
    expect(rows.at(-1)).toMatchObject({ lagBinStart: 1.5, lagBinCenter: 2, lagBinEnd: 2.5 });
    expect(correlogramOperation(result).receipt).toMatchObject({
      candidatePairCount: 2,
      countedPairCount: 1,
      notCountedPairCount: 1,
      sameEventSelfPairCountExcluded: 0,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: 1,
        edgeIneligibleInRangePairCount: 0,
      },
    });
  });

  it('renders zero eligible-reference exposure as null-with-reason and draws no fake zero', () => {
    const request = example(3);
    request.data.pairCounts = [0, 0, 0, 0, 0];
    request.data.eligibleReferenceEventCounts = [0, 0, 0, 0, 0];
    const result = built(request);
    const rows = rowsByKey(result);
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row).toMatchObject({
        pairCount: 0,
        eligibleReferenceEvents: 0,
        denominator: 0,
        value: null,
        valueUnit: 'Hz',
        valueStatus: 'undefined_zero_eligible_reference_events',
        uncertaintyLower: null,
        uncertaintyUpper: null,
      });
    }
    expect(countPlanResources(result.plan).markCount).toBe(0);
    expect(result.plan.panels[0].noData?.reason)
      .toBe('every target-rate bin is undefined because its eligible-reference count is zero');
    expect(result.plan.panels[0].axes.find((axis) => axis.orientation === 'bottom')?.label)
      .toBe('lag (ms)');
    expect(result.plan.accessibility.summary).toContain(
      '5 rate bins are null because their eligible-reference count is zero',
    );
    expect(result.plan.accessibility.summary).toContain(
      '20 candidate = 0 counted numerator + 20 other not counted + 0 same-event self-pairs excluded',
    );
    expect(result.plan.accessibility.summary).toContain(
      'split: unavailable from pre-binned aggregate input',
    );
    expect(result.disclosures.map((disclosure) => disclosure.id)).toEqual(
      expect.arrayContaining(['PRE_BINNED_INPUT', 'MISSING_VALUES_PRESENT']),
    );
    expect(correlogramOperation(result).receipt).toMatchObject({
      candidatePairCount: 20,
      countedPairCount: 0,
      notCountedPairCount: 20,
      sameEventSelfPairCountExcluded: 0,
      undefinedRateBinCount: 5,
      notCountedPairBreakdown: { kind: 'unavailable_from_prebinned_input' },
    });
  });

  it('refuses producer-supplied per-bin numerators that exceed their eligible pair universe', () => {
    const cross = example(3);
    cross.data.pairCounts = [5, 0, 0, 0, 0];
    cross.data.eligibleReferenceEventCounts = [1, 1, 1, 1, 1];
    const crossResult = buildFigure(cross);
    expect(crossResult.ok).toBe(false);
    if (crossResult.ok) return;
    expect(crossResult.errors).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
      stage: 'science',
      instancePath: '/data/pairCounts/0',
      message: expect.stringContaining('exact per-bin maximum 4'),
    }));

    const auto = example(2);
    auto.parameters.edgeCorrection = 'eligible_reference_events';
    auto.data.eligibleReferenceEventCounts = [1, 1, 1, 1, 1];
    auto.data.pairCounts = [0, 0, 6, 0, 0];
    const autoResult = buildFigure(auto);
    expect(autoResult.ok).toBe(false);
    if (autoResult.ok) return;
    expect(autoResult.errors).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
      stage: 'science',
      instancePath: '/data/pairCounts/2',
      message: expect.stringContaining('distinct target ordinals after same-event self-pair exclusion'),
    }));
  });

  it('derives defined target rates from exact counts and the typed bin width', () => {
    const result = built(example(2));
    const rows = rowsByKey(result);
    expect(rows.map((row) => row.eligibleReferenceEvents)).toEqual([6, 6, 6, 6, 6]);
    expect(rows.map((row) => row.denominator)).toEqual([0.006, 0.006, 0.006, 0.006, 0.006]);
    expect(rows.map((row) => row.value)).toEqual([
      666.6666666666666,
      833.3333333333334,
      0,
      833.3333333333334,
      666.6666666666666,
    ]);
    expect(rows.map((row) => row.valueStatus)).toEqual([
      'defined', 'defined', 'defined', 'defined', 'defined',
    ]);
  });

  it('uses the identical eligible-reference subset for a corrected numerator and denominator', () => {
    const request = example(1);
    request.data.referenceTrain.eventTimes.values = [5, 9.8];
    request.data.referenceTrain.eventSenderIds = ['e1', 'e1'];
    request.data.targetTrain.eventTimes.values = [5.1, 9.9];
    request.data.targetTrain.eventSenderIds = ['i1', 'i1'];
    request.parameters.statistic = 'target_rate_per_reference_event';
    request.parameters.edgeCorrection = 'eligible_reference_events';

    const result = built(request);
    const rows = rowsByKey(result);
    expect(rows.map((row) => row.pairCount)).toEqual([0, 0, 1, 0, 0]);
    expect(rows.map((row) => row.eligibleReferenceEvents)).toEqual([2, 2, 1, 1, 1]);
    expect(rows[2]).toMatchObject({
      denominator: 0.001,
      value: 1000,
      valueUnit: 'Hz',
      valueStatus: 'defined',
    });
    expect(correlogramOperation(result)).toMatchObject({
      algorithmRevision: 2,
      receipt: {
        candidatePairCount: 4,
        countedPairCount: 1,
        notCountedPairCount: 3,
        sameEventSelfPairCountExcluded: 0,
        notCountedPairBreakdown: {
          kind: 'raw_exact',
          lagOutOfRangePairCount: 2,
          edgeIneligibleInRangePairCount: 1,
        },
        rawKernelReceipt: {
          algorithmRevision: 2,
          lagArithmetic: 'exact_typed_difference_classify_then_one_round',
          pairIteration: 'stable_time_then_source_ordinal_exact_target_slices',
        },
      },
    });
  });

  it('keeps a corrected autocorrelogram asymmetric when opposite reference exposures differ', () => {
    const request = example(0);
    request.data.train.eventTimes.values = [0.1, 1];
    request.data.train.eventSenderIds = ['e1', 'e1'];
    request.data.train.eventIds = ['E-early', 'E-late'];
    request.parameters.statistic = 'target_rate_per_reference_event';
    request.parameters.edgeCorrection = 'eligible_reference_events';

    const result = built(request);
    const rows = rowsByKey(result);
    expect(rows.map((row) => row.pairCount)).toEqual([0, 0, 0, 1, 0]);
    expect(rows.map((row) => row.eligibleReferenceEvents)).toEqual([0, 0, 1, 2, 2]);
    expect(rows.map((row) => row.value)).toEqual([null, null, 0, 500, 0]);
    expect(correlogramOperation(result).receipt).toMatchObject({
      candidatePairCount: 4,
      countedPairCount: 1,
      notCountedPairCount: 1,
      sameEventSelfPairCountExcluded: 2,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: 0,
        edgeIneligibleInRangePairCount: 1,
      },
    });
  });

  it('uses one correctly rounded centre authority for an accepted subnormal lag axis', () => {
    const request = example(1);
    const binWidth = 4.30985088271723e-310;
    const tauMax = 5.602806147532405e-309;
    request.parameters.lagRange = { unit: 'ms', min: -tauMax, max: tauMax };
    request.parameters.bins = { unit: 'ms', width: binWidth };
    request.data.referenceTrain.eventTimes.values = [];
    request.data.referenceTrain.eventSenderIds = [];

    const result = built(request);
    const rows = rowsByKey(result);
    expect(rows).toHaveLength(27);
    expect(rows[0]).toMatchObject({
      lagBinStart: -5.81829869166827e-309,
      lagBinCenter: -5.60280614753241e-309,
      lagBinEnd: -5.387313603396546e-309,
      pairCount: 0,
    });
    expect(
      rows[0].lagBinStart as number +
        ((rows[0].lagBinEnd as number) - (rows[0].lagBinStart as number)) / 2,
    ).toBe(-5.602806147532405e-309);
    expect(rows[0].lagBinCenter).not.toBe(-5.602806147532405e-309);
  });

  it('classifies a tiny mixed-unit lag before rounding either large absolute clock', () => {
    const request = example(1);
    const referenceTime = 1.693447539283061;
    const targetTime = 1.6934475392830612;
    expect(referenceTime * 1000).toBe(targetTime * 1000);
    request.data.referenceTrain.eventTimes = {
      kind: 'time',
      unit: 's',
      values: [referenceTime],
    };
    request.data.referenceTrain.eventSenderIds = ['e1'];
    request.data.targetTrain.eventTimes = {
      kind: 'time',
      unit: 's',
      values: [targetTime],
    };
    request.data.targetTrain.eventSenderIds = ['i1'];
    request.data.window = {
      start: 1.6,
      stop: 1.8,
      unit: 's',
      boundary: '[start,stop)',
    };
    request.parameters.lagRange = { unit: 'ms', min: -2e-13, max: 2e-13 };
    request.parameters.bins = { unit: 'ms', width: 1e-13 };

    const result = built(request);
    expect(rowsByKey(result).map((row) => row.pairCount)).toEqual([0, 0, 0, 0, 1]);
    expect(correlogramOperation(result).receipt.rawKernelReceipt).toMatchObject({
      algorithmRevision: 2,
      lagArithmetic: 'exact_typed_difference_classify_then_one_round',
    });
  });

  it('refuses when one rounded mixed-unit lag would cross its exact bin boundary', () => {
    const request = example(1);
    const width = 1.1996580033106383e-105;
    const targetTime = 5.998290016553191e-109;
    request.data.referenceTrain.eventTimes = {
      kind: 'time',
      unit: 's',
      values: [0],
    };
    request.data.referenceTrain.eventSenderIds = ['e1'];
    request.data.targetTrain.eventTimes = {
      kind: 'time',
      unit: 's',
      values: [targetTime],
    };
    request.data.targetTrain.eventSenderIds = ['i1'];
    request.data.window = {
      start: 0,
      stop: 1e-108,
      unit: 's',
      boundary: '[start,stop)',
    };
    request.parameters.lagRange = { unit: 'ms', min: -2 * width, max: 2 * width };
    request.parameters.bins = { unit: 'ms', width };

    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      stage: 'science',
      instancePath: '/data/targetTrain/eventTimes/values/0',
      skillId: 'neuro.correlogram',
      message: expect.stringContaining(
        'exact typed lag for reference source ordinal 0 and target source ordinal 0 classifies into bin 2, but its one rounded ms value classifies into bin 3',
      ),
    }));
  });

  it('refuses an over-limit complete lag table before forming any event pair', () => {
    const request = example(1);
    request.parameters.lagRange = { unit: 'ms', min: -500, max: 500 };
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'RESOURCE_COMPACTION_UNAVAILABLE',
      stage: 'budget',
      instancePath: '/parameters/lagRange',
      skillId: 'neuro.correlogram',
      limit: expect.objectContaining({
        name: 'returnedTableRows',
        limit: 500,
        observed: 1001,
      }),
    }));
  });

  it('uses the no-pair sorted-window preflight to refuse a quadratic raw product', () => {
    const request = example(1);
    const eventsPerRole = 2237;
    request.data.referenceTrain.eventTimes.values = new Array(eventsPerRole).fill(5);
    request.data.referenceTrain.eventSenderIds = new Array(eventsPerRole).fill('e1');
    request.data.targetTrain.eventTimes.values = new Array(eventsPerRole).fill(5);
    request.data.targetTrain.eventSenderIds = new Array(eventsPerRole).fill('i1');
    const result = buildFigure(request, { budgetProfile: 'agent' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'RESOURCE_PAIRWISE_EXCEEDED',
      stage: 'budget',
      instancePath: '/data',
      skillId: 'neuro.correlogram',
      limit: expect.objectContaining({
        name: 'pairwiseOperations',
        limit: 5_000_000,
        observed: 5_001_932,
      }),
    }));
  });

  it('admits over-limit Cartesian products when exact preflight proves numerator P is zero', () => {
    const eventsPerRole = 2237;
    const candidatePairCount = eventsPerRole ** 2;
    expect(candidatePairCount).toBeGreaterThan(5_000_000);

    const lagSparse = example(1);
    lagSparse.data.referenceTrain.eventTimes.values = new Array(eventsPerRole).fill(1);
    lagSparse.data.referenceTrain.eventSenderIds = new Array(eventsPerRole).fill('e1');
    lagSparse.data.targetTrain.eventTimes.values = new Array(eventsPerRole).fill(9);
    lagSparse.data.targetTrain.eventSenderIds = new Array(eventsPerRole).fill('i1');
    const lagSparseResult = built(lagSparse, { budgetProfile: 'agent' });
    expect(rowsByKey(lagSparseResult).map((row) => row.pairCount))
      .toEqual([0, 0, 0, 0, 0]);
    expect(correlogramOperation(lagSparseResult).receipt).toMatchObject({
      candidatePairCount,
      countedPairCount: 0,
      notCountedPairCount: candidatePairCount,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: candidatePairCount,
        edgeIneligibleInRangePairCount: 0,
      },
    });

    const edgeIneligible = example(1);
    edgeIneligible.data.referenceTrain.eventTimes.values = new Array(eventsPerRole).fill(9.8);
    edgeIneligible.data.referenceTrain.eventSenderIds = new Array(eventsPerRole).fill('e1');
    edgeIneligible.data.targetTrain.eventTimes.values = new Array(eventsPerRole).fill(9.9);
    edgeIneligible.data.targetTrain.eventSenderIds = new Array(eventsPerRole).fill('i1');
    edgeIneligible.parameters.statistic = 'target_rate_per_reference_event';
    edgeIneligible.parameters.edgeCorrection = 'eligible_reference_events';
    const edgeIneligibleResult = built(edgeIneligible, { budgetProfile: 'agent' });
    expect(rowsByKey(edgeIneligibleResult).map((row) => row.pairCount))
      .toEqual([0, 0, 0, 0, 0]);
    expect(correlogramOperation(edgeIneligibleResult).receipt).toMatchObject({
      candidatePairCount,
      countedPairCount: 0,
      notCountedPairCount: candidatePairCount,
      notCountedPairBreakdown: {
        kind: 'raw_exact',
        lagOutOfRangePairCount: 0,
        edgeIneligibleInRangePairCount: candidatePairCount,
      },
    });
  });
});
