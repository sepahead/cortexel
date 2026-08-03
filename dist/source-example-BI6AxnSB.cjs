//#region src/adapters/nest/profile.ts
/**
* Historical identity for the superseded finite-stop revision-3 branch.
*
* This value remains exported only so migration tooling and existing constant
* imports can identify old bytes. The executable adapter no longer accepts its
* authority or emits its digest domain; revision 5 is the current profile.
*/
const NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3 = Object.freeze({
	adapterRevision: 3,
	nestVersion: "3.10.0",
	upstreamSourceCommit: "acca9704da248750219a027db99fec6cd1f9052a",
	inputDigestDomain: "cortexel.nest-spike-recorder-adapter-input.v3",
	captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v1",
	statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1"
});
/**
* Implementation-owned identity for the corrected finite-stop and
* positive-infinity/capture-bounded branches of the packaged NEST adapter.
*
* Revision 5 deliberately supersedes, rather than silently changing, revision
* 3. It binds the pinned LP64/int64 time build and reproduces NEST's actual
* two-operation binary64 `Time::get_ms()` projection.
*/
const NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5 = Object.freeze({
	adapterRevision: 5,
	nestVersion: "3.10.0",
	upstreamSourceCommit: "acca9704da248750219a027db99fec6cd1f9052a",
	inputDigestDomain: "cortexel.nest-spike-recorder-adapter-input.v5",
	branches: Object.freeze({
		finiteStop: Object.freeze({
			stopKind: "finite",
			captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v3",
			recordTo: "memory",
			timeInSteps: false,
			statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1",
			executionScope: "single_process",
			eventBoundary: "(origin+start,origin+stop]",
			captureHorizon: "origin+stop_after_successful_return"
		}),
		positiveInfinityCaptureBounded: Object.freeze({
			stopKind: "nest_time_positive_infinity",
			captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v4",
			recordTo: "memory",
			timeInSteps: false,
			statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v2",
			executionScope: "single_process",
			eventBoundary: "(origin+start,capture]",
			captureHorizon: "capture_after_successful_advancing_return_before_further_advance_or_mutation"
		})
	}),
	timeBuildProfile: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1",
	captureBoundary: "after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation",
	positiveInfinityExportedMs: Number.MAX_VALUE
});

//#endregion
//#region src/adapters/source-example.ts
/**
* Versioned, deliberately non-executable source-adapter examples.
*
* A library-authored example is known to be synthetic.  It therefore cannot be
* passed through an adapter that authors `source.kind = "simulation"`: doing so
* would turn Cortexel's own fixture into a caller declaration about a simulator
* run that never happened.  The outer envelope makes that status discoverable,
* while the nested guard makes the unchanged `inputTemplate` fail even if a host
* extracts it and calls the programmatic adapter directly.
*
* Removing the guard is intentionally never automatic.  It is the caller's
* explicit acknowledgement that every synthetic value has first been replaced
* with its caller-owned capture and authority record.  Cortexel cannot verify
* that external act, but it can prevent the shipped bytes from silently crossing
* the simulation-provenance boundary unchanged.
*/
const SOURCE_ADAPTER_EXAMPLE_PROTOCOL = "cortexel-source-adapter-example";
const SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION = 1;
const SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER = "cortexelSyntheticExampleGuard";
const SOURCE_ADAPTER_EXAMPLE_ACTION = "replace_with_caller_owned_capture_then_remove_guard_and_submit_input_template";
const SOURCE_ADAPTER_EXAMPLE_KIND = "synthetic_fixture";
const SOURCE_ADAPTER_EXAMPLE_EXECUTION = "template_only";
const SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS = "synthetic_unreplaced";
const EXAMPLE_GUARD = Object.freeze({
	protocol: SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
	protocolVersion: 1,
	status: SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS
});
/** Construct one closed template-only example from trusted catalog literals. */
function makeSourceAdapterExampleEnvelope(id, revision, inputTemplate) {
	if (!Number.isSafeInteger(revision) || revision <= 0) throw new TypeError("source-adapter example revision must be a positive safe integer");
	if (Object.prototype.hasOwnProperty.call(inputTemplate.options, "cortexelSyntheticExampleGuard")) throw new TypeError("source-adapter input template already contains the synthetic guard");
	return {
		protocol: SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
		protocolVersion: 1,
		adapter: {
			id,
			revision
		},
		exampleKind: SOURCE_ADAPTER_EXAMPLE_KIND,
		execution: SOURCE_ADAPTER_EXAMPLE_EXECUTION,
		action: SOURCE_ADAPTER_EXAMPLE_ACTION,
		inputTemplate: {
			exportedStatus: inputTemplate.exportedStatus,
			options: {
				...inputTemplate.options,
				[SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER]: EXAMPLE_GUARD
			}
		}
	};
}
const EXAMPLE_KEYS = Object.freeze([
	"action",
	"adapter",
	"exampleKind",
	"execution",
	"inputTemplate",
	"protocol",
	"protocolVersion"
]);
const EXAMPLE_KEY_SET = new Set(EXAMPLE_KEYS);
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function hasAnyExampleEnvelopeKey(value) {
	return Object.keys(value).some((key) => EXAMPLE_KEY_SET.has(key));
}
/**
* Classify the outer envelope without inspecting a single `inputTemplate`
* member.  Raw CLI JSON has already crossed the duplicate-key-safe parser, so
* exact own-key and primitive checks are sufficient here.
*/
function classifySourceAdapterExampleEnvelope(value) {
	if (!isRecord(value) || !hasAnyExampleEnvelopeKey(value)) return { kind: "not_example" };
	const keys = Object.keys(value).sort();
	if (keys.length !== EXAMPLE_KEYS.length || keys.some((key, index) => key !== EXAMPLE_KEYS[index]) || value.protocol !== "cortexel-source-adapter-example" || value.protocolVersion !== 1 || value.exampleKind !== SOURCE_ADAPTER_EXAMPLE_KIND || value.execution !== SOURCE_ADAPTER_EXAMPLE_EXECUTION || value.action !== "replace_with_caller_owned_capture_then_remove_guard_and_submit_input_template") return { kind: "malformed_example" };
	const adapter = value.adapter;
	if (!isRecord(adapter)) return { kind: "malformed_example" };
	const adapterKeys = Object.keys(adapter).sort();
	if (adapterKeys.length !== 2 || adapterKeys[0] !== "id" || adapterKeys[1] !== "revision" || typeof adapter.id !== "string" || adapter.id.length === 0 || adapter.id.length > 64 || !/^[a-z0-9._-]+$/u.test(adapter.id) || !Number.isSafeInteger(adapter.revision) || adapter.revision <= 0) return { kind: "malformed_example" };
	return { kind: "template_only" };
}
/** True only for the exact nested guard Cortexel adds to its own fixtures. */
function isSourceAdapterExampleGuard(value) {
	if (!isRecord(value)) return false;
	const keys = Object.keys(value).sort();
	return keys.length === 3 && keys[0] === "protocol" && keys[1] === "protocolVersion" && keys[2] === "status" && value.protocol === "cortexel-source-adapter-example" && value.protocolVersion === 1 && value.status === SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS;
}

//#endregion
Object.defineProperty(exports, 'NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3', {
  enumerable: true,
  get: function () {
    return NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3;
  }
});
Object.defineProperty(exports, 'NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5', {
  enumerable: true,
  get: function () {
    return NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5;
  }
});
Object.defineProperty(exports, 'SOURCE_ADAPTER_EXAMPLE_ACTION', {
  enumerable: true,
  get: function () {
    return SOURCE_ADAPTER_EXAMPLE_ACTION;
  }
});
Object.defineProperty(exports, 'SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER', {
  enumerable: true,
  get: function () {
    return SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER;
  }
});
Object.defineProperty(exports, 'SOURCE_ADAPTER_EXAMPLE_PROTOCOL', {
  enumerable: true,
  get: function () {
    return SOURCE_ADAPTER_EXAMPLE_PROTOCOL;
  }
});
Object.defineProperty(exports, 'SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION', {
  enumerable: true,
  get: function () {
    return SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION;
  }
});
Object.defineProperty(exports, 'classifySourceAdapterExampleEnvelope', {
  enumerable: true,
  get: function () {
    return classifySourceAdapterExampleEnvelope;
  }
});
Object.defineProperty(exports, 'isSourceAdapterExampleGuard', {
  enumerable: true,
  get: function () {
    return isSourceAdapterExampleGuard;
  }
});
Object.defineProperty(exports, 'makeSourceAdapterExampleEnvelope', {
  enumerable: true,
  get: function () {
    return makeSourceAdapterExampleEnvelope;
  }
});
//# sourceMappingURL=source-example-BI6AxnSB.cjs.map