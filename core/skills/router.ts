// routeToScene — the executable replacement for the pi.nest.viz_router stub.
// An agent holding a NEST output dict asks "which skill/scene renders this?" and
// gets a concrete answer, fail-closed for unknown families and for skills whose
// scene is null. Pure and zero-dep.
//
// spike_recorder feeds FOUR skills (raster, rate, correlogram, ...), so for that
// family `dataShape.kind` is REQUIRED to disambiguate — otherwise the router is
// no better than the stub it replaces.

import type { SceneName } from '../designLaws';
import type { NestDeviceFamily, PiNestSkillId } from './skillIds';
import { NEST_SKILL_REGISTRY } from './registry';

export type SpikeDataKind = 'events' | 'rates' | 'correlation';

export interface RouteInput {
  deviceFamily: NestDeviceFamily;
  /** Required when deviceFamily === 'spike_recorder' to pick the analysis view. */
  dataShape?: { kind?: SpikeDataKind };
}

export type RouteResult =
  | { ok: true; skill: PiNestSkillId; scene: SceneName }
  | {
      ok: false;
      reason: 'unknown_family' | 'no_cortexel_scene' | 'ambiguous';
      candidates?: PiNestSkillId[];
    };

const SPIKE_KIND_TO_SKILL: Record<SpikeDataKind, PiNestSkillId> = {
  events: 'pi.nest.spike_raster',
  rates: 'pi.nest.rate_response',
  correlation: 'pi.nest.correlogram',
};

// One unambiguous skill per family (spike_recorder handled separately above).
const FAMILY_TO_SKILL: Partial<Record<NestDeviceFamily, PiNestSkillId>> = {
  multimeter: 'pi.nest.voltage_trace',
  get_connections: 'pi.nest.connectivity_matrix',
  get_position: 'pi.nest.spatial_3d',
  weight_recorder: 'pi.nest.plasticity_dynamics',
  computed: 'pi.nest.phase_plane',
};

function resolve(skill: PiNestSkillId): RouteResult {
  const contract = NEST_SKILL_REGISTRY[skill];
  if (contract.scene === null) {
    return { ok: false, reason: 'no_cortexel_scene', candidates: [skill] };
  }
  return { ok: true, skill, scene: contract.scene };
}

export function routeToScene(input: RouteInput): RouteResult {
  if (input.deviceFamily === 'spike_recorder') {
    const kind = input.dataShape?.kind;
    if (!kind) {
      return {
        ok: false,
        reason: 'ambiguous',
        candidates: Object.values(SPIKE_KIND_TO_SKILL),
      };
    }
    return resolve(SPIKE_KIND_TO_SKILL[kind]);
  }
  const skill = FAMILY_TO_SKILL[input.deviceFamily];
  if (!skill) return { ok: false, reason: 'unknown_family' };
  return resolve(skill);
}
