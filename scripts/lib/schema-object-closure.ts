/**
 * A conservative proof that a JSON Schema closes every object it can admit.
 *
 * `additionalProperties: false` and `unevaluatedProperties: false` close a schema
 * directly. A `$ref` counts only when a caller-supplied resolver finds its target
 * and that target is proved closed by these same rules. Composition follows Draft
 * 2020-12 semantics:
 *
 * - one closed `allOf` conjunct closes the intersection;
 * - every `oneOf` / `anyOf` alternative must close;
 * - both outcomes of an exhaustive `if` / `then` / `else` dispatch must close;
 * - `false` is vacuously closed because it admits no instance; `true` is open.
 *
 * The returned leaves let the generator walk complete conditional declarations
 * normally, so nested authored objects are checked too. This is intentionally not
 * a general schema satisfiability solver; anything outside these reviewable proof
 * rules fails closed.
 */

export interface ObjectClosureLeaf {
  readonly path: string;
  readonly schema: unknown;
}

export interface ObjectClosureProof {
  readonly closed: boolean;
  readonly leaves: readonly ObjectClosureLeaf[];
  readonly openPaths: readonly string[];
}

export type SchemaRefResolver = (reference: string) => unknown | undefined;

function childPath(parent: string, keyword: string, index?: number): string {
  const base = `${parent}/${keyword}`;
  return index === undefined ? base : `${base}/${index}`;
}

function open(path: string): ObjectClosureProof {
  return { closed: false, leaves: [], openPaths: [path] };
}

function combineEvery(proofs: readonly ObjectClosureProof[]): ObjectClosureProof {
  return {
    closed: proofs.every((proof) => proof.closed),
    leaves: proofs.flatMap((proof) => proof.leaves),
    openPaths: proofs.flatMap((proof) => proof.openPaths),
  };
}

function isJsonObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function proveAuthoredObjectClosure(
  schema: unknown,
  path = '',
  resolveRef?: SchemaRefResolver,
  activeRefs: ReadonlySet<string> = new Set(),
): ObjectClosureProof {
  if (schema === false) return { closed: true, leaves: [], openPaths: [] };
  if (schema === true || schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    return open(path);
  }

  const node = schema as Record<string, unknown>;
  if (
    node.additionalProperties === false ||
    node.unevaluatedProperties === false
  ) {
    return {
      closed: true,
      leaves: [{ path, schema }],
      openPaths: [],
    };
  }

  const declaredTypes = typeof node.type === 'string'
    ? [node.type]
    : Array.isArray(node.type) && node.type.every((value) => typeof value === 'string')
      ? node.type
      : undefined;
  if (declaredTypes !== undefined && !declaredTypes.includes('object')) {
    // A schema that rejects every object is vacuously object-closed.
    return { closed: true, leaves: [], openPaths: [] };
  }
  if (Object.hasOwn(node, 'const') && !isJsonObject(node.const)) {
    return { closed: true, leaves: [], openPaths: [] };
  }
  if (Array.isArray(node.enum) && node.enum.every((value) => !isJsonObject(value))) {
    return { closed: true, leaves: [], openPaths: [] };
  }

  if (typeof node.$ref === 'string') {
    if (!resolveRef || activeRefs.has(node.$ref)) return open(childPath(path, '$ref'));
    const target = resolveRef(node.$ref);
    if (target === undefined) return open(childPath(path, '$ref'));
    const nextActive = new Set(activeRefs);
    nextActive.add(node.$ref);
    return proveAuthoredObjectClosure(target, childPath(path, '$ref'), resolveRef, nextActive);
  }

  if (Array.isArray(node.allOf)) {
    const proofs = node.allOf.map((branch, index) =>
      proveAuthoredObjectClosure(
        branch,
        childPath(path, 'allOf', index),
        resolveRef,
        activeRefs,
      ),
    );
    const closing = proofs.filter((proof) => proof.closed);
    if (closing.length > 0) {
      return {
        closed: true,
        leaves: closing.flatMap((proof) => proof.leaves),
        openPaths: [],
      };
    }
    return {
      closed: false,
      leaves: [],
      openPaths: proofs.flatMap((proof) => proof.openPaths),
    };
  }

  for (const keyword of ['oneOf', 'anyOf'] as const) {
    const alternatives = node[keyword];
    if (Array.isArray(alternatives) && alternatives.length > 0) {
      return combineEvery(alternatives.map((branch, index) =>
        proveAuthoredObjectClosure(branch, childPath(path, keyword, index), resolveRef, activeRefs),
      ));
    }
  }

  if (
    Object.hasOwn(node, 'if') &&
    Object.hasOwn(node, 'then') &&
    Object.hasOwn(node, 'else')
  ) {
    return combineEvery([
      proveAuthoredObjectClosure(node.then, childPath(path, 'then'), resolveRef, activeRefs),
      proveAuthoredObjectClosure(node.else, childPath(path, 'else'), resolveRef, activeRefs),
    ]);
  }

  return open(path);
}
