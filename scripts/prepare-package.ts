/** Prepare deterministic non-code package data after tsup's clean build. */

import { chmodSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyContractForPackage } from './lib/contract-package.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copied = copyContractForPackage(
  path.join(ROOT, 'contract'),
  path.join(ROOT, 'dist', 'contract'),
);

const cliEntry = path.join(ROOT, 'dist', 'cli', 'main.js');
const cliText = readFileSync(cliEntry, 'utf8');
if (!cliText.startsWith('#!/usr/bin/env node\n')) {
  throw new Error('the packaged cortexel bin does not begin with #!/usr/bin/env node');
}
chmodSync(cliEntry, 0o755);

process.stdout.write(
  `[cortexel] copied and verified ${copied.length} contract files under dist/contract\n`,
);
