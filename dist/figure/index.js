import { a as sha256Digest, i as canonicalize, n as canonicalDigest, o as sha256Hex, r as canonicalDigestExcluding, s as utf8ByteLength, t as CanonicalizationError } from "../canonicalize-F75Ifelv.js";
import { a as PACKAGE_VERSION, c as getBuildIdentity, i as CONTRACT_DIGEST, n as CATALOG_DIGEST, o as REQUEST_CONTRACT, r as CATALOG_DIGEST_DOMAIN, s as STABLE_SKILL_COUNT, t as ARTIFACT_CONTRACT } from "../identity-Bb9ALjpv.js";
import { t as deepFreeze } from "../deep-freeze-CyWYjAwr.js";
import { a as EXPERIMENTAL_CAPABILITY_IDS, c as SKILL_CATALOG, f as isCapabilityId, h as lookupSkillCatalogEntry, l as STABLE_SKILL_IDS, m as lookupCapabilityCatalogEntry, n as CAPABILITY_CATALOG, o as LEGACY_SKILL_MAP, p as isStableSkillId, r as CAPABILITY_IDS, s as REMOVED_CAPABILITY_IDS, t as CAPABILITY_AVAILABILITIES } from "../catalog-c6PGY2YG.js";
import { a as ERROR_CODE_META, f as UNIT_CODES, i as ERROR_CODES, n as CANONICALIZATION_IDS, r as DISCLOSURE_RULES, s as QUANTITY_KINDS, t as CANONICALIZATION_ALGORITHMS, u as UNITS } from "../registry-Cmer76Bg.js";
import { a as isSafeDisplayString, c as pointer, i as finalizeErrorsWithPriority, l as safeText, o as makeError, r as finalizeErrors } from "../errors-CxHoMFLD.js";
import { a as restrictLimits, i as getBudgetLimits, n as REQUEST_CONTRACT_IDENTITY, o as tryGetBudgetLimits, r as DEFAULT_PROFILE, s as trySelectTighterBudgetProfile } from "../contract-identity-B13RkjwJ.js";
import { t as parseJsonStrict } from "../parse-json-BkdHHhtc.js";
import { t as snapshotValue } from "../safe-snapshot-CTOnh-lg.js";
import { a as captureRawRequestInput, i as captureMaterializedRequestInput, t as isLibraryAuthoredField } from "../provenance-BGHsdxnG.js";
import { A as dimensionOf, L as resolveAlias, M as isKnownUnit, R as toSeconds, f as axesAreCompatible, i as responseEventMembershipDigest, n as compareUtf16CodeUnits, r as normalizeResponseEventMemberIds, t as RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID, x as convert, z as unitLabel } from "../response-curve-basis-Cly5CkFq.js";
import { t as deriveDisclosures } from "../disclosures-CARlLREv.js";
import { t as migrateLegacyRequest } from "../migrate-v0-bUQEEeRd.js";
import { isValidatedRequest, parseAndValidateRequest, parseAndValidateRequest as parseAndValidateRequest$1, validateRequestValue, validateRequestValue as validateRequestValue$1 } from "#cortexel-request-capability";

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
			name: REQUEST_CONTRACT_IDENTITY.name,
			version: REQUEST_CONTRACT_IDENTITY.version
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
		const canonical = resolveAlias(location.value);
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
		if (location === void 0 || !isLibraryAuthoredField(location.key)) return { kind: "metadata_invalid" };
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
	return rawBoundary ? parseAndValidateRequest$1(canonicalize(candidate), { budgetProfile: profile }) : validateRequestValue$1(candidate, { budgetProfile: profile });
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
	const captured = rawBoundary ? captureRawRequestInput(input, options) : captureMaterializedRequestInput(input, options);
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
				if (canonicalize(prior.audit) !== canonicalize(plan.audit)) invalidMetadata = true;
				continue;
			}
			if (appliedKeys.has(key)) invalidMetadata = true;
			plans.set(key, plan);
		}
		if (invalidMetadata) return failure(outcome, captured.assurance, applied, [makeError({
			code: "INTERNAL_INVARIANT_VIOLATED",
			stage: "internal",
			message: "an allow-listed diagnostic did not reproduce one exact safe correction from the owned request snapshot."
		})]);
		if (plans.size === 0) return failure(outcome, captured.assurance, applied);
		const repairLimit = getBudgetLimits(captured.assurance.budgetProfile).safeRepairOperations;
		if (applied.length + plans.size > repairLimit) return failure(outcome, captured.assurance, applied, [makeError({
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
			return failure(outcome, captured.assurance, applied, [makeError({
				code: "INTERNAL_INVARIANT_VIOLATED",
				stage: "internal",
				message: "a preflighted safe repair could not be applied to Cortexel's private snapshot."
			})]);
		}
		const priorFailure = outcome;
		try {
			outcome = revalidateCandidate(candidate, rawBoundary, captured.assurance.budgetProfile);
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

//#endregion
export { ARTIFACT_CONTRACT, CANONICALIZATION_ALGORITHMS, CANONICALIZATION_IDS, CAPABILITY_AVAILABILITIES, CAPABILITY_CATALOG, CAPABILITY_IDS, CATALOG_DIGEST, CATALOG_DIGEST_DOMAIN, CONTRACT_DIGEST, CanonicalizationError, DEFAULT_PROFILE, DISCLOSURE_RULES, ERROR_CODES, ERROR_CODE_META, EXPERIMENTAL_CAPABILITY_IDS, LEGACY_SKILL_MAP, PACKAGE_VERSION, QUANTITY_KINDS, REMOVED_CAPABILITY_IDS, REQUEST_CONTRACT, RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID, SKILL_CATALOG, STABLE_SKILL_COUNT, STABLE_SKILL_IDS, UNITS, UNIT_CODES, applySafeRepairs, axesAreCompatible, canonicalDigest, canonicalDigestExcluding, canonicalize, compareUtf16CodeUnits, convert, deriveDisclosures, dimensionOf, finalizeErrors, getBudgetLimits, getBuildIdentity, isCapabilityId, isKnownUnit, isSafeDisplayString, isStableSkillId, isValidatedRequest, lookupCapabilityCatalogEntry, lookupSkillCatalogEntry, makeError, migrateLegacyRequest, normalizeResponseEventMemberIds, parseAndValidateRequest, parseJsonStrict, pointer, resolveAlias, responseEventMembershipDigest, restrictLimits, safeText, sha256Digest, sha256Hex, snapshotValue, toSeconds, tryGetBudgetLimits, trySelectTighterBudgetProfile, unitLabel, utf8ByteLength, validateRequestValue };
//# sourceMappingURL=index.js.map