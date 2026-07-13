import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
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
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphQueryMatchIds,
  graphSignature,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_GRAPH_EDGE_LANE_OFFSET,
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
      { source: 'a', target: 'b', kind: 'same_as' },
      { source: 'b', target: 'a', kind: 'same_as' },
    ])).toThrow(/relationship is duplicated/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { id: 'claim', source: 'a', target: 'b', kind: 'same_as' },
      { id: 'claim', source: 'b', target: 'a', kind: 'same_as' },
    ])).toThrow(/id is duplicated/);

    const invalidEdges = [
      { source: 'a', target: 'ghost', kind: 'variant_of', color: '#fff' },
    ];
    const props = {
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
  });

  it('keeps a selected nonmatching node in the accessible query result', () => {
    const nodes = [
      { id: 'paper:a', label: 'Matching paper', kind: 'paper', color: '#fff', radius: 4 },
      { id: 'model:selected', label: 'Selected model', kind: 'model', color: '#fff', radius: 4 },
    ];
    const html = renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
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
      nodes,
      edges,
      selectedId: 'hub',
      onSelect: () => {},
    }));
    expect(html).toContain('<summary style="min-height:44px">');
    expect(html).toContain('Browse all 9 relationships');
  });

  it('exposes every identified parallel assertion in accessible relationship detail', () => {
    const nodes = [
      { id: 'a', label: 'Model A', kind: 'model', color: '#fff', radius: 4 },
      { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
    ];
    const html = renderToStaticMarkup(createElement(KnowledgeGraphA11yList, {
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
    const edgeDisclosure = findDisclosure('Browse full metadata for relationship claim-last');
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
      edge('edge:self', 'p2', 'p2', 'cites'), // self-loop — dropped
      edge('edge:dangling', 'p1', 'ghost', 'cites'), // dangling — dropped
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
      expect(n.radiusMeaning).toBe(CORPUS_GRAPH_RADIUS_MEANING);
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
        normalizeGraphQuery('sqrt(rendered relationship degree)'),
        mapped.edges,
      ),
    ]).toEqual(mapped.nodes.map(({ id }) => id));
  });

  it('scales radius with degree (a hub is larger than a leaf)', () => {
    const { nodes } = mapCorpusKnowledgeGraph(params, P);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    // p1 valid degree 2 (p2, m1 — the dropped ghost edge does NOT count); f1 degree 1.
    expect(byId.p1.radius).toBeGreaterThan(byId.f1.radius);
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
