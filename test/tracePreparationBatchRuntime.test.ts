import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalDigest } from '../src/core/canonicalize.js';
import { validateArtifactStructure } from '../src/core/structural-validator.js';
import {
  buildFigure,
  derivationOperationIdsAreUniqueForTest,
} from '../src/render/buildFigure.js';

type MutableRecord = Record<string, any>;

const root = path.resolve(import.meta.dirname, '..');
const compartmentContract = JSON.parse(readFileSync(
  path.join(root, 'contract/skills/neuro.compartment_trace.v1.json'),
  'utf8',
)) as { examples: { valid: MutableRecord[] } };
const weightContract = JSON.parse(readFileSync(
  path.join(root, 'contract/skills/network.synaptic_weight_trace.v1.json'),
  'utf8',
)) as { examples: { valid: MutableRecord[] } };

function digest(domain: string, suffix: string, payload: unknown): string {
  return canonicalDigest({
    digestDomain: `${domain}/${suffix}`,
    payload,
  });
}

function traceWindow(raw: MutableRecord): MutableRecord {
  return {
    start: raw.start,
    stop: raw.stop,
    unit: raw.unit,
    finalEdgeInclusive: String(raw.boundary).endsWith(']'),
  };
}

function expectOperationDigests(operation: MutableRecord): void {
  const domain = String(operation.parameters.digestDomain);
  expect(operation.inputDigest).toBe(digest(domain, 'operation-input', {
    globalContextDigest: operation.receipt.globalContextDigest,
    seriesInputDigests: operation.receipt.seriesReceipts.map(
      (entry: MutableRecord) => entry.inputDigest,
    ),
  }));
  expect(operation.outputDigest).toBe(
    digest(domain, 'operation-output', operation.receipt),
  );
}

function expectAggregateOperationDigests(
  operation: MutableRecord,
  preparationBatchOutputDigest: string,
): void {
  const domain = String(operation.parameters.digestDomain);
  expect(operation.parameters.digestCanonicalization).toBe('rfc8785');
  expect(operation.receipt.preparationBatchOutputDigest).toBe(
    preparationBatchOutputDigest,
  );
  expect(operation.inputDigest).toBe(canonicalDigest({
    digestDomain: `${domain}/operation-input`,
    payload: {
      preparationBatchOutputDigest,
      scientificInputDigest: operation.receipt.scientificInputDigest,
    },
  }));
  expect(operation.outputDigest).toBe(canonicalDigest({
    digestDomain: `${domain}/operation-output`,
    payload: {
      scientificOutputDigest: operation.receipt.scientificOutputDigest,
      outputUnits: operation.receipt.outputUnits,
    },
  }));
}

function compartmentRequest(seriesCount: number): MutableRecord {
  const request = structuredClone(compartmentContract.examples.valid[0]);
  request.presentation = {
    width: 1200,
    height: 1200,
    budgetProfile: 'agent',
  };
  request.parameters = {
    layout: 'heatmap',
    colorScale: { family: 'sequential' },
    duplicateTimePolicy: 'reject',
    uncertainty: { kind: 'none', reason: 'single_trial' },
  };
  request.data.compartmentIds = Array.from(
    { length: seriesCount },
    (_unused, index) => `c${index}`,
  );
  request.data.compartmentParentIds = Array.from(
    { length: seriesCount },
    (_unused, index) => index === 0 ? null : `c${index - 1}`,
  );
  request.data.compartmentLabels = Array.from(
    { length: seriesCount },
    (_unused, index) => `Compartment ${index}`,
  );
  request.data.compartmentPathDistances = {
    kind: 'length',
    unit: 'um',
    values: Array.from({ length: seriesCount }, (_unused, index) => index),
  };
  request.data.series = Array.from({ length: seriesCount }, (_unused, index) => ({
    compartmentId: `c${index}`,
    signalId: 'v_m',
    signalLabel: 'Membrane potential',
    time: { kind: 'time', unit: 'ms', values: [0] },
    values: {
      kind: 'membrane_voltage',
      unit: 'mV',
      values: [-70 + index / 100],
    },
  }));
  request.data.window = {
    start: 0,
    stop: 1,
    unit: 'ms',
    boundary: '[start,stop)',
  };
  return request;
}

function derivedWeightRequest(seriesCount: number): MutableRecord {
  const request = structuredClone(weightContract.examples.valid[1]);
  request.presentation = {
    width: 1200,
    height: 720,
    budgetProfile: 'agent',
  };
  request.parameters.display = 'aggregate_derived';
  request.parameters.aggregate.dispersion = {
    kind: 'none',
    reason: 'not_computed',
  };
  request.data.series = Array.from({ length: seriesCount }, (_unused, index) => ({
    edgeId: `e${index}`,
    label: `Edge ${index}`,
    endpoints: { sourceId: `s${index}`, targetId: `t${index}` },
    synapseModel: 'stdp_synapse',
    recordedInterval: {
      start: 0,
      stop: 1000,
      unit: 'ms',
      boundary: '[start,stop)',
    },
    time: { kind: 'time', unit: 'ms', values: [10] },
    values: {
      kind: 'synaptic_weight',
      unit: 'nest:weight',
      values: [1 + index / 1000],
    },
    eventKinds: ['presynaptic_spike'],
    initialWeight: {
      quantity: {
        kind: 'synaptic_weight',
        unit: 'nest:weight',
        value: 1,
      },
      origin: 'model_parameter',
    },
    uncertainty: { kind: 'none', reason: 'single_trial' },
  }));
  request.data.membership = {
    groupId: 'g',
    groupLabel: 'Declared group',
    unit: 'ms',
    members: Array.from({ length: seriesCount }, (_unused, index) => ({
      edgeId: `e${index}`,
      intervals: [{ start: 0, stop: 1000 }],
    })),
  };
  return request;
}

describe('bounded trace-preparation batch producer', () => {
  it('requires nonblank, globally unique operation ids within the artifact limit', () => {
    expect(derivationOperationIdsAreUniqueForTest([])).toBe(true);
    expect(derivationOperationIdsAreUniqueForTest(['prepare', 'aggregate'])).toBe(true);
    expect(derivationOperationIdsAreUniqueForTest(['prepare', 'prepare'])).toBe(false);
    expect(derivationOperationIdsAreUniqueForTest(['prepare', '   '])).toBe(false);
    expect(derivationOperationIdsAreUniqueForTest(
      Array.from({ length: 64 }, (_unused, index) => `operation-${index}`),
    )).toBe(true);
    expect(derivationOperationIdsAreUniqueForTest(
      Array.from({ length: 65 }, (_unused, index) => `operation-${index}`),
    )).toBe(false);
  });

  it('binds 65 compartment series in one closed operation beyond the legacy 64-operation cap', () => {
    const result = buildFigure(compartmentRequest(65));
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;

    const artifact = result.artifact as MutableRecord;
    const canonical = artifact.canonicalRequest as MutableRecord;
    const operations = artifact.derivation.operations as MutableRecord[];
    expect(operations).toHaveLength(1);
    const batch = operations[0];
    expect(batch.id).toBe('compartment.trace.prepare_series_batch');
    expect(batch.receipt.seriesCount).toBe(65);
    expect(batch.receipt.seriesReceipts).toHaveLength(65);
    expectOperationDigests(batch);

    const domain = String(batch.parameters.digestDomain);
    const window = traceWindow(canonical.data.window);
    const expectedGlobalContextDigest = digest(domain, 'global-context', {
      skillId: 'neuro.compartment_trace',
      dataContext: { ...canonical.data, series: null },
      parameters: canonical.parameters,
      analysisWindow: window,
      targetValueUnit: 'mV',
    });
    expect(batch.receipt.globalContextDigest).toBe(expectedGlobalContextDigest);

    for (let index = 0; index < 65; index++) {
      const receipt = batch.receipt.seriesReceipts[index];
      const identity = {
        kind: 'compartment_series',
        compartmentId: `c${index}`,
        signalId: 'v_m',
      };
      expect(receipt.sourceIndex).toBe(index);
      expect(receipt.seriesIdentity).toEqual(identity);
      expect(receipt.materialization).toBeNull();
      expect(receipt.inputDigest).toBe(digest(domain, 'series-input', {
        globalContextDigest: expectedGlobalContextDigest,
        sourceIndex: index,
        seriesIdentity: identity,
        role: 'source_series',
        inputPayload: canonical.data.series[index],
      }));
    }
  });

  it('binds 65 weight members once and chains the derived aggregate to that exact receipt', () => {
    const result = buildFigure(derivedWeightRequest(65));
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;

    const artifact = result.artifact as MutableRecord;
    const canonical = artifact.canonicalRequest as MutableRecord;
    const operations = artifact.derivation.operations as MutableRecord[];
    expect(operations).toHaveLength(2);
    const [batch, aggregate] = operations;
    expect(batch.id).toBe('weight.trace.prepare_series_batch');
    expect(batch.receipt.seriesCount).toBe(65);
    expect(batch.receipt.seriesReceipts).toHaveLength(65);
    expectOperationDigests(batch);
    expect(aggregate.id).toBe('weight.aggregate.membership_bound');
    expect(aggregate.algorithmRevision).toBe(4);
    expect(aggregate.parameters.preparationBatchOutputDigest).toBe(batch.outputDigest);
    expect(aggregate.receipt.preparationBatchOutputDigest).toBe(batch.outputDigest);
    expectAggregateOperationDigests(aggregate, batch.outputDigest);

    const domain = String(batch.parameters.digestDomain);
    const window = traceWindow(canonical.data.window);
    const expectedGlobalContextDigest = digest(domain, 'global-context', {
      skillId: 'network.synaptic_weight_trace',
      dataContext: { ...canonical.data, series: null },
      parameters: canonical.parameters,
      analysisWindow: window,
      observation: canonical.data.observation,
      targetValueUnit: 'nest:weight',
    });
    expect(batch.receipt.globalContextDigest).toBe(expectedGlobalContextDigest);

    const identities = new Set<string>();
    for (let index = 0; index < 65; index++) {
      const receipt = batch.receipt.seriesReceipts[index];
      const identity = { kind: 'weight_member', edgeId: `e${index}` };
      expect(receipt.sourceIndex).toBe(index);
      expect(receipt.seriesIdentity).toEqual(identity);
      expect(receipt.views.map((view: MutableRecord) => view.kind)).toEqual([
        'display',
        'state',
      ]);
      expect(receipt.materialization?.kind).toBe('event_updated');
      expect(receipt.inputDigest).toBe(digest(domain, 'series-input', {
        globalContextDigest: expectedGlobalContextDigest,
        sourceIndex: index,
        seriesIdentity: identity,
        role: 'source_series',
        inputPayload: canonical.data.series[index],
      }));
      identities.add(JSON.stringify(receipt.seriesIdentity));
    }
    expect(identities.size).toBe(65);
  });

  it('records membership and declared-grid unit conversions in the aggregate receipt', () => {
    const request = derivedWeightRequest(2);
    request.data.membership.unit = 's';
    for (const member of request.data.membership.members) {
      member.intervals = [{ start: 0, stop: 1 }];
    }
    for (const series of request.data.series) {
      series.recordedInterval = {
        start: 0,
        stop: 1,
        unit: 's',
        boundary: '[start,stop)',
      };
      series.time = { kind: 'time', unit: 's', values: [0.01] };
      series.values.values = [series.values.values[0]];
      series.eventKinds = ['presynaptic_spike'];
    }
    request.parameters.aggregate.evaluation = {
      mode: 'hold_last_observed_at_declared_times',
      times: {
        kind: 'time',
        unit: 's',
        values: [0, 0.01],
      },
    };

    const result = buildFigure(request);
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;
    const aggregate = (
      (result.artifact as MutableRecord).derivation.operations as MutableRecord[]
    )[1];
    expect(aggregate.receipt.membershipTimeConversion).toMatchObject({
      from: 's',
      to: 'ms',
      factor: 1000,
      algorithm: 'exact_rational_round_to_binary64',
    });
    expect(aggregate.receipt.evaluationTimeConversion).toMatchObject({
      from: 's',
      to: 'ms',
      factor: 1000,
      algorithm: 'exact_rational_round_to_binary64',
    });
  });

  it('emits initial-state contributor ids in canonical member order, not first-use time order', () => {
    const request = derivedWeightRequest(2);
    request.data.series[0].recordedInterval.start = 500;
    request.data.series[0].time.values = [800];
    request.data.membership.members[0].intervals = [{ start: 500, stop: 1000 }];
    request.data.series[1].time.values = [400];

    const result = buildFigure(request);
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;
    const operations = (
      (result.artifact as MutableRecord).derivation.operations as MutableRecord[]
    );
    expect(operations[1].receipt.initialStateContributorIds).toEqual(['e0', 'e1']);
    expect(validateArtifactStructure(result.artifact).ok).toBe(true);
  });

  it('chains a compartment aggregate after—not in place of—the preparation batch', () => {
    const result = buildFigure(structuredClone(compartmentContract.examples.valid[1]));
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;
    const operations = (
      (result.artifact as MutableRecord).derivation.operations as MutableRecord[]
    );
    expect(operations.map((operation) => operation.id)).toEqual([
      'compartment.trace.prepare_series_batch',
      'compartment.aggregate.explicit_selection',
    ]);
    expect(operations[1].algorithmRevision).toBe(4);
    expect(operations[1].parameters.preparationBatchOutputDigest).toBe(
      operations[0].outputDigest,
    );
    expect(operations[1].receipt.preparationBatchOutputDigest).toBe(
      operations[0].outputDigest,
    );
    expectAggregateOperationDigests(operations[1], operations[0].outputDigest);
  });

  it('keeps delimiter-colliding textual tuples distinct through the produced receipt', () => {
    const request = compartmentRequest(2);
    request.parameters = {
      layout: 'small_multiples',
      yScale: 'shared',
      duplicateTimePolicy: 'reject',
      uncertainty: { kind: 'none', reason: 'single_trial' },
    };
    request.data.compartmentIds = ['a:b', 'a'];
    request.data.compartmentParentIds = [null, 'a:b'];
    request.data.compartmentLabels = ['A colon B', 'A'];
    request.data.series[0].compartmentId = 'a:b';
    request.data.series[0].signalId = 'c';
    request.data.series[1].compartmentId = 'a';
    request.data.series[1].signalId = 'b:c';

    const result = buildFigure(request);
    expect(result.ok, result.ok ? '' : JSON.stringify(result.errors, null, 2)).toBe(true);
    if (!result.ok) return;
    const identities = (
      (result.artifact as MutableRecord).derivation.operations[0] as MutableRecord
    ).receipt.seriesReceipts.map((entry: MutableRecord) => entry.seriesIdentity);
    expect(identities).toEqual([
      { kind: 'compartment_series', compartmentId: 'a:b', signalId: 'c' },
      { kind: 'compartment_series', compartmentId: 'a', signalId: 'b:c' },
    ]);
    expect(canonicalDigest(identities[0])).not.toBe(canonicalDigest(identities[1]));
  });
});
