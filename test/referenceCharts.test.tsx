import { readFileSync, readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import {
  CORTEXEL_PALETTE,
  getExamplePayload,
  getHostRendererExamplePayload,
} from '../core';
import {
  REFERENCE_CHART_SKILLS,
  ReferenceChartScene,
  ReferenceVizSpecFigure,
  aggregateDegreeBins,
  aggregateUniformHistogramBins,
  boundedStemPointPaths,
  binnedStepPath,
  boundedExtremaIndices,
  chartX,
  chartY,
  circleTopologyGeometry,
  equalAspectDomains,
  histogramBarPath,
  linePath,
  matrixValueBucketPaths,
  numericDomain,
  phasePlaneArrowPath,
  phasePlaneSamples,
  rasterTickPath,
  sortedLinePath,
  stemPath,
  tickValues,
  variableHistogramPath,
  type ChartFrame,
} from '../react/charts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const frame: ChartFrame = {
  width: 400,
  height: 240,
  left: 50,
  right: 20,
  top: 20,
  bottom: 40,
};

function renderSkill(skill: (typeof REFERENCE_CHART_SKILLS)[number]): string {
  return renderToStaticMarkup(
    <ReferenceVizSpecFigure spec={getExamplePayload(skill)!} />,
  );
}

function renderDirectChart(
  skill: string,
  scene: Parameters<typeof ReferenceChartScene>[0]['scene'],
  params: Record<string, unknown>,
): string {
  return renderToStaticMarkup(
    <ReferenceChartScene
      skill={skill}
      scene={scene}
      themeMode="dark"
      active
      palette={CORTEXEL_PALETTE}
      params={params}
      provenance={{
        source: 'direct-reference-chart-test',
        calibrated_posterior: false,
        advisory_only: true,
        is_paper_local_evidence: false,
        synthetic: true,
      }}
    />,
  );
}

describe('ReferenceVizSpecFigure renders checked canonical SVG charts', () => {
  it('covers all nineteen declared chart skills with an accessible SVG and bound caption', () => {
    expect(REFERENCE_CHART_SKILLS).toHaveLength(19);
    for (const skill of REFERENCE_CHART_SKILLS) {
      const html = renderSkill(skill);
      expect(html, skill).toContain('<svg');
      expect(html, skill).toContain('role="img"');
      expect(html, skill).toContain(`<title`);
      expect(html, skill).toContain('<desc');
      expect(html, skill).toContain(`data-skill="${skill}"`);
      expect(html, skill).toContain('role="note"');
      expect(html, skill).toContain('Scientific provenance disclosure');
      expect(html, skill).toMatch(
        /class="cortexel-honesty-caption"[^>]*style="[^"]*position:relative/,
      );
      expect(html, skill).not.toMatch(/(?:NaN|Infinity)/);
    }
  });

  it('renders labeled voltage series from the exact checked fields', () => {
    const html = renderSkill('nest.voltage_trace');
    expect(html).toContain('V_m trace');
    expect(html).toContain('Time (ms)');
    expect(html).toContain('V_m (mV)');
    expect(html).toContain('neuron 1 · V_m');
    expect(html.match(/data-mark="trace-line"/g)).toHaveLength(1);
  });

  it('labels astrocyte data as glial analog evidence, never membrane voltage', () => {
    const html = renderSkill('nest.astrocyte_dynamics');
    expect(html).toContain('Ca dynamics');
    expect(html).toContain('This is not membrane voltage');
    expect(html).toContain('glial analog trace, not voltage');
    expect(html).toContain('Derived view');
    expect(html).toContain('declared glial concentration trace');
    expect(html).not.toContain('IP₃');
  });

  it('preserves every exact raster event without inventing a population-rate strip', () => {
    const html = renderSkill('nest.spike_raster');
    expect(html).toContain('data-mark="spike-events"');
    expect(html).toContain('data-event-count="3"');
    expect(html).toContain('3 spikes • 2 senders • exact event times');
    expect(html).toContain('No rate bins or synthetic events are added');
    expect(html).not.toContain('population-rate');
  });

  it('uses bounded actual sender IDs for categorical raster ticks', () => {
    const spec = getExamplePayload('nest.spike_raster')!;
    spec.params = { times_ms: [1, 2, 3], senders: [2, 10, 42] };
    spec.provenance.declared_inputs!.sender_ids = '[2,10,42]';
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html).toContain('>2</text>');
    expect(html).toContain('>10</text>');
    expect(html).toContain('>42</text>');
    expect(html).not.toContain('>12</text>');
    expect(html).not.toContain('>22</text>');
    expect(html).not.toContain('>32</text>');
  });

  it('renders the F–I curve with declared stimulus units and rate audit context', () => {
    const html = renderSkill('nest.rate_response');
    expect(html).toContain('F–I response');
    expect(html).toContain('Stimulus (pA)');
    expect(html).toContain('Firing rate (Hz)');
    expect(html).toContain('counting window 100 ms');
    expect(html).toContain('data-mark="fi-line"');
    expect(html).toContain('data-mark="fi-points"');
  });

  it('renders population rates as literal steps with the auditable count formula and series summary', () => {
    const html = renderSkill('nest.population_rate');
    expect(html).toContain('Population firing rate');
    expect(html).toContain('Population rate (Hz)');
    expect(html).toContain('window [0, 15) ms');
    expect(html).toContain(
      'rates_hz = spike_counts × 1000 ÷ (recorded_sender_count × bin_width_ms)',
    );
    expect(html).toContain('Binning: left_closed_right_open');
    expect(html).toContain('aggregation: selected_senders');
    expect(html).toContain('normalization: mean_per_recorded_sender_hz');
    expect(html).toContain('aria-label="Series legend"');
    expect(html).toContain('aria-label="Series summary"');
    expect(html).toContain('Excitatory population (id E): 2 recorded senders');
    expect(html).toContain('rate range 100–400 Hz');
    expect(html).toContain('data-mark="population-rate-steps"');
    expect(html).toContain('data-source-bin-count="3"');
    expect(html).toContain('data-rendered-bin-count="3"');
    expect(html).toContain('data-compacted="false"');
    const path = html.match(/data-mark="population-rate-steps"[^>]*d="([^"]+)"/)?.[1];
    expect(path).toBeDefined();
    expect(path).not.toContain('L');
    expect(path).toContain('H');
    expect(path).toContain('V');
  });

  it('keeps multiple population series distinct in geometry, legend, and accessible detail', () => {
    const spec = getExamplePayload('nest.population_rate')!;
    const params = spec.params as typeof spec.params & {
      series: Array<Record<string, unknown>>;
    };
    params.series.push({
      id: 'I',
      label: 'Inhibitory population',
      recorded_sender_count: 4,
      spike_counts: [0, 2, 4],
      rates_hz: [0, 100, 200],
    });
    spec.provenance.declared_inputs!.sender_ids = '[1,2,3,4,5,6]';
    spec.provenance.declared_inputs!.population_labels = 'E,I';
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html.match(/data-mark="population-rate-steps"/g)).toHaveLength(2);
    expect(html).toContain('Excitatory population (E)');
    expect(html).toContain('Inhibitory population (I)');
    expect(html).toContain('Inhibitory population (id I): 4 recorded senders');
    expect(html).toContain('2 exact checked population-rate series');
  });

  it('renders the ISI histogram with exact bin and normalization semantics', () => {
    const html = renderSkill('nest.isi_distribution');
    expect(html).toContain('Inter-spike interval distribution');
    expect(html).toContain('Inter-spike interval (ms)');
    expect(html).toContain('count • per_sender • bin 1 ms');
    expect(html).toContain('data-bar-count="3"');
  });

  it('renders PSTH trial/alignment semantics and a persistent t=0 cue', () => {
    const html = renderSkill('nest.psth');
    expect(html).toContain('Peri-stimulus time histogram');
    expect(html).toContain('rate_hz • 1 trials • bin 5 ms');
    expect(html).toContain('Time from alignment event (ms)');
    expect(html).toContain('data-mark="alignment-zero"');
    expect(html).toContain('t=0: simulation origin');
  });

  it('renders a correlogram as oriented stems/points with a non-data zero reference', () => {
    const html = renderSkill('nest.correlogram');
    expect(html).toContain('Spike-train correlogram');
    expect(html).toContain('E → E');
    expect(html).toContain('raw_pair_count (count)');
    expect(html).toContain('bin 1 ms');
    expect(html).toContain('τ range ±2 ms');
    expect(html).toContain('Counting window: [0, 1000) ms');
    expect(html).toContain('Lag convention: positive_target_after_reference');
    expect(html).toContain('Binning: left_closed_right_open');
    expect(html).toContain('Zero-lag policy: included');
    expect(html).toContain('does not invent a bin');
    expect(html).toContain('data-mark="zero-lag-reference"');
    expect(html).toContain('data-zero-bin-present="true"');
    expect(html).toContain('data-mark="correlogram-stems"');
    expect(html).toContain('data-mark="correlogram-points"');
    expect(html).toContain('data-bin-count="5"');
    expect(html).toContain('data-source-bin-count="5"');
    expect(html).toContain('data-rendered-bin-count="5"');
    expect(html).toContain('data-compacted="false"');
    expect(html).toContain('no interpolation or mirroring');
  });

  it('preserves signed asymmetric correlogram values and statistic units', () => {
    const spec = getExamplePayload('nest.correlogram')!;
    spec.params = {
      ...spec.params,
      values: [-0.4, 0.15, 0, 0.65, -0.1],
      statistic: { kind: 'pearson_coefficient', units: '1', sample_count: 100 },
    };
    spec.provenance.declared_inputs!.correlation_normalization = 'pearson_coefficient';
    spec.provenance.declared_inputs!.correlation_units = '1';
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html).toContain('pearson_coefficient (1), 100 samples');
    expect(html).toContain('Signed values and lag asymmetry are preserved');
    expect(html).toContain('data-bin-count="5"');
    expect(html).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('renders connection-weight bins with units and snapshot time', () => {
    const html = renderSkill('nest.weight_histogram');
    expect(html).toContain('Connection-weight distribution');
    expect(html).toContain('Connection weight (pA)');
    expect(html).toContain('snapshot 1000 ms');
    expect(html).toContain('data-bar-count="5"');
  });

  it('renders only measured plasticity weights and states what is absent', () => {
    const html = renderSkill('nest.plasticity_dynamics');
    expect(html).toContain('Synaptic weight dynamics');
    expect(html).toContain('Weight (nS)');
    expect(html).toContain('does not invent an STDP window or pre/post spike protocol');
    expect(html).toContain('data-mark="weight-line"');
  });

  it('renders the checked phase vector field in declared axis order only', () => {
    const html = renderSkill('nest.phase_plane');
    expect(html).toContain('Phase-plane vector field');
    expect(html).toContain('v (mV)');
    expect(html).toContain('w (1)');
    expect(html).toContain('2×2 grid');
    expect(html).toContain('row-major, last axis fastest');
    expect(html).toContain('data-vector-count="4"');
    expect(html).toContain('vector units v: mV/ms; w: 1/ms');
    expect(html).toContain('Derivative units are mV/ms for v and 1/ms for w');
    expect(html).toContain('No trajectory, nullcline, or equilibrium is invented');
  });

  it('uses the supplied active palette and clamps unsafe presentation dimensions', () => {
    const palette = {
      ...CORTEXEL_PALETTE,
      cyan: '#123456',
    };
    const html = renderToStaticMarkup(
      <ReferenceVizSpecFigure
        spec={getExamplePayload('nest.voltage_trace')!}
        activePalette={palette}
        width={100}
        height={10_000}
      />,
    );
    expect(html).toContain('stroke="#123456"');
    expect(html).toContain('viewBox="0 0 320 4096"');
    expect(html).toContain('width="320"');
    expect(html).toContain('height="4096"');
  });

  it('keeps a narrow multi-series plot meaningful and moves label identity into its description', () => {
    const spec = getExamplePayload('nest.voltage_trace')!;
    spec.params = {
      times_ms: [0, 1, 2],
      series: [[-65, -64, -63], [-62, -61, -60]],
      series_labels: ['neuron 1 · V_m', 'neuron 2 · V_m'],
      units: 'mV',
    };
    const html = renderToStaticMarkup(
      <ReferenceVizSpecFigure spec={spec} width={320} height={240} />,
    );
    expect(html).toContain('data-plot-width="210"');
    expect(html).not.toContain('aria-label="Series legend"');
    expect(html).toContain('Series: neuron 1 · V_m; neuron 2 · V_m');
    expect(html.match(/data-mark="trace-line"/g)).toHaveLength(2);
  });

  it('ships intrinsic SVG sizing and keeps a long mandatory caption after the figure', () => {
    const spec = getExamplePayload('nest.spike_raster')!;
    spec.provenance.caption = 'audit context '.repeat(24).trim();
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html).toContain('style="margin:0;width:960px;max-width:100%"');
    expect(html).toContain('height:auto');
    expect(html).toContain('box-sizing:border-box');
    expect(html).toContain('Caller note (unverified)');
    expect(html.indexOf('</figure>')).toBeLessThan(
      html.indexOf('class="cortexel-honesty-caption"'),
    );
  });

  it('does not mutate agent-owned numeric arrays while ordering an F–I line', () => {
    const spec = getExamplePayload('nest.rate_response')!;
    spec.params = {
      stimulus_amplitudes: [200, 0, 100],
      rates_hz: [31, 0, 12],
      stimulus_units: 'pA',
    };
    const before = JSON.stringify(spec);
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html).toContain('data-mark="fi-line"');
    expect(JSON.stringify(spec)).toBe(before);
  });

  it('rejects bidi/control provenance at the strict boundary and sanitizes direct display defensively', () => {
    const spec = getExamplePayload('nest.voltage_trace')!;
    spec.provenance.declared_inputs!.recorded_variable = 'V_m\u202eaxes';
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html).toContain('Invalid skill invocation');
    expect(html).not.toContain('V_m\u202eaxes trace');
    expect(html).not.toContain('<svg');

    const direct = renderToStaticMarkup(
      <ReferenceChartScene
        skill="nest.voltage_trace"
        scene="voltage-trace"
        themeMode="dark"
        active
        palette={CORTEXEL_PALETTE}
        params={getExamplePayload('nest.voltage_trace')!.params}
        provenance={{
          source: 'direct-defense-test',
          calibrated_posterior: false,
          advisory_only: true,
          is_paper_local_evidence: false,
          synthetic: true,
          declared_inputs: { recorded_variable: 'V_m\u202eaxes' },
        }}
      />,
    );
    expect(direct).toContain('V_m\\u202eaxes trace');
    expect(direct).not.toContain('V_m\u202eaxes trace');
  });
});

describe('React-only topology and connection-analysis figures', () => {
  const matrixBase = {
    source_ids: [1, 2],
    target_ids: [3, 4],
    axis_order: 'target_rows_source_columns',
    absent_cell: 'no_connection',
    sample_policy: 'complete',
    connection_count: 3,
    snapshot_time_ms: 25,
    snapshot_scope: { kind: 'mpi_all_ranks_merged', world_size: 4 },
  };

  it('renders all three sparse matrix skills with exact cells and absent-versus-zero disclosure', () => {
    const examples = [
      {
        skill: 'nest.adjacency_matrix',
        title: 'Connection adjacency matrix',
        params: {
          ...matrixBase,
          cells: [
            { source_id: 1, target_id: 3, connection_count: 2 },
            { source_id: 2, target_id: 4, connection_count: 1 },
          ],
          display: 'binary_presence',
          aggregation: 'any_connection',
        },
      },
      {
        skill: 'nest.weight_matrix',
        title: 'Connection-weight matrix',
        params: {
          ...matrixBase,
          cells: [
            { source_id: 1, target_id: 3, connection_count: 2, value: 0 },
            { source_id: 2, target_id: 4, connection_count: 1, value: -2 },
          ],
          weight_units: 'nS',
          aggregation: 'sum',
        },
      },
      {
        skill: 'nest.delay_matrix',
        title: 'Connection-delay matrix',
        params: {
          ...matrixBase,
          cells: [
            { source_id: 1, target_id: 3, connection_count: 2, value: 1.5 },
            { source_id: 2, target_id: 4, connection_count: 1, value: 3 },
          ],
          delay_units: 'ms',
          aggregation: 'mean',
        },
      },
    ];
    for (const example of examples) {
      const html = renderDirectChart(example.skill, 'connection-matrix', example.params);
      expect(html, example.skill).toContain(example.title);
      expect(html, example.skill).toContain('data-mark="matrix-cells"');
      expect(html, example.skill).toContain('data-source-cell-count="2"');
      expect(html, example.skill).toContain('data-rendered-cell-count="2"');
      expect(html, example.skill).toContain('data-absent-cell="no_connection"');
      expect(html, example.skill).toContain('target_rows_source_columns');
      expect(html, example.skill).toContain('absent: no connection');
      expect(html, example.skill).toContain('present zero');
      expect(html, example.skill).toContain('mpi_all_ranks_merged');
      expect(html, example.skill).toContain('MPI ownership');
      expect(html, example.skill).toContain('aria-label="Matrix data ordered as source-axis columns, target-axis rows, then present cells"');
      expect(html, example.skill).toContain('Source-axis column 1 of 2 (declared order): node ID 1.');
      expect(html, example.skill).toContain('Target-axis row 1 of 2 (declared order): node ID 3.');
      expect(html, example.skill).toContain('Present-cell record 1 of 2: target node ID 3 at declared row 1, source node ID 1 at declared column 1');
      expect(html, example.skill).not.toMatch(/(?:NaN|Infinity)/);
      expect(html.match(/data-mark="matrix-value-bucket"/g)?.length ?? 0).toBeLessThanOrEqual(17);
    }
    const weighted = renderDirectChart(
      examples[1].skill,
      'connection-matrix',
      examples[1].params,
    );
    expect(weighted).toContain('data-present-zero-count="1"');
  });

  it('exposes isolated matrix axes in exact non-monotonic declared order', () => {
    const html = renderDirectChart('nest.adjacency_matrix', 'connection-matrix', {
      ...matrixBase,
      source_ids: [9, 1, 7],
      target_ids: [4, 2, 8],
      cells: [{ source_id: 1, target_id: 2, connection_count: 1 }],
      connection_count: 1,
      display: 'binary_presence',
      aggregation: 'any_connection',
    });
    const orderedRows = [
      'Source-axis column 1 of 3 (declared order): node ID 9.',
      'Source-axis column 2 of 3 (declared order): node ID 1.',
      'Source-axis column 3 of 3 (declared order): node ID 7.',
      'Target-axis row 1 of 3 (declared order): node ID 4.',
      'Target-axis row 2 of 3 (declared order): node ID 2.',
      'Target-axis row 3 of 3 (declared order): node ID 8.',
      'Present-cell record 1 of 1: target node ID 2 at declared row 2, source node ID 1 at declared column 2; 1 connection; binary presence.',
    ];
    let previous = -1;
    for (const row of orderedRows) {
      const position = html.indexOf(row);
      expect(position, row).toBeGreaterThan(previous);
      previous = position;
    }
    expect(html).toContain('rows 1–7 of 7; page 1 of 1');
  });

  it('renders a deterministic directed circle graph with isolates, multapses, and autapses', () => {
    const html = renderDirectChart('nest.connection_graph', 'network-topology', {
      nodes: [
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
        { id: 3, label: 'isolated three' },
      ],
      edges: [
        { id: 'connection:1:2:0:1:0', source: 1, target: 2, weight: 1, delay_ms: 1, synapse_model: 'static' },
        { id: 'connection:1:2:0:2:0', source: 1, target: 2, weight: 2, delay_ms: 2, synapse_model: 'static' },
        { id: 'connection:2:2:0:3:0', source: 2, target: 2, weight: 3, delay_ms: 3, synapse_model: 'static' },
      ],
      weight_units: 'nS',
      delay_units: 'ms',
      layout: 'schematic_circle',
      parallel_edges: 'preserved',
      self_connections: 'preserved',
      snapshot_time_ms: 50,
      snapshot_scope: { kind: 'mpi_target_rank_local', rank: 1, world_size: 4 },
      sample_policy: 'deterministic_even_stride',
      source_connection_count: 10,
      edge_identity: 'nest_connection_identifier',
    });
    expect(html).toContain('Connection topology graph');
    expect(html).toContain('data-source-node-count="3"');
    expect(html).toContain('data-rendered-node-count="3"');
    expect(html).toContain('data-isolate-count="1"');
    expect(html).toContain('data-source-edge-count="10"');
    expect(html).toContain('data-provided-edge-count="3"');
    expect(html).toContain('data-rendered-edge-count="3"');
    expect(html).toContain('data-self-loop-count="1"');
    expect(html).toContain('data-parallel-edge-count="2"');
    expect(html).toContain('data-arrow-count="3"');
    expect(html).toContain('positions and distances are not measured');
    expect(html).toContain('deterministic_even_stride');
    expect(html).toContain('nest_connection_identifier');
    expect(html).toContain('data-edge-identity="nest_connection_identifier"');
    expect(html).toContain('mpi_target_rank_local');
    expect(html).toContain('aria-label="Connection graph node and edge data"');
    expect(html).toContain('Node 3: isolated three; isolated in the provided graph.');
    expect(html).toContain('Edge connection:1:2:0:1:0: 1 → 2; weight 1 nS; delay 1 ms; synapse model static; edge identity nest_connection_identifier.');
    expect(html.match(/data-mark="connection-(?:edges|arrowheads|nodes)"/g)).toHaveLength(3);
    expect(html).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('shares one mass-preserving renderer across in- and out-degree skills', () => {
    for (const direction of ['in', 'out'] as const) {
      const nodeCounts = [1, 2, 1];
      const values = direction === 'in' ? nodeCounts : nodeCounts.map((value) => value / 4);
      const html = renderDirectChart(
        `nest.${direction}_degree_distribution`,
        'degree-distribution',
        {
          degrees: [0, 1, 2],
          node_counts: nodeCounts,
          values,
          node_count: 4,
          connection_count: 4,
          direction,
          normalization: direction === 'in' ? 'count' : 'probability',
          value_units: direction === 'in' ? 'count' : 'probability',
          edge_counting: 'each_synapse_collection_entry',
          zero_degree_policy: 'include_declared_universe',
          sample_policy: 'complete',
          snapshot_time_ms: 75,
          snapshot_scope: { kind: 'single_process_complete' },
        },
      );
      expect(html).toContain(`${direction === 'in' ? 'In' : 'Out'}-degree distribution`);
      expect(html).toContain(`data-direction="${direction}"`);
      expect(html).toContain('data-source-bin-count="3"');
      expect(html).toContain('data-rendered-bin-count="3"');
      expect(html).toContain('data-source-node-mass="4"');
      expect(html).toContain('data-rendered-node-mass="4"');
      expect(html).toContain('include_declared_universe');
      expect(html).toContain('each_synapse_collection_entry');
      expect(html).toContain('data-sample-policy="complete"');
      expect(html).toContain(`aria-label="${direction === 'in' ? 'In' : 'Out'}-degree bin data"`);
      expect(html).toContain('Degree 0: 1 node; displayed value');
      expect(html).not.toMatch(/(?:NaN|Infinity)/);
    }
  });

  it('renders delay bins from raw counts and discloses exact window/snapshot semantics', () => {
    const html = renderDirectChart('nest.delay_distribution', 'delay-distribution', {
      bin_centers_ms: [0.5, 1.5, 2.5],
      delay_counts: [1, 2, 1],
      values: [1, 2, 1],
      bin_width_ms: 1,
      window_start_ms: 0,
      window_stop_ms: 3,
      normalization: 'count',
      value_units: 'count',
      delay_units: 'ms',
      aggregation: 'each_connection',
      binning: 'left_closed_right_open',
      sample_policy: 'complete',
      connection_count: 4,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: 'mpi_all_ranks_merged', world_size: 2 },
    });
    expect(html).toContain('Connection-delay distribution');
    expect(html).toContain('data-source-bin-count="3"');
    expect(html).toContain('data-rendered-bin-count="3"');
    expect(html).toContain('data-source-delay-count="4"');
    expect(html).toContain('data-rendered-delay-count="4"');
    expect(html).toContain('window [0, 3) ms');
    expect(html).toContain('left_closed_right_open');
    expect(html).toContain('data-sample-policy="complete"');
    expect(html).toContain('mpi_all_ranks_merged');
    expect(html).toContain('aria-label="Connection-delay bin data"');
    expect(html).toContain('Delay bin [0, 1) ms: 1 connection; displayed value 1 count.');
    expect(html).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('renders exact 2D positions at equal aspect with fixed markers and no jitter', () => {
    const html = renderDirectChart('nest.spatial_map_2d', 'spatial-map-2d', {
      nodes: [
        { id: 1, label: 'left', x: -10, y: -5 },
        { id: 2, label: 'center', x: 0, y: 0 },
        { id: 3, label: 'right', x: 10, y: 5 },
      ],
      coordinate_units: 'µm',
      extent: [20, 10],
      center: [0, 0],
      edge_wrap: true,
      position_scope: { kind: 'mpi_rank_local', rank: 0, world_size: 2 },
      marker_size: 'fixed_screen_space',
    });
    expect(html).toContain('2D spatial node map');
    expect(html).toContain('data-source-node-count="3"');
    expect(html).toContain('data-rendered-node-count="3"');
    expect(html).toContain('data-marker-size="fixed_screen_space"');
    expect(html).toContain('data-jitter="none"');
    expect(html).toContain('data-edge-wrap="true"');
    expect(html).toContain('One common scale is used for both axes');
    expect(html).toContain('mpi_rank_local');
    expect(html).toContain('aria-label="Spatial node-coordinate data"');
    expect(html).toContain('Node 1: left; x -10 µm; y -5 µm.');
    expect(html).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('keeps maximum-size matrix and spatial figures DOM-bounded without dropping data', () => {
    const cellCount = 50_000;
    const columnCount = 500;
    const rowCount = 100;
    const sourceIds = Array.from({ length: columnCount }, (_, index) => index);
    const targetIds = Array.from({ length: rowCount }, (_, index) => 1_000 + index);
    const cells = Array.from({ length: cellCount }, (_, index) => ({
      source_id: index % columnCount,
      target_id: 1_000 + Math.floor(index / columnCount),
      connection_count: 1,
      value: (index % 17) - 8,
    }));
    const matrix = renderDirectChart('nest.weight_matrix', 'connection-matrix', {
      ...matrixBase,
      source_ids: sourceIds,
      target_ids: targetIds,
      cells,
      connection_count: cellCount,
      weight_units: 'nS',
      aggregation: 'sum',
    });
    expect(matrix).toContain(`data-source-cell-count="${cellCount}"`);
    expect(matrix).toContain(`data-rendered-cell-count="${cellCount}"`);
    expect(matrix.match(/data-mark="matrix-value-bucket"/g)?.length ?? 0).toBeLessThanOrEqual(17);
    expect(matrix.match(/<rect/g)?.length ?? 0).toBeLessThan(10);
    expect(matrix).toContain('data-cell-stroke="suppressed-below-pixel-scale"');
    expect(matrix).toContain('Matrix data ordered as source-axis columns, target-axis rows, then present cells: rows 1–25 of 50600; page 1 of 2024.');
    expect(matrix.match(/<li>/g)).toHaveLength(25);
    expect(matrix).toContain('Source-axis column 1 of 500 (declared order): node ID 0.');
    expect(matrix).not.toContain('Source-axis column 26 of 500');
    expect(matrix).toContain('aria-live="polite"');
    expect(matrix).toContain('Previous');
    expect(matrix).toContain('Next');
    expect(matrix).not.toMatch(/(?:NaN|Infinity)/);

    const nodes = Array.from({ length: cellCount }, (_, index) => ({
      id: index,
      label: `node ${index}`,
      x: index % columnCount - 250,
      y: Math.floor(index / columnCount) - 50,
    }));
    const spatial = renderDirectChart('nest.spatial_map_2d', 'spatial-map-2d', {
      nodes,
      coordinate_units: 'mm',
      extent: [500, 100],
      center: [-0.5, -0.5],
      edge_wrap: false,
      position_scope: { kind: 'single_process_complete' },
      marker_size: 'fixed_screen_space',
    });
    expect(spatial).toContain(`data-source-node-count="${cellCount}"`);
    expect(spatial).toContain(`data-rendered-node-count="${cellCount}"`);
    expect(spatial.match(/data-mark="spatial-nodes"/g)).toHaveLength(1);
    expect(spatial.match(/<path/g)).toHaveLength(1);
    expect(spatial.match(/<text/g)?.length ?? 0).toBeLessThan(32);
    expect(spatial).toContain('Spatial node-coordinate data: rows 1–25 of 50000; page 1 of 2000.');
    expect(spatial.match(/<li>/g)).toHaveLength(25);
    expect(spatial).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('pages the bounded DOM companion with local state', async () => {
    const nodes = Array.from({ length: 30 }, (_, index) => ({
      id: index,
      label: `node ${index}`,
      x: index,
      y: 0,
    }));
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <ReferenceChartScene
          skill="nest.spatial_map_2d"
          scene="spatial-map-2d"
          themeMode="dark"
          active
          palette={CORTEXEL_PALETTE}
          params={{
            nodes,
            coordinate_units: 'mm',
            extent: [30, 1],
            center: [14.5, 0],
            edge_wrap: false,
            position_scope: { kind: 'single_process_complete' },
            marker_size: 'fixed_screen_space',
          }}
          provenance={{
            source: 'pagination-state-test',
            calibrated_posterior: false,
            advisory_only: true,
            is_paper_local_evidence: false,
            synthetic: true,
          }}
        />,
      );
    });
    expect(renderer.root.findByProps({ 'aria-live': 'polite' }).children.join(''))
      .toContain('rows 1–25 of 30; page 1 of 2');
    expect(renderer.root.findAllByType('li')).toHaveLength(25);
    const next = renderer.root.findAllByType('button').find(
      (button) => button.children.join('') === 'Next',
    );
    expect(next).toBeDefined();
    await act(async () => next!.props.onClick());
    expect(renderer.root.findByProps({ 'aria-live': 'polite' }).children.join(''))
      .toContain('rows 26–30 of 30; page 2 of 2');
    const rows = renderer.root.findAllByType('li');
    expect(rows).toHaveLength(5);
    expect(rows[0].findByType('bdi').children.join('')).toContain('Node 25: node 25');
    await act(async () => renderer.unmount());
  });
});

describe('reference chart geometry remains finite and literal-data preserving', () => {
  it('uses row-major-last-axis-fastest phase-plane indexing', () => {
    const samples = phasePlaneSamples(
      ['v', 'w'],
      { v: [-70, -50], w: [0, 1, 2] },
      {
        v: [10, 11, 12, 20, 21, 22],
        w: [-10, -11, -12, -20, -21, -22],
      },
    );
    expect(samples).toEqual([
      { x: -70, y: 0, dx: 10, dy: -10, index: 0 },
      { x: -70, y: 1, dx: 11, dy: -11, index: 1 },
      { x: -70, y: 2, dx: 12, dy: -12, index: 2 },
      { x: -50, y: 0, dx: 20, dy: -20, index: 3 },
      { x: -50, y: 1, dx: 21, dy: -21, index: 4 },
      { x: -50, y: 2, dx: 22, dy: -22, index: 5 },
    ]);
  });

  it('keeps line, raster, histogram, arrow, and tick output finite at extreme domains', () => {
    const extremes = [-Number.MAX_VALUE, Number.MAX_VALUE];
    const domain = numericDomain(extremes);
    const outputs = [
      linePath(extremes, extremes, domain, domain, frame),
      rasterTickPath(extremes, [0, Number.MAX_SAFE_INTEGER], domain, numericDomain([0, Number.MAX_SAFE_INTEGER]), frame),
      histogramBarPath([-1, 1], [0, Number.MAX_VALUE], 2, numericDomain([-2, 2]), numericDomain([0, Number.MAX_VALUE], { includeZero: true }), frame),
      phasePlaneArrowPath(
        [{ x: 0, y: 0, dx: Number.MAX_VALUE, dy: -Number.MAX_VALUE, index: 0 }],
        numericDomain([-1, 1]),
        numericDomain([-1, 1]),
        frame,
      ),
      tickValues(domain).join(','),
    ];
    for (const output of outputs) expect(output).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('pads singleton/constant domains and preserves sorted-line inputs', () => {
    const xs = [3, 1, 2];
    const ys = [30, 10, 20];
    const originalX = [...xs];
    const originalY = [...ys];
    const singleton = numericDomain([7]);
    const path = sortedLinePath(xs, ys, numericDomain(xs), numericDomain(ys), frame);
    expect(singleton.min).toBeLessThan(7);
    expect(singleton.max).toBeGreaterThan(7);
    expect(path).not.toMatch(/(?:NaN|Infinity)/);
    expect(xs).toEqual(originalX);
    expect(ys).toEqual(originalY);
    expect(numericDomain([0, 0], { includeZero: true })).toEqual({ min: 0, max: 1 });
  });

  it('uses exact horizontal/vertical steps and starts a new subpath across compacted gaps', () => {
    const centers = [0.5, 1.5, 2.5, 3.5];
    const values = [1, 4, 2, 8];
    const exact = binnedStepPath(
      centers,
      values,
      1,
      { min: 0, max: 4 },
      numericDomain(values, { includeZero: true }),
      frame,
      10,
    );
    expect(exact.compacted).toBe(false);
    expect(exact.renderedSampleCount).toBe(4);
    expect(exact.path).not.toContain('L');
    expect(exact.path.match(/M/g)).toHaveLength(1);
    expect(exact.path.match(/V/g)).toHaveLength(3);

    const indices = boundedExtremaIndices(
      Array.from({ length: 100 }, (_, index) => index === 50 ? 1000 : index),
      8,
    );
    expect(indices.length).toBeLessThanOrEqual(8);
    expect(indices).toContain(0);
    expect(indices).toContain(50);
    expect(indices).toContain(99);
  });

  it('bounds 50,000-bin rate and correlogram paths while retaining exact extrema', () => {
    const count = 50_000;
    const xs = Array.from({ length: count }, (_, index) => index + 0.5);
    const values = Array.from({ length: count }, (_, index) => {
      if (index === 12_345) return -100;
      if (index === 34_567) return 200;
      return (index % 17) - 8;
    });
    const xDomain = { min: 0, max: count };
    const yDomain = numericDomain(values, { includeZero: true });
    const retained = boundedExtremaIndices(values, 256);
    const steps = binnedStepPath(xs, values, 1, xDomain, yDomain, frame, 256);
    const marks = boundedStemPointPaths(xs, values, xDomain, yDomain, frame, 256);

    expect(steps).toMatchObject({
      compacted: true,
      sourceSampleCount: count,
    });
    expect(steps.renderedSampleCount).toBeLessThanOrEqual(256);
    expect(retained).toContain(12_345);
    expect(retained).toContain(34_567);
    expect(steps.path.match(/[MHV]/g)?.length ?? 0).toBeLessThanOrEqual(512);
    expect(steps.path).not.toContain('L');
    expect(marks).toMatchObject({
      compacted: true,
      sourceSampleCount: count,
      renderedSampleCount: steps.renderedSampleCount,
    });
    expect(marks.stems.match(/M/g)).toHaveLength(marks.renderedSampleCount);
    expect(marks.points.match(/M/g)).toHaveLength(marks.renderedSampleCount);
    expect(marks.stems).not.toContain('L');
    expect(marks.points).not.toContain('L');
    expect([steps.path, marks.stems, marks.points].join('')).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('anchors signed correlogram stems at zero without connecting values', () => {
    const yDomain = numericDomain([-0.5, 0.25], { includeZero: true });
    const path = stemPath([-1, 0, 1], [-0.5, 0, 0.25], numericDomain([-1, 0, 1]), yDomain, frame);
    expect(path.match(/M/g)).toHaveLength(3);
    expect(path.match(/V/g)).toHaveLength(3);
    expect(path).not.toContain('L');
  });

  it('encodes 50,000 raster events into one SVG path without dropping events', () => {
    const count = 50_000;
    const times = Array.from({ length: count }, (_, index) => index);
    const senders = Array.from({ length: count }, (_, index) => index % 100);
    const path = rasterTickPath(
      times,
      senders,
      numericDomain(times),
      numericDomain(senders),
      frame,
    );
    expect(path.match(/M/g)).toHaveLength(count);
    expect(path).not.toMatch(/(?:NaN|Infinity)/);
  });
});

describe('topology and distribution geometry is exact, deterministic, and bounded', () => {
  it('keeps present zero-valued matrix cells distinct from absent cells with bounded paths', () => {
    const geometry = matrixValueBucketPaths(
      [
        { sourceIndex: 0, targetIndex: 0, value: 0 },
        { sourceIndex: 1, targetIndex: 0, value: 2 },
        { sourceIndex: 0, targetIndex: 1, value: -4 },
      ],
      3,
      2,
      frame,
    );
    expect(geometry).toMatchObject({
      sourceCellCount: 3,
      renderedCellCount: 3,
      maximumAbsoluteValue: 4,
      valueBucketCount: 3,
    });
    expect(geometry.buckets.map((bucket) => bucket.key)).toContain('zero');
    expect(geometry.buckets).toHaveLength(3);
    expect(geometry.buckets.map((bucket) => bucket.path).join('').match(/M/g)).toHaveLength(3);
    expect(geometry.buckets.map((bucket) => bucket.path).join('')).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('renders isolates, multapses, reverse edges, and autapses on deterministic circle lanes', () => {
    const nodes = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const edges = [
      { source: 1, target: 2 },
      { source: 1, target: 2 },
      { source: 2, target: 1 },
      { source: 3, target: 3 },
    ];
    const first = circleTopologyGeometry(nodes, edges, frame);
    const second = circleTopologyGeometry(nodes, edges, frame);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      sourceNodeCount: 3,
      renderedNodeCount: 3,
      sourceEdgeCount: 4,
      renderedEdgeCount: 4,
      selfLoopCount: 1,
      parallelEdgeCount: 3,
    });
    expect(first.nodePath.match(/M/g)).toHaveLength(3);
    expect(first.edgePath.match(/M/g)).toHaveLength(4);
    expect(first.arrowPath.match(/M/g)).toHaveLength(4);
    expect(`${first.nodePath}${first.edgePath}${first.arrowPath}`).not.toMatch(
      /(?:NaN|Infinity)/,
    );
  });

  it('separates reciprocal edge curves while retaining opposite arrow directions', () => {
    const geometry = circleTopologyGeometry(
      [{ id: 1 }, { id: 2 }],
      [
        { source: 1, target: 2 },
        { source: 2, target: 1 },
      ],
      frame,
    );
    const edgeSegments = geometry.edgePath.match(/M[^M]+/g) ?? [];
    expect(edgeSegments).toHaveLength(2);
    expect(edgeSegments[0]).not.toBe(edgeSegments[1]);

    const arrowSegments = geometry.arrowPath.match(/M[^M]+/g) ?? [];
    expect(arrowSegments).toHaveLength(2);
    const directions = arrowSegments.map((segment) => {
      const coordinates = segment.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      expect(coordinates).toHaveLength(6);
      const [tipX, tipY, leftX, leftY, rightX, rightY] = coordinates;
      return [tipX - (leftX + rightX) / 2, tipY - (leftY + rightY) / 2] as const;
    });
    expect(directions[0][0] * directions[1][0] + directions[0][1] * directions[1][1])
      .toBeLessThan(0);
  });

  it('sizes self-loop lanes within each node bundle, independent of prior nodes', () => {
    const nodes = [{ id: 1 }, { id: 2 }];
    const preceding = Array.from({ length: 20 }, () => ({ source: 1, target: 1 }));
    const withPreceding = circleTopologyGeometry(
      nodes,
      [...preceding, { source: 2, target: 2 }],
      frame,
    );
    const alone = circleTopologyGeometry(nodes, [{ source: 2, target: 2 }], frame);
    expect(withPreceding.edgePath.split('M').at(-1)).toBe(alone.edgePath.split('M').at(-1));
  });

  it('compacts only adjacent degree bins and preserves raw/displayed mass', () => {
    const count = 50_000;
    const degrees = Array.from({ length: count }, (_, index) => index);
    const nodeCounts = Array.from({ length: count }, (_, index) => index % 5);
    const nodeTotal = nodeCounts.reduce((sum, value) => sum + value, 0);
    const values = nodeCounts.map((value) => value / nodeTotal);
    const aggregated = aggregateDegreeBins(degrees, nodeCounts, values, 256);
    expect(aggregated).toMatchObject({
      sourceBinCount: count,
      compacted: true,
      sourceNodeMass: nodeTotal,
      renderedNodeMass: nodeTotal,
    });
    expect(aggregated.renderedBinCount).toBeLessThanOrEqual(256);
    expect(aggregated.renderedValueMass).toBeCloseTo(aggregated.sourceValueMass, 12);
    const path = variableHistogramPath(
      aggregated.bins,
      { min: -0.5, max: count - 0.5 },
      numericDomain(aggregated.bins.map((bin) => bin.value), { includeZero: true }),
      frame,
    );
    expect(path.match(/M/g)).toHaveLength(aggregated.renderedBinCount);
    expect(path).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('preserves delay raw counts and probability-density mass during adjacent compaction', () => {
    const count = 50_000;
    const width = 0.1;
    const centers = Array.from({ length: count }, (_, index) => (index + 0.5) * width);
    const rawCounts = Array.from({ length: count }, (_, index) => index % 3);
    const rawTotal = rawCounts.reduce((sum, value) => sum + value, 0);
    const values = rawCounts.map((value) => value / rawTotal / width);
    const aggregated = aggregateUniformHistogramBins(
      centers,
      rawCounts,
      values,
      width,
      'probability_density',
      512,
    );
    const sourceMass = values.reduce((sum, value) => sum + value * width, 0);
    const renderedMass = aggregated.bins.reduce(
      (sum, bin) => sum + bin.value * bin.width,
      0,
    );
    expect(aggregated).toMatchObject({
      sourceBinCount: count,
      sourceRawCount: rawTotal,
      renderedRawCount: rawTotal,
      compacted: true,
    });
    expect(aggregated.renderedBinCount).toBeLessThanOrEqual(512);
    expect(renderedMass).toBeCloseTo(sourceMass, 12);
  });

  it('pads a spatial domain to one common x/y scale without moving coordinates', () => {
    const domains = equalAspectDomains([20, 10], [5, -5], frame);
    const xPixelsPerUnit = Math.abs(
      chartX(6, domains.xDomain, frame) - chartX(5, domains.xDomain, frame),
    );
    const yPixelsPerUnit = Math.abs(
      chartY(-4, domains.yDomain, frame) - chartY(-5, domains.yDomain, frame),
    );
    expect(xPixelsPerUnit).toBeCloseTo(yPixelsPerUnit, 12);
    expect(domains.xDomain.min + domains.xDomain.max).toBe(10);
    expect(domains.yDomain.min + domains.yDomain.max).toBe(-10);
  });
});

describe('reference chart routing fails closed', () => {
  it('rejects a scene mismatch before a chart receives params', () => {
    const spec = getExamplePayload('nest.spike_raster')!;
    spec.scene = 'voltage-trace';
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html).toContain('Invalid skill invocation');
    expect(html).toContain('does not match skill');
    expect(html).not.toContain('<svg');
  });

  it('returns explicit unsupported states for native 3D topology and KG skills', () => {
    for (const skill of ['nest.connectivity_matrix', 'nest.spatial_3d', 'corpus.knowledge_graph'] as const) {
      const html = renderToStaticMarkup(
        <ReferenceVizSpecFigure spec={getExamplePayload(skill)!} />,
      );
      expect(html, skill).toContain('role="alert"');
      expect(html, skill).toContain('has no canonical SVG chart');
      expect(html, skill).toContain(skill);
      expect(html, skill).toContain('role="note"');
      expect(html, skill).not.toContain('<svg');
    }
  });

  it('never accepts any of the four remaining scene:null host envelopes as a chart spec', () => {
    for (const skill of [
      'nest.spatial_2d',
      'nest.stimulus_response',
      'nest.compartmental_dynamics',
      'nest.animation_replay',
    ] as const) {
      const html = renderToStaticMarkup(
        <ReferenceVizSpecFigure spec={getHostRendererExamplePayload(skill)!} />,
      );
      expect(html, skill).toContain('Invalid skill invocation');
      expect(html, skill).not.toContain('<svg');
      expect(html, skill).not.toContain('cortexel-reference-chart-unsupported');
    }
  });

  it('keeps missing-skill payloads strict and exposes no trusted-envelope bypass', () => {
    const spec = getExamplePayload('nest.spike_raster')!;
    delete spec.skill;
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html).toContain('Invalid skill invocation');
    expect(html).not.toContain('<svg');
  });

  it('preserves the existing explicit export-mode refusal', () => {
    const spec = getExamplePayload('nest.spike_raster')!;
    spec.mode = 'export';
    const html = renderToStaticMarkup(<ReferenceVizSpecFigure spec={spec} />);
    expect(html).toContain('Headless export rendering is not available');
    expect(html).not.toContain('<svg');
  });

  it('keeps the chart subpath free of Three, R3F, and d3 runtime imports', () => {
    const files = readdirSync(new URL('../react/charts', import.meta.url))
      .filter((name) => /\.tsx?$/.test(name));
    for (const file of files) {
      const source = readFileSync(new URL(`../react/charts/${file}`, import.meta.url), 'utf8');
      expect(source, file).not.toMatch(/from\s+['"](?:three|@react-three\/fiber|d3)/);
    }
  });
});
