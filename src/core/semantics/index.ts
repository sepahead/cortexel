/**
 * The semantic validator registry.
 *
 * Maps each id in `contract/registries/semantic-validators.v1.json` to a
 * hand-written function. The registry wires ids to functions; it never generates
 * algorithm code from a string, because a scientific rule that can be edited
 * without review is not a rule.
 *
 * A startup assertion checks that every registered id has an implementation. A
 * contract that references a validator nobody wrote would otherwise become a figure
 * that silently skipped a check.
 */

import { SEMANTIC_VALIDATOR_IDS } from '../../generated/registry.js';
import { SKILL_CATALOG } from '../../generated/catalog.js';
import { finalizeErrors, type CortexelError } from '../errors.js';

import type { SemanticContext, SemanticValidator } from './types.js';
import { provenanceNoCallerAssurance, provenanceNoteSafeDisplay } from './provenance.js';
import { unitCanonicalCode, unitDimensionMatch } from './units.js';
import { idsUnique, seriesEqualLength } from './structure.js';
import {
  binsStrictlyIncreasing,
  eventsSenderUniverseDeclared,
  eventsSourceClockDeclared,
  eventsTrialUniverseDeclared,
  eventsWithinWindow,
  histogramNormalizationConsistent,
  rateDenominatorPositive,
  windowValid,
} from './events.js';
import {
  correlogramEventTrainsValid,
  correlogramLagRangeValid,
  correlogramPrebinnedAxisConsistent,
  correlogramRolesDisjoint,
  correlogramStatisticDenominator,
  psthAlignmentDeclared,
} from './spikes.js';
import {
  spatialEqualAxisUnits,
  spatialPositionCoverageComplete,
  topologyEdgeEndpointsInUniverse,
  topologyMatrixContract,
  topologyMultapseAggregationDeclared,
  topologyNodeUniverseDeclared,
  topologyScopeDeclared,
  topologyScopeSupportsClaim,
} from './topology.js';
import {
  degreeCountingPolicyDeclared,
  isiWithinTrainOnly,
  isiZeroIntervalPolicy,
  rateVerifyNormalization,
  topologyDelayPositive,
  topologyWeightGroupCompatible,
} from './distributions.js';
import {
  phasePlaneDerivativeDimension,
  responseCurveEstimatorDeclared,
  traceAxisDimensionCompatible,
  traceDuplicateTimePolicy,
  uncertaintySupportedVariant,
  uncertaintyValid,
} from './uncertainty.js';
import { weightTraceObservationKindDeclared } from './weight-trace.js';
import { compartmentTraceSeriesIdentityDeclared } from './compartment-trace.js';

export type { SemanticContext, SemanticValidator } from './types.js';

export const SEMANTIC_VALIDATORS: Readonly<Record<string, SemanticValidator>> = Object.freeze({
  'provenance.no_caller_assurance': provenanceNoCallerAssurance,
  'provenance.note_safe_display': provenanceNoteSafeDisplay,

  'unit.dimension_match': unitDimensionMatch,
  'unit.canonical_code': unitCanonicalCode,

  'series.equal_length': seriesEqualLength,
  'ids.unique': idsUnique,

  'bins.strictly_increasing': binsStrictlyIncreasing,
  'window.valid': windowValid,
  'events.source_clock_declared': eventsSourceClockDeclared,
  'events.within_window': eventsWithinWindow,
  'events.sender_universe_declared': eventsSenderUniverseDeclared,
  'events.trial_universe_declared': eventsTrialUniverseDeclared,
  'rate.denominator_positive': rateDenominatorPositive,
  'rate.verify_normalization': rateVerifyNormalization,
  'histogram.normalization_consistent': histogramNormalizationConsistent,

  'isi.within_train_only': isiWithinTrainOnly,
  'isi.zero_interval_policy': isiZeroIntervalPolicy,
  'psth.alignment_declared': psthAlignmentDeclared,
  'correlogram.event_trains_valid': correlogramEventTrainsValid,
  'correlogram.lag_range_valid': correlogramLagRangeValid,
  'correlogram.prebinned_axis_consistent': correlogramPrebinnedAxisConsistent,
  'correlogram.roles_disjoint': correlogramRolesDisjoint,
  'correlogram.statistic_denominator': correlogramStatisticDenominator,

  'topology.scope_declared': topologyScopeDeclared,
  'topology.scope_supports_claim': topologyScopeSupportsClaim,
  'topology.node_universe_declared': topologyNodeUniverseDeclared,
  'topology.edge_endpoints_in_universe': topologyEdgeEndpointsInUniverse,
  'topology.matrix_contract': topologyMatrixContract,
  'topology.multapse_aggregation_declared': topologyMultapseAggregationDeclared,
  'topology.delay_positive': topologyDelayPositive,
  'topology.weight_group_compatible': topologyWeightGroupCompatible,
  'degree.counting_policy_declared': degreeCountingPolicyDeclared,

  'spatial.position_coverage_complete': spatialPositionCoverageComplete,
  'spatial.equal_axis_units': spatialEqualAxisUnits,

  'uncertainty.valid': uncertaintyValid,
  'uncertainty.supported_variant': uncertaintySupportedVariant,

  'trace.duplicate_time_policy': traceDuplicateTimePolicy,
  'trace.axis_dimension_compatible': traceAxisDimensionCompatible,
  'compartment_trace.series_identity_declared': compartmentTraceSeriesIdentityDeclared,
  'phase_plane.derivative_dimension': phasePlaneDerivativeDimension,
  'weight_trace.observation_kind_declared': weightTraceObservationKindDeclared,
  'response_curve.estimator_declared': responseCurveEstimatorDeclared,
});

/**
 * Every id the contract registers must have an implementation.
 *
 * Without this, a skill could reference a validator that does not exist and the
 * rule would simply never run — the figure would be produced, unvalidated, with no
 * indication that anything was skipped. That is the worst possible failure mode, so
 * it is a startup error rather than a silent no-op.
 */
export function assertValidatorsImplemented(): void {
  const missing = SEMANTIC_VALIDATOR_IDS.filter(
    (id) => !Object.prototype.hasOwnProperty.call(SEMANTIC_VALIDATORS, id),
  );
  if (missing.length > 0) {
    throw new Error(
      `semantic validators registered in the contract but not implemented: ${missing.join(', ')}. ` +
        'A skill referencing one of these would skip the rule entirely.',
    );
  }
}

assertValidatorsImplemented();

/** Run every semantic validator this skill's contract declares. */
export function runSemanticValidators(
  request: Record<string, unknown>,
  skillId: string,
): CortexelError[] {
  const catalog = SKILL_CATALOG[skillId];
  if (!catalog) return [];

  const errors: CortexelError[] = [];

  for (const declared of catalog.semanticValidators) {
    const validator = SEMANTIC_VALIDATORS[declared.id];
    if (!validator) continue;

    const context: SemanticContext = {
      request,
      skillId,
      ...(declared.parameters ? { parameters: declared.parameters } : {}),
    };

    errors.push(...validator(context));
  }

  return finalizeErrors(errors);
}

/**
 * The authority check, run BEFORE the schema.
 *
 * A closed schema would already reject these fields as unknown properties. That is
 * not good enough: an agent told "unknown property: validation" concludes it made a
 * typo and tries a different spelling. It needs to be told that authoring a
 * conclusion is something the contract permits nobody to do.
 */
export function checkCallerAuthority(request: Record<string, unknown>): CortexelError[] {
  return finalizeErrors([
    ...provenanceNoCallerAssurance({ request, skillId: 'unknown' }),
    ...provenanceNoteSafeDisplay({ request, skillId: 'unknown' }),
  ]);
}
