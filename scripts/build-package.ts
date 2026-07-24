/** Build package code without letting tsup materialize a bundled config beside source. */

import { build, type Options } from 'tsup';

import tsupConfig from '../tsup.config.js';

if (
  typeof tsupConfig !== 'object' ||
  tsupConfig === null ||
  Array.isArray(tsupConfig)
) {
  throw new Error('the Cortexel tsup config must remain one static options object');
}

// tsup's default programmatic path reloads tsup.config.ts through bundle-require,
// which writes a randomized intermediate beside the config. The reviewed options
// are already imported above, so disable that second loader explicitly.
await build({ ...(tsupConfig as Options), config: false });
