// Headless scene verification — the cheap "valid but empty" check (Vega-Lite's
// scene-graph emptiness trick, adapted to SceneData). A spec can validate yet
// carry no renderable data (zero spikes, empty node list); an agent can call
// this on the adapted SceneData to catch a technically-valid-but-blank render
// WITHOUT rendering pixels, and either fix the data or disclose the blank.

import { SAFE_DISPLAY_STRING_PATTERN } from '../safeRuntime';

export interface EmptySceneResult {
  /** False means the input was not safely inspectable SceneData. Invalid input
   *  is never conflated with a legitimate, empty render. */
  valid: boolean;
  empty: boolean;
  /** Which channels carried data (for an actionable message). */
  populated: string[];
  reason?: string;
}

function invalid(reason: string): EmptySceneResult {
  return { valid: false, empty: false, populated: [], reason };
}

type DataRead = { present: false } | { present: true; value: unknown } | { invalid: true };

const FLOAT32_MAX = 3.4028234663852886e38;
const SCENE_DATA_FIELDS = new Set([
  'spikeTimes', 'spikeSenders', 'timeUnits', 'voltageTraces', 'voltageUnits',
  'traceTimes', 'traceSender', 'weightSeries', 'weightUnits', 'weightSynapse',
  'analogTraces', 'networkNodes', 'networkEdges', 'networkWeightUnits',
  'networkDelayUnits', 'networkCoordinateUnits', 'networkLayout', 'vectorField',
]);

function readData(record: object, key: string): DataRead {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) return { present: false };
  return 'value' in descriptor && descriptor.enumerable
    ? { present: true, value: descriptor.value }
    : { invalid: true };
}

function finiteTypedLength(value: unknown, precision: 'f32' | 'f64'): number | null {
  const validType = precision === 'f32'
    ? value instanceof Float32Array
    : value instanceof Float64Array;
  if (!validType) return null;
  const array = value as Float32Array | Float64Array;
  for (let index = 0; index < array.length; index++) {
    if (!Number.isFinite(array[index])) return null;
  }
  return array.length;
}

function denseDataArray(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null;
  const length = Object.getOwnPropertyDescriptor(value, 'length');
  if (!length || !('value' in length) || !Number.isSafeInteger(length.value)) return null;
  const output: unknown[] = [];
  for (let index = 0; index < length.value; index++) {
    const item = Object.getOwnPropertyDescriptor(value, String(index));
    if (!item || !('value' in item) || !item.enumerable) return null;
    output.push(item.value);
  }
  return Reflect.ownKeys(value).length === output.length + 1 ? output : null;
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    SAFE_DISPLAY_STRING_PATTERN.test(value);
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? value as Record<string, unknown>
    : null;
}

function exactDataRecord(
  value: unknown,
  allowed: ReadonlySet<string>,
): Record<string, unknown> | null {
  const source = plainRecord(value);
  if (!source) return null;
  const snapshot: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(source)) {
    if (typeof key !== 'string' || !allowed.has(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return null;
    Object.defineProperty(snapshot, key, {
      value: descriptor.value,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return snapshot;
}

function safeId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) &&
    value >= 0 && !Object.is(value, -0);
}

function finiteGpuNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) &&
    Math.abs(value) <= FLOAT32_MAX;
}

/** Detect whether adapted SceneData has any renderable content. No-throw even
 *  when an agent accidentally supplies null, accessors, or a hostile Proxy. */
export function detectEmptyScene(data: unknown): EmptySceneResult {
  try {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return invalid('input is not a SceneData object');
    }
    const prototype = Object.getPrototypeOf(data);
    if (prototype !== Object.prototype && prototype !== null) {
      return invalid('SceneData must be a plain object');
    }
    const record = exactDataRecord(data, SCENE_DATA_FIELDS);
    if (!record) return invalid('SceneData contains an unknown, symbol, accessor, or non-enumerable field');
    const populated: string[] = [];
    const numericLengths = new Map<string, number>();
    for (const [field, precision] of [
      ['spikeTimes', 'f64'],
      ['spikeSenders', 'f32'],
      ['traceTimes', 'f64'],
      ['voltageTraces', 'f32'],
      ['weightSeries', 'f32'],
    ] as const) {
      const fieldValue = readData(record, field);
      if ('invalid' in fieldValue) return invalid(`${field} must be an enumerable data property`);
      if (!fieldValue.present) continue;
      const length = finiteTypedLength(fieldValue.value, precision);
      if (length === null) return invalid(`${field} must be a finite ${precision === 'f64' ? 'Float64Array' : 'Float32Array'}`);
      numericLengths.set(field, length);
    }
    if (numericLengths.has('spikeTimes') !== numericLengths.has('spikeSenders') ||
        numericLengths.get('spikeTimes') !== numericLengths.get('spikeSenders')) {
      return invalid('spikeTimes and spikeSenders must be present with equal lengths');
    }
    if ((numericLengths.get('spikeTimes') ?? 0) > 0) populated.push('spikeTimes');

    const traceLengths: Array<[string, number]> = [];
    for (const field of ['voltageTraces', 'weightSeries'] as const) {
      const length = numericLengths.get(field);
      if (length !== undefined) traceLengths.push([field, length]);
    }
    const analog = readData(record, 'analogTraces');
    if ('invalid' in analog) return invalid('analogTraces must be an enumerable data property');
    if (analog.present) {
      const analogRecord = exactDataRecord(
        analog.value,
        new Set(['values', 'variable', 'units']),
      );
      if (!analogRecord) return invalid('analogTraces must be a plain data object');
      const values = readData(analogRecord, 'values');
      const variable = readData(analogRecord, 'variable');
      const units = readData(analogRecord, 'units');
      if ('invalid' in values || !values.present ||
          'invalid' in variable || !variable.present ||
          'invalid' in units || !units.present ||
          !nonblank(variable.value) || !nonblank(units.value)) {
        return invalid('analogTraces requires finite values plus nonblank variable and units');
      }
      const length = finiteTypedLength(values.value, 'f32');
      if (length === null) return invalid('analogTraces.values must be a finite Float32Array');
      traceLengths.push(['analogTraces', length]);
    }
    if (traceLengths.length > 0) {
      const timeLength = numericLengths.get('traceTimes');
      if (timeLength === undefined || traceLengths.some(([, length]) => length !== timeLength)) {
        return invalid('traceTimes must align one-to-one with every trace channel');
      }
      for (const [field, length] of traceLengths) if (length > 0) populated.push(field);
      const timeUnits = readData(record, 'timeUnits');
      if ('invalid' in timeUnits || !timeUnits.present || !nonblank(timeUnits.value)) {
        return invalid('trace channels require nonblank timeUnits');
      }
    } else if (numericLengths.has('traceTimes')) {
      return invalid('traceTimes requires at least one trace value channel');
    }
    if (numericLengths.has('voltageTraces')) {
      const units = readData(record, 'voltageUnits');
      if ('invalid' in units || !units.present || !nonblank(units.value)) {
        return invalid('voltageTraces requires nonblank voltageUnits');
      }
    }
    if (numericLengths.has('weightSeries')) {
      const units = readData(record, 'weightUnits');
      if ('invalid' in units || !units.present || !nonblank(units.value)) {
        return invalid('weightSeries requires nonblank weightUnits');
      }
    }
    if (numericLengths.has('spikeTimes')) {
      const units = readData(record, 'timeUnits');
      if ('invalid' in units || !units.present || !nonblank(units.value)) {
        return invalid('spike channels require nonblank timeUnits');
      }
    }
    for (const [metadata, channel] of [
      ['voltageUnits', 'voltageTraces'],
      ['weightUnits', 'weightSeries'],
    ] as const) {
      const value = readData(record, metadata);
      if ('invalid' in value) return invalid(`${metadata} must be an enumerable data property`);
      if (value.present && (!numericLengths.has(channel) || !nonblank(value.value))) {
        return invalid(`${metadata} requires its corresponding ${channel} channel`);
      }
    }
    const timeUnits = readData(record, 'timeUnits');
    if ('invalid' in timeUnits) return invalid('timeUnits must be an enumerable data property');
    if (timeUnits.present &&
        (!nonblank(timeUnits.value) ||
          (!numericLengths.has('spikeTimes') && traceLengths.length === 0))) {
      return invalid('timeUnits requires a spike or trace time axis');
    }
    const traceSender = readData(record, 'traceSender');
    if ('invalid' in traceSender) return invalid('traceSender must be an enumerable data property');
    if (traceSender.present &&
        (!safeId(traceSender.value) ||
          (!numericLengths.has('voltageTraces') && !analog.present))) {
      return invalid('traceSender requires a voltage or analog trace and a safe sender id');
    }
    const weightSynapse = readData(record, 'weightSynapse');
    if ('invalid' in weightSynapse) return invalid('weightSynapse must be an enumerable data property');
    if (weightSynapse.present) {
      const pair = exactDataRecord(weightSynapse.value, new Set(['sender', 'target']));
      const sender = pair ? readData(pair, 'sender') : { invalid: true } as const;
      const target = pair ? readData(pair, 'target') : { invalid: true } as const;
      if (!numericLengths.has('weightSeries') ||
          'invalid' in sender || !sender.present || !safeId(sender.value) ||
          'invalid' in target || !target.present || !safeId(target.value)) {
        return invalid('weightSynapse requires weightSeries plus safe sender/target ids');
      }
    }

    const nodesField = readData(record, 'networkNodes');
    if ('invalid' in nodesField) return invalid('networkNodes must be an enumerable data property');
    const nodeIds = new Set<number>();
    let nodes: unknown[] | null = null;
    if (nodesField.present) {
      nodes = denseDataArray(nodesField.value);
      if (!nodes) return invalid('networkNodes must be a dense data array');
      const layout = readData(record, 'networkLayout');
      if ('invalid' in layout || !layout.present || typeof layout.value !== 'string' ||
          !['unpositioned', 'provided-2d', 'provided-3d'].includes(layout.value)) {
        return invalid('networkNodes requires a declared networkLayout');
      }
      const layoutValue = layout.value as 'unpositioned' | 'provided-2d' | 'provided-3d';
      for (const nodeValue of nodes) {
        const node = exactDataRecord(nodeValue, new Set(['id', 'x', 'y', 'z', 'label']));
        if (!node) return invalid('networkNodes must contain plain data objects');
        const id = readData(node, 'id');
        const label = readData(node, 'label');
        if ('invalid' in id || !id.present || !safeId(id.value) ||
            'invalid' in label || !label.present || !nonblank(label.value) || nodeIds.has(id.value)) {
          return invalid('networkNodes require unique non-negative safe ids and nonblank labels');
        }
        nodeIds.add(id.value);
        const coordinates = ['x', 'y', 'z'].map((axis) => readData(node, axis));
        const presentCount = coordinates.filter((coordinate) => 'present' in coordinate && coordinate.present).length;
        if (presentCount !== 0 && presentCount !== 3) return invalid('network node coordinates must be all present or all absent');
        for (const coordinate of coordinates) {
          if ('invalid' in coordinate || ('present' in coordinate && coordinate.present &&
              !finiteGpuNumber(coordinate.value))) {
            return invalid('network node coordinates must be finite Float32-range numbers');
          }
        }
        if (layoutValue === 'unpositioned' && presentCount !== 0) {
          return invalid('unpositioned network nodes must not claim measured coordinates');
        }
        if (layoutValue !== 'unpositioned' && presentCount !== 3) {
          return invalid('provided network layouts require x/y/z for every node');
        }
        if (layoutValue === 'provided-2d' &&
            'present' in coordinates[2] && coordinates[2].present && coordinates[2].value !== 0) {
          return invalid('provided-2d network nodes must lie on the z=0 plane');
        }
      }
      if (layoutValue !== 'unpositioned') {
        const units = readData(record, 'networkCoordinateUnits');
        if ('invalid' in units || !units.present || !nonblank(units.value)) {
          return invalid('provided network coordinates require networkCoordinateUnits');
        }
      }
      if (nodes.length > 0) populated.push('networkNodes');
    }
    const edgesField = readData(record, 'networkEdges');
    if ('invalid' in edgesField) return invalid('networkEdges must be an enumerable data property');
    let networkHasWeights = false;
    let networkHasDelays = false;
    if (edgesField.present) {
      const edges = denseDataArray(edgesField.value);
      if (!edges || !nodes) return invalid('networkEdges requires a networkNodes array');
      let weightCount = 0;
      let delayCount = 0;
      for (const edgeValue of edges) {
        const edge = exactDataRecord(
          edgeValue,
          new Set(['source', 'target', 'weight', 'delay']),
        );
        const source = edge ? readData(edge, 'source') : { invalid: true } as const;
        const target = edge ? readData(edge, 'target') : { invalid: true } as const;
        if ('invalid' in source || !source.present || !safeId(source.value) || !nodeIds.has(source.value) ||
            'invalid' in target || !target.present || !safeId(target.value) || !nodeIds.has(target.value)) {
          return invalid('networkEdges must reference declared network node ids');
        }
        const weight = readData(edge!, 'weight');
        const delay = readData(edge!, 'delay');
        if ('invalid' in weight || (weight.present && !finiteGpuNumber(weight.value))) {
          return invalid('network edge weights must be finite Float32-range numbers');
        }
        if ('invalid' in delay ||
            (delay.present && (!finiteGpuNumber(delay.value) || delay.value <= 0))) {
          return invalid('network edge delays must be positive finite Float32-range numbers');
        }
        if (weight.present) weightCount += 1;
        if (delay.present) delayCount += 1;
      }
      if (weightCount !== 0 && weightCount !== edges.length) {
        return invalid('network edge weights must be present for every edge or none');
      }
      if (delayCount !== 0 && delayCount !== edges.length) {
        return invalid('network edge delays must be present for every edge or none');
      }
      if (weightCount > 0) {
        networkHasWeights = true;
        const units = readData(record, 'networkWeightUnits');
        if ('invalid' in units || !units.present || !nonblank(units.value)) {
          return invalid('network edge weights require nonblank networkWeightUnits');
        }
      }
      if (delayCount > 0) {
        networkHasDelays = true;
        const units = readData(record, 'networkDelayUnits');
        if ('invalid' in units || !units.present || !nonblank(units.value)) {
          return invalid('network edge delays require nonblank networkDelayUnits');
        }
      }
    }
    for (const [metadata, present] of [
      ['networkWeightUnits', networkHasWeights],
      ['networkDelayUnits', networkHasDelays],
    ] as const) {
      const value = readData(record, metadata);
      if ('invalid' in value) return invalid(`${metadata} must be an enumerable data property`);
      if (value.present && (!present || !nonblank(value.value))) {
        return invalid(`${metadata} requires the corresponding measurement on every edge`);
      }
    }
    const networkLayout = readData(record, 'networkLayout');
    if ('invalid' in networkLayout) return invalid('networkLayout must be an enumerable data property');
    if (networkLayout.present && !nodesField.present) {
      return invalid('networkLayout requires networkNodes');
    }
    const coordinateUnits = readData(record, 'networkCoordinateUnits');
    if ('invalid' in coordinateUnits) {
      return invalid('networkCoordinateUnits must be an enumerable data property');
    }
    if (coordinateUnits.present) {
      if (!nodesField.present || !nonblank(coordinateUnits.value) ||
          !networkLayout.present || networkLayout.value === 'unpositioned') {
        return invalid('networkCoordinateUnits requires a provided network layout');
      }
    }

    const vectorField = readData(record, 'vectorField');
    if ('invalid' in vectorField) return invalid('vectorField must be an enumerable data property');
    if (vectorField.present) {
      const vectors = denseDataArray(vectorField.value);
      if (!vectors) return invalid('vectorField must be a dense data array');
      for (const vectorValue of vectors) {
        const vector = exactDataRecord(
          vectorValue,
          new Set(['x', 'y', 'z', 'dx', 'dy', 'dz']),
        );
        if (!vector || ['x', 'y', 'z', 'dx', 'dy', 'dz'].some((field) => {
          const item = readData(vector, field);
          return 'invalid' in item || !item.present ||
            !finiteGpuNumber(item.value);
        })) return invalid('vectorField entries require finite Float32-range x/y/z/dx/dy/dz values');
      }
      if (vectors.length > 0) populated.push('vectorField');
    }

    const empty = populated.length === 0;
    return {
      valid: true,
      empty,
      populated,
      reason: empty
        ? 'SceneData has no renderable content — all channels are empty; the render would be blank'
        : undefined,
    };
  } catch {
    return invalid('SceneData could not be safely inspected');
  }
}
