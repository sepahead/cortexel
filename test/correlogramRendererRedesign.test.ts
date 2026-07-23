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
    algorithmRevision: 1,
  });
  return operations[0];
}

describe('unreleased correlogram renderer closes the revision-2 product', () => {
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
      .toContain('0 candidate = 0 in-range + 0 out-of-range + 0 same-event self-pairs excluded');
    expect(correlogramOperation(result).receipt).toMatchObject({
      referenceEventCount: 2,
      targetEventCount: 0,
      candidatePairCount: 0,
      countedPairCount: 0,
      outOfRangePairCount: 0,
      sameEventSelfPairCountExcluded: 0,
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
      outOfRangePairCount: 1,
      sameEventSelfPairCountExcluded: 0,
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
      '20 candidate = 0 in-range + 20 out-of-range + 0 same-event self-pairs excluded',
    );
    expect(result.disclosures.map((disclosure) => disclosure.id)).toEqual(
      expect.arrayContaining(['PRE_BINNED_INPUT', 'MISSING_VALUES_PRESENT']),
    );
    expect(correlogramOperation(result).receipt).toMatchObject({
      candidatePairCount: 20,
      countedPairCount: 0,
      outOfRangePairCount: 20,
      sameEventSelfPairCountExcluded: 0,
      undefinedRateBinCount: 5,
    });
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
        observed: 5_000_001,
      }),
    }));
  });
});
