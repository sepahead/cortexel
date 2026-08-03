/** Prepare deterministic non-code package data after the clean code build. */

import { chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyContractForPackage } from './lib/contract-package.js';
import { readDirectRepositoryFile } from './lib/direct-repository-file.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copied = copyContractForPackage(
  path.join(ROOT, 'contract'),
  path.join(ROOT, 'dist', 'contract'),
);

const cliEntry = path.join(ROOT, 'dist', 'cli', 'main.js');
const cliBytes = readDirectRepositoryFile(ROOT, 'dist/cli/main.js', 4 * 1024 * 1024);
const cliShebang = Buffer.from('#!/usr/bin/env node\n', 'ascii');
if (!cliBytes.subarray(0, cliShebang.byteLength).equals(cliShebang)) {
  throw new Error('the packaged cortexel bin does not begin with #!/usr/bin/env node');
}
chmodSync(cliEntry, 0o755);

process.stdout.write(
  `[cortexel] copied and verified ${copied.length} contract files under dist/contract\n`,
);
