import { describe, expect, it } from 'vitest';

import {
  closePlainRenderPlanForAuthorityV1,
  isClosedPlainRenderPlanForAuthorityV1,
} from '../src/render/plan-closure.js';
import type { RenderPlanV1 } from '../src/render/model/renderPlan.js';

function plan(): RenderPlanV1 {
  return {
    version: 1,
    figureId: 'figure',
    skillId: 'test.skill',
    width: 640,
    height: 480,
    title: 'Test',
    themeId: 'light',
    sourceRequestDigest: 'sha256:test',
    panels: [{
      id: 'panel',
      x: 0,
      y: 0,
      width: 640,
      height: 440,
      axes: [],
      marks: [{
        type: 'point',
        points: [{
          x: 1,
          y: 2,
          authority: { tag: 'data_carrier', classId: 'samples', provenance: 'sample-0' },
        }],
        fill: '#000',
        radius: 2,
        shape: 'circle',
      }],
    }],
    disclosures: [],
    table: {
      policy: 'complete_returned',
      columns: [{ key: 'id', header: 'ID' }],
      rows: [['sample-0']],
      rowsInline: 1,
      rowsTotal: 1,
    },
    accessibility: { summary: 'One sample.', panelSummaries: [] },
  };
}

describe('OutputAuthority RenderPlan closure capability', () => {
  it('detaches, deeply freezes, and brands a finite plain plan', () => {
    const source = plan();
    const result = closePlainRenderPlanForAuthorityV1(source);
    expect(result.tag).toBe('closed');
    if (result.tag !== 'closed') return;
    expect(result.plan).not.toBe(source);
    expect(isClosedPlainRenderPlanForAuthorityV1(source)).toBe(false);
    expect(isClosedPlainRenderPlanForAuthorityV1(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan.panels)).toBe(true);
    expect(Object.isFrozen(result.plan.panels[0].marks)).toBe(true);
    expect(() => (result.plan.panels[0].marks as any[]).push({})).toThrow(TypeError);
  });

  it('rejects an accessor without invoking its getter', () => {
    const source = plan() as any;
    let reads = 0;
    Object.defineProperty(source, 'title', {
      enumerable: true,
      configurable: true,
      get() {
        reads++;
        throw new Error('must not execute');
      },
    });
    const result = closePlainRenderPlanForAuthorityV1(source);
    expect(result.tag).toBe('refused');
    expect(reads).toBe(0);
  });

  it('rejects proxies with the documented compiler-only reflection behavior', () => {
    let propertyReads = 0;
    let reflectionTraps = 0;
    const proxy = new Proxy(plan(), {
      get(target, key, receiver) {
        propertyReads++;
        return Reflect.get(target, key, receiver);
      },
      getPrototypeOf(target) {
        reflectionTraps++;
        return Reflect.getPrototypeOf(target);
      },
      ownKeys(target) {
        reflectionTraps++;
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, key) {
        reflectionTraps++;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    expect(closePlainRenderPlanForAuthorityV1(proxy).tag).toBe('refused');
    expect(propertyReads).toBe(0);
    expect(reflectionTraps).toBeGreaterThan(0);
  });

  it('rejects non-plain atoms, sparse arrays, and repeated object identities', () => {
    const dated = plan() as any;
    dated.extension = new Date(0);
    expect(closePlainRenderPlanForAuthorityV1(dated).tag).toBe('refused');

    const sparse = plan() as any;
    sparse.panels = new Array(2);
    sparse.panels[1] = plan().panels[0];
    expect(closePlainRenderPlanForAuthorityV1(sparse).tag).toBe('refused');

    const repeated = plan() as any;
    const shared = { id: 'shared' };
    repeated.left = shared;
    repeated.right = shared;
    expect(closePlainRenderPlanForAuthorityV1(repeated).tag).toBe('refused');
  });

  it('does not let a frozen or copied lookalike forge the module-owned capability', () => {
    const lookalike = Object.freeze(plan());
    expect(isClosedPlainRenderPlanForAuthorityV1(lookalike)).toBe(false);
    const closed = closePlainRenderPlanForAuthorityV1(plan());
    expect(closed.tag).toBe('closed');
    if (closed.tag !== 'closed') return;
    expect(isClosedPlainRenderPlanForAuthorityV1({ ...closed.plan })).toBe(false);
  });
});
