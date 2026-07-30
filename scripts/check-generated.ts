/**
 * Generated-file freshness gate.
 *
 * Generation happens only inside an isolated temporary copy. A check must never
 * rewrite the caller's worktree before announcing that it was stale: doing so destroys
 * the very evidence a developer needs to review and races every concurrent editor.
 *
 * Two independent temporary copies deliberately omit all existing generated outputs.
 * Comparing their generated snapshots tests determinism without letting one pass seed
 * the other; comparing the first against the untouched worktree proves freshness and
 * detects obsolete extra generated files as well as missing/changed ones. Each pass
 * also rejects final-state mutation of direct entries outside the closed output
 * inventory in its isolated repository namespace.
 */

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  generatedSnapshotDifferences,
  type GeneratedDifference,
  type GeneratedSnapshot,
} from './lib/generated-snapshot.js';
import {
  assertNoOutsideGeneratedOutputMutations,
  GENERATED_OUTPUT_ROOTS,
  isGeneratorControllingInputPath,
  snapshotGeneratedOutputInventory,
  snapshotGeneratorControllingInputs,
  snapshotOutsideGeneratedOutputs,
} from './lib/generated-output-authority.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATOR_TIMEOUT_MS = 60_000;
const TEMPORARY_CLEANUP_TIMEOUT_MS = 10_000;
const TEMPORARY_CLEANUP_PROGRAM = `
import { rmSync } from 'node:fs';
const target = process.argv[1];
if (typeof target !== 'string') process.exit(64);
rmSync(target, { recursive: true, force: true });
`;

function copyAllowed(source: string): boolean {
  const relative = path.relative(ROOT, source);
  return isGeneratorControllingInputPath(relative);
}

function snapshotGeneratedTree(root: string): Map<string, Buffer> {
  return snapshotGeneratedOutputInventory(root);
}

function assertGeneratedPathsAbsent(root: string): void {
  const present: string[] = [];
  for (const owned of GENERATED_OUTPUT_ROOTS) {
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

function renderDifferences(differences: readonly GeneratedDifference[]): string {
  return differences
    .map((difference) => `  - ${difference.kind}: ${difference.path}`)
    .join('\n');
}

function assertSnapshotIdentity(
  expected: GeneratedSnapshot,
  actual: GeneratedSnapshot,
  message: string,
): void {
  const differences = generatedSnapshotDifferences(expected, actual);
  if (differences.length === 0) return;
  throw new Error(`${message}\n${renderDifferences(differences)}`);
}

function prepareIsolatedTree(
  destination: string,
  expectedInputs: GeneratedSnapshot,
): void {
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
  assertSnapshotIdentity(
    expectedInputs,
    snapshotGeneratorControllingInputs(destination),
    'isolated generation source differs from the initially observed caller inputs',
  );
}

function runGenerator(
  root: string,
  output: 'full' | 'errors-only',
  temporaryRoot: string,
): void {
  const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  execFileSync(process.execPath, [tsxCli, 'scripts/generate-contract.ts'], {
    cwd: root,
    // Never capture a pipe here. A descendant that retains an inherited pipe FD can
    // keep synchronous collection open after the direct generator child has exited.
    stdio: output === 'full' ? 'inherit' : ['ignore', 'ignore', 'inherit'],
    timeout: GENERATOR_TIMEOUT_MS,
    killSignal: 'SIGKILL',
    env: {
      // Contract identity must not depend on credentials, user configuration, locale,
      // or arbitrary parent-process state. Keep only the executable search path and
      // pin the environmental inputs that can legitimately affect text generation.
      PATH: process.env.PATH ?? '',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      TZ: 'UTC',
      NO_COLOR: '1',
      // tsx uses a private IPC socket. Keep it inside the already-isolated
      // generation tree instead of falling back to a host-global temp path
      // that a containing sandbox correctly excludes.
      TMPDIR: temporaryRoot,
      TMP: temporaryRoot,
      TEMP: temporaryRoot,
    },
  });
}

function removeTemporaryGenerationTree(temporaryParent: string): void {
  const resolvedTemporaryRoot = path.resolve(tmpdir());
  const resolvedTarget = path.resolve(temporaryParent);
  const relative = path.relative(resolvedTemporaryRoot, resolvedTarget);
  if (
    relative === ''
    || relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
    || !path.basename(resolvedTarget).startsWith('cxg-')
  ) {
    throw new Error(`refusing unsafe generation cleanup target: ${temporaryParent}`);
  }

  try {
    // A synchronous in-process recursive removal cannot be interrupted. Keep cleanup
    // in a disposable process so a pathological filesystem cannot hang this gate
    // indefinitely. SIGKILL is intentional: the child performs no work except removing
    // this exact validated temporary tree.
    execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', TEMPORARY_CLEANUP_PROGRAM, resolvedTarget],
      {
        stdio: 'ignore',
        timeout: TEMPORARY_CLEANUP_TIMEOUT_MS,
        killSignal: 'SIGKILL',
        env: {
          PATH: '',
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          TZ: 'UTC',
        },
      },
    );
  } catch (error) {
    throw new Error(
      `temporary generation-tree cleanup failed or exceeded `
        + `${TEMPORARY_CLEANUP_TIMEOUT_MS} ms; inspect ${resolvedTarget}`,
      { cause: error },
    );
  }
}

function main(): number {
  const originalGenerated = snapshotGeneratedTree(ROOT);
  const originalInputs = snapshotGeneratorControllingInputs(ROOT);
  // Unix-domain socket paths are length-bounded on macOS. Keep the isolated
  // namespace deliberately short while retaining separate runtime state for
  // the two determinism passes.
  const temporaryParent = mkdtempSync(path.join(tmpdir(), 'cxg-'));
  const firstRoot = path.join(temporaryParent, 'first');
  const secondRoot = path.join(temporaryParent, 'second');
  const firstRuntime = path.join(temporaryParent, 'r1');
  const secondRuntime = path.join(temporaryParent, 'r2');
  let freshnessEstablished = false;

  try {
    mkdirSync(firstRuntime);
    mkdirSync(secondRuntime);
    process.stdout.write('Regenerating the contract in two independent zero-state trees...\n');
    prepareIsolatedTree(firstRoot, originalInputs);
    const firstOutsideBefore = snapshotOutsideGeneratedOutputs(firstRoot);
    runGenerator(firstRoot, 'full', firstRuntime);
    assertNoOutsideGeneratedOutputMutations(
      firstOutsideBefore,
      snapshotOutsideGeneratedOutputs(firstRoot),
      'first isolated generator pass',
    );
    const first = snapshotGeneratedTree(firstRoot);

    // A second pass over the first output could conceal a generator that only writes
    // missing files or copies its own stale bytes. Start from an independent source
    // copy with the complete generated namespace absent instead.
    prepareIsolatedTree(secondRoot, originalInputs);
    const secondOutsideBefore = snapshotOutsideGeneratedOutputs(secondRoot);
    runGenerator(secondRoot, 'errors-only', secondRuntime);
    assertNoOutsideGeneratedOutputMutations(
      secondOutsideBefore,
      snapshotOutsideGeneratedOutputs(secondRoot),
      'second isolated generator pass',
    );
    const second = snapshotGeneratedTree(secondRoot);

    const nondeterministic = generatedSnapshotDifferences(first, second);
    if (nondeterministic.length > 0) {
      process.stderr.write('\nGeneration is NOT deterministic:\n');
      process.stderr.write(`${renderDifferences(nondeterministic)}\n`);
      process.stderr.write(
        '\nA digest computed from nondeterministic input is not an identity. Fix the generator.\n',
      );
      return 1;
    }

    const drift = generatedSnapshotDifferences(first, originalGenerated);
    if (drift.length > 0) {
      process.stderr.write('\nGenerated files are out of date with their source:\n');
      process.stderr.write(`${renderDifferences(drift)}\n`);
      process.stderr.write(
        '\nRun `bun run generate` and review the result. The check left the worktree untouched.\n',
      );
      return 1;
    }

    // Re-read both authorities immediately before the success claim. Sandwiching
    // each with a second observation catches caller drift during this final review
    // window instead of blessing bytes seen only before the long-running passes.
    const finalInputsFirst = snapshotGeneratorControllingInputs(ROOT);
    const finalGeneratedFirst = snapshotGeneratedTree(ROOT);
    const finalInputsSecond = snapshotGeneratorControllingInputs(ROOT);
    const finalGeneratedSecond = snapshotGeneratedTree(ROOT);
    const finalInputDifferences = [
      ...generatedSnapshotDifferences(originalInputs, finalInputsFirst),
      ...generatedSnapshotDifferences(originalInputs, finalInputsSecond),
      ...generatedSnapshotDifferences(finalInputsFirst, finalInputsSecond),
    ];
    const finalGeneratedDifferences = [
      ...generatedSnapshotDifferences(originalGenerated, finalGeneratedFirst),
      ...generatedSnapshotDifferences(originalGenerated, finalGeneratedSecond),
      ...generatedSnapshotDifferences(finalGeneratedFirst, finalGeneratedSecond),
    ];
    if (finalInputDifferences.length > 0 || finalGeneratedDifferences.length > 0) {
      process.stderr.write(
        '\nCaller inputs or generated bytes changed while freshness was being checked:\n',
      );
      if (finalInputDifferences.length > 0) {
        process.stderr.write('  controlling inputs:\n');
        process.stderr.write(`${renderDifferences(finalInputDifferences)}\n`);
      }
      if (finalGeneratedDifferences.length > 0) {
        process.stderr.write('  generated outputs:\n');
        process.stderr.write(`${renderDifferences(finalGeneratedDifferences)}\n`);
      }
      process.stderr.write(
        '\nRetry from a quiescent worktree; no freshness claim was published.\n',
      );
      return 1;
    }

    freshnessEstablished = true;
    return 0;
  } finally {
    removeTemporaryGenerationTree(temporaryParent);
    if (freshnessEstablished) {
      // Cleanup is active work, even though it targets only the temporary namespace.
      // Re-observe both caller authorities after it completes so the final claim does
      // not bless a concurrent caller mutation that happened during cleanup.
      const postCleanupInputsFirst = snapshotGeneratorControllingInputs(ROOT);
      const postCleanupGeneratedFirst = snapshotGeneratedTree(ROOT);
      const postCleanupInputsSecond = snapshotGeneratorControllingInputs(ROOT);
      const postCleanupGeneratedSecond = snapshotGeneratedTree(ROOT);
      assertSnapshotIdentity(
        originalInputs,
        postCleanupInputsFirst,
        'caller controlling source bytes changed before the final freshness claim',
      );
      assertSnapshotIdentity(
        originalInputs,
        postCleanupInputsSecond,
        'caller controlling source bytes changed before the final freshness claim',
      );
      assertSnapshotIdentity(
        postCleanupInputsFirst,
        postCleanupInputsSecond,
        'caller controlling source bytes changed during final revalidation',
      );
      assertSnapshotIdentity(
        originalGenerated,
        postCleanupGeneratedFirst,
        'caller generated bytes changed before the final freshness claim',
      );
      assertSnapshotIdentity(
        originalGenerated,
        postCleanupGeneratedSecond,
        'caller generated bytes changed before the final freshness claim',
      );
      assertSnapshotIdentity(
        postCleanupGeneratedFirst,
        postCleanupGeneratedSecond,
        'caller generated bytes changed during final revalidation',
      );
      process.stdout.write(
        '\nGenerated files are fresh and deterministic; controlling source bytes and '
          + 'caller generated bytes remained unchanged across the check.\n',
      );
    }
  }
}

process.exitCode = main();
