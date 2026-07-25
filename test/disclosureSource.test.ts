import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  sourceKindDisclosureRuleIds,
  sourceKindDisclosureSourceProblems,
  sourceKindsWithoutSpecificRule,
} from '../scripts/lib/disclosure-source.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');

function json(relative: string): JsonRecord {
  return JSON.parse(readFileSync(path.join(ROOT, relative), 'utf8'));
}

function stableSkills(): JsonRecord[] {
  return readdirSync(path.join(ROOT, 'contract/skills'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => json(`contract/skills/${name}`))
    .filter((skill) => skill.status === 'stable');
}

describe('catalog-wide source-kind disclosure closure', () => {
  it('requires every stable skill to allow every registry source-kind rule', () => {
    const registry = json('contract/registries/disclosures.v1.json');
    const common = json('contract/schemas/common.v1.schema.json');
    const skills = stableSkills();
    const required = sourceKindDisclosureRuleIds(registry);

    expect(required).toEqual([
      'SOURCE_SIMULATION',
      'SOURCE_SYNTHETIC_FIXTURE',
      'SOURCE_KIND_UNKNOWN',
      'SOURCE_LITERATURE_EXTRACTION',
      'SOURCE_MANUAL_ENTRY',
    ]);
    expect(sourceKindsWithoutSpecificRule(registry)).toEqual([
      'experimental_recording',
      'derived_dataset',
    ]);
    expect(sourceKindDisclosureSourceProblems(
      registry,
      skills,
      common.$defs.sourceDeclaration.properties.kind.enum,
    )).toEqual([]);
    for (const skill of skills) {
      expect(required.every((id) => skill.disclosures.includes(id)), skill.id).toBe(true);
    }
  });

  it('detects a single-skill omission and an unknown registry source kind', () => {
    const registry = json('contract/registries/disclosures.v1.json');
    const common = json('contract/schemas/common.v1.schema.json');
    const skills = stableSkills();
    const populationRate = skills.find((skill) => skill.id === 'neuro.population_rate');
    if (!populationRate) throw new Error('population-rate source missing');

    populationRate.disclosures = populationRate.disclosures.filter(
      (id: string) => id !== 'SOURCE_MANUAL_ENTRY',
    );
    expect(sourceKindDisclosureSourceProblems(
      registry,
      skills,
      common.$defs.sourceDeclaration.properties.kind.enum,
    ).join('\n')).toContain(
      'skill neuro.population_rate: missing source-kind disclosures [SOURCE_MANUAL_ENTRY]',
    );

    const mutatedRegistry = structuredClone(registry);
    mutatedRegistry.rules.find(
      (rule: JsonRecord) => rule.id === 'SOURCE_MANUAL_ENTRY',
    ).trigger = "provenance.source.kind == 'invented_source'";
    expect(sourceKindDisclosureSourceProblems(
      mutatedRegistry,
      stableSkills(),
      common.$defs.sourceDeclaration.properties.kind.enum,
    ).join('\n')).toContain('unknown SourceDeclarationV1 kind "invented_source"');

    const unownedSourceRule = structuredClone(registry);
    unownedSourceRule.policy.sourceKindRuleIds = unownedSourceRule.policy.sourceKindRuleIds.filter(
      (id: string) => id !== 'SOURCE_MANUAL_ENTRY',
    );
    expect(sourceKindDisclosureSourceProblems(
      unownedSourceRule,
      stableSkills(),
      common.$defs.sourceDeclaration.properties.kind.enum,
    ).join('\n')).toContain(
      'disclosure SOURCE_MANUAL_ENTRY: source-kind trigger is absent from policy.sourceKindRuleIds',
    );

    const futureKind = structuredClone(common.$defs.sourceDeclaration.properties.kind.enum);
    futureKind.push('future_unclassified_source');
    expect(sourceKindDisclosureSourceProblems(
      registry,
      stableSkills(),
      futureKind,
    ).join('\n')).toContain(
      'SourceDeclarationV1 kind "future_unclassified_source" has no explicit kind-specific disclosure consequence',
    );

    const contradictoryNoRule = structuredClone(registry);
    contradictoryNoRule.policy.sourceKindsWithoutSpecificRule.push('simulation');
    expect(sourceKindDisclosureSourceProblems(
      contradictoryNoRule,
      stableSkills(),
      common.$defs.sourceDeclaration.properties.kind.enum,
    ).join('\n')).toContain(
      'source kind "simulation" cannot both fire a kind-specific rule and be listed without one',
    );

    const missingInventory = structuredClone(registry);
    delete missingInventory.policy.sourceKindRuleIds;
    delete missingInventory.policy.sourceKindsWithoutSpecificRule;
    expect(sourceKindDisclosureSourceProblems(
      missingInventory,
      stableSkills(),
      common.$defs.sourceDeclaration.properties.kind.enum,
    ).join('\n')).toContain('expected a closed rule inventory');
    expect(sourceKindDisclosureSourceProblems(
      missingInventory,
      stableSkills(),
      common.$defs.sourceDeclaration.properties.kind.enum,
    ).join('\n')).toContain('expected an explicit closed source-kind inventory');
  });
});
