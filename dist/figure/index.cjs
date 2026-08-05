Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_canonicalize = require('../canonicalize-CM-RPRQS.cjs');
const require_identity = require('../identity-DvvM9pyL.cjs');
const require_deep_freeze = require('../deep-freeze-CX4sIEIO.cjs');
const require_catalog = require('../catalog-B4eoXq8w.cjs');
const require_registry = require('../registry-CCvLcMCj.cjs');
const require_errors = require('../errors-DaUwoa4p.cjs');
const require_contract_identity = require('../contract-identity-C8tt01Zs.cjs');
const require_parse_json = require('../parse-json-fREYzpvz.cjs');
const require_safe_snapshot = require('../safe-snapshot-Bb70fzip.cjs');
const require_provenance = require('../provenance-DIN9L67L.cjs');
const require_response_curve_basis = require('../response-curve-basis-Bzq_xSZ2.cjs');
const require_disclosures = require('../disclosures-KX6A7VTY.cjs');
const require_migrate_v0 = require('../migrate-v0-GPbesj6x.cjs');
let _cortexel_request_capability = require("#cortexel-request-capability");

//#region src/core/repairs.ts
/**
* Closed machine-applicable repairs for FigureRequestV1.
*
* This is deliberately much smaller than the diagnostic repair vocabulary. A repair
* hint may recommend a scientific or presentational choice; that does not make the
* choice safe to automate. This module admits only operations whose intended value can
* be re-derived from installed contract authority and then revalidates from stage one.
*/
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
/** Resolve an existing object member without invoking getters or prototypes. */
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
			const descriptor = Object.getOwnPropertyDescriptor(current, token);
			if (descriptor === void 0 || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return;
			current = descriptor.value;
			continue;
		}
		const descriptor = Object.getOwnPropertyDescriptor(current, token);
		if (descriptor === void 0 || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return;
		current = descriptor.value;
	}
	if (current === null || typeof current !== "object" || Array.isArray(current)) return;
	const key = tokens[tokens.length - 1];
	const descriptor = Object.getOwnPropertyDescriptor(current, key);
	if (descriptor === void 0 || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return;
	return {
		parent: current,
		key,
		value: descriptor.value
	};
}
function repairMetadataMatches(error, operation) {
	return error.repair?.operation === operation && error.repair.path === error.instancePath && error.repair.reasonCode === error.code;
}
/** Derive mutation authority from the owned value, never from diagnostic.value alone. */
function planSafeRepair(error, candidate) {
	if (error.code === "CONTRACT_MISSING") {
		if (error.instancePath !== "/contract" || !repairMetadataMatches(error, "add") || candidate === null || typeof candidate !== "object" || Array.isArray(candidate) || Object.prototype.hasOwnProperty.call(candidate, "contract")) return { kind: "metadata_invalid" };
		const expected = {
			name: require_contract_identity.REQUEST_CONTRACT_IDENTITY.name,
			version: require_contract_identity.REQUEST_CONTRACT_IDENTITY.version
		};
		const supplied = error.repair?.value;
		if (supplied === null || typeof supplied !== "object" || Array.isArray(supplied) || Object.keys(supplied).length !== 2 || supplied.name !== expected.name || supplied.version !== expected.version) return { kind: "metadata_invalid" };
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
		if (error.validatorId !== "unit.canonical_code" || !repairMetadataMatches(error, "replace")) return { kind: "metadata_invalid" };
		const location = locateRepairMember(candidate, error.instancePath);
		if (location === void 0 || typeof location.value !== "string") return { kind: "metadata_invalid" };
		const canonical = require_response_curve_basis.resolveAlias(location.value);
		if (canonical === void 0 || error.repair?.value !== canonical) return { kind: "metadata_invalid" };
		return {
			kind: "planned",
			plan: {
				audit: {
					operation: "replace",
					path: error.instancePath,
					value: canonical,
					reasonCode: "SCIENCE_UNIT_ALIAS_NOT_CANONICAL"
				},
				location: {
					...location,
					value: canonical
				}
			}
		};
	}
	if (error.code === "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN") {
		if (error.validatorId !== "provenance.no_caller_assurance" || !repairMetadataMatches(error, "remove")) return { kind: "metadata_invalid" };
		const location = locateRepairMember(candidate, error.instancePath);
		if (location === void 0 || !require_provenance.isLibraryAuthoredField(location.key)) return { kind: "metadata_invalid" };
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
		if (!delete plan.location.parent[plan.location.key]) throw new Error("safe repair could not remove an owned member");
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
	return require_deep_freeze.deepFreeze(repairs.map((repair) => ({
		...repair,
		..."value" in repair ? { value: repair.value } : {}
	})));
}
function failure(outcome, sourceInputAssurance, applied, extra = []) {
	return {
		ok: false,
		errors: extra.length === 0 ? outcome.errors : require_errors.finalizeErrorsWithPriority(outcome.errors, extra),
		inputAssurance: outcome.inputAssurance,
		sourceInputAssurance,
		appliedRepairs: immutableRepairAudit(applied)
	};
}
function revalidateCandidate(candidate, rawBoundary, budgetProfile) {
	const profile = budgetProfile;
	return rawBoundary ? (0, _cortexel_request_capability.parseAndValidateRequest)(require_canonicalize.canonicalize(candidate), { budgetProfile: profile }) : (0, _cortexel_request_capability.validateRequestValue)(candidate, { budgetProfile: profile });
}
/**
* Apply only the closed semantics-preserving subset and revalidate from stage one.
*
* Strings are raw JSON. All other inputs use the materialized-value boundary. One owned
* snapshot is acquired before diagnostics are derived, so caller mutation cannot swap a
* different tree under the repair planner. Raw candidates are canonically serialized
* and reparsed after each batch, retaining duplicate-key-aware final assurance.
*/
function applySafeRepairs(input, options = {}) {
	const rawBoundary = typeof input === "string";
	const captured = rawBoundary ? require_provenance.captureRawRequestInput(input, options) : require_provenance.captureMaterializedRequestInput(input, options);
	const applied = [];
	if (!captured.ok) return {
		ok: false,
		errors: captured.errors,
		inputAssurance: captured.assurance,
		sourceInputAssurance: captured.assurance,
		appliedRepairs: immutableRepairAudit(applied)
	};
	const candidate = captured.value;
	let outcome;
	try {
		outcome = revalidateCandidate(candidate, rawBoundary, captured.assurance.budgetProfile);
	} catch {
		return {
			ok: false,
			errors: [require_errors.makeError({
				code: "INTERNAL_INVARIANT_VIOLATED",
				stage: "internal",
				message: "the owned request snapshot could not enter the repair-validation boundary."
			})],
			inputAssurance: captured.assurance,
			sourceInputAssurance: captured.assurance,
			appliedRepairs: immutableRepairAudit(applied)
		};
	}
	if (outcome.ok) return {
		ok: true,
		request: outcome.request,
		sourceInputAssurance: captured.assurance,
		appliedRepairs: immutableRepairAudit(applied)
	};
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
			const key = `${plan.audit.operation}\u0000${plan.audit.path}\u0000${plan.audit.reasonCode}`;
			const prior = plans.get(key);
			if (prior !== void 0) {
				if (require_canonicalize.canonicalize(prior.audit) !== require_canonicalize.canonicalize(plan.audit)) invalidMetadata = true;
				continue;
			}
			if (appliedKeys.has(key)) invalidMetadata = true;
			plans.set(key, plan);
		}
		if (invalidMetadata) return failure(outcome, captured.assurance, applied, [require_errors.makeError({
			code: "INTERNAL_INVARIANT_VIOLATED",
			stage: "internal",
			message: "an allow-listed diagnostic did not reproduce one exact safe correction from the owned request snapshot."
		})]);
		if (plans.size === 0) return failure(outcome, captured.assurance, applied);
		const repairLimit = require_contract_identity.getBudgetLimits(captured.assurance.budgetProfile).safeRepairOperations;
		if (applied.length + plans.size > repairLimit) return failure(outcome, captured.assurance, applied, [require_errors.makeError({
			code: "RESOURCE_BUDGET_EXCEEDED",
			stage: "budget",
			message: "the closed safe-repair operation budget was exceeded; no validated output was returned.",
			limit: {
				name: "safeRepairOperations",
				limit: repairLimit,
				observed: applied.length + plans.size
			}
		})]);
		try {
			for (const [key, plan] of plans) {
				applyPlannedRepair(plan);
				appliedKeys.add(key);
				applied.push(plan.audit);
			}
		} catch {
			return failure(outcome, captured.assurance, applied, [require_errors.makeError({
				code: "INTERNAL_INVARIANT_VIOLATED",
				stage: "internal",
				message: "a preflighted safe repair could not be applied to Cortexel's private snapshot."
			})]);
		}
		const priorFailure = outcome;
		try {
			outcome = revalidateCandidate(candidate, rawBoundary, captured.assurance.budgetProfile);
		} catch {
			return failure(priorFailure, captured.assurance, applied, [require_errors.makeError({
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

//#endregion
exports.ARTIFACT_CONTRACT = require_identity.ARTIFACT_CONTRACT;
exports.CANONICALIZATION_ALGORITHMS = require_registry.CANONICALIZATION_ALGORITHMS;
exports.CANONICALIZATION_IDS = require_registry.CANONICALIZATION_IDS;
exports.CAPABILITY_AVAILABILITIES = require_catalog.CAPABILITY_AVAILABILITIES;
exports.CAPABILITY_CATALOG = require_catalog.CAPABILITY_CATALOG;
exports.CAPABILITY_IDS = require_catalog.CAPABILITY_IDS;
exports.CATALOG_DIGEST = require_identity.CATALOG_DIGEST;
exports.CATALOG_DIGEST_DOMAIN = require_identity.CATALOG_DIGEST_DOMAIN;
exports.CONTRACT_DIGEST = require_identity.CONTRACT_DIGEST;
exports.CanonicalizationError = require_canonicalize.CanonicalizationError;
exports.DEFAULT_PROFILE = require_contract_identity.DEFAULT_PROFILE;
exports.DISCLOSURE_RULES = require_registry.DISCLOSURE_RULES;
exports.ERROR_CODES = require_registry.ERROR_CODES;
exports.ERROR_CODE_META = require_registry.ERROR_CODE_META;
exports.EXPERIMENTAL_CAPABILITY_IDS = require_catalog.EXPERIMENTAL_CAPABILITY_IDS;
exports.LEGACY_SKILL_MAP = require_catalog.LEGACY_SKILL_MAP;
exports.PACKAGE_VERSION = require_identity.PACKAGE_VERSION;
exports.QUANTITY_KINDS = require_registry.QUANTITY_KINDS;
exports.REMOVED_CAPABILITY_IDS = require_catalog.REMOVED_CAPABILITY_IDS;
exports.REQUEST_CONTRACT = require_identity.REQUEST_CONTRACT;
exports.RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID = require_response_curve_basis.RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID;
exports.SKILL_CATALOG = require_catalog.SKILL_CATALOG;
exports.STABLE_SKILL_COUNT = require_identity.STABLE_SKILL_COUNT;
exports.STABLE_SKILL_IDS = require_catalog.STABLE_SKILL_IDS;
exports.UNITS = require_registry.UNITS;
exports.UNIT_CODES = require_registry.UNIT_CODES;
exports.applySafeRepairs = applySafeRepairs;
exports.axesAreCompatible = require_response_curve_basis.axesAreCompatible;
exports.canonicalDigest = require_canonicalize.canonicalDigest;
exports.canonicalDigestExcluding = require_canonicalize.canonicalDigestExcluding;
exports.canonicalize = require_canonicalize.canonicalize;
exports.compareUtf16CodeUnits = require_response_curve_basis.compareUtf16CodeUnits;
exports.convert = require_response_curve_basis.convert;
exports.deriveDisclosures = require_disclosures.deriveDisclosures;
exports.dimensionOf = require_response_curve_basis.dimensionOf;
exports.finalizeErrors = require_errors.finalizeErrors;
exports.getBudgetLimits = require_contract_identity.getBudgetLimits;
exports.getBuildIdentity = require_identity.getBuildIdentity;
exports.isCapabilityId = require_catalog.isCapabilityId;
exports.isKnownUnit = require_response_curve_basis.isKnownUnit;
exports.isSafeDisplayString = require_errors.isSafeDisplayString;
exports.isStableSkillId = require_catalog.isStableSkillId;
Object.defineProperty(exports, 'isValidatedRequest', {
  enumerable: true,
  get: function () {
    return _cortexel_request_capability.isValidatedRequest;
  }
});
exports.lookupCapabilityCatalogEntry = require_catalog.lookupCapabilityCatalogEntry;
exports.lookupSkillCatalogEntry = require_catalog.lookupSkillCatalogEntry;
exports.makeError = require_errors.makeError;
exports.migrateLegacyRequest = require_migrate_v0.migrateLegacyRequest;
exports.normalizeResponseEventMemberIds = require_response_curve_basis.normalizeResponseEventMemberIds;
Object.defineProperty(exports, 'parseAndValidateRequest', {
  enumerable: true,
  get: function () {
    return _cortexel_request_capability.parseAndValidateRequest;
  }
});
exports.parseJsonStrict = require_parse_json.parseJsonStrict;
exports.pointer = require_errors.pointer;
exports.resolveAlias = require_response_curve_basis.resolveAlias;
exports.responseEventMembershipDigest = require_response_curve_basis.responseEventMembershipDigest;
exports.restrictLimits = require_contract_identity.restrictLimits;
exports.safeText = require_errors.safeText;
exports.sha256Digest = require_canonicalize.sha256Digest;
exports.sha256Hex = require_canonicalize.sha256Hex;
exports.snapshotValue = require_safe_snapshot.snapshotValue;
exports.toSeconds = require_response_curve_basis.toSeconds;
exports.tryGetBudgetLimits = require_contract_identity.tryGetBudgetLimits;
exports.trySelectTighterBudgetProfile = require_contract_identity.trySelectTighterBudgetProfile;
exports.unitLabel = require_response_curve_basis.unitLabel;
exports.utf8ByteLength = require_canonicalize.utf8ByteLength;
Object.defineProperty(exports, 'validateRequestValue', {
  enumerable: true,
  get: function () {
    return _cortexel_request_capability.validateRequestValue;
  }
});
//# sourceMappingURL=index.cjs.map