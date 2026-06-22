// Cortexel — the standalone scientific-visualization library for agent Engram.
//
// Single public import surface. Standalone consumers import from the package
// (`import { ... } from 'cortexel'`); inside the Engram monorepo the library is
// consumed in-place via relative paths, and the legacy
// `components/scientificColors` and `NeuralScene/types` modules are thin
// re-export shims over this core.
//
// Design law: a SINGLE NEURON is rendered as a sphere; a POPULATION is rendered
// as a glowing voxel cube. Passive data uses unlit MeshBasic (no emissive);
// emissive > 1.0 is reserved for active spike/synapse events. See README.md.

// ── core (no THREE / React deps) ──────────────────────────────────────────────
export * from './core';

// ── react (r3f scene helpers + agent renderer) ────────────────────────────────
export * from './react';
