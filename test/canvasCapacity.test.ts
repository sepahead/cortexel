import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalDigest } from '../src/core/canonicalize.js';
import { validateRequestValue } from '../src/core/request.js';
import { SKILL_CATALOG, STABLE_SKILL_IDS, type StableSkillId } from '../src/generated/catalog.js';
import { buildFigure } from '../src/render/index.js';
import { allocateCanvas, type CompileContext } from '../src/render/compile.js';
import {
  legendTextLayout,
  headerTextLayout,
  RenderLayoutCapacityError,
  resolveCanvasHeight,
} from '../src/render/layout.js';
import { countPlanResources } from '../src/render/svg.js';

type Request = Record<string, any>;

function example(skill: StableSkillId, index = 0): Request {
  const source = JSON.parse(readFileSync(path.resolve(import.meta.dirname,
    `../contract/skills/${skill}.v1.json`), 'utf8'));
  return structuredClone(source.examples.valid[index]);
}

function automatic(request: Request): Request {
  const copy = structuredClone(request);
  copy.presentation = { ...(copy.presentation ?? {}), height: 'auto' };
  return copy;
}

function figure(request: Request) {
  const result = buildFigure(request);
  expect(result.ok, result.ok ? '' : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result as Omit<typeof result, 'artifact'> & { readonly artifact: Record<string, any> };
}

function layoutRefusal(request: Request): void {
  // The source and scientific contract remain valid; layout grants no science repair.
  expect(validateRequestValue(request).ok).toBe(true);
  const result = buildFigure(request);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Insufficient layout was accepted.');
  expect(result.errors).toContainEqual(expect.objectContaining({
    code: 'RENDER_LAYOUT_UNAVAILABLE', stage: 'render', instancePath: '/presentation',
  }));
  expect('svg' in result).toBe(false);
}

describe('closed automatic canvas request and replay', () => {
  it.each(STABLE_SKILL_IDS)('%s preserves the full source and exact auto/fixed dimension joins', (id) => {
    const request = automatic(example(id));
    const before = structuredClone(request);
    const explicitAuto = figure(request);
    const omitted = structuredClone(request);
    delete omitted.presentation.height;
    const implicitAuto = figure(omitted);
    expect(request).toEqual(before);
    expect(explicitAuto.svg).toBe(implicitAuto.svg);
    expect(explicitAuto.artifact).toEqual(implicitAuto.artifact);
    expect(explicitAuto.artifact.canonicalRequest.presentation.height).toBe('auto');
    expect(explicitAuto.artifact.canonicalRequest.data).toEqual(before.data);
    expect(explicitAuto.plan.height).toBeGreaterThanOrEqual(440);
    expect(explicitAuto.plan.height).toBeLessThanOrEqual(4096);
    expect(Number.isInteger(explicitAuto.plan.height)).toBe(true);
    expect(explicitAuto.artifact.render).toMatchObject({
      height: explicitAuto.plan.height, width: explicitAuto.plan.width,
      rendererId: SKILL_CATALOG[id].renderer.id,
      rendererRevision: SKILL_CATALOG[id].renderer.revision,
    });
    expect(explicitAuto.svg).toContain(`height="${explicitAuto.plan.height}"`);
    const token = validateRequestValue(explicitAuto.artifact.canonicalRequest);
    expect(token.ok).toBe(true);
    if (!token.ok) throw new Error('Canonical auto replay was refused.');
    expect(token.request.requestDigest).toBe(canonicalDigest(explicitAuto.artifact.canonicalRequest));
    expect(figure(explicitAuto.artifact.canonicalRequest as Request).svg).toBe(explicitAuto.svg);

    const fixed = structuredClone(request);
    fixed.presentation.height = 4096;
    const fixedFigure = figure(fixed);
    expect(fixedFigure.plan.height).toBe(4096);
    expect(fixedFigure.artifact.canonicalRequest.presentation.height).toBe(4096);
    expect(fixedFigure.artifact.provenance.requestDigest).not.toBe(explicitAuto.artifact.provenance.requestDigest);
    expect(fixedFigure.table).toEqual(explicitAuto.table);
    expect(fixedFigure.disclosures).toEqual(explicitAuto.disclosures);

    const stale = structuredClone(request);
    stale.skill.revision = SKILL_CATALOG[id].revision - 1;
    const refused = validateRequestValue(stale);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.errors).toContainEqual(expect.objectContaining({
      code: 'CONTRACT_SKILL_REVISION_UNSUPPORTED', stage: 'identity', instancePath: '/skill/revision',
    }));
    expect(buildFigure(stale).ok).toBe(false);
    stale.skill.revision = SKILL_CATALOG[id].revision;
    expect(figure(stale).artifact).toEqual(explicitAuto.artifact);
  });

  it.each([
    ['null', null], ['unknown token', 'AUTO'], ['numeric string', '440'],
    ['object', {}], ['array', []], ['below bound', 119], ['above bound', 4097], ['fraction', 440.5],
  ])(
    'refuses invalid height%s and retains the exact automatic counterpart', (_label, height) => {
      const request = automatic(example('neuro.response_curve'));
      request.presentation.height = height;
      expect(validateRequestValue(request).ok).toBe(false);
      expect(buildFigure(request).ok).toBe(false);
      request.presentation.height = 'auto';
      expect(figure(request).plan.height).toBe(440);
    },
  );
});

describe('complete content capacity precedes geometry', () => {
  it('keeps normative example0 separate from the retained authoring geometry reference', () => {
    const request = example('neuro.response_curve');
    request.presentation = { width: 720, height: 440 };
    const result = figure(request);
    expect(result.plan.panels[0]).toMatchObject({ y: 96, height: 138 });
    request.presentation.height = 349;
    layoutRefusal(request);
    request.presentation.height = 350;
    expect(figure(request).plan.panels[0].height).toBe(48);
  });

  it('grows the original footer-heavy example while refusing its unchanged explicit440 canvas', () => {
    const request = automatic(example('neuro.response_curve', 1));
    const adequate = figure(request);
    // Independently frozen source: margins116 + footer248 + three18px labels + plot48.
    expect(adequate.plan.height).toBe(466);
    expect(adequate.plan.panels[0]).toMatchObject({ y: 114, height: 48 });
    request.presentation.height = 440;
    layoutRefusal(request);
    request.presentation.height = 466;
    const restored = figure(request);
    expect(restored.plan.height).toBe(466);
    expect(restored.table).toEqual(adequate.table);
    expect(restored.disclosures).toEqual(adequate.disclosures);
    expect(restored.artifact.derivation).toEqual(adequate.artifact.derivation);
  });

  it('reserves every trace row and gap without shrinking rows or dropping a signal', () => {
    const request = automatic(example('neuro.multisignal_trace'));
    const result = figure(request);
    expect(result.plan.panels).toHaveLength(3);
    for (const panel of result.plan.panels) expect(panel.height).toBeGreaterThanOrEqual(48);
    const first = result.plan.panels[0];
    const second = result.plan.panels[1];
    const third = result.plan.panels[2];
    expect(second.y - first.y - first.height).toBe(22);
    expect(third.y - second.y - second.height).toBe(22);
    request.presentation.height = 120;
    layoutRefusal(request);
    request.presentation.height = 'auto';
    expect(figure(request).table).toEqual(result.table);
  });

  it('reserves the final grouped-bar labels and keeps the complete groups under fixed refusal', () => {
    const request = automatic(example('network.delay_distribution', 1));
    const result = figure(request);
    const labels = result.plan.legend!.map((entry) => entry.label);
    expect(labels.length).toBeGreaterThan(0);
    expect(result.plan.panels[0].y).toBe(60 + legendTextLayout(result.plan.width, labels).totalHeight);
    request.presentation.height = 120;
    layoutRefusal(request);
    request.presentation.height = 'auto';
    expect(figure(request).table).toEqual(result.table);
  });

  it('reserves actual phase qualifiers while retaining empty and restored finite curve semantics', () => {
    const request = automatic(example('neuro.phase_plane'));
    request.data.nullclines.labels = ['N'.repeat(120)];
    request.data.nullclines.x.values.fill(null);
    request.data.nullclines.y.values.fill(null);
    const missing = figure(request);
    expect(missing.plan.legend?.some((entry) => entry.label.endsWith('(declared; no drawable finite points)'))).toBe(true);
    const labels = missing.plan.legend!.map((entry) => entry.label);
    expect(missing.plan.panels[0].y).toBe(60 + headerTextLayout(missing.plan.width, missing.plan.title, missing.plan.subtitle).extraInset + legendTextLayout(missing.plan.width, labels).totalHeight);
    expect(missing.plan.panels[0].marks.some((mark) => mark.type === 'group' && mark.id.startsWith('nullcline-'))).toBe(false);
    const finite = example('neuro.phase_plane').data.nullclines;
    request.data.nullclines.x.values = finite.x.values;
    request.data.nullclines.y.values = finite.y.values;
    const restored = figure(request);
    expect(restored.plan.legend?.some((entry) => entry.label === 'N'.repeat(120))).toBe(true);
    expect(restored.plan.panels[0].marks.some((mark) => mark.type === 'group' && mark.id.startsWith('nullcline-'))).toBe(true);
    request.presentation.height = 120;
    layoutRefusal(request);
    request.presentation.height = 'auto';
    expect(figure(request).table).toEqual(restored.table);
  });

  it('refuses a real complete-header overflow and restores width without discarding64 scientific points', () => {
    const request = automatic(example('neuro.phase_plane'));
    const fixed = request.data.fixedPoints;
    fixed.ids = Array.from({ length: 64 }, (_v, index) => `point-${index}`);
    fixed.labels = fixed.ids.map(() => 'X'.repeat(120));
    for (const key of ['methods', 'converged']) fixed[key] = fixed.ids.map(() => fixed[key][0]);
    for (const key of ['x', 'y', 'residualDxDt', 'residualDyDt', 'toleranceDxDt', 'toleranceDyDt']) {
      const value = fixed[key].values[0];
      fixed[key].values = fixed.ids.map((_v: string, index: number) => key === 'x' ? -65 + index / 128 : value);
    }
    request.presentation.width = 160;
    layoutRefusal(request);
    request.presentation.width = 4096;
    const restored = figure(request);
    expect(restored.plan.height).toBeLessThanOrEqual(4096);
    expect(restored.table.rows.filter((row) => row[0] === 'fixed_point')).toHaveLength(64);
    expect(restored.plan.legend!.filter((entry) => entry.label.startsWith('X'.repeat(120)))).toHaveLength(64);
    expect(restored.artifact.canonicalRequest.data.fixedPoints).toEqual(fixed);
    const originalResidual = fixed.residualDxDt.values[0];
    const originalConverged = fixed.converged[0];
    request.data.fixedPoints.residualDxDt.values[0] = 1;
    // Request admission does not re-derive convergence. The figure builder owns it.
    expect(validateRequestValue(request).ok).toBe(true);
    const contradictory = buildFigure(request);
    expect(contradictory.ok).toBe(false);
    if (contradictory.ok) throw new Error('A contradictory convergence flag was accepted.');
    expect(contradictory.errors).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE', stage: 'science',
      instancePath: '/data/fixedPoints/converged/0',
    }));
    fixed.converged[0] = false;
    const unconverged = figure(request);
    expect(unconverged.table.rows.filter((row) => row[0] === 'fixed_point')).toHaveLength(64);
    const convergenceColumn = unconverged.table.columns.findIndex((column) => column.key === 'converged');
    expect(convergenceColumn).toBeGreaterThanOrEqual(0);
    expect(unconverged.table.rows.find((row) => row[0] === 'fixed_point' && row[1] === fixed.ids[0])?.[convergenceColumn]).toBe('false');
    expect(unconverged.plan.legend?.some((entry) => entry.label.endsWith('(unconverged candidate)'))).toBe(true);
    fixed.residualDxDt.values[0] = originalResidual;
    fixed.converged[0] = originalConverged;
    expect(figure(request).table).toEqual(restored.table);
  });

  it('keeps the exact4096 automatic bound and refuses non-finite or overflowing capacity with restored counterparts', () => {
    expect(resolveCanvasHeight(440, true, 4096)).toBe(4096);
    expect(() => resolveCanvasHeight(440, true, 4096.01)).toThrow(RenderLayoutCapacityError);
    expect(resolveCanvasHeight(440, true, 4096)).toBe(4096);
    for (const invalid of [NaN, Infinity, -Infinity, 0, -1]) {
      expect(() => resolveCanvasHeight(440, true, invalid)).toThrow(RenderLayoutCapacityError);
      expect(resolveCanvasHeight(440, true, 440)).toBe(440);
      expect(() => resolveCanvasHeight(invalid, true, 440)).toThrow(RenderLayoutCapacityError);
      expect(() => resolveCanvasHeight(invalid, false, 440)).toThrow(RenderLayoutCapacityError);
      expect(resolveCanvasHeight(440, false, 440)).toBe(440);
    }
    expect(resolveCanvasHeight(120, false, 4096)).toBe(120);
  });

  it.each([
    ['zero count', { panelCount: 0 }], ['fractional count', { panelCount: 1.5 }], ['non-finite count', { panelCount: NaN }],
    ['negative gap', { panelGap: -1 }], ['non-finite gap', { panelGap: Infinity }],
    ['zero minimum', { minimumPanelHeight: 0 }], ['non-finite minimum', { minimumPanelHeight: NaN }],
  ] as const)('refuses incomplete row capacity%s and retains an exact complete allocation', (_label, invalid) => {
    const context: CompileContext = {
      sourceRequestDigest: `sha256:${'0'.repeat(64)}`, width: 720, height: 440,
      automaticHeight: true, themeId: 'light', title: 'Capacity control',
      disclosures: [], sourceStatements: [], summary: 'Capacity only.', returnedTableRows: 1,
    };
    expect(() => allocateCanvas(context, invalid)).toThrow(RenderLayoutCapacityError);
    const restored = allocateCanvas(context, { panelCount: 3, panelGap: 22, minimumPanelHeight: 48 });
    expect(restored.context.height).toBe(440);
    expect(restored.box).toEqual({ x: 64, y: 60, width: 624, height: 314 });
    expect(context.height).toBe(440);
  });
});

describe('exact subtitles with empty legends and source-coordinate receipts', () => {
  it.each([
    ['unbroken', 'W'.repeat(120)],
    ['whitespace', '  declared   population  '.repeat(4)],
    ['Unicode', '膜電位 α β 🧠 '.repeat(8)],
  ])('reserves every exact %s header row without changing source values or resource limits', (_name, text) => {
    const request = automatic(example('neuro.response_curve'));
    request.presentation.width = 160;
    const ordinary = figure(request);
    request.presentation.title = text;
    request.presentation.subtitle = text;
    const result = figure(request);
    const layout = headerTextLayout(160, text, text);
    const title = result.svg.match(/<g data-header="title"[^>]*>([\s\S]*?)<\/g>/u)?.[1];
    const subtitle = result.svg.match(/<g data-header="subtitle"[^>]*>([\s\S]*?)<\/g>/u)?.[1];
    const textValues = (block: string | undefined) => [...(block ?? '').matchAll(/<text\b[^>]*>([^<]*)<\/text>/gu)].map((match) => match[1]);
    expect(textValues(title).join('')).toBe(text);
    expect(textValues(subtitle).join('')).toBe(text);
    expect(result.plan.title).toBe(text);
    expect(result.plan.subtitle).toBe(text);
    expect(result.artifact.canonicalRequest.presentation).toMatchObject({ title: text, subtitle: text, width: 160, height: 'auto' });
    expect(result.plan.panels[0].y).toBe(60 + layout.extraInset + 16 + legendTextLayout(160, result.plan.legend!.map((entry) => entry.label)).totalHeight);
    expect(result.table).toEqual(ordinary.table);
    expect(result.disclosures).toEqual(ordinary.disclosures);
    expect(result.artifact.derivation).toEqual(ordinary.artifact.derivation);
    expect(countPlanResources(result.plan).textCount).toBe((result.svg.match(/<text\b/gu) ?? []).length);
    const completeHeight = result.plan.height;
    request.presentation.height = 120;
    layoutRefusal(request);
    request.presentation.height = completeHeight;
    expect(figure(request).plan.height).toBe(completeHeight);
    request.presentation.height = 'auto';
    request.presentation.width = 720;
    const wide = figure(request);
    expect(wide.table).toEqual(result.table);
    expect(wide.artifact.derivation).toEqual(result.artifact.derivation);
    expect(wide.plan.title).toBe(text);
  });

  it.each(STABLE_SKILL_IDS)('%s preserves one complete subtitle and refuses unsafe or unknown subtitle inputs', (id) => {
    const request = example(id);
    request.presentation = { ...(request.presentation ?? {}), height: 4096 };
    const without = figure(request);
    request.presentation.subtitle = 'Complete caller subtitle';
    const withSubtitle = figure(request);
    expect(withSubtitle.plan.subtitle).toBe('Complete caller subtitle');
    expect(withSubtitle.svg.match(/<text\b[^>]*>Complete caller subtitle<\/text>/gu)).toHaveLength(1);
    expect(withSubtitle.table).toEqual(without.table);
    expect(withSubtitle.disclosures).toEqual(without.disclosures);
    expect(withSubtitle.plan.height).toBe(4096);
    expect(withSubtitle.plan.panels[0].y).toBe(without.plan.panels[0].y + 16);
    for (const value of [null, 'X'.repeat(121), 'unsafe\u202e subtitle']) {
      request.presentation.subtitle = value;
      const refused = validateRequestValue(request);
      expect(refused.ok).toBe(false);
      if (!refused.ok) expect(refused.errors.some((error) => error.instancePath === '/presentation/subtitle')).toBe(true);
      expect(buildFigure(request).ok).toBe(false);
      request.presentation.subtitle = 'Complete caller subtitle';
      expect(figure(request).svg).toBe(withSubtitle.svg);
    }
    request.presentation.subtitlePolicy = 'hidden';
    expect(validateRequestValue(request).ok).toBe(false);
    expect(buildFigure(request).ok).toBe(false);
    delete request.presentation.subtitlePolicy;
    expect(figure(request).svg).toBe(withSubtitle.svg);
  });

  it('reserves a no-legend subtitle once and keeps explicit height and all bins fixed', () => {
    const request = example('neuro.population_rate');
    request.presentation = { height: 1200 };
    const without = figure(request);
    expect(without.plan.legend ?? []).toHaveLength(0);
    expect(without.plan.panels[0].y).toBe(60);
    request.presentation.subtitle = 'Complete subtitle';
    const withSubtitle = figure(request);
    expect(withSubtitle.plan.height).toBe(1200);
    expect(withSubtitle.plan.panels[0].y).toBe(76);
    expect(withSubtitle.plan.panels[0].height).toBe(without.plan.panels[0].height - 16);
    expect(withSubtitle.plan.subtitle).toBe('Complete subtitle');
    expect(withSubtitle.svg).toContain('Complete subtitle');
    expect(withSubtitle.table).toEqual(without.table);
    request.presentation.height = 120;
    layoutRefusal(request);
    request.presentation.height = 1200;
    expect(figure(request).table).toEqual(withSubtitle.table);
  });

  it.each(['axisCalibration', 'seriesColorOrder'])('keeps deferred analog parameter %s outside this presentation repair', (field) => {
    const request = automatic(example('neuro.analog_trace'));
    const ordinary = figure(request);
    request.parameters[field] = {};
    expect(validateRequestValue(request).ok).toBe(false);
    expect(buildFigure(request).ok).toBe(false);
    delete request.parameters[field];
    expect(figure(request).artifact).toEqual(ordinary.artifact);
  });

  it('refuses the deferred calibration skill and restores the current analog request', () => {
    const request = automatic(example('neuro.analog_trace'));
    const ordinary = figure(request);
    request.skill.id = 'source.axis_calibration';
    expect(validateRequestValue(request).ok).toBe(false);
    expect(buildFigure(request).ok).toBe(false);
    request.skill.id = 'neuro.analog_trace';
    expect(figure(request).artifact).toEqual(ordinary.artifact);
  });
});
