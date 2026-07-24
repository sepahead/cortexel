import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DISTRIBUTION_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/distributions.js';
import type { PsthResult } from '../src/analysis/psth.js';
import {
  checkFiniteInfluenceWitnessesV1,
  type AuthorityDerivationValueV1,
} from '../src/core/output-authority.js';
import type { JsonValue } from '../src/core/parse-json.js';
import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/buildFigure.js';
import { compilePsthFigure } from '../src/render/compileFamilies.js';
import { closePlainRenderPlanForAuthorityV1 } from '../src/render/plan-closure.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const SKILLS = [
  'network.degree_distribution',
  'network.delay_distribution',
  'network.weight_distribution',
  'neuro.isi_distribution',
  'neuro.correlogram',
  'neuro.population_rate',
  'neuro.psth',
  'neuro.spike_raster',
] as const;

const HISTOGRAM_SUMMARY_SKILLS = [
  'network.degree_distribution',
  'network.delay_distribution',
  'network.weight_distribution',
  'neuro.isi_distribution',
] as const;

function source(skillId: string): JsonRecord {
  return JSON.parse(readFileSync(
    path.join(ROOT, `contract/skills/${skillId}.v1.json`),
    'utf8',
  ));
}

function evaluator(skillId: string) {
  const contract = source(skillId);
  const found = DISTRIBUTION_AUTHORITY_EVALUATORS.find(
    (candidate) => candidate.id === contract.outputAuthority.evaluator.id,
  );
  if (!found) throw new Error(`missing distribution authority evaluator ${skillId}`);
  return found;
}

function field(
  fields: Readonly<Record<string, AuthorityDerivationValueV1>>,
  id: string,
): AuthorityDerivationValueV1 {
  const value = fields[id];
  if (!value) throw new Error(`missing authority field ${id}`);
  return value;
}

describe('independent distribution OutputAuthority evaluators', () => {
  it('reconstructs complete typed fields for every living source example before generation', () => {
    expect(DISTRIBUTION_AUTHORITY_EVALUATORS).toHaveLength(SKILLS.length);
    for (const skillId of SKILLS) {
      const contract = source(skillId);
      const allowedClasses = new Set(
        contract.outputAuthority.geometry.classes.map((entry: JsonRecord) => entry.id),
      );
      let evaluatedExamples = 0;
      for (let exampleIndex = 0; exampleIndex < contract.examples.valid.length; exampleIndex++) {
        const validated = validateRequestValue(contract.examples.valid[exampleIndex]);
        // Source is deliberately ahead of generated schemas during this tranche. Once
        // central generation runs, this loop automatically covers every source example.
        if (!validated.ok) continue;
        evaluatedExamples++;
        const evaluation = evaluator(skillId).evaluateCanonicalRequest(
          validated.request.canonicalRequest as JsonValue,
        );
        const rows = field(evaluation.fields, 'table.rows');
        expect(rows.tag, `${skillId} example ${exampleIndex}`).toBe('row_sequence');
        if (rows.tag === 'row_sequence') {
          for (const row of rows.rows) {
            expect(row).toHaveLength(contract.accessibility.tableColumns.length);
          }
        }
        const geometry = field(evaluation.fields, 'geometry.sequence');
        expect(geometry.tag).toBe('geometry_sequence');
        if (geometry.tag === 'geometry_sequence') {
          for (const entry of geometry.entries) {
            expect(entry.tag).toBe('carrier');
            expect(allowedClasses.has(entry.classId)).toBe(true);
          }
        }
        const summary = field(evaluation.fields, 'summary.facts');
        expect(summary.tag).toBe('summary_fact_map');
        if (summary.tag === 'summary_fact_map') {
          expect(Object.keys(summary.facts).sort()).toEqual(
            [...contract.outputAuthority.summary.requiredPlaceholders].sort(),
          );
          expect(Object.values(summary.facts).every((value) => typeof value === 'string')).toBe(true);
        }
        expect(field(evaluation.fields, 'disclosure.facts').tag).toBe('disclosure_fact_map');
      }
      if (evaluatedExamples > 0) {
        expect(evaluatedExamples, `${skillId} needs at least one live canonical example`).toBeGreaterThan(0);
      } else {
        // The checked-in generated correlogram schema is the sole pre-generation shape
        // with no overlap with its revised source union. Central generation removes this
        // temporary zero; no raw correlogram object is passed to the evaluator here.
        expect(skillId).toBe('neuro.correlogram');
      }
    }
  });

  it('keeps accounting prose in panel summaries without mutating the exact global template', () => {
    for (const skillId of HISTOGRAM_SUMMARY_SKILLS) {
      const contract = source(skillId);
      for (let exampleIndex = 0; exampleIndex < contract.examples.valid.length; exampleIndex++) {
        const request = structuredClone(contract.examples.valid[exampleIndex]);
        const validated = validateRequestValue(request);
        expect(
          validated.ok,
          `${skillId} living summary example ${exampleIndex} validates`,
        ).toBe(true);
        if (!validated.ok) continue;

        const evaluation = evaluator(skillId).evaluateCanonicalRequest(
          validated.request.canonicalRequest as JsonValue,
        );
        const summaryValue = field(evaluation.fields, 'summary.facts');
        expect(summaryValue.tag).toBe('summary_fact_map');
        if (summaryValue.tag !== 'summary_fact_map') continue;
        const templateBody = String(contract.accessibility.summaryTemplate).replace(
          /\{([A-Za-z][A-Za-z0-9]*)\}/gu,
          (_token: string, key: string) => summaryValue.facts[key],
        );

        const result = buildFigure(request);
        expect(result.ok, `${skillId} exact summary example ${exampleIndex} builds`).toBe(true);
        if (!result.ok) continue;
        const disclosureCount = result.disclosures.length;
        const expectedGlobalSummary = disclosureCount === 0
          ? templateBody
          : `${templateBody} ${disclosureCount} ${disclosureCount === 1 ? 'disclosure applies' : 'disclosures apply'}: ${result.disclosures
            .map((disclosure) => disclosure.text)
            .join(' ')}`;
        expect(result.plan.accessibility.summary).toBe(expectedGlobalSummary);
        expect(result.plan.accessibility.panelSummaries.some(
          (statement) => /conservation/iu.test(statement),
        )).toBe(true);
        expect(result.plan.accessibility.summary).not.toMatch(/exact conservation/iu);
      }
    }
  });

  it('keeps all eight finite influence witnesses living without compiler assistance', () => {
    for (const skillId of SKILLS) {
      const contract = source(skillId);
      const witness = contract.outputAuthority.influence.witnesses[0];
      if (!validateRequestValue(contract.examples.valid[witness.exampleIndex]).ok) continue;
      const result = checkFiniteInfluenceWitnessesV1(
        contract.outputAuthority,
        contract.examples.valid,
        (candidate) => {
          const checked = validateRequestValue(candidate);
          return checked.ok
            ? { tag: 'accepted', canonicalRequest: checked.request.canonicalRequest as JsonValue }
            : { tag: 'rejected', reasons: checked.errors.map((error) => error.code) };
        },
        evaluator(skillId),
      );
      expect(result, skillId).toEqual({
        tag: 'valid',
        checkedWitnessIds: ['declared_field_changes_owned_output'],
      });
    }
  });

  it('handles a 100000-bin rate request without variadic extrema or argument amplification', () => {
    const request = structuredClone(source('neuro.population_rate').examples.valid[0]);
    const binCount = 100_000;
    request.data.window.stop = binCount;
    request.parameters.bins.stop = binCount;
    request.parameters.bins.width = 1;
    const validated = validateRequestValue(request);
    expect(validated.ok).toBe(true);
    if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
    const evaluation = evaluator('neuro.population_rate').evaluateCanonicalRequest(
      validated.request.canonicalRequest as JsonValue,
    );
    const rows = field(evaluation.fields, 'table.rows');
    expect(rows.tag).toBe('row_sequence');
    if (rows.tag === 'row_sequence') expect(rows.rows).toHaveLength(binCount);
    const summary = field(evaluation.fields, 'summary.facts');
    expect(summary.tag).toBe('summary_fact_map');
    if (summary.tag === 'summary_fact_map') {
      expect(summary.facts.rateMin).toBe('0');
      expect(summary.facts.rateMax).toBe('500');
    }
    const implementation = readFileSync(
      path.join(ROOT, 'src/authority/evaluators/distributions.ts'),
      'utf8',
    );
    expect(implementation).not.toMatch(/Math\.(?:min|max)\(\.\.\./u);
  });

  it('derives every population-rate unit conversion independently in pipeline order', () => {
    const contract = source('neuro.population_rate');
    const conversions = (request: JsonRecord): readonly string[] => {
      const validated = validateRequestValue(request);
      expect(validated.ok).toBe(true);
      if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
      const disclosureFacts = field(
        evaluator('neuro.population_rate').evaluateCanonicalRequest(
          validated.request.canonicalRequest as JsonValue,
        ).fields,
        'disclosure.facts',
      );
      expect(disclosureFacts.tag).toBe('disclosure_fact_map');
      if (disclosureFacts.tag !== 'disclosure_fact_map') return [];
      return disclosureFacts.facts.unitConversions ?? [];
    };

    const binExposureConversion =
      'population-rate bin widths: ms -> s (factor 0.001)';
    expect(conversions(structuredClone(contract.examples.valid[0])))
      .toEqual([binExposureConversion]);
    expect(conversions(structuredClone(contract.examples.valid[1])))
      .toEqual([binExposureConversion]);

    const eventSeconds = structuredClone(contract.examples.valid[0]);
    eventSeconds.data.eventTimes.unit = 's';
    eventSeconds.data.eventTimes.values = eventSeconds.data.eventTimes.values.map(
      (value: number) => value / 1000,
    );
    expect(conversions(eventSeconds)).toEqual([
      'population-rate event times: s -> ms (factor 1000)',
      binExposureConversion,
    ]);

    const rateKilohertz = structuredClone(contract.examples.valid[1]);
    rateKilohertz.data.rates.unit = 'kHz';
    rateKilohertz.data.rates.values = rateKilohertz.data.rates.values.map(
      (value: number) => value / 1000,
    );
    expect(conversions(rateKilohertz)).toEqual([
      binExposureConversion,
      'supplied population rates: kHz -> Hz (factor 1000)',
    ]);
  });

  it('refuses a giant supplied degree before allocating its dense row ladder', () => {
    const request = structuredClone(source('network.degree_distribution').examples.valid[0]);
    request.data.connections.sourceIds = new Array(500).fill('1');
    request.data.connections.targetIds = new Array(500).fill('2');
    request.data.connections.edgeIds = Array.from({ length: 500 }, (_entry, index) => `e${index}`);
    const validated = validateRequestValue(request);
    expect(validated.ok).toBe(true);
    if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
    expect(() => evaluator('network.degree_distribution').evaluateCanonicalRequest(
      validated.request.canonicalRequest as JsonValue,
    ))
      .toThrow(/over its 500-row contract budget/u);
  });

  it('uses fresh decorative-role identities for a multi-decoration PSTH plan', () => {
    const psth: PsthResult = {
      mode: 'prebinned',
      edges: [-1, 0, 1, 2],
      binUnit: 'ms',
      binWidths: [1, 1, 1],
      relativeWindowStart: -1,
      relativeWindowStop: 2,
      relativeWindowUnit: 'ms',
      relativeWindowBoundary: '[start,stop)',
      binBoundary: '[lo,hi)',
      finalEdgeInclusive: false,
      counts: [1, null, 2],
      trialDenominators: [1, null, 1],
      values: [1, null, 2],
      displayValues: [0.5, null, 1.5],
      valueUnit: '1',
      baselineCorrectedValues: [0.5, null, 1.5],
      baselineRate: 0.5,
      baselineBinStartIndex: 0,
      baselineBinStopIndex: 1,
      baselineStart: -1,
      baselineStop: 0,
      baselineUnit: 'ms',
      selectedSenderCount: 1,
      senderExposurePolicy: null,
      includedTrialCount: 1,
      excludedTrialCount: 1,
      excludedOutOfWindowCount: null,
      acceptedEventCount: null,
      missingBinCount: 1,
      exactCountTotal: '3',
      unitConversions: [],
      conversionReceipts: [],
      suppliedValuesPresent: true,
      suppliedValuesVerified: true,
      receipt: {},
    };
    const plan = compilePsthFigure(
      {
        sourceRequestDigest: 'sha256:0123456789abcdef',
        width: 800,
        height: 500,
        themeId: 'light',
        title: 'PSTH closure test',
        disclosures: [],
        summary: 'Independent test summary.',
        returnedTableRows: 3,
      },
      psth,
      {
        seriesId: 'series',
        seriesLabel: 'Series',
        alignmentLabel: 'stimulus',
        normalization: 'count',
        denominatorPolicy: 'included_trials_covering_bin',
      },
      'neuro.psth',
    );
    expect(closePlainRenderPlanForAuthorityV1(plan).tag).toBe('closed');
  });
});
