/**
 * End-to-end render tests: a validated request becomes a deterministic, safe SVG.
 *
 * The two properties that matter are DETERMINISM (the same request yields byte-identical
 * SVG, because the bytes are normative and hashed) and SAFETY (a hostile label becomes
 * escaped text, never active content).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildFigure,
  buildFigureFromJson,
  buildFigureFromValidated,
  renderSvg,
} from '../src/render/index.js';
import { formatNumber, formatCoordinate } from '../src/render/format.js';
import { linearTicks } from '../src/render/scale.js';
import { canonicalDigestExcluding } from '../src/core/canonicalize.js';
import { isValidatedRequest, validateRequestValue } from '../src/core/request.js';
import { sha256Digest, utf8ByteLength } from '../src/core/sha256.js';

const populationRate = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../contract/skills/neuro.population_rate.v1.json'),
    'utf8',
  ),
).examples.valid[0];

describe('deterministic formatting', () => {
  it('never depends on locale or produces signed zero', () => {
    expect(formatNumber(1.5)).toBe('1.5');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(250)).toBe('250');
    expect(formatCoordinate(-0)).toBe('0');
    expect(formatCoordinate(1.23456789)).toBe('1.235');
  });

  it('produces round, deterministic ticks', () => {
    const ticks = linearTicks(0, 10, 5).map((t) => t.value);
    expect(ticks).toContain(0);
    expect(ticks).toContain(10);
    // The step is a nice number (2), so the labels are round.
    expect(ticks.every((v) => Number.isInteger(v))).toBe(true);
  });
});

describe('end-to-end render — population rate', () => {
  it('produces a well-formed SVG, a table, and an artifact', () => {
    const result = buildFigure(populationRate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('</svg>');
    expect(result.svg).toContain('cortexel-figure-artifact/1.0');
    expect(result.table.columns.map((c) => c.key)).toContain('value');
    expect(result.artifact.artifactDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('renders byte-identically across repeated runs', () => {
    // Determinism is the whole promise: no clock, no random id, no locale.
    const a = buildFigure(populationRate);
    const b = buildFigure(populationRate);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.svg).toBe(b.svg);
      expect(a.artifact.artifactDigest).toBe(b.artifact.artifactDigest);
    }
  });

  it('binds the SVG to the artifact by digest', () => {
    const result = buildFigure(populationRate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outputs = (result.artifact.outputs as {
      role: string;
      sha256: string;
      byteLength: number;
    }[]) ?? [];
    const svgOutput = outputs.find((o) => o.role === 'figure_svg');
    expect(svgOutput).toBeDefined();
    expect(svgOutput?.sha256).toBe(sha256Digest(result.svg));
    expect(svgOutput?.byteLength).toBe(utf8ByteLength(result.svg));
    expect(result.artifact.artifactDigest).toBe(
      canonicalDigestExcluding(result.artifact, 'artifactDigest'),
    );
    expect(Object.isFrozen(result.artifact)).toBe(true);
    expect(Object.isFrozen(result.artifact.accessibility as object)).toBe(true);
  });

  it('carries the simulation and reference-not-run disclosures', () => {
    const result = buildFigure(populationRate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.disclosures.map((d) => d.id);
    expect(ids).toContain('SOURCE_SIMULATION');
    expect(ids).toContain('REFERENCE_COMPARISON_NOT_RUN');
  });

  it('rejects an invalid request before rendering', () => {
    const result = buildFigure({ contract: { name: 'cortexel-figure-request', version: '1.0' }, skill: { id: 'neuro.population_rate' }, data: {}, parameters: {}, source: { kind: 'simulation' } });
    expect(result.ok).toBe(false);
  });
});

describe('validation authority is an immutable runtime capability', () => {
  it('mints a deeply frozen token whose identity cannot be copied', () => {
    const outcome = validateRequestValue(populationRate);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const token = outcome.request;
    expect(isValidatedRequest(token)).toBe(true);
    expect(Object.isFrozen(token)).toBe(true);
    expect(Object.isFrozen(token.canonicalRequest)).toBe(true);
    expect(Object.isFrozen(token.canonicalRequest.data as object)).toBe(true);

    const copied = { ...token };
    expect(isValidatedRequest(copied)).toBe(false);
    const copiedResult = buildFigureFromValidated(copied as never);
    expect(copiedResult).toMatchObject({
      ok: false,
      errors: [{ code: 'RENDER_UNVALIDATED_REQUEST', stage: 'render' }],
    });
  });

  it('does not execute proxy traps while refusing a forged token', () => {
    let reads = 0;
    const hostile = new Proxy(
      {},
      {
        get() {
          reads += 1;
          throw new Error('renderer inspected an untrusted proxy');
        },
      },
    );

    expect(() => buildFigureFromValidated(hostile as never)).not.toThrow();
    expect(buildFigureFromValidated(hostile as never)).toMatchObject({
      ok: false,
      errors: [{ code: 'RENDER_UNVALIDATED_REQUEST' }],
    });
    expect(reads).toBe(0);
  });

  it('prevents post-validation mutation of nested scientific data', () => {
    const outcome = validateRequestValue(populationRate);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const before = outcome.request.requestDigest;
    const data = outcome.request.canonicalRequest.data as {
      eventTimes: { values: number[] };
    };
    expect(() => data.eventTimes.values.push(99)).toThrow(TypeError);
    expect(outcome.request.requestDigest).toBe(before);
    expect(buildFigureFromValidated(outcome.request).ok).toBe(true);
  });
});

describe('SVG safety — a hostile label cannot become active content', () => {
  it('escapes XML metacharacters in a title rather than emitting markup', () => {
    const hostile = structuredClone(populationRate);
    hostile.presentation = { title: '<script>alert(1)</script>' };
    const result = buildFigure(hostile);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The angle brackets are escaped; no raw <script> element exists.
    expect(result.svg).not.toContain('<script>');
    expect(result.svg).toContain('&lt;script&gt;');
  });

  it('emits no event-handler attributes, foreignObject, or external references', () => {
    const result = buildFigure(populationRate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg).not.toMatch(/\son\w+=/); // no on* handlers
    expect(result.svg).not.toContain('foreignObject');
    expect(result.svg).not.toContain('xlink:href');
    expect(result.svg).not.toContain('<script');
    // The ONLY URL permitted anywhere in the output is the SVG namespace declaration.
    const urls = result.svg.match(/https?:\/\/[^\s"']+/g) ?? [];
    expect(urls.every((u) => u === 'http://www.w3.org/2000/svg')).toBe(true);
  });

  it('declares its metadata namespace and labels the request digest truthfully', () => {
    const result = buildFigure(populationRate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.svg).toContain('xmlns:cortexel="urn:cortexel:metadata:1"');
    expect(result.svg).toContain('<cortexel:requestDigest>sha256:');
    expect(result.svg).not.toContain('<cortexel:artifactDigest>');
  });

  it('rejects XML-forbidden display noncharacters before rendering', () => {
    for (const character of ['\ufffe', '\uffff']) {
      const invalid = structuredClone(populationRate);
      invalid.presentation = { title: `invalid${character}xml` };
      expect(() => buildFigure(invalid)).not.toThrow();
      expect(buildFigure(invalid).ok).toBe(false);
    }
  });

  it('records UTF-8 byte length rather than JavaScript string length', () => {
    const unicode = structuredClone(populationRate);
    unicode.presentation = { title: 'Population rate 🧪 µHz' };
    const result = buildFigure(unicode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const output = (result.artifact.outputs as { role: string; byteLength: number }[]).find(
      (item) => item.role === 'figure_svg',
    );
    expect(output?.byteLength).toBe(new TextEncoder().encode(result.svg).byteLength);
    expect(output?.byteLength).toBeGreaterThan(result.svg.length);
  });
});

describe('disclosure accessibility parity', () => {
  it('carries every mandatory disclosure verbatim in the artifact summary and SVG description', () => {
    const result = buildFigure(populationRate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = (result.artifact.accessibility as { summary: string }).summary;
    const descMatch = result.svg.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/u);
    expect(descMatch).not.toBeNull();
    const decodedDescription = (descMatch?.[1] ?? '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');

    for (const disclosure of result.disclosures) {
      expect(summary).toContain(disclosure.text);
      expect(decodedDescription).toContain(disclosure.text);
    }
    expect(result.plan.accessibility.summary).toBe(summary);
  });
});

describe('a pre-binned PSTH draws its counts, not an all-zero figure', () => {
  const psth = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../contract/skills/neuro.psth.v1.json'), 'utf8'),
  );
  const prebinned = psth.examples.valid.find(
    (e: { data: { mode?: string } }) => e.data.mode === 'prebinned',
  );

  it('renders non-zero bars aligned to the declared edges', () => {
    expect(prebinned).toBeDefined();
    const result = buildFigure(prebinned);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // One bar per bin (edges.length - 1), and at least one is non-zero — the prebinned
    // counts are drawn rather than ignored.
    const edges = prebinned.data.binEdges?.edges ?? prebinned.parameters.bins?.edges ?? [];
    const barValues = result.table.rows.map((row) => Number(row[row.length - 1]));
    expect(barValues.length).toBe(edges.length - 1);
    expect(barValues.some((v) => v > 0)).toBe(true);
  });
});

describe('end-to-end render — from raw JSON text', () => {
  it('renders from the strong duplicate-key-aware boundary', () => {
    const result = buildFigureFromJson(JSON.stringify(populationRate));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.svg).toContain('<svg');
  });
});
