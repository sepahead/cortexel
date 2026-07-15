/**
 * Recursively freeze a value owned by Cortexel.
 *
 * This helper is deliberately not an untrusted-input boundary. Callers use it only
 * after `parseJsonStrict` or `snapshotValue` has reduced input to an acyclic tree of
 * plain JSON values, or on objects assembled entirely inside Cortexel. Freezing that
 * tree closes a time-of-check/time-of-use gap: a digest and the data it names cannot
 * diverge because a later caller mutates a nested array.
 */
export function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || typeof value !== 'object') return value;

  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen);
  }

  return Object.freeze(value);
}
