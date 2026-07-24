import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { countPlanResources } from '../src/render/svg.js';
import { buildFigure } from '../src/render/index.js';
import {
  DISCLOSURE_HORIZONTAL_INSET,
  MIN_PLOT_PANEL_HEIGHT,
  disclosureAvailableWidth,
  disclosureLineCount,
  disclosureRenderedTextLength,
  wrapDisclosureText,
} from '../src/render/layout.js';

const responseExamples = (JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../contract/skills/neuro.response_curve.v1.json'),
    'utf8',
  ),
) as { examples: { valid: Record<string, any>[] } }).examples.valid;

function cardinalityOnlyResponse(): Record<string, any> {
  const example = responseExamples.find(
    (candidate) =>
      candidate.data?.eventScope?.kind === 'pooled_recorded_senders' &&
      candidate.data?.eventScope?.membershipBinding?.kind === 'cardinality_only',
  );
  if (!example) throw new Error('missing cardinality-only response-curve example');
  return structuredClone(example);
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function footerDisclosures(svg: string): Map<string, {
  readonly boundText: string;
  readonly visibleText: string;
  readonly textLengths: readonly number[];
  readonly yPositions: readonly number[];
}> {
  const found = new Map<string, {
    boundText: string;
    visibleText: string;
    textLengths: number[];
    yPositions: number[];
  }>();
  const groups = svg.matchAll(
    /<g data-disclosure-id="([^"]+)" data-disclosure-text="([^"]*)">([\s\S]*?)<\/g>/gu,
  );
  for (const match of groups) {
    const body = match[3];
    const visibleText = [...body.matchAll(
      /<text\b[^>]*data-disclosure-line="\d+"[^>]*>([\s\S]*?)<\/text>/gu,
    )]
      .map((line) => decodeXml(line[1]))
      .join('');
    const textLengths = [...body.matchAll(/\btextLength="([^"]+)"/gu)]
      .map((entry) => Number(entry[1]));
    const yPositions = [...body.matchAll(/<text\b[^>]*\by="([^"]+)"/gu)]
      .map((entry) => Number(entry[1]));
    found.set(match[1], {
      boundText: decodeXml(match[2]),
      visibleText,
      textLengths,
      yPositions,
    });
  }
  return found;
}

function decodedDescription(svg: string): string {
  const match = svg.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/u);
  if (!match) throw new Error('SVG has no accessible description');
  return decodeXml(match[1]);
}

describe('mandatory disclosure presentation surfaces', () => {
  it('wraps without changing a code point and bounds every rendered line', () => {
    const text =
      'Event-scope membership is cardinality-only. overlong_identifier_without_breaks 🧠 remains exact.';
    for (const width of [720, 160]) {
      const lines = wrapDisclosureText(text, width);
      expect(lines.join('')).toBe(text);
      expect(lines.every((line) => line.length > 0)).toBe(true);
      expect(lines.every(
        (line) => disclosureRenderedTextLength(line, width) <= disclosureAvailableWidth(width),
      )).toBe(true);
    }
  });

  it.each([
    { label: 'default width', width: 720, height: 440 },
    { label: 'minimum width', width: 160, height: 1600 },
  ])('keeps artifact, visible footer, SVG description, and table metadata exact at $label', ({ width, height }) => {
    const request = cardinalityOnlyResponse();
    request.presentation = {
      ...(request.presentation ?? {}),
      width,
      height,
    };
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const artifactDisclosures = result.artifact.disclosures as readonly {
      readonly id: string;
      readonly severity: string;
      readonly text: string;
    }[];
    const tableDisclosures = result.table.metadata?.disclosures;
    const footer = footerDisclosures(result.svg);
    const description = decodedDescription(result.svg);

    expect(result.disclosures.map((disclosure) => disclosure.id)).toContain(
      'EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY',
    );
    expect(artifactDisclosures).toEqual(result.disclosures);
    expect(tableDisclosures).toEqual(result.disclosures);
    expect(footer.size).toBe(result.disclosures.length);

    for (const disclosure of result.disclosures) {
      const visible = footer.get(disclosure.id);
      expect(visible?.boundText).toBe(disclosure.text);
      expect(visible?.visibleText).toBe(disclosure.text);
      expect(description).toContain(disclosure.text);
      expect(JSON.stringify(result.artifact)).toContain(JSON.stringify(disclosure.text));
      expect(visible?.textLengths.every(
        (length) => length <= disclosureAvailableWidth(width),
      )).toBe(true);
      expect(visible?.yPositions.every((y) => y >= 0 && y <= height)).toBe(true);
    }

    const footerLineCount = disclosureLineCount(width, result.disclosures);
    expect([...footer.values()].reduce(
      (count, disclosure) => count + disclosure.textLengths.length,
      0,
    )).toBe(footerLineCount);
    expect(result.plan.panels.every((panel) => panel.height >= MIN_PLOT_PANEL_HEIGHT)).toBe(true);
    expect((result.svg.match(/<text\b/gu) ?? []).length).toBe(
      countPlanResources(result.plan).textCount,
    );
    expect((result.artifact.render as { textCount: number }).textCount).toBe(
      countPlanResources(result.plan).textCount,
    );
    expect(result.svg).toContain(`x="${DISCLOSURE_HORIZONTAL_INSET}"`);
  });

  it('refuses a short minimum-width canvas instead of clipping mandatory text', () => {
    const request = cardinalityOnlyResponse();
    request.presentation = {
      ...(request.presentation ?? {}),
      width: 160,
      height: 440,
    };
    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'RENDER_LAYOUT_UNAVAILABLE',
      instancePath: '/presentation',
    }));
  });
});
