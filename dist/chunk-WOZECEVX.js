import {
  err,
  makeError,
  ok
} from "./chunk-22OHKNZ5.js";

// src/core/safe-snapshot.ts
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var SnapshotFailure = class extends Error {
  diagnostic;
  constructor(diagnostic) {
    super(diagnostic.message);
    this.name = "SnapshotFailure";
    this.diagnostic = diagnostic;
  }
};
function reflect(operation, path) {
  try {
    return operation();
  } catch {
    throw new SnapshotFailure(
      makeError({
        code: "SNAPSHOT_HOSTILE_REFLECTION",
        stage: "snapshot",
        instancePath: path,
        message: "reflecting on this value threw; it is treated as hostile and is not inspected again"
      })
    );
  }
}
function isWellFormedString(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
      if (!(next >= 56320 && next <= 57343)) return false;
      i++;
    } else if (code >= 56320 && code <= 57343) {
      return false;
    }
  }
  return true;
}
function fail(code, path, message, actual) {
  throw new SnapshotFailure(
    makeError({
      code,
      stage: "snapshot",
      instancePath: path,
      message,
      ...actual !== void 0 ? { actual } : {}
    })
  );
}
function snapshotNode(value, path, depth, state) {
  if (depth > state.limits.jsonDepth) {
    fail("SNAPSHOT_DEPTH_EXCEEDED", path, "the value nests deeper than the snapshot permits");
  }
  state.nodes++;
  if (state.nodes > state.limits.jsonTotalNodes) {
    fail("SNAPSHOT_NODES_EXCEEDED", path, "the value graph exceeds the total node limit");
  }
  if (value === null) return null;
  switch (typeof value) {
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) {
        fail(
          "SNAPSHOT_NON_FINITE_NUMBER",
          path,
          "NaN and Infinity are not measurements; use null for a missing observation",
          value
        );
      }
      return value;
    case "string":
      if (!isWellFormedString(value)) {
        fail(
          "SNAPSHOT_MALFORMED_STRING",
          path,
          "the string contains a lone surrogate and is not well-formed Unicode"
        );
      }
      if (value.length > state.limits.jsonStringLength) {
        fail(
          "SNAPSHOT_STRING_TOO_LONG",
          path,
          `the string contains ${value.length} UTF-16 code units, over the active limit of ${state.limits.jsonStringLength}`
        );
      }
      return value;
    case "undefined":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "undefined is not a JSON value", value);
    // eslint-disable-next-line no-fallthrough
    case "function":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "a function is not data", value);
    // eslint-disable-next-line no-fallthrough
    case "symbol":
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "a symbol is not a JSON value", value);
    // eslint-disable-next-line no-fallthrough
    case "bigint":
      fail(
        "SNAPSHOT_UNSUPPORTED_TYPE",
        path,
        "a bigint has no JSON representation; send a number or a string",
        value
      );
    // eslint-disable-next-line no-fallthrough
    case "object":
      break;
    default:
      fail("SNAPSHOT_UNSUPPORTED_TYPE", path, "the value is of an unsupported type", value);
  }
  const object = value;
  if (state.seen.has(object)) {
    fail("SNAPSHOT_CIRCULAR_REFERENCE", path, "the value graph contains a cycle");
  }
  if (reflect(() => ArrayBuffer.isView(object), path)) {
    fail(
      "SNAPSHOT_NON_PLAIN_OBJECT",
      path,
      "a typed array or DataView is not part of the JSON request contract; use a plain array"
    );
  }
  const isArray = reflect(() => Array.isArray(object), path);
  const prototype = reflect(() => Object.getPrototypeOf(object), path);
  if (!isArray && prototype !== Object.prototype && prototype !== null) {
    fail(
      "SNAPSHOT_NON_PLAIN_OBJECT",
      path,
      "only plain objects and arrays are accepted; a class instance, Date, Map, Set, or Promise is not data"
    );
  }
  state.seen.add(object);
  try {
    return isArray ? snapshotArray(object, path, depth, state) : snapshotObject(object, path, depth, state);
  } finally {
    state.seen.delete(object);
  }
}
function snapshotArray(array, path, depth, state) {
  const lengthDescriptor = reflect(
    () => Object.getOwnPropertyDescriptor(array, "length"),
    path
  );
  if (lengthDescriptor === void 0 || !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")) {
    fail("SNAPSHOT_NON_PLAIN_OBJECT", path, "the array has no intrinsic data length");
  }
  const length = lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length < 0) {
    fail("SNAPSHOT_NON_PLAIN_OBJECT", path, "the array reports an implausible length");
  }
  if (length > state.limits.jsonArrayItems) {
    fail("SNAPSHOT_NODES_EXCEEDED", path, "the array is longer than the snapshot permits");
  }
  const keys = reflect(() => Reflect.ownKeys(array), path);
  const out = [];
  for (let index = 0; index < length; index++) {
    const descriptor = reflect(
      () => Object.getOwnPropertyDescriptor(array, index),
      `${path}/${index}`
    );
    if (descriptor === void 0) {
      fail(
        "SNAPSHOT_SPARSE_ARRAY",
        `${path}/${index}`,
        "the array has a hole; use an explicit null for a missing observation"
      );
    }
    if (!("value" in descriptor)) {
      fail(
        "SNAPSHOT_ACCESSOR_PROPERTY",
        `${path}/${index}`,
        "the element is defined by a getter; Cortexel will not invoke caller code to read data"
      );
    }
    out.push(snapshotNode(descriptor.value, `${path}/${index}`, depth + 1, state));
  }
  for (const key of keys) {
    if (typeof key === "symbol") {
      fail("SNAPSHOT_SYMBOL_KEY", path, "the array carries a symbol-keyed property");
    }
    if (key === "length") continue;
    const canonicalIndex = /^(?:0|[1-9][0-9]*)$/u.test(key) ? Number(key) : -1;
    if (Number.isSafeInteger(canonicalIndex) && canonicalIndex >= 0 && canonicalIndex < length) {
      continue;
    }
    fail(
      "SNAPSHOT_DECORATED_ARRAY",
      path,
      `the array carries the named property ${JSON.stringify(String(key))}, which a JSON array cannot represent`
    );
  }
  return out;
}
function snapshotObject(object, path, depth, state) {
  const keys = reflect(() => Reflect.ownKeys(object), path);
  const out = /* @__PURE__ */ Object.create(null);
  let count = 0;
  for (const key of keys) {
    if (typeof key === "symbol") {
      fail("SNAPSHOT_SYMBOL_KEY", path, "the object carries a symbol-keyed property");
    }
    const childPath = `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    if (DANGEROUS_KEYS.has(key)) {
      fail(
        "SNAPSHOT_DANGEROUS_KEY",
        childPath,
        `the key ${JSON.stringify(key)} can reach Object.prototype and is rejected`
      );
    }
    const descriptor = reflect(() => Object.getOwnPropertyDescriptor(object, key), childPath);
    if (descriptor === void 0) continue;
    if (!descriptor.enumerable) continue;
    if (!("value" in descriptor)) {
      fail(
        "SNAPSHOT_ACCESSOR_PROPERTY",
        childPath,
        "the property is defined by a getter or setter; Cortexel inspects descriptors and will not invoke caller code to read data"
      );
    }
    count++;
    if (count > state.limits.jsonObjectKeys) {
      fail("SNAPSHOT_NODES_EXCEEDED", path, "the object has more members than the snapshot permits");
    }
    out[key] = snapshotNode(descriptor.value, childPath, depth + 1, state);
  }
  return out;
}
function snapshotValue(value, limits) {
  const state = { limits, nodes: 0, seen: /* @__PURE__ */ new Set() };
  try {
    return ok(snapshotNode(value, "", 0, state));
  } catch (error) {
    if (error instanceof SnapshotFailure) {
      return err([error.diagnostic]);
    }
    return err([
      makeError({
        code: "INTERNAL_INVARIANT_VIOLATED",
        stage: "internal",
        message: "the snapshot failed in an unexpected way; this is a Cortexel defect"
      })
    ]);
  }
}

export {
  snapshotValue
};
//# sourceMappingURL=chunk-WOZECEVX.js.map