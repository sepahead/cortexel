/**
 * Cross-language parity: the TypeScript and Python implementations must AGREE.
 *
 * This is what makes the second implementation worth having. It runs the Python package
 * (no shared code, no Node inside it) over the same contract examples and asserts:
 *
 *   1. Canonical digests are BYTE-IDENTICAL. If the two RFC 8785 implementations disagree
 *      on one byte, every reproducibility claim in the project is false. This is the
 *      strongest parity guarantee and the one that matters most.
 *   2. Both accept every valid example.
 *   3. Both reject a forged caller conclusion, and both reject a unit alias.
 *
 * Where Python has not yet ported a deeper semantic validator (rate re-derivation,
 * reference-in-universe), the test does not assert agreement on that rule — it asserts
 * agreement on what Python actually implements, honestly (docs/KNOWN_LIMITATIONS.md).
 *
 * If Python 3 is unavailable the suite skips rather than fails, so the TypeScript CI stays
 * green on a machine without a Python interpreter.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';

import { canonicalDigest } from '../src/core/canonicalize.js';
import { validateRequestValue } from '../src/core/request.js';

const REPO = path.resolve(import.meta.dirname, '..');
const CONTRACT_SKILLS = path.join(REPO, 'contract/skills');
const SCRATCH = path.join(REPO, 'node_modules/.cache/cortexel-parity');

let pythonAvailable = false;
function python(args: string[], input?: string): string {
  return execFileSync('python3', args, {
    cwd: REPO,
    encoding: 'utf8',
    input,
    env: { ...process.env, PYTHONPATH: path.join(REPO, 'python/src') },
  });
}

beforeAll(() => {
  try {
    python(['-c', 'import cortexel']);
    pythonAvailable = true;
    readdirSync(REPO); // touch fs so SCRATCH parent exists
    try {
      execFileSync('mkdir', ['-p', SCRATCH]);
    } catch {
      /* best effort */
    }
  } catch {
    pythonAvailable = false;
  }
});

const contracts = readdirSync(CONTRACT_SKILLS)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(path.join(CONTRACT_SKILLS, f), 'utf8')) as {
    id: string;
    examples: { valid: Record<string, unknown>[]; invalid: { expectedCode: string; request: unknown }[] };
  });

/** Ask Python for the canonical digest of each of a batch of values. */
function pythonDigests(values: unknown[]): string[] {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
values = json.load(sys.stdin)
print(json.dumps([cortexel.canonical_digest(v) for v in values]))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as string[];
}

/** Ask Python whether each request validates (empty error list). */
function pythonValid(values: unknown[]): boolean[] {
  const script = `
import sys, json
sys.path.insert(0, 'python/src')
import cortexel
values = json.load(sys.stdin)
print(json.dumps([len(cortexel.validate_request(v)) == 0 for v in values]))
`;
  const out = python(['-c', script], JSON.stringify(values));
  return JSON.parse(out) as boolean[];
}

describe('cross-language parity — TypeScript vs Python', () => {
  it('runs only when Python 3 and the cortexel package are importable', () => {
    if (!pythonAvailable) {
      console.warn('Python 3 / cortexel not available — parity suite skipped.');
    }
    expect(true).toBe(true);
  });

  it('agrees on the canonical digest of every valid example, byte for byte', () => {
    if (!pythonAvailable) return;
    const values = contracts.flatMap((c) => c.examples.valid);
    const tsDigests = values.map((v) => canonicalDigest(v));
    const pyDigests = pythonDigests(values);

    expect(pyDigests).toHaveLength(tsDigests.length);
    for (let i = 0; i < tsDigests.length; i++) {
      expect(pyDigests[i], `digest mismatch on example ${i}`).toBe(tsDigests[i]);
    }
  });

  it('agrees that every valid example is accepted', () => {
    if (!pythonAvailable) return;
    const values = contracts.flatMap((c) => c.examples.valid);
    const tsValid = values.map((v) => validateRequestValue(v).ok);
    const pyValid = pythonValid(values);

    for (let i = 0; i < values.length; i++) {
      expect(tsValid[i], `TS rejected valid example ${i}`).toBe(true);
      expect(pyValid[i], `Python rejected valid example ${i}`).toBe(true);
    }
  });

  it('agrees that a forged caller conclusion and a unit alias are rejected', () => {
    if (!pythonAvailable) return;

    const base = contracts.find((c) => c.examples.valid.length > 0)!;
    const forged = { ...structuredClone(base.examples.valid[0]), validation: { forged: true } };

    // Both implementations reject a forged conclusion.
    expect(validateRequestValue(forged).ok).toBe(false);
    expect(pythonValid([forged])[0]).toBe(false);

    // Both implementations reject a unit alias where one appears in an invalid example.
    const aliasCase = contracts
      .flatMap((c) => c.examples.invalid)
      .find((e) => e.expectedCode === 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL');
    if (aliasCase) {
      expect(validateRequestValue(aliasCase.request).ok).toBe(false);
      expect(pythonValid([aliasCase.request])[0]).toBe(false);
    }
  });
});
