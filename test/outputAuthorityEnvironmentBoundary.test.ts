import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildFigure } from '../src/render/buildFigure.js';
import { extractObservedOutputAuthorityV1 } from '../src/render/output-authority-extract.js';
import type { RenderPlanV1 } from '../src/render/model/renderPlan.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');

function analogExample(): JsonRecord {
  const source = JSON.parse(readFileSync(
    path.join(ROOT, 'contract/skills/neuro.analog_trace.v1.json'),
    'utf8',
  ));
  return structuredClone(source.examples.valid[0]);
}

function adjacencyExample(): JsonRecord {
  const source = JSON.parse(readFileSync(
    path.join(ROOT, 'contract/skills/network.adjacency_matrix.v1.json'),
    'utf8',
  ));
  return structuredClone(source.examples.valid[0]);
}

/**
 * Project the trusted plan extractor's observed geometry onto the exact V1
 * carrier-only assurance: ordered class and request-derived provenance, never paint
 * coordinates. Mandatory footer text may legitimately reserve a different plot box.
 */
function scientificCarrierSequence(plan: RenderPlanV1): readonly unknown[] {
  const extraction = extractObservedOutputAuthorityV1(plan);
  if (extraction.tag !== 'extracted') {
    throw new Error(`valid emitted plan failed authority extraction: ${JSON.stringify(extraction.problems)}`);
  }
  const carriers: unknown[] = [];
  const pending = [...extraction.observed.geometry].reverse();
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.tag === 'group') {
      for (let index = node.children.length - 1; index >= 0; index--) {
        pending.push(node.children[index]);
      }
    } else if (node.tag === 'data_mark') {
      carriers.push({
        tag: 'carrier',
        classId: node.entry.classId,
        provenance: node.entry.provenance,
      });
    }
  }
  return carriers;
}

describe('OutputAuthority library-environment boundary', () => {
  it('derives a host-tighter profile at the gate without changing request-bound science', () => {
    const request = analogExample();
    const standard = buildFigure(structuredClone(request), { budgetProfile: 'standard' });
    const agent = buildFigure(structuredClone(request), { budgetProfile: 'agent' });
    expect(standard.ok).toBe(true);
    expect(agent.ok).toBe(true);
    if (!standard.ok || !agent.ok) return;

    expect((standard.artifact.provenance as JsonRecord).requestDigest).toBe(
      (agent.artifact.provenance as JsonRecord).requestDigest,
    );
    expect(standard.table.columns).toEqual(agent.table.columns);
    expect(standard.table.rows).toEqual(agent.table.rows);
    expect(scientificCarrierSequence(standard.plan)).toEqual(
      scientificCarrierSequence(agent.plan),
    );
    expect(standard.disclosures.map((entry) => entry.id))
      .not.toContain('NONSTANDARD_BUDGET_PROFILE');
    expect(agent.disclosures).toContainEqual(expect.objectContaining({
      id: 'NONSTANDARD_BUDGET_PROFILE',
      text: expect.stringContaining('(agent)'),
    }));
    expect(agent.plan.accessibility.summary).toContain(
      'Rendered under a non-default budget profile (agent).',
    );
    // The overall requested canvas stays fixed, while the additional mandatory footer
    // receives real space instead of overlapping data. Geometry/SVG are consequently
    // presentation-profile dependent and are not part of carrier-only assurance.
    expect(agent.plan.height).toBe(standard.plan.height);
    expect(agent.plan.panels[0].height).toBeLessThan(standard.plan.panels[0].height);
    expect(agent.svg).not.toBe(standard.svg);
  });

  it('substitutes source templates once and treats brace-bearing caller labels literally', () => {
    const request = adjacencyExample();
    request.parameters.selectionLabel = 'Selection {nodeCount} literal';
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.accessibility.summary).toContain('Selection {nodeCount} literal');
    expect(result.plan.accessibility.summary).not.toContain('unsafe or unexpanded');
  });
});
