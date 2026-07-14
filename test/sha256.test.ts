import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { sha256Hex, sha256Digest } from '../src/core/sha256.js';

/**
 * SHA-256 is the root of every identity claim Cortexel makes. If this hash is wrong,
 * every digest and every reproducibility guarantee is wrong. So it is checked against
 * the published FIPS 180-4 / NIST test vectors AND differentially against Node's
 * native crypto over thousands of random inputs — because agreeing with the standard
 * on three known cases and with a mature implementation everywhere is stronger than
 * either alone.
 */
describe('sha256 — published vectors', () => {
  it('hashes the empty string', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('hashes "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes the 448-bit NIST message', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('hashes a million "a" characters', () => {
    expect(sha256Hex('a'.repeat(1_000_000))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });

  it('prefixes the canonical digest form and always emits 64 hex characters', () => {
    expect(sha256Digest('abc')).toBe(
      'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Digest('')).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe('sha256 — differential against node:crypto', () => {
  it('agrees with the platform implementation on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 4096 }), (text) => {
        const reference = createHash('sha256').update(text, 'utf8').digest('hex');
        return sha256Hex(text) === reference;
      }),
      { numRuns: 2000 },
    );
  });

  it('agrees at and around block boundaries, where padding logic is most fragile', () => {
    // 55/56/57 and 63/64/65 bytes straddle the one-block-vs-two-block boundary.
    for (const length of [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 127, 128, 129]) {
      const text = 'x'.repeat(length);
      const reference = createHash('sha256').update(text, 'utf8').digest('hex');
      expect(sha256Hex(text), `length ${length}`).toBe(reference);
    }
  });

  it('agrees on multi-byte UTF-8 content', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 512 }), (text) => {
        const reference = createHash('sha256').update(text, 'utf8').digest('hex');
        return sha256Hex(text) === reference;
      }),
      { numRuns: 1000 },
    );
  });
});
