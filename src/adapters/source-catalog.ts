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
import { NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3 } from './nest/profile.js';

export const SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN =
  'cortexel-source-adapter-catalog.rfc8785-sha256.v1';

export const SOURCE_ADAPTER_IDS = Object.freeze([
  'nest-spike-recorder',
] as const);

export type SourceAdapterId = (typeof SOURCE_ADAPTER_IDS)[number];

const SOURCE_ADAPTER_ID_SET: ReadonlySet<string> = new Set(SOURCE_ADAPTER_IDS);

export function isSourceAdapterId(value: unknown): value is SourceAdapterId {
  return typeof value === 'string' && SOURCE_ADAPTER_ID_SET.has(value);
}

const NEST_SPIKE_RECORDER_EXAMPLE = {
  exportedStatus: {
    record_to: 'memory',
    time_in_steps: false,
    origin: 0,
    start: 0,
    stop: 10,
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
      profile: 'cortexel-nest-memory-spike-capture-authority.v1',
      runtimeStatus: {
        nestVersion: '3.10.0',
        statusReadMethod:
          'pynest_single_spike_recorder_get_status_plain_projection_v1',
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
      clockEpochContinuity:
        'biological_time_monotonic_since_last_kernel_initialization',
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
      revision: 3,
      title: 'NEST 3.10.0 memory spike recorder to stable spike raster',
      sourceSystem: 'NEST Simulator',
      admittedSourceVersions: ['3.10.0'],
      outputSkillId: 'neuro.spike_raster',
      implementation: {
        packageSubpath: 'cortexel/adapters/nest',
        exportName: 'nestSpikeRecorderToRaster',
        profile: NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3,
      },
      cli: {
        command:
          'cortexel source adapt nest-spike-recorder <input|->',
        inputMediaType: 'application/json',
        outputMediaType: 'application/json',
        pipeExample:
          'cortexel source adapt nest-spike-recorder capture.json | cortexel render - --output figure.svg',
      },
      inputEnvelope: {
        type: 'object',
        requiredMembers: ['exportedStatus', 'options'],
        additionalMembers: false,
        exportedStatus:
          'Exact detached plain-data projection of one NEST spike-recorder status.',
        options:
          'Complete recorded sender universe plus the caller-retained capture authority.',
      },
      acceptanceBoundary: {
        adapter:
          'The adapter checks its exact revision-3 source profile and authors a request.',
        request:
          'The CLI then runs the complete stable FigureRequest validation pipeline before emitting JSON.',
        rendering:
          'Pipe the emitted request to `cortexel render`; adapter success alone is never render authority.',
      },
      authority: [
        'The source digest binds the detached JSON-compatible status projection, not a live simulator process.',
        'The adapter-input digest additionally binds the normalized options and caller-declared capture authority.',
        'The complete sender universe, recorder history, wiring history, process scope, run id, and recorder id remain caller declarations.',
        'Events retain source order and multiplicity; the scientific view owns any scoped sorting or aggregation.',
      ],
      limitations: [
        'Only record_to=memory and time_in_steps=false are admitted.',
        'Only the exact declared NEST 3.10.0 profile is admitted.',
        'Only a single-process capture scope is admitted.',
        'The package does not import PyNEST, inspect a live simulation, or authenticate caller declarations.',
        'ASCII, screen, MPI, SIONlib, step-plus-offset clocks, and every other stable NEST mapping remain unsupported by this adapter revision.',
        'Real-NEST conformance gate R049 remains external release evidence; packaged code is not certification.',
      ],
      example: NEST_SPIKE_RECORDER_EXAMPLE,
    },
  },
} as const;

export const SOURCE_ADAPTER_CATALOG = freezeGenerated(SOURCE_ADAPTER_CATALOG_DATA);

export type SourceAdapterDescriptor =
  (typeof SOURCE_ADAPTER_CATALOG.adapters)[SourceAdapterId];

export function lookupSourceAdapter(
  value: string,
): SourceAdapterDescriptor | undefined {
  if (!isSourceAdapterId(value)) return undefined;
  return SOURCE_ADAPTER_CATALOG.adapters[value];
}

export const SOURCE_ADAPTER_CATALOG_DIGEST = canonicalDigest({
  domain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
  catalog: SOURCE_ADAPTER_CATALOG,
});
