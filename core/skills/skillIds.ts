// Cortexel skill axis — the closed set of agent-invocable NEST visualization
// skills. This tuple drives the whole skill registry the same way SCENE_NAMES
// drives SceneName, so the skill ids can never drift between modules.
//
// These mirror the Engram `pi.nest.*` runtime skills, but Cortexel is now the
// authoring source of the skill→scene map + input/provenance contract; the
// backend Pydantic registry is a derived, parity-checked VIEW of this artifact.
// Zero runtime dependencies (no zod, no three, no react).

export const PI_NEST_SKILL_IDS = [
  'pi.nest.voltage_trace',
  'pi.nest.spike_raster',
  'pi.nest.rate_response',
  'pi.nest.connectivity_matrix',
  'pi.nest.spatial_2d',
  'pi.nest.spatial_3d',
  'pi.nest.plasticity_dynamics',
  'pi.nest.phase_plane',
  'pi.nest.correlogram',
  'pi.nest.stimulus_response',
  'pi.nest.astrocyte_dynamics',
  'pi.nest.compartmental_dynamics',
  'pi.nest.animation_replay',
] as const;

export type PiNestSkillId = (typeof PI_NEST_SKILL_IDS)[number];

/** The routing meta-skill. Not a renderer — it selects among the 13 above. */
export const VIZ_ROUTER_ID = 'pi.nest.viz_router' as const;
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

export function isPiNestSkillId(value: unknown): value is PiNestSkillId {
  return (
    typeof value === 'string' &&
    (PI_NEST_SKILL_IDS as readonly string[]).includes(value)
  );
}

// Renderer routes a skill may declare. Mirrors the backend
// VALID_RENDERER_ROUTES; kept here so the manifest carries one authoritative
// copy that the backend drift test asserts membership against.
export const VALID_RENDERER_ROUTES = [
  'pi.media.trace_figure',
  'pi.media.model_graph',
  'pi.media.webgl_scene',
  'pi.media.react_fiber_scene',
  'pi.media.manim_storyboard',
  'pi.media.*',
  'matplotlib',
  'd3',
  'three',
  'fiber',
  'manim',
] as const;

export type RendererRoute = (typeof VALID_RENDERER_ROUTES)[number];
