import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';
import { countPlanResources } from '../src/render/svg.js';
import { DISTRIBUTION_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/distributions.js';
import type { JsonValue } from '../src/core/parse-json.js';

const contract = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/skills/neuro.spike_raster.v1.json'),
  'utf8',
)) as {
  revision: number;
  renderer: { id: string; revision: number };
  outputAuthority: { evaluator: { id: string } };
  examples: { valid: Record<string, any>[] };
};

function example(index = 0): Record<string, any> {
  return structuredClone(contract.examples.valid[index]);
}

function built(request: Record<string, unknown>) {
  const result = buildFigure(request);
  if (!result.ok) {
    throw new Error(result.errors.map((error) =>
      `${error.code} ${error.instancePath}: ${error.message}`).join('\n'));
  }
  return result;
}

function operation(result: ReturnType<typeof built>): any {
  return (result.artifact.derivation as any).operations[0];
}

function authoritySummary(request: Record<string, unknown>): Readonly<Record<string, string>> {
  const validated = validateRequestValue(request);
  if (!validated.ok) {
    throw new Error(validated.errors.map((error) => error.message).join('\n'));
  }
  const evaluator = DISTRIBUTION_AUTHORITY_EVALUATORS.find(
    (candidate) => candidate.id === contract.outputAuthority.evaluator.id,
  );
  if (!evaluator) throw new Error('missing spike-raster OutputAuthority evaluator');
  const summary = evaluator.evaluateCanonicalRequest(
    validated.request.canonicalRequest as JsonValue,
  ).fields['summary.facts'];
  if (summary?.tag !== 'summary_fact_map') {
    throw new Error('spike-raster OutputAuthority did not return summary facts');
  }
  return summary.facts;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&amp;/gu, '&');
}

describe('spike-raster source-bound clock and render semantics', () => {
  it('publishes skill revision 6 and renderer revision 7 identities', () => {
    expect(contract.revision).toBe(6);
    expect(contract.renderer).toEqual({ id: 'figure.spike_raster', revision: 7 });

    const current = example();
    current.skill.revision = 6;
    expect(validateRequestValue(current).ok).toBe(true);
    expect((built(current).artifact.render as any).rendererRevision).toBe(7);

    const stale = example();
    stale.skill.revision = 5;
    const result = validateRequestValue(stale);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'CONTRACT_SKILL_REVISION_UNSUPPORTED',
        instancePath: '/skill/revision',
      }));
    }
  });

  it('accepts the NEST closed stop and rejects its open start at nonzero origin', () => {
    const atStop = example();
    atStop.data.window = {
      ...atStop.data.window,
      origin: 100.25,
      start: 0.5,
      stop: 10.75,
    };
    atStop.data.window.captureAuthority.runtimeStatus
      .captureBiologicalTimeTics = '111000';
    atStop.data.window.captureAuthority.recordingGrid = {
      originTics: '100250',
      startTics: '500',
      stopTics: '10750',
    };
    atStop.data.window.captureAuthority.bufferEpoch
      .beganAtBiologicalTimeTics = '100250';
    atStop.data.window.captureAuthority.recordingPlan
      .lastMutationAtBiologicalTimeTics = '100750';
    atStop.data.eventTimes.values = [111];
    atStop.data.eventSenderIds = ['1'];
    expect(validateRequestValue(atStop).ok).toBe(true);
    const stopFigure = built(atStop);
    expect(operation(stopFigure).receipt).toMatchObject({
      acceptedEventCount: 1,
      excludedOutOfWindow: 0,
      displayStart: 100.75,
      displayStop: 111,
    });

    const atStart = structuredClone(atStop);
    atStart.data.eventTimes.values = [100.75];
    const refused = validateRequestValue(atStart);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
        instancePath: '/data/eventTimes/values/0',
      }));
    }
  });

  it('treats positive infinity as a distinct capture-bounded prefix with a closed capture endpoint', () => {
    const request = example(3);
    expect(validateRequestValue(request).ok).toBe(true);

    const result = built(request);
    expect(operation(result)).toMatchObject({
      algorithm: 'cortexel.spike_raster.source_bound_window_partition.v4',
      algorithmRevision: 4,
      receipt: {
        acceptedEventCount: 2,
        excludedOutOfWindow: 0,
        displayStart: 7,
        displayStop: 10,
        sourceClockMode: 'nest_3_10_0_memory_native_binary64_ms_positive_infinity_capture_bounded',
      },
    });

    for (const id of [
      'NEST_SERIALIZED_CLOCK_BOUNDARY',
      'NEST_CAPTURE_BOUNDED_POSITIVE_INFINITY',
    ]) {
      const disclosure = result.disclosures.find((entry) => entry.id === id);
      expect(disclosure, id).toBeDefined();
      if (!disclosure) continue;
      expect(result.artifact.disclosures as any[]).toContainEqual(expect.objectContaining({
        id,
        text: disclosure.text,
      }));
      expect(result.svg).toContain(`data-disclosure-id="${id}"`);
      expect(decodeXml(result.svg)).toContain(disclosure.text);
      expect(result.table.metadata?.disclosures).toContainEqual({
        id,
        severity: disclosure.severity,
        text: disclosure.text,
      });
    }
  });

  it('projects a finite 0.1 + 0.7 stop from combined NEST tics and accepts the closed 0.8 endpoint', () => {
    const request = example();
    request.data.window.origin = 0.1;
    request.data.window.start = 0.2;
    request.data.window.stop = 0.7000000000000001;
    request.data.window.captureAuthority.runtimeStatus.resolutionMs = 0.1;
    request.data.window.captureAuthority.runtimeStatus.resolutionTics = '100';
    request.data.window.captureAuthority.runtimeStatus.captureBiologicalTimeTics = '800';
    request.data.window.captureAuthority.recordingGrid = {
      originTics: '100',
      startTics: '200',
      stopTics: '700',
    };
    request.data.window.captureAuthority.bufferEpoch.beganAtBiologicalTimeTics = '0';
    request.data.window.captureAuthority.recordingPlan.lastMutationAtBiologicalTimeTics = '0';
    request.data.eventTimes.values = [0.8];
    request.data.eventSenderIds = ['1'];

    expect(validateRequestValue(request).ok).toBe(true);
    const result = built(request);
    expect(operation(result)).toMatchObject({
      algorithm: 'cortexel.spike_raster.source_bound_window_partition.v4',
      algorithmRevision: 4,
      parameters: {
        nestEndpointProjection: {
          algorithm: 'nest_3_10_time_get_ms_binary64_reciprocal_then_multiply.v1',
          ticsPerMs: '1000',
          resolutionTics: '100',
          lowerEndpointTics: '300',
          upperEndpointTics: '800',
          lowerMilliseconds: 0.3,
          upperMilliseconds: 0.8,
        },
      },
      receipt: {
        acceptedEventCount: 1,
        excludedOutOfWindow: 0,
        displayStart: 0.3,
        displayStop: 0.8,
      },
    });
    expect(authoritySummary(request)).toMatchObject({
      windowStart: '0.3',
      windowStop: '0.8',
      markCount: '1',
      excludedCount: '0',
    });
  });

  it('binds the real NEST 0.7 ms resolution export to its source-faithful binary64 value', () => {
    const request = example();
    request.data.window.origin = 0;
    request.data.window.start = 0.7000000000000001;
    request.data.window.stop = 1.4000000000000001;
    request.data.window.captureAuthority.runtimeStatus.resolutionMs = 0.7000000000000001;
    request.data.window.captureAuthority.runtimeStatus.resolutionTics = '700';
    request.data.window.captureAuthority.runtimeStatus.captureBiologicalTimeTics = '1400';
    request.data.window.captureAuthority.recordingGrid = {
      originTics: '0',
      startTics: '700',
      stopTics: '1400',
    };
    request.data.window.captureAuthority.bufferEpoch.beganAtBiologicalTimeTics = '0';
    request.data.window.captureAuthority.recordingPlan.lastMutationAtBiologicalTimeTics = '0';
    request.data.eventTimes.values = [1.4000000000000001];
    request.data.eventSenderIds = ['1'];
    expect(validateRequestValue(request).ok).toBe(true);

    const exactRationalImpostor = structuredClone(request);
    exactRationalImpostor.data.window.captureAuthority.runtimeStatus.resolutionMs = 0.7;
    exactRationalImpostor.data.eventTimes.values = [-1];
    const rejected = validateRequestValue(exactRationalImpostor);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.errors).toContainEqual(expect.objectContaining({
        code: 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
        instancePath: '/data/window/captureAuthority/runtimeStatus/resolutionMs',
      }));
      expect(rejected.errors).not.toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
      }));
    }
  });

  it('projects a positive-infinity 0.1 + 0.7 start from combined NEST tics and rejects the open 0.8 endpoint', () => {
    const request = example(3);
    request.data.window.origin = 0.1;
    request.data.window.start = 0.7000000000000001;
    request.data.window.captureTime = 1;
    request.data.window.captureAuthority.runtimeStatus.resolutionMs = 0.1;
    request.data.window.captureAuthority.runtimeStatus.resolutionTics = '100';
    request.data.window.captureAuthority.runtimeStatus.captureBiologicalTimeTics = '1000';
    request.data.window.captureAuthority.recordingGrid = {
      originTics: '100',
      startTics: '700',
    };
    request.data.window.captureAuthority.bufferEpoch.beganAtBiologicalTimeTics = '0';
    request.data.window.captureAuthority.recordingPlan.lastMutationAtBiologicalTimeTics = '0';
    request.data.eventTimes.values = [0.8];
    request.data.eventSenderIds = ['1'];

    const rejected = validateRequestValue(request);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
        instancePath: '/data/eventTimes/values/0',
      }));
    }

    request.parameters.outOfWindowPolicy = 'exclude_and_disclose';
    const result = built(request);
    expect(operation(result)).toMatchObject({
      algorithm: 'cortexel.spike_raster.source_bound_window_partition.v4',
      algorithmRevision: 4,
      parameters: {
        nestEndpointProjection: {
          lowerEndpointTics: '800',
          upperEndpointTics: '1000',
          lowerMilliseconds: 0.8,
          upperMilliseconds: 1,
        },
      },
      receipt: {
        acceptedEventCount: 0,
        excludedOutOfWindow: 1,
        displayStart: 0.8,
        displayStop: 1,
      },
    });
    expect(authoritySummary(request)).toMatchObject({
      windowStart: '0.8',
      windowStop: '1',
      markCount: '0',
      excludedCount: '1',
    });
  });

  it('uses the real NEST wheel boundary when separately projected binary64 components round to a different sum', () => {
    const sourceBoundary = 0.7000000000000001;
    expect(0.1 + 0.6).toBe(0.7);
    expect(sourceBoundary).toBeGreaterThan(0.1 + 0.6);

    const finite = example();
    finite.data.window.origin = 0.1;
    finite.data.window.start = 0;
    finite.data.window.stop = 0.6;
    finite.data.window.captureAuthority.runtimeStatus.resolutionMs = 0.1;
    finite.data.window.captureAuthority.runtimeStatus.resolutionTics = '100';
    finite.data.window.captureAuthority.runtimeStatus
      .captureBiologicalTimeTics = '700';
    finite.data.window.captureAuthority.recordingGrid = {
      originTics: '100',
      startTics: '0',
      stopTics: '600',
    };
    finite.data.window.captureAuthority.bufferEpoch
      .beganAtBiologicalTimeTics = '0';
    finite.data.window.captureAuthority.recordingPlan
      .lastMutationAtBiologicalTimeTics = '0';
    finite.data.eventTimes.values = [sourceBoundary];
    finite.data.eventSenderIds = ['1'];

    expect(validateRequestValue(finite).ok).toBe(true);
    expect(operation(built(finite))).toMatchObject({
      parameters: {
        nestEndpointProjection: {
          upperEndpointTics: '700',
          upperMilliseconds: sourceBoundary,
        },
      },
      receipt: {
        acceptedEventCount: 1,
        excludedOutOfWindow: 0,
        displayStop: sourceBoundary,
      },
    });

    const captureBounded = example(3);
    captureBounded.data.window.origin = 0.1;
    captureBounded.data.window.start = 0.6;
    captureBounded.data.window.captureTime = 1;
    captureBounded.data.window.captureAuthority.runtimeStatus.resolutionMs = 0.1;
    captureBounded.data.window.captureAuthority.runtimeStatus.resolutionTics = '100';
    captureBounded.data.window.captureAuthority.runtimeStatus
      .captureBiologicalTimeTics = '1000';
    captureBounded.data.window.captureAuthority.recordingGrid = {
      originTics: '100',
      startTics: '600',
    };
    captureBounded.data.window.captureAuthority.bufferEpoch
      .beganAtBiologicalTimeTics = '0';
    captureBounded.data.window.captureAuthority.recordingPlan
      .lastMutationAtBiologicalTimeTics = '0';
    captureBounded.data.eventTimes.values = [sourceBoundary];
    captureBounded.data.eventSenderIds = ['1'];

    const rejected = validateRequestValue(captureBounded);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
        instancePath: '/data/eventTimes/values/0',
      }));
    }
  });

  it('keeps the positive-infinity start open and capture endpoint closed', () => {
    for (const [time, accepted] of [[7, false], [7.125, true], [10, true], [10.125, false]] as const) {
      const request = example(3);
      request.data.eventTimes.values = [time];
      request.data.eventSenderIds = ['1'];
      const result = validateRequestValue(request);
      expect(result.ok, `time=${time}`).toBe(accepted);
      if (!accepted && !result.ok) {
        expect(result.errors).toContainEqual(expect.objectContaining({
          code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
          instancePath: '/data/eventTimes/values/0',
        }));
      }
    }
  });

  it('rejects a degenerate positive-infinity capture and fabricated stop-tic authority', () => {
    const degenerate = example(3);
    degenerate.data.window.captureTime = 7;
    degenerate.data.window.captureAuthority.runtimeStatus.captureBiologicalTimeTics = '7000';
    const invalidWindow = validateRequestValue(degenerate);
    expect(invalidWindow.ok).toBe(false);
    if (!invalidWindow.ok) {
      expect(invalidWindow.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_WINDOW_INVALID',
        validatorId: 'window.valid',
        instancePath: '/data/window/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
      }));
    }

    const fabricatedStop = example(3);
    fabricatedStop.data.window.captureAuthority.recordingGrid.stopTics = '10000';
    const invalidShape = validateRequestValue(fabricatedStop);
    expect(invalidShape.ok).toBe(false);
    if (!invalidShape.ok) {
      expect(invalidShape.errors).toContainEqual(expect.objectContaining({
        code: 'SCHEMA_UNKNOWN_PROPERTY',
        instancePath: '/data/window/captureAuthority/recordingGrid/stopTics',
      }));
    }
  });

  it('emits one actionable primitive diagnostic and skips derived noise for each unsafe clock scale', () => {
    for (const field of ['ticsPerMs', 'resolutionTics'] as const) {
      const request = example();
      request.data.window.captureAuthority.runtimeStatus[field] = '9007199254740992';
      const result = validateRequestValue(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const sourceErrors = result.errors.filter(
          (error) => error.code === 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
        );
        expect(sourceErrors, field).toEqual([
          expect.objectContaining({
            instancePath: `/data/window/captureAuthority/runtimeStatus/${field}`,
            validatorId: 'window.valid',
          }),
        ]);
        expect(result.errors, field).not.toContainEqual(expect.objectContaining({
          code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        }));
        expect(result.errors, field).not.toContainEqual(expect.objectContaining({
          code: 'SCIENCE_WINDOW_INVALID',
        }));
      }
    }
  });

  it('reports every independently unsafe primitive without derived clock noise', () => {
    const request = example();
    const unsafe = '9007199254740992';
    request.data.window.captureAuthority.runtimeStatus.ticsPerMs = unsafe;
    request.data.window.captureAuthority.runtimeStatus.resolutionTics = unsafe;
    request.data.window.captureAuthority.runtimeStatus
      .captureBiologicalTimeTics = unsafe;
    request.data.eventTimes.values = [-1];
    request.data.eventSenderIds = ['1'];

    const result = validateRequestValue(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.filter(
        (error) => error.code === 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
      )).toEqual([
        expect.objectContaining({
          instancePath:
            '/data/window/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
          validatorId: 'window.valid',
        }),
        expect.objectContaining({
          instancePath: '/data/window/captureAuthority/runtimeStatus/resolutionTics',
          validatorId: 'window.valid',
        }),
        expect.objectContaining({
          instancePath: '/data/window/captureAuthority/runtimeStatus/ticsPerMs',
          validatorId: 'window.valid',
        }),
      ]);
      expect(result.errors).not.toContainEqual(expect.objectContaining({
        code: 'SCIENCE_WINDOW_INVALID',
      }));
      expect(result.errors).not.toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      }));
      expect(result.errors).not.toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
      }));
    }
  });

  it('still checks exact endpoint order when an unrelated resolution declaration is unsafe', () => {
    const request = example();
    request.data.window.start = 1;
    request.data.window.stop = 0.5;
    request.data.window.captureAuthority.runtimeStatus.resolutionTics =
      '9007199254740992';
    request.data.window.captureAuthority.recordingGrid.startTics = '1000';
    request.data.window.captureAuthority.recordingGrid.stopTics = '500';

    const result = validateRequestValue(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
        instancePath:
          '/data/window/captureAuthority/runtimeStatus/resolutionTics',
        validatorId: 'window.valid',
      }));
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_WINDOW_INVALID',
        instancePath: '/data/window/captureAuthority/recordingGrid/stopTics',
        validatorId: 'window.valid',
      }));
      expect(result.errors).not.toContainEqual(expect.objectContaining({
        code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
      }));
    }
  });

  it('refuses a NEST endpoint that aliases an adjacent source resolution-grid time', () => {
    const request = example();
    const upperTics = '9007199254740990';
    request.data.window.origin = 0;
    request.data.window.start = 0;
    request.data.window.stop = Number(upperTics) * (1 / 1000);
    request.data.window.captureAuthority.runtimeStatus.resolutionMs = 0.001;
    request.data.window.captureAuthority.runtimeStatus.resolutionTics = '1';
    request.data.window.captureAuthority.runtimeStatus.captureBiologicalTimeTics = upperTics;
    request.data.window.captureAuthority.recordingGrid = {
      originTics: '0',
      startTics: '0',
      stopTics: upperTics,
    };
    request.data.window.captureAuthority.bufferEpoch.beganAtBiologicalTimeTics = '0';
    request.data.window.captureAuthority.recordingPlan.lastMutationAtBiologicalTimeTics = '0';
    request.data.eventTimes.values = [];
    request.data.eventSenderIds = [];
    const result = validateRequestValue(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        validatorId: 'window.valid',
      }));
    }
  });

  it('binds an origin-relative clock to executable mapping profile 5', () => {
    for (const [mutate, path] of [
      [(request: any) => { request.source.system = 'nest'; }, '/source/system'],
      [(request: any) => { request.source.systemVersion = '3.11.0'; }, '/source/systemVersion'],
      [(request: any) => { delete request.source.sourceDigest; }, '/source/sourceDigest'],
    ] as const) {
      const request = example();
      request.data.eventTimes.values = [-1];
      request.data.eventSenderIds = ['1'];
      mutate(request);
      const result = validateRequestValue(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual(expect.objectContaining({
          code: 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
          instancePath: path,
        }));
        expect(result.errors).not.toContainEqual(expect.objectContaining({
          code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
        }));
      }
    }

    const relative = example();
    relative.data.timeBase = 'trial_relative';
    relative.data.alignmentLabel = 'invented trial boundary';
    relative.data.eventTrialIds = relative.data.eventTimes.values.map(() => 't1');
    relative.data.trialIds = ['t1'];
    const structurallyRefused = validateRequestValue(relative);
    expect(structurallyRefused.ok).toBe(false);
    if (!structurallyRefused.ok) {
      expect(structurallyRefused.errors).toContainEqual(expect.objectContaining({
        code: 'SCHEMA_ENUM_MISMATCH',
        instancePath: '/data/timeBase',
      }));
    }
  });

  it('converts generic window endpoints once into the event unit and places the midpoint exactly', () => {
    const request = example(2);
    request.data.eventTimes = { kind: 'time', unit: 'ms', values: [500] };
    request.data.eventSenderIds = ['1'];
    request.data.recordedSenderIds = ['1'];
    request.data.window = {
      start: 0,
      stop: 1,
      unit: 's',
      boundary: '[start,stop)',
    };
    request.parameters.markStyle = 'tick';
    const result = built(request);
    expect(operation(result).receipt).toMatchObject({
      displayStart: 0,
      displayStop: 1000,
      displayUnit: 'ms',
      acceptedEventCount: 1,
    });
    const rule = result.plan.panels[0].marks.find((mark) => mark.type === 'rule');
    expect(rule?.type).toBe('rule');
    if (rule?.type === 'rule') {
      expect(rule.lines).toHaveLength(1);
      expect(rule.lines[0].position).toBe(
        result.plan.panels[0].x + result.plan.panels[0].width / 2,
      );
    }
    expect(result.disclosures.map((entry) => entry.id)).toContain('UNIT_CONVERTED');
  });

  it('excludes only marks, retains every source row, and discloses the exact count', () => {
    const request = example(2);
    request.data.eventTimes.values = [-1, 0, 5, 10, 11];
    request.data.eventSenderIds = ['1', '1', '1', '1', '1'];
    request.data.recordedSenderIds = ['1'];
    request.parameters.markStyle = 'point';
    request.parameters.outOfWindowPolicy = 'exclude_and_disclose';
    const result = built(request);

    expect(countPlanResources(result.plan).markCount).toBe(2);
    expect(result.table.rowsTotal).toBe(5);
    const membershipColumn = result.table.columns.findIndex((column) => column.key === 'inWindow');
    expect(result.table.rows.map((row) => row[membershipColumn])).toEqual([
      'false', 'true', 'true', 'false', 'false',
    ]);
    expect(operation(result).receipt).toMatchObject({
      sourceEventCount: 5,
      acceptedEventCount: 2,
      excludedOutOfWindow: 3,
      drawnMarkCount: 2,
    });
    expect(result.disclosures).toContainEqual(expect.objectContaining({
      id: 'EVENTS_EXCLUDED_OUT_OF_WINDOW',
      text: '3 observations fell outside the declared observation window and are excluded from this analysis.',
    }));
  });

  it('allocates the full sender-by-trial row product, including an empty trial', () => {
    const result = built(example(1));
    expect(operation(result).receipt.rowCount).toBe(4);
    expect(result.table.rows.map((row) => row[0])).toEqual([0, 2, 1, 3]);
    const leftAxis = result.plan.panels[0].axes.find((axis) => axis.orientation === 'left');
    expect(leftAxis?.ticks.map((tick) => tick.label)).toContain('7 / t4');
    const point = result.plan.panels[0].marks.find((mark) => mark.type === 'point');
    expect(point?.type === 'point' ? point.points.length : 0).toBe(4);
  });

  it('refuses a declared trial universe without positionally parallel event trials', () => {
    const request = example();
    request.data.trialIds = ['t1', 't2'];
    delete request.data.eventTrialIds;

    const result = validateRequestValue(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'SCHEMA_REQUIRED_PROPERTY_MISSING',
        instancePath: '/data/eventTrialIds',
      }));
    }
  });

  it('refuses a 100000-by-1000 silent row universe before allocating its product', () => {
    const request = example(1);
    request.data.eventTimes.values = [];
    request.data.eventSenderIds = [];
    request.data.eventTrialIds = [];
    request.data.eventIds = [];
    request.data.recordedSenderIds = Array.from(
      { length: 100_000 },
      (_value, index) => `s${index}`,
    );
    request.data.trialIds = Array.from(
      { length: 1_000 },
      (_value, index) => `t${index}`,
    );

    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'RESOURCE_BUDGET_EXCEEDED',
        stage: 'budget',
        instancePath: '/data/recordedSenderIds',
        limit: { name: 'rasterRows', limit: 100_000, observed: 100_001 },
      }));
    }
  }, 20_000);

  it('groups many distinct populations in one pass within the row bound', () => {
    const request = example();
    const senderCount = 20_000;
    request.data.eventTimes.values = [];
    request.data.eventSenderIds = [];
    request.data.recordedSenderIds = Array.from(
      { length: senderCount },
      (_value, index) => `s${index}`,
    );
    request.data.senderPopulationIds = Array.from(
      { length: senderCount },
      (_value, index) => `p${index}`,
    );
    request.parameters.rowOrder = 'grouped_by_population';

    const result = built(request);
    expect(operation(result).receipt).toMatchObject({ rowCount: senderCount });
    expect(result.table.rowsTotal).toBe(0);
  }, 20_000);

  it('binds the mandatory NEST clock disclosure to artifact, footer, description, and table', () => {
    const result = built(example());
    const disclosure = result.disclosures.find(
      (entry) => entry.id === 'NEST_SERIALIZED_CLOCK_BOUNDARY',
    );
    expect(disclosure).toBeDefined();
    if (!disclosure) return;

    expect((result.artifact.disclosures as any[])).toContainEqual(expect.objectContaining({
      id: disclosure.id,
      text: disclosure.text,
    }));
    expect(result.svg).toContain('data-disclosure-id="NEST_SERIALIZED_CLOCK_BOUNDARY"');
    expect(decodeXml(result.svg)).toContain(disclosure.text);
    expect(result.table.metadata?.disclosures).toContainEqual({
      id: disclosure.id,
      severity: disclosure.severity,
      text: disclosure.text,
    });
  });

  it('fails closed instead of advertising unavailable density compaction or a missing sidecar', () => {
    const density = example();
    density.parameters.aboveMarkBudget = 'density_grid';
    const unsupported = validateRequestValue(density);
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) {
      expect(unsupported.errors).toContainEqual(expect.objectContaining({
        code: 'SCHEMA_ENUM_MISMATCH',
        instancePath: '/parameters/aboveMarkBudget',
      }));
    }

    const overInline = example();
    overInline.data.eventTimes.values = new Array<number>(501).fill(1);
    overInline.data.eventSenderIds = new Array<string>(501).fill('1');
    const result = buildFigure(overInline);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'RESOURCE_COMPACTION_UNAVAILABLE',
        stage: 'budget',
        instancePath: '/data/eventTimes/values',
        limit: { name: 'returnedTableRows', limit: 500, observed: 501 },
      }));
    }
  });
});
