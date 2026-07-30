#!/usr/bin/env -S tsx
/**
 * Fetch and verify the pinned official PyNEST source inventory.
 *
 * The upstream commit is fetched into a fresh temporary Git repository. The
 * remote is then removed and all inventory work is performed against the local
 * object database without checking out or executing upstream code.
 *
 * Usage:
 *   tsx scripts/generate-nest-example-source-inventory.ts
 *   tsx scripts/generate-nest-example-source-inventory.ts --output inventory.json
 */
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  buildNestExampleSourceInventory,
  canonicalNestExampleSourceInventory,
  PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
  verifyNestExampleOfflineAcquisitionContext,
} from './lib/nest-example-source-inventory.js';

const GIT_REPOSITORY_OVERRIDE_ENVIRONMENT = Object.freeze([
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_INDEX_FILE',
  'GIT_GRAFT_FILE',
  'GIT_SHALLOW_FILE',
  'GIT_NAMESPACE',
  'GIT_REPLACE_REF_BASE',
  'GIT_CEILING_DIRECTORIES',
  'GIT_DISCOVERY_ACROSS_FILESYSTEM',
] as const);

interface ParsedArguments {
  readonly output: string | null;
  readonly help: boolean;
}

function usage(): string {
  return [
    'Usage:',
    '  tsx scripts/generate-nest-example-source-inventory.ts',
    '  tsx scripts/generate-nest-example-source-inventory.ts --output <new-file.json>',
    '',
    'The output file must not already exist. Without --output, canonical JSON is',
    'written to stdout. The command fetches only the immutable pinned NEST commit',
    'and never executes upstream code.',
  ].join('\n');
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  let output: string | null = null;
  let help = false;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!;
    if (argument === '--help' || argument === '-h') {
      help = true;
      continue;
    }
    if (argument === '--output') {
      const value = argv[++index];
      if (!value || value === '-') {
        throw new Error('--output requires a non-stdout file path');
      }
      if (output !== null) throw new Error('--output may be supplied only once');
      output = value;
      continue;
    }
    throw new Error(`unknown argument ${JSON.stringify(argument)}`);
  }
  if (help && (argv.length !== 1 || output !== null)) {
    throw new Error('--help cannot be combined with other arguments');
  }
  return { output, help };
}

function gitEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_COUNT: '0',
    GIT_NO_REPLACE_OBJECTS: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
  };
  for (const name of GIT_REPOSITORY_OVERRIDE_ENVIRONMENT) delete environment[name];
  return environment;
}

function git(repository: string, args: readonly string[], timeout: number): string {
  const result = spawnSync(
    'git',
    [
      '--no-replace-objects',
      '-c',
      'core.fsmonitor=false',
      '-c',
      'core.untrackedCache=false',
      '-C',
      repository,
      ...args,
    ],
    {
      cwd: repository,
      encoding: 'utf8',
      env: gitEnvironment(),
      maxBuffer: 128 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
    },
  );
  if (result.error || result.status !== 0) {
    const diagnostic = result.stderr.slice(0, 2_000).trim();
    throw new Error(
      `git ${args[0] ?? '<missing>'} failed` +
      (diagnostic.length > 0 ? `: ${diagnostic}` : ''),
    );
  }
  return result.stdout;
}

function fetchPinnedRepository(): {
  readonly repository: string;
  readonly acquisitionContext:
    ReturnType<typeof verifyNestExampleOfflineAcquisitionContext>;
  readonly cleanup: () => void;
} {
  const temporaryRoot = mkdtempSync(
    path.join(tmpdir(), 'cortexel-nest-example-inventory-'),
  );
  const repository = path.join(temporaryRoot, 'repository');
  mkdirSync(repository, { mode: 0o700 });
  let complete = false;
  try {
    git(repository, ['init', '--quiet'], 30_000);
    git(
      repository,
      ['remote', 'add', 'origin', PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.repository],
      30_000,
    );
    git(
      repository,
      [
        'fetch',
        '--quiet',
        '--depth=1',
        '--filter=blob:none',
        '--no-tags',
        'origin',
        PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
      ],
      600_000,
    );
    const resolved = git(
      repository,
      [
        'rev-parse',
        '--verify',
        `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit}^{commit}`,
      ],
      30_000,
    ).trim();
    if (resolved !== PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit) {
      throw new Error(
        `fetched commit mismatch: expected ` +
        `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit}, received ${resolved}`,
      );
    }
    const requiredBlobPaths = [
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.documentationIndex.path,
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.runner.path,
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.orchestrationCmake.path,
      ...Object.keys(PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.aliases),
    ];
    // Materializing these six bounded text blobs is part of the fetch phase. The
    // inventory itself needs no other file contents: all source and asset
    // identities come from the complete Git tree.
    for (const blobPath of requiredBlobPaths) {
      git(
        repository,
        [
          'cat-file',
          'blob',
          `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit}:${blobPath}`,
        ],
        120_000,
      );
    }

    // From here on, the inventory has no configured network source. A lazy object
    // read therefore fails instead of silently reaching back to GitHub.
    git(repository, ['remote', 'remove', 'origin'], 30_000);
    for (const blobPath of requiredBlobPaths) {
      git(
        repository,
        [
          'cat-file',
          '-e',
          `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit}:${blobPath}`,
        ],
        30_000,
      );
    }
    const acquisitionContext = verifyNestExampleOfflineAcquisitionContext(
      repository,
      temporaryRoot,
    );
    complete = true;
    return {
      repository,
      acquisitionContext,
      cleanup: () => rmSync(temporaryRoot, { recursive: true, force: true }),
    };
  } finally {
    if (!complete) rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function writeNewFileSafely(requestedPath: string, content: string): void {
  const target = path.resolve(requestedPath);
  const parent = path.dirname(target);
  const basename = path.basename(target);
  if (basename === '.' || basename === '..' || basename.length === 0) {
    throw new Error('output path must name a file');
  }
  const parentStat = lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error('output parent must be a direct directory');
  }
  if (realpathSync(parent) !== parent) {
    throw new Error('output parent path must not traverse symbolic links');
  }
  if (existsSync(target)) throw new Error('output file already exists');

  const staged = path.join(
    parent,
    `.${basename}.cortexel-${process.pid}-${randomBytes(12).toString('hex')}.tmp`,
  );
  let descriptor: number | null = null;
  let stagedExists = false;
  try {
    descriptor = openSync(staged, 'wx', 0o600);
    stagedExists = true;
    const bytes = Buffer.from(content, 'utf8');
    let offset = 0;
    while (offset < bytes.length) {
      const written = writeSync(descriptor, bytes, offset, bytes.length - offset);
      if (written <= 0) {
        throw new Error('output staging write made no forward progress');
      }
      offset += written;
    }
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;

    // link(2) is an atomic no-clobber publication: an existing target produces
    // EEXIST rather than being overwritten. The staged name is then removed.
    linkSync(staged, target);
    unlinkSync(staged);
    stagedExists = false;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    if (stagedExists) {
      try {
        unlinkSync(staged);
      } catch {
        // Preserve the original failure. The randomized 0600 staging file is
        // harmless and remains in the caller-selected output directory.
      }
    }
  }
}

function safeDiagnostic(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,
      '\uFFFD',
    )
    .slice(0, 2_000);
}

function main(): number {
  let parsed: ParsedArguments;
  try {
    parsed = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${safeDiagnostic(error)}\n${usage()}\n`);
    return 2;
  }
  if (parsed.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  let fetched: ReturnType<typeof fetchPinnedRepository> | null = null;
  try {
    fetched = fetchPinnedRepository();
    const inventory = buildNestExampleSourceInventory(
      fetched.repository,
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
      fetched.acquisitionContext,
    );
    const canonical = canonicalNestExampleSourceInventory(inventory);
    // Do not publish evidence until the temporary acquisition authority has
    // been removed successfully. A cleanup failure is a bounded command failure,
    // not an accepted artifact followed by an unhandled finally exception.
    fetched.cleanup();
    fetched = null;
    if (parsed.output === null) process.stdout.write(canonical);
    else writeNewFileSafely(parsed.output, canonical);
    return 0;
  } catch (error) {
    process.stderr.write(`${safeDiagnostic(error)}\n`);
    return 1;
  } finally {
    if (fetched !== null) {
      try {
        fetched.cleanup();
      } catch {
        // Preserve the primary bounded diagnostic. No artifact is published on
        // this path, and the private randomized temporary root remains the only
        // possible residue.
      }
    }
  }
}

process.exitCode = main();
