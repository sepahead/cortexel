import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildFigure } from '../src/render/index.js';

function validExamples(skillId: string): Record<string, any>[] {
  const contract = JSON.parse(readFileSync(
    path.resolve(import.meta.dirname, `../contract/skills/${skillId}.v1.json`),
    'utf8',
  )) as { examples: { valid: Record<string, any>[] } };
  return contract.examples.valid;
}

function built(request: Record<string, unknown>) {
  const result = buildFigure(request);
  if (!result.ok) {
    throw new Error(result.errors.map((error) => `${error.code}: ${error.message}`).join('\n'));
  }
  return result;
}

function tableProjection(
  result: ReturnType<typeof built>,
  keys: readonly string[],
): unknown[][] {
  const indexes = keys.map((key) => {
    const index = result.table.columns.findIndex((column) => column.key === key);
    if (index < 0) throw new Error(`table has no column ${key}`);
    return index;
  });
  return result.table.rows.map((row) => indexes.map((index) => row[index]));
}

function operationReceipt(result: ReturnType<typeof built>): Record<string, unknown> {
  const operations = (result.artifact.derivation as {
    operations: { receipt: Record<string, unknown> }[];
  }).operations;
  expect(operations).toHaveLength(1);
  return operations[0].receipt;
}

describe('specialized compilers preserve scientific units and declared binning', () => {
  it('derives population rates from counts in Hz for both raw and prebinned inputs', () => {
    const examples = validExamples('neuro.population_rate');
    const events = built(examples[0]);
    expect(tableProjection(events, ['binStart', 'binEnd', 'rate'])).toEqual([
      [0, 5, 250],
      [5, 10, 50],
    ]);
    expect(events.disclosures.map((disclosure) => disclosure.id)).toContain('UNIT_CONVERTED');
    expect(operationReceipt(events)).toMatchObject({
      binWidthConversion: { from: 'ms', to: 's' },
    });
    const prebinned = built(examples[1]);
    expect(tableProjection(prebinned, ['binStart', 'binEnd', 'rate'])).toEqual([
      [0, 5, 250],
      [5, 10, 50],
    ]);
    expect(prebinned.disclosures.map((disclosure) => disclosure.id)).toContain(
      'PRE_BINNED_INPUT',
    );
    expect(prebinned.disclosures.map((disclosure) => disclosure.id)).toContain(
      'UNIT_CONVERTED',
    );
    expect(operationReceipt(prebinned)).toMatchObject({
      binWidthConversion: { from: 'ms', to: 's' },
    });
    expect(events.disclosures.map((disclosure) => disclosure.id)).not.toContain(
      'PRE_BINNED_INPUT',
    );

    const withoutSuppliedRates = structuredClone(examples[1]);
    delete withoutSuppliedRates.data.rates;
    expect(tableProjection(built(withoutSuppliedRates), ['binStart', 'binEnd', 'rate'])).toEqual([
      [0, 5, 250],
      [5, 10, 50],
    ]);

    const oneRoundEndpointRate = structuredClone(examples[1]);
    oneRoundEndpointRate.data.binEdges.edges = [0, 0.3];
    oneRoundEndpointRate.data.counts = [3];
    oneRoundEndpointRate.data.sourceEventCount = 3;
    oneRoundEndpointRate.data.recordedSenderIds = Array.from(
      { length: 10 },
      (_value, index) => `sender-${index}`,
    );
    oneRoundEndpointRate.data.recordedSenderCount = 10;
    oneRoundEndpointRate.data.rates.values = [1000];
    oneRoundEndpointRate.data.window.stop = 0.3;
    expect(tableProjection(
      built(oneRoundEndpointRate),
      ['binStart', 'binEnd', 'rate'],
    )).toEqual([[0, 0.3, 1000]]);
  });

  it('binds population bin outer edges exactly to the cross-unit observation window', () => {
    const examples = validExamples('neuro.population_rate');

    const eventCrossUnit = structuredClone(examples[0]);
    eventCrossUnit.data.window = {
      start: 0,
      stop: 1,
      unit: 's',
      boundary: '[start,stop)',
    };
    eventCrossUnit.parameters.bins = {
      mode: 'width',
      unit: 'ms',
      width: 500,
      start: 0,
      stop: 1000,
      boundary: '[lo,hi)',
      finalEdgeInclusive: false,
    };
    expect(tableProjection(
      built(eventCrossUnit),
      ['binStart', 'binEnd', 'rate'],
    )).toEqual([
      [0, 500, 3],
      [500, 1000, 0],
    ]);

    const prebinnedCrossUnit = structuredClone(examples[1]);
    prebinnedCrossUnit.data.binEdges = { unit: 'ms', edges: [0, 1000] };
    prebinnedCrossUnit.data.counts = [5];
    prebinnedCrossUnit.data.sourceEventCount = 5;
    prebinnedCrossUnit.data.window = {
      start: 0,
      stop: 1,
      unit: 's',
      boundary: '[start,stop)',
    };
    delete prebinnedCrossUnit.data.rates;
    expect(tableProjection(
      built(prebinnedCrossUnit),
      ['binStart', 'binEnd', 'rate'],
    )).toEqual([[0, 1000, 1.25]]);

    // These decimal spellings round to the same binary64 after ordinary
    // conversion, but are not the same exact physical endpoint.
    for (const boundaryCase of [
      {
        name: 'start',
        edges: [0.1, 1000],
        window: [0.0001, 1],
        eventTime: 500,
      },
      {
        name: 'stop',
        edges: [0, 0.3],
        window: [0, 0.0003],
        eventTime: 0.1,
      },
    ] as const) {
      for (const mode of ['events', 'prebinned'] as const) {
        const mismatch = structuredClone(mode === 'events' ? examples[0] : examples[1]);
        mismatch.data.window = {
          start: boundaryCase.window[0],
          stop: boundaryCase.window[1],
          unit: 's',
          boundary: '[start,stop)',
        };
        if (mode === 'events') {
          mismatch.data.eventTimes.values = [boundaryCase.eventTime];
          mismatch.data.eventSenderIds = ['1'];
          mismatch.parameters.bins = {
            mode: 'edges',
            unit: 'ms',
            edges: [...boundaryCase.edges],
            boundary: '[lo,hi)',
            finalEdgeInclusive: false,
          };
        } else {
          mismatch.data.binEdges = { unit: 'ms', edges: [...boundaryCase.edges] };
          mismatch.data.counts = [1];
          mismatch.data.sourceEventCount = 1;
          delete mismatch.data.rates;
        }
        const label = `${mode} ${boundaryCase.name} boundary mismatch`;
        const result = buildFigure(mismatch);
        expect(result.ok, label).toBe(false);
        if (result.ok) continue;
        expect(result.errors, label).toContainEqual(
          expect.objectContaining({
            code: 'SCIENCE_BIN_EDGES_INVALID',
            validatorId: 'bins.strictly_increasing',
          }),
        );
      }
    }
  });

  it('requires finite exact bin widths in both population input modes', () => {
    const examples = validExamples('neuro.population_rate');

    const eventMode = structuredClone(examples[0]);
    eventMode.data.eventTimes.values = [0];
    eventMode.data.eventSenderIds = ['1'];
    eventMode.data.recordedSenderIds = ['1'];
    eventMode.data.window = {
      start: -Number.MAX_VALUE,
      stop: Number.MAX_VALUE,
      unit: 's',
      boundary: '[start,stop)',
    };
    eventMode.parameters.bins = {
      mode: 'edges',
      unit: 's',
      edges: [-Number.MAX_VALUE, Number.MAX_VALUE],
      boundary: '[lo,hi)',
      finalEdgeInclusive: false,
    };
    eventMode.parameters.normalization = 'total_event_rate';

    const prebinnedMode = structuredClone(examples[1]);
    prebinnedMode.data.binEdges = {
      unit: 's',
      edges: [-Number.MAX_VALUE, Number.MAX_VALUE],
    };
    prebinnedMode.data.counts = [1];
    prebinnedMode.data.sourceEventCount = 1;
    prebinnedMode.data.recordedSenderIds = ['1'];
    prebinnedMode.data.recordedSenderCount = 1;
    prebinnedMode.data.window = {
      start: -Number.MAX_VALUE,
      stop: Number.MAX_VALUE,
      unit: 's',
      boundary: '[start,stop)',
    };
    prebinnedMode.parameters.normalization = 'total_event_rate';
    delete prebinnedMode.data.rates;

    for (const [mode, request] of [
      ['events', eventMode],
      ['prebinned', prebinnedMode],
    ] as const) {
      const result = buildFigure(request);
      expect(result.ok, `${mode} width overflow`).toBe(false);
      if (result.ok) continue;
      expect(result.errors, `${mode} width overflow`).toContainEqual(
        expect.objectContaining({
          code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          stage: 'science',
        }),
      );
    }
  });

  it('is invariant to physically equivalent population event and supplied-rate units', () => {
    const examples = validExamples('neuro.population_rate');
    const eventBase = built(examples[0]);
    const eventSeconds = structuredClone(examples[0]);
    eventSeconds.data.eventTimes.unit = 's';
    eventSeconds.data.eventTimes.values = eventSeconds.data.eventTimes.values.map(
      (value: number) => value / 1000,
    );
    const eventConverted = built(eventSeconds);
    expect(eventConverted.table.rows).toEqual(eventBase.table.rows);
    expect(eventConverted.disclosures.map((disclosure) => disclosure.id)).toContain(
      'UNIT_CONVERTED',
    );
    const eventConversionDisclosure = eventConverted.disclosures.find(
      (disclosure) => disclosure.id === 'UNIT_CONVERTED',
    )?.text;
    expect(eventConversionDisclosure).toContain('population-rate event times: s -> ms');
    expect(eventConversionDisclosure).toContain('population-rate bin widths: ms -> s');
    const derivation = eventConverted.artifact.derivation as {
      operations: { receipt: Record<string, unknown> }[];
    };
    expect(derivation.operations[0].receipt.eventTimeConversion).toMatchObject({
      from: 's',
      to: 'ms',
    });

    const rateKilohertz = structuredClone(examples[1]);
    rateKilohertz.data.rates.unit = 'kHz';
    rateKilohertz.data.rates.values = rateKilohertz.data.rates.values.map(
      (value: number) => value / 1000,
    );
    const convertedRates = built(rateKilohertz);
    expect(convertedRates.table.rows).toEqual(built(examples[1]).table.rows);
    expect(convertedRates.disclosures.map((disclosure) => disclosure.id)).toContain(
      'UNIT_CONVERTED',
    );
    const rateConversionDisclosure = convertedRates.disclosures.find(
      (disclosure) => disclosure.id === 'UNIT_CONVERTED',
    )?.text;
    expect(rateConversionDisclosure).toContain('population-rate bin widths: ms -> s');
    expect(rateConversionDisclosure).toContain('supplied population rates: kHz -> Hz');
  });

  it('honours every shipped ISI bin mode and normalization', () => {
    const examples = validExamples('neuro.isi_distribution');
    const eventMode = built(examples[0]);
    expect(tableProjection(eventMode, ['binStart', 'binEnd', 'count'])).toEqual([
      [0, 5, 0],
      [5, 10, 0],
      [10, 15, 1],
      [15, 20, 0],
      [20, 25, 2],
    ]);
    expect((eventMode.artifact.derivation as any).operations[0].receipt).toMatchObject({
      trainCount: 6,
      trainsWithoutIntervalCount: 4,
    });
    const density = tableProjection(built(examples[1]), ['binStart', 'binEnd', 'density']);
    expect(density.map((row) => row.slice(0, 2))).toEqual([[2, 8], [8, 32]]);
    expect(Number(density[0][2])).toBeCloseTo(1 / 12, 15);
    expect(Number(density[1][2])).toBeCloseTo(1 / 48, 15);
    const excluded = built(examples[2]);
    expect(tableProjection(excluded, [
      'binStart',
      'binEnd',
      'probability',
      'formedIntervalCount',
      'binnedIntervalCount',
      'underRangeCount',
      'overRangeCount',
    ])).toEqual([
      [0, 2, 0.5, 3, 2, 0, 1],
      [2, 4, 0.5, 3, 2, 0, 1],
    ]);
    expect(excluded.plan.accessibility.panelSummaries.join(' ')).toContain(
      'Exact conservation: 3 formed intervals = 2 binned + 0 below range + 1 above range',
    );
    expect(tableProjection(
      built(examples[3]),
      ['binStart', 'binEnd', 'count'],
    )).toEqual([[0, 10, 0], [10, 20, 3], [20, 30, 0]]);
  });

  it('keeps ISI results invariant under a physically equivalent event-clock unit', () => {
    const request = structuredClone(validExamples('neuro.isi_distribution')[3]);
    request.data.eventTimes.values = [1, 12, 29, 48];
    const expected = built(request).table.rows;
    request.data.eventTimes.unit = 's';
    request.data.eventTimes.values = request.data.eventTimes.values.map(
      (value: number) => value / 1000,
    );
    expect(built(request).table.rows).toEqual(expected);
  });

  it('refuses a rounded ISI that would cross an exact half-open bin boundary', () => {
    const request = structuredClone(validExamples('neuro.isi_distribution')[3]);
    request.data.eventTimes = {
      kind: 'time',
      unit: 's',
      values: [2 ** -54, 1],
    };
    request.data.eventSenderIds = ['5', '5'];
    request.data.window = {
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
      finalEdgeInclusive: true,
    };
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain(
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
    );
  });

  it('checks supplied interval duration against the exact observation window', () => {
    const request = structuredClone(validExamples('neuro.isi_distribution')[1]);
    request.data.intervals = {
      kind: 'interspike_interval',
      unit: 's',
      values: [1],
    };
    request.data.intervalSenderIds = ['1'];
    request.data.trains = [{ senderId: '1', spikeCount: 2 }];
    request.data.recordedSenderIds = ['1'];
    request.data.window = {
      start: 2 ** -54,
      stop: 1,
      unit: 's',
      boundary: '[start,stop)',
    };
    request.parameters.bins = {
      mode: 'edges',
      unit: 's',
      edges: [0.5, 2],
      boundary: '[lo,hi)',
      finalEdgeInclusive: true,
    };
    request.parameters.normalization = 'count';
    request.parameters.xScale = 'linear';
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
  });

  it('preflights single-series histogram bin amplification before geometry allocation', () => {
    const request = structuredClone(validExamples('neuro.isi_distribution')[0]);
    request.parameters.bins = {
      mode: 'width',
      unit: 'ms',
      start: 0,
      stop: 30_000,
      width: 1,
    };
    request.presentation = { budgetProfile: 'agent' };
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'RESOURCE_MARKS_EXCEEDED',
      stage: 'budget',
      limit: expect.objectContaining({ observed: 30_000, limit: 25_000 }),
    }));
  });

  it('honours delay-distribution edges, aggregation, units, and normalization', () => {
    const examples = validExamples('network.delay_distribution');
    expect(tableProjection(built(examples[0]), ['binStart', 'binEnd', 'count'])).toEqual([
      [0.5, 1, 0],
      [1, 1.5, 1],
      [1.5, 2, 2],
      [2, 2.5, 1],
      [2.5, 3, 0],
    ]);
    expect(tableProjection(built(examples[1]), [
      'groupId',
      'consideredConnectionCount',
      'groupObservationCount',
      'excludedUnderRangeCount',
      'excludedOverRangeCount',
      'binStart',
      'binEnd',
      'probability',
    ])).toEqual([
      ['static_synapse', 3, 2, 0, 0, 0.5, 1, 0],
      ['static_synapse', 3, 2, 0, 0, 1, 1.5, 0.5],
      ['static_synapse', 3, 2, 0, 0, 1.5, 2, 0],
      ['static_synapse', 3, 2, 0, 0, 2, 2.5, 0.5],
      ['stdp_synapse', 1, 1, 0, 0, 0.5, 1, 0],
      ['stdp_synapse', 1, 1, 0, 0, 1, 1.5, 0],
      ['stdp_synapse', 1, 1, 0, 0, 1.5, 2, 1],
      ['stdp_synapse', 1, 1, 0, 0, 2, 2.5, 0],
    ]);
    expect(tableProjection(built(examples[2]), ['binStart', 'binEnd', 'density'])).toEqual([
      [0.5, 1, 0],
      [1, 1.5, 0.4],
      [1.5, 2, 1.2],
      [2, 2.5, 0.4],
      [2.5, 3, 0],
    ]);
    expect(tableProjection(built(examples[3]), ['binStart', 'binEnd', 'count'])).toEqual([
      [0.5, 1, 0],
      [1, 1.5, 1],
      [1.5, 2, 2],
      [2, 2.5, 1],
    ]);

    const grouped = built(examples[1]);
    expect(grouped.plan.accessibility.panelSummaries.join(' ')).toContain(
      'Group static_synapse: exact conservation gives 2 non-missing observations from 3 connection rows',
    );
    const permuted = structuredClone(examples[1]);
    const order = [2, 0, 1, 3];
    for (const key of ['sourceIds', 'targetIds', 'edgeIds', 'synapseModels']) {
      permuted.data.connections[key] = order.map(
        (index) => permuted.data.connections[key][index],
      );
    }
    permuted.data.connections.delays.values = order.map(
      (index) => permuted.data.connections.delays.values[index],
    );
    const permutedBuilt = built(permuted);
    expect(permutedBuilt.table).toEqual(grouped.table);
    expect(permutedBuilt.plan.legend).toEqual(grouped.plan.legend);
    expect(
      (permutedBuilt.artifact.derivation as any).operations[0].outputDigest,
    ).toBe((grouped.artifact.derivation as any).operations[0].outputDigest);
  });

  it('preflights grouped histogram mark amplification before geometry allocation', () => {
    const request = structuredClone(validExamples('network.delay_distribution')[1]);
    request.parameters.bins = {
      mode: 'edges',
      unit: 'ms',
      edges: Array.from({ length: 10_002 }, (_value, index) => 0.5 + index * 0.001),
      finalEdgeInclusive: true,
    };
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'RESOURCE_MARKS_EXCEEDED',
      stage: 'budget',
      limit: expect.objectContaining({ observed: 20_002, limit: 20_000 }),
    }));
  });

  it('uses the contract spelling and semantics for unique-neighbor degree counts', () => {
    const request = validExamples('network.degree_distribution')[2];
    const result = built(request);
    expect(tableProjection(result, ['degreeLow', 'degreeHigh', 'nodeCount'])).toEqual([
      [0, 0, 0],
      [1, 1, 3],
      [2, 2, 1],
    ]);
    expect(result.disclosures.map((disclosure) => disclosure.id)).toContain(
      'MULTAPSE_AGGREGATED',
    );
  });

  it('honours weight-distribution explicit/prebinned edges and probability', () => {
    const examples = validExamples('network.weight_distribution');
    expect(tableProjection(built(examples[0]), ['binLow', 'binHigh', 'count'])).toEqual([
      [-100, -50, 2],
      [-50, 0, 0],
      [0, 50, 4],
      [50, 100, 0],
    ]);
    expect(tableProjection(built(examples[1]), [
      'binLow',
      'binHigh',
      'count',
      'sourceConnectionCount',
      'inRangeObservationCount',
      'missingObservationCount',
    ])).toEqual([
      [-2, -1, 10, 102, 100, 2],
      [-1, 0, 15, 102, 100, 2],
      [0, 1, 40, 102, 100, 2],
      [1, 2, 35, 102, 100, 2],
    ]);

    const exactDensity = structuredClone(examples[0]);
    const lower = 3.316200273506474e-23;
    const upper = 1.1368683775477803e-13;
    exactDensity.data.connections.weights.values =
      exactDensity.data.connections.weights.values.map(() => 5e-14);
    exactDensity.parameters.bins = {
      mode: 'edges',
      unit: 'pA',
      edges: [lower, upper],
      finalEdgeInclusive: true,
    };
    exactDensity.parameters.normalization = 'density';
    expect(tableProjection(built(exactDensity), ['binLow', 'binHigh', 'value'])[0]).toEqual([
      lower,
      upper,
      8796093022208,
    ]);
    expect(tableProjection(built(examples[2]), ['binLow', 'binHigh', 'value'])).toEqual([
      [-100, -50, 0.2],
      [-50, 0, 0.2],
      [0, 50, 0.2],
      [50, 100, 0.4],
    ]);
  });

  it('honours weight node-pair aggregation, magnitude, and missing-value linkage', () => {
    const base = validExamples('network.weight_distribution')[0];

    const nodePairs = structuredClone(base);
    nodePairs.parameters.observationUnit = 'node_pair';
    nodePairs.parameters.aggregation = 'sum';
    const aggregated = built(nodePairs);
    expect(tableProjection(aggregated, ['binLow', 'binHigh', 'count'])).toEqual([
      [-100, -50, 2],
      [-50, 0, 0],
      [0, 50, 2],
      [50, 100, 1],
    ]);
    expect(aggregated.disclosures.map((disclosure) => disclosure.id)).toContain(
      'MULTAPSE_AGGREGATED',
    );

    const uniquePairs = structuredClone(nodePairs);
    uniquePairs.data.connections.targetIds[1] = '4';
    expect(
      built(uniquePairs).disclosures.map((disclosure) => disclosure.id),
    ).not.toContain('MULTAPSE_AGGREGATED');

    const magnitudes = structuredClone(base);
    magnitudes.parameters.signTreatment = 'magnitude';
    magnitudes.parameters.bins.edges = [0, 25, 50, 75, 100];
    expect(tableProjection(built(magnitudes), ['binLow', 'binHigh', 'count'])).toEqual([
      [0, 25, 1],
      [25, 50, 3],
      [50, 75, 1],
      [75, 100, 1],
    ]);

    const missingPair = structuredClone(nodePairs);
    missingPair.data.connections.weights.values[1] = null;
    const missingBuilt = built(missingPair);
    expect(tableProjection(missingBuilt, [
      'binLow',
      'binHigh',
      'count',
      'sourceConnectionCount',
      'inRangeObservationCount',
      'missingObservationCount',
    ])).toEqual([
      [-100, -50, 2, 6, 4, 1],
      [-50, 0, 0, 6, 4, 1],
      [0, 50, 2, 6, 4, 1],
      [50, 100, 0, 6, 4, 1],
    ]);
    expect(missingBuilt.disclosures.map((disclosure) => disclosure.id)).toContain(
      'MULTAPSE_AGGREGATED',
    );
    expect((missingBuilt.artifact.derivation as any).operations[0].receipt).toMatchObject({
      sourceConnectionRowCount: 6,
      formedObservationCount: 4,
      missingMeasurementCount: 1,
      missingObservationCount: 1,
    });

    const noAggregation = structuredClone(missingPair);
    noAggregation.parameters.aggregation = 'no_aggregation';
    const refused = buildFigure(noAggregation);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.errors.map((error) => error.code)).toContain(
        'SCIENCE_AGGREGATION_REQUIRED',
      );
    }
  });

  it('refuses empty normalized histograms and impossible supplied train linkage', () => {
    const empty = structuredClone(validExamples('neuro.isi_distribution')[2]);
    empty.data.eventTimes.values = [1];
    empty.data.eventSenderIds = ['7'];
    const emptyResult = buildFigure(empty);
    expect(emptyResult.ok).toBe(false);
    if (!emptyResult.ok) {
      expect(emptyResult.errors.map((error) => error.code)).toContain('RENDER_NO_DATA');
    }

    const impossibleSpan = structuredClone(validExamples('neuro.isi_distribution')[1]);
    impossibleSpan.data.intervals.values = [125, 125, 12, 18];
    const spanResult = buildFigure(impossibleSpan);
    expect(spanResult.ok).toBe(false);
    if (!spanResult.ok) {
      expect(spanResult.errors.map((error) => error.code)).toContain(
        'SCIENCE_EVENT_OUT_OF_WINDOW',
      );
    }

    const excludedStop = structuredClone(validExamples('neuro.isi_distribution')[1]);
    excludedStop.data.intervals.values = [100, 100, 12, 18];
    excludedStop.data.window.stop = 200;
    const excludedStopResult = buildFigure(excludedStop);
    expect(excludedStopResult.ok).toBe(false);
    if (!excludedStopResult.ok) {
      expect(excludedStopResult.errors.map((error) => error.code)).toContain(
        'SCIENCE_EVENT_OUT_OF_WINDOW',
      );
    }

    const undeclaredTrain = structuredClone(validExamples('neuro.isi_distribution')[1]);
    undeclaredTrain.data.intervals.values = [4, 6];
    undeclaredTrain.data.intervalSenderIds = ['1', '2'];
    undeclaredTrain.data.trains = [
      { senderId: '1', spikeCount: 2 },
      { senderId: '2', spikeCount: 1 },
      { senderId: '3', spikeCount: 1 },
    ];
    const undeclaredResult = buildFigure(undeclaredTrain);
    expect(undeclaredResult.ok).toBe(false);
    if (!undeclaredResult.ok) {
      expect(undeclaredResult.errors.map((error) => error.code)).toContain(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      );
    }
  });

  it('checks raw and prebinned distribution range policy and log-domain observations', () => {
    const delay = validExamples('network.delay_distribution');
    const prebinnedDelay = structuredClone(delay[2]);
    prebinnedDelay.data.underRangeCount = 1;
    const delayResult = buildFigure(prebinnedDelay);
    expect(delayResult.ok).toBe(false);
    if (!delayResult.ok) {
      expect(delayResult.errors.map((error) => error.code)).toContain(
        'SCIENCE_BIN_EDGES_INVALID',
      );
    }

    const weights = validExamples('network.weight_distribution');
    const prebinnedWeight = structuredClone(weights[1]);
    prebinnedWeight.data.excludedUnderRangeCount = 1;
    prebinnedWeight.data.totalObservationCount = 101;
    const weightResult = buildFigure(prebinnedWeight);
    expect(weightResult.ok).toBe(false);
    if (!weightResult.ok) {
      expect(weightResult.errors.map((error) => error.code)).toContain(
        'SCIENCE_BIN_EDGES_INVALID',
      );
    }

    const logarithmic = structuredClone(weights[0]);
    logarithmic.parameters.xScale = 'log';
    logarithmic.parameters.bins.edges = [1, 25, 50, 75, 100];
    logarithmic.parameters.outOfRangeWeights = 'exclude_and_report';
    const logResult = buildFigure(logarithmic);
    expect(logResult.ok).toBe(false);
    if (!logResult.ok) {
      expect(logResult.errors.map((error) => error.code)).toContain(
        'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
      );
    }
  });

  it('refuses negative probability or density values even when totals look normalized', () => {
    const request = structuredClone(validExamples('network.delay_distribution')[2]);
    request.data.histogram.values = [-1, 3, 0, 0, 0];
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
    );
  });
});
