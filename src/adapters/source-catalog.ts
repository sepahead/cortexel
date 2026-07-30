/**
 * Closed discovery authority for executable source adapters.
 *
 * Skill contracts describe many candidate source mappings. Most are deliberately
 * `not_implemented`; that prose is not an executable registry. This module exposes only
 * adapters that the installed package can actually invoke. Its digest lets an agent bind
 * a cached discovery response to the exact descriptor bytes it used.
 */

import { canonicalDigest } from '../core/canonicalize.js';
import { freezeGenerated } from '../core/deep-freeze.js';
import {
  NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5,
} from './nest/profile.js';

export const SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN =
  'cortexel-source-adapter-catalog.rfc8785-sha256.v1';

export const SOURCE_ADAPTER_IDS = Object.freeze(['nest-spike-recorder'] as const);

export type SourceAdapterId = (typeof SOURCE_ADAPTER_IDS)[number];

const SOURCE_ADAPTER_ID_SET: ReadonlySet<string> = new Set(SOURCE_ADAPTER_IDS);

export function isSourceAdapterId(value: unknown): value is SourceAdapterId {
  return typeof value === 'string' && SOURCE_ADAPTER_ID_SET.has(value);
}

const NEST_SPIKE_RECORDER_POSITIVE_INFINITY_V5_EXAMPLE = {
  exportedStatus: {
    record_to: 'memory',
    time_in_steps: false,
    origin: 0,
    start: 0,
    stop: {
      kind: 'nest_time_positive_infinity',
    },
    n_events: 3,
    events: {
      // Source order, repeated observations, and a silent sender are intentional.
      senders: [2, 1, 2],
      times: [9.9, 1, 1],
    },
  },
  options: {
    recordedSenderIds: [1, 2, 3],
    nestVersion: '3.10.0',
    captureAuthority: {
      kind: 'caller_declaration',
      profile: 'cortexel-nest-memory-spike-capture-authority.v4',
      runtimeStatus: {
        nestVersion: '3.10.0',
        timeBuildProfile: 'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1',
        statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v2',
        executionScope: {
          kind: 'single_process',
          numProcesses: 1,
          rank: 0,
          localNumThreads: 1,
        },
        resolutionMs: 0.1,
        ticsPerMs: '1000',
        resolutionTics: '100',
        captureBiologicalTimeTics: '10000',
        captureBoundary:
          'after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation',
      },
      recordingGrid: {
        originTics: '0',
        startTics: '0',
      },
      bufferEpoch: {
        beganBy: 'recorder_creation',
        beganAtBiologicalTimeTics: '0',
      },
      recordingPlan: {
        lastMutationAtBiologicalTimeTics: '0',
        scope: 'window_backend_time_encoding_and_sender_wiring',
        senderUniverseBinding:
          'recorded_sender_ids_exactly_equal_full_window_connected_source_universe',
      },
      clockEpochContinuity: 'biological_time_monotonic_since_last_kernel_initialization',
      eventCompleteness: 'complete_for_recorded_senders',
    },
    runId: 'run-1',
    recorderId: 'spike-recorder-1',
  },
} as const;

const NEST_SPIKE_RECORDER_FINITE_STOP_V5_EXAMPLE = {
  exportedStatus: {
    record_to: 'memory',
    time_in_steps: false,
    origin: 0,
    start: 0,
    stop: 10,
    n_events: 3,
    events: {
      // Matches the v4 example's observations so only evidence shape differs.
      senders: [2, 1, 2],
      times: [9.9, 1, 1],
    },
  },
  options: {
    recordedSenderIds: [1, 2, 3],
    nestVersion: '3.10.0',
    captureAuthority: {
      kind: 'caller_declaration',
      profile: 'cortexel-nest-memory-spike-capture-authority.v3',
      runtimeStatus: {
        nestVersion: '3.10.0',
        timeBuildProfile: 'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1',
        statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v1',
        executionScope: {
          kind: 'single_process',
          numProcesses: 1,
          rank: 0,
          localNumThreads: 1,
        },
        resolutionMs: 0.1,
        ticsPerMs: '1000',
        resolutionTics: '100',
        captureBiologicalTimeTics: '10000',
        captureBoundary: 'after_successful_simulate_or_run_return',
      },
      recordingGrid: {
        originTics: '0',
        startTics: '0',
        stopTics: '10000',
      },
      bufferEpoch: {
        beganBy: 'recorder_creation',
        beganAtBiologicalTimeTics: '0',
      },
      recordingPlan: {
        lastMutationAtBiologicalTimeTics: '0',
        scope: 'window_backend_time_encoding_and_sender_wiring',
        senderUniverseBinding:
          'recorded_sender_ids_exactly_equal_full_window_connected_source_universe',
      },
      clockEpochContinuity: 'biological_time_monotonic_since_last_kernel_initialization',
      eventCompleteness: 'complete_for_recorded_senders',
    },
    runId: 'run-1',
    recorderId: 'spike-recorder-1',
  },
} as const;

const SOURCE_ADAPTER_CATALOG_DATA = {
  protocol: 'cortexel-source-adapter-catalog',
  protocolVersion: 1,
  adapters: {
    'nest-spike-recorder': {
      id: 'nest-spike-recorder',
      revision: 5,
      title: 'NEST 3.10.0 memory spike recorder to stable spike raster',
      sourceSystem: 'NEST Simulator',
      admittedSourceVersions: ['3.10.0'],
      outputSkillId: 'neuro.spike_raster',
      implementation: {
        packageSubpath: 'cortexel/adapters/nest',
        exportName: 'nestSpikeRecorderToRaster',
        profile: NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5,
      },
      cli: {
        command: 'cortexel source adapt nest-spike-recorder <input|->',
        inputMediaType: 'application/json',
        outputMediaType: 'application/json',
        pipeExample:
          'cortexel source adapt nest-spike-recorder capture.json | cortexel render - --output figure.svg',
      },
      inputEnvelope: {
        type: 'object',
        requiredMembers: ['exportedStatus', 'options'],
        additionalMembers: false,
        exportedStatus: 'Exact detached plain-data projection of one NEST spike-recorder status.',
        options: 'Complete recorded sender universe plus the caller-retained capture authority.',
      },
      acceptanceBoundary: {
        adapter:
          'The adapter checks one exact revision-5 source-faithful clock profile with closed finite-stop and positive-infinity/capture-bounded branches, then authors the corresponding request.',
        request:
          'The CLI then runs the complete stable FigureRequest validation pipeline before emitting JSON.',
        rendering:
          'Pipe the emitted request to `cortexel render`; adapter success alone is never render authority.',
      },
      authority: [
        'The source digest binds the detached JSON-compatible status projection, not a live simulator process.',
        'The adapter-input digest additionally binds the normalized options and caller-declared capture authority.',
        'Revision 5 binds the exact LP64/int64/IEEE-binary64 time-build profile and reproduces NEST 3.10.0 Time::get_ms as rounded reciprocal followed by rounded multiplication.',
        'The exact positive-infinity projection token maps to a finite window ending at the declared successful-return capture time; it never relabels that time as recorder deactivation.',
        'The emitted configuredStop records the pinned NEST 3.10.0 profile constant exportedMs=DBL_MAX; the typed input sentinel asserts that projection revision 2 recognized that value, but this version-bound interpretation remains unauthenticated.',
        'Projection v2 with capture-authority profile v4 requires the caller to declare that the last advancing Simulate or Run ended exactly at captureTime and that status was projected before any further advance or mutation.',
        'Finite-stop and positive-infinity requests use capture-authority v3/v4 respectively and one domain-separated revision-5 input digest; historical v1/v2 authority fails with an explicit migration error.',
        'The complete sender universe, recorder history, wiring history, process scope, run id, and recorder id remain caller declarations.',
        'Events retain source order and multiplicity; the scientific view owns any scoped sorting or aggregation.',
      ],
      limitations: [
        'Only record_to=memory and time_in_steps=false are admitted.',
        'Only the exact declared NEST 3.10.0 LP64/int64/IEEE-binary64 time-build profile and conservative safe-integer clock subset are admitted.',
        'Only a single-process capture scope is admitted.',
        'Positive-infinity status must pass through projection revision 2, which emits the exact typed sentinel; raw DBL_MAX is rejected.',
        'The package does not import PyNEST, inspect a live simulation, or authenticate caller declarations.',
        'ASCII, screen, MPI, SIONlib, step-plus-offset clocks, non-LP64 builds, clocks outside the safe source-round-trippable subset, and every other stable NEST mapping remain unsupported by this adapter revision.',
        'Real-NEST conformance gate R049 remains external release evidence; packaged code is not certification.',
      ],
      examples: {
        positiveInfinity: NEST_SPIKE_RECORDER_POSITIVE_INFINITY_V5_EXAMPLE,
        finiteStop: NEST_SPIKE_RECORDER_FINITE_STOP_V5_EXAMPLE,
      },
      /** Prompt-budget compatibility field: the current branch remains directly copyable. */
      example: NEST_SPIKE_RECORDER_POSITIVE_INFINITY_V5_EXAMPLE,
    },
  },
} as const;

export const SOURCE_ADAPTER_CATALOG = freezeGenerated(SOURCE_ADAPTER_CATALOG_DATA);

export type SourceAdapterDescriptor = (typeof SOURCE_ADAPTER_CATALOG.adapters)[SourceAdapterId];

export function lookupSourceAdapter(value: string): SourceAdapterDescriptor | undefined {
  if (!isSourceAdapterId(value)) return undefined;
  return SOURCE_ADAPTER_CATALOG.adapters[value];
}

export const SOURCE_ADAPTER_CATALOG_DIGEST = canonicalDigest({
  domain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
  catalog: SOURCE_ADAPTER_CATALOG,
});
