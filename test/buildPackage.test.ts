import {
  cpSync,
  existsSync,
  lstatSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  CORTEXEL_PACKAGE_BUILD_CONFIG,
  findBareNodeBuiltinSpecifiersInBuildCode,
  omitDeclarationMapsFromBuildBundle,
  rewriteBareNodeBuiltinsForBuild,
} from '../build.config.js';
import {
  assertBuildOutputBoundary,
  assertNoRelativePrivateCapabilityEdgeForBuild,
  assertReviewedPackageImportEdgeForBuild,
  buildPackage,
  executeReviewedPackageBuild,
  inspectEmittedModuleEdges,
  PACKAGE_BUILD_OUTPUT_LIMITS,
  verifyFinalPackageBuildOutput as verifyExactFinalPackageBuildOutput,
  verifyPackageCodeBuildOutput as verifyExactPackageCodeBuildOutput,
} from '../scripts/build-package.js';
import { serializeManifest } from '../scripts/emit-manifest.js';
import { copyContractForPackage } from '../scripts/lib/contract-package.js';
import {
  assertReviewedPackageSourceMapInputClosure,
  inspectReviewedSourceMapMappings,
  REVIEWED_PACKAGE_SOURCE_MAP_LIMITS,
  REVIEWED_PACKAGE_SOURCE_MAP_INPUTS,
  type ReviewedSourceMapResourceLimits,
} from '../scripts/lib/package-source-map-authority.js';

const temporaryDirectories: string[] = [];
const FIXTURE_VERIFICATION = Object.freeze({
  requireExactModuleInventory: false,
});

function verifyPackageCodeBuildOutput(repository: string): void {
  verifyExactPackageCodeBuildOutput(repository, FIXTURE_VERIFICATION);
}

function verifyFinalPackageBuildOutput(repository: string): void {
  verifyExactFinalPackageBuildOutput(repository, FIXTURE_VERIFICATION);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createFinalOutputFixture(): string {
  const repository = realpathSync(mkdtempSync(
    path.join(tmpdir(), 'cortexel-build-output-'),
  ));
  temporaryDirectories.push(repository);
  const sourceDirectory = path.join(repository, 'src/core');
  const outputDirectory = path.join(repository, 'dist/figure');
  mkdirSync(sourceDirectory, { recursive: true });
  mkdirSync(outputDirectory, { recursive: true });

  const source = 'export const value = 1;\n';
  const runtime = 'export const value = 1;\n//# sourceMappingURL=index.js.map';
  writeFileSync(path.join(sourceDirectory, 'canonicalize.ts'), source);
  writeFileSync(path.join(outputDirectory, 'index.js'), runtime);
  writeFileSync(
    path.join(outputDirectory, 'index.js.map'),
    `${JSON.stringify({
      version: 3,
      file: 'index.js',
      names: [],
      sources: ['../../src/core/canonicalize.ts'],
      sourcesContent: [source],
      mappings: 'AAAA',
    })}\n`,
  );
  writeFileSync(path.join(outputDirectory, 'index.d.ts'), 'export declare const value = 1;\n');
  writeFileSync(
    path.join(repository, 'package.json'),
    `${JSON.stringify({
      type: 'module',
      exports: {
        './figure': {
          import: {
            types: './dist/figure/index.d.ts',
            default: './dist/figure/index.js',
          },
        },
      },
    })}\n`,
  );
  return repository;
}

function createFinalPackageFixture(): string {
  const repository = createFinalOutputFixture();
  const sourceRoot = path.resolve(import.meta.dirname, '..');
  cpSync(path.join(sourceRoot, 'contract'), path.join(repository, 'contract'), {
    recursive: true,
  });
  copyContractForPackage(
    path.join(repository, 'contract'),
    path.join(repository, 'dist/contract'),
  );
  writeFileSync(
    path.join(repository, 'dist/skills.manifest.json'),
    serializeManifest(),
    'utf8',
  );
  return repository;
}

describe('programmatic package build', () => {
  it('passes the reviewed static options while disabling config discovery', async () => {
    const calls: unknown[] = [];
    const postprocessCalls: string[] = [];
    await buildPackage({
      build: async (options) => {
        calls.push(options);
      },
      postprocess: (repositoryRoot) => {
        postprocessCalls.push(repositoryRoot);
      },
    });
    expect(calls).toHaveLength(1);
    expect(postprocessCalls).toEqual([path.resolve(import.meta.dirname, '..')]);
    expect(calls[0]).toEqual(
      expect.objectContaining({
        config: false,
        cwd: path.resolve(import.meta.dirname, '..'),
        outDir: 'dist',
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
        dts: { sourcemap: true },
        target: 'es2022',
        fixedExtension: false,
        format: ['esm', 'cjs'],
        treeshake: true,
        nodeProtocol: true,
        cjsDefault: false,
        envPrefix: [],
        report: false,
      }),
    );
    expect(CORTEXEL_PACKAGE_BUILD_CONFIG.deps).toEqual({
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
      onlyBundle: [],
    });
    expect(Object.isFrozen(CORTEXEL_PACKAGE_BUILD_CONFIG)).toBe(true);
    expect(Object.isFrozen(CORTEXEL_PACKAGE_BUILD_CONFIG.entry)).toBe(true);
    expect(Object.isFrozen(CORTEXEL_PACKAGE_BUILD_CONFIG.deps)).toBe(true);
    expect(Object.isFrozen(CORTEXEL_PACKAGE_BUILD_CONFIG.deps.neverBundle)).toBe(true);
  });

  it('constructs a fresh exact build-option record inside the checked boundary', async () => {
    const repository = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-build-options-'),
    ));
    temporaryDirectories.push(repository);
    let observedOptions: Record<string, unknown> | undefined;
    let postprocessRoot: string | undefined;
    await executeReviewedPackageBuild(
      path.relative(process.cwd(), repository),
      {
        build: async (options) => {
          observedOptions = options as Record<string, unknown>;
        },
        postprocess: (root) => { postprocessRoot = root; },
      },
    );
    expect(postprocessRoot).toBe(repository);
    expect(observedOptions).toEqual({
      ...CORTEXEL_PACKAGE_BUILD_CONFIG,
      cwd: repository,
      config: false,
    });
    if (observedOptions === undefined) throw new Error('builder did not receive options');
    expect(Object.getPrototypeOf(observedOptions)).toBe(Object.prototype);
    expect(Reflect.ownKeys(observedOptions).every(
      (key) => typeof key === 'string',
    )).toBe(true);
    const outDirDescriptor = Object.getOwnPropertyDescriptor(observedOptions, 'outDir');
    expect(outDirDescriptor?.value).toBe('dist');
    expect(Object.hasOwn(outDirDescriptor ?? {}, 'get')).toBe(false);
    expect(Object.hasOwn(outDirDescriptor ?? {}, 'set')).toBe(false);
  });

  it('never invokes the destructive builder for an indirect output root', async () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'cortexel-build-boundary-'));
    temporaryDirectories.push(parent);
    mkdirSync(path.join(parent, 'repository'));
    mkdirSync(path.join(parent, 'external'));
    const repository = realpathSync(path.join(parent, 'repository'));
    const external = realpathSync(path.join(parent, 'external'));
    const sentinel = path.join(external, 'sentinel.txt');
    writeFileSync(sentinel, 'outside build authority\n', 'utf8');
    const originalMode = lstatSync(sentinel).mode & 0o7777;
    symlinkSync(external, path.join(repository, 'dist'), 'dir');

    let buildCalls = 0;
    let postprocessCalls = 0;
    expect(() => assertBuildOutputBoundary(repository)).toThrow(
      /output root must be one canonical direct directory/u,
    );
    await expect(executeReviewedPackageBuild(
      repository,
      {
        build: async () => {
          buildCalls += 1;
        },
        postprocess: () => {
          postprocessCalls += 1;
        },
      },
    )).rejects.toThrow(/output root must be one canonical direct directory/u);
    expect(buildCalls).toBe(0);
    expect(postprocessCalls).toBe(0);
    expect(readFileSync(sentinel, 'utf8')).toBe('outside build authority\n');
    expect(lstatSync(sentinel).mode & 0o7777).toBe(originalMode);
  });

  it('suppresses build and postprocessing across both output-overflow boundaries', async () => {
    const preexisting = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-build-preexisting-overflow-'),
    ));
    temporaryDirectories.push(preexisting);
    mkdirSync(path.join(preexisting, 'dist'));
    for (let index = 0; index <= PACKAGE_BUILD_OUTPUT_LIMITS.directoryEntries; index += 1) {
      writeFileSync(path.join(preexisting, 'dist', `entry-${index}.txt`), '');
    }
    let preexistingBuildCalls = 0;
    let preexistingPostprocessCalls = 0;
    await expect(executeReviewedPackageBuild(preexisting, {
      build: async () => { preexistingBuildCalls += 1; },
      postprocess: () => { preexistingPostprocessCalls += 1; },
    })).rejects.toThrow(/per-directory entry bound/u);
    expect(preexistingBuildCalls).toBe(0);
    expect(preexistingPostprocessCalls).toBe(0);

    const emitted = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-build-emitted-overflow-'),
    ));
    temporaryDirectories.push(emitted);
    let emittedBuildCalls = 0;
    let emittedPostprocessCalls = 0;
    await expect(executeReviewedPackageBuild(emitted, {
      build: async () => {
        emittedBuildCalls += 1;
        mkdirSync(path.join(emitted, 'dist'));
        for (let index = 0; index <= PACKAGE_BUILD_OUTPUT_LIMITS.directoryEntries; index += 1) {
          writeFileSync(path.join(emitted, 'dist', `entry-${index}.txt`), '');
        }
      },
      postprocess: () => { emittedPostprocessCalls += 1; },
    })).rejects.toThrow(/per-directory entry bound/u);
    expect(emittedBuildCalls).toBe(1);
    expect(emittedPostprocessCalls).toBe(0);
  });

  it('rejects the legacy caller-options seam without invoking accessors or tools', async () => {
    const repository = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-build-root-binding-'),
    ));
    temporaryDirectories.push(repository);
    let optionReads = 0;
    const forgedOptions = {
      get outDir() {
        optionReads += 1;
        return optionReads < 3 ? 'dist' : '../../outside';
      },
    };
    let buildCalls = 0;
    let postprocessCalls = 0;
    const legacyInvocation = executeReviewedPackageBuild as unknown as (
      root: string,
      options: unknown,
      dependencies: {
        build(): Promise<void>;
        postprocess(): void;
      },
    ) => Promise<void>;
    await expect(legacyInvocation(
      repository,
      forgedOptions,
      {
        build: async () => {
          buildCalls += 1;
        },
        postprocess: () => {
          postprocessCalls += 1;
        },
      },
    )).rejects.toThrow(/dependencies must be/u);
    expect(optionReads).toBe(0);
    expect(buildCalls).toBe(0);
    expect(postprocessCalls).toBe(0);
    expect(existsSync(path.join(repository, 'dist'))).toBe(false);
  });

  it('bounds build-output traversal before module or source-map materialization', () => {
    const output = (): { readonly repository: string; readonly dist: string } => {
      const repository = realpathSync(mkdtempSync(
        path.join(tmpdir(), 'cortexel-build-traversal-'),
      ));
      temporaryDirectories.push(repository);
      const dist = path.join(repository, 'dist');
      mkdirSync(dist);
      return { repository, dist };
    };

    const wide = output();
    for (let index = 0; index <= PACKAGE_BUILD_OUTPUT_LIMITS.directoryEntries; index += 1) {
      writeFileSync(path.join(wide.dist, `entry-${index}.txt`), '');
    }
    expect(() => assertBuildOutputBoundary(wide.repository)).toThrow(
      /per-directory entry bound/u,
    );

    const manyDirectories = output();
    for (let index = 0; index <= PACKAGE_BUILD_OUTPUT_LIMITS.directories; index += 1) {
      mkdirSync(path.join(manyDirectories.dist, `directory-${index}`));
    }
    expect(() => assertBuildOutputBoundary(manyDirectories.repository)).toThrow(
      /directory bound/u,
    );

    const deep = output();
    let deepDirectory = deep.dist;
    for (let index = 0; index < PACKAGE_BUILD_OUTPUT_LIMITS.depth; index += 1) {
      deepDirectory = path.join(deepDirectory, `d${index}`);
      mkdirSync(deepDirectory);
    }
    writeFileSync(path.join(deepDirectory, 'too-deep.txt'), '');
    expect(() => assertBuildOutputBoundary(deep.repository)).toThrow(
      /path exceeds the reviewed bound/u,
    );

    const oversized = output();
    writeFileSync(path.join(oversized.dist, 'oversized.bin'), '');
    truncateSync(
      path.join(oversized.dist, 'oversized.bin'),
      PACKAGE_BUILD_OUTPUT_LIMITS.fileBytes + 1,
    );
    expect(() => assertBuildOutputBoundary(oversized.repository)).toThrow(
      /file exceeds the reviewed byte bound/u,
    );

    const aggregate = output();
    const aggregatePart = Math.floor(PACKAGE_BUILD_OUTPUT_LIMITS.aggregateBytes / 5) + 1;
    for (let index = 0; index < 5; index += 1) {
      const target = path.join(aggregate.dist, `aggregate-${index}.json`);
      writeFileSync(target, '');
      truncateSync(target, aggregatePart);
    }
    expect(() => assertBuildOutputBoundary(aggregate.repository)).toThrow(
      /aggregate byte bound/u,
    );

    const maps = output();
    const mapPart = Math.floor(
      PACKAGE_BUILD_OUTPUT_LIMITS.aggregateSourceMapBytes / 3,
    ) + 1;
    for (let index = 0; index < 3; index += 1) {
      const target = path.join(maps.dist, `map-${index}.js.map`);
      writeFileSync(target, '');
      truncateSync(target, mapPart);
    }
    expect(() => assertBuildOutputBoundary(maps.repository)).toThrow(
      /source maps exceed the reviewed aggregate byte bound/u,
    );

    const runtimes = output();
    for (let index = 0; index <= PACKAGE_BUILD_OUTPUT_LIMITS.runtimeFiles; index += 1) {
      writeFileSync(path.join(runtimes.dist, `runtime-${index}.js`), '');
    }
    expect(() => assertBuildOutputBoundary(runtimes.repository)).toThrow(
      /code inventory exceeds the reviewed count bound/u,
    );

    const longPath = output();
    const first = 'a'.repeat(200);
    const second = 'b'.repeat(200);
    mkdirSync(path.join(longPath.dist, first, second), { recursive: true });
    writeFileSync(path.join(longPath.dist, first, second, 'c'.repeat(111)), '');
    expect(() => assertBuildOutputBoundary(longPath.repository)).toThrow(
      /path exceeds the reviewed bound/u,
    );

    const exactPath = output();
    writeFileSync(
      path.join(
        exactPath.dist,
        `${'a'.repeat(PACKAGE_BUILD_OUTPUT_LIMITS.pathBytes - '.js'.length)}.js`,
      ),
      '',
    );
    expect(() => assertBuildOutputBoundary(exactPath.repository)).not.toThrow();

    const oneByteTooLong = output();
    writeFileSync(
      path.join(
        oneByteTooLong.dist,
        `${'a'.repeat(PACKAGE_BUILD_OUTPUT_LIMITS.pathBytes - '.js'.length + 1)}.js`,
      ),
      '',
    );
    expect(() => assertBuildOutputBoundary(oneByteTooLong.repository)).toThrow(
      /path exceeds the reviewed bound/u,
    );

    for (const reservedName of ['CON.js', 'foo.']) {
      const reserved = output();
      writeFileSync(path.join(reserved.dist, reservedName), '');
      expect(
        () => assertBuildOutputBoundary(reserved.repository),
        reservedName,
      ).toThrow(/nonportable path segment/u);
    }

    const folded = output();
    writeFileSync(path.join(folded.dist, 'A.js'), '');
    writeFileSync(path.join(folded.dist, 'a.js'), '');
    const foldedNames = readdirSync(folded.dist);
    if (foldedNames.includes('A.js') && foldedNames.includes('a.js')) {
      expect(() => assertBuildOutputBoundary(folded.repository)).toThrow(
        /duplicate portable identity/u,
      );
    } else {
      // A case-insensitive filesystem has already collapsed the two spellings to
      // one pathname identity. It cannot host the collision this gate rejects.
      expect(foldedNames.filter((name) => name.toLowerCase() === 'a.js')).toHaveLength(1);
      expect(() => assertBuildOutputBoundary(folded.repository)).not.toThrow();
    }
  });

  it('rejects non-UTF-8 build-output names where the filesystem admits them', () => {
    const repository = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-build-name-bytes-'),
    ));
    temporaryDirectories.push(repository);
    const dist = path.join(repository, 'dist');
    mkdirSync(dist);
    const rawPath = Buffer.concat([
      Buffer.from(`${dist}${path.sep}`, 'utf8'),
      Buffer.from([0xff]),
    ]);
    try {
      writeFileSync(rawPath, '');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EILSEQ' || code === 'ENOTSUP') return;
      throw error;
    }
    expect(() => assertBuildOutputBoundary(repository)).toThrow(/nonportable path segment/u);
  });

  it('requires test authority to replace both build and postprocessing', () => {
    if (false) {
      // @ts-expect-error a fake builder cannot bypass the output authority gate
      void buildPackage({ build: async () => undefined });
    }
    expect(true).toBe(true);
  });

  it('wraps every build pass with resolver and final ownership authority', async () => {
    expect(Object.hasOwn(CORTEXEL_PACKAGE_BUILD_CONFIG, 'plugins')).toBe(false);
    const inputOptions = CORTEXEL_PACKAGE_BUILD_CONFIG.inputOptions;
    expect(typeof inputOptions).toBe('function');
    if (typeof inputOptions !== 'function') throw new Error('missing inputOptions gate');

    for (const cjsDts of [false, true]) {
      const priorPlugin = { name: `prior-${String(cjsDts)}` };
      const resolved = await inputOptions(
        { plugins: [priorPlugin] },
        cjsDts ? 'cjs' : 'es',
        { cjsDts },
      );
      expect(resolved).not.toBeNull();
      if (resolved === null || resolved === undefined) throw new Error('missing wrapped options');
      expect(Object.isFrozen(resolved.plugins)).toBe(true);
      expect(resolved.plugins).toEqual([
        expect.objectContaining({
          name: 'cortexel-shared-capabilities',
          resolveId: expect.objectContaining({ order: 'pre' }),
        }),
        priorPlugin,
        expect.objectContaining({ name: 'cortexel-node-builtin-protocol' }),
        expect.objectContaining({ name: 'cortexel-omit-declaration-maps' }),
        expect.objectContaining({
          name: 'cortexel-capability-module-ownership',
          options: expect.objectContaining({ order: 'post' }),
          outputOptions: expect.objectContaining({ order: 'post' }),
          buildEnd: expect.objectContaining({ order: 'post' }),
          generateBundle: expect.objectContaining({ order: 'post' }),
        }),
      ]);
      expect(typeof resolved.external).toBe('function');
      expect(resolved.resolve?.alias).toEqual({});
      expect(Object.isFrozen(resolved.resolve?.alias)).toBe(true);
    }

    expect(() => inputOptions(
      { resolve: { alias: { ordinary: '#cortexel-request-capability' } } },
      'cjs',
      { cjsDts: false },
    )).toThrow(/native resolve\.alias must remain one exact empty record/u);
  });

  it('rewrites only the exact generated CJS URL shim with a composable map', () => {
    const source = [
      'const inert = "url";',
      'const here = require("url").pathToFileURL(__filename).href;',
      '',
    ].join('\n');
    const rewritten = rewriteBareNodeBuiltinsForBuild(
      source,
      'structural-validator-AbCd_123.cjs',
    );
    expect(rewritten.code).toContain(
      'require("node:url").pathToFileURL(__filename)',
    );
    expect(rewritten.code).toContain('const inert = "url";');
    expect(rewritten.rewritten).toEqual([
      expect.objectContaining({ specifier: 'url' }),
    ]);
    expect(rewritten.map).not.toBeNull();
    const map = JSON.parse(rewritten.map?.toString() ?? '{}') as {
      mappings?: unknown;
      sources?: unknown;
      sourcesContent?: unknown;
    };
    expect(typeof map.mappings).toBe('string');
    expect(map.mappings).not.toBe('');
    expect(map.sources).toEqual(['structural-validator-AbCd_123.cjs']);
    expect(map.sourcesContent).toEqual([source]);
    expect(
      findBareNodeBuiltinSpecifiersInBuildCode(
        rewritten.code,
        'structural-validator-AbCd_123.cjs',
      ),
    ).toEqual([]);
  });

  it('fails closed on every unreviewed bare-builtin rewrite candidate', () => {
    for (const [code, fileName] of [
      ['const value = require("fs");', 'structural-validator-AbCd.cjs'],
      ['const value = require("url");', 'structural-validator-AbCd.cjs'],
      [
        'function local(require) { return require("url"); }',
        'structural-validator-AbCd.cjs',
      ],
      [
        'const value = require("url").pathToFileURL(__filename);',
        'other-AbCd.cjs',
      ],
      [
        'const a = require("url").pathToFileURL(__filename);\nconst b = require("url");',
        'cli/main.cjs',
      ],
    ] as const) {
      expect(
        () => rewriteBareNodeBuiltinsForBuild(code, fileName),
        `${fileName}: ${code}`,
      ).toThrow(/unreviewed bare Node builtin emission/u);
    }
  });

  it('rejects parse ambiguity before inspecting module specifiers', () => {
    expect(() =>
      findBareNodeBuiltinSpecifiersInBuildCode(
        'const broken = ; require("url");',
        'broken.cjs',
      ),
    ).toThrow(/cannot inspect emitted JavaScript/u);
  });

  it('binds package-import conditions to loader syntax rather than file suffix', () => {
    expect(inspectEmittedModuleEdges(
      'require("#choice");',
      'entry.cjs',
      'runtime',
    )).toEqual([{ specifier: '#choice', condition: 'require' }]);
    expect(inspectEmittedModuleEdges(
      'import("#choice");',
      'entry.cjs',
      'runtime',
    )).toEqual([{ specifier: '#choice', condition: 'import' }]);
    expect(inspectEmittedModuleEdges(
      'import value = require("#choice");',
      'entry.d.cts',
      'declaration',
    )).toEqual([{ specifier: '#choice', condition: 'types' }]);
    expect(() => inspectEmittedModuleEdges(
      'require("node:fs");',
      'entry.js',
      'runtime',
    )).toThrow(/ESM contains a direct require/u);
    for (const invalidCommonJs of [
      'import "node:fs";',
      'export const value = 1;',
      'import.meta.url;',
      'await Promise.resolve();',
    ]) {
      expect(
        () => inspectEmittedModuleEdges(invalidCommonJs, 'entry.cjs', 'runtime'),
        invalidCommonJs,
      ).toThrow(/CommonJS contains/u);
    }
  });

  it('admits package imports only through exact emitted ownership tuples', () => {
    const capabilityEdge = {
      owner: 'figure/index.js',
      specifier: '#cortexel-request-capability',
      condition: 'import',
      kind: 'runtime',
    } as const;
    const brandEdge = {
      owner: 'internal/request-capability.d.cts',
      specifier: '#cortexel-validated-request-brand',
      condition: 'types',
      kind: 'declaration',
    } as const;
    expect(() => assertReviewedPackageImportEdgeForBuild(capabilityEdge)).not.toThrow();
    expect(() => assertReviewedPackageImportEdgeForBuild(brandEdge)).not.toThrow();

    for (const edge of [
      { ...capabilityEdge, owner: 'figure/other.js' },
      { ...capabilityEdge, specifier: '#cortexel-figure-result-capability' },
      { ...capabilityEdge, condition: 'require' as const },
      { ...capabilityEdge, kind: 'declaration' as const },
      { ...brandEdge, owner: 'internal/other.d.cts' },
      { ...brandEdge, specifier: '#cortexel-request-capability' },
    ]) {
      expect(
        () => assertReviewedPackageImportEdgeForBuild(edge),
        JSON.stringify(edge),
      ).toThrow(/exact reviewed owner\/specifier\/condition\/kind tuple/u);
    }

    const repository = createFinalOutputFixture();
    const manifestPath = path.join(repository, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    manifest.imports = {
      '#cortexel-figure-result-capability': './dist/figure/index.js',
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');
    writeFileSync(
      path.join(repository, 'dist/figure/index.js'),
      'import "#cortexel-figure-result-capability";\nexport const value = 1;\n//# sourceMappingURL=index.js.map',
    );
    expect(() => verifyPackageCodeBuildOutput(repository)).toThrow(
      /exact reviewed owner\/specifier\/condition\/kind tuple/u,
    );
  });

  it('rejects every relative emitted edge into a private capability output', () => {
    for (const [target, kind] of [
      ['internal/request-capability.js', 'runtime'],
      ['internal/request-capability.cjs', 'runtime'],
      ['internal/figure-result-capability.d.ts', 'declaration'],
      ['internal/knowledge-graph-presentation-capability.d.cts', 'declaration'],
    ] as const) {
      expect(
        () => assertNoRelativePrivateCapabilityEdgeForBuild(
          'public/consumer.js',
          target,
          kind,
        ),
        target,
      ).toThrow(/relative incoming edge to a private capability output/u);
    }
    expect(() => assertNoRelativePrivateCapabilityEdgeForBuild(
      'public/consumer.js',
      'shared/ordinary.js',
      'runtime',
    )).not.toThrow();

    const repository = createFinalOutputFixture();
    const internal = path.join(repository, 'dist/internal');
    mkdirSync(internal);
    writeFileSync(
      path.join(internal, 'request-capability.cjs'),
      'exports.privateCapability = true;\n',
    );
    writeFileSync(
      path.join(repository, 'dist/figure/index.js'),
      [
        'import "../internal/request-capability.cjs";',
        'export const value = 1;',
        '//# sourceMappingURL=index.js.map',
      ].join('\n'),
    );
    expect(() => verifyPackageCodeBuildOutput(repository)).toThrow(
      /relative incoming edge to a private capability output/u,
    );
  });

  it('omits only complete declaration-map pairs and handles deferred deletion', () => {
    const bundle = {
      'index.d.ts': {
        type: 'chunk',
        fileName: 'index.d.ts',
        code: 'export declare const value: number;\n//# sourceMappingURL=index.d.ts.map',
      },
      'index.d.ts.map': {
        type: 'asset',
        fileName: 'index.d.ts.map',
        source: '{}',
      },
      'index.js': {
        type: 'chunk',
        fileName: 'index.js',
        code: 'export const value = 1;\n//# sourceMappingURL=index.js.map',
      },
      'index.js.map': {
        type: 'asset',
        fileName: 'index.js.map',
        source: '{}',
      },
    } as const;
    const mutableBundle = structuredClone(bundle);
    omitDeclarationMapsFromBuildBundle(mutableBundle);
    expect(mutableBundle).toEqual({
      'index.d.ts': {
        type: 'chunk',
        fileName: 'index.d.ts',
        code: 'export declare const value: number;\n',
      },
      'index.js': bundle['index.js'],
      'index.js.map': bundle['index.js.map'],
    });

    const deferredTarget = structuredClone(bundle);
    const deferredDeletionBundle = new Proxy(deferredTarget, {
      deleteProperty: () => true,
    });
    expect(() => omitDeclarationMapsFromBuildBundle(deferredDeletionBundle)).not.toThrow();
    expect(Object.hasOwn(deferredTarget, 'index.d.ts.map')).toBe(true);
    expect(deferredTarget['index.d.ts'].code).not.toContain('sourceMappingURL');

    for (const code of [
      'export declare const value: number;',
      '//# sourceMappingURL=other.d.ts.map',
      '//# sourceMappingURL=index.d.ts.map\nexport declare const value: number;',
      '//# sourceMappingURL=index.d.ts.map\n//# sourceMappingURL=index.d.ts.map',
    ]) {
      expect(() => omitDeclarationMapsFromBuildBundle({
        'index.d.ts': { type: 'chunk', fileName: 'index.d.ts', code },
        'index.d.ts.map': {
          type: 'asset',
          fileName: 'index.d.ts.map',
          source: '{}',
        },
      }), code).toThrow(/lacks one exact terminal reference/u);
    }
    expect(() => omitDeclarationMapsFromBuildBundle({
      'orphan.d.cts.map': {
        type: 'asset',
        fileName: 'orphan.d.cts.map',
        source: '{}',
      },
    })).toThrow(/no same-bundle owner/u);
    expect(() => omitDeclarationMapsFromBuildBundle({
      'unexpected.d.mts.map': {
        type: 'asset',
        fileName: 'unexpected.d.mts.map',
        source: '{}',
      },
    })).toThrow(/unreviewed declaration map output/u);
  });
});

describe('final package output authority', () => {
  it('rejects an oversized manifest before trusting emitted module syntax', () => {
    const repository = createFinalOutputFixture();
    writeFileSync(path.join(repository, 'dist/figure/index.js'), 'return;\n');
    truncateSync(
      path.join(repository, 'package.json'),
      PACKAGE_BUILD_OUTPUT_LIMITS.packageManifestBytes + 1,
    );
    let observed: unknown;
    try {
      verifyPackageCodeBuildOutput(repository);
    } catch (error) {
      observed = error;
    }
    expect(observed).toBeInstanceOf(Error);
    expect((observed as Error).message).toMatch(/cannot parse package build authority/u);
    const cause = (observed as Error & { cause?: unknown }).cause;
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).message).toMatch(
      /not one bounded canonical direct regular file/u,
    );

    const ordinaryManifest = createFinalOutputFixture();
    writeFileSync(path.join(ordinaryManifest, 'dist/figure/index.js'), 'return;\n');
    expect(() => verifyPackageCodeBuildOutput(ordinaryManifest)).toThrow(
      /strict-mode early-error syntax/u,
    );
  });

  it('decodes the closed ECMA-426 mapping grammar and bounds every coordinate', () => {
    expect(inspectReviewedSourceMapMappings(
      'AAAA;AACA',
      [],
      ['a\nb'],
      'a\nb',
      'fixture.js.map',
    )).toEqual({
      generatedLines: 2,
      segments: 2,
      mappedSegments: 2,
      namedSegments: 0,
    });
    expect(inspectReviewedSourceMapMappings(
      'A,CAAC,CAAAA',
      ['b'],
      ['ab'],
      'abc',
      'fixture.js.map',
    )).toEqual({
      generatedLines: 1,
      segments: 3,
      mappedSegments: 2,
      namedSegments: 1,
    });

    const invalidMappings = [
      '',
      ';',
      'AA',
      'AAA',
      'AAAAAA',
      ',A',
      'A,',
      'A,,A',
      'g',
      'gA',
      '=',
      'B',
      'D',
      'ACAA',
      'ADAA',
      'AACA',
      'AAAE',
      'AAAAC',
      'E',
      'A;A',
      'ggggggE',
      'C,D',
      'C',
      'AAAC',
    ] as const;
    for (const mappings of invalidMappings) {
      expect(
        () => inspectReviewedSourceMapMappings(
          mappings,
          ['named'],
          ['x'],
          'x',
          'fixture.js.map',
        ),
        mappings,
      ).toThrow(/source map/u);
    }

    expect(() => inspectReviewedSourceMapMappings(
      'AAAA',
      ['sentinel'],
      ['a'],
      'a',
      'fixture.js.map',
    )).toThrow(/unreferenced name/u);
    expect(() => inspectReviewedSourceMapMappings(
      'AAAA',
      [],
      ['a', 'hidden'],
      'a',
      'fixture.js.map',
    )).toThrow(/unreferenced embedded source/u);
    expect(() => inspectReviewedSourceMapMappings(
      'AAAAA',
      ['b'],
      ['a'],
      'a',
      'fixture.js.map',
    )).toThrow(/does not bind original source text/u);
  });

  it('bounds source-map verification work before allocating decoded tables', () => {
    const limits = (changes: Partial<ReviewedSourceMapResourceLimits>) => ({
      ...REVIEWED_PACKAGE_SOURCE_MAP_LIMITS,
      ...changes,
    });
    const inspect = (
      mappings: string,
      names: string[],
      sourcesContent: string[],
      generatedCode: string,
      changes: Partial<ReviewedSourceMapResourceLimits>,
    ) => inspectReviewedSourceMapMappings(
      mappings,
      names,
      sourcesContent,
      generatedCode,
      'bounded.js.map',
      limits(changes),
    );

    expect(() => inspect('AA', [], [], 'x', { mappingsUnits: 1 }))
      .toThrow(/mappings exceed/u);
    expect(() => inspect('A', [], [], 'xx', { generatedCodeUnits: 1 }))
      .toThrow(/owner exceeds/u);
    expect(() => inspect('AAAA', [], ['x', 'y'], 'x', { sources: 1 }))
      .toThrow(/table exceeds/u);
    expect(() => inspect('A', ['a', 'b'], [], 'x', { names: 1 }))
      .toThrow(/table exceeds/u);
    expect(() => inspect('A', ['ab'], [], 'x', { nameUnits: 1 }))
      .toThrow(/name exceeds/u);
    expect(() => inspect('A', ['a', 'b'], [], 'x', { aggregateNameUnits: 1 }))
      .toThrow(/names exceed/u);
    expect(() => inspect('AAAA', [], ['ab'], 'x', { aggregateSourceContentUnits: 1 }))
      .toThrow(/inputs exceed/u);
    expect(() => inspect('AAAA', [], ['x'], 'x\ny', { generatedPhysicalLines: 1 }))
      .toThrow(/owner lines exceed/u);
    expect(() => inspect('AAAA', [], ['x\ny'], 'x', {
      aggregateOriginalPhysicalLines: 1,
    })).toThrow(/input lines exceed/u);
    expect(() => inspect('A,A', [], [], 'xx', { segments: 1 }))
      .toThrow(/segments exceed/u);
    expect(() => inspect('AAAAA,CAAAA', ['long'], ['long'], 'xx', {
      referencedNameUnits: 4,
    })).toThrow(/named mappings exceed/u);
    expect(() => inspect('A', [], [], 'x', {
      segments: REVIEWED_PACKAGE_SOURCE_MAP_LIMITS.segments + 1,
    })).toThrow(/invalid reviewed segments limit/u);
  });

  it('binds the complete source identity/content projection to one reviewed digest', () => {
    const repository = path.resolve(import.meta.dirname, '..');
    const contents = new Map(REVIEWED_PACKAGE_SOURCE_MAP_INPUTS.map((identity) => [
      identity,
      readFileSync(path.join(repository, ...identity.split('/')), 'utf8'),
    ]));
    expect(() => assertReviewedPackageSourceMapInputClosure(contents)).not.toThrow();

    const changed = new Map(contents);
    const first = REVIEWED_PACKAGE_SOURCE_MAP_INPUTS[0];
    changed.set(first, `${changed.get(first) ?? ''}\n`);
    expect(() => assertReviewedPackageSourceMapInputClosure(changed)).toThrow(
      /embedded input bytes differ/u,
    );

    const swapped = new Map(contents);
    const second = REVIEWED_PACKAGE_SOURCE_MAP_INPUTS[1];
    swapped.set(first, contents.get(second) ?? '');
    swapped.set(second, contents.get(first) ?? '');
    expect(() => assertReviewedPackageSourceMapInputClosure(swapped)).toThrow(
      /embedded input bytes differ/u,
    );

    const incomplete = new Map(contents);
    incomplete.delete(first);
    expect(() => assertReviewedPackageSourceMapInputClosure(incomplete)).toThrow(
      /identity closure/u,
    );
  });

  it('accepts one closed exported runtime/declaration/map fixture', () => {
    expect(() => verifyPackageCodeBuildOutput(createFinalOutputFixture())).not.toThrow();
  });

  it('rejects bare builtins even when a complete map exists', () => {
    const repository = createFinalOutputFixture();
    const runtimePath = path.join(repository, 'dist/figure/index.js');
    writeFileSync(
      runtimePath,
      'import fs from "fs";\nexport const value = fs;\n//# sourceMappingURL=index.js.map',
    );
    expect(() => verifyPackageCodeBuildOutput(repository)).toThrow(
      /shadowable bare Node builtin/u,
    );
  });

  it('rejects a missing or unreferenced runtime map', () => {
    const missing = createFinalOutputFixture();
    unlinkSync(path.join(missing, 'dist/figure/index.js.map'));
    expect(() => verifyPackageCodeBuildOutput(missing)).toThrow(
      /runtime source map is absent/u,
    );

    const unreferenced = createFinalOutputFixture();
    writeFileSync(
      path.join(unreferenced, 'dist/orphan.js.map'),
      readFileSync(path.join(unreferenced, 'dist/figure/index.js.map'), 'utf8'),
    );
    expect(() => verifyPackageCodeBuildOutput(unreferenced)).toThrow(
      /runtime source-map closure mismatch/u,
    );
  });

  it('rejects declaration maps and trailers after bundle cleanup', () => {
    const repository = createFinalOutputFixture();
    writeFileSync(
      path.join(repository, 'dist/figure/index.d.ts'),
      'export declare const value = 1;\n//# sourceMappingURL=index.d.ts.map',
    );
    writeFileSync(path.join(repository, 'dist/figure/index.d.ts.map'), '{}\n');
    expect(() => verifyPackageCodeBuildOutput(repository)).toThrow(
      /declaration maps survived/u,
    );
  });

  it('rejects unreachable runtime and declaration outputs', () => {
    const runtimeRepository = createFinalOutputFixture();
    writeFileSync(path.join(runtimeRepository, 'dist/orphan.js'), 'export {};\n');
    expect(() => verifyPackageCodeBuildOutput(runtimeRepository)).toThrow(
      /unreachable runtime outputs/u,
    );

    const declarationRepository = createFinalOutputFixture();
    writeFileSync(
      path.join(declarationRepository, 'dist/orphan.d.ts'),
      'export declare const orphan = true;\n',
    );
    expect(() => verifyPackageCodeBuildOutput(declarationRepository)).toThrow(
      /unreachable declaration outputs/u,
    );
  });

  it('rejects unknown output kinds and malformed JavaScript before graph trust', () => {
    const unknown = createFinalOutputFixture();
    writeFileSync(path.join(unknown, 'dist/unreviewed.wasm'), 'not wasm');
    expect(() => verifyPackageCodeBuildOutput(unknown)).toThrow(
      /unsupported output kinds/u,
    );

    const malformed = createFinalOutputFixture();
    writeFileSync(
      path.join(malformed, 'dist/figure/index.js'),
      'export const broken = ;\n//# sourceMappingURL=index.js.map',
    );
    expect(() => verifyPackageCodeBuildOutput(malformed)).toThrow(
      /cannot inspect emitted module graph/u,
    );

    for (const source of [
      'return;',
      'with ({}) {}',
      'function duplicate(value, value) {}',
      'delete value;',
    ]) {
      expect(
        () => inspectEmittedModuleEdges(source, 'early-error.js', 'runtime'),
        source,
      ).toThrow(/strict-mode early-error syntax/u);
    }
  });

  it('rejects undeclared, unreviewed, or computed module loaders', () => {
    const cases: readonly [string, RegExp][] = [
      ['import "left-pad";', /undeclared or unreviewed external package/u],
      ['import "node:child_process";', /unreviewed Node builtin/u],
      ['import "node:not-a-builtin";', /unreviewed Node builtin/u],
      ['import "node:fs/promises";', /unreviewed Node builtin/u],
      [
        'const name = "zod"; require(name);',
        /ESM contains a direct require|computed require specifier/u,
      ],
      ['const name = "zod"; import(name);', /computed dynamic import specifier/u],
      ['const name = "zod"; require.resolve(name);', /unreviewed loader property/u],
      ['const name = "zod"; module.require(name);', /unreviewed loader property/u],
      ['const name = "zod"; import.meta.resolve(name);', /unreviewed loader property/u],
      ['require["resolve"]("zod");', /unreviewed computed loader property/u],
      ['const load = require; load("zod");', /unreviewed require reference/u],
      ['const name = "zod"; (require)(name);', /indirect require call/u],
      ['process.getBuiltinModule("node:fs");', /unreviewed loader property/u],
      ['process.binding("fs");', /unreviewed loader property/u],
      ['process._linkedBinding("fs");', /unreviewed loader property/u],
      ['process.dlopen({}, "addon.node");', /unreviewed loader property/u],
      ['process.mainModule.require("left-pad");', /unreviewed loader property/u],
      ['const p = process; p.getBuiltinModule("node:fs");', /unreviewed process reference/u],
      [
        'const { getBuiltinModule: load } = process; load("node:fs");',
        /unreviewed process reference/u,
      ],
      [
        'const { "require": load } = globalThis; load("left-pad");',
        /unreviewed globalThis reference/u,
      ],
      [
        'const { "process": { "getBuiltinModule": load } } = globalThis; load("node:fs");',
        /unreviewed globalThis reference/u,
      ],
      [
        'const { "process": p } = global; const { "getBuiltinModule": load } = p; load("node:fs");',
        /unreviewed global reference/u,
      ],
      [
        'const { "require": load } = global; load("left-pad");',
        /unreviewed global reference/u,
      ],
      [
        'global["pro" + "cess"]["get" + "BuiltinModule"]("node:fs");',
        /computed loader property/u,
      ],
      [
        'Reflect.get(process, "getBuiltinModule")("node:fs");',
        /unreviewed process reference/u,
      ],
      [
        'Reflect.get(globalThis, "require")("left-pad");',
        /unreviewed globalThis reference/u,
      ],
      ['process["get" + "BuiltinModule"]("node:fs");', /computed loader property/u],
      [
        'process.mainModule["re" + "quire"]("left-pad");',
        /computed loader property|unreviewed loader property/u,
      ],
      ['(module)["require"]("left-pad");', /unreviewed computed loader property/u],
      ['ordinaryObject.require("left-pad");', /unreviewed loader property/u],
      ['ordinaryObject["require"]("left-pad");', /computed loader property/u],
      ['globalThis["require"]("left-pad");', /unreviewed computed loader property/u],
      [
        'globalThis["pro" + "cess"].getBuiltinModule("node:fs");',
        /computed loader property|unreviewed loader property/u,
      ],
      ['globalThis.process.getBuiltinModule("node:fs");', /unreviewed loader property/u],
      ['exports.value = 1;', /unreviewed CommonJS global/u],
      ['void __filename;', /unreviewed CommonJS global/u],
      ['void __dirname;', /unreviewed CommonJS global/u],
      ['eval("require(\\"left-pad\\")");', /dynamic evaluation syntax/u],
      ['Function("return process")();', /dynamic evaluation syntax/u],
      [
        'globalThis.constructor.constructor("return process")();',
        /dynamic evaluation syntax/u,
      ],
      ['[].filter.constructor("return process")();', /dynamic evaluation syntax/u],
    ];
    for (const [loader, expected] of cases) {
      const repository = createFinalOutputFixture();
      writeFileSync(
        path.join(repository, 'dist/figure/index.js'),
        `${loader}\nexport const value = 1;\n//# sourceMappingURL=index.js.map`,
      );
      expect(
        () => verifyPackageCodeBuildOutput(repository),
        loader,
      ).toThrow(expected);
    }

    expect(() => inspectEmittedModuleEdges(
      'const entry = process.argv[1]; export { entry };',
      'entry.js',
      'runtime',
    )).not.toThrow();

    const declaration = createFinalOutputFixture();
    writeFileSync(
      path.join(declaration, 'dist/figure/index.d.ts'),
      'export type Value = import("left-pad").Value;\n',
    );
    expect(() => verifyPackageCodeBuildOutput(declaration)).toThrow(
      /undeclared or unreviewed external package/u,
    );

    for (const directiveSource of [
      '/// <reference types="react" />',
      '/// <reference path="./other.d.ts" />',
      '/// <reference lib="dom" />',
    ]) {
      const directive = createFinalOutputFixture();
      writeFileSync(
        path.join(directive, 'dist/figure/index.d.ts'),
        `${directiveSource}\nexport declare const value = 1;\n`,
      );
      expect(
        () => verifyPackageCodeBuildOutput(directive),
        directiveSource,
      ).toThrow(/unreviewed path, type, lib, or AMD directive/u);
    }

    const unreviewedSubpath = createFinalOutputFixture();
    const manifestPath = path.join(unreviewedSubpath, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    manifest.dependencies = { react: '^19' };
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');
    writeFileSync(
      path.join(unreviewedSubpath, 'dist/figure/index.js'),
      'import "react/private";\nexport const value = 1;\n//# sourceMappingURL=index.js.map',
    );
    expect(() => verifyPackageCodeBuildOutput(unreviewedSubpath)).toThrow(
      /undeclared or unreviewed external package/u,
    );

    const devOnlyDependency = createFinalOutputFixture();
    const devOnlyManifestPath = path.join(devOnlyDependency, 'package.json');
    const devOnlyManifest = JSON.parse(
      readFileSync(devOnlyManifestPath, 'utf8'),
    ) as Record<string, unknown>;
    devOnlyManifest.devDependencies = { zod: '^4' };
    writeFileSync(devOnlyManifestPath, `${JSON.stringify(devOnlyManifest)}\n`, 'utf8');
    writeFileSync(
      path.join(devOnlyDependency, 'dist/figure/index.js'),
      'import "zod";\nexport const value = 1;\n//# sourceMappingURL=index.js.map',
    );
    expect(() => verifyPackageCodeBuildOutput(devOnlyDependency)).toThrow(
      /undeclared or unreviewed external package/u,
    );

    const optionalDependency = createFinalOutputFixture();
    const optionalManifestPath = path.join(optionalDependency, 'package.json');
    const optionalManifest = JSON.parse(
      readFileSync(optionalManifestPath, 'utf8'),
    ) as Record<string, unknown>;
    optionalManifest.optionalDependencies = { zod: '^4' };
    writeFileSync(optionalManifestPath, `${JSON.stringify(optionalManifest)}\n`, 'utf8');
    writeFileSync(
      path.join(optionalDependency, 'dist/figure/index.js'),
      'import "zod";\nexport const value = 1;\n//# sourceMappingURL=index.js.map',
    );
    expect(() => verifyPackageCodeBuildOutput(optionalDependency)).not.toThrow();

    const noncanonicalRelative = createFinalOutputFixture();
    writeFileSync(
      path.join(noncanonicalRelative, 'dist/figure/index.js'),
      'import "./nested/../index.js";\nexport const value = 1;\n//# sourceMappingURL=index.js.map',
    );
    expect(() => verifyPackageCodeBuildOutput(noncanonicalRelative)).toThrow(
      /dependency is not canonical/u,
    );

    const declarationBuiltin = createFinalOutputFixture();
    writeFileSync(
      path.join(declarationBuiltin, 'dist/figure/index.d.ts'),
      'export type Path = typeof import("node:fs");\n',
    );
    expect(() => verifyPackageCodeBuildOutput(declarationBuiltin)).toThrow(
      /unreviewed Node builtin/u,
    );

    const runtimeOnlyPackageInDeclaration = createFinalOutputFixture();
    const declarationManifestPath = path.join(
      runtimeOnlyPackageInDeclaration,
      'package.json',
    );
    const declarationManifest = JSON.parse(
      readFileSync(declarationManifestPath, 'utf8'),
    ) as Record<string, unknown>;
    declarationManifest.dependencies = { ajv: '^8' };
    writeFileSync(
      declarationManifestPath,
      `${JSON.stringify(declarationManifest)}\n`,
      'utf8',
    );
    writeFileSync(
      path.join(runtimeOnlyPackageInDeclaration, 'dist/figure/index.d.ts'),
      'export type Ajv = typeof import("ajv/dist/2020.js");\n',
    );
    expect(() => verifyPackageCodeBuildOutput(runtimeOnlyPackageInDeclaration)).toThrow(
      /undeclared or unreviewed external package/u,
    );
  });

  it('rejects noncanonical, duplicate, or unexpected source-map metadata', () => {
    for (const mutate of [
      (map: Record<string, unknown>) => {
        map.debugId = 'unreviewed';
      },
      (map: Record<string, unknown>) => {
        map.names = [1];
      },
      (map: Record<string, unknown>) => {
        map.sources = ['../../src/core/./canonicalize.ts'];
      },
      (map: Record<string, unknown>) => {
        map.sources = [
          '../../src/core/canonicalize.ts',
          '../../src/core/canonicalize.ts',
        ];
        map.sourcesContent = [
          'export const value = 1;\n',
          'export const value = 1;\n',
        ];
      },
    ]) {
      const repository = createFinalOutputFixture();
      const mapPath = path.join(repository, 'dist/figure/index.js.map');
      const map = JSON.parse(readFileSync(mapPath, 'utf8')) as Record<string, unknown>;
      mutate(map);
      writeFileSync(mapPath, `${JSON.stringify(map)}\n`);
      expect(() => verifyPackageCodeBuildOutput(repository)).toThrow(/source map/u);
    }

    const duplicateMember = createFinalOutputFixture();
    const duplicateMemberMap = path.join(duplicateMember, 'dist/figure/index.js.map');
    const wire = readFileSync(duplicateMemberMap, 'utf8');
    writeFileSync(
      duplicateMemberMap,
      wire.replace(
        '"sources":',
        '"sources":["../../.env"],"sources":',
      ),
    );
    expect(() => verifyPackageCodeBuildOutput(duplicateMember)).toThrow(
      /duplicate JSON object member "sources"/u,
    );

    const escapedDuplicate = createFinalOutputFixture();
    const escapedDuplicateMap = path.join(escapedDuplicate, 'dist/figure/index.js.map');
    const escapedWire = readFileSync(escapedDuplicateMap, 'utf8');
    writeFileSync(
      escapedDuplicateMap,
      escapedWire.replace(
        '"sources":',
        '"\\u0073ources":["../../.env"],"sources":',
      ),
    );
    expect(() => verifyPackageCodeBuildOutput(escapedDuplicate)).toThrow(
      /duplicate JSON object member "sources"/u,
    );

    const bom = createFinalOutputFixture();
    const bomMap = path.join(bom, 'dist/figure/index.js.map');
    writeFileSync(bomMap, Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      readFileSync(bomMap),
    ]));
    expect(() => verifyPackageCodeBuildOutput(bom)).toThrow(/UTF-8 BOM/u);

    const invalidUtf8 = createFinalOutputFixture();
    const invalidUtf8Map = path.join(invalidUtf8, 'dist/figure/index.js.map');
    writeFileSync(invalidUtf8Map, Buffer.from([0xff]));
    expect(() => verifyPackageCodeBuildOutput(invalidUtf8)).toThrow(
      /not well-formed UTF-8/u,
    );
  });

  it('rejects alternate map metadata and unreviewed or indirect source inputs', () => {
    for (const metadata of [
      '/*# sourceMappingURL=index.js.map */',
      '/*@ sourceMappingURL=index.js.map */',
      '//@ sourceMappingURL=index.js.map',
      '//#  sourceMappingURL=index.js.map',
      '//# sourceMappingURL =index.js.map',
      '/*# sourceMappingURL=data:application/json,{} */',
      '//# sourceMappingURL=data:application/json,{}',
      '//# sourceMappingURL=index.js.map?revision=1',
      'export const inline = 1;//# sourceMappingURL=index.js.map',
      '//# sourceMappingURL=index.js.map\n',
      '//# sourceMappingURL=index.js.map\n//# sourceMappingURL=index.js.map',
      '//# sourceURL=virtual.js\n//# sourceMappingURL=index.js.map',
      '//# debugId=00000000\n//# sourceMappingURL=index.js.map',
      'const marker = "sourceMappingURL";\n//# sourceMappingURL=index.js.map',
      '//# sourceMappingURL=index.js.map\u0000',
    ]) {
      const repository = createFinalOutputFixture();
      writeFileSync(
        path.join(repository, 'dist/figure/index.js'),
        `export const value = 1;\n${metadata}`,
      );
      expect(
        () => verifyPackageCodeBuildOutput(repository),
        metadata,
      ).toThrow(/source-map metadata|source-map reference|source-origin/u);
    }

    const hiddenInput = createFinalOutputFixture();
    writeFileSync(path.join(hiddenInput, '.env'), 'not-a-real-secret\n');
    const hiddenMapPath = path.join(hiddenInput, 'dist/figure/index.js.map');
    const hiddenMap = JSON.parse(readFileSync(hiddenMapPath, 'utf8')) as Record<string, unknown>;
    hiddenMap.sources = ['../../.env'];
    hiddenMap.sourcesContent = ['not-a-real-secret\n'];
    writeFileSync(hiddenMapPath, `${JSON.stringify(hiddenMap)}\n`);
    expect(() => verifyPackageCodeBuildOutput(hiddenInput)).toThrow(
      /outside the exact reviewed inventory/u,
    );

    const symlinkedInput = createFinalOutputFixture();
    const symlinkedSource = path.join(symlinkedInput, 'src/core/canonicalize.ts');
    const symlinkTarget = path.join(symlinkedInput, 'outside.ts');
    writeFileSync(symlinkTarget, 'export const value = 1;\n');
    unlinkSync(symlinkedSource);
    symlinkSync(symlinkTarget, symlinkedSource);
    expect(() => verifyPackageCodeBuildOutput(symlinkedInput)).toThrow(
      /not one canonical direct regular file/u,
    );

    const linkedInput = createFinalOutputFixture();
    const linkedSentinel = path.join(linkedInput, 'second-source-link.ts');
    linkSync(
      path.join(linkedInput, 'src/core/canonicalize.ts'),
      linkedSentinel,
    );
    expect(() => verifyPackageCodeBuildOutput(linkedInput)).toThrow(
      /not one canonical direct regular file/u,
    );
    expect(readFileSync(linkedSentinel, 'utf8')).toBe('export const value = 1;\n');

    const invalidPhysicalUtf8 = createFinalOutputFixture();
    const invalidPhysicalSource = path.join(
      invalidPhysicalUtf8,
      'src/core/canonicalize.ts',
    );
    writeFileSync(invalidPhysicalSource, Buffer.from([0xff]));
    const invalidPhysicalMapPath = path.join(
      invalidPhysicalUtf8,
      'dist/figure/index.js.map',
    );
    const invalidPhysicalMap = JSON.parse(
      readFileSync(invalidPhysicalMapPath, 'utf8'),
    ) as Record<string, unknown>;
    invalidPhysicalMap.sourcesContent = ['\ufffd'];
    writeFileSync(invalidPhysicalMapPath, `${JSON.stringify(invalidPhysicalMap)}\n`);
    expect(() => verifyPackageCodeBuildOutput(invalidPhysicalUtf8)).toThrow(
      /source-map input .* is not canonical UTF-8/u,
    );

    const indirectAncestor = createFinalOutputFixture();
    const coreDirectory = path.join(indirectAncestor, 'src/core');
    const physicalCore = path.join(indirectAncestor, 'src/physical-core');
    renameSync(coreDirectory, physicalCore);
    symlinkSync(physicalCore, coreDirectory, 'dir');
    expect(() => verifyPackageCodeBuildOutput(indirectAncestor)).toThrow(
      /indirect directory ancestry/u,
    );

    const missingInput = createFinalOutputFixture();
    unlinkSync(path.join(missingInput, 'src/core/canonicalize.ts'));
    expect(() => verifyPackageCodeBuildOutput(missingInput)).toThrow(/ENOENT/u);
  });

  it('revalidates the exact code, data, and directory closure after every emitter', () => {
    expect(() => verifyFinalPackageBuildOutput(createFinalPackageFixture())).not.toThrow();

    const lateRuntime = createFinalPackageFixture();
    writeFileSync(path.join(lateRuntime, 'dist/late.js'), 'export {};\n');
    expect(() => verifyFinalPackageBuildOutput(lateRuntime)).toThrow(
      /unreachable runtime outputs/u,
    );

    const lateWasm = createFinalPackageFixture();
    writeFileSync(path.join(lateWasm, 'dist/late.wasm'), 'not wasm');
    expect(() => verifyFinalPackageBuildOutput(lateWasm)).toThrow(
      /unsupported output kinds/u,
    );

    const lateJson = createFinalPackageFixture();
    writeFileSync(path.join(lateJson, 'dist/late.json'), '{}\n');
    expect(() => verifyFinalPackageBuildOutput(lateJson)).toThrow(
      /final package data inventory mismatch/u,
    );

    const extraContract = createFinalPackageFixture();
    writeFileSync(path.join(extraContract, 'dist/contract/extra.json'), '{}\n');
    expect(() => verifyFinalPackageBuildOutput(extraContract)).toThrow(
      /final package data inventory mismatch/u,
    );

    const emptyDirectory = createFinalPackageFixture();
    mkdirSync(path.join(emptyDirectory, 'dist/unreviewed-empty'));
    expect(() => verifyFinalPackageBuildOutput(emptyDirectory)).toThrow(
      /directory closure mismatch/u,
    );

    const changedManifest = createFinalPackageFixture();
    writeFileSync(
      path.join(changedManifest, 'dist/skills.manifest.json'),
      '{"changed":true}\n',
    );
    expect(() => verifyFinalPackageBuildOutput(changedManifest)).toThrow(
      /skills manifest differs/u,
    );
  }, 30_000);

  it('has no deleted artifact remnants in the repository output', () => {
    const repository = path.resolve(import.meta.dirname, '..');
    const dist = path.join(repository, 'dist');
    expect(() => verifyExactFinalPackageBuildOutput(repository)).not.toThrow();
    for (const relative of [
      'cli/main.cjs',
      'cli/main.cjs.map',
      'cli/main.d.cts',
      'cli/main.d.ts',
      'internal/figure-result-capability.js',
      'internal/knowledge-graph-presentation-capability.js',
      'internal/request-capability.js',
    ]) {
      expect(existsSync(path.join(dist, relative)), relative).toBe(false);
    }
    expect(
      readdirSync(dist).filter((file) =>
        /^structural-validator-[A-Za-z0-9_-]+\.js(?:\.map)?$/u.test(file),
      ),
    ).toEqual([]);
  });
});
