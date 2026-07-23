import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import tsupConfig from '../tsup.config.js';
import { buildManifest as buildLegacySkillsManifest } from '../scripts/emit-manifest.js';
import {
  buildEntryOutputBases,
  buildEntryIds,
  capabilitySourceProblems,
  implementedCliIds,
  packageExportIds,
  packageBinTargetProblems,
  packageHasCortexelBin,
  packageIncludesDist,
  packageExportTargetProblems,
  packagedSkillIds,
  sourceEntryId,
  type CapabilitySourceEvidence,
} from '../scripts/lib/capability-source.js';
import { CLI_COMMANDS } from '../src/cli/commands.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const readJson = (relative: string): any => JSON.parse(
  readFileSync(path.join(ROOT, relative), 'utf8'),
);

const registry = readJson('contract/registries/capabilities.v1.json');
const renderers = readJson('contract/registries/renderers.v1.json');
const legacyMap = readJson('contract/registries/legacy-skill-map.v1.json');
const packageJson = readJson('package.json');
const legacySkillsManifest = buildLegacySkillsManifest();
const tsupOptions = Array.isArray(tsupConfig) ? tsupConfig[0] : tsupConfig;
const tsupEntry = typeof tsupOptions === 'object' && tsupOptions !== null &&
  !Array.isArray(tsupOptions)
  ? (tsupOptions as { entry?: unknown }).entry
  : undefined;

const sourceEntryFiles = [
  'src/index.ts',
  'src/core/index.ts',
  'src/figure/index.ts',
  'src/render/index.ts',
  'src/adapters/nest/index.ts',
];
const sourceExportIds = new Set(sourceEntryFiles.flatMap((relative) => {
  const id = sourceEntryId(readFileSync(path.join(ROOT, relative), 'utf8'));
  return id === null ? [] : [id];
}));
const configuredPackageExports = packageExportIds(packageJson);
const configuredBuildEntries = buildEntryIds(tsupEntry);
const skillContractIds = new Set(
  readdirSync(path.join(ROOT, 'contract/skills'))
    .filter((name) => name.endsWith('.v1.json'))
    .map((name) => readJson(`contract/skills/${name}`).id),
);
const figureRuntimeIsPackaged = [
  'cortexel/figure',
  'cortexel/render-svg',
  'cortexel/contract',
].every((id) => configuredPackageExports.has(id)) && [
  'cortexel/figure',
  'cortexel/render-svg',
].every((id) => configuredBuildEntries.has(id));

const evidence: CapabilitySourceEvidence = {
  packageExportIds: configuredPackageExports,
  buildEntryIds: configuredBuildEntries,
  packagedSkillIds: configuredPackageExports.has('cortexel/skills.manifest.json')
    ? packagedSkillIds(legacySkillsManifest)
    : new Set(),
  packagedFigureSkillIds: figureRuntimeIsPackaged ? skillContractIds : new Set(),
  cliIsPackaged: packageHasCortexelBin(packageJson),
  implementedCliIds: implementedCliIds(CLI_COMMANDS),
  sourceExportIds,
  contractSourceIds: existsSync(path.join(ROOT, 'contract/meta/contract-source.schema.json'))
    ? new Set(['cortexel/contract'])
    : new Set(),
  skillContractIds,
  rendererIds: new Set(renderers.renderers.map((renderer: any) => renderer.id)),
  legacyMapIds: new Set(legacyMap.entries.map((entry: any) => entry.legacyId)),
  tarballIncludesDist: packageIncludesDist(packageJson),
};

function mutate(change: (value: any) => void): string[] {
  const value = structuredClone(registry);
  change(value);
  return capabilitySourceProblems(value, evidence);
}

function expectProblem(problems: readonly string[], fragment: string): void {
  expect(problems.some((problem) => problem.includes(fragment)), problems.join('\n')).toBe(true);
}

describe('capability maturity and concrete availability', () => {
  it('accepts the living registry against package, build, source, and migration evidence', () => {
    expect(capabilitySourceProblems(registry, evidence)).toEqual([]);
  });

  it('binds the exact command tuple bidirectionally to CLI capabilities', () => {
    expect([...evidence.implementedCliIds].sort()).toEqual([
      'cli.catalog',
      'cli.identity',
      'cli.inspect',
      'cli.migrate',
      'cli.render',
      'cli.validate',
    ]);
    const hiddenCommandEvidence = {
      ...evidence,
      implementedCliIds: new Set([...evidence.implementedCliIds, 'cli.hidden']),
    };
    expectProblem(
      capabilitySourceProblems(registry, hiddenCommandEvidence),
      'implemented CLI command cli.hidden: missing capability record',
    );
    expect([...implementedCliIds(["identity", "hidden", "not valid 'ghost'"])].sort())
      .toEqual(['cli.hidden', 'cli.identity']);
  });

  it('covers the package export surface bidirectionally', () => {
    const expected = [
      'cortexel',
      'cortexel/adapters/nest',
      'cortexel/contract',
      'cortexel/core',
      'cortexel/figure',
      'cortexel/package.json',
      'cortexel/react',
      'cortexel/react/charts',
      'cortexel/react/knowledge-graph',
      'cortexel/render-svg',
      'cortexel/skills.manifest.json',
    ];
    expect([...evidence.packageExportIds].sort()).toEqual(expected);
    const packagedExports = registry.capabilities
      .filter((capability: any) =>
        capability.availability === 'packaged' &&
        (capability.kind === 'export' || capability.kind === 'data_export'))
      .map((capability: any) => capability.id)
      .sort();
    expect(packagedExports).toEqual(expected);
    expect([...evidence.buildEntryIds].sort()).toEqual(expected.filter(
      (id) => ![
        'cortexel/contract',
        'cortexel/package.json',
        'cortexel/skills.manifest.json',
      ].includes(id),
    ));
    expect(
      packageExportTargetProblems(packageJson, buildEntryOutputBases(tsupEntry)),
    ).toEqual([]);
    expect(packageBinTargetProblems(packageJson, tsupEntry)).toEqual([]);
    expect((tsupEntry as Record<string, unknown>)['internal/request-capability']).toBe(
      'src/core/request.ts',
    );
    expect(packageJson.imports).toEqual({
      '#cortexel-request-capability': './dist/internal/request-capability.cjs',
    });
    expect(buildEntryIds({
      'figure/index': 'src/figure/index.ts',
      'internal/request-capability': 'src/core/request.ts',
      'cli/main': 'src/cli/main.ts',
    })).toEqual(new Set(['cortexel/figure']));
  });

  it('documents build identity on the additive figure subpath, not the legacy core subpath', () => {
    const versioning = readFileSync(path.join(ROOT, 'docs/VERSIONING.md'), 'utf8');
    expect(versioning).toContain(
      '`getBuildIdentity()` (exported from `cortexel/figure`)',
    );
    expect(versioning).not.toContain(
      '`getBuildIdentity()` (exported from `cortexel/core`)',
    );
    expect(configuredPackageExports.has('cortexel/figure')).toBe(true);
    expect(readFileSync(path.join(ROOT, 'src/figure/index.ts'), 'utf8')).toContain(
      "export * from '../core/index.js';",
    );
    expect(readFileSync(path.join(ROOT, 'core/index.ts'), 'utf8')).not.toContain(
      'getBuildIdentity',
    );
  });

  it('binds package exports to the exact tsup output paths', () => {
    const changed = structuredClone(packageJson);
    changed.exports['./core'].import.default = './dist/core/missing.js';
    expectProblem(
      packageExportTargetProblems(changed, buildEntryOutputBases(tsupEntry)),
      'package export cortexel/core: missing build target ./dist/core/index.js',
    );

    const outsideDist = structuredClone(packageJson);
    outsideDist.exports['./react/charts'].require.default = './unbuilt/charts.cjs';
    expectProblem(
      packageExportTargetProblems(outsideDist, buildEntryOutputBases(tsupEntry)),
      'outside the packaged dist/ tree',
    );

    const missingRequire = structuredClone(packageJson);
    delete missingRequire.exports['./figure'].require;
    expectProblem(
      packageExportTargetProblems(missingRequire, buildEntryOutputBases(tsupEntry)),
      'package export cortexel/figure: missing explicit require condition',
    );

    const wrongTypeOrder = structuredClone(packageJson);
    const importBranch = wrongTypeOrder.exports['./render-svg'].import;
    delete wrongTypeOrder.exports['./render-svg'].import;
    wrongTypeOrder.exports['./render-svg'].import = {
      default: importBranch.default,
      types: importBranch.types,
    };
    expectProblem(
      packageExportTargetProblems(wrongTypeOrder, buildEntryOutputBases(tsupEntry)),
      'package export cortexel/render-svg: import must contain exactly types then default',
    );

    const extraCondition = structuredClone(packageJson);
    extraCondition.exports['./figure'].browser = './dist/figure/browser.js';
    expectProblem(
      packageExportTargetProblems(extraCondition, buildEntryOutputBases(tsupEntry)),
      'code export must contain exactly import and require conditions',
    );

    const duplicateContract = structuredClone(packageJson);
    duplicateContract.exports['./contract/manifest.json'] = './dist/manifest.v1.json';
    expectProblem(
      packageExportTargetProblems(duplicateContract, buildEntryOutputBases(tsupEntry)),
      'manifest alias must target ./dist/contract/manifest.v1.json',
    );
  });

  it('requires an explicit closed availability value with no default', () => {
    expectProblem(
      mutate((value) => { delete value.capabilities[0].availability; }),
      'no default exists',
    );
    expectProblem(
      mutate((value) => { value.capabilities[0].availability = 'planned'; }),
      'no default exists',
    );
    expectProblem(
      mutate((value) => { value.availabilities.planned = 'aspirational'; }),
      'expected closed keys',
    );
    expectProblem(
      mutate((value) => { value.capabilities[0].status = 'release_candidate'; }),
      'expected a closed contract-maturity status',
    );
    expectProblem(
      mutate((value) => { value.capabilities[0].kind = 'marketing_claim'; }),
      'expected a closed capability kind',
    );
    expectProblem(
      mutate((value) => {
        value.statuses.stable = 'The implementation is probably in a package.';
      }),
      'must define contract maturity, not availability',
    );
    expectProblem(
      mutate((value) => { value.availabilities.source_only = ''; }),
      'expected a non-empty semantic definition',
    );
  });

  it('requires removed tombstones to be unavailable and forbids unavailable live records', () => {
    const removedIndex = registry.capabilities.findIndex(
      (capability: any) => capability.status === 'removed',
    );
    expectProblem(
      mutate((value) => { value.capabilities[removedIndex].availability = 'source_only'; }),
      'status removed requires availability unavailable',
    );
    expectProblem(
      mutate((value) => { value.capabilities[0].availability = 'unavailable'; }),
      'only status removed may use availability unavailable',
    );
    expectProblem(
      mutate((value) => {
        value.capabilities[removedIndex].replacement = 'figure.metadata_only';
      }),
      'replacement figure.metadata_only is not a capability',
    );
  });

  it('rejects package claims without package/build evidence and source claims without source evidence', () => {
    const withoutPackagedFigureSkills = {
      ...evidence,
      packagedFigureSkillIds: new Set<string>(),
    };
    expectProblem(
      capabilitySourceProblems(structuredClone(registry), withoutPackagedFigureSkills),
      'packaged has no package export, bin, or manifest evidence',
    );
    const coreIndex = registry.capabilities.findIndex(
      (capability: any) => capability.id === 'cortexel/core',
    );
    expectProblem(
      mutate((value) => { value.capabilities[coreIndex].availability = 'source_only'; }),
      'source_only contradicts a package or tarball surface',
    );
    const renderIndex = registry.capabilities.findIndex(
      (capability: any) => capability.id === 'cortexel/render-svg',
    );
    const sourceOnlyRegistry = structuredClone(registry);
    sourceOnlyRegistry.capabilities[renderIndex].availability = 'source_only';
    const missingSourceEvidence = {
      ...evidence,
      packageExportIds: new Set(
        [...evidence.packageExportIds].filter((id) => id !== 'cortexel/render-svg'),
      ),
      buildEntryIds: new Set(
        [...evidence.buildEntryIds].filter((id) => id !== 'cortexel/render-svg'),
      ),
      sourceExportIds: new Set(
        [...evidence.sourceExportIds].filter((id) => id !== 'cortexel/render-svg'),
      ),
    };
    const missingProblems = capabilitySourceProblems(
      sourceOnlyRegistry,
      missingSourceEvidence,
    );
    expectProblem(missingProblems, 'source_only export has no source entry module');
    expect(renderIndex).toBeGreaterThanOrEqual(0);

    const wrongKind = structuredClone(registry);
    wrongKind.capabilities[coreIndex].kind = 'skill';
    expectProblem(
      capabilitySourceProblems(wrongKind, evidence),
      'a package export must use kind export or data_export',
    );

    const skillIndex = registry.capabilities.findIndex(
      (capability: any) => capability.id === 'neuro.spike_raster',
    );
    expectProblem(
      mutate((value) => { value.capabilities[skillIndex].renderer = 'figure.missing'; }),
      'live skill has no registered renderer',
    );
  });

  it('binds the cortexel bin to the private CLI build entry', () => {
    const wrongTarget = structuredClone(packageJson);
    wrongTarget.bin.cortexel = './dist/cli/other.js';
    expectProblem(packageBinTargetProblems(wrongTarget, tsupEntry), 'expected exact target');

    const missingEntry = structuredClone(tsupEntry) as Record<string, unknown>;
    delete missingEntry['cli/main'];
    expectProblem(packageBinTargetProblems(packageJson, missingEntry), 'private tsup entry');
  });

  it('contains no metadata-only bundle, verify command, or invented new-contract experiment', () => {
    const capabilityIds = new Set(registry.capabilities.map((capability: any) => capability.id));
    for (const id of [
      'figure.bundle',
      'cli.verify',
      'experimental.network.spatial_3d',
      'experimental.evidence.knowledge_graph',
      'experimental.neuro.animation_replay',
      'cortexel/adapters/ncp',
      'cortexel/experimental/3d',
      'cortexel/experimental/knowledge-graph',
    ]) {
      expect(capabilityIds.has(id), id).toBe(false);
    }
    expect(renderers.renderers.map((renderer: any) => renderer.id)).not.toContain('figure.bundle');
    expect(renderers.renderers.some(
      (renderer: any) => renderer.id.startsWith('experimental.'),
    )).toBe(false);

    const legacyById = new Map(
      legacyMap.entries.map((entry: any) => [entry.legacyId, entry]),
    );
    for (const id of [
      'nest.spatial_3d',
      'corpus.knowledge_graph',
      'nest.animation_replay',
      'nest.stimulus_response',
    ]) {
      expect(legacyById.get(id), id).toMatchObject({ targetId: null });
    }
    expect(legacyById.get('nest.stimulus_response')).toMatchObject({
      outcome: 'recipe',
      transform: null,
      alternatives: [
        'neuro.analog_trace',
        'neuro.population_rate',
        'neuro.response_curve',
      ],
    });
  });

  it('detects an unreferenced renderer instead of allowing a stable-test exclusion', () => {
    const withOrphan = {
      ...evidence,
      rendererIds: new Set([...evidence.rendererIds, 'figure.metadata_only']),
    };
    expectProblem(
      capabilitySourceProblems(structuredClone(registry), withOrphan),
      'renderer figure.metadata_only: no capability references this renderer',
    );
  });

  it('does not accept a comment-only file as a source export implementation', () => {
    expect(sourceEntryId('/** `cortexel/imaginary` — only a claim. */\n')).toBeNull();
  });
});
