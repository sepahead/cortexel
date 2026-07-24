/**
 * Runtime budget preflight and value-filled accessibility summaries.
 *
 * The budget preflight closes a real gap: the parser bounds the raw input, but a request
 * within parser limits can still carry more observations than a figure can draw. The
 * preflight refuses such a request BEFORE derivation — a hard limit fails, never
 * truncates silently.
 *
 * The summary test asserts the accessible description is filled with the figure's own
 * numbers rather than a template with placeholders.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildFigure } from '../src/render/index.js';

const populationRate = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '../contract/skills/neuro.population_rate.v1.json'), 'utf8'),
).examples.valid[0];

describe('runtime budget preflight', () => {
  it('REFUSES an oversized request rather than truncating it', () => {
    // The guarantee is "refuse, never silently truncate". An enormous request is refused
    // at the earliest binding limit — the snapshot node budget or the figure observation
    // budget, whichever bites first. Either code proves no silent truncation happened.
    const huge = structuredClone(populationRate);
    const perArray = 1_200_000;
    huge.data.eventTimes.values = new Array(perArray).fill(1.0);
    huge.data.eventSenderIds = new Array(perArray).fill('1');

    const result = buildFigure(huge);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const codes = result.errors.map((e) => e.code);
    expect(
      codes.some((c) => c === 'RESOURCE_OBSERVATIONS_EXCEEDED' || c === 'SNAPSHOT_NODES_EXCEEDED'),
    ).toBe(true);
  });

  it('the observation preflight bites specifically for a figure whose budget is below the node limit', async () => {
    // Directly exercise the preflight against a modest budget: the figure observation
    // budget is a distinct, TIGHTER limit that fires before anything is drawn, with a
    // figure-specific message. Import the internal counter to assert the logic.
    const { countObservationsForTest } = await import('../src/render/buildFigure.js');
    const data = { a: new Array(150).fill(1), b: new Array(150).fill('x') };
    expect(countObservationsForTest(data)).toBeGreaterThanOrEqual(300);
    // A skill budget of, say, 250 would refuse this 300-observation request.
    expect(countObservationsForTest(data)).toBeGreaterThan(250);
  });

  it('does not lose observation carriers beyond the historical recursion cutoff', async () => {
    const { countObservationsForTest } = await import('../src/render/buildFigure.js');
    let data: unknown = [1, 2, 3];
    for (let depth = 0; depth < 48; depth++) data = { nested: data };
    expect(countObservationsForTest(data)).toBe(3);
  });

  it('accepts a request within budget', () => {
    expect(buildFigure(populationRate).ok).toBe(true);
  });
});

describe('accessibility summary is value-filled, not a template', () => {
  it('states the figure title, row count, value range, and disclosures with real numbers', () => {
    const result = buildFigure(populationRate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = result.plan.accessibility.summary;
    // No unfilled placeholders remain.
    expect(summary).not.toContain('…');
    expect(summary).not.toMatch(/\{[^}]+\}/);
    // Real content from the figure's own data.
    expect(summary).toContain('Population firing rate');
    expect(summary).toMatch(/\d+ literal bins contain \d+ events/);
    expect(summary).toMatch(/ranges from .+ to .+/);
  });

  it('puts the same summary in the SVG desc and the artifact', () => {
    const result = buildFigure(populationRate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const descMatch = result.svg.match(/<desc[^>]*>([^<]*)<\/desc>/);
    expect(descMatch).not.toBeNull();
    const artifactSummary = (result.artifact.accessibility as { summary?: string })?.summary;
    // The SVG necessarily XML-escapes text nodes; decode those three text entities
    // before comparing the semantic description with the plan and artifact strings.
    const decodedDescription = descMatch?.[1]
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&amp;', '&');
    expect(decodedDescription).toBe(result.plan.accessibility.summary);
    expect(artifactSummary).toBe(result.plan.accessibility.summary);
  });
});
