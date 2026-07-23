import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import {
  outputAuthoritySourceProblems,
  summaryTemplatePlaceholders,
} from '../scripts/lib/output-authority-source.js';

type JsonRecord = Record<string, any>;

const root = path.resolve(import.meta.dirname, '..');
const skillDirectory = path.join(root, 'contract/skills');
const metaSchema = JSON.parse(readFileSync(
  path.join(root, 'contract/meta/contract-source.schema.json'),
  'utf8',
));
const validateSource = new Ajv2020({ allErrors: true, strict: true }).compile(metaSchema);

function readStableSkills(): JsonRecord[] {
  return readdirSync(skillDirectory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(path.join(skillDirectory, name), 'utf8')))
    .filter((skill) => skill.status === 'stable');
}

function analogSource(): JsonRecord {
  const source = readStableSkills().find((skill) => skill.id === 'neuro.analog_trace');
  if (!source) throw new Error('living neuro.analog_trace source is missing');
  return structuredClone(source);
}

describe('source-owned OutputAuthority V1', () => {
  it('covers exactly every stable skill with a coherent finite declaration', () => {
    const stable = readStableSkills();
    expect(stable).toHaveLength(19);
    expect(stable.map((skill) => skill.id)).toEqual([...stable.map((skill) => skill.id)].sort());

    for (const skill of stable) {
      expect(validateSource(skill), JSON.stringify(validateSource.errors)).toBe(true);
      expect(outputAuthoritySourceProblems(skill), skill.id).toEqual([]);
      expect(skill.outputAuthority.evaluator.id).toBe(
        `${skill.id}.output_authority.v${skill.revision}`,
      );
      expect(skill.outputAuthority.summary.requiredPlaceholders).toEqual(
        summaryTemplatePlaceholders(skill.accessibility.summaryTemplate),
      );
      expect(skill.outputAuthority.table.carriedValueColumns).toEqual(
        skill.accessibility.tableColumns.map((column: JsonRecord) => column.key),
      );
    }
  });

  it('rejects compiler receipts, row permutation, and source-column drift', () => {
    const receipt = analogSource();
    receipt.outputAuthority.table.rowsTotal = 'compiler_receipt';
    expect(outputAuthoritySourceProblems(receipt).join('\n')).toContain(
      'compiler/self-reported counts are forbidden',
    );

    const multiset = analogSource();
    multiset.outputAuthority.table.comparison = 'canonical_json_multiset';
    expect(outputAuthoritySourceProblems(multiset).join('\n')).toContain(
      'row permutation must not be silently accepted',
    );

    const reordered = analogSource();
    reordered.outputAuthority.table.carriedValueColumns.reverse();
    expect(outputAuthoritySourceProblems(reordered).join('\n')).toContain(
      'must exactly equal accessibility.tableColumns keys in source order',
    );
  });

  it('rejects open selectors and paths outside the declared request schema', () => {
    const wildcard = analogSource();
    wildcard.outputAuthority.requestPaths[0].segments[1] = {
      tag: 'field',
      name: '*',
    };
    expect(validateSource(wildcard)).toBe(false);
    expect(outputAuthoritySourceProblems(wildcard).join('\n')).toContain(
      'literal path is not declared by the closed request schema',
    );

    const undeclared = analogSource();
    undeclared.outputAuthority.requestPaths[0].segments[1].name = 'compilerReceipt';
    expect(outputAuthoritySourceProblems(undeclared).join('\n')).toContain(
      'literal path is not declared by the closed request schema',
    );
  });

  it('requires every source union instance to retain its discriminator', () => {
    const mutations: JsonRecord[] = [];

    const evaluator = analogSource();
    delete evaluator.outputAuthority.evaluator.tag;
    mutations.push(evaluator);

    const pathSegment = analogSource();
    delete pathSegment.outputAuthority.requestPaths[0].segments[0].tag;
    mutations.push(pathSegment);

    const table = analogSource();
    delete table.outputAuthority.table.tag;
    mutations.push(table);

    const geometryClass = analogSource();
    delete geometryClass.outputAuthority.geometry.classes[0].tag;
    mutations.push(geometryClass);

    const witness = analogSource();
    delete witness.outputAuthority.influence.witnesses[0].tag;
    mutations.push(witness);

    const summary = analogSource();
    delete summary.outputAuthority.summary.tag;
    mutations.push(summary);

    const disclosures = analogSource();
    delete disclosures.outputAuthority.disclosures.tag;
    mutations.push(disclosures);

    for (const mutation of mutations) expect(validateSource(mutation)).toBe(false);
  });

  it('refuses malformed or generic summary facts and unreviewed coordinate assurance', () => {
    const malformed = analogSource();
    malformed.accessibility.summaryTemplate += ' {not-valid}';
    expect(outputAuthoritySourceProblems(malformed).join('\n')).toContain(
      'template contains a malformed or unrecognized brace token',
    );

    for (const unsafe of ['\u202e', '\u200b', '\ud800']) {
      const unsafeTemplate = analogSource();
      unsafeTemplate.accessibility.summaryTemplate += unsafe;
      expect(outputAuthoritySourceProblems(unsafeTemplate).join('\n')).toContain(
        'template contains unsafe control, bidi, zero-width, surrogate, or noncharacter text',
      );
    }

    const fallback = analogSource();
    fallback.outputAuthority.summary.missingFactPolicy = 'ellipsis';
    expect(outputAuthoritySourceProblems(fallback).join('\n')).toContain(
      'both missing and unknown facts must fail closed',
    );

    const coordinateClaim = analogSource();
    coordinateClaim.outputAuthority.geometry.classes[0].payloadAssurance =
      'canonical_geometry_exact';
    expect(outputAuthoritySourceProblems(coordinateClaim).join('\n')).toContain(
      'requires a separately reviewed coordinate evaluator',
    );
  });

  it('requires a closed, fully used field vocabulary and a protected-output frame', () => {
    const unused = analogSource();
    unused.outputAuthority.derivationFields.push({
      id: 'receipt.rows',
      valueKind: 'row_sequence',
    });
    expect(outputAuthoritySourceProblems(unused).join('\n')).toContain(
      'unused field "receipt.rows"',
    );

    const overlap = analogSource();
    overlap.outputAuthority.influence.witnesses[0].protected =
      overlap.outputAuthority.influence.witnesses[0].affected;
    expect(outputAuthoritySourceProblems(overlap).join('\n')).toContain(
      'cannot be both affected and protected',
    );

    const wrongEvaluator = analogSource();
    wrongEvaluator.outputAuthority.evaluator.id = 'neuro.analog_trace.compiler_receipt.v1';
    expect(outputAuthoritySourceProblems(wrongEvaluator).join('\n')).toContain(
      'neuro.analog_trace.output_authority.v2',
    );
  });
});
