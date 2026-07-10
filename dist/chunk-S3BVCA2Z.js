// core/safeRuntime.ts
function safeErrorMessage(error) {
  try {
    if (typeof error === "string") {
      return safeDiagnosticText(error, 240);
    }
    if (error !== null && (typeof error === "object" || typeof error === "function")) {
      const message = Reflect.get(error, "message");
      if (typeof message === "string") {
        return safeDiagnosticText(message, 240);
      }
    }
  } catch {
  }
  return "unknown error";
}
var PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
  maxIssues: 32,
  maxPathLength: 240,
  maxMessageLength: 500,
  maxTotalLength: 8192,
  maxUnknownKeySamples: 8
});
var SAFE_DISPLAY_STRING_PATTERN = /^[^\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]*$/u;
function clipText(value, max) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}\u2026`;
}
function safeDiagnosticText(value, max) {
  const boundedSource = clipText(value, max);
  const escaped = boundedSource.replace(
    /[\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
  return clipText(escaped, max);
}
function printablePathSegment(value) {
  try {
    return safeDiagnosticText(typeof value === "symbol" ? String(value) : `${value}`, 80);
  } catch {
    return "<unprintable>";
  }
}
function boundValidationIssue(issue) {
  const path = clipText(
    issue.path?.map(printablePathSegment).join(".") || "(root)",
    PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength
  );
  let message;
  if (issue.code === "unrecognized_keys" && Array.isArray(issue.keys)) {
    const samples = issue.keys.slice(0, PUBLIC_DIAGNOSTIC_LIMITS.maxUnknownKeySamples).map((key) => {
      try {
        return safeDiagnosticText(
          JSON.stringify(clipText(typeof key === "string" ? key : String(key), 60)),
          80
        );
      } catch {
        return '"<unprintable>"';
      }
    });
    const omitted = issue.keys.length - samples.length;
    message = `unrecognized keys (${issue.keys.length}): ${samples.join(", ")}` + (omitted > 0 ? `; ${omitted} more omitted` : "");
  } else {
    message = typeof issue.message === "string" ? issue.message : "validation failed";
  }
  return {
    path,
    message: safeDiagnosticText(message, PUBLIC_DIAGNOSTIC_LIMITS.maxMessageLength)
  };
}
function formatValidationIssues(issues) {
  const output = [];
  let total = 0;
  const count = Math.min(issues.length, PUBLIC_DIAGNOSTIC_LIMITS.maxIssues);
  for (let index = 0; index < count; index++) {
    const bounded = boundValidationIssue(issues[index]);
    const line = `${bounded.path}: ${bounded.message}`;
    if (total + line.length > PUBLIC_DIAGNOSTIC_LIMITS.maxTotalLength) {
      output.push("(root): additional validation detail omitted by the diagnostic budget");
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
function readOwnEnumerableDataProperty(input, key) {
  if (input === null || typeof input !== "object") return { kind: "absent" };
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor) return { kind: "absent" };
  return "value" in descriptor && descriptor.enumerable ? { kind: "value", value: descriptor.value } : { kind: "invalid" };
}

export {
  safeErrorMessage,
  PUBLIC_DIAGNOSTIC_LIMITS,
  SAFE_DISPLAY_STRING_PATTERN,
  safeDiagnosticText,
  boundValidationIssue,
  formatValidationIssues,
  readOwnEnumerableDataProperty
};
//# sourceMappingURL=chunk-S3BVCA2Z.js.map