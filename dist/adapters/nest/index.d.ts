import { C as CortexelError } from '../../errors-DUbFUu6n.js';

/**
 * NEST recorder adapter (plain-data path).
 *
 * This bridge is intentionally narrower than NEST's complete recording-backend
 * surface. Revision 2 admits only an in-memory NEST 3.9/3.10 spike-recorder
 * status exported with `time_in_steps: false`. In that mode `events.times` is the
 * recorder's native binary64 millisecond representation. Step/offset pairs,
 * ASCII output, MPI/SIONlib output, and a status that omits the encoding flag are
 * different or potentially lossy clock representations and fail closed here.
 *
 * The adapter does not introspect a running simulator. Both arguments are first
 * copied through Cortexel's bounded, accessor-free snapshot boundary. The
 * returned request is still subject to the ordinary strict validation gate.
 *
 * Two scientific invariants are especially important:
 *
 *   - NEST memory-recorder events are not promised to be chronological. Their
 *     order and multiplicity are preserved exactly; scoped sorting belongs to
 *     the analysis/rendering layer.
 *
 *   - The complete recorded sender universe is caller-supplied. Inferring it
 *     from events would delete silent neurons and overstate activity rates.
 */

interface NestSpikeExport {
    /** The only NEST recording backend admitted by this adapter revision. */
    readonly record_to: 'memory';
    /** Must be explicitly false; step/offset mode has a different canonical clock. */
    readonly time_in_steps: false;
    /** NEST recording-device origin, in milliseconds. */
    readonly origin: number;
    /** Open recording start relative to origin, in milliseconds. */
    readonly start: number;
    /** Closed recording stop relative to origin, in milliseconds. */
    readonly stop: number;
    /** Authoritative number of events reported by the NEST recording device. */
    readonly n_events: number;
    /** NEST spike-recorder `events`: parallel `senders` and native-ms `times`. */
    readonly events: {
        readonly senders: readonly (number | string)[];
        readonly times: readonly number[];
    };
}
interface NestSpikeOptions {
    /** The complete set of recorded sender ids, including senders that never fired. */
    readonly recordedSenderIds: readonly (number | string)[];
    /** Version declaration admitted by revision 2: 3.9[.patch] or 3.10[.patch]. */
    readonly nestVersion: string;
    readonly runId?: string;
    readonly recorderId?: string;
}
type AdapterResult = {
    readonly ok: true;
    readonly request: Record<string, unknown>;
} | {
    readonly ok: false;
    readonly errors: readonly CortexelError[];
};
/**
 * Convert a revision-2-admitted NEST memory spike-recorder export into a
 * `neuro.spike_raster` request.
 */
declare function nestSpikeRecorderToRaster(exported: unknown, options: NestSpikeOptions): AdapterResult;

export { type AdapterResult, type NestSpikeExport, type NestSpikeOptions, nestSpikeRecorderToRaster };
