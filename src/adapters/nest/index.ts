/**
 * `cortexel/adapters/nest` — the NEST bridge.
 *
 * Plain-data adapters that convert already-exported NEST recorder output into Cortexel
 * requests. Their output is never exempt from the validation gate: an adapter produces a
 * request, and the same pipeline that validates a hand-authored request validates it.
 *
 * The package installs this implementation at `cortexel/adapters/nest`.
 *
 * Cortexel does not currently run or import PyNEST in either language runtime. The host
 * must supply the output of the revisioned projection that is required to preserve every
 * NumPy event-array value and its order before calling this entrypoint. Cortexel neither
 * performs nor authenticates that projection; raw NumPy/typed arrays are intentionally
 * outside this detached boundary. The independent Python package is a contract reader,
 * not a simulator adapter.
 */

export {
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN,
  nestSpikeRecorderToRaster,
  type NestSpikeExport,
  type NestSpikeCaptureAuthorityInputV1,
  type NestSpikeOptions,
  type AdapterResult,
} from './recorders.js';
