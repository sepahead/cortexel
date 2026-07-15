/**
 * `cortexel/core` — the pure contract.
 *
 * This entry loads no React, no Three, no D3, no filesystem, and no network module.
 * A server can import it and get validation, canonicalization, identity, provenance,
 * and migration without pulling a rendering stack behind it. (Structural validation
 * reads the shipped schema files, which is a read of packaged data, not of the host
 * filesystem — the CONTRACT travels with the package.)
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
  type ErrorCode,
  type ErrorStage,
  type UnitCode,
  type QuantityKind,
  type DisclosureId,
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

// Boundaries
export { parseJsonStrict, type JsonValue } from './parse-json.js';
export { snapshotValue } from './safe-snapshot.js';

// Budgets
export {
  getBudgetLimits,
  restrictLimits,
  DEFAULT_PROFILE,
  type BudgetLimits,
  type BudgetProfileId,
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
