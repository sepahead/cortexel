/**
 * One owned input capture for the FigureRequest validation and repair boundaries.
 *
 * Materialized callers may mutate their object concurrently or expose a Proxy. We
 * therefore inspect caller authority exactly once, then apply any request-selected
 * tighter budget to that owned JSON snapshot rather than reading the caller again.
 */

import {
  finalizeErrors,
  makeError,
  type CortexelError,
} from './errors.js';
import {
  DEFAULT_PROFILE,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile,
  type BudgetLimits,
  type BudgetProfileId,
} from './limits.js';
import { parseJsonStrict, type JsonValue } from './parse-json.js';
import { snapshotValue } from './safe-snapshot.js';

export interface InputAssurance {
  readonly boundary: 'raw_json_text' | 'materialized_value';
  readonly duplicateKeys:
    | 'rejected_before_materialization'
    | 'not_observable_after_materialization';
  readonly parserProfile: string;
  readonly budgetProfile: string;
}

export interface RequestBoundaryOptions {
  readonly budgetProfile?: BudgetProfileId;
}

export type CapturedRequestInput =
  | {
      readonly ok: true;
      readonly value: JsonValue;
      readonly assurance: InputAssurance;
    }
  | {
      readonly ok: false;
      readonly errors: readonly CortexelError[];
      readonly assurance: InputAssurance;
    };

function resolveBudgetProfile(options: RequestBoundaryOptions): {
  readonly profile: string;
  readonly limits?: BudgetLimits;
} {
  let requested: unknown = DEFAULT_PROFILE;
  try {
    if (options !== null && options !== undefined) {
      if (typeof options !== 'object') throw new Error('invalid options');
      const descriptor = Object.getOwnPropertyDescriptor(options, 'budgetProfile');
      if (descriptor !== undefined) {
        if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
          throw new Error('accessor-backed options');
        }
        requested = descriptor.value ?? DEFAULT_PROFILE;
      }
    }
  } catch {
    // A throwing Proxy or accessor is not an omission and receives no budget authority.
    requested = null;
  }

  return {
    profile: typeof requested === 'string' ? requested : '<invalid>',
    limits: tryGetBudgetLimits(requested),
  };
}

/** Read the request profile only from an already-owned plain JSON tree. */
function requestedBudgetProfile(value: JsonValue): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_PROFILE;
  }
  const presentation = (value as Record<string, unknown>).presentation;
  if (presentation === null || typeof presentation !== 'object' || Array.isArray(presentation)) {
    return DEFAULT_PROFILE;
  }
  return Object.prototype.hasOwnProperty.call(presentation, 'budgetProfile')
    ? (presentation as Record<string, unknown>).budgetProfile
    : DEFAULT_PROFILE;
}

function assuranceFor(
  boundary: InputAssurance['boundary'],
  profile: unknown,
): InputAssurance {
  return {
    boundary,
    duplicateKeys: boundary === 'raw_json_text'
      ? 'rejected_before_materialization'
      : 'not_observable_after_materialization',
    parserProfile: boundary === 'raw_json_text'
      ? 'cortexel-strict-json/1.0'
      : 'cortexel-safe-snapshot/1.0',
    budgetProfile: typeof profile === 'string' ? profile : '<invalid>',
  };
}

function fail(
  errors: readonly CortexelError[],
  assurance: InputAssurance,
): CapturedRequestInput {
  return { ok: false, errors: finalizeErrors([...errors]), assurance };
}

function invalidBudgetProfile(assurance: InputAssurance): CapturedRequestInput {
  return fail([
    makeError({
      code: 'RESOURCE_BUDGET_PROFILE_UNKNOWN',
      stage: 'budget',
      message:
        'the selected budget profile is not in this build\'s closed registry. Unknown and inherited profile ids cannot disable resource limits.',
    }),
  ], assurance);
}

export function captureRawRequestInput(
  text: unknown,
  options: RequestBoundaryOptions = {},
): CapturedRequestInput {
  const host = resolveBudgetProfile(options);
  let assurance = assuranceFor('raw_json_text', host.profile);
  if (!host.limits) return invalidBudgetProfile(assurance);

  if (typeof text !== 'string') {
    return fail([
      makeError({
        code: 'JSON_SYNTAX',
        stage: 'parse',
        message: 'the raw request boundary accepts a JSON text string only.',
      }),
    ], assurance);
  }

  let parsed = parseJsonStrict(text, { limits: host.limits });
  if (!parsed.ok) return fail(parsed.errors, assurance);

  const requested = requestedBudgetProfile(parsed.value);
  const effective = trySelectTighterBudgetProfile(host.profile, requested);
  assurance = assuranceFor('raw_json_text', effective?.profile ?? requested);
  if (!effective) return invalidBudgetProfile(assurance);

  // Strings are immutable; parsing the same bytes under a tighter budget cannot race.
  if (effective.profile !== host.profile) {
    parsed = parseJsonStrict(text, { limits: effective.limits });
    if (!parsed.ok) return fail(parsed.errors, assurance);
  }
  return { ok: true, value: parsed.value, assurance };
}

export function captureMaterializedRequestInput(
  value: unknown,
  options: RequestBoundaryOptions = {},
): CapturedRequestInput {
  const host = resolveBudgetProfile(options);
  let assurance = assuranceFor('materialized_value', host.profile);
  if (!host.limits) return invalidBudgetProfile(assurance);

  let snapshot = snapshotValue(value, host.limits);
  if (!snapshot.ok) return fail(snapshot.errors, assurance);

  const requested = requestedBudgetProfile(snapshot.value);
  const effective = trySelectTighterBudgetProfile(host.profile, requested);
  assurance = assuranceFor('materialized_value', effective?.profile ?? requested);
  if (!effective) return invalidBudgetProfile(assurance);

  if (effective.profile !== host.profile) {
    // Re-snapshot the owned JSON tree, never the concurrently mutable caller object.
    snapshot = snapshotValue(snapshot.value, effective.limits);
    if (!snapshot.ok) return fail(snapshot.errors, assurance);
  }
  return { ok: true, value: snapshot.value, assurance };
}
