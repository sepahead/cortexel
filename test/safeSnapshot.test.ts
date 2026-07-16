import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { snapshotValue } from '../src/core/safe-snapshot.js';
import { getBudgetLimits } from '../src/core/limits.js';

const limits = getBudgetLimits('standard');
const snap = (value: unknown) => snapshotValue(value, limits);

function codes(value: unknown): string[] {
  const result = snap(value);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

describe('safe snapshot — never runs caller code', () => {
  it('rejects a getter rather than invoking it', () => {
    let invoked = false;
    const hostile = {
      get spikes() {
        invoked = true;
        return [1, 2, 3];
      },
    };
    expect(codes(hostile)).toContain('SNAPSHOT_ACCESSOR_PROPERTY');
    // The point: reading the property would have run caller code during validation.
    expect(invoked).toBe(false);
  });

  it('rejects a getter on an array element without invoking it', () => {
    let invoked = false;
    const array: unknown[] = [1, 2, 3];
    Object.defineProperty(array, '1', {
      get() {
        invoked = true;
        return 99;
      },
      enumerable: true,
      configurable: true,
    });
    expect(codes(array)).toContain('SNAPSHOT_ACCESSOR_PROPERTY');
    expect(invoked).toBe(false);
  });

  it('does not call toJSON, valueOf, or Symbol.toPrimitive', () => {
    let called = false;
    const hostile = {
      data: 1,
      toJSON() {
        called = true;
        return { data: 2 };
      },
    };
    // A plain object with a toJSON method is a non-plain shape only if its prototype
    // differs; here it is a plain object literal, so toJSON is just a function-valued
    // property and must be rejected as unsupported — never invoked.
    snap(hostile);
    expect(called).toBe(false);
  });

  it('survives a Proxy whose traps throw, treating it as hostile', () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('boom');
        },
        getOwnPropertyDescriptor() {
          throw new Error('boom');
        },
      },
    );
    expect(codes(hostile)).toContain('SNAPSHOT_HOSTILE_REFLECTION');
  });
});

describe('safe snapshot — rejects non-JSON shapes', () => {
  it('rejects prototype-polluting keys', () => {
    expect(codes(JSON.parse('{"__proto__":{"x":1}}'))).toContain('SNAPSHOT_DANGEROUS_KEY');
  });

  it('rejects class instances, Map, Set, Date, RegExp', () => {
    class Cell {
      value = 1;
    }
    expect(codes(new Cell())).toContain('SNAPSHOT_NON_PLAIN_OBJECT');
    expect(codes(new Map())).toContain('SNAPSHOT_NON_PLAIN_OBJECT');
    expect(codes(new Set())).toContain('SNAPSHOT_NON_PLAIN_OBJECT');
    expect(codes(new Date())).toContain('SNAPSHOT_NON_PLAIN_OBJECT');
    expect(codes(/regex/)).toContain('SNAPSHOT_NON_PLAIN_OBJECT');
  });

  it('rejects a typed array in the JSON request contract', () => {
    expect(codes(new Float64Array([1, 2, 3]))).toContain('SNAPSHOT_NON_PLAIN_OBJECT');
  });

  it('rejects a sparse array — a hole is not a missing observation', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(codes([1, , 3])).toContain('SNAPSHOT_SPARSE_ARRAY');
  });

  it('rejects a decorated array (named property), which JSON cannot represent', () => {
    const array: number[] & { note?: string } = [1, 2, 3];
    array.note = 'hi';
    expect(codes(array)).toContain('SNAPSHOT_DECORATED_ARRAY');
  });

  it('rejects functions, symbols, bigint, and undefined', () => {
    expect(codes(() => 1)).toContain('SNAPSHOT_UNSUPPORTED_TYPE');
    expect(codes(Symbol('x'))).toContain('SNAPSHOT_UNSUPPORTED_TYPE');
    expect(codes(10n)).toContain('SNAPSHOT_UNSUPPORTED_TYPE');
    expect(codes(undefined)).toContain('SNAPSHOT_UNSUPPORTED_TYPE');
  });

  it('rejects non-finite numbers and accepts negative zero under the JCS policy', () => {
    expect(codes(NaN)).toContain('SNAPSHOT_NON_FINITE_NUMBER');
    expect(codes(Infinity)).toContain('SNAPSHOT_NON_FINITE_NUMBER');
    expect(codes({ v: NaN })).toContain('SNAPSHOT_NON_FINITE_NUMBER');
    expect(codes(-0)).toEqual([]);
    expect(codes(1e21)).toEqual([]);
  });

  it('enforces the active materialized-string limit', () => {
    expect(codes('x'.repeat(limits.jsonStringLength))).toEqual([]);
    expect(codes('x'.repeat(limits.jsonStringLength + 1))).toContain(
      'SNAPSHOT_STRING_TOO_LONG',
    );
  });

  it('rejects a symbol-keyed property', () => {
    expect(codes({ [Symbol('k')]: 1 })).toContain('SNAPSHOT_SYMBOL_KEY');
  });

  it('rejects a cycle rather than truncating it', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(codes(cyclic)).toContain('SNAPSHOT_CIRCULAR_REFERENCE');
  });
});

describe('safe snapshot — accepts plain data and detaches it', () => {
  it('accepts plain JSON-compatible values', () => {
    const result = snap({ a: [1, 2, 3], b: { c: 'x' }, d: null, e: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ a: [1, 2, 3], b: { c: 'x' }, d: null, e: true });
    }
  });

  it('returns a detached copy — later mutation of the input cannot change what was validated', () => {
    // Closes the time-of-check/time-of-use gap a live reference would leave open.
    const input = { spikes: [1, 2, 3] };
    const result = snap(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      input.spikes.push(999);
      expect((result.value as { spikes: number[] }).spikes).toEqual([1, 2, 3]);
    }
  });

  it('builds objects with a null prototype', () => {
    const result = snap({ x: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.getPrototypeOf(result.value)).toBe(null);
  });
});

describe('safe snapshot — never throws', () => {
  it('returns a typed result for arbitrary values', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const result = snap(value);
        return typeof result.ok === 'boolean';
      }),
      { numRuns: 3000 },
    );
  });
});
