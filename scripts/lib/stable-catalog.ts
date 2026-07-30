/**
 * Exact public stable-catalog projection.
 *
 * `catalogDigest` identifies these generated public entries—not a hand-selected
 * identity tuple. Keep construction here so generation and manifest identity cannot
 * silently disagree about which stable promises the digest covers.
 */

import type { ContractIdentitySource } from './identity-source.js';

type JsonRecord = Record<string, any>;

const COMMON_DEFINITIONS =
  'https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs';
const UNSAFE_PUBLIC_TEXT =
  /[\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff\ufffe-\uffff]/u;

/**
 * Exact compile profile for the public Draft 2020-12 request schemas.
 *
 * `strictRequired` and `strictTypes` are deliberately disabled Ajv lints, not
 * validation relaxations: the generator performs context-aware equivalents that
 * preserve conditional and `not` semantics. The profile is part of catalogDigest.
 */
export const AUTHORING_SCHEMA_COMPILATION_PROFILE_V1 = Object.freeze({
  id: 'cortexel-authoring-schema-compilation-profile.v1',
  dialect: 'https://json-schema.org/draft/2020-12/schema',
  engine: 'ajv-8',
  options: Object.freeze({
    strict: true,
    allErrors: true,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
    allowUnionTypes: true,
    validateFormats: false,
    strictRequired: false,
    strictTypes: false,
  }),
});

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

/**
 * Find terminal/agent display hazards in every public JSON key and string value.
 *
 * The CLI also serializes these code points safely, but generation refuses them so an
 * importing host cannot accidentally render a bidi override, control, zero-width mark,
 * XML-forbidden U+FFFE/U+FFFF code point, or ill-formed surrogate from trusted
 * catalog metadata.
 */
export function publicCatalogStringProblems(value: unknown): string[] {
  const problems: string[] = [];
  const pending: { value: unknown; path: string }[] = [{ value, path: '$' }];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (typeof current.value === 'string') {
      if (UNSAFE_PUBLIC_TEXT.test(current.value) || hasLoneSurrogate(current.value)) {
        problems.push(`${current.path}: unsafe public string`);
      }
      continue;
    }
    if (Array.isArray(current.value)) {
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        pending.push({ value: current.value[index], path: `${current.path}[${index}]` });
      }
      continue;
    }
    if (current.value === null || typeof current.value !== 'object') continue;
    const record = current.value as Record<string, unknown>;
    const keys = Object.keys(record);
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      const unsafeKey = UNSAFE_PUBLIC_TEXT.test(key) || hasLoneSurrogate(key);
      if (unsafeKey) {
        problems.push(`${current.path}: unsafe public object key`);
      }
      const safePathKey = !unsafeKey && /^[A-Za-z0-9_-]{1,80}$/u.test(key)
        ? `.${key}`
        : `[key#${index}]`;
      pending.push({ value: record[key], path: `${current.path}${safePathKey}` });
    }
  }
  return problems.sort();
}

export function composeSkillRequestSchema(
  skill: JsonRecord,
  contractIdentity: ContractIdentitySource,
): JsonRecord {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id:
      'https://sepahead.github.io/cortexel/schemas/v1/skills/' +
      `${skill.id}.request.v1.schema.json`,
    title: `${skill.id} request`,
    description:
      `GENERATED from contract/skills/${skill.id}.v1.json. ` +
      'The complete structural request schema for this skill. Full acceptance also ' +
      'requires Cortexel identity, semantic, scientific, provenance, budget, and ' +
      'derivation gates.',
    type: 'object',
    properties: {
      $schema: { type: 'string' },
      contract: {
        type: 'object',
        properties: {
          name: { const: contractIdentity.request.name },
          version: {
            type: 'string',
            enum: [contractIdentity.request.version],
          },
        },
        required: ['name', 'version'],
        additionalProperties: false,
      },
      contractDigest: { $ref: `${COMMON_DEFINITIONS}/sha256` },
      skill: {
        type: 'object',
        properties: {
          id: { const: skill.id },
          revision: {
            type: 'integer',
            minimum: 1,
            description:
              'Optional in an authored request. A mismatched pin is refused before ' +
              'canonicalization. Every accepted canonical request materializes the ' +
              'resolved installed revision here, making an omitted pin and an ' +
              'explicit-current pin canonically identical.',
          },
        },
        required: ['id'],
        additionalProperties: false,
      },
      data: skill.requestSchema.data,
      parameters: skill.requestSchema.parameters,
      source: { $ref: `${COMMON_DEFINITIONS}/sourceDeclaration` },
      presentation: { $ref: `${COMMON_DEFINITIONS}/presentation` },
    },
    required: ['contract', 'skill', 'data', 'parameters', 'source'],
    additionalProperties: false,
    ...(skill.requestSchema.envelopeConstraints
      ? { allOf: [skill.requestSchema.envelopeConstraints] }
      : {}),
  };
}

export function buildPublicAuthoringExample(skill: JsonRecord): JsonRecord {
  const index = skill.examples?.authoring?.baseValidExampleIndex;
  const source = skill.examples?.authoring?.source;
  const candidates = skill.examples?.valid;
  if (
    !Number.isSafeInteger(index) ||
    index < 0 ||
    !Array.isArray(candidates) ||
    index >= candidates.length ||
    source === null ||
    typeof source !== 'object' ||
    Array.isArray(source)
  ) {
    throw new Error(`skill ${String(skill.id)} has an invalid public authoring selection`);
  }
  const example = structuredClone(candidates[index]);
  example.source = structuredClone(source);
  return example;
}

export function buildPublicSkillCatalogEntry(
  skill: JsonRecord,
  capability: JsonRecord,
): JsonRecord {
  if (capability.id !== skill.id) {
    throw new Error(
      `skill ${String(skill.id)} does not match capability ${String(capability.id)}`,
    );
  }
  return {
    id: skill.id,
    revision: skill.revision,
    status: skill.status,
    availability: capability.availability,
    releaseReady: skill.releaseReady,
    title: skill.title,
    canonicalQuestion: skill.purpose.canonicalQuestion,
    cannotEstablish: skill.purpose.cannotEstablish,
    renderer: skill.renderer,
    semanticValidators: skill.semanticValidators,
    disclosures: skill.disclosures,
    budgets: skill.budgets,
    uncertaintySupport: skill.science.uncertaintySupport,
    accessibility: skill.accessibility,
    outputAuthority: skill.outputAuthority,
    evidence: skill.evidence,
    adapters: skill.adapters,
    legacyIds: skill.migration.legacyIds,
    owner: skill.owner,
    knownLimitations: skill.knownLimitations,
  };
}

export function buildPublicSkillAuthoringEntry(
  skill: JsonRecord,
  contractIdentity: ContractIdentitySource,
): JsonRecord {
  return {
    requestSchema: composeSkillRequestSchema(skill, contractIdentity),
    authoringExample: buildPublicAuthoringExample(skill),
  };
}

export function buildPublicStableCatalogView(
  skills: readonly JsonRecord[],
  capabilities: readonly JsonRecord[],
): JsonRecord[] {
  const capabilityById = new Map(
    capabilities.flatMap((capability) =>
      typeof capability.id === 'string'
        ? [[capability.id, capability] as const]
        : []),
  );
  return skills
    .filter((skill) => skill.status === 'stable')
    .slice()
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
    .map((skill) => {
      const capability = capabilityById.get(skill.id);
      if (!capability) {
        throw new Error(`stable skill ${String(skill.id)} has no capability record`);
      }
      return buildPublicSkillCatalogEntry(skill, capability);
    });
}

export interface PublicStableCatalogIdentity {
  readonly domain: ContractIdentitySource['catalogDigestDomain'];
  readonly schemaCompilationProfile: typeof AUTHORING_SCHEMA_COMPILATION_PROFILE_V1;
  readonly schemaResources: readonly JsonRecord[];
  readonly skills: readonly JsonRecord[];
}

function schemaResourceId(resource: JsonRecord): string {
  if (typeof resource.$id !== 'string' || resource.$id.length === 0) {
    throw new Error('stable catalog schema resource lacks a nonempty $id');
  }
  return resource.$id;
}

export function buildPublicStableCatalogIdentity(
  skills: readonly JsonRecord[],
  capabilities: readonly JsonRecord[],
  contractIdentity: ContractIdentitySource,
  schemaResources: readonly JsonRecord[],
): PublicStableCatalogIdentity {
  const sortedResources = schemaResources
    .slice()
    .sort((left, right) => {
      const leftId = schemaResourceId(left);
      const rightId = schemaResourceId(right);
      return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
    });
  const ids = sortedResources.map(schemaResourceId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('stable catalog schema resources contain duplicate $id values');
  }
  const identity = {
    domain: contractIdentity.catalogDigestDomain,
    schemaCompilationProfile: AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
    schemaResources: sortedResources,
    skills: buildPublicStableCatalogView(skills, capabilities).map(
      (entry) => {
        const skill = skills.find((candidate) => candidate.id === entry.id);
        if (!skill) throw new Error(`stable skill ${String(entry.id)} disappeared`);
        return {
          ...entry,
          ...buildPublicSkillAuthoringEntry(skill, contractIdentity),
        };
      },
    ),
  };
  const unsafeStrings = publicCatalogStringProblems(identity);
  if (unsafeStrings.length > 0) {
    throw new Error(
      `public stable catalog contains unsafe display text: ${unsafeStrings[0]}`,
    );
  }
  return identity;
}
