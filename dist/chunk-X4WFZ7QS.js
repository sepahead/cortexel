import {
  NEST_DEVICE_FAMILIES,
  NEST_SKILL_REGISTRY,
  isSkillId,
  listSkills
} from "./chunk-5F72LNSM.js";
import {
  SAFE_DISPLAY_STRING_PATTERN,
  formatValidationIssues,
  safeDiagnosticText,
  safeErrorMessage
} from "./chunk-S3BVCA2Z.js";

// core/skills/router.ts
var SPIKE_KIND_TO_SKILL = /* @__PURE__ */ new Map([
  ["events", "nest.spike_raster"],
  ["rates", "nest.rate_response"],
  ["correlation", "nest.correlogram"]
]);
function spikeDisambiguator() {
  return {
    field: "dataShape.kind",
    maps: Object.fromEntries(SPIKE_KIND_TO_SKILL)
  };
}
var FAMILY_MEMBERS = (() => {
  const out = /* @__PURE__ */ new Map();
  for (const c of listSkills()) {
    const members = out.get(c.deviceFamily) ?? [];
    members.push(c.id);
    out.set(c.deviceFamily, members);
  }
  for (const members of out.values()) Object.freeze(members);
  return out;
})();
function resolve(skill) {
  const contract = NEST_SKILL_REGISTRY[skill];
  if (contract.scene === null) {
    return {
      ok: false,
      reason: "no_cortexel_scene",
      candidates: [skill],
      rendererRoutes: contract.rendererRoutes,
      field: "skill",
      message: `skill '${skill}' has no Cortexel scene; use one of its host renderer routes`
    };
  }
  return { ok: true, skill, scene: contract.scene };
}
function printable(value) {
  try {
    const rendered = String(value);
    return rendered.length <= 120 ? rendered : `${rendered.slice(0, 117)}\u2026`;
  } catch {
    return "<unprintable value>";
  }
}
function routeToSceneUnsafe(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      reason: "invalid_input",
      field: "(input)",
      message: "route input must be an object with a deviceFamily"
    };
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    return {
      ok: false,
      reason: "invalid_input",
      field: "(input)",
      message: "route input must be a plain object"
    };
  }
  const raw = {};
  const allowedInputKeys = /* @__PURE__ */ new Set(["deviceFamily", "dataShape", "skill"]);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !allowedInputKeys.has(key)) {
      return {
        ok: false,
        reason: "invalid_input",
        field: typeof key === "string" ? key : "(symbol)",
        message: `unknown route input field '${printable(key)}'`
      };
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      return {
        ok: false,
        reason: "invalid_input",
        field: key,
        message: "route input fields must be enumerable data properties"
      };
    }
    raw[key] = descriptor.value;
  }
  if (!Object.hasOwn(raw, "deviceFamily")) {
    return {
      ok: false,
      reason: "invalid_input",
      field: "deviceFamily",
      message: "route input is missing deviceFamily"
    };
  }
  const deviceFamily = raw.deviceFamily;
  if (typeof deviceFamily !== "string" || !NEST_DEVICE_FAMILIES.includes(deviceFamily)) {
    return {
      ok: false,
      reason: "unknown_family",
      field: "deviceFamily",
      message: `unknown device family '${printable(deviceFamily)}'`
    };
  }
  const family = deviceFamily;
  const members = FAMILY_MEMBERS.get(family);
  if (!members || members.length === 0) {
    return { ok: false, reason: "unknown_family", field: "deviceFamily" };
  }
  const dataShape = raw.dataShape;
  let shapeSkill;
  if (dataShape !== void 0) {
    if (family !== "spike_recorder") {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape",
        candidates: [...members],
        message: `dataShape is only valid for device family 'spike_recorder'`
      };
    }
    if (dataShape === null || typeof dataShape !== "object" || Array.isArray(dataShape)) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape",
        candidates: [...members],
        disambiguateBy: spikeDisambiguator(),
        message: "dataShape must be an object containing kind"
      };
    }
    const shapePrototype = Object.getPrototypeOf(dataShape);
    const shapeKeys = Reflect.ownKeys(dataShape);
    if (shapePrototype !== Object.prototype && shapePrototype !== null || shapeKeys.length !== 1 || shapeKeys[0] !== "kind") {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape",
        candidates: [...members],
        disambiguateBy: spikeDisambiguator(),
        message: "dataShape must be a strict plain object containing kind"
      };
    }
    const kindDescriptor = Object.getOwnPropertyDescriptor(dataShape, "kind");
    if (!kindDescriptor || !("value" in kindDescriptor) || !kindDescriptor.enumerable) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape.kind",
        candidates: [...members],
        disambiguateBy: spikeDisambiguator(),
        message: "dataShape.kind must be an enumerable data property"
      };
    }
    const kind = kindDescriptor.value;
    shapeSkill = typeof kind === "string" ? SPIKE_KIND_TO_SKILL.get(kind) : void 0;
    if (!shapeSkill) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape.kind",
        candidates: [...members],
        disambiguateBy: spikeDisambiguator(),
        message: `unknown spike data kind '${printable(kind)}'`
      };
    }
  }
  const suppliedSkill = raw.skill;
  if (suppliedSkill !== void 0) {
    if (!isSkillId(suppliedSkill)) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "skill",
        candidates: [...members],
        message: `unknown skill discriminator '${printable(suppliedSkill)}'`,
        disambiguateBy: {
          field: "skill",
          maps: Object.fromEntries(members.map((skill) => [skill, skill]))
        }
      };
    }
    if (!members.includes(suppliedSkill)) {
      return {
        ok: false,
        reason: "skill_family_mismatch",
        field: "skill",
        candidates: [...members],
        message: `skill '${suppliedSkill}' does not belong to device family '${family}'`,
        disambiguateBy: {
          field: "skill",
          maps: Object.fromEntries(members.map((skill) => [skill, skill]))
        }
      };
    }
    if (shapeSkill && shapeSkill !== suppliedSkill) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape.kind",
        candidates: [...members],
        disambiguateBy: spikeDisambiguator(),
        message: `dataShape resolves to '${shapeSkill}' but skill is '${suppliedSkill}'`
      };
    }
    return resolve(suppliedSkill);
  }
  if (members.length === 1) return resolve(members[0]);
  if (shapeSkill) return resolve(shapeSkill);
  const disambiguateBy = family === "spike_recorder" ? spikeDisambiguator() : {
    field: "skill",
    maps: Object.fromEntries(members.map((s) => [s, s]))
  };
  return {
    ok: false,
    reason: "ambiguous",
    candidates: [...members],
    disambiguateBy
  };
}
function routeToScene(input) {
  try {
    return routeToSceneUnsafe(input);
  } catch (error) {
    return {
      ok: false,
      reason: "invalid_input",
      field: "(input)",
      message: `route input could not be safely inspected: ${safeErrorMessage(error)}`
    };
  }
}

// core/skills/verify.ts
function invalid(reason) {
  return { valid: false, empty: false, populated: [], reason };
}
var FLOAT32_MAX = 34028234663852886e22;
var SCENE_DATA_FIELDS = /* @__PURE__ */ new Set([
  "spikeTimes",
  "spikeSenders",
  "timeUnits",
  "voltageTraces",
  "voltageUnits",
  "traceTimes",
  "traceSender",
  "weightSeries",
  "weightUnits",
  "weightSynapse",
  "analogTraces",
  "networkNodes",
  "networkEdges",
  "networkWeightUnits",
  "networkDelayUnits",
  "networkCoordinateUnits",
  "networkLayout",
  "vectorField"
]);
function readData(record, key) {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) return { present: false };
  return "value" in descriptor && descriptor.enumerable ? { present: true, value: descriptor.value } : { invalid: true };
}
function finiteTypedLength(value, precision) {
  const validType = precision === "f32" ? value instanceof Float32Array : value instanceof Float64Array;
  if (!validType) return null;
  const array = value;
  for (let index = 0; index < array.length; index++) {
    if (!Number.isFinite(array[index])) return null;
  }
  return array.length;
}
function denseDataArray(value) {
  if (!Array.isArray(value)) return null;
  const length = Object.getOwnPropertyDescriptor(value, "length");
  if (!length || !("value" in length) || !Number.isSafeInteger(length.value)) return null;
  const output = [];
  for (let index = 0; index < length.value; index++) {
    const item = Object.getOwnPropertyDescriptor(value, String(index));
    if (!item || !("value" in item) || !item.enumerable) return null;
    output.push(item.value);
  }
  return Reflect.ownKeys(value).length === output.length + 1 ? output : null;
}
function nonblank(value) {
  return typeof value === "string" && value.trim().length > 0 && SAFE_DISPLAY_STRING_PATTERN.test(value);
}
function plainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value : null;
}
function exactDataRecord(value, allowed) {
  const source = plainRecord(value);
  if (!source) return null;
  const snapshot = /* @__PURE__ */ Object.create(null);
  for (const key of Reflect.ownKeys(source)) {
    if (typeof key !== "string" || !allowed.has(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
    Object.defineProperty(snapshot, key, {
      value: descriptor.value,
      enumerable: true,
      writable: false,
      configurable: false
    });
  }
  return snapshot;
}
function safeId(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
}
function finiteGpuNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= FLOAT32_MAX;
}
function detectEmptyScene(data) {
  try {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return invalid("input is not a SceneData object");
    }
    const prototype = Object.getPrototypeOf(data);
    if (prototype !== Object.prototype && prototype !== null) {
      return invalid("SceneData must be a plain object");
    }
    const record = exactDataRecord(data, SCENE_DATA_FIELDS);
    if (!record) return invalid("SceneData contains an unknown, symbol, accessor, or non-enumerable field");
    const populated = [];
    const numericLengths = /* @__PURE__ */ new Map();
    for (const [field, precision] of [
      ["spikeTimes", "f64"],
      ["spikeSenders", "f32"],
      ["traceTimes", "f64"],
      ["voltageTraces", "f32"],
      ["weightSeries", "f32"]
    ]) {
      const fieldValue = readData(record, field);
      if ("invalid" in fieldValue) return invalid(`${field} must be an enumerable data property`);
      if (!fieldValue.present) continue;
      const length = finiteTypedLength(fieldValue.value, precision);
      if (length === null) return invalid(`${field} must be a finite ${precision === "f64" ? "Float64Array" : "Float32Array"}`);
      numericLengths.set(field, length);
    }
    if (numericLengths.has("spikeTimes") !== numericLengths.has("spikeSenders") || numericLengths.get("spikeTimes") !== numericLengths.get("spikeSenders")) {
      return invalid("spikeTimes and spikeSenders must be present with equal lengths");
    }
    if ((numericLengths.get("spikeTimes") ?? 0) > 0) populated.push("spikeTimes");
    const traceLengths = [];
    for (const field of ["voltageTraces", "weightSeries"]) {
      const length = numericLengths.get(field);
      if (length !== void 0) traceLengths.push([field, length]);
    }
    const analog = readData(record, "analogTraces");
    if ("invalid" in analog) return invalid("analogTraces must be an enumerable data property");
    if (analog.present) {
      const analogRecord = exactDataRecord(
        analog.value,
        /* @__PURE__ */ new Set(["values", "variable", "units"])
      );
      if (!analogRecord) return invalid("analogTraces must be a plain data object");
      const values = readData(analogRecord, "values");
      const variable = readData(analogRecord, "variable");
      const units = readData(analogRecord, "units");
      if ("invalid" in values || !values.present || "invalid" in variable || !variable.present || "invalid" in units || !units.present || !nonblank(variable.value) || !nonblank(units.value)) {
        return invalid("analogTraces requires finite values plus nonblank variable and units");
      }
      const length = finiteTypedLength(values.value, "f32");
      if (length === null) return invalid("analogTraces.values must be a finite Float32Array");
      traceLengths.push(["analogTraces", length]);
    }
    if (traceLengths.length > 0) {
      const timeLength = numericLengths.get("traceTimes");
      if (timeLength === void 0 || traceLengths.some(([, length]) => length !== timeLength)) {
        return invalid("traceTimes must align one-to-one with every trace channel");
      }
      for (const [field, length] of traceLengths) if (length > 0) populated.push(field);
      const timeUnits2 = readData(record, "timeUnits");
      if ("invalid" in timeUnits2 || !timeUnits2.present || !nonblank(timeUnits2.value)) {
        return invalid("trace channels require nonblank timeUnits");
      }
    } else if (numericLengths.has("traceTimes")) {
      return invalid("traceTimes requires at least one trace value channel");
    }
    if (numericLengths.has("voltageTraces")) {
      const units = readData(record, "voltageUnits");
      if ("invalid" in units || !units.present || !nonblank(units.value)) {
        return invalid("voltageTraces requires nonblank voltageUnits");
      }
    }
    if (numericLengths.has("weightSeries")) {
      const units = readData(record, "weightUnits");
      if ("invalid" in units || !units.present || !nonblank(units.value)) {
        return invalid("weightSeries requires nonblank weightUnits");
      }
    }
    if (numericLengths.has("spikeTimes")) {
      const units = readData(record, "timeUnits");
      if ("invalid" in units || !units.present || !nonblank(units.value)) {
        return invalid("spike channels require nonblank timeUnits");
      }
    }
    for (const [metadata, channel] of [
      ["voltageUnits", "voltageTraces"],
      ["weightUnits", "weightSeries"]
    ]) {
      const value = readData(record, metadata);
      if ("invalid" in value) return invalid(`${metadata} must be an enumerable data property`);
      if (value.present && (!numericLengths.has(channel) || !nonblank(value.value))) {
        return invalid(`${metadata} requires its corresponding ${channel} channel`);
      }
    }
    const timeUnits = readData(record, "timeUnits");
    if ("invalid" in timeUnits) return invalid("timeUnits must be an enumerable data property");
    if (timeUnits.present && (!nonblank(timeUnits.value) || !numericLengths.has("spikeTimes") && traceLengths.length === 0)) {
      return invalid("timeUnits requires a spike or trace time axis");
    }
    const traceSender = readData(record, "traceSender");
    if ("invalid" in traceSender) return invalid("traceSender must be an enumerable data property");
    if (traceSender.present && (!safeId(traceSender.value) || !numericLengths.has("voltageTraces") && !analog.present)) {
      return invalid("traceSender requires a voltage or analog trace and a safe sender id");
    }
    const weightSynapse = readData(record, "weightSynapse");
    if ("invalid" in weightSynapse) return invalid("weightSynapse must be an enumerable data property");
    if (weightSynapse.present) {
      const pair = exactDataRecord(weightSynapse.value, /* @__PURE__ */ new Set(["sender", "target"]));
      const sender = pair ? readData(pair, "sender") : { invalid: true };
      const target = pair ? readData(pair, "target") : { invalid: true };
      if (!numericLengths.has("weightSeries") || "invalid" in sender || !sender.present || !safeId(sender.value) || "invalid" in target || !target.present || !safeId(target.value)) {
        return invalid("weightSynapse requires weightSeries plus safe sender/target ids");
      }
    }
    const nodesField = readData(record, "networkNodes");
    if ("invalid" in nodesField) return invalid("networkNodes must be an enumerable data property");
    const nodeIds = /* @__PURE__ */ new Set();
    let nodes = null;
    if (nodesField.present) {
      nodes = denseDataArray(nodesField.value);
      if (!nodes) return invalid("networkNodes must be a dense data array");
      const layout = readData(record, "networkLayout");
      if ("invalid" in layout || !layout.present || typeof layout.value !== "string" || !["unpositioned", "provided-2d", "provided-3d"].includes(layout.value)) {
        return invalid("networkNodes requires a declared networkLayout");
      }
      const layoutValue = layout.value;
      for (const nodeValue of nodes) {
        const node = exactDataRecord(nodeValue, /* @__PURE__ */ new Set(["id", "x", "y", "z", "label"]));
        if (!node) return invalid("networkNodes must contain plain data objects");
        const id = readData(node, "id");
        const label = readData(node, "label");
        if ("invalid" in id || !id.present || !safeId(id.value) || "invalid" in label || !label.present || !nonblank(label.value) || nodeIds.has(id.value)) {
          return invalid("networkNodes require unique non-negative safe ids and nonblank labels");
        }
        nodeIds.add(id.value);
        const coordinates = ["x", "y", "z"].map((axis) => readData(node, axis));
        const presentCount = coordinates.filter((coordinate) => "present" in coordinate && coordinate.present).length;
        if (presentCount !== 0 && presentCount !== 3) return invalid("network node coordinates must be all present or all absent");
        for (const coordinate of coordinates) {
          if ("invalid" in coordinate || "present" in coordinate && coordinate.present && !finiteGpuNumber(coordinate.value)) {
            return invalid("network node coordinates must be finite Float32-range numbers");
          }
        }
        if (layoutValue === "unpositioned" && presentCount !== 0) {
          return invalid("unpositioned network nodes must not claim measured coordinates");
        }
        if (layoutValue !== "unpositioned" && presentCount !== 3) {
          return invalid("provided network layouts require x/y/z for every node");
        }
        if (layoutValue === "provided-2d" && "present" in coordinates[2] && coordinates[2].present && coordinates[2].value !== 0) {
          return invalid("provided-2d network nodes must lie on the z=0 plane");
        }
      }
      if (layoutValue !== "unpositioned") {
        const units = readData(record, "networkCoordinateUnits");
        if ("invalid" in units || !units.present || !nonblank(units.value)) {
          return invalid("provided network coordinates require networkCoordinateUnits");
        }
      }
      if (nodes.length > 0) populated.push("networkNodes");
    }
    const edgesField = readData(record, "networkEdges");
    if ("invalid" in edgesField) return invalid("networkEdges must be an enumerable data property");
    let networkHasWeights = false;
    let networkHasDelays = false;
    if (edgesField.present) {
      const edges = denseDataArray(edgesField.value);
      if (!edges || !nodes) return invalid("networkEdges requires a networkNodes array");
      let weightCount = 0;
      let delayCount = 0;
      for (const edgeValue of edges) {
        const edge = exactDataRecord(
          edgeValue,
          /* @__PURE__ */ new Set(["source", "target", "weight", "delay"])
        );
        const source = edge ? readData(edge, "source") : { invalid: true };
        const target = edge ? readData(edge, "target") : { invalid: true };
        if ("invalid" in source || !source.present || !safeId(source.value) || !nodeIds.has(source.value) || "invalid" in target || !target.present || !safeId(target.value) || !nodeIds.has(target.value)) {
          return invalid("networkEdges must reference declared network node ids");
        }
        const weight = readData(edge, "weight");
        const delay = readData(edge, "delay");
        if ("invalid" in weight || weight.present && !finiteGpuNumber(weight.value)) {
          return invalid("network edge weights must be finite Float32-range numbers");
        }
        if ("invalid" in delay || delay.present && (!finiteGpuNumber(delay.value) || delay.value <= 0)) {
          return invalid("network edge delays must be positive finite Float32-range numbers");
        }
        if (weight.present) weightCount += 1;
        if (delay.present) delayCount += 1;
      }
      if (weightCount !== 0 && weightCount !== edges.length) {
        return invalid("network edge weights must be present for every edge or none");
      }
      if (delayCount !== 0 && delayCount !== edges.length) {
        return invalid("network edge delays must be present for every edge or none");
      }
      if (weightCount > 0) {
        networkHasWeights = true;
        const units = readData(record, "networkWeightUnits");
        if ("invalid" in units || !units.present || !nonblank(units.value)) {
          return invalid("network edge weights require nonblank networkWeightUnits");
        }
      }
      if (delayCount > 0) {
        networkHasDelays = true;
        const units = readData(record, "networkDelayUnits");
        if ("invalid" in units || !units.present || !nonblank(units.value)) {
          return invalid("network edge delays require nonblank networkDelayUnits");
        }
      }
    }
    for (const [metadata, present] of [
      ["networkWeightUnits", networkHasWeights],
      ["networkDelayUnits", networkHasDelays]
    ]) {
      const value = readData(record, metadata);
      if ("invalid" in value) return invalid(`${metadata} must be an enumerable data property`);
      if (value.present && (!present || !nonblank(value.value))) {
        return invalid(`${metadata} requires the corresponding measurement on every edge`);
      }
    }
    const networkLayout = readData(record, "networkLayout");
    if ("invalid" in networkLayout) return invalid("networkLayout must be an enumerable data property");
    if (networkLayout.present && !nodesField.present) {
      return invalid("networkLayout requires networkNodes");
    }
    const coordinateUnits = readData(record, "networkCoordinateUnits");
    if ("invalid" in coordinateUnits) {
      return invalid("networkCoordinateUnits must be an enumerable data property");
    }
    if (coordinateUnits.present) {
      if (!nodesField.present || !nonblank(coordinateUnits.value) || !networkLayout.present || networkLayout.value === "unpositioned") {
        return invalid("networkCoordinateUnits requires a provided network layout");
      }
    }
    const vectorField = readData(record, "vectorField");
    if ("invalid" in vectorField) return invalid("vectorField must be an enumerable data property");
    if (vectorField.present) {
      const vectors = denseDataArray(vectorField.value);
      if (!vectors) return invalid("vectorField must be a dense data array");
      for (const vectorValue of vectors) {
        const vector = exactDataRecord(
          vectorValue,
          /* @__PURE__ */ new Set(["x", "y", "z", "dx", "dy", "dz"])
        );
        if (!vector || ["x", "y", "z", "dx", "dy", "dz"].some((field) => {
          const item = readData(vector, field);
          return "invalid" in item || !item.present || !finiteGpuNumber(item.value);
        })) return invalid("vectorField entries require finite Float32-range x/y/z/dx/dy/dz values");
      }
      if (vectors.length > 0) populated.push("vectorField");
    }
    const empty = populated.length === 0;
    return {
      valid: true,
      empty,
      populated,
      reason: empty ? "SceneData has no renderable content \u2014 all channels are empty; the render would be blank" : void 0
    };
  } catch {
    return invalid("SceneData could not be safely inspected");
  }
}

// core/nest/shapes.ts
import { z } from "zod";
var NEST_INPUT_LIMITS = Object.freeze({
  maxSamples: 1e5,
  maxPositions: 5e4
});
var FLOAT32_MAX2 = 34028234663852886e22;
var OVERSIZED_ARRAY_INPUT = Object.freeze({ oversizedArray: true });
var INVALID_ARRAY_INPUT = Object.freeze({ invalidArray: true });
function boundedArrayInput(value, max) {
  if (Array.isArray(value)) {
    const length = Object.getOwnPropertyDescriptor(value, "length");
    if (!length || !("value" in length) || length.value > max) {
      return OVERSIZED_ARRAY_INPUT;
    }
    const itemCount = length.value;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== itemCount + 1) return INVALID_ARRAY_INPUT;
    const snapshot = new Array(itemCount);
    for (let index = 0; index < itemCount; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        return INVALID_ARRAY_INPUT;
      }
      snapshot[index] = descriptor.value;
    }
    return snapshot;
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return value.length <= max ? value : OVERSIZED_ARRAY_INPUT;
  }
  return value;
}
function typedNumbersToArray(value) {
  value = boundedArrayInput(value, NEST_INPUT_LIMITS.maxSamples);
  if (!ArrayBuffer.isView(value) || value instanceof DataView) return value;
  return Array.from(value);
}
function numberArray(options = {}) {
  const array = z.array(z.unknown()).min(options.min ?? 0, options.minMessage).max(NEST_INPUT_LIMITS.maxSamples).superRefine((values, ctx) => {
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: "expected a finite number (NaN/Inf is unusable evidence)"
        });
        return;
      }
      if (options.float32 && Math.abs(value) > FLOAT32_MAX2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: "value is outside the Float32 range used by GPU buffers"
        });
        return;
      }
      if (options.integerId && (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: "node/sender ids must be non-negative safe integers"
        });
        return;
      }
    }
  }).transform((values) => values);
  return z.preprocess(typedNumbersToArray, array);
}
var finiteNumberArray = numberArray();
var float32NumberArray = numberArray({ float32: true });
var nonEmptyFloat32Input = numberArray({
  min: 1,
  minMessage: "empty array \u2014 no samples to render",
  float32: true
});
var finiteIntegerArray = numberArray({ integerId: true });
var nonEmptyFiniteIntegerArray = numberArray({
  min: 1,
  minMessage: "no senders",
  integerId: true
});
var finiteInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0), "ids must not be negative zero");
var nonEmptyFinite = numberArray({
  min: 1,
  minMessage: "empty array \u2014 no samples to render"
});
var nonEmptyFloat32Array = numberArray({
  min: 1,
  minMessage: "empty array \u2014 no samples to render",
  float32: true
});
var nonEmptyFiniteIdArray = numberArray({
  min: 1,
  minMessage: "no connections",
  integerId: true
});
function positionArray(dimensions) {
  return z.preprocess(
    (value) => boundedArrayInput(value, NEST_INPUT_LIMITS.maxPositions),
    z.array(z.unknown()).min(1, "no positions").max(NEST_INPUT_LIMITS.maxPositions).transform((positions, ctx) => {
      const output = [];
      for (let index = 0; index < positions.length; index++) {
        const position = positions[index];
        if (!Array.isArray(position) || position.length !== dimensions) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: `position must be an exact ${dimensions}D coordinate tuple`
          });
          return z.NEVER;
        }
        const tuple = [];
        for (let axis = 0; axis < dimensions; axis++) {
          const descriptor = Object.getOwnPropertyDescriptor(position, String(axis));
          const value = descriptor && "value" in descriptor ? descriptor.value : void 0;
          if (!descriptor || !descriptor.enumerable || typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, axis],
              message: "coordinate must be a finite Float32-range number"
            });
            return z.NEVER;
          }
          tuple.push(value);
        }
        output.push(tuple);
      }
      return output;
    })
  );
}
var localEdgeArray = z.preprocess(
  (value) => boundedArrayInput(value, NEST_INPUT_LIMITS.maxSamples),
  z.array(z.unknown()).max(NEST_INPUT_LIMITS.maxSamples).transform((edges, ctx) => {
    const output = [];
    for (let index = 0; index < edges.length; index++) {
      const edge = edges[index];
      if (edge === null || typeof edge !== "object" || Array.isArray(edge) || Reflect.ownKeys(edge).some((key) => key !== "source" && key !== "target")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: "edge must be a strict {source,target} object"
        });
        return z.NEVER;
      }
      const source = Object.getOwnPropertyDescriptor(edge, "source");
      const target = Object.getOwnPropertyDescriptor(edge, "target");
      const sourceValue = source && "value" in source ? source.value : void 0;
      const targetValue = target && "value" in target ? target.value : void 0;
      if (!source?.enumerable || !target?.enumerable || !finiteInteger.safeParse(sourceValue).success || !finiteInteger.safeParse(targetValue).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: "edge source/target must be non-negative safe integers"
        });
        return z.NEVER;
      }
      output.push({ source: sourceValue, target: targetValue });
    }
    return output;
  })
);
var SpikeRecorderEventsSchema = z.object({
  senders: finiteIntegerArray,
  // becomes denseIndex Map keys — reject NaN/Inf
  times: finiteNumberArray
}).strict().superRefine((v, ctx) => {
  if (v.senders.length !== v.times.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `senders (${v.senders.length}) and times (${v.times.length}) length mismatch`
    });
  }
});
var MultimeterEventsSchema = z.object({
  times: nonEmptyFinite,
  values: nonEmptyFloat32Input,
  /** Present on a series returned by splitMultimeterBySender. */
  sender: finiteInteger.optional()
}).strict().superRefine((v, ctx) => {
  if (v.times.length !== v.values.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `times (${v.times.length}) and values (${v.values.length}) length mismatch`
    });
  }
  for (let i = 1; i < v.times.length; i++) {
    if (v.times[i] < v.times[i - 1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "multimeter times are non-monotonic \u2014 likely multiple senders flattened together; split per sender before adapting"
      });
      break;
    }
  }
});
var MultimeterMultiSenderSchema = z.object({
  times: nonEmptyFinite,
  values: nonEmptyFloat32Array,
  senders: nonEmptyFiniteIntegerArray
}).strict().superRefine((v, ctx) => {
  const n = v.times.length;
  if (v.values.length !== n || v.senders.length !== n) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "times, values and senders must be the same length"
    });
  }
});
var GetConnectionsSchema = z.object({
  sources: nonEmptyFiniteIdArray,
  targets: nonEmptyFiniteIdArray,
  weights: float32NumberArray.optional(),
  delays: float32NumberArray.optional()
}).strict().superRefine((v, ctx) => {
  if (v.sources.length !== v.targets.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `sources (${v.sources.length}) and targets (${v.targets.length}) length mismatch`
    });
  }
  if (v.weights && v.weights.length !== v.sources.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "weights length does not match connection count"
    });
  }
  if (v.delays && v.delays.length !== v.sources.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "delays length does not match connection count"
    });
  }
  if (v.delays) {
    for (let index = 0; index < v.delays.length; index++) {
      if (v.delays[index] <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["delays", index],
          message: "synaptic delays must be strictly positive durations"
        });
        break;
      }
    }
  }
});
var GetPosition2DSchema = z.object({
  positions: positionArray(2),
  node_ids: finiteIntegerArray.optional()
}).strict().superRefine((value, ctx) => {
  if (value.node_ids && value.node_ids.length !== value.positions.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["node_ids"],
      message: "node_ids length must match positions length"
    });
  }
  if (value.node_ids && new Set(value.node_ids).size !== value.node_ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["node_ids"],
      message: "node_ids must be unique"
    });
  }
});
var GetPosition3DSchema = z.object({
  positions: positionArray(3),
  node_ids: finiteIntegerArray.optional(),
  edges: localEdgeArray.optional()
}).strict().superRefine((value, ctx) => {
  if (value.node_ids && value.node_ids.length !== value.positions.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["node_ids"],
      message: "node_ids length must match positions length"
    });
  }
  if (value.node_ids && new Set(value.node_ids).size !== value.node_ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["node_ids"],
      message: "node_ids must be unique"
    });
  }
  for (let index = 0; index < (value.edges?.length ?? 0); index++) {
    const edge = value.edges[index];
    if (edge.source >= value.positions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", index, "source"],
        message: `source index ${edge.source} is outside positions[0..${value.positions.length - 1}]`
      });
      return;
    }
    if (edge.target >= value.positions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", index, "target"],
        message: `target index ${edge.target} is outside positions[0..${value.positions.length - 1}]`
      });
      return;
    }
  }
});
var WeightRecorderEventsSchema = z.object({
  times: nonEmptyFinite,
  weights: nonEmptyFloat32Input,
  senders: finiteIntegerArray.optional(),
  targets: finiteIntegerArray.optional(),
  /** Present on a single series returned by splitWeightRecorderBySynapse. */
  sender: finiteInteger.optional(),
  target: finiteInteger.optional()
}).strict().superRefine((v, ctx) => {
  if (v.times.length !== v.weights.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `times (${v.times.length}) and weights (${v.weights.length}) length mismatch`
    });
  }
  if (v.senders === void 0 !== (v.targets === void 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "senders and targets must either both be present or both be omitted"
    });
  }
  if (v.sender === void 0 !== (v.target === void 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "sender and target must either both be present or both be omitted"
    });
  }
  if (v.sender !== void 0 && v.senders !== void 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "use singular sender/target or parallel senders/targets, not both"
    });
  }
  if (v.senders && v.senders.length !== v.times.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["senders"],
      message: "senders length does not match weight sample count"
    });
  }
  if (v.targets && v.targets.length !== v.times.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targets"],
      message: "targets length does not match weight sample count"
    });
  }
});

// core/nest/adapters.ts
import { z as z2 } from "zod";
var NEST_ADAPTER_LIMITS = Object.freeze({
  maxRootKeys: 32,
  maxConnections: 2e4,
  maxNetworkNodes: 25e3,
  maxSplitSeries: 4096,
  maxUniqueSpikeSenders: 5e4
});
var MultimeterOptionsSchema = z2.object({
  variable: z2.string().max(120).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  units: z2.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional()
}).strict();
var ConnectionOptionsSchema = z2.object({
  weightUnits: z2.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  delayUnits: z2.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional()
}).strict();
var PositionOptionsSchema = z2.object({
  dims: z2.union([z2.literal(2), z2.literal(3)]).default(3),
  coordinateUnits: z2.string().trim().min(1).max(80).regex(SAFE_DISPLAY_STRING_PATTERN)
}).strict();
var WeightOptionsSchema = z2.object({
  weightUnits: z2.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional()
}).strict();
function zerr(error) {
  return {
    ok: false,
    errors: formatValidationIssues(error.issues)
  };
}
function snapshotAdapterRecord(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: true, value: input };
  }
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false, errors: ["(root): device payload must be a plain object"] };
    }
    const keys = Reflect.ownKeys(input);
    if (keys.length > NEST_ADAPTER_LIMITS.maxRootKeys) {
      const samples = keys.slice(0, 8).map((key) => safeDiagnosticText(
        JSON.stringify(typeof key === "string" ? key.slice(0, 60) : "<symbol>"),
        80
      ));
      return {
        ok: false,
        errors: [
          `(root): payload has ${keys.length} fields; at most ${NEST_ADAPTER_LIMITS.maxRootKeys} are allowed (sample: ${samples.join(", ")})`
        ]
      };
    }
    const snapshot = {};
    for (const key of keys) {
      if (typeof key !== "string") {
        return { ok: false, errors: ["(root): symbol fields are not allowed"] };
      }
      if (key.length > 120) {
        return { ok: false, errors: ["(root): field names may contain at most 120 characters"] };
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        return {
          ok: false,
          errors: [`field ${safeDiagnosticText(JSON.stringify(key), 140)} must be an enumerable data property`]
        };
      }
      if (typeof descriptor.value === "string" && descriptor.value.length > 5e3) {
        return {
          ok: false,
          errors: [`field ${safeDiagnosticText(JSON.stringify(key), 140)} has a string value exceeding 5000 characters`]
        };
      }
      Object.defineProperty(snapshot, key, {
        value: descriptor.value,
        enumerable: true,
        writable: true,
        configurable: true
      });
    }
    return { ok: true, value: snapshot };
  } catch {
    return { ok: false, errors: ["(root): device payload could not be safely inspected"] };
  }
}
function preflightArrayFields(input, fields, max) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  try {
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (!descriptor || !("value" in descriptor)) continue;
      const value = descriptor.value;
      let itemCount;
      if (Array.isArray(value)) {
        const length = Object.getOwnPropertyDescriptor(value, "length");
        itemCount = length && "value" in length ? length.value : void 0;
      } else if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        itemCount = value.length;
      }
      if (itemCount !== void 0 && itemCount > max) {
        return {
          ok: false,
          errors: [`${field}: may contain at most ${max} items; received ${itemCount}`]
        };
      }
    }
  } catch {
    return { ok: false, errors: ["(root): device payload could not be safely inspected"] };
  }
  return null;
}
function parseInput(schema, input) {
  try {
    const snapshot = snapshotAdapterRecord(input);
    if (!snapshot.ok) return snapshot;
    const parsed = schema.safeParse(snapshot.value);
    return parsed.success ? { ok: true, data: parsed.data } : zerr(parsed.error);
  } catch {
    return {
      ok: false,
      errors: ["input validation could not safely inspect the device payload"]
    };
  }
}
function denseIndex(senders) {
  const map = /* @__PURE__ */ new Map();
  const dense = new Float32Array(senders.length);
  let next = 0;
  for (let i = 0; i < senders.length; i++) {
    const s = senders[i];
    let idx = map.get(s);
    if (idx === void 0) {
      if (next >= NEST_ADAPTER_LIMITS.maxUniqueSpikeSenders) return null;
      idx = next++;
      map.set(s, idx);
    }
    dense[i] = idx;
  }
  return { dense, map };
}
function spikeRecorderToSceneData(events) {
  const parsed = parseInput(SpikeRecorderEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { senders, times } = parsed.data;
  const indexed = denseIndex(senders);
  if (!indexed) {
    return {
      ok: false,
      errors: [`senders: at most ${NEST_ADAPTER_LIMITS.maxUniqueSpikeSenders} unique senders can be adapted inline`]
    };
  }
  const { dense, map } = indexed;
  return {
    ok: true,
    data: {
      spikeTimes: Float64Array.from(times),
      spikeSenders: dense,
      timeUnits: "ms"
    },
    senderIndexMap: map
  };
}
function multimeterToSceneData(events, opts = {}) {
  const parsedOptions = parseInput(MultimeterOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const parsed = parseInput(MultimeterEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { times, values, sender } = parsed.data;
  const traceTimes = Float64Array.from(times);
  const variable = parsedOptions.data.variable?.trim() || "unknown";
  const isVoltage = /^v_?m$/i.test(variable);
  if (isVoltage) {
    return {
      ok: true,
      data: {
        traceTimes,
        voltageTraces: Float32Array.from(values),
        voltageUnits: parsedOptions.data.units?.trim() || "unknown",
        timeUnits: "ms",
        ...sender !== void 0 ? { traceSender: sender } : {}
      }
    };
  }
  return {
    ok: true,
    data: {
      traceTimes,
      timeUnits: "ms",
      ...sender !== void 0 ? { traceSender: sender } : {},
      analogTraces: {
        values: Float32Array.from(values),
        variable,
        units: parsedOptions.data.units?.trim() || "unknown"
      }
    }
  };
}
function splitMultimeterBySender(events) {
  const parsed = parseInput(MultimeterMultiSenderSchema, events);
  if (!parsed.ok) return parsed;
  const { times, values, senders } = parsed.data;
  const byId = /* @__PURE__ */ new Map();
  for (let i = 0; i < senders.length; i++) {
    let bucket = byId.get(senders[i]);
    if (!bucket) {
      if (byId.size >= NEST_ADAPTER_LIMITS.maxSplitSeries) {
        return {
          ok: false,
          errors: [`senders: at most ${NEST_ADAPTER_LIMITS.maxSplitSeries} sender series can be split inline`]
        };
      }
      bucket = { times: [], values: [] };
      byId.set(senders[i], bucket);
    } else if (times[i] < bucket.times[bucket.times.length - 1]) {
      return {
        ok: false,
        errors: [`sender ${senders[i]}: times are non-monotonic after split`]
      };
    }
    bucket.times.push(times[i]);
    bucket.values.push(values[i]);
  }
  const series = [];
  for (const [sender, b] of byId) {
    series.push({ sender, times: b.times, values: Float32Array.from(b.values) });
  }
  return { ok: true, series };
}
function getConnectionsToSceneData(conns, opts = {}) {
  const sizePreflight = preflightArrayFields(
    conns,
    ["sources", "targets", "weights", "delays"],
    NEST_ADAPTER_LIMITS.maxConnections
  );
  if (sizePreflight) return sizePreflight;
  const parsedOptions = parseInput(ConnectionOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const parsed = parseInput(GetConnectionsSchema, conns);
  if (!parsed.ok) return parsed;
  const { sources, targets, weights, delays } = parsed.data;
  if (sources.length > NEST_ADAPTER_LIMITS.maxConnections || targets.length > NEST_ADAPTER_LIMITS.maxConnections || (weights?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections || (delays?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections) {
    return {
      ok: false,
      errors: [`connections: at most ${NEST_ADAPTER_LIMITS.maxConnections} edges can be adapted inline`]
    };
  }
  const weightUnits = parsedOptions.data.weightUnits?.trim();
  const delayUnits = parsedOptions.data.delayUnits?.trim();
  if (weights && !weightUnits) {
    return {
      ok: false,
      errors: ["weightUnits is required when connection weights are present"]
    };
  }
  if (delays && !delayUnits) {
    return {
      ok: false,
      errors: ["delayUnits is required when connection delays are present"]
    };
  }
  const ids = /* @__PURE__ */ new Set();
  for (let index = 0; index < sources.length; index++) {
    ids.add(sources[index]);
    ids.add(targets[index]);
    if (ids.size > NEST_ADAPTER_LIMITS.maxNetworkNodes) {
      return {
        ok: false,
        errors: [`sources/targets: at most ${NEST_ADAPTER_LIMITS.maxNetworkNodes} unique network nodes can be adapted inline`]
      };
    }
  }
  const networkNodes = Array.from(ids).map((id) => ({
    id,
    label: String(id)
  }));
  const networkEdges = sources.map((source, i) => ({
    source,
    target: targets[i],
    ...weights ? { weight: weights[i] } : {},
    ...delays ? { delay: delays[i] } : {}
  }));
  return {
    ok: true,
    data: {
      networkNodes,
      networkEdges,
      networkLayout: "unpositioned",
      ...weightUnits ? { networkWeightUnits: weightUnits } : {},
      ...delayUnits ? { networkDelayUnits: delayUnits } : {}
    }
  };
}
function getPositionToSceneData(positions, opts) {
  const sizePreflight = preflightArrayFields(
    positions,
    ["positions", "node_ids"],
    NEST_INPUT_LIMITS.maxPositions
  ) ?? preflightArrayFields(
    positions,
    ["edges"],
    NEST_ADAPTER_LIMITS.maxConnections
  );
  if (sizePreflight) return sizePreflight;
  const parsedOptions = parseInput(PositionOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  if (parsedOptions.data.dims === 2) {
    const parsed2 = parseInput(GetPosition2DSchema, positions);
    if (!parsed2.ok) return parsed2;
    return {
      ok: true,
      data: {
        networkLayout: "provided-2d",
        networkCoordinateUnits: parsedOptions.data.coordinateUnits,
        networkNodes: parsed2.data.positions.map(([x, y], i) => ({
          id: parsed2.data.node_ids?.[i] ?? i,
          x,
          y,
          z: 0,
          label: String(parsed2.data.node_ids?.[i] ?? i)
        }))
      }
    };
  }
  const parsed = parseInput(GetPosition3DSchema, positions);
  if (!parsed.ok) return parsed;
  if ((parsed.data.edges?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections) {
    return {
      ok: false,
      errors: [`edges: at most ${NEST_ADAPTER_LIMITS.maxConnections} edges can be adapted inline`]
    };
  }
  return {
    ok: true,
    data: {
      networkLayout: "provided-3d",
      networkCoordinateUnits: parsedOptions.data.coordinateUnits,
      networkNodes: parsed.data.positions.map(([x, y, z3], i) => ({
        id: parsed.data.node_ids?.[i] ?? i,
        x,
        y,
        z: z3,
        label: String(parsed.data.node_ids?.[i] ?? i)
      })),
      networkEdges: parsed.data.edges?.map((e) => ({
        // `edges` indexes the local positions array; translate to supplied
        // global NEST ids so this output joins GetConnections endpoints.
        source: parsed.data.node_ids?.[e.source] ?? e.source,
        target: parsed.data.node_ids?.[e.target] ?? e.target
      }))
    }
  };
}
function weightRecorderToSceneData(events, opts = {}) {
  const parsedOptions = parseInput(WeightOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const weightUnits = parsedOptions.data.weightUnits?.trim();
  if (!weightUnits) {
    return {
      ok: false,
      errors: ["weightUnits is required so a weight trace is never rendered unitless"]
    };
  }
  const parsed = parseInput(WeightRecorderEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { times, weights, senders, targets, sender, target } = parsed.data;
  let pairFromArrays;
  if (senders && targets) {
    const pairs = /* @__PURE__ */ new Set();
    for (let i = 0; i < senders.length; i++) {
      pairs.add(`${senders[i]}\0${targets[i]}`);
      if (pairs.size > 1) {
        return {
          ok: false,
          errors: [
            "weight recorder contains multiple sender/target pairs; call splitWeightRecorderBySynapse before adapting a single trace"
          ]
        };
      }
    }
    pairFromArrays = { sender: senders[0], target: targets[0] };
  }
  for (let i = 1; i < times.length; i++) {
    if (times[i] < times[i - 1]) {
      return {
        ok: false,
        errors: [
          "weight times are non-monotonic; split a multi-synapse recorder before adapting a single trace"
        ]
      };
    }
  }
  return {
    ok: true,
    data: {
      traceTimes: Float64Array.from(times),
      weightSeries: Float32Array.from(weights),
      weightUnits,
      timeUnits: "ms",
      ...sender !== void 0 && target !== void 0 ? { weightSynapse: { sender, target } } : pairFromArrays ? { weightSynapse: pairFromArrays } : {}
    }
  };
}
function splitWeightRecorderBySynapse(events) {
  const parsed = parseInput(WeightRecorderEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { times, weights, senders, targets } = parsed.data;
  if (!senders || !targets) {
    return {
      ok: false,
      errors: ["senders and targets are required to split weight samples by synapse"]
    };
  }
  const buckets = /* @__PURE__ */ new Map();
  for (let i = 0; i < times.length; i++) {
    const key = `${senders[i]}\0${targets[i]}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= NEST_ADAPTER_LIMITS.maxSplitSeries) {
        return {
          ok: false,
          errors: [`senders/targets: at most ${NEST_ADAPTER_LIMITS.maxSplitSeries} synapse series can be split inline`]
        };
      }
      bucket = {
        sender: senders[i],
        target: targets[i],
        times: [],
        weights: []
      };
      buckets.set(key, bucket);
    } else if (times[i] < bucket.times[bucket.times.length - 1]) {
      return {
        ok: false,
        errors: [
          `synapse ${senders[i]}\u2192${targets[i]}: times are non-monotonic after split`
        ]
      };
    }
    bucket.times.push(times[i]);
    bucket.weights.push(weights[i]);
  }
  const series = Array.from(buckets.values(), (bucket) => ({
    sender: bucket.sender,
    target: bucket.target,
    times: bucket.times,
    weights: Float32Array.from(bucket.weights)
  }));
  return { ok: true, series };
}

export {
  routeToScene,
  detectEmptyScene,
  NEST_INPUT_LIMITS,
  SpikeRecorderEventsSchema,
  MultimeterEventsSchema,
  MultimeterMultiSenderSchema,
  GetConnectionsSchema,
  GetPosition2DSchema,
  GetPosition3DSchema,
  WeightRecorderEventsSchema,
  NEST_ADAPTER_LIMITS,
  spikeRecorderToSceneData,
  multimeterToSceneData,
  splitMultimeterBySender,
  getConnectionsToSceneData,
  getPositionToSceneData,
  weightRecorderToSceneData,
  splitWeightRecorderBySynapse
};
//# sourceMappingURL=chunk-X4WFZ7QS.js.map