import { describe, expect, it } from 'vitest';

import {
  DuplicateJsonMemberError,
  InvalidJsonSourceEncodingError,
  InvalidJsonSourceUnicodeError,
  JsonSourceDepthError,
  JsonSourceBomError,
  MAX_NORMATIVE_JSON_DEPTH,
  NonCanonicalJsonIntegerError,
  NonFiniteJsonNumberError,
  parseJsonSourceStrict,
} from '../scripts/lib/strict-json-source.js';

describe('normative contract source JSON', () => {
  it('rejects duplicate members at every depth, including escaped-equivalent names', () => {
    for (const text of [
      '{"a":1,"a":2}',
      '{"outer":{"a":1,"a":2}}',
      '[{"a":1,"\\u0061":2}]',
    ]) {
      expect(() => parseJsonSourceStrict(text, 'fixture.json')).toThrow(DuplicateJsonMemberError);
    }
  });

  it('does not confuse member-like text or sibling names with duplicates', () => {
    expect(
      parseJsonSourceStrict('{"left":{"a":1},"right":{"a":2},"text":"{\\\"a\\\":1,\\\"a\\\":2}"}', 'fixture.json'),
    ).toEqual({ left: { a: 1 }, right: { a: 2 }, text: '{"a":1,"a":2}' });
  });

  it('continues to delegate full JSON grammar validation to JSON.parse', () => {
    expect(() => parseJsonSourceStrict('{"a":1,}', 'fixture.json')).toThrow(SyntaxError);
    expect(() => parseJsonSourceStrict('not-json', 'fixture.json')).toThrow(SyntaxError);
  });

  it('rejects malformed UTF-8 and a BOM before normative parsing', () => {
    expect(() => parseJsonSourceStrict(
      Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]),
      'fixture.json',
    )).toThrow(InvalidJsonSourceEncodingError);
    expect(() => parseJsonSourceStrict(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{}')]),
      'fixture.json',
    )).toThrow(JsonSourceBomError);
  });

  it('rejects unpaired surrogates in values and member names while accepting pairs', () => {
    expect(() => parseJsonSourceStrict('{"bad":"\\ud800"}', 'fixture.json'))
      .toThrow(InvalidJsonSourceUnicodeError);
    expect(() => parseJsonSourceStrict('{"\\udc00":true}', 'fixture.json'))
      .toThrow(InvalidJsonSourceUnicodeError);
    expect(() => parseJsonSourceStrict(
      `{"bad":"${String.fromCharCode(0xd800)}"}`,
      'fixture.json',
    )).toThrow(InvalidJsonSourceUnicodeError);
    expect(parseJsonSourceStrict('{"ok":"\\ud83d\\ude00"}', 'fixture.json'))
      .toEqual({ ok: '😀' });
  });

  it('accepts canonical binary64 integer spellings and rejects rounded aliases', () => {
    for (const token of [
      '9007199254740992',
      '-9007199254740992',
      '295147905179352830000',
    ]) {
      expect(parseJsonSourceStrict(token, 'fixture.json')).toBe(JSON.parse(token));
    }

    for (const token of [
      '9007199254740993',
      '-9007199254740993',
      '295147905179352830001',
    ]) {
      expect(() => parseJsonSourceStrict(token, 'fixture.json')).toThrow(
        NonCanonicalJsonIntegerError,
      );
      expect(() => parseJsonSourceStrict(`{"nested":[${token}]}`, 'fixture.json')).toThrow(
        NonCanonicalJsonIntegerError,
      );
    }

    // Decimal/exponent spellings remain JSON.parse's binary64 domain. The alias
    // hazard guarded above is specifically an unsafe bare mathematical integer.
    expect(parseJsonSourceStrict('1e21', 'fixture.json')).toBe(1e21);
  });

  it('rejects every JSON number spelling that overflows binary64', () => {
    for (const text of ['1e400', '-1e400', '{"nested":[1e400]}']) {
      expect(() => parseJsonSourceStrict(text, 'fixture.json')).toThrow(
        NonFiniteJsonNumberError,
      );
    }
  });

  it('fails with a typed error above the normative nesting budget', () => {
    const accepted = `${'['.repeat(MAX_NORMATIVE_JSON_DEPTH)}0${']'.repeat(MAX_NORMATIVE_JSON_DEPTH)}`;
    expect(() => parseJsonSourceStrict(accepted, 'fixture.json')).not.toThrow();

    const excessive = `[${accepted}]`;
    expect(() => parseJsonSourceStrict(excessive, 'fixture.json')).toThrow(JsonSourceDepthError);
  });
});
