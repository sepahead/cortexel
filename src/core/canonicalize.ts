/**
 * RFC 8785 — JSON Canonicalization Scheme (JCS).
 *
 * This is the function that decides whether two independent implementations can
 * agree on what a figure IS. If TypeScript and Python disagree on one byte here,
 * every digest, every artifact identity, and every reproducibility claim in the
 * project is worthless. So it is implemented deliberately, tested against the
 * official RFC 8785 vectors, and never described as "sorted JSON.stringify" —
 * that is a different thing that happens to look similar.
 *
 * The scheme, exactly:
 *
 *   - Object members are sorted by their names, compared as sequences of UTF-16
 *     code units (RFC 8785 §3.2.3). JavaScript's default string `<` and
 *     `Array.prototype.sort()` already compare UTF-16 code units, which is why
 *     a bare `.sort()` is correct here and a locale-aware collator would not be.
 *   - Numbers use the ECMAScript Number-to-String algorithm (§3.2.2.3), which is
 *     what `JSON.stringify` emits. `-0` serializes as `0`.
 *   - Strings use the shortest legal JSON escapes (§3.2.2.2) — which is what
 *     `JSON.stringify` emits.
 *   - No insignificant whitespace anywhere.
 *
 * The JCS domain is finite, well-formed JSON. Values outside it — NaN, Infinity,
 * a lone surrogate — are REJECTED rather than coerced, because there is no
 * canonical form for a value the scheme does not define.
 */

import { sha256Digest } from './sha256.js';

export class CanonicalizationError extends Error {
  readonly path: string;
  constructor(message: string, path: string) {
    super(message);
    this.name = 'CanonicalizationError';
    this.path = path;
  }
}

/** A value that is inside the JCS domain. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * A lone surrogate has no UTF-8 encoding, so it has no canonical byte sequence
 * and cannot be hashed reproducibly. It is a defect at the boundary, not
 * something to paper over with a replacement character.
 */
function assertWellFormed(text: string, path: string): void {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new CanonicalizationError('unpaired high surrogate', path);
      }
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new CanonicalizationError('unpaired low surrogate', path);
    }
  }
}

function serializeNumber(value: number, path: string): string {
  if (!Number.isFinite(value)) {
    throw new CanonicalizationError(
      'non-finite numbers are outside the JCS domain and have no canonical form',
      path,
    );
  }
  // JSON.stringify implements ECMAScript Number-to-String, and maps -0 to "0".
  return JSON.stringify(value);
}

function safeOwnKeys(value: object, path: string): (string | symbol)[] {
  try {
    return Reflect.ownKeys(value);
  } catch {
    throw new CanonicalizationError('object keys could not be inspected without executing a hostile trap', path);
  }
}

function safeDescriptor(value: object, key: PropertyKey, path: string): PropertyDescriptor {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor) return descriptor;
  } catch {
    // Reframed below as a deterministic domain error.
  }
  throw new CanonicalizationError('an object member could not be inspected safely', path);
}

function childPath(path: string, key: string): string {
  return `${path}/${key.replace(/~/gu, '~0').replace(/\//gu, '~1')}`;
}

function serialize(value: unknown, path: string, depth: number): string {
  if (depth > 128) {
    throw new CanonicalizationError('value nests deeper than the canonicalizer permits', path);
  }

  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';

    case 'number':
      return serializeNumber(value, path);

    case 'string':
      assertWellFormed(value, path);
      return JSON.stringify(value);

    case 'object':
      break;

    default:
      throw new CanonicalizationError(
        `values of type ${typeof value} are outside the JCS domain`,
        path,
      );
  }

  let array = false;
  try {
    array = Array.isArray(value);
  } catch {
    throw new CanonicalizationError('the value could not be inspected safely', path);
  }

  if (array) {
    // Array ORDER is data. It is never sorted — sorting an event sequence would
    // silently change what the figure says.
    const keys = safeOwnKeys(value as object, path);
    const lengthDescriptor = safeDescriptor(value as object, 'length', path);
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new CanonicalizationError('array length is outside the canonical JSON domain', path);
    }
    const indexKeys: string[] = [];
    for (const key of keys) {
      if (typeof key === 'symbol') {
        throw new CanonicalizationError('symbol-keyed array members are outside the JSON domain', path);
      }
      if (key === 'length') continue;
      const index = Number(key);
      if (!/^(0|[1-9][0-9]*)$/u.test(key) || !Number.isSafeInteger(index) || index >= length) {
        throw new CanonicalizationError('named array members are outside the JSON domain', path);
      }
      const descriptor = safeDescriptor(value as object, key, childPath(path, key));
      if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new CanonicalizationError('array accessors and hidden members are outside the JSON domain', path);
      }
      indexKeys.push(key);
    }
    if (indexKeys.length !== length) {
      throw new CanonicalizationError('sparse arrays are outside the canonical JSON domain', path);
    }
    indexKeys.sort((left, right) => Number(left) - Number(right));
    const parts: string[] = [];
    for (const key of indexKeys) {
      const at = childPath(path, key);
      const descriptor = safeDescriptor(value as object, key, at);
      parts.push(serialize(descriptor.value, at, depth + 1));
    }
    return `[${parts.join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(record);
  } catch {
    throw new CanonicalizationError('the object prototype could not be inspected safely', path);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalizationError(
      'only plain objects can be canonicalized; a class instance has no canonical JSON form',
      path,
    );
  }

  // UTF-16 code-unit ordering, per RFC 8785 §3.2.3. Default sort() is exactly this.
  const ownKeys = safeOwnKeys(record, path);
  const keys: string[] = [];
  for (const key of ownKeys) {
    if (typeof key === 'symbol') {
      throw new CanonicalizationError('symbol-keyed members are outside the JSON domain', path);
    }
    const descriptor = safeDescriptor(record, key, childPath(path, key));
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new CanonicalizationError('accessors and hidden members are outside the JSON domain', path);
    }
    keys.push(key);
  }
  keys.sort();

  const parts: string[] = [];
  for (const key of keys) {
    assertWellFormed(key, path);
    const at = childPath(path, key);
    const child = safeDescriptor(record, key, at).value;
    // `undefined` is not a JSON value. JSON.stringify silently DROPS such a
    // member, which would let two semantically different objects canonicalize to
    // the same bytes. Rejecting is the only safe answer.
    if (child === undefined) {
      throw new CanonicalizationError(
        `member ${JSON.stringify(key)} is undefined; undefined is not a JSON value`,
        at,
      );
    }
    parts.push(`${JSON.stringify(key)}:${serialize(child, at, depth + 1)}`);
  }
  return `{${parts.join(',')}}`;
}

/** Canonicalize a JSON-compatible value to its RFC 8785 byte sequence, as a string. */
export function canonicalize(value: unknown): string {
  return serialize(value, '', 0);
}

const UTF8 = new TextEncoder();

/** The canonical UTF-8 bytes. This is what actually gets hashed. */
export function canonicalBytes(value: unknown): Uint8Array {
  return UTF8.encode(canonicalize(value));
}

/**
 * SHA-256 over the canonical bytes of a value: `sha256:<64 hex>`.
 *
 * Two implementations that agree here agree on identity. That is the whole point.
 */
export function canonicalDigest(value: unknown): string {
  return sha256Digest(canonicalize(value));
}

/**
 * Digest an object with one top-level member excluded.
 *
 * An artifact carries its own digest, so that field cannot be part of what is
 * hashed — a self-referential hash has no fixed point. This makes the exclusion
 * explicit and testable rather than an implicit delete somewhere in the builder.
 */
export function canonicalDigestExcluding(
  value: Record<string, unknown>,
  excludeKey: string,
): string {
  const copy: Record<string, unknown> = Object.create(null);
  for (const key of safeOwnKeys(value, '')) {
    if (typeof key === 'symbol') {
      throw new CanonicalizationError('symbol-keyed members are outside the JSON domain', '');
    }
    const descriptor = safeDescriptor(value, key, childPath('', key));
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new CanonicalizationError('accessors and hidden members are outside the JSON domain', '');
    }
    if (key !== excludeKey) copy[key] = descriptor.value;
  }
  return canonicalDigest(copy);
}
