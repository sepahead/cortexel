import { readFileSync } from 'node:fs';
import path from 'node:path';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  computeCorrelogram,
  deriveCorrelogramPairAccounting,
  deriveCorrelogramTargetRates,
  deriveEligibleCorrelogramReferenceCounts,
} from '../src/analysis/correlogram.js';
import { canonicalDigest } from '../src/core/canonicalize.js';
import {
  correlogramEventTrainsValid,
  correlogramLagRangeValid,
  correlogramPrebinnedAxisConsistent,
  correlogramRolesDisjoint,
  correlogramStatisticDenominator,
} from '../src/core/semantics/spikes.js';
import { windowValid } from '../src/core/semantics/events.js';
import type { CortexelError } from '../src/core/errors.js';

const root = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(readFileSync(
  path.join(root, 'contract/skills/neuro.correlogram.v1.json'),
  'utf8',
)) as {
  requestSchema: { data: object; parameters: object };
  science: { derivation: string[]; uncertaintySupport: string[] };
  accessibility: {
    summaryTemplate: string;
    tableColumns: { key: string; description?: string }[];
  };
  examples: {
    valid: Record<string, any>[];
    invalid: { expectedCode: string; request: Record<string, any> }[];
  };
};

function sourceStructuralValidator(): ValidateFunction {
  const generated = JSON.parse(readFileSync(
    path.join(root, 'contract/schemas/skills/neuro.correlogram.request.v1.schema.json'),
    'utf8',
  ));
  generated.properties.data = source.requestSchema.data;
  generated.properties.parameters = source.requestSchema.parameters;

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    strictTypes: false,
  });
  ajv.addSchema(JSON.parse(readFileSync(
    path.join(root, 'contract/schemas/generated/registry-enums.v1.schema.json'),
    'utf8',
  )));
  ajv.addSchema(JSON.parse(readFileSync(
    path.join(root, 'contract/schemas/common.v1.schema.json'),
    'utf8',
  )));
  return ajv.compile(generated);
}

const validateStructure = sourceStructuralValidator();

function semanticErrors(request: Record<string, unknown>): CortexelError[] {
  const context = { request, skillId: 'neuro.correlogram' };
  return [
    ...windowValid({ ...context, parameters: { pointer: '/data/window', unitDimension: 'time' } }),
    ...correlogramEventTrainsValid(context),
    ...correlogramRolesDisjoint(context),
    ...correlogramLagRangeValid(context),
    ...correlogramPrebinnedAxisConsistent(context),
    ...correlogramStatisticDenominator(context),
  ];
}

function structuralSummary(): string {
  return (validateStructure.errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.keyword}: ${error.message ?? ''}`)
    .join('\n');
}

function valid(mode: string): Record<string, any> {
  const request = source.examples.valid.find((candidate) => candidate.data.mode === mode);
  if (!request) throw new Error(`missing living ${mode} example`);
  return structuredClone(request);
}

describe('unreleased correlogram role-product contract', () => {
  it('accepts every new living shape structurally and semantically', () => {
    for (const [index, request] of source.examples.valid.entries()) {
      expect(validateStructure(request), `valid[${index}]\n${structuralSummary()}`).toBe(true);
      expect(
        semanticErrors(request).map((error) => [error.code, error.instancePath]),
        `valid[${index}]`,
      ).toEqual([]);
    }
  });

  it('keeps a silent target cross because roles come from containers, not active senders', () => {
    const request = valid('events_cross');
    expect(request.data.targetTrain.eventTimes.values).toEqual([]);
    expect(request.data.targetTrain.recordedSenderIds.length).toBeGreaterThan(0);
    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([]);
    expect(request.data.mode).toBe('events_cross');
  });

  it('treats a completely observed silent role as zero-pair data', () => {
    const result = computeCorrelogram(
      [1, 2],
      [],
      { edges: [-1.5, -0.5, 0.5, 1.5], finalEdgeInclusive: false },
      'cross',
    );
    expect(result.counts).toEqual([0, 0, 0]);
    expect(result.totalPairs).toBe(0);

    const derivation = source.science.derivation.join('\n');
    expect(derivation).toContain('measured zero-event data, not missing data');
    expect(derivation).not.toContain('RENDER_NO_DATA');
    expect(source.accessibility.summaryTemplate).toContain('{candidatePairCount}');
    expect(source.accessibility.summaryTemplate).toContain('{outOfRangePairCount}');
    expect(source.accessibility.summaryTemplate).toContain('{sourceAuthorityStatement}');
    expect(source.accessibility.summaryTemplate).not.toContain('raw counts and duration are derived');
    expect(source.accessibility.summaryTemplate).not.toMatch(/\{pairsCounted\} pairs counted/u);

    const pairCount = source.accessibility.tableColumns.find((column) => column.key === 'pairCount');
    const value = source.accessibility.tableColumns.find((column) => column.key === 'value');
    const valueStatus = source.accessibility.tableColumns.find(
      (column) => column.key === 'valueStatus',
    );
    expect(pairCount?.description).toContain('numerator');
    expect(value?.description).toContain('null');
    expect(valueStatus?.description).toContain('undefined_zero_eligible_reference_events');
    expect(source.accessibility.tableColumns.find((column) => column.key === 'denominator')?.description)
      .toContain('exposure in seconds');
  });

  it('converts the bin width into the lag unit once and rejects non-time lag axes', () => {
    const converted = valid('events_auto');
    converted.parameters.bins = { unit: 'us', width: 1_000 };
    expect(validateStructure(converted), structuralSummary()).toBe(true);
    expect(semanticErrors(converted)).toEqual([]);

    const voltageAxis = valid('events_auto');
    voltageAxis.parameters.lagRange.unit = 'mV';
    voltageAxis.parameters.bins.unit = 'mV';
    expect(validateStructure(voltageAxis), structuralSummary()).toBe(true);
    expect(semanticErrors(voltageAxis).map((error) => error.code)).toContain(
      'SCIENCE_UNIT_DIMENSION_MISMATCH',
    );
  });

  it('compares a pre-binned axis after one registered unit conversion', () => {
    const request = valid('prebinned_auto');
    request.data.binEdges = {
      unit: 'us',
      edges: request.data.binEdges.edges.map((edge: number) => edge * 1_000),
    };

    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([]);
  });

  it('honors every declared observation-window endpoint closure literally', () => {
    const at = (time: number, boundary: string) => {
      const request = valid('events_auto');
      request.data.window.boundary = boundary;
      request.data.train.eventTimes.values = [time];
      request.data.train.eventSenderIds = ['e1'];
      delete request.data.train.eventIds;
      expect(validateStructure(request), structuralSummary()).toBe(true);
      return semanticErrors(request).map((error) => error.code);
    };

    expect(at(0, '[start,stop)')).not.toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(10, '[start,stop)')).toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(0, '[start,stop]')).not.toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(10, '[start,stop]')).not.toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(0, '(start,stop]')).toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
    expect(at(10, '(start,stop]')).not.toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
  });

  it('keeps zero-denominator rate bins as explicit null-with-reason values', () => {
    const request = valid('events_cross');
    request.data.referenceTrain.eventTimes.values = [];
    request.data.referenceTrain.eventSenderIds = [];
    request.parameters.statistic = 'target_rate_per_reference_event';
    request.parameters.edgeCorrection = 'none';

    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([]);
    expect(deriveCorrelogramTargetRates(
      [0, 2, 0],
      [0, 4, 0],
      { value: 1, unit: 'ms' },
    )).toEqual([
      {
        pairCount: 0,
        eligibleReferenceEvents: 0,
        denominatorSeconds: 0,
        value: null,
        status: 'undefined_zero_eligible_reference_events',
      },
      {
        pairCount: 2,
        eligibleReferenceEvents: 4,
        denominatorSeconds: 0.004,
        value: 500,
        status: 'defined',
      },
      {
        pairCount: 0,
        eligibleReferenceEvents: 0,
        denominatorSeconds: 0,
        value: null,
        status: 'undefined_zero_eligible_reference_events',
      },
    ]);
    expect(() => deriveCorrelogramTargetRates([1], [0], { value: 1, unit: 'ms' })).toThrow(
      'must be zero when no reference event is eligible',
    );
  });

  it('derives eligible-reference counts by exact typed sums and literal window closure', () => {
    const edges = [-500, 500];
    expect(deriveEligibleCorrelogramReferenceCounts(
      [0.5],
      's',
      edges,
      'ms',
      { start: 0, stop: 2, unit: 's', boundary: '[start,stop)' },
    )).toEqual([1]);
    expect(deriveEligibleCorrelogramReferenceCounts(
      [0.5],
      's',
      edges,
      'ms',
      { start: 0, stop: 2, unit: 's', boundary: '(start,stop]' },
    )).toEqual([0]);

    expect(() => deriveEligibleCorrelogramReferenceCounts(
      [0],
      'ms',
      [0.5, -0.5],
      'ms',
      { start: 0, stop: 1, unit: 'ms', boundary: '[start,stop)' },
    )).toThrow('strictly increasing');
  });

  it('matches a literal eligibility oracle across randomized closures without a bins-by-events scan', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -20, max: 30 }), { maxLength: 200 }),
        fc.constantFrom('[start,stop)', '[start,stop]', '(start,stop]'),
        (times, boundary) => {
          const edges = [-5, -3, -1, 1, 3, 5];
          const expected = edges.slice(0, -1).map((lower, index) => {
            const upper = edges[index + 1];
            return times.filter((time) => {
              const lowerInside = boundary === '(start,stop]'
                ? time + lower > 0
                : time + lower >= 0;
              return lowerInside && time + upper <= 10;
            }).length;
          });
          expect(deriveEligibleCorrelogramReferenceCounts(
            times,
            'ms',
            edges,
            'ms',
            { start: 0, stop: 10, unit: 'ms', boundary },
          )).toEqual(expected);
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('reconciles a pre-binned autocorrelogram numerator with its self-pair denominator', () => {
    const request = valid('prebinned_auto');
    request.data.referenceEventCount = 2;

    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        instancePath: '/data/pairCounts',
      }),
    ]);
  });

  it('admits a third sender only after one explicit role universe owns it', () => {
    const request = valid('events_cross');
    request.data.targetTrain.recordedSenderIds.push('i3');
    request.data.targetTrain.eventTimes.values.push(3);
    request.data.targetTrain.eventSenderIds.push('i3');

    expect(validateStructure(request), structuralSummary()).toBe(true);
    expect(semanticErrors(request)).toEqual([]);

    request.data.targetTrain.recordedSenderIds.pop();
    expect(semanticErrors(request).map((error) => error.code)).toContain(
      'SEMANTIC_UNKNOWN_REFERENCE',
    );
  });

  it('scopes optional event ids within a train and rejects duplicates within it', () => {
    const request = valid('events_cross');
    request.data.referenceTrain.eventIds = ['local-1', 'local-2'];
    request.data.targetTrain.eventTimes.values = [3];
    request.data.targetTrain.eventSenderIds = ['i1'];
    request.data.targetTrain.eventIds = ['local-1'];
    expect(semanticErrors(request)).toEqual([]);

    request.data.referenceTrain.eventIds[1] = 'local-1';
    expect(semanticErrors(request).map((error) => error.code)).toContain(
      'SEMANTIC_DUPLICATE_ID',
    );
  });

  it('makes a role swap explicit and digest-visible without changing lag orientation', () => {
    const request = valid('events_cross');
    const swapped = structuredClone(request);
    [swapped.data.referenceTrain, swapped.data.targetTrain] = [
      swapped.data.targetTrain,
      swapped.data.referenceTrain,
    ];

    expect(validateStructure(swapped), structuralSummary()).toBe(true);
    expect(semanticErrors(swapped)).toEqual([]);
    expect(swapped.data.lagOrientation).toEqual({
      definition: 'target_time_minus_reference_time',
      positiveLagMeaning: 'target_follows_reference',
    });
    expect(canonicalDigest(swapped)).not.toBe(canonicalDigest(request));
  });

  it('excludes the positive outer edge and includes the negative outer edge', () => {
    const result = computeCorrelogram(
      [0],
      [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5],
      { edges: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5], finalEdgeInclusive: false },
      'cross',
    );
    expect(result.counts).toEqual([1, 1, 1, 1, 1]);
    expect(result.totalPairs).toBe(5);
    expect(result.receipt).toMatchObject({
      lagConvention: 'target_time - reference_time',
      binBoundary: 'left_closed_right_open',
      positiveOuterEdge: 'excluded',
      pairAccounting: {
        candidatePairCount: 6,
        countedPairCount: 5,
        outOfRangePairCount: 1,
        sameEventSelfPairCountExcluded: 0,
      },
    });
  });

  it('receipts every auto self-pair and assigns every distinct distant pair out of range', () => {
    const result = computeCorrelogram(
      [0, 10],
      [0, 10],
      { edges: [-1.5, -0.5, 0.5, 1.5], finalEdgeInclusive: false },
      'auto',
    );
    expect(result.counts).toEqual([0, 0, 0]);
    expect(result.receipt.pairAccounting).toEqual({
      candidatePairCount: 4,
      countedPairCount: 0,
      outOfRangePairCount: 2,
      sameEventSelfPairCountExcluded: 2,
    });
    expect(result.selfPairsExcluded).toBe(2);
  });

  it('has no structurally or semantically accepted unrendered statistic branch', () => {
    const request = valid('events_auto');
    for (const statistic of ['pearson_coefficient', 'weighted_pair_sum', 'mystery']) {
      const changed = structuredClone(request);
      changed.parameters.statistic = statistic;
      expect(validateStructure(changed), statistic).toBe(false);
      expect(semanticErrors(changed)).toEqual([
        expect.objectContaining({
          code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
          instancePath: '/parameters/statistic',
        }),
      ]);
    }

    const overlap = structuredClone(request);
    overlap.parameters.edgeCorrection = 'valid_overlap_only';
    expect(validateStructure(overlap)).toBe(false);
    expect(semanticErrors(overlap)).toEqual([
      expect.objectContaining({ instancePath: '/parameters/edgeCorrection' }),
    ]);

    const extraCarrier = structuredClone(request);
    extraCarrier.parameters.binValues = 'counts';
    expect(validateStructure(extraCarrier)).toBe(false);

    const droppedUncertainty = structuredClone(request);
    droppedUncertainty.parameters.uncertainty = {
      kind: 'standard_deviation',
      unit: '1',
      values: [0, 0, 0, 0, 0],
      sampleCount: [2, 2, 2, 2, 2],
      basis: 'trials',
    };
    expect(validateStructure(droppedUncertainty)).toBe(false);
    expect(source.science.uncertaintySupport).toEqual(['none']);
  });

  it('makes every admitted mode/statistic/edge-correction product executable', () => {
    const modes = ['events_auto', 'events_cross', 'prebinned_auto', 'prebinned_cross'];
    for (const mode of modes) {
      for (const [statistic, edgeCorrection] of [
        ['raw_pair_count', 'none'],
        ['target_rate_per_reference_event', 'none'],
        ['target_rate_per_reference_event', 'eligible_reference_events'],
      ] as const) {
        const request = valid(mode);
        request.parameters.statistic = statistic;
        request.parameters.edgeCorrection = edgeCorrection;
        if (mode.startsWith('prebinned')) {
          if (edgeCorrection === 'eligible_reference_events') {
            request.data.eligibleReferenceEventCounts =
              mode === 'prebinned_auto' ? [4, 5, 6, 5, 4] : [3, 4, 5, 4, 3];
          } else {
            delete request.data.eligibleReferenceEventCounts;
          }
        }

        expect(validateStructure(request), `${mode}/${statistic}/${edgeCorrection}`).toBe(true);
        expect(
          semanticErrors(request),
          `${mode}/${statistic}/${edgeCorrection}`,
        ).toEqual([]);
      }
    }
  });

  it('enforces exact pre-binned pair conservation and zero-denominator coherence', () => {
    const cross = valid('prebinned_cross');
    cross.data.referenceEventCount = 2;
    cross.data.targetEventCount = 2;
    expect(semanticErrors(cross)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        instancePath: '/data/pairCounts',
      }),
    ]);

    const zeroEligible = valid('prebinned_cross');
    zeroEligible.data.eligibleReferenceEventCounts[0] = 0;
    zeroEligible.data.pairCounts[0] = 0;
    expect(semanticErrors(zeroEligible)).toEqual([]);

    zeroEligible.data.pairCounts[0] = 1;
    expect(semanticErrors(zeroEligible)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_DENOMINATOR_INVALID',
        instancePath: '/data/pairCounts/0',
      }),
    ]);

    const unsafeProduct = valid('prebinned_cross');
    unsafeProduct.data.referenceEventCount = Number.MAX_SAFE_INTEGER;
    unsafeProduct.data.targetEventCount = 2;
    expect(semanticErrors(unsafeProduct)).toEqual([
      expect.objectContaining({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        instancePath: '/data/targetEventCount',
      }),
    ]);
    expect(() =>
      deriveCorrelogramTargetRates([1], [2], { value: Number.MAX_VALUE, unit: 's' }),
    ).toThrow('exposure at bin 0 is not finite positive binary64');
  });

  it('proves the exact accounting partition over randomized bounded products', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000 }),
        fc.integer({ min: 0, max: 1_000 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 1_000_000 }),
        (referenceCount, arbitraryTargetCount, auto, requestedCounted) => {
          const targetCount = auto ? referenceCount : arbitraryTargetCount;
          const candidate = referenceCount * targetCount;
          const selfPairs = auto ? referenceCount : 0;
          const available = candidate - selfPairs;
          const counted = Math.min(requestedCounted, available);
          const accounting = deriveCorrelogramPairAccounting(
            referenceCount,
            targetCount,
            auto ? 'auto' : 'cross',
            counted,
          );

          expect(
            accounting.countedPairCount +
              accounting.outOfRangePairCount +
              accounting.sameEventSelfPairCountExcluded,
          ).toBe(accounting.candidatePairCount);
          expect(accounting.sameEventSelfPairCountExcluded).toBe(auto ? referenceCount : 0);
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('executes every semantic nearest-misuse vector against the named validators', () => {
    const structuralCodes = new Set([
      'SCHEMA_ENUM_MISMATCH',
      'SCHEMA_UNKNOWN_PROPERTY',
      'SCHEMA_REQUIRED_PROPERTY_MISSING',
    ]);
    for (const [index, example] of source.examples.invalid.entries()) {
      if (structuralCodes.has(example.expectedCode)) {
        expect(validateStructure(example.request), `invalid[${index}] was structurally accepted`).toBe(false);
        continue;
      }
      expect(validateStructure(example.request), `invalid[${index}]\n${structuralSummary()}`).toBe(true);
      expect(
        semanticErrors(example.request).map((error) => error.code),
        `invalid[${index}] expected ${example.expectedCode}`,
      ).toContain(example.expectedCode);
    }
  });

  it('has no accepted weighted statistic or caller-supplied raw count/duration authority', () => {
    const request = valid('events_auto');
    request.parameters.statistic = 'weighted_pair_sum';
    expect(validateStructure(request)).toBe(false);

    const redundant = valid('events_auto');
    redundant.data.referenceEventCount = redundant.data.train.eventTimes.values.length;
    redundant.data.effectiveDuration = { kind: 'duration', unit: 'ms', value: 10 };
    expect(validateStructure(redundant)).toBe(false);
  });
});
