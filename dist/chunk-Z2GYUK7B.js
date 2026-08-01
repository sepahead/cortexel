// src/core/deep-freeze.ts
function deepFreeze(value, seen = /* @__PURE__ */ new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  const object = value;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(value)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}
function freezeGenerated(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeGenerated(item)));
  }
  const clone = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(value)) {
    clone[key] = freezeGenerated(value[key]);
  }
  return Object.freeze(clone);
}

export {
  deepFreeze,
  freezeGenerated
};
//# sourceMappingURL=chunk-Z2GYUK7B.js.map