#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalize } from '../src/core/canonicalize.js';
import { sha256DigestBytes } from '../src/core/sha256.js';
import { readDirectRepositoryFile } from './lib/direct-repository-file.js';
import type { NestDocumentationSourceInventory } from './lib/nest-documentation-source-inventory.js';
import type { NestExampleSourceInventory } from './lib/nest-example-source-inventory.js';
import {
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_SHA256,
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_BYTE_LENGTH,
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_BYTE_LENGTH,
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_SHA256,
  buildNestExampleVisualizationCoverageV3,
} from './lib/nest-example-visualization-coverage-v3.js';
import { publishNewExclusiveAuditFile } from './lib/exclusive-audit-publication.js';
import { parseJsonSourceStrict } from './lib/strict-json-source.js';

type JsonRecord = Record<string, any>;

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_PATH = path.join(
  REPOSITORY_ROOT,
  'docs/audit/nest-example-coverage.v3.json',
);

interface ExactJsonAuthority {
  readonly sha256: string;
  readonly byteLength: number;
  readonly canonicalSuffix: '' | '\n';
}

function readExactJson<T>(
  repositoryRoot: string,
  relativePath: string,
  authority: ExactJsonAuthority,
): T {
  const bytes = readDirectRepositoryFile(repositoryRoot, relativePath);
  if (
    bytes.byteLength !== authority.byteLength
    || sha256DigestBytes(bytes) !== authority.sha256
  ) {
    throw new Error(`${relativePath}: exact artifact byte authority drifted`);
  }
  const parsed = parseJsonSourceStrict<T>(bytes, relativePath);
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (raw !== `${canonicalize(parsed as never)}${authority.canonicalSuffix}`) {
    throw new Error(`${relativePath}: artifact is not exact canonical JSON`);
  }
  return parsed;
}

function assertExactBytes(
  repositoryRoot: string,
  relativePath: string,
  expectedSha256: string,
  expectedByteLength?: number,
): void {
  const bytes = readDirectRepositoryFile(repositoryRoot, relativePath);
  if (
    sha256DigestBytes(bytes) !== expectedSha256
    || (expectedByteLength !== undefined && bytes.byteLength !== expectedByteLength)
  ) {
    throw new Error(`${relativePath}: exact reviewed authority bytes drifted`);
  }
}

export function generatedNestExampleVisualizationCoverageV3Bytes(
  repositoryRoot = REPOSITORY_ROOT,
): string {
  const sourceInventory = readExactJson<NestExampleSourceInventory>(
    repositoryRoot,
    'docs/audit/nest-example-source-inventory.v2.json',
    {
      sha256: 'sha256:a8a7da4c62170a5405da3662dbef2602891c87cadbadd7f897196be6966928cd',
      byteLength: 228_211,
      canonicalSuffix: '',
    },
  );
  const documentationInventory = readExactJson<NestDocumentationSourceInventory>(
    repositoryRoot,
    'docs/audit/nest-documentation-source-inventory.v1.json',
    {
      sha256: 'sha256:d533a2f96046b484f192ed88ab70fa31d5620d48ebd647c72ec3008998f8f77c',
      byteLength: 493_939,
      canonicalSuffix: '',
    },
  );
  const predecessor = readExactJson<JsonRecord>(
    repositoryRoot,
    'docs/audit/nest-example-coverage.v2.json',
    {
      sha256: 'sha256:f640d39b8394ec108065092c5e95c9692d5fcd07ec1f91fb5cb3870b518fc535',
      byteLength: 146_814,
      canonicalSuffix: '\n',
    },
  );
  assertExactBytes(
    repositoryRoot,
    'docs/audit/nest-example-coverage.v2.schema.json',
    'sha256:e62b5bab159dcc5922e325e931a2845dff39da52bfeb6dca78f12460f9d06f4a',
  );
  assertExactBytes(
    repositoryRoot,
    'scripts/lib/nest-example-visualization-coverage.ts',
    'sha256:4baf15ca72bdb14bf69c8f714af8a4b2d978d7b8f7fefef5b0bdf1d9b4405a68',
  );
  assertExactBytes(
    repositoryRoot,
    'scripts/generate-nest-example-visualization-coverage.ts',
    'sha256:229674bb397d0160d147271b34ac6d7015f48b41231c94beea8cb20ef5f3f1b6',
  );
  assertExactBytes(
    repositoryRoot,
    'scripts/generate-nest-example-visualization-oracle.py',
    PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_SHA256,
    PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_BYTE_LENGTH,
  );
  const oracle = readExactJson<JsonRecord>(
    repositoryRoot,
    'docs/audit/nest-example-visualization-oracle.v1.json',
    {
      sha256: PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_SHA256,
      byteLength: PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_BYTE_LENGTH,
      canonicalSuffix: '\n',
    },
  );
  return `${canonicalize(
    buildNestExampleVisualizationCoverageV3(
      sourceInventory,
      documentationInventory,
      predecessor,
      oracle,
    ) as never,
  )}\n`;
}

function main(argv: readonly string[]): void {
  const generated = generatedNestExampleVisualizationCoverageV3Bytes();
  if (argv.length === 1 && argv[0] === '--check') {
    const checkedIn = readFileSync(OUTPUT_PATH, 'utf8');
    if (checkedIn !== generated) {
      throw new Error('checked-in NEST visualization coverage V3 artifact drifted');
    }
    return;
  }
  if (argv.length === 2 && argv[0] === '--output') {
    const requestedPath = argv[1];
    if (requestedPath === undefined) throw new Error('output path is absent');
    publishNewExclusiveAuditFile(requestedPath, generated);
    return;
  }
  throw new Error(
    'usage: generate-nest-example-visualization-coverage-v3.ts --check | --output <absent-path>',
  );
}

const isDirectExecution =
  process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) main(process.argv.slice(2));
