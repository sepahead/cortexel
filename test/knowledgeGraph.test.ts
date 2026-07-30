import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement, Profiler } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import * as THREE from 'three';
import { CORTEXEL_PALETTE } from '../core/colormaps';
import {
  assignGraphEdgeLanes,
  buildAdjacency,
  advanceGraphLayoutClock,
  advanceGraphLayoutClockInto,
  assertKnowledgeGraphBudget,
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  CORPUS_GRAPH_RADIUS_MEANING,
  corpusGraphInstanceIdentity,
  corpusGraphRadiusMeaning,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphCameraTargetDamping,
  graphQueryMatchIds,
  graphSignature,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES,
  MAX_KNOWLEDGE_GRAPH_SCENE_EDGES,
  MAX_KNOWLEDGE_GRAPH_SCENE_NODES,
  normalizeGraphQuery,
  normalizeGraphNodeRadius,
  matchesGraphQuery,
  reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks,
  mapCorpusKnowledgeGraph,
} from '../react/knowledgeGraph';
import {
  planGraphLayoutCache,
  publishGraphLayoutCache,
  snapshotGraphLayoutInputs,
} from '../react/knowledgeGraphLayout.internal';
import { installFocusLabelResource } from '../react/focusLabelResource.internal';
import { snapshotKnowledgeGraphPresentation } from '../react/knowledgeGraphPresentation.internal';
import {
  beginKnowledgeGraphRuntimeTransition,
  handleKnowledgeGraphPointerOut,
  synchronizeKnowledgeGraphControlsListener,
} from '../react/knowledgeGraphInteraction.internal';
import { graphEdgeIdentityKey } from '../react/knowledgeGraphIdentity.internal';
import { planFlowParticleDistribution } from '../react/knowledgeGraphParticles.internal';
import {
  KnowledgeGraph3DScene,
  KnowledgeGraphA11yList,
  KnowledgeGraphLegend,
  type KnowledgeGraph3DNode,
} from '../react/KnowledgeGraph3DScene';
import type { KnowledgeGraph3DParams } from '../core/skills/params';
import { KNOWLEDGE_GRAPH_LIMITS, PARAM_LIMITS } from '../core/skills/params';

// react/knowledgeGraph.ts is THREE-free/React-free (only `import type` from the
// scene), so its logic is unit-testable in Node. Direct-entrypoint rejection is
// server-rendered only through the pre-hook fail-closed path; no GPU is mounted.
const P = CORTEXEL_PALETTE;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeFocusLabelCanvas() {
  let effectiveFillStyle = '';
  let fillTextStyle = '';
  const context = {
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    get fillStyle() {
      return effectiveFillStyle;
    },
    set fillStyle(value: string) {
      // Model CanvasRenderingContext2D's invalid-assignment behavior for the
      // explicit hostile-color negative control below.
      if (value !== 'definitely-not-a-css-color') effectiveFillStyle = value;
    },
    measureText: () => ({ width: 120 }),
    fillRect: () => {},
    fillText: () => {
      fillTextStyle = effectiveFillStyle;
    },
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: (kind: string) => kind === '2d' ? context : null,
  } as unknown as HTMLCanvasElement;
  return {
    canvas,
    fillTextStyle: () => fillTextStyle,
  };
}

function makeFocusLabelTargets() {
  const material = new THREE.SpriteMaterial();
  const sprite = new THREE.Sprite(material);
  const texture = new THREE.Texture();
  const dispose = vi.spyOn(texture, 'dispose');
  return { material, sprite, texture, dispose };
}

function testRendererText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(testRendererText).join('');
  if (value === null || typeof value !== 'object') return '';
  return testRendererText((value as { children?: unknown }).children);
}

describe('graph helpers', () => {
  it('owns, invalidates, and disposes a focus-label texture exactly once', () => {
    const canvas = makeFocusLabelCanvas();
    const targets = makeFocusLabelTargets();
    const invalidate = vi.fn();
    const cleanup = installFocusLabelResource({
      sprite: targets.sprite,
      material: targets.material,
      label: 'Model A',
      color: '#ffffff',
      invalidate,
      createCanvas: () => canvas.canvas,
      createTexture: () => targets.texture,
    });

    expect(cleanup).toBeTypeOf('function');
    expect(targets.material.map).toBe(targets.texture);
    expect(targets.sprite.visible).toBe(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
    cleanup!();
    expect(targets.material.map).toBeNull();
    expect(targets.sprite.visible).toBe(false);
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(2);
    cleanup!();
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(2);
    targets.material.dispose();
  });

  it('rolls back and disposes when focus-label setup invalidation throws', () => {
    const canvas = makeFocusLabelCanvas();
    const targets = makeFocusLabelTargets();
    const failure = new Error('host invalidation failed');

    expect(() => installFocusLabelResource({
      sprite: targets.sprite,
      material: targets.material,
      label: 'Model A',
      color: '#ffffff',
      invalidate: () => {
        throw failure;
      },
      createCanvas: () => canvas.canvas,
      createTexture: () => targets.texture,
    })).toThrow(failure);
    expect(targets.material.map).toBeNull();
    expect(targets.sprite.visible).toBe(false);
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    targets.material.dispose();
  });

  it('disposes before propagating a cleanup invalidation failure', () => {
    const canvas = makeFocusLabelCanvas();
    const targets = makeFocusLabelTargets();
    const failure = new Error('cleanup invalidation failed');
    let invalidations = 0;
    const cleanup = installFocusLabelResource({
      sprite: targets.sprite,
      material: targets.material,
      label: 'Model A',
      color: '#ffffff',
      invalidate: () => {
        invalidations += 1;
        if (invalidations === 2) throw failure;
      },
      createCanvas: () => canvas.canvas,
      createTexture: () => targets.texture,
    });

    expect(() => cleanup!()).toThrow(failure);
    expect(targets.material.map).toBeNull();
    expect(targets.sprite.visible).toBe(false);
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    expect(() => cleanup!()).not.toThrow();
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    targets.material.dispose();
  });

  it('cannot let stale focus-label cleanup hide or detach a replacement', () => {
    const canvas = makeFocusLabelCanvas();
    const material = new THREE.SpriteMaterial();
    const sprite = new THREE.Sprite(material);
    const firstTexture = new THREE.Texture();
    const secondTexture = new THREE.Texture();
    const firstDispose = vi.spyOn(firstTexture, 'dispose');
    const secondDispose = vi.spyOn(secondTexture, 'dispose');
    const firstCleanup = installFocusLabelResource({
      sprite,
      material,
      label: 'First',
      color: '#ffffff',
      invalidate: () => {},
      createCanvas: () => canvas.canvas,
      createTexture: () => firstTexture,
    })!;
    const secondCleanup = installFocusLabelResource({
      sprite,
      material,
      label: 'Second',
      color: '#ffffff',
      invalidate: () => {},
      createCanvas: () => canvas.canvas,
      createTexture: () => secondTexture,
    })!;

    firstCleanup();
    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(material.map).toBe(secondTexture);
    expect(sprite.visible).toBe(true);
    secondCleanup();
    expect(secondDispose).toHaveBeenCalledTimes(1);
    expect(material.map).toBeNull();
    expect(sprite.visible).toBe(false);
    material.dispose();
  });

  it('keeps focus-label text readable when Canvas rejects a caller color', () => {
    const canvas = makeFocusLabelCanvas();
    const targets = makeFocusLabelTargets();
    const cleanup = installFocusLabelResource({
      sprite: targets.sprite,
      material: targets.material,
      label: 'Model A',
      color: 'definitely-not-a-css-color',
      invalidate: () => {},
      createCanvas: () => canvas.canvas,
      createTexture: () => targets.texture,
    });

    expect(canvas.fillTextStyle()).toBe('#e2e8f0');
    cleanup!();
    targets.material.dispose();
  });

  it('deeply detaches every mutable knowledge-graph presentation container', () => {
    const attributes = { aliases: ['A', 'Alpha'] };
    const epistemic = {
      status: 'derived_advisory' as const,
      advisory_only: true as const,
      is_paper_local_evidence: false as const,
      calibrated_posterior: false as const,
    };
    const evidence = [{
      kind: 'external_source' as const,
      evidence_id: 'evidence:1',
      source_id: 'source:1',
      excerpt: 'original excerpt',
    }];
    const score = {
      kind: 'extraction_confidence' as const,
      value: 0.5,
      calibrated_posterior: false as const,
    };
    const nodes = [{
      id: 'a',
      label: 'Model A',
      kind: 'model',
      color: '#ffffff',
      radius: 4,
      attributes,
      epistemic,
      evidence,
      uncalibrated_score: score,
    }];
    const snapshot = snapshotKnowledgeGraphPresentation(nodes, []);

    attributes.aliases[0] = 'MUTATED';
    epistemic.status = 'derived_advisory';
    evidence[0].excerpt = 'mutated excerpt';
    score.value = 0.9;
    nodes[0].label = 'Mutated label';

    expect(snapshot.nodes[0].label).toBe('Model A');
    expect(snapshot.nodes[0].attributes).toEqual({ aliases: ['A', 'Alpha'] });
    expect(snapshot.nodes[0].attributes?.aliases).not.toBe(attributes.aliases);
    expect(snapshot.nodes[0].epistemic).not.toBe(epistemic);
    expect(snapshot.nodes[0].evidence).not.toBe(evidence);
    expect(snapshot.nodes[0].evidence?.[0]).not.toBe(evidence[0]);
    expect(snapshot.nodes[0].evidence?.[0]).toMatchObject({
      excerpt: 'original excerpt',
    });
    expect(snapshot.nodes[0].uncalibrated_score).not.toBe(score);
    expect(snapshot.nodes[0].uncalibrated_score?.value).toBe(0.5);
  });

  it('fails closed on oversized, sparse, or accessor-backed presentation metadata', () => {
    const node = (metadata: Partial<KnowledgeGraph3DNode>) => [{
      id: 'a',
      label: 'Model A',
      kind: 'model',
      color: '#ffffff',
      radius: 4,
      ...metadata,
    }];
    const tooManyAttributes = Object.fromEntries(
      Array.from(
        { length: KNOWLEDGE_GRAPH_LIMITS.maxAttributes + 1 },
        (_, index) => [`attribute:${index}`, index],
      ),
    );
    expect(() => snapshotKnowledgeGraphPresentation(
      node({ attributes: tooManyAttributes }),
      [],
    )).toThrow(/at most 24 keys/);
    expect(() => snapshotKnowledgeGraphPresentation(
      node({
        attributes: {
          values: new Array(KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems + 1).fill(0),
        },
      }),
      [],
    )).toThrow(/at most 16 items/);
    expect(() => snapshotKnowledgeGraphPresentation(
      node({
        evidence: new Array(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement + 1).fill({
          kind: 'external_source',
          evidence_id: 'e',
          source_id: 's',
        }),
      }),
      [],
    )).toThrow(/at most 8 references/);

    const attributeGetter = vi.fn(() => 'forbidden');
    const accessorAttributes = Object.defineProperty({}, 'claim', {
      enumerable: true,
      get: attributeGetter,
    });
    expect(() => snapshotKnowledgeGraphPresentation(
      node({ attributes: accessorAttributes }),
      [],
    )).toThrow(/accessors are not supported/);
    expect(attributeGetter).not.toHaveBeenCalled();
    expect(() => snapshotKnowledgeGraphPresentation(
      node({ attributes: { values: new Array(1) } }),
      [],
    )).toThrow(/dense data arrays/);

    const evidenceGetter = vi.fn(() => ({
      kind: 'external_source',
      evidence_id: 'e',
      source_id: 's',
    }));
    const accessorEvidence = Object.defineProperty([], '0', {
      enumerable: true,
      configurable: true,
      get: evidenceGetter,
    });
    Object.defineProperty(accessorEvidence, 'length', { value: 1 });
    expect(() => snapshotKnowledgeGraphPresentation(
      node({ evidence: accessorEvidence }),
      [],
    )).toThrow(/dense data array/);
    expect(evidenceGetter).not.toHaveBeenCalled();
    expect(() => snapshotKnowledgeGraphPresentation(
      node({ evidence: new Array(1) }),
      [],
    )).toThrow(/dense data array/);
  });

  it('hides and gates stale graph geometry before a throwing host hover callback', () => {
    const ready = { current: 'old-key' as string | null };
    const dirty = { current: false };
    const group = { visible: true };
    const order: string[] = [];
    const failure = new Error('host hover callback failed');

    expect(() => beginKnowledgeGraphRuntimeTransition(
      ready,
      dirty,
      group,
      () => order.push(`invalidate:${String(group.visible)}`),
      () => {
        order.push(`hover:${String(group.visible)}`);
        throw failure;
      },
    )).toThrow(failure);
    expect(ready.current).toBeNull();
    expect(dirty.current).toBe(true);
    expect(group.visible).toBe(false);
    expect(order).toEqual(['invalidate:false', 'hover:false']);
  });

  it('attempts hover cleanup even when graph invalidation throws', () => {
    const ready = { current: 'old-key' as string | null };
    const dirty = { current: false };
    const group = { visible: true };
    const clearHover = vi.fn();
    const failure = new Error('host invalidation failed');

    expect(() => beginKnowledgeGraphRuntimeTransition(
      ready,
      dirty,
      group,
      () => {
        throw failure;
      },
      clearHover,
    )).toThrow(failure);
    expect(clearHover).toHaveBeenCalledTimes(1);
    expect(ready.current).toBeNull();
    expect(dirty.current).toBe(true);
    expect(group.visible).toBe(false);
  });

  it('clears pointer hover while dirty without swallowing another object event', () => {
    const stopPropagation = vi.fn();
    const clearHover = vi.fn();
    handleKnowledgeGraphPointerOut(false, stopPropagation, clearHover);
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(clearHover).toHaveBeenCalledTimes(1);

    handleKnowledgeGraphPointerOut(true, stopPropagation, clearHover);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(clearHover).toHaveBeenCalledTimes(2);
  });

  it('attaches controls listeners only when exact cleanup authority exists', () => {
    const authority = { current: null as null | {
      addEventListener?(type: 'start', listener: () => void): void;
      removeEventListener?(type: 'start', listener: () => void): void;
    } };
    const listener = vi.fn();
    const addOnly = { addEventListener: vi.fn() };
    synchronizeKnowledgeGraphControlsListener(authority, addOnly, listener);
    expect(addOnly.addEventListener).not.toHaveBeenCalled();
    expect(authority.current).toBeNull();

    const first = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const second = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    synchronizeKnowledgeGraphControlsListener(authority, first, listener);
    synchronizeKnowledgeGraphControlsListener(authority, first, listener);
    expect(first.addEventListener).toHaveBeenCalledTimes(1);
    expect(first.removeEventListener).not.toHaveBeenCalled();
    synchronizeKnowledgeGraphControlsListener(authority, second, listener);
    expect(first.removeEventListener).toHaveBeenCalledTimes(1);
    expect(second.addEventListener).toHaveBeenCalledTimes(1);
    synchronizeKnowledgeGraphControlsListener(authority, null, listener);
    expect(second.removeEventListener).toHaveBeenCalledTimes(1);
    expect(authority.current).toBeNull();

    // Strict-effect replay has one removal for every accepted attachment.
    synchronizeKnowledgeGraphControlsListener(authority, first, listener);
    synchronizeKnowledgeGraphControlsListener(authority, null, listener);
    synchronizeKnowledgeGraphControlsListener(authority, first, listener);
    synchronizeKnowledgeGraphControlsListener(authority, null, listener);
    expect(first.addEventListener).toHaveBeenCalledTimes(3);
    expect(first.removeEventListener).toHaveBeenCalledTimes(3);
  });

  it('retains or rolls back controls-listener authority when host methods throw', () => {
    const listener = vi.fn();
    const removalFailure = new Error('remove failed');
    const previous = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(() => {
        throw removalFailure;
      }),
    };
    const replacement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const authority = { current: previous as typeof previous | typeof replacement | null };
    expect(() => synchronizeKnowledgeGraphControlsListener(
      authority,
      replacement,
      listener,
    )).toThrow(removalFailure);
    expect(authority.current).toBe(previous);
    expect(replacement.addEventListener).not.toHaveBeenCalled();

    const attached = new Set<() => void>();
    const addFailure = new Error('add failed after registration');
    const registerThenThrow = {
      addEventListener: vi.fn((_type: 'start', callback: () => void) => {
        attached.add(callback);
        throw addFailure;
      }),
      removeEventListener: vi.fn((_type: 'start', callback: () => void) => {
        attached.delete(callback);
      }),
    };
    const emptyAuthority = { current: null as typeof registerThenThrow | null };
    expect(() => synchronizeKnowledgeGraphControlsListener(
      emptyAuthority,
      registerThenThrow,
      listener,
    )).toThrow(addFailure);
    expect(registerThenThrow.removeEventListener).toHaveBeenCalledTimes(1);
    expect(attached.size).toBe(0);
    expect(emptyAuthority.current).toBeNull();

    const rollbackFailure = new Error('rollback failed');
    const dualFailure = {
      addEventListener: vi.fn(() => {
        throw addFailure;
      }),
      removeEventListener: vi.fn(() => {
        throw rollbackFailure;
      }),
    };
    const retainedAuthority = { current: null as typeof dualFailure | null };
    expect(() => synchronizeKnowledgeGraphControlsListener(
      retainedAuthority,
      dualFailure,
      listener,
    )).toThrow(AggregateError);
    expect(retainedAuthority.current).toBe(dualFailure);
  });

  it('filterGraphEdges drops dangling endpoints AND self-loops', () => {
    const ids = new Set(['a', 'b']);
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'ghost' }, // dangling
      { source: 'ghost', target: 'b' }, // dangling
      { source: 'a', target: 'a' }, // self-loop
    ];
    expect(filterGraphEdges(ids, edges)).toEqual([{ source: 'a', target: 'b' }]);
  });

  it('deduplicates id-less edges by their effective rendered direction', () => {
    const ids = new Set(['a', 'b']);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'same_as', directed: false },
        { source: 'b', target: 'a', kind: 'same_as', directed: false },
      ]),
    ).toHaveLength(1);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'same_as' },
        { source: 'b', target: 'a', kind: 'same_as' },
      ]),
    ).toHaveLength(2);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'related', directed: false },
        { source: 'b', target: 'a', kind: 'related', directed: false },
      ]),
    ).toHaveLength(1);
  });

  it('preserves identified parallel assertions while retaining legacy tuple dedupe', () => {
    const ids = new Set(['a', 'b']);
    const identified = filterGraphEdges(ids, [
      { id: 'claim-1', source: 'a', target: 'b', kind: 'variant_of' },
      { id: 'claim-2', source: 'a', target: 'b', kind: 'variant_of' },
    ]);
    expect(identified.map(({ id }) => id)).toEqual(['claim-1', 'claim-2']);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'variant_of' },
        { source: 'a', target: 'b', kind: 'variant_of' },
      ]),
    ).toHaveLength(1);
  });

  it('assigns centered deterministic lanes independent of edge input order', () => {
    const edges = [
      { id: 'same', source: 'a', target: 'b', kind: 'same_as' },
      { id: 'variant-forward', source: 'a', target: 'b', kind: 'variant_of' },
      { id: 'variant-reverse', source: 'b', target: 'a', kind: 'variant_of' },
    ];
    const offsets = (input: typeof edges) =>
      Object.fromEntries(assignGraphEdgeLanes(input).map(({ edge, laneOffset }) => [
        edge.id,
        laneOffset,
      ]));
    expect(offsets(edges)).toEqual(offsets([...edges].reverse()));
    expect(new Set(Object.values(offsets(edges)))).toEqual(new Set([-1, 0, 1]));
    expect(assignGraphEdgeLanes([edges[0]])[0].laneOffset).toBe(0);
  });

  it('routes every allowed parallel lane distinctly and fails closed above the cap', () => {
    const edges = Array.from({ length: MAX_GRAPH_PARALLEL_EDGES }, (_, index) => ({
      id: `claim-${index}`,
      source: 'a',
      target: 'b',
      kind: 'variant_of',
    }));
    const lanes = assignGraphEdgeLanes(edges);
    expect(new Set(lanes.map(({ laneOffset }) => laneOffset)).size).toBe(edges.length);
    expect(
      Math.max(...lanes.map(({ laneOffset }) => Math.abs(laneOffset))) *
        GRAPH_EDGE_LANE_SPACING,
    ).toBe(MAX_GRAPH_EDGE_LANE_OFFSET);
    expect(() => assignGraphEdgeLanes([
      ...edges,
      { id: 'one-too-many', source: 'a', target: 'b', kind: 'variant_of' },
    ])).toThrow(RangeError);
  });

  it('uses one layout spring per unordered pair regardless of assertion count', () => {
    const edges = [
      { source: 'b', target: 'a' },
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'c', target: 'a' },
    ];
    expect(uniqueGraphTopologyLinks(edges)).toEqual([
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
    ]);
    expect(uniqueGraphTopologyLinks([...edges].reverse())).toEqual(
      uniqueGraphTopologyLinks(edges),
    );
  });

  it('gives parallel and reverse-directed assertions one shared finite curve basis', () => {
    const source = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const [lower, upper] = assignGraphEdgeLanes([
      { id: 'lower', source: 'a', target: 'b' },
      { id: 'upper', source: 'b', target: 'a' },
    ]);
    const lowerControl = graphEdgeControlPointInto(
      source,
      target,
      lower,
      { x: 0, y: 0, z: 0 },
    );
    const upperControl = graphEdgeControlPointInto(
      target,
      source,
      upper,
      { x: 0, y: 0, z: 0 },
    );
    expect([lowerControl.x, lowerControl.y, lowerControl.z].every(Number.isFinite)).toBe(true);
    expect([upperControl.x, upperControl.y, upperControl.z].every(Number.isFinite)).toBe(true);
    expect(lowerControl).not.toEqual(upperControl);

    const midpoint = graphEdgeCurvePointInto(
      source,
      lowerControl,
      target,
      0.5,
      { x: 0, y: 0, z: 0 },
    );
    expect(midpoint).not.toEqual({ x: 5, y: 0, z: 0 });
    expect(graphEdgeCurvePointInto(
      source,
      lowerControl,
      target,
      0,
      { x: 0, y: 0, z: 0 },
    )).toEqual(source);
    expect(graphEdgeCurvePointInto(
      source,
      lowerControl,
      target,
      1,
      { x: 0, y: 0, z: 0 },
    )).toEqual(target);
  });

  it('buildAdjacency never leaks a dangling (non-node) id into a neighbor set', () => {
    const ids = new Set(['a', 'b']);
    const adj = buildAdjacency(ids, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'ghost' },
    ]);
    expect([...adj.get('a')!]).toEqual(['b']);
    expect([...adj.get('b')!]).toEqual(['a']);
    expect(adj.has('ghost')).toBe(false);
  });

  it('flowParticleCount caps and never goes negative', () => {
    expect(flowParticleCount(3, 4, 4000)).toBe(12);
    expect(flowParticleCount(5000, 4, 4000)).toBe(4000);
    expect(flowParticleCount(-1, 4, 4000)).toBe(0);
    expect(flowParticleCount(0, 4, 4000)).toBe(0);
  });

  it('balances a capped flow-marker budget across every renderable relationship', () => {
    expect(planFlowParticleDistribution(0, 4, 4_000)).toEqual({
      total: 0,
      basePerEdge: 0,
      extraEdgeCount: 0,
    });
    expect(planFlowParticleDistribution(1_001, 4, 4_000)).toEqual({
      total: 4_000,
      basePerEdge: 3,
      extraEdgeCount: 997,
    });
    expect(planFlowParticleDistribution(4_000, 4, 4_000)).toEqual({
      total: 4_000,
      basePerEdge: 1,
      extraEdgeCount: 0,
    });
    expect(() => planFlowParticleDistribution(4_001, 4, 4_000)).toThrow(
      /at least one marker per edge/,
    );
  });

  it('bounds and normalizes free-text graph queries', () => {
    expect(normalizeGraphQuery('  PAPER  ')).toBe('paper');
    expect(normalizeGraphQuery('X'.repeat(MAX_GRAPH_QUERY_LENGTH + 100))).toHaveLength(
      MAX_GRAPH_QUERY_LENGTH,
    );
  });

  it('uses one query definition for id, label, and kind across visual and DOM surfaces', () => {
    const query = normalizeGraphQuery(' PAPER ');
    expect(matchesGraphQuery('node-1', 'Alpha', 'paper', query)).toBe(true);
    expect(matchesGraphQuery('node-1', 'Paper methods', 'model', query)).toBe(true);
    expect(matchesGraphQuery('paper-model-17', 'Alpha', 'model', query)).toBe(true);
    expect(matchesGraphQuery('node-1', 'Alpha', 'model', query)).toBe(false);

    // Preserve the original direct-consumer label/kind overload.
    expect(matchesGraphQuery('Paper methods', 'model', query)).toBe(true);
  });

  it('builds query-match ids and retains only incident edges for active queries', () => {
    const nodes = [
      { id: 'paper:brunel-2000', label: 'Balanced networks', kind: 'paper' },
      { id: 'model:iaf', label: 'Leaky integrate-and-fire', kind: 'model' },
      { id: 'family:hh', label: 'Hodgkin-Huxley', kind: 'family' },
    ];
    const query = normalizeGraphQuery('paper:brunel');
    const ids = graphQueryMatchIds(nodes, query);
    expect([...ids]).toEqual(['paper:brunel-2000']);
    expect(graphEdgeMatchesQuery('paper:brunel-2000', 'model:iaf', ids, query)).toBe(true);
    expect(graphEdgeMatchesQuery('model:iaf', 'family:hh', ids, query)).toBe(false);
    expect(graphEdgeMatchesQuery('model:iaf', 'family:hh', ids, '')).toBe(true);
  });

  it('matches evidence-grade node and edge metadata and reveals incident nodes', () => {
    const nodes = [
      {
        id: 'model:a',
        label: 'Model A',
        kind: 'model',
        detail: 'Balanced asynchronous regime',
        attributes: { simulator: 'NEST', resolution_ms: 0.1 },
      },
      { id: 'model:b', label: 'Model B', kind: 'model' },
      { id: 'model:c', label: 'Model C', kind: 'model' },
    ];
    const edges = [{
      id: 'assertion:42',
      source: 'model:a',
      target: 'model:b',
      kind: 'variant_of',
      label: 'Structural match',
      evidence: [{
        kind: 'external_source' as const,
        evidence_id: 'source:e42',
        source_id: 'catalog:engram',
      }],
    }];
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('asynchronous'), edges)])
      .toEqual(['model:a']);
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('NEST'), edges)])
      .toEqual(['model:a']);
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('Structural match'), edges)])
      .toEqual(['model:a', 'model:b']);
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('source:e42'), edges)])
      .toEqual(['model:a', 'model:b']);
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('assertion:42'), edges)])
      .toEqual(['model:a', 'model:b']);
  });

  it('fails closed on duplicate node ids through one shared assertion', () => {
    const duplicateNodes = [{ id: 'same' }, { id: 'same' }];
    expect(() => assertUniqueGraphNodeIds([{ id: 'a' }, { id: 'b' }])).not.toThrow();
    expect(() => assertUniqueGraphNodeIds(duplicateNodes)).toThrow(/duplicated at index 1/);

    const sceneNodes = duplicateNodes.map((node) => ({
      ...node,
      label: node.id,
      kind: 'paper',
      color: '#ffffff',
      radius: 4,
    }));
    const props = {
      graphIdentity: 'graph:test:snapshot:test',
      nodes: sceneNodes,
      edges: [],
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    // Both public React surfaces reject before ambiguous selection/edge binding.
    expect(() => renderToStaticMarkup(createElement(KnowledgeGraphA11yList, props))).toThrow(
      /duplicated at index 1/,
    );
    expect(() => renderToStaticMarkup(createElement(KnowledgeGraph3DScene, props))).toThrow(
      /duplicated at index 1/,
    );
  });

  it('rejects an absent or unbounded graph cache namespace before scene hooks run', () => {
    const props = {
      graphIdentity: '',
      nodes: [],
      edges: [],
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    expect(() => renderToStaticMarkup(createElement(KnowledgeGraph3DScene, props))).toThrow(
      /non-empty string <= 1024/,
    );
    expect(() => renderToStaticMarkup(createElement(KnowledgeGraphA11yList, props))).toThrow(
      /non-empty string <= 1024/,
    );
    expect(() => renderToStaticMarkup(createElement(KnowledgeGraph3DScene, {
      ...props,
      graphIdentity: 'g'.repeat(1_025),
    }))).toThrow(/non-empty string <= 1024/);
    expect(() => renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
      ...props,
      graphIdentity: 'g'.repeat(1_025),
    }))).toThrow(/non-empty string <= 1024/);
  });

  it('keys the scene-owned lifecycle boundary by the declared graph namespace', () => {
    const props = {
      graphIdentity: 'graph:one',
      nodes: [],
      edges: [],
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    const first = KnowledgeGraph3DScene(props);
    const same = KnowledgeGraph3DScene({ ...props });
    const other = KnowledgeGraph3DScene({ ...props, graphIdentity: 'graph:two' });
    expect(first.key).toBe('graph:one');
    expect(same.key).toBe(first.key);
    expect(other.key).toBe('graph:two');
    expect(other.type).toBe(first.type);

    const a11yFirst = KnowledgeGraphA11yList({
      graphIdentity: 'graph:one',
      nodes: [],
      edges: [],
      selectedId: null,
      onSelect: () => {},
    });
    const a11yOther = KnowledgeGraphA11yList({
      graphIdentity: 'graph:two',
      nodes: [],
      edges: [],
      selectedId: null,
      onSelect: () => {},
    });
    expect(a11yFirst.key).toBe('graph:one');
    expect(a11yOther.key).toBe('graph:two');
  });

  it('retains accessible paging for same-key views and resets it for a new namespace', async () => {
    const nodes = Array.from({ length: 201 }, (_, index) => ({
      id: `node:${index}`,
      label: `Node ${index}`,
      kind: 'model',
      color: '#ffffff',
      radius: 4,
    }));
    const props = {
      graphIdentity: 'graph:one',
      nodes,
      edges: [],
      selectedId: null,
      onSelect: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(KnowledgeGraphA11yList, props));
    });
    const next = () => renderer.root.findAllByType('button').find(
      (button) => button.children.join('') === 'Next nodes',
    )!;
    const nodePageText = () => renderer.root.findByProps({
      'aria-live': 'polite',
    }).children.join('');
    await act(async () => next().props.onClick());
    expect(nodePageText()).toContain('Node page 2 of 3');
    await act(async () => {
      renderer.update(createElement(KnowledgeGraphA11yList, { ...props }));
    });
    expect(nodePageText()).toContain('Node page 2 of 3');
    await act(async () => {
      renderer.update(createElement(KnowledgeGraphA11yList, {
        ...props,
        graphIdentity: 'graph:two',
      }));
    });
    expect(nodePageText()).toContain('Node page 1 of 3');
  });

  it('fails closed on unrenderable direct edges before either React surface runs hooks', () => {
    const nodes = [
      { id: 'a', label: 'A', kind: 'model', color: '#fff', radius: 4 },
      { id: 'b', label: 'B', kind: 'model', color: '#fff', radius: 4 },
    ];
    expect(() => assertRenderableGraphEdges(nodes, [
      { id: 'claim-1', source: 'a', target: 'b', kind: 'variant_of' },
      { id: 'claim-2', source: 'a', target: 'b', kind: 'variant_of' },
    ])).not.toThrow();
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'ghost', kind: 'variant_of' },
    ])).toThrow(/missing endpoint/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'a', kind: 'variant_of' },
    ])).toThrow(/self-loop/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'b', kind: 'same_as', directed: false },
      { source: 'b', target: 'a', kind: 'same_as', directed: false },
    ])).toThrow(/relationship is duplicated/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'b', kind: 'same_as' },
      { source: 'b', target: 'a', kind: 'same_as' },
    ])).not.toThrow();
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'b', kind: 'related', directed: false },
      { source: 'b', target: 'a', kind: 'related', directed: false },
    ])).toThrow(/relationship is duplicated/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { id: 'claim', source: 'a', target: 'b', kind: 'same_as' },
      { id: 'claim', source: 'b', target: 'a', kind: 'same_as' },
    ])).toThrow(/id is duplicated/);
    expect(() => assertRenderableGraphEdges(nodes, [
      {
        source: 'a',
        target: 'b',
        kind: 'related',
        directed: false,
        particles: true,
      },
    ])).toThrow(/undirected but carries directional particles/);

    const invalidEdges = [
      { source: 'a', target: 'ghost', kind: 'variant_of', color: '#fff' },
    ];
    const props = {
      graphIdentity: 'graph:test:snapshot:test',
      nodes,
      edges: invalidEdges,
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    expect(() => renderToStaticMarkup(createElement(KnowledgeGraphA11yList, props))).toThrow(
      /missing endpoint/,
    );
    expect(() => renderToStaticMarkup(createElement(KnowledgeGraph3DScene, props))).toThrow(
      /missing endpoint/,
    );
    const directionalMismatch = {
      ...props,
      edges: [{
        source: 'a',
        target: 'b',
        kind: 'related',
        color: '#fff',
        directed: false,
        particles: true,
      }],
    };
    expect(() =>
      renderToStaticMarkup(createElement(KnowledgeGraphA11yList, directionalMismatch)),
    ).toThrow(/undirected but carries directional particles/);
    expect(() =>
      renderToStaticMarkup(createElement(KnowledgeGraph3DScene, directionalMismatch)),
    ).toThrow(/undirected but carries directional particles/);
  });

  it('keeps a selected nonmatching node in the accessible query result', () => {
    const nodes = [
      { id: 'paper:a', label: 'Matching paper', kind: 'paper', color: '#fff', radius: 4 },
      { id: 'model:selected', label: 'Selected model', kind: 'model', color: '#fff', radius: 4 },
    ];
    const html = renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
      graphIdentity: 'graph:test',
      nodes,
      edges: [],
      selectedId: 'model:selected',
      query: 'no node matches this',
      onSelect: () => {},
    }));
    expect(html).toContain('Selected model');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('Matching paper');
    expect(html).not.toContain('No graph nodes match this view');
  });

  it('puts stable node ids in accessible descriptions when labels collide', () => {
    const html = renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
      graphIdentity: 'graph:test',
      nodes: [
        { id: 'model:a', label: 'Same label', kind: 'model', color: '#fff', radius: 4 },
        { id: 'model:b', label: 'Same label', kind: 'model', color: '#fff', radius: 4 },
      ],
      edges: [],
      selectedId: null,
      onSelect: () => {},
    }));
    expect(html.match(/aria-describedby=/g)).toHaveLength(2);
    expect(html.match(/>Same label<\/button>/g)).toHaveLength(2);
    expect(html).toContain('model. Node id model:a.');
    expect(html).toContain('model. Node id model:b.');
  });

  it('puts the other endpoint id in relationship prose when labels collide', () => {
    const html = renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
      graphIdentity: 'graph:test',
      nodes: [
        { id: 'hub', label: 'Hub', kind: 'model', color: '#fff', radius: 4 },
        { id: 'model:a', label: 'Same label', kind: 'model', color: '#fff', radius: 4 },
        { id: 'model:b', label: 'Same label', kind: 'model', color: '#fff', radius: 4 },
      ],
      edges: [
        { id: 'edge:a', source: 'hub', target: 'model:a', kind: 'variant_of', color: '#f08' },
        { id: 'edge:b', source: 'hub', target: 'model:b', kind: 'variant_of', color: '#f08' },
      ],
      selectedId: 'hub',
      onSelect: () => {},
    }));
    expect(html).toContain(
      'variant_of [edge:a]: points to Same label (node id model:a)',
    );
    expect(html).toContain(
      'variant_of [edge:b]: points to Same label (node id model:b)',
    );
  });

  it('keeps discarded layout plans deeply detached from persistent position authority', () => {
    const cached = Object.freeze([11, 12, 13] as const);
    const remembered = new Map<string, readonly [number, number, number]>([
      ['cached', cached],
      ['old:1', Object.freeze([1, 2, 3] as const)],
      ['old:2', Object.freeze([4, 5, 6] as const)],
      ['old:3', Object.freeze([7, 8, 9] as const)],
    ]);
    const before = [...remembered.entries()];
    const discarded = planGraphLayoutCache(
      [
        { id: 'cached', radius: 7 },
        { id: 'new', radius: Number.NaN },
      ],
      remembered,
      3,
    );

    expect(discarded.warmStart).toBe(true);
    expect(discarded.nodes[0]).toMatchObject({
      id: 'cached',
      r: 7,
      x: 11,
      y: 12,
      z: 13,
    });
    expect(discarded.nodes[1]).toEqual({
      id: 'new',
      r: normalizeGraphNodeRadius(Number.NaN),
    });
    expect(Object.hasOwn(discarded.nodes[1], 'x')).toBe(false);
    const firstBuffer = discarded.cacheBuffers[0];
    const secondBuffer = discarded.cacheBuffers[1];
    expect(firstBuffer.positionSlots[0]).toEqual(cached);
    expect(firstBuffer.positionSlots[0]).not.toBe(cached);
    expect(firstBuffer.positionSlots[0]).not.toBe(secondBuffer.positionSlots[0]);
    expect([...firstBuffer.cache.keys()]).toEqual(['old:3', 'cached', 'new']);
    expect([...secondBuffer.cache.keys()]).toEqual(['old:3', 'cached', 'new']);

    // Even hostile post-plan mutation cannot reach a remembered tuple. This is
    // the render-abort negative control: discarding the plan has no authority.
    discarded.nodes[0].x = 999;
    firstBuffer.positionSlots[0][0] = 999;
    firstBuffer.positionSlots[1][0] = 999;
    firstBuffer.cache.get('cached')![0] = 777;
    firstBuffer.cache.delete('old:3');
    expect([...remembered.entries()]).toEqual(before);
    expect(remembered.has('new')).toBe(false);
    expect(secondBuffer.cache.get('cached')).toEqual(cached);

    const retry = planGraphLayoutCache(
      [{ id: 'new', radius: 4 }],
      remembered,
      3,
    );
    const replay = planGraphLayoutCache(
      [{ id: 'new', radius: 4 }],
      remembered,
      3,
    );
    expect(retry.warmStart).toBe(false);
    expect(Object.hasOwn(retry.nodes[0], 'x')).toBe(false);
    expect(replay.nodes[0]).not.toBe(retry.nodes[0]);
    expect(replay.cacheBuffers[0].positionSlots[0])
      .not.toBe(retry.cacheBuffers[0].positionSlots[0]);

    const exactlyFull = new Map<string, readonly [number, number, number]>([
      ['inactive:1', [1, 1, 1]],
      ['inactive:2', [2, 2, 2]],
    ]);
    expect(planGraphLayoutCache(
      [{ id: 'new', radius: 4 }],
      exactlyFull,
      2,
    ).cacheBuffers[0].cache).toEqual(new Map([
      ['inactive:2', [2, 2, 2]],
      ['new', [0, 0, 0]],
    ]));
  });

  it('snapshots same-identity caller mutations before deriving the layout key', () => {
    const nodes = [{ id: 'a', radius: 4 }];
    const edges = [{
      id: 'edge:1',
      source: 'a',
      target: 'a',
      color: '#ffffff',
      kind: 'same_as',
      directed: false,
      particles: false,
    }];
    const first = snapshotGraphLayoutInputs(nodes, edges);
    nodes[0].id = 'b';
    nodes[0].radius = 8;
    edges[0].source = 'b';
    edges[0].target = 'b';
    edges[0].color = '#000000';
    const second = snapshotGraphLayoutInputs(nodes, edges);

    expect(second.graphKey).not.toBe(first.graphKey);
    expect(first.nodes).toEqual([{ id: 'a', radius: 4 }]);
    expect(first.edges[0]).toMatchObject({
      source: 'a',
      target: 'a',
      color: '#ffffff',
    });
    expect(second.nodes).toEqual([{ id: 'b', radius: 8 }]);
    expect(second.edges[0]).toMatchObject({
      source: 'b',
      target: 'b',
      color: '#000000',
    });
    expect(first.nodes[0]).not.toBe(second.nodes[0]);
    expect(first.edges[0]).not.toBe(second.edges[0]);
  });

  it('publishes a complete layout cache only after the frame transaction succeeds', () => {
    const original = new Map<string, [number, number, number]>([
      ['old', [1, 2, 3]],
    ]);
    const authority = { current: original };
    const plan = planGraphLayoutCache(
      [{ id: 'new', radius: 4 }],
      original,
      1,
    );
    const buffered = {
      cacheBuffers: plan.cacheBuffers,
      nextCacheBufferIndex: 0 as const,
    };
    const originalSlot = original.get('old');

    expect(() => {
      plan.cacheBuffers[0].positionSlots[0][0] = 42;
      throw new Error('simulated CPU matrix failure before publication');
    }).toThrow('simulated CPU matrix failure before publication');
    expect(authority.current).toBe(original);
    expect(authority.current).toEqual(new Map([['old', [1, 2, 3]]]));
    expect(authority.current.get('old')).toBe(originalSlot);
    expect(buffered.nextCacheBufferIndex).toBe(0);

    publishGraphLayoutCache(authority, buffered, 0);
    expect(authority.current).toBe(plan.cacheBuffers[0].cache);
    expect(authority.current).toEqual(new Map([['new', [42, 0, 0]]]));
    expect(buffered.nextCacheBufferIndex).toBe(1);

    // A later-frame failure mutates only the other, unpublished buffer. Neither
    // the published Map identity nor any tuple reachable from it can change.
    const firstPublished = authority.current;
    const firstPublishedSlot = authority.current.get('new');
    expect(() => {
      plan.cacheBuffers[1].positionSlots[0][0] = 84;
      throw new Error('simulated later CPU buffer failure before publication');
    }).toThrow('simulated later CPU buffer failure before publication');
    expect(authority.current).toBe(firstPublished);
    expect(authority.current.get('new')).toBe(firstPublishedSlot);
    expect(authority.current).toEqual(new Map([['new', [42, 0, 0]]]));

    publishGraphLayoutCache(authority, buffered, 1);
    expect(authority.current).toBe(plan.cacheBuffers[1].cache);
    expect(authority.current).toEqual(new Map([['new', [84, 0, 0]]]));
    expect(buffered.nextCacheBufferIndex).toBe(0);

    // A repeated or stale publication fails before replacing newer authority.
    const published = authority.current;
    expect(() => publishGraphLayoutCache(authority, buffered, 1))
      .toThrow('publication is out of sequence');
    expect(authority.current).toBe(published);
  });

  it('refuses an undersized cache or duplicate active ids before planning', () => {
    expect(() => planGraphLayoutCache(
      [{ id: 'a', radius: 4 }],
      new Map(),
      0,
    )).toThrow('at least as large as the active graph');
    expect(() => planGraphLayoutCache(
      [{ id: 'a', radius: 4 }, { id: 'a', radius: 4 }],
      new Map(),
      2,
    )).toThrow('node ids must be unique');
  });

  it('schedules a fixed 60-Hz layout clock at 30, 60, and 144 FPS', () => {
    const elapsedByRate: number[] = [];
    for (const refreshRate of [30, 60, 144]) {
      let elapsed = 0;
      let remainder = 0;
      let ticks = 0;
      while (ticks < 266) {
        const delta = 1 / refreshRate;
        const next = advanceGraphLayoutClock(remainder, delta);
        remainder = next.remainderSeconds;
        ticks += Math.min(next.ticks, 266 - ticks);
        elapsed += delta;
      }
      elapsedByRate.push(elapsed);
    }
    expect(Math.max(...elapsedByRate) - Math.min(...elapsedByRate)).toBeLessThan(1 / 30);
    expect(elapsedByRate[1]).toBeCloseTo(266 / 60, 1);
  });

  it('mutates and reuses the supplied layout-clock result object', () => {
    const out = { ticks: -1, remainderSeconds: -1 };
    const first = advanceGraphLayoutClockInto(0, 1 / 30, out);
    expect(first).toBe(out);
    expect(first).toEqual(advanceGraphLayoutClock(0, 1 / 30));
    const second = advanceGraphLayoutClockInto(first.remainderSeconds, 1 / 144, out);
    expect(second).toBe(out);
  });

  it('avoids redundant static-particle uploads under reduced motion', () => {
    const source = readFileSync(
      new URL('../react/KnowledgeGraph3DScene.tsx', import.meta.url),
      'utf8',
    );
    expect(source).toContain('(positionsChanged || !reducedMotion)');
    expect(source).toContain('advanceGraphLayoutClockInto(');
    expect(source).toContain('_layoutClockResult');
    expect(
      source.match(/validEdges\.length \* GRAPH_EDGE_CURVE_SEGMENTS \* 6/g),
    ).toHaveLength(2);
    // One definition plus the line, arrowhead, and particle call sites: all
    // three visual encodings must consume the same routed quadratic.
    expect(source.match(/setEdgeCurve\(/g)).toHaveLength(4);
    expect(source.match(/graphEdgeCurvePointInto\(/g)).toHaveLength(2);
    expect(source).toContain('uniqueGraphTopologyLinks(validEdges)');
    expect(GRAPH_EDGE_CURVE_SEGMENTS).toBe(4);
    // Lines, arrowheads, and flow particles must all consume the same pure edge
    // query predicate; otherwise a dimmed relationship can keep glowing/moving.
    expect(source.match(/graphEdgeMatchesQuery\(/g)).toHaveLength(3);
  });

  it('gives the relationship disclosure summary a touch-sized target', () => {
    const nodes = [
      { id: 'hub', label: 'Hub', kind: 'paper', color: '#fff', radius: 4 },
      ...Array.from({ length: 9 }, (_, index) => ({
        id: `paper:${index}`,
        label: `Paper ${index}`,
        kind: 'paper',
        color: '#fff',
        radius: 4,
      })),
    ];
    const edges = nodes.slice(1).map((node) => ({
      source: 'hub',
      target: node.id,
      kind: 'cites',
      color: '#fff',
      directed: true,
    }));
    const html = renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
      graphIdentity: 'graph:test',
      nodes,
      edges,
      selectedId: 'hub',
      onSelect: () => {},
    }));
    expect(html).toContain('<summary style="min-height:44px">');
    expect(html).toContain('Browse all 9 relationships');
  });

  it('never exposes an out-of-range relationship page when a live view shrinks', async () => {
    const nodes = [
      { id: 'hub', label: 'Hub', kind: 'paper', color: '#fff', radius: 4 },
      ...Array.from({ length: 30 }, (_, index) => ({
        id: `paper:${index}`,
        label: `Paper ${index}`,
        kind: 'paper',
        color: '#fff',
        radius: 4,
      })),
    ];
    const edges = nodes.slice(1).map((node, index) => ({
      id: `citation:${index}`,
      source: 'hub',
      target: node.id,
      kind: 'cites',
      color: '#fff',
      directed: true,
    }));
    const props = {
      graphIdentity: 'graph:test',
      nodes,
      edges,
      selectedId: 'hub',
      onSelect: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    let captureCommit = false;
    const committedTrees: string[] = [];
    const committedPageTexts: string[] = [];
    const pageText = () => renderer.root.findByProps({
      'aria-live': 'polite',
    }).children.join('');
    const tree = (nextEdges: typeof edges) => createElement(
      Profiler,
      {
        id: 'relationship-pager',
        onRender: () => {
          if (captureCommit && renderer) {
            committedTrees.push(JSON.stringify(renderer.toJSON()));
            committedPageTexts.push(pageText());
          }
        },
      },
      createElement(KnowledgeGraphA11yList, { ...props, edges: nextEdges }),
    );
    await act(async () => {
      renderer = create(tree(edges));
    });
    const next = renderer.root.findAllByType('button').find(
      (button) => button.children.join('') === 'Next relationships',
    )!;
    await act(async () => next.props.onClick());
    expect(pageText()).toBe('Page 2 of 2');
    await act(async () => {
      renderer.update(tree(edges.map((edge) => ({ ...edge }))));
    });
    expect(pageText()).toBe('Page 2 of 2');
    captureCommit = true;
    await act(async () => {
      renderer.update(tree(edges.slice(0, 2)));
    });
    captureCommit = false;
    expect(committedTrees.length).toBeGreaterThan(0);
    // Profiler fires after the commit but before passive effects. The first tree
    // therefore proves render-time clamping rather than the post-commit state clamp.
    expect(committedPageTexts[0]).toBe('Page 1 of 1');
    expect(committedTrees[0]).toContain('citation:0');
    expect(committedTrees[0]).toContain('citation:1');
    expect(pageText()).toBe('Page 1 of 1');
    expect(JSON.stringify(renderer.toJSON())).toContain('citation:0');
    expect(JSON.stringify(renderer.toJSON())).toContain('citation:1');
    await act(async () => {
      renderer.update(tree(edges));
    });
    expect(pageText()).toBe('Page 1 of 2');
    await act(async () => renderer.unmount());
  });

  it('refreshes accessible relationships and legend groups after same-array mutation', async () => {
    const nodes = [
      { id: 'a', label: 'Model A', kind: 'model', color: '#ffffff', radius: 4 },
      { id: 'b', label: 'Model B', kind: 'model', color: '#ffffff', radius: 4 },
      { id: 'c', label: 'Model C', kind: 'model', color: '#ffffff', radius: 4 },
    ];
    const edges = [{
      id: 'claim:1',
      source: 'a',
      target: 'b',
      kind: 'cites',
      color: '#00ffff',
      directed: true,
    }];
    const a11yProps = {
      graphIdentity: 'graph:mutable',
      nodes,
      edges,
      selectedId: 'a',
      onSelect: () => {},
    };
    let a11y!: ReturnType<typeof create>;
    let legend!: ReturnType<typeof create>;
    await act(async () => {
      a11y = create(createElement(KnowledgeGraphA11yList, a11yProps));
      legend = create(createElement(KnowledgeGraphLegend, { nodes, edges }));
    });
    expect(testRendererText(a11y.toJSON())).toContain('points to Model B');
    expect(testRendererText(legend.toJSON())).toContain('cites: 1 relationship; directed');

    // Reuse both arrays and records, as an untyped mutable host might.
    edges[0].target = 'c';
    edges[0].kind = 'variant_of';
    edges[0].directed = false;
    nodes[0].kind = 'family';
    nodes[0].color = '#ff00ff';
    await act(async () => {
      a11y.update(createElement(KnowledgeGraphA11yList, a11yProps));
      legend.update(createElement(KnowledgeGraphLegend, { nodes, edges }));
    });

    const accessibleText = testRendererText(a11y.toJSON());
    const legendText = testRendererText(legend.toJSON());
    expect(accessibleText).toContain('connected to Model C');
    expect(accessibleText).not.toContain('points to Model B');
    expect(legendText).toContain('family: 1 node; color #ff00ff');
    expect(legendText).toContain('variant_of: 1 relationship; undirected');
    expect(legendText).not.toContain('cites: 1 relationship; directed');
    await act(async () => {
      a11y.unmount();
      legend.unmount();
    });
  });

  it('keeps expanded metadata bound to its exact assertion across edge reorder', async () => {
    const nodes = [
      { id: 'a', label: 'Model A', kind: 'model', color: '#fff', radius: 4 },
      { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
      { id: 'c', label: 'Model C', kind: 'model', color: '#fff', radius: 4 },
    ];
    const oldLegacyFallback = JSON.stringify(['a', 'c', 'variant_of', false]);
    const evidence = (id: string, excerpt: string) => [{
      kind: 'external_source' as const,
      evidence_id: `evidence:${id}`,
      source_id: `source:${id}`,
      excerpt,
    }];
    const identified = {
      id: oldLegacyFallback,
      source: 'a',
      target: 'b',
      kind: 'cites',
      label: 'Identified assertion',
      color: '#fff',
      directed: true,
      evidence: evidence('identified', 'IDENTIFIED FULL EXCERPT'),
    };
    const legacy = {
      source: 'a',
      target: 'c',
      kind: 'variant_of',
      label: 'Legacy assertion',
      color: '#fff',
      directed: false,
      evidence: evidence('legacy', 'LEGACY FULL EXCERPT'),
    };
    // This exact text collided under the old untagged React-key fallback.
    expect(identified.id).toBe(oldLegacyFallback);
    expect(graphEdgeIdentityKey(identified)).not.toBe(graphEdgeIdentityKey(legacy));
    expect(graphEdgeIdentityKey(legacy)).toBe(graphEdgeIdentityKey({
      ...legacy,
      source: legacy.target,
      target: legacy.source,
    }));

    const edges = [identified, legacy];
    const props = {
      graphIdentity: 'graph:assertion-key',
      nodes,
      edges,
      selectedId: 'a',
      onSelect: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(KnowledgeGraphA11yList, props));
    });
    const findMetadata = (needle: string) => renderer.root
      .findAllByType('details')
      .find((details) => details.findAllByType('summary', { deep: false })[0]
        ?.children.join('').includes(needle));
    await act(async () => {
      findMetadata('Identified assertion')!.props.onToggle({
        currentTarget: { open: true },
      });
    });
    expect(testRendererText(findMetadata('Identified assertion')!.children))
      .toContain('IDENTIFIED FULL EXCERPT');
    expect(testRendererText(findMetadata('Legacy assertion relationship')!.children))
      .not.toContain('LEGACY FULL EXCERPT');

    edges.reverse();
    await act(async () => {
      renderer.update(createElement(KnowledgeGraphA11yList, props));
    });
    expect(testRendererText(findMetadata('Identified assertion')!.children))
      .toContain('IDENTIFIED FULL EXCERPT');
    expect(testRendererText(findMetadata('Legacy assertion relationship')!.children))
      .not.toContain('LEGACY FULL EXCERPT');
    await act(async () => renderer.unmount());
  });

  it('exposes every identified parallel assertion in accessible relationship detail', () => {
    const nodes = [
      { id: 'a', label: 'Model A', kind: 'model', color: '#fff', radius: 4 },
      { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
    ];
    const html = renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
      graphIdentity: 'graph:test',
      nodes,
      edges: [
        {
          id: 'identity-claim',
          source: 'a',
          target: 'b',
          kind: 'same_as',
          color: '#f80',
          directed: false,
        },
        {
          id: 'variant-claim',
          source: 'a',
          target: 'b',
          kind: 'variant_of',
          color: '#f08',
          directed: true,
        },
      ],
      selectedId: 'a',
      onSelect: () => {},
    }));
    expect(html).toContain('same_as [identity-claim]: connected to Model B');
    expect(html).toContain('variant_of [variant-claim]: points to Model B');
  });

  it('exposes a bounded evidence, epistemic, attribute, and score summary', () => {
    const epistemic = {
      status: 'derived_advisory',
      advisory_only: true,
      is_paper_local_evidence: false,
      calibrated_posterior: false,
    } as const;
    const html = renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
      graphIdentity: 'graph:test',
      nodes: [
        {
          id: 'a',
          label: 'Model A',
          kind: 'model',
          detail: 'Balanced asynchronous regime',
          attributes: { simulator: 'NEST' },
          epistemic,
          evidence: [{
            kind: 'external_source' as const,
            evidence_id: 'node-source',
            source_id: 'catalog:node',
          }],
          uncalibrated_score: {
            kind: 'retrieval_relevance' as const,
            value: 0.91,
            calibrated_posterior: false as const,
          },
          color: '#fff',
          radius: 4,
        },
        { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
      ],
      edges: [{
        id: 'claim-42',
        source: 'a',
        target: 'b',
        kind: 'variant_of',
        label: 'Structural match',
        attributes: { resolver: 'entity-linker' },
        epistemic,
        evidence: [{
          kind: 'external_source' as const,
          evidence_id: 'edge-source',
          source_id: 'catalog:edge',
        }],
        uncalibrated_score: {
          kind: 'structural_similarity' as const,
          value: 0.8,
          calibrated_posterior: false as const,
        },
        color: '#f08',
        directed: true,
      }],
      selectedId: 'a',
      onSelect: () => {},
    }));
    expect(html).toContain('Detail: Balanced asynchronous regime');
    expect(html).toContain(
      'Visual radius: 4; radius meaning: Caller-defined visual size; not quantitative evidence.',
    );
    expect(html).toContain('Attributes: simulator=NEST');
    expect(html).toContain('Epistemic: derived_advisory; advisory only; not paper-local evidence; uncalibrated');
    expect(html).toContain('Evidence (1): external_source node-source');
    expect(html).toContain('Uncalibrated score: retrieval_relevance 0.91');
    expect(html).toContain('Structural match (variant_of) [claim-42]: points to Model B');
    expect(html).toContain('Evidence (1): external_source edge-source');
    expect(html).toContain('Uncalibrated score: structural_similarity 0.8');
  });

  it('provides an on-demand path to the last node and edge metadata value', async () => {
    type EvidenceRef = NonNullable<KnowledgeGraph3DNode['evidence']>[number];
    const epistemic = {
      status: 'derived_advisory',
      advisory_only: true,
      is_paper_local_evidence: false,
      calibrated_posterior: false,
    } as const;
    const nodeAttributes = Object.fromEntries(
      Array.from({ length: 24 }, (_, index) => [
        `node_attribute_${index}`,
        index === 23 ? ['first scalar', 'last node attribute scalar'] : index,
      ]),
    );
    const edgeAttributes = Object.fromEntries(
      Array.from({ length: 24 }, (_, index) => [
        `edge_attribute_${index}`,
        index === 23 ? 'last edge attribute value' : index,
      ]),
    );
    const evidence = (prefix: string, lastExcerpt: string): EvidenceRef[] =>
      Array.from({ length: 8 }, (_, index): EvidenceRef => ({
        kind: 'external_source',
        evidence_id: `${prefix}-evidence-${index}`,
        source_id: `${prefix}-source-${index}`,
        excerpt: index === 7 ? lastExcerpt : `Excerpt ${index}`,
      }));
    const nodes = [
      {
        id: 'a',
        label: 'Model A',
        kind: 'model',
        attributes: nodeAttributes,
        epistemic,
        evidence: evidence('node', 'last node evidence excerpt'),
        color: '#fff',
        radius: 4,
      },
      { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
    ];
    const edges = [{
      id: 'claim-last',
      source: 'a',
      target: 'b',
      kind: 'variant_of',
      label: 'Variant assertion',
      attributes: edgeAttributes,
      epistemic,
      evidence: evidence('edge', 'last edge evidence excerpt'),
      color: '#f08',
      directed: true,
    }];
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(KnowledgeGraphA11yList, {
        graphIdentity: 'graph:test',
        nodes,
        edges,
        selectedId: 'a',
        onSelect: () => {},
      }));
    });
    expect(JSON.stringify(renderer.toJSON())).not.toContain('last node attribute scalar');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('last edge evidence excerpt');

    const disclosures = renderer.root.findAllByType('details');
    const findDisclosure = (text: string) => disclosures.find((details) => {
      const summary = details.findAllByType('summary', { deep: false })[0];
      return summary?.children.join('').includes(text);
    });
    const nodeDisclosure = findDisclosure('Browse full metadata for node Model A');
    const edgeDisclosure = findDisclosure(
      'Browse full metadata for relationship Variant assertion [claim-last]',
    );
    expect(nodeDisclosure).toBeDefined();
    expect(edgeDisclosure).toBeDefined();
    await act(async () => {
      nodeDisclosure!.props.onToggle({ currentTarget: { open: true } });
      edgeDisclosure!.props.onToggle({ currentTarget: { open: true } });
    });
    const expanded = JSON.stringify(renderer.toJSON());
    expect(expanded).toContain('Visual radius: ');
    expect(expanded).toContain('Caller-defined visual size; not quantitative evidence.');
    expect(expanded).toContain('node_attribute_23');
    expect(expanded).toContain('last node attribute scalar');
    expect(expanded).toContain('last node evidence excerpt');
    expect(expanded).toContain('edge_attribute_23');
    expect(expanded).toContain('last edge attribute value');
    expect(expanded).toContain('last edge evidence excerpt');
    await act(async () => renderer.unmount());
  });

  it('renders a complete text-redundant legend for every present graph kind', () => {
    const nodes = [
      { id: 'p1', label: 'Paper 1', kind: 'paper', color: '#00ffff', radius: 4 },
      { id: 'p2', label: 'Paper 2', kind: 'paper', color: '#00ffff', radius: 6 },
      { id: 'm1', label: 'Model 1', kind: 'model', color: '#ffaa00', radius: 4 },
      { id: 'm2', label: 'Model 2', kind: 'model', color: '#ffaa00', radius: 4 },
      { id: 'f1', label: 'Family', kind: 'family', color: '#aa55ff', radius: 4 },
    ];
    const edges = [
      { id: 'e1', source: 'p1', target: 'p2', kind: 'cites', color: '#11ff11', directed: true, particles: true },
      { id: 'e2', source: 'p1', target: 'm1', kind: 'instantiates', color: '#00aaaa', directed: true },
      { id: 'e3', source: 'm1', target: 'f1', kind: 'belongs_to_family', color: '#888888', directed: true },
      { id: 'e4', source: 'm1', target: 'm2', kind: 'same_as', color: '#ff8800', directed: false },
      { id: 'e5', source: 'm2', target: 'm1', kind: 'variant_of', color: '#ff0088', directed: true },
    ];
    const html = renderToStaticMarkup(createElement(KnowledgeGraphLegend, {
      nodes,
      edges,
      context: {
        graph_id: 'graph:legend',
        graph_source: 'engram:corpus',
        graph_snapshot_id: 'sha256:legend-snapshot',
        graph_scope: 'corpus_entity',
        generated_at: '2026-07-11T00:00:00Z',
      },
    }));
    expect(html).toContain('<dt>Graph id</dt><dd>graph:legend</dd>');
    expect(html).toContain('<dt>Graph source</dt><dd>engram:corpus</dd>');
    expect(html).toContain(
      '<dt>Graph snapshot id</dt><dd>sha256:legend-snapshot</dd>',
    );
    expect(html).toContain('<dt>Graph scope</dt><dd>corpus_entity</dd>');
    expect(html).toContain(
      '<dt>Generated at</dt><dd>2026-07-11T00:00:00Z</dd>',
    );
    expect(html).toContain('paper: 2 nodes; color #00ffff');
    expect(html).toContain(
      'visual radius 4–6; Caller-defined visual size; not quantitative evidence.',
    );
    expect(html).toContain('model: 2 nodes; color #ffaa00');
    expect(html).toContain('family: 1 node; color #aa55ff');
    for (const kind of [
      'cites',
      'instantiates',
      'belongs_to_family',
      'same_as',
      'variant_of',
    ]) {
      expect(html).toContain(`${kind}: 1 relationship;`);
    }
    expect(html).toContain('same_as: 1 relationship; undirected; color #ff8800');
    expect(html).toContain('cites: 1 relationship; directed; color #11ff11; flow markers');
    expect(html).toContain(
      'Layout positions and distances are schematic, not quantitative evidence.',
    );
  });

  it('keeps direct-scene radii in the finite renderer range', () => {
    expect(normalizeGraphNodeRadius(5)).toBe(5);
    expect(normalizeGraphNodeRadius(Number.MAX_VALUE)).toBe(4);
    expect(normalizeGraphNodeRadius(1_000)).toBe(4);
    expect(normalizeGraphNodeRadius(NaN)).toBe(4);
    expect(normalizeGraphNodeRadius(0)).toBe(4);
  });

  it('keeps direct React entrypoints within the same browser graph budget as params', () => {
    expect(MAX_KNOWLEDGE_GRAPH_SCENE_NODES).toBe(PARAM_LIMITS.maxGraphNodes);
    expect(MAX_KNOWLEDGE_GRAPH_SCENE_EDGES).toBe(PARAM_LIMITS.maxGraphEdges);
    expect(MAX_GRAPH_PARALLEL_EDGES).toBe(
      KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair,
    );
    expect(() => assertKnowledgeGraphBudget(1_000, 4_000)).not.toThrow();
    expect(() => assertKnowledgeGraphBudget(1_001, 0)).toThrow(RangeError);
    expect(() => assertKnowledgeGraphBudget(0, 4_001)).toThrow(RangeError);
    expect(reducedMotionLayoutTickBudget(1_000, 4_000)).toBe(2);
    expect(reducedMotionLayoutTickBudget(100, 400)).toBe(8);
  });

  it('rejects oversized direct graphs before reading or snapshotting any record', () => {
    let recordReads = 0;
    const poisonousNode = Object.defineProperties({}, {
      id: { enumerable: true, get: () => { recordReads += 1; throw new Error('read id'); } },
      label: { enumerable: true, get: () => { recordReads += 1; throw new Error('read label'); } },
    }) as KnowledgeGraph3DNode;
    const nodes = new Array<KnowledgeGraph3DNode>(
      MAX_KNOWLEDGE_GRAPH_SCENE_NODES + 1,
    ).fill(poisonousNode);
    const sceneProps = {
      graphIdentity: 'graph:oversized',
      nodes,
      edges: [],
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };

    expect(() => KnowledgeGraph3DScene(sceneProps)).toThrow(RangeError);
    expect(() => KnowledgeGraphA11yList(sceneProps)).toThrow(RangeError);
    expect(() => KnowledgeGraphLegend({ nodes, edges: [] })).toThrow(RangeError);
    expect(recordReads).toBe(0);
  });

  it('uses a frame-rate-independent fixed-target damping coefficient and snaps for reduced motion', () => {
    const oneFrame = graphCameraTargetDamping(1 / 30, false);
    const twoFrames = 1 - (1 - graphCameraTargetDamping(1 / 60, false)) ** 2;
    expect(oneFrame).toBeCloseTo(twoFrames, 14);
    expect(graphCameraTargetDamping(Number.MIN_VALUE, false)).toBeGreaterThan(0);
    expect(graphCameraTargetDamping(0, false)).toBe(0);
    expect(graphCameraTargetDamping(-1, false)).toBe(0);
    expect(graphCameraTargetDamping(Number.NaN, false)).toBe(0);
    expect(graphCameraTargetDamping(Number.POSITIVE_INFINITY, false)).toBe(0);
    expect(graphCameraTargetDamping(Number.NaN, true)).toBe(1);
  });
});

describe('graphSignature (content key that stops needless sim restarts)', () => {
  const graph = () => ({
    nodes: [
      { id: 'a', radius: 4 },
      { id: 'b', radius: 6 },
    ],
    edges: [{ source: 'a', target: 'b', color: '#fff', kind: 'cites', particles: true }],
  });

  it('is identity-insensitive: content-equal arrays produce the same key', () => {
    const g1 = graph();
    const g2 = graph(); // fresh object/array identities, same content
    expect(graphSignature(g1.nodes, g1.edges)).toBe(graphSignature(g2.nodes, g2.edges));
  });

  it('changes on structure, radius, edge styling, and ORDER', () => {
    const base = graphSignature(graph().nodes, graph().edges);
    const radius = graph();
    radius.nodes[0].radius = 5;
    const edgeColor = graph();
    edgeColor.edges[0].color = '#000';
    const particles = graph();
    particles.edges[0].particles = false;
    const order = graph();
    order.nodes.reverse(); // node order IS instance order — must invalidate
    for (const g of [radius, edgeColor, particles, order]) {
      expect(graphSignature(g.nodes, g.edges)).not.toBe(base);
    }
  });

  it('distinguishes the default directed edge from an explicitly undirected edge', () => {
    expect(
      graphSignature([], [{ source: 'a', target: 'b' }]),
    ).not.toBe(
      graphSignature([], [{ source: 'a', target: 'b', directed: false }]),
    );
  });

  it('changes when a stable edge assertion id changes', () => {
    const edge = { id: 'claim-a', source: 'a', target: 'b', kind: 'variant_of' };
    expect(graphSignature([], [edge])).not.toBe(
      graphSignature([], [{ ...edge, id: 'claim-b' }]),
    );
  });

  it('distinguishes absent optional strings from explicit empty strings', () => {
    const base = { source: 'a', target: 'b' };
    for (const field of ['id', 'color', 'kind'] as const) {
      expect(graphSignature([], [base])).not.toBe(
        graphSignature([], [{ ...base, [field]: '' }]),
      );
    }
  });

  it('ignores node color/label — those restyle live without a layout restart', () => {
    const styled = (color: string, label: string) =>
      graph().nodes.map((n) => ({ ...n, color, label }));
    expect(graphSignature(styled('#fff', 'x'), graph().edges)).toBe(
      graphSignature(styled('#000', 'y'), graph().edges),
    );
  });

  it('is separator-safe: adjacent fields cannot collide', () => {
    expect(graphSignature([{ id: 'ab' }, { id: 'c' }], [])).not.toBe(
      graphSignature([{ id: 'a' }, { id: 'bc' }], []),
    );
  });

  it('cannot collide when caller strings contain the old control separators', () => {
    expect(graphSignature([{ id: 'a' }, { id: 'b' }], [])).not.toBe(
      graphSignature([{ id: 'a\u0001\u0001b' }], []),
    );
    expect(
      graphSignature([], [
        { source: 'a\u0001b', target: 'c', kind: 'cites' },
      ]),
    ).not.toBe(
      graphSignature([], [
        { source: 'a', target: 'b\u0001c', kind: 'cites' },
      ]),
    );
  });
});

describe('mapCorpusKnowledgeGraph (agent params → scene props)', () => {
  const epistemic = {
    status: 'derived_advisory',
    advisory_only: true,
    is_paper_local_evidence: false,
    calibrated_posterior: false,
  } as const;
  const node = (
    id: string,
    kind: KnowledgeGraph3DParams['nodes'][number]['kind'],
    label: string,
  ): KnowledgeGraph3DParams['nodes'][number] => ({
    id,
    kind,
    label,
    attributes: {},
    epistemic,
    evidence: [{ kind: 'graph_node', evidence_id: `evidence:${id}`, node_id: id }],
  });
  const edge = (
    id: string,
    source: string,
    target: string,
    kind: KnowledgeGraph3DParams['edges'][number]['kind'],
  ): KnowledgeGraph3DParams['edges'][number] => ({
    id,
    source,
    target,
    kind,
    label: kind,
    attributes: {},
    epistemic,
    evidence: [{
      kind: 'graph_snapshot_record',
      evidence_id: `evidence:${id}`,
      record_id: id,
    }],
  });
  const params: KnowledgeGraph3DParams = {
    graph_id: 'graph:test',
    graph_source: 'test-corpus',
    graph_snapshot_id: 'snapshot:test',
    graph_scope: 'corpus_entity',
    generated_at: '2026-07-11T00:00:00Z',
    nodes: [
      {
        ...node('p1', 'paper', 'Brunel 2000'),
        detail: 'Balanced asynchronous regime',
        attributes: { simulator: 'NEST', resolution_ms: 0.1 },
        uncalibrated_score: {
          kind: 'retrieval_relevance',
          value: 0.91,
          calibrated_posterior: false,
        },
      },
      node('p2', 'paper', 'Cited-by-all'),
      node('m1', 'model', 'iaf_psc_delta'),
      node('m2', 'model', 'iaf_psc_alpha'),
      node('f1', 'family', 'LIF family'),
    ],
    edges: [
      {
        ...edge('edge:cites', 'p1', 'p2', 'cites'),
        label: 'Cites source paper',
        attributes: { resolver: 'doi' },
        uncalibrated_score: {
          kind: 'citation_resolution_confidence',
          value: 0.88,
          calibrated_posterior: false,
        },
      },
      edge('edge:instantiates', 'p1', 'm1', 'instantiates'),
      edge('edge:family', 'm1', 'f1', 'belongs_to_family'),
      edge('edge:identity', 'm1', 'm2', 'same_as'),
    ],
  };

  it('derives a collision-free cache boundary from the complete graph context', () => {
    const context = {
      graph_id: params.graph_id,
      graph_source: params.graph_source,
      graph_snapshot_id: params.graph_snapshot_id,
      graph_scope: params.graph_scope,
      generated_at: params.generated_at,
    };
    const identity = corpusGraphInstanceIdentity(context);
    expect(identity).toBe(corpusGraphInstanceIdentity({ ...context }));
    for (const field of Object.keys(context) as Array<keyof typeof context>) {
      expect(corpusGraphInstanceIdentity({
        ...context,
        [field]: `${context[field]}:other`,
      })).not.toBe(identity);
    }
    expect(corpusGraphInstanceIdentity({
      ...context,
      graph_id: 'ab',
      graph_source: 'c',
    })).not.toBe(corpusGraphInstanceIdentity({
      ...context,
      graph_id: 'a',
      graph_source: 'bc',
    }));
  });

  it('colors nodes by kind and gives every node a positive finite radius', () => {
    const { nodes } = mapCorpusKnowledgeGraph(params, P);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const colors = defaultNodeColors(P);
    expect(byId.p1.color).toBe(colors.paper);
    expect(byId.m1.color).toBe(colors.model);
    expect(byId.f1.color).toBe(colors.family);
    for (const n of nodes) {
      expect(Number.isFinite(n.radius)).toBe(true);
      expect(n.radius).toBeGreaterThan(0);
      expect(n.radiusMeaning).toBe(CORPUS_GRAPH_RADIUS_MEANING);
    }
  });

  it('preserves every accepted assertion and refuses invalid ones instead of dropping them', () => {
    const { edges } = mapCorpusKnowledgeGraph(params, P);
    expect(edges).toHaveLength(4);
    expect(() => mapCorpusKnowledgeGraph({
      ...params,
      edges: [...params.edges, edge('edge:self', 'p2', 'p2', 'cites')],
    }, P)).toThrow(/self-loop/);
    expect(() => mapCorpusKnowledgeGraph({
      ...params,
      edges: [...params.edges, edge('edge:dangling', 'p1', 'ghost', 'cites')],
    }, P)).toThrow(/missing endpoint/);
    expect(() => mapCorpusKnowledgeGraph({
      ...params,
      edges: [...params.edges, edge('edge:cites', 'p1', 'm1', 'cites')],
    }, P)).toThrow(/id is duplicated/);
  });

  it('only cites edges flow particles; same_as is undirected', () => {
    const { edges } = mapCorpusKnowledgeGraph(params, P);
    const cites = edges.find((e) => e.kind === 'cites')!;
    const sameAs = edges.find((e) => e.kind === 'same_as')!;
    expect(cites.particles).toBe(true);
    expect(cites.directed).toBe(true);
    expect(sameAs.particles).toBe(false);
    expect(sameAs.directed).toBe(false);
  });

  it('allows color overrides without delegating direction or flow semantics', () => {
    const { edges } = mapCorpusKnowledgeGraph(params, P, {
      edgeColors: { cites: '#123456', same_as: '#654321' },
    });
    const cites = edges.find((edge) => edge.kind === 'cites')!;
    const sameAs = edges.find((edge) => edge.kind === 'same_as')!;
    expect(cites).toMatchObject({
      color: '#123456',
      directed: true,
      particles: true,
    });
    expect(sameAs).toMatchObject({
      color: '#654321',
      directed: false,
      particles: false,
    });
  });

  it('strictly validates and canonicalizes mapper color overrides', () => {
    const mapped = mapCorpusKnowledgeGraph(params, P, {
      nodeColors: { paper: '#ABCDEF' },
      edgeColors: { cites: '#FEDCBA' },
    });
    expect(mapped.nodes.find((node) => node.kind === 'paper')?.color).toBe('#abcdef');
    expect(mapped.edges.find((edge) => edge.kind === 'cites')?.color).toBe('#fedcba');
    for (const overrides of [
      { nodeColors: { paper: '#fff' } },
      { edgeColors: { cites: 'red' } },
      { nodeColors: { unknown: '#123456' } },
      { unknownOption: true },
    ]) {
      expect(() => mapCorpusKnowledgeGraph(
        params,
        P,
        overrides as never,
      )).toThrow();
    }
  });

  it('preserves stable assertion ids through the agent-params mapper', () => {
    expect(mapCorpusKnowledgeGraph(params, P).edges.map(({ id }) => id)).toEqual([
      'edge:cites',
      'edge:instantiates',
      'edge:family',
      'edge:identity',
    ]);
  });

  it('preserves bounded evidence metadata through the agent-params mapper', () => {
    const mapped = mapCorpusKnowledgeGraph(params, P);
    expect(mapped.context).toEqual({
      graph_id: params.graph_id,
      graph_source: params.graph_source,
      graph_snapshot_id: params.graph_snapshot_id,
      graph_scope: params.graph_scope,
      generated_at: params.generated_at,
    });
    expect(mapped.graphIdentity).toBe(corpusGraphInstanceIdentity(mapped.context));
    expect(mapped.nodes[0]).toMatchObject({
      detail: 'Balanced asynchronous regime',
      attributes: { simulator: 'NEST', resolution_ms: 0.1 },
      epistemic,
      evidence: params.nodes[0].evidence,
      uncalibrated_score: params.nodes[0].uncalibrated_score,
    });
    expect(mapped.edges[0]).toMatchObject({
      id: 'edge:cites',
      label: 'Cites source paper',
      attributes: { resolver: 'doi' },
      epistemic,
      evidence: params.edges[0].evidence,
      uncalibrated_score: params.edges[0].uncalibrated_score,
    });
    expect([
      ...graphQueryMatchIds(
        mapped.nodes,
        normalizeGraphQuery('complete mapped snapshot'),
        mapped.edges,
      ),
    ]).toEqual(mapped.nodes.map(({ id }) => id));
  });

  it('scales radius with degree (a hub is larger than a leaf)', () => {
    const { nodes } = mapCorpusKnowledgeGraph(params, P);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    // p1 has complete-snapshot degree 2 (p2, m1); f1 has degree 1.
    expect(byId.p1.radius).toBeGreaterThan(byId.f1.radius);
  });

  it('binds radius prose to the exact bounded mapping options', () => {
    for (const options of [
      { degreeScale: 0 },
      { maxRadiusBump: 0 },
    ]) {
      const mapped = mapCorpusKnowledgeGraph(params, P, options);
      expect(new Set(mapped.nodes.map(({ radius }) => radius))).toEqual(new Set([4]));
      expect(new Set(mapped.nodes.map(({ radiusMeaning }) => radiusMeaning))).toEqual(
        new Set([corpusGraphRadiusMeaning(4, options.degreeScale ?? 1.4,
          options.maxRadiusBump ?? 8)]),
      );
      expect(mapped.nodes[0].radiusMeaning).toContain('relationship degree is not encoded');
    }

    const bounded = mapCorpusKnowledgeGraph(params, P, {
      baseRadius: 63,
      degreeScale: Number.MAX_VALUE,
      maxRadiusBump: 1,
    });
    expect(bounded.nodes.every(({ radius }) =>
      Number.isFinite(radius) && radius > 0 && radius <= MAX_GRAPH_NODE_RADIUS,
    )).toBe(true);
    expect(bounded.nodes[0].radiusMeaning).toBe(
      corpusGraphRadiusMeaning(63, Number.MAX_VALUE, 1),
    );
  });

  it('rejects mapper radius options that can exceed the renderer domain', () => {
    for (const options of [
      { baseRadius: Number.MAX_VALUE },
      { baseRadius: 60, maxRadiusBump: 8 },
      { maxRadiusBump: Number.MAX_VALUE },
      { baseRadius: Number.NaN },
      { degreeScale: Number.POSITIVE_INFINITY },
      { degreeScale: -0 },
      { maxRadiusBump: -1 },
    ]) {
      expect(() => mapCorpusKnowledgeGraph(params, P, options)).toThrow();
    }
  });

  it('handles a valid graph with no relationships', () => {
    const r = mapCorpusKnowledgeGraph({
      ...params,
      nodes: [node('isolated', 'model', 'Isolated model')],
      edges: [],
    }, P);
    expect(r.nodes).toHaveLength(1);
    expect(r.edges).toEqual([]);
  });
});
