// Verify the artifact consumers actually install, not just source imports.
// Runs in an isolated temp project: core first with only normal dependencies,
// then every React subpath after installing the documented optional peers.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  accessSync,
  chmodSync,
  closeSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  opendirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import {
  CORTEXEL_SKILL_VERSION,
  PARAM_CONSTRAINT_LANGUAGE,
} from '../core/skills/registry';
import { NEST_SKILL_IDS } from '../core/skills/skillIds';
import { CORTEXEL_SPEC_VERSION } from '../core/vizSpec';
import { canonicalize } from '../src/core/canonicalize';
import { getBudgetLimits } from '../src/core/limits';
import { parseJsonStrict, type JsonValue } from '../src/core/parse-json';
import { serializeManifest } from './emit-manifest';
import { packagedContractRelativeFiles } from './lib/contract-package';

const root = resolve(import.meta.dirname, '..');
const fixtureRoot = join(root, 'scripts', 'fixtures', 'package-smoke');
const fixtureManifestPath = join(fixtureRoot, 'package.json');
const fixtureLockPath = join(fixtureRoot, 'package-lock.json');
const PREPARED_STATE_SCHEMA = 'cortexel-package-smoke-prepared.v1' as const;
const PHASE_OUTPUT_SCHEMA = 'cortexel-package-smoke-phase.v1' as const;
const STATE_FILENAME = 'package-smoke-state.v1.json';
const PACK_RESULT_FILENAME = 'pack-result.v1.json';
const NETWORK_GUARD_FILENAME = 'network-and-write-guard.cjs';
const LOCAL_TARBALL_FILENAME = 'cortexel-smoke.tgz';
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_TREE_ENTRIES = 200_000;
const MAX_TREE_BYTES = 4 * 1024 * 1024 * 1024;
const SUPPORTED_NODE_MAJORS = new Set([22, 24, 26]);
export const PACKAGE_TARBALL_LIMITS = Object.freeze({
  compressedBytes: 128 * 1024 * 1024,
  uncompressedBytes: 512 * 1024 * 1024,
  fileBytes: 128 * 1024 * 1024,
  entries: 10_000,
  tarPathBytes: 99,
  sourceNodes: 20_000,
  sourceDepth: 32,
  directoryEntries: 10_000,
});
const NPM_PORTABLE_MTIME_SECONDS = 499_162_500;
const NPM_GZIP_HEADER = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff]);

let commandEnvironment: NodeJS.ProcessEnv | undefined;

function run(command: string, args: string[], cwd: string): string {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      env: commandEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5 * 60_000,
    }).trim();
  } catch (error) {
    const detail = error instanceof Error && 'stderr' in error
      ? String((error as Error & { stderr?: string | Buffer }).stderr ?? '').trim()
      : '';
    throw new Error(
      `${command} failed${detail ? `: ${detail.slice(0, 8_192)}` : ''}`,
      { cause: error },
    );
  }
}

function runResult(command: string, args: string[], cwd: string): {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
} {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: commandEnvironment,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5 * 60_000,
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

const EXPECTED_FIXTURE_MANIFEST_SHA256 =
  '8507e234f5f9b9ebed89339d172b57f89ec558b279f6cd2930564322cdbb5be8';
const EXPECTED_FIXTURE_LOCK_SHA256 =
  '1b1f20245812f21d5353635a7e9242450ec4fb042af07efb9f4f48548c15428e';
const EXPECTED_DEV_DEPENDENCIES = Object.freeze({
  '@types/node': '20.19.43',
  '@types/react': '19.2.17',
  '@types/react-dom': '19.2.3',
  react: '19.2.7',
  'react-dom': '19.2.7',
  typescript: '5.9.3',
});
const EXPECTED_OPTIONAL_DEPENDENCIES = Object.freeze({
  '@react-three/fiber': '9.6.1',
  '@types/three': '0.185.1',
  'd3-force-3d': '3.0.6',
  three: '0.185.1',
});
const EXPECTED_PACKAGE_FILE_ENTRIES = Object.freeze([
  'dist',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'LICENSES',
  'CHANGELOG.md',
]);
const JSON_LIMITS = Object.freeze({
  ...getBudgetLimits('standard'),
  rawInputBytes: MAX_JSON_BYTES,
  jsonDepth: 64,
  jsonTotalNodes: 200_000,
  jsonStringLength: 2 * 1024 * 1024,
  jsonNumberTokenLength: 128,
  jsonObjectKeys: 100_000,
  jsonArrayItems: 100_000,
});
const NPM_CI_FLAGS = [
  'ci',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
  '--legacy-peer-deps',
  '--install-strategy=nested',
  '--registry=https://registry.npmjs.org/',
] as const;

type SmokePhase = 'prepare' | 'execute';

interface SmokeInvocation {
  readonly command: 'all' | SmokePhase;
  readonly workspace?: string;
  readonly nodeExecutable?: string;
  readonly npmExecutable?: string;
  readonly expectedStateDigest?: string;
}

export interface PackedFile {
  readonly path: string;
  readonly size: number;
  readonly mode: number;
}

export interface PackedResult {
  readonly name: string;
  readonly version: string;
  readonly size: number;
  readonly unpackedSize: number;
  readonly shasum: string;
  readonly integrity: string;
  readonly filename: string;
  readonly files: readonly PackedFile[];
  readonly entryCount: number;
}

export interface ExpectedPackageFile extends PackedFile {
  readonly digest: string;
}

export interface PackageTarballInspection {
  readonly compressedBytes: number;
  readonly uncompressedBytes: number;
  readonly fileBytes: number;
  readonly entryCount: number;
  readonly treeDigest: string;
}

interface WorkspaceSeal {
  readonly digest: string;
  readonly entryCount: number;
  readonly fileCount: number;
  readonly byteCount: number;
}

interface PreparedState {
  readonly schema: typeof PREPARED_STATE_SCHEMA;
  readonly workspace: string;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly packageVersion: string;
  readonly artifactIntegrity: string;
  readonly artifactSha256: string;
  readonly fixtureManifestSha256: string;
  readonly fixtureLockSha256: string;
  readonly packResultSha256: string;
  readonly nodeExecutable: string;
  readonly nodeVersion: string;
  readonly npmExecutable: string;
  readonly npmVersion: string;
  readonly coreConsumer: string;
  readonly chartsConsumer: string;
  readonly consumer: string;
  readonly unrelatedDirectory: string;
  readonly nodeModules: readonly [string, string, string];
  readonly workspaceSeal: WorkspaceSeal;
  readonly readOnlyWorkspace: boolean;
}

export interface PackageSmokePhaseOutput {
  readonly schema: typeof PHASE_OUTPUT_SCHEMA;
  readonly phase: SmokePhase;
  readonly status: 'prepared' | 'passed';
  readonly workspace: string;
  readonly stateFile: string;
  readonly stateDigest: string;
  readonly packageVersion: string;
  readonly artifactIntegrity: string;
  readonly nodeExecutable: string;
  readonly nodeModules: readonly [string, string, string];
  readonly workspaceSeal: string;
}

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, JsonValue>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (canonicalize(actual) !== canonicalize(wanted)) {
    fail(`${label} has unexpected keys: ${actual.join(', ')}`);
  }
}

function strictJson(text: string, label: string): JsonValue {
  const parsed = parseJsonStrict(text, { limits: JSON_LIMITS });
  if (!parsed.ok) {
    fail(`${label} is not strict JSON: ${parsed.errors[0]?.message ?? 'unknown parse error'}`);
  }
  return parsed.value;
}

function readStrictJson(path: string, label: string): JsonValue {
  const raw = readFileSync(path);
  if (raw.byteLength > MAX_JSON_BYTES) fail(`${label} exceeds the JSON byte budget`);
  return strictJson(raw.toString('utf8'), label);
}

function parseCanonicalJsonBuffer(raw: Buffer, label: string): JsonValue {
  if (raw.byteLength > MAX_JSON_BYTES) fail(`${label} exceeds the JSON byte budget`);
  const text = raw.toString('utf8');
  const parsed = strictJson(text, label);
  if (text !== `${canonicalize(parsed)}\n`) fail(`${label} is not canonical JSON`);
  return parsed;
}

function sha256(raw: string | Buffer): string {
  return `sha256:${createHash('sha256').update(raw).digest('hex')}`;
}

function sha512Integrity(raw: Buffer): string {
  return `sha512-${createHash('sha512').update(raw).digest('base64')}`;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(raw: Buffer): number {
  let value = 0xffff_ffff;
  for (const byte of raw) value = CRC32_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8);
  return (value ^ 0xffff_ffff) >>> 0;
}

function allZero(raw: Buffer): boolean {
  return raw.every((byte) => byte === 0);
}

function assertZeroField(raw: Buffer, label: string): void {
  if (!allZero(raw)) fail(`${label} must be empty`);
}

function parseCanonicalTarOctal(raw: Buffer, digits: number, label: string): number {
  if (
    raw.byteLength !== digits + 2 ||
    raw[digits] !== 0x20 ||
    raw[digits + 1] !== 0 ||
    !raw.subarray(0, digits).every((byte) => byte >= 0x30 && byte <= 0x37)
  ) {
    fail(`${label} is not canonical octal`);
  }
  const value = Number.parseInt(raw.subarray(0, digits).toString('ascii'), 8);
  if (!Number.isSafeInteger(value)) fail(`${label} exceeds the safe integer domain`);
  return value;
}

function parseCanonicalTarName(raw: Buffer): string {
  const terminator = raw.indexOf(0);
  if (terminator <= 0 || terminator > PACKAGE_TARBALL_LIMITS.tarPathBytes) {
    fail('package tar path is missing its canonical terminator');
  }
  if (!allZero(raw.subarray(terminator))) fail('package tar path has nonzero suffix bytes');
  const nameBytes = raw.subarray(0, terminator);
  if (!nameBytes.every((byte) => byte >= 0x21 && byte <= 0x7e)) {
    fail('package tar path must use printable ASCII');
  }
  return nameBytes.toString('ascii');
}

function isCanonicalArtifactSegment(segment: string): boolean {
  if (!/^[A-Za-z0-9_@.+-]+$/u.test(segment) || segment === '.' || segment === '..' ||
      segment.endsWith('.')) return false;
  const basenameBeforeDot = segment.split('.')[0]!.toUpperCase();
  return !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u.test(basenameBeforeDot);
}

function assertCanonicalArtifactPath(path: string, label: string): void {
  if (
    path.length === 0 ||
    Buffer.byteLength(path, 'ascii') !== path.length ||
    Buffer.byteLength(`package/${path}`, 'ascii') > PACKAGE_TARBALL_LIMITS.tarPathBytes ||
    path.startsWith('/') ||
    path.endsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((segment) => !isCanonicalArtifactSegment(segment))
  ) {
    fail(`${label} is not a canonical package-relative path: ${path}`);
  }
}

function expectedArtifactMode(path: string): number {
  return path === 'dist/cli/main.js' ? 0o755 : 0o644;
}

export function installedArtifactMode(mode: number): number {
  if (!Number.isSafeInteger(mode) || mode < 0) {
    fail('installed Cortexel file mode is invalid');
  }
  return mode & 0o7777;
}

function gunzipSinglePackageMember(tarball: Buffer): Buffer {
  if (
    tarball.byteLength < 18 ||
    tarball.byteLength > PACKAGE_TARBALL_LIMITS.compressedBytes
  ) {
    fail('package tarball compressed size is outside its bound');
  }
  if (!tarball.subarray(0, 3).equals(NPM_GZIP_HEADER.subarray(0, 3))) {
    fail('package tarball gzip header is malformed');
  }
  if (tarball[3] !== 0) {
    fail('package tarball gzip optional fields are unsupported');
  }
  if (!tarball.subarray(0, NPM_GZIP_HEADER.byteLength).equals(NPM_GZIP_HEADER)) {
    fail('package tarball gzip header is not the canonical npm portable profile');
  }
  const deflateOffset = 10;
  let result: { readonly buffer: Buffer; readonly engine: { readonly bytesWritten: number } };
  try {
    result = inflateRawSync(tarball.subarray(deflateOffset), {
      info: true,
      maxOutputLength: PACKAGE_TARBALL_LIMITS.uncompressedBytes,
    }) as unknown as typeof result;
  } catch {
    fail('package tarball contains malformed, truncated, or over-budget DEFLATE data');
  }
  const deflateBytes = result.engine.bytesWritten;
  if (!Number.isSafeInteger(deflateBytes) || deflateBytes <= 0) {
    fail('package tarball DEFLATE length is invalid');
  }
  const footerOffset = deflateOffset + deflateBytes;
  if (footerOffset + 8 > tarball.byteLength) {
    fail('package tarball has a truncated gzip footer');
  }
  if (footerOffset + 8 < tarball.byteLength) {
    fail('package tarball has a concatenated gzip member or trailing bytes');
  }
  const expectedCrc = tarball.readUInt32LE(footerOffset);
  const expectedSize = tarball.readUInt32LE(footerOffset + 4);
  if (crc32(result.buffer) !== expectedCrc) fail('package tarball gzip CRC-32 mismatch');
  if (result.buffer.byteLength !== expectedSize) fail('package tarball gzip size mismatch');
  return result.buffer;
}

function artifactFileMap<T extends PackedFile>(
  files: readonly T[],
  label: string,
  requireDigest: boolean,
): Map<string, T> {
  if (files.length === 0 || files.length > PACKAGE_TARBALL_LIMITS.entries) {
    fail(`${label} entry count is outside its bound`);
  }
  const result = new Map<string, T>();
  const caseFolded = new Set<string>();
  for (const file of files) {
    assertCanonicalArtifactPath(file.path, `${label} path`);
    if (
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      file.size > PACKAGE_TARBALL_LIMITS.fileBytes
    ) {
      fail(`${label} file size is outside its bound: ${file.path}`);
    }
    if (file.mode !== expectedArtifactMode(file.path)) {
      fail(`${label} file mode is invalid: ${file.path}`);
    }
    const folded = file.path.toLowerCase();
    if (result.has(file.path) || caseFolded.has(folded)) {
      fail(`${label} contains a duplicate semantic path: ${file.path}`);
    }
    if (requireDigest) {
      const digest = (file as T & { readonly digest?: unknown }).digest;
      if (typeof digest !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(digest)) {
        fail(`${label} content digest is invalid: ${file.path}`);
      }
    }
    result.set(file.path, file);
    caseFolded.add(folded);
  }
  return result;
}

/** Independently inspects the gzip and USTAR bytes npm produced before any install. */
export function inspectNpmPackageTarball(
  tarball: Buffer,
  packed: PackedResult,
  expectedFiles: readonly ExpectedPackageFile[],
): PackageTarballInspection {
  if (packed.name !== 'cortexel') fail('npm pack artifact name is not Cortexel');
  if (packed.size !== tarball.byteLength) fail('npm pack size differs from package tarball bytes');
  if (packed.entryCount !== packed.files.length) fail('npm pack entryCount differs from its file list');
  if (packed.integrity !== sha512Integrity(tarball)) fail('npm pack integrity differs from tarball bytes');
  if (packed.shasum !== createHash('sha1').update(tarball).digest('hex')) {
    fail('npm pack legacy shasum differs from tarball bytes');
  }
  if (packed.filename !== `cortexel-${packed.version}.tgz`) {
    fail('npm pack filename differs from the package identity');
  }

  const npmFiles = artifactFileMap(packed.files, 'npm pack inventory', false);
  const expected = artifactFileMap(expectedFiles, 'expected package closure', true);
  if (npmFiles.size !== expected.size) fail('npm pack inventory differs from expected package closure');
  let expectedFileBytes = 0;
  for (const [path, file] of expected) {
    const npmFile = npmFiles.get(path);
    if (npmFile === undefined || npmFile.size !== file.size || npmFile.mode !== file.mode) {
      fail(`npm pack inventory differs from expected package file: ${path}`);
    }
    expectedFileBytes += file.size;
    if (expectedFileBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('expected package closure exceeds its byte bound');
    }
  }
  if (packed.unpackedSize !== expectedFileBytes) {
    fail('npm pack unpackedSize differs from expected package closure');
  }

  const tar = gunzipSinglePackageMember(tarball);
  if (tar.byteLength % 512 !== 0) fail('package tar byte length is not block-aligned');
  const seen = new Set<string>();
  const seenFolded = new Set<string>();
  const inspected: ExpectedPackageFile[] = [];
  let offset = 0;
  let fileBytes = 0;
  while (true) {
    if (offset + 512 > tar.byteLength) fail('package tar is truncated before its end marker');
    const header = tar.subarray(offset, offset + 512);
    if (allZero(header)) {
      const trailing = tar.subarray(offset);
      if (trailing.byteLength !== 1024 || !allZero(trailing)) {
        fail('package tar has an ambiguous end marker or trailing bytes');
      }
      break;
    }
    if (inspected.length >= PACKAGE_TARBALL_LIMITS.entries) {
      fail('package tar entry count exceeds its bound');
    }
    const storedChecksum = parseCanonicalTarOctal(header.subarray(148, 156), 6, 'tar checksum');
    let observedChecksum = 0;
    for (let index = 0; index < header.length; index++) {
      observedChecksum += index >= 148 && index < 156 ? 0x20 : header[index]!;
    }
    if (observedChecksum !== storedChecksum) fail('package tar header checksum mismatch');
    if (!header.subarray(257, 263).equals(Buffer.from('ustar\0', 'ascii')) ||
        !header.subarray(263, 265).equals(Buffer.from('00', 'ascii'))) {
      fail('package tar entry is not canonical USTAR');
    }
    assertZeroField(header.subarray(108, 116), 'tar uid');
    assertZeroField(header.subarray(116, 124), 'tar gid');
    assertZeroField(header.subarray(157, 257), 'tar link name');
    assertZeroField(header.subarray(265, 329), 'tar owner/group names');
    if (!header.subarray(329, 337).equals(Buffer.from('000000 \0', 'ascii')) ||
        !header.subarray(337, 345).equals(Buffer.from('000000 \0', 'ascii'))) {
      fail('package tar device fields are not canonical zero values');
    }
    assertZeroField(header.subarray(345, 500), 'tar path prefix');
    assertZeroField(header.subarray(500, 512), 'tar header padding');
    if (header[156] !== 0x30) {
      fail('package tar contains a non-regular or extension entry');
    }
    const tarPath = parseCanonicalTarName(header.subarray(0, 100));
    if (!tarPath.startsWith('package/')) fail('package tar path lacks the package/ root');
    const path = tarPath.slice('package/'.length);
    assertCanonicalArtifactPath(path, 'package tar path');
    const folded = path.toLowerCase();
    if (seen.has(path) || seenFolded.has(folded)) {
      fail(`package tar contains a duplicate semantic path: ${path}`);
    }
    const mode = parseCanonicalTarOctal(header.subarray(100, 108), 6, 'tar mode');
    const size = parseCanonicalTarOctal(header.subarray(124, 136), 10, 'tar size');
    const mtime = parseCanonicalTarOctal(header.subarray(136, 148), 10, 'tar mtime');
    if (mtime !== NPM_PORTABLE_MTIME_SECONDS) fail(`package tar mtime is not portable: ${path}`);
    if (size > PACKAGE_TARBALL_LIMITS.fileBytes) fail(`package tar file exceeds its bound: ${path}`);
    if (mode !== expectedArtifactMode(path)) fail(`package tar file mode is invalid: ${path}`);
    const dataOffset = offset + 512;
    const paddedSize = Math.ceil(size / 512) * 512;
    const nextOffset = dataOffset + paddedSize;
    if (!Number.isSafeInteger(nextOffset) || nextOffset > tar.byteLength) {
      fail(`package tar file is truncated: ${path}`);
    }
    const content = tar.subarray(dataOffset, dataOffset + size);
    if (!allZero(tar.subarray(dataOffset + size, nextOffset))) {
      fail(`package tar file has nonzero padding: ${path}`);
    }
    const npmFile = npmFiles.get(path);
    const expectedFile = expected.get(path);
    if (npmFile === undefined || npmFile.size !== size || npmFile.mode !== mode) {
      fail(`package tar entry differs from npm pack inventory: ${path}`);
    }
    const digest = sha256(content);
    if (expectedFile === undefined || expectedFile.size !== size ||
        expectedFile.mode !== mode || expectedFile.digest !== digest) {
      fail(`package tar entry differs from expected package content: ${path}`);
    }
    inspected.push({ path, size, mode, digest });
    fileBytes += size;
    seen.add(path);
    seenFolded.add(folded);
    offset = nextOffset;
  }
  if (inspected.length === 0 || inspected.length !== npmFiles.size || fileBytes !== expectedFileBytes) {
    fail('package tar file closure is incomplete');
  }
  inspected.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return {
    compressedBytes: tarball.byteLength,
    uncompressedBytes: tar.byteLength,
    fileBytes,
    entryCount: inspected.length,
    treeDigest: sha256(canonicalize(inspected)),
  };
}

function sourceDigest(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function canonicalJsonSourceDigest(path: string, label: string): string {
  return createHash('sha256')
    .update(canonicalize(readStrictJson(path, label)))
    .digest('hex');
}

function assertExactSourceDigest(path: string, expected: string, label: string): void {
  const actual = canonicalJsonSourceDigest(path, label);
  if (actual !== expected) {
    fail(`${label} digest mismatch: expected ${expected}, received ${actual}`);
  }
}

function exactJsonEqual(left: unknown, right: unknown): boolean {
  return canonicalize(left) === canonicalize(right);
}

function expectRecord(value: JsonValue | undefined, label: string): Record<string, JsonValue> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return value;
}

function expectString(value: JsonValue | undefined, label: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
  return value;
}

function expectInteger(value: JsonValue | undefined, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function assertSri512(value: string, label: string): void {
  if (!value.startsWith('sha512-')) fail(`${label} must use SHA-512 SRI`);
  const encoded = value.slice('sha512-'.length);
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.byteLength !== 64 || decoded.toString('base64') !== encoded) {
    fail(`${label} is not a canonical SHA-512 SRI value`);
  }
}

function isCanonicalPackageName(name: string): boolean {
  const bare = '[A-Za-z0-9][A-Za-z0-9._~-]*';
  return new RegExp(`^(?:${bare}|@${bare}/${bare})$`, 'u').test(name);
}

function isCanonicalLockPackagePath(path: string): boolean {
  if (path.includes('\\') || path === '' || path !== path.split('/').join('/')) return false;
  const segments = path.split('/');
  let index = 0;
  while (index < segments.length) {
    if (segments[index] !== 'node_modules') return false;
    index++;
    const first = segments[index];
    if (first === undefined) return false;
    if (first.startsWith('@')) {
      const second = segments[index + 1];
      if (second === undefined || !isCanonicalPackageName(`${first}/${second}`)) return false;
      index += 2;
    } else {
      if (!isCanonicalPackageName(first)) return false;
      index++;
    }
  }
  return true;
}

function dependencyLockCandidates(parentPath: string, dependency: string): string[] {
  const candidates: string[] = [];
  let ancestor = parentPath;
  while (ancestor !== '') {
    candidates.push(`${ancestor}/node_modules/${dependency}`);
    const marker = ancestor.lastIndexOf('/node_modules/');
    ancestor = marker === -1 ? '' : ancestor.slice(0, marker);
  }
  candidates.push(`node_modules/${dependency}`);
  return [...new Set(candidates)];
}

/** The fixture lock is executable policy: every registry artifact is exact and integrity-bound. */
export function validatePackageSmokeFixture(
  manifestValue: JsonValue,
  lockValue: JsonValue,
  cortexelPackageValue: JsonValue,
): void {
  const manifest = expectRecord(manifestValue, 'fixture package.json');
  exactKeys(
    manifest,
    [
      'name',
      'version',
      'private',
      'type',
      'dependencies',
      'devDependencies',
      'optionalDependencies',
    ],
    'fixture package.json',
  );
  if (
    manifest.name !== 'cortexel-package-smoke-fixture' ||
    manifest.version !== '1.0.0' ||
    manifest.private !== true ||
    manifest.type !== 'module'
  ) {
    fail('fixture package.json identity is invalid');
  }
  const dependencies = expectRecord(manifest.dependencies, 'fixture dependencies');
  if (!exactJsonEqual(dependencies, { cortexel: `file:${LOCAL_TARBALL_FILENAME}` })) {
    fail('fixture must have only the local Cortexel tarball as a normal dependency');
  }
  const devDependencies = expectRecord(manifest.devDependencies, 'fixture devDependencies');
  if (!exactJsonEqual(devDependencies, EXPECTED_DEV_DEPENDENCIES)) {
    fail('fixture devDependencies must be exact reviewed versions');
  }
  const optionalDependencies = expectRecord(
    manifest.optionalDependencies,
    'fixture optionalDependencies',
  );
  if (!exactJsonEqual(optionalDependencies, EXPECTED_OPTIONAL_DEPENDENCIES)) {
    fail('fixture optionalDependencies must be exact reviewed versions');
  }

  const lock = expectRecord(lockValue, 'fixture package-lock.json');
  exactKeys(
    lock,
    ['name', 'version', 'lockfileVersion', 'requires', 'packages'],
    'fixture package-lock.json',
  );
  if (
    lock.name !== manifest.name ||
    lock.version !== manifest.version ||
    lock.lockfileVersion !== 3 ||
    lock.requires !== true
  ) {
    fail('fixture package-lock.json header is invalid');
  }
  const packages = expectRecord(lock.packages, 'fixture lock packages');
  if (Object.keys(packages).length > 10_000) fail('fixture lock package count exceeds its budget');
  const lockRoot = expectRecord(packages[''], 'fixture lock root');
  exactKeys(
    lockRoot,
    ['name', 'version', 'dependencies', 'devDependencies', 'optionalDependencies'],
    'fixture lock root',
  );
  if (
    lockRoot.name !== manifest.name ||
    lockRoot.version !== manifest.version ||
    !exactJsonEqual(lockRoot.dependencies, dependencies) ||
    !exactJsonEqual(lockRoot.devDependencies, devDependencies) ||
    !exactJsonEqual(lockRoot.optionalDependencies, optionalDependencies)
  ) {
    fail('fixture lock root differs from package.json');
  }

  const sourcePackage = expectRecord(cortexelPackageValue, 'Cortexel package.json');
  const lockedCortexel = expectRecord(packages['node_modules/cortexel'], 'locked Cortexel package');
  if (Object.hasOwn(lockedCortexel, 'integrity')) {
    fail('the mutable local artifact integrity belongs in prepared state, not the committed lock');
  }
  exactKeys(
    lockedCortexel,
    [
      'version',
      'resolved',
      'license',
      'dependencies',
      'bin',
      'engines',
      'peerDependencies',
      'peerDependenciesMeta',
    ],
    'locked Cortexel package',
  );
  if (lockedCortexel.resolved !== `file:${LOCAL_TARBALL_FILENAME}`) {
    fail('Cortexel fixture dependency must resolve only from the local tarball');
  }
  for (const key of [
    'version',
    'license',
    'dependencies',
    'engines',
    'peerDependencies',
    'peerDependenciesMeta',
  ] as const) {
    if (!exactJsonEqual(lockedCortexel[key], sourcePackage[key])) {
      fail(`fixture lock Cortexel metadata is stale at ${key}`);
    }
  }
  const sourceBin = expectRecord(sourcePackage.bin, 'Cortexel package bin');
  const normalizedSourceBin = Object.fromEntries(
    Object.entries(sourceBin).map(([name, path]) => [
      name,
      typeof path === 'string' ? path.replace(/^\.\//u, '') : path,
    ]),
  );
  if (!exactJsonEqual(lockedCortexel.bin, normalizedSourceBin)) {
    fail('fixture lock Cortexel metadata is stale at bin');
  }

  for (const [path, candidate] of Object.entries(packages)) {
    if (path === '' || path === 'node_modules/cortexel') continue;
    if (!isCanonicalLockPackagePath(path)) fail(`fixture lock has an unsafe package path ${path}`);
    const record = expectRecord(candidate, `fixture lock package ${path}`);
    if (
      record.link === true ||
      record.inBundle === true ||
      record.bundled === true ||
      record.hasInstallScript === true
    ) {
      fail(`fixture lock package ${path} uses an unreviewed script, bundle, or link`);
    }
    const version = expectString(record.version, `fixture lock package ${path} version`);
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
      fail(`fixture lock package ${path} does not have an exact version`);
    }
    const resolved = expectString(record.resolved, `fixture lock package ${path} resolved`);
    if (!resolved.startsWith('https://registry.npmjs.org/')) {
      fail(`fixture lock package ${path} is not pinned to the reviewed npm registry`);
    }
    assertSri512(expectString(record.integrity, `fixture lock package ${path} integrity`), path);
  }

  for (const [path, candidate] of Object.entries(packages)) {
    const record = expectRecord(candidate, `fixture lock package ${path || '<root>'}`);
    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      if (record[field] === undefined) continue;
      const dependencyMap = expectRecord(record[field], `fixture lock ${path || '<root>'} ${field}`);
      for (const dependency of Object.keys(dependencyMap)) {
        if (!isCanonicalPackageName(dependency)) {
          fail(`fixture lock ${path || '<root>'} has an unsafe dependency name ${dependency}`);
        }
        if (!dependencyLockCandidates(path, dependency).some((entry) => packages[entry] !== undefined)) {
          fail(`fixture lock ${path || '<root>'} has an unresolved ${field} edge to ${dependency}`);
        }
      }
    }
  }
}

function validateFixtureSources(): {
  readonly manifest: JsonValue;
  readonly lock: JsonValue;
  readonly packageJson: JsonValue;
} {
  assertExactSourceDigest(
    fixtureManifestPath,
    EXPECTED_FIXTURE_MANIFEST_SHA256,
    'package-smoke fixture manifest',
  );
  assertExactSourceDigest(fixtureLockPath, EXPECTED_FIXTURE_LOCK_SHA256, 'package-smoke fixture lock');
  const manifest = readStrictJson(fixtureManifestPath, 'package-smoke fixture manifest');
  const lock = readStrictJson(fixtureLockPath, 'package-smoke fixture lock');
  const packageJson = readStrictJson(join(root, 'package.json'), 'Cortexel package.json');
  validatePackageSmokeFixture(manifest, lock, packageJson);
  return { manifest, lock, packageJson };
}

function isInside(parent: string, candidate: string): boolean {
  const rel = relative(parent, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function resolveExecutable(explicit: string | undefined, command: string, label: string): string {
  let candidate: string | undefined;
  if (explicit !== undefined) {
    if (!isAbsolute(explicit)) fail(`${label} must be an absolute path`);
    candidate = explicit;
  } else {
    const pathValue = process.env.PATH ?? '';
    const extensions = process.platform === 'win32'
      ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';')
      : [''];
    outer: for (const directory of pathValue.split(delimiter)) {
      if (!directory) continue;
      for (const extension of extensions) {
        const possible = join(directory, `${command}${extension.toLowerCase()}`);
        try {
          accessSync(possible, fsConstants.X_OK);
          candidate = possible;
          break outer;
        } catch {
          // Continue through the finite PATH search.
        }
      }
    }
  }
  if (candidate === undefined) fail(`${label} was not found`);
  const canonical = realpathSync(candidate);
  const stats = statSync(canonical);
  if (!stats.isFile()) fail(`${label} must resolve to a regular file`);
  if (process.platform !== 'win32') accessSync(canonical, fsConstants.X_OK);
  return canonical;
}

function resolveNpmCli(explicit: string | undefined): string {
  const resolved = resolveExecutable(explicit, 'npm', 'npm executable');
  if (basename(resolved).toLowerCase() === 'npm-cli.js') return resolved;
  if (process.platform === 'win32' && /npm\.(?:cmd|bat)$/iu.test(basename(resolved))) {
    const cli = join(dirname(resolved), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (existsSync(cli) && statSync(cli).isFile()) return realpathSync(cli);
  }
  fail('npm executable must resolve to npm-cli.js (a Windows npm.cmd shim is accepted when its CLI is adjacent)');
}

function scrubbedEnvironment(nodeExecutable: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    const upper = key.toUpperCase();
    if (
      upper.startsWith('NODE_') ||
      upper.startsWith('DYLD_') ||
      upper.startsWith('LD_') ||
      upper.startsWith('NPM_CONFIG_') ||
      upper.startsWith('OPENSSL_') ||
      upper === 'GCONV_PATH' ||
      upper === 'LOCPATH'
    ) {
      continue;
    }
    environment[key] = value;
  }
  environment.PATH = [dirname(nodeExecutable), process.env.PATH ?? ''].filter(Boolean).join(delimiter);
  environment.LANG = 'C';
  environment.LC_ALL = 'C';
  environment.NO_COLOR = '1';
  environment.TZ = 'UTC';
  return environment;
}

function executableVersion(executable: string, label: string): string {
  const value = run(executable, ['--version'], root);
  if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value)) {
    fail(`${label} returned an invalid version`);
  }
  return value;
}

function nodeCliVersion(nodeExecutable: string, cli: string, label: string): string {
  const value = run(nodeExecutable, [cli, '--version'], root);
  if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value)) {
    fail(`${label} returned an invalid version`);
  }
  return value;
}

function assertSupportedNodeVersion(version: string): void {
  const major = Number.parseInt(version.replace(/^v/u, '').split('.')[0] ?? '', 10);
  if (!SUPPORTED_NODE_MAJORS.has(major)) {
    fail(`package smoke requires Node 22, 24, or 26; received ${version}`);
  }
}

function assertEmptyWorkspace(workspace: string): void {
  if (!isAbsolute(workspace)) fail('workspace must be an absolute path');
  if (existsSync(workspace)) {
    const stats = lstatSync(workspace);
    if (!stats.isDirectory() || stats.isSymbolicLink()) fail('workspace must be a real directory');
    if (readdirSync(workspace).length !== 0) fail('workspace must be absent or empty');
  } else {
    mkdirSync(workspace, { recursive: true, mode: 0o755 });
  }
  const canonical = realpathSync(workspace);
  if (canonical !== workspace) fail('workspace must already be canonical');
}

function canonicalWorkspacePath(candidate: string): string {
  const absolute = resolve(candidate);
  if (existsSync(absolute)) return realpathSync(absolute);
  return join(realpathSync(dirname(absolute)), basename(absolute));
}

function normalizePackResult(value: JsonValue, tarball: Buffer): PackedResult {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    fail('npm pack did not return exactly one package record');
  }
  const record = value[0];
  exactKeys(
    record,
    [
      'id',
      'name',
      'version',
      'size',
      'unpackedSize',
      'shasum',
      'integrity',
      'filename',
      'files',
      'entryCount',
      'bundled',
    ],
    'npm pack record',
  );
  const filesValue = record.files;
  if (!Array.isArray(filesValue) || filesValue.length === 0 ||
      filesValue.length > PACKAGE_TARBALL_LIMITS.entries) {
    fail('npm pack returned an invalid file inventory');
  }
  const files: PackedFile[] = [];
  const seen = new Set<string>();
  for (const [index, candidate] of filesValue.entries()) {
    const file = expectRecord(candidate, `npm pack file ${index}`);
    exactKeys(file, ['path', 'size', 'mode'], `npm pack file ${index}`);
    const path = expectString(file.path, `npm pack file ${index} path`);
    assertCanonicalArtifactPath(path, `npm pack file ${index} path`);
    if (
      seen.has(path)
    ) {
      fail(`npm pack returned an unsafe or duplicate path ${path}`);
    }
    seen.add(path);
    files.push({
      path,
      size: expectInteger(file.size, `npm pack file ${path} size`),
      mode: expectInteger(file.mode, `npm pack file ${path} mode`),
    });
  }
  const integrity = expectString(record.integrity, 'npm pack integrity');
  assertSri512(integrity, 'npm pack integrity');
  if (integrity !== sha512Integrity(tarball)) fail('npm pack integrity differs from the tarball bytes');
  const name = expectString(record.name, 'npm pack name');
  const version = expectString(record.version, 'npm pack version');
  const size = expectInteger(record.size, 'npm pack size');
  const unpackedSize = expectInteger(record.unpackedSize, 'npm pack unpacked size');
  const entryCount = expectInteger(record.entryCount, 'npm pack entry count');
  const shasum = expectString(record.shasum, 'npm pack shasum');
  const filename = expectString(record.filename, 'npm pack filename');
  if (record.id !== `${name}@${version}` || size !== tarball.byteLength ||
      entryCount !== files.length || !Array.isArray(record.bundled) || record.bundled.length !== 0 ||
      !/^[0-9a-f]{40}$/u.test(shasum) || filename !== `cortexel-${version}.tgz`) {
    fail('npm pack metadata is internally inconsistent');
  }
  return {
    name,
    version,
    size,
    unpackedSize,
    shasum,
    integrity,
    filename,
    files,
    entryCount,
  };
}

function writeCanonicalJson(path: string, value: unknown, mode = 0o644): string {
  const raw = `${canonicalize(value)}\n`;
  writeFileSync(path, raw, { encoding: 'utf8', flag: 'wx', mode });
  return raw;
}

function readRegularFileStable(
  path: string,
  expectedSize: number | undefined,
  label = 'workspace file',
  maxBytes?: number,
): Buffer {
  const pathBefore = lstatSync(path);
  if (!pathBefore.isFile()) fail(`${label} must be a regular file`);
  if (pathBefore.nlink !== 1) fail(`${label} must not be hard-linked`);
  if (expectedSize !== undefined && pathBefore.size !== expectedSize) {
    fail(`${label} changed before it could be read`);
  }
  if (maxBytes !== undefined && pathBefore.size > maxBytes) fail(`${label} exceeds its byte budget`);
  const noFollow = process.platform === 'win32' ? 0 : fsConstants.O_NOFOLLOW;
  const descriptor = openSync(path, fsConstants.O_RDONLY | noFollow);
  try {
    const before = fstatSync(descriptor);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.dev !== pathBefore.dev ||
      before.ino !== pathBefore.ino ||
      before.size !== pathBefore.size
    ) {
      fail(`${label} changed before it could be read`);
    }
    const raw = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    const pathAfter = lstatSync(path);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      before.mode !== after.mode ||
      before.nlink !== after.nlink ||
      raw.byteLength !== before.size ||
      !pathAfter.isFile() ||
      pathAfter.nlink !== 1 ||
      pathAfter.dev !== before.dev ||
      pathAfter.ino !== before.ino ||
      pathAfter.size !== before.size ||
      pathAfter.mtimeMs !== before.mtimeMs ||
      pathAfter.ctimeMs !== before.ctimeMs ||
      pathAfter.mode !== before.mode
    ) {
      fail(`${label} changed while it was being read`);
    }
    return raw;
  } finally {
    closeSync(descriptor);
  }
}

function expectedPackageClosure(packageJsonValue: JsonValue): ExpectedPackageFile[] {
  const packageJson = expectRecord(packageJsonValue, 'Cortexel package.json');
  if (!exactJsonEqual(packageJson.files, EXPECTED_PACKAGE_FILE_ENTRIES)) {
    fail('Cortexel package files allowlist differs from the reviewed package closure');
  }
  const pending = ['package.json', ...EXPECTED_PACKAGE_FILE_ENTRIES];
  const files: ExpectedPackageFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  let visitedNodes = 0;
  while (pending.length > 0) {
    const relativePath = pending.pop()!;
    assertCanonicalArtifactPath(relativePath, 'expected package path');
    if (relativePath.split('/').length > PACKAGE_TARBALL_LIMITS.sourceDepth) {
      fail(`expected package path exceeds its depth bound: ${relativePath}`);
    }
    visitedNodes++;
    if (visitedNodes > PACKAGE_TARBALL_LIMITS.sourceNodes) {
      fail('expected package closure exceeds its filesystem-node bound');
    }
    const absolutePath = join(root, ...relativePath.split('/'));
    const stats = lstatSync(absolutePath);
    if (stats.isSymbolicLink()) fail(`expected package closure contains a symlink: ${relativePath}`);
    if (stats.isDirectory()) {
      const directory = opendirSync(absolutePath);
      const children: string[] = [];
      try {
        let child = directory.readSync();
        while (child !== null) {
          children.push(child.name);
          if (children.length > PACKAGE_TARBALL_LIMITS.directoryEntries) {
            fail(`expected package directory exceeds its child bound: ${relativePath}`);
          }
          child = directory.readSync();
        }
      } finally {
        directory.closeSync();
      }
      children.sort().reverse();
      for (const child of children) pending.push(`${relativePath}/${child}`);
      if (visitedNodes + pending.length > PACKAGE_TARBALL_LIMITS.sourceNodes) {
        fail('expected package closure pending-node count exceeds its bound');
      }
      continue;
    }
    if (!stats.isFile()) fail(`expected package closure contains a special file: ${relativePath}`);
    if (seen.has(relativePath)) fail(`expected package closure duplicates ${relativePath}`);
    if (files.length >= PACKAGE_TARBALL_LIMITS.entries) {
      fail('expected package closure exceeds its entry bound');
    }
    if (stats.size > PACKAGE_TARBALL_LIMITS.fileBytes) {
      fail(`expected package file exceeds its bound: ${relativePath}`);
    }
    const mode = expectedArtifactMode(relativePath);
    if (process.platform !== 'win32' && (stats.mode & 0o7777) !== mode) {
      fail(`expected package source mode is invalid: ${relativePath}`);
    }
    const raw = readRegularFileStable(
      absolutePath,
      stats.size,
      `expected package file ${relativePath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    totalBytes += raw.byteLength;
    if (totalBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('expected package closure exceeds its byte bound');
    }
    files.push({ path: relativePath, size: raw.byteLength, mode, digest: sha256(raw) });
    seen.add(relativePath);
  }
  files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return files;
}

export function verifyInstalledPackageClosure(
  installedRoot: string,
  expectedFiles: readonly ExpectedPackageFile[],
): void {
  if (realpathSync(installedRoot) !== installedRoot || !lstatSync(installedRoot).isDirectory()) {
    fail('installed Cortexel package root is not a canonical real directory');
  }
  const expected = artifactFileMap(expectedFiles, 'installed package expectation', true);
  const expectedDirectories = new Set<string>(['']);
  for (const path of expected.keys()) {
    const segments = path.split('/');
    for (let index = 1; index < segments.length; index++) {
      expectedDirectories.add(segments.slice(0, index).join('/'));
    }
  }
  const pending = [''];
  const seen = new Set<string>();
  let visitedNodes = 0;
  let fileBytes = 0;
  while (pending.length > 0) {
    const relativePath = pending.pop()!;
    const absolutePath = relativePath
      ? join(installedRoot, ...relativePath.split('/'))
      : installedRoot;
    const stats = lstatSync(absolutePath);
    visitedNodes++;
    if (visitedNodes > PACKAGE_TARBALL_LIMITS.sourceNodes) {
      fail('installed Cortexel closure exceeds its filesystem-node bound');
    }
    if (stats.isSymbolicLink()) fail(`installed Cortexel closure contains a link: ${relativePath}`);
    if (stats.isDirectory()) {
      // npm's reviewed nested strategy grafts Cortexel's locked dependencies here;
      // those are validated by the consumer lock and whole-workspace seal, not by
      // the package tar's own file closure.
      if (relativePath === 'node_modules') continue;
      if (!expectedDirectories.has(relativePath)) {
        fail(`installed Cortexel closure contains an unexpected directory: ${relativePath}`);
      }
      const directory = opendirSync(absolutePath);
      const children: string[] = [];
      try {
        let child = directory.readSync();
        while (child !== null) {
          children.push(child.name);
          if (children.length > PACKAGE_TARBALL_LIMITS.directoryEntries) {
            fail(`installed Cortexel directory exceeds its child bound: ${relativePath}`);
          }
          child = directory.readSync();
        }
      } finally {
        directory.closeSync();
      }
      for (const child of children.sort().reverse()) {
        const childPath = relativePath ? `${relativePath}/${child}` : child;
        assertCanonicalArtifactPath(childPath, 'installed Cortexel path');
        if (childPath.split('/').length > PACKAGE_TARBALL_LIMITS.sourceDepth) {
          fail(`installed Cortexel path exceeds its depth bound: ${childPath}`);
        }
        pending.push(childPath);
      }
      if (visitedNodes + pending.length > PACKAGE_TARBALL_LIMITS.sourceNodes) {
        fail('installed Cortexel pending-node count exceeds its bound');
      }
      continue;
    }
    if (!stats.isFile()) fail(`installed Cortexel closure contains a special file: ${relativePath}`);
    const expectedFile = expected.get(relativePath);
    if (expectedFile === undefined || seen.has(relativePath)) {
      fail(`installed Cortexel closure contains an unexpected file: ${relativePath}`);
    }
    if (process.platform !== 'win32' && installedArtifactMode(stats.mode) !== expectedFile.mode) {
      fail(`installed Cortexel file mode differs from the tarball: ${relativePath}`);
    }
    const raw = readRegularFileStable(
      absolutePath,
      stats.size,
      `installed Cortexel file ${relativePath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    if (raw.byteLength !== expectedFile.size || sha256(raw) !== expectedFile.digest) {
      fail(`installed Cortexel file bytes differ from the tarball: ${relativePath}`);
    }
    fileBytes += raw.byteLength;
    if (fileBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('installed Cortexel closure exceeds its byte bound');
    }
    seen.add(relativePath);
  }
  if (seen.size !== expected.size) fail('installed Cortexel file closure is incomplete');
}

/** Byte-, topology-, ownership-, and mode-bound seal used on both sides of inspection. */
export function fingerprintPackageSmokeWorkspace(workspace: string): WorkspaceSeal {
  const canonicalRoot = realpathSync(workspace);
  if (canonicalRoot !== workspace) fail('workspace root is not canonical while sealing');
  const pending = [''];
  const records: Array<Record<string, JsonValue>> = [];
  let entryCount = 0;
  let fileCount = 0;
  let byteCount = 0;
  while (pending.length > 0) {
    const directoryRelative = pending.pop() ?? '';
    const directory = directoryRelative ? join(workspace, directoryRelative) : workspace;
    const names = readdirSync(directory).sort();
    for (const name of names) {
      const pathRelative = directoryRelative ? `${directoryRelative}/${name}` : name;
      if (pathRelative === STATE_FILENAME) continue;
      entryCount++;
      if (entryCount > MAX_TREE_ENTRIES) fail('package-smoke workspace exceeds the entry budget');
      const path = join(workspace, ...pathRelative.split('/'));
      const stats = lstatSync(path);
      const common = {
        path: pathRelative,
        mode: stats.mode & 0o7777,
        uid: stats.uid,
        gid: stats.gid,
      };
      if (stats.isDirectory()) {
        records.push({ type: 'directory', ...common });
        pending.push(pathRelative);
      } else if (stats.isSymbolicLink()) {
        const target = readlinkSync(path);
        if (Buffer.byteLength(target, 'utf8') > 4_096) fail(`oversized symlink target at ${pathRelative}`);
        const resolved = realpathSync(path);
        if (!isInside(workspace, resolved)) fail(`workspace symlink escapes its root: ${pathRelative}`);
        records.push({ type: 'symlink', target, ...common });
      } else if (stats.isFile()) {
        if (stats.nlink !== 1) fail(`workspace regular file is hard-linked: ${pathRelative}`);
        byteCount += stats.size;
        fileCount++;
        if (byteCount > MAX_TREE_BYTES) fail('package-smoke workspace exceeds the byte budget');
        const raw = readRegularFileStable(path, stats.size, `workspace file ${pathRelative}`);
        records.push({ type: 'file', digest: sha256(raw), size: stats.size, ...common });
      } else {
        fail(`workspace contains a special file: ${pathRelative}`);
      }
    }
  }
  records.sort((left, right) => {
    const leftPath = String(left.path);
    const rightPath = String(right.path);
    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });
  return {
    digest: sha256(canonicalize(records)),
    entryCount,
    fileCount,
    byteCount,
  };
}

function makeWorkspaceReadOnly(workspace: string): boolean {
  if (process.platform === 'win32') return false;
  const pending = [workspace];
  const directories: string[] = [];
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    directories.push(directory);
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (stats.isFile()) chmodSync(path, (stats.mode & 0o111) === 0 ? 0o444 : 0o555);
    }
  }
  for (const directory of directories.reverse()) {
    if (directory !== workspace) chmodSync(directory, 0o555);
  }
  return true;
}

function finalizeWorkspacePermissions(workspace: string, statePath: string): void {
  if (process.platform === 'win32') return;
  chmodSync(statePath, 0o444);
  chmodSync(workspace, 0o555);
}

function assertWorkspaceReadOnly(workspace: string, expected: boolean): void {
  if (!expected) return;
  const pending = [workspace];
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    const directoryStats = lstatSync(directory);
    if ((directoryStats.mode & 0o222) !== 0) fail(`workspace directory is writable: ${directory}`);
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (!stats.isSymbolicLink() && (stats.mode & 0o222) !== 0) {
        fail(`workspace file is writable: ${path}`);
      }
    }
  }
}

function makeWorkspaceWritableForCleanup(workspace: string): void {
  if (process.platform === 'win32' || !existsSync(workspace)) return;
  const pending = [workspace];
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    chmodSync(directory, 0o755);
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (stats.isFile()) chmodSync(path, (stats.mode & 0o111) === 0 ? 0o644 : 0o755);
    }
  }
}

const NETWORK_AND_WRITE_GUARD = String.raw`'use strict';
const denied = (authority) => {
  throw new Error('[cortexel package smoke] denied execute-phase authority: ' + authority);
};
const deny = (authority) => function deniedAuthority() { return denied(authority); };

const net = require('node:net');
net.connect = deny('net.connect');
net.createConnection = deny('net.createConnection');
net.Socket.prototype.connect = deny('net.Socket.connect');
const tls = require('node:tls');
tls.connect = deny('tls.connect');
const http = require('node:http');
http.request = deny('http.request');
http.get = deny('http.get');
const https = require('node:https');
https.request = deny('https.request');
https.get = deny('https.get');
const http2 = require('node:http2');
http2.connect = deny('http2.connect');
const dns = require('node:dns');
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'reverse']) {
  dns[name] = deny('dns.' + name);
}
const dnsPromises = require('node:dns/promises');
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'reverse']) {
  if (typeof dnsPromises[name] === 'function') dnsPromises[name] = deny('dns.promises.' + name);
  if (dns.promises && typeof dns.promises[name] === 'function') {
    dns.promises[name] = deny('dns.promises.' + name);
  }
}
const dgram = require('node:dgram');
dgram.createSocket = deny('dgram.createSocket');
if (typeof globalThis.fetch === 'function') globalThis.fetch = deny('fetch');
if (typeof globalThis.WebSocket === 'function') globalThis.WebSocket = deny('WebSocket');

const childProcess = require('node:child_process');
for (const name of ['exec', 'execFile', 'execFileSync', 'execSync', 'fork', 'spawn', 'spawnSync']) {
  childProcess[name] = deny('child_process.' + name);
}

const fs = require('node:fs');
for (const name of [
  'appendFile', 'appendFileSync', 'chmod', 'chmodSync', 'chown', 'chownSync',
  'copyFile', 'copyFileSync', 'cp', 'cpSync', 'createWriteStream', 'fchmod', 'fchmodSync',
  'fchown', 'fchownSync', 'fdatasync', 'fdatasyncSync', 'ftruncate', 'ftruncateSync',
  'fsync', 'fsyncSync', 'futimes', 'futimesSync', 'link', 'linkSync', 'lchown',
  'lchownSync', 'lutimes',
  'lutimesSync', 'mkdir', 'mkdirSync', 'mkdtemp', 'mkdtempSync', 'rename', 'renameSync',
  'rm', 'rmSync', 'rmdir', 'rmdirSync', 'symlink', 'symlinkSync', 'truncate',
  'truncateSync', 'unlink', 'unlinkSync', 'utimes', 'utimesSync', 'write', 'writeFile',
  'writeFileSync', 'writeSync', 'writev', 'writevSync',
]) {
  if (typeof fs[name] === 'function') fs[name] = deny('fs.' + name);
}
const writeMask = fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_APPEND |
  fs.constants.O_CREAT | fs.constants.O_TRUNC;
const isWriteFlag = (flags) => typeof flags === 'number'
  ? (flags & writeMask) !== 0
  : typeof flags !== 'string' || /[wa+]/u.test(flags);
const originalOpen = fs.open;
const originalOpenSync = fs.openSync;
fs.open = function guardedOpen(path, flags, ...rest) {
  if (isWriteFlag(flags)) return denied('fs.open(write)');
  return originalOpen.call(this, path, flags, ...rest);
};
fs.openSync = function guardedOpenSync(path, flags, ...rest) {
  if (isWriteFlag(flags)) return denied('fs.openSync(write)');
  return originalOpenSync.call(this, path, flags, ...rest);
};
const promiseSurfaces = [...new Set([fs.promises, require('node:fs/promises')].filter(Boolean))];
for (const promises of promiseSurfaces) {
  for (const name of [
    'appendFile', 'chmod', 'chown', 'copyFile', 'cp', 'lchmod', 'lchown', 'link',
    'lutimes', 'mkdir', 'mkdtemp', 'rename', 'rm', 'rmdir', 'symlink', 'truncate',
    'unlink', 'utimes', 'writeFile',
  ]) {
    if (typeof promises[name] === 'function') promises[name] = deny('fs.promises.' + name);
  }
  const originalPromiseOpen = promises.open.bind(promises);
  promises.open = async function guardedPromiseOpen(path, flags, ...rest) {
    if (isWriteFlag(flags)) return Promise.reject(new Error(
      '[cortexel package smoke] denied execute-phase authority: fs.promises.open(write)',
    ));
    const handle = await originalPromiseOpen(path, flags, ...rest);
    for (const name of [
      'appendFile', 'chmod', 'chown', 'createWriteStream', 'datasync', 'sync', 'truncate',
      'utimes', 'write', 'writeFile', 'writev',
    ]) {
      if (typeof handle[name] === 'function') handle[name] = deny('FileHandle.' + name);
    }
    return handle;
  };
}
require('node:module').syncBuiltinESMExports();
`;

function prepareConsumer(
  consumer: string,
  tarballPath: string,
  artifactIntegrity: string,
  expectedFiles: readonly ExpectedPackageFile[],
  nodeExecutable: string,
  npmExecutable: string,
  omittedDependencyClasses: readonly ('dev' | 'optional')[],
): void {
  mkdirSync(consumer, { mode: 0o755 });
  copyFileSync(fixtureManifestPath, join(consumer, 'package.json'), fsConstants.COPYFILE_EXCL);
  const derivedLock = readStrictJson(fixtureLockPath, 'package-smoke fixture lock');
  const derivedPackages = expectRecord(
    expectRecord(derivedLock, 'package-smoke fixture lock').packages,
    'package-smoke fixture lock packages',
  );
  const derivedCortexel = expectRecord(
    derivedPackages['node_modules/cortexel'],
    'package-smoke fixture Cortexel lock entry',
  );
  derivedCortexel.integrity = artifactIntegrity;
  const consumerLockPath = join(consumer, 'package-lock.json');
  writeFileSync(consumerLockPath, `${canonicalize(derivedLock)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o644,
  });
  const derivedLockDigest = sourceDigest(consumerLockPath);
  copyFileSync(tarballPath, join(consumer, LOCAL_TARBALL_FILENAME), fsConstants.COPYFILE_EXCL);
  run(
    nodeExecutable,
    [
      npmExecutable,
      ...NPM_CI_FLAGS,
      ...omittedDependencyClasses.map((dependencyClass) => `--omit=${dependencyClass}`),
    ],
    consumer,
  );
  if (
    canonicalJsonSourceDigest(join(consumer, 'package.json'), 'installed fixture manifest') !==
    EXPECTED_FIXTURE_MANIFEST_SHA256
  ) {
    fail('npm ci changed the committed fixture manifest');
  }
  if (sourceDigest(consumerLockPath) !== derivedLockDigest) {
    fail('npm ci changed the artifact-bound fixture lock');
  }
  verifyInstalledPackageClosure(join(consumer, 'node_modules', 'cortexel'), expectedFiles);
}

function parsePackedResult(value: JsonValue): PackedResult {
  const record = expectRecord(value, 'prepared npm pack result');
  exactKeys(
    record,
    [
      'name',
      'version',
      'size',
      'unpackedSize',
      'shasum',
      'integrity',
      'filename',
      'files',
      'entryCount',
    ],
    'prepared npm pack result',
  );
  const filesValue = record.files;
  if (!Array.isArray(filesValue) || filesValue.length === 0) fail('prepared pack inventory is empty');
  const files: PackedFile[] = filesValue.map((candidate, index) => {
    const file = expectRecord(candidate, `prepared pack file ${index}`);
    exactKeys(file, ['path', 'size', 'mode'], `prepared pack file ${index}`);
    return {
      path: expectString(file.path, `prepared pack file ${index} path`),
      size: expectInteger(file.size, `prepared pack file ${index} size`),
      mode: expectInteger(file.mode, `prepared pack file ${index} mode`),
    };
  });
  return {
    name: expectString(record.name, 'prepared pack name'),
    version: expectString(record.version, 'prepared pack version'),
    size: expectInteger(record.size, 'prepared pack size'),
    unpackedSize: expectInteger(record.unpackedSize, 'prepared pack unpacked size'),
    shasum: expectString(record.shasum, 'prepared pack shasum'),
    integrity: expectString(record.integrity, 'prepared pack integrity'),
    filename: expectString(record.filename, 'prepared pack filename'),
    files,
    entryCount: expectInteger(record.entryCount, 'prepared pack entry count'),
  };
}

function readPackedResultStable(path: string): { readonly packed: PackedResult; readonly raw: Buffer } {
  const raw = readRegularFileStable(
    path,
    undefined,
    'prepared npm pack result',
    MAX_JSON_BYTES,
  );
  return {
    packed: parsePackedResult(parseCanonicalJsonBuffer(raw, 'prepared npm pack result')),
    raw,
  };
}

function validatePreparedState(value: JsonValue, workspace: string): PreparedState {
  const record = expectRecord(value, 'prepared package-smoke state');
  exactKeys(
    record,
    [
      'schema',
      'workspace',
      'platform',
      'arch',
      'packageVersion',
      'artifactIntegrity',
      'artifactSha256',
      'fixtureManifestSha256',
      'fixtureLockSha256',
      'packResultSha256',
      'nodeExecutable',
      'nodeVersion',
      'npmExecutable',
      'npmVersion',
      'coreConsumer',
      'chartsConsumer',
      'consumer',
      'unrelatedDirectory',
      'nodeModules',
      'workspaceSeal',
      'readOnlyWorkspace',
    ],
    'prepared package-smoke state',
  );
  if (
    record.schema !== PREPARED_STATE_SCHEMA ||
    record.workspace !== workspace ||
    record.platform !== process.platform ||
    record.arch !== process.arch ||
    record.fixtureManifestSha256 !== EXPECTED_FIXTURE_MANIFEST_SHA256 ||
    record.fixtureLockSha256 !== EXPECTED_FIXTURE_LOCK_SHA256 ||
    typeof record.readOnlyWorkspace !== 'boolean'
  ) {
    fail('prepared package-smoke state identity does not match this execution');
  }
  const expectedCore = join(workspace, 'core-consumer');
  const expectedCharts = join(workspace, 'charts-consumer');
  const expectedConsumer = join(workspace, 'consumer');
  const expectedUnrelated = join(workspace, 'unrelated-working-directory');
  const nodeModulesValue = record.nodeModules;
  if (
    record.coreConsumer !== expectedCore ||
    record.chartsConsumer !== expectedCharts ||
    record.consumer !== expectedConsumer ||
    record.unrelatedDirectory !== expectedUnrelated ||
    !Array.isArray(nodeModulesValue) ||
    nodeModulesValue.length !== 3 ||
    nodeModulesValue[0] !== join(expectedCore, 'node_modules') ||
    nodeModulesValue[1] !== join(expectedCharts, 'node_modules') ||
    nodeModulesValue[2] !== join(expectedConsumer, 'node_modules')
  ) {
    fail('prepared package-smoke state paths are invalid');
  }
  const sealValue = expectRecord(record.workspaceSeal, 'prepared workspace seal');
  exactKeys(sealValue, ['digest', 'entryCount', 'fileCount', 'byteCount'], 'prepared workspace seal');
  const digest = expectString(sealValue.digest, 'prepared workspace digest');
  if (!/^sha256:[0-9a-f]{64}$/u.test(digest)) fail('prepared workspace digest is invalid');
  const state: PreparedState = {
    schema: PREPARED_STATE_SCHEMA,
    workspace,
    platform: process.platform,
    arch: expectString(record.arch, 'prepared architecture'),
    packageVersion: expectString(record.packageVersion, 'prepared package version'),
    artifactIntegrity: expectString(record.artifactIntegrity, 'prepared artifact integrity'),
    artifactSha256: expectString(record.artifactSha256, 'prepared artifact SHA-256'),
    fixtureManifestSha256: EXPECTED_FIXTURE_MANIFEST_SHA256,
    fixtureLockSha256: EXPECTED_FIXTURE_LOCK_SHA256,
    packResultSha256: expectString(record.packResultSha256, 'prepared pack result SHA-256'),
    nodeExecutable: expectString(record.nodeExecutable, 'prepared Node executable'),
    nodeVersion: expectString(record.nodeVersion, 'prepared Node version'),
    npmExecutable: expectString(record.npmExecutable, 'prepared npm executable'),
    npmVersion: expectString(record.npmVersion, 'prepared npm version'),
    coreConsumer: expectedCore,
    chartsConsumer: expectedCharts,
    consumer: expectedConsumer,
    unrelatedDirectory: expectedUnrelated,
    nodeModules: [
      join(expectedCore, 'node_modules'),
      join(expectedCharts, 'node_modules'),
      join(expectedConsumer, 'node_modules'),
    ],
    workspaceSeal: {
      digest,
      entryCount: expectInteger(sealValue.entryCount, 'prepared workspace entry count'),
      fileCount: expectInteger(sealValue.fileCount, 'prepared workspace file count'),
      byteCount: expectInteger(sealValue.byteCount, 'prepared workspace byte count'),
    },
    readOnlyWorkspace: record.readOnlyWorkspace,
  };
  for (const digestValue of [state.artifactSha256, state.packResultSha256]) {
    if (!/^sha256:[0-9a-f]{64}$/u.test(digestValue)) fail('prepared state has an invalid SHA-256');
  }
  assertSri512(state.artifactIntegrity, 'prepared artifact integrity');
  return state;
}

function readAndVerifyPreparedState(
  workspace: string,
  expectedStateDigest: string,
  requestedNodeExecutable?: string,
): { readonly state: PreparedState; readonly packed: PackedResult } {
  if (!isAbsolute(workspace) || realpathSync(workspace) !== workspace) {
    fail('execute workspace must be an existing canonical absolute directory');
  }
  const fixture = validateFixtureSources();
  const statePath = join(workspace, STATE_FILENAME);
  if (!/^sha256:[0-9a-f]{64}$/u.test(expectedStateDigest)) {
    fail('expected prepared-state digest is invalid');
  }
  const stateRaw = readRegularFileStable(
    statePath,
    undefined,
    'prepared package-smoke state',
    MAX_JSON_BYTES,
  );
  if (sha256(stateRaw) !== expectedStateDigest) {
    fail('prepared-state digest differs from the prepare output');
  }
  const state = validatePreparedState(
    parseCanonicalJsonBuffer(stateRaw, 'prepared package-smoke state'),
    workspace,
  );
  assertWorkspaceReadOnly(workspace, state.readOnlyWorkspace);
  const canonicalNode = resolveExecutable(
    requestedNodeExecutable ?? state.nodeExecutable,
    'node',
    'Node executable',
  );
  if (canonicalNode !== state.nodeExecutable) fail('execute Node differs from prepared Node');
  commandEnvironment = scrubbedEnvironment(canonicalNode);
  const observedNodeVersion = executableVersion(canonicalNode, 'Node');
  if (observedNodeVersion !== state.nodeVersion) fail('execute Node version differs from prepared Node');
  const artifactPath = join(workspace, 'artifact', LOCAL_TARBALL_FILENAME);
  const artifactStats = lstatSync(artifactPath);
  const artifact = readRegularFileStable(
    artifactPath,
    artifactStats.size,
    'prepared Cortexel package tarball',
    PACKAGE_TARBALL_LIMITS.compressedBytes,
  );
  if (sha256(artifact) !== state.artifactSha256 || sha512Integrity(artifact) !== state.artifactIntegrity) {
    fail('prepared Cortexel artifact bytes changed');
  }
  const packResultPath = join(workspace, PACK_RESULT_FILENAME);
  const { packed, raw: packResultRaw } = readPackedResultStable(packResultPath);
  if (sha256(packResultRaw) !== state.packResultSha256) {
    fail('prepared npm pack inventory changed');
  }
  if (
    packed.version !== state.packageVersion ||
    packed.integrity !== state.artifactIntegrity ||
    packed.name !== 'cortexel'
  ) {
    fail('prepared npm pack inventory differs from prepared state');
  }
  inspectNpmPackageTarball(artifact, packed, expectedPackageClosure(fixture.packageJson));
  const observedSeal = fingerprintPackageSmokeWorkspace(workspace);
  if (!exactJsonEqual(observedSeal, state.workspaceSeal)) fail('prepared workspace seal mismatch');
  const guardPath = join(workspace, NETWORK_GUARD_FILENAME);
  commandEnvironment.NODE_OPTIONS = `--require=${JSON.stringify(guardPath)}`;
  commandEnvironment.CORTEXEL_PACKAGE_SMOKE_PHASE = 'execute';
  commandEnvironment.npm_config_offline = 'true';
  return { state, packed };
}

export function parsePackageSmokeInvocation(argv: readonly string[]): SmokeInvocation {
  if (argv.length === 0) return { command: 'all' };
  const [command, ...rest] = argv;
  if (command !== 'prepare' && command !== 'execute') {
    fail(
      'usage: smoke-package.ts prepare --workspace ABS --node-executable ABS ' +
      '--npm-executable ABS | execute --workspace ABS --expected-state-digest sha256:HEX ' +
      '[--node-executable ABS]',
    );
  }
  let workspace: string | undefined;
  let nodeExecutable: string | undefined;
  let npmExecutable: string | undefined;
  let expectedStateDigest: string | undefined;
  for (let index = 0; index < rest.length; index += 2) {
    const option = rest[index];
    const value = rest[index + 1];
    if (value === undefined) fail(`missing value for ${String(option)}`);
    if (option === '--workspace' && workspace === undefined) workspace = value;
    else if (option === '--node-executable' && nodeExecutable === undefined) nodeExecutable = value;
    else if (option === '--npm-executable' && npmExecutable === undefined) npmExecutable = value;
    else if (option === '--expected-state-digest' && expectedStateDigest === undefined) {
      expectedStateDigest = value;
    }
    else fail(`unknown or duplicate package-smoke option ${String(option)}`);
  }
  if (workspace === undefined || !isAbsolute(workspace)) {
    fail(`${command} requires --workspace with an absolute path`);
  }
  if (command === 'execute' && npmExecutable !== undefined) {
    fail('--npm-executable is valid only during prepare');
  }
  if (command === 'prepare' && expectedStateDigest !== undefined) {
    fail('--expected-state-digest is valid only during execute');
  }
  if (command === 'execute' && expectedStateDigest === undefined) {
    fail('execute requires --expected-state-digest from the prepare output');
  }
  if (command === 'prepare' && (nodeExecutable === undefined || npmExecutable === undefined)) {
    fail('explicit prepare requires absolute --node-executable and --npm-executable paths');
  }
  return {
    command,
    workspace: resolve(workspace),
    ...(nodeExecutable === undefined ? {} : { nodeExecutable }),
    ...(npmExecutable === undefined ? {} : { npmExecutable }),
    ...(expectedStateDigest === undefined ? {} : { expectedStateDigest }),
  };
}

function phaseOutput(
  phase: SmokePhase,
  status: 'prepared' | 'passed',
  state: PreparedState,
  stateDigest: string,
): PackageSmokePhaseOutput {
  return {
    schema: PHASE_OUTPUT_SCHEMA,
    phase,
    status,
    workspace: state.workspace,
    stateFile: join(state.workspace, STATE_FILENAME),
    stateDigest,
    packageVersion: state.packageVersion,
    artifactIntegrity: state.artifactIntegrity,
    nodeExecutable: state.nodeExecutable,
    nodeModules: state.nodeModules,
    workspaceSeal: state.workspaceSeal.digest,
  };
}

const runtimeAnalysisProbe = `
  const inclusiveLeft = core.spikeTrialsToPsthParams(
    [{ times: [19.9], senders: [1] }],
    {
      alignmentTimesMs: [20],
      windowMs: [-0.1, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'package smoke',
    },
  );
  const exclusiveRight = core.spikeTrialsToPsthParams(
    [{ times: [0.3], senders: [1] }],
    {
      alignmentTimesMs: [0.2],
      windowMs: [0, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'package smoke',
    },
  );
  const highIndex = core.spikeRecorderToPopulationRateParams(
    { times: [49998.99999], senders: [1] },
    {
      startMs: 0,
      stopMs: 50000,
      binWidthMs: 1,
      populations: [{ id: 'E', label: 'E', senderIds: [1] }],
      unassignedPolicy: 'reject',
    },
  );
  if (!inclusiveLeft.ok || inclusiveLeft.params.values[0] !== 1 ||
      !exclusiveRight.ok || exclusiveRight.params.values[0] !== 0 ||
      !highIndex.ok || highIndex.params.series[0].spike_counts[49998] !== 1 ||
      highIndex.params.series[0].spike_counts[49999] !== 0) {
    throw new Error('packed analysis boundary semantics are incorrect');
  }
`;

const runtimeTopologyProbe = `
  const scalarSnapshot = core.normalizeSynapseCollectionSnapshot({
    source: 1,
    target: 3,
    weight: 0,
    delay: 1.5,
    target_thread: 0,
    synapse_id: 7,
    port: 0,
  });
  const snapshot = {
    source: [1, 1, 2],
    target: [3, 3, 4],
    weight: [2, -2, 0],
    delay: [1, 2, 3],
  };
  const common = {
    sourceIds: [1, 2],
    targetIds: [3, 4],
    snapshotTimeMs: 0,
    snapshotScope: { kind: 'single_process_complete' },
  };
  const adjacency = core.synapseCollectionToAdjacencyMatrixParams(snapshot, common);
  const graph = core.synapseCollectionToConnectionGraphParams(snapshot, {
    ...common,
    weightUnits: 'pA',
    delayUnits: 'ms',
    samplePolicy: { kind: 'complete' },
  });
  const weights = core.synapseCollectionToWeightMatrixParams(snapshot, {
    ...common,
    weightUnits: 'pA',
    aggregation: 'sum',
  });
  const delays = core.synapseCollectionToDelayMatrixParams(snapshot, {
    ...common,
    delayUnits: 'ms',
    aggregation: 'mean',
  });
  const localInDegree = core.synapseCollectionToInDegreeDistributionParams(snapshot, {
    ...common,
    snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    normalization: 'count',
  });
  const localOutDegree = core.synapseCollectionToOutDegreeDistributionParams(snapshot, {
    ...common,
    snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    normalization: 'count',
  });
  const delayDistribution = core.synapseCollectionToDelayDistributionParams(snapshot, {
    ...common,
    delayUnits: 'ms',
    binWidthMs: 1,
    windowStartMs: 1,
    windowStopMs: 4,
    normalization: 'count',
  });
  const spatial = core.getPositionToSpatialMap2DParams(
    [[-5, 0], [5, 0]],
    {
      nodeIds: [1, 2],
      coordinateUnits: 'µm',
      extent: [10, 4],
      center: [0, 0],
      edgeWrap: false,
      positionScope: { kind: 'single_process_complete' },
    },
  );
  const largeOrigin = 1e9;
  const preciseDelay = core.synapseCollectionToDelayDistributionParams(
    { source: [1], target: [2], delay: [largeOrigin + 1 - 1e-6] },
    {
      sourceIds: [1],
      targetIds: [2],
      snapshotTimeMs: 0,
      snapshotScope: { kind: 'single_process_complete' },
      delayUnits: 'ms',
      binWidthMs: 1,
      windowStartMs: largeOrigin,
      windowStopMs: largeOrigin + 2,
      normalization: 'count',
    },
  );
  const meanUnderflow = core.synapseCollectionToWeightMatrixParams(
    { source: [1, 1], target: [3, 3], weight: [-5e-324, 0] },
    { ...common, weightUnits: 'pA', aggregation: 'mean' },
  );
  const densityOverflow = core.synapseCollectionToDelayDistributionParams(
    { source: [1, 1], target: [3, 3], delay: [1, 2] },
    {
      ...common,
      delayUnits: 'ms',
      binWidthMs: Number.MAX_VALUE,
      windowStartMs: 0,
      windowStopMs: Number.MAX_VALUE,
      normalization: 'probability_density',
    },
  );
  const spatialDrift = core.getPositionToSpatialMap2DParams(
    [[1e15 + 0.75, 1e15]],
    {
      nodeIds: [1], coordinateUnits: 'mm', extent: [1, 1], center: [1e15, 1e15],
      edgeWrap: false, positionScope: { kind: 'single_process_complete' },
    },
  );
  const falseIdentity = graph.ok
    ? core.ConnectionGraphParamsSchema.safeParse({
        ...graph.params,
        edges: [{ ...graph.params.edges[0], id: 'not-a-canonical-id' }, ...graph.params.edges.slice(1)],
      }).success
    : true;
  if (!scalarSnapshot.ok || scalarSnapshot.params.weights?.[0] !== 0 ||
      !adjacency.ok || adjacency.params.connection_count !== 3 ||
      adjacency.params.cells[0].connection_count !== 2 ||
      !graph.ok || graph.params.edges.length !== 3 ||
      graph.params.edge_identity !== 'canonical_sorted_ordinal' ||
      !weights.ok || weights.params.cells[0].value !== 0 ||
      weights.params.cells[0].connection_count !== 2 ||
      !delays.ok || delays.params.cells[0].value !== 1.5 ||
      !localInDegree.ok || localInDegree.params.connection_count !== 3 ||
      localOutDegree.ok || !delayDistribution.ok ||
      delayDistribution.params.delay_counts.join(',') !== '1,1,1' ||
      !spatial.ok || spatial.params.nodes.length !== 2 ||
      !preciseDelay.ok || preciseDelay.params.delay_counts.join(',') !== '1,0' ||
      meanUnderflow.ok || densityOverflow.ok || spatialDrift.ok || falseIdentity) {
    throw new Error('packed topology normalization or transform semantics are incorrect');
  }
`;

const runtimeManifestTopologyProbe = `
  for (const skill of manifest.skills) {
    if (skill.transform && typeof core[skill.transform.id] !== 'function') {
      throw new Error(\`manifest transform \${skill.transform.id} is not a packed core export\`);
    }
  }
  if (JSON.stringify(core.ROUTING_DISCRIMINATORS) !==
      JSON.stringify(manifest.routingDiscriminators)) {
    throw new Error('packed routing discriminators differ from the manifest');
  }
`;

const runtimeFigureContractProbe = `
  const renderSvgExportNames = Object.keys(renderSvg).sort();
  const expectedRenderSvgExportNames = [
    'buildFigure',
    'buildFigureFromJson',
    'buildFigureFromValidated',
  ];
  if (JSON.stringify(renderSvgExportNames) !== JSON.stringify(expectedRenderSvgExportNames)) {
    throw new Error('packed render-svg entry exposes raw plan or serializer authority: ' +
      JSON.stringify(renderSvgExportNames));
  }

  const identity = figure.getBuildIdentity();
  if (identity.requestContract !== 'cortexel-figure-request/1.0' ||
      identity.artifactContract !== 'cortexel-figure-artifact/1.0' ||
      identity.sourceRevision !== 'unreleased-worktree' || identity.release !== false ||
      identity.contractDigest !== contractManifest.contractDigest ||
      identity.catalogDigest !== contractManifest.catalogDigest ||
      identity.stableSkillCount !== contractManifest.stableSkillCount) {
    throw new Error('packed FigureRequest identity is incoherent');
  }

  const inventory = [];
  const stableSkillSources = [];
  for (const record of contractManifest.normativeSources) {
    if (!record.path.startsWith('contract/')) throw new Error('unsafe contract inventory path');
    const relative = record.path.slice('contract/'.length);
    if (relative.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error('unsafe contract inventory segment');
    }
    const value = JSON.parse(readFileSync(join(contractRoot, relative), 'utf8'));
    const digest = figure.sha256Digest(figure.canonicalize(value));
    if (digest !== record.digest) throw new Error('shipped contract file digest mismatch: ' + relative);
    inventory.push({ path: record.path, digest });
    if (relative.startsWith('skills/') && value.status === 'stable') stableSkillSources.push(value);
  }
  if (figure.sha256Digest(figure.canonicalize(inventory)) !== contractManifest.contractDigest) {
    throw new Error('shipped contract inventory does not reproduce contractDigest');
  }
  stableSkillSources.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  const catalogView = stableSkillSources.map((skill) => ({
    id: skill.id, revision: skill.revision, renderer: skill.renderer,
  }));
  if (figure.sha256Digest(figure.canonicalize(catalogView)) !== contractManifest.catalogDigest) {
    throw new Error('shipped skill bytes do not reproduce catalogDigest');
  }
  if (!contractManifest.stableSkills.every((skill) =>
      skill.availability === 'packaged' && skill.releaseReady === false)) {
    throw new Error('packaged availability was conflated with publication/release readiness');
  }

  const validated = figure.parseAndValidateRequest(JSON.stringify(spikeContract.examples.valid[0]));
  if (!validated.ok || validated.request.skillId !== 'neuro.spike_raster') {
    throw new Error('packed validator cannot validate a shipped living example');
  }
  const renderedValidated = validated.ok
    ? renderSvg.buildFigureFromValidated(validated.request)
    : null;
  if (!renderedValidated?.ok || !renderedValidated.svg.startsWith('<svg')) {
    throw new Error('packed renderer rejected a capability minted by the paired validator');
  }
  const rendered = renderSvg.buildFigure(spikeContract.examples.valid[0]);
  if (!rendered.ok || !rendered.svg.startsWith('<svg')) {
    throw new Error('packed headless renderer cannot render a shipped living example');
  }
  const adapted = nestAdapter.nestSpikeRecorderToRaster(
    {
      record_to: 'memory', time_in_steps: false, origin: 100.25, start: 0.5,
      stop: 10.75, n_events: 1, events: { senders: [1], times: [111] },
    },
    { recordedSenderIds: [1, 2], nestVersion: '3.10.0', runId: 'smoke', recorderId: 'sr' },
  );
  if (!adapted.ok || !figure.validateRequestValue(adapted.request).ok) {
    throw new Error('packed NEST adapter output does not pass the packed validator');
  }
  if (capabilityRegistry.registry !== 'cortexel-capabilities' ||
      requestSchema.$id !== 'https://sepahead.github.io/cortexel/schemas/v1/figure-request.v1.schema.json' ||
      packageMetadata.imports?.['#cortexel-request-capability'] !==
        './dist/internal/request-capability.cjs') {
    throw new Error('packaged registry/schema exports are incomplete');
  }
`;

interface PackageSmokeContext {
  readonly workspace: string;
  readonly coreConsumer: string;
  readonly chartsConsumer: string;
  readonly consumer: string;
  readonly unrelated: string;
  readonly nodeExecutable: string;
  readonly packed: PackedResult;
}

function runPackageSmokeBody(phase: SmokePhase, context: PackageSmokeContext): string {
  let consumer = context.coreConsumer;
  const chartsConsumer = context.chartsConsumer;
  const fullConsumer = context.consumer;
  const unrelated = context.unrelated;
  const nodeExecutable = context.nodeExecutable;
  const packed = context.packed;
  const phaseRun = (command: string, args: string[], cwd: string): string =>
    phase === 'execute' ? run(command, args, cwd) : '';
  const phaseWriteFile = (...args: Parameters<typeof writeFileSync>): void => {
    if (phase === 'prepare') writeFileSync(...args);
  };

  const packedPaths = packed.files.map((file) => file.path);
  for (const file of packed.files) {
    const packedPath = file.path;
    const expectedMode = packedPath === 'dist/cli/main.js' ? 0o755 : 0o644;
    if (file.mode !== expectedMode) {
      throw new Error(
        `tarball mode is not deterministic for ${packedPath}: ` +
        `expected ${expectedMode.toString(8)}, received ${file.mode.toString(8)}`,
      );
    }
  }
  const expectedContractFiles = packagedContractRelativeFiles(join(root, 'contract'))
    .map((relative) => `dist/contract/${relative}`);
  const actualContractFiles = packedPaths
    .filter((entry) => entry.startsWith('dist/contract/'))
    .sort();
  if (JSON.stringify(actualContractFiles) !== JSON.stringify(expectedContractFiles.sort())) {
    throw new Error('tarball contract tree differs from the closed normative package inventory');
  }
  const physicalContractManifests = packedPaths.filter(
    (entry) => entry.endsWith('contract/manifest.v1.json'),
  );
  if (physicalContractManifests.length !== 1 ||
      physicalContractManifests[0] !== 'dist/contract/manifest.v1.json') {
    throw new Error('tarball does not contain exactly one physical normative contract copy');
  }
  for (const entry of packedPaths) {
    if (
      /(^|\/)\.env(?:\.|$)/u.test(entry) ||
      /^(?:src|core|react|contract|scripts|test|python)\//u.test(entry)
    ) {
      throw new Error(`tarball contains a source or environment path: ${entry}`);
    }
  }
  if (!packedPaths.includes('package.json')) {
    throw new Error('tarball is missing package.json');
  }
  if (!packedPaths.includes('dist/internal/request-capability.cjs')) {
    throw new Error('tarball is missing the shared request-capability runtime');
  }

  let installedRoot = join(consumer, 'node_modules', 'cortexel');
  for (const requiredNotice of [
    'THIRD_PARTY_NOTICES.md',
    'LICENSES/Apache-2.0.txt',
    'LICENSES/CC0-1.0.txt',
    'LICENSES/Matplotlib.txt',
    'LICENSES/PNNL-cividis.txt',
  ]) {
    if (!existsSync(join(installedRoot, requiredNotice))) {
      throw new Error(`packed package is missing required third-party notice ${requiredNotice}`);
    }
  }
  for (const forbiddenPeer of [
    'react',
    'react-dom',
    'three',
    '@react-three/fiber',
    'd3-force-3d',
  ]) {
    if (existsSync(join(consumer, 'node_modules', forbiddenPeer))) {
      throw new Error(`pure package probe unexpectedly installed optional peer ${forbiddenPeer}`);
    }
  }

  phaseRun(
    nodeExecutable,
    [
      '-e',
      `
        let networkDenied = false;
        let writeDenied = false;
        try { require('node:net').connect({ host: '127.0.0.1', port: 9 }); }
        catch (error) { networkDenied = String(error).includes('denied execute-phase authority'); }
        try { require('node:fs').writeFileSync('forbidden-execute-write', 'x'); }
        catch (error) { writeDenied = String(error).includes('denied execute-phase authority'); }
        if (!networkDenied || !writeDenied ||
            process.env.CORTEXEL_PACKAGE_SMOKE_PHASE !== 'execute') {
          throw new Error('execute-phase network/write guard is not active');
        }
      `,
    ],
    consumer,
  );

  phaseRun(
    nodeExecutable,
    [
      '--input-type=module',
      '-e',
      `
        import { connect } from 'node:net';
        import { resolve4 } from 'node:dns/promises';
        import { writeFileSync } from 'node:fs';
        import { open } from 'node:fs/promises';
        const denied = (error) => String(error).includes('denied execute-phase authority');
        let netDenied = false;
        let dnsDenied = false;
        let writeDenied = false;
        let handleDenied = false;
        try { connect({ host: '127.0.0.1', port: 9 }); } catch (error) { netDenied = denied(error); }
        try { await resolve4('invalid.example'); } catch (error) { dnsDenied = denied(error); }
        try { writeFileSync('forbidden-esm-write', 'x'); } catch (error) { writeDenied = denied(error); }
        const handle = await open('package.json', 'r');
        try { await handle.utimes(new Date(0), new Date(0)); }
        catch (error) { handleDenied = denied(error); }
        finally { await handle.close(); }
        if (!netDenied || !dnsDenied || !writeDenied || !handleDenied) {
          throw new Error('execute-phase ESM network/write guard is not active');
        }
      `,
    ],
    consumer,
  );

  phaseRun(
    nodeExecutable,
    [
      '--input-type=module',
      '-e',
      `
        const root = await import('cortexel');
        const core = await import('cortexel/core');
        const figure = await import('cortexel/figure');
        const renderSvg = await import('cortexel/render-svg');
        const nestAdapter = await import('cortexel/adapters/nest');
        const manifest = (await import('cortexel/skills.manifest.json', {
          with: { type: 'json' },
        })).default;
        const contractManifest = (await import('cortexel/contract/manifest.json', {
          with: { type: 'json' },
        })).default;
        const spikeContract = (await import(
          'cortexel/contract/skills/neuro.spike_raster.v1.json',
          { with: { type: 'json' } },
        )).default;
        const capabilityRegistry = (await import(
          'cortexel/contract/registries/capabilities.v1.json',
          { with: { type: 'json' } },
        )).default;
        const requestSchema = (await import(
          'cortexel/contract/schemas/figure-request.v1.schema.json',
          { with: { type: 'json' } },
        )).default;
        const packageMetadata = (await import('cortexel/package.json', {
          with: { type: 'json' },
        })).default;
        let deepRenderImportBlocked = false;
        try {
          await import('cortexel/dist/render-svg/index.js');
        } catch (error) {
          deepRenderImportBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!deepRenderImportBlocked) {
          throw new Error('ESM package exports did not encapsulate the render implementation');
        }
        const { readFileSync } = await import('node:fs');
        const { dirname, join } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const contractRoot = dirname(fileURLToPath(import.meta.resolve(
          'cortexel/contract/manifest.json',
        )));
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            typeof figure.parseAndValidateRequest !== 'function' ||
            typeof renderSvg.buildFigure !== 'function' ||
            typeof nestAdapter.nestSpikeRecorderToRaster !== 'function' ||
            packageMetadata.name !== 'cortexel' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('ESM core exports are incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
        ${runtimeFigureContractProbe}
      `,
    ],
    consumer,
  );
  phaseRun(
    nodeExecutable,
    [
      '-e',
      `
        const root = require('cortexel');
        const core = require('cortexel/core');
        const figure = require('cortexel/figure');
        const renderSvg = require('cortexel/render-svg');
        const nestAdapter = require('cortexel/adapters/nest');
        const manifest = require('cortexel/skills.manifest.json');
        const contractManifest = require('cortexel/contract/manifest.json');
        const spikeContract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
        const capabilityRegistry = require('cortexel/contract/registries/capabilities.v1.json');
        const requestSchema = require('cortexel/contract/schemas/figure-request.v1.schema.json');
        const packageMetadata = require('cortexel/package.json');
        let deepRenderRequireBlocked = false;
        try {
          require('cortexel/dist/render-svg/index.cjs');
        } catch (error) {
          deepRenderRequireBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!deepRenderRequireBlocked) {
          throw new Error('CJS package exports did not encapsulate the render implementation');
        }
        const { readFileSync } = require('node:fs');
        const { dirname, join } = require('node:path');
        const contractRoot = dirname(require.resolve('cortexel/contract/manifest.json'));
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            typeof figure.parseAndValidateRequest !== 'function' ||
            typeof renderSvg.buildFigure !== 'function' ||
            typeof nestAdapter.nestSpikeRecorderToRaster !== 'function' ||
            packageMetadata.name !== 'cortexel' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('CJS core exports are incomplete');
        }
        if (!Array.isArray(manifest.skills) || manifest.skills.length !== ${NEST_SKILL_IDS.length} ||
            manifest.manifestVersion !== '10' ||
            manifest.paramConstraintLanguage?.version !== ${JSON.stringify(PARAM_CONSTRAINT_LANGUAGE.version)} ||
            manifest.skillAxisVersion !== ${JSON.stringify(CORTEXEL_SKILL_VERSION)} ||
            manifest.specVersion !== ${JSON.stringify(CORTEXEL_SPEC_VERSION)} ||
            manifest.routingDiscriminators?.get_connections?.weight_matrix !== 'nest.weight_matrix' ||
            manifest.skills.find((skill) => skill.id === 'nest.connection_graph')?.transform?.id !==
              'synapseCollectionToConnectionGraphParams' ||
            manifest.skills.find((skill) => skill.id === 'nest.connectivity_matrix')?.deprecation?.replacement !==
              'nest.connection_graph') {
          throw new Error('manifest export is missing or incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
        ${runtimeFigureContractProbe}
      `,
    ],
    consumer,
  );

  // One process can load either conditional public surface. Every producer/consumer
  // pairing must share the exact private WeakSet, including mixed module formats.
  phaseWriteFile(
    join(consumer, 'mixed-capability-probe.mjs'),
    `
      import { createRequire } from 'node:module';
      import * as esmFigure from 'cortexel/figure';
      import * as esmRenderer from 'cortexel/render-svg';
      const require = createRequire(import.meta.url);
      const cjsFigure = require('cortexel/figure');
      const cjsRenderer = require('cortexel/render-svg');
      // An export map is API encapsulation, not a sandbox against code already
      // executing in this process: createRequire can deliberately choose a parent
      // inside another package. Even through that unsupported route, the physical
      // singleton must expose only the same validating functions, never membership
      // mutation or the private WeakSet itself.
      const packageScopedRequire = createRequire(require.resolve('cortexel/package.json'));
      const internalCapability = packageScopedRequire('#cortexel-request-capability');
      const expectedInternalExports = [
        'isValidatedRequest',
        'parseAndValidateRequest',
        'validateRequestValue',
      ];
      if (JSON.stringify(Object.keys(internalCapability).sort()) !==
          JSON.stringify(expectedInternalExports) ||
          internalCapability.parseAndValidateRequest !== esmFigure.parseAndValidateRequest ||
          internalCapability.parseAndValidateRequest !== cjsFigure.parseAndValidateRequest) {
        throw new Error('shared request-capability runtime exposes excess authority or split identity');
      }
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const input = JSON.stringify(contract.examples.valid[0]);
      const esmValidated = esmFigure.parseAndValidateRequest(input);
      const cjsValidated = cjsFigure.parseAndValidateRequest(input);
      if (!esmValidated.ok || !cjsValidated.ok) {
        throw new Error('mixed-format probe could not mint validated requests');
      }
      const combinations = [
        ['ESM to ESM', esmRenderer.buildFigureFromValidated(esmValidated.request)],
        ['CJS to CJS', cjsRenderer.buildFigureFromValidated(cjsValidated.request)],
        ['ESM to CJS', cjsRenderer.buildFigureFromValidated(esmValidated.request)],
        ['CJS to ESM', esmRenderer.buildFigureFromValidated(cjsValidated.request)],
      ];
      for (const [label, result] of combinations) {
        if (!result.ok || !result.svg.startsWith('<svg')) {
          throw new Error(label + ' request-capability handoff failed');
        }
      }
      const copiedToken = { ...esmValidated.request };
      const proxiedToken = new Proxy(esmValidated.request, {});
      for (const [label, candidate] of [
        ['copied', copiedToken],
        ['proxied', proxiedToken],
      ]) {
        for (const renderer of [esmRenderer, cjsRenderer]) {
          const result = renderer.buildFigureFromValidated(candidate);
          if (result.ok || result.errors?.[0]?.code !== 'RENDER_UNVALIDATED_REQUEST') {
            throw new Error(label + ' request token forged the private WeakSet capability');
          }
        }
      }
      for (const specifier of [
        'cortexel/internal/request-capability',
        'cortexel/dist/internal/request-capability.cjs',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        try { require(specifier); } catch (error) {
          requireBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('private capability module escaped through package exports: ' + specifier);
        }
      }
      for (const specifier of [
        'cortexel/contract/../internal/request-capability.cjs',
        'cortexel/contract/%2e%2e/internal/request-capability.cjs',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_INVALID_MODULE_SPECIFIER';
        }
        try { require(specifier); } catch (error) {
          requireBlocked = error?.code === 'ERR_INVALID_MODULE_SPECIFIER';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('contract wildcard traversed into the private runtime: ' + specifier);
        }
      }
      let privateImportBlocked = false;
      let privateRequireBlocked = false;
      try { await import('#cortexel-request-capability'); } catch (error) {
        privateImportBlocked = error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED';
      }
      try { require('#cortexel-request-capability'); } catch (error) {
        privateRequireBlocked =
          error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED' || error?.code === 'MODULE_NOT_FOUND';
      }
      if (!privateImportBlocked || !privateRequireBlocked) {
        throw new Error('consumer reached Cortexel package-private import mapping');
      }
    `,
  );
  phaseRun(nodeExecutable, [join(consumer, 'mixed-capability-probe.mjs')], consumer);

  // Resolve the package from the probe module, then execute it from a directory with
  // no package.json, node_modules, or contract tree. Validation must locate schemas
  // relative to the installed bundle rather than process.cwd().
  phaseWriteFile(
    join(consumer, 'unrelated-cwd-probe.mjs'),
    `
      import * as figure from 'cortexel/figure';
      import * as renderSvg from 'cortexel/render-svg';
      import * as nestAdapter from 'cortexel/adapters/nest';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const result = figure.parseAndValidateRequest(JSON.stringify(contract.examples.valid[0]));
      if (!result.ok || typeof renderSvg.buildFigure !== 'function' ||
          typeof nestAdapter.nestSpikeRecorderToRaster !== 'function') {
        throw new Error('ESM validation failed from unrelated cwd');
      }
    `,
  );
  phaseWriteFile(
    join(consumer, 'unrelated-cwd-probe.cjs'),
    `
      const figure = require('cortexel/figure');
      const renderSvg = require('cortexel/render-svg');
      const nestAdapter = require('cortexel/adapters/nest');
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const result = figure.parseAndValidateRequest(JSON.stringify(contract.examples.valid[0]));
      if (!result.ok || typeof renderSvg.buildFigure !== 'function' ||
          typeof nestAdapter.nestSpikeRecorderToRaster !== 'function') {
        throw new Error('CJS validation failed from unrelated cwd');
      }
    `,
  );
  phaseRun(nodeExecutable, [join(consumer, 'unrelated-cwd-probe.mjs')], unrelated);
  phaseRun(nodeExecutable, [join(consumer, 'unrelated-cwd-probe.cjs')], unrelated);

  const installedCliEsm = join(installedRoot, 'dist', 'cli', 'main.js');
  const installedCliCjs = join(installedRoot, 'dist', 'cli', 'main.cjs');
  if (!readFileSync(installedCliEsm, 'utf8').startsWith('#!/usr/bin/env node\n')) {
    throw new Error('installed cortexel bin is missing #!/usr/bin/env node');
  }
  const executable = process.platform === 'win32'
    ? join(consumer, 'node_modules', '.bin', 'cortexel.cmd')
    : join(consumer, 'node_modules', '.bin', 'cortexel');
  if (!existsSync(executable)) throw new Error('npm did not install the cortexel bin');
  if (process.platform !== 'win32' && (statSync(executable).mode & 0o111) === 0) {
    throw new Error('installed cortexel bin is not executable');
  }
  const runInstalledCli = (args: string[]) => process.platform === 'win32'
    ? runResult(nodeExecutable, [installedCliEsm, ...args], unrelated)
    : runResult(executable, args, unrelated);

  phaseWriteFile(
    join(consumer, 'import-cli.mjs'),
    `await import(${JSON.stringify(pathToFileURL(installedCliEsm).href)});\nprocess.stdout.write('imported\\n');\n`,
  );
  phaseWriteFile(
    join(consumer, 'import-cli.cjs'),
    `require(${JSON.stringify(installedCliCjs)});\nprocess.stdout.write('imported\\n');\n`,
  );
  if (phase === 'execute') {
    for (const importer of ['import-cli.mjs', 'import-cli.cjs']) {
      const imported = runResult(nodeExecutable, [join(consumer, importer)], unrelated);
      if (imported.status !== 0 || imported.stdout !== 'imported\n' || imported.stderr !== '') {
        throw new Error(`packed CLI import guard failed for ${importer}`);
      }
    }

    const identityResult = runInstalledCli(['identity', '--json']);
    if (identityResult.status !== 0 || identityResult.stderr !== '') {
      throw new Error('packed CLI identity command failed');
    }
    const cliIdentity = JSON.parse(identityResult.stdout) as Record<string, unknown>;
    const installedContractManifest = JSON.parse(readFileSync(
      join(installedRoot, 'dist', 'contract', 'manifest.v1.json'),
      'utf8',
    )) as Record<string, unknown>;
    const installedPackage = JSON.parse(readFileSync(
      join(installedRoot, 'package.json'),
      'utf8',
    )) as Record<string, unknown>;
    if (installedPackage.main !== './dist/index.cjs') {
      throw new Error('legacy main entry was not retained alongside package exports');
    }
    if (
      cliIdentity.packageVersion !== installedPackage.version ||
      cliIdentity.contractDigest !== installedContractManifest.contractDigest ||
      cliIdentity.catalogDigest !== installedContractManifest.catalogDigest ||
      cliIdentity.sourceRevision !== 'unreleased-worktree' ||
      cliIdentity.release !== false
    ) {
      throw new Error('packed CLI identity differs from shipped package/contract bytes');
    }
  }

  const validRequestPath = join(unrelated, 'valid.json');
  const malformedPath = join(unrelated, 'malformed.json');
  const structuralPath = join(unrelated, 'structural.json');
  const legacyPath = join(unrelated, 'legacy.json');
  const installedSpikeContract = JSON.parse(readFileSync(
    join(installedRoot, 'dist', 'contract', 'skills', 'neuro.spike_raster.v1.json'),
    'utf8',
  )) as { examples: { valid: unknown[] } };
  phaseWriteFile(validRequestPath, `${JSON.stringify(installedSpikeContract.examples.valid[0])}\n`);
  phaseWriteFile(malformedPath, '{');
  phaseWriteFile(structuralPath, '{}\n');
  phaseWriteFile(
    legacyPath,
    '{"skill":{"id":"nest.voltage_trace"},"data":{},"parameters":{}}\n',
  );
  const cliExitCases: Array<{ args: string[]; expected: number }> = [
    { args: [], expected: 2 },
    { args: ['validate', validRequestPath], expected: 0 },
    { args: ['validate', malformedPath], expected: 3 },
    { args: ['validate', structuralPath], expected: 4 },
    { args: ['migrate', legacyPath], expected: 5 },
    { args: ['validate', join(unrelated, 'absent.json')], expected: 7 },
  ];
  if (phase === 'execute') {
    for (const testCase of cliExitCases) {
      const result = runInstalledCli(testCase.args);
      if (result.status !== testCase.expected) {
        throw new Error(
          `packed CLI exit mismatch: expected ${testCase.expected}, got ${result.status}`,
        );
      }
    }
  }

  consumer = chartsConsumer;
  installedRoot = join(consumer, 'node_modules', 'cortexel');
  for (const forbiddenHeavyPeer of ['three', '@react-three/fiber', 'd3-force-3d']) {
    if (existsSync(join(consumer, 'node_modules', forbiddenHeavyPeer))) {
      throw new Error(`chart-only probe unexpectedly installed heavy peer ${forbiddenHeavyPeer}`);
    }
  }

  // The canonical chart subpath is intentionally React + SVG only. Exercise it
  // before installing three/r3f/d3 so an accidental heavyweight import fails.
  for (const mode of ['import', 'require'] as const) {
    const expression = mode === 'import'
      ? `
          const charts = await import('cortexel/react/charts');
          if (typeof charts.ReferenceVizSpecFigure !== 'function' ||
              typeof charts.ReferenceChartScene !== 'function' ||
              typeof charts.binnedStepPath !== 'function' ||
              typeof charts.boundedStemPointPaths !== 'function' ||
              typeof charts.matrixValueBucketPaths !== 'function' ||
              typeof charts.circleTopologyGeometry !== 'function' ||
              typeof charts.equalAspectDomains !== 'function' ||
              charts.REFERENCE_CHART_SKILLS?.length !== 19 ||
              !charts.REFERENCE_CHART_SKILLS.includes('nest.spatial_map_2d')) {
            throw new Error('ESM chart exports are incomplete');
          }
        `
      : `
          const charts = require('cortexel/react/charts');
          if (typeof charts.ReferenceVizSpecFigure !== 'function' ||
              typeof charts.ReferenceChartScene !== 'function' ||
              typeof charts.binnedStepPath !== 'function' ||
              typeof charts.boundedStemPointPaths !== 'function' ||
              typeof charts.matrixValueBucketPaths !== 'function' ||
              typeof charts.circleTopologyGeometry !== 'function' ||
              typeof charts.equalAspectDomains !== 'function' ||
              charts.REFERENCE_CHART_SKILLS?.length !== 19 ||
              !charts.REFERENCE_CHART_SKILLS.includes('nest.spatial_map_2d')) {
            throw new Error('CJS chart exports are incomplete');
          }
        `;
    phaseRun(
      nodeExecutable,
      mode === 'import'
        ? ['--input-type=module', '-e', expression]
        : ['-e', expression],
      consumer,
    );
  }

  consumer = fullConsumer;
  installedRoot = join(consumer, 'node_modules', 'cortexel');

  for (const mode of ['import', 'require'] as const) {
    const expression =
      mode === 'import'
        ? `
            const react = await import('cortexel/react');
            const graph = await import('cortexel/react/knowledge-graph');
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function' ||
                typeof graph.KnowledgeGraphLegend !== 'function') {
              throw new Error('ESM React exports are incomplete');
            }
          `
        : `
            const react = require('cortexel/react');
            const graph = require('cortexel/react/knowledge-graph');
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function' ||
                typeof graph.KnowledgeGraphLegend !== 'function') {
              throw new Error('CJS React exports are incomplete');
            }
          `;
    phaseRun(
      nodeExecutable,
      mode === 'import'
        ? ['--input-type=module', '-e', expression]
        : ['-e', expression],
      consumer,
    );
  }

  // Prove the published conditional declarations work in a real consumer, not
  // only under Cortexel's source tsconfig. .ts selects import types; .cts selects
  // require types under NodeNext.
  phaseWriteFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        jsx: 'react-jsx',
        types: ['node'],
      },
      include: ['consumer.ts', 'consumer.cts'],
    }),
  );
  phaseWriteFile(
    join(consumer, 'consumer.ts'),
    `
      import { buildVizSpec } from 'cortexel';
      import {
        getBuildIdentity,
        parseAndValidateRequest,
        type InputAssurance,
        type ValidatedRequest,
      } from 'cortexel/figure';
      import {
        buildFigure,
        buildFigureFromJson,
        buildFigureFromValidated,
        type FigureFailure,
        type FigureResult,
      } from 'cortexel/render-svg';
      import * as renderSvgSurface from 'cortexel/render-svg';
      import {
        nestSpikeRecorderToRaster,
        type NestSpikeExport,
        type NestSpikeOptions,
      } from 'cortexel/adapters/nest';
      import {
        correlationDetectorToCorrelogramParams,
        ROUTING_DISCRIMINATORS,
        getPositionToSpatialMap2DParams,
        normalizeSynapseCollectionSnapshot,
        spikeRecorderToIsiParams,
        spikeRecorderToPopulationRateParams,
        spikeTrialsToPsthParams,
        synapseCollectionToAdjacencyMatrixParams,
        synapseCollectionToConnectionGraphParams,
        synapseCollectionToDelayDistributionParams,
        synapseCollectionToDelayMatrixParams,
        synapseCollectionToInDegreeDistributionParams,
        synapseCollectionToOutDegreeDistributionParams,
        synapseCollectionToWeightMatrixParams,
        validateHostRendererSpec,
        type ConnectionGraphOptions,
        type DelayDistributionOptions,
        type NestTopologyResult,
        type SpatialMap2DOptions,
        type WeightMatrixParams,
      } from 'cortexel/core';
      import {
        NeuronA11yPager,
        PopulationA11yList,
        VizSpecRenderer,
        type RenderSceneArgs,
      } from 'cortexel/react';
      import {
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
        KnowledgeGraphLegend,
      } from 'cortexel/react/knowledge-graph';
      import {
        ReferenceVizSpecFigure,
        aggregateDegreeBins,
        aggregateUniformHistogramBins,
        binnedStepPath,
        boundedStemPointPaths,
        circleTopologyGeometry,
        equalAspectDomains,
        matrixValueBucketPaths,
      } from 'cortexel/react/charts';

      const authored = buildVizSpec({
        skill: 'nest.spike_raster',
        params: { times_ms: [1], senders: [1] },
        source: 'type-smoke',
      });
      const checkedRequest = parseAndValidateRequest('{}');
      if (checkedRequest.ok) buildFigureFromValidated(checkedRequest.request);
      const args = {} as RenderSceneArgs;
      const graphOptions = {} as ConnectionGraphOptions;
      const delayOptions = {} as DelayDistributionOptions;
      const spatialOptions = {} as SpatialMap2DOptions;
      const topologyResult = {} as NestTopologyResult<WeightMatrixParams>;
      const assurance = {} as InputAssurance;
      const validatedRequest = {} as ValidatedRequest;
      const figureResult = {} as FigureResult;
      const figureFailure = {} as FigureFailure;
      const nestExport = {} as NestSpikeExport;
      const nestOptions = {} as NestSpikeOptions;
      // @ts-expect-error the raw serializer is intentionally compiler-internal
      void renderSvgSurface.renderSvg;
      // @ts-expect-error resource accounting is intentionally compiler-internal
      void renderSvgSurface.countPlanResources;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatNumber;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatCoordinate;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatWithUnit;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvgSurface.linearScale;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvgSurface.linearTicks;
      // @ts-expect-error callers cannot import a plan-construction grammar
      type ForbiddenRenderPlan = import('cortexel/render-svg').RenderPlanV1;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenPanel = import('cortexel/render-svg').Panel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenMark = import('cortexel/render-svg').Mark;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAxis = import('cortexel/render-svg').Axis;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenTableModel = import('cortexel/render-svg').TableModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAccessibilityModel = import('cortexel/render-svg').AccessibilityModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenDisclosureBlock = import('cortexel/render-svg').DisclosureBlock;
      // @ts-expect-error callers cannot import the raw serializer report
      type ForbiddenSvgReport = import('cortexel/render-svg').SvgReport;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenLinearScale = import('cortexel/render-svg').LinearScale;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenTick = import('cortexel/render-svg').Tick;
      // @ts-expect-error the package export map encapsulates built implementation files
      type ForbiddenDeepRenderModule = typeof import('cortexel/dist/render-svg/index.js');
      // @ts-expect-error the shared capability registry is package-private
      type ForbiddenCapabilityModule = typeof import('cortexel/internal/request-capability');
      // @ts-expect-error package imports do not leak into the consumer package scope
      type ForbiddenPrivateImport = typeof import('#cortexel-request-capability');
      void [
        authored,
        getBuildIdentity,
        parseAndValidateRequest,
        buildFigure,
        buildFigureFromJson,
        buildFigureFromValidated,
        nestSpikeRecorderToRaster,
        assurance,
        validatedRequest,
        figureResult,
        figureFailure,
        nestExport,
        nestOptions,
        args.skill,
        validateHostRendererSpec,
        spikeRecorderToIsiParams,
        spikeTrialsToPsthParams,
        spikeRecorderToPopulationRateParams,
        correlationDetectorToCorrelogramParams,
        ROUTING_DISCRIMINATORS,
        graphOptions,
        delayOptions,
        spatialOptions,
        topologyResult,
        normalizeSynapseCollectionSnapshot,
        synapseCollectionToConnectionGraphParams,
        synapseCollectionToAdjacencyMatrixParams,
        synapseCollectionToWeightMatrixParams,
        synapseCollectionToDelayMatrixParams,
        synapseCollectionToInDegreeDistributionParams,
        synapseCollectionToOutDegreeDistributionParams,
        synapseCollectionToDelayDistributionParams,
        getPositionToSpatialMap2DParams,
        VizSpecRenderer,
        PopulationA11yList,
        NeuronA11yPager,
        ReferenceVizSpecFigure,
        binnedStepPath,
        boundedStemPointPaths,
        matrixValueBucketPaths,
        circleTopologyGeometry,
        aggregateDegreeBins,
        aggregateUniformHistogramBins,
        equalAspectDomains,
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
        KnowledgeGraphLegend,
      ];
    `,
  );
  phaseWriteFile(
    join(consumer, 'consumer.cts'),
    `
      import cortexel = require('cortexel');
      import core = require('cortexel/core');
      import figure = require('cortexel/figure');
      import renderSvg = require('cortexel/render-svg');
      import nestAdapter = require('cortexel/adapters/nest');
      import react = require('cortexel/react');
      import charts = require('cortexel/react/charts');
      import graph = require('cortexel/react/knowledge-graph');
      const build: typeof cortexel.buildVizSpec = core.buildVizSpec;
      const graphOptions = {} as core.ConnectionGraphOptions;
      const delayOptions = {} as core.DelayDistributionOptions;
      const spatialOptions = {} as core.SpatialMap2DOptions;
      const topologyResult = {} as core.NestTopologyResult<core.WeightMatrixParams>;
      const assurance = {} as figure.InputAssurance;
      const validatedRequest = {} as figure.ValidatedRequest;
      const figureResult = {} as renderSvg.FigureResult;
      const figureFailure = {} as renderSvg.FigureFailure;
      const nestExport = {} as nestAdapter.NestSpikeExport;
      const nestOptions = {} as nestAdapter.NestSpikeOptions;
      const checkedRequest = figure.parseAndValidateRequest('{}');
      if (checkedRequest.ok) renderSvg.buildFigureFromValidated(checkedRequest.request);
      // @ts-expect-error the raw serializer is intentionally compiler-internal
      void renderSvg.renderSvg;
      // @ts-expect-error resource accounting is intentionally compiler-internal
      void renderSvg.countPlanResources;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatNumber;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatCoordinate;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatWithUnit;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvg.linearScale;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvg.linearTicks;
      // @ts-expect-error callers cannot import a plan-construction grammar
      type ForbiddenRenderPlan = renderSvg.RenderPlanV1;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenPanel = renderSvg.Panel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenMark = renderSvg.Mark;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAxis = renderSvg.Axis;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenTableModel = renderSvg.TableModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAccessibilityModel = renderSvg.AccessibilityModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenDisclosureBlock = renderSvg.DisclosureBlock;
      // @ts-expect-error callers cannot import the raw serializer report
      type ForbiddenSvgReport = renderSvg.SvgReport;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenLinearScale = renderSvg.LinearScale;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenTick = renderSvg.Tick;
      // @ts-expect-error the package export map encapsulates built implementation files
      type ForbiddenDeepRenderModule = typeof import('cortexel/dist/render-svg/index.cjs');
      // @ts-expect-error the shared capability registry is package-private
      type ForbiddenCapabilityModule = typeof import('cortexel/internal/request-capability');
      // @ts-expect-error package imports do not leak into the consumer package scope
      type ForbiddenPrivateImport = typeof import('#cortexel-request-capability');
      void [
        build,
        figure.getBuildIdentity,
        figure.parseAndValidateRequest,
        renderSvg.buildFigure,
        renderSvg.buildFigureFromJson,
        renderSvg.buildFigureFromValidated,
        nestAdapter.nestSpikeRecorderToRaster,
        assurance,
        validatedRequest,
        figureResult,
        figureFailure,
        nestExport,
        nestOptions,
        core.ROUTING_DISCRIMINATORS,
        graphOptions,
        delayOptions,
        spatialOptions,
        topologyResult,
        core.spikeRecorderToIsiParams,
        core.spikeTrialsToPsthParams,
        core.spikeRecorderToPopulationRateParams,
        core.correlationDetectorToCorrelogramParams,
        core.normalizeSynapseCollectionSnapshot,
        core.synapseCollectionToConnectionGraphParams,
        core.synapseCollectionToAdjacencyMatrixParams,
        core.synapseCollectionToWeightMatrixParams,
        core.synapseCollectionToDelayMatrixParams,
        core.synapseCollectionToInDegreeDistributionParams,
        core.synapseCollectionToOutDegreeDistributionParams,
        core.synapseCollectionToDelayDistributionParams,
        core.getPositionToSpatialMap2DParams,
        react.VizSpecRenderer,
        charts.ReferenceVizSpecFigure,
        charts.binnedStepPath,
        charts.boundedStemPointPaths,
        charts.matrixValueBucketPaths,
        charts.circleTopologyGeometry,
        charts.aggregateDegreeBins,
        charts.aggregateUniformHistogramBins,
        charts.equalAspectDomains,
        graph.KnowledgeGraph3DScene,
        graph.KnowledgeGraphLegend,
      ];
    `,
  );
  const tscShim = process.platform === 'win32'
    ? join(consumer, 'node_modules', '.bin', 'tsc.cmd')
    : join(consumer, 'node_modules', '.bin', 'tsc');
  if (!existsSync(tscShim)) throw new Error('npm did not install the TypeScript bin');
  if (process.platform !== 'win32' && (statSync(tscShim).mode & 0o111) === 0) {
    throw new Error('installed TypeScript bin is not executable');
  }
  phaseRun(
    process.platform === 'win32' ? nodeExecutable : tscShim,
    process.platform === 'win32'
      ? [join(consumer, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json']
      : ['-p', 'tsconfig.json'],
    consumer,
  );

  // Guard that the packed manifest is the exact deterministic artifact emitted
  // by this source tree, not merely a version-compatible stale file.
  const installedManifest = readFileSync(
    join(consumer, 'node_modules/cortexel/dist/skills.manifest.json'),
    'utf8',
  );
  if (installedManifest !== serializeManifest()) {
    throw new Error('packed skills manifest differs from the deterministic source emit');
  }
  const packageJson = JSON.parse(
    readFileSync(join(consumer, 'node_modules/cortexel/package.json'), 'utf8'),
  ) as { version: string };
  return packageJson.version;
}

export function preparePackageSmokeWorkspace(options: {
  readonly workspace: string;
  readonly nodeExecutable?: string;
  readonly npmExecutable?: string;
}): PackageSmokePhaseOutput {
  const workspace = canonicalWorkspacePath(options.workspace);
  const fixture = validateFixtureSources();
  assertEmptyWorkspace(workspace);
  const nodeExecutable = resolveExecutable(options.nodeExecutable, 'node', 'Node executable');
  commandEnvironment = scrubbedEnvironment(nodeExecutable);
  const nodeVersion = executableVersion(nodeExecutable, 'Node');
  assertSupportedNodeVersion(nodeVersion);
  const npmExecutable = resolveNpmCli(options.npmExecutable);
  const npmVersion = nodeCliVersion(nodeExecutable, npmExecutable, 'npm');
  const npmMajor = Number.parseInt(npmVersion.split('.')[0] ?? '', 10);
  if (npmMajor !== 10 && npmMajor !== 11) {
    fail(`package smoke prepare requires reviewed npm major 10 or 11; received ${npmVersion}`);
  }
  commandEnvironment.CORTEXEL_PACKAGE_SMOKE_PHASE = 'prepare';
  commandEnvironment.npm_config_ignore_scripts = 'true';
  commandEnvironment.npm_config_audit = 'false';
  commandEnvironment.npm_config_fund = 'false';
  commandEnvironment.npm_config_legacy_peer_deps = 'true';
  commandEnvironment.npm_config_install_strategy = 'nested';

  const artifactDirectory = join(workspace, 'artifact');
  const coreConsumer = join(workspace, 'core-consumer');
  const chartsConsumer = join(workspace, 'charts-consumer');
  const consumer = join(workspace, 'consumer');
  const unrelated = join(workspace, 'unrelated-working-directory');
  const npmUserConfig = join(workspace, 'npm-userconfig');
  const npmGlobalConfig = join(workspace, 'npm-globalconfig');
  writeFileSync(npmUserConfig, '# isolated package-smoke npm user config\n', { flag: 'wx' });
  writeFileSync(npmGlobalConfig, '# isolated package-smoke npm global config\n', { flag: 'wx' });
  commandEnvironment.npm_config_userconfig = npmUserConfig;
  commandEnvironment.npm_config_globalconfig = npmGlobalConfig;
  commandEnvironment.npm_config_package_lock = 'true';
  commandEnvironment.npm_config_bin_links = 'true';
  commandEnvironment.npm_config_engine_strict = 'true';
  commandEnvironment.npm_config_update_notifier = 'false';
  commandEnvironment.npm_config_progress = 'false';
  commandEnvironment.npm_config_loglevel = 'error';
  mkdirSync(artifactDirectory, { mode: 0o755 });
  mkdirSync(unrelated, { mode: 0o755 });
  const packText = run(
    nodeExecutable,
    [npmExecutable, 'pack', '--ignore-scripts', '--json', '--pack-destination', artifactDirectory],
    root,
  );
  const rawPackValue = strictJson(packText, 'npm pack output');
  if (!Array.isArray(rawPackValue) || rawPackValue.length !== 1 || !isRecord(rawPackValue[0])) {
    fail('npm pack output has an invalid envelope');
  }
  const generatedFilename = expectString(rawPackValue[0].filename, 'npm pack filename');
  if (generatedFilename.includes('/') || generatedFilename.includes('\\')) {
    fail('npm pack returned an unsafe filename');
  }
  const generatedTarball = join(artifactDirectory, generatedFilename);
  const tarballPath = join(artifactDirectory, LOCAL_TARBALL_FILENAME);
  if (generatedTarball !== tarballPath) renameSync(generatedTarball, tarballPath);
  const tarballStats = lstatSync(tarballPath);
  const tarball = readRegularFileStable(
    tarballPath,
    tarballStats.size,
    'fresh Cortexel package tarball',
    PACKAGE_TARBALL_LIMITS.compressedBytes,
  );
  const packed = normalizePackResult(rawPackValue, tarball);
  const sourcePackage = expectRecord(fixture.packageJson, 'Cortexel package.json');
  if (packed.name !== sourcePackage.name || packed.version !== sourcePackage.version) {
    fail('npm pack identity differs from Cortexel package.json');
  }
  const expectedFiles = expectedPackageClosure(fixture.packageJson);
  inspectNpmPackageTarball(tarball, packed, expectedFiles);
  const packResultPath = join(workspace, PACK_RESULT_FILENAME);
  const packResultRaw = writeCanonicalJson(packResultPath, packed);
  prepareConsumer(
    coreConsumer,
    tarballPath,
    packed.integrity,
    expectedFiles,
    nodeExecutable,
    npmExecutable,
    ['dev', 'optional'],
  );
  prepareConsumer(
    chartsConsumer,
    tarballPath,
    packed.integrity,
    expectedFiles,
    nodeExecutable,
    npmExecutable,
    ['optional'],
  );
  prepareConsumer(
    consumer,
    tarballPath,
    packed.integrity,
    expectedFiles,
    nodeExecutable,
    npmExecutable,
    [],
  );
  writeFileSync(join(workspace, NETWORK_GUARD_FILENAME), NETWORK_AND_WRITE_GUARD, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o644,
  });

  const context: PackageSmokeContext = {
    workspace,
    coreConsumer,
    chartsConsumer,
    consumer,
    unrelated,
    nodeExecutable,
    packed,
  };
  const packageVersion = runPackageSmokeBody('prepare', context);
  if (packageVersion !== packed.version) fail('prepared consumer package version differs from npm pack');
  const readOnlyWorkspace = makeWorkspaceReadOnly(workspace);
  const workspaceSeal = fingerprintPackageSmokeWorkspace(workspace);
  const state: PreparedState = {
    schema: PREPARED_STATE_SCHEMA,
    workspace,
    platform: process.platform,
    arch: process.arch,
    packageVersion,
    artifactIntegrity: packed.integrity,
    artifactSha256: sha256(tarball),
    fixtureManifestSha256: EXPECTED_FIXTURE_MANIFEST_SHA256,
    fixtureLockSha256: EXPECTED_FIXTURE_LOCK_SHA256,
    packResultSha256: sha256(packResultRaw),
    nodeExecutable,
    nodeVersion,
    npmExecutable,
    npmVersion,
    coreConsumer,
    chartsConsumer,
    consumer,
    unrelatedDirectory: unrelated,
    nodeModules: [
      join(coreConsumer, 'node_modules'),
      join(chartsConsumer, 'node_modules'),
      join(consumer, 'node_modules'),
    ],
    workspaceSeal,
    readOnlyWorkspace,
  };
  const statePath = join(workspace, STATE_FILENAME);
  const stateRaw = writeCanonicalJson(statePath, state, 0o444);
  finalizeWorkspacePermissions(workspace, statePath);
  return phaseOutput('prepare', 'prepared', state, sha256(stateRaw));
}

export function executePackageSmokeWorkspace(options: {
  readonly workspace: string;
  readonly expectedStateDigest: string;
  readonly nodeExecutable?: string;
}): PackageSmokePhaseOutput {
  const workspace = canonicalWorkspacePath(options.workspace);
  const { state, packed } = readAndVerifyPreparedState(
    workspace,
    options.expectedStateDigest,
    options.nodeExecutable,
  );
  const context: PackageSmokeContext = {
    workspace,
    coreConsumer: state.coreConsumer,
    chartsConsumer: state.chartsConsumer,
    consumer: state.consumer,
    unrelated: state.unrelatedDirectory,
    nodeExecutable: state.nodeExecutable,
    packed,
  };
  const packageVersion = runPackageSmokeBody('execute', context);
  if (packageVersion !== state.packageVersion) fail('executed consumer package version changed');
  const finalSeal = fingerprintPackageSmokeWorkspace(workspace);
  if (!exactJsonEqual(finalSeal, state.workspaceSeal)) {
    fail('execute phase mutated the prepared workspace');
  }
  assertWorkspaceReadOnly(workspace, state.readOnlyWorkspace);
  return phaseOutput('execute', 'passed', state, options.expectedStateDigest);
}

function runMain(): void {
  const invocation = parsePackageSmokeInvocation(process.argv.slice(2));
  if (invocation.command === 'prepare') {
    const result = preparePackageSmokeWorkspace({
      workspace: invocation.workspace!,
      ...(invocation.nodeExecutable === undefined
        ? {}
        : { nodeExecutable: invocation.nodeExecutable }),
      ...(invocation.npmExecutable === undefined ? {} : { npmExecutable: invocation.npmExecutable }),
    });
    process.stdout.write(`${canonicalize(result)}\n`);
    return;
  }
  if (invocation.command === 'execute') {
    const result = executePackageSmokeWorkspace({
      workspace: invocation.workspace!,
      expectedStateDigest: invocation.expectedStateDigest!,
      ...(invocation.nodeExecutable === undefined
        ? {}
        : { nodeExecutable: invocation.nodeExecutable }),
    });
    process.stdout.write(`${canonicalize(result)}\n`);
    return;
  }

  const temp = mkdtempSync(join(tmpdir(), 'cortexel-package-smoke-'));
  const workspace = join(temp, 'workspace');
  try {
    const prepared = preparePackageSmokeWorkspace({ workspace });
    const result = executePackageSmokeWorkspace({
      workspace,
      expectedStateDigest: prepared.stateDigest,
    });
    console.log(`[cortexel] package smoke passed for ${result.packageVersion}`);
  } finally {
    makeWorkspaceWritableForCleanup(workspace);
    rmSync(temp, { recursive: true, force: true });
  }
}

function isDirectInvocation(): boolean {
  const script = process.argv[1];
  if (script === undefined || !existsSync(script)) return false;
  return pathToFileURL(realpathSync(script)).href === import.meta.url;
}

if (isDirectInvocation()) {
  try {
    runMain();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const requestedPhase = process.argv[2] === 'prepare' || process.argv[2] === 'execute'
      ? process.argv[2]
      : 'all';
    if (requestedPhase === 'all') {
      console.error(`[cortexel] package smoke failed: ${message}`);
    } else {
      process.stderr.write(`${canonicalize({
        schema: PHASE_OUTPUT_SCHEMA,
        phase: requestedPhase,
        status: 'failed',
        code: 'PACKAGE_SMOKE_FAILED',
        message: message.slice(0, 8_192),
      })}\n`);
    }
    process.exitCode = 1;
  }
}
