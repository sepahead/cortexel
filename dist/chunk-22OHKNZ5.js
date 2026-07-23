// src/generated/identity.ts
var PACKAGE_VERSION = "0.10.0-dev.0";
var REQUEST_CONTRACT = "cortexel-figure-request/1.0";
var ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";
var CONTRACT_DIGEST = "sha256:02c8581a22d6417560cf8c6a890f25416243287b29ad7a9d5a8714915bae216e";
var CATALOG_DIGEST = "sha256:801aa157a57212ca58b092319d57edd8ab8649a80202a8a577510ca9f7162c09";
var STABLE_SKILL_COUNT = 19;
function getBuildIdentity() {
  return Object.freeze({
    packageVersion: PACKAGE_VERSION,
    requestContract: REQUEST_CONTRACT,
    artifactContract: ARTIFACT_CONTRACT,
    contractDigest: CONTRACT_DIGEST,
    catalogDigest: CATALOG_DIGEST,
    stableSkillCount: STABLE_SKILL_COUNT,
    sourceRevision: "unreleased-worktree",
    release: false
  });
}

// src/core/deep-freeze.ts
function deepFreeze(value, seen = /* @__PURE__ */ new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  const object = value;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(value)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}
function freezeGenerated(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeGenerated(item)));
  }
  const clone = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(value)) {
    clone[key] = freezeGenerated(value[key]);
  }
  return Object.freeze(clone);
}

// src/core/errors.ts
var STAGE_ORDER = Object.freeze([
  "parse",
  "snapshot",
  "identity",
  "structural",
  "semantic",
  "science",
  "scope",
  "provenance",
  "budget",
  "derivation",
  "render",
  "serialize",
  "migrate",
  "adapter",
  "internal"
]);
var MAX_ERROR_RECORDS = 32;
var MAX_MESSAGE_LENGTH = 500;
var MAX_PATH_LENGTH = 240;
var MAX_SUMMARY_LENGTH = 120;
var UNSAFE_DISPLAY_CLASS = "[\\u0000-\\u001f\\u061c\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff\\ufffe-\\uffff]";
function isSafeDisplayString(value) {
  return typeof value === "string" && !new RegExp(UNSAFE_DISPLAY_CLASS, "u").test(value);
}
function safeText(value, max) {
  if (typeof value !== "string" || !Number.isSafeInteger(max) || max <= 0) return "";
  let out = "";
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    const character = String.fromCodePoint(codePoint);
    const next = index + character.length;
    const loneSurrogate = codePoint >= 55296 && codePoint <= 57343;
    const token = !loneSurrogate && isSafeDisplayString(character) ? character : `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
    const capacity = next < value.length ? max - 1 : max;
    if (out.length + token.length > capacity) return `${out}\u2026`;
    out += token;
    index = next;
  }
  return out;
}
function summarizeValue(value) {
  switch (typeof value) {
    case "string":
      return safeText(`string(length=${value.length})`, MAX_SUMMARY_LENGTH);
    case "number":
      return Object.is(value, -0) ? "number(-0)" : `number(${value})`;
    case "boolean":
      return `boolean(${value ? "true" : "false"})`;
    case "bigint":
      return "bigint";
    case "undefined":
      return "undefined";
    case "symbol":
      return "<symbol>";
    case "function":
      return "<function>";
    case "object": {
      if (value === null) return "null";
      try {
        if (Array.isArray(value)) return "<array>";
      } catch {
        return "<uninspectable-object>";
      }
      return "<object>";
    }
    default:
      return "<unknown>";
  }
}
function escapePointerToken(token) {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
function pointer(...segments) {
  if (segments.length === 0) return "";
  return segments.map((segment) => `/${escapePointerToken(String(segment))}`).join("");
}
function makeError(init) {
  const error = {
    code: init.code,
    severity: init.severity ?? "error",
    stage: init.stage,
    instancePath: safeText(init.instancePath ?? "", MAX_PATH_LENGTH),
    message: safeText(init.message, MAX_MESSAGE_LENGTH)
  };
  if (init.schemaPath !== void 0) error.schemaPath = safeText(init.schemaPath, MAX_PATH_LENGTH);
  if (init.skillId !== void 0) error.skillId = safeText(init.skillId, 64);
  if (init.validatorId !== void 0) error.validatorId = safeText(init.validatorId, 64);
  if (init.limit !== void 0) error.limit = init.limit;
  if ("actual" in init) error.actualSummary = summarizeValue(init.actual);
  if (init.repair !== void 0) {
    error.repair = {
      operation: init.repair.operation,
      path: safeText(init.repair.path, MAX_PATH_LENGTH),
      ..."value" in init.repair ? { value: init.repair.value } : {},
      reasonCode: init.repair.reasonCode
    };
  }
  return error;
}
function compareUnicodeCodePoints(left, right) {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftPoint = left.codePointAt(leftIndex);
    const rightPoint = right.codePointAt(rightIndex);
    if (leftPoint !== rightPoint) return leftPoint < rightPoint ? -1 : 1;
    leftIndex += leftPoint > 65535 ? 2 : 1;
    rightIndex += rightPoint > 65535 ? 2 : 1;
  }
  if (leftIndex === left.length && rightIndex === right.length) return 0;
  return leftIndex === left.length ? -1 : 1;
}
function compareErrors(a, b) {
  const stageDelta = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
  if (stageDelta !== 0) return stageDelta;
  const pathDelta = compareUnicodeCodePoints(a.instancePath, b.instancePath);
  if (pathDelta !== 0) return pathDelta;
  const codeDelta = compareUnicodeCodePoints(a.code, b.code);
  if (codeDelta !== 0) return codeDelta;
  const av = a.validatorId ?? "";
  const bv = b.validatorId ?? "";
  return compareUnicodeCodePoints(av, bv);
}
function finalizeErrors(errors) {
  const sorted = [...errors].sort(compareErrors);
  if (sorted.length <= MAX_ERROR_RECORDS) return sorted;
  const kept = sorted.slice(0, MAX_ERROR_RECORDS - 1);
  const omitted = sorted.length - kept.length;
  const limitRecord = makeError({
    code: "ERROR_LIMIT_REACHED",
    severity: "warning",
    stage: "internal",
    message: `${omitted} further diagnostics were suppressed by the diagnostic budget. Fix the reported errors and revalidate.`
  });
  limitRecord.omittedCount = omitted;
  kept.push(limitRecord);
  return kept;
}
function ok(value, warnings = []) {
  return { ok: true, value, warnings };
}
function err(errors) {
  return { ok: false, errors: finalizeErrors(errors) };
}

// src/core/sha256.ts
var K = new Uint32Array([
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
var rotr = (x, n) => x >>> n | x << 32 - n;
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
  const w = new Uint32Array(64);
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
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj >>> 0;
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
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = h[i] >>> 24 & 255;
    out[i * 4 + 1] = h[i] >>> 16 & 255;
    out[i * 4 + 2] = h[i] >>> 8 & 255;
    out[i * 4 + 3] = h[i] & 255;
  }
  return out;
}
var HEX = "0123456789abcdef";
function toHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i] >>> 4 & 15] + HEX[bytes[i] & 15];
  }
  return out;
}
var UTF8 = new TextEncoder();
function utf8ByteLength(text) {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const first = text.charCodeAt(index);
    if (first <= 127) {
      bytes += 1;
    } else if (first <= 2047) {
      bytes += 2;
    } else if (first >= 55296 && first <= 56319) {
      const second = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (second >= 56320 && second <= 57343) {
        bytes += 4;
        index++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
function sha256Hex(text) {
  return toHex(sha256Bytes(UTF8.encode(text)));
}
function sha256Digest(text) {
  return `sha256:${sha256Hex(text)}`;
}

// src/core/canonicalize.ts
var CanonicalizationError = class extends Error {
  path;
  constructor(message, path) {
    super(message);
    this.name = "CanonicalizationError";
    this.path = path;
  }
};
function assertWellFormed(text, path) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (!(next >= 56320 && next <= 57343)) {
        throw new CanonicalizationError("unpaired high surrogate", path);
      }
      i++;
    } else if (code >= 56320 && code <= 57343) {
      throw new CanonicalizationError("unpaired low surrogate", path);
    }
  }
}
function serializeNumber(value, path) {
  if (!Number.isFinite(value)) {
    throw new CanonicalizationError(
      "non-finite numbers are outside the JCS domain and have no canonical form",
      path
    );
  }
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
  } catch {
  }
  throw new CanonicalizationError("an object member could not be inspected safely", path);
}
function childPath(path, key) {
  return `${path}/${key.replace(/~/gu, "~0").replace(/\//gu, "~1")}`;
}
function serialize(value, path, depth) {
  if (depth > 128) {
    throw new CanonicalizationError("value nests deeper than the canonicalizer permits", path);
  }
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return serializeNumber(value, path);
    case "string":
      assertWellFormed(value, path);
      return JSON.stringify(value);
    case "object":
      break;
    default:
      throw new CanonicalizationError(
        `values of type ${typeof value} are outside the JCS domain`,
        path
      );
  }
  let array = false;
  try {
    array = Array.isArray(value);
  } catch {
    throw new CanonicalizationError("the value could not be inspected safely", path);
  }
  if (array) {
    const keys2 = safeOwnKeys(value, path);
    const lengthDescriptor = safeDescriptor(value, "length", path);
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new CanonicalizationError("array length is outside the canonical JSON domain", path);
    }
    const indexKeys = [];
    for (const key of keys2) {
      if (typeof key === "symbol") {
        throw new CanonicalizationError("symbol-keyed array members are outside the JSON domain", path);
      }
      if (key === "length") continue;
      const index = Number(key);
      if (!/^(0|[1-9][0-9]*)$/u.test(key) || !Number.isSafeInteger(index) || index >= length) {
        throw new CanonicalizationError("named array members are outside the JSON domain", path);
      }
      const descriptor = safeDescriptor(value, key, childPath(path, key));
      if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        throw new CanonicalizationError("array accessors and hidden members are outside the JSON domain", path);
      }
      indexKeys.push(key);
    }
    if (indexKeys.length !== length) {
      throw new CanonicalizationError("sparse arrays are outside the canonical JSON domain", path);
    }
    indexKeys.sort((left, right) => Number(left) - Number(right));
    const parts2 = [];
    for (const key of indexKeys) {
      const at = childPath(path, key);
      const descriptor = safeDescriptor(value, key, at);
      parts2.push(serialize(descriptor.value, at, depth + 1));
    }
    return `[${parts2.join(",")}]`;
  }
  const record = value;
  let prototype;
  try {
    prototype = Object.getPrototypeOf(record);
  } catch {
    throw new CanonicalizationError("the object prototype could not be inspected safely", path);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalizationError(
      "only plain objects can be canonicalized; a class instance has no canonical JSON form",
      path
    );
  }
  const ownKeys = safeOwnKeys(record, path);
  const keys = [];
  for (const key of ownKeys) {
    if (typeof key === "symbol") {
      throw new CanonicalizationError("symbol-keyed members are outside the JSON domain", path);
    }
    const descriptor = safeDescriptor(record, key, childPath(path, key));
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw new CanonicalizationError("accessors and hidden members are outside the JSON domain", path);
    }
    keys.push(key);
  }
  keys.sort();
  const parts = [];
  for (const key of keys) {
    assertWellFormed(key, path);
    const at = childPath(path, key);
    const child = safeDescriptor(record, key, at).value;
    if (child === void 0) {
      throw new CanonicalizationError(
        `member ${JSON.stringify(key)} is undefined; undefined is not a JSON value`,
        at
      );
    }
    parts.push(`${JSON.stringify(key)}:${serialize(child, at, depth + 1)}`);
  }
  return `{${parts.join(",")}}`;
}
function canonicalize(value) {
  return serialize(value, "", 0);
}
var UTF82 = new TextEncoder();
function canonicalDigest(value) {
  return sha256Digest(canonicalize(value));
}
function canonicalDigestExcluding(value, excludeKey) {
  const copy = /* @__PURE__ */ Object.create(null);
  for (const key of safeOwnKeys(value, "")) {
    if (typeof key === "symbol") {
      throw new CanonicalizationError("symbol-keyed members are outside the JSON domain", "");
    }
    const descriptor = safeDescriptor(value, key, childPath("", key));
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw new CanonicalizationError("accessors and hidden members are outside the JSON domain", "");
    }
    if (key !== excludeKey) copy[key] = descriptor.value;
  }
  return canonicalDigest(copy);
}

// src/generated/budgets.ts
var BUDGET_PROFILE_IDS = freezeGenerated([
  "standard",
  "agent"
]);
var BUDGET_PROFILES = freezeGenerated({
  "standard": {
    "rawInputBytes": 33554432,
    "jsonDepth": 64,
    "jsonTotalNodes": 1e6,
    "jsonStringLength": 65536,
    "jsonNumberTokenLength": 64,
    "jsonObjectKeys": 4096,
    "jsonArrayItems": 2e6,
    "observationsPerSeries": 25e4,
    "observationsPerRequest": 2e6,
    "graphNodes": 1e5,
    "graphEdges": 2e5,
    "matrixCells": 16e6,
    "pairwiseOperations": 5e7,
    "visibleMarks": 1e5,
    "svgTextNodes": 2e4,
    "svgBytes": 20971520,
    "sidecarBytes": 104857600,
    "returnedTableRows": 500,
    "errorRecords": 32
  },
  "agent": {
    "rawInputBytes": 4194304,
    "jsonDepth": 32,
    "jsonTotalNodes": 2e5,
    "jsonStringLength": 8192,
    "jsonNumberTokenLength": 64,
    "jsonObjectKeys": 1024,
    "jsonArrayItems": 2e5,
    "observationsPerSeries": 5e4,
    "observationsPerRequest": 2e5,
    "graphNodes": 2e4,
    "graphEdges": 5e4,
    "matrixCells": 1e6,
    "pairwiseOperations": 5e6,
    "visibleMarks": 25e3,
    "svgTextNodes": 5e3,
    "svgBytes": 5242880,
    "sidecarBytes": 20971520,
    "returnedTableRows": 200,
    "errorRecords": 32
  }
});
var COMPACTION_POLICIES = freezeGenerated({
  "none": {
    "id": "none",
    "revision": 1,
    "appliesTo": [
      "*"
    ],
    "preservesExtrema": true,
    "preservesMass": true,
    "deterministic": true,
    "description": "No compaction. The figure is drawn in full or the request is refused."
  },
  "line_envelope_minmax": {
    "id": "line_envelope_minmax",
    "revision": 1,
    "appliesTo": [
      "trace",
      "weight_trace"
    ],
    "preservesExtrema": true,
    "preservesMass": false,
    "deterministic": true,
    "description": "Per horizontal pixel bucket, retain the minimum and the maximum sample, plus the first and last sample of the series and every boundary of a missing span. A one-sample transient therefore SURVIVES, which naive averaging would erase."
  },
  "raster_density_bins": {
    "id": "raster_density_bins",
    "revision": 1,
    "appliesTo": [
      "spike_raster"
    ],
    "preservesExtrema": false,
    "preservesMass": true,
    "deterministic": true,
    "description": "Aggregate events into an explicit time x sender bin grid and draw density. Every event is COUNTED \u2014 none is dropped. The bin dimensions and the before/after counts are recorded."
  },
  "histogram_merge_adjacent": {
    "id": "histogram_merge_adjacent",
    "revision": 1,
    "appliesTo": [
      "distribution"
    ],
    "preservesExtrema": false,
    "preservesMass": true,
    "deterministic": true,
    "description": "Merge ONLY adjacent bins, summing raw counts and probability mass (or integrating density before re-normalizing by the wider bin). Extrema sampling is INVALID for a distribution \u2014 it would destroy the mass \u2014 so it is not offered."
  },
  "matrix_value_quantize": {
    "id": "matrix_value_quantize",
    "revision": 1,
    "appliesTo": [
      "matrix"
    ],
    "preservesExtrema": true,
    "preservesMass": true,
    "deterministic": true,
    "description": "Group cells that share a quantized value into one paint path. This is a PAINT optimization only: every cell is retained and remains individually addressable in the table."
  },
  "graph_declared_subset": {
    "id": "graph_declared_subset",
    "revision": 1,
    "appliesTo": [
      "graph"
    ],
    "preservesExtrema": false,
    "preservesMass": false,
    "deterministic": true,
    "description": "Draw only the caller's explicitly declared edge subset. The retained and source counts are disclosed and no degree claim is permitted."
  }
});

// src/core/limits.ts
var DEFAULT_PROFILE = "standard";
function tryGetBudgetLimits(profile = DEFAULT_PROFILE) {
  if (typeof profile !== "string" || !BUDGET_PROFILE_IDS.includes(profile) || !Object.prototype.hasOwnProperty.call(BUDGET_PROFILES, profile)) {
    return void 0;
  }
  return BUDGET_PROFILES[profile];
}
function getBudgetLimits(profile = DEFAULT_PROFILE) {
  const found = tryGetBudgetLimits(profile);
  if (!found) {
    throw new Error("unknown budget profile");
  }
  return found;
}
function trySelectTighterBudgetProfile(hostProfile, requestedProfile) {
  const host = tryGetBudgetLimits(hostProfile);
  const requested = tryGetBudgetLimits(requestedProfile);
  if (!host || !requested || typeof hostProfile !== "string" || typeof requestedProfile !== "string") {
    return void 0;
  }
  const noGreaterThan = (left, right) => Object.keys(left).every((key) => left[key] <= right[key]);
  if (noGreaterThan(requested, host)) {
    return { profile: requestedProfile, limits: requested };
  }
  if (noGreaterThan(host, requested)) {
    return { profile: hostProfile, limits: host };
  }
  return void 0;
}
function restrictLimits(base, overrides) {
  const INVALID_BASE = /* @__PURE__ */ Symbol("invalid-base-budget");
  const out = /* @__PURE__ */ Object.create(null);
  const limitKeys = Object.keys(BUDGET_PROFILES[DEFAULT_PROFILE]);
  try {
    for (const key of limitKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(base, key);
      const value = descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : void 0;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw INVALID_BASE;
      }
      out[key] = value;
    }
  } catch (error) {
    if (error === INVALID_BASE) {
      throw new Error("base budget limits must be own finite non-negative data properties");
    }
    throw new Error("base budget limits could not be inspected safely");
  }
  let keys;
  try {
    keys = Reflect.ownKeys(overrides);
  } catch {
    return freezeGenerated(out);
  }
  for (const key of keys) {
    if (typeof key !== "string" || !limitKeys.includes(key)) continue;
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(overrides, key);
    } catch {
      return freezeGenerated(out);
    }
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) continue;
    const value = descriptor.value;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    const current = out[key];
    out[key] = Math.min(current, value);
  }
  return freezeGenerated(out);
}

// src/core/contract-identity.ts
var CONTRACT_VALUE = /^([a-z][a-z0-9-]*)\/((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/u;
function splitContractIdentity(value, axis) {
  const match = CONTRACT_VALUE.exec(value);
  if (!match) {
    throw new Error(`${axis} is not a canonical contract-name/major.minor identity`);
  }
  return Object.freeze({ value, name: match[1], version: match[2] });
}
var REQUEST_CONTRACT_IDENTITY = splitContractIdentity(
  REQUEST_CONTRACT,
  "REQUEST_CONTRACT"
);
var ARTIFACT_CONTRACT_IDENTITY = splitContractIdentity(
  ARTIFACT_CONTRACT,
  "ARTIFACT_CONTRACT"
);

export {
  PACKAGE_VERSION,
  REQUEST_CONTRACT,
  ARTIFACT_CONTRACT,
  CONTRACT_DIGEST,
  CATALOG_DIGEST,
  STABLE_SKILL_COUNT,
  getBuildIdentity,
  deepFreeze,
  freezeGenerated,
  MAX_ERROR_RECORDS,
  isSafeDisplayString,
  safeText,
  pointer,
  makeError,
  finalizeErrors,
  ok,
  err,
  utf8ByteLength,
  sha256Hex,
  sha256Digest,
  CanonicalizationError,
  canonicalize,
  canonicalDigest,
  canonicalDigestExcluding,
  BUDGET_PROFILES,
  DEFAULT_PROFILE,
  tryGetBudgetLimits,
  getBudgetLimits,
  trySelectTighterBudgetProfile,
  restrictLimits,
  REQUEST_CONTRACT_IDENTITY,
  ARTIFACT_CONTRACT_IDENTITY
};
//# sourceMappingURL=chunk-22OHKNZ5.js.map