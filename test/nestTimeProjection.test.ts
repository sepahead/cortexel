import { describe, expect, it } from 'vitest';

import {
  nestFiniteTimeLimitTicsV310,
  projectNestTicsToMillisecondsV310,
  projectNestWindowEndpointsV310,
} from '../src/core/semantics/nest-time.js';

function binary64Bits(value: number): string {
  const bytes = new ArrayBuffer(8);
  const view = new DataView(bytes);
  view.setFloat64(0, value, false);
  return view.getBigUint64(0, false).toString(16).padStart(16, '0');
}

describe('pinned NEST 3.10.0 time projection', () => {
  it('reproduces exact get_ms binary64 outputs rather than exact rational division', () => {
    const sevenTenths = projectNestTicsToMillisecondsV310(700n, 1000n);
    const nineteenTenths = projectNestTicsToMillisecondsV310(1900n, 1000n);
    expect(sevenTenths).toEqual({ ok: true, milliseconds: 0.7000000000000001 });
    expect(nineteenTenths).toEqual({ ok: true, milliseconds: 1.9000000000000001 });
    if (sevenTenths.ok && nineteenTenths.ok) {
      expect(binary64Bits(sevenTenths.milliseconds)).toBe('3fe6666666666667');
      expect(binary64Bits(nineteenTenths.milliseconds)).toBe('3ffe666666666667');
    }
  });

  it('rejects an unsafe declaration and a get_ms value that fails the pinned inverse', () => {
    expect(projectNestTicsToMillisecondsV310(
      BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      1000n,
    )).toMatchObject({ ok: false, kind: 'source_profile' });
    expect(projectNestTicsToMillisecondsV310(
      BigInt(Number.MAX_SAFE_INTEGER),
      1000n,
    )).toMatchObject({
      ok: false,
      kind: 'source_profile',
      message: expect.stringContaining('does not recover'),
    });
  });

  it('computes and enforces the pinned LP64 finite Time limit exactly', () => {
    const limit = nestFiniteTimeLimitTicsV310(100n);
    expect(limit).toBe(1_152_921_504_606_846_900n);
    expect(projectNestWindowEndpointsV310({
      ticsPerMs: 1000n,
      resolutionTics: 100n,
      retainedTics: [0n, 100n],
      lowerEndpointTics: 0n,
      upperEndpointTics: limit!,
    })).toMatchObject({
      ok: false,
      kind: 'source_profile',
      message: expect.stringContaining('strictly below the pinned finite-Time limit'),
    });
  });

  it('fails closed when an actual adjacent resolution-grid time aliases an endpoint', () => {
    expect(projectNestWindowEndpointsV310({
      ticsPerMs: 1000n,
      resolutionTics: 1n,
      retainedTics: [0n, 9_007_199_254_740_990n],
      lowerEndpointTics: 0n,
      upperEndpointTics: 9_007_199_254_740_990n,
    })).toMatchObject({
      ok: false,
      kind: 'numeric_resolution',
      message: expect.stringContaining('adjacent'),
    });
  });

  it('adds integer tics before projection instead of adding projected components', () => {
    const origin = projectNestTicsToMillisecondsV310(1n, 1000n);
    const offset = projectNestTicsToMillisecondsV310(9n, 1000n);
    const combined = projectNestWindowEndpointsV310({
      ticsPerMs: 1000n,
      resolutionTics: 1n,
      retainedTics: [1n, 9n, 20n],
      lowerEndpointTics: 10n,
      upperEndpointTics: 20n,
    });
    expect(origin.ok && offset.ok && combined.ok).toBe(true);
    if (!origin.ok || !offset.ok || !combined.ok) return;
    expect(origin.milliseconds + offset.milliseconds).toBe(0.010000000000000002);
    expect(combined.lowerMilliseconds).toBe(0.01);
    expect(combined.lowerMilliseconds).not.toBe(
      origin.milliseconds + offset.milliseconds,
    );
  });

  it('matches a deterministic direct-operation oracle across admitted safe tics', () => {
    let state = 0x9e3779b9;
    const ticsPerMsValues = [1n, 3n, 10n, 1000n, 999_983n] as const;
    for (let index = 0; index < 2000; index++) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      const tics = BigInt(state) * 1_000_003n + BigInt(index);
      const ticsPerMs = ticsPerMsValues[index % ticsPerMsValues.length];
      const expected = Number(tics) * (1 / Number(ticsPerMs));
      const recovered = Math.trunc(expected * Number(ticsPerMs) + 0.5);
      const result = projectNestTicsToMillisecondsV310(tics, ticsPerMs);
      if (Number.isSafeInteger(recovered) && BigInt(recovered) === tics) {
        expect(result).toEqual({ ok: true, milliseconds: expected });
      } else {
        expect(result).toMatchObject({ ok: false, kind: 'source_profile' });
      }
    }
  });
});
