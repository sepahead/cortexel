/**
 * The materialized-value boundary.
 *
 * When a caller hands Cortexel a JavaScript object rather than JSON text, the
 * object may be actively hostile: getters that run code, a Proxy whose traps
 * throw, a `toJSON` that returns a different shape the second time it is asked, a
 * class instance that merely looks like data.
 *
 * The governing rule of this file: **never ask the value a question it can answer
 * with code.** No property is READ; property DESCRIPTORS are inspected, and only
 * an own, enumerable, data property is eligible. `String(value)`, `value.toString()`,
 * `JSON.stringify(value)`, `instanceof`, and `Symbol.toPrimitive` are all
 * caller-controlled execution and none of them appears here.
 *
 * And the honest part: this boundary CANNOT detect a duplicate object member. By
 * the time a JavaScript value exists, `JSON.parse` has already discarded one of
 * them. So the result records `duplicateKeys: "not_observable_after_materialization"`
 * rather than implying a check it did not perform.
 */

import { makeError, type CortexelError, type Result, err, ok } from './errors.js';
import type { JsonValue, JsonObject } from './parse-json.js';
import type { BudgetLimits } from './limits.js';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

class SnapshotFailure extends Error {
  readonly diagnostic: CortexelError;
  constructor(diagnostic: CortexelError) {
    super(diagnostic.message);
    this.name = 'SnapshotFailure';
    this.diagnostic = diagnostic;
  }
}

/**
 * Every reflective operation is wrapped, because a Proxy trap can throw. A thrown
 * value is NOT inspected — inspecting it would be a second chance to run code — it
 * is collapsed into a category and the value is abandoned.
 */
function reflect<T>(operation: () => T, path: string): T {
  try {
    return operation();
  } catch {
    throw new SnapshotFailure(
      makeError({
        code: 'SNAPSHOT_HOSTILE_REFLECTION',
        stage: 'snapshot',
        instancePath: path,
        message: 'reflecting on this value threw; it is treated as hostile and is not inspected again',
      }),
    );
  }
}

function isWellFormedString(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

interface SnapshotState {
  readonly limits: BudgetLimits;
  nodes: number;
  /** Ancestors on the current branch. A cycle is a defect, not something to truncate. */
  readonly seen: Set<object>;
}

function fail(
  code: Parameters<typeof makeError>[0]['code'],
  path: string,
  message: string,
  actual?: unknown,
): never {
  throw new SnapshotFailure(
    makeError({
      code,
      stage: 'snapshot',
      instancePath: path,
      message,
      ...(actual !== undefined ? { actual } : {}),
    }),
  );
}

function snapshotNode(value: unknown, path: string, depth: number, state: SnapshotState): JsonValue {
  if (depth > state.limits.jsonDepth) {
    fail('SNAPSHOT_DEPTH_EXCEEDED', path, 'the value nests deeper than the snapshot permits');
  }

  state.nodes++;
  if (state.nodes > state.limits.jsonTotalNodes) {
    fail('SNAPSHOT_NODES_EXCEEDED', path, 'the value graph exceeds the total node limit');
  }

  if (value === null) return null;

  switch (typeof value) {
    case 'boolean':
      return value;

    case 'number':
      if (!Number.isFinite(value)) {
        fail(
          'SNAPSHOT_NON_FINITE_NUMBER',
          path,
          'NaN and Infinity are not measurements; use null for a missing observation',
          value,
        );
      }
      return value;

    case 'string':
      if (!isWellFormedString(value)) {
        fail(
          'SNAPSHOT_MALFORMED_STRING',
          path,
          'the string contains a lone surrogate and is not well-formed Unicode',
        );
      }
      if (value.length > state.limits.jsonStringLength) {
        fail(
          'SNAPSHOT_STRING_TOO_LONG',
          path,
          `the string contains ${value.length} UTF-16 code units, over the active limit of ${state.limits.jsonStringLength}`,
        );
      }
      return value;

    case 'undefined':
      fail('SNAPSHOT_UNSUPPORTED_TYPE', path, 'undefined is not a JSON value', value);
    // eslint-disable-next-line no-fallthrough
    case 'function':
      fail('SNAPSHOT_UNSUPPORTED_TYPE', path, 'a function is not data', value);
    // eslint-disable-next-line no-fallthrough
    case 'symbol':
      fail('SNAPSHOT_UNSUPPORTED_TYPE', path, 'a symbol is not a JSON value', value);
    // eslint-disable-next-line no-fallthrough
    case 'bigint':
      fail(
        'SNAPSHOT_UNSUPPORTED_TYPE',
        path,
        'a bigint has no JSON representation; send a number or a string',
        value,
      );
    // eslint-disable-next-line no-fallthrough
    case 'object':
      break;

    default:
      fail('SNAPSHOT_UNSUPPORTED_TYPE', path, 'the value is of an unsupported type', value);
  }

  const object = value as object;

  // A cycle cannot be serialized and cannot be hashed. It is rejected rather than
  // truncated, because a truncated graph is a different graph.
  if (state.seen.has(object)) {
    fail('SNAPSHOT_CIRCULAR_REFERENCE', path, 'the value graph contains a cycle');
  }

  // A typed array is not part of the public JSON contract. Adapters accept them at
  // their own boundary; a figure REQUEST does not.
  if (reflect(() => ArrayBuffer.isView(object), path)) {
    fail(
      'SNAPSHOT_NON_PLAIN_OBJECT',
      path,
      'a typed array or DataView is not part of the JSON request contract; use a plain array',
    );
  }

  const isArray = reflect(() => Array.isArray(object), path);
  const prototype = reflect(() => Object.getPrototypeOf(object), path);

  if (!isArray && prototype !== Object.prototype && prototype !== null) {
    // Date, Map, Set, Promise, RegExp, and every class instance land here. None of
    // them has a JSON meaning that Cortexel is willing to guess at.
    fail(
      'SNAPSHOT_NON_PLAIN_OBJECT',
      path,
      'only plain objects and arrays are accepted; a class instance, Date, Map, Set, or Promise is not data',
    );
  }

  state.seen.add(object);
  try {
    return isArray
      ? snapshotArray(object as unknown[], path, depth, state)
      : snapshotObject(object, path, depth, state);
  } finally {
    state.seen.delete(object);
  }
}

function snapshotArray(
  array: unknown[],
  path: string,
  depth: number,
  state: SnapshotState,
): JsonValue[] {
  // Do not perform an ordinary property read here. An Array Proxy can answer
  // `array.length` through its caller-controlled `get` trap even though a real
  // array's length is always an own data property. Descriptor inspection keeps
  // accessor policy uniform with every element below and never calls a `get` trap.
  const lengthDescriptor = reflect(
    () => Object.getOwnPropertyDescriptor(array, 'length'),
    path,
  );
  if (
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value')
  ) {
    fail('SNAPSHOT_NON_PLAIN_OBJECT', path, 'the array has no intrinsic data length');
  }
  const length = lengthDescriptor.value;

  if (!Number.isSafeInteger(length) || length < 0) {
    fail('SNAPSHOT_NON_PLAIN_OBJECT', path, 'the array reports an implausible length');
  }
  if (length > state.limits.jsonArrayItems) {
    fail('SNAPSHOT_NODES_EXCEEDED', path, 'the array is longer than the snapshot permits');
  }

  // Own keys, not a for..in and not a map(): both would skip holes, and a hole is
  // exactly the thing we need to catch. An array with a hole is not a dense list of
  // observations, and treating index 3 of [1,,3] as "3" would silently shift data.
  const keys = reflect(() => Reflect.ownKeys(array), path);
  const out: JsonValue[] = [];

  for (let index = 0; index < length; index++) {
    const descriptor = reflect(
      () => Object.getOwnPropertyDescriptor(array, index),
      `${path}/${index}`,
    );
    if (descriptor === undefined) {
      fail(
        'SNAPSHOT_SPARSE_ARRAY',
        `${path}/${index}`,
        'the array has a hole; use an explicit null for a missing observation',
      );
    }
    if (!('value' in descriptor)) {
      fail(
        'SNAPSHOT_ACCESSOR_PROPERTY',
        `${path}/${index}`,
        'the element is defined by a getter; Cortexel will not invoke caller code to read data',
      );
    }
    out.push(snapshotNode(descriptor.value, `${path}/${index}`, depth + 1, state));
  }

  // A named property on an array ("decorated array") carries information that the
  // JSON array form cannot represent. Silently dropping it would lose data.
  for (const key of keys) {
    if (typeof key === 'symbol') {
      fail('SNAPSHOT_SYMBOL_KEY', path, 'the array carries a symbol-keyed property');
    }
    if (key === 'length') continue;
    // Number("01"), Number("1e0"), Number(" 1"), and Number("-0") all
    // produce plausible indices, but none of those strings is an ArrayIndex property
    // name. Accepting them would silently drop a decorated-array member from the JSON
    // snapshot. Require the one canonical decimal spelling used by real array indices.
    const canonicalIndex = /^(?:0|[1-9][0-9]*)$/u.test(key) ? Number(key) : -1;
    if (Number.isSafeInteger(canonicalIndex) && canonicalIndex >= 0 && canonicalIndex < length) {
      continue;
    }
    fail(
      'SNAPSHOT_DECORATED_ARRAY',
      path,
      `the array carries the named property ${JSON.stringify(String(key))}, which a JSON array cannot represent`,
    );
  }

  return out;
}

function snapshotObject(
  object: object,
  path: string,
  depth: number,
  state: SnapshotState,
): JsonObject {
  const keys = reflect(() => Reflect.ownKeys(object), path);
  const out = Object.create(null) as JsonObject;
  let count = 0;

  for (const key of keys) {
    if (typeof key === 'symbol') {
      fail('SNAPSHOT_SYMBOL_KEY', path, 'the object carries a symbol-keyed property');
    }

    const childPath = `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`;

    if (DANGEROUS_KEYS.has(key)) {
      fail(
        'SNAPSHOT_DANGEROUS_KEY',
        childPath,
        `the key ${JSON.stringify(key)} can reach Object.prototype and is rejected`,
      );
    }

    const descriptor = reflect(() => Object.getOwnPropertyDescriptor(object, key), childPath);
    if (descriptor === undefined) continue;

    // Not enumerable: it would not have survived JSON.stringify either. Skipping is
    // the faithful choice; failing would reject ordinary objects for no gain.
    if (!descriptor.enumerable) continue;

    // THE accessor rule. Reading this property would call caller code — during
    // validation of untrusted input, which is precisely when we must not.
    if (!('value' in descriptor)) {
      fail(
        'SNAPSHOT_ACCESSOR_PROPERTY',
        childPath,
        'the property is defined by a getter or setter; Cortexel inspects descriptors and will not invoke caller code to read data',
      );
    }

    count++;
    if (count > state.limits.jsonObjectKeys) {
      fail('SNAPSHOT_NODES_EXCEEDED', path, 'the object has more members than the snapshot permits');
    }

    out[key] = snapshotNode(descriptor.value, childPath, depth + 1, state);
  }

  return out;
}

/**
 * Take an intrinsic-safe, accessor-free, bounded snapshot of a JavaScript value.
 *
 * The returned value is a fresh, detached, null-prototype structure. Nothing the
 * caller does to the original afterwards can change what Cortexel validated — which
 * closes the time-of-check/time-of-use gap that a live reference would leave open.
 */
export function snapshotValue(value: unknown, limits: BudgetLimits): Result<JsonValue> {
  const state: SnapshotState = { limits, nodes: 0, seen: new Set() };
  try {
    return ok(snapshotNode(value, '', 0, state));
  } catch (error) {
    if (error instanceof SnapshotFailure) {
      return err([error.diagnostic]);
    }
    return err([
      makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        message: 'the snapshot failed in an unexpected way; this is a Cortexel defect',
      }),
    ]);
  }
}
