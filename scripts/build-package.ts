/** Build package code from the reviewed static configuration. */

import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  opendirSync,
  readSync,
  realpathSync,
  unlinkSync,
} from 'node:fs';
import type { Stats } from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
import { build, type InlineConfig } from 'tsdown';
import ts from 'typescript';

import {
  CORTEXEL_PACKAGE_BUILD_CONFIG,
  findBareNodeBuiltinSpecifiersInBuildCode,
} from '../build.config.js';
import {
  contractPackageProblems,
  packagedContractRelativeFiles,
} from './lib/contract-package.js';
import {
  canonicalPackagePathCaseFold,
  isCanonicalPackageRelativePath,
  isCanonicalPackageSegment,
  PACKAGE_RELATIVE_PATH_BYTES,
} from './lib/canonical-package-path.js';
import {
  assertReviewedPackageSourceMapInputClosure,
  assertReviewedSourceMapResourceBounds,
  inspectReviewedSourceMapMappings,
  inspectReviewedSourceMapMetadata,
  isReviewedMaplessPackageRuntime,
  REVIEWED_PACKAGE_SOURCE_MAP_LIMITS,
  resolveReviewedPackageSourceMapInput,
} from './lib/package-source-map-authority.js';
import { parseJsonSourceStrict } from './lib/strict-json-source.js';
import {
  NORMATIVE_CONTRACT_LIMITS,
  readNormativeContractFile,
} from './lib/normative-source-files.js';
import { serializeManifest } from './emit-manifest.js';

const RUNTIME_OUTPUT = /\.(?:js|cjs)$/u;
const DECLARATION_OUTPUT = /\.d\.(?:ts|cts)$/u;
const DECLARATION_MAP = /\.d\.(?:[cm]?ts)\.map$/u;
const RUNTIME_MAP = /\.(?:js|cjs)\.map$/u;
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

export const PACKAGE_BUILD_OUTPUT_LIMITS = Object.freeze({
  files: 1_024,
  directories: 128,
  nodes: 1_152,
  directoryEntries: 512,
  depth: 16,
  pathBytes: PACKAGE_RELATIVE_PATH_BYTES - Buffer.byteLength('dist/', 'ascii'),
  segmentBytes: 255,
  fileBytes: 32 * 1024 * 1024,
  aggregateBytes: 128 * 1024 * 1024,
  runtimeFiles: 256,
  declarationFiles: 256,
  sourceMaps: 256,
  aggregateSourceMapBytes: 64 * 1024 * 1024,
  packageManifestBytes: 1024 * 1024,
  skillsManifestBytes: 4 * 1024 * 1024,
} as const);

const REVIEWED_RUNTIME_NODE_BUILTIN_SPECIFIERS = new Set([
  'node:crypto',
  'node:fs',
  'node:path',
  'node:url',
]);

const REVIEWED_RUNTIME_EXTERNAL_PACKAGE_SPECIFIERS = new Set([
  '@react-three/fiber',
  'ajv/dist/2020.js',
  'd3-force-3d',
  'react',
  'react/jsx-runtime',
  'three',
  'zod',
]);

const REVIEWED_DECLARATION_EXTERNAL_PACKAGE_SPECIFIERS = new Set([
  'react',
  'three',
  'zod',
]);
const REVIEWED_DECLARATION_NODE_BUILTIN_SPECIFIERS = new Set<string>();

const KNOWLEDGE_GRAPH_DOM_RUNTIME_EXTERNAL_SPECIFIERS = new Set([
  'react',
  'react/jsx-runtime',
  'zod',
]);
const KNOWLEDGE_GRAPH_DOM_DECLARATION_EXTERNAL_SPECIFIERS = new Set([
  'react',
  'zod',
]);

const EXACT_RUNTIME_ORPHANS = Object.freeze([
  'cli/main.cjs',
  'internal/figure-result-capability.js',
  'internal/knowledge-graph-presentation-capability.js',
  'internal/request-capability.js',
] as const);

const EXACT_DECLARATION_ORPHANS = Object.freeze([
  'cli/main.d.cts',
  'cli/main.d.ts',
  'internal/figure-result-brand.d.cts',
  'internal/figure-result-capability.d.ts',
  'internal/knowledge-graph-presentation-brand.d.cts',
  'internal/knowledge-graph-presentation-capability.d.ts',
  'internal/request-capability.d.ts',
  'internal/validated-request-brand.d.cts',
] as const);

const EXACT_POST_CLEANUP_FORBIDDEN = Object.freeze([
  ...EXACT_RUNTIME_ORPHANS,
  ...EXACT_DECLARATION_ORPHANS,
] as const);

const STRUCTURAL_VALIDATOR_SOURCE_PROFILE = new Set([
  'src/analysis/distributions.ts',
  'src/analysis/matrices.ts',
  'src/core/structural-validator.ts',
]);

interface PackageBuildManifest {
  readonly exports?: unknown;
  readonly imports?: unknown;
  readonly bin?: unknown;
  readonly main?: unknown;
  readonly module?: unknown;
  readonly types?: unknown;
  readonly dependencies?: unknown;
  readonly peerDependencies?: unknown;
  readonly optionalDependencies?: unknown;
}

interface SourceMapRecord {
  readonly version?: unknown;
  readonly file?: unknown;
  readonly names?: unknown;
  readonly sources?: unknown;
  readonly sourcesContent?: unknown;
  readonly mappings?: unknown;
  readonly sourceRoot?: unknown;
}

interface BuildGraph {
  readonly roots: ReadonlySet<string>;
  readonly reachable: ReadonlySet<string>;
  readonly unreachable: ReadonlySet<string>;
  readonly packageImportEdges: ReadonlySet<string>;
  readonly externalSpecifiers: ReadonlySet<string>;
  readonly nodeBuiltinSpecifiers: ReadonlySet<string>;
}

interface ModuleSpecifierEdge {
  readonly specifier: string;
  readonly condition: 'import' | 'require' | 'types';
}

type ReviewedPackageImportEdge = ModuleSpecifierEdge & {
  readonly owner: string;
  readonly kind: 'runtime' | 'declaration';
  readonly role: 'shared-capability' | 'nominal-brand';
};

type ReviewedPackageImportEdgeTuple = readonly [
  owner: string,
  specifier: string,
  condition: ReviewedPackageImportEdge['condition'],
  kind: ReviewedPackageImportEdge['kind'],
  role: ReviewedPackageImportEdge['role'],
];

const REVIEWED_PACKAGE_IMPORT_EDGES: readonly ReviewedPackageImportEdge[] =
  Object.freeze(([
    ['cli/main.js', '#cortexel-figure-result-capability', 'import', 'runtime', 'shared-capability'],
    ['cli/main.js', '#cortexel-request-capability', 'import', 'runtime', 'shared-capability'],
    ['figure/index.cjs', '#cortexel-request-capability', 'require', 'runtime', 'shared-capability'],
    ['figure/index.d.cts', '#cortexel-request-capability', 'types', 'declaration', 'shared-capability'],
    ['figure/index.d.ts', '#cortexel-request-capability', 'types', 'declaration', 'shared-capability'],
    ['figure/index.js', '#cortexel-request-capability', 'import', 'runtime', 'shared-capability'],
    ['internal/figure-result-capability.cjs', '#cortexel-request-capability', 'require', 'runtime', 'shared-capability'],
    ['internal/figure-result-capability.d.cts', '#cortexel-figure-result-brand', 'types', 'declaration', 'nominal-brand'],
    ['internal/figure-result-capability.d.cts', '#cortexel-request-capability', 'types', 'declaration', 'shared-capability'],
    [
      'internal/knowledge-graph-presentation-capability.d.cts',
      '#cortexel-knowledge-graph-presentation-brand',
      'types',
      'declaration',
      'nominal-brand',
    ],
    ['internal/request-capability.d.cts', '#cortexel-validated-request-brand', 'types', 'declaration', 'nominal-brand'],
    ['KnowledgeGraphCorpusFrame.internal-GDMeS6bL.js', '#cortexel-knowledge-graph-presentation-capability', 'import', 'runtime', 'shared-capability'],
    ['KnowledgeGraphCorpusFrame.internal-B_E_kBQQ.cjs', '#cortexel-knowledge-graph-presentation-capability', 'require', 'runtime', 'shared-capability'],
    ['KnowledgeGraphCorpusFrame.internal-Ca8p2VTN.d.cts', '#cortexel-knowledge-graph-presentation-capability', 'types', 'declaration', 'shared-capability'],
    ['KnowledgeGraphCorpusFrame.internal-DngsoYeo.d.ts', '#cortexel-knowledge-graph-presentation-capability', 'types', 'declaration', 'shared-capability'],
    ['knowledge-graph/index.cjs', '#cortexel-knowledge-graph-presentation-capability', 'require', 'runtime', 'shared-capability'],
    ['knowledge-graph/index.d.cts', '#cortexel-knowledge-graph-presentation-capability', 'types', 'declaration', 'shared-capability'],
    ['knowledge-graph/index.d.ts', '#cortexel-knowledge-graph-presentation-capability', 'types', 'declaration', 'shared-capability'],
    ['knowledge-graph/index.js', '#cortexel-knowledge-graph-presentation-capability', 'import', 'runtime', 'shared-capability'],
    ['knowledgeGraphFigure-C-g1-MfO.d.cts', '#cortexel-knowledge-graph-presentation-capability', 'types', 'declaration', 'shared-capability'],
    ['knowledgeGraphFigure-BsHVmAuv.cjs', '#cortexel-knowledge-graph-presentation-capability', 'require', 'runtime', 'shared-capability'],
    ['knowledgeGraphFigure-DBGBc6D1.js', '#cortexel-knowledge-graph-presentation-capability', 'import', 'runtime', 'shared-capability'],
    ['knowledgeGraphFigure-lN8js1iu.d.ts', '#cortexel-knowledge-graph-presentation-capability', 'types', 'declaration', 'shared-capability'],
    ['react/knowledge-graph.cjs', '#cortexel-knowledge-graph-presentation-capability', 'require', 'runtime', 'shared-capability'],
    ['react/knowledge-graph.d.cts', '#cortexel-knowledge-graph-presentation-capability', 'types', 'declaration', 'shared-capability'],
    ['react/knowledge-graph.d.ts', '#cortexel-knowledge-graph-presentation-capability', 'types', 'declaration', 'shared-capability'],
    ['react/knowledge-graph.js', '#cortexel-knowledge-graph-presentation-capability', 'import', 'runtime', 'shared-capability'],
    ['render-svg/index.cjs', '#cortexel-figure-result-capability', 'require', 'runtime', 'shared-capability'],
    ['render-svg/index.d.cts', '#cortexel-figure-result-capability', 'types', 'declaration', 'shared-capability'],
    ['render-svg/index.d.ts', '#cortexel-figure-result-capability', 'types', 'declaration', 'shared-capability'],
    ['render-svg/index.js', '#cortexel-figure-result-capability', 'import', 'runtime', 'shared-capability'],
  ] as const satisfies readonly ReviewedPackageImportEdgeTuple[])
    .map(([owner, specifier, condition, kind, role]) => Object.freeze({
      owner,
      specifier,
      condition,
      kind,
      role,
    })));

const REVIEWED_SHARED_CAPABILITY_PACKAGE_IMPORT_SPECIFIERS = new Set([
  '#cortexel-figure-result-capability',
  '#cortexel-knowledge-graph-presentation-capability',
  '#cortexel-request-capability',
]);
const PRIVATE_CAPABILITY_OUTPUTS = new Set(
  [
    'internal/figure-result-capability',
    'internal/knowledge-graph-presentation-capability',
    'internal/request-capability',
  ].flatMap((base) => ['.js', '.cjs', '.d.ts', '.d.cts'].map((extension) =>
    `${base}${extension}`)),
);
const REVIEWED_NOMINAL_BRAND_PACKAGE_IMPORT_SPECIFIERS = new Set([
  '#cortexel-figure-result-brand',
  '#cortexel-knowledge-graph-presentation-brand',
  '#cortexel-validated-request-brand',
]);
for (const edge of REVIEWED_PACKAGE_IMPORT_EDGES) {
  const reviewedSpecifiers = edge.role === 'shared-capability'
    ? REVIEWED_SHARED_CAPABILITY_PACKAGE_IMPORT_SPECIFIERS
    : REVIEWED_NOMINAL_BRAND_PACKAGE_IMPORT_SPECIFIERS;
  if (!reviewedSpecifiers.has(edge.specifier)) {
    throw new Error(
      `reviewed emitted package-import policy misclassifies ${edge.specifier} as ${edge.role}`,
    );
  }
}

function reviewedPackageImportEdgeKey(
  edge: Pick<ReviewedPackageImportEdge, 'owner' | 'specifier' | 'condition' | 'kind'>,
): string {
  return JSON.stringify([edge.owner, edge.specifier, edge.condition, edge.kind]);
}

const REVIEWED_PACKAGE_IMPORT_EDGE_KEYS = new Set(
  REVIEWED_PACKAGE_IMPORT_EDGES.map(reviewedPackageImportEdgeKey),
);
if (REVIEWED_PACKAGE_IMPORT_EDGE_KEYS.size !== REVIEWED_PACKAGE_IMPORT_EDGES.length) {
  throw new Error('reviewed emitted package-import policy contains a duplicate tuple');
}
const REVIEWED_RUNTIME_PACKAGE_IMPORT_EDGE_KEYS = new Set(
  REVIEWED_PACKAGE_IMPORT_EDGES
    .filter((edge) => edge.kind === 'runtime')
    .map(reviewedPackageImportEdgeKey),
);
const REVIEWED_DECLARATION_PACKAGE_IMPORT_EDGE_KEYS = new Set(
  REVIEWED_PACKAGE_IMPORT_EDGES
    .filter((edge) => edge.kind === 'declaration')
    .map(reviewedPackageImportEdgeKey),
);

/** Require one emitted package import to match an exact reviewed graph tuple. */
export function assertReviewedPackageImportEdgeForBuild(
  edge: Pick<ReviewedPackageImportEdge, 'owner' | 'specifier' | 'condition' | 'kind'>,
): void {
  if (!REVIEWED_PACKAGE_IMPORT_EDGE_KEYS.has(reviewedPackageImportEdgeKey(edge))) {
    throw new Error(
      `emitted package import lacks an exact reviewed owner/specifier/condition/kind tuple: ${JSON.stringify(edge)}`,
    );
  }
}

/**
 * Enforce emitted-graph ownership only. This post-build inventory does not prove
 * which source edge or plugin produced the emitted dependency; that evidence is
 * established separately inside the pass-local build authority.
 */
export function assertNoRelativePrivateCapabilityEdgeForBuild(
  owner: string,
  target: string,
  kind: 'runtime' | 'declaration',
): void {
  if (PRIVATE_CAPABILITY_OUTPUTS.has(target)) {
    throw new Error(
      `emitted ${kind} graph contains a relative incoming edge to a private capability output: ${owner} -> ${target}`,
    );
  }
}

export interface PackageBuildDependencies {
  build(options: InlineConfig): Promise<unknown>;
  postprocess(repositoryRoot: string): void;
}

export interface PackageBuildVerificationOptions {
  readonly requireExactModuleInventory?: boolean;
}

function assertPackageBuildDependencies(
  value: unknown,
): asserts value is PackageBuildDependencies {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Reflect.ownKeys(value).length !== 2
  ) {
    throw new Error('reviewed package build dependencies must be one exact plain record');
  }
  const buildDescriptor = Object.getOwnPropertyDescriptor(value, 'build');
  const postprocessDescriptor = Object.getOwnPropertyDescriptor(value, 'postprocess');
  if (
    buildDescriptor === undefined ||
    postprocessDescriptor === undefined ||
    !Object.hasOwn(buildDescriptor, 'value') ||
    !Object.hasOwn(postprocessDescriptor, 'value') ||
    typeof buildDescriptor.value !== 'function' ||
    typeof postprocessDescriptor.value !== 'function'
  ) {
    throw new Error('reviewed package build dependencies must be exact data functions');
  }
}

function unwrapParenthesizedExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function collectBindingNames(name: ts.BindingName, names: string[]): void {
  if (ts.isIdentifier(name)) {
    names.push(name.text);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) collectBindingNames(element.name, names);
  }
}

function hasDuplicateParameterBinding(node: ts.SignatureDeclaration): boolean {
  const names: string[] = [];
  for (const parameter of node.parameters) collectBindingNames(parameter.name, names);
  return new Set(names).size !== names.length;
}

function expressionRootIdentifier(expression: ts.Expression): string | undefined {
  let current = unwrapParenthesizedExpression(expression);
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    current = unwrapParenthesizedExpression(current.expression);
  }
  return ts.isIdentifier(current) ? current.text : undefined;
}

function hasFunctionAncestor(node: ts.Node): boolean {
  let current = node.parent;
  while (current !== undefined && !ts.isSourceFile(current)) {
    if (ts.isFunctionLike(current)) return true;
    current = current.parent;
  }
  return false;
}

function portableRelative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/');
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort(compareStrings);
}

function sameStringSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) if (!right.has(value)) return false;
  return true;
}

function ordinaryRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readPackageBuildManifest(repositoryRoot: string): PackageBuildManifest {
  const packagePath = path.join(repositoryRoot, 'package.json');
  let parsed: unknown;
  try {
    parsed = parseJsonSourceStrict(
      readStableDirectRegularFile(
        packagePath,
        'package build manifest',
        PACKAGE_BUILD_OUTPUT_LIMITS.packageManifestBytes,
      ),
      packagePath,
    );
  } catch (error) {
    throw new Error(`cannot parse package build authority ${packagePath}`, {
      cause: error,
    });
  }
  if (!ordinaryRecord(parsed)) {
    throw new Error(`package build authority is not an object: ${packagePath}`);
  }
  return parsed;
}

function lstatIfPresent(target: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * Establish the destructive build boundary before tsdown can clean or write it.
 * This is a pathname-time, single-principal check; it is not hostile same-UID
 * containment against a concurrent rename after inspection.
 */
export function assertBuildOutputBoundary(repositoryRoot: string): void {
  const canonicalRepository = path.resolve(repositoryRoot);
  const repositoryStat = lstatSync(canonicalRepository);
  if (
    repositoryStat.isSymbolicLink() ||
    !repositoryStat.isDirectory() ||
    realpathSync(canonicalRepository) !== canonicalRepository
  ) {
    throw new Error('package build repository root must be one canonical direct directory');
  }

  const distRoot = path.join(canonicalRepository, 'dist');
  const distStat = lstatIfPresent(distRoot);
  if (distStat === undefined) return;
  if (
    distStat.isSymbolicLink() ||
    !distStat.isDirectory() ||
    realpathSync(distRoot) !== distRoot
  ) {
    throw new Error('package build output root must be one canonical direct directory');
  }
  // Reject every indirect or multiply linked descendant before the build tool is
  // allowed to clean the tree. Unlinking a hard link is ordinarily safe, but a
  // tool is not trusted to unlink rather than truncate or chmod an existing path.
  listRegularFiles(distRoot);
}

function listRegularFiles(
  directory: string,
  observedDirectories?: Set<string>,
): string[] {
  const root = lstatSync(directory);
  if (root.isSymbolicLink() || !root.isDirectory()) {
    throw new Error(`package build output root is not a direct directory: ${directory}`);
  }
  const files: string[] = [];
  const observedIdentities = new Set<string>();
  const observedCaseFoldedIdentities = new Set<string>();
  const pending: Array<{ readonly absolute: string; readonly relative: string }> = [{
    absolute: directory,
    relative: '',
  }];
  let directories = 0;
  let nodes = 0;
  let aggregateBytes = 0;
  let runtimeFiles = 0;
  let declarationFiles = 0;
  let sourceMaps = 0;
  let aggregateSourceMapBytes = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    const handle = opendirSync(current.absolute, {
      bufferSize: 1,
    });
    let directoryEntries = 0;
    try {
      for (;;) {
        const entry = handle.readSync();
        if (entry === null) break;
        directoryEntries += 1;
        nodes += 1;
        if (directoryEntries > PACKAGE_BUILD_OUTPUT_LIMITS.directoryEntries) {
          throw new Error('package build output exceeds the reviewed per-directory entry bound');
        }
        if (nodes > PACKAGE_BUILD_OUTPUT_LIMITS.nodes) {
          throw new Error('package build output exceeds the reviewed node bound');
        }
        if (Buffer.byteLength(entry.name, 'utf8') > PACKAGE_BUILD_OUTPUT_LIMITS.segmentBytes) {
          throw new Error('package build output segment exceeds the reviewed byte bound');
        }
        const name = entry.name;
        // The admitted alphabet is ASCII. Every valid admitted name therefore
        // has one canonical byte representation; malformed UTF-8 decodes with a
        // non-ASCII replacement character and fails this same closed profile.
        if (!isCanonicalPackageSegment(name)) {
          throw new Error(`package build emitted a nonportable path segment: ${name}`);
        }
        const relativeEntry = current.relative === ''
          ? name
          : `${current.relative}/${name}`;
        if (
          !isCanonicalPackageRelativePath(`dist/${relativeEntry}`) ||
          relativeEntry.split('/').length > PACKAGE_BUILD_OUTPUT_LIMITS.depth
        ) {
          throw new Error(`package build output path exceeds the reviewed bound: ${relativeEntry}`);
        }
        const foldedIdentity = canonicalPackagePathCaseFold(relativeEntry);
        if (
          observedIdentities.has(relativeEntry) ||
          observedCaseFoldedIdentities.has(foldedIdentity)
        ) {
          throw new Error(`package build emitted a duplicate portable identity: ${relativeEntry}`);
        }
        observedIdentities.add(relativeEntry);
        observedCaseFoldedIdentities.add(foldedIdentity);
        const target = path.join(current.absolute, name);
        if (entry.isDirectory()) {
          const status = lstatSync(target);
          if (!status.isDirectory() || status.isSymbolicLink()) {
            throw new Error(`package build emitted an indirect directory: ${target}`);
          }
          directories += 1;
          if (directories > PACKAGE_BUILD_OUTPUT_LIMITS.directories) {
            throw new Error('package build output exceeds the reviewed directory bound');
          }
          observedDirectories?.add(relativeEntry);
          pending.push({ absolute: target, relative: relativeEntry });
        } else if (entry.isFile()) {
          const status = lstatSync(target);
          if (!status.isFile() || status.isSymbolicLink()) {
            throw new Error(`package build emitted a non-regular file: ${target}`);
          }
          if (status.nlink !== 1) {
            throw new Error(`package build emitted a multiply linked file: ${target}`);
          }
          if (
            !Number.isSafeInteger(status.size) ||
            status.size < 0 ||
            status.size > PACKAGE_BUILD_OUTPUT_LIMITS.fileBytes
          ) {
            throw new Error(`package build output file exceeds the reviewed byte bound: ${target}`);
          }
          files.push(relativeEntry);
          if (files.length > PACKAGE_BUILD_OUTPUT_LIMITS.files) {
            throw new Error('package build output exceeds the reviewed file bound');
          }
          aggregateBytes += status.size;
          if (aggregateBytes > PACKAGE_BUILD_OUTPUT_LIMITS.aggregateBytes) {
            throw new Error('package build output exceeds the reviewed aggregate byte bound');
          }
          if (RUNTIME_OUTPUT.test(relativeEntry)) runtimeFiles += 1;
          if (DECLARATION_OUTPUT.test(relativeEntry)) declarationFiles += 1;
          if (relativeEntry.endsWith('.map')) {
            sourceMaps += 1;
            aggregateSourceMapBytes += status.size;
          }
          if (
            runtimeFiles > PACKAGE_BUILD_OUTPUT_LIMITS.runtimeFiles ||
            declarationFiles > PACKAGE_BUILD_OUTPUT_LIMITS.declarationFiles ||
            sourceMaps > PACKAGE_BUILD_OUTPUT_LIMITS.sourceMaps
          ) {
            throw new Error('package build code inventory exceeds the reviewed count bound');
          }
          if (
            aggregateSourceMapBytes >
              PACKAGE_BUILD_OUTPUT_LIMITS.aggregateSourceMapBytes
          ) {
            throw new Error('package build source maps exceed the reviewed aggregate byte bound');
          }
        } else {
          throw new Error(`package build emitted an unsupported directory entry: ${target}`);
        }
      }
    } finally {
      handle.closeSync();
    }
  }
  return files.sort(compareStrings);
}

function directoryClosureForFiles(files: readonly string[]): ReadonlySet<string> {
  const directories = new Set<string>();
  for (const file of files) {
    let current = path.posix.dirname(file);
    while (current !== '.') {
      directories.add(current);
      current = path.posix.dirname(current);
    }
  }
  return directories;
}

function assertExactDirectoryClosure(
  observed: ReadonlySet<string>,
  files: readonly string[],
): void {
  const expected = directoryClosureForFiles(files);
  if (!sameStringSet(observed, expected)) {
    throw new Error(
      `package build directory closure mismatch: ${JSON.stringify({
        expected: sorted(expected),
        observed: sorted(observed),
      })}`,
    );
  }
}

function distTarget(target: string): string | undefined {
  if (!RUNTIME_OUTPUT.test(target) && !DECLARATION_OUTPUT.test(target)) {
    return undefined;
  }
  if (
    !target.startsWith('./dist/') ||
    target.includes('\\') ||
    target.includes('*')
  ) {
    throw new Error(`code-bearing package target is outside the reviewed dist root: ${target}`);
  }
  const relative = target.slice('./dist/'.length);
  if (
    relative.length === 0 ||
    path.posix.isAbsolute(relative) ||
    path.posix.normalize(relative) !== relative ||
    relative.split('/').includes('..')
  ) {
    throw new Error(`code-bearing package target is not canonical: ${target}`);
  }
  return relative;
}

function collectCodeTargets(value: unknown, targets: Set<string>): void {
  if (typeof value === 'string') {
    const target = distTarget(value);
    if (target !== undefined) targets.add(target);
    return;
  }
  if (ordinaryRecord(value)) {
    for (const child of Object.values(value)) collectCodeTargets(child, targets);
  }
}

function packageCodeRoots(manifest: PackageBuildManifest): {
  readonly runtime: ReadonlySet<string>;
  readonly declarations: ReadonlySet<string>;
} {
  const targets = new Set<string>();
  collectCodeTargets(manifest.exports, targets);
  collectCodeTargets(manifest.imports, targets);
  collectCodeTargets(manifest.bin, targets);
  collectCodeTargets(manifest.main, targets);
  collectCodeTargets(manifest.module, targets);
  collectCodeTargets(manifest.types, targets);

  return {
    runtime: new Set([...targets].filter((target) => RUNTIME_OUTPUT.test(target))),
    declarations: new Set(
      [...targets].filter((target) => DECLARATION_OUTPUT.test(target)),
    ),
  };
}

function selectConditionalTarget(
  value: unknown,
  condition: 'import' | 'require' | 'types',
): string | undefined {
  if (typeof value === 'string') return value;
  if (!ordinaryRecord(value)) return undefined;
  const exact = value[condition];
  if (typeof exact === 'string') return exact;
  if (ordinaryRecord(exact)) {
    const nested = selectConditionalTarget(exact, condition);
    if (nested !== undefined) return nested;
  }
  const fallback = value.default;
  return typeof fallback === 'string'
    ? fallback
    : selectConditionalTarget(fallback, condition);
}

function declarationForRuntimeTarget(target: string): string | undefined {
  if (target.endsWith('.cjs')) return `${target.slice(0, -'.cjs'.length)}.d.cts`;
  if (target.endsWith('.js')) return `${target.slice(0, -'.js'.length)}.d.ts`;
  return undefined;
}

function resolvePackageImport(
  manifest: PackageBuildManifest,
  specifier: string,
  condition: 'import' | 'require' | 'types',
  outputs: ReadonlySet<string>,
): string {
  if (!ordinaryRecord(manifest.imports) || !Object.hasOwn(manifest.imports, specifier)) {
    throw new Error(`emitted code references an undeclared package import: ${specifier}`);
  }
  const authority = manifest.imports[specifier];
  let target = selectConditionalTarget(authority, condition);
  if (condition === 'types') {
    const explicitTypes = selectConditionalTarget(authority, 'types');
    target = explicitTypes ?? target;
  }
  if (target === undefined) {
    throw new Error(
      `package import has no ${condition} target: ${specifier}`,
    );
  }
  let relative = distTarget(target);
  if (relative === undefined) {
    throw new Error(`package import does not target emitted code: ${specifier} -> ${target}`);
  }
  if (condition === 'types' && !DECLARATION_OUTPUT.test(relative)) {
    const declaration = declarationForRuntimeTarget(relative);
    if (declaration === undefined) {
      throw new Error(`cannot derive declaration target: ${specifier} -> ${target}`);
    }
    relative = declaration;
  }
  if (!outputs.has(relative)) {
    throw new Error(`package import target is absent: ${specifier} -> ${relative}`);
  }
  return relative;
}

export function inspectEmittedModuleEdges(
  code: string,
  fileName: string,
  kind: 'runtime' | 'declaration',
): readonly ModuleSpecifierEdge[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.d.ts') || fileName.endsWith('.d.cts')
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS,
  );
  const diagnostics = (
    sourceFile as ts.SourceFile & {
      readonly parseDiagnostics?: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    throw new Error(
      `cannot inspect emitted module graph ${fileName}: ${ts.flattenDiagnosticMessageText(
        diagnostics[0]?.messageText ?? 'unknown parse failure',
        '\n',
      )}`,
    );
  }
  const runtimeFormat = kind === 'runtime'
    ? fileName.endsWith('.cjs')
      ? 'cjs'
      : fileName.endsWith('.js')
        ? 'esm'
        : undefined
    : undefined;
  if (kind === 'runtime' && runtimeFormat === undefined) {
    throw new Error(`emitted runtime has an unreviewed module format: ${fileName}`);
  }
  const edges = new Map<string, ModuleSpecifierEdge>();
  const addRequiredLiteral = (
    literal: ts.Expression | undefined,
    loader: string,
    runtimeCondition: 'import' | 'require',
  ): void => {
    if (literal === undefined || !ts.isStringLiteral(literal)) {
      throw new Error(
        `emitted module graph contains an unreviewed computed ${loader}: ${fileName}`,
      );
    }
    const condition = kind === 'declaration' ? 'types' : runtimeCondition;
    edges.set(`${condition}\0${literal.text}`, {
      specifier: literal.text,
      condition,
    });
  };
  const visit = (node: ts.Node): void => {
    if (runtimeFormat === 'cjs') {
      if (
        ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isImportEqualsDeclaration(node) ||
        ts.isExportAssignment(node)
      ) {
        throw new Error(`emitted CommonJS contains ESM/TypeScript module syntax: ${fileName}`);
      }
      const modifiers = (node as ts.Node & {
        readonly modifiers?: readonly ts.ModifierLike[];
      }).modifiers;
      if (
        node.parent === sourceFile &&
        modifiers?.some((modifier) =>
          modifier.kind === ts.SyntaxKind.ExportKeyword ||
          modifier.kind === ts.SyntaxKind.DefaultKeyword)
      ) {
        throw new Error(`emitted CommonJS contains an ESM export modifier: ${fileName}`);
      }
      if (
        ts.isMetaProperty(node) &&
        node.keywordToken === ts.SyntaxKind.ImportKeyword
      ) {
        throw new Error(`emitted CommonJS contains import.meta: ${fileName}`);
      }
      if (
        (ts.isAwaitExpression(node) ||
          (ts.isForOfStatement(node) && node.awaitModifier !== undefined)) &&
        !hasFunctionAncestor(node)
      ) {
        throw new Error(`emitted CommonJS contains top-level await: ${fileName}`);
      }
    }
    if (
      runtimeFormat === 'esm' &&
      (
        (ts.isReturnStatement(node) && !hasFunctionAncestor(node)) ||
        ts.isWithStatement(node) ||
        (ts.isDeleteExpression(node) &&
          ts.isIdentifier(unwrapParenthesizedExpression(node.expression))) ||
        (ts.isFunctionLike(node) && hasDuplicateParameterBinding(node))
      )
    ) {
      throw new Error(`emitted ESM contains strict-mode early-error syntax: ${fileName}`);
    }
    if (
      kind === 'runtime' &&
      (
        (ts.isIdentifier(node) && (node.text === 'eval' || node.text === 'Function')) ||
        (ts.isPropertyAccessExpression(node) &&
          node.name.text === 'constructor' &&
          (
            (ts.isCallExpression(node.parent) && node.parent.expression === node) ||
            (ts.isNewExpression(node.parent) && node.parent.expression === node) ||
            (ts.isPropertyAccessExpression(node.expression) &&
              node.expression.name.text === 'constructor') ||
            expressionRootIdentifier(node.expression) === 'globalThis' ||
            expressionRootIdentifier(node.expression) === 'global'
          ))
      )
    ) {
      throw new Error(`emitted runtime contains unreviewed dynamic evaluation syntax: ${fileName}`);
    }
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier !== undefined) {
        addRequiredLiteral(node.moduleSpecifier, 'static module specifier', 'import');
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addRequiredLiteral(
        node.moduleReference.expression,
        'import-equals specifier',
        'require',
      );
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const unwrappedExpression = unwrapParenthesizedExpression(node.expression);
      const isDirectRequire =
        ts.isIdentifier(unwrappedExpression) && unwrappedExpression.text === 'require';
      if (isDynamicImport || isDirectRequire) {
        if (isDirectRequire && node.expression !== unwrappedExpression) {
          throw new Error(`emitted module graph contains an indirect require call: ${fileName}`);
        }
        if (isDirectRequire && runtimeFormat === 'esm') {
          throw new Error(`emitted ESM contains a direct require call: ${fileName}`);
        }
        if (node.questionDotToken !== undefined || node.arguments.length !== 1) {
          throw new Error(
            `emitted module graph contains an unreviewed ${isDynamicImport ? 'import' : 'require'} invocation: ${fileName}`,
          );
        }
        addRequiredLiteral(
          node.arguments[0],
          isDynamicImport ? 'dynamic import specifier' : 'require specifier',
          isDynamicImport ? 'import' : 'require',
        );
      }
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      addRequiredLiteral(node.argument.literal, 'import-type specifier', 'import');
    }
    const propertyBase = ts.isPropertyAccessExpression(node)
      ? unwrapParenthesizedExpression(node.expression)
      : undefined;
    const propertyRoot = ts.isPropertyAccessExpression(node)
      ? expressionRootIdentifier(node.expression)
      : undefined;
    if (
      ts.isPropertyAccessExpression(node) &&
      propertyBase !== undefined &&
      ((ts.isIdentifier(propertyBase) && propertyBase.text === 'require') ||
        (ts.isIdentifier(propertyBase) &&
          propertyBase.text === 'module' && node.name.text === 'require') ||
        (ts.isIdentifier(propertyBase) &&
          ['global', 'globalThis'].includes(propertyBase.text) &&
          ['global', 'globalThis', 'module', 'process', 'require'].includes(node.name.text)) ||
        (ts.isIdentifier(propertyBase) &&
          propertyBase.text === 'process' && node.name.text === 'getBuiltinModule') ||
        (propertyRoot === 'process' && [
          '_linkedBinding',
          'binding',
          'dlopen',
          'getBuiltinModule',
          'mainModule',
        ].includes(node.name.text)) ||
        node.name.text === 'require' ||
        node.name.text === 'getBuiltinModule' ||
        (ts.isMetaProperty(propertyBase) &&
          propertyBase.keywordToken === ts.SyntaxKind.ImportKeyword &&
          node.name.text === 'resolve'))
    ) {
      throw new Error(
        `emitted module graph contains an unreviewed loader property: ${fileName}`,
      );
    }
    const elementBase = ts.isElementAccessExpression(node)
      ? unwrapParenthesizedExpression(node.expression)
      : undefined;
    const elementKey = ts.isElementAccessExpression(node) &&
      node.argumentExpression !== undefined &&
      ts.isStringLiteral(node.argumentExpression)
      ? node.argumentExpression.text
      : undefined;
    if (
      ts.isElementAccessExpression(node) &&
      elementBase !== undefined &&
      ((ts.isIdentifier(elementBase) && elementBase.text === 'require') ||
        (ts.isIdentifier(elementBase) && elementBase.text === 'module') ||
        (ts.isIdentifier(elementBase) &&
          ['global', 'globalThis'].includes(elementBase.text)) ||
        (ts.isIdentifier(elementBase) && elementBase.text === 'process') ||
        elementKey === 'getBuiltinModule' ||
        elementKey === 'require' ||
        ts.isMetaProperty(elementBase))
    ) {
      throw new Error(
        `emitted module graph contains an unreviewed computed loader property: ${fileName}`,
      );
    }
    // Deliberately lexical: even an otherwise inert property/binding named
    // `require` must be reviewed before entering emitted package code. This keeps
    // aliases and parenthesized references from silently escaping the direct-call
    // policy; it is not a data-flow proof against eval or arbitrary executable code.
    if (ts.isIdentifier(node) && node.text === 'require') {
      const parent = node.parent;
      const admittedSyntacticBase =
        (ts.isCallExpression(parent) && parent.expression === node) ||
        (ts.isPropertyAccessExpression(parent) && parent.expression === node) ||
        (ts.isElementAccessExpression(parent) && parent.expression === node);
      if (!admittedSyntacticBase) {
        throw new Error(
          `emitted module graph contains an unreviewed require reference: ${fileName}`,
        );
      }
    }
    if (ts.isIdentifier(node) && node.text === 'module') {
      const parent = node.parent;
      const admittedCommonJsExports =
        runtimeFormat === 'cjs' &&
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        parent.name.text === 'exports';
      if (!admittedCommonJsExports) {
        throw new Error(`emitted module graph contains an unreviewed module reference: ${fileName}`);
      }
    }
    if (
      ts.isIdentifier(node) &&
      (node.text === 'process' || node.text === 'globalThis' || node.text === 'global')
    ) {
      const parent = node.parent;
      const admittedSyntacticBase =
        (ts.isPropertyAccessExpression(parent) && parent.expression === node) ||
        (ts.isElementAccessExpression(parent) && parent.expression === node) ||
        (ts.isTypeOfExpression(parent) && parent.expression === node);
      if (!admittedSyntacticBase) {
        throw new Error(
          `emitted module graph contains an unreviewed ${node.text} reference: ${fileName}`,
        );
      }
    }
    if (
      runtimeFormat === 'esm' &&
      ts.isIdentifier(node) &&
      ['__dirname', '__filename', 'exports'].includes(node.text)
    ) {
      throw new Error(
        `emitted ESM contains an unreviewed CommonJS global: ${fileName}`,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (
    sourceFile.referencedFiles.length > 0 ||
    sourceFile.typeReferenceDirectives.length > 0 ||
    sourceFile.libReferenceDirectives.length > 0 ||
    sourceFile.amdDependencies.length > 0 ||
    sourceFile.moduleName !== undefined
  ) {
    throw new Error(
      `emitted module graph contains an unreviewed path, type, lib, or AMD directive: ${fileName}`,
    );
  }
  return [...edges.values()].sort((left, right) =>
    compareStrings(
      `${left.condition}\0${left.specifier}`,
      `${right.condition}\0${right.specifier}`,
    ));
}

function declaredExternalPackageNames(
  manifest: PackageBuildManifest,
): ReadonlySet<string> {
  const packages = new Set<string>();
  for (const field of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ] as const) {
    const value = manifest[field];
    if (value === undefined) continue;
    if (!ordinaryRecord(value)) {
      throw new Error(`package build authority ${field} must be an object`);
    }
    for (const [name, range] of Object.entries(value)) {
      if (typeof range !== 'string' || externalPackageName(name) !== name) {
        throw new Error(`package build authority has an invalid ${field} entry: ${name}`);
      }
      packages.add(name);
    }
  }
  return packages;
}

function externalPackageName(specifier: string): string {
  if (
    specifier.length === 0 ||
    specifier.includes('\\') ||
    /[%?#:]/u.test(specifier) ||
    specifier.startsWith('/') ||
    specifier.endsWith('/')
  ) {
    throw new Error(`emitted module graph contains an unsafe external specifier: ${specifier}`);
  }
  const segments = specifier.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`emitted module graph contains a noncanonical external specifier: ${specifier}`);
  }
  if (specifier.startsWith('@')) {
    if (segments.length < 2 || segments[0] === '@' || segments[1] === undefined) {
      throw new Error(`emitted module graph contains an invalid scoped package: ${specifier}`);
    }
    return `${segments[0]}/${segments[1]}`;
  }
  const name = segments[0];
  if (name === undefined || name.startsWith('@')) {
    throw new Error(`emitted module graph contains an invalid package: ${specifier}`);
  }
  return name;
}

function assertReviewedExternalSpecifier(
  declaredPackages: ReadonlySet<string>,
  kind: 'runtime' | 'declaration',
  owner: string,
  specifier: string,
): 'external' | 'nodeBuiltin' {
  const reviewedBuiltins = kind === 'runtime'
    ? REVIEWED_RUNTIME_NODE_BUILTIN_SPECIFIERS
    : REVIEWED_DECLARATION_NODE_BUILTIN_SPECIFIERS;
  const reviewedPackages = kind === 'runtime'
    ? REVIEWED_RUNTIME_EXTERNAL_PACKAGE_SPECIFIERS
    : REVIEWED_DECLARATION_EXTERNAL_PACKAGE_SPECIFIERS;
  if (specifier.startsWith('node:')) {
    if (!isBuiltin(specifier) || !reviewedBuiltins.has(specifier)) {
      throw new Error(
        `emitted module graph contains an unreviewed Node builtin: ${owner} -> ${specifier}`,
      );
    }
    return 'nodeBuiltin';
  }
  if (isBuiltin(specifier)) {
    throw new Error(
      `emitted module graph contains a shadowable bare Node builtin: ${owner} -> ${specifier}`,
    );
  }
  const packageName = externalPackageName(specifier);
  if (
    !declaredPackages.has(packageName) ||
    !reviewedPackages.has(specifier)
  ) {
    throw new Error(
      `emitted module graph contains an undeclared or unreviewed external package: ${owner} -> ${specifier}`,
    );
  }
  return 'external';
}

function resolveRelativeOutput(
  owner: string,
  specifier: string,
  kind: 'runtime' | 'declaration',
  outputs: ReadonlySet<string>,
): string {
  if (
    specifier.includes('\\') ||
    specifier.includes('\0') ||
    /[%?#]/u.test(specifier)
  ) {
    throw new Error(`emitted ${kind} dependency is unsafe: ${owner} -> ${specifier}`);
  }
  const ownerDirectory = path.posix.dirname(owner);
  const joined = path.posix.normalize(
    path.posix.join(ownerDirectory, specifier),
  );
  if (
    path.posix.isAbsolute(joined) ||
    joined === '..' ||
    joined.startsWith('../')
  ) {
    throw new Error(`emitted ${kind} escapes dist: ${owner} -> ${specifier}`);
  }
  const relative = path.posix.relative(ownerDirectory, joined);
  const canonicalSpecifier = relative.startsWith('.') ? relative : `./${relative}`;
  if (specifier !== canonicalSpecifier) {
    throw new Error(
      `emitted ${kind} dependency is not canonical: ${owner} -> ${specifier}`,
    );
  }
  let target = joined;
  if (kind === 'declaration' && !DECLARATION_OUTPUT.test(target)) {
    const declaration = declarationForRuntimeTarget(target);
    if (declaration !== undefined) target = declaration;
  }
  if (!outputs.has(target)) {
    throw new Error(`emitted ${kind} dependency is absent: ${owner} -> ${specifier}`);
  }
  return target;
}

function buildReachabilityGraph(
  distRoot: string,
  manifest: PackageBuildManifest,
  kind: 'runtime' | 'declaration',
  roots: ReadonlySet<string>,
  outputs: ReadonlySet<string>,
): BuildGraph {
  for (const root of roots) {
    if (!outputs.has(root)) throw new Error(`package ${kind} root is absent: ${root}`);
  }
  const declaredPackages = declaredExternalPackageNames(manifest);
  const reachable = new Set<string>();
  const packageImportEdges = new Set<string>();
  const externalSpecifiers = new Set<string>();
  const nodeBuiltinSpecifiers = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const owner = pending.pop();
    if (owner === undefined || reachable.has(owner)) continue;
    reachable.add(owner);
    const code = readReviewedBuildText(distRoot, owner);
    for (const edge of inspectEmittedModuleEdges(code, owner, kind)) {
      const { specifier } = edge;
      let dependency: string | undefined;
      if (specifier.startsWith('.')) {
        dependency = resolveRelativeOutput(owner, specifier, kind, outputs);
        assertNoRelativePrivateCapabilityEdgeForBuild(owner, dependency, kind);
      } else if (specifier.startsWith('#')) {
        const reviewedEdge = {
          owner,
          specifier,
          condition: edge.condition,
          kind,
        } as const;
        assertReviewedPackageImportEdgeForBuild(reviewedEdge);
        packageImportEdges.add(reviewedPackageImportEdgeKey(reviewedEdge));
        dependency = resolvePackageImport(
          manifest,
          specifier,
          edge.condition,
          outputs,
        );
      } else {
        const externalKind = assertReviewedExternalSpecifier(
          declaredPackages,
          kind,
          owner,
          specifier,
        );
        (externalKind === 'nodeBuiltin'
          ? nodeBuiltinSpecifiers
          : externalSpecifiers).add(specifier);
      }
      if (dependency !== undefined && !reachable.has(dependency)) pending.push(dependency);
    }
  }
  return {
    roots,
    reachable,
    unreachable: new Set([...outputs].filter((output) => !reachable.has(output))),
    packageImportEdges,
    externalSpecifiers,
    nodeBuiltinSpecifiers,
  };
}

/**
 * Bind the light DOM entry's package claim to its emitted artifacts, not only to
 * source imports or a consumer whose host may happen to install more peers. Zod
 * is a normal dependency; React is the entry's sole runtime peer.
 */
function assertKnowledgeGraphDomEmittedClosure(
  distRoot: string,
  manifest: PackageBuildManifest,
  runtimeOutputs: ReadonlySet<string>,
  declarationOutputs: ReadonlySet<string>,
): void {
  const expectedRoots = [
    'react/knowledge-graph-dom.js',
    'react/knowledge-graph-dom.cjs',
    'react/knowledge-graph-dom.d.ts',
    'react/knowledge-graph-dom.d.cts',
  ] as const;
  const presentRoots = expectedRoots.filter((root) =>
    (root.endsWith('.d.ts') || root.endsWith('.d.cts')
      ? declarationOutputs
      : runtimeOutputs).has(root)
  );
  // Narrow test fixtures may describe another package surface. Once any DOM root
  // exists, however, the complete conditional export must be present and closed.
  if (presentRoots.length === 0) return;
  if (presentRoots.length !== expectedRoots.length) {
    throw new Error(
      `knowledge-graph DOM emitted roots are incomplete: ${JSON.stringify({
        expected: expectedRoots,
        observed: presentRoots,
      })}`,
    );
  }
  const profiles = [
    {
      label: 'ESM runtime',
      kind: 'runtime' as const,
      root: 'react/knowledge-graph-dom.js',
      outputs: runtimeOutputs,
      expectedExternals: KNOWLEDGE_GRAPH_DOM_RUNTIME_EXTERNAL_SPECIFIERS,
    },
    {
      label: 'CommonJS runtime',
      kind: 'runtime' as const,
      root: 'react/knowledge-graph-dom.cjs',
      outputs: runtimeOutputs,
      expectedExternals: KNOWLEDGE_GRAPH_DOM_RUNTIME_EXTERNAL_SPECIFIERS,
    },
    {
      label: 'ESM declarations',
      kind: 'declaration' as const,
      root: 'react/knowledge-graph-dom.d.ts',
      outputs: declarationOutputs,
      expectedExternals: KNOWLEDGE_GRAPH_DOM_DECLARATION_EXTERNAL_SPECIFIERS,
    },
    {
      label: 'CommonJS declarations',
      kind: 'declaration' as const,
      root: 'react/knowledge-graph-dom.d.cts',
      outputs: declarationOutputs,
      expectedExternals: KNOWLEDGE_GRAPH_DOM_DECLARATION_EXTERNAL_SPECIFIERS,
    },
  ] as const;
  for (const profile of profiles) {
    const graph = buildReachabilityGraph(
      distRoot,
      manifest,
      profile.kind,
      new Set([profile.root]),
      profile.outputs,
    );
    if (
      !sameStringSet(graph.externalSpecifiers, profile.expectedExternals) ||
      graph.nodeBuiltinSpecifiers.size > 0
    ) {
      throw new Error(
        `knowledge-graph DOM ${profile.label} closure differs from its React-only ` +
        `contract: ${JSON.stringify({
          expectedExternalSpecifiers: sorted(profile.expectedExternals),
          observedExternalSpecifiers: sorted(graph.externalSpecifiers),
          observedNodeBuiltinSpecifiers: sorted(graph.nodeBuiltinSpecifiers),
        })}`,
      );
    }
  }
}

function assertExactReviewedModuleInventory(
  runtime: BuildGraph,
  declarations: BuildGraph,
): void {
  const comparisons = [
    [
      'runtime package-import edges',
      runtime.packageImportEdges,
      REVIEWED_RUNTIME_PACKAGE_IMPORT_EDGE_KEYS,
    ],
    [
      'declaration package-import edges',
      declarations.packageImportEdges,
      REVIEWED_DECLARATION_PACKAGE_IMPORT_EDGE_KEYS,
    ],
    [
      'runtime external packages',
      runtime.externalSpecifiers,
      REVIEWED_RUNTIME_EXTERNAL_PACKAGE_SPECIFIERS,
    ],
    [
      'runtime Node builtins',
      runtime.nodeBuiltinSpecifiers,
      REVIEWED_RUNTIME_NODE_BUILTIN_SPECIFIERS,
    ],
    [
      'declaration external packages',
      declarations.externalSpecifiers,
      REVIEWED_DECLARATION_EXTERNAL_PACKAGE_SPECIFIERS,
    ],
    [
      'declaration Node builtins',
      declarations.nodeBuiltinSpecifiers,
      REVIEWED_DECLARATION_NODE_BUILTIN_SPECIFIERS,
    ],
  ] as const;
  for (const [label, observed, expected] of comparisons) {
    if (!sameStringSet(observed, expected)) {
      throw new Error(
        `emitted ${label} differ from the exact reviewed inventory: ${JSON.stringify({
          expected: sorted(expected),
          observed: sorted(observed),
        })}`,
      );
    }
  }
}

function oneTerminalSourceMapReference(code: string, owner: string): string {
  const reference = inspectReviewedSourceMapMetadata(code, owner, 'runtime');
  if (reference === undefined) {
    throw new Error(`runtime output lacks one source-map reference: ${owner}`);
  }
  return reference;
}

function parseSourceMap(mapPath: string): SourceMapRecord {
  let parsed: unknown;
  try {
    parsed = parseJsonSourceStrict(
      readStableDirectRegularFile(
        mapPath,
        `source map ${mapPath}`,
        REVIEWED_PACKAGE_SOURCE_MAP_LIMITS.mapBytes,
      ),
      mapPath,
    );
  } catch (error) {
    throw new Error(
      `cannot parse emitted source map: ${mapPath}: ${(error as Error).message}`,
      { cause: error },
    );
  }
  if (!ordinaryRecord(parsed)) throw new Error(`source map is not an object: ${mapPath}`);
  return parsed;
}

function sourceMapRepositorySources(
  repositoryRoot: string,
  mapPath: string,
  map: SourceMapRecord,
): ReadonlySet<string> {
  if (!Array.isArray(map.sources)) throw new Error(`source map has no sources: ${mapPath}`);
  const sources = new Set<string>();
  const mapPackagePath = portableRelative(repositoryRoot, mapPath);
  for (const source of map.sources) {
    const relative = resolveReviewedPackageSourceMapInput(mapPackagePath, source);
    if (sources.has(relative)) {
      throw new Error(`source map has a duplicate canonical source: ${mapPath}`);
    }
    sources.add(relative);
  }
  return sources;
}

function sameFileIdentity(
  left: Stats,
  right: Stats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs &&
    left.birthtimeMs === right.birthtimeMs &&
    left.uid === right.uid &&
    left.gid === right.gid
  );
}

function readExactDescriptorSnapshot(
  descriptor: number,
  expectedSize: number,
  label: string,
): Buffer {
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
    throw new Error(`${label} has an invalid reviewed size`);
  }
  const bytes = Buffer.allocUnsafe(expectedSize);
  let offset = 0;
  while (offset < expectedSize) {
    const count = readSync(
      descriptor,
      bytes,
      offset,
      Math.min(1024 * 1024, expectedSize - offset),
      offset,
    );
    if (count <= 0) throw new Error(`${label} ended before its reviewed size`);
    offset += count;
  }
  const overflowProbe = Buffer.allocUnsafe(1);
  if (readSync(descriptor, overflowProbe, 0, 1, expectedSize) !== 0) {
    throw new Error(`${label} grew beyond its reviewed size`);
  }
  return bytes;
}

function reviewedReadFlags(): number {
  let flags = constants.O_RDONLY;
  if (process.platform !== 'win32') {
    if (constants.O_NOFOLLOW <= 0 || constants.O_NONBLOCK <= 0) {
      throw new Error('reviewed build file no-follow/nonblocking authority is unavailable');
    }
    flags |= constants.O_NOFOLLOW | constants.O_NONBLOCK;
  }
  return flags;
}

function readStableDirectRegularFile(
  target: string,
  label: string,
  maximumBytes: number,
): Buffer {
  const before = lstatSync(target);
  if (
    before.isSymbolicLink() ||
    !before.isFile() ||
    before.nlink !== 1 ||
    !Number.isSafeInteger(before.size) ||
    before.size < 0 ||
    before.size > maximumBytes ||
    realpathSync(target) !== target
  ) {
    throw new Error(`${label} is not one bounded canonical direct regular file`);
  }
  const descriptor = openSync(target, reviewedReadFlags());
  try {
    const descriptorBefore = fstatSync(descriptor);
    if (!sameFileIdentity(before, descriptorBefore)) {
      throw new Error(`${label} changed before descriptor acquisition`);
    }
    const bytes = readExactDescriptorSnapshot(descriptor, descriptorBefore.size, label);
    const descriptorAfter = fstatSync(descriptor);
    const after = lstatSync(target);
    if (
      bytes.byteLength !== descriptorBefore.size ||
      !sameFileIdentity(descriptorBefore, descriptorAfter) ||
      !sameFileIdentity(descriptorAfter, after) ||
      after.isSymbolicLink() ||
      !after.isFile() ||
      after.nlink !== 1 ||
      realpathSync(target) !== target
    ) {
      throw new Error(`${label} changed during authoritative read`);
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function decodeCanonicalUtf8(bytes: Buffer, label: string): string {
  let decoded: string;
  try {
    decoded = STRICT_UTF8.decode(bytes);
  } catch (error) {
    throw new Error(`${label} is not canonical UTF-8`, { cause: error });
  }
  if (!Buffer.from(decoded, 'utf8').equals(bytes)) {
    throw new Error(`${label} is not canonical UTF-8`);
  }
  return decoded;
}

function readReviewedBuildText(distRoot: string, relative: string): string {
  const target = path.join(distRoot, relative);
  return decodeCanonicalUtf8(
    readStableDirectRegularFile(
      target,
      `emitted build output ${relative}`,
      REVIEWED_PACKAGE_SOURCE_MAP_LIMITS.generatedCodeBytes,
    ),
    `emitted build output ${relative}`,
  );
}

function assertDirectSourceAncestry(repositoryRoot: string, relative: string): void {
  const canonicalRoot = path.resolve(repositoryRoot);
  const rootStatus = lstatSync(canonicalRoot);
  if (
    rootStatus.isSymbolicLink() ||
    !rootStatus.isDirectory() ||
    realpathSync(canonicalRoot) !== canonicalRoot
  ) {
    throw new Error('source-map repository root is not one canonical direct directory');
  }
  const segments = relative.split('/');
  let current = canonicalRoot;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    const status = lstatSync(current);
    if (
      status.isSymbolicLink() ||
      !status.isDirectory() ||
      realpathSync(current) !== current
    ) {
      throw new Error(`source-map input has indirect directory ancestry: ${relative}`);
    }
  }
}

/** Stable-descriptor read of an exact reviewed source-map input. */
function readReviewedSourceMapInput(
  repositoryRoot: string,
  relative: string,
): string {
  assertDirectSourceAncestry(repositoryRoot, relative);
  const target = path.join(path.resolve(repositoryRoot), ...relative.split('/'));
  const before = lstatSync(target);
  if (
    before.isSymbolicLink() ||
    !before.isFile() ||
    before.nlink !== 1 ||
    !Number.isSafeInteger(before.size) ||
    before.size < 0 ||
    before.size > REVIEWED_PACKAGE_SOURCE_MAP_LIMITS.sourceInputBytes ||
    realpathSync(target) !== target
  ) {
    throw new Error(`source-map input is not one canonical direct regular file: ${relative}`);
  }
  const descriptor = openSync(target, reviewedReadFlags());
  try {
    const descriptorBefore = fstatSync(descriptor);
    if (!descriptorBefore.isFile() || descriptorBefore.nlink !== 1 ||
        !sameFileIdentity(before, descriptorBefore)) {
      throw new Error(`source-map input changed before descriptor acquisition: ${relative}`);
    }
    const raw = readExactDescriptorSnapshot(
      descriptor,
      descriptorBefore.size,
      `source-map input ${relative}`,
    );
    const bytes = decodeCanonicalUtf8(raw, `source-map input ${relative}`);
    const descriptorAfter = fstatSync(descriptor);
    const after = lstatSync(target);
    assertDirectSourceAncestry(repositoryRoot, relative);
    if (
      raw.byteLength !== descriptorBefore.size ||
      !sameFileIdentity(descriptorBefore, descriptorAfter) ||
      !sameFileIdentity(descriptorAfter, after) ||
      after.isSymbolicLink() ||
      !after.isFile() ||
      after.nlink !== 1 ||
      realpathSync(target) !== target
    ) {
      throw new Error(`source-map input changed during authoritative read: ${relative}`);
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function assertStructuralValidatorOrphanProfile(
  repositoryRoot: string,
  distRoot: string,
  owner: string,
  allFiles: ReadonlySet<string>,
): void {
  if (!/^structural-validator-[A-Za-z0-9_-]+\.js$/u.test(owner)) {
    throw new Error(`unreviewed runtime orphan: ${owner}`);
  }
  const ownerCode = readReviewedBuildText(distRoot, owner);
  const reference = oneTerminalSourceMapReference(ownerCode, owner);
  const mapName = path.posix.join(path.posix.dirname(owner), reference);
  if (!allFiles.has(mapName)) {
    throw new Error(`structural-validator orphan source map is absent: ${owner}`);
  }
  const mapPath = path.join(distRoot, mapName);
  const map = parseSourceMap(mapPath);
  if (map.file !== path.posix.basename(owner)) {
    throw new Error(`structural-validator orphan map binds another owner: ${owner}`);
  }
  const sources = sourceMapRepositorySources(repositoryRoot, mapPath, map);
  if (!sameStringSet(sources, STRUCTURAL_VALIDATOR_SOURCE_PROFILE)) {
    throw new Error(
      `structural-validator orphan has an unreviewed source profile: ${owner}`,
    );
  }
}

function expectedRawOrphanRuntimeSet(
  repositoryRoot: string,
  distRoot: string,
  graph: BuildGraph,
  allFiles: ReadonlySet<string>,
): ReadonlySet<string> {
  const structuralCandidates = [...graph.unreachable].filter((output) =>
    /^structural-validator-[A-Za-z0-9_-]+\.js$/u.test(output),
  );
  if (structuralCandidates.length !== 1 || structuralCandidates[0] === undefined) {
    throw new Error(
      `expected one reviewed structural-validator ESM orphan; observed ${JSON.stringify(sorted(structuralCandidates))}`,
    );
  }
  assertStructuralValidatorOrphanProfile(
    repositoryRoot,
    distRoot,
    structuralCandidates[0],
    allFiles,
  );
  return new Set([...EXACT_RUNTIME_ORPHANS, structuralCandidates[0]]);
}

function assertDeclarationMapOmission(
  distRoot: string,
  allFiles: readonly string[],
): void {
  const declarationMaps = allFiles.filter((file) => DECLARATION_MAP.test(file));
  if (declarationMaps.length > 0) {
    throw new Error(
      `declaration maps survived reviewed bundle omission: ${JSON.stringify(declarationMaps)}`,
    );
  }
  for (const declaration of allFiles.filter((file) => DECLARATION_OUTPUT.test(file))) {
    inspectReviewedSourceMapMetadata(
      readReviewedBuildText(distRoot, declaration),
      declaration,
      'declaration',
    );
  }
}

function verifyRuntimeSourceMapClosure(
  repositoryRoot: string,
  distRoot: string,
  files: readonly string[],
  requireExactSourceInventory: boolean,
): void {
  const fileSet = new Set(files);
  const referencedMaps = new Set<string>();
  const reviewedInputContents = new Map<string, string>();
  const runtimeOutputs = files.filter((file) => RUNTIME_OUTPUT.test(file));
  for (const owner of runtimeOutputs) {
    const code = readReviewedBuildText(distRoot, owner);
    const reference = inspectReviewedSourceMapMetadata(code, owner, 'runtime');
    const expectedMapless = isReviewedMaplessPackageRuntime(`dist/${owner}`, code);
    if (reference === undefined) {
      if (!expectedMapless) {
        throw new Error(`unreviewed mapless runtime output: ${owner}`);
      }
      continue;
    }
    if (expectedMapless) {
      throw new Error(`reviewed mapless runtime acquired source-map metadata: ${owner}`);
    }
    const mapName = path.posix.join(path.posix.dirname(owner), reference);
    if (!fileSet.has(mapName)) throw new Error(`runtime source map is absent: ${owner}`);
    if (referencedMaps.has(mapName)) {
      throw new Error(`runtime source map has more than one owner: ${mapName}`);
    }
    referencedMaps.add(mapName);

    const mapPath = path.join(distRoot, mapName);
    const map = parseSourceMap(mapPath);
    const mapKeys = new Set(Object.keys(map));
    const expectedMapKeys = new Set([
      'file',
      'mappings',
      'names',
      'sources',
      'sourcesContent',
      'version',
    ]);
    if (
      !sameStringSet(mapKeys, expectedMapKeys) ||
      map.version !== 3 ||
      map.file !== path.posix.basename(owner) ||
      !Array.isArray(map.names) ||
      !Array.isArray(map.sources) ||
      !Array.isArray(map.sourcesContent) ||
      map.sources.length === 0 ||
      map.sourcesContent.length !== map.sources.length ||
      map.sources.some((source) => typeof source !== 'string') ||
      map.sourcesContent.some((content) => typeof content !== 'string') ||
      typeof map.mappings !== 'string' ||
      map.mappings.length === 0 ||
      map.sourceRoot !== undefined
    ) {
      throw new Error(`runtime source map has an invalid closed profile: ${mapName}`);
    }
    if (map.names.some((name) => typeof name !== 'string')) {
      throw new Error(`runtime source map has non-textual names: ${mapName}`);
    }
    assertReviewedSourceMapResourceBounds(
      map.mappings as string,
      map.names as string[],
      map.sourcesContent as string[],
      code,
      mapName,
    );
    const reviewedSources = sourceMapRepositorySources(repositoryRoot, mapPath, map);
    inspectReviewedSourceMapMappings(
      map.mappings as string,
      map.names as string[],
      map.sourcesContent as string[],
      code,
      mapName,
    );
    for (let index = 0; index < map.sources.length; index += 1) {
      const source = map.sources[index];
      const embedded = map.sourcesContent[index];
      if (typeof source !== 'string' || typeof embedded !== 'string') {
        throw new Error(`runtime source map lacks textual embedded input: ${mapName}`);
      }
      const relative = resolveReviewedPackageSourceMapInput(
        path.posix.join('dist', mapName),
        source,
      );
      const authoritative = readReviewedSourceMapInput(repositoryRoot, relative);
      if (!reviewedSources.has(relative) || authoritative !== embedded) {
        throw new Error(`runtime source map input bytes are not authoritative: ${mapName}`);
      }
      const prior = reviewedInputContents.get(relative);
      if (prior !== undefined && prior !== embedded) {
        throw new Error(`runtime source maps disagree on embedded input bytes: ${relative}`);
      }
      reviewedInputContents.set(relative, embedded);
    }
  }

  const runtimeMaps = new Set(files.filter((file) => RUNTIME_MAP.test(file)));
  if (!sameStringSet(runtimeMaps, referencedMaps)) {
    throw new Error(
      `runtime source-map closure mismatch: ${JSON.stringify({
        published: sorted(runtimeMaps),
        referenced: sorted(referencedMaps),
      })}`,
    );
  }
  const otherMaps = files.filter(
    (file) => file.endsWith('.map') && !RUNTIME_MAP.test(file),
  );
  if (otherMaps.length > 0) {
    throw new Error(`unreviewed emitted map outputs: ${JSON.stringify(otherMaps)}`);
  }
  if (requireExactSourceInventory) {
    assertReviewedPackageSourceMapInputClosure(reviewedInputContents);
  }
}

function assertNoBareNodeBuiltins(distRoot: string, files: readonly string[]): void {
  for (const output of files.filter((file) => RUNTIME_OUTPUT.test(file))) {
    const code = readReviewedBuildText(distRoot, output);
    const bare = findBareNodeBuiltinSpecifiersInBuildCode(code, output);
    if (bare.length > 0) {
      throw new Error(
        `emitted runtime contains a shadowable bare Node builtin: ${output}:${bare[0]?.specifier}`,
      );
    }
  }
}

function assertFinalDataOutputClosure(
  repositoryRoot: string,
  distRoot: string,
  observedDataFiles: readonly string[],
): void {
  const sourceContractRoot = path.join(repositoryRoot, 'contract');
  const packagedContractRoot = path.join(distRoot, 'contract');
  const sourceProblems = contractPackageProblems(sourceContractRoot);
  if (sourceProblems.length > 0) {
    throw new Error(
      `final package source contract is incoherent:\n${sourceProblems.join('\n')}`,
    );
  }
  const contractFiles = packagedContractRelativeFiles(sourceContractRoot);
  const expectedDataFiles = new Set([
    'skills.manifest.json',
    ...contractFiles.map((file) => `contract/${file}`),
  ]);
  const observed = new Set(observedDataFiles);
  if (!sameStringSet(observed, expectedDataFiles)) {
    throw new Error(
      `final package data inventory mismatch: ${JSON.stringify({
        expected: sorted(expectedDataFiles),
        observed: sorted(observed),
      })}`,
    );
  }

  const packagedProblems = contractPackageProblems(packagedContractRoot);
  if (packagedProblems.length > 0) {
    throw new Error(
      `final packaged contract is incoherent:\n${packagedProblems.join('\n')}`,
    );
  }
  for (const relative of contractFiles) {
    const maximumBytes = relative === 'manifest.v1.json'
      ? NORMATIVE_CONTRACT_LIMITS.manifestBytes
      : NORMATIVE_CONTRACT_LIMITS.fileBytes;
    const source = readNormativeContractFile(
      sourceContractRoot,
      relative,
      maximumBytes,
    );
    const packaged = readNormativeContractFile(
      packagedContractRoot,
      relative,
      maximumBytes,
    );
    if (!source.equals(packaged)) {
      throw new Error(`final packaged contract differs from source bytes: ${relative}`);
    }
  }
  const expectedManifest = serializeManifest();
  const actualManifest = decodeCanonicalUtf8(
    readStableDirectRegularFile(
      path.join(distRoot, 'skills.manifest.json'),
      'final skills manifest',
      PACKAGE_BUILD_OUTPUT_LIMITS.skillsManifestBytes,
    ),
    'final skills manifest',
  );
  if (actualManifest !== expectedManifest) {
    throw new Error('final skills manifest differs from the deterministic source projection');
  }
}

function verifyPackageBuildOutput(
  repositoryRoot: string,
  phase: 'code' | 'final',
  options: PackageBuildVerificationOptions,
): void {
  const canonicalRoot = path.resolve(repositoryRoot);
  assertBuildOutputBoundary(canonicalRoot);
  const distRoot = path.join(canonicalRoot, 'dist');
  const manifest = readPackageBuildManifest(canonicalRoot);
  const observedDirectories = new Set<string>();
  const files = listRegularFiles(distRoot, observedDirectories);
  assertExactDirectoryClosure(observedDirectories, files);
  const unexpectedFiles = files.filter(
    (file) =>
      !RUNTIME_OUTPUT.test(file) &&
      !DECLARATION_OUTPUT.test(file) &&
      !file.endsWith('.map') &&
      !(phase === 'final' && file.endsWith('.json')),
  );
  if (unexpectedFiles.length > 0) {
    throw new Error(
      `${phase} package contains unsupported output kinds: ${JSON.stringify(unexpectedFiles)}`,
    );
  }
  const codeFiles = files.filter(
    (file) =>
      RUNTIME_OUTPUT.test(file) ||
      DECLARATION_OUTPUT.test(file) ||
      file.endsWith('.map'),
  );
  const codeFileSet = new Set(codeFiles);
  assertDeclarationMapOmission(distRoot, codeFiles);

  for (const forbidden of EXACT_POST_CLEANUP_FORBIDDEN) {
    if (codeFileSet.has(forbidden)) {
      throw new Error(`reviewed cleanup artifact survived publication: ${forbidden}`);
    }
  }
  const structuralEsmRemnants = codeFiles.filter((file) =>
    /^structural-validator-[A-Za-z0-9_-]+\.js(?:\.map)?$/u.test(file),
  );
  if (structuralEsmRemnants.length > 0) {
    throw new Error(
      `alternate structural-validator ESM artifacts survived cleanup: ${JSON.stringify(structuralEsmRemnants)}`,
    );
  }

  const roots = packageCodeRoots(manifest);
  const runtimeOutputs = new Set(codeFiles.filter((file) => RUNTIME_OUTPUT.test(file)));
  const declarationOutputs = new Set(
    codeFiles.filter((file) => DECLARATION_OUTPUT.test(file)),
  );
  const runtime = buildReachabilityGraph(
    distRoot,
    manifest,
    'runtime',
    roots.runtime,
    runtimeOutputs,
  );
  const declarations = buildReachabilityGraph(
    distRoot,
    manifest,
    'declaration',
    roots.declarations,
    declarationOutputs,
  );
  assertKnowledgeGraphDomEmittedClosure(
    distRoot,
    manifest,
    runtimeOutputs,
    declarationOutputs,
  );
  if (runtime.unreachable.size > 0) {
    throw new Error(`unreachable runtime outputs: ${JSON.stringify(sorted(runtime.unreachable))}`);
  }
  if (declarations.unreachable.size > 0) {
    throw new Error(
      `unreachable declaration outputs: ${JSON.stringify(sorted(declarations.unreachable))}`,
    );
  }
  if (options.requireExactModuleInventory !== false) {
    assertExactReviewedModuleInventory(runtime, declarations);
  }
  assertNoBareNodeBuiltins(distRoot, codeFiles);
  verifyRuntimeSourceMapClosure(
    canonicalRoot,
    distRoot,
    codeFiles,
    options.requireExactModuleInventory !== false,
  );
  if (phase === 'final') {
    assertFinalDataOutputClosure(
      canonicalRoot,
      distRoot,
      files.filter((file) => !codeFileSet.has(file)),
    );
  }
}

/** Verify the code-only output immediately after the clean compiler pass. */
export function verifyPackageCodeBuildOutput(
  repositoryRoot: string,
  options: PackageBuildVerificationOptions = {},
): void {
  verifyPackageBuildOutput(repositoryRoot, 'code', options);
}

/** Verify the exact code and data closure after every package emitter has run. */
export function verifyFinalPackageBuildOutput(
  repositoryRoot: string,
  options: PackageBuildVerificationOptions = {},
): void {
  verifyPackageBuildOutput(repositoryRoot, 'final', options);
}

/**
 * Remove only the exact tool-produced artifacts proven unreachable from every
 * package export/import/bin root, then re-enumerate and verify the closed tree.
 */
export function finalizePackageBuildOutput(repositoryRoot: string): void {
  const canonicalRoot = path.resolve(repositoryRoot);
  assertBuildOutputBoundary(canonicalRoot);
  const distRoot = path.join(canonicalRoot, 'dist');
  const manifest = readPackageBuildManifest(canonicalRoot);
  const files = listRegularFiles(distRoot);
  const unexpectedBuildFiles = files.filter(
    (file) =>
      !RUNTIME_OUTPUT.test(file) &&
      !DECLARATION_OUTPUT.test(file) &&
      !RUNTIME_MAP.test(file) &&
      !DECLARATION_MAP.test(file),
  );
  if (unexpectedBuildFiles.length > 0) {
    throw new Error(
      `code build emitted unsupported output kinds: ${JSON.stringify(unexpectedBuildFiles)}`,
    );
  }
  const fileSet = new Set(files);
  assertDeclarationMapOmission(distRoot, files);
  const roots = packageCodeRoots(manifest);
  const runtimeOutputs = new Set(files.filter((file) => RUNTIME_OUTPUT.test(file)));
  const declarationOutputs = new Set(
    files.filter((file) => DECLARATION_OUTPUT.test(file)),
  );
  const runtime = buildReachabilityGraph(
    distRoot,
    manifest,
    'runtime',
    roots.runtime,
    runtimeOutputs,
  );
  const declarations = buildReachabilityGraph(
    distRoot,
    manifest,
    'declaration',
    roots.declarations,
    declarationOutputs,
  );

  const expectedRuntime = expectedRawOrphanRuntimeSet(
    canonicalRoot,
    distRoot,
    runtime,
    fileSet,
  );
  const expectedDeclarations = new Set<string>(EXACT_DECLARATION_ORPHANS);
  if (!sameStringSet(runtime.unreachable, expectedRuntime)) {
    throw new Error(
      `unreviewed raw runtime inventory: ${JSON.stringify({
        expectedOrphans: sorted(expectedRuntime),
        observedOrphans: sorted(runtime.unreachable),
      })}`,
    );
  }
  if (!sameStringSet(declarations.unreachable, expectedDeclarations)) {
    throw new Error(
      `unreviewed raw declaration inventory: ${JSON.stringify({
        expectedOrphans: sorted(expectedDeclarations),
        observedOrphans: sorted(declarations.unreachable),
      })}`,
    );
  }

  const cleanup = new Set<string>(expectedDeclarations);
  for (const owner of expectedRuntime) {
    if (!fileSet.has(owner)) throw new Error(`reviewed runtime orphan is absent: ${owner}`);
    const code = readReviewedBuildText(distRoot, owner);
    const reference = oneTerminalSourceMapReference(code, owner);
    const mapName = path.posix.join(path.posix.dirname(owner), reference);
    if (!fileSet.has(mapName)) throw new Error(`reviewed orphan map is absent: ${mapName}`);
    cleanup.add(owner);
    cleanup.add(mapName);
  }
  for (const target of cleanup) {
    if (!fileSet.has(target)) throw new Error(`reviewed cleanup target is absent: ${target}`);
  }
  for (const target of sorted(cleanup)) unlinkSync(path.join(distRoot, target));

  const afterCleanup = new Set(listRegularFiles(distRoot));
  for (const target of cleanup) {
    if (afterCleanup.has(target) || existsSync(path.join(distRoot, target))) {
      throw new Error(`reviewed cleanup target survived unlink: ${target}`);
    }
  }
  verifyPackageCodeBuildOutput(canonicalRoot);
}

export async function buildPackage(
  dependencies?: PackageBuildDependencies,
): Promise<void> {
  const reviewedDependencies: PackageBuildDependencies = dependencies ?? {
    build,
    postprocess: finalizePackageBuildOutput,
  };
  assertPackageBuildDependencies(reviewedDependencies);
  const repositoryRoot = path.resolve(import.meta.dirname, '..');
  await executeReviewedPackageBuild(
    repositoryRoot,
    reviewedDependencies,
  );
}

/** Construct the destructive tool options internally from the frozen authority. */
export async function executeReviewedPackageBuild(
  repositoryRoot: string,
  dependencies: PackageBuildDependencies,
): Promise<void> {
  assertPackageBuildDependencies(dependencies);
  const canonicalRoot = path.resolve(repositoryRoot);
  const options: InlineConfig = {
    ...CORTEXEL_PACKAGE_BUILD_CONFIG,
    cwd: canonicalRoot,
    config: false,
  };
  assertBuildOutputBoundary(canonicalRoot);
  await dependencies.build(options);
  assertBuildOutputBoundary(canonicalRoot);
  dependencies.postprocess(canonicalRoot);
}

function isDirectExecution(): boolean {
  const entryPoint = process.argv[1];
  return (
    entryPoint !== undefined &&
    path.resolve(entryPoint) === path.resolve(fileURLToPath(import.meta.url))
  );
}

if (isDirectExecution()) await buildPackage();
