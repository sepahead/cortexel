import { describe, expect, it } from 'vitest';

import {
  DuplicateJsonMemberError,
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
});
