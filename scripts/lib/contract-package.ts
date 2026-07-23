/**
 * Deterministic packaging and verification for the normative JSON contract.
 *
 * `contract/manifest.v1.json` already carries the closed normative-source inventory.
 * This module independently enumerates the source directories, recomputes every
 * per-file JCS digest, recomputes both aggregate identities, and then copies the exact
 * source bytes. The installed tree therefore has one physical contract copy at
 * `dist/contract`; package export aliases point into that tree rather than duplicating it.
 */

import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { canonicalize } from '../../src/core/canonicalize.js';
import { sha256Digest } from '../../src/core/sha256.js';
import { parseJsonSourceStrict } from './strict-json-source.js';
import { buildContractManifest } from './contract-manifest.js';
import {
  compareNormativePathsUtf8,
  enumerateNormativeContractFiles,
} from './normative-source-files.js';

const MANIFEST_FILE = 'manifest.v1.json';

export { enumerateNormativeContractFiles } from './normative-source-files.js';

export interface NormativeSourceRecord {
  readonly path: string;
  readonly digest: string;
}

interface ContractManifest {
  readonly contractDigest?: unknown;
  readonly catalogDigest?: unknown;
  readonly stableSkillCount?: unknown;
  readonly stableSkills?: unknown;
  readonly normativeSources?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function lstatIfPresent(absolute: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function requireDirectDirectory(root: string, label: string): void {
  const stat = lstatSync(root);
  if (stat.isSymbolicLink()) throw new Error(`${label} is a symbolic link`);
  if (!stat.isDirectory()) throw new Error(`${label} is not a directory`);
}

/**
 * Refuse a destination root or nearest existing parent that is an indirect entry.
 *
 * The build workspace and ancestors above that checked parent remain trusted: pathname
 * checks cannot close a TOCTOU race against another principal with rename authority.
 * Within that boundary, this prevents both deleting through a supplied root symlink and
 * creating the package tree through an immediate/nearest symlink parent.
 */
function requireSafeDestinationBoundary(destinationRoot: string): void {
  const absolute = path.resolve(destinationRoot);
  const destinationStat = lstatIfPresent(absolute);
  if (destinationStat?.isSymbolicLink()) {
    throw new Error('packaged contract destination root is a symbolic link');
  }
  if (destinationStat && !destinationStat.isDirectory()) {
    throw new Error('packaged contract destination root is not a directory');
  }

  let ancestor = path.dirname(absolute);
  while (true) {
    const stat = lstatIfPresent(ancestor);
    if (stat) {
      if (stat.isSymbolicLink()) {
        throw new Error('packaged contract nearest existing parent is a symbolic link');
      }
      if (!stat.isDirectory()) {
        throw new Error('packaged contract nearest existing parent is not a directory');
      }
      return;
    }
    const parent = path.dirname(ancestor);
    if (parent === ancestor) {
      throw new Error('packaged contract destination has no existing directory ancestor');
    }
    ancestor = parent;
  }
}

function readJson(absolute: string, label: string): unknown {
  return parseJsonSourceStrict(readFileSync(absolute), label);
}

function manifestRecords(value: unknown, problems: string[]): NormativeSourceRecord[] {
  if (!Array.isArray(value)) {
    problems.push('manifest.normativeSources must be an array');
    return [];
  }
  const records: NormativeSourceRecord[] = [];
  const seen = new Set<string>();
  for (const [index, candidate] of value.entries()) {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      problems.push(`manifest.normativeSources[${index}] must be an object`);
      continue;
    }
    const record = candidate as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (keys.length !== 2 || keys[0] !== 'digest' || keys[1] !== 'path') {
      problems.push(`manifest.normativeSources[${index}] must contain exactly path and digest`);
    }
    if (typeof record.path !== 'string' || !record.path.startsWith('contract/')) {
      problems.push(`manifest.normativeSources[${index}].path must start with contract/`);
      continue;
    }
    const relative = record.path.slice('contract/'.length);
    if (
      relative.length === 0 ||
      relative.startsWith('/') ||
      relative.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
    ) {
      problems.push(`manifest.normativeSources[${index}].path is not a safe relative path`);
      continue;
    }
    if (seen.has(record.path)) {
      problems.push(`manifest.normativeSources contains duplicate path ${record.path}`);
      continue;
    }
    seen.add(record.path);
    if (typeof record.digest !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(record.digest)) {
      problems.push(`manifest.normativeSources[${index}].digest is not a full SHA-256 digest`);
      continue;
    }
    records.push({ path: record.path, digest: record.digest });
  }
  return records;
}

function stringSetDifference(expected: readonly string[], actual: readonly string[]): {
  readonly missing: string[];
  readonly extra: string[];
} {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: expected.filter((entry) => !actualSet.has(entry)),
    extra: actual.filter((entry) => !expectedSet.has(entry)),
  };
}

/**
 * Verify the closed inventory plus per-file, contract, and stable-catalog digests.
 * Returns diagnostics so tests can prove mutations are detected without parsing prose
 * from a thrown exception.
 */
export function contractPackageProblems(contractRoot: string): string[] {
  const problems: string[] = [];
  let actualRelative: string[];
  let manifest: ContractManifest;
  try {
    actualRelative = enumerateNormativeContractFiles(contractRoot);
    const manifestFile = path.join(contractRoot, MANIFEST_FILE);
    const manifestStat = lstatSync(manifestFile);
    if (manifestStat.isSymbolicLink()) {
      throw new Error(`contract/${MANIFEST_FILE} is a symbolic link`);
    }
    if (!manifestStat.isFile()) {
      throw new Error(`contract/${MANIFEST_FILE} is not a regular file`);
    }
    const parsedManifest = readJson(manifestFile, `contract/${MANIFEST_FILE}`);
    if (!isRecord(parsedManifest)) {
      throw new Error(`contract/${MANIFEST_FILE} must contain a JSON object`);
    }
    manifest = parsedManifest as ContractManifest;
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const declared = manifestRecords(manifest.normativeSources, problems);
  const declaredPaths = declared.map((record) => record.path);
  const sortedDeclaredPaths = [...declaredPaths].sort(compareNormativePathsUtf8);
  if (JSON.stringify(declaredPaths) !== JSON.stringify(sortedDeclaredPaths)) {
    problems.push('manifest.normativeSources is not sorted by path');
  }

  const actualPaths = actualRelative.map((relative) => `contract/${relative}`);
  const difference = stringSetDifference(actualPaths, declaredPaths);
  for (const missing of difference.missing) {
    problems.push(`manifest inventory is missing normative source ${missing}`);
  }
  for (const extra of difference.extra) {
    problems.push(`manifest inventory names absent normative source ${extra}`);
  }

  const actualInventory: NormativeSourceRecord[] = [];
  const parsedByRelative = new Map<string, unknown>();
  const declaredByPath = new Map(declared.map((record) => [record.path, record.digest]));
  for (const relative of actualRelative) {
    const manifestPath = `contract/${relative}`;
    try {
      const value = readJson(path.join(contractRoot, relative), manifestPath);
      parsedByRelative.set(relative, value);
      const digest = sha256Digest(canonicalize(value as never));
      actualInventory.push({ path: manifestPath, digest });
      const expectedDigest = declaredByPath.get(manifestPath);
      if (expectedDigest !== undefined && expectedDigest !== digest) {
        problems.push(`${manifestPath} digest differs from manifest inventory`);
      }
    } catch (error) {
      problems.push(`${manifestPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const contractDigest = sha256Digest(canonicalize(actualInventory as never));
  if (manifest.contractDigest !== contractDigest) {
    problems.push('manifest.contractDigest does not match the shipped normative bytes');
  }

  const stableCatalogView: { id: string; revision: unknown; renderer: unknown }[] = [];
  for (const [relative, value] of parsedByRelative.entries()) {
    if (!relative.startsWith('skills/') || !isRecord(value) || value.status !== 'stable') continue;
    if (typeof value.id !== 'string' || value.id.length === 0) {
      problems.push(`contract/${relative}: stable skill id must be a nonempty string`);
      continue;
    }
    if (value.revision === undefined || value.renderer === undefined) {
      problems.push(`contract/${relative}: stable skill identity requires revision and renderer`);
      continue;
    }
    stableCatalogView.push({ id: value.id, revision: value.revision, renderer: value.renderer });
  }
  stableCatalogView.sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  );
  const catalogDigest = sha256Digest(canonicalize(stableCatalogView as never));
  if (manifest.catalogDigest !== catalogDigest) {
    problems.push('manifest.catalogDigest does not match the shipped stable skill bytes');
  }

  if (!Array.isArray(manifest.stableSkills)) {
    problems.push('manifest.stableSkills must be an array');
  } else {
    const manifestCatalogView: { id: unknown; revision: unknown; renderer: unknown }[] = [];
    for (const [index, candidate] of manifest.stableSkills.entries()) {
      if (!isRecord(candidate)) {
        problems.push(`manifest.stableSkills[${index}] must be an object`);
        continue;
      }
      const skill = candidate;
      if (skill.id === undefined || skill.revision === undefined || skill.renderer === undefined) {
        problems.push(`manifest.stableSkills[${index}] requires id, revision, and renderer`);
        continue;
      }
      manifestCatalogView.push({ id: skill.id, revision: skill.revision, renderer: skill.renderer });
    }
    if (canonicalize(manifestCatalogView as never) !== canonicalize(stableCatalogView as never)) {
      problems.push('manifest.stableSkills does not mirror the shipped stable skill identity view');
    }
    if (manifest.stableSkillCount !== manifest.stableSkills.length) {
      problems.push('manifest.stableSkillCount does not equal manifest.stableSkills.length');
    }
  }

  try {
    const requiredRecord = (relative: string): Record<string, unknown> => {
      const value = parsedByRelative.get(relative);
      if (!isRecord(value)) throw new Error(`contract/${relative} must contain a JSON object`);
      return value;
    };
    const skillSources = [...parsedByRelative.entries()]
      .filter(([relative, value]) => relative.startsWith('skills/') && isRecord(value))
      .map(([_relative, value]) => value as Record<string, unknown>);
    const expectedManifest = buildContractManifest({
      skills: skillSources,
      capabilities: requiredRecord('registries/capabilities.v1.json'),
      budgets: requiredRecord('registries/budget-profiles.v1.json'),
      errorCodes: requiredRecord('registries/error-codes.v1.json'),
      semanticValidators: requiredRecord('registries/semantic-validators.v1.json'),
      numericPolicies: requiredRecord('registries/numeric-policies.v1.json'),
      canonicalizations: requiredRecord('registries/canonicalizations.v1.json'),
      disclosures: requiredRecord('registries/disclosures.v1.json'),
      identity: requiredRecord('registries/identity.v1.json'),
      normativeSources: actualInventory,
    });
    if (canonicalize(manifest as never) !== canonicalize(expectedManifest as never)) {
      problems.push('manifest does not equal the exact projection derived from normative sources');
    }
  } catch (error) {
    problems.push(
      `manifest projection could not be derived: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return problems;
}

export function packagedContractRelativeFiles(contractRoot: string): string[] {
  return [MANIFEST_FILE, ...enumerateNormativeContractFiles(contractRoot)];
}

/** Copy exact verified bytes, then independently verify the installed-layout tree. */
export function copyContractForPackage(sourceRoot: string, destinationRoot: string): string[] {
  const sourceProblems = contractPackageProblems(sourceRoot);
  if (sourceProblems.length > 0) {
    throw new Error(`refusing to package an incoherent contract:\n${sourceProblems.join('\n')}`);
  }

  const relativeFiles = packagedContractRelativeFiles(sourceRoot);
  requireSafeDestinationBoundary(destinationRoot);
  rmSync(destinationRoot, { recursive: true, force: true });
  mkdirSync(destinationRoot, { recursive: true, mode: 0o755 });
  requireDirectDirectory(destinationRoot, 'packaged contract destination root');
  for (const relative of relativeFiles) {
    const destination = path.join(destinationRoot, relative);
    mkdirSync(path.dirname(destination), { recursive: true, mode: 0o755 });
    writeFileSync(destination, readFileSync(path.join(sourceRoot, relative)), { mode: 0o644 });
    chmodSync(destination, 0o644);
  }

  const destinationProblems = contractPackageProblems(destinationRoot);
  if (destinationProblems.length > 0) {
    throw new Error(`packaged contract verification failed:\n${destinationProblems.join('\n')}`);
  }
  for (const relative of relativeFiles) {
    const source = readFileSync(path.join(sourceRoot, relative));
    const destination = readFileSync(path.join(destinationRoot, relative));
    if (!source.equals(destination)) {
      throw new Error(`packaged contract is not a byte-for-byte copy: ${relative}`);
    }
  }
  return relativeFiles;
}
