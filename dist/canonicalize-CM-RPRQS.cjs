//#region src/core/sha256.ts
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
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
const rotr = (x, n) => x >>> n | x << 32 - n;
/** SHA-256 of a byte sequence, as 32 raw bytes. */
function sha256Bytes(message) {
	const h = new Uint32Array([
		1779033703,
		3144134277,
		1013904242,
		2773480762,
		1359893119,
		2600822924,
		528734635,
		1541459225
	]);
	const bitLength = message.length * 8;
	const paddedLength = (message.length + 8 >> 6) + 1 << 6;
	const block = new Uint8Array(paddedLength);
	block.set(message);
	block[message.length] = 128;
	const hi = Math.floor(bitLength / 4294967296);
	const lo = bitLength >>> 0;
	const lengthOffset = paddedLength - 8;
	block[lengthOffset] = hi >>> 24 & 255;
	block[lengthOffset + 1] = hi >>> 16 & 255;
	block[lengthOffset + 2] = hi >>> 8 & 255;
	block[lengthOffset + 3] = hi & 255;
	block[lengthOffset + 4] = lo >>> 24 & 255;
	block[lengthOffset + 5] = lo >>> 16 & 255;
	block[lengthOffset + 6] = lo >>> 8 & 255;
	block[lengthOffset + 7] = lo & 255;
	const w = /* @__PURE__ */ new Uint32Array(64);
	for (let offset = 0; offset < paddedLength; offset += 64) {
		for (let i = 0; i < 16; i++) {
			const j = offset + i * 4;
			w[i] = (block[j] << 24 | block[j + 1] << 16 | block[j + 2] << 8 | block[j + 3]) >>> 0;
		}
		for (let i = 16; i < 64; i++) {
			const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
			const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
			w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
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
			const ch = e & f ^ ~e & g;
			const temp1 = hh + S1 + ch + K[i] + w[i] >>> 0;
			const temp2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
			hh = g;
			g = f;
			f = e;
			e = d + temp1 >>> 0;
			d = c;
			c = b;
			b = a;
			a = temp1 + temp2 >>> 0;
		}
		h[0] = h[0] + a >>> 0;
		h[1] = h[1] + b >>> 0;
		h[2] = h[2] + c >>> 0;
		h[3] = h[3] + d >>> 0;
		h[4] = h[4] + e >>> 0;
		h[5] = h[5] + f >>> 0;
		h[6] = h[6] + g >>> 0;
		h[7] = h[7] + hh >>> 0;
	}
	const out = /* @__PURE__ */ new Uint8Array(32);
	for (let i = 0; i < 8; i++) {
		out[i * 4] = h[i] >>> 24 & 255;
		out[i * 4 + 1] = h[i] >>> 16 & 255;
		out[i * 4 + 2] = h[i] >>> 8 & 255;
		out[i * 4 + 3] = h[i] & 255;
	}
	return out;
}
const HEX = "0123456789abcdef";
function toHex(bytes) {
	let out = "";
	for (let i = 0; i < bytes.length; i++) out += HEX[bytes[i] >>> 4 & 15] + HEX[bytes[i] & 15];
	return out;
}
const UTF8$1 = new TextEncoder();
/** The number of UTF-8 bytes in a string, without allocating a second full-size buffer. */
function utf8ByteLength(text) {
	let bytes = 0;
	for (let index = 0; index < text.length; index++) {
		const first = text.charCodeAt(index);
		if (first <= 127) bytes += 1;
		else if (first <= 2047) bytes += 2;
		else if (first >= 55296 && first <= 56319) {
			const second = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
			if (second >= 56320 && second <= 57343) {
				bytes += 4;
				index++;
			} else bytes += 3;
		} else bytes += 3;
	}
	return bytes;
}
/** SHA-256 of a UTF-8 string, as 64 lowercase hex characters. */
function sha256Hex(text) {
	return toHex(sha256Bytes(UTF8$1.encode(text)));
}
/**
* The canonical Cortexel digest form. Always the full 64 hex characters: a
* truncated hash may be DISPLAYED to a human, but it is never an API value,
* because a short hash is a collision waiting to be someone's problem.
*/
function sha256Digest(text) {
	return `sha256:${sha256Hex(text)}`;
}

//#endregion
//#region src/core/canonicalize.ts
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
var CanonicalizationError = class extends Error {
	path;
	constructor(message, path) {
		super(message);
		this.name = "CanonicalizationError";
		this.path = path;
	}
};
/**
* A lone surrogate has no UTF-8 encoding, so it has no canonical byte sequence
* and cannot be hashed reproducibly. It is a defect at the boundary, not
* something to paper over with a replacement character.
*/
function assertWellFormed(text, path) {
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code >= 55296 && code <= 56319) {
			const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
			if (!(next >= 56320 && next <= 57343)) throw new CanonicalizationError("unpaired high surrogate", path);
			i++;
		} else if (code >= 56320 && code <= 57343) throw new CanonicalizationError("unpaired low surrogate", path);
	}
}
function serializeNumber(value, path) {
	if (!Number.isFinite(value)) throw new CanonicalizationError("non-finite numbers are outside the JCS domain and have no canonical form", path);
	return JSON.stringify(value);
}
function safeOwnKeys(value, path) {
	try {
		return Reflect.ownKeys(value);
	} catch {
		throw new CanonicalizationError("object keys could not be inspected without executing a hostile trap", path);
	}
}
function safeDescriptor(value, key, path) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor) return descriptor;
	} catch {}
	throw new CanonicalizationError("an object member could not be inspected safely", path);
}
function childPath(path, key) {
	return `${path}/${key.replace(/~/gu, "~0").replace(/\//gu, "~1")}`;
}
function serialize(value, path, depth) {
	if (depth > 128) throw new CanonicalizationError("value nests deeper than the canonicalizer permits", path);
	if (value === null) return "null";
	switch (typeof value) {
		case "boolean": return value ? "true" : "false";
		case "number": return serializeNumber(value, path);
		case "string":
			assertWellFormed(value, path);
			return JSON.stringify(value);
		case "object": break;
		default: throw new CanonicalizationError(`values of type ${typeof value} are outside the JCS domain`, path);
	}
	let array = false;
	try {
		array = Array.isArray(value);
	} catch {
		throw new CanonicalizationError("the value could not be inspected safely", path);
	}
	if (array) {
		const keys = safeOwnKeys(value, path);
		const length = safeDescriptor(value, "length", path).value;
		if (!Number.isSafeInteger(length) || length < 0) throw new CanonicalizationError("array length is outside the canonical JSON domain", path);
		const indexKeys = [];
		for (const key of keys) {
			if (typeof key === "symbol") throw new CanonicalizationError("symbol-keyed array members are outside the JSON domain", path);
			if (key === "length") continue;
			const index = Number(key);
			if (!/^(0|[1-9][0-9]*)$/u.test(key) || !Number.isSafeInteger(index) || index >= length) throw new CanonicalizationError("named array members are outside the JSON domain", path);
			const descriptor = safeDescriptor(value, key, childPath(path, key));
			if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) throw new CanonicalizationError("array accessors and hidden members are outside the JSON domain", path);
			indexKeys.push(key);
		}
		if (indexKeys.length !== length) throw new CanonicalizationError("sparse arrays are outside the canonical JSON domain", path);
		indexKeys.sort((left, right) => Number(left) - Number(right));
		const parts = [];
		for (const key of indexKeys) {
			const at = childPath(path, key);
			const descriptor = safeDescriptor(value, key, at);
			parts.push(serialize(descriptor.value, at, depth + 1));
		}
		return `[${parts.join(",")}]`;
	}
	const record = value;
	let prototype;
	try {
		prototype = Object.getPrototypeOf(record);
	} catch {
		throw new CanonicalizationError("the object prototype could not be inspected safely", path);
	}
	if (prototype !== Object.prototype && prototype !== null) throw new CanonicalizationError("only plain objects can be canonicalized; a class instance has no canonical JSON form", path);
	const ownKeys = safeOwnKeys(record, path);
	const keys = [];
	for (const key of ownKeys) {
		if (typeof key === "symbol") throw new CanonicalizationError("symbol-keyed members are outside the JSON domain", path);
		const descriptor = safeDescriptor(record, key, childPath(path, key));
		if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) throw new CanonicalizationError("accessors and hidden members are outside the JSON domain", path);
		keys.push(key);
	}
	keys.sort();
	const parts = [];
	for (const key of keys) {
		assertWellFormed(key, path);
		const at = childPath(path, key);
		const child = safeDescriptor(record, key, at).value;
		if (child === void 0) throw new CanonicalizationError(`member ${JSON.stringify(key)} is undefined; undefined is not a JSON value`, at);
		parts.push(`${JSON.stringify(key)}:${serialize(child, at, depth + 1)}`);
	}
	return `{${parts.join(",")}}`;
}
/** Canonicalize a JSON-compatible value to its RFC 8785 byte sequence, as a string. */
function canonicalize(value) {
	return serialize(value, "", 0);
}
const UTF8 = new TextEncoder();
/**
* SHA-256 over the canonical bytes of a value: `sha256:<64 hex>`.
*
* Two implementations that agree here agree on identity. That is the whole point.
*/
function canonicalDigest(value) {
	return sha256Digest(canonicalize(value));
}
/**
* Digest an object with one top-level member excluded.
*
* An artifact carries its own digest, so that field cannot be part of what is
* hashed — a self-referential hash has no fixed point. This makes the exclusion
* explicit and testable rather than an implicit delete somewhere in the builder.
*/
function canonicalDigestExcluding(value, excludeKey) {
	const copy = Object.create(null);
	for (const key of safeOwnKeys(value, "")) {
		if (typeof key === "symbol") throw new CanonicalizationError("symbol-keyed members are outside the JSON domain", "");
		const descriptor = safeDescriptor(value, key, childPath("", key));
		if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) throw new CanonicalizationError("accessors and hidden members are outside the JSON domain", "");
		if (key !== excludeKey) copy[key] = descriptor.value;
	}
	return canonicalDigest(copy);
}

//#endregion
Object.defineProperty(exports, 'CanonicalizationError', {
  enumerable: true,
  get: function () {
    return CanonicalizationError;
  }
});
Object.defineProperty(exports, 'canonicalDigest', {
  enumerable: true,
  get: function () {
    return canonicalDigest;
  }
});
Object.defineProperty(exports, 'canonicalDigestExcluding', {
  enumerable: true,
  get: function () {
    return canonicalDigestExcluding;
  }
});
Object.defineProperty(exports, 'canonicalize', {
  enumerable: true,
  get: function () {
    return canonicalize;
  }
});
Object.defineProperty(exports, 'sha256Digest', {
  enumerable: true,
  get: function () {
    return sha256Digest;
  }
});
Object.defineProperty(exports, 'sha256Hex', {
  enumerable: true,
  get: function () {
    return sha256Hex;
  }
});
Object.defineProperty(exports, 'utf8ByteLength', {
  enumerable: true,
  get: function () {
    return utf8ByteLength;
  }
});
//# sourceMappingURL=canonicalize-CM-RPRQS.cjs.map