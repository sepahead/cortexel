/**
 * Parse a normative JSON source without allowing duplicate object members.
 *
 * JSON.parse is still the syntax/value authority, but it silently keeps the last value
 * for a repeated member. This lexical pass runs over syntax that JSON.parse has already
 * accepted and records the decoded member names at every object depth, including escaped
 * spellings such as `"a"` versus `"\u0061"`.
 */

export class DuplicateJsonMemberError extends SyntaxError {
  readonly sourceName: string;
  readonly member: string;

  constructor(sourceName: string, member: string) {
    super(`${sourceName}: duplicate JSON object member ${JSON.stringify(member)}`);
    this.name = 'DuplicateJsonMemberError';
    this.sourceName = sourceName;
    this.member = member;
  }
}

/**
 * A bare integer outside the interoperable exact range may still be a legitimate
 * canonical spelling of a binary64 value (for example `9007199254740992`). What is
 * forbidden is a different integer spelling that JSON.parse rounds onto that same
 * value, because two distinct normative source values would then acquire one digest.
 */
export class NonCanonicalJsonIntegerError extends SyntaxError {
  readonly sourceName: string;
  readonly token: string;

  constructor(sourceName: string, token: string) {
    super(
      `${sourceName}: unsafe bare integer ${token} is not the canonical spelling of its parsed binary64 value`,
    );
    this.name = 'NonCanonicalJsonIntegerError';
    this.sourceName = sourceName;
    this.token = token;
  }
}

/** JSON.parse accepts overflowed exponent spellings as Infinity, outside the JSON value model. */
export class NonFiniteJsonNumberError extends SyntaxError {
  readonly sourceName: string;
  readonly token: string;

  constructor(sourceName: string, token: string) {
    super(`${sourceName}: JSON number ${token} does not have a finite binary64 value`);
    this.name = 'NonFiniteJsonNumberError';
    this.sourceName = sourceName;
    this.token = token;
  }
}

/** Bound the recursive source scan so hostile normative input fails predictably. */
export const MAX_NORMATIVE_JSON_DEPTH = 512;

export class JsonSourceDepthError extends SyntaxError {
  constructor(
    readonly sourceName: string,
    readonly maximumDepth: number,
  ) {
    super(`${sourceName}: normative JSON source exceeds maximum depth ${maximumDepth}`);
    this.name = 'JsonSourceDepthError';
  }
}

export class InvalidJsonSourceEncodingError extends SyntaxError {
  constructor(readonly sourceName: string) {
    super(`${sourceName}: normative JSON source is not well-formed UTF-8`);
    this.name = 'InvalidJsonSourceEncodingError';
  }
}

export class JsonSourceBomError extends SyntaxError {
  constructor(readonly sourceName: string) {
    super(`${sourceName}: normative JSON source must not begin with a UTF-8 BOM`);
    this.name = 'JsonSourceBomError';
  }
}

/** RFC 8785/JCS cannot canonicalize strings containing unpaired UTF-16 surrogates. */
export class InvalidJsonSourceUnicodeError extends SyntaxError {
  constructor(readonly sourceName: string) {
    super(`${sourceName}: normative JSON source contains an unpaired Unicode surrogate`);
    this.name = 'InvalidJsonSourceUnicodeError';
  }
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index++;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

class DuplicateMemberScanner {
  private index = 0;

  constructor(
    private readonly text: string,
    private readonly sourceName: string,
  ) {}

  scan(): void {
    this.skipWhitespace();
    this.scanValue(0);
    this.skipWhitespace();
    if (this.index !== this.text.length) this.internalMismatch();
  }

  private scanValue(depth: number): void {
    this.skipWhitespace();
    const token = this.text[this.index];
    if (token === '{') {
      if (depth >= MAX_NORMATIVE_JSON_DEPTH) {
        throw new JsonSourceDepthError(this.sourceName, MAX_NORMATIVE_JSON_DEPTH);
      }
      this.scanObject(depth + 1);
    } else if (token === '[') {
      if (depth >= MAX_NORMATIVE_JSON_DEPTH) {
        throw new JsonSourceDepthError(this.sourceName, MAX_NORMATIVE_JSON_DEPTH);
      }
      this.scanArray(depth + 1);
    } else if (token === '"') {
      this.scanString();
    } else {
      this.scanPrimitive();
    }
  }

  private scanObject(depth: number): void {
    this.index++; // {
    const seen = new Set<string>();
    this.skipWhitespace();
    if (this.text[this.index] === '}') {
      this.index++;
      return;
    }

    for (;;) {
      this.skipWhitespace();
      const member = this.scanString();
      if (seen.has(member)) throw new DuplicateJsonMemberError(this.sourceName, member);
      seen.add(member);

      this.skipWhitespace();
      if (this.text[this.index] !== ':') this.internalMismatch();
      this.index++;
      this.scanValue(depth);
      this.skipWhitespace();

      const delimiter = this.text[this.index++];
      if (delimiter === '}') return;
      if (delimiter !== ',') this.internalMismatch();
    }
  }

  private scanArray(depth: number): void {
    this.index++; // [
    this.skipWhitespace();
    if (this.text[this.index] === ']') {
      this.index++;
      return;
    }

    for (;;) {
      this.scanValue(depth);
      this.skipWhitespace();
      const delimiter = this.text[this.index++];
      if (delimiter === ']') return;
      if (delimiter !== ',') this.internalMismatch();
    }
  }

  private scanString(): string {
    if (this.text[this.index] !== '"') this.internalMismatch();
    const start = this.index++;
    for (;;) {
      const token = this.text[this.index++];
      if (token === undefined) this.internalMismatch();
      if (token === '\\') {
        // JSON.parse already validated escapes. Skip the escaped code unit; for \u this
        // is still safe because only the closing quote matters to this lexical pass.
        this.index++;
      } else if (token === '"') {
        const decoded = JSON.parse(this.text.slice(start, this.index)) as string;
        if (hasUnpairedSurrogate(decoded)) {
          throw new InvalidJsonSourceUnicodeError(this.sourceName);
        }
        return decoded;
      }
    }
  }

  private scanPrimitive(): void {
    const start = this.index;
    while (this.index < this.text.length) {
      const token = this.text[this.index];
      if (token === ',' || token === ']' || token === '}' || /\s/u.test(token)) break;
      this.index++;
    }
    if (this.index === start) this.internalMismatch();

    const token = this.text.slice(start, this.index);
    const value = JSON.parse(token) as unknown;
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new NonFiniteJsonNumberError(this.sourceName, token);
    }
    if (/^-?(?:0|[1-9][0-9]*)$/u.test(token)) {
      // The complete source has already passed JSON.parse and `value` is necessarily
      // a number for this lexical form.
      const numericValue = value as number;
      if (!Number.isSafeInteger(numericValue) && JSON.stringify(numericValue) !== token) {
        throw new NonCanonicalJsonIntegerError(this.sourceName, token);
      }
    }
  }

  private skipWhitespace(): void {
    while (/\s/u.test(this.text[this.index] ?? '')) this.index++;
  }

  private internalMismatch(): never {
    throw new SyntaxError(
      `${this.sourceName}: internal strict-source scanner mismatch at offset ${this.index}`,
    );
  }
}

export function parseJsonSourceStrict<T = unknown>(
  source: string | Uint8Array,
  sourceName: string,
): T {
  let text: string;
  if (typeof source === 'string') {
    text = source;
  } else {
    try {
      // Preserve a BOM so it is rejected below rather than silently consumed.
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(source);
    } catch {
      throw new InvalidJsonSourceEncodingError(sourceName);
    }
  }
  if (text.charCodeAt(0) === 0xfeff) throw new JsonSourceBomError(sourceName);
  // Validate the complete JSON grammar first. The scanner can then be deliberately small:
  // it needs to preserve member identity, not implement a second JSON value parser.
  const parsed = JSON.parse(text) as T;
  new DuplicateMemberScanner(text, sourceName).scan();
  return parsed;
}
