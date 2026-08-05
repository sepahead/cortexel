import { _ as isStableSkillId, a as CapabilityAvailability, f as SKILL_CATALOG, g as isCapabilityId, h as StableSkillId, i as CAPABILITY_IDS, m as SkillCatalogEntry, n as CAPABILITY_AVAILABILITIES, o as CapabilityCatalogEntry, p as STABLE_SKILL_IDS, r as CAPABILITY_CATALOG, s as CapabilityId, v as lookupCapabilityCatalogEntry, y as lookupSkillCatalogEntry } from "../catalog-Dp61sMhe.cjs";
import { i as CATALOG_DIGEST_DOMAIN, r as CATALOG_DIGEST } from "../identity-DZ0E0rUc.cjs";
//#region src/generated/authoring.d.ts
interface SkillAuthoringEntry {
  /** Complete structural request schema. Full Cortexel validation remains authoritative. */
  readonly requestSchema: Readonly<Record<string, unknown>>;
  /** Synthetic, copyable fixture selected normatively from the living conformance set. */
  readonly authoringExample: Readonly<Record<string, unknown>>;
}
/** Versioned Ajv compile profile bound by catalogDigest. */
declare const AUTHORING_SCHEMA_COMPILATION_PROFILE_V1: {
  id: string;
  dialect: string;
  engine: string;
  options: {
    strict: boolean;
    allErrors: boolean;
    coerceTypes: boolean;
    useDefaults: boolean;
    removeAdditional: boolean;
    allowUnionTypes: boolean;
    validateFormats: boolean;
    strictRequired: boolean;
    strictTypes: boolean;
  };
};
/** Shared offline resources required to compile every generated per-skill schema. */
declare const STABLE_CATALOG_SCHEMA_RESOURCES: readonly Readonly<Record<string, unknown>>[];
declare const SKILL_AUTHORING: Readonly<Record<StableSkillId, SkillAuthoringEntry>>;
//#endregion
//#region src/adapters/source-example.d.ts
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
declare const SOURCE_ADAPTER_EXAMPLE_PROTOCOL: "cortexel-source-adapter-example";
declare const SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION: 1;
declare const SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER: "cortexelSyntheticExampleGuard";
declare const SOURCE_ADAPTER_EXAMPLE_ACTION: "replace_with_caller_owned_capture_then_remove_guard_and_submit_input_template";
declare const SOURCE_ADAPTER_EXAMPLE_KIND: "synthetic_fixture";
declare const SOURCE_ADAPTER_EXAMPLE_EXECUTION: "template_only";
declare const SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS: "synthetic_unreplaced";
interface SourceAdapterInputTemplate {
  readonly exportedStatus: Readonly<Record<string, unknown>>;
  readonly options: Readonly<Record<string, unknown>>;
}
interface SourceAdapterExampleGuardV1 {
  readonly protocol: typeof SOURCE_ADAPTER_EXAMPLE_PROTOCOL;
  readonly protocolVersion: typeof SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION;
  readonly status: typeof SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS;
}
interface SourceAdapterExampleEnvelopeV1<Id extends string = string, Input extends SourceAdapterInputTemplate = SourceAdapterInputTemplate> {
  readonly protocol: typeof SOURCE_ADAPTER_EXAMPLE_PROTOCOL;
  readonly protocolVersion: typeof SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION;
  readonly adapter: {
    readonly id: Id;
    readonly revision: number;
  };
  readonly exampleKind: typeof SOURCE_ADAPTER_EXAMPLE_KIND;
  readonly execution: typeof SOURCE_ADAPTER_EXAMPLE_EXECUTION;
  readonly action: typeof SOURCE_ADAPTER_EXAMPLE_ACTION;
  readonly inputTemplate: {
    readonly exportedStatus: Input['exportedStatus'];
    readonly options: Input['options'] & {
      readonly [SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER]: SourceAdapterExampleGuardV1;
    };
  };
}
type ExampleEnvelopeClassification = {
  readonly kind: 'not_example';
} | {
  readonly kind: 'template_only';
} | {
  readonly kind: 'malformed_example';
};
/**
 * Classify the outer envelope without inspecting a single `inputTemplate`
 * member.  Raw CLI JSON has already crossed the duplicate-key-safe parser, so
 * exact own-key and primitive checks are sufficient here.
 */
declare function classifySourceAdapterExampleEnvelope(value: unknown): ExampleEnvelopeClassification;
/** True only for the exact nested guard Cortexel adds to its own fixtures. */
declare function isSourceAdapterExampleGuard(value: unknown): boolean;
//#endregion
//#region src/adapters/source-catalog.d.ts
/**
 * Closed discovery authority for executable source adapters.
 *
 * Skill contracts describe many candidate source mappings. Most are deliberately
 * `not_implemented`; that prose is not an executable registry. This module exposes only
 * adapters that the installed package can actually invoke. Its digest lets an agent bind
 * a cached discovery response to the exact descriptor bytes it used.
 */
declare const SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN = "cortexel-source-adapter-discovery-catalog.rfc8785-sha256.v2";
declare const SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN = "cortexel-source-adapter-descriptor.rfc8785-sha256.v1";
declare const SOURCE_ADAPTER_IDS: readonly ["nest-spike-recorder"];
type SourceAdapterId = (typeof SOURCE_ADAPTER_IDS)[number];
declare function isSourceAdapterId(value: unknown): value is SourceAdapterId;
declare const SOURCE_ADAPTER_CATALOG: {
  readonly protocol: "cortexel-source-adapter-catalog";
  readonly protocolVersion: 1;
  readonly adapters: {
    readonly 'nest-spike-recorder': {
      readonly id: "nest-spike-recorder";
      readonly revision: 5;
      readonly title: "NEST 3.10.0 memory spike recorder to stable spike raster";
      readonly sourceSystem: "NEST Simulator";
      readonly admittedSourceVersions: readonly ["3.10.0"];
      readonly outputSkillId: "neuro.spike_raster";
      readonly implementation: {
        readonly packageSubpath: "cortexel/adapters/nest";
        readonly exportName: "nestSpikeRecorderToRaster";
        readonly profile: Readonly<{
          readonly adapterRevision: 5;
          readonly nestVersion: "3.10.0";
          readonly upstreamSourceCommit: "acca9704da248750219a027db99fec6cd1f9052a";
          readonly inputDigestDomain: "cortexel.nest-spike-recorder-adapter-input.v5";
          readonly branches: Readonly<{
            finiteStop: Readonly<{
              stopKind: "finite";
              captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v3";
              recordTo: "memory";
              timeInSteps: false;
              statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1";
              executionScope: "single_process";
              eventBoundary: "(origin+start,origin+stop]";
              captureHorizon: "origin+stop_after_successful_return";
            }>;
            positiveInfinityCaptureBounded: Readonly<{
              stopKind: "nest_time_positive_infinity";
              captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v4";
              recordTo: "memory";
              timeInSteps: false;
              statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v2";
              executionScope: "single_process";
              eventBoundary: "(origin+start,capture]";
              captureHorizon: "capture_after_successful_advancing_return_before_further_advance_or_mutation";
            }>;
          }>;
          readonly timeBuildProfile: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1";
          readonly captureBoundary: "after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation";
          readonly positiveInfinityExportedMs: number;
        }>;
      };
      readonly cli: {
        readonly command: "cortexel source adapt nest-spike-recorder <input|->";
        readonly exampleCommand: "cortexel source example nest-spike-recorder > capture.template.json";
        readonly renderCommand: "cortexel source render nest-spike-recorder <input|-> --output figure.svg --format json";
        readonly inputMediaType: "application/json";
        readonly outputMediaType: "application/json";
        readonly pipeExample: "cortexel source adapt nest-spike-recorder capture.json | cortexel render - --output figure.svg --format json";
        readonly directRenderExample: "cortexel source render nest-spike-recorder capture.json --output figure.svg --format json";
      };
      readonly inputEnvelope: {
        readonly type: "object";
        readonly requiredMembers: readonly ["exportedStatus", "options"];
        readonly additionalMembers: false;
        readonly exportedStatus: "Exact detached plain-data projection of one NEST spike-recorder status.";
        readonly options: "Complete recorded sender universe plus the caller-retained capture authority.";
      };
      readonly acceptanceBoundary: {
        readonly example: "The shipped example is a known synthetic, versioned, template-only envelope. Both the outer envelope and its unchanged guarded input are deliberately non-executable; the caller must replace every value with a caller-owned capture before explicitly removing the guard and submitting only inputTemplate.";
        readonly adapter: "The adapter checks one exact revision-5 source-faithful clock profile with closed finite-stop and positive-infinity/capture-bounded branches, then authors the corresponding request.";
        readonly request: "The CLI then runs the complete stable FigureRequest validation pipeline before emitting JSON.";
        readonly rendering: "`cortexel source render` applies the adapter, stable request gate, raw canonical-request boundary, derivation, render, and output-publication path in one process and is the recommended agent path. On success, the composable `source adapt | render` form produces the same canonical request, artifact, and SVG bytes. Ordinary shell pipelines can mask an upstream adapter failure unless the caller explicitly checks every pipeline status. Adapter success alone is never render authority.";
      };
      readonly authority: readonly ["The source digest binds the detached JSON-compatible status projection, not a live simulator process.", "The adapter-input digest additionally binds the normalized options and caller-declared capture authority.", "Revision 5 binds the exact LP64/int64/IEEE-binary64 time-build profile and reproduces NEST 3.10.0 Time::get_ms as rounded reciprocal followed by rounded multiplication.", "The exact positive-infinity projection token maps to a finite window ending at the declared successful-return capture time; it never relabels that time as recorder deactivation.", "The emitted configuredStop records the pinned NEST 3.10.0 profile constant exportedMs=DBL_MAX; the typed input sentinel asserts that projection revision 2 recognized that value, but this version-bound interpretation remains unauthenticated.", "Projection v2 with capture-authority profile v4 requires the caller to declare that the last advancing Simulate or Run ended exactly at captureTime and that status was projected before any further advance or mutation.", "Finite-stop and positive-infinity requests use capture-authority v3/v4 respectively and one domain-separated revision-5 input digest; historical v1/v2 authority fails with an explicit migration error.", "The complete sender universe, recorder history, wiring history, process scope, run id, and recorder id remain caller declarations.", "Events retain source order and multiplicity; the scientific view owns any scoped sorting or aggregation."];
      readonly limitations: readonly ["Only record_to=memory and time_in_steps=false are admitted.", "Only the exact declared NEST 3.10.0 LP64/int64/IEEE-binary64 time-build profile and conservative safe-integer clock subset are admitted.", "Only a single-process capture scope is admitted.", "Positive-infinity status must pass through projection revision 2, which emits the exact typed sentinel; raw DBL_MAX is rejected.", "The package does not import PyNEST, inspect a live simulation, or authenticate caller declarations.", "ASCII, screen, MPI, SIONlib, step-plus-offset clocks, non-LP64 builds, clocks outside the safe source-round-trippable subset, and every other stable NEST mapping remain unsupported by this adapter revision.", "Real-NEST conformance gate R049 remains external release evidence; packaged code is not certification.", "Removing the synthetic-example guard is only an explicit caller acknowledgement; Cortexel cannot verify that the caller actually replaced every fixture value."];
      readonly examples: {
        readonly positiveInfinity: SourceAdapterExampleEnvelopeV1<"nest-spike-recorder", {
          readonly exportedStatus: {
            readonly record_to: "memory";
            readonly time_in_steps: false;
            readonly origin: 0;
            readonly start: 0;
            readonly stop: {
              readonly kind: "nest_time_positive_infinity";
            };
            readonly n_events: 3;
            readonly events: {
              readonly senders: readonly [2, 1, 2];
              readonly times: readonly [9.9, 1, 1];
            };
          };
          readonly options: {
            readonly recordedSenderIds: readonly [1, 2, 3];
            readonly nestVersion: "3.10.0";
            readonly captureAuthority: {
              readonly kind: "replace_with_caller_declaration_from_actual_capture";
              readonly profile: "cortexel-nest-memory-spike-capture-authority.v4";
              readonly runtimeStatus: {
                readonly nestVersion: "3.10.0";
                readonly timeBuildProfile: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1";
                readonly statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v2";
                readonly executionScope: {
                  readonly kind: "single_process";
                  readonly numProcesses: 1;
                  readonly rank: 0;
                  readonly localNumThreads: 1;
                };
                readonly resolutionMs: 0.1;
                readonly ticsPerMs: "1000";
                readonly resolutionTics: "100";
                readonly captureBiologicalTimeTics: "10000";
                readonly captureBoundary: "after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation";
              };
              readonly recordingGrid: {
                readonly originTics: "0";
                readonly startTics: "0";
              };
              readonly bufferEpoch: {
                readonly beganBy: "recorder_creation";
                readonly beganAtBiologicalTimeTics: "0";
              };
              readonly recordingPlan: {
                readonly lastMutationAtBiologicalTimeTics: "0";
                readonly scope: "window_backend_time_encoding_and_sender_wiring";
                readonly senderUniverseBinding: "recorded_sender_ids_exactly_equal_full_window_connected_source_universe";
              };
              readonly clockEpochContinuity: "biological_time_monotonic_since_last_kernel_initialization";
              readonly eventCompleteness: "complete_for_recorded_senders";
            };
            readonly runId: "run-1";
            readonly recorderId: "spike-recorder-1";
          };
        }>;
        readonly finiteStop: SourceAdapterExampleEnvelopeV1<"nest-spike-recorder", {
          readonly exportedStatus: {
            readonly record_to: "memory";
            readonly time_in_steps: false;
            readonly origin: 0;
            readonly start: 0;
            readonly stop: 10;
            readonly n_events: 3;
            readonly events: {
              readonly senders: readonly [2, 1, 2];
              readonly times: readonly [9.9, 1, 1];
            };
          };
          readonly options: {
            readonly recordedSenderIds: readonly [1, 2, 3];
            readonly nestVersion: "3.10.0";
            readonly captureAuthority: {
              readonly kind: "replace_with_caller_declaration_from_actual_capture";
              readonly profile: "cortexel-nest-memory-spike-capture-authority.v3";
              readonly runtimeStatus: {
                readonly nestVersion: "3.10.0";
                readonly timeBuildProfile: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1";
                readonly statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1";
                readonly executionScope: {
                  readonly kind: "single_process";
                  readonly numProcesses: 1;
                  readonly rank: 0;
                  readonly localNumThreads: 1;
                };
                readonly resolutionMs: 0.1;
                readonly ticsPerMs: "1000";
                readonly resolutionTics: "100";
                readonly captureBiologicalTimeTics: "10000";
                readonly captureBoundary: "after_successful_simulate_or_run_return";
              };
              readonly recordingGrid: {
                readonly originTics: "0";
                readonly startTics: "0";
                readonly stopTics: "10000";
              };
              readonly bufferEpoch: {
                readonly beganBy: "recorder_creation";
                readonly beganAtBiologicalTimeTics: "0";
              };
              readonly recordingPlan: {
                readonly lastMutationAtBiologicalTimeTics: "0";
                readonly scope: "window_backend_time_encoding_and_sender_wiring";
                readonly senderUniverseBinding: "recorded_sender_ids_exactly_equal_full_window_connected_source_universe";
              };
              readonly clockEpochContinuity: "biological_time_monotonic_since_last_kernel_initialization";
              readonly eventCompleteness: "complete_for_recorded_senders";
            };
            readonly runId: "run-1";
            readonly recorderId: "spike-recorder-1";
          };
        }>;
      };
      /** Prompt-budget default: a synthetic, guarded template—not executable evidence. */
      readonly example: SourceAdapterExampleEnvelopeV1<"nest-spike-recorder", {
        readonly exportedStatus: {
          readonly record_to: "memory";
          readonly time_in_steps: false;
          readonly origin: 0;
          readonly start: 0;
          readonly stop: {
            readonly kind: "nest_time_positive_infinity";
          };
          readonly n_events: 3;
          readonly events: {
            readonly senders: readonly [2, 1, 2];
            readonly times: readonly [9.9, 1, 1];
          };
        };
        readonly options: {
          readonly recordedSenderIds: readonly [1, 2, 3];
          readonly nestVersion: "3.10.0";
          readonly captureAuthority: {
            readonly kind: "replace_with_caller_declaration_from_actual_capture";
            readonly profile: "cortexel-nest-memory-spike-capture-authority.v4";
            readonly runtimeStatus: {
              readonly nestVersion: "3.10.0";
              readonly timeBuildProfile: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1";
              readonly statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v2";
              readonly executionScope: {
                readonly kind: "single_process";
                readonly numProcesses: 1;
                readonly rank: 0;
                readonly localNumThreads: 1;
              };
              readonly resolutionMs: 0.1;
              readonly ticsPerMs: "1000";
              readonly resolutionTics: "100";
              readonly captureBiologicalTimeTics: "10000";
              readonly captureBoundary: "after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation";
            };
            readonly recordingGrid: {
              readonly originTics: "0";
              readonly startTics: "0";
            };
            readonly bufferEpoch: {
              readonly beganBy: "recorder_creation";
              readonly beganAtBiologicalTimeTics: "0";
            };
            readonly recordingPlan: {
              readonly lastMutationAtBiologicalTimeTics: "0";
              readonly scope: "window_backend_time_encoding_and_sender_wiring";
              readonly senderUniverseBinding: "recorded_sender_ids_exactly_equal_full_window_connected_source_universe";
            };
            readonly clockEpochContinuity: "biological_time_monotonic_since_last_kernel_initialization";
            readonly eventCompleteness: "complete_for_recorded_senders";
          };
          readonly runId: "run-1";
          readonly recorderId: "spike-recorder-1";
        };
      }>;
    };
  };
};
type SourceAdapterDescriptor = (typeof SOURCE_ADAPTER_CATALOG.adapters)[SourceAdapterId];
declare function lookupSourceAdapter(value: string): SourceAdapterDescriptor | undefined;
/** Digests bind the complete descriptor returned by `source describe`. */
declare const SOURCE_ADAPTER_DESCRIPTOR_DIGESTS: Readonly<Record<SourceAdapterId, string>>;
declare function lookupSourceAdapterDescriptorDigest(value: string): string | undefined;
/**
 * Compact executable discovery records. Each record binds its complete descriptor,
 * so catalog consumers need not download every example and authority paragraph merely
 * to discover an adapter, while `source describe` remains independently verifiable.
 */
declare const SOURCE_ADAPTER_DISCOVERY_CATALOG: {
  protocol: string;
  protocolVersion: number;
  adapters: {
    id: "nest-spike-recorder";
    revision: 5;
    title: "NEST 3.10.0 memory spike recorder to stable spike raster";
    sourceSystem: "NEST Simulator";
    admittedSourceVersions: readonly ["3.10.0"];
    outputSkillId: "neuro.spike_raster";
    command: "cortexel source adapt nest-spike-recorder <input|->";
    renderCommand: "cortexel source render nest-spike-recorder <input|-> --output figure.svg --format json";
    descriptorDigest: string;
  }[];
};
/** Exact, emitted digest preimage; no hidden package bytes are needed to reproduce it. */
declare const SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE: {
  domain: string;
  catalog: {
    protocol: string;
    protocolVersion: number;
    adapters: {
      id: "nest-spike-recorder";
      revision: 5;
      title: "NEST 3.10.0 memory spike recorder to stable spike raster";
      sourceSystem: "NEST Simulator";
      admittedSourceVersions: readonly ["3.10.0"];
      outputSkillId: "neuro.spike_raster";
      command: "cortexel source adapt nest-spike-recorder <input|->";
      renderCommand: "cortexel source render nest-spike-recorder <input|-> --output figure.svg --format json";
      descriptorDigest: string;
    }[];
  };
};
declare const SOURCE_ADAPTER_CATALOG_DIGEST: string;
//#endregion
export { AUTHORING_SCHEMA_COMPILATION_PROFILE_V1, CAPABILITY_AVAILABILITIES, CAPABILITY_CATALOG, CAPABILITY_IDS, CATALOG_DIGEST, CATALOG_DIGEST_DOMAIN, type CapabilityAvailability, type CapabilityCatalogEntry, type CapabilityId, SKILL_AUTHORING, SKILL_CATALOG, SOURCE_ADAPTER_CATALOG, SOURCE_ADAPTER_CATALOG_DIGEST, SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN, SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE, SOURCE_ADAPTER_DESCRIPTOR_DIGESTS, SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN, SOURCE_ADAPTER_DISCOVERY_CATALOG, SOURCE_ADAPTER_EXAMPLE_ACTION, SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER, SOURCE_ADAPTER_EXAMPLE_PROTOCOL, SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION, SOURCE_ADAPTER_IDS, STABLE_CATALOG_SCHEMA_RESOURCES, STABLE_SKILL_IDS, type SkillAuthoringEntry, type SkillCatalogEntry, type SourceAdapterDescriptor, type SourceAdapterExampleEnvelopeV1, type SourceAdapterExampleGuardV1, type SourceAdapterId, type SourceAdapterInputTemplate, type StableSkillId, classifySourceAdapterExampleEnvelope, isCapabilityId, isSourceAdapterExampleGuard, isSourceAdapterId, isStableSkillId, lookupCapabilityCatalogEntry, lookupSkillCatalogEntry, lookupSourceAdapter, lookupSourceAdapterDescriptorDigest };
