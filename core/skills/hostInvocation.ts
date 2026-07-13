// Strict boundary for skills whose honest renderer lives outside Cortexel.
// `scene:null` means "do not invent a Cortexel scene", not "skip validation".
// This envelope preserves the same params, provenance, version, repair, and
// mandatory-caption guarantees as validateSkillInvocation while returning the
// contract's allowed host renderer routes instead of a SceneName.

import { z } from 'zod';
import {
  CORTEXEL_SPEC_VERSION,
  JsonParamsSchema,
  ProvenanceSchema,
} from '../vizSpec';
import {
  defaultHonestyCaption,
  requiresHonestyCaption,
} from '../provenance';
import { getHostRendererExamplePayload } from './examples';
import {
  declaredProvenanceValueError,
  isProvenanceKey,
  normalizeDeclaredProvenanceInputs,
  provenanceParamConstraintError,
} from './provenanceKeys';
import { getSkill } from './registry';
import {
  NEST_SKILL_IDS,
  VALID_RENDERER_ROUTES,
  type RendererRoute,
} from './skillIds';
import {
  validateSkillParams,
  type SkillInvocationError,
} from './validateSkillInvocation';
import {
  SAFE_DISPLAY_STRING_PATTERN,
  boundValidationIssue,
  readOwnEnumerableDataProperty,
  safeErrorMessage,
  safePrimitiveDiagnostic,
} from '../safeRuntime';
import { preflightRawEnvelopeParams } from './paramPreflight';

export const HostRendererInvocationSchema = z
  .object({
    skill: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(SAFE_DISPLAY_STRING_PATTERN, 'skill must not contain display control characters'),
    specVersion: z.literal(CORTEXEL_SPEC_VERSION).optional(),
    params: JsonParamsSchema,
    provenance: ProvenanceSchema,
    /** Optional selected host route. When omitted, the validated result returns
     *  every route the skill contract permits. */
    rendererRoute: z.enum(VALID_RENDERER_ROUTES).optional(),
  })
  .strict();

export type HostRendererInvocation = z.infer<typeof HostRendererInvocationSchema>;

export type HostRendererInvocationResult =
  | {
      ok: true;
      spec: HostRendererInvocation;
      rendererRoutes: readonly RendererRoute[];
      caption: string | null;
    }
  | { ok: false; errors: SkillInvocationError[] };

const MAX_HOST_ERRORS = 32;

function validateHostRendererInvocationUnsafe(
  skillId: unknown,
  payload: unknown,
): HostRendererInvocationResult {
  const contract = getSkill(skillId);
  if (!contract) {
    // Reuse the shared typo/valid-skills repair behavior.
    const checked = validateSkillParams(skillId, {});
    return checked.ok
      ? {
          ok: false,
          errors: [{ code: 'unknown_skill', path: 'skillId', message: 'unknown skill' }],
        }
      : checked;
  }
  if (contract.scene !== null) {
    return {
      ok: false,
      errors: [
        {
          code: 'cortexel_scene_available',
          path: 'skillId',
          message: `skill '${contract.id}' renders through Cortexel scene '${contract.scene}'`,
          hint: `Use validateSkillInvocation('${contract.id}', vizSpec) instead.`,
          validScenes: [contract.scene],
        },
      ],
    };
  }
  const rawParamPreflight = preflightRawEnvelopeParams(contract.id, payload);
  if (rawParamPreflight) {
    const envelopeIssue = rawParamPreflight.scope === 'envelope';
    return {
      ok: false,
      errors: [{
        code: envelopeIssue ? 'invalid_envelope' : 'invalid_params',
        path: envelopeIssue
          ? rawParamPreflight.path
          : `params.${rawParamPreflight.path}`,
        message: rawParamPreflight.message,
        hint: envelopeIssue
          ? 'Use only fields declared by the strict host-renderer envelope.'
          : `Required params: ${contract.requiredInputKeys.join(', ')}.`,
        example: getHostRendererExamplePayload(contract.id),
      }],
    };
  }

  const rawProvenance = readOwnEnumerableDataProperty(payload, 'provenance');
  const rawCalibrated = rawProvenance.kind === 'value'
    ? readOwnEnumerableDataProperty(rawProvenance.value, 'calibrated_posterior')
    : { kind: 'absent' as const };
  if (rawCalibrated.kind === 'value' && rawCalibrated.value === true) {
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
  const rawVersionProperty = readOwnEnumerableDataProperty(payload, 'specVersion');
  const rawVersion = rawVersionProperty.kind === 'value'
    ? rawVersionProperty.value
    : undefined;
  if (rawVersionProperty.kind === 'value' && rawVersion !== CORTEXEL_SPEC_VERSION) {
    return {
      ok: false,
      errors: [
        {
          code: 'unsupported_spec_version',
          path: 'specVersion',
          message: `unsupported spec version '${safePrimitiveDiagnostic(rawVersion)}'`,
          hint: `Use '${CORTEXEL_SPEC_VERSION}', or omit specVersion for a legacy envelope.`,
          example: getHostRendererExamplePayload(contract.id),
        },
      ],
    };
  }

  const exact = JsonParamsSchema.safeParse(payload);
  if (!exact.success) {
    return {
      ok: false,
      errors: exact.error.issues.slice(0, MAX_HOST_ERRORS).map((issue, index) => {
        const bounded = boundValidationIssue(issue);
        return {
          code: 'invalid_envelope' as const,
          path: bounded.path,
          message: bounded.message,
          hint: 'Match the host-renderer envelope shown in the attached skill example.',
          example: index === 0 ? getHostRendererExamplePayload(contract.id) : undefined,
        };
      }),
    };
  }
  const envelope = HostRendererInvocationSchema.safeParse(exact.data);
  if (!envelope.success) {
    return {
      ok: false,
      errors: envelope.error.issues.slice(0, MAX_HOST_ERRORS).map((issue, index) => {
        const bounded = boundValidationIssue(issue);
        return {
          code: 'invalid_envelope' as const,
          path: bounded.path,
          message: bounded.message,
          example: index === 0 ? getHostRendererExamplePayload(contract.id) : undefined,
        };
      }),
    };
  }

  let spec = envelope.data;
  const errors: SkillInvocationError[] = [];
  const example = getHostRendererExamplePayload(contract.id);
  if (spec.skill !== contract.id) {
    errors.push({
      code: 'skill_mismatch',
      path: 'skill',
      message: `spec.skill '${spec.skill}' does not match the skill '${contract.id}' it is being validated under`,
      hint: `Set spec.skill to '${contract.id}'.`,
      example,
    });
  }

  const params = validateSkillParams(contract.id, spec.params);
  if (!params.ok) {
    for (const error of params.errors.slice(0, MAX_HOST_ERRORS - errors.length)) {
      errors.push({
        ...error,
        example: errors.some((item) => item.example) ? undefined : example,
      });
    }
  } else {
    spec = { ...spec, params: params.params };
  }

  for (const flag of [
    'advisory_only',
    'is_paper_local_evidence',
    'synthetic',
  ] as const) {
    if (errors.length >= MAX_HOST_ERRORS) break;
    const required = contract.requiredProvenanceFlags?.[flag];
    if (required !== undefined && spec.provenance[flag] !== required) {
      errors.push({
        code: 'invalid_provenance',
        path: `provenance.${flag}`,
        message: `skill '${contract.id}' requires provenance.${flag}=${required}; received ${spec.provenance[flag]}`,
        hint: 'Use the skill contract requiredProvenanceFlags value; element-level epistemic status cannot be overridden by the envelope.',
        example: errors.some((item) => item.example) ? undefined : example,
      });
    }
  }

  const declared = normalizeDeclaredProvenanceInputs(
    spec.provenance.declared_inputs ?? {},
  );
  if (spec.provenance.declared_inputs) {
    spec = {
      ...spec,
      provenance: { ...spec.provenance, declared_inputs: declared },
    };
  }
  const invalidDeclaredKeys = new Set<string>();
  for (const key of Object.keys(declared)) {
    if (errors.length >= MAX_HOST_ERRORS) break;
    if (!isProvenanceKey(key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: 'invalid_provenance',
        path: `provenance.declared_inputs.${key}`,
        message: `unknown declared provenance key '${key}'`,
        hint: 'Use only keys from PROVENANCE_KEYS and the selected skill contract.',
        example: errors.some((item) => item.example) ? undefined : example,
      });
      continue;
    }
    const message = declaredProvenanceValueError(key, declared[key]);
    if (message) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: 'invalid_provenance',
        path: `provenance.declared_inputs.${key}`,
        message,
        hint: `Declare a meaningful value for '${key}' that matches its provenance constraint.`,
        example: errors.some((item) => item.example) ? undefined : example,
      });
    }
  }
  for (const key of contract.requiredProvenanceKeys) {
    if (errors.length >= MAX_HOST_ERRORS) break;
    if (!Object.hasOwn(declared, key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: 'missing_provenance',
        path: `provenance.declared_inputs.${key}`,
        message: `missing required provenance: ${key}`,
        hint: `Skill '${contract.id}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(', ')}.`,
        example: errors.some((item) => item.example) ? undefined : example,
      });
      continue;
    }
  }

  if (params.ok) {
    for (const constraint of contract.provenanceParamConstraints ?? []) {
      if (errors.length >= MAX_HOST_ERRORS) break;
      if (invalidDeclaredKeys.has(constraint.provenanceKey)) continue;
      const message = provenanceParamConstraintError(
        constraint,
        spec.params,
        declared,
      );
      if (message) {
        errors.push({
          code: 'invalid_provenance',
          path: `provenance.declared_inputs.${constraint.provenanceKey}`,
          message,
          hint: constraint.description,
          example: errors.some((item) => item.example) ? undefined : example,
        });
      }
    }
  }

  if (
    spec.rendererRoute !== undefined &&
    !contract.rendererRoutes.includes(spec.rendererRoute)
  ) {
    errors.push({
      code: 'invalid_renderer_route',
      path: 'rendererRoute',
      message: `renderer route '${spec.rendererRoute}' is not allowed for skill '${contract.id}'`,
      hint: `Use one of: ${contract.rendererRoutes.join(', ')}.`,
      example: errors.some((item) => item.example) ? undefined : example,
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  let caption = requiresHonestyCaption(spec.provenance)
    ? defaultHonestyCaption(spec.provenance)
    : null;
  if (contract.weak) {
    const disclosure =
      contract.weakDisclosure ??
      `Derived host view — '${contract.id}' is not a native Cortexel scene.`;
    caption = caption ? `${disclosure} ${caption}` : disclosure;
  }
  return {
    ok: true,
    spec,
    rendererRoutes: contract.rendererRoutes,
    caption,
  };
}

/** Validate a scene-less skill envelope without ever inventing a scene. */
export function validateHostRendererInvocation(
  skillId: unknown,
  payload: unknown,
): HostRendererInvocationResult {
  try {
    return validateHostRendererInvocationUnsafe(skillId, payload);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: 'invalid_envelope',
          path: '(spec)',
          message: `host invocation could not be safely inspected: ${
            safeErrorMessage(error)
          }`,
          validSkills: NEST_SKILL_IDS,
        },
      ],
    };
  }
}

/** Re-validate a stored, self-describing host-renderer invocation. */
export function validateHostRendererSpec(payload: unknown): HostRendererInvocationResult {
  let skillProperty;
  try {
    skillProperty = readOwnEnumerableDataProperty(payload, 'skill');
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: 'invalid_envelope',
          path: '(spec)',
          message: `validation could not safely inspect spec.skill: ${
            safeErrorMessage(error)
          }`,
        },
      ],
    };
  }
  const skill = skillProperty.kind === 'value' ? skillProperty.value : undefined;
  const normalizedSkill = typeof skill === 'string' && skill.length <= 80
    ? skill.trim()
    : skill;
  if (typeof normalizedSkill !== 'string' || normalizedSkill.length === 0) {
    return {
      ok: false,
      errors: [
        {
          code: 'unknown_skill',
          path: 'skill',
          message: 'host-renderer spec has no non-empty `skill` field',
          hint: 'Set spec.skill to the scene-less skill id used to author this payload.',
          validSkills: NEST_SKILL_IDS,
        },
      ],
    };
  }
  return validateHostRendererInvocation(normalizedSkill, payload);
}
