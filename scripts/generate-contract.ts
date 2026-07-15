/**
 * The contract generator.
 *
 * `contract/` is the single authority. Everything downstream — TypeScript types,
 * the runtime catalog, the enum schemas, the composed per-skill request schemas,
 * the Python mirror, the contract digest — is DERIVED here and never hand-edited.
 *
 * This is what makes "one authority" an enforceable property instead of a wish:
 * `check:generated` regenerates into a temporary directory and fails if the
 * committed output differs, so a hand-edit to a generated file cannot survive CI.
 *
 * Generation is deterministic. Running it twice produces byte-identical output —
 * no timestamps, no absolute paths, no iteration-order dependence. A digest
 * computed from volatile input would be worse than no digest at all.
 *
 *   bun run generate
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalize } from '../src/core/canonicalize.js';
import { sha256Hex } from '../src/core/sha256.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT = path.join(ROOT, 'contract');
const GENERATED_TS = path.join(ROOT, 'src', 'generated');
const GENERATED_SCHEMAS = path.join(CONTRACT, 'schemas', 'generated');
const GENERATED_SKILL_SCHEMAS = path.join(CONTRACT, 'schemas', 'skills');
const GENERATED_PY = path.join(ROOT, 'python', 'src', 'cortexel', 'generated');

const BANNER = (source: string): string =>
  `/**\n * GENERATED FILE — DO NOT EDIT.\n *\n * Produced by scripts/generate-contract.ts from ${source}.\n * Edit the normative source and run \`bun run generate\`.\n * \`bun run check:generated\` fails if this file drifts from its source.\n */\n`;

const PY_BANNER = (source: string): string =>
  `"""GENERATED FILE - DO NOT EDIT.\n\nProduced by scripts/generate-contract.ts from ${source}.\nEdit the normative source and run \`bun run generate\`.\n"""\n`;

function readJson<T = any>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

/** Deterministic file listing: sorted, so the digest cannot depend on the filesystem. */
function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function writeIfChanged(file: string, content: string): boolean {
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (existing === content) return false;
  ensureDir(path.dirname(file));
  writeFileSync(file, content);
  return true;
}

// ---------------------------------------------------------------------------
// Load the normative source
// ---------------------------------------------------------------------------

const units = readJson(path.join(CONTRACT, 'registries', 'units.v1.json'));
const errorCodes = readJson(path.join(CONTRACT, 'registries', 'error-codes.v1.json'));
const capabilities = readJson(path.join(CONTRACT, 'registries', 'capabilities.v1.json'));
const semanticValidators = readJson(
  path.join(CONTRACT, 'registries', 'semantic-validators.v1.json'),
);
const disclosures = readJson(path.join(CONTRACT, 'registries', 'disclosures.v1.json'));
const budgets = readJson(path.join(CONTRACT, 'registries', 'budget-profiles.v1.json'));
const legacyMap = readJson(path.join(CONTRACT, 'registries', 'legacy-skill-map.v1.json'));
const renderers = readJson(path.join(CONTRACT, 'registries', 'renderers.v1.json'));
const palettes = readJson(path.join(CONTRACT, 'registries', 'palettes.v1.json'));

const skillFiles = listJson(path.join(CONTRACT, 'skills'));
const skills = skillFiles.map((file) => readJson(path.join(CONTRACT, 'skills', file)));
skills.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const stableSkills = skills.filter((s) => s.status === 'stable');

// ---------------------------------------------------------------------------
// Integrity checks. The generator refuses to emit an incoherent contract — a
// dangling validator id would otherwise become a runtime crash in a figure.
// ---------------------------------------------------------------------------

const problems: string[] = [];

// `if` / `then` / `else` / `not` are PREDICATES over an instance, not declarations of
// one. Closing an `if` with additionalProperties:false would make it match only objects
// that carry nothing besides the discriminator, so the conditional could never fire and
// the requirement it guards — "an excluded trial must state a reason" — would silently
// disappear. The instance's shape is closed where it is DECLARED, so these subtrees are
// walked for nested declarations but never asserted against themselves.
const PREDICATE_KEYWORDS = new Set(['if', 'then', 'else', 'not']);
// Maps from a name to a schema. Their KEYS are caller-chosen property names, so a
// property that happens to be called `if` must still be walked as a real declaration.
const SCHEMA_MAPS = new Set(['properties', 'patternProperties', '$defs', 'definitions']);

// Which type each type-specific keyword actually constrains. Used by
// assertTypedKeywords() below; declared here because the checks run at module top level.
const KEYWORD_TYPES: Readonly<Record<string, string>> = {
  properties: 'object',
  patternProperties: 'object',
  required: 'object',
  additionalProperties: 'object',
  items: 'array',
  prefixItems: 'array',
  minItems: 'array',
  maxItems: 'array',
  uniqueItems: 'array',
  minLength: 'string',
  maxLength: 'string',
  pattern: 'string',
  minimum: 'number',
  maximum: 'number',
  exclusiveMinimum: 'number',
  exclusiveMaximum: 'number',
  multipleOf: 'number',
};

const unitCodes = new Set<string>(units.units.map((u: any) => u.code));
const quantityKinds = new Set<string>(units.quantityKinds.map((q: any) => q.kind));
const validatorIds = new Set<string>(semanticValidators.validators.map((v: any) => v.id));
const disclosureIds = new Set<string>(disclosures.rules.map((r: any) => r.id));
const errorCodeIds = new Set<string>(errorCodes.codes.map((c: any) => c.code));
const rendererIds = new Set<string>(renderers.renderers.map((r: any) => r.id));
const compactionIds = new Set<string>(budgets.compactionPolicies.map((p: any) => p.id));
const capabilityIds = new Map<string, any>(capabilities.capabilities.map((c: any) => [c.id, c]));

for (const skill of skills) {
  const where = `skill ${skill.id}`;

  for (const validator of skill.semanticValidators ?? []) {
    if (!validatorIds.has(validator.id)) {
      problems.push(`${where}: unknown semantic validator "${validator.id}"`);
    }
  }
  for (const id of skill.disclosures ?? []) {
    if (!disclosureIds.has(id)) problems.push(`${where}: unknown disclosure "${id}"`);
  }
  for (const id of skill.budgets?.compactionPolicies ?? []) {
    if (!compactionIds.has(id)) problems.push(`${where}: unknown compaction policy "${id}"`);
  }
  if (!rendererIds.has(skill.renderer?.id)) {
    problems.push(`${where}: unknown renderer "${skill.renderer?.id}"`);
  }
  for (const example of skill.examples?.invalid ?? []) {
    if (!errorCodeIds.has(example.expectedCode)) {
      problems.push(`${where}: invalid example expects unknown error code "${example.expectedCode}"`);
    }
  }

  const capability = capabilityIds.get(skill.id);
  if (!capability) {
    problems.push(`${where}: has no record in capabilities.v1.json`);
  } else {
    if (capability.status !== skill.status) {
      problems.push(
        `${where}: status "${skill.status}" disagrees with capabilities.v1.json "${capability.status}"`,
      );
    }
    // The renderer is declared in both the skill contract and the capability record. They
    // must agree, or the two sources of truth can drift.
    if (capability.renderer !== undefined && capability.renderer !== skill.renderer?.id) {
      problems.push(
        `${where}: renderer "${skill.renderer?.id}" disagrees with capabilities.v1.json "${capability.renderer}"`,
      );
    }
  }

  // A stable skill pointing at an experimental renderer would be a stable promise
  // backed by a nondeterministic implementation. Fail generation, not the release.
  if (skill.status === 'stable') {
    const renderer = renderers.renderers.find((r: any) => r.id === skill.renderer?.id);
    if (renderer && renderer.status !== 'stable') {
      problems.push(`${where}: a stable skill may not use the experimental renderer "${renderer.id}"`);
    }
    if (!skill.evidence?.handVectors) {
      problems.push(`${where}: a stable skill must have hand-computable golden vectors`);
    }
    if (skill.evidence?.externalOracle && skill.evidence.externalOracle.status === 'passed') {
      // Nothing has been executed against a pinned oracle in this repository yet.
      problems.push(
        `${where}: claims its external oracle PASSED. No pinned reference environment has been run; this claim has no receipt.`,
      );
    }
  }

  // Walk the request schema and require closed objects. An open object means a
  // typo in a scientific field is silently ignored, which is the failure mode this
  // whole contract exists to prevent.
  for (const key of ['data', 'parameters'] as const) {
    const schema = skill.requestSchema?.[key];
    if (!schema) {
      problems.push(`${where}: requestSchema.${key} is missing`);
      continue;
    }
    assertClosed(schema, `${where} requestSchema.${key}`, problems);
  }
}

/**
 * Every object a caller can author must be CLOSED, so that a mistyped scientific
 * field fails instead of being silently ignored. Enforcing that mechanically is
 * subtler than "every object sets additionalProperties:false", because in JSON
 * Schema that keyword is not a global switch — it only sees the properties declared
 * in the SAME schema object. Three cases have to be told apart:
 *
 *   `oneOf` / `anyOf` branches are ALTERNATIVE complete declarations. Each one
 *   describes a whole instance, so each one must close.
 *
 *   `allOf` branches are CONJUNCTIVE refinements. A branch like
 *   `{properties: {weights: {...}}, required: ["weights"]}` sitting beside a
 *   `{$ref: connectionRows}` exists only to tighten one field. Closing it would make
 *   its `additionalProperties:false` reject `sourceIds` and `targetIds` — fields it
 *   never mentioned but the sibling branch requires. The closure legitimately comes
 *   from the $ref'd base, which is itself closed.
 *
 *   `if` / `then` / `else` / `not` are PREDICATES over an instance rather than
 *   declarations of one. Closing an `if` would make it match only objects carrying
 *   nothing but the discriminator, so the conditional could never fire and the rule
 *   it guards would silently vanish.
 *
 * So: assert closure where a shape is DECLARED, and require an `allOf` composite to
 * be closed by something — a $ref to a closed base, or `unevaluatedProperties:false`.
 */
function assertClosed(node: any, where: string, out: string[], at = '', inAllOfBranch = false): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((child, index) =>
      assertClosed(child, where, out, `${at}/${index}`, inAllOfBranch),
    );
    return;
  }

  const closesItself =
    node.additionalProperties === false || node.unevaluatedProperties === false;

  // Closure is demanded only where an object's shape is DECLARED — that is, where it
  // lists `properties`. A branch carrying only `required` declares nothing; it merely
  // constrains, as in "at least one of trajectories or vectorField":
  //
  //   properties: { trajectories: {...}, vectorField: {...} },   <- declares AND closes
  //   anyOf: [ { required: ["trajectories"] },                   <- only constrains
  //            { required: ["vectorField"]  } ]
  //
  // Putting additionalProperties:false on such a branch would be a disaster: with no
  // `properties` of its own, it would reject EVERY property, and the schema could
  // never match anything at all.
  const declaresShape = node.properties !== undefined || node.patternProperties !== undefined;

  if (declaresShape && !closesItself && !inAllOfBranch) {
    const composes = node.oneOf || node.anyOf || node.allOf || node.$ref;
    if (!composes) {
      out.push(
        `${where}: the object schema at "${at || '(root)'}" declares properties but does not set additionalProperties:false`,
      );
    }
  }

  // An allOf composite must be closed by SOMETHING. A $ref to a closed base does it;
  // so does unevaluatedProperties:false. Neither, and the object is genuinely open.
  if (Array.isArray(node.allOf) && !closesItself) {
    const closedByRef = node.allOf.some(
      (branch: any) => branch && typeof branch === 'object' && typeof branch.$ref === 'string',
    );
    if (!closedByRef) {
      out.push(
        `${where}: the allOf at "${at || '(root)'}" is closed by nothing — no $ref to a closed base and no unevaluatedProperties:false`,
      );
    }
  }

  assertTypedKeywords(node, where, out, at);

  for (const [key, value] of Object.entries(node)) {
    if (PREDICATE_KEYWORDS.has(key)) continue;

    if (SCHEMA_MAPS.has(key) && value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
        // Inside an allOf refinement branch, a property schema is ITSELF a refinement
        // of a property the closed base already declares — `{properties: {weights:
        // {properties: {kind: {const: ...}}}}}` tightens `weights.kind` and says
        // nothing about `weights.unit` or `weights.values`. Closing it would reject
        // exactly the fields the base requires. So the exemption propagates inward.
        assertClosed(child, where, out, `${at}/${key}/${name}`, inAllOfBranch);
      }
      continue;
    }

    // Refinement branches are exempt from closing; alternative branches are not.
    assertClosed(value, where, out, `${at}/${key}`, key === 'allOf');
  }
}

/**
 * A type-specific keyword must say which type it constrains.
 *
 * `{maxLength: 5}` on a value that turns out to be a number is silently IGNORED by
 * JSON Schema — the constraint simply does not apply, and the field goes unchecked
 * while looking checked. This is Ajv's `strictTypes`, reimplemented here for one
 * reason: it must not apply inside a `not`.
 *
 * Inside a `not`, adding a type WIDENS the negative constraint rather than tightening
 * it — `not:{required:["x"]}` rejects any value carrying `x`, while
 * `not:{type:"object",required:["x"]}` rejects only objects and now accepts a bare
 * string. Ajv cannot make that distinction; here we can, so the rule is enforced
 * everywhere it is safe and skipped exactly where it is not.
 */
function assertTypedKeywords(node: any, where: string, out: string[], at: string): void {
  // A `not` subtree is exempt: see above.
  if (at.endsWith('/not') || at.includes('/not/')) return;
  // A schema whose shape comes from a composite or a $ref carries its type there.
  if (node.$ref || node.oneOf || node.anyOf || node.allOf) return;
  if (node.type !== undefined || node.enum !== undefined || node.const !== undefined) return;

  for (const [keyword, requiredType] of Object.entries(KEYWORD_TYPES)) {
    if (node[keyword] !== undefined) {
      out.push(
        `${where}: the schema at "${at || '(root)'}" uses "${keyword}" (which only constrains a ${requiredType}) without declaring "type": "${requiredType}". As written the constraint is silently ignored for any other type — the field would look checked and not be.`,
      );
      return;
    }
  }
}

for (const entry of legacyMap.entries) {
  if (entry.targetId && entry.outcome === 'migrate' && !capabilityIds.has(entry.targetId)) {
    problems.push(`legacy map: "${entry.legacyId}" targets unknown capability "${entry.targetId}"`);
  }
}

if (problems.length > 0) {
  process.stderr.write('The contract source is not coherent:\n');
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// contract/schemas/generated/registry-enums.v1.schema.json
//
// The enums that other schemas $ref. They exist ONLY here so that a unit code, an
// error code, or a skill id has exactly one definition in the whole system.
// ---------------------------------------------------------------------------

const enumSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://sepahead.github.io/cortexel/schemas/v1/generated/registry-enums.v1.schema.json',
  title: 'Cortexel registry enumerations (generated)',
  description:
    'GENERATED from contract/registries/. Do not edit. These enums exist in exactly one place so that a unit code, an error code, or a skill id cannot drift between the schema, the validator, the manifest, and the docs.',
  $defs: {
    unitCode: {
      type: 'string',
      minLength: 1,
      maxLength: 32,
      description:
        'A unit code. Deliberately NOT a structural enum. Units are a scientific concern, so they are owned by the semantic validators unit.canonical_code and unit.dimension_match — which is what lets an accepted alias such as "milliseconds" produce a repair pointing at "ms", rather than a bare "not in enum" from a stage that runs first and cannot suggest the fix. A canonical unit list lives in contract/registries/units.v1.json.',
    },
    quantityKind: {
      type: 'string',
      description: 'A quantity kind from contract/registries/units.v1.json.',
      enum: [...quantityKinds].sort(),
    },
    stableSkillId: {
      type: 'string',
      description:
        'A STABLE catalog id. Experimental and removed ids are deliberately absent: a stable request cannot select them by accident.',
      enum: stableSkills.map((s) => s.id).sort(),
    },
    errorCode: {
      type: 'string',
      enum: [...errorCodeIds].sort(),
    },
    errorStage: {
      type: 'string',
      enum: errorCodes.stages,
    },
    disclosureId: {
      type: 'string',
      enum: [...disclosureIds].sort(),
    },
    // Themes and budget profiles are $ref'd by the presentation schema so their sets have
    // ONE authority (palettes.v1.json / budget-profiles.v1.json), not a hand-copied enum.
    themeId: {
      type: 'string',
      description: 'A theme id from contract/registries/palettes.v1.json.',
      enum: palettes.themes.map((t: any) => t.id).sort(),
    },
    budgetProfileId: {
      type: 'string',
      description: 'A budget-profile id from contract/registries/budget-profiles.v1.json.',
      enum: budgets.profiles.map((p: any) => p.id).sort(),
    },
  },
};

// ---------------------------------------------------------------------------
// contract/schemas/skills/<id>.request.v1.schema.json
//
// Self-contained per-skill request schemas. Not an allOf against the envelope:
// composing with allOf would leave `unevaluatedProperties` subtleties that can
// quietly re-open a closed object. Inlining keeps every level provably closed.
// ---------------------------------------------------------------------------

const COMMON = 'https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs';

function composeRequestSchema(skill: any): object {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://sepahead.github.io/cortexel/schemas/v1/skills/${skill.id}.request.v1.schema.json`,
    title: `${skill.id} request`,
    description: `GENERATED from contract/skills/${skill.id}.v1.json. The acceptance authority for this skill.`,
    type: 'object',
    properties: {
      $schema: { type: 'string' },
      contract: {
        type: 'object',
        properties: {
          name: { const: 'cortexel-figure-request' },
          version: { type: 'string', enum: ['1.0'] },
        },
        required: ['name', 'version'],
        additionalProperties: false,
      },
      contractDigest: { $ref: `${COMMON}/sha256` },
      skill: {
        type: 'object',
        properties: {
          id: { const: skill.id },
          revision: { type: 'integer', minimum: 1 },
        },
        required: ['id'],
        additionalProperties: false,
      },
      data: skill.requestSchema.data,
      parameters: skill.requestSchema.parameters,
      source: { $ref: `${COMMON}/sourceDeclaration` },
      presentation: { $ref: `${COMMON}/presentation` },
    },
    required: ['contract', 'skill', 'data', 'parameters', 'source'],
    additionalProperties: false,
  };
}

// ---------------------------------------------------------------------------
// src/generated/*.ts
// ---------------------------------------------------------------------------

const registryTs = `${BANNER('contract/registries/')}
export const ERROR_CODES = ${JSON.stringify([...errorCodeIds].sort(), null, 2)} as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_STAGES = ${JSON.stringify(errorCodes.stages, null, 2)} as const;
export type ErrorStage = (typeof ERROR_STAGES)[number];

export const ERROR_CODE_META: Readonly<Record<ErrorCode, { readonly stage: ErrorStage; readonly severity: 'error' | 'warning'; readonly summary: string; readonly correctiveAction: string }>> = Object.freeze(${JSON.stringify(
  Object.fromEntries(
    errorCodes.codes.map((c: any) => [
      c.code,
      {
        stage: c.stage,
        severity: c.severity,
        summary: c.summary,
        correctiveAction: c.correctiveAction,
      },
    ]),
  ),
  null,
  2,
)});

export const UNIT_CODES = ${JSON.stringify([...unitCodes].sort(), null, 2)} as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export const QUANTITY_KINDS = ${JSON.stringify([...quantityKinds].sort(), null, 2)} as const;
export type QuantityKind = (typeof QUANTITY_KINDS)[number];

export interface UnitRecord {
  readonly code: string;
  readonly dimension: string;
  readonly toCanonical: number | null;
  readonly label: string;
  readonly aliases: readonly string[];
}

export const UNITS: Readonly<Record<string, UnitRecord>> = Object.freeze(${JSON.stringify(
  Object.fromEntries(
    units.units.map((u: any) => [
      u.code,
      {
        code: u.code,
        dimension: u.dimension,
        toCanonical: u.toCanonical,
        label: u.label,
        aliases: u.aliases ?? [],
      },
    ]),
  ),
  null,
  2,
)});

/** Alias -> canonical code. Used ONLY by adapters and \`cortexel migrate\`; normal
 *  validation rejects an alias with a repair rather than converting it silently. */
export const UNIT_ALIASES: Readonly<Record<string, string>> = Object.freeze(${JSON.stringify(
  Object.fromEntries(
    units.units.flatMap((u: any) =>
      (u.aliases ?? [])
        .filter((alias: string) => alias.length > 0 && !unitCodes.has(alias))
        .map((alias: string) => [alias, u.code]),
    ),
  ),
  null,
  2,
)});

export const QUANTITY_KIND_DIMENSIONS: Readonly<Record<string, readonly string[]>> = Object.freeze(${JSON.stringify(
  Object.fromEntries(units.quantityKinds.map((q: any) => [q.kind, q.dimensions])),
  null,
  2,
)});

export const DISCLOSURE_RULES: readonly { readonly id: string; readonly severity: 'critical' | 'important' | 'informational'; readonly text: string }[] = Object.freeze(${JSON.stringify(
  disclosures.rules.map((r: any) => ({ id: r.id, severity: r.severity, text: r.text })),
  null,
  2,
)});

export type DisclosureId = (typeof DISCLOSURE_RULES)[number]['id'];

export const SEMANTIC_VALIDATOR_IDS = ${JSON.stringify([...validatorIds].sort(), null, 2)} as const;
export type SemanticValidatorId = (typeof SEMANTIC_VALIDATOR_IDS)[number];
`;

const budgetsTs = `${BANNER('contract/registries/budget-profiles.v1.json')}
export const BUDGET_PROFILE_IDS = ${JSON.stringify(budgets.profiles.map((p: any) => p.id), null, 2)} as const;
export type BudgetProfileId = (typeof BUDGET_PROFILE_IDS)[number];

export const BUDGET_PROFILES = Object.freeze(${JSON.stringify(
  Object.fromEntries(
    budgets.profiles.map((profile: any) => [
      profile.id,
      Object.fromEntries(
        Object.entries(profile.limits).map(([name, limit]: [string, any]) => [name, limit.value]),
      ),
    ]),
  ),
  null,
  2,
)}) as Readonly<Record<BudgetProfileId, Readonly<Record<string, number>>>> as any;

export const COMPACTION_POLICIES = Object.freeze(${JSON.stringify(
  Object.fromEntries(
    budgets.compactionPolicies.map((p: any) => [
      p.id,
      {
        id: p.id,
        revision: p.revision,
        appliesTo: p.appliesTo,
        preservesExtrema: p.preservesExtrema,
        preservesMass: p.preservesMass,
        deterministic: p.deterministic,
        description: p.description,
      },
    ]),
  ),
  null,
  2,
)});

export type CompactionPolicyId = keyof typeof COMPACTION_POLICIES;
`;

/** The runtime catalog. Discovery, routing, budgets, and disclosures all read this. */
const catalogTs = `${BANNER('contract/skills/ and contract/registries/capabilities.v1.json')}
import type { SemanticValidatorId, DisclosureId } from './registry.js';

export interface SkillCatalogEntry {
  readonly id: string;
  readonly revision: number;
  readonly status: 'stable' | 'experimental' | 'deprecated' | 'removed';
  readonly releaseReady: boolean;
  readonly title: string;
  readonly canonicalQuestion: string;
  readonly cannotEstablish: readonly string[];
  readonly renderer: { readonly id: string; readonly revision: number };
  readonly semanticValidators: readonly { readonly id: SemanticValidatorId; readonly parameters?: Readonly<Record<string, unknown>> }[];
  readonly disclosures: readonly DisclosureId[];
  readonly budgets: {
    readonly maxObservations: number;
    readonly maxVisibleMarks: number;
    readonly maxInlineTableRows: number;
    readonly compactionPolicies: readonly string[];
    readonly tablePolicy: string;
  };
  readonly uncertaintySupport: readonly string[];
  readonly accessibility: {
    readonly summaryTemplate: string;
    readonly tableColumns: readonly { readonly key: string; readonly header: string; readonly description?: string }[];
  };
  readonly evidence: { readonly handVectors: boolean; readonly externalOracle: unknown };
  readonly legacyIds: readonly string[];
  readonly owner: string;
  readonly knownLimitations: readonly string[];
}

export const SKILL_CATALOG: Readonly<Record<string, SkillCatalogEntry>> = Object.freeze(${JSON.stringify(
  Object.fromEntries(
    skills.map((s) => [
      s.id,
      {
        id: s.id,
        revision: s.revision,
        status: s.status,
        releaseReady: s.releaseReady,
        title: s.title,
        canonicalQuestion: s.purpose.canonicalQuestion,
        cannotEstablish: s.purpose.cannotEstablish,
        renderer: s.renderer,
        semanticValidators: s.semanticValidators,
        disclosures: s.disclosures,
        budgets: s.budgets,
        uncertaintySupport: s.science.uncertaintySupport,
        accessibility: s.accessibility,
        evidence: s.evidence,
        legacyIds: s.migration.legacyIds,
        owner: s.owner,
        knownLimitations: s.knownLimitations,
      },
    ]),
  ),
  null,
  2,
)});

/** The stable catalog, in a deliberate discovery order: traces, events, distributions, topology, spatial. */
export const STABLE_SKILL_IDS = ${JSON.stringify(stableSkills.map((s) => s.id).sort(), null, 2)} as const;
export type StableSkillId = (typeof STABLE_SKILL_IDS)[number];

export const EXPERIMENTAL_CAPABILITY_IDS = ${JSON.stringify(
  capabilities.capabilities
    .filter((c: any) => c.status === 'experimental' && c.kind === 'skill')
    .map((c: any) => c.id)
    .sort(),
  null,
  2,
)} as const;

export const REMOVED_CAPABILITY_IDS = ${JSON.stringify(
  capabilities.capabilities
    .filter((c: any) => c.status === 'removed')
    .map((c: any) => c.id)
    .sort(),
  null,
  2,
)} as const;

export interface LegacyMapEntry {
  readonly legacyId: string;
  readonly outcome: 'migrate' | 'migrate_conditional' | 'experimental' | 'removed' | 'blocked' | 'recipe';
  readonly targetId: string | null;
  readonly transform: string | null;
  readonly errorCode?: string;
  readonly notes: string;
  readonly requires?: readonly string[];
  readonly alternatives?: readonly string[];
  readonly materializedParameters?: Readonly<Record<string, unknown>>;
}

/** Every pre-1.0 id has a deterministic outcome here. There is no fall-through. */
export const LEGACY_SKILL_MAP: Readonly<Record<string, LegacyMapEntry>> = Object.freeze(${JSON.stringify(
  Object.fromEntries(legacyMap.entries.map((e: any) => [e.legacyId, e])),
  null,
  2,
)});

export const RENDERERS = Object.freeze(${JSON.stringify(
  Object.fromEntries(renderers.renderers.map((r: any) => [r.id, r])),
  null,
  2,
)});

export const THEMES = Object.freeze(${JSON.stringify(
  Object.fromEntries(palettes.themes.map((t: any) => [t.id, t])),
  null,
  2,
)});

export const CATEGORICAL_SERIES_STYLES = Object.freeze(${JSON.stringify(
  palettes.categoricalSeries.styles,
  null,
  2,
)});

export const MAX_STABLE_SERIES = ${palettes.categoricalSeries.maxStableSeries};
`;

// ---------------------------------------------------------------------------
// The contract digest.
//
// Computed over the CANONICALIZED normative source, so that reformatting a JSON
// file cannot change the identity while changing a value always does.
// ---------------------------------------------------------------------------

function collectNormativeFiles(): { path: string; digest: string }[] {
  const entries: { path: string; digest: string }[] = [];

  const addFile = (absolute: string): void => {
    const relative = path.relative(ROOT, absolute).split(path.sep).join('/');
    const value = readJson(absolute);
    entries.push({ path: relative, digest: `sha256:${sha256Hex(canonicalize(value))}` });
  };

  addFile(path.join(CONTRACT, 'meta', 'contract-source.schema.json'));

  for (const file of listJson(path.join(CONTRACT, 'registries'))) {
    addFile(path.join(CONTRACT, 'registries', file));
  }
  for (const file of listJson(path.join(CONTRACT, 'schemas'))) {
    addFile(path.join(CONTRACT, 'schemas', file));
  }
  for (const file of listJson(GENERATED_SCHEMAS)) {
    addFile(path.join(GENERATED_SCHEMAS, file));
  }
  for (const file of listJson(GENERATED_SKILL_SCHEMAS)) {
    addFile(path.join(GENERATED_SKILL_SCHEMAS, file));
  }
  for (const file of skillFiles) {
    addFile(path.join(CONTRACT, 'skills', file));
  }

  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return entries;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

// The generated schemas participate in the digest, so they must exist before it
// is computed. Clear first: a stale skill schema left behind by a renamed skill
// would silently join the digest and make it wrong.
rmSync(GENERATED_SCHEMAS, { recursive: true, force: true });
rmSync(GENERATED_SKILL_SCHEMAS, { recursive: true, force: true });
ensureDir(GENERATED_SCHEMAS);
ensureDir(GENERATED_SKILL_SCHEMAS);

writeIfChanged(
  path.join(GENERATED_SCHEMAS, 'registry-enums.v1.schema.json'),
  `${JSON.stringify(enumSchema, null, 2)}\n`,
);

for (const skill of skills) {
  writeIfChanged(
    path.join(GENERATED_SKILL_SCHEMAS, `${skill.id}.request.v1.schema.json`),
    `${JSON.stringify(composeRequestSchema(skill), null, 2)}\n`,
  );
}

const sources = collectNormativeFiles();
const contractDigest = `sha256:${sha256Hex(canonicalize(sources))}`;

const stableCatalogView = stableSkills.map((s) => ({
  id: s.id,
  revision: s.revision,
  renderer: s.renderer,
}));
const catalogDigest = `sha256:${sha256Hex(canonicalize(stableCatalogView))}`;

const packageJson = readJson(path.join(ROOT, 'package.json'));

const manifest = {
  manifest: 'cortexel-contract-manifest',
  manifestVersion: 1,
  requestContract: 'cortexel-figure-request/1.0',
  artifactContract: 'cortexel-figure-artifact/1.0',
  contractDigest,
  catalogDigest,
  stableSkillCount: stableSkills.length,
  stableSkills: stableSkills.map((s) => ({
    id: s.id,
    revision: s.revision,
    title: s.title,
    renderer: s.renderer,
    releaseReady: s.releaseReady,
    canonicalQuestion: s.purpose.canonicalQuestion,
    requestSchema: `contract/schemas/skills/${s.id}.request.v1.schema.json`,
    uncertaintySupport: s.science.uncertaintySupport,
    budgets: s.budgets,
    disclosures: s.disclosures,
    semanticValidators: s.semanticValidators.map((v: any) => v.id),
    evidence: s.evidence,
    legacyIds: s.migration.legacyIds,
  })),
  experimentalCapabilities: capabilities.capabilities
    .filter((c: any) => c.status === 'experimental')
    .map((c: any) => ({ id: c.id, kind: c.kind, requiredPeers: c.requiredPeers ?? [] })),
  removedCapabilities: capabilities.capabilities
    .filter((c: any) => c.status === 'removed')
    .map((c: any) => ({ id: c.id, replacement: c.replacement ?? null })),
  budgetProfiles: budgets.profiles.map((p: any) => p.id),
  errorCodeCount: errorCodeIds.size,
  semanticValidatorCount: validatorIds.size,
  disclosureRuleCount: disclosureIds.size,
  normativeSources: sources,
  notes: [
    'GENERATED. Never edit by hand.',
    'contractDigest covers the canonicalized normative source set, excluding this file (it cannot contain its own hash) and excluding the conformance corpus (vectors test the contract; they are not the contract).',
    'catalogDigest covers the STABLE catalog only, so editing an experimental capability cannot change the stable identity.',
    'releaseReady is false for every skill: the pinned scientific reference environment has not been executed, so no external-oracle evidence exists yet.',
  ],
};

const identityTs = `${BANNER('contract/ (digest) and package.json (version)')}
export const PACKAGE_VERSION = ${JSON.stringify(packageJson.version)};
export const REQUEST_CONTRACT = 'cortexel-figure-request/1.0';
export const ARTIFACT_CONTRACT = 'cortexel-figure-artifact/1.0';
export const CONTRACT_DIGEST = ${JSON.stringify(contractDigest)};
export const CATALOG_DIGEST = ${JSON.stringify(catalogDigest)};
export const STABLE_SKILL_COUNT = ${stableSkills.length};

export interface BuildIdentity {
  readonly packageVersion: string;
  readonly requestContract: string;
  readonly artifactContract: string;
  readonly contractDigest: string;
  readonly catalogDigest: string;
  readonly stableSkillCount: number;
  readonly sourceRevision: string;
  readonly release: boolean;
}

/**
 * Every identity axis, named.
 *
 * \`sourceRevision\` is the literal 'unreleased-worktree' unless a release build
 * stamps it. A build that guessed at a release commit would be lying about its own
 * provenance, which is worse than having none.
 */
export function getBuildIdentity(): BuildIdentity {
  return Object.freeze({
    packageVersion: PACKAGE_VERSION,
    requestContract: REQUEST_CONTRACT,
    artifactContract: ARTIFACT_CONTRACT,
    contractDigest: CONTRACT_DIGEST,
    catalogDigest: CATALOG_DIGEST,
    stableSkillCount: STABLE_SKILL_COUNT,
    sourceRevision: 'unreleased-worktree',
    release: false,
  });
}
`;

const pyCatalog = `${PY_BANNER('contract/')}
from typing import Any, Dict, List

PACKAGE_VERSION: str = ${JSON.stringify(packageJson.version)}
REQUEST_CONTRACT: str = "cortexel-figure-request/1.0"
ARTIFACT_CONTRACT: str = "cortexel-figure-artifact/1.0"
CONTRACT_DIGEST: str = ${JSON.stringify(contractDigest)}
CATALOG_DIGEST: str = ${JSON.stringify(catalogDigest)}

STABLE_SKILL_IDS: List[str] = ${JSON.stringify(stableSkills.map((s) => s.id).sort(), null, 4)}

ERROR_CODES: List[str] = ${JSON.stringify([...errorCodeIds].sort(), null, 4)}

ERROR_STAGES: List[str] = ${JSON.stringify(errorCodes.stages, null, 4)}

UNITS: Dict[str, Any] = ${JSON.stringify(
  Object.fromEntries(
    units.units.map((u: any) => [
      u.code,
      { dimension: u.dimension, to_canonical: u.toCanonical, label: u.label, aliases: u.aliases ?? [] },
    ]),
  ),
  null,
  4,
)}

UNIT_ALIASES: Dict[str, str] = ${JSON.stringify(
  Object.fromEntries(
    units.units.flatMap((u: any) =>
      (u.aliases ?? [])
        .filter((alias: string) => alias.length > 0 && !unitCodes.has(alias))
        .map((alias: string) => [alias, u.code]),
    ),
  ),
  null,
  4,
)}

QUANTITY_KIND_DIMENSIONS: Dict[str, List[str]] = ${JSON.stringify(
  Object.fromEntries(units.quantityKinds.map((q: any) => [q.kind, q.dimensions])),
  null,
  4,
)}

BUDGET_PROFILES: Dict[str, Dict[str, int]] = ${JSON.stringify(
  Object.fromEntries(
    budgets.profiles.map((profile: any) => [
      profile.id,
      Object.fromEntries(
        Object.entries(profile.limits).map(([name, limit]: [string, any]) => [name, limit.value]),
      ),
    ]),
  ),
  null,
  4,
)}
`.replace(/\bnull\b/g, 'None').replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False');

const written: string[] = [];
const record = (file: string, content: string): void => {
  if (writeIfChanged(file, content)) written.push(path.relative(ROOT, file));
};

record(path.join(GENERATED_TS, 'registry.ts'), registryTs);
record(path.join(GENERATED_TS, 'budgets.ts'), budgetsTs);
record(path.join(GENERATED_TS, 'catalog.ts'), catalogTs);
record(path.join(GENERATED_TS, 'identity.ts'), identityTs);
record(path.join(GENERATED_TS, 'index.ts'), `${BANNER('contract/')}
export * from './registry.js';
export * from './budgets.js';
export * from './catalog.js';
export * from './identity.js';
`);
record(path.join(CONTRACT, 'manifest.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`);
record(path.join(GENERATED_PY, 'catalog.py'), pyCatalog);
record(path.join(GENERATED_PY, '__init__.py'), `${PY_BANNER('contract/')}
from .catalog import (
    PACKAGE_VERSION,
    REQUEST_CONTRACT,
    ARTIFACT_CONTRACT,
    CONTRACT_DIGEST,
    CATALOG_DIGEST,
    STABLE_SKILL_IDS,
    ERROR_CODES,
    ERROR_STAGES,
    UNITS,
    UNIT_ALIASES,
    QUANTITY_KIND_DIMENSIONS,
    BUDGET_PROFILES,
)

__all__ = [
    "PACKAGE_VERSION",
    "REQUEST_CONTRACT",
    "ARTIFACT_CONTRACT",
    "CONTRACT_DIGEST",
    "CATALOG_DIGEST",
    "STABLE_SKILL_IDS",
    "ERROR_CODES",
    "ERROR_STAGES",
    "UNITS",
    "UNIT_ALIASES",
    "QUANTITY_KIND_DIMENSIONS",
    "BUDGET_PROFILES",
]
`);

process.stdout.write(
  `Generated from ${skills.length} skill contracts (${stableSkills.length} stable).\n` +
    `  contract digest: ${contractDigest}\n` +
    `  catalog  digest: ${catalogDigest}\n` +
    `  normative files: ${sources.length}\n` +
    (written.length > 0
      ? `  updated:\n${written.map((f) => `    ${f}`).join('\n')}\n`
      : '  no changes\n'),
);
