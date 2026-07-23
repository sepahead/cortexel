/**
 * Pure release-identity rules shared by generation, tests, and the release verifier.
 *
 * npm and Python use different normalized spellings for development releases. Keeping
 * that translation executable prevents the generated Python runtime identity from
 * drifting away from the wheel metadata while still preserving the npm SemVer as the
 * cross-language `packageVersion` stamped into Cortexel artifacts.
 */

import Ajv2020, { type AnySchema, type ValidateFunction } from 'ajv/dist/2020.js';

const STRICT_SEMVER_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;

const FULL_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_SCHEMA_PATTERN = '^sha256:[0-9a-f]{64}$';
const COMMON_SHA256_REF =
  'https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256';

export interface ParsedSemVer {
  readonly raw: string;
  readonly major: string;
  readonly minor: string;
  readonly patch: string;
  readonly prerelease: readonly string[];
  readonly build: readonly string[];
}

export function parseStrictSemVer(value: unknown): ParsedSemVer | null {
  if (typeof value !== 'string') return null;
  const match = STRICT_SEMVER_PATTERN.exec(value);
  if (!match) return null;
  return Object.freeze({
    raw: value,
    major: match[1],
    minor: match[2],
    patch: match[3],
    prerelease: Object.freeze(match[4]?.split('.') ?? []),
    build: Object.freeze(match[5]?.split('.') ?? []),
  });
}

export function isFinalCoreSemVer(value: unknown): value is string {
  const parsed = parseStrictSemVer(value);
  return parsed !== null && parsed.prerelease.length === 0 && parsed.build.length === 0;
}

export function isStableContractRelease(value: unknown): boolean {
  const parsed = parseStrictSemVer(value);
  return parsed !== null &&
    parsed.prerelease.length === 0 &&
    parsed.build.length === 0 &&
    parsed.major !== '0';
}

function compareUnsignedDecimal(left: string, right: string): number {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Compare only final SemVer cores. Returns null when either input is not a core. */
export function compareFinalCoreSemVer(left: unknown, right: unknown): number | null {
  const a = parseStrictSemVer(left);
  const b = parseStrictSemVer(right);
  if (!a || !b || a.prerelease.length || a.build.length || b.prerelease.length || b.build.length) {
    return null;
  }
  for (const key of ['major', 'minor', 'patch'] as const) {
    const comparison = compareUnsignedDecimal(a[key], b[key]);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Canonical four-digit Gregorian date used by CFF release metadata. */
export function isCanonicalGregorianDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 &&
    day <= daysInGregorianMonth(year, month);
}

/**
 * Closed RFC 3339 instant profile for release receipts. Leap-second spellings are
 * refused because the JavaScript runtime cannot validate them independently; an
 * explicit offset (or Z) is mandatory, and -00:00 (unknown offset) is not an instant
 * with a known provenance clock.
 */
export function isRfc3339Instant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/u
    .exec(value);
  if (!match || !isCanonicalGregorianDate(`${match[1]}-${match[2]}-${match[3]}`)) {
    return false;
  }
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (hour > 23 || minute > 59 || second > 59 || match[8] === '-00:00') return false;
  if (match[8] !== 'Z') {
    const offsetHour = Number(match[8].slice(1, 3));
    const offsetMinute = Number(match[8].slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }
  return true;
}

/**
 * The only supported cross-ecosystem spellings are a final core and the repository's
 * normalized development form. Other valid SemVer prereleases need an explicit reviewed
 * mapping before they may enter package metadata.
 */
export function npmSemVerToPep440(value: unknown): string | null {
  const parsed = parseStrictSemVer(value);
  if (!parsed || parsed.build.length > 0) return null;
  const core = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  if (parsed.prerelease.length === 0) return core;
  if (
    parsed.prerelease.length === 2 &&
    parsed.prerelease[0] === 'dev' &&
    /^(?:0|[1-9][0-9]*)$/u.test(parsed.prerelease[1])
  ) {
    return `${core}.dev${parsed.prerelease[1]}`;
  }
  return null;
}

export class ReleaseMetadataParseError extends SyntaxError {
  constructor(message: string) {
    super(message);
    this.name = 'ReleaseMetadataParseError';
  }
}

function trimAsciiHorizontal(value: string): string {
  return value.replace(/^[ \t]+|[ \t]+$/gu, '');
}

function canonicalTomlString(
  value: string,
  sourceName: string,
  field: string,
): string {
  const match = /^"([0-9A-Za-z._-]+)"(?:[ \t]*#.*)?$/u.exec(
    trimAsciiHorizontal(value),
  );
  if (!match) {
    throw new ReleaseMetadataParseError(
      `${sourceName}: [project].${field} must be one canonical double-quoted scalar`,
    );
  }
  return match[1];
}

export interface PythonProjectMetadata {
  readonly name: string;
  readonly version: string;
}

function decodeTomlBasicKey(raw: string): string | null {
  let decoded = '';
  for (let index = 0; index < raw.length; index++) {
    const token = raw[index];
    if (token !== '\\') {
      decoded += token;
      continue;
    }
    const escape = raw[++index];
    const simple: Readonly<Record<string, string>> = Object.freeze({
      b: '\b',
      t: '\t',
      n: '\n',
      f: '\f',
      r: '\r',
      '"': '"',
      '\\': '\\',
    });
    if (escape in simple) {
      decoded += simple[escape];
      continue;
    }
    if (escape !== 'u' && escape !== 'U') return null;
    const width = escape === 'u' ? 4 : 8;
    const digits = raw.slice(index + 1, index + 1 + width);
    if (!new RegExp(`^[0-9A-Fa-f]{${width}}$`, 'u').test(digits)) return null;
    const codePoint = Number.parseInt(digits, 16);
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return null;
    decoded += String.fromCodePoint(codePoint);
    index += width;
  }
  return decoded;
}

/** Decode the TOML key grammar needed to detect semantic aliases of identity keys. */
function parseTomlKeyPath(raw: string): readonly string[] | null {
  const parts: string[] = [];
  let index = 0;
  const skipSpace = (): void => {
    while (raw[index] === ' ' || raw[index] === '\t') index++;
  };
  skipSpace();
  while (index < raw.length) {
    let part = '';
    const quote = raw[index];
    if (quote === '"' || quote === "'") {
      index++;
      const start = index;
      let escaped = false;
      while (index < raw.length) {
        if (quote === '"' && raw[index] === '\\') {
          escaped = true;
          index += 2;
          continue;
        }
        if (raw[index] === quote) break;
        index++;
      }
      if (raw[index] !== quote) return null;
      const body = raw.slice(start, index);
      part = quote === "'" ? body : decodeTomlBasicKey(body) ?? '';
      if ((escaped && part.length === 0) || part.length === 0) return null;
      index++;
    } else {
      const match = /^[A-Za-z0-9_-]+/u.exec(raw.slice(index));
      if (!match) return null;
      part = match[0];
      index += part.length;
    }
    parts.push(part);
    skipSpace();
    if (index === raw.length) return parts;
    if (raw[index] !== '.') return null;
    index++;
    skipSpace();
    if (index === raw.length) return null;
  }
  return parts.length > 0 ? parts : null;
}

function topLevelAssignmentIndex(line: string): number {
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index++) {
    const token = line[index];
    if (quote !== null) {
      if (quote === '"' && !escaped && token === '\\') {
        escaped = true;
      } else if (!escaped && token === quote) {
        quote = null;
      } else {
        escaped = false;
      }
      continue;
    }
    if (token === '"' || token === "'") quote = token;
    else if (token === '=') return index;
  }
  return -1;
}

/** Minimal fail-closed reader for the two static PEP 621 fields Cortexel owns. */
export function parsePythonProjectMetadata(
  source: string,
  sourceName = 'python/pyproject.toml',
): PythonProjectMetadata {
  let sectionPath: readonly string[] = [];
  let projectSections = 0;
  const values = new Map<'name' | 'version', string>();

  for (const [index, rawLine] of source.split(/\r?\n/u).entries()) {
    const trimmed = trimAsciiHorizontal(rawLine);
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    const arraySectionMatch = /^\[\[(.+)\]\](?:[ \t]*#.*)?$/u.exec(trimmed);
    const sectionMatch = /^\[(.+)\](?:[ \t]*#.*)?$/u.exec(trimmed);
    if (arraySectionMatch || sectionMatch) {
      const pathText = (arraySectionMatch ?? sectionMatch)![1];
      const parsedPath = parseTomlKeyPath(pathText);
      if (!parsedPath) {
        throw new ReleaseMetadataParseError(
          `${sourceName}:${index + 1}: malformed or unsupported TOML table key`,
        );
      }
      if (parsedPath[0] === 'project' && arraySectionMatch) {
        throw new ReleaseMetadataParseError(
          `${sourceName}:${index + 1}: [project] must be one ordinary table`,
        );
      }
      if (
        parsedPath[0] === 'project' &&
        (parsedPath[1] === 'name' || parsedPath[1] === 'version')
      ) {
        throw new ReleaseMetadataParseError(
          `${sourceName}:${index + 1}: [project].${parsedPath[1]} must be a static scalar, not a table`,
        );
      }
      if (parsedPath.length === 1 && parsedPath[0] === 'project') {
        if (trimAsciiHorizontal(pathText) !== 'project') {
          throw new ReleaseMetadataParseError(
            `${sourceName}:${index + 1}: [project] table header must use the canonical bare key`,
          );
        }
        projectSections++;
      }
      sectionPath = parsedPath;
      continue;
    }

    const assignmentIndex = topLevelAssignmentIndex(trimmed);
    if (assignmentIndex < 0) continue;
    const keyText = trimAsciiHorizontal(trimmed.slice(0, assignmentIndex));
    const valueText = trimAsciiHorizontal(trimmed.slice(assignmentIndex + 1));
    const keyPath = parseTomlKeyPath(keyText);
    if (!keyPath) {
      if (sectionPath.length === 0 || (sectionPath.length === 1 && sectionPath[0] === 'project')) {
        throw new ReleaseMetadataParseError(
          `${sourceName}:${index + 1}: malformed or unsupported TOML key near release identity`,
        );
      }
      continue;
    }
    const effectivePath = [...sectionPath, ...keyPath];
    if (effectivePath.length === 1 && effectivePath[0] === 'project') {
      throw new ReleaseMetadataParseError(
        `${sourceName}:${index + 1}: inline [project] declarations are unsupported`,
      );
    }
    if (effectivePath[0] !== 'project') continue;
    if (effectivePath[1] === 'dynamic') {
      throw new ReleaseMetadataParseError(
        `${sourceName}:${index + 1}: [project].dynamic is incompatible with static release identity`,
      );
    }
    if (effectivePath[1] !== 'name' && effectivePath[1] !== 'version') continue;
    const key = effectivePath[1];
    if (
      sectionPath.length !== 1 ||
      sectionPath[0] !== 'project' ||
      keyPath.length !== 1 ||
      keyText !== key
    ) {
      throw new ReleaseMetadataParseError(
        `${sourceName}:${index + 1}: [project].${key} must use one canonical bare scalar assignment`,
      );
    }
    if (values.has(key)) {
      throw new ReleaseMetadataParseError(
        `${sourceName}:${index + 1}: duplicate [project].${key}`,
      );
    }
    values.set(key, canonicalTomlString(valueText, sourceName, key));
  }

  if (projectSections !== 1) {
    throw new ReleaseMetadataParseError(
      `${sourceName}: expected exactly one [project] table, found ${projectSections}`,
    );
  }
  const name = values.get('name');
  const version = values.get('version');
  if (!name || !version) {
    throw new ReleaseMetadataParseError(
      `${sourceName}: [project] must declare static name and version fields`,
    );
  }
  return Object.freeze({ name, version });
}

export interface CitationReleaseMetadata {
  readonly version: string;
  readonly dateReleased: string;
}

/**
 * Read only Cortexel's two canonical top-level CFF release scalars. This deliberately
 * does not pretend to be a YAML parser: aliases, merges, quoted identity keys, explicit
 * keys, and noncanonical scalar forms are refused rather than partially interpreted.
 */
export function parseCitationReleaseMetadata(
  source: string,
  sourceName = 'CITATION.cff',
): CitationReleaseMetadata {
  const versions: string[] = [];
  const dates: string[] = [];
  for (const [index, rawLine] of source.split(/\r?\n/u).entries()) {
    if (/^\s/u.test(rawLine)) continue;
    if (
      /^(?:<<\s*:|\?\s|["'!&*{[]|-(?:\s|$)|%(?:YAML|TAG)|---(?:\s|$)|\.\.\.(?:\s|$))/u
        .test(rawLine)
    ) {
      throw new ReleaseMetadataParseError(
        `${sourceName}:${index + 1}: noncanonical YAML keys/documents are forbidden in release metadata`,
      );
    }
    // YAML's mapping separator and comment marker use ASCII separation space. JavaScript
    // `\s` is broader (for example it consumes NBSP), while `#` without preceding
    // separation remains part of a plain scalar. Accepting either would let this small
    // release reader observe a different value from a conforming YAML parser.
    const version = /^version:[ \t]+([0-9A-Za-z.+-]+)(?:[ \t]+#.*)?[ \t]*$/u.exec(rawLine);
    const date = /^date-released:[ \t]+(\d{4}-\d{2}-\d{2})(?:[ \t]+#.*)?[ \t]*$/u.exec(rawLine);
    if (version) versions.push(version[1]);
    else if (date) dates.push(date[1]);
    else if (/^(?:version|["']version["'])\s*:/u.test(rawLine)) {
      throw new ReleaseMetadataParseError(
        `${sourceName}:${index + 1}: version must be one plain scalar`,
      );
    } else if (/^(?:date-released|["']date-released["'])\s*:/u.test(rawLine)) {
      throw new ReleaseMetadataParseError(
        `${sourceName}:${index + 1}: date-released must be one canonical YYYY-MM-DD scalar`,
      );
    }
  }
  if (versions.length !== 1) {
    throw new ReleaseMetadataParseError(
      `${sourceName}: expected exactly one top-level version, found ${versions.length}`,
    );
  }
  if (dates.length !== 1) {
    throw new ReleaseMetadataParseError(
      `${sourceName}: expected exactly one top-level date-released, found ${dates.length}`,
    );
  }
  if (!isCanonicalGregorianDate(dates[0])) {
    throw new ReleaseMetadataParseError(
      `${sourceName}: date-released is not a real canonical Gregorian date`,
    );
  }
  return Object.freeze({ version: versions[0], dateReleased: dates[0] });
}

/** Compatibility helper for callers that only consume the CFF release version. */
export function parseCitationVersion(
  source: string,
  sourceName = 'CITATION.cff',
): string {
  return parseCitationReleaseMetadata(source, sourceName).version;
}

export interface PackageDistributionIdentity {
  readonly packageName: unknown;
  readonly packageVersion: unknown;
  readonly packagePrivate: unknown;
  readonly publishConfigPresent: boolean;
  readonly packageNodeEngine: unknown;
  readonly pythonProjectName: unknown;
  readonly pythonProjectVersion: unknown;
}

export const SUPPORTED_NODE_ENGINE_RANGE = '^22.0.0 || ^24.0.0 || ^26.0.0';

/** Rules that apply to both an intentionally private development tree and a release. */
export function packageDistributionIdentityProblems(
  identity: PackageDistributionIdentity,
): string[] {
  const problems: string[] = [];
  if (identity.packageName !== 'cortexel') problems.push('package name must be "cortexel"');
  if (identity.pythonProjectName !== 'cortexel') {
    problems.push('Python project name must be "cortexel"');
  }
  const parsed = parseStrictSemVer(identity.packageVersion);
  if (!parsed) {
    problems.push('package version must be strict SemVer 2.0.0');
  }
  const expectedPython = npmSemVerToPep440(identity.packageVersion);
  if (parsed && expectedPython === null) {
    problems.push(
      'package version must be a final core or normalized development SemVer (-dev.N)',
    );
  }
  if (expectedPython !== null && identity.pythonProjectVersion !== expectedPython) {
    problems.push(
      `Python project version must be the normalized PEP 440 spelling ${JSON.stringify(expectedPython)}`,
    );
  }
  if (identity.packagePrivate !== true && identity.packagePrivate !== false) {
    problems.push('package private must be an explicit boolean');
  }
  if (parsed && parsed.prerelease.length > 0 && identity.packagePrivate !== true) {
    problems.push('a development/prerelease package must remain private');
  }
  if (identity.publishConfigPresent) {
    problems.push('publishConfig must be absent; publication policy is not package metadata');
  }
  if (identity.packageNodeEngine !== SUPPORTED_NODE_ENGINE_RANGE) {
    problems.push(
      `package engines.node must be exactly ${JSON.stringify(SUPPORTED_NODE_ENGINE_RANGE)}`,
    );
  }
  return problems;
}

export interface GitReleaseState {
  readonly headCommit: string | null;
  readonly worktreeClean: boolean;
  readonly tag: {
    readonly name: string;
    readonly objectType: string;
    readonly resolvedCommit: string | null;
    readonly taggerDateReleased: string | null;
  } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const RELEASE_SOURCE_REVISION_PATTERN = '^[0-9a-f]{40}$';
const RELEASE_PACKAGE_VERSION_PATTERN =
  '^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)$';
const BUILD_IDENTITY_KEYS = Object.freeze([
  'packageVersion',
  'requestContract',
  'artifactContract',
  'contractDigest',
  'catalogDigest',
  'sourceRevision',
  'release',
] as const);

function sameStringSet(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value) &&
    value.every((entry): entry is string => typeof entry === 'string') &&
    value.length === expected.length &&
    [...value].sort().every((entry, index) => entry === [...expected].sort()[index]);
}

const ROOT_SCHEMA_KEYS = new Set([
  '$schema',
  '$id',
  '$comment',
  '$defs',
  'title',
  'description',
  'default',
  'examples',
  'deprecated',
  'readOnly',
  'writeOnly',
  'type',
  'properties',
  'required',
  'additionalProperties',
]);

const SCHEMA_ANNOTATION_KEYS = new Set([
  '$comment',
  'title',
  'description',
  'default',
  'examples',
  'deprecated',
  'readOnly',
  'writeOnly',
]);

function validationKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value)
    .filter((key) => !SCHEMA_ANNOTATION_KEYS.has(key))
    .sort();
}

function isExactInlineSha256Schema(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return sameStringSet(validationKeys(value), ['type', 'pattern']) &&
    value.type === 'string' && value.pattern === SHA256_SCHEMA_PATTERN;
}

function buildIdentityDigestAuthorityProblem(
  buildIdentity: Record<string, unknown>,
  referencedSchemas: readonly unknown[],
): string | null {
  const properties = buildIdentity.properties;
  if (!isRecord(properties)) return 'FigureArtifactV1 buildIdentity properties are missing';
  for (const key of ['contractDigest', 'catalogDigest'] as const) {
    const digest = properties[key];
    if (isExactInlineSha256Schema(digest)) continue;
    if (
      !isRecord(digest) ||
      !sameStringSet(validationKeys(digest), ['$ref']) ||
      digest.$ref !== COMMON_SHA256_REF
    ) {
      return (
        `FigureArtifactV1 buildIdentity.${key} must use the exact lowercase SHA-256 ` +
        'schema or the canonical common-schema reference'
      );
    }
    const common = referencedSchemas.find((candidate) =>
      isRecord(candidate) &&
      candidate.$id === COMMON_SHA256_REF.slice(0, COMMON_SHA256_REF.indexOf('#')));
    const definition = isRecord(common) && isRecord(common.$defs)
      ? common.$defs.sha256
      : undefined;
    if (!isExactInlineSha256Schema(definition)) {
      return 'the referenced common-schema SHA-256 authority is missing or not exact';
    }
  }
  return null;
}

/** Keep identity reachability local to the property this gate independently compiles. */
function artifactRootAuthorityProblem(schema: Record<string, unknown>): string | null {
  const unknownRootKeyword = Object.keys(schema).find((key) => !ROOT_SCHEMA_KEYS.has(key));
  if (unknownRootKeyword !== undefined) {
    return (
      `FigureArtifactV1 root keyword ${JSON.stringify(unknownRootKeyword)} is outside the ` +
      'closed direct-object release-gate profile'
    );
  }
  if (
    schema.type !== 'object' ||
    schema.additionalProperties !== false ||
    !isRecord(schema.properties) ||
    !sameStringSet(schema.required, Object.keys(schema.properties)) ||
    !Object.hasOwn(schema.properties, 'buildIdentity')
  ) {
    return (
      'FigureArtifactV1 root must be a closed object requiring every declared property, ' +
      'including buildIdentity'
    );
  }
  return null;
}

/**
 * Require one reviewable, direct discriminated union. Merely finding a strict-looking
 * fragment somewhere under nested `anyOf`/`allOf` is unsound: that fragment may be dead
 * while a different broad branch admits arbitrary release claims.
 */
function releaseIdentityBranchProblem(buildIdentity: Record<string, unknown>): string | null {
  const alternatives = buildIdentity.oneOf;
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    return 'FigureArtifactV1 buildIdentity must use a direct oneOf release/development identity union';
  }

  let releaseBranches = 0;
  for (const [index, alternative] of alternatives.entries()) {
    if (!isRecord(alternative) || alternative.type !== 'object' ||
        !isRecord(alternative.properties) || !Array.isArray(alternative.required)) {
      return `FigureArtifactV1 buildIdentity.oneOf[${index}] is not an explicit identity branch`;
    }
    const properties = alternative.properties;
    const required = alternative.required;
    const release = properties.release;
    const sourceRevision = properties.sourceRevision;
    if (!isRecord(release) || !required.includes('release') ||
        !required.includes('sourceRevision')) {
      return `FigureArtifactV1 buildIdentity.oneOf[${index}] does not bind the release/sourceRevision pair`;
    }

    if (release.const === true) {
      const packageVersion = properties.packageVersion;
      if (
        !required.includes('packageVersion') ||
        !isRecord(packageVersion) ||
        packageVersion.type !== 'string' ||
        packageVersion.pattern !== RELEASE_PACKAGE_VERSION_PATTERN ||
        !isRecord(sourceRevision) ||
        sourceRevision.type !== 'string' ||
        sourceRevision.pattern !== RELEASE_SOURCE_REVISION_PATTERN
      ) {
        return (
          `FigureArtifactV1 buildIdentity.oneOf[${index}] must bind release=true to a final ` +
          `packageVersion and required string sourceRevision pattern ${RELEASE_SOURCE_REVISION_PATTERN}`
        );
      }
      releaseBranches++;
    } else if (
      release.const !== false ||
      !isRecord(sourceRevision) ||
      sourceRevision.const !== 'unreleased-worktree'
    ) {
      return (
        `FigureArtifactV1 buildIdentity.oneOf[${index}] must be either the exact release ` +
        'identity branch or release=false/sourceRevision="unreleased-worktree"'
      );
    }
  }
  return releaseBranches > 0
    ? null
    : 'FigureArtifactV1 buildIdentity has no explicit release=true identity branch';
}

export interface ArtifactReleaseSchemaContext {
  readonly packageVersion?: unknown;
  readonly sourceRevision?: unknown;
  readonly referencedSchemas?: readonly unknown[];
  readonly artifactWitness?: unknown;
  readonly expectedBuildIdentity?: unknown;
}

function compileBuildIdentitySchema(
  buildIdentity: Record<string, unknown>,
  referencedSchemas: readonly unknown[],
): ValidateFunction {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateSchema: true,
  });
  for (const referenced of referencedSchemas) ajv.addSchema(referenced as AnySchema);
  return ajv.compile(buildIdentity as AnySchema);
}

function compileArtifactSchema(
  schema: Record<string, unknown>,
  referencedSchemas: readonly unknown[],
): ValidateFunction {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateSchema: true,
  });
  for (const referenced of referencedSchemas) ajv.addSchema(referenced as AnySchema);
  return ajv.compile(schema as AnySchema);
}

function releaseBuildIdentityWitness(
  buildIdentity: Record<string, unknown>,
  context: ArtifactReleaseSchemaContext,
): Record<string, unknown> {
  const packageVersion = isFinalCoreSemVer(context.packageVersion)
    ? context.packageVersion
    : '0.0.0';
  const sourceRevision = typeof context.sourceRevision === 'string' &&
    FULL_COMMIT_PATTERN.test(context.sourceRevision)
    ? context.sourceRevision
    : '0000000000000000000000000000000000000000';
  const properties = isRecord(buildIdentity.properties) ? buildIdentity.properties : {};
  const requestContract = isRecord(properties.requestContract)
    ? properties.requestContract.const
    : undefined;
  const artifactContract = isRecord(properties.artifactContract)
    ? properties.artifactContract.const
    : undefined;
  return {
    packageVersion,
    requestContract,
    artifactContract,
    contractDigest: `sha256:${'0'.repeat(64)}`,
    catalogDigest: `sha256:${'0'.repeat(64)}`,
    sourceRevision,
    release: true,
  };
}

/**
 * Source-derived capability gate. A version switch cannot override an artifact schema
 * whose only legal identity is an unreleased worktree. Passing proves only that one
 * explicit complete witness satisfies the full schema with the requested exact release
 * identity and that mismatched identity forms are rejected. It is not evidence that a
 * producer emitted or verified the witness. A future release change must wire a real
 * producer artifact and its execution evidence rather than synthesize one in this gate.
 */
export function artifactReleaseStampingProblems(
  schema: unknown,
  context: ArtifactReleaseSchemaContext = {},
): string[] {
  if (!isRecord(schema) || !isRecord(schema.properties)) {
    return ['FigureArtifactV1 schema is missing its root properties'];
  }
  const buildIdentity = schema.properties.buildIdentity;
  if (!isRecord(buildIdentity) || !isRecord(buildIdentity.properties)) {
    return ['FigureArtifactV1 schema is missing buildIdentity authority'];
  }
  const release = buildIdentity.properties.release;
  const sourceRevision = buildIdentity.properties.sourceRevision;
  if (
    isRecord(release) &&
    release.const === false &&
    isRecord(sourceRevision) &&
    sourceRevision.const === 'unreleased-worktree'
  ) {
    return [
      'release stamping is unavailable: FigureArtifactV1 permits only release=false and sourceRevision="unreleased-worktree"',
    ];
  }
  const rootProblem = artifactRootAuthorityProblem(schema);
  if (rootProblem !== null) return [rootProblem];
  if (
    buildIdentity.type !== 'object' ||
    buildIdentity.additionalProperties !== false ||
    Object.hasOwn(buildIdentity, 'patternProperties') ||
    !sameStringSet(buildIdentity.required, BUILD_IDENTITY_KEYS) ||
    !sameStringSet(Object.keys(buildIdentity.properties), BUILD_IDENTITY_KEYS)
  ) {
    return [
      'FigureArtifactV1 buildIdentity must be a closed object with exactly the seven required identity axes',
    ];
  }
  const branchProblem = releaseIdentityBranchProblem(buildIdentity);
  if (branchProblem !== null) return [branchProblem];
  const digestProblem = buildIdentityDigestAuthorityProblem(
    buildIdentity,
    context.referencedSchemas ?? [],
  );
  if (digestProblem !== null) return [digestProblem];

  const requestContract = buildIdentity.properties.requestContract;
  const artifactContract = buildIdentity.properties.artifactContract;
  if (
    !isRecord(requestContract) ||
    typeof requestContract.const !== 'string' ||
    requestContract.const.length === 0 ||
    !isRecord(artifactContract) ||
    typeof artifactContract.const !== 'string' ||
    artifactContract.const.length === 0 ||
    requestContract.const === artifactContract.const
  ) {
    return [
      'FigureArtifactV1 buildIdentity must bind distinct nonblank requestContract and artifactContract constants',
    ];
  }

  let validate: ValidateFunction;
  try {
    validate = compileBuildIdentitySchema(buildIdentity, context.referencedSchemas ?? []);
  } catch {
    return ['FigureArtifactV1 buildIdentity schema is not independently strict-compilable'];
  }

  const witness = releaseBuildIdentityWitness(buildIdentity, context);
  if (!validate(witness)) {
    return [
      'FigureArtifactV1 release branch is dead or does not admit the exact release=true/full-SHA identity witness',
    ];
  }

  const forbiddenWitnesses: readonly [string, Record<string, unknown>][] = [
    [
      'release=true with the unreleased-worktree sentinel',
      { ...witness, sourceRevision: 'unreleased-worktree' },
    ],
    [
      'release=false with a full source revision',
      { ...witness, release: false },
    ],
    [
      'release=true with a non-string source revision',
      { ...witness, sourceRevision: 0 },
    ],
    ['release=true with a short source revision', { ...witness, sourceRevision: 'a'.repeat(39) }],
    ['release=true with an uppercase source revision', { ...witness, sourceRevision: 'A'.repeat(40) }],
    ['release=true with a prerelease package version', { ...witness, packageVersion: '1.0.0-rc.1' }],
    ['release identity with an invalid contract digest', { ...witness, contractDigest: `sha256:${'0'.repeat(63)}` }],
    ['release identity with an invalid catalog digest', { ...witness, catalogDigest: `sha256:${'0'.repeat(63)}` }],
    ['release identity with a mismatched request contract', { ...witness, requestContract: `${String(witness.requestContract)}-other` }],
    ['release identity with a mismatched artifact contract', { ...witness, artifactContract: `${String(witness.artifactContract)}-other` }],
    ...BUILD_IDENTITY_KEYS.map((missing): [string, Record<string, unknown>] => [
      `release identity without ${missing}`,
      Object.fromEntries(Object.entries(witness).filter(([key]) => key !== missing)),
    ]),
    [
      'release identity with an unknown member',
      { ...witness, unownedReleaseClaim: true },
    ],
  ];
  for (const [description, forbidden] of forbiddenWitnesses) {
    if (validate(forbidden)) {
      return [`FigureArtifactV1 ambiguously accepts ${description}`];
    }
  }

  // A live identity branch is not enough: another required root property could be
  // `false`, making complete artifacts impossible. Require one caller-supplied complete
  // artifact and bind its identity to values independently requested by the release
  // gate. This proves one schema witness only. It is not evidence that a producer ran,
  // that the artifact is authentic, or that every request can be produced.
  const expected = context.expectedBuildIdentity;
  if (
    !isRecord(expected) ||
    !sameStringSet(Object.keys(expected), BUILD_IDENTITY_KEYS) ||
    expected.packageVersion !== context.packageVersion ||
    expected.sourceRevision !== context.sourceRevision ||
    expected.release !== true ||
    expected.requestContract !== requestContract.const ||
    expected.artifactContract !== artifactContract.const ||
    typeof expected.contractDigest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/u.test(expected.contractDigest) ||
    typeof expected.catalogDigest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/u.test(expected.catalogDigest)
  ) {
    return [
      'release-capable FigureArtifactV1 requires one exact independently requested buildIdentity',
    ];
  }
  const artifactWitness = context.artifactWitness;
  if (!isRecord(artifactWitness) || !isRecord(artifactWitness.buildIdentity)) {
    return [
      'release-capable FigureArtifactV1 requires one explicit complete artifact witness',
    ];
  }
  const witnessIdentity = artifactWitness.buildIdentity;
  if (!BUILD_IDENTITY_KEYS.every((key) => witnessIdentity[key] === expected[key]) ||
      !sameStringSet(Object.keys(witnessIdentity), BUILD_IDENTITY_KEYS)) {
    return ['complete artifact witness buildIdentity does not equal the requested release identity'];
  }
  let validateArtifact: ValidateFunction;
  try {
    validateArtifact = compileArtifactSchema(schema, context.referencedSchemas ?? []);
  } catch {
    return ['FigureArtifactV1 full schema is not strict-compilable with its references'];
  }
  if (!validateArtifact(artifactWitness)) {
    return ['complete release artifact witness does not satisfy the full FigureArtifactV1 schema'];
  }
  return [];
}

export interface ReleaseVerificationInput extends PackageDistributionIdentity {
  readonly citationVersion: unknown;
  readonly citationDateReleased: unknown;
  readonly ledgerProject: unknown;
  readonly ledgerCurrentRelease: unknown;
  readonly unmetReleaseGateIds: readonly string[];
  readonly releaseEvidenceSourceProblems: readonly string[];
  /** Candidate commit returned by the evidence-source audit; must bind the artifact. */
  readonly releaseEvidenceSourceCommit: unknown;
  /** Commit whose exact package/artifact tree was tested; stable tags authorize it later. */
  readonly artifactSourceRevision: unknown;
  readonly artifactSchema: unknown;
  readonly artifactSchemaReferences?: readonly unknown[];
  readonly releaseArtifactWitness?: unknown;
  readonly expectedReleaseBuildIdentity?: unknown;
  readonly git: GitReleaseState;
}

/**
 * Pure final-release gate. Git facts are injected so every refusal can be tested without
 * creating, moving, signing, or deleting a real tag.
 */
export function releaseVerificationProblems(input: ReleaseVerificationInput): string[] {
  const problems = packageDistributionIdentityProblems(input);
  problems.push(...artifactReleaseStampingProblems(input.artifactSchema, {
    packageVersion: input.packageVersion,
    sourceRevision: input.artifactSourceRevision,
    referencedSchemas: input.artifactSchemaReferences,
    artifactWitness: input.releaseArtifactWitness,
    expectedBuildIdentity: input.expectedReleaseBuildIdentity,
  }));
  const version = input.packageVersion;

  if (!isFinalCoreSemVer(version)) {
    problems.push('release package version must be a final core SemVer (X.Y.Z)');
  }
  if (input.packagePrivate !== false) {
    problems.push('release package must set private to false explicitly');
  }
  if (!isFinalCoreSemVer(input.citationVersion)) {
    problems.push('CITATION.cff version must be a final core SemVer');
  }
  if (!isCanonicalGregorianDate(input.citationDateReleased)) {
    problems.push('CITATION.cff date-released must be one real YYYY-MM-DD Gregorian date');
  }
  if (input.ledgerProject !== 'cortexel') {
    problems.push('release ledger project must be "cortexel"');
  }
  if (!isFinalCoreSemVer(input.ledgerCurrentRelease)) {
    problems.push('ledger currentRelease must be a final core SemVer');
  }

  if (isFinalCoreSemVer(version)) {
    const expectedPython = npmSemVerToPep440(version);
    if (input.pythonProjectVersion !== expectedPython) {
      problems.push('package and Python release versions must agree exactly');
    }
    if (input.citationVersion !== version) {
      problems.push('package and CITATION.cff release versions must agree exactly');
    }
    if (input.ledgerCurrentRelease !== version) {
      problems.push('package and ledger currentRelease must agree exactly');
    }
    if (isStableContractRelease(version)) {
      const unmetGateIds: unknown = input.unmetReleaseGateIds;
      if (
        !Array.isArray(unmetGateIds) ||
        unmetGateIds.some((id) => typeof id !== 'string' || !/^R[0-9]{3}$/u.test(id)) ||
        new Set(unmetGateIds).size !== unmetGateIds.length
      ) {
        problems.push('stable release unmet-gate audit must be an R### string-array result');
      } else if (unmetGateIds.length > 0) {
        problems.push(
          `stable release has ${unmetGateIds.length} unmet release-blocking ledger gate(s)`,
        );
      }
      if (
        typeof input.artifactSourceRevision !== 'string' ||
        !FULL_COMMIT_PATTERN.test(input.artifactSourceRevision)
      ) {
        problems.push('stable release artifactSourceRevision must be one full lowercase commit SHA');
      } else if (input.artifactSourceRevision === input.git.headCommit) {
        problems.push(
          'stable release artifactSourceRevision must be tested candidate A, not authorization HEAD B',
        );
      }
      if (
        typeof input.releaseEvidenceSourceCommit !== 'string' ||
        !FULL_COMMIT_PATTERN.test(input.releaseEvidenceSourceCommit)
      ) {
        problems.push('stable release evidence audit must return one full candidate commit A');
      } else if (input.releaseEvidenceSourceCommit !== input.artifactSourceRevision) {
        problems.push('stable release artifactSourceRevision must equal the audited candidate commit A');
      }
      const evidenceProblems: unknown = input.releaseEvidenceSourceProblems;
      if (
        !Array.isArray(evidenceProblems) ||
        evidenceProblems.some((problem) => typeof problem !== 'string' || problem.length === 0)
      ) {
        problems.push('stable release evidence-source audit must be a string-array result');
      } else {
        problems.push(...evidenceProblems);
      }
    }

    const expectedTag = `v${version}`;
    if (input.git.tag === null) {
      problems.push(`exact release tag refs/tags/${expectedTag} does not exist`);
    } else {
      if (input.git.tag.name !== expectedTag) {
        problems.push(`release tag must be named exactly ${expectedTag}`);
      }
      if (input.git.tag.objectType !== 'tag') {
        problems.push(`refs/tags/${expectedTag} must be an annotated tag object`);
      }
      if (!isCanonicalGregorianDate(input.git.tag.taggerDateReleased)) {
        problems.push(`refs/tags/${expectedTag} must carry one valid annotated-tag date`);
      } else if (input.git.tag.taggerDateReleased !== input.citationDateReleased) {
        problems.push(`refs/tags/${expectedTag} tagger date must equal CITATION.cff date-released`);
      }
      if (
        input.git.headCommit === null ||
        !FULL_COMMIT_PATTERN.test(input.git.headCommit)
      ) {
        problems.push('HEAD must resolve to one full lowercase commit SHA');
      }
      if (
        input.git.tag.resolvedCommit === null ||
        !FULL_COMMIT_PATTERN.test(input.git.tag.resolvedCommit)
      ) {
        problems.push(`refs/tags/${expectedTag} must peel to one full lowercase commit SHA`);
      } else if (input.git.tag.resolvedCommit !== input.git.headCommit) {
        problems.push(`refs/tags/${expectedTag} must resolve to HEAD`);
      }
    }
  }

  if (!input.git.worktreeClean) {
    problems.push('release worktree and index must be clean, including untracked files');
  }
  return [...new Set(problems)];
}
