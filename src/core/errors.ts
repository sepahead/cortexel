/**
 * The stable diagnostic protocol.
 *
 * Diagnostics are part of the untrusted-input boundary, not a reporting
 * convenience. A validation failure must not become an amplification vector: a
 * caller who sends one hostile string should not be able to get it echoed into
 * logs, agent context, a repair prompt, and the DOM. Two rules follow, and both
 * are enforced here rather than left to each call site.
 *
 *   1. `actualSummary` is a bounded CATEGORY, never the value. Rendering an
 *      untrusted value into a message would invoke its `toString` / `valueOf` /
 *      `Symbol.toPrimitive` hook — i.e. run attacker code while handling an error.
 *
 *   2. A repair is DATA — `{operation, path, value?, reasonCode}` — never
 *      instruction-shaped prose. A downstream language model reads diagnostics;
 *      free text there is an injection surface.
 */

import type { ErrorCode, ErrorStage } from '../generated/registry.js';

export type Severity = 'error' | 'warning';

export interface RepairOperation {
  readonly operation: 'replace' | 'remove' | 'add' | 'migrate';
  readonly path: string;
  readonly value?: unknown;
  readonly reasonCode: string;
}

export interface CortexelError {
  readonly code: ErrorCode;
  readonly severity: Severity;
  readonly stage: ErrorStage;
  /** RFC 6901 JSON Pointer. The empty string is the root. */
  readonly instancePath: string;
  readonly schemaPath?: string;
  readonly skillId?: string;
  readonly validatorId?: string;
  readonly message: string;
  readonly limit?: { readonly name: string; readonly limit: number; readonly observed?: number };
  readonly actualSummary?: string;
  readonly repair?: RepairOperation;
  readonly omittedCount?: number;
}

/** Stage order. Errors are reported in the order the pipeline would hit them. */
export const STAGE_ORDER: readonly ErrorStage[] = [
  'parse',
  'snapshot',
  'identity',
  'structural',
  'semantic',
  'science',
  'scope',
  'provenance',
  'budget',
  'derivation',
  'render',
  'serialize',
  'migrate',
  'adapter',
  'internal',
] as const;

export const MAX_ERROR_RECORDS = 32;
const MAX_MESSAGE_LENGTH = 500;
const MAX_PATH_LENGTH = 240;
const MAX_SUMMARY_LENGTH = 120;

/**
 * Characters that can visually reorder or conceal text: C0/C1 controls, bidi
 * overrides and isolates, zero-width marks. A diagnostic containing them could
 * render as something other than what it says — which in a scientific caption is
 * not a cosmetic problem.
 *
 * Built from an escape STRING rather than written as a regex literal, so the
 * source file itself stays pure ASCII and cannot carry the very bytes it bans.
 */
const UNSAFE_DISPLAY_CLASS =
  '[\\u0000-\\u001f\\u061c\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff\\ufffe-\\uffff]';

/** Matches a single unsafe display character. */
export const UNSAFE_DISPLAY_PATTERN = new RegExp(UNSAFE_DISPLAY_CLASS, 'gu');

/** True when the text is free of unsafe display characters. */
export function isSafeDisplayString(value: string): boolean {
  return !new RegExp(UNSAFE_DISPLAY_CLASS, 'u').test(value);
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

/** Make text safe to place in a log, a DOM node, or an agent's context window. */
export function safeText(value: string, max: number): string {
  const bounded = clip(value, max);
  const escaped = bounded.replace(
    new RegExp(UNSAFE_DISPLAY_CLASS, 'gu'),
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
  return clip(escaped, max);
}

/**
 * Describe an untrusted value WITHOUT converting it.
 *
 * This never calls String(value), value.toString(), or JSON.stringify(value) on
 * an object: all three run caller-defined code. The category and a size are
 * enough to fix the problem, and they cannot execute anything.
 */
export function summarizeValue(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return safeText(`string(length=${value.length})`, MAX_SUMMARY_LENGTH);
    case 'number':
      return Object.is(value, -0) ? 'number(-0)' : `number(${value})`;
    case 'boolean':
      return `boolean(${value ? 'true' : 'false'})`;
    case 'bigint':
      return 'bigint';
    case 'undefined':
      return 'undefined';
    case 'symbol':
      return '<symbol>';
    case 'function':
      return '<function>';
    case 'object': {
      if (value === null) return 'null';
      if (Array.isArray(value)) return `array(length=${value.length})`;
      return '<object>';
    }
    default:
      return '<unknown>';
  }
}

/** Escape a single JSON Pointer reference token (RFC 6901 section 3). */
export function escapePointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Build an RFC 6901 pointer from path segments. The root is the empty string. */
export function pointer(...segments: readonly (string | number)[]): string {
  if (segments.length === 0) return '';
  return segments.map((segment) => `/${escapePointerToken(String(segment))}`).join('');
}

export interface ErrorInit {
  code: ErrorCode;
  severity?: Severity;
  stage: ErrorStage;
  instancePath?: string;
  schemaPath?: string;
  skillId?: string;
  validatorId?: string;
  message: string;
  limit?: { name: string; limit: number; observed?: number };
  actual?: unknown;
  repair?: RepairOperation;
}

/** Construct a bounded, display-safe diagnostic. This is the only way to make one. */
export function makeError(init: ErrorInit): CortexelError {
  const error: {
    -readonly [K in keyof CortexelError]: CortexelError[K];
  } = {
    code: init.code,
    severity: init.severity ?? 'error',
    stage: init.stage,
    instancePath: safeText(init.instancePath ?? '', MAX_PATH_LENGTH),
    message: safeText(init.message, MAX_MESSAGE_LENGTH),
  };

  if (init.schemaPath !== undefined) error.schemaPath = safeText(init.schemaPath, MAX_PATH_LENGTH);
  if (init.skillId !== undefined) error.skillId = safeText(init.skillId, 64);
  if (init.validatorId !== undefined) error.validatorId = safeText(init.validatorId, 64);
  if (init.limit !== undefined) error.limit = init.limit;
  if ('actual' in init) error.actualSummary = summarizeValue(init.actual);
  if (init.repair !== undefined) {
    error.repair = {
      operation: init.repair.operation,
      path: safeText(init.repair.path, MAX_PATH_LENGTH),
      ...('value' in init.repair ? { value: init.repair.value } : {}),
      reasonCode: init.repair.reasonCode,
    };
  }

  return error as CortexelError;
}

/**
 * Deterministic ordering: stage, then JSON Pointer, then code, then validator.
 *
 * Two runs on the same input must produce the same diagnostics in the same order,
 * or a conformance corpus cannot compare TypeScript against Python.
 */
export function compareErrors(a: CortexelError, b: CortexelError): number {
  const stageDelta = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
  if (stageDelta !== 0) return stageDelta;
  if (a.instancePath !== b.instancePath) return a.instancePath < b.instancePath ? -1 : 1;
  if (a.code !== b.code) return a.code < b.code ? -1 : 1;
  const av = a.validatorId ?? '';
  const bv = b.validatorId ?? '';
  if (av !== bv) return av < bv ? -1 : 1;
  return 0;
}

/**
 * Sort and cap. When the cap bites, a final ERROR_LIMIT_REACHED record states how
 * many were suppressed — a hidden failure is worse than a reported one.
 */
export function finalizeErrors(errors: readonly CortexelError[]): CortexelError[] {
  const sorted = [...errors].sort(compareErrors);
  if (sorted.length <= MAX_ERROR_RECORDS) return sorted;

  const kept = sorted.slice(0, MAX_ERROR_RECORDS);
  const omitted = sorted.length - kept.length;
  const limitRecord = makeError({
    code: 'ERROR_LIMIT_REACHED',
    severity: 'warning',
    stage: 'internal',
    message: `${omitted} further diagnostics were suppressed by the diagnostic budget. Fix the reported errors and revalidate.`,
  }) as { omittedCount?: number } & CortexelError;
  limitRecord.omittedCount = omitted;
  kept.push(limitRecord);
  return kept;
}

/** The result of any stage that can fail. */
export type Result<T> =
  | { readonly ok: true; readonly value: T; readonly warnings: readonly CortexelError[] }
  | { readonly ok: false; readonly errors: readonly CortexelError[] };

export function ok<T>(value: T, warnings: readonly CortexelError[] = []): Result<T> {
  return { ok: true, value, warnings };
}

export function err<T>(errors: readonly CortexelError[]): Result<T> {
  return { ok: false, errors: finalizeErrors(errors) };
}
