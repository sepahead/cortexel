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

import { canonicalDigest } from '../../core/canonicalize.js';
import { REQUEST_CONTRACT_IDENTITY } from '../../core/contract-identity.js';
import { makeError, type CortexelError } from '../../core/errors.js';
import { getBudgetLimits } from '../../core/limits.js';
import { snapshotValue } from '../../core/safe-snapshot.js';
import {
  nestFiniteTimeLimitTicsV310,
  projectNestTicsToMillisecondsV310,
  projectNestWindowEndpointsV310,
} from '../../core/semantics/nest-time.js';
import {
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3,
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5,
} from './profile.js';

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
export interface NestSpikeExport extends NestSpikeExportBase {
  /** Closed recording stop relative to origin, in milliseconds. */
  readonly stop: number;
}

/** Explicit revision name for the unchanged finite-stop public shape. */
export interface NestSpikeExportV3 extends NestSpikeExport {}

/**
 * Closed projection token for NEST 3.10.0's positive-infinity Time sentinel.
 *
 * PyNEST exposes that sentinel as DBL_MAX. Projection revision 2 is responsible
 * for recognizing it under the exact pinned runtime and emitting this token;
 * the adapter deliberately does not reinterpret an ordinary DBL_MAX number.
 */
export interface NestTimePositiveInfinity {
  readonly kind: 'nest_time_positive_infinity';
}

/** Historical positive-infinity input shape introduced in the unreleased draft. */
export interface NestSpikeExportV4 extends NestSpikeExportBase {
  readonly stop: NestTimePositiveInfinity;
}

/** Current revision-5 finite input alias; the detached status shape is unchanged. */
export interface NestSpikeExportV5Finite extends NestSpikeExport {}

/** Current revision-5 positive-infinity input alias. */
export interface NestSpikeExportV5PositiveInfinity extends NestSpikeExportV4 {}

/** Closed current union for callers that intentionally handle both adapter branches. */
export type NestSpikeExportInput =
  | NestSpikeExportV5Finite
  | NestSpikeExportV5PositiveInfinity;

interface NestSpikeOptionsBase {
  /** The complete set of recorded sender ids, including senders that never fired. */
  readonly recordedSenderIds: readonly (number | string)[];
  /** Caller-declared upstream profile shape admitted by this adapter. */
  readonly nestVersion: '3.10.0';
  readonly runId?: string;
  readonly recorderId?: string;
}

export interface NestSpikeCaptureAuthorityInputV1 {
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

export interface NestSpikeCaptureAuthorityInputV2 {
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
    readonly captureBoundary:
      'after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation';
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
export type NestSpikeCaptureAuthorityInputV3 = Omit<
  NestSpikeCaptureAuthorityInputV1,
  'profile' | 'runtimeStatus'
> & {
  readonly profile: 'cortexel-nest-memory-spike-capture-authority.v3';
  readonly runtimeStatus: NestSpikeCaptureAuthorityInputV1['runtimeStatus'] & {
    readonly timeBuildProfile: 'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1';
  };
};

/** Corrected positive-infinity authority for adapter revision 5. */
export type NestSpikeCaptureAuthorityInputV4 = Omit<
  NestSpikeCaptureAuthorityInputV2,
  'profile' | 'runtimeStatus'
> & {
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
export interface NestSpikeOptionsV3Legacy extends NestSpikeOptionsBase {
  /** Caller declaration paired only with a finite revision-3 stop. */
  readonly captureAuthority: NestSpikeCaptureAuthorityInputV1;
}

/** @deprecated Use `NestSpikeOptionsV5Finite`. */
export interface NestSpikeOptionsV3 extends NestSpikeOptionsV3Legacy {}

/** @deprecated Unshipped draft authority; use `NestSpikeOptionsV5PositiveInfinity`. */
export interface NestSpikeOptionsV4 extends NestSpikeOptionsBase {
  /** Caller declaration paired only with the revision-4 infinity sentinel. */
  readonly captureAuthority: NestSpikeCaptureAuthorityInputV2;
}

/** Corrected finite-stop options accepted by adapter revision 5. */
export interface NestSpikeOptionsV5Finite extends NestSpikeOptionsBase {
  readonly captureAuthority: NestSpikeCaptureAuthorityInputV3;
}

/** Corrected positive-infinity options accepted by adapter revision 5. */
export interface NestSpikeOptionsV5PositiveInfinity extends NestSpikeOptionsBase {
  readonly captureAuthority: NestSpikeCaptureAuthorityInputV4;
}

/** Closed revision-5 union for callers that intentionally handle both branches. */
export type NestSpikeOptionsInput =
  | NestSpikeOptionsV5Finite
  | NestSpikeOptionsV5PositiveInfinity;

/** Primary options type for the current executable adapter. */
export type NestSpikeOptions = NestSpikeOptionsInput;

export type AdapterResult =
  | { readonly ok: true; readonly request: Record<string, unknown> }
  | { readonly ok: false; readonly errors: readonly CortexelError[] };

type PlainRecord = Record<string, unknown>;

const ADMITTED_NEST_VERSION = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.nestVersion;
export const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3 =
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3.inputDigestDomain;
export const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5 =
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.inputDigestDomain;
/** Current source-faithful revision-5 digest domain. */
export const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN = NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5;
/** Exact PyNEST 3.10.0 millisecond serialization of positive-infinity Time. */
export const NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS =
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.positiveInfinityExportedMs;
export const NEST_TIME_BUILD_PROFILE =
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.timeBuildProfile;
const CAPTURE_AUTHORITY_PROFILE_V3 =
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.finiteStop.captureAuthorityProfile;
const CAPTURE_AUTHORITY_PROFILE_V4 =
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.positiveInfinityCaptureBounded
    .captureAuthorityProfile;
const CAPTURE_AUTHORITY_KIND = 'caller_declaration';
const STATUS_READ_METHOD_V1 =
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.finiteStop.statusReadMethod;
const STATUS_READ_METHOD_V2 =
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.positiveInfinityCaptureBounded
    .statusReadMethod;
const CAPTURE_BOUNDARY_V1 = 'after_successful_simulate_or_run_return';
const CAPTURE_BOUNDARY_V2 = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.captureBoundary;
const RECORDING_PLAN_SCOPE = 'window_backend_time_encoding_and_sender_wiring';
const SENDER_UNIVERSE_BINDING =
  'recorded_sender_ids_exactly_equal_full_window_connected_source_universe';
const CLOCK_EPOCH_CONTINUITY = 'biological_time_monotonic_since_last_kernel_initialization';
const EVENT_COMPLETENESS = 'complete_for_recorded_senders';
const CANONICAL_POSITIVE_DECIMAL = /^[1-9][0-9]*$/u;
const CANONICAL_NON_NEGATIVE_DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
const CORTEXEL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]*$/u;
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_TIC_DECIMAL_LENGTH = 16;
const MAX_SAFE_TICS = BigInt(Number.MAX_SAFE_INTEGER);

function fail(errors: readonly CortexelError[]): AdapterResult {
  return { ok: false, errors };
}

function adapterFailure(
  code: CortexelError['code'],
  instancePath: string,
  message: string,
): AdapterResult {
  return fail([makeError({ code, stage: 'adapter', instancePath, message })]);
}

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstUnknownKey(value: PlainRecord, allowed: ReadonlySet<string>): string | undefined {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .sort()[0];
}

function exactObjectKeysFailure(
  value: PlainRecord,
  allowed: ReadonlySet<string>,
  instancePath: string,
  label: string,
  adapterRevision = 5,
): AdapterResult | undefined {
  const unknown = firstUnknownKey(value, allowed);
  if (unknown === undefined) return undefined;
  return adapterFailure(
    'ADAPTER_MAPPING_REQUIRED',
    `${instancePath}/${unknown}`,
    `${label} is closed for adapter revision ${adapterRevision}; unknown member ${JSON.stringify(unknown)} is not consumed or digest-normalized.`,
  );
}

function snapshotFailure(
  errors: readonly CortexelError[],
  inputName: 'export' | 'options',
): AdapterResult {
  const accessorOrHostileReflection = errors.some(
    (error) =>
      error.code === 'SNAPSHOT_ACCESSOR_PROPERTY' || error.code === 'SNAPSHOT_HOSTILE_REFLECTION',
  );
  if (accessorOrHostileReflection) {
    const firstHostile = errors.find(
      (error) =>
        error.code === 'SNAPSHOT_ACCESSOR_PROPERTY' || error.code === 'SNAPSHOT_HOSTILE_REFLECTION',
    );
    return adapterFailure(
      'ADAPTER_ACCESSOR_INPUT_REJECTED',
      firstHostile?.instancePath ?? '',
      `the NEST ${inputName} could not be safely snapshotted because it carries an accessor or hostile reflection trap. Pass detached plain data.`,
    );
  }

  // Preserve precise bounded snapshot diagnostics for non-accessor JSON defects
  // (for example a non-finite number or sparse array). Relabelling those as an
  // accessor failure would make the corrective action false.
  return fail(errors);
}

/**
 * Normalize a native NEST sender id without coercion.
 *
 * JavaScript numbers must be positive safe integers. Decimal strings are the
 * lossless escape hatch for ids outside that range; they must already be in
 * canonical positive base-10 form. The length cap is the figure contract's
 * identifier cap, so successful adapter output cannot later fail for this reason.
 */
function normalizeSenderId(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : undefined;
  }
  if (
    typeof value === 'string' &&
    value.length <= MAX_IDENTIFIER_LENGTH &&
    CANONICAL_POSITIVE_DECIMAL.test(value)
  ) {
    return value;
  }
  return undefined;
}

function isCortexelIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_IDENTIFIER_LENGTH &&
    CORTEXEL_IDENTIFIER.test(value)
  );
}

type ParsedTics =
  | { readonly ok: true; readonly canonical: string; readonly value: bigint }
  | { readonly ok: false; readonly result: AdapterResult };

function parseCanonicalTics(
  value: unknown,
  instancePath: string,
  label: string,
  positive: boolean,
): ParsedTics {
  const pattern = positive ? CANONICAL_POSITIVE_DECIMAL : CANONICAL_NON_NEGATIVE_DECIMAL;
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_TIC_DECIMAL_LENGTH ||
    !pattern.test(value)
  ) {
    return {
      ok: false,
      result: adapterFailure(
        'ADAPTER_MAPPING_REQUIRED',
        instancePath,
        `${label} must be a canonical ${positive ? 'positive' : 'non-negative'} base-10 integer string of at most ${MAX_TIC_DECIMAL_LENGTH} digits.`,
      ),
    };
  }
  return { ok: true, canonical: value, value: BigInt(value) };
}

function projectedMillisecondsFailure(
  tics: bigint,
  ticsPerMs: bigint,
  milliseconds: number,
  instancePath: string,
  label: string,
): AdapterResult | undefined {
  const projected = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
  if (!projected.ok) {
    return adapterFailure(
      'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
      instancePath,
      `${label} is outside the pinned source-faithful NEST 3.10.0 time profile: ${projected.message}`,
    );
  }
  if (!Object.is(projected.milliseconds, milliseconds)) {
    return adapterFailure(
      'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
      instancePath,
      `${label} must equal pinned NEST 3.10.0 Time::get_ms binary64 evaluation of its declared integer-tic preimage. Received ${milliseconds}; the source-faithful tic authority projects to ${projected.milliseconds}.`,
    );
  }
  return undefined;
}

/**
 * Convert an admitted revision-5 finite or positive-infinity NEST memory
 * spike-recorder export into a `neuro.spike_raster` request.
 */
export function nestSpikeRecorderToRaster(
  exported: unknown,
  options: NestSpikeOptionsInput,
): AdapterResult {
  const limits = getBudgetLimits('standard');

  // Materialize BOTH caller-controlled values before reading a property from
  // either one. This closes accessor execution and post-validation mutation gaps.
  const exportedSnapshot = snapshotValue(exported, limits);
  const optionsSnapshot = snapshotValue(options, limits);

  if (!exportedSnapshot.ok) return snapshotFailure(exportedSnapshot.errors, 'export');
  if (!optionsSnapshot.ok) return snapshotFailure(optionsSnapshot.errors, 'options');

  const value = exportedSnapshot.value;
  const optionValue = optionsSnapshot.value;
  if (!isPlainRecord(value)) {
    return adapterFailure(
      'ADAPTER_NEST_UNSUPPORTED_SHAPE',
      '',
      'expected a plain NEST spike-recorder status object.',
    );
  }
  if (!isPlainRecord(optionValue)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '',
      'NEST adapter options must be a plain object containing a version and the complete recorded sender universe.',
    );
  }
  const adapterRevision = 5;
  const optionKeysFailure = exactObjectKeysFailure(
    optionValue,
    new Set(['recordedSenderIds', 'nestVersion', 'captureAuthority', 'runId', 'recorderId']),
    '',
    'NEST adapter options',
    adapterRevision,
  );
  if (optionKeysFailure) return optionKeysFailure;
  const exportKeysFailure = exactObjectKeysFailure(
    value,
    new Set([
      'record_to',
      'time_in_steps',
      'origin',
      'start',
      'stop',
      'n_events',
      'events',
    ]),
    '',
    'NEST exportedStatus',
    adapterRevision,
  );
  if (exportKeysFailure) return exportKeysFailure;

  if (value.record_to !== 'memory') {
    return adapterFailure(
      'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
      '/record_to',
      `revision ${adapterRevision} accepts only an explicit \`record_to: "memory"\` status. File, screen, MPI, and SIONlib serializations are not admitted as lossless clock boundaries.`,
    );
  }
  if (value.time_in_steps !== false) {
    return adapterFailure(
      'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
      '/time_in_steps',
      `revision ${adapterRevision} requires the status field \`time_in_steps\` to be explicitly false. Missing or step/offset time encodings are not reconstructed as milliseconds.`,
    );
  }

  if (!isPlainRecord(value.events)) {
    return adapterFailure(
      'ADAPTER_NEST_UNSUPPORTED_SHAPE',
      '/events',
      'a NEST spike-recorder export must have an `events` object with `senders` and `times` arrays.',
    );
  }
  const events = value.events;
  const offsetKey = Object.prototype.hasOwnProperty.call(events, 'offsets')
    ? 'offsets'
    : Object.prototype.hasOwnProperty.call(events, 'offset')
      ? 'offset'
      : undefined;
  if (offsetKey !== undefined) {
    return adapterFailure(
      'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
      `/events/${offsetKey}`,
      `offset-bearing events contradict the revision-${adapterRevision}-admitted native-millisecond mode. Preserve the raw step/offset representation for a future contract instead of collapsing it here.`,
    );
  }
  const eventKeysFailure = exactObjectKeysFailure(
    events,
    new Set(['senders', 'times']),
    '/events',
    'NEST exportedStatus.events',
    adapterRevision,
  );
  if (eventKeysFailure) return eventKeysFailure;
  if (!Array.isArray(events.senders) || !Array.isArray(events.times)) {
    return adapterFailure(
      'ADAPTER_NEST_UNSUPPORTED_SHAPE',
      '/events',
      '`events.senders` and `events.times` must both be dense plain arrays.',
    );
  }
  const nEvents = value.n_events;
  if (typeof nEvents !== 'number' || !Number.isSafeInteger(nEvents) || nEvents < 0) {
    return adapterFailure(
      'ADAPTER_NEST_UNSUPPORTED_SHAPE',
      '/n_events',
      '`n_events` is required and must be a non-negative safe integer copied from the NEST recording-device status. Cortexel does not infer completeness from the event arrays.',
    );
  }
  if (events.senders.length !== nEvents || events.times.length !== nEvents) {
    return adapterFailure(
      'ADAPTER_NEST_UNSUPPORTED_SHAPE',
      '/n_events',
      `the authoritative NEST n_events value (${nEvents}) must equal both parallel event-array lengths; received senders=${events.senders.length} and times=${events.times.length}. Cortexel cannot author a completeness claim from inconsistent status data.`,
    );
  }

  const origin = value.origin;
  const start = value.start;
  const stop = value.stop;
  if (typeof origin !== 'number' || !Number.isFinite(origin) || origin < 0) {
    return adapterFailure(
      'ADAPTER_NEST_UNSUPPORTED_SHAPE',
      '/origin',
      '`origin` must be a finite non-negative number in NEST milliseconds.',
    );
  }
  if (typeof start !== 'number' || !Number.isFinite(start) || start < 0) {
    return adapterFailure(
      'ADAPTER_NEST_UNSUPPORTED_SHAPE',
      '/start',
      '`start` must be a finite non-negative number relative to the NEST recording-device origin.',
    );
  }
  let positiveInfinityStop = false;
  let finiteStop: number | undefined;
  if (isPlainRecord(stop)) {
    const stopKeysFailure = exactObjectKeysFailure(
      stop,
      new Set(['kind']),
      '/stop',
      'positive-infinity stop sentinel',
      5,
    );
    if (stopKeysFailure) return stopKeysFailure;
    if (stop.kind !== 'nest_time_positive_infinity') {
      return adapterFailure(
        'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        '/stop/kind',
        'adapter revision 5 requires the exact projection token `{"kind":"nest_time_positive_infinity"}` for NEST 3.10.0 positive-infinity Time. Arbitrary tags are not stop authority.',
      );
    }
    positiveInfinityStop = true;
  } else {
    if (stop === Number.MAX_VALUE) {
      return adapterFailure(
        'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        '/stop',
        'raw DBL_MAX is NEST 3.10.0\'s serialized positive-infinity Time sentinel, not an ordinary finite recorder stop. Apply plain-data projection revision 2 so it emits `{"kind":"nest_time_positive_infinity"}`, then use capture-authority v4 with adapter revision 5.',
      );
    }
    if (typeof stop !== 'number' || !Number.isFinite(stop) || stop < 0) {
      return adapterFailure(
        'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        '/stop',
        '`stop` must be a finite non-negative number relative to the NEST recording-device origin.',
      );
    }
    if (!(start < stop)) {
      return adapterFailure(
        'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        '/stop',
        '`stop` must be strictly greater than `start` for the NEST origin-relative recording interval.',
      );
    }
    finiteStop = stop;
  }
  const nestVersion = optionValue.nestVersion;
  if (
    typeof nestVersion !== 'string' ||
    nestVersion.length > 120 ||
    nestVersion !== ADMITTED_NEST_VERSION
  ) {
    return adapterFailure(
      'ADAPTER_UNSUPPORTED_VERSION',
      '/nestVersion',
      `nestVersion is required and must equal the exact pinned adapter-revision-${adapterRevision} profile 3.10.0. Other NEST releases and patches remain unsupported until separately executed and evidenced.`,
    );
  }

  const captureAuthority = optionValue.captureAuthority;
  if (!isPlainRecord(captureAuthority)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority',
      'captureAuthority is required. A detached final status alone cannot prove that the NEST memory buffer was not reset, that recorder configuration and wiring stayed fixed, that the successful-return capture endpoint was reached, that the kernel clock stayed monotonic, that the projection was lossless, or that MPI ranks were merged.',
    );
  }
  const captureKeysFailure = exactObjectKeysFailure(
    captureAuthority,
    new Set([
      'kind',
      'profile',
      'runtimeStatus',
      'recordingGrid',
      'bufferEpoch',
      'recordingPlan',
      'clockEpochContinuity',
      'eventCompleteness',
    ]),
    '/captureAuthority',
    'captureAuthority',
    adapterRevision,
  );
  if (captureKeysFailure) return captureKeysFailure;
  if (captureAuthority.kind !== CAPTURE_AUTHORITY_KIND) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/kind',
      `captureAuthority.kind must equal ${JSON.stringify(CAPTURE_AUTHORITY_KIND)}. This detached adapter accepts a caller declaration, not an authenticated live-capture receipt.`,
    );
  }
  const captureAuthorityProfile = positiveInfinityStop
    ? CAPTURE_AUTHORITY_PROFILE_V4
    : CAPTURE_AUTHORITY_PROFILE_V3;
  if (captureAuthority.profile !== captureAuthorityProfile) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/profile',
      positiveInfinityStop
        ? `captureAuthority.profile must equal ${JSON.stringify(captureAuthorityProfile)} for the revision-5 positive-infinity branch. Finite-stop V3 and positive-infinity V4 authority are not interchangeable.`
        : `captureAuthority.profile must equal ${JSON.stringify(CAPTURE_AUTHORITY_PROFILE_V3)} for the corrected revision-5 finite-stop branch. Historical V1 authority does not bind the pinned time build or source-faithful clock projection.`,
    );
  }

  const runtimeStatus = captureAuthority.runtimeStatus;
  if (!isPlainRecord(runtimeStatus)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/runtimeStatus',
      'captureAuthority.runtimeStatus must be a closed plain object.',
    );
  }
  const runtimeKeysFailure = exactObjectKeysFailure(
    runtimeStatus,
    new Set([
      'nestVersion',
      'statusReadMethod',
      'executionScope',
      'resolutionMs',
      'ticsPerMs',
      'resolutionTics',
      'captureBiologicalTimeTics',
      'captureBoundary',
      'timeBuildProfile',
    ]),
    '/captureAuthority/runtimeStatus',
    'captureAuthority.runtimeStatus',
    adapterRevision,
  );
  if (runtimeKeysFailure) return runtimeKeysFailure;
  if (runtimeStatus.nestVersion !== ADMITTED_NEST_VERSION) {
    return adapterFailure(
      'ADAPTER_UNSUPPORTED_VERSION',
      '/captureAuthority/runtimeStatus/nestVersion',
      'captureAuthority.runtimeStatus.nestVersion must equal the pinned 3.10.0 profile.',
    );
  }
  if (runtimeStatus.nestVersion !== nestVersion) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/runtimeStatus/nestVersion',
      'the capture runtime version must exactly equal the top-level adapter version declaration.',
    );
  }
  if (runtimeStatus.timeBuildProfile !== NEST_TIME_BUILD_PROFILE) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/runtimeStatus/timeBuildProfile',
      `timeBuildProfile must equal ${JSON.stringify(NEST_TIME_BUILD_PROFILE)}. NEST's Time ceiling and serialization depend on compiled integer widths and IEEE-754 behavior, so version alone is insufficient authority.`,
    );
  }
  const statusReadMethod = positiveInfinityStop ? STATUS_READ_METHOD_V2 : STATUS_READ_METHOD_V1;
  if (runtimeStatus.statusReadMethod !== statusReadMethod) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/runtimeStatus/statusReadMethod',
      positiveInfinityStop
        ? `statusReadMethod must equal ${JSON.stringify(statusReadMethod)} for the revision-5 positive-infinity branch; raw NumPy values, bulk collections, lossy projections, and reconstructed status objects have different authority boundaries.`
        : `statusReadMethod must equal ${JSON.stringify(STATUS_READ_METHOD_V1)}; raw NumPy values, bulk collections, lossy projections, and reconstructed status objects have different authority boundaries.`,
    );
  }
  const captureBoundary = positiveInfinityStop ? CAPTURE_BOUNDARY_V2 : CAPTURE_BOUNDARY_V1;
  if (runtimeStatus.captureBoundary !== captureBoundary) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/runtimeStatus/captureBoundary',
      `captureBoundary must equal ${JSON.stringify(captureBoundary)}.`,
    );
  }
  const resolutionMs = runtimeStatus.resolutionMs;
  if (typeof resolutionMs !== 'number' || !Number.isFinite(resolutionMs) || !(resolutionMs > 0)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/runtimeStatus/resolutionMs',
      'resolutionMs must be a finite positive binary64 value copied from the pinned NEST runtime status.',
    );
  }
  const ticsPerMsResult = parseCanonicalTics(
    runtimeStatus.ticsPerMs,
    '/captureAuthority/runtimeStatus/ticsPerMs',
    'ticsPerMs',
    true,
  );
  if (!ticsPerMsResult.ok) return ticsPerMsResult.result;
  const resolutionTicsResult = parseCanonicalTics(
    runtimeStatus.resolutionTics,
    '/captureAuthority/runtimeStatus/resolutionTics',
    'resolutionTics',
    true,
  );
  if (!resolutionTicsResult.ok) return resolutionTicsResult.result;
  const captureTicsResult = parseCanonicalTics(
    runtimeStatus.captureBiologicalTimeTics,
    '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
    'captureBiologicalTimeTics',
    false,
  );
  if (!captureTicsResult.ok) return captureTicsResult.result;

  const executionScope = runtimeStatus.executionScope;
  if (!isPlainRecord(executionScope)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/runtimeStatus/executionScope',
      'executionScope must be a closed single-process scope object.',
    );
  }
  const executionScopeKeysFailure = exactObjectKeysFailure(
    executionScope,
    new Set(['kind', 'numProcesses', 'rank', 'localNumThreads']),
    '/captureAuthority/runtimeStatus/executionScope',
    'captureAuthority.runtimeStatus.executionScope',
    adapterRevision,
  );
  if (executionScopeKeysFailure) return executionScopeKeysFailure;
  if (
    executionScope.kind !== 'single_process' ||
    executionScope.numProcesses !== 1 ||
    executionScope.rank !== 0 ||
    typeof executionScope.localNumThreads !== 'number' ||
    !Number.isSafeInteger(executionScope.localNumThreads) ||
    executionScope.localNumThreads < 1 ||
    executionScope.localNumThreads > 1_000_000
  ) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/runtimeStatus/executionScope',
      `revision ${adapterRevision} admits only one exact single-process scope: kind=single_process, numProcesses=1, rank=0, and localNumThreads a safe integer from 1 through 1000000. Rank-local and caller-premerged MPI status is not a complete recorder authority.`,
    );
  }

  const recordingGrid = captureAuthority.recordingGrid;
  if (!isPlainRecord(recordingGrid)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/recordingGrid',
      positiveInfinityStop
        ? 'recordingGrid must be a closed object containing only the exact integer-tic preimages of finite origin and start. NEST positive infinity has no finite stopTics preimage.'
        : 'recordingGrid must be a closed object containing the exact integer-tic preimages of origin, start, and stop.',
    );
  }
  const recordingGridKeysFailure = exactObjectKeysFailure(
    recordingGrid,
    positiveInfinityStop
      ? new Set(['originTics', 'startTics'])
      : new Set(['originTics', 'startTics', 'stopTics']),
    '/captureAuthority/recordingGrid',
    'captureAuthority.recordingGrid',
    adapterRevision,
  );
  if (recordingGridKeysFailure) return recordingGridKeysFailure;
  const originTicsResult = parseCanonicalTics(
    recordingGrid.originTics,
    '/captureAuthority/recordingGrid/originTics',
    'originTics',
    false,
  );
  if (!originTicsResult.ok) return originTicsResult.result;
  const startTicsResult = parseCanonicalTics(
    recordingGrid.startTics,
    '/captureAuthority/recordingGrid/startTics',
    'startTics',
    false,
  );
  if (!startTicsResult.ok) return startTicsResult.result;
  let finiteStopTics: { readonly canonical: string; readonly value: bigint } | undefined;
  if (!positiveInfinityStop) {
    const stopTicsResult = parseCanonicalTics(
      recordingGrid.stopTics,
      '/captureAuthority/recordingGrid/stopTics',
      'stopTics',
      false,
    );
    if (!stopTicsResult.ok) return stopTicsResult.result;
    finiteStopTics = stopTicsResult;
  }

  const bufferEpoch = captureAuthority.bufferEpoch;
  if (!isPlainRecord(bufferEpoch)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/bufferEpoch',
      'bufferEpoch must identify the most recent recorder creation or n_events=0 memory clear.',
    );
  }
  const bufferKeysFailure = exactObjectKeysFailure(
    bufferEpoch,
    new Set(['beganBy', 'beganAtBiologicalTimeTics']),
    '/captureAuthority/bufferEpoch',
    'captureAuthority.bufferEpoch',
    adapterRevision,
  );
  if (bufferKeysFailure) return bufferKeysFailure;
  if (bufferEpoch.beganBy !== 'recorder_creation' && bufferEpoch.beganBy !== 'n_events_zero') {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/bufferEpoch/beganBy',
      'bufferEpoch.beganBy must be recorder_creation or n_events_zero.',
    );
  }
  const bufferBeganTicsResult = parseCanonicalTics(
    bufferEpoch.beganAtBiologicalTimeTics,
    '/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics',
    'bufferEpoch.beganAtBiologicalTimeTics',
    false,
  );
  if (!bufferBeganTicsResult.ok) return bufferBeganTicsResult.result;

  const recordingPlan = captureAuthority.recordingPlan;
  if (!isPlainRecord(recordingPlan)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/recordingPlan',
      'recordingPlan must identify the most recent recorder-window, backend, clock, or sender-wiring mutation.',
    );
  }
  const planKeysFailure = exactObjectKeysFailure(
    recordingPlan,
    new Set(['lastMutationAtBiologicalTimeTics', 'scope', 'senderUniverseBinding']),
    '/captureAuthority/recordingPlan',
    'captureAuthority.recordingPlan',
    adapterRevision,
  );
  if (planKeysFailure) return planKeysFailure;
  if (recordingPlan.scope !== RECORDING_PLAN_SCOPE) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/recordingPlan/scope',
      `recordingPlan.scope must equal ${JSON.stringify(RECORDING_PLAN_SCOPE)}.`,
    );
  }
  if (recordingPlan.senderUniverseBinding !== SENDER_UNIVERSE_BINDING) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/recordingPlan/senderUniverseBinding',
      `senderUniverseBinding must equal ${JSON.stringify(SENDER_UNIVERSE_BINDING)}.`,
    );
  }
  const planMutationTicsResult = parseCanonicalTics(
    recordingPlan.lastMutationAtBiologicalTimeTics,
    '/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics',
    'recordingPlan.lastMutationAtBiologicalTimeTics',
    false,
  );
  if (!planMutationTicsResult.ok) return planMutationTicsResult.result;
  if (captureAuthority.clockEpochContinuity !== CLOCK_EPOCH_CONTINUITY) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/clockEpochContinuity',
      `captureAuthority.clockEpochContinuity must equal ${JSON.stringify(CLOCK_EPOCH_CONTINUITY)}. NEST can reset biological_time to zero without destroying the recorder or clearing retained memory, and its own 3.10.0 source marks that operation incompletely supported.`,
    );
  }
  if (captureAuthority.eventCompleteness !== EVENT_COMPLETENESS) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/eventCompleteness',
      `captureAuthority.eventCompleteness must equal ${JSON.stringify(EVENT_COMPLETENESS)}.`,
    );
  }

  const ticsPerMs = ticsPerMsResult.value;
  const resolutionTics = resolutionTicsResult.value;
  const captureBiologicalTimeTics = captureTicsResult.value;
  const originTics = originTicsResult.value;
  const startTics = startTicsResult.value;
  const beganAtBiologicalTimeTics = bufferBeganTicsResult.value;
  const lastMutationAtBiologicalTimeTics = planMutationTicsResult.value;

  // Primitive source authority owns its own diagnostic path. Validate every
  // retained tic before any parallel-ms or combined-endpoint derivation so a
  // bad scale, capture, or history value cannot be misattributed to resolutionMs
  // or to the finite stop merely because a later helper encountered it first.
  if (ticsPerMs > MAX_SAFE_TICS) {
    return adapterFailure(
      'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
      '/captureAuthority/runtimeStatus/ticsPerMs',
      'ticsPerMs is outside the revision-5 source-clock subset; it must be no larger than Number.MAX_SAFE_INTEGER.',
    );
  }
  const finiteTimeLimitTics = nestFiniteTimeLimitTicsV310(resolutionTics);
  if (finiteTimeLimitTics === undefined) {
    return adapterFailure(
      'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
      '/captureAuthority/runtimeStatus/resolutionTics',
      'resolutionTics is outside the pinned LP64/int64 NEST 3.10.0 finite-Time build profile and exact-integer subset.',
    );
  }
  const primitiveTics: Array<readonly [bigint, string, string]> = [
    [
      resolutionTics,
      '/captureAuthority/runtimeStatus/resolutionTics',
      'resolutionTics',
    ],
    [
      captureBiologicalTimeTics,
      '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
      'captureBiologicalTimeTics',
    ],
    [originTics, '/captureAuthority/recordingGrid/originTics', 'originTics'],
    [startTics, '/captureAuthority/recordingGrid/startTics', 'startTics'],
    [
      beganAtBiologicalTimeTics,
      '/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics',
      'beganAtBiologicalTimeTics',
    ],
    [
      lastMutationAtBiologicalTimeTics,
      '/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics',
      'lastMutationAtBiologicalTimeTics',
    ],
  ];
  if (finiteStopTics !== undefined) {
    primitiveTics.splice(4, 0, [
      finiteStopTics.value,
      '/captureAuthority/recordingGrid/stopTics',
      'stopTics',
    ]);
  }
  for (const [tics, instancePath, label] of primitiveTics) {
    if (tics > MAX_SAFE_TICS || tics >= finiteTimeLimitTics) {
      return adapterFailure(
        'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath,
        `${label} is outside the revision-5 conservative source-clock subset; every retained NEST Time tic must be a safe integer strictly below the pinned finite-Time limit.`,
      );
    }
    const projection = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
    if (!projection.ok) {
      return adapterFailure(
        'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath,
        `${label} cannot round-trip through the pinned NEST 3.10.0 binary64 millisecond projection: ${projection.message}`,
      );
    }
  }

  const projectionEntries: Array<readonly [bigint, number, string, string]> = [
    [resolutionTics, resolutionMs, '/captureAuthority/runtimeStatus/resolutionMs', 'resolutionMs'],
    [originTics, origin, '/captureAuthority/recordingGrid/originTics', 'origin'],
    [startTics, start, '/captureAuthority/recordingGrid/startTics', 'start'],
  ];
  if (!positiveInfinityStop) {
    projectionEntries.push([
      finiteStopTics!.value,
      finiteStop!,
      '/captureAuthority/recordingGrid/stopTics',
      'stop',
    ]);
  }
  for (const [tics, milliseconds, instancePath, label] of projectionEntries) {
    const projectionFailure = projectedMillisecondsFailure(
      tics,
      ticsPerMs,
      milliseconds,
      instancePath,
      label,
    );
    if (projectionFailure) return projectionFailure;
  }

  const gridEntries: Array<readonly [bigint, string, string]> = [
    [originTics, '/captureAuthority/recordingGrid/originTics', 'originTics'],
    [startTics, '/captureAuthority/recordingGrid/startTics', 'startTics'],
    [
      captureBiologicalTimeTics,
      '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
      'captureBiologicalTimeTics',
    ],
    [
      beganAtBiologicalTimeTics,
      '/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics',
      'beganAtBiologicalTimeTics',
    ],
    [
      lastMutationAtBiologicalTimeTics,
      '/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics',
      'lastMutationAtBiologicalTimeTics',
    ],
  ];
  if (!positiveInfinityStop) {
    gridEntries.splice(2, 0, [
      finiteStopTics!.value,
      '/captureAuthority/recordingGrid/stopTics',
      'stopTics',
    ]);
  }
  for (const [tics, instancePath, label] of gridEntries) {
    if (tics % resolutionTics !== 0n) {
      return adapterFailure(
        'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath,
        `${label} must lie exactly on the declared NEST runtime resolution grid.`,
      );
    }
  }

  const absoluteStartTics = originTics + startTics;
  const absoluteUpperTics = positiveInfinityStop
    ? captureBiologicalTimeTics
    : originTics + finiteStopTics!.value;
  if (positiveInfinityStop) {
    if (captureBiologicalTimeTics <= absoluteStartTics) {
      return adapterFailure(
        'ADAPTER_MAPPING_REQUIRED',
        '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
        'captureBiologicalTimeTics must be strictly greater than originTics + startTics. The finite successful-return capture endpoint, not the configured positive-infinity stop, closes this raster window.',
      );
    }
  } else {
    if (captureBiologicalTimeTics < absoluteUpperTics) {
      return adapterFailure(
        'ADAPTER_MAPPING_REQUIRED',
        '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
        'captureBiologicalTimeTics must be at least originTics + stopTics, and the status must be read only after the Simulate or Run call that reached that endpoint returned successfully.',
      );
    }
  }
  if (beganAtBiologicalTimeTics > absoluteStartTics) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics',
      'the most recent recorder creation or n_events=0 clear must be no later than originTics + startTics.',
    );
  }
  if (lastMutationAtBiologicalTimeTics > absoluteStartTics) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics',
      'the most recent recorder-window, backend, clock, or sender-wiring mutation must be no later than originTics + startTics.',
    );
  }

  for (const [tics, instancePath, label] of [
    [
      absoluteStartTics,
      '/captureAuthority/recordingGrid/startTics',
      'originTics + startTics',
    ],
    [
      absoluteUpperTics,
      positiveInfinityStop
        ? '/captureAuthority/runtimeStatus/captureBiologicalTimeTics'
        : '/captureAuthority/recordingGrid/stopTics',
      positiveInfinityStop
        ? 'captureBiologicalTimeTics'
        : 'originTics + stopTics',
    ],
  ] as const) {
    if (tics > MAX_SAFE_TICS || tics >= finiteTimeLimitTics) {
      return adapterFailure(
        'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath,
        `${label} is outside the revision-5 conservative source-clock subset; each combined endpoint must be a safe integer strictly below the pinned finite-Time limit.`,
      );
    }
    const projection = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
    if (!projection.ok) {
      return adapterFailure(
        'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath,
        `${label} cannot round-trip through the pinned NEST 3.10.0 binary64 millisecond projection: ${projection.message}`,
      );
    }
  }

  // NEST adds Time values in integer tics and serializes the combined absolute
  // endpoint through Time::get_ms. Adding separately serialized fields, or using
  // an ideal rational quotient, implements a different clock.
  const windowProjection = projectNestWindowEndpointsV310({
    ticsPerMs,
    resolutionTics,
    retainedTics: [
      originTics,
      startTics,
      ...(positiveInfinityStop ? [] : [finiteStopTics!.value]),
      captureBiologicalTimeTics,
      beganAtBiologicalTimeTics,
      lastMutationAtBiologicalTimeTics,
    ],
    lowerEndpointTics: absoluteStartTics,
    upperEndpointTics: absoluteUpperTics,
  });
  if (!windowProjection.ok) {
    return adapterFailure(
      'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
      positiveInfinityStop
        ? '/captureAuthority/runtimeStatus/captureBiologicalTimeTics'
        : '/captureAuthority/recordingGrid/stopTics',
      `the declared NEST clock is outside the revision-5 source-faithful finite and distinguishable subset: ${windowProjection.message}`,
    );
  }
  const captureTime = positiveInfinityStop
    ? windowProjection.upperMilliseconds
    : undefined;

  const recordedValues = optionValue.recordedSenderIds;
  if (!Array.isArray(recordedValues) || recordedValues.length === 0) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/recordedSenderIds',
      'recordedSenderIds is required and must be a non-empty array containing the complete recorded universe, including silent senders.',
    );
  }

  const recordedSenderIds: string[] = [];
  const recordedUniverse = new Set<string>();
  for (let index = 0; index < recordedValues.length; index++) {
    const normalized = normalizeSenderId(recordedValues[index]);
    if (normalized === undefined) {
      return adapterFailure(
        'ADAPTER_MAPPING_REQUIRED',
        `/recordedSenderIds/${index}`,
        'a recorded sender id must be a positive safe-integer number or an already-canonical positive decimal string.',
      );
    }
    if (recordedUniverse.has(normalized)) {
      return adapterFailure(
        'ADAPTER_MAPPING_REQUIRED',
        `/recordedSenderIds/${index}`,
        'recordedSenderIds must be unique after canonical decimal normalization.',
      );
    }
    recordedUniverse.add(normalized);
    recordedSenderIds.push(normalized);
  }

  const eventSenderIds: string[] = [];
  const eventTimes: number[] = [];
  for (let index = 0; index < events.times.length; index++) {
    const time = events.times[index];
    if (typeof time !== 'number' || !Number.isFinite(time)) {
      return adapterFailure(
        'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        `/events/times/${index}`,
        'each native-millisecond event time must already be a finite JavaScript number; strings and coercible objects are rejected.',
      );
    }

    const sender = normalizeSenderId(events.senders[index]);
    if (sender === undefined) {
      return adapterFailure(
        'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        `/events/senders/${index}`,
        'each event sender must be a positive safe-integer number or an already-canonical positive decimal string.',
      );
    }
    if (!recordedUniverse.has(sender)) {
      return adapterFailure(
        'ADAPTER_MAPPING_REQUIRED',
        `/events/senders/${index}`,
        'every event sender must be a member of the declared complete recorded sender universe.',
      );
    }

    // Push without sorting, deduplicating, rounding, or changing the unit.
    eventTimes.push(time);
    eventSenderIds.push(sender);
  }

  const runId = optionValue.runId;
  if (runId !== undefined && !isCortexelIdentifier(runId)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/runId',
      'runId, when supplied, must be a Cortexel identifier.',
    );
  }
  const recorderId = optionValue.recorderId;
  if (recorderId !== undefined && !isCortexelIdentifier(recorderId)) {
    return adapterFailure(
      'ADAPTER_MAPPING_REQUIRED',
      '/recorderId',
      'recorderId, when supplied, must be a Cortexel identifier.',
    );
  }

  const normalizedRecordingGrid = positiveInfinityStop
    ? {
        originTics: originTicsResult.canonical,
        startTics: startTicsResult.canonical,
      }
    : {
        originTics: originTicsResult.canonical,
        startTics: startTicsResult.canonical,
        stopTics: finiteStopTics!.canonical,
      };
  const normalizedCaptureAuthority = {
    kind: CAPTURE_AUTHORITY_KIND,
    profile: captureAuthorityProfile,
    runtimeStatus: {
      nestVersion: ADMITTED_NEST_VERSION,
      timeBuildProfile: NEST_TIME_BUILD_PROFILE,
      statusReadMethod,
      executionScope: {
        kind: 'single_process',
        numProcesses: 1,
        rank: 0,
        localNumThreads: executionScope.localNumThreads,
      },
      resolutionMs,
      ticsPerMs: ticsPerMsResult.canonical,
      resolutionTics: resolutionTicsResult.canonical,
      captureBiologicalTimeTics: captureTicsResult.canonical,
      captureBoundary,
    },
    recordingGrid: normalizedRecordingGrid,
    bufferEpoch: {
      beganBy: bufferEpoch.beganBy,
      beganAtBiologicalTimeTics: bufferBeganTicsResult.canonical,
    },
    recordingPlan: {
      lastMutationAtBiologicalTimeTics: planMutationTicsResult.canonical,
      scope: RECORDING_PLAN_SCOPE,
      senderUniverseBinding: SENDER_UNIVERSE_BINDING,
    },
    clockEpochContinuity: CLOCK_EPOCH_CONTINUITY,
    eventCompleteness: EVENT_COMPLETENESS,
  } as const;
  const adapterInputDigestDomain = NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5;
  const adapterInputDigest = canonicalDigest({
    domain: adapterInputDigestDomain,
    exportedStatus: value,
    options: {
      recordedSenderIds,
      nestVersion,
      captureAuthority: normalizedCaptureAuthority,
      runId: runId ?? null,
      recorderId: recorderId ?? null,
    },
  });

  const window = positiveInfinityStop
    ? {
        kind: 'nest_recording_device_positive_infinity_capture_bounded',
        origin,
        start,
        captureTime: captureTime!,
        unit: 'ms',
        boundary: '(origin+start,capture]',
        recordingBackend: 'memory',
        timeEncoding: 'native_binary64_ms',
        configuredStop: {
          kind: 'nest_time_positive_infinity',
          exportedMs: NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS,
        },
        captureAuthority: {
          ...normalizedCaptureAuthority,
          adapterInputDigest,
        },
      }
    : {
        kind: 'nest_recording_device_origin_relative',
        origin,
        start,
        stop: finiteStop!,
        unit: 'ms',
        boundary: '(origin+start,origin+stop]',
        recordingBackend: 'memory',
        timeEncoding: 'native_binary64_ms',
        captureAuthority: {
          ...normalizedCaptureAuthority,
          adapterInputDigest,
        },
      };

  const request = {
    contract: {
      name: REQUEST_CONTRACT_IDENTITY.name,
      version: REQUEST_CONTRACT_IDENTITY.version,
    },
    skill: { id: 'neuro.spike_raster' },
    data: {
      eventTimes: { kind: 'time', unit: 'ms', values: eventTimes },
      eventSenderIds,
      recordedSenderIds,
      window,
      timeBase: 'absolute_clock',
      senderUniverseComplete: true,
      eventCompleteness: EVENT_COMPLETENESS,
    },
    parameters: {
      rowOrder: 'canonical_sender_id',
      markStyle: 'tick',
      outOfWindowPolicy: 'reject',
      // The current renderer cannot yet guarantee a complete density-grid
      // artifact/sidecar above the mark budget. Fail closed until that named
      // compaction path is implemented and conformance-tested.
      aboveMarkBudget: 'refuse',
    },
    source: {
      kind: 'simulation',
      system: 'NEST',
      systemVersion: nestVersion,
      ...(runId !== undefined ? { runId } : {}),
      ...(recorderId !== undefined ? { recorderId } : {}),
      sourceDigest: canonicalDigest(value),
    },
  };

  return { ok: true, request };
}
