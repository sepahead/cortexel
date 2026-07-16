/**
 * SHA-256 (FIPS 180-4), implemented here rather than imported.
 *
 * Why not `node:crypto`? Stable core must be importable in a browser, and a
 * Node built-in import would break that. Why not Web Crypto? Its digest API is
 * async, and canonical digests are computed inside pure synchronous functions
 * that are far easier to reason about — and to test — when they cannot await.
 *
 * Why not a dependency? A hash is the root of every identity claim Cortexel
 * makes. Eighty auditable lines with published test vectors is a smaller trust
 * surface than a supply-chain edge.
 *
 * Verified against the FIPS 180-4 / NIST CAVP vectors in test/sha256.test.ts.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/* eslint-disable no-bitwise */
const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** SHA-256 of a byte sequence, as 32 raw bytes. */
export function sha256Bytes(message: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  // Pad: 0x80, then zeros, then the 64-bit big-endian bit length.
  const bitLength = message.length * 8;
  const paddedLength = (((message.length + 8) >> 6) + 1) << 6;
  const block = new Uint8Array(paddedLength);
  block.set(message);
  block[message.length] = 0x80;

  // The high 32 bits of the length. Inputs above 2^53 bits cannot occur here —
  // every caller is bounded far below that by the budget profile — but writing
  // both words keeps the padding correct rather than merely adequate.
  const hi = Math.floor(bitLength / 0x100000000);
  const lo = bitLength >>> 0;
  const lengthOffset = paddedLength - 8;
  block[lengthOffset] = (hi >>> 24) & 0xff;
  block[lengthOffset + 1] = (hi >>> 16) & 0xff;
  block[lengthOffset + 2] = (hi >>> 8) & 0xff;
  block[lengthOffset + 3] = hi & 0xff;
  block[lengthOffset + 4] = (lo >>> 24) & 0xff;
  block[lengthOffset + 5] = (lo >>> 16) & 0xff;
  block[lengthOffset + 6] = (lo >>> 8) & 0xff;
  block[lengthOffset + 7] = lo & 0xff;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        ((block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (h[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    out[i * 4 + 3] = h[i] & 0xff;
  }
  return out;
}
/* eslint-enable no-bitwise */

const HEX = '0123456789abcdef';

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[(bytes[i] >>> 4) & 0xf] + HEX[bytes[i] & 0xf];
  }
  return out;
}

const UTF8 = new TextEncoder();

/** The number of UTF-8 bytes in a string, without allocating a second full-size buffer. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const first = text.charCodeAt(index);
    if (first <= 0x7f) {
      bytes += 1;
    } else if (first <= 0x7ff) {
      bytes += 2;
    } else if (first >= 0xd800 && first <= 0xdbff) {
      const second = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (second >= 0xdc00 && second <= 0xdfff) {
        bytes += 4;
        index++;
      } else {
        // TextEncoder encodes an unpaired surrogate as U+FFFD (three UTF-8 bytes).
        bytes += 3;
      }
    } else {
      // Includes ordinary BMP code points and lone low surrogates (U+FFFD).
      bytes += 3;
    }
  }
  return bytes;
}

/** SHA-256 of a UTF-8 string, as 64 lowercase hex characters. */
export function sha256Hex(text: string): string {
  return toHex(sha256Bytes(UTF8.encode(text)));
}

/**
 * The canonical Cortexel digest form. Always the full 64 hex characters: a
 * truncated hash may be DISPLAYED to a human, but it is never an API value,
 * because a short hash is a collision waiting to be someone's problem.
 */
export function sha256Digest(text: string): string {
  return `sha256:${sha256Hex(text)}`;
}

export function sha256DigestBytes(bytes: Uint8Array): string {
  return `sha256:${toHex(sha256Bytes(bytes))}`;
}
