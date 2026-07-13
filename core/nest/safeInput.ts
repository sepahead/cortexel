import type { ZodType } from 'zod';
import {
  formatValidationIssues,
  intrinsicTypedArrayLength,
  safeDiagnosticText,
} from '../safeRuntime';

export type NestInputResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

const NEST_SAFE_INPUT_LIMITS = Object.freeze({
  maxDepth: 16,
  maxNodes: 500_000,
  maxObjectKeys: 64,
  maxRootKeys: 32,
  maxFieldNameLength: 120,
  maxStringLength: 5_000,
  maxProjectedSourceKeys: 512,
});

type SnapshotResult =
  | { ok: true; value: unknown }
  | { ok: false; errors: string[] };

function fail(path: string, message: string): SnapshotResult {
  return { ok: false, errors: [`${path}: ${message}`] };
}

/**
 * Detach a NEST/adapter input without invoking user accessors. Unlike the
 * VizSpec exact-JSON boundary, numeric typed arrays are intentionally accepted:
 * they are conventional outputs from NumPy-adjacent NEST hosts. Everything else
 * is restricted to finite-depth plain data records and dense arrays.
 *
 * @internal
 */
function snapshotNestInput(input: unknown): SnapshotResult {
  const ancestors = new WeakSet<object>();
  let visited = 0;

  function visit(value: unknown, path: string, depth: number): SnapshotResult {
    visited += 1;
    if (visited > NEST_SAFE_INPUT_LIMITS.maxNodes) {
      return fail(path, `input exceeds ${NEST_SAFE_INPUT_LIMITS.maxNodes} values`);
    }
    if (depth > NEST_SAFE_INPUT_LIMITS.maxDepth) {
      return fail(path, `input nesting exceeds ${NEST_SAFE_INPUT_LIMITS.maxDepth} levels`);
    }

    if (
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'number'
    ) {
      return { ok: true, value };
    }
    if (typeof value === 'string') {
      return value.length <= NEST_SAFE_INPUT_LIMITS.maxStringLength
        ? { ok: true, value }
        : fail(path, `string exceeds ${NEST_SAFE_INPUT_LIMITS.maxStringLength} characters`);
    }
    if (typeof value !== 'object') return { ok: true, value };

    if (ArrayBuffer.isView(value)) {
      if (value instanceof DataView) {
        return fail(path, 'DataView inputs are not supported');
      }
      try {
        const typed = value as unknown as ArrayLike<unknown>;
        const length = intrinsicTypedArrayLength(value);
        if (length === undefined) {
          return fail(path, 'typed array could not be safely inspected');
        }
        if (length > NEST_SAFE_INPUT_LIMITS.maxNodes - visited) {
          return fail(path, `input exceeds ${NEST_SAFE_INPUT_LIMITS.maxNodes} values`);
        }
        const clone = new Array<unknown>(length);
        for (let index = 0; index < length; index++) {
          visited += 1;
          if (visited > NEST_SAFE_INPUT_LIMITS.maxNodes) {
            return fail(path, `input exceeds ${NEST_SAFE_INPUT_LIMITS.maxNodes} values`);
          }
          clone[index] = typed[index];
        }
        return { ok: true, value: clone };
      } catch {
        return fail(path, 'typed array could not be safely inspected');
      }
    }

    const object = value as object;
    if (ancestors.has(object)) return fail(path, 'circular input reference');
    ancestors.add(object);
    try {
      if (Array.isArray(value)) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
        if (
          !lengthDescriptor ||
          !('value' in lengthDescriptor) ||
          !Number.isSafeInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0
        ) {
          return fail(path, 'array must have an ordinary non-negative length');
        }
        const length = lengthDescriptor.value as number;
        if (length > NEST_SAFE_INPUT_LIMITS.maxNodes - visited) {
          return fail(path, `input exceeds ${NEST_SAFE_INPUT_LIMITS.maxNodes} values`);
        }
        const keys = Reflect.ownKeys(value);
        if (keys.length !== length + 1) {
          return fail(path, 'arrays must be dense and carry no named or symbol properties');
        }
        const clone = new Array<unknown>(length);
        for (let index = 0; index < length; index++) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
          if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
            return fail(
              `${path}.${index}`,
              'array entries must be enumerable data properties, not accessors',
            );
          }
          const nested = visit(descriptor.value, `${path}.${index}`, depth + 1);
          if (!nested.ok) return nested;
          clone[index] = nested.value;
        }
        return { ok: true, value: clone };
      }

      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail(path, 'input must contain plain objects, arrays, or numeric typed arrays');
      }
      const keys = Reflect.ownKeys(value);
      const maximumKeys = depth === 0
        ? NEST_SAFE_INPUT_LIMITS.maxRootKeys
        : NEST_SAFE_INPUT_LIMITS.maxObjectKeys;
      if (keys.length > maximumKeys) {
        const samples = keys.slice(0, 8).map((key) => safeDiagnosticText(
          JSON.stringify(typeof key === 'string' ? key.slice(0, 60) : '<symbol>'),
          80,
        ));
        return fail(
          path,
          `object has ${keys.length} fields; at most ${maximumKeys} are allowed (sample: ${samples.join(', ')})`,
        );
      }
      const clone: Record<string, unknown> = {};
      for (const key of keys) {
        if (typeof key !== 'string') return fail(path, 'symbol fields are not allowed');
        if (key.length > NEST_SAFE_INPUT_LIMITS.maxFieldNameLength) {
          return fail(path, `field names may contain at most ${NEST_SAFE_INPUT_LIMITS.maxFieldNameLength} characters`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          return fail(
            `${path}.${safeDiagnosticText(JSON.stringify(key), 140)}`,
            'field must be an enumerable data property, not an accessor',
          );
        }
        const nested = visit(descriptor.value, `${path}.${key}`, depth + 1);
        if (!nested.ok) return nested;
        Object.defineProperty(clone, key, {
          value: nested.value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      return { ok: true, value: clone };
    } catch {
      return fail(path, 'input could not be safely inspected');
    } finally {
      ancestors.delete(object);
    }
  }

  try {
    return visit(input, '(root)', 0);
  } catch {
    return fail('(root)', 'input could not be safely inspected');
  }
}

/** Parse through the shared no-getter/no-throw NEST adapter boundary. @internal */
export function parseNestInput<T>(
  schema: ZodType<T>,
  input: unknown,
): NestInputResult<T> {
  try {
    const snapshot = snapshotNestInput(input);
    if (!snapshot.ok) return snapshot;
    const parsed = schema.safeParse(snapshot.value);
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, errors: formatValidationIssues(parsed.error.issues) };
  } catch {
    return {
      ok: false,
      errors: ['input validation could not safely inspect the NEST payload'],
    };
  }
}

/**
 * Descriptor-project selected fields from a larger NEST status dictionary.
 * Extra device metadata is intentionally ignored without reading its values;
 * selected accessors still fail closed. @internal
 */
export function projectNestInputFields(
  input: unknown,
  fields: readonly string[],
): NestInputResult<Record<string, unknown>> {
  try {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, errors: ['(root): NEST status must be a plain object'] };
    }
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false, errors: ['(root): NEST status must be a plain object'] };
    }
    const sourceKeys = Reflect.ownKeys(input);
    if (sourceKeys.length > NEST_SAFE_INPUT_LIMITS.maxProjectedSourceKeys) {
      return {
        ok: false,
        errors: [
          `(root): NEST status exceeds ${NEST_SAFE_INPUT_LIMITS.maxProjectedSourceKeys} fields`,
        ],
      };
    }
    if (sourceKeys.some((key) => typeof key !== 'string')) {
      return { ok: false, errors: ['(root): NEST status may not contain symbol fields'] };
    }
    const present = new Set(sourceKeys as string[]);
    const projection: Record<string, unknown> = {};
    for (const field of fields) {
      if (!present.has(field)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return {
          ok: false,
          errors: [
            `${field}: selected NEST status fields must be enumerable data properties, not accessors`,
          ],
        };
      }
      Object.defineProperty(projection, field, {
        value: descriptor.value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return { ok: true, data: projection };
  } catch {
    return { ok: false, errors: ['(root): NEST status could not be safely projected'] };
  }
}
