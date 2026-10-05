import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalDigest } from '../src/core/canonicalize.js';
import { buildFigureFromJson, type FigureResult } from '../src/render/index.js';

// These arrays are synthetic contract controls. They are not simulator observations.
// A host must validate its execution receipt and source joins before authoring a request.
const normalizedSource = {
  populationId: 'population-a',
  runId: 'normalized-contract-control',
  declaredWindow: { start: 0, stop: 10, unit: 'ms', boundary: '[start,stop]' },
  traceOrder: 'time_then_sender_v1',
  vmTimes: [0, 0, 5, 5, 10, 10],
  vmSenders: [11, 12, 11, 12, 11, 12],
  vmValues: [-70, -68, -69, -66, -67, -64],
  recordedVoltageSenderIds: [11, 12],
  spikeTimes: [0, 5, 5, 10],
  spikeSenders: [11, 11, 11, 12],
  recordedSpikeSenderIds: [11, 12, 13],
};

const sourceDeclaration = {
  kind: 'simulation',
  system: 'NEST',
  systemVersion: '3.9.0',
  runId: normalizedSource.runId,
  sourceDigest: canonicalDigest(normalizedSource),
  declaredLimitations: [
    'Synthetic contract control; no simulator run was observed.',
    'The window describes normalized traces, not a raw NEST device-clock capture.',
  ],
};

function analogRequest() {
  return {
    contract: { name: 'cortexel-figure-request', version: '1.0' },
    skill: { id: 'neuro.analog_trace' },
    data: {
      window: { ...normalizedSource.declaredWindow },
      seriesIds: ['sender-11-voltage', 'sender-12-voltage'],
      series: [
        {
          label: 'Sender 11 membrane voltage',
          recordedVariable: 'V_m',
          cellId: '11',
          populationId: normalizedSource.populationId,
          observationKind: 'point_sample',
          origin: { kind: 'recorded' },
          time: { kind: 'time', unit: 'ms', values: [0, 5, 10] },
          values: { kind: 'membrane_voltage', unit: 'mV', values: [-70, -69, -67] },
        },
        {
          label: 'Sender 12 membrane voltage',
          recordedVariable: 'V_m',
          cellId: '12',
          populationId: normalizedSource.populationId,
          observationKind: 'point_sample',
          origin: { kind: 'recorded' },
          time: { kind: 'time', unit: 'ms', values: [0, 5, 10] },
          values: { kind: 'membrane_voltage', unit: 'mV', values: [-68, -66, -64] },
        },
      ],
    },
    parameters: {
      layout: 'shared_axis',
      valueUnit: 'mV',
      duplicateTimePolicy: 'reject',
      showSamplePoints: true,
      uncertainty: { kind: 'none', reason: 'single_trial' },
    },
    source: structuredClone(sourceDeclaration),
  };
}

function spikeRequest() {
  return {
    contract: { name: 'cortexel-figure-request', version: '1.0' },
    skill: { id: 'neuro.spike_raster' },
    data: {
      eventTimes: { kind: 'time', unit: 'ms', values: [...normalizedSource.spikeTimes] },
      eventSenderIds: normalizedSource.spikeSenders.map(String),
      recordedSenderIds: normalizedSource.recordedSpikeSenderIds.map(String),
      senderPopulationIds: ['population-a', 'population-a', 'population-a'],
      window: { ...normalizedSource.declaredWindow },
      timeBase: 'absolute_clock',
      senderUniverseComplete: true,
      eventCompleteness: 'complete_for_recorded_senders',
    },
    parameters: {
      rowOrder: 'as_declared',
      markStyle: 'tick',
      outOfWindowPolicy: 'reject',
      aboveMarkBudget: 'refuse',
    },
    source: structuredClone(sourceDeclaration),
  };
}

function built(request: unknown): FigureResult {
  const result = buildFigureFromJson(JSON.stringify(request));
  if (!result.ok) {
    throw new Error(result.errors.map((error) => `${error.code}: ${error.message}`).join('\n'));
  }
  return result;
}

function rows(result: FigureResult) {
  return result.table.rows.map((row) => Object.fromEntries(
    result.table.columns.map((column, index) => [column.key, row[index]]),
  ));
}

function refused(request: unknown) {
  const result = buildFigureFromJson(JSON.stringify(request));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('the negative control unexpectedly built');
  return result.errors.map((error) => error.code);
}

describe('caller-authored normalized NEST 3.9 request controls', () => {
  it('keeps sender identity, inclusive endpoints, and exact voltage samples in the complete table', () => {
    const request = analogRequest();
    const before = structuredClone(request);
    const result = built(request);
    expect(request).toEqual(before);
    expect(rows(result).map(({ seriesId, time, timeUnit, value, valueUnit, sourceOrdinal }) =>
      ({ seriesId, time, timeUnit, value, valueUnit, sourceOrdinal }))).toEqual([
      { seriesId: 'sender-11-voltage', time: 0, timeUnit: 'ms', value: -70, valueUnit: 'mV', sourceOrdinal: 0 },
      { seriesId: 'sender-11-voltage', time: 5, timeUnit: 'ms', value: -69, valueUnit: 'mV', sourceOrdinal: 1 },
      { seriesId: 'sender-11-voltage', time: 10, timeUnit: 'ms', value: -67, valueUnit: 'mV', sourceOrdinal: 2 },
      { seriesId: 'sender-12-voltage', time: 0, timeUnit: 'ms', value: -68, valueUnit: 'mV', sourceOrdinal: 0 },
      { seriesId: 'sender-12-voltage', time: 5, timeUnit: 'ms', value: -66, valueUnit: 'mV', sourceOrdinal: 1 },
      { seriesId: 'sender-12-voltage', time: 10, timeUnit: 'ms', value: -64, valueUnit: 'mV', sourceOrdinal: 2 },
    ]);
    expect(result.table.policy).toBe('complete_returned');
    expect(result.table.rowsTotal).toBe(6);
    expect(result.table.rowsInline).toBe(6);
    expect(result.artifact.canonicalRequest).toMatchObject({
      source: sourceDeclaration,
      data: { series: [{ cellId: '11' }, { cellId: '12' }] },
    });
    expect(result.disclosures.map((entry) => entry.id)).toContain('SOURCE_AUTHENTICITY_UNVERIFIED');
    expect(result.table.metadata?.sourceStatements).toHaveLength(2);
    expect(result.plan.accessibility.summary).toContain('declared by caller; not verified');
  });

  it('refuses incompatible declared units and misaligned arrays without filtering values', () => {
    const wrongUnit = analogRequest();
    wrongUnit.data.series[0].values.unit = 'pA';
    expect(refused(wrongUnit)).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');
    const misaligned = analogRequest();
    misaligned.data.series[0].values.values.pop();
    expect(refused(misaligned)).toContain('SEMANTIC_LENGTH_MISMATCH');
    expect(built(analogRequest()).table.rows).toHaveLength(6);
  });

  it('keeps duplicate events, array ordinals, declared silent senders, and the closed stop', () => {
    const result = built(spikeRequest());
    expect(rows(result).map(({ sourceOrdinal, time, senderId, inWindow }) =>
      ({ sourceOrdinal, time, senderId, inWindow }))).toEqual([
      { sourceOrdinal: 0, time: 0, senderId: '11', inWindow: 'true' },
      { sourceOrdinal: 1, time: 5, senderId: '11', inWindow: 'true' },
      { sourceOrdinal: 2, time: 5, senderId: '11', inWindow: 'true' },
      { sourceOrdinal: 3, time: 10, senderId: '12', inWindow: 'true' },
    ]);
    const senderAxis = result.plan.panels[0].axes.find((axis) => axis.orientation === 'left');
    expect(senderAxis?.ticks.map((tick) => tick.label)).toEqual(['11', '12', '13']);
    expect(result.table.rowsTotal).toBe(4);
    expect(result.artifact.canonicalRequest).toMatchObject({
      source: sourceDeclaration,
      data: { recordedSenderIds: ['11', '12', '13'], window: normalizedSource.declaredWindow },
    });
  });

  it('allows explicitly recorded silence while retaining its complete sender universe', () => {
    const request = spikeRequest();
    request.data.eventTimes.values = [];
    request.data.eventSenderIds = [];
    const result = built(request);
    expect(result.table.rows).toEqual([]);
    expect(result.table.rowsTotal).toBe(0);
    const senderAxis = result.plan.panels[0].axes.find((axis) => axis.orientation === 'left');
    expect(senderAxis?.ticks.map((tick) => tick.label)).toEqual(['11', '12', '13']);
    expect(result.table.metadata?.disclosures).toEqual(result.plan.disclosures);
    const undeclaredData: Partial<typeof request.data> = { ...request.data };
    delete undeclaredData.recordedSenderIds;
    expect(refused({ ...request, data: undeclaredData })).toContain('SCHEMA_REQUIRED_PROPERTY_MISSING');
  });

  it('refuses an unknown sender, missing endpoint convention, and an excluded stop', () => {
    const unknownSender = spikeRequest();
    unknownSender.data.eventSenderIds[0] = '999';
    expect(refused(unknownSender)).toContain('SEMANTIC_UNKNOWN_REFERENCE');
    const missingBoundary = spikeRequest();
    const incompleteWindow: Partial<typeof missingBoundary.data.window> = {
      ...missingBoundary.data.window,
    };
    delete incompleteWindow.boundary;
    expect(refused({
      ...missingBoundary,
      data: { ...missingBoundary.data, window: incompleteWindow },
    })).toContain('SCHEMA_REQUIRED_PROPERTY_MISSING');
    const halfOpen = spikeRequest();
    halfOpen.data.window.boundary = '[start,stop)';
    expect(refused(halfOpen)).toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(built(spikeRequest()).table.rows).toHaveLength(4);
  });

  it('does not grant the pinned raw NEST 3.10 clock profile to normalized NEST 3.9 arrays', () => {
    const contract = JSON.parse(readFileSync(
      path.resolve(import.meta.dirname, '../contract/skills/neuro.spike_raster.v1.json'),
      'utf8',
    )) as { examples: { valid: (Record<string, unknown> & { source: Record<string, unknown> })[] } };
    const native = structuredClone(contract.examples.valid[0]);
    expect(built(native).ok).toBe(true);
    const forgedVersion = { ...native, source: { ...native.source, systemVersion: '3.9.0' } };
    expect(refused(forgedVersion)).toContain('PROVENANCE_SOURCE_CLOCK_INCONSISTENT');
    expect(built(spikeRequest()).ok).toBe(true);
  });
});
