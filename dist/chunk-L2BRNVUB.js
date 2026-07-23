import {
  err,
  makeError,
  ok,
  utf8ByteLength
} from "./chunk-22OHKNZ5.js";

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
        if (out.length > this.limits.jsonStringLength) {
          this.fail("JSON_STRING_TOO_LONG", "a string is longer than the parser permits", {
            limit: {
              name: "jsonStringLength",
              limit: this.limits.jsonStringLength,
              observed: out.length
            }
          });
        }
        return out;
      }
      if (ch === "\\") {
        this.index++;
        out += this.parseEscape();
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
        out += this.text[this.index] + this.text[this.index + 1];
        this.index += 2;
        continue;
      }
      if (code >= 56320 && code <= 57343) {
        this.fail("JSON_INVALID_UNICODE", "an unpaired low surrogate is not well-formed Unicode");
      }
      out += ch;
      this.index++;
    }
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
    if (this.text[this.index] === "-") this.index++;
    if (this.text[this.index] === "0") {
      this.index++;
    } else if (this.isDigit(this.text[this.index])) {
      while (this.isDigit(this.text[this.index])) this.index++;
    } else {
      this.fail("JSON_SYNTAX", `unexpected token at offset ${this.index}`);
    }
    if (this.text[this.index] === ".") {
      this.index++;
      if (!this.isDigit(this.text[this.index])) {
        this.fail("JSON_INVALID_NUMBER", "a decimal point must be followed by at least one digit");
      }
      while (this.isDigit(this.text[this.index])) this.index++;
    }
    if (this.text[this.index] === "e" || this.text[this.index] === "E") {
      this.index++;
      if (this.text[this.index] === "+" || this.text[this.index] === "-") this.index++;
      if (!this.isDigit(this.text[this.index])) {
        this.fail("JSON_INVALID_NUMBER", "an exponent must have at least one digit");
      }
      while (this.isDigit(this.text[this.index])) this.index++;
    }
    const token = this.text.slice(start, this.index);
    if (token.length === 0) {
      this.fail("JSON_SYNTAX", `unexpected token at offset ${start}`);
    }
    if (token.length > this.limits.jsonNumberTokenLength) {
      this.fail(
        "JSON_NUMBER_TOKEN_TOO_LONG",
        "the numeric token is longer than any meaningful binary64 literal",
        {
          limit: {
            name: "jsonNumberTokenLength",
            limit: this.limits.jsonNumberTokenLength,
            observed: token.length
          }
        }
      );
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
  const byteLength = utf8ByteLength(text);
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

export {
  parseJsonStrict
};
//# sourceMappingURL=chunk-L2BRNVUB.js.map