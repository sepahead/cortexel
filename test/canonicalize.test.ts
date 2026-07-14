import { describe, expect, it } from 'vitest';

import {
  canonicalize,
  canonicalDigest,
  canonicalDigestExcluding,
  CanonicalizationError,
} from '../src/core/canonicalize.js';

/**
 * RFC 8785 (JSON Canonicalization Scheme). If TypeScript and Python disagree on one
 * byte here, every cross-language digest is worthless — so this is checked against the
 * scheme's own rules rather than against "sorted JSON.stringify", which is a different
 * thing that only looks similar.
 */
describe('RFC 8785 canonicalization', () => {
  it('sorts object members by UTF-16 code unit', () => {
    expect(canonicalize({ b: 1, a: 2, c: 3 })).toBe('{"a":2,"b":1,"c":3}');
  });

  it('sorts recursively and inserts no insignificant whitespace', () => {
    expect(canonicalize({ z: { y: 1, x: 2 }, a: [3, 2, 1] })).toBe(
      '{"a":[3,2,1],"z":{"x":2,"y":1}}',
    );
  });

  it('never reorders array elements — array order is data', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  it('serializes -0 as 0, per the scheme', () => {
    // JavaScript distinguishes -0 from 0; canonical JSON does not. If canonicalization
    // kept the sign, an object that means the same thing would hash two ways.
    expect(canonicalize({ v: -0 })).toBe('{"v":0}');
    expect(canonicalize(-0)).toBe('0');
  });

  it('uses ECMAScript number formatting', () => {
    expect(canonicalize(1)).toBe('1');
    expect(canonicalize(1.5)).toBe('1.5');
    expect(canonicalize(1e21)).toBe('1e+21');
    expect(canonicalize(100)).toBe('100');
    expect(canonicalize(0.000001)).toBe('0.000001');
  });

  it('uses shortest legal JSON string escapes', () => {
    expect(canonicalize('a"b')).toBe('"a\\"b"');
    expect(canonicalize('tab\there')).toBe('"tab\\there"');
    expect(canonicalize('\u0001')).toBe('"\\u0001"');
  });

  it('canonicalizes the RFC 8785 sort example (special characters and combining marks)', () => {
    // From RFC 8785 §3.2.3: keys sort by UTF-16 code unit, so an emoji (surrogate pair,
    // high code units) sorts after ASCII digits and letters.
    const value = { '€': 'Euro Sign', '\r': 'Carriage Return', '1': 'One', '😂': 'Smiley', 'a': 'Letter a' };
    const result = canonicalize(value);
    // "\r" (U+000D) < "1" (U+0031) < "a" (U+0061) < "€" (U+20AC) < smiley (U+D83D...)
    expect(result.indexOf('"\\r"')).toBeLessThan(result.indexOf('"1"'));
    expect(result.indexOf('"1"')).toBeLessThan(result.indexOf('"a"'));
    expect(result.indexOf('"a"')).toBeLessThan(result.indexOf('"€"'));
    expect(result.indexOf('"€"')).toBeLessThan(result.indexOf('😂'));
  });

  it('rejects values outside the JCS domain rather than coercing them', () => {
    // There is no canonical form for a value the scheme does not define, so producing
    // one would be inventing an identity.
    expect(() => canonicalize(NaN)).toThrow(CanonicalizationError);
    expect(() => canonicalize(Infinity)).toThrow(CanonicalizationError);
    expect(() => canonicalize(undefined)).toThrow(CanonicalizationError);
    expect(() => canonicalize({ a: undefined })).toThrow(CanonicalizationError);
    expect(() => canonicalize(() => 1)).toThrow(CanonicalizationError);
    expect(() => canonicalize(new Date())).toThrow(CanonicalizationError);
  });

  it('rejects a lone surrogate, which has no reproducible byte sequence', () => {
    expect(() => canonicalize('\ud800')).toThrow(CanonicalizationError);
    expect(() => canonicalize({ '\udc00': 1 })).toThrow(CanonicalizationError);
  });

  it('is insensitive to input key order — the point of canonicalization', () => {
    const a = canonicalDigest({ x: 1, y: 2, z: [1, 2, 3] });
    const b = canonicalDigest({ z: [1, 2, 3], y: 2, x: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('excludes a named field from the digest domain without a fixed-point paradox', () => {
    const artifact = { a: 1, artifactDigest: 'sha256:whatever', b: 2 };
    const withDifferentDigest = { a: 1, artifactDigest: 'sha256:different', b: 2 };
    // The self-digest field cannot be part of what is hashed, or there is no value it
    // could hold that would be consistent.
    expect(canonicalDigestExcluding(artifact, 'artifactDigest')).toBe(
      canonicalDigestExcluding(withDifferentDigest, 'artifactDigest'),
    );
  });
});
