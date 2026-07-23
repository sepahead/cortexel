/**
 * Generated-file freshness gate.
 *
 * Generation happens only inside an isolated temporary copy. A check must never
 * rewrite the caller's worktree before announcing that it was stale: doing so destroys
 * the very evidence a developer needs to review and races every concurrent editor.
 *
 * Two independent temporary copies deliberately omit all existing generated outputs.
 * Comparing their generated snapshots tests determinism without letting pass one seed
 * the other; comparing the first against the untouched worktree proves freshness and
 * detects obsolete extra generated files as well as missing/changed ones.
 */

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  lstatSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  generatedSnapshotDifferences,
  isTransientGeneratedPath,
  snapshotGeneratedPaths,
} from './lib/generated-snapshot.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every path the generator owns. Drift in either direction is a failure. */
const GENERATED_PATHS = [
  'src/generated',
  'contract/manifest.v1.json',
  'contract/schemas/generated',
  'contract/schemas/skills',
  'contract/schemas/stable-figure-request-union.v1.schema.json',
  'python/src/cortexel/generated',
  'python/src/cortexel/contract',
] as const;

const COPY_EXCLUDED_ROOTS = new Set([
  '.git',
  '.superstack',
  '.venv',
  'coverage',
  'dist',
  'node_modules',
]);

function isGeneratedPath(relative: string): boolean {
  return GENERATED_PATHS.some((owned) =>
    relative === owned || relative.startsWith(`${owned}${path.sep}`));
}

function copyAllowed(source: string): boolean {
  const relative = path.relative(ROOT, source);
  if (relative === '') return true;
  const first = relative.split(path.sep)[0];
  if (COPY_EXCLUDED_ROOTS.has(first)) return false;
  if (isGeneratedPath(relative)) return false;

  const basename = path.basename(relative);
  // No check needs credentials. Never copy a local environment file into /tmp.
  if (basename === '.env' || (basename.startsWith('.env.') && basename !== '.env.example')) {
    return false;
  }
  if (isTransientGeneratedPath(relative)) return false;
  return true;
}

function snapshotGeneratedTree(root: string): Map<string, Buffer> {
  return snapshotGeneratedPaths(root, GENERATED_PATHS);
}

function assertGeneratedPathsAbsent(root: string): void {
  const present: string[] = [];
  for (const owned of GENERATED_PATHS) {
    try {
      lstatSync(path.join(root, owned));
      present.push(owned);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  if (present.length > 0) {
    throw new Error(
      `isolated generation did not start from zero generated state: ${present.join(', ')}`,
    );
  }
}

function prepareIsolatedTree(destination: string): void {
  cpSync(ROOT, destination, {
    recursive: true,
    dereference: false,
    filter: (source) => copyAllowed(source),
  });

  // Reuse installed tooling without copying hundreds of megabytes. The generated
  // tree itself never follows or snapshots this link.
  symlinkSync(
    path.join(ROOT, 'node_modules'),
    path.join(destination, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );

  // This is an asserted precondition, not an inference from the copy filter. A
  // generator that accidentally reads stale output must be unable to start here.
  assertGeneratedPathsAbsent(destination);
}

function runGenerator(root: string, stdio: 'inherit' | 'pipe'): void {
  const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  execFileSync(process.execPath, [tsxCli, 'scripts/generate-contract.ts'], {
    cwd: root,
    stdio,
    env: {
      // Contract identity must not depend on credentials, user configuration, locale,
      // or arbitrary parent-process state. Keep only the executable search path and
      // pin the environmental inputs that can legitimately affect text generation.
      PATH: process.env.PATH ?? '',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      TZ: 'UTC',
      NO_COLOR: '1',
    },
  });
}

function main(): number {
  const original = snapshotGeneratedTree(ROOT);
  const temporaryParent = mkdtempSync(path.join(tmpdir(), 'cortexel-generated-check-'));
  const firstRoot = path.join(temporaryParent, 'first');
  const secondRoot = path.join(temporaryParent, 'second');

  try {
    process.stdout.write('Regenerating the contract in two independent zero-state trees...\n');
    prepareIsolatedTree(firstRoot);
    runGenerator(firstRoot, 'inherit');
    const first = snapshotGeneratedTree(firstRoot);

    // A second pass over the first output could conceal a generator that only writes
    // missing files or copies its own stale bytes. Start from an independent source
    // copy with the complete generated namespace absent instead.
    prepareIsolatedTree(secondRoot);
    runGenerator(secondRoot, 'pipe');
    const second = snapshotGeneratedTree(secondRoot);

    const nondeterministic = generatedSnapshotDifferences(first, second);
    if (nondeterministic.length > 0) {
      process.stderr.write('\nGeneration is NOT deterministic:\n');
      for (const difference of nondeterministic) {
        process.stderr.write(`  - ${difference.kind}: ${difference.path}\n`);
      }
      process.stderr.write(
        '\nA digest computed from nondeterministic input is not an identity. Fix the generator.\n',
      );
      return 1;
    }

    const drift = generatedSnapshotDifferences(first, original);
    if (drift.length > 0) {
      process.stderr.write('\nGenerated files are out of date with their source:\n');
      for (const difference of drift) {
        process.stderr.write(`  - ${difference.kind}: ${difference.path}\n`);
      }
      process.stderr.write(
        '\nRun `bun run generate` and review the result. The check left the worktree untouched.\n',
      );
      return 1;
    }

    process.stdout.write(
      '\nGenerated files are fresh, deterministic, and the worktree was not rewritten.\n',
    );
    return 0;
  } finally {
    rmSync(temporaryParent, { recursive: true, force: true });
  }
}

process.exitCode = main();
