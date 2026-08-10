import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import type { ComponentProps, ReactElement } from 'react';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { CORTEXEL_PALETTE } from '../core/colormaps';
import { getExamplePayload } from '../core/skills/examples';
import { validateSpec } from '../core/skills/authoring';
import type { KnowledgeGraph3DParams } from '../core/skills/params';
import { KnowledgeGraph3DParamsSchema } from '../core/skills/params';
import {
  KnowledgeGraph3DScene,
} from '../react/KnowledgeGraph3DScene';
import {
  KnowledgeGraphA11yList,
  KnowledgeGraphLegend,
} from '../react/KnowledgeGraphA11yList';
import { KnowledgeGraphAccessibleFigure } from
  '../react/KnowledgeGraphAccessibleFigure';
import { KnowledgeGraphDomFigure } from '../react/KnowledgeGraphDomFigure';
import { KnowledgeGraphStaticRecordView } from
  '../react/KnowledgeGraphStaticRecordView';
import {
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
  mapCorpusKnowledgeGraph,
} from '../react/knowledgeGraph';
import {
  prepareCorpusKnowledgeGraphFigure,
  prepareCorpusKnowledgeGraphFigureJson,
} from '../react/knowledgeGraphFigure';
import {
  KnowledgeGraphPresentationJsonError,
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  assertPreparedKnowledgeGraphView,
  isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView,
  knowledgeGraphViewContainsNode,
  parseKnowledgeGraphPresentationJson,
  prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView,
  serializePreparedKnowledgeGraphPresentation,
  type KnowledgeGraphPresentationInputV1,
  type PreparedKnowledgeGraphViewV1,
} from '../react/knowledgeGraphPresentation.internal';
import { KNOWLEDGE_GRAPH_LIMITS } from '../core/skills/knowledgeGraphLimits';
import { KnowledgeGraphPresentationBudgetCounter } from
  '../react/knowledgeGraphPresentationBudget.internal';
import * as headlessKnowledgeGraphPublic from '../src/knowledge-graph/index';
import * as reactKnowledgeGraphPublic from '../react/knowledgeGraphPublic';
import * as reactKnowledgeGraphDomPublic from '../react/knowledgeGraphDomPublic';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EPISTEMIC = {
  status: 'derived_advisory' as const,
  advisory_only: true as const,
  is_paper_local_evidence: false as const,
  calibrated_posterior: false as const,
};

function input(): KnowledgeGraphPresentationInputV1 {
  return {
    contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
    profile: 'generic_visual',
    graphIdentity: 'graph:presentation:test',
    nodes: [
      {
        id: 'node:b',
        label: 'Node B',
        detail: 'second node',
        kind: 'model',
        color: '#abc',
        radius: 4,
        attributes: { zeta: 'last', alpha: ['first', 2] },
        epistemic: EPISTEMIC,
        evidence: [{
          kind: 'external_source',
          evidence_id: 'evidence:b',
          source_id: 'source:b',
          locator: 'record:b',
          excerpt: 'B excerpt',
        }],
        uncalibrated_score: {
          kind: 'extraction_confidence',
          value: 0.5,
          calibrated_posterior: false,
        },
      },
      {
        id: 'node:a',
        label: 'Node A',
        kind: 'model',
        color: '#123456',
        radius: 5,
        evidence: [{
          kind: 'citation',
          evidence_id: 'evidence:a',
          paper_id: 'paper:a',
          citation_id: 'citation:a',
          page: 7,
          doi: '10.0000/example',
          excerpt: 'A excerpt',
        }],
      },
    ],
    edges: [{
      id: 'assertion:b-to-a',
      label: 'variant of',
      source: 'node:b',
      target: 'node:a',
      kind: 'variant_of',
      color: '#f08',
      directed: true,
      evidence: [{
        kind: 'graph_snapshot_record',
        evidence_id: 'evidence:edge',
        record_id: 'record:edge',
      }],
      epistemic: EPISTEMIC,
    }],
  };
}

function corpusSpec(): unknown {
  return getExamplePayload('corpus.knowledge_graph')!;
}

function oversizedFilterableCorpusSpec(): unknown {
  const spec = structuredClone(corpusSpec()) as { params: KnowledgeGraph3DParams };
  spec.params.nodes = Array.from(
    { length: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1 },
    (_, index) => ({
      id: `oversized:${index}`,
      kind: index === MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES ? 'model' as const : 'paper' as const,
      label: `Oversized node ${index}`,
      attributes: {},
      epistemic: EPISTEMIC,
      evidence: [{
        kind: 'external_source' as const,
        evidence_id: `oversized:evidence:${index}`,
        source_id: `oversized:source:${index}`,
      }],
    }),
  );
  spec.params.edges = [];
  return spec;
}

function filterablePresentation() {
  return prepareKnowledgeGraphPresentation({
    contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
    profile: 'generic_visual',
    graphIdentity: 'graph:filterable',
    nodes: [
      { id: 'paper:a', label: 'Paper A', kind: 'paper', color: '#fff', radius: 4 },
      { id: 'paper:b', label: 'Paper B', kind: 'paper', color: '#fff', radius: 4 },
      { id: 'model:a', label: 'Model A', kind: 'model', color: '#fff', radius: 4 },
    ],
    edges: [
      {
        id: 'cite', source: 'paper:a', target: 'paper:b', kind: 'cites',
        color: '#fff', directed: true, particles: true,
      },
      {
        id: 'instance', source: 'paper:a', target: 'model:a', kind: 'instantiates',
        color: '#fff', directed: true,
      },
    ],
  });
}

describe('PreparedKnowledgeGraphPresentationV1 authority', () => {
  it('keeps the corpus mapper and internal corpus surfaces off both public APIs', () => {
    for (const surface of [
      headlessKnowledgeGraphPublic,
      reactKnowledgeGraphPublic,
    ]) {
      expect(Object.hasOwn(surface, 'mapCorpusKnowledgeGraph')).toBe(false);
      expect(Object.hasOwn(surface, 'KnowledgeGraphCorpus3DSceneInternal')).toBe(false);
      expect(Object.hasOwn(surface, 'KnowledgeGraphCorpusA11yListInternal')).toBe(false);
      expect(Object.hasOwn(surface, 'KnowledgeGraphCorpusLegendInternal')).toBe(false);
      expect(Object.hasOwn(surface, 'KnowledgeGraphCorpusStaticRecordViewInternal')).toBe(
        false,
      );
    }
  });

  it('mints one deeply frozen detached capability with explicit materialized assurance', () => {
    const source = input();
    const prepared = prepareKnowledgeGraphPresentation(source);

    expect(prepared.contract).toBe(PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1);
    expect(isPreparedKnowledgeGraphPresentation(prepared)).toBe(true);
    expect(prepared.inputAssurance).toEqual({
      boundary: 'materialized_javascript_value',
      duplicateMembers: 'not_observable_after_materialization',
      proxyTrapFreedom: 'not_established',
    });
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.nodes)).toBe(true);
    expect(Object.isFrozen(prepared.nodes[0])).toBe(true);
    expect(Object.isFrozen(prepared.nodes[0].attributes)).toBe(true);
    expect(Object.isFrozen(prepared.nodes[0].evidence)).toBe(true);
    expect(Object.isFrozen(prepared.inputAssurance)).toBe(true);
    expect(Object.isFrozen(prepared.budget)).toBe(true);
    expect(prepared.profile).toBe('generic_visual');
    expect(Object.hasOwn(prepared, 'context')).toBe(false);
    expect(prepared.mappingAuthority).toEqual({
      kind: 'caller_declared_visual_mapping',
      scientificAuthority: 'not_established',
    });
    expect(Object.getPrototypeOf(prepared)).toBeNull();
    expect(Object.getPrototypeOf(prepared.nodes[0])).toBeNull();
    expect(Object.getPrototypeOf(prepared.nodes[0].attributes!)).toBeNull();

    (source.nodes[0] as { label: string }).label = 'mutated';
    expect(prepared.nodes[0].label).toBe('Node B');
    expect(prepared.nodes[0].color).toBe('#aabbcc');
    expect(prepared.nodes[0].nodeGlyph).toBe('sphere_outline');
    expect(prepared.edges[0].edgeStrokePattern).toBe('solid');
  });

  it('rejects structural lookalikes, copies, serialized values, and Proxy wrappers', () => {
    const prepared = prepareKnowledgeGraphPresentation(input());
    const lookalikes: unknown[] = [
      { ...prepared },
      structuredClone(prepared),
      JSON.parse(JSON.stringify(prepared)),
    ];
    let proxyReads = 0;
    const wrapped = new Proxy(prepared, {
      get() {
        proxyReads += 1;
        throw new Error('must not read');
      },
    });
    lookalikes.push(wrapped);

    for (const value of lookalikes) {
      expect(isPreparedKnowledgeGraphPresentation(value)).toBe(false);
      expect(() => KnowledgeGraphLegend({ presentation: value as never })).toThrow(
        /require a capability/,
      );
      expect(() => KnowledgeGraphStaticRecordView({ presentation: value as never })).toThrow(
        /require a capability/,
      );
    }
    expect(proxyReads).toBe(0);
    expect(() => serializePreparedKnowledgeGraphPresentation({ ...prepared })).toThrow(
      /require a capability/,
    );
  });

  it('exports the complete exact record canonically without rehydrating authority', () => {
    const prepared = prepareKnowledgeGraphPresentation(input());
    const serialized = serializePreparedKnowledgeGraphPresentation(prepared);
    const repeated = serializePreparedKnowledgeGraphPresentation(prepared);
    expect(repeated).toBe(serialized);
    const record = JSON.parse(serialized) as Record<string, unknown>;
    expect(record.contract).toBe(PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1);
    expect(record.nodes).toHaveLength(prepared.nodes.length);
    expect(record.edges).toHaveLength(prepared.edges.length);
    expect(record.budget).toEqual(prepared.budget);
    expect(isPreparedKnowledgeGraphPresentation(record)).toBe(false);
  });

  it('rejects citation-page negative zero before canonical bytes can collapse it to zero', () => {
    const generic = input();
    const citation = generic.nodes[1].evidence?.[0];
    if (citation?.kind !== 'citation') throw new Error('citation fixture required');
    (citation as { page?: number }).page = -0;
    expect(() => prepareKnowledgeGraphPresentation(generic)).toThrow(/negative zero/);

    const corpus = structuredClone(corpusSpec()) as { params: KnowledgeGraph3DParams };
    corpus.params.nodes[0].evidence = [{
      kind: 'citation',
      evidence_id: 'negative-zero-page',
      paper_id: 'paper:negative-zero',
      citation_id: 'citation:negative-zero',
      page: -0,
    }];
    expect(KnowledgeGraph3DParamsSchema.safeParse(corpus.params).success).toBe(false);
    expect(() => mapCorpusKnowledgeGraph(corpus.params, CORTEXEL_PALETTE)).toThrow(
      /negative zero/,
    );

    const zero = input();
    const acceptedCitation = zero.nodes[1].evidence?.[0];
    if (acceptedCitation?.kind !== 'citation') throw new Error('citation fixture required');
    (acceptedCitation as { page?: number }).page = 0;
    expect(serializePreparedKnowledgeGraphPresentation(
      prepareKnowledgeGraphPresentation(zero),
    )).toContain('"page":0');
  });

  it('rejects accessors without invoking them at root and nested boundaries', () => {
    const rootGetter = vi.fn(() => []);
    const root = Object.defineProperties({}, {
      contract: { enumerable: true, value: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1 },
      graphIdentity: { enumerable: true, value: 'graph:getter' },
      nodes: { enumerable: true, get: rootGetter },
      edges: { enumerable: true, value: [] },
    });
    expect(() => prepareKnowledgeGraphPresentation(root as never)).toThrow(
      /enumerable data property/,
    );
    expect(rootGetter).not.toHaveBeenCalled();

    const nodeGetter = vi.fn(() => 'node:a');
    const node = Object.defineProperties({}, {
      id: { enumerable: true, get: nodeGetter },
      label: { enumerable: true, value: 'Node A' },
      color: { enumerable: true, value: '#fff' },
      radius: { enumerable: true, value: 4 },
      kind: { enumerable: true, value: 'model' },
    });
    const nested = { ...input(), nodes: [node] };
    expect(() => prepareKnowledgeGraphPresentation(nested as never)).toThrow(
      /enumerable data property/,
    );
    expect(nodeGetter).not.toHaveBeenCalled();
  });

  it('makes the unavoidable materialized-Proxy caveat machine-readable', () => {
    let traps = 0;
    const ordinary = input();
    const proxied = new Proxy(ordinary, {
      getPrototypeOf(target) {
        traps += 1;
        return Reflect.getPrototypeOf(target);
      },
      ownKeys(target) {
        traps += 1;
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, key) {
        traps += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const prepared = prepareKnowledgeGraphPresentation(proxied);
    expect(traps).toBeGreaterThan(0);
    expect(prepared.inputAssurance.proxyTrapFreedom).toBe('not_established');
  });

  it('detaches optional reads from ambient Object.prototype pollution', () => {
    const poisonedKeys = [
      'context',
      'detail',
      'evidence',
      'uncalibrated_score',
      'radiusMeaning',
      'directed',
      'particles',
    ] as const;
    const prior = new Map<PropertyKey, PropertyDescriptor | undefined>();
    for (const key of poisonedKeys) {
      prior.set(key, Object.getOwnPropertyDescriptor(Object.prototype, key));
      Object.defineProperty(Object.prototype, key, {
        configurable: true,
        enumerable: false,
        value: `ambient:${key}`,
        writable: true,
      });
    }
    try {
      const prepared = prepareKnowledgeGraphPresentation({
        contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
        profile: 'generic_visual',
        graphIdentity: 'graph:prototype-negative-control',
        nodes: [{ id: 'node', label: 'Node', kind: 'model', color: '#fff', radius: 4 }],
        edges: [],
      });
      expect(Object.hasOwn(prepared, 'context')).toBe(false);
      expect(prepared.context).toBeUndefined();
      for (const key of poisonedKeys.slice(1)) {
        expect(Object.hasOwn(prepared.nodes[0], key)).toBe(false);
        expect((prepared.nodes[0] as unknown as Record<string, unknown>)[key]).toBeUndefined();
      }
      expect(renderToStaticMarkup(
        <KnowledgeGraphStaticRecordView presentation={prepared} />,
      )).not.toContain('ambient:');
    } finally {
      for (const key of poisonedKeys) {
        const descriptor = prior.get(key);
        if (descriptor === undefined) delete (Object.prototype as Record<string, unknown>)[key];
        else Object.defineProperty(Object.prototype, key, descriptor);
      }
    }
  });

  it('uses the strict raw parser and retains deeply frozen parse diagnostics', () => {
    const raw = parseKnowledgeGraphPresentationJson(JSON.stringify(input()));
    expect(raw.inputAssurance).toEqual({
      boundary: 'raw_json_text',
      duplicateMembers: 'rejected_before_materialization',
      proxyTrapFreedom: 'not_applicable',
    });
    const duplicate = '{"contract":"cortexel-knowledge-graph-presentation-input.v1",' +
      '"profile":"generic_visual","graphIdentity":"g",' +
      '"nodes":[],"nodes":[],"edges":[]}';
    let thrown: unknown;
    try {
      parseKnowledgeGraphPresentationJson(duplicate);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(KnowledgeGraphPresentationJsonError);
    const diagnostics = (thrown as KnowledgeGraphPresentationJsonError).diagnostics;
    expect(diagnostics.some(({ code }) => code === 'JSON_DUPLICATE_KEY')).toBe(true);
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(Object.isFrozen(diagnostics[0])).toBe(true);
  });

  it('keeps generic visual authority separate from corpus context', () => {
    const generic = input();
    expect(() => prepareKnowledgeGraphPresentation({
      ...generic,
      context: {
        graph_id: 'graph:context',
        graph_source: 'engram:test',
        graph_snapshot_id: 'sha256:caller-namespace',
        graph_scope: 'corpus_entity',
        generated_at: '2026-07-31T12:34:56+02:00',
      },
    } as never)).toThrow(/cannot carry corpus context/);
    expect(() => prepareKnowledgeGraphPresentation({
      ...generic,
      profile: 'corpus_entity',
    } as never)).toThrow(/profile must equal generic_visual/);
  });

  it('defaults and closes the redundant glyph and stroke channels', () => {
    const prepared = prepareKnowledgeGraphPresentation(input());
    expect(new Set(prepared.nodes.map((node) => node.nodeGlyph))).toEqual(
      new Set(['sphere_outline']),
    );
    expect(new Set(prepared.edges.map((edge) => edge.edgeStrokePattern))).toEqual(
      new Set(['solid']),
    );

    const invalidGlyph = input();
    (invalidGlyph.nodes[0] as unknown as { nodeGlyph: string }).nodeGlyph = 'triangle';
    expect(() => prepareKnowledgeGraphPresentation(invalidGlyph)).toThrow(
      /nodeGlyph is unsupported/u,
    );
    const invalidStroke = input();
    (invalidStroke.edges[0] as unknown as {
      edgeStrokePattern: string;
    }).edgeStrokePattern = 'custom-dash';
    expect(() => prepareKnowledgeGraphPresentation(invalidStroke)).toThrow(
      /edgeStrokePattern is unsupported/u,
    );
  });

  it('rejects duplicate evidence identities and unresolved graph-node references', () => {
    const duplicate = input();
    (duplicate.nodes[0] as unknown as { evidence: unknown[] }).evidence = [
      { kind: 'external_source', evidence_id: 'same', source_id: 'one' },
      { kind: 'external_source', evidence_id: 'same', source_id: 'two' },
    ];
    expect(() => prepareKnowledgeGraphPresentation(duplicate)).toThrow(
      /duplicate evidence_id/,
    );

    const unresolved = input();
    (unresolved.nodes[0] as unknown as { evidence: unknown[] }).evidence = [{
      kind: 'graph_node',
      evidence_id: 'missing',
      node_id: 'node:missing',
    }];
    expect(() => prepareKnowledgeGraphPresentation(unresolved)).toThrow(
      /references a missing graph node/,
    );
  });

  it('enforces every aggregate budget exactly at its counter boundary', () => {
    const retained = new KnowledgeGraphPresentationBudgetCounter();
    expect(() => retained.retain(
      'retained test',
      KNOWLEDGE_GRAPH_LIMITS.maxPresentationRetainedOccurrences,
    )).not.toThrow();
    expect(() => retained.retain('retained test')).toThrow(/retained-occurrence limit/);

    const strings = new KnowledgeGraphPresentationBudgetCounter();
    expect(() => strings.string(
      'x'.repeat(KNOWLEDGE_GRAPH_LIMITS.maxPresentationStringCodeUnits),
      'string test',
    )).not.toThrow();
    expect(() => strings.string('x', 'string test')).toThrow(
      /aggregate source-string limit/,
    );

    const work = new KnowledgeGraphPresentationBudgetCounter();
    expect(() => work.inspect(
      'work test',
      KNOWLEDGE_GRAPH_LIMITS.maxPresentationInspectionWork,
    )).not.toThrow();
    expect(() => work.inspect('work test')).toThrow(/inspection-work limit/);
  });

  it('defines string budget receipts over accepted source occurrences, not normalized output', () => {
    const source = input();
    (source.nodes[0] as { color: string }).color = '#abc';
    const short = prepareKnowledgeGraphPresentation(source);
    const longerSource = input();
    (longerSource.nodes[0] as { color: string }).color = '#abcdef';
    const long = prepareKnowledgeGraphPresentation(longerSource);
    expect(short.nodes[0].color).toBe('#aabbcc');
    expect(long.nodes[0].color).toBe('#abcdef');
    expect(
      long.budget.sourceStringCodeUnits - short.budget.sourceStringCodeUnits,
    ).toBe(3);
  });

  it('prepares canonical exact-source-bound filter views without copying records', () => {
    const source = filterablePresentation();
    const view = prepareKnowledgeGraphView(source, {
      nodeKinds: ['paper'],
      edgeKinds: ['instantiates', 'cites'],
    });
    expect(view.contract).toBe(PREPARED_KNOWLEDGE_GRAPH_VIEW_V1);
    expect(view.policy).toEqual({
      nodeKinds: ['paper'],
      edgeKinds: ['cites', 'instantiates'],
    });
    expect(view.counts).toEqual({
      sourceNodes: 3,
      sourceEdges: 2,
      visibleNodes: 2,
      visibleEdges: 1,
      edgeKindFilteredEdges: 0,
      endpointPrunedEdges: 1,
    });
    expect(view.nodes[0]).toBe(source.nodes[0]);
    expect(view.edges[0]).toBe(source.edges[0]);
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.nodes)).toBe(true);
    expect(Object.getPrototypeOf(view)).toBeNull();
    expect(isPreparedKnowledgeGraphView(view)).toBe(true);
    expect(knowledgeGraphViewContainsNode(view, source, 'paper:a')).toBe(true);
    expect(knowledgeGraphViewContainsNode(view, source, 'model:a')).toBe(false);
    expect(() => assertPreparedKnowledgeGraphView(view, source)).not.toThrow();
    expect(() => assertPreparedKnowledgeGraphView(view, filterablePresentation())).toThrow(
      /exact source presentation/,
    );
    const wrongSource = filterablePresentation();
    expect(() => KnowledgeGraph3DScene({
      presentation: wrongSource,
      view,
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    })).toThrow(/exact source presentation/);
    expect(() => KnowledgeGraphA11yList({
      presentation: wrongSource,
      view,
      selectedId: null,
      onSelect: () => {},
    })).toThrow(/exact source presentation/);
    expect(() => KnowledgeGraphLegend({ presentation: wrongSource, view })).toThrow(
      /exact source presentation/,
    );
    expect(() => KnowledgeGraphStaticRecordView({
      presentation: wrongSource,
      view,
    })).toThrow(/exact source presentation/);
    expect(isPreparedKnowledgeGraphView({ ...view })).toBe(false);
  });

  it('distinguishes all from intentional empty views and rejects filter typos', () => {
    const source = filterablePresentation();
    const all = prepareKnowledgeGraphView(source);
    expect(all.policy).toEqual({ nodeKinds: 'all', edgeKinds: 'all' });
    expect(all.counts.visibleNodes).toBe(3);
    expect(all.counts.visibleEdges).toBe(2);

    const none = prepareKnowledgeGraphView(source, { nodeKinds: [], edgeKinds: [] });
    expect(none.policy).toEqual({ nodeKinds: [], edgeKinds: [] });
    expect(none.counts.visibleNodes).toBe(0);
    expect(none.counts.visibleEdges).toBe(0);
    expect(renderToStaticMarkup(
      <KnowledgeGraphA11yList
        presentation={source}
        view={none}
        selectedId={null}
        onSelect={() => {}}
      />,
    )).toContain(
      'This filtered view contains no nodes; the full source contains 3.',
    );

    expect(() => prepareKnowledgeGraphView(source, {
      nodeKinds: ['papre'],
    })).toThrow(/absent from the source graph/);
    expect(() => prepareKnowledgeGraphView(source, {
      edgeKinds: ['cites', 'cites'],
    })).toThrow(/duplicate kind/);
  });

  it('rejects view-policy accessors without invoking them and detects descriptor drift', () => {
    const source = filterablePresentation();
    const getter = vi.fn(() => ['paper']);
    const accessor = Object.defineProperty({}, 'nodeKinds', {
      enumerable: true,
      get: getter,
    });
    expect(() => prepareKnowledgeGraphView(source, accessor)).toThrow(
      /enumerable data property/,
    );
    expect(getter).not.toHaveBeenCalled();

    let descriptorReads = 0;
    const target = { nodeKinds: ['paper'] };
    const drifting = new Proxy(target, {
      getOwnPropertyDescriptor(object, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(object, key)!;
        if (key === 'nodeKinds') {
          descriptorReads += 1;
          if (descriptorReads > 1) return { ...descriptor, value: ['model'] };
        }
        return descriptor;
      },
    });
    expect(() => prepareKnowledgeGraphView(source, drifting)).toThrow(
      /changed during preparation/,
    );
  });

  it('checks view identity and source binding without reading forged candidates', () => {
    const source = filterablePresentation();
    const view = prepareKnowledgeGraphView(source, { nodeKinds: ['paper'] });
    let traps = 0;
    const wrappedView = new Proxy(view, {
      get() { traps += 1; throw new Error('must not read view'); },
      getPrototypeOf() { traps += 1; throw new Error('must not inspect view'); },
    });
    const wrappedSource = new Proxy(source, {
      get() { traps += 1; throw new Error('must not read source'); },
      getPrototypeOf() { traps += 1; throw new Error('must not inspect source'); },
    });
    expect(isPreparedKnowledgeGraphView(wrappedView)).toBe(false);
    expect(() => assertPreparedKnowledgeGraphView(wrappedView, source)).toThrow(
      /exact source presentation/,
    );
    expect(() => assertPreparedKnowledgeGraphView(view, wrappedSource)).toThrow(
      /require a capability/,
    );
    expect(() => knowledgeGraphViewContainsNode(
      wrappedView as PreparedKnowledgeGraphViewV1,
      source,
      'paper:a',
    )).toThrow(/exact source presentation/);
    expect(traps).toBe(0);
  });

  it('obeys the finite set/filter algebra for arbitrary bounded graphs and policies', () => {
    const nodeKindArbitrary = fc.constantFrom('paper', 'model', 'family', 'dataset');
    const edgeKindArbitrary = fc.constantFrom(
      'cites',
      'same_as',
      'variant_of',
      'instantiates',
    );
    fc.assert(fc.property(
      fc.array(nodeKindArbitrary, { minLength: 2, maxLength: 16 }),
      fc.array(edgeKindArbitrary, { minLength: 0, maxLength: 8 }),
      fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
      fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
      (nodeKinds, edgeKinds, nodeMask, edgeMask) => {
        const nodes = nodeKinds.map((kind, index) => ({
          id: `node:${index}`,
          label: `Node ${index}`,
          kind,
          color: '#ffffff',
          radius: 4,
        }));
        const edges = edgeKinds.map((kind, index) => {
          const sourceIndex = index % nodes.length;
          const offset = 1 + (Math.floor(index / nodes.length) % (nodes.length - 1));
          return {
            id: `edge:${index}`,
            source: `node:${sourceIndex}`,
            target: `node:${(sourceIndex + offset) % nodes.length}`,
            kind,
            color: '#ffffff',
            directed: true,
          };
        });
        const source = prepareKnowledgeGraphPresentation({
          contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
          profile: 'generic_visual',
          graphIdentity: 'property:view-algebra',
          nodes,
          edges,
        });
        const presentNodeKinds = [...new Set(nodeKinds)].sort();
        const presentEdgeKinds = [...new Set(edgeKinds)].sort();
        const selectedNodeKinds = presentNodeKinds.filter((_, index) =>
          nodeMask[index % nodeMask.length]);
        const selectedEdgeKinds = presentEdgeKinds.filter((_, index) =>
          edgeMask[index % edgeMask.length]);
        const view = prepareKnowledgeGraphView(source, {
          nodeKinds: selectedNodeKinds,
          edgeKinds: selectedEdgeKinds,
        });
        const selectedNodeSet = new Set<string>(selectedNodeKinds);
        const selectedEdgeSet = new Set<string>(selectedEdgeKinds);
        const expectedNodes = source.nodes.filter((node) => selectedNodeSet.has(node.kind));
        const expectedNodeIds = new Set(expectedNodes.map(({ id }) => id));
        const edgeKindCandidates = source.edges.filter((edge) =>
          selectedEdgeSet.has(edge.kind));
        const expectedEdges = edgeKindCandidates.filter((edge) =>
          expectedNodeIds.has(edge.source) && expectedNodeIds.has(edge.target));

        expect(view.nodes).toEqual(expectedNodes);
        expect(view.edges).toEqual(expectedEdges);
        expect(view.nodes.every((node, index) => node === expectedNodes[index])).toBe(true);
        expect(view.edges.every((edge, index) => edge === expectedEdges[index])).toBe(true);
        expect(view.counts.edgeKindFilteredEdges).toBe(
          source.edges.length - edgeKindCandidates.length,
        );
        expect(view.counts.endpointPrunedEdges).toBe(
          edgeKindCandidates.length - expectedEdges.length,
        );
        expect(
          view.counts.visibleEdges +
          view.counts.edgeKindFilteredEdges +
          view.counts.endpointPrunedEdges,
        ).toBe(source.edges.length);

        const permuted = prepareKnowledgeGraphView(source, {
          nodeKinds: [...selectedNodeKinds].reverse(),
          edgeKinds: [...selectedEdgeKinds].reverse(),
        });
        expect(permuted).toBe(view);
        expect(permuted.policy).toEqual(view.policy);

        const all = prepareKnowledgeGraphView(source);
        expect(all.nodes).toEqual(source.nodes);
        expect(all.edges).toEqual(source.edges);
        expect(all.nodes.every((node, index) => node === source.nodes[index])).toBe(true);
        expect(all.edges.every((edge, index) => edge === source.edges[index])).toBe(true);
      },
    ), { numRuns: 200 });
  });

  it('keeps equivalent hot policies stable with a bounded least-recently-used cache', () => {
    const size = KNOWLEDGE_GRAPH_LIMITS.maxCachedViewsPerPresentation + 1;
    const source = prepareKnowledgeGraphPresentation({
      contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
      profile: 'generic_visual',
      graphIdentity: 'cache:lru',
      nodes: Array.from({ length: size }, (_, index) => ({
        id: `node:${index}`,
        label: `Node ${index}`,
        kind: `kind:${index}`,
        color: '#ffffff',
        radius: 4,
      })),
      edges: [],
    });
    const tokens = Array.from(
      { length: KNOWLEDGE_GRAPH_LIMITS.maxCachedViewsPerPresentation },
      (_, index) => prepareKnowledgeGraphView(source, { nodeKinds: [`kind:${index}`] }),
    );
    expect(prepareKnowledgeGraphView(source, { nodeKinds: ['kind:0'] })).toBe(tokens[0]);
    prepareKnowledgeGraphView(source, {
      nodeKinds: [`kind:${KNOWLEDGE_GRAPH_LIMITS.maxCachedViewsPerPresentation}`],
    });
    expect(prepareKnowledgeGraphView(source, { nodeKinds: ['kind:0'] })).toBe(tokens[0]);
    expect(prepareKnowledgeGraphView(source, { nodeKinds: ['kind:1'] })).not.toBe(tokens[1]);
  });
});

describe('coherent knowledge-graph surfaces', () => {
  it('offers one minimal caption-bound React-only DOM composition', () => {
    expect(Object.keys(reactKnowledgeGraphDomPublic).sort()).toEqual([
      'KnowledgeGraphDomFigure',
    ]);
    const spec = corpusSpec();
    const gated = validateSpec(spec);
    if (!gated.ok || gated.caption === null) {
      throw new Error('valid corpus fixture required');
    }
    const html = renderToStaticMarkup(<KnowledgeGraphDomFigure spec={spec} />);
    expect(html).toMatch(/^<figure[^>]*><figcaption[^>]*>/u);
    expect(html).toContain(gated.caption);
    expect(html).toContain('<bdi dir="auto" style="unicode-bidi:isolate">');
    expect(html).toContain('DOM-only knowledge graph inspection');
    expect(html).toContain('mounts no Canvas, WebGL, or force layout');
    expect(html).toContain('Without client-side JavaScript');
    expect(html).toContain('Knowledge graph legend');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('Deterministic paginated knowledge graph record view');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('host-owned interactive 3D');
  });

  it('fails closed at every DOM input boundary without minting a caption', () => {
    const text = JSON.stringify(corpusSpec());
    const duplicate = text.replace('{', '{"skill":"corpus.knowledge_graph",');
    const duplicateHtml = renderToStaticMarkup(
      <KnowledgeGraphDomFigure specJson={duplicate} />,
    );
    expect(duplicateHtml).toContain('Knowledge graph figure rejected');
    expect(duplicateHtml).toContain('appears more than once');
    expect(duplicateHtml).not.toContain('<figure');
    expect(duplicateHtml).not.toContain('<figcaption');

    const renderUnchecked = (inputProps: Record<string, unknown>): string =>
      renderToStaticMarkup(
        <KnowledgeGraphDomFigure
          {...(inputProps as unknown as ComponentProps<
            typeof KnowledgeGraphDomFigure
          >)}
        />,
      );
    expect(renderUnchecked({})).toContain(
      'provide exactly one own input property: spec or specJson',
    );
    expect(renderUnchecked({ spec: corpusSpec(), specJson: text })).toContain(
      'provide exactly one own input property: spec or specJson',
    );
    expect(renderUnchecked({ specJson: undefined })).toContain(
      'specJson must be a string',
    );

    const wrong = renderToStaticMarkup(
      <KnowledgeGraphDomFigure spec={getExamplePayload('nest.spike_raster')} />,
    );
    expect(wrong).toContain('requires corpus.knowledge_graph');
    expect(wrong).not.toContain('<figure');

    const exportSpec = structuredClone(corpusSpec()) as { mode: string };
    exportSpec.mode = 'export';
    const unsupported = renderToStaticMarkup(
      <KnowledgeGraphDomFigure spec={exportSpec} />,
    );
    expect(unsupported).toContain('requires interactive mode');
    expect(unsupported).not.toContain('<figure');
  });

  it('keeps the full caption and records when a DOM view policy rejects', () => {
    const spec = corpusSpec();
    const gated = validateSpec(spec);
    if (!gated.ok || gated.caption === null) {
      throw new Error('valid corpus fixture required');
    }
    const html = renderToStaticMarkup(
      <KnowledgeGraphDomFigure
        spec={spec}
        viewPolicy={{ nodeKinds: ['not-present'] }}
      />,
    );
    expect(html).toMatch(/^<figure[^>]*><figcaption[^>]*>/u);
    expect(html).toContain(gated.caption);
    expect(html).toContain('Knowledge graph view rejected');
    expect(html).toContain('Deterministic paginated knowledge graph record view');
    expect(html).not.toContain('Knowledge graph legend');
  });

  it('does not apply the allocating live-force ceiling to the DOM composition', () => {
    const spec = oversizedFilterableCorpusSpec();
    const prepared = prepareCorpusKnowledgeGraphFigure(spec);
    if (!prepared.ok) throw new Error('oversized accepted corpus fixture required');
    const html = renderToStaticMarkup(<KnowledgeGraphDomFigure spec={spec} />);
    expect(html).toContain(prepared.caption);
    expect(html).toContain('DOM-only knowledge graph inspection');
    expect(html).toContain(`Nodes (${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1})`);
    expect(html).not.toContain('reviewed main-thread ceiling');
    expect(html).not.toContain('unavailable_resource_limit');
  });

  it('owns selection and resets it on an exact active-view capability change', async () => {
    const spec = corpusSpec();
    const prepared = prepareCorpusKnowledgeGraphFigure(spec);
    if (!prepared.ok) throw new Error('valid corpus fixture required');
    const selected = prepared.presentation.nodes[0];
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<KnowledgeGraphDomFigure spec={spec} />);
    });
    const selectedButton = () => renderer.root.findAllByType('button').find(
      (button) => button.props.className === 'cortexel-knowledge-graph-node' &&
        String(button.props.children).includes(selected.label),
    );
    const initial = selectedButton();
    if (initial === undefined) throw new Error('selected node button required');
    expect(initial.props['aria-pressed']).toBe(false);
    await act(async () => initial.props.onClick());
    expect(selectedButton()?.props['aria-pressed']).toBe(true);

    await act(async () => {
      renderer.update(
        <KnowledgeGraphDomFigure
          spec={spec}
          viewPolicy={{ nodeKinds: [selected.kind] }}
        />,
      );
    });
    expect(selectedButton()?.props['aria-pressed']).toBe(false);
    await act(async () => renderer.unmount());
  });

  it('offers one peer-free no-throw strict bind-and-prepare path for agents', () => {
    const spec = corpusSpec();
    const gated = validateSpec(spec);
    const prepared = prepareCorpusKnowledgeGraphFigure(spec);
    expect(gated.ok).toBe(true);
    expect(prepared.ok).toBe(true);
    if (!gated.ok || gated.caption === null || !prepared.ok) {
      throw new Error('valid corpus fixture required');
    }
    expect(prepared.caption).toBe(gated.caption);
    expect(prepared.presentation.profile).toBe('corpus_entity');
    expect(prepared.sourceInputAssurance).toEqual({
      boundary: 'materialized_javascript_value',
      duplicateMembers: 'not_observable_after_materialization',
    });
    expect(prepared.hostPolicy.presentation).toBe(prepared.presentation);
    expect(prepared.hostPolicy.sourceInputAssurance).toBe(
      prepared.sourceInputAssurance,
    );
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.hostPolicy)).toBe(true);
    const wrong = prepareCorpusKnowledgeGraphFigure(
      getExamplePayload('nest.spike_raster')!,
    );
    expect(wrong).toEqual({
      ok: false,
      errors: [{
        code: 'wrong_skill',
        path: 'skill',
        message: 'requires corpus.knowledge_graph; received nest.spike_raster',
      }],
    });
    const invalidView = prepareCorpusKnowledgeGraphFigure(spec, {
      viewPolicy: { nodeKinds: ['not-present'] },
    });
    expect(invalidView.ok).toBe(false);
    if (invalidView.ok || invalidView.acceptedSource === undefined) {
      throw new Error('view rejection must retain the accepted source boundary');
    }
    expect(invalidView.errors[0]?.code).toBe('view_preparation_failed');
    expect(invalidView.acceptedSource.caption).toBe(gated.caption);
    expect(invalidView.acceptedSource.sourceInputAssurance).toEqual({
      boundary: 'materialized_javascript_value',
      duplicateMembers: 'not_observable_after_materialization',
    });
    expect(isPreparedKnowledgeGraphPresentation(
      invalidView.acceptedSource.presentation,
    )).toBe(true);
  });

  it('owns a duplicate-safe raw corpus-VizSpec boundary for agents and React', () => {
    const text = JSON.stringify(corpusSpec());
    const prepared = prepareCorpusKnowledgeGraphFigureJson(text);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error('valid raw corpus fixture required');
    expect(prepared.sourceInputAssurance).toEqual({
      boundary: 'raw_json_text',
      duplicateMembers: 'rejected_before_materialization',
    });
    expect(prepared.hostPolicy.sourceInputAssurance).toBe(
      prepared.sourceInputAssurance,
    );

    const duplicateSkill = prepareCorpusKnowledgeGraphFigureJson(
      text.replace('{', '{"skill":"corpus.knowledge_graph",'),
    );
    expect(duplicateSkill.ok).toBe(false);
    if (duplicateSkill.ok) throw new Error('duplicate member must reject');
    expect(duplicateSkill.errors[0]).toMatchObject({
      code: 'raw_json_rejected',
      gateCode: 'JSON_DUPLICATE_KEY',
    });

    const excessiveDepth = prepareCorpusKnowledgeGraphFigureJson(
      `${'['.repeat(KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonDepth + 2)}0${
        ']'.repeat(KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonDepth + 2)
      }`,
    );
    expect(excessiveDepth.ok).toBe(false);
    if (excessiveDepth.ok) throw new Error('excessive depth must reject');
    expect(excessiveDepth.errors[0]).toMatchObject({
      code: 'raw_json_rejected',
      gateCode: 'JSON_DEPTH_EXCEEDED',
    });

    const excessiveBytes = prepareCorpusKnowledgeGraphFigureJson(
      `"${'x'.repeat(KNOWLEDGE_GRAPH_LIMITS.maxPresentationRawInputBytes)}"`,
    );
    expect(excessiveBytes.ok).toBe(false);
    if (excessiveBytes.ok) throw new Error('excessive raw bytes must reject');
    expect(excessiveBytes.errors[0]).toMatchObject({
      code: 'raw_json_rejected',
      gateCode: 'JSON_BYTES_EXCEEDED',
    });

    const nonText = prepareCorpusKnowledgeGraphFigureJson({} as never);
    expect(nonText.ok).toBe(false);
    if (nonText.ok) throw new Error('non-text raw input must reject');
    expect(nonText.errors[0]).toMatchObject({
      code: 'raw_json_rejected',
      gateCode: 'JSON_SYNTAX',
    });

    let observedContext: Parameters<
      ComponentProps<typeof KnowledgeGraphAccessibleFigure>['renderVisual']
    >[1] | undefined;
    const html = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        specJson={text}
        renderVisual={(_scene, context) => {
          observedContext = context;
          return <div>raw visual</div>;
        }}
        selectedId={null}
        onSelect={() => {}}
        hoverId={null}
        onHover={() => {}}
      />,
    );
    expect(html).toContain('raw visual');
    expect(observedContext?.sourceInputAssurance).toEqual({
      boundary: 'raw_json_text',
      duplicateMembers: 'rejected_before_materialization',
    });
  });

  it('renders deterministic source records independent of input ordering', () => {
    const first = prepareKnowledgeGraphPresentation(input());
    const source = input();
    const permutedInput: KnowledgeGraphPresentationInputV1 = {
      ...source,
      nodes: [...source.nodes].reverse(),
      edges: [...source.edges].reverse(),
    };
    const second = prepareKnowledgeGraphPresentation(permutedInput);
    const firstHtml = renderToStaticMarkup(
      <KnowledgeGraphStaticRecordView presentation={first} />,
    );
    const secondHtml = renderToStaticMarkup(
      <KnowledgeGraphStaticRecordView presentation={second} />,
    );
    expect(firstHtml).toBe(secondHtml);
    expect(firstHtml).toContain(
      'Caller-declared: visual size has no declared quantitative interpretation.',
    );
    expect(firstHtml).toContain('B excerpt');
    expect(firstHtml).toContain('10.0000/example');
    expect(firstHtml).toContain('assertion:b-to-a');
    expect(firstHtml).not.toMatch(/\bx\b|\by\b|\bz\b/);
    expect(firstHtml).toContain('does not resolve, authenticate, or establish custody');
  });

  it('strictly derives the corpus presentation and bound caption around host-owned visual output', () => {
    const spec = structuredClone(corpusSpec()) as { themeMode: string };
    spec.themeMode = 'light';
    const gated = validateSpec(spec);
    expect(gated.ok).toBe(true);
    if (!gated.ok || gated.caption === null) throw new Error('valid corpus fixture required');
    let observedContext: Parameters<
      ComponentProps<typeof KnowledgeGraphAccessibleFigure>['renderVisual']
    >[1] | undefined;
    let observedScene: ReactElement | undefined;
    const html = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        spec={spec}
        renderVisual={(scene, context) => {
          observedScene = scene;
          observedContext = context;
          return <div data-host-canvas="true">host-owned Canvas</div>;
        }}
        selectedId={null}
        onSelect={() => {}}
        hoverId={null}
        onHover={() => {}}
        reducedMotion
        flowMotion="animated"
        label={'Graph\u202e'}
      />,
    );
    expect(html).toContain('<figure');
    expect(html).toContain('<figcaption');
    expect(html).toContain(gated.caption);
    expect(html).toContain('Knowledge graph legend');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('data-host-canvas="true"');
    expect(html).toContain('Deterministic paginated knowledge graph record view');
    expect(html).not.toMatch(/<details[^>]*>[^]*<figcaption/u);
    expect(html).toMatch(/^<figure[^>]*><figcaption[^>]*>/u);
    expect(html).toContain('aria-label="Graph\\u202e"');
    expect(html).not.toContain('\u202e');
    expect(observedContext?.presentation.profile).toBe('corpus_entity');
    expect(observedContext?.view).toBeUndefined();
    expect(observedContext?.themeMode).toBe(gated.spec.themeMode);
    expect(observedContext?.backgroundColor).toBe('#f8fafc');
    expect((observedScene?.props as { themeMode?: string }).themeMode).toBe('light');
    expect((observedScene?.props as { flowMotion?: string }).flowMotion).toBe('animated');
    expect(Object.isFrozen(observedContext)).toBe(true);
  });

  it('retains every non-WebGL surface when the active view exceeds the live-force ceiling', () => {
    const spec = oversizedFilterableCorpusSpec();
    const prepared = prepareCorpusKnowledgeGraphFigure(spec);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error('oversized accepted corpus fixture required');
    expect(prepared.presentation.nodes).toHaveLength(
      MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1,
    );
    expect(prepared.hostPolicy.liveForceAvailability).toEqual({
      status: 'unavailable_resource_limit',
      nodeCount: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1,
      edgeCount: 0,
      maxNodes: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
      maxEdges: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
      exceeded: ['nodes'],
    });
    expect(Object.isFrozen(prepared.hostPolicy.liveForceAvailability)).toBe(true);
    expect(Object.isFrozen(prepared.hostPolicy.liveForceAvailability.exceeded)).toBe(true);

    const renderVisual = vi.fn(() => <div>must not mount oversized visual</div>);
    const html = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        spec={spec}
        renderVisual={renderVisual}
        selectedId={null}
        onSelect={() => {}}
        hoverId={null}
        onHover={() => {}}
      />,
    );
    expect(renderVisual).not.toHaveBeenCalled();
    expect(html).not.toContain('must not mount oversized visual');
    expect(html).toContain(
      `has ${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1} nodes and 0 relationships`,
    );
    expect(html).toContain(prepared.caption);
    expect(html).toContain('Knowledge graph legend');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('Deterministic paginated knowledge graph record view');
    expect(html).toContain(`Nodes (${MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1})`);

    let filteredAvailability: unknown;
    const filtered = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        spec={spec}
        viewPolicy={{ nodeKinds: ['model'] }}
        renderVisual={(_scene, context) => {
          filteredAvailability = context.liveForceAvailability;
          return <div>eligible filtered visual</div>;
        }}
        selectedId={null}
        onSelect={() => {}}
        hoverId={null}
        onHover={() => {}}
      />,
    );
    expect(filtered).toContain('eligible filtered visual');
    expect(filteredAvailability).toEqual({
      status: 'available',
      nodeCount: 1,
      edgeCount: 0,
      maxNodes: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
      maxEdges: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
      exceeded: [],
    });
  });

  it('keeps hook order stable across rejected and accepted spec/view transitions', async () => {
    const renderVisual = vi.fn(() => <div data-visual="accepted">accepted</div>);
    const common = {
      renderVisual,
      selectedId: null,
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <KnowledgeGraphAccessibleFigure
          {...common}
          spec={getExamplePayload('nest.spike_raster')}
        />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('figure rejected');
    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure {...common} spec={corpusSpec()} />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('accepted');

    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure
          {...common}
          spec={corpusSpec()}
          viewPolicy={{ nodeKinds: ['source-kind-that-is-absent'] }}
        />,
      );
    });
    const rejectedView = JSON.stringify(renderer.toJSON());
    expect(rejectedView).toContain('view rejected');
    expect(rejectedView).toContain('Advisory graph');
    expect(rejectedView).toContain('Deterministic paginated knowledge graph record view');
    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure
          {...common}
          spec={corpusSpec()}
          viewPolicy={undefined}
        />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('accepted');
    await act(async () => renderer.unmount());
  });

  it('atomically resets record pagination for a new exact presentation token', async () => {
    const presentation = (prefix: string) => prepareKnowledgeGraphPresentation({
      contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
      profile: 'generic_visual',
      graphIdentity: 'same-caller-namespace',
      nodes: Array.from({ length: 12 }, (_, index) => ({
        id: `${prefix}:${String(index).padStart(2, '0')}`,
        label: `${prefix} node ${String(index).padStart(2, '0')}`,
        kind: 'model',
        color: '#ffffff',
        radius: 4,
      })),
      edges: [],
    });
    const first = presentation('first');
    const second = presentation('second');
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<KnowledgeGraphStaticRecordView presentation={first} />);
    });
    const next = renderer.root.findAllByType('button').find((button) =>
      button.props.children === 'Next node records');
    if (next === undefined) throw new Error('next-node-records control required');
    await act(async () => next.props.onClick());
    const nodePageText = () => renderer.root.findAllByType('p')
      .map((paragraph) => paragraph.children.join(''))
      .find((text) => text.startsWith('Node page '));
    expect(nodePageText()).toBe('Node page 2 of 2');
    expect(JSON.stringify(renderer.toJSON())).toContain('first node 10');

    await act(async () => {
      renderer.update(<KnowledgeGraphStaticRecordView presentation={second} />);
    });
    const updated = JSON.stringify(renderer.toJSON());
    expect(nodePageText()).toBe('Node page 1 of 2');
    expect(updated).toContain('second node 00');
    expect(updated).not.toContain('second node 10');
    await act(async () => renderer.unmount());
  });

  it('converges stored record pages when a page-size change shrinks the range', async () => {
    const presentation = prepareKnowledgeGraphPresentation({
      contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
      profile: 'generic_visual',
      graphIdentity: 'page-size-convergence',
      nodes: Array.from({ length: 100 }, (_, index) => ({
        id: `node:${String(index).padStart(3, '0')}`,
        label: `Node ${String(index).padStart(3, '0')}`,
        kind: 'model',
        color: '#ffffff',
        radius: 4,
      })),
      edges: [],
    });
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <KnowledgeGraphStaticRecordView
          presentation={presentation}
          nodePageSize={10}
        />,
      );
    });
    const pageText = () => renderer.root.findAllByType('p')
      .map((paragraph) => paragraph.children.join(''))
      .find((text) => text.startsWith('Node page '));
    for (let page = 1; page < 10; page++) {
      const next = renderer.root.findAllByType('button').find((button) =>
        button.props.children === 'Next node records');
      if (next === undefined) throw new Error('next-node-records control required');
      await act(async () => next.props.onClick());
    }
    expect(pageText()).toBe('Node page 10 of 10');

    await act(async () => {
      renderer.update(
        <KnowledgeGraphStaticRecordView
          presentation={presentation}
          nodePageSize={25}
        />,
      );
    });
    expect(pageText()).toBe('Node page 4 of 4');
    const previous = renderer.root.findAllByType('button').find((button) =>
      button.props.children === 'Previous node records');
    if (previous === undefined) throw new Error('previous-node-records control required');
    await act(async () => previous.props.onClick());
    expect(pageText()).toBe('Node page 3 of 4');
    await act(async () => renderer.unmount());
  });

  it('shares one exact filtered view across the visual, legend, DOM list, and full record browser', () => {
    const prepared = prepareCorpusKnowledgeGraphFigure(corpusSpec());
    if (!prepared.ok) throw new Error('valid corpus fixture required');
    const kinds = [...new Set(prepared.presentation.nodes.map(({ kind }) => kind))];
    expect(kinds.length).toBeGreaterThan(1);
    const retainedKind = kinds[0];
    const hidden = prepared.presentation.nodes.find(({ kind }) => kind !== retainedKind)!;
    let visualScene: ReactElement<{ view?: PreparedKnowledgeGraphViewV1 }> | undefined;
    let visualContextView: PreparedKnowledgeGraphViewV1 | undefined;
    const html = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        spec={corpusSpec()}
        viewPolicy={{ nodeKinds: [retainedKind] }}
        renderVisual={(scene, context) => {
          visualScene = scene as ReactElement<{ view?: PreparedKnowledgeGraphViewV1 }>;
          visualContextView = context.view;
          return <div>filtered visual</div>;
        }}
        selectedId={hidden.id}
        onSelect={() => {}}
        hoverId={hidden.id}
        onHover={() => {}}
      />,
    );
    const view = visualScene?.props.view as PreparedKnowledgeGraphViewV1;
    expect(isPreparedKnowledgeGraphView(view)).toBe(true);
    expect(visualContextView).toBe(view);
    expect(view.counts.visibleNodes).toBeLessThan(view.counts.sourceNodes);
    expect(html).toContain(
      `Filtered view: showing ${view.counts.visibleNodes} of ${view.counts.sourceNodes}`,
    );
    expect(html).toContain('The paginated records below remain the full source presentation.');
    expect(html).not.toContain('aria-pressed="true"');

    const directView = prepareKnowledgeGraphView(prepared.presentation, {
      nodeKinds: [retainedKind],
    });
    expect(() => KnowledgeGraph3DScene({
      presentation: prepared.presentation as never,
      view: directView,
      selectedId: hidden.id,
      query: '',
      onSelect: () => {},
      hoverId: hidden.id,
      onHover: () => {},
      autoFrame: true,
    })).toThrow(/only generic_visual/);
    expect(() => KnowledgeGraphA11yList({
      presentation: prepared.presentation as never,
      view: directView,
      selectedId: hidden.id,
      onSelect: () => {},
    })).toThrow(/only generic_visual/);
    expect(() => KnowledgeGraphLegend({
      presentation: prepared.presentation as never,
      view: directView,
    })).toThrow(/only generic_visual/);
    expect(() => KnowledgeGraphStaticRecordView({
      presentation: prepared.presentation as never,
      view: directView,
    })).toThrow(/only generic_visual/);
  });

  it('invalidates hidden controlled focus once per exact source/view transition', async () => {
    const prepared = prepareCorpusKnowledgeGraphFigure(corpusSpec());
    if (!prepared.ok) throw new Error('valid corpus fixture required');
    const retained = prepared.presentation.nodes[0].kind;
    const hidden = prepared.presentation.nodes.find(({ kind }) => kind !== retained);
    if (hidden === undefined) throw new Error('multi-kind corpus fixture required');
    const onSelect = vi.fn();
    const onHover = vi.fn();
    const props = {
      spec: corpusSpec(),
      renderVisual: () => <div>visual</div>,
      selectedId: hidden.id,
      onSelect,
      hoverId: hidden.id,
      onHover,
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <KnowledgeGraphAccessibleFigure
          {...props}
          viewPolicy={{ nodeKinds: [retained] }}
        />,
      );
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(onHover).toHaveBeenCalledTimes(1);
    expect(onHover).toHaveBeenLastCalledWith(null);

    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure
          {...props}
          viewPolicy={{ nodeKinds: [retained] }}
        />,
      );
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onHover).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });

  it('retains the bound caption and DOM records after a caught client descendant failure', async () => {
    const spec = corpusSpec();
    const gated = validateSpec(spec);
    if (!gated.ok || gated.caption === null) throw new Error('valid corpus fixture required');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Failure = () => {
      throw new Error('client descendant render failure');
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <KnowledgeGraphAccessibleFigure
          spec={spec}
          renderVisual={() => <Failure />}
          selectedId={null}
          onSelect={() => {}}
          hoverId={null}
          onHover={() => {}}
        />,
      );
    });
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain('host-owned interactive 3D view is unavailable');
    expect(output).toContain(gated.caption);
    expect(output).toContain('Knowledge graph legend');
    expect(output).toContain('Deterministic paginated knowledge graph record view');
    await act(async () => renderer.unmount());
    consoleError.mockRestore();
  });

  it('fails closed for the wrong skill and has no independent caption input', () => {
    const wrong = getExamplePayload('nest.spike_raster')!;
    const html = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        spec={wrong}
        renderVisual={() => <div>must not render</div>}
        selectedId={null}
        onSelect={() => {}}
        hoverId={null}
        onHover={() => {}}
      />,
    );
    expect(html).toContain('Knowledge graph figure rejected');
    expect(html).toContain('requires corpus.knowledge_graph');
    expect(html).not.toContain('must not render');

    const exportSpec = structuredClone(corpusSpec()) as { mode: string };
    exportSpec.mode = 'export';
    const renderVisual = vi.fn(() => <div>must not export through Canvas</div>);
    const exportHtml = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        spec={exportSpec}
        renderVisual={renderVisual}
        selectedId={null}
        onSelect={() => {}}
        hoverId={null}
        onHover={() => {}}
      />,
    );
    expect(exportHtml).toContain('requires interactive mode');
    expect(renderVisual).not.toHaveBeenCalled();
  });

  it('requires exactly one own materialized or raw input at runtime', () => {
    const renderVisual = vi.fn(() => <div>must not render ambiguous input</div>);
    const common = {
      renderVisual,
      selectedId: null,
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    const renderUnchecked = (inputProps: Record<string, unknown>): string =>
      renderToStaticMarkup(
        <KnowledgeGraphAccessibleFigure
          {...({ ...common, ...inputProps } as unknown as ComponentProps<
            typeof KnowledgeGraphAccessibleFigure
          >)}
        />,
      );

    const both = renderUnchecked({
      spec: corpusSpec(),
      specJson: '{"skill":"first","skill":"second"}',
    });
    expect(both).toContain('provide exactly one own input property: spec or specJson');
    expect(both).not.toContain('must not render ambiguous input');

    const neither = renderUnchecked({});
    expect(neither).toContain('provide exactly one own input property: spec or specJson');

    const undefinedRaw = renderUnchecked({ specJson: undefined });
    expect(undefinedRaw).toContain('specJson must be a string');
    expect(renderVisual).not.toHaveBeenCalled();
  });

  it('retains a deceptive caller caption only as the isolated final unverified note', () => {
    const spec = structuredClone(corpusSpec()) as {
      provenance: { caption?: string };
    };
    spec.provenance.caption = 'Schematic — trust me as calibrated proof';
    const gated = validateSpec(spec);
    if (!gated.ok || gated.caption === null) throw new Error('valid corpus fixture required');
    const html = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        spec={spec}
        renderVisual={() => <div>visual</div>}
        selectedId={null}
        onSelect={() => {}}
        hoverId={null}
        onHover={() => {}}
      />,
    );
    expect(gated.caption.indexOf('Advisory graph —')).toBe(0);
    expect(gated.caption.indexOf('Schematic — illustrative')).toBeGreaterThan(0);
    expect(gated.caption.indexOf('Caller note (unverified):')).toBeGreaterThan(
      gated.caption.indexOf('Schematic — illustrative'),
    );
    expect(html).toContain(gated.caption);
    expect(html).toContain('<bdi dir="auto" style="unicode-bidi:isolate">');
  });

  it('does not overclaim SSR recovery and honors host-declared visual unavailability', () => {
    const props = {
      spec: corpusSpec(),
      selectedId: null,
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    expect(() => renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        {...props}
        renderVisual={() => { throw new Error('SSR visual failure'); }}
      />,
    )).toThrow(/SSR visual failure/);

    const unavailable = renderToStaticMarkup(
      <KnowledgeGraphAccessibleFigure
        {...props}
        visualAvailable={false}
        renderVisual={() => <div>must not mount</div>}
      />,
    );
    expect(unavailable).toContain('host-owned interactive 3D view is unavailable');
    expect(unavailable).not.toContain('must not mount');
    expect(unavailable).toContain('<figcaption');
  });

  it('retries only for a new source/view capability or explicit host retry key', async () => {
    const spec = corpusSpec();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail = true;
    const Failure = () => {
      throw new Error('client descendant render failure');
    };
    const renderVisual = vi.fn(() => fail
      ? <Failure />
      : <div data-recovered="true">recovered visual</div>);
    const props = {
      spec,
      renderVisual,
      selectedId: null,
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<KnowledgeGraphAccessibleFigure {...props} />);
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('view is unavailable');
    const callsAfterFailure = renderVisual.mock.calls.length;
    fail = false;
    await act(async () => {
      renderer.update(<KnowledgeGraphAccessibleFigure {...props} query="model" />);
    });
    expect(renderVisual).toHaveBeenCalledTimes(callsAfterFailure);
    expect(JSON.stringify(renderer.toJSON())).not.toContain('recovered visual');

    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure {...props} query="model" visualRetryKey={1} />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('recovered visual');

    fail = true;
    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure {...props} query="model" visualRetryKey={2} />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('view is unavailable');
    fail = false;
    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure
          {...props}
          query="model"
          visualRetryKey={2}
          viewPolicy={{ nodeKinds: [] }}
        />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('recovered visual');

    fail = true;
    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure {...props} query="model" visualRetryKey={2} />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('view is unavailable');
    fail = false;
    const sameContextNewSpec = structuredClone(spec);
    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure
          {...props}
          spec={sameContextNewSpec}
          query="model"
          visualRetryKey={2}
        />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('recovered visual');
    await act(async () => renderer.unmount());
    consoleError.mockRestore();
  });

  it('mounts and unmounts the host visual across declared availability transitions', async () => {
    const renderVisual = vi.fn(() => <div data-visual="mounted">visual</div>);
    const props = {
      spec: corpusSpec(),
      renderVisual,
      selectedId: null,
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <KnowledgeGraphAccessibleFigure {...props} visualAvailable={false} />,
      );
    });
    expect(renderVisual).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain('view is unavailable');
    await act(async () => {
      renderer.update(<KnowledgeGraphAccessibleFigure {...props} visualAvailable />);
    });
    expect(renderVisual).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(renderer.toJSON())).toContain('data-visual');
    await act(async () => {
      renderer.update(
        <KnowledgeGraphAccessibleFigure {...props} visualAvailable={false} />,
      );
    });
    const unavailable = JSON.stringify(renderer.toJSON());
    expect(unavailable).toContain('view is unavailable');
    expect(unavailable).not.toContain('data-visual');
    expect(unavailable).toContain('figcaption');
    await act(async () => {
      renderer.update(<KnowledgeGraphAccessibleFigure {...props} visualAvailable />);
    });
    expect(renderVisual).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount());
  });

  it('does not intercept errors from host-owned interaction callbacks', async () => {
    const onSelect = vi.fn(() => {
      throw new Error('host selection failure');
    });
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <KnowledgeGraphAccessibleFigure
          spec={corpusSpec()}
          renderVisual={() => <div>visual</div>}
          selectedId={null}
          onSelect={onSelect}
          hoverId={null}
          onHover={() => {}}
        />,
      );
    });
    const nodeButton = renderer.root.findAllByProps({
      className: 'cortexel-knowledge-graph-node',
    })[0];
    expect(() => nodeButton.props.onClick()).toThrow(/host selection failure/);
    await act(async () => renderer.unmount());
  });

  it('makes the corpus mapper a semantic gate and capability minting boundary', () => {
    const node = (id: string): KnowledgeGraph3DParams['nodes'][number] => ({
      id,
      kind: 'model',
      label: id,
      attributes: {},
      epistemic: EPISTEMIC,
      evidence: [{
        kind: 'external_source',
        evidence_id: `evidence:${id}`,
        source_id: `source:${id}`,
      }],
    });
    const params: KnowledgeGraph3DParams = {
      graph_id: 'graph:mapped',
      graph_source: 'engram:test',
      graph_snapshot_id: 'snapshot:mapped',
      graph_scope: 'corpus_entity',
      generated_at: '2026-07-31T00:00:00Z',
      nodes: [node('model:a')],
      edges: [],
    };
    const mapped = mapCorpusKnowledgeGraph(params, CORTEXEL_PALETTE);
    expect(isPreparedKnowledgeGraphPresentation(mapped)).toBe(true);
    expect(Object.isFrozen(mapped.nodes[0])).toBe(true);
    expect(mapped.profile).toBe('corpus_entity');
    expect(mapped.context.graph_id).toBe(params.graph_id);
    expect(mapped.mappingAuthority).toEqual({
      kind: 'corpus_visual_mapping',
      presentationInvariants:
        'bounded_closed_visual_records_redundant_kind_channels_and_graph_integrity',
      derivationAuthentication: 'not_performed',
      scientificAuthority: 'not_established',
    });
    expect(mapped.mappingAuthority).not.toHaveProperty('corpusSemantics');
    const inspectionRecord = serializePreparedKnowledgeGraphPresentation(mapped);
    expect(inspectionRecord).toContain(
      'bounded_closed_visual_records_redundant_kind_channels_and_graph_integrity',
    );
    expect(inspectionRecord).toContain('not_performed');
    expect(() => mapCorpusKnowledgeGraph({
      ...params,
      nodes: [{
        ...params.nodes[0],
        uncalibrated_score: {
          kind: 'retrieval_relevance',
          value: 0.5,
          calibrated_posterior: false,
        },
      }],
    } as KnowledgeGraph3DParams, CORTEXEL_PALETTE)).toThrow(
      /only allow score kind 'extraction_confidence'/,
    );
  });

  it('retains narrow corpus presentation checks if the exported Zod method is patched', () => {
    const valid = getExamplePayload('corpus.knowledge_graph')!.params as KnowledgeGraph3DParams;
    const invalid = structuredClone(valid) as KnowledgeGraph3DParams;
    (invalid.nodes[0] as { kind: string }).kind = 'unregistered_kind';
    const safeParse = vi.spyOn(KnowledgeGraph3DParamsSchema, 'safeParse').mockReturnValue({
      success: true,
      data: invalid,
    } as never);
    try {
      expect(() => mapCorpusKnowledgeGraph(invalid, CORTEXEL_PALETTE)).toThrow(
        /invalid kind/,
      );
    } finally {
      safeParse.mockRestore();
    }
  });

  it('rejects an unprepared object at every visual and DOM entrypoint', () => {
    const presentation = { ...prepareKnowledgeGraphPresentation(input()) } as never;
    expect(() => KnowledgeGraph3DScene({
      presentation,
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    })).toThrow(/require a capability/);
    expect(() => KnowledgeGraphA11yList({
      presentation,
      selectedId: null,
      onSelect: () => {},
    })).toThrow(/require a capability/);
    expect(() => KnowledgeGraphLegend({ presentation })).toThrow(/require a capability/);
    expect(() => KnowledgeGraphStaticRecordView({ presentation })).toThrow(
      /require a capability/,
    );
  });
});
