/** Bounded numeric reductions that never spread an untrusted-length array as arguments. */

export interface NumericExtent {
  readonly min: number;
  readonly max: number;
}

/** Return the finite numeric extent, or undefined when there is no finite value. */
export function finiteExtent(values: Iterable<number>): NumericExtent | undefined {
  let min = Infinity;
  let max = -Infinity;
  let found = false;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
    found = true;
  }
  return found ? { min, max } : undefined;
}

/** Projection form, avoiding a potentially huge temporary `map` allocation. */
export function finiteExtentBy<T>(
  values: Iterable<T>,
  project: (value: T) => number,
): NumericExtent | undefined {
  let min = Infinity;
  let max = -Infinity;
  let found = false;
  for (const item of values) {
    const value = project(item);
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
    found = true;
  }
  return found ? { min, max } : undefined;
}
