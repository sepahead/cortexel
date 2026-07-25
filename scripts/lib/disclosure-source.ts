/** Source-level closure checks for registry-derived provenance-kind disclosures. */

interface DisclosureRuleSource {
  readonly id?: unknown;
  readonly trigger?: unknown;
}

interface DisclosureRegistrySource {
  readonly rules?: unknown;
  readonly policy?: unknown;
}

interface SkillDisclosureSource {
  readonly id?: unknown;
  readonly disclosures?: unknown;
}

const SOURCE_KIND_TRIGGER = /^provenance\.source\.kind == '([^']+)'$/u;

export function sourceKindDisclosureRuleIds(
  registry: DisclosureRegistrySource,
): readonly string[] {
  if (
    registry.policy === null ||
    typeof registry.policy !== 'object' ||
    Array.isArray(registry.policy)
  ) return [];
  const ids = (registry.policy as { readonly sourceKindRuleIds?: unknown }).sourceKindRuleIds;
  return Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string')
    : [];
}

export function sourceKindsWithoutSpecificRule(
  registry: DisclosureRegistrySource,
): readonly string[] {
  if (
    registry.policy === null ||
    typeof registry.policy !== 'object' ||
    Array.isArray(registry.policy)
  ) return [];
  const kinds = (registry.policy as {
    readonly sourceKindsWithoutSpecificRule?: unknown;
  }).sourceKindsWithoutSpecificRule;
  return Array.isArray(kinds)
    ? kinds.filter((kind): kind is string => typeof kind === 'string')
    : [];
}

/**
 * Every stable skill accepts the shared SourceDeclarationV1 union, so it must allow
 * every registry rule driven solely by `source.kind`. Otherwise one skill can silently
 * turn the same provenance fact into a less honest artifact than the rest of the
 * catalog, as population-rate previously did for literature/manual input.
 */
export function sourceKindDisclosureSourceProblems(
  registry: DisclosureRegistrySource,
  stableSkills: readonly SkillDisclosureSource[],
  sourceKinds: readonly unknown[],
): string[] {
  const problems: string[] = [];
  const declaredSourceKinds = sourceKinds.filter(
    (kind): kind is string => typeof kind === 'string',
  );
  const sourceKindSet = new Set(declaredSourceKinds);
  if (
    declaredSourceKinds.length !== sourceKinds.length ||
    sourceKindSet.size !== declaredSourceKinds.length ||
    declaredSourceKinds.length === 0
  ) {
    problems.push('SourceDeclarationV1 kind enum must be a non-empty duplicate-free string list');
  }

  const policy = registry.policy !== null && typeof registry.policy === 'object' &&
    !Array.isArray(registry.policy)
    ? registry.policy as Record<string, unknown>
    : null;
  const requiredIds = sourceKindDisclosureRuleIds(registry);
  if (!Array.isArray(policy?.sourceKindRuleIds)) {
    problems.push('disclosures.policy.sourceKindRuleIds: expected a closed rule inventory');
  } else if (requiredIds.length !== policy.sourceKindRuleIds.length) {
    problems.push('disclosures.policy.sourceKindRuleIds: every entry must be a string');
  }
  if (new Set(requiredIds).size !== requiredIds.length) {
    problems.push('disclosures.policy.sourceKindRuleIds: duplicate rule id');
  }

  const kindsWithoutSpecificRule = sourceKindsWithoutSpecificRule(registry);
  if (!Array.isArray(policy?.sourceKindsWithoutSpecificRule)) {
    problems.push(
      'disclosures.policy.sourceKindsWithoutSpecificRule: expected an explicit closed source-kind inventory',
    );
  } else if (kindsWithoutSpecificRule.length !== policy.sourceKindsWithoutSpecificRule.length) {
    problems.push(
      'disclosures.policy.sourceKindsWithoutSpecificRule: every entry must be a string',
    );
  }
  if (new Set(kindsWithoutSpecificRule).size !== kindsWithoutSpecificRule.length) {
    problems.push('disclosures.policy.sourceKindsWithoutSpecificRule: duplicate source kind');
  }

  const sourceKindsWithSpecificRules = new Set<string>();
  if (Array.isArray(registry.rules)) {
    const requiredSet = new Set(requiredIds);
    const rulesById = new Map<string, DisclosureRuleSource>();
    for (const candidate of registry.rules) {
      if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
      const rule = candidate as DisclosureRuleSource;
      if (typeof rule.id === 'string') rulesById.set(rule.id, rule);
      if (typeof rule.trigger !== 'string') continue;
      const match = SOURCE_KIND_TRIGGER.exec(rule.trigger);
      if (match) {
        sourceKindsWithSpecificRules.add(match[1]);
        if (!requiredSet.has(String(rule.id))) {
          problems.push(
            `disclosure ${String(rule.id)}: source-kind trigger is absent from policy.sourceKindRuleIds`,
          );
        }
        if (!sourceKindSet.has(match[1])) {
          problems.push(
            `disclosure ${String(rule.id)}: source-kind trigger names unknown SourceDeclarationV1 kind ${JSON.stringify(match[1])}`,
          );
        }
      }
    }
    for (const id of requiredIds) {
      const rule = rulesById.get(id);
      if (!rule) {
        problems.push(`disclosures.policy.sourceKindRuleIds: unknown rule ${JSON.stringify(id)}`);
        continue;
      }
      if (typeof rule.trigger !== 'string' || !SOURCE_KIND_TRIGGER.test(rule.trigger)) {
        problems.push(
          `disclosure ${id}: policy-owned source-kind rule must use the exact provenance.source.kind trigger grammar`,
        );
      }
    }
  } else {
    problems.push('disclosures.rules: expected a rule array');
  }

  const explicitNoRuleKinds = new Set(kindsWithoutSpecificRule);
  for (const kind of kindsWithoutSpecificRule) {
    if (!sourceKindSet.has(kind)) {
      problems.push(
        `disclosures.policy.sourceKindsWithoutSpecificRule: unknown SourceDeclarationV1 kind ${JSON.stringify(kind)}`,
      );
    }
    if (sourceKindsWithSpecificRules.has(kind)) {
      problems.push(
        `source kind ${JSON.stringify(kind)} cannot both fire a kind-specific rule and be listed without one`,
      );
    }
  }
  for (const kind of declaredSourceKinds) {
    if (!sourceKindsWithSpecificRules.has(kind) && !explicitNoRuleKinds.has(kind)) {
      problems.push(
        `SourceDeclarationV1 kind ${JSON.stringify(kind)} has no explicit kind-specific disclosure consequence`,
      );
    }
  }

  for (const skill of stableSkills) {
    const allowed = new Set(
      Array.isArray(skill.disclosures)
        ? skill.disclosures.filter((id): id is string => typeof id === 'string')
        : [],
    );
    const missing = requiredIds.filter((id) => !allowed.has(id));
    if (missing.length > 0) {
      problems.push(
        `skill ${String(skill.id)}: missing source-kind disclosures [${missing.join(', ')}]`,
      );
    }
  }
  return problems;
}
