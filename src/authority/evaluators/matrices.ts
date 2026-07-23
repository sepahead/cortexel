/**
 * Canonical-request-only OutputAuthority evaluators for the three matrix skills.
 *
 * This module deliberately imports no analysis, compiler, render-plan, artifact, or
 * derivation-receipt code.  It independently binds connection rows to Cortexel's fixed
 * target-row/source-column universe, reconstructs the complete accessibility rows and
 * carrier identities, and derives the source-template facts from the validated request.
 * Shared exact-binary64 and unit primitives are part of the published numeric TCB; the
 * family-specific binding, tri-state semantics, aggregation, and ordering below are not.
 */

import { canonicalize } from '../../core/canonicalize.js';
import { exactBinary64Mean, exactBinary64Sum } from '../../core/exact-binary64.js';
import type {
  AuthorityCellV1,
  AuthorityGeometryEntryV1,
  AuthoritySummaryScalarV1,
  RegisteredAuthorityEvaluatorV1,
} from '../../core/output-authority.js';
import type { DisclosureFacts } from '../../core/disclosures.js';
import type { JsonValue } from '../../core/parse-json.js';
import { conversionFactor, convert } from '../../core/units.js';
import {
  authorityEvaluatorId,
  carrier,
  defineAuthorityEvaluator,
  disclosureFactMap,
  geometrySequence,
  rowSequence,
  summaryFactMap,
} from './model.js';

type JsonRecord = Record<string, JsonValue>;
type Cell = AuthorityCellV1;
type MatrixAggregation = 'sum' | 'mean' | 'min' | 'max' | 'no_aggregation';
type MatrixCellState = 'present' | 'absent' | 'not_observed';
type WeightCellState =
  | 'valued'
  | 'present_with_missing_value'
  | 'present_without_value'
  | 'absent'
  | 'not_observed';

interface MatrixCell {
  readonly rowIndex: number;
  readonly targetId: string;
  readonly columnIndex: number;
  readonly sourceId: string;
  readonly state: MatrixCellState;
  readonly ordinals: readonly number[];
  readonly retainedConnectionRows: number;
  readonly contributingConnectionCount: number | null;
  readonly contributingEdgeIds: readonly string[] | null;
  readonly synapseModels: readonly string[] | null;
  readonly isAutapse: boolean;
  readonly connectionSetComplete: boolean;
}

interface MatrixTopology {
  readonly nodeIds: readonly string[];
  readonly connectionCount: number;
  readonly presentCells: readonly MatrixCell[];
  readonly tableCells: readonly MatrixCell[];
  readonly presentCellCount: number;
  readonly absentCellCount: number;
  readonly notObservedCellCount: number;
  readonly observedRowCount: number;
}

interface MatrixRequest {
  readonly request: JsonRecord;
  readonly data: JsonRecord;
  readonly parameters: JsonRecord;
  readonly nodeIds: readonly string[];
  readonly connections: JsonRecord;
  readonly sourceIds: readonly string[];
  readonly targetIds: readonly string[];
  readonly edgeIds?: readonly string[];
  readonly synapseModels?: readonly string[];
  readonly scope: JsonRecord;
  readonly observedTargetIds?: readonly string[];
}

interface MatrixAuthorityModel {
  readonly rows: readonly (readonly Cell[])[];
  readonly geometry: readonly AuthorityGeometryEntryV1[];
  readonly summary: Readonly<Record<string, AuthoritySummaryScalarV1>>;
  readonly disclosures: Readonly<DisclosureFacts>;
}

function record(value: JsonValue | undefined): JsonRecord {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: JsonValue | undefined): string[] {
  return array(value).map(String);
}

function nullableNumbers(value: JsonValue | undefined): (number | null)[] {
  return array(value).map((entry) => entry === null ? null : Number(entry));
}

function numbers(value: JsonValue | undefined): number[] {
  return array(value).map(Number);
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

function canonicalStrings(values: readonly string[]): readonly string[] | null {
  if (values.length === 0) return null;
  return [...new Set(values)].sort(compareUnicodeCodePoints);
}

function canonicalZero(value: number): number {
  return value === 0 ? 0 : value;
}

/** ECMAScript's shortest round-trippable binary64 text, with signed zero canonicalized. */
function summaryNumber(value: number): string {
  return value === 0 ? '0' : String(value);
}

function structuredCell(value: JsonValue | undefined): string | null {
  return value === undefined ? null : canonicalize(value);
}

function booleanCell(value: boolean): string {
  return value ? 'true' : 'false';
}

function requestParts(value: JsonValue): MatrixRequest {
  const request = record(value);
  const data = record(request.data);
  const connections = record(data.connections);
  const edgeIds = Array.isArray(connections.edgeIds) ? strings(connections.edgeIds) : undefined;
  const synapseModels = Array.isArray(connections.synapseModels)
    ? strings(connections.synapseModels)
    : undefined;
  const observedTargetIds = Array.isArray(data.observedTargetIds)
    ? strings(data.observedTargetIds)
    : undefined;
  return {
    request,
    data,
    parameters: record(request.parameters),
    nodeIds: strings(record(data.nodeUniverse).ids),
    connections,
    sourceIds: strings(connections.sourceIds),
    targetIds: strings(connections.targetIds),
    ...(edgeIds === undefined ? {} : { edgeIds }),
    ...(synapseModels === undefined ? {} : { synapseModels }),
    scope: record(data.scope),
    ...(observedTargetIds === undefined ? {} : { observedTargetIds }),
  };
}

function topology(parts: MatrixRequest, dense: boolean): MatrixTopology {
  const nodeIndex = new Map<string, number>();
  for (let index = 0; index < parts.nodeIds.length; index++) {
    nodeIndex.set(parts.nodeIds[index], index);
  }
  const scopeKind = String(parts.scope.kind);
  const observedTargets = scopeKind === 'mpi_target_rank_local'
    ? new Set(parts.observedTargetIds ?? [])
    : scopeKind === 'sampled'
      ? new Set<string>()
      : new Set(parts.nodeIds);
  const connectionSetComplete = scopeKind !== 'sampled' &&
    (scopeKind !== 'mpi_target_rank_local' || parts.scope.localTargetUniverseComplete === true);

  const contributors = new Map<string, number[]>();
  for (let ordinal = 0; ordinal < parts.sourceIds.length; ordinal++) {
    const rowIndex = nodeIndex.get(parts.targetIds[ordinal]);
    const columnIndex = nodeIndex.get(parts.sourceIds[ordinal]);
    if (rowIndex === undefined || columnIndex === undefined) {
      throw new Error('matrix authority encountered an endpoint outside the validated universe');
    }
    const key = `${rowIndex}:${columnIndex}`;
    const existing = contributors.get(key);
    if (existing === undefined) contributors.set(key, [ordinal]);
    else existing.push(ordinal);
  }

  const makeCell = (rowIndex: number, columnIndex: number): MatrixCell => {
    const targetId = parts.nodeIds[rowIndex];
    const sourceId = parts.nodeIds[columnIndex];
    const ordinals = contributors.get(`${rowIndex}:${columnIndex}`) ?? [];
    const completelyObserved = observedTargets.has(targetId) && connectionSetComplete;
    const state: MatrixCellState = ordinals.length > 0
      ? 'present'
      : completelyObserved
        ? 'absent'
        : 'not_observed';
    const contributingEdgeIds = parts.edgeIds === undefined
      ? null
      : ordinals.map((ordinal) => parts.edgeIds![ordinal]).sort(compareUnicodeCodePoints);
    const models = parts.synapseModels === undefined
      ? null
      : canonicalStrings(ordinals.map((ordinal) => parts.synapseModels![ordinal]));
    return {
      rowIndex,
      targetId,
      columnIndex,
      sourceId,
      state,
      ordinals: [...ordinals],
      retainedConnectionRows: ordinals.length,
      contributingConnectionCount: completelyObserved ? ordinals.length : null,
      contributingEdgeIds,
      synapseModels: models,
      isAutapse: targetId === sourceId,
      connectionSetComplete: completelyObserved,
    };
  };

  const presentCoordinates: [number, number][] = [];
  for (const key of contributors.keys()) {
    const separator = key.indexOf(':');
    presentCoordinates.push([
      Number(key.slice(0, separator)),
      Number(key.slice(separator + 1)),
    ]);
  }
  presentCoordinates.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const presentCells = presentCoordinates.map(([rowIndex, columnIndex]) =>
    makeCell(rowIndex, columnIndex));

  const nodeCount = parts.nodeIds.length;
  const totalCellCount = nodeCount * nodeCount;
  const observedRowCount = connectionSetComplete ? observedTargets.size : 0;
  let presentInObservedRows = 0;
  for (const cell of presentCells) {
    if (observedTargets.has(cell.targetId)) presentInObservedRows++;
  }
  const absentCellCount = observedRowCount * nodeCount - presentInObservedRows;
  const notObservedCellCount = totalCellCount - presentCells.length - absentCellCount;

  let tableCells: readonly MatrixCell[] = presentCells;
  if (dense) {
    const materialized: MatrixCell[] = [];
    for (let rowIndex = 0; rowIndex < nodeCount; rowIndex++) {
      for (let columnIndex = 0; columnIndex < nodeCount; columnIndex++) {
        materialized.push(makeCell(rowIndex, columnIndex));
      }
    }
    tableCells = materialized;
  }
  return {
    nodeIds: [...parts.nodeIds],
    connectionCount: parts.sourceIds.length,
    presentCells,
    tableCells,
    presentCellCount: presentCells.length,
    absentCellCount,
    notObservedCellCount,
    observedRowCount,
  };
}

function aggregate(values: readonly number[], method: MatrixAggregation): number {
  if (values.length === 0) throw new Error('matrix authority cannot aggregate an empty cell');
  if (method === 'sum') return canonicalZero(exactBinary64Sum(values));
  if (method === 'mean') return canonicalZero(exactBinary64Mean(values));
  if (method === 'no_aggregation') {
    if (values.length !== 1) throw new Error('matrix authority no_aggregation encountered a multapse');
    return canonicalZero(values[0]);
  }
  let result = values[0];
  for (let index = 1; index < values.length; index++) {
    if (method === 'min' ? values[index] < result : values[index] > result) {
      result = values[index];
    }
  }
  return canonicalZero(result);
}

function extrema(values: readonly number[]): { readonly min: number; readonly max: number } | null {
  if (values.length === 0) return null;
  let min = values[0];
  let max = values[0];
  for (let index = 1; index < values.length; index++) {
    if (values[index] < min) min = values[index];
    if (values[index] > max) max = values[index];
  }
  return { min: canonicalZero(min), max: canonicalZero(max) };
}

function cellProvenance(cell: MatrixCell, state: string): JsonValue {
  return {
    rowIndex: cell.rowIndex,
    targetId: cell.targetId,
    columnIndex: cell.columnIndex,
    sourceId: cell.sourceId,
    cellState: state,
  };
}

function adjacencyMultapseStatement(
  cells: readonly MatrixCell[],
  cellMode: string,
  aggregation: string,
): string {
  let count = 0;
  for (const cell of cells) if (cell.retainedConnectionRows > 1) count++;
  if (count === 0) return 'No present cell contains multiple retained connection rows.';
  if (cellMode === 'binary_presence') {
    return `${count} present ${count === 1 ? 'cell contains' : 'cells contain'} multiple retained connection rows; each maps to one binary-presence mark, while retained-row and complete-cell counts remain in the table.`;
  }
  return `${count} present ${count === 1 ? 'cell aggregates' : 'cells aggregate'} multiple retained connection rows using ${aggregation}.`;
}

function noCompactionStatement(): string {
  return 'No compaction was applied; every accepted row is returned.';
}

/**
 * Bounded summary of a validated scope. The exact scope object remains bound once in the
 * canonical request and its digest; a million-rank mergedRanks array must never be copied
 * into one summary fact whose contract-wide display bound is intentionally much smaller.
 */
function scopeStatement(scope: JsonRecord): string {
  const kind = String(scope.kind);
  if (kind === 'single_process') return 'single_process complete';
  if (kind === 'global_merged') {
    return `global_merged across all ${String(scope.worldSize)} declared ranks`;
  }
  if (kind === 'mpi_target_rank_local') {
    return `mpi_target_rank_local rank ${String(scope.rank)} in worldSize ${String(scope.worldSize)}; localTargetUniverseComplete=${String(scope.localTargetUniverseComplete)}`;
  }
  if (kind === 'sampled') {
    return `sampled ${String(scope.method)} from ${String(scope.parentScope)}; retained ${String(scope.retainedConnectionCount)} of ${String(scope.sourceConnectionCount)} connection rows`;
  }
  throw new Error('matrix authority encountered an unknown validated scope kind');
}

/**
 * Bounded alternative-table projection of NetworkScope. A validator-proven global merge
 * always covers exactly 0..worldSize-1, so copying the redundant mergedRanks array into
 * every row would amplify one accepted request by rows x ranks without adding evidence.
 */
function scopeSummaryCell(scope: JsonRecord): string {
  const kind = String(scope.kind);
  if (kind === 'single_process') {
    return canonicalize({ kind: 'single_process', snapshotTime: scope.snapshotTime });
  }
  if (kind === 'global_merged') {
    return canonicalize({
      kind: 'global_merged',
      mergedRanksCoverage: 'all_ranks_0_through_worldSize_minus_1',
      snapshotTime: scope.snapshotTime,
      worldSize: scope.worldSize,
    });
  }
  if (kind === 'mpi_target_rank_local') {
    return canonicalize({
      kind: 'mpi_target_rank_local',
      localTargetUniverseComplete: true,
      rank: scope.rank,
      snapshotTime: scope.snapshotTime,
      worldSize: scope.worldSize,
    });
  }
  if (kind === 'sampled') {
    return canonicalize({
      kind: 'sampled',
      method: scope.method,
      parentScope: scope.parentScope,
      retainedConnectionCount: scope.retainedConnectionCount,
      snapshotTime: scope.snapshotTime,
      sourceConnectionCount: scope.sourceConnectionCount,
    });
  }
  throw new Error('matrix authority encountered an unknown validated scope kind');
}

function baseDisclosureFacts(
  parts: MatrixRequest,
  extra: Partial<DisclosureFacts> = {},
): DisclosureFacts {
  const source = record(parts.request.source);
  const uncertainty = record(parts.parameters.uncertainty ?? parts.data.uncertainty);
  const nodeUniverse = record(parts.data.nodeUniverse);
  return {
    sourceKind: typeof source.kind === 'string' ? source.kind : 'unknown',
    sourceAuthenticityVerified: false,
    referenceComparisonRun: false,
    callerNotePresent: typeof source.declaredNote === 'string',
    uncertaintyKind: typeof uncertainty.kind === 'string' ? uncertainty.kind : 'none',
    uncertaintyReason: typeof uncertainty.reason === 'string'
      ? uncertainty.reason
      : 'not_provided',
    ...(typeof parts.scope.kind === 'string' ? { scopeKind: parts.scope.kind } : {}),
    ...(typeof parts.scope.rank === 'number' ? { rank: parts.scope.rank } : {}),
    ...(typeof parts.scope.worldSize === 'number' ? { worldSize: parts.scope.worldSize } : {}),
    ...(typeof parts.scope.retainedConnectionCount === 'number'
      ? {
        retainedConnectionCount: parts.scope.retainedConnectionCount,
        sampledRetained: parts.scope.retainedConnectionCount,
      }
      : {}),
    ...(typeof parts.scope.sourceConnectionCount === 'number'
      ? {
        sourceConnectionCount: parts.scope.sourceConnectionCount,
        sampledSource: parts.scope.sourceConnectionCount,
      }
      : {}),
    ...(typeof nodeUniverse.complete === 'boolean'
      ? { nodeUniverseComplete: nodeUniverse.complete }
      : {}),
    ...extra,
  };
}

function modelFields(model: MatrixAuthorityModel) {
  return {
    'table.rows': rowSequence(model.rows),
    'geometry.sequence': geometrySequence(model.geometry),
    'summary.facts': summaryFactMap(model.summary),
    'disclosure.facts': disclosureFactMap(model.disclosures),
  };
}

function adjacencyModel(requestValue: JsonValue): MatrixAuthorityModel {
  const parts = requestParts(requestValue);
  const matrix = topology(parts, parts.parameters.tableCellEnumeration === 'dense');
  const cellMode = String(parts.parameters.cellMode);
  const aggregation = String(parts.parameters.multapseAggregation);
  const weightRecord = record(parts.connections.weights);
  const delayRecord = record(parts.connections.delays);
  const weightValues = array(weightRecord.values);
  const delayValues = array(delayRecord.values);
  const scopeCell = scopeSummaryCell(parts.scope);

  const rows: Cell[][] = [];
  for (const cell of matrix.tableCells) {
    const count = cell.ordinals.length;
    const cellValue = cell.state === 'not_observed'
      ? null
      : cellMode === 'binary_presence'
        ? count > 0 ? 1 : 0
        : count;
    const multiplicity = cell.connectionSetComplete ? count : null;
    const carried: JsonValue[] = [];
    for (const ordinal of cell.ordinals) {
      const entry: JsonRecord = {};
      if (Object.keys(weightRecord).length > 0) {
        entry.weight = weightValues[ordinal] ?? null;
        entry.weightUnit = weightRecord.unit ?? null;
      }
      if (Object.keys(delayRecord).length > 0) {
        entry.delay = delayValues[ordinal] ?? null;
        entry.delayUnit = delayRecord.unit ?? null;
      }
      if (Object.keys(entry).length > 0) {
        if (parts.edgeIds !== undefined) entry.edgeId = parts.edgeIds[ordinal];
        if (parts.synapseModels !== undefined) {
          entry.synapseModel = parts.synapseModels[ordinal];
        }
        carried.push(entry);
      }
    }
    rows.push([
      cell.rowIndex,
      cell.targetId,
      cell.columnIndex,
      cell.sourceId,
      cell.state,
      cellValue,
      multiplicity,
      cell.retainedConnectionRows,
      booleanCell(cell.connectionSetComplete),
      booleanCell(cell.isAutapse),
      cell.contributingEdgeIds === null ? null : structuredCell([...cell.contributingEdgeIds]),
      cell.synapseModels === null ? null : structuredCell([...cell.synapseModels]),
      carried.length === 0 ? null : structuredCell(carried),
      scopeCell,
    ]);
  }
  const geometry = matrix.presentCells.map((cell) =>
    carrier('cells', cellProvenance(cell, 'present')));
  let autapseCellCount = 0;
  let multapseCellCount = 0;
  let missingValueCount = 0;
  for (const cell of matrix.presentCells) {
    if (cell.isAutapse) autapseCellCount++;
    if (cell.retainedConnectionRows > 1) multapseCellCount++;
  }
  for (const value of weightValues) if (value === null) missingValueCount++;
  for (const value of delayValues) if (value === null) missingValueCount++;
  const snapshotTime = record(parts.scope.snapshotTime);
  return {
    rows,
    geometry,
    summary: {
      selectionLabel: String(parts.parameters.selectionLabel ?? parts.parameters.selectionId),
      nodeCount: String(parts.nodeIds.length),
      cellMode,
      presentCellCount: String(matrix.presentCellCount),
      connectionCount: String(matrix.connectionCount),
      observedRowCount: String(matrix.observedRowCount),
      absentCellCount: String(matrix.absentCellCount),
      notObservedCellCount: String(matrix.notObservedCellCount),
      autapseCellCount: String(autapseCellCount),
      scopeStatement: scopeStatement(parts.scope),
      snapshotTime: summaryNumber(Number(snapshotTime.value)),
      snapshotTimeUnit: String(snapshotTime.unit),
      multapseStatement: adjacencyMultapseStatement(
        matrix.presentCells,
        cellMode,
        aggregation,
      ),
      compactionStatement: noCompactionStatement(),
    },
    disclosures: baseDisclosureFacts(parts, {
      ...(cellMode === 'multiplicity' && multapseCellCount > 0
        ? { multapseAggregated: true, multapseAggregation: aggregation }
        : {}),
      ...(missingValueCount > 0 ? { missingValueCount } : {}),
    }),
  };
}

interface WeightCell {
  readonly topology: MatrixCell;
  readonly state: WeightCellState;
  readonly aggregate: number | null;
  readonly contributingWeightCount: number | null;
  readonly missingWeightCount: number | null;
  readonly weightMin: number | null;
  readonly weightMax: number | null;
}

function weightMultapseStatement(cells: readonly WeightCell[], aggregation: string): string {
  let aggregated = 0;
  let unavailable = 0;
  for (const cell of cells) {
    if (cell.topology.retainedConnectionRows <= 1) continue;
    if (cell.state === 'valued') aggregated++;
    else unavailable++;
  }
  if (aggregated === 0 && unavailable === 0) {
    return 'No present cell contains multiple retained connection rows.';
  }
  const statements: string[] = [];
  if (aggregated > 0) {
    statements.push(
      `${aggregated} valued ${aggregated === 1 ? 'cell aggregates' : 'cells aggregate'} multiple retained connection rows using ${aggregation}.`,
    );
  }
  if (unavailable > 0) {
    statements.push(
      `${unavailable} present ${unavailable === 1 ? 'cell contains' : 'cells contain'} multiple retained connection rows, but no complete aggregate is reported because at least one contributing weight is missing.`,
    );
  }
  return statements.join(' ');
}

function synapseModelGroupStatement(parts: MatrixRequest): string {
  if (parts.synapseModels === undefined) return 'no synapse-model channel was declared';
  const models = canonicalStrings(parts.synapseModels) ?? [];
  if (models.length === 0) return 'the declared synapse-model channel is empty';
  if (models.length === 1) return `one declared model ${models[0]}; no cross-model pooling`;
  return `caller-declared comparability group ${String(parts.parameters.synapseModelGroup)} across ${String(models.length)} distinct declared models`;
}

function colorScaleStatement(parameters: JsonRecord): string {
  const scale = record(parameters.colorScale);
  return scale.class === 'diverging'
    ? `diverging about declared center ${summaryNumber(Number(scale.center))}`
    : 'sequential';
}

function weightModel(requestValue: JsonValue): MatrixAuthorityModel {
  const parts = requestParts(requestValue);
  const matrix = topology(parts, parts.parameters.tableCellEnumeration === 'dense');
  const weights = nullableNumbers(record(parts.connections.weights).values);
  const aggregation = String(parts.parameters.multapseAggregation) as MatrixAggregation;
  const weightUnit = String(record(parts.connections.weights).unit);
  const scopeCell = scopeSummaryCell(parts.scope);

  const weightCells: WeightCell[] = [];
  for (const cell of matrix.tableCells) {
    const measured: number[] = [];
    for (const ordinal of cell.ordinals) {
      const value = weights[ordinal];
      if (value !== null) measured.push(canonicalZero(value));
    }
    const state: WeightCellState = cell.state === 'absent'
      ? 'absent'
      : cell.state === 'not_observed'
        ? 'not_observed'
        : measured.length === 0
          ? 'present_without_value'
          : measured.length < cell.ordinals.length
            ? 'present_with_missing_value'
            : 'valued';
    weightCells.push({
      topology: cell,
      state,
      aggregate: state === 'valued' ? aggregate(measured, aggregation) : null,
      contributingWeightCount: cell.state === 'not_observed' ? null : measured.length,
      missingWeightCount: cell.state === 'not_observed'
        ? null
        : cell.ordinals.length - measured.length,
      weightMin: measured.length === 0 ? null : aggregate(measured, 'min'),
      weightMax: measured.length === 0 ? null : aggregate(measured, 'max'),
    });
  }

  const rows: Cell[][] = [];
  const aggregates: number[] = [];
  let valuedCellCount = 0;
  let presentWithMissingValueCellCount = 0;
  let presentWithoutValueCellCount = 0;
  let aggregatedMultapseCellCount = 0;
  for (const cell of weightCells) {
    if (cell.aggregate !== null) aggregates.push(cell.aggregate);
    if (cell.state === 'valued') valuedCellCount++;
    if (cell.state === 'present_with_missing_value') presentWithMissingValueCellCount++;
    if (cell.state === 'present_without_value') presentWithoutValueCellCount++;
    if (cell.state === 'valued' && cell.topology.retainedConnectionRows > 1) {
      aggregatedMultapseCellCount++;
    }
    const models = cell.topology.synapseModels === null
      ? null
      : structuredCell({
        models: [...cell.topology.synapseModels],
        ...(typeof parts.parameters.synapseModelGroup === 'string'
          ? { comparabilityGroup: parts.parameters.synapseModelGroup }
          : {}),
      });
    rows.push([
      cell.topology.rowIndex,
      cell.topology.targetId,
      cell.topology.columnIndex,
      cell.topology.sourceId,
      cell.state,
      cell.aggregate,
      aggregation,
      weightUnit,
      cell.topology.contributingConnectionCount,
      cell.contributingWeightCount,
      cell.missingWeightCount,
      cell.weightMin,
      cell.weightMax,
      models,
      cell.topology.contributingEdgeIds === null
        ? null
        : structuredCell([...cell.topology.contributingEdgeIds]),
      scopeCell,
    ]);
  }
  const byState = (state: WeightCellState): AuthorityGeometryEntryV1[] => {
    const result: AuthorityGeometryEntryV1[] = [];
    for (const cell of weightCells) {
      if (cell.state === state) {
        result.push(carrier('cells', cellProvenance(cell.topology, cell.state)));
      }
    }
    return result;
  };
  // compileMatrixFigure emits one rect mark per semantic paint class in this order.
  const geometry = [
    ...byState('valued'),
    ...byState('present_with_missing_value'),
    ...byState('present_without_value'),
  ];
  const aggregateExtent = extrema(aggregates);
  let missingValueCount = 0;
  for (const weight of weights) if (weight === null) missingValueCount++;
  const snapshotTime = record(parts.scope.snapshotTime);
  return {
    rows,
    geometry,
    summary: {
      nodeCount: String(parts.nodeIds.length),
      valuedCellCount: String(valuedCellCount),
      presentWithMissingValueCellCount: String(presentWithMissingValueCellCount),
      presentWithoutValueCellCount: String(presentWithoutValueCellCount),
      absentCellCount: String(matrix.absentCellCount),
      notObservedCellCount: String(matrix.notObservedCellCount),
      aggregation,
      connectionCount: String(matrix.connectionCount),
      weightUnit,
      aggregateMin: aggregateExtent === null ? 'not available' : summaryNumber(aggregateExtent.min),
      aggregateMax: aggregateExtent === null ? 'not available' : summaryNumber(aggregateExtent.max),
      synapseModelGroupStatement: synapseModelGroupStatement(parts),
      colorScaleStatement: colorScaleStatement(parts.parameters),
      scopeStatement: scopeStatement(parts.scope),
      snapshotTime: `${summaryNumber(Number(snapshotTime.value))} ${String(snapshotTime.unit)}`,
      multapseStatement: weightMultapseStatement(weightCells, aggregation),
      compactionStatement: noCompactionStatement(),
    },
    disclosures: baseDisclosureFacts(parts, {
      ...(aggregatedMultapseCellCount > 0
        ? { multapseAggregated: true, multapseAggregation: aggregation }
        : {}),
      ...(missingValueCount > 0 ? { missingValueCount } : {}),
    }),
  };
}

function delayModel(requestValue: JsonValue): MatrixAuthorityModel {
  const parts = requestParts(requestValue);
  const matrix = topology(parts, parts.parameters.tableCellEnumeration === 'dense');
  const delayRecord = record(parts.connections.delays);
  const delays = numbers(delayRecord.values);
  const sourceUnit = String(delayRecord.unit);
  const displayUnit = String(record(parts.parameters.displayUnit).unit ?? sourceUnit);
  const aggregation = String(parts.parameters.multapseAggregation) as MatrixAggregation;
  const delaySemantics = String(parts.parameters.delaySemantics);
  const scopeCell = scopeSummaryCell(parts.scope);
  const rows: Cell[][] = [];
  const geometry: AuthorityGeometryEntryV1[] = [];
  const aggregates: number[] = [];
  let multapseCellCount = 0;

  for (const cell of matrix.tableCells) {
    const measured: number[] = [];
    for (const ordinal of cell.ordinals) measured.push(delays[ordinal]);
    const hasDelay = cell.state === 'present';
    const convertOnce = (value: number): number => sourceUnit === displayUnit
      ? value
      : canonicalZero(convert(value, sourceUnit, displayUnit));
    const delayAggregate = hasDelay ? convertOnce(aggregate(measured, aggregation)) : null;
    const delayMin = hasDelay ? convertOnce(aggregate(measured, 'min')) : null;
    const delayMax = hasDelay ? convertOnce(aggregate(measured, 'max')) : null;
    if (delayAggregate !== null) aggregates.push(delayAggregate);
    if (cell.retainedConnectionRows > 1) multapseCellCount++;
    rows.push([
      cell.rowIndex,
      cell.targetId,
      cell.columnIndex,
      cell.sourceId,
      cell.state,
      delayAggregate,
      displayUnit,
      aggregation,
      delaySemantics,
      cell.contributingConnectionCount,
      delayMin,
      delayMax,
      cell.contributingEdgeIds === null ? null : structuredCell([...cell.contributingEdgeIds]),
      cell.synapseModels === null ? null : structuredCell([...cell.synapseModels]),
      booleanCell(cell.isAutapse),
      scopeCell,
    ]);
    if (cell.state === 'present') {
      geometry.push(carrier('cells', cellProvenance(cell, 'present')));
    }
  }
  const delayExtent = extrema(aggregates);
  const snapshotTime = record(parts.scope.snapshotTime);
  const unitConversions = sourceUnit === displayUnit || matrix.presentCells.length === 0
    ? []
    : [`delay: ${sourceUnit} -> ${displayUnit} (factor ${conversionFactor(sourceUnit, displayUnit)})`];
  return {
    rows,
    geometry,
    summary: {
      matrixLabel: String(parts.parameters.matrixLabel ?? 'declared node universe'),
      rowCount: String(parts.nodeIds.length),
      columnCount: String(parts.nodeIds.length),
      presentCellCount: String(matrix.presentCellCount),
      absentCellCount: String(matrix.absentCellCount),
      notObservedCellCount: String(matrix.notObservedCellCount),
      multapseAggregation: aggregation,
      delaySemantics,
      connectionCount: String(matrix.connectionCount),
      displayUnit,
      delayMin: delayExtent === null ? 'not available' : summaryNumber(delayExtent.min),
      delayMax: delayExtent === null ? 'not available' : summaryNumber(delayExtent.max),
      scopeKind: String(parts.scope.kind),
      snapshotTime: summaryNumber(Number(snapshotTime.value)),
      snapshotTimeUnit: String(snapshotTime.unit),
      compactionStatement: noCompactionStatement(),
    },
    disclosures: baseDisclosureFacts(parts, {
      ...(multapseCellCount > 0
        ? { multapseAggregated: true, multapseAggregation: aggregation }
        : {}),
      ...(unitConversions.length > 0 ? { unitConversions } : {}),
    }),
  };
}

const ADJACENCY_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.adjacency_matrix', 2),
  (request) => modelFields(adjacencyModel(request)),
);

const WEIGHT_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.weight_matrix', 2),
  (request) => modelFields(weightModel(request)),
);

const DELAY_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.delay_matrix', 2),
  (request) => modelFields(delayModel(request)),
);

export const MATRIX_AUTHORITY_EVALUATORS: readonly RegisteredAuthorityEvaluatorV1[] = [
  ADJACENCY_AUTHORITY,
  WEIGHT_AUTHORITY,
  DELAY_AUTHORITY,
];
