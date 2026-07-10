/** Extract a bounded diagnostic without invoking instanceof, coercion, or an
 *  unguarded property access on hostile thrown values/Proxies. */
export function safeErrorMessage(error: unknown): string {
  try {
    if (typeof error === 'string') {
      return safeDiagnosticText(error, 240);
    }
    if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
      const message = Reflect.get(error, 'message');
      if (typeof message === 'string') {
        return safeDiagnosticText(message, 240);
      }
    }
  } catch {
    // A revoked/hostile Proxy may throw from get/getPrototypeOf. Never inspect it again.
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

function printablePathSegment(value: PropertyKey): string {
  try {
    return safeDiagnosticText(typeof value === 'symbol' ? String(value) : `${value}`, 80);
  } catch {
    return '<unprintable>';
  }
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
      .map((key) => {
        try {
          return safeDiagnosticText(
            JSON.stringify(clipText(typeof key === 'string' ? key : String(key), 60)),
            80,
          );
        } catch {
          return '"<unprintable>"';
        }
      });
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
