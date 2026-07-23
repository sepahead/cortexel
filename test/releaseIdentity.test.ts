import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  artifactReleaseStampingProblems,
  isCanonicalGregorianDate,
  isRfc3339Instant,
  npmSemVerToPep440,
  packageDistributionIdentityProblems,
  parseCitationReleaseMetadata,
  parseCitationVersion,
  parsePythonProjectMetadata,
  parseStrictSemVer,
  ReleaseMetadataParseError,
  releaseVerificationProblems,
  SUPPORTED_NODE_ENGINE_RANGE,
  type ReleaseVerificationInput,
} from '../scripts/lib/release-identity.js';
import { parseJsonSourceStrict } from '../scripts/lib/strict-json-source.js';
import {
  inspectGitReleaseState,
  inspectReleaseEvidenceSources,
  readDirectReleaseFile,
  verifyRepositoryRelease,
} from '../scripts/verify-release.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const HEAD = '1111111111111111111111111111111111111111';

const RELEASE_CAPABLE_ARTIFACT_SCHEMA = {
  type: 'object',
  properties: {
    buildIdentity: {
      type: 'object',
      properties: {
        packageVersion: { type: 'string' },
        requestContract: { const: 'cortexel-figure-request/1.0' },
        artifactContract: { const: 'cortexel-figure-artifact/1.0' },
        contractDigest: { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' },
        catalogDigest: { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' },
        release: { type: 'boolean' },
        sourceRevision: { type: 'string' },
      },
      oneOf: [
        {
          type: 'object',
          properties: {
            packageVersion: {
              type: 'string',
              pattern: '^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)$',
            },
            release: { const: true },
            sourceRevision: { type: 'string', pattern: '^[0-9a-f]{40}$' },
          },
          required: ['packageVersion', 'release', 'sourceRevision'],
        },
      ],
      required: [
        'packageVersion',
        'requestContract',
        'artifactContract',
        'contractDigest',
        'catalogDigest',
        'release',
        'sourceRevision',
      ],
      additionalProperties: false,
    },
  },
  required: ['buildIdentity'],
  additionalProperties: false,
};

const EXPECTED_RELEASE_BUILD_IDENTITY = Object.freeze({
  packageVersion: '0.10.0',
  requestContract: 'cortexel-figure-request/1.0',
  artifactContract: 'cortexel-figure-artifact/1.0',
  contractDigest: `sha256:${'a'.repeat(64)}`,
  catalogDigest: `sha256:${'b'.repeat(64)}`,
  sourceRevision: HEAD,
  release: true,
});

const RELEASE_SCHEMA_CONTEXT = Object.freeze({
  packageVersion: '0.10.0',
  sourceRevision: HEAD,
  expectedBuildIdentity: EXPECTED_RELEASE_BUILD_IDENTITY,
  artifactWitness: Object.freeze({ buildIdentity: EXPECTED_RELEASE_BUILD_IDENTITY }),
});

function finalRelease(
  overrides: Partial<ReleaseVerificationInput> = {},
): ReleaseVerificationInput {
  return {
    packageName: 'cortexel',
    packageVersion: '0.10.0',
    packagePrivate: false,
    publishConfigPresent: false,
    packageNodeEngine: SUPPORTED_NODE_ENGINE_RANGE,
    pythonProjectName: 'cortexel',
    pythonProjectVersion: '0.10.0',
    citationVersion: '0.10.0',
    citationDateReleased: '2026-07-21',
    ledgerProject: 'cortexel',
    ledgerCurrentRelease: '0.10.0',
    unmetReleaseGateIds: [],
    releaseEvidenceSourceProblems: [],
    releaseEvidenceSourceCommit: HEAD,
    artifactSourceRevision: HEAD,
    artifactSchema: RELEASE_CAPABLE_ARTIFACT_SCHEMA,
    releaseArtifactWitness: RELEASE_SCHEMA_CONTEXT.artifactWitness,
    expectedReleaseBuildIdentity: RELEASE_SCHEMA_CONTEXT.expectedBuildIdentity,
    git: {
      headCommit: HEAD,
      worktreeClean: true,
      tag: {
        name: 'v0.10.0',
        objectType: 'tag',
        resolvedCommit: HEAD,
        taggerDateReleased: '2026-07-21',
      },
    },
    ...overrides,
  };
}

function evidenceLedgerFixture(version = '1.0.0'): Record<string, any> {
  return {
    $schema: './evidence-ledger.schema.json',
    ledgerVersion: 1,
    project: 'cortexel',
    targetRelease: '1.0.0',
    currentRelease: version,
    statement: `Cortexel ${version} evidence authorization fixture.`,
    // This is the historical review baseline, not the self-referential candidate SHA.
    baselineCommit: '1111111111111111111111111111111111111111',
    gates: Array.from({ length: 155 }, (_unused, index) => ({
      id: `R${String(index + 1).padStart(3, '0')}`,
      section: 'Release fixture',
      requirement: `Requirement ${index + 1}`,
      releaseBlocking: true,
      status: 'NOT_RUN',
      evidence: null,
      notes: '',
    })),
  };
}

interface EvidenceRepositoryFixture {
  readonly repository: string;
  readonly packageJson: Record<string, unknown>;
  readonly sourceCommit: string;
  readonly authorizationHead: string;
  readonly receipt: string;
  readonly git: (...args: string[]) => string;
  readonly readLedger: () => Record<string, any>;
  readonly writeLedger: (ledger: Record<string, any>) => void;
}

function createEvidenceRepositoryFixture(
  packageOverrides: Record<string, unknown> = {},
): EvidenceRepositoryFixture {
  const repository = mkdtempSync(path.join(tmpdir(), 'cortexel-release-evidence-'));
  const git = (...args: string[]): string => execFileSync(
    'git',
    args,
    { cwd: repository, encoding: 'utf8' },
  ).trim();
  git('init', '-q');
  git('config', 'user.email', 'release-test@example.invalid');
  git('config', 'user.name', 'Release Test');
  mkdirSync(path.join(repository, 'docs', 'release'), { recursive: true });
  mkdirSync(path.join(repository, 'dist'), { recursive: true });
  const packageJson = { name: 'fixture', version: '1.0.0', files: ['dist'], ...packageOverrides };
  writeFileSync(path.join(repository, 'package.json'), `${JSON.stringify(packageJson)}\n`);
  writeFileSync(path.join(repository, 'dist', 'index.js'), 'export {};\n');
  writeFileSync(path.join(repository, 'source.ts'), 'export const value = 1;\n');
  writeFileSync(
    path.join(repository, 'docs', 'release', 'evidence-ledger.schema.json'),
    readFileSync(path.join(ROOT, 'docs', 'release', 'evidence-ledger.schema.json')),
  );
  const ledgerPath = path.join(repository, 'docs', 'release', 'evidence-ledger.v1.json');
  const writeLedger = (ledger: Record<string, any>): void => {
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  };
  const readLedger = (): Record<string, any> => JSON.parse(
    readFileSync(ledgerPath, 'utf8'),
  ) as Record<string, any>;
  writeLedger(evidenceLedgerFixture());
  git('add', '.');
  git('commit', '-qm', 'tested candidate A');
  const sourceCommit = git('rev-parse', 'HEAD');

  const receipt = 'docs/release/evidence/1.0.0/tests.log';
  mkdirSync(path.dirname(path.join(repository, receipt)), { recursive: true });
  const receiptBytes = Buffer.from('all fixture tests passed\n');
  writeFileSync(path.join(repository, receipt), receiptBytes);
  const ledger = readLedger();
  ledger.gates[0].status = 'PASS';
  ledger.gates[0].evidence = {
    command: 'bun run test',
    exitCode: 0,
    toolchain: 'fixture toolchain',
    sourceCommit,
    reviewedAt: '2026-07-22T12:00:00Z',
    receipt,
    artifactDigest: `sha256:${createHash('sha256').update(receiptBytes).digest('hex')}`,
  };
  writeLedger(ledger);
  git('add', '.');
  git('commit', '-qm', 'authorization B records evidence only');
  const authorizationHead = git('rev-parse', 'HEAD');
  return {
    repository,
    packageJson,
    sourceCommit,
    authorizationHead,
    receipt,
    git,
    readLedger,
    writeLedger,
  };
}

describe('release identity — strict npm/PEP 440 normalization', () => {
  it('accepts strict SemVer and rejects malformed or noncanonical forms', () => {
    expect(parseStrictSemVer('0.10.0-dev.0')).not.toBeNull();
    expect(parseStrictSemVer('1.2.3')).not.toBeNull();
    expect(parseStrictSemVer('1.2.3-rc.1+build.7')).not.toBeNull();
    for (const value of [
      'banana',
      'v1.2.3',
      '01.2.3',
      '1.02.3',
      '1.2.03',
      '1.2.3-dev.00',
      '1.2',
      '1.2.3-',
      '1.2.3+',
    ]) {
      expect(parseStrictSemVer(value), value).toBeNull();
    }
  });

  it('maps only final cores and the one normalized development spelling', () => {
    expect(npmSemVerToPep440('0.10.0-dev.0')).toBe('0.10.0.dev0');
    expect(npmSemVerToPep440('12.34.56-dev.19')).toBe('12.34.56.dev19');
    expect(npmSemVerToPep440('1.2.3')).toBe('1.2.3');
    expect(npmSemVerToPep440('1.2.3-rc.1')).toBeNull();
    expect(npmSemVerToPep440('1.2.3+local')).toBeNull();
    expect(npmSemVerToPep440('banana')).toBeNull();
  });

  it('reads static Python/CFF metadata and refuses ambiguity', () => {
    expect(parsePythonProjectMetadata('[project]\nname = "cortexel"\nversion = "0.10.0.dev0"\n'))
      .toEqual({ name: 'cortexel', version: '0.10.0.dev0' });
    expect(() => parsePythonProjectMetadata(
      '[project]\nname = "cortexel"\nversion = "0.10.0.dev0"\nversion = "0.10.0.dev1"\n',
    )).toThrow(/duplicate \[project\]\.version/u);
    expect(() => parsePythonProjectMetadata(
      '[project]\nname = "cortexel"\nversion = { dynamic = true }\n',
    )).toThrow(/canonical double-quoted scalar/u);
    expect(() => parsePythonProjectMetadata(
      '[project]\nname = "cortexel"\nversion = "0.10.0.dev0"\n"version" = "9.9.9"\n',
    )).toThrow(/canonical bare scalar assignment/u);
    expect(() => parsePythonProjectMetadata(
      'project.version = "9.9.9"\n[project]\nname = "cortexel"\nversion = "0.10.0.dev0"\n',
    )).toThrow(/canonical bare scalar assignment/u);
    expect(() => parsePythonProjectMetadata(
      '[project]\nname = "cortexel"\nversion = "0.10.0.dev0"\ndynamic = ["version"]\n',
    )).toThrow(/dynamic is incompatible/u);

    const citation = 'cff-version: 1.2.0\nversion: 0.9.0\ndate-released: 2026-07-15\n';
    expect(parseCitationVersion(citation)).toBe('0.9.0');
    expect(parseCitationReleaseMetadata(citation)).toEqual({
      version: '0.9.0',
      dateReleased: '2026-07-15',
    });
    expect(() => parseCitationVersion(
      'version: 0.9.0\nversion: 1.0.0\ndate-released: 2026-07-15\n',
    ))
      .toThrow(/exactly one top-level version/u);
    expect(() => parseCitationVersion(
      'version: 0.9.0\n"version": 1.0.0\ndate-released: 2026-07-15\n',
    )).toThrow(/noncanonical YAML keys\/documents/u);
    expect(() => parseCitationVersion(
      'version: 0.9.0\n"ver\\u0073ion": 1.0.0\ndate-released: 2026-07-15\n',
    )).toThrow(/noncanonical YAML keys\/documents/u);
    expect(() => parseCitationVersion('version: 0.9.0\n'))
      .toThrow(/exactly one top-level date-released/u);
    expect(() => parseCitationVersion(
      'version: 0.9.0\ndate-released: 2026-02-31\n',
    )).toThrow(/not a real canonical Gregorian date/u);
    for (const source of [
      'version:\u00a00.9.0\ndate-released: 2026-07-15\n',
      'version: 0.9.0#not-a-yaml-comment\ndate-released: 2026-07-15\n',
      'version: 0.9.0\ndate-released:2026-07-15\n',
    ]) {
      expect(() => parseCitationReleaseMetadata(source)).toThrow(/plain scalar|canonical/u);
    }
  });

  it('does not reinterpret Unicode whitespace as TOML syntax whitespace', () => {
    for (const source of [
      '[project]\nname = "cortexel"\u00a0# not a TOML separator\nversion = "0.9.0"\n',
      '[project]\nname\u00a0 = "cortexel"\nversion = "0.9.0"\n',
      '\u00a0[project]\nname = "cortexel"\nversion = "0.9.0"\n',
    ]) {
      expect(() => parsePythonProjectMetadata(source)).toThrow(ReleaseMetadataParseError);
    }
  });

  it('validates calendar dates and the closed RFC 3339 receipt profile', () => {
    expect(isCanonicalGregorianDate('2024-02-29')).toBe(true);
    expect(isCanonicalGregorianDate('2026-02-29')).toBe(false);
    expect(isCanonicalGregorianDate('2026-02-31')).toBe(false);
    expect(isRfc3339Instant('2026-07-21T20:10:11.123456789+02:00')).toBe(true);
    expect(isRfc3339Instant('2026-02-31T00:00:00Z')).toBe(false);
    expect(isRfc3339Instant('2026-07-21T20:10:11')).toBe(false);
    expect(isRfc3339Instant('2026-07-21T20:10:60Z')).toBe(false);
    expect(isRfc3339Instant('2026-07-21T20:10:11-00:00')).toBe(false);
    expect(isRfc3339Instant('2026-07-21T20:10:11+24:00')).toBe(false);
    expect(isRfc3339Instant('2026-07-21T20:10:11-24:00')).toBe(false);
  });
});

describe('release identity — committed development metadata', () => {
  it('defines packageVersion as npm SemVer and the Python spelling as normalized PEP 440', () => {
    const registry = parseJsonSourceStrict<{
      axes: readonly { id: string; meaning: string }[];
    }>(
      readFileSync(path.join(ROOT, 'contract', 'registries', 'identity.v1.json')),
      'contract/registries/identity.v1.json',
    );
    const packageVersion = registry.axes.find((axis) => axis.id === 'packageVersion');
    expect(packageVersion?.meaning).toBe(
      'The canonical npm SemVer identity of the installed Cortexel software version. ' +
      'Python wheel metadata uses its normalized PEP 440 spelling and is exposed ' +
      'separately as PYTHON_DISTRIBUTION_VERSION.',
    );
  });

  it('is an intentionally private, normalized development package with no publishConfig', () => {
    const packageJson = parseJsonSourceStrict<Record<string, unknown>>(
      readFileSync(path.join(ROOT, 'package.json')),
      'package.json',
    );
    const python = parsePythonProjectMetadata(
      readFileSync(path.join(ROOT, 'python', 'pyproject.toml'), 'utf8'),
    );
    expect(packageJson.version).toBe('0.10.0-dev.0');
    expect(packageJson.private).toBe(true);
    expect(Object.hasOwn(packageJson, 'publishConfig')).toBe(false);
    expect(python.version).toBe('0.10.0.dev0');
    expect(packageDistributionIdentityProblems({
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      packagePrivate: packageJson.private,
      publishConfigPresent: Object.hasOwn(packageJson, 'publishConfig'),
      packageNodeEngine: (packageJson.engines as Record<string, unknown>).node,
      pythonProjectName: python.name,
      pythonProjectVersion: python.version,
    })).toEqual([]);
  });

  it('closes the advertised Node engine policy over exactly the CI-supported majors', () => {
    const base = finalRelease();
    expect(packageDistributionIdentityProblems(base)).toEqual([]);
    for (const packageNodeEngine of [
      undefined,
      '>=20',
      '^20.0.0 || ^22.0.0 || ^24.0.0 || ^26.0.0',
      '^22.0.0 || ^24.0.0 || ^26.0.0 || ^28.0.0',
    ]) {
      expect(packageDistributionIdentityProblems({ ...base, packageNodeEngine })).toContain(
        `package engines.node must be exactly ${JSON.stringify(SUPPORTED_NODE_ENGINE_RANGE)}`,
      );
    }
  });

  it('keeps every publication lifecycle gate behind the fail-closed release verifier', () => {
    const packageJson = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const lifecycle = packageJson.scripts.prepublishOnly;
    const ordered = [
      'bun run release:verify',
      'bun run check:ledger',
      'bun run build',
      'bun run check',
      'bun run test:python',
      'bun run check:python',
      'bun run test:python-package',
      'bun run audit',
      'bun run lint:package',
      'bun run test:package',
      'bun run release:verify',
    ];
    expect(lifecycle.split(' && ')).toEqual(ordered);
    expect(ordered.indexOf('bun run build')).toBeLessThan(ordered.lastIndexOf('bun run release:verify'));
    expect(ordered.at(-1)).toBe('bun run release:verify');
    expect(packageJson.scripts['release:verify']).toBe('tsx scripts/verify-release.ts');
  });

  it('intentionally refuses this development tree for independent reasons', () => {
    const result = verifyRepositoryRelease(ROOT);
    expect(result.problems).toContain(
      'release package version must be a final core SemVer (X.Y.Z)',
    );
    expect(result.problems).toContain('release package must set private to false explicitly');
    expect(result.problems).toContain(
      'release stamping is unavailable: FigureArtifactV1 permits only release=false and sourceRevision="unreleased-worktree"',
    );
  });

  it('derives the stamping refusal from the normative artifact schema', () => {
    const schema = parseJsonSourceStrict(
      readFileSync(path.join(ROOT, 'contract', 'schemas', 'figure-artifact.v1.schema.json')),
      'contract/schemas/figure-artifact.v1.schema.json',
    );
    expect(artifactReleaseStampingProblems(schema)).toEqual([
      'release stamping is unavailable: FigureArtifactV1 permits only release=false and sourceRevision="unreleased-worktree"',
    ]);
    expect(artifactReleaseStampingProblems(
      RELEASE_CAPABLE_ARTIFACT_SCHEMA,
      RELEASE_SCHEMA_CONTEXT,
    )).toEqual([]);
    expect(artifactReleaseStampingProblems(RELEASE_CAPABLE_ARTIFACT_SCHEMA)).toEqual([
      'release-capable FigureArtifactV1 requires one exact independently requested buildIdentity',
    ]);
    expect(artifactReleaseStampingProblems({ properties: { buildIdentity: { properties: {} } } }))
      .toEqual([
        'FigureArtifactV1 root must be a closed object requiring every declared property, including buildIdentity',
      ]);
  });

  it('rejects dead, weakly typed, open, and ambiguous release branches', () => {
    const dead = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    dead.properties.buildIdentity.allOf = [
      {
        type: 'object',
        properties: { release: { const: false } },
        required: ['release'],
      },
    ];
    expect(artifactReleaseStampingProblems(dead)).toContain(
      'FigureArtifactV1 release branch is dead or does not admit the exact release=true/full-SHA identity witness',
    );

    const noStringType = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    delete noStringType.properties.buildIdentity.oneOf[0].properties.sourceRevision.type;
    expect(artifactReleaseStampingProblems(noStringType)[0]).toMatch(/required string/u);

    const open = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    open.properties.buildIdentity.additionalProperties = true;
    expect(artifactReleaseStampingProblems(open)).toEqual([
      'FigureArtifactV1 buildIdentity must be a closed object with exactly the seven required identity axes',
    ]);

    const patternedEscape = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    patternedEscape.properties.buildIdentity.patternProperties = { '^x-': true };
    expect(artifactReleaseStampingProblems(patternedEscape)).toEqual([
      'FigureArtifactV1 buildIdentity must be a closed object with exactly the seven required identity axes',
    ]);

    const mismatched = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    mismatched.properties.buildIdentity.oneOf.push({ type: 'object' });
    expect(artifactReleaseStampingProblems(mismatched)[0]).toMatch(/not an explicit identity branch/u);

    const deadStrictBranchWithBroadEscape = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    deadStrictBranchWithBroadEscape.properties.buildIdentity.oneOf[0].allOf = [{
      properties: { release: { const: false } },
      required: ['release'],
    }];
    deadStrictBranchWithBroadEscape.properties.buildIdentity.oneOf.push({
      type: 'object',
      properties: {
        release: { const: true },
        sourceRevision: { type: 'string', not: { const: 'unreleased-worktree' } },
      },
      required: ['release', 'sourceRevision'],
    });
    expect(artifactReleaseStampingProblems(deadStrictBranchWithBroadEscape)[0])
      .toMatch(/exact identity branch|final packageVersion/u);

    const weakDigest = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    weakDigest.properties.buildIdentity.properties.contractDigest = true;
    expect(artifactReleaseStampingProblems(weakDigest)[0]).toMatch(/contractDigest.*SHA-256/u);

    const disguisedWeakDigest = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    disguisedWeakDigest.properties.buildIdentity.properties.contractDigest = {
      type: 'string',
      not: { const: `sha256:${'0'.repeat(63)}` },
    };
    expect(artifactReleaseStampingProblems(disguisedWeakDigest)[0])
      .toMatch(/contractDigest.*SHA-256/u);

    const rootKilled = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    rootKilled.allOf = [{
      properties: {
        buildIdentity: {
          properties: { release: { const: false } },
          required: ['release'],
        },
      },
    }];
    expect(artifactReleaseStampingProblems(rootKilled)[0])
      .toMatch(/root keyword "allOf".*closed direct-object/u);

    const impossibleSibling = structuredClone(RELEASE_CAPABLE_ARTIFACT_SCHEMA) as any;
    impossibleSibling.properties.impossible = false;
    impossibleSibling.required.push('impossible');
    expect(artifactReleaseStampingProblems(
      impossibleSibling,
      RELEASE_SCHEMA_CONTEXT,
    )).toEqual([
      'complete release artifact witness does not satisfy the full FigureArtifactV1 schema',
    ]);
  });
});

describe('release identity — pure final-release gate', () => {
  it('accepts a coherent pre-1.0 final release fixture', () => {
    expect(releaseVerificationProblems(finalRelease())).toEqual([]);
  });

  it('rejects malformed versions and mismatched release surfaces', () => {
    expect(releaseVerificationProblems(finalRelease({ packageVersion: 'banana' })))
      .toEqual(expect.arrayContaining([
        'package version must be strict SemVer 2.0.0',
        'release package version must be a final core SemVer (X.Y.Z)',
      ]));
    expect(releaseVerificationProblems(finalRelease({ pythonProjectVersion: '0.10.1' })))
      .toEqual(expect.arrayContaining([
        'Python project version must be the normalized PEP 440 spelling "0.10.0"',
        'package and Python release versions must agree exactly',
      ]));
    expect(releaseVerificationProblems(finalRelease({ citationVersion: '0.9.0' })))
      .toContain('package and CITATION.cff release versions must agree exactly');
    expect(releaseVerificationProblems(finalRelease({ citationDateReleased: '2026-02-31' })))
      .toContain('CITATION.cff date-released must be one real YYYY-MM-DD Gregorian date');
    expect(releaseVerificationProblems(finalRelease({ ledgerCurrentRelease: '0.9.0' })))
      .toContain('package and ledger currentRelease must agree exactly');
  });

  it('rejects private release metadata and any residual publishConfig', () => {
    expect(releaseVerificationProblems(finalRelease({ packagePrivate: true })))
      .toContain('release package must set private to false explicitly');
    expect(releaseVerificationProblems(finalRelease({ publishConfigPresent: true })))
      .toContain('publishConfig must be absent; publication policy is not package metadata');
  });

  it('rejects dirty, lightweight, missing, wrong-name, wrong-target, and invalid-HEAD tags', () => {
    expect(releaseVerificationProblems(finalRelease({
      git: { ...finalRelease().git, worktreeClean: false },
    }))).toContain('release worktree and index must be clean, including untracked files');
    expect(releaseVerificationProblems(finalRelease({
      git: {
        headCommit: HEAD,
        worktreeClean: true,
        tag: {
          name: 'v0.10.0',
          objectType: 'commit',
          resolvedCommit: HEAD,
          taggerDateReleased: null,
        },
      },
    }))).toContain('refs/tags/v0.10.0 must be an annotated tag object');
    expect(releaseVerificationProblems(finalRelease({
      git: { headCommit: HEAD, worktreeClean: true, tag: null },
    }))).toContain('exact release tag refs/tags/v0.10.0 does not exist');
    expect(releaseVerificationProblems(finalRelease({
      git: {
        headCommit: HEAD,
        worktreeClean: true,
        tag: {
          name: 'v0.10.1',
          objectType: 'tag',
          resolvedCommit: HEAD,
          taggerDateReleased: '2026-07-21',
        },
      },
    }))).toContain('release tag must be named exactly v0.10.0');
    expect(releaseVerificationProblems(finalRelease({
      git: {
        headCommit: HEAD,
        worktreeClean: true,
        tag: {
          name: 'v0.10.0',
          objectType: 'tag',
          resolvedCommit: '2222222222222222222222222222222222222222',
          taggerDateReleased: '2026-07-21',
        },
      },
    }))).toContain('refs/tags/v0.10.0 must resolve to HEAD');
    expect(releaseVerificationProblems(finalRelease({
      git: {
        headCommit: 'HEAD',
        worktreeClean: true,
        tag: {
          name: 'v0.10.0',
          objectType: 'tag',
          resolvedCommit: HEAD,
          taggerDateReleased: '2026-07-21',
        },
      },
    }))).toContain('HEAD must resolve to one full lowercase commit SHA');
    expect(releaseVerificationProblems(finalRelease({
      git: {
        headCommit: HEAD,
        worktreeClean: true,
        tag: {
          name: 'v0.10.0',
          objectType: 'tag',
          resolvedCommit: HEAD,
          taggerDateReleased: '2026-07-22',
        },
      },
    }))).toContain('refs/tags/v0.10.0 tagger date must equal CITATION.cff date-released');
  });

  it('does not let assume-unchanged hide modified publication bytes from the clean-tree gate', () => {
    const repository = mkdtempSync(path.join(tmpdir(), 'cortexel-release-git-'));
    const git = (...args: string[]): void => {
      execFileSync('git', args, { cwd: repository, stdio: 'ignore' });
    };
    try {
      git('init', '-q');
      git('config', 'user.email', 'release-test@example.invalid');
      git('config', 'user.name', 'Release Test');
      writeFileSync(path.join(repository, 'package.json'), '{"name":"clean"}\n');
      git('add', 'package.json');
      git('commit', '-qm', 'fixture');
      git('update-index', '--assume-unchanged', 'package.json');
      writeFileSync(path.join(repository, 'package.json'), '{"name":"concealed"}\n');

      expect(execFileSync(
        'git',
        ['status', '--porcelain=v1', '--untracked-files=all'],
        { cwd: repository, encoding: 'utf8' },
      )).toBe('');
      expect(inspectGitReleaseState(repository, '0.10.0-dev.0').worktreeClean).toBe(false);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('does not let a local Git exclude hide an untracked file that npm would pack', () => {
    const repository = mkdtempSync(path.join(tmpdir(), 'cortexel-release-ignore-'));
    const git = (...args: string[]): void => {
      execFileSync('git', args, { cwd: repository, stdio: 'ignore' });
    };
    try {
      git('init', '-q');
      git('config', 'user.email', 'release-test@example.invalid');
      git('config', 'user.name', 'Release Test');
      writeFileSync(path.join(repository, 'package.json'), '{"name":"fixture"}\n');
      mkdirSync(path.join(repository, 'dist'));
      writeFileSync(path.join(repository, 'dist', 'tracked.js'), 'export {};\n');
      git('add', 'package.json', 'dist/tracked.js');
      git('commit', '-qm', 'fixture');
      writeFileSync(path.join(repository, '.git', 'info', 'exclude'), 'dist/concealed.js\n');
      writeFileSync(path.join(repository, 'dist', 'concealed.js'), 'malicious();\n');

      expect(execFileSync(
        'git',
        ['status', '--porcelain=v1', '--untracked-files=all'],
        { cwd: repository, encoding: 'utf8' },
      )).toBe('');
      expect(inspectGitReleaseState(
        repository,
        '0.10.0-dev.0',
        ['dist'],
      ).worktreeClean).toBe(false);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('requires a closed nonempty package files allowlist even for an otherwise clean tree', () => {
    const repository = mkdtempSync(path.join(tmpdir(), 'cortexel-release-files-'));
    const git = (...args: string[]): void => {
      execFileSync('git', args, { cwd: repository, stdio: 'ignore' });
    };
    try {
      git('init', '-q');
      git('config', 'user.email', 'release-test@example.invalid');
      git('config', 'user.name', 'Release Test');
      writeFileSync(path.join(repository, 'package.json'), '{"name":"fixture"}\n');
      git('add', 'package.json');
      git('commit', '-qm', 'fixture');
      expect(inspectGitReleaseState(repository, '0.10.0-dev.0').worktreeClean).toBe(false);
      expect(inspectGitReleaseState(
        repository,
        '0.10.0-dev.0',
        ['package.json'],
      ).worktreeClean).toBe(true);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('does not inherit Git repository redirection from a hostile caller environment', () => {
    const dirtyRepository = mkdtempSync(path.join(tmpdir(), 'cortexel-release-dirty-'));
    const cleanRepository = mkdtempSync(path.join(tmpdir(), 'cortexel-release-clean-'));
    const initialize = (repository: string, contents: string): string => {
      const git = (...args: string[]): string => execFileSync(
        'git',
        args,
        { cwd: repository, encoding: 'utf8' },
      ).trim();
      git('init', '-q');
      git('config', 'user.email', 'release-test@example.invalid');
      git('config', 'user.name', 'Release Test');
      writeFileSync(path.join(repository, 'package.json'), contents);
      git('add', 'package.json');
      git('commit', '-qm', 'fixture');
      return git('rev-parse', 'HEAD');
    };
    const oldGitDir = process.env.GIT_DIR;
    const oldGitWorkTree = process.env.GIT_WORK_TREE;
    try {
      const dirtyHead = initialize(dirtyRepository, '{"name":"dirty"}\n');
      initialize(cleanRepository, '{"name":"clean"}\n');
      writeFileSync(path.join(dirtyRepository, 'package.json'), '{"name":"modified"}\n');

      process.env.GIT_DIR = path.join(cleanRepository, '.git');
      process.env.GIT_WORK_TREE = cleanRepository;
      const inspected = inspectGitReleaseState(dirtyRepository, '0.10.0-dev.0');
      expect(inspected.headCommit).toBe(dirtyHead);
      expect(inspected.worktreeClean).toBe(false);
    } finally {
      if (oldGitDir === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = oldGitDir;
      if (oldGitWorkTree === undefined) delete process.env.GIT_WORK_TREE;
      else process.env.GIT_WORK_TREE = oldGitWorkTree;
      rmSync(dirtyRepository, { recursive: true, force: true });
      rmSync(cleanRepository, { recursive: true, force: true });
    }
  });

  it('does not follow a release-authority file or parent-directory symlink', () => {
    if (process.platform === 'win32') return;
    const repository = mkdtempSync(path.join(tmpdir(), 'cortexel-release-symlink-'));
    const outside = mkdtempSync(path.join(tmpdir(), 'cortexel-release-outside-'));
    try {
      writeFileSync(path.join(outside, 'metadata.json'), '{"external":true}\n');
      symlinkSync(path.join(outside, 'metadata.json'), path.join(repository, 'metadata.json'));
      expect(() => readDirectReleaseFile(repository, 'metadata.json'))
        .toThrow('release metadata path is a symbolic link: metadata.json');

      symlinkSync(outside, path.join(repository, 'indirect'), 'dir');
      expect(() => readDirectReleaseFile(repository, 'indirect/metadata.json'))
        .toThrow('release metadata path is a symbolic link: indirect');
    } finally {
      rmSync(repository, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('rejects traversal, ambiguous separators, and empty release-path components', () => {
    for (const relative of ['../package.json', 'docs//ledger.json', 'docs\\..\\package.json']) {
      expect(() => readDirectReleaseFile(ROOT, relative)).toThrow(/unsafe release metadata path/u);
    }
  });

  it('admits the realizable tested-candidate A then evidence-authorization B construction', () => {
    const fixture = createEvidenceRepositoryFixture();
    try {
      expect(inspectReleaseEvidenceSources(
        fixture.repository,
        fixture.authorizationHead,
        '1.0.0',
        fixture.packageJson,
      )).toEqual([]);
      expect(inspectReleaseEvidenceSources(
        fixture.repository,
        null,
        '1.0.0',
        fixture.packageJson,
      )).toEqual(['release evidence source audit cannot run without a full HEAD commit']);

      const selfAttestation = fixture.readLedger();
      selfAttestation.gates[0].evidence.sourceCommit = fixture.authorizationHead;
      fixture.writeLedger(selfAttestation);
      expect(inspectReleaseEvidenceSources(
        fixture.repository,
        fixture.authorizationHead,
        '1.0.0',
        fixture.packageJson,
      )).toContain(
        'authorization commit B must follow tested candidate A; PASS sourceCommit cannot equal HEAD',
      );
    } finally {
      rmSync(fixture.repository, { recursive: true, force: true });
    }
  });

  it('rejects fabricated, non-ancestor, and mixed PASS source baselines', () => {
    const fixture = createEvidenceRepositoryFixture();
    try {
      const mainBranch = fixture.git('branch', '--show-current');
      fixture.git('checkout', '-qb', 'sibling', fixture.sourceCommit);
      writeFileSync(path.join(fixture.repository, 'sibling.ts'), 'export const sibling = true;\n');
      fixture.git('add', 'sibling.ts');
      fixture.git('commit', '-qm', 'sibling candidate');
      const sibling = fixture.git('rev-parse', 'HEAD');
      fixture.git('checkout', '-q', mainBranch);

      const nonAncestor = fixture.readLedger();
      nonAncestor.gates[0].evidence.sourceCommit = sibling;
      fixture.writeLedger(nonAncestor);
      expect(inspectReleaseEvidenceSources(
        fixture.repository,
        fixture.authorizationHead,
        '1.0.0',
        fixture.packageJson,
      ).join('\n')).toContain('is not an auditable ancestor');

      const fabricated = fixture.readLedger();
      fabricated.gates[0].evidence.sourceCommit = 'f'.repeat(40);
      fixture.writeLedger(fabricated);
      expect(inspectReleaseEvidenceSources(
        fixture.repository,
        fixture.authorizationHead,
        '1.0.0',
        fixture.packageJson,
      ).join('\n')).toContain('is not an auditable ancestor');

      const mixed = fixture.readLedger();
      mixed.gates[0].evidence.sourceCommit = fixture.sourceCommit;
      mixed.gates[1].status = 'PASS';
      mixed.gates[1].evidence = { ...mixed.gates[0].evidence, sourceCommit: sibling };
      fixture.writeLedger(mixed);
      expect(inspectReleaseEvidenceSources(
        fixture.repository,
        fixture.authorizationHead,
        '1.0.0',
        fixture.packageJson,
      )).toContain(
        'all stable-release PASS receipts must identify one common tested candidate commit A',
      );
    } finally {
      rmSync(fixture.repository, { recursive: true, force: true });
    }
  });

  it('detects source drift introduced through a merge after the tested candidate', () => {
    const fixture = createEvidenceRepositoryFixture();
    try {
      const mainBranch = fixture.git('branch', '--show-current');
      fixture.git('checkout', '-qb', 'source-drift', fixture.sourceCommit);
      writeFileSync(path.join(fixture.repository, 'source.ts'), 'export const value = 2;\n');
      fixture.git('add', 'source.ts');
      fixture.git('commit', '-qm', 'change source on side branch');
      fixture.git('checkout', '-q', mainBranch);
      fixture.git('merge', '--no-ff', '-m', 'merge source drift', 'source-drift');
      const mergeHead = fixture.git('rev-parse', 'HEAD');
      expect(inspectReleaseEvidenceSources(
        fixture.repository,
        mergeHead,
        '1.0.0',
        fixture.packageJson,
      ).join('\n')).toContain(
        'repository source changed after tested candidate A at top-level path "source.ts"',
      );
    } finally {
      rmSync(fixture.repository, { recursive: true, force: true });
    }
  });

  it('pins immutable ledger claims and uses a top-anchored evidence whitelist', () => {
    const fixture = createEvidenceRepositoryFixture();
    try {
      const ledger = fixture.readLedger();
      ledger.statement = 'Cortexel 1.0.0 post-test statement mutation.';
      ledger.gates[0].section = 'Mutated section after testing';
      ledger.gates[0].requirement = 'Mutated after testing';
      fixture.writeLedger(ledger);
      const decoy = path.join(
        fixture.repository,
        'nested',
        'docs',
        'release',
        'evidence',
        '1.0.0',
      );
      mkdirSync(decoy, { recursive: true });
      writeFileSync(path.join(decoy, 'forged.log'), 'not top-level evidence\n');
      fixture.git('add', '.');
      fixture.git('commit', '-qm', 'mutate immutable claim and add decoy');

      const problems = inspectReleaseEvidenceSources(
        fixture.repository,
        fixture.git('rev-parse', 'HEAD'),
        '1.0.0',
        fixture.packageJson,
      ).join('\n');
      expect(problems).toContain('ledger root metadata changed');
      expect(problems).toContain('immutable ledger.section changed');
      expect(problems).toContain('immutable ledger.requirement changed');
      expect(problems).toContain(
        'top-level path "nested/docs/release/evidence/1.0.0/forged.log"',
      );
    } finally {
      rmSync(fixture.repository, { recursive: true, force: true });
    }
  });

  it('binds receipt bytes and rejects executable or symbolic-link evidence', () => {
    const digestFixture = createEvidenceRepositoryFixture();
    try {
      const ledger = digestFixture.readLedger();
      ledger.gates[0].evidence.artifactDigest = `sha256:${'0'.repeat(64)}`;
      digestFixture.writeLedger(ledger);
      expect(inspectReleaseEvidenceSources(
        digestFixture.repository,
        digestFixture.authorizationHead,
        '1.0.0',
        digestFixture.packageJson,
      ).join('\n')).toContain('evidence.artifactDigest does not match receipt bytes');
    } finally {
      rmSync(digestFixture.repository, { recursive: true, force: true });
    }

    if (process.platform === 'win32') return;
    const modeFixture = createEvidenceRepositoryFixture();
    try {
      chmodSync(path.join(modeFixture.repository, modeFixture.receipt), 0o755);
      modeFixture.git('add', modeFixture.receipt);
      modeFixture.git('commit', '-qm', 'make evidence executable');
      expect(inspectReleaseEvidenceSources(
        modeFixture.repository,
        modeFixture.git('rev-parse', 'HEAD'),
        '1.0.0',
        modeFixture.packageJson,
      ).join('\n')).toContain('release evidence must be a non-executable regular file');
    } finally {
      rmSync(modeFixture.repository, { recursive: true, force: true });
    }

    const symlinkFixture = createEvidenceRepositoryFixture();
    try {
      const absoluteReceipt = path.join(symlinkFixture.repository, symlinkFixture.receipt);
      writeFileSync(`${absoluteReceipt}.target`, 'replacement receipt\n');
      rmSync(absoluteReceipt);
      symlinkSync('tests.log.target', absoluteReceipt);
      symlinkFixture.git('add', '-A');
      symlinkFixture.git('commit', '-qm', 'replace receipt with symlink');
      expect(inspectReleaseEvidenceSources(
        symlinkFixture.repository,
        symlinkFixture.git('rev-parse', 'HEAD'),
        '1.0.0',
        symlinkFixture.packageJson,
      ).join('\n')).toContain('receipt is not a committed non-executable regular file');
    } finally {
      rmSync(symlinkFixture.repository, { recursive: true, force: true });
    }
  });

  it('proves version-scoped evidence stays outside the npm and executable surfaces', () => {
    const packaged = createEvidenceRepositoryFixture({
      files: ['dist', 'DOCS/RELEASE/EVIDENCE'],
      bin: { forged: './docs/release/evidence/1.0.0/tests.log' },
    });
    try {
      const problems = inspectReleaseEvidenceSources(
        packaged.repository,
        packaged.authorizationHead,
        '1.0.0',
        packaged.packageJson,
      ).join('\n');
      expect(problems).toContain('overlaps the npm files allowlist');
      expect(problems).toContain('is referenced by a package executable surface');
    } finally {
      rmSync(packaged.repository, { recursive: true, force: true });
    }
  });

  it('applies release-blocking ledger gates to final 1.x releases', () => {
    const version = '1.0.0';
    const stable = finalRelease({
      packageVersion: version,
      pythonProjectVersion: version,
      citationVersion: version,
      ledgerCurrentRelease: version,
      unmetReleaseGateIds: ['R001'],
      git: {
        headCommit: HEAD,
        worktreeClean: true,
        tag: {
          name: `v${version}`,
          objectType: 'tag',
          resolvedCommit: HEAD,
          taggerDateReleased: '2026-07-21',
        },
      },
    });
    expect(releaseVerificationProblems(stable)).toContain(
      'stable release has 1 unmet release-blocking ledger gate(s)',
    );
  });

  it('separates the tested artifact commit A from stable authorization HEAD B', () => {
    const version = '1.0.0';
    const base = finalRelease({
      packageVersion: version,
      pythonProjectVersion: version,
      citationVersion: version,
      ledgerCurrentRelease: version,
    });
    expect(releaseVerificationProblems(base)).toContain(
      'stable release artifactSourceRevision must be tested candidate A, not authorization HEAD B',
    );
    expect(releaseVerificationProblems({
      ...base,
      releaseEvidenceSourceCommit: '2222222222222222222222222222222222222222',
      artifactSourceRevision: '2222222222222222222222222222222222222222',
    })).not.toContain(
      'stable release artifactSourceRevision must be tested candidate A, not authorization HEAD B',
    );
  });

  it('consciously leaves evidence freshness outside final 0.x authorization semantics', () => {
    const preStable = finalRelease({
      releaseEvidenceSourceProblems: ['this finding would block a stable release'],
    });
    expect(releaseVerificationProblems(preStable)).not.toContain(
      'this finding would block a stable release',
    );

    const withoutAudit = { ...preStable } as any;
    delete withoutAudit.releaseEvidenceSourceProblems;
    expect(releaseVerificationProblems(withoutAudit)).not.toContain(
      'stable release evidence-source audit must be a string-array result',
    );
  });

  it('fails closed without a well-formed stable-release evidence-source audit result', () => {
    const version = '1.0.0';
    const stable = finalRelease({
      packageVersion: version,
      pythonProjectVersion: version,
      citationVersion: version,
      ledgerCurrentRelease: version,
      git: {
        headCommit: HEAD,
        worktreeClean: true,
        tag: {
          name: `v${version}`,
          objectType: 'tag',
          resolvedCommit: HEAD,
          taggerDateReleased: '2026-07-21',
        },
      },
    });
    const absent = { ...stable } as any;
    delete absent.releaseEvidenceSourceProblems;
    expect(() => releaseVerificationProblems(absent)).not.toThrow();
    expect(releaseVerificationProblems(absent)).toContain(
      'stable release evidence-source audit must be a string-array result',
    );
    expect(releaseVerificationProblems({
      ...stable,
      releaseEvidenceSourceProblems: [1],
    } as any)).toContain(
      'stable release evidence-source audit must be a string-array result',
    );
  });

  it('fails closed without a well-formed stable unmet-gate audit result', () => {
    const version = '1.0.0';
    const stable = finalRelease({
      packageVersion: version,
      pythonProjectVersion: version,
      citationVersion: version,
      ledgerCurrentRelease: version,
    });
    for (const unmetReleaseGateIds of [
      undefined,
      [1],
      ['R01'],
      ['R001', 'not-a-gate'],
      ['R001', 'R001'],
    ]) {
      expect(() => releaseVerificationProblems({
        ...stable,
        unmetReleaseGateIds,
      } as any)).not.toThrow();
      expect(releaseVerificationProblems({
        ...stable,
        unmetReleaseGateIds,
      } as any)).toContain(
        'stable release unmet-gate audit must be an R### string-array result',
      );
    }
  });
});
