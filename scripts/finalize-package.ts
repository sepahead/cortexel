/** Final post-emit package normalization. This must remain the last build step. */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyFinalPackageBuildOutput } from './build-package.js';
import { finalizePackageModes } from './lib/package-modes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
verifyFinalPackageBuildOutput(ROOT);
const receipt = finalizePackageModes(ROOT);
verifyFinalPackageBuildOutput(ROOT);

process.stdout.write(
  `[cortexel] verified deterministic modes for ${receipt.regularFiles} package files and ` +
  `${receipt.directories} directories; cli/main.js is the sole executable\n`,
);
