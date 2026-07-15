/**
 * `cortexel/adapters/nest` — the NEST bridge.
 *
 * Plain-data adapters that convert already-exported NEST recorder output into Cortexel
 * requests. Their output is never exempt from the validation gate: an adapter produces a
 * request, and the same pipeline that validates a hand-authored request validates it.
 *
 * Direct PyNEST integration (running a live simulator) lives in the Python package; this
 * entry handles data that has already crossed the Python/JavaScript boundary as plain JSON.
 */

export {
  nestSpikeRecorderToRaster,
  type NestSpikeExport,
  type NestSpikeOptions,
  type AdapterResult,
} from './recorders.js';
