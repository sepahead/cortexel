import { describe, it, expect } from 'vitest';
import {
  CorrelogramParamsSchema,
  KnowledgeGraph3DParamsSchema,
  PhasePlaneParamsSchema,
  Spatial3DParamsSchema,
} from '../core/skills/params';

// These two schemas used to admit z.unknown() for their core data, so a
// structurally-broken payload passed the strict gate and rendered blank. The
// tightened schemas must reject those payloads at validation instead.
describe('tightened param schemas reject structurally-broken data', () => {
  it('Spatial3DParamsSchema requires {x,y,z} numbers per object', () => {
    expect(Spatial3DParamsSchema.safeParse({
      objects: [{ x: 0, y: 0, z: 0 }],
      coordinate_units: 'mm',
    }).success).toBe(true);
    expect(Spatial3DParamsSchema.safeParse({ objects: [42] }).success).toBe(false);
    expect(Spatial3DParamsSchema.safeParse({ objects: [{ x: 0 }] }).success).toBe(false);
    expect(Spatial3DParamsSchema.safeParse({ objects: [] }).success).toBe(false);
  });

  it('Spatial3DParamsSchema still passes through extra node keys', () => {
    const r = Spatial3DParamsSchema.safeParse({
      objects: [{ x: 0, y: 1, z: 2, id: 7, label: 'E' }],
      coordinate_units: 'mm',
    });
    expect(r.success).toBe(true);
  });

  it('PhasePlaneParamsSchema requires two axes and a complete derivative field', () => {
    expect(
      PhasePlaneParamsSchema.safeParse({
        grid: { v: [-70, -50], w: [0, 1] },
        derivatives: { v: [1, 1, -1, -1], w: [-1, 1, -1, 1] },
        axis_units: { v: 'mV', w: '1' },
        derivative_units: { v: 'mV/ms', w: '1/ms' },
        axis_order: ['v', 'w'],
        flattening: 'row-major-last-axis-fastest',
      }).success,
    ).toBe(true);
    expect(PhasePlaneParamsSchema.safeParse({ grid: {} }).success).toBe(false);
    expect(PhasePlaneParamsSchema.safeParse({ grid: { v: 'notanarray' } }).success).toBe(false);
  });
});

describe('correlogram normalization determines units and numeric domain', () => {
  it.each([
    ['pearson_coefficient', '1', [-1, 0, 1]],
    ['raw_pair_count', 'count', [0, 2, 4]],
    ['count_per_bin', 'count/bin', [0, 1, 3]],
    ['rate_hz', 'Hz', [0, 1.5, 10]],
  ] as const)('accepts %s values', (normalization, correlation_units, correlation) => {
    expect(CorrelogramParamsSchema.safeParse({
      lags_ms: [-1, 0, 1],
      correlation,
      normalization,
      correlation_units,
    }).success).toBe(true);
  });

  it.each([
    ['pearson_coefficient', '1', [1.1]],
    ['raw_pair_count', 'count', [-1]],
    ['count_per_bin', 'count/bin', [0.5]],
    ['rate_hz', 'Hz', [-0.1]],
    ['pearson_coefficient', 'count', [0.5]],
  ] as const)('rejects contradictory %s values/units', (normalization, correlation_units, correlation) => {
    expect(CorrelogramParamsSchema.safeParse({
      lags_ms: [0],
      correlation,
      normalization,
      correlation_units,
    }).success).toBe(false);
  });
});

describe('render-facing labels reject visual-order controls', () => {
  it('rejects bidi overrides in knowledge-graph ids and labels', () => {
    for (const nodes of [
      [{ id: 'paper\u202e1', kind: 'paper', label: 'Paper 1' }],
      [{ id: 'paper1', kind: 'paper', label: 'Paper\u061c 1' }],
    ]) {
      expect(KnowledgeGraph3DParamsSchema.safeParse({ nodes, edges: [] }).success).toBe(false);
    }
  });
});
