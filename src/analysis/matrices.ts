/**
 * Source-derived matrix evidence.
 *
 * A matrix request supplies connection rows, never caller-authored cells.  This module
 * is the one place where those rows become Cortexel's fixed target-row/source-column
 * cells.  The derivation is deliberately stricter than a plotting helper: no parallel
 * array is truncated, no endpoint is dropped, and no absent or unobserved cell is
 * materialized as a numeric zero.
 */

import {
  exactBinary64Mean,
  exactBinary64Sum,
} from '../core/exact-binary64.js';
import { convert } from '../core/units.js';

export const MATRIX_AXIS_ORDER = 'target_rows_source_columns' as const;

export type MatrixCellEnumeration = 'present_cells_only' | 'dense';
export type MatrixCellState = 'present' | 'absent' | 'not_observed';
export type MatrixAggregation = 'sum' | 'mean' | 'min' | 'max' | 'no_aggregation';

export type MatrixScope =
  | { readonly kind: 'single_process'; readonly complete: true }
  | {
      readonly kind: 'global_merged';
      readonly worldSize: number;
      readonly mergedRanks: readonly number[];
    }
  | {
      readonly kind: 'mpi_target_rank_local';
      readonly rank: number;
      readonly worldSize: number;
      readonly localTargetUniverseComplete: boolean;
    }
  | {
      readonly kind: 'sampled';
      readonly parentScope: 'single_process' | 'global_merged' | 'mpi_target_rank_local';
      readonly sourceConnectionCount: number;
      readonly retainedConnectionCount: number;
    };

export interface MatrixTopologyInput {
  /** One complete axis universe. Its declared array order is authoritative. */
  readonly nodeIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly targetIds: readonly string[];
  readonly edgeIds?: readonly string[];
  readonly synapseModels?: readonly string[];
  readonly scope: MatrixScope;
  /** Exactly the rank-owned target rows; legal only for mpi_target_rank_local. */
  readonly observedTargetIds?: readonly string[];
  readonly enumeration?: MatrixCellEnumeration;
  /** Bound dense materialization independently of the declared node-universe ceiling. */
  readonly maximumMaterializedCells?: number;
}

export class MatrixDerivationError extends Error {
  constructor(
    readonly code:
      | 'SEMANTIC_DUPLICATE_ID'
      | 'SEMANTIC_LENGTH_MISMATCH'
      | 'SEMANTIC_UNKNOWN_REFERENCE'
      | 'SCOPE_INCOMPATIBLE_WITH_SKILL'
      | 'SCOPE_MERGE_CONFLICT'
      | 'RESOURCE_MATRIX_CELLS_EXCEEDED'
      | 'SCIENCE_AGGREGATION_REQUIRED'
      | 'SCIENCE_DELAY_NONPOSITIVE'
      | 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
    message: string,
  ) {
    super(message);
    this.name = 'MatrixDerivationError';
  }
}

export interface MatrixTopologyCell {
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly targetId: string;
  readonly sourceId: string;
  readonly state: MatrixCellState;
  /** Exact ordinals in the accepted request arrays; never synthesized edge identity. */
  readonly contributingOrdinals: readonly number[];
  /** Rows retained in this request, even when an incomplete sample cannot establish multiplicity. */
  readonly retainedConnectionRows: number;
  /** Exact full-cell count only when the declared scope completely observes this target row. */
  readonly contributingConnectionCount: number | null;
  readonly contributingEdgeIds: readonly string[] | null;
  readonly synapseModels: readonly string[] | null;
  readonly isAutapse: boolean;
  /** Whether the accepted scope contains the complete connection set for this pair. */
  readonly connectionSetComplete: boolean;
}

export interface MatrixTopologyResult {
  readonly axisOrder: typeof MATRIX_AXIS_ORDER;
  readonly nodeIds: readonly string[];
  /** Present cells only, ordered by target-row index then source-column index. */
  readonly presentCells: readonly MatrixTopologyCell[];
  /** The exact requested alternative-table enumeration. */
  readonly tableCells: readonly MatrixTopologyCell[];
  readonly connectionCount: number;
  readonly presentCellCount: number;
  readonly absentCellCount: number;
  readonly notObservedCellCount: number;
  readonly observedRowCount: number;
  readonly totalCellCount: number;
}

export interface AdjacencyMatrixCell extends MatrixTopologyCell {
  readonly cellValue: number | null;
  readonly multiplicity: number | null;
}

export interface AdjacencyMatrixResult extends Omit<MatrixTopologyResult, 'presentCells' | 'tableCells'> {
  readonly cellMode: 'binary_presence' | 'multiplicity';
  readonly multapseAggregation: 'sum' | 'no_aggregation';
  readonly presentCells: readonly AdjacencyMatrixCell[];
  readonly tableCells: readonly AdjacencyMatrixCell[];
}

export type WeightMatrixCellState =
  | 'valued'
  | 'present_with_missing_value'
  | 'present_without_value'
  | 'absent'
  | 'not_observed';

export interface WeightMatrixCell extends Omit<MatrixTopologyCell, 'state'> {
  readonly state: WeightMatrixCellState;
  readonly aggregate: number | null;
  readonly contributingWeightCount: number | null;
  readonly missingWeightCount: number | null;
  readonly weightMin: number | null;
  readonly weightMax: number | null;
}

export interface WeightMatrixResult extends Omit<MatrixTopologyResult, 'presentCells' | 'tableCells'> {
  readonly aggregation: MatrixAggregation;
  readonly presentCells: readonly WeightMatrixCell[];
  readonly tableCells: readonly WeightMatrixCell[];
  readonly valuedCellCount: number;
  readonly presentWithMissingValueCellCount: number;
  readonly presentWithoutValueCellCount: number;
}

export interface DelayMatrixCell extends MatrixTopologyCell {
  readonly delayAggregate: number | null;
  readonly delayMin: number | null;
  readonly delayMax: number | null;
  readonly displayUnit: string;
  readonly unitConversionCount: 0 | 1;
}

export interface DelayMatrixResult extends Omit<MatrixTopologyResult, 'presentCells' | 'tableCells'> {
  readonly aggregation: Exclude<MatrixAggregation, 'sum'>;
  readonly sourceUnit: string;
  readonly displayUnit: string;
  readonly presentCells: readonly DelayMatrixCell[];
  readonly tableCells: readonly DelayMatrixCell[];
}

function compareUnicodeCodePoints(left: string, right: string): number {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftPoint = left.codePointAt(leftIndex)!;
    const rightPoint = right.codePointAt(rightIndex)!;
    if (leftPoint !== rightPoint) return leftPoint < rightPoint ? -1 : 1;
    leftIndex += leftPoint > 0xffff ? 2 : 1;
    rightIndex += rightPoint > 0xffff ? 2 : 1;
  }
  if (leftIndex === left.length && rightIndex === right.length) return 0;
  return leftIndex === left.length ? -1 : 1;
}

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new MatrixDerivationError(
        'SEMANTIC_DUPLICATE_ID',
        `${label} contains duplicate id ${JSON.stringify(value)}. Matrix identity cannot be resolved by last-write-wins.`,
      );
    }
    seen.add(value);
  }
}

function assertParallelLength(
  expected: number,
  values: readonly unknown[] | undefined,
  label: string,
): void {
  if (values !== undefined && values.length !== expected) {
    throw new MatrixDerivationError(
      'SEMANTIC_LENGTH_MISMATCH',
      `${label} has ${values.length} rows but the connection endpoint arrays have ${expected}.`,
    );
  }
}

function cellKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`;
}

function canonicalStrings(values: readonly string[]): readonly string[] | null {
  if (values.length === 0) return null;
  return [...new Set(values)].sort(compareUnicodeCodePoints);
}

function aggregate(values: readonly number[], method: MatrixAggregation): number {
  if (values.length === 0) {
    throw new MatrixDerivationError(
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      'an aggregate requires at least one finite measurement',
    );
  }
  switch (method) {
    case 'sum':
      try {
        return exactBinary64Sum(values);
      } catch (error) {
        throw new MatrixDerivationError(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          error instanceof Error ? error.message : 'the exact binary64 sum is not representable',
        );
      }
    case 'mean':
      try {
        return exactBinary64Mean(values);
      } catch (error) {
        throw new MatrixDerivationError(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          error instanceof Error ? error.message : 'the exact binary64 mean is not representable',
        );
      }
    case 'min': {
      let minimum = values[0];
      for (let index = 1; index < values.length; index++) {
        if (values[index] < minimum) minimum = values[index];
      }
      return minimum === 0 ? 0 : minimum;
    }
    case 'max': {
      let maximum = values[0];
      for (let index = 1; index < values.length; index++) {
        if (values[index] > maximum) maximum = values[index];
      }
      return maximum === 0 ? 0 : maximum;
    }
    case 'no_aggregation':
      if (values.length !== 1) {
        throw new MatrixDerivationError(
          'SCIENCE_AGGREGATION_REQUIRED',
          `no_aggregation requires one connection per cell, but this cell has ${values.length}.`,
        );
      }
      return values[0] === 0 ? 0 : values[0];
  }
}

function assertAggregateMatrixScope(input: MatrixTopologyInput): void {
  if (input.scope.kind === 'sampled') {
    throw new MatrixDerivationError(
      'SCOPE_INCOMPATIBLE_WITH_SKILL',
      'a sampled connection set cannot establish a weight or delay aggregate for any cell',
    );
  }
  if (
    input.scope.kind === 'mpi_target_rank_local' &&
    input.scope.localTargetUniverseComplete !== true
  ) {
    throw new MatrixDerivationError(
      'SCOPE_INCOMPATIBLE_WITH_SKILL',
      'a rank-local aggregate matrix requires the complete incoming connection set for every owned target',
    );
  }
}

/**
 * Bind every accepted connection ordinal to exactly one target-row/source-column cell.
 *
 * Conservation law: concatenating the contributing ordinals of `presentCells` yields a
 * permutation of `0..connectionCount-1`.  The implementation establishes it by rejecting
 * every mismatched array or unknown endpoint before constructing any output cell.
 */
export function deriveMatrixTopology(input: MatrixTopologyInput): MatrixTopologyResult {
  if (input.nodeIds.length < 1) {
    throw new MatrixDerivationError(
      'SEMANTIC_UNKNOWN_REFERENCE',
      'a matrix requires a non-empty declared node universe',
    );
  }
  assertUnique(input.nodeIds, 'nodeIds');
  if (input.sourceIds.length !== input.targetIds.length) {
    throw new MatrixDerivationError(
      'SEMANTIC_LENGTH_MISMATCH',
      `sourceIds has ${input.sourceIds.length} rows but targetIds has ${input.targetIds.length}.`,
    );
  }
  const connectionCount = input.sourceIds.length;
  assertParallelLength(connectionCount, input.edgeIds, 'edgeIds');
  assertParallelLength(connectionCount, input.synapseModels, 'synapseModels');
  if (input.edgeIds) assertUnique(input.edgeIds, 'edgeIds');

  const nodeIndex = new Map(input.nodeIds.map((id, index) => [id, index]));
  let observedTargets: ReadonlySet<string>;
  if (input.scope.kind === 'mpi_target_rank_local') {
    if (!input.observedTargetIds) {
      throw new MatrixDerivationError(
        'SCOPE_INCOMPATIBLE_WITH_SKILL',
        'mpi_target_rank_local requires the exact set of rank-owned observedTargetIds (which may be empty)',
      );
    }
    assertUnique(input.observedTargetIds, 'observedTargetIds');
    for (const id of input.observedTargetIds) {
      if (!nodeIndex.has(id)) {
        throw new MatrixDerivationError(
          'SEMANTIC_UNKNOWN_REFERENCE',
          `observed target ${JSON.stringify(id)} is outside the declared node universe`,
        );
      }
    }
    observedTargets = new Set(input.observedTargetIds);
  } else {
    if (input.observedTargetIds !== undefined) {
      throw new MatrixDerivationError(
        'SCOPE_MERGE_CONFLICT',
        'observedTargetIds is caller authority only for mpi_target_rank_local; complete and sampled scopes derive observability from their discriminator',
      );
    }
    observedTargets = input.scope.kind === 'sampled'
      ? new Set<string>()
      : new Set(input.nodeIds);
  }

  if (
    input.scope.kind === 'sampled' &&
    input.scope.retainedConnectionCount !== connectionCount
  ) {
    throw new MatrixDerivationError(
      'SCOPE_MERGE_CONFLICT',
      `sampled.retainedConnectionCount is ${input.scope.retainedConnectionCount}, but the request contains ${connectionCount} connection rows`,
    );
  }
  if (input.scope.kind === 'sampled') {
    const { sourceConnectionCount, retainedConnectionCount } = input.scope;
    if (
      !Number.isSafeInteger(sourceConnectionCount) || sourceConnectionCount < 0 ||
      !Number.isSafeInteger(retainedConnectionCount) || retainedConnectionCount < 0 ||
      retainedConnectionCount > sourceConnectionCount
    ) {
      throw new MatrixDerivationError(
        'SCOPE_MERGE_CONFLICT',
        `sampled connection counts must be exact non-negative safe integers with retainedConnectionCount <= sourceConnectionCount; got source=${sourceConnectionCount}, retained=${retainedConnectionCount}`,
      );
    }
  }

  const contributors = new Map<string, number[]>();
  for (let ordinal = 0; ordinal < connectionCount; ordinal++) {
    const sourceId = input.sourceIds[ordinal];
    const targetId = input.targetIds[ordinal];
    const rowIndex = nodeIndex.get(targetId);
    const columnIndex = nodeIndex.get(sourceId);
    if (rowIndex === undefined || columnIndex === undefined) {
      const missing = rowIndex === undefined ? targetId : sourceId;
      throw new MatrixDerivationError(
        'SEMANTIC_UNKNOWN_REFERENCE',
        `connection row ${ordinal} references endpoint ${JSON.stringify(missing)} outside the declared node universe`,
      );
    }
    if (
      input.scope.kind === 'mpi_target_rank_local' &&
      !observedTargets.has(targetId)
    ) {
      throw new MatrixDerivationError(
        'SCOPE_MERGE_CONFLICT',
        `connection row ${ordinal} targets ${JSON.stringify(targetId)}, which is not declared as owned by this MPI rank`,
      );
    }
    const key = cellKey(rowIndex, columnIndex);
    const existing = contributors.get(key);
    if (existing) existing.push(ordinal);
    else contributors.set(key, [ordinal]);
  }

  const connectionSetComplete = input.scope.kind !== 'sampled' &&
    (input.scope.kind !== 'mpi_target_rank_local' || input.scope.localTargetUniverseComplete);
  const makeCell = (rowIndex: number, columnIndex: number): MatrixTopologyCell => {
    const targetId = input.nodeIds[rowIndex];
    const sourceId = input.nodeIds[columnIndex];
    const ordinals = contributors.get(cellKey(rowIndex, columnIndex)) ?? [];
    const observed = observedTargets.has(targetId) && connectionSetComplete;
    const state: MatrixCellState = ordinals.length > 0
      ? 'present'
      : observed
        ? 'absent'
        : 'not_observed';
    return {
      rowIndex,
      columnIndex,
      targetId,
      sourceId,
      state,
      contributingOrdinals: ordinals,
      retainedConnectionRows: ordinals.length,
      contributingConnectionCount: observed ? ordinals.length : null,
      contributingEdgeIds: input.edgeIds
        ? [...ordinals.map((ordinal) => input.edgeIds![ordinal])].sort(compareUnicodeCodePoints)
        : null,
      synapseModels: input.synapseModels
        ? canonicalStrings(ordinals.map((ordinal) => input.synapseModels![ordinal]))
        : null,
      isAutapse: targetId === sourceId,
      connectionSetComplete: observed,
    };
  };

  const presentCells = [...contributors.keys()]
    .map((key) => key.split(':').map(Number) as [number, number])
    .sort((left, right) => left[0] - right[0] || left[1] - right[1])
    .map(([rowIndex, columnIndex]) => makeCell(rowIndex, columnIndex));

  const totalCellCount = input.nodeIds.length * input.nodeIds.length;
  if (!Number.isSafeInteger(totalCellCount)) {
    throw new MatrixDerivationError(
      'RESOURCE_MATRIX_CELLS_EXCEEDED',
      'the declared matrix cell count exceeds the interoperable safe-integer range',
    );
  }
  const presentInObservedRows = presentCells.filter((cell) => observedTargets.has(cell.targetId)).length;
  const observedRowCount = connectionSetComplete ? observedTargets.size : 0;
  const absentCellCount = observedRowCount * input.nodeIds.length - presentInObservedRows;
  const notObservedCellCount = totalCellCount - presentCells.length - absentCellCount;

  const enumeration = input.enumeration ?? 'present_cells_only';
  let tableCells: readonly MatrixTopologyCell[] = presentCells;
  if (enumeration === 'dense') {
    const limit = input.maximumMaterializedCells ?? 500;
    if (!Number.isSafeInteger(limit) || limit < 1 || totalCellCount > limit) {
      throw new MatrixDerivationError(
        'RESOURCE_MATRIX_CELLS_EXCEEDED',
        `dense matrix evidence requires ${totalCellCount} rows, above the materialization limit ${limit}`,
      );
    }
    const dense: MatrixTopologyCell[] = [];
    for (let rowIndex = 0; rowIndex < input.nodeIds.length; rowIndex++) {
      for (let columnIndex = 0; columnIndex < input.nodeIds.length; columnIndex++) {
        dense.push(makeCell(rowIndex, columnIndex));
      }
    }
    tableCells = dense;
  }

  return {
    axisOrder: MATRIX_AXIS_ORDER,
    nodeIds: [...input.nodeIds],
    presentCells,
    tableCells,
    connectionCount,
    presentCellCount: presentCells.length,
    absentCellCount,
    notObservedCellCount,
    observedRowCount,
    totalCellCount,
  };
}

export function deriveAdjacencyMatrix(
  input: MatrixTopologyInput,
  cellMode: 'binary_presence' | 'multiplicity',
  multapseAggregation: 'sum' | 'no_aggregation',
): AdjacencyMatrixResult {
  if (
    input.scope.kind === 'mpi_target_rank_local' &&
    input.scope.localTargetUniverseComplete !== true
  ) {
    throw new MatrixDerivationError(
      'SCOPE_INCOMPATIBLE_WITH_SKILL',
      'a rank-local adjacency matrix requires complete incoming connections for every declared owned target',
    );
  }
  if (input.scope.kind === 'sampled' && cellMode !== 'binary_presence') {
    throw new MatrixDerivationError(
      'SCOPE_INCOMPATIBLE_WITH_SKILL',
      'a sampled connection set can prove binary presence but cannot establish cell multiplicity',
    );
  }
  if (input.scope.kind === 'sampled' && multapseAggregation !== 'sum') {
    throw new MatrixDerivationError(
      'SCOPE_INCOMPATIBLE_WITH_SKILL',
      'sampled binary presence requires sum over retained rows; an incomplete sample cannot prove the no_aggregation assertion for the full cell',
    );
  }
  const topology = deriveMatrixTopology(input);
  const mapCell = (cell: MatrixTopologyCell): AdjacencyMatrixCell => {
    const count = cell.contributingOrdinals.length;
    if (multapseAggregation === 'no_aggregation' && count > 1) {
      throw new MatrixDerivationError(
        'SCIENCE_AGGREGATION_REQUIRED',
        `no_aggregation is false for target ${JSON.stringify(cell.targetId)}, source ${JSON.stringify(cell.sourceId)}: ${count} rows map to the cell`,
      );
    }
    return {
      ...cell,
      cellValue: cell.state === 'not_observed'
        ? null
        : cellMode === 'binary_presence'
          ? count > 0 ? 1 : 0
          : count,
      multiplicity: cell.connectionSetComplete ? count : null,
    };
  };
  return {
    ...topology,
    cellMode,
    multapseAggregation,
    presentCells: topology.presentCells.map(mapCell),
    tableCells: topology.tableCells.map(mapCell),
  };
}

function finiteMeasurementsAt(
  values: readonly (number | null)[],
  ordinals: readonly number[],
): number[] {
  const finite: number[] = [];
  for (const ordinal of ordinals) {
    const value = values[ordinal];
    if (value === null) continue;
    if (!Number.isFinite(value)) {
      throw new MatrixDerivationError(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        `measurement at connection row ${ordinal} is not finite binary64`,
      );
    }
    finite.push(value === 0 ? 0 : value);
  }
  return finite;
}

export function deriveWeightMatrix(
  input: MatrixTopologyInput,
  weights: readonly (number | null)[],
  aggregation: MatrixAggregation,
): WeightMatrixResult {
  assertAggregateMatrixScope(input);
  assertParallelLength(input.sourceIds.length, weights, 'weights');
  const topology = deriveMatrixTopology(input);
  const mapCell = (cell: MatrixTopologyCell): WeightMatrixCell => {
    const finite = finiteMeasurementsAt(weights, cell.contributingOrdinals);
    if (aggregation === 'no_aggregation' && cell.contributingOrdinals.length > 1) {
      throw new MatrixDerivationError(
        'SCIENCE_AGGREGATION_REQUIRED',
        `no_aggregation is false for target ${JSON.stringify(cell.targetId)}, source ${JSON.stringify(cell.sourceId)}`,
      );
    }
    const missing = cell.state === 'not_observed'
      ? null
      : cell.contributingOrdinals.length - finite.length;
    const state: WeightMatrixCellState = cell.state === 'absent'
      ? 'absent'
      : cell.state === 'not_observed'
        ? 'not_observed'
        : finite.length === 0
          ? 'present_without_value'
          : finite.length < cell.contributingOrdinals.length
            ? 'present_with_missing_value'
            : 'valued';
    // A partial set of weights is not the declared aggregate over the cell.  Retain its
    // measured min/max and counts, but keep aggregate null so missing cannot masquerade as
    // a smaller sum or a differently-denominated mean.
    const aggregateValue = state === 'valued' ? aggregate(finite, aggregation) : null;
    return {
      ...cell,
      state,
      aggregate: aggregateValue,
      contributingWeightCount: cell.state === 'not_observed' ? null : finite.length,
      missingWeightCount: missing,
      weightMin: finite.length > 0 ? aggregate(finite, 'min') : null,
      weightMax: finite.length > 0 ? aggregate(finite, 'max') : null,
    };
  };
  const presentCells = topology.presentCells.map(mapCell);
  return {
    ...topology,
    aggregation,
    presentCells,
    tableCells: topology.tableCells.map(mapCell),
    valuedCellCount: presentCells.filter((cell) => cell.state === 'valued').length,
    presentWithMissingValueCellCount: presentCells.filter(
      (cell) => cell.state === 'present_with_missing_value',
    ).length,
    presentWithoutValueCellCount: presentCells.filter(
      (cell) => cell.state === 'present_without_value',
    ).length,
  };
}

export function deriveDelayMatrix(
  input: MatrixTopologyInput,
  delays: readonly number[],
  aggregation: Exclude<MatrixAggregation, 'sum'>,
  sourceUnit: string,
  displayUnit = sourceUnit,
): DelayMatrixResult {
  assertAggregateMatrixScope(input);
  assertParallelLength(input.sourceIds.length, delays, 'delays');
  for (let index = 0; index < delays.length; index++) {
    if (!Number.isFinite(delays[index]) || !(delays[index] > 0)) {
      throw new MatrixDerivationError(
        'SCIENCE_DELAY_NONPOSITIVE',
        `delay at connection row ${index} must be finite and strictly positive`,
      );
    }
  }
  const topology = deriveMatrixTopology(input);
  const convertOnce = (value: number): number => {
    if (sourceUnit === displayUnit) return value;
    try {
      return convert(value, sourceUnit, displayUnit);
    } catch (error) {
      throw new MatrixDerivationError(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        error instanceof Error ? error.message : 'delay-unit conversion failed',
      );
    }
  };
  const mapCell = (cell: MatrixTopologyCell): DelayMatrixCell => {
    const finite = cell.contributingOrdinals.map((ordinal) => delays[ordinal]);
    if (aggregation === 'no_aggregation' && finite.length > 1) {
      throw new MatrixDerivationError(
        'SCIENCE_AGGREGATION_REQUIRED',
        `no_aggregation is false for target ${JSON.stringify(cell.targetId)}, source ${JSON.stringify(cell.sourceId)}`,
      );
    }
    const hasDelay = cell.state === 'present';
    return {
      ...cell,
      delayAggregate: hasDelay ? convertOnce(aggregate(finite, aggregation)) : null,
      delayMin: hasDelay ? convertOnce(aggregate(finite, 'min')) : null,
      delayMax: hasDelay ? convertOnce(aggregate(finite, 'max')) : null,
      displayUnit,
      unitConversionCount: sourceUnit === displayUnit ? 0 : 1,
    };
  };
  return {
    ...topology,
    aggregation,
    sourceUnit,
    displayUnit,
    presentCells: topology.presentCells.map(mapCell),
    tableCells: topology.tableCells.map(mapCell),
  };
}
