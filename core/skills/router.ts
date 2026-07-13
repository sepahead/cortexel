// routeToScene — the executable replacement for the nest.viz_router stub.
// An agent holding a NEST output dict asks "which skill/scene renders this?" and
// gets a concrete answer, fail-closed for unknown families, for skills whose
// scene is null, AND for any device family that maps to more than one skill.
//
// The family→skill index is DERIVED from NEST_SKILL_REGISTRY (not hand-written),
// so it can never drift from the registry. Several families are many-to-one —
// spike_recorder, get_connections, and get_position publish family-specific
// dataShape.kind maps; other many-to-one families use explicit skill ids.
// Deprecated aliases remain explicitly invocable but are excluded from bare
// family candidates and maps.

import type { SceneName } from '../designLaws';
import {
  isSkillId,
  NEST_DEVICE_FAMILIES,
  type NestDeviceFamily,
  type NestSkillId,
  type RendererRoute,
} from './skillIds';
import { NEST_SKILL_REGISTRY, listSkills } from './registry';
import {
  PUBLIC_DIAGNOSTIC_LIMITS,
  safeErrorMessage,
  safePrimitiveDiagnostic,
} from '../safeRuntime';

export type SpikeDataKind =
  | 'events'
  | 'isi'
  | 'psth'
  | 'population_rate'
  | 'fi_response';

export type GetConnectionsDataKind =
  | 'connection_graph'
  | 'adjacency_matrix'
  | 'weight_matrix'
  | 'delay_matrix'
  | 'weight_distribution'
  | 'delay_distribution'
  | 'in_degree_distribution'
  | 'out_degree_distribution';

export type GetPositionDataKind = 'positions_2d' | 'positions_3d';
export type RouteDataKind = SpikeDataKind | GetConnectionsDataKind | GetPositionDataKind;

export interface RouteInput {
  deviceFamily: NestDeviceFamily;
  /** Family-specific analysis discriminator. Raw field presence never selects
   * an analysis because the same simulator snapshot supports many views. */
  dataShape?: { kind?: RouteDataKind };
  /** General disambiguator for any many-to-one family: name the skill directly.
   *  Must belong to `deviceFamily` or routing fails explicitly. */
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
      reason:
        | 'invalid_input'
        | 'unknown_family'
        | 'no_cortexel_scene'
        | 'ambiguous'
        | 'invalid_discriminator'
        | 'skill_family_mismatch';
      candidates?: NestSkillId[];
      disambiguateBy?: Disambiguator;
      rendererRoutes?: readonly RendererRoute[];
      field?: string;
      message?: string;
    };

const FAMILY_KIND_TO_SKILL: ReadonlyMap<
  NestDeviceFamily,
  ReadonlyMap<string, NestSkillId>
> = (() => {
  const output = new Map<NestDeviceFamily, Map<string, NestSkillId>>();
  for (const contract of listSkills()) {
    const kind = contract.routerEligibility?.dataShapeKind;
    if (!kind) continue;
    const map = output.get(contract.deviceFamily) ?? new Map<string, NestSkillId>();
    if (map.has(kind)) {
      throw new Error(`duplicate route dataShape.kind '${kind}' for '${contract.deviceFamily}'`);
    }
    map.set(kind, contract.id);
    output.set(contract.deviceFamily, map);
  }
  return output;
})();

/** Frozen, JSON-friendly discriminator snapshot for agent and non-TS parity. */
export const ROUTING_DISCRIMINATORS: Readonly<
  Partial<Record<NestDeviceFamily, Readonly<Record<string, NestSkillId>>>>
> = Object.freeze(Object.fromEntries(
  [...FAMILY_KIND_TO_SKILL].map(([family, map]) => [
    family,
    Object.freeze(Object.fromEntries(map)),
  ]),
));

function familyDisambiguator(family: NestDeviceFamily): Disambiguator | undefined {
  const map = FAMILY_KIND_TO_SKILL.get(family);
  return map && map.size > 0
    ? { field: 'dataShape.kind', maps: Object.fromEntries(map) }
    : undefined;
}

// Derived once from the registry: family → its member skill ids. Keeps the
// router pinned to the registry (a new skill in a family is picked up for free).
const FAMILY_MEMBERS: ReadonlyMap<NestDeviceFamily, readonly NestSkillId[]> = (() => {
  const out = new Map<NestDeviceFamily, NestSkillId[]>();
  for (const c of listSkills()) {
    const members = out.get(c.deviceFamily) ?? [];
    members.push(c.id);
    out.set(c.deviceFamily, members);
  }
  for (const members of out.values()) Object.freeze(members);
  return out;
})();

function resolve(skill: NestSkillId): RouteResult {
  const contract = NEST_SKILL_REGISTRY[skill];
  if (contract.scene === null) {
    return {
      ok: false,
      reason: 'no_cortexel_scene',
      candidates: [skill],
      rendererRoutes: contract.rendererRoutes,
      field: 'skill',
      message: `skill '${skill}' has no Cortexel scene; use one of its host renderer routes`,
    };
  }
  return { ok: true, skill, scene: contract.scene };
}

function routeToSceneUnsafe(input: unknown): RouteResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      reason: 'invalid_input',
      field: '(input)',
      message: 'route input must be an object with a deviceFamily',
    };
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    return {
      ok: false,
      reason: 'invalid_input',
      field: '(input)',
      message: 'route input must be a plain object',
    };
  }
  const raw: Record<string, unknown> = {};
  const allowedInputKeys = new Set(['deviceFamily', 'dataShape', 'skill']);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowedInputKeys.has(key)) {
      return {
        ok: false,
        reason: 'invalid_input',
        field: typeof key === 'string'
          ? safePrimitiveDiagnostic(key, PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength)
          : '(symbol)',
        message: `unknown route input field '${safePrimitiveDiagnostic(key)}'`,
      };
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      return {
        ok: false,
        reason: 'invalid_input',
        field: key,
        message: 'route input fields must be enumerable data properties',
      };
    }
    raw[key] = descriptor.value;
  }
  if (!Object.hasOwn(raw, 'deviceFamily')) {
    return {
      ok: false,
      reason: 'invalid_input',
      field: 'deviceFamily',
      message: 'route input is missing deviceFamily',
    };
  }
  const deviceFamily = raw.deviceFamily;
  if (
    typeof deviceFamily !== 'string' ||
    !(NEST_DEVICE_FAMILIES as readonly string[]).includes(deviceFamily)
  ) {
    return {
      ok: false,
      reason: 'unknown_family',
      field: 'deviceFamily',
      message: `unknown device family '${safePrimitiveDiagnostic(deviceFamily)}'`,
    };
  }
  const family = deviceFamily as NestDeviceFamily;
  const members = FAMILY_MEMBERS.get(family);
  if (!members || members.length === 0) {
    return { ok: false, reason: 'unknown_family', field: 'deviceFamily' };
  }
  const candidates = members.filter(
    (skill) => NEST_SKILL_REGISTRY[skill].routerEligibility?.bareFamilyCandidate !== false,
  );

  // Validate every supplied discriminator before choosing precedence. A
  // dataShape on another family, or a dataShape that conflicts with skill, is a
  // caller error rather than a hint to silently ignore.
  const dataShape = raw.dataShape;
  let shapeSkill: NestSkillId | undefined;
  if (dataShape !== undefined) {
    const kindMap = FAMILY_KIND_TO_SKILL.get(family);
    const disambiguator = familyDisambiguator(family);
    if (!kindMap || !disambiguator) {
      return {
        ok: false,
        reason: 'invalid_discriminator',
        field: 'dataShape',
        candidates: [...candidates],
        message: `dataShape is not defined for device family '${family}'`,
      };
    }
    if (
      dataShape === null ||
      typeof dataShape !== 'object' ||
      Array.isArray(dataShape)
    ) {
      return {
        ok: false,
        reason: 'invalid_discriminator',
        field: 'dataShape',
        candidates: [...candidates],
        disambiguateBy: disambiguator,
        message: 'dataShape must be an object containing kind',
      };
    }
    const shapePrototype = Object.getPrototypeOf(dataShape);
    const shapeKeys = Reflect.ownKeys(dataShape);
    if (
      (shapePrototype !== Object.prototype && shapePrototype !== null) ||
      shapeKeys.length !== 1 ||
      shapeKeys[0] !== 'kind'
    ) {
      return {
        ok: false,
        reason: 'invalid_discriminator',
        field: 'dataShape',
        candidates: [...candidates],
        disambiguateBy: disambiguator,
        message: 'dataShape must be a strict plain object containing kind',
      };
    }
    const kindDescriptor = Object.getOwnPropertyDescriptor(dataShape, 'kind');
    if (
      !kindDescriptor ||
      !('value' in kindDescriptor) ||
      !kindDescriptor.enumerable
    ) {
      return {
        ok: false,
        reason: 'invalid_discriminator',
        field: 'dataShape.kind',
        candidates: [...candidates],
        disambiguateBy: disambiguator,
        message: 'dataShape.kind must be an enumerable data property',
      };
    }
    const kind = kindDescriptor.value;
    shapeSkill = typeof kind === 'string'
      ? kindMap.get(kind)
      : undefined;
    if (!shapeSkill) {
      return {
        ok: false,
        reason: 'invalid_discriminator',
        field: 'dataShape.kind',
        candidates: [...candidates],
        disambiguateBy: disambiguator,
        message: `unknown ${family} data kind '${safePrimitiveDiagnostic(kind)}'`,
      };
    }
  }

  // A supplied skill is a discriminator, not a suggestion: invalid or
  // wrong-family values fail explicitly instead of being silently ignored.
  const suppliedSkill = raw.skill;
  if (suppliedSkill !== undefined) {
    if (!isSkillId(suppliedSkill)) {
      return {
        ok: false,
        reason: 'invalid_discriminator',
        field: 'skill',
        candidates: [...candidates],
        message: `unknown skill discriminator '${safePrimitiveDiagnostic(suppliedSkill)}'`,
        disambiguateBy: {
          field: 'skill',
          maps: Object.fromEntries(candidates.map((skill) => [skill, skill])),
        },
      };
    }
    if (!members.includes(suppliedSkill)) {
      return {
        ok: false,
        reason: 'skill_family_mismatch',
        field: 'skill',
        candidates: [...candidates],
        message: `skill '${suppliedSkill}' does not belong to device family '${family}'`,
        disambiguateBy: {
          field: 'skill',
          maps: Object.fromEntries(candidates.map((skill) => [skill, skill])),
        },
      };
    }
    if (shapeSkill && shapeSkill !== suppliedSkill) {
      return {
        ok: false,
        reason: 'invalid_discriminator',
        field: 'dataShape.kind',
        candidates: [...candidates],
        disambiguateBy: familyDisambiguator(family),
        message: `dataShape resolves to '${shapeSkill}' but skill is '${suppliedSkill}'`,
      };
    }
    return resolve(suppliedSkill);
  }

  // Single eligible family member: unambiguous. Explicit deprecated aliases
  // remain valid above but never make bare-family discovery ambiguous.
  if (candidates.length === 1) return resolve(candidates[0]);

  if (shapeSkill) return resolve(shapeSkill);

  // Ambiguous — hand back exactly what is needed to retry deterministically.
  const disambiguateBy: Disambiguator = familyDisambiguator(family) ?? {
    field: 'skill',
    maps: Object.fromEntries(candidates.map((s) => [s, s])),
  };
  return {
    ok: false,
    reason: 'ambiguous',
    candidates: [...candidates],
    disambiguateBy,
  };
}

export function routeToScene(input: RouteInput): RouteResult;
export function routeToScene(input: unknown): RouteResult;
export function routeToScene(input: unknown): RouteResult {
  try {
    return routeToSceneUnsafe(input);
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid_input',
      field: '(input)',
      message: `route input could not be safely inspected: ${
        safeErrorMessage(error)
      }`,
    };
  }
}
