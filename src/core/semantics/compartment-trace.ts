/**
 * Scientific identity rules for a compartment trace.
 *
 * A series identity is the ordered pair (compartmentId, signalId). It is kept as
 * two map levels rather than serialized with a delimiter: identifiers may contain
 * every plausible delimiter, so `("a:b", "c")` and `("a", "b:c")` must remain
 * distinct.
 */

import { makeError, pointer, type CortexelError } from '../errors.js';
import {
  asArray,
  asRecord,
  getData,
  type SemanticContext,
  type SemanticValidator,
} from './types.js';

const VALIDATOR_ID = 'compartment_trace.series_identity_declared';

/**
 * Bind every recorded series to the declared compartment universe and require one
 * unambiguous record per exact (compartmentId, signalId) identity.
 */
export const compartmentTraceSeriesIdentityDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  if (context.skillId !== 'neuro.compartment_trace') return [];

  const data = getData(context);
  const compartmentIds = asArray(data.compartmentIds);
  const series = asArray(data.series);
  if (compartmentIds === undefined || series === undefined) return [];

  const universe = new Set<string>();
  for (const compartmentId of compartmentIds) {
    if (typeof compartmentId === 'string') universe.add(compartmentId);
  }

  const firstOrdinalByIdentity = new Map<string, Map<string, number>>();
  const errors: CortexelError[] = [];

  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const entry = asRecord(series[seriesIndex]);
    if (entry === undefined) continue;

    const compartmentId = entry.compartmentId;
    const signalId = entry.signalId;
    if (typeof compartmentId !== 'string' || typeof signalId !== 'string') continue;

    if (!universe.has(compartmentId)) {
      errors.push(
        makeError({
          code: 'SEMANTIC_UNKNOWN_REFERENCE',
          stage: 'semantic',
          instancePath: pointer('data', 'series', seriesIndex, 'compartmentId'),
          validatorId: VALIDATOR_ID,
          message:
            'this series refers to a compartmentId absent from data.compartmentIds. Cortexel does not add a recorded compartment to the declared row universe implicitly.',
        }),
      );
    }

    let firstOrdinalBySignal = firstOrdinalByIdentity.get(compartmentId);
    if (firstOrdinalBySignal === undefined) {
      firstOrdinalBySignal = new Map<string, number>();
      firstOrdinalByIdentity.set(compartmentId, firstOrdinalBySignal);
    }

    const firstOrdinal = firstOrdinalBySignal.get(signalId);
    if (firstOrdinal !== undefined) {
      errors.push(
        makeError({
          code: 'SEMANTIC_DUPLICATE_ID',
          stage: 'semantic',
          instancePath: pointer('data', 'series', seriesIndex, 'signalId'),
          validatorId: VALIDATOR_ID,
          message:
            `this exact (compartmentId, signalId) identity already belongs to data.series/${firstOrdinal}. ` +
            'One scientific identity cannot name two recordings, because row, mark, and table binding would become ambiguous.',
        }),
      );
    } else {
      firstOrdinalBySignal.set(signalId, seriesIndex);
    }
  }

  return errors;
};
