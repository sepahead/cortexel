// Cortexel skill axis — the closed set of agent-invocable NEST visualization
// skills. This tuple drives the whole skill registry the same way SCENE_NAMES
// drives SceneName, so the skill ids can never drift between modules.
//
// A host runtime (e.g. Engram's PI harness) may mirror these `nest.*` skill ids
// in its own registry; Cortexel is the authoring source of the skill→scene map +
// input/provenance contract, and the host registry is a derived, parity-checked
// VIEW of this artifact. Zero runtime dependencies (no zod, no three, no react).

export const NEST_SKILL_IDS = [
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
] as const;

export type NestSkillId = (typeof NEST_SKILL_IDS)[number];

/** The routing meta-skill. Not a renderer — it selects among the 13 above. */
export const VIZ_ROUTER_ID = 'nest.viz_router' as const;
export type VizRouterId = typeof VIZ_ROUTER_ID;

// The raw NEST device families a skill draws its data from. Multiple skills can
// share one family (spike_recorder feeds raster + rate + correlogram), so this
// is the join key between agent skills and the dict→SceneData adapters.
export const NEST_DEVICE_FAMILIES = [
  'multimeter',
  'spike_recorder',
  'get_connections',
  'get_position',
  'weight_recorder',
  'computed', // no NEST device — numerically derived (phase plane, replay frames)
] as const;

export type NestDeviceFamily = (typeof NEST_DEVICE_FAMILIES)[number];

export function isNestSkillId(value: unknown): value is NestSkillId {
  return (
    typeof value === 'string' &&
    (NEST_SKILL_IDS as readonly string[]).includes(value)
  );
}

// Renderer routes a skill may declare. Mirrors the backend
// VALID_RENDERER_ROUTES; kept here so the manifest carries one authoritative
// copy that the backend drift test asserts membership against.
export const VALID_RENDERER_ROUTES = [
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
] as const;

export type RendererRoute = (typeof VALID_RENDERER_ROUTES)[number];
