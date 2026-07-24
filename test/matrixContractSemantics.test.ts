import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  topologyMatrixContract,
  topologyNodeUniverseDeclared,
} from '../src/core/semantics/topology.js';

const root = path.resolve(import.meta.dirname, '..');
const readContract = (id: 'adjacency' | 'weight' | 'delay') => JSON.parse(readFileSync(
  path.join(root, `contract/skills/network.${id}_matrix.v1.json`),
  'utf8',
));
const request = (id: 'adjacency' | 'weight' | 'delay', index = 0) =>
  structuredClone(readContract(id).examples.valid[index]);
const errors = (value: Record<string, unknown>) => topologyMatrixContract({
  request: value,
  skillId: (value.skill as { id: string }).id,
});

describe('stable matrix semantic contract', () => {
  it('registers and invokes one matrix-law owner in all three source contracts', () => {
    for (const id of ['adjacency', 'weight', 'delay'] as const) {
      const contract = readContract(id);
      expect(contract.renderer.axisOrder).toBe('target_rows_source_columns');
      expect(contract.semanticValidators.map((entry: { id: string }) => entry.id))
        .toContain('topology.matrix_contract');
      expect(contract.requestSchema.data.properties.nodeUniverse.allOf[1].properties.order.const)
        .toBe('as_declared');
      expect(contract.requestSchema.data.properties.nodeUniverse.allOf[1].properties.complete)
        .toBeUndefined();
      expect(contract.requestSchema.data.properties.nodeUniverse.allOf[1].not.required)
        .toEqual(['groups']);
      expect(contract.semanticValidators.map((entry: { id: string }) => entry.id))
        .toContain('topology.node_universe_declared');
    }
  });

  it('routes an incomplete matrix universe to the semantic owner in all three contracts', () => {
    for (const id of ['adjacency', 'weight', 'delay'] as const) {
      const incomplete = request(id);
      incomplete.data.nodeUniverse.complete = false;
      expect(topologyNodeUniverseDeclared({
        request: incomplete,
        skillId: incomplete.skill.id,
      }).map((error) => error.code)).toContain('SCOPE_NODE_UNIVERSE_REQUIRED');
    }
  });

  it('accepts the rank-local weight and delay living vectors with exact owned targets', () => {
    expect(errors(request('weight', 1))).toEqual([]);
    expect(errors(request('delay', 1))).toEqual([]);
  });

  it('requires one local-target authority and rejects missing, foreign, and contradictory targets', () => {
    const missing = request('weight', 1);
    delete missing.data.observedTargetIds;
    expect(errors(missing).map((error) => error.code)).toContain('SCOPE_INCOMPATIBLE_WITH_SKILL');

    const foreign = request('weight', 1);
    foreign.data.observedTargetIds.push('outside');
    expect(errors(foreign).map((error) => error.code)).toContain('SEMANTIC_UNKNOWN_REFERENCE');

    const contradiction = request('weight', 1);
    contradiction.data.observedTargetIds = ['t11'];
    expect(errors(contradiction).map((error) => error.code)).toContain('SCOPE_MERGE_CONFLICT');

    const secondAuthority = request('weight', 0);
    secondAuthority.data.observedTargetIds = ['t1'];
    expect(errors(secondAuthority).map((error) => error.code)).toContain('SCOPE_MERGE_CONFLICT');
  });

  it('accepts zero owned targets with zero connections and rejects one contradictory connection', () => {
    const empty = request('adjacency', 1);
    empty.data.nodeUniverse.ids = ['a', 'b'];
    empty.data.connections.sourceIds = [];
    empty.data.connections.targetIds = [];
    empty.data.connections.edgeIds = [];
    empty.data.connections.synapseModels = [];
    empty.data.observedTargetIds = [];
    expect(errors(empty)).toEqual([]);

    empty.data.connections.sourceIds = ['a'];
    empty.data.connections.targetIds = ['b'];
    empty.data.connections.edgeIds = ['e'];
    empty.data.connections.synapseModels = ['m'];
    expect(errors(empty).map((error) => error.code)).toContain('SCOPE_MERGE_CONFLICT');
  });

  it('checks sample conservation and permits only binary adjacency presence', () => {
    const sampled = request('adjacency', 3);
    sampled.data.scope = {
      kind: 'sampled',
      parentScope: 'single_process',
      method: 'declared_subset',
      sourceConnectionCount: 4,
      retainedConnectionCount: sampled.data.connections.sourceIds.length,
      snapshotTime: { kind: 'time', unit: 'ms', value: 0 },
    };
    sampled.parameters.cellMode = 'binary_presence';
    sampled.parameters.multapseAggregation = 'sum';
    expect(errors(sampled)).toEqual([]);

    const sampledNoAggregation = structuredClone(sampled);
    sampledNoAggregation.parameters.multapseAggregation = 'no_aggregation';
    expect(errors(sampledNoAggregation).map((error) => error.code))
      .toContain('SCOPE_INCOMPATIBLE_WITH_SKILL');

    const wrongCount = structuredClone(sampled);
    wrongCount.data.scope.retainedConnectionCount--;
    expect(errors(wrongCount).map((error) => error.code)).toContain('SCOPE_MERGE_CONFLICT');

    const multiplicity = structuredClone(sampled);
    multiplicity.parameters.cellMode = 'multiplicity';
    expect(errors(multiplicity).map((error) => error.code)).toContain('SCOPE_INCOMPATIBLE_WITH_SKILL');

    const sampledWeight = request('weight', 0);
    sampledWeight.data.scope = sampled.data.scope;
    expect(errors(sampledWeight).map((error) => error.code)).toContain('SCOPE_INCOMPATIBLE_WITH_SKILL');
  });

  it('rejects adjacency aggregations with no scientific role', () => {
    for (const aggregation of ['mean', 'min', 'max']) {
      const value = request('adjacency', 0);
      value.parameters.multapseAggregation = aggregation;
      expect(errors(value).map((error) => error.code), aggregation)
        .toContain('SCIENCE_AGGREGATION_REQUIRED');
    }
  });

  it('checks diverging scale against complete painted aggregates, not hidden contributors', () => {
    const valid = request('weight', 0);
    expect(errors(valid)).toEqual([]);

    const oneSided = structuredClone(valid);
    oneSided.data.connections.weights.values[2] = 4.5;
    expect(errors(oneSided).map((error) => error.code)).toContain('RENDER_DIVERGING_SCALE_NO_CENTER');

    const hiddenStraddle = request('weight', 3);
    hiddenStraddle.parameters.colorScale = { class: 'diverging', center: 0 };
    hiddenStraddle.data.connections.sourceIds = hiddenStraddle.data.connections.sourceIds.map(
      () => 's1',
    );
    // Raw weights straddle zero, but max aggregation emits one positive painted cell.
    expect(errors(hiddenStraddle).map((error) => error.code))
      .toContain('RENDER_DIVERGING_SCALE_NO_CENTER');
  });

  it('refuses an unrepresentable exact aggregate without escaping the validation boundary', () => {
    const overflow = request('weight', 0);
    overflow.data.connections.sourceIds = ['s1', 's1'];
    overflow.data.connections.targetIds = ['t1', 't1'];
    overflow.data.connections.edgeIds = ['max-a', 'max-b'];
    overflow.data.connections.synapseModels = ['static_synapse', 'static_synapse'];
    overflow.data.connections.weights.values = [Number.MAX_VALUE, Number.MAX_VALUE];

    expect(() => errors(overflow)).not.toThrow();
    expect(errors(overflow).map((error) => error.code))
      .toContain('SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE');
  });
});
