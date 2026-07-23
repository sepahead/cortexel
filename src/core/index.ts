/**
 * Internal implementation of the pure FigureRequestV1 contract.
 *
 * The public capability-named entry is `cortexel/figure`. The package root and
 * `cortexel/core` deliberately remain the legacy VizSpec surfaces during the additive
 * migration. This kernel loads no React, Three, R3F, D3, browser, or network module.
 */

// Identity
export {
  PACKAGE_VERSION,
  REQUEST_CONTRACT,
  ARTIFACT_CONTRACT,
  CONTRACT_DIGEST,
  CATALOG_DIGEST,
  STABLE_SKILL_COUNT,
  getBuildIdentity,
  type BuildIdentity,
} from '../generated/identity.js';

// The catalog
export {
  SKILL_CATALOG,
  STABLE_SKILL_IDS,
  EXPERIMENTAL_CAPABILITY_IDS,
  REMOVED_CAPABILITY_IDS,
  LEGACY_SKILL_MAP,
  type SkillCatalogEntry,
  type StableSkillId,
  type LegacyMapEntry,
} from '../generated/catalog.js';

// Registries
export {
  ERROR_CODES,
  ERROR_CODE_META,
  UNIT_CODES,
  QUANTITY_KINDS,
  UNITS,
  DISCLOSURE_RULES,
  CANONICALIZATION_ALGORITHMS,
  CANONICALIZATION_IDS,
  type ErrorCode,
  type ErrorStage,
  type UnitCode,
  type QuantityKind,
  type DisclosureId,
  type CanonicalizationId,
} from '../generated/registry.js';

// Validation
export {
  parseAndValidateRequest,
  validateRequestValue,
  isValidatedRequest,
  type ValidatedRequest,
  type ValidationOutcome,
  type ValidateOptions,
  type InputAssurance,
} from './request.js';

// Diagnostics
export {
  makeError,
  finalizeErrors,
  pointer,
  safeText,
  isSafeDisplayString,
  type CortexelError,
  type Severity,
  type RepairOperation,
  type Result,
} from './errors.js';

// Identity primitives
export { sha256Digest, sha256Hex, utf8ByteLength } from './sha256.js';
export { canonicalize, canonicalDigest, canonicalDigestExcluding, CanonicalizationError } from './canonicalize.js';
export {
  RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID,
  compareUtf16CodeUnits,
  normalizeResponseEventMemberIds,
  responseEventMembershipDigest,
} from './response-curve-basis.js';

// Boundaries
export { parseJsonStrict, type JsonValue } from './parse-json.js';
export { snapshotValue } from './safe-snapshot.js';

// Budgets
export {
  getBudgetLimits,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile,
  restrictLimits,
  DEFAULT_PROFILE,
  type BudgetLimits,
  type BudgetProfileId,
  type ResolvedBudgetProfile,
} from './limits.js';

// Units
export {
  isKnownUnit,
  dimensionOf,
  resolveAlias,
  convert,
  toSeconds,
  axesAreCompatible,
  unitLabel,
  type Quantity,
  type QuantitySeries,
} from './units.js';

// Disclosures
export { deriveDisclosures, type Disclosure, type DisclosureFacts } from './disclosures.js';

// Migration
export {
  migrateLegacyRequest,
  type MigrationResult,
  type MigrationReport,
} from './migrate-v0.js';
