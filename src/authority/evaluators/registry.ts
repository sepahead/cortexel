/** Closed library-owned registry of canonicalRequest-only OutputAuthority evaluators. */

import type { RegisteredAuthorityEvaluatorV1 } from '../../core/output-authority.js';
import { DISTRIBUTION_AUTHORITY_EVALUATORS } from './distributions.js';
import {
  OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1,
  outputAuthorityImplementationInventoryProblemsV1,
} from './implementation-ids.js';
import { MATRIX_AUTHORITY_EVALUATORS } from './matrices.js';
import { TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS } from './topology-dynamics.js';
import { TRACE_AUTHORITY_EVALUATORS } from './traces.js';

const ALL = [
  ...TRACE_AUTHORITY_EVALUATORS,
  ...DISTRIBUTION_AUTHORITY_EVALUATORS,
  ...MATRIX_AUTHORITY_EVALUATORS,
  ...TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS,
];

/**
 * Pure registry-closure check exported only from this internal module so mutation
 * tests can prove that missing, extra, duplicate, malformed, and dangerous ids fail.
 */
export function outputAuthorityEvaluatorRegistryProblemsV1(
  evaluators: readonly { readonly id: unknown }[],
  expectedIds: readonly unknown[] = OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1,
): readonly string[] {
  const problems = [...outputAuthorityImplementationInventoryProblemsV1(expectedIds)];
  const actualIds = evaluators.map((evaluator) => evaluator.id);
  const stringActualIds = actualIds.filter((id): id is string => typeof id === 'string');
  problems.push(...outputAuthorityImplementationInventoryProblemsV1([...stringActualIds].sort()));
  actualIds.forEach((id, index) => {
    if (typeof id !== 'string') problems.push(`registered evaluator id at index ${index} is not a string`);
  });

  const expectedCounts = new Map<string, number>();
  const actualCounts = new Map<string, number>();
  for (const id of expectedIds) {
    if (typeof id === 'string') expectedCounts.set(id, (expectedCounts.get(id) ?? 0) + 1);
  }
  for (const id of stringActualIds) actualCounts.set(id, (actualCounts.get(id) ?? 0) + 1);

  for (const id of [...new Set([...expectedCounts.keys(), ...actualCounts.keys()])].sort()) {
    const expected = expectedCounts.get(id) ?? 0;
    const actual = actualCounts.get(id) ?? 0;
    if (actual < expected) {
      problems.push(`missing registered evaluator ${JSON.stringify(id)} (${expected - actual})`);
    } else if (actual > expected) {
      problems.push(`extra registered evaluator ${JSON.stringify(id)} (${actual - expected})`);
    }
  }
  return Object.freeze(problems);
}

const REGISTRY_PROBLEMS = outputAuthorityEvaluatorRegistryProblemsV1(ALL);
if (REGISTRY_PROBLEMS.length > 0) {
  throw new Error(`invalid OutputAuthority evaluator registry: ${REGISTRY_PROBLEMS.join('; ')}`);
}

const BY_ID = new Map<string, RegisteredAuthorityEvaluatorV1>();
for (const evaluator of ALL) {
  if (BY_ID.has(evaluator.id)) {
    throw new Error(`duplicate OutputAuthority evaluator id ${JSON.stringify(evaluator.id)}`);
  }
  BY_ID.set(evaluator.id, evaluator);
}

export const OUTPUT_AUTHORITY_EVALUATOR_IDS_V1 = Object.freeze(
  [...BY_ID.keys()].sort(),
);

for (const id of OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1) {
  if (BY_ID.get(id)?.id !== id) {
    throw new Error(`OutputAuthority evaluator round-trip failed for ${JSON.stringify(id)}`);
  }
}

export function resolveOutputAuthorityEvaluatorV1(
  id: string,
): RegisteredAuthorityEvaluatorV1 | null {
  return BY_ID.get(id) ?? null;
}
