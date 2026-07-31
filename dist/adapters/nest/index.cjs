"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/adapters/nest/index.ts
var nest_exports = {};
__export(nest_exports, {
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN: () => NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN,
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3: () => NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3,
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5: () => NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5,
  NEST_TIME_BUILD_PROFILE: () => NEST_TIME_BUILD_PROFILE,
  NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS: () => NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS,
  nestSpikeRecorderToRaster: () => nestSpikeRecorderToRaster
});
module.exports = __toCommonJS(nest_exports);

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

// src/generated/identity.ts
var REQUEST_CONTRACT = "cortexel-figure-request/1.0";
var ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";

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

// src/core/deep-freeze.ts
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
    "safeRepairOperations": 128,
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
    "safeRepairOperations": 64,
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

// src/core/safe-snapshot.ts
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var SnapshotFailure = class extends Error {
  diagnostic;
  constructor(diagnostic) {
    super(diagnostic.message);
    this.name = "SnapshotFailure";
    this.diagnostic = diagnostic;
  }
};
function reflect(operation, path) {
  try {
    return operation();
  } catch {
    throw new SnapshotFailure(
      makeError({
        code: "SNAPSHOT_HOSTILE_REFLECTION",
        stage: "snapshot",
        instancePath: path,
        message: "reflecting on this value threw; it is treated as hostile and is not inspected again"
      })
    );
  }
}
function isWellFormedString(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
      if (!(next >= 56320 && next <= 57343)) return false;
      i++;
    } else if (code >= 56320 && code <= 57343) {
      return false;
    }
  }
  return true;
}
function fail(code, path, message, actual) {
  throw new SnapshotFailure(
    makeError({
      code,
      stage: "snapshot",
      instancePath: path,
      message,
      ...actual !== void 0 ? { actual } : {}
    })
  );
}
function snapshotNode(value, path, depth, state) {
  if (depth > state.limits.jsonDepth) {
    fail("SNAPSHOT_DEPTH_EXCEEDED", path, "the value nests deeper than the snapshot permits");
  }
  state.nodes++;
  if (state.nodes > state.limits.jsonTotalNodes) {
    fail("SNAPSHOT_NODES_EXCEEDED", path, "the value graph exceeds the total node limit");
  }
  if (value === null) return null;
  switch (typeof value) {
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) {
        fail(
          "SNAPSHOT_NON_FINITE_NUMBER",
          path,
          "NaN and Infinity are not measurements; use null for a missing observation",
          value
        );
      }
      return value;
    case "string":
      if (!isWellFormedString(value)) {
        fail(
          "SNAPSHOT_MALFORMED_STRING",
          path,
          "the string contains a lone surrogate and is not well-formed Unicode"
        );
      }
      if (value.length > state.limits.jsonStringLength) {
        fail(
          "SNAPSHOT_STRING_TOO_LONG",
          path,
          `the string contains ${value.length} UTF-16 code units, over the active limit of ${state.limits.jsonStringLength}`
        );
      }
      return value;
    case "undefined":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "undefined is not a JSON value", value);
    // eslint-disable-next-line no-fallthrough
    case "function":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "a function is not data", value);
    // eslint-disable-next-line no-fallthrough
    case "symbol":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "a symbol is not a JSON value", value);
    // eslint-disable-next-line no-fallthrough
    case "bigint":
      fail(
        "SNAPSHOT_UNSUPPORTED_TYPE",
        path,
        "a bigint has no JSON representation; send a number or a string",
        value
      );
    // eslint-disable-next-line no-fallthrough
    case "object":
      break;
    default:
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "the value is of an unsupported type", value);
  }
  const object = value;
  if (state.seen.has(object)) {
    fail("SNAPSHOT_CIRCULAR_REFERENCE", path, "the value graph contains a cycle");
  }
  if (reflect(() => ArrayBuffer.isView(object), path)) {
    fail(
      "SNAPSHOT_NON_PLAIN_OBJECT",
      path,
      "a typed array or DataView is not part of the JSON request contract; use a plain array"
    );
  }
  const isArray = reflect(() => Array.isArray(object), path);
  const prototype = reflect(() => Object.getPrototypeOf(object), path);
  if (!isArray && prototype !== Object.prototype && prototype !== null) {
    fail(
      "SNAPSHOT_NON_PLAIN_OBJECT",
      path,
      "only plain objects and arrays are accepted; a class instance, Date, Map, Set, or Promise is not data"
    );
  }
  state.seen.add(object);
  try {
    return isArray ? snapshotArray(object, path, depth, state) : snapshotObject(object, path, depth, state);
  } finally {
    state.seen.delete(object);
  }
}
function snapshotArray(array, path, depth, state) {
  const lengthDescriptor = reflect(
    () => Object.getOwnPropertyDescriptor(array, "length"),
    path
  );
  if (lengthDescriptor === void 0 || !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")) {
    fail("SNAPSHOT_NON_PLAIN_OBJECT", path, "the array has no intrinsic data length");
  }
  const length = lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length < 0) {
    fail("SNAPSHOT_NON_PLAIN_OBJECT", path, "the array reports an implausible length");
  }
  if (length > state.limits.jsonArrayItems) {
    fail("SNAPSHOT_NODES_EXCEEDED", path, "the array is longer than the snapshot permits");
  }
  const keys = reflect(() => Reflect.ownKeys(array), path);
  const out = [];
  for (let index = 0; index < length; index++) {
    const descriptor = reflect(
      () => Object.getOwnPropertyDescriptor(array, index),
      `${path}/${index}`
    );
    if (descriptor === void 0) {
      fail(
        "SNAPSHOT_SPARSE_ARRAY",
        `${path}/${index}`,
        "the array has a hole; use an explicit null for a missing observation"
      );
    }
    if (!("value" in descriptor)) {
      fail(
        "SNAPSHOT_ACCESSOR_PROPERTY",
        `${path}/${index}`,
        "the element is defined by a getter; Cortexel will not invoke caller code to read data"
      );
    }
    out.push(snapshotNode(descriptor.value, `${path}/${index}`, depth + 1, state));
  }
  for (const key of keys) {
    if (typeof key === "symbol") {
      fail("SNAPSHOT_SYMBOL_KEY", path, "the array carries a symbol-keyed property");
    }
    if (key === "length") continue;
    const canonicalIndex = /^(?:0|[1-9][0-9]*)$/u.test(key) ? Number(key) : -1;
    if (Number.isSafeInteger(canonicalIndex) && canonicalIndex >= 0 && canonicalIndex < length) {
      continue;
    }
    fail(
      "SNAPSHOT_DECORATED_ARRAY",
      path,
      `the array carries the named property ${JSON.stringify(String(key))}, which a JSON array cannot represent`
    );
  }
  return out;
}
function snapshotObject(object, path, depth, state) {
  const keys = reflect(() => Reflect.ownKeys(object), path);
  const out = /* @__PURE__ */ Object.create(null);
  let count = 0;
  for (const key of keys) {
    if (typeof key === "symbol") {
      fail("SNAPSHOT_SYMBOL_KEY", path, "the object carries a symbol-keyed property");
    }
    const childPath2 = `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    if (DANGEROUS_KEYS.has(key)) {
      fail(
        "SNAPSHOT_DANGEROUS_KEY",
        childPath2,
        `the key ${JSON.stringify(key)} can reach Object.prototype and is rejected`
      );
    }
    const descriptor = reflect(() => Object.getOwnPropertyDescriptor(object, key), childPath2);
    if (descriptor === void 0) continue;
    if (!descriptor.enumerable) continue;
    if (!("value" in descriptor)) {
      fail(
        "SNAPSHOT_ACCESSOR_PROPERTY",
        childPath2,
        "the property is defined by a getter or setter; Cortexel inspects descriptors and will not invoke caller code to read data"
      );
    }
    count++;
    if (count > state.limits.jsonObjectKeys) {
      fail("SNAPSHOT_NODES_EXCEEDED", path, "the object has more members than the snapshot permits");
    }
    out[key] = snapshotNode(descriptor.value, childPath2, depth + 1, state);
  }
  return out;
}
function snapshotValue(value, limits) {
  const state = { limits, nodes: 0, seen: /* @__PURE__ */ new Set() };
  try {
    return ok(snapshotNode(value, "", 0, state));
  } catch (error) {
    if (error instanceof SnapshotFailure) {
      return err([error.diagnostic]);
    }
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the snapshot failed in an unexpected way; this is a Cortexel defect"
      })
    ]);
  }
}

// src/core/semantics/nest-time.ts
var NEST_TIC_T_MAX = (1n << 63n) - 1n;
var NEST_TIME_INF_MARGIN = 8n;
var MAX_SAFE_TICS = BigInt(Number.MAX_SAFE_INTEGER);
function failure(kind, message) {
  return { ok: false, kind, message };
}
function sourceGetMillisecondsV310(tics, ticsPerMs) {
  const millisecondsPerTic = 1 / Number(ticsPerMs);
  return Number(tics) * millisecondsPerTic;
}
function nestFiniteTimeLimitTicsV310(resolutionTics) {
  if (resolutionTics <= 0n || resolutionTics > MAX_SAFE_TICS) return void 0;
  const marginLimited = NEST_TIC_T_MAX / NEST_TIME_INF_MARGIN;
  const limit = marginLimited - marginLimited % resolutionTics;
  return limit > 0n ? limit : void 0;
}
function projectNestTicsToMillisecondsV310(tics, ticsPerMs) {
  if (tics < 0n || tics > MAX_SAFE_TICS || ticsPerMs <= 0n || ticsPerMs > MAX_SAFE_TICS) {
    return failure(
      "source_profile",
      "the admitted NEST 3.10.0 source-clock subset requires non-negative tics and positive ticsPerMs no larger than Number.MAX_SAFE_INTEGER."
    );
  }
  const ticsPerMsNumber = Number(ticsPerMs);
  const milliseconds = sourceGetMillisecondsV310(tics, ticsPerMs);
  if (!Number.isFinite(milliseconds)) {
    return failure(
      "source_profile",
      "the NEST 3.10.0 get_ms binary64 projection is not finite."
    );
  }
  const recoveredNumber = Math.trunc(milliseconds * ticsPerMsNumber + 0.5);
  if (!Number.isSafeInteger(recoveredNumber) || BigInt(recoveredNumber) !== tics) {
    return failure(
      "source_profile",
      "the NEST 3.10.0 get_ms projection does not recover the declared tic with the pinned non-negative Time(ms) inverse."
    );
  }
  return { ok: true, milliseconds };
}
function projectNestWindowEndpointsV310(input) {
  const finiteTimeLimitTics = nestFiniteTimeLimitTicsV310(input.resolutionTics);
  if (finiteTimeLimitTics === void 0 || input.ticsPerMs <= 0n || input.ticsPerMs > MAX_SAFE_TICS) {
    return failure(
      "source_profile",
      "the admitted NEST 3.10.0 source-clock subset requires positive safe-integer ticsPerMs and resolutionTics."
    );
  }
  const operativeTics = [
    ...input.retainedTics,
    input.lowerEndpointTics,
    input.upperEndpointTics
  ];
  for (const tics of operativeTics) {
    if (tics < 0n) {
      return failure(
        "source_profile",
        "every retained and combined NEST Time value must be non-negative."
      );
    }
    if (tics >= finiteTimeLimitTics) {
      return failure(
        "source_profile",
        "every operative NEST Time value must be strictly below the pinned finite-Time limit."
      );
    }
    if (tics > MAX_SAFE_TICS) {
      return failure(
        "source_profile",
        "every retained and combined NEST Time value in executable mapping profile 5 must be no larger than Number.MAX_SAFE_INTEGER."
      );
    }
    const projected = projectNestTicsToMillisecondsV310(tics, input.ticsPerMs);
    if (!projected.ok) return projected;
  }
  if (!(input.upperEndpointTics > input.lowerEndpointTics)) {
    return failure(
      "window_order",
      "the exact upper endpoint tic must be strictly greater than the exact lower endpoint tic."
    );
  }
  const lower = projectNestTicsToMillisecondsV310(
    input.lowerEndpointTics,
    input.ticsPerMs
  );
  const upper = projectNestTicsToMillisecondsV310(
    input.upperEndpointTics,
    input.ticsPerMs
  );
  if (!lower.ok) return lower;
  if (!upper.ok) return upper;
  if (!(upper.milliseconds > lower.milliseconds)) {
    return failure(
      "numeric_resolution",
      "the ordered NEST endpoint tics alias or invert after the pinned get_ms binary64 projection."
    );
  }
  for (const [label, tics, projected] of [
    ["lower", input.lowerEndpointTics, lower.milliseconds],
    ["upper", input.upperEndpointTics, upper.milliseconds]
  ]) {
    for (const neighbor of [
      tics >= input.resolutionTics ? tics - input.resolutionTics : void 0,
      tics + input.resolutionTics < finiteTimeLimitTics ? tics + input.resolutionTics : void 0
    ]) {
      if (neighbor === void 0) continue;
      const neighborMilliseconds = sourceGetMillisecondsV310(
        neighbor,
        input.ticsPerMs
      );
      if (!Number.isFinite(neighborMilliseconds)) {
        return failure(
          "source_profile",
          `the ${label} endpoint's adjacent NEST resolution-grid value has a non-finite get_ms projection.`
        );
      }
      if (Object.is(neighborMilliseconds, projected)) {
        return failure(
          "numeric_resolution",
          `the ${label} endpoint aliases its adjacent NEST resolution-grid value after the pinned get_ms binary64 projection.`
        );
      }
    }
  }
  return {
    ok: true,
    lowerMilliseconds: lower.milliseconds,
    upperMilliseconds: upper.milliseconds,
    finiteTimeLimitTics
  };
}

// src/adapters/nest/profile.ts
var NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3 = Object.freeze({
  adapterRevision: 3,
  nestVersion: "3.10.0",
  upstreamSourceCommit: "acca9704da248750219a027db99fec6cd1f9052a",
  inputDigestDomain: "cortexel.nest-spike-recorder-adapter-input.v3",
  captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v1",
  statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1"
});
var NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5 = Object.freeze({
  adapterRevision: 5,
  nestVersion: "3.10.0",
  upstreamSourceCommit: "acca9704da248750219a027db99fec6cd1f9052a",
  inputDigestDomain: "cortexel.nest-spike-recorder-adapter-input.v5",
  branches: Object.freeze({
    finiteStop: Object.freeze({
      stopKind: "finite",
      captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v3",
      recordTo: "memory",
      timeInSteps: false,
      statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1",
      executionScope: "single_process",
      eventBoundary: "(origin+start,origin+stop]",
      captureHorizon: "origin+stop_after_successful_return"
    }),
    positiveInfinityCaptureBounded: Object.freeze({
      stopKind: "nest_time_positive_infinity",
      captureAuthorityProfile: "cortexel-nest-memory-spike-capture-authority.v4",
      recordTo: "memory",
      timeInSteps: false,
      statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v2",
      executionScope: "single_process",
      eventBoundary: "(origin+start,capture]",
      captureHorizon: "capture_after_successful_advancing_return_before_further_advance_or_mutation"
    })
  }),
  timeBuildProfile: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1",
  captureBoundary: "after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation",
  positiveInfinityExportedMs: Number.MAX_VALUE
});

// src/adapters/nest/recorders.ts
var ADMITTED_NEST_VERSION = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.nestVersion;
var NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3 = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V3.inputDigestDomain;
var NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5 = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.inputDigestDomain;
var NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN = NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5;
var NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.positiveInfinityExportedMs;
var NEST_TIME_BUILD_PROFILE = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.timeBuildProfile;
var CAPTURE_AUTHORITY_PROFILE_V3 = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.finiteStop.captureAuthorityProfile;
var CAPTURE_AUTHORITY_PROFILE_V4 = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.positiveInfinityCaptureBounded.captureAuthorityProfile;
var CAPTURE_AUTHORITY_KIND = "caller_declaration";
var STATUS_READ_METHOD_V1 = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.finiteStop.statusReadMethod;
var STATUS_READ_METHOD_V2 = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.branches.positiveInfinityCaptureBounded.statusReadMethod;
var CAPTURE_BOUNDARY_V1 = "after_successful_simulate_or_run_return";
var CAPTURE_BOUNDARY_V2 = NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5.captureBoundary;
var RECORDING_PLAN_SCOPE = "window_backend_time_encoding_and_sender_wiring";
var SENDER_UNIVERSE_BINDING = "recorded_sender_ids_exactly_equal_full_window_connected_source_universe";
var CLOCK_EPOCH_CONTINUITY = "biological_time_monotonic_since_last_kernel_initialization";
var EVENT_COMPLETENESS = "complete_for_recorded_senders";
var CANONICAL_POSITIVE_DECIMAL = /^[1-9][0-9]*$/u;
var CANONICAL_NON_NEGATIVE_DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
var CORTEXEL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]*$/u;
var MAX_IDENTIFIER_LENGTH = 128;
var MAX_TIC_DECIMAL_LENGTH = 16;
var MAX_SAFE_TICS2 = BigInt(Number.MAX_SAFE_INTEGER);
function fail2(errors) {
  return { ok: false, errors };
}
function adapterFailure(code, instancePath, message) {
  return fail2([makeError({ code, stage: "adapter", instancePath, message })]);
}
function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function firstUnknownKey(value, allowed) {
  return Object.keys(value).filter((key) => !allowed.has(key)).sort()[0];
}
function exactObjectKeysFailure(value, allowed, instancePath, label, adapterRevision = 5) {
  const unknown = firstUnknownKey(value, allowed);
  if (unknown === void 0) return void 0;
  return adapterFailure(
    "ADAPTER_MAPPING_REQUIRED",
    `${instancePath}/${unknown}`,
    `${label} is closed for adapter revision ${adapterRevision}; unknown member ${JSON.stringify(unknown)} is not consumed or digest-normalized.`
  );
}
function snapshotFailure(errors, inputName) {
  const accessorOrHostileReflection = errors.some(
    (error) => error.code === "SNAPSHOT_ACCESSOR_PROPERTY" || error.code === "SNAPSHOT_HOSTILE_REFLECTION"
  );
  if (accessorOrHostileReflection) {
    const firstHostile = errors.find(
      (error) => error.code === "SNAPSHOT_ACCESSOR_PROPERTY" || error.code === "SNAPSHOT_HOSTILE_REFLECTION"
    );
    return adapterFailure(
      "ADAPTER_ACCESSOR_INPUT_REJECTED",
      firstHostile?.instancePath ?? "",
      `the NEST ${inputName} could not be safely snapshotted because it carries an accessor or hostile reflection trap. Pass detached plain data.`
    );
  }
  return fail2(errors);
}
function normalizeSenderId(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : void 0;
  }
  if (typeof value === "string" && value.length <= MAX_IDENTIFIER_LENGTH && CANONICAL_POSITIVE_DECIMAL.test(value)) {
    return value;
  }
  return void 0;
}
function isCortexelIdentifier(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_IDENTIFIER_LENGTH && CORTEXEL_IDENTIFIER.test(value);
}
function parseCanonicalTics(value, instancePath, label, positive) {
  const pattern = positive ? CANONICAL_POSITIVE_DECIMAL : CANONICAL_NON_NEGATIVE_DECIMAL;
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_TIC_DECIMAL_LENGTH || !pattern.test(value)) {
    return {
      ok: false,
      result: adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        instancePath,
        `${label} must be a canonical ${positive ? "positive" : "non-negative"} base-10 integer string of at most ${MAX_TIC_DECIMAL_LENGTH} digits.`
      )
    };
  }
  return { ok: true, canonical: value, value: BigInt(value) };
}
function projectedMillisecondsFailure(tics, ticsPerMs, milliseconds, instancePath, label) {
  const projected = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
  if (!projected.ok) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      instancePath,
      `${label} is outside the pinned source-faithful NEST 3.10.0 time profile: ${projected.message}`
    );
  }
  if (!Object.is(projected.milliseconds, milliseconds)) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      instancePath,
      `${label} must equal pinned NEST 3.10.0 Time::get_ms binary64 evaluation of its declared integer-tic preimage. Received ${milliseconds}; the source-faithful tic authority projects to ${projected.milliseconds}.`
    );
  }
  return void 0;
}
function nestSpikeRecorderToRaster(exported, options) {
  const limits = getBudgetLimits("standard");
  const exportedSnapshot = snapshotValue(exported, limits);
  const optionsSnapshot = snapshotValue(options, limits);
  if (!exportedSnapshot.ok) return snapshotFailure(exportedSnapshot.errors, "export");
  if (!optionsSnapshot.ok) return snapshotFailure(optionsSnapshot.errors, "options");
  const value = exportedSnapshot.value;
  const optionValue = optionsSnapshot.value;
  if (!isPlainRecord(value)) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "",
      "expected a plain NEST spike-recorder status object."
    );
  }
  if (!isPlainRecord(optionValue)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "",
      "NEST adapter options must be a plain object containing a version and the complete recorded sender universe."
    );
  }
  const adapterRevision = 5;
  const optionKeysFailure = exactObjectKeysFailure(
    optionValue,
    /* @__PURE__ */ new Set(["recordedSenderIds", "nestVersion", "captureAuthority", "runId", "recorderId"]),
    "",
    "NEST adapter options",
    adapterRevision
  );
  if (optionKeysFailure) return optionKeysFailure;
  const exportKeysFailure = exactObjectKeysFailure(
    value,
    /* @__PURE__ */ new Set([
      "record_to",
      "time_in_steps",
      "origin",
      "start",
      "stop",
      "n_events",
      "events"
    ]),
    "",
    "NEST exportedStatus",
    adapterRevision
  );
  if (exportKeysFailure) return exportKeysFailure;
  if (value.record_to !== "memory") {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      "/record_to",
      `revision ${adapterRevision} accepts only an explicit \`record_to: "memory"\` status. File, screen, MPI, and SIONlib serializations are not admitted as lossless clock boundaries.`
    );
  }
  if (value.time_in_steps !== false) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      "/time_in_steps",
      `revision ${adapterRevision} requires the status field \`time_in_steps\` to be explicitly false. Missing or step/offset time encodings are not reconstructed as milliseconds.`
    );
  }
  if (!isPlainRecord(value.events)) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/events",
      "a NEST spike-recorder export must have an `events` object with `senders` and `times` arrays."
    );
  }
  const events = value.events;
  const offsetKey = Object.prototype.hasOwnProperty.call(events, "offsets") ? "offsets" : Object.prototype.hasOwnProperty.call(events, "offset") ? "offset" : void 0;
  if (offsetKey !== void 0) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      `/events/${offsetKey}`,
      `offset-bearing events contradict the revision-${adapterRevision}-admitted native-millisecond mode. Preserve the raw step/offset representation for a future contract instead of collapsing it here.`
    );
  }
  const eventKeysFailure = exactObjectKeysFailure(
    events,
    /* @__PURE__ */ new Set(["senders", "times"]),
    "/events",
    "NEST exportedStatus.events",
    adapterRevision
  );
  if (eventKeysFailure) return eventKeysFailure;
  if (!Array.isArray(events.senders) || !Array.isArray(events.times)) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/events",
      "`events.senders` and `events.times` must both be dense plain arrays."
    );
  }
  const nEvents = value.n_events;
  if (typeof nEvents !== "number" || !Number.isSafeInteger(nEvents) || nEvents < 0) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/n_events",
      "`n_events` is required and must be a non-negative safe integer copied from the NEST recording-device status. Cortexel does not infer completeness from the event arrays."
    );
  }
  if (events.senders.length !== nEvents || events.times.length !== nEvents) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/n_events",
      `the authoritative NEST n_events value (${nEvents}) must equal both parallel event-array lengths; received senders=${events.senders.length} and times=${events.times.length}. Cortexel cannot author a completeness claim from inconsistent status data.`
    );
  }
  const origin = value.origin;
  const start = value.start;
  const stop = value.stop;
  if (typeof origin !== "number" || !Number.isFinite(origin) || origin < 0) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/origin",
      "`origin` must be a finite non-negative number in NEST milliseconds."
    );
  }
  if (typeof start !== "number" || !Number.isFinite(start) || start < 0) {
    return adapterFailure(
      "ADAPTER_NEST_UNSUPPORTED_SHAPE",
      "/start",
      "`start` must be a finite non-negative number relative to the NEST recording-device origin."
    );
  }
  let positiveInfinityStop = false;
  let finiteStop;
  if (isPlainRecord(stop)) {
    const stopKeysFailure = exactObjectKeysFailure(
      stop,
      /* @__PURE__ */ new Set(["kind"]),
      "/stop",
      "positive-infinity stop sentinel",
      5
    );
    if (stopKeysFailure) return stopKeysFailure;
    if (stop.kind !== "nest_time_positive_infinity") {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        "/stop/kind",
        'adapter revision 5 requires the exact projection token `{"kind":"nest_time_positive_infinity"}` for NEST 3.10.0 positive-infinity Time. Arbitrary tags are not stop authority.'
      );
    }
    positiveInfinityStop = true;
  } else {
    if (stop === Number.MAX_VALUE) {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        "/stop",
        'raw DBL_MAX is NEST 3.10.0\'s serialized positive-infinity Time sentinel, not an ordinary finite recorder stop. Apply plain-data projection revision 2 so it emits `{"kind":"nest_time_positive_infinity"}`, then use capture-authority v4 with adapter revision 5.'
      );
    }
    if (typeof stop !== "number" || !Number.isFinite(stop) || stop < 0) {
      return adapterFailure(
        "ADAPTER_NEST_UNSUPPORTED_SHAPE",
        "/stop",
        "`stop` must be a finite non-negative number relative to the NEST recording-device origin."
      );
    }
    if (!(start < stop)) {
      return adapterFailure(
        "ADAPTER_NEST_UNSUPPORTED_SHAPE",
        "/stop",
        "`stop` must be strictly greater than `start` for the NEST origin-relative recording interval."
      );
    }
    finiteStop = stop;
  }
  const nestVersion = optionValue.nestVersion;
  if (typeof nestVersion !== "string" || nestVersion.length > 120 || nestVersion !== ADMITTED_NEST_VERSION) {
    return adapterFailure(
      "ADAPTER_UNSUPPORTED_VERSION",
      "/nestVersion",
      `nestVersion is required and must equal the exact pinned adapter-revision-${adapterRevision} profile 3.10.0. Other NEST releases and patches remain unsupported until separately executed and evidenced.`
    );
  }
  const captureAuthority = optionValue.captureAuthority;
  if (!isPlainRecord(captureAuthority)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority",
      "captureAuthority is required. A detached final status alone cannot prove that the NEST memory buffer was not reset, that recorder configuration and wiring stayed fixed, that the successful-return capture endpoint was reached, that the kernel clock stayed monotonic, that the projection was lossless, or that MPI ranks were merged."
    );
  }
  const captureKeysFailure = exactObjectKeysFailure(
    captureAuthority,
    /* @__PURE__ */ new Set([
      "kind",
      "profile",
      "runtimeStatus",
      "recordingGrid",
      "bufferEpoch",
      "recordingPlan",
      "clockEpochContinuity",
      "eventCompleteness"
    ]),
    "/captureAuthority",
    "captureAuthority",
    adapterRevision
  );
  if (captureKeysFailure) return captureKeysFailure;
  if (captureAuthority.kind !== CAPTURE_AUTHORITY_KIND) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/kind",
      `captureAuthority.kind must equal ${JSON.stringify(CAPTURE_AUTHORITY_KIND)}. This detached adapter accepts a caller declaration, not an authenticated live-capture receipt.`
    );
  }
  const captureAuthorityProfile = positiveInfinityStop ? CAPTURE_AUTHORITY_PROFILE_V4 : CAPTURE_AUTHORITY_PROFILE_V3;
  if (captureAuthority.profile !== captureAuthorityProfile) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/profile",
      positiveInfinityStop ? `captureAuthority.profile must equal ${JSON.stringify(captureAuthorityProfile)} for the revision-5 positive-infinity branch. Finite-stop V3 and positive-infinity V4 authority are not interchangeable.` : `captureAuthority.profile must equal ${JSON.stringify(CAPTURE_AUTHORITY_PROFILE_V3)} for the corrected revision-5 finite-stop branch. Historical V1 authority does not bind the pinned time build or source-faithful clock projection.`
    );
  }
  const runtimeStatus = captureAuthority.runtimeStatus;
  if (!isPlainRecord(runtimeStatus)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus",
      "captureAuthority.runtimeStatus must be a closed plain object."
    );
  }
  const runtimeKeysFailure = exactObjectKeysFailure(
    runtimeStatus,
    /* @__PURE__ */ new Set([
      "nestVersion",
      "statusReadMethod",
      "executionScope",
      "resolutionMs",
      "ticsPerMs",
      "resolutionTics",
      "captureBiologicalTimeTics",
      "captureBoundary",
      "timeBuildProfile"
    ]),
    "/captureAuthority/runtimeStatus",
    "captureAuthority.runtimeStatus",
    adapterRevision
  );
  if (runtimeKeysFailure) return runtimeKeysFailure;
  if (runtimeStatus.nestVersion !== ADMITTED_NEST_VERSION) {
    return adapterFailure(
      "ADAPTER_UNSUPPORTED_VERSION",
      "/captureAuthority/runtimeStatus/nestVersion",
      "captureAuthority.runtimeStatus.nestVersion must equal the pinned 3.10.0 profile."
    );
  }
  if (runtimeStatus.nestVersion !== nestVersion) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/nestVersion",
      "the capture runtime version must exactly equal the top-level adapter version declaration."
    );
  }
  if (runtimeStatus.timeBuildProfile !== NEST_TIME_BUILD_PROFILE) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/timeBuildProfile",
      `timeBuildProfile must equal ${JSON.stringify(NEST_TIME_BUILD_PROFILE)}. NEST's Time ceiling and serialization depend on compiled integer widths and IEEE-754 behavior, so version alone is insufficient authority.`
    );
  }
  const statusReadMethod = positiveInfinityStop ? STATUS_READ_METHOD_V2 : STATUS_READ_METHOD_V1;
  if (runtimeStatus.statusReadMethod !== statusReadMethod) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/statusReadMethod",
      positiveInfinityStop ? `statusReadMethod must equal ${JSON.stringify(statusReadMethod)} for the revision-5 positive-infinity branch; raw NumPy values, bulk collections, lossy projections, and reconstructed status objects have different authority boundaries.` : `statusReadMethod must equal ${JSON.stringify(STATUS_READ_METHOD_V1)}; raw NumPy values, bulk collections, lossy projections, and reconstructed status objects have different authority boundaries.`
    );
  }
  const captureBoundary = positiveInfinityStop ? CAPTURE_BOUNDARY_V2 : CAPTURE_BOUNDARY_V1;
  if (runtimeStatus.captureBoundary !== captureBoundary) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/captureBoundary",
      `captureBoundary must equal ${JSON.stringify(captureBoundary)}.`
    );
  }
  const resolutionMs = runtimeStatus.resolutionMs;
  if (typeof resolutionMs !== "number" || !Number.isFinite(resolutionMs) || !(resolutionMs > 0)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/resolutionMs",
      "resolutionMs must be a finite positive binary64 value copied from the pinned NEST runtime status."
    );
  }
  const ticsPerMsResult = parseCanonicalTics(
    runtimeStatus.ticsPerMs,
    "/captureAuthority/runtimeStatus/ticsPerMs",
    "ticsPerMs",
    true
  );
  if (!ticsPerMsResult.ok) return ticsPerMsResult.result;
  const resolutionTicsResult = parseCanonicalTics(
    runtimeStatus.resolutionTics,
    "/captureAuthority/runtimeStatus/resolutionTics",
    "resolutionTics",
    true
  );
  if (!resolutionTicsResult.ok) return resolutionTicsResult.result;
  const captureTicsResult = parseCanonicalTics(
    runtimeStatus.captureBiologicalTimeTics,
    "/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
    "captureBiologicalTimeTics",
    false
  );
  if (!captureTicsResult.ok) return captureTicsResult.result;
  const executionScope = runtimeStatus.executionScope;
  if (!isPlainRecord(executionScope)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/executionScope",
      "executionScope must be a closed single-process scope object."
    );
  }
  const executionScopeKeysFailure = exactObjectKeysFailure(
    executionScope,
    /* @__PURE__ */ new Set(["kind", "numProcesses", "rank", "localNumThreads"]),
    "/captureAuthority/runtimeStatus/executionScope",
    "captureAuthority.runtimeStatus.executionScope",
    adapterRevision
  );
  if (executionScopeKeysFailure) return executionScopeKeysFailure;
  if (executionScope.kind !== "single_process" || executionScope.numProcesses !== 1 || executionScope.rank !== 0 || typeof executionScope.localNumThreads !== "number" || !Number.isSafeInteger(executionScope.localNumThreads) || executionScope.localNumThreads < 1 || executionScope.localNumThreads > 1e6) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/runtimeStatus/executionScope",
      `revision ${adapterRevision} admits only one exact single-process scope: kind=single_process, numProcesses=1, rank=0, and localNumThreads a safe integer from 1 through 1000000. Rank-local and caller-premerged MPI status is not a complete recorder authority.`
    );
  }
  const recordingGrid = captureAuthority.recordingGrid;
  if (!isPlainRecord(recordingGrid)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingGrid",
      positiveInfinityStop ? "recordingGrid must be a closed object containing only the exact integer-tic preimages of finite origin and start. NEST positive infinity has no finite stopTics preimage." : "recordingGrid must be a closed object containing the exact integer-tic preimages of origin, start, and stop."
    );
  }
  const recordingGridKeysFailure = exactObjectKeysFailure(
    recordingGrid,
    positiveInfinityStop ? /* @__PURE__ */ new Set(["originTics", "startTics"]) : /* @__PURE__ */ new Set(["originTics", "startTics", "stopTics"]),
    "/captureAuthority/recordingGrid",
    "captureAuthority.recordingGrid",
    adapterRevision
  );
  if (recordingGridKeysFailure) return recordingGridKeysFailure;
  const originTicsResult = parseCanonicalTics(
    recordingGrid.originTics,
    "/captureAuthority/recordingGrid/originTics",
    "originTics",
    false
  );
  if (!originTicsResult.ok) return originTicsResult.result;
  const startTicsResult = parseCanonicalTics(
    recordingGrid.startTics,
    "/captureAuthority/recordingGrid/startTics",
    "startTics",
    false
  );
  if (!startTicsResult.ok) return startTicsResult.result;
  let finiteStopTics;
  if (!positiveInfinityStop) {
    const stopTicsResult = parseCanonicalTics(
      recordingGrid.stopTics,
      "/captureAuthority/recordingGrid/stopTics",
      "stopTics",
      false
    );
    if (!stopTicsResult.ok) return stopTicsResult.result;
    finiteStopTics = stopTicsResult;
  }
  const bufferEpoch = captureAuthority.bufferEpoch;
  if (!isPlainRecord(bufferEpoch)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/bufferEpoch",
      "bufferEpoch must identify the most recent recorder creation or n_events=0 memory clear."
    );
  }
  const bufferKeysFailure = exactObjectKeysFailure(
    bufferEpoch,
    /* @__PURE__ */ new Set(["beganBy", "beganAtBiologicalTimeTics"]),
    "/captureAuthority/bufferEpoch",
    "captureAuthority.bufferEpoch",
    adapterRevision
  );
  if (bufferKeysFailure) return bufferKeysFailure;
  if (bufferEpoch.beganBy !== "recorder_creation" && bufferEpoch.beganBy !== "n_events_zero") {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/bufferEpoch/beganBy",
      "bufferEpoch.beganBy must be recorder_creation or n_events_zero."
    );
  }
  const bufferBeganTicsResult = parseCanonicalTics(
    bufferEpoch.beganAtBiologicalTimeTics,
    "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics",
    "bufferEpoch.beganAtBiologicalTimeTics",
    false
  );
  if (!bufferBeganTicsResult.ok) return bufferBeganTicsResult.result;
  const recordingPlan = captureAuthority.recordingPlan;
  if (!isPlainRecord(recordingPlan)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingPlan",
      "recordingPlan must identify the most recent recorder-window, backend, clock, or sender-wiring mutation."
    );
  }
  const planKeysFailure = exactObjectKeysFailure(
    recordingPlan,
    /* @__PURE__ */ new Set(["lastMutationAtBiologicalTimeTics", "scope", "senderUniverseBinding"]),
    "/captureAuthority/recordingPlan",
    "captureAuthority.recordingPlan",
    adapterRevision
  );
  if (planKeysFailure) return planKeysFailure;
  if (recordingPlan.scope !== RECORDING_PLAN_SCOPE) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingPlan/scope",
      `recordingPlan.scope must equal ${JSON.stringify(RECORDING_PLAN_SCOPE)}.`
    );
  }
  if (recordingPlan.senderUniverseBinding !== SENDER_UNIVERSE_BINDING) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingPlan/senderUniverseBinding",
      `senderUniverseBinding must equal ${JSON.stringify(SENDER_UNIVERSE_BINDING)}.`
    );
  }
  const planMutationTicsResult = parseCanonicalTics(
    recordingPlan.lastMutationAtBiologicalTimeTics,
    "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics",
    "recordingPlan.lastMutationAtBiologicalTimeTics",
    false
  );
  if (!planMutationTicsResult.ok) return planMutationTicsResult.result;
  if (captureAuthority.clockEpochContinuity !== CLOCK_EPOCH_CONTINUITY) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/clockEpochContinuity",
      `captureAuthority.clockEpochContinuity must equal ${JSON.stringify(CLOCK_EPOCH_CONTINUITY)}. NEST can reset biological_time to zero without destroying the recorder or clearing retained memory, and its own 3.10.0 source marks that operation incompletely supported.`
    );
  }
  if (captureAuthority.eventCompleteness !== EVENT_COMPLETENESS) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/eventCompleteness",
      `captureAuthority.eventCompleteness must equal ${JSON.stringify(EVENT_COMPLETENESS)}.`
    );
  }
  const ticsPerMs = ticsPerMsResult.value;
  const resolutionTics = resolutionTicsResult.value;
  const captureBiologicalTimeTics = captureTicsResult.value;
  const originTics = originTicsResult.value;
  const startTics = startTicsResult.value;
  const beganAtBiologicalTimeTics = bufferBeganTicsResult.value;
  const lastMutationAtBiologicalTimeTics = planMutationTicsResult.value;
  if (ticsPerMs > MAX_SAFE_TICS2) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      "/captureAuthority/runtimeStatus/ticsPerMs",
      "ticsPerMs is outside the revision-5 source-clock subset; it must be no larger than Number.MAX_SAFE_INTEGER."
    );
  }
  const finiteTimeLimitTics = nestFiniteTimeLimitTicsV310(resolutionTics);
  if (finiteTimeLimitTics === void 0) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      "/captureAuthority/runtimeStatus/resolutionTics",
      "resolutionTics is outside the pinned LP64/int64 NEST 3.10.0 finite-Time build profile and exact-integer subset."
    );
  }
  const primitiveTics = [
    [
      resolutionTics,
      "/captureAuthority/runtimeStatus/resolutionTics",
      "resolutionTics"
    ],
    [
      captureBiologicalTimeTics,
      "/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
      "captureBiologicalTimeTics"
    ],
    [originTics, "/captureAuthority/recordingGrid/originTics", "originTics"],
    [startTics, "/captureAuthority/recordingGrid/startTics", "startTics"],
    [
      beganAtBiologicalTimeTics,
      "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics",
      "beganAtBiologicalTimeTics"
    ],
    [
      lastMutationAtBiologicalTimeTics,
      "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics",
      "lastMutationAtBiologicalTimeTics"
    ]
  ];
  if (finiteStopTics !== void 0) {
    primitiveTics.splice(4, 0, [
      finiteStopTics.value,
      "/captureAuthority/recordingGrid/stopTics",
      "stopTics"
    ]);
  }
  for (const [tics, instancePath, label] of primitiveTics) {
    if (tics > MAX_SAFE_TICS2 || tics >= finiteTimeLimitTics) {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        instancePath,
        `${label} is outside the revision-5 conservative source-clock subset; every retained NEST Time tic must be a safe integer strictly below the pinned finite-Time limit.`
      );
    }
    const projection = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
    if (!projection.ok) {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        instancePath,
        `${label} cannot round-trip through the pinned NEST 3.10.0 binary64 millisecond projection: ${projection.message}`
      );
    }
  }
  const projectionEntries = [
    [resolutionTics, resolutionMs, "/captureAuthority/runtimeStatus/resolutionMs", "resolutionMs"],
    [originTics, origin, "/captureAuthority/recordingGrid/originTics", "origin"],
    [startTics, start, "/captureAuthority/recordingGrid/startTics", "start"]
  ];
  if (!positiveInfinityStop) {
    projectionEntries.push([
      finiteStopTics.value,
      finiteStop,
      "/captureAuthority/recordingGrid/stopTics",
      "stop"
    ]);
  }
  for (const [tics, milliseconds, instancePath, label] of projectionEntries) {
    const projectionFailure = projectedMillisecondsFailure(
      tics,
      ticsPerMs,
      milliseconds,
      instancePath,
      label
    );
    if (projectionFailure) return projectionFailure;
  }
  const gridEntries = [
    [originTics, "/captureAuthority/recordingGrid/originTics", "originTics"],
    [startTics, "/captureAuthority/recordingGrid/startTics", "startTics"],
    [
      captureBiologicalTimeTics,
      "/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
      "captureBiologicalTimeTics"
    ],
    [
      beganAtBiologicalTimeTics,
      "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics",
      "beganAtBiologicalTimeTics"
    ],
    [
      lastMutationAtBiologicalTimeTics,
      "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics",
      "lastMutationAtBiologicalTimeTics"
    ]
  ];
  if (!positiveInfinityStop) {
    gridEntries.splice(2, 0, [
      finiteStopTics.value,
      "/captureAuthority/recordingGrid/stopTics",
      "stopTics"
    ]);
  }
  for (const [tics, instancePath, label] of gridEntries) {
    if (tics % resolutionTics !== 0n) {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        instancePath,
        `${label} must lie exactly on the declared NEST runtime resolution grid.`
      );
    }
  }
  const absoluteStartTics = originTics + startTics;
  const absoluteUpperTics = positiveInfinityStop ? captureBiologicalTimeTics : originTics + finiteStopTics.value;
  if (positiveInfinityStop) {
    if (captureBiologicalTimeTics <= absoluteStartTics) {
      return adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        "/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
        "captureBiologicalTimeTics must be strictly greater than originTics + startTics. The finite successful-return capture endpoint, not the configured positive-infinity stop, closes this raster window."
      );
    }
  } else {
    if (captureBiologicalTimeTics < absoluteUpperTics) {
      return adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        "/captureAuthority/runtimeStatus/captureBiologicalTimeTics",
        "captureBiologicalTimeTics must be at least originTics + stopTics, and the status must be read only after the Simulate or Run call that reached that endpoint returned successfully."
      );
    }
  }
  if (beganAtBiologicalTimeTics > absoluteStartTics) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics",
      "the most recent recorder creation or n_events=0 clear must be no later than originTics + startTics."
    );
  }
  if (lastMutationAtBiologicalTimeTics > absoluteStartTics) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics",
      "the most recent recorder-window, backend, clock, or sender-wiring mutation must be no later than originTics + startTics."
    );
  }
  for (const [tics, instancePath, label] of [
    [
      absoluteStartTics,
      "/captureAuthority/recordingGrid/startTics",
      "originTics + startTics"
    ],
    [
      absoluteUpperTics,
      positiveInfinityStop ? "/captureAuthority/runtimeStatus/captureBiologicalTimeTics" : "/captureAuthority/recordingGrid/stopTics",
      positiveInfinityStop ? "captureBiologicalTimeTics" : "originTics + stopTics"
    ]
  ]) {
    if (tics > MAX_SAFE_TICS2 || tics >= finiteTimeLimitTics) {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        instancePath,
        `${label} is outside the revision-5 conservative source-clock subset; each combined endpoint must be a safe integer strictly below the pinned finite-Time limit.`
      );
    }
    const projection = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
    if (!projection.ok) {
      return adapterFailure(
        "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
        instancePath,
        `${label} cannot round-trip through the pinned NEST 3.10.0 binary64 millisecond projection: ${projection.message}`
      );
    }
  }
  const windowProjection = projectNestWindowEndpointsV310({
    ticsPerMs,
    resolutionTics,
    retainedTics: [
      originTics,
      startTics,
      ...positiveInfinityStop ? [] : [finiteStopTics.value],
      captureBiologicalTimeTics,
      beganAtBiologicalTimeTics,
      lastMutationAtBiologicalTimeTics
    ],
    lowerEndpointTics: absoluteStartTics,
    upperEndpointTics: absoluteUpperTics
  });
  if (!windowProjection.ok) {
    return adapterFailure(
      "ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
      positiveInfinityStop ? "/captureAuthority/runtimeStatus/captureBiologicalTimeTics" : "/captureAuthority/recordingGrid/stopTics",
      `the declared NEST clock is outside the revision-5 source-faithful finite and distinguishable subset: ${windowProjection.message}`
    );
  }
  const captureTime = positiveInfinityStop ? windowProjection.upperMilliseconds : void 0;
  const recordedValues = optionValue.recordedSenderIds;
  if (!Array.isArray(recordedValues) || recordedValues.length === 0) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/recordedSenderIds",
      "recordedSenderIds is required and must be a non-empty array containing the complete recorded universe, including silent senders."
    );
  }
  const recordedSenderIds = [];
  const recordedUniverse = /* @__PURE__ */ new Set();
  for (let index = 0; index < recordedValues.length; index++) {
    const normalized = normalizeSenderId(recordedValues[index]);
    if (normalized === void 0) {
      return adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        `/recordedSenderIds/${index}`,
        "a recorded sender id must be a positive safe-integer number or an already-canonical positive decimal string."
      );
    }
    if (recordedUniverse.has(normalized)) {
      return adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        `/recordedSenderIds/${index}`,
        "recordedSenderIds must be unique after canonical decimal normalization."
      );
    }
    recordedUniverse.add(normalized);
    recordedSenderIds.push(normalized);
  }
  const eventSenderIds = [];
  const eventTimes = [];
  for (let index = 0; index < events.times.length; index++) {
    const time = events.times[index];
    if (typeof time !== "number" || !Number.isFinite(time)) {
      return adapterFailure(
        "ADAPTER_NEST_UNSUPPORTED_SHAPE",
        `/events/times/${index}`,
        "each native-millisecond event time must already be a finite JavaScript number; strings and coercible objects are rejected."
      );
    }
    const sender = normalizeSenderId(events.senders[index]);
    if (sender === void 0) {
      return adapterFailure(
        "ADAPTER_NEST_UNSUPPORTED_SHAPE",
        `/events/senders/${index}`,
        "each event sender must be a positive safe-integer number or an already-canonical positive decimal string."
      );
    }
    if (!recordedUniverse.has(sender)) {
      return adapterFailure(
        "ADAPTER_MAPPING_REQUIRED",
        `/events/senders/${index}`,
        "every event sender must be a member of the declared complete recorded sender universe."
      );
    }
    eventTimes.push(time);
    eventSenderIds.push(sender);
  }
  const runId = optionValue.runId;
  if (runId !== void 0 && !isCortexelIdentifier(runId)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/runId",
      "runId, when supplied, must be a Cortexel identifier."
    );
  }
  const recorderId = optionValue.recorderId;
  if (recorderId !== void 0 && !isCortexelIdentifier(recorderId)) {
    return adapterFailure(
      "ADAPTER_MAPPING_REQUIRED",
      "/recorderId",
      "recorderId, when supplied, must be a Cortexel identifier."
    );
  }
  const normalizedRecordingGrid = positiveInfinityStop ? {
    originTics: originTicsResult.canonical,
    startTics: startTicsResult.canonical
  } : {
    originTics: originTicsResult.canonical,
    startTics: startTicsResult.canonical,
    stopTics: finiteStopTics.canonical
  };
  const normalizedCaptureAuthority = {
    kind: CAPTURE_AUTHORITY_KIND,
    profile: captureAuthorityProfile,
    runtimeStatus: {
      nestVersion: ADMITTED_NEST_VERSION,
      timeBuildProfile: NEST_TIME_BUILD_PROFILE,
      statusReadMethod,
      executionScope: {
        kind: "single_process",
        numProcesses: 1,
        rank: 0,
        localNumThreads: executionScope.localNumThreads
      },
      resolutionMs,
      ticsPerMs: ticsPerMsResult.canonical,
      resolutionTics: resolutionTicsResult.canonical,
      captureBiologicalTimeTics: captureTicsResult.canonical,
      captureBoundary
    },
    recordingGrid: normalizedRecordingGrid,
    bufferEpoch: {
      beganBy: bufferEpoch.beganBy,
      beganAtBiologicalTimeTics: bufferBeganTicsResult.canonical
    },
    recordingPlan: {
      lastMutationAtBiologicalTimeTics: planMutationTicsResult.canonical,
      scope: RECORDING_PLAN_SCOPE,
      senderUniverseBinding: SENDER_UNIVERSE_BINDING
    },
    clockEpochContinuity: CLOCK_EPOCH_CONTINUITY,
    eventCompleteness: EVENT_COMPLETENESS
  };
  const adapterInputDigestDomain = NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5;
  const adapterInputDigest = canonicalDigest({
    domain: adapterInputDigestDomain,
    exportedStatus: value,
    options: {
      recordedSenderIds,
      nestVersion,
      captureAuthority: normalizedCaptureAuthority,
      runId: runId ?? null,
      recorderId: recorderId ?? null
    }
  });
  const window = positiveInfinityStop ? {
    kind: "nest_recording_device_positive_infinity_capture_bounded",
    origin,
    start,
    captureTime,
    unit: "ms",
    boundary: "(origin+start,capture]",
    recordingBackend: "memory",
    timeEncoding: "native_binary64_ms",
    configuredStop: {
      kind: "nest_time_positive_infinity",
      exportedMs: NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS
    },
    captureAuthority: {
      ...normalizedCaptureAuthority,
      adapterInputDigest
    }
  } : {
    kind: "nest_recording_device_origin_relative",
    origin,
    start,
    stop: finiteStop,
    unit: "ms",
    boundary: "(origin+start,origin+stop]",
    recordingBackend: "memory",
    timeEncoding: "native_binary64_ms",
    captureAuthority: {
      ...normalizedCaptureAuthority,
      adapterInputDigest
    }
  };
  const request = {
    contract: {
      name: REQUEST_CONTRACT_IDENTITY.name,
      version: REQUEST_CONTRACT_IDENTITY.version
    },
    skill: { id: "neuro.spike_raster" },
    data: {
      eventTimes: { kind: "time", unit: "ms", values: eventTimes },
      eventSenderIds,
      recordedSenderIds,
      window,
      timeBase: "absolute_clock",
      senderUniverseComplete: true,
      eventCompleteness: EVENT_COMPLETENESS
    },
    parameters: {
      rowOrder: "canonical_sender_id",
      markStyle: "tick",
      outOfWindowPolicy: "reject",
      // The current renderer cannot yet guarantee a complete density-grid
      // artifact/sidecar above the mark budget. Fail closed until that named
      // compaction path is implemented and conformance-tested.
      aboveMarkBudget: "refuse"
    },
    source: {
      kind: "simulation",
      system: "NEST",
      systemVersion: nestVersion,
      ...runId !== void 0 ? { runId } : {},
      ...recorderId !== void 0 ? { recorderId } : {},
      sourceDigest: canonicalDigest(value)
    }
  };
  return { ok: true, request };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN,
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3,
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5,
  NEST_TIME_BUILD_PROFILE,
  NEST_TIME_POSITIVE_INFINITY_EXPORTED_MS,
  nestSpikeRecorderToRaster
});
//# sourceMappingURL=index.cjs.map