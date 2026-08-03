/** Fail before loading tsdown when the source-build Node runtime is unsupported. */

import {
  PACKAGE_BUILD_NODE_RANGE,
  supportsPackageBuildRuntime,
} from './lib/package-build-runtime.js';

const version = process.versions.node;
const hasBunVersionMarker = Object.hasOwn(process.versions, 'bun');
const hasDenoVersionMarker = Object.hasOwn(process.versions, 'deno');
const compatibilityRuntimeMarkers = [
  ...(hasBunVersionMarker ? ['bun'] : []),
  ...(hasDenoVersionMarker ? ['deno'] : []),
];
if (!supportsPackageBuildRuntime({
  releaseName: process.release.name,
  nodeVersion: version,
  hasBunVersionMarker,
  hasDenoVersionMarker,
})) {
  process.stderr.write(
    `Cortexel package construction requires the Node runtime ${PACKAGE_BUILD_NODE_RANGE}; `
      + `received ${JSON.stringify({
        name: process.release.name,
        version,
        ...(compatibilityRuntimeMarkers.length === 0
          ? {}
          : { compatibilityRuntimeMarkers }),
        ...(hasBunVersionMarker ? { bunVersion: process.versions.bun } : {}),
        ...(hasDenoVersionMarker ? { denoVersion: process.versions.deno } : {}),
      })}.\n`,
  );
  process.exitCode = 1;
}
