/**
 * Inter-spike intervals.
 *
 * An ISI is the interval between two SUCCESSIVE events of the same train. The single
 * most important property here is what does NOT happen: an interval is never formed
 * between two neurons, and never across a trial boundary. Sort a mixed multi-neuron
 * event list by time and take successive differences and you get the intervals between
 * *whichever neuron fired next* — a quantity with no name, that looks exactly like an
 * ISI distribution and is not one.
 *
 * `groupByTrain` does the grouping before any differencing, so the cross-train interval
 * is structurally impossible rather than merely discouraged.
 */

import { groupByTrain, type EventTable } from './events.js';

export interface IsiResult {
  /** Every within-train interval, in the order the trains were visited. */
  readonly intervals: number[];
  /** How many distinct trains contributed. */
  readonly trainCount: number;
  /** Trains with fewer than two events — they yield no interval. */
  readonly trainsWithoutInterval: number;
  /** Intervals that were exactly zero (coincident same-sender events). */
  readonly zeroIntervals: number;
  readonly receipt: {
    readonly operation: 'isi.within_train';
    readonly sortedWithinTrain: true;
    readonly totalEvents: number;
    readonly totalIntervals: number;
  };
}

export function computeIsi(events: EventTable): IsiResult {
  const groups = groupByTrain(events);
  const intervals: number[] = [];
  let trainsWithoutInterval = 0;
  let zeroIntervals = 0;

  for (const indices of groups.values()) {
    if (indices.length < 2) {
      trainsWithoutInterval++;
      continue;
    }
    for (let i = 1; i < indices.length; i++) {
      const interval = events.time[indices[i]] - events.time[indices[i - 1]];
      // The group is ascending in time, so a negative interval is impossible unless the
      // input contained a non-time. That is caught upstream by isi.within_train_only;
      // here we simply record what the sorted train produces.
      if (interval === 0) zeroIntervals++;
      intervals.push(interval);
    }
  }

  return {
    intervals,
    trainCount: groups.size,
    trainsWithoutInterval,
    zeroIntervals,
    receipt: {
      operation: 'isi.within_train',
      sortedWithinTrain: true,
      totalEvents: events.time.length,
      totalIntervals: intervals.length,
    },
  };
}
