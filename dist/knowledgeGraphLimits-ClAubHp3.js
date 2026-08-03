//#region core/safeRuntime.ts
/** Extract a bounded diagnostic without invoking instanceof, coercion, or an
*  accessor on hostile thrown values/Proxies. Only an own primitive data
*  property is eligible; inherited/accessor messages are deliberately opaque. */
function safeErrorMessage(error) {
	try {
		if (typeof error === "string") return safeDiagnosticText(error, 240);
		if (error !== null && (typeof error === "object" || typeof error === "function")) {
			const message = Object.getOwnPropertyDescriptor(error, "message");
			if (message && "value" in message && typeof message.value === "string") return safeDiagnosticText(message.value, 240);
		}
	} catch {}
	return "unknown error";
}
/** Public diagnostics are themselves part of the untrusted-input boundary.
* Zod can otherwise place thousands of unknown keys (or one enormous key) in a
* single issue message/path, amplifying a small validation failure through logs,
* React state, repair prompts, and the DOM. */
const PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
	maxIssues: 32,
	maxPathLength: 240,
	maxMessageLength: 500,
	maxTotalLength: 8192,
	maxUnknownKeySamples: 8
});
/** One-line render-facing scientific labels must not carry invisible control or
* bidi-override characters that can visually spoof axes, nodes, or captions. */
const SAFE_DISPLAY_STRING_PATTERN = /^[^\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]*$/u;
const TYPED_ARRAY_LENGTH_GETTER = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), "length")?.get;
/** Read a typed array's internal length without consulting an overridable
* subclass `length` accessor. DataView and non-typed-array inputs return
* undefined. This is the single length primitive for hostile-input boundaries
* that intentionally accept numeric typed arrays. */
function intrinsicTypedArrayLength(value) {
	if (!ArrayBuffer.isView(value) || typeof TYPED_ARRAY_LENGTH_GETTER !== "function") return;
	try {
		const length = Reflect.apply(TYPED_ARRAY_LENGTH_GETTER, value, []);
		return typeof length === "number" && Number.isSafeInteger(length) && length >= 0 ? length : void 0;
	} catch {
		return;
	}
}
function clipText(value, max) {
	return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}
/** Keep public diagnostics single-line and visually ordered. Escaped output is
* data-safe for logs/UI even when it is not subsequently JSON-stringified. */
function safeDiagnosticText(value, max) {
	return clipText(clipText(value, max).replace(/[\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`), max);
}
/** Render an untrusted value for a public diagnostic without invoking any
* user-defined conversion hook. Objects/functions are deliberately opaque:
* calling String(value), value.toString(), or Symbol.toPrimitive at this
* boundary would execute attacker-controlled code while handling an error. */
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
		default: text = "<unknown>";
	}
	return safeDiagnosticText(text, max);
}
function printablePathSegment(value) {
	return safePrimitiveDiagnostic(value, 80);
}
/** Convert one trusted validator issue to a bounded public path/message pair. */
function boundValidationIssue(issue) {
	const path = clipText(issue.path?.map(printablePathSegment).join(".") || "(root)", PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength);
	let message;
	if (issue.code === "unrecognized_keys" && Array.isArray(issue.keys)) {
		const samples = issue.keys.slice(0, PUBLIC_DIAGNOSTIC_LIMITS.maxUnknownKeySamples).map((key) => JSON.stringify(safePrimitiveDiagnostic(key, 60)));
		const omitted = issue.keys.length - samples.length;
		message = `unrecognized keys (${issue.keys.length}): ${samples.join(", ")}` + (omitted > 0 ? `; ${omitted} more omitted` : "");
	} else message = typeof issue.message === "string" ? issue.message : "validation failed";
	return {
		path,
		message: safeDiagnosticText(message, PUBLIC_DIAGNOSTIC_LIMITS.maxMessageLength)
	};
}
/** Format validator issues under both count and aggregate-text budgets. */
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
	if (issues.length > count) output.push(`(root): ${issues.length - count} additional validation issues omitted`);
	return output;
}
/** Read an untrusted discriminator without invoking a getter. Proxy descriptor
*  traps may still throw; public callers wrap those as structured failures. */
function readOwnEnumerableDataProperty(input, key) {
	if (input === null || typeof input !== "object") return { kind: "absent" };
	const descriptor = Object.getOwnPropertyDescriptor(input, key);
	if (!descriptor) return { kind: "absent" };
	return "value" in descriptor && descriptor.enumerable ? {
		kind: "value",
		value: descriptor.value
	} : { kind: "invalid" };
}

//#endregion
//#region core/skills/knowledgeGraphLimits.ts
/**
* Shared zero-dependency limits for evidence-bearing knowledge-graph records.
* Render-only entrypoints enforce these without pulling zod into their bundle.
*/
const KNOWLEDGE_GRAPH_LIMITS = Object.freeze({
	/** Accepted presentation/inspection limits. These match the legacy params gate. */
	maxPresentationNodes: 1e3,
	maxPresentationEdges: 4e3,
	/**
	* Main-thread d3-force refinement limits. Above either bound the canonical
	* composition retains the caption and complete DOM records but does not mount
	* the live 3D solver. These are resource ceilings, not portable FPS claims.
	*/
	maxLiveForceNodes: 250,
	maxLiveForceEdges: 1e3,
	/**
	* Aggregate presentation limits apply across every retained occurrence. Aliased
	* containers receive no amortization: each occurrence is inspected and copied.
	*/
	maxPresentationRetainedOccurrences: 25e4,
	maxPresentationStringCodeUnits: 4e6,
	maxPresentationInspectionWork: 1e6,
	/** A view can explicitly name every kind present in its bounded source. */
	maxViewNodeKinds: 1e3,
	maxViewEdgeKinds: 4e3,
	/** Equivalent hot-path policies reuse one token without unbounded cache growth. */
	maxCachedViewsPerPresentation: 128,
	/** Strong raw-JSON boundary, before a presentation object is materialized. */
	maxPresentationRawInputBytes: 16e6,
	maxPresentationJsonDepth: 8,
	maxPresentationJsonNodes: 3e5,
	maxPresentationJsonNumberTokenLength: 100,
	maxNodeIdLength: 120,
	maxNodeLabelLength: 240,
	maxEdgeIdLength: 320,
	maxEdgeLabelLength: 160,
	maxKindLength: 80,
	maxColorLength: 64,
	maxRadiusMeaningLength: 400,
	maxAttributes: 24,
	maxAttributeKeyLength: 80,
	maxAttributeArrayItems: 16,
	maxEvidenceRefsPerElement: 8,
	maxEvidenceIdLength: 384,
	maxRecordIdLength: 320,
	maxLocatorLength: 240,
	maxPaperIdLength: 160,
	maxCitationIdLength: 160,
	maxSourceIdLength: 240,
	maxDoiLength: 240,
	maxParallelEdgesPerPair: 9,
	maxDetailLength: 1e3,
	maxAttributeStringLength: 500,
	maxExcerptLength: 1e3
});
/** One strict-parser profile shared by generic presentations and corpus VizSpecs. */
const KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS = Object.freeze({
	rawInputBytes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationRawInputBytes,
	jsonDepth: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonDepth,
	jsonTotalNodes: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonNodes,
	jsonStringLength: Math.max(1024, KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength, KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength),
	jsonNumberTokenLength: KNOWLEDGE_GRAPH_LIMITS.maxPresentationJsonNumberTokenLength,
	jsonObjectKeys: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
	jsonArrayItems: KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges
});

//#endregion
export { boundValidationIssue as a, readOwnEnumerableDataProperty as c, safePrimitiveDiagnostic as d, SAFE_DISPLAY_STRING_PATTERN as i, safeDiagnosticText as l, KNOWLEDGE_GRAPH_LIMITS as n, formatValidationIssues as o, PUBLIC_DIAGNOSTIC_LIMITS as r, intrinsicTypedArrayLength as s, KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS as t, safeErrorMessage as u };
//# sourceMappingURL=knowledgeGraphLimits-ClAubHp3.js.map