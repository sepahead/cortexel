import { C as CortexelError } from '../../errors-DUbFUu6n.cjs';

/**
 * NEST recorder adapter (plain-data path).
 *
 * This bridge is intentionally narrower than NEST's complete recording-backend
 * surface. Revision 5 corrects the source clock for both the finite-stop and
 * positive-infinity/capture-bounded branches. Both branches admit only
 * caller-declared in-memory NEST
 * 3.10.0 spike-recorder status exported with
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

interface NestSpikeExportBase {
    /** The only NEST recording backend admitted by this adapter revision. */
    readonly record_to: 'memory';
    /** Must be explicitly false; step/offset mode has a different canonical clock. */
    readonly time_in_steps: false;
    /** NEST recording-device origin, in milliseconds. */
    readonly origin: number;
    /** Open recording start relative to origin, in milliseconds. */
    readonly start: number;
    /** Authoritative number of events reported by the NEST recording device. */
    readonly n_events: number;
    /** NEST spike-recorder `events`: parallel `senders` and native-ms `times`. */
    readonly events: {
        readonly senders: readonly (number | string)[];
        readonly times: readonly number[];
    };
}
/**
 * Exact finite-stop projection retained under the original public name.
 *
 * Do not widen this interface: pre-v4 TypeScript consumers are entitled to know
 * that `stop` is numeric. The additive union has its own explicit input name.
 */
interface NestSpikeExport extends NestSpikeExportBase {
    /** Closed recording stop relative to origin, in milliseconds. */
    readonly stop: number;
}
/** Explicit revision name for the unchanged finite-stop public shape. */
interface NestSpikeExportV3 extends NestSpikeExport {
}
/**
 * Closed projection token for NEST 3.10.0's positive-infinity Time sentinel.
 *
 * PyNEST exposes that sentinel as DBL_MAX. Projection revision 2 is responsible
 * for recognizing it under the exact pinned runtime and emitting this token;
 * the adapter deliberately does not reinterpret an ordinary DBL_MAX number.
 */
interface NestTimePositiveInfinity {
    readonly kind: 'nest_time_positive_infinity';
}
/** Historical positive-infinity input shape introduced in the unreleased draft. */
interface NestSpikeExportV4 extends NestSpikeExportBase {
    readonly stop: NestTimePositiveInfinity;
}
/** Current revision-5 finite input alias; the detached status shape is unchanged. */
interface NestSpikeExportV5Finite extends NestSpikeExport {
}
/** Current revision-5 positive-infinity input alias. */
interface NestSpikeExportV5PositiveInfinity extends NestSpikeExportV4 {
}
/** Closed current union for callers that intentionally handle both adapter branches. */
type NestSpikeExportInput = NestSpikeExportV5Finite | NestSpikeExportV5PositiveInfinity;
interface NestSpikeOptionsBase {
    /** The complete set of recorded sender ids, including senders that never fired. */
    readonly recordedSenderIds: readonly (number | string)[];
    /** Caller-declared upstream profile shape admitted by this adapter. */
    readonly nestVersion: '3.10.0';
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
interface NestSpikeCaptureAuthorityInputV2 {
    readonly kind: 'caller_declaration';
    readonly profile: 'cortexel-nest-memory-spike-capture-authority.v2';
    readonly runtimeStatus: {
        readonly nestVersion: '3.10.0';
        readonly statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v2';
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
        readonly captureBoundary: 'after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation';
    };
    /** Exact finite grid preimages only; an infinite stop has no stopTics. */
    readonly recordingGrid: {
        readonly originTics: string;
        readonly startTics: string;
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
/**
 * Corrected finite-stop authority for adapter revision 5.
 *
 * The build-profile literal is essential: NEST's finite-Time ceiling depends
 * on the compiled C++ integer widths, not on the version string alone.
 */
type NestSpikeCaptureAuthorityInputV3 = Omit<NestSpikeCaptureAuthorityInputV1, 'profile' | 'runtimeStatus'> & {
    readonly profile: 'cortexel-nest-memory-spike-capture-authority.v3';
    readonly runtimeStatus: NestSpikeCaptureAuthorityInputV1['runtimeStatus'] & {
        readonly timeBuildProfile: 'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1';
    };
};
/** Corrected positive-infinity authority for adapter revision 5. */
type NestSpikeCaptureAuthorityInputV4 = Omit<NestSpikeCaptureAuthorityInputV2, 'profile' | 'runtimeStatus'> & {
    readonly profile: 'cortexel-nest-memory-spike-capture-authority.v4';
    readonly runtimeStatus: NestSpikeCaptureAuthorityInputV2['runtimeStatus'] & {
        readonly timeBuildProfile: 'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1';
    };
};
/**
 * Historical finite-stop options retained under an explicit migration name.
 * The current adapter rejects this authority because it does not bind the time
 * build or source-faithful projection.
 */
interface NestSpikeOptionsV3Legacy extends NestSpikeOptionsBase {
    /** Caller declaration paired only with a finite revision-3 stop. */
    readonly captureAuthority: NestSpikeCaptureAuthorityInputV1;
}
/** @deprecated Use `NestSpikeOptionsV5Finite`. */
interface NestSpikeOptionsV3 extends NestSpikeOptionsV3Legacy {
}
/** @deprecated Unshipped draft authority; use `NestSpikeOptionsV5PositiveInfinity`. */
interface NestSpikeOptionsV4 extends NestSpikeOptionsBase {
    /** Caller declaration paired only with the revision-4 infinity sentinel. */
    readonly captureAuthority: NestSpikeCaptureAuthorityInputV2;
}
/** Corrected finite-stop options accepted by adapter revision 5. */
interface NestSpikeOptionsV5Finite extends NestSpikeOptionsBase {
    readonly captureAuthority: NestSpikeCaptureAuthorityInputV3;
}
/** Corrected positive-infinity options accepted by adapter revision 5. */
interface NestSpikeOptionsV5PositiveInfinity extends NestSpikeOptionsBase {
    readonly captureAuthority: NestSpikeCaptureAuthorityInputV4;
}
/** Closed revision-5 union for callers that intentionally handle both branches. */
type NestSpikeOptionsInput = NestSpikeOptionsV5Finite | NestSpikeOptionsV5PositiveInfinity;
/** Primary options type for the current executable adapter. */
type NestSpikeOptions = NestSpikeOptionsInput;
type AdapterResult = {
    readonly ok: true;
    readonly request: Record<string, unknown>;
} | {
    readonly ok: false;
    readonly errors: readonly CortexelError[];
};
declare const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3: "cortexel.nest-spike-recorder-adapter-input.v3";
declare const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5: "cortexel.nest-spike-recorder-adapter-input.v5";
/** Current source-faithful revision-5 digest domain. */
declare const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN: "cortexel.nest-spike-recorder-adapter-input.v5";
/** Exact PyNEST 3.10.0 millisecond serialization of positive-infinity Time. */
declare const NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS: number;
declare const NEST_TIME_BUILD_PROFILE: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1";
/**
 * Convert an admitted revision-5 finite or positive-infinity NEST memory
 * spike-recorder export into a `neuro.spike_raster` request.
 */
declare function nestSpikeRecorderToRaster(exported: unknown, options: NestSpikeOptionsInput): AdapterResult;

export { type AdapterResult, NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN, NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3, NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5, NEST_TIME_BUILD_PROFILE, NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS, type NestSpikeCaptureAuthorityInputV1, type NestSpikeCaptureAuthorityInputV2, type NestSpikeCaptureAuthorityInputV3, type NestSpikeCaptureAuthorityInputV4, type NestSpikeExport, type NestSpikeExportInput, type NestSpikeExportV3, type NestSpikeExportV4, type NestSpikeExportV5Finite, type NestSpikeExportV5PositiveInfinity, type NestSpikeOptions, type NestSpikeOptionsInput, type NestSpikeOptionsV3, type NestSpikeOptionsV3Legacy, type NestSpikeOptionsV4, type NestSpikeOptionsV5Finite, type NestSpikeOptionsV5PositiveInfinity, type NestTimePositiveInfinity, nestSpikeRecorderToRaster };
