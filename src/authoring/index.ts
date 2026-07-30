/**
 * `cortexel/authoring` — offline FigureRequestV1 discovery resources for agents.
 *
 * This deliberately separate subpath contains the complete structural request schemas
 * and one synthetic, full-pipeline-valid authoring fixture per stable skill. Keeping the
 * large discovery payload out of `cortexel/figure` means validators and renderers do not
 * pay its import or bundle cost. Structural schema success is never the acceptance
 * boundary; submit every authored request to `cortexel/figure` validation.
 */

export {
  AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
  SKILL_AUTHORING,
  STABLE_CATALOG_SCHEMA_RESOURCES,
  type SkillAuthoringEntry,
} from '../generated/authoring.js';
export {
  CATALOG_DIGEST,
  CATALOG_DIGEST_DOMAIN,
} from '../generated/identity.js';
export {
  isStableSkillId,
  lookupSkillCatalogEntry,
  SKILL_CATALOG,
  STABLE_SKILL_IDS,
  type SkillCatalogEntry,
  type StableSkillId,
} from '../generated/catalog.js';
