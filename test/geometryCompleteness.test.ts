import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { exactBinary64RatioToDifference } from '../src/core/exact-binary64.js';
import {
  compositeDerivativeConversionReceipt,
  convertCompositeDerivative,
  normalizeDerivativeByExactAxisExtent,
} from '../src/core/units.js';
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
    expect(converted.artifact.derivation.operations[0].receipt.coordinateTransforms)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          carrier: 'trajectory x',
          conversion: expect.objectContaining({
            from: 'V',
            to: 'mV',
            factor: 1000,
            algorithm: 'exact_rational_round_to_binary64',
          }),
        }),
      ]));
  });

  it('phase direction markers survive gaps, convergence is re-derived, and physical magnitude is canonical SI', () => {
    const backwardRequest = requestFor('neuro.phase_plane', 2);
    backwardRequest.parameters.directionMarkers = { mode: 'arrowhead_at_end' };
    const backward = buildOrThrow('neuro.phase_plane', 2, backwardRequest);
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
    expect(backward.plan.accessibility.summary).toContain(
      'terminal candidate segment of each continuous finite, strictly timed run',
    );

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
    expect(physical.plan.legend[0].label).toContain('textual physical magnitude key');
    expect(physical.plan.legend[0].label).toContain('V /s');

    const unitLength = buildOrThrow('neuro.phase_plane', 3);
    expect(unitLength.plan.legend[0].label).toContain(
      'unit_length (direction only; magnitude does not affect arrow length)',
    );
    expect(unitLength.plan.legend[0].label).toContain(
      'axis_normalized magnitudes remain in the table',
    );
  });

  it('groups interleaved trajectory time per identity under one global direction', () => {
    const interleaved = requestFor('neuro.phase_plane', 2);
    interleaved.data.trajectories.universe = {
      ids: ['a', 'b'],
      labels: ['Trajectory A', 'Trajectory B'],
    };
    interleaved.data.trajectories.timeDirection = 'forward';
    interleaved.data.trajectories.pointTrajectoryIds = ['a', 'b', 'b', 'a'];
    interleaved.data.trajectories.times.values = [5, 100, 101, 6];
    interleaved.data.trajectories.x.values = [-65, -60, -59, -64];
    interleaved.data.trajectories.y.values = [0.1, 0.2, 0.21, 0.11];
    interleaved.data.trajectories.dxdt.values = [1, 2, 3, 4];
    interleaved.data.trajectories.dydt.values = [0.01, 0.02, 0.03, 0.04];
    interleaved.parameters.directionMarkers = { mode: 'arrowhead_at_end' };
    interleaved.parameters.duplicateTimePolicy = 'reject';

    const result = buildOrThrow('neuro.phase_plane', 2, interleaved);
    const timeAuthority =
      result.artifact.derivation.operations[0].receipt.trajectoryTimeAuthority;
    expect(timeAuthority).toMatchObject({
      timeDirection: 'forward',
      globalMinimumTime: 5,
      globalMaximumTime: 101,
      equalTimeBreakCount: 0,
      trajectories: [
        {
          trajectoryId: 'a',
          appliedGlobalTimeDirection: 'forward',
          firstTime: 5,
          lastTime: 6,
          minimumTime: 5,
          maximumTime: 6,
        },
        {
          trajectoryId: 'b',
          appliedGlobalTimeDirection: 'forward',
          firstTime: 100,
          lastTime: 101,
          minimumTime: 100,
          maximumTime: 101,
        },
      ],
    });
    expect(result.plan.accessibility.summary).toContain(
      'global time span 5 to 101 ms. The one declared global timeDirection applies to every trajectory',
    );
    for (const id of ['a', 'b']) {
      const trajectory = group(result, `trajectory-${id}`);
      const line = trajectory.marks.find((mark: JsonRecord) => mark.type === 'line');
      const arrows = trajectory.marks.find((mark: JsonRecord) => mark.type === 'arrow');
      expect(line.subpaths).toHaveLength(1);
      expect(line.subpaths[0]).toHaveLength(2);
      expect(arrows.arrows).toHaveLength(1);
      expect(arrows.arrows[0].from).toEqual({
        x: line.subpaths[0][0].x,
        y: line.subpaths[0][0].y,
      });
      expect(arrows.arrows[0].to).toEqual({
        x: line.subpaths[0][1].x,
        y: line.subpaths[0][1].y,
      });
    }

    const sameTimesAcrossIdentities = structuredClone(interleaved);
    sameTimesAcrossIdentities.data.trajectories.times.values = [5, 5, 6, 6];
    buildOrThrow('neuro.phase_plane', 2, sameTimesAcrossIdentities);

    const contrary = structuredClone(interleaved);
    contrary.data.trajectories.times.values[3] = 4;
    const contraryResult = buildFigure(contrary);
    expect(contraryResult.ok).toBe(false);
    if (!contraryResult.ok) {
      expect(contraryResult.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NEGATIVE_INTERVAL',
        instancePath: '/data/trajectories/times/values/3',
      }));
      expect(contraryResult.errors[0].message).toContain(
        'one declared global timeDirection=forward',
      );
      expect(contraryResult.errors[0].message).toContain(
        'Mixed forward/backward trajectories require separate FigureRequests.',
      );
    }
  });

  it('checks every time row and makes equal-time replicates hard path breaks', () => {
    const missingReversal = requestFor('neuro.phase_plane', 2);
    missingReversal.data.trajectories.timeDirection = 'forward';
    missingReversal.data.trajectories.times.values = [0, 2, 1, 3, 4];
    const missingReversalResult = buildFigure(missingReversal);
    expect(missingReversalResult.ok).toBe(false);
    if (!missingReversalResult.ok) {
      expect(missingReversalResult.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NEGATIVE_INTERVAL',
        instancePath: '/data/trajectories/times/values/2',
      }));
    }

    const duplicateRejected = requestFor('neuro.phase_plane', 2);
    duplicateRejected.data.trajectories.timeDirection = 'forward';
    duplicateRejected.data.trajectories.times.values = [0, 1, 1, 2, 3];
    const duplicateRejectedResult = buildFigure(duplicateRejected);
    expect(duplicateRejectedResult.ok).toBe(false);
    if (!duplicateRejectedResult.ok) {
      expect(duplicateRejectedResult.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_DUPLICATE_TIME_POLICY',
        instancePath: '/data/trajectories/times/values/2',
      }));
    }

    const keepReplicates = requestFor('neuro.phase_plane', 2);
    keepReplicates.data.trajectories.timeDirection = 'forward';
    keepReplicates.data.trajectories.times.values = [0, 1, 1, 2];
    keepReplicates.data.trajectories.pointTrajectoryIds =
      ['m1', 'm1', 'm1', 'm1'];
    keepReplicates.data.trajectories.x.values = [-65, -64, -60, -59];
    keepReplicates.data.trajectories.y.values = [0.08, 0.09, 0.2, 0.21];
    keepReplicates.data.trajectories.dxdt.values = [1, 1, 2, 2];
    keepReplicates.data.trajectories.dydt.values = [0.01, 0.01, 0.02, 0.02];
    keepReplicates.parameters.duplicateTimePolicy = 'keep_replicates';
    keepReplicates.parameters.directionMarkers = {
      mode: 'arrowheads_every_n_points',
      everyNPoints: 2,
    };
    const kept = buildOrThrow('neuro.phase_plane', 2, keepReplicates);
    expect(rowObjects(kept).filter((row) => row.rowKind === 'trajectory_point'))
      .toHaveLength(4);
    const trajectory = group(kept, 'trajectory-m1');
    const line = trajectory.marks.find((mark: JsonRecord) => mark.type === 'line');
    const arrows = trajectory.marks.find((mark: JsonRecord) => mark.type === 'arrow');
    expect(line.subpaths).toHaveLength(2);
    expect(line.subpaths.map((subpath: JsonRecord[]) => subpath.length)).toEqual([2, 2]);
    expect(arrows.arrows).toHaveLength(2);
    expect(arrows.arrows[0].from).toEqual({
      x: line.subpaths[0][0].x,
      y: line.subpaths[0][0].y,
    });
    expect(arrows.arrows[0].to).toEqual({
      x: line.subpaths[0][1].x,
      y: line.subpaths[0][1].y,
    });
    expect(arrows.arrows[1].from).toEqual({
      x: line.subpaths[1][0].x,
      y: line.subpaths[1][0].y,
    });
    expect(arrows.arrows[1].to).toEqual({
      x: line.subpaths[1][1].x,
      y: line.subpaths[1][1].y,
    });
    expect(
      kept.artifact.derivation.operations[0].receipt.trajectoryTimeAuthority,
    ).toMatchObject({
      equalTimeBreakCount: 1,
      trajectories: [{ equalTimeBreakCount: 1 }],
    });
    expect(kept.plan.accessibility.summary).toContain(
      '1 equal-time boundary is retained in the table and breaks path geometry.',
    );

    const terminalEqual = structuredClone(keepReplicates);
    terminalEqual.data.trajectories.times.values = [0, 1, 1];
    terminalEqual.data.trajectories.pointTrajectoryIds = ['m1', 'm1', 'm1'];
    for (const carrier of ['x', 'y', 'dxdt', 'dydt']) {
      terminalEqual.data.trajectories[carrier].values =
        terminalEqual.data.trajectories[carrier].values.slice(0, 3);
    }
    terminalEqual.parameters.directionMarkers = { mode: 'arrowhead_at_end' };
    const terminal = buildOrThrow('neuro.phase_plane', 2, terminalEqual);
    const terminalTrajectory = group(terminal, 'trajectory-m1');
    expect(
      terminalTrajectory.marks.find((mark: JsonRecord) => mark.type === 'arrow')
        .arrows,
    ).toHaveLength(1);
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
      algorithmRevision: 3,
      parameters: {
        derivativeBinary64Arithmetic:
          'exact_state_and_reciprocal_time_factors_then_one_final_round; ' +
          'axis_normalized_exact_reciprocal_time_factor_over_exact_extent_then_one_final_round',
      },
    });
    for (let index = 0; index < 4; index++) {
      const vector = group(result, `field-sample-${index}`);
      expect(vector.marks.some((mark: any) => mark.type === 'line')).toBe(true);
      expect(lineLength(vector)).toBeGreaterThan(0);
    }
    expect(result.plan.legend[0].label).toContain('textual axis_normalized magnitude key');
    expect(result.plan.legend[0].label).not.toContain('magnitude key: 0 ');

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

  it('composes phase derivative factors and exact extent division before one final rounding', () => {
    expect(9 * 0.001 * 1000).not.toBe(9);
    expect(convertCompositeDerivative(9, 'mV', 'V', '/ms', '/s')).toBe(9);
    expect(Number.MIN_VALUE * 0.001 * 1000).toBe(0);
    expect(convertCompositeDerivative(
      Number.MIN_VALUE,
      'mV',
      'V',
      '/ms',
      '/s',
    )).toBe(Number.MIN_VALUE);
    expect(12 * 0.001 / 5).not.toBe(0.0024);
    expect(normalizeDerivativeByExactAxisExtent(12, '/s', '/ms', 0, 5)).toBe(0.0024);
    expect(normalizeDerivativeByExactAxisExtent(
      Number.MIN_VALUE,
      '/s',
      '/ms',
      0,
      0.001,
    )).toBe(Number.MIN_VALUE);
    expect(compositeDerivativeConversionReceipt('mV', 'V', '/ms', '/s'))
      .toMatchObject({
        factor: 1,
        algorithm: 'exact_composite_derivative_round_to_binary64',
      });

    const physicalRequest = requestFor('neuro.phase_plane', 1);
    physicalRequest.data.vectorField.dx.values[0] = 9;
    physicalRequest.data.vectorField.dy.values[0] = 0;
    const physical = buildOrThrow('neuro.phase_plane', 1, physicalRequest);
    expect(rowObjects(physical)[0].speed).toBe(9);
    expect(physical.artifact.derivation.operations[0]).toMatchObject({
      algorithm: 'cortexel.phase_plane.canonicalize_carriers',
      algorithmRevision: 3,
      parameters: {
        derivativeBinary64Arithmetic:
          'exact_state_and_reciprocal_time_factors_then_one_final_round; ' +
          'axis_normalized_exact_reciprocal_time_factor_over_exact_extent_then_one_final_round',
      },
      receipt: {
        derivativeTransforms: expect.arrayContaining([
          expect.objectContaining({
            carrier: 'vector-field',
            component: 'x',
            basis: 'physical',
            uses: ['magnitude', 'table_speed'],
            sourceCompositeUnit: 'mV /ms',
            targetCompositeUnit: 'V /s',
            conversion: expect.objectContaining({
              factor: 1,
              algorithm: 'exact_composite_derivative_round_to_binary64',
            }),
          }),
        ]),
      },
    });
    const physicalConversionDisclosure = physical.disclosures.find(
      (entry: JsonRecord) => entry.id === 'UNIT_CONVERTED',
    )?.text;
    expect(physicalConversionDisclosure).toContain(
      'phase-plane exact unit transforms: 0 coordinate, 2 physical derivative, ' +
      '0 axis-normalized derivative',
    );
    expect(physicalConversionDisclosure?.length).toBeLessThanOrEqual(400);

    const mixedPhysicalRequest = requestFor('neuro.phase_plane', 1);
    mixedPhysicalRequest.data.vectorField.dy.unit = '/s';
    const mixedPhysical = buildOrThrow('neuro.phase_plane', 1, mixedPhysicalRequest);
    expect(mixedPhysical.artifact.derivation.operations[0].receipt.derivativeTransforms)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          carrier: 'vector-field',
          component: 'y',
          basis: 'axis_normalized',
          uses: ['display_direction'],
          sourceDerivativeUnit: '/s',
          targetDerivativeUnit: '/ms',
        }),
        expect.objectContaining({
          carrier: 'vector-field',
          component: 'y',
          basis: 'physical',
          uses: ['magnitude', 'table_speed'],
          sourceCompositeUnit: 'mV /s',
          targetCompositeUnit: 'V /s',
        }),
      ]));
    const mixedConversionDisclosure = mixedPhysical.disclosures.find(
      (entry: JsonRecord) => entry.id === 'UNIT_CONVERTED',
    )?.text;
    expect(mixedConversionDisclosure).toContain(
      'phase-plane exact unit transforms: 0 coordinate, 2 physical derivative, ' +
      '1 axis-normalized derivative',
    );
    expect(mixedConversionDisclosure?.length).toBeLessThanOrEqual(400);
    expect(mixedPhysical.artifact.derivation.operations[0].receipt.conversionCounts)
      .toEqual({
        coordinate: 0,
        physicalDerivative: 2,
        axisNormalizedDerivative: 1,
      });

    const normalizedRequest = requestFor('neuro.phase_plane', 1);
    normalizedRequest.parameters.magnitudeBasis = 'axis_normalized';
    normalizedRequest.data.vectorField.x.values = [0, 1, 0, 1];
    normalizedRequest.data.vectorField.y.values = [0, 0, 5, 5];
    normalizedRequest.data.vectorField.domain.x = { start: 0, stop: 1, unit: 'mV' };
    normalizedRequest.data.vectorField.domain.y = { start: 0, stop: 5, unit: 'mV' };
    normalizedRequest.data.vectorField.dx.values.fill(0);
    normalizedRequest.data.vectorField.dy.unit = '/s';
    normalizedRequest.data.vectorField.dy.values.fill(12);
    const normalized = buildOrThrow('neuro.phase_plane', 1, normalizedRequest);
    expect(rowObjects(normalized)[0].speed).toBe(0.0024);
    expect(normalized.artifact.derivation.operations[0].receipt.derivativeTransforms)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          carrier: 'vector-field',
          component: 'y',
          basis: 'axis_normalized',
          sourceDerivativeUnit: '/s',
          targetDerivativeUnit: '/ms',
          conversion: expect.objectContaining({
            algorithm:
              'exact_derivative_unit_factor_over_exact_binary64_extent_round_to_binary64',
          }),
        }),
      ]));
    expect(
      normalized.disclosures.find((entry: JsonRecord) => entry.id === 'UNIT_CONVERTED')?.text,
    ).toContain(
      'phase-plane exact unit transforms: 0 coordinate, 0 physical derivative, ' +
      '1 axis-normalized derivative',
    );
  });

  it('keeps multiple nullclines distinguishable without color and mirrors style tokens in the legend', () => {
    const request = requestFor('neuro.phase_plane');
    const method = structuredClone(request.data.nullclines.methods[0]);
    request.data.nullclines = {
      curveIds: ['x-nullcline', 'y-nullcline'],
      labels: ['dx/dt = 0', 'dy/dt = 0'],
      zeroDerivativeOf: ['x', 'y'],
      methods: [method, structuredClone(method)],
      pointCurveIds: [
        'x-nullcline', 'x-nullcline', 'x-nullcline', 'x-nullcline',
        'y-nullcline', 'y-nullcline', 'y-nullcline', 'y-nullcline',
      ],
      x: {
        kind: 'membrane_voltage',
        unit: 'mV',
        values: [-70, -55, null, -40, -70, -55, null, -40],
      },
      y: {
        kind: 'state_variable',
        unit: '1',
        values: [0.02, 0.1, null, 0.18, 0.18, 0.1, null, 0.02],
      },
    };
    const result = buildOrThrow('neuro.phase_plane', 0, request);
    const signatures = request.data.nullclines.curveIds.map((id: string, index: number) => {
      const curve = group(result, `nullcline-${id}`);
      const line = curve.marks.find((mark: JsonRecord) => mark.type === 'line');
      const point = curve.marks.find((mark: JsonRecord) => mark.type === 'point');
      const legend = result.plan.legend.find(
        (entry: JsonRecord) => entry.label === request.data.nullclines.labels[index],
      );
      expect(line).toBeDefined();
      expect(point).toBeDefined();
      expect(legend).toBeDefined();
      expect(legend.dash).toBe(line.dash);
      expect(legend.marker).toBe(point.shape);
      return `${line.dash}|${point.shape}`;
    });
    expect(new Set(signatures).size).toBe(signatures.length);
    expect(signatures).toEqual(['8 2 2 2|diamond', '1 3|cross']);
  });

  it('keeps empty and all-missing nullcline declarations honest without inventing marks', () => {
    const cases = [
      { pointIds: [] as string[], xs: [] as (number | null)[], ys: [] as (number | null)[] },
      {
        pointIds: ['v-nullcline', 'v-nullcline'],
        xs: [null, null] as (number | null)[],
        ys: [null, null] as (number | null)[],
      },
    ];
    for (const testCase of cases) {
      const request = requestFor('neuro.phase_plane');
      request.data.nullclines.pointCurveIds = testCase.pointIds;
      request.data.nullclines.x.values = testCase.xs;
      request.data.nullclines.y.values = testCase.ys;
      const result = buildOrThrow('neuro.phase_plane', 0, request);
      expect(result.plan.panels[0].marks.some(
        (mark: JsonRecord) => mark.type === 'group' && mark.id === 'nullcline-v-nullcline',
      )).toBe(false);
      expect(result.plan.legend).toContainEqual(expect.objectContaining({
        label: `${request.data.nullclines.labels[0]} (declared; no drawable finite points)`,
      }));
      expect(result.plan.accessibility.summary).toContain('1 nullclines');
      expect(result.plan.accessibility.summary).toContain(
        '1 declared nullcline has no drawable finite points.',
      );
      expect(rowObjects(result).filter((row) => row.rowKind === 'nullcline_point'))
        .toHaveLength(testCase.pointIds.length);
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
