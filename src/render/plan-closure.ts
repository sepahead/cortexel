/**
 * RenderPlan closure capability for the OutputAuthority translation boundary.
 *
 * The authority gate never inspects a caller-supplied lookalike plan: it checks the
 * module-private capability before reading a property. This closure function is a
 * trusted compiler-only boundary, not an untrusted input API. It checks that internal
 * value through descriptors (so ordinary accessors are rejected without invocation),
 * requires a finite acyclic plain tree, structured-clones it, recursively freezes the
 * clone, and records its identity in a module-private WeakSet.
 *
 * Standard JavaScript has no portable trap-free Proxy predicate. Descriptor/prototype
 * inspection can therefore execute Proxy reflection traps if a hostile Proxy somehow
 * violates the compiler-only precondition; structuredClone subsequently refuses it.
 * No user/network object is authorized to reach this function.
 */

import { deepFreeze } from '../core/deep-freeze.js';
import type { RenderPlanV1 } from './model/renderPlan.js';

export interface RenderPlanClosureProblemV1 {
  readonly path: string;
  readonly message: string;
}

export interface RenderPlanClosureSuccessV1 {
  readonly tag: 'closed';
  readonly plan: RenderPlanV1;
}

export interface RenderPlanClosureFailureV1 {
  readonly tag: 'refused';
  readonly problems: readonly RenderPlanClosureProblemV1[];
}

export type RenderPlanClosureResultV1 =
  | RenderPlanClosureSuccessV1
  | RenderPlanClosureFailureV1;

const CLOSED_RENDER_PLANS = new WeakSet<object>();
const MAX_CLOSURE_PROBLEMS = 32;
const MAX_CLOSURE_NODES = 2_000_000;
const MAX_CLOSURE_DEPTH = 192;
const ARRAY_INDEX = /^(?:0|[1-9][0-9]*)$/u;

function problem(
  problems: RenderPlanClosureProblemV1[],
  path: string,
  message: string,
): void {
  if (problems.length < MAX_CLOSURE_PROBLEMS) problems.push({ path, message });
}

function inspectPlainTree(value: unknown): RenderPlanClosureProblemV1[] {
  const problems: RenderPlanClosureProblemV1[] = [];
  const pending: { readonly value: unknown; readonly path: string; readonly depth: number }[] = [
    { value, path: '', depth: 0 },
  ];
  const seen = new WeakSet<object>();
  let nodes = 0;

  while (pending.length > 0 && problems.length < MAX_CLOSURE_PROBLEMS) {
    const current = pending.pop()!;
    const item = current.value;
    if (item === null || typeof item === 'string' || typeof item === 'boolean') continue;
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) problem(problems, current.path, 'number is not finite');
      continue;
    }
    if (typeof item !== 'object') {
      problem(problems, current.path, `non-plain value of type ${typeof item} is forbidden`);
      continue;
    }
    if (current.depth > MAX_CLOSURE_DEPTH) {
      problem(problems, current.path, `plain plan nesting exceeds ${MAX_CLOSURE_DEPTH}`);
      continue;
    }
    if (seen.has(item)) {
      problem(problems, current.path, 'plan graph repeats or cycles through an object identity');
      continue;
    }
    seen.add(item);
    nodes++;
    if (nodes > MAX_CLOSURE_NODES) {
      problem(problems, current.path, `plain plan exceeds ${MAX_CLOSURE_NODES} object/array nodes`);
      break;
    }

    let prototype: object | null;
    let descriptors: Record<PropertyKey, PropertyDescriptor>;
    try {
      prototype = Object.getPrototypeOf(item);
      descriptors = Object.getOwnPropertyDescriptors(item);
    } catch {
      problem(problems, current.path, 'plan object refused prototype/descriptor inspection');
      continue;
    }
    const array = Array.isArray(item);
    if (
      (array && prototype !== Array.prototype) ||
      (!array && prototype !== Object.prototype && prototype !== null)
    ) {
      problem(problems, current.path, 'plan contains a non-plain object or array prototype');
      continue;
    }
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key === 'symbol')) {
      problem(problems, current.path, 'symbol-keyed plan state is forbidden');
      continue;
    }

    const lengthDescriptor = array ? descriptors.length : undefined;
    const arrayLength = array && lengthDescriptor && 'value' in lengthDescriptor &&
      Number.isSafeInteger(lengthDescriptor.value) && lengthDescriptor.value >= 0
      ? lengthDescriptor.value as number
      : null;
    let arrayIndices = 0;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor || !('value' in descriptor)) {
        problem(problems, `${current.path}/${key}`, 'accessor properties are forbidden');
        continue;
      }
      if (array && key === 'length') continue;
      if (!descriptor.enumerable) {
        problem(problems, `${current.path}/${key}`, 'non-enumerable plan state is forbidden');
        continue;
      }
      if (array) {
        if (!ARRAY_INDEX.test(key) || arrayLength === null || Number(key) >= arrayLength) {
          problem(problems, `${current.path}/${key}`, 'array has a non-index or out-of-range own property');
          continue;
        }
        arrayIndices++;
      }
      pending.push({
        value: descriptor.value,
        path: `${current.path}/${key}`,
        depth: current.depth + 1,
      });
    }
    if (array && (arrayLength === null || arrayIndices !== arrayLength)) {
      problem(problems, current.path, 'plan arrays must be dense and have an ordinary safe length');
    }
  }
  return problems;
}

export function closePlainRenderPlanForAuthorityV1(
  candidate: RenderPlanV1,
): RenderPlanClosureResultV1 {
  const sourceProblems = inspectPlainTree(candidate);
  if (sourceProblems.length > 0) return { tag: 'refused', problems: sourceProblems };

  let detached: RenderPlanV1;
  try {
    // structuredClone rejects every Proxy object in the graph. Descriptor inspection
    // above has already refused ordinary accessors, so ordinary cloning invokes no
    // getter. See the compiler-only Proxy caveat in the module comment.
    detached = structuredClone(candidate);
  } catch {
    return {
      tag: 'refused',
      problems: [{ path: '', message: 'plan could not be detached; proxies and non-cloneable atoms are forbidden' }],
    };
  }
  const detachedProblems = inspectPlainTree(detached);
  if (detachedProblems.length > 0) return { tag: 'refused', problems: detachedProblems };
  const plan = deepFreeze(detached);
  CLOSED_RENDER_PLANS.add(plan);
  return { tag: 'closed', plan };
}

/** Check the module-owned closure capability without reading any candidate property. */
export function isClosedPlainRenderPlanForAuthorityV1(
  value: unknown,
): value is RenderPlanV1 {
  return value !== null && typeof value === 'object' && CLOSED_RENDER_PLANS.has(value as object);
}
