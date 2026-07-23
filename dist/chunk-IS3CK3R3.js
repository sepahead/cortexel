import {
  LEGACY_SKILL_MAP
} from "./chunk-6TQKFRP5.js";
import {
  snapshotValue
} from "./chunk-WOZECEVX.js";
import {
  REQUEST_CONTRACT_IDENTITY,
  getBudgetLimits,
  makeError
} from "./chunk-22OHKNZ5.js";

// src/core/migrate-v0.ts
function migrateLegacyRequest(input) {
  const snapshot = snapshotValue(input, getBudgetLimits("standard"));
  if (!snapshot.ok) {
    return {
      report: {
        legacyId: "(none)",
        outcome: "blocked",
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: snapshot.errors
      }
    };
  }
  if (typeof snapshot.value !== "object" || snapshot.value === null || Array.isArray(snapshot.value)) {
    return {
      report: {
        legacyId: "(none)",
        outcome: "blocked",
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: "MIGRATION_INFORMATION_MISSING",
            stage: "migrate",
            message: "a legacy request must be a JSON object."
          })
        ]
      }
    };
  }
  const request = snapshot.value;
  const skill = request.skill;
  const legacyId = typeof skill === "object" && skill !== null && !Array.isArray(skill) ? skill.id : request.skillId;
  if (typeof legacyId !== "string") {
    return {
      report: {
        legacyId: "(none)",
        outcome: "blocked",
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: "MIGRATION_UNKNOWN_LEGACY_ID",
            stage: "migrate",
            message: "the legacy request does not name a skill id."
          })
        ]
      }
    };
  }
  const entry = LEGACY_SKILL_MAP[legacyId];
  if (!entry) {
    return {
      report: {
        legacyId,
        outcome: "blocked",
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: "MIGRATION_UNKNOWN_LEGACY_ID",
            stage: "migrate",
            message: `"${legacyId}" is not a recognized pre-1.0 id. See MIGRATION.md for every recognized id.`
          })
        ]
      }
    };
  }
  const base = {
    legacyId,
    outcome: entry.outcome,
    targetId: entry.targetId
  };
  switch (entry.outcome) {
    case "blocked":
      return {
        report: {
          ...base,
          operations: [],
          unresolved: [],
          warnings: [],
          errors: [
            makeError({
              code: entry.errorCode ?? "MIGRATION_INFORMATION_MISSING",
              stage: "migrate",
              message: entry.notes
            })
          ]
        }
      };
    case "experimental":
      return {
        report: {
          ...base,
          operations: [],
          unresolved: [],
          warnings: [],
          errors: [
            makeError({
              code: entry.errorCode ?? "CAPABILITY_EXPERIMENTAL",
              stage: "migrate",
              message: entry.targetId === null ? `${entry.notes} No FigureRequestV1 target is emitted.` : `${entry.notes} Target: ${entry.targetId}.`
            })
          ]
        }
      };
    case "recipe":
      return {
        report: {
          ...base,
          operations: [],
          unresolved: entry.alternatives ? [...entry.alternatives] : [],
          warnings: [],
          errors: [
            makeError({
              code: entry.errorCode ?? "MIGRATION_NO_STABLE_REPLACEMENT",
              stage: "migrate",
              message: entry.notes
            })
          ]
        }
      };
    case "migrate":
    case "migrate_conditional": {
      const unresolved = entry.requires ? [...entry.requires] : [];
      const warnings = [];
      if (entry.outcome === "migrate_conditional") {
        warnings.push(
          makeError({
            code: "MIGRATION_AMBIGUOUS",
            stage: "migrate",
            severity: "warning",
            message: `${entry.notes} Migration proceeds only if every required field is present.`
          })
        );
      }
      const migrated = {
        contract: {
          name: REQUEST_CONTRACT_IDENTITY.name,
          version: REQUEST_CONTRACT_IDENTITY.version
        },
        skill: { id: entry.targetId },
        ...entry.materializedParameters ? { parameters: { ...entry.materializedParameters } } : {}
      };
      return {
        request: migrated,
        report: {
          ...base,
          operations: [
            { op: "rename-skill", detail: `${legacyId} -> ${entry.targetId}` },
            ...entry.materializedParameters ? [
              {
                op: "materialize-parameters",
                detail: JSON.stringify(entry.materializedParameters)
              }
            ] : []
          ],
          unresolved,
          warnings,
          errors: unresolved.length > 0 ? [
            makeError({
              code: "MIGRATION_INFORMATION_MISSING",
              stage: "migrate",
              severity: "warning",
              message: `the 1.0 ${entry.targetId} contract requires information the legacy payload did not carry: ${unresolved.join(", ")}. Supply it and revalidate. Migration will not guess it.`
            })
          ] : []
        }
      };
    }
    default:
      return {
        report: {
          ...base,
          operations: [],
          unresolved: [],
          warnings: [],
          errors: [
            makeError({
              code: "MIGRATION_UNKNOWN_LEGACY_ID",
              stage: "migrate",
              message: `no migration path is defined for outcome "${entry.outcome}".`
            })
          ]
        }
      };
  }
}

export {
  migrateLegacyRequest
};
//# sourceMappingURL=chunk-IS3CK3R3.js.map