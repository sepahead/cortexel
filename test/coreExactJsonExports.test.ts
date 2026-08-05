import { describe, expect, it } from 'vitest';

import { canonicalDigest, getBudgetLimits, snapshotValue } from '../core/index.js';

describe('browser-safe core exact-JSON exports', () => {
  it('captures one detached JSON value and computes its canonical identity', () => {
    const source = { graph: 'browser-bundle', revision: 1 };
    const captured = snapshotValue(source, getBudgetLimits('standard'));

    expect(captured.ok).toBe(true);
    if (!captured.ok) return;

    expect(captured.value).not.toBe(source);
    expect(canonicalDigest(captured.value)).toBe(
      'sha256:52d2a175a904e285e942a2a9c79cf4543c8ee1618c122335034c5e77ee99e18e',
    );
  });

  it('does not turn an accessor into JSON or execute its getter', () => {
    let getterCalls = 0;
    const source = Object.defineProperty({}, 'graph', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'not data';
      },
    });

    const captured = snapshotValue(source, getBudgetLimits('standard'));

    expect(captured.ok).toBe(false);
    expect(getterCalls).toBe(0);
  });
});
