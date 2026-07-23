import { readFileSync } from 'node:fs';
import path from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  buildFigure,
  saturatingWeightRowSumForTest,
} from '../src/render/buildFigure.js';

const contract = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/skills/network.synaptic_weight_trace.v1.json'),
  'utf8',
)) as { examples: { valid: Record<string, any>[] } };

function example(index: number): Record<string, any> {
  return structuredClone(contract.examples.valid[index]);
}

function individualPointRequest(rowCount: number): Record<string, any> {
  const request = example(0);
  request.data.observation = { kind: 'point_sample' };
  request.data.series = request.data.series.slice(0, 1);
  request.data.series[0].time.values = Array.from({ length: rowCount }, (_, index) => index);
  request.data.series[0].values.values = Array.from({ length: rowCount }, () => 1);
  delete request.data.series[0].eventKinds;
  request.parameters.duplicateTimePolicy = { policy: 'reject' };
  request.parameters.showReferenceLines = false;
  return request;
}

function derivedEventUnionRequest(
  timeValuesByMember: readonly (readonly number[])[],
  options: {
    readonly windowStart?: number;
    readonly windowStop?: number;
    readonly windowBoundary?: '[start,stop)' | '[start,stop]';
    readonly sourceTimeUnit?: 'ms' | 'us';
    readonly intervalUnit?: 'ms' | 'us';
    readonly recordedStart?: number;
    readonly recordedStop?: number;
    readonly membershipStart?: number;
    readonly membershipStop?: number;
    readonly updateSemantics?: 'value_after_update' | 'value_before_update';
  } = {},
): Record<string, any> {
  const request = example(1);
  const sourceTimeUnit = options.sourceTimeUnit ?? 'ms';
  const intervalUnit = options.intervalUnit ?? 'ms';
  const windowStart = options.windowStart ?? 0;
  const windowStop = options.windowStop ?? 1_000;
  const recordedStart = options.recordedStart ?? windowStart;
  const recordedStop = options.recordedStop ?? windowStop;
  const membershipStart = options.membershipStart ?? recordedStart;
  const membershipStop = options.membershipStop ?? recordedStop;
  request.data.window = {
    start: windowStart,
    stop: windowStop,
    unit: 'ms',
    boundary: options.windowBoundary ?? '[start,stop)',
  };
  request.data.observation = {
    kind: 'event_updated',
    updateSemantics: options.updateSemantics ?? 'value_after_update',
  };
  request.data.series = timeValuesByMember.map((times, memberIndex) => {
    const series = structuredClone(request.data.series[0]);
    series.edgeId = `e${memberIndex + 1}`;
    delete series.label;
    delete series.endpoints;
    delete series.eventKinds;
    delete series.initialWeight;
    delete series.bounds;
    series.recordedInterval = {
      start: recordedStart,
      stop: recordedStop,
      unit: intervalUnit,
      boundary: '[start,stop)',
    };
    series.time = {
      kind: 'time',
      unit: sourceTimeUnit,
      values: [...times],
    };
    series.values.values = times.map((_time, timeIndex) =>
      memberIndex + 1 + timeIndex / 10_000);
    series.uncertainty = { kind: 'none', reason: 'single_trial' };
    return series;
  });
  request.data.membership = {
    groupId: 'bounded-grid-test',
    groupLabel: 'Bounded grid test ensemble',
    unit: intervalUnit,
    members: timeValuesByMember.map((_times, memberIndex) => ({
      edgeId: `e${memberIndex + 1}`,
      intervals: [{ start: membershipStart, stop: membershipStop }],
    })),
  };
  request.parameters = {
    display: 'aggregate_derived',
    weightComparability: { mode: 'single_synapse_model' },
    aggregate: {
      method: 'mean',
      evaluation: { mode: 'hold_last_observed_at_union_times' },
      dispersion: { kind: 'none', reason: 'not_computed' },
    },
    duplicateTimePolicy: { policy: 'reject' },
    showObservationMarkers: false,
    showReferenceLines: false,
  };
  return request;
}

function expectSaturatedRefusal(
  result: ReturnType<typeof buildFigure>,
  instancePath: string,
  limit = 500,
): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.errors).toContainEqual(expect.objectContaining({
    code: 'RESOURCE_COMPACTION_UNAVAILABLE',
    stage: 'budget',
    instancePath,
    limit: {
      name: 'returnedTableRows',
      limit,
      observed: limit + 1,
    },
  }));
  expect(result.errors[0].message).toContain('lower-bound sentinel, not an exact count');
}

describe('synaptic-weight complete-table preflight', () => {
  it('accepts exactly L rows and saturates at L+1 before rendering', () => {
    const atLimit = buildFigure(individualPointRequest(500));
    expect(atLimit.ok).toBe(true);
    if (!atLimit.ok) throw new Error(JSON.stringify(atLimit.errors));
    expect(atLimit.table.rows).toHaveLength(500);

    expectSaturatedRefusal(buildFigure(individualPointRequest(501)), '/data/series');
  });

  it('counts prepared duplicate aggregates rather than raw caller rows', () => {
    const request = individualPointRequest(1_000);
    request.data.series[0].time.values = Array.from(
      { length: 1_000 },
      (_, index) => Math.floor(index / 2),
    );
    request.data.series[0].values.values = Array.from(
      { length: 1_000 },
      (_, index) => index % 2,
    );
    request.parameters.duplicateTimePolicy = {
      policy: 'aggregate',
      method: 'mean',
    };
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.table.rows).toHaveLength(500);
    expect(result.table.rows.every((row) => row[15] === 2)).toBe(true);
  });

  it('refuses on source plus aggregate-grid cardinality before member-state evaluation', () => {
    const request = example(1);
    request.data.observation = { kind: 'point_sample' };
    request.data.series = request.data.series.slice(0, 1);
    request.data.membership.members = request.data.membership.members.slice(0, 1);
    request.data.membership.members[0].intervals = [{ start: 0, stop: 1_000 }];
    request.data.series[0].time.values = Array.from({ length: 251 }, (_, index) => index);
    request.data.series[0].values.values = Array.from({ length: 251 }, () => 1);
    delete request.data.series[0].eventKinds;
    request.parameters.display = 'aggregate_derived';
    request.parameters.aggregate = {
      method: 'mean',
      evaluation: { mode: 'shared_sample_grid' },
      dispersion: { kind: 'none', reason: 'not_computed' },
    };
    expectSaturatedRefusal(
      buildFigure(request),
      '/parameters/aggregate/evaluation',
    );
  });

  it('accepts the exact source-plus-grid boundary and refuses the next union-grid row', () => {
    const exact = derivedEventUnionRequest([
      Array.from({ length: 250 }, (_unused, index) => index),
    ]);
    const exactResult = buildFigure(exact);
    expect(exactResult.ok).toBe(true);
    if (!exactResult.ok) throw new Error(JSON.stringify(exactResult.errors));
    expect(exactResult.table.rows).toHaveLength(500);

    const overflow = derivedEventUnionRequest([
      Array.from({ length: 250 }, (_unused, index) => index + 1),
    ]);
    expectSaturatedRefusal(
      buildFigure(overflow),
      '/parameters/aggregate/evaluation',
    );
  });

  it('saturates an oversized declared grid against the exact remaining budget', () => {
    const request = derivedEventUnionRequest([[0]]);
    request.parameters.aggregate.evaluation = {
      mode: 'hold_last_observed_at_declared_times',
      times: {
        kind: 'time',
        unit: 'ms',
        values: Array.from({ length: 500 }, (_unused, index) => index),
      },
    };
    expectSaturatedRefusal(
      buildFigure(request),
      '/parameters/aggregate/evaluation',
    );
  });

  it('deduplicates repeated union endpoints and observations across members', () => {
    const request = derivedEventUnionRequest([
      [0, 100, 200],
      [0, 100, 200],
    ]);
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));

    // Six source carriers plus one three-element union grid. Window, membership,
    // and recorded starts all repeat the observation at zero; open stops contribute
    // no grid row.
    expect(result.table.rows).toHaveLength(9);
    const aggregateRows = result.table.rows.filter((row) =>
      row[23] === 'derived_aggregate_evaluation');
    expect(aggregateRows.map((row) => row[5])).toEqual([0, 100, 200]);
  });

  it('honours the open/closed analysis-stop distinction in source and grid counts', () => {
    const open = derivedEventUnionRequest([[0, 100]], {
      windowStop: 100,
      windowBoundary: '[start,stop)',
      recordedStop: 101,
      membershipStop: 101,
    });
    const closed = structuredClone(open);
    closed.data.window.boundary = '[start,stop]';

    const openResult = buildFigure(open);
    const closedResult = buildFigure(closed);
    expect(openResult.ok).toBe(true);
    expect(closedResult.ok).toBe(true);
    if (!openResult.ok || !closedResult.ok) return;
    expect(openResult.table.rows).toHaveLength(2);
    expect(closedResult.table.rows).toHaveLength(4);
    expect(openResult.table.rows.filter((row) =>
      row[23] === 'derived_aggregate_evaluation').map((row) => row[5])).toEqual([0]);
    expect(closedResult.table.rows.filter((row) =>
      row[23] === 'derived_aggregate_evaluation').map((row) => row[5])).toEqual([0, 100]);
  });

  it('counts a registered unit-converted union grid in the window unit', () => {
    const request = derivedEventUnionRequest([[0, 50_000]], {
      windowStop: 100,
      sourceTimeUnit: 'us',
      intervalUnit: 'us',
      recordedStart: 0,
      recordedStop: 100_000,
      membershipStart: 0,
      membershipStop: 100_000,
    });
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.table.rows).toHaveLength(4);
    expect(result.table.rows.filter((row) =>
      row[23] === 'derived_aggregate_evaluation').map((row) => row[5])).toEqual([0, 50]);
  });

  it('uses the tighter agent-profile L=200 boundary', () => {
    const exact = derivedEventUnionRequest([
      Array.from({ length: 100 }, (_unused, index) => index),
    ]);
    const exactResult = buildFigure(exact, { budgetProfile: 'agent' });
    expect(exactResult.ok).toBe(true);
    if (!exactResult.ok) throw new Error(JSON.stringify(exactResult.errors));
    expect(exactResult.table.rows).toHaveLength(200);

    const overflow = derivedEventUnionRequest([
      Array.from({ length: 101 }, (_unused, index) => index),
    ]);
    expectSaturatedRefusal(
      buildFigure(overflow, { budgetProfile: 'agent' }),
      '/parameters/aggregate/evaluation',
      200,
    );
  });

  it.each([
    {
      name: 'carry-in witness',
      request: () => derivedEventUnionRequest([
        [50, ...Array.from({ length: 249 }, (_unused, index) => index + 101)],
      ], {
        windowStart: 100,
        windowStop: 1_000,
        windowBoundary: '[start,stop]',
        recordedStart: 0,
        recordedStop: 1_001,
        membershipStart: 0,
        membershipStop: 1_001,
      }),
    },
    {
      name: 'declared initial state',
      request: () => {
        const request = derivedEventUnionRequest([
          Array.from({ length: 249 }, (_unused, index) => index + 101),
        ], {
          windowStop: 1_000,
          windowBoundary: '[start,stop]',
          recordedStop: 1_001,
          membershipStop: 1_001,
        });
        request.data.series[0].initialWeight = {
          quantity: {
            kind: 'synaptic_weight',
            unit: 'nest:weight',
            value: 1,
          },
          origin: 'model_parameter',
        };
        return request;
      },
    },
    {
      name: 'value-before look-ahead witness',
      request: () => {
        const request = example(0);
        request.data.window = {
          start: 0,
          stop: 1_000,
          unit: 'ms',
          boundary: '[start,stop)',
        };
        request.data.observation = {
          kind: 'event_updated',
          updateSemantics: 'value_before_update',
        };
        request.data.series = request.data.series.slice(0, 1);
        request.data.series[0].recordedInterval = {
          start: 0,
          stop: 1_002,
          unit: 'ms',
          boundary: '[start,stop)',
        };
        request.data.series[0].time.values = [
          ...Array.from({ length: 500 }, (_unused, index) => index),
          1_001,
        ];
        request.data.series[0].values.values =
          request.data.series[0].time.values.map((_time: number, index: number) =>
            1 + index / 10_000);
        delete request.data.series[0].eventKinds;
        delete request.data.series[0].initialWeight;
        delete request.data.series[0].bounds;
        request.parameters.showReferenceLines = false;
        return request;
      },
    },
  ])('refuses when one $name makes an exact 500-row pre-hidden-carrier plan become L+1', ({ request }) => {
    expectSaturatedRefusal(buildFigure(request()), '/data');
  });

  it('includes carry-in witnesses and influential initial states in the exact plan', () => {
    const carry = example(0);
    carry.data.series = carry.data.series.slice(0, 1);
    carry.data.window = { start: 100, stop: 200, unit: 'ms', boundary: '[start,stop)' };
    carry.data.series[0].recordedInterval = {
      start: 0,
      stop: 300,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    carry.data.series[0].time.values = [50, 150, 250];
    carry.data.series[0].values.values = [1, 1.1, 1.2];
    carry.data.series[0].eventKinds = [
      'presynaptic_spike',
      'presynaptic_spike',
      'presynaptic_spike',
    ];
    carry.parameters.showReferenceLines = false;
    const carryResult = buildFigure(carry);
    expect(carryResult.ok).toBe(true);
    if (!carryResult.ok) throw new Error(JSON.stringify(carryResult.errors));
    expect(carryResult.table.rows.map((row) => row[23])).toEqual([
      'source_state_witness',
      'source_observation',
    ]);

    const initial = structuredClone(carry);
    initial.data.series[0].time.values = [250];
    initial.data.series[0].values.values = [1.2];
    initial.data.series[0].eventKinds = ['presynaptic_spike'];
    const initialResult = buildFigure(initial);
    expect(initialResult.ok).toBe(true);
    if (!initialResult.ok) throw new Error(JSON.stringify(initialResult.errors));
    expect(initialResult.table.rows).toHaveLength(1);
    expect(initialResult.table.rows[0][23]).toBe('declared_initial_state');
  });

  it('matches a deterministic unbounded Set oracle for randomized union grids', () => {
    fc.assert(fc.property(
      fc.uniqueArray(fc.integer({ min: 1, max: 999 }), {
        minLength: 1,
        maxLength: 249,
      }),
      fc.uniqueArray(fc.integer({ min: 1, max: 999 }), {
        minLength: 1,
        maxLength: 249,
      }),
      (leftUnsorted, rightUnsorted) => {
        const left = [...leftUnsorted].sort((a, b) => a - b);
        const right = [...rightUnsorted].sort((a, b) => a - b);
        const request = derivedEventUnionRequest([left, right]);
        const unboundedGridCount = new Set([0, ...left, ...right]).size;
        const exactCarrierCount = left.length + right.length + unboundedGridCount;
        const result = buildFigure(request);
        if (exactCarrierCount <= 500) {
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(result.table.rows).toHaveLength(exactCarrierCount);
        } else {
          expectSaturatedRefusal(
            result,
            '/parameters/aggregate/evaluation',
          );
        }
      },
    ), {
      seed: 0x5e7b0a,
      numRuns: 100,
      endOnFailure: true,
    });
  });

  it('implements the Lean natural-number saturation model under safe-integer guards', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 10_000 }),
      fc.array(fc.integer({ min: 0, max: 1_000_000_000 }), { maxLength: 128 }),
      (limit, increments) => {
        const result = saturatingWeightRowSumForTest(increments, limit);
        const exact = increments.reduce((sum, increment) => sum + BigInt(increment), 0n);
        if (exact <= BigInt(limit)) {
          expect(result).toEqual({
            tag: 'exact_within_budget',
            exactRowCount: Number(exact),
          });
        } else {
          expect(result).toEqual({
            tag: 'saturated_over_budget',
            saturatedRowCount: limit + 1,
          });
          expect(saturatingWeightRowSumForTest([...increments, 0, 1], limit))
            .toEqual(result);
        }
        expect(saturatingWeightRowSumForTest([...increments].reverse(), limit))
          .toEqual(result);
      },
    ), { numRuns: 1_000 });

    expect(saturatingWeightRowSumForTest(
      [Number.MAX_SAFE_INTEGER - 1],
      Number.MAX_SAFE_INTEGER - 1,
    )).toEqual({
      tag: 'exact_within_budget',
      exactRowCount: Number.MAX_SAFE_INTEGER - 1,
    });
    expect(saturatingWeightRowSumForTest(
      [Number.MAX_SAFE_INTEGER - 1, 1],
      Number.MAX_SAFE_INTEGER - 1,
    )).toEqual({
      tag: 'saturated_over_budget',
      saturatedRowCount: Number.MAX_SAFE_INTEGER,
    });
    expect(() => saturatingWeightRowSumForTest([], Number.MAX_SAFE_INTEGER)).toThrow(
      'below MAX_SAFE_INTEGER',
    );
    expect(() => saturatingWeightRowSumForTest([-1], 500)).toThrow(
      'non-negative safe integer',
    );
  });
});
