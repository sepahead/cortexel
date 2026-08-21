const require_canonicalize = require('./canonicalize-CM-RPRQS.cjs');
const require_limits = require('./limits-zgcdlCes.cjs');
const require_errors = require('./errors-DaUwoa4p.cjs');
const require_safe_snapshot = require('./safe-snapshot-Bb70fzip.cjs');
const require_contract_identity = require('./contract-identity-Cna7a4hn.cjs');
const require_source_example = require('./source-example-Cy4zoYav.cjs');
const require_nest_time = require('./nest-time-CaEztfRm.cjs');

//#region src/adapters/nest/recorders.ts
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
const ADMITTED_NEST_VERSION = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.nestVersion;
const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3 = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3.inputDigestDomain;
const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5 = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.inputDigestDomain;
/** Current source-faithful revision-5 digest domain. */
const NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN = NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5;
/** Exact PyNEST 3.10.0 millisecond serialization of positive-infinity Time. */
const NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.positiveInfinityExportedMs;
const NEST_TIME_BUILD_PROFILE = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.timeBuildProfile;
const CAPTURE_AUTHORITY_PROFILE_V3 = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.finiteStop.captureAuthorityProfile;
const CAPTURE_AUTHORITY_PROFILE_V4 = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.positiveInfinityCaptureBounded.captureAuthorityProfile;
const CAPTURE_AUTHORITY_KIND = "caller_declaration";
const STATUS_READ_METHOD_V1 = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.finiteStop.statusReadMethod;
const STATUS_READ_METHOD_V2 = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.positiveInfinityCaptureBounded.statusReadMethod;
const CAPTURE_BOUNDARY_V1 = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.finiteStop.captureBoundary;
const CAPTURE_BOUNDARY_V2 = require_source_example.NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.positiveInfinityCaptureBounded.captureBoundary;
const RECORDING_PLAN_SCOPE = "window_backend_time_encoding_and_sender_wiring";
const SENDER_UNIVERSE_BINDING = "recorded_sender_ids_exactly_equal_full_window_connected_source_universe";
const CLOCK_EPOCH_CONTINUITY = "biological_time_monotonic_since_last_kernel_initialization";
const EVENT_COMPLETENESS = "complete_for_recorded_senders";
const CANONICAL_POSITIVE_DECIMAL = /^[1-9][0-9]*$/u;
const CANONICAL_NON_NEGATIVE_DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
const CORTEXEL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]*$/u;
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_TIC_DECIMAL_LENGTH = 16;
const MAX_SAFE_TICS = BigInt(Number.MAX_SAFE_INTEGER);
function fail(errors) {
	return {
		ok: false,
		errors
	};
}
function adapterFailure(code, instancePath, message) {
	return fail([require_errors.makeError({
		code,
		stage: "adapter",
		instancePath,
		message
	})]);
}
function isPlainRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function firstUnknownKey(value, allowed) {
	return Object.keys(value).filter((key) => !allowed.has(key)).sort()[0];
}
function exactObjectKeysFailure(value, allowed, instancePath, label, adapterRevision = 5) {
	const unknown = firstUnknownKey(value, allowed);
	if (unknown === void 0) return void 0;
	return adapterFailure("ADAPTER_MAPPING_REQUIRED", `${instancePath}/${unknown}`, `${label} is closed for adapter revision ${adapterRevision}; unknown member ${JSON.stringify(unknown)} is not consumed or digest-normalized.`);
}
function snapshotFailure(errors, inputName) {
	if (errors.some((error) => error.code === "SNAPSHOT_ACCESSOR_PROPERTY" || error.code === "SNAPSHOT_HOSTILE_REFLECTION")) return adapterFailure("ADAPTER_ACCESSOR_INPUT_REJECTED", errors.find((error) => error.code === "SNAPSHOT_ACCESSOR_PROPERTY" || error.code === "SNAPSHOT_HOSTILE_REFLECTION")?.instancePath ?? "", `the NEST ${inputName} could not be safely snapshotted because it carries an accessor or hostile reflection trap. Pass detached plain data.`);
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
function normalizeSenderId(value) {
	if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? String(value) : void 0;
	if (typeof value === "string" && value.length <= MAX_IDENTIFIER_LENGTH && CANONICAL_POSITIVE_DECIMAL.test(value)) return value;
}
function isCortexelIdentifier(value) {
	return typeof value === "string" && value.length > 0 && value.length <= MAX_IDENTIFIER_LENGTH && CORTEXEL_IDENTIFIER.test(value);
}
function parseCanonicalTics(value, instancePath, label, positive) {
	const pattern = positive ? CANONICAL_POSITIVE_DECIMAL : CANONICAL_NON_NEGATIVE_DECIMAL;
	if (typeof value !== "string" || value.length === 0 || value.length > MAX_TIC_DECIMAL_LENGTH || !pattern.test(value)) return {
		ok: false,
		result: adapterFailure("ADAPTER_MAPPING_REQUIRED", instancePath, `${label} must be a canonical ${positive ? "positive" : "non-negative"} base-10 integer string of at most ${MAX_TIC_DECIMAL_LENGTH} digits.`)
	};
	return {
		ok: true,
		canonical: value,
		value: BigInt(value)
	};
}
function projectedMillisecondsFailure(tics, ticsPerMs, milliseconds, instancePath, label) {
	const projected = require_nest_time.projectNestTicsToMillisecondsV310(tics, ticsPerMs);
	if (!projected.ok) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", instancePath, `${label} is outside the pinned source-faithful NEST 3.10.0 time profile: ${projected.message}`);
	if (!Object.is(projected.milliseconds, milliseconds)) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", instancePath, `${label} must equal pinned NEST 3.10.0 Time::get_ms binary64 evaluation of its declared integer-tic preimage. Received ${milliseconds}; the source-faithful tic authority projects to ${projected.milliseconds}.`);
}
/**
* Convert an admitted revision-5 finite or positive-infinity NEST memory
* spike-recorder export into a `neuro.spike_raster` request.
*/
function nestSpikeRecorderToRaster(exported, options) {
	const limits = require_limits.getBudgetLimits("standard");
	const exportedSnapshot = require_safe_snapshot.snapshotValue(exported, limits);
	const optionsSnapshot = require_safe_snapshot.snapshotValue(options, limits);
	if (!exportedSnapshot.ok) return snapshotFailure(exportedSnapshot.errors, "export");
	if (!optionsSnapshot.ok) return snapshotFailure(optionsSnapshot.errors, "options");
	const value = exportedSnapshot.value;
	const optionValue = optionsSnapshot.value;
	if (!isPlainRecord(value)) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "", "expected a plain NEST spike-recorder status object.");
	if (!isPlainRecord(optionValue)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "", "NEST adapter options must be a plain object containing a version and the complete recorded sender universe.");
	if (Object.prototype.hasOwnProperty.call(optionValue, "cortexelSyntheticExampleGuard")) {
		const exactGuard = require_source_example.isSourceAdapterExampleGuard(optionValue[require_source_example.SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER]);
		return adapterFailure("ADAPTER_MAPPING_REQUIRED", `/${require_source_example.SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER}`, exactGuard ? "Cortexel's shipped source example is a synthetic, template-only shape, not a NEST capture. Replace every fixture value with caller-owned exported status and capture authority, then explicitly remove this guard before invoking the adapter. The adapter never removes it or authors simulation provenance from the unchanged fixture." : `NEST adapter options contain the reserved ${JSON.stringify(require_source_example.SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER)} member with a malformed value. Do not repair or remove an unrecognized guard at this authority boundary; start from caller-owned detached NEST data.`);
	}
	const adapterRevision = 5;
	const optionKeysFailure = exactObjectKeysFailure(optionValue, /* @__PURE__ */ new Set([
		"recordedSenderIds",
		"nestVersion",
		"captureAuthority",
		"runId",
		"recorderId"
	]), "", "NEST adapter options", adapterRevision);
	if (optionKeysFailure) return optionKeysFailure;
	const exportKeysFailure = exactObjectKeysFailure(value, /* @__PURE__ */ new Set([
		"record_to",
		"time_in_steps",
		"origin",
		"start",
		"stop",
		"n_events",
		"events"
	]), "", "NEST exportedStatus", adapterRevision);
	if (exportKeysFailure) return exportKeysFailure;
	if (value.record_to !== "memory") return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", "/record_to", `revision ${adapterRevision} accepts only an explicit \`record_to: "memory"\` status. File, screen, MPI, and SIONlib serializations are not admitted as lossless clock boundaries.`);
	if (value.time_in_steps !== false) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", "/time_in_steps", `revision ${adapterRevision} requires the status field \`time_in_steps\` to be explicitly false. Missing or step/offset time encodings are not reconstructed as milliseconds.`);
	if (!isPlainRecord(value.events)) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "/events", "a NEST spike-recorder export must have an `events` object with `senders` and `times` arrays.");
	const events = value.events;
	const offsetKey = Object.prototype.hasOwnProperty.call(events, "offsets") ? "offsets" : Object.prototype.hasOwnProperty.call(events, "offset") ? "offset" : void 0;
	if (offsetKey !== void 0) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", `/events/${offsetKey}`, `offset-bearing events contradict the revision-${adapterRevision}-admitted native-millisecond mode. Preserve the raw step/offset representation for a future contract instead of collapsing it here.`);
	const eventKeysFailure = exactObjectKeysFailure(events, /* @__PURE__ */ new Set(["senders", "times"]), "/events", "NEST exportedStatus.events", adapterRevision);
	if (eventKeysFailure) return eventKeysFailure;
	if (!Array.isArray(events.senders) || !Array.isArray(events.times)) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "/events", "`events.senders` and `events.times` must both be dense plain arrays.");
	const nEvents = value.n_events;
	if (typeof nEvents !== "number" || !Number.isSafeInteger(nEvents) || nEvents < 0) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "/n_events", "`n_events` is required and must be a non-negative safe integer copied from the NEST recording-device status. Cortexel does not infer completeness from the event arrays.");
	if (events.senders.length !== nEvents || events.times.length !== nEvents) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "/n_events", `the authoritative NEST n_events value (${nEvents}) must equal both parallel event-array lengths; received senders=${events.senders.length} and times=${events.times.length}. Cortexel cannot author a completeness claim from inconsistent status data.`);
	const origin = value.origin;
	const start = value.start;
	const stop = value.stop;
	if (typeof origin !== "number" || !Number.isFinite(origin) || origin < 0) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "/origin", "`origin` must be a finite non-negative number in NEST milliseconds.");
	if (typeof start !== "number" || !Number.isFinite(start) || start < 0) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "/start", "`start` must be a finite non-negative number relative to the NEST recording-device origin.");
	let positiveInfinityStop = false;
	let finiteStop;
	if (isPlainRecord(stop)) {
		const stopKeysFailure = exactObjectKeysFailure(stop, /* @__PURE__ */ new Set(["kind"]), "/stop", "positive-infinity stop sentinel", 5);
		if (stopKeysFailure) return stopKeysFailure;
		if (stop.kind !== "nest_time_positive_infinity") return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", "/stop/kind", "adapter revision 5 requires the exact projection token `{\"kind\":\"nest_time_positive_infinity\"}` for NEST 3.10.0 positive-infinity Time. Arbitrary tags are not stop authority.");
		positiveInfinityStop = true;
	} else {
		if (stop === Number.MAX_VALUE) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", "/stop", "raw DBL_MAX is NEST 3.10.0's serialized positive-infinity Time sentinel, not an ordinary finite recorder stop. Apply plain-data projection revision 2 so it emits `{\"kind\":\"nest_time_positive_infinity\"}`, then use capture-authority v4 with adapter revision 5.");
		if (typeof stop !== "number" || !Number.isFinite(stop) || stop < 0) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "/stop", "`stop` must be a finite non-negative number relative to the NEST recording-device origin.");
		if (!(start < stop)) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", "/stop", "`stop` must be strictly greater than `start` for the NEST origin-relative recording interval.");
		finiteStop = stop;
	}
	const nestVersion = optionValue.nestVersion;
	if (typeof nestVersion !== "string" || nestVersion.length > 120 || nestVersion !== ADMITTED_NEST_VERSION) return adapterFailure("ADAPTER_UNSUPPORTED_VERSION", "/nestVersion", `nestVersion is required and must equal the exact pinned adapter-revision-${adapterRevision} profile 3.10.0. Other NEST releases and patches remain unsupported until separately executed and evidenced.`);
	const captureAuthority = optionValue.captureAuthority;
	if (!isPlainRecord(captureAuthority)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority", "captureAuthority is required. A detached final status alone cannot prove that the NEST memory buffer was not reset, that recorder configuration and wiring stayed fixed, that the successful-return capture endpoint was reached, that the kernel clock stayed monotonic, that the projection was lossless, or that MPI ranks were merged.");
	const captureKeysFailure = exactObjectKeysFailure(captureAuthority, /* @__PURE__ */ new Set([
		"kind",
		"profile",
		"runtimeStatus",
		"recordingGrid",
		"bufferEpoch",
		"recordingPlan",
		"clockEpochContinuity",
		"eventCompleteness"
	]), "/captureAuthority", "captureAuthority", adapterRevision);
	if (captureKeysFailure) return captureKeysFailure;
	if (captureAuthority.kind !== CAPTURE_AUTHORITY_KIND) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/kind", `captureAuthority.kind must equal ${JSON.stringify(CAPTURE_AUTHORITY_KIND)}. This detached adapter accepts a caller declaration, not an authenticated live-capture receipt.`);
	const captureAuthorityProfile = positiveInfinityStop ? CAPTURE_AUTHORITY_PROFILE_V4 : CAPTURE_AUTHORITY_PROFILE_V3;
	if (captureAuthority.profile !== captureAuthorityProfile) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/profile", positiveInfinityStop ? `captureAuthority.profile must equal ${JSON.stringify(captureAuthorityProfile)} for the revision-5 positive-infinity branch. Finite-stop V3 and positive-infinity V4 authority are not interchangeable.` : `captureAuthority.profile must equal ${JSON.stringify(CAPTURE_AUTHORITY_PROFILE_V3)} for the corrected revision-5 finite-stop branch. Historical V1 authority does not bind the pinned time build or source-faithful clock projection.`);
	const runtimeStatus = captureAuthority.runtimeStatus;
	if (!isPlainRecord(runtimeStatus)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus", "captureAuthority.runtimeStatus must be a closed plain object.");
	const runtimeKeysFailure = exactObjectKeysFailure(runtimeStatus, /* @__PURE__ */ new Set([
		"nestVersion",
		"statusReadMethod",
		"executionScope",
		"resolutionMs",
		"ticsPerMs",
		"resolutionTics",
		"captureBiologicalTimeTics",
		"captureBoundary",
		"timeBuildProfile"
	]), "/captureAuthority/runtimeStatus", "captureAuthority.runtimeStatus", adapterRevision);
	if (runtimeKeysFailure) return runtimeKeysFailure;
	if (runtimeStatus.nestVersion !== ADMITTED_NEST_VERSION) return adapterFailure("ADAPTER_UNSUPPORTED_VERSION", "/captureAuthority/runtimeStatus/nestVersion", "captureAuthority.runtimeStatus.nestVersion must equal the pinned 3.10.0 profile.");
	if (runtimeStatus.nestVersion !== nestVersion) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/nestVersion", "the capture runtime version must exactly equal the top-level adapter version declaration.");
	if (runtimeStatus.timeBuildProfile !== NEST_TIME_BUILD_PROFILE) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/timeBuildProfile", `timeBuildProfile must equal ${JSON.stringify(NEST_TIME_BUILD_PROFILE)}. NEST's Time ceiling and serialization depend on compiled integer widths and IEEE-754 behavior, so version alone is insufficient authority.`);
	const statusReadMethod = positiveInfinityStop ? STATUS_READ_METHOD_V2 : STATUS_READ_METHOD_V1;
	if (runtimeStatus.statusReadMethod !== statusReadMethod) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/statusReadMethod", positiveInfinityStop ? `statusReadMethod must equal ${JSON.stringify(statusReadMethod)} for the revision-5 positive-infinity branch; raw NumPy values, bulk collections, lossy projections, and reconstructed status objects have different authority boundaries.` : `statusReadMethod must equal ${JSON.stringify(STATUS_READ_METHOD_V1)}; raw NumPy values, bulk collections, lossy projections, and reconstructed status objects have different authority boundaries.`);
	const captureBoundary = positiveInfinityStop ? CAPTURE_BOUNDARY_V2 : CAPTURE_BOUNDARY_V1;
	if (runtimeStatus.captureBoundary !== captureBoundary) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/captureBoundary", `captureBoundary must equal ${JSON.stringify(captureBoundary)}.`);
	const resolutionMs = runtimeStatus.resolutionMs;
	if (typeof resolutionMs !== "number" || !Number.isFinite(resolutionMs) || !(resolutionMs > 0)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/resolutionMs", "resolutionMs must be a finite positive binary64 value copied from the pinned NEST runtime status.");
	const ticsPerMsResult = parseCanonicalTics(runtimeStatus.ticsPerMs, "/captureAuthority/runtimeStatus/ticsPerMs", "ticsPerMs", true);
	if (!ticsPerMsResult.ok) return ticsPerMsResult.result;
	const resolutionTicsResult = parseCanonicalTics(runtimeStatus.resolutionTics, "/captureAuthority/runtimeStatus/resolutionTics", "resolutionTics", true);
	if (!resolutionTicsResult.ok) return resolutionTicsResult.result;
	const captureTicsResult = parseCanonicalTics(runtimeStatus.captureBiologicalTimeTics, "/captureAuthority/runtimeStatus/captureBiologicalTimeTics", "captureBiologicalTimeTics", false);
	if (!captureTicsResult.ok) return captureTicsResult.result;
	const executionScope = runtimeStatus.executionScope;
	if (!isPlainRecord(executionScope)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/executionScope", "executionScope must be a closed single-process scope object.");
	const executionScopeKeysFailure = exactObjectKeysFailure(executionScope, /* @__PURE__ */ new Set([
		"kind",
		"numProcesses",
		"rank",
		"localNumThreads"
	]), "/captureAuthority/runtimeStatus/executionScope", "captureAuthority.runtimeStatus.executionScope", adapterRevision);
	if (executionScopeKeysFailure) return executionScopeKeysFailure;
	if (executionScope.kind !== "single_process" || executionScope.numProcesses !== 1 || executionScope.rank !== 0 || typeof executionScope.localNumThreads !== "number" || !Number.isSafeInteger(executionScope.localNumThreads) || executionScope.localNumThreads < 1 || executionScope.localNumThreads > 1e6) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/executionScope", `revision ${adapterRevision} admits only one exact single-process scope: kind=single_process, numProcesses=1, rank=0, and localNumThreads a safe integer from 1 through 1000000. Rank-local and caller-premerged MPI status is not a complete recorder authority.`);
	const recordingGrid = captureAuthority.recordingGrid;
	if (!isPlainRecord(recordingGrid)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/recordingGrid", positiveInfinityStop ? "recordingGrid must be a closed object containing only the exact integer-tic preimages of finite origin and start. NEST positive infinity has no finite stopTics preimage." : "recordingGrid must be a closed object containing the exact integer-tic preimages of origin, start, and stop.");
	const recordingGridKeysFailure = exactObjectKeysFailure(recordingGrid, positiveInfinityStop ? /* @__PURE__ */ new Set(["originTics", "startTics"]) : /* @__PURE__ */ new Set([
		"originTics",
		"startTics",
		"stopTics"
	]), "/captureAuthority/recordingGrid", "captureAuthority.recordingGrid", adapterRevision);
	if (recordingGridKeysFailure) return recordingGridKeysFailure;
	const originTicsResult = parseCanonicalTics(recordingGrid.originTics, "/captureAuthority/recordingGrid/originTics", "originTics", false);
	if (!originTicsResult.ok) return originTicsResult.result;
	const startTicsResult = parseCanonicalTics(recordingGrid.startTics, "/captureAuthority/recordingGrid/startTics", "startTics", false);
	if (!startTicsResult.ok) return startTicsResult.result;
	let finiteStopTics;
	if (!positiveInfinityStop) {
		const stopTicsResult = parseCanonicalTics(recordingGrid.stopTics, "/captureAuthority/recordingGrid/stopTics", "stopTics", false);
		if (!stopTicsResult.ok) return stopTicsResult.result;
		finiteStopTics = stopTicsResult;
	}
	const bufferEpoch = captureAuthority.bufferEpoch;
	if (!isPlainRecord(bufferEpoch)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/bufferEpoch", "bufferEpoch must identify the most recent recorder creation or n_events=0 memory clear.");
	const bufferKeysFailure = exactObjectKeysFailure(bufferEpoch, /* @__PURE__ */ new Set(["beganBy", "beganAtBiologicalTimeTics"]), "/captureAuthority/bufferEpoch", "captureAuthority.bufferEpoch", adapterRevision);
	if (bufferKeysFailure) return bufferKeysFailure;
	if (bufferEpoch.beganBy !== "recorder_creation" && bufferEpoch.beganBy !== "n_events_zero") return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/bufferEpoch/beganBy", "bufferEpoch.beganBy must be recorder_creation or n_events_zero.");
	const bufferBeganTicsResult = parseCanonicalTics(bufferEpoch.beganAtBiologicalTimeTics, "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics", "bufferEpoch.beganAtBiologicalTimeTics", false);
	if (!bufferBeganTicsResult.ok) return bufferBeganTicsResult.result;
	const recordingPlan = captureAuthority.recordingPlan;
	if (!isPlainRecord(recordingPlan)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/recordingPlan", "recordingPlan must identify the most recent recorder-window, backend, clock, or sender-wiring mutation.");
	const planKeysFailure = exactObjectKeysFailure(recordingPlan, /* @__PURE__ */ new Set([
		"lastMutationAtBiologicalTimeTics",
		"scope",
		"senderUniverseBinding"
	]), "/captureAuthority/recordingPlan", "captureAuthority.recordingPlan", adapterRevision);
	if (planKeysFailure) return planKeysFailure;
	if (recordingPlan.scope !== RECORDING_PLAN_SCOPE) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/recordingPlan/scope", `recordingPlan.scope must equal ${JSON.stringify(RECORDING_PLAN_SCOPE)}.`);
	if (recordingPlan.senderUniverseBinding !== SENDER_UNIVERSE_BINDING) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/recordingPlan/senderUniverseBinding", `senderUniverseBinding must equal ${JSON.stringify(SENDER_UNIVERSE_BINDING)}.`);
	const planMutationTicsResult = parseCanonicalTics(recordingPlan.lastMutationAtBiologicalTimeTics, "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics", "recordingPlan.lastMutationAtBiologicalTimeTics", false);
	if (!planMutationTicsResult.ok) return planMutationTicsResult.result;
	if (captureAuthority.clockEpochContinuity !== CLOCK_EPOCH_CONTINUITY) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/clockEpochContinuity", `captureAuthority.clockEpochContinuity must equal ${JSON.stringify(CLOCK_EPOCH_CONTINUITY)}. NEST can reset biological_time to zero without destroying the recorder or clearing retained memory, and its own 3.10.0 source marks that operation incompletely supported.`);
	if (captureAuthority.eventCompleteness !== EVENT_COMPLETENESS) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/eventCompleteness", `captureAuthority.eventCompleteness must equal ${JSON.stringify(EVENT_COMPLETENESS)}.`);
	const ticsPerMs = ticsPerMsResult.value;
	const resolutionTics = resolutionTicsResult.value;
	const captureBiologicalTimeTics = captureTicsResult.value;
	const originTics = originTicsResult.value;
	const startTics = startTicsResult.value;
	const beganAtBiologicalTimeTics = bufferBeganTicsResult.value;
	const lastMutationAtBiologicalTimeTics = planMutationTicsResult.value;
	if (ticsPerMs > MAX_SAFE_TICS) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", "/captureAuthority/runtimeStatus/ticsPerMs", "ticsPerMs is outside the revision-5 source-clock subset; it must be no larger than Number.MAX_SAFE_INTEGER.");
	const finiteTimeLimitTics = require_nest_time.nestFiniteTimeLimitTicsV310(resolutionTics);
	if (finiteTimeLimitTics === void 0) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", "/captureAuthority/runtimeStatus/resolutionTics", "resolutionTics is outside the pinned LP64/int64 NEST 3.10.0 finite-Time build profile and exact-integer subset.");
	const primitiveTics = [
		[
			resolutionTics,
			"/captureAuthority/runtimeStatus/resolutionTics",
			"resolutionTics"
		],
		[
			captureBiologicalTimeTics,
			"/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
			"captureBiologicalTimeTics"
		],
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
			beganAtBiologicalTimeTics,
			"/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics",
			"beganAtBiologicalTimeTics"
		],
		[
			lastMutationAtBiologicalTimeTics,
			"/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics",
			"lastMutationAtBiologicalTimeTics"
		]
	];
	if (finiteStopTics !== void 0) primitiveTics.splice(4, 0, [
		finiteStopTics.value,
		"/captureAuthority/recordingGrid/stopTics",
		"stopTics"
	]);
	for (const [tics, instancePath, label] of primitiveTics) {
		if (tics > MAX_SAFE_TICS || tics >= finiteTimeLimitTics) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", instancePath, `${label} is outside the revision-5 conservative source-clock subset; every retained NEST Time tic must be a safe integer strictly below the pinned finite-Time limit.`);
		const projection = require_nest_time.projectNestTicsToMillisecondsV310(tics, ticsPerMs);
		if (!projection.ok) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", instancePath, `${label} cannot round-trip through the pinned NEST 3.10.0 binary64 millisecond projection: ${projection.message}`);
	}
	const projectionEntries = [
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
		]
	];
	if (!positiveInfinityStop) projectionEntries.push([
		finiteStopTics.value,
		finiteStop,
		"/captureAuthority/recordingGrid/stopTics",
		"stop"
	]);
	for (const [tics, milliseconds, instancePath, label] of projectionEntries) {
		const projectionFailure = projectedMillisecondsFailure(tics, ticsPerMs, milliseconds, instancePath, label);
		if (projectionFailure) return projectionFailure;
	}
	const gridEntries = [
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
	];
	if (!positiveInfinityStop) gridEntries.splice(2, 0, [
		finiteStopTics.value,
		"/captureAuthority/recordingGrid/stopTics",
		"stopTics"
	]);
	for (const [tics, instancePath, label] of gridEntries) if (tics % resolutionTics !== 0n) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", instancePath, `${label} must lie exactly on the declared NEST runtime resolution grid.`);
	const absoluteStartTics = originTics + startTics;
	const absoluteUpperTics = positiveInfinityStop ? captureBiologicalTimeTics : originTics + finiteStopTics.value;
	if (positiveInfinityStop) {
		if (captureBiologicalTimeTics <= absoluteStartTics) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/captureBiologicalTimeTics", "captureBiologicalTimeTics must be strictly greater than originTics + startTics. The finite successful-return capture endpoint, not the configured positive-infinity stop, closes this raster window.");
	} else if (captureBiologicalTimeTics < absoluteUpperTics) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/runtimeStatus/captureBiologicalTimeTics", "captureBiologicalTimeTics must be at least originTics + stopTics, and the status must be read only after the Simulate or Run call that reached that endpoint returned successfully.");
	if (beganAtBiologicalTimeTics > absoluteStartTics) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics", "the most recent recorder creation or n_events=0 clear must be no later than originTics + startTics.");
	if (lastMutationAtBiologicalTimeTics > absoluteStartTics) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics", "the most recent recorder-window, backend, clock, or sender-wiring mutation must be no later than originTics + startTics.");
	for (const [tics, instancePath, label] of [[
		absoluteStartTics,
		"/captureAuthority/recordingGrid/startTics",
		"originTics + startTics"
	], [
		absoluteUpperTics,
		positiveInfinityStop ? "/captureAuthority/runtimeStatus/captureBiologicalTimeTics" : "/captureAuthority/recordingGrid/stopTics",
		positiveInfinityStop ? "captureBiologicalTimeTics" : "originTics + stopTics"
	]]) {
		if (tics > MAX_SAFE_TICS || tics >= finiteTimeLimitTics) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", instancePath, `${label} is outside the revision-5 conservative source-clock subset; each combined endpoint must be a safe integer strictly below the pinned finite-Time limit.`);
		const projection = require_nest_time.projectNestTicsToMillisecondsV310(tics, ticsPerMs);
		if (!projection.ok) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", instancePath, `${label} cannot round-trip through the pinned NEST 3.10.0 binary64 millisecond projection: ${projection.message}`);
	}
	const windowProjection = require_nest_time.projectNestWindowEndpointsV310({
		ticsPerMs,
		resolutionTics,
		retainedTics: [
			originTics,
			startTics,
			...positiveInfinityStop ? [] : [finiteStopTics.value],
			captureBiologicalTimeTics,
			beganAtBiologicalTimeTics,
			lastMutationAtBiologicalTimeTics
		],
		lowerEndpointTics: absoluteStartTics,
		upperEndpointTics: absoluteUpperTics
	});
	if (!windowProjection.ok) return adapterFailure("ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED", positiveInfinityStop ? "/captureAuthority/runtimeStatus/captureBiologicalTimeTics" : "/captureAuthority/recordingGrid/stopTics", `the declared NEST clock is outside the revision-5 source-faithful finite and distinguishable subset: ${windowProjection.message}`);
	const captureTime = positiveInfinityStop ? windowProjection.upperMilliseconds : void 0;
	const recordedValues = optionValue.recordedSenderIds;
	if (!Array.isArray(recordedValues) || recordedValues.length === 0) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/recordedSenderIds", "recordedSenderIds is required and must be a non-empty array containing the complete recorded universe, including silent senders.");
	const recordedSenderIds = [];
	const recordedUniverse = /* @__PURE__ */ new Set();
	for (let index = 0; index < recordedValues.length; index++) {
		const normalized = normalizeSenderId(recordedValues[index]);
		if (normalized === void 0) return adapterFailure("ADAPTER_MAPPING_REQUIRED", `/recordedSenderIds/${index}`, "a recorded sender id must be a positive safe-integer number or an already-canonical positive decimal string.");
		if (recordedUniverse.has(normalized)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", `/recordedSenderIds/${index}`, "recordedSenderIds must be unique after canonical decimal normalization.");
		recordedUniverse.add(normalized);
		recordedSenderIds.push(normalized);
	}
	const eventSenderIds = [];
	const eventTimes = [];
	for (let index = 0; index < events.times.length; index++) {
		const time = events.times[index];
		if (typeof time !== "number" || !Number.isFinite(time)) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", `/events/times/${index}`, "each native-millisecond event time must already be a finite JavaScript number; strings and coercible objects are rejected.");
		const sender = normalizeSenderId(events.senders[index]);
		if (sender === void 0) return adapterFailure("ADAPTER_NEST_UNSUPPORTED_SHAPE", `/events/senders/${index}`, "each event sender must be a positive safe-integer number or an already-canonical positive decimal string.");
		if (!recordedUniverse.has(sender)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", `/events/senders/${index}`, "every event sender must be a member of the declared complete recorded sender universe.");
		eventTimes.push(time);
		eventSenderIds.push(sender);
	}
	const runId = optionValue.runId;
	if (runId !== void 0 && !isCortexelIdentifier(runId)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/runId", "runId, when supplied, must be a Cortexel identifier.");
	const recorderId = optionValue.recorderId;
	if (recorderId !== void 0 && !isCortexelIdentifier(recorderId)) return adapterFailure("ADAPTER_MAPPING_REQUIRED", "/recorderId", "recorderId, when supplied, must be a Cortexel identifier.");
	const normalizedRecordingGrid = positiveInfinityStop ? {
		originTics: originTicsResult.canonical,
		startTics: startTicsResult.canonical
	} : {
		originTics: originTicsResult.canonical,
		startTics: startTicsResult.canonical,
		stopTics: finiteStopTics.canonical
	};
	const normalizedCaptureAuthority = {
		kind: CAPTURE_AUTHORITY_KIND,
		profile: captureAuthorityProfile,
		runtimeStatus: {
			nestVersion: ADMITTED_NEST_VERSION,
			timeBuildProfile: NEST_TIME_BUILD_PROFILE,
			statusReadMethod,
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
			captureBoundary
		},
		recordingGrid: normalizedRecordingGrid,
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
	const adapterInputDigest = require_canonicalize.canonicalDigest({
		domain: NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5,
		exportedStatus: value,
		options: {
			recordedSenderIds,
			nestVersion,
			captureAuthority: normalizedCaptureAuthority,
			runId: runId ?? null,
			recorderId: recorderId ?? null
		}
	});
	const window = positiveInfinityStop ? {
		kind: "nest_recording_device_positive_infinity_capture_bounded",
		origin,
		start,
		captureTime,
		unit: "ms",
		boundary: "(origin+start,capture]",
		recordingBackend: "memory",
		timeEncoding: "native_binary64_ms",
		configuredStop: {
			kind: "nest_time_positive_infinity",
			exportedMs: NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS
		},
		captureAuthority: {
			...normalizedCaptureAuthority,
			adapterInputDigest
		}
	} : {
		kind: "nest_recording_device_origin_relative",
		origin,
		start,
		stop: finiteStop,
		unit: "ms",
		boundary: "(origin+start,origin+stop]",
		recordingBackend: "memory",
		timeEncoding: "native_binary64_ms",
		captureAuthority: {
			...normalizedCaptureAuthority,
			adapterInputDigest
		}
	};
	return {
		ok: true,
		request: {
			contract: {
				name: require_contract_identity.REQUEST_CONTRACT_IDENTITY.name,
				version: require_contract_identity.REQUEST_CONTRACT_IDENTITY.version
			},
			skill: { id: "neuro.spike_raster" },
			data: {
				eventTimes: {
					kind: "time",
					unit: "ms",
					values: eventTimes
				},
				eventSenderIds,
				recordedSenderIds,
				window,
				timeBase: "absolute_clock",
				senderUniverseComplete: true,
				eventCompleteness: EVENT_COMPLETENESS
			},
			parameters: {
				rowOrder: "canonical_sender_id",
				markStyle: "tick",
				outOfWindowPolicy: "reject",
				aboveMarkBudget: "refuse"
			},
			source: {
				kind: "simulation",
				system: "NEST",
				systemVersion: nestVersion,
				...runId !== void 0 ? { runId } : {},
				...recorderId !== void 0 ? { recorderId } : {},
				sourceDigest: require_canonicalize.canonicalDigest(value)
			}
		}
	};
}

//#endregion
Object.defineProperty(exports, 'NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN', {
  enumerable: true,
  get: function () {
    return NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN;
  }
});
Object.defineProperty(exports, 'NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3', {
  enumerable: true,
  get: function () {
    return NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3;
  }
});
Object.defineProperty(exports, 'NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5', {
  enumerable: true,
  get: function () {
    return NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5;
  }
});
Object.defineProperty(exports, 'NEST_TIME_BUILD_PROFILE', {
  enumerable: true,
  get: function () {
    return NEST_TIME_BUILD_PROFILE;
  }
});
Object.defineProperty(exports, 'NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS', {
  enumerable: true,
  get: function () {
    return NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS;
  }
});
Object.defineProperty(exports, 'nestSpikeRecorderToRaster', {
  enumerable: true,
  get: function () {
    return nestSpikeRecorderToRaster;
  }
});
//# sourceMappingURL=nest-Bv1FEEDu.cjs.map