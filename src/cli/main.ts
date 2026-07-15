/**
 * The Cortexel CLI.
 *
 * A narrow, auditable command surface for agents and reproducible pipelines: typed
 * input, deterministic output, explicit exit codes, and no network access. Everything is
 * offline by default; there is no `--url`, no implicit HTTP, and no shell hook, because a
 * scientific validator that could be turned into an ETL tool is a scientific validator
 * with an attack surface.
 *
 * Exit codes are a stable contract of their own: 0 ok, 2 usage, 3 parse, 4 schema,
 * 5 semantic, 6 budget, 7 I/O, 8 internal.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';

import { parseAndValidateRequest } from '../core/request.js';
import { parseJsonStrict } from '../core/parse-json.js';
import { getBudgetLimits } from '../core/limits.js';
import { migrateLegacyRequest } from '../core/migrate-v0.js';
import { getBuildIdentity } from '../generated/identity.js';
import { SKILL_CATALOG, STABLE_SKILL_IDS, EXPERIMENTAL_CAPABILITY_IDS } from '../generated/catalog.js';
import { buildFigureFromJson } from '../render/buildFigure.js';
import type { CortexelError } from '../core/errors.js';

const EXIT = {
  ok: 0,
  usage: 2,
  parse: 3,
  schema: 4,
  semantic: 5,
  budget: 6,
  io: 7,
  internal: 8,
} as const;

/** Map a diagnostic to the exit code for its stage. */
function exitForErrors(errors: readonly CortexelError[]): number {
  for (const error of errors) {
    if (error.stage === 'parse' || error.stage === 'snapshot') return EXIT.parse;
    if (error.stage === 'structural' || error.stage === 'identity') return EXIT.schema;
    if (error.stage === 'budget') return EXIT.budget;
  }
  return EXIT.semantic;
}

function readInput(source: string): string {
  if (source === '-') {
    return readFileSync(0, 'utf8'); // stdin
  }
  return readFileSync(source, 'utf8');
}

function printDiagnostics(errors: readonly CortexelError[], asJson: boolean): void {
  if (asJson) {
    process.stderr.write(`${JSON.stringify({ ok: false, errors }, null, 2)}\n`);
    return;
  }
  for (const error of errors) {
    process.stderr.write(`  ${error.code} at ${error.instancePath || '(root)'}: ${error.message}\n`);
  }
}

function writeAtomic(target: string, content: string, force: boolean): void {
  if (existsSync(target) && !force) {
    throw new Error(`refusing to overwrite ${target} without --force`);
  }
  const dir = path.dirname(target);
  mkdirSync(dir, { recursive: true });
  // Write to a temporary sibling then rename, so a crash mid-write cannot leave a
  // half-written figure that looks complete.
  const tmp = path.join(dir, `.${path.basename(target)}.tmp`);
  writeFileSync(tmp, content);
  renameSync(tmp, target);
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}
function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function cmdIdentity(args: string[]): number {
  const identity = getBuildIdentity();
  if (hasFlag(args, '--json')) {
    process.stdout.write(`${JSON.stringify(identity, null, 2)}\n`);
  } else {
    process.stdout.write(
      `Cortexel ${identity.packageVersion}\n` +
        `  request contract:  ${identity.requestContract}\n` +
        `  artifact contract: ${identity.artifactContract}\n` +
        `  contract digest:   ${identity.contractDigest}\n` +
        `  catalog digest:    ${identity.catalogDigest}\n` +
        `  stable skills:     ${identity.stableSkillCount}\n` +
        `  source revision:   ${identity.sourceRevision}\n` +
        `  release build:     ${identity.release}\n`,
    );
  }
  return EXIT.ok;
}

function cmdCatalog(args: string[]): number {
  const includeExperimental = hasFlag(args, '--include-experimental');
  if (hasFlag(args, '--json')) {
    const stable = STABLE_SKILL_IDS.map((id) => ({
      id,
      title: SKILL_CATALOG[id].title,
      question: SKILL_CATALOG[id].canonicalQuestion,
    }));
    const payload: Record<string, unknown> = { stable };
    if (includeExperimental) payload.experimental = EXPERIMENTAL_CAPABILITY_IDS;
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return EXIT.ok;
  }

  process.stdout.write(`Stable catalog (${STABLE_SKILL_IDS.length}):\n`);
  for (const id of STABLE_SKILL_IDS) {
    process.stdout.write(`  ${id.padEnd(32)} ${SKILL_CATALOG[id].title}\n`);
  }
  if (includeExperimental) {
    process.stdout.write(`\nExperimental (not covered by the stable contract):\n`);
    for (const id of EXPERIMENTAL_CAPABILITY_IDS) process.stdout.write(`  ${id}\n`);
  } else {
    process.stdout.write(`\nUse --include-experimental to also list experimental capabilities.\n`);
  }
  return EXIT.ok;
}

function cmdValidate(args: string[]): number {
  const input = args.find((arg) => !arg.startsWith('-')) ?? '-';
  const asJson = optionValue(args, '--format') === 'json';

  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    process.stderr.write(`I/O error: ${String(error)}\n`);
    return EXIT.io;
  }

  const outcome = parseAndValidateRequest(text);
  if (outcome.ok) {
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify({ ok: true, skill: outcome.request.skillId, requestDigest: outcome.request.requestDigest, inputAssurance: outcome.request.inputAssurance }, null, 2)}\n`,
      );
    } else {
      process.stdout.write(`valid: ${outcome.request.skillId} (${outcome.request.requestDigest})\n`);
    }
    return EXIT.ok;
  }

  printDiagnostics(outcome.errors, asJson);
  return exitForErrors(outcome.errors);
}

function cmdRender(args: string[]): number {
  const input = args.find((arg) => !arg.startsWith('-') && arg !== optionValue(args, '--output')) ?? '-';
  const output = optionValue(args, '--output');
  const force = hasFlag(args, '--force');
  const dryRun = hasFlag(args, '--dry-run');

  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    process.stderr.write(`I/O error: ${String(error)}\n`);
    return EXIT.io;
  }

  const result = buildFigureFromJson(text);
  if (!result.ok) {
    printDiagnostics(result.errors, optionValue(args, '--format') === 'json');
    return exitForErrors(result.errors);
  }

  if (dryRun) {
    process.stdout.write(
      `would render ${(result.artifact.canonicalRequest as { skill?: { id?: string } })?.skill?.id ?? 'figure'}: ` +
        `${result.svg.length} SVG bytes, ${result.table.rowsTotal} table rows\n`,
    );
    return EXIT.ok;
  }

  if (!output) {
    // No output path: print the artifact JSON to stdout, atomically writing nothing.
    process.stdout.write(`${JSON.stringify(result.artifact, null, 2)}\n`);
    return EXIT.ok;
  }

  try {
    if (result.svg) writeAtomic(output, result.svg, force);
    const base = output.replace(/\.svg$/, '');
    writeAtomic(`${base}.artifact.json`, `${JSON.stringify(result.artifact, null, 2)}\n`, force);
    if (result.table.rows.length > 0) {
      const header = result.table.columns.map((c) => c.header).join(',');
      const rows = result.table.rows.map((row) => row.map((cell) => (cell === null ? '' : String(cell))).join(','));
      writeAtomic(`${base}.data.csv`, `${[header, ...rows].join('\n')}\n`, force);
    }
    process.stdout.write(`wrote ${output} (+ .artifact.json${result.table.rows.length > 0 ? ' + .data.csv' : ''})\n`);
  } catch (error) {
    process.stderr.write(`I/O error: ${String(error)}\n`);
    return EXIT.io;
  }

  return EXIT.ok;
}

function cmdInspect(args: string[]): number {
  const input = args.find((arg) => !arg.startsWith('-')) ?? '-';
  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    process.stderr.write(`I/O error: ${String(error)}\n`);
    return EXIT.io;
  }
  const outcome = parseAndValidateRequest(text);
  if (!outcome.ok) {
    printDiagnostics(outcome.errors, false);
    return exitForErrors(outcome.errors);
  }
  const catalog = SKILL_CATALOG[outcome.request.skillId];
  process.stdout.write(
    `skill:        ${outcome.request.skillId} (rev ${outcome.request.skillRevision})\n` +
      `renderer:     ${catalog.renderer.id}\n` +
      `requestDigest:${outcome.request.requestDigest}\n` +
      `assurance:    ${outcome.request.inputAssurance.duplicateKeys}\n` +
      `disclosures:  ${catalog.disclosures.length} possible rules\n`,
  );
  return EXIT.ok;
}

function cmdMigrate(args: string[]): number {
  const input = args.find((arg) => !arg.startsWith('-')) ?? '-';
  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    process.stderr.write(`I/O error: ${String(error)}\n`);
    return EXIT.io;
  }
  // Route legacy input through the SAME strict boundary as validate/render — the raw
  // JSON.parse here bypassed the byte/depth/node limits and the duplicate-key rejection,
  // which is exactly the hardening a legacy (untrusted) payload most needs.
  const parsed = parseJsonStrict(text, { limits: getBudgetLimits('standard') });
  if (!parsed.ok) {
    printDiagnostics(parsed.errors, optionValue(args, '--format') === 'json');
    return exitForErrors(parsed.errors);
  }
  const result = migrateLegacyRequest(parsed.value);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.report.errors.length > 0 ? EXIT.semantic : EXIT.ok;
}

const USAGE = `cortexel — provenance-first scientific figure contracts

Usage:
  cortexel identity [--json]
  cortexel catalog  [--include-experimental] [--json]
  cortexel validate <input|-> [--format json]
  cortexel render   <input|-> [--output figure.svg] [--force] [--dry-run]
  cortexel inspect  <input|->
  cortexel migrate  <input|->

All commands are offline. There is no network access, no shell hook, and no --url.
Exit codes: 0 ok, 2 usage, 3 parse, 4 schema, 5 semantic, 6 budget, 7 I/O, 8 internal.
`;

export function run(argv: readonly string[]): number {
  const [command, ...args] = argv;
  switch (command) {
    case 'identity':
      return cmdIdentity(args);
    case 'catalog':
      return cmdCatalog(args);
    case 'validate':
      return cmdValidate(args);
    case 'render':
      return cmdRender(args);
    case 'inspect':
      return cmdInspect(args);
    case 'migrate':
      return cmdMigrate(args);
    case undefined:
    case '--help':
    case '-h':
    case 'help':
      process.stdout.write(USAGE);
      return command === undefined ? EXIT.usage : EXIT.ok;
    default:
      process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
      return EXIT.usage;
  }
}

// Run as a CLI when executed directly.
if (process.argv[1] && (process.argv[1].endsWith('main.ts') || process.argv[1].endsWith('cortexel.mjs') || process.argv[1].endsWith('main.js'))) {
  process.exit(run(process.argv.slice(2)));
}
