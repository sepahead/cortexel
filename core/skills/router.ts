// routeToScene — the executable replacement for the nest.viz_router stub.
// An agent holding a NEST output dict asks "which skill/scene renders this?" and
// gets a concrete answer, fail-closed for unknown families, for skills whose
// scene is null, AND for any device family that maps to more than one skill.
//
// The family→skill index is DERIVED from NEST_SKILL_REGISTRY (not hand-written),
// so it can never drift from the registry. Several families are many-to-one —
// spike_recorder (raster/rate/correlogram), multimeter (voltage/stimulus/
// astrocyte/compartmental), computed (phase-plane/replay) — so for those a
// discriminator is REQUIRED; without it the router returns `ambiguous` carrying
// the exact field + value→skill map an agent needs to retry in one shot.

import type { SceneName } from '../designLaws';
import type { NestDeviceFamily, NestSkillId } from './skillIds';
import { NEST_SKILL_REGISTRY, listSkills } from './registry';

export type SpikeDataKind = 'events' | 'rates' | 'correlation';

export interface RouteInput {
  deviceFamily: NestDeviceFamily;
  /** Disambiguator for the spike_recorder family (raster/rate/correlogram). */
  dataShape?: { kind?: SpikeDataKind };
  /** General disambiguator for any many-to-one family: name the skill directly.
   *  Must belong to `deviceFamily` or it is ignored. */
  skill?: NestSkillId;
}

export interface Disambiguator {
  /** The RouteInput field an agent should set to retry. */
  field: 'skill' | 'dataShape.kind';
  /** Value → skill it would resolve to (so the agent can pick deterministically). */
  maps: Partial<Record<string, NestSkillId>>;
}

export type RouteResult =
  | { ok: true; skill: NestSkillId; scene: SceneName }
  | {
      ok: false;
      reason: 'unknown_family' | 'no_cortexel_scene' | 'ambiguous';
      candidates?: NestSkillId[];
      disambiguateBy?: Disambiguator;
    };

const SPIKE_KIND_TO_SKILL: Record<SpikeDataKind, NestSkillId> = {
  events: 'nest.spike_raster',
  rates: 'nest.rate_response',
  correlation: 'nest.correlogram',
};

// Derived once from the registry: family → its member skill ids. Keeps the
// router pinned to the registry (a new skill in a family is picked up for free).
const FAMILY_MEMBERS: Partial<Record<NestDeviceFamily, NestSkillId[]>> = (() => {
  const out: Partial<Record<NestDeviceFamily, NestSkillId[]>> = {};
  for (const c of listSkills()) {
    (out[c.deviceFamily] ??= []).push(c.id);
  }
  return out;
})();

function resolve(skill: NestSkillId): RouteResult {
  const contract = NEST_SKILL_REGISTRY[skill];
  if (contract.scene === null) {
    return { ok: false, reason: 'no_cortexel_scene', candidates: [skill] };
  }
  return { ok: true, skill, scene: contract.scene };
}

export function routeToScene(input: RouteInput): RouteResult {
  const members = FAMILY_MEMBERS[input.deviceFamily];
  if (!members || members.length === 0) {
    return { ok: false, reason: 'unknown_family' };
  }

  // Explicit skill hint wins, if it belongs to this family.
  if (input.skill && members.includes(input.skill)) {
    return resolve(input.skill);
  }

  // Single-member family: unambiguous.
  if (members.length === 1) return resolve(members[0]);

  // Many-to-one: the spike family has a typed kind discriminator.
  if (input.deviceFamily === 'spike_recorder' && input.dataShape?.kind) {
    return resolve(SPIKE_KIND_TO_SKILL[input.dataShape.kind]);
  }

  // Ambiguous — hand back exactly what is needed to retry deterministically.
  const disambiguateBy: Disambiguator =
    input.deviceFamily === 'spike_recorder'
      ? { field: 'dataShape.kind', maps: { ...SPIKE_KIND_TO_SKILL } }
      : {
          field: 'skill',
          maps: Object.fromEntries(members.map((s) => [s, s])),
        };
  return { ok: false, reason: 'ambiguous', candidates: members, disambiguateBy };
}
