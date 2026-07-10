import { describe, expect, it } from 'vitest';
import {
  MAX_INTERACTIVE_NEURON_POINTS,
  MAX_NEURON_POINTS,
  neuronExpandedScale,
  neuronLocalGrid,
} from '../react/ExpandableNeurons';
import {
  MAX_POPULATION_SIZE,
  validatePopulationGeometry,
} from '../react/ExpandablePopulation';
import { readFileSync } from 'node:fs';
import { NEURON_FRAG, NEURON_VERT } from '../react/neuronShaders';

describe('neuron grid preserves scientific count exactly', () => {
  it.each([0, 1, 2, 8, 9, 50, 65])('allocates exactly %i neurons', (count) => {
    const grid = neuronLocalGrid(count);
    expect(grid.totalCount).toBe(count);
    expect(grid.positions).toHaveLength(count * 3);
    expect(grid.neuronIndex).toHaveLength(count);
  });

  it.each([-1, 1.5, NaN, Infinity, MAX_NEURON_POINTS + 1])(
    'rejects unsafe count %s',
    (count) => {
      expect(() => neuronLocalGrid(count)).toThrow(RangeError);
    },
  );

  it('rejects unsafe spacing and clamps public expansion math', () => {
    expect(() => neuronLocalGrid(1, 0)).toThrow(RangeError);
    expect(() => neuronLocalGrid(8, Number.MAX_VALUE)).toThrow(RangeError);
    expect(() => neuronExpandedScale(NaN)).toThrow(RangeError);
    expect(neuronExpandedScale(-1)).toBe(neuronExpandedScale(0));
    expect(neuronExpandedScale(2)).toBe(1);
  });

  it('publishes a Float32-range center guard in the component contract', () => {
    const source = readFileSync(new URL('../react/ExpandableNeurons.tsx', import.meta.url), 'utf8');
    expect(source).toContain('center.length !== 3');
    expect(source).toContain('Math.abs(value) > FLOAT32_MAX');
  });

  it.each([2, 9, 17])('centers the actual occupied cells for count=%i', (count) => {
    const { positions } = neuronLocalGrid(count);
    const sums = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      sums[0] += positions[i * 3];
      sums[1] += positions[i * 3 + 1];
      sums[2] += positions[i * 3 + 2];
    }
    for (const sum of sums) expect(sum / count).toBeCloseTo(0, 6);
  });
});

describe('point-neuron shader has defined GLSL edge behavior', () => {
  it('uses the object transform for positioning so CPU picking agrees', () => {
    expect(NEURON_VERT).not.toContain('uCenter');
  });

  it('does not call smoothstep with reversed literal edges', () => {
    expect(NEURON_FRAG).not.toMatch(/smoothstep\(0\.5,\s*0\./);
  });

  it('never fabricates membrane or spike activity in the shader', () => {
    expect(NEURON_VERT).toContain('attribute vec2 neuronActivity');
    expect(NEURON_VERT).not.toMatch(/\bsin\s*\(/);
    expect(NEURON_VERT).not.toContain('uTime');
    expect(NEURON_VERT).not.toContain('Schematic liveliness');
  });
});

describe('scene primitive resource and geometry guards', () => {
  it('keeps pointer handlers conditional and publishes a lower interactive cap', () => {
    expect(MAX_INTERACTIVE_NEURON_POINTS).toBeLessThan(MAX_NEURON_POINTS);
    const source = readFileSync(new URL('../react/ExpandableNeurons.tsx', import.meta.url), 'utf8');
    expect(source).toContain('...(onHoverNeuron');
    expect(source).toContain('...(onSelectNeuron');
    expect(source).toContain('interactive && count > MAX_INTERACTIVE_NEURON_POINTS');
    expect(source).toContain('state.invalidate()');
    expect(source).toContain('onHoverRef.current?.(null)');
  });

  it('rejects poisoned or pathological population geometry', () => {
    expect(() => validatePopulationGeometry([0, 1, 2], 0.3)).not.toThrow();
    expect(() => validatePopulationGeometry([NaN, 0, 0], 0.3)).toThrow(RangeError);
    expect(() => validatePopulationGeometry([Infinity, 0, 0], 0.3)).toThrow(RangeError);
    expect(() => validatePopulationGeometry([0, 0, 0], 0)).toThrow(RangeError);
    expect(() => validatePopulationGeometry([0, 0, 0], MAX_POPULATION_SIZE + 1)).toThrow(RangeError);
  });

  it('keeps passive population colors bounded and demand animation self-invalidating', () => {
    const source = readFileSync(new URL('../react/ExpandablePopulation.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain('multiplyScalar(1.15)');
    expect(source).toContain('state.invalidate()');
    expect(source).toContain('reducedMotion || !isHovered');
    expect(source).toContain('onHoverRef.current(false)');
  });
});
