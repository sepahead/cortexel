// src/core/errors.ts
var STAGE_ORDER = Object.freeze([
  "parse",
  "snapshot",
  "identity",
  "structural",
  "semantic",
  "science",
  "scope",
  "provenance",
  "budget",
  "derivation",
  "render",
  "serialize",
  "migrate",
  "adapter",
  "internal"
]);
var MAX_ERROR_RECORDS = 32;
var MAX_MESSAGE_LENGTH = 500;
var MAX_PATH_LENGTH = 240;
var MAX_SUMMARY_LENGTH = 120;
var UNSAFE_DISPLAY_CLASS = "[\\u0000-\\u001f\\u061c\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff\\ufffe-\\uffff]";
var UNSAFE_DISPLAY_PATTERN_SOURCE = UNSAFE_DISPLAY_CLASS;
function isSafeDisplayString(value) {
  return typeof value === "string" && !new RegExp(UNSAFE_DISPLAY_CLASS, "u").test(value);
}
function safeText(value, max) {
  if (typeof value !== "string" || !Number.isSafeInteger(max) || max <= 0) return "";
  let out = "";
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    const character = String.fromCodePoint(codePoint);
    const next = index + character.length;
    const loneSurrogate = codePoint >= 55296 && codePoint <= 57343;
    const token = !loneSurrogate && isSafeDisplayString(character) ? character : `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
    const capacity = next < value.length ? max - 1 : max;
    if (out.length + token.length > capacity) return `${out}\u2026`;
    out += token;
    index = next;
  }
  return out;
}
function summarizeValue(value) {
  switch (typeof value) {
    case "string":
      return safeText(`string(length=${value.length})`, MAX_SUMMARY_LENGTH);
    case "number":
      return Object.is(value, -0) ? "number(-0)" : `number(${value})`;
    case "boolean":
      return `boolean(${value ? "true" : "false"})`;
    case "bigint":
      return "bigint";
    case "undefined":
      return "undefined";
    case "symbol":
      return "<symbol>";
    case "function":
      return "<function>";
    case "object": {
      if (value === null) return "null";
      try {
        if (Array.isArray(value)) return "<array>";
      } catch {
        return "<uninspectable-object>";
      }
      return "<object>";
    }
    default:
      return "<unknown>";
  }
}
function escapePointerToken(token) {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
function pointer(...segments) {
  if (segments.length === 0) return "";
  return segments.map((segment) => `/${escapePointerToken(String(segment))}`).join("");
}
function makeError(init) {
  const error = {
    code: init.code,
    severity: init.severity ?? "error",
    stage: init.stage,
    instancePath: safeText(init.instancePath ?? "", MAX_PATH_LENGTH),
    message: safeText(init.message, MAX_MESSAGE_LENGTH)
  };
  if (init.schemaPath !== void 0) error.schemaPath = safeText(init.schemaPath, MAX_PATH_LENGTH);
  if (init.skillId !== void 0) error.skillId = safeText(init.skillId, 64);
  if (init.validatorId !== void 0) error.validatorId = safeText(init.validatorId, 64);
  if (init.limit !== void 0) error.limit = init.limit;
  if ("actual" in init) error.actualSummary = summarizeValue(init.actual);
  if (init.repair !== void 0) {
    error.repair = {
      operation: init.repair.operation,
      path: safeText(init.repair.path, MAX_PATH_LENGTH),
      ..."value" in init.repair ? { value: init.repair.value } : {},
      reasonCode: init.repair.reasonCode
    };
  }
  return error;
}
function compareUnicodeCodePoints(left, right) {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftPoint = left.codePointAt(leftIndex);
    const rightPoint = right.codePointAt(rightIndex);
    if (leftPoint !== rightPoint) return leftPoint < rightPoint ? -1 : 1;
    leftIndex += leftPoint > 65535 ? 2 : 1;
    rightIndex += rightPoint > 65535 ? 2 : 1;
  }
  if (leftIndex === left.length && rightIndex === right.length) return 0;
  return leftIndex === left.length ? -1 : 1;
}
function compareErrors(a, b) {
  const stageDelta = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
  if (stageDelta !== 0) return stageDelta;
  const pathDelta = compareUnicodeCodePoints(a.instancePath, b.instancePath);
  if (pathDelta !== 0) return pathDelta;
  const codeDelta = compareUnicodeCodePoints(a.code, b.code);
  if (codeDelta !== 0) return codeDelta;
  const av = a.validatorId ?? "";
  const bv = b.validatorId ?? "";
  return compareUnicodeCodePoints(av, bv);
}
function finalizeErrors(errors) {
  const sorted = [...errors].sort(compareErrors);
  if (sorted.length <= MAX_ERROR_RECORDS) return sorted;
  const kept = sorted.slice(0, MAX_ERROR_RECORDS - 1);
  const omitted = sorted.length - kept.length;
  const limitRecord = makeError({
    code: "ERROR_LIMIT_REACHED",
    severity: "warning",
    stage: "internal",
    message: `${omitted} further diagnostics were suppressed by the diagnostic budget. Fix the reported errors and revalidate.`
  });
  limitRecord.omittedCount = omitted;
  kept.push(limitRecord);
  return kept;
}
function finalizeErrorsWithPriority(errors, priority) {
  if (priority.length === 0) return finalizeErrors(errors);
  let inheritedOmitted = 0;
  const ordinary = [];
  for (const error of errors) {
    if (error.code === "ERROR_LIMIT_REACHED") {
      if (Number.isSafeInteger(error.omittedCount) && (error.omittedCount ?? -1) >= 0) {
        inheritedOmitted += error.omittedCount;
      }
    } else {
      ordinary.push(error);
    }
  }
  const priorityRecords = priority.filter((error) => error.code !== "ERROR_LIMIT_REACHED").sort(compareErrors);
  const allKnown = ordinary.length + priorityRecords.length;
  if (inheritedOmitted === 0 && allKnown <= MAX_ERROR_RECORDS) {
    return [...ordinary, ...priorityRecords].sort(compareErrors);
  }
  const keptPriority = priorityRecords.slice(0, MAX_ERROR_RECORDS - 1);
  const ordinaryCapacity = MAX_ERROR_RECORDS - 1 - keptPriority.length;
  const keptOrdinary = ordinary.sort(compareErrors).slice(0, ordinaryCapacity);
  const omitted = inheritedOmitted + (priorityRecords.length - keptPriority.length) + (ordinary.length - keptOrdinary.length);
  const limitRecord = makeError({
    code: "ERROR_LIMIT_REACHED",
    severity: "warning",
    stage: "internal",
    message: `${omitted} further diagnostics were suppressed by the diagnostic budget. Fix the reported errors and revalidate.`
  });
  limitRecord.omittedCount = omitted;
  return [...keptOrdinary, ...keptPriority].sort(compareErrors).concat(limitRecord);
}
function ok(value, warnings = []) {
  return { ok: true, value, warnings };
}
function err(errors) {
  return { ok: false, errors: finalizeErrors(errors) };
}

export {
  MAX_ERROR_RECORDS,
  UNSAFE_DISPLAY_PATTERN_SOURCE,
  isSafeDisplayString,
  safeText,
  pointer,
  makeError,
  finalizeErrors,
  finalizeErrorsWithPriority,
  ok,
  err
};
//# sourceMappingURL=chunk-RF2EM75L.js.map