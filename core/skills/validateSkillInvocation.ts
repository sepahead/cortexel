// validateSkillInvocation — the documented agent entrypoint into Cortexel.
//
// It supersedes (does not replace) validateVizSpec: validateVizSpec stays the
// lenient low-level envelope check, while this gate is the strict, skill-aware
// path an agent must use to get a render-ready result. It enforces, fail-closed:
//   1. envelope shape (delegates to validateVizSpec)
//   2. the skill id is known (unknown id → no render)
//   3. the spec's scene matches the skill's contract scene (and is non-null)
//   4. params satisfy the skill's per-skill zod schema (closes opaque params)
//   5. every requiredProvenanceKey is present in provenance.declared_inputs
//   6. calibrated_posterior===true is a HARD ERROR (mirrors the 501 boundary)
// and returns the resolved honesty caption so the renderer cannot forget it.

import { validateVizSpec, type VizSpec } from '../vizSpec';
import {
  defaultHonestyCaption,
  requiresHonestyCaption,
} from '../provenance';
import { SCENE_NAMES, type SceneName } from '../designLaws';
import { getSkill } from './registry';
import { PI_NEST_SKILL_IDS } from './skillIds';

export interface SkillInvocationError {
  code:
    | 'unknown_skill'
    | 'invalid_envelope'
    | 'no_cortexel_scene'
    | 'scene_mismatch'
    | 'invalid_params'
    | 'missing_provenance'
    | 'calibrated_posterior_unsupported';
  path: string;
  message: string;
  hint?: string;
  validScenes?: readonly SceneName[];
  validSkills?: readonly string[];
}

export type SkillInvocationResult =
  | { ok: true; spec: VizSpec; scene: SceneName; caption: string | null }
  | { ok: false; errors: SkillInvocationError[] };

export function validateSkillInvocation(
  skillId: string,
  payload: unknown,
): SkillInvocationResult {
  const errors: SkillInvocationError[] = [];

  // 2. Known skill (fail-closed: no contract → no render).
  const contract = getSkill(skillId);
  if (!contract) {
    return {
      ok: false,
      errors: [
        {
          code: 'unknown_skill',
          path: 'skillId',
          message: `unknown skill '${skillId}'`,
          hint: 'Use one of the registered pi.nest.* skills.',
          validSkills: PI_NEST_SKILL_IDS,
        },
      ],
    };
  }

  // 6 (early). calibrated_posterior=true is rejected at the shared envelope
  // (ProvenanceSchema.superRefine), but check the raw payload first so the agent
  // gets the precise 'calibrated_posterior_unsupported' code rather than a
  // generic envelope error. (Mirrors CalibratedPosteriorNotImplementedError.)
  const rawProv = (payload as { provenance?: { calibrated_posterior?: unknown } })
    ?.provenance;
  if (rawProv?.calibrated_posterior === true) {
    return {
      ok: false,
      errors: [
        {
          code: 'calibrated_posterior_unsupported',
          path: 'provenance.calibrated_posterior',
          message:
            'calibrated_posterior=true is not implemented and is rejected at the visualization boundary',
          hint: 'Validation/search is candidate ranking; leave calibrated_posterior=false.',
        },
      ],
    };
  }

  // 1. Envelope.
  const envelope = validateVizSpec(payload);
  if (!envelope.ok) {
    return {
      ok: false,
      errors: envelope.errors.map((message) => ({
        code: 'invalid_envelope' as const,
        path: '(spec)',
        message,
        validScenes: SCENE_NAMES,
      })),
    };
  }
  const spec = envelope.spec;
  const prov = spec.provenance;

  // 3. Scene must be renderable and match the contract.
  if (contract.scene === null) {
    errors.push({
      code: 'no_cortexel_scene',
      path: 'skillId',
      message: `skill '${skillId}' has no Cortexel scene (route to a host renderer)`,
      hint: `Renderer routes: ${contract.rendererRoutes.join(', ')}.`,
    });
  } else if (spec.scene !== contract.scene) {
    errors.push({
      code: 'scene_mismatch',
      path: 'scene',
      message: `scene '${spec.scene}' does not match skill '${skillId}' scene '${contract.scene}'`,
      hint: `Set scene: '${contract.scene}'.`,
      validScenes: [contract.scene],
    });
  }

  // 4. Per-skill params.
  if (contract.paramsSchema) {
    const parsed = contract.paramsSchema.safeParse(spec.params);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          code: 'invalid_params',
          path: `params.${issue.path.join('.') || '(root)'}`,
          message: issue.message,
          hint: `Required params: ${contract.requiredInputKeys.join(', ')}.`,
        });
      }
    }
  }

  // 5. Required provenance keys must be declared.
  const declared = prov.declared_inputs ?? {};
  for (const key of contract.requiredProvenanceKeys) {
    if (!(key in declared)) {
      errors.push({
        code: 'missing_provenance',
        path: `provenance.declared_inputs.${key}`,
        message: `missing required provenance: ${key}`,
        hint: `Skill '${skillId}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(', ')}.`,
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  // `weak` is load-bearing: a skill that reuses a scene approximately (e.g.
  // astrocyte Ca/IP3 through the analog-trace scene) ALWAYS carries the derived-
  // view disclosure, prepended to any provenance caption. (With calibrated_
  // posterior=true rejected upstream, requiresHonestyCaption is effectively
  // always true on the accepted path, so this augments rather than replaces.)
  let caption = requiresHonestyCaption(prov) ? defaultHonestyCaption(prov) : null;
  if (contract.weak) {
    const weakMsg = `Derived view — ${skillId} reuses the '${contract.scene}' scene; not a 1:1 rendering.`;
    caption = caption ? `${weakMsg} ${caption}` : weakMsg;
  }

  return { ok: true, spec, scene: contract.scene as SceneName, caption };
}
