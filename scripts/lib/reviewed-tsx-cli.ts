/**
 * Resolve the exact installed tsx CLI used by the generated-file freshness gate.
 *
 * The isolated generation trees intentionally borrow the caller's installed
 * dependencies through a node_modules symlink. Executing the CLI through that
 * symlink makes the apparent executable path part of the disposable tree and lets
 * an indirect `dist/cli.mjs` escape the reviewed tsx package. Resolve both package
 * and CLI first, then require the CLI to occupy the exact descendant in that
 * canonical package topology.
 */

import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';

const TSX_CLI_RELATIVE_PATH = path.join('dist', 'cli.mjs');

function isStrictDescendant(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== ''
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

/** Resolve `tsx/dist/cli.mjs` after checking the installed topology at this instant. */
export function resolveReviewedTsxCli(repositoryRoot: string): string {
  const canonicalRepositoryRoot = realpathSync.native(repositoryRoot);
  const lexicalNodeModulesRoot = path.join(canonicalRepositoryRoot, 'node_modules');
  const lexicalNodeModulesStat = lstatSync(lexicalNodeModulesRoot);
  if (!lexicalNodeModulesStat.isDirectory() || lexicalNodeModulesStat.isSymbolicLink()) {
    throw new Error('repository node_modules authority is not a direct directory');
  }

  const lexicalPackageRoot = path.join(lexicalNodeModulesRoot, 'tsx');
  const canonicalNodeModulesRoot = realpathSync.native(lexicalNodeModulesRoot);
  if (canonicalNodeModulesRoot !== lexicalNodeModulesRoot) {
    throw new Error('repository node_modules authority is not its exact canonical child');
  }
  const canonicalPackageRoot = realpathSync.native(lexicalPackageRoot);
  const canonicalCli = realpathSync.native(
    path.join(lexicalPackageRoot, TSX_CLI_RELATIVE_PATH),
  );

  if (
    !isStrictDescendant(canonicalNodeModulesRoot, canonicalPackageRoot)
    || path.relative(canonicalNodeModulesRoot, canonicalPackageRoot) !== 'tsx'
  ) {
    throw new Error(
      `reviewed tsx package escapes its canonical node_modules authority: `
        + canonicalPackageRoot,
    );
  }
  if (!isStrictDescendant(canonicalPackageRoot, canonicalCli)) {
    throw new Error(
      `reviewed tsx CLI escapes its canonical package authority: ${canonicalCli}`,
    );
  }
  const relative = path.relative(canonicalPackageRoot, canonicalCli);
  if (relative !== TSX_CLI_RELATIVE_PATH) {
    throw new Error(
      `reviewed tsx CLI has an unexpected canonical package path: ${relative}`,
    );
  }

  const packageStat = lstatSync(canonicalPackageRoot);
  const cliStat = lstatSync(canonicalCli);
  if (!packageStat.isDirectory() || packageStat.isSymbolicLink()) {
    throw new Error('canonical tsx package authority is not a direct directory');
  }
  if (!cliStat.isFile() || cliStat.isSymbolicLink() || cliStat.nlink !== 1) {
    throw new Error(
      'canonical reviewed tsx CLI is not a direct single-link regular file',
    );
  }
  return canonicalCli;
}
