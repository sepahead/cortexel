import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildContractManifest } from '../scripts/lib/contract-manifest.js';
import {
  contractIdentitySourceProblems,
  resolveContractIdentitySource,
} from '../scripts/lib/identity-source.js';
import { NORMATIVE_CONTRACT_INCLUDE_PATTERNS } from '../scripts/lib/normative-source-files.js';
import {
  ARTIFACT_CONTRACT_IDENTITY,
  REQUEST_CONTRACT_IDENTITY,
} from '../src/core/contract-identity.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (relative: string): JsonRecord => JSON.parse(
  readFileSync(path.join(ROOT, relative), 'utf8'),
) as JsonRecord;

const identity = read('contract/registries/identity.v1.json');
const consumers = {
  figureRequestSchema: read('contract/schemas/figure-request.v1.schema.json'),
  figureArtifactSchema: read('contract/schemas/figure-artifact.v1.schema.json'),
  errorCodes: read('contract/registries/error-codes.v1.json'),
  normativeSourceIncludes: NORMATIVE_CONTRACT_INCLUDE_PATTERNS,
  skills: readdirSync(path.join(ROOT, 'contract/skills'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => read(`contract/skills/${name}`)),
};

function minimalManifestInputs(registry: JsonRecord) {
  return {
    skills: [],
    capabilities: { capabilities: [], availabilities: {} },
    budgets: { profiles: [] },
    errorCodes: { codes: [] },
    semanticValidators: { validators: [] },
    numericPolicies: { policies: [] },
    canonicalizations: { algorithms: [] },
    disclosures: { rules: [] },
    identity: registry,
    normativeSources: [],
  };
}

describe('normative contract identity source', () => {
  it('closes the living schemas, examples, and repair metadata over both registry axes', () => {
    expect(resolveContractIdentitySource(identity)).toEqual({
      request: {
        id: 'requestContract',
        value: 'cortexel-figure-request/1.0',
        name: 'cortexel-figure-request',
        version: '1.0',
      },
      artifact: {
        id: 'artifactContract',
        value: 'cortexel-figure-artifact/1.0',
        name: 'cortexel-figure-artifact',
        version: '1.0',
      },
    });
    expect(contractIdentitySourceProblems(identity, consumers)).toEqual([]);
  });

  it('makes registry drift fail every authored consumer instead of silently changing only the digest', () => {
    const changed = structuredClone(identity);
    changed.axes.find((axis: JsonRecord) => axis.id === 'requestContract').value =
      'cortexel-figure-request/1.1';
    const problems = contractIdentitySourceProblems(changed, consumers).join('\n');
    expect(problems).toContain('figure-request schema contract.version.enum');
    expect(problems).toContain('figure-artifact schema buildIdentity.requestContract.const');
    expect(problems).toContain('skill network.adjacency_matrix examples.valid[0].contract');
    expect(problems).toContain('error-codes CONTRACT_MISSING.correctiveAction');
  });

  it('compares exact JSON objects independent of member order while rejecting extras', () => {
    const source = structuredClone(consumers.skills[0]);
    source.examples.valid[0].contract = {
      version: source.examples.valid[0].contract.version,
      name: source.examples.valid[0].contract.name,
    };
    expect(contractIdentitySourceProblems(identity, { skills: [source] })).toEqual([]);

    source.examples.valid[0].contract.note = 'not part of the closed envelope identity';
    expect(contractIdentitySourceProblems(identity, { skills: [source] }).join('\n')).toContain(
      'examples.valid[0].contract',
    );

    const decorated = structuredClone(identity);
    const includes = decorated.digestSourceSet.include as string[] & { note?: string };
    includes.note = 'not JSON array data';
    expect(contractIdentitySourceProblems(decorated, consumers).join('\n')).toContain(
      'identity.digestSourceSet.include',
    );
  });

  it('rejects duplicate, absent, malformed, and conflated contract axes', () => {
    const duplicate = structuredClone(identity);
    duplicate.axes.push(structuredClone(
      duplicate.axes.find((axis: JsonRecord) => axis.id === 'requestContract'),
    ));
    expect(contractIdentitySourceProblems(duplicate).join('\n')).toContain(
      'duplicate axis "requestContract"',
    );

    const absent = structuredClone(identity);
    absent.axes = absent.axes.filter((axis: JsonRecord) => axis.id !== 'artifactContract');
    expect(contractIdentitySourceProblems(absent).join('\n')).toContain(
      'expected exactly one "artifactContract" axis',
    );

    const malformed = structuredClone(identity);
    malformed.axes.find((axis: JsonRecord) => axis.id === 'requestContract').value =
      'Cortexel Request/latest';
    expect(contractIdentitySourceProblems(malformed).join('\n')).toContain(
      'canonical lowercase contract-name/major.minor identity',
    );

    const conflated = structuredClone(identity);
    conflated.axes.find((axis: JsonRecord) => axis.id === 'artifactContract').value =
      'cortexel-figure-request/1.1';
    expect(contractIdentitySourceProblems(conflated).join('\n')).toContain(
      'requestContract and artifactContract names must be distinct',
    );
  });

  it('requires the closed eight-axis v1 identity vocabulary', () => {
    const expected = [
      'packageVersion',
      'requestContract',
      'artifactContract',
      'contractDigest',
      'catalogDigest',
      'skillRevision',
      'rendererRevision',
      'sourceRevision',
    ];
    expect(identity.axes.map((axis: JsonRecord) => axis.id)).toEqual(expected);
    for (const id of expected) {
      const deleted = structuredClone(identity);
      deleted.axes = deleted.axes.filter((axis: JsonRecord) => axis.id !== id);
      expect(contractIdentitySourceProblems(deleted).join('\n'), id).toContain(
        `missing required v1 axis ${JSON.stringify(id)}`,
      );
    }

    const extended = structuredClone(identity);
    extended.axes.push({ id: 'shadowDigest', meaning: 'ambiguous parallel identity' });
    expect(contractIdentitySourceProblems(extended).join('\n')).toContain(
      'unknown v1 axis "shadowDigest"',
    );
  });

  it('binds the registry-owned recursive source claim to the filesystem inventory', () => {
    expect(identity.digestSourceSet.include).toEqual(NORMATIVE_CONTRACT_INCLUDE_PATTERNS);
    const changed = structuredClone(identity);
    changed.digestSourceSet.include[2] = 'contract/schemas/*';
    expect(contractIdentitySourceProblems(changed, consumers).join('\n')).toContain(
      'identity.digestSourceSet.include',
    );
  });

  it('makes the digest algorithm and exclusions executable v1 policy', () => {
    const changedAlgorithm = structuredClone(identity);
    changedAlgorithm.digestSourceSet.algorithm[2] =
      'Sort entries however the local filesystem returns them.';
    expect(contractIdentitySourceProblems(changedAlgorithm).join('\n')).toContain(
      'identity.digestSourceSet.algorithm',
    );

    const deletedAlgorithmStep = structuredClone(identity);
    deletedAlgorithmStep.digestSourceSet.algorithm.pop();
    expect(contractIdentitySourceProblems(deletedAlgorithmStep).join('\n')).toContain(
      'identity.digestSourceSet.algorithm',
    );

    const weakenedExclusions = structuredClone(identity);
    weakenedExclusions.digestSourceSet.exclude = ['contract/**'];
    expect(contractIdentitySourceProblems(weakenedExclusions).join('\n')).toContain(
      'identity.digestSourceSet.exclude',
    );
  });

  it('derives manifest identities from the registry rather than a second literal', () => {
    const changed = structuredClone(identity);
    changed.axes.find((axis: JsonRecord) => axis.id === 'requestContract').value =
      'cortexel-figure-request/1.1';
    changed.axes.find((axis: JsonRecord) => axis.id === 'artifactContract').value =
      'cortexel-figure-artifact/1.2';
    const manifest = buildContractManifest(minimalManifestInputs(changed));
    expect(manifest.requestContract).toBe('cortexel-figure-request/1.1');
    expect(manifest.artifactContract).toBe('cortexel-figure-artifact/1.2');
  });

  it('normalizes the manifest source set in the declared UTF-8 path order', () => {
    const first = {
      ...minimalManifestInputs(identity),
      normativeSources: [
        { path: 'contract/registries/\u{10000}.json', digest: `sha256:${'1'.repeat(64)}` },
        { path: 'contract/registries/\ue000.json', digest: `sha256:${'2'.repeat(64)}` },
      ],
    };
    const forward = buildContractManifest(first);
    const reverse = buildContractManifest({
      ...first,
      normativeSources: [...first.normativeSources].reverse(),
    });
    expect(forward.normativeSources).toEqual([
      first.normativeSources[1],
      first.normativeSources[0],
    ]);
    expect(reverse.normativeSources).toEqual(forward.normativeSources);
    expect(reverse.contractDigest).toBe(forward.contractDigest);
  });

  it('derives every runtime contract name/version projection from generated identities', () => {
    expect(REQUEST_CONTRACT_IDENTITY).toEqual({
      value: 'cortexel-figure-request/1.0',
      name: 'cortexel-figure-request',
      version: '1.0',
    });
    expect(ARTIFACT_CONTRACT_IDENTITY).toEqual({
      value: 'cortexel-figure-artifact/1.0',
      name: 'cortexel-figure-artifact',
      version: '1.0',
    });
    for (const relative of [
      'src/core/request.ts',
      'src/core/migrate-v0.ts',
      'src/adapters/nest/recorders.ts',
      'src/render/buildFigure.ts',
      'src/render/svg.ts',
      'python/src/cortexel/validate.py',
    ]) {
      const source = readFileSync(path.join(ROOT, relative), 'utf8');
      expect(source, relative).not.toContain("'cortexel-figure-request'");
      expect(source, relative).not.toContain('"cortexel-figure-request"');
      expect(source, relative).not.toContain("'cortexel-figure-artifact'");
      expect(source, relative).not.toContain('"cortexel-figure-artifact"');
    }
  });

  it('keeps the clean-generator identity reader an import-free deterministic leaf', () => {
    const source = readFileSync(path.join(ROOT, 'scripts/lib/identity-source.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*import\b/gmu);
    expect(source).not.toMatch(/\brequire\s*\(/u);
    expect(source).not.toMatch(/process\.env|Date\.|Math\.random/u);
    const generator = readFileSync(path.join(ROOT, 'scripts/generate-contract.ts'), 'utf8');
    const manifest = readFileSync(path.join(ROOT, 'scripts/lib/contract-manifest.ts'), 'utf8');
    expect(generator).not.toContain("REQUEST_CONTRACT = 'cortexel-figure-request/1.0'");
    expect(generator).not.toContain('REQUEST_CONTRACT: str = "cortexel-figure-request/1.0"');
    expect(manifest).not.toContain("requestContract: 'cortexel-figure-request/1.0'");
  });
});
