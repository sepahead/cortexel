/** Final post-emit package normalization. This must remain the last build step. */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { finalizePackageModes } from './lib/package-modes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const receipt = finalizePackageModes(ROOT);

process.stdout.write(
  `[cortexel] normalized ${receipt.regularFiles} package files and ` +
  `${receipt.directories} directories; cli/main.js is the sole executable\n`,
);
