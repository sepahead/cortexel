import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { exactBinary64RatioToDifference } from '../src/core/exact-binary64.js';
import { buildFigure } from '../src/render/index.js';

type JsonRecord = Record<string, any>;

function requestFor(skillId: string, exampleIndex = 0): JsonRecord {
  const contract = JSON.parse(readFileSync(
    path.resolve(import.meta.dirname, `../contract/skills/${skillId}.v1.json`),
    'utf8',
  )) as JsonRecord;
  return structuredClone(contract.examples.valid[exampleIndex]);
}

function buildOrThrow(skillId: string, exampleIndex = 0, request?: JsonRecord): any {
  const result = buildFigure(request ?? requestFor(skillId, exampleIndex));
  expect(result.ok, `${skillId} example ${exampleIndex}`).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

function rowObjects(result: any): JsonRecord[] {
  return result.table.rows.map((row: readonly unknown[]) => Object.fromEntries(
    result.table.columns.map((column: { key: string }, index: number) => [column.key, row[index]]),
  ));
}

function group(result: any, id: string): any {
  const found = result.plan.panels.flatMap((panel: any) => panel.marks)
    .find((mark: any) => mark.type === 'group' && mark.id === id);
  expect(found, `missing render group ${id}`).toBeDefined();
  return found;
}

function lineLength(markGroup: any): number {
  const line = markGroup.marks.find((mark: any) => mark.type === 'line');
  expect(line).toBeDefined();
  const subpath = line.subpaths[0];
  const from = subpath[0];
  const to = subpath[subpath.length - 1];
  return Math.hypot(to.x - from.x, to.y - from.y);
}

describe('closed geometry preserves every declared evidence carrier', () => {
  it('phase plane renders all carriers together and keeps converted table and geometry coordinates identical', () => {
    const baseline = buildOrThrow('neuro.phase_plane');
    const ids = baseline.plan.panels[0].marks.map((mark: any) => mark.id);
    expect(ids).toEqual([
      'field-sample-0',
      'field-sample-1',
      'field-sample-2',
      'field-sample-3',
      'nullcline-v-nullcline',
      'trajectory-n1',
      'fixed-point-fp1',
    ]);
    expect(rowObjects(baseline).reduce((counts: JsonRecord, row: JsonRecord) => {
      counts[row.rowKind] = (counts[row.rowKind] ?? 0) + 1;
      return counts;
    }, {})).toEqual({
      trajectory_point: 4,
      field_sample: 4,
      nullcline_point: 3,
      fixed_point: 1,
    });

    const convertedRequest = requestFor('neuro.phase_plane');
    convertedRequest.data.trajectories.x.unit = 'V';
    convertedRequest.data.trajectories.x.values = convertedRequest.data.trajectories.x.values
      .map((value: number | null) => value === null ? null : value / 1000);
    const converted = buildOrThrow('neuro.phase_plane', 0, convertedRequest);
    expect(
      rowObjects(converted)
        .filter((row) => row.rowKind === 'trajectory_point')
        .map((row) => row.x),
    ).toEqual([-65, -60, -50, -40]);
    const trajectoryLine = group(converted, 'trajectory-n1').marks
      .find((mark: any) => mark.type === 'line').subpaths[0];
    const [xAxis, yAxis] = converted.plan.panels[0].axes;
    const mapFromTicks = (value: number, axis: any): number => {
      const first = axis.ticks[0];
      const last = axis.ticks[axis.ticks.length - 1];
      return first.position + (value - Number(first.label)) /
        (Number(last.label) - Number(first.label)) * (last.position - first.position);
    };
    rowObjects(converted)
      .filter((row) => row.rowKind === 'trajectory_point')
      .forEach((row, index) => {
        expect(trajectoryLine[index].x).toBeCloseTo(mapFromTicks(row.x, xAxis), 12);
        expect(trajectoryLine[index].y).toBeCloseTo(mapFromTicks(row.y, yAxis), 12);
      });
    expect(converted.artifact.derivation.operations[0].receipt.conversions)
      .toContain('trajectory x: V -> mV (factor 1000)');
  });

  it('phase direction markers survive gaps, convergence is re-derived, and physical magnitude is canonical SI', () => {
    const backward = buildOrThrow('neuro.phase_plane', 2);
    const trajectory = group(backward, 'trajectory-m1');
    const line = trajectory.marks.find((mark: any) => mark.type === 'line');
    const arrows = trajectory.marks.find((mark: any) => mark.type === 'arrow');
    expect(line.subpaths).toHaveLength(2);
    expect(arrows.arrows).toHaveLength(2);
    // Backward-integrated samples are stored in decreasing time, so increasing
    // model time points from the later array element back to the earlier one.
    expect(arrows.arrows[0].from).toEqual({
      x: line.subpaths[0][1].x,
      y: line.subpaths[0][1].y,
    });
    expect(arrows.arrows[0].to).toEqual({
      x: line.subpaths[0][0].x,
      y: line.subpaths[0][0].y,
    });
    expect(arrows.arrows[0].authority).toEqual({ tag: 'connector' });

    const contradiction = requestFor('neuro.phase_plane');
    contradiction.data.fixedPoints.converged[0] = false;
    const refused = buildFigure(contradiction);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/fixedPoints/converged/0',
      }));
    }

    const physical = buildOrThrow('neuro.phase_plane', 1);
    const fieldRows = rowObjects(physical);
    expect(fieldRows[0].speed).toBeCloseTo(Math.hypot(1.5, 0.5), 14);
    expect(JSON.parse(fieldRows[0].derivativeUnit)).toMatchObject({
      magnitudeBasis: 'physical',
      magnitudeUnit: 'V /s',
    });
    const speeds = fieldRows.map((row) => row.speed as number);
    const lengths = speeds.map((_speed, index) => lineLength(group(physical, `field-sample-${index}`)));
    const maximumSpeed = Math.max(...speeds);
    const maximumLength = Math.max(...lengths);
    lengths.forEach((length, index) => {
      expect(length / maximumLength).toBeCloseTo(speeds[index] / maximumSpeed, 12);
    });
    expect(physical.plan.legend[0].label).toContain('physical magnitude reference');
    expect(physical.plan.legend[0].label).toContain('V /s');
  });

  it('keeps axis-normalized phase vectors nonzero across opposite finite extremes', () => {
    const request = requestFor('neuro.phase_plane');
    for (const axis of ['x', 'y']) {
      request.data.vectorField.domain[axis].start = -Number.MAX_VALUE;
      request.data.vectorField.domain[axis].stop = Number.MAX_VALUE;
    }
    request.data.vectorField.dx.values.fill(Number.MAX_VALUE);
    request.data.vectorField.dy.values.fill(Number.MAX_VALUE);

    const result = buildOrThrow('neuro.phase_plane', 0, request);
    const component = exactBinary64RatioToDifference(
      Number.MAX_VALUE,
      -Number.MAX_VALUE,
      Number.MAX_VALUE,
    );
    const expectedSpeed = Math.hypot(component, component);
    const fieldRows = rowObjects(result).filter((row) => row.rowKind === 'field_sample');
    expect(fieldRows.map((row) => row.speed)).toEqual(Array(4).fill(expectedSpeed));
    expect(expectedSpeed).toBeGreaterThan(0);
    expect(result.artifact.derivation.operations[0]).toMatchObject({
      algorithm: 'cortexel.phase_plane.canonicalize_carriers',
      algorithmRevision: 2,
      parameters: {
        axisNormalizedBinary64Arithmetic:
          'exact_component_over_exact_extent_difference_then_one_final_round',
      },
    });
    for (let index = 0; index < 4; index++) {
      const vector = group(result, `field-sample-${index}`);
      expect(vector.marks.some((mark: any) => mark.type === 'line')).toBe(true);
      expect(lineLength(vector)).toBeGreaterThan(0);
    }
    expect(result.plan.legend[0].label).toContain('axis_normalized magnitude reference');
    expect(result.plan.legend[0].label).not.toContain('magnitude reference 0 ');

    const unrepresentable = requestFor('neuro.phase_plane');
    for (const carrier of ['trajectories', 'nullclines', 'fixedPoints']) {
      unrepresentable.data[carrier].x.values.fill(0);
      unrepresentable.data[carrier].y.values.fill(0);
    }
    unrepresentable.data.vectorField.x.values = [0, Number.MIN_VALUE, 0, Number.MIN_VALUE];
    unrepresentable.data.vectorField.y.values = [0, 0, Number.MIN_VALUE, Number.MIN_VALUE];
    for (const axis of ['x', 'y']) {
      unrepresentable.data.vectorField.domain[axis].start = 0;
      unrepresentable.data.vectorField.domain[axis].stop = Number.MIN_VALUE;
    }
    const refused = buildFigure(unrepresentable);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.errors[0]).toMatchObject({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        stage: 'science',
      });
    }
  });

  it('spatial map preserves minimum-image chords, reciprocal directions, autapses, rows, and local fallback ids', () => {
    const result = buildOrThrow('network.spatial_map_2d');
    const reciprocal = group(result, 'connection-pair-e1');
    expect(reciprocal.marks.find((mark: any) => mark.type === 'line').subpaths).toHaveLength(2);
    expect(reciprocal.marks.find((mark: any) => mark.type === 'arrow').arrows).toHaveLength(2);
    expect(reciprocal.marks.filter((mark: any) => mark.type === 'text').map((mark: any) => mark.text))
      .toEqual(['1 -> 2: x 2', '2 -> 1: x 1']);
    const autapse = group(result, 'connection-pair-e4');
    expect(autapse.marks.some((mark: any) => mark.type === 'line')).toBe(true);
    expect(autapse.marks.some((mark: any) => mark.type === 'arrow')).toBe(true);
    expect(result.artifact.render.markCount).toBe(12);
    expect(rowObjects(result).filter((row) => row.rowKind === 'connection')).toHaveLength(4);

    const noIdsRequest = requestFor('network.spatial_map_2d');
    delete noIdsRequest.data.connections.edgeIds;
    const noIds = buildOrThrow('network.spatial_map_2d', 0, noIdsRequest);
    expect(rowObjects(noIds).filter((row) => row.rowKind === 'connection').map((row) => row.id))
      .toEqual(['connection-row-0', 'connection-row-1', 'connection-row-2', 'connection-row-3']);
    expect(noIds.svg).toContain('data-id="connection-pair-connection-row-0"');
  });

  it('spatial map uses the finest coordinate unit, honors symlog, and refuses a directionless measured chord', () => {
    const unitRequest = requestFor('network.spatial_map_2d', 1);
    unitRequest.data.positions.x.unit = 'um';
    unitRequest.data.positions.x.values = unitRequest.data.positions.x.values
      .map((value: number) => value * 1000);
    const canonical = buildOrThrow('network.spatial_map_2d', 1, unitRequest);
    expect(rowObjects(canonical).filter((row) => row.rowKind === 'node').map((row) => row.positionUnit))
      .toEqual(['um', 'um', 'um']);
    expect(canonical.artifact.derivation.operations.map((operation: any) => operation.id))
      .toContain('spatial.coordinates.canonicalize_axes');

    const linearRequest = requestFor('network.spatial_map_2d', 1);
    linearRequest.data.positions.value.values = [1, 10, 100];
    const linear = buildOrThrow('network.spatial_map_2d', 1, linearRequest);
    const symlogRequest = structuredClone(linearRequest);
    symlogRequest.parameters.nodeEncoding.colorScale = {
      kind: 'sequential', transform: 'symlog', linearThreshold: 1,
    };
    const symlog = buildOrThrow('network.spatial_map_2d', 1, symlogRequest);
    const fill = (built: any, id: string) => group(built, id).marks[0].fill;
    expect(fill(symlog, 'node-102')).not.toBe(fill(linear, 'node-102'));
    expect(symlog.plan.legend.some((entry: any) => entry.label.includes('linear threshold 1'))).toBe(true);

    const widthOnly = buildOrThrow('network.spatial_map_2d', 3);
    const widthOnlyLines = ['e1', 'e2'].map((id) => group(widthOnly, `connection-pair-${id}`).marks
      .find((mark: any) => mark.type === 'line'));
    expect(widthOnlyLines[0].stroke).toBe(widthOnlyLines[1].stroke);
    expect(widthOnlyLines[0].strokeWidth).not.toBe(widthOnlyLines[1].strokeWidth);

    const coincidentRequest = requestFor('network.spatial_map_2d');
    coincidentRequest.data.positions.x.values[1] = coincidentRequest.data.positions.x.values[0];
    coincidentRequest.data.positions.y.values[1] = coincidentRequest.data.positions.y.values[0];
    const coincident = buildFigure(coincidentRequest);
    expect(coincident.ok).toBe(false);
    if (!coincident.ok) expect(coincident.errors[0]).toMatchObject({ code: 'RENDER_DEGENERATE_DOMAIN' });
  });

  it('connection graph preserves every directed lane, exact area encoding, centered widths, and reciprocal bundles', () => {
    const result = buildOrThrow('network.connection_graph');
    for (const edgeId of ['e1', 'e2', 'e3', 'e4', 'e5']) {
      const edge = group(result, `edge-${edgeId}`);
      expect(edge.marks.some((mark: any) => mark.type === 'line')).toBe(true);
      expect(edge.marks.some((mark: any) => mark.type === 'arrow')).toBe(true);
    }
    expect(result.artifact.render.markCount).toBe(18);
    const nodeRadius = (id: string) => group(result, `node-${id}`).marks
      .find((mark: any) => mark.type === 'point').radius as number;
    expect((nodeRadius('2') ** 2 - 3 ** 2) / (nodeRadius('1') ** 2 - 3 ** 2)).toBeCloseTo(3 / 5, 14);
    expect((nodeRadius('3') ** 2 - 3 ** 2) / (nodeRadius('1') ** 2 - 3 ** 2)).toBeCloseTo(2 / 5, 14);
    expect(nodeRadius('4')).toBe(3);

    const centeredRequest = requestFor('network.connection_graph');
    centeredRequest.parameters.edgeValueEncoding.center = 5;
    centeredRequest.data.connections.weights.values = [-5, -5, 7, 5, 5];
    const centered = buildOrThrow('network.connection_graph', 0, centeredRequest);
    const edgeLine = (id: string) => group(centered, `edge-${id}`).marks
      .find((mark: any) => mark.type === 'line');
    expect(edgeLine('e1').strokeWidth).toBeGreaterThan(edgeLine('e3').strokeWidth);
    expect(edgeLine('e1').dash).toBe('4 3');
    expect(edgeLine('e3').dash).toBeUndefined();

    const widthOnlyRequest = requestFor('network.connection_graph');
    widthOnlyRequest.parameters.edgeValueEncoding = {
      mode: 'weight', channel: 'width', scale: 'linear',
    };
    const widthOnly = buildOrThrow('network.connection_graph', 0, widthOnlyRequest);
    const widthOnlyColors = ['e1', 'e3', 'e4'].map((id) => group(widthOnly, `edge-${id}`).marks
      .find((mark: any) => mark.type === 'line').stroke);
    expect(new Set(widthOnlyColors).size).toBe(1);

    const bundledRequest = requestFor('network.connection_graph', 2);
    bundledRequest.data.connections.sourceIds = ['1', '1', '2'];
    bundledRequest.data.connections.targetIds = ['2', '2', '1'];
    const bundled = buildOrThrow('network.connection_graph', 2, bundledRequest);
    const edgeGroups = bundled.plan.panels[0].marks.filter((mark: any) => mark.id?.startsWith('edge-'));
    expect(edgeGroups).toHaveLength(2);
    expect(edgeGroups.flatMap((edge: any) => edge.marks).filter((mark: any) => mark.type === 'arrow'))
      .toHaveLength(2);
    expect(bundled.artifact.render.markCount).toBe(8);
  });

  it('connection graph canonicalizes measured axes and refuses ambiguous group or endpoint geometry', () => {
    const unitRequest = requestFor('network.connection_graph', 1);
    unitRequest.data.positions.x.unit = 'mm';
    unitRequest.data.positions.x.values = unitRequest.data.positions.x.values
      .map((value: number) => value / 1000);
    const canonical = buildOrThrow('network.connection_graph', 1, unitRequest);
    expect(rowObjects(canonical).filter((row) => row.rowKind === 'node').map((row) => row.positionUnit))
      .toEqual(['um', 'um', 'um']);
    expect(canonical.artifact.derivation.operations.map((operation: any) => operation.id))
      .toContain('connection_graph.coordinates.canonicalize_axes');

    const overlapRequest = requestFor('network.connection_graph');
    overlapRequest.data.nodeUniverse.groups[1].memberIds.push('1');
    const overlap = buildFigure(overlapRequest);
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) expect(overlap.errors[0]).toMatchObject({ code: 'SEMANTIC_DUPLICATE_ID' });

    const coincidentRequest = requestFor('network.connection_graph', 1);
    coincidentRequest.data.positions.x.values[2] = coincidentRequest.data.positions.x.values[0];
    coincidentRequest.data.positions.y.values[2] = coincidentRequest.data.positions.y.values[0];
    const coincident = buildFigure(coincidentRequest);
    expect(coincident.ok).toBe(false);
    if (!coincident.ok) expect(coincident.errors[0]).toMatchObject({ code: 'RENDER_DEGENERATE_DOMAIN' });
  });

  it('compartment layouts retain every source series, unrecorded row, gap, and explicit aggregate receipt', () => {
    const multiples = buildOrThrow('neuro.compartment_trace');
    expect(multiples.plan.panels.map((panel: any) => panel.id)).toEqual(['soma', 'dend_1', 'dend_1_1']);
    expect(rowObjects(multiples).filter((row) => row.recorded === 'yes')).toHaveLength(12);

    const overlay = buildOrThrow('neuro.compartment_trace', 1);
    expect(overlay.plan.panels[0].marks.map((mark: any) => mark.id)).toEqual([
      'series-compartment-source-0',
      'series-compartment-source-1',
      'series-aggregate-soma-dend_1',
    ]);
    const aggregateOperation = overlay.artifact.derivation.operations
      .find((operation: any) => operation.id === 'compartment.aggregate.explicit_selection');
    expect(aggregateOperation.receipt.output).toEqual({
      time: { unit: 'ms', values: [0, 0.5, 1] },
      value: { unit: 'nS', values: [0, null, 0.20434782608695654] },
    });
    const aggregateMarks = group(overlay, 'series-aggregate-soma-dend_1').marks;
    expect(aggregateMarks.some((mark: any) => mark.type === 'line')).toBe(false);
    expect(aggregateMarks.find((mark: any) => mark.type === 'point').points).toHaveLength(2);

    const heatmap = buildOrThrow('neuro.compartment_trace', 2);
    expect(heatmap.plan.panels[0].marks.map((mark: any) => mark.id))
      .toEqual(['compartment-soma', 'compartment-dend_1', 'compartment-dend_1_1']);
    expect(rowObjects(heatmap).filter((row) => row.recorded === 'no')).toHaveLength(1);
    expect(heatmap.plan.legend[0].label).toContain('global sequential colour domain');
  });

  it('derives declared compartment means exactly for subnormal and extreme weight scales', () => {
    const aggregateValue = (weights: readonly number[], reverse = false): number => {
      const request = requestFor('neuro.compartment_trace', 1);
      request.data.series[0].time.values = [0];
      request.data.series[0].values.values = [0.5];
      request.data.series[1].time.values = [0];
      request.data.series[1].values.values = [1];
      const ids = ['soma', 'dend_1'];
      request.parameters.compartmentAggregate.compartmentIds = reverse ? [...ids].reverse() : ids;
      request.parameters.compartmentAggregate.weights = reverse ? [...weights].reverse() : [...weights];
      const result = buildOrThrow('neuro.compartment_trace', 1, request);
      const operation = result.artifact.derivation.operations.find(
        (candidate: any) => candidate.id === 'compartment.aggregate.explicit_selection',
      );
      expect(operation).toMatchObject({
        algorithm: 'cortexel.compartment_trace.aggregate_explicit_selection',
        algorithmRevision: 4,
        parameters: {
          binary64Arithmetic: 'exact_products_and_cancellation_then_one_final_round',
        },
      });
      return operation.receipt.output.value.values[0];
    };

    for (const weights of [
      [Number.MIN_VALUE, Number.MIN_VALUE],
      [Number.MAX_VALUE, Number.MAX_VALUE],
    ]) {
      expect(aggregateValue(weights)).toBe(0.75);
      expect(aggregateValue(weights, true)).toBe(0.75);
    }

    const unrepresentable = requestFor('neuro.compartment_trace', 1);
    for (const series of unrepresentable.data.series) {
      series.time.values = [0];
      series.values.values = [Number.MIN_VALUE];
    }
    unrepresentable.parameters.compartmentAggregate.method = 'sum';
    unrepresentable.parameters.compartmentAggregate.weights = [
      Number.MIN_VALUE,
      Number.MIN_VALUE,
    ];
    const refused = buildFigure(unrepresentable);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.errors[0]).toMatchObject({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        stage: 'science',
        instancePath: '/parameters/compartmentAggregate',
      });
    }
  });

  it('synaptic weight traces preserve step semantics, membership aggregates, uncertainty, references, and refuse reordered declared lineage', () => {
    const individual = buildOrThrow('network.synaptic_weight_trace');
    for (const id of ['series-syn_12_45_0', 'series-syn_12_46_0']) group(individual, id);
    for (const id of [
      'reference-syn_12_45_0-initial',
      'reference-syn_12_45_0-upper',
      'reference-syn_12_46_0-initial',
      'reference-syn_12_46_0-upper',
    ]) group(individual, id);
    const firstRun = group(individual, 'series-syn_12_45_0').marks
      .find((mark: any) => mark.type === 'line').subpaths[0];
    expect(firstRun[0].x).toBe(individual.plan.panels[0].x);
    expect(firstRun[firstRun.length - 1].x).toBeLessThan(individual.plan.panels[0].x + individual.plan.panels[0].width);

    const aggregate = buildOrThrow('network.synaptic_weight_trace', 1);
    for (const id of ['series-e1', 'series-e2', 'series-e3', 'series-exc_plastic']) group(aggregate, id);
    expect(group(aggregate, 'series-exc_plastic').marks.some((mark: any) => mark.id === 'uncertainty-0'))
      .toBe(true);
    const aggregateRows = rowObjects(aggregate).filter((row) => row.seriesId === 'exc_plastic');
    expect(aggregateRows.map((row) => [row.time, row.memberCount, row.contributingCount]))
      .toEqual([[0, 2, 2], [400, 2, 2], [500, 3, 3], [800, 3, 3]]);

    const reorderedRequest = requestFor('network.synaptic_weight_trace', 2);
    const permutation = [2, 0, 3, 1];
    for (const pathParts of [
      ['time', 'values'],
      ['values', 'values'],
      ['memberCounts'],
      ['contributingCounts'],
    ]) {
      let owner = reorderedRequest.data.aggregate;
      for (const part of pathParts.slice(0, -1)) owner = owner[part];
      const key = pathParts[pathParts.length - 1];
      owner[key] = permutation.map((index) => owner[key][index]);
    }
    const reordered = buildFigure(reorderedRequest);
    expect(reordered.ok).toBe(false);
    if (!reordered.ok) {
      expect(reordered.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        instancePath: '/data/aggregate/time/values/1',
      }));
    }
  });
});
