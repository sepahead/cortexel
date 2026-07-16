/**
 * Unit and dimension rules.
 *
 * Walks every quantity in the request and checks two things: that its unit code is
 * canonical, and that the unit's dimension matches what the quantity claims to be.
 *
 * The second check is what stops a whole class of plausible-looking nonsense. A
 * calcium concentration and a membrane potential are both "an array of numbers over
 * time". Nothing structural distinguishes them. Overlaying them on one axis produces
 * a figure that looks exactly like a comparison and is not one — and no reviewer
 * looking at the picture can tell.
 */

import { checkQuantityUnit, isKnownUnit, isQuantityKind, resolveAlias } from '../units.js';
import { makeError, type CortexelError } from '../errors.js';
import { asRecord, asString, type SemanticContext, type SemanticValidator } from './types.js';

/**
 * Find every object that looks like a quantity — has both a `kind` and a `unit` —
 * anywhere in the request, and report its path.
 *
 * Structural rather than a fixed list of pointers, so a new field in a skill
 * contract is covered the moment it exists rather than the moment someone
 * remembers to add it here.
 */
function collectQuantities(
  node: unknown,
  path: (string | number)[],
  out: { kind: string; unit: string; path: (string | number)[] }[],
): void {
  if (node === null || typeof node !== 'object') return;

  const pending: { node: object; path: (string | number)[] }[] = [{ node, path }];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (Array.isArray(current.node)) {
      for (let i = current.node.length - 1; i >= 0; i--) {
        const child = current.node[i];
        if (child !== null && typeof child === 'object') {
          pending.push({ node: child, path: [...current.path, i] });
        }
      }
      continue;
    }

    const record = current.node as Record<string, unknown>;
    const kind = asString(record.kind);
    const unit = asString(record.unit);
    if (kind !== undefined && unit !== undefined && isQuantityKind(kind)) {
      out.push({ kind, unit, path: current.path });
    }

    const keys = Object.keys(record);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      const child = record[key];
      if (child !== null && typeof child === 'object') {
        pending.push({ node: child, path: [...current.path, key] });
      }
    }
  }
}

/** Bare unit fields that carry no `kind` — a window, a bin spec, an uncertainty. */
function collectBareUnits(
  node: unknown,
  path: (string | number)[],
  out: { unit: string; path: (string | number)[] }[],
): void {
  if (node === null || typeof node !== 'object') return;

  const pending: { node: object; path: (string | number)[] }[] = [{ node, path }];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (Array.isArray(current.node)) {
      for (let i = current.node.length - 1; i >= 0; i--) {
        const child = current.node[i];
        if (child !== null && typeof child === 'object') {
          pending.push({ node: child, path: [...current.path, i] });
        }
      }
      continue;
    }

    const record = current.node as Record<string, unknown>;
    const unit = asString(record.unit);
    const kind = asString(record.kind);
    if (unit !== undefined && (kind === undefined || !isQuantityKind(kind))) {
      out.push({ unit, path: [...current.path, 'unit'] });
    }

    const keys = Object.keys(record);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      const child = record[key];
      if (child !== null && typeof child === 'object') {
        pending.push({ node: child, path: [...current.path, key] });
      }
    }
  }
}

export const unitDimensionMatch: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const quantities: { kind: string; unit: string; path: (string | number)[] }[] = [];
  collectQuantities(asRecord(context.request.data), ['data'], quantities);
  collectQuantities(asRecord(context.request.parameters), ['parameters'], quantities);

  const errors: CortexelError[] = [];
  for (const quantity of quantities) {
    errors.push(
      ...checkQuantityUnit(
        quantity.kind,
        quantity.unit,
        [...quantity.path, 'unit'],
        'unit.dimension_match',
      ),
    );
  }
  return errors;
};

export const unitCanonicalCode: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const bare: { unit: string; path: (string | number)[] }[] = [];
  collectBareUnits(asRecord(context.request.data), ['data'], bare);
  collectBareUnits(asRecord(context.request.parameters), ['parameters'], bare);

  const errors: CortexelError[] = [];
  for (const entry of bare) {
    if (isKnownUnit(entry.unit)) continue;

    const at = entry.path
      .map((segment) => `/${String(segment).replace(/~/g, '~0').replace(/\//g, '~1')}`)
      .join('');
    const canonical = resolveAlias(entry.unit);

    if (canonical !== undefined) {
      errors.push(
        makeError({
          code: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
          stage: 'science',
          instancePath: at,
          validatorId: 'unit.canonical_code',
          message: `"${entry.unit}" is an accepted alias, not a canonical code. Use "${canonical}". Cortexel does not convert it silently: a conversion the caller never sees is a number the caller never checked.`,
          repair: {
            operation: 'replace',
            path: at,
            value: canonical,
            reasonCode: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
          },
        }),
      );
    } else {
      errors.push(
        makeError({
          code: 'SCHEMA_ENUM_MISMATCH',
          stage: 'structural',
          instancePath: at,
          validatorId: 'unit.canonical_code',
          message: `"${entry.unit}" is not a unit code in the registry.`,
        }),
      );
    }
  }
  return errors;
};
