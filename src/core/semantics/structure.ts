/**
 * Cross-field structural rules that JSON Schema cannot state.
 *
 * A schema can say "this is an array of numbers" and "that is an array of strings".
 * It cannot say "and they must be the same length" — which is the difference
 * between a list of spike times with senders, and a list of spike times paired with
 * whatever senders happened to be nearby.
 */

import { makeError, pointer, type CortexelError } from '../errors.js';
import {
  asArray,
  readPointer,
  type SemanticContext,
  type SemanticValidator,
} from './types.js';

/**
 * Parallel arrays that describe the same observations must have equal length.
 *
 * The skill contract supplies groups of JSON Pointers; a pointer that resolves to
 * nothing is skipped, because an optional array that is absent is not a mismatch.
 * Values are NEVER paired with times by best effort — a shorter sender array does
 * not mean "reuse the last sender", it means the export is broken.
 */
export const seriesEqualLength: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const groups = context.parameters?.groups;
  if (!Array.isArray(groups)) return [];

  const errors: CortexelError[] = [];

  for (const group of groups) {
    if (!Array.isArray(group)) continue;

    const present: { path: string; length: number }[] = [];
    for (const jsonPointer of group) {
      if (typeof jsonPointer !== 'string') continue;
      const value = readPointer(context.request, jsonPointer);
      const array = asArray(value);
      if (array === undefined) continue;
      present.push({ path: jsonPointer, length: array.length });
    }

    if (present.length < 2) continue;

    const expected = present[0];
    for (const entry of present.slice(1)) {
      if (entry.length !== expected.length) {
        errors.push(
          makeError({
            code: 'SEMANTIC_LENGTH_MISMATCH',
            stage: 'semantic',
            instancePath: entry.path,
            validatorId: 'series.equal_length',
            message: `this array has ${entry.length} entries but ${expected.path} has ${expected.length}. They describe the same observations, so they must have the same length; Cortexel does not pair values with times by best effort.`,
          }),
        );
      }
    }
  }

  return errors;
};

/**
 * Declared identifiers must be unique.
 *
 * A duplicate id has to fail BEFORE anything can bind to it. Once two nodes share
 * an id, selection, edge binding, and table lookup can each resolve it differently,
 * and the figure quietly stops being about the network the caller described.
 */
export const idsUnique: SemanticValidator = (context: SemanticContext): CortexelError[] => {
  const pointers = context.parameters?.pointers;
  if (!Array.isArray(pointers)) return [];

  const errors: CortexelError[] = [];

  for (const jsonPointer of pointers) {
    if (typeof jsonPointer !== 'string') continue;
    const array = asArray(readPointer(context.request, jsonPointer));
    if (array === undefined) continue;

    const seen = new Map<string, number>();
    for (let index = 0; index < array.length; index++) {
      const id = array[index];
      if (typeof id !== 'string') continue;

      const first = seen.get(id);
      if (first !== undefined) {
        errors.push(
          makeError({
            code: 'SEMANTIC_DUPLICATE_ID',
            stage: 'semantic',
            instancePath: `${jsonPointer}/${index}`,
            validatorId: 'ids.unique',
            message: `the id "${id}" already appears at index ${first}. An ambiguous identity must fail here, before selection or edge binding can resolve it two different ways.`,
          }),
        );
        // One error per duplicated id, not one per repetition.
        continue;
      }
      seen.set(id, index);
    }
  }

  return errors;
};

/** Every referenced id is a member of the declared universe. */
export function checkReferencesInUniverse(
  referenced: readonly unknown[],
  universe: ReadonlySet<string>,
  referencedPath: readonly (string | number)[],
  validatorId: string,
  universeDescription: string,
): CortexelError[] {
  const errors: CortexelError[] = [];
  const reported = new Set<string>();

  for (let index = 0; index < referenced.length; index++) {
    const id = referenced[index];
    if (typeof id !== 'string' || universe.has(id) || reported.has(id)) continue;
    reported.add(id);

    errors.push(
      makeError({
        code: 'SEMANTIC_UNKNOWN_REFERENCE',
        stage: 'semantic',
        instancePath: pointer(...referencedPath, index),
        validatorId,
        message: `"${id}" is not in ${universeDescription}. Cortexel does not silently extend a universe you declared complete — a member that was supposedly not there cannot have produced an observation.`,
      }),
    );

    if (reported.size >= 8) break;
  }

  return errors;
}
