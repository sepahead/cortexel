import { describe, expect, it } from 'vitest';

import {
  MATRIX_AXIS_ORDER,
  MatrixDerivationError,
  deriveAdjacencyMatrix,
  deriveDelayMatrix,
  deriveMatrixTopology,
  deriveWeightMatrix,
  type MatrixTopologyInput,
} from '../src/analysis/index.js';

const completeScope = { kind: 'single_process', complete: true } as const;

function input(overrides: Partial<MatrixTopologyInput> = {}): MatrixTopologyInput {
  return {
    nodeIds: ['s', 't', 'u'],
    sourceIds: ['s', 's', 'u', 't'],
    targetIds: ['t', 't', 't', 'u'],
    edgeIds: ['first', 'middle', 'last', 'tail'],
    synapseModels: ['m', 'm', 'm', 'm'],
    scope: completeScope,
    ...overrides,
  };
}

function conservationSignature(value: MatrixTopologyInput): string {
  const derived = deriveMatrixTopology(value);
  return derived.presentCells.map((cell) =>
    `${cell.rowIndex}:${cell.columnIndex}:${cell.contributingConnectionCount}:${cell.contributingEdgeIds?.join(',') ?? '-'}`,
  ).join('|');
}

describe('source-derived stable matrix evidence', () => {
  it('fixes target rows and source columns and exposes the invariant as data', () => {
    const forward = deriveMatrixTopology(input({
      nodeIds: ['s', 't'],
      sourceIds: ['s'],
      targetIds: ['t'],
      edgeIds: ['e'],
      synapseModels: undefined,
    }));
    const transposed = deriveMatrixTopology(input({
      nodeIds: ['s', 't'],
      sourceIds: ['t'],
      targetIds: ['s'],
      edgeIds: ['e'],
      synapseModels: undefined,
    }));

    expect(forward.axisOrder).toBe(MATRIX_AXIS_ORDER);
    expect(forward.presentCells[0]).toMatchObject({
      rowIndex: 1,
      columnIndex: 0,
      targetId: 't',
      sourceId: 's',
    });
    expect(transposed.presentCells[0]).toMatchObject({ rowIndex: 0, columnIndex: 1 });
    expect(transposed.presentCells).not.toEqual(forward.presentCells);
  });

  it('preserves every multapse and autapse and proves ordinal conservation', () => {
    const derived = deriveMatrixTopology(input());
    const ordinals = derived.presentCells.flatMap((cell) => cell.contributingOrdinals).sort((a, b) => a - b);
    expect(ordinals).toEqual([0, 1, 2, 3]);
    expect(derived.presentCells.reduce(
      (sum, cell) => sum + (cell.contributingConnectionCount ?? 0),
      0,
    )).toBe(derived.connectionCount);
    expect(derived.presentCells.find((cell) => cell.targetId === 't' && cell.sourceId === 's'))
      .toMatchObject({ contributingConnectionCount: 2 });

    const autapse = deriveMatrixTopology(input({
      nodeIds: ['n'], sourceIds: ['n'], targetIds: ['n'], edgeIds: ['self'], synapseModels: undefined,
    }));
    expect(autapse.presentCells[0]).toMatchObject({ isAutapse: true, rowIndex: 0, columnIndex: 0 });
  });

  it.each([0, 1, 3])('detects dropping connection ordinal %i in the exact cell signature', (drop) => {
    const base = input();
    const without = <T,>(values: readonly T[] | undefined): readonly T[] | undefined =>
      values?.filter((_value, index) => index !== drop);
    const mutated: MatrixTopologyInput = {
      ...base,
      sourceIds: without(base.sourceIds)!,
      targetIds: without(base.targetIds)!,
      edgeIds: without(base.edgeIds),
      synapseModels: without(base.synapseModels),
    };
    expect(conservationSignature(mutated)).not.toBe(conservationSignature(base));
    expect(deriveMatrixTopology(mutated).connectionCount).toBe(base.sourceIds.length - 1);
  });

  it('refuses truncation, unknown endpoints, duplicate identities, and collapsed no-aggregation promises', () => {
    expect(() => deriveMatrixTopology(input({ targetIds: ['t'] })))
      .toThrowError(expect.objectContaining({ code: 'SEMANTIC_LENGTH_MISMATCH' }));
    expect(() => deriveMatrixTopology(input({ targetIds: ['t', 't', 'outside', 'u'] })))
      .toThrowError(expect.objectContaining({ code: 'SEMANTIC_UNKNOWN_REFERENCE' }));
    expect(() => deriveMatrixTopology(input({ edgeIds: ['e', 'e', 'f', 'g'] })))
      .toThrowError(expect.objectContaining({ code: 'SEMANTIC_DUPLICATE_ID' }));
    expect(() => deriveAdjacencyMatrix(input(), 'multiplicity', 'no_aggregation'))
      .toThrowError(expect.objectContaining({ code: 'SCIENCE_AGGREGATION_REQUIRED' }));
  });

  it('derives dense cell trichotomy from exact rank-owned target authority', () => {
    const rankLocal = input({
      nodeIds: ['s', 'owned', 'remote'],
      sourceIds: ['s'],
      targetIds: ['owned'],
      edgeIds: ['e'],
      synapseModels: undefined,
      scope: {
        kind: 'mpi_target_rank_local',
        rank: 0,
        worldSize: 2,
        localTargetUniverseComplete: true,
      },
      observedTargetIds: ['owned'],
      enumeration: 'dense',
      maximumMaterializedCells: 9,
    });

    const matrix = deriveAdjacencyMatrix(rankLocal, 'binary_presence', 'sum');
    expect(matrix.observedRowCount).toBe(1);
    expect(matrix.presentCellCount).toBe(1);
    expect(matrix.absentCellCount).toBe(2);
    expect(matrix.notObservedCellCount).toBe(6);
    expect(matrix.tableCells.map((cell) => `${cell.rowIndex}:${cell.columnIndex}:${cell.state}:${cell.cellValue}`))
      .toEqual([
        '0:0:not_observed:null', '0:1:not_observed:null', '0:2:not_observed:null',
        '1:0:present:1', '1:1:absent:0', '1:2:absent:0',
        '2:0:not_observed:null', '2:1:not_observed:null', '2:2:not_observed:null',
      ]);
  });

  it('accepts an exact empty owned-target set only with zero connection rows', () => {
    const emptyRank: MatrixTopologyInput = {
      nodeIds: ['a', 'b'],
      sourceIds: [],
      targetIds: [],
      edgeIds: [],
      scope: {
        kind: 'mpi_target_rank_local', rank: 3, worldSize: 4, localTargetUniverseComplete: true,
      },
      observedTargetIds: [],
      enumeration: 'dense',
      maximumMaterializedCells: 4,
    };
    const matrix = deriveAdjacencyMatrix(emptyRank, 'binary_presence', 'sum');
    expect(matrix).toMatchObject({
      connectionCount: 0,
      observedRowCount: 0,
      absentCellCount: 0,
      notObservedCellCount: 4,
    });
    expect(matrix.tableCells.every((cell) => cell.state === 'not_observed')).toBe(true);
    expect(() => deriveMatrixTopology({
      ...emptyRank,
      sourceIds: ['a'],
      targetIds: ['b'],
      edgeIds: ['contradiction'],
    })).toThrowError(expect.objectContaining({ code: 'SCOPE_MERGE_CONFLICT' }));
  });

  it('lets sampled evidence prove presence only, never multiplicity or absence', () => {
    const sampled: MatrixTopologyInput = {
      nodeIds: ['s', 't'],
      sourceIds: ['s'],
      targetIds: ['t'],
      scope: {
        kind: 'sampled',
        parentScope: 'global_merged',
        sourceConnectionCount: 20,
        retainedConnectionCount: 1,
      },
      enumeration: 'dense',
      maximumMaterializedCells: 4,
    };
    const binary = deriveAdjacencyMatrix(sampled, 'binary_presence', 'sum');
    expect(binary.presentCellCount).toBe(1);
    expect(binary.absentCellCount).toBe(0);
    expect(binary.notObservedCellCount).toBe(3);
    expect(binary.presentCells[0]).toMatchObject({
      cellValue: 1,
      multiplicity: null,
      retainedConnectionRows: 1,
      contributingConnectionCount: null,
      connectionSetComplete: false,
    });
    expect(() => deriveAdjacencyMatrix(sampled, 'multiplicity', 'sum'))
      .toThrowError(expect.objectContaining({ code: 'SCOPE_INCOMPATIBLE_WITH_SKILL' }));
    expect(() => deriveAdjacencyMatrix(sampled, 'binary_presence', 'no_aggregation'))
      .toThrowError(expect.objectContaining({ code: 'SCOPE_INCOMPATIBLE_WITH_SKILL' }));
    expect(() => deriveMatrixTopology({
      ...sampled,
      scope: {
        kind: 'sampled',
        parentScope: 'global_merged',
        sourceConnectionCount: 20,
        retainedConnectionCount: 0,
      },
    })).toThrowError(expect.objectContaining({ code: 'SCOPE_MERGE_CONFLICT' }));
    expect(() => deriveMatrixTopology({
      ...sampled,
      scope: {
        kind: 'sampled',
        parentScope: 'global_merged',
        sourceConnectionCount: 0,
        retainedConnectionCount: 1,
      },
    })).toThrowError(expect.objectContaining({ code: 'SCOPE_MERGE_CONFLICT' }));

    const retainedMultapse = {
      ...sampled,
      sourceIds: ['s', 's'],
      targetIds: ['t', 't'],
      scope: {
        kind: 'sampled',
        parentScope: 'global_merged',
        sourceConnectionCount: 20,
        retainedConnectionCount: 2,
      },
    } satisfies MatrixTopologyInput;
    expect(deriveAdjacencyMatrix(retainedMultapse, 'binary_presence', 'sum').presentCells[0])
      .toMatchObject({ cellValue: 1, multiplicity: null, retainedConnectionRows: 2 });
    expect(() => deriveAdjacencyMatrix(retainedMultapse, 'binary_presence', 'no_aggregation'))
      .toThrowError(expect.objectContaining({ code: 'SCOPE_INCOMPATIBLE_WITH_SKILL' }));

    const retainedAutapse = deriveAdjacencyMatrix({
      ...sampled,
      sourceIds: ['s'],
      targetIds: ['s'],
    }, 'binary_presence', 'sum');
    expect(retainedAutapse.tableCells.find((cell) => cell.rowIndex === 0 && cell.columnIndex === 0))
      .toMatchObject({ state: 'present', isAutapse: true, cellValue: 1 });
  });

  it('distinguishes measured zero, partial missing, all-missing, absence, and not_observed', () => {
    const complete = input({
      nodeIds: ['s', 't', 'u', 'v'],
      sourceIds: ['s', 'u', 'v', 'v'],
      targetIds: ['t', 't', 't', 't'],
      edgeIds: ['zero', 'partial-finite', 'partial-null', 'all-null'],
      synapseModels: undefined,
      enumeration: 'dense',
      maximumMaterializedCells: 16,
    });
    const weights = deriveWeightMatrix(complete, [0, 7, 5, null], 'sum');
    const byPair = (target: string, source: string) => weights.tableCells.find(
      (cell) => cell.targetId === target && cell.sourceId === source,
    )!;
    expect(byPair('t', 's')).toMatchObject({ state: 'valued', aggregate: 0, weightMin: 0, weightMax: 0 });
    expect(byPair('t', 'v')).toMatchObject({ state: 'present_with_missing_value', aggregate: null });
    expect(byPair('t', 'u')).toMatchObject({ state: 'valued', aggregate: 7 });
    expect(byPair('s', 's')).toMatchObject({ state: 'absent', aggregate: null });

    const allMissing = deriveWeightMatrix(input({
      nodeIds: ['s', 't'], sourceIds: ['s'], targetIds: ['t'], edgeIds: ['m'], synapseModels: undefined,
    }), [null], 'sum');
    expect(allMissing.presentCells[0]).toMatchObject({
      state: 'present_without_value', aggregate: null, contributingWeightCount: 0, missingWeightCount: 1,
    });
  });

  it('keeps signed aggregates and exact sums invariant under request-row permutation', () => {
    const values = [Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE];
    const base = input({
      nodeIds: ['s', 't'],
      sourceIds: ['s', 's', 's'],
      targetIds: ['t', 't', 't'],
      edgeIds: ['a', 'b', 'c'],
      synapseModels: undefined,
    });
    const permutations = [
      [0, 1, 2], [2, 1, 0], [1, 2, 0],
    ];
    const sums = permutations.map((order) => deriveWeightMatrix({
      ...base,
      sourceIds: order.map((index) => base.sourceIds[index]),
      targetIds: order.map((index) => base.targetIds[index]),
      edgeIds: order.map((index) => base.edgeIds![index]),
    }, order.map((index) => values[index]), 'sum').presentCells[0].aggregate);
    expect(sums).toEqual([Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE]);

    const signed = deriveWeightMatrix(input({
      nodeIds: ['s1', 's2', 't'],
      sourceIds: ['s1', 's2'],
      targetIds: ['t', 't'],
      edgeIds: ['negative', 'positive'],
      synapseModels: undefined,
    }), [-2, 3], 'sum');
    expect(signed.presentCells.map((cell) => cell.aggregate)).toEqual([-2, 3]);

    expect(() => deriveWeightMatrix(input({
      nodeIds: ['s', 't'],
      sourceIds: ['s', 's'],
      targetIds: ['t', 't'],
      edgeIds: ['overflow-a', 'overflow-b'],
      synapseModels: undefined,
    }), [Number.MAX_VALUE, Number.MAX_VALUE], 'sum'))
      .toThrowError(expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      }));
  });

  it('derives positive delay ranges and converts every derived scalar at most once', () => {
    const base = input({
      nodeIds: ['s', 't'],
      sourceIds: ['s', 's'],
      targetIds: ['t', 't'],
      edgeIds: ['slow', 'fast'],
      synapseModels: undefined,
    });
    const delay = deriveDelayMatrix(base, [1000, 3000], 'mean', 'us', 'ms');
    expect(delay.presentCells[0]).toMatchObject({
      delayAggregate: 2,
      delayMin: 1,
      delayMax: 3,
      displayUnit: 'ms',
      unitConversionCount: 1,
      contributingConnectionCount: 2,
    });
    expect(() => deriveDelayMatrix(base, [0, 3], 'mean', 'ms'))
      .toThrowError(expect.objectContaining({ code: 'SCIENCE_DELAY_NONPOSITIVE' }));
    expect(() => deriveDelayMatrix(base, [null as unknown as number, 3], 'mean', 'ms'))
      .toThrowError(expect.objectContaining({ code: 'SCIENCE_DELAY_NONPOSITIVE' }));
    expect(() => deriveDelayMatrix(base, [1, 3], 'no_aggregation', 'ms'))
      .toThrowError(expect.objectContaining({ code: 'SCIENCE_AGGREGATION_REQUIRED' }));
  });

  it('bounds dense alternative-table materialization before allocation', () => {
    expect(() => deriveMatrixTopology(input({
      enumeration: 'dense',
      maximumMaterializedCells: 8,
    }))).toThrowError(expect.objectContaining({ code: 'RESOURCE_MATRIX_CELLS_EXCEEDED' }));
  });

  it('keeps no-aggregation failures typed', () => {
    try {
      deriveWeightMatrix(input(), [1, 2, 3, 4], 'no_aggregation');
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(MatrixDerivationError);
      expect((error as MatrixDerivationError).code).toBe('SCIENCE_AGGREGATION_REQUIRED');
    }
  });
});
