// Fail-fast structural preflight for large inline params. Zod intentionally
// reports every invalid array element; on million-sample hostile payloads that
// can allocate gigabytes before the public error cap is applied. This scanner
// runs on the exact-JSON clone and returns the first coarse type/range failure,
// while the canonical Zod schema remains the source of detailed validation and
// portable JSON Schema generation.

import { PARAM_LIMITS } from './params';

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
  'nest.rate_response': ['stimulus_amplitudes', 'rates_hz', 'stimulus_units'],
  'nest.connectivity_matrix': ['sources', 'targets', 'weights'],
  'nest.spatial_2d': ['positions', 'coordinate_units'],
  'nest.spatial_3d': ['objects', 'coordinate_units'],
  'nest.plasticity_dynamics': ['times_ms', 'weights', 'weight_units'],
  'nest.phase_plane': [
    'grid', 'derivatives', 'axis_units', 'derivative_units', 'axis_order', 'flattening',
  ],
  'nest.correlogram': ['lags_ms', 'correlation', 'normalization', 'correlation_units'],
  'nest.stimulus_response': ['times_ms', 'stimulus', 'response'],
  'nest.astrocyte_dynamics': ['times_ms', 'ca_trace', 'units'],
  'nest.compartmental_dynamics': ['times_ms', 'compartments'],
  'nest.animation_replay': ['frames'],
  'corpus.knowledge_graph': ['nodes', 'edges'],
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
      ]);
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
      return numericFields(params, [time('lags_ms'), gpuField('correlation')]);
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
      const nodeKinds = new Set(['paper', 'model', 'family']);
      const edgeKinds = new Set([
        'cites',
        'same_as',
        'variant_of',
        'instantiates',
        'belongs_to_family',
      ]);
      return largeArray(
        params.nodes,
        'nodes',
        (node) => {
          const item = record(node);
          return !!item &&
            Object.keys(item).every((key) => ['id', 'kind', 'label'].includes(key)) &&
            Object.keys(item).length === 3 &&
            boundedText(item.id, 120) &&
            boundedText(item.label, 240) &&
            nodeKinds.has(item.kind as string);
        },
        'a bounded paper/model/family node',
        { max: PARAM_LIMITS.maxGraphNodes },
      ) ?? largeArray(
        params.edges,
        'edges',
        (edge) => {
          const item = record(edge);
          return !!item &&
            Object.keys(item).every((key) => ['source', 'target', 'kind'].includes(key)) &&
            Object.keys(item).length === 3 &&
            boundedText(item.source, 120) &&
            boundedText(item.target, 120) &&
            edgeKinds.has(item.kind as string);
        },
        'a bounded knowledge-graph edge',
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

  switch (skillId) {
    case 'nest.voltage_trace':
      return directArrays(['times_ms']) ??
        nestedArrays('series', PARAM_LIMITS.maxSeries) ??
        tooLong('series_labels', PARAM_LIMITS.maxSeries);
    case 'nest.spike_raster':
      return directArrays(['times_ms', 'senders']);
    case 'nest.rate_response':
      return directArrays(['stimulus_amplitudes', 'rates_hz']);
    case 'nest.connectivity_matrix':
      return directArrays(['sources', 'targets', 'weights']);
    case 'nest.spatial_2d':
      return tooLong('positions', PARAM_LIMITS.maxSpatialObjects);
    case 'nest.spatial_3d':
      return tooLong('objects', PARAM_LIMITS.maxSpatialObjects);
    case 'nest.plasticity_dynamics':
      return directArrays(['times_ms', 'weights']);
    case 'nest.compartmental_dynamics':
      return directArrays(['times_ms']) ??
        nestedArrays('compartments', PARAM_LIMITS.maxSeries, 'values');
    case 'nest.correlogram':
      return directArrays(['lags_ms', 'correlation']);
    case 'nest.stimulus_response':
      return directArrays(['times_ms', 'stimulus', 'response']);
    case 'nest.astrocyte_dynamics':
      return directArrays(['times_ms', 'ca_trace']);
    case 'nest.animation_replay':
      return tooLong('frames', 10_000);
    case 'corpus.knowledge_graph':
      return tooLong('nodes', PARAM_LIMITS.maxGraphNodes) ??
        tooLong('edges', PARAM_LIMITS.maxGraphEdges);
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
