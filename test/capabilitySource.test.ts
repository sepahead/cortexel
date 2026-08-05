import {
  existsSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  rolldown,
  type OutputOptions,
  type PluginContext,
  type ResolveIdExtraOptions,
} from 'rolldown';
import { build as tsdownBuild } from 'tsdown';

import { describe, expect, it } from 'vitest';

import {
  CORTEXEL_PACKAGE_BUILD_CONFIG,
  assertReviewedRolldownResolverIdentity,
  resolveSharedCapabilityImportForBuild,
  sharedCapabilityBuildAuthorityForBuild,
} from '../build.config.js';
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
const packageBuildEntry = CORTEXEL_PACKAGE_BUILD_CONFIG.entry;

const sourceEntryFiles = [
  'src/index.ts',
  'src/core/index.ts',
  'src/figure/index.ts',
  'src/authoring/index.ts',
  'src/render/index.ts',
  'src/adapters/nest/index.ts',
  'src/knowledge-graph/index.ts',
];
const sourceExportIds = new Set(sourceEntryFiles.flatMap((relative) => {
  const id = sourceEntryId(readFileSync(path.join(ROOT, relative), 'utf8'));
  return id === null ? [] : [id];
}));
const configuredPackageExports = packageExportIds(packageJson);
const configuredBuildEntries = buildEntryIds(packageBuildEntry);
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

const REQUEST_CAPABILITY_RESOLUTION = {
  path: '#cortexel-request-capability',
  external: true,
} as const;
const FIGURE_RESULT_CAPABILITY_RESOLUTION = {
  path: '#cortexel-figure-result-capability',
  external: true,
} as const;
const KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION = {
  path: '#cortexel-knowledge-graph-presentation-capability',
  external: true,
} as const;

type ReviewedCapabilityEdge = {
  readonly importer: string;
  readonly source: string;
  readonly resolution:
    | typeof REQUEST_CAPABILITY_RESOLUTION
    | typeof FIGURE_RESULT_CAPABILITY_RESOLUTION
    | typeof KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION;
};

const REVIEWED_PHYSICAL_CAPABILITY_EDGES = [
  ['src/core/index.ts', './request.js', REQUEST_CAPABILITY_RESOLUTION],
  ['src/core/repairs.ts', './request.js', REQUEST_CAPABILITY_RESOLUTION],
  ['src/render/buildFigure.ts', '../core/request.js', REQUEST_CAPABILITY_RESOLUTION],
  [
    'src/render/output-authority-gate.ts',
    '../core/request.js',
    REQUEST_CAPABILITY_RESOLUTION,
  ],
  ['src/cli/main.ts', '../core/request.js', REQUEST_CAPABILITY_RESOLUTION],
  [
    'src/render/index.ts',
    './figure-result-capability.internal.js',
    FIGURE_RESULT_CAPABILITY_RESOLUTION,
  ],
  [
    'src/cli/main.ts',
    '../render/figure-result-capability.internal.js',
    FIGURE_RESULT_CAPABILITY_RESOLUTION,
  ],
  [
    'src/knowledge-graph/index.ts',
    '../../react/knowledgeGraphPresentation.internal.js',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/knowledgeGraph.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/KnowledgeGraph3DScene.tsx',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/KnowledgeGraphA11yList.tsx',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/KnowledgeGraphCorpusFrame.internal.tsx',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/knowledgeGraphFigure.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/knowledgeGraphPublic.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/KnowledgeGraphStaticRecordView.tsx',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
] as const satisfies readonly (
  readonly [string, string, ReviewedCapabilityEdge['resolution']]
)[];

const REVIEWED_DECLARATION_CAPABILITY_EDGES = [
  ['src/core/index.d.ts', './request.js', REQUEST_CAPABILITY_RESOLUTION],
  ['src/core/repairs.d.ts', './request.js', REQUEST_CAPABILITY_RESOLUTION],
  ['src/render/buildFigure.d.ts', '../core/request.js', REQUEST_CAPABILITY_RESOLUTION],
  [
    'src/render/index.d.ts',
    './figure-result-capability.internal.js',
    FIGURE_RESULT_CAPABILITY_RESOLUTION,
  ],
  [
    'src/knowledge-graph/index.d.ts',
    '../../react/knowledgeGraphPresentation.internal.js',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/knowledgeGraph.d.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/KnowledgeGraph3DScene.d.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/KnowledgeGraphA11yList.d.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/KnowledgeGraphCorpusFrame.internal.d.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/knowledgeGraphFigure.d.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/knowledgeGraphPublic.d.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
  [
    'react/KnowledgeGraphStaticRecordView.d.ts',
    './knowledgeGraphPresentation.internal',
    KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION,
  ],
] as const satisfies readonly (
  readonly [string, string, ReviewedCapabilityEdge['resolution']]
)[];

const REVIEWED_BUILD_PASSES = [
  { format: 'es', cjsDts: false },
  { format: 'cjs', cjsDts: false },
  { format: 'cjs', cjsDts: true },
] as const;

type ReviewedBuildPass = typeof REVIEWED_BUILD_PASSES[number];
type ResolveKind =
  | 'import-statement'
  | 'dynamic-import'
  | 'require-call'
  | 'import-rule'
  | 'url-token'
  | 'new-url'
  | 'hot-accept';

function reviewedEdge(
  edge: readonly [string, string, ReviewedCapabilityEdge['resolution']],
): ReviewedCapabilityEdge {
  return {
    importer: path.join(ROOT, edge[0]),
    source: edge[1],
    resolution: edge[2],
  };
}

function resolveReviewedEdge(
  pass: ReviewedBuildPass,
  edge: ReviewedCapabilityEdge,
  overrides: Partial<{
    importer: string | undefined;
    source: string;
    isEntry: boolean;
    kind: ResolveKind;
  }> = {},
) {
  return resolveSharedCapabilityImportForBuild({
    path: overrides.source ?? edge.source,
    importer: Object.hasOwn(overrides, 'importer') ? overrides.importer : edge.importer,
    isEntry: overrides.isEntry ?? false,
    kind: overrides.kind ?? 'import-statement',
    ...pass,
  });
}

async function invokeCapabilityHook(
  pass: ReviewedBuildPass,
  edge: ReviewedCapabilityEdge,
  overrides: Partial<{
    importer: string | undefined;
    source: string;
    isEntry: boolean;
    kind: ResolveKind;
  }> = {},
): Promise<unknown> {
  const authority = sharedCapabilityBuildAuthorityForBuild(
    pass.format,
    pass,
  );
  const plugins = authority.composePlugins([]);
  const optionsHook = authority.finalAuditor.options;
  const optionsHandler = typeof optionsHook === 'function'
    ? optionsHook
    : optionsHook?.handler;
  const buildStartHook = authority.firstResolver.buildStart;
  const buildStartHandler = typeof buildStartHook === 'function'
    ? buildStartHook
    : buildStartHook?.handler;
  const resolveIdHook = authority.firstResolver.resolveId;
  const resolveIdHandler = typeof resolveIdHook === 'function'
    ? resolveIdHook
    : resolveIdHook?.handler;
  const initialOutputOptionsHook = authority.firstResolver.outputOptions;
  const initialOutputOptionsHandler = typeof initialOutputOptionsHook === 'function'
    ? initialOutputOptionsHook
    : initialOutputOptionsHook?.handler;
  const outputOptionsHook = authority.finalAuditor.outputOptions;
  const outputOptionsHandler = typeof outputOptionsHook === 'function'
    ? outputOptionsHook
    : outputOptionsHook?.handler;
  if (
    typeof optionsHandler !== 'function' ||
    typeof initialOutputOptionsHandler !== 'function' ||
    typeof outputOptionsHandler !== 'function' ||
    typeof buildStartHandler !== 'function' ||
    typeof resolveIdHandler !== 'function'
  ) {
    throw new Error('expected callable capability lifecycle hooks');
  }
  await optionsHandler.call(Object.create(null), {
    plugins,
    external: authority.external,
    resolve: { alias: authority.alias },
  });
  await initialOutputOptionsHandler.call(Object.create(null), {});
  await outputOptionsHandler.call(Object.create(null), {});
  await buildStartHandler.call(Object.create(null), Object.create(null));
  return await resolveIdHandler.call(
    Object.assign(Object.create(null), {
      resolve: async () => null,
    }),
    overrides.source ?? edge.source,
    Object.hasOwn(overrides, 'importer') ? overrides.importer : edge.importer,
    {
      isEntry: overrides.isEntry ?? false,
      kind: overrides.kind ?? 'import-statement',
    },
  );
}

describe('capability maturity and concrete availability', () => {
  it('externalizes exactly the reviewed physical and synthetic declaration edges', () => {
    const physicalEdges = REVIEWED_PHYSICAL_CAPABILITY_EDGES.map(reviewedEdge);
    const declarationEdges = REVIEWED_DECLARATION_CAPABILITY_EDGES.map(reviewedEdge);

    for (const pass of REVIEWED_BUILD_PASSES) {
      const accepted = pass.cjsDts
        ? declarationEdges
        : pass.format === 'es'
          ? [...physicalEdges, ...declarationEdges]
          : physicalEdges;
      for (const edge of accepted) {
        expect(resolveReviewedEdge(pass, edge), `${pass.format}:${pass.cjsDts} ${edge.importer}`)
          .toEqual(edge.resolution);
      }
    }

    expect(() => resolveReviewedEdge(
      { format: 'cjs', cjsDts: true },
      physicalEdges[0],
    )).toThrow(/unreviewed shared-capability import/u);
    expect(() => resolveReviewedEdge(
      { format: 'cjs', cjsDts: false },
      declarationEdges[0],
    )).toThrow(/unreviewed shared-capability import/u);
  });

  it('fails closed on every recognized authority-target tuple outside the table', () => {
    const pass = { format: 'es', cjsDts: false } as const;
    const edge = reviewedEdge(REVIEWED_PHYSICAL_CAPABILITY_EDGES[0]);
    for (const kind of [
      'dynamic-import',
      'require-call',
      'import-rule',
      'url-token',
      'new-url',
      'hot-accept',
    ] as const) {
      expect(() => resolveReviewedEdge(pass, edge, { kind }), kind)
        .toThrow(/unreviewed shared-capability import/u);
    }
    for (const overrides of [
      { isEntry: true },
      { importer: path.join(ROOT, 'src/core/unreviewed.ts') },
      { source: '././request.js' },
      { source: './request.js?raw' },
      { source: path.join(ROOT, 'src/core/request.ts') },
      { source: pathToFileURL(path.join(ROOT, 'src/core/request.ts')).href },
      { source: `${pathToFileURL(path.join(ROOT, 'src/core/request.ts')).href}?raw` },
      {
        source: pathToFileURL(path.join(ROOT, 'src/core/request.ts')).href.replace(
          'request.ts',
          '%72equest.ts',
        ),
      },
    ] as const) {
      expect(() => resolveReviewedEdge(pass, edge, overrides))
        .toThrow(/shared-capability import|file URL/u);
    }
    expect(() => resolveReviewedEdge(pass, edge, {
      importer: pathToFileURL(edge.importer).href,
    })).toThrow(/unreviewed shared-capability import/u);
    expect(() => resolveReviewedEdge(pass, edge, {
      importer: '\0virtual:module',
    })).toThrow(/unreviewed shared-capability import/u);
    for (const source of [
      '#cortexel-request-capability',
      '#cortexel-figure-result-capability',
      '#cortexel-knowledge-graph-presentation-capability',
    ]) {
      for (const variant of [
        source,
        `${source}?raw`,
        `${source}#fragment`,
        `${source}/extra`,
        source.replace('capability', '%63apability'),
      ]) {
        expect(() => resolveReviewedEdge(pass, edge, {
          importer: path.join(ROOT, 'src/core/unreviewed.ts'),
          source: variant,
        }), variant).toThrow(/direct reserved shared-capability import is forbidden/u);
      }
    }
  });

  it('rejects physical aliases of a private capability source', () => {
    if (process.platform === 'win32') return;
    const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-capability-alias-'));
    try {
      const reviewed = path.join(ROOT, 'src/core/request.ts');
      const hardlink = path.join(temporary, 'request-hardlink.ts');
      linkSync(reviewed, hardlink);
      const edge = reviewedEdge(REVIEWED_PHYSICAL_CAPABILITY_EDGES[0]);
      const aliases = [
        'alias-ts.ts',
        'alias-js.js',
        'alias-mjs.mjs',
        'alias-cjs.cjs',
        'alias-declaration.d.ts',
        'alias-extensionless',
      ].map((name) => {
        const alias = path.join(temporary, name);
        symlinkSync(reviewed, alias);
        return alias;
      });
      for (const source of [
        ...aliases,
        ...aliases.map((alias) => pathToFileURL(alias).href),
        hardlink,
        pathToFileURL(hardlink).href,
      ]) {
        expect(() => resolveReviewedEdge(
          { format: 'es', cjsDts: false },
          edge,
          { importer: '\0virtual:module', source },
        ), source).toThrow(/unreviewed shared-capability import/u);
      }
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('passes through entry probes and unrelated resolver traffic', () => {
    const edge = reviewedEdge(REVIEWED_PHYSICAL_CAPABILITY_EDGES[0]);
    for (const pass of REVIEWED_BUILD_PASSES) {
      for (const isEntry of [false, true]) {
        expect(resolveReviewedEdge(pass, edge, {
          importer: undefined,
          source: 'src/core/request.ts',
          isEntry,
        })).toBeUndefined();
      }
      const syntheticDeclaration = path.join(ROOT, 'src/core/request.d.ts');
      if (pass.cjsDts || pass.format === 'es') {
        for (const isEntry of [false, true]) {
          expect(resolveReviewedEdge(pass, edge, {
            importer: undefined,
            source: syntheticDeclaration,
            isEntry,
          })).toBeUndefined();
        }
      } else {
        expect(() => resolveReviewedEdge(pass, edge, {
          importer: undefined,
          source: syntheticDeclaration,
          isEntry: false,
        })).toThrow(/shared-capability entry probe/u);
      }
      for (const source of [
        path.join(ROOT, 'src/core/request.ts'),
        pathToFileURL(path.join(ROOT, 'src/core/request.ts')).href,
        `${pathToFileURL(path.join(ROOT, 'src/core/request.ts')).href}?raw`,
      ]) {
        expect(() => resolveReviewedEdge(pass, edge, {
          importer: undefined,
          source,
          isEntry: true,
        }), source).toThrow(/shared-capability entry probe|file URL/u);
      }
      for (const source of [
        'src/core/./request.ts',
        'src/core//request.ts',
        'src/x/../core/request.ts',
        'src/core/a/../request.ts',
        'src/core/request',
        'src/core/request.js',
      ]) {
        expect(() => resolveReviewedEdge(pass, edge, {
          importer: undefined,
          source,
          isEntry: true,
        }), source).toThrow(/shared-capability entry probe/u);
      }
      expect(() => resolveReviewedEdge(pass, edge, {
        importer: undefined,
        source: 'src/core/request.ts',
        isEntry: true,
        kind: 'dynamic-import',
      })).toThrow(/shared-capability entry probe/u);
      expect(() => resolveReviewedEdge(pass, edge, {
        importer: undefined,
        source: syntheticDeclaration,
        isEntry: false,
        kind: 'dynamic-import',
      })).toThrow(/shared-capability entry probe/u);
    }

    for (const source of [
      'request.js',
      './not-request.js',
      './request.js.extra',
      './figure-result-capability.internal.js.map',
      '#private/request.js',
    ]) {
      expect(resolveReviewedEdge(
        { format: 'es', cjsDts: false },
        edge,
        { source },
      ), source).toBeUndefined();
    }
    expect(resolveReviewedEdge(
      { format: 'es', cjsDts: false },
      edge,
      { importer: 'src/core/index.ts', source: './not-request.js' },
    )).toBeUndefined();
    expect(() => resolveReviewedEdge(
      { format: 'es', cjsDts: false },
      edge,
      { importer: 'src/core/index.ts' },
    )).toThrow(/unreviewed shared-capability import/u);
    const unrelatedFileUrl = pathToFileURL(path.join(ROOT, 'src/core/errors.ts')).href;
    expect(resolveReviewedEdge(
      { format: 'es', cjsDts: false },
      edge,
      { importer: '\0virtual:module', source: unrelatedFileUrl },
    )).toBeUndefined();
    expect(() => resolveReviewedEdge(
      { format: 'es', cjsDts: false },
      edge,
      {
        importer: '\0virtual:module',
        source: unrelatedFileUrl.replace('/src/', '/src//'),
      },
    )).toThrow(/noncanonical source file URL/u);
  });

  it('enforces the same closed tuples through the actual Rolldown hook', async () => {
    const physicalEdges = REVIEWED_PHYSICAL_CAPABILITY_EDGES.map(reviewedEdge);
    const declarationEdges = REVIEWED_DECLARATION_CAPABILITY_EDGES.map(reviewedEdge);

    for (const pass of REVIEWED_BUILD_PASSES) {
      const accepted = pass.cjsDts
        ? declarationEdges
        : pass.format === 'es'
          ? [...physicalEdges, ...declarationEdges]
          : physicalEdges;
      for (const edge of accepted) {
        await expect(invokeCapabilityHook(pass, edge)).resolves.toEqual({
          id: edge.resolution.path,
          external: true,
        });
      }
    }

    const physicalEdge = physicalEdges[0];
    const declarationEdge = declarationEdges[0];

    for (const pass of REVIEWED_BUILD_PASSES) {
      const edge = pass.cjsDts ? declarationEdge : physicalEdge;
      await expect(invokeCapabilityHook(pass, edge, { kind: 'dynamic-import' }))
        .rejects.toThrow(/unreviewed shared-capability import/u);
      await expect(invokeCapabilityHook(pass, edge, {
        importer: undefined,
        source: 'src/core/request.ts',
        isEntry: false,
      })).resolves.toBeUndefined();
      await expect(invokeCapabilityHook(pass, edge, {
        importer: undefined,
        source: 'src/core/request.ts',
        isEntry: true,
      })).resolves.toBeUndefined();
    }

    await expect(invokeCapabilityHook(
      { format: 'cjs', cjsDts: true },
      physicalEdge,
    )).rejects.toThrow(/unreviewed shared-capability import/u);
    await expect(invokeCapabilityHook(
      { format: 'cjs', cjsDts: false },
      declarationEdge,
    )).rejects.toThrow(/unreviewed shared-capability import/u);
    expect(() => sharedCapabilityBuildAuthorityForBuild('es', { cjsDts: true }))
      .toThrow(/unsupported capability build pass/u);
  });

  it('seals a flat first-resolver/final-auditor composition and accepts exact ownership', async () => {
    const runtimeInputs = {
      'internal/request-capability': 'src/core/request.ts',
      'internal/figure-result-capability':
        'src/render/figure-result-capability.internal.ts',
      'internal/knowledge-graph-presentation-capability':
        'react/knowledgeGraphPresentation.internal.ts',
    } as const;
    const pass = { cjsDts: false } as const;
    const positiveAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const plugins = positiveAuthority.composePlugins([]);
    expect(Object.isFrozen(plugins)).toBe(true);
    expect(plugins).toHaveLength(2);
    expect(plugins.some(Array.isArray)).toBe(false);
    expect(plugins[0]).toBe(positiveAuthority.firstResolver);
    expect(plugins.at(-1)).toBe(positiveAuthority.finalAuditor);
    expect(positiveAuthority.firstResolver.resolveId).toMatchObject({ order: 'pre' });
    const positive = await rolldown({
      input: runtimeInputs,
      plugins,
      external: positiveAuthority.external,
      resolve: { alias: positiveAuthority.alias },
    });
    try {
      const generated = await positive.generate({
        format: 'cjs',
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name]-[hash].cjs',
      });
      expect(generated.output.map((output) => output.fileName)
        .filter((fileName) => fileName.startsWith('internal/'))
        .sort()).toEqual([
        'internal/figure-result-capability.cjs',
        'internal/knowledge-graph-presentation-capability.cjs',
        'internal/request-capability.cjs',
      ]);
    } finally {
      await positive.close();
    }
  }, 30_000);

  it('screens later-pre resolver remaps for existing and injected same-importer edges', async () => {
    const runtimeInputs = {
      'internal/request-capability': 'src/core/request.ts',
      'internal/figure-result-capability':
        'src/render/figure-result-capability.internal.ts',
      'internal/knowledge-graph-presentation-capability':
        'react/knowledgeGraphPresentation.internal.ts',
    } as const;
    const pass = { cjsDts: false } as const;
    const exactReviewedImporter = path.join(ROOT, 'src/core/index.ts');
    const generateLaterPreRemap = async (
      mode: 'existing' | 'injected',
    ): Promise<void> => {
      const authority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
      const smuggler = {
        name: `unreviewed-later-pre-${mode}-reserved-remapper`,
        resolveId: {
          order: 'pre' as const,
          handler(source: string, importer: string | undefined) {
            if (
              importer === exactReviewedImporter &&
              ((mode === 'existing' && source === '../generated/identity.js') ||
                (mode === 'injected' && source === 'virtual:smuggle'))
            ) {
              return { id: '#cortexel-request-capability', external: true };
            }
            return undefined;
          },
        },
        transform(code: string, id: string) {
          return mode === 'injected' && id === exactReviewedImporter
            ? `${code}\nimport "virtual:smuggle";\n`
            : undefined;
        },
      };
      const smuggled = await rolldown({
        input: { ...runtimeInputs, consumer: exactReviewedImporter },
        plugins: authority.composePlugins([smuggler]),
        external: authority.external,
        resolve: { alias: authority.alias },
      });
      try {
        await smuggled.generate({
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name]-[hash].cjs',
        });
      } finally {
        await smuggled.close();
      }
    };
    await expect(generateLaterPreRemap('existing')).rejects.toThrow(
      /intermediate resolver produced an unadmitted shared-capability edge/u,
    );
    await expect(generateLaterPreRemap('injected')).rejects.toThrow(
      /intermediate resolver produced an unadmitted shared-capability edge/u,
    );
  }, 30_000);

  it('rejects external, alias, marker, dynamic-output, and raw-occurrence collapses', async () => {
    const runtimeInputs = {
      'internal/request-capability': 'src/core/request.ts',
      'internal/figure-result-capability':
        'src/render/figure-result-capability.internal.ts',
      'internal/knowledge-graph-presentation-capability':
        'react/knowledgeGraphPresentation.internal.ts',
    } as const;
    const pass = { cjsDts: false } as const;
    const exactReviewedImporter = path.join(ROOT, 'src/core/index.ts');
    const outputOptions = {
      format: 'cjs' as const,
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
    };

    const directExternal = async (): Promise<void> => {
      const authority = sharedCapabilityBuildAuthorityForBuild(
        'cjs',
        pass,
        (id: string) => id === '#cortexel-request-capability',
      );
      const directBuild = await rolldown({
        input: { ...runtimeInputs, consumer: exactReviewedImporter },
        plugins: authority.composePlugins([{
          name: 'inject-direct-reserved-source',
          transform(code: string, id: string) {
            return id === exactReviewedImporter
              ? `${code}\nimport "#cortexel-request-capability";\n`
              : undefined;
          },
        }]),
        external: authority.external,
        resolve: { alias: authority.alias },
      });
      try {
        await directBuild.generate(outputOptions);
      } finally {
        await directBuild.close();
      }
    };
    await expect(directExternal()).rejects.toThrow(
      /external policy received a reserved capability specifier/u,
    );

    const aliasAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    await expect(rolldown({
      input: runtimeInputs,
      plugins: aliasAuthority.composePlugins([]),
      external: aliasAuthority.external,
      resolve: { alias: { ordinary: '#cortexel-request-capability' } },
    })).rejects.toThrow(/alias differs from the sealed empty record/u);

    const markerAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const transferMarker = async (): Promise<void> => {
      const markerBuild = await rolldown({
        input: { ...runtimeInputs, consumer: exactReviewedImporter },
        plugins: markerAuthority.composePlugins([{
          name: 'transfer-active-marker-to-nested-tuple',
          resolveId: {
            order: 'pre',
            async handler(
              this: PluginContext,
              source: string,
              importer: string | undefined,
              extraOptions: ResolveIdExtraOptions,
            ) {
              if (source !== '../generated/identity.js' || importer !== exactReviewedImporter) {
                return undefined;
              }
              return await this.resolve('#cortexel-request-capability', importer, {
                custom: extraOptions.custom,
                kind: 'import-statement',
                skipSelf: true,
              });
            }
          },
        }]),
        external: markerAuthority.external,
        resolve: { alias: markerAuthority.alias },
      });
      try {
        await markerBuild.generate(outputOptions);
      } finally {
        await markerBuild.close();
      }
    };
    await expect(transferMarker()).rejects.toThrow(
      /reserved capability specifier|unreviewed shared-capability/u,
    );

    const dynamicAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const dynamicBuild = await rolldown({
      input: { ...runtimeInputs, dynamic: 'virtual:dynamic-consumer' },
      plugins: dynamicAuthority.composePlugins([{
        name: 'legacy-dynamic-private-output-remapper',
        resolveId(source: string) {
          return source === 'virtual:dynamic-consumer' ? source : undefined;
        },
        resolveDynamicImport(source: string) {
          return source === 'virtual:private-output'
            ? {
                id: path.join(ROOT, 'dist/internal/request-capability.cjs'),
                external: true,
              }
            : undefined;
        },
        load(id: string) {
          return id === 'virtual:dynamic-consumer'
            ? 'export const loaded = import("virtual:private-output");\n'
            : undefined;
        },
      }]),
      external: dynamicAuthority.external,
      resolve: { alias: dynamicAuthority.alias },
    });
    try {
      await expect(dynamicBuild.generate(outputOptions)).rejects.toThrow(
        /direct private capability edge|private capability output/u,
      );
    } finally {
      await dynamicBuild.close();
    }

    const duplicateAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const duplicateBuild = await rolldown({
      input: { ...runtimeInputs, duplicate: exactReviewedImporter },
      plugins: duplicateAuthority.composePlugins([{
        name: 'duplicate-reviewed-raw-edge',
        transform(code: string, id: string) {
          return id === exactReviewedImporter
            ? `${code}\nexport * from "./request.js";\n`
            : undefined;
        },
      }]),
      external: duplicateAuthority.external,
      resolve: { alias: duplicateAuthority.alias },
    });
    try {
      await expect(duplicateBuild.generate(outputOptions)).rejects.toThrow(
        /reviewed raw capability edge occurred more than once/u,
      );
    } finally {
      await duplicateBuild.close();
    }
  }, 30_000);

  it('rejects plugin mutation, output plugins, accessors, and authority reuse', async () => {
    const runtimeInputs = {
      'internal/request-capability': 'src/core/request.ts',
      'internal/figure-result-capability':
        'src/render/figure-result-capability.internal.ts',
      'internal/knowledge-graph-presentation-capability':
        'react/knowledgeGraphPresentation.internal.ts',
    } as const;
    const pass = { cjsDts: false } as const;
    const outputOptions = {
      format: 'cjs' as const,
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
    };

    const nativeExternalBoundaryAuthority = sharedCapabilityBuildAuthorityForBuild(
      'cjs',
      pass,
    );
    const nativeExternalBoundary = nativeExternalBoundaryAuthority.external;
    expect(nativeExternalBoundary('unrelated-entry', null, false)).toBe(false);
    const untypedNativeExternalBoundary = nativeExternalBoundary as unknown as (
      id: unknown,
      parentId: unknown,
      isResolved: unknown,
    ) => boolean | null | undefined;
    expect(() => untypedNativeExternalBoundary('unrelated-entry', 42, false))
      .toThrow(/parentId must be a string, null, or undefined/u);
    expect(() => untypedNativeExternalBoundary('unrelated-entry', undefined, 'false'))
      .toThrow(/invalid native callback tuple/u);

    let accessorInvoked = false;
    const accessorAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const accessorPlugin = Object.defineProperty(
      { name: 'accessor-plugin' },
      'resolveId',
      {
        enumerable: true,
        get() {
          accessorInvoked = true;
          throw new Error('accessor was invoked');
        },
      },
    );
    expect(() => accessorAuthority.composePlugins([accessorPlugin]))
      .toThrow(/accessor or ambiguous plugin member/u);
    expect(accessorInvoked).toBe(false);

    let inheritedAccessorInvoked = false;
    const inheritedAccessorPrototype = Object.defineProperty({}, 'resolveId', {
      get() {
        inheritedAccessorInvoked = true;
        throw new Error('inherited accessor was invoked');
      },
    });
    const inheritedAccessorPlugin = Object.assign(
      Object.create(inheritedAccessorPrototype) as Record<string, unknown>,
      { name: 'inherited-accessor-plugin' },
    );
    const inheritedAccessorAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    expect(() => inheritedAccessorAuthority.composePlugins([inheritedAccessorPlugin]))
      .toThrow(/ordinary or null prototype/u);
    expect(inheritedAccessorInvoked).toBe(false);

    let nestedAccessorInvoked = false;
    const nestedAccessorHook = Object.defineProperty(
      { order: 'pre' },
      'handler',
      {
        enumerable: true,
        get() {
          nestedAccessorInvoked = true;
          throw new Error('nested hook accessor was invoked');
        },
      },
    );
    const nestedAccessorAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    expect(() => nestedAccessorAuthority.composePlugins([{
      name: 'nested-accessor-plugin',
      resolveId: nestedAccessorHook,
    }])).toThrow(/accessor or ambiguous hook member/u);
    expect(nestedAccessorInvoked).toBe(false);

    let hiddenHookAccessorInvoked = false;
    const hiddenHook = Object.defineProperty({}, 'handler', {
      enumerable: true,
      get() {
        hiddenHookAccessorInvoked = true;
        throw new Error('hidden hook accessor was invoked');
      },
    });
    const hiddenHookAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    expect(() => hiddenHookAuthority.composePlugins([{
      name: 'hidden-hook-accessor-plugin',
      hotUpdate: hiddenHook,
    }])).toThrow(/accessor or ambiguous hook member/u);
    expect(hiddenHookAccessorInvoked).toBe(false);

    const sparseAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const oversizedSparseRoster: unknown[] = [];
    oversizedSparseRoster.length = 513;
    expect(() => sparseAuthority.composePlugins(oversizedSparseRoster))
      .toThrow(/array-length bound/u);

    let arrayAccessorInvoked = false;
    const accessorRoster: unknown[] = [];
    Object.defineProperty(accessorRoster, '0', {
      get() {
        arrayAccessorInvoked = true;
        throw new Error('roster accessor was invoked');
      },
    });
    const arrayAccessorAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    expect(() => arrayAccessorAuthority.composePlugins(accessorRoster))
      .toThrow(/accessor, hole, or ambiguous member/u);
    expect(arrayAccessorInvoked).toBe(false);

    const sparseRoster = new Array<unknown>(1);
    const sparseRosterAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    expect(() => sparseRosterAuthority.composePlugins(sparseRoster))
      .toThrow(/dense indexed members/u);

    let inheritedArrayAccessorInvoked = false;
    const inheritedArrayPrototype = Object.defineProperty({}, '0', {
      get() {
        inheritedArrayAccessorInvoked = true;
        throw new Error('inherited roster accessor was invoked');
      },
    });
    const inheritedAccessorRoster = new Array<unknown>(1);
    Object.setPrototypeOf(inheritedAccessorRoster, inheritedArrayPrototype);
    const inheritedArrayAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    expect(() => inheritedArrayAuthority.composePlugins(inheritedAccessorRoster))
      .toThrow(/exact Array prototype/u);
    expect(inheritedArrayAccessorInvoked).toBe(false);

    const intermediateOutputAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    let intermediateOutputOptionsInvoked = false;
    const intermediateOutputOptionsHandler = (): null => {
      intermediateOutputOptionsInvoked = true;
      return null;
    };
    const intermediateOutputOptionsHook = {
      order: 'post' as const,
      handler: intermediateOutputOptionsHandler,
    };
    const intermediateOutputPlugin = {
      name: 'sealed-intermediate-output-options',
      outputOptions: intermediateOutputOptionsHook,
    };
    const intermediateOutputPlugins = intermediateOutputAuthority.composePlugins([
      intermediateOutputPlugin,
    ]);
    const sealedOutputDescriptor = Object.getOwnPropertyDescriptor(
      intermediateOutputPlugin,
      'outputOptions',
    );
    expect(sealedOutputDescriptor).toMatchObject({
      configurable: false,
      enumerable: true,
      value: intermediateOutputOptionsHook,
      writable: false,
    });
    expect(Object.isFrozen(intermediateOutputOptionsHook)).toBe(true);
    expect(Object.isFrozen(intermediateOutputOptionsHandler)).toBe(true);
    const intermediateOutputBuild = await rolldown({
      input: runtimeInputs,
      plugins: intermediateOutputPlugins,
      external: intermediateOutputAuthority.external,
      resolve: { alias: intermediateOutputAuthority.alias },
    });
    try {
      await intermediateOutputBuild.generate(outputOptions);
      expect(intermediateOutputOptionsInvoked).toBe(true);
    } finally {
      await intermediateOutputBuild.close();
    }

    const resolverMutationAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    await expect(rolldown({
      input: runtimeInputs,
      plugins: resolverMutationAuthority.composePlugins([{
        name: 'mutate-first-authority-plugin',
        options() {
          Object.defineProperty(resolverMutationAuthority.firstResolver, 'resolveId', {
            value: undefined,
          });
          return null;
        },
      }]),
      external: resolverMutationAuthority.external,
      resolve: { alias: resolverMutationAuthority.alias },
    })).rejects.toThrow(TypeError);

    const auditorMutationAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    await expect(rolldown({
      input: runtimeInputs,
      plugins: auditorMutationAuthority.composePlugins([{
        name: 'mutate-final-authority-plugin',
        options() {
          Object.defineProperty(auditorMutationAuthority.finalAuditor, 'options', {
            value: undefined,
          });
          return null;
        },
      }]),
      external: auditorMutationAuthority.external,
      resolve: { alias: auditorMutationAuthority.alias },
    })).rejects.toThrow(TypeError);

    const nestedHookMutationAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const finalOptionsHook = nestedHookMutationAuthority.finalAuditor.options;
    if (finalOptionsHook === null || typeof finalOptionsHook !== 'object') {
      throw new Error('expected the final authority options hook to be an object');
    }
    await expect(rolldown({
      input: runtimeInputs,
      plugins: nestedHookMutationAuthority.composePlugins([{
        name: 'mutate-final-authority-hook-record',
        options() {
          Object.defineProperty(finalOptionsHook, 'handler', { value: () => null });
          return null;
        },
      }]),
      external: nestedHookMutationAuthority.external,
      resolve: { alias: nestedHookMutationAuthority.alias },
    })).rejects.toThrow(TypeError);

    const handlerCallMutationAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const callOptionsHook = handlerCallMutationAuthority.finalAuditor.options;
    const callOptionsHandler = typeof callOptionsHook === 'function'
      ? callOptionsHook
      : callOptionsHook?.handler;
    if (typeof callOptionsHandler !== 'function') {
      throw new Error('expected a callable final authority options handler');
    }
    await expect(rolldown({
      input: runtimeInputs,
      plugins: handlerCallMutationAuthority.composePlugins([{
        name: 'mutate-final-handler-call',
        options() {
          Object.defineProperty(callOptionsHandler, 'call', { value: () => null });
          return null;
        },
      }]),
      external: handlerCallMutationAuthority.external,
      resolve: { alias: handlerCallMutationAuthority.alias },
    })).rejects.toThrow(TypeError);

    const handlerPrototypeAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const prototypeOptionsHook = handlerPrototypeAuthority.finalAuditor.options;
    const prototypeOptionsHandler = typeof prototypeOptionsHook === 'function'
      ? prototypeOptionsHook
      : prototypeOptionsHook?.handler;
    if (typeof prototypeOptionsHandler !== 'function') {
      throw new Error('expected a callable final authority options handler');
    }
    await expect(rolldown({
      input: runtimeInputs,
      plugins: handlerPrototypeAuthority.composePlugins([{
        name: 'mutate-final-handler-prototype',
        options() {
          Object.setPrototypeOf(prototypeOptionsHandler, Object.create(null));
          return null;
        },
      }]),
      external: handlerPrototypeAuthority.external,
      resolve: { alias: handlerPrototypeAuthority.alias },
    })).rejects.toThrow(TypeError);

    const lateOutputAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const lateOutputPlugin: {
      readonly name: string;
      readonly options: () => null;
      outputOptions?: () => null;
    } = {
      name: 'add-output-options-after-composition',
      options() {
        lateOutputPlugin.outputOptions = () => null;
        return null;
      },
    };
    await expect(rolldown({
      input: runtimeInputs,
      plugins: lateOutputAuthority.composePlugins([lateOutputPlugin]),
      external: lateOutputAuthority.external,
      resolve: { alias: lateOutputAuthority.alias },
    })).rejects.toThrow(TypeError);

    const replacingAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const replacer: {
      readonly name: string;
      readonly options: (options: Record<string, unknown>) => Record<string, unknown>;
    } = {
      name: 'replace-normalized-plugin-roster',
      options(options: Record<string, unknown>) {
        return { ...options, plugins: [replacer] };
      },
    };
    await expect(rolldown({
      input: runtimeInputs,
      plugins: replacingAuthority.composePlugins([replacer]),
      external: replacingAuthority.external,
      resolve: { alias: replacingAuthority.alias },
    })).rejects.toThrow(/plugin roster differs from the sealed authority/u);

    const preRemovingOutputAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const preRemovingOutputBuild = await rolldown({
      input: runtimeInputs,
      plugins: preRemovingOutputAuthority.composePlugins([]),
      external: preRemovingOutputAuthority.external,
      resolve: { alias: preRemovingOutputAuthority.alias },
    });
    let preRemovingOutputPluginInvoked = false;
    try {
      await expect(preRemovingOutputBuild.generate({
        ...outputOptions,
        plugins: [{
          name: 'pre-remove-own-output-plugin-evidence',
          outputOptions: {
            order: 'pre',
            handler(options: OutputOptions) {
              preRemovingOutputPluginInvoked = true;
              return { ...options, plugins: [] };
            },
          },
        }],
      })).rejects.toThrow(/output plugins are outside/u);
      expect(preRemovingOutputPluginInvoked).toBe(false);
    } finally {
      await preRemovingOutputBuild.close();
    }

    const outputAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const outputBuild = await rolldown({
      input: runtimeInputs,
      plugins: outputAuthority.composePlugins([]),
      external: outputAuthority.external,
      resolve: { alias: outputAuthority.alias },
    });
    let laterOutputOptionsInvoked = false;
    try {
      await expect(outputBuild.generate({
        ...outputOptions,
        plugins: [{
          name: 'unreviewed-output-mutator',
          outputOptions: {
            order: 'post',
            handler() {
              laterOutputOptionsInvoked = true;
              return null;
            },
          },
          generateBundle() {},
        }],
      })).rejects.toThrow(/output plugins are outside/u);
      expect(laterOutputOptionsInvoked).toBe(false);
    } finally {
      await outputBuild.close();
    }

    const returnedOutputAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    let returnedOutputPluginInvoked = false;
    const returnedOutputBuild = await rolldown({
      input: runtimeInputs,
      plugins: returnedOutputAuthority.composePlugins([{
        name: 'return-output-plugin-from-sealed-hook',
        outputOptions: {
          order: 'post',
          handler(options: OutputOptions) {
            return {
              ...options,
              plugins: [{
                name: 'returned-unreviewed-output-plugin',
                generateBundle() {
                  returnedOutputPluginInvoked = true;
                },
              }],
            };
          },
        },
      }]),
      external: returnedOutputAuthority.external,
      resolve: { alias: returnedOutputAuthority.alias },
    });
    try {
      await expect(returnedOutputBuild.generate(outputOptions)).rejects.toThrow(
        /output plugins are outside/u,
      );
      expect(returnedOutputPluginInvoked).toBe(false);
    } finally {
      await returnedOutputBuild.close();
    }

    const reusedAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const reusedOptions = {
      input: runtimeInputs,
      plugins: reusedAuthority.composePlugins([]),
      external: reusedAuthority.external,
      resolve: { alias: reusedAuthority.alias },
    };
    const first = await rolldown(reusedOptions);
    try {
      await first.generate(outputOptions);
    } finally {
      await first.close();
    }
    await expect(rolldown(reusedOptions)).rejects.toThrow(
      /lifecycle order|stale, unsealed, or already active/u,
    );

    const concurrentAuthority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
    const concurrentBuild = await rolldown({
      input: runtimeInputs,
      plugins: concurrentAuthority.composePlugins([]),
      external: concurrentAuthority.external,
      resolve: { alias: concurrentAuthority.alias },
    });
    try {
      const results = await Promise.allSettled([
        concurrentBuild.generate(outputOptions),
        concurrentBuild.generate(outputOptions),
      ]);
      expect(results.filter((result) => result.status === 'rejected').length).toBeGreaterThan(0);
      expect(results.filter((result) => result.status === 'fulfilled').length)
        .toBeLessThanOrEqual(1);
    } finally {
      await concurrentBuild.close();
    }
  }, 30_000);

  it('runs the exact tsdown pipeline with sealed declaration output hooks without writing', async () => {
    expect(packageJson.devDependencies.rolldown).toBe('1.2.2');
    expect(packageJson.devDependencies.tsdown).toBe('0.22.14');
    expect(() => assertReviewedRolldownResolverIdentity({
      version: '1.2.2',
      directEntry: '/reviewed/rolldown',
      tsdownEntry: '/reviewed/rolldown',
    })).not.toThrow();
    expect(() => assertReviewedRolldownResolverIdentity({
      version: '1.2.3',
      directEntry: '/reviewed/rolldown',
      tsdownEntry: '/reviewed/rolldown',
    })).toThrow(/share Rolldown 1\.2\.2/u);
    expect(() => assertReviewedRolldownResolverIdentity({
      version: '1.2.2',
      directEntry: '/reviewed/rolldown',
      tsdownEntry: '/nested/rolldown',
    })).toThrow(/share Rolldown 1\.2\.2/u);

    const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-tsdown-no-write-'));
    const outputDirectory = path.join(temporary, 'dist');
    try {
      const bundles = await tsdownBuild({
        ...CORTEXEL_PACKAGE_BUILD_CONFIG,
        clean: false,
        outDir: outputDirectory,
        write: false,
      });
      expect(bundles.length).toBeGreaterThan(0);
      expect(existsSync(outputDirectory)).toBe(false);
    } finally {
      rmSync(temporary, { force: true, recursive: true });
    }
  }, 120_000);

  it('rejects physical and linked private-source identities after resolver composition', async () => {
    if (process.platform === 'win32') return;
    const runtimeInputs = {
      'internal/request-capability': 'src/core/request.ts',
      'internal/figure-result-capability':
        'src/render/figure-result-capability.internal.ts',
      'internal/knowledge-graph-presentation-capability':
        'react/knowledgeGraphPresentation.internal.ts',
    } as const;
    const pass = { cjsDts: false } as const;
    const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-capability-remap-'));
    try {
      const consumer = path.join(temporary, 'consumer.ts');
      const reviewed = path.join(ROOT, 'src/core/request.ts');
      const alias = path.join(temporary, 'private-alias.js');
      writeFileSync(consumer, 'import "virtual:smuggle";\nexport const consumer = true;\n');
      symlinkSync(reviewed, alias);
      for (const remapped of [reviewed, alias]) {
        const authority = sharedCapabilityBuildAuthorityForBuild('cjs', pass);
        const generateSmuggledGraph = async (): Promise<void> => {
          const smuggled = await rolldown({
            input: { ...runtimeInputs, consumer },
            plugins: authority.composePlugins([{
              name: 'unreviewed-private-source-remapper',
              resolveId(source: string, importer: string | undefined) {
                if (source === 'virtual:smuggle') return remapped;
                if (
                  remapped === alias &&
                  importer === alias &&
                  (source.startsWith('./') || source.startsWith('../'))
                ) {
                  const physical = path.resolve(path.dirname(reviewed), source);
                  return physical.replace(/\.[cm]?js$/u, '.ts');
                }
                return undefined;
              },
              load(id: string) {
                return remapped === alias && id === alias
                  ? { code: readFileSync(reviewed, 'utf8'), moduleType: 'ts' }
                  : undefined;
              },
            }]),
            external: authority.external,
            resolve: { alias: authority.alias },
          });
          try {
            await smuggled.generate({
              format: 'cjs',
              entryFileNames: '[name].cjs',
              chunkFileNames: '[name]-[hash].cjs',
            });
          } finally {
            await smuggled.close();
          }
        };
        await expect(generateSmuggledGraph(), remapped).rejects.toThrow(
          /unadmitted shared-capability edge|direct private capability edge/u,
        );
      }
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }, 30_000);

  it('accepts the living registry against package, build, source, and migration evidence', () => {
    expect(capabilitySourceProblems(registry, evidence)).toEqual([]);
  });

  it('binds the exact command tuple bidirectionally to CLI capabilities', () => {
    expect([...evidence.implementedCliIds].sort()).toEqual([
      'cli.catalog',
      'cli.describe',
      'cli.identity',
      'cli.inspect',
      'cli.migrate',
      'cli.render',
      'cli.source',
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
      'cortexel/authoring',
      'cortexel/contract',
      'cortexel/core',
      'cortexel/figure',
      'cortexel/knowledge-graph',
      'cortexel/package.json',
      'cortexel/react',
      'cortexel/react/charts',
      'cortexel/react/knowledge-graph',
      'cortexel/react/knowledge-graph-dom',
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
    const domGraphCapability = registry.capabilities.find((capability: any) =>
      capability.id === 'cortexel/react/knowledge-graph-dom'
    );
    expect(domGraphCapability).toMatchObject({
      kind: 'export',
      status: 'experimental',
      availability: 'packaged',
      requiredPeers: ['react'],
    });
    expect(typeof packageJson.dependencies?.zod).toBe('string');
    expect(packageJson.dependencies?.zod).not.toHaveLength(0);
    expect([...evidence.buildEntryIds].sort()).toEqual(expected.filter(
      (id) => ![
        'cortexel/contract',
        'cortexel/package.json',
        'cortexel/skills.manifest.json',
      ].includes(id),
    ));
    expect(
      packageExportTargetProblems(packageJson, buildEntryOutputBases(packageBuildEntry)),
    ).toEqual([]);
    expect(packageBinTargetProblems(packageJson, packageBuildEntry)).toEqual([]);
    expect((packageBuildEntry as Record<string, unknown>)['internal/request-capability']).toBe(
      'src/core/request.ts',
    );
    expect(
      (packageBuildEntry as Record<string, unknown>)['internal/figure-result-capability'],
    ).toBe('src/render/figure-result-capability.internal.ts');
    expect((packageBuildEntry as Record<string, unknown>)['internal/figure-result-brand']).toBe(
      'src/core/figure-result-brand.ts',
    );
    expect(
      (packageBuildEntry as Record<string, unknown>)[
        'internal/knowledge-graph-presentation-capability'
      ],
    ).toBe('react/knowledgeGraphPresentation.internal.ts');
    expect(
      (packageBuildEntry as Record<string, unknown>)[
        'internal/knowledge-graph-presentation-brand'
      ],
    ).toBe('src/core/knowledge-graph-presentation-brand.ts');
    expect((packageBuildEntry as Record<string, unknown>)['internal/validated-request-brand']).toBe(
      'src/core/validated-request-brand.ts',
    );
    expect(packageJson.imports).toEqual({
      '#cortexel-figure-result-brand': {
        types: './dist/internal/figure-result-brand.d.ts',
        import: './dist/internal/figure-result-brand.js',
        require: './dist/internal/figure-result-brand.cjs',
      },
      '#cortexel-figure-result-capability':
        './dist/internal/figure-result-capability.cjs',
      '#cortexel-knowledge-graph-presentation-capability':
        './dist/internal/knowledge-graph-presentation-capability.cjs',
      '#cortexel-knowledge-graph-presentation-brand': {
        types: './dist/internal/knowledge-graph-presentation-brand.d.ts',
        import: './dist/internal/knowledge-graph-presentation-brand.js',
        require: './dist/internal/knowledge-graph-presentation-brand.cjs',
      },
      '#cortexel-request-capability': './dist/internal/request-capability.cjs',
      '#cortexel-validated-request-brand': {
        types: './dist/internal/validated-request-brand.d.ts',
        import: './dist/internal/validated-request-brand.js',
        require: './dist/internal/validated-request-brand.cjs',
      },
    });
    expect(buildEntryIds({
      'figure/index': 'src/figure/index.ts',
      'internal/figure-result-capability':
        'src/render/figure-result-capability.internal.ts',
      'internal/figure-result-brand': 'src/core/figure-result-brand.ts',
      'internal/knowledge-graph-presentation-capability':
        'react/knowledgeGraphPresentation.internal.ts',
      'internal/knowledge-graph-presentation-brand':
        'src/core/knowledge-graph-presentation-brand.ts',
      'internal/request-capability': 'src/core/request.ts',
      'internal/validated-request-brand': 'src/core/validated-request-brand.ts',
      'cli/main': 'src/cli/main.ts',
    })).toEqual(new Set(['cortexel/figure']));
    expect(buildEntryIds({
      'internal/unreviewed-backdoor': 'src/internal/unreviewed-backdoor.ts',
    })).toEqual(new Set(['cortexel/internal/unreviewed-backdoor']));
    expectProblem(
      packageExportTargetProblems(
        packageJson,
        buildEntryOutputBases({
          ...(packageBuildEntry as Record<string, unknown>),
          'internal/unreviewed-backdoor': 'src/internal/unreviewed-backdoor.ts',
        }),
      ),
      'build entry cortexel/internal/unreviewed-backdoor: missing package export target',
    );
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

  it('binds package exports to the exact build output paths', () => {
    const changed = structuredClone(packageJson);
    changed.exports['./core'].import.default = './dist/core/missing.js';
    expectProblem(
      packageExportTargetProblems(changed, buildEntryOutputBases(packageBuildEntry)),
      'package export cortexel/core: missing build target ./dist/core/index.js',
    );

    const outsideDist = structuredClone(packageJson);
    outsideDist.exports['./react/charts'].require.default = './unbuilt/charts.cjs';
    expectProblem(
      packageExportTargetProblems(outsideDist, buildEntryOutputBases(packageBuildEntry)),
      'outside the packaged dist/ tree',
    );

    const missingRequire = structuredClone(packageJson);
    delete missingRequire.exports['./figure'].require;
    expectProblem(
      packageExportTargetProblems(missingRequire, buildEntryOutputBases(packageBuildEntry)),
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
      packageExportTargetProblems(wrongTypeOrder, buildEntryOutputBases(packageBuildEntry)),
      'package export cortexel/render-svg: import must contain exactly types then default',
    );

    const extraCondition = structuredClone(packageJson);
    extraCondition.exports['./figure'].browser = './dist/figure/browser.js';
    expectProblem(
      packageExportTargetProblems(extraCondition, buildEntryOutputBases(packageBuildEntry)),
      'code export must contain exactly import and require conditions',
    );

    const duplicateContract = structuredClone(packageJson);
    duplicateContract.exports['./contract/manifest.json'] = './dist/manifest.v1.json';
    expectProblem(
      packageExportTargetProblems(duplicateContract, buildEntryOutputBases(packageBuildEntry)),
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
    expectProblem(
      packageBinTargetProblems(wrongTarget, packageBuildEntry),
      'expected exact target',
    );

    const missingEntry = structuredClone(packageBuildEntry) as Record<string, unknown>;
    delete missingEntry['cli/main'];
    expectProblem(packageBinTargetProblems(packageJson, missingEntry), 'private build entry');
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

  it('keeps every legacy migration bidirectionally owned and report-only until implemented', () => {
    const skills = readdirSync(path.join(ROOT, 'contract/skills'))
      .filter((name) => name.endsWith('.json'))
      .map((name) => readJson(`contract/skills/${name}`));
    const skillById = new Map<string, any>(
      skills.map((skill: any) => [skill.id, skill]),
    );
    const legacyById = new Map<string, any>(
      legacyMap.entries.map((entry: any) => [entry.legacyId, entry]),
    );

    for (const skill of skills) {
      for (const legacyId of skill.migration.legacyIds) {
        const entry = legacyById.get(legacyId);
        expect(entry, `${skill.id}:${legacyId}`).toBeDefined();
        expect(entry?.targetId, `${skill.id}:${legacyId}`).toBe(skill.id);
        expect(['migrate', 'migrate_conditional']).toContain(entry?.outcome);
      }
    }
    for (const entry of legacyMap.entries) {
      if (entry.transform !== null) {
        expect(entry.transformExecution, entry.legacyId).toBe('report_only');
      } else {
        expect(entry.transformExecution, entry.legacyId).toBeUndefined();
      }
      if (!['migrate', 'migrate_conditional'].includes(entry.outcome)) continue;
      const target = skillById.get(entry.targetId);
      expect(target, entry.legacyId).toBeDefined();
      expect(target?.migration.legacyIds, entry.legacyId).toContain(entry.legacyId);
    }

    expect(legacyById.get('nest.voltage_trace')).toMatchObject({
      targetId: 'neuro.analog_trace',
      transform: 'voltageTraceToAnalogTrace',
      transformExecution: 'report_only',
      requires: [
        'a quantity kind for every series',
        'an explicit time unit',
        'a value unit for every series',
        'an observation kind for every series',
        'an origin for every series (and a method when derived)',
        'stable series ids',
        'an explicit analysis window and boundary',
        'an explicit layout and unit-sharing policy',
        'an explicit duplicate-time policy',
      ],
    });
    expect(legacyById.get('nest.voltage_trace')).not.toHaveProperty(
      'materializedParameters',
    );
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
