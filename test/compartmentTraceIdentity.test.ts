import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { compartmentTraceSeriesIdentityDeclared } from '../src/core/semantics/compartment-trace.js';
import { SEMANTIC_VALIDATORS } from '../src/core/semantics/index.js';

const source = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/skills/neuro.compartment_trace.v1.json'),
  'utf8',
)) as {
  examples: { valid: Record<string, any>[] };
  semanticValidators: { id: string }[];
};

function example(index = 0): Record<string, any> {
  return structuredClone(source.examples.valid[index]);
}

function errors(request: Record<string, any>) {
  return compartmentTraceSeriesIdentityDeclared({
    request,
    skillId: 'neuro.compartment_trace',
  });
}

describe('compartment-trace scientific identity boundary', () => {
  it('is a named contract validator and accepts every living valid vector', () => {
    expect(source.semanticValidators.map(({ id }) => id))
      .toContain('compartment_trace.series_identity_declared');
    expect(SEMANTIC_VALIDATORS['compartment_trace.series_identity_declared'])
      .toBe(compartmentTraceSeriesIdentityDeclared);

    for (const [index, request] of source.examples.valid.entries()) {
      expect(errors(request), `valid[${index}]`).toEqual([]);
    }
  });

  it('rejects a series whose compartment is outside the declared universe', () => {
    const request = example();
    request.data.series[0].compartmentId = 'foreign_compartment';

    expect(errors(request)).toEqual([
      expect.objectContaining({
        code: 'SEMANTIC_UNKNOWN_REFERENCE',
        stage: 'semantic',
        instancePath: '/data/series/0/compartmentId',
        validatorId: 'compartment_trace.series_identity_declared',
      }),
    ]);
  });

  it('rejects an exact duplicate (compartmentId, signalId) tuple', () => {
    const request = example();
    request.data.series = [
      request.data.series[0],
      structuredClone(request.data.series[0]),
    ];

    expect(errors(request)).toEqual([
      expect.objectContaining({
        code: 'SEMANTIC_DUPLICATE_ID',
        stage: 'semantic',
        instancePath: '/data/series/1/signalId',
        validatorId: 'compartment_trace.series_identity_declared',
      }),
    ]);
  });

  it('keeps tuple identity structural when permitted delimiters collide', () => {
    const request = example();
    request.data.compartmentIds = ['a:b', 'a'];
    request.data.series = [
      {
        ...structuredClone(request.data.series[0]),
        compartmentId: 'a:b',
        signalId: 'c',
      },
      {
        ...structuredClone(request.data.series[0]),
        compartmentId: 'a',
        signalId: 'b:c',
      },
    ];

    // Both naïve `${compartmentId}:${signalId}` keys equal "a:b:c".
    expect(errors(request)).toEqual([]);
  });

  it('refuses ignored weight carriers when uniform aggregate weighting is declared', () => {
    const uniform = example(1);
    uniform.parameters.compartmentAggregate.weighting = 'uniform';
    delete uniform.parameters.compartmentAggregate.weights;
    delete uniform.parameters.compartmentAggregate.weightBasis;
    expect(validateRequestValue(uniform).ok).toBe(true);

    const withWeights = structuredClone(uniform);
    withWeights.parameters.compartmentAggregate.weights = [1, 1];
    expect(validateRequestValue(withWeights).ok).toBe(false);

    const withBasis = structuredClone(uniform);
    withBasis.parameters.compartmentAggregate.weightBasis = 'surface_area';
    expect(validateRequestValue(withBasis).ok).toBe(false);
  });
});
