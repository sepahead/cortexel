import { S as StableSkillId } from '../catalog-BjofKpmG.cjs';
export { a as SKILL_CATALOG, b as STABLE_SKILL_IDS, c as SkillCatalogEntry, i as isStableSkillId, l as lookupSkillCatalogEntry } from '../catalog-BjofKpmG.cjs';
export { C as CATALOG_DIGEST, a as CATALOG_DIGEST_DOMAIN } from '../identity-D5q7LYbI.cjs';
import '../errors-DUbFUu6n.cjs';

/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/skills/, contract/schemas/, and contract/registries/.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

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

/**
 * Closed discovery authority for executable source adapters.
 *
 * Skill contracts describe many candidate source mappings. Most are deliberately
 * `not_implemented`; that prose is not an executable registry. This module exposes only
 * adapters that the installed package can actually invoke. Its digest lets an agent bind
 * a cached discovery response to the exact descriptor bytes it used.
 */
declare const SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN = "cortexel-source-adapter-catalog.rfc8785-sha256.v1";
declare const SOURCE_ADAPTER_IDS: readonly ["nest-spike-recorder"];
type SourceAdapterId = (typeof SOURCE_ADAPTER_IDS)[number];
declare function isSourceAdapterId(value: unknown): value is SourceAdapterId;
declare const SOURCE_ADAPTER_CATALOG: {
    readonly protocol: "cortexel-source-adapter-catalog";
    readonly protocolVersion: 1;
    readonly adapters: {
        readonly 'nest-spike-recorder': {
            readonly id: "nest-spike-recorder";
            readonly revision: 3;
            readonly title: "NEST 3.10.0 memory spike recorder to stable spike raster";
            readonly sourceSystem: "NEST Simulator";
            readonly admittedSourceVersions: readonly ["3.10.0"];
            readonly outputSkillId: "neuro.spike_raster";
            readonly implementation: {
                readonly packageSubpath: "cortexel/adapters/nest";
                readonly exportName: "nestSpikeRecorderToRaster";
                readonly profile: Readonly<{
                    readonly adapterRevision: 3;
                    readonly nestVersion: "3.10.0";
                    readonly upstreamSourceCommit: "acca9704da248750219a027db99fec6cd1f9052a";
                    readonly inputDigestDomain: "cortexel.nest-spike-recorder-adapter-input.v3";
                    readonly captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v1";
                    readonly statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1";
                }>;
            };
            readonly cli: {
                readonly command: "cortexel source adapt nest-spike-recorder <input|->";
                readonly inputMediaType: "application/json";
                readonly outputMediaType: "application/json";
                readonly pipeExample: "cortexel source adapt nest-spike-recorder capture.json | cortexel render - --output figure.svg";
            };
            readonly inputEnvelope: {
                readonly type: "object";
                readonly requiredMembers: readonly ["exportedStatus", "options"];
                readonly additionalMembers: false;
                readonly exportedStatus: "Exact detached plain-data projection of one NEST spike-recorder status.";
                readonly options: "Complete recorded sender universe plus the caller-retained capture authority.";
            };
            readonly acceptanceBoundary: {
                readonly adapter: "The adapter checks its exact revision-3 source profile and authors a request.";
                readonly request: "The CLI then runs the complete stable FigureRequest validation pipeline before emitting JSON.";
                readonly rendering: "Pipe the emitted request to `cortexel render`; adapter success alone is never render authority.";
            };
            readonly authority: readonly ["The source digest binds the detached JSON-compatible status projection, not a live simulator process.", "The adapter-input digest additionally binds the normalized options and caller-declared capture authority.", "The complete sender universe, recorder history, wiring history, process scope, run id, and recorder id remain caller declarations.", "Events retain source order and multiplicity; the scientific view owns any scoped sorting or aggregation."];
            readonly limitations: readonly ["Only record_to=memory and time_in_steps=false are admitted.", "Only the exact declared NEST 3.10.0 profile is admitted.", "Only a single-process capture scope is admitted.", "The package does not import PyNEST, inspect a live simulation, or authenticate caller declarations.", "ASCII, screen, MPI, SIONlib, step-plus-offset clocks, and every other stable NEST mapping remain unsupported by this adapter revision.", "Real-NEST conformance gate R049 remains external release evidence; packaged code is not certification."];
            readonly example: {
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
                        readonly kind: "caller_declaration";
                        readonly profile: "cortexel-nest-memory-spike-capture-authority.v1";
                        readonly runtimeStatus: {
                            readonly nestVersion: "3.10.0";
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
            };
        };
    };
};
type SourceAdapterDescriptor = (typeof SOURCE_ADAPTER_CATALOG.adapters)[SourceAdapterId];
declare function lookupSourceAdapter(value: string): SourceAdapterDescriptor | undefined;
declare const SOURCE_ADAPTER_CATALOG_DIGEST: string;

export { AUTHORING_SCHEMA_COMPILATION_PROFILE_V1, SKILL_AUTHORING, SOURCE_ADAPTER_CATALOG, SOURCE_ADAPTER_CATALOG_DIGEST, SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN, SOURCE_ADAPTER_IDS, STABLE_CATALOG_SCHEMA_RESOURCES, type SkillAuthoringEntry, type SourceAdapterDescriptor, type SourceAdapterId, StableSkillId, isSourceAdapterId, lookupSourceAdapter };
