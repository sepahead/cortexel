import {
  captureMaterializedRequestInput,
  captureRawRequestInput,
  isLibraryAuthoredField
} from "../chunk-V65HI63Y.js";
import {
  migrateLegacyRequest
} from "../chunk-A2GUFIQI.js";
import {
  deriveDisclosures
} from "../chunk-QZWIZIZR.js";
import {
  CANONICALIZATION_ALGORITHMS,
  CANONICALIZATION_IDS,
  DISCLOSURE_RULES,
  ERROR_CODES,
  ERROR_CODE_META,
  QUANTITY_KINDS,
  RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID,
  UNITS,
  UNIT_CODES,
  axesAreCompatible,
  compareUtf16CodeUnits,
  convert,
  dimensionOf,
  isKnownUnit,
  normalizeResponseEventMemberIds,
  resolveAlias,
  responseEventMembershipDigest,
  toSeconds,
  unitLabel
} from "../chunk-3R5OZ4HO.js";
import "../chunk-XGABDL4O.js";
import {
  CAPABILITY_AVAILABILITIES,
  CAPABILITY_CATALOG,
  CAPABILITY_IDS,
  EXPERIMENTAL_CAPABILITY_IDS,
  LEGACY_SKILL_MAP,
  REMOVED_CAPABILITY_IDS,
  SKILL_CATALOG,
  STABLE_SKILL_IDS,
  isCapabilityId,
  isStableSkillId,
  lookupCapabilityCatalogEntry,
  lookupSkillCatalogEntry
} from "../chunk-3YDCB72V.js";
import {
  snapshotValue
} from "../chunk-OGJBOXWL.js";
import {
  DEFAULT_PROFILE,
  REQUEST_CONTRACT_IDENTITY,
  getBudgetLimits,
  restrictLimits,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile
} from "../chunk-AHJODCDL.js";
import {
  ARTIFACT_CONTRACT,
  CATALOG_DIGEST,
  CATALOG_DIGEST_DOMAIN,
  CONTRACT_DIGEST,
  PACKAGE_VERSION,
  REQUEST_CONTRACT,
  STABLE_SKILL_COUNT,
  getBuildIdentity
} from "../chunk-5FW7Q3ZT.js";
import {
  deepFreeze
} from "../chunk-Z2GYUK7B.js";
import {
  parseJsonStrict
} from "../chunk-EVZW37W7.js";
import {
  finalizeErrors,
  finalizeErrorsWithPriority,
  isSafeDisplayString,
  makeError,
  pointer,
  safeText
} from "../chunk-RF2EM75L.js";
import {
  CanonicalizationError,
  canonicalDigest,
  canonicalDigestExcluding,
  canonicalize,
  sha256Digest,
  sha256Hex,
  utf8ByteLength
} from "../chunk-ZYBCCIMH.js";

// src/core/index.ts
import {
  parseAndValidateRequest as parseAndValidateRequest2,
  validateRequestValue as validateRequestValue2,
  isValidatedRequest
} from "#cortexel-request-capability";

// src/core/repairs.ts
import {
  parseAndValidateRequest,
  validateRequestValue
} from "#cortexel-request-capability";
function decodePointer(path) {
  if (path === "") return [];
  if (!path.startsWith("/")) return void 0;
  const tokens = path.slice(1).split("/");
  const decoded = [];
  for (const token of tokens) {
    if (/~(?:[^01]|$)/u.test(token)) return void 0;
    decoded.push(token.replace(/~1/gu, "/").replace(/~0/gu, "~"));
  }
  return decoded;
}
function locateRepairMember(root, path) {
  const tokens = decodePointer(path);
  if (tokens === void 0 || tokens.length === 0) return void 0;
  let current = root;
  for (let index = 0; index < tokens.length - 1; index++) {
    const token = tokens[index];
    if (current === null || typeof current !== "object") return void 0;
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(token)) return void 0;
      const arrayIndex = Number(token);
      if (!Number.isSafeInteger(arrayIndex) || arrayIndex >= current.length) return void 0;
      const descriptor3 = Object.getOwnPropertyDescriptor(current, token);
      if (descriptor3 === void 0 || !Object.prototype.hasOwnProperty.call(descriptor3, "value")) {
        return void 0;
      }
      current = descriptor3.value;
      continue;
    }
    const descriptor2 = Object.getOwnPropertyDescriptor(current, token);
    if (descriptor2 === void 0 || !Object.prototype.hasOwnProperty.call(descriptor2, "value")) {
      return void 0;
    }
    current = descriptor2.value;
  }
  if (current === null || typeof current !== "object" || Array.isArray(current)) {
    return void 0;
  }
  const key = tokens[tokens.length - 1];
  const descriptor = Object.getOwnPropertyDescriptor(current, key);
  if (descriptor === void 0 || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
    return void 0;
  }
  return {
    parent: current,
    key,
    value: descriptor.value
  };
}
function repairMetadataMatches(error, operation) {
  return error.repair?.operation === operation && error.repair.path === error.instancePath && error.repair.reasonCode === error.code;
}
function planSafeRepair(error, candidate) {
  if (error.code === "CONTRACT_MISSING") {
    if (error.instancePath !== "/contract" || !repairMetadataMatches(error, "add") || candidate === null || typeof candidate !== "object" || Array.isArray(candidate) || Object.prototype.hasOwnProperty.call(candidate, "contract")) {
      return { kind: "metadata_invalid" };
    }
    const expected = {
      name: REQUEST_CONTRACT_IDENTITY.name,
      version: REQUEST_CONTRACT_IDENTITY.version
    };
    const supplied = error.repair?.value;
    if (supplied === null || typeof supplied !== "object" || Array.isArray(supplied) || Object.keys(supplied).length !== 2 || supplied.name !== expected.name || supplied.version !== expected.version) {
      return { kind: "metadata_invalid" };
    }
    return {
      kind: "planned",
      plan: {
        audit: {
          operation: "add",
          path: "/contract",
          value: expected,
          reasonCode: "CONTRACT_MISSING"
        },
        location: {
          parent: candidate,
          key: "contract",
          value: expected
        }
      }
    };
  }
  if (error.code === "SCIENCE_UNIT_ALIAS_NOT_CANONICAL") {
    if (error.validatorId !== "unit.canonical_code" || !repairMetadataMatches(error, "replace")) {
      return { kind: "metadata_invalid" };
    }
    const location = locateRepairMember(candidate, error.instancePath);
    if (location === void 0 || typeof location.value !== "string") {
      return { kind: "metadata_invalid" };
    }
    const canonical = resolveAlias(location.value);
    if (canonical === void 0 || error.repair?.value !== canonical) {
      return { kind: "metadata_invalid" };
    }
    return {
      kind: "planned",
      plan: {
        audit: {
          operation: "replace",
          path: error.instancePath,
          value: canonical,
          reasonCode: "SCIENCE_UNIT_ALIAS_NOT_CANONICAL"
        },
        location: { ...location, value: canonical }
      }
    };
  }
  if (error.code === "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN") {
    if (error.validatorId !== "provenance.no_caller_assurance" || !repairMetadataMatches(error, "remove")) {
      return { kind: "metadata_invalid" };
    }
    const location = locateRepairMember(candidate, error.instancePath);
    if (location === void 0 || !isLibraryAuthoredField(location.key)) {
      return { kind: "metadata_invalid" };
    }
    return {
      kind: "planned",
      plan: {
        audit: {
          operation: "remove",
          path: error.instancePath,
          reasonCode: "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN"
        },
        location
      }
    };
  }
  return { kind: "not_allowlisted" };
}
function applyPlannedRepair(plan) {
  if (plan.audit.operation === "remove") {
    if (!delete plan.location.parent[plan.location.key]) {
      throw new Error("safe repair could not remove an owned member");
    }
    return;
  }
  Object.defineProperty(plan.location.parent, plan.location.key, {
    value: plan.location.value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}
function immutableRepairAudit(repairs) {
  return deepFreeze(repairs.map((repair) => ({
    ...repair,
    ..."value" in repair ? { value: repair.value } : {}
  })));
}
function failure(outcome, sourceInputAssurance, applied, extra = []) {
  return {
    ok: false,
    errors: extra.length === 0 ? outcome.errors : finalizeErrorsWithPriority(outcome.errors, extra),
    inputAssurance: outcome.inputAssurance,
    sourceInputAssurance,
    appliedRepairs: immutableRepairAudit(applied)
  };
}
function revalidateCandidate(candidate, rawBoundary, budgetProfile) {
  const profile = budgetProfile;
  return rawBoundary ? parseAndValidateRequest(canonicalize(candidate), { budgetProfile: profile }) : validateRequestValue(candidate, { budgetProfile: profile });
}
function applySafeRepairs(input, options = {}) {
  const rawBoundary = typeof input === "string";
  const captured = rawBoundary ? captureRawRequestInput(input, options) : captureMaterializedRequestInput(input, options);
  const applied = [];
  if (!captured.ok) {
    return {
      ok: false,
      errors: captured.errors,
      inputAssurance: captured.assurance,
      sourceInputAssurance: captured.assurance,
      appliedRepairs: immutableRepairAudit(applied)
    };
  }
  const candidate = captured.value;
  let outcome;
  try {
    outcome = revalidateCandidate(
      candidate,
      rawBoundary,
      captured.assurance.budgetProfile
    );
  } catch {
    return {
      ok: false,
      errors: [makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the owned request snapshot could not enter the repair-validation boundary."
      })],
      inputAssurance: captured.assurance,
      sourceInputAssurance: captured.assurance,
      appliedRepairs: immutableRepairAudit(applied)
    };
  }
  if (outcome.ok) {
    return {
      ok: true,
      request: outcome.request,
      sourceInputAssurance: captured.assurance,
      appliedRepairs: immutableRepairAudit(applied)
    };
  }
  const appliedKeys = /* @__PURE__ */ new Set();
  while (!outcome.ok) {
    const plans = /* @__PURE__ */ new Map();
    let invalidMetadata = false;
    for (const error of outcome.errors) {
      const decision = planSafeRepair(error, candidate);
      if (decision.kind === "not_allowlisted") continue;
      if (decision.kind === "metadata_invalid") {
        invalidMetadata = true;
        continue;
      }
      const plan = decision.plan;
      const key = `${plan.audit.operation}\0${plan.audit.path}\0${plan.audit.reasonCode}`;
      const prior = plans.get(key);
      if (prior !== void 0) {
        if (canonicalize(prior.audit) !== canonicalize(plan.audit)) invalidMetadata = true;
        continue;
      }
      if (appliedKeys.has(key)) invalidMetadata = true;
      plans.set(key, plan);
    }
    if (invalidMetadata) {
      return failure(outcome, captured.assurance, applied, [makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "an allow-listed diagnostic did not reproduce one exact safe correction from the owned request snapshot."
      })]);
    }
    if (plans.size === 0) return failure(outcome, captured.assurance, applied);
    const repairLimit = getBudgetLimits(
      captured.assurance.budgetProfile
    ).safeRepairOperations;
    if (applied.length + plans.size > repairLimit) {
      return failure(outcome, captured.assurance, applied, [makeError({
        code: "RESOURCE_BUDGET_EXCEEDED",
        stage: "budget",
        message: "the closed safe-repair operation budget was exceeded; no validated output was returned.",
        limit: {
          name: "safeRepairOperations",
          limit: repairLimit,
          observed: applied.length + plans.size
        }
      })]);
    }
    try {
      for (const [key, plan] of plans) {
        applyPlannedRepair(plan);
        appliedKeys.add(key);
        applied.push(plan.audit);
      }
    } catch {
      return failure(outcome, captured.assurance, applied, [makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "a preflighted safe repair could not be applied to Cortexel's private snapshot."
      })]);
    }
    const priorFailure = outcome;
    try {
      outcome = revalidateCandidate(
        candidate,
        rawBoundary,
        captured.assurance.budgetProfile
      );
    } catch {
      return failure(priorFailure, captured.assurance, applied, [makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the repaired owned snapshot could not re-enter the request boundary."
      })]);
    }
  }
  return {
    ok: true,
    request: outcome.request,
    sourceInputAssurance: captured.assurance,
    appliedRepairs: immutableRepairAudit(applied)
  };
}
export {
  ARTIFACT_CONTRACT,
  CANONICALIZATION_ALGORITHMS,
  CANONICALIZATION_IDS,
  CAPABILITY_AVAILABILITIES,
  CAPABILITY_CATALOG,
  CAPABILITY_IDS,
  CATALOG_DIGEST,
  CATALOG_DIGEST_DOMAIN,
  CONTRACT_DIGEST,
  CanonicalizationError,
  DEFAULT_PROFILE,
  DISCLOSURE_RULES,
  ERROR_CODES,
  ERROR_CODE_META,
  EXPERIMENTAL_CAPABILITY_IDS,
  LEGACY_SKILL_MAP,
  PACKAGE_VERSION,
  QUANTITY_KINDS,
  REMOVED_CAPABILITY_IDS,
  REQUEST_CONTRACT,
  RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID,
  SKILL_CATALOG,
  STABLE_SKILL_COUNT,
  STABLE_SKILL_IDS,
  UNITS,
  UNIT_CODES,
  applySafeRepairs,
  axesAreCompatible,
  canonicalDigest,
  canonicalDigestExcluding,
  canonicalize,
  compareUtf16CodeUnits,
  convert,
  deriveDisclosures,
  dimensionOf,
  finalizeErrors,
  getBudgetLimits,
  getBuildIdentity,
  isCapabilityId,
  isKnownUnit,
  isSafeDisplayString,
  isStableSkillId,
  isValidatedRequest,
  lookupCapabilityCatalogEntry,
  lookupSkillCatalogEntry,
  makeError,
  migrateLegacyRequest,
  normalizeResponseEventMemberIds,
  parseAndValidateRequest2 as parseAndValidateRequest,
  parseJsonStrict,
  pointer,
  resolveAlias,
  responseEventMembershipDigest,
  restrictLimits,
  safeText,
  sha256Digest,
  sha256Hex,
  snapshotValue,
  toSeconds,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile,
  unitLabel,
  utf8ByteLength,
  validateRequestValue2 as validateRequestValue
};
//# sourceMappingURL=index.js.map