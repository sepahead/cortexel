/**
 * Caller-declared source statements are presentation content, not disclosures.
 *
 * Cortexel owns the attribution and the Unicode isolation marks. The caller supplies
 * only the already-validated statement body, so it cannot move its text ahead of a
 * mandatory disclosure, remove the unverified attribution, or inject its own bidi
 * controls. The complete rendered string is carried unchanged by the SVG's
 * programmatically referenced description and returned-table metadata.
 */

export type CallerSourceStatementKind = 'declared_limitation' | 'declared_note';

export interface CallerSourceStatement {
  readonly kind: CallerSourceStatementKind;
  readonly attribution: 'declared_by_caller_not_verified';
  readonly bidiIsolation: 'unicode_fsi_pdi';
  /** Renderer-owned attribution plus the caller body enclosed by FSI/PDI. */
  readonly text: string;
}

export const FIRST_STRONG_ISOLATE = '\u2068';
export const POP_DIRECTIONAL_ISOLATE = '\u2069';

const LABELS: Readonly<Record<CallerSourceStatementKind, string>> = Object.freeze({
  declared_limitation: 'Source limitation (declared by caller; not verified)',
  declared_note: 'Source note (declared by caller; not verified)',
});

function statement(
  kind: CallerSourceStatementKind,
  declaredText: string,
): CallerSourceStatement {
  return {
    kind,
    attribution: 'declared_by_caller_not_verified',
    bidiIsolation: 'unicode_fsi_pdi',
    text: `${LABELS[kind]}: ${FIRST_STRONG_ISOLATE}${declaredText}${POP_DIRECTIONAL_ISOLATE}`,
  };
}

/**
 * Deterministic source order: declared limitations retain their authored array order,
 * then the general note follows. Materially limiting statements therefore cannot be
 * buried beneath the free-form note.
 */
export function deriveCallerSourceStatements(
  request: Readonly<Record<string, unknown>>,
): CallerSourceStatement[] {
  const sourceValue = request.source;
  if (
    sourceValue === null ||
    typeof sourceValue !== 'object' ||
    Array.isArray(sourceValue)
  ) return [];
  const source = sourceValue as Readonly<Record<string, unknown>>;
  const output: CallerSourceStatement[] = [];
  if (Array.isArray(source.declaredLimitations)) {
    for (const limitation of source.declaredLimitations) {
      if (typeof limitation === 'string') {
        output.push(statement('declared_limitation', limitation));
      }
    }
  }
  if (typeof source.declaredNote === 'string') {
    output.push(statement('declared_note', source.declaredNote));
  }
  return output;
}
