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
  isCapabilityId,
  lookupCapabilityCatalogEntry,
  CAPABILITY_IDS,
  CAPABILITY_CATALOG,
  CAPABILITY_AVAILABILITIES,
  SKILL_CATALOG,
  STABLE_SKILL_IDS,
  type SkillCatalogEntry,
  type CapabilityCatalogEntry,
  type CapabilityId,
  type CapabilityAvailability,
  type StableSkillId,
} from '../generated/catalog.js';
export {
  isSourceAdapterId,
  lookupSourceAdapter,
  lookupSourceAdapterDescriptorDigest,
  SOURCE_ADAPTER_CATALOG,
  SOURCE_ADAPTER_CATALOG_DIGEST,
  SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE,
  SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
  SOURCE_ADAPTER_DESCRIPTOR_DIGESTS,
  SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
  SOURCE_ADAPTER_DISCOVERY_CATALOG,
  SOURCE_ADAPTER_IDS,
  type SourceAdapterDescriptor,
  type SourceAdapterId,
} from '../adapters/source-catalog.js';
export {
  classifySourceAdapterExampleEnvelope,
  isSourceAdapterExampleGuard,
  SOURCE_ADAPTER_EXAMPLE_ACTION,
  SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER,
  SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
  SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION,
  type SourceAdapterExampleEnvelopeV1,
  type SourceAdapterExampleGuardV1,
  type SourceAdapterInputTemplate,
} from '../adapters/source-example.js';
