// Cortexel VizSpec — the agent-emitted, declarative scene contract.
//
// An agent (Engram, and later Hermes / OpenClaw) emits a VizSpec as JSON. The
// frontend validates it here before rendering; a host backend SHOULD mirror this
// schema (e.g. a Pydantic model with the same conservative provenance defaults)
// as a server-side gate for defense in depth. The Zod schema is the runtime
// source of truth on the TS side; `VizSpec` is inferred from it.
//
// Phase 1 ships a LEAN spec: `params` is opaque (per-scene typed param schemas
// are a deferred phase). The scene enum derives from the same SCENE_NAMES tuple
// as the TS `SceneName` union, so they can never drift.

import { z } from 'zod';
import { SCENE_NAMES } from './designLaws';
import { ProvenanceKeyEnum } from './skills/provenanceKeys';

export const ProvenanceSchema = z.object({
  source: z.string().min(1).max(200),
  calibrated_posterior: z.boolean().default(false), // fail-closed
  advisory_only: z.boolean().default(false),
  is_paper_local_evidence: z.boolean().default(false),
  caption: z.string().max(500).optional(),
  /** Machine-checkable record of the inputs an agent declared (keyed by
   *  ProvenanceKey). validateSkillInvocation requires the keys a skill's
   *  honesty contract demands. Presence-checked here; value truthfulness is the
   *  host/backend's responsibility (Cortexel is host-agnostic). */
  declared_inputs: z
    .partialRecord(
      ProvenanceKeyEnum,
      z.union([z.string(), z.number(), z.literal(true)]),
    )
    .optional(),
  /** Explicit synthetic/illustrative discriminator — forces the schematic
   *  caption regardless of the other flags. */
  synthetic: z.boolean().default(false),
});

export const VizSpecSchema = z.object({
  scene: z.enum(SCENE_NAMES),
  // Scene-specific data/options. NOTE (Phase 1): this is intentionally opaque —
  // it is NOT validated per-scene yet, so an empty or malformed `params` passes
  // validation and any error surfaces only at render time. Per-scene typed
  // schemas are planned; until then, consult each scene's documented params.
  params: z.record(z.string(), z.unknown()).default({}),
  mode: z.enum(['interactive', 'export']).default('interactive'),
  themeMode: z.enum(['dark', 'light']).default('dark'),
  camera: z
    .enum(['default', 'top', 'side', 'close', 'cinematic'])
    .optional(),
  provenance: ProvenanceSchema,
});

export type VizSpec = z.infer<typeof VizSpecSchema>;

export type VizSpecValidation =
  | { ok: true; spec: VizSpec }
  | { ok: false; errors: string[] };

/** Validate untrusted input (e.g. an agent payload) into a typed VizSpec. */
export function validateVizSpec(input: unknown): VizSpecValidation {
  const result = VizSpecSchema.safeParse(input);
  if (result.success) return { ok: true, spec: result.data };
  return {
    ok: false,
    errors: result.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    ),
  };
}
