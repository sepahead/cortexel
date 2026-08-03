/**
 * Compatibility exports for the generated snapshot API.
 *
 * All traversal and reads intentionally delegate to the one bounded authority in
 * generated-output-authority.ts; this module must never grow an alternate walker.
 */

export {
  generatedSnapshotDifferences,
  isTransientGeneratedPath,
  snapshotGeneratedPaths,
  type GeneratedDifference,
  type GeneratedSnapshot,
} from './generated-output-authority.js';
