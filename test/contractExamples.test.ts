/**
 * The contract's examples are LIVING FIXTURES.
 *
 * Every skill contract carries valid and invalid examples. This suite executes them
 * against the real pipeline, so:
 *
 *   - a valid example that does not validate is a broken contract, not a broken test;
 *   - an invalid example that does not produce the code it CLAIMS means the rule it
 *     documents is not the rule that runs.
 *
 * That second one is the point. A contract can say "a rank-local snapshot cannot
 * claim a global out-degree" and be completely wrong about whether anything enforces
 * it. Executing the nearest-misuse vector for every rule is what turns the prose
 * into a guarantee — and it is why the examples cannot rot.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { SKILL_CATALOG, STABLE_SKILL_IDS } from '../src/generated/catalog.js';

const CONTRACT_SKILLS = path.resolve(import.meta.dirname, '../contract/skills');

interface InvalidExample {
  why: string;
  expectedCode: string;
  request: Record<string, unknown>;
}

interface SkillContract {
  id: string;
  status: string;
  releaseReady: boolean;
  evidence: { handVectors: boolean; externalOracle: { status?: string } | null };
  examples: { valid: Record<string, unknown>[]; invalid: InvalidExample[] };
}

const contracts: SkillContract[] = readdirSync(CONTRACT_SKILLS)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => JSON.parse(readFileSync(path.join(CONTRACT_SKILLS, file), 'utf8')) as SkillContract);

describe('the stable catalog', () => {
  it('contains exactly the 19 approved contracts plus the bundle artifact kind', () => {
    expect(STABLE_SKILL_IDS).toHaveLength(19);
  });

  it('has a contract file for every stable catalog entry', () => {
    const files = new Set(contracts.map((contract) => contract.id));
    for (const id of STABLE_SKILL_IDS) {
      expect(files.has(id), `${id} has no contract/skills/ file`).toBe(true);
    }
  });

  it('never claims an external oracle passed, because none has been run', () => {
    // The single most important honesty invariant in the repository. No pinned
    // reference environment (NEST, Elephant) has been executed here, so no contract
    // may claim its output was independently confirmed.
    for (const contract of contracts) {
      const oracle = contract.evidence.externalOracle;
      if (oracle && typeof oracle.status === 'string') {
        expect(oracle.status, `${contract.id} claims its external oracle passed`).not.toBe(
          'passed',
        );
      }
    }
  });

  it('requires hand-computable vectors for every stable contract', () => {
    // Two libraries can share a convention error. Arithmetic you can do on paper cannot.
    for (const contract of contracts) {
      if (contract.status !== 'stable') continue;
      expect(contract.evidence.handVectors, `${contract.id} has no hand vectors`).toBe(true);
    }
  });

  it('does not mark any contract release-ready while its evidence is incomplete', () => {
    for (const contract of contracts) {
      expect(contract.releaseReady, `${contract.id} claims release readiness`).toBe(false);
    }
  });
});

describe.each(contracts.map((contract) => [contract.id, contract] as const))(
  'contract %s',
  (id, contract) => {
    it('is registered in the generated catalog', () => {
      expect(SKILL_CATALOG[id]).toBeDefined();
    });

    describe('valid examples', () => {
      contract.examples.valid.forEach((request, index) => {
        it(`valid[${index}] passes the full pipeline`, () => {
          const outcome = validateRequestValue(request);

          if (!outcome.ok) {
            // Print the real diagnostics — a bare "expected true" here would send
            // someone hunting through a 400-line contract for the wrong field.
            const detail = outcome.errors
              .map((error) => `    ${error.code} at ${error.instancePath || '(root)'}: ${error.message}`)
              .join('\n');
            throw new Error(`${id} valid[${index}] was REJECTED:\n${detail}`);
          }

          expect(outcome.request.skillId).toBe(id);
          expect(outcome.request.requestDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
        });
      });
    });

    describe('invalid examples', () => {
      contract.examples.invalid.forEach((example, index) => {
        it(`invalid[${index}] fails with ${example.expectedCode} — ${example.why.slice(0, 70)}`, () => {
          const outcome = validateRequestValue(example.request);

          expect(
            outcome.ok,
            `${id} invalid[${index}] was ACCEPTED, but the contract says it must fail with ${example.expectedCode}. The documented rule is not the rule that runs.`,
          ).toBe(false);

          if (outcome.ok) return;

          const codes = outcome.errors.map((error) => error.code);
          expect(
            codes,
            `${id} invalid[${index}] expected ${example.expectedCode} but got: ${codes.join(', ')}`,
          ).toContain(example.expectedCode);
        });
      });
    });
  },
);

describe('the authority boundary', () => {
  // The rule the whole contract is built on, checked against every skill rather than
  // once: a caller declares what its data IS, never what Cortexel concluded about it.
  const LIBRARY_AUTHORED = [
    'validation',
    'disclosures',
    'artifactDigest',
    'accessibility',
    'inputAssurance',
    'calibrated_posterior',
  ];

  it.each(LIBRARY_AUTHORED)('rejects a caller-authored "%s"', (field) => {
    const base = contracts.find((contract) => contract.examples.valid.length > 0);
    expect(base).toBeDefined();

    const forged = { ...structuredClone(base!.examples.valid[0]), [field]: { forged: true } };
    const outcome = validateRequestValue(forged);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;

    expect(outcome.errors.map((error) => error.code)).toContain(
      'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN',
    );
  });

  it('rejects a legacy skill id rather than silently aliasing it', () => {
    const base = contracts.find((contract) => contract.examples.valid.length > 0)!;
    const legacy = structuredClone(base.examples.valid[0]);
    (legacy.skill as Record<string, unknown>).id = 'nest.voltage_trace';

    const outcome = validateRequestValue(legacy);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;

    expect(outcome.errors.map((error) => error.code)).toContain('MIGRATION_LEGACY_ID_NOT_ACCEPTED');
  });

  it('reports the weaker duplicate-key assurance for a materialized value', () => {
    const base = contracts.find((contract) => contract.examples.valid.length > 0)!;
    const outcome = validateRequestValue(structuredClone(base.examples.valid[0]));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // The honest answer: after JSON.parse, a duplicate member has already won.
    expect(outcome.request.inputAssurance.duplicateKeys).toBe(
      'not_observable_after_materialization',
    );
  });
});
