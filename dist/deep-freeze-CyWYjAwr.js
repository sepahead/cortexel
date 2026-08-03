//#region src/core/deep-freeze.ts
/**
* Recursively freeze a value owned by Cortexel.
*
* This helper is deliberately not an untrusted-input boundary. Callers use it only
* after `parseJsonStrict` or `snapshotValue` has reduced input to an acyclic tree of
* plain JSON values, or on objects assembled entirely inside Cortexel. Freezing that
* tree closes a time-of-check/time-of-use gap: a digest and the data it names cannot
* diverge because a later caller mutates a nested array.
*/
function deepFreeze(value, seen = /* @__PURE__ */ new WeakSet()) {
	if (value === null || typeof value !== "object") return value;
	const object = value;
	if (seen.has(object)) return value;
	seen.add(object);
	for (const child of Object.values(value)) deepFreeze(child, seen);
	return Object.freeze(value);
}
/**
* Clone trusted generated JSON into a recursively frozen tree whose object nodes have
* null prototypes.
*
* Generated registries are global scientific authority. A shallow `Object.freeze`
* still lets a consumer rewrite a nested unit dimension, disclosure sentence, palette,
* or budget for every later call. Null-prototype clones also make keys such as
* `__proto__` ordinary data rather than inherited lookup results.
*/
function freezeGenerated(value) {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) return Object.freeze(value.map((item) => freezeGenerated(item)));
	const clone = Object.create(null);
	for (const key of Object.keys(value)) clone[key] = freezeGenerated(value[key]);
	return Object.freeze(clone);
}

//#endregion
export { freezeGenerated as n, deepFreeze as t };
//# sourceMappingURL=deep-freeze-CyWYjAwr.js.map