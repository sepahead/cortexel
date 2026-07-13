// core/safeRuntime.ts
function safeErrorMessage(error) {
  try {
    if (typeof error === "string") {
      return safeDiagnosticText(error, 240);
    }
    if (error !== null && (typeof error === "object" || typeof error === "function")) {
      const message = Object.getOwnPropertyDescriptor(error, "message");
      if (message && "value" in message && typeof message.value === "string") {
        return safeDiagnosticText(message.value, 240);
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
var TYPED_ARRAY_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  "length"
)?.get;
function intrinsicTypedArrayLength(value) {
  if (!ArrayBuffer.isView(value) || typeof TYPED_ARRAY_LENGTH_GETTER !== "function") {
    return void 0;
  }
  try {
    const length = Reflect.apply(TYPED_ARRAY_LENGTH_GETTER, value, []);
    return typeof length === "number" && Number.isSafeInteger(length) && length >= 0 ? length : void 0;
  } catch {
    return void 0;
  }
}
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
function safePrimitiveDiagnostic(value, max = 120) {
  let text;
  switch (typeof value) {
    case "string":
      text = value;
      break;
    case "number":
      text = Object.is(value, -0) ? "-0" : `${value}`;
      break;
    case "bigint":
      text = `${value}`;
      break;
    case "boolean":
      text = value ? "true" : "false";
      break;
    case "undefined":
      text = "undefined";
      break;
    case "symbol":
      text = "<symbol>";
      break;
    case "function":
      text = "<function>";
      break;
    case "object":
      text = value === null ? "null" : "<object>";
      break;
    default:
      text = "<unknown>";
  }
  return safeDiagnosticText(text, max);
}
function printablePathSegment(value) {
  return safePrimitiveDiagnostic(value, 80);
}
function boundValidationIssue(issue) {
  const path = clipText(
    issue.path?.map(printablePathSegment).join(".") || "(root)",
    PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength
  );
  let message;
  if (issue.code === "unrecognized_keys" && Array.isArray(issue.keys)) {
    const samples = issue.keys.slice(0, PUBLIC_DIAGNOSTIC_LIMITS.maxUnknownKeySamples).map((key) => JSON.stringify(safePrimitiveDiagnostic(key, 60)));
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
  intrinsicTypedArrayLength,
  safeDiagnosticText,
  safePrimitiveDiagnostic,
  boundValidationIssue,
  formatValidationIssues,
  readOwnEnumerableDataProperty
};
//# sourceMappingURL=chunk-X23XMWZH.js.map