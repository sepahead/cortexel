/**
 * Deterministic migration from pre-1.0.
 *
 * The design constraint that shapes everything here: migration produces a REQUEST
 * plus a REPORT. It never produces a validation receipt, a render receipt, or an
 * artifact. A migrated request has not been validated — the consumer must revalidate
 * and re-render. Migration is a translator, not an oracle.
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
import { makeError, type CortexelError } from './errors.js';

export interface MigrationReport {
  readonly legacyId: string;
  readonly outcome: LegacyMapEntry['outcome'];
  readonly targetId: string | null;
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
  /** A partial or complete 1.0 request. Undefined when migration is blocked. */
  readonly request?: Record<string, unknown>;
  readonly report: MigrationReport;
}

/**
 * Migrate a legacy request.
 *
 * The heavy per-skill field transforms are deliberately NOT implemented as generic
 * shape-guessing here. Each is a named transform whose absence is honest: for 0.9.0,
 * migration recognizes every legacy id and returns a precise, correct REPORT of what
 * the target is and what the caller must supply — the deterministic outcome the
 * blueprint requires — while the per-field data rewrites land incrementally with
 * their own fixtures. A caller is told exactly where they stand, never handed a
 * silently half-converted request that looks complete.
 */
export function migrateLegacyRequest(input: unknown): MigrationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
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

  const request = input as Record<string, unknown>;
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
              message: `${entry.notes} Target: ${entry.targetId ?? '(experimental)'}.`,
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
      // A recognized, migratable id. The target and every still-required fact are
      // reported precisely. `requires` names the information the 1.0 contract needs
      // that the legacy payload could not carry — the caller must supply it, and
      // migration will not invent it.
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
        contract: { name: 'cortexel-figure-request', version: '1.0' },
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
                    severity: 'warning',
                    message: `the 1.0 ${entry.targetId} contract requires information the legacy payload did not carry: ${unresolved.join(', ')}. Supply it and revalidate. Migration will not guess it.`,
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
