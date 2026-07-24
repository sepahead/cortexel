import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { numericPolicySourceProblems } from '../scripts/lib/numeric-policy-source.js';

const SOURCE = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../contract/registries/numeric-policies.v1.json'),
    'utf8',
  ),
) as any;

function mutated(change: (value: any) => void): string[] {
  const value = structuredClone(SOURCE);
  change(value);
  return numericPolicySourceProblems(value);
}

function expectProblem(problems: readonly string[], fragment: string): void {
  expect(problems.some((problem) => problem.includes(fragment)), problems.join('\n')).toBe(true);
}

describe('numeric-policy source integrity', () => {
  it('accepts the living closed registry', () => {
    expect(numericPolicySourceProblems(SOURCE)).toEqual([]);
  });

  it('rejects duplicate algorithm ids, policy ids, and conformance-vector names', () => {
    expectProblem(
      mutated((value) => value.algorithms.push(structuredClone(value.algorithms[0]))),
      'duplicate value "cortexel_binary64_nominal_interval_candidates_v1"',
    );
    expectProblem(
      mutated((value) => value.policies.push(structuredClone(value.policies[0]))),
      'duplicate value "cortexel_binary64_uniform_exposure_bins_v1"',
    );
    expectProblem(
      mutated((value) => {
        value.algorithms[0].conformanceVectors[1].name =
          value.algorithms[0].conformanceVectors[0].name;
      }),
      'duplicate conformance-vector name',
    );
  });

  it('rejects unknown algorithms and dangling policy bindings', () => {
    expectProblem(
      mutated((value) => {
        value.algorithms[0].id = 'forged_algorithm';
      }),
      'unimplemented numeric algorithm "forged_algorithm"',
    );
    expectProblem(
      mutated((value) => {
        value.policies[0].algorithm = 'missing_algorithm';
      }),
      'dangling or unsupported binding "missing_algorithm"',
    );
  });

  it('rejects wrong constants and missing failure-class vector coverage', () => {
    expectProblem(
      mutated((value) => {
        value.algorithms[0].constants.quotientToleranceEpsilonMultiplier = 7;
      }),
      'quotientToleranceEpsilonMultiplier: expected 8',
    );
    expectProblem(
      mutated((value) => {
        value.algorithms[0].conformanceVectors =
          value.algorithms[0].conformanceVectors.filter(
            (vector: any) => vector.result.failureClass !== 'invalid_range',
          );
      }),
      'no rejected vector covers failureClass "invalid_range"',
    );
  });

  it('fails closed on unknown, missing, or contradictory structured semantics', () => {
    expectProblem(
      mutated((value) => {
        value.semanticAuthority.id = 'forged_semantic_authority';
      }),
      'semanticAuthority.id: expected "cortexel_numeric_semantics_registry_v1"',
    );
    expectProblem(
      mutated((value) => {
        value.algorithms[0].semantics.id = 'forged_candidate_semantics';
      }),
      'unimplemented algorithm semantic id',
    );
    expectProblem(
      mutated((value) => {
        delete value.policies[0].semantics;
      }),
      'missing [semantics]',
    );
    expectProblem(
      mutated((value) => {
        delete value.algorithms[0].semantics.parameters.internalEdgeRule;
      }),
      'semantics.parameters: object keys are not closed',
    );
    expectProblem(
      mutated((value) => {
        value.algorithms[0].semantics.parameters.unreviewedTolerance = 1;
      }),
      'semantics.parameters: object keys are not closed',
    );
    expectProblem(
      mutated((value) => {
        value.algorithms[0].semantics.parameters.endpointToleranceEpsilonMultiplier = 9;
      }),
      'endpointToleranceEpsilonMultiplier: expected 8',
    );
    expectProblem(
      mutated((value) => {
        value.algorithms[0].constants.endpointToleranceEpsilonMultiplier = 7;
      }),
      'contradicts constants.endpointToleranceEpsilonMultiplier',
    );
    expectProblem(
      mutated((value) => {
        value.policies[0].semantics.id = 'forged_uniform_bin_semantics';
      }),
      'unimplemented policy semantic id',
    );
    expectProblem(
      mutated((value) => {
        value.policies[1].semantics.parameters.coordinateSelection =
          'all_adjacent_emitted_edge_pairs';
      }),
      'coordinateSelection: expected "first_interval_count_emitted_edges_excluding_stop"',
    );
    expectProblem(
      mutated((value) => {
        value.policies[0].boundary = '[start,stop]';
      }),
      'semantics.parameters.boundary: contradicts the policy.boundary compatibility field',
    );
  });

  it('pins explanatory prose so semantic claims cannot drift silently', () => {
    expectProblem(
      mutated((value) => {
        value.description += ' Unreviewed reinterpretation.';
      }),
      'description: pinned explanatory prose changed',
    );
    expectProblem(
      mutated((value) => {
        value.algorithms[0].algorithm[0] = 'Accept every request and emit no edges.';
      }),
      'explanatoryProse: pinned explanatory prose changed',
    );
    expectProblem(
      mutated((value) => {
        value.policies[0].description = 'All bins are uniformly exposed by definition.';
      }),
      'description: pinned explanatory prose changed',
    );
  });

  it('carries the adversarial materialization vectors that distinguish the normative algorithm', () => {
    const vectors = new Map<string, any>(
      SOURCE.algorithms[0].conformanceVectors.map((vector: any) => [vector.name, vector]),
    );
    const exactIndex = vectors.get('exact_index_times_width_not_repeated_addition') as any;
    expect(exactIndex.result.accepted).toBe(true);
    expect(exactIndex.result.intervalCount).toBe(10);
    expect(exactIndex.result.edgeAssertions).toContainEqual({
      index: 6,
      value: 0.6000000000000001,
    });
    expect(exactIndex.result.edgeAssertions).toContainEqual({ index: 8, value: 0.8 });
    expect(vectors.get('late_internal_edge_collapse_across_binary64_spacing_boundary')?.result)
      .toEqual({ accepted: false, failureClass: 'unrepresentable' });
    expect(vectors.get('endpoint_tolerance_just_outside_rejected')?.result)
      .toEqual({ accepted: false, failureClass: 'non_tiling' });
  });

  it('rejects malformed accepted, rejected, and compact-edge results', () => {
    expectProblem(
      mutated((value) => {
        const result = value.algorithms[0].conformanceVectors[0].result;
        delete result.edges;
      }),
      'accepted results must provide exactly one of edges or edgeAssertions',
    );
    expectProblem(
      mutated((value) => {
        const rejected = value.algorithms[0].conformanceVectors.find(
          (vector: any) => vector.result.accepted === false,
        ).result;
        rejected.intervalCount = 1;
      }),
      'object keys are not closed',
    );
    expectProblem(
      mutated((value) => {
        const compact = value.algorithms[0].conformanceVectors.find(
          (vector: any) => Array.isArray(vector.result.edgeAssertions),
        ).result;
        compact.edgeAssertions[1].index = compact.intervalCount + 1;
        compact.edgeAssertions[compact.edgeAssertions.length - 1].index = 0;
      }),
      'expected an edge index within the result',
    );
    expectProblem(
      mutated((value) => {
        const compact = value.algorithms[0].conformanceVectors.find(
          (vector: any) => Array.isArray(vector.result.edgeAssertions),
        ).result;
        compact.edgeAssertions[1].index = compact.edgeAssertions[0].index;
      }),
      'duplicate asserted edge index',
    );
    expectProblem(
      mutated((value) => {
        const compact = value.algorithms[0].conformanceVectors.find(
          (vector: any) => Array.isArray(vector.result.edgeAssertions),
        ).result;
        compact.edgeAssertions = compact.edgeAssertions.filter(
          (assertion: any) => assertion.index !== compact.intervalCount,
        );
      }),
      'must assert the first and final edge',
    );
  });

  it('rejects unknown fields at every registry declaration boundary', () => {
    for (const change of [
      (value: any) => { value.unknown = true; },
      (value: any) => { value.semanticAuthority.unknown = true; },
      (value: any) => { value.algorithms[0].unknown = true; },
      (value: any) => { value.algorithms[0].semantics.unknown = true; },
      (value: any) => { value.algorithms[0].semantics.parameters.unknown = true; },
      (value: any) => { value.algorithms[0].conformanceVectors[0].unknown = true; },
      (value: any) => { value.algorithms[0].conformanceVectors[0].result.unknown = true; },
      (value: any) => { value.policies[0].unknown = true; },
      (value: any) => { value.policies[0].semantics.unknown = true; },
      (value: any) => { value.policies[0].semantics.parameters.unknown = true; },
    ]) {
      expectProblem(mutated(change), 'object keys are not closed');
    }
  });

  it('rejects malformed policy semantics even when the id is recognized', () => {
    expectProblem(
      mutated((value) => {
        value.policies[0].boundary = '[start,stop]';
      }),
      'boundary: expected "[start,stop)"',
    );
    expectProblem(
      mutated((value) => {
        value.policies[1].resultNoun = 'bin';
      }),
      'resultNoun: expected "sample step"',
    );
    expectProblem(
      mutated((value) => {
        value.policies[0].intervalExposure =
          'emitted_coordinates_authoritative_no_equal_exposure_claim';
      }),
      'intervalExposure: expected "require_every_exact_physical_endpoint_difference_to_equal_original_typed_width"',
    );
  });
});
