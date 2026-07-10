// Cortexel — a host-agnostic scientific-visualization library for AI agents.
//
// The default entry point (this file) re-exports ONLY `cortexel/core`: the
// dependency-free surface (beyond zod) — the VizSpec contract, the skill axis,
// colormaps/palettes, the provenance/honesty model, and the NEST adapters. So
// `import { ... } from 'cortexel'` is always safe server-side and never pulls in
// react / three. The React rendering layer is a separate entry, `cortexel/react`
// (with the knowledge-graph scene at `cortexel/react/knowledge-graph`), which
// requires the three / react-three-fiber peers — import it explicitly.
//
// Design law: a SINGLE NEURON is rendered as a sphere; a POPULATION is rendered
// as a glowing voxel cube. Passive data uses unlit MeshBasic (no emissive);
// emissive > 1.0 is reserved for active spike/synapse events. See README.md.

export * from './core';
