// validateSkillInvocation — the documented agent entrypoint into Cortexel.
//
// It supersedes (does not replace) validateVizSpec: validateVizSpec stays the
// lenient low-level envelope check, while this gate is the strict, skill-aware
// path an agent must use to get a render-ready result. It enforces, fail-closed:
//   1. envelope shape (delegates to validateVizSpec)
//   2. the skill id is known (unknown id → no render)
//   3. the spec's scene matches the skill's contract scene (and is non-null)
//   4. params satisfy the skill's closed, per-skill zod schema
//   5. declared provenance uses known keys, meaningful values, required-key
//      presence, and portable consistency with checked params
//   6. calibrated_posterior===true is a HARD ERROR (mirrors the 501 boundary)
// and returns the resolved honesty caption so the renderer cannot forget it.

import {
  CORTEXEL_SPEC_VERSION,
  JsonParamsSchema,
  validateVizSpec,
  type VizSpec,
} from '../vizSpec';
import {
  defaultHonestyCaption,
  requiresHonestyCaption,
} from '../provenance';
import { SCENE_NAMES, type SceneName } from '../designLaws';
import { getSkill } from './registry';
import {
  getExamplePayload,
  getInvocationExamplePayload,
} from './examples';
import { NEST_SKILL_IDS } from './skillIds';
import { isRegisteredPalette, listPalettes } from '../colormaps';
import {
  declaredProvenanceValueError,
  isProvenanceKey,
  normalizeDeclaredProvenanceInputs,
  provenanceParamConstraintError,
} from './provenanceKeys';
import {
  boundValidationIssue,
  readOwnEnumerableDataProperty,
  safeErrorMessage,
} from '../safeRuntime';
import {
  preflightLargeSkillParams,
  preflightRawEnvelopeParams,
  preflightRawSkillParams,
} from './paramPreflight';

export interface SkillInvocationError {
  code:
    | 'unknown_skill'
    | 'invalid_envelope'
    | 'no_cortexel_scene'
    | 'cortexel_scene_available'
    | 'scene_mismatch'
    | 'skill_mismatch'
    | 'unsupported_spec_version'
    | 'invalid_params'
    | 'missing_provenance'
    | 'invalid_provenance'
    | 'calibrated_posterior_unsupported'
    | 'unknown_palette'
    | 'invalid_renderer_route';
  path: string;
  message: string;
  hint?: string;
  validScenes?: readonly SceneName[];
  validSkills?: readonly string[];
  validPalettes?: string[];
  /** Nearest registered skill id (edit-distance) for a mistyped `unknown_skill`,
   *  so an agent can self-repair a typo without scanning the full list. */
  didYouMean?: string;
  /** A copyable valid payload for this skill, attached to actionable errors so
   *  an autonomous agent can self-repair without reading source. */
  example?: VizSpec | import('./hostInvocation').HostRendererInvocation;
}

/** Levenshtein distance — small, dependency-free, for a "did you mean" hint. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}

/** Closest registered skill id to a mistyped one (within a small threshold). */
function nearestSkill(id: string): string | undefined {
  // Bound edit-distance work before allocating a row proportional to untrusted
  // input. The envelope's skill field has the same 80-character ceiling.
  if (id.length === 0 || id.length > 80) return undefined;
  let best: string | undefined;
  let bestD = Infinity;
  for (const candidate of NEST_SKILL_IDS) {
    const d = editDistance(id, candidate);
    if (d < bestD) {
      bestD = d;
      best = candidate;
    }
  }
  // Only suggest when the typo is plausibly the same intended id.
  return best !== undefined && bestD <= Math.max(3, Math.ceil(id.length * 0.4))
    ? best
    : undefined;
}

export type SkillInvocationResult =
  | {
      ok: true;
      spec: VizSpec;
      skill: (typeof NEST_SKILL_IDS)[number];
      scene: SceneName;
      caption: string | null;
    }
  | { ok: false; errors: SkillInvocationError[] };

export type SkillParamsResult =
  | { ok: true; params: Record<string, unknown> }
  | { ok: false; errors: SkillInvocationError[] };

const MAX_INVOCATION_ERRORS = 32;

function printable(value: unknown): string {
  try {
    const text = typeof value === 'string' ? value : String(value);
    return text.length <= 120 ? text : `${text.slice(0, 117)}…`;
  } catch {
    return '<unprintable value>';
  }
}

/** Validate params for any registered skill, including scene-less skills that
 *  route to a host renderer. This is the language-level counterpart to the
 *  manifest's paramsJsonSchema + paramConstraints pair. */
export function validateSkillParams(
  skillId: unknown,
  params: unknown,
): SkillParamsResult {
  try {
    const contract = getSkill(skillId);
    if (!contract) {
      const suggestion = typeof skillId === 'string' ? nearestSkill(skillId) : undefined;
      return {
        ok: false,
        errors: [
          {
            code: 'unknown_skill',
            path: 'skillId',
            message: `unknown skill '${printable(skillId)}'`,
            hint: suggestion
              ? `Did you mean '${suggestion}'?`
              : 'Use one of the ids in validSkills.',
            validSkills: NEST_SKILL_IDS,
            didYouMean: suggestion,
            example: suggestion
              ? getInvocationExamplePayload(suggestion)
              : undefined,
          },
        ],
      };
    }

    const rawPreflight = preflightRawSkillParams(contract.id, params);
    if (rawPreflight) {
      return {
        ok: false,
        errors: [{
          code: 'invalid_params',
          path: `params.${rawPreflight.path}`,
          message: rawPreflight.message,
          hint: `Required params: ${contract.requiredInputKeys.join(', ')}.`,
          example: getInvocationExamplePayload(contract.id),
        }],
      };
    }
    const json = JsonParamsSchema.safeParse(params);
    if (!json.success) {
      return {
        ok: false,
        errors: json.error.issues.slice(0, MAX_INVOCATION_ERRORS).map((issue, index) => {
          const bounded = boundValidationIssue(issue);
          return {
            code: 'invalid_params' as const,
            path: `params.${bounded.path}`,
            message: bounded.message,
            hint: `Required params: ${contract.requiredInputKeys.join(', ')}.`,
            example: index === 0 ? getInvocationExamplePayload(contract.id) : undefined,
          };
        }),
      };
    }
    if (!contract.paramsSchema) {
      return {
        ok: false,
        errors: [
          {
            code: 'invalid_params',
            path: 'params',
            message: `skill '${contract.id}' has no parameter schema`,
            hint: 'This is a registry defect; do not route an unvalidated payload.',
          },
        ],
      };
    }
    const preflight = preflightLargeSkillParams(contract.id, json.data);
    if (preflight) {
      return {
        ok: false,
        errors: [
          {
            code: 'invalid_params',
            path: `params.${preflight.path}`,
            message: preflight.message,
            hint: `Required params: ${contract.requiredInputKeys.join(', ')}.`,
            example: getInvocationExamplePayload(contract.id),
          },
        ],
      };
    }
    const parsed = contract.paramsSchema.safeParse(json.data);
    if (!parsed.success) {
      return {
        ok: false,
        errors: parsed.error.issues
          .slice(0, MAX_INVOCATION_ERRORS)
          .map((issue, index) => {
            const bounded = boundValidationIssue(issue);
            return {
              code: 'invalid_params' as const,
              path: `params.${bounded.path}`,
              message: bounded.message,
              hint: `Required params: ${contract.requiredInputKeys.join(', ')}.`,
              example: index === 0
                ? getInvocationExamplePayload(contract.id)
                : undefined,
            };
          }),
      };
    }
    return { ok: true, params: parsed.data as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: 'invalid_params',
          path: 'params',
          message: `validation could not safely inspect params: ${
            safeErrorMessage(error)
          }`,
        },
      ],
    };
  }
}

function validateSkillInvocationUnsafe(
  skillId: unknown,
  payload: unknown,
): SkillInvocationResult {
  const errors: SkillInvocationError[] = [];

  // 2. Known skill (fail-closed: no contract → no render).
  const contract = getSkill(skillId);
  if (!contract) {
    const suggestion = typeof skillId === 'string' ? nearestSkill(skillId) : undefined;
    return {
      ok: false,
      errors: [
        {
          code: 'unknown_skill',
          path: 'skillId',
          message: `unknown skill '${printable(skillId)}'`,
          hint: suggestion
            ? `Did you mean '${suggestion}'? Otherwise use one of the ids in validSkills.`
            : 'Use one of the ids in validSkills (nest.* and corpus.*).',
          validSkills: NEST_SKILL_IDS,
          didYouMean: suggestion,
          // Attach the nearest skill's example so a typo self-repairs in one shot.
          example: suggestion
            ? getInvocationExamplePayload(suggestion)
            : undefined,
        },
      ],
    };
  }

  // A scene-less skill is intentionally not a Cortexel envelope at all. Report
  // its honest host routes before trying to require a fake `scene` field.
  if (contract.scene === null) {
    return {
      ok: false,
      errors: [
        {
          code: 'no_cortexel_scene',
          path: 'skillId',
          message: `skill '${skillId}' has no Cortexel scene (route to a host renderer)`,
          hint: `Renderer routes: ${contract.rendererRoutes.join(', ')}.`,
        },
      ],
    };
  }
  const example = getExamplePayload(contract.id);
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
          ? 'Use only fields declared by the strict invocation envelope.'
          : `Required params: ${contract.requiredInputKeys.join(', ')}.`,
        example,
      }],
    };
  }

  // 6 (early). calibrated_posterior=true is rejected at the shared envelope
  // (ProvenanceSchema literal-false contract), but check the raw payload first so the agent
  // gets the precise 'calibrated_posterior_unsupported' code rather than a
  // generic envelope error. (Mirrors CalibratedPosteriorNotImplementedError.)
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
          example,
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
          message: `unsupported spec version '${printable(rawVersion)}'`,
          hint: `Use '${CORTEXEL_SPEC_VERSION}', or omit specVersion for a legacy envelope.`,
          example,
        },
      ],
    };
  }

  // 1. Envelope.
  const envelope = validateVizSpec(payload);
  if (!envelope.ok) {
    return {
      ok: false,
      errors: envelope.errors.slice(0, MAX_INVOCATION_ERRORS).map((formatted, index) => {
        const separator = formatted.indexOf(': ');
        const path = separator >= 0 ? formatted.slice(0, separator) : '(spec)';
        const message = separator >= 0 ? formatted.slice(separator + 2) : formatted;
        return {
          code: 'invalid_envelope' as const,
          path,
          message,
          hint: 'Match the VizSpec envelope shape shown in the attached skill example.',
          validScenes: SCENE_NAMES,
          example: index === 0 ? example : undefined,
        };
      }),
    };
  }
  let spec = envelope.spec;

  // 2b. If the spec is self-describing (carries `skill`), it must agree with the
  //     skillId this gate was invoked with — a serialized spec should not be
  //     re-validatable under a different skill than the one that produced it.
  if (spec.skill && spec.skill !== skillId) {
    errors.push({
      code: 'skill_mismatch',
      path: 'skill',
      message: `spec.skill '${spec.skill}' does not match the skill '${skillId}' it is being validated under`,
      hint: `Validate this spec with skillId '${spec.skill}', or set spec.skill to '${skillId}'.`,
      example,
    });
  }

  // 3. Scene must be renderable and match the contract.
  if (spec.scene !== contract.scene) {
    errors.push({
      code: 'scene_mismatch',
      path: 'scene',
      message: `scene '${spec.scene}' does not match skill '${skillId}' scene '${contract.scene}'`,
      hint: `Set scene: '${contract.scene}'.`,
      validScenes: [contract.scene],
      example,
    });
  }

  // 4. Per-skill params.
  if (contract.paramsSchema) {
    const preflight = preflightLargeSkillParams(contract.id, spec.params);
    const parsed = preflight ? undefined : contract.paramsSchema.safeParse(spec.params);
    if (preflight) {
      errors.push({
        code: 'invalid_params',
        path: `params.${preflight.path}`,
        message: preflight.message,
        hint: `Required params: ${contract.requiredInputKeys.join(', ')}.`,
        example,
      });
    } else if (parsed && !parsed.success) {
      const issues = parsed.error.issues;
      const available = Math.max(0, MAX_INVOCATION_ERRORS - errors.length);
      const detailedCount = Math.min(issues.length, Math.max(0, available - 1));
      for (const issue of issues.slice(0, detailedCount)) {
        const bounded = boundValidationIssue(issue);
        errors.push({
          code: 'invalid_params',
          path: `params.${bounded.path}`,
          message: bounded.message,
          hint: `Required params: ${contract.requiredInputKeys.join(', ')}.`,
          // One example is enough; repeating it on every issue bloats serialized
          // tool output quadratically for malformed arrays.
          example: errors.some((error) => error.example) ? undefined : example,
        });
      }
      if (issues.length > detailedCount && errors.length < MAX_INVOCATION_ERRORS) {
        errors.push({
          code: 'invalid_params',
          path: 'params.(root)',
          message: `additional validation issues omitted after ${MAX_INVOCATION_ERRORS} errors`,
          hint: 'Fix the reported shape first, then validate again.',
        });
      }
    } else if (parsed?.success) {
      // Return the parsed form (trimmed strings/defaults), not the raw object that
      // merely happened to validate against it.
      spec = { ...spec, params: parsed.data as Record<string, unknown> };
    }
  }

  // 5. Required provenance keys must be declared.
  let prov = spec.provenance;
  const declared = normalizeDeclaredProvenanceInputs(
    prov.declared_inputs ?? {},
  );
  if (prov.declared_inputs) {
    prov = { ...prov, declared_inputs: declared };
    spec = { ...spec, provenance: prov };
  }
  const invalidDeclaredKeys = new Set<string>();
  for (const key of Object.keys(declared)) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    if (!isProvenanceKey(key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: 'invalid_provenance',
        path: `provenance.declared_inputs.${key}`,
        message: `unknown declared provenance key '${key}'`,
        hint: 'Use only keys from PROVENANCE_KEYS and the selected skill contract.',
        example: errors.some((error) => error.example) ? undefined : example,
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
        example: errors.some((error) => error.example) ? undefined : example,
      });
    }
  }
  for (const key of contract.requiredProvenanceKeys) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    if (!Object.hasOwn(declared, key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: 'missing_provenance',
        path: `provenance.declared_inputs.${key}`,
        message: `missing required provenance: ${key}`,
        hint: `Skill '${skillId}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(', ')}.`,
        example: errors.some((error) => error.example) ? undefined : example,
      });
    }
  }

  if (!errors.some((error) => error.code === 'invalid_params')) {
    for (const constraint of contract.provenanceParamConstraints ?? []) {
      if (errors.length >= MAX_INVOCATION_ERRORS) break;
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
          example: errors.some((error) => error.example) ? undefined : example,
        });
      }
    }
  }

  // 7. Palette hint must be a registered palette name (if present).
  if (spec.palette && !isRegisteredPalette(spec.palette)) {
    errors.push({
      code: 'unknown_palette',
      path: 'palette',
      message: `palette '${spec.palette}' is not registered`,
      hint: `Use one of: ${listPalettes().map((p) => p.name).join(', ')}.`,
      validPalettes: listPalettes().map((p) => p.name),
      example,
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  // `weak` is load-bearing: a weak skill ALWAYS carries a mandatory derived-view
  // disclosure, prepended to any provenance caption. The disclosure TEXT is the
  // skill's own `weakDisclosure` (the reason differs per skill — scene reuse vs
  // advisory data semantics), falling back to a generic scene-reuse sentence.
  // (With calibrated_posterior=true rejected upstream, requiresHonestyCaption is
  // effectively always true on the accepted path, so this augments the caption.)
  let caption = requiresHonestyCaption(prov) ? defaultHonestyCaption(prov) : null;
  if (contract.weak) {
    const weakMsg =
      contract.weakDisclosure ??
      `Derived view — ${skillId} reuses the '${contract.scene}' scene; not a 1:1 rendering.`;
    caption = caption ? `${weakMsg} ${caption}` : weakMsg;
  }

  return {
    ok: true,
    spec,
    skill: contract.id,
    scene: contract.scene as SceneName,
    caption,
  };
}

/** Strict, skill-aware validation that never throws for malformed runtime input. */
export function validateSkillInvocation(
  skillId: unknown,
  payload: unknown,
): SkillInvocationResult {
  try {
    return validateSkillInvocationUnsafe(skillId, payload);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: 'invalid_envelope',
          path: '(spec)',
          message: `validation could not safely inspect the payload: ${
            safeErrorMessage(error)
          }`,
          validScenes: SCENE_NAMES,
        },
      ],
    };
  }
}
