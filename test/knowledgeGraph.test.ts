import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CORTEXEL_PALETTE } from '../core/colormaps';
import {
  buildAdjacency,
  advanceGraphLayoutClock,
  assertKnowledgeGraphBudget,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  graphSignature,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_KNOWLEDGE_GRAPH_SCENE_EDGES,
  MAX_KNOWLEDGE_GRAPH_SCENE_NODES,
  normalizeGraphQuery,
  normalizeGraphNodeRadius,
  matchesGraphQuery,
  reducedMotionLayoutTickBudget,
  mapCorpusKnowledgeGraph,
} from '../react/knowledgeGraph';
import type { KnowledgeGraph3DParams } from '../core/skills/params';
import { PARAM_LIMITS } from '../core/skills/params';

// react/knowledgeGraph.ts is THREE-free/React-free (only `import type` from the
// scene), so its logic is unit-testable in Node without mounting the GPU scene.
const P = CORTEXEL_PALETTE;

describe('graph helpers', () => {
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

  it('deduplicates symmetric same_as edges in either endpoint order', () => {
    const ids = new Set(['a', 'b']);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'same_as' },
        { source: 'b', target: 'a', kind: 'same_as' },
      ]),
    ).toHaveLength(1);
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

  it('bounds and normalizes free-text graph queries', () => {
    expect(normalizeGraphQuery('  PAPER  ')).toBe('paper');
    expect(normalizeGraphQuery('X'.repeat(MAX_GRAPH_QUERY_LENGTH + 100))).toHaveLength(
      MAX_GRAPH_QUERY_LENGTH,
    );
  });

  it('uses one query definition for label and kind across visual and DOM surfaces', () => {
    const query = normalizeGraphQuery(' PAPER ');
    expect(matchesGraphQuery('Alpha', 'paper', query)).toBe(true);
    expect(matchesGraphQuery('Paper methods', 'model', query)).toBe(true);
    expect(matchesGraphQuery('Alpha', 'model', query)).toBe(false);
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

  it('avoids redundant static-particle uploads under reduced motion', () => {
    const source = readFileSync(
      new URL('../react/KnowledgeGraph3DScene.tsx', import.meta.url),
      'utf8',
    );
    expect(source).toContain('(positionsChanged || !reducedMotion)');
    expect(source).toContain('advanceGraphLayoutClock');
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
    expect(() => assertKnowledgeGraphBudget(1_000, 4_000)).not.toThrow();
    expect(() => assertKnowledgeGraphBudget(1_001, 0)).toThrow(RangeError);
    expect(() => assertKnowledgeGraphBudget(0, 4_001)).toThrow(RangeError);
    expect(reducedMotionLayoutTickBudget(1_000, 4_000)).toBe(2);
    expect(reducedMotionLayoutTickBudget(100, 400)).toBe(8);
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
  const params: KnowledgeGraph3DParams = {
    nodes: [
      { id: 'p1', kind: 'paper', label: 'Brunel 2000' },
      { id: 'p2', kind: 'paper', label: 'Cited-by-all' },
      { id: 'm1', kind: 'model', label: 'iaf_psc_delta' },
      { id: 'm2', kind: 'model', label: 'iaf_psc_alpha' },
      { id: 'f1', kind: 'family', label: 'LIF family' },
    ],
    edges: [
      { source: 'p1', target: 'p2', kind: 'cites' },
      { source: 'p1', target: 'm1', kind: 'instantiates' },
      { source: 'm1', target: 'f1', kind: 'belongs_to_family' },
      { source: 'm1', target: 'm2', kind: 'same_as' }, // advisory identity (not a self-loop)
      { source: 'p2', target: 'p2', kind: 'cites' }, // self-loop — dropped
      { source: 'p1', target: 'ghost', kind: 'cites' }, // dangling — dropped
    ],
  };

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
    }
  });

  it('drops dangling AND self-loop edges so degree/radius match what the scene draws', () => {
    const { edges } = mapCorpusKnowledgeGraph(params, P);
    // 6 input edges, 1 dangling (p1→ghost) + 1 self-loop (p2→p2) → 4 rendered.
    expect(edges).toHaveLength(4);
    expect(edges.some((e) => e.target === 'ghost')).toBe(false);
    expect(edges.some((e) => e.source === e.target)).toBe(false);
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

  it('scales radius with degree (a hub is larger than a leaf)', () => {
    const { nodes } = mapCorpusKnowledgeGraph(params, P);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    // p1 valid degree 2 (p2, m1 — the dropped ghost edge does NOT count); f1 degree 1.
    expect(byId.p1.radius).toBeGreaterThan(byId.f1.radius);
  });

  it('handles an empty graph without throwing', () => {
    const r = mapCorpusKnowledgeGraph({ nodes: [], edges: [] }, P);
    expect(r.nodes).toEqual([]);
    expect(r.edges).toEqual([]);
  });
});
