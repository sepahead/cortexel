import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { aggregateTopologyScalar } from '../src/analysis/topology.js';
import { TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/topology-dynamics.js';
import { validateRequestValue } from '../src/core/request.js';
import type { JsonValue } from '../src/core/parse-json.js';
import {
  classifySpatialChord,
  routeSpatialChord,
  spatialDomainAxis,
  spatialDomainAxisContains,
} from '../src/core/spatial.js';
import { buildFigure } from '../src/render/index.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');

function contract(skillId: string): JsonRecord {
  return JSON.parse(readFileSync(
    path.join(ROOT, `contract/skills/${skillId}.v1.json`),
    'utf8',
  ));
}

function valid(skillId: string, index = 0): JsonRecord {
  return structuredClone(contract(skillId).examples.valid[index]);
}

function errorCodes(request: JsonRecord): string[] {
  const checked = validateRequestValue(request);
  return checked.ok ? [] : checked.errors.map((error) => error.code);
}

function permutations(values: readonly number[]): number[][] {
  if (values.length <= 1) return [[...values]];
  return values.flatMap((value, index) => permutations([
    ...values.slice(0, index),
    ...values.slice(index + 1),
  ]).map((rest) => [value, ...rest]));
}

function built(request: JsonRecord) {
  const result = buildFigure(request);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

function rowObjects(result: ReturnType<typeof built>): JsonRecord[] {
  return result.table.rows.map((row) => Object.fromEntries(
    result.table.columns.map((column, index) => [column.key, row[index]]),
  ));
}

function group(result: ReturnType<typeof built>, id: string): JsonRecord {
  const found = result.plan.panels.flatMap((panel) => panel.marks)
    .find((mark) => mark.type === 'group' && mark.id === id);
  if (!found || found.type !== 'group') throw new Error(`missing group ${id}`);
  return found as JsonRecord;
}

function halfPeriodRequest(): JsonRecord {
  const request = valid('network.spatial_map_2d');
  request.data.nodeUniverse = { ids: ['a', 'b'], order: 'as_declared', complete: true };
  request.data.positions.nodeIds = ['a', 'b'];
  request.data.positions.x.values = [100, -100];
  request.data.positions.y.values = [0, 0];
  request.data.positions.domain = {
    center: {
      x: { kind: 'position', unit: 'um', value: 0 },
      y: { kind: 'position', unit: 'um', value: 0 },
    },
    extent: {
      width: { kind: 'length', unit: 'um', value: 400 },
      height: { kind: 'length', unit: 'um', value: 400 },
    },
    boundary: { kind: 'periodic', x: true, y: false, edgeChordRule: 'minimum_image' },
  };
  request.data.connections = {
    sourceIds: ['b', 'a'],
    targetIds: ['a', 'b'],
    edgeIds: ['reverse', 'forward'],
    weights: { kind: 'synaptic_weight', unit: 'nest:weight', values: [1, 1] },
    delays: { kind: 'delay', unit: 'ms', values: [1, 1] },
    synapseModels: ['static_synapse', 'static_synapse'],
  };
  request.parameters.nodeEncoding = { mode: 'uniform' };
  request.parameters.multapseAggregation = 'sum';
  request.parameters.connectionDisplay = {
    valueEncoding: 'weight',
    channel: 'width',
  };
  return request;
}

describe('spatial/topology scientific hardening', () => {
  it('uses exact permutation-invariant finite topology aggregation', () => {
    for (const [values, expected] of [
      [[1e16, 1, -1e16], 1],
      [[1e308, 1e308, -1e308], 1e308],
    ] as const) {
      for (const permutation of permutations(values)) {
        expect(aggregateTopologyScalar(permutation, 'sum')).toBe(expected);
        expect(aggregateTopologyScalar(permutation, 'mean')).toBe(
          aggregateTopologyScalar(values, 'mean'),
        );
      }
    }
    expect(() => aggregateTopologyScalar([1e308, 1e308], 'sum')).toThrow(/finite/u);
    expect(() => aggregateTopologyScalar([Number.POSITIVE_INFINITY], 'sum')).toThrow(/finite/u);
    expect(() => aggregateTopologyScalar([1, 2], 'no_aggregation')).toThrow(/exactly one/u);
  });

  it('executes every living spatial numeric-policy conformance vector', () => {
    const registry = JSON.parse(readFileSync(
      path.join(ROOT, 'contract/registries/numeric-policies.v1.json'),
      'utf8',
    )) as JsonRecord;
    const algorithm = registry.algorithms.find(
      (entry: JsonRecord) => entry.id === 'cortexel_binary64_spatial_domain_axis_v1',
    );
    for (const vector of algorithm.conformanceVectors as JsonRecord[]) {
      if (!vector.result.accepted) {
        expect(
          () => spatialDomainAxis(vector.input.center, vector.input.extent),
          vector.name,
        ).toThrow();
        continue;
      }
      const axis = spatialDomainAxis(vector.input.center, vector.input.extent);
      expect(axis.lower, vector.name).toBe(vector.result.lower);
      expect(axis.upper, vector.name).toBe(vector.result.upper);
      expect(
        vector.input.values.map((value: number) => spatialDomainAxisContains(axis, value)),
        vector.name,
      ).toEqual(vector.result.membership);
    }
  });

  it('rejects foreign positions and every ambiguous group binding', () => {
    const foreignPosition = valid('network.spatial_map_2d', 1);
    foreignPosition.data.positions.nodeIds.push('foreign');
    foreignPosition.data.positions.x.values.push(0);
    foreignPosition.data.positions.y.values.push(0);
    foreignPosition.data.positions.value.values.push(null);
    expect(errorCodes(foreignPosition)).toContain('SEMANTIC_UNKNOWN_REFERENCE');

    for (const mutate of [
      (request: JsonRecord) => request.data.nodeUniverse.groups[0].memberIds.push('foreign'),
      (request: JsonRecord) => request.data.nodeUniverse.groups[0].memberIds.push('1'),
      (request: JsonRecord) => request.data.nodeUniverse.groups[1].memberIds.push('1'),
    ]) {
      const request = valid('network.spatial_map_2d');
      mutate(request);
      expect(errorCodes(request)).toContain(
        request.data.nodeUniverse.groups[0].memberIds.includes('foreign')
          ? 'SEMANTIC_UNKNOWN_REFERENCE'
          : 'SEMANTIC_DUPLICATE_ID',
      );
    }
    const duplicateGroup = valid('network.spatial_map_2d');
    duplicateGroup.data.nodeUniverse.groups.push({ id: 'exc', memberIds: [] });
    expect(errorCodes(duplicateGroup)).toContain('SEMANTIC_DUPLICATE_ID');
  });

  it('uses the positive exact half-period image for one unordered physical route', () => {
    const domain = {
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200,
      centerX: 0,
      centerY: 0,
      periodX: 400,
      periodY: 400,
      periodicX: true,
      periodicY: false,
      edgeChordRule: 'minimum_image' as const,
    };
    const classified = classifySpatialChord({ x: 100, y: 0 }, { x: -100, y: 0 }, domain);
    expect(classified).toMatchObject({
      dx: 200,
      halfPeriodTieX: true,
      pathKind: 'minimum_image_wrapped_half_period_tie_x',
    });
    expect(routeSpatialChord({ x: 100, y: 0 }, { x: -100, y: 0 }, domain).segments)
      .toEqual([
        [{ x: 100, y: 0 }, { x: 200, y: 0 }],
        [{ x: -200, y: 0 }, { x: -100, y: 0 }],
      ]);
  });

  it('keeps table path kind, tie summary, geometry, and independent authority aligned', () => {
    const request = halfPeriodRequest();
    const result = built(request);
    const connectionRows = rowObjects(result).filter((row) => row.rowKind === 'connection');
    expect(connectionRows.map((row) => row.chordRule)).toEqual([
      'minimum_image_wrapped_half_period_tie_x',
      'minimum_image_wrapped_half_period_tie_x',
    ]);
    expect(result.plan.accessibility.summary).toContain(
      '1 unordered physical chords contain 1 exact half-period axis ties',
    );
    const pair = group(result, 'connection-pair-reverse');
    expect(pair.marks.find((mark: JsonRecord) => mark.type === 'line').subpaths).toHaveLength(2);
    expect(pair.marks.find((mark: JsonRecord) => mark.type === 'arrow').arrows).toHaveLength(2);

    const validated = validateRequestValue(request);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const evaluator = TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS.find(
      (candidate) => candidate.id === 'network.spatial_map_2d.output_authority.v2',
    )!;
    const fields = evaluator.evaluateCanonicalRequest(
      validated.request.canonicalRequest as JsonValue,
    ).fields as JsonRecord;
    expect(fields['summary.facts'].facts).toMatchObject({
      minimumImageTieChordCount: '1',
      minimumImageTieAxisCount: '1',
    });
    expect(fields['table.rows'].rows.slice(-2).map((row: unknown[]) => row[14])).toEqual(
      connectionRows.map((row) => row.chordRule),
    );
  });

  it('binds position rows by universe id and uses one domain-membership authority', () => {
    const request = valid('network.spatial_map_2d', 1);
    request.data.positions.domain = {
      center: {
        x: { kind: 'position', unit: 'mm', value: 0 },
        y: { kind: 'position', unit: 'mm', value: 0 },
      },
      extent: {
        width: { kind: 'length', unit: 'mm', value: 2 },
        height: { kind: 'length', unit: 'mm', value: 2 },
      },
      boundary: { kind: 'open' },
    };
    request.data.positions.x.values = [1, 1.0000000000000036, 1.0000000000000038];
    request.data.positions.y.values = [0, 0, 0];
    expect(rowObjects(built(request)).filter((row) => row.rowKind === 'node')
      .map((row) => row.insideDomain)).toEqual(['true', 'true', 'false']);

    const permuted = structuredClone(request);
    const order = [2, 0, 1];
    for (const key of ['nodeIds'] as const) {
      permuted.data.positions[key] = order.map((index) => request.data.positions[key][index]);
    }
    for (const key of ['x', 'y', 'value'] as const) {
      permuted.data.positions[key].values = order.map(
        (index) => request.data.positions[key].values[index],
      );
    }
    const projection = (candidate: ReturnType<typeof built>) => rowObjects(candidate)
      .filter((row) => row.rowKind === 'node')
      .map((row) => [row.id, row.x, row.y, row.value, row.insideDomain]);
    expect(projection(built(permuted))).toEqual(projection(built(request)));

    const collapsed = structuredClone(request);
    collapsed.data.positions.domain.center.x.value = 1e16;
    collapsed.data.positions.domain.extent.width.value = 1;
    const refused = buildFigure(collapsed);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.errors[0].code)
      .toBe('SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE');
  });

  it('preserves extreme symlog ordering and fails closed on centered overflow', () => {
    const spatial = valid('network.spatial_map_2d', 1);
    spatial.data.positions.value.values = [-1e308, 0, 1e308];
    spatial.parameters.nodeEncoding.colorScale = {
      kind: 'sequential',
      transform: 'symlog',
      linearThreshold: Number.MIN_VALUE,
    };
    const rendered = built(spatial);
    const fills = spatial.data.nodeUniverse.ids.map(
      (id: string) => group(rendered, `node-${id}`).marks[0].fill,
    );
    expect(new Set(fills).size).toBe(3);

    spatial.parameters.nodeEncoding.colorScale = {
      kind: 'diverging', center: -1e308, transform: 'symlog', linearThreshold: 1,
    };
    const refused = buildFigure(spatial);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.errors[0].code)
      .toBe('SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE');
  });

  it('applies exact aggregation to both spatial chords and graph bundles', () => {
    const cases = [
      [1e16, 1, -1e16],
      [1e308, 1e308, -1e308],
    ];
    for (const values of cases) {
      const spatial = halfPeriodRequest();
      spatial.data.connections.sourceIds = ['a', 'a', 'a'];
      spatial.data.connections.targetIds = ['b', 'b', 'b'];
      spatial.data.connections.edgeIds = ['e0', 'e1', 'e2'];
      spatial.data.connections.weights.values = values;
      spatial.data.connections.delays.values = [1, 1, 1];
      spatial.data.connections.synapseModels = Array(3).fill('static_synapse');
      expect((built(spatial).plan.legend ?? []).map((entry) => entry.label).join('\n'))
        .toContain('declared pair aggregate');

      const graph = valid('network.connection_graph', 2);
      graph.data.connections.weights.values = values;
      expect((built(graph).plan.legend ?? []).map((entry) => entry.label).join('\n'))
        .toContain('Edge width encodes');
    }

    for (const request of [halfPeriodRequest(), valid('network.connection_graph', 2)]) {
      const values = [1e308, 1e308, 1e308];
      if (request.skill.id === 'network.spatial_map_2d') {
        request.data.connections.sourceIds = ['a', 'a', 'a'];
        request.data.connections.targetIds = ['b', 'b', 'b'];
        request.data.connections.edgeIds = ['e0', 'e1', 'e2'];
        request.data.connections.weights.values = values;
        request.data.connections.delays.values = [1, 1, 1];
        request.data.connections.synapseModels = Array(3).fill('static_synapse');
      } else {
        request.data.connections.weights.values = values;
      }
      const refused = buildFigure(request);
      expect(refused.ok).toBe(false);
      if (!refused.ok) expect(refused.errors[0].code)
        .toBe('SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE');
    }
  });
});
