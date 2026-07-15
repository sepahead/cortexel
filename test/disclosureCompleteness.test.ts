/**
 * Disclosure completeness — the honesty promise, per family.
 *
 * The disclosure engine derives text only from artifact facts, but that is only honest if
 * buildFigure actually THREADS those facts. This suite is the regression guard against the
 * P0 defect where topology and correlogram figures were compiled without their scope,
 * multapse, and orientation facts — so their mandatory disclosures silently never fired.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildFigure } from '../src/render/index.js';
import { deriveDisclosures } from '../src/core/disclosures.js';

function example(skill: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, `../contract/skills/${skill}.v1.json`), 'utf8'),
  ).examples.valid[0];
}

function disclosureIds(request: Record<string, unknown>): string[] {
  const result = buildFigure(request);
  return result.ok ? result.disclosures.map((d) => d.id) : [];
}

describe('mandatory disclosures actually fire', () => {
  it('a correlogram states its lag orientation', () => {
    expect(disclosureIds(example('neuro.correlogram'))).toContain('LAG_ORIENTATION');
  });

  it('a matrix states that an absent cell is not a measured zero', () => {
    expect(disclosureIds(example('network.adjacency_matrix'))).toContain('ABSENT_IS_NOT_ZERO');
  });

  it('a matrix discloses its multapse aggregation', () => {
    expect(disclosureIds(example('network.adjacency_matrix'))).toContain('MULTAPSE_AGGREGATED');
  });

  it('a schematic connection graph discloses that its layout is non-spatial', () => {
    expect(disclosureIds(example('network.connection_graph'))).toContain('SCHEMATIC_LAYOUT');
  });

  it('a simulation source always gets the simulation disclosure', () => {
    expect(disclosureIds(example('neuro.population_rate'))).toContain('SOURCE_SIMULATION');
  });

  it('a rank-local scope fact triggers the partial-network and rank-local disclosures', () => {
    // The disclosure MECHANISM: given a rank-local scope fact, the engine fires both the
    // partial-network warning and the rank-local explanation. (A fully valid rank-local
    // request additionally requires the local target universe — enforced separately.)
    const ids = deriveDisclosures(
      {
        sourceKind: 'simulation',
        sourceAuthenticityVerified: false,
        referenceComparisonRun: false,
        compacted: false,
        tableRowsInline: 0,
        tableRowsTotal: 0,
        scopeKind: 'mpi_target_rank_local',
        rank: 2,
        worldSize: 4,
      },
      ['PARTIAL_NETWORK_SCOPE', 'RANK_LOCAL_SCOPE', 'SOURCE_SIMULATION'],
    ).map((d) => d.id);
    expect(ids).toContain('PARTIAL_NETWORK_SCOPE');
    expect(ids).toContain('RANK_LOCAL_SCOPE');
  });

  it('fills the rank and world size into the rank-local disclosure text', () => {
    const disclosure = deriveDisclosures(
      {
        sourceKind: 'simulation',
        sourceAuthenticityVerified: true,
        referenceComparisonRun: true,
        compacted: false,
        tableRowsInline: 0,
        tableRowsTotal: 0,
        scopeKind: 'mpi_target_rank_local',
        rank: 2,
        worldSize: 4,
      },
      ['RANK_LOCAL_SCOPE'],
    ).find((d) => d.id === 'RANK_LOCAL_SCOPE');
    // The {rank}/{worldSize} placeholders are filled with the real numbers, not left raw.
    expect(disclosure?.text).toContain('rank 2 of 4');
  });

  it('an unknown source gets the critical source-unknown disclosure', () => {
    const request = structuredClone(example('neuro.population_rate'));
    (request.source as Record<string, unknown>).kind = 'unknown';
    expect(disclosureIds(request)).toContain('SOURCE_KIND_UNKNOWN');
  });
});
