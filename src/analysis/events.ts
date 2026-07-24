/**
 * The internal event model shared by every spike analysis.
 *
 * Recorder output is NOT assumed to be chronological — NEST does not guarantee it, and
 * assuming it silently corrupts intervals. So analysis carries the original ordinal and
 * sorts explicitly for the operation that needs it, while a receipt records that the
 * sort happened. Duplicate events are PRESERVED: two records of the same event are a
 * source-data question, not something the analysis quietly resolves.
 */

export interface EventTable {
  readonly time: readonly number[];
  readonly senderId: readonly string[];
  readonly trialId?: readonly string[];
  /** The original row index, retained so a stable sort is reproducible and auditable. */
  readonly ordinal: readonly number[];
}

export function makeEventTable(
  time: readonly number[],
  senderId: readonly string[],
  trialId?: readonly string[],
): EventTable {
  if (time.length !== senderId.length) {
    throw new Error('event times and senders must be equal length');
  }
  if (trialId && trialId.length !== time.length) {
    throw new Error('event trial ids must match event count');
  }
  return {
    time,
    senderId,
    ...(trialId ? { trialId } : {}),
    ordinal: time.map((_unused, index) => index),
  };
}

/**
 * A stable ordering of event indices by (trial, sender, time, ordinal).
 *
 * Returns an index permutation rather than reordering the arrays, so the caller keeps
 * the original order and can record that a sort was applied. The final tie-break on
 * ordinal is what makes the sort STABLE and therefore reproducible across
 * implementations — two events identical in every scientific field still have a
 * defined order.
 */
export function stableEventOrder(events: EventTable): number[] {
  const order = events.ordinal.slice();
  const { time, senderId, trialId } = events;

  order.sort((a, b) => {
    if (trialId) {
      const ta = trialId[a];
      const tb = trialId[b];
      if (ta !== tb) return ta < tb ? -1 : 1;
    }
    const sa = senderId[a];
    const sb = senderId[b];
    if (sa !== sb) return sa < sb ? -1 : 1;
    if (time[a] !== time[b]) return time[a] - time[b];
    return a - b; // ordinal — the stable tie-break
  });

  return order;
}

/**
 * Group event indices by (sender, trial), each group in ascending time order.
 *
 * This is the operation ISI relies on: an interval is only ever formed between two
 * successive events of the SAME group. There is no code path that could form one across
 * groups, because groups are built before any differencing happens.
 */
export function groupByTrain(events: EventTable): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  const { senderId, trialId } = events;

  for (let i = 0; i < senderId.length; i++) {
    const key = trialId ? `${senderId[i]}\u0000${trialId[i]}` : senderId[i];
    const group = groups.get(key);
    if (group) group.push(i);
    else groups.set(key, [i]);
  }

  for (const indices of groups.values()) {
    indices.sort((a, b) => (events.time[a] !== events.time[b] ? events.time[a] - events.time[b] : a - b));
  }

  return groups;
}

/** The only event-window closures admitted by the version-1 request contract. */
export type EventWindowBoundary = '[start,stop)' | '[start,stop]' | '(start,stop]';

/**
 * Partition events under an explicit boundary convention.
 *
 * `inWindow` remains aligned with the source array. `inside` is an index list rather
 * than a copied value list so duplicate events retain distinct identities. Values on
 * an open boundary are counted with that side's exclusion count.
 */
export function partitionByWindow(
  times: readonly number[],
  start: number,
  stop: number,
  boundary: EventWindowBoundary,
): {
  inside: number[];
  inWindow: boolean[];
  excludedBelow: number;
  excludedAbove: number;
} {
  const inside: number[] = [];
  const inWindow = new Array<boolean>(times.length).fill(false);
  let excludedBelow = 0;
  let excludedAbove = 0;
  const openStart = boundary === '(start,stop]';
  const closedStop = boundary !== '[start,stop)';

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (openStart ? t <= start : t < start) {
      excludedBelow++;
    } else if (closedStop ? t > stop : t >= stop) {
      excludedAbove++;
    } else {
      inside.push(i);
      inWindow[i] = true;
    }
  }

  return { inside, inWindow, excludedBelow, excludedAbove };
}
