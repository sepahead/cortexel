import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  createKnowledgeGraphLabelResourceState,
  installKnowledgeGraphLabelResources,
} from '../react/knowledgeGraphLabelResource.internal';

function canvas() {
  const text: string[] = [];
  const context = {
    font: '',
    textAlign: '',
    textBaseline: '',
    fillStyle: '',
    measureText: (value: string) => ({ width: Array.from(value).length * 14 }),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    fillText: (value: string) => text.push(value),
  };
  const element = { width: 0, height: 0, getContext: () => context };
  return { element: element as unknown as HTMLCanvasElement, text };
}
describe('bounded post-commit label atlas ownership', () => {
  it('binds the committed sampler when declarative uniform records were copied', () => {
    const declarative = { value: null as THREE.Texture | null };
    const committed = { ...declarative };
    const options = {
      labels: ['Record'],
      themeMode: 'dark' as const,
      color: '#e2e8f0',
      invalidate: vi.fn(),
      createCanvas: () => canvas().element,
    };
    const wrongTexture = new THREE.Texture();
    const wrongCleanup = installKnowledgeGraphLabelResources({
      ...options,
      state: createKnowledgeGraphLabelResourceState(1),
      map: declarative,
      createTexture: () => wrongTexture,
    });
    expect(committed.value).toBeNull();
    expect(declarative.value).toBe(wrongTexture);
    wrongCleanup?.();
    const texture = new THREE.Texture();
    const cleanup = installKnowledgeGraphLabelResources({
      ...options,
      state: createKnowledgeGraphLabelResourceState(1),
      map: committed,
      createTexture: () => texture,
    });
    expect(committed.value).toBe(texture);
    expect(declarative.value).toBeNull();
    cleanup?.();
    expect(committed.value).toBeNull();
  });
  it('creates one texture for the bounded pool, preserves source labels, and cleans once', () => {
    const c = canvas();
    const labels = Array.from(
      { length: 64 },
      (_, i) => `Scientific record ${i} with a complete source label`,
    );
    const before = JSON.stringify(labels);
    const state = createKnowledgeGraphLabelResourceState(64);
    const texture = new THREE.Texture();
    const dispose = vi.spyOn(texture, 'dispose');
    const map = { value: null as THREE.Texture | null };
    const createTexture = vi.fn(() => texture);
    const cleanup = installKnowledgeGraphLabelResources({
      labels,
      state,
      map,
      themeMode: 'dark',
      color: '#e2e8f0',
      invalidate: vi.fn(),
      createCanvas: () => c.element,
      createTexture,
    });
    expect(createTexture).toHaveBeenCalledTimes(1);
    expect(c.element.width * c.element.height * 4).toBe(6 * 1024 * 1024);
    expect(state.ready).toBe(true);
    expect(map.value).toBe(texture);
    expect(state.widths.every((w) => w > 0 && w <= 176)).toBe(true);
    expect(c.text.every((t) => t.endsWith('…'))).toBe(true);
    expect(JSON.stringify(labels)).toBe(before);
    for (let slot = 0; slot < 64; slot++) {
      const u = slot * 4;
      expect(state.uvRects[u] + state.uvRects[u + 2]).toBeLessThanOrEqual(1);
      expect(state.uvRects[u + 1] + state.uvRects[u + 3]).toBeLessThanOrEqual(1);
    }
    cleanup?.();
    cleanup?.();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(map.value).toBeNull();
    expect(state.ready).toBe(false);
  });
  it('rejects over-capacity setup before any canvas or texture allocation', () => {
    const createCanvas = vi.fn(() => canvas().element);
    const state = createKnowledgeGraphLabelResourceState(64);
    expect(() =>
      installKnowledgeGraphLabelResources({
        labels: new Array(65).fill('record'),
        state,
        map: { value: null },
        themeMode: 'light',
        color: '#0f172a',
        invalidate: vi.fn(),
        createCanvas,
      }),
    ).toThrow();
    expect(createCanvas).not.toHaveBeenCalled();
    expect(() => createKnowledgeGraphLabelResourceState(65)).toThrow();
  });
  it('keeps missing-canvas output unavailable and accepts its available counterpart', () => {
    const state = createKnowledgeGraphLabelResourceState(1);
    const map = { value: null as THREE.Texture | null };
    const options = {
      labels: ['Record'],
      state,
      map,
      themeMode: 'light' as const,
      color: '#0f172a',
      invalidate: vi.fn(),
    };
    expect(
      installKnowledgeGraphLabelResources({ ...options, createCanvas: () => null }),
    ).toBeUndefined();
    expect(state.ready).toBe(false);
    expect(state.widths[0]).toBe(0);
    const cleanup = installKnowledgeGraphLabelResources({
      ...options,
      createCanvas: () => canvas().element,
      createTexture: () => new THREE.Texture(),
    });
    expect(state.ready).toBe(true);
    cleanup?.();
  });
  it('cannot clear a newer replacement and rolls back a throwing invalidator', () => {
    const stateA = createKnowledgeGraphLabelResourceState(1);
    const stateB = createKnowledgeGraphLabelResourceState(1);
    const map = { value: null as THREE.Texture | null };
    const a = new THREE.Texture();
    const b = new THREE.Texture();
    const disposeA = vi.spyOn(a, 'dispose');
    const disposeB = vi.spyOn(b, 'dispose');
    const options = {
      labels: ['Record'],
      map,
      themeMode: 'dark' as const,
      color: '#e2e8f0',
      invalidate: vi.fn(),
      createCanvas: () => canvas().element,
    };
    const cleanA = installKnowledgeGraphLabelResources({
      ...options,
      state: stateA,
      createTexture: () => a,
    });
    const cleanB = installKnowledgeGraphLabelResources({
      ...options,
      state: stateB,
      createTexture: () => b,
    });
    cleanA?.();
    expect(map.value).toBe(b);
    expect(stateB.ready).toBe(true);
    expect(disposeA).toHaveBeenCalledTimes(1);
    cleanB?.();
    expect(disposeB).toHaveBeenCalledTimes(1);
    const failed = new THREE.Texture();
    const disposeFailed = vi.spyOn(failed, 'dispose');
    expect(() =>
      installKnowledgeGraphLabelResources({
        ...options,
        state: stateA,
        createTexture: () => failed,
        invalidate: () => {
          throw new Error('host error');
        },
      }),
    ).toThrow('host error');
    expect(map.value).toBeNull();
    expect(stateA.ready).toBe(false);
    expect(disposeFailed).toHaveBeenCalledTimes(1);
  });
  it('reports undefined cleanup failures and attempts every owned cleanup action', () => {
    const state = createKnowledgeGraphLabelResourceState(1);
    const map = { value: null as THREE.Texture | null };
    const texture = new THREE.Texture();
    const disposal = vi.spyOn(texture, 'dispose').mockImplementation(() => {
      throw undefined;
    });
    const invalidate = vi.fn();
    const cleanup = installKnowledgeGraphLabelResources({
      labels: ['Record'],
      state,
      map,
      themeMode: 'light',
      color: '#0f172a',
      invalidate,
      createCanvas: () => canvas().element,
      createTexture: () => texture,
    });
    invalidate.mockImplementation(() => {
      throw new Error('cleanup invalidation');
    });
    let error: unknown;
    let failed = false;
    try {
      cleanup?.();
    } catch (value) {
      error = value;
      failed = true;
    }
    expect(failed).toBe(true);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([undefined, expect.any(Error)]);
    expect(disposal).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(map.value).toBeNull();
    expect(state.ready).toBe(false);
    cleanup?.();
    expect(disposal).toHaveBeenCalledTimes(1);
  });
});
