/**
 * Historical identity for the superseded finite-stop revision-3 branch.
 *
 * This value remains exported only so migration tooling and existing constant
 * imports can identify old bytes. The executable adapter no longer accepts its
 * authority or emits its digest domain; revision 5 is the current profile.
 */
export const NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3 = Object.freeze({
  adapterRevision: 3,
  nestVersion: '3.10.0',
  upstreamSourceCommit: 'acca9704da248750219a027db99fec6cd1f9052a',
  inputDigestDomain: 'cortexel.nest-spike-recorder-adapter-input.v3',
  captureAuthorityProfile: 'cortexel-nest-memory-spike-capture-authority.v1',
  statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v1',
} as const);

/**
 * Implementation-owned identity for the corrected finite-stop and
 * positive-infinity/capture-bounded branches of the packaged NEST adapter.
 *
 * Revision 5 deliberately supersedes, rather than silently changing, revision
 * 3. It binds the pinned LP64/int64 time build and reproduces NEST's actual
 * two-operation binary64 `Time::get_ms()` projection.
 */
export const NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5 = Object.freeze({
  adapterRevision: 5,
  nestVersion: '3.10.0',
  upstreamSourceCommit: 'acca9704da248750219a027db99fec6cd1f9052a',
  inputDigestDomain: 'cortexel.nest-spike-recorder-adapter-input.v5',
  branches: Object.freeze({
    finiteStop: Object.freeze({
      stopKind: 'finite',
      captureAuthorityProfile: 'cortexel-nest-memory-spike-capture-authority.v3',
      recordTo: 'memory',
      timeInSteps: false,
      statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v1',
      executionScope: 'single_process',
      eventBoundary: '(origin+start,origin+stop]',
      captureHorizon: 'origin+stop_after_successful_return',
      captureBoundary: 'after_successful_simulate_or_run_return',
    }),
    positiveInfinityCaptureBounded: Object.freeze({
      stopKind: 'nest_time_positive_infinity',
      captureAuthorityProfile: 'cortexel-nest-memory-spike-capture-authority.v4',
      recordTo: 'memory',
      timeInSteps: false,
      statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v2',
      executionScope: 'single_process',
      eventBoundary: '(origin+start,capture]',
      captureHorizon:
        'capture_after_successful_advancing_return_before_further_advance_or_mutation',
      captureBoundary:
        'after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation',
    }),
  }),
  timeBuildProfile: 'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1',
  positiveInfinityExportedMs: Number.MAX_VALUE,
} as const);
