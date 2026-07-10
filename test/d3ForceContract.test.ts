import { describe, it, expect } from 'vitest';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type SimNode,
} from 'd3-force-3d';

// d3-force-3d ships no .d.ts, so types/d3-force-3d.d.ts hand-declares the surface
// KnowledgeGraph3DScene uses. Nothing else validates those ambient types against
// the REAL package (mounting the scene needs react-dom + a DOM). This pure-JS
// contract test exercises the exact API the scene relies on, so a breaking
// d3-force-3d upgrade — or ambient-type drift — fails in CI instead of at runtime.
describe('d3-force-3d ambient-type contract (used by KnowledgeGraph3DScene)', () => {
  it('exposes the force constructors the scene imports', () => {
    for (const f of [forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide]) {
      expect(typeof f).toBe('function');
    }
  });

  it('runs a 3D simulation with the exact force chain the scene builds', () => {
    interface Node extends SimNode {
      id: string;
      r: number;
    }
    const nodes: Node[] = [
      { id: 'a', r: 4 },
      { id: 'b', r: 4 },
      { id: 'c', r: 4 },
    ];
    const links = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ];
    const sim = forceSimulation<Node>(nodes, 3)
      .force('charge', forceManyBody().strength(-140).distanceMax(600))
      .force(
        'link',
        forceLink<Node>(links as never).id((d) => d.id).distance(34).strength(0.35),
      )
      .force('center', forceCenter(0, 0, 0).strength(0.04))
      .force('collide', forceCollide((d) => (d as Node).r + 3).iterations(2))
      .alpha(1)
      .alphaDecay(0.018)
      .velocityDecay(0.42)
      .stop();

    expect(sim.alpha()).toBeCloseTo(1);
    sim.tick();
    // After a tick the 3D layout must have finite x/y/z on every node.
    for (const n of nodes) {
      for (const axis of [n.x, n.y, n.z]) {
        expect(Number.isFinite(axis)).toBe(true);
      }
    }
  });

  it('lays out UNSEEDED nodes deterministically (same graph → same layout)', () => {
    // The scene leaves new nodes without x/y/z on purpose: d3-force-3d places
    // them on a deterministic golden-ratio phyllotaxis sphere and its forces
    // draw jitter from a seeded LCG — so identical graphs reproduce identical
    // layouts on every mount. This pins that contract.
    interface Node extends SimNode {
      id: string;
      r: number;
    }
    const build = () => {
      const nodes: Node[] = [
        { id: 'a', r: 4 },
        { id: 'b', r: 4 },
        { id: 'c', r: 4 },
        { id: 'd', r: 4 },
      ];
      const sim = forceSimulation<Node>(nodes, 3)
        .force('charge', forceManyBody().strength(-140).distanceMax(600))
        .force(
          'link',
          forceLink<Node>([{ source: 'a', target: 'b' }] as never)
            .id((d) => d.id)
            .distance(34)
            .strength(0.35),
        )
        .force('collide', forceCollide((d) => (d as Node).r + 3).iterations(2))
        .stop();
      return { nodes, sim };
    };
    const g1 = build();
    const g2 = build();
    g1.sim.tick(30);
    g2.sim.tick(30);
    for (let i = 0; i < g1.nodes.length; i++) {
      expect(g1.nodes[i].x).toBeCloseTo(g2.nodes[i].x as number, 12);
      expect(g1.nodes[i].y).toBeCloseTo(g2.nodes[i].y as number, 12);
      expect(g1.nodes[i].z).toBeCloseTo(g2.nodes[i].z as number, 12);
    }
    // …and the phyllotaxis init actually spreads nodes out (not all at origin).
    const r1 = Math.hypot(
      g1.nodes[1].x as number,
      g1.nodes[1].y as number,
      g1.nodes[1].z as number,
    );
    expect(r1).toBeGreaterThan(1);
  });
});
