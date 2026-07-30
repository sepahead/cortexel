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
import {
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

import { canonicalize } from '../src/core/canonicalize.js';
import { sha256Hex } from '../src/core/sha256.js';
import tsupConfig from '../tsup.config.js';
import { buildManifest as buildLegacySkillsManifest } from './emit-manifest.js';
import {
  canonicalizationEntryDigest,
  canonicalizationReferences,
  canonicalizationSourceProblems,
} from './lib/canonicalization-source.js';
import {
  buildEntryOutputBases,
  buildEntryIds,
  capabilitySourceProblems,
  implementedCliIds,
  packageExportIds,
  packageBinTargetProblems,
  packageHasCortexelBin,
  packageIncludesDist,
  packageExportTargetProblems,
  packagedSkillIds,
  sourceEntryId,
} from './lib/capability-source.js';
import { numericPolicySourceProblems } from './lib/numeric-policy-source.js';
import { outputAuthoritySourceProblems } from './lib/output-authority-source.js';
import { sourceKindDisclosureSourceProblems } from './lib/disclosure-source.js';
import {
  contractIdentitySourceProblems,
  resolveContractIdentitySource,
} from './lib/identity-source.js';
import {
  packageDistributionIdentityProblems,
  parsePythonProjectMetadata,
} from './lib/release-identity.js';
import {
  OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1,
  outputAuthorityImplementationInventoryProblemsV1,
} from '../src/authority/evaluators/implementation-ids.js';
import {
  ADAPTER_IMPLEMENTATIONS_V1,
} from '../src/adapters/implementation-inventory.js';
import { parseJsonSourceStrict } from './lib/strict-json-source.js';
import { readDirectRepositoryFile } from './lib/direct-repository-file.js';
import { deriveAdapterCertificationRequirementV1 } from './lib/adapter-certification.js';
import {
  resolveAdapterConformanceProfileV1,
} from './lib/adapter-conformance-profile.js';
import {
  adapterSourceIdentityProblems,
} from './lib/adapter-source-identity.js';
import { validateLedger } from './check-evidence-ledger.js';
import { CLI_COMMANDS } from '../src/cli/commands.js';
import { buildContractManifest } from './lib/contract-manifest.js';
import {
  AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
  buildPublicAuthoringExample,
  buildPublicSkillAuthoringEntry,
  buildPublicSkillCatalogEntry,
  composeSkillRequestSchema,
} from './lib/stable-catalog.js';
import {
  enumerateNormativeContractFiles,
  NORMATIVE_CONTRACT_INCLUDE_PATTERNS,
} from './lib/normative-source-files.js';
import {
  assertGeneratedOutputDirectoryPath,
  assertGeneratedOutputFilePath,
  directRepositoryDirectoryExists,
  ensureGeneratedOutputDirectory,
} from './lib/generated-output-authority.js';
import { proveAuthoredObjectClosure } from './lib/schema-object-closure.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT = path.join(ROOT, 'contract');
const GENERATED_TS = path.join(ROOT, 'src', 'generated');
const GENERATED_SCHEMAS = path.join(CONTRACT, 'schemas', 'generated');
const GENERATED_SKILL_SCHEMAS = path.join(CONTRACT, 'schemas', 'skills');
const GENERATED_PY = path.join(ROOT, 'python', 'src', 'cortexel', 'generated');
const GENERATED_PY_CONTRACT = path.join(ROOT, 'python', 'src', 'cortexel', 'contract');

const BANNER = (source: string): string =>
  `/**\n * GENERATED FILE — DO NOT EDIT.\n *\n * Produced by scripts/generate-contract.ts from ${source}.\n * Edit the normative source and run \`bun run generate\`.\n * \`bun run check:generated\` fails if this file drifts from its source.\n */\n`;

const PY_BANNER = (source: string): string =>
  `"""GENERATED FILE - DO NOT EDIT.\n\nProduced by scripts/generate-contract.ts from ${source}.\nEdit the normative source and run \`bun run generate\`.\n"""\n`;

function readJson<T = any>(file: string): T {
  return parseJsonSourceStrict<T>(readFileSync(file), path.relative(ROOT, file));
}

function removeGeneratedPath(target: string): void {
  assertGeneratedOutputDirectoryPath(ROOT, target);
  if (!directRepositoryDirectoryExists(ROOT, path.dirname(target))) return;
  rmSync(target, { recursive: true, force: true });
}

function decimalPowerExponent(value: unknown): number | null {
  if (typeof value !== 'number' || !(value > 0) || !Number.isFinite(value)) return null;
  for (let exponent = -24; exponent <= 24; exponent++) {
    if (value === Number(`1e${exponent}`)) return exponent;
  }
  return null;
}

/**
 * Emit a deterministic Python literal without rewriting token-shaped text inside strings.
 *
 * The former JSON-stringify-then-regex path changed prose such as `time_in_steps:true`
 * into `time_in_steps:True`. That made the Python projection differ from its normative
 * source while remaining syntactically valid. Recursing by JSON value keeps structural
 * booleans/null Python-native and leaves every string byte semantically intact.
 */
function pythonLiteral(value: unknown, depth = 0): string {
  if (value === null) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('cannot emit non-JSON number as Python');
    return encoded;
  }
  const indentation = ' '.repeat(depth * 4);
  const childIndentation = ' '.repeat((depth + 1) * 4);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '[\n' +
      value.map((item) => `${childIndentation}${pythonLiteral(item, depth + 1)}`).join(',\n') +
      `\n${indentation}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    return '{\n' +
      entries.map(([key, item]) =>
        `${childIndentation}${JSON.stringify(key)}: ${pythonLiteral(item, depth + 1)}`
      ).join(',\n') +
      `\n${indentation}}`;
  }
  throw new Error(`cannot emit ${typeof value} as a Python literal`);
}

function writeIfChanged(file: string, content: string): boolean {
  assertGeneratedOutputFilePath(ROOT, file);
  let existing: string | null = null;
  const parent = path.dirname(file);
  const parentExists = directRepositoryDirectoryExists(ROOT, parent);
  if (parentExists) {
    try {
      const existingStat = lstatSync(file);
      if (existingStat.isFile() && !existingStat.isSymbolicLink()) {
        if (existingStat.nlink !== 1) {
          throw new Error(`generated output file is hard-linked: ${file}`);
        }
        existing = readFileSync(file, 'utf8');
      } else {
        throw new Error(`generated output file is not a direct regular file: ${file}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  } else {
    // A missing direct parent proves the file is absent. Creation remains gated below.
    existing = null;
  }
  if (existing === content) return false;
  if (!parentExists) ensureGeneratedOutputDirectory(ROOT, parent);
  writeFileSync(file, content);
  return true;
}

// ---------------------------------------------------------------------------
// Load the normative source
// ---------------------------------------------------------------------------

// Preflight and de-symlink the complete source namespace before reading even one
// normative byte. This makes a direct generator run fail before it can clear stale
// generated output when an undeclared or indirect path is already present. As with all
// pathname checks, the workspace remains a trusted boundary against concurrent rename.
const existingNormativeFiles = enumerateNormativeContractFiles(CONTRACT);

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
const numericPolicies = readJson(path.join(CONTRACT, 'registries', 'numeric-policies.v1.json'));
const canonicalizations = readJson(path.join(CONTRACT, 'registries', 'canonicalizations.v1.json'));
const identity = readJson(path.join(CONTRACT, 'registries', 'identity.v1.json'));
const commonSchema = readJson(path.join(CONTRACT, 'schemas', 'common.v1.schema.json'));
const figureRequestSchema = readJson(
  path.join(CONTRACT, 'schemas', 'figure-request.v1.schema.json'),
);
const figureArtifactSchema = readJson(
  path.join(CONTRACT, 'schemas', 'figure-artifact.v1.schema.json'),
);
const contractSourceSchema = readJson(path.join(CONTRACT, 'meta', 'contract-source.schema.json'));
const canonicalizationRegistrySchema = readJson(
  path.join(CONTRACT, 'meta', 'canonicalization-registry.schema.json'),
);
const adapterConformanceProfiles = readJson(
  path.join(CONTRACT, 'registries', 'adapter-conformance-profiles.v1.json'),
);
const adapterConformanceProfilesSchema = readJson(
  path.join(CONTRACT, 'meta', 'adapter-conformance-profiles.schema.json'),
);
const packageJson = readJson(path.join(ROOT, 'package.json'));
const releaseEvidenceLedger = parseJsonSourceStrict<any>(
  readDirectRepositoryFile(ROOT, 'docs/release/evidence-ledger.v1.json'),
  'docs/release/evidence-ledger.v1.json',
);
const releaseEvidenceLedgerSchema = parseJsonSourceStrict<any>(
  readDirectRepositoryFile(ROOT, 'docs/release/evidence-ledger.schema.json'),
  'docs/release/evidence-ledger.schema.json',
);
const pythonProject = parsePythonProjectMetadata(
  readFileSync(path.join(ROOT, 'python', 'pyproject.toml'), 'utf8'),
);
const legacySkillsManifest = buildLegacySkillsManifest();

const skillFiles = existingNormativeFiles.filter((file) => file.startsWith('skills/'));
const skills = skillFiles.map((file) => readJson(path.join(CONTRACT, file)));
skills.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const stableSkills = skills.filter((s) => s.status === 'stable');
const MAX_DISCLOSURE_TEXT_LENGTH = 400;

// ---------------------------------------------------------------------------
// Integrity checks. The generator refuses to emit an incoherent contract — a
// dangling validator id would otherwise become a runtime crash in a figure.
// ---------------------------------------------------------------------------

const problems: string[] = [];
const releaseEvidenceLedgerValidation = validateLedger(
  releaseEvidenceLedger,
  releaseEvidenceLedgerSchema,
);
for (const error of releaseEvidenceLedgerValidation.errors) {
  problems.push(`release evidence ledger: ${error}`);
}
const releaseEvidenceGates = Array.isArray(releaseEvidenceLedger.gates)
  ? releaseEvidenceLedger.gates
  : [];

problems.push(...sourceKindDisclosureSourceProblems(
  disclosures,
  stableSkills,
  commonSchema.$defs?.sourceDeclaration?.properties?.kind?.enum ?? [],
));

problems.push(...packageDistributionIdentityProblems({
  packageName: packageJson.name,
  packageVersion: packageJson.version,
  packagePrivate: packageJson.private,
  publishConfigPresent: Object.hasOwn(packageJson, 'publishConfig'),
  packageNodeEngine: packageJson.engines?.node,
  pythonProjectName: pythonProject.name,
  pythonProjectVersion: pythonProject.version,
}));

const DANGEROUS_GENERATED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Object.fromEntries and emitted object literals are map construction boundaries.
 * Duplicate ids would silently let the last record win, while `__proto__` has special
 * object-literal semantics and could disappear before freezeGenerated sees it. Refuse
 * both at generation time instead of emitting an authority different from its source.
 */
function assertUniqueMapKeys(
  records: readonly any[],
  field: string,
  where: string,
): void {
  const seen = new Set<string>();
  records.forEach((record, index) => {
    const key = record?.[field];
    if (typeof key !== 'string' || key.length === 0) {
      problems.push(`${where}[${index}].${field}: expected a non-empty string map key`);
      return;
    }
    if (DANGEROUS_GENERATED_KEYS.has(key)) {
      problems.push(`${where}[${index}].${field}: dangerous generated map key "${key}" is forbidden`);
    }
    if (seen.has(key)) {
      problems.push(`${where}[${index}].${field}: duplicate generated map key "${key}"`);
    }
    seen.add(key);
  });
}

function assertUniqueStrings(values: readonly unknown[], where: string): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (typeof value !== 'string' || value.length === 0) {
      problems.push(`${where}[${index}]: expected a non-empty string`);
      return;
    }
    if (seen.has(value)) problems.push(`${where}[${index}]: duplicate value "${value}"`);
    seen.add(value);
  });
}

function assertSameStringSet(actual: readonly string[], expected: readonly string[], where: string): void {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value)).sort();
  const extra = [...actualSet].filter((value) => !expectedSet.has(value)).sort();
  if (missing.length > 0 || extra.length > 0) {
    problems.push(`${where}: set mismatch; missing [${missing.join(', ')}], extra [${extra.join(', ')}]`);
  }
}

const uncertaintyKinds = (commonSchema.$defs.uncertainty.oneOf as any[]).flatMap((branch: any) => {
  const kind = branch?.properties?.kind;
  return typeof kind?.const === 'string'
    ? [kind.const]
    : Array.isArray(kind?.enum)
      ? kind.enum
      : [];
});
const metaUncertaintyKinds = contractSourceSchema.properties.science.properties
  .uncertaintySupport.items.enum as string[];
const paletteUncertaintyKinds = palettes.uncertaintyStyles.map((style: any) => style.kind) as string[];

function assertNoDangerousObjectKeys(value: unknown, where: string): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoDangerousObjectKeys(child, `${where}[${index}]`));
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (DANGEROUS_GENERATED_KEYS.has(key)) {
      problems.push(`${where}: dangerous object member "${key}" cannot be emitted safely`);
    }
    assertNoDangerousObjectKeys((value as Record<string, unknown>)[key], `${where}.${key}`);
  }
}

assertUniqueMapKeys(errorCodes.codes, 'code', 'error-codes.codes');
assertUniqueStrings(errorCodes.stages, 'error-codes.stages');
assertUniqueMapKeys(units.units, 'code', 'units.units');
assertUniqueMapKeys(units.quantityKinds, 'kind', 'units.quantityKinds');
assertUniqueMapKeys(semanticValidators.validators, 'id', 'semantic-validators.validators');
assertUniqueMapKeys(disclosures.rules, 'id', 'disclosures.rules');
for (const [index, rule] of disclosures.rules.entries()) {
  if (
    typeof rule.text !== 'string' ||
    rule.text.length < 1 ||
    rule.text.length > MAX_DISCLOSURE_TEXT_LENGTH
  ) {
    problems.push(
      `disclosures.rules[${index}].text: expected 1..${MAX_DISCLOSURE_TEXT_LENGTH} UTF-16 code units`,
    );
  }
}
assertUniqueMapKeys(budgets.profiles, 'id', 'budget-profiles.profiles');
assertUniqueMapKeys(budgets.compactionPolicies, 'id', 'budget-profiles.compactionPolicies');
assertUniqueMapKeys(capabilities.capabilities, 'id', 'capabilities.capabilities');
assertUniqueMapKeys(legacyMap.entries, 'legacyId', 'legacy-skill-map.entries');
assertUniqueMapKeys(renderers.renderers, 'id', 'renderers.renderers');
assertUniqueMapKeys(palettes.themes, 'id', 'palettes.themes');
assertUniqueMapKeys(palettes.uncertaintyStyles, 'kind', 'palettes.uncertaintyStyles');
assertUniqueMapKeys(numericPolicies.algorithms, 'id', 'numeric-policies.algorithms');
assertUniqueMapKeys(numericPolicies.policies, 'id', 'numeric-policies.policies');
assertUniqueMapKeys(canonicalizations.algorithms, 'id', 'canonicalizations.algorithms');
assertUniqueMapKeys(
  adapterConformanceProfiles.profiles,
  'id',
  'adapter-conformance-profiles.profiles',
);
assertUniqueMapKeys(releaseEvidenceGates, 'id', 'release evidence ledger gates');
assertUniqueMapKeys(skills, 'id', 'contract/skills');
assertUniqueStrings(uncertaintyKinds, 'common.$defs.uncertainty kinds');
assertUniqueStrings(metaUncertaintyKinds, 'contract-source uncertainty kinds');
assertSameStringSet(metaUncertaintyKinds, uncertaintyKinds, 'contract-source uncertainty kinds');
assertSameStringSet(paletteUncertaintyKinds, uncertaintyKinds, 'palette uncertainty kinds');
for (const [index, style] of palettes.uncertaintyStyles.entries()) {
  if (!['band', 'whisker', 'none'].includes(style.mark)) {
    problems.push(`palettes.uncertaintyStyles[${index}].mark: expected band, whisker, or none`);
  }
  if (typeof style.label !== 'string' || style.label.trim().length === 0) {
    problems.push(`palettes.uncertaintyStyles[${index}].label: expected a non-empty string`);
  }
  if ((style.kind === 'none') !== (style.mark === 'none')) {
    problems.push(`palettes.uncertaintyStyles[${index}]: only uncertainty kind none may use mark none`);
  }
}
for (const [index, skill] of skills.entries()) {
  const support = skill.science?.uncertaintySupport ?? [];
  assertUniqueStrings(support, `contract/skills[${index}].science.uncertaintySupport`);
  const unsupported = support.filter((kind: string) => !uncertaintyKinds.includes(kind));
  if (unsupported.length > 0) {
    problems.push(`contract/skills[${index}].science.uncertaintySupport: unknown kinds [${unsupported.join(', ')}]`);
  }
}

for (const [where, value] of [
  ['units', units],
  ['error-codes', errorCodes],
  ['capabilities', capabilities],
  ['semantic-validators', semanticValidators],
  ['disclosures', disclosures],
  ['budget-profiles', budgets],
  ['legacy-skill-map', legacyMap],
  ['renderers', renderers],
  ['palettes', palettes],
  ['numeric-policies', numericPolicies],
  ['canonicalizations', canonicalizations],
  ['adapter-conformance-profiles', adapterConformanceProfiles],
] as const) {
  assertNoDangerousObjectKeys(value, where);
}
skills.forEach((skill, index) => assertNoDangerousObjectKeys(skill, `contract/skills[${index}]`));

const aliasOwners = new Map<string, string>();
const canonicalUnitCodes = new Set<string>(units.units.map((unit: any) => unit.code));
for (const unit of units.units) {
  for (const alias of unit.aliases ?? []) {
    if (typeof alias !== 'string' || alias.length === 0) continue;
    if (DANGEROUS_GENERATED_KEYS.has(alias)) {
      problems.push(`unit ${unit.code}: dangerous generated alias key "${alias}" is forbidden`);
    }
    if (canonicalUnitCodes.has(alias)) {
      problems.push(`unit ${unit.code}: alias "${alias}" collides with a canonical unit code`);
    }
    const prior = aliasOwners.get(alias);
    if (prior !== undefined) {
      problems.push(`unit ${unit.code}: alias "${alias}" duplicates the alias owned by unit ${prior}`);
    } else {
      aliasOwners.set(alias, unit.code);
    }
  }
}

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
const rendererById = new Map<string, any>(
  renderers.renderers.map((renderer: any) => [renderer.id, renderer]),
);
const rendererIds = new Set<string>(rendererById.keys());
const numericPolicyIds = new Set<string>(numericPolicies.policies.map((r: any) => r.id));
const canonicalizationIds = new Set<string>(
  canonicalizations.algorithms.map((algorithm: any) => algorithm.id),
);
const compactionIds = new Set<string>(budgets.compactionPolicies.map((p: any) => p.id));
const capabilityIds = new Map<string, any>(capabilities.capabilities.map((c: any) => [c.id, c]));
const releaseEvidenceGateById = new Map<string, any>(
  releaseEvidenceGates.map((gate: any) => [gate.id, gate]),
);

const adapterImplementationKey = (skillId: string, mappingId: string): string =>
  `${skillId}\u0000${mappingId}`;
const adapterImplementationByKey = new Map<
  string,
  (typeof ADAPTER_IMPLEMENTATIONS_V1)[number]
>();
const adapterCertificationRequirementByKey = new Map<string, any>();
for (const implementation of ADAPTER_IMPLEMENTATIONS_V1) {
  const key = adapterImplementationKey(implementation.skillId, implementation.mappingId);
  if (adapterImplementationByKey.has(key)) {
    problems.push(
      `adapter implementation inventory: duplicate ${implementation.skillId}/${implementation.mappingId}`,
    );
    continue;
  }
  adapterImplementationByKey.set(key, implementation);

  const capability = capabilityIds.get(implementation.packageCapability);
  if (!capability) {
    problems.push(
      `adapter implementation inventory: ${implementation.skillId}/${implementation.mappingId} ` +
        `names unknown capability "${implementation.packageCapability}"`,
    );
  } else if (capability.availability !== implementation.implementationAvailability) {
    problems.push(
      `adapter implementation inventory: ${implementation.skillId}/${implementation.mappingId} ` +
        `availability "${implementation.implementationAvailability}" disagrees with capability ` +
        `"${implementation.packageCapability}" availability "${String(capability.availability)}"`,
    );
  }

  const certificationGateId = implementation.certificationRequirement.gate.id;
  const certificationGate = releaseEvidenceGateById.get(certificationGateId);
  const certificationProjection = deriveAdapterCertificationRequirementV1(
    implementation,
    certificationGate,
  );
  for (const problem of certificationProjection.problems) {
    problems.push(`adapter implementation inventory: ${problem}`);
  }
  if (certificationProjection.requirement !== null) {
    adapterCertificationRequirementByKey.set(key, certificationProjection.requirement);
  }

  const conformanceProjection = resolveAdapterConformanceProfileV1(
    implementation.certificationRequirement.conformanceProfile,
    adapterConformanceProfiles,
  );
  for (const problem of conformanceProjection.problems) {
    problems.push(
      `adapter implementation inventory: ${implementation.skillId}/${implementation.mappingId}: ${problem}`,
    );
  }
  const conformanceProfile = conformanceProjection.profile as any;
  if (conformanceProfile !== null) {
    const implementationProfile = implementation.adapterProfile;
    const expectedAdapter =
      `${implementation.packageCapability}#${implementation.exportName}`;
    const conformanceBranches = conformanceProfile.branches;
    const implementationBranches = (implementationProfile as any).branches;
    const branchProfilesAgree = implementationBranches === undefined
      ? conformanceBranches === undefined &&
        conformanceProfile.captureAuthorityProfile ===
          (implementationProfile as any).captureAuthorityProfile &&
        conformanceProfile.admittedStatus?.statusReadMethod ===
          (implementationProfile as any).statusReadMethod
      : conformanceBranches !== undefined &&
        canonicalize(conformanceBranches) === canonicalize(implementationBranches);
    for (const [valid, relation] of [
      [
        conformanceProfile.adapter === expectedAdapter,
        `profile adapter must equal ${JSON.stringify(expectedAdapter)}`,
      ],
      [
        conformanceProfile.lifecycle === 'current' &&
          conformanceProfile.executable === true,
        'implementation conformance profile must be current and executable',
      ],
      [
        conformanceProfile.adapterRevision === implementationProfile.adapterRevision,
        'profile adapterRevision must equal the implementation-owned revision',
      ],
      [
        conformanceProfile.upstream?.version === implementationProfile.nestVersion,
        'profile upstream version must equal the implementation-owned NEST version',
      ],
      [
        conformanceProfile.upstream?.sourceCommit ===
          implementationProfile.upstreamSourceCommit,
        'profile upstream source commit must equal the implementation-owned source commit',
      ],
      [
        conformanceProfile.inputDigestDomain === implementationProfile.inputDigestDomain,
        'profile inputDigestDomain must equal the implementation-owned digest domain',
      ],
      [
        conformanceProfile.timeBuildProfile ===
          (implementationProfile as any).timeBuildProfile,
        'profile timeBuildProfile must equal the implementation-owned time-build profile',
      ],
      [
        conformanceProfile.captureBoundary ===
          (implementationProfile as any).captureBoundary,
        'profile captureBoundary must equal the implementation-owned capture boundary',
      ],
      [
        Object.is(
          conformanceProfile.positiveInfinityExportedMs,
          (implementationProfile as any).positiveInfinityExportedMs,
        ),
        'profile positiveInfinityExportedMs must equal the implementation-owned exported sentinel value',
      ],
      [
        branchProfilesAgree,
        'profile branch authority/method/boundary map must exactly equal the implementation-owned branch map',
      ],
    ] as const) {
      if (!valid) {
        problems.push(
          `adapter implementation inventory: ${implementation.skillId}/${implementation.mappingId}: ${relation}`,
        );
      }
    }

  }

  const source = path.join(ROOT, implementation.sourcePath);
  if (!existsSync(source)) {
    problems.push(
      `adapter implementation inventory: source does not exist: ${implementation.sourcePath}`,
    );
  }

  const publicEntry = path.join(ROOT, implementation.publicEntryPath);
  if (!existsSync(publicEntry)) {
    problems.push(
      `adapter implementation inventory: public entry does not exist: ` +
        `${implementation.publicEntryPath}`,
    );
  }
}

const sourceEntryFiles = [
  path.join(ROOT, 'src', 'index.ts'),
  path.join(ROOT, 'src', 'core', 'index.ts'),
  path.join(ROOT, 'src', 'figure', 'index.ts'),
  path.join(ROOT, 'src', 'authoring', 'index.ts'),
  path.join(ROOT, 'src', 'render', 'index.ts'),
  path.join(ROOT, 'src', 'adapters', 'nest', 'index.ts'),
];
const sourceExportIds = new Set(
  sourceEntryFiles.flatMap((file) => {
    if (!existsSync(file)) return [];
    const id = sourceEntryId(readFileSync(file, 'utf8'));
    return id === null ? [] : [id];
  }),
);
const tsupOptions = Array.isArray(tsupConfig) ? tsupConfig[0] : tsupConfig;
const tsupEntry = typeof tsupOptions === 'object' && tsupOptions !== null &&
  !Array.isArray(tsupOptions)
  ? (tsupOptions as { entry?: unknown }).entry
  : undefined;
const configuredPackageExports = packageExportIds(packageJson);
const configuredBuildEntries = buildEntryIds(tsupEntry);
const figureRuntimeIsPackaged = [
  'cortexel/figure',
  'cortexel/render-svg',
  'cortexel/contract',
].every((id) => configuredPackageExports.has(id)) && [
  'cortexel/figure',
  'cortexel/render-svg',
].every((id) => configuredBuildEntries.has(id));

problems.push(...packageExportTargetProblems(packageJson, buildEntryOutputBases(tsupEntry)));
problems.push(...packageBinTargetProblems(packageJson, tsupEntry));
problems.push(...capabilitySourceProblems(capabilities, {
  packageExportIds: configuredPackageExports,
  buildEntryIds: configuredBuildEntries,
  packagedSkillIds: configuredPackageExports.has('cortexel/skills.manifest.json')
    ? packagedSkillIds(legacySkillsManifest)
    : new Set(),
  packagedFigureSkillIds: figureRuntimeIsPackaged
    ? new Set(skills.map((skill) => skill.id))
    : new Set(),
  cliIsPackaged: packageHasCortexelBin(packageJson),
  implementedCliIds: implementedCliIds(CLI_COMMANDS),
  sourceExportIds,
  contractSourceIds: existsSync(path.join(CONTRACT, 'meta', 'contract-source.schema.json'))
    ? new Set(['cortexel/contract'])
    : new Set(),
  skillContractIds: new Set(skills.map((skill) => skill.id)),
  rendererIds,
  legacyMapIds: new Set(legacyMap.entries.map((entry: any) => entry.legacyId)),
  tarballIncludesDist: packageIncludesDist(packageJson),
}));

problems.push(...numericPolicySourceProblems(numericPolicies));
problems.push(...canonicalizationSourceProblems(canonicalizations));
problems.push(...contractIdentitySourceProblems(identity, {
  figureRequestSchema,
  figureArtifactSchema,
  skills,
  errorCodes,
  normativeSourceIncludes: NORMATIVE_CONTRACT_INCLUDE_PATTERNS,
}));
const canonicalizationAjv = new Ajv2020({ allErrors: true, strict: true });
const validateCanonicalizationRegistry = canonicalizationAjv.compile(canonicalizationRegistrySchema);
if (!validateCanonicalizationRegistry(canonicalizations)) {
  for (const error of validateCanonicalizationRegistry.errors ?? []) {
    problems.push(
      `canonicalizations meta-schema ${error.instancePath || '/'} ${error.message ?? 'validation failed'}`,
    );
  }
}

const adapterConformanceAjv = new Ajv2020({ allErrors: true, strict: true });
const validateAdapterConformanceProfiles = adapterConformanceAjv.compile(
  adapterConformanceProfilesSchema,
);
if (!validateAdapterConformanceProfiles(adapterConformanceProfiles)) {
  for (const error of validateAdapterConformanceProfiles.errors ?? []) {
    problems.push(
      `adapter conformance profiles meta-schema ${error.instancePath || '/'} ` +
        `${error.message ?? 'validation failed'}`,
    );
  }
}

// The skill meta-schema is an executable source boundary, not documentation. Every
// normative skill file must satisfy it before any digest or generated output is
// produced. Previously the schema claimed this invariant but generation never ran it,
// allowing fourteen of nineteen sources to drift beyond their declared bounds.
const contractSourceAjv = new Ajv2020({ allErrors: true, strict: true });
const validateContractSource = contractSourceAjv.compile(contractSourceSchema);
for (const skill of skills) {
  if (validateContractSource(skill)) continue;
  for (const error of validateContractSource.errors ?? []) {
    problems.push(
      `skill ${String(skill.id)} meta-schema ${error.instancePath || '/'} ` +
      `${error.message ?? 'validation failed'}`,
    );
  }
}

function collectPropertyConstValues(
  value: unknown,
  propertyName: string,
  out: Set<string>,
): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((child) => collectPropertyConstValues(child, propertyName, out));
    return;
  }
  const node = value as Record<string, unknown>;
  const properties = node.properties;
  if (properties !== null && typeof properties === 'object' && !Array.isArray(properties)) {
    const property = (properties as Record<string, unknown>)[propertyName];
    if (property !== null && typeof property === 'object' && !Array.isArray(property)) {
      const constant = (property as Record<string, unknown>).const;
      if (typeof constant === 'string') out.add(constant);
    }
  }
  Object.values(node).forEach((child) => collectPropertyConstValues(child, propertyName, out));
}

function assertKnownCanonicalizationReferences(value: unknown, where: string): void {
  for (const id of canonicalizationReferences(value)) {
    if (!canonicalizationIds.has(id)) {
      problems.push(`${where}: unknown canonicalization algorithm "${id}"`);
    }
  }
}

// Shared definitions are the actual declaration site for schema fragments reached
// through `$ref`. Scanning only each skill's inline request fragment would make this
// registry-integrity check vacuous for every shared canonicalization declaration.
assertKnownCanonicalizationReferences(commonSchema, 'contract/schemas/common.v1.schema.json');

const matchedAdapterImplementations = new Set<string>();
for (const skill of skills) {
  const where = `skill ${skill.id}`;

  problems.push(...outputAuthoritySourceProblems(skill));

  const adapterMappingIds = new Set<string>();
  for (const [adapterIndex, adapter] of (skill.adapters ?? []).entries()) {
    const adapterWhere = `${where} adapters[${adapterIndex}]`;
    const mappingId = String(adapter.mappingId);
    if (adapterMappingIds.has(mappingId)) {
      problems.push(`${adapterWhere}: duplicate mappingId "${mappingId}"`);
    }
    adapterMappingIds.add(mappingId);
    problems.push(...adapterSourceIdentityProblems(adapter, adapterWhere));

    let primarySourceCount = 0;
    for (const source of adapter.sources ?? []) {
      if (source.role === 'primary') primarySourceCount += 1;
    }
    if (primarySourceCount !== 1) {
      problems.push(`${adapterWhere}: composite mapping requires exactly one primary source`);
    }

    if (adapter.feasibilityStatus === 'assessed_infeasible') {
      if (
        adapter.definitionStatus !== 'not_applicable' ||
        adapter.authorityRequirements !== null ||
        adapter.implementationAvailability !== 'not_applicable'
      ) {
        problems.push(
          `${adapterWhere}: assessed-infeasible mappings require not_applicable definition ` +
            'and implementation with null authority requirements',
        );
      }
    } else if (adapter.feasibilityStatus === 'not_assessed') {
      if (
        adapter.definitionStatus !== 'not_specified' ||
        adapter.authorityRequirements !== null ||
        adapter.implementationAvailability !== 'not_implemented'
      ) {
        problems.push(
          `${adapterWhere}: unassessed mappings require not_specified definition, ` +
            'not_implemented availability, and null authority requirements',
        );
      }
    } else if (adapter.feasibilityStatus === 'assessed_feasible') {
      if (
        adapter.definitionStatus !== 'not_specified' ||
        adapter.implementationAvailability === 'not_applicable'
      ) {
        problems.push(
          `${adapterWhere}: assessed-feasible mapping has incompatible definition or ` +
            'implementation state',
        );
      }
    }

    if (adapter.authorityRequirements !== null) {
      problems.push(
        `${adapterWhere}: contract source v1 reserves authorityRequirements as null ` +
          'until a closed normative mapping-definition authority exists',
      );
    }

    const implementation = adapterImplementationByKey.get(
      adapterImplementationKey(skill.id, mappingId),
    );
    const implementationPresent =
      adapter.implementationAvailability === 'packaged' ||
      adapter.implementationAvailability === 'source_only';

    if (implementationPresent) {
      if (!implementation) {
        problems.push(
          `${adapterWhere}: claims ${String(adapter.implementationAvailability)} implementation ` +
            'without an entry in ADAPTER_IMPLEMENTATIONS_V1',
        );
      } else {
        const expectedCertificationRequirement =
          adapterCertificationRequirementByKey.get(
            adapterImplementationKey(skill.id, mappingId),
          );
        matchedAdapterImplementations.add(
          adapterImplementationKey(skill.id, mappingId),
        );
        if (
          implementation.implementationAvailability !== adapter.implementationAvailability
        ) {
          problems.push(
            `${adapterWhere}: implementation availability disagrees with ` +
              'ADAPTER_IMPLEMENTATIONS_V1',
          );
        }
        if (
          expectedCertificationRequirement === undefined ||
          adapter.certificationRequirement === undefined ||
          canonicalize(adapter.certificationRequirement as never) !==
            canonicalize(expectedCertificationRequirement as never)
        ) {
          problems.push(
            `${adapterWhere}: certificationRequirement does not exactly bind immutable ` +
              `release evidence gate ${implementation.certificationRequirement.gate.id}`,
          );
        }
      }
    } else {
      if (implementation) {
        problems.push(
          `${adapterWhere}: hides implementation inventory entry as ` +
            `${String(adapter.implementationAvailability)}`,
        );
      }
      if (Object.hasOwn(adapter, 'certificationRequirement')) {
        problems.push(
          `${adapterWhere}: a mapping with no implementation cannot name a certification requirement`,
        );
      }
    }
  }

  const declaredNumericPolicies = new Set<string>();
  collectPropertyConstValues(skill.requestSchema, 'tilingPolicy', declaredNumericPolicies);
  for (const id of declaredNumericPolicies) {
    if (!numericPolicyIds.has(id)) {
      problems.push(`${where}: unknown numeric tiling policy "${id}"`);
    }
  }

  assertKnownCanonicalizationReferences(skill.requestSchema, where);

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
  } else {
    const registeredRenderer = rendererById.get(skill.renderer.id);
    if (skill.renderer?.revision !== registeredRenderer?.revision) {
      problems.push(
        `${where}: renderer revision ${String(skill.renderer?.revision)} disagrees with ` +
          `renderers.v1.json ${String(registeredRenderer?.revision)} for "${skill.renderer.id}"`,
      );
    }
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
    const renderer = rendererById.get(skill.renderer?.id);
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
  const resolveClosureRef = schemaClosureRefResolver(skill.requestSchema);
  for (const key of ['data', 'parameters'] as const) {
    const schema = skill.requestSchema?.[key];
    if (!schema) {
      problems.push(`${where}: requestSchema.${key} is missing`);
      continue;
    }
    assertClosed(schema, `${where} requestSchema.${key}`, problems, '', false, resolveClosureRef);
  }
}

for (const [key, implementation] of adapterImplementationByKey) {
  if (!matchedAdapterImplementations.has(key)) {
    problems.push(
      `adapter implementation inventory: ${implementation.skillId}/${implementation.mappingId} ` +
        'has no matching executable adapter declaration in its skill contract',
    );
  }
}

const declaredAuthorityEvaluatorIds = stableSkills
  .map((skill) => skill.outputAuthority?.evaluator?.id)
  .filter((id): id is string => typeof id === 'string')
  .sort();
for (const problem of outputAuthorityImplementationInventoryProblemsV1(
  OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1,
)) {
  problems.push(`OutputAuthority implementation inventory: ${problem}`);
}
for (const problem of outputAuthorityImplementationInventoryProblemsV1(
  declaredAuthorityEvaluatorIds,
)) {
  problems.push(`stable OutputAuthority source declarations: ${problem}`);
}
if (canonicalize(declaredAuthorityEvaluatorIds as never) !==
    canonicalize(OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1 as never)) {
  problems.push(
    'OutputAuthority evaluator registry must exactly cover every stable source declaration; ' +
    `declared=${JSON.stringify(declaredAuthorityEvaluatorIds)}, ` +
    `implemented=${JSON.stringify(OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1)}`,
  );
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
 * be closed by something — a $ref to a closed base, `unevaluatedProperties:false`,
 * or an exhaustive conditional dispatch whose every admitted leaf is closed.
 */
function resolveJsonPointer(document: unknown, fragment: string): unknown | undefined {
  let pointer: string;
  try {
    pointer = decodeURIComponent(fragment);
  } catch {
    return undefined;
  }
  if (pointer === '') return document;
  if (!pointer.startsWith('/')) return undefined;

  let current: unknown = document;
  for (const encoded of pointer.slice(1).split('/')) {
    if (/~(?:[^01]|$)/u.test(encoded)) return undefined;
    const token = encoded.replace(/~1/gu, '/').replace(/~0/gu, '~');
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(token)) return undefined;
      const index = Number(token);
      if (!Number.isSafeInteger(index) || index >= current.length) return undefined;
      current = current[index];
      continue;
    }
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, token)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

function schemaClosureRefResolver(
  requestSchema: unknown,
): (reference: string) => unknown | undefined {
  const requestDocument = { properties: requestSchema };
  const commonId = typeof commonSchema.$id === 'string' ? commonSchema.$id : undefined;
  return (reference: string): unknown | undefined => {
    const hash = reference.indexOf('#');
    const base = hash === -1 ? reference : reference.slice(0, hash);
    const fragment = hash === -1 ? '' : reference.slice(hash + 1);
    if (base === '') return resolveJsonPointer(requestDocument, fragment);
    if (commonId !== undefined && base === commonId) {
      return resolveJsonPointer(commonSchema, fragment);
    }
    return undefined;
  };
}

function assertClosed(
  node: any,
  where: string,
  out: string[],
  at = '',
  inAllOfBranch = false,
  resolveRef?: (reference: string) => unknown | undefined,
): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((child, index) =>
      assertClosed(child, where, out, `${at}/${index}`, inAllOfBranch, resolveRef),
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

  // An allOf composite must be closed by SOMETHING. The proof helper handles direct
  // closure, closed refs, and exhaustive conditional dispatch. For a dispatch, walk
  // each proved leaf as a complete declaration so its nested authored objects cannot
  // hide behind the predicate-keyword traversal exemption below.
  if (Array.isArray(node.allOf) && !closesItself) {
    const closure = proveAuthoredObjectClosure(node, at, resolveRef);
    if (!closure.closed) {
      const openAlternatives = [...new Set(closure.openPaths)]
        .map((path) => `"${path || '(root)'}"`)
        .join(', ');
      out.push(
        `${where}: the allOf at "${at || '(root)'}" is closed by nothing; ` +
          `unclosed alternatives: ${openAlternatives || 'unknown'}`,
      );
    } else {
      for (const leaf of closure.leaves) {
        if (leaf.schema === node || typeof (leaf.schema as any)?.$ref === 'string') continue;
        assertClosed(leaf.schema, where, out, leaf.path, false, resolveRef);
      }
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
        assertClosed(child, where, out, `${at}/${key}/${name}`, inAllOfBranch, resolveRef);
      }
      continue;
    }

    // Refinement branches are exempt from closing; alternative branches are not.
    assertClosed(value, where, out, `${at}/${key}`, key === 'allOf', resolveRef);
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
  if (entry.targetId && !capabilityIds.has(entry.targetId)) {
    problems.push(`legacy map: "${entry.legacyId}" targets unknown capability "${entry.targetId}"`);
  }
  if (
    (entry.outcome === 'migrate' || entry.outcome === 'migrate_conditional') &&
    typeof entry.targetId !== 'string'
  ) {
    problems.push(`legacy map: "${entry.legacyId}" outcome ${entry.outcome} requires a targetId`);
  }
  if (entry.transform === null) {
    if (entry.transformExecution !== undefined) {
      problems.push(`legacy map: "${entry.legacyId}" has transformExecution without a transform`);
    }
  } else if (typeof entry.transform === 'string') {
    if (entry.transformExecution !== 'report_only') {
      problems.push(
        `legacy map: "${entry.legacyId}" transform "${entry.transform}" is not implemented; ` +
        'transformExecution must be report_only until it exists in a closed implementation inventory',
      );
    }
  } else {
    problems.push(`legacy map: "${entry.legacyId}" transform must be a string or null`);
  }
  if (entry.requires !== undefined) {
    if (
      !Array.isArray(entry.requires) ||
      entry.requires.length === 0 ||
      entry.requires.some((fact: unknown) =>
        typeof fact !== 'string' || fact.trim().length === 0)
    ) {
      problems.push(`legacy map: "${entry.legacyId}" requires must be a non-empty string array`);
    } else if (new Set(entry.requires).size !== entry.requires.length) {
      problems.push(`legacy map: "${entry.legacyId}" requires contains duplicate facts`);
    }
  }
}

const legacyEntryById = new Map<string, any>(
  legacyMap.entries.map((entry: any) => [entry.legacyId, entry]),
);
const stableSkillById = new Map<string, any>(
  stableSkills.map((skill: any) => [skill.id, skill]),
);
for (const skill of stableSkills) {
  for (const legacyId of skill.migration.legacyIds) {
    const entry = legacyEntryById.get(legacyId);
    if (!entry) {
      problems.push(`skill "${skill.id}" migration names missing legacy-map id "${legacyId}"`);
      continue;
    }
    if (entry.targetId !== skill.id) {
      problems.push(
        `skill "${skill.id}" owns legacy id "${legacyId}", but the legacy map targets ` +
        `${JSON.stringify(entry.targetId)}`,
      );
    }
    if (entry.outcome !== 'migrate' && entry.outcome !== 'migrate_conditional') {
      problems.push(
        `skill "${skill.id}" owns legacy id "${legacyId}" with non-migratable outcome ` +
        `${JSON.stringify(entry.outcome)}`,
      );
    }
  }
}
for (const entry of legacyMap.entries) {
  if (entry.outcome !== 'migrate' && entry.outcome !== 'migrate_conditional') continue;
  const target = stableSkillById.get(entry.targetId);
  if (!target) {
    problems.push(
      `legacy map: "${entry.legacyId}" migrates to non-stable or missing skill ` +
      `${JSON.stringify(entry.targetId)}`,
    );
  } else if (!target.migration.legacyIds.includes(entry.legacyId)) {
    problems.push(
      `legacy map: "${entry.legacyId}" targets "${entry.targetId}", but that skill does not own the legacy id`,
    );
  }
}

if (problems.length > 0) {
  process.stderr.write('The contract source is not coherent:\n');
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`);
  process.exit(1);
}

const contractIdentity = resolveContractIdentitySource(identity);

// Digest only a registry that passed both the bounded executable reader and its
// closed meta-schema. Invalid oversized vectors must fail before canonicalization
// can amplify them into generated output or entry-digest work.
const canonicalizationAlgorithmsWithDigests = Object.fromEntries(
  canonicalizations.algorithms.map((algorithm: any) => [
    algorithm.id,
    { ...algorithm, entryDigest: canonicalizationEntryDigest(algorithm) },
  ]),
);

// ---------------------------------------------------------------------------
// contract/schemas/generated/registry-enums.v1.schema.json
//
// Registry-derived structural definitions that other schemas $ref. Closed ids remain
// enums here. Unit-code SHAPE also lives here, while canonical membership deliberately
// remains semantic so a registered alias can receive its specific repair diagnostic.
// ---------------------------------------------------------------------------

const enumSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://sepahead.github.io/cortexel/schemas/v1/generated/registry-enums.v1.schema.json',
  title: 'Cortexel registry schema definitions (generated)',
  description:
    'GENERATED from contract/registries/. Do not edit. Closed identifier enums and the structural unit-code shape live in exactly one place; canonical unit membership is enforced by the semantic unit validators so aliases receive an actionable repair.',
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
    disclosureRecord: {
      description: 'An exact disclosure id/severity pair from disclosures.v1.json plus its bounded library-rendered text. Template substitution depends on artifact facts and is an executable postcondition, not a JSON Schema claim.',
      oneOf: disclosures.rules.map((rule: any) => ({
        type: 'object',
        properties: {
          id: { const: rule.id },
          severity: { const: rule.severity },
          text: {
            type: 'string',
            minLength: 1,
            maxLength: MAX_DISCLOSURE_TEXT_LENGTH,
          },
        },
        required: ['id', 'severity', 'text'],
        additionalProperties: false,
      })),
    },
    semanticValidatorId: {
      type: 'string',
      description: 'A semantic-validator id from semantic-validators.v1.json.',
      enum: [...validatorIds].sort(),
    },
    rendererId: {
      type: 'string',
      description: 'A renderer id from renderers.v1.json.',
      enum: [...rendererIds].sort(),
    },
    rendererIdentity: {
      type: 'object',
      description: 'An exact renderer id/revision pair from renderers.v1.json.',
      oneOf: renderers.renderers.map((renderer: any) => ({
        type: 'object',
        properties: {
          rendererId: { const: renderer.id },
          rendererRevision: { const: renderer.revision },
        },
        required: ['rendererId', 'rendererRevision'],
      })),
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

// ---------------------------------------------------------------------------
// src/generated/*.ts
// ---------------------------------------------------------------------------

const registryTs = `${BANNER('contract/registries/')}
import { freezeGenerated } from '../core/deep-freeze.js';

export const ERROR_CODES = freezeGenerated(${JSON.stringify([...errorCodeIds].sort(), null, 2)} as const);
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_STAGES = freezeGenerated(${JSON.stringify(errorCodes.stages, null, 2)} as const);
export type ErrorStage = (typeof ERROR_STAGES)[number];

export const ERROR_CODE_META: Readonly<Record<ErrorCode, { readonly stage: ErrorStage; readonly severity: 'error' | 'warning'; readonly summary: string; readonly correctiveAction: string }>> = freezeGenerated(${JSON.stringify(
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

export const UNIT_CODES = freezeGenerated(${JSON.stringify([...unitCodes].sort(), null, 2)} as const);
export type UnitCode = (typeof UNIT_CODES)[number];

export const QUANTITY_KINDS = freezeGenerated(${JSON.stringify([...quantityKinds].sort(), null, 2)} as const);
export type QuantityKind = (typeof QUANTITY_KINDS)[number];

export const UNCERTAINTY_KINDS = freezeGenerated(${JSON.stringify([...uncertaintyKinds].sort(), null, 2)} as const);
export type UncertaintyKind = (typeof UNCERTAINTY_KINDS)[number];

export interface UnitRecord {
  readonly code: string;
  readonly dimension: string;
  readonly toCanonical: number | null;
  /** Exact decimal exponent when the registry scale is a power of ten. */
  readonly toCanonicalDecimalExponent: number | null;
  readonly label: string;
  readonly aliases: readonly string[];
}

export const UNITS: Readonly<Record<string, UnitRecord>> = freezeGenerated(${JSON.stringify(
  Object.fromEntries(
    units.units.map((u: any) => [
      u.code,
      {
        code: u.code,
        dimension: u.dimension,
        toCanonical: u.toCanonical,
        toCanonicalDecimalExponent: decimalPowerExponent(u.toCanonical),
        label: u.label,
        aliases: u.aliases ?? [],
      },
    ]),
  ),
  null,
  2,
)});

/** Alias -> canonical code. Used ONLY by adapters and explicit migration operations; normal
 *  validation rejects an alias with a repair rather than converting it silently. */
export const UNIT_ALIASES: Readonly<Record<string, string>> = freezeGenerated(${JSON.stringify(
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

export const QUANTITY_KIND_DIMENSIONS: Readonly<Record<string, readonly string[]>> = freezeGenerated(${JSON.stringify(
  Object.fromEntries(units.quantityKinds.map((q: any) => [q.kind, q.dimensions])),
  null,
  2,
)});

export const DISCLOSURE_RULES: readonly { readonly id: string; readonly severity: 'critical' | 'important' | 'informational'; readonly text: string }[] = freezeGenerated(${JSON.stringify(
  disclosures.rules.map((r: any) => ({ id: r.id, severity: r.severity, text: r.text })),
  null,
  2,
)});

export type DisclosureId = (typeof DISCLOSURE_RULES)[number]['id'];

export const SEMANTIC_VALIDATOR_IDS = freezeGenerated(${JSON.stringify([...validatorIds].sort(), null, 2)} as const);
export type SemanticValidatorId = (typeof SEMANTIC_VALIDATOR_IDS)[number];

/** Language-neutral numeric algorithms whose ids are stable request-level acceptance boundaries. */
export const NUMERIC_ALGORITHMS = freezeGenerated(${JSON.stringify(
  Object.fromEntries(numericPolicies.algorithms.map((algorithm: any) => [algorithm.id, algorithm])),
  null,
  2,
)} as const);

export const NUMERIC_POLICIES = freezeGenerated(${JSON.stringify(
  Object.fromEntries(numericPolicies.policies.map((policy: any) => [policy.id, policy])),
  null,
  2,
)} as const);
export const NUMERIC_POLICY_IDS = freezeGenerated(${JSON.stringify([...numericPolicyIds].sort(), null, 2)} as const);
export type NumericPolicyId = (typeof NUMERIC_POLICY_IDS)[number];

/** Immutable identity algorithms, each bound to the digest of its normative registry entry. */
export const CANONICALIZATION_ALGORITHMS = freezeGenerated(${JSON.stringify(
  canonicalizationAlgorithmsWithDigests,
  null,
  2,
)} as const);
export const CANONICALIZATION_IDS = freezeGenerated(${JSON.stringify([...canonicalizationIds].sort(), null, 2)} as const);
export type CanonicalizationId = (typeof CANONICALIZATION_IDS)[number];
`;

const budgetsTs = `${BANNER('contract/registries/budget-profiles.v1.json')}
import { freezeGenerated } from '../core/deep-freeze.js';

export const BUDGET_PROFILE_IDS = freezeGenerated(${JSON.stringify(budgets.profiles.map((p: any) => p.id), null, 2)} as const);
export type BudgetProfileId = (typeof BUDGET_PROFILE_IDS)[number];

export const BUDGET_PROFILES = freezeGenerated(${JSON.stringify(
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
)}) as Readonly<Record<BudgetProfileId, Readonly<Record<string, number>>>>;

export const COMPACTION_POLICIES = freezeGenerated(${JSON.stringify(
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
const catalogTs = `${BANNER('contract/skills/, contract/registries/capabilities.v1.json, and contract/registries/palettes.v1.json')}
import { freezeGenerated } from '../core/deep-freeze.js';
import type { OutputAuthorityV1 } from '../core/output-authority.js';
import type { SemanticValidatorId, DisclosureId, UncertaintyKind } from './registry.js';

export const CAPABILITY_AVAILABILITIES = freezeGenerated(${JSON.stringify(
  Object.keys(capabilities.availabilities).sort(),
  null,
  2,
)} as const);
export type CapabilityAvailability = (typeof CAPABILITY_AVAILABILITIES)[number];

export interface AdapterSourceEntry {
  /** Stable mapping role/profile identity; not a runtime instance id. */
  readonly sourceId: string;
  /** Provider/profile class; may repeat across role-distinct sourceIds. */
  readonly system: string;
  readonly role: 'primary' | 'required_companion' | 'optional_companion';
  readonly notes: string;
}

export interface AdapterCatalogEntry {
  readonly mappingId: string;
  readonly sources: readonly AdapterSourceEntry[];
  /** Bounded feasibility assessment; never an implementation or certification claim. */
  readonly feasibilityStatus: 'assessed_feasible' | 'assessed_infeasible' | 'not_assessed';
  /** V1 has no closed normative mapping-definition authority. */
  readonly definitionStatus: 'not_specified' | 'not_applicable';
  /** Reserved as null until such an authority exists. */
  readonly authorityRequirements: null;
  /** Executable availability; independent of definitionStatus. */
  readonly implementationAvailability: 'packaged' | 'source_only' | 'not_implemented' | 'not_applicable';
  /**
   * Immutable release-ledger gate definition. Mutable status, evidence, and receipts
   * remain solely in the external ledger. Absent when no implementation exists.
   */
  readonly certificationRequirement?: {
    readonly ledger: 'cortexel-release-evidence-ledger.v1';
    readonly gate: {
      readonly id: string;
      readonly section: string;
      readonly requirement: string;
      readonly releaseBlocking: true;
    };
    readonly conformanceProfile: {
      readonly registry: 'cortexel-adapter-conformance-profiles.v1';
      readonly id: string;
      readonly digestAlgorithm: 'cortexel_adapter_conformance_profile_rfc8785_sha256_v1';
      readonly digest: \`sha256:\${string}\`;
    };
  };
  readonly notes?: string;
}

export interface SkillCatalogEntry {
  readonly id: string;
  readonly revision: number;
  readonly status: 'stable' | 'experimental' | 'deprecated' | 'removed';
  readonly availability: CapabilityAvailability;
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
    readonly maxReturnedTableRows: number;
    readonly compactionPolicies: readonly string[];
    readonly tablePolicy: string;
  };
  readonly uncertaintySupport: readonly UncertaintyKind[];
  readonly accessibility: {
    readonly summaryTemplate: string;
    readonly tableColumns: readonly {
      readonly key: string;
      readonly header: string;
      readonly cellType: 'finite_number' | 'string' | 'finite_number_or_string';
      readonly nullable: boolean;
      readonly keyPart: boolean;
      readonly description?: string;
    }[];
  };
  readonly outputAuthority: OutputAuthorityV1;
  readonly evidence: { readonly handVectors: boolean; readonly externalOracle: unknown };
  readonly adapters: readonly AdapterCatalogEntry[];
  readonly legacyIds: readonly string[];
  readonly owner: string;
  readonly knownLimitations: readonly string[];
}

/** Stable skill ids in deterministic lexicographic order. */
export const STABLE_SKILL_IDS = freezeGenerated(${JSON.stringify(stableSkills.map((s) => s.id).sort(), null, 2)} as const);
export type StableSkillId = (typeof STABLE_SKILL_IDS)[number];

// The catalog is a finite total map. Raw agent/CLI strings cross the explicit
// isStableSkillId / lookupSkillCatalogEntry boundary instead of acquiring a false
// compile-time guarantee that every string is present.
export const SKILL_CATALOG: Readonly<Record<StableSkillId, SkillCatalogEntry>> = freezeGenerated(${JSON.stringify(
  Object.fromEntries(
    stableSkills.map((s) => [
      s.id,
      buildPublicSkillCatalogEntry(s, capabilityIds.get(s.id)),
    ]),
  ),
  null,
  2,
)});

export function isStableSkillId(value: string): value is StableSkillId {
  return Object.hasOwn(SKILL_CATALOG, value);
}

export function lookupSkillCatalogEntry(value: string): SkillCatalogEntry | undefined {
  return isStableSkillId(value) ? SKILL_CATALOG[value] : undefined;
}

export interface CapabilityCatalogEntry {
  readonly id: string;
  readonly kind: 'skill' | 'export' | 'data_export' | 'contract_source' | 'cli';
  readonly status: 'stable' | 'experimental' | 'deprecated' | 'removed';
  readonly availability: CapabilityAvailability;
  readonly renderer?: string;
  readonly requiredPeers?: readonly string[];
  readonly replacement?: string | null;
  readonly limitations?: readonly string[];
}

/** Contract maturity and concrete delivery are separate, mandatory axes. */
export const CAPABILITY_CATALOG: Readonly<Record<string, CapabilityCatalogEntry>> = freezeGenerated(${JSON.stringify(
  Object.fromEntries(capabilities.capabilities.map((capability: any) => [capability.id, capability])),
  null,
  2,
)});

export const EXPERIMENTAL_CAPABILITY_IDS = freezeGenerated(${JSON.stringify(
  capabilities.capabilities
    .filter((c: any) => c.status === 'experimental' && c.kind === 'skill')
    .map((c: any) => c.id)
    .sort(),
  null,
  2,
)} as const);

export const REMOVED_CAPABILITY_IDS = freezeGenerated(${JSON.stringify(
  capabilities.capabilities
    .filter((c: any) => c.status === 'removed')
    .map((c: any) => c.id)
    .sort(),
  null,
  2,
)} as const);

export interface LegacyMapEntry {
  readonly legacyId: string;
  readonly outcome: 'migrate' | 'migrate_conditional' | 'experimental' | 'removed' | 'blocked' | 'recipe';
  readonly targetId: string | null;
  readonly transform: string | null;
  readonly transformExecution?: 'report_only' | 'implemented';
  readonly errorCode?: string;
  readonly notes: string;
  readonly requires?: readonly string[];
  readonly alternatives?: readonly string[];
  readonly materializedParameters?: Readonly<Record<string, unknown>>;
}

/** Every pre-1.0 id has a deterministic outcome here. There is no fall-through. */
export const LEGACY_SKILL_MAP: Readonly<Record<string, LegacyMapEntry>> = freezeGenerated(${JSON.stringify(
  Object.fromEntries(legacyMap.entries.map((e: any) => [e.legacyId, e])),
  null,
  2,
)});

export const RENDERERS = freezeGenerated(${JSON.stringify(
  Object.fromEntries(renderers.renderers.map((r: any) => [r.id, r])),
  null,
  2,
)});

export const THEMES = freezeGenerated(${JSON.stringify(
  Object.fromEntries(palettes.themes.map((t: any) => [t.id, t])),
  null,
  2,
)});

export const CATEGORICAL_SERIES_STYLES = freezeGenerated(${JSON.stringify(
  palettes.categoricalSeries.styles,
  null,
  2,
)});

/** Normative uncertainty mark and label templates, keyed by the closed uncertainty kind. */
export interface UncertaintyStyleRecord {
  readonly kind: UncertaintyKind;
  readonly mark: 'band' | 'whisker' | 'none';
  readonly label: string;
  readonly note?: string;
}

export const UNCERTAINTY_STYLES_BY_KIND: Readonly<Record<UncertaintyKind, UncertaintyStyleRecord>> = freezeGenerated(${JSON.stringify(
  Object.fromEntries(palettes.uncertaintyStyles.map((style: any) => [style.kind, style])),
  null,
  2,
)});

export const MAX_STABLE_SERIES = ${palettes.categoricalSeries.maxStableSeries};
`;

const authoringTs = `${BANNER('contract/skills/, contract/schemas/, and contract/registries/')}
import { freezeGenerated } from '../core/deep-freeze.js';
import type { StableSkillId } from './catalog.js';

export interface SkillAuthoringEntry {
  /** Complete structural request schema. Full Cortexel validation remains authoritative. */
  readonly requestSchema: Readonly<Record<string, unknown>>;
  /** Synthetic, copyable fixture selected normatively from the living conformance set. */
  readonly authoringExample: Readonly<Record<string, unknown>>;
}

/** Versioned Ajv compile profile bound by catalogDigest. */
export const AUTHORING_SCHEMA_COMPILATION_PROFILE_V1 =
  freezeGenerated(${JSON.stringify(AUTHORING_SCHEMA_COMPILATION_PROFILE_V1, null, 2)});

/** Shared offline resources required to compile every generated per-skill schema. */
export const STABLE_CATALOG_SCHEMA_RESOURCES:
  readonly Readonly<Record<string, unknown>>[] = freezeGenerated(${JSON.stringify(
    [commonSchema, enumSchema].sort((left, right) =>
      left.$id < right.$id ? -1 : left.$id > right.$id ? 1 : 0),
    null,
    2,
  )});

export const SKILL_AUTHORING: Readonly<Record<StableSkillId, SkillAuthoringEntry>> =
  freezeGenerated(${JSON.stringify(
    Object.fromEntries(
      stableSkills.map((skill) => [
        skill.id,
        buildPublicSkillAuthoringEntry(skill, contractIdentity),
      ]),
    ),
    null,
    2,
  )});
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

  for (const file of enumerateNormativeContractFiles(CONTRACT)) {
    addFile(path.join(CONTRACT, file));
  }

  // enumerateNormativeContractFiles already returns the registry-declared UTF-8
  // path order. Do not silently re-sort it with JavaScript's UTF-16 comparator.
  return entries;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

// The generated schemas participate in the digest, so they must exist before it
// is computed. Clear first: a stale skill schema left behind by a renamed skill
// would silently join the digest and make it wrong.
removeGeneratedPath(GENERATED_SCHEMAS);
removeGeneratedPath(GENERATED_SKILL_SCHEMAS);
ensureGeneratedOutputDirectory(ROOT, GENERATED_SCHEMAS);
ensureGeneratedOutputDirectory(ROOT, GENERATED_SKILL_SCHEMAS);

writeIfChanged(
  path.join(GENERATED_SCHEMAS, 'registry-enums.v1.schema.json'),
  `${JSON.stringify(enumSchema, null, 2)}\n`,
);

for (const skill of skills) {
  writeIfChanged(
    path.join(GENERATED_SKILL_SCHEMAS, `${skill.id}.request.v1.schema.json`),
    `${JSON.stringify(composeSkillRequestSchema(skill, contractIdentity), null, 2)}\n`,
  );
}

writeIfChanged(
  path.join(CONTRACT, 'schemas', 'stable-figure-request-union.v1.schema.json'),
  `${JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://sepahead.github.io/cortexel/schemas/v1/stable-figure-request-union.v1.schema.json',
    title: 'Stable FigureRequestV1 per-skill union (generated)',
    description:
      'GENERATED from the stable skill catalog. A request matches exactly one complete closed per-skill schema; this is the structural authority embedded by FigureArtifactV1.',
    oneOf: stableSkills.map((skill) => ({
      $ref: `https://sepahead.github.io/cortexel/schemas/v1/skills/${skill.id}.request.v1.schema.json`,
    })),
  }, null, 2)}\n`,
);

const sources = collectNormativeFiles();
const manifest = buildContractManifest({
  skills,
  capabilities,
  budgets,
  errorCodes,
  semanticValidators,
  numericPolicies,
  canonicalizations,
  disclosures,
  identity,
  stableSchemaResources: [commonSchema, enumSchema],
  normativeSources: sources,
});
const { contractDigest, catalogDigest, stableSkillCount } = manifest;
if (
  typeof contractDigest !== 'string' ||
  typeof catalogDigest !== 'string' ||
  stableSkillCount !== stableSkills.length
) {
  throw new Error('contract manifest projection returned an incoherent build identity');
}

const identityTs = `${BANNER('contract/ (digest) and package.json (version)')}
export const PACKAGE_VERSION = ${JSON.stringify(packageJson.version)};
export const REQUEST_CONTRACT = ${JSON.stringify(contractIdentity.request.value)};
export const ARTIFACT_CONTRACT = ${JSON.stringify(contractIdentity.artifact.value)};
export const CONTRACT_DIGEST = ${JSON.stringify(contractDigest)};
export const CATALOG_DIGEST = ${JSON.stringify(catalogDigest)};
export const CATALOG_DIGEST_DOMAIN = ${JSON.stringify(contractIdentity.catalogDigestDomain)};
export const STABLE_SKILL_COUNT = ${stableSkillCount};

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

const pyCatalog = `${PY_BANNER('contract/, package.json, and python/pyproject.toml')}
from collections.abc import Mapping
from types import MappingProxyType
from typing import Any, Final


def _freeze(value: Any) -> Any:
    """Recursively detach and freeze generated JSON authority."""
    if isinstance(value, dict):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(_freeze(item) for item in value)
    return value

PACKAGE_VERSION: str = ${JSON.stringify(packageJson.version)}
PYTHON_DISTRIBUTION_VERSION: str = ${JSON.stringify(pythonProject.version)}
REQUEST_CONTRACT: str = ${JSON.stringify(contractIdentity.request.value)}
ARTIFACT_CONTRACT: str = ${JSON.stringify(contractIdentity.artifact.value)}
CONTRACT_DIGEST: str = ${JSON.stringify(contractDigest)}
CATALOG_DIGEST: str = ${JSON.stringify(catalogDigest)}
CATALOG_DIGEST_DOMAIN: str = ${JSON.stringify(contractIdentity.catalogDigestDomain)}
AUTHORING_SCHEMA_COMPILATION_PROFILE_V1: Final[Mapping[str, Any]] = _freeze(${pythonLiteral(
  AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
)})

STABLE_SKILL_IDS: Final[tuple[str, ...]] = _freeze(${pythonLiteral(stableSkills.map((s) => s.id).sort())})

SKILL_CATALOG: Final[Mapping[str, Mapping[str, Any]]] = _freeze(${pythonLiteral(
  Object.fromEntries(
    stableSkills.map((skill) => [
      skill.id,
      buildPublicSkillCatalogEntry(skill, capabilityIds.get(skill.id)),
    ]),
  ),
)})

SKILL_AUTHORING_EXAMPLES: Final[Mapping[str, Mapping[str, Any]]] = _freeze(${pythonLiteral(
  Object.fromEntries(
    stableSkills.map((skill) => [
      skill.id,
      buildPublicAuthoringExample(skill),
    ]),
  ),
)})

SKILL_REVISIONS: Final[Mapping[str, int]] = _freeze(${pythonLiteral(
  Object.fromEntries(stableSkills.map((skill) => [skill.id, skill.revision])),
)})

SKILL_ADAPTERS: Final[Mapping[str, tuple[Mapping[str, Any], ...]]] = _freeze(${pythonLiteral(
  Object.fromEntries(stableSkills.map((skill) => [skill.id, skill.adapters])),
)})

CAPABILITY_AVAILABILITY: Final[Mapping[str, str]] = _freeze(${pythonLiteral(
  Object.fromEntries(
    capabilities.capabilities.map((capability: any) => [capability.id, capability.availability]),
  ),
)})

CAPABILITY_AVAILABILITIES: Final[tuple[str, ...]] = _freeze(${pythonLiteral(
  Object.keys(capabilities.availabilities).sort(),
)})

ERROR_CODES: Final[tuple[str, ...]] = _freeze(${pythonLiteral([...errorCodeIds].sort())})

ERROR_STAGES: Final[tuple[str, ...]] = _freeze(${pythonLiteral(errorCodes.stages)})

UNITS: Final[Mapping[str, Mapping[str, Any]]] = _freeze(${pythonLiteral(
  Object.fromEntries(
    units.units.map((u: any) => [
      u.code,
      {
        dimension: u.dimension,
        to_canonical: u.toCanonical,
        to_canonical_decimal_exponent: decimalPowerExponent(u.toCanonical),
        label: u.label,
        aliases: u.aliases ?? [],
      },
    ]),
  ),
)})

UNIT_ALIASES: Final[Mapping[str, str]] = _freeze(${pythonLiteral(
  Object.fromEntries(
    units.units.flatMap((u: any) =>
      (u.aliases ?? [])
        .filter((alias: string) => alias.length > 0 && !unitCodes.has(alias))
        .map((alias: string) => [alias, u.code]),
    ),
  ),
)})

QUANTITY_KIND_DIMENSIONS: Final[Mapping[str, tuple[str, ...]]] = _freeze(${pythonLiteral(
  Object.fromEntries(units.quantityKinds.map((q: any) => [q.kind, q.dimensions])),
)})

NUMERIC_ALGORITHMS: Final[Mapping[str, Mapping[str, Any]]] = _freeze(${pythonLiteral(
  Object.fromEntries(numericPolicies.algorithms.map((algorithm: any) => [algorithm.id, algorithm])),
)})

NUMERIC_POLICIES: Final[Mapping[str, Mapping[str, Any]]] = _freeze(${pythonLiteral(
  Object.fromEntries(numericPolicies.policies.map((policy: any) => [policy.id, policy])),
)})

CANONICALIZATION_ALGORITHMS: Final[Mapping[str, Mapping[str, Any]]] = _freeze(${pythonLiteral(
  canonicalizationAlgorithmsWithDigests,
)})

BUDGET_PROFILES: Final[Mapping[str, Mapping[str, int]]] = _freeze(${pythonLiteral(
  Object.fromEntries(
    budgets.profiles.map((profile: any) => [
      profile.id,
      Object.fromEntries(
        Object.entries(profile.limits).map(([name, limit]: [string, any]) => [name, limit.value]),
      ),
    ]),
  ),
)})
`;

const written: string[] = [];
const record = (file: string, content: string): void => {
  if (writeIfChanged(file, content)) written.push(path.relative(ROOT, file));
};

// The wheel is a standalone reader, not a repository-relative development shim.
// Project only the schema resources it executes into the Python package, preserving
// their exact normative bytes. The entire destination is generator-owned so a renamed
// skill cannot leave a stale schema in a future wheel.
removeGeneratedPath(GENERATED_PY_CONTRACT);
const pythonSchemaResources = [
  'schemas/common.v1.schema.json',
  'schemas/generated/registry-enums.v1.schema.json',
  ...stableSkills.map((skill) => `schemas/skills/${skill.id}.request.v1.schema.json`),
] as const;
for (const relative of pythonSchemaResources) {
  record(
    path.join(GENERATED_PY_CONTRACT, relative),
    readFileSync(path.join(CONTRACT, relative), 'utf8'),
  );
}

record(path.join(GENERATED_TS, 'registry.ts'), registryTs);
record(path.join(GENERATED_TS, 'budgets.ts'), budgetsTs);
record(path.join(GENERATED_TS, 'catalog.ts'), catalogTs);
record(path.join(GENERATED_TS, 'authoring.ts'), authoringTs);
record(path.join(GENERATED_TS, 'identity.ts'), identityTs);
record(path.join(GENERATED_TS, 'index.ts'), `${BANNER('contract/')}
export * from './registry.js';
export * from './budgets.js';
export * from './catalog.js';
export * from './authoring.js';
export * from './identity.js';
`);
record(path.join(CONTRACT, 'manifest.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`);
record(path.join(GENERATED_PY, 'catalog.py'), pyCatalog);
record(path.join(GENERATED_PY, '__init__.py'), `${PY_BANNER('contract/, package.json, and python/pyproject.toml')}
from .catalog import (
    PACKAGE_VERSION,
    PYTHON_DISTRIBUTION_VERSION,
    REQUEST_CONTRACT,
    ARTIFACT_CONTRACT,
    CONTRACT_DIGEST,
    CATALOG_DIGEST,
    CATALOG_DIGEST_DOMAIN,
    AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
    STABLE_SKILL_IDS,
    SKILL_CATALOG,
    SKILL_AUTHORING_EXAMPLES,
    SKILL_REVISIONS,
    SKILL_ADAPTERS,
    CAPABILITY_AVAILABILITY,
    CAPABILITY_AVAILABILITIES,
    ERROR_CODES,
    ERROR_STAGES,
    UNITS,
    UNIT_ALIASES,
    QUANTITY_KIND_DIMENSIONS,
    NUMERIC_ALGORITHMS,
    NUMERIC_POLICIES,
    CANONICALIZATION_ALGORITHMS,
    BUDGET_PROFILES,
)

__all__ = [
    "PACKAGE_VERSION",
    "PYTHON_DISTRIBUTION_VERSION",
    "REQUEST_CONTRACT",
    "ARTIFACT_CONTRACT",
    "CONTRACT_DIGEST",
    "CATALOG_DIGEST",
    "CATALOG_DIGEST_DOMAIN",
    "AUTHORING_SCHEMA_COMPILATION_PROFILE_V1",
    "STABLE_SKILL_IDS",
    "SKILL_CATALOG",
    "SKILL_AUTHORING_EXAMPLES",
    "SKILL_REVISIONS",
    "SKILL_ADAPTERS",
    "CAPABILITY_AVAILABILITY",
    "CAPABILITY_AVAILABILITIES",
    "ERROR_CODES",
    "ERROR_STAGES",
    "UNITS",
    "UNIT_ALIASES",
    "QUANTITY_KIND_DIMENSIONS",
    "NUMERIC_ALGORITHMS",
    "NUMERIC_POLICIES",
    "CANONICALIZATION_ALGORITHMS",
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
