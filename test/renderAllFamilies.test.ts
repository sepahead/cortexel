/**
 * Every stable skill's first valid example must render to a real, deterministic SVG.
 *
 * This is the completeness guard for the render layer: it asserts that all 19 families
 * derive and compile end to end (no `renderPending`), that the SVG is byte-stable across
 * two runs, and that the artifact digest is well-formed. If a family compiler regresses,
 * this fails loudly rather than silently falling back to a pending state.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildFigure } from '../src/render/index.js';

const CONTRACT_SKILLS = path.resolve(import.meta.dirname, '../contract/skills');

const contracts = readdirSync(CONTRACT_SKILLS)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(path.join(CONTRACT_SKILLS, f), 'utf8')) as {
    id: string;
    examples: { valid: Record<string, unknown>[] };
  });

describe('every stable family renders end to end', () => {
  it.each(contracts.map((c) => [c.id, c] as const))('%s renders a deterministic SVG', (id, contract) => {
    const request = contract.examples.valid[0];
    const a = buildFigure(request);
    const b = buildFigure(request);

    expect(a.ok, `${id} did not build`).toBe(true);
    if (!a.ok || !b.ok) return;

    // No family is left in the honest-but-incomplete pending state.
    expect((a.artifact as { renderPending?: string }).renderPending, `${id} is still renderPending`).toBeUndefined();

    expect(a.svg.length, `${id} produced empty SVG`).toBeGreaterThan(0);
    expect(a.svg).toContain('<svg');
    expect(a.svg).toContain('</svg>');

    // Determinism: the same request yields byte-identical SVG.
    expect(a.svg, `${id} is not byte-deterministic`).toBe(b.svg);
    expect(a.artifact.artifactDigest).toBe(b.artifact.artifactDigest);
    expect(a.artifact.artifactDigest).toMatch(/^sha256:[0-9a-f]{64}$/);

    // Safety holds for every family, not just population rate.
    expect(a.svg).not.toMatch(/\son\w+=/);
    expect(a.svg).not.toContain('<script');
    expect(a.svg).not.toContain('foreignObject');
  });

  it('renders all 19 stable skills (no pending fallbacks)', () => {
    const pending = contracts.filter((c) => {
      const result = buildFigure(c.examples.valid[0]);
      return result.ok && (result.artifact as { renderPending?: string }).renderPending !== undefined;
    });
    expect(pending.map((c) => c.id)).toEqual([]);
  });
});
