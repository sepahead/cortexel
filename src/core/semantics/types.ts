/**
 * The semantic-validation layer.
 *
 * JSON Schema checks the SHAPE of a request. These check its MEANING — the things
 * a schema structurally cannot express: that an interval was formed within one
 * spike train and not across two; that a rate's denominator counts the neurons
 * that were recorded rather than the ones that happened to fire; that a rank-local
 * snapshot is not being used to claim a global out-degree.
 *
 * Each validator is a NAMED entry in `contract/registries/semantic-validators.v1.json`
 * wired to a hand-written function. The registry never contains an evaluable
 * expression: a scientific rule that can be edited without review is not a rule.
 *
 * A validator returns diagnostics rather than throwing, so one round trip reports
 * everything that is wrong instead of one thing at a time.
 */

import type { CortexelError } from '../errors.js';

export interface SemanticContext {
  /** The parsed/snapshotted request. Untrusted, but already structurally sane. */
  readonly request: Record<string, unknown>;
  readonly skillId: string;
  /** Parameters this skill's contract passes to this validator. */
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export type SemanticValidator = (context: SemanticContext) => CortexelError[];

/** Read a value at a JSON Pointer. Returns undefined rather than throwing. */
export function readPointer(root: unknown, jsonPointer: string): unknown {
  if (jsonPointer === '') return root;
  if (!jsonPointer.startsWith('/')) return undefined;

  let node: unknown = root;
  for (const rawToken of jsonPointer.slice(1).split('/')) {
    const token = rawToken.replace(/~1/g, '/').replace(/~0/g, '~');
    if (node === null || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) {
      const index = Number(token);
      if (!Number.isInteger(index) || index < 0 || index >= node.length) return undefined;
      node = node[index];
    } else {
      if (!Object.prototype.hasOwnProperty.call(node, token)) return undefined;
      node = (node as Record<string, unknown>)[token];
    }
  }
  return node;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Convenience: `request.data` as a record. */
export function getData(context: SemanticContext): Record<string, unknown> {
  return asRecord(context.request.data) ?? {};
}

/** Convenience: `request.parameters` as a record. */
export function getParameters(context: SemanticContext): Record<string, unknown> {
  return asRecord(context.request.parameters) ?? {};
}

/**
 * The tolerance for comparing a supplied normalized value against a re-derived one.
 *
 * Relative, with an absolute floor so that a value near zero does not demand
 * impossible precision. This is deliberately TIGHT — it exists to absorb binary64
 * rounding in a handful of operations, not to wave through a value that is merely
 * in the right neighbourhood. A rate that is 1% off is not a rounding error; it is
 * a different rate.
 */
export const NUMERIC_TOLERANCE = Object.freeze({ relative: 1e-9, absolute: 1e-12 } as const);

export function approximatelyEqual(actual: number, expected: number): boolean {
  if (actual === expected) return true;
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  const difference = Math.abs(actual - expected);
  const scale = Math.max(Math.abs(actual), Math.abs(expected));
  return difference <= Math.max(NUMERIC_TOLERANCE.absolute, NUMERIC_TOLERANCE.relative * scale);
}
