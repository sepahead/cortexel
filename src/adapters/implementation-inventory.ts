/**
 * Closed inventory of stable-contract adapter implementations.
 *
 * Skill contracts separately describe a composite source profile's feasibility and
 * whether its normative mapping definition is complete. Neither fact says Cortexel
 * ships code for the mapping.
 * Generation compares every `packaged`/`source_only` adapter declaration against this
 * implementation-owned inventory so prose cannot turn a recipe into a callable. It
 * also requires each immutable `certificationRequirement` definition to agree exactly with
 * the release evidence ledger. Mutable gate status/evidence remains outside the
 * package contract so release authorization can add receipts without changing the
 * tested candidate's semantics.
 */
import { NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3 } from './nest/profile.js';

export const ADAPTER_IMPLEMENTATIONS_V1 = Object.freeze([
  Object.freeze({
    skillId: 'neuro.spike_raster',
    mappingId: 'nest-spike-recorder',
    implementationAvailability: 'packaged',
    packageCapability: 'cortexel/adapters/nest',
    exportName: 'nestSpikeRecorderToRaster',
    sourcePath: 'src/adapters/nest/recorders.ts',
    publicEntryPath: 'src/adapters/nest/index.ts',
    adapterProfile: NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3,
    certificationRequirement: Object.freeze({
      ledger: 'cortexel-release-evidence-ledger.v1',
      gate: Object.freeze({
        id: 'R049',
        section: 'Adapters and ecosystem',
        requirement:
          'NEST recorder adapters are tested against real supported NEST output and do not assume chronological events.',
        releaseBlocking: true,
      }),
      conformanceProfile: Object.freeze({
        registry: 'cortexel-adapter-conformance-profiles.v1',
        id: 'nest-spike-recorder.v3',
        digestAlgorithm:
          'cortexel_adapter_conformance_profile_rfc8785_sha256_v1',
        digest:
          'sha256:9bf23e63c51b23239cf0438fa770323b65d58cd29ff7d25ed5c7626a9e1f2be4',
      }),
    }),
  }),
] as const);

export type AdapterImplementationV1 = (typeof ADAPTER_IMPLEMENTATIONS_V1)[number];
