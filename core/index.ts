// Cortexel core — no renderer dependencies (no THREE or React; only the package's
// normal zod dependency). Safe to import in a backend/Node context for colormaps,
// the VizSpec contract, and the provenance/honesty model.
export * from './colormaps';
export * from './designLaws';
export * from './vizSpec';
export * from './provenance';
export * from './skills';

// The legacy Engram adapter needs one exact-JSON capture, serialization, and
// identity path in browser hosts. Keep this surface deliberately narrower than
// `cortexel/figure`: these utilities create no validated-request capability or
// render authority.
export { canonicalize, canonicalDigest } from '../src/core/canonicalize';
export { getBudgetLimits } from '../src/core/limits';
export { snapshotValue } from '../src/core/safe-snapshot';
