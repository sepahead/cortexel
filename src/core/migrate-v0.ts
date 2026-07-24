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

import { LEGACY_SKILL_MAP, type LegacyMapEntry } from '../generated/catalog.js';
import { REQUEST_CONTRACT_IDENTITY } from './contract-identity.js';
import { makeError, type CortexelError } from './errors.js';
import { getBudgetLimits } from './limits.js';
import { snapshotValue } from './safe-snapshot.js';

export interface MigrationReport {
  readonly legacyId: string;
  readonly outcome: LegacyMapEntry['outcome'];
  readonly targetId: string | null;
  /** Execution status of the named transform. Present for mapped target
   * skeletons so callers cannot mistake an outcome label for a data rewrite. */
  readonly transformExecution?: LegacyMapEntry['transformExecution'];
  /** Fields that were renamed or moved, oldPath -> newPath. */
  readonly operations: readonly { readonly op: string; readonly detail: string }[];
  /** Information the caller must still supply. Non-empty means the request is partial. */
  readonly unresolved: readonly string[];
  /** Warnings — e.g. an ambiguous value that mapped to a weaker accurate target. */
  readonly warnings: readonly CortexelError[];
  /** Blocking reasons. Non-empty means no usable request was produced. */
  readonly errors: readonly CortexelError[];
}

export interface MigrationResult {
  /** A report-only target skeleton in the current implementation. Undefined
   * when no current-contract target exists. */
  readonly request?: Record<string, unknown>;
  readonly report: MigrationReport;
}

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
export function migrateLegacyRequest(input: unknown): MigrationResult {
  // This is a public materialized-value boundary just like validateRequestValue.
  // Snapshot before even Array.isArray/property access: a revoked Proxy can throw from
  // reflection, and a getter-backed legacy id is caller code rather than migration data.
  // The current translator reads only a small projection, but silently ignoring hostile
  // or non-JSON state would still let the report describe a different request from the
  // one the caller supplied.
  const snapshot = snapshotValue(input, getBudgetLimits('standard'));
  if (!snapshot.ok) {
    return {
      report: {
        legacyId: '(none)',
        outcome: 'blocked',
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: snapshot.errors,
      },
    };
  }

  if (
    typeof snapshot.value !== 'object' ||
    snapshot.value === null ||
    Array.isArray(snapshot.value)
  ) {
    return {
      report: {
        legacyId: '(none)',
        outcome: 'blocked',
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: 'MIGRATION_INFORMATION_MISSING',
            stage: 'migrate',
            message: 'a legacy request must be a JSON object.',
          }),
        ],
      },
    };
  }

  const request = snapshot.value as Record<string, unknown>;
  const skill = request.skill;
  const legacyId =
    typeof skill === 'object' && skill !== null && !Array.isArray(skill)
      ? (skill as Record<string, unknown>).id
      : request.skillId;

  if (typeof legacyId !== 'string') {
    return {
      report: {
        legacyId: '(none)',
        outcome: 'blocked',
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: 'MIGRATION_UNKNOWN_LEGACY_ID',
            stage: 'migrate',
            message: 'the legacy request does not name a skill id.',
          }),
        ],
      },
    };
  }

  const entry = LEGACY_SKILL_MAP[legacyId];

  if (!entry) {
    return {
      report: {
        legacyId,
        outcome: 'blocked',
        targetId: null,
        operations: [],
        unresolved: [],
        warnings: [],
        errors: [
          makeError({
            code: 'MIGRATION_UNKNOWN_LEGACY_ID',
            stage: 'migrate',
            message: `"${legacyId}" is not a recognized pre-1.0 id. See MIGRATION.md for every recognized id.`,
          }),
        ],
      },
    };
  }

  const base: Omit<MigrationReport, 'operations' | 'unresolved' | 'warnings' | 'errors'> = {
    legacyId,
    outcome: entry.outcome,
    targetId: entry.targetId,
    ...(entry.transformExecution
      ? { transformExecution: entry.transformExecution }
      : {}),
  };

  switch (entry.outcome) {
    case 'blocked':
      return {
        report: {
          ...base,
          operations: [],
          unresolved: [],
          warnings: [],
          errors: [
            makeError({
              code: (entry.errorCode as CortexelError['code']) ?? 'MIGRATION_INFORMATION_MISSING',
              stage: 'migrate',
              message: entry.notes,
            }),
          ],
        },
      };

    case 'experimental':
      return {
        report: {
          ...base,
          operations: [],
          unresolved: [],
          warnings: [],
          errors: [
            makeError({
              code: (entry.errorCode as CortexelError['code']) ?? 'CAPABILITY_EXPERIMENTAL',
              stage: 'migrate',
              message: entry.targetId === null
                ? `${entry.notes} No FigureRequestV1 target is emitted.`
                : `${entry.notes} Target: ${entry.targetId}.`,
            }),
          ],
        },
      };

    case 'recipe':
      return {
        report: {
          ...base,
          operations: [],
          unresolved: entry.alternatives ? [...entry.alternatives] : [],
          warnings: [],
          errors: [
            makeError({
              code: (entry.errorCode as CortexelError['code']) ?? 'MIGRATION_NO_STABLE_REPLACEMENT',
              stage: 'migrate',
              message: entry.notes,
            }),
          ],
        },
      };

    case 'migrate':
    case 'migrate_conditional': {
      // A recognized report-only target mapping. The skeleton and every required
      // fact are reported precisely, but no legacy params or data are copied.
      // `requires` names information the current contract needs and this mapper
      // cannot safely establish; the caller must return to original source evidence.
      const unresolved = entry.requires ? [...entry.requires] : [];
      const warnings: CortexelError[] = [];

      if (entry.outcome === 'migrate_conditional') {
        warnings.push(
          makeError({
            code: 'MIGRATION_AMBIGUOUS',
            stage: 'migrate',
            severity: 'warning',
            message: `${entry.notes} Migration proceeds only if every required field is present.`,
          }),
        );
      }

      const migrated: Record<string, unknown> = {
        contract: {
          name: REQUEST_CONTRACT_IDENTITY.name,
          version: REQUEST_CONTRACT_IDENTITY.version,
        },
        skill: { id: entry.targetId },
        ...(entry.materializedParameters
          ? { parameters: { ...entry.materializedParameters } }
          : {}),
      };

      return {
        request: migrated,
        report: {
          ...base,
          operations: [
            { op: 'rename-skill', detail: `${legacyId} -> ${entry.targetId}` },
            ...(entry.materializedParameters
              ? [
                  {
                    op: 'materialize-parameters',
                    detail: JSON.stringify(entry.materializedParameters),
                  },
                ]
              : []),
          ],
          unresolved,
          warnings,
          errors:
            unresolved.length > 0
              ? [
                  makeError({
                    code: 'MIGRATION_INFORMATION_MISSING',
                    stage: 'migrate',
                    message: `this migration path to ${entry.targetId} requires information the legacy payload did not carry or cannot safely establish: ${unresolved.join(', ')}. Supply it and revalidate. Migration will not guess it.`,
                  }),
                ]
              : [],
        },
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
              code: 'MIGRATION_UNKNOWN_LEGACY_ID',
              stage: 'migrate',
              message: `no migration path is defined for outcome "${entry.outcome}".`,
            }),
          ],
        },
      };
  }
}
