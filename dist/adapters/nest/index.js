import {
  snapshotValue
} from "../../chunk-IPFP7NAU.js";
import {
  REQUEST_CONTRACT_IDENTITY,
  getBudgetLimits,
  makeError
} from "../../chunk-VHSQP47Z.js";
import {
  exactRationalToBinary64
} from "../../chunk-XGABDL4O.js";
import {
  canonicalDigest
} from "../../chunk-ZYBCCIMH.js";
import "../../chunk-WQLKPQUW.js";

// src/adapters/nest/profile.ts
var NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3 = Object.freeze({
  adapterRevision: 3,
  nestVersion: "3.10.0",
  upstreamSourceCommit: "acca9704da248750219a027db99fec6cd1f9052a",
  inputDigestDomain: "cortexel.nest-spike-recorder-adapter-input.v3",
  captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v1",
  statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1"
});

// src/adapters/nest/recorders.ts
var ADMITTED_NEST_VERSION = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3.nestVersion;
var NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3.inputDigestDomain;
var CAPTURE_AUTHORITY_PROFILE = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3.captureAuthorityProfile;
var CAPTURE_AUTHORITY_KIND = "caller_declaration";
var STATUS_READ_METHOD = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3.statusReadMethod;
var CAPTURE_BOUNDARY = "after_successful_simulate_or_run_return";
var RECORDING_PLAN_SCOPE = "window_backend_time_encoding_and_sender_wiring";
var SENDER_UNIVERSE_BINDING = "recorded_sender_ids_exactly_equal_full_window_connected_source_universe";
var CLOCK_EPOCH_CONTINUITY = "biological_time_monotonic_since_last_kernel_initialization";
var EVENT_COMPLETENESS = "complete_for_recorded_senders";
var CANONICAL_POSITIVE_DECIMAL = /^[1-9][0-9]*$/u;
var CANONICAL_NON_NEGATIVE_DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
var CORTEXEL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]*$/u;
var MAX_IDENTIFIER_LENGTH = 128;
var MAX_TIC_DECIMAL_LENGTH = 32;
function fail(errors) {
  return { ok: false, errors };
}
function adapterFailure(code, instancePath, message) {
  return fail([makeError({ code, stage: "adapter", instancePath, message })]);
}
function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function firstUnknownKey(value, allowed) {
  return Object.keys(value).filter((key) => !allowed.has(key)).sort()[0];
}
function exactObjectKeysFailure(value, allowed, instancePath, label) {
  const unknown = firstUnknownKey(value, allowed);
  if (unknown === void 0) return void 0;
  return adapterFailure(
    "ADAPTER_MAPPING_REQUIRED",
    `${instancePath}/${unknown}`,
    `${label} is closed for adapter revision 3; unknown member ${JSON.stringify(unknown)} is not consumed or digest-normalized.`
  );
}
function snapshotFailure(errors, inputName) {
  const accessorOrHostileReflection = errors.some(
    (error) => error.code === "SNAPSHOT_ACCESSOR_PROPERTY" || error.code === "SNAPSHOT_HOSTILE_REFLECTION"
  );
  if (accessorOrHostileReflection) {
    const firstHostile = errors.find(
      (error) => error.code === "SNAPSHOT_ACCESSOR_PROPERTY" || error.code === "SNAPSHOT_HOSTILE_REFLECTION"
    );
    return adapterFailure(
      "ADAPTER_ACCESSOR_INPUT_REJECTED",
      firstHostile?.instancePath ?? "",
      `the NEST ${inputName} could not be safely snapshotted because it carries an accessor or hostile reflection trap. Pass detached plain data.`
    );
  }
  return fail(errors);
}
function normalizeSenderId(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : void 0;
  }
  if (typeof value === "string" && value.length <= MAX_IDENTIFIER_LENGTH && CANONICAL_POSITIVE_DECIMAL.test(value)) {
    return value;
  }
  return void 0;
}
function isCortexelIdentifier(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_IDENTIFIER_LENGTH && CORTEXEL_IDENTIFIER.test(value);
}
function parseCanonicalTics(value, instancePath, label, positive) {
  const pattern = positive ? CANONICAL_POSITIVE_DECIMAL : CANONICAL_NON_NEGATIVE_DECIMAL;
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_TIC_DECIMAL_LENGTH || !pattern.test(value)) {
    return {
      ok: false,
      result: adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        instancePath,
        `${label} must be a canonical ${positive ? "positive" : "non-negative"} base-10 integer string of at most ${MAX_TIC_DECIMAL_LENGTH} digits.`
      )
    };
  }
  return { ok: true, canonical: value, value: BigInt(value) };
}
function projectedMillisecondsFailure(tics, ticsPerMs, milliseconds, instancePath, label) {
  try {
    const projected = exactRationalToBinary64(tics, ticsPerMs);
    if (!Object.is(projected, milliseconds)) {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        instancePath,
        `${label} must equal the correctly rounded binary64 projection of its declared integer-tic preimage. Received ${milliseconds}; the tic authority projects to ${projected}.`
      );
    }
  } catch {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      instancePath,
      `${label} cannot be represented as a finite binary64 millisecond projection of its declared integer-tic preimage.`
    );
  }
  return void 0;
}
function nestSpikeRecorderToRaster(exported, options) {
  const limits = getBudgetLimits("standard");
  const exportedSnapshot = snapshotValue(exported, limits);
  const optionsSnapshot = snapshotValue(options, limits);
  if (!exportedSnapshot.ok) return snapshotFailure(exportedSnapshot.errors, "export");
  if (!optionsSnapshot.ok) return snapshotFailure(optionsSnapshot.errors, "options");
  const value = exportedSnapshot.value;
  const optionValue = optionsSnapshot.value;
  if (!isPlainRecord(value)) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "",
      "expected a plain NEST spike-recorder status object."
    );
  }
  if (!isPlainRecord(optionValue)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "",
      "NEST adapter options must be a plain object containing a version and the complete recorded sender universe."
    );
  }
  const optionKeysFailure = exactObjectKeysFailure(
    optionValue,
    /* @__PURE__ */ new Set(["recordedSenderIds", "nestVersion", "captureAuthority", "runId", "recorderId"]),
    "",
    "NEST adapter options"
  );
  if (optionKeysFailure) return optionKeysFailure;
  if (value.record_to !== "memory") {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      "/record_to",
      'revision 3 accepts only an explicit `record_to: "memory"` status. File, screen, MPI, and SIONlib serializations are not admitted as lossless clock boundaries.'
    );
  }
  if (value.time_in_steps !== false) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      "/time_in_steps",
      "revision 3 requires the status field `time_in_steps` to be explicitly false. Missing or step/offset time encodings are not reconstructed as milliseconds."
    );
  }
  if (!isPlainRecord(value.events)) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/events",
      "a NEST spike-recorder export must have an `events` object with `senders` and `times` arrays."
    );
  }
  const events = value.events;
  const offsetKey = Object.prototype.hasOwnProperty.call(events, "offsets") ? "offsets" : Object.prototype.hasOwnProperty.call(events, "offset") ? "offset" : void 0;
  if (offsetKey !== void 0) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      `/events/${offsetKey}`,
      "offset-bearing events contradict the revision-3-admitted native-millisecond mode. Preserve the raw step/offset representation for a future contract instead of collapsing it here."
    );
  }
  if (!Array.isArray(events.senders) || !Array.isArray(events.times)) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/events",
      "`events.senders` and `events.times` must both be dense plain arrays."
    );
  }
  const nEvents = value.n_events;
  if (typeof nEvents !== "number" || !Number.isSafeInteger(nEvents) || nEvents < 0) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/n_events",
      "`n_events` is required and must be a non-negative safe integer copied from the NEST recording-device status. Cortexel does not infer completeness from the event arrays."
    );
  }
  if (events.senders.length !== nEvents || events.times.length !== nEvents) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/n_events",
      `the authoritative NEST n_events value (${nEvents}) must equal both parallel event-array lengths; received senders=${events.senders.length} and times=${events.times.length}. Cortexel cannot author a completeness claim from inconsistent status data.`
    );
  }
  const origin = value.origin;
  const start = value.start;
  const stop = value.stop;
  if (typeof origin !== "number" || !Number.isFinite(origin) || origin < 0) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/origin",
      "`origin` must be a finite non-negative number in NEST milliseconds."
    );
  }
  if (typeof start !== "number" || !Number.isFinite(start) || start < 0) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/start",
      "`start` must be a finite non-negative number relative to the NEST recording-device origin."
    );
  }
  if (typeof stop !== "number" || !Number.isFinite(stop) || stop < 0) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/stop",
      "`stop` must be a finite non-negative number relative to the NEST recording-device origin."
    );
  }
  if (!(start < stop)) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/stop",
      "`stop` must be strictly greater than `start` for the NEST origin-relative recording interval."
    );
  }
  const nestVersion = optionValue.nestVersion;
  if (typeof nestVersion !== "string" || nestVersion.length > 120 || nestVersion !== ADMITTED_NEST_VERSION) {
    return adapterFailure(
      "ADAPTER_UNSUPPORTED_VERSION",
      "/nestVersion",
      "nestVersion is required and must equal the exact pinned adapter-revision-3 profile 3.10.0. Other NEST releases and patches remain unsupported until separately executed and evidenced."
    );
  }
  const captureAuthority = optionValue.captureAuthority;
  if (!isPlainRecord(captureAuthority)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority",
      "captureAuthority is required. A detached final status alone cannot prove that the NEST memory buffer was not reset, that recorder configuration and wiring stayed fixed, that the successful-return capture endpoint was reached, that the kernel clock stayed monotonic, that the projection was lossless, or that MPI ranks were merged."
    );
  }
  const captureKeysFailure = exactObjectKeysFailure(
    captureAuthority,
    /* @__PURE__ */ new Set([
      "kind",
      "profile",
      "runtimeStatus",
      "recordingGrid",
      "bufferEpoch",
      "recordingPlan",
      "clockEpochContinuity",
      "eventCompleteness"
    ]),
    "/captureAuthority",
    "captureAuthority"
  );
  if (captureKeysFailure) return captureKeysFailure;
  if (captureAuthority.kind !== CAPTURE_AUTHORITY_KIND) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/kind",
      `captureAuthority.kind must equal ${JSON.stringify(CAPTURE_AUTHORITY_KIND)}. This detached adapter accepts a caller declaration, not an authenticated live-capture receipt.`
    );
  }
  if (captureAuthority.profile !== CAPTURE_AUTHORITY_PROFILE) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/profile",
      `captureAuthority.profile must equal ${JSON.stringify(CAPTURE_AUTHORITY_PROFILE)}.`
    );
  }
  const runtimeStatus = captureAuthority.runtimeStatus;
  if (!isPlainRecord(runtimeStatus)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus",
      "captureAuthority.runtimeStatus must be a closed plain object."
    );
  }
  const runtimeKeysFailure = exactObjectKeysFailure(
    runtimeStatus,
    /* @__PURE__ */ new Set([
      "nestVersion",
      "statusReadMethod",
      "executionScope",
      "resolutionMs",
      "ticsPerMs",
      "resolutionTics",
      "captureBiologicalTimeTics",
      "captureBoundary"
    ]),
    "/captureAuthority/runtimeStatus",
    "captureAuthority.runtimeStatus"
  );
  if (runtimeKeysFailure) return runtimeKeysFailure;
  if (runtimeStatus.nestVersion !== ADMITTED_NEST_VERSION) {
    return adapterFailure(
      "ADAPTER_UNSUPPORTED_VERSION",
      "/captureAuthority/runtimeStatus/nestVersion",
      "captureAuthority.runtimeStatus.nestVersion must equal the pinned 3.10.0 profile."
    );
  }
  if (runtimeStatus.nestVersion !== nestVersion) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/nestVersion",
      "the capture runtime version must exactly equal the top-level adapter version declaration."
    );
  }
  if (runtimeStatus.statusReadMethod !== STATUS_READ_METHOD) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/statusReadMethod",
      `statusReadMethod must equal ${JSON.stringify(STATUS_READ_METHOD)}; raw NumPy values, bulk collections, lossy projections, and reconstructed status objects have different authority boundaries.`
    );
  }
  if (runtimeStatus.captureBoundary !== CAPTURE_BOUNDARY) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/captureBoundary",
      `captureBoundary must equal ${JSON.stringify(CAPTURE_BOUNDARY)}.`
    );
  }
  const resolutionMs = runtimeStatus.resolutionMs;
  if (typeof resolutionMs !== "number" || !Number.isFinite(resolutionMs) || !(resolutionMs > 0)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/resolutionMs",
      "resolutionMs must be a finite positive binary64 value copied from the pinned NEST runtime status."
    );
  }
  const ticsPerMsResult = parseCanonicalTics(
    runtimeStatus.ticsPerMs,
    "/captureAuthority/runtimeStatus/ticsPerMs",
    "ticsPerMs",
    true
  );
  if (!ticsPerMsResult.ok) return ticsPerMsResult.result;
  const resolutionTicsResult = parseCanonicalTics(
    runtimeStatus.resolutionTics,
    "/captureAuthority/runtimeStatus/resolutionTics",
    "resolutionTics",
    true
  );
  if (!resolutionTicsResult.ok) return resolutionTicsResult.result;
  const captureTicsResult = parseCanonicalTics(
    runtimeStatus.captureBiologicalTimeTics,
    "/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
    "captureBiologicalTimeTics",
    false
  );
  if (!captureTicsResult.ok) return captureTicsResult.result;
  const executionScope = runtimeStatus.executionScope;
  if (!isPlainRecord(executionScope)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/executionScope",
      "executionScope must be a closed single-process scope object."
    );
  }
  const executionScopeKeysFailure = exactObjectKeysFailure(
    executionScope,
    /* @__PURE__ */ new Set(["kind", "numProcesses", "rank", "localNumThreads"]),
    "/captureAuthority/runtimeStatus/executionScope",
    "captureAuthority.runtimeStatus.executionScope"
  );
  if (executionScopeKeysFailure) return executionScopeKeysFailure;
  if (executionScope.kind !== "single_process" || executionScope.numProcesses !== 1 || executionScope.rank !== 0 || typeof executionScope.localNumThreads !== "number" || !Number.isSafeInteger(executionScope.localNumThreads) || executionScope.localNumThreads < 1 || executionScope.localNumThreads > 1e6) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/executionScope",
      "revision 3 admits only one exact single-process scope: kind=single_process, numProcesses=1, rank=0, and localNumThreads a safe integer from 1 through 1000000. Rank-local and caller-premerged MPI status is not a complete recorder authority."
    );
  }
  const recordingGrid = captureAuthority.recordingGrid;
  if (!isPlainRecord(recordingGrid)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingGrid",
      "recordingGrid must be a closed object containing the exact integer-tic preimages of origin, start, and stop."
    );
  }
  const recordingGridKeysFailure = exactObjectKeysFailure(
    recordingGrid,
    /* @__PURE__ */ new Set(["originTics", "startTics", "stopTics"]),
    "/captureAuthority/recordingGrid",
    "captureAuthority.recordingGrid"
  );
  if (recordingGridKeysFailure) return recordingGridKeysFailure;
  const originTicsResult = parseCanonicalTics(
    recordingGrid.originTics,
    "/captureAuthority/recordingGrid/originTics",
    "originTics",
    false
  );
  if (!originTicsResult.ok) return originTicsResult.result;
  const startTicsResult = parseCanonicalTics(
    recordingGrid.startTics,
    "/captureAuthority/recordingGrid/startTics",
    "startTics",
    false
  );
  if (!startTicsResult.ok) return startTicsResult.result;
  const stopTicsResult = parseCanonicalTics(
    recordingGrid.stopTics,
    "/captureAuthority/recordingGrid/stopTics",
    "stopTics",
    false
  );
  if (!stopTicsResult.ok) return stopTicsResult.result;
  const bufferEpoch = captureAuthority.bufferEpoch;
  if (!isPlainRecord(bufferEpoch)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/bufferEpoch",
      "bufferEpoch must identify the most recent recorder creation or n_events=0 memory clear."
    );
  }
  const bufferKeysFailure = exactObjectKeysFailure(
    bufferEpoch,
    /* @__PURE__ */ new Set(["beganBy", "beganAtBiologicalTimeTics"]),
    "/captureAuthority/bufferEpoch",
    "captureAuthority.bufferEpoch"
  );
  if (bufferKeysFailure) return bufferKeysFailure;
  if (bufferEpoch.beganBy !== "recorder_creation" && bufferEpoch.beganBy !== "n_events_zero") {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/bufferEpoch/beganBy",
      "bufferEpoch.beganBy must be recorder_creation or n_events_zero."
    );
  }
  const bufferBeganTicsResult = parseCanonicalTics(
    bufferEpoch.beganAtBiologicalTimeTics,
    "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics",
    "bufferEpoch.beganAtBiologicalTimeTics",
    false
  );
  if (!bufferBeganTicsResult.ok) return bufferBeganTicsResult.result;
  const recordingPlan = captureAuthority.recordingPlan;
  if (!isPlainRecord(recordingPlan)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingPlan",
      "recordingPlan must identify the most recent recorder-window, backend, clock, or sender-wiring mutation."
    );
  }
  const planKeysFailure = exactObjectKeysFailure(
    recordingPlan,
    /* @__PURE__ */ new Set([
      "lastMutationAtBiologicalTimeTics",
      "scope",
      "senderUniverseBinding"
    ]),
    "/captureAuthority/recordingPlan",
    "captureAuthority.recordingPlan"
  );
  if (planKeysFailure) return planKeysFailure;
  if (recordingPlan.scope !== RECORDING_PLAN_SCOPE) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingPlan/scope",
      `recordingPlan.scope must equal ${JSON.stringify(RECORDING_PLAN_SCOPE)}.`
    );
  }
  if (recordingPlan.senderUniverseBinding !== SENDER_UNIVERSE_BINDING) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingPlan/senderUniverseBinding",
      `senderUniverseBinding must equal ${JSON.stringify(SENDER_UNIVERSE_BINDING)}.`
    );
  }
  const planMutationTicsResult = parseCanonicalTics(
    recordingPlan.lastMutationAtBiologicalTimeTics,
    "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics",
    "recordingPlan.lastMutationAtBiologicalTimeTics",
    false
  );
  if (!planMutationTicsResult.ok) return planMutationTicsResult.result;
  if (captureAuthority.clockEpochContinuity !== CLOCK_EPOCH_CONTINUITY) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/clockEpochContinuity",
      `captureAuthority.clockEpochContinuity must equal ${JSON.stringify(CLOCK_EPOCH_CONTINUITY)}. NEST can reset biological_time to zero without destroying the recorder or clearing retained memory, and its own 3.10.0 source marks that operation incompletely supported.`
    );
  }
  if (captureAuthority.eventCompleteness !== EVENT_COMPLETENESS) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/eventCompleteness",
      `captureAuthority.eventCompleteness must equal ${JSON.stringify(EVENT_COMPLETENESS)}.`
    );
  }
  const ticsPerMs = ticsPerMsResult.value;
  const resolutionTics = resolutionTicsResult.value;
  const captureBiologicalTimeTics = captureTicsResult.value;
  const originTics = originTicsResult.value;
  const startTics = startTicsResult.value;
  const stopTics = stopTicsResult.value;
  const beganAtBiologicalTimeTics = bufferBeganTicsResult.value;
  const lastMutationAtBiologicalTimeTics = planMutationTicsResult.value;
  for (const [tics, milliseconds, instancePath, label] of [
    [
      resolutionTics,
      resolutionMs,
      "/captureAuthority/runtimeStatus/resolutionMs",
      "resolutionMs"
    ],
    [
      originTics,
      origin,
      "/captureAuthority/recordingGrid/originTics",
      "origin"
    ],
    [
      startTics,
      start,
      "/captureAuthority/recordingGrid/startTics",
      "start"
    ],
    [
      stopTics,
      stop,
      "/captureAuthority/recordingGrid/stopTics",
      "stop"
    ]
  ]) {
    const projectionFailure = projectedMillisecondsFailure(
      tics,
      ticsPerMs,
      milliseconds,
      instancePath,
      label
    );
    if (projectionFailure) return projectionFailure;
  }
  for (const [tics, instancePath, label] of [
    [
      originTics,
      "/captureAuthority/recordingGrid/originTics",
      "originTics"
    ],
    [
      startTics,
      "/captureAuthority/recordingGrid/startTics",
      "startTics"
    ],
    [
      stopTics,
      "/captureAuthority/recordingGrid/stopTics",
      "stopTics"
    ],
    [
      captureBiologicalTimeTics,
      "/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
      "captureBiologicalTimeTics"
    ],
    [
      beganAtBiologicalTimeTics,
      "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics",
      "beganAtBiologicalTimeTics"
    ],
    [
      lastMutationAtBiologicalTimeTics,
      "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics",
      "lastMutationAtBiologicalTimeTics"
    ]
  ]) {
    if (tics % resolutionTics !== 0n) {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        instancePath,
        `${label} must lie exactly on the declared NEST runtime resolution grid.`
      );
    }
  }
  const absoluteStartTics = originTics + startTics;
  const absoluteStopTics = originTics + stopTics;
  if (captureBiologicalTimeTics < absoluteStopTics) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
      "captureBiologicalTimeTics must be at least originTics + stopTics, and the status must be read only after the Simulate or Run call that reached that endpoint returned successfully."
    );
  }
  if (beganAtBiologicalTimeTics > absoluteStartTics) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics",
      "the most recent recorder creation or n_events=0 clear must be no later than originTics + startTics."
    );
  }
  if (lastMutationAtBiologicalTimeTics > absoluteStartTics) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics",
      "the most recent recorder-window, backend, clock, or sender-wiring mutation must be no later than originTics + startTics."
    );
  }
  const recordedValues = optionValue.recordedSenderIds;
  if (!Array.isArray(recordedValues) || recordedValues.length === 0) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/recordedSenderIds",
      "recordedSenderIds is required and must be a non-empty array containing the complete recorded universe, including silent senders."
    );
  }
  const recordedSenderIds = [];
  const recordedUniverse = /* @__PURE__ */ new Set();
  for (let index = 0; index < recordedValues.length; index++) {
    const normalized = normalizeSenderId(recordedValues[index]);
    if (normalized === void 0) {
      return adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        `/recordedSenderIds/${index}`,
        "a recorded sender id must be a positive safe-integer number or an already-canonical positive decimal string."
      );
    }
    if (recordedUniverse.has(normalized)) {
      return adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        `/recordedSenderIds/${index}`,
        "recordedSenderIds must be unique after canonical decimal normalization."
      );
    }
    recordedUniverse.add(normalized);
    recordedSenderIds.push(normalized);
  }
  const eventSenderIds = [];
  const eventTimes = [];
  for (let index = 0; index < events.times.length; index++) {
    const time = events.times[index];
    if (typeof time !== "number" || !Number.isFinite(time)) {
      return adapterFailure(
        "ADAPTER_NEST_UNSUPPORTED_SHAPE",
        `/events/times/${index}`,
        "each native-millisecond event time must already be a finite JavaScript number; strings and coercible objects are rejected."
      );
    }
    const sender = normalizeSenderId(events.senders[index]);
    if (sender === void 0) {
      return adapterFailure(
        "ADAPTER_NEST_UNSUPPORTED_SHAPE",
        `/events/senders/${index}`,
        "each event sender must be a positive safe-integer number or an already-canonical positive decimal string."
      );
    }
    if (!recordedUniverse.has(sender)) {
      return adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        `/events/senders/${index}`,
        "every event sender must be a member of the declared complete recorded sender universe."
      );
    }
    eventTimes.push(time);
    eventSenderIds.push(sender);
  }
  const runId = optionValue.runId;
  if (runId !== void 0 && !isCortexelIdentifier(runId)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/runId",
      "runId, when supplied, must be a Cortexel identifier."
    );
  }
  const recorderId = optionValue.recorderId;
  if (recorderId !== void 0 && !isCortexelIdentifier(recorderId)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/recorderId",
      "recorderId, when supplied, must be a Cortexel identifier."
    );
  }
  const normalizedCaptureAuthority = {
    kind: CAPTURE_AUTHORITY_KIND,
    profile: CAPTURE_AUTHORITY_PROFILE,
    runtimeStatus: {
      nestVersion: ADMITTED_NEST_VERSION,
      statusReadMethod: STATUS_READ_METHOD,
      executionScope: {
        kind: "single_process",
        numProcesses: 1,
        rank: 0,
        localNumThreads: executionScope.localNumThreads
      },
      resolutionMs,
      ticsPerMs: ticsPerMsResult.canonical,
      resolutionTics: resolutionTicsResult.canonical,
      captureBiologicalTimeTics: captureTicsResult.canonical,
      captureBoundary: CAPTURE_BOUNDARY
    },
    recordingGrid: {
      originTics: originTicsResult.canonical,
      startTics: startTicsResult.canonical,
      stopTics: stopTicsResult.canonical
    },
    bufferEpoch: {
      beganBy: bufferEpoch.beganBy,
      beganAtBiologicalTimeTics: bufferBeganTicsResult.canonical
    },
    recordingPlan: {
      lastMutationAtBiologicalTimeTics: planMutationTicsResult.canonical,
      scope: RECORDING_PLAN_SCOPE,
      senderUniverseBinding: SENDER_UNIVERSE_BINDING
    },
    clockEpochContinuity: CLOCK_EPOCH_CONTINUITY,
    eventCompleteness: EVENT_COMPLETENESS
  };
  const adapterInputDigest = canonicalDigest({
    domain: NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN,
    exportedStatus: value,
    options: {
      recordedSenderIds,
      nestVersion,
      captureAuthority: normalizedCaptureAuthority,
      runId: runId ?? null,
      recorderId: recorderId ?? null
    }
  });
  const request = {
    contract: {
      name: REQUEST_CONTRACT_IDENTITY.name,
      version: REQUEST_CONTRACT_IDENTITY.version
    },
    skill: { id: "neuro.spike_raster" },
    data: {
      eventTimes: { kind: "time", unit: "ms", values: eventTimes },
      eventSenderIds,
      recordedSenderIds,
      window: {
        kind: "nest_recording_device_origin_relative",
        origin,
        start,
        stop,
        unit: "ms",
        boundary: "(origin+start,origin+stop]",
        recordingBackend: "memory",
        timeEncoding: "native_binary64_ms",
        captureAuthority: {
          ...normalizedCaptureAuthority,
          adapterInputDigest
        }
      },
      timeBase: "absolute_clock",
      senderUniverseComplete: true,
      eventCompleteness: EVENT_COMPLETENESS
    },
    parameters: {
      rowOrder: "canonical_sender_id",
      markStyle: "tick",
      outOfWindowPolicy: "reject",
      // The current renderer cannot yet guarantee a complete density-grid
      // artifact/sidecar above the mark budget. Fail closed until that named
      // compaction path is implemented and conformance-tested.
      aboveMarkBudget: "refuse"
    },
    source: {
      kind: "simulation",
      system: "NEST",
      systemVersion: nestVersion,
      ...runId !== void 0 ? { runId } : {},
      ...recorderId !== void 0 ? { recorderId } : {},
      sourceDigest: canonicalDigest(value)
    }
  };
  return { ok: true, request };
}
export {
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN,
  nestSpikeRecorderToRaster
};
//# sourceMappingURL=index.js.map