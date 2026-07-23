/**
 * Resource limits.
 *
 * The numbers live in `contract/registries/budget-profiles.v1.json` and are
 * GENERATED into `src/generated/budgets.ts`. This module is the typed door to
 * them; it holds no numbers of its own, because a limit that exists in two places
 * eventually exists at two values.
 *
 * The distinction that matters:
 *
 *   A HARD LIMIT protects the process. Input above it FAILS.
 *   A DISPLAY BUDGET controls representation. Every current stable skill selects
 *   only `none`, so input above it is refused. A future compiler may compact only
 *   through a named deterministic policy introduced with complete bound output.
 *
 * Confusing the two is how a library ends up silently truncating a dataset and
 * calling the result a figure.
 */

import {
  BUDGET_PROFILES,
  BUDGET_PROFILE_IDS,
  type BudgetProfileId,
} from '../generated/budgets.js';
import { freezeGenerated } from './deep-freeze.js';

export type { BudgetProfileId };

export interface BudgetLimits {
  readonly rawInputBytes: number;
  readonly jsonDepth: number;
  readonly jsonTotalNodes: number;
  readonly jsonStringLength: number;
  readonly jsonNumberTokenLength: number;
  readonly jsonObjectKeys: number;
  readonly jsonArrayItems: number;

  readonly observationsPerSeries: number;
  readonly observationsPerRequest: number;
  readonly graphNodes: number;
  readonly graphEdges: number;
  readonly matrixCells: number;
  readonly pairwiseOperations: number;

  readonly visibleMarks: number;
  readonly svgTextNodes: number;
  readonly svgBytes: number;
  readonly sidecarBytes: number;
  readonly returnedTableRows: number;

  readonly errorRecords: number;
}

export const DEFAULT_PROFILE: BudgetProfileId = 'standard';

/** Resolve an untrusted profile id without coercion, prototype lookup, or throwing. */
export function tryGetBudgetLimits(profile: unknown = DEFAULT_PROFILE): BudgetLimits | undefined {
  if (
    typeof profile !== 'string' ||
    !(BUDGET_PROFILE_IDS as readonly string[]).includes(profile) ||
    !Object.prototype.hasOwnProperty.call(BUDGET_PROFILES, profile)
  ) {
    return undefined;
  }
  return BUDGET_PROFILES[profile as BudgetProfileId] as unknown as BudgetLimits;
}

export function getBudgetLimits(profile: BudgetProfileId = DEFAULT_PROFILE): BudgetLimits {
  const found = tryGetBudgetLimits(profile);
  if (!found) {
    throw new Error('unknown budget profile');
  }
  return found;
}

export interface ResolvedBudgetProfile {
  readonly profile: BudgetProfileId;
  readonly limits: BudgetLimits;
}

/**
 * Select the component-wise tighter of two published profiles.
 *
 * Profiles are deliberately ordered resource envelopes. If a future registry adds two
 * incomparable profiles, this returns `undefined` rather than silently mixing them under
 * a misleading profile id. The generator/test suite then has to establish an explicit
 * composition contract first.
 */
export function trySelectTighterBudgetProfile(
  hostProfile: unknown,
  requestedProfile: unknown,
): ResolvedBudgetProfile | undefined {
  const host = tryGetBudgetLimits(hostProfile);
  const requested = tryGetBudgetLimits(requestedProfile);
  if (!host || !requested || typeof hostProfile !== 'string' || typeof requestedProfile !== 'string') {
    return undefined;
  }

  const noGreaterThan = (left: BudgetLimits, right: BudgetLimits): boolean =>
    (Object.keys(left) as (keyof BudgetLimits)[]).every((key) => left[key] <= right[key]);

  if (noGreaterThan(requested, host)) {
    return { profile: requestedProfile as BudgetProfileId, limits: requested };
  }
  if (noGreaterThan(host, requested)) {
    return { profile: hostProfile as BudgetProfileId, limits: host };
  }
  return undefined;
}

/**
 * Lower a limit. There is intentionally no way to RAISE one from here.
 *
 * A host that genuinely needs a larger ceiling must construct a separately named
 * internal profile after an explicit risk review, and the artifact it produces
 * records that non-standard profile and cannot claim default conformance. An
 * untrusted caller can never widen a bound by asking nicely.
 */
export function restrictLimits(
  base: BudgetLimits,
  overrides: Partial<BudgetLimits>,
): BudgetLimits {
  const INVALID_BASE = Symbol('invalid-base-budget');
  const out: Record<string, number> = Object.create(null);
  const limitKeys = Object.keys(BUDGET_PROFILES[DEFAULT_PROFILE]);
  try {
    for (const key of limitKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(base, key);
      const value = descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
        ? descriptor.value
        : undefined;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw INVALID_BASE;
      }
      out[key] = value;
    }
  } catch (error) {
    if (error === INVALID_BASE) {
      throw new Error('base budget limits must be own finite non-negative data properties');
    }
    throw new Error('base budget limits could not be inspected safely');
  }

  let keys: readonly PropertyKey[];
  try {
    keys = Reflect.ownKeys(overrides as object);
  } catch {
    // Proxy traps are an unavoidable property of accepting a materialized JS value.
    // A trap failure cannot widen limits or mutate the returned authority.
    return freezeGenerated(out) as unknown as BudgetLimits;
  }

  for (const key of keys) {
    if (typeof key !== 'string' || !limitKeys.includes(key)) continue;
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(overrides, key);
    } catch {
      return freezeGenerated(out) as unknown as BudgetLimits;
    }
    // Never read an accessor. Ordinary getters therefore cannot execute here.
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) continue;
    const value = descriptor.value;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
    const current = out[key];
    // min(), never max(). This is the whole point of the function.
    out[key] = Math.min(current, value);
  }
  return freezeGenerated(out) as unknown as BudgetLimits;
}
