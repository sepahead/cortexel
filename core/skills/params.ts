// Per-skill typed param schemas. These close the opaque-`params` hole admitted
// in vizSpec.ts: instead of `z.record(z.unknown())`, each renderable scene
// carries a schema whose required fields the agent must supply. UNITS are
// promoted from prose to required fields so a unitless payload fails validation
// instead of rendering an unlabeled axis.
//
// Only validateSkillInvocation enforces these (the strict agent entrypoint).
// validateVizSpec stays lenient/opaque for backward-compat with existing
// frontend emitters.

import { z } from 'zod';

const numArray = z.array(z.number());

export const VoltageTraceParamsSchema = z
  .object({
    times_ms: numArray.min(1),
    series: z.array(z.array(z.number())).min(1),
    units: z.string().min(1),
  })
  .passthrough();
export type VoltageTraceParams = z.infer<typeof VoltageTraceParamsSchema>;

export const SpikeRasterParamsSchema = z
  .object({
    times_ms: numArray.min(1),
    senders: numArray.min(1),
  })
  .passthrough();
export type SpikeRasterParams = z.infer<typeof SpikeRasterParamsSchema>;

export const RateResponseParamsSchema = z
  .object({
    stimulus_amplitudes: numArray.min(1),
    rates_hz: numArray.min(1),
    units: z.string().min(1),
  })
  .passthrough();
export type RateResponseParams = z.infer<typeof RateResponseParamsSchema>;

export const NetworkParamsSchema = z
  .object({
    sources: numArray.min(1),
    targets: numArray.min(1),
    weights: numArray.optional(),
  })
  .passthrough();
export type NetworkParams = z.infer<typeof NetworkParamsSchema>;

export const Spatial3DParamsSchema = z
  .object({
    objects: z.array(z.unknown()).min(1),
  })
  .passthrough();
export type Spatial3DParams = z.infer<typeof Spatial3DParamsSchema>;

export const PlasticityParamsSchema = z
  .object({
    times_ms: numArray.min(1),
    weights: numArray.min(1),
    weight_units: z.string().min(1),
  })
  .passthrough();
export type PlasticityParams = z.infer<typeof PlasticityParamsSchema>;

export const PhasePlaneParamsSchema = z
  .object({
    grid: z.record(z.string(), z.unknown()),
  })
  .passthrough();
export type PhasePlaneParams = z.infer<typeof PhasePlaneParamsSchema>;

export const AstrocyteParamsSchema = z
  .object({
    ca_trace: numArray.min(1),
    units: z.string().min(1),
  })
  .passthrough();
export type AstrocyteParams = z.infer<typeof AstrocyteParamsSchema>;

// Corpus knowledge-graph. Nodes/edges are a closed structural graph of papers,
// models and families. Node/edge item schemas are strict (closed) so a stray
// key is a validation error, not silently rendered — the cross-paper identity
// edges (same_as/variant_of) are advisory structural similarity, never certified
// sameness (the honesty boundary is enforced via requiredProvenanceKeys).
const KnowledgeGraphNodeSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['paper', 'model', 'family']),
    label: z.string().min(1),
    group: z.string().optional(),
  })
  .strict();

const KnowledgeGraphEdgeSchema = z
  .object({
    source: z.string().min(1),
    target: z.string().min(1),
    kind: z.enum([
      'cites',
      'same_as',
      'variant_of',
      'instantiates',
      'belongs_to_family',
    ]),
  })
  .strict();

export const KnowledgeGraph3DParamsSchema = z
  .object({
    nodes: z.array(KnowledgeGraphNodeSchema).min(1),
    edges: z.array(KnowledgeGraphEdgeSchema),
  })
  .passthrough();
export type KnowledgeGraph3DParams = z.infer<typeof KnowledgeGraph3DParamsSchema>;

