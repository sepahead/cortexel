/**
 * Internal, non-persisted OutputAuthority RenderPlan-translation gate.
 *
 * Artifact 1.0 remains honest: its external reference comparison is still `not_run`
 * and its table binding remains `shape_only`. This gate emits no detachable assurance
 * receipt and makes no persisted-table claim. It validates only the translation from a
 * validated canonical request to a detached, deeply frozen RenderPlan's exact table,
 * exact summary text, mandatory disclosures, and tagged carrier sequence. It does not
 * establish shipped-SVG bytes, numeric coordinates, visibility, encoding correctness,
 * accessibility effectiveness, or any persisted assurance.
 */

import {
  interpretOutputAuthorityModelV1,
  type OutputAuthorityV1,
} from '../core/output-authority.js';
import { deriveDisclosures } from '../core/disclosures.js';
import {
  DEFAULT_PROFILE,
  tryGetBudgetLimits,
  type BudgetLimits,
} from '../core/limits.js';
import type { JsonValue } from '../core/parse-json.js';
import { isValidatedRequest, type ValidatedRequest } from '../core/request.js';
import { SKILL_CATALOG, type SkillCatalogEntry } from '../generated/catalog.js';
import { resolveOutputAuthorityEvaluatorV1 } from '../authority/evaluators/registry.js';
import { extractObservedOutputAuthorityV1 } from './output-authority-extract.js';
import type { RenderPlanV1 } from './model/renderPlan.js';
import { isClosedPlainRenderPlanForAuthorityV1 } from './plan-closure.js';

export interface OutputAuthorityGatePassedV1 {
  readonly tag: 'passed';
}

export interface OutputAuthorityGateRefusedV1 {
  readonly tag: 'refused';
  readonly messages: readonly string[];
}

export type OutputAuthorityGateResultV1 =
  | OutputAuthorityGatePassedV1
  | OutputAuthorityGateRefusedV1;

const ENVIRONMENT_DISCLOSURE_FACT_KEYS = Object.freeze([
  'budgetProfileId',
  'nonStandardBudgetProfile',
] as const);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function forcedDisclosureIds(skillId: string, request: Record<string, unknown>): string[] {
  const data = record(request.data) ?? {};
  const parameters = record(request.parameters) ?? {};
  const forced: string[] = [];
  if (skillId === 'neuro.correlogram') {
    forced.push('LAG_ORIENTATION');
    if (data.mode === 'events_auto' || data.mode === 'prebinned_auto') {
      forced.push('ZERO_LAG_SELF_PAIRS_EXCLUDED');
    }
  }
  if (
    skillId === 'network.adjacency_matrix' ||
    skillId === 'network.weight_matrix' ||
    skillId === 'network.delay_matrix'
  ) forced.push('ABSENT_IS_NOT_ZERO');
  if (
    skillId === 'network.connection_graph' &&
    typeof record(parameters.layout)?.mode === 'string' &&
    String(record(parameters.layout)!.mode).startsWith('schematic')
  ) forced.push('SCHEMATIC_LAYOUT');
  if (skillId === 'neuro.response_curve' && data.mode === 'aggregates') {
    forced.push('AGGREGATE_WITHOUT_RAW_REPEATS');
  }
  return forced;
}

/**
 * Independently resolve the effective resource profile from the two authoritative
 * inputs. This deliberately does not call the compiler's selection function: shared
 * registry lookup remains explicit TCB, while the meet/dominance decision is duplicated
 * at the gate so a compiler-selection defect cannot make both sides agree automatically.
 */
function authorityEffectiveBudgetProfile(
  validated: ValidatedRequest,
): string | null {
  const presentation = record(validated.canonicalRequest.presentation) ?? {};
  const requestedProfile = presentation.budgetProfile ?? DEFAULT_PROFILE;
  const hostProfile = validated.inputAssurance.budgetProfile;
  if (typeof requestedProfile !== 'string' || typeof hostProfile !== 'string') return null;
  const requested = tryGetBudgetLimits(requestedProfile);
  const host = tryGetBudgetLimits(hostProfile);
  if (!requested || !host) return null;
  const requestedKeys = (Object.keys(requested) as (keyof BudgetLimits)[]).sort();
  const hostKeys = (Object.keys(host) as (keyof BudgetLimits)[]).sort();
  if (
    requestedKeys.length === 0 ||
    requestedKeys.length !== hostKeys.length ||
    requestedKeys.some((key, index) => key !== hostKeys[index])
  ) return null;
  const noGreaterThan = (
    left: BudgetLimits,
    right: BudgetLimits,
  ): boolean => requestedKeys.every((key) =>
    Number.isFinite(left[key]) && Number.isFinite(right[key]) && left[key] <= right[key]);

  // Preserve the closed contract's deterministic tie rule: a requested profile whose
  // envelope is no looser than the host profile wins, including equal envelopes.
  if (noGreaterThan(requested, host)) return requestedProfile;
  if (noGreaterThan(host, requested)) return hostProfile;
  return null;
}

export function checkOutputAuthorityEmissionV1(
  validated: ValidatedRequest,
  plan: RenderPlanV1,
): OutputAuthorityGateResultV1 {
  if (!isValidatedRequest(validated)) {
    return {
      tag: 'refused',
      messages: ['OutputAuthority emission gate requires Cortexel\'s live validated-request capability token'],
    };
  }
  if (!isClosedPlainRenderPlanForAuthorityV1(plan)) {
    return {
      tag: 'refused',
      messages: [
        'OutputAuthority translation gate requires Cortexel\'s detached, plain, deeply frozen RenderPlan capability',
      ],
    };
  }
  const catalog = SKILL_CATALOG[validated.skillId] as SkillCatalogEntry & {
    readonly outputAuthority?: OutputAuthorityV1;
  };
  const authority = catalog?.outputAuthority;
  if (!authority) {
    return { tag: 'refused', messages: ['stable skill has no generated OutputAuthority declaration'] };
  }
  if (
    plan.sourceRequestDigest !== validated.requestDigest ||
    plan.skillId !== validated.skillId ||
    authority.evaluator.id !== `${validated.skillId}.output_authority.v${validated.skillRevision}`
  ) {
    return {
      tag: 'refused',
      messages: ['OutputAuthority request, skill declaration, and actual RenderPlan identities do not match'],
    };
  }
  try {
    const evaluator = resolveOutputAuthorityEvaluatorV1(authority.evaluator.id);
    if (evaluator === null) {
      return {
        tag: 'refused',
        messages: [`no library-owned OutputAuthority evaluator is registered for ${authority.evaluator.id}`],
      };
    }
    const extracted = extractObservedOutputAuthorityV1(plan);
    if (extracted.tag !== 'extracted') {
      return {
        tag: 'refused',
        messages: extracted.problems.map((problem) => `${problem.path}: ${problem.message}`),
      };
    }
    const evaluation = evaluator.evaluateCanonicalRequest(validated.canonicalRequest as JsonValue);
    const disclosureValue = evaluation.fields[authority.disclosures.expectedFacts.field];
    if (disclosureValue?.tag !== 'disclosure_fact_map') {
      return {
        tag: 'refused',
        messages: ['independent evaluator omitted the typed disclosure fact map'],
      };
    }
    const collidingEnvironmentFact = ENVIRONMENT_DISCLOSURE_FACT_KEYS.find((key) =>
      Object.prototype.hasOwnProperty.call(disclosureValue.facts, key));
    if (collidingEnvironmentFact !== undefined) {
      return {
        tag: 'refused',
        messages: [
          `request-only evaluator attempted to author library-environment disclosure fact ${collidingEnvironmentFact}`,
        ],
      };
    }
    const effectiveBudgetProfile = authorityEffectiveBudgetProfile(validated);
    if (effectiveBudgetProfile === null) {
      return {
        tag: 'refused',
        messages: ['OutputAuthority could not independently compose the host and requested budget profiles'],
      };
    }
    const expectedDisclosures = deriveDisclosures(
      { ...disclosureValue.facts, budgetProfileId: effectiveBudgetProfile },
      catalog.disclosures,
      forcedDisclosureIds(validated.skillId, validated.canonicalRequest),
    );
    const interpreted = interpretOutputAuthorityModelV1(
      authority,
      catalog.accessibility.summaryTemplate,
      catalog.accessibility.tableColumns,
      expectedDisclosures,
      validated.requestDigest,
      evaluation,
      extracted.observed,
    );
    return interpreted.tag === 'valid'
      ? { tag: 'passed' }
      : {
        tag: 'refused',
        messages: interpreted.violations.map((entry) => `${entry.path}: ${entry.message}`),
      };
  } catch {
    return {
      tag: 'refused',
      messages: ['OutputAuthority evaluator, extractor, or interpreter failed closed before emission'],
    };
  }
}
