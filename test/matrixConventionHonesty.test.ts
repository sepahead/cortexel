import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const readText = (relative: string): string => readFileSync(path.join(ROOT, relative), 'utf8');
const readJson = (relative: string): any => JSON.parse(readText(relative));

describe('matrix-axis attribution', () => {
  it('declares target rows/source columns as Cortexel policy, not a NEST axis authority', () => {
    for (const relative of [
      'AGENTS.md',
      'CLAUDE.md',
      'CHANGELOG.md',
      'docs/SCOPE.md',
      'contract/registries/legacy-skill-map.v1.json',
    ]) {
      expect(readText(relative), relative).not.toMatch(
        /NEST(?:'s)?[^.\n]{0,80}target[- ]row[^.\n]{0,40}source[- ]column/iu,
      );
    }
  });

  it('keeps one explicit Cortexel orientation in all three stable matrix contracts', () => {
    for (const id of ['adjacency', 'weight', 'delay']) {
      const contract = readJson(`contract/skills/network.${id}_matrix.v1.json`);
      expect(contract.renderer?.axisOrder, id).toBe('target_rows_source_columns');
      expect(JSON.stringify(contract), id).not.toContain('source_rows_target_columns');
    }
  });

  it('records the upstream edge-list/example distinction at the legacy migration boundary', () => {
    const registry = readJson('contract/registries/legacy-skill-map.v1.json');
    const adjacency = registry.entries.find(
      (entry: { legacyId?: unknown }) => entry.legacyId === 'nest.adjacency_matrix',
    );
    expect(adjacency?.notes).toMatch(/SynapseCollection is an edge list/iu);
    expect(adjacency?.notes).toContain(
      'https://nest-simulator.readthedocs.io/en/v3.0/auto_examples/synapsecollection.html',
    );
  });

  it('does not manufacture stable connection identity when edgeIds are absent', () => {
    const common = readJson('contract/schemas/common.v1.schema.json');
    const description = common.$defs.connectionRows.properties.edgeIds.description as string;
    expect(description).toContain('assigns no identity');
    expect(description).not.toMatch(/assigned after canonical sort/iu);
  });
});
