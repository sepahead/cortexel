/**
 * Network topology semantics.
 *
 * The rule this file exists for:
 *
 *   Under NEST's MPI execution, `GetConnections` on a rank returns the connections
 *   whose TARGET that rank owns. So a rank-local snapshot contains every connection
 *   INTO its local targets — and therefore supports a complete local IN-degree.
 *
 *   It does not, and cannot, support an OUT-degree. The connections leaving a local
 *   source and arriving at a target owned by another rank live on that other rank.
 *   A rank-local out-degree is not "approximately right" or "a subset"; it is a
 *   number computed from the wrong set, and the neurons whose targets happen to be
 *   remote will appear to have fewer outgoing connections than they have.
 *
 * Nothing about the data's SHAPE reveals this. The arrays look identical. Only the
 * declared scope distinguishes them, which is why scope is mandatory and why it can
 * never be inferred.
 */

import { makeError, pointer, type CortexelError } from '../errors.js';
import { axesAreCompatible } from '../units.js';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  getData,
  getParameters,
  type SemanticContext,
  type SemanticValidator,
} from './types.js';
import { checkReferencesInUniverse } from './structure.js';

export const topologyScopeDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const scope = asRecord(getData(context).scope);
  if (scope && asString(scope.kind) !== undefined) return [];

  return [
    makeError({
      code: 'SCOPE_REQUIRED',
      stage: 'scope',
      instancePath: pointer('data', 'scope'),
      validatorId: 'topology.scope_declared',
      message:
        'a network figure must declare its scope. A connection snapshot with no scope cannot be interpreted: nothing in the arrays distinguishes a complete network from one rank’s view of it.',
    }),
  ];
};

/**
 * Does the declared scope actually support the claim this figure makes?
 *
 * This is the check that refuses to draw a global out-degree from a rank-local
 * snapshot — the failure that would otherwise be completely invisible.
 */
export const topologyScopeSupportsClaim: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);
  const scope = asRecord(data.scope);
  if (!scope) return [];

  const kind = asString(scope.kind);
  const errors: CortexelError[] = [];

  if (kind === 'mpi_target_rank_local') {
    const rank = asNumber(scope.rank);
    const worldSize = asNumber(scope.worldSize);

    if (rank !== undefined && worldSize !== undefined && rank >= worldSize) {
      errors.push(
        makeError({
          code: 'SCOPE_MERGE_CONFLICT',
          stage: 'scope',
          instancePath: pointer('data', 'scope', 'rank'),
          validatorId: 'topology.scope_supports_claim',
          message: `rank ${rank} is not valid in a world of size ${worldSize}.`,
        }),
      );
    }

    // THE rule.
    const direction = asString(parameters.direction);
    if (context.skillId === 'network.degree_distribution' && direction === 'out') {
      errors.push(
        makeError({
          code: 'SCOPE_OUT_DEGREE_FROM_RANK_LOCAL',
          stage: 'scope',
          instancePath: pointer('parameters', 'direction'),
          validatorId: 'topology.scope_supports_claim',
          message:
            'an out-degree cannot be computed from a target-rank-local snapshot. This rank holds the connections whose TARGET it owns, so the connections leaving a local source for a remote target are on another rank entirely. In-degree is complete here; out-degree is not merely incomplete, it is computed from the wrong set. Merge every rank and declare global_merged.',
          repair: {
            operation: 'replace',
            path: pointer('parameters', 'direction'),
            value: 'in',
            reasonCode: 'SCOPE_OUT_DEGREE_FROM_RANK_LOCAL',
          },
        }),
      );
    }

    if (scope.localTargetUniverseComplete === false && context.skillId === 'network.degree_distribution') {
      errors.push(
        makeError({
          code: 'SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL',
          stage: 'scope',
          instancePath: pointer('data', 'scope', 'localTargetUniverseComplete'),
          validatorId: 'topology.scope_supports_claim',
          message:
            'the local target universe is declared incomplete, so even a local in-degree cannot be established: a target with no observed incoming connection may simply not have been captured.',
        }),
      );
    }
  }

  if (kind === 'global_merged') {
    const worldSize = asNumber(scope.worldSize);
    const merged = asArray(scope.mergedRanks);

    if (worldSize !== undefined && merged) {
      const ranks = new Set(merged.filter((r): r is number => typeof r === 'number'));

      const missing: number[] = [];
      for (let r = 0; r < worldSize; r++) {
        if (!ranks.has(r)) missing.push(r);
      }

      if (missing.length > 0) {
        errors.push(
          makeError({
            code: 'SCOPE_MERGE_INCOMPLETE',
            stage: 'scope',
            instancePath: pointer('data', 'scope', 'mergedRanks'),
            validatorId: 'topology.scope_supports_claim',
            message: `this claims a global merge of a ${worldSize}-rank run, but rank${missing.length > 1 ? 's' : ''} ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', ...' : ''} ${missing.length > 1 ? 'are' : 'is'} missing. A partial rank set stays partial; it cannot be upgraded to a global claim by declaring one.`,
          }),
        );
      }

      if (ranks.size !== merged.length) {
        errors.push(
          makeError({
            code: 'SCOPE_MERGE_CONFLICT',
            stage: 'scope',
            instancePath: pointer('data', 'scope', 'mergedRanks'),
            validatorId: 'topology.scope_supports_claim',
            message:
              'a rank appears more than once in the merge. Merging one rank twice would double-count every connection it owns.',
          }),
        );
      }
    }
  }

  if (kind === 'sampled') {
    const source = asNumber(scope.sourceConnectionCount);
    const retained = asNumber(scope.retainedConnectionCount);

    if (source !== undefined && retained !== undefined && retained > source) {
      errors.push(
        makeError({
          code: 'SCOPE_MERGE_CONFLICT',
          stage: 'scope',
          instancePath: pointer('data', 'scope', 'retainedConnectionCount'),
          validatorId: 'topology.scope_supports_claim',
          message: `a sample cannot retain more connections (${retained}) than its source had (${source}).`,
        }),
      );
    }

    // A degree distribution over a sample is a distribution of nothing: the sampling
    // itself changes every degree, in a way that depends on how the sample was drawn.
    if (context.skillId === 'network.degree_distribution') {
      errors.push(
        makeError({
          code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
          stage: 'scope',
          instancePath: pointer('data', 'scope', 'kind'),
          validatorId: 'topology.scope_supports_claim',
          message:
            'a degree distribution cannot be computed from a sampled snapshot. Sampling removes edges, so every degree it reports is lower than the real one — and by an amount that depends on how the sample was drawn. This is refused rather than disclosed.',
        }),
      );
    }
  }

  return errors;
};

/**
 * A figure whose meaning depends on isolates must declare its node universe.
 *
 * An edge list can prove that an edge exists. It can never prove that one does not:
 * a node absent from the edge list might have degree zero, or might simply not have
 * been mentioned. Those are different facts and only the caller knows which.
 */
export const topologyNodeUniverseDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const universe = asRecord(data.nodeUniverse);

  if (!universe) {
    return [
      makeError({
        code: 'SCOPE_NODE_UNIVERSE_REQUIRED',
        stage: 'scope',
        instancePath: pointer('data', 'nodeUniverse'),
        validatorId: 'topology.node_universe_declared',
        message:
          'this figure needs a declared node universe. An edge list can show that an edge exists but never that one does not: a node missing from it may have degree zero, or may simply not have been listed. Only the caller knows which.',
      }),
    ];
  }

  if (universe.complete === false) {
    return [
      makeError({
        code: 'SCOPE_NODE_UNIVERSE_REQUIRED',
        stage: 'scope',
        instancePath: pointer('data', 'nodeUniverse', 'complete'),
        validatorId: 'topology.node_universe_declared',
        message:
          'the node universe is declared incomplete, so no zero-degree or isolate claim can be made from it.',
      }),
    ];
  }

  return [];
};

export const topologyEdgeEndpointsInUniverse: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const ids = asArray(asRecord(data.nodeUniverse)?.ids);
  const connections = asRecord(data.connections);
  if (!ids || !connections) return [];

  const universe = new Set(ids.filter((id): id is string => typeof id === 'string'));
  const errors: CortexelError[] = [];

  const sources = asArray(connections.sourceIds);
  const targets = asArray(connections.targetIds);

  if (sources) {
    errors.push(
      ...checkReferencesInUniverse(
        sources,
        universe,
        ['data', 'connections', 'sourceIds'],
        'topology.edge_endpoints_in_universe',
        'the declared node universe',
      ),
    );
  }
  if (targets) {
    errors.push(
      ...checkReferencesInUniverse(
        targets,
        universe,
        ['data', 'connections', 'targetIds'],
        'topology.edge_endpoints_in_universe',
        'the declared node universe',
      ),
    );
  }

  return errors;
};

/**
 * When two connections land in one matrix cell, an aggregation must be declared.
 *
 * A multapse is not a duplicate error — NEST supports multiple connections between
 * the same pair, and they are real synapses. `no_aggregation` ASSERTS that there is
 * at most one per cell, and fails loudly if that is untrue, rather than quietly
 * keeping whichever one happened to be last in the array.
 */
export const topologyMultapseAggregationDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);

  const connections = asRecord(data.connections);
  if (!connections) return [];

  const sources = asArray(connections.sourceIds);
  const targets = asArray(connections.targetIds);
  if (!sources || !targets) return [];

  const aggregation = asString(parameters.multapseAggregation);

  // Count how many connections share an endpoint pair.
  const cells = new Map<string, number>();
  let maxPerCell = 0;
  let exampleCell = '';

  for (let i = 0; i < Math.min(sources.length, targets.length); i++) {
    const source = sources[i];
    const target = targets[i];
    if (typeof source !== 'string' || typeof target !== 'string') continue;
    const key = `${target} ${source}`;
    const next = (cells.get(key) ?? 0) + 1;
    cells.set(key, next);
    if (next > maxPerCell) {
      maxPerCell = next;
      exampleCell = `target "${target}", source "${source}"`;
    }
  }

  if (maxPerCell <= 1) return [];

  if (aggregation === undefined) {
    return [
      makeError({
        code: 'SCIENCE_AGGREGATION_REQUIRED',
        stage: 'science',
        instancePath: pointer('parameters', 'multapseAggregation'),
        validatorId: 'topology.multapse_aggregation_declared',
        message: `${maxPerCell} connections map to a single cell (${exampleCell}) and no aggregation was declared. These are multapses — real, distinct synapses — not duplicate rows. Declare sum, mean, min, or max. Cortexel never applies "last edge wins", because which edge is last depends only on array order.`,
      }),
    ];
  }

  if (aggregation === 'no_aggregation') {
    return [
      makeError({
        code: 'SCIENCE_AGGREGATION_REQUIRED',
        stage: 'science',
        instancePath: pointer('parameters', 'multapseAggregation'),
        validatorId: 'topology.multapse_aggregation_declared',
        message: `"no_aggregation" asserts at most one connection per cell, but ${maxPerCell} connections map to one (${exampleCell}). The assertion is false, so it fails rather than silently discarding ${maxPerCell - 1} real synapses.`,
      }),
    ];
  }

  return [];
};

export const topologyDelayPositive: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const delays = asArray(asRecord(asRecord(getData(context).connections)?.delays)?.values);
  if (!delays) return [];

  const errors: CortexelError[] = [];

  for (let i = 0; i < delays.length; i++) {
    const delay = delays[i];
    if (delay === null) continue;
    const value = asNumber(delay);
    if (value === undefined || value <= 0) {
      errors.push(
        makeError({
          code: 'SCIENCE_DELAY_NONPOSITIVE',
          stage: 'science',
          instancePath: pointer('data', 'connections', 'delays', 'values', i),
          validatorId: 'topology.delay_positive',
          message: `a synaptic delay must be finite and strictly positive; got ${String(delay)}. A zero delay is not physical for the supported simulators.`,
        }),
      );
      if (errors.length >= 8) break;
    }
  }

  return errors;
};

/**
 * Weights pooled into one figure must be comparable.
 *
 * A NEST weight is not a physical quantity by itself: what it MEANS depends on the
 * synapse and neuron model. In one model it acts as a current, in another as a
 * conductance. Two such numbers are not comparable because both are spelled
 * "weight", and a histogram that pools them is a histogram of nothing.
 */
export const topologyWeightGroupCompatible: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const connections = asRecord(data.connections);
  const weights = asRecord(connections?.weights);
  if (!weights) return [];

  const unit = asString(weights.unit);
  const models = asArray(connections?.synapseModels);
  if (!unit || !models) return [];

  const distinct = new Set(models.filter((m): m is string => typeof m === 'string'));

  // One unit across several models is only safe when the caller has grouped them,
  // or when there is genuinely only one model.
  if (distinct.size > 1 && asString(getParameters(context).synapseModelGroup) === undefined) {
    return [
      makeError({
        code: 'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
        stage: 'science',
        instancePath: pointer('data', 'connections', 'synapseModels'),
        validatorId: 'topology.weight_group_compatible',
        message: `weights from ${distinct.size} different synapse models (${[...distinct].slice(0, 4).join(', ')}${distinct.size > 4 ? ', ...' : ''}) are being pooled. A NEST weight's physical meaning depends on its model — in one it behaves like a current, in another like a conductance — so these numbers are not comparable. Group by model, or declare that they are genuinely comparable.`,
      }),
    ];
  }

  return [];
};

export const degreeCountingPolicyDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const parameters = getParameters(context);

  const counting = asString(parameters.countingPolicy);
  if (counting !== undefined) return [];

  return [
    makeError({
      code: 'SCIENCE_AGGREGATION_REQUIRED',
      stage: 'science',
      instancePath: pointer('parameters', 'countingPolicy'),
      validatorId: 'degree.counting_policy_declared',
      message:
        'declare whether a degree counts each CONNECTION (so two synapses between the same pair contribute 2) or each unique NEIGHBOUR (so they contribute 1). The two give different distributions, and the difference is scientific rather than cosmetic.',
    }),
  ];
};

/** Both spatial axes must carry the same dimension, or an equal aspect ratio is a lie. */
export const spatialEqualAxisUnits: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const positions = asRecord(getData(context).positions);
  if (!positions) return [];

  const xUnit = asString(asRecord(positions.x)?.unit);
  const yUnit = asString(asRecord(positions.y)?.unit);
  if (!xUnit || !yUnit) return [];

  if (!axesAreCompatible(xUnit, yUnit)) {
    return [
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('data', 'positions', 'y', 'unit'),
        validatorId: 'spatial.equal_axis_units',
        message: `the x axis is in "${xUnit}" and the y axis in "${yUnit}". A spatial map is drawn with one equal scale on both axes; if they are not the same dimension, the distances on the page mean nothing.`,
      }),
    ];
  }

  return [];
};

/** Positions must cover the node universe. A node without one is reported, not moved to the origin. */
export const spatialPositionCoverageComplete: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const ids = asArray(asRecord(data.nodeUniverse)?.ids);
  const positions = asRecord(data.positions);
  if (!ids || !positions) return [];

  const positionIds = asArray(positions.nodeIds);
  const xs = asArray(asRecord(positions.x)?.values);
  if (!positionIds || !xs) return [];

  if (positionIds.length !== xs.length) return [];

  const positioned = new Set(positionIds.filter((id): id is string => typeof id === 'string'));
  const missing = ids.filter((id) => typeof id === 'string' && !positioned.has(id));

  if (missing.length === 0) return [];

  return [
    makeError({
      code: 'SCOPE_POSITION_COVERAGE_INCOMPLETE',
      stage: 'scope',
      instancePath: pointer('data', 'positions', 'nodeIds'),
      validatorId: 'spatial.position_coverage_complete',
      message: `${missing.length} of ${ids.length} nodes in the universe have no declared position (for example "${String(missing[0])}"). Supply them, or narrow the selection. A node with no position is never placed at the origin — that would invent a measurement.`,
    }),
  ];
};
