/** Extract a bounded diagnostic without invoking instanceof, coercion, or an
 *  accessor on hostile thrown values/Proxies. Only an own primitive data
 *  property is eligible; inherited/accessor messages are deliberately opaque. */
export function safeErrorMessage(error: unknown): string {
  try {
    if (typeof error === 'string') {
      return safeDiagnosticText(error, 240);
    }
    if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
      const message = Object.getOwnPropertyDescriptor(error, 'message');
      if (message && 'value' in message && typeof message.value === 'string') {
        return safeDiagnosticText(message.value, 240);
      }
    }
  } catch {
    // A revoked/hostile Proxy may throw from its descriptor trap. Never inspect it again.
  }
  return 'unknown error';
}

/** Public diagnostics are themselves part of the untrusted-input boundary.
 * Zod can otherwise place thousands of unknown keys (or one enormous key) in a
 * single issue message/path, amplifying a small validation failure through logs,
 * React state, repair prompts, and the DOM. */
export const PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
  maxIssues: 32,
  maxPathLength: 240,
  maxMessageLength: 500,
  maxTotalLength: 8_192,
  maxUnknownKeySamples: 8,
});

/** One-line render-facing scientific labels must not carry invisible control or
 * bidi-override characters that can visually spoof axes, nodes, or captions. */
export const SAFE_DISPLAY_STRING_PATTERN =
  /^[^\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]*$/u;

const TYPED_ARRAY_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'length',
)?.get;

/** Read a typed array's internal length without consulting an overridable
 * subclass `length` accessor. DataView and non-typed-array inputs return
 * undefined. This is the single length primitive for hostile-input boundaries
 * that intentionally accept numeric typed arrays. */
export function intrinsicTypedArrayLength(value: unknown): number | undefined {
  if (!ArrayBuffer.isView(value) || typeof TYPED_ARRAY_LENGTH_GETTER !== 'function') {
    return undefined;
  }
  try {
    const length: unknown = Reflect.apply(TYPED_ARRAY_LENGTH_GETTER, value, []);
    return typeof length === 'number' && Number.isSafeInteger(length) && length >= 0
      ? length
      : undefined;
  } catch {
    return undefined;
  }
}

export interface ValidationIssueLike {
  path?: readonly PropertyKey[];
  message?: string;
  code?: unknown;
  keys?: readonly unknown[];
}

function clipText(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}

/** Keep public diagnostics single-line and visually ordered. Escaped output is
 * data-safe for logs/UI even when it is not subsequently JSON-stringified. */
export function safeDiagnosticText(value: string, max: number): string {
  const boundedSource = clipText(value, max);
  const escaped = boundedSource.replace(
    /[\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
  return clipText(escaped, max);
}

/** Render an untrusted value for a public diagnostic without invoking any
 * user-defined conversion hook. Objects/functions are deliberately opaque:
 * calling String(value), value.toString(), or Symbol.toPrimitive at this
 * boundary would execute attacker-controlled code while handling an error. */
export function safePrimitiveDiagnostic(value: unknown, max = 120): string {
  let text: string;
  switch (typeof value) {
    case 'string':
      text = value;
      break;
    case 'number':
      text = Object.is(value, -0) ? '-0' : `${value}`;
      break;
    case 'bigint':
      text = `${value}`;
      break;
    case 'boolean':
      text = value ? 'true' : 'false';
      break;
    case 'undefined':
      text = 'undefined';
      break;
    case 'symbol':
      // Even a symbol description is unnecessary disclosure for a repair hint.
      // Keeping it opaque also avoids relying on a mutable global String.
      text = '<symbol>';
      break;
    case 'function':
      text = '<function>';
      break;
    case 'object':
      text = value === null ? 'null' : '<object>';
      break;
    default:
      text = '<unknown>';
  }
  return safeDiagnosticText(text, max);
}

function printablePathSegment(value: PropertyKey): string {
  return safePrimitiveDiagnostic(value, 80);
}

/** Convert one trusted validator issue to a bounded public path/message pair. */
export function boundValidationIssue(
  issue: ValidationIssueLike,
): { path: string; message: string } {
  const path = clipText(
    issue.path?.map(printablePathSegment).join('.') || '(root)',
    PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength,
  );
  let message: string;
  if (issue.code === 'unrecognized_keys' && Array.isArray(issue.keys)) {
    const samples = issue.keys
      .slice(0, PUBLIC_DIAGNOSTIC_LIMITS.maxUnknownKeySamples)
      .map((key) => JSON.stringify(safePrimitiveDiagnostic(key, 60)));
    const omitted = issue.keys.length - samples.length;
    message = `unrecognized keys (${issue.keys.length}): ${samples.join(', ')}` +
      (omitted > 0 ? `; ${omitted} more omitted` : '');
  } else {
    message = typeof issue.message === 'string'
      ? issue.message
      : 'validation failed';
  }
  return {
    path,
    message: safeDiagnosticText(message, PUBLIC_DIAGNOSTIC_LIMITS.maxMessageLength),
  };
}

/** Format validator issues under both count and aggregate-text budgets. */
export function formatValidationIssues(
  issues: readonly ValidationIssueLike[],
): string[] {
  const output: string[] = [];
  let total = 0;
  const count = Math.min(issues.length, PUBLIC_DIAGNOSTIC_LIMITS.maxIssues);
  for (let index = 0; index < count; index++) {
    const bounded = boundValidationIssue(issues[index]);
    const line = `${bounded.path}: ${bounded.message}`;
    if (total + line.length > PUBLIC_DIAGNOSTIC_LIMITS.maxTotalLength) {
      output.push('(root): additional validation detail omitted by the diagnostic budget');
      return output;
    }
    output.push(line);
    total += line.length;
  }
  if (issues.length > count) {
    output.push(`(root): ${issues.length - count} additional validation issues omitted`);
  }
  return output;
}

export type OwnDataProperty =
  | { kind: 'value'; value: unknown }
  | { kind: 'absent' }
  | { kind: 'invalid' };

/** Read an untrusted discriminator without invoking a getter. Proxy descriptor
 *  traps may still throw; public callers wrap those as structured failures. */
export function readOwnEnumerableDataProperty(
  input: unknown,
  key: string,
): OwnDataProperty {
  if (input === null || typeof input !== 'object') return { kind: 'absent' };
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor) return { kind: 'absent' };
  return 'value' in descriptor && descriptor.enumerable
    ? { kind: 'value', value: descriptor.value }
    : { kind: 'invalid' };
}
