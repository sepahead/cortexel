import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { getExamplePayload } from '../core';
import {
  VizSpecRenderer,
  type RenderSceneArgs,
} from '../react/VizSpecRenderer';
import { KnowledgeGraphA11yList } from '../react/KnowledgeGraphA11yList';
import {
  NeuronA11yPager,
  PopulationA11yList,
} from '../react/SelectionA11yControls';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('VizSpecRenderer binds the strict gate at the DOM boundary', () => {
  it('passes parsed params to the host and renders the mandatory caption', () => {
    const spec = getExamplePayload('nest.voltage_trace')!;
    spec.params = { ...spec.params, units: '  mV  ' };
    let received: RenderSceneArgs | undefined;
    const html = renderToStaticMarkup(
      <VizSpecRenderer
        spec={spec}
        renderScene={(args) => {
          received = args;
          return <div data-scene={args.scene}>scene</div>;
        }}
      />,
    );

    expect(received?.scene).toBe('voltage-trace');
    expect(received?.skill).toBe('nest.voltage_trace');
    expect(received?.params.units).toBe('mV');
    expect(html).toContain('data-scene="voltage-trace"');
    expect(html).toContain('role="note"');
    expect(html).toContain('Scientific provenance disclosure');
    expect(html).toContain('Schematic');
  });

  it('shows actionable strict errors without calling host callbacks during render', () => {
    const renderScene = vi.fn(() => <div>unsafe</div>);
    const onError = vi.fn();
    const onInvocationError = vi.fn();
    const spec = getExamplePayload('nest.spike_raster')!;
    spec.params = { times_ms: [1, 2], senders: [1] };

    const html = renderToStaticMarkup(
      <VizSpecRenderer
        spec={spec}
        renderScene={renderScene}
        onError={onError}
        onInvocationError={onInvocationError}
      />,
    );

    expect(renderScene).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onInvocationError).not.toHaveBeenCalled();
    expect(html).toContain('role="alert"');
    expect(html).toContain('Fix the fields below');
    expect(html).toContain('senders length');
  });

  it('treats an explicitly blank skillId as a strict error, never a lenient fallback', () => {
    const html = renderToStaticMarkup(
      <VizSpecRenderer
        skillId=""
        spec={{
          scene: 'spike-raster',
          params: {},
          provenance: { source: 'x' },
        }}
        renderScene={() => <div>must not render</div>}
      />,
    );
    expect(html).toContain('Invalid skill invocation');
    expect(html).not.toContain('must not render');
  });

  it('cannot be downgraded by deleting skill; the trusted envelope path is explicit', () => {
    const spec = getExamplePayload('nest.spike_raster')!;
    delete spec.skill;
    const strict = renderToStaticMarkup(
      <VizSpecRenderer
        spec={spec}
        renderScene={() => <div>must not render</div>}
      />,
    );
    expect(strict).toContain('Invalid skill invocation');
    expect(strict).not.toContain('must not render');

    const trusted = renderToStaticMarkup(
      <VizSpecRenderer
        trustedEnvelope
        spec={spec}
        renderScene={() => <div>trusted showcase</div>}
      />,
    );
    expect(trusted).toContain('trusted showcase');
  });

  it('reuses validation but gives each render a fresh detached data snapshot', async () => {
    const original = getExamplePayload('nest.spike_raster')!;
    let paramScans = 0;
    original.params = new Proxy(original.params, {
      ownKeys(target) {
        paramScans += 1;
        return Reflect.ownKeys(target);
      },
    });
    const validatedLengths: number[] = [];
    const renderParams: Array<Readonly<Record<string, unknown>>> = [];
    const renderScene = (args: RenderSceneArgs) => {
      const senders = args.params.senders as readonly number[];
      validatedLengths.push(senders.length);
      renderParams.push(args.params);
      (senders as number[]).pop();
      return <div>scene</div>;
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <VizSpecRenderer spec={original} active renderScene={renderScene} />,
      );
    });
    const scansAfterValidation = paramScans;
    expect(scansAfterValidation).toBeGreaterThan(0);
    await act(async () => {
      renderer.update(
        <VizSpecRenderer spec={original} active={false} renderScene={renderScene} />,
      );
    });
    expect(paramScans).toBe(scansAfterValidation);
    expect(validatedLengths).toEqual([3, 3]);
    expect(renderParams[0]).not.toBe(renderParams[1]);
    await act(async () => renderer.unmount());
  });

  it('renders a fail-closed error for an unprintable hostile skill value', () => {
    const hostileSkill = {
      toString() {
        throw new Error('boom');
      },
    };
    expect(() =>
      renderToStaticMarkup(
        <VizSpecRenderer
          spec={{
            skill: hostileSkill,
            scene: 'spike-raster',
            params: {},
            provenance: { source: 'x' },
          }}
          renderScene={() => <div>must not render</div>}
        />,
      ),
    ).not.toThrow();
  });

  it('does not invoke an embedded skill accessor during render validation', () => {
    let reads = 0;
    const spec = getExamplePayload('nest.spike_raster')! as Record<string, unknown>;
    Object.defineProperty(spec, 'skill', {
      enumerable: true,
      get() {
        reads += 1;
        return 'nest.spike_raster';
      },
    });
    const html = renderToStaticMarkup(
      <VizSpecRenderer
        spec={spec}
        renderScene={() => <div>must not render</div>}
      />,
    );
    expect(reads).toBe(0);
    expect(html).toContain('Invalid skill invocation');
    expect(html).not.toContain('must not render');
  });

  it('reports unsupported export mode without pretending to render a scene', () => {
    const renderScene = vi.fn(() => <div>scene</div>);
    const spec = { ...getExamplePayload('nest.spike_raster')!, mode: 'export' as const };
    const html = renderToStaticMarkup(
      <VizSpecRenderer spec={spec} renderScene={renderScene} />,
    );
    expect(renderScene).not.toHaveBeenCalled();
    expect(html).toContain('role="status"');
    expect(html).toContain('Headless export rendering is not available');
  });

  it('can place the same mandatory caption in flow without suppressing disclosure', () => {
    const spec = getExamplePayload('nest.spike_raster')!;
    const html = renderToStaticMarkup(
      <VizSpecRenderer
        spec={spec}
        captionPlacement="footer"
        renderScene={() => <div>scene</div>}
      />,
    );
    expect(html).toContain('scene');
    expect(html).toContain('role="note"');
    expect(html).toContain('Schematic');
    expect(html).toMatch(
      /class="cortexel-honesty-caption"[^>]*style="[^"]*position:relative/,
    );
    expect(html).toContain('width:100%');
    expect(html).toContain('box-sizing:border-box');
  });
});

describe('KnowledgeGraphA11yList mirrors WebGL semantics into operable DOM', () => {
  it('renders real buttons, selection state, kinds, and directed relationships', () => {
    const html = renderToStaticMarkup(
      <KnowledgeGraphA11yList
        nodes={[
          { id: 'p1', label: 'Paper', kind: 'paper', color: '#ffffff', radius: 4 },
          { id: 'm1', label: 'Model', kind: 'model', color: '#ffffff', radius: 4 },
        ]}
        edges={[
          {
            source: 'p1',
            target: 'm1',
            kind: 'instantiates',
            color: '#ffffff',
            directed: true,
          },
        ]}
        selectedId="p1"
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('<button');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('paper.');
    expect(html).toContain('instantiates: points to Model');
    expect(html).toContain('min-width:44px');
  });

  it('has an explicit empty state', () => {
    const html = renderToStaticMarkup(
      <KnowledgeGraphA11yList
        nodes={[]}
        edges={[]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('No graph nodes match this view');
  });

  it('bounds relationship announcements and paginates full selected-node detail', () => {
    const nodes = [
      { id: 'hub', label: 'Hub', kind: 'paper' as const, color: '#fff', radius: 4 },
      ...Array.from({ length: 999 }, (_, index) => ({
        id: `p${index}`,
        label: `Paper ${index} ${'x'.repeat(200)}`,
        kind: 'paper' as const,
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
    const html = renderToStaticMarkup(
      <KnowledgeGraphA11yList
        nodes={nodes}
        edges={edges}
        selectedId="hub"
        query="Hub"
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('991 more relationships');
    expect(html).toContain('Browse all 999 relationships');
    expect(html).toContain('Page 1 of 40');
    expect(html.length).toBeLessThan(30_000);
  });

  it('paginates the node rows instead of mounting the full graph into the DOM', () => {
    const nodes = Array.from({ length: 1_000 }, (_, index) => ({
      id: `p${index}`,
      label: `Node ${index}`,
      kind: 'paper' as const,
      color: '#fff',
      radius: 4,
    }));
    const html = renderToStaticMarkup(
      <KnowledgeGraphA11yList
        nodes={nodes}
        edges={[]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('Node page 1 of 10; 1000 nodes');
    expect(html).toContain('Node 99');
    expect(html).not.toContain('Node 100</button>');
    expect(html.length).toBeLessThan(100_000);
  });

  it('server-renders the page containing an existing selected node', () => {
    const nodes = Array.from({ length: 1_000 }, (_, index) => ({
      id: `n${index}`,
      label: `Node ${index}`,
      kind: 'paper' as const,
      color: '#fff',
      radius: 4,
    }));
    const html = renderToStaticMarkup(
      <KnowledgeGraphA11yList
        nodes={nodes}
        edges={[]}
        selectedId="n950"
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('Node page 10 of 10; 1000 nodes');
    expect(html).toContain('Node 950');
    expect(html).toContain('aria-pressed="true"');
  });

  it('does not derive DOM ids from ill-formed graph identifiers', () => {
    expect(() => renderToStaticMarkup(
      <KnowledgeGraphA11yList
        nodes={[
          { id: '\ud800', label: 'Surrogate id', kind: 'paper', color: '#fff', radius: 4 },
        ]}
        edges={[]}
        selectedId={null}
        onSelect={() => {}}
      />,
    )).not.toThrow();
  });

  it('escapes visual-order controls even when the graph companion is called directly', () => {
    const html = renderToStaticMarkup(
      <KnowledgeGraphA11yList
        label={'Graph\u202econtrols'}
        nodes={[
          {
            id: 'p1',
            label: 'Paper\u202eevil',
            kind: 'paper\u061cspoof',
            color: '#fff',
            radius: 4,
          },
        ]}
        edges={[]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );
    expect(html).not.toContain('\u202e');
    expect(html).not.toContain('\u061c');
    expect(html).toContain('Paper\\u202eevil');
    expect(html).toContain('paper\\u061cspoof');
    expect(html).toContain('Graph\\u202econtrols');
  });
});

describe('population and neuron DOM companions', () => {
  it('exposes population selection as real pressed-state buttons', () => {
    const html = renderToStaticMarkup(
      <PopulationA11yList
        populations={[{ id: 'E', label: 'Excitatory' }, { id: 'I', label: 'Inhibitory' }]}
        selectedId="E"
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Excitatory');
    expect(html).toContain('min-width:44px');
  });

  it('paginates large neuron selections into bounded keyboard controls', () => {
    const html = renderToStaticMarkup(
      <NeuronA11yPager
        count={1_000}
        selectedIndex={null}
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('Neuron page 1 of 20');
    expect(html).toContain('Neuron 50');
    expect(html).not.toContain('Neuron 51</button>');
    expect(html.length).toBeLessThan(30_000);
  });

  it('escapes visual-order controls from direct population and neuron labels', () => {
    const populations = renderToStaticMarkup(
      <PopulationA11yList
        populations={[{
          id: 'E',
          label: 'Excitatory\u202espoof',
          description: 'Population\u061cnote',
        }]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );
    const neurons = renderToStaticMarkup(
      <NeuronA11yPager
        count={1}
        selectedIndex={null}
        getLabel={() => 'Neuron\u202espoof'}
        onSelect={() => {}}
      />,
    );
    expect(`${populations}${neurons}`).not.toMatch(/[\u061c\u202e]/u);
    expect(populations).toContain('Excitatory\\u202espoof');
    expect(populations).toContain('Population\\u061cnote');
    expect(neurons).toContain('Neuron\\u202espoof');
  });
});
