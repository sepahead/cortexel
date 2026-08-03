//#region src/core/errors.ts
/** Stage order. Errors are reported in the order the pipeline would hit them. */
const STAGE_ORDER = Object.freeze([
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
const MAX_ERROR_RECORDS = 32;
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
const UNSAFE_DISPLAY_CLASS = "[\\u0000-\\u001f\\u061c\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff\\ufffe-\\uffff]";
/** Immutable regex source for consumers that need to construct their own matcher. */
const UNSAFE_DISPLAY_PATTERN_SOURCE = UNSAFE_DISPLAY_CLASS;
/** True when the text is free of unsafe display characters. */
function isSafeDisplayString(value) {
	return typeof value === "string" && !new RegExp(UNSAFE_DISPLAY_CLASS, "u").test(value);
}
/** Make text safe to place in a log, a DOM node, or an agent's context window. */
function safeText(value, max) {
	if (typeof value !== "string" || !Number.isSafeInteger(max) || max <= 0) return "";
	let out = "";
	for (let index = 0; index < value.length;) {
		const codePoint = value.codePointAt(index);
		const character = String.fromCodePoint(codePoint);
		const next = index + character.length;
		const token = !(codePoint >= 55296 && codePoint <= 57343) && isSafeDisplayString(character) ? character : `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
		const capacity = next < value.length ? max - 1 : max;
		if (out.length + token.length > capacity) return `${out}…`;
		out += token;
		index = next;
	}
	return out;
}
/**
* Describe an untrusted value WITHOUT converting it.
*
* This never calls String(value), value.toString(), or JSON.stringify(value) on
* an object: all three run caller-defined code. The category and a size are
* enough to fix the problem, and they cannot execute anything.
*/
function summarizeValue(value) {
	switch (typeof value) {
		case "string": return safeText(`string(length=${value.length})`, MAX_SUMMARY_LENGTH);
		case "number": return Object.is(value, -0) ? "number(-0)" : `number(${value})`;
		case "boolean": return `boolean(${value ? "true" : "false"})`;
		case "bigint": return "bigint";
		case "undefined": return "undefined";
		case "symbol": return "<symbol>";
		case "function": return "<function>";
		case "object":
			if (value === null) return "null";
			try {
				if (Array.isArray(value)) return "<array>";
			} catch {
				return "<uninspectable-object>";
			}
			return "<object>";
		default: return "<unknown>";
	}
}
/** Escape a single JSON Pointer reference token (RFC 6901 section 3). */
function escapePointerToken(token) {
	return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
/** Build an RFC 6901 pointer from path segments. The root is the empty string. */
function pointer(...segments) {
	if (segments.length === 0) return "";
	return segments.map((segment) => `/${escapePointerToken(String(segment))}`).join("");
}
/** Construct a bounded, display-safe diagnostic. This is the only way to make one. */
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
	if (init.repair !== void 0) error.repair = {
		operation: init.repair.operation,
		path: safeText(init.repair.path, MAX_PATH_LENGTH),
		..."value" in init.repair ? { value: init.repair.value } : {},
		reasonCode: init.repair.reasonCode
	};
	return error;
}
/**
* Deterministic ordering: stage, then JSON Pointer, then code, then validator.
*
* Two runs on the same input must produce the same diagnostics in the same order,
* or a conformance corpus cannot compare TypeScript against Python.
*/
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
	return compareUnicodeCodePoints(a.validatorId ?? "", b.validatorId ?? "");
}
/**
* Sort and cap. When the cap bites, a final ERROR_LIMIT_REACHED record states how
* many were suppressed — a hidden failure is worse than a reported one.
*/
function finalizeErrors(errors) {
	const sorted = [...errors].sort(compareErrors);
	if (sorted.length <= 32) return sorted;
	const kept = sorted.slice(0, 31);
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
/**
* Finalize an already-bounded diagnostic batch while retaining library-generated
* stop reasons that explain why a higher-level operation refused to continue.
*
* A nested gate may already have spent the diagnostic budget and appended its own
* ERROR_LIMIT_REACHED record. Blindly re-finalizing after adding a budget or internal
* sentinel can sort that governing reason past the cap. Fold the inherited omitted
* count forward, reserve space for priority records, then keep the earliest ordinary
* diagnostics under the same deterministic order. Callers supply only library-owned
* records; untrusted input never chooses priority.
*/
function finalizeErrorsWithPriority(errors, priority) {
	if (priority.length === 0) return finalizeErrors(errors);
	let inheritedOmitted = 0;
	const ordinary = [];
	for (const error of errors) if (error.code === "ERROR_LIMIT_REACHED") {
		if (Number.isSafeInteger(error.omittedCount) && (error.omittedCount ?? -1) >= 0) inheritedOmitted += error.omittedCount;
	} else ordinary.push(error);
	const priorityRecords = priority.filter((error) => error.code !== "ERROR_LIMIT_REACHED").sort(compareErrors);
	const allKnown = ordinary.length + priorityRecords.length;
	if (inheritedOmitted === 0 && allKnown <= 32) return [...ordinary, ...priorityRecords].sort(compareErrors);
	const keptPriority = priorityRecords.slice(0, 31);
	const ordinaryCapacity = 31 - keptPriority.length;
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
	return {
		ok: true,
		value,
		warnings
	};
}
function err(errors) {
	return {
		ok: false,
		errors: finalizeErrors(errors)
	};
}

//#endregion
Object.defineProperty(exports, 'UNSAFE_DISPLAY_PATTERN_SOURCE', {
  enumerable: true,
  get: function () {
    return UNSAFE_DISPLAY_PATTERN_SOURCE;
  }
});
Object.defineProperty(exports, 'err', {
  enumerable: true,
  get: function () {
    return err;
  }
});
Object.defineProperty(exports, 'finalizeErrors', {
  enumerable: true,
  get: function () {
    return finalizeErrors;
  }
});
Object.defineProperty(exports, 'finalizeErrorsWithPriority', {
  enumerable: true,
  get: function () {
    return finalizeErrorsWithPriority;
  }
});
Object.defineProperty(exports, 'isSafeDisplayString', {
  enumerable: true,
  get: function () {
    return isSafeDisplayString;
  }
});
Object.defineProperty(exports, 'makeError', {
  enumerable: true,
  get: function () {
    return makeError;
  }
});
Object.defineProperty(exports, 'ok', {
  enumerable: true,
  get: function () {
    return ok;
  }
});
Object.defineProperty(exports, 'pointer', {
  enumerable: true,
  get: function () {
    return pointer;
  }
});
Object.defineProperty(exports, 'safeText', {
  enumerable: true,
  get: function () {
    return safeText;
  }
});
//# sourceMappingURL=errors-DaUwoa4p.cjs.map