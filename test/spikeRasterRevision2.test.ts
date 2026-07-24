import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';
import { countPlanResources } from '../src/render/svg.js';

const contract = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/skills/neuro.spike_raster.v1.json'),
  'utf8',
)) as {
  revision: number;
  renderer: { id: string; revision: number };
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

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&amp;/gu, '&');
}

describe('spike-raster revision 2 clock and render semantics', () => {
  it('publishes coordinated skill and renderer revision 2 identities', () => {
    expect(contract.revision).toBe(2);
    expect(contract.renderer).toEqual({ id: 'figure.spike_raster', revision: 2 });

    const current = example();
    current.skill.revision = 2;
    expect(validateRequestValue(current).ok).toBe(true);
    expect((built(current).artifact.render as any).rendererRevision).toBe(2);

    const stale = example();
    stale.skill.revision = 1;
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

  it('refuses an origin-relative interval whose exact endpoints collapse on the display clock', () => {
    const request = example();
    request.data.window = {
      ...request.data.window,
      origin: Number.MAX_VALUE,
      start: 0,
      stop: 1,
    };
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

  it('binds an origin-relative clock to the revision-2-admitted source profile', () => {
    for (const [mutate, path] of [
      [(request: any) => { request.source.system = 'nest'; }, '/source/system'],
      [(request: any) => { request.source.systemVersion = '3.11.0'; }, '/source/systemVersion'],
      [(request: any) => { delete request.source.sourceDigest; }, '/source/sourceDigest'],
    ] as const) {
      const request = example();
      mutate(request);
      const result = validateRequestValue(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual(expect.objectContaining({
          code: 'PROVENANCE_SOURCE_CLOCK_INCONSISTENT',
          instancePath: path,
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
