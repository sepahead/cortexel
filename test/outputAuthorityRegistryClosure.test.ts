import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  OUTPUT_AUTHORITY_EVALUATOR_IDS_V1,
  outputAuthorityEvaluatorRegistryProblemsV1,
  resolveOutputAuthorityEvaluatorV1,
} from '../src/authority/evaluators/registry.js';
import {
  OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1,
  outputAuthorityImplementationInventoryProblemsV1,
} from '../src/authority/evaluators/implementation-ids.js';
import { checkFiniteInfluenceWitnessesV1 } from '../src/core/output-authority.js';
import type { JsonValue } from '../src/core/parse-json.js';
import { isValidatedRequest, validateRequestValue } from '../src/core/request.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const SKILL_DIRECTORY = path.join(ROOT, 'contract/skills');

function stableSkillSources(): JsonRecord[] {
  return readdirSync(SKILL_DIRECTORY)
    .filter((filename) => filename.endsWith('.json'))
    .sort()
    .map((filename) => JSON.parse(readFileSync(path.join(SKILL_DIRECTORY, filename), 'utf8')))
    .filter((source) => source.status === 'stable')
    .sort((left, right) => String(left.id) < String(right.id) ? -1 : String(left.id) > String(right.id) ? 1 : 0);
}

describe('closed living OutputAuthority evaluator registry', () => {
  it('keeps the frozen implementation inventory sorted, safe, and exactly registered', () => {
    expect(Object.isFrozen(OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1)).toBe(true);
    expect(outputAuthorityImplementationInventoryProblemsV1(
      OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1,
    )).toEqual([]);
    expect(OUTPUT_AUTHORITY_EVALUATOR_IDS_V1).toEqual(
      OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1,
    );
  });

  it('refuses missing, extra, duplicate, malformed, and dangerous registry identities', () => {
    const living = OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1.map((id) => ({ id }));
    expect(outputAuthorityEvaluatorRegistryProblemsV1(living)).toEqual([]);
    expect(outputAuthorityEvaluatorRegistryProblemsV1(living.slice(1)).join('\n'))
      .toContain(`missing registered evaluator ${JSON.stringify(living[0].id)}`);
    expect(outputAuthorityEvaluatorRegistryProblemsV1([...living, { id: 'extra.output_authority.v2' }]).join('\n'))
      .toContain('extra registered evaluator');
    expect(outputAuthorityEvaluatorRegistryProblemsV1([...living, living[0]]).join('\n'))
      .toContain('duplicate implementation id');
    // `constructor` and `prototype` satisfy the lexical identifier pattern, so these
    // cases exercise the explicit dangerous-map-key guard rather than passing only
    // because punctuation in `__proto__` happens to fail the pattern first.
    for (const dangerous of ['__proto__', 'constructor', 'prototype']) {
      expect(outputAuthorityEvaluatorRegistryProblemsV1([...living, { id: dangerous }]).join('\n'))
        .toContain('not a safe closed identifier');
    }
    for (const malformed of ['Network.safe', 'network.safe.\u0430', 'network.safe.\u202e']) {
      expect(outputAuthorityEvaluatorRegistryProblemsV1([...living, { id: malformed }]).join('\n'))
        .toContain('not a safe closed identifier');
    }
    expect(outputAuthorityEvaluatorRegistryProblemsV1([...living, { id: 7 }]).join('\n'))
      .toContain('is not a string');

    const reversedInventory = [...OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1].reverse();
    expect(outputAuthorityEvaluatorRegistryProblemsV1(living, reversedInventory).join('\n'))
      .toContain('not strictly ascending');
    expect(outputAuthorityEvaluatorRegistryProblemsV1(
      living,
      [...OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1, OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1[0]],
    ).join('\n')).toContain('duplicate implementation id');
  });

  it('equals the exact source-declared evaluator set for all 19 stable skills', () => {
    const stable = stableSkillSources();
    expect(stable).toHaveLength(19);

    const stableSkillIds = stable.map((source) => String(source.id));
    expect(new Set(stableSkillIds).size).toBe(stableSkillIds.length);

    const sourceEvaluatorIds = stable
      .map((source) => String(source.outputAuthority.evaluator.id))
      .sort();
    expect(new Set(sourceEvaluatorIds).size).toBe(sourceEvaluatorIds.length);
    expect(OUTPUT_AUTHORITY_EVALUATOR_IDS_V1).toEqual(sourceEvaluatorIds);

    for (const source of stable) {
      const declaredId = String(source.outputAuthority.evaluator.id);
      const evaluator = resolveOutputAuthorityEvaluatorV1(declaredId);
      expect(evaluator, `${source.id} has no registered evaluator`).not.toBeNull();
      expect(evaluator?.id).toBe(declaredId);
    }

    // Equality above is bidirectional: it proves both total source coverage and the
    // absence of an undeclared evaluator that could silently acquire output authority.
    for (const registeredId of OUTPUT_AUTHORITY_EVALUATOR_IDS_V1) {
      expect(sourceEvaluatorIds).toContain(registeredId);
    }
  });

  it('validates, canonicalizes, and independently checks every declared finite witness', () => {
    for (const source of stableSkillSources()) {
      const authority = source.outputAuthority;
      const evaluator = resolveOutputAuthorityEvaluatorV1(authority.evaluator.id);
      expect(evaluator, `${source.id} has no registered evaluator`).not.toBeNull();
      if (!evaluator) continue;

      let gateCalls = 0;
      let acceptedCanonicalRequests = 0;
      const result = checkFiniteInfluenceWitnessesV1(
        authority,
        source.examples.valid,
        (candidate) => {
          gateCalls++;
          const validated = validateRequestValue(candidate);
          if (!validated.ok) {
            return {
              tag: 'rejected',
              reasons: validated.errors.map(
                (error) => `${error.code}${error.instancePath ? `:${error.instancePath}` : ''}`,
              ),
            };
          }
          expect(isValidatedRequest(validated.request)).toBe(true);
          expect(Object.isFrozen(validated.request)).toBe(true);
          expect(Object.isFrozen(validated.request.canonicalRequest)).toBe(true);
          acceptedCanonicalRequests++;
          return {
            tag: 'accepted',
            canonicalRequest: validated.request.canonicalRequest as JsonValue,
          };
        },
        evaluator,
      );

      const witnessIds = authority.influence.witnesses.map(
        (witness: JsonRecord) => String(witness.id),
      );
      expect(gateCalls, `${source.id} did not gate both sides of every witness`)
        .toBe(witnessIds.length * 2);
      expect(acceptedCanonicalRequests, `${source.id} has a witness outside the live request contract`)
        .toBe(witnessIds.length * 2);
      expect(result, source.id).toEqual({
        tag: 'valid',
        checkedWitnessIds: witnessIds,
      });
    }
  });

  it('keeps every living evaluator fact map free of library-environment authority', () => {
    for (const source of stableSkillSources()) {
      const authority = source.outputAuthority;
      const evaluator = resolveOutputAuthorityEvaluatorV1(authority.evaluator.id);
      expect(evaluator, `${source.id} has no registered evaluator`).not.toBeNull();
      if (!evaluator) continue;
      for (const [exampleIndex, example] of source.examples.valid.entries()) {
        const validated = validateRequestValue(structuredClone(example));
        expect(validated.ok, `${source.id} example ${exampleIndex} is not live`).toBe(true);
        if (!validated.ok) continue;
        const evaluation = evaluator.evaluateCanonicalRequest(
          validated.request.canonicalRequest as JsonValue,
        );
        const disclosureValue = evaluation.fields[authority.disclosures.expectedFacts.field];
        expect(disclosureValue?.tag, `${source.id} example ${exampleIndex}`).toBe(
          'disclosure_fact_map',
        );
        if (disclosureValue?.tag !== 'disclosure_fact_map') continue;
        expect(disclosureValue.facts, `${source.id} example ${exampleIndex}`)
          .not.toHaveProperty('budgetProfileId');
        expect(disclosureValue.facts, `${source.id} example ${exampleIndex}`)
          .not.toHaveProperty('nonStandardBudgetProfile');
      }
    }
  });
});
