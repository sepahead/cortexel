import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { parseJsonStrict } from '../src/core/parse-json.js';
import { getBudgetLimits } from '../src/core/limits.js';

const limits = getBudgetLimits('standard');
const parse = (text: string) => parseJsonStrict(text, { limits });

function codes(text: string): string[] {
  const result = parse(text);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

describe('strict JSON parser — the duplicate-key check', () => {
  it('rejects a duplicate object member, which JSON.parse silently resolves', () => {
    // The whole reason this parser exists rather than JSON.parse. `{"a":1,"a":2}`
    // has no single meaning, so it is rejected rather than resolved to one.
    expect(codes('{"a":1,"a":2}')).toContain('JSON_DUPLICATE_KEY');
  });

  it('rejects a duplicate at any nesting level', () => {
    expect(codes('{"outer":{"x":1,"x":2}}')).toContain('JSON_DUPLICATE_KEY');
    expect(codes('[{"k":1,"k":2}]')).toContain('JSON_DUPLICATE_KEY');
  });

  it('accepts the same name in sibling objects', () => {
    expect(parse('{"a":{"x":1},"b":{"x":2}}').ok).toBe(true);
  });
});

describe('strict JSON parser — prototype pollution', () => {
  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects the dangerous key "%s"',
    (key) => {
      expect(codes(`{"${key}":1}`)).toContain('JSON_DANGEROUS_KEY');
    },
  );

  it('builds objects with a null prototype so a stray key cannot pollute', () => {
    const result = parse('{"safe":1}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.getPrototypeOf(result.value)).toBe(null);
    }
  });
});

describe('strict JSON parser — grammar', () => {
  it('rejects empty input', () => {
    expect(codes('')).toContain('JSON_EMPTY_INPUT');
    expect(codes('   ')).toContain('JSON_EMPTY_INPUT');
  });

  it('rejects trailing data after the top-level value', () => {
    expect(codes('{} {}')).toContain('JSON_TRAILING_DATA');
    expect(codes('1 2')).toContain('JSON_TRAILING_DATA');
  });

  it('rejects comments', () => {
    // A `/` where whitespace is expected is caught as a comment attempt, whether it
    // leads the document or trails a value.
    expect(codes('{"a":1} // note')).toContain('JSON_COMMENT_NOT_ALLOWED');
    expect(codes('/* c */ {}')).toContain('JSON_COMMENT_NOT_ALLOWED');
  });

  it('rejects trailing commas', () => {
    expect(codes('[1,2,]')).toContain('JSON_TRAILING_COMMA_NOT_ALLOWED');
    expect(codes('{"a":1,}')).toContain('JSON_TRAILING_COMMA_NOT_ALLOWED');
  });

  it('rejects a byte-order mark by default', () => {
    expect(codes('\ufeff{}')).toContain('JSON_BOM_NOT_ALLOWED');
  });

  it('rejects non-finite numbers, which are not JSON', () => {
    expect(codes('NaN')).toContain('JSON_SYNTAX');
    expect(codes('Infinity')).toContain('JSON_SYNTAX');
    // 1e400 IS grammatical JSON but evaluates to Infinity — outside the finite model.
    expect(codes('1e400')).toContain('JSON_NON_FINITE_NUMBER');
  });

  it('rejects a leading zero and other malformed numbers', () => {
    expect(codes('01')).toContain('JSON_TRAILING_DATA');
    expect(codes('1.')).toContain('JSON_INVALID_NUMBER');
    expect(codes('1e')).toContain('JSON_INVALID_NUMBER');
    expect(codes('.5')).toContain('JSON_SYNTAX');
  });

  it('rejects a raw control character inside a string', () => {
    expect(codes('"a\u0001b"')).toContain('JSON_SYNTAX');
  });

  it('rejects an unpaired surrogate escape', () => {
    expect(codes('"\\ud800"')).toContain('JSON_INVALID_UNICODE');
    expect(codes('"\\udc00"')).toContain('JSON_INVALID_UNICODE');
  });

  it('accepts a valid surrogate pair escape', () => {
    const result = parse('"\\ud83d\\ude02"');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('😂');
  });

  it('parses well-formed documents', () => {
    const result = parse('{"a":[1,2.5,-3,true,false,null],"b":"x"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ a: [1, 2.5, -3, true, false, null], b: 'x' });
    }
  });
});

describe('strict JSON parser — resource limits bite before materialization', () => {
  it('rejects input larger than the byte budget', () => {
    const huge = `"${'x'.repeat(limits.rawInputBytes + 10)}"`;
    expect(codes(huge)).toContain('JSON_BYTES_EXCEEDED');
  });

  it('rejects nesting deeper than the depth limit', () => {
    const deep = '['.repeat(limits.jsonDepth + 5) + ']'.repeat(limits.jsonDepth + 5);
    expect(codes(deep)).toContain('JSON_DEPTH_EXCEEDED');
  });

  it('rejects a string longer than the string budget', () => {
    const long = `"${'y'.repeat(limits.jsonStringLength + 5)}"`;
    expect(codes(long)).toContain('JSON_STRING_TOO_LONG');
  });

  it('rejects an over-long numeric token before parsing it', () => {
    const token = `1${'0'.repeat(limits.jsonNumberTokenLength + 5)}`;
    expect(codes(token)).toContain('JSON_NUMBER_TOKEN_TOO_LONG');
  });
});

describe('strict JSON parser — never throws, always returns a result', () => {
  it('returns a typed result for arbitrary strings rather than throwing', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (text) => {
        const result = parse(text);
        // The invariant: a typed result, never an uncaught exception.
        return typeof result.ok === 'boolean';
      }),
      { numRuns: 3000 },
    );
  });

  /**
   * A value that a JSON parser would happily accept but Cortexel intentionally rejects:
   * a prototype-polluting key at any depth. The round-trip property below holds for
   * values WITHOUT such a key; a value with one is rejected on purpose, which the
   * dangerous-key tests above already cover.
   */
  function containsDangerousKey(value: unknown): boolean {
    if (value === null || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(containsDangerousKey);
    for (const key of Object.keys(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return true;
      if (containsDangerousKey((value as Record<string, unknown>)[key])) return true;
    }
    return false;
  }

  it('round-trips any JSON value that does not use a prototype-polluting key', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const text = JSON.stringify(value);
        // JSON.stringify drops undefined; only test what it actually emits.
        if (text === undefined) return true;
        const result = parse(text);
        if (containsDangerousKey(value)) {
          // Rejected on purpose — prototype pollution is not a value Cortexel accepts.
          return !result.ok;
        }
        return result.ok && JSON.stringify(result.value) === text;
      }),
      { numRuns: 2000 },
    );
  });
});
