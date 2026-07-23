import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CANONICALIZATION_SOURCE_LIMITS,
  canonicalizationEntryDigest,
  canonicalizationReferences,
  canonicalizationSourceProblems,
} from '../scripts/lib/canonicalization-source.js';

const source = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/registries/canonicalizations.v1.json'),
  'utf8',
)) as Record<string, any>;
const commonSchema = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/schemas/common.v1.schema.json'),
  'utf8',
)) as Record<string, any>;
const registryMetaSchema = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/meta/canonicalization-registry.schema.json'),
  'utf8',
)) as Record<string, any>;

describe('canonicalization registry source', () => {
  it('executes every normative conformance vector', () => {
    expect(canonicalizationSourceProblems(source)).toEqual([]);
    expect(canonicalizationEntryDigest(source.algorithms[0])).toMatch(
      /^sha256:[0-9a-f]{64}$/u,
    );
  });

  it('fails closed when a vector, ordering result, or digest drifts', () => {
    const wrongDigest = structuredClone(source);
    wrongDigest.algorithms[0].conformanceVectors[0].digest = `sha256:${'0'.repeat(64)}`;
    expect(canonicalizationSourceProblems(wrongDigest).join('\n')).toContain('.digest:');

    const wrongOrder = structuredClone(source);
    wrongOrder.algorithms[0].conformanceVectors[2].normalizedInput.reverse();
    expect(canonicalizationSourceProblems(wrongOrder).join('\n')).toContain('.normalizedInput:');

    const weakenedRejection = structuredClone(source);
    const duplicateVector = weakenedRejection.algorithms[0].conformanceVectors.find(
      (vector: any) => vector.name === 'duplicate_identifier_rejected',
    );
    duplicateVector.input = ['n1', 'n2'];
    expect(canonicalizationSourceProblems(weakenedRejection).join('\n')).toContain(
      'expected rejection',
    );
  });

  it('requires one acceptance vector and one rejection vector per failure class', () => {
    const missingFailure = structuredClone(source);
    missingFailure.algorithms[0].conformanceVectors =
      missingFailure.algorithms[0].conformanceVectors.filter(
        (vector: any) => vector.failureClass !== 'not_array',
      );
    expect(canonicalizationSourceProblems(missingFailure).join('\n')).toContain(
      'missing rejection vector for not_array',
    );

    const noAcceptance = structuredClone(source);
    noAcceptance.algorithms[0].conformanceVectors =
      noAcceptance.algorithms[0].conformanceVectors.filter(
        (vector: any) => vector.outcome !== 'accept',
      );
    expect(canonicalizationSourceProblems(noAcceptance).join('\n')).toContain(
      'at least one acceptance vector is required',
    );
  });

  it('bounds vector materialization before decoding hostile UTF-16 arrays', () => {
    const oversizedCodeUnits = structuredClone(source);
    const surrogateVector = oversizedCodeUnits.algorithms[0].conformanceVectors.find(
      (vector: any) => vector.inputEncoding === 'utf16_code_units',
    );
    // Large enough to trigger an argument-count RangeError in the former
    // String.fromCharCode(...member) implementation.
    surrogateVector.inputCodeUnits = [new Array(200_000).fill(65)];
    expect(() => canonicalizationSourceProblems(oversizedCodeUnits)).not.toThrow();
    expect(canonicalizationSourceProblems(oversizedCodeUnits).join('\n')).toContain(
      `exceeds ${CANONICALIZATION_SOURCE_LIMITS.identifierUtf16CodeUnits} UTF-16 code units`,
    );

    const tooManyIdentifiers = structuredClone(source);
    tooManyIdentifiers.algorithms[0].conformanceVectors[0].input = new Array(
      CANONICALIZATION_SOURCE_LIMITS.identifiersPerVector + 1,
    ).fill('cell');
    expect(canonicalizationSourceProblems(tooManyIdentifiers).join('\n')).toContain(
      `exceeds ${CANONICALIZATION_SOURCE_LIMITS.identifiersPerVector} identifiers`,
    );

    const tooManyVectors = structuredClone(source);
    tooManyVectors.algorithms[0].conformanceVectors = new Array(
      CANONICALIZATION_SOURCE_LIMITS.conformanceVectors + 1,
    ).fill(source.algorithms[0].conformanceVectors[0]);
    expect(canonicalizationSourceProblems(tooManyVectors).join('\n')).toContain(
      `exceeds ${CANONICALIZATION_SOURCE_LIMITS.conformanceVectors} vectors`,
    );
  });

  it('keeps executable canonicalization limits mirrored in the meta-schema', () => {
    const defs = registryMetaSchema.$defs;
    expect(defs.algorithm.properties.conformanceVectors.maxItems).toBe(
      CANONICALIZATION_SOURCE_LIMITS.conformanceVectors,
    );
    expect(defs.stringArray.maxItems).toBe(
      CANONICALIZATION_SOURCE_LIMITS.identifiersPerVector,
    );
    expect(defs.stringArray.items.maxLength).toBe(
      CANONICALIZATION_SOURCE_LIMITS.identifierUtf16CodeUnits,
    );
    const utf16Vector = defs.vector.oneOf.find(
      (branch: any) => branch.properties.inputEncoding.const === 'utf16_code_units',
    );
    expect(utf16Vector.properties.inputCodeUnits.maxItems).toBe(
      CANONICALIZATION_SOURCE_LIMITS.identifiersPerVector,
    );
    expect(utf16Vector.properties.inputCodeUnits.items.maxItems).toBe(
      CANONICALIZATION_SOURCE_LIMITS.identifierUtf16CodeUnits,
    );
  });

  it('finds canonicalization declarations in the shared common schema', () => {
    expect(canonicalizationReferences(commonSchema)).toEqual([
      'cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1',
    ]);
  });

  it('binds every contract meta-schema into the generated normative source set', () => {
    const manifest = JSON.parse(readFileSync(
      path.resolve(import.meta.dirname, '../contract/manifest.v1.json'),
      'utf8',
    )) as { normativeSources: { path: string }[] };
    const actual = manifest.normativeSources
      .map((entry) => entry.path)
      .filter((name) => name.startsWith('contract/meta/'));
    const expected = readdirSync(path.resolve(import.meta.dirname, '../contract/meta'))
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => `contract/meta/${name}`);
    expect(actual).toEqual(expected);
  });

  it('binds the exact registry entry, including vectors, into its digest', () => {
    const changed = structuredClone(source.algorithms[0]);
    const before = canonicalizationEntryDigest(source.algorithms[0]);
    changed.conformanceVectors[0].name = 'renamed_vector';
    expect(canonicalizationEntryDigest(changed)).not.toBe(before);
  });
});
