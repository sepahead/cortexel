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
 *   A DISPLAY BUDGET controls representation. Input above it may be compacted —
 *   but only by a named deterministic policy that is recorded and disclosed.
 *
 * Confusing the two is how a library ends up silently truncating a dataset and
 * calling the result a figure.
 */

import { BUDGET_PROFILES, type BudgetProfileId } from '../generated/budgets.js';

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
  readonly inlineTableRows: number;

  readonly errorRecords: number;
  readonly bundlePanels: number;
}

export const DEFAULT_PROFILE: BudgetProfileId = 'standard';

export function getBudgetLimits(profile: BudgetProfileId = DEFAULT_PROFILE): BudgetLimits {
  const found = BUDGET_PROFILES[profile];
  if (!found) {
    throw new Error(`unknown budget profile: ${String(profile)}`);
  }
  return found;
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
  const out: Record<string, number> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
    const current = out[key];
    if (current === undefined) continue;
    // min(), never max(). This is the whole point of the function.
    out[key] = Math.min(current, value);
  }
  return out as unknown as BudgetLimits;
}
