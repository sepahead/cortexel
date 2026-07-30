import { S as StableSkillId } from '../catalog-BjofKpmG.cjs';
export { a as SKILL_CATALOG, b as STABLE_SKILL_IDS, c as SkillCatalogEntry, i as isStableSkillId, l as lookupSkillCatalogEntry } from '../catalog-BjofKpmG.cjs';
export { C as CATALOG_DIGEST, a as CATALOG_DIGEST_DOMAIN } from '../identity-DhDGdg4b.cjs';
import '../errors-DUbFUu6n.cjs';

/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/skills/, contract/schemas/, and contract/registries/.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

interface SkillAuthoringEntry {
    /** Complete structural request schema. Full Cortexel validation remains authoritative. */
    readonly requestSchema: Readonly<Record<string, unknown>>;
    /** Synthetic, copyable fixture selected normatively from the living conformance set. */
    readonly authoringExample: Readonly<Record<string, unknown>>;
}
/** Versioned Ajv compile profile bound by catalogDigest. */
declare const AUTHORING_SCHEMA_COMPILATION_PROFILE_V1: {
    id: string;
    dialect: string;
    engine: string;
    options: {
        strict: boolean;
        allErrors: boolean;
        coerceTypes: boolean;
        useDefaults: boolean;
        removeAdditional: boolean;
        allowUnionTypes: boolean;
        validateFormats: boolean;
        strictRequired: boolean;
        strictTypes: boolean;
    };
};
/** Shared offline resources required to compile every generated per-skill schema. */
declare const STABLE_CATALOG_SCHEMA_RESOURCES: readonly Readonly<Record<string, unknown>>[];
declare const SKILL_AUTHORING: Readonly<Record<StableSkillId, SkillAuthoringEntry>>;

export { AUTHORING_SCHEMA_COMPILATION_PROFILE_V1, SKILL_AUTHORING, STABLE_CATALOG_SCHEMA_RESOURCES, type SkillAuthoringEntry, StableSkillId };
