// Cortexel skill axis — the closed set of agent-invocable visualization skills.
// This tuple drives the whole skill registry the same way SCENE_NAMES drives
// SceneName, so the skill ids can never drift between modules.
//
// Most skills consume NEST device output (the `nest.*` namespace), but the axis
// is NOT NEST-only: `corpus.knowledge_graph` renders a cross-paper corpus graph
// that has no NEST device at all. Prefer the neutral aliases below (SKILL_IDS /
// SkillId / SKILL_REGISTRY / isSkillId) in new code; the NEST_-prefixed names are
// kept for back-compat. A host runtime may mirror these ids in its own registry;
// Cortexel is the authoring source of the skill→scene map + input/provenance
// contract. Zero runtime dependencies (no zod, no three, no react).

export const NEST_SKILL_IDS = Object.freeze([
  'nest.voltage_trace',
  'nest.spike_raster',
  'nest.rate_response',
  'nest.connectivity_matrix',
  'nest.spatial_2d',
  'nest.spatial_3d',
  'nest.plasticity_dynamics',
  'nest.phase_plane',
  'nest.correlogram',
  'nest.stimulus_response',
  'nest.astrocyte_dynamics',
  'nest.compartmental_dynamics',
  'nest.animation_replay',
  'corpus.knowledge_graph',
] as const);

export type NestSkillId = (typeof NEST_SKILL_IDS)[number];

/** Neutral aliases — the axis is not NEST-only (see corpus.knowledge_graph).
 *  Prefer these in new code; the NEST_-prefixed names remain for back-compat. */
export const SKILL_IDS = NEST_SKILL_IDS;
export type SkillId = NestSkillId;

/** The routing meta-skill. Not a renderer — it selects among the skills above
 *  (count derives from SKILL_IDS.length, so this can never drift again). */
export const VIZ_ROUTER_ID = 'nest.viz_router' as const;
export type VizRouterId = typeof VIZ_ROUTER_ID;

// The raw NEST device families a skill draws its data from. Multiple skills can
// share one family (spike_recorder feeds raster + rate + correlogram), so this
// is the join key between agent skills and the dict→SceneData adapters.
export const NEST_DEVICE_FAMILIES = Object.freeze([
  'multimeter',
  'spike_recorder',
  'get_connections',
  'get_position',
  'weight_recorder',
  'computed', // no NEST device — numerically derived (phase plane, replay frames)
  'corpus', // no NEST device — corpus/KG structural graph (papers, models, families)
] as const);

export type NestDeviceFamily = (typeof NEST_DEVICE_FAMILIES)[number];

/** Membership guard for the closed skill set. Note the set includes non-NEST
 *  skills (corpus.knowledge_graph), so `isSkillId` is the accurate name. */
export function isSkillId(value: unknown): value is SkillId {
  return (
    typeof value === 'string' &&
    (SKILL_IDS as readonly string[]).includes(value)
  );
}

/** @deprecated Misnomer — the set is not NEST-only. Use `isSkillId`. */
export const isNestSkillId = isSkillId;

// Renderer routes a skill may declare. Mirrors the backend
// VALID_RENDERER_ROUTES; kept here so the manifest carries one authoritative
// copy that the backend drift test asserts membership against.
export const VALID_RENDERER_ROUTES = Object.freeze([
  'media.trace_figure',
  'media.model_graph',
  'media.webgl_scene',
  'media.react_fiber_scene',
  'media.manim_storyboard',
  'media.*',
  'matplotlib',
  'd3',
  'three',
  'fiber',
  'manim',
] as const);

export type RendererRoute = (typeof VALID_RENDERER_ROUTES)[number];
