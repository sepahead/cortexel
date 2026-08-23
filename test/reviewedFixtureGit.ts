import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { TextDecoder } from 'node:util';

import {
  controlledGitCommandArguments,
  controlledGitEnvironment,
} from '../scripts/lib/offline-git-object-database.js';
import {
  createReviewedGitRuntime,
  disposeReviewedGitRuntime,
  runReviewedGitCommand,
  type ReviewedGitRuntime,
} from '../scripts/lib/reviewed-git-command.js';

let fixtureRuntime: ReviewedGitRuntime | null = null;

function requireSupportedFixtureGitPlatform(platform: string): void {
  if (platform !== 'darwin' && platform !== 'linux') {
    throw new Error('reviewed fixture Git is implemented only on macOS/Linux');
  }
}

function processFixtureRuntime(): ReviewedGitRuntime {
  if (fixtureRuntime !== null) return fixtureRuntime;
  requireSupportedFixtureGitPlatform(process.platform);
  fixtureRuntime = createReviewedGitRuntime(realpathSync(tmpdir()));
  process.once('exit', () => {
    if (fixtureRuntime === null) return;
    try {
      disposeReviewedGitRuntime(fixtureRuntime);
    } catch {
      // Test-process exit cleanup is best effort.
    }
  });
  return fixtureRuntime;
}

function decodeUtf8(bytes: Buffer, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error(`reviewed fixture Git ${label} is not well-formed UTF-8`);
  }
}

export function runReviewedFixtureGit(
  repository: string,
  arguments_: readonly string[],
  input?: string | Uint8Array,
): string {
  const runtime = processFixtureRuntime();
  const stdin = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  // A privately acquired Apple Git has no adjacent template directory. Fixture
  // repositories intentionally start empty, so make that absence explicit and
  // keep stderr closed instead of admitting Git's missing-template warning.
  const fixtureArguments = arguments_[0] === 'init' &&
      !arguments_.some((argument) => argument.startsWith('--template'))
    ? [...arguments_, '--template=']
    : arguments_;
  const result = runReviewedGitCommand(
    runtime,
    repository,
    controlledGitCommandArguments(repository, fixtureArguments),
    {
      environment: { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      ...(stdin === undefined ? {} : { stdin }),
      outputLimitBytes: 16 * 1024 * 1024,
      timeoutMs: 30_000,
    },
  );
  return decodeUtf8(result.stdout, 'stdout').trim();
}

export const reviewedFixtureGitTesting = Object.freeze({
  requireSupportedPlatform: (platform: string): void =>
    requireSupportedFixtureGitPlatform(platform),
});
