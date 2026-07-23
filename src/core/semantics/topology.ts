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
  MatrixDerivationError,
  deriveWeightMatrix,
  type MatrixAggregation,
  type MatrixScope,
  type MatrixTopologyInput,
} from '../../analysis/matrices.js';
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
import { legalKnownUnit } from './units.js';

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
      const numericRanks = merged.filter(
        (rank): rank is number => typeof rank === 'number' && Number.isSafeInteger(rank),
      );
      const ranks = new Set(numericRanks);
      const inRange = [...ranks].filter((rank) => rank >= 0 && rank < worldSize);
      const outOfRange = [...ranks].filter((rank) => rank < 0 || rank >= worldSize);
      const missingCount = Math.max(0, worldSize - inRange.length);

      if (missingCount > 0) {
        // Produce at most eight examples without iterating to worldSize. Work is bounded by
        // the supplied rank list even for a hostile declaration near the structural cap.
        const sorted = inRange.sort((a, b) => a - b);
        const missing: number[] = [];
        let expected = 0;
        for (const rank of sorted) {
          while (expected < rank && missing.length < 8) missing.push(expected++);
          expected = rank + 1;
          if (missing.length >= 8) break;
        }
        while (expected < worldSize && missing.length < 8) missing.push(expected++);

        errors.push(
          makeError({
            code: 'SCOPE_MERGE_INCOMPLETE',
            stage: 'scope',
            instancePath: pointer('data', 'scope', 'mergedRanks'),
            validatorId: 'topology.scope_supports_claim',
            message: `this claims a global merge of a ${worldSize}-rank run, but ${missingCount} rank${missingCount === 1 ? ' is' : 's are'} missing${missing.length > 0 ? ` (first: ${missing.join(', ')}${missingCount > missing.length ? ', ...' : ''})` : ''}. A partial rank set stays partial; it cannot be upgraded to a global claim by declaring one.`,
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

      if (outOfRange.length > 0) {
        errors.push(
          makeError({
            code: 'SCOPE_MERGE_CONFLICT',
            stage: 'scope',
            instancePath: pointer('data', 'scope', 'mergedRanks'),
            validatorId: 'topology.scope_supports_claim',
            message: `${outOfRange.length} merged rank${outOfRange.length === 1 ? ' is' : 's are'} outside the valid range 0..${worldSize - 1} (first: ${outOfRange.slice(0, 8).join(', ')}). Extra ranks are a merge conflict, not evidence of global coverage.`,
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
    const key = `${target}\u0000${source}`;
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

/**
 * Matrix-only laws that cannot be represented by the closed request schemas alone.
 *
 * Most importantly, NEST's rank-local SynapseCollection authority is target-owned.
 * The edge rows cannot reveal which zero-input targets this rank owns, so the caller
 * must declare exactly one owned-target set.  Every returned edge target must belong
 * to it; every empty owned row is observed absence; every non-owned row is unknown.
 */
export const topologyMatrixContract: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  if (
    context.skillId !== 'network.adjacency_matrix' &&
    context.skillId !== 'network.weight_matrix' &&
    context.skillId !== 'network.delay_matrix'
  ) return [];

  const data = getData(context);
  const parameters = getParameters(context);
  const scope = asRecord(data.scope);
  const universeIds = asArray(asRecord(data.nodeUniverse)?.ids);
  const connections = asRecord(data.connections);
  const sourceIds = asArray(connections?.sourceIds);
  const targetIds = asArray(connections?.targetIds);
  if (!scope || !universeIds || !sourceIds || !targetIds) return [];

  const nodeIds = universeIds.filter((value): value is string => typeof value === 'string');
  const sources = sourceIds.filter((value): value is string => typeof value === 'string');
  const targets = targetIds.filter((value): value is string => typeof value === 'string');
  if (
    nodeIds.length !== universeIds.length ||
    sources.length !== sourceIds.length ||
    targets.length !== targetIds.length
  ) return [];

  const kind = asString(scope.kind);
  const observedRaw = asArray(data.observedTargetIds);
  const observed = observedRaw?.filter((value): value is string => typeof value === 'string');
  const errors: CortexelError[] = [];

  if (kind === 'mpi_target_rank_local') {
    if (scope.localTargetUniverseComplete !== true) {
      errors.push(makeError({
        code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
        stage: 'scope',
        instancePath: pointer('data', 'scope', 'localTargetUniverseComplete'),
        validatorId: 'topology.matrix_contract',
        message:
          'a rank-local matrix requires localTargetUniverseComplete: true. Otherwise even an owned target cell may be missing multapses, so multiplicity, weight, and delay aggregates are not established.',
      }));
    }
    if (!observed || observed.length !== (observedRaw?.length ?? 0)) {
      errors.push(makeError({
        code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
        stage: 'scope',
        instancePath: pointer('data', 'observedTargetIds'),
        validatorId: 'topology.matrix_contract',
        message:
          'a target-rank-local matrix requires the exact observedTargetIds set owned by this rank. The set may be empty; connection rows cannot reveal a locally owned target with zero incoming connections.',
      }));
    } else {
      const universe = new Set(nodeIds);
      const owned = new Set(observed);
      for (let index = 0; index < observed.length && errors.length < 8; index++) {
        if (!universe.has(observed[index])) {
          errors.push(makeError({
            code: 'SEMANTIC_UNKNOWN_REFERENCE',
            stage: 'semantic',
            instancePath: pointer('data', 'observedTargetIds', index),
            validatorId: 'topology.matrix_contract',
            message:
              'an observed target is outside the declared ordered node universe. Cortexel never extends an axis from an observability claim.',
          }));
        }
      }
      for (let index = 0; index < targets.length && errors.length < 8; index++) {
        if (!owned.has(targets[index])) {
          errors.push(makeError({
            code: 'SCOPE_MERGE_CONFLICT',
            stage: 'scope',
            instancePath: pointer('data', 'connections', 'targetIds', index),
            validatorId: 'topology.matrix_contract',
            message:
              'a connection returned by a target-rank-local snapshot targets a node not declared as owned by this rank. The connection rows and target-ownership authority contradict each other.',
          }));
        }
      }
    }
  } else if (observedRaw !== undefined) {
    errors.push(makeError({
      code: 'SCOPE_MERGE_CONFLICT',
      stage: 'scope',
      instancePath: pointer('data', 'observedTargetIds'),
      validatorId: 'topology.matrix_contract',
      message:
        'observedTargetIds is legal only for mpi_target_rank_local. Complete scopes derive every row as observed; sampled scope derives no empty row as observed, so a second caller-authored set would create conflicting authority.',
    }));
  }

  if (kind === 'sampled') {
    const retained = asNumber(scope.retainedConnectionCount);
    if (retained !== undefined && retained !== sources.length) {
      errors.push(makeError({
        code: 'SCOPE_MERGE_CONFLICT',
        stage: 'scope',
        instancePath: pointer('data', 'scope', 'retainedConnectionCount'),
        validatorId: 'topology.matrix_contract',
        message: `the sampled scope says it retained ${retained} connections, but the request contains ${sources.length} connection rows. The redundant conservation claim must agree exactly.`,
      }));
    }
    if (
      context.skillId !== 'network.adjacency_matrix' ||
      asString(parameters.cellMode) !== 'binary_presence'
    ) {
      errors.push(makeError({
        code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
        stage: 'scope',
        instancePath: pointer('data', 'scope', 'kind'),
        validatorId: 'topology.matrix_contract',
        message:
          'a sample can prove that a retained connection exists, but cannot establish a cell multiplicity or a complete weight/delay aggregate. Only adjacency binary_presence accepts sampled scope.',
      }));
    }
    if (
      context.skillId === 'network.adjacency_matrix' &&
      asString(parameters.multapseAggregation) !== 'sum'
    ) {
      errors.push(makeError({
        code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
        stage: 'scope',
        instancePath: pointer('parameters', 'multapseAggregation'),
        validatorId: 'topology.matrix_contract',
        message:
          'sampled binary presence requires sum over retained rows. no_aggregation would claim that the full network cell has at most one connection, which an incomplete sample cannot establish even when it retained only one row.',
      }));
    }
  }

  if (context.skillId === 'network.adjacency_matrix') {
    const aggregation = asString(parameters.multapseAggregation);
    if (aggregation !== 'sum' && aggregation !== 'no_aggregation') {
      errors.push(makeError({
        code: 'SCIENCE_AGGREGATION_REQUIRED',
        stage: 'science',
        instancePath: pointer('parameters', 'multapseAggregation'),
        validatorId: 'topology.matrix_contract',
        message:
          'adjacency accepts only sum (exact connection-row multiplicity, with binary paint clamped to presence) or no_aggregation (an assertion of at most one row per cell). Mean, min, and max would be accepted fields with no distinct scientific role.',
      }));
    }
  }

  // Derive every structurally coherent weight matrix here as well as in the renderer.
  // This keeps exact-sum overflow and false no-aggregation claims inside the no-throw
  // validation boundary. A diverging map is meaningful only when the COMPLETE valued
  // cell aggregates, not merely hidden raw contributors, straddle its centre.
  if (context.skillId === 'network.weight_matrix') {
    const colorScale = asRecord(parameters.colorScale);
    const center = asNumber(colorScale?.center);
    const weightsRaw = asArray(asRecord(connections?.weights)?.values);
    const aggregation = asString(parameters.multapseAggregation) as MatrixAggregation | undefined;
    const edgeIdsRaw = asArray(connections?.edgeIds);
    const modelsRaw = asArray(connections?.synapseModels);
    const edgeIds = edgeIdsRaw?.filter((value): value is string => typeof value === 'string');
    const models = modelsRaw?.filter((value): value is string => typeof value === 'string');
    const weights = weightsRaw?.filter(
      (value): value is number | null => value === null || (typeof value === 'number' && Number.isFinite(value)),
    );
    const supportedAggregation = aggregation === 'sum' || aggregation === 'mean' ||
      aggregation === 'min' || aggregation === 'max' || aggregation === 'no_aggregation';
    if (
      weights && weights.length === (weightsRaw?.length ?? -1) &&
      supportedAggregation &&
      sources.length === targets.length &&
      weights.length === sources.length &&
      (!edgeIdsRaw || edgeIds?.length === edgeIdsRaw.length) &&
      (!modelsRaw || models?.length === modelsRaw.length)
    ) {
      const matrixInput: MatrixTopologyInput = {
        nodeIds,
        sourceIds: sources,
        targetIds: targets,
        ...(edgeIds ? { edgeIds } : {}),
        ...(models ? { synapseModels: models } : {}),
        scope: scope as unknown as MatrixScope,
        ...(observed ? { observedTargetIds: observed } : {}),
      };
      try {
        const matrix = deriveWeightMatrix(matrixInput, weights, aggregation);
        if (asString(colorScale?.class) === 'diverging' && center !== undefined) {
          const aggregates = matrix.presentCells.flatMap((cell) =>
            cell.aggregate === null ? [] : [cell.aggregate]);
          if (
            !aggregates.some((value) => value < center) ||
            !aggregates.some((value) => value > center)
          ) {
            errors.push(makeError({
              code: 'RENDER_DIVERGING_SCALE_NO_CENTER',
              stage: 'render',
              instancePath: pointer('parameters', 'colorScale', 'center'),
              validatorId: 'topology.matrix_contract',
              message:
                'the complete valued cell aggregates do not lie strictly on both sides of the declared diverging centre. A hidden raw contributor on the other side cannot justify a two-sided colour claim when the painted aggregates are one-sided.',
            }));
          }
        }
      } catch (error) {
        // Other registered validators own malformed topology and scope. Preserve typed
        // science failures that would otherwise escape or be rediscovered only at paint.
        if (!(error instanceof MatrixDerivationError)) throw error;
        if (
          error.code === 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE' ||
          error.code === 'SCIENCE_AGGREGATION_REQUIRED'
        ) {
          errors.push(makeError({
            code: error.code,
            stage: 'science',
            instancePath: error.code === 'SCIENCE_AGGREGATION_REQUIRED'
              ? pointer('parameters', 'multapseAggregation')
              : pointer('data', 'connections', 'weights', 'values'),
            validatorId: 'topology.matrix_contract',
            message: error.code === 'SCIENCE_AGGREGATION_REQUIRED'
              ? error.message
              : `the requested cell aggregate is not representable as finite binary64: ${error.message}`,
          }));
        }
      }
    }
  }

  return errors;
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

  const xUnit = legalKnownUnit(asRecord(positions.x));
  const yUnit = legalKnownUnit(asRecord(positions.y));
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

/** Positions cover exactly the universe, whose optional groups form a disjoint subpartition. */
export const spatialPositionCoverageComplete: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const nodeUniverse = asRecord(data.nodeUniverse);
  const ids = asArray(nodeUniverse?.ids);
  const positions = asRecord(data.positions);
  if (!ids || !positions) return [];

  const positionIds = asArray(positions.nodeIds);
  const xs = asArray(asRecord(positions.x)?.values);
  if (!positionIds || !xs) return [];

  if (positionIds.length !== xs.length) return [];

  const universe = new Set(ids.filter((id): id is string => typeof id === 'string'));
  const errors = checkReferencesInUniverse(
    positionIds,
    universe,
    ['data', 'positions', 'nodeIds'],
    'spatial.position_coverage_complete',
    'the declared node universe',
  );
  const positioned = new Set(positionIds.filter((id): id is string => typeof id === 'string'));
  const missing = ids.filter((id) => typeof id === 'string' && !positioned.has(id));

  if (missing.length > 0) {
    errors.push(
      makeError({
        code: 'SCOPE_POSITION_COVERAGE_INCOMPLETE',
        stage: 'scope',
        instancePath: pointer('data', 'positions', 'nodeIds'),
        validatorId: 'spatial.position_coverage_complete',
        message: `${missing.length} of ${ids.length} nodes in the universe have no declared position (for example "${String(missing[0])}"). Supply them, or narrow the selection. A node with no position is never placed at the origin — that would invent a measurement.`,
      }),
    );
  }

  const groups = asArray(nodeUniverse?.groups);
  if (!groups) return errors;
  const seenGroupIds = new Map<string, number>();
  const memberGroup = new Map<string, { readonly groupId: string; readonly groupIndex: number }>();
  for (let groupIndex = 0; groupIndex < groups.length && errors.length < 16; groupIndex++) {
    const group = asRecord(groups[groupIndex]);
    if (!group) continue;
    const groupId = asString(group.id);
    if (groupId !== undefined) {
      const firstGroupIndex = seenGroupIds.get(groupId);
      if (firstGroupIndex !== undefined) {
        errors.push(makeError({
          code: 'SEMANTIC_DUPLICATE_ID',
          stage: 'semantic',
          instancePath: pointer('data', 'nodeUniverse', 'groups', groupIndex, 'id'),
          validatorId: 'spatial.position_coverage_complete',
          message: `group id "${groupId}" already appears at group index ${firstGroupIndex}. Group order, legend identity, and marker styling require unique group ids.`,
        }));
      } else {
        seenGroupIds.set(groupId, groupIndex);
      }
    }
    const members = asArray(group.memberIds);
    if (!members) continue;
    for (let memberIndex = 0; memberIndex < members.length && errors.length < 16; memberIndex++) {
      const member = members[memberIndex];
      if (typeof member !== 'string') continue;
      const memberPath = pointer(
        'data',
        'nodeUniverse',
        'groups',
        groupIndex,
        'memberIds',
        memberIndex,
      );
      if (!universe.has(member)) {
        errors.push(makeError({
          code: 'SEMANTIC_UNKNOWN_REFERENCE',
          stage: 'semantic',
          instancePath: memberPath,
          validatorId: 'spatial.position_coverage_complete',
          message: `group ${JSON.stringify(groupId)} names node "${member}", which is outside the declared node universe. Groups partition that universe; they never extend it.`,
        }));
        continue;
      }
      const previous = memberGroup.get(member);
      if (previous) {
        errors.push(makeError({
          code: 'SEMANTIC_DUPLICATE_ID',
          stage: 'semantic',
          instancePath: memberPath,
          validatorId: 'spatial.position_coverage_complete',
          message: previous.groupIndex === groupIndex
            ? `node "${member}" is repeated within group ${JSON.stringify(groupId)}. One group membership is one identity binding, not a multiplicity.`
            : `node "${member}" belongs to both group ${JSON.stringify(previous.groupId)} and group ${JSON.stringify(groupId)}. Group colour, marker shape, and legend membership require disjoint groups.`,
        }));
      } else if (groupId !== undefined) {
        memberGroup.set(member, { groupId, groupIndex });
      }
    }
  }

  return errors;
};
