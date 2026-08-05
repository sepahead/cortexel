const require_limits = require('./limits-zgcdlCes.cjs');
const require_errors = require('./errors-DaUwoa4p.cjs');
const require_safe_snapshot = require('./safe-snapshot-Bb70fzip.cjs');
const require_catalog = require('./catalog-B4eoXq8w.cjs');
const require_contract_identity = require('./contract-identity-BMEyNZJi.cjs');

//#region src/core/migrate-v0.ts
/**
* Deterministic migration from pre-1.0.
*
* The design constraint that shapes everything here: migration produces a REQUEST
* plus a REPORT. It never produces a validation receipt, a render receipt, or an
* artifact. A target skeleton has not been validated — the consumer must complete it
* from original source data, then revalidate and re-render. The current named
* per-skill transforms are report-only target mappings, not data translators.
*
* And it never guesses. If the legacy payload lacks a population count, a trial
* count, a unit, a node universe, MPI completeness, an uncertainty method, or a
* zero-lag policy, migration returns a PARTIAL request plus a blocking error — or no
* request at all. A migration that filled in a plausible denominator would be worse
* than one that failed, because the failure is visible and the guess is not.
*
* This is also why legacy ids are never silently aliased in normal validation. A
* silent alias would let a stored artifact claim it was validated against the 1.0
* `neuro.analog_trace` contract when it was really written for `nest.voltage_trace` —
* and no one downstream could tell the difference.
*/
/**
* Migrate a legacy request.
*
* The heavy per-skill field transforms are deliberately NOT implemented as generic
* shape-guessing here. Every currently named transform is `report_only`: migration
* recognizes the legacy id and returns a precise target skeleton and REPORT of what
* the caller must supply. It copies no legacy params or data. Preservation statements
* in the registry are obligations for a future implemented transform with its own
* fixtures, not claims about this execution. A caller is told exactly where they
* stand, never handed a silently half-converted request that looks complete.
*/
function migrateLegacyRequest(input) {
	const snapshot = require_safe_snapshot.snapshotValue(input, require_limits.getBudgetLimits("standard"));
	if (!snapshot.ok) return { report: {
		legacyId: "(none)",
		outcome: "blocked",
		targetId: null,
		operations: [],
		unresolved: [],
		warnings: [],
		errors: snapshot.errors
	} };
	if (typeof snapshot.value !== "object" || snapshot.value === null || Array.isArray(snapshot.value)) return { report: {
		legacyId: "(none)",
		outcome: "blocked",
		targetId: null,
		operations: [],
		unresolved: [],
		warnings: [],
		errors: [require_errors.makeError({
			code: "MIGRATION_INFORMATION_MISSING",
			stage: "migrate",
			message: "a legacy request must be a JSON object."
		})]
	} };
	const request = snapshot.value;
	const skill = request.skill;
	const legacyId = typeof skill === "object" && skill !== null && !Array.isArray(skill) ? skill.id : request.skillId;
	if (typeof legacyId !== "string") return { report: {
		legacyId: "(none)",
		outcome: "blocked",
		targetId: null,
		operations: [],
		unresolved: [],
		warnings: [],
		errors: [require_errors.makeError({
			code: "MIGRATION_UNKNOWN_LEGACY_ID",
			stage: "migrate",
			message: "the legacy request does not name a skill id."
		})]
	} };
	const entry = require_catalog.LEGACY_SKILL_MAP[legacyId];
	if (!entry) return { report: {
		legacyId,
		outcome: "blocked",
		targetId: null,
		operations: [],
		unresolved: [],
		warnings: [],
		errors: [require_errors.makeError({
			code: "MIGRATION_UNKNOWN_LEGACY_ID",
			stage: "migrate",
			message: `"${legacyId}" is not a recognized pre-1.0 id. See MIGRATION.md for every recognized id.`
		})]
	} };
	const base = {
		legacyId,
		outcome: entry.outcome,
		targetId: entry.targetId,
		...entry.transformExecution ? { transformExecution: entry.transformExecution } : {}
	};
	switch (entry.outcome) {
		case "blocked": return { report: {
			...base,
			operations: [],
			unresolved: [],
			warnings: [],
			errors: [require_errors.makeError({
				code: entry.errorCode ?? "MIGRATION_INFORMATION_MISSING",
				stage: "migrate",
				message: entry.notes
			})]
		} };
		case "experimental": return { report: {
			...base,
			operations: [],
			unresolved: [],
			warnings: [],
			errors: [require_errors.makeError({
				code: entry.errorCode ?? "CAPABILITY_EXPERIMENTAL",
				stage: "migrate",
				message: entry.targetId === null ? `${entry.notes} No FigureRequestV1 target is emitted.` : `${entry.notes} Target: ${entry.targetId}.`
			})]
		} };
		case "recipe": return { report: {
			...base,
			operations: [],
			unresolved: entry.alternatives ? [...entry.alternatives] : [],
			warnings: [],
			errors: [require_errors.makeError({
				code: entry.errorCode ?? "MIGRATION_NO_STABLE_REPLACEMENT",
				stage: "migrate",
				message: entry.notes
			})]
		} };
		case "migrate":
		case "migrate_conditional": {
			const unresolved = entry.requires ? [...entry.requires] : [];
			const warnings = [];
			if (entry.outcome === "migrate_conditional") warnings.push(require_errors.makeError({
				code: "MIGRATION_AMBIGUOUS",
				stage: "migrate",
				severity: "warning",
				message: `${entry.notes} Migration proceeds only if every required field is present.`
			}));
			return {
				request: {
					contract: {
						name: require_contract_identity.REQUEST_CONTRACT_IDENTITY.name,
						version: require_contract_identity.REQUEST_CONTRACT_IDENTITY.version
					},
					skill: { id: entry.targetId },
					...entry.materializedParameters ? { parameters: { ...entry.materializedParameters } } : {}
				},
				report: {
					...base,
					operations: [{
						op: "rename-skill",
						detail: `${legacyId} -> ${entry.targetId}`
					}, ...entry.materializedParameters ? [{
						op: "materialize-parameters",
						detail: JSON.stringify(entry.materializedParameters)
					}] : []],
					unresolved,
					warnings,
					errors: unresolved.length > 0 ? [require_errors.makeError({
						code: "MIGRATION_INFORMATION_MISSING",
						stage: "migrate",
						message: `this migration path to ${entry.targetId} requires information the legacy payload did not carry or cannot safely establish: ${unresolved.join(", ")}. Supply it and revalidate. Migration will not guess it.`
					})] : []
				}
			};
		}
		default: return { report: {
			...base,
			operations: [],
			unresolved: [],
			warnings: [],
			errors: [require_errors.makeError({
				code: "MIGRATION_UNKNOWN_LEGACY_ID",
				stage: "migrate",
				message: `no migration path is defined for outcome "${entry.outcome}".`
			})]
		} };
	}
}

//#endregion
Object.defineProperty(exports, 'migrateLegacyRequest', {
  enumerable: true,
  get: function () {
    return migrateLegacyRequest;
  }
});
//# sourceMappingURL=migrate-v0-x3Pkdayo.cjs.map