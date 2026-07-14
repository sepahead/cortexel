/**
 * Generated-file freshness gate.
 *
 * Regenerates the contract and fails if anything changed. This is what actually
 * enforces "one authority": a hand-edit to a generated file — a tweaked schema, a
 * fudged digest, a skill quietly added to the catalog without a contract — cannot
 * survive CI, because the generator would produce something different.
 *
 * It also runs generation TWICE and compares, because a generator that is not
 * deterministic produces a digest that means nothing.
 *
 *   bun run check:generated
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Everything the generator owns. Drift in any of these is a failure. */
const GENERATED_PATHS = [
  'src/generated',
  'contract/manifest.v1.json',
  'contract/schemas/generated',
  'contract/schemas/skills',
  'python/src/cortexel/generated',
];

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function snapshotGeneratedTree(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (relative: string): void => {
    const absolute = path.join(ROOT, relative);
    if (!existsSync(absolute)) return;
    const listing = execFileSync('find', [absolute, '-type', 'f'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .sort();
    for (const file of listing) {
      out.set(path.relative(ROOT, file), readFileSync(file, 'utf8'));
    }
  };
  for (const target of GENERATED_PATHS) walk(target);
  return out;
}

function main(): number {
  process.stdout.write('Regenerating the contract...\n');
  execFileSync('bunx', ['tsx', 'scripts/generate-contract.ts'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const first = snapshotGeneratedTree();

  // Determinism: generate again into the same place and require byte equality.
  // A generator that depends on filesystem order, a clock, or a hash-map iteration
  // order would pass once and fail on someone else's machine.
  execFileSync('bunx', ['tsx', 'scripts/generate-contract.ts'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  const second = snapshotGeneratedTree();

  const nondeterministic: string[] = [];
  for (const [file, content] of first) {
    if (second.get(file) !== content) nondeterministic.push(file);
  }
  if (nondeterministic.length > 0) {
    process.stderr.write('\nGeneration is NOT deterministic. These files differed between runs:\n');
    for (const file of nondeterministic) process.stderr.write(`  - ${file}\n`);
    process.stderr.write(
      '\nA digest computed from nondeterministic input is not an identity. Fix the generator.\n',
    );
    return 1;
  }

  // Drift: does the committed tree match what the generator just produced?
  const status = git(['status', '--porcelain=v1', '--', ...GENERATED_PATHS]).trim();
  if (status.length > 0) {
    process.stderr.write('\nGenerated files are out of date with their source:\n\n');
    process.stderr.write(`${status}\n\n`);
    process.stderr.write(git(['diff', '--stat', '--', ...GENERATED_PATHS]));
    process.stderr.write(
      '\nRun `bun run generate` and commit the result. Never hand-edit a generated file.\n',
    );
    return 1;
  }

  process.stdout.write('\nGenerated files are fresh and generation is deterministic.\n');
  return 0;
}

process.exit(main());
