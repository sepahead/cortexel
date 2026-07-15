/**
 * Network topology derivations.
 *
 * Degree counting and matrix construction, with the two properties that distinguish a
 * correct implementation from a plausible one:
 *
 *   Multapses are preserved. Two connections between the same pair are two connections.
 *   `count_edges` counts them both; `count_unique_neighbours` counts the pair once. The
 *   difference is scientific, and the caller declares which they mean.
 *
 *   Absent is not zero. A matrix cell that was never observed is a distinct state from a
 *   cell whose weight is zero. Building a dense matrix and initializing it to zero would
 *   erase that distinction — so a cell is present only if a connection put it there.
 */

export interface DegreeResult {
  /** Degree per node, in the node-universe order. Includes zero-degree nodes. */
  readonly degree: number[];
  readonly nodeIds: readonly string[];
  readonly direction: 'in' | 'out';
  readonly countingPolicy: 'count_edges' | 'count_unique_neighbours';
  readonly totalConnections: number;
}

/**
 * Degree distribution over a declared node universe.
 *
 * Every node in the universe gets a degree — including nodes that appear in no edge,
 * which get degree zero. That is only meaningful because the universe was DECLARED: an
 * edge list alone could not distinguish "degree zero" from "not mentioned".
 */
export function computeDegrees(
  nodeIds: readonly string[],
  sourceIds: readonly string[],
  targetIds: readonly string[],
  direction: 'in' | 'out',
  countingPolicy: 'count_edges' | 'count_unique_neighbours',
): DegreeResult {
  const index = new Map<string, number>();
  nodeIds.forEach((id, i) => index.set(id, i));

  const degree = new Array<number>(nodeIds.length).fill(0);
  const neighbours = countingPolicy === 'count_unique_neighbours'
    ? nodeIds.map(() => new Set<string>())
    : undefined;

  const n = Math.min(sourceIds.length, targetIds.length);
  for (let e = 0; e < n; e++) {
    // For in-degree the counted node is the TARGET and its neighbour is the source;
    // for out-degree it is the reverse.
    const countedId = direction === 'in' ? targetIds[e] : sourceIds[e];
    const neighbourId = direction === 'in' ? sourceIds[e] : targetIds[e];

    const i = index.get(countedId);
    if (i === undefined) continue; // an endpoint outside the universe is caught upstream

    if (neighbours) {
      neighbours[i].add(neighbourId);
    } else {
      degree[i]++;
    }
  }

  if (neighbours) {
    for (let i = 0; i < degree.length; i++) degree[i] = neighbours[i].size;
  }

  return { degree, nodeIds, direction, countingPolicy, totalConnections: n };
}

export interface SparseMatrix {
  /** Only cells that a connection actually produced. Absent cells are not here. */
  readonly cells: { row: number; col: number; value: number; contributingCount: number }[];
  readonly rowIds: readonly string[];
  readonly colIds: readonly string[];
  readonly aggregation: string;
}

/**
 * Build a sparse target-row / source-column matrix.
 *
 * Sparse on purpose: a present cell exists only because a connection created it, so an
 * absent cell is genuinely "not observed", never a materialized zero. Multapses landing
 * in one cell are combined by the declared aggregation, and the count of contributors is
 * retained so the table can show that a cell is an aggregate of several synapses.
 */
export function computeMatrix(
  rowIds: readonly string[],
  colIds: readonly string[],
  sourceIds: readonly string[],
  targetIds: readonly string[],
  values: readonly number[] | undefined,
  aggregation: 'sum' | 'mean' | 'min' | 'max' | 'no_aggregation' | 'count',
): SparseMatrix {
  const rowIndex = new Map<string, number>();
  rowIds.forEach((id, i) => rowIndex.set(id, i));
  const colIndex = new Map<string, number>();
  colIds.forEach((id, i) => colIndex.set(id, i));

  // Accumulate contributions per cell before aggregating, so `mean` and `count` are
  // correct and `no_aggregation` can detect a genuine multapse.
  const accumulator = new Map<string, number[]>();

  const n = Math.min(sourceIds.length, targetIds.length);
  for (let e = 0; e < n; e++) {
    const row = rowIndex.get(targetIds[e]);
    const col = colIndex.get(sourceIds[e]);
    if (row === undefined || col === undefined) continue;

    const key = `${row} ${col}`;
    const value = aggregation === 'count' ? 1 : values ? values[e] : 1;

    const list = accumulator.get(key);
    if (list) list.push(value);
    else accumulator.set(key, [value]);
  }

  const cells: SparseMatrix['cells'] = [];
  for (const [key, contributions] of accumulator) {
    const [row, col] = key.split(' ').map(Number);
    cells.push({
      row,
      col,
      value: aggregate(contributions, aggregation),
      contributingCount: contributions.length,
    });
  }

  // Deterministic order — row then column — so the serialized matrix is reproducible.
  cells.sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));

  return { cells, rowIds, colIds, aggregation };
}

function aggregate(
  values: readonly number[],
  method: 'sum' | 'mean' | 'min' | 'max' | 'no_aggregation' | 'count',
): number {
  switch (method) {
    case 'count':
      return values.length;
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'mean':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'no_aggregation':
      // The upstream validator guarantees a single contributor here, but if somehow more
      // arrive we sum rather than silently pick one — the honest failure being visible.
      return values.length === 1 ? values[0] : values.reduce((a, b) => a + b, 0);
    default:
      return values[0];
  }
}
