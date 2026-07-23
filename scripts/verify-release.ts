/**
 * Read-only final-release verifier.
 *
 * This command does not stamp sources, create or rewrite tags, inspect a remote, or
 * contact a registry. It verifies only repository-owned metadata and local git facts.
 * Signing, branch, remote, and publication policy remain owner/CI responsibilities.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseLedgerJsonStrict,
  unmetReleaseGates,
  validateLedger,
} from './check-evidence-ledger.js';
import {
  isFinalCoreSemVer,
  isStableContractRelease,
  parseCitationReleaseMetadata,
  parsePythonProjectMetadata,
  releaseVerificationProblems,
  type GitReleaseState,
  type ReleaseVerificationInput,
} from './lib/release-identity.js';
import { readDirectRepositoryFile } from './lib/direct-repository-file.js';
import { parseJsonSourceStrict } from './lib/strict-json-source.js';

export const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/** Compatibility export for tests and callers of the original verifier-local helper. */
export const readDirectReleaseFile = readDirectRepositoryFile;

/**
 * Git is part of the release trust boundary. Inherit only process-launch essentials;
 * repository redirection, alternate object databases, replacement objects, injected
 * config, pathspec modes, and diff helpers must not come from the caller's environment.
 */
function releaseGitEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const key of [
    'PATH',
    'PATHEXT',
    'SystemRoot',
    'SYSTEMROOT',
    'WINDIR',
    'TMPDIR',
    'TMP',
    'TEMP',
  ]) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.GIT_CONFIG_NOSYSTEM = '1';
  environment.GIT_CONFIG_COUNT = '0';
  environment.GIT_NO_REPLACE_OBJECTS = '1';
  environment.GIT_OPTIONAL_LOCKS = '0';
  environment.GIT_TERMINAL_PROMPT = '0';
  return environment;
}

function releaseGitArgs(root: string, args: readonly string[]): string[] {
  return [
    '--no-replace-objects',
    '-c',
    'core.fsmonitor=false',
    '-c',
    'core.untrackedCache=false',
    '-c',
    'core.ignoreStat=false',
    '-C',
    root,
    ...args,
  ];
}

function gitOutput(root: string, args: readonly string[]): string | null {
  const result = spawnSync('git', releaseGitArgs(root, args), {
    cwd: root,
    env: releaseGitEnvironment(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0 || result.error) return null;
  return result.stdout.trim();
}

function gitRawBuffer(root: string, args: readonly string[], maxBytes = 1024 * 1024): Buffer | null {
  const result = spawnSync('git', releaseGitArgs(root, args), {
    cwd: root,
    env: releaseGitEnvironment(),
    maxBuffer: maxBytes + 1,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0 || result.error || result.stdout.length > maxBytes) return null;
  return result.stdout;
}

function gitRawOutput(root: string, args: readonly string[]): string | null {
  const output = gitRawBuffer(root, args);
  if (output === null) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(output);
  } catch {
    return null;
  }
}

function gitExit(root: string, args: readonly string[]): number | null {
  const result = spawnSync('git', releaseGitArgs(root, args), {
    cwd: root,
    env: releaseGitEnvironment(),
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  if (result.error || result.status === null) return null;
  return result.status;
}

const LEDGER_FILE = 'docs/release/evidence-ledger.v1.json';
const LEDGER_SCHEMA_FILE = 'docs/release/evidence-ledger.schema.json';
const FULL_COMMIT = /^[0-9a-f]{40}$/u;

function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((entry, index) => jsonEqual(entry, right[index]));
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) =>
    key === rightKeys[index] && jsonEqual(left[key], right[key]));
}

function safeLiteralPackageFiles(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.every((entry) =>
    typeof entry === 'string' &&
    entry.length > 0 &&
    !entry.startsWith('/') &&
    entry.split('/').every((segment) =>
      segment.length > 0 && segment !== '.' && segment !== '..' &&
      /^[A-Za-z0-9._-]+$/u.test(segment)))
    ? value as readonly string[]
    : null;
}

function normalizedPackagePath(value: string): string {
  return value.startsWith('./') ? value.slice(2) : value;
}

function pathsOverlap(left: string, right: string): boolean {
  // ASCII case-folding is intentionally conservative for portability to default
  // case-insensitive macOS/Windows package builders.
  const a = normalizedPackagePath(left).replace(/\/$/u, '').toLowerCase();
  const b = normalizedPackagePath(right).replace(/\/$/u, '').toLowerCase();
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function packageSurfaceStrings(packageJson: Record<string, unknown>): string[] {
  const strings: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === 'string') strings.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (isRecord(value)) Object.values(value).forEach(visit);
  };
  for (const key of [
    'main', 'module', 'browser', 'types', 'typings', 'bin', 'man', 'directories',
    'exports', 'imports', 'scripts',
  ]) {
    visit(packageJson[key]);
  }
  return strings;
}

function evidencePath(releaseVersion: string, value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const prefix = `docs/release/evidence/${releaseVersion}/`;
  if (!value.startsWith(prefix)) return false;
  const suffix = value.slice(prefix.length);
  return suffix.length > 0 && suffix.split('/').every((segment) =>
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(segment));
}

interface DiffEntry {
  readonly status: string;
  readonly path: string;
}

function diffEntries(root: string, source: string, head: string): readonly DiffEntry[] | null {
  const output = gitRawOutput(root, [
    'diff',
    '--name-status',
    '-z',
    '--no-renames',
    '--no-ext-diff',
    '--no-textconv',
    source,
    head,
  ]);
  if (output === null) return null;
  const tokens = output.endsWith('\0') ? output.slice(0, -1).split('\0') : output.split('\0');
  if (tokens.length === 1 && tokens[0] === '') return [];
  if (tokens.length % 2 !== 0) return null;
  const entries: DiffEntry[] = [];
  for (let index = 0; index < tokens.length; index += 2) {
    if (!/^[A-Z]$/u.test(tokens[index]) || tokens[index + 1].length === 0) return null;
    entries.push(Object.freeze({ status: tokens[index], path: tokens[index + 1] }));
  }
  return entries;
}

interface TreeEntry {
  readonly mode: string;
  readonly type: string;
  readonly path: string;
}

function evidenceTreeEntries(
  root: string,
  head: string,
  evidenceRoot: string,
): readonly TreeEntry[] | null {
  const output = gitRawOutput(root, [
    'ls-tree',
    '-r',
    '-z',
    '--full-tree',
    head,
    '--',
    `:(top,literal)${evidenceRoot}`,
  ]);
  if (output === null) return null;
  const records = output.endsWith('\0') ? output.slice(0, -1).split('\0') : output.split('\0');
  if (records.length === 1 && records[0] === '') return [];
  const entries: TreeEntry[] = [];
  for (const record of records) {
    const match = /^([0-9]{6}) ([a-z]+) [0-9a-f]+\t([\s\S]+)$/u.exec(record);
    if (!match) return null;
    entries.push(Object.freeze({ mode: match[1], type: match[2], path: match[3] }));
  }
  return entries;
}

function ledgerRootWithoutGates(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'gates'));
}

/**
 * Bind stable receipts to a realizable two-tree release construction.
 *
 * Candidate A contains the exact tested source/package/schema tree. Authorization B
 * (the tag target) may alter only gate status/evidence/notes in the ledger and add or
 * update non-executable, version-scoped receipt files outside the npm surface. Every
 * PASS points to A; B can never claim to have tested its own self-referential SHA.
 */
export function inspectReleaseEvidenceSources(
  root: string,
  headCommit: string | null,
  releaseVersion: unknown,
  packageJson: unknown,
): string[] {
  const problems: string[] = [];
  if (headCommit === null || !FULL_COMMIT.test(headCommit)) {
    return ['release evidence source audit cannot run without a full HEAD commit'];
  }
  if (!isStableContractRelease(releaseVersion)) {
    return ['release evidence source audit requires a final stable release version'];
  }
  const stableVersion = String(releaseVersion);
  if (!isRecord(packageJson)) return ['release evidence source audit requires package metadata'];

  let currentSource: unknown;
  let schema: unknown;
  try {
    currentSource = parseLedgerJsonStrict(
      readDirectReleaseFile(root, LEDGER_FILE),
      LEDGER_FILE,
    );
    schema = parseLedgerJsonStrict(
      readDirectReleaseFile(root, LEDGER_SCHEMA_FILE),
      LEDGER_SCHEMA_FILE,
    );
  } catch (error) {
    return [`release evidence source audit cannot read the current ledger/schema: ${String(error)}`];
  }
  const committedLedgerBytes = gitRawBuffer(root, ['cat-file', 'blob', `${headCommit}:${LEDGER_FILE}`]);
  const committedSchemaBytes = gitRawBuffer(
    root,
    ['cat-file', 'blob', `${headCommit}:${LEDGER_SCHEMA_FILE}`],
  );
  if (committedLedgerBytes === null || committedSchemaBytes === null) {
    return ['authorization HEAD does not contain readable ledger authority files'];
  }
  try {
    const committedLedger = parseLedgerJsonStrict(
      committedLedgerBytes,
      `${headCommit}:${LEDGER_FILE}`,
    );
    const committedSchema = parseLedgerJsonStrict(
      committedSchemaBytes,
      `${headCommit}:${LEDGER_SCHEMA_FILE}`,
    );
    if (!jsonEqual(currentSource, committedLedger) || !jsonEqual(schema, committedSchema)) {
      problems.push('working release ledger/schema does not equal authorization HEAD');
    }
  } catch (error) {
    return [`authorization HEAD ledger/schema is not strict JSON: ${String(error)}`];
  }
  const current = validateLedger(currentSource, schema);
  if (current.errors.length > 0) {
    return current.errors.map((problem) => `current release ledger: ${problem}`);
  }

  const passing = current.gates.filter((gate) => gate.status === 'PASS');
  if (passing.length === 0) return [];
  const sources = new Set(passing.map((gate) => gate.evidence?.sourceCommit));
  if (sources.size !== 1) {
    return ['all stable-release PASS receipts must identify one common tested candidate commit A'];
  }
  const sourceCommit = [...sources][0];
  if (typeof sourceCommit !== 'string' || !FULL_COMMIT.test(sourceCommit)) {
    return ['stable-release PASS receipts do not identify one full tested candidate commit A'];
  }
  if (sourceCommit === headCommit) {
    return ['authorization commit B must follow tested candidate A; PASS sourceCommit cannot equal HEAD'];
  }
  if (gitExit(root, ['merge-base', '--is-ancestor', sourceCommit, headCommit]) !== 0) {
    return [`tested candidate A ${sourceCommit} is not an auditable ancestor of authorization HEAD`];
  }

  const candidateText = gitOutput(root, ['show', `${sourceCommit}:${LEDGER_FILE}`]);
  if (candidateText === null) {
    return [`tested candidate A ${sourceCommit} does not contain a readable ${LEDGER_FILE}`];
  }
  let candidateSource: unknown;
  try {
    candidateSource = parseLedgerJsonStrict(candidateText, `${sourceCommit}:${LEDGER_FILE}`);
  } catch (error) {
    return [`tested candidate A ledger is not strict JSON: ${String(error)}`];
  }
  const candidate = validateLedger(candidateSource, schema);
  if (candidate.errors.length > 0) {
    return candidate.errors.map((problem) => `tested candidate A ledger: ${problem}`);
  }
  if (!jsonEqual(ledgerRootWithoutGates(candidateSource), ledgerRootWithoutGates(currentSource))) {
    problems.push('ledger root metadata changed between tested candidate A and authorization B');
  }
  if (candidate.gates.length !== current.gates.length) {
    problems.push('ledger gate inventory changed between tested candidate A and authorization B');
  } else {
    for (let index = 0; index < current.gates.length; index++) {
      const before = candidate.gates[index];
      const after = current.gates[index];
      for (const key of ['id', 'section', 'requirement', 'releaseBlocking'] as const) {
        if (!jsonEqual(before[key], after[key])) {
          problems.push(
            `${after.id}: immutable ledger.${key} changed between tested candidate A and authorization B`,
          );
        }
      }
    }
  }

  const changes = diffEntries(root, sourceCommit, headCommit);
  if (changes === null) {
    problems.push('cannot enumerate the candidate-A to authorization-B tree difference');
  } else {
    let ledgerChanged = false;
    for (const change of changes) {
      if (change.path === LEDGER_FILE) {
        ledgerChanged = true;
        if (change.status !== 'M') {
          problems.push(`${LEDGER_FILE} must be modified in place between A and B`);
        }
      } else if (evidencePath(stableVersion, change.path)) {
        if (change.status !== 'A' && change.status !== 'M') {
          problems.push(`release receipt ${change.path} must only be added or updated after testing`);
        }
      } else {
        problems.push(
          `repository source changed after tested candidate A at top-level path ${JSON.stringify(change.path)}`,
        );
      }
    }
    if (!ledgerChanged) {
      problems.push('authorization B does not contain an in-place evidence-ledger update after A');
    }
  }

  const evidenceRoot = `docs/release/evidence/${stableVersion}`;
  const files = safeLiteralPackageFiles(packageJson.files);
  if (files === null) {
    problems.push('stable package files must be one nonempty safe literal allowlist');
  } else if (files.some((entry) => pathsOverlap(entry, evidenceRoot))) {
    problems.push(`version-scoped evidence directory ${evidenceRoot} overlaps the npm files allowlist`);
  }
  if (packageSurfaceStrings(packageJson).some((entry) =>
    pathsOverlap(entry, evidenceRoot) ||
    entry.toLowerCase().includes(evidenceRoot.toLowerCase()))) {
    problems.push(`version-scoped evidence directory ${evidenceRoot} is referenced by a package executable surface`);
  }

  const treeEntries = evidenceTreeEntries(root, headCommit, evidenceRoot);
  if (treeEntries === null) {
    problems.push(`cannot inspect version-scoped evidence tree ${evidenceRoot}`);
  } else {
    for (const entry of treeEntries) {
      if (!evidencePath(stableVersion, entry.path)) {
        problems.push(`unsafe entry in version-scoped evidence tree: ${JSON.stringify(entry.path)}`);
      }
      if (entry.mode !== '100644' || entry.type !== 'blob') {
        problems.push(
          `release evidence must be a non-executable regular file: ${entry.path} ` +
          `(mode ${entry.mode}, type ${entry.type})`,
        );
      }
    }
  }

  for (const gate of passing) {
    const receipt = gate.evidence?.receipt;
    if (!evidencePath(stableVersion, receipt)) {
      problems.push(`${gate.id}: stable PASS receipt must be a safe path beneath ${evidenceRoot}/`);
      continue;
    }
    const treeEntry = treeEntries?.find((entry) => entry.path === receipt);
    if (treeEntry?.mode !== '100644' || treeEntry.type !== 'blob') {
      problems.push(`${gate.id}: receipt is not a committed non-executable regular file: ${receipt}`);
      continue;
    }
    try {
      const receiptBytes = gitRawBuffer(
        root,
        ['cat-file', 'blob', `${headCommit}:${receipt}`],
        8 * 1024 * 1024,
      );
      if (receiptBytes === null) {
        problems.push(`${gate.id}: committed receipt is unreadable or exceeds 8 MiB: ${receipt}`);
        continue;
      }
      const digest = `sha256:${createHash('sha256').update(receiptBytes).digest('hex')}`;
      if (gate.evidence?.artifactDigest !== digest) {
        problems.push(`${gate.id}: evidence.artifactDigest does not match receipt bytes at ${receipt}`);
      }
    } catch (error) {
      problems.push(`${gate.id}: committed receipt digest failed: ${String(error)}`);
    }
  }

  return [...new Set(problems)];
}

/** Gather only local, read-only git facts. The pure gate consumes this detached value. */
export function inspectGitReleaseState(
  root: string,
  packageVersion: unknown,
  packageFiles?: unknown,
): GitReleaseState {
  const discoveredRoot = gitOutput(root, ['rev-parse', '--show-toplevel']);
  let repositoryRootMatches = false;
  try {
    repositoryRootMatches = discoveredRoot !== null &&
      realpathSync(discoveredRoot) === realpathSync(root);
  } catch {
    repositoryRootMatches = false;
  }
  if (!repositoryRootMatches) {
    return Object.freeze({ headCommit: null, worktreeClean: false, tag: null });
  }

  const headCommit = gitOutput(root, ['rev-parse', '--verify', 'HEAD^{commit}']);
  const status = gitOutput(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  const indexed = gitOutput(root, ['ls-files', '-v', '-z']);
  // `git status` deliberately trusts assume-unchanged and skip-worktree bits. Those
  // bits are useful locally, but at a publication boundary they can conceal bytes that
  // npm will pack. Refuse the flags themselves, even when the file currently matches.
  const concealedIndexEntry = indexed === null || indexed.split('\0').some((entry) =>
    entry.startsWith('S ') || /^[a-z] /u.test(entry));
  const safeFiles = safeLiteralPackageFiles(packageFiles);
  let ignoredPackageEntry = safeFiles === null;
  if (safeFiles !== null) {
    const pathspecs = ['package.json', ...safeFiles]
      .map((entry) => `:(literal)${String(entry)}`);
    const ignored = gitOutput(root, [
      'ls-files',
      '--others',
      '--ignored',
      '--exclude-standard',
      '-z',
      '--',
      ...pathspecs,
    ]);
    ignoredPackageEntry = ignored === null || ignored.length > 0;
  }
  const worktreeClean = status === '' && !concealedIndexEntry && !ignoredPackageEntry;
  if (!isFinalCoreSemVer(packageVersion)) {
    return Object.freeze({
      headCommit,
      worktreeClean,
      tag: null,
    });
  }

  const name = `v${packageVersion}`;
  const ref = `refs/tags/${name}`;
  const objectType = gitOutput(root, ['cat-file', '-t', ref]);
  const resolvedCommit = objectType === null
    ? null
    : gitOutput(root, ['rev-parse', '--verify', `${ref}^{commit}`]);
  const taggerInstant = objectType === 'tag'
    ? gitOutput(root, ['for-each-ref', '--format=%(taggerdate:iso-strict)', ref])
    : null;
  const taggerDateReleased = taggerInstant !== null &&
    /^\d{4}-\d{2}-\d{2}T/u.test(taggerInstant)
    ? taggerInstant.slice(0, 10)
    : null;
  return Object.freeze({
    headCommit,
    worktreeClean,
    tag: objectType === null
      ? null
      : Object.freeze({ name, objectType, resolvedCommit, taggerDateReleased }),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface RepositoryReleaseVerification {
  readonly problems: readonly string[];
  readonly input: ReleaseVerificationInput | null;
}

export function verifyRepositoryRelease(root = REPOSITORY_ROOT): RepositoryReleaseVerification {
  try {
    const packageFile = 'package.json';
    const packageBytes = readDirectReleaseFile(root, packageFile);
    const packageJson = parseJsonSourceStrict<unknown>(
      packageBytes,
      packageFile,
    );
    if (!isRecord(packageJson)) {
      return { problems: ['package.json root must be an object'], input: null };
    }

    const pythonProjectFile = 'python/pyproject.toml';
    const pythonProjectBytes = readDirectReleaseFile(root, pythonProjectFile);
    const pythonProject = parsePythonProjectMetadata(
      new TextDecoder('utf-8', { fatal: true }).decode(pythonProjectBytes),
    );
    const citationFile = 'CITATION.cff';
    const citationBytes = readDirectReleaseFile(root, citationFile);
    const citation = parseCitationReleaseMetadata(
      new TextDecoder('utf-8', { fatal: true }).decode(citationBytes),
    );
    const artifactSchemaFile = 'contract/schemas/figure-artifact.v1.schema.json';
    const artifactSchemaBytes = readDirectReleaseFile(root, artifactSchemaFile);
    const artifactSchema = parseJsonSourceStrict<unknown>(
      artifactSchemaBytes,
      artifactSchemaFile,
    );
    const commonSchemaFile = 'contract/schemas/common.v1.schema.json';
    const commonSchemaBytes = readDirectReleaseFile(root, commonSchemaFile);
    const commonSchema = parseJsonSourceStrict<unknown>(
      commonSchemaBytes,
      commonSchemaFile,
    );
    const ledgerFile = 'docs/release/evidence-ledger.v1.json';
    const ledgerSchemaFile = 'docs/release/evidence-ledger.schema.json';
    const ledgerBytes = readDirectReleaseFile(root, ledgerFile);
    const ledgerSchemaBytes = readDirectReleaseFile(root, ledgerSchemaFile);
    const ledger = validateLedger(
      parseLedgerJsonStrict(ledgerBytes, ledgerFile),
      parseLedgerJsonStrict(ledgerSchemaBytes, ledgerSchemaFile),
    );
    if (ledger.errors.length > 0 || ledger.metadata === null) {
      return {
        problems: ledger.errors.map((problem) => `evidence ledger: ${problem}`),
        input: null,
      };
    }

    const git = inspectGitReleaseState(root, packageJson.version, packageJson.files);
    const evidenceSourceProblems = isStableContractRelease(packageJson.version)
      ? inspectReleaseEvidenceSources(root, git.headCommit, packageJson.version, packageJson)
      : [];
    const passingSourceCommits = new Set(
      ledger.gates
        .filter((gate) => gate.status === 'PASS')
        .map((gate) => gate.evidence?.sourceCommit),
    );
    const artifactSourceRevision = isStableContractRelease(packageJson.version) &&
      passingSourceCommits.size === 1
      ? [...passingSourceCommits][0]
      : git.headCommit;
    const finalGit = inspectGitReleaseState(root, packageJson.version, packageJson.files);
    const authorityFiles = new Map<string, Buffer>([
      [packageFile, packageBytes],
      [pythonProjectFile, pythonProjectBytes],
      [citationFile, citationBytes],
      [artifactSchemaFile, artifactSchemaBytes],
      [commonSchemaFile, commonSchemaBytes],
      [ledgerFile, ledgerBytes],
      [ledgerSchemaFile, ledgerSchemaBytes],
    ]);
    let authorityStable = git.headCommit !== null && FULL_COMMIT.test(git.headCommit);
    for (const [relative, initial] of authorityFiles) {
      const reread = readDirectReleaseFile(root, relative);
      const committed = authorityStable
        ? gitRawBuffer(root, ['cat-file', 'blob', `${git.headCommit}:${relative}`])
        : null;
      if (!initial.equals(reread) || committed === null || !initial.equals(committed)) {
        authorityStable = false;
      }
    }
    const gitStateStable = jsonEqual(git, finalGit) && authorityStable;
    const stableGitSnapshot = gitStateStable
      ? git
      : Object.freeze({ headCommit: null, worktreeClean: false, tag: null });
    if (!gitStateStable && isStableContractRelease(packageJson.version)) {
      evidenceSourceProblems.push(
        'Git state or release-authority bytes changed while verification was running',
      );
    }
    const input: ReleaseVerificationInput = Object.freeze({
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      packagePrivate: packageJson.private,
      publishConfigPresent: Object.hasOwn(packageJson, 'publishConfig'),
      packageNodeEngine: isRecord(packageJson.engines) ? packageJson.engines.node : undefined,
      pythonProjectName: pythonProject.name,
      pythonProjectVersion: pythonProject.version,
      citationVersion: citation.version,
      citationDateReleased: citation.dateReleased,
      ledgerProject: ledger.metadata.project,
      ledgerCurrentRelease: ledger.metadata.currentRelease,
      unmetReleaseGateIds: Object.freeze(unmetReleaseGates(ledger.gates).map((gate) => gate.id)),
      releaseEvidenceSourceProblems: Object.freeze(evidenceSourceProblems),
      releaseEvidenceSourceCommit: artifactSourceRevision,
      artifactSourceRevision,
      artifactSchema,
      artifactSchemaReferences: Object.freeze([commonSchema]),
      git: stableGitSnapshot,
    });
    return Object.freeze({ problems: releaseVerificationProblems(input), input });
  } catch (error) {
    return {
      problems: [`release metadata is not readable/parseable: ${String(error)}`],
      input: null,
    };
  }
}

function main(argv: readonly string[]): number {
  if (argv.length > 0) {
    process.stderr.write('usage: verify-release.ts\n');
    return 2;
  }
  const result = verifyRepositoryRelease();
  if (result.problems.length > 0) {
    process.stderr.write('Release verification failed closed:\n');
    for (const problem of result.problems) process.stderr.write(`  - ${problem}\n`);
    return 1;
  }
  process.stdout.write(
    `Release ${String(result.input?.packageVersion)} metadata, ledger, clean HEAD, and annotated tag agree.\n`,
  );
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
