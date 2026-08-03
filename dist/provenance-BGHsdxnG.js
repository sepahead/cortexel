import { a as isSafeDisplayString, c as pointer, o as makeError, r as finalizeErrors } from "./errors-CxHoMFLD.js";
import { o as tryGetBudgetLimits, r as DEFAULT_PROFILE, s as trySelectTighterBudgetProfile } from "./contract-identity-B13RkjwJ.js";
import { t as parseJsonStrict } from "./parse-json-BkdHHhtc.js";
import { t as snapshotValue } from "./safe-snapshot-CTOnh-lg.js";

//#region src/core/requestBoundary.internal.ts
/**
* One owned input capture for the FigureRequest validation and repair boundaries.
*
* Materialized callers may mutate their object concurrently or expose a Proxy. We
* therefore inspect caller authority exactly once, then apply any request-selected
* tighter budget to that owned JSON snapshot rather than reading the caller again.
*/
function resolveBudgetProfile(options) {
	let requested = DEFAULT_PROFILE;
	try {
		if (options !== null && options !== void 0) {
			if (typeof options !== "object") throw new Error("invalid options");
			const descriptor = Object.getOwnPropertyDescriptor(options, "budgetProfile");
			if (descriptor !== void 0) {
				if (!Object.prototype.hasOwnProperty.call(descriptor, "value")) throw new Error("accessor-backed options");
				requested = descriptor.value ?? "standard";
			}
		}
	} catch {
		requested = null;
	}
	return {
		profile: typeof requested === "string" ? requested : "<invalid>",
		limits: tryGetBudgetLimits(requested)
	};
}
/** Read the request profile only from an already-owned plain JSON tree. */
function requestedBudgetProfile(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PROFILE;
	const presentation = value.presentation;
	if (presentation === null || typeof presentation !== "object" || Array.isArray(presentation)) return DEFAULT_PROFILE;
	return Object.prototype.hasOwnProperty.call(presentation, "budgetProfile") ? presentation.budgetProfile : DEFAULT_PROFILE;
}
function assuranceFor(boundary, profile) {
	return {
		boundary,
		duplicateKeys: boundary === "raw_json_text" ? "rejected_before_materialization" : "not_observable_after_materialization",
		parserProfile: boundary === "raw_json_text" ? "cortexel-strict-json/1.0" : "cortexel-safe-snapshot/1.0",
		budgetProfile: typeof profile === "string" ? profile : "<invalid>"
	};
}
function fail(errors, assurance) {
	return {
		ok: false,
		errors: finalizeErrors([...errors]),
		assurance
	};
}
function invalidBudgetProfile(assurance) {
	return fail([makeError({
		code: "RESOURCE_BUDGET_PROFILE_UNKNOWN",
		stage: "budget",
		message: "the selected budget profile is not in this build's closed registry. Unknown and inherited profile ids cannot disable resource limits."
	})], assurance);
}
function captureRawRequestInput(text, options = {}) {
	const host = resolveBudgetProfile(options);
	let assurance = assuranceFor("raw_json_text", host.profile);
	if (!host.limits) return invalidBudgetProfile(assurance);
	if (typeof text !== "string") return fail([makeError({
		code: "JSON_SYNTAX",
		stage: "parse",
		message: "the raw request boundary accepts a JSON text string only."
	})], assurance);
	let parsed = parseJsonStrict(text, { limits: host.limits });
	if (!parsed.ok) return fail(parsed.errors, assurance);
	const requested = requestedBudgetProfile(parsed.value);
	const effective = trySelectTighterBudgetProfile(host.profile, requested);
	assurance = assuranceFor("raw_json_text", effective?.profile ?? requested);
	if (!effective) return invalidBudgetProfile(assurance);
	if (effective.profile !== host.profile) {
		parsed = parseJsonStrict(text, { limits: effective.limits });
		if (!parsed.ok) return fail(parsed.errors, assurance);
	}
	return {
		ok: true,
		value: parsed.value,
		assurance
	};
}
function captureMaterializedRequestInput(value, options = {}) {
	const host = resolveBudgetProfile(options);
	let assurance = assuranceFor("materialized_value", host.profile);
	if (!host.limits) return invalidBudgetProfile(assurance);
	let snapshot = snapshotValue(value, host.limits);
	if (!snapshot.ok) return fail(snapshot.errors, assurance);
	const requested = requestedBudgetProfile(snapshot.value);
	const effective = trySelectTighterBudgetProfile(host.profile, requested);
	assurance = assuranceFor("materialized_value", effective?.profile ?? requested);
	if (!effective) return invalidBudgetProfile(assurance);
	if (effective.profile !== host.profile) {
		snapshot = snapshotValue(snapshot.value, effective.limits);
		if (!snapshot.ok) return fail(snapshot.errors, assurance);
	}
	return {
		ok: true,
		value: snapshot.value,
		assurance
	};
}

//#endregion
//#region src/core/semantics/provenance.ts
/**
* The authority boundary.
*
* This is the single most important rule in Cortexel, so it is enforced first,
* on the RAW request, before normalization, before defaults, before the schema —
* so a forbidden field cannot be smuggled in through a default or hidden behind a
* different failure.
*
* **A caller declares what its data IS. It never declares what Cortexel concluded
* about it.**
*
* A caller may say "this came from a NEST simulation" — that is a claim about the
* world, and the caller is the only one who knows it. A caller may NOT say "this
* was validated", "this matches the reference implementation", "this figure is
* accessible", "this network snapshot is complete", or "this posterior is
* calibrated" — those are conclusions, and a system in which the subject writes
* its own conclusions has no conclusions at all.
*
* Note that closing the schema (`additionalProperties: false`) would already
* reject these fields as unknown properties. That is not good enough. An agent
* that sets `validation: {passed: true}` and receives "unknown property" has been
* told it made a typo. It needs to be told it attempted something the contract
* does not permit anyone to do — so this check runs first and wins.
*/
/**
* Field names only Cortexel may author.
*
* Two groups. The first is the FigureArtifactV1 surface: if a caller could set
* these, an artifact would no longer be a record of what happened. The second is
* the pre-1.0 honesty vocabulary — `calibrated_posterior`, `advisory_only`,
* `is_paper_local_evidence` — which let a caller shape statements the library
* should have been the sole author of. They are named explicitly so the diagnostic
* can say why they are gone rather than merely that they are unknown.
*/
const LIBRARY_AUTHORED_FIELDS = /* @__PURE__ */ new Set([
	"artifact",
	"artifactDigest",
	"buildIdentity",
	"canonicalRequest",
	"inputAssurance",
	"validation",
	"derivation",
	"budgetDecision",
	"assurance",
	"assurances",
	"attestations",
	"disclosures",
	"render",
	"accessibility",
	"outputs",
	"catalogDigest",
	"calibrated_posterior",
	"calibratedPosterior",
	"advisory_only",
	"advisoryOnly",
	"is_paper_local_evidence",
	"isPaperLocalEvidence",
	"honesty",
	"trustedEnvelope",
	"verified",
	"certified",
	"validated",
	"reproduced",
	"conformant",
	"referenceComparison",
	"sourceContentVerified",
	"signatureVerified"
]);
/** Internal repair predicate: one authority owns both detection and removal. */
function isLibraryAuthoredField(value) {
	return LIBRARY_AUTHORED_FIELDS.has(value);
}
/** Walk the request and report every attempt to author a library conclusion. */
function findLibraryAuthoredFields(node, path, found, depth) {
	if (depth > 64 || node === null || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (let i = 0; i < node.length; i++) {
			path.push(i);
			findLibraryAuthoredFields(node[i], path, found, depth + 1);
			path.pop();
		}
		return;
	}
	for (const key of Object.keys(node)) {
		if (LIBRARY_AUTHORED_FIELDS.has(key)) {
			const at = pointer(...path, key);
			found.push(makeError({
				code: "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN",
				stage: "provenance",
				instancePath: at,
				validatorId: "provenance.no_caller_assurance",
				message: `"${key}" is a fact Cortexel generates, not one a caller may declare. A request states what the data IS; it cannot state what Cortexel concluded about it. Remove the field — the conclusion will appear in the artifact if it is earned.`,
				repair: {
					operation: "remove",
					path: at,
					reasonCode: "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN"
				}
			}));
			continue;
		}
		path.push(key);
		findLibraryAuthoredFields(node[key], path, found, depth + 1);
		path.pop();
	}
}
const provenanceNoCallerAssurance = (context) => {
	const found = [];
	findLibraryAuthoredFields(context.request, [], found, 0);
	return found;
};
const MAX_NOTE_LENGTH = 200;
/**
* Caller source notes and limitations are allowed — attributed, unverified, and unable
* to displace anything.
*
* The characters banned here are not a style preference. A bidi override inside a
* caption can make the rendered text read in a different order than the source
* says, and a zero-width joiner can hide a word entirely. Beside a MANDATORY
* disclosure, that is not a typography problem; it is a way to make the disclosure
* say something else.
*/
const provenanceNoteSafeDisplay = (context) => {
	const source = context.request.source;
	if (!source || typeof source !== "object") return [];
	const errors = [];
	const check = (value, at) => {
		if (typeof value !== "string") return;
		if (value.length > MAX_NOTE_LENGTH) errors.push(makeError({
			code: "PROVENANCE_NOTE_TOO_LONG",
			stage: "provenance",
			instancePath: at,
			validatorId: "provenance.note_safe_display",
			message: `a declared source statement may be at most ${MAX_NOTE_LENGTH} characters; this one is ${value.length}.`
		}));
		if (!isSafeDisplayString(value)) errors.push(makeError({
			code: "PROVENANCE_NOTE_UNSAFE_DISPLAY",
			stage: "provenance",
			instancePath: at,
			validatorId: "provenance.note_safe_display",
			message: "the declared source statement contains control, bidi-override, or zero-width characters. Rendered beside a mandatory disclosure, those can visually reorder or conceal it — so it is rejected rather than escaped."
		}));
	};
	check(source.declaredNote, pointer("source", "declaredNote"));
	const limitations = source.declaredLimitations;
	if (Array.isArray(limitations)) limitations.forEach((limitation, index) => {
		check(limitation, pointer("source", "declaredLimitations", index));
	});
	return errors;
};

//#endregion
export { captureRawRequestInput as a, captureMaterializedRequestInput as i, provenanceNoCallerAssurance as n, provenanceNoteSafeDisplay as r, isLibraryAuthoredField as t };
//# sourceMappingURL=provenance-BGHsdxnG.js.map