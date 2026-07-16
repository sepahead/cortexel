import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';

function contract(id: string) {
  return JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, `../contract/skills/${id}.v1.json`), 'utf8'),
  ) as { examples: { valid: Record<string, unknown>[] } };
}

function column(result: { plan: { table: { columns: readonly { key: string }[] } } }, key: string): number {
  const index = result.plan.table.columns.findIndex((entry) => entry.key === key);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe('trace render completeness', () => {
  it('renders every analog series, its declared panel grouping, and every retained table row', () => {
    const examples = contract('neuro.analog_trace').examples.valid;

    const shared = buildFigure(examples[0]);
    expect(shared.ok).toBe(true);
    if (!shared.ok) return;
    expect(shared.plan.legend?.map((item) => item.label)).toEqual([
      'Cell 1 membrane potential',
      'Cell 2 membrane potential',
    ]);
    expect(shared.plan.table.rowsTotal).toBe(10);
    expect(shared.plan.table.rows.filter((row) => row[0] === 'cell_2_vm')).toHaveLength(5);
    expect(shared.svg).toContain('data-legend="true"');
    expect(shared.svg).toContain('Cell 2 membrane potential');

    const multiples = buildFigure(examples[1]);
    expect(multiples.ok).toBe(true);
    if (!multiples.ok) return;
    expect(multiples.plan.panels).toHaveLength(2);
    expect(multiples.plan.table.rowsTotal).toBe(8);
    const held = multiples.plan.panels[1].marks[0];
    expect(held.type).toBe('line');
    if (held.type === 'line') expect(held.subpaths[0]).toHaveLength(5); // 3 samples + 2 holds

    const duplicates = buildFigure(examples[2]);
    expect(duplicates.ok).toBe(true);
    if (!duplicates.ok) return;
    expect(duplicates.plan.table.rowsTotal).toBe(3);
    expect(duplicates.plan.table.rows.map((row) => row[column(duplicates, 'value')])).toEqual([-70, -67, -65]);
    expect(duplicates.plan.table.rows.map((row) => row[column(duplicates, 'replicateCount')])).toEqual([1, 2, 1]);
    expect((duplicates.artifact.derivation as { operations: unknown[] }).operations).toHaveLength(1);
    expect(duplicates.disclosures.map((disclosure) => disclosure.id)).toContain('DUPLICATE_TIMES_AGGREGATED');
  });

  it('renders every multi-signal panel and applies declared conversion and z-score math', () => {
    const examples = contract('neuro.multisignal_trace').examples.valid;

    const panels = buildFigure(examples[0]);
    expect(panels.ok).toBe(true);
    if (!panels.ok) return;
    expect(panels.plan.panels.map((panel) => panel.id)).toEqual(['chemistry', 'membrane', 'current']);
    expect(panels.plan.legend).toHaveLength(4);
    expect(panels.plan.table.rowsTotal).toBe(20);

    const normalized = buildFigure(examples[1]);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.plan.table.rowsTotal).toBe(8);
    for (const seriesId of ['ca', 'ip3']) {
      const values = normalized.plan.table.rows
        .filter((row) => row[0] === seriesId)
        .map((row) => row[column(normalized, 'displayValue')] as number);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const sampleVariance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
      expect(mean).toBeCloseTo(0, 12);
      expect(Math.sqrt(sampleVariance)).toBeCloseTo(1, 12);
    }

    const converted = buildFigure(examples[2]);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    const ip3 = converted.plan.table.rows.filter((row) => row[0] === 'ip3');
    expect(ip3.map((row) => row[column(converted, 'displayValue')])).toEqual([0.16, 0.61, 0.44, 0.21]);
    expect(ip3.every((row) => row[column(converted, 'displayUnit')] === 'umol/L')).toBe(true);
    expect(converted.disclosures.map((disclosure) => disclosure.id)).toContain('UNIT_CONVERTED');

    const opaque = structuredClone(examples[2]) as any;
    opaque.data.series = [opaque.data.series[0]];
    opaque.data.series[0].seriesId = 'weight';
    opaque.data.series[0].label = 'Recorded synaptic weight';
    opaque.data.series[0].variableId = 'weight';
    opaque.data.series[0].values = {
      kind: 'synaptic_weight',
      unit: 'nest:weight',
      values: [1, 2, 3, 4],
    };
    opaque.parameters.panels = [{
      panelId: 'chemistry',
      label: 'Simulator-defined weight',
      unit: 'nest:weight',
      scale: 'linear',
    }];
    expect(validateRequestValue(opaque).ok).toBe(true);
    const opaqueResult = buildFigure(opaque);
    expect(opaqueResult.ok).toBe(true);
    if (!opaqueResult.ok) return;
    expect(opaqueResult.plan.table.rows.map(
      (row) => row[column(opaqueResult, 'displayValue')],
    )).toEqual([1, 2, 3, 4]);
  });
});

describe('trace duplicate-time authority', () => {
  it('rejects explicit reject policies and accepts explicit keep policies in both schema shapes', () => {
    const analog = structuredClone(contract('neuro.analog_trace').examples.valid[0]);
    const analogSeries = (analog.data as { series: { time: { values: number[] } }[] }).series[0];
    analogSeries.time.values[1] = analogSeries.time.values[0];
    (analog.parameters as { duplicateTimePolicy: string }).duplicateTimePolicy = 'reject';
    const rejectedAnalog = validateRequestValue(analog);
    expect(rejectedAnalog.ok).toBe(false);
    if (!rejectedAnalog.ok) {
      expect(rejectedAnalog.errors.map((error) => error.code)).toContain('SCIENCE_DUPLICATE_TIME_POLICY');
    }
    (analog.parameters as { duplicateTimePolicy: string }).duplicateTimePolicy = 'keep_replicates';
    expect(validateRequestValue(analog).ok).toBe(true);

    const multi = structuredClone(contract('neuro.multisignal_trace').examples.valid[0]);
    const sharedTimes = (multi.data as { eventTimes: { values: number[] } }).eventTimes.values;
    sharedTimes[1] = sharedTimes[0];
    (multi.parameters as { duplicateTimePolicy: { policy: string } }).duplicateTimePolicy.policy = 'reject';
    const rejectedMulti = validateRequestValue(multi);
    expect(rejectedMulti.ok).toBe(false);
    if (!rejectedMulti.ok) {
      expect(rejectedMulti.errors.map((error) => error.code)).toContain('SCIENCE_DUPLICATE_TIME_POLICY');
    }
    (multi.parameters as { duplicateTimePolicy: { policy: string } }).duplicateTimePolicy.policy = 'keep_replicates';
    expect(validateRequestValue(multi).ok).toBe(true);
  });
});

describe('trace render fail-closed laws', () => {
  it('executes the structured multi-signal aggregate policy and binds a receipt', () => {
    const request = structuredClone(contract('neuro.multisignal_trace').examples.valid[0]) as any;
    request.data.eventTimes.values[1] = request.data.eventTimes.values[0];
    request.parameters.duplicateTimePolicy = { policy: 'aggregate', aggregate: 'mean' };

    expect(validateRequestValue(request).ok).toBe(true);
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.table.rowsTotal).toBe(16);
    expect(result.disclosures.map((disclosure) => disclosure.id)).toContain('DUPLICATE_TIMES_AGGREGATED');
    const operations = (result.artifact.derivation as { operations: { receipt: Record<string, unknown> }[] }).operations;
    expect(operations).toHaveLength(4);
    expect(operations.every((operation) => operation.receipt.duplicateGroupCount === 1)).toBe(true);
  });

  it('refuses undeclared, empty, or duplicate panel partitions and duplicate series identities', () => {
    const base = contract('neuro.multisignal_trace').examples.valid[0];

    const undeclared = structuredClone(base) as any;
    undeclared.data.series[0].panelId = 'not-declared';
    expect(validateRequestValue(undeclared).ok).toBe(true);
    const undeclaredResult = buildFigure(undeclared);
    expect(undeclaredResult.ok).toBe(false);
    if (!undeclaredResult.ok) expect(undeclaredResult.errors[0].code).toBe('RENDER_NO_DATA');

    const empty = structuredClone(base) as any;
    empty.parameters.panels.push({ panelId: 'empty', label: 'Empty', unit: 'mV', scale: 'linear' });
    expect(validateRequestValue(empty).ok).toBe(true);
    const emptyResult = buildFigure(empty);
    expect(emptyResult.ok).toBe(false);
    if (!emptyResult.ok) expect(emptyResult.errors[0].code).toBe('RENDER_NO_DATA');

    const duplicateSeries = structuredClone(base) as any;
    duplicateSeries.data.series[1].seriesId = duplicateSeries.data.series[0].seriesId;
    expect(validateRequestValue(duplicateSeries).ok).toBe(true);
    const duplicateSeriesResult = buildFigure(duplicateSeries);
    expect(duplicateSeriesResult.ok).toBe(false);
    if (!duplicateSeriesResult.ok) expect(duplicateSeriesResult.errors[0].code).toBe('SEMANTIC_DUPLICATE_ID');

    const duplicatePanels = structuredClone(base) as any;
    duplicatePanels.parameters.panels[1].panelId = duplicatePanels.parameters.panels[0].panelId;
    expect(validateRequestValue(duplicatePanels).ok).toBe(true);
    const duplicatePanelsResult = buildFigure(duplicatePanels);
    expect(duplicatePanelsResult.ok).toBe(false);
    if (!duplicatePanelsResult.ok) expect(duplicatePanelsResult.errors[0].code).toBe('SEMANTIC_DUPLICATE_ID');
  });

  it('honours declared panel order and applies linear, log, and symlog as distinct transforms', () => {
    const ordered = structuredClone(contract('neuro.multisignal_trace').examples.valid[0]) as any;
    ordered.parameters.panelOrder = 'by_panel_id';
    const orderedResult = buildFigure(ordered);
    expect(orderedResult.ok).toBe(true);
    if (orderedResult.ok) {
      expect(orderedResult.plan.panels.map((panel) => panel.id)).toEqual(['chemistry', 'current', 'membrane']);
    }

    const positive = contract('neuro.multisignal_trace').examples.valid[2];
    const linear = buildFigure(positive);
    const logarithmicRequest = structuredClone(positive) as any;
    logarithmicRequest.parameters.panels[0].scale = 'log';
    const logarithmic = buildFigure(logarithmicRequest);
    expect(linear.ok).toBe(true);
    expect(logarithmic.ok).toBe(true);
    if (linear.ok && logarithmic.ok) {
      expect(logarithmic.plan.panels[0].axes.find((axis) => axis.orientation === 'left')?.transform).toBe('log');
      expect(logarithmic.plan.panels[0].marks).not.toEqual(linear.plan.panels[0].marks);
    }

    const negativeLog = structuredClone(contract('neuro.multisignal_trace').examples.valid[0]) as any;
    negativeLog.parameters.panels[1].scale = 'log';
    const negativeLogResult = buildFigure(negativeLog);
    expect(negativeLogResult.ok).toBe(false);
    if (!negativeLogResult.ok) expect(negativeLogResult.errors[0].code).toBe('RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN');

    const symlog = structuredClone(contract('neuro.multisignal_trace').examples.valid[0]) as any;
    symlog.parameters.panels[1].scale = 'symlog';
    symlog.parameters.panels[1].symlogLinearThreshold = 10;
    const symlogResult = buildFigure(symlog);
    expect(symlogResult.ok).toBe(true);
    if (symlogResult.ok) {
      expect(symlogResult.plan.panels[1].axes.find((axis) => axis.orientation === 'left')?.transform).toBe('symlog');
    }
  });

  it('refuses a ninth overlaid series instead of wrapping the stable style tuple', () => {
    const analog = structuredClone(contract('neuro.analog_trace').examples.valid[0]) as any;
    const source = analog.data.series[0];
    analog.data.series = Array.from({ length: 9 }, (_value, index) => ({
      ...structuredClone(source),
      label: `Series ${index + 1}`,
    }));
    analog.data.seriesIds = Array.from({ length: 9 }, (_value, index) => `series_${index + 1}`);
    const analogResult = buildFigure(analog);
    expect(analogResult.ok).toBe(false);
    if (!analogResult.ok) expect(analogResult.errors[0].code).toBe('RENDER_SERIES_LIMIT_EXCEEDED');

    const multi = structuredClone(contract('neuro.multisignal_trace').examples.valid[2]) as any;
    const multiSource = multi.data.series[0];
    multi.data.series = Array.from({ length: 9 }, (_value, index) => ({
      ...structuredClone(multiSource),
      seriesId: `series_${index + 1}`,
      label: `Series ${index + 1}`,
    }));
    const multiResult = buildFigure(multi);
    expect(multiResult.ok).toBe(false);
    if (!multiResult.ok) expect(multiResult.errors[0].code).toBe('RENDER_SERIES_LIMIT_EXCEEDED');
  });

  it('discloses analog exclusions, refuses empty analog traces, and refuses multi-signal cropping', () => {
    const partial = structuredClone(contract('neuro.analog_trace').examples.valid[0]) as any;
    partial.data.window.stop = 0.35;
    const partialResult = buildFigure(partial);
    expect(partialResult.ok).toBe(true);
    if (partialResult.ok) {
      expect(partialResult.plan.table.rowsTotal).toBe(8);
      expect(partialResult.disclosures.map((disclosure) => disclosure.id)).toContain('EVENTS_EXCLUDED_OUT_OF_WINDOW');
      const operations = (partialResult.artifact.derivation as { operations: { receipt: Record<string, unknown> }[] }).operations;
      expect(operations.reduce((sum, operation) => sum + Number(operation.receipt.excludedOutOfWindow), 0)).toBe(2);
    }

    const empty = structuredClone(contract('neuro.analog_trace').examples.valid[0]) as any;
    empty.data.window = { start: 1, stop: 2, unit: 'ms', boundary: '[start,stop)' };
    const emptyResult = buildFigure(empty);
    expect(emptyResult.ok).toBe(false);
    if (!emptyResult.ok) expect(emptyResult.errors[0].code).toBe('RENDER_NO_DATA');

    const shifted = structuredClone(contract('neuro.multisignal_trace').examples.valid[1]) as any;
    shifted.data.series[1].timeOffset.value = 15;
    const shiftedResult = buildFigure(shifted);
    expect(shiftedResult.ok).toBe(false);
    if (!shiftedResult.ok) expect(shiftedResult.errors[0].code).toBe('SCIENCE_EVENT_OUT_OF_WINDOW');
  });

  it('holds piecewise values to a missing sample time and then breaks the path', () => {
    const request = structuredClone(contract('neuro.analog_trace').examples.valid[1]) as any;
    request.data.seriesIds = ['held'];
    request.data.series = [request.data.series[1]];
    request.data.series[0].time.values = [0, 3, 6];
    request.data.series[0].values.values = [0, null, 0];
    request.parameters.groupBy = 'series';
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const line = result.plan.panels[0].marks.find((mark) => mark.type === 'line');
    expect(line?.type).toBe('line');
    if (line?.type === 'line') expect(line.subpaths.map((subpath) => subpath.length)).toEqual([2]);
    const points = result.plan.panels[0].marks.find((mark) => mark.type === 'point');
    expect(points?.type).toBe('point');
    if (points?.type === 'point') expect(points.points).toHaveLength(1);
  });

  it('fails closed on late-series length mismatches and dimensionally mixed quantity-kind groups', () => {
    const fifth = structuredClone(contract('neuro.multisignal_trace').examples.valid[0]) as any;
    const copy = structuredClone(fifth.data.series[0]);
    copy.seriesId = 'fifth';
    copy.label = 'Fifth';
    copy.values.values = copy.values.values.slice(0, 4);
    fifth.data.series.push(copy);
    expect(validateRequestValue(fifth).ok).toBe(true);
    const fifthResult = buildFigure(fifth);
    expect(fifthResult.ok).toBe(false);
    if (!fifthResult.ok) expect(fifthResult.errors[0].code).toBe('SEMANTIC_LENGTH_MISMATCH');

    const state = structuredClone(contract('neuro.analog_trace').examples.valid[1]) as any;
    state.data.series[0].values.kind = 'state_variable';
    state.data.series[1].values.kind = 'state_variable';
    expect(validateRequestValue(state).ok).toBe(true);
    const stateResult = buildFigure(state);
    expect(stateResult.ok).toBe(false);
    if (!stateResult.ok) expect(stateResult.errors[0].code).toBe('SCIENCE_UNIT_DIMENSION_MISMATCH');
  });
});

describe('trace uncertainty and accessibility', () => {
  it('renders single-series analog standard deviation as capped whiskers', () => {
    const request = structuredClone(contract('neuro.analog_trace').examples.valid[0]) as any;
    request.data.seriesIds = [request.data.seriesIds[0]];
    request.data.series = [request.data.series[0]];
    request.parameters.uncertainty = {
      kind: 'standard_deviation',
      unit: 'mV',
      values: [1, 1, 1, null, 1],
      sampleCount: [8, 8, 8, null, 8],
      basis: 'trials',
    };
    expect(validateRequestValue(request).ok).toBe(true);
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.panels[0].marks.some((mark) => mark.type === 'group')).toBe(true);
    expect(result.plan.panels[0].marks.some((mark) => mark.type === 'area')).toBe(false);
    expect(result.plan.legend?.map((item) => item.label)).toContain(
      'Cell 1 membrane potential: +/-1 SD (n = 8, over trials)',
    );
    expect(result.disclosures.map((disclosure) => disclosure.id)).not.toContain('UNCERTAINTY_NOT_PROVIDED');
    expect(result.plan.accessibility.summary).toContain('Cell 1 membrane potential');
    expect(result.plan.accessibility.summary).toContain('Value ranges from');
    expect(result.plan.accessibility.summary).not.toContain('Replicates ranges');
  });

  it('breaks an interval band with the same paired-null mask as a missing centre', () => {
    const request = structuredClone(contract('neuro.analog_trace').examples.valid[0]) as any;
    request.data.seriesIds = [request.data.seriesIds[0]];
    request.data.series = [request.data.series[0]];
    request.parameters.uncertainty = {
      kind: 'confidence_interval',
      unit: 'mV',
      lower: [-71, -70.2, -69.1, null, -66.4],
      upper: [-69, -68.2, -67.1, null, -64.4],
      level: 0.95,
      method: 'bootstrap_percentile',
      coverage: 'pointwise',
      basis: 'bootstrap_draws',
    };
    expect(validateRequestValue(request).ok).toBe(true);
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const area = result.plan.panels[0].marks.find((mark) => mark.type === 'area');
    expect(area?.type).toBe('area');
    if (area?.type === 'area') expect(area.subpaths.map((subpath) => subpath.length)).toEqual([3, 1]);
    const missingRow = result.plan.table.rows.find((row) => row[column(result, 'missing')] === 'true');
    expect(missingRow?.[column(result, 'uncertaintyLower')]).toBeNull();
    expect(missingRow?.[column(result, 'uncertaintyUpper')]).toBeNull();
    expect(result.plan.legend?.map((item) => item.label)).toContain(
      'Cell 1 membrane potential: 95% pointwise bootstrap_percentile confidence interval (over bootstrap_draws, n = not supplied)',
    );
  });

  it('renders per-series uncertainty and discloses partial coverage', () => {
    const request = structuredClone(contract('neuro.multisignal_trace').examples.valid[2]) as any;
    request.data.series[0].uncertainty = {
      kind: 'standard_error',
      unit: 'umol/L',
      values: [0.01, 0.02, 0.03, 0.02],
      sampleCount: [6, 6, 6, 6],
      basis: 'trials',
    };
    expect(validateRequestValue(request).ok).toBe(true);
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.panels[0].marks.some((mark) => mark.type === 'group')).toBe(true);
    expect(result.disclosures.map((disclosure) => disclosure.id)).toContain('UNCERTAINTY_COVERAGE_INCOMPLETE');
  });

  it('rejects uncertainty attached to a missing central observation', () => {
    const request = structuredClone(contract('neuro.analog_trace').examples.valid[0]) as any;
    request.data.seriesIds = [request.data.seriesIds[0]];
    request.data.series = [request.data.series[0]];
    request.parameters.uncertainty = {
      kind: 'confidence_interval',
      unit: 'mV',
      lower: [-71, -70.2, -69.1, -68, -66.4],
      upper: [-69, -68.2, -67.1, -66, -64.4],
      level: 0.95,
      method: 'bootstrap_percentile',
      coverage: 'pointwise',
      basis: 'bootstrap_draws',
    };
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('SCIENCE_UNCERTAINTY_BOUNDS_INVALID');
  });

  it('refuses partially distorted interval widths and collapsed dispersion arrays', () => {
    const interval = structuredClone(contract('neuro.analog_trace').examples.valid[0]) as any;
    interval.data.seriesIds = [interval.data.seriesIds[0]];
    interval.data.series = [interval.data.series[0]];
    interval.parameters.valueUnit = 'V';
    interval.parameters.uncertainty = {
      kind: 'confidence_interval',
      unit: 'uV',
      lower: [0.9572480684608643, 1, 2, null, 4],
      upper: [0.9572480684608646, 1.1, 2.1, null, 4.1],
      level: 0.95,
      method: 'bootstrap_percentile',
      coverage: 'pointwise',
      basis: 'bootstrap_draws',
    };
    const intervalResult = buildFigure(interval);
    expect(intervalResult.ok).toBe(false);
    if (!intervalResult.ok) {
      expect(intervalResult.errors[0].code).toBe('SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE');
    }

    const dispersion = structuredClone(contract('neuro.analog_trace').examples.valid[0]) as any;
    dispersion.data.seriesIds = [dispersion.data.seriesIds[0]];
    dispersion.data.series = [dispersion.data.series[0]];
    dispersion.data.series[0].values.values = [0, 0, 0, null, 0];
    dispersion.parameters.valueUnit = 'V';
    dispersion.parameters.uncertainty = {
      kind: 'standard_deviation',
      unit: 'uV',
      values: [1e-292, 1.0000000000000002e-292, 2e-292, null, 4e-292],
      sampleCount: [8, 8, 8, null, 8],
      basis: 'trials',
    };
    const dispersionResult = buildFigure(dispersion);
    expect(dispersionResult.ok).toBe(false);
    if (!dispersionResult.ok) {
      expect(dispersionResult.errors[0].code).toBe('SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE');
    }
  });
});
