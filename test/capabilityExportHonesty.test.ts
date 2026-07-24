/**
 * Stable capability metadata is a promise about emitted surfaces, not marketing text.
 * Keep that promise executable against the living example of every renderable skill.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { sha256Digest, utf8ByteLength } from '../src/core/sha256.js';
import { buildFigure, type FigureResult } from '../src/render/index.js';

interface CapabilityRecord {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly availability: 'packaged' | 'source_only' | 'unavailable';
  readonly exportClass?: string;
}

interface SkillContract {
  readonly id: string;
  readonly status: string;
  readonly examples: { readonly valid: readonly Record<string, unknown>[] };
}

interface ArtifactOutput {
  readonly role?: unknown;
  readonly sha256?: unknown;
  readonly byteLength?: unknown;
  readonly normative?: unknown;
}

const ROOT = path.resolve(import.meta.dirname, '..');
const capabilityRegistry = JSON.parse(readFileSync(
  path.join(ROOT, 'contract/registries/capabilities.v1.json'),
  'utf8',
)) as { capabilities: CapabilityRecord[] };

const contracts = readdirSync(path.join(ROOT, 'contract/skills'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(
    path.join(ROOT, 'contract/skills', name),
    'utf8',
  )) as SkillContract);

const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
const stableSkillCapabilities = capabilityRegistry.capabilities.filter(
  (capability) => capability.status === 'stable' && capability.kind === 'skill',
);

function outputRecords(artifact: Record<string, unknown>): ArtifactOutput[] {
  return Array.isArray(artifact.outputs)
    ? artifact.outputs.filter(
        (output): output is ArtifactOutput =>
          output !== null && typeof output === 'object' && !Array.isArray(output),
      )
    : [];
}

function exportClaimProblems(
  capability: CapabilityRecord,
  result: FigureResult,
): string[] {
  const problems: string[] = [];
  const exportClass = capability.exportClass ?? '';
  const outputs = outputRecords(result.artifact);

  if (exportClass.includes('svg')) {
    const svgOutput = outputs.find((output) => output.role === 'figure_svg');
    if (!svgOutput) {
      problems.push('SVG claim has no figure_svg artifact output');
    } else {
      if (svgOutput.sha256 !== sha256Digest(result.svg)) {
        problems.push('figure_svg digest does not bind the returned SVG bytes');
      }
      if (svgOutput.byteLength !== utf8ByteLength(result.svg)) {
        problems.push('figure_svg byte length does not match the returned SVG bytes');
      }
      if (svgOutput.normative !== true) {
        problems.push('figure_svg output is not marked normative');
      }
    }
  }

  if (exportClass.includes('table')) {
    if (result.table.columns.length === 0) {
      problems.push('table claim has no returned table columns');
    }
    if (
      result.table.rows.length !== result.table.rowsInline ||
      result.table.rowsInline > result.table.rowsTotal
    ) {
      problems.push('returned table row accounting is incoherent');
    }
  }

  if (exportClass.includes('sidecar')) {
    problems.push(
      'sidecar export is not a current FigureResult capability: V1 returns a complete in-memory table but no canonical sidecar bytes',
    );
  }

  return problems;
}

describe('stable capability export honesty', () => {
  it('covers exactly the stable skill contracts with no metadata-only exclusion', () => {
    const stableContractIds = contracts
      .filter((contract) => contract.status === 'stable')
      .map((contract) => contract.id)
      .sort();
    expect(stableSkillCapabilities.map((capability) => capability.id).sort()).toEqual(
      stableContractIds,
    );
    expect(stableSkillCapabilities.every(
      (capability) => capability.availability === 'packaged',
    )).toBe(true);
  });

  it.each(stableSkillCapabilities.map((capability) => [capability.id, capability] as const))(
    '%s fulfills its declared export class',
    (id, capability) => {
      const contract = contractById.get(id);
      expect(contract, `${id} has no stable skill contract`).toBeDefined();
      const request = contract?.examples.valid[0];
      expect(request, `${id} has no living valid example`).toBeDefined();
      if (!request) return;

      const result = buildFigure(request);
      expect(result.ok, `${id} first valid example did not render`).toBe(true);
      if (!result.ok) return;
      expect(exportClaimProblems(capability, result), id).toEqual([]);
    },
  );

  it('rejects a metadata-only +sidecar claim against the current SVG/table surface', () => {
    const capability = stableSkillCapabilities.find(
      (candidate) => candidate.id === 'neuro.population_rate',
    );
    const contract = contractById.get('neuro.population_rate');
    expect(capability).toBeDefined();
    expect(contract).toBeDefined();
    if (!capability || !contract) return;

    const result = buildFigure(contract.examples.valid[0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const forgedClaim = {
      ...capability,
      exportClass: `${capability.exportClass ?? 'svg+table'}+sidecar`,
    };
    expect(exportClaimProblems(forgedClaim, result)).toContain(
      'sidecar export is not a current FigureResult capability: V1 returns a complete in-memory table but no canonical sidecar bytes',
    );
  });
});
