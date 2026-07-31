/**
 * Closed machine-applicable repairs for FigureRequestV1.
 *
 * This is deliberately much smaller than the diagnostic repair vocabulary. A repair
 * hint may recommend a scientific or presentational choice; that does not make the
 * choice safe to automate. This module admits only operations whose intended value can
 * be re-derived from installed contract authority and then revalidates from stage one.
 */

import { canonicalize } from './canonicalize.js';
import { deepFreeze } from './deep-freeze.js';
import {
  finalizeErrorsWithPriority,
  makeError,
  type CortexelError,
} from './errors.js';
import { getBudgetLimits, type BudgetProfileId } from './limits.js';
import type { JsonValue } from './parse-json.js';
import {
  parseAndValidateRequest,
  validateRequestValue,
  type ValidateOptions,
  type ValidatedRequest,
  type ValidationOutcome,
  type InputAssurance,
} from './request.js';
import {
  captureMaterializedRequestInput,
  captureRawRequestInput,
} from './requestBoundary.internal.js';
import { isLibraryAuthoredField } from './semantics/provenance.js';
import { resolveAlias } from './units.js';
import { REQUEST_CONTRACT_IDENTITY } from './contract-identity.js';

/** One correction Cortexel applied to its private candidate snapshot. */
export interface AppliedSafeRepair {
  readonly operation: 'replace' | 'remove' | 'add';
  readonly path: string;
  readonly value?: JsonValue;
  readonly reasonCode:
    | 'CONTRACT_MISSING'
    | 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL'
    | 'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN';
}

/**
 * No unvalidated candidate is returned. The original input is never mutated; only a
 * successful ordinary branded request can cross the render boundary.
 */
export type SafeRepairOutcome =
  | {
      readonly ok: true;
      readonly request: ValidatedRequest;
      readonly sourceInputAssurance: InputAssurance;
      readonly appliedRepairs: readonly AppliedSafeRepair[];
    }
  | {
      readonly ok: false;
      readonly errors: readonly CortexelError[];
      readonly inputAssurance: InputAssurance;
      readonly sourceInputAssurance: InputAssurance;
      readonly appliedRepairs: readonly AppliedSafeRepair[];
    };

interface RepairLocation {
  readonly parent: Record<string, JsonValue>;
  readonly key: string;
  readonly value: JsonValue;
}

interface PlannedSafeRepair {
  readonly audit: AppliedSafeRepair;
  readonly location: RepairLocation;
}

type RepairDecision =
  | { readonly kind: 'not_allowlisted' }
  | { readonly kind: 'metadata_invalid' }
  | { readonly kind: 'planned'; readonly plan: PlannedSafeRepair };

function decodePointer(path: string): readonly string[] | undefined {
  if (path === '') return [];
  if (!path.startsWith('/')) return undefined;
  const tokens = path.slice(1).split('/');
  const decoded: string[] = [];
  for (const token of tokens) {
    if (/~(?:[^01]|$)/u.test(token)) return undefined;
    decoded.push(token.replace(/~1/gu, '/').replace(/~0/gu, '~'));
  }
  return decoded;
}

/** Resolve an existing object member without invoking getters or prototypes. */
function locateRepairMember(root: JsonValue, path: string): RepairLocation | undefined {
  const tokens = decodePointer(path);
  if (tokens === undefined || tokens.length === 0) return undefined;
  let current: JsonValue = root;

  for (let index = 0; index < tokens.length - 1; index++) {
    const token = tokens[index];
    if (current === null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(token)) return undefined;
      const arrayIndex = Number(token);
      if (!Number.isSafeInteger(arrayIndex) || arrayIndex >= current.length) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(current, token);
      if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        return undefined;
      }
      current = descriptor.value as JsonValue;
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(current, token);
    if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      return undefined;
    }
    current = descriptor.value as JsonValue;
  }

  if (current === null || typeof current !== 'object' || Array.isArray(current)) {
    return undefined;
  }
  const key = tokens[tokens.length - 1];
  const descriptor = Object.getOwnPropertyDescriptor(current, key);
  if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    return undefined;
  }
  return {
    parent: current as Record<string, JsonValue>,
    key,
    value: descriptor.value as JsonValue,
  };
}

function repairMetadataMatches(
  error: CortexelError,
  operation: AppliedSafeRepair['operation'],
): boolean {
  return error.repair?.operation === operation &&
    error.repair.path === error.instancePath &&
    error.repair.reasonCode === error.code;
}

/** Derive mutation authority from the owned value, never from diagnostic.value alone. */
function planSafeRepair(error: CortexelError, candidate: JsonValue): RepairDecision {
  if (error.code === 'CONTRACT_MISSING') {
    if (
      error.instancePath !== '/contract' ||
      !repairMetadataMatches(error, 'add') ||
      candidate === null ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate) ||
      Object.prototype.hasOwnProperty.call(candidate, 'contract')
    ) {
      return { kind: 'metadata_invalid' };
    }
    const expected = {
      name: REQUEST_CONTRACT_IDENTITY.name,
      version: REQUEST_CONTRACT_IDENTITY.version,
    };
    const supplied = error.repair?.value;
    if (
      supplied === null ||
      typeof supplied !== 'object' ||
      Array.isArray(supplied) ||
      Object.keys(supplied).length !== 2 ||
      (supplied as Record<string, unknown>).name !== expected.name ||
      (supplied as Record<string, unknown>).version !== expected.version
    ) {
      return { kind: 'metadata_invalid' };
    }
    return {
      kind: 'planned',
      plan: {
        audit: {
          operation: 'add',
          path: '/contract',
          value: expected,
          reasonCode: 'CONTRACT_MISSING',
        },
        location: {
          parent: candidate as Record<string, JsonValue>,
          key: 'contract',
          value: expected,
        },
      },
    };
  }

  if (error.code === 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL') {
    if (
      error.validatorId !== 'unit.canonical_code' ||
      !repairMetadataMatches(error, 'replace')
    ) {
      return { kind: 'metadata_invalid' };
    }
    const location = locateRepairMember(candidate, error.instancePath);
    if (location === undefined || typeof location.value !== 'string') {
      return { kind: 'metadata_invalid' };
    }
    const canonical = resolveAlias(location.value);
    if (canonical === undefined || error.repair?.value !== canonical) {
      return { kind: 'metadata_invalid' };
    }
    return {
      kind: 'planned',
      plan: {
        audit: {
          operation: 'replace',
          path: error.instancePath,
          value: canonical,
          reasonCode: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
        },
        location: { ...location, value: canonical },
      },
    };
  }

  if (error.code === 'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN') {
    if (
      error.validatorId !== 'provenance.no_caller_assurance' ||
      !repairMetadataMatches(error, 'remove')
    ) {
      return { kind: 'metadata_invalid' };
    }
    const location = locateRepairMember(candidate, error.instancePath);
    if (location === undefined || !isLibraryAuthoredField(location.key)) {
      return { kind: 'metadata_invalid' };
    }
    return {
      kind: 'planned',
      plan: {
        audit: {
          operation: 'remove',
          path: error.instancePath,
          reasonCode: 'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN',
        },
        location,
      },
    };
  }

  return { kind: 'not_allowlisted' };
}

function applyPlannedRepair(plan: PlannedSafeRepair): void {
  if (plan.audit.operation === 'remove') {
    if (!delete plan.location.parent[plan.location.key]) {
      throw new Error('safe repair could not remove an owned member');
    }
    return;
  }
  Object.defineProperty(plan.location.parent, plan.location.key, {
    value: plan.location.value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function immutableRepairAudit(
  repairs: readonly AppliedSafeRepair[],
): readonly AppliedSafeRepair[] {
  return deepFreeze(repairs.map((repair) => ({
    ...repair,
    ...('value' in repair ? { value: repair.value } : {}),
  })));
}

function failure(
  outcome: Extract<ValidationOutcome, { readonly ok: false }>,
  sourceInputAssurance: InputAssurance,
  applied: readonly AppliedSafeRepair[],
  extra: readonly CortexelError[] = [],
): SafeRepairOutcome {
  return {
    ok: false,
    errors: extra.length === 0
      ? outcome.errors
      : finalizeErrorsWithPriority(outcome.errors, extra),
    inputAssurance: outcome.inputAssurance,
    sourceInputAssurance,
    appliedRepairs: immutableRepairAudit(applied),
  };
}

function revalidateCandidate(
  candidate: JsonValue,
  rawBoundary: boolean,
  budgetProfile: string,
): ValidationOutcome {
  const profile = budgetProfile as BudgetProfileId;
  return rawBoundary
    ? parseAndValidateRequest(canonicalize(candidate), { budgetProfile: profile })
    : validateRequestValue(candidate, { budgetProfile: profile });
}

/**
 * Apply only the closed semantics-preserving subset and revalidate from stage one.
 *
 * Strings are raw JSON. All other inputs use the materialized-value boundary. One owned
 * snapshot is acquired before diagnostics are derived, so caller mutation cannot swap a
 * different tree under the repair planner. Raw candidates are canonically serialized
 * and reparsed after each batch, retaining duplicate-key-aware final assurance.
 */
export function applySafeRepairs(
  input: unknown,
  options: ValidateOptions = {},
): SafeRepairOutcome {
  const rawBoundary = typeof input === 'string';
  const captured = rawBoundary
    ? captureRawRequestInput(input, options)
    : captureMaterializedRequestInput(input, options);
  const applied: AppliedSafeRepair[] = [];
  if (!captured.ok) {
    return {
      ok: false,
      errors: captured.errors,
      inputAssurance: captured.assurance,
      sourceInputAssurance: captured.assurance,
      appliedRepairs: immutableRepairAudit(applied),
    };
  }

  const candidate = captured.value;
  let outcome: ValidationOutcome;
  try {
    outcome = revalidateCandidate(
      candidate,
      rawBoundary,
      captured.assurance.budgetProfile,
    );
  } catch {
    return {
      ok: false,
      errors: [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        message: 'the owned request snapshot could not enter the repair-validation boundary.',
      })],
      inputAssurance: captured.assurance,
      sourceInputAssurance: captured.assurance,
      appliedRepairs: immutableRepairAudit(applied),
    };
  }
  if (outcome.ok) {
    return {
      ok: true,
      request: outcome.request,
      sourceInputAssurance: captured.assurance,
      appliedRepairs: immutableRepairAudit(applied),
    };
  }

  const appliedKeys = new Set<string>();
  while (!outcome.ok) {
    const plans = new Map<string, PlannedSafeRepair>();
    let invalidMetadata = false;
    for (const error of outcome.errors) {
      const decision = planSafeRepair(error, candidate);
      if (decision.kind === 'not_allowlisted') continue;
      if (decision.kind === 'metadata_invalid') {
        invalidMetadata = true;
        continue;
      }
      const plan = decision.plan;
      const key = `${plan.audit.operation}\u0000${plan.audit.path}\u0000${plan.audit.reasonCode}`;
      const prior = plans.get(key);
      if (prior !== undefined) {
        if (canonicalize(prior.audit) !== canonicalize(plan.audit)) invalidMetadata = true;
        continue;
      }
      if (appliedKeys.has(key)) invalidMetadata = true;
      plans.set(key, plan);
    }

    if (invalidMetadata) {
      return failure(outcome, captured.assurance, applied, [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        message:
          'an allow-listed diagnostic did not reproduce one exact safe correction from the owned request snapshot.',
      })]);
    }
    if (plans.size === 0) return failure(outcome, captured.assurance, applied);

    const repairLimit = getBudgetLimits(
      captured.assurance.budgetProfile as BudgetProfileId,
    ).safeRepairOperations;
    if (applied.length + plans.size > repairLimit) {
      return failure(outcome, captured.assurance, applied, [makeError({
        code: 'RESOURCE_BUDGET_EXCEEDED',
        stage: 'budget',
        message:
          'the closed safe-repair operation budget was exceeded; no validated output was returned.',
        limit: {
          name: 'safeRepairOperations',
          limit: repairLimit,
          observed: applied.length + plans.size,
        },
      })]);
    }

    try {
      for (const [key, plan] of plans) {
        applyPlannedRepair(plan);
        appliedKeys.add(key);
        applied.push(plan.audit);
      }
    } catch {
      return failure(outcome, captured.assurance, applied, [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        message:
          'a preflighted safe repair could not be applied to Cortexel\'s private snapshot.',
      })]);
    }

    const priorFailure = outcome;
    try {
      outcome = revalidateCandidate(
        candidate,
        rawBoundary,
        captured.assurance.budgetProfile,
      );
    } catch {
      return failure(priorFailure, captured.assurance, applied, [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        message: 'the repaired owned snapshot could not re-enter the request boundary.',
      })]);
    }
  }

  return {
    ok: true,
    request: outcome.request,
    sourceInputAssurance: captured.assurance,
    appliedRepairs: immutableRepairAudit(applied),
  };
}
