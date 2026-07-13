// Fail-fast structural preflight for large inline params. Zod intentionally
// reports every invalid array element; on million-sample hostile payloads that
// can allocate gigabytes before the public error cap is applied. This scanner
// runs on the exact-JSON clone and returns the first coarse type/range failure,
// while the canonical Zod schema remains the source of detailed validation and
// portable JSON Schema generation.

import {
  CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS,
  CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS,
  KNOWLEDGE_GRAPH_LIMITS,
  PARAM_LIMITS,
} from './params';

const FLOAT32_MAX = 3.4028234663852886e38;
const MAX_SAMPLES = PARAM_LIMITS.maxSamples;

export interface ParamPreflightIssue {
  path: string;
  message: string;
  scope?: 'params' | 'envelope';
}

const ALLOWED_PARAM_FIELDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'nest.voltage_trace': ['times_ms', 'series', 'series_labels', 'units'],
  'nest.spike_raster': ['times_ms', 'senders'],
  'nest.isi_distribution': [
    'bin_centers_ms', 'values', 'bin_width_ms', 'normalization', 'value_units',
    'interval_scope',
  ],
  'nest.psth': [
    'bin_centers_ms', 'values', 'bin_width_ms', 'normalization', 'value_units',
    'trial_count', 'alignment_event', 'aggregation',
  ],
  'nest.population_rate': [
    'bin_centers_ms', 'bin_width_ms', 'window_start_ms', 'window_stop_ms',
    'series', 'normalization', 'aggregation', 'binning',
  ],
  'nest.rate_response': ['stimulus_amplitudes', 'rates_hz', 'stimulus_units'],
  'nest.connectivity_matrix': [
    'sources', 'targets', 'weights', 'delays', 'weight_units', 'delay_units',
  ],
  'nest.connection_graph': [
    'nodes', 'edges', 'weight_units', 'delay_units', 'layout', 'parallel_edges',
    'self_connections', 'snapshot_time_ms', 'snapshot_scope', 'sample_policy',
    'source_connection_count', 'edge_identity',
  ],
  'nest.adjacency_matrix': [
    'source_ids', 'target_ids', 'cells', 'axis_order', 'absent_cell',
    'sample_policy', 'connection_count', 'snapshot_time_ms', 'snapshot_scope',
    'display', 'aggregation',
  ],
  'nest.weight_matrix': [
    'source_ids', 'target_ids', 'cells', 'weight_units', 'aggregation',
    'axis_order', 'absent_cell', 'sample_policy', 'connection_count',
    'snapshot_time_ms', 'snapshot_scope',
  ],
  'nest.delay_matrix': [
    'source_ids', 'target_ids', 'cells', 'delay_units', 'aggregation',
    'axis_order', 'absent_cell', 'sample_policy', 'connection_count',
    'snapshot_time_ms', 'snapshot_scope',
  ],
  'nest.in_degree_distribution': [
    'degrees', 'node_counts', 'values', 'node_count', 'connection_count',
    'direction', 'normalization', 'value_units', 'edge_counting',
    'zero_degree_policy', 'sample_policy', 'snapshot_time_ms', 'snapshot_scope',
  ],
  'nest.out_degree_distribution': [
    'degrees', 'node_counts', 'values', 'node_count', 'connection_count',
    'direction', 'normalization', 'value_units', 'edge_counting',
    'zero_degree_policy', 'sample_policy', 'snapshot_time_ms', 'snapshot_scope',
  ],
  'nest.delay_distribution': [
    'bin_centers_ms', 'delay_counts', 'values', 'bin_width_ms',
    'window_start_ms', 'window_stop_ms', 'normalization', 'value_units',
    'delay_units', 'aggregation', 'binning', 'sample_policy', 'connection_count',
    'snapshot_time_ms', 'snapshot_scope',
  ],
  'nest.weight_histogram': [
    'bin_centers', 'values', 'bin_width', 'weight_units', 'normalization',
    'value_units', 'snapshot_time_ms',
  ],
  'nest.spatial_2d': ['positions', 'coordinate_units'],
  'nest.spatial_map_2d': [
    'nodes', 'coordinate_units', 'extent', 'center', 'edge_wrap',
    'position_scope', 'marker_size',
  ],
  'nest.spatial_3d': ['objects', 'coordinate_units'],
  'nest.plasticity_dynamics': ['times_ms', 'weights', 'weight_units'],
  'nest.phase_plane': [
    'grid', 'derivatives', 'axis_units', 'derivative_units', 'axis_order', 'flattening',
  ],
  'nest.correlogram': [
    'lags_ms', 'values', 'bin_width_ms', 'tau_max_ms', 'counting_start_ms',
    'counting_stop_ms', 'pair', 'lag_convention', 'binning', 'zero_lag_policy',
    'statistic',
  ],
  'nest.stimulus_response': ['times_ms', 'stimulus', 'response'],
  'nest.astrocyte_dynamics': ['times_ms', 'ca_trace', 'units'],
  'nest.compartmental_dynamics': ['times_ms', 'compartments'],
  'nest.animation_replay': ['frames'],
  'corpus.knowledge_graph': [
    'graph_id', 'graph_source', 'graph_snapshot_id', 'graph_scope', 'generated_at',
    'nodes', 'edges',
  ],
});

const INVOCATION_FIELDS = new Set([
  'scene', 'skill', 'specVersion', 'params', 'mode', 'themeMode', 'camera',
  'palette', 'provenance', 'rendererRoute',
]);
const PROVENANCE_FIELDS = new Set([
  'source', 'calibrated_posterior', 'advisory_only', 'is_paper_local_evidence',
  'caption', 'declared_inputs', 'synthetic',
]);

type Check = (value: unknown) => boolean;

const finite: Check = (value) => typeof value === 'number' && Number.isFinite(value);
const gpu: Check = (value) => finite(value) && Math.abs(value as number) <= FLOAT32_MAX;
const id: Check = (value) =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  !Object.is(value, -0);

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function largeArray(
  value: unknown,
  path: string,
  check: Check,
  expected: string,
  options: { min?: number; max?: number } = {},
): ParamPreflightIssue | null {
  if (!Array.isArray(value)) return null;
  const min = options.min ?? 1;
  const max = options.max ?? MAX_SAMPLES;
  if (value.length < min || value.length > max) {
    return {
      path,
      message: `expected ${min}–${max} items; received ${value.length}`,
    };
  }
  for (let index = 0; index < value.length; index++) {
    if (!check(value[index])) {
      return { path: `${path}.${index}`, message: `expected ${expected}` };
    }
  }
  return null;
}

function numericFields(
  params: Record<string, unknown>,
  fields: readonly (readonly [string, Check, string])[],
): ParamPreflightIssue | null {
  for (const [field, check, expected] of fields) {
    const issue = largeArray(params[field], field, check, expected);
    if (issue) return issue;
  }
  return null;
}

function boundedText(value: unknown, max: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

export function preflightLargeSkillParams(
  skillId: string,
  params: Record<string, unknown>,
): ParamPreflightIssue | null {
  const time = (field = 'times_ms'): readonly [string, Check, string] =>
    [field, finite, 'a finite number'];
  const gpuField = (field: string): readonly [string, Check, string] =>
    [field, gpu, 'a finite Float32-range number'];
  const idField = (field: string): readonly [string, Check, string] =>
    [field, id, 'a non-negative safe integer'];

  switch (skillId) {
    case 'nest.spike_raster':
      return numericFields(params, [time(), idField('senders')]);
    case 'nest.isi_distribution': {
      const issue = numericFields(params, [
        time('bin_centers_ms'),
        gpuField('values'),
      ]);
      if (issue) return issue;
      for (const [field, message] of [
        ['bin_centers_ms', 'inter-spike interval bin centers cannot be negative'],
        ['values', 'histogram values cannot be negative'],
      ] as const) {
        const values = params[field];
        if (Array.isArray(values)) {
          const index = values.findIndex(
            (value) => typeof value === 'number' && value < 0,
          );
          if (index >= 0) return { path: `${field}.${index}`, message };
        }
      }
      return null;
    }
    case 'nest.psth': {
      const issue = numericFields(params, [
        time('bin_centers_ms'),
        gpuField('values'),
      ]);
      if (issue) return issue;
      const values = params.values;
      if (Array.isArray(values)) {
        const index = values.findIndex(
          (value) => typeof value === 'number' && value < 0,
        );
        if (index >= 0) {
          return { path: `values.${index}`, message: 'histogram values cannot be negative' };
        }
      }
      return null;
    }
    case 'nest.population_rate': {
      const issue = numericFields(params, [time('bin_centers_ms')]);
      if (issue) return issue;
      if (!Array.isArray(params.series)) return null;
      const outer = largeArray(
        params.series,
        'series',
        (series) => {
          const item = record(series);
          return !!item &&
            Object.keys(item).every((key) =>
              ['id', 'label', 'recorded_sender_count', 'spike_counts', 'rates_hz'].includes(key)) &&
            boundedText(item.id, 120) &&
            boundedText(item.label, 240) &&
            typeof item.recorded_sender_count === 'number' &&
            Number.isSafeInteger(item.recorded_sender_count) &&
            item.recorded_sender_count > 0 &&
            Array.isArray(item.spike_counts) && item.spike_counts.length >= 1 &&
            Array.isArray(item.rates_hz) && item.rates_hz.length >= 1;
        },
        'a closed population-rate series with id, label, sender count, spike counts, and rates',
        { max: PARAM_LIMITS.maxSeries },
      );
      if (outer) return outer;
      for (let index = 0; index < params.series.length; index++) {
        const item = record(params.series[index]);
        if (!item) continue;
        const counts = largeArray(
          item.spike_counts,
          `series.${index}.spike_counts`,
          (value) => id(value),
          'a non-negative safe-integer spike count',
        );
        if (counts) return counts;
        const rates = largeArray(
          item.rates_hz,
          `series.${index}.rates_hz`,
          (value) => gpu(value) && (value as number) >= 0,
          'a non-negative finite Float32-range rate',
        );
        if (rates) return rates;
      }
      return null;
    }
    case 'nest.rate_response': {
      const issue = numericFields(params, [
        gpuField('stimulus_amplitudes'),
        gpuField('rates_hz'),
      ]);
      if (issue) return issue;
      const rates = params.rates_hz;
      if (Array.isArray(rates)) {
        const index = rates.findIndex((rate) => typeof rate === 'number' && rate < 0);
        if (index >= 0) return { path: `rates_hz.${index}`, message: 'firing rates cannot be negative' };
      }
      return null;
    }
    case 'nest.connectivity_matrix':
      return numericFields(params, [
        idField('sources'),
        idField('targets'),
        gpuField('weights'),
        gpuField('delays'),
      ]);
    case 'nest.connection_graph': {
      const nodes = largeArray(
        params.nodes,
        'nodes',
        (value) => {
          const node = record(value);
          return !!node && id(node.id) && boundedText(node.label, 120);
        },
        'a closed graph node with a safe id and bounded label',
        { max: PARAM_LIMITS.maxTopologyNodes },
      );
      if (nodes) return nodes;
      return largeArray(
        params.edges,
        'edges',
        (value) => {
          const edge = record(value);
          return !!edge && boundedText(edge.id, 240) && id(edge.source) && id(edge.target) &&
            (edge.weight === undefined || gpu(edge.weight)) &&
            (edge.delay_ms === undefined || (gpu(edge.delay_ms) && (edge.delay_ms as number) > 0));
        },
        'a closed graph edge with safe endpoints and optional finite measurements',
        { max: PARAM_LIMITS.maxTopologyEdges },
      );
    }
    case 'nest.adjacency_matrix':
    case 'nest.weight_matrix':
    case 'nest.delay_matrix': {
      const axes = numericFields(params, [idField('source_ids'), idField('target_ids')]);
      if (axes) return axes;
      return largeArray(
        params.cells,
        'cells',
        (value) => {
          const cell = record(value);
          return !!cell && id(cell.source_id) && id(cell.target_id) &&
            id(cell.connection_count) && (cell.connection_count as number) > 0 &&
            (cell.value === undefined || gpu(cell.value));
        },
        'a sparse matrix cell with safe endpoint ids and positive connection count',
        { max: PARAM_LIMITS.maxSamples },
      );
    }
    case 'nest.in_degree_distribution':
    case 'nest.out_degree_distribution':
      return numericFields(params, [
        idField('degrees'), idField('node_counts'), gpuField('values'),
      ]);
    case 'nest.delay_distribution':
      return numericFields(params, [
        time('bin_centers_ms'), idField('delay_counts'), gpuField('values'),
      ]);
    case 'nest.weight_histogram': {
      const issue = numericFields(params, [
        gpuField('bin_centers'),
        gpuField('values'),
      ]);
      if (issue) return issue;
      const values = params.values;
      if (Array.isArray(values)) {
        const index = values.findIndex(
          (value) => typeof value === 'number' && value < 0,
        );
        if (index >= 0) {
          return { path: `values.${index}`, message: 'histogram values cannot be negative' };
        }
      }
      return null;
    }
    case 'nest.plasticity_dynamics':
      return numericFields(params, [time(), gpuField('weights')]);
    case 'nest.astrocyte_dynamics': {
      const issue = numericFields(params, [time(), gpuField('ca_trace')]);
      if (issue) return issue;
      const trace = params.ca_trace;
      if (Array.isArray(trace)) {
        const index = trace.findIndex((sample) => typeof sample === 'number' && sample < 0);
        if (index >= 0) {
          return { path: `ca_trace.${index}`, message: 'absolute Ca²⁺ concentration cannot be negative' };
        }
      }
      return null;
    }
    case 'nest.correlogram':
      return numericFields(params, [time('lags_ms'), gpuField('values')]);
    case 'nest.stimulus_response':
      return numericFields(params, [
        time(),
        gpuField('stimulus'),
        gpuField('response'),
      ]);
    case 'nest.voltage_trace': {
      const issue = numericFields(params, [time()]);
      if (issue) return issue;
      if (Array.isArray(params.series)) {
        const outer = largeArray(
          params.series,
          'series',
          (series) => Array.isArray(series) && series.length >= 1 && series.length <= MAX_SAMPLES,
          'a non-empty numeric series',
          { max: 256 },
        );
        if (outer) return outer;
        for (let index = 0; index < params.series.length; index++) {
          const nested = largeArray(
            params.series[index],
            `series.${index}`,
            gpu,
            'a finite Float32-range number',
          );
          if (nested) return nested;
        }
      }
      const labels = largeArray(
        params.series_labels,
        'series_labels',
        (label) => boundedText(label, 120),
        'a bounded non-blank label',
        { max: 256 },
      );
      if (labels) return labels;
      return null;
    }
    case 'nest.phase_plane': {
      for (const field of ['grid', 'derivatives'] as const) {
        const collection = record(params[field]);
        if (!collection) continue;
        for (const [name, values] of Object.entries(collection)) {
          const issue = largeArray(
            values,
            `${field}.${name}`,
            gpu,
            'a finite Float32-range number',
          );
          if (issue) return issue;
        }
      }
      return null;
    }
    case 'nest.spatial_2d':
      return largeArray(
        params.positions,
        'positions',
        (position) => Array.isArray(position) && position.length === 2 && position.every(gpu),
        'an exact [x,y] Float32-range tuple',
        { max: PARAM_LIMITS.maxSpatialObjects },
      );
    case 'nest.spatial_map_2d':
      return largeArray(
        params.nodes,
        'nodes',
        (value) => {
          const node = record(value);
          return !!node && id(node.id) && boundedText(node.label, 120) &&
            gpu(node.x) && gpu(node.y);
        },
        'an identified 2D node with finite coordinates',
        { max: PARAM_LIMITS.maxSpatialObjects },
      );
    case 'nest.spatial_3d':
      return largeArray(
        params.objects,
        'objects',
        (object) => {
          const item = record(object);
          return !!item && gpu(item.x) && gpu(item.y) && gpu(item.z);
        },
        'an object with finite Float32-range x/y/z',
        { max: PARAM_LIMITS.maxSpatialObjects },
      );
    case 'nest.compartmental_dynamics': {
      const issue = numericFields(params, [time()]);
      if (issue) return issue;
      if (Array.isArray(params.compartments)) {
        const outer = largeArray(
          params.compartments,
          'compartments',
          (compartment) => {
            const item = record(compartment);
            if (!item) return false;
            const keys = Object.keys(item);
            return keys.every((key) => ['id', 'parent_id', 'label', 'values'].includes(key)) &&
              boundedText(item.id, 120) &&
              (item.parent_id === null || boundedText(item.parent_id, 120)) &&
              (item.label === undefined || boundedText(item.label, 240)) &&
              Array.isArray(item.values) && item.values.length >= 1;
          },
          'a closed compartment with id, parent_id, and non-empty values',
          { max: 256 },
        );
        if (outer) return outer;
        for (let index = 0; index < params.compartments.length; index++) {
          const item = record(params.compartments[index]);
          if (!item) continue;
          const nested = largeArray(
            item.values,
            `compartments.${index}.values`,
            gpu,
            'a finite Float32-range number',
          );
          if (nested) return nested;
        }
      }
      return null;
    }
    case 'nest.animation_replay':
      return largeArray(
        params.frames,
        'frames',
        (frame) => {
          const item = record(frame);
          const state = item ? record(item.state) : undefined;
          return !!item &&
            Object.keys(item).every((key) => ['time_ms', 'state', 'annotation'].includes(key)) &&
            finite(item.time_ms) &&
            (item.time_ms as number) >= 0 &&
            !!state &&
            Object.keys(state).length > 0 &&
            Object.keys(state).every(
              (key) => key.length >= 1 && key.length <= 80 && key.trim() === key,
            ) &&
            (item.annotation === undefined || boundedText(item.annotation, 500));
        },
        'a frame with non-negative time_ms and an object state',
        { max: 10_000 },
      );
    case 'corpus.knowledge_graph': {
      const nodeKinds = new Set<string>(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS);
      const edgeKinds = new Set<string>(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS);
      const attributesAreBounded = (value: unknown): boolean => {
        const attributes = record(value);
        if (!attributes || Object.keys(attributes).length > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
          return false;
        }
        return Object.values(attributes).every(
          (attribute) => !Array.isArray(attribute) ||
            attribute.length <= KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems,
        );
      };
      const evidenceIsBounded = (value: unknown): boolean =>
        Array.isArray(value) && value.length >= 1 &&
        value.length <= KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement;
      const epistemicIsDerived = (value: unknown): boolean => {
        const epistemic = record(value);
        return !!epistemic &&
          epistemic.status === 'derived_advisory' &&
          epistemic.advisory_only === true &&
          epistemic.is_paper_local_evidence === false &&
          epistemic.calibrated_posterior === false;
      };
      return largeArray(
        params.nodes,
        'nodes',
        (node) => {
          const item = record(node);
          return !!item &&
            Object.keys(item).every((key) => [
              'id', 'kind', 'label', 'detail', 'attributes', 'epistemic', 'evidence',
              'uncalibrated_score',
            ].includes(key)) &&
            boundedText(item.id, 120) &&
            boundedText(item.label, 240) &&
            (item.detail === undefined ||
              boundedText(item.detail, KNOWLEDGE_GRAPH_LIMITS.maxDetailLength)) &&
            attributesAreBounded(item.attributes) &&
            epistemicIsDerived(item.epistemic) &&
            evidenceIsBounded(item.evidence) &&
            nodeKinds.has(item.kind as string);
        },
        'a bounded, evidence-carrying paper/model/family node',
        { max: PARAM_LIMITS.maxGraphNodes },
      ) ?? largeArray(
        params.edges,
        'edges',
        (edge) => {
          const item = record(edge);
          return !!item &&
            Object.keys(item).every((key) => [
              'id', 'source', 'target', 'kind', 'label', 'attributes', 'epistemic',
              'evidence', 'uncalibrated_score',
            ].includes(key)) &&
            boundedText(item.id, 320) &&
            boundedText(item.source, 120) &&
            boundedText(item.target, 120) &&
            boundedText(item.label, 160) &&
            attributesAreBounded(item.attributes) &&
            epistemicIsDerived(item.epistemic) &&
            evidenceIsBounded(item.evidence) &&
            edgeKinds.has(item.kind as string);
        },
        'a bounded, identified, evidence-carrying knowledge-graph edge',
        { min: 0, max: PARAM_LIMITS.maxGraphEdges },
      );
    }
    default:
      return null;
  }
}

/** Inspect only a raw envelope's own data-property `params`. This runs before
 *  exact-JSON cloning so obviously oversized outer containers cannot force a
 *  large defensive clone merely to discover a maxSeries/maxGraph violation. */
export function preflightRawSkillParams(
  skillId: string,
  params: unknown,
): ParamPreflightIssue | null {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(params);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const allowed = ALLOWED_PARAM_FIELDS[skillId];
  if (allowed) {
    const allowedSet = new Set(allowed);
    const fields = Reflect.ownKeys(params);
    if (fields.some((field) => typeof field !== 'string' || !allowedSet.has(field))) {
      return {
        path: '(root)',
        message: 'params contain an unknown, symbol, or unsupported top-level field',
      };
    }
  }

  const ownValue = (key: string): unknown => {
    const descriptor = Object.getOwnPropertyDescriptor(params, key);
    return descriptor && 'value' in descriptor && descriptor.enumerable
      ? descriptor.value
      : undefined;
  };
  const arrayLength = (value: unknown): number | undefined => {
    if (!Array.isArray(value)) return undefined;
    const length = Object.getOwnPropertyDescriptor(value, 'length');
    return length && 'value' in length && Number.isSafeInteger(length.value)
      ? length.value as number
      : undefined;
  };
  const tooLongValue = (
    value: unknown,
    path: string,
    max: number,
  ): ParamPreflightIssue | null => {
    const length = arrayLength(value);
    return length !== undefined && length > max
      ? { path, message: `${path} may contain at most ${max} items` }
      : null;
  };
  const tooLong = (key: string, max: number): ParamPreflightIssue | null => {
    return tooLongValue(ownValue(key), key, max);
  };
  const tooManyKeys = (key: string, max: number): ParamPreflightIssue | null => {
    const value = ownValue(key);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
    const count = Reflect.ownKeys(value).length;
    return count > max
      ? { path: key, message: `${key} may contain at most ${max} properties` }
      : null;
  };
  const directArrays = (
    fields: readonly string[],
    max = MAX_SAMPLES,
  ): ParamPreflightIssue | null => {
    for (const field of fields) {
      const issue = tooLong(field, max);
      if (issue) return issue;
    }
    return null;
  };
  const nestedArrays = (
    outerKey: string,
    outerMax: number,
    innerKey?: string,
  ): ParamPreflightIssue | null => {
    const outer = ownValue(outerKey);
    const outerIssue = tooLongValue(outer, outerKey, outerMax);
    if (outerIssue || !Array.isArray(outer)) return outerIssue;
    const length = arrayLength(outer);
    if (length === undefined || length > outerMax) return null;
    for (let index = 0; index < length; index++) {
      const itemDescriptor = Object.getOwnPropertyDescriptor(outer, String(index));
      if (!itemDescriptor || !('value' in itemDescriptor) || !itemDescriptor.enumerable) {
        continue;
      }
      let nested = itemDescriptor.value;
      if (innerKey) {
        if (nested === null || typeof nested !== 'object' || Array.isArray(nested)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(nested, innerKey);
        nested = descriptor && 'value' in descriptor && descriptor.enumerable
          ? descriptor.value
          : undefined;
      }
      const issue = tooLongValue(
        nested,
        innerKey ? `${outerKey}.${index}.${innerKey}` : `${outerKey}.${index}`,
        MAX_SAMPLES,
      );
      if (issue) return issue;
    }
    return null;
  };
  const recordValueArrays = (key: string): ParamPreflightIssue | null => {
    const collection = ownValue(key);
    if (collection === null || typeof collection !== 'object' || Array.isArray(collection)) {
      return null;
    }
    const keys = Reflect.ownKeys(collection);
    if (keys.length > 2) {
      return { path: key, message: `${key} may contain at most 2 properties` };
    }
    for (const name of keys) {
      if (typeof name !== 'string') continue;
      const descriptor = Object.getOwnPropertyDescriptor(collection, name);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) continue;
      const issue = tooLongValue(descriptor.value, `${key}.${name}`, MAX_SAMPLES);
      if (issue) return issue;
    }
    return null;
  };
  const graphElementBudgets = (
    key: 'nodes' | 'edges',
    max: number,
  ): ParamPreflightIssue | null => {
    const collection = ownValue(key);
    const outerIssue = tooLongValue(collection, key, max);
    if (outerIssue || !Array.isArray(collection)) return outerIssue;
    const length = arrayLength(collection);
    if (length === undefined || length > max) return null;
    for (let index = 0; index < length; index++) {
      const itemDescriptor = Object.getOwnPropertyDescriptor(collection, String(index));
      if (!itemDescriptor || !('value' in itemDescriptor) || !itemDescriptor.enumerable) {
        continue;
      }
      const item = itemDescriptor.value;
      if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
      const attributesDescriptor = Object.getOwnPropertyDescriptor(item, 'attributes');
      const attributes = attributesDescriptor && 'value' in attributesDescriptor &&
          attributesDescriptor.enumerable
        ? attributesDescriptor.value
        : undefined;
      if (attributes !== null && typeof attributes === 'object' && !Array.isArray(attributes)) {
        let attributeCount = 0;
        for (const attributeKey in attributes) {
          if (!Object.hasOwn(attributes, attributeKey)) continue;
          attributeCount += 1;
          if (attributeCount > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
            return {
              path: `${key}.${index}.attributes`,
              message: `attributes may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributes} properties`,
            };
          }
          const attributeDescriptor = Object.getOwnPropertyDescriptor(attributes, attributeKey);
          if (!attributeDescriptor || !('value' in attributeDescriptor) ||
              !attributeDescriptor.enumerable) continue;
          const valueIssue = tooLongValue(
            attributeDescriptor.value,
            `${key}.${index}.attributes.${attributeKey}`,
            KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems,
          );
          if (valueIssue) return valueIssue;
        }
      }
      const evidenceDescriptor = Object.getOwnPropertyDescriptor(item, 'evidence');
      const evidence = evidenceDescriptor && 'value' in evidenceDescriptor &&
          evidenceDescriptor.enumerable
        ? evidenceDescriptor.value
        : undefined;
      const evidenceIssue = tooLongValue(
        evidence,
        `${key}.${index}.evidence`,
        KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement,
      );
      if (evidenceIssue) return evidenceIssue;
    }
    return null;
  };

  switch (skillId) {
    case 'nest.voltage_trace':
      return directArrays(['times_ms']) ??
        nestedArrays('series', PARAM_LIMITS.maxSeries) ??
        tooLong('series_labels', PARAM_LIMITS.maxSeries);
    case 'nest.spike_raster':
      return directArrays(['times_ms', 'senders']);
    case 'nest.isi_distribution':
    case 'nest.psth':
      return directArrays(['bin_centers_ms', 'values']);
    case 'nest.population_rate':
      return directArrays(['bin_centers_ms']) ??
        nestedArrays('series', PARAM_LIMITS.maxSeries, 'spike_counts') ??
        nestedArrays('series', PARAM_LIMITS.maxSeries, 'rates_hz');
    case 'nest.rate_response':
      return directArrays(['stimulus_amplitudes', 'rates_hz']);
    case 'nest.connectivity_matrix':
      return directArrays(['sources', 'targets', 'weights', 'delays']);
    case 'nest.connection_graph':
      return tooLong('nodes', PARAM_LIMITS.maxTopologyNodes) ??
        tooLong('edges', PARAM_LIMITS.maxTopologyEdges);
    case 'nest.adjacency_matrix':
    case 'nest.weight_matrix':
    case 'nest.delay_matrix':
      return directArrays(['source_ids', 'target_ids']) ??
        tooLong('cells', PARAM_LIMITS.maxSamples);
    case 'nest.in_degree_distribution':
    case 'nest.out_degree_distribution':
      return directArrays(['degrees', 'node_counts', 'values']);
    case 'nest.delay_distribution':
      return directArrays(['bin_centers_ms', 'delay_counts', 'values']);
    case 'nest.weight_histogram':
      return directArrays(['bin_centers', 'values']);
    case 'nest.spatial_2d':
      return tooLong('positions', PARAM_LIMITS.maxSpatialObjects);
    case 'nest.spatial_map_2d':
      return tooLong('nodes', PARAM_LIMITS.maxSpatialObjects);
    case 'nest.spatial_3d':
      return tooLong('objects', PARAM_LIMITS.maxSpatialObjects);
    case 'nest.plasticity_dynamics':
      return directArrays(['times_ms', 'weights']);
    case 'nest.compartmental_dynamics':
      return directArrays(['times_ms']) ??
        nestedArrays('compartments', PARAM_LIMITS.maxSeries, 'values');
    case 'nest.correlogram':
      return directArrays(['lags_ms', 'values']);
    case 'nest.stimulus_response':
      return directArrays(['times_ms', 'stimulus', 'response']);
    case 'nest.astrocyte_dynamics':
      return directArrays(['times_ms', 'ca_trace']);
    case 'nest.animation_replay':
      return tooLong('frames', 10_000);
    case 'corpus.knowledge_graph':
      return graphElementBudgets('nodes', PARAM_LIMITS.maxGraphNodes) ??
        graphElementBudgets('edges', PARAM_LIMITS.maxGraphEdges);
    case 'nest.phase_plane':
      return tooManyKeys('grid', 2) ?? tooManyKeys('derivatives', 2) ??
        tooManyKeys('axis_units', 2) ?? tooManyKeys('derivative_units', 2) ??
        recordValueArrays('grid') ?? recordValueArrays('derivatives') ??
        tooLong('axis_order', 2);
    default:
      return null;
  }
}

export function preflightRawEnvelopeParams(
  skillId: string,
  payload: unknown,
): ParamPreflightIssue | null {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(payload);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const fields = Reflect.ownKeys(payload);
  if (fields.some((field) => typeof field !== 'string' || !INVOCATION_FIELDS.has(field))) {
    return {
      scope: 'envelope',
      path: '(root)',
      message: 'invocation contains an unknown, symbol, or unsupported top-level field',
    };
  }
  const provenance = Object.getOwnPropertyDescriptor(payload, 'provenance');
  if (provenance && 'value' in provenance && provenance.enumerable &&
      provenance.value !== null && typeof provenance.value === 'object' &&
      !Array.isArray(provenance.value)) {
    const provenancePrototype = Object.getPrototypeOf(provenance.value);
    if (provenancePrototype === Object.prototype || provenancePrototype === null) {
      const provenanceFields = Reflect.ownKeys(provenance.value);
      if (provenanceFields.some(
        (field) => typeof field !== 'string' || !PROVENANCE_FIELDS.has(field),
      )) {
        return {
          scope: 'envelope',
          path: 'provenance',
          message: 'provenance contains an unknown, symbol, or unsupported field',
        };
      }
    }
  }
  const descriptor = Object.getOwnPropertyDescriptor(payload, 'params');
  const issue = descriptor && 'value' in descriptor && descriptor.enumerable
    ? preflightRawSkillParams(skillId, descriptor.value)
    : null;
  return issue ? { ...issue, scope: 'params' } : null;
}
