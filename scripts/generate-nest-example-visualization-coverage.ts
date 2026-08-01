#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalize } from '../src/core/canonicalize.js';
import type { NestDocumentationSourceInventory } from './lib/nest-documentation-source-inventory.js';
import type { NestExampleSourceInventory } from './lib/nest-example-source-inventory.js';
import { buildNestExampleVisualizationCoverage } from './lib/nest-example-visualization-coverage.js';
import { publishNewExclusiveAuditFile } from './lib/exclusive-audit-publication.js';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_PATH = path.join(
  REPOSITORY_ROOT,
  'docs/audit/nest-example-coverage.v2.json',
);

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8'),
  ) as T;
}

export function generatedNestExampleVisualizationCoverageBytes(): string {
  const sourceInventory = readJson<NestExampleSourceInventory>(
    'docs/audit/nest-example-source-inventory.v2.json',
  );
  const documentationInventory = readJson<NestDocumentationSourceInventory>(
    'docs/audit/nest-documentation-source-inventory.v1.json',
  );
  return `${canonicalize(
    buildNestExampleVisualizationCoverage(
      sourceInventory,
      documentationInventory,
    ) as never,
  )}\n`;
}

function main(argv: readonly string[]): void {
  const generated = generatedNestExampleVisualizationCoverageBytes();
  if (argv.length === 1 && argv[0] === '--check') {
    const checkedIn = readFileSync(OUTPUT_PATH, 'utf8');
    if (checkedIn !== generated) {
      throw new Error('checked-in NEST visualization coverage artifact drifted');
    }
    return;
  }
  if (argv.length === 2 && argv[0] === '--output') {
    const requestedPath = argv[1];
    if (requestedPath === undefined) {
      throw new Error('output path is absent');
    }
    publishNewExclusiveAuditFile(requestedPath, generated);
    return;
  }
  throw new Error(
    'usage: generate-nest-example-visualization-coverage.ts --check | --output <absent-path>',
  );
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) main(process.argv.slice(2));
