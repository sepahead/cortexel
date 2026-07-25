import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertFinalizedHostFile,
  assertInstalledRecursivePackageClosure,
  assertInstalledTopLevelPackageInventory,
  fingerprintPackageSmokeWorkspace,
  inspectNpmPackageTarball,
  installedArtifactMode,
  packageSmokeEnvironment,
  parsePackageSmokeInvocation,
  readDirectoryNamesBounded,
  runReviewedNodeCommand,
  scrubbedEnvironment,
  type ExpectedPackageFile,
  type PackedFile,
  type PackedResult,
  validatePackageSmokeFixture,
  verifyInstalledPackageClosure,
} from '../scripts/smoke-package';

const root = resolve(import.meta.dirname, '..');
const fixtureRoot = join(root, 'scripts', 'fixtures', 'package-smoke');
const cleanups: string[] = [];

interface TestTarEntry {
  readonly path: string;
  readonly content: Buffer;
  readonly mode?: number;
  readonly type?: string;
  readonly prefix?: string;
  readonly paddingByte?: number;
}

function octal(value: number, digits: number): string {
  return `${value.toString(8).padStart(digits, '0')} \0`;
}

function refreshTarChecksum(header: Buffer): void {
  header.fill(0x20, 148, 156);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(octal(checksum, 6), 148, 8, 'ascii');
}

function testTar(entries: readonly TestTarEntry[], endBlocks = 2): Buffer {
  const parts: Buffer[] = [];
  for (const entry of entries) {
    const header = Buffer.alloc(512);
    const tarPath = `package/${entry.path}`;
    header.write(tarPath, 0, Buffer.byteLength(tarPath), 'ascii');
    header.write(octal(entry.mode ?? 0o644, 6), 100, 8, 'ascii');
    header.write(octal(entry.content.byteLength, 10), 124, 12, 'ascii');
    header.write(octal(499_162_500, 10), 136, 12, 'ascii');
    header.write(entry.type ?? '0', 156, 1, 'ascii');
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    header.write('000000 \0', 329, 8, 'ascii');
    header.write('000000 \0', 337, 8, 'ascii');
    if (entry.prefix !== undefined) {
      header.write(entry.prefix, 345, Buffer.byteLength(entry.prefix), 'ascii');
    }
    refreshTarChecksum(header);
    const padding = Buffer.alloc(Math.ceil(entry.content.byteLength / 512) * 512 - entry.content.byteLength);
    if (entry.paddingByte !== undefined && padding.byteLength > 0) padding[0] = entry.paddingByte;
    parts.push(header, entry.content, padding);
  }
  parts.push(Buffer.alloc(endBlocks * 512));
  return Buffer.concat(parts);
}

function testExpectedFile(
  path: string,
  content: Buffer,
  mode = path === 'dist/cli/main.js' ? 0o755 : 0o644,
): ExpectedPackageFile {
  return {
    path,
    size: content.byteLength,
    mode,
    digest: `sha256:${createHash('sha256').update(content).digest('hex')}`,
  };
}

function testPackedResult(tarball: Buffer, files: readonly PackedFile[]): PackedResult {
  return {
    name: 'cortexel',
    version: '0.0.0-test',
    size: tarball.byteLength,
    unpackedSize: files.reduce((total, file) => total + file.size, 0),
    shasum: createHash('sha1').update(tarball).digest('hex'),
    integrity: `sha512-${createHash('sha512').update(tarball).digest('base64')}`,
    filename: 'cortexel-0.0.0-test.tgz',
    files,
    entryCount: files.length,
  };
}

function gzipCanonicalTar(tar: Buffer): Buffer {
  const gzip = gzipSync(tar, { level: 9 });
  gzip[9] = 0xff;
  return gzip;
}

function gzipTestTar(entries: readonly TestTarEntry[], endBlocks = 2): Buffer {
  return gzipCanonicalTar(testTar(entries, endBlocks));
}

function withRepackedTar(tarball: Buffer, mutate: (tar: Buffer) => void): Buffer {
  const tar = Buffer.from(gunzipSync(tarball));
  mutate(tar);
  return gzipCanonicalTar(tar);
}

function fixtureValues(): {
  manifest: any;
  lock: any;
  packageJson: any;
} {
  return {
    manifest: JSON.parse(readFileSync(join(fixtureRoot, 'package.json'), 'utf8')),
    lock: JSON.parse(readFileSync(join(fixtureRoot, 'package-lock.json'), 'utf8')),
    packageJson: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')),
  };
}

afterEach(() => {
  for (const path of cleanups.splice(0)) {
    try {
      chmodSync(path, 0o755);
    } catch {
      // A test may already have removed the path.
    }
    rmSync(path, { recursive: true, force: true });
  }
});

describe('two-phase package smoke contract', () => {
  it('binds finalized host-authored guard and probe inputs to exact bytes and mode', () => {
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-host-intent-')));
    cleanups.push(workspace);
    const input = join(workspace, 'probe.mjs');
    const intended = "throw new Error('guarded');\n";
    writeFileSync(input, intended, { mode: 0o444 });
    chmodSync(input, 0o444);
    expect(() => assertFinalizedHostFile(input, intended, 'test probe')).not.toThrow();

    chmodSync(input, 0o644);
    const noOp = `${' '.repeat(Buffer.byteLength(intended, 'utf8') - 1)}\n`;
    writeFileSync(input, noOp);
    chmodSync(input, 0o444);
    expect(() => assertFinalizedHostFile(input, intended, 'test probe')).toThrow(
      /exact intended value/u,
    );

    chmodSync(input, 0o644);
    writeFileSync(input, intended);
    expect(() => assertFinalizedHostFile(input, intended, 'test probe')).toThrow(
      /permission phase/u,
    );
    chmodSync(input, 0o444);
    const target = join(workspace, 'alternate.mjs');
    writeFileSync(target, intended, { mode: 0o444 });
    chmodSync(target, 0o444);
    rmSync(input);
    symlinkSync('alternate.mjs', input);
    expect(() => assertFinalizedHostFile(input, intended, 'test probe')).toThrow(
      /canonical absolute regular path/u,
    );
  });

  it('passes only network/runtime necessities and never ambient credentials', () => {
    const environment = packageSmokeEnvironment(
      '/reviewed/bin/node',
      '/reviewed/workspace',
      {
        PATH: '/unreviewed/bin',
        HOME: '/isolated/home',
        HTTPS_PROXY: 'https://user:secret@proxy.invalid',
        ANTHROPIC_API_KEY: 'must-not-cross',
        NPM_TOKEN: 'must-not-cross',
        NODE_OPTIONS: '--require=unreviewed.cjs',
        LD_PRELOAD: '/unreviewed/library.so',
        OPENSSL_CONF: '/unreviewed/openssl.cnf',
      },
    );
    expect(environment.PATH).toBe('/usr/bin:/bin');
    expect(environment.PATH).not.toContain('/reviewed/bin');
    expect(environment.PATH).not.toContain('/unreviewed');
    expect(environment.HOME).toBe('/reviewed/workspace/operational/home');
    expect(environment.TMPDIR).toBe('/reviewed/workspace/operational/tmp');
    expect(environment.npm_config_cache).toBe('/reviewed/workspace/operational/npm-cache');
    expect(environment.npm_config_registry).toBe('https://registry.npmjs.org/');
    expect(environment.NODE_USE_SYSTEM_CA).toBeUndefined();
    expect(environment.NODE_EXTRA_CA_CERTS).toBeUndefined();
    expect(environment.SSL_CERT_FILE).toBeUndefined();
    expect(environment.SSL_CERT_DIR).toBeUndefined();
    expect(environment.HTTPS_PROXY).toBeUndefined();
    expect(environment.ANTHROPIC_API_KEY).toBeUndefined();
    expect(environment.NPM_TOKEN).toBeUndefined();
    expect(environment.NODE_OPTIONS).toBeUndefined();
    expect(environment.LD_PRELOAD).toBeUndefined();
    expect(environment.OPENSSL_CONF).toBeUndefined();
    const executeEnvironment = packageSmokeEnvironment(
      '/reviewed/bin/node',
      '/reviewed/workspace',
      {},
      'linux',
      'execute',
    );
    expect(executeEnvironment.HOME).toBe(
      '/reviewed/workspace/operational/execute-denied/home',
    );
    expect(executeEnvironment.TMPDIR).toBe(
      '/reviewed/workspace/operational/execute-denied/tmp',
    );
    expect(executeEnvironment.npm_config_cache).toBe(
      '/reviewed/workspace/operational/execute-denied/npm-cache',
    );

    const posix = scrubbedEnvironment('/reviewed/bin/node', {
      HOME: '/uppercase',
      home: '/lowercase',
      SystemRoot: '/not-posix',
    }, 'linux');
    expect(posix.HOME).toBeUndefined();
    expect(posix.home).toBeUndefined();
    expect(posix.SYSTEMROOT).toBeUndefined();
    expect(() => scrubbedEnvironment('/reviewed/bin/node', {
      SystemRoot: 'C:\\Windows',
      SYSTEMROOT: 'D:\\Windows',
    }, 'win32')).toThrow(/case-folded key collision/u);
    const windows = scrubbedEnvironment('/reviewed/bin/node', {
      SystemRoot: 'C:\\Windows',
      ComSpec: 'C:\\unreviewed\\cmd.exe',
      PATHEXT: '.ATTACK;.EXE',
    }, 'win32');
    expect(windows.PATH).toBe('C:\\Windows\\System32;C:\\Windows');
    expect(windows.SYSTEMROOT).toBe('C:\\Windows');
    expect(windows.WINDIR).toBe('C:\\Windows');
    expect(windows.COMSPEC).toBeUndefined();
    expect(windows.PATHEXT).toBeUndefined();
    expect(() => scrubbedEnvironment('/reviewed/bin/node', {
      SYSTEMROOT: 'C:\\Windows',
      WINDIR: 'D:\\Windows',
    }, 'win32')).toThrow(/authorities disagree/u);
  });

  it('bounds reviewed Node commands and their descendant process group', () => {
    if (process.platform === 'win32') return;
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    if (nodeProbe.status !== 0 || nodeProbe.signal !== null) {
      throw new Error('the focused package test requires Node');
    }
    const reviewedNode = realpathSync(nodeProbe.stdout.trim());
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-reviewed-node-command-')));
    cleanups.push(workspace);
    const environment = packageSmokeEnvironment(reviewedNode, workspace, {});

    const successful = runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stdout.write("bounded-ok")'],
      workspace,
      { environment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
    );
    expect(successful).toMatchObject({
      status: 0,
      signal: null,
      stdout: 'bounded-ok',
      stderr: '',
      timedOut: false,
      outputOverflow: false,
    });
    expect(successful.processGroupId).toBeGreaterThan(0);

    // The base64 protocol envelope is larger than the bounded raw output. This
    // crosses the ordinary 16 MiB JSON-file limit while remaining below the
    // command's advertised 16 MiB raw-output limit.
    const largeOutputBytes = 12 * 1024 * 1024;
    const largeOutput = runReviewedNodeCommand(
      reviewedNode,
      ['-e', `process.stdout.write('x'.repeat(${largeOutputBytes}))`],
      workspace,
      { environment, timeoutMs: 5_000, outputLimitBytes: 16 * 1024 * 1024 },
    );
    expect(largeOutput.status).toBe(0);
    expect(largeOutput.signal).toBeNull();
    expect(largeOutput.stdout.length).toBe(largeOutputBytes);
    expect(largeOutput.groupKillCount).toBe(1);

    const nonzero = runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stderr.write("bounded-error"); process.exit(7)'],
      workspace,
      { environment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
    );
    expect(nonzero.status).toBe(7);
    expect(nonzero.signal).toBeNull();
    expect(nonzero.stderr).toBe('bounded-error');
    expect(successful.groupKillCount).toBe(1);
    expect(nonzero.groupKillCount).toBe(1);

    const exitWithChild = (exitCode: number, pidFile: string) => runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        `const child = require('node:child_process').spawn(
           process.execPath,
           ['-e', 'setInterval(() => {}, 1000)'],
           { stdio: 'ignore' },
         );
         require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
         process.exit(${exitCode});`,
      ],
      workspace,
      { environment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
    );
    const successChildPid = join(workspace, 'success-child.pid');
    const nonzeroChildPid = join(workspace, 'nonzero-child.pid');
    const successfulWithChild = exitWithChild(0, successChildPid);
    const nonzeroWithChild = exitWithChild(9, nonzeroChildPid);
    expect(successfulWithChild.status).toBe(0);
    expect(nonzeroWithChild.status).toBe(9);
    expect(successfulWithChild.groupKillCount).toBe(1);
    expect(nonzeroWithChild.groupKillCount).toBe(1);

    const timeoutChildPid = join(workspace, 'timeout-child.pid');
    const timedOut = runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        `const fs = require('node:fs');
         const child = require('node:child_process').spawn(
           process.execPath,
           ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'],
           { stdio: 'ignore' },
         );
         fs.writeFileSync(${JSON.stringify(timeoutChildPid)}, String(child.pid));
         process.on('SIGTERM', () => {});
         setInterval(() => {}, 1000);`,
      ],
      workspace,
      { environment, timeoutMs: 500, outputLimitBytes: 1_024 },
    );
    expect(timedOut.timedOut).toBe(true);
    expect(timedOut.outputOverflow).toBe(false);
    expect(timedOut.signal).toBe('SIGKILL');
    expect(timedOut.processGroupId).toBeGreaterThan(0);
    expect(timedOut.groupKillCount).toBe(1);

    const overflowChildPid = join(workspace, 'overflow-child.pid');
    const overflow = runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        `const fs = require('node:fs');
         const child = require('node:child_process').spawn(
           process.execPath,
           ['-e', 'setInterval(() => {}, 1000)'],
           { stdio: 'ignore' },
         );
         fs.writeFileSync(${JSON.stringify(overflowChildPid)}, String(child.pid));
         process.stdout.write('x'.repeat(2048));
         setInterval(() => {}, 1000);`,
      ],
      workspace,
      { environment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
    );
    expect(overflow.timedOut).toBe(false);
    expect(overflow.outputOverflow).toBe(true);
    expect(overflow.signal).toBe('SIGKILL');
    expect(Buffer.byteLength(overflow.stdout)).toBe(1_024);
    expect(overflow.processGroupId).toBeGreaterThan(0);
    expect(overflow.groupKillCount).toBe(1);

    const waitForGone = (pid: number, processGroup: boolean): boolean => {
      const deadline = Date.now() + 2_000;
      while (Date.now() < deadline) {
        try {
          process.kill(processGroup ? -pid : pid, 0);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true;
          throw error;
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
      return false;
    };
    const parentKillPidFile = join(workspace, 'parent-kill-target.pid');
    const killedImmediateParent = runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        `require('node:fs').writeFileSync(
           ${JSON.stringify(parentKillPidFile)},
           String(process.pid),
         );
         process.kill(process.ppid, 'SIGKILL');
         setInterval(() => {}, 1000);`,
      ],
      workspace,
      { environment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
    );
    expect(killedImmediateParent.signal).toBe('SIGKILL');
    expect(killedImmediateParent.groupKillCount).toBe(1);
    expect(waitForGone(killedImmediateParent.processGroupId!, true)).toBe(true);
    expect(waitForGone(Number(readFileSync(parentKillPidFile, 'utf8')), false)).toBe(true);

    const supervisorKillWrapperPidFile = join(workspace, 'supervisor-kill-wrapper.pid');
    const supervisorKillPidFile = join(workspace, 'supervisor-kill-target.pid');
    const psExecutable = process.platform === 'darwin' ? '/bin/ps' : '/usr/bin/ps';
    let supervisorKillWrapperPid: number | undefined;
    let supervisorKillTargetPid: number | undefined;
    try {
      expect(() => runReviewedNodeCommand(
        reviewedNode,
        [
          '-e',
          `const childProcess = require('node:child_process');
           const fs = require('node:fs');
           fs.writeFileSync(
             ${JSON.stringify(supervisorKillWrapperPidFile)},
             String(process.ppid),
           );
           fs.writeFileSync(${JSON.stringify(supervisorKillPidFile)}, String(process.pid));
           const supervisorPid = Number(childProcess.execFileSync(
             ${JSON.stringify(psExecutable)},
             ['-o', 'ppid=', '-p', String(process.ppid)],
             { encoding: 'utf8' },
           ).trim());
           if (!Number.isSafeInteger(supervisorPid) || supervisorPid <= 1) process.exit(71);
           process.kill(supervisorPid, 'SIGKILL');
           setInterval(() => {}, 1000);`,
        ],
        workspace,
        { environment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
      )).toThrow(/outer SIGKILL boundary/u);
      supervisorKillWrapperPid = Number(readFileSync(supervisorKillWrapperPidFile, 'utf8'));
      supervisorKillTargetPid = Number(readFileSync(supervisorKillPidFile, 'utf8'));
      expect(waitForGone(supervisorKillWrapperPid, true)).toBe(true);
      expect(waitForGone(supervisorKillWrapperPid, false)).toBe(true);
      expect(waitForGone(supervisorKillTargetPid, false)).toBe(true);
    } finally {
      if (supervisorKillWrapperPid === undefined && existsSync(supervisorKillWrapperPidFile)) {
        supervisorKillWrapperPid = Number(readFileSync(supervisorKillWrapperPidFile, 'utf8'));
      }
      if (supervisorKillTargetPid === undefined && existsSync(supervisorKillPidFile)) {
        supervisorKillTargetPid = Number(readFileSync(supervisorKillPidFile, 'utf8'));
      }
      for (const [pid, group] of [
        [supervisorKillWrapperPid, true],
        [supervisorKillTargetPid, false],
      ] as const) {
        if (pid === undefined) continue;
        try {
          process.kill(group ? -pid : pid, 'SIGKILL');
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== 'ESRCH' && code !== 'EPERM') throw error;
        }
      }
    }

    for (const [result, pidFile] of [
      [successfulWithChild, successChildPid],
      [nonzeroWithChild, nonzeroChildPid],
      [timedOut, timeoutChildPid],
      [overflow, overflowChildPid],
    ] as const) {
      expect(waitForGone(result.processGroupId!, true)).toBe(true);
      expect(waitForGone(Number(readFileSync(pidFile, 'utf8')), false)).toBe(true);
    }

    expect(() => runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stdout.write(Buffer.from([0xff]));'],
      workspace,
      { environment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
    )).toThrow(/well-formed UTF-8/u);
    expect(() => runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.exit(0)', 'nul\0argument'],
      workspace,
      { environment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
    )).toThrow(/argument 2/u);

    const sentinelDirectory = join(workspace, 'unreviewed-sibling');
    const sentinelMarker = join(workspace, 'sibling-ran');
    mkdirSync(sentinelDirectory);
    const sentinelNode = join(sentinelDirectory, 'node');
    writeFileSync(sentinelNode, `#!/bin/sh\ntouch ${JSON.stringify(sentinelMarker)}\n`, { mode: 0o755 });
    chmodSync(sentinelNode, 0o755);
    const sentinelEnvironment = packageSmokeEnvironment(reviewedNode, workspace, {
      PATH: sentinelDirectory,
    });
    const exactRuntime = runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stdout.write(process.execPath)'],
      workspace,
      { environment: sentinelEnvironment, timeoutMs: 1_000, outputLimitBytes: 1_024 },
    );
    expect(realpathSync(exactRuntime.stdout)).toBe(reviewedNode);
    expect(() => realpathSync(sentinelMarker)).toThrow();
  });

  it('kills the detached target group when its outer supervisor group is cancelled', () => {
    if (process.platform === 'win32') return;
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    const bunProbe = spawnSync('bun', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    if (nodeProbe.status !== 0 || bunProbe.status !== 0) {
      throw new Error('the cancellation regression requires exact Node and Bun executables');
    }
    const reviewedNode = realpathSync(nodeProbe.stdout.trim());
    const reviewedBun = realpathSync(bunProbe.stdout.trim());
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-supervisor-cancel-')));
    cleanups.push(workspace);
    const smokeModule = pathToFileURL(join(root, 'scripts', 'smoke-package.ts')).href;

    const waitFor = (predicate: () => boolean, timeoutMs = 3_000): boolean => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (predicate()) return true;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
      return predicate();
    };
    const processIsGone = (pid: number, group: boolean): boolean => {
      try {
        process.kill(group ? -pid : pid, 0);
        return false;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true;
        throw error;
      }
    };

    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
      const signalName = signal.toLowerCase();
      const wrapperPidFile = join(workspace, `${signalName}-wrapper.pid`);
      const targetPidFile = join(workspace, `${signalName}-target.pid`);
      const descendantPidFile = join(workspace, `${signalName}-descendant.pid`);
      const runner = join(workspace, `${signalName}-runner.ts`);
      const targetProgram = `
        const fs = require('node:fs');
        const child = require('node:child_process').spawn(
          process.execPath,
          ['-e', 'setInterval(() => {}, 1000)'],
          { stdio: 'ignore' },
        );
        fs.writeFileSync(${JSON.stringify(wrapperPidFile)}, String(process.ppid));
        fs.writeFileSync(${JSON.stringify(targetPidFile)}, String(process.pid));
        fs.writeFileSync(${JSON.stringify(descendantPidFile)}, String(child.pid));
        setInterval(() => {}, 1000);
      `;
      writeFileSync(
        runner,
        `
          import { runReviewedNodeCommand } from ${JSON.stringify(smokeModule)};
          runReviewedNodeCommand(
            ${JSON.stringify(reviewedNode)},
            ['-e', ${JSON.stringify(targetProgram)}],
            ${JSON.stringify(workspace)},
            {
              environment: { PATH: '/usr/bin:/bin' },
              timeoutMs: 60_000,
              outputLimitBytes: 1_024,
            },
          );
        `,
      );
      const outer = spawn(reviewedBun, [runner], {
        cwd: root,
        detached: true,
        stdio: 'ignore',
      });
      outer.unref();
      let wrapperPid: number | undefined;
      let targetPid: number | undefined;
      try {
        expect(waitFor(() =>
          existsSync(wrapperPidFile) &&
          existsSync(targetPidFile) &&
          existsSync(descendantPidFile))).toBe(true);
        wrapperPid = Number(readFileSync(wrapperPidFile, 'utf8'));
        targetPid = Number(readFileSync(targetPidFile, 'utf8'));
        const descendantPid = Number(readFileSync(descendantPidFile, 'utf8'));
        expect(Number.isSafeInteger(wrapperPid) && wrapperPid > 0).toBe(true);
        expect(Number.isSafeInteger(targetPid) && targetPid > 0).toBe(true);
        expect(Number.isSafeInteger(descendantPid) && descendantPid > 0).toBe(true);
        process.kill(-outer.pid!, signal);
        expect(waitFor(() => processIsGone(wrapperPid!, true))).toBe(true);
        expect(waitFor(() => processIsGone(wrapperPid!, false))).toBe(true);
        expect(waitFor(() => processIsGone(targetPid!, false))).toBe(true);
        expect(waitFor(() => processIsGone(descendantPid, false))).toBe(true);
      } finally {
        for (const [pid, group] of [[outer.pid, true], [wrapperPid, true]] as const) {
          if (pid === undefined) continue;
          try {
            process.kill(group ? -pid : pid, 'SIGKILL');
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ESRCH' && code !== 'EPERM') throw error;
          }
        }
      }
    }
  });

  it('requires an absolute persistent workspace and a carried state digest', () => {
    const workspace = resolve('package-smoke-test-workspace');
    expect(parsePackageSmokeInvocation([])).toEqual({ command: 'all' });
    expect(parsePackageSmokeInvocation([
      'prepare',
      '--workspace',
      workspace,
      '--node-executable',
      '/runtime/node',
      '--npm-executable',
      '/runtime/npm',
    ])).toEqual({
      command: 'prepare',
      workspace,
      nodeExecutable: '/runtime/node',
      npmExecutable: '/runtime/npm',
    });
    expect(parsePackageSmokeInvocation([
      'execute',
      '--workspace',
      workspace,
      '--expected-state-digest',
      `sha256:${'a'.repeat(64)}`,
    ])).toEqual({
      command: 'execute',
      workspace,
      expectedStateDigest: `sha256:${'a'.repeat(64)}`,
    });
    expect(() => parsePackageSmokeInvocation(['prepare', '--workspace', 'relative'])).toThrow(
      /absolute path/u,
    );
    expect(() => parsePackageSmokeInvocation(['prepare', '--workspace', workspace])).toThrow(
      /node-executable.*npm-executable/u,
    );
    expect(() => parsePackageSmokeInvocation(['execute', '--workspace', workspace])).toThrow(
      /expected-state-digest/u,
    );
    expect(() => parsePackageSmokeInvocation([
      'prepare',
      '--workspace',
      workspace,
      '--expected-state-digest',
      `sha256:${'a'.repeat(64)}`,
    ])).toThrow(/valid only during execute/u);
  });

  it('accepts only the reviewed exact registry lock with an unbound local artifact slot', () => {
    const fixture = fixtureValues();
    expect(() => validatePackageSmokeFixture(
      fixture.manifest,
      fixture.lock,
      fixture.packageJson,
    )).not.toThrow();

    const missingIntegrity = structuredClone(fixture.lock);
    delete missingIntegrity.packages['node_modules/react'].integrity;
    expect(() => validatePackageSmokeFixture(
      fixture.manifest,
      missingIntegrity,
      fixture.packageJson,
    )).toThrow(/integrity/u);

    const externalSource = structuredClone(fixture.lock);
    externalSource.packages['node_modules/react'].resolved =
      'git+https://example.invalid/react.git#0123456789abcdef';
    expect(() => validatePackageSmokeFixture(
      fixture.manifest,
      externalSource,
      fixture.packageJson,
    )).toThrow(/reviewed npm registry/u);

    const installScript = structuredClone(fixture.lock);
    installScript.packages['node_modules/react'].hasInstallScript = true;
    expect(() => validatePackageSmokeFixture(
      fixture.manifest,
      installScript,
      fixture.packageJson,
    )).toThrow(/unreviewed script/u);

    const traversalPath = structuredClone(fixture.lock);
    traversalPath.packages['node_modules/../react'] =
      traversalPath.packages['node_modules/react'];
    delete traversalPath.packages['node_modules/react'];
    expect(() => validatePackageSmokeFixture(
      fixture.manifest,
      traversalPath,
      fixture.packageJson,
    )).toThrow(/unsafe package path/u);

    const danglingEdge = structuredClone(fixture.lock);
    danglingEdge.packages['node_modules/react-dom'].dependencies.scheduler = '^999.0.0';
    delete danglingEdge.packages['node_modules/react-dom/node_modules/scheduler'];
    expect(() => validatePackageSmokeFixture(
      fixture.manifest,
      danglingEdge,
      fixture.packageJson,
    )).toThrow(/unresolved dependencies edge/u);

    const mutableLocalIntegrity = structuredClone(fixture.lock);
    mutableLocalIntegrity.packages['node_modules/cortexel'].integrity = `sha512-${'A'.repeat(86)}==`;
    expect(() => validatePackageSmokeFixture(
      fixture.manifest,
      mutableLocalIntegrity,
      fixture.packageJson,
    )).toThrow(/prepared state/u);

    const rangedTopLevel = structuredClone(fixture.manifest);
    rangedTopLevel.devDependencies.react = '^19';
    expect(() => validatePackageSmokeFixture(
      rangedTopLevel,
      fixture.lock,
      fixture.packageJson,
    )).toThrow(/exact reviewed versions/u);
  });

  it('seals bytes and topology and rejects an escaping symlink', () => {
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-package-seal-test-')));
    cleanups.push(workspace);
    mkdirSync(join(workspace, 'consumer'));
    writeFileSync(join(workspace, 'consumer', 'package.json'), '{"private":true}\n');
    symlinkSync('consumer/package.json', join(workspace, 'package-link'));

    const first = fingerprintPackageSmokeWorkspace(workspace);
    const second = fingerprintPackageSmokeWorkspace(workspace);
    expect(second).toEqual(first);
    writeFileSync(join(workspace, 'consumer', 'package.json'), '{"private":false}\n');
    expect(fingerprintPackageSmokeWorkspace(workspace).digest).not.toBe(first.digest);

    symlinkSync('/etc/passwd', join(workspace, 'external-link'));
    expect(() => fingerprintPackageSmokeWorkspace(workspace)).toThrow(/escapes its root/u);
    rmSync(join(workspace, 'external-link'));
    const oversized = join(workspace, 'oversized-sparse-file');
    writeFileSync(oversized, '');
    truncateSync(oversized, 128 * 1024 * 1024 + 1);
    expect(() => fingerprintPackageSmokeWorkspace(workspace)).toThrow(/per-file byte budget/u);
  });

  it('bounds directory allocation and closes each installed top-level package inventory', () => {
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-package-inventory-')));
    cleanups.push(workspace);
    const bounded = join(workspace, 'bounded');
    mkdirSync(bounded);
    for (const name of ['a', 'b', 'c']) writeFileSync(join(bounded, name), name);
    expect(() => readDirectoryNamesBounded(bounded, 'test directory', 2)).toThrow(
      /child-entry budget/u,
    );

    const consumer = join(workspace, 'consumer');
    const nodeModules = join(consumer, 'node_modules');
    mkdirSync(join(nodeModules, '.bin'), { recursive: true });
    const cortexelCli = join(nodeModules, 'cortexel', 'dist', 'cli', 'main.js');
    mkdirSync(join(nodeModules, 'cortexel', 'dist', 'cli'), { recursive: true });
    writeFileSync(cortexelCli, '#!/usr/bin/env node\n', { mode: 0o755 });
    chmodSync(cortexelCli, 0o755);
    symlinkSync('../cortexel/dist/cli/main.js', join(nodeModules, '.bin', 'cortexel'));
    mkdirSync(join(nodeModules, '@types', 'node'), { recursive: true });
    writeFileSync(join(nodeModules, '.package-lock.json'), '{}\n');
    expect(() => assertInstalledTopLevelPackageInventory(
      consumer,
      ['@types/node', 'cortexel'],
      { cortexel: cortexelCli },
    )).not.toThrow();
    writeFileSync(join(nodeModules, '.package-lock.json'), Buffer.from([0xff]));
    expect(() => assertInstalledTopLevelPackageInventory(
      consumer,
      ['@types/node', 'cortexel'],
      { cortexel: cortexelCli },
    )).toThrow(/well-formed UTF-8/u);
    writeFileSync(
      join(nodeModules, '.package-lock.json'),
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{}\n')]),
    );
    expect(() => assertInstalledTopLevelPackageInventory(
      consumer,
      ['@types/node', 'cortexel'],
      { cortexel: cortexelCli },
    )).toThrow(/strict JSON/u);
    writeFileSync(join(nodeModules, '.package-lock.json'), '{}\n');
    symlinkSync('../cortexel/dist/cli/main.js', join(nodeModules, '.bin', 'evil'));
    expect(() => assertInstalledTopLevelPackageInventory(
      consumer,
      ['@types/node', 'cortexel'],
      { cortexel: cortexelCli },
    )).toThrow(/\.bin inventory differs/u);
    rmSync(join(nodeModules, '.bin', 'evil'));
    mkdirSync(join(nodeModules, 'unreviewed'));
    expect(() => assertInstalledTopLevelPackageInventory(
      consumer,
      ['@types/node', 'cortexel'],
      { cortexel: cortexelCli },
    )).toThrow(/inventory differs/u);
  });

  it('derives and closes every recursive package-management path from the omit-filtered lock', () => {
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-recursive-inventory-')));
    cleanups.push(workspace);
    const consumer = join(workspace, 'consumer');
    const nodeModules = join(consumer, 'node_modules');
    const records = {
      'node_modules/cortexel': {
        version: '1.0.0',
        bin: { cortexel: 'dist/cli/main.js' },
      },
      'node_modules/cortexel/node_modules/zod': { version: '4.0.0' },
      'node_modules/cortexel/node_modules/@scope/safe': { version: '2.0.0' },
      'node_modules/cortexel/node_modules/optional-child': {
        version: '3.0.0',
        optional: true,
      },
      'node_modules/@omitted/pkg': {
        version: '1.0.0',
        optional: true,
      },
      'node_modules/typescript': {
        version: '5.0.0',
        dev: true,
        bin: { tsc: 'bin/tsc' },
      },
    };
    const preparedLock = {
      name: 'recursive-fixture',
      version: '1.0.0',
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': { name: 'recursive-fixture', version: '1.0.0' },
        ...records,
      },
    };
    const includedRecords = Object.fromEntries(Object.entries(records).filter(([, record]) =>
      !('dev' in record && record.dev === true) &&
      !('optional' in record && record.optional === true)));
    const hiddenLock = {
      name: preparedLock.name,
      version: preparedLock.version,
      lockfileVersion: preparedLock.lockfileVersion,
      requires: preparedLock.requires,
      packages: includedRecords,
    };
    const writeManifest = (relativePath: string, name: string, version: string): void => {
      const packageRoot = join(consumer, ...relativePath.split('/'));
      mkdirSync(packageRoot, { recursive: true });
      writeFileSync(join(packageRoot, 'package.json'), `${JSON.stringify({ name, version })}\n`);
    };
    writeManifest('node_modules/cortexel', 'cortexel', '1.0.0');
    writeManifest('node_modules/cortexel/node_modules/zod', 'zod', '4.0.0');
    writeManifest('node_modules/cortexel/node_modules/@scope/safe', '@scope/safe', '2.0.0');
    const cli = join(nodeModules, 'cortexel', 'dist', 'cli', 'main.js');
    mkdirSync(join(nodeModules, 'cortexel', 'dist', 'cli'), { recursive: true });
    writeFileSync(cli, '#!/usr/bin/env node\n', { mode: 0o755 });
    chmodSync(cli, 0o755);
    mkdirSync(join(nodeModules, '.bin'));
    symlinkSync('../cortexel/dist/cli/main.js', join(nodeModules, '.bin', 'cortexel'));
    writeFileSync(join(nodeModules, '.package-lock.json'), `${JSON.stringify(hiddenLock)}\n`);

    const assertClosure = (): void => assertInstalledRecursivePackageClosure(
      consumer,
      preparedLock,
      ['dev', 'optional'],
      11,
    );
    expect(assertClosure).not.toThrow();

    const npm10ResidualScope = join(nodeModules, '@omitted');
    expect(() => assertInstalledRecursivePackageClosure(
      consumer,
      preparedLock,
      ['dev', 'optional'],
      10,
    )).toThrow(/package container inventory differs/u);
    mkdirSync(npm10ResidualScope);
    expect(assertClosure).toThrow(/package container inventory differs/u);
    expect(() => assertInstalledRecursivePackageClosure(
      consumer,
      preparedLock,
      ['dev', 'optional'],
      10,
    )).not.toThrow();
    rmSync(npm10ResidualScope, { recursive: true, force: true });

    const omittedPackage = join(nodeModules, 'cortexel', 'node_modules', 'optional-child');
    writeManifest(
      'node_modules/cortexel/node_modules/optional-child',
      'optional-child',
      '3.0.0',
    );
    expect(assertClosure).toThrow(/package container inventory differs/u);
    rmSync(omittedPackage, { recursive: true });

    const concealedNodeModules = join(nodeModules, 'cortexel', 'node_modules', 'zod', 'lib');
    mkdirSync(join(concealedNodeModules, 'node_modules', 'optional-child'), { recursive: true });
    expect(assertClosure).toThrow(/unexpected node_modules path/u);
    rmSync(concealedNodeModules, { recursive: true });

    const concealedBin = join(nodeModules, 'cortexel', 'node_modules', 'zod', '.bin');
    mkdirSync(concealedBin);
    expect(assertClosure).toThrow(/unexpected \.bin path/u);
    rmSync(concealedBin, { recursive: true, force: true });

    const concealedLock = join(
      nodeModules,
      'cortexel',
      'node_modules',
      'zod',
      '.package-lock.json',
    );
    writeFileSync(concealedLock, '{}\n');
    expect(assertClosure).toThrow(/unexpected hidden lock/u);
    rmSync(concealedLock);

    writeFileSync(join(nodeModules, '.package-lock.json'), `${JSON.stringify({
      ...hiddenLock,
      packages: records,
    })}\n`);
    expect(assertClosure).toThrow(/exact filtered prepared lock/u);
    writeFileSync(join(nodeModules, '.package-lock.json'), `${JSON.stringify(hiddenLock)}\n`);

    writeManifest(
      'node_modules/cortexel/node_modules/@scope/unreviewed',
      '@scope/unreviewed',
      '1.0.0',
    );
    expect(assertClosure).toThrow(/package scope inventory differs/u);
  });
});

describe('independent npm package tarball inspection', () => {
  const content = Buffer.from('artifact bytes\n');
  const expected = [testExpectedFile('safe.txt', content)];
  const npmFiles: PackedFile[] = expected.map(({ path, size, mode }) => ({ path, size, mode }));
  const inspect = (
    tarball: Buffer,
    files: readonly PackedFile[] = npmFiles,
    closure: readonly ExpectedPackageFile[] = expected,
  ) => inspectNpmPackageTarball(tarball, testPackedResult(tarball, files), closure);

  it('accepts one canonical gzip member containing the exact regular-file USTAR closure', () => {
    const tarball = gzipTestTar([{ path: 'safe.txt', content }]);
    expect(inspect(tarball)).toMatchObject({
      compressedBytes: tarball.byteLength,
      uncompressedBytes: 2048,
      fileBytes: content.byteLength,
      entryCount: 1,
    });
  });

  it('rejects malformed, optional, concatenated, truncated, or trailing gzip framing', () => {
    const tarball = gzipTestTar([{ path: 'safe.txt', content }]);
    const optionalFlag = Buffer.from(tarball);
    optionalFlag[3] = 0x04;
    expect(() => inspect(optionalFlag)).toThrow(/gzip optional|canonical npm portable profile/u);

    const nonportableHeader = Buffer.from(tarball);
    nonportableHeader[9] = 0x03;
    expect(() => inspect(nonportableHeader)).toThrow(/canonical npm portable profile/u);

    expect(() => inspect(Buffer.concat([tarball, tarball]))).toThrow(/concatenated|trailing/u);
    expect(() => inspect(Buffer.concat([tarball, Buffer.from([0])]))).toThrow(/trailing/u);
    expect(() => inspect(tarball.subarray(0, tarball.length - 1))).toThrow(
      /gzip|DEFLATE|trailing/u,
    );

    const badCrc = Buffer.from(tarball);
    badCrc[badCrc.length - 8] ^= 1;
    expect(() => inspect(badCrc)).toThrow(/CRC-32/u);

    const badSize = Buffer.from(tarball);
    badSize[badSize.length - 4] ^= 1;
    expect(() => inspect(badSize)).toThrow(/gzip size/u);
  });

  it('rejects bad header checksums, numeric encodings, padding, and end markers', () => {
    const tarball = gzipTestTar([{ path: 'safe.txt', content }]);
    const badChecksum = withRepackedTar(tarball, (tar) => {
      tar[0] ^= 1;
    });
    expect(() => inspect(badChecksum)).toThrow(/header checksum/u);

    const base256Size = withRepackedTar(tarball, (tar) => {
      tar[124] = 0x80;
      refreshTarChecksum(tar.subarray(0, 512));
    });
    expect(() => inspect(base256Size)).toThrow(/tar size.*canonical octal/u);
    const junkOctal = withRepackedTar(tarball, (tar) => {
      tar[124] = 0x38;
      refreshTarChecksum(tar.subarray(0, 512));
    });
    expect(() => inspect(junkOctal)).toThrow(/tar size.*canonical octal/u);
    const truncatedEntry = withRepackedTar(tarball, (tar) => {
      tar.write(octal(100_000, 10), 124, 12, 'ascii');
      refreshTarChecksum(tar.subarray(0, 512));
    });
    expect(() => inspect(truncatedEntry)).toThrow(/file is truncated/u);

    const nonportableMtime = withRepackedTar(tarball, (tar) => {
      tar.write(octal(0, 10), 136, 12, 'ascii');
      refreshTarChecksum(tar.subarray(0, 512));
    });
    expect(() => inspect(nonportableMtime)).toThrow(/mtime is not portable/u);

    const padded = gzipTestTar([{ path: 'safe.txt', content, paddingByte: 1 }]);
    expect(() => inspect(padded)).toThrow(/nonzero padding/u);
    expect(() => inspect(gzipTestTar([{ path: 'safe.txt', content }], 1))).toThrow(
      /end marker/u,
    );
    expect(() => inspect(gzipTestTar([{ path: 'safe.txt', content }], 3))).toThrow(
      /end marker|trailing/u,
    );
    const dataAfterEnd = Buffer.concat([
      testTar([{ path: 'safe.txt', content }]),
      Buffer.concat([Buffer.from([1]), Buffer.alloc(511)]),
    ]);
    expect(() => inspect(gzipCanonicalTar(dataAfterEnd))).toThrow(/end marker|trailing/u);
  });

  it('rejects traversal, ambiguous names, duplicates, prefix indirection, and extra files', () => {
    expect(() => inspect(gzipTestTar([{ path: '../safe.txt', content }]))).toThrow(
      /canonical package-relative path/u,
    );
    expect(() => inspect(gzipTestTar([
      { path: 'safe.txt', content },
      { path: 'safe.txt', content },
    ]))).toThrow(/duplicate semantic path/u);
    expect(() => inspect(gzipTestTar([{ path: 'safe.txt', content, prefix: 'alternate' }]))).toThrow(
      /path prefix/u,
    );
    expect(() => inspect(gzipTestTar([
      { path: 'safe.txt', content },
      { path: 'extra.txt', content: Buffer.from('extra') },
    ]))).toThrow(/npm pack inventory/u);

    const unterminatedName = withRepackedTar(
      gzipTestTar([{ path: 'safe.txt', content }]),
      (tar) => {
        tar.fill(0x61, 0, 100);
        refreshTarChecksum(tar.subarray(0, 512));
      },
    );
    expect(() => inspect(unterminatedName)).toThrow(/canonical terminator/u);

    const nonzeroNameSuffix = withRepackedTar(
      gzipTestTar([{ path: 'safe.txt', content }]),
      (tar) => {
        tar[18] = 1;
        refreshTarChecksum(tar.subarray(0, 512));
      },
    );
    expect(() => inspect(nonzeroNameSuffix)).toThrow(/nonzero suffix/u);
    expect(() => inspect(gzipTestTar([{ path: 'CON.txt', content }]))).toThrow(
      /canonical package-relative path/u,
    );

    const foldedExpected = [
      testExpectedFile('Safe.txt', content),
      testExpectedFile('safe.txt', content),
    ];
    const foldedNpm = foldedExpected.map(({ path, size, mode }) => ({ path, size, mode }));
    expect(() => inspect(
      gzipTestTar([{ path: 'Safe.txt', content }, { path: 'safe.txt', content }]),
      foldedNpm,
      foldedExpected,
    )).toThrow(/duplicate semantic path/u);
  });

  it('rejects PAX/GNU extensions, links, directories, devices, FIFOs, and special entries', () => {
    for (const type of ['\0', '1', '2', '3', '4', '5', '6', '7', 'x', 'g', 'L', 'K', 'S']) {
      expect(
        () => inspect(gzipTestTar([{ path: 'safe.txt', content, type }])),
        `tar type ${JSON.stringify(type)}`,
      ).toThrow(/non-regular or extension/u);
    }
  });

  it('binds paths, sizes, modes, and content digests to both inventories', () => {
    const canonicalTarball = gzipTestTar([{ path: 'safe.txt', content }]);
    expect(() => inspectNpmPackageTarball(
      canonicalTarball,
      { ...testPackedResult(canonicalTarball, npmFiles), filename: 'other.tgz' },
      expected,
    )).toThrow(/filename differs/u);

    const changed = Buffer.from('artifact bytez\n');
    expect(changed.byteLength).toBe(content.byteLength);
    expect(() => inspect(gzipTestTar([{ path: 'safe.txt', content: changed }]))).toThrow(
      /expected package content/u,
    );

    const wrongSize = [{ ...npmFiles[0]!, size: content.byteLength + 1 }];
    expect(() => inspect(gzipTestTar([{ path: 'safe.txt', content }]), wrongSize)).toThrow(
      /npm pack inventory differs/u,
    );
    const wrongDigest = [{ ...expected[0]!, digest: `sha256:${'0'.repeat(64)}` }];
    expect(() => inspect(gzipTestTar([{ path: 'safe.txt', content }]), npmFiles, wrongDigest)).toThrow(
      /expected package content/u,
    );

    const executableNpm = [{ ...npmFiles[0]!, mode: 0o755 }];
    const executableExpected = [{ ...expected[0]!, mode: 0o755 }];
    expect(() => inspect(
      gzipTestTar([{ path: 'safe.txt', content, mode: 0o755 }]),
      executableNpm,
      executableExpected,
    )).toThrow(/file mode is invalid/u);

    const cliPath = 'dist/cli/main.js';
    const cliExpected = [testExpectedFile(cliPath, content)];
    const cliNpm = cliExpected.map(({ path, size, mode }) => ({ path, size, mode }));
    expect(() => inspect(
      gzipTestTar([{ path: cliPath, content, mode: 0o644 }]),
      cliNpm,
      cliExpected,
    )).toThrow(/file mode is invalid/u);
  });

  it('binds the installed tar-owned closure and every special mode bit', () => {
    const installedRoot = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-installed-closure-')));
    cleanups.push(installedRoot);
    const file = join(installedRoot, 'safe.txt');
    writeFileSync(file, content, { mode: 0o644 });
    chmodSync(file, 0o644);
    expect(() => verifyInstalledPackageClosure(installedRoot, expected)).not.toThrow();

    writeFileSync(file, Buffer.from('artifact bytez\n'));
    expect(() => verifyInstalledPackageClosure(installedRoot, expected)).toThrow(/bytes differ/u);
    writeFileSync(file, content);

    const extra = join(installedRoot, 'extra.txt');
    writeFileSync(extra, 'extra');
    expect(() => verifyInstalledPackageClosure(installedRoot, expected)).toThrow(/unexpected file/u);
    rmSync(extra);

    const link = join(installedRoot, 'link.txt');
    symlinkSync('safe.txt', link);
    expect(() => verifyInstalledPackageClosure(installedRoot, expected)).toThrow(/contains a link/u);
    rmSync(link);

    if (process.platform !== 'win32') {
      expect(installedArtifactMode(0o100000 | 0o4644)).toBe(0o4644);
      chmodSync(file, 0o755);
      expect(() => verifyInstalledPackageClosure(installedRoot, expected)).toThrow(/mode differs/u);
      chmodSync(file, 0o644);
      chmodSync(file, 0o444);
      expect(() => verifyInstalledPackageClosure(
        installedRoot,
        expected,
        'finalized-read-only',
      )).not.toThrow();
      expect(() => verifyInstalledPackageClosure(installedRoot, expected)).toThrow(/mode differs/u);
      chmodSync(file, 0o644);
      writeFileSync(file, Buffer.from('artifact bytez\n'));
      chmodSync(file, 0o444);
      expect(() => verifyInstalledPackageClosure(
        installedRoot,
        expected,
        'finalized-read-only',
      )).toThrow(/bytes differ/u);
      chmodSync(file, 0o644);
      writeFileSync(file, content);
      chmodSync(file, 0o444);
      expect(() => verifyInstalledPackageClosure(
        installedRoot,
        expected,
        'finalized-read-only',
      )).not.toThrow();
      chmodSync(file, 0o644);
      expect(() => verifyInstalledPackageClosure(
        installedRoot,
        expected,
        'finalized-read-only',
      )).toThrow(/mode differs/u);

      const executableRoot = realpathSync(mkdtempSync(join(
        tmpdir(),
        'cortexel-finalized-executable-',
      )));
      cleanups.push(executableRoot);
      const executablePath = join(executableRoot, 'dist', 'cli', 'main.js');
      mkdirSync(join(executableRoot, 'dist', 'cli'), { recursive: true });
      writeFileSync(executablePath, content, { mode: 0o555 });
      chmodSync(executablePath, 0o555);
      const executableExpected = [testExpectedFile('dist/cli/main.js', content)];
      expect(() => verifyInstalledPackageClosure(
        executableRoot,
        executableExpected,
        'finalized-read-only',
      )).not.toThrow();
      expect(() => verifyInstalledPackageClosure(
        executableRoot,
        executableExpected,
      )).toThrow(/mode differs/u);
      chmodSync(executablePath, 0o455);
      expect(() => verifyInstalledPackageClosure(
        executableRoot,
        executableExpected,
        'finalized-read-only',
      )).toThrow(/mode differs/u);
    }
  });
});
