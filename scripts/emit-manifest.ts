// Emits dist/skills.manifest.json — the language-neutral artifact non-TS hosts
// (a host Python backend; future agents) consume as the single source of the
// skill→scene map + input/provenance contract. Every params schema is serialized
// as portable JSON Schema; cross-field invariants are emitted separately as
// machine-readable constraints instead of leaking Zod internals.
//
// buildManifest() is pure (no fs) so a Vitest guard can assert the committed
// dist file is byte-identical to a fresh in-memory emit. emit() writes the file.
// Run AFTER tsup (tsup's clean:true would otherwise wipe dist/).

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SCENE_NAMES } from '../core/designLaws';
import { PROVENANCE_KEYS } from '../core/skills/provenanceKeys';
import {
  NEST_SKILL_IDS,
  VALID_RENDERER_ROUTES,
  NEST_DEVICE_FAMILIES,
  VIZ_ROUTER_ID,
} from '../core/skills/skillIds';
import {
  CORTEXEL_SKILL_VERSION,
  NEST_SKILL_REGISTRY,
  PARAM_CONSTRAINT_LANGUAGE,
  STRICT_INVOCATION_POLICY,
  skillParamsJsonSchema,
  toPortableJsonSchema,
  type ParamValidationConstraint,
} from '../core/skills/registry';
import { ROUTING_DISCRIMINATORS } from '../core/skills/router';
import {
  CORTEXEL_JSON_LIMITS,
  CORTEXEL_JSON_POLICY,
  CORTEXEL_SPEC_VERSION,
  DECLARED_INPUTS_PORTABLE_SCHEMA,
  ENVELOPE_NORMALIZATION_POLICY,
  JSON_PARAMS_PORTABLE_SCHEMA,
  JSON_BUDGET_SEMANTICS,
  NUMERIC_MODEL_POLICY,
  STRING_NORMALIZATION_POLICY,
  VizSpecSchema,
} from '../core/vizSpec';
import { listPalettes, PALETTE_REGISTRY_POLICY } from '../core/colormaps';
import {
  getExamplePayload,
  getHostRendererExamplePayload,
} from '../core/skills/examples';
import {
  PROVENANCE_PARAM_CONSTRAINT_LANGUAGE,
  PROVENANCE_VALUE_CONSTRAINTS,
  STRICT_PROVENANCE_POLICY,
  type ProvenanceParamConstraint,
} from '../core/skills/provenanceKeys';
import { HostRendererInvocationSchema } from '../core/skills/hostInvocation';
import { HONESTY_POLICY } from '../core/provenance';

export interface SkillManifestEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  deviceFamily: string;
  scene: string | null;
  weak: boolean;
  /** The mandatory derived-view disclosure shown when weak (present iff weak). */
  weakDisclosure?: string;
  /** Lifecycle metadata for stored-but-superseded skills. */
  deprecation?: {
    since: string;
    replacement: string;
    message: string;
  };
  /** Whether derived routing may select the skill, plus its explicit shape key. */
  routerEligibility: {
    bareFamilyCandidate: boolean;
    dataShapeKind?: string;
  };
  /** Deterministic raw simulator-output transform advertised to non-TS agents. */
  transform?: {
    id: string;
    rawFields: string[];
    requiredOptions: string[];
    outputSkill: string;
  };
  requiredInputKeys: string[];
  requiredProvenanceKeys: string[];
  requiredProvenanceFlags: Record<string, boolean>;
  provenanceParamConstraints: ProvenanceParamConstraint[];
  /** JSON Schema (draft 2020-12) for `params`, so non-TS hosts validate/generate
   *  params structurally. Cross-field parity comes from paramConstraints. */
  paramsJsonSchema?: Record<string, unknown>;
  /** Cross-field invariants that standard JSON Schema cannot encode. */
  paramConstraints: ParamValidationConstraint[];
  rendererRoutes: string[];
  /** A validated, copyable envelope (VizSpec or scene-less host invocation). */
  examplePayload: unknown;
  examples: {
    nestExample: string;
    sourceUrl: string;
    dataShape: string;
    output: string;
    note: string;
  }[];
}

export interface PaletteManifestEntry {
  name: string;
  label: string;
  source: string;
  diverging: boolean;
}

export interface SkillsManifest {
  manifestVersion: string;
  skillAxisVersion: string;
  specVersion: string;
  vizRouterId: string;
  /** JSON-friendly family → dataShape.kind → skill routing map. */
  routingDiscriminators: Record<string, Record<string, string>>;
  sceneNames: string[];
  provenanceKeys: string[];
  deviceFamilies: string[];
  validRendererRoutes: string[];
  jsonLimits: typeof CORTEXEL_JSON_LIMITS;
  jsonExactnessPolicy: typeof CORTEXEL_JSON_POLICY;
  provenanceValueConstraints: typeof PROVENANCE_VALUE_CONSTRAINTS;
  honestyPolicy: typeof HONESTY_POLICY;
  envelopeNormalizationPolicy: typeof ENVELOPE_NORMALIZATION_POLICY;
  provenanceParamConstraintLanguage: typeof PROVENANCE_PARAM_CONSTRAINT_LANGUAGE;
  strictProvenancePolicy: typeof STRICT_PROVENANCE_POLICY;
  strictInvocationPolicy: typeof STRICT_INVOCATION_POLICY;
  stringNormalizationPolicy: typeof STRING_NORMALIZATION_POLICY;
  numericModelPolicy: typeof NUMERIC_MODEL_POLICY;
  jsonBudgetSemantics: typeof JSON_BUDGET_SEMANTICS;
  paletteRegistryPolicy: typeof PALETTE_REGISTRY_POLICY;
  paramConstraintLanguage: typeof PARAM_CONSTRAINT_LANGUAGE;
  vizSpecJsonSchema: Record<string, unknown>;
  hostRendererInvocationJsonSchema: Record<string, unknown>;
  palettes: PaletteManifestEntry[];
  skills: SkillManifestEntry[];
}

function markTrimmedProperty(
  schema: Record<string, unknown>,
  propertyPath: readonly string[],
): void {
  let cursor: unknown = schema;
  for (const property of propertyPath) {
    const properties =
      cursor && typeof cursor === 'object'
        ? (cursor as { properties?: Record<string, unknown> }).properties
        : undefined;
    cursor = properties?.[property];
  }
  if (cursor && typeof cursor === 'object') {
    (cursor as Record<string, unknown>)['x-cortexel-normalize'] = 'trim';
  }
}

function setPropertySchemaField(
  schema: Record<string, unknown>,
  propertyPath: readonly string[],
  field: string,
  value: unknown,
): void {
  let cursor: unknown = schema;
  for (const property of propertyPath) {
    const properties =
      cursor && typeof cursor === 'object'
        ? (cursor as { properties?: Record<string, unknown> }).properties
        : undefined;
    cursor = properties?.[property];
  }
  if (cursor && typeof cursor === 'object') {
    (cursor as Record<string, unknown>)[field] = value;
  }
}

function replacePropertySchema(
  schema: Record<string, unknown>,
  propertyPath: readonly string[],
  replacement: Record<string, unknown>,
): void {
  let cursor: Record<string, unknown> | undefined = schema;
  for (let index = 0; index < propertyPath.length - 1; index++) {
    const properties = cursor.properties as Record<string, unknown> | undefined;
    const next = properties?.[propertyPath[index]];
    cursor = next && typeof next === 'object'
      ? next as Record<string, unknown>
      : undefined;
    if (!cursor) return;
  }
  const properties = cursor.properties as Record<string, unknown> | undefined;
  if (properties) properties[propertyPath[propertyPath.length - 1]] = replacement;
}

function portableClone(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function buildManifest(): SkillsManifest {
  const skills: SkillManifestEntry[] = NEST_SKILL_IDS.map((id) => {
    const c = NEST_SKILL_REGISTRY[id];
    const paramsJsonSchema = skillParamsJsonSchema(c);
    const examplePayload =
      getExamplePayload(id) ?? getHostRendererExamplePayload(id);
    if (!examplePayload) {
      throw new Error(`skill '${id}' has no worked invocation payload`);
    }
    return {
      id: c.id,
      version: c.version,
      title: c.title,
      description: c.description,
      deviceFamily: c.deviceFamily,
      scene: c.scene,
      weak: c.weak ?? false,
      ...(c.weakDisclosure ? { weakDisclosure: c.weakDisclosure } : {}),
      ...(c.deprecation ? { deprecation: { ...c.deprecation } } : {}),
      routerEligibility: {
        bareFamilyCandidate: c.routerEligibility?.bareFamilyCandidate ?? true,
        ...(c.routerEligibility?.dataShapeKind
          ? { dataShapeKind: c.routerEligibility.dataShapeKind }
          : {}),
      },
      ...(c.transform
        ? {
            transform: {
              id: c.transform.id,
              rawFields: [...c.transform.rawFields],
              requiredOptions: [...c.transform.requiredOptions],
              outputSkill: c.transform.outputSkill,
            },
          }
        : {}),
      requiredInputKeys: [...c.requiredInputKeys],
      requiredProvenanceKeys: [...c.requiredProvenanceKeys],
      requiredProvenanceFlags: { ...(c.requiredProvenanceFlags ?? {}) },
      provenanceParamConstraints: (c.provenanceParamConstraints ?? []).map(
        (constraint) => ({ ...constraint }),
      ),
      ...(paramsJsonSchema ? { paramsJsonSchema } : {}),
      paramConstraints: (c.paramConstraints ?? []).map((constraint) => ({
        ...constraint,
        paths: [...constraint.paths],
        ...(constraint.symmetricKinds
          ? { symmetricKinds: [...constraint.symmetricKinds] }
          : {}),
        ...(constraint.allowedEndpointKinds
          ? {
              allowedEndpointKinds: Object.fromEntries(
                Object.entries(constraint.allowedEndpointKinds).map(([kind, pair]) => [
                  kind,
                  [...pair],
                ]),
              ) as Record<string, [string, string]>,
            }
          : {}),
        ...(constraint.allowedScoreKinds
          ? {
              allowedScoreKinds: Object.fromEntries(
                Object.entries(constraint.allowedScoreKinds).map(([kind, scoreKinds]) => [
                  kind,
                  [...scoreKinds],
                ]),
              ),
          }
          : {}),
        ...(constraint.allowedFieldValues
          ? { allowedFieldValues: [...constraint.allowedFieldValues] }
          : {}),
        ...(constraint.allowedValues
          ? { allowedValues: { ...constraint.allowedValues } }
          : {}),
        ...(constraint.numericDomains
          ? {
              numericDomains: Object.fromEntries(
                Object.entries(constraint.numericDomains).map(([key, domain]) => [
                  key,
                  { ...domain },
                ]),
              ),
            }
          : {}),
        ...(constraint.normalizationRules
          ? {
              normalizationRules: Object.fromEntries(
                Object.entries(constraint.normalizationRules).map(([mode, rule]) => [
                  mode,
                  { ...rule },
                ]),
              ),
            }
          : {}),
      })),
      rendererRoutes: [...c.rendererRoutes],
      examplePayload,
      examples: c.examples.map((e) => ({ ...e })),
    };
  });
  const vizSpecJsonSchema = toPortableJsonSchema(VizSpecSchema);
  const hostRendererInvocationJsonSchema = toPortableJsonSchema(
    HostRendererInvocationSchema,
  );
  replacePropertySchema(vizSpecJsonSchema, ['params'], {
    ...portableClone(JSON_PARAMS_PORTABLE_SCHEMA),
    default: {},
  });
  replacePropertySchema(
    hostRendererInvocationJsonSchema,
    ['params'],
    portableClone(JSON_PARAMS_PORTABLE_SCHEMA),
  );
  replacePropertySchema(
    vizSpecJsonSchema,
    ['provenance', 'declared_inputs'],
    portableClone(DECLARED_INPUTS_PORTABLE_SCHEMA),
  );
  replacePropertySchema(
    hostRendererInvocationJsonSchema,
    ['provenance', 'declared_inputs'],
    portableClone(DECLARED_INPUTS_PORTABLE_SCHEMA),
  );
  markTrimmedProperty(vizSpecJsonSchema, ['provenance', 'caption']);
  markTrimmedProperty(hostRendererInvocationJsonSchema, ['provenance', 'caption']);
  setPropertySchemaField(
    vizSpecJsonSchema,
    ['provenance', 'declared_inputs'],
    'maxProperties',
    64,
  );
  setPropertySchemaField(
    hostRendererInvocationJsonSchema,
    ['provenance', 'declared_inputs'],
    'maxProperties',
    64,
  );
  return {
    // v8: agent-discoverable topology transforms, deprecation/routing metadata,
    // MPI-scoped snapshots, and portable matrix/degree/delay/spatial constraints.
    manifestVersion: '8',
    skillAxisVersion: CORTEXEL_SKILL_VERSION,
    specVersion: CORTEXEL_SPEC_VERSION,
    vizRouterId: VIZ_ROUTER_ID,
    routingDiscriminators: Object.fromEntries(
      Object.entries(ROUTING_DISCRIMINATORS).map(([family, map]) => [
        family,
        { ...map },
      ]),
    ),
    sceneNames: [...SCENE_NAMES],
    provenanceKeys: [...PROVENANCE_KEYS],
    deviceFamilies: [...NEST_DEVICE_FAMILIES],
    validRendererRoutes: [...VALID_RENDERER_ROUTES],
    jsonLimits: CORTEXEL_JSON_LIMITS,
    jsonExactnessPolicy: CORTEXEL_JSON_POLICY,
    provenanceValueConstraints: PROVENANCE_VALUE_CONSTRAINTS,
    honestyPolicy: HONESTY_POLICY,
    envelopeNormalizationPolicy: ENVELOPE_NORMALIZATION_POLICY,
    provenanceParamConstraintLanguage: PROVENANCE_PARAM_CONSTRAINT_LANGUAGE,
    strictProvenancePolicy: STRICT_PROVENANCE_POLICY,
    strictInvocationPolicy: STRICT_INVOCATION_POLICY,
    stringNormalizationPolicy: STRING_NORMALIZATION_POLICY,
    numericModelPolicy: NUMERIC_MODEL_POLICY,
    jsonBudgetSemantics: JSON_BUDGET_SEMANTICS,
    paletteRegistryPolicy: PALETTE_REGISTRY_POLICY,
    paramConstraintLanguage: PARAM_CONSTRAINT_LANGUAGE,
    vizSpecJsonSchema,
    hostRendererInvocationJsonSchema,
    palettes: listPalettes().map((p) => ({
      name: p.name,
      label: p.metadata.label,
      source: p.metadata.source,
      diverging: p.metadata.diverging,
    })),
    skills,
  };
}

/** Deterministic, stable serialization (2-space indent + trailing newline). */
export function serializeManifest(m: SkillsManifest = buildManifest()): string {
  return JSON.stringify(m, null, 2) + '\n';
}

async function emit(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, '..', 'dist', 'skills.manifest.json');
  await writeFile(out, serializeManifest(), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[cortexel] wrote ${out}`);
}

// Run when invoked directly (tsx scripts/emit-manifest.ts), not when imported.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  emit().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
