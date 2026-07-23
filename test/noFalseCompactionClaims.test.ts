import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const skillsDirectory = path.resolve(import.meta.dirname, '../contract/skills');
const budgetRegistry = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/registries/budget-profiles.v1.json'),
  'utf8',
)) as {
  description: string;
  profiles: { id: string; limits: Record<string, unknown> }[];
};
const disclosureRegistry = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/registries/disclosures.v1.json'),
  'utf8',
)) as { registry: string };

interface SkillBudgetClaim {
  id: string;
  status: string;
  budgets: {
    compactionPolicies: string[];
    tablePolicy: string;
  };
}

interface LocatedString {
  readonly path: string;
  readonly value: string;
}

const NON_NONE_COMPACTION_IDS = [
  'line_envelope_minmax',
  'raster_density_bins',
  'histogram_merge_adjacent',
  'matrix_value_quantize',
  'graph_declared_subset',
] as const;

function locatedStrings(value: unknown): LocatedString[] {
  const found: LocatedString[] = [];
  const pending: { readonly value: unknown; readonly path: string }[] = [
    { value, path: '' },
  ];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (typeof current.value === 'string') {
      found.push({ path: current.path, value: current.value });
      continue;
    }
    if (Array.isArray(current.value)) {
      current.value.forEach((item, index) => {
        pending.push({ value: item, path: `${current.path}/${index}` });
      });
      continue;
    }
    if (current.value !== null && typeof current.value === 'object') {
      for (const [key, child] of Object.entries(current.value)) {
        pending.push({ value: child, path: `${current.path}/${key}` });
      }
    }
  }
  return found;
}

const sidecarIsExplicitlyUnavailable = (claim: string): boolean =>
  /(?:\bno\b|\bnot\b|\bnever\b|\bneither\b|\bcannot\b|\bunimplemented\b|\bunavailable\b|\bfalse capability\b|\brefus\w*)[\s\S]{0,240}\bsidecar\b|\bsidecar\b[\s\S]{0,200}(?:\bno\b|\bnot\b|\bnever\b|\bneither\b|\bcannot\b|\bunimplemented\b|\bunavailable\b|\brefus\w*)/iu.test(claim);

const namedCompactionIsExplicitlyInactive = (claim: string): boolean =>
  /\bnot (?:advertised|executed|implemented|valid|run)\b|\bunimplemented\b|\bno (?:registered )?(?:\w+ )?compaction\b|\bexecutes no\b|\bregistered future\b|\bfuture (?:work|implementation|policy|envelope|paint-only|independent)\b|\bdoes not (?:advertise|execute|implement|run)\b/iu.test(claim);

const stableSkills = readdirSync(skillsDirectory)
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(path.join(skillsDirectory, name), 'utf8')) as SkillBudgetClaim)
  .filter((skill) => skill.status === 'stable');

describe('current stable renderer capability honesty', () => {
  it('publishes complete-returned-or-refuse for every stable skill', () => {
    expect(stableSkills).toHaveLength(19);
    for (const skill of stableSkills) {
      expect(skill.budgets.tablePolicy, skill.id).toBe('complete_returned');
    }
  });

  it('does not advertise a registered compaction algorithm that no compiler executes', () => {
    for (const skill of stableSkills) {
      expect(skill.budgets.compactionPolicies, skill.id).toEqual(['none']);
    }
  });

  it('states every sidecar mention as unavailable rather than as emitted output', () => {
    for (const source of [...stableSkills, disclosureRegistry]) {
      const sourceId = 'id' in source ? source.id : source.registry;
      for (const claim of locatedStrings(source).filter(({ value }) => /\bsidecar\b/iu.test(value))) {
        expect(
          sidecarIsExplicitlyUnavailable(claim.value),
          `${sourceId}${claim.path}: ${claim.value}`,
        ).toBe(true);
      }
    }
  });

  it('states every named non-none compaction policy as inactive or future work', () => {
    for (const skill of stableSkills) {
      for (const claim of locatedStrings(skill)) {
        const mentioned = NON_NONE_COMPACTION_IDS.filter((id) => claim.value.includes(id));
        if (mentioned.length === 0) continue;
        expect(
          namedCompactionIsExplicitlyInactive(claim.value),
          `${skill.id}${claim.path} claims ${mentioned.join(', ')}: ${claim.value}`,
        ).toBe(true);
      }
    }
  });

  it('does not retain a metadata-only bundle budget and labels future sidecar limits as inactive', () => {
    expect(budgetRegistry.description).toMatch(/not callable capabilities/iu);
    for (const profile of budgetRegistry.profiles) {
      expect(profile.limits, profile.id).not.toHaveProperty('bundlePanels');
      expect(
        (profile.limits.sidecarBytes as { rationale?: unknown }).rationale,
        profile.id,
      ).toMatch(/reserved|no current skill/iu);
      expect(
        (profile.limits.returnedTableRows as { rationale?: unknown }).rationale,
        profile.id,
      ).toMatch(/refus|complete returned/iu);
      expect(
        (profile.limits.returnedTableRows as { errorCode?: unknown }).errorCode,
        profile.id,
      ).toBe('RESOURCE_COMPACTION_UNAVAILABLE');
    }
  });
});
