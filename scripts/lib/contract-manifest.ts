/** One deterministic projection from normative contract sources to manifest v1. */

import { canonicalize } from '../../src/core/canonicalize.js';
import { sha256Digest } from '../../src/core/sha256.js';
import { canonicalizationEntryDigest } from './canonicalization-source.js';
import { resolveContractIdentitySource } from './identity-source.js';
import { compareNormativePathsUtf8 } from './normative-source-files.js';

type JsonRecord = Record<string, any>;

export interface ManifestSourceRecord {
  readonly path: string;
  readonly digest: string;
}

export interface ContractManifestInputs {
  readonly skills: readonly JsonRecord[];
  readonly capabilities: JsonRecord;
  readonly budgets: JsonRecord;
  readonly errorCodes: JsonRecord;
  readonly semanticValidators: JsonRecord;
  readonly numericPolicies: JsonRecord;
  readonly canonicalizations: JsonRecord;
  readonly disclosures: JsonRecord;
  readonly identity: JsonRecord;
  readonly normativeSources: readonly ManifestSourceRecord[];
}

function idCount(values: unknown, field: string): number {
  if (!Array.isArray(values)) return 0;
  return new Set(values.flatMap((value) =>
    value !== null && typeof value === 'object' && typeof (value as JsonRecord)[field] === 'string'
      ? [(value as JsonRecord)[field] as string]
      : [],
  )).size;
}

/**
 * Build every public manifest field from its owning source.
 *
 * The manifest itself is never an input. Both generation and package verification call
 * this function, so changing a title, schema pointer, count, capability projection, or
 * note in manifest.v1.json without changing its authority is detectable.
 */
export function buildContractManifest(inputs: ContractManifestInputs): JsonRecord {
  const contractIdentity = resolveContractIdentitySource(inputs.identity);
  const normativeSources = inputs.normativeSources
    .slice()
    .sort((left, right) => compareNormativePathsUtf8(left.path, right.path));
  const stableSkills = inputs.skills
    .filter((skill) => skill.status === 'stable')
    .slice()
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  const capabilityRecords = Array.isArray(inputs.capabilities.capabilities)
    ? inputs.capabilities.capabilities as JsonRecord[]
    : [];
  const capabilityById = new Map(
    capabilityRecords.flatMap((capability) =>
      typeof capability.id === 'string' ? [[capability.id, capability] as const] : []),
  );
  const stableCatalogView = stableSkills.map((skill) => ({
    id: skill.id,
    revision: skill.revision,
    renderer: skill.renderer,
  }));
  const contractDigest = sha256Digest(canonicalize(normativeSources as never));
  const catalogDigest = sha256Digest(canonicalize(stableCatalogView as never));
  const canonicalizationAlgorithms = Array.isArray(inputs.canonicalizations.algorithms)
    ? inputs.canonicalizations.algorithms as JsonRecord[]
    : [];
  const canonicalizationsWithDigests = {
    ...inputs.canonicalizations,
    algorithms: canonicalizationAlgorithms.map((algorithm) => ({
      ...algorithm,
      entryDigest: canonicalizationEntryDigest(algorithm),
    })),
  };

  return {
    manifest: 'cortexel-contract-manifest',
    manifestVersion: 1,
    requestContract: contractIdentity.request.value,
    artifactContract: contractIdentity.artifact.value,
    contractDigest,
    catalogDigest,
    stableSkillCount: stableSkills.length,
    capabilityAvailabilities: Object.keys(inputs.capabilities.availabilities ?? {}).sort(),
    stableSkills: stableSkills.map((skill) => {
      const capability = capabilityById.get(skill.id);
      if (!capability) throw new Error(`stable skill ${String(skill.id)} has no capability record`);
      return {
        id: skill.id,
        revision: skill.revision,
        title: skill.title,
        renderer: skill.renderer,
        availability: capability.availability,
        releaseReady: skill.releaseReady,
        canonicalQuestion: skill.purpose.canonicalQuestion,
        requestSchema: `contract/schemas/skills/${skill.id}.request.v1.schema.json`,
        uncertaintySupport: skill.science.uncertaintySupport,
        budgets: skill.budgets,
        disclosures: skill.disclosures,
        semanticValidators: skill.semanticValidators.map((validator: JsonRecord) => validator.id),
        evidence: skill.evidence,
        accessibility: skill.accessibility,
        outputAuthority: skill.outputAuthority,
        legacyIds: skill.migration.legacyIds,
      };
    }),
    capabilities: capabilityRecords.map((capability) => ({
      id: capability.id,
      kind: capability.kind,
      status: capability.status,
      availability: capability.availability,
    })),
    experimentalCapabilities: capabilityRecords
      .filter((capability) => capability.status === 'experimental')
      .map((capability) => ({
        id: capability.id,
        kind: capability.kind,
        availability: capability.availability,
        requiredPeers: capability.requiredPeers ?? [],
      })),
    removedCapabilities: capabilityRecords
      .filter((capability) => capability.status === 'removed')
      .map((capability) => ({
        id: capability.id,
        availability: capability.availability,
        replacement: capability.replacement ?? null,
      })),
    budgetProfiles: Array.isArray(inputs.budgets.profiles)
      ? inputs.budgets.profiles.map((profile: JsonRecord) => profile.id)
      : [],
    errorCodeCount: idCount(inputs.errorCodes.codes, 'code'),
    semanticValidatorCount: idCount(inputs.semanticValidators.validators, 'id'),
    numericPolicyCount: idCount(inputs.numericPolicies.policies, 'id'),
    numericPolicies: inputs.numericPolicies,
    canonicalizationCount: idCount(inputs.canonicalizations.algorithms, 'id'),
    canonicalizations: canonicalizationsWithDigests,
    disclosureRuleCount: idCount(inputs.disclosures.rules, 'id'),
    normativeSources,
    notes: [
      'GENERATED. Never edit by hand.',
      'contractDigest covers the canonicalized normative source set, excluding this file (it cannot contain its own hash) and excluding the conformance corpus (vectors test the contract; they are not the contract).',
      'catalogDigest covers the STABLE catalog only, so editing an experimental capability cannot change the stable identity.',
      'Capability status is contract maturity; availability independently states packaged, source-only, or unavailable. Neither field establishes release readiness.',
      'releaseReady is false for every skill: the pinned scientific reference environment has not been executed, so no external-oracle evidence exists yet.',
      'Authored skill.revision is an optional narrowing pin. Identity resolution refuses a mismatched pin before canonicalization; every accepted canonical request materializes the resolved installed revision at skill.revision, so omitted and explicit-current pins have identical canonical bytes and request digests.',
    ],
  };
}
