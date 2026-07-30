import { C as CortexelError } from '../../errors-DUbFUu6n.cjs';

/**
 * NEST recorder adapter (plain-data path).
 *
 * This bridge is intentionally narrower than NEST's complete recording-backend
 * surface. Revision 3 admits only the bounded shape of a caller-declared
 * in-memory NEST 3.10.0 spike-recorder status exported with
 * `time_in_steps: false` and projected through the named plain-data projection.
 * That projection must copy NumPy event arrays into dense JSON arrays without
 * reordering, coercing, deduplicating, or dropping elements. In this mode
 * `events.times` retains the recorder's native binary64 millisecond values.
 * Step/offset pairs, raw NumPy objects, ASCII output, MPI/SIONlib output, and a
 * status that omits the encoding flag are different authority boundaries and
 * fail closed here.
 *
 * The adapter does not introspect a running simulator. Both arguments are first
 * copied through Cortexel's bounded, accessor-free snapshot boundary. The
 * returned request is still subject to the ordinary strict validation gate.
 * `nestVersion`, the complete sender universe, capture history, process scope, and
 * optional run/recorder ids are host declarations. The source digest binds the
 * detached plain-data status projection. A second domain-separated digest binds that projection to
 * every normalized adapter option. Neither digest authenticates the simulator,
 * process, recorder history, or wiring.
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
    /** Caller-declared upstream profile shape admitted by revision 3. */
    readonly nestVersion: '3.10.0';
    /**
     * Caller-declared capture history needed to interpret one detached status as a
     * complete recording. Cortexel checks internal coherence but cannot authenticate
     * any of these facts.
     */
    readonly captureAuthority: NestSpikeCaptureAuthorityInputV1;
    readonly runId?: string;
    readonly recorderId?: string;
}
interface NestSpikeCaptureAuthorityInputV1 {
    readonly kind: 'caller_declaration';
    readonly profile: 'cortexel-nest-memory-spike-capture-authority.v1';
    readonly runtimeStatus: {
        readonly nestVersion: '3.10.0';
        readonly statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v1';
        readonly executionScope: {
            readonly kind: 'single_process';
            readonly numProcesses: 1;
            readonly rank: 0;
            readonly localNumThreads: number;
        };
        readonly resolutionMs: number;
        readonly ticsPerMs: string;
        readonly resolutionTics: string;
        readonly captureBiologicalTimeTics: string;
        readonly captureBoundary: 'after_successful_simulate_or_run_return';
    };
    readonly recordingGrid: {
        readonly originTics: string;
        readonly startTics: string;
        readonly stopTics: string;
    };
    readonly bufferEpoch: {
        readonly beganBy: 'recorder_creation' | 'n_events_zero';
        readonly beganAtBiologicalTimeTics: string;
    };
    readonly recordingPlan: {
        readonly lastMutationAtBiologicalTimeTics: string;
        readonly scope: 'window_backend_time_encoding_and_sender_wiring';
        readonly senderUniverseBinding: 'recorded_sender_ids_exactly_equal_full_window_connected_source_universe';
    };
    readonly clockEpochContinuity: 'biological_time_monotonic_since_last_kernel_initialization';
    readonly eventCompleteness: 'complete_for_recorded_senders';
}
type AdapterResult = {
    readonly ok: true;
    readonly request: Record<string, unknown>;
} | {
    readonly ok: false;
    readonly errors: readonly CortexelError[];
};
declare const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN: "cortexel.nest-spike-recorder-adapter-input.v3";
/**
 * Convert a revision-3-admitted NEST memory spike-recorder export into a
 * `neuro.spike_raster` request.
 */
declare function nestSpikeRecorderToRaster(exported: unknown, options: NestSpikeOptions): AdapterResult;

export { type AdapterResult, NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN, type NestSpikeCaptureAuthorityInputV1, type NestSpikeExport, type NestSpikeOptions, nestSpikeRecorderToRaster };
