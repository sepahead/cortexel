/**
 * The raw-JSON boundary.
 *
 * There are exactly two ways into Cortexel, and they can certify different
 * things. That difference is real and the API refuses to blur it:
 *
 *   parseJsonStrict(text)      — sees the TEXT. Can prove there was no duplicate
 *                                object member, because it watches the members go by.
 *   snapshotValue(jsValue)     — sees a value that JSON.parse ALREADY collapsed.
 *                                One duplicate already silently won. No amount of
 *                                inspection can recover which, so it reports the
 *                                lower assurance instead of implying a check it
 *                                cannot perform.
 *
 * This file is the first one. It is a hand-written recursive-descent parser
 * rather than a call to `JSON.parse`, for three reasons:
 *
 *   1. `JSON.parse` silently accepts `{"a":1,"a":2}` and gives you `{a: 2}`.
 *      Which value won is not something a scientific record should shrug at.
 *   2. Limits must bite BEFORE materialization. Handing 32 MiB of nested arrays
 *      to `JSON.parse` and checking the size afterwards is checking too late.
 *   3. Objects are built with a null prototype, so `__proto__` cannot become a
 *      prototype write no matter what the input says.
 */

import { makeError, type CortexelError, type Result, err, ok } from './errors.js';
import type { BudgetLimits } from './limits.js';

/** A value inside the JSON domain, with objects null-prototyped. */
export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

/** Keys that can reach `Object.prototype`. Rejected outright, at every depth. */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface ParseOptions {
  readonly limits: BudgetLimits;
  /** Reject a leading UTF-8 BOM. Identical in TypeScript and Python. */
  readonly allowBom?: boolean;
}

class ParseFailure extends Error {
  readonly diagnostic: CortexelError;
  constructor(diagnostic: CortexelError) {
    super(diagnostic.message);
    this.name = 'ParseFailure';
    this.diagnostic = diagnostic;
  }
}

class Scanner {
  private readonly text: string;
  private readonly limits: BudgetLimits;
  private index = 0;
  private nodes = 0;
  /** Path segments to the value being read, for a precise JSON Pointer on failure. */
  private readonly path: (string | number)[] = [];

  constructor(text: string, limits: BudgetLimits) {
    this.text = text;
    this.limits = limits;
  }

  private pointer(): string {
    if (this.path.length === 0) return '';
    return this.path
      .map((segment) => `/${String(segment).replace(/~/g, '~0').replace(/\//g, '~1')}`)
      .join('');
  }

  private fail(code: Parameters<typeof makeError>[0]['code'], message: string, extra?: {
    limit?: { name: string; limit: number; observed?: number };
  }): never {
    throw new ParseFailure(
      makeError({
        code,
        stage: 'parse',
        instancePath: this.pointer(),
        message,
        ...(extra?.limit ? { limit: extra.limit } : {}),
      }),
    );
  }

  private countNode(): void {
    this.nodes++;
    if (this.nodes > this.limits.jsonTotalNodes) {
      this.fail('JSON_TOKENS_EXCEEDED', 'the document exceeds the total node limit', {
        limit: { name: 'jsonTotalNodes', limit: this.limits.jsonTotalNodes, observed: this.nodes },
      });
    }
  }

  private skipWhitespace(): void {
    while (this.index < this.text.length) {
      const ch = this.text[this.index];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.index++;
        continue;
      }
      // A comment is not JSON. Naming it beats a generic syntax error, because
      // "unexpected /" sends people looking in the wrong place.
      if (ch === '/') {
        this.fail('JSON_COMMENT_NOT_ALLOWED', 'comments are not valid JSON');
      }
      return;
    }
  }

  private expect(ch: string): void {
    if (this.text[this.index] !== ch) {
      this.fail('JSON_SYNTAX', `expected ${JSON.stringify(ch)} at offset ${this.index}`);
    }
    this.index++;
  }

  parseTopLevel(): JsonValue {
    this.skipWhitespace();
    if (this.index >= this.text.length) {
      this.fail('JSON_EMPTY_INPUT', 'the input contained no JSON value');
    }
    const value = this.parseValue(0);
    this.skipWhitespace();
    if (this.index < this.text.length) {
      this.fail(
        'JSON_TRAILING_DATA',
        `unexpected content after the top-level value at offset ${this.index}`,
      );
    }
    return value;
  }

  private parseValue(depth: number): JsonValue {
    if (depth > this.limits.jsonDepth) {
      this.fail('JSON_DEPTH_EXCEEDED', 'nesting is deeper than the parser permits', {
        limit: { name: 'jsonDepth', limit: this.limits.jsonDepth, observed: depth },
      });
    }
    this.skipWhitespace();
    const ch = this.text[this.index];

    switch (ch) {
      case '{':
        return this.parseObject(depth);
      case '[':
        return this.parseArray(depth);
      case '"':
        this.countNode();
        return this.parseString();
      case 't':
        this.countNode();
        this.literal('true');
        return true;
      case 'f':
        this.countNode();
        this.literal('false');
        return false;
      case 'n':
        this.countNode();
        this.literal('null');
        return null;
      default:
        this.countNode();
        return this.parseNumber();
    }
  }

  private literal(word: string): void {
    if (this.text.startsWith(word, this.index)) {
      this.index += word.length;
      return;
    }
    this.fail('JSON_SYNTAX', `expected ${word} at offset ${this.index}`);
  }

  private parseObject(depth: number): JsonObject {
    this.countNode();
    this.expect('{');
    // Null prototype: `__proto__` is rejected below, but building on a null
    // prototype means even a future bug here cannot become a prototype write.
    const object = Object.create(null) as JsonObject;
    const seen = new Set<string>();

    this.skipWhitespace();
    if (this.text[this.index] === '}') {
      this.index++;
      return object;
    }

    for (;;) {
      this.skipWhitespace();
      if (this.text[this.index] === '}') {
        this.fail('JSON_TRAILING_COMMA_NOT_ALLOWED', 'trailing commas are not valid JSON');
      }
      if (this.text[this.index] !== '"') {
        this.fail('JSON_SYNTAX', `expected a member name at offset ${this.index}`);
      }

      const key = this.parseString();

      if (DANGEROUS_KEYS.has(key)) {
        this.path.push(key);
        this.fail(
          'JSON_DANGEROUS_KEY',
          `the member name ${JSON.stringify(key)} can reach Object.prototype and is rejected`,
        );
      }

      // THE duplicate-key check. It is only possible here — after JSON.parse, one
      // value has already won and the evidence is gone. Which value a JSON parser
      // keeps for a duplicate member is not specified, so a document that contains
      // one does not have a single meaning, and is rejected rather than resolved.
      if (seen.has(key)) {
        this.path.push(key);
        this.fail(
          'JSON_DUPLICATE_KEY',
          `the member name ${JSON.stringify(key)} appears more than once; which value would win is undefined`,
        );
      }
      seen.add(key);

      if (seen.size > this.limits.jsonObjectKeys) {
        this.fail('JSON_TOO_MANY_KEYS', 'the object has more members than the parser permits', {
          limit: { name: 'jsonObjectKeys', limit: this.limits.jsonObjectKeys, observed: seen.size },
        });
      }

      this.skipWhitespace();
      this.expect(':');

      this.path.push(key);
      object[key] = this.parseValue(depth + 1);
      this.path.pop();

      this.skipWhitespace();
      const next = this.text[this.index];
      if (next === ',') {
        this.index++;
        continue;
      }
      if (next === '}') {
        this.index++;
        return object;
      }
      this.fail('JSON_SYNTAX', `expected ',' or '}' at offset ${this.index}`);
    }
  }

  private parseArray(depth: number): JsonValue[] {
    this.countNode();
    this.expect('[');
    const array: JsonValue[] = [];

    this.skipWhitespace();
    if (this.text[this.index] === ']') {
      this.index++;
      return array;
    }

    for (;;) {
      this.skipWhitespace();
      if (this.text[this.index] === ']') {
        this.fail('JSON_TRAILING_COMMA_NOT_ALLOWED', 'trailing commas are not valid JSON');
      }

      this.path.push(array.length);
      array.push(this.parseValue(depth + 1));
      this.path.pop();

      if (array.length > this.limits.jsonArrayItems) {
        this.fail('JSON_ARRAY_TOO_LONG', 'the array has more members than the parser permits', {
          limit: {
            name: 'jsonArrayItems',
            limit: this.limits.jsonArrayItems,
            observed: array.length,
          },
        });
      }

      this.skipWhitespace();
      const next = this.text[this.index];
      if (next === ',') {
        this.index++;
        continue;
      }
      if (next === ']') {
        this.index++;
        return array;
      }
      this.fail('JSON_SYNTAX', `expected ',' or ']' at offset ${this.index}`);
    }
  }

  private parseString(): string {
    this.expect('"');
    let out = '';

    for (;;) {
      if (this.index >= this.text.length) {
        this.fail('JSON_SYNTAX', 'the input ended inside a string');
      }
      const ch = this.text[this.index];

      if (ch === '"') {
        this.index++;
        if (out.length > this.limits.jsonStringLength) {
          this.fail('JSON_STRING_TOO_LONG', 'a string is longer than the parser permits', {
            limit: {
              name: 'jsonStringLength',
              limit: this.limits.jsonStringLength,
              observed: out.length,
            },
          });
        }
        return out;
      }

      if (ch === '\\') {
        this.index++;
        out += this.parseEscape();
        continue;
      }

      const code = this.text.charCodeAt(this.index);

      // JSON forbids raw control characters in strings. They are also exactly the
      // characters that let a caption render as something other than what it says.
      if (code < 0x20) {
        this.fail(
          'JSON_SYNTAX',
          `a raw control character (U+${code.toString(16).padStart(4, '0').toUpperCase()}) is not valid inside a JSON string`,
        );
      }

      // A lone surrogate has no UTF-8 encoding, so it has no canonical byte
      // sequence, so it cannot be hashed reproducibly. It fails here rather than
      // in the digest, where the cause would be far less obvious.
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = this.text.charCodeAt(this.index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) {
          this.fail('JSON_INVALID_UNICODE', 'an unpaired high surrogate is not well-formed Unicode');
        }
        out += this.text[this.index] + this.text[this.index + 1];
        this.index += 2;
        continue;
      }
      if (code >= 0xdc00 && code <= 0xdfff) {
        this.fail('JSON_INVALID_UNICODE', 'an unpaired low surrogate is not well-formed Unicode');
      }

      out += ch;
      this.index++;
    }
  }

  private parseEscape(): string {
    const ch = this.text[this.index];
    this.index++;
    switch (ch) {
      case '"':
        return '"';
      case '\\':
        return '\\';
      case '/':
        return '/';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'u':
        return this.parseUnicodeEscape();
      default:
        this.fail('JSON_SYNTAX', `invalid escape sequence \\${String(ch)}`);
    }
  }

  private parseUnicodeEscape(): string {
    const hex = this.text.slice(this.index, this.index + 4);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
      this.fail('JSON_INVALID_UNICODE', 'a \\u escape must be followed by four hex digits');
    }
    this.index += 4;
    const code = Number.parseInt(hex, 16);

    if (code >= 0xd800 && code <= 0xdbff) {
      // A high surrogate MUST be followed by an escaped low surrogate. Anything
      // else is not well-formed Unicode, however plausible it looks.
      if (this.text[this.index] !== '\\' || this.text[this.index + 1] !== 'u') {
        this.fail('JSON_INVALID_UNICODE', 'an escaped high surrogate must be followed by a low surrogate');
      }
      const lowHex = this.text.slice(this.index + 2, this.index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(lowHex)) {
        this.fail('JSON_INVALID_UNICODE', 'a \\u escape must be followed by four hex digits');
      }
      const low = Number.parseInt(lowHex, 16);
      if (!(low >= 0xdc00 && low <= 0xdfff)) {
        this.fail('JSON_INVALID_UNICODE', 'an escaped high surrogate must be followed by a low surrogate');
      }
      this.index += 6;
      return String.fromCharCode(code, low);
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      this.fail('JSON_INVALID_UNICODE', 'an unpaired escaped low surrogate is not well-formed Unicode');
    }

    return String.fromCharCode(code);
  }

  private parseNumber(): number {
    const start = this.index;

    if (this.text[this.index] === '-') this.index++;

    // JSON forbids a leading zero followed by more digits: `01` is not a number.
    if (this.text[this.index] === '0') {
      this.index++;
    } else if (this.isDigit(this.text[this.index])) {
      while (this.isDigit(this.text[this.index])) this.index++;
    } else {
      this.fail('JSON_SYNTAX', `unexpected token at offset ${this.index}`);
    }

    if (this.text[this.index] === '.') {
      this.index++;
      if (!this.isDigit(this.text[this.index])) {
        this.fail('JSON_INVALID_NUMBER', 'a decimal point must be followed by at least one digit');
      }
      while (this.isDigit(this.text[this.index])) this.index++;
    }

    if (this.text[this.index] === 'e' || this.text[this.index] === 'E') {
      this.index++;
      if (this.text[this.index] === '+' || this.text[this.index] === '-') this.index++;
      if (!this.isDigit(this.text[this.index])) {
        this.fail('JSON_INVALID_NUMBER', 'an exponent must have at least one digit');
      }
      while (this.isDigit(this.text[this.index])) this.index++;
    }

    const token = this.text.slice(start, this.index);

    if (token.length === 0) {
      this.fail('JSON_SYNTAX', `unexpected token at offset ${start}`);
    }
    if (token.length > this.limits.jsonNumberTokenLength) {
      this.fail(
        'JSON_NUMBER_TOKEN_TOO_LONG',
        'the numeric token is longer than any meaningful binary64 literal',
        {
          limit: {
            name: 'jsonNumberTokenLength',
            limit: this.limits.jsonNumberTokenLength,
            observed: token.length,
          },
        },
      );
    }

    const value = Number(token);

    // `1e400` is grammatically valid JSON and evaluates to Infinity. It is outside
    // the finite binary64 model, has no canonical form, and is not a measurement.
    if (!Number.isFinite(value)) {
      this.fail(
        'JSON_NON_FINITE_NUMBER',
        'the number is outside the finite binary64 model; use null for a missing observation',
      );
    }

    return value;
  }

  private isDigit(ch: string | undefined): boolean {
    return ch !== undefined && ch >= '0' && ch <= '9';
  }
}

/**
 * Parse raw JSON text strictly.
 *
 * This is the ONLY entry point that can certify duplicate-member rejection, which
 * is why `cortexel validate file.json` uses it and why the resulting artifact
 * records `duplicateKeys: "rejected_before_materialization"`.
 */
export function parseJsonStrict(text: string, options: ParseOptions): Result<JsonValue> {
  const { limits } = options;

  // Byte length first, before a single character is examined. Checking the size of
  // a parse tree you already built is checking too late.
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > limits.rawInputBytes) {
    return err([
      makeError({
        code: 'JSON_BYTES_EXCEEDED',
        stage: 'parse',
        message: 'the raw input is larger than the active budget profile permits',
        limit: { name: 'rawInputBytes', limit: limits.rawInputBytes, observed: byteLength },
      }),
    ]);
  }

  let source = text;
  if (source.charCodeAt(0) === 0xfeff) {
    if (!options.allowBom) {
      return err([
        makeError({
          code: 'JSON_BOM_NOT_ALLOWED',
          stage: 'parse',
          message: 'the input begins with a byte-order mark; strip it',
        }),
      ]);
    }
    source = source.slice(1);
  }

  try {
    return ok(new Scanner(source, limits).parseTopLevel());
  } catch (error) {
    // Only OUR failure type is interpreted. Anything else is an internal defect and
    // is reported as one rather than being reshaped into a user-facing parse error.
    if (error instanceof ParseFailure) {
      return err([error.diagnostic]);
    }
    return err([
      makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        message: 'the parser failed in an unexpected way; this is a Cortexel defect',
      }),
    ]);
  }
}
