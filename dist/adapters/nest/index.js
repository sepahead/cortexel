import {
  snapshotValue
} from "../../chunk-WOZECEVX.js";
import {
  REQUEST_CONTRACT_IDENTITY,
  canonicalDigest,
  getBudgetLimits,
  makeError
} from "../../chunk-22OHKNZ5.js";

// src/adapters/nest/recorders.ts
var ADMITTED_NEST_VERSION = /^3\.(?:9|10)(?:\.\d+)?$/u;
var CANONICAL_POSITIVE_DECIMAL = /^[1-9][0-9]*$/u;
var CORTEXEL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]*$/u;
var MAX_IDENTIFIER_LENGTH = 128;
function fail(errors) {
  return { ok: false, errors };
}
function adapterFailure(code, instancePath, message) {
  return fail([makeError({ code, stage: "adapter", instancePath, message })]);
}
function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  if (value.record_to !== "memory") {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      "/record_to",
      'revision 2 accepts only an explicit `record_to: "memory"` status. File, screen, MPI, and SIONlib serializations are not admitted as lossless clock boundaries.'
    );
  }
  if (value.time_in_steps !== false) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      "/time_in_steps",
      "revision 2 requires the status field `time_in_steps` to be explicitly false. Missing or step/offset time encodings are not reconstructed as milliseconds."
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
      "offset-bearing events contradict the revision-2-admitted native-millisecond mode. Preserve the raw step/offset representation for a future contract instead of collapsing it here."
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
  if (typeof nestVersion !== "string" || nestVersion.length > 120 || !ADMITTED_NEST_VERSION.test(nestVersion)) {
    return adapterFailure(
      "ADAPTER_UNSUPPORTED_VERSION",
      "/nestVersion",
      "nestVersion is required and must name a 3.9, 3.9.patch, 3.10, or 3.10.patch version admitted by adapter revision 2. This is a declared-source profile, not upstream-execution evidence."
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
        timeEncoding: "native_binary64_ms"
      },
      timeBase: "absolute_clock",
      senderUniverseComplete: true,
      eventCompleteness: "complete_for_recorded_senders"
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
  nestSpikeRecorderToRaster
};
//# sourceMappingURL=index.js.map