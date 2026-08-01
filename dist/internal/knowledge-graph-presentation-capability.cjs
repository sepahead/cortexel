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

// react/knowledgeGraphPresentation.internal.ts
var knowledgeGraphPresentation_internal_exports = {};
__export(knowledgeGraphPresentation_internal_exports, {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1: () => KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  KnowledgeGraphPresentationJsonError: () => KnowledgeGraphPresentationJsonError,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1: () => PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1: () => PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  assertPreparedCorpusKnowledgeGraphPresentation: () => assertPreparedCorpusKnowledgeGraphPresentation,
  assertPreparedGenericKnowledgeGraphPresentation: () => assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphPresentation: () => assertPreparedKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView: () => assertPreparedKnowledgeGraphView,
  isPreparedKnowledgeGraphPresentation: () => isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView: () => isPreparedKnowledgeGraphView,
  knowledgeGraphPresentationContainsNode: () => knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode: () => knowledgeGraphViewContainsNode,
  parseKnowledgeGraphPresentationJson: () => parseKnowledgeGraphPresentationJson,
  prepareCorpusKnowledgeGraphPresentation: () => prepareCorpusKnowledgeGraphPresentation,
  prepareKnowledgeGraphPresentation: () => prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView: () => prepareKnowledgeGraphView,
  serializePreparedKnowledgeGraphPresentation: () => serializePreparedKnowledgeGraphPresentation
});
module.exports = __toCommonJS(knowledgeGraphPresentation_internal_exports);

// react/knowledgeGraphIdentity.internal.ts
function canonicalGraphNodePair(source, target) {
  return source <= target ? [source, target] : [target, source];
}
function graphEdgeIdentityKey(edge) {
  if (typeof edge.id === "string") return JSON.stringify(["id", edge.id]);
  const kind = typeof edge.kind === "string" ? edge.kind : "";
  if (edge.directed === false) {
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    return JSON.stringify(["legacy-undirected", source, target, kind]);
  }
  return JSON.stringify(["legacy-directed", edge.source, edge.target, kind]);
}

// core/skills/knowledgeGraphLimits.ts
var KNOWLEDGE_GRAPH_LIMITS = Object.freeze({
  /** Accepted presentation/inspection limits. These match the legacy params gate. */
  maxPresentationNodes: 1e3,
  maxPresentationEdges: 4e3,
  /**
   * Main-thread d3-force refinement limits. Above either bound the canonical
   * composition retains the caption and complete DOM records but does not mount
   * the live 3D solver. These are resource ceilings, not portable FPS claims.
   */
  maxLiveForceNodes: 250,
  maxLiveForceEdges: 1e3,
  /**
   * Aggregate presentation limits apply across every retained occurrence. Aliased
   * containers receive no amortization: each occurrence is inspected and copied.
   */
  maxPresentationRetainedOccurrences: 25e4,
  maxPresentationStringCodeUnits: 4e6,
  maxPresentationInspectionWork: 1e6,
  /** A view can explicitly name every kind present in its bounded source. */
  maxViewNodeKinds: 1e3,
  maxViewEdgeKinds: 4e3,
  /** Equivalent hot-path policies reuse one token without unbounded cache growth. */
  maxCachedViewsPerPresentation: 128,
  /** Strong raw-JSON boundary, before a presentation object is materialized. */
  maxPresentationRawInputBytes: 16e6,
  maxPresentationJsonDepth: 8,
  maxPresentationJsonNodes: 3e5,
  maxPresentationJsonNumberTokenLength: 100,
  maxNodeIdLength: 120,
  maxNodeLabelLength: 240,
  maxEdgeIdLength: 320,
  maxEdgeLabelLength: 160,
  maxKindLength: 80,
  maxColorLength: 64,
  maxRadiusMeaningLength: 400,
  maxAttributes: 24,
  maxAttributeKeyLength: 80,
  maxAttributeArrayItems: 16,
  maxEvidenceRefsPerElement: 8,
  maxEvidenceIdLength: 384,
  maxRecordIdLength: 320,
  maxLocatorLength: 240,
  maxPaperIdLength: 160,
  maxCitationIdLength: 160,
  maxSourceIdLength: 240,
  maxDoiLength: 240,
  maxParallelEdgesPerPair: 9,
  maxDetailLength: 1e3,
  maxAttributeStringLength: 500,
  maxExcerptLength: 1e3
});
var KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS = Object.freeze({
  rawInputBytes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationRawInputBytes,
  jsonDepth: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonDepth,
  jsonTotalNodes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonNodes,
  jsonStringLength: Math.max(
    1024,
    KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength,
    KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength
  ),
  jsonNumberTokenLength: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonNumberTokenLength,
  jsonObjectKeys: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
  jsonArrayItems: KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges
});

// core/safeRuntime.ts
var PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
  maxIssues: 32,
  maxPathLength: 240,
  maxMessageLength: 500,
  maxTotalLength: 8192,
  maxUnknownKeySamples: 8
});
var SAFE_DISPLAY_STRING_PATTERN = /^[^\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]*$/u;
var TYPED_ARRAY_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  "length"
)?.get;

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
var UTF8 = new TextEncoder();

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

// src/core/parse-json.ts
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var ParseFailure = class extends Error {
  diagnostic;
  constructor(diagnostic) {
    super(diagnostic.message);
    this.name = "ParseFailure";
    this.diagnostic = diagnostic;
  }
};
function boundedUtf8ByteLength(text, limit) {
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
    if (bytes > limit) return bytes;
  }
  return bytes;
}
var Scanner = class {
  text;
  limits;
  index = 0;
  nodes = 0;
  /** Path segments to the value being read, for a precise JSON Pointer on failure. */
  path = [];
  constructor(text, limits) {
    this.text = text;
    this.limits = limits;
  }
  pointer() {
    if (this.path.length === 0) return "";
    return this.path.map((segment) => `/${String(segment).replace(/~/g, "~0").replace(/\//g, "~1")}`).join("");
  }
  fail(code, message, extra) {
    throw new ParseFailure(
      makeError({
        code,
        stage: "parse",
        instancePath: this.pointer(),
        message,
        ...extra?.limit ? { limit: extra.limit } : {}
      })
    );
  }
  countNode() {
    this.nodes++;
    if (this.nodes > this.limits.jsonTotalNodes) {
      this.fail("JSON_TOKENS_EXCEEDED", "the document exceeds the total node limit", {
        limit: { name: "jsonTotalNodes", limit: this.limits.jsonTotalNodes, observed: this.nodes }
      });
    }
  }
  skipWhitespace() {
    while (this.index < this.text.length) {
      const ch = this.text[this.index];
      if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        this.index++;
        continue;
      }
      if (ch === "/") {
        this.fail("JSON_COMMENT_NOT_ALLOWED", "comments are not valid JSON");
      }
      return;
    }
  }
  expect(ch) {
    if (this.text[this.index] !== ch) {
      this.fail("JSON_SYNTAX", `expected ${JSON.stringify(ch)} at offset ${this.index}`);
    }
    this.index++;
  }
  parseTopLevel() {
    this.skipWhitespace();
    if (this.index >= this.text.length) {
      this.fail("JSON_EMPTY_INPUT", "the input contained no JSON value");
    }
    const value = this.parseValue(0);
    this.skipWhitespace();
    if (this.index < this.text.length) {
      this.fail(
        "JSON_TRAILING_DATA",
        `unexpected content after the top-level value at offset ${this.index}`
      );
    }
    return value;
  }
  parseValue(depth) {
    if (depth > this.limits.jsonDepth) {
      this.fail("JSON_DEPTH_EXCEEDED", "nesting is deeper than the parser permits", {
        limit: { name: "jsonDepth", limit: this.limits.jsonDepth, observed: depth }
      });
    }
    this.skipWhitespace();
    const ch = this.text[this.index];
    switch (ch) {
      case "{":
        return this.parseObject(depth);
      case "[":
        return this.parseArray(depth);
      case '"':
        this.countNode();
        return this.parseString();
      case "t":
        this.countNode();
        this.literal("true");
        return true;
      case "f":
        this.countNode();
        this.literal("false");
        return false;
      case "n":
        this.countNode();
        this.literal("null");
        return null;
      default:
        this.countNode();
        return this.parseNumber();
    }
  }
  literal(word) {
    if (this.text.startsWith(word, this.index)) {
      this.index += word.length;
      return;
    }
    this.fail("JSON_SYNTAX", `expected ${word} at offset ${this.index}`);
  }
  parseObject(depth) {
    this.countNode();
    this.expect("{");
    const object = /* @__PURE__ */ Object.create(null);
    const seen = /* @__PURE__ */ new Set();
    this.skipWhitespace();
    if (this.text[this.index] === "}") {
      this.index++;
      return object;
    }
    for (; ; ) {
      this.skipWhitespace();
      if (this.text[this.index] === "}") {
        this.fail("JSON_TRAILING_COMMA_NOT_ALLOWED", "trailing commas are not valid JSON");
      }
      if (this.text[this.index] !== '"') {
        this.fail("JSON_SYNTAX", `expected a member name at offset ${this.index}`);
      }
      const key = this.parseString();
      if (DANGEROUS_KEYS.has(key)) {
        this.path.push(key);
        this.fail(
          "JSON_DANGEROUS_KEY",
          `the member name ${JSON.stringify(key)} can reach Object.prototype and is rejected`
        );
      }
      if (seen.has(key)) {
        this.path.push(key);
        this.fail(
          "JSON_DUPLICATE_KEY",
          `the member name ${JSON.stringify(key)} appears more than once; which value would win is undefined`
        );
      }
      seen.add(key);
      if (seen.size > this.limits.jsonObjectKeys) {
        this.fail("JSON_TOO_MANY_KEYS", "the object has more members than the parser permits", {
          limit: { name: "jsonObjectKeys", limit: this.limits.jsonObjectKeys, observed: seen.size }
        });
      }
      this.skipWhitespace();
      this.expect(":");
      this.path.push(key);
      object[key] = this.parseValue(depth + 1);
      this.path.pop();
      this.skipWhitespace();
      const next = this.text[this.index];
      if (next === ",") {
        this.index++;
        continue;
      }
      if (next === "}") {
        this.index++;
        return object;
      }
      this.fail("JSON_SYNTAX", `expected ',' or '}' at offset ${this.index}`);
    }
  }
  parseArray(depth) {
    this.countNode();
    this.expect("[");
    const array = [];
    this.skipWhitespace();
    if (this.text[this.index] === "]") {
      this.index++;
      return array;
    }
    for (; ; ) {
      this.skipWhitespace();
      if (this.text[this.index] === "]") {
        this.fail("JSON_TRAILING_COMMA_NOT_ALLOWED", "trailing commas are not valid JSON");
      }
      this.path.push(array.length);
      array.push(this.parseValue(depth + 1));
      this.path.pop();
      if (array.length > this.limits.jsonArrayItems) {
        this.fail("JSON_ARRAY_TOO_LONG", "the array has more members than the parser permits", {
          limit: {
            name: "jsonArrayItems",
            limit: this.limits.jsonArrayItems,
            observed: array.length
          }
        });
      }
      this.skipWhitespace();
      const next = this.text[this.index];
      if (next === ",") {
        this.index++;
        continue;
      }
      if (next === "]") {
        this.index++;
        return array;
      }
      this.fail("JSON_SYNTAX", `expected ',' or ']' at offset ${this.index}`);
    }
  }
  parseString() {
    this.expect('"');
    let out = "";
    for (; ; ) {
      if (this.index >= this.text.length) {
        this.fail("JSON_SYNTAX", "the input ended inside a string");
      }
      const ch = this.text[this.index];
      if (ch === '"') {
        this.index++;
        return out;
      }
      if (ch === "\\") {
        this.index++;
        out = this.appendStringFragment(out, this.parseEscape());
        continue;
      }
      const code = this.text.charCodeAt(this.index);
      if (code < 32) {
        this.fail(
          "JSON_SYNTAX",
          `a raw control character (U+${code.toString(16).padStart(4, "0").toUpperCase()}) is not valid inside a JSON string`
        );
      }
      if (code >= 55296 && code <= 56319) {
        const next = this.text.charCodeAt(this.index + 1);
        if (!(next >= 56320 && next <= 57343)) {
          this.fail("JSON_INVALID_UNICODE", "an unpaired high surrogate is not well-formed Unicode");
        }
        out = this.appendStringFragment(
          out,
          this.text[this.index] + this.text[this.index + 1]
        );
        this.index += 2;
        continue;
      }
      if (code >= 56320 && code <= 57343) {
        this.fail("JSON_INVALID_UNICODE", "an unpaired low surrogate is not well-formed Unicode");
      }
      out = this.appendStringFragment(out, ch);
      this.index++;
    }
  }
  /** Enforce the decoded UTF-16 budget before appending the next fragment. */
  appendStringFragment(current, fragment) {
    const observed = current.length + fragment.length;
    if (observed > this.limits.jsonStringLength) {
      this.fail("JSON_STRING_TOO_LONG", "a string is longer than the parser permits", {
        limit: {
          name: "jsonStringLength",
          limit: this.limits.jsonStringLength,
          observed
        }
      });
    }
    return current + fragment;
  }
  parseEscape() {
    const ch = this.text[this.index];
    this.index++;
    switch (ch) {
      case '"':
        return '"';
      case "\\":
        return "\\";
      case "/":
        return "/";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "	";
      case "u":
        return this.parseUnicodeEscape();
      default:
        this.fail("JSON_SYNTAX", `invalid escape sequence \\${String(ch)}`);
    }
  }
  parseUnicodeEscape() {
    const hex = this.text.slice(this.index, this.index + 4);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
      this.fail("JSON_INVALID_UNICODE", "a \\u escape must be followed by four hex digits");
    }
    this.index += 4;
    const code = Number.parseInt(hex, 16);
    if (code >= 55296 && code <= 56319) {
      if (this.text[this.index] !== "\\" || this.text[this.index + 1] !== "u") {
        this.fail("JSON_INVALID_UNICODE", "an escaped high surrogate must be followed by a low surrogate");
      }
      const lowHex = this.text.slice(this.index + 2, this.index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(lowHex)) {
        this.fail("JSON_INVALID_UNICODE", "a \\u escape must be followed by four hex digits");
      }
      const low = Number.parseInt(lowHex, 16);
      if (!(low >= 56320 && low <= 57343)) {
        this.fail("JSON_INVALID_UNICODE", "an escaped high surrogate must be followed by a low surrogate");
      }
      this.index += 6;
      return String.fromCharCode(code, low);
    }
    if (code >= 56320 && code <= 57343) {
      this.fail("JSON_INVALID_UNICODE", "an unpaired escaped low surrogate is not well-formed Unicode");
    }
    return String.fromCharCode(code);
  }
  parseNumber() {
    const start = this.index;
    if (this.text[this.index] === "-") {
      const first = this.text[this.index + 1];
      if (first !== "0" && !this.isDigit(first)) {
        this.fail("JSON_SYNTAX", `unexpected token at offset ${this.index + 1}`);
      }
      this.advanceNumberCodeUnit(start);
    }
    if (this.text[this.index] === "0") {
      this.advanceNumberCodeUnit(start);
    } else if (this.isDigit(this.text[this.index])) {
      while (this.isDigit(this.text[this.index])) this.advanceNumberCodeUnit(start);
    } else {
      this.fail("JSON_SYNTAX", `unexpected token at offset ${this.index}`);
    }
    if (this.text[this.index] === ".") {
      if (!this.isDigit(this.text[this.index + 1])) {
        this.fail("JSON_INVALID_NUMBER", "a decimal point must be followed by at least one digit");
      }
      this.advanceNumberCodeUnit(start);
      while (this.isDigit(this.text[this.index])) this.advanceNumberCodeUnit(start);
    }
    if (this.text[this.index] === "e" || this.text[this.index] === "E") {
      let requiredDigitIndex = this.index + 1;
      if (this.text[requiredDigitIndex] === "+" || this.text[requiredDigitIndex] === "-") requiredDigitIndex++;
      if (!this.isDigit(this.text[requiredDigitIndex])) {
        this.fail("JSON_INVALID_NUMBER", "an exponent must have at least one digit");
      }
      this.advanceNumberCodeUnit(start);
      if (this.text[this.index] === "+" || this.text[this.index] === "-") {
        this.advanceNumberCodeUnit(start);
      }
      while (this.isDigit(this.text[this.index])) this.advanceNumberCodeUnit(start);
    }
    const token = this.text.slice(start, this.index);
    if (token.length === 0) {
      this.fail("JSON_SYNTAX", `unexpected token at offset ${start}`);
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      this.fail(
        "JSON_NON_FINITE_NUMBER",
        "the number is outside the finite binary64 model; use null for a missing observation"
      );
    }
    if (!/[.eE]/u.test(token)) {
      const integer = BigInt(token);
      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      const isCanonicalBinary64Spelling = JSON.stringify(value) === token;
      if ((integer < -maxSafe || integer > maxSafe) && !isCanonicalBinary64Spelling) {
        this.fail(
          "JSON_INTEGER_OUT_OF_RANGE",
          "the unsafe bare integer is not the canonical spelling of its parsed binary64 value; use an exact safe integer, the canonical binary64 measurement spelling, or a string identifier"
        );
      }
    }
    return value;
  }
  /** Stop scanning a number at the first code unit beyond its token budget. */
  advanceNumberCodeUnit(start) {
    this.index++;
    const observed = this.index - start;
    if (observed > this.limits.jsonNumberTokenLength) {
      this.fail(
        "JSON_NUMBER_TOKEN_TOO_LONG",
        "the numeric token is longer than any meaningful binary64 literal",
        {
          limit: {
            name: "jsonNumberTokenLength",
            limit: this.limits.jsonNumberTokenLength,
            observed
          }
        }
      );
    }
  }
  isDigit(ch) {
    return ch !== void 0 && ch >= "0" && ch <= "9";
  }
};
function parseJsonStrict(text, options) {
  if (typeof text !== "string") {
    return err([
      makeError({
        code: "JSON_SYNTAX",
        stage: "parse",
        message: "the strict JSON boundary accepts a text string only"
      })
    ]);
  }
  const limitKeys = [
    "rawInputBytes",
    "jsonDepth",
    "jsonTotalNodes",
    "jsonStringLength",
    "jsonNumberTokenLength",
    "jsonObjectKeys",
    "jsonArrayItems"
  ];
  const limitsSnapshot = /* @__PURE__ */ Object.create(null);
  let allowBom = false;
  try {
    if (options === null || typeof options !== "object") throw new Error("invalid options");
    const limitsDescriptor = Object.getOwnPropertyDescriptor(options, "limits");
    if (limitsDescriptor === void 0 || !Object.prototype.hasOwnProperty.call(limitsDescriptor, "value")) {
      throw new Error("invalid limits");
    }
    const supplied = limitsDescriptor.value;
    if (supplied === null || typeof supplied !== "object") throw new Error("invalid limits");
    for (const key of limitKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(supplied, key);
      if (descriptor === void 0 || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        throw new Error("invalid limit");
      }
      const value = descriptor.value;
      if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid limit");
      limitsSnapshot[key] = value;
    }
    const bomDescriptor = Object.getOwnPropertyDescriptor(options, "allowBom");
    if (bomDescriptor !== void 0) {
      if (!Object.prototype.hasOwnProperty.call(bomDescriptor, "value")) {
        throw new Error("invalid allowBom");
      }
      allowBom = bomDescriptor.value === true;
    }
  } catch {
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the strict parser requires a valid finite non-negative budget object"
      })
    ]);
  }
  const limits = Object.freeze(limitsSnapshot);
  const byteLength = boundedUtf8ByteLength(text, limits.rawInputBytes);
  if (byteLength > limits.rawInputBytes) {
    return err([
      makeError({
        code: "JSON_BYTES_EXCEEDED",
        stage: "parse",
        message: "the raw input is larger than the active budget profile permits",
        limit: { name: "rawInputBytes", limit: limits.rawInputBytes, observed: byteLength }
      })
    ]);
  }
  let source = text;
  if (source.charCodeAt(0) === 65279) {
    if (!allowBom) {
      return err([
        makeError({
          code: "JSON_BOM_NOT_ALLOWED",
          stage: "parse",
          message: "the input begins with a byte-order mark; strip it"
        })
      ]);
    }
    source = source.slice(1);
  }
  try {
    return ok(new Scanner(source, limits).parseTopLevel());
  } catch (error) {
    if (error instanceof ParseFailure) {
      return err([error.diagnostic]);
    }
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the parser failed in an unexpected way; this is a Cortexel defect"
      })
    ]);
  }
}

// react/knowledgeGraphPresentationBudget.internal.ts
var KnowledgeGraphPresentationBudgetCounter = class {
  retainedOccurrences = 0;
  sourceStringCodeUnits = 0;
  inspectionWork = 0;
  retain(label, count = 1) {
    this.retainedOccurrences += count;
    if (this.retainedOccurrences > KNOWLEDGE_GRAPH_LIMITS.maxPresentationRetainedOccurrences) {
      throw new RangeError(
        `${label} exceeds the aggregate retained-occurrence limit of ${KNOWLEDGE_GRAPH_LIMITS.maxPresentationRetainedOccurrences}`
      );
    }
  }
  string(value, label) {
    this.sourceStringCodeUnits += value.length;
    if (this.sourceStringCodeUnits > KNOWLEDGE_GRAPH_LIMITS.maxPresentationStringCodeUnits) {
      throw new RangeError(
        `${label} exceeds the aggregate source-string limit of ${KNOWLEDGE_GRAPH_LIMITS.maxPresentationStringCodeUnits} UTF-16 code units`
      );
    }
  }
  inspect(label, count = 1) {
    this.inspectionWork += count;
    if (this.inspectionWork > KNOWLEDGE_GRAPH_LIMITS.maxPresentationInspectionWork) {
      throw new RangeError(
        `${label} exceeds the aggregate inspection-work limit of ${KNOWLEDGE_GRAPH_LIMITS.maxPresentationInspectionWork}`
      );
    }
  }
  receipt() {
    return {
      retainedOccurrences: this.retainedOccurrences,
      sourceStringCodeUnits: this.sourceStringCodeUnits,
      inspectionWork: this.inspectionWork
    };
  }
};

// react/knowledgeGraphContextIdentity.internal.ts
function deriveKnowledgeGraphContextIdentity(context) {
  const field = (value) => `${value.length}:${value}`;
  return `cortexel-corpus-graph-instance.v1:${field(context.graph_id)}${field(
    context.graph_source
  )}${field(context.graph_snapshot_id)}${field(context.graph_scope)}${field(
    context.generated_at
  )}`;
}

// react/knowledgeGraphVisualEncoding.internal.ts
var KNOWLEDGE_GRAPH_NODE_GLYPHS = Object.freeze([
  "sphere_outline",
  "box_shell",
  "diamond_shell"
]);
var KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS = Object.freeze([
  "solid",
  "long_dash",
  "short_dash",
  "dotted"
]);
var CORPUS_NODE_GLYPH_BY_KIND = Object.freeze({
  paper: "sphere_outline",
  model: "box_shell",
  family: "diamond_shell"
});
var CORPUS_EDGE_STROKE_PATTERN_BY_KIND = Object.freeze({
  cites: "solid",
  same_as: "solid",
  variant_of: "long_dash",
  instantiates: "short_dash",
  belongs_to_family: "dotted"
});
var KNOWLEDGE_GRAPH_BACKGROUND_COLORS = Object.freeze({
  dark: "#030711",
  light: "#f8fafc"
});
var KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE = Object.freeze({
  sphere_outline: 1.08,
  // Every cube-edge midpoint remains outside the opaque unit sphere:
  // 1.30 * sqrt(2/3) > 1.06.
  box_shell: 1.3,
  // Every octahedron-edge midpoint remains outside the opaque unit sphere:
  // 1.50 / sqrt(2) > 1.06.
  diamond_shell: 1.5
});
var KNOWLEDGE_GRAPH_BOX_SHELL_SIDE = 2 * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.box_shell / Math.sqrt(3);
var NODE_GLYPH_SET = new Set(KNOWLEDGE_GRAPH_NODE_GLYPHS);
var EDGE_STROKE_PATTERN_SET = new Set(
  KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS
);
function isKnowledgeGraphNodeGlyph(value) {
  return typeof value === "string" && NODE_GLYPH_SET.has(value);
}
function isKnowledgeGraphEdgeStrokePattern(value) {
  return typeof value === "string" && EDGE_STROKE_PATTERN_SET.has(value);
}

// react/knowledgeGraphPresentation.internal.ts
var KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1 = "cortexel-knowledge-graph-presentation-input.v1";
var PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1 = "cortexel-prepared-knowledge-graph-presentation.v1";
var PREPARED_KNOWLEDGE_GRAPH_VIEW_V1 = "cortexel-prepared-knowledge-graph-view.v1";
var KnowledgeGraphPresentationJsonError = class extends TypeError {
  diagnostics;
  constructor(diagnostics) {
    super("knowledge-graph presentation JSON failed strict parsing");
    this.name = "KnowledgeGraphPresentationJsonError";
    this.diagnostics = deepFreeze([...diagnostics]);
  }
};
function nullPrototypeOwnedRecords(value, seen = /* @__PURE__ */ new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      nullPrototypeOwnedRecords(value[index], seen);
    }
    return;
  }
  Object.setPrototypeOf(value, null);
  for (const key of Object.keys(value)) {
    nullPrototypeOwnedRecords(value[key], seen);
  }
}
var PresentationPlanner = class {
  budget = new KnowledgeGraphPresentationBudgetCounter();
  prototypeProbes = [];
  keysProbes = [];
  descriptorProbes = [];
  changed() {
    throw new TypeError("knowledge-graph presentation input changed during preparation");
  }
  inspectPrototype(value, label) {
    this.budget.inspect(label);
    const prototype = Object.getPrototypeOf(value);
    this.prototypeProbes.push({ object: value, prototype });
    return prototype;
  }
  inspectKeys(value, label) {
    this.budget.inspect(label);
    const keys = Reflect.ownKeys(value);
    this.budget.inspect(label, keys.length);
    this.keysProbes.push({ object: value, keys: Object.freeze([...keys]) });
    return keys;
  }
  inspectDescriptor(value, key, label) {
    this.budget.inspect(label);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === void 0) this.changed();
    const snapshot = Object.freeze({ ...descriptor });
    this.descriptorProbes.push({ object: value, key, descriptor: snapshot });
    return snapshot;
  }
  record(value, label, requiredKeys, optionalKeys = []) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`${label} must be a plain data record`);
    }
    const prototype = this.inspectPrototype(value, label);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${label} must use a plain or null prototype`);
    }
    const allowed = /* @__PURE__ */ new Set([...requiredKeys, ...optionalKeys]);
    const keys = this.inspectKeys(value, label);
    const result = /* @__PURE__ */ Object.create(null);
    this.budget.retain(label);
    for (const key of keys) {
      if (typeof key !== "string" || !allowed.has(key)) {
        throw new TypeError(`${label} contains an unknown member`);
      }
      const descriptor = this.inspectDescriptor(value, key, `${label}.${key}`);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError(`${label}.${key} must be an enumerable data property`);
      }
      this.budget.retain(`${label}.${key}`);
      this.budget.string(key, `${label} member names`);
      result[key] = descriptor.value;
    }
    for (const key of requiredKeys) {
      if (!Object.hasOwn(result, key)) {
        throw new TypeError(`${label}.${key} is required`);
      }
    }
    return result;
  }
  openRecord(value, label, maximumKeys) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`${label} must be a plain data record`);
    }
    const prototype = this.inspectPrototype(value, label);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${label} must use a plain or null prototype`);
    }
    const keys = this.inspectKeys(value, label);
    if (keys.length > maximumKeys) {
      throw new RangeError(`${label} may contain at most ${maximumKeys} keys`);
    }
    const result = /* @__PURE__ */ Object.create(null);
    this.budget.retain(label);
    for (const key of keys) {
      if (typeof key !== "string") throw new TypeError(`${label} cannot contain symbols`);
      const descriptor = this.inspectDescriptor(value, key, `${label}.${key}`);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError(`${label}.${key} must be an enumerable data property`);
      }
      this.budget.retain(`${label}.${key}`);
      this.budget.string(key, `${label} member names`);
      result[key] = descriptor.value;
    }
    return result;
  }
  array(value, label, maximum) {
    if (!Array.isArray(value)) throw new TypeError(`${label} must be a dense data array`);
    const lengthDescriptor = this.inspectDescriptor(value, "length", `${label}.length`);
    if (!Object.hasOwn(lengthDescriptor, "value") || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
      throw new TypeError(`${label} must have an intrinsic non-negative integer length`);
    }
    const length = lengthDescriptor.value;
    if (length > maximum) {
      throw new RangeError(`${label} may contain at most ${maximum} items`);
    }
    const keys = this.inspectKeys(value, label);
    if (keys.length !== length + 1 || keys[keys.length - 1] !== "length") {
      throw new TypeError(`${label} must be dense and contain no extra properties`);
    }
    const result = new Array(length);
    this.budget.retain(label);
    for (let index = 0; index < length; index++) {
      const key = String(index);
      if (keys[index] !== key) {
        throw new TypeError(`${label} must be dense and contain no extra properties`);
      }
      const descriptor = this.inspectDescriptor(value, key, `${label}[${index}]`);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError(`${label} must contain enumerable data elements`);
      }
      this.budget.retain(`${label}[${index}]`);
      result[index] = descriptor.value;
    }
    return result;
  }
  revalidate() {
    for (const probe of this.prototypeProbes) {
      this.budget.inspect("knowledge-graph prototype revalidation");
      if (Object.getPrototypeOf(probe.object) !== probe.prototype) this.changed();
    }
    for (const probe of this.keysProbes) {
      this.budget.inspect("knowledge-graph key revalidation");
      const keys = Reflect.ownKeys(probe.object);
      this.budget.inspect("knowledge-graph key revalidation", keys.length);
      if (keys.length !== probe.keys.length) this.changed();
      for (let index = 0; index < keys.length; index++) {
        if (keys[index] !== probe.keys[index]) this.changed();
      }
    }
    for (const probe of this.descriptorProbes) {
      this.budget.inspect("knowledge-graph descriptor revalidation");
      const current = Object.getOwnPropertyDescriptor(probe.object, probe.key);
      const planned = probe.descriptor;
      if (current === void 0 || current.enumerable !== planned.enumerable || current.configurable !== planned.configurable || current.writable !== planned.writable || current.get !== planned.get || current.set !== planned.set || !Object.is(current.value, planned.value)) {
        this.changed();
      }
    }
  }
};
var HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;
var SCORE_KINDS = /* @__PURE__ */ new Set([
  "extraction_confidence",
  "citation_resolution_confidence",
  "structural_similarity",
  "behavioral_agreement",
  "retrieval_relevance"
]);
var PREPARED_PRESENTATIONS = /* @__PURE__ */ new WeakSet();
var PRESENTATION_NODE_IDS = /* @__PURE__ */ new WeakMap();
var PREPARED_VIEWS = /* @__PURE__ */ new WeakSet();
var VIEW_SOURCES = /* @__PURE__ */ new WeakMap();
var RFC3339_WITH_SECONDS = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/u;
function isRfc3339WithSeconds(value) {
  const match = RFC3339_WITH_SECONDS.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[month - 1]) return false;
  const offset = match[7];
  if (offset !== "Z") {
    const offsetHour = Number(offset.slice(1, 3));
    const offsetMinute = Number(offset.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }
  return true;
}
function hasWellFormedUtf16(value) {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 55296 && unit <= 56319) {
      if (index + 1 >= value.length) return false;
      const next = value.charCodeAt(index + 1);
      if (next < 56320 || next > 57343) return false;
      index += 1;
    } else if (unit >= 56320 && unit <= 57343) {
      return false;
    }
  }
  return true;
}
function boundedString(planner, value, label, maxLength, allowEmpty = false) {
  if (typeof value !== "string" || !allowEmpty && value.length < 1 || value.length > maxLength || !hasWellFormedUtf16(value) || !SAFE_DISPLAY_STRING_PATTERN.test(value)) {
    throw new TypeError(
      `${label} must be a ${allowEmpty ? "" : "non-empty "}display-safe string <= ${maxLength} characters`
    );
  }
  planner.budget.string(value, label);
  return value;
}
function optionalBoundedString(planner, record, key, label, maxLength) {
  return Object.hasOwn(record, key) ? boundedString(planner, record[key], label, maxLength) : void 0;
}
function optionalBoolean(record, key, label) {
  if (!Object.hasOwn(record, key)) return void 0;
  const value = record[key];
  if (typeof value !== "boolean") throw new TypeError(`${label} must be boolean`);
  return value;
}
function finiteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new TypeError(`${label} must be a finite number other than negative zero`);
  }
  return value;
}
function normalizedHexColor(value) {
  const lower = value.toLowerCase();
  return lower.length === 4 ? `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}` : lower;
}
function assertExactRecordShape(record, label, required, optional) {
  const allowed = /* @__PURE__ */ new Set([...required, ...optional]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new TypeError(`${label}.${key} is not allowed for this kind`);
  }
  for (const key of required) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${label}.${key} is required`);
  }
}
function addOptional(target, key, value) {
  if (value !== void 0) target[key] = value;
}
function snapshotAttributes(planner, value, label) {
  const record = planner.openRecord(value, label, KNOWLEDGE_GRAPH_LIMITS.maxAttributes);
  const stringKeys = Object.keys(record);
  for (const key of stringKeys) {
    if (key.length < 1 || key.length > KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength || !hasWellFormedUtf16(key) || !SAFE_DISPLAY_STRING_PATTERN.test(key)) {
      throw new TypeError(
        `${label} keys must be non-empty display-safe strings <= ${KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength} characters`
      );
    }
  }
  const snapshot = /* @__PURE__ */ Object.create(null);
  for (const key of stringKeys) {
    const item = record[key];
    if (!Array.isArray(item)) {
      if (item !== null && typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
        throw new TypeError(`${label}.${key} must be a JSON scalar or scalar array`);
      }
      if (typeof item === "number") finiteNumber(item, `${label}.${key}`);
      if (typeof item === "string") {
        boundedString(
          planner,
          item,
          `${label}.${key}`,
          KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength,
          true
        );
      }
      snapshot[key] = item;
      continue;
    }
    const input = planner.array(
      item,
      `${label}.${key}`,
      KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems
    );
    const items = new Array(input.length);
    for (let index = 0; index < input.length; index++) {
      const scalar = input[index];
      if (scalar !== null && typeof scalar !== "string" && typeof scalar !== "number" && typeof scalar !== "boolean") {
        throw new TypeError(`${label}.${key}[${index}] must be a JSON scalar`);
      }
      if (typeof scalar === "number") finiteNumber(scalar, `${label}.${key}[${index}]`);
      if (typeof scalar === "string") {
        boundedString(
          planner,
          scalar,
          `${label}.${key}[${index}]`,
          KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength,
          true
        );
      }
      items[index] = scalar;
    }
    snapshot[key] = items;
  }
  return snapshot;
}
function snapshotEpistemic(planner, value, label) {
  const record = planner.record(value, label, [
    "status",
    "advisory_only",
    "is_paper_local_evidence",
    "calibrated_posterior"
  ]);
  if (record.status !== "derived_advisory" || record.advisory_only !== true || record.is_paper_local_evidence !== false || record.calibrated_posterior !== false) {
    throw new TypeError(`${label} must remain exactly derived/advisory`);
  }
  planner.budget.string(record.status, `${label}.status`);
  return {
    status: record.status,
    advisory_only: true,
    is_paper_local_evidence: false,
    calibrated_posterior: false
  };
}
function snapshotEvidenceReference(planner, value, label) {
  const discriminated = planner.record(value, label, ["kind"], [
    "evidence_id",
    "record_id",
    "node_id",
    "paper_id",
    "citation_id",
    "page",
    "source_id",
    "locator",
    "excerpt",
    "doi"
  ]);
  const kind = boundedString(planner, discriminated.kind, `${label}.kind`, 32);
  const exact = (required, optional) => {
    assertExactRecordShape(discriminated, label, required, optional);
    return discriminated;
  };
  switch (kind) {
    case "graph_snapshot_record": {
      const record = exact(["kind", "evidence_id", "record_id"], ["locator"]);
      const result = {
        kind,
        evidence_id: boundedString(
          planner,
          record.evidence_id,
          `${label}.evidence_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength
        ),
        record_id: boundedString(
          planner,
          record.record_id,
          `${label}.record_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxRecordIdLength
        )
      };
      addOptional(result, "locator", optionalBoundedString(
        planner,
        record,
        "locator",
        `${label}.locator`,
        KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength
      ));
      return result;
    }
    case "graph_node": {
      const record = exact(["kind", "evidence_id", "node_id"], ["locator", "excerpt"]);
      const result = {
        kind,
        evidence_id: boundedString(
          planner,
          record.evidence_id,
          `${label}.evidence_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength
        ),
        node_id: boundedString(
          planner,
          record.node_id,
          `${label}.node_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength
        )
      };
      addOptional(result, "locator", optionalBoundedString(
        planner,
        record,
        "locator",
        `${label}.locator`,
        KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength
      ));
      addOptional(result, "excerpt", optionalBoundedString(
        planner,
        record,
        "excerpt",
        `${label}.excerpt`,
        KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength
      ));
      return result;
    }
    case "citation": {
      const record = exact(
        ["kind", "evidence_id", "paper_id", "citation_id"],
        ["page", "locator", "excerpt", "doi"]
      );
      const result = {
        kind,
        evidence_id: boundedString(
          planner,
          record.evidence_id,
          `${label}.evidence_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength
        ),
        paper_id: boundedString(
          planner,
          record.paper_id,
          `${label}.paper_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxPaperIdLength
        ),
        citation_id: boundedString(
          planner,
          record.citation_id,
          `${label}.citation_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxCitationIdLength
        )
      };
      if (Object.hasOwn(record, "page")) {
        if (Object.is(record.page, -0)) {
          throw new TypeError(`${label}.page must not be negative zero`);
        }
        if (!Number.isSafeInteger(record.page) || record.page < 0) {
          throw new TypeError(`${label}.page must be a non-negative safe integer`);
        }
        result.page = record.page;
      }
      addOptional(result, "locator", optionalBoundedString(
        planner,
        record,
        "locator",
        `${label}.locator`,
        KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength
      ));
      addOptional(result, "excerpt", optionalBoundedString(
        planner,
        record,
        "excerpt",
        `${label}.excerpt`,
        KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength
      ));
      addOptional(result, "doi", optionalBoundedString(
        planner,
        record,
        "doi",
        `${label}.doi`,
        KNOWLEDGE_GRAPH_LIMITS.maxDoiLength
      ));
      return result;
    }
    case "external_source": {
      const record = exact(["kind", "evidence_id", "source_id"], ["locator", "excerpt"]);
      const result = {
        kind,
        evidence_id: boundedString(
          planner,
          record.evidence_id,
          `${label}.evidence_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength
        ),
        source_id: boundedString(
          planner,
          record.source_id,
          `${label}.source_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxSourceIdLength
        )
      };
      addOptional(result, "locator", optionalBoundedString(
        planner,
        record,
        "locator",
        `${label}.locator`,
        KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength
      ));
      addOptional(result, "excerpt", optionalBoundedString(
        planner,
        record,
        "excerpt",
        `${label}.excerpt`,
        KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength
      ));
      return result;
    }
    default:
      throw new TypeError(`${label}.kind is unsupported`);
  }
}
function snapshotEvidence(planner, value, label) {
  const input = planner.array(
    value,
    label,
    KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement
  );
  const snapshot = input.map((item, index) => snapshotEvidenceReference(planner, item, `${label}[${index}]`));
  const evidenceIds = /* @__PURE__ */ new Set();
  for (let index = 0; index < snapshot.length; index++) {
    const evidenceId = snapshot[index].evidence_id;
    if (evidenceIds.has(evidenceId)) {
      throw new TypeError(`${label} contains duplicate evidence_id at index ${index}`);
    }
    evidenceIds.add(evidenceId);
  }
  return snapshot;
}
function snapshotScore(planner, value, label) {
  const record = planner.record(value, label, [
    "kind",
    "value",
    "calibrated_posterior"
  ]);
  const kind = boundedString(planner, record.kind, `${label}.kind`, 80);
  const score = finiteNumber(record.value, `${label}.value`);
  if (!SCORE_KINDS.has(kind) || record.calibrated_posterior !== false || score < 0 || score > 1) {
    throw new TypeError(`${label} must be bounded and explicitly uncalibrated`);
  }
  return {
    kind,
    value: score,
    calibrated_posterior: false
  };
}
function snapshotNode(planner, value, index) {
  const label = `knowledge-graph nodes[${index}]`;
  const record = planner.record(value, label, ["id", "label", "color", "radius", "kind"], [
    "detail",
    "attributes",
    "epistemic",
    "evidence",
    "uncalibrated_score",
    "radiusMeaning",
    "nodeGlyph"
  ]);
  const radius = finiteNumber(record.radius, `${label}.radius`);
  if (radius <= 0 || radius > 64) {
    throw new RangeError(`${label}.radius must be greater than zero and at most 64`);
  }
  const colorSource = boundedString(
    planner,
    record.color,
    `${label}.color`,
    KNOWLEDGE_GRAPH_LIMITS.maxColorLength
  );
  if (!HEX_COLOR.test(colorSource)) {
    throw new TypeError(`${label}.color must be exact #rgb or #rrggbb hex`);
  }
  const color = normalizedHexColor(colorSource);
  const result = {
    id: boundedString(
      planner,
      record.id,
      `${label}.id`,
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength
    ),
    label: boundedString(
      planner,
      record.label,
      `${label}.label`,
      KNOWLEDGE_GRAPH_LIMITS.maxNodeLabelLength
    ),
    color,
    radius,
    kind: boundedString(
      planner,
      record.kind,
      `${label}.kind`,
      KNOWLEDGE_GRAPH_LIMITS.maxKindLength
    ),
    nodeGlyph: "sphere_outline"
  };
  if (Object.hasOwn(record, "nodeGlyph")) {
    const nodeGlyph = boundedString(
      planner,
      record.nodeGlyph,
      `${label}.nodeGlyph`,
      32
    );
    if (!isKnowledgeGraphNodeGlyph(nodeGlyph)) {
      throw new TypeError(`${label}.nodeGlyph is unsupported`);
    }
    result.nodeGlyph = nodeGlyph;
  }
  addOptional(result, "detail", optionalBoundedString(
    planner,
    record,
    "detail",
    `${label}.detail`,
    KNOWLEDGE_GRAPH_LIMITS.maxDetailLength
  ));
  if (Object.hasOwn(record, "attributes")) {
    result.attributes = snapshotAttributes(planner, record.attributes, `${label}.attributes`);
  }
  if (Object.hasOwn(record, "epistemic")) {
    result.epistemic = snapshotEpistemic(planner, record.epistemic, `${label}.epistemic`);
  }
  if (Object.hasOwn(record, "evidence")) {
    result.evidence = snapshotEvidence(planner, record.evidence, `${label}.evidence`);
  }
  if (Object.hasOwn(record, "uncalibrated_score")) {
    result.uncalibrated_score = snapshotScore(
      planner,
      record.uncalibrated_score,
      `${label}.uncalibrated_score`
    );
  }
  addOptional(result, "radiusMeaning", optionalBoundedString(
    planner,
    record,
    "radiusMeaning",
    `${label}.radiusMeaning`,
    KNOWLEDGE_GRAPH_LIMITS.maxRadiusMeaningLength
  ));
  return result;
}
function snapshotEdge(planner, value, index) {
  const label = `knowledge-graph edges[${index}]`;
  const record = planner.record(value, label, ["source", "target", "color", "kind"], [
    "id",
    "label",
    "attributes",
    "epistemic",
    "evidence",
    "uncalibrated_score",
    "directed",
    "particles",
    "edgeStrokePattern"
  ]);
  const colorSource = boundedString(
    planner,
    record.color,
    `${label}.color`,
    KNOWLEDGE_GRAPH_LIMITS.maxColorLength
  );
  if (!HEX_COLOR.test(colorSource)) {
    throw new TypeError(`${label}.color must be exact #rgb or #rrggbb hex`);
  }
  const color = normalizedHexColor(colorSource);
  const result = {
    source: boundedString(
      planner,
      record.source,
      `${label}.source`,
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength
    ),
    target: boundedString(
      planner,
      record.target,
      `${label}.target`,
      KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength
    ),
    color,
    kind: boundedString(
      planner,
      record.kind,
      `${label}.kind`,
      KNOWLEDGE_GRAPH_LIMITS.maxKindLength
    ),
    edgeStrokePattern: "solid"
  };
  if (Object.hasOwn(record, "edgeStrokePattern")) {
    const edgeStrokePattern = boundedString(
      planner,
      record.edgeStrokePattern,
      `${label}.edgeStrokePattern`,
      32
    );
    if (!isKnowledgeGraphEdgeStrokePattern(edgeStrokePattern)) {
      throw new TypeError(`${label}.edgeStrokePattern is unsupported`);
    }
    result.edgeStrokePattern = edgeStrokePattern;
  }
  addOptional(result, "id", optionalBoundedString(
    planner,
    record,
    "id",
    `${label}.id`,
    KNOWLEDGE_GRAPH_LIMITS.maxEdgeIdLength
  ));
  addOptional(result, "label", optionalBoundedString(
    planner,
    record,
    "label",
    `${label}.label`,
    KNOWLEDGE_GRAPH_LIMITS.maxEdgeLabelLength
  ));
  if (Object.hasOwn(record, "attributes")) {
    result.attributes = snapshotAttributes(planner, record.attributes, `${label}.attributes`);
  }
  if (Object.hasOwn(record, "epistemic")) {
    result.epistemic = snapshotEpistemic(planner, record.epistemic, `${label}.epistemic`);
  }
  if (Object.hasOwn(record, "evidence")) {
    result.evidence = snapshotEvidence(planner, record.evidence, `${label}.evidence`);
  }
  if (Object.hasOwn(record, "uncalibrated_score")) {
    result.uncalibrated_score = snapshotScore(
      planner,
      record.uncalibrated_score,
      `${label}.uncalibrated_score`
    );
  }
  addOptional(result, "directed", optionalBoolean(record, "directed", `${label}.directed`));
  addOptional(result, "particles", optionalBoolean(record, "particles", `${label}.particles`));
  return result;
}
function snapshotContext(planner, value) {
  const label = "knowledge-graph context";
  const record = planner.record(value, label, [
    "graph_id",
    "graph_source",
    "graph_snapshot_id",
    "graph_scope",
    "generated_at"
  ]);
  const context = {
    graph_id: boundedString(planner, record.graph_id, `${label}.graph_id`, 160),
    graph_source: boundedString(planner, record.graph_source, `${label}.graph_source`, 200),
    graph_snapshot_id: boundedString(
      planner,
      record.graph_snapshot_id,
      `${label}.graph_snapshot_id`,
      200
    ),
    graph_scope: boundedString(planner, record.graph_scope, `${label}.graph_scope`, 80),
    generated_at: boundedString(planner, record.generated_at, `${label}.generated_at`, 80)
  };
  if (context.graph_scope !== "corpus_entity") {
    throw new TypeError(`${label}.graph_scope must equal corpus_entity`);
  }
  if (!isRfc3339WithSeconds(context.generated_at)) {
    throw new TypeError(`${label}.generated_at must be an RFC 3339 timestamp with seconds`);
  }
  return context;
}
function assertUniqueNodesAndRenderableEdges(nodes, edges) {
  const nodeIds = /* @__PURE__ */ new Set();
  for (let index = 0; index < nodes.length; index++) {
    const id = nodes[index].id;
    if (nodeIds.has(id)) {
      throw new TypeError(`knowledge graph node id is duplicated at index ${index}`);
    }
    nodeIds.add(id);
  }
  const assertEvidenceReferences = (evidence, label) => {
    if (evidence === void 0) return;
    for (let index = 0; index < evidence.length; index++) {
      const reference = evidence[index];
      if (reference.kind === "graph_node" && !nodeIds.has(reference.node_id)) {
        throw new TypeError(
          `${label} evidence at index ${index} references a missing graph node`
        );
      }
    }
  };
  for (let index = 0; index < nodes.length; index++) {
    assertEvidenceReferences(nodes[index].evidence, `knowledge graph node at index ${index}`);
  }
  const identities = /* @__PURE__ */ new Set();
  const pairCounts = /* @__PURE__ */ new Map();
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index];
    assertEvidenceReferences(edge.evidence, `knowledge graph edge at index ${index}`);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new TypeError(`knowledge graph edge at index ${index} has a missing endpoint`);
    }
    if (edge.source === edge.target) {
      throw new TypeError(`knowledge graph edge at index ${index} is a self-loop`);
    }
    if (edge.directed === false && edge.particles === true) {
      throw new TypeError(
        `knowledge graph edge at index ${index} is undirected but carries directional particles`
      );
    }
    const identity = graphEdgeIdentityKey(edge);
    if (identities.has(identity)) {
      throw new TypeError(`knowledge graph edge identity is duplicated at index ${index}`);
    }
    identities.add(identity);
    const pair = edge.source < edge.target ? JSON.stringify([edge.source, edge.target]) : JSON.stringify([edge.target, edge.source]);
    const count = (pairCounts.get(pair) ?? 0) + 1;
    if (count > KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair) {
      throw new RangeError(
        `knowledge graph edge bundle exceeds ${KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair} at index ${index}`
      );
    }
    pairCounts.set(pair, count);
  }
}
var CORPUS_NODE_KINDS = /* @__PURE__ */ new Set(["paper", "model", "family"]);
var CORPUS_EDGE_SEMANTICS = {
  cites: {
    source: "paper",
    target: "paper",
    directed: true,
    particles: true,
    scoreKinds: ["citation_resolution_confidence"]
  },
  same_as: {
    source: "model",
    target: "model",
    directed: false,
    particles: false,
    scoreKinds: ["structural_similarity"]
  },
  variant_of: {
    source: "model",
    target: "model",
    directed: true,
    particles: false,
    scoreKinds: ["structural_similarity"]
  },
  instantiates: {
    source: "paper",
    target: "model",
    directed: true,
    particles: false,
    scoreKinds: []
  },
  belongs_to_family: {
    source: "model",
    target: "family",
    directed: true,
    particles: false,
    scoreKinds: []
  }
};
function hasDirectEvidenceAnchor(evidence) {
  return evidence !== void 0 && evidence.length > 0 && evidence.some((reference) => reference.kind !== "graph_node");
}
function assertCorpusPresentationSemantics(nodes, edges) {
  if (nodes.length < 1) {
    throw new TypeError("corpus knowledge-graph presentation requires at least one node");
  }
  const nodeKinds = /* @__PURE__ */ new Map();
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (!CORPUS_NODE_KINDS.has(node.kind)) {
      throw new TypeError(`corpus knowledge-graph node at index ${index} has an invalid kind`);
    }
    if (node.attributes === void 0 || node.epistemic === void 0 || !hasDirectEvidenceAnchor(node.evidence)) {
      throw new TypeError(
        `corpus knowledge-graph node at index ${index} requires attributes, advisory epistemic metadata, and a direct evidence anchor`
      );
    }
    if (node.uncalibrated_score !== void 0 && node.uncalibrated_score.kind !== "extraction_confidence") {
      throw new TypeError(
        `corpus knowledge-graph node at index ${index} permits only extraction_confidence`
      );
    }
    if (node.radiusMeaning === void 0) {
      throw new TypeError(
        `corpus knowledge-graph node at index ${index} requires derived radius semantics`
      );
    }
    if (node.nodeGlyph !== CORPUS_NODE_GLYPH_BY_KIND[node.kind]) {
      throw new TypeError(
        `corpus knowledge-graph node at index ${index} has an invalid glyph mapping`
      );
    }
    nodeKinds.set(node.id, node.kind);
  }
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index];
    const semantics = CORPUS_EDGE_SEMANTICS[edge.kind];
    if (semantics === void 0) {
      throw new TypeError(`corpus knowledge-graph edge at index ${index} has an invalid kind`);
    }
    if (edge.id === void 0 || edge.label === void 0 || edge.attributes === void 0 || edge.epistemic === void 0 || !hasDirectEvidenceAnchor(edge.evidence)) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} requires a stable id, label, attributes, advisory epistemic metadata, and a direct evidence anchor`
      );
    }
    if (nodeKinds.get(edge.source) !== semantics.source || nodeKinds.get(edge.target) !== semantics.target) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} has incompatible endpoint kinds`
      );
    }
    if (edge.directed !== false !== semantics.directed || edge.particles === true !== semantics.particles) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} has invalid direction/flow semantics`
      );
    }
    if (edge.edgeStrokePattern !== CORPUS_EDGE_STROKE_PATTERN_BY_KIND[edge.kind]) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} has an invalid stroke mapping`
      );
    }
    if (edge.uncalibrated_score !== void 0 && !semantics.scoreKinds.includes(
      edge.uncalibrated_score.kind
    )) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} has an invalid score meaning`
      );
    }
  }
}
function prepareKnowledgeGraphPresentationWithAssurance(input, inputAssurance, expectedProfile) {
  const planner = new PresentationPlanner();
  const record = planner.record(input, "knowledge-graph presentation", [
    "contract",
    "profile",
    "nodes",
    "edges"
  ], ["graphIdentity", "context"]);
  if (record.contract !== KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1) {
    throw new TypeError(
      `knowledge-graph presentation.contract must equal ${KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1}`
    );
  }
  planner.budget.string(record.contract, "knowledge-graph presentation.contract");
  if (record.profile !== expectedProfile) {
    throw new TypeError(
      `knowledge-graph presentation.profile must equal ${expectedProfile}`
    );
  }
  planner.budget.string(
    record.profile,
    "knowledge-graph presentation.profile"
  );
  const nodeInputs = planner.array(
    record.nodes,
    "knowledge-graph nodes",
    KNOWLEDGE_GRAPH_LIMITS.maxPresentationNodes
  );
  const edgeInputs = planner.array(
    record.edges,
    "knowledge-graph edges",
    KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges
  );
  const nodes = nodeInputs.map((node, index) => snapshotNode(planner, node, index));
  const edges = edgeInputs.map((edge, index) => snapshotEdge(planner, edge, index));
  const hasContext = Object.hasOwn(record, "context");
  const hasGraphIdentity = Object.hasOwn(record, "graphIdentity");
  if (expectedProfile === "generic_visual" && hasContext) {
    throw new TypeError("generic visual presentations cannot carry corpus context");
  }
  if (expectedProfile === "corpus_entity" && (!hasContext || hasGraphIdentity)) {
    throw new TypeError(
      "corpus presentations require context and cannot supply graphIdentity"
    );
  }
  const context = hasContext ? snapshotContext(planner, record.context) : void 0;
  let graphIdentity;
  if (expectedProfile === "corpus_entity" && context !== void 0) {
    graphIdentity = deriveKnowledgeGraphContextIdentity(context);
  } else {
    if (!hasGraphIdentity) {
      throw new TypeError(
        "generic visual presentations require graphIdentity"
      );
    }
    graphIdentity = boundedString(
      planner,
      record.graphIdentity,
      "knowledge-graph presentation.graphIdentity",
      1024
    );
  }
  assertUniqueNodesAndRenderableEdges(nodes, edges);
  if (expectedProfile === "corpus_entity") {
    assertCorpusPresentationSemantics(nodes, edges);
  }
  planner.revalidate();
  const owned = {
    contract: PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
    profile: expectedProfile,
    graphIdentity,
    nodes,
    edges,
    budget: planner.budget.receipt(),
    inputAssurance,
    mappingAuthority: expectedProfile === "corpus_entity" ? {
      kind: "corpus_visual_mapping",
      presentationInvariants: "bounded_closed_visual_records_redundant_kind_channels_and_graph_integrity",
      derivationAuthentication: "not_performed",
      scientificAuthority: "not_established"
    } : {
      kind: "caller_declared_visual_mapping",
      scientificAuthority: "not_established"
    }
  };
  if (context !== void 0) owned.context = context;
  nullPrototypeOwnedRecords(owned);
  const prepared = deepFreeze(owned);
  PREPARED_PRESENTATIONS.add(prepared);
  PRESENTATION_NODE_IDS.set(prepared, new Set(nodes.map(({ id }) => id)));
  return prepared;
}
function prepareKnowledgeGraphPresentation(input) {
  return prepareKnowledgeGraphPresentationWithAssurance(input, {
    boundary: "materialized_javascript_value",
    duplicateMembers: "not_observable_after_materialization",
    proxyTrapFreedom: "not_established"
  }, "generic_visual");
}
function prepareCorpusKnowledgeGraphPresentation(input) {
  return prepareKnowledgeGraphPresentationWithAssurance(input, {
    boundary: "materialized_javascript_value",
    duplicateMembers: "not_observable_after_materialization",
    proxyTrapFreedom: "not_established"
  }, "corpus_entity");
}
function parseKnowledgeGraphPresentationJson(text) {
  const parsed = parseJsonStrict(text, {
    limits: KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS
  });
  if (!parsed.ok) throw new KnowledgeGraphPresentationJsonError(parsed.errors);
  return prepareKnowledgeGraphPresentationWithAssurance(
    parsed.value,
    {
      boundary: "raw_json_text",
      duplicateMembers: "rejected_before_materialization",
      proxyTrapFreedom: "not_applicable"
    },
    "generic_visual"
  );
}
function isPreparedKnowledgeGraphPresentation(value) {
  return value !== null && typeof value === "object" && PREPARED_PRESENTATIONS.has(value);
}
function assertPreparedKnowledgeGraphPresentation(value) {
  if (!isPreparedKnowledgeGraphPresentation(value)) {
    throw new TypeError(
      "knowledge-graph surfaces require a capability returned by prepareKnowledgeGraphPresentation, parseKnowledgeGraphPresentationJson, or the canonical corpus-figure preparation boundary"
    );
  }
}
function assertPreparedGenericKnowledgeGraphPresentation(value) {
  assertPreparedKnowledgeGraphPresentation(value);
  if (value.profile !== "generic_visual") {
    throw new TypeError(
      "direct knowledge-graph surfaces accept only generic_visual presentations; render corpus_entity through KnowledgeGraphAccessibleFigure so its bound honesty caption remains in the composition"
    );
  }
}
function assertPreparedCorpusKnowledgeGraphPresentation(value) {
  assertPreparedKnowledgeGraphPresentation(value);
  if (value.profile !== "corpus_entity") {
    throw new TypeError("canonical corpus surfaces require a corpus_entity presentation");
  }
}
function knowledgeGraphPresentationContainsNode(presentation, nodeId) {
  assertPreparedKnowledgeGraphPresentation(presentation);
  return PRESENTATION_NODE_IDS.get(presentation).has(nodeId);
}
function serializePreparedKnowledgeGraphPresentation(value) {
  assertPreparedKnowledgeGraphPresentation(value);
  return canonicalize(value);
}
var VIEW_NODE_IDS = /* @__PURE__ */ new WeakMap();
var VIEW_SOURCE_KINDS = /* @__PURE__ */ new WeakMap();
var VIEW_CACHE = /* @__PURE__ */ new WeakMap();
function sourceViewKinds(source) {
  const existing = VIEW_SOURCE_KINDS.get(source);
  if (existing !== void 0) return existing;
  const created = {
    nodeKinds: new Set(source.nodes.map(({ kind }) => kind)),
    edgeKinds: new Set(source.edges.map(({ kind }) => kind))
  };
  VIEW_SOURCE_KINDS.set(source, created);
  return created;
}
function snapshotViewKinds(planner, record, key, sourceKinds) {
  if (!Object.hasOwn(record, key)) return "all";
  const input = planner.array(
    record[key],
    `knowledge-graph view policy.${key}`,
    key === "nodeKinds" ? KNOWLEDGE_GRAPH_LIMITS.maxViewNodeKinds : KNOWLEDGE_GRAPH_LIMITS.maxViewEdgeKinds
  );
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < input.length; index++) {
    const kind = boundedString(
      planner,
      input[index],
      `knowledge-graph view policy.${key}[${index}]`,
      KNOWLEDGE_GRAPH_LIMITS.maxKindLength
    );
    if (seen.has(kind)) {
      throw new TypeError(`knowledge-graph view policy.${key} contains a duplicate kind`);
    }
    if (!sourceKinds.has(kind)) {
      throw new TypeError(
        `knowledge-graph view policy.${key} requests a kind absent from the source graph`
      );
    }
    seen.add(kind);
    result.push(kind);
  }
  result.sort();
  return result;
}
function prepareKnowledgeGraphView(source, policy = {}) {
  assertPreparedKnowledgeGraphPresentation(source);
  const planner = new PresentationPlanner();
  const record = planner.record(
    policy,
    "knowledge-graph view policy",
    [],
    ["nodeKinds", "edgeKinds"]
  );
  const sourceKinds = sourceViewKinds(source);
  const nodeKinds = snapshotViewKinds(
    planner,
    record,
    "nodeKinds",
    sourceKinds.nodeKinds
  );
  const edgeKinds = snapshotViewKinds(
    planner,
    record,
    "edgeKinds",
    sourceKinds.edgeKinds
  );
  planner.revalidate();
  const cacheKey = JSON.stringify([nodeKinds, edgeKinds]);
  const cache = VIEW_CACHE.get(source);
  const cached = cache?.get(cacheKey);
  if (cached !== void 0 && cache !== void 0) {
    cache.delete(cacheKey);
    cache.set(cacheKey, cached);
    return cached;
  }
  const selectedNodeKinds = nodeKinds === "all" ? void 0 : new Set(nodeKinds);
  const selectedEdgeKinds = edgeKinds === "all" ? void 0 : new Set(edgeKinds);
  const nodes = source.nodes.filter((node) => selectedNodeKinds === void 0 || selectedNodeKinds.has(node.kind));
  const nodeIds = new Set(nodes.map(({ id }) => id));
  let edgeKindCandidates = 0;
  const edges = source.edges.filter((edge) => {
    if (selectedEdgeKinds !== void 0 && !selectedEdgeKinds.has(edge.kind)) return false;
    edgeKindCandidates += 1;
    return nodeIds.has(edge.source) && nodeIds.has(edge.target);
  });
  const storedPolicy = /* @__PURE__ */ Object.create(null);
  storedPolicy.nodeKinds = nodeKinds === "all" ? "all" : Object.freeze([...nodeKinds]);
  storedPolicy.edgeKinds = edgeKinds === "all" ? "all" : Object.freeze([...edgeKinds]);
  const counts = /* @__PURE__ */ Object.create(null);
  counts.sourceNodes = source.nodes.length;
  counts.sourceEdges = source.edges.length;
  counts.visibleNodes = nodes.length;
  counts.visibleEdges = edges.length;
  counts.edgeKindFilteredEdges = source.edges.length - edgeKindCandidates;
  counts.endpointPrunedEdges = edgeKindCandidates - edges.length;
  const owned = /* @__PURE__ */ Object.create(null);
  owned.contract = PREPARED_KNOWLEDGE_GRAPH_VIEW_V1;
  owned.graphIdentity = source.graphIdentity;
  owned.policy = Object.freeze(storedPolicy);
  owned.nodes = Object.freeze(nodes);
  owned.edges = Object.freeze(edges);
  owned.counts = Object.freeze(counts);
  const prepared = Object.freeze(owned);
  PREPARED_VIEWS.add(prepared);
  VIEW_SOURCES.set(prepared, source);
  VIEW_NODE_IDS.set(prepared, nodeIds);
  if (cache !== void 0) {
    if (cache.size >= KNOWLEDGE_GRAPH_LIMITS.maxCachedViewsPerPresentation) {
      const oldest = cache.keys().next().value;
      if (oldest !== void 0) cache.delete(oldest);
    }
    cache.set(cacheKey, prepared);
  } else {
    VIEW_CACHE.set(source, /* @__PURE__ */ new Map([[cacheKey, prepared]]));
  }
  return prepared;
}
function isPreparedKnowledgeGraphView(value) {
  return value !== null && typeof value === "object" && PREPARED_VIEWS.has(value);
}
function assertPreparedKnowledgeGraphView(value, source) {
  assertPreparedKnowledgeGraphPresentation(source);
  if (!isPreparedKnowledgeGraphView(value) || VIEW_SOURCES.get(value) !== source) {
    throw new TypeError(
      "knowledge-graph view must be a capability prepared for the exact source presentation"
    );
  }
}
function knowledgeGraphViewContainsNode(view, source, nodeId) {
  assertPreparedKnowledgeGraphView(view, source);
  return VIEW_NODE_IDS.get(view).has(nodeId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  KnowledgeGraphPresentationJsonError,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  assertPreparedCorpusKnowledgeGraphPresentation,
  assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView,
  isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView,
  knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode,
  parseKnowledgeGraphPresentationJson,
  prepareCorpusKnowledgeGraphPresentation,
  prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView,
  serializePreparedKnowledgeGraphPresentation
});
//# sourceMappingURL=knowledge-graph-presentation-capability.cjs.map