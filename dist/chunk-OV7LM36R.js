import {
  AdjacencyMatrixParamsSchema,
  CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS,
  CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS,
  ConnectionGraphParamsSchema,
  CorrelogramParamsSchema,
  DelayDistributionParamsSchema,
  DelayMatrixParamsSchema,
  GEOMETRY_MAX_ROUNDOFF_FRACTION,
  HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
  HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
  InDegreeDistributionParamsSchema,
  IsiDistributionParamsSchema,
  JsonParamsSchema,
  KnowledgeGraph3DParamsSchema,
  NEST_DEVICE_FAMILIES,
  NEST_SKILL_REGISTRY,
  OutDegreeDistributionParamsSchema,
  PARAM_LIMITS,
  PopulationRateParamsSchema,
  PositionScopeSchema,
  PsthParamsSchema,
  Rfc3339TimestampSchema,
  SnapshotScopeSchema,
  SpatialMap2DParamsSchema,
  WeightMatrixParamsSchema,
  isSkillId,
  listSkills
} from "./chunk-EAGSNBY3.js";
import {
  PUBLIC_DIAGNOSTIC_LIMITS,
  SAFE_DISPLAY_STRING_PATTERN,
  formatValidationIssues,
  intrinsicTypedArrayLength,
  safeDiagnosticText,
  safeErrorMessage,
  safePrimitiveDiagnostic
} from "./chunk-UEJPZXDX.js";

// core/skills/corpusKnowledgeGraph.ts
import { z } from "zod";
var safeCount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0), "counts must not be negative zero");
var unitInterval = z.number().min(0).max(1).refine((value) => !Object.is(value, -0), "scores must not be negative zero");
var boundedSourceText = (max) => z.string().trim().min(1).max(max);
var nullableAttributeText = z.string().max(200).nullable().optional();
var EngramNodeSchema = z.object({
  id: boundedSourceText(120),
  kind: z.enum(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS),
  label: boundedSourceText(240),
  family: z.string().max(200),
  model_type: nullableAttributeText,
  reproducibility_class: nullableAttributeText,
  brain_region: nullableAttributeText,
  paper_count: safeCount,
  n_neurons: safeCount,
  n_synapses: safeCount,
  pagerank: unitInterval.nullable().optional()
}).strict();
var EngramEdgeSchema = z.object({
  id: boundedSourceText(320).optional(),
  source: boundedSourceText(120),
  target: boundedSourceText(120),
  kind: z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS),
  confidence: unitInterval.nullable().optional()
}).strict();
var EngramGraphSchema = z.object({
  nodes: z.array(EngramNodeSchema).max(PARAM_LIMITS.maxGraphNodes),
  edges: z.array(EngramEdgeSchema).max(PARAM_LIMITS.maxGraphEdges),
  paper_count: safeCount,
  model_count: safeCount,
  family_count: safeCount,
  edge_counts: z.partialRecord(z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS), safeCount),
  kinds: z.array(z.enum(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS)).max(3),
  generated_at: Rfc3339TimestampSchema,
  advisory_only: z.literal(true),
  calibrated_posterior: z.literal(false),
  is_paper_local_evidence: z.literal(false)
}).strict();
var AdapterOptionsSchema = z.object({
  graphId: boundedSourceText(160),
  graphSource: boundedSourceText(200),
  graphSnapshotId: boundedSourceText(200)
}).strict();
var DERIVED_ADVISORY = Object.freeze({
  status: "derived_advisory",
  advisory_only: true,
  is_paper_local_evidence: false,
  calibrated_posterior: false
});
var EDGE_LABELS = Object.freeze({
  cites: "cites",
  same_as: "same as (advisory)",
  variant_of: "variant of (advisory)",
  instantiates: "instantiates",
  belongs_to_family: "belongs to family"
});
function preflightArrayLength(input, field, max) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(input, field);
  if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
  if (!Array.isArray(descriptor.value)) return null;
  const length = Object.getOwnPropertyDescriptor(descriptor.value, "length");
  if (!length || !("value" in length) || !Number.isSafeInteger(length.value)) return null;
  return length.value > max ? `${field} may contain at most ${max} items` : null;
}
function preflightRecordKeyCount(input, field, max) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(input, field);
  if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
  const value = descriptor.value;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  let count = 0;
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue;
    count += 1;
    if (count > max) return `${field} may contain at most ${max} properties`;
  }
  return null;
}
function nodeDetail(node) {
  const fields = [
    node.family && `family ${node.family}`,
    node.model_type && `model type ${node.model_type}`,
    node.reproducibility_class && `reproducibility ${node.reproducibility_class}`,
    node.brain_region && `region ${node.brain_region}`
  ].filter((field) => !!field);
  return fields.length > 0 ? fields.join(" \xB7 ") : void 0;
}
function legacyEdgeId(edge) {
  const field = (value) => `${value.length}:${value}`;
  return `edge:${field(edge.source)}${field(edge.kind)}${field(edge.target)}`;
}
function edgeScore(edge) {
  if (edge.confidence === void 0 || edge.confidence === null) return void 0;
  if (edge.kind === "cites") {
    return {
      kind: "citation_resolution_confidence",
      value: edge.confidence,
      calibrated_posterior: false
    };
  }
  if (edge.kind === "same_as" || edge.kind === "variant_of") {
    return {
      kind: "structural_similarity",
      value: edge.confidence,
      calibrated_posterior: false
    };
  }
  return {
    kind: "unsupported_membership_confidence",
    value: edge.confidence,
    calibrated_posterior: false
  };
}
function summaryErrors(graph) {
  const nodeCounts = /* @__PURE__ */ new Map([
    ["paper", 0],
    ["model", 0],
    ["family", 0]
  ]);
  for (const node of graph.nodes) {
    nodeCounts.set(node.kind, (nodeCounts.get(node.kind) ?? 0) + 1);
  }
  const errors = [];
  for (const [kind, declared] of [
    ["paper", graph.paper_count],
    ["model", graph.model_count],
    ["family", graph.family_count]
  ]) {
    const actual = nodeCounts.get(kind) ?? 0;
    if (declared !== actual) {
      errors.push(`${kind}_count (${declared}) does not match the ${actual} ${kind} nodes`);
    }
  }
  const actualKinds = [...nodeCounts].filter(([, count]) => count > 0).map(([kind]) => kind).sort();
  const declaredKinds = [...graph.kinds].sort();
  if (JSON.stringify(actualKinds) !== JSON.stringify(declaredKinds)) {
    errors.push("kinds does not equal the distinct node-kind set");
  }
  const edgeCounts = /* @__PURE__ */ new Map();
  for (const edge of graph.edges) {
    edgeCounts.set(edge.kind, (edgeCounts.get(edge.kind) ?? 0) + 1);
  }
  for (const kind of CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS) {
    if ((graph.edge_counts[kind] ?? 0) !== (edgeCounts.get(kind) ?? 0)) {
      errors.push("edge_counts does not match the edge assertions");
      break;
    }
  }
  return errors;
}
function adaptEngramCorpusEntityGraph(graph, options) {
  try {
    if (graph === null || typeof graph !== "object" || Array.isArray(graph)) {
      return { ok: false, errors: ["(root): Engram corpus graph must be a plain object"] };
    }
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      return { ok: false, errors: ["(root): adapter options must be a plain object"] };
    }
    const nodeBudget = preflightArrayLength(graph, "nodes", PARAM_LIMITS.maxGraphNodes);
    if (nodeBudget) return { ok: false, errors: [nodeBudget] };
    const edgeBudget = preflightArrayLength(graph, "edges", PARAM_LIMITS.maxGraphEdges);
    if (edgeBudget) return { ok: false, errors: [edgeBudget] };
    const kindsBudget = preflightArrayLength(graph, "kinds", 3);
    if (kindsBudget) return { ok: false, errors: [kindsBudget] };
    const countsBudget = preflightRecordKeyCount(
      graph,
      "edge_counts",
      CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS.length
    );
    if (countsBudget) return { ok: false, errors: [countsBudget] };
    const graphSnapshot = JsonParamsSchema.safeParse(graph);
    if (!graphSnapshot.success) {
      return { ok: false, errors: formatValidationIssues(graphSnapshot.error.issues) };
    }
    const optionsSnapshot = JsonParamsSchema.safeParse(options);
    if (!optionsSnapshot.success) {
      return { ok: false, errors: formatValidationIssues(optionsSnapshot.error.issues) };
    }
    const checkedGraph = EngramGraphSchema.safeParse(graphSnapshot.data);
    if (!checkedGraph.success) {
      return { ok: false, errors: formatValidationIssues(checkedGraph.error.issues) };
    }
    const checkedOptions = AdapterOptionsSchema.safeParse(optionsSnapshot.data);
    if (!checkedOptions.success) {
      return { ok: false, errors: formatValidationIssues(checkedOptions.error.issues) };
    }
    const graphValue = checkedGraph.data;
    const optionValue = checkedOptions.data;
    const summaries = summaryErrors(graphValue);
    if (summaries.length > 0) return { ok: false, errors: summaries };
    const params = {
      graph_id: optionValue.graphId,
      graph_source: optionValue.graphSource,
      graph_snapshot_id: optionValue.graphSnapshotId,
      graph_scope: "corpus_entity",
      generated_at: graphValue.generated_at,
      nodes: graphValue.nodes.map((node) => {
        const detail = nodeDetail(node);
        return {
          id: node.id,
          kind: node.kind,
          label: node.label,
          ...detail ? { detail } : {},
          attributes: {
            family: node.family,
            model_type: node.model_type ?? null,
            reproducibility_class: node.reproducibility_class ?? null,
            brain_region: node.brain_region ?? null,
            paper_count: node.paper_count,
            n_neurons: node.n_neurons,
            n_synapses: node.n_synapses,
            pagerank: node.pagerank ?? null
          },
          epistemic: { ...DERIVED_ADVISORY },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: `snapshot-node:${node.id}`,
            record_id: `node:${node.id}`
          }]
        };
      }),
      edges: graphValue.edges.map((edge) => {
        const id = edge.id ?? legacyEdgeId(edge);
        const score = edgeScore(edge);
        return {
          id,
          source: edge.source,
          target: edge.target,
          kind: edge.kind,
          label: EDGE_LABELS[edge.kind],
          attributes: {},
          epistemic: { ...DERIVED_ADVISORY },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: `snapshot-edge:${id}`,
            record_id: id
          }],
          ...score ? { uncalibrated_score: score } : {}
        };
      })
    };
    const checked = KnowledgeGraph3DParamsSchema.safeParse(params);
    return checked.success ? { ok: true, params: checked.data } : { ok: false, errors: formatValidationIssues(checked.error.issues) };
  } catch (error3) {
    return {
      ok: false,
      errors: [`could not safely inspect Engram corpus graph: ${safeErrorMessage(error3)}`]
    };
  }
}

// core/skills/router.ts
var FAMILY_KIND_TO_SKILL = (() => {
  const output = /* @__PURE__ */ new Map();
  for (const contract of listSkills()) {
    const kind = contract.routerEligibility?.dataShapeKind;
    if (!kind) continue;
    const map = output.get(contract.deviceFamily) ?? /* @__PURE__ */ new Map();
    if (map.has(kind)) {
      throw new Error(`duplicate route dataShape.kind '${kind}' for '${contract.deviceFamily}'`);
    }
    map.set(kind, contract.id);
    output.set(contract.deviceFamily, map);
  }
  return output;
})();
var ROUTING_DISCRIMINATORS = Object.freeze(Object.fromEntries(
  [...FAMILY_KIND_TO_SKILL].map(([family, map]) => [
    family,
    Object.freeze(Object.fromEntries(map))
  ])
));
function familyDisambiguator(family) {
  const map = FAMILY_KIND_TO_SKILL.get(family);
  return map && map.size > 0 ? { field: "dataShape.kind", maps: Object.fromEntries(map) } : void 0;
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
        field: typeof key === "string" ? safePrimitiveDiagnostic(key, PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength) : "(symbol)",
        message: `unknown route input field '${safePrimitiveDiagnostic(key)}'`
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
      message: `unknown device family '${safePrimitiveDiagnostic(deviceFamily)}'`
    };
  }
  const family = deviceFamily;
  const members = FAMILY_MEMBERS.get(family);
  if (!members || members.length === 0) {
    return { ok: false, reason: "unknown_family", field: "deviceFamily" };
  }
  const candidates = members.filter(
    (skill) => NEST_SKILL_REGISTRY[skill].routerEligibility?.bareFamilyCandidate !== false
  );
  const dataShape = raw.dataShape;
  let shapeSkill;
  if (dataShape !== void 0) {
    const kindMap = FAMILY_KIND_TO_SKILL.get(family);
    const disambiguator = familyDisambiguator(family);
    if (!kindMap || !disambiguator) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape",
        candidates: [...candidates],
        message: `dataShape is not defined for device family '${family}'`
      };
    }
    if (dataShape === null || typeof dataShape !== "object" || Array.isArray(dataShape)) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape",
        candidates: [...candidates],
        disambiguateBy: disambiguator,
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
        candidates: [...candidates],
        disambiguateBy: disambiguator,
        message: "dataShape must be a strict plain object containing kind"
      };
    }
    const kindDescriptor = Object.getOwnPropertyDescriptor(dataShape, "kind");
    if (!kindDescriptor || !("value" in kindDescriptor) || !kindDescriptor.enumerable) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape.kind",
        candidates: [...candidates],
        disambiguateBy: disambiguator,
        message: "dataShape.kind must be an enumerable data property"
      };
    }
    const kind = kindDescriptor.value;
    shapeSkill = typeof kind === "string" ? kindMap.get(kind) : void 0;
    if (!shapeSkill) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape.kind",
        candidates: [...candidates],
        disambiguateBy: disambiguator,
        message: `unknown ${family} data kind '${safePrimitiveDiagnostic(kind)}'`
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
        candidates: [...candidates],
        message: `unknown skill discriminator '${safePrimitiveDiagnostic(suppliedSkill)}'`,
        disambiguateBy: {
          field: "skill",
          maps: Object.fromEntries(candidates.map((skill) => [skill, skill]))
        }
      };
    }
    if (!members.includes(suppliedSkill)) {
      return {
        ok: false,
        reason: "skill_family_mismatch",
        field: "skill",
        candidates: [...candidates],
        message: `skill '${suppliedSkill}' does not belong to device family '${family}'`,
        disambiguateBy: {
          field: "skill",
          maps: Object.fromEntries(candidates.map((skill) => [skill, skill]))
        }
      };
    }
    if (shapeSkill && shapeSkill !== suppliedSkill) {
      return {
        ok: false,
        reason: "invalid_discriminator",
        field: "dataShape.kind",
        candidates: [...candidates],
        disambiguateBy: familyDisambiguator(family),
        message: `dataShape resolves to '${shapeSkill}' but skill is '${suppliedSkill}'`
      };
    }
    return resolve(suppliedSkill);
  }
  if (candidates.length === 1) return resolve(candidates[0]);
  if (shapeSkill) return resolve(shapeSkill);
  const disambiguateBy = familyDisambiguator(family) ?? {
    field: "skill",
    maps: Object.fromEntries(candidates.map((s) => [s, s]))
  };
  return {
    ok: false,
    reason: "ambiguous",
    candidates: [...candidates],
    disambiguateBy
  };
}
function routeToScene(input) {
  try {
    return routeToSceneUnsafe(input);
  } catch (error3) {
    return {
      ok: false,
      reason: "invalid_input",
      field: "(input)",
      message: `route input could not be safely inspected: ${safeErrorMessage(error3)}`
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
import { z as z2 } from "zod";
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
    const length = intrinsicTypedArrayLength(value);
    if (length === void 0) return INVALID_ARRAY_INPUT;
    return length <= max ? value : OVERSIZED_ARRAY_INPUT;
  }
  return value;
}
function typedNumbersToArray(value) {
  value = boundedArrayInput(value, NEST_INPUT_LIMITS.maxSamples);
  if (!ArrayBuffer.isView(value) || value instanceof DataView) return value;
  const length = intrinsicTypedArrayLength(value);
  if (length === void 0) return INVALID_ARRAY_INPUT;
  const typed = value;
  const snapshot = new Array(length);
  for (let index = 0; index < length; index++) snapshot[index] = typed[index];
  return snapshot;
}
function numberArray(options = {}) {
  const array = z2.array(z2.unknown()).min(options.min ?? 0, options.minMessage).max(NEST_INPUT_LIMITS.maxSamples).superRefine((values, ctx) => {
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        ctx.addIssue({
          code: z2.ZodIssueCode.custom,
          path: [index],
          message: "expected a finite number (NaN/Inf is unusable evidence)"
        });
        return;
      }
      if (options.float32 && Math.abs(value) > FLOAT32_MAX2) {
        ctx.addIssue({
          code: z2.ZodIssueCode.custom,
          path: [index],
          message: "value is outside the Float32 range used by GPU buffers"
        });
        return;
      }
      if ((options.integerId || options.nonnegativeInteger) && (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0))) {
        ctx.addIssue({
          code: z2.ZodIssueCode.custom,
          path: [index],
          message: options.integerId ? "node/sender ids must be non-negative safe integers" : "counts must be non-negative safe integers"
        });
        return;
      }
    }
  }).transform((values) => values);
  return z2.preprocess(typedNumbersToArray, array);
}
var finiteNumberArray = numberArray();
var float32NumberArray = numberArray({ float32: true });
var nonEmptyFloat32Input = numberArray({
  min: 1,
  minMessage: "empty array \u2014 no samples to render",
  float32: true
});
var finiteIntegerArray = numberArray({ integerId: true });
var nonEmptyNonnegativeSafeIntegerArray = numberArray({
  min: 1,
  minMessage: "histogram must contain at least one bin",
  nonnegativeInteger: true
});
var nonEmptyFiniteIntegerArray = numberArray({
  min: 1,
  minMessage: "no senders",
  integerId: true
});
var finiteInteger = z2.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0), "ids must not be negative zero");
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
  return z2.preprocess(
    (value) => boundedArrayInput(value, NEST_INPUT_LIMITS.maxPositions),
    z2.array(z2.unknown()).min(1, "no positions").max(NEST_INPUT_LIMITS.maxPositions).transform((positions, ctx) => {
      const output = [];
      for (let index = 0; index < positions.length; index++) {
        const position = positions[index];
        if (!Array.isArray(position) || position.length !== dimensions) {
          ctx.addIssue({
            code: z2.ZodIssueCode.custom,
            path: [index],
            message: `position must be an exact ${dimensions}D coordinate tuple`
          });
          return z2.NEVER;
        }
        const tuple = [];
        for (let axis = 0; axis < dimensions; axis++) {
          const descriptor = Object.getOwnPropertyDescriptor(position, String(axis));
          const value = descriptor && "value" in descriptor ? descriptor.value : void 0;
          if (!descriptor || !descriptor.enumerable || typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX2) {
            ctx.addIssue({
              code: z2.ZodIssueCode.custom,
              path: [index, axis],
              message: "coordinate must be a finite Float32-range number"
            });
            return z2.NEVER;
          }
          tuple.push(value);
        }
        output.push(tuple);
      }
      return output;
    })
  );
}
var localEdgeArray = z2.preprocess(
  (value) => boundedArrayInput(value, NEST_INPUT_LIMITS.maxSamples),
  z2.array(z2.unknown()).max(NEST_INPUT_LIMITS.maxSamples).transform((edges, ctx) => {
    const output = [];
    for (let index = 0; index < edges.length; index++) {
      const edge = edges[index];
      if (edge === null || typeof edge !== "object" || Array.isArray(edge) || Reflect.ownKeys(edge).some((key) => key !== "source" && key !== "target")) {
        ctx.addIssue({
          code: z2.ZodIssueCode.custom,
          path: [index],
          message: "edge must be a strict {source,target} object"
        });
        return z2.NEVER;
      }
      const source = Object.getOwnPropertyDescriptor(edge, "source");
      const target = Object.getOwnPropertyDescriptor(edge, "target");
      const sourceValue = source && "value" in source ? source.value : void 0;
      const targetValue = target && "value" in target ? target.value : void 0;
      if (!source?.enumerable || !target?.enumerable || !finiteInteger.safeParse(sourceValue).success || !finiteInteger.safeParse(targetValue).success) {
        ctx.addIssue({
          code: z2.ZodIssueCode.custom,
          path: [index],
          message: "edge source/target must be non-negative safe integers"
        });
        return z2.NEVER;
      }
      output.push({ source: sourceValue, target: targetValue });
    }
    return output;
  })
);
var SpikeRecorderEventsSchema = z2.object({
  senders: finiteIntegerArray,
  // becomes denseIndex Map keys — reject NaN/Inf
  times: finiteNumberArray
}).strict().superRefine((v, ctx) => {
  if (v.senders.length !== v.times.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: `senders (${v.senders.length}) and times (${v.times.length}) length mismatch`
    });
  }
});
var MultimeterEventsSchema = z2.object({
  times: nonEmptyFinite,
  values: nonEmptyFloat32Input,
  /** Present on a series returned by splitMultimeterBySender. */
  sender: finiteInteger.optional()
}).strict().superRefine((v, ctx) => {
  if (v.times.length !== v.values.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: `times (${v.times.length}) and values (${v.values.length}) length mismatch`
    });
  }
  for (let i = 1; i < v.times.length; i++) {
    if (v.times[i] <= v.times[i - 1]) {
      ctx.addIssue({
        code: z2.ZodIssueCode.custom,
        message: "multimeter times must be strictly increasing \u2014 likely multiple senders flattened together; split per sender before adapting"
      });
      break;
    }
  }
});
var MultimeterMultiSenderSchema = z2.object({
  times: nonEmptyFinite,
  values: nonEmptyFloat32Array,
  senders: nonEmptyFiniteIntegerArray
}).strict().superRefine((v, ctx) => {
  const n = v.times.length;
  if (v.values.length !== n || v.senders.length !== n) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "times, values and senders must be the same length"
    });
  }
});
var GetConnectionsSchema = z2.object({
  sources: nonEmptyFiniteIdArray,
  targets: nonEmptyFiniteIdArray,
  weights: float32NumberArray.optional(),
  delays: float32NumberArray.optional()
}).strict().superRefine((v, ctx) => {
  if (v.sources.length !== v.targets.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: `sources (${v.sources.length}) and targets (${v.targets.length}) length mismatch`
    });
  }
  if (v.weights && v.weights.length !== v.sources.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "weights length does not match connection count"
    });
  }
  if (v.delays && v.delays.length !== v.sources.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "delays length does not match connection count"
    });
  }
  if (v.delays) {
    for (let index = 0; index < v.delays.length; index++) {
      if (v.delays[index] <= 0) {
        ctx.addIssue({
          code: z2.ZodIssueCode.custom,
          path: ["delays", index],
          message: "synaptic delays must be strictly positive durations"
        });
        break;
      }
    }
  }
});
var GetPosition2DSchema = z2.object({
  positions: positionArray(2),
  node_ids: finiteIntegerArray.optional()
}).strict().superRefine((value, ctx) => {
  if (value.node_ids && value.node_ids.length !== value.positions.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      path: ["node_ids"],
      message: "node_ids length must match positions length"
    });
  }
  if (value.node_ids && new Set(value.node_ids).size !== value.node_ids.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      path: ["node_ids"],
      message: "node_ids must be unique"
    });
  }
});
var GetPosition3DSchema = z2.object({
  positions: positionArray(3),
  node_ids: finiteIntegerArray.optional(),
  edges: localEdgeArray.optional()
}).strict().superRefine((value, ctx) => {
  if (value.node_ids && value.node_ids.length !== value.positions.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      path: ["node_ids"],
      message: "node_ids length must match positions length"
    });
  }
  if (value.node_ids && new Set(value.node_ids).size !== value.node_ids.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      path: ["node_ids"],
      message: "node_ids must be unique"
    });
  }
  for (let index = 0; index < (value.edges?.length ?? 0); index++) {
    const edge = value.edges[index];
    if (edge.source >= value.positions.length) {
      ctx.addIssue({
        code: z2.ZodIssueCode.custom,
        path: ["edges", index, "source"],
        message: `source index ${edge.source} is outside positions[0..${value.positions.length - 1}]`
      });
      return;
    }
    if (edge.target >= value.positions.length) {
      ctx.addIssue({
        code: z2.ZodIssueCode.custom,
        path: ["edges", index, "target"],
        message: `target index ${edge.target} is outside positions[0..${value.positions.length - 1}]`
      });
      return;
    }
  }
});
var WeightRecorderEventsSchema = z2.object({
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
      code: z2.ZodIssueCode.custom,
      message: `times (${v.times.length}) and weights (${v.weights.length}) length mismatch`
    });
  }
  if (v.senders === void 0 !== (v.targets === void 0)) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "senders and targets must either both be present or both be omitted"
    });
  }
  if (v.sender === void 0 !== (v.target === void 0)) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "sender and target must either both be present or both be omitted"
    });
  }
  if (v.sender !== void 0 && v.senders !== void 0) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "use singular sender/target or parallel senders/targets, not both"
    });
  }
  if (v.senders && v.senders.length !== v.times.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      path: ["senders"],
      message: "senders length does not match weight sample count"
    });
  }
  if (v.targets && v.targets.length !== v.times.length) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      path: ["targets"],
      message: "targets length does not match weight sample count"
    });
  }
});
var CorrelationDetectorStatusSchema = z2.object({
  delta_tau: z2.number().finite().positive(),
  tau_max: z2.number().finite().positive(),
  Tstart: z2.number().finite(),
  Tstop: z2.number().finite(),
  count_histogram: nonEmptyNonnegativeSafeIntegerArray.optional(),
  histogram: nonEmptyFloat32Input.optional()
}).strict().superRefine((value, ctx) => {
  if (!(value.Tstop > value.Tstart)) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      path: ["Tstop"],
      message: "Tstop must be greater than Tstart"
    });
  }
  if (value.count_histogram === void 0 && value.histogram === void 0) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "count_histogram or histogram is required"
    });
  }
});

// core/nest/adapters.ts
import { z as z3 } from "zod";

// core/nest/safeInput.ts
var NEST_SAFE_INPUT_LIMITS = Object.freeze({
  maxDepth: 16,
  maxNodes: 5e5,
  maxObjectKeys: 64,
  maxRootKeys: 32,
  maxFieldNameLength: 120,
  maxStringLength: 5e3,
  maxProjectedSourceKeys: 512
});
function fail(path, message) {
  return { ok: false, errors: [`${path}: ${message}`] };
}
function snapshotNestInput(input) {
  const ancestors = /* @__PURE__ */ new WeakSet();
  let visited = 0;
  function visit(value, path, depth) {
    visited += 1;
    if (visited > NEST_SAFE_INPUT_LIMITS.maxNodes) {
      return fail(path, `input exceeds ${NEST_SAFE_INPUT_LIMITS.maxNodes} values`);
    }
    if (depth > NEST_SAFE_INPUT_LIMITS.maxDepth) {
      return fail(path, `input nesting exceeds ${NEST_SAFE_INPUT_LIMITS.maxDepth} levels`);
    }
    if (value === null || typeof value === "boolean" || typeof value === "number") {
      return { ok: true, value };
    }
    if (typeof value === "string") {
      return value.length <= NEST_SAFE_INPUT_LIMITS.maxStringLength ? { ok: true, value } : fail(path, `string exceeds ${NEST_SAFE_INPUT_LIMITS.maxStringLength} characters`);
    }
    if (typeof value !== "object") return { ok: true, value };
    if (ArrayBuffer.isView(value)) {
      if (value instanceof DataView) {
        return fail(path, "DataView inputs are not supported");
      }
      try {
        const typed = value;
        const length = intrinsicTypedArrayLength(value);
        if (length === void 0) {
          return fail(path, "typed array could not be safely inspected");
        }
        if (length > NEST_SAFE_INPUT_LIMITS.maxNodes - visited) {
          return fail(path, `input exceeds ${NEST_SAFE_INPUT_LIMITS.maxNodes} values`);
        }
        const clone = new Array(length);
        for (let index = 0; index < length; index++) {
          visited += 1;
          if (visited > NEST_SAFE_INPUT_LIMITS.maxNodes) {
            return fail(path, `input exceeds ${NEST_SAFE_INPUT_LIMITS.maxNodes} values`);
          }
          clone[index] = typed[index];
        }
        return { ok: true, value: clone };
      } catch {
        return fail(path, "typed array could not be safely inspected");
      }
    }
    const object = value;
    if (ancestors.has(object)) return fail(path, "circular input reference");
    ancestors.add(object);
    try {
      if (Array.isArray(value)) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
        if (!lengthDescriptor || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
          return fail(path, "array must have an ordinary non-negative length");
        }
        const length = lengthDescriptor.value;
        if (length > NEST_SAFE_INPUT_LIMITS.maxNodes - visited) {
          return fail(path, `input exceeds ${NEST_SAFE_INPUT_LIMITS.maxNodes} values`);
        }
        const keys2 = Reflect.ownKeys(value);
        if (keys2.length !== length + 1) {
          return fail(path, "arrays must be dense and carry no named or symbol properties");
        }
        const clone2 = new Array(length);
        for (let index = 0; index < length; index++) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
          if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
            return fail(
              `${path}.${index}`,
              "array entries must be enumerable data properties, not accessors"
            );
          }
          const nested = visit(descriptor.value, `${path}.${index}`, depth + 1);
          if (!nested.ok) return nested;
          clone2[index] = nested.value;
        }
        return { ok: true, value: clone2 };
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail(path, "input must contain plain objects, arrays, or numeric typed arrays");
      }
      const keys = Reflect.ownKeys(value);
      const maximumKeys = depth === 0 ? NEST_SAFE_INPUT_LIMITS.maxRootKeys : NEST_SAFE_INPUT_LIMITS.maxObjectKeys;
      if (keys.length > maximumKeys) {
        const samples = keys.slice(0, 8).map((key) => safeDiagnosticText(
          JSON.stringify(typeof key === "string" ? key.slice(0, 60) : "<symbol>"),
          80
        ));
        return fail(
          path,
          `object has ${keys.length} fields; at most ${maximumKeys} are allowed (sample: ${samples.join(", ")})`
        );
      }
      const clone = {};
      for (const key of keys) {
        if (typeof key !== "string") return fail(path, "symbol fields are not allowed");
        if (key.length > NEST_SAFE_INPUT_LIMITS.maxFieldNameLength) {
          return fail(path, `field names may contain at most ${NEST_SAFE_INPUT_LIMITS.maxFieldNameLength} characters`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          return fail(
            `${path}.${safeDiagnosticText(JSON.stringify(key), 140)}`,
            "field must be an enumerable data property, not an accessor"
          );
        }
        const nested = visit(descriptor.value, `${path}.${key}`, depth + 1);
        if (!nested.ok) return nested;
        Object.defineProperty(clone, key, {
          value: nested.value,
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
      return { ok: true, value: clone };
    } catch {
      return fail(path, "input could not be safely inspected");
    } finally {
      ancestors.delete(object);
    }
  }
  try {
    return visit(input, "(root)", 0);
  } catch {
    return fail("(root)", "input could not be safely inspected");
  }
}
function parseNestInput(schema, input) {
  try {
    const snapshot = snapshotNestInput(input);
    if (!snapshot.ok) return snapshot;
    const parsed = schema.safeParse(snapshot.value);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, errors: formatValidationIssues(parsed.error.issues) };
  } catch {
    return {
      ok: false,
      errors: ["input validation could not safely inspect the NEST payload"]
    };
  }
}
function projectNestInputFields(input, fields) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return { ok: false, errors: ["(root): NEST status must be a plain object"] };
    }
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false, errors: ["(root): NEST status must be a plain object"] };
    }
    const sourceKeys = Reflect.ownKeys(input);
    if (sourceKeys.length > NEST_SAFE_INPUT_LIMITS.maxProjectedSourceKeys) {
      return {
        ok: false,
        errors: [
          `(root): NEST status exceeds ${NEST_SAFE_INPUT_LIMITS.maxProjectedSourceKeys} fields`
        ]
      };
    }
    if (sourceKeys.some((key) => typeof key !== "string")) {
      return { ok: false, errors: ["(root): NEST status may not contain symbol fields"] };
    }
    const present = new Set(sourceKeys);
    const projection = {};
    for (const field of fields) {
      if (!present.has(field)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        return {
          ok: false,
          errors: [
            `${field}: selected NEST status fields must be enumerable data properties, not accessors`
          ]
        };
      }
      Object.defineProperty(projection, field, {
        value: descriptor.value,
        enumerable: true,
        writable: true,
        configurable: true
      });
    }
    return { ok: true, data: projection };
  } catch {
    return { ok: false, errors: ["(root): NEST status could not be safely projected"] };
  }
}

// core/nest/adapters.ts
var NEST_ADAPTER_LIMITS = Object.freeze({
  maxRootKeys: 32,
  maxConnections: 2e4,
  maxNetworkNodes: 25e3,
  maxSplitSeries: 4096,
  maxUniqueSpikeSenders: 5e4
});
var MultimeterOptionsSchema = z3.object({
  variable: z3.string().max(120).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  units: z3.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional()
}).strict();
var ConnectionOptionsSchema = z3.object({
  weightUnits: z3.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  delayUnits: z3.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional()
}).strict();
var PositionOptionsSchema = z3.object({
  dims: z3.union([z3.literal(2), z3.literal(3)]).default(3),
  coordinateUnits: z3.string().trim().min(1).max(80).regex(SAFE_DISPLAY_STRING_PATTERN)
}).strict();
var WeightOptionsSchema = z3.object({
  weightUnits: z3.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional()
}).strict();
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
        itemCount = intrinsicTypedArrayLength(value);
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
  const parsed = parseNestInput(SpikeRecorderEventsSchema, events);
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
  const parsedOptions = parseNestInput(MultimeterOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const parsed = parseNestInput(MultimeterEventsSchema, events);
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
  const parsed = parseNestInput(MultimeterMultiSenderSchema, events);
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
    } else if (times[i] <= bucket.times[bucket.times.length - 1]) {
      return {
        ok: false,
        errors: [`sender ${senders[i]}: times must be strictly increasing after split`]
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
  const parsedOptions = parseNestInput(ConnectionOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const parsed = parseNestInput(GetConnectionsSchema, conns);
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
  const parsedOptions = parseNestInput(PositionOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  if (parsedOptions.data.dims === 2) {
    const parsed2 = parseNestInput(GetPosition2DSchema, positions);
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
  const parsed = parseNestInput(GetPosition3DSchema, positions);
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
      networkNodes: parsed.data.positions.map(([x, y, z6], i) => ({
        id: parsed.data.node_ids?.[i] ?? i,
        x,
        y,
        z: z6,
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
  const parsedOptions = parseNestInput(WeightOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const weightUnits = parsedOptions.data.weightUnits?.trim();
  if (!weightUnits) {
    return {
      ok: false,
      errors: ["weightUnits is required so a weight trace is never rendered unitless"]
    };
  }
  const parsed = parseNestInput(WeightRecorderEventsSchema, events);
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
    if (times[i] <= times[i - 1]) {
      return {
        ok: false,
        errors: [
          "weight times must be strictly increasing; split a multi-synapse recorder before adapting a single trace"
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
  const parsed = parseNestInput(WeightRecorderEventsSchema, events);
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
    } else if (times[i] <= bucket.times[bucket.times.length - 1]) {
      return {
        ok: false,
        errors: [
          `synapse ${senders[i]}\u2192${targets[i]}: times must be strictly increasing after split`
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

// core/nest/analysis.ts
import { z as z4 } from "zod";
var NEST_ANALYSIS_LIMITS = Object.freeze({
  maxPopulations: PARAM_LIMITS.maxSeries,
  maxSelectedSenders: 5e4,
  maxTrials: 1e4,
  maxTotalEvents: NEST_INPUT_LIMITS.maxSamples,
  maxOutputBins: PARAM_LIMITS.maxSamples,
  maxPopulationBinCells: 1e5
});
var finite = z4.number().finite();
var senderId = z4.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0), "sender ids must not be negative zero");
var displayText = (maximum) => z4.string().trim().min(1).max(maximum).regex(SAFE_DISPLAY_STRING_PATTERN).transform((value) => value.trim());
var PopulationRateOptionsSchema = z4.object({
  startMs: finite,
  stopMs: finite,
  binWidthMs: finite.positive(),
  populations: z4.array(z4.object({
    id: displayText(120),
    label: displayText(240),
    senderIds: z4.array(senderId).min(1).max(NEST_ANALYSIS_LIMITS.maxSelectedSenders)
  }).strict()).min(1).max(NEST_ANALYSIS_LIMITS.maxPopulations),
  unassignedPolicy: z4.enum(["reject", "ignore"])
}).strict();
var IsiOptionsSchema = z4.object({
  senderIds: z4.array(senderId).min(1).max(NEST_ANALYSIS_LIMITS.maxSelectedSenders),
  binWidthMs: finite.positive(),
  maxIntervalMs: finite.positive(),
  normalization: z4.enum(["count", "probability", "probability_density"]),
  intervalScope: z4.literal("per_sender").default("per_sender")
}).strict();
var PsthOptionsSchema = z4.object({
  alignmentTimesMs: z4.array(finite).min(1).max(NEST_ANALYSIS_LIMITS.maxTrials),
  windowMs: z4.tuple([finite, finite]),
  binWidthMs: finite.positive(),
  senderIds: z4.array(senderId).min(1).max(NEST_ANALYSIS_LIMITS.maxSelectedSenders),
  normalization: z4.enum(["count", "count_per_trial", "rate_hz"]),
  alignmentEvent: displayText(240)
}).strict();
var CorrelationDetectorOptionsSchema = z4.object({
  measurement: z4.enum(["count_histogram", "histogram"]),
  referenceLabel: displayText(240),
  targetLabel: displayText(240),
  zeroLagPolicy: z4.enum(["included", "excluded_self_pairs"]),
  weightedUnits: displayText(80).optional()
}).strict();
function error(message) {
  return { ok: false, errors: [message] };
}
function validateOutput(schema, params) {
  const parsed = schema.safeParse(params);
  return parsed.success ? { ok: true, params: parsed.data } : { ok: false, errors: formatValidationIssues(parsed.error.issues) };
}
function requireUniqueIds(values, path) {
  const ids = /* @__PURE__ */ new Set();
  for (let index = 0; index < values.length; index++) {
    if (ids.has(values[index])) {
      return error(`${path}.${index}: duplicate sender id ${values[index]}`);
    }
    ids.add(values[index]);
  }
  return { ok: true, ids };
}
function exactBinCount(start, stop, width, path) {
  if (!(stop > start)) return error(`${path}: stop must be greater than start`);
  const ratio = (stop - start) / width;
  const count = Math.round(ratio);
  const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE + HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.max(Math.abs(ratio), Math.abs(count));
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ratio) || Math.abs(ratio - count) > tolerance) {
    return error(`${path}: window duration must be an exact positive integer multiple of bin width`);
  }
  if (count > NEST_ANALYSIS_LIMITS.maxOutputBins) {
    return error(`${path}: at most ${NEST_ANALYSIS_LIMITS.maxOutputBins} bins are allowed`);
  }
  return { ok: true, count };
}
function binCenters(start, width, count) {
  const centers = new Array(count);
  for (let index = 0; index < count; index++) {
    centers[index] = start + (index + 0.5) * width;
  }
  return centers;
}
var BIN_INDEX_OUTSIDE = -1;
var BIN_INDEX_INDETERMINATE = -2;
var BIN_BOUNDARY_ROUNDOFF_ULPS = 16;
var MAX_BIN_BOUNDARY_SNAP_DISTANCE = GEOMETRY_MAX_ROUNDOFF_FRACTION;
function binIndex(time, start, width, count, arithmeticScale = Math.max(Math.abs(time), Math.abs(start))) {
  let scaled = (time - start) / width;
  if (!Number.isFinite(scaled)) return BIN_INDEX_INDETERMINATE;
  const nearest = Math.round(scaled);
  const operationScale = Math.max(
    1,
    Math.abs(time),
    Math.abs(start),
    Math.abs(width),
    Math.abs(arithmeticScale)
  );
  const tolerance = BIN_BOUNDARY_ROUNDOFF_ULPS * Number.EPSILON * (operationScale / Math.abs(width) + Math.max(1, Math.abs(scaled)));
  if (scaled < -tolerance || scaled > count + tolerance) {
    return BIN_INDEX_OUTSIDE;
  }
  if (Math.abs(scaled - nearest) <= tolerance) {
    if (tolerance > MAX_BIN_BOUNDARY_SNAP_DISTANCE) {
      return BIN_INDEX_INDETERMINATE;
    }
    scaled = nearest;
  }
  const index = Math.floor(scaled);
  return index >= 0 && index < count ? index === 0 ? 0 : index : BIN_INDEX_OUTSIDE;
}
function totalEventCount(trials) {
  let total = 0;
  for (let index = 0; index < trials.length; index++) {
    total += trials[index].times.length;
    if (!Number.isSafeInteger(total) || total > NEST_ANALYSIS_LIMITS.maxTotalEvents) {
      return error(
        `trials.${index}: aggregate event count exceeds ${NEST_ANALYSIS_LIMITS.maxTotalEvents}`
      );
    }
  }
  return { ok: true };
}
function spikeRecorderToPopulationRateParams(events, options) {
  try {
    const parsedEvents = parseNestInput(SpikeRecorderEventsSchema, events);
    if (!parsedEvents.ok) return parsedEvents;
    const parsedOptions = parseNestInput(PopulationRateOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    const geometry = exactBinCount(
      opts.startMs,
      opts.stopMs,
      opts.binWidthMs,
      "population-rate window"
    );
    if (!geometry.ok) return geometry;
    if (geometry.count * opts.populations.length > NEST_ANALYSIS_LIMITS.maxPopulationBinCells) {
      return error(
        `population-rate output exceeds ${NEST_ANALYSIS_LIMITS.maxPopulationBinCells} population\xD7bin cells`
      );
    }
    const seriesIds = /* @__PURE__ */ new Set();
    const senderToSeries = /* @__PURE__ */ new Map();
    for (let populationIndex = 0; populationIndex < opts.populations.length; populationIndex++) {
      const population = opts.populations[populationIndex];
      if (seriesIds.has(population.id)) {
        return error(`populations.${populationIndex}.id: duplicate population id '${population.id}'`);
      }
      seriesIds.add(population.id);
      const unique = requireUniqueIds(
        population.senderIds,
        `populations.${populationIndex}.senderIds`
      );
      if (!unique.ok) return unique;
      for (const sender of unique.ids) {
        const existing = senderToSeries.get(sender);
        if (existing !== void 0) {
          return error(
            `populations.${populationIndex}.senderIds: sender ${sender} overlaps population '${opts.populations[existing].id}'`
          );
        }
        senderToSeries.set(sender, populationIndex);
      }
    }
    const spikeCounts = opts.populations.map(
      () => new Array(geometry.count).fill(0)
    );
    for (let index = 0; index < parsedEvents.data.times.length; index++) {
      const time = parsedEvents.data.times[index];
      if (time < opts.startMs || time >= opts.stopMs) continue;
      const populationIndex = senderToSeries.get(parsedEvents.data.senders[index]);
      if (populationIndex === void 0) {
        if (opts.unassignedPolicy === "reject") {
          return error(
            `events.senders.${index}: sender ${parsedEvents.data.senders[index]} is unassigned inside the analysis window`
          );
        }
        continue;
      }
      const targetBin = binIndex(time, opts.startMs, opts.binWidthMs, geometry.count);
      if (targetBin < 0) {
        return error(`events.times.${index}: event could not be assigned to the declared bin geometry`);
      }
      spikeCounts[populationIndex][targetBin] += 1;
    }
    const params = {
      bin_centers_ms: binCenters(opts.startMs, opts.binWidthMs, geometry.count),
      bin_width_ms: opts.binWidthMs,
      window_start_ms: opts.startMs,
      window_stop_ms: opts.stopMs,
      series: opts.populations.map((population, populationIndex) => {
        const denominator = population.senderIds.length * opts.binWidthMs;
        const rates = spikeCounts[populationIndex].map((count) => {
          let rate = count * 1e3;
          rate /= denominator;
          return rate;
        });
        return {
          id: population.id,
          label: population.label,
          recorded_sender_count: population.senderIds.length,
          spike_counts: spikeCounts[populationIndex],
          rates_hz: rates
        };
      }),
      normalization: "mean_per_recorded_sender_hz",
      aggregation: "selected_senders",
      binning: "left_closed_right_open"
    };
    return validateOutput(PopulationRateParamsSchema, params);
  } catch {
    return error("population-rate analysis could not safely process the input");
  }
}
function spikeRecorderToIsiParams(events, options) {
  try {
    const parsedEvents = parseNestInput(SpikeRecorderEventsSchema, events);
    if (!parsedEvents.ok) return parsedEvents;
    const parsedOptions = parseNestInput(IsiOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    const selected = requireUniqueIds(opts.senderIds, "senderIds");
    if (!selected.ok) return selected;
    const geometry = exactBinCount(0, opts.maxIntervalMs, opts.binWidthMs, "ISI range");
    if (!geometry.ok) return geometry;
    const bySender = /* @__PURE__ */ new Map();
    for (const sender of opts.senderIds) bySender.set(sender, []);
    for (let index = 0; index < parsedEvents.data.times.length; index++) {
      const bucket = bySender.get(parsedEvents.data.senders[index]);
      if (bucket) bucket.push(parsedEvents.data.times[index]);
    }
    const counts = new Array(geometry.count).fill(0);
    let intervalCount = 0;
    for (const [sender, times] of bySender) {
      times.sort((left, right) => left - right);
      for (let index = 1; index < times.length; index++) {
        const previousTime = times[index - 1];
        const currentTime = times[index];
        const interval = currentTime - previousTime;
        if (!(interval >= 0 && interval < opts.maxIntervalMs)) {
          return error(
            `sender ${sender}: consecutive interval ${interval} ms lies outside [0, ${opts.maxIntervalMs})`
          );
        }
        const targetBin = binIndex(
          interval,
          0,
          opts.binWidthMs,
          geometry.count,
          Math.max(Math.abs(previousTime), Math.abs(currentTime))
        );
        if (targetBin === BIN_INDEX_INDETERMINATE) {
          return error(`sender ${sender}: interval arithmetic cannot resolve a bin boundary`);
        }
        if (targetBin === BIN_INDEX_OUTSIDE) {
          return error(`sender ${sender}: interval could not be assigned to the declared bins`);
        }
        counts[targetBin] += 1;
        intervalCount += 1;
      }
    }
    if (intervalCount === 0 && opts.normalization !== "count") {
      return error("ISI probability normalization requires at least one consecutive interval");
    }
    const values = counts.map((count) => {
      switch (opts.normalization) {
        case "count":
          return count;
        case "probability":
          return count / intervalCount;
        case "probability_density":
          return count / intervalCount / opts.binWidthMs;
      }
    });
    const valueUnits = opts.normalization === "count" ? "count" : opts.normalization === "probability" ? "probability" : "1/ms";
    return validateOutput(IsiDistributionParamsSchema, {
      bin_centers_ms: binCenters(0, opts.binWidthMs, geometry.count),
      values,
      bin_width_ms: opts.binWidthMs,
      normalization: opts.normalization,
      value_units: valueUnits,
      interval_scope: "per_sender"
    });
  } catch {
    return error("ISI analysis could not safely process the input");
  }
}
function spikeTrialsToPsthParams(trials, options) {
  try {
    const TrialArraySchema = z4.array(SpikeRecorderEventsSchema).min(1).max(NEST_ANALYSIS_LIMITS.maxTrials);
    const parsedTrials = parseNestInput(TrialArraySchema, trials);
    if (!parsedTrials.ok) return parsedTrials;
    const total = totalEventCount(parsedTrials.data);
    if (!total.ok) return total;
    const parsedOptions = parseNestInput(PsthOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    if (opts.alignmentTimesMs.length !== parsedTrials.data.length) {
      return error(
        `alignmentTimesMs length (${opts.alignmentTimesMs.length}) must match trial count (${parsedTrials.data.length})`
      );
    }
    const selected = requireUniqueIds(opts.senderIds, "senderIds");
    if (!selected.ok) return selected;
    const geometry = exactBinCount(
      opts.windowMs[0],
      opts.windowMs[1],
      opts.binWidthMs,
      "PSTH window"
    );
    if (!geometry.ok) return geometry;
    const counts = new Array(geometry.count).fill(0);
    for (let trialIndex = 0; trialIndex < parsedTrials.data.length; trialIndex++) {
      const trial = parsedTrials.data[trialIndex];
      const alignment = opts.alignmentTimesMs[trialIndex];
      for (let eventIndex = 0; eventIndex < trial.times.length; eventIndex++) {
        if (!selected.ids.has(trial.senders[eventIndex])) continue;
        const relativeTime = trial.times[eventIndex] - alignment;
        if (!Number.isFinite(relativeTime)) {
          return error(`trials.${trialIndex}.times.${eventIndex}: aligned time is not finite`);
        }
        const targetBin = binIndex(
          relativeTime,
          opts.windowMs[0],
          opts.binWidthMs,
          geometry.count,
          Math.max(Math.abs(trial.times[eventIndex]), Math.abs(alignment))
        );
        if (targetBin === BIN_INDEX_INDETERMINATE) {
          return error(
            `trials.${trialIndex}.times.${eventIndex}: aligned-time arithmetic cannot resolve a bin boundary`
          );
        }
        if (targetBin === BIN_INDEX_OUTSIDE) continue;
        counts[targetBin] += 1;
      }
    }
    const trialCount = parsedTrials.data.length;
    const values = counts.map((count) => {
      switch (opts.normalization) {
        case "count":
          return count;
        case "count_per_trial":
          return count / trialCount;
        case "rate_hz": {
          let rate = count * 1e3;
          rate /= trialCount * opts.binWidthMs;
          return rate;
        }
      }
    });
    const valueUnits = opts.normalization === "count" ? "count" : opts.normalization === "count_per_trial" ? "count/trial" : "Hz";
    return validateOutput(PsthParamsSchema, {
      bin_centers_ms: binCenters(opts.windowMs[0], opts.binWidthMs, geometry.count),
      values,
      bin_width_ms: opts.binWidthMs,
      normalization: opts.normalization,
      value_units: valueUnits,
      trial_count: trialCount,
      alignment_event: opts.alignmentEvent,
      aggregation: "selected_senders_per_trial"
    });
  } catch {
    return error("PSTH analysis could not safely process the input");
  }
}
function correlationDetectorToCorrelogramParams(status, options) {
  try {
    const projectedStatus = projectNestInputFields(status, [
      "delta_tau",
      "tau_max",
      "Tstart",
      "Tstop",
      "count_histogram",
      "histogram"
    ]);
    if (!projectedStatus.ok) return projectedStatus;
    const parsedStatus = parseNestInput(
      CorrelationDetectorStatusSchema,
      projectedStatus.data
    );
    if (!parsedStatus.ok) return parsedStatus;
    const parsedOptions = parseNestInput(CorrelationDetectorOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    if (opts.measurement === "histogram" && opts.weightedUnits === void 0) {
      return error("weightedUnits is required when measurement is histogram");
    }
    if (opts.measurement === "count_histogram" && opts.weightedUnits !== void 0) {
      return error("weightedUnits is only valid when measurement is histogram");
    }
    const values = parsedStatus.data[opts.measurement];
    if (!values) return error(`${opts.measurement} is absent from the detector status`);
    const halfBinRatio = parsedStatus.data.tau_max / parsedStatus.data.delta_tau;
    const halfBinCount = Math.round(halfBinRatio);
    const halfBinTolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE + HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.max(Math.abs(halfBinRatio), Math.abs(halfBinCount));
    if (!Number.isSafeInteger(halfBinCount) || halfBinCount < 1 || Math.abs(halfBinRatio - halfBinCount) > halfBinTolerance) {
      return error("tau_max must be an exact positive integer multiple of delta_tau");
    }
    const expectedLength = halfBinCount * 2 + 1;
    if (expectedLength > NEST_ANALYSIS_LIMITS.maxOutputBins) {
      return error(`correlation detector output exceeds ${NEST_ANALYSIS_LIMITS.maxOutputBins} bins`);
    }
    if (values.length !== expectedLength) {
      return error(
        `${opts.measurement} length (${values.length}) must equal 2*tau_max/delta_tau+1 (${expectedLength})`
      );
    }
    const lags = new Array(expectedLength);
    for (let index = 0; index < expectedLength; index++) {
      const centeredIndex = index - halfBinCount;
      lags[index] = centeredIndex === 0 ? 0 : centeredIndex === -halfBinCount ? -parsedStatus.data.tau_max : centeredIndex === halfBinCount ? parsedStatus.data.tau_max : centeredIndex * parsedStatus.data.delta_tau;
    }
    const statistic = opts.measurement === "count_histogram" ? { kind: "raw_pair_count", units: "count" } : { kind: "weighted_pair_sum", units: opts.weightedUnits };
    return validateOutput(CorrelogramParamsSchema, {
      lags_ms: lags,
      values: [...values],
      bin_width_ms: parsedStatus.data.delta_tau,
      tau_max_ms: parsedStatus.data.tau_max,
      counting_start_ms: parsedStatus.data.Tstart,
      counting_stop_ms: parsedStatus.data.Tstop,
      pair: {
        reference_label: opts.referenceLabel,
        target_label: opts.targetLabel
      },
      lag_convention: "positive_target_after_reference",
      binning: "left_closed_right_open",
      zero_lag_policy: opts.zeroLagPolicy,
      statistic
    });
  } catch {
    return error("correlation-detector analysis could not safely process the input");
  }
}

// core/nest/topology.ts
import { z as z5 } from "zod";
var NEST_TOPOLOGY_LIMITS = Object.freeze({
  maxConnections: NEST_INPUT_LIMITS.maxSamples,
  maxGraphNodes: PARAM_LIMITS.maxTopologyNodes,
  maxGraphEdges: PARAM_LIMITS.maxTopologyEdges,
  maxMatrixCells: PARAM_LIMITS.maxSamples,
  maxDegreeBins: PARAM_LIMITS.maxSamples,
  maxDelayBins: PARAM_LIMITS.maxSamples,
  maxSpatialNodes: PARAM_LIMITS.maxSpatialObjects
});
var FLOAT32_MAX3 = 34028234663852886e22;
var finite2 = z5.number().finite().refine((value) => !Object.is(value, -0), "negative zero is not exact JSON");
var gpuNumber = finite2.min(-FLOAT32_MAX3).max(FLOAT32_MAX3);
var nodeId = z5.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0), "node ids must not be negative zero");
var displayText2 = (maximum) => z5.string().trim().min(1).max(maximum).regex(SAFE_DISPLAY_STRING_PATTERN).transform((value) => value.trim());
var scalarOrArray = (item) => z5.union([
  item,
  z5.array(item).max(NEST_TOPOLOGY_LIMITS.maxConnections)
]);
var arrayOnly = (item) => z5.array(item).max(NEST_TOPOLOGY_LIMITS.maxConnections);
var RawSynapseCollectionSchema = z5.object({
  source: scalarOrArray(nodeId).optional(),
  sources: arrayOnly(nodeId).optional(),
  target: scalarOrArray(nodeId).optional(),
  targets: arrayOnly(nodeId).optional(),
  weight: scalarOrArray(gpuNumber).optional(),
  weights: arrayOnly(gpuNumber).optional(),
  delay: scalarOrArray(gpuNumber.positive()).optional(),
  delays: arrayOnly(gpuNumber.positive()).optional(),
  synapse_model: scalarOrArray(displayText2(120)).optional(),
  synapse_models: arrayOnly(displayText2(120)).optional(),
  target_thread: scalarOrArray(nodeId).optional(),
  target_threads: arrayOnly(nodeId).optional(),
  synapse_id: scalarOrArray(nodeId).optional(),
  synapse_ids: arrayOnly(nodeId).optional(),
  port: scalarOrArray(nodeId).optional(),
  ports: arrayOnly(nodeId).optional()
}).strict();
var RAW_CONNECTION_FIELDS = Object.freeze([
  "source",
  "sources",
  "target",
  "targets",
  "weight",
  "weights",
  "delay",
  "delays",
  "synapse_model",
  "synapse_models",
  "target_thread",
  "target_threads",
  "synapse_id",
  "synapse_ids",
  "port",
  "ports"
]);
function error2(message) {
  return { ok: false, errors: [message] };
}
function validateOutput2(schema, params) {
  const parsed = schema.safeParse(params);
  return parsed.success ? { ok: true, params: parsed.data } : { ok: false, errors: formatValidationIssues(parsed.error.issues) };
}
function normalizeAlias(value, singular, plural, required) {
  const hasSingular = Object.hasOwn(value, singular);
  const hasPlural = Object.hasOwn(value, plural);
  if (hasSingular && hasPlural) {
    return error2(`${singular}/${plural}: supply exactly one documented or legacy field form`);
  }
  if (!hasSingular && !hasPlural) {
    return required ? error2(`${singular}: required SynapseCollection field is missing`) : { ok: true };
  }
  const raw = value[hasSingular ? singular : plural];
  if (raw === void 0) {
    return error2(`${hasSingular ? singular : plural}: an explicitly present field cannot be undefined`);
  }
  return { ok: true, values: Array.isArray(raw) ? raw : [raw] };
}
function normalizeSynapseCollectionSnapshot(input) {
  try {
    const projected = projectNestInputFields(input, RAW_CONNECTION_FIELDS);
    if (!projected.ok) return projected;
    const parsed = parseNestInput(RawSynapseCollectionSchema, projected.data);
    if (!parsed.ok) return parsed;
    const value = parsed.data;
    const singularFields = [
      "source",
      "target",
      "weight",
      "delay",
      "synapse_model",
      "target_thread",
      "synapse_id",
      "port"
    ];
    const pluralFields = [
      "sources",
      "targets",
      "weights",
      "delays",
      "synapse_models",
      "target_threads",
      "synapse_ids",
      "ports"
    ];
    if (singularFields.some((field) => Object.hasOwn(value, field)) && pluralFields.some((field) => Object.hasOwn(value, field))) {
      return error2("SynapseCollection fields must consistently use the documented singular-key form or the legacy plural-key form");
    }
    const sources = normalizeAlias(value, "source", "sources", true);
    if (!sources.ok) return sources;
    const targets = normalizeAlias(value, "target", "targets", true);
    if (!targets.ok) return targets;
    const weights = normalizeAlias(value, "weight", "weights", false);
    if (!weights.ok) return weights;
    const delays = normalizeAlias(value, "delay", "delays", false);
    if (!delays.ok) return delays;
    const models = normalizeAlias(value, "synapse_model", "synapse_models", false);
    if (!models.ok) return models;
    const targetThreads = normalizeAlias(value, "target_thread", "target_threads", false);
    if (!targetThreads.ok) return targetThreads;
    const synapseIds = normalizeAlias(value, "synapse_id", "synapse_ids", false);
    if (!synapseIds.ok) return synapseIds;
    const ports = normalizeAlias(value, "port", "ports", false);
    if (!ports.ok) return ports;
    const count = sources.values.length;
    if (targets.values.length !== count) {
      return error2(
        `source/target: parallel fields differ in length (${count} versus ${targets.values.length})`
      );
    }
    for (const [field, channel] of [
      ["weight", weights.values],
      ["delay", delays.values],
      ["synapse_model", models.values],
      ["target_thread", targetThreads.values],
      ["synapse_id", synapseIds.values],
      ["port", ports.values]
    ]) {
      if (channel !== void 0 && channel.length !== count) {
        return error2(
          `${field}: optional channel length ${channel.length} must equal connection count ${count}; scalar values are never broadcast`
        );
      }
    }
    const identityPresence = [targetThreads.values, synapseIds.values, ports.values].filter((channel) => channel !== void 0).length;
    if (identityPresence !== 0 && identityPresence !== 3) {
      return error2("target_thread/synapse_id/port: connection identity channels must be supplied together");
    }
    if (identityPresence === 3) {
      const identifiers = /* @__PURE__ */ new Set();
      for (let index = 0; index < count; index++) {
        const identifier = [
          sources.values[index],
          targets.values[index],
          targetThreads.values[index],
          synapseIds.values[index],
          ports.values[index]
        ].join("\0");
        if (identifiers.has(identifier)) {
          return error2(`connection identity.${index}: duplicate NEST source/target/target_thread/synapse_id/port tuple`);
        }
        identifiers.add(identifier);
      }
    }
    return {
      ok: true,
      params: {
        sources: sources.values,
        targets: targets.values,
        ...weights.values !== void 0 ? { weights: weights.values } : {},
        ...delays.values !== void 0 ? { delays_ms: delays.values } : {},
        ...models.values !== void 0 ? { synapse_models: models.values } : {},
        ...targetThreads.values !== void 0 ? { target_threads: targetThreads.values } : {},
        ...synapseIds.values !== void 0 ? { synapse_ids: synapseIds.values } : {},
        ...ports.values !== void 0 ? { ports: ports.values } : {}
      }
    };
  } catch {
    return error2("SynapseCollection input could not be safely normalized");
  }
}
var graphNodeIds = z5.array(nodeId).min(1).max(NEST_TOPOLOGY_LIMITS.maxGraphNodes);
var connectionAxisIds = z5.array(nodeId).min(1).max(PARAM_LIMITS.maxSamples);
var CommonConnectionOptionsShape = {
  sourceIds: connectionAxisIds,
  targetIds: connectionAxisIds,
  snapshotTimeMs: finite2.nonnegative(),
  snapshotScope: SnapshotScopeSchema
};
var GraphOptionsSchema = z5.object({
  ...CommonConnectionOptionsShape,
  sourceIds: graphNodeIds,
  targetIds: graphNodeIds,
  weightUnits: displayText2(80).optional(),
  delayUnits: z5.literal("ms").optional(),
  samplePolicy: z5.discriminatedUnion("kind", [
    z5.object({ kind: z5.literal("complete") }).strict(),
    z5.object({
      kind: z5.literal("deterministic_even_stride"),
      maxEdges: z5.number().int().positive().max(NEST_TOPOLOGY_LIMITS.maxGraphEdges)
    }).strict()
  ])
}).strict();
var MatrixOptionsSchema = z5.object(CommonConnectionOptionsShape).strict();
var WeightMatrixOptionsSchema = z5.object({
  ...CommonConnectionOptionsShape,
  weightUnits: displayText2(80),
  aggregation: z5.enum(["sum", "mean", "minimum", "maximum", "single_connection"])
}).strict();
var DelayMatrixOptionsSchema = z5.object({
  ...CommonConnectionOptionsShape,
  delayUnits: z5.literal("ms"),
  aggregation: z5.enum(["mean", "minimum", "maximum", "single_connection"])
}).strict();
var DegreeOptionsSchema = z5.object({
  ...CommonConnectionOptionsShape,
  normalization: z5.enum(["count", "probability"])
}).strict();
var DelayDistributionOptionsSchema = z5.object({
  ...CommonConnectionOptionsShape,
  delayUnits: z5.literal("ms"),
  binWidthMs: finite2.positive(),
  windowStartMs: finite2.nonnegative(),
  windowStopMs: finite2.positive(),
  normalization: z5.enum(["count", "probability", "probability_density"])
}).strict();
var SpatialMapOptionsSchema = z5.object({
  nodeIds: z5.array(nodeId).min(1).max(NEST_TOPOLOGY_LIMITS.maxSpatialNodes),
  coordinateUnits: displayText2(80),
  extent: z5.tuple([gpuNumber.positive(), gpuNumber.positive()]),
  center: z5.tuple([gpuNumber, gpuNumber]),
  edgeWrap: z5.boolean(),
  positionScope: PositionScopeSchema
}).strict();
function parseConnectionContext(input, options, schema) {
  const normalized = normalizeSynapseCollectionSnapshot(input);
  if (!normalized.ok) return normalized;
  const parsedOptions = parseNestInput(schema, options);
  if (!parsedOptions.ok) return parsedOptions;
  const opts = parsedOptions.data;
  const sourceIds = /* @__PURE__ */ new Set();
  for (let index = 0; index < opts.sourceIds.length; index++) {
    const id = opts.sourceIds[index];
    if (sourceIds.has(id)) return error2(`sourceIds.${index}: duplicate node id ${id}`);
    sourceIds.add(id);
  }
  const targetIds = /* @__PURE__ */ new Set();
  for (let index = 0; index < opts.targetIds.length; index++) {
    const id = opts.targetIds[index];
    if (targetIds.has(id)) return error2(`targetIds.${index}: duplicate node id ${id}`);
    targetIds.add(id);
  }
  for (let index = 0; index < normalized.params.sources.length; index++) {
    if (!sourceIds.has(normalized.params.sources[index])) {
      return error2(
        `source.${index}: node ${normalized.params.sources[index]} is outside the declared sourceIds universe`
      );
    }
    if (!targetIds.has(normalized.params.targets[index])) {
      return error2(
        `target.${index}: node ${normalized.params.targets[index]} is outside the declared targetIds universe`
      );
    }
  }
  return {
    ok: true,
    params: {
      snapshot: normalized.params,
      sourceIds: opts.sourceIds,
      targetIds: opts.targetIds,
      snapshotTimeMs: opts.snapshotTimeMs,
      snapshotScope: opts.snapshotScope,
      options: opts
    }
  };
}
function compareConnectionRows(snapshot, left, right) {
  const numericChannels = [
    snapshot.sources,
    snapshot.targets,
    snapshot.target_threads,
    snapshot.synapse_ids,
    snapshot.ports,
    snapshot.weights,
    snapshot.delays_ms
  ];
  for (const channel of numericChannels) {
    if (!channel) continue;
    const delta = channel[left] - channel[right];
    if (delta !== 0) return delta;
  }
  if (snapshot.synapse_models) {
    const leftModel = snapshot.synapse_models[left];
    const rightModel = snapshot.synapse_models[right];
    if (leftModel < rightModel) return -1;
    if (leftModel > rightModel) return 1;
  }
  return left - right;
}
function canonicalConnectionOrder(snapshot) {
  const order = Array.from({ length: snapshot.sources.length }, (_, index) => index);
  order.sort((left, right) => compareConnectionRows(snapshot, left, right));
  return order;
}
function synapseCollectionToConnectionGraphParams(input, options) {
  try {
    const context = parseConnectionContext(input, options, GraphOptionsSchema);
    if (!context.ok) return context;
    const { snapshot, sourceIds, targetIds, snapshotTimeMs, snapshotScope } = context.params;
    const opts = context.params.options;
    if (snapshot.weights !== void 0 !== (opts.weightUnits !== void 0)) {
      return error2("weightUnits must be supplied exactly when the SynapseCollection contains weight");
    }
    if (snapshot.delays_ms !== void 0 !== (opts.delayUnits !== void 0)) {
      return error2("delayUnits:'ms' must be supplied exactly when the SynapseCollection contains delay");
    }
    const allNodeIds = [...sourceIds];
    const seenNodes = new Set(allNodeIds);
    for (const id of targetIds) {
      if (!seenNodes.has(id)) {
        seenNodes.add(id);
        allNodeIds.push(id);
      }
    }
    if (allNodeIds.length > NEST_TOPOLOGY_LIMITS.maxGraphNodes) {
      return error2(`graph node universe exceeds ${NEST_TOPOLOGY_LIMITS.maxGraphNodes} nodes`);
    }
    const order = canonicalConnectionOrder(snapshot);
    let selectedFullIndices;
    let samplePolicy;
    if (opts.samplePolicy.kind === "complete") {
      if (order.length > NEST_TOPOLOGY_LIMITS.maxGraphEdges) {
        return error2(
          `complete graph output exceeds ${NEST_TOPOLOGY_LIMITS.maxGraphEdges} edges; request deterministic_even_stride`
        );
      }
      selectedFullIndices = order.map((_, index) => index);
      samplePolicy = "complete";
    } else {
      const maxEdges = opts.samplePolicy.maxEdges;
      if (order.length <= maxEdges) {
        return error2("deterministic_even_stride must select a strict subset; use complete for this snapshot");
      }
      selectedFullIndices = Array.from(
        { length: maxEdges },
        (_, index) => maxEdges === 1 ? Math.floor((order.length - 1) / 2) : Math.round(index * (order.length - 1) / (maxEdges - 1))
      );
      samplePolicy = "deterministic_even_stride";
    }
    const edges = selectedFullIndices.map((fullIndex) => {
      const rawIndex = order[fullIndex];
      const edgeId = snapshot.target_threads && snapshot.synapse_ids && snapshot.ports ? `connection:${snapshot.sources[rawIndex]}:${snapshot.targets[rawIndex]}:${snapshot.target_threads[rawIndex]}:${snapshot.synapse_ids[rawIndex]}:${snapshot.ports[rawIndex]}` : `connection:${fullIndex}`;
      return {
        id: edgeId,
        source: snapshot.sources[rawIndex],
        target: snapshot.targets[rawIndex],
        ...snapshot.weights ? { weight: snapshot.weights[rawIndex] } : {},
        ...snapshot.delays_ms ? { delay_ms: snapshot.delays_ms[rawIndex] } : {},
        ...snapshot.synapse_models ? { synapse_model: snapshot.synapse_models[rawIndex] } : {}
      };
    });
    return validateOutput2(ConnectionGraphParamsSchema, {
      nodes: allNodeIds.map((id) => ({ id, label: String(id) })),
      edges,
      ...edges.length > 0 && opts.weightUnits ? { weight_units: opts.weightUnits } : {},
      ...edges.length > 0 && opts.delayUnits ? { delay_units: opts.delayUnits } : {},
      layout: "schematic_circle",
      parallel_edges: "preserved",
      self_connections: "preserved",
      snapshot_time_ms: snapshotTimeMs,
      snapshot_scope: snapshotScope,
      sample_policy: samplePolicy,
      source_connection_count: snapshot.sources.length,
      edge_identity: snapshot.target_threads ? "nest_connection_identifier" : "canonical_sorted_ordinal"
    });
  } catch {
    return error2("connection graph transform could not safely inspect its inputs");
  }
}
function pairBuckets(snapshot, sourceIds, targetIds, measurements) {
  const buckets = /* @__PURE__ */ new Map();
  for (let index = 0; index < snapshot.sources.length; index++) {
    const source = snapshot.sources[index];
    const target = snapshot.targets[index];
    const key = `${source}\0${target}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { source_id: source, target_id: target, connection_count: 0, measurements: [] };
      buckets.set(key, bucket);
    }
    bucket.connection_count += 1;
    if (measurements) bucket.measurements.push(measurements[index]);
  }
  const sourceOrder = new Map(sourceIds.map((id, index) => [id, index]));
  const targetOrder = new Map(targetIds.map((id, index) => [id, index]));
  return [...buckets.values()].sort(
    (left, right) => targetOrder.get(left.target_id) - targetOrder.get(right.target_id) || sourceOrder.get(left.source_id) - sourceOrder.get(right.source_id)
  );
}
function aggregateMeasurements(values, aggregation) {
  if (aggregation === "single_connection") {
    return values.length === 1 ? { ok: true, value: values[0] } : { ok: false, reason: "multiple_connections" };
  }
  if (aggregation === "minimum") {
    let minimum = values[0];
    for (let index = 1; index < values.length; index++) minimum = Math.min(minimum, values[index]);
    return { ok: true, value: minimum };
  }
  if (aggregation === "maximum") {
    let maximum = values[0];
    for (let index = 1; index < values.length; index++) maximum = Math.max(maximum, values[index]);
    return { ok: true, value: maximum };
  }
  const ordered = [...values].sort((left, right) => left - right);
  let sum = 0;
  for (const value of ordered) sum += value;
  if (aggregation === "mean") {
    const mean = sum / ordered.length;
    if (sum !== 0 && mean === 0) return { ok: false, reason: "mean_underflow" };
    return { ok: true, value: mean };
  }
  return { ok: true, value: sum };
}
function matrixCommon(context) {
  return {
    source_ids: context.sourceIds,
    target_ids: context.targetIds,
    axis_order: "target_rows_source_columns",
    absent_cell: "no_connection",
    sample_policy: "complete",
    connection_count: context.snapshot.sources.length,
    snapshot_time_ms: context.snapshotTimeMs,
    snapshot_scope: context.snapshotScope
  };
}
function synapseCollectionToAdjacencyMatrixParams(input, options) {
  try {
    const context = parseConnectionContext(input, options, MatrixOptionsSchema);
    if (!context.ok) return context;
    const buckets = pairBuckets(
      context.params.snapshot,
      context.params.sourceIds,
      context.params.targetIds
    );
    if (buckets.length > NEST_TOPOLOGY_LIMITS.maxMatrixCells) {
      return error2(`adjacency matrix exceeds ${NEST_TOPOLOGY_LIMITS.maxMatrixCells} present cells`);
    }
    return validateOutput2(AdjacencyMatrixParamsSchema, {
      ...matrixCommon(context.params),
      cells: buckets.map(({ source_id, target_id, connection_count }) => ({
        source_id,
        target_id,
        connection_count
      })),
      display: "binary_presence",
      aggregation: "any_connection"
    });
  } catch {
    return error2("adjacency matrix transform could not safely inspect its inputs");
  }
}
function synapseCollectionToWeightMatrixParams(input, options) {
  try {
    const context = parseConnectionContext(input, options, WeightMatrixOptionsSchema);
    if (!context.ok) return context;
    const weights = context.params.snapshot.weights;
    if (!weights) return error2("weight: weight matrix requires a complete weight channel");
    const opts = context.params.options;
    const buckets = pairBuckets(
      context.params.snapshot,
      context.params.sourceIds,
      context.params.targetIds,
      weights
    );
    if (buckets.length > NEST_TOPOLOGY_LIMITS.maxMatrixCells) {
      return error2(`weight matrix exceeds ${NEST_TOPOLOGY_LIMITS.maxMatrixCells} present cells`);
    }
    const cells = [];
    for (const bucket of buckets) {
      const aggregated = aggregateMeasurements(bucket.measurements, opts.aggregation);
      if (!aggregated.ok && aggregated.reason === "multiple_connections") {
        return error2(
          `weight matrix cell ${bucket.source_id}->${bucket.target_id} has ${bucket.connection_count} connections; single_connection requires one`
        );
      }
      if (!aggregated.ok) {
        return error2(
          `weight matrix cell ${bucket.source_id}->${bucket.target_id} mean underflows binary64 and would erase nonzero weight evidence`
        );
      }
      const value = aggregated.value;
      if (!Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX3) {
        return error2(`weight matrix cell ${bucket.source_id}->${bucket.target_id} aggregation exceeds renderable range`);
      }
      cells.push({
        source_id: bucket.source_id,
        target_id: bucket.target_id,
        connection_count: bucket.connection_count,
        value
      });
    }
    return validateOutput2(WeightMatrixParamsSchema, {
      ...matrixCommon(context.params),
      cells,
      weight_units: opts.weightUnits,
      aggregation: opts.aggregation
    });
  } catch {
    return error2("weight matrix transform could not safely inspect its inputs");
  }
}
function synapseCollectionToDelayMatrixParams(input, options) {
  try {
    const context = parseConnectionContext(input, options, DelayMatrixOptionsSchema);
    if (!context.ok) return context;
    const delays = context.params.snapshot.delays_ms;
    if (!delays) return error2("delay: delay matrix requires a complete delay channel");
    const opts = context.params.options;
    const buckets = pairBuckets(
      context.params.snapshot,
      context.params.sourceIds,
      context.params.targetIds,
      delays
    );
    if (buckets.length > NEST_TOPOLOGY_LIMITS.maxMatrixCells) {
      return error2(`delay matrix exceeds ${NEST_TOPOLOGY_LIMITS.maxMatrixCells} present cells`);
    }
    const cells = [];
    for (const bucket of buckets) {
      const aggregated = aggregateMeasurements(bucket.measurements, opts.aggregation);
      if (!aggregated.ok && aggregated.reason === "multiple_connections") {
        return error2(
          `delay matrix cell ${bucket.source_id}->${bucket.target_id} has ${bucket.connection_count} connections; single_connection requires one`
        );
      }
      if (!aggregated.ok) {
        return error2(
          `delay matrix cell ${bucket.source_id}->${bucket.target_id} mean underflows binary64`
        );
      }
      const value = aggregated.value;
      if (!Number.isFinite(value) || value <= 0 || value > FLOAT32_MAX3) {
        return error2(`delay matrix cell ${bucket.source_id}->${bucket.target_id} aggregation is not a positive renderable delay`);
      }
      cells.push({
        source_id: bucket.source_id,
        target_id: bucket.target_id,
        connection_count: bucket.connection_count,
        value
      });
    }
    return validateOutput2(DelayMatrixParamsSchema, {
      ...matrixCommon(context.params),
      cells,
      delay_units: opts.delayUnits,
      aggregation: opts.aggregation
    });
  } catch {
    return error2("delay matrix transform could not safely inspect its inputs");
  }
}
function degreeDistribution(input, options, direction) {
  const context = parseConnectionContext(input, options, DegreeOptionsSchema);
  if (!context.ok) return context;
  const opts = context.params.options;
  if (direction === "out" && context.params.snapshotScope.kind === "mpi_target_rank_local") {
    return error2("out-degree cannot be recovered from a target-rank-local SynapseCollection snapshot");
  }
  const universe = direction === "in" ? context.params.targetIds : context.params.sourceIds;
  const degreeByNode = new Map(universe.map((id) => [id, 0]));
  const endpoints = direction === "in" ? context.params.snapshot.targets : context.params.snapshot.sources;
  for (const endpoint of endpoints) degreeByNode.set(endpoint, degreeByNode.get(endpoint) + 1);
  let maximum = 0;
  for (const degree of degreeByNode.values()) maximum = Math.max(maximum, degree);
  if (maximum + 1 > NEST_TOPOLOGY_LIMITS.maxDegreeBins) {
    return error2(`degree output exceeds ${NEST_TOPOLOGY_LIMITS.maxDegreeBins} bins`);
  }
  const degrees = Array.from({ length: maximum + 1 }, (_, index) => index);
  const nodeCounts = new Array(degrees.length).fill(0);
  for (const degree of degreeByNode.values()) nodeCounts[degree] += 1;
  const values = nodeCounts.map(
    (count) => opts.normalization === "count" ? count : count / universe.length
  );
  const params = {
    degrees,
    node_counts: nodeCounts,
    values,
    node_count: universe.length,
    connection_count: context.params.snapshot.sources.length,
    direction,
    normalization: opts.normalization,
    value_units: opts.normalization === "count" ? "count" : "probability",
    edge_counting: "each_synapse_collection_entry",
    zero_degree_policy: "include_declared_universe",
    sample_policy: "complete",
    snapshot_time_ms: context.params.snapshotTimeMs,
    snapshot_scope: context.params.snapshotScope
  };
  return direction === "in" ? validateOutput2(InDegreeDistributionParamsSchema, params) : validateOutput2(OutDegreeDistributionParamsSchema, params);
}
function synapseCollectionToInDegreeDistributionParams(input, options) {
  return degreeDistribution(input, options, "in");
}
function synapseCollectionToOutDegreeDistributionParams(input, options) {
  return degreeDistribution(input, options, "out");
}
function exactBinCount2(start, stop, width) {
  if (!(stop > start)) return error2("delay window: stop must be greater than start");
  const ratio = (stop - start) / width;
  const count = Math.round(ratio);
  const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE + HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.max(Math.abs(ratio), Math.abs(count));
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ratio) || Math.abs(ratio - count) > tolerance) {
    return error2("delay window: duration must be an exact positive integer multiple of bin width");
  }
  if (count > NEST_TOPOLOGY_LIMITS.maxDelayBins) {
    return error2(`delay distribution exceeds ${NEST_TOPOLOGY_LIMITS.maxDelayBins} bins`);
  }
  return { ok: true, count };
}
var BIN_INDEX_OUTSIDE2 = -1;
var BIN_INDEX_INDETERMINATE2 = -2;
var BIN_BOUNDARY_ROUNDOFF_ULPS2 = 16;
var MAX_BIN_BOUNDARY_SNAP_DISTANCE2 = GEOMETRY_MAX_ROUNDOFF_FRACTION;
function halfOpenBinIndex(value, start, stop, width, count) {
  if (value < start || value >= stop) return BIN_INDEX_OUTSIDE2;
  let scaled = (value - start) / width;
  if (!Number.isFinite(scaled)) return BIN_INDEX_INDETERMINATE2;
  const nearest = Math.round(scaled);
  const operationScale = Math.max(1, Math.abs(value), Math.abs(start), Math.abs(width));
  const arithmeticTolerance = BIN_BOUNDARY_ROUNDOFF_ULPS2 * Number.EPSILON * (operationScale / Math.abs(width) + Math.max(1, Math.abs(scaled)));
  const boundaryDistance = Math.abs(scaled - nearest);
  if (boundaryDistance === 0) {
    scaled = nearest;
  } else if (boundaryDistance <= arithmeticTolerance && boundaryDistance <= MAX_BIN_BOUNDARY_SNAP_DISTANCE2) {
    if (arithmeticTolerance > MAX_BIN_BOUNDARY_SNAP_DISTANCE2) {
      return BIN_INDEX_INDETERMINATE2;
    }
    scaled = nearest;
  }
  const index = Math.floor(scaled);
  return index >= 0 && index < count ? index : BIN_INDEX_OUTSIDE2;
}
function synapseCollectionToDelayDistributionParams(input, options) {
  try {
    const context = parseConnectionContext(input, options, DelayDistributionOptionsSchema);
    if (!context.ok) return context;
    const delays = context.params.snapshot.delays_ms;
    if (!delays) return error2("delay: delay distribution requires a complete delay channel");
    const opts = context.params.options;
    const geometry = exactBinCount2(opts.windowStartMs, opts.windowStopMs, opts.binWidthMs);
    if (!geometry.ok) return geometry;
    if (delays.length === 0 && opts.normalization !== "count") {
      return error2("an empty delay snapshot cannot be probability-normalized");
    }
    const densityDenominator = delays.length * opts.binWidthMs;
    if (opts.normalization === "probability_density" && (!Number.isFinite(densityDenominator) || densityDenominator <= 0)) {
      return error2("delay probability-density denominator connection_count \xD7 binWidthMs must be finite");
    }
    const counts = new Array(geometry.count).fill(0);
    for (let index = 0; index < delays.length; index++) {
      const bin = halfOpenBinIndex(
        delays[index],
        opts.windowStartMs,
        opts.windowStopMs,
        opts.binWidthMs,
        geometry.count
      );
      if (bin === BIN_INDEX_INDETERMINATE2) {
        return error2(
          `delay.${index}: binary64 arithmetic cannot resolve a half-open bin boundary without guessing`
        );
      }
      if (bin === BIN_INDEX_OUTSIDE2) {
        return error2(
          `delay.${index}: ${delays[index]} ms lies outside [${opts.windowStartMs},${opts.windowStopMs})`
        );
      }
      counts[bin] += 1;
    }
    const values = counts.map(
      (count) => opts.normalization === "count" ? count : opts.normalization === "probability" ? count / delays.length : count / densityDenominator
    );
    return validateOutput2(DelayDistributionParamsSchema, {
      bin_centers_ms: Array.from(
        { length: geometry.count },
        (_, index) => opts.windowStartMs + (index + 0.5) * opts.binWidthMs
      ),
      delay_counts: counts,
      values,
      bin_width_ms: opts.binWidthMs,
      window_start_ms: opts.windowStartMs,
      window_stop_ms: opts.windowStopMs,
      normalization: opts.normalization,
      value_units: opts.normalization === "count" ? "count" : opts.normalization === "probability" ? "probability" : "1/ms",
      delay_units: opts.delayUnits,
      aggregation: "each_connection",
      binning: "left_closed_right_open",
      sample_policy: "complete",
      connection_count: delays.length,
      snapshot_time_ms: context.params.snapshotTimeMs,
      snapshot_scope: context.params.snapshotScope
    });
  } catch {
    return error2("delay distribution transform could not safely inspect its inputs");
  }
}
var PositionListSchema = z5.union([
  z5.tuple([gpuNumber, gpuNumber]).transform((position) => [position]),
  z5.array(z5.tuple([gpuNumber, gpuNumber])).min(1).max(NEST_TOPOLOGY_LIMITS.maxSpatialNodes)
]);
var PositionWrapperSchema = z5.object({
  positions: PositionListSchema,
  node_ids: z5.array(nodeId).min(1).max(NEST_TOPOLOGY_LIMITS.maxSpatialNodes).optional()
}).strict();
function normalizePositions2D(input) {
  if (input !== null && typeof input === "object" && !Array.isArray(input) && !ArrayBuffer.isView(input)) {
    const projected = projectNestInputFields(input, ["positions", "node_ids"]);
    if (!projected.ok) return projected;
    const parsed2 = parseNestInput(PositionWrapperSchema, projected.data);
    return parsed2.ok ? { ok: true, params: { positions: parsed2.data.positions, nodeIds: parsed2.data.node_ids } } : parsed2;
  }
  const parsed = parseNestInput(PositionListSchema, input);
  return parsed.ok ? { ok: true, params: { positions: parsed.data } } : parsed;
}
function getPositionToSpatialMap2DParams(input, options) {
  try {
    const positions = normalizePositions2D(input);
    if (!positions.ok) return positions;
    const parsedOptions = parseNestInput(SpatialMapOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    if (positions.params.positions.length !== opts.nodeIds.length) {
      return error2(
        `positions/nodeIds: lengths differ (${positions.params.positions.length} versus ${opts.nodeIds.length})`
      );
    }
    const ids = /* @__PURE__ */ new Set();
    for (let index = 0; index < opts.nodeIds.length; index++) {
      if (ids.has(opts.nodeIds[index])) {
        return error2(`nodeIds.${index}: duplicate node id ${opts.nodeIds[index]}`);
      }
      ids.add(opts.nodeIds[index]);
    }
    if (positions.params.nodeIds) {
      if (positions.params.nodeIds.length !== opts.nodeIds.length || positions.params.nodeIds.some((id, index) => id !== opts.nodeIds[index])) {
        return error2("node_ids: wrapper ids must exactly match the explicit nodeIds option");
      }
    }
    return validateOutput2(SpatialMap2DParamsSchema, {
      nodes: positions.params.positions.map(([x, y], index) => ({
        id: opts.nodeIds[index],
        label: String(opts.nodeIds[index]),
        x,
        y
      })),
      coordinate_units: opts.coordinateUnits,
      extent: opts.extent,
      center: opts.center,
      edge_wrap: opts.edgeWrap,
      position_scope: opts.positionScope,
      marker_size: "fixed_screen_space"
    });
  } catch {
    return error2("2D position transform could not safely inspect its inputs");
  }
}

export {
  adaptEngramCorpusEntityGraph,
  ROUTING_DISCRIMINATORS,
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
  CorrelationDetectorStatusSchema,
  NEST_ADAPTER_LIMITS,
  spikeRecorderToSceneData,
  multimeterToSceneData,
  splitMultimeterBySender,
  getConnectionsToSceneData,
  getPositionToSceneData,
  weightRecorderToSceneData,
  splitWeightRecorderBySynapse,
  NEST_ANALYSIS_LIMITS,
  spikeRecorderToPopulationRateParams,
  spikeRecorderToIsiParams,
  spikeTrialsToPsthParams,
  correlationDetectorToCorrelogramParams,
  NEST_TOPOLOGY_LIMITS,
  normalizeSynapseCollectionSnapshot,
  synapseCollectionToConnectionGraphParams,
  synapseCollectionToAdjacencyMatrixParams,
  synapseCollectionToWeightMatrixParams,
  synapseCollectionToDelayMatrixParams,
  synapseCollectionToInDegreeDistributionParams,
  synapseCollectionToOutDegreeDistributionParams,
  synapseCollectionToDelayDistributionParams,
  getPositionToSpatialMap2DParams
};
//# sourceMappingURL=chunk-OV7LM36R.js.map