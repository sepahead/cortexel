import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  acquireReviewedExecutableIntoPrivateRoot,
  inspectReviewedExecutableAuthority,
  REVIEWED_EXECUTABLE_ACQUISITION_SCHEMA,
  REVIEWED_POSIX_COMMAND_LIMITS,
  runReviewedPosixCommand,
  type ReviewedExecutableAcquisition,
} from '../scripts/lib/reviewed-posix-command';
import {
  REVIEWED_POSIX_GUARDIAN_PAYLOAD_ENV,
  REVIEWED_POSIX_GUARDIAN_SOURCE,
  REVIEWED_POSIX_LIFETIME_AUTHORITY_SCHEMA,
  REVIEWED_POSIX_SUPERVISOR_SOURCE,
} from '../scripts/lib/reviewed-posix-supervisor';

const repositoryRoot = resolve(import.meta.dirname, '..');
const runnerModuleUrl = pathToFileURL(
  join(repositoryRoot, 'scripts', 'lib', 'reviewed-posix-command.ts'),
).href;

interface LifecycleFifo {
  readonly path: string;
  readonly reader: number;
  readonly marker: string;
}

interface HookFrame {
  readonly guardianPid?: number;
  readonly phase: string;
  readonly supervisorPid: number;
  readonly workerPid?: number;
}

interface HookedRunner {
  readonly hookPath: string;
  readonly outcomePath: string;
  readonly process: ChildProcess;
}

function waitForPath(path: string, timeoutMs = 8_000): void {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(path)) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  }
  throw new Error(`timed out waiting for ${path}`);
}

function waitForRunnerHook(runner: HookedRunner, timeoutMs = 60_000): void {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(runner.hookPath)) return;
    if (existsSync(runner.outcomePath)) {
      throw new Error(
        `reviewed runner returned before its hook: ${readFileSync(runner.outcomePath, 'utf8')}`,
      );
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  }
  throw new Error(`timed out waiting for ${runner.hookPath}`);
}

function waitForChildClose(
  child: ChildProcess,
  timeoutMs = 15_000,
): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolveCompletion, rejectCompletion) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectCompletion(new Error('reviewed command regression runner did not exit'));
    }, timeoutMs);
    child.once('error', (error) => {
      clearTimeout(timer);
      rejectCompletion(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolveCompletion({ code, signal });
    });
  });
}

function processParentPid(pid: number): number {
  if (!Number.isSafeInteger(pid) || pid <= 1) throw new Error('invalid child PID');
  const result = spawnSync('/bin/ps', ['-o', 'ppid=', '-p', String(pid)], {
    encoding: 'utf8',
  });
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`could not resolve parent PID: ${result.stderr.trim()}`);
  }
  const parent = Number(result.stdout.trim());
  if (!Number.isSafeInteger(parent) || parent <= 1) {
    throw new Error('process parent PID is invalid');
  }
  return parent;
}

function createLifecycleFifo(workspace: string, name: string, marker: string): LifecycleFifo {
  const path = join(workspace, `${name}.fifo`);
  const made = spawnSync('mkfifo', ['-m', '600', path], { encoding: 'utf8' });
  if (made.status !== 0 || made.signal !== null) {
    throw new Error(`mkfifo failed: ${made.stderr.trim()}`);
  }
  return {
    path,
    reader: openSync(path, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK),
    marker,
  };
}

function expectLifecycleClosed(fifo: LifecycleFifo, timeoutMs = 3_000): void {
  const deadline = Date.now() + timeoutMs;
  const chunks: Buffer[] = [];
  const chunk = Buffer.alloc(256);
  try {
    while (true) {
      try {
        const count = readSync(fifo.reader, chunk, 0, chunk.byteLength, null);
        if (count === 0) {
          expect(Buffer.concat(chunks).toString('utf8')).toBe(fifo.marker);
          return;
        }
        chunks.push(Buffer.from(chunk.subarray(0, count)));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'EAGAIN' && code !== 'EWOULDBLOCK') throw error;
        if (Date.now() >= deadline) {
          throw new Error('lifecycle FIFO retained a writer after reviewed return');
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      }
    }
  } finally {
    closeSync(fifo.reader);
  }
}

function lifecycleTarget(fifo: LifecycleFifo, afterReady: string): string {
  const childSource = `const fs = require('node:fs');
    const descriptor = fs.openSync(${JSON.stringify(fifo.path)}, 'w');
    fs.writeSync(descriptor, ${JSON.stringify(fifo.marker)});
    fs.writeFileSync(${JSON.stringify(`${fifo.path}.ready`)}, 'ready\\n', {
      flag: 'wx', mode: 0o600,
    });
    setInterval(() => {}, 1_000);`;
  return `const { spawn } = require('node:child_process');
    spawn(process.execPath, ['-e', ${JSON.stringify(childSource)}], {
      detached: false, stdio: 'ignore',
    });
    ${afterReady}`;
}

function discoverNodeCompanions(sourceNode: string): Array<{
  readonly sourcePath: string;
  readonly stagedRelativePath: string;
}> {
  if (process.platform !== 'darwin') return [];
  const sourceLibraryDirectory = join(dirname(dirname(sourceNode)), 'lib');
  if (!existsSync(sourceLibraryDirectory)) return [];
  return readdirSync(sourceLibraryDirectory, { encoding: 'utf8' })
    .filter((name) => /^libnode\.[0-9]+\.dylib$/u.test(name))
    .sort()
    .map((name) => ({
      sourcePath: realpathSync(join(sourceLibraryDirectory, name)),
      stagedRelativePath: join('lib', name),
    }));
}

describe('reviewed POSIX command boundary', () => {
  let workspace = '';
  let reviewedNode = '';
  let acquisition: ReviewedExecutableAcquisition;
  let bunExecutable = '';
  let environment: NodeJS.ProcessEnv;

  const startHookedRunner = ({
    auditHostSignals = false,
    hookPhase,
    name,
    target,
  }: {
    readonly auditHostSignals?: boolean;
    readonly hookPhase: 'worker-ready-before-handshake' | 'handshake-published-before-go' |
      'go-sent' | 'guardian-swept-before-result';
    readonly name: string;
    readonly target: string;
  }): HookedRunner => {
    const hookPath = join(workspace, `${name}-hook.json`);
    const outcomePath = join(workspace, `${name}-outcome.json`);
    const runnerPath = join(workspace, `${name}-runner.ts`);
    writeFileSync(runnerPath, `import { writeFileSync } from 'node:fs';
      import { runReviewedPosixCommand } from ${JSON.stringify(runnerModuleUrl)};
      const hostSignals = [];
      ${auditHostSignals ? `process.kill = ((pid, signal) => {
        hostSignals.push({ pid, signal: signal ?? null });
        throw new Error('host numeric signalling is forbidden');
      });` : ''}
      let outcome;
      try {
        const result = runReviewedPosixCommand(
          ${JSON.stringify(reviewedNode)},
          ${JSON.stringify(reviewedNode)},
          ['-e', ${JSON.stringify(target)}],
          ${JSON.stringify(workspace)},
          {
            controlRuntimeAuthority: ${JSON.stringify(acquisition.authority)},
            environment: ${JSON.stringify(environment)},
            outputLimitBytes: 1024,
            targetAuthority: ${JSON.stringify(acquisition.authority)},
            timeoutMs: 30000,
            trustedTestHook: {
              phase: ${JSON.stringify(hookPhase)},
              readyPath: ${JSON.stringify(hookPath)},
            },
          },
        );
        outcome = {
          kind: 'result',
          outputOverflow: result.outputOverflow,
          signal: result.signal,
          status: result.status,
          timedOut: result.timedOut,
        };
      } catch (error) {
        outcome = {
          error: error instanceof Error ? error.message : String(error),
          kind: 'error',
        };
      }
      writeFileSync(
        ${JSON.stringify(outcomePath)},
        JSON.stringify({ ...outcome, hostSignals }) + '\\n',
        { flag: 'wx', mode: 0o600 },
      );
    `, { flag: 'wx', mode: 0o600 });
    return {
      hookPath,
      outcomePath,
      process: spawn(bunExecutable, [runnerPath], {
        cwd: workspace,
        env: process.env,
        stdio: 'ignore',
      }),
    };
  };

  beforeAll(() => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-reviewed-posix-test-')));
    const runtimeRoot = join(workspace, 'runtime');
    mkdirSync(runtimeRoot, { mode: 0o700 });
    mkdirSync(join(runtimeRoot, 'bin'), { mode: 0o700 });
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], { encoding: 'utf8' });
    if (nodeProbe.status !== 0 || nodeProbe.signal !== null) {
      throw new Error('reviewed POSIX tests require Node');
    }
    const sourceNode = realpathSync(nodeProbe.stdout.trim());
    const bunProbe = spawnSync('bun', ['--print', 'process.execPath'], { encoding: 'utf8' });
    if (bunProbe.status !== 0 || bunProbe.signal !== null) {
      throw new Error('reviewed POSIX tests require Bun');
    }
    bunExecutable = realpathSync(bunProbe.stdout.trim());
    const companions = discoverNodeCompanions(sourceNode);
    if (companions.length > 0) mkdirSync(join(runtimeRoot, 'lib'), { mode: 0o700 });
    acquisition = acquireReviewedExecutableIntoPrivateRoot(
      sourceNode,
      runtimeRoot,
      join('bin', 'node'),
      { companions },
    );
    reviewedNode = acquisition.authority.executable;
    const launch = spawnSync(reviewedNode, ['--print', 'process.execPath'], {
      encoding: 'utf8',
      env: { LANG: 'C', LC_ALL: 'C', PATH: '/usr/bin:/bin', TZ: 'UTC' },
      timeout: 10_000,
    });
    if (launch.status !== 0 || launch.signal !== null || launch.stdout.trim() !== reviewedNode) {
      throw new Error(`staged Node launch failed: ${launch.stderr.trim()}`);
    }
    environment = {
      LANG: 'C',
      LC_ALL: 'C',
      PATH: `${dirname(reviewedNode)}:/usr/bin:/bin`,
      TZ: 'UTC',
    };
  }, 180_000);

  afterAll(() => {
    if (workspace !== '') rmSync(workspace, { force: true, recursive: true });
  });

  it('descriptor-acquires unsafe-ancestry bytes into one closed protected inventory', () => {
    if (workspace === '') return;
    const unsafe = join(workspace, 'homebrew-like');
    const runtime = join(workspace, 'acquired-tool');
    mkdirSync(unsafe, { mode: 0o775 });
    chmodSync(unsafe, 0o775);
    mkdirSync(runtime, { mode: 0o700 });
    const source = join(unsafe, 'tool');
    const bytes = Buffer.from('#!/bin/sh\nprintf acquired-ok\\n\n', 'utf8');
    writeFileSync(source, bytes, { flag: 'wx', mode: 0o555 });
    chmodSync(source, 0o555);

    const acquired = acquireReviewedExecutableIntoPrivateRoot(source, runtime, 'tool');
    expect(acquired).toMatchObject({
      schema: REVIEWED_EXECUTABLE_ACQUISITION_SCHEMA,
      runtimeRoot: runtime,
      inventoryEntryCount: 2,
      executable: {
        sourcePath: source,
        sourcePathAncestryProtected: false,
        stagedPath: join(runtime, 'tool'),
        size: bytes.byteLength,
      },
    });
    expect(acquired.executable.sourceSha256).toBe(acquired.executable.stagedSha256);
    expect(acquired.authority.file.sha256).toBe(acquired.executable.stagedSha256);
    expect(readdirSync(runtime)).toEqual(['tool']);
  }, 60_000);

  it('rejects acquisition option and companion accessors before filesystem acquisition', () => {
    if (workspace === '') return;
    const runtime = join(workspace, 'accessor-acquisition-runtime');
    mkdirSync(runtime, { mode: 0o700 });
    const optionAccessor = Object.defineProperty({}, 'companions', {
      enumerable: true,
      get: () => [],
    });
    expect(() => acquireReviewedExecutableIntoPrivateRoot(
      reviewedNode,
      runtime,
      'node',
      optionAccessor as never,
    )).toThrow(/acquisition options\.companions must be an enumerable own data property/u);
    expect(readdirSync(runtime)).toEqual([]);

    const companionAccessor = Object.defineProperty({
      stagedRelativePath: 'lib/companion',
    }, 'sourcePath', {
      enumerable: true,
      get: () => reviewedNode,
    });
    expect(() => acquireReviewedExecutableIntoPrivateRoot(
      reviewedNode,
      runtime,
      'node',
      { companions: [companionAccessor] } as never,
    )).toThrow(/runtime companion 1 input\.sourcePath must be an enumerable own data property/u);
    expect(readdirSync(runtime)).toEqual([]);

    let proxyTrapCount = 0;
    const proxyOptions = new Proxy({}, {
      get: () => {
        proxyTrapCount += 1;
        throw new Error('proxy get trap must not run');
      },
      getOwnPropertyDescriptor: () => {
        proxyTrapCount += 1;
        throw new Error('proxy descriptor trap must not run');
      },
      getPrototypeOf: () => {
        proxyTrapCount += 1;
        throw new Error('proxy prototype trap must not run');
      },
      ownKeys: () => {
        proxyTrapCount += 1;
        throw new Error('proxy keys trap must not run');
      },
    });
    expect(() => acquireReviewedExecutableIntoPrivateRoot(
      reviewedNode,
      runtime,
      'node',
      proxyOptions as never,
    )).toThrow(/acquisition options must not be a Proxy/u);
    expect(proxyTrapCount).toBe(0);
  }, 30_000);

  it('caps argument and companion arrays before enumerating their members', () => {
    if (workspace === '') return;
    expect(REVIEWED_POSIX_COMMAND_LIMITS.arguments).toBe(1_024);
    expect(REVIEWED_POSIX_COMMAND_LIMITS.runtimeFiles).toBe(32);
    const runtime = join(workspace, 'oversized-array-runtime');
    mkdirSync(runtime, { mode: 0o700 });
    const oversizedArguments: unknown[] = [];
    oversizedArguments.length = 0xffff_ffff;
    const oversizedCompanions: unknown[] = [];
    oversizedCompanions.length = 0xffff_ffff;
    const originalOwnKeys = Reflect.ownKeys;
    const enumerated = new Set<object>();
    Reflect.ownKeys = ((value: object): (string | symbol)[] => {
      if (value === oversizedArguments || value === oversizedCompanions) {
        enumerated.add(value);
        throw new Error('oversized array must be rejected before own-key enumeration');
      }
      return originalOwnKeys(value);
    }) as typeof Reflect.ownKeys;
    try {
      expect(() => runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        oversizedArguments as never,
        workspace,
      )).toThrow(/command arguments has invalid direct-array authority/u);
      expect(() => acquireReviewedExecutableIntoPrivateRoot(
        reviewedNode,
        runtime,
        'node',
        { companions: oversizedCompanions } as never,
      )).toThrow(/runtime companion inputs has invalid direct-array authority/u);
    } finally {
      Reflect.ownKeys = originalOwnKeys;
    }
    expect(enumerated.size).toBe(0);
    expect(readdirSync(runtime)).toEqual([]);
  });

  it('projects only bounded semantic record and array fields while ignoring inert metadata', () => {
    if (workspace === '') return;
    const decoratedEnvironment: Record<PropertyKey, unknown> = { ...environment };
    const decoratedArguments = ['-e', 'process.stdout.write("bounded-projection-ok\\n")'];
    const decoratedOptions: Record<PropertyKey, unknown> = {
      controlRuntimeAuthority: acquisition.authority,
      environment: decoratedEnvironment,
      outputLimitBytes: 1_024,
      targetAuthority: acquisition.authority,
      timeoutMs: 10_000,
    };
    let getterCalls = 0;
    const inertGetter = (): never => {
      getterCalls += 1;
      throw new Error('inert metadata getter must not run');
    };
    for (let index = 0; index < 4_096; index++) {
      for (const target of [decoratedOptions, decoratedArguments, decoratedEnvironment]) {
        Object.defineProperty(target, `inert-${index}`, {
          configurable: true,
          enumerable: false,
          value: index,
        });
      }
    }
    for (const [index, target] of [
      decoratedOptions,
      decoratedArguments,
      decoratedEnvironment,
    ].entries()) {
      Object.defineProperty(target, `inert-accessor-${index}`, {
        configurable: true,
        enumerable: false,
        get: inertGetter,
      });
      Object.defineProperty(target, Symbol(`inert-symbol-${index}`), {
        configurable: true,
        enumerable: true,
        get: inertGetter,
      });
    }

    const originalOwnKeys = Reflect.ownKeys;
    const projectionInputs = new Set<object>([
      decoratedOptions,
      decoratedArguments,
      decoratedEnvironment,
    ]);
    let ownKeyMaterializations = 0;
    Reflect.ownKeys = ((value: object): (string | symbol)[] => {
      if (projectionInputs.has(value)) {
        ownKeyMaterializations += 1;
        throw new Error('semantic projection must not materialize all own keys');
      }
      return originalOwnKeys(value);
    }) as typeof Reflect.ownKeys;
    try {
      const result = runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        decoratedArguments,
        workspace,
        decoratedOptions as never,
      );
      expect(result).toMatchObject({
        outputOverflow: false,
        signal: null,
        status: 0,
        timedOut: false,
      });
      expect(result.stdout.toString('utf8')).toBe('bounded-projection-ok\n');
    } finally {
      Reflect.ownKeys = originalOwnKeys;
    }
    expect(ownKeyMaterializations).toBe(0);
    expect(getterCalls).toBe(0);
  }, 60_000);

  it('rejects enumerable semantic expansion under fixed bounds without invoking accessors', () => {
    if (workspace === '') return;
    expect(REVIEWED_POSIX_COMMAND_LIMITS.environmentEntries).toBe(1_024);
    let getterCalls = 0;
    const trap = (): never => {
      getterCalls += 1;
      throw new Error('rejected accessor must not run');
    };

    const openOptions: Record<string, unknown> = {};
    Object.defineProperty(openOptions, 'unexpected', {
      enumerable: true,
      get: trap,
    });
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      [],
      workspace,
      openOptions as never,
    )).toThrow(/command options has unexpected or missing keys/u);

    const hiddenSemanticOption = Object.defineProperty({}, 'environment', {
      enumerable: false,
      value: {},
    });
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      [],
      workspace,
      hiddenSemanticOption,
    )).toThrow(/command options\.environment must be an enumerable own data property/u);

    const openArguments: unknown[] = [];
    Object.defineProperty(openArguments, 'unexpected', {
      enumerable: true,
      get: trap,
    });
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      openArguments as never,
      workspace,
    )).toThrow(/arguments must be dense and contain no unexpected enumerable members/u);

    const oversizedEnvironment: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (let index = 0; index < REVIEWED_POSIX_COMMAND_LIMITS.environmentEntries; index++) {
      oversizedEnvironment[`ENTRY_${index}`] = 'x';
    }
    Object.defineProperty(oversizedEnvironment, 'ENTRY_OVERFLOW', {
      enumerable: true,
      get: trap,
    });
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      [],
      workspace,
      { environment: oversizedEnvironment } as never,
    )).toThrow(/environment exceeds its entry bound/u);
    expect(getterCalls).toBe(0);
  });

  it('rejects oversized enumerable names before descriptor lookup or accessor invocation', () => {
    if (workspace === '') return;
    const recordKey = 'R'.repeat(REVIEWED_POSIX_COMMAND_LIMITS.environmentKeyBytes + 1);
    const arrayKey = 'A'.repeat(REVIEWED_POSIX_COMMAND_LIMITS.environmentKeyBytes + 1);
    const environmentKey = 'E'.repeat(
      REVIEWED_POSIX_COMMAND_LIMITS.environmentKeyBytes + 1,
    );
    let getterCalls = 0;
    const trap = (): never => {
      getterCalls += 1;
      throw new Error('oversized-name accessor must not run');
    };
    const record = Object.defineProperty({}, recordKey, {
      enumerable: true,
      get: trap,
    });
    const array: unknown[] = [];
    Object.defineProperty(array, arrayKey, {
      enumerable: true,
      get: trap,
    });
    const oversizedEnvironment = Object.defineProperty({}, environmentKey, {
      enumerable: true,
      get: trap,
    });
    const instrumented = new Map<object, string>([
      [record, recordKey],
      [array, arrayKey],
      [oversizedEnvironment, environmentKey],
    ]);
    const originalDescriptor = Object.getOwnPropertyDescriptor;
    let oversizedDescriptorLookups = 0;
    Object.getOwnPropertyDescriptor = ((value: object, key: PropertyKey) => {
      if (instrumented.get(value) === key) {
        oversizedDescriptorLookups += 1;
        throw new Error('oversized name must be rejected before descriptor lookup');
      }
      return originalDescriptor(value, key);
    }) as typeof Object.getOwnPropertyDescriptor;
    try {
      expect(() => runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        [],
        workspace,
        record as never,
      )).toThrow(/command options has unexpected or missing keys/u);
      expect(() => runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        array as never,
        workspace,
      )).toThrow(/arguments must be dense and contain no unexpected enumerable members/u);
      expect(() => runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        [],
        workspace,
        { environment: oversizedEnvironment } as never,
      )).toThrow(/environment contains an oversized key/u);
    } finally {
      Object.getOwnPropertyDescriptor = originalDescriptor;
    }
    expect(oversizedDescriptorLookups).toBe(0);
    expect(getterCalls).toBe(0);
  });

  it('applies cheap primitive code-unit bounds before UTF-8 byte scans', () => {
    if (workspace === '') return;
    expect(REVIEWED_POSIX_COMMAND_LIMITS.pathBytes).toBe(4_096);
    expect(REVIEWED_POSIX_COMMAND_LIMITS.environmentKeyBytes).toBe(4_096);
    const oversizedPath = 'x'.repeat(REVIEWED_POSIX_COMMAND_LIMITS.pathBytes + 1);
    const oversizedArgument = 'a'.repeat(REVIEWED_POSIX_COMMAND_LIMITS.argumentBytes + 1);
    const oversizedEnvironmentKey = 'K'.repeat(
      REVIEWED_POSIX_COMMAND_LIMITS.environmentKeyBytes + 1,
    );
    const oversizedEnvironmentValue = 'v'.repeat(
      REVIEWED_POSIX_COMMAND_LIMITS.payloadBytes + 1,
    );
    const guardedStrings = new Set([
      oversizedPath,
      oversizedArgument,
      oversizedEnvironmentKey,
      oversizedEnvironmentValue,
    ]);
    const originalByteLength = Buffer.byteLength;
    let guardedByteScans = 0;
    Buffer.byteLength = ((value: string | NodeJS.TypedArray | DataView | ArrayBuffer) => {
      if (typeof value === 'string' && guardedStrings.has(value)) guardedByteScans += 1;
      return originalByteLength(value);
    }) as typeof Buffer.byteLength;
    try {
      expect(() => inspectReviewedExecutableAuthority(oversizedPath)).toThrow(
        /executable path must be one bounded primitive string/u,
      );
      expect(() => acquireReviewedExecutableIntoPrivateRoot(
        reviewedNode,
        workspace,
        oversizedPath,
      )).toThrow(/staged executable relative path must be one bounded primitive string/u);
      expect(() => runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        [oversizedArgument],
        workspace,
      )).toThrow(/argument 0 is invalid or oversized/u);
      expect(() => runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        [],
        workspace,
        { environment: { [oversizedEnvironmentKey]: 'x' } },
      )).toThrow(/environment contains an oversized key/u);
      expect(() => runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        [],
        workspace,
        { environment: { OVERSIZED: oversizedEnvironmentValue } },
      )).toThrow(/payload input exceeds its byte budget/u);
    } finally {
      Buffer.byteLength = originalByteLength;
    }
    expect(guardedByteScans).toBe(0);
  });

  it('fails closed if an unsafe source pathname is exchanged after its descriptor opens', () => {
    if (workspace === '') return;
    const unsafe = join(workspace, 'raced-source');
    const runtime = join(workspace, 'raced-runtime');
    mkdirSync(unsafe, { mode: 0o775 });
    chmodSync(unsafe, 0o775);
    mkdirSync(runtime, { mode: 0o700 });
    const source = join(unsafe, 'node');
    const moved = join(unsafe, 'node.opened');
    writeFileSync(source, '#!/bin/sh\nprintf first\\n\n', { flag: 'wx', mode: 0o555 });
    chmodSync(source, 0o555);

    expect(() => acquireReviewedExecutableIntoPrivateRoot(source, runtime, 'node', {
      trustedTestHook: (event) => {
        if (event.phase !== 'source-opened-before-copy') return;
        renameSync(source, moved);
        writeFileSync(source, '#!/bin/sh\nprintf replacement\\n\n', {
          flag: 'wx',
          mode: 0o555,
        });
        chmodSync(source, 0o555);
      },
    })).toThrow(/changed during acquisition/u);
    expect(readdirSync(runtime)).toEqual([]);
  }, 60_000);

  it('fails closed without blocking when a reviewed unsafe source becomes a FIFO', () => {
    if (workspace === '') return;
    const unsafe = join(workspace, 'fifo-raced-source');
    const runtime = join(workspace, 'fifo-raced-runtime');
    mkdirSync(unsafe, { mode: 0o775 });
    chmodSync(unsafe, 0o775);
    mkdirSync(runtime, { mode: 0o700 });
    const source = join(unsafe, 'node');
    const moved = join(unsafe, 'node.reviewed');
    writeFileSync(source, '#!/bin/sh\nprintf first\\n\n', { flag: 'wx', mode: 0o555 });
    chmodSync(source, 0o555);

    expect(() => acquireReviewedExecutableIntoPrivateRoot(source, runtime, 'node', {
      trustedTestHook: (event) => {
        if (event.phase !== 'source-reviewed-before-open') return;
        renameSync(source, moved);
        const made = spawnSync('mkfifo', ['-m', '500', source], { encoding: 'utf8' });
        if (made.status !== 0 || made.signal !== null) {
          throw new Error(`mkfifo failed: ${made.stderr.trim()}`);
        }
      },
    })).toThrow(/changed before descriptor acquisition/u);
    expect(readdirSync(runtime)).toEqual([]);
  }, 60_000);

  it('preserves the primary acquisition failure while attempting every descriptor cleanup', () => {
    if (workspace === '') return;
    const runtime = join(workspace, 'descriptor-cleanup-runtime');
    mkdirSync(runtime, { mode: 0o700 });
    let observed: unknown;
    try {
      acquireReviewedExecutableIntoPrivateRoot(reviewedNode, runtime, 'node', {
        trustedTestHook: (event) => {
          if (event.phase === 'source-opened-before-copy') {
            closeSync(event.sourceDescriptor);
          }
        },
      });
    } catch (error) {
      observed = error;
    }
    expect(observed).toBeInstanceOf(AggregateError);
    const aggregate = observed as AggregateError;
    expect(aggregate.errors).toHaveLength(2);
    expect(aggregate.cause).toBe(aggregate.errors[0]);
    expect(String(aggregate.errors[0])).toMatch(/ended during descriptor acquisition/u);
    expect(aggregate.errors[1]).toMatchObject({
      message: expect.stringMatching(/descriptor close failed/u),
    });
    expect(String((aggregate.errors[1] as Error).cause)).toMatch(/EBADF|bad file descriptor/iu);
    expect(readdirSync(runtime)).toEqual([]);
  }, 60_000);

  it('runs an independently sealed target with copied binary stdin and binary output', async () => {
    if (workspace === '') return;
    expect(REVIEWED_POSIX_COMMAND_LIMITS.stdinBytes).toBe(32 * 1024 * 1024);
    expect(REVIEWED_POSIX_COMMAND_LIMITS.outputBytes).toBe(512 * 1024 * 1024);
    const mutableInput = new Uint8Array(8);
    mutableInput.set([0, 1, 2, 3, 0xfc, 0xfd, 0xfe, 0xff]);
    const intended = Buffer.from(mutableInput);
    const result = runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', `const chunks = [];
        process.stdin.on('data', (chunk) => chunks.push(chunk));
        process.stdin.on('end', () => {
          process.stdout.write(Buffer.concat(chunks));
          process.stderr.write(Buffer.from([0xff, 0x00, 0x7f]));
        });`],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment,
        stdin: mutableInput,
        outputLimitBytes: 1_024,
        targetAuthority: acquisition.authority,
        timeoutMs: 10_000,
      },
    );
    mutableInput.fill(0x41);
    expect(result).toMatchObject({
      guardianSweepIntentCount: 1,
      outputOverflow: false,
      signal: null,
      status: 0,
      timedOut: false,
    });
    expect(result.stdout).toEqual(intended);
    expect(result.stderr).toEqual(Buffer.from([0xff, 0x00, 0x7f]));
    expect(Buffer.from(mutableInput)).not.toEqual(intended);
  }, 60_000);

  it('supports Git stdin without selecting the target through PATH', () => {
    if (workspace === '') return;
    const git = realpathSync('/usr/bin/git');
    const bytes = Buffer.from([0, 1, 2, 10, 13, 0xfe, 0xff]);
    const result = runReviewedPosixCommand(
      reviewedNode,
      git,
      ['hash-object', '--stdin'],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment: { LANG: 'C', LC_ALL: 'C', PATH: '/usr/bin:/bin' },
        stdin: bytes,
        outputLimitBytes: 1_024,
        timeoutMs: 10_000,
      },
    );
    const header = Buffer.from(`blob ${bytes.byteLength}\0`, 'utf8');
    const expected = createHash('sha1').update(header).update(bytes).digest('hex');
    expect({
      signal: result.signal,
      status: result.status,
      stderr: result.stderr.toString('utf8'),
    }).toEqual({ signal: null, status: 0, stderr: '' });
    expect(result.stdout.toString('ascii')).toBe(`${expected}\n`);
    expect(result.stderr).toEqual(Buffer.alloc(0));
  }, 60_000);

  it('uses inode authority rather than unstable hardlink spelling', () => {
    if (workspace === '') return;
    const target = join(workspace, 'hardlinked-target');
    const alias = join(workspace, 'hardlinked-target-alias');
    writeFileSync(target, "#!/bin/sh\nprintf 'hardlink-ok\\n'\n", {
      flag: 'wx',
      mode: 0o555,
    });
    linkSync(target, alias);
    const targetAuthority = inspectReviewedExecutableAuthority(
      target,
      'hardlinked reviewed target',
    );
    expect(targetAuthority.file.linkCount).toBe(2);

    const result = runReviewedPosixCommand(
      reviewedNode,
      target,
      [],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment: { LANG: 'C', LC_ALL: 'C', PATH: '/usr/bin:/bin', TZ: 'UTC' },
        outputLimitBytes: 1_024,
        targetAuthority,
        timeoutMs: 10_000,
      },
    );
    expect(result).toMatchObject({
      outputOverflow: false,
      signal: null,
      status: 0,
      timedOut: false,
    });
    expect(result.stdout.toString('utf8')).toBe('hardlink-ok\n');
    expect(result.stderr).toEqual(Buffer.alloc(0));
  }, 60_000);

  it('rejects open command-option and test-hook shapes before target execution', () => {
    if (workspace === '') return;
    const marker = join(workspace, 'open-option-target-marker');
    const target = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran\\n', {
      flag: 'wx', mode: 0o600,
    });`;
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment,
        targetAuthority: acquisition.authority,
        unexpectedAuthority: true,
      } as never,
    )).toThrow(/command options has unexpected or missing keys/u);
    expect(existsSync(marker)).toBe(false);

    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment,
        targetAuthority: acquisition.authority,
        trustedTestHook: {
          phase: 'go-sent',
          readyPath: join(workspace, 'open-hook-ready.json'),
          unexpectedPidAuthority: true,
        },
      } as never,
    )).toThrow(/test hook has unexpected or missing keys/u);
    expect(existsSync(marker)).toBe(false);

    const optionAccessor = Object.defineProperty({}, 'environment', {
      enumerable: true,
      get: () => environment,
    });
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      optionAccessor as never,
    )).toThrow(/command options\.environment must be an enumerable own data property/u);

    const argumentAccessor: unknown[] = [];
    Object.defineProperty(argumentAccessor, '0', {
      enumerable: true,
      get: () => '-e',
    });
    argumentAccessor.length = 1;
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      argumentAccessor as never,
      workspace,
    )).toThrow(/command arguments\[0\] must be an enumerable own data property/u);

    const environmentAccessor = Object.defineProperty({}, 'PATH', {
      enumerable: true,
      get: () => '/usr/bin:/bin',
    });
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      { environment: environmentAccessor } as never,
    )).toThrow(/command environment\.PATH must be an enumerable own data property/u);

    const hookAccessor = Object.defineProperty({
      readyPath: join(workspace, 'accessor-hook-ready.json'),
    }, 'phase', {
      enumerable: true,
      get: () => 'go-sent',
    });
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      { trustedTestHook: hookAccessor } as never,
    )).toThrow(/command test hook\.phase must be an enumerable own data property/u);

    const authorityFile = { ...acquisition.authority.file };
    Object.defineProperty(authorityFile, 'sha256', {
      enumerable: true,
      get: () => acquisition.authority.file.sha256,
    });
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      {
        controlRuntimeAuthority: {
          ...acquisition.authority,
          file: authorityFile,
        },
      } as never,
    )).toThrow(/supplied authority\.file\.sha256 must be an enumerable own data property/u);

    let proxyTrapCount = 0;
    const proxyHandler: ProxyHandler<object> = {
      get: () => {
        proxyTrapCount += 1;
        throw new Error('proxy get trap must not run');
      },
      getOwnPropertyDescriptor: () => {
        proxyTrapCount += 1;
        throw new Error('proxy descriptor trap must not run');
      },
      getPrototypeOf: () => {
        proxyTrapCount += 1;
        throw new Error('proxy prototype trap must not run');
      },
      ownKeys: () => {
        proxyTrapCount += 1;
        throw new Error('proxy keys trap must not run');
      },
    };
    const scalarProxy = new Proxy(Object('/proxy-scalar'), proxyHandler);
    expect(() => inspectReviewedExecutableAuthority(
      scalarProxy as never,
    )).toThrow(/executable path must be one bounded primitive string/u);
    expect(() => inspectReviewedExecutableAuthority(
      reviewedNode,
      scalarProxy as never,
    )).toThrow(/executable label must be one bounded primitive string/u);
    expect(() => acquireReviewedExecutableIntoPrivateRoot(
      scalarProxy as never,
      workspace,
      'node',
    )).toThrow(/source executable path must be one bounded primitive string/u);
    expect(() => acquireReviewedExecutableIntoPrivateRoot(
      reviewedNode,
      scalarProxy as never,
      'node',
    )).toThrow(/runtime root path must be one bounded primitive string/u);
    expect(() => acquireReviewedExecutableIntoPrivateRoot(
      reviewedNode,
      workspace,
      scalarProxy as never,
    )).toThrow(/staged executable relative path must be one bounded primitive string/u);
    expect(() => runReviewedPosixCommand(
      scalarProxy as never,
      reviewedNode,
      ['-e', target],
      workspace,
    )).toThrow(/control runtime executable path must be one bounded primitive string/u);
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      scalarProxy as never,
      ['-e', target],
      workspace,
    )).toThrow(/target executable path must be one bounded primitive string/u);
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      scalarProxy as never,
    )).toThrow(/working directory path must be one bounded primitive string/u);
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      new Proxy({}, proxyHandler) as never,
    )).toThrow(/command options must not be a Proxy/u);
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      new Proxy(['-e', target], proxyHandler as ProxyHandler<string[]>) as never,
      workspace,
    )).toThrow(/command arguments must not be a Proxy/u);
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      {
        stdin: new Proxy(new Uint8Array([1, 2, 3]), proxyHandler as ProxyHandler<Uint8Array>),
      } as never,
    )).toThrow(/stdin must not be a Proxy/u);
    expect(proxyTrapCount).toBe(0);

    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      { stdin: new Uint8Array(new SharedArrayBuffer(8)) },
    )).toThrow(/stdin requires direct fixed ArrayBuffer backing/u);

    class DerivedArrayBuffer extends ArrayBuffer {}
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      { stdin: new Uint8Array(new DerivedArrayBuffer(8)) },
    )).toThrow(/stdin requires direct fixed ArrayBuffer backing/u);

    const resizableGetter = Object.getOwnPropertyDescriptor(
      ArrayBuffer.prototype,
      'resizable',
    )?.get;
    if (resizableGetter !== undefined) {
      const ResizableArrayBuffer = ArrayBuffer as unknown as new (
        byteLength: number,
        options: { readonly maxByteLength: number },
      ) => ArrayBuffer;
      const resizable = new ResizableArrayBuffer(8, { maxByteLength: 16 });
      if (resizableGetter.call(resizable) === true) {
        expect(() => runReviewedPosixCommand(
          reviewedNode,
          reviewedNode,
          ['-e', target],
          workspace,
          { stdin: new Uint8Array(resizable) },
        )).toThrow(/stdin requires direct fixed ArrayBuffer backing/u);
      }
    }
    expect(existsSync(marker)).toBe(false);
  }, 30_000);

  it('uses nonblocking no-follow opens before proving regular-file or directory type', () => {
    const hostSource = readFileSync(
      join(repositoryRoot, 'scripts', 'lib', 'reviewed-posix-command.ts'),
      'utf8',
    );
    expect(hostSource).toContain(`const EXPECTED_REGULAR_OPEN_FLAGS =
  fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;`);
    expect(hostSource).toContain(`const EXPECTED_DIRECTORY_OPEN_FLAGS =
  EXPECTED_REGULAR_OPEN_FLAGS | fsConstants.O_DIRECTORY;`);
    expect(hostSource).toContain(`const descriptor = openSync(
    executable,
    EXPECTED_REGULAR_OPEN_FLAGS,
  );`);
    expect(hostSource).toContain(`const sourceDescriptor = openSync(
        item.sourcePath,
        EXPECTED_REGULAR_OPEN_FLAGS,
      );`);
    expect(hostSource).toContain(
      'const descriptor = openSync(stagedPath, EXPECTED_REGULAR_OPEN_FLAGS);',
    );
    expect(hostSource).toContain(`const descriptor = openSync(
      spoolPath,
      EXPECTED_REGULAR_OPEN_FLAGS,
    );`);
    expect(hostSource).toContain(
      'const descriptor = openSync(parent, EXPECTED_DIRECTORY_OPEN_FLAGS);',
    );

    const aclSource = readFileSync(
      join(repositoryRoot, 'scripts', 'lib', 'posix-acl-authority.ts'),
      'utf8',
    );
    expect(aclSource).toContain(`const REVIEWED_DIRECTORY_OPEN_FLAGS =
  fsConstants.O_RDONLY |
  fsConstants.O_DIRECTORY |
  fsConstants.O_NOFOLLOW |
  fsConstants.O_NONBLOCK;`);
    expect(aclSource).toContain(
      'const descriptor = openSync(component, REVIEWED_DIRECTORY_OPEN_FLAGS);',
    );
    expect(aclSource).toContain(
      'const descriptor = openSync(directory, REVIEWED_DIRECTORY_OPEN_FLAGS);',
    );

    const publicationSource = readFileSync(
      join(repositoryRoot, 'scripts', 'lib', 'exclusive-audit-publication.ts'),
      'utf8',
    );
    expect(publicationSource).toContain(
      'parentDescriptor = openSync(parent, REVIEWED_DIRECTORY_OPEN_FLAGS);',
    );
  });

  it('returns exact normal, nonzero, and signal completion discriminators after sweeping descendants', () => {
    if (workspace === '') return;
    const cases = [
      { name: 'success', terminal: 'process.exit(0);', status: 0, signal: null },
      { name: 'nonzero', terminal: 'process.exit(9);', status: 9, signal: null },
      {
        name: 'signaled',
        terminal: "process.kill(process.pid, 'SIGTERM');",
        status: null,
        signal: 'SIGTERM',
      },
    ] as const;
    for (const scenario of cases) {
      const fifo = createLifecycleFifo(
        workspace,
        `terminal-${scenario.name}-lifecycle`,
        `terminal-${scenario.name}`,
      );
      const target = lifecycleTarget(fifo, `const timer = setInterval(() => {
        if (require('node:fs').existsSync(${JSON.stringify(`${fifo.path}.ready`)})) {
          clearInterval(timer);
          ${scenario.terminal}
        }
      }, 5);`);
      const result = runReviewedPosixCommand(
        reviewedNode,
        reviewedNode,
        ['-e', target],
        workspace,
        {
          controlRuntimeAuthority: acquisition.authority,
          environment,
          outputLimitBytes: 1_024,
          targetAuthority: acquisition.authority,
          timeoutMs: 10_000,
        },
      );
      expect(result).toMatchObject({
        outputOverflow: false,
        signal: scenario.signal,
        status: scenario.status,
        timedOut: false,
      });
      expectLifecycleClosed(fifo);
    }
  }, 180_000);

  it('fails closed at launcher, supervisor, guardian, and worker pre-GO killpoints', async () => {
    if (workspace === '') return;
    const cases = [
      { phase: 'worker-ready-before-handshake', victim: 'launcher' },
      { phase: 'worker-ready-before-handshake', victim: 'supervisor' },
      { phase: 'handshake-published-before-go', victim: 'guardian' },
      { phase: 'handshake-published-before-go', victim: 'worker' },
    ] as const;
    for (const scenario of cases) {
      const name = `prego-${scenario.victim}`;
      const targetMarker = join(workspace, `${name}-target-marker`);
      const target = `require('node:fs').writeFileSync(
        ${JSON.stringify(targetMarker)}, 'ran\\n', { flag: 'wx', mode: 0o600 },
      );`;
      const runner = startHookedRunner({
        hookPhase: scenario.phase,
        name,
        target,
      });
      waitForRunnerHook(runner);
      const hook = JSON.parse(readFileSync(runner.hookPath, 'utf8')) as HookFrame;
      const launcherPid = processParentPid(hook.supervisorPid);
      expect(processParentPid(launcherPid)).toBe(runner.process.pid);
      const victimPid = scenario.victim === 'launcher'
        ? launcherPid
        : scenario.victim === 'supervisor'
          ? hook.supervisorPid
          : scenario.victim === 'guardian'
            ? hook.guardianPid
            : hook.workerPid;
      expect(Number.isSafeInteger(victimPid) && Number(victimPid) > 1).toBe(true);
      process.kill(victimPid!, 'SIGKILL');
      waitForPath(runner.outcomePath, 60_000);
      const completion = await waitForChildClose(runner.process);
      expect(completion).toEqual({ code: 0, signal: null });
      expect(JSON.parse(readFileSync(runner.outcomePath, 'utf8'))).toMatchObject({
        kind: 'error',
      });
      expect(existsSync(targetMarker)).toBe(false);
    }
  }, 240_000);

  it('sweeps the live group when the outer launcher receives KILL, TERM, INT, or HUP', async () => {
    if (workspace === '') return;
    for (const signal of ['SIGKILL', 'SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
      const slug = signal.toLowerCase();
      const fifo = createLifecycleFifo(workspace, `launcher-${slug}-lifecycle`, slug);
      const runner = startHookedRunner({
        hookPhase: 'go-sent',
        name: `launcher-${slug}`,
        target: lifecycleTarget(fifo, 'setInterval(() => {}, 1_000);'),
      });
      waitForRunnerHook(runner);
      waitForPath(`${fifo.path}.ready`, 60_000);
      const hook = JSON.parse(readFileSync(runner.hookPath, 'utf8')) as HookFrame;
      const launcherPid = processParentPid(hook.supervisorPid);
      expect(processParentPid(launcherPid)).toBe(runner.process.pid);
      process.kill(launcherPid, signal);
      waitForPath(runner.outcomePath, 60_000);
      expectLifecycleClosed(fifo, 0);
      expect(await waitForChildClose(runner.process)).toEqual({ code: 0, signal: null });
      expect(JSON.parse(readFileSync(runner.outcomePath, 'utf8'))).toMatchObject({
        kind: 'error',
      });
    }
  }, 300_000);

  it('fails closed without claiming containment when the guardian is killed directly', async () => {
    if (workspace === '') return;
    const targetReady = join(workspace, 'guardian-loss-target-ready');
    const targetExited = join(workspace, 'guardian-loss-target-exited');
    const targetRelease = join(workspace, 'guardian-loss-target-release');
    const target = `const fs = require('node:fs');
      fs.writeFileSync(${JSON.stringify(targetReady)}, 'ready\\n', { flag: 'wx', mode: 0o600 });
      const timer = setInterval(() => {
        if (fs.existsSync(${JSON.stringify(targetRelease)})) {
          clearInterval(timer);
          fs.writeFileSync(${JSON.stringify(targetExited)}, 'exited\\n', {
            flag: 'wx', mode: 0o600,
          });
          process.exit(0);
        }
      }, 10);`;
    const runner = startHookedRunner({
      hookPhase: 'go-sent',
      name: 'guardian-loss',
      target,
    });
    waitForRunnerHook(runner);
    waitForPath(targetReady, 60_000);
    const hook = JSON.parse(readFileSync(runner.hookPath, 'utf8')) as HookFrame;
    expect(Number.isSafeInteger(hook.guardianPid) && Number(hook.guardianPid) > 1).toBe(true);
    process.kill(hook.guardianPid!, 'SIGKILL');
    waitForPath(runner.outcomePath, 60_000);
    expect(existsSync(targetExited)).toBe(false);
    expect(await waitForChildClose(runner.process)).toEqual({ code: 0, signal: null });
    expect(JSON.parse(readFileSync(runner.outcomePath, 'utf8'))).toMatchObject({ kind: 'error' });
    writeFileSync(targetRelease, 'release\n', { flag: 'wx', mode: 0o600 });
    waitForPath(targetExited, 8_000);
  }, 180_000);

  it('bounds retained detached output pipes and reports failure before the escape exits', () => {
    if (workspace === '') return;
    const detachedReady = join(workspace, 'detached-pipe-ready');
    const detachedExited = join(workspace, 'detached-pipe-exited');
    const detachedRelease = join(workspace, 'detached-pipe-release');
    const detachedSource = `const fs = require('node:fs');
      fs.writeFileSync(${JSON.stringify(detachedReady)}, 'ready\\n', {
        flag: 'wx', mode: 0o600,
      });
      const timer = setInterval(() => {
        if (fs.existsSync(${JSON.stringify(detachedRelease)})) {
          clearInterval(timer);
          fs.writeFileSync(${JSON.stringify(detachedExited)}, 'exited\\n', {
            flag: 'wx', mode: 0o600,
          });
          process.exit(0);
        }
      }, 10);`;
    const target = `require('node:child_process').spawn(
      process.execPath,
      ['-e', ${JSON.stringify(detachedSource)}],
      { detached: true, stdio: ['ignore', 'inherit', 'inherit'] },
    ).unref();`;
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', target],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment,
        outputLimitBytes: 1_024,
        targetAuthority: acquisition.authority,
        timeoutMs: 10_000,
      },
    )).toThrow(/guardian pipes did not reach bounded EOF|supervisor failed without a valid result/u);
    waitForPath(detachedReady, 3_000);
    expect(existsSync(detachedExited)).toBe(false);
    writeFileSync(detachedRelease, 'release\n', { flag: 'wx', mode: 0o600 });
    waitForPath(detachedExited, 8_000);
  }, 30_000);

  it('hard-stops timeout, overflow, and immediate-parent-kill paths before return', () => {
    if (workspace === '') return;
    const timeoutFifo = createLifecycleFifo(workspace, 'timeout-lifecycle', 'timeout');
    const timeout = runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', lifecycleTarget(timeoutFifo, 'setInterval(() => {}, 1_000);')],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment,
        outputLimitBytes: 1_024,
        targetAuthority: acquisition.authority,
        timeoutMs: 5_000,
      },
    );
    expect(timeout).toMatchObject({
      outputOverflow: false,
      signal: 'SIGKILL',
      status: null,
      timedOut: true,
    });
    expectLifecycleClosed(timeoutFifo);

    const overflow = runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', "process.stdout.write(Buffer.alloc(4096, 0x61)); setInterval(() => {}, 1000);"],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment,
        outputLimitBytes: 257,
        targetAuthority: acquisition.authority,
        timeoutMs: 10_000,
      },
    );
    expect(overflow).toMatchObject({
      outputOverflow: true,
      signal: 'SIGKILL',
      status: null,
      timedOut: false,
    });
    expect(overflow.stdout.byteLength).toBe(257);

    const parentKillFifo = createLifecycleFifo(workspace, 'parent-kill-lifecycle', 'parent-kill');
    expect(() => runReviewedPosixCommand(
      reviewedNode,
      reviewedNode,
      ['-e', lifecycleTarget(
        parentKillFifo,
        `const timer = setInterval(() => {
          if (require('node:fs').existsSync(${JSON.stringify(`${parentKillFifo.path}.ready`)})) {
            clearInterval(timer);
            process.kill(process.ppid, 'SIGKILL');
          }
        }, 5);`,
      )],
      workspace,
      {
        controlRuntimeAuthority: acquisition.authority,
        environment,
        outputLimitBytes: 1_024,
        targetAuthority: acquisition.authority,
        timeoutMs: 10_000,
      },
    )).toThrow(/supervisor failed without a valid result/u);
    expectLifecycleClosed(parentKillFifo);
  }, 90_000);

  it('does not return after supervisor SIGKILL until guardian EOF and group cleanup', async () => {
    if (workspace === '') return;
    const fifo = createLifecycleFifo(workspace, 'supervisor-kill-lifecycle', 'supervisor-kill');
    const hookPath = join(workspace, 'supervisor-kill-hook.json');
    const returnedPath = join(workspace, 'supervisor-kill-returned');
    const runnerPath = join(workspace, 'supervisor-kill-runner.ts');
    const target = lifecycleTarget(fifo, 'setInterval(() => {}, 1_000);');
    writeFileSync(runnerPath, `import { writeFileSync } from 'node:fs';
      import { runReviewedPosixCommand } from ${JSON.stringify(runnerModuleUrl)};
      try {
        runReviewedPosixCommand(
          ${JSON.stringify(reviewedNode)},
          ${JSON.stringify(reviewedNode)},
          ['-e', ${JSON.stringify(target)}],
          ${JSON.stringify(workspace)},
          {
            controlRuntimeAuthority: ${JSON.stringify(acquisition.authority)},
            environment: ${JSON.stringify(environment)},
            outputLimitBytes: 1024,
            targetAuthority: ${JSON.stringify(acquisition.authority)},
            timeoutMs: 30000,
            trustedTestHook: {
              phase: 'go-sent',
              readyPath: ${JSON.stringify(hookPath)},
            },
          },
        );
      } catch {}
      writeFileSync(${JSON.stringify(returnedPath)}, 'returned\\n', { flag: 'wx', mode: 0o600 });
    `, { flag: 'wx', mode: 0o600 });
    const runner = spawn(bunExecutable, [runnerPath], {
      cwd: workspace,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    waitForPath(hookPath, 60_000);
    waitForPath(`${fifo.path}.ready`, 60_000);
    const hook = JSON.parse(readFileSync(hookPath, 'utf8')) as { supervisorPid: number };
    expect(Number.isSafeInteger(hook.supervisorPid)).toBe(true);
    process.kill(hook.supervisorPid, 'SIGKILL');
    waitForPath(returnedPath, 60_000);
    // This observation is deliberately immediate: the outer call's EOF proof,
    // not an eventual retry loop, must order return after guardian/group death.
    expectLifecycleClosed(fifo, 0);
    const completion = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
      (resolveCompletion) => runner.once('close', (code, signal) => {
        resolveCompletion({ code, signal });
      }),
    );
    expect(completion).toEqual({ code: 0, signal: null });
  }, 120_000);

  it('never numerically signals or probes from the host after guardian reap', async () => {
    if (workspace === '') return;
    const runner = startHookedRunner({
      auditHostSignals: true,
      hookPhase: 'guardian-swept-before-result',
      name: 'post-reap-host-audit',
      target: 'process.exit(0);',
    });
    waitForRunnerHook(runner);
    const hook = JSON.parse(readFileSync(runner.hookPath, 'utf8')) as HookFrame;
    expect(Object.keys(hook).sort()).toEqual([
      'phase',
      'schema',
      'supervisorPid',
    ]);
    process.kill(hook.supervisorPid, 'SIGKILL');
    waitForPath(runner.outcomePath, 60_000);
    expect(await waitForChildClose(runner.process)).toEqual({ code: 0, signal: null });
    expect(JSON.parse(readFileSync(runner.outcomePath, 'utf8'))).toMatchObject({
      hostSignals: [],
      kind: 'error',
    });
  }, 120_000);

  it('self-sweeps an invalid lifetime descriptor and has no post-reap signal site', async () => {
    if (workspace === '') return;
    const payload = JSON.stringify({
      args: ['--version'],
      cwd: workspace,
      environment,
      hasStdin: false,
      // Structurally valid but deliberately not the kernel object at guardian
      // fd 5. A closed inherited slot may be reused by Node as an internal FIFO;
      // descriptor kind alone must never bless that unrelated object.
      lifetimeAuthority: {
        dev: '0',
        gid: '0',
        ino: '0',
        kind: 'fifo',
        mode: '0',
        nlink: '0',
        rdev: '0',
        schema: REVIEWED_POSIX_LIFETIME_AUTHORITY_SCHEMA,
        uid: '0',
      },
      targetExecutable: reviewedNode,
    });
    const invalidLifetime = spawn(reviewedNode, ['-e', REVIEWED_POSIX_GUARDIAN_SOURCE], {
      cwd: workspace,
      detached: true,
      env: { [REVIEWED_POSIX_GUARDIAN_PAYLOAD_ENV]: payload },
      stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'ignore', 'ignore'],
    });
    const intentChunks: Buffer[] = [];
    invalidLifetime.stdio[3]?.on('data', (chunk: Buffer) => intentChunks.push(Buffer.from(chunk)));
    const terminal = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
      (resolveTerminal, rejectTerminal) => {
        const timer = setTimeout(() => {
          invalidLifetime.kill('SIGKILL');
          rejectTerminal(new Error('invalid-lifetime guardian did not self-sweep'));
        }, 10_000);
        invalidLifetime.once('error', rejectTerminal);
        invalidLifetime.once('close', (code, signal) => {
          clearTimeout(timer);
          resolveTerminal({ code, signal });
        });
      },
    );
    expect(terminal).toEqual({ code: null, signal: 'SIGKILL' });
    const intent = Buffer.concat(intentChunks).toString('utf8');
    const intentFrames = intent.trimEnd().split('\n');
    expect(intentFrames).toHaveLength(1);
    expect(JSON.parse(intentFrames[0]!)).toMatchObject({
      completion: null,
      reason: 'invalid_lifetime_channel',
    });

    const nonDetached = spawn(reviewedNode, ['-e', REVIEWED_POSIX_GUARDIAN_SOURCE], {
      cwd: workspace,
      detached: false,
      env: { [REVIEWED_POSIX_GUARDIAN_PAYLOAD_ENV]: payload },
      stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'ignore', 'ignore'],
    });
    const nonDetachedIntentChunks: Buffer[] = [];
    const nonDetachedStderrChunks: Buffer[] = [];
    nonDetached.stdio[3]?.on('data', (chunk: Buffer) => {
      nonDetachedIntentChunks.push(Buffer.from(chunk));
    });
    nonDetached.stderr?.on('data', (chunk: Buffer) => {
      nonDetachedStderrChunks.push(Buffer.from(chunk));
    });
    const nonDetachedTerminal = await new Promise<{
      readonly code: number | null;
      readonly signal: NodeJS.Signals | null;
    }>((resolveTerminal, rejectTerminal) => {
      const timer = setTimeout(() => {
        nonDetached.kill('SIGKILL');
        rejectTerminal(new Error('non-detached guardian did not fail closed'));
      }, 10_000);
      nonDetached.once('error', rejectTerminal);
      nonDetached.once('close', (code, signal) => {
        clearTimeout(timer);
        resolveTerminal({ code, signal });
      });
    });
    expect(nonDetachedTerminal).toEqual({ code: 70, signal: null });
    const nonDetachedIntentFrames = Buffer.concat(nonDetachedIntentChunks)
      .toString('utf8')
      .trimEnd()
      .split('\n');
    expect(nonDetachedIntentFrames).toHaveLength(1);
    expect(JSON.parse(nonDetachedIntentFrames[0]!)).toMatchObject({
      completion: null,
      reason: 'invalid_lifetime_channel',
    });
    expect(Buffer.concat(nonDetachedStderrChunks).toString('utf8')).toMatch(
      /guardian self-sweep failed: ESRCH/u,
    );

    const supervisorSource = readFileSync(
      join(repositoryRoot, 'scripts', 'lib', 'reviewed-posix-supervisor.ts'),
      'utf8',
    );
    const hostSource = readFileSync(
      join(repositoryRoot, 'scripts', 'lib', 'reviewed-posix-command.ts'),
      'utf8',
    );
    expect(supervisorSource.match(/process\.kill\(/gu) ?? []).toHaveLength(1);
    expect(supervisorSource).toContain("process.kill(-process.pid, 'SIGKILL')");
    expect(REVIEWED_POSIX_SUPERVISOR_SOURCE).toContain(`failProtocol(
        'guardian READY frame failed closed predicates: ' +
          failedPredicates.join(','),
      );`);
    expect(hostSource).not.toMatch(/process\.kill\(|\.kill\(|killpg|getpgid/u);
    expect(hostSource).not.toMatch(/guardianPid|workerPid/u);
  }, 30_000);
});
