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

class DuplicateMemberScanner {
  private index = 0;

  constructor(
    private readonly text: string,
    private readonly sourceName: string,
  ) {}

  scan(): void {
    this.skipWhitespace();
    this.scanValue();
    this.skipWhitespace();
    if (this.index !== this.text.length) this.internalMismatch();
  }

  private scanValue(): void {
    this.skipWhitespace();
    const token = this.text[this.index];
    if (token === '{') {
      this.scanObject();
    } else if (token === '[') {
      this.scanArray();
    } else if (token === '"') {
      this.scanString();
    } else {
      this.scanPrimitive();
    }
  }

  private scanObject(): void {
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
      this.scanValue();
      this.skipWhitespace();

      const delimiter = this.text[this.index++];
      if (delimiter === '}') return;
      if (delimiter !== ',') this.internalMismatch();
    }
  }

  private scanArray(): void {
    this.index++; // [
    this.skipWhitespace();
    if (this.text[this.index] === ']') {
      this.index++;
      return;
    }

    for (;;) {
      this.scanValue();
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
        return JSON.parse(this.text.slice(start, this.index)) as string;
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

export function parseJsonSourceStrict<T = unknown>(text: string, sourceName: string): T {
  // Validate the complete JSON grammar first. The scanner can then be deliberately small:
  // it needs to preserve member identity, not implement a second JSON value parser.
  const parsed = JSON.parse(text) as T;
  new DuplicateMemberScanner(text, sourceName).scan();
  return parsed;
}
