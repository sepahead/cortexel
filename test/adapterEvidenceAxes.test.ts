import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { ADAPTER_IMPLEMENTATIONS_V1 } from '../src/adapters/implementation-inventory.js';
import * as nestPublicAdapter from '../src/adapters/nest/index.js';
import * as nestRecorderImplementations from '../src/adapters/nest/recorders.js';
import { lookupSkillCatalogEntry } from '../src/generated/catalog.js';
import { validateLedger } from '../scripts/check-evidence-ledger.js';
import {
  deriveAdapterCertificationRequirementV1,
} from '../scripts/lib/adapter-certification.js';
import {
  adapterConformanceProfileDigestV1,
  resolveAdapterConformanceProfileV1,
} from '../scripts/lib/adapter-conformance-profile.js';
import { adapterSourceIdentityProblems } from '../scripts/lib/adapter-source-identity.js';
import { validateNestExampleAudit } from '../scripts/lib/nest-example-audit.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const readJson = (relative: string): JsonRecord =>
  JSON.parse(readFileSync(path.join(ROOT, relative), 'utf8')) as JsonRecord;
const skillSources = readdirSync(path.join(ROOT, 'contract/skills'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => readJson(`contract/skills/${name}`));

describe('adapter evidence axes', () => {
  it('keeps composite feasibility, definition, authority, and implementation states closed', () => {
    const meta = readJson('contract/meta/contract-source.schema.json');
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(meta);

    for (const skill of skillSources) {
      expect(validate(skill), skill.id).toBe(true);
      expect(
        lookupSkillCatalogEntry(String(skill.id))?.adapters,
        skill.id,
      ).toEqual(skill.adapters);

      const mappingIds = new Set<string>();
      for (const adapter of skill.adapters as JsonRecord[]) {
        const label = `${skill.id}/${adapter.mappingId}`;
        expect(mappingIds.has(adapter.mappingId), label).toBe(false);
        mappingIds.add(adapter.mappingId);
        expect(adapter, label).not.toHaveProperty('system');
        expect(adapter, label).not.toHaveProperty('mappingStatus');
        expect(adapter, label).not.toHaveProperty('certificationStatus');
        expect(adapter, label).not.toHaveProperty('certificationAuthority');

        const primarySources = adapter.sources.filter(
          ({ role }: JsonRecord) => role === 'primary',
        );
        expect(primarySources, label).toHaveLength(1);
        expect(
          new Set(adapter.sources.map(({ sourceId }: JsonRecord) => sourceId)).size,
          label,
        ).toBe(adapter.sources.length);
        for (const source of adapter.sources as JsonRecord[]) {
          expect(typeof source.notes, `${label}/${source.system}`).toBe('string');
          expect(source.notes.length, `${label}/${source.system}`).toBeGreaterThan(0);
        }

        expect(adapter.authorityRequirements, label).toBeNull();
        if (adapter.feasibilityStatus === 'assessed_infeasible') {
          expect(adapter.definitionStatus, label).toBe('not_applicable');
          expect(adapter.implementationAvailability, label).toBe('not_applicable');
        } else {
          expect(adapter.definitionStatus, label).toBe('not_specified');
        }
        if (adapter.feasibilityStatus === 'not_assessed') {
          expect(adapter.definitionStatus, label).toBe('not_specified');
          expect(adapter.implementationAvailability, label).toBe('not_implemented');
        }
        if (
          adapter.implementationAvailability === 'packaged' ||
          adapter.implementationAvailability === 'source_only'
        ) {
          expect(adapter.certificationRequirement, label).toBeDefined();
        } else {
          expect(adapter, label).not.toHaveProperty('certificationRequirement');
        }
      }
    }

    const oldFlatRecord = structuredClone(skillSources[0]);
    oldFlatRecord.adapters[0] = {
      system: oldFlatRecord.adapters[0].sources[0].system,
      status: 'supported',
      notes: oldFlatRecord.adapters[0].sources[0].notes,
    };
    expect(validate(oldFlatRecord)).toBe(false);

    const compositeBase = structuredClone(skillSources[0]);
    const noPrimary = structuredClone(compositeBase);
    noPrimary.adapters[0].sources[0].role = 'required_companion';
    expect(validate(noPrimary)).toBe(false);

    const twoPrimaries = structuredClone(compositeBase);
    twoPrimaries.adapters[0].sources.push({
      sourceId: 'synthetic-companion',
      system: 'synthetic.companion',
      role: 'primary',
      notes: 'Synthetic negative-control companion.',
    });
    expect(validate(twoPrimaries)).toBe(false);

    const infeasibleWithDefinition = structuredClone(compositeBase);
    infeasibleWithDefinition.adapters[0].feasibilityStatus = 'assessed_infeasible';
    infeasibleWithDefinition.adapters[0].definitionStatus = 'not_specified';
    expect(validate(infeasibleWithDefinition)).toBe(false);

    const notAssessedExecutable = structuredClone(compositeBase);
    notAssessedExecutable.adapters[0].feasibilityStatus = 'not_assessed';
    notAssessedExecutable.adapters[0].implementationAvailability = 'packaged';
    expect(validate(notAssessedExecutable)).toBe(false);
  }, 30_000);

  it('rejects duplicate source identities while admitting repeated system classes', () => {
    const connectionSource = skillSources.find(
      ({ id }) => id === 'network.connection_graph',
    );
    expect(connectionSource).toBeDefined();
    if (!connectionSource) return;
    const mapping = structuredClone(
      connectionSource.adapters.find(
        ({ mappingId }: JsonRecord) => mappingId === 'nest-getconnections',
      ),
    );
    expect(mapping).toBeDefined();
    if (!mapping) return;
    expect(mapping.sources.length).toBeGreaterThanOrEqual(2);

    mapping.sources[1].system = mapping.sources[0].system;
    expect(adapterSourceIdentityProblems(mapping)).toEqual([]);

    mapping.sources[1].sourceId = mapping.sources[0].sourceId;
    expect(adapterSourceIdentityProblems(mapping)).toEqual([
      expect.stringContaining(
        `sources[1]: duplicate sourceId "${mapping.sources[0].sourceId}"`,
      ),
    ]);
  });

  it('reserves specified mappings and non-null authority until a closed definition authority exists', () => {
    const meta = readJson('contract/meta/contract-source.schema.json');
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(meta);
    const spikeRaster = skillSources.find(({ id }) => id === 'neuro.spike_raster');
    expect(spikeRaster).toBeDefined();
    if (!spikeRaster) return;
    const packagedAdapterIndex = spikeRaster.adapters.findIndex(
      ({ mappingId }: JsonRecord) => mappingId === 'nest-spike-recorder',
    );
    expect(packagedAdapterIndex).toBeGreaterThanOrEqual(0);
    if (packagedAdapterIndex < 0) return;

    const enumPromotion = structuredClone(spikeRaster);
    enumPromotion.adapters[packagedAdapterIndex].definitionStatus = 'specified';
    enumPromotion.adapters[packagedAdapterIndex].authorityRequirements = [];
    expect(validate(enumPromotion)).toBe(false);

    const pointersWithoutDefinition = structuredClone(spikeRaster);
    pointersWithoutDefinition.adapters[packagedAdapterIndex].authorityRequirements = [{
      id: 'synthetic_complete_sender_universe',
      provider: 'caller_declaration',
      targetRequestPaths: ['/data/recordedSenderIds'],
      rationale: 'A pointer list is not a normative mapping definition.',
    }];
    expect(validate(pointersWithoutDefinition)).toBe(false);

    const missingCertificationRequirement = structuredClone(spikeRaster);
    delete missingCertificationRequirement.adapters[packagedAdapterIndex]
      .certificationRequirement;
    expect(validate(missingCertificationRequirement)).toBe(false);

    const unimplementedAdapterIndex = spikeRaster.adapters.findIndex(
      ({ implementationAvailability }: JsonRecord) =>
        implementationAvailability === 'not_implemented',
    );
    expect(unimplementedAdapterIndex).toBeGreaterThanOrEqual(0);
    if (unimplementedAdapterIndex < 0) return;
    const forgedUnimplementedRequirement = structuredClone(spikeRaster);
    forgedUnimplementedRequirement.adapters[unimplementedAdapterIndex]
      .certificationRequirement =
      spikeRaster.adapters[packagedAdapterIndex].certificationRequirement;
    expect(validate(forgedUnimplementedRequirement)).toBe(false);
  }, 30_000);

  it('pins the exact ordered candidate-source roster for every NEST mapping', () => {
    const mappings: JsonRecord[] = skillSources.flatMap(({ id, adapters }) =>
      (adapters as JsonRecord[]).map((adapter): JsonRecord => ({ skillId: id, ...adapter })),
    );
    const sources = mappings.flatMap(({ sources }) => sources as JsonRecord[]);
    expect(mappings.length).toBeGreaterThan(0);
    expect(sources.length).toBeGreaterThanOrEqual(mappings.length);
    expect(
      mappings.filter(({ feasibilityStatus }) =>
        ['assessed_feasible', 'assessed_infeasible', 'not_assessed']
          .includes(feasibilityStatus)).length,
    ).toBe(mappings.length);
    expect(mappings.filter(({ definitionStatus }) =>
      definitionStatus === 'specified').map(({ skillId, mappingId }) =>
      `${skillId}/${mappingId}`)).toEqual([]);

    type SourceTuple = readonly [sourceId: string, system: string, role: string];
    const entry = (
      feasibilityStatus: string,
      implementationAvailability: string,
      sourceTuples: readonly SourceTuple[],
    ) => ({ status: [feasibilityStatus, implementationAvailability], sources: sourceTuples });
    const expected = {
      'network.adjacency_matrix/nest-getconnections': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getconnections', 'nest.GetConnections', 'primary'],
          ['nest-selected-node-universe', 'nest.NodeCollection', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'network.adjacency_matrix/nest-synapsecollection-mpi-target-rank-local': entry(
        'not_assessed', 'not_implemented', [
          ['nest-synapsecollection-mpi-target-rank-local', 'nest.SynapseCollection (MPI, target-rank-local)', 'primary'],
          ['nest-selected-node-and-target-locality', 'nest.NodeCollection', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'network.connection_graph/nest-getconnections': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getconnections', 'nest.GetConnections', 'primary'],
          ['nest-selected-node-universe', 'nest.NodeCollection', 'required_companion'],
          ['nest-getposition', 'nest.GetPosition', 'optional_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'network.degree_distribution/nest-getconnections': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getconnections', 'nest.GetConnections', 'primary'],
          ['nest-nodecollection', 'nest.NodeCollection', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'network.delay_distribution/nest-getconnections': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getconnections', 'nest.GetConnections', 'primary'],
          ['nest-selected-endpoints-and-target-locality', 'nest.NodeCollection', 'required_companion'],
          ['nest-synapse-model-defaults', 'nest.GetDefaults(synapse_model)', 'required_companion'],
          ['host-nest-runtime-identity', 'host-retained NEST runtime identity', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'network.delay_matrix/nest-getconnections': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getconnections', 'nest.GetConnections', 'primary'],
          ['nest-selected-node-and-target-locality', 'nest.NodeCollection', 'required_companion'],
          ['nest-synapse-model-defaults', 'nest.GetDefaults(synapse_model)', 'required_companion'],
          ['host-nest-runtime-identity', 'host-retained NEST runtime identity', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'network.spatial_map_2d/nest-getposition': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getposition', 'nest.GetPosition', 'primary'],
          ['nest-getconnections', 'nest.GetConnections', 'optional_companion'],
          ['host-nest-position-snapshot-declaration', 'host-retained NEST position snapshot declaration', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'optional_companion'],
        ]),
      'network.synaptic_weight_trace/nest-weight-recorder': entry(
        'not_assessed', 'not_implemented', [
          ['nest-weight-recorder', 'nest.weight_recorder', 'primary'],
          ['nest-weight-recorder-connection-inventory', 'nest.SynapseCollection post-prepare inventory', 'required_companion'],
          ['host-nest-weight-recorder-context', 'host-retained NEST recorder/runtime declaration', 'required_companion'],
        ]),
      'network.synaptic_weight_trace/nest-getconnections-polling': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getconnections-polling', 'nest.GetConnections polling', 'primary'],
          ['host-nest-weight-polling-receipt', 'host-retained NEST weight-polling receipt', 'required_companion'],
        ]),
      'network.weight_distribution/nest-getconnections': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getconnections', 'nest.GetConnections', 'primary'],
          ['nest-source-nodecollection', 'nest.NodeCollection', 'required_companion'],
          ['nest-target-nodecollection', 'nest.NodeCollection', 'required_companion'],
          ['nest-synapse-defaults', 'nest.synapse_defaults', 'required_companion'],
          ['host-nest-weight-semantics', 'host-retained NEST synapse/postsynaptic model semantics', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'network.weight_matrix/nest-synapsecollection': entry(
        'not_assessed', 'not_implemented', [
          ['nest-synapsecollection', 'nest.SynapseCollection', 'primary'],
          ['nest-selected-node-universe', 'nest.NodeCollection', 'required_companion'],
          ['host-nest-weight-semantics', 'host-retained NEST synapse/postsynaptic model semantics', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'network.weight_matrix/nest-getconnections-under-mpi-target-rank-local': entry(
        'not_assessed', 'not_implemented', [
          ['nest-getconnections-under-mpi-target-rank-local', 'nest.GetConnections under MPI (target-rank-local)', 'primary'],
          ['nest-selected-node-and-target-locality', 'nest.NodeCollection', 'required_companion'],
          ['host-nest-weight-semantics', 'host-retained NEST synapse/postsynaptic model semantics', 'required_companion'],
          ['host-nest-connection-snapshot-receipt', 'host-retained NEST connection snapshot receipt', 'required_companion'],
        ]),
      'neuro.analog_trace/nest-multimeter': entry(
        'not_assessed', 'not_implemented', [
          ['nest-multimeter', 'nest.multimeter', 'primary'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
          ['host-nest-recordable-semantics', 'host-retained NEST recordable semantics', 'required_companion'],
        ]),
      'neuro.compartment_trace/nest-multimeter-cm-default': entry(
        'not_assessed', 'not_implemented', [
          ['nest-multimeter-cm-default', 'nest.multimeter.cm_default', 'primary'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
          ['host-nest-compartment-model-semantics', 'host-retained NEST compartment/model semantics', 'required_companion'],
        ]),
      'neuro.correlogram/nest-spike-recorder': entry(
        'not_assessed', 'not_implemented', [
          ['nest-spike-recorder', 'nest.spike_recorder', 'primary'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
        ]),
      'neuro.correlogram/nest-correlation-detector': entry(
        'not_assessed', 'not_implemented', [
          ['nest-correlation-detector', 'nest.correlation_detector', 'primary'],
          ['host-nest-correlation-configuration', 'host-retained NEST correlation configuration', 'required_companion'],
        ]),
      'neuro.isi_distribution/nest-spike-recorder': entry(
        'not_assessed', 'not_implemented', [
          ['nest-spike-recorder', 'nest.spike_recorder', 'primary'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
        ]),
      'neuro.multisignal_trace/nest-multimeter': entry(
        'not_assessed', 'not_implemented', [
          ['nest-multimeter', 'nest.multimeter', 'primary'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
          ['host-nest-recordable-semantics', 'host-retained NEST recordable semantics', 'required_companion'],
        ]),
      'neuro.multisignal_trace/nest-astrocyte-ip3-ca': entry(
        'not_assessed', 'not_implemented', [
          ['nest-astrocyte-multimeter', 'nest.multimeter', 'primary'],
          ['nest-astrocyte-model-semantics', 'nest.astrocyte_lr_1994', 'required_companion'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
        ]),
      'neuro.multisignal_trace/nest-astrocyte-tripartite': entry(
        'not_assessed', 'not_implemented', [
          ['nest-tripartite-astrocyte-multimeter', 'nest.multimeter', 'primary'],
          ['nest-tripartite-neuron-multimeter', 'nest.multimeter', 'required_companion'],
          ['nest-tripartite-astrocyte-model-semantics', 'nest.astrocyte_lr_1994', 'required_companion'],
          ['host-nest-tripartite-neuron-model-semantics', 'host-retained NEST neuron model semantics', 'required_companion'],
          ['host-nest-shared-recorder-export-declaration', 'host-retained NEST shared-recorder export declaration', 'required_companion'],
        ]),
      'neuro.phase_plane/nest-multimeter': entry(
        'not_assessed', 'not_implemented', [
          ['nest-multimeter', 'nest.multimeter', 'primary'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
          ['host-nest-state-variable-model-semantics', 'host-retained NEST state-variable/model semantics', 'required_companion'],
        ]),
      'neuro.population_rate/nest-spike-recorder': entry(
        'not_assessed', 'not_implemented', [
          ['nest-spike-recorder', 'nest.spike_recorder', 'primary'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
        ]),
      'neuro.psth/nest-spike-recorder': entry(
        'not_assessed', 'not_implemented', [
          ['nest-spike-recorder', 'nest.spike_recorder', 'primary'],
          ['host-nest-trial-alignment-protocol', 'host-retained NEST trial and alignment protocol', 'required_companion'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
        ]),
      'neuro.response_curve/nest-spike-recorder': entry(
        'not_assessed', 'not_implemented', [
          ['nest-spike-recorder', 'nest.spike_recorder', 'primary'],
          ['host-nest-sweep-protocol', 'host-retained NEST sweep protocol', 'required_companion'],
          ['host-nest-recorder-export-declaration', 'host-retained NEST recorder export declaration', 'required_companion'],
        ]),
      'neuro.spike_raster/nest-spike-recorder': entry(
        'assessed_feasible', 'packaged', [
          ['nest-spike-recorder', 'nest.spike_recorder', 'primary'],
          ['host-nest-runtime-declaration', 'host-declared NEST runtime profile', 'required_companion'],
          ['host-nest-recorder-export-declaration', 'host-declared NEST recorder export context', 'required_companion'],
        ]),
    };
    const actual = Object.fromEntries(
      mappings
        .filter(({ mappingId }) =>
          typeof mappingId === 'string' && mappingId.startsWith('nest-'))
        .map(({ skillId, mappingId, feasibilityStatus, implementationAvailability, sources }) => [
          `${skillId}/${mappingId}`,
          entry(
            feasibilityStatus,
            implementationAvailability,
            (sources as JsonRecord[]).map(({ sourceId, system, role }) =>
              [sourceId, system, role] as const),
          ),
        ]),
    );
    expect(actual).toEqual(expected);

    // Negative controls prove that deletion, insertion, and source-order drift do
    // not pass through a permissive subset matcher.
    const deleted = structuredClone(actual);
    delete deleted['neuro.spike_raster/nest-spike-recorder'];
    expect(deleted).not.toEqual(expected);
    const inserted = structuredClone(actual);
    inserted['synthetic/nest-unreviewed'] = entry('not_assessed', 'not_implemented', [
      ['nest-unreviewed', 'nest.unreviewed', 'primary'],
    ]);
    expect(inserted).not.toEqual(expected);
    const reordered: JsonRecord = structuredClone(actual);
    const reorderedGraph = reordered[
      'network.connection_graph/nest-getconnections'
    ] as JsonRecord;
    reorderedGraph.sources = [...(reorderedGraph.sources as SourceTuple[])].reverse();
    expect(reordered).not.toEqual(expected);
  });

  it('admits exactly the implementation-owned packaged mapping', () => {
    const executableClaims = skillSources.flatMap((skill) =>
      (skill.adapters as JsonRecord[])
        .filter(({ implementationAvailability }) =>
          implementationAvailability === 'packaged' ||
          implementationAvailability === 'source_only')
        .map((adapter) => ({
          skillId: skill.id,
          mappingId: adapter.mappingId,
          implementationAvailability: adapter.implementationAvailability,
          certificationGate: adapter.certificationRequirement?.gate?.id,
        })));
    const implementationClaims = ADAPTER_IMPLEMENTATIONS_V1.map((entry) => ({
      skillId: entry.skillId,
      mappingId: entry.mappingId,
      implementationAvailability: entry.implementationAvailability,
      certificationGate: entry.certificationRequirement.gate.id,
    }));

    expect(executableClaims).toEqual(implementationClaims);
    expect(implementationClaims).toEqual([
      {
        skillId: 'neuro.spike_raster',
        mappingId: 'nest-spike-recorder',
        implementationAvailability: 'packaged',
        certificationGate: 'R049',
      },
    ]);
    const packaged = skillSources
      .find(({ id }) => id === 'neuro.spike_raster')
      ?.adapters.find(({ mappingId }: JsonRecord) => mappingId === 'nest-spike-recorder');
    expect(packaged).toMatchObject({
      feasibilityStatus: 'assessed_feasible',
      definitionStatus: 'not_specified',
      authorityRequirements: null,
      implementationAvailability: 'packaged',
    });
  });

  it('binds every implementation to its immutable release-gate definition', () => {
    const ledger = readJson('docs/release/evidence-ledger.v1.json') as {
      gates: Array<JsonRecord>;
    };
    const gatesById = new Map(ledger.gates.map((gate) => [gate.id, gate]));
    expect(gatesById.size).toBe(ledger.gates.length);

    const spikeRaster = skillSources.find(({ id }) => id === 'neuro.spike_raster');
    const packagedAdapter = spikeRaster?.adapters.find(
      ({ implementationAvailability }: JsonRecord) =>
        implementationAvailability === 'packaged',
    );
    const gate = gatesById.get('R049');
    expect(gate?.status).toBe('NOT_RUN');
    expect(packagedAdapter?.certificationRequirement).toEqual({
      ledger: 'cortexel-release-evidence-ledger.v1',
      gate: {
        id: gate?.id,
        section: gate?.section,
        requirement: gate?.requirement,
        releaseBlocking: gate?.releaseBlocking,
      },
      conformanceProfile:
        ADAPTER_IMPLEMENTATIONS_V1[0].certificationRequirement
          .conformanceProfile,
    });
    expect(packagedAdapter).not.toHaveProperty('certificationStatus');
    expect(packagedAdapter).not.toHaveProperty('receipt');
  });

  it('validates and recomputes the domain-separated conformance-profile identity', () => {
    const registry = readJson(
      'contract/registries/adapter-conformance-profiles.v1.json',
    );
    const schema = readJson(
      'contract/meta/adapter-conformance-profiles.schema.json',
    );
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
    expect(validate(registry), JSON.stringify(validate.errors)).toBe(true);

    const identity =
      ADAPTER_IMPLEMENTATIONS_V1[0].certificationRequirement
        .conformanceProfile;
    const projection = resolveAdapterConformanceProfileV1(identity, registry);
    expect(projection.problems).toEqual([]);
    expect(projection.profile?.id).toBe(identity.id);
    expect(
      adapterConformanceProfileDigestV1(projection.profile!),
    ).toBe(identity.digest);

    const drifted = structuredClone(registry);
    drifted.profiles[0].positiveCases.push(
      'synthetic unreviewed profile mutation',
    );
    expect(
      resolveAdapterConformanceProfileV1(identity, drifted).problems,
    ).toEqual([
      expect.stringContaining('digest mismatch'),
    ]);

    const duplicated = structuredClone(registry);
    duplicated.profiles.push(structuredClone(duplicated.profiles[0]));
    expect(
      resolveAdapterConformanceProfileV1(identity, duplicated).problems,
    ).toContainEqual(expect.stringContaining('duplicate id'));
  });

  it('binds every implementation record to exact executable source and public exports', () => {
    const namespaces = new Map<string, Record<string, unknown>>([
      ['src/adapters/nest/recorders.ts', nestRecorderImplementations],
      ['src/adapters/nest/index.ts', nestPublicAdapter],
    ]);
    const expectedCallableByNamespace = new Map<string, string[]>();

    for (const implementation of ADAPTER_IMPLEMENTATIONS_V1) {
      const source = namespaces.get(implementation.sourcePath);
      const publicEntry = namespaces.get(implementation.publicEntryPath);
      expect(source, implementation.sourcePath).toBeDefined();
      expect(publicEntry, implementation.publicEntryPath).toBeDefined();
      if (!source || !publicEntry) continue;

      expect(Object.hasOwn(source, implementation.exportName)).toBe(true);
      expect(Object.hasOwn(publicEntry, implementation.exportName)).toBe(true);
      expect(typeof source[implementation.exportName]).toBe('function');
      expect(publicEntry[implementation.exportName]).toBe(source[implementation.exportName]);

      for (const namespacePath of [
        implementation.sourcePath,
        implementation.publicEntryPath,
      ]) {
        const names = expectedCallableByNamespace.get(namespacePath) ?? [];
        names.push(implementation.exportName);
        expectedCallableByNamespace.set(namespacePath, names);
      }
    }

    for (const [namespacePath, namespace] of namespaces) {
      const actualCallables = Object.entries(namespace)
        .filter(([, value]) => typeof value === 'function')
        .map(([name]) => name)
        .sort();
      const expectedCallables = [...new Set(expectedCallableByNamespace.get(namespacePath) ?? [])]
        .sort();
      expect(actualCallables, `${namespacePath} executable export inventory`).toEqual(
        expectedCallables,
      );
    }
  });

  it('projects the exact axes into the manifest rather than dropping them', () => {
    const manifest = readJson('contract/manifest.v1.json');
    const manifestSkills = new Map(
      (manifest.stableSkills as JsonRecord[]).map((skill) => [skill.id, skill]),
    );

    for (const source of skillSources) {
      expect(manifestSkills.get(source.id)?.adapters, source.id).toEqual(source.adapters);
    }
  });
});

describe('adapter certification requirement', () => {
  const implementation = ADAPTER_IMPLEMENTATIONS_V1[0];
  const ledger = readJson('docs/release/evidence-ledger.v1.json');
  const ledgerSchema = readJson('docs/release/evidence-ledger.schema.json');
  const baseGate = (ledger.gates as JsonRecord[]).find(({ id }) => id === 'R049');

  it('binds the exact immutable gate definition and no mutable evidence', () => {
    const projected = deriveAdapterCertificationRequirementV1(implementation, baseGate);
    expect(projected.problems).toEqual([]);
    expect(projected.requirement).toEqual(implementation.certificationRequirement);
    expect(projected.requirement).not.toHaveProperty('status');
    expect(projected.requirement).not.toHaveProperty('evidence');
    expect(projected.requirement).not.toHaveProperty('receipt');
  });

  it('rejects a missing or definition-drifted gate', () => {
    expect(
      deriveAdapterCertificationRequirementV1(implementation, undefined).problems,
    ).toEqual([
      'neuro.spike_raster/nest-spike-recorder: certification gate R049 is missing',
    ]);

    expect(
      deriveAdapterCertificationRequirementV1(
        implementation,
        { ...baseGate, requirement: `${String(baseGate?.requirement)} drift` },
      ).problems,
    ).toEqual([
      'neuro.spike_raster/nest-spike-recorder: certification gate R049 does not exactly match the immutable implementation requirement',
    ]);
  });

  it('keeps the semantic projection unchanged across a valid NOT_RUN to PASS authorization', () => {
    expect(baseGate?.status).toBe('NOT_RUN');
    const passingLedger = structuredClone(ledger);
    const passingGate = (passingLedger.gates as JsonRecord[])
      .find(({ id }) => id === 'R049');
    expect(passingGate).toBeDefined();
    if (!passingGate || !baseGate) return;
    passingGate.status = 'PASS';
    passingGate.evidence = {
      command: 'bun run test:adapter-evidence',
      exitCode: 0,
      toolchain: 'synthetic pinned test toolchain',
      sourceCommit: '1'.repeat(40),
      reviewedAt: '2026-07-30T00:00:00Z',
      receipt: 'docs/release/evidence/1.0.0/R049.json',
      artifactDigest: `sha256:${'a'.repeat(64)}`,
    };
    expect(validateLedger(passingLedger, ledgerSchema).errors).toEqual([]);

    const before = deriveAdapterCertificationRequirementV1(
      implementation,
      baseGate,
    );
    const after = deriveAdapterCertificationRequirementV1(
      implementation,
      passingGate,
    );
    expect(after.problems).toEqual([]);
    expect(after.requirement).toEqual(before.requirement);
    expect(JSON.stringify(after.requirement)).toBe(JSON.stringify(before.requirement));
  });
});

describe('pinned NEST official-example coverage ledger', () => {
  it('validates an external zero-claim skeleton against the pinned v3.10 identity', () => {
    const schema = readJson('docs/audit/nest-example-coverage.schema.json');
    const source = readJson('docs/audit/nest-example-coverage.v1.json');

    expect(validateNestExampleAudit(source, schema)).toEqual([]);
    expect(source.version).toBe('0.1-draft');
    expect(source.upstream).toMatchObject({
      release: 'v3.10',
      commit: 'acca9704da248750219a027db99fec6cd1f9052a',
      rootTreeGitSha1: '7f6f4f0407c4000cded433b86d658191dd82cd79',
      documentationIndexPath: 'doc/htmldoc/examples/index.rst',
      orchestrationCmakePath: 'pynest/examples/CMakeLists.txt',
      orchestrationCmakeRole: 'installs_run_examples_shell_only_not_entrypoint_authority',
      exampleTreePath: 'pynest/examples',
    });
    expect(source.sourceUniverse).toMatchObject({
      pythonPathEntryCount: 112,
      regularPythonFileCount: 109,
      pythonSymlinkCount: 3,
      regularExecutablePythonFileCount: 13,
      regularNonExecutablePythonFileCount: 96,
      repositoryRecursiveTreeApiEntryCount: 1972,
      repositoryRecursiveTreeApiEntryKinds: 'trees_and_blobs',
      repositoryLeafEntryCount: 1835,
      repositoryRecursiveTreeApiResponseTruncated: false,
      pythonPathInventoryStatus: 'count_only',
      officialEntrypointInventoryStatus: 'not_inventoried',
      documentationIndexDirectiveOccurrences: {
        doc: 94,
        imgTop: 33,
      },
      documentationIndexNormalizationStatus: 'not_inventoried',
      visualAssetPathEntryCount: 12,
      visualAssetCountsByExtension: {
        png: 9,
        gif: 2,
        svg: 1,
      },
      visualAssetInventoryStatus: 'count_only',
    });
    expect(source.reservedAssessmentModel).toMatchObject({
      status: 'not_defined',
    });
    expect(source.assessments).toEqual([]);
    expect(source.summary).toMatchObject({
      classifiedPathCount: 0,
      classifiedOfficialEntrypointCount: 0,
      inventoriedVisualOutputCount: 0,
      mappedVisualOutputCount: 0,
      executableVisualOutputCount: 0,
      renderedVisualOutputCount: 0,
      upstreamExecutedVisualOutputCount: 0,
      certifiedVisualOutputCount: 0,
      coverageClaim: 'none',
    });
    expect(
      Object.fromEntries(
        (source.layers as JsonRecord[]).map(({ id, state }) => [id, state]),
      ),
    ).toEqual({
      upstream_source_inventory: 'partial',
      visual_output_inventory: 'not_assessed',
      stable_contract_mapping: 'not_assessed',
      packaged_adapter_implementation: 'partial',
      renderer_coverage: 'not_assessed',
      upstream_execution: 'not_run',
      scientific_certification: 'not_run',
    });

    const movingCommit = structuredClone(source);
    movingCommit.upstream.commit = 'main';
    expect(validateNestExampleAudit(movingCommit, schema).length).toBeGreaterThan(0);

    const truncatedTree = structuredClone(source);
    truncatedTree.sourceUniverse.repositoryRecursiveTreeApiResponseTruncated = true;
    expect(validateNestExampleAudit(truncatedTree, schema).length).toBeGreaterThan(0);

    const falsePathCount = structuredClone(source);
    falsePathCount.sourceUniverse.regularPythonFileCount = 110;
    expect(validateNestExampleAudit(falsePathCount, schema).length).toBeGreaterThan(0);

    const falseLayerState = structuredClone(source);
    falseLayerState.layers.find(
      ({ id }: JsonRecord) => id === 'visual_output_inventory',
    ).state = 'inventoried';
    expect(validateNestExampleAudit(falseLayerState, schema).length).toBeGreaterThan(0);

    const duplicateLayerSet = structuredClone(source);
    duplicateLayerSet.layers = source.layers.map((layer: JsonRecord) => ({
      ...layer,
      id: 'upstream_source_inventory',
      state: 'partial',
    }));
    expect(validateNestExampleAudit(duplicateLayerSet, schema)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('duplicate NEST example audit layer id'),
      ]),
    );

    const inventedAssessment = structuredClone(source);
    inventedAssessment.assessments = [{ sourcePath: 'pynest/examples/invented.py' }];
    expect(validateNestExampleAudit(inventedAssessment, schema).length).toBeGreaterThan(0);

    const prematureCoverageClaim = structuredClone(source);
    prematureCoverageClaim.summary.coverageClaim = 'complete';
    expect(validateNestExampleAudit(prematureCoverageClaim, schema).length).toBeGreaterThan(0);

    const missingReservedModel = structuredClone(source);
    delete missingReservedModel.reservedAssessmentModel;
    expect(validateNestExampleAudit(missingReservedModel, schema).length).toBeGreaterThan(0);
  }, 30_000);

  it('keeps mutable audit state outside package semantics and identities', () => {
    const manifest = readJson('contract/manifest.v1.json');
    const generatedCatalog = readFileSync(
      path.join(ROOT, 'src/generated/catalog.ts'),
      'utf8',
    );
    const generatedPython = readFileSync(
      path.join(ROOT, 'python/src/cortexel/generated/catalog.py'),
      'utf8',
    );

    expect(manifest).not.toHaveProperty('nestOfficialExampleCoverage');
    expect(manifest.normativeSources).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: expect.stringContaining('nest-example-coverage') }),
    ]));
    expect(generatedCatalog).not.toContain('NEST_OFFICIAL_EXAMPLE_COVERAGE');
    expect(generatedPython).not.toContain('NEST_OFFICIAL_EXAMPLE_COVERAGE');
  });

  it('does not claim that live PyNEST integration moved to the Python reader', () => {
    const nestEntry = readFileSync(
      path.join(ROOT, 'src/adapters/nest/index.ts'),
      'utf8',
    );
    const pythonReadme = readFileSync(path.join(ROOT, 'python/README.md'), 'utf8');

    expect(nestEntry).not.toMatch(/lives in the Python package/iu);
    expect(nestEntry).toContain('does not currently run or import PyNEST');
    expect(pythonReadme).toContain(
      'The scientific adapters (Neo, Elephant, PyNWB, NEST) are not yet',
    );
  });
});
