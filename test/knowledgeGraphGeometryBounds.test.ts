import { describe, expect, it } from 'vitest';
import {
  createKnowledgeGraphGeometryBounds,
  includeKnowledgeGraphGeometryPointInto,
  includeKnowledgeGraphQuadraticBoundsInto,
  isKnowledgeGraphGeometryBoundsFinite,
  projectKnowledgeGraphGeometryBoundsInto,
} from '../react/knowledgeGraphGeometryBounds.internal';

describe('current knowledge-graph geometry bounds', () => {
  it('rejects empty/nonfinite geometry while accepting the corresponding finite point', () => {
    const b = createKnowledgeGraphGeometryBounds();
    expect(isKnowledgeGraphGeometryBoundsFinite(b)).toBe(false);
    expect(includeKnowledgeGraphGeometryPointInto(b, 0, NaN, 0, 4)).toBe(false);
    expect(includeKnowledgeGraphGeometryPointInto(b, 0, 0, 0, 4)).toBe(true);
    const before = { ...b };
    expect(includeKnowledgeGraphGeometryPointInto(b, Infinity, 0, 0)).toBe(false);
    expect(includeKnowledgeGraphGeometryPointInto(b, 0, 0, 0, -1)).toBe(false);
    expect(b).toEqual(before);
    expect(b).toEqual({ minX: -4, minY: -4, minZ: -4, maxX: 4, maxY: 4, maxZ: 4 });
  });
  it('bounds the painted curve rather than its unused control-point hull', () => {
    const b = createKnowledgeGraphGeometryBounds();
    expect(
      includeKnowledgeGraphQuadraticBoundsInto(
        b,
        { x: -10, y: 0, z: 0 },
        { x: 0, y: 24, z: 4 },
        { x: 10, y: 0, z: 0 },
      ),
    ).toBe(true);
    expect(b.maxY).toBe(12);
    expect(b.maxZ).toBe(2);
    for (let n = 0; n <= 120; n++) {
      const t = n / 120;
      const x = -10 + 20 * t;
      const y = 48 * (1 - t) * t;
      expect(x).toBeGreaterThanOrEqual(b.minX);
      expect(x).toBeLessThanOrEqual(b.maxX);
      expect(y).toBeGreaterThanOrEqual(b.minY);
      expect(y).toBeLessThanOrEqual(b.maxY);
    }
    const before = { ...b };
    expect(
      includeKnowledgeGraphQuadraticBoundsInto(
        b,
        { x: 0, y: 0, z: 0 },
        { x: NaN, y: 24, z: 4 },
        { x: 10, y: 0, z: 0 },
      ),
    ).toBe(false);
    expect(b).toEqual(before);
  });
  it('keeps straight lanes and isolated glyphs without phantom parallel-lane padding', () => {
    const b = createKnowledgeGraphGeometryBounds();
    includeKnowledgeGraphGeometryPointInto(b, -10, 0, 0, 4);
    includeKnowledgeGraphGeometryPointInto(b, 10, 0, 0, 4);
    includeKnowledgeGraphQuadraticBoundsInto(
      b,
      { x: -10, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    );
    expect(b.maxY).toBe(4);
    expect(b.minY).toBe(-4);
    includeKnowledgeGraphGeometryPointInto(b, 80, 30, -5, 6);
    expect(b.maxX).toBe(86);
    expect(b.minZ).toBe(-11);
  });
  it('projects a rotated box and rejects a nonorthogonal camera basis without writes', () => {
    const b = { minX: -4, minY: -2, minZ: -1, maxX: 4, maxY: 2, maxZ: 1 };
    const p = createKnowledgeGraphGeometryBounds();
    const q = Math.SQRT1_2;
    expect(
      projectKnowledgeGraphGeometryBoundsInto(
        b,
        { x: 0, y: 0, z: 0 },
        { x: q, y: 0, z: -q },
        { x: 0, y: 1, z: 0 },
        { x: q, y: 0, z: q },
        p,
      ),
    ).toBe(true);
    expect(p.maxX).toBeCloseTo(5 * q);
    expect(p.maxZ).toBeCloseTo(5 * q);
    const before = { ...p };
    expect(
      projectKnowledgeGraphGeometryBoundsInto(
        b,
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        p,
      ),
    ).toBe(false);
    expect(p).toEqual(before);
  });
  it('does not lose a finite quadratic extremum when derivative arithmetic would overflow', () => {
    const bounds = createKnowledgeGraphGeometryBounds();
    const value = Number.MAX_VALUE;
    expect(
      includeKnowledgeGraphQuadraticBoundsInto(
        bounds,
        { x: 0, y: 0, z: 0 },
        { x: value, y: value, z: 0 },
        { x: 0, y: 0, z: 0 },
      ),
    ).toBe(true);
    expect(bounds.maxX).toBe(value / 2);
    expect(bounds.maxY).toBe(value / 2);
    const before = { ...bounds };
    expect(
      includeKnowledgeGraphQuadraticBoundsInto(
        bounds,
        { x: 0, y: 0, z: 0 },
        { x: Infinity, y: value, z: 0 },
        { x: 0, y: 0, z: 0 },
      ),
    ).toBe(false);
    expect(bounds).toEqual(before);
  });
  it('rejects overflow in a projected corner without publishing partial bounds', () => {
    const target = { minX: -1, minY: -1, minZ: -1, maxX: 1, maxY: 1, maxZ: 1 };
    const before = { ...target };
    const basis = [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ];
    const huge = { minX: 0, minY: 0, minZ: 0, maxX: Number.MAX_VALUE, maxY: 1, maxZ: 1 };
    expect(
      projectKnowledgeGraphGeometryBoundsInto(
        huge,
        { x: -Number.MAX_VALUE, y: 0, z: 0 },
        basis[0],
        basis[1],
        basis[2],
        target,
      ),
    ).toBe(false);
    expect(target).toEqual(before);
    expect(
      projectKnowledgeGraphGeometryBoundsInto(
        huge,
        { x: 0, y: 0, z: 0 },
        basis[0],
        basis[1],
        basis[2],
        target,
      ),
    ).toBe(true);
    expect(target.maxX).toBe(Number.MAX_VALUE);
  });
});
