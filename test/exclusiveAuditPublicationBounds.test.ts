import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const MODULE_PATH = path.join(
  ROOT,
  'scripts',
  'lib',
  'exclusive-audit-publication.ts',
);

interface BoundFixtureResult {
  readonly finalEntries: readonly string[];
  readonly loaderTemporaryDirectory: string;
  readonly message: string;
  readonly mutationCalls: readonly string[];
  readonly requestedPathCodeUnits: number;
}

function runBoundFixture(mode: string): BoundFixtureResult {
  const fixture = realpathSync(
    mkdtempSync(path.join(tmpdir(), 'cortexel-publication-bound-')),
  );
  const loaderTemporaryDirectory = path.join(fixture, 'loader-temp');
  mkdirSync(loaderTemporaryDirectory, { mode: 0o700 });
  const script = path.join(fixture, 'fixture.mjs');
  try {
    writeFileSync(script, String.raw`
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      import { tmpdir } from 'node:os';
      import path from 'node:path';
      import { pathToFileURL } from 'node:url';

      const [mode, fixture, modulePath] = process.argv.slice(2);
      const target = path.join(fixture, 'result.json');
      const originalCwd = process.cwd;
      const originalOpen = fs.openSync;
      const originalLink = fs.linkSync;
      const originalRealpath = fs.realpathSync;
      const originalUnlink = fs.unlinkSync;
      const originalJoin = path.join;
      const mutationCalls = [];
      let requestedPath = target;

      fs.openSync = (filename, flags, ...rest) => {
        if (
          typeof filename === 'string' &&
          ((filename.startsWith(fixture + path.sep) &&
            (filename === target || filename.includes('.cortexel-'))) ||
            filename.length > 4_096)
        ) {
          mutationCalls.push('open:' + filename);
        }
        return originalOpen(filename, flags, ...rest);
      };
      fs.linkSync = (source, destination) => {
        if (destination === target) mutationCalls.push('link:' + destination);
        return originalLink(source, destination);
      };
      fs.unlinkSync = (filename) => {
        if (
          typeof filename === 'string' &&
          (filename === target ||
            (filename.startsWith(fixture + path.sep) && filename.includes('.cortexel-')))
        ) {
          mutationCalls.push('unlink:' + filename);
        }
        return originalUnlink(filename);
      };

      if (mode === 'target-code-units') {
        process.cwd = () => '/' + 'a'.repeat(4_096);
        requestedPath = 'r.json';
      } else if (mode === 'target-utf8') {
        process.cwd = () => '/' + 'é'.repeat(2_050);
        requestedPath = 'r.json';
      } else if (mode === 'parent-code-units') {
        fs.realpathSync = (filename, ...args) =>
          filename === fixture
            ? '/' + 'a'.repeat(4_096)
            : originalRealpath(filename, ...args);
      } else if (mode === 'parent-utf8') {
        fs.realpathSync = (filename, ...args) =>
          filename === fixture
            ? '/' + 'é'.repeat(2_050)
            : originalRealpath(filename, ...args);
      } else if (mode === 'staged') {
        path.join = (...parts) => {
          const joined = originalJoin(...parts);
          return parts.some((part) =>
            typeof part === 'string' && part.includes('.cortexel-'))
            ? '/' + 's'.repeat(4_096)
            : joined;
        };
      } else {
        throw new Error('unknown bound fixture mode');
      }

      syncBuiltinESMExports();
      const { publishNewExclusiveAuditFile } = await import(
        pathToFileURL(modulePath).href + '?bound=' + mode + '-' + Date.now()
      );
      let message = '';
      try {
        publishNewExclusiveAuditFile(requestedPath, '{}');
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      } finally {
        process.cwd = originalCwd;
        path.join = originalJoin;
      }
      if (!message) throw new Error('over-bound publication path was accepted');
      process.stdout.write(JSON.stringify({
        finalEntries: fs.readdirSync(fixture).sort(),
        loaderTemporaryDirectory: tmpdir(),
        message,
        mutationCalls,
        requestedPathCodeUnits: requestedPath.length,
      }));
    `, 'utf8');
    const result = spawnSync(
      'node',
      ['--import', 'tsx', script, mode, fixture, MODULE_PATH],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: {
          LANG: 'C',
          LC_ALL: 'C',
          PATH: process.env.PATH,
          // The tsx loader performs a temporary case-sensitivity probe before
          // this fixture module runs. Keep that loader-owned I/O inside the
          // fixture's already-authorized private directory so sealed sandboxes
          // need not grant ambient /tmp write authority.
          TEMP: loaderTemporaryDirectory,
          TMP: loaderTemporaryDirectory,
          TMPDIR: loaderTemporaryDirectory,
        },
        maxBuffer: 64 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
        // A sealed full-suite run can briefly saturate process startup while the
        // package/runtime smoke tests execute in neighboring workers. The fixture
        // itself is synchronous and bounded; allow startup headroom without making
        // a hung child unbounded.
        timeout: 30_000,
      },
    );
    if (result.error !== undefined) {
      throw new Error(
        `publication-bound fixture spawn failed: ${JSON.stringify({
          code:
            'code' in result.error && typeof result.error.code === 'string'
              ? result.error.code
              : null,
          message: result.error.message.slice(0, 512),
          name: result.error.name,
        })}`,
      );
    }
    if (result.status !== 0) {
      // Keep child output on one JSON-escaped line. Passing raw stderr as an
      // assertion annotation lets stack-like or non-UTF-8 child diagnostics enter
      // Vitest's source-map parser, obscuring the actual fixture failure.
      throw new Error(
        `publication-bound fixture exited unsuccessfully: ${JSON.stringify({
          signal: result.signal,
          status: result.status,
          stderr: result.stderr.slice(0, 2_048),
        })}`,
      );
    }
    const parsed = JSON.parse(result.stdout) as BoundFixtureResult;
    expect(parsed.loaderTemporaryDirectory).toBe(loaderTemporaryDirectory);
    return parsed;
  } finally {
    rmSync(fixture, { force: true, recursive: true });
  }
}

describe('exclusive audit publication resolved-path bounds', () => {
  it('rejects a short relative name expanded by a long cwd before mutation', () => {
    for (const mode of ['target-code-units', 'target-utf8']) {
      const result = runBoundFixture(mode);
      expect(result.requestedPathCodeUnits).toBe('r.json'.length);
      expect(result.message).toMatch(/resolved audit output target exceeds/u);
      expect(result.mutationCalls).toEqual([]);
      expect(result.finalEntries).toEqual(['fixture.mjs', 'loader-temp']);
    }
  });

  it('rejects an over-bound canonical parent before mutation', () => {
    for (const mode of ['parent-code-units', 'parent-utf8']) {
      const result = runBoundFixture(mode);
      expect(result.message).toMatch(/canonical audit output parent exceeds/u);
      expect(result.mutationCalls).toEqual([]);
      expect(result.finalEntries).toEqual(['fixture.mjs', 'loader-temp']);
    }
  });

  it('rejects an over-bound constructed staging path before mutation', () => {
    const result = runBoundFixture('staged');
    expect(result.message).toMatch(/resolved audit staging path exceeds/u);
    expect(result.mutationCalls).toEqual([]);
    expect(result.finalEntries).toEqual(['fixture.mjs', 'loader-temp']);
  });
});
