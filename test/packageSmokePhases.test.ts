import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertFinalizedHostFile,
  assertInstalledRecursivePackageClosure,
  assertInstalledTopLevelPackageInventory,
  closePackageSmokeStateFile,
  executePackageSmokeWorkspace,
  fingerprintNpmPackageTree,
  fingerprintPackageSmokeWorkspace,
  formatReviewedNodeCommandFailure,
  inspectNodeExecutableAuthority,
  inspectNpmPackageAuthority,
  inspectNpmPackageTarball,
  inspectPreparedStateFileAuthority,
  installedArtifactMode,
  packageSmokeEnvironment,
  NPM_AUTHORITY_LIMITS,
  PACKAGE_SMOKE_PHASE_SCHEMA,
  PACKAGE_SMOKE_PREPARED_SCHEMA,
  PACKAGE_SMOKE_STATE_FILENAME,
  parsePackageSmokeInvocation,
  publishPackageSmokeStateFile,
  readDirectoryNamesBounded,
  reservePackageSmokeStateFile,
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

interface LifecycleFifo {
  readonly path: string;
  readonly reader: number;
  readonly marker: string;
  readonly prefetched: Buffer[];
}

function createLifecycleFifo(
  workspace: string,
  name: string,
  marker: string,
): LifecycleFifo {
  const path = join(workspace, `${name}.fifo`);
  const made = spawnSync('mkfifo', ['-m', '600', path], { encoding: 'utf8' });
  if (made.status !== 0 || made.signal !== null) {
    throw new Error(`mkfifo failed: ${made.stderr.trim()}`);
  }
  return {
    path,
    reader: openSync(path, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK),
    marker,
    prefetched: [],
  };
}

function expectLifecycleFifoOpen(fifo: LifecycleFifo): void {
  const buffer = Buffer.alloc(256);
  while (true) {
    try {
      const count = readSync(fifo.reader, buffer, 0, buffer.length, null);
      if (count === 0) {
        throw new Error('lifecycle FIFO had no live writer at the negative-control observation');
      }
      fifo.prefetched.push(Buffer.from(buffer.subarray(0, count)));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EAGAIN' || code === 'EWOULDBLOCK') return;
      throw error;
    }
  }
}

function expectLifecycleFifoClosed(fifo: LifecycleFifo, timeoutMs = 3_000): void {
  const deadline = Date.now() + timeoutMs;
  const chunks: Buffer[] = fifo.prefetched.splice(0);
  const buffer = Buffer.alloc(256);
  try {
    while (Date.now() < deadline) {
      try {
        const count = readSync(fifo.reader, buffer, 0, buffer.length, null);
        if (count === 0) {
          expect(Buffer.concat(chunks).toString('utf8')).toBe(fifo.marker);
          return;
        }
        chunks.push(Buffer.from(buffer.subarray(0, count)));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'EAGAIN' && code !== 'EWOULDBLOCK') throw error;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
    throw new Error('lifecycle FIFO retained a writer beyond its cleanup deadline');
  } finally {
    closeSync(fifo.reader);
  }
}

function lifecycleWriterProgram(fifo: LifecycleFifo, lifetimeMs = 15_000): string {
  return `const lifecycleFs = require('node:fs');
    const lifecycleFd = lifecycleFs.openSync(${JSON.stringify(fifo.path)}, 'w');
    lifecycleFs.writeSync(lifecycleFd, ${JSON.stringify(fifo.marker)});
    lifecycleFs.writeFileSync(${JSON.stringify(`${fifo.path}.ready`)}, 'ready\\n', {
      flag: 'wx',
      mode: 0o600,
    });
    setTimeout(() => process.exit(71), ${lifetimeMs});`;
}

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

function fakeRuntimeAuthorityTree(): {
  readonly workspace: string;
  readonly node: string;
  readonly npmRoot: string;
  readonly npmCli: string;
  readonly npmTarget: string;
} {
  const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-runtime-authority-')));
  cleanups.push(workspace);
  const node = join(workspace, 'node');
  writeFileSync(node, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  chmodSync(node, 0o755);
  const npmRoot = join(workspace, 'npm');
  const npmCli = join(npmRoot, 'bin', 'npm-cli.js');
  const npmTarget = join(npmRoot, 'node_modules', 'tool', 'bin.js');
  mkdirSync(dirname(npmCli), { recursive: true });
  mkdirSync(dirname(npmTarget), { recursive: true });
  mkdirSync(join(npmRoot, 'node_modules', '.bin'));
  writeFileSync(
    join(npmRoot, 'package.json'),
    `${JSON.stringify({
      name: 'npm',
      version: '11.0.0',
      bin: { npm: 'bin/npm-cli.js', npx: 'bin/npx-cli.js' },
    })}\n`,
    { mode: 0o644 },
  );
  writeFileSync(npmCli, '#!/usr/bin/env node\n', { mode: 0o755 });
  chmodSync(npmCli, 0o755);
  writeFileSync(npmTarget, 'module.exports=1\n', { mode: 0o644 });
  symlinkSync('../tool/bin.js', join(npmRoot, 'node_modules', '.bin', 'tool'));
  return { workspace, node, npmRoot, npmCli, npmTarget };
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
  it('publishes only the fresh v2 state and phase identities', () => {
    expect(PACKAGE_SMOKE_PREPARED_SCHEMA).toBe('cortexel-package-smoke-prepared.v2');
    expect(PACKAGE_SMOKE_PHASE_SCHEMA).toBe('cortexel-package-smoke-phase.v2');
    expect(PACKAGE_SMOKE_STATE_FILENAME).toBe('package-smoke-state.v2.json');

    if (process.platform === 'win32') return;
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-v1-state-rejection-')));
    cleanups.push(workspace);
    const staleState = '{"schema":"cortexel-package-smoke-prepared.v1"}\n';
    writeFileSync(join(workspace, PACKAGE_SMOKE_STATE_FILENAME), staleState, { mode: 0o444 });
    const expectedStateDigest = `sha256:${createHash('sha256').update(staleState).digest('hex')}`;
    expect(() => executePackageSmokeWorkspace({ workspace, expectedStateDigest })).toThrow(
      /prepared package-smoke state/u,
    );
  });

  it('binds Node bytes and exact npm manifest, CLI, topology, metadata, and bytes', () => {
    if (process.platform === 'win32') return;
    const fixture = fakeRuntimeAuthorityTree();
    const firstNode = inspectNodeExecutableAuthority(fixture.node);
    const firstNpm = inspectNpmPackageAuthority(fixture.npmCli);
    expect(firstNode.file.sha256).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(firstNpm).toMatchObject({
      root: fixture.npmRoot,
      cli: fixture.npmCli,
      version: '11.0.0',
      tree: {
        schema: 'cortexel-package-smoke-npm-tree.v1',
        directoryCount: 5,
        fileCount: 3,
        symlinkCount: 1,
      },
    });

    writeFileSync(fixture.npmTarget, 'module.exports=2\n', { mode: 0o644 });
    const changedNpm = inspectNpmPackageAuthority(fixture.npmCli);
    expect(changedNpm.tree.sha256).not.toBe(firstNpm.tree.sha256);

    const originalNode = readFileSync(fixture.node);
    // Keep the first inode live so filesystems that immediately recycle an
    // unlinked inode cannot make the replacement look path-identical.
    renameSync(fixture.node, `${fixture.node}.retired`);
    writeFileSync(fixture.node, originalNode, { mode: 0o755 });
    chmodSync(fixture.node, 0o755);
    const replacedNode = inspectNodeExecutableAuthority(fixture.node);
    expect(replacedNode.file.sha256).toBe(firstNode.file.sha256);
    expect(replacedNode.file.inode).not.toBe(firstNode.file.inode);

    const launchMarker = join(fixture.workspace, 'stale-runtime-launched');
    writeFileSync(
      fixture.node,
      `#!/bin/sh\ntouch ${JSON.stringify(launchMarker)}\n`,
      { mode: 0o755 },
    );
    chmodSync(fixture.node, 0o755);
    expect(() => runReviewedNodeCommand(
      fixture.node,
      [],
      fixture.workspace,
      {
        environment: packageSmokeEnvironment(fixture.node, fixture.workspace, {}),
        nodeAuthority: firstNode,
        timeoutMs: 1_000,
        outputLimitBytes: 1_024,
      },
    )).toThrow(/pre-command Node executable authority changed/u);
    expect(existsSync(launchMarker)).toBe(false);

    const manifestPath = join(fixture.npmRoot, 'package.json');
    writeFileSync(
      manifestPath,
      `${JSON.stringify({ name: 'npm', version: '11.0.0', bin: { npm: 'bin/other.js' } })}\n`,
    );
    expect(() => inspectNpmPackageAuthority(fixture.npmCli)).toThrow(/manifest.*CLI identity/u);
  });

  it('rejects npm hard links, unsafe symlinks, writable authority, and resource overflow', () => {
    if (process.platform === 'win32') return;
    const hardLinkFixture = fakeRuntimeAuthorityTree();
    linkSync(
      hardLinkFixture.npmTarget,
      join(hardLinkFixture.npmRoot, 'node_modules', 'tool', 'hard-link.js'),
    );
    expect(() => fingerprintNpmPackageTree(hardLinkFixture.npmRoot)).toThrow(/unique real regular|hard-linked/u);

    const escapeFixture = fakeRuntimeAuthorityTree();
    symlinkSync(
      escapeFixture.node,
      join(escapeFixture.npmRoot, 'node_modules', '.bin', 'escape'),
    );
    expect(() => fingerprintNpmPackageTree(escapeFixture.npmRoot)).toThrow(/symlink.*unsafe|escapes/u);

    const chainFixture = fakeRuntimeAuthorityTree();
    symlinkSync(
      'tool',
      join(chainFixture.npmRoot, 'node_modules', '.bin', 'chain'),
    );
    expect(() => fingerprintNpmPackageTree(chainFixture.npmRoot)).toThrow(/directly target/u);

    const writableFixture = fakeRuntimeAuthorityTree();
    chmodSync(writableFixture.npmTarget, 0o666);
    expect(() => fingerprintNpmPackageTree(writableFixture.npmRoot)).toThrow(
      /group\/world-write/u,
    );

    const budgetFixture = fakeRuntimeAuthorityTree();
    expect(() => fingerprintNpmPackageTree(budgetFixture.npmRoot, {
      ...NPM_AUTHORITY_LIMITS,
      entries: 2,
    })).toThrow(/entry budget/u);

    const depthFixture = fakeRuntimeAuthorityTree();
    const ancestryDepth = (path: string): number => {
      let count = 0;
      let cursor = dirname(path);
      while (true) {
        count++;
        const parent = dirname(cursor);
        if (parent === cursor) return count;
        cursor = parent;
      }
    };
    let exactDirectory = depthFixture.workspace;
    while (ancestryDepth(join(exactDirectory, 'node')) < NPM_AUTHORITY_LIMITS.depth) {
      exactDirectory = join(exactDirectory, 'd');
      mkdirSync(exactDirectory);
    }
    const exactDepthNode = join(exactDirectory, 'node');
    writeFileSync(exactDepthNode, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    chmodSync(exactDepthNode, 0o755);
    expect(inspectNodeExecutableAuthority(exactDepthNode).ancestry.entryCount)
      .toBe(NPM_AUTHORITY_LIMITS.depth);
    const overDepthDirectory = join(exactDirectory, 'd');
    mkdirSync(overDepthDirectory);
    const overDepthNode = join(overDepthDirectory, 'node');
    writeFileSync(overDepthNode, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    chmodSync(overDepthNode, 0o755);
    expect(() => inspectNodeExecutableAuthority(overDepthNode)).toThrow(/ancestry exceeds/u);
  });

  it('authorizes runtime bytes before execute can launch Node', () => {
    const source = readFileSync(join(root, 'scripts', 'smoke-package.ts'), 'utf8');
    const executeReader = source.slice(
      source.indexOf('function readAndVerifyPreparedState('),
      source.indexOf('export function parsePackageSmokeInvocation('),
    );
    expect(executeReader.indexOf("assertPackageRuntimeAuthority(state.runtimeAuthority, 'pre-execute')"))
      .toBeGreaterThan(-1);
    expect(executeReader.indexOf("assertPackageRuntimeAuthority(state.runtimeAuthority, 'pre-execute')"))
      .toBeLessThan(executeReader.indexOf("executableVersion(canonicalNode, 'Node')"));
    const workspaceSealIndex = executeReader.indexOf(
      'fingerprintPackageSmokeWorkspace(workspace, true)',
    );
    expect(workspaceSealIndex).toBeGreaterThan(-1);
    expect(workspaceSealIndex)
      .toBeLessThan(executeReader.indexOf("executableVersion(canonicalNode, 'Node')"));
  });

  it('derives packaged NEST adapter probes from the shipped closed branch examples', () => {
    const source = readFileSync(join(root, 'scripts', 'smoke-package.ts'), 'utf8');
    const probe = source.slice(
      source.indexOf('const runtimeFigureContractProbe ='),
      source.indexOf('interface PackageSmokeContext'),
    );
    expect(probe).toContain("authoring.lookupSourceAdapter('nest-spike-recorder')");
    expect(probe).toContain('packagedNestSource.examples[branch]');
    expect(probe).toContain("['positiveInfinity', 'finiteStop']");
    expect(probe).not.toMatch(/cortexel-nest-memory-spike-capture-authority\.v\d+/u);
    expect(probe).not.toContain('nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1');
  });

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

  it('bounds and terminal-escapes reviewed-command failure diagnostics', () => {
    const stdoutOnly = formatReviewedNodeCommandFailure('/reviewed/bin/node', {
      status: 2,
      signal: null,
      stdout: 'consumer.ts(1,1): type error\n\u001b[31mred\u001b[0m\u202ereordered',
      stderr: '',
    });
    expect(stdoutOnly).toContain('"status":2');
    expect(stdoutOnly).toContain('consumer.ts(1,1): type error');
    expect(stdoutOnly).toContain('\\u000a');
    expect(stdoutOnly).toContain('\\u001b');
    expect(stdoutOnly).toContain('\\u202e');
    expect(stdoutOnly).not.toContain('\u001b');
    expect(stdoutOnly).not.toContain('\u202e');

    const clipped = formatReviewedNodeCommandFailure(
      `/reviewed/${'\u2066'.repeat(2_000)}/node`,
      {
        status: -1,
        signal: 'SIGTERM',
        stdout: '🙂'.repeat(4_000),
        stderr: '\u0000'.repeat(4_000),
      },
    );
    expect(Buffer.byteLength(clipped)).toBeLessThanOrEqual(7_500);
    const detail = JSON.parse(clipped.slice(clipped.indexOf('{'))) as {
      commandTruncated: boolean;
      stdoutTruncated: boolean;
      stderrTruncated: boolean;
      signal: string;
    };
    expect(detail).toMatchObject({
      commandTruncated: true,
      stdoutTruncated: true,
      stderrTruncated: true,
      signal: 'SIGTERM',
    });
    expect(clipped).not.toContain('\u2066');
    expect(clipped).not.toContain('\u0000');
  });

  it('bounds reviewed Node commands and their descendant process group', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
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
    const nonTimeoutCommandTimeoutMs = 10_000;
    const intentionalTimeoutMs = 5_000;

    const successful = runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stdout.write("bounded-ok")'],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(successful).toMatchObject({
      status: 0,
      signal: null,
      stdout: 'bounded-ok',
      stderr: '',
      timedOut: false,
      outputOverflow: false,
    });
    expect(successful.guardianSweepIntentCount).toBe(1);

    // This completion deliberately exceeds the former one-second test assumption.
    // The production wall-clock timer remains authoritative; only this regression's
    // requested non-timeout budget is larger than scheduler startup noise.
    const delayedSuccessful = runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'setTimeout(() => process.stdout.write("delayed-ok"), 1_200)'],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(delayedSuccessful).toMatchObject({
      status: 0,
      signal: null,
      stdout: 'delayed-ok',
      stderr: '',
      timedOut: false,
      outputOverflow: false,
    });

    // The base64 protocol envelope is larger than the bounded raw output. This
    // crosses the ordinary 16 MiB JSON-file limit while remaining below the
    // command's advertised 16 MiB raw-output limit.
    const largeOutputBytes = 12 * 1024 * 1024;
    const largeOutput = runReviewedNodeCommand(
      reviewedNode,
      ['-e', `process.stdout.write('x'.repeat(${largeOutputBytes}))`],
      workspace,
      {
        environment,
        timeoutMs: nonTimeoutCommandTimeoutMs,
        outputLimitBytes: 16 * 1024 * 1024,
      },
    );
    expect(largeOutput.status).toBe(0);
    expect(largeOutput.signal).toBeNull();
    expect(largeOutput.timedOut).toBe(false);
    expect(largeOutput.outputOverflow).toBe(false);
    expect(largeOutput.stdout.length).toBe(largeOutputBytes);
    expect(largeOutput.guardianSweepIntentCount).toBe(1);

    const exactSplitOutput = runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        'process.stdout.write("o".repeat(512)); process.stderr.write("e".repeat(512));',
      ],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(exactSplitOutput).toMatchObject({
      status: 0,
      signal: null,
      stdout: 'o'.repeat(512),
      stderr: 'e'.repeat(512),
      timedOut: false,
      outputOverflow: false,
    });

    const nonzero = runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stderr.write("bounded-error"); process.exit(7)'],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(nonzero.status).toBe(7);
    expect(nonzero.signal).toBeNull();
    expect(nonzero.stderr).toBe('bounded-error');
    expect(nonzero.timedOut).toBe(false);
    expect(nonzero.outputOverflow).toBe(false);
    expect(successful.guardianSweepIntentCount).toBe(1);
    expect(nonzero.guardianSweepIntentCount).toBe(1);

    const exitWithChild = (exitCode: number, fifo: LifecycleFifo) => runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
         `const child = require('node:child_process').spawn(
           process.execPath,
           ['-e', ${JSON.stringify(`${lifecycleWriterProgram(fifo)}
             setInterval(() => {}, 1000);`)}],
           { stdio: 'ignore' },
         );
         while (!require('node:fs').existsSync(${JSON.stringify(`${fifo.path}.ready`)})) {
           Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
         }
         process.exit(${exitCode});`,
      ],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    const successChild = createLifecycleFifo(workspace, 'success-child', 'S');
    const nonzeroChild = createLifecycleFifo(workspace, 'nonzero-child', 'N');
    const successfulWithChild = exitWithChild(0, successChild);
    const nonzeroWithChild = exitWithChild(9, nonzeroChild);
    expect(successfulWithChild.status).toBe(0);
    expect(nonzeroWithChild.status).toBe(9);
    expect(successfulWithChild.timedOut).toBe(false);
    expect(nonzeroWithChild.timedOut).toBe(false);
    expect(successfulWithChild.outputOverflow).toBe(false);
    expect(nonzeroWithChild.outputOverflow).toBe(false);
    expect(successfulWithChild.guardianSweepIntentCount).toBe(1);
    expect(nonzeroWithChild.guardianSweepIntentCount).toBe(1);
    expectLifecycleFifoClosed(successChild);
    expectLifecycleFifoClosed(nonzeroChild);

    const signaledChild = createLifecycleFifo(workspace, 'signaled-child', 'G');
    const signaledWithChild = runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
         `const child = require('node:child_process').spawn(
           process.execPath,
           ['-e', ${JSON.stringify(`${lifecycleWriterProgram(signaledChild)}
             setInterval(() => {}, 1000);`)}],
           { stdio: 'ignore' },
         );
         while (!require('node:fs').existsSync(${JSON.stringify(`${signaledChild.path}.ready`)})) {
           Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
         }
         process.kill(process.pid, 'SIGTERM');`,
      ],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(signaledWithChild).toMatchObject({
      status: -1,
      signal: 'SIGTERM',
      timedOut: false,
      outputOverflow: false,
      guardianSweepIntentCount: 1,
    });
    expectLifecycleFifoClosed(signaledChild);

    const timeoutChild = createLifecycleFifo(workspace, 'timeout-child', 'T');
    const timedOut = runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        `const fs = require('node:fs');
         const child = require('node:child_process').spawn(
           process.execPath,
           ['-e', ${JSON.stringify(`${lifecycleWriterProgram(timeoutChild)}
             process.on("SIGTERM", () => {});
             setInterval(() => {}, 1000);`)}],
           { stdio: 'ignore' },
         );
         while (!fs.existsSync(${JSON.stringify(`${timeoutChild.path}.ready`)})) {
           Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
         }
         process.on('SIGTERM', () => {});
         setInterval(() => {}, 1000);`,
      ],
      workspace,
      { environment, timeoutMs: intentionalTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(timedOut.timedOut).toBe(true);
    expect(timedOut.outputOverflow).toBe(false);
    expect(timedOut.signal).toBe('SIGKILL');
    expect(timedOut.guardianSweepIntentCount).toBe(1);
    expectLifecycleFifoClosed(timeoutChild);

    const overflowChild = createLifecycleFifo(workspace, 'overflow-child', 'O');
    const overflow = runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        `const fs = require('node:fs');
         const child = require('node:child_process').spawn(
           process.execPath,
           ['-e', ${JSON.stringify(`${lifecycleWriterProgram(overflowChild)}
             setInterval(() => {}, 1000);`)}],
           { stdio: 'ignore' },
         );
         while (!fs.existsSync(${JSON.stringify(`${overflowChild.path}.ready`)})) {
           Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
         }
         process.stdout.write('x'.repeat(2048));
         setInterval(() => {}, 1000);`,
      ],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(overflow.timedOut).toBe(false);
    expect(overflow.outputOverflow).toBe(true);
    expect(overflow.signal).toBe('SIGKILL');
    expect(Buffer.byteLength(overflow.stdout)).toBe(1_024);
    expect(overflow.guardianSweepIntentCount).toBe(1);
    expectLifecycleFifoClosed(overflowChild);

    const stderrOverflow = runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stderr.write("e".repeat(2048)); setInterval(() => {}, 1000);'],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(stderrOverflow).toMatchObject({
      signal: 'SIGKILL',
      stdout: '',
      stderr: 'e'.repeat(1_024),
      timedOut: false,
      outputOverflow: true,
      guardianSweepIntentCount: 1,
    });

    const combinedOverflow = runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        'process.stdout.write("o".repeat(700)); process.stderr.write("e".repeat(700)); ' +
          'setInterval(() => {}, 1000);',
      ],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    );
    expect(combinedOverflow).toMatchObject({
      signal: 'SIGKILL',
      timedOut: false,
      outputOverflow: true,
      guardianSweepIntentCount: 1,
    });
    expect(Buffer.byteLength(combinedOverflow.stdout) + Buffer.byteLength(combinedOverflow.stderr))
      .toBe(1_024);

    const parentKillTarget = createLifecycleFifo(workspace, 'parent-kill-target', 'P');
    expect(() => runReviewedNodeCommand(
      reviewedNode,
      [
        '-e',
        `${lifecycleWriterProgram(parentKillTarget)}
         process.kill(process.ppid, 'SIGKILL');
         setInterval(() => {}, 1000);`,
      ],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    )).toThrow(/without a valid result/u);
    expectLifecycleFifoClosed(parentKillTarget);

    for (const result of [
      successful,
      delayedSuccessful,
      largeOutput,
      exactSplitOutput,
      nonzero,
      stderrOverflow,
      combinedOverflow,
    ]) {
      expect(result.guardianSweepIntentCount).toBe(1);
    }

    expect(() => runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stdout.write(Buffer.from([0xff]));'],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    )).toThrow(/well-formed UTF-8/u);
    expect(() => runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.exit(0)', 'nul\0argument'],
      workspace,
      { environment, timeoutMs: nonTimeoutCommandTimeoutMs, outputLimitBytes: 1_024 },
    )).toThrow(/argument 2/u);
    for (const reserved of [
      'CORTEXEL_PACKAGE_SMOKE_SUPERVISOR_PAYLOAD',
      'CORTEXEL_PACKAGE_SMOKE_GUARDIAN_PAYLOAD',
      'CORTEXEL_PACKAGE_SMOKE_WORKER_PAYLOAD',
      'CORTEXEL_PACKAGE_SMOKE_TRUSTED_COMMAND_TEST_HOOK',
    ]) {
      expect(() => runReviewedNodeCommand(
        reviewedNode,
        ['-e', 'process.exit(0)'],
        workspace,
        {
          environment: {
            ...environment,
            [reserved]: '{}',
          },
          timeoutMs: nonTimeoutCommandTimeoutMs,
          outputLimitBytes: 1_024,
        },
      )).toThrow(new RegExp(`reserved entry ${reserved}`, 'u'));
    }

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
      {
        environment: sentinelEnvironment,
        timeoutMs: nonTimeoutCommandTimeoutMs,
        outputLimitBytes: 1_024,
      },
    );
    expect(exactRuntime.timedOut).toBe(false);
    expect(exactRuntime.outputOverflow).toBe(false);
    expect(exactRuntime.guardianSweepIntentCount).toBe(1);
    expect(realpathSync(exactRuntime.stdout)).toBe(reviewedNode);
    expect(() => realpathSync(sentinelMarker)).toThrow();

    const loaderMarker = join(workspace, 'target-loader-pids');
    const loader = join(workspace, 'target-loader.cjs');
    writeFileSync(
      loader,
      `require('node:fs').appendFileSync(${JSON.stringify(loaderMarker)}, process.pid + '\\n');\n`,
      { mode: 0o444 },
    );
    chmodSync(loader, 0o444);
    const targetLoader = runReviewedNodeCommand(
      reviewedNode,
      ['-e', 'process.stdout.write(String(process.pid))'],
      workspace,
      {
        environment: {
          ...environment,
          NODE_OPTIONS: `--require=${loader}`,
        },
        timeoutMs: nonTimeoutCommandTimeoutMs,
        outputLimitBytes: 1_024,
      },
    );
    const loadedPids = readFileSync(loaderMarker, 'utf8').trimEnd().split('\n');
    expect(loadedPids).toEqual([targetLoader.stdout]);
    expect(Number.isSafeInteger(Number(targetLoader.stdout))).toBe(true);
  }, 60_000);

  it('does not re-address a reusable process-group id after a clean supervisor receipt', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], { encoding: 'utf8' });
    if (nodeProbe.status !== 0 || nodeProbe.signal !== null) {
      throw new Error('the clean-receipt regression requires Node');
    }
    const reviewedNode = realpathSync(nodeProbe.stdout.trim());
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-clean-pgid-')));
    cleanups.push(workspace);
    const environment = packageSmokeEnvironment(reviewedNode, workspace, {});
    const hostSignals: { pid: number; signal: string | number | undefined }[] = [];
    const killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      hostSignals.push({ pid, signal });
      throw new Error('the outer caller re-addressed a clean supervisor process group');
    });
    let result;
    try {
      result = runReviewedNodeCommand(
        reviewedNode,
        ['-e', 'process.stdout.write("clean-receipt")'],
        workspace,
        { environment, timeoutMs: 10_000, outputLimitBytes: 1_024 },
      );
    } finally {
      killSpy.mockRestore();
    }
    expect(hostSignals).toEqual([]);
    expect(result).toMatchObject({
      status: 0,
      signal: null,
      stdout: 'clean-receipt',
      timedOut: false,
      outputOverflow: false,
      guardianSweepIntentCount: 1,
    });
  }, 20_000);

  it('fails on bounded pipe drain when a deliberately detached descendant escapes', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], { encoding: 'utf8' });
    if (nodeProbe.status !== 0 || nodeProbe.signal !== null) {
      throw new Error('the detached-pipe regression requires Node');
    }
    const reviewedNode = realpathSync(nodeProbe.stdout.trim());
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-detached-pipe-')));
    cleanups.push(workspace);
    const detachedLifetime = createLifecycleFifo(workspace, 'detached-pipe-writer', 'D');
    const detachedProgram = `${lifecycleWriterProgram(detachedLifetime, 6_000)}
      setInterval(() => {}, 1000);`;
    const targetProgram = `
      const fs = require('node:fs');
      const detached = require('node:child_process').spawn(
        process.execPath,
        ['-e', ${JSON.stringify(detachedProgram)}],
        { detached: true, stdio: ['ignore', 'inherit', 'inherit'] },
      );
      detached.unref();
      while (!fs.existsSync(${JSON.stringify(`${detachedLifetime.path}.ready`)})) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      }
      process.exit(0);
    `;
    const hostSignals: { pid: number; signal: string | number | undefined }[] = [];
    const killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      hostSignals.push({ pid, signal });
      throw new Error('outer numeric process signalling is forbidden');
    });
    const startedAt = Date.now();
    try {
      expect(() => runReviewedNodeCommand(
        reviewedNode,
        ['-e', targetProgram],
        workspace,
        {
          environment: packageSmokeEnvironment(reviewedNode, workspace, {}),
          timeoutMs: 10_000,
          outputLimitBytes: 1_024,
        },
      )).toThrow(/pipes did not reach bounded EOF after exit/u);
    } finally {
      killSpy.mockRestore();
    }
    expect(Date.now() - startedAt).toBeLessThan(4_500);
    expect(hostSignals).toEqual([]);
    expectLifecycleFifoOpen(detachedLifetime);
    expectLifecycleFifoClosed(detachedLifetime, 8_000);
  }, 15_000);

  it('has exactly one explicit direct-property process-group signal site', () => {
    const supervisorSource = readFileSync(
      join(root, 'scripts', 'lib', 'reviewed-node-supervisor.ts'),
      'utf8',
    );
    const outerSource = readFileSync(join(root, 'scripts', 'smoke-package.ts'), 'utf8');
    expect(
      `${supervisorSource}\n${outerSource}`.match(/\.\s*kill\s*\(/gu) ?? [],
    ).toEqual(['.kill(']);
    expect(
      supervisorSource.match(
        /process\.kill\(-process\.pid, 'SIGKILL'\)/gu,
      ) ?? [],
    ).toEqual(["process.kill(-process.pid, 'SIGKILL')"]);
    expect(outerSource).not.toContain('process.kill(');
    expect(outerSource).not.toContain('processGroupId');
    expect(outerSource).not.toContain('publishedProcessGroup');
  });

  it('never adds an outer numeric fallback after abnormal supervisor completion', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], { encoding: 'utf8' });
    if (nodeProbe.status !== 0 || nodeProbe.signal !== null) {
      throw new Error('the abnormal-supervisor regression requires Node');
    }
    const reviewedNode = realpathSync(nodeProbe.stdout.trim());
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-no-pgid-fallback-')));
    cleanups.push(workspace);
    const targetLifetime = createLifecycleFifo(workspace, 'parent-kill', 'K');
    const hostSignals: { pid: number; signal: string | number | undefined }[] = [];
    const killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      hostSignals.push({ pid, signal });
      throw new Error('outer numeric process signalling is forbidden');
    });
    try {
      expect(() => runReviewedNodeCommand(
        reviewedNode,
        [
          '-e',
          `${lifecycleWriterProgram(targetLifetime)}
           process.kill(process.ppid, 'SIGKILL');
           setInterval(() => {}, 1000);`,
        ],
        workspace,
        {
          environment: packageSmokeEnvironment(reviewedNode, workspace, {}),
          timeoutMs: 10_000,
          outputLimitBytes: 1_024,
        },
      )).toThrow(/without a valid result/u);
    } finally {
      killSpy.mockRestore();
    }
    expect(hostSignals).toEqual([]);
    expectLifecycleFifoClosed(targetLifetime);
  }, 20_000);



  it('self-sweeps same-group lifetimes when TERM, INT, or HUP cancels the supervisor', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
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

    const waitFor = (predicate: () => boolean, timeoutMs = 4_000): boolean => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (predicate()) return true;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
      return predicate();
    };

    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
      const signalName = signal.toLowerCase();
      const targetLifetime = createLifecycleFifo(
        workspace,
        `${signalName}-target`,
        signalName[3] ?? 't',
      );
      const descendantLifetime = createLifecycleFifo(
        workspace,
        `${signalName}-descendant`,
        signalName[4] ?? 'd',
      );
      const runner = join(workspace, `${signalName}-runner.ts`);
      const descendantProgram = `${lifecycleWriterProgram(descendantLifetime)}
        setInterval(() => {}, 1000);`;
      const targetProgram = `
        ${lifecycleWriterProgram(targetLifetime)}
        require('node:child_process').spawn(
          process.execPath,
          ['-e', ${JSON.stringify(descendantProgram)}],
          { stdio: 'ignore' },
        );
        while (!require('node:fs').existsSync(
          ${JSON.stringify(`${descendantLifetime.path}.ready`)}
        )) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        }
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
      expect(waitFor(() =>
        existsSync(`${targetLifetime.path}.ready`) &&
        existsSync(`${descendantLifetime.path}.ready`))).toBe(true);

      // The test-owned detached runner is still the live leader of this exact
      // group at the rendezvous. This is the one intentional cancellation signal;
      // no PID/PGID is probed or re-addressed after it.
      process.kill(-outer.pid!, signal);
      expectLifecycleFifoClosed(targetLifetime, 5_000);
      expectLifecycleFifoClosed(descendantLifetime, 5_000);
    }
  }, 30_000);

  it('uses active lease EOF after supervisor SIGKILL and fails closed if the guardian dies', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    const bunProbe = spawnSync('bun', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    if (nodeProbe.status !== 0 || bunProbe.status !== 0) {
      throw new Error('the active lease regression requires exact Node and Bun executables');
    }
    const reviewedNode = realpathSync(nodeProbe.stdout.trim());
    const reviewedBun = realpathSync(bunProbe.stdout.trim());
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-active-lease-')));
    cleanups.push(workspace);
    const smokeModule = pathToFileURL(join(root, 'scripts', 'smoke-package.ts')).href;
    const waitFor = (predicate: () => boolean, timeoutMs = 6_000): boolean => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (predicate()) return true;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
      return predicate();
    };

    for (const victim of ['supervisor', 'guardian'] as const) {
      const targetLifetime = createLifecycleFifo(
        workspace,
        `${victim}-sigkill-target`,
        victim === 'supervisor' ? 'S' : 'G',
      );
      const readyPath = join(workspace, `${victim}-go-sent.json`);
      const outcomePath = join(workspace, `${victim}-outcome.json`);
      const runner = join(workspace, `${victim}-runner.ts`);
      writeFileSync(
        runner,
        `
          import { writeFileSync } from 'node:fs';
          import { runReviewedNodeCommand } from ${JSON.stringify(smokeModule)};
          try {
            runReviewedNodeCommand(
              ${JSON.stringify(reviewedNode)},
              ['-e', ${JSON.stringify(
                `${lifecycleWriterProgram(targetLifetime, 6_000)}
                 setInterval(() => {}, 1000);`,
              )}],
              ${JSON.stringify(workspace)},
              {
                environment: { PATH: '/usr/bin:/bin' },
                timeoutMs: 10_000,
                outputLimitBytes: 1_024,
                trustedTestHook: {
                  phase: 'go-sent',
                  readyPath: ${JSON.stringify(readyPath)},
                },
              },
            );
            writeFileSync(${JSON.stringify(outcomePath)}, '{"kind":"returned"}\\n', {
              flag: 'wx',
            });
          } catch (error) {
            writeFileSync(
              ${JSON.stringify(outcomePath)},
              JSON.stringify({
                kind: 'threw',
                message: error instanceof Error ? error.message : String(error),
              }) + '\\n',
              { flag: 'wx' },
            );
          }
        `,
      );
      const outer = spawn(reviewedBun, [runner], {
        cwd: root,
        detached: true,
        stdio: 'ignore',
      });
      outer.unref();
      expect(waitFor(() =>
        existsSync(readyPath) &&
        existsSync(`${targetLifetime.path}.ready`))).toBe(true);
      const ready = JSON.parse(readFileSync(readyPath, 'utf8')) as {
        guardianPid: number;
        phase: string;
        schema: string;
        supervisorPid: number;
      };
      expect(ready).toMatchObject({
        phase: 'go-sent',
        schema: 'cortexel-package-smoke-command-test-hook.v2',
      });
      const victimPid = victim === 'supervisor'
        ? ready.supervisorPid
        : ready.guardianPid;
      expect(Number.isSafeInteger(victimPid) && victimPid > 1).toBe(true);

      // Both identities come from a trusted rendezvous while the exact processes
      // and target are live. Signal once, then use protocol output and FIFO EOF;
      // never perform a postmortem PID/PGID probe or second signal.
      const signaledAt = Date.now();
      process.kill(victimPid, 'SIGKILL');
      expect(waitFor(() => existsSync(outcomePath), 4_500)).toBe(true);
      expect(Date.now() - signaledAt).toBeLessThan(4_500);
      const outcome = JSON.parse(readFileSync(outcomePath, 'utf8')) as {
        kind: string;
        message?: string;
      };
      expect(outcome.kind).toBe('threw');
      expect(outcome.message).toMatch(/without a valid result/u);

      if (victim === 'supervisor') {
        // Kernel EOF on the guardian's exclusive lease triggers the anchored
        // group sweep even though SIGKILL bypasses supervisor signal handlers.
        expectLifecycleFifoClosed(targetLifetime, 5_000);
      } else {
        // Killing the anchor itself is outside the pure-Node containment claim.
        // The supervisor returns after its bounded local pipe-drain failure, and
        // this deliberately finite fixture later closes itself.
        expectLifecycleFifoOpen(targetLifetime);
        expectLifecycleFifoClosed(targetLifetime, 8_000);
      }
    }
  }, 30_000);


  it('keeps GO gated across worker, guardian, and supervisor killpoints', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    const bunProbe = spawnSync('bun', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    if (nodeProbe.status !== 0 || bunProbe.status !== 0) {
      throw new Error('the killpoint regression requires exact Node and Bun executables');
    }
    const reviewedNode = realpathSync(nodeProbe.stdout.trim());
    const reviewedBun = realpathSync(bunProbe.stdout.trim());
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-guardian-killpoint-')));
    cleanups.push(workspace);
    const smokeModule = pathToFileURL(join(root, 'scripts', 'smoke-package.ts')).href;
    const waitFor = (predicate: () => boolean, timeoutMs = 6_000): boolean => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (predicate()) return true;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
      return predicate();
    };

    for (const scenario of [
      { phase: 'worker-ready-before-handshake', victim: 'worker' },
      { phase: 'handshake-published-before-go', victim: 'worker' },
      { phase: 'handshake-published-before-go', victim: 'guardian' },
      { phase: 'handshake-published-before-go', victim: 'supervisor' },
    ] as const) {
      const prefix = `${scenario.phase}-${scenario.victim}`;
      const readyPath = join(workspace, `${prefix}-ready.json`);
      const targetMarker = join(workspace, `${prefix}-target-ran`);
      const outcomePath = join(workspace, `${prefix}-outcome.json`);
      const runner = join(workspace, `${prefix}-runner.ts`);
      const targetProgram = `
        require('node:fs').writeFileSync(${JSON.stringify(targetMarker)}, 'ran\\n');
        setInterval(() => {}, 1000);
      `;
      writeFileSync(
        runner,
        `
          import { writeFileSync } from 'node:fs';
          import { runReviewedNodeCommand } from ${JSON.stringify(smokeModule)};
          try {
            runReviewedNodeCommand(
              ${JSON.stringify(reviewedNode)},
              ['-e', ${JSON.stringify(targetProgram)}],
              ${JSON.stringify(workspace)},
              {
                environment: { PATH: '/usr/bin:/bin' },
                timeoutMs: 10_000,
                outputLimitBytes: 1_024,
                trustedTestHook: {
                  phase: ${JSON.stringify(scenario.phase)},
                  readyPath: ${JSON.stringify(readyPath)},
                },
              },
            );
            writeFileSync(${JSON.stringify(outcomePath)}, '{"kind":"returned"}\\n', {
              flag: 'wx',
            });
          } catch (error) {
            writeFileSync(
              ${JSON.stringify(outcomePath)},
              JSON.stringify({
                kind: 'threw',
                message: error instanceof Error ? error.message : String(error),
              }) + '\\n',
              { flag: 'wx' },
            );
          }
        `,
      );
      const outer = spawn(reviewedBun, [runner], {
        cwd: root,
        detached: true,
        stdio: 'ignore',
      });
      outer.unref();
      expect(waitFor(() => existsSync(readyPath))).toBe(true);
      const ready = JSON.parse(readFileSync(readyPath, 'utf8')) as {
        guardianPid: number;
        phase: string;
        schema: string;
        supervisorPid: number;
        workerPid: number;
      };
      expect(ready).toMatchObject({
        phase: scenario.phase,
        schema: 'cortexel-package-smoke-command-test-hook.v2',
      });
      const victimPid = scenario.victim === 'worker'
        ? ready.workerPid
        : scenario.victim === 'guardian'
          ? ready.guardianPid
          : ready.supervisorPid;
      expect(Number.isSafeInteger(victimPid) && victimPid > 1).toBe(true);

      // The hook is emitted only while this exact direct child/guardian is live.
      // Signal once, then rely on protocol outcome—never a postmortem probe.
      process.kill(victimPid, 'SIGKILL');
      expect(waitFor(() => existsSync(outcomePath))).toBe(true);
      const outcome = JSON.parse(readFileSync(outcomePath, 'utf8')) as {
        kind: string;
        message?: string;
      };
      expect(outcome.kind).toBe('threw');
      expect(outcome.message).toMatch(/without a valid result/u);
      expect(existsSync(targetMarker)).toBe(false);
    }
  }, 30_000);

  it('does not signal after the guardian is reaped and before result publication', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const nodeProbe = spawnSync('node', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    const bunProbe = spawnSync('bun', ['--print', 'process.execPath'], {
      encoding: 'utf8',
    });
    if (nodeProbe.status !== 0 || bunProbe.status !== 0) {
      throw new Error('the post-reap regression requires exact Node and Bun executables');
    }
    const reviewedNode = realpathSync(nodeProbe.stdout.trim());
    const reviewedBun = realpathSync(bunProbe.stdout.trim());
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-post-reap-')));
    cleanups.push(workspace);
    const smokeModule = pathToFileURL(join(root, 'scripts', 'smoke-package.ts')).href;
    const readyPath = join(workspace, 'guardian-reaped-ready.json');
    const outcomePath = join(workspace, 'guardian-reaped-outcome.json');
    const targetMarker = join(workspace, 'guardian-reaped-target-ran');
    const runner = join(workspace, 'guardian-reaped-runner.ts');
    writeFileSync(
      runner,
      `
        import { writeFileSync } from 'node:fs';
        import { runReviewedNodeCommand } from ${JSON.stringify(smokeModule)};
        const hostSignals = [];
        const originalKill = process.kill;
        process.kill = ((pid, signal) => {
          hostSignals.push({ pid, signal });
          throw new Error('post-reap outer signal attempted');
        });
        try {
          runReviewedNodeCommand(
            ${JSON.stringify(reviewedNode)},
            ['-e', ${JSON.stringify(
              `require('node:fs').writeFileSync(${JSON.stringify(targetMarker)}, 'ran\\n');`,
            )}],
            ${JSON.stringify(workspace)},
            {
              environment: { PATH: '/usr/bin:/bin' },
              timeoutMs: 10_000,
              outputLimitBytes: 1_024,
              trustedTestHook: {
                phase: 'guardian-swept-before-result',
                readyPath: ${JSON.stringify(readyPath)},
              },
            },
          );
          writeFileSync(${JSON.stringify(outcomePath)}, JSON.stringify({
            hostSignals,
            kind: 'returned',
          }) + '\\n', { flag: 'wx' });
        } catch (error) {
          writeFileSync(${JSON.stringify(outcomePath)}, JSON.stringify({
            hostSignals,
            kind: 'threw',
            message: error instanceof Error ? error.message : String(error),
          }) + '\\n', { flag: 'wx' });
        } finally {
          process.kill = originalKill;
        }
      `,
    );
    const outer = spawn(reviewedBun, [runner], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
    });
    outer.unref();
    const waitFor = (predicate: () => boolean, timeoutMs = 6_000): boolean => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (predicate()) return true;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
      return predicate();
    };
    expect(waitFor(() => existsSync(readyPath))).toBe(true);
    const ready = JSON.parse(readFileSync(readyPath, 'utf8')) as {
      phase: string;
      schema: string;
      supervisorPid: number;
    };
    expect(ready).toMatchObject({
      phase: 'guardian-swept-before-result',
      schema: 'cortexel-package-smoke-command-test-hook.v2',
    });
    expect(Number.isSafeInteger(ready.supervisorPid) && ready.supervisorPid > 1).toBe(true);
    process.kill(ready.supervisorPid, 'SIGKILL');
    expect(waitFor(() => existsSync(outcomePath))).toBe(true);
    const outcome = JSON.parse(readFileSync(outcomePath, 'utf8')) as {
      hostSignals: unknown[];
      kind: string;
      message?: string;
    };
    expect(outcome.kind).toBe('threw');
    expect(outcome.message).toMatch(/without a valid result/u);
    expect(outcome.hostSignals).toEqual([]);
    expect(readFileSync(targetMarker, 'utf8')).toBe('ran\n');
  }, 20_000);

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

  it('binds the workspace root identity and every controlling parent directory', () => {
    if (process.platform === 'win32') return;
    const container = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-workspace-authority-')));
    cleanups.push(container);
    const parent = join(container, 'parent');
    const workspace = join(parent, 'workspace');
    mkdirSync(workspace, { recursive: true });
    writeFileSync(join(workspace, 'evidence'), 'stable\n');
    const first = fingerprintPackageSmokeWorkspace(workspace);
    expect(first.root.path).toBe(workspace);
    expect(first.root.inode).toMatch(/^(?:0|[1-9][0-9]*)$/u);
    expect(() => fingerprintPackageSmokeWorkspace(workspace, true)).toThrow(
      /finalized read-only mode/u,
    );
    chmodSync(workspace, 0o555);
    expect(fingerprintPackageSmokeWorkspace(workspace, true).root.mode).toBe(0o555);
    chmodSync(workspace, 0o755);

    const oldParent = join(container, 'old-parent');
    renameSync(parent, oldParent);
    mkdirSync(parent);
    renameSync(join(oldParent, 'workspace'), workspace);
    const reboundParent = fingerprintPackageSmokeWorkspace(workspace);
    expect(reboundParent.root.inode).toBe(first.root.inode);
    expect(reboundParent.parentAncestry.sha256).not.toBe(first.parentAncestry.sha256);
    expect(reboundParent.digest).not.toBe(first.digest);

    const replaced = join(parent, 'replacement');
    mkdirSync(replaced);
    writeFileSync(join(replaced, 'evidence'), 'stable\n');
    rmSync(workspace, { recursive: true });
    renameSync(replaced, workspace);
    const replacedRoot = fingerprintPackageSmokeWorkspace(workspace);
    expect(replacedRoot.root.inode).not.toBe(first.root.inode);
    expect(replacedRoot.digest).not.toBe(first.digest);
  });

  it('reserves the excluded state leaf before sealing and preserves root authority on publication', () => {
    if (process.platform === 'win32') return;
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'cortexel-state-reservation-')));
    cleanups.push(workspace);
    const evidence = join(workspace, 'evidence');
    writeFileSync(evidence, 'stable\n', { mode: 0o644 });
    const reservation = reservePackageSmokeStateFile(workspace);
    try {
      chmodSync(evidence, 0o444);
      chmodSync(join(workspace, PACKAGE_SMOKE_STATE_FILENAME), 0o444);
      chmodSync(workspace, 0o555);
      const before = fingerprintPackageSmokeWorkspace(workspace, true);
      const raw = publishPackageSmokeStateFile(reservation, {
        schema: PACKAGE_SMOKE_PREPARED_SCHEMA,
        proof: 'excluded-state-publication',
      });
      const after = fingerprintPackageSmokeWorkspace(workspace, true);
      expect(after).toEqual(before);
      expect(after.root.linkCount).toBe(before.root.linkCount);
      expect(lstatSync(join(workspace, PACKAGE_SMOKE_STATE_FILENAME)).mode & 0o7777)
        .toBe(0o444);
      expect(readFileSync(join(workspace, PACKAGE_SMOKE_STATE_FILENAME), 'utf8')).toBe(raw);
      const digest = `sha256:${createHash('sha256').update(raw).digest('hex')}`;
      const authority = inspectPreparedStateFileAuthority(workspace, digest);
      expect(authority).toMatchObject({ mode: 0o444, sha256: digest });
      chmodSync(join(workspace, PACKAGE_SMOKE_STATE_FILENAME), 0o400);
      expect(() => inspectPreparedStateFileAuthority(workspace, digest)).toThrow(
        /exact 0444 workspace-owner authority/u,
      );
      chmodSync(join(workspace, PACKAGE_SMOKE_STATE_FILENAME), 0o444);
    } finally {
      closePackageSmokeStateFile(reservation);
      chmodSync(workspace, 0o755);
    }
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
