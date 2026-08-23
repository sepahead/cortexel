import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  closedTsxFixtureEnvironmentTesting,
  createClosedTsxFixtureEnvironment,
} from './closedTsxFixtureEnvironment.js';

const temporaryDirectories: string[] = [];

function privateTemporaryDirectory(prefix: string): string {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(), prefix)));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('closed TSX fixture environment', () => {
  it('binds exact environment keys and one staged Node command capability', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-environment-');
    const result = createClosedTsxFixtureEnvironment(parent, 'loader-temp');
    expect(result.loaderTemporaryDirectory).toBe(path.join(parent, 'loader-temp'));
    expect(Object.keys(result.environment).sort()).toEqual([
      ...closedTsxFixtureEnvironmentTesting.closedEnvironmentKeys(),
    ].sort());
    expect(result.environment).toMatchObject({
      LANG: 'C',
      LC_ALL: 'C',
      TEMP: result.loaderTemporaryDirectory,
      TMP: result.loaderTemporaryDirectory,
      TMPDIR: result.loaderTemporaryDirectory,
    });
    expect(result.environment.PATH).toBeUndefined();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.environment)).toBe(true);
    result.dispose();
    expect(() => result.dispose()).toThrow(/already consumed or disposed/u);
  }, 60_000);

  it('uses staged Node authority even when ambient PATH names an attacker executable', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-path-');
    const attacker = path.join(parent, 'attacker');
    const marker = path.join(parent, 'attacker-node-ran');
    mkdirSync(attacker, { mode: 0o700 });
    writeFileSync(
      path.join(attacker, 'node'),
      `#!/bin/sh\nprintf ran > ${JSON.stringify(marker)}\nexit 99\n`,
      { mode: 0o700 },
    );
    chmodSync(path.join(attacker, 'node'), 0o700);
    const previousPath = process.env.PATH;
    const previousTextEncoding = process.env.__CF_USER_TEXT_ENCODING;
    process.env.PATH = attacker;
    process.env.__CF_USER_TEXT_ENCODING = 'attacker-controlled';
    try {
      const command = createClosedTsxFixtureEnvironment(parent, 'loader-temp');
      const result = command.runNode(
        [
          '-e',
          'process.stdout.write(JSON.stringify({encoding:process.env.__CF_USER_TEXT_ENCODING,execPath:process.execPath,keys:Object.keys(process.env).sort()}))',
        ],
        { cwd: parent, outputLimitBytes: 16 * 1024, timeoutMs: 10_000 },
      );
      expect(result).toMatchObject({ signal: null, status: 0, stderr: '' });
      const observed = JSON.parse(result.stdout) as {
        readonly encoding?: string;
        readonly execPath: string;
        readonly keys: readonly string[];
      };
      expect(path.isAbsolute(observed.execPath)).toBe(true);
      expect(observed.execPath).not.toBe(path.join(attacker, 'node'));
      expect(observed.keys).toEqual(
        [
          ...closedTsxFixtureEnvironmentTesting.effectiveNodeEnvironmentKeys(
            process.platform,
          ),
        ].sort(),
      );
      expect(observed.encoding).not.toBe('attacker-controlled');
      expect(existsSync(marker)).toBe(false);
      expect(() => command.runNode(
        ['--version'],
        { cwd: parent, outputLimitBytes: 1_024, timeoutMs: 10_000 },
      )).toThrow(/already consumed or disposed/u);
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      if (previousTextEncoding === undefined) {
        delete process.env.__CF_USER_TEXT_ENCODING;
      } else {
        process.env.__CF_USER_TEXT_ENCODING = previousTextEncoding;
      }
    }
  }, 60_000);

  it('rejects traversal and reuse before sharing loader scratch authority', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-negative-');
    expect(() => createClosedTsxFixtureEnvironment(parent, '../escape'))
      .toThrow(/directory name is invalid/u);
    expect(readdirSync(parent)).toEqual([]);
    const command = createClosedTsxFixtureEnvironment(parent, 'loader-temp');
    command.dispose();
    expect(() => createClosedTsxFixtureEnvironment(parent, 'loader-temp'))
      .toThrow();
  }, 60_000);

  it('removes the exact child after post-create validation fails', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-cleanup-');
    const child = path.join(parent, 'loader-temp');
    expect(() => closedTsxFixtureEnvironmentTesting.createWithAfterCreateHook(
      parent,
      'loader-temp',
      (directory) => chmodSync(directory, 0o755),
    )).toThrow(/exact mode 0700/u);
    expect(existsSync(child)).toBe(false);
    expect(readdirSync(parent)).toEqual([]);
  }, 60_000);

  it('removes a recoverable child after failure before initial identity capture', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-pre-identity-');
    const child = path.join(parent, 'loader-temp');
    expect(() => closedTsxFixtureEnvironmentTesting.createWithBeforeIdentityHook(
      parent,
      'loader-temp',
      () => {
        throw new Error('injected pre-identity failure');
      },
    )).toThrow(/injected pre-identity failure/u);
    expect(existsSync(child)).toBe(false);
    expect(readdirSync(parent)).toEqual([]);
  }, 60_000);

  it('retains and reports a child whose pre-identity authority is ambiguous', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-ambiguous-');
    const child = path.join(parent, 'loader-temp');
    let observed: unknown;
    try {
      closedTsxFixtureEnvironmentTesting.createWithBeforeIdentityHook(
        parent,
        'loader-temp',
        (directory) => {
          chmodSync(directory, 0o755);
          throw new Error('injected ambiguous pre-identity failure');
        },
      );
    } catch (error) {
      observed = error;
    }
    expect(observed).toBeInstanceOf(AggregateError);
    const aggregate = observed as AggregateError;
    expect(aggregate.message).toMatch(/cleanup authority is uncertain/u);
    expect(aggregate.errors.map((error) =>
      error instanceof Error ? error.message : String(error)))
      .toContain('pre-identity loader scratch cleanup is uncertain; child was retained');
    expect(existsSync(child)).toBe(true);
    chmodSync(child, 0o700);
    rmdirSync(child);
    expect(readdirSync(parent)).toEqual([]);
  }, 60_000);

  it('detects loader scratch authority drift across the reviewed command', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-drift-');
    const command = createClosedTsxFixtureEnvironment(parent, 'loader-temp');
    expect(() => command.runNode(
      [
        '-e',
        "require('node:fs').chmodSync(process.env.TMPDIR, 0o755)",
      ],
      { cwd: parent, outputLimitBytes: 16 * 1024, timeoutMs: 10_000 },
    )).toThrow(/post-command loader authority|cleanup authority is uncertain/u);
    expect(readdirSync(command.loaderTemporaryDirectory).some((entry) =>
      entry.startsWith('cortexel-reviewed-node-runtime-'))).toBe(false);
    chmodSync(command.loaderTemporaryDirectory, 0o700);
  }, 60_000);

  it('disposes the staged runtime when a consumed pre-command check fails', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-precheck-');
    const command = createClosedTsxFixtureEnvironment(parent, 'loader-temp');
    chmodSync(command.loaderTemporaryDirectory, 0o755);
    expect(() => command.runNode(
      ['-e', 'process.stdout.write("must-not-run")'],
      { cwd: parent, outputLimitBytes: 16 * 1024, timeoutMs: 10_000 },
    )).toThrow(/pre-command loader authority|cleanup authority is uncertain/u);
    expect(readdirSync(parent)).toEqual(['loader-temp']);
    chmodSync(command.loaderTemporaryDirectory, 0o700);
    expect(() => command.runNode(
      ['--version'],
      { cwd: parent, outputLimitBytes: 1_024, timeoutMs: 10_000 },
    )).toThrow(/already consumed or disposed/u);
  }, 60_000);

  it('consumes malformed argument and option inputs before checked cleanup', () => {
    const parent = privateTemporaryDirectory('cortexel-closed-tsx-inputs-');
    const validOptions = {
      cwd: parent,
      outputLimitBytes: 16 * 1024,
      timeoutMs: 10_000,
    };
    let fixtureIndex = 0;
    const expectConsumedFailure = (
      arguments_: readonly string[],
      options: unknown,
      expected: RegExp,
    ): void => {
      const directoryName = `loader-${fixtureIndex++}`;
      const command = createClosedTsxFixtureEnvironment(parent, directoryName);
      expect(() => command.runNode(
        arguments_,
        options as never,
      )).toThrow(expected);
      expect(readdirSync(command.loaderTemporaryDirectory)).toEqual([]);
      expect(() => command.dispose()).toThrow(/already consumed or disposed/u);
      rmdirSync(command.loaderTemporaryDirectory);
    };

    const sparseArguments: string[] = [];
    sparseArguments.length = 1;
    expectConsumedFailure(
      sparseArguments,
      validOptions,
      /argument 0 must be one enumerable own string/u,
    );

    let proxyTrapCount = 0;
    const proxyArguments = new Proxy(['--version'], {
      get: () => {
        proxyTrapCount += 1;
        throw new Error('argument proxy trap must not execute');
      },
    });
    expectConsumedFailure(
      proxyArguments,
      validOptions,
      /Node arguments must be one direct array/u,
    );
    expect(proxyTrapCount).toBe(0);

    let getterCallCount = 0;
    const getterArguments: string[] = [];
    Object.defineProperty(getterArguments, '0', {
      enumerable: true,
      get: () => {
        getterCallCount += 1;
        throw new Error('argument getter must not execute');
      },
    });
    getterArguments.length = 1;
    expectConsumedFailure(
      getterArguments,
      validOptions,
      /argument 0 must be one enumerable own string/u,
    );
    expect(getterCallCount).toBe(0);

    const extraArguments = Object.assign(['--version'], { extra: true });
    expectConsumedFailure(
      extraArguments,
      validOptions,
      /dense and have no extra enumerable members/u,
    );

    let optionGetterCallCount = 0;
    const getterOptions = {
      cwd: parent,
      outputLimitBytes: 16 * 1024,
      get timeoutMs(): number {
        optionGetterCallCount += 1;
        throw new Error('option getter must not execute');
      },
    };
    expectConsumedFailure(
      ['--version'],
      getterOptions,
      /command option timeoutMs must be an enumerable own data property/u,
    );
    expect(optionGetterCallCount).toBe(0);

    expectConsumedFailure(
      ['--version'],
      { ...validOptions, extra: true },
      /exact member set/u,
    );
    expectConsumedFailure(
      ['--version'],
      { ...validOptions, timeoutMs: 0 },
      /timeout or output bound is invalid/u,
    );
    expectConsumedFailure(
      ['--version'],
      { ...validOptions, cwd: '.' },
      /command cwd must be one bounded physical absolute path/u,
    );
    expect(readdirSync(parent)).toEqual([]);
  }, 180_000);

  it('records explicit platform and joined-path bounds', () => {
    expect(closedTsxFixtureEnvironmentTesting.maximumPathBytes).toBe(4_096);
    expect(closedTsxFixtureEnvironmentTesting.platformIsSupported('darwin')).toBe(true);
    expect(closedTsxFixtureEnvironmentTesting.platformIsSupported('linux')).toBe(true);
    expect(closedTsxFixtureEnvironmentTesting.platformIsSupported('win32')).toBe(false);
  });
});
