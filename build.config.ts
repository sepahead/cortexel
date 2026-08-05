import { createRequire, isBuiltin } from 'node:module';
import { realpathSync, statSync, type BigIntStats } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import MagicString, { type SourceMap } from 'magic-string';
import {
  and as rolldownFilterAnd,
  id as rolldownFilterId,
  importerId as rolldownFilterImporterId,
  include as rolldownFilterInclude,
} from 'rolldown/filter';
import { VERSION as ROLLDOWN_VERSION } from 'rolldown';
import {
  defineConfig,
  type NormalizedFormat,
  type TsdownPlugin,
  type UserConfig,
} from 'tsdown';
import ts from 'typescript';

const REVIEWED_ROLLDOWN_VERSION = '1.2.2' as const;

export function assertReviewedRolldownResolverIdentity(args: {
  readonly version: string;
  readonly directEntry: string;
  readonly tsdownEntry: string;
}): void {
  if (
    args.version !== REVIEWED_ROLLDOWN_VERSION ||
    args.tsdownEntry !== args.directEntry
  ) {
    throw new Error(
      `build authority requires tsdown and build.config.ts to share Rolldown ${REVIEWED_ROLLDOWN_VERSION}`,
    );
  }
}

const buildConfigRequire = createRequire(import.meta.url);
const directRolldownEntry = realpathSync(buildConfigRequire.resolve('rolldown'));
const tsdownEntry = realpathSync(buildConfigRequire.resolve('tsdown'));
const tsdownRolldownEntry = realpathSync(createRequire(tsdownEntry).resolve('rolldown'));
assertReviewedRolldownResolverIdentity({
  version: ROLLDOWN_VERSION,
  directEntry: directRolldownEntry,
  tsdownEntry: tsdownRolldownEntry,
});

const REQUEST_CAPABILITY_SOURCE = path.resolve(import.meta.dirname, 'src/core/request.ts');
const REQUEST_CAPABILITY_SPECIFIER = '#cortexel-request-capability';
const FIGURE_RESULT_CAPABILITY_SOURCE = path.resolve(
  import.meta.dirname,
  'src/render/figure-result-capability.internal.ts',
);
const FIGURE_RESULT_CAPABILITY_SPECIFIER = '#cortexel-figure-result-capability';
const KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SOURCE = path.resolve(
  import.meta.dirname,
  'react/knowledgeGraphPresentation.internal.ts',
);
const KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SPECIFIER =
  '#cortexel-knowledge-graph-presentation-capability';
const RESERVED_RUNTIME_CAPABILITY_SPECIFIERS: ReadonlySet<string> = new Set([
  REQUEST_CAPABILITY_SPECIFIER,
  FIGURE_RESULT_CAPABILITY_SPECIFIER,
  KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SPECIFIER,
]);
const CAPABILITY_SOURCES = Object.freeze([
  REQUEST_CAPABILITY_SOURCE,
  FIGURE_RESULT_CAPABILITY_SOURCE,
  KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SOURCE,
] as const);
const EXACT_CAPABILITY_ENTRY_PROBES: ReadonlyMap<string, string> = new Map(
  CAPABILITY_SOURCES.map((source) => [
    path.relative(import.meta.dirname, source).split(path.sep).join('/'),
    source,
  ]),
);
const CAPABILITY_ENTRY_DESCRIPTORS = Object.freeze([
  Object.freeze({
    source: REQUEST_CAPABILITY_SOURCE,
    declarationSource: REQUEST_CAPABILITY_SOURCE.replace(/\.ts$/u, '.d.ts'),
    outputBase: 'internal/request-capability',
  }),
  Object.freeze({
    source: FIGURE_RESULT_CAPABILITY_SOURCE,
    declarationSource: FIGURE_RESULT_CAPABILITY_SOURCE.replace(/\.ts$/u, '.d.ts'),
    outputBase: 'internal/figure-result-capability',
  }),
  Object.freeze({
    source: KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SOURCE,
    declarationSource: KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SOURCE.replace(
      /\.ts$/u,
      '.d.ts',
    ),
    outputBase: 'internal/knowledge-graph-presentation-capability',
  }),
] as const);
const PRIVATE_CAPABILITY_OUTPUT_PATHS: ReadonlySet<string> = new Set(
  CAPABILITY_ENTRY_DESCRIPTORS.flatMap((descriptor) =>
    ['.js', '.cjs', '.d.ts', '.d.cts'].map((extension) =>
      path.resolve(import.meta.dirname, 'dist', `${descriptor.outputBase}${extension}`))),
);

type SharedCapabilityResolution = {
  readonly path: string;
  readonly external: true;
};

type SharedCapabilityBuildPass =
  | 'es-runtime-and-dts'
  | 'cjs-runtime'
  | 'cjs-dts';

type SharedCapabilityResolveKind =
  | 'import-statement'
  | 'dynamic-import'
  | 'require-call'
  | 'import-rule'
  | 'url-token'
  | 'new-url'
  | 'hot-accept';

type SharedCapabilityEdge = {
  readonly importer: string;
  readonly source: string;
  readonly resolution: SharedCapabilityResolution;
};

type SharedCapabilityAdmission = {
  readonly pass: SharedCapabilityBuildPass;
  readonly importer: string;
  readonly source: string;
  readonly kind: 'import-statement';
  readonly resolvedId: string;
};

type SharedCapabilityLifecycle =
  | 'new'
  | 'building'
  | 'built'
  | 'generating'
  | 'generated'
  | 'failed';

type RawCapabilityEdgeEvidence = {
  readonly source: string;
  readonly kind: SharedCapabilityResolveKind;
  readonly sourceStart: number;
  readonly reviewedAdmission: SharedCapabilityAdmission | null;
};

type RawCapabilityModuleEvidence = {
  readonly code: string;
  readonly edges: readonly RawCapabilityEdgeEvidence[];
};

type SharedCapabilityDelegation = {
  readonly pass: SharedCapabilityBuildPass;
  readonly source: string;
  readonly importer: string;
  readonly isEntry: boolean;
  readonly kind: SharedCapabilityResolveKind;
};

type SharedCapabilityOutputOptionsBoundary =
  | {
      readonly kind: 'absent-null-prototype';
    }
  | {
      readonly kind: 'sealed-own-data';
      readonly value: unknown;
      readonly enumerable: boolean;
    };

type SharedCapabilityPluginRosterEntry = {
  readonly index: number;
  readonly name: string;
  readonly plugin: TsdownPlugin;
  readonly outputOptionsBoundary: SharedCapabilityOutputOptionsBoundary | null;
};

type GuardedExternalPolicy = (
  id: string,
  parentId: string | null | undefined,
  isResolved: boolean,
) => boolean | null | undefined;

function normalizeRolldownOptionalImporter(value: unknown, label: string): string | undefined {
  // Rolldown 1.2.2's native callback boundary presents its documented absent
  // importer as null in some entry probes. Normalize exactly those two absence
  // sentinels; every other non-string value is an authority-boundary failure.
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  throw new Error(`${label} must be a string, null, or undefined`);
}

type SharedCapabilityBuildAuthorityState = {
  readonly pass: SharedCapabilityBuildPass;
  readonly admissions: Map<string, SharedCapabilityAdmission>;
  readonly activeDelegations: WeakSet<object>;
  readonly rawModules: Map<string, RawCapabilityModuleEvidence>;
  lifecycle: SharedCapabilityLifecycle;
  aggregateRawCodeUnits: number;
  aggregateRawEdges: number;
  buildEndCalls: number;
  generateBundleCalls: number;
  compositionSealed: boolean;
  optionsAudited: boolean;
  initialOutputOptionsAudited: boolean;
  outputOptionsAudited: boolean;
  guardedExternal: GuardedExternalPolicy | undefined;
  sealedAlias: Readonly<Record<string, never>> | undefined;
  pluginRoster: readonly SharedCapabilityPluginRosterEntry[] | undefined;
};

const SHARED_CAPABILITY_BUILD_LIMITS = Object.freeze({
  plugins: 256,
  pluginNodes: 512,
  pluginDepth: 8,
  pluginMembers: 128,
  pluginNameUnits: 256,
  modules: 2_048,
  moduleCodeUnits: 4 * 1024 * 1024,
  aggregateCodeUnits: 64 * 1024 * 1024,
  syntaxNodesPerModule: 500_000,
  edgesPerModule: 1_024,
  aggregateEdges: 8_192,
  bundleOutputs: 1_024,
  chunkModuleMembers: 4_096,
  chunkImports: 2_048,
  externalEntries: 256,
  externalStringUnits: 4_096,
} as const);

// Exact Rolldown 1.2.2 hook vocabulary. This is deliberately local and pinned:
// admitting an unknown future object-form hook without inspecting its descriptor
// tree would invalidate the accessor-free plugin-composition evidence.
const ROLLDOWN_PLUGIN_HOOK_NAMES = Object.freeze([
  'options',
  'buildStart',
  'resolveId',
  'load',
  'transform',
  'moduleParsed',
  'buildEnd',
  'onLog',
  'resolveDynamicImport',
  'closeBundle',
  'closeWatcher',
  'watchChange',
  'hotUpdate',
  'augmentChunkHash',
  'outputOptions',
  'renderChunk',
  'renderStart',
  'renderError',
  'writeBundle',
  'generateBundle',
  'resolveFileUrl',
  'footer',
  'banner',
  'intro',
  'outro',
] as const);

const REVIEWED_ROLLDOWN_FILTER_PROTOTYPES: ReadonlySet<object> = (() => {
  const idFilter = rolldownFilterId(/cortexel-reviewed-id/u);
  const importerFilter = rolldownFilterImporterId(/cortexel-reviewed-importer/u);
  const andFilter = rolldownFilterAnd(idFilter, importerFilter);
  const includeFilter = rolldownFilterInclude(andFilter);
  return new Set([
    Object.getPrototypeOf(idFilter) as object,
    Object.getPrototypeOf(importerFilter) as object,
    Object.getPrototypeOf(andFilter) as object,
    Object.getPrototypeOf(includeFilter) as object,
  ]);
})();

type MutableBuildOutput =
  | {
      readonly type: 'asset';
      readonly fileName: string;
      readonly source: string | Uint8Array;
    }
  | {
      readonly type: 'chunk';
      readonly fileName: string;
      code: string;
    };

export interface BareNodeBuiltinSpecifier {
  readonly specifier: string;
  readonly start: number;
  readonly end: number;
}

export interface NodeBuiltinRewrite {
  readonly code: string;
  readonly map: SourceMap | null;
  readonly rewritten: readonly BareNodeBuiltinSpecifier[];
}

function assertParseableBuildCode(sourceFile: ts.SourceFile, fileName: string): void {
  const diagnostics = (
    sourceFile as ts.SourceFile & {
      readonly parseDiagnostics?: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics ?? [];
  if (diagnostics.length === 0) return;
  const diagnostic = diagnostics[0];
  throw new Error(
    `cannot inspect emitted JavaScript ${fileName}: ${ts.flattenDiagnosticMessageText(
      diagnostic?.messageText ?? 'unknown parse failure',
      '\n',
    )}`,
  );
}

function stringLiteralModuleSpecifier(
  node: ts.Node,
): ts.StringLiteralLike | undefined {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    ts.isStringLiteralLike(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference) &&
    node.moduleReference.expression !== undefined &&
    ts.isStringLiteralLike(node.moduleReference.expression)
  ) {
    return node.moduleReference.expression;
  }
  if (
    ts.isCallExpression(node) &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0]) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
  ) {
    return node.arguments[0];
  }
  return undefined;
}

/** Find only executable module-specifier literals, never coincidental data strings. */
export function findBareNodeBuiltinSpecifiersInBuildCode(
  code: string,
  fileName: string,
): readonly BareNodeBuiltinSpecifier[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.cjs') || fileName.endsWith('.js')
      ? ts.ScriptKind.JS
      : ts.ScriptKind.Unknown,
  );
  assertParseableBuildCode(sourceFile, fileName);
  const found: BareNodeBuiltinSpecifier[] = [];
  const visit = (node: ts.Node): void => {
    const literal = stringLiteralModuleSpecifier(node);
    if (
      literal !== undefined &&
      !literal.text.startsWith('node:') &&
      isBuiltin(literal.text)
    ) {
      // StringLiteralLike#getStart/#getEnd include the quotes. Updating only the
      // contents retains the producer's quote choice and makes the map precise.
      found.push({
        specifier: literal.text,
        start: literal.getStart(sourceFile) + 1,
        end: literal.getEnd() - 1,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/** Prefix generated bare builtins while returning a map Rolldown can compose. */
export function rewriteBareNodeBuiltinsForBuild(
  code: string,
  fileName: string,
): NodeBuiltinRewrite {
  const rewritten = findBareNodeBuiltinSpecifiersInBuildCode(code, fileName);
  if (rewritten.length === 0) return { code, map: null, rewritten };

  const reviewedChunk =
    fileName === 'cli/main.cjs' ||
    /^structural-validator-(?:[A-Za-z0-9_-]+|!~\{[A-Za-z0-9]+\}~)\.cjs$/u.test(
      fileName,
    );
  const reviewedShim = 'require("url").pathToFileURL(__filename)';
  const shimStart = code.indexOf(reviewedShim);
  const expectedSpecifierStart = shimStart + 'require("'.length;
  if (
    !reviewedChunk ||
    rewritten.length !== 1 ||
    rewritten[0]?.specifier !== 'url' ||
    shimStart < 0 ||
    code.indexOf(reviewedShim, shimStart + reviewedShim.length) !== -1 ||
    rewritten[0].start !== expectedSpecifierStart ||
    rewritten[0].end !== expectedSpecifierStart + 'url'.length
  ) {
    throw new Error(
      `unreviewed bare Node builtin emission in ${fileName}: ${JSON.stringify(
        rewritten.map(({ specifier, start, end }) => ({ specifier, start, end })),
      )}`,
    );
  }

  const editor = new MagicString(code, { filename: fileName });
  const occurrence = rewritten[0];
  editor.overwrite(occurrence.start, occurrence.end, 'node:url');
  const hardened = editor.toString();
  const survived = findBareNodeBuiltinSpecifiersInBuildCode(hardened, fileName);
  if (survived.length > 0) {
    throw new Error(
      `bare Node builtin survived reviewed rewrite in ${fileName}: ${survived[0]?.specifier}`,
    );
  }
  return {
    code: hardened,
    map: editor.generateMap({
      file: fileName,
      source: fileName,
      includeContent: true,
      hires: true,
    }),
    rewritten,
  };
}

const REQUEST_CAPABILITY_RESOLUTION = Object.freeze({
  path: REQUEST_CAPABILITY_SPECIFIER,
  external: true,
} as const satisfies SharedCapabilityResolution);
const FIGURE_RESULT_CAPABILITY_RESOLUTION = Object.freeze({
  path: FIGURE_RESULT_CAPABILITY_SPECIFIER,
  external: true,
} as const satisfies SharedCapabilityResolution);
const KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_RESOLUTION = Object.freeze({
  path: KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SPECIFIER,
  external: true,
} as const satisfies SharedCapabilityResolution);

const PHYSICAL_CAPABILITY_EDGES = [
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
] as const;

// rolldown-plugin-dts resolves declaration imports from virtual `.d.ts` siblings
// of the physical source modules. These are not files in the source tree, but they
// are the exact importer identities observed in both declaration-producing passes.
const DECLARATION_CAPABILITY_EDGES = [
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
] as const;

function materializeCapabilityEdges(
  edges: readonly (readonly [string, string, SharedCapabilityResolution])[],
): readonly SharedCapabilityEdge[] {
  return edges.map(([importer, source, resolution]) => ({
    importer: path.resolve(import.meta.dirname, importer),
    source,
    resolution,
  }));
}

const PHYSICAL_CAPABILITY_IMPORTS = materializeCapabilityEdges(PHYSICAL_CAPABILITY_EDGES);
const DECLARATION_CAPABILITY_IMPORTS = materializeCapabilityEdges(
  DECLARATION_CAPABILITY_EDGES,
);

const CAPABILITY_IMPORTS_BY_PASS = {
  'es-runtime-and-dts': [
    ...PHYSICAL_CAPABILITY_IMPORTS,
    ...DECLARATION_CAPABILITY_IMPORTS,
  ],
  'cjs-runtime': PHYSICAL_CAPABILITY_IMPORTS,
  'cjs-dts': DECLARATION_CAPABILITY_IMPORTS,
} as const satisfies Record<SharedCapabilityBuildPass, readonly SharedCapabilityEdge[]>;

function sharedCapabilityBuildPass(
  format: NormalizedFormat,
  cjsDts: boolean,
): SharedCapabilityBuildPass {
  if (format === 'es' && cjsDts === false) return 'es-runtime-and-dts';
  if (format === 'cjs' && cjsDts === false) return 'cjs-runtime';
  if (format === 'cjs' && cjsDts === true) return 'cjs-dts';
  throw new Error(
    `unsupported capability build pass: ${JSON.stringify({ format, cjsDts })}`,
  );
}

function physicalCapabilitySourceIdentity(candidate: string): string | undefined {
  let candidateRealpath: string;
  let candidateStat: BigIntStats;
  try {
    candidateRealpath = realpathSync(candidate);
    candidateStat = statSync(candidate, { bigint: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return undefined;
    throw new Error('cannot establish shared-capability source identity', { cause: error });
  }
  for (const reviewedSource of CAPABILITY_SOURCES) {
    const reviewedStat = statSync(reviewedSource, { bigint: true });
    if (
      realpathSync(reviewedSource) === candidateRealpath ||
      (reviewedStat.dev === candidateStat.dev && reviewedStat.ino === candidateStat.ino)
    ) {
      return reviewedSource;
    }
  }
  return undefined;
}

function physicalPathFromBuildGraphId(id: string): string | undefined {
  const withoutMetadata = id.split(/[?#]/u, 1)[0] ?? id;
  if (/^file:/iu.test(withoutMetadata)) {
    try {
      return path.resolve(fileURLToPath(new URL(withoutMetadata)));
    } catch {
      return undefined;
    }
  }
  return path.isAbsolute(withoutMetadata)
    ? path.resolve(withoutMetadata)
    : undefined;
}

function privateCapabilityOutputIdentity(id: string): string | undefined {
  const physical = physicalPathFromBuildGraphId(id);
  if (physical === undefined) return undefined;
  if (PRIVATE_CAPABILITY_OUTPUT_PATHS.has(physical)) return physical;

  let physicalRealpath: string;
  let physicalStat: BigIntStats;
  try {
    physicalRealpath = realpathSync(physical);
    physicalStat = statSync(physical, { bigint: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return undefined;
    throw new Error('cannot establish private capability output identity', {
      cause: error,
    });
  }
  for (const reviewedOutput of PRIVATE_CAPABILITY_OUTPUT_PATHS) {
    let reviewedRealpath: string;
    let reviewedStat: BigIntStats;
    try {
      reviewedRealpath = realpathSync(reviewedOutput);
      reviewedStat = statSync(reviewedOutput, { bigint: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') continue;
      throw new Error('cannot establish reviewed capability output identity', {
        cause: error,
      });
    }
    if (
      reviewedRealpath === physicalRealpath ||
      (reviewedStat.dev === physicalStat.dev && reviewedStat.ino === physicalStat.ino)
    ) {
      return reviewedOutput;
    }
  }
  return undefined;
}

function capabilitySourceForImport(
  source: string,
  importer: string,
): string | undefined {
  const canonicalFilePath = (value: string, label: string): string | undefined => {
    if (!/^file:/iu.test(value)) return undefined;
    let url: URL;
    try {
      url = new URL(value);
    } catch (error) {
      throw new Error(`unreviewed ${label} file URL in shared-capability resolver`, {
        cause: error,
      });
    }
    if (
      !value.startsWith('file:') ||
      url.protocol !== 'file:' ||
      url.username !== '' ||
      url.password !== '' ||
      url.host !== '' ||
      url.port !== '' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      throw new Error(`noncanonical ${label} file URL in shared-capability resolver`);
    }
    let physical: string;
    try {
      physical = fileURLToPath(url);
    } catch (error) {
      throw new Error(`unsafe ${label} file URL in shared-capability resolver`, {
        cause: error,
      });
    }
    if (path.resolve(physical) !== physical || pathToFileURL(physical).href !== value) {
      throw new Error(`noncanonical ${label} file URL in shared-capability resolver`);
    }
    return physical;
  };

  const importerWithoutQuery = importer.split(/[?#]/u, 1)[0] ?? importer;
  const physicalImporter = canonicalFilePath(importer, 'importer') ??
    (path.isAbsolute(importerWithoutQuery) ? importerWithoutQuery : undefined);
  const sourceWithoutQuery = source.split(/[?#]/u, 1)[0] ?? source;
  const fileSource = canonicalFilePath(source, 'source');
  let typescriptSource: string;
  if (fileSource !== undefined) {
    typescriptSource = fileSource;
  } else if (path.isAbsolute(sourceWithoutQuery)) {
    typescriptSource = sourceWithoutQuery;
  } else if (physicalImporter === undefined) {
    const portableSource = sourceWithoutQuery.replaceAll('\\', '/');
    const basename = portableSource.slice(portableSource.lastIndexOf('/') + 1);
    if (
      (portableSource.startsWith('./') || portableSource.startsWith('../')) &&
      /^(?:request|figure-result-capability\.internal|knowledgeGraphPresentation\.internal)(?:\.(?:d\.)?(?:[cm]?[jt]sx?))?$/u.test(
        basename,
      )
    ) {
      return `<unresolved shared-capability source ${sourceWithoutQuery}>`;
    }
    return undefined;
  } else if (sourceWithoutQuery.startsWith('./') || sourceWithoutQuery.startsWith('../')) {
    typescriptSource = path.resolve(path.dirname(physicalImporter), sourceWithoutQuery);
  } else {
    return undefined;
  }
  typescriptSource = path.resolve(typescriptSource);
  if (
    CAPABILITY_SOURCES.includes(typescriptSource as typeof CAPABILITY_SOURCES[number]) ||
    physicalCapabilitySourceIdentity(typescriptSource) !== undefined
  ) {
    return typescriptSource;
  }
  if (/\.d\.[cm]?js$/u.test(typescriptSource)) {
    typescriptSource = typescriptSource.replace(/\.d\.[cm]?js$/u, '.ts');
  } else if (/\.d\.[cm]?ts$/u.test(typescriptSource)) {
    typescriptSource = typescriptSource.replace(/\.d\.[cm]?ts$/u, '.ts');
  } else if (/\.[cm]?js$/u.test(typescriptSource)) {
    typescriptSource = typescriptSource.replace(/\.[cm]?js$/u, '.ts');
  } else if (path.extname(typescriptSource).length === 0) {
    typescriptSource = `${typescriptSource}.ts`;
  }
  typescriptSource = path.resolve(typescriptSource);
  if (CAPABILITY_SOURCES.includes(typescriptSource as typeof CAPABILITY_SOURCES[number])) {
    return typescriptSource;
  }

  // A lexical allowlist is insufficient: Rolldown canonicalizes symlinks and the
  // same file may have alternate absolute spellings (for example macOS Data-volume
  // aliases). Match both realpath and device/inode identity before allowing an
  // unreviewed edge to reach the ordinary resolver.
  return physicalCapabilitySourceIdentity(typescriptSource) !== undefined
    ? typescriptSource
    : undefined;
}

function isReservedCapabilitySpecifierVariant(source: string): boolean {
  const candidates = [source];
  try {
    const decoded = decodeURIComponent(source);
    if (decoded !== source) candidates.push(decoded);
  } catch {
    // An exact reserved base followed by malformed percent syntax is still caught
    // by the raw prefix comparison below; unrelated malformed specifiers fall
    // through to the ordinary resolver and its own syntax policy.
  }
  return candidates.some((candidate) =>
    [...RESERVED_RUNTIME_CAPABILITY_SPECIFIERS].some((specifier) =>
      candidate.startsWith(specifier)));
}

/** Repository-private resolver seam: only a reviewed build-pass tuple may bind authority. */
export function resolveSharedCapabilityImportForBuild(args: {
  readonly path: string;
  readonly importer: string | undefined;
  readonly isEntry: boolean;
  readonly kind: SharedCapabilityResolveKind;
  readonly format: NormalizedFormat;
  readonly cjsDts: boolean;
}): SharedCapabilityResolution | undefined {
  const pass = sharedCapabilityBuildPass(args.format, args.cjsDts);
  if (isReservedCapabilitySpecifierVariant(args.path)) {
    throw new Error(
      `direct reserved shared-capability import is forbidden: ${JSON.stringify({
        pass,
        source: args.path,
        importer: args.importer,
        isEntry: args.isEntry,
        kind: args.kind,
      })}`,
    );
  }
  // Rolldown probes configured entries first with isEntry=false and then with
  // isEntry=true. With no importer there is no source edge to externalize, so both
  // probes must fall through to the ordinary entry resolver.
  if (args.importer === undefined) {
    const exactEntry = EXACT_CAPABILITY_ENTRY_PROBES.get(args.path) ??
      (pass === 'cjs-runtime'
        ? undefined
        : CAPABILITY_ENTRY_DESCRIPTORS.find(
            (descriptor) => descriptor.declarationSource === args.path,
          )?.declarationSource);
    if (exactEntry !== undefined) {
      if (args.kind !== 'import-statement') {
        throw new Error(
          `unreviewed shared-capability entry probe: ${JSON.stringify({
            pass,
            source: args.path,
            isEntry: args.isEntry,
            kind: args.kind,
            capabilitySource: exactEntry,
          })}`,
        );
      }
      return undefined;
    }
    const candidate = /^file:/iu.test(args.path) || path.isAbsolute(args.path)
      ? args.path
      : path.resolve(import.meta.dirname, args.path);
    const capabilitySource = capabilitySourceForImport(candidate, '\0entry-probe');
    if (capabilitySource !== undefined) {
      throw new Error(
        `unreviewed shared-capability entry probe: ${JSON.stringify({
          pass,
          source: args.path,
          isEntry: args.isEntry,
          kind: args.kind,
          capabilitySource,
        })}`,
      );
    }
    return undefined;
  }

  const edge = CAPABILITY_IMPORTS_BY_PASS[pass].find((candidate) =>
    candidate.source === args.path && candidate.importer === args.importer);
  if (edge !== undefined && !args.isEntry && args.kind === 'import-statement') {
    return edge.resolution;
  }

  const capabilitySource = capabilitySourceForImport(args.path, args.importer);
  if (capabilitySource !== undefined) {
    throw new Error(
      `unreviewed shared-capability import: ${JSON.stringify({
        pass,
        source: args.path,
        importer: args.importer,
        isEntry: args.isEntry,
        kind: args.kind,
        capabilitySource,
      })}`,
    );
  }
  return undefined;
}

const SHARED_CAPABILITY_RESOLUTION_CUSTOM_KEY =
  'cortexel-shared-capability-resolution-authority';

function sharedCapabilityAdmissionKey(
  admission: SharedCapabilityAdmission,
): string {
  return JSON.stringify([
    admission.pass,
    admission.importer,
    admission.source,
    admission.kind,
    admission.resolvedId,
  ]);
}

function recordSharedCapabilityAdmission(
  state: SharedCapabilityBuildAuthorityState,
  admission: SharedCapabilityAdmission,
): void {
  if (state.lifecycle !== 'building') {
    throw new Error(
      `shared-capability resolver admission occurred outside an active build: ${state.lifecycle}`,
    );
  }
  const key = sharedCapabilityAdmissionKey(admission);
  const prior = state.admissions.get(key);
  if (prior !== undefined) {
    if (
      prior.pass !== admission.pass ||
      prior.importer !== admission.importer ||
      prior.source !== admission.source ||
      prior.kind !== admission.kind ||
      prior.resolvedId !== admission.resolvedId
    ) {
      throw new Error(
        `ambiguous shared-capability resolver admission: ${JSON.stringify({
          prior,
          admission,
        })}`,
      );
    }
    return;
  }
  state.admissions.set(key, Object.freeze({ ...admission }));
}

function sameDelegation(
  value: unknown,
  expected: SharedCapabilityDelegation,
): value is SharedCapabilityDelegation {
  return value !== null &&
    typeof value === 'object' &&
    (value as SharedCapabilityDelegation).pass === expected.pass &&
    (value as SharedCapabilityDelegation).source === expected.source &&
    (value as SharedCapabilityDelegation).importer === expected.importer &&
    (value as SharedCapabilityDelegation).isEntry === expected.isEntry &&
    (value as SharedCapabilityDelegation).kind === expected.kind;
}

function rawSourcePrivateCapabilityOutput(
  source: string,
  importer: string,
): string | undefined {
  const withoutMetadata = source.split(/[?#]/u, 1)[0] ?? source;
  let candidate: string | undefined;
  if (/^file:/iu.test(withoutMetadata) || path.isAbsolute(withoutMetadata)) {
    candidate = withoutMetadata;
  } else if (withoutMetadata.startsWith('./') || withoutMetadata.startsWith('../')) {
    const importerPhysical = physicalPathFromBuildGraphId(importer);
    if (importerPhysical !== undefined) {
      candidate = path.resolve(path.dirname(importerPhysical), withoutMetadata);
    }
  }
  return candidate === undefined
    ? undefined
    : privateCapabilityOutputIdentity(candidate);
}

function inspectRawCapabilityEdges(
  code: string,
  importer: string,
  format: NormalizedFormat,
  cjsDts: boolean,
): readonly RawCapabilityEdgeEvidence[] {
  if (code.length > SHARED_CAPABILITY_BUILD_LIMITS.moduleCodeUnits) {
    throw new Error(
      `transformed module exceeds the shared-capability code bound: ${importer}`,
    );
  }
  const sourceFile = ts.createSourceFile(
    importer,
    code,
    ts.ScriptTarget.Latest,
    true,
    /\.tsx$/u.test(importer) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const diagnostics = (
    sourceFile as ts.SourceFile & {
      readonly parseDiagnostics?: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    throw new Error(
      `cannot inspect transformed module capability edges ${importer}: ${ts.flattenDiagnosticMessageText(
        diagnostics[0]?.messageText ?? 'unknown parse failure',
        '\n',
      )}`,
    );
  }

  const rawEdges: Array<{
    readonly source: string;
    readonly kind: SharedCapabilityResolveKind;
    readonly sourceStart: number;
  }> = [];
  const addEdge = (
    literal: ts.Expression | undefined,
    kind: SharedCapabilityResolveKind,
  ): void => {
    if (literal === undefined || !ts.isStringLiteralLike(literal)) return;
    rawEdges.push({
      source: literal.text,
      kind,
      sourceStart: literal.getStart(sourceFile),
    });
    if (rawEdges.length > SHARED_CAPABILITY_BUILD_LIMITS.edgesPerModule) {
      throw new Error(
        `transformed module exceeds the shared-capability edge bound: ${importer}`,
      );
    }
  };
  const pendingNodes: ts.Node[] = [sourceFile];
  let visitedNodes = 0;
  while (pendingNodes.length > 0) {
    const node = pendingNodes.pop();
    if (node === undefined) break;
    visitedNodes += 1;
    if (visitedNodes > SHARED_CAPABILITY_BUILD_LIMITS.syntaxNodesPerModule) {
      throw new Error(
        `transformed module exceeds the shared-capability syntax-node bound: ${importer}`,
      );
    }
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addEdge(node.moduleSpecifier, 'import-statement');
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addEdge(node.moduleReference.expression, 'require-call');
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addEdge(node.arguments[0], 'dynamic-import');
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require'
      ) {
        addEdge(node.arguments[0], 'require-call');
      }
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      addEdge(node.argument.literal, 'dynamic-import');
    }
    ts.forEachChild(node, (child) => {
      pendingNodes.push(child);
    });
  }
  rawEdges.sort((left, right) => left.sourceStart - right.sourceStart);

  const evidence: RawCapabilityEdgeEvidence[] = [];
  for (const edge of rawEdges) {
    const privateOutput = rawSourcePrivateCapabilityOutput(edge.source, importer);
    if (privateOutput !== undefined) {
      throw new Error(
        `transformed module directly references a private capability output: ${JSON.stringify({
          importer,
          source: edge.source,
          kind: edge.kind,
          privateOutput,
        })}`,
      );
    }
    let resolution: SharedCapabilityResolution | undefined;
    try {
      resolution = resolveSharedCapabilityImportForBuild({
        path: edge.source,
        importer,
        isEntry: false,
        kind: edge.kind,
        format,
        cjsDts,
      });
    } catch (error) {
      throw new Error(
        `transformed module contains an unreviewed capability-like edge: ${JSON.stringify({
          importer,
          source: edge.source,
          kind: edge.kind,
        })}`,
        { cause: error },
      );
    }
    evidence.push(Object.freeze({
      source: edge.source,
      kind: edge.kind,
      sourceStart: edge.sourceStart,
      reviewedAdmission: resolution === undefined
        ? null
        : Object.freeze({
            pass: sharedCapabilityBuildPass(format, cjsDts),
            importer,
            source: edge.source,
            kind: 'import-statement',
            resolvedId: resolution.path,
          }),
    }));
  }
  return Object.freeze(evidence);
}

function recordRawCapabilityModule(
  state: SharedCapabilityBuildAuthorityState,
  code: string,
  id: string,
  format: NormalizedFormat,
  cjsDts: boolean,
): void {
  if (state.lifecycle !== 'building') {
    throw new Error(
      `module capability evidence arrived outside an active build: ${state.lifecycle}`,
    );
  }
  if (state.rawModules.has(id)) {
    throw new Error(`module capability evidence was published twice: ${id}`);
  }
  if (state.rawModules.size >= SHARED_CAPABILITY_BUILD_LIMITS.modules) {
    throw new Error('build exceeds the shared-capability module-count bound');
  }
  const nextCodeUnits = state.aggregateRawCodeUnits + code.length;
  if (nextCodeUnits > SHARED_CAPABILITY_BUILD_LIMITS.aggregateCodeUnits) {
    throw new Error('build exceeds the shared-capability aggregate code bound');
  }
  const edges = inspectRawCapabilityEdges(code, id, format, cjsDts);
  const nextEdges = state.aggregateRawEdges + edges.length;
  if (nextEdges > SHARED_CAPABILITY_BUILD_LIMITS.aggregateEdges) {
    throw new Error('build exceeds the shared-capability aggregate edge bound');
  }
  state.aggregateRawCodeUnits = nextCodeUnits;
  state.aggregateRawEdges = nextEdges;
  state.rawModules.set(id, Object.freeze({ code, edges }));
}

function ownDataValue(value: object, key: PropertyKey, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    descriptor === undefined ||
    !Object.hasOwn(descriptor, 'value') ||
    Object.hasOwn(descriptor, 'get') ||
    Object.hasOwn(descriptor, 'set')
  ) {
    throw new Error(`${label} must be one own data property`);
  }
  return descriptor.value;
}

function assertDataOnlyPluginShape(plugin: object, label: string): void {
  const prototype = Object.getPrototypeOf(plugin);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} must use an ordinary or null prototype`);
  }
  const keys = Reflect.ownKeys(plugin);
  if (keys.length > SHARED_CAPABILITY_BUILD_LIMITS.pluginMembers) {
    throw new Error(`${label} exceeds the reviewed plugin-member bound`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(plugin, key);
    if (
      descriptor === undefined ||
      !Object.hasOwn(descriptor, 'value') ||
      Object.hasOwn(descriptor, 'get') ||
      Object.hasOwn(descriptor, 'set')
    ) {
      throw new Error(`${label} contains an accessor or ambiguous plugin member`);
    }
  }
}

function assertBoundedDataOnlyHookValue(value: unknown, label: string): void {
  let visitedNodes = 0;
  const seen = new WeakSet<object>();
  const pending: Array<{ readonly value: unknown; readonly depth: number; readonly label: string }> =
    [{ value, depth: 0, label }];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    if (
      current.value === null ||
      typeof current.value === 'string' ||
      typeof current.value === 'number' ||
      typeof current.value === 'boolean' ||
      typeof current.value === 'undefined' ||
      typeof current.value === 'function'
    ) {
      continue;
    }
    if (typeof current.value !== 'object') {
      throw new Error(`${current.label} contains an unsupported hook value`);
    }
    if (seen.has(current.value)) {
      throw new Error(`${current.label} contains a cyclic hook record`);
    }
    seen.add(current.value);
    visitedNodes += 1;
    if (visitedNodes > SHARED_CAPABILITY_BUILD_LIMITS.pluginNodes) {
      throw new Error(`${label} exceeds the reviewed hook-node bound`);
    }
    if (current.depth >= SHARED_CAPABILITY_BUILD_LIMITS.pluginDepth) {
      throw new Error(`${current.label} exceeds the reviewed hook-depth bound`);
    }
    const prototype = Object.getPrototypeOf(current.value);
    const isArray = Array.isArray(current.value);
    if (
      prototype !== Object.prototype &&
      prototype !== null &&
      !(isArray && prototype === Array.prototype) &&
      prototype !== RegExp.prototype &&
      !REVIEWED_ROLLDOWN_FILTER_PROTOTYPES.has(prototype as object)
    ) {
      throw new Error(`${current.label} must contain only ordinary hook records`);
    }
    if (
      isArray &&
      current.value.length > SHARED_CAPABILITY_BUILD_LIMITS.pluginNodes
    ) {
      throw new Error(`${current.label} exceeds the reviewed hook-array bound`);
    }
    const keys = Reflect.ownKeys(current.value);
    if (keys.length > SHARED_CAPABILITY_BUILD_LIMITS.pluginMembers) {
      throw new Error(`${current.label} exceeds the reviewed hook-member bound`);
    }
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key);
      if (
        descriptor === undefined ||
        !Object.hasOwn(descriptor, 'value') ||
        Object.hasOwn(descriptor, 'get') ||
        Object.hasOwn(descriptor, 'set')
      ) {
        throw new Error(`${current.label} contains an accessor or ambiguous hook member`);
      }
      pending.push({
        value: descriptor.value,
        depth: current.depth + 1,
        label: `${current.label}.${String(key)}`,
      });
    }
  }
}

function assertDataOnlyPluginHookRecords(plugin: object, label: string): void {
  for (const hookName of ROLLDOWN_PLUGIN_HOOK_NAMES) {
    const descriptor = Object.getOwnPropertyDescriptor(plugin, hookName);
    if (descriptor === undefined || descriptor.value === null) continue;
    if (
      !Object.hasOwn(descriptor, 'value') ||
      Object.hasOwn(descriptor, 'get') ||
      Object.hasOwn(descriptor, 'set')
    ) {
      throw new Error(`${label}.${hookName} must be one data hook`);
    }
    if (typeof descriptor.value === 'object') {
      assertBoundedDataOnlyHookValue(descriptor.value, `${label}.${hookName}`);
    }
  }
}

function freezeSharedCapabilityAuthorityPlugin<T extends TsdownPlugin>(
  plugin: T,
  label: string,
): T {
  // Rolldown passes the complete plugin roster through every input-options hook.
  // Lock every build-authority member and each object-form hook before exposing
  // the roster; binding only the array and plugin identity would still let an
  // earlier hook replace the resolver or erase a later audit in place.
  const inspectCustom = Symbol.for('nodejs.util.inspect.custom');
  Object.defineProperty(plugin, inspectCustom, {
    configurable: false,
    enumerable: false,
    value: undefined,
    writable: true,
  });
  assertDataOnlyPluginShape(plugin, label);
  assertDataOnlyPluginHookRecords(plugin, label);
  for (const key of Reflect.ownKeys(plugin)) {
    const value = ownDataValue(plugin, key, `${label} member`);
    if (typeof value === 'function') Object.freeze(value);
    if (value !== null && typeof value === 'object') {
      assertDataOnlyPluginShape(value, `${label} ${String(key)} hook`);
      for (const hookKey of Reflect.ownKeys(value)) {
        const hookMember = ownDataValue(
          value,
          hookKey,
          `${label} ${String(key)} hook member`,
        );
        if (typeof hookMember === 'function') Object.freeze(hookMember);
      }
      Object.freeze(value);
    }
    if (key !== inspectCustom) {
      const descriptor = Object.getOwnPropertyDescriptor(plugin, key);
      if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
        throw new Error(`${label} member lost its data descriptor`);
      }
      Object.defineProperty(plugin, key, {
        ...descriptor,
        configurable: false,
        writable: false,
      });
    }
  }
  // tsdown's optional DEBUG serializer writes only this exact non-semantic
  // inspection hook. Keep that predeclared slot writable while making the
  // object non-extensible and every build-authority member immutable.
  Object.preventExtensions(plugin);
  return plugin;
}

function sealIntermediateOutputOptionsBoundary(
  plugin: object,
  label: string,
): SharedCapabilityOutputOptionsBoundary {
  const descriptor = Object.getOwnPropertyDescriptor(plugin, 'outputOptions');
  if (descriptor === undefined) {
    if (!Object.isExtensible(plugin)) {
      // A non-extensible null-prototype plugin has no inherited lookup path and
      // therefore needs no own sentinel. An ordinary non-extensible object could
      // later inherit an Object.prototype hook that this build did not seal.
      if (Object.getPrototypeOf(plugin) !== null) {
        throw new Error(`${label} cannot seal an absent inherited outputOptions lookup`);
      }
      return Object.freeze({ kind: 'absent-null-prototype' });
    }
    if (
      Reflect.ownKeys(plugin).length >=
      SHARED_CAPABILITY_BUILD_LIMITS.pluginMembers
    ) {
      throw new Error(`${label} cannot add a sealed outputOptions sentinel`);
    }
    Object.defineProperty(plugin, 'outputOptions', {
      configurable: false,
      enumerable: false,
      value: undefined,
      writable: false,
    });
    return Object.freeze({
      kind: 'sealed-own-data',
      value: undefined,
      enumerable: false,
    });
  }
  if (
    !Object.hasOwn(descriptor, 'value') ||
    Object.hasOwn(descriptor, 'get') ||
    Object.hasOwn(descriptor, 'set')
  ) {
    throw new Error(`${label} has an accessor outputOptions hook`);
  }

  const hook = descriptor.value;
  if (typeof hook === 'function') {
    Object.freeze(hook);
  } else if (hook !== undefined && hook !== null && typeof hook === 'object') {
    assertDataOnlyPluginShape(hook, `${label}.outputOptions`);
    const hookKeys = Reflect.ownKeys(hook);
    if (
      !hookKeys.includes('handler') ||
      hookKeys.some((key) => key !== 'handler' && key !== 'order')
    ) {
      throw new Error(
        `${label}.outputOptions must contain only handler and optional order`,
      );
    }
    const handler = ownDataValue(hook, 'handler', `${label}.outputOptions.handler`);
    if (typeof handler !== 'function') {
      throw new Error(`${label}.outputOptions.handler must be a function`);
    }
    if (Object.hasOwn(hook, 'order')) {
      const order = ownDataValue(hook, 'order', `${label}.outputOptions.order`);
      if (order !== undefined && order !== null && order !== 'pre' && order !== 'post') {
        throw new Error(`${label}.outputOptions.order is outside the reviewed vocabulary`);
      }
    }
    Object.freeze(handler);
    Object.freeze(hook);
  } else if (hook !== undefined) {
    throw new Error(`${label}.outputOptions must be undefined, a function, or an object hook`);
  }

  Object.defineProperty(plugin, 'outputOptions', {
    ...descriptor,
    configurable: false,
    writable: false,
  });
  return Object.freeze({
    kind: 'sealed-own-data',
    value: hook,
    enumerable: descriptor.enumerable ?? false,
  });
}

function assertExactIntermediateOutputOptionsBoundary(
  plugin: object,
  boundary: SharedCapabilityOutputOptionsBoundary,
  label: string,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(plugin, 'outputOptions');
  if (boundary.kind === 'absent-null-prototype') {
    if (
      descriptor !== undefined ||
      Object.getPrototypeOf(plugin) !== null ||
      Object.isExtensible(plugin)
    ) {
      throw new Error(`${label} changed its sealed absent outputOptions boundary`);
    }
    return;
  }
  if (
    descriptor === undefined ||
    !Object.hasOwn(descriptor, 'value') ||
    descriptor.value !== boundary.value ||
    descriptor.enumerable !== boundary.enumerable ||
    descriptor.configurable !== false ||
    descriptor.writable !== false
  ) {
    throw new Error(`${label} changed its sealed outputOptions boundary`);
  }
  if (
    (typeof boundary.value === 'function' ||
      (boundary.value !== null && typeof boundary.value === 'object')) &&
    !Object.isFrozen(boundary.value)
  ) {
    throw new Error(`${label} changed its frozen outputOptions hook`);
  }
}

function flattenSharedCapabilityPlugins(
  input: unknown,
  label: string,
): TsdownPlugin[] {
  const plugins: TsdownPlugin[] = [];
  let visitedNodes = 0;
  const pending: Array<{ readonly value: unknown; readonly depth: number }> = [{
    value: input,
    depth: 0,
  }];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    visitedNodes += 1;
    if (visitedNodes > SHARED_CAPABILITY_BUILD_LIMITS.pluginNodes) {
      throw new Error(`${label} exceeds the reviewed roster-node bound`);
    }
    if (
      current.value === undefined ||
      current.value === null ||
      current.value === false
    ) {
      continue;
    }
    if (Array.isArray(current.value)) {
      if (current.depth >= SHARED_CAPABILITY_BUILD_LIMITS.pluginDepth) {
        throw new Error(`${label} exceeds the reviewed nesting-depth bound`);
      }
      if (Object.getPrototypeOf(current.value) !== Array.prototype) {
        throw new Error(`${label} arrays must use the exact Array prototype`);
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(current.value, 'length');
      if (
        lengthDescriptor === undefined ||
        !Object.hasOwn(lengthDescriptor, 'value') ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > SHARED_CAPABILITY_BUILD_LIMITS.pluginNodes
      ) {
        throw new Error(`${label} exceeds the reviewed array-length bound`);
      }
      const length = lengthDescriptor.value as number;
      if (Reflect.ownKeys(current.value).length !== length + 1) {
        throw new Error(`${label} arrays must contain exactly dense indexed members`);
      }
      for (let index = length - 1; index >= 0; index -= 1) {
        const descriptor = Object.getOwnPropertyDescriptor(current.value, String(index));
        if (
          descriptor === undefined ||
          !Object.hasOwn(descriptor, 'value') ||
          Object.hasOwn(descriptor, 'get') ||
          Object.hasOwn(descriptor, 'set')
        ) {
          throw new Error(`${label} arrays contain an accessor, hole, or ambiguous member`);
        }
        pending.push({
          value: descriptor.value,
          depth: current.depth + 1,
        });
      }
      continue;
    }
    if (typeof current.value !== 'object') {
      throw new Error(`${label} contains a non-plugin value`);
    }
    assertDataOnlyPluginShape(current.value, label);
    assertDataOnlyPluginHookRecords(current.value, label);
    const name = ownDataValue(current.value, 'name', `${label} plugin name`);
    if (
      typeof name !== 'string' ||
      name.length === 0 ||
      name.length > SHARED_CAPABILITY_BUILD_LIMITS.pluginNameUnits
    ) {
      throw new Error(`${label} contains an invalid bounded plugin name`);
    }
    plugins.push(current.value as TsdownPlugin);
    if (plugins.length > SHARED_CAPABILITY_BUILD_LIMITS.plugins) {
      throw new Error(`${label} exceeds the reviewed plugin-count bound`);
    }
  }
  return plugins;
}

function assertPreOrderedFirstResolver(plugin: TsdownPlugin): void {
  const hook = ownDataValue(plugin, 'resolveId', 'first capability resolver hook');
  if (hook === null || typeof hook !== 'object') {
    throw new Error('first capability resolver must use an ordered object hook');
  }
  const order = ownDataValue(hook, 'order', 'first capability resolver order');
  const handler = ownDataValue(hook, 'handler', 'first capability resolver handler');
  if (order !== 'pre' || typeof handler !== 'function') {
    throw new Error('first capability resolver must be one pre-ordered handler');
  }
}

function sealSharedCapabilityPluginComposition(
  state: SharedCapabilityBuildAuthorityState,
  firstResolver: TsdownPlugin,
  finalAuditor: TsdownPlugin,
  intermediate: unknown,
): TsdownPlugin[] {
  if (state.lifecycle !== 'new' || state.compositionSealed) {
    throw new Error('shared-capability plugin composition was already sealed or started');
  }
  assertPreOrderedFirstResolver(firstResolver);
  // This pins an ordinary same-process plugin composition; plugin code still has
  // the authority of this Node process. Accessor-free shape checks avoid invoking
  // plugin getters, but arbitrary Proxy traps or deliberately malicious plugins
  // require a separate process sandbox and are outside this build evidence.
  const middle = flattenSharedCapabilityPlugins(
    intermediate,
    'shared-capability intermediate plugin roster',
  );
  const outputOptionsBoundaries = middle.map((plugin) => {
    const name = ownDataValue(plugin, 'name', 'intermediate plugin name');
    if (
      plugin === firstResolver ||
      plugin === finalAuditor ||
      name === 'cortexel-shared-capabilities' ||
      name === 'cortexel-capability-module-ownership'
    ) {
      throw new Error('shared-capability plugin roster contains a reserved duplicate');
    }
    return sealIntermediateOutputOptionsBoundary(
      plugin,
      `intermediate plugin ${String(name)}`,
    );
  });
  const plugins = [firstResolver, ...middle, finalAuditor];
  if (plugins.length > SHARED_CAPABILITY_BUILD_LIMITS.plugins) {
    throw new Error('shared-capability plugin roster exceeds the reviewed count bound');
  }
  state.pluginRoster = Object.freeze(plugins.map((plugin, index) => Object.freeze({
    index,
    name: ownDataValue(plugin, 'name', 'sealed plugin name') as string,
    plugin,
    outputOptionsBoundary:
      index === 0 || index === plugins.length - 1
        ? null
        : outputOptionsBoundaries[index - 1] ?? null,
  })));
  state.compositionSealed = true;
  return Object.freeze(plugins) as TsdownPlugin[];
}

function assertExactSealedPluginRoster(
  state: SharedCapabilityBuildAuthorityState,
  plugins: unknown,
): void {
  const expected = state.pluginRoster;
  if (!state.compositionSealed || expected === undefined) {
    throw new Error('shared-capability plugin roster was not sealed');
  }
  const observed = flattenSharedCapabilityPlugins(
    plugins,
    'normalized shared-capability plugin roster',
  );
  if (
    observed.length !== expected.length ||
    expected.some((entry, index) =>
      entry.index !== index ||
      entry.plugin !== observed[index] ||
      ownDataValue(observed[index] as TsdownPlugin, 'name', 'normalized plugin name') !==
        entry.name)
  ) {
    throw new Error(
      `normalized plugin roster differs from the sealed authority: ${JSON.stringify({
        expected: expected.map(({ index, name }) => ({ index, name })),
        observed: observed.map((plugin, index) => ({
          index,
          name: ownDataValue(plugin, 'name', 'observed plugin name'),
        })),
      })}`,
    );
  }
  assertPreOrderedFirstResolver(observed[0] as TsdownPlugin);
  for (let index = 1; index < observed.length - 1; index += 1) {
    const plugin = observed[index] as TsdownPlugin;
    const name = ownDataValue(plugin, 'name', 'normalized intermediate plugin name');
    const boundary = expected[index]?.outputOptionsBoundary;
    if (boundary === undefined || boundary === null) {
      throw new Error('sealed intermediate plugin has no outputOptions boundary');
    }
    assertExactIntermediateOutputOptionsBoundary(
      plugin,
      boundary,
      `normalized intermediate plugin ${String(name)}`,
    );
  }
}

function snapshotExternalMatcher(
  external: unknown,
): (id: string, parentId: string | undefined, isResolved: boolean) =>
  boolean | null | undefined {
  if (external === undefined) return () => false;
  if (typeof external === 'function') {
    return external as (
      id: string,
      parentId: string | undefined,
      isResolved: boolean,
    ) => boolean | null | undefined;
  }
  const members = Array.isArray(external) ? external : [external];
  if (members.length > SHARED_CAPABILITY_BUILD_LIMITS.externalEntries) {
    throw new Error('external policy exceeds the reviewed entry-count bound');
  }
  const snapshot = members.map((member) => {
    if (typeof member === 'string') {
      if (member.length > SHARED_CAPABILITY_BUILD_LIMITS.externalStringUnits) {
        throw new Error('external string exceeds the reviewed length bound');
      }
      return member;
    }
    if (member instanceof RegExp) return new RegExp(member.source, member.flags);
    throw new Error('external policy contains an unsupported matcher');
  });
  return (id) => snapshot.some((member) => {
    if (typeof member === 'string') return member === id;
    member.lastIndex = 0;
    return member.test(id);
  });
}

function sourceCapabilityIdentity(
  source: string,
  importer: string | undefined,
): string | undefined {
  const directPhysical = physicalPathFromBuildGraphId(source);
  if (directPhysical !== undefined) {
    const identity = physicalCapabilitySourceIdentity(directPhysical);
    if (identity !== undefined) return identity;
  }
  if (importer === undefined) {
    const repositoryRelative = EXACT_CAPABILITY_ENTRY_PROBES.get(source);
    if (repositoryRelative !== undefined) return repositoryRelative;
    if (!/^\0/u.test(source) && !/^[A-Za-z][A-Za-z+.-]*:/u.test(source)) {
      return physicalCapabilitySourceIdentity(path.resolve(import.meta.dirname, source));
    }
    return undefined;
  }
  return capabilitySourceForImport(source, importer);
}

function createGuardedExternalPolicy(
  external: unknown,
): GuardedExternalPolicy {
  const delegate = snapshotExternalMatcher(external);
  return (id, parentId, isResolved) => {
    if (typeof id !== 'string' || typeof isResolved !== 'boolean') {
      throw new Error('external policy received an invalid native callback tuple');
    }
    const normalizedParentId = normalizeRolldownOptionalImporter(
      parentId,
      'external policy parentId',
    );
    if (isReservedCapabilitySpecifierVariant(id)) {
      throw new Error(`external policy received a reserved capability specifier: ${id}`);
    }
    const privateOutput = privateCapabilityOutputIdentity(id) ??
      (normalizedParentId === undefined
        ? undefined
        : rawSourcePrivateCapabilityOutput(id, normalizedParentId));
    if (privateOutput !== undefined) {
      throw new Error(
        `external policy received a private capability output: ${JSON.stringify({
          id,
          parentId: normalizedParentId,
          privateOutput,
        })}`,
      );
    }
    const capabilitySource = sourceCapabilityIdentity(id, normalizedParentId);
    if (capabilitySource !== undefined) return false;
    return delegate(id, normalizedParentId, isResolved);
  };
}

function assertEmptyAliasPolicy(value: unknown): void {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Reflect.ownKeys(value).length !== 0
  ) {
    throw new Error('native resolve.alias must remain one exact empty record');
  }
}

function assertNoOutputPlugins(value: unknown): void {
  const plugins = flattenSharedCapabilityPlugins(value, 'output plugin roster');
  if (plugins.length !== 0) {
    throw new Error('output plugins are outside the reviewed capability build composition');
  }
}

/**
 * Validated requests, successful figure results, and prepared graph presentations
 * are identity capabilities, each backed by a module-private WeakSet. Bundling an
 * authority module into public entries would create multiple registries (especially
 * for CommonJS), so every public bundle resolves those source imports to one
 * package-private CommonJS runtime module. ESM and CommonJS can both load the same
 * CJS module-cache entry; no forgeable global symbol is involved.
 */
function sharedCapabilityExternalizerForBuild(
  format: NormalizedFormat,
  context: { readonly cjsDts: boolean },
  state: SharedCapabilityBuildAuthorityState,
): TsdownPlugin {
  const cjsDts = context.cjsDts;
  // Validate the pass when the plugin is constructed, including builds that do
  // not happen to contain an authority edge.
  const pass = sharedCapabilityBuildPass(format, cjsDts);
  if (state.pass !== pass) {
    throw new Error('shared-capability resolver received authority from another build pass');
  }
  return freezeSharedCapabilityAuthorityPlugin({
    name: 'cortexel-shared-capabilities',
    outputOptions: {
      // This is the first sealed input plugin and the first pre-ordered output
      // hook. Reject a separate output-plugin roster before any such plugin can
      // execute and erase its own evidence from the sequential options object.
      // The final post auditor independently checks the state after every
      // legitimate sealed input-plugin outputOptions hook has run.
      order: 'pre',
      handler(options) {
        try {
          if (
            state.lifecycle !== 'new' ||
            !state.optionsAudited ||
            state.initialOutputOptionsAudited ||
            state.outputOptionsAudited
          ) {
            throw new Error(
              `shared-capability initial output options arrived out of lifecycle order: ${state.lifecycle}`,
            );
          }
          assertNoOutputPlugins(options.plugins);
          state.initialOutputOptionsAudited = true;
          return null;
        } catch (error) {
          state.lifecycle = 'failed';
          throw error;
        }
      },
    },
    buildStart: {
      order: 'pre',
      handler() {
        if (
          state.lifecycle !== 'new' ||
          !state.compositionSealed ||
          !state.optionsAudited ||
          !state.initialOutputOptionsAudited ||
          !state.outputOptionsAudited ||
          state.guardedExternal === undefined ||
          state.sealedAlias === undefined ||
          state.admissions.size !== 0 ||
          state.rawModules.size !== 0 ||
          state.aggregateRawCodeUnits !== 0 ||
          state.aggregateRawEdges !== 0 ||
          state.buildEndCalls !== 0 ||
          state.generateBundleCalls !== 0
        ) {
          throw new Error(
            `shared-capability build authority is stale, unsealed, or already active: ${state.lifecycle}`,
          );
        }
        state.lifecycle = 'building';
      },
    },
    resolveId: {
      order: 'pre',
      async handler(source, importer, extraOptions) {
        if (state.lifecycle !== 'building') {
          throw new Error(
            `shared-capability resolution occurred outside an active build: ${state.lifecycle}`,
          );
        }
        if (typeof source !== 'string') {
          throw new Error('shared-capability resolver source must be a string');
        }
        const normalizedImporter = normalizeRolldownOptionalImporter(
          importer,
          'shared-capability resolver importer',
        );
        const currentDelegation = normalizedImporter === undefined
          ? undefined
          : Object.freeze({
              pass,
              source,
              importer: normalizedImporter,
              isEntry: extraOptions.isEntry,
              kind: extraOptions.kind,
            } satisfies SharedCapabilityDelegation);
        const presentedDelegation = extraOptions.custom?.[
          SHARED_CAPABILITY_RESOLUTION_CUSTOM_KEY
        ];
        if (
          currentDelegation !== undefined &&
          presentedDelegation !== null &&
          typeof presentedDelegation === 'object' &&
          state.activeDelegations.has(presentedDelegation) &&
          sameDelegation(presentedDelegation, currentDelegation)
        ) {
          return undefined;
        }
        if (
          presentedDelegation !== undefined &&
          (
            presentedDelegation === null ||
            typeof presentedDelegation !== 'object' ||
            !state.activeDelegations.has(presentedDelegation)
          )
        ) {
          throw new Error('resolver received a stale or forged capability delegation marker');
        }
        const resolution = resolveSharedCapabilityImportForBuild({
          path: source,
          importer: normalizedImporter,
          isEntry: extraOptions.isEntry,
          kind: extraOptions.kind,
          format,
          cjsDts,
        });
        if (resolution !== undefined) {
          if (normalizedImporter === undefined) {
            throw new Error('shared-capability source admission lacks an importer');
          }
          recordSharedCapabilityAdmission(state, {
            pass,
            importer: normalizedImporter,
            source,
            kind: 'import-statement',
            resolvedId: resolution.path,
          });
          return { id: resolution.path, external: resolution.external };
        }

        // A unique active marker permits only same-tuple recursion to pass this
        // hook once. It is not bearer authority: a nested different tuple is
        // screened normally, and the composed result is independently classified.
        if (normalizedImporter === undefined || currentDelegation === undefined) {
          return undefined;
        }
        state.activeDelegations.add(currentDelegation);
        let downstream;
        try {
          downstream = await this.resolve(source, normalizedImporter, {
            custom: {
              ...extraOptions.custom,
              [SHARED_CAPABILITY_RESOLUTION_CUSTOM_KEY]: currentDelegation,
            },
            isEntry: extraOptions.isEntry,
            kind: extraOptions.kind,
            skipSelf: true,
          });
        } finally {
          state.activeDelegations.delete(currentDelegation);
        }
        if (downstream === null) {
          throw new Error(
            `composed build resolver could not resolve an imported source: ${JSON.stringify({
              pass,
              source,
              importer: normalizedImporter,
              isEntry: extraOptions.isEntry,
              kind: extraOptions.kind,
            })}`,
          );
        }
        const privateSource = sourceCapabilityIdentity(downstream.id, normalizedImporter);
        const privateOutput = privateCapabilityOutputIdentity(downstream.id);
        if (
          isReservedCapabilitySpecifierVariant(downstream.id) ||
          privateSource !== undefined ||
          privateOutput !== undefined
        ) {
          throw new Error(
            `intermediate resolver produced an unadmitted shared-capability edge: ${JSON.stringify({
              pass,
              source,
              importer: normalizedImporter,
              isEntry: extraOptions.isEntry,
              kind: extraOptions.kind,
              resolvedId: downstream.id,
              external: downstream.external,
              privateSource,
              privateOutput,
            })}`,
          );
        }
        return downstream;
      },
    },
  }, 'first shared-capability resolver');
}

type CapabilityModuleIdentity = {
  readonly canonicalId: string;
  readonly outputBase: string;
  readonly kind: 'runtime' | 'declaration';
};

function capabilityModuleIdentity(id: string): CapabilityModuleIdentity | undefined {
  const withoutMetadata = id.split(/[?#]/u, 1)[0] ?? id;
  let physical: string | undefined;
  if (/^file:/iu.test(withoutMetadata)) {
    try {
      physical = fileURLToPath(new URL(withoutMetadata));
    } catch {
      return undefined;
    }
  } else if (path.isAbsolute(withoutMetadata)) {
    physical = path.resolve(withoutMetadata);
  }
  if (physical === undefined) return undefined;

  const physicalSource = physicalCapabilitySourceIdentity(physical);
  if (physicalSource !== undefined) {
    const descriptor = CAPABILITY_ENTRY_DESCRIPTORS.find(
      (candidate) => candidate.source === physicalSource,
    );
    if (descriptor === undefined) return undefined;
    return {
      canonicalId: descriptor.source,
      outputBase: descriptor.outputBase,
      kind: 'runtime',
    };
  }
  for (const descriptor of CAPABILITY_ENTRY_DESCRIPTORS) {
    if (physical === descriptor.source) {
      return {
        canonicalId: descriptor.source,
        outputBase: descriptor.outputBase,
        kind: 'runtime',
      };
    }
    if (physical === descriptor.declarationSource) {
      return {
        canonicalId: descriptor.declarationSource,
        outputBase: descriptor.outputBase,
        kind: 'declaration',
      };
    }
  }

  let substituted = physical;
  if (/\.d\.[cm]?js$/u.test(substituted) || /\.d\.[cm]?ts$/u.test(substituted)) {
    substituted = substituted.replace(/\.d\.[cm]?[jt]s$/u, '.ts');
  } else if (/\.[cm]?js$/u.test(substituted)) {
    substituted = substituted.replace(/\.[cm]?js$/u, '.ts');
  } else if (path.extname(substituted).length === 0) {
    substituted = `${substituted}.ts`;
  }
  const descriptor = CAPABILITY_ENTRY_DESCRIPTORS.find(
    (candidate) => candidate.source === path.resolve(substituted),
  );
  return descriptor === undefined
    ? undefined
    : {
        canonicalId: descriptor.source,
        outputBase: descriptor.outputBase,
        kind: 'runtime',
      };
}

function expectedCapabilityGraphIds(pass: SharedCapabilityBuildPass): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const descriptor of CAPABILITY_ENTRY_DESCRIPTORS) {
    ids.add(descriptor.source);
    if (pass !== 'cjs-runtime') ids.add(descriptor.declarationSource);
  }
  return ids;
}

type CapabilityChunkTuple = CapabilityModuleIdentity & {
  readonly fileName: string;
};

function expectedCapabilityChunks(pass: SharedCapabilityBuildPass): readonly CapabilityChunkTuple[] {
  const tuples: CapabilityChunkTuple[] = [];
  for (const descriptor of CAPABILITY_ENTRY_DESCRIPTORS) {
    if (pass === 'es-runtime-and-dts') {
      tuples.push({
        canonicalId: descriptor.source,
        outputBase: descriptor.outputBase,
        kind: 'runtime',
        fileName: `${descriptor.outputBase}.js`,
      });
      tuples.push({
        canonicalId: descriptor.declarationSource,
        outputBase: descriptor.outputBase,
        kind: 'declaration',
        fileName: `${descriptor.outputBase}.d.ts`,
      });
    } else if (pass === 'cjs-runtime') {
      tuples.push({
        canonicalId: descriptor.source,
        outputBase: descriptor.outputBase,
        kind: 'runtime',
        fileName: `${descriptor.outputBase}.cjs`,
      });
    } else {
      tuples.push({
        canonicalId: descriptor.declarationSource,
        outputBase: descriptor.outputBase,
        kind: 'declaration',
        fileName: `${descriptor.outputBase}.d.cts`,
      });
    }
  }
  return tuples;
}

/** Final graph/output audit paired with the first resolver through one pass-local ledger. */
function sharedCapabilityOwnershipAuditorForBuild(
  format: NormalizedFormat,
  context: { readonly cjsDts: boolean },
  state: SharedCapabilityBuildAuthorityState,
): TsdownPlugin {
  const pass = sharedCapabilityBuildPass(format, context.cjsDts);
  if (state.pass !== pass) {
    throw new Error('shared-capability auditor received authority from another build pass');
  }
  return freezeSharedCapabilityAuthorityPlugin({
    name: 'cortexel-capability-module-ownership',
    options: {
      order: 'post',
      handler(options) {
        try {
          if (state.lifecycle !== 'new' || state.optionsAudited) {
            throw new Error(
              `shared-capability input options arrived out of lifecycle order: ${state.lifecycle}`,
            );
          }
          assertExactSealedPluginRoster(state, options.plugins);
          if (options.external !== state.guardedExternal) {
            throw new Error('normalized external policy differs from the sealed capability guard');
          }
          const normalizedResolve = ownDataValue(
            options,
            'resolve',
            'normalized resolve options',
          );
          if (normalizedResolve === null || typeof normalizedResolve !== 'object') {
            throw new Error('normalized resolve options must retain the sealed alias record');
          }
          const normalizedAlias = ownDataValue(
            normalizedResolve,
            'alias',
            'normalized resolve alias',
          );
          if (normalizedAlias !== state.sealedAlias) {
            throw new Error('normalized resolve alias differs from the sealed empty record');
          }
          assertEmptyAliasPolicy(normalizedAlias);
          state.optionsAudited = true;
          return null;
        } catch (error) {
          state.lifecycle = 'failed';
          throw error;
        }
      },
    },
    outputOptions: {
      // This auditor is the last sealed input plugin and runs after every normal
      // and post-ordered sealed outputOptions hook. Separate output plugins are
      // rejected, so no accepted outputOptions hook can run after this audit.
      order: 'post',
      handler(options) {
        try {
          // Rolldown 1.2.2 runs outputOptions immediately before buildStart for
          // each generate/write call, then builds and finally generates output.
          if (
            state.lifecycle !== 'new' ||
            !state.optionsAudited ||
            !state.initialOutputOptionsAudited ||
            state.outputOptionsAudited
          ) {
            throw new Error(
              `shared-capability output options arrived out of lifecycle order: ${state.lifecycle}`,
            );
          }
          assertNoOutputPlugins(options.plugins);
          state.outputOptionsAudited = true;
          return null;
        } catch (error) {
          state.lifecycle = 'failed';
          throw error;
        }
      },
    },
    moduleParsed: {
      order: 'post',
      handler(info) {
        try {
          if (info.code === null) {
            return;
          }
          recordRawCapabilityModule(state, info.code, info.id, format, context.cjsDts);
        } catch (error) {
          state.lifecycle = 'failed';
          throw error;
        }
      },
    },
    buildEnd: {
      order: 'post',
      handler(error) {
        // Rolldown 1.2.2 supplies null on success despite the Rollup-compatible
        // optional-Error type; preserve only a truthy primary build failure.
        state.buildEndCalls += 1;
        if (error) {
          state.lifecycle = 'failed';
          return;
        }
        try {
          if (state.lifecycle !== 'building' || state.buildEndCalls !== 1) {
            throw new Error(
              `shared-capability build ended out of lifecycle order: ${state.lifecycle}`,
            );
          }
          const moduleIds: string[] = [];
          for (const id of this.getModuleIds()) {
            if (moduleIds.length >= SHARED_CAPABILITY_BUILD_LIMITS.modules) {
              throw new Error('build graph exceeds the shared-capability module-count bound');
            }
            moduleIds.push(id);
          }
          const expected = expectedCapabilityGraphIds(pass);
          const observed = new Set<string>();
          const observedRawModules = new Set<string>();
          const observedGraphAdmissions = new Set<string>();
          for (const id of moduleIds) {
            const info = this.getModuleInfo(id);
            if (info === null) {
              throw new Error(`build graph lost module information before capability audit: ${id}`);
            }

            if (info.code !== null) {
              const recorded = state.rawModules.get(id);
              if (recorded === undefined) {
                throw new Error(`moduleParsed omitted transformed module evidence: ${id}`);
              }
              const reparsed = inspectRawCapabilityEdges(
                info.code,
                id,
                format,
                context.cjsDts,
              );
              if (
                recorded.code !== info.code ||
                JSON.stringify(recorded.edges) !== JSON.stringify(reparsed)
              ) {
                throw new Error(`transformed module evidence changed after moduleParsed: ${id}`);
              }
              observedRawModules.add(id);
            } else if (state.rawModules.has(id)) {
              throw new Error(`transformed module evidence became external before buildEnd: ${id}`);
            }

            for (const [kind, importedIds] of [
              ['import-statement', info.importedIds],
              ['dynamic-import', info.dynamicallyImportedIds],
            ] as const) {
              for (const importedId of importedIds) {
                const privateSource = sourceCapabilityIdentity(importedId, id);
                const privateOutput = privateCapabilityOutputIdentity(importedId) ??
                  rawSourcePrivateCapabilityOutput(importedId, id);
                if (privateSource !== undefined || privateOutput !== undefined) {
                  throw new Error(
                    `build graph contains a direct private capability edge: ${JSON.stringify({
                      pass,
                      importer: id,
                      importedId,
                      kind,
                      privateSource,
                      privateOutput,
                    })}`,
                  );
                }
                if (!isReservedCapabilitySpecifierVariant(importedId)) continue;
                if (
                  kind !== 'import-statement' ||
                  !RESERVED_RUNTIME_CAPABILITY_SPECIFIERS.has(importedId)
                ) {
                  throw new Error(
                    `reserved shared-capability graph edge used an unreviewed identity or kind: ${JSON.stringify({
                      pass,
                      importer: id,
                      importedId,
                      kind,
                    })}`,
                  );
                }
                const admissions = [...state.admissions.values()].filter((admission) =>
                  admission.pass === pass &&
                  admission.importer === id &&
                  admission.kind === kind &&
                  admission.resolvedId === importedId);
                if (admissions.length !== 1) {
                  throw new Error(
                    `reserved shared-capability graph edge lacks one exact first-resolver admission: ${JSON.stringify({
                      pass,
                      importer: id,
                      importedId,
                      kind,
                      admissions,
                    })}`,
                  );
                }
                const admission = admissions[0] as SharedCapabilityAdmission;
                const reviewed = CAPABILITY_IMPORTS_BY_PASS[pass].find((edge) =>
                  edge.importer === admission.importer &&
                  edge.source === admission.source &&
                  edge.resolution.path === admission.resolvedId);
                if (reviewed === undefined) {
                  throw new Error(
                    `reserved graph admission no longer matches the reviewed table: ${JSON.stringify(admission)}`,
                  );
                }
                observedGraphAdmissions.add(sharedCapabilityAdmissionKey(admission));
              }
            }

            const identity = capabilityModuleIdentity(id);
            if (identity === undefined) continue;
            if (id !== identity.canonicalId) {
              throw new Error(`private capability module used a noncanonical graph id: ${id}`);
            }
            if (!expected.has(identity.canonicalId)) {
              throw new Error(`private capability module entered the wrong build pass: ${id}`);
            }
            if (observed.has(identity.canonicalId)) {
              throw new Error(`private capability module has duplicate graph identities: ${id}`);
            }
            if (
              !info.isEntry ||
              info.importers.length !== 0 ||
              info.dynamicImporters.length !== 0
            ) {
              throw new Error(
                `private capability module is not an importer-free exact entry: ${JSON.stringify({
                  id,
                  isEntry: info.isEntry,
                  importers: info.importers,
                  dynamicImporters: info.dynamicImporters,
                })}`,
              );
            }
            observed.add(identity.canonicalId);
          }
          if (
            observedRawModules.size !== state.rawModules.size ||
            [...state.rawModules.keys()].some((id) => !observedRawModules.has(id))
          ) {
            throw new Error('moduleParsed transformed-module closure differs from buildEnd');
          }
          if (
            observed.size !== expected.size ||
            [...expected].some((id) => !observed.has(id))
          ) {
            throw new Error(
              `private capability module graph closure mismatch: ${JSON.stringify({
                expected: [...expected].sort(),
                observed: [...observed].sort(),
              })}`,
            );
          }

          const rawAdmissionCounts = new Map<string, number>();
          for (const moduleEvidence of state.rawModules.values()) {
            for (const edge of moduleEvidence.edges) {
              if (edge.reviewedAdmission === null) continue;
              const key = sharedCapabilityAdmissionKey(edge.reviewedAdmission);
              rawAdmissionCounts.set(key, (rawAdmissionCounts.get(key) ?? 0) + 1);
            }
          }
          const invalidRawCount = [...rawAdmissionCounts].find(([, count]) => count !== 1);
          if (invalidRawCount !== undefined) {
            throw new Error(
              `reviewed raw capability edge occurred more than once: ${JSON.stringify(invalidRawCount)}`,
            );
          }
          if (
            rawAdmissionCounts.size !== state.admissions.size ||
            [...state.admissions.keys()].some((key) => rawAdmissionCounts.get(key) !== 1)
          ) {
            throw new Error(
              `raw transformed capability closure differs from resolver admissions: ${JSON.stringify({
                rawAdmissionKeys: [...rawAdmissionCounts.keys()].sort(),
                resolverAdmissionKeys: [...state.admissions.keys()].sort(),
              })}`,
            );
          }
          if (
            observedGraphAdmissions.size !== state.admissions.size ||
            [...state.admissions.keys()].some((key) => !observedGraphAdmissions.has(key))
          ) {
            throw new Error(
              `shared-capability graph closure differs from resolver admissions: ${JSON.stringify({
                resolverAdmissionKeys: [...state.admissions.keys()].sort(),
                graphAdmissionKeys: [...observedGraphAdmissions].sort(),
              })}`,
            );
          }
          state.lifecycle = 'built';
        } catch (auditError) {
          state.lifecycle = 'failed';
          throw auditError;
        }
      },
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        state.generateBundleCalls += 1;
        try {
          if (
            state.lifecycle !== 'built' ||
            !state.outputOptionsAudited ||
            state.generateBundleCalls !== 1
          ) {
            throw new Error(
              `shared-capability output generation arrived out of lifecycle order: ${state.lifecycle}`,
            );
          }
          state.lifecycle = 'generating';
          const expected = expectedCapabilityChunks(pass);
          const expectedById = new Map(expected.map((tuple) => [tuple.canonicalId, tuple]));
          const privateOutputKeys = new Set(expected.map((tuple) => tuple.fileName));
          const observed = new Set<string>();
          let outputCount = 0;
          for (const bundleKey in bundle) {
            if (!Object.hasOwn(bundle, bundleKey)) continue;
            outputCount += 1;
            if (outputCount > SHARED_CAPABILITY_BUILD_LIMITS.bundleOutputs) {
              throw new Error('build bundle exceeds the shared-capability output-count bound');
            }
            const output = bundle[bundleKey];
            if (output === undefined) {
              throw new Error(`build bundle lost one enumerated output: ${bundleKey}`);
            }
            if (output.type !== 'chunk') continue;
            const moduleIds = new Set<string>();
            let moduleMemberCount = 0;
            const recordModuleId = (moduleId: string): void => {
              moduleMemberCount += 1;
              if (
                moduleMemberCount >
                SHARED_CAPABILITY_BUILD_LIMITS.chunkModuleMembers
              ) {
                throw new Error(
                  `build chunk exceeds the shared-capability module-member bound: ${bundleKey}`,
                );
              }
              moduleIds.add(moduleId);
            };
            for (const moduleId of output.moduleIds) recordModuleId(moduleId);
            for (const moduleId in output.modules) {
              if (Object.hasOwn(output.modules, moduleId)) recordModuleId(moduleId);
            }
            for (const moduleId of moduleIds) {
              const identity = capabilityModuleIdentity(moduleId);
              if (identity === undefined) continue;
              if (moduleId !== identity.canonicalId) {
                throw new Error(`private capability output used a noncanonical module id: ${moduleId}`);
              }
              const tuple = expectedById.get(identity.canonicalId);
              if (tuple === undefined) {
                throw new Error(`private capability module emitted in the wrong build pass: ${moduleId}`);
              }
              if (observed.has(identity.canonicalId)) {
                throw new Error(`private capability module appears in more than one chunk: ${moduleId}`);
              }
              if (
                bundleKey !== tuple.fileName ||
                output.fileName !== tuple.fileName ||
                !output.isEntry ||
                output.isDynamicEntry ||
                output.facadeModuleId !== tuple.canonicalId
              ) {
                throw new Error(
                  `private capability output lacks its exact owned facade: ${JSON.stringify({
                    moduleId,
                    bundleKey,
                    fileName: output.fileName,
                    isEntry: output.isEntry,
                    isDynamicEntry: output.isDynamicEntry,
                    facadeModuleId: output.facadeModuleId,
                    expected: tuple,
                  })}`,
                );
              }
              observed.add(identity.canonicalId);
            }
            let importCount = 0;
            const inspectImportedChunk = (imported: string): void => {
              importCount += 1;
              if (importCount > SHARED_CAPABILITY_BUILD_LIMITS.chunkImports) {
                throw new Error(
                  `build chunk exceeds the shared-capability import bound: ${bundleKey}`,
                );
              }
              const target = path.posix.normalize(
                path.posix.join(path.posix.dirname(bundleKey), imported),
              );
              if (privateOutputKeys.has(target) && target !== bundleKey) {
                throw new Error(
                  `private capability output has an incoming chunk edge: ${bundleKey} -> ${target}`,
                );
              }
            };
            for (const imported of output.imports) inspectImportedChunk(imported);
            for (const imported of output.dynamicImports) inspectImportedChunk(imported);
          }
          if (
            observed.size !== expected.length ||
            expected.some((tuple) => !observed.has(tuple.canonicalId))
          ) {
            throw new Error(
              `private capability output closure mismatch: ${JSON.stringify({
                expected: expected.map((tuple) => tuple.canonicalId).sort(),
                observed: [...observed].sort(),
              })}`,
            );
          }
          state.lifecycle = 'generated';
        } catch (auditError) {
          state.lifecycle = 'failed';
          throw auditError;
        }
      },
    },
  }, 'final shared-capability auditor');
}

/** Create one pass-local resolver/auditor pair for one input-options invocation. */
export function sharedCapabilityBuildAuthorityForBuild(
  format: NormalizedFormat,
  context: { readonly cjsDts: boolean },
  external?: unknown,
): Readonly<{
  readonly firstResolver: TsdownPlugin;
  readonly finalAuditor: TsdownPlugin;
  readonly external: GuardedExternalPolicy;
  readonly alias: Readonly<Record<string, never>>;
  readonly composePlugins: (intermediate: unknown) => TsdownPlugin[];
}> {
  const state: SharedCapabilityBuildAuthorityState = Object.seal({
    pass: sharedCapabilityBuildPass(format, context.cjsDts),
    admissions: new Map<string, SharedCapabilityAdmission>(),
    activeDelegations: new WeakSet<object>(),
    rawModules: new Map<string, RawCapabilityModuleEvidence>(),
    lifecycle: 'new' as SharedCapabilityLifecycle,
    aggregateRawCodeUnits: 0,
    aggregateRawEdges: 0,
    buildEndCalls: 0,
    generateBundleCalls: 0,
    compositionSealed: false,
    optionsAudited: false,
    initialOutputOptionsAudited: false,
    outputOptionsAudited: false,
    guardedExternal: undefined,
    sealedAlias: undefined,
    pluginRoster: undefined,
  });
  const guardedExternal = Object.freeze(createGuardedExternalPolicy(external));
  const sealedAlias = Object.freeze(Object.create(null)) as Readonly<Record<string, never>>;
  state.guardedExternal = guardedExternal;
  state.sealedAlias = sealedAlias;
  const firstResolver = sharedCapabilityExternalizerForBuild(format, context, state);
  const finalAuditor = sharedCapabilityOwnershipAuditorForBuild(format, context, state);
  return Object.freeze({
    firstResolver,
    finalAuditor,
    external: guardedExternal,
    alias: sealedAlias,
    composePlugins: (intermediate: unknown) =>
      sealSharedCapabilityPluginComposition(
        state,
        firstResolver,
        finalAuditor,
        intermediate,
      ),
  });
}

/**
 * rolldown-plugin-dts shares Rolldown's global sourcemap switch with the ESM
 * runtime pass. Its declaration maps omit sourcesContent and point at source
 * files that are intentionally absent from the package, so publishing them
 * would create misleading debugger metadata. Remove each exact map and its
 * terminal owner reference in one bundle mutation, then prove no declaration
 * map metadata survived. Runtime source maps are untouched.
 */
export function omitDeclarationMapsFromBuildBundle(
  bundle: Record<string, MutableBuildOutput>,
): void {
  const expectedDeclarationMap = /\.d\.(?:ts|cts)\.map$/u;
  const anyDeclarationMap = /\.d\.(?:[cm]?ts)\.map$/u;
  const anyDeclaration = /\.d\.(?:[cm]?ts)$/u;
  const sourceMapReference = /\/\/# sourceMappingURL=([^\r\n]+)/gu;

  // Rolldown 1.2.2 applies OutputBundle proxy deletions only after this hook
  // returns. Keep one authoritative pre-mutation snapshot and explicitly track
  // accepted deletions; fresh enumeration inside this hook would remain stale.
  const snapshot = Object.entries(bundle);
  const removed = new Set<string>();
  const unexpectedDeclarationMap = snapshot.find(([bundleKey]) =>
    anyDeclarationMap.test(bundleKey) && !expectedDeclarationMap.test(bundleKey));
  if (unexpectedDeclarationMap !== undefined) {
    throw new Error(
      `unreviewed declaration map output: ${unexpectedDeclarationMap[0]}`,
    );
  }
  for (const [mapName, output] of snapshot) {
    if (!expectedDeclarationMap.test(mapName)) continue;
    if (output.type !== 'asset' || output.fileName !== mapName) {
      throw new Error(`declaration map has an invalid bundle identity: ${mapName}`);
    }
    const ownerName = mapName.slice(0, -'.map'.length);
    const owner = bundle[ownerName];
    if (owner === undefined || owner.type !== 'chunk') {
      throw new Error(`declaration map has no same-bundle owner: ${mapName}`);
    }
    const reference = path.posix.basename(mapName);
    sourceMapReference.lastIndex = 0;
    const references = [...owner.code.matchAll(sourceMapReference)];
    const trailer = `//# sourceMappingURL=${reference}`;
    if (
      references.length !== 1 ||
      references[0]?.[1] !== reference ||
      !owner.code.endsWith(trailer)
    ) {
      throw new Error(
        `declaration map owner lacks one exact terminal reference: ${ownerName}`,
      );
    }
    owner.code = owner.code.slice(0, -trailer.length);
    delete bundle[mapName];
    removed.add(mapName);
  }

  for (const [bundleKey, output] of snapshot) {
    if (anyDeclarationMap.test(bundleKey)) {
      if (!removed.has(bundleKey)) {
        throw new Error(`declaration map was not reviewed for omission: ${bundleKey}`);
      }
      continue;
    }
    if (anyDeclaration.test(bundleKey)) {
      if (output.type !== 'chunk') {
        throw new Error(`declaration output is not a chunk: ${bundleKey}`);
      }
      sourceMapReference.lastIndex = 0;
      if (sourceMapReference.test(output.code)) {
        throw new Error(
          `declaration source-map reference survived reviewed omission: ${bundleKey}`,
        );
      }
    }
  }
}

function declarationMapOmitterForBuild(): TsdownPlugin {
  return {
    name: 'cortexel-omit-declaration-maps',
    generateBundle: {
      // rolldown-plugin-dts also uses a post hook. Array order makes this the
      // final declaration mutator in every tsdown pass.
      order: 'post',
      handler(_options, bundle) {
        omitDeclarationMapsFromBuildBundle(bundle);
      },
    },
  };
}

function nodeBuiltinProtocolHardenerForBuild(
  format: NormalizedFormat,
  context: { readonly cjsDts: boolean },
): TsdownPlugin {
  return {
    name: 'cortexel-node-builtin-protocol',
    renderChunk: {
      order: 'post',
      handler(code, chunk) {
        if (format !== 'cjs' || context.cjsDts) return null;
        const rewritten = rewriteBareNodeBuiltinsForBuild(code, chunk.fileName);
        if (rewritten.map === null) return null;
        return { code: rewritten.code, map: rewritten.map };
      },
    },
  };
}

// Legacy entry points remain byte-for-byte addressable while capability-named
// FigureRequestV1 entries are added alongside them. Peers are externalized — never
// bundled — and the pure/headless entries have package-smoke import-graph guards.
function deepFreezeBuildConfig<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const member of Reflect.ownKeys(value)) {
      deepFreezeBuildConfig((value as Record<PropertyKey, unknown>)[member]);
    }
    Object.freeze(value);
  }
  return value;
}

export const CORTEXEL_PACKAGE_BUILD_CONFIG = deepFreezeBuildConfig({
  cwd: import.meta.dirname,
  outDir: 'dist',
  // TypeScript 7 intentionally has no stable compiler API yet, so declaration
  // generation and compiler-API tests use the current API-bearing TypeScript 6
  // package. The build-only deprecation waiver does not reach the TypeScript 7
  // repository gate.
  tsconfig: 'tsconfig.build.json',
  entry: {
    index: 'index.ts',
    'core/index': 'core/index.ts',
    'figure/index': 'src/figure/index.ts',
    'authoring/index': 'src/authoring/index.ts',
    'render-svg/index': 'src/render/index.ts',
    'adapters/nest/index': 'src/adapters/nest/index.ts',
    'knowledge-graph/index': 'src/knowledge-graph/index.ts',
    'cli/main': 'src/cli/main.ts',
    // One type-only nominal identity shared by import/require declaration graphs.
    'internal/validated-request-brand': 'src/core/validated-request-brand.ts',
    // Private runtime singleton: package `imports` points both module formats to
    // this CJS file, while the public `exports` map keeps it off the API surface.
    'internal/request-capability': 'src/core/request.ts',
    'internal/figure-result-capability':
      'src/render/figure-result-capability.internal.ts',
    'internal/figure-result-brand': 'src/core/figure-result-brand.ts',
    'internal/knowledge-graph-presentation-capability':
      'react/knowledgeGraphPresentation.internal.ts',
    'internal/knowledge-graph-presentation-brand':
      'src/core/knowledge-graph-presentation-brand.ts',
    'react/index': 'react/index.ts',
    // Canonical scientific charts are React + SVG only. Keep them on a
    // dependency-isolated subpath so an agent/report host does not need three,
    // r3f, or d3 merely to render a checked 2D figure.
    'react/charts': 'react/charts/index.ts',
    // The knowledge-graph scene is the only one needing d3-force-3d, so it ships
    // as its own subpath (cortexel/react/knowledge-graph) — keeps the base react
    // entry d3-free and the "optional" d3-force-3d peer honest.
    'react/knowledge-graph': 'react/knowledgeGraphPublic.ts',
    // Caption-bound corpus inspection without Canvas, Three, R3F, or d3. This
    // entry owns selection and exposes no visual injection or prepared token.
    'react/knowledge-graph-dom': 'react/knowledgeGraphDomPublic.ts',
  },
  format: ['esm', 'cjs'],
  // The producer must create its declaration maps so the same-pass plugin above
  // can require and remove each exact pair. Runtime maps remain enabled globally.
  dts: { sourcemap: true },
  sourcemap: true,
  clean: true,
  write: true,
  minify: false,
  unbundle: false,
  hash: true,
  globImport: false,
  exports: false,
  publint: false,
  attw: false,
  unused: false,
  watch: false,
  platform: 'node',
  // Preserve the previous tsup build's explicit tsconfig-derived lowering contract.
  target: 'es2022',
  // Preserve the package's established .js/.cjs and .d.ts/.d.cts contract
  // instead of tsdown's fixed .mjs/.cjs Node default.
  fixedExtension: false,
  // The validator locates installed contract data relative to its module. The
  // ESM and CommonJS bundles therefore both require their format-appropriate
  // dirname shim; schema lookup must never depend on cwd or the network.
  shims: true,
  treeshake: true,
  // Source-level bare builtins are prefixed by tsdown. Rolldown's CommonJS
  // import.meta.url lowering is later than that resolver seam, so the reviewed
  // renderChunk plugin below independently hardens generated literals too.
  nodeProtocol: true,
  cjsDefault: false,
  // No process environment prefix is an authorized compile-time input.
  envPrefix: [],
  // Wrap every tsdown-constructed Rolldown pass, including its separate CommonJS
  // declaration pass. The resolver is the first flattened plugin; the independent
  // ownership audit is the last. The pass-local options audit binds that exact
  // ordinary same-process roster, external predicate, and empty native alias map.
  inputOptions(options, format, context) {
    const capabilityAuthority = sharedCapabilityBuildAuthorityForBuild(
      format,
      context,
      options.external,
    );
    if (options.resolve !== undefined) {
      if (options.resolve === null || typeof options.resolve !== 'object') {
        throw new Error('build resolve options must be one ordinary record');
      }
      const aliasDescriptor = Object.getOwnPropertyDescriptor(options.resolve, 'alias');
      if (aliasDescriptor !== undefined) {
        if (!Object.hasOwn(aliasDescriptor, 'value')) {
          throw new Error('native resolve.alias must not be an accessor');
        }
        if (aliasDescriptor.value !== undefined) {
          assertEmptyAliasPolicy(aliasDescriptor.value);
        }
      }
    }
    const plugins = capabilityAuthority.composePlugins([
      options.plugins,
      nodeBuiltinProtocolHardenerForBuild(format, context),
      declarationMapOmitterForBuild(),
    ]);
    return {
      ...options,
      external: capabilityAuthority.external,
      resolve: {
        ...options.resolve,
        alias: capabilityAuthority.alias,
      },
      plugins,
    };
  },
  deps: {
    neverBundle: [
      '#cortexel-figure-result-brand',
      '#cortexel-knowledge-graph-presentation-brand',
      '#cortexel-validated-request-brand',
      'react',
      'react/jsx-runtime',
      'three',
      '@react-three/fiber',
      'd3-force-3d',
      'zod',
    ],
    // Source is not authorized to acquire an undeclared node_modules bundle edge.
    onlyBundle: [],
  },
  // CommonJS remains an explicit compatibility surface in package.json. Silence
  // only tsdown's policy warning about that deliberate contract; all other
  // warnings fail the build.
  checks: {
    legacyCjs: false,
    // Host-load-sensitive timing warnings are not an output-correctness gate.
    pluginTimings: false,
  },
  failOnWarn: true,
  report: false,
} satisfies UserConfig);

export default defineConfig(CORTEXEL_PACKAGE_BUILD_CONFIG);
