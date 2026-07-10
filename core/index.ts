// Cortexel core — no renderer dependencies (no THREE or React; only the package's
// normal zod dependency). Safe to import in a backend/Node context for colormaps,
// the VizSpec contract, and the provenance/honesty model.
export * from './colormaps';
export * from './designLaws';
export * from './vizSpec';
export * from './provenance';
export * from './skills';
