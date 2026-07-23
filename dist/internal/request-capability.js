import {
  parseJsonStrict
} from "../chunk-L2BRNVUB.js";
import {
  DistributionDerivationError,
  MatrixDerivationError,
  deriveDegreeDistribution,
  deriveDelayDistribution,
  deriveIsiFromEvents,
  deriveIsiFromIntervals,
  derivePopulationRateCounts,
  deriveWeightDistribution,
  deriveWeightMatrix,
  validateStructure,
  verifyHistogramValues
} from "../chunk-TEVJHERV.js";
import {
  LEGACY_SKILL_MAP,
  MAX_MATERIALIZED_BINS,
  SEMANTIC_VALIDATOR_IDS,
  SKILL_CATALOG,
  axesAreCompatible,
  binary64RelativeDifferenceWithinEpsilons,
  binary64RelativeDifferenceWithinTolerance,
  checkQuantityUnit,
  compareExactUnitArraySumToDifference,
  compareExactUnitSumToValue,
  convert,
  convertDifference,
  convertExactUnitSum,
  deriveExactAggregateCountRateInUnit,
  deriveExactCountRateInUnit,
  dimensionOf,
  divideExactIntegerByConvertedDifference,
  exactBinary64Mean,
  exactBinary64Sum,
  exactRationalToBinary64,
  finiteBinary64ToMinSubnormalUnits,
  floorExactBinary64TimesSafeInteger,
  isKnownUnit,
  isQuantityKind,
  isRoundedMeanOfSafeNonnegativeIntegers,
  kindAcceptsDimension,
  materializeCenteredLagBins,
  materializeWidthBins,
  reciprocalUnit,
  resolveAlias,
  verifyBinnedPeakValueLattice,
  verifyPeakBasisAgainstWindow,
  verifyResponseEventScope,
  verifyResponseRateAuthority
} from "../chunk-6TQKFRP5.js";
import {
  snapshotValue
} from "../chunk-WOZECEVX.js";
import {
  CONTRACT_DIGEST,
  DEFAULT_PROFILE,
  MAX_ERROR_RECORDS,
  REQUEST_CONTRACT,
  REQUEST_CONTRACT_IDENTITY,
  canonicalDigest,
  deepFreeze,
  finalizeErrors,
  isSafeDisplayString,
  makeError,
  pointer,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile
} from "../chunk-22OHKNZ5.js";

// src/core/semantics/provenance.ts
var LIBRARY_AUTHORED_FIELDS = /* @__PURE__ */ new Set([
  // FigureArtifactV1 — library-generated, never caller-settable.
  "artifact",
  "artifactDigest",
  "buildIdentity",
  "canonicalRequest",
  "inputAssurance",
  "validation",
  "derivation",
  "budgetDecision",
  "assurance",
  "assurances",
  "attestations",
  "disclosures",
  "render",
  "accessibility",
  "outputs",
  "catalogDigest",
  // Pre-1.0 honesty flags. Removed, not renamed: they let a caller influence a
  // conclusion, which is the defect, and a new spelling would not fix it.
  "calibrated_posterior",
  "calibratedPosterior",
  "advisory_only",
  "advisoryOnly",
  "is_paper_local_evidence",
  "isPaperLocalEvidence",
  "honesty",
  "trustedEnvelope",
  // Assertions of a conclusion, in any spelling an agent might reach for.
  "verified",
  "certified",
  "validated",
  "reproduced",
  "conformant",
  "referenceComparison",
  "sourceContentVerified",
  "signatureVerified"
]);
function findLibraryAuthoredFields(node, path, found, depth) {
  if (depth > 64 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      path.push(i);
      findLibraryAuthoredFields(node[i], path, found, depth + 1);
      path.pop();
    }
    return;
  }
  for (const key of Object.keys(node)) {
    if (LIBRARY_AUTHORED_FIELDS.has(key)) {
      const at = pointer(...path, key);
      found.push(
        makeError({
          code: "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN",
          stage: "provenance",
          instancePath: at,
          validatorId: "provenance.no_caller_assurance",
          message: `"${key}" is a fact Cortexel generates, not one a caller may declare. A request states what the data IS; it cannot state what Cortexel concluded about it. Remove the field \u2014 the conclusion will appear in the artifact if it is earned.`,
          repair: {
            operation: "remove",
            path: at,
            reasonCode: "PROVENANCE_CALLER_ASSURANCE_FORBIDDEN"
          }
        })
      );
      continue;
    }
    path.push(key);
    findLibraryAuthoredFields(
      node[key],
      path,
      found,
      depth + 1
    );
    path.pop();
  }
}
var provenanceNoCallerAssurance = (context) => {
  const found = [];
  findLibraryAuthoredFields(context.request, [], found, 0);
  return found;
};
var MAX_NOTE_LENGTH = 200;
var provenanceNoteSafeDisplay = (context) => {
  const source = context.request.source;
  if (!source || typeof source !== "object") return [];
  const errors = [];
  const check = (value, at) => {
    if (typeof value !== "string") return;
    if (value.length > MAX_NOTE_LENGTH) {
      errors.push(
        makeError({
          code: "PROVENANCE_NOTE_TOO_LONG",
          stage: "provenance",
          instancePath: at,
          validatorId: "provenance.note_safe_display",
          message: `a declared note may be at most ${MAX_NOTE_LENGTH} characters; this one is ${value.length}.`
        })
      );
    }
    if (!isSafeDisplayString(value)) {
      errors.push(
        makeError({
          code: "PROVENANCE_NOTE_UNSAFE_DISPLAY",
          stage: "provenance",
          instancePath: at,
          validatorId: "provenance.note_safe_display",
          message: "the note contains control, bidi-override, or zero-width characters. Rendered beside a mandatory disclosure, those can visually reorder or conceal it \u2014 so they are rejected rather than escaped."
        })
      );
    }
  };
  check(source.declaredNote, pointer("source", "declaredNote"));
  const limitations = source.declaredLimitations;
  if (Array.isArray(limitations)) {
    limitations.forEach((limitation, index) => {
      check(limitation, pointer("source", "declaredLimitations", index));
    });
  }
  return errors;
};

// src/core/semantics/types.ts
function readPointer(root, jsonPointer) {
  if (jsonPointer === "") return root;
  if (!jsonPointer.startsWith("/")) return void 0;
  let node = root;
  for (const rawToken of jsonPointer.slice(1).split("/")) {
    const token = rawToken.replace(/~1/g, "/").replace(/~0/g, "~");
    if (node === null || typeof node !== "object") return void 0;
    if (Array.isArray(node)) {
      const index = Number(token);
      if (!Number.isInteger(index) || index < 0 || index >= node.length) return void 0;
      node = node[index];
    } else {
      if (!Object.prototype.hasOwnProperty.call(node, token)) return void 0;
      node = node[token];
    }
  }
  return node;
}
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function asArray(value) {
  return Array.isArray(value) ? value : void 0;
}
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function getData(context) {
  return asRecord(context.request.data) ?? {};
}
function getParameters(context) {
  return asRecord(context.request.parameters) ?? {};
}
var NUMERIC_TOLERANCE = Object.freeze({ relative: 1e-9, absolute: 1e-12 });

// src/core/semantics/units.ts
var UNIT_CODE_PROPERTY_NAMES = Object.freeze([
  "alignmentUnit",
  "unit",
  "valueUnit"
]);
function collectQuantities(node, path, out) {
  if (node === null || typeof node !== "object") return;
  const pending = [{ node, path }];
  while (pending.length > 0) {
    const current = pending.pop();
    if (Array.isArray(current.node)) {
      for (let i = current.node.length - 1; i >= 0; i--) {
        const child = current.node[i];
        if (child !== null && typeof child === "object") {
          pending.push({ node: child, path: [...current.path, i] });
        }
      }
      continue;
    }
    const record = current.node;
    const kind = asString(record.kind);
    const unit = asString(record.unit);
    if (kind !== void 0 && unit !== void 0 && isQuantityKind(kind)) {
      out.push({ kind, unit, path: current.path });
    }
    const keys = Object.keys(record);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      const child = record[key];
      if (child !== null && typeof child === "object") {
        pending.push({ node: child, path: [...current.path, key] });
      }
    }
  }
}
function collectBareUnits(node, path, out) {
  if (node === null || typeof node !== "object") return;
  const pending = [{ node, path }];
  while (pending.length > 0) {
    const current = pending.pop();
    if (Array.isArray(current.node)) {
      for (let i = current.node.length - 1; i >= 0; i--) {
        const child = current.node[i];
        if (child !== null && typeof child === "object") {
          pending.push({ node: child, path: [...current.path, i] });
        }
      }
      continue;
    }
    const record = current.node;
    const kind = asString(record.kind);
    for (const property of UNIT_CODE_PROPERTY_NAMES) {
      const unit = asString(record[property]);
      if (unit === void 0) continue;
      if (property === "unit" && kind !== void 0 && isQuantityKind(kind)) continue;
      out.push({ unit, path: [...current.path, property] });
    }
    const keys = Object.keys(record);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      const child = record[key];
      if (child !== null && typeof child === "object") {
        pending.push({ node: child, path: [...current.path, key] });
      }
    }
  }
}
function legalKnownUnit(node) {
  const unit = asString(node?.unit);
  if (unit === void 0 || !isKnownUnit(unit)) return void 0;
  const kind = asString(node?.kind);
  if (kind !== void 0 && isQuantityKind(kind)) {
    const dimension = dimensionOf(unit);
    if (dimension === void 0 || !kindAcceptsDimension(kind, dimension)) return void 0;
  }
  return unit;
}
function unitsCanShareBoundAxis(sourceUnit, targetUnit) {
  const sourceDimension = dimensionOf(sourceUnit);
  const targetDimension = dimensionOf(targetUnit);
  if (sourceDimension === void 0 || targetDimension === void 0) return false;
  if (sourceDimension === "simulator_defined" || targetDimension === "simulator_defined") {
    return sourceUnit === targetUnit;
  }
  return sourceDimension === targetDimension;
}
function contextualMismatch(path, message) {
  return makeError({
    code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
    stage: "science",
    instancePath: pointer(...path),
    validatorId: "unit.dimension_match",
    message
  });
}
function requireTimeUnit(node, path, meaning) {
  const unit = asString(node?.unit);
  if (unit === void 0 || !isKnownUnit(unit) || dimensionOf(unit) === "time") return [];
  return [contextualMismatch(
    [...path, "unit"],
    `${meaning} is a time interval and cannot carry unit "${unit}" (dimension ${String(dimensionOf(unit))}). Use a canonical time unit.`
  )];
}
var UNOWNED_TIME_BIN_SKILLS = Object.freeze([
  "network.delay_distribution",
  "neuro.isi_distribution"
]);
function timeAxisContextualUnits(context) {
  const data = asRecord(context.request.data) ?? {};
  const parameters = asRecord(context.request.parameters) ?? {};
  const errors = [];
  if (UNOWNED_TIME_BIN_SKILLS.includes(context.skillId)) {
    errors.push(...requireTimeUnit(
      asRecord(parameters.bins),
      ["parameters", "bins"],
      "bin axis"
    ));
  }
  if (context.skillId === "neuro.population_rate") {
    errors.push(...requireTimeUnit(
      asRecord(data.binEdges),
      ["data", "binEdges"],
      "pre-binned axis"
    ));
  }
  return errors;
}
function weightTraceContextualUnits(context) {
  if (context.skillId !== "network.synaptic_weight_trace") return [];
  const data = asRecord(context.request.data) ?? {};
  const errors = [];
  const series = asArray(data.series) ?? [];
  for (let index = 0; index < series.length; index++) {
    const entry = asRecord(series[index]);
    if (!entry) continue;
    errors.push(...requireTimeUnit(
      asRecord(entry.recordedInterval),
      ["data", "series", index, "recordedInterval"],
      `series ${index}'s recordedInterval`
    ));
    const valueUnit = legalKnownUnit(asRecord(entry.values));
    if (valueUnit === void 0) continue;
    const references = [
      {
        node: asRecord(asRecord(entry.initialWeight)?.quantity),
        path: ["data", "series", index, "initialWeight", "quantity"],
        label: "initial weight"
      },
      {
        node: asRecord(asRecord(entry.bounds)?.lower),
        path: ["data", "series", index, "bounds", "lower"],
        label: "lower bound"
      },
      {
        node: asRecord(asRecord(entry.bounds)?.upper),
        path: ["data", "series", index, "bounds", "upper"],
        label: "upper bound"
      }
    ];
    for (const reference of references) {
      const unit = legalKnownUnit(reference.node);
      if (unit === void 0 || unitsCanShareBoundAxis(unit, valueUnit)) continue;
      errors.push(contextualMismatch(
        [...reference.path, "unit"],
        `series ${index}'s ${reference.label} is in "${unit}" but its observed weights are in "${valueUnit}". A reference line must be convertible onto the weight axis; simulator-defined weights require exact code identity.`
      ));
    }
  }
  errors.push(...requireTimeUnit(
    asRecord(data.membership),
    ["data", "membership"],
    "aggregate membership"
  ));
  return errors;
}
function weightDistributionContextualUnits(context) {
  if (context.skillId !== "network.weight_distribution") return [];
  const data = asRecord(context.request.data) ?? {};
  if (data.mode === "prebinned") {
    const binEdges = asRecord(data.binEdges);
    const unit = asString(binEdges?.unit);
    if (unit === void 0 || !isKnownUnit(unit)) return [];
    const dimension = dimensionOf(unit);
    if (dimension !== void 0 && kindAcceptsDimension("synaptic_weight", dimension)) return [];
    return [contextualMismatch(
      ["data", "binEdges", "unit"],
      `pre-binned weight edges are a synaptic-weight axis, but "${unit}" has dimension ${String(dimension)}. Synaptic weights accept only the registry dimensions declared for kind "synaptic_weight".`
    )];
  }
  if (data.mode === "connections") {
    const parameters = asRecord(context.request.parameters) ?? {};
    const binUnit = asString(asRecord(parameters.bins)?.unit);
    const weightUnit = legalKnownUnit(asRecord(asRecord(data.connections)?.weights));
    if (binUnit === void 0 || !isKnownUnit(binUnit) || weightUnit === void 0 || unitsCanShareBoundAxis(binUnit, weightUnit)) return [];
    return [contextualMismatch(
      ["parameters", "bins", "unit"],
      `connection-weight bins are in "${binUnit}" but the observed weights are in "${weightUnit}". Bin edges must be convertible onto the observed weight axis; simulator-defined weights require exact code identity.`
    )];
  }
  return [];
}
function multisignalPanelContextualUnits(context) {
  if (context.skillId !== "neuro.multisignal_trace") return [];
  const data = asRecord(context.request.data) ?? {};
  const parameters = asRecord(context.request.parameters) ?? {};
  const series = asArray(data.series) ?? [];
  const panels = asArray(parameters.panels) ?? [];
  const normalized = parameters.layout === "normalized_overlay";
  const errors = [];
  for (let panelIndex = 0; panelIndex < panels.length; panelIndex++) {
    const panel = asRecord(panels[panelIndex]);
    const panelId = asString(panel?.panelId);
    const panelUnit = legalKnownUnit(panel);
    if (panelId === void 0 || panelUnit === void 0) continue;
    const members = series.flatMap((candidate, seriesIndex) => {
      const entry = asRecord(candidate);
      if (asString(entry?.panelId) !== panelId) return [];
      const unit = legalKnownUnit(asRecord(entry?.values));
      return unit === void 0 ? [] : [{ seriesIndex, unit }];
    });
    if (normalized) {
      for (const member of members) {
        if (dimensionOf(member.unit) !== "simulator_defined") continue;
        errors.push(contextualMismatch(
          ["data", "series", member.seriesIndex, "values", "unit"],
          `series ${member.seriesIndex} uses simulator-defined unit "${member.unit}", which has no portable affine normalization. A normalized overlay may compare independently normalized physical quantities, never an opaque model-defined scale.`
        ));
      }
      continue;
    }
    const simulatorMembers = members.filter(
      (member) => dimensionOf(member.unit) === "simulator_defined"
    );
    if (simulatorMembers.length > 0 && members.length !== 1) {
      errors.push(contextualMismatch(
        ["parameters", "panels", panelIndex, "unit"],
        `panel "${panelId}" contains a simulator-defined quantity and ${members.length} total series. An opaque model-defined unit must occupy a panel alone because its code establishes no cross-series comparability.`
      ));
      continue;
    }
    for (const member of members) {
      if (unitsCanShareBoundAxis(member.unit, panelUnit)) continue;
      errors.push(contextualMismatch(
        ["parameters", "panels", panelIndex, "unit"],
        `panel "${panelId}" displays unit "${panelUnit}" but series ${member.seriesIndex} is in "${member.unit}". A panel may change scale within one registered dimension, never physical meaning.`
      ));
      break;
    }
  }
  return errors;
}
function phasePlaneContextualUnits(context) {
  if (context.skillId !== "neuro.phase_plane") return [];
  const data = asRecord(context.request.data) ?? {};
  const axes = asRecord(data.axes) ?? {};
  const trajectories = asRecord(data.trajectories);
  const vectorField = asRecord(data.vectorField);
  const fieldDomain = asRecord(vectorField?.domain);
  const nullclines = asRecord(data.nullclines);
  const fixedPoints = asRecord(data.fixedPoints);
  const errors = [];
  for (const coordinate of ["x", "y"]) {
    const axisUnit = legalKnownUnit(asRecord(axes[coordinate]));
    if (axisUnit === void 0) continue;
    const carriers = [
      {
        node: asRecord(trajectories?.[coordinate]),
        path: ["data", "trajectories", coordinate],
        label: "trajectory coordinates"
      },
      {
        node: asRecord(vectorField?.[coordinate]),
        path: ["data", "vectorField", coordinate],
        label: "vector-field coordinates"
      },
      {
        node: asRecord(fieldDomain?.[coordinate]),
        path: ["data", "vectorField", "domain", coordinate],
        label: "vector-field domain"
      },
      {
        node: asRecord(nullclines?.[coordinate]),
        path: ["data", "nullclines", coordinate],
        label: "nullcline coordinates"
      },
      {
        node: asRecord(fixedPoints?.[coordinate]),
        path: ["data", "fixedPoints", coordinate],
        label: "fixed-point coordinates"
      }
    ];
    for (const carrier of carriers) {
      const unit = legalKnownUnit(carrier.node);
      if (unit === void 0 || unitsCanShareBoundAxis(unit, axisUnit)) continue;
      errors.push(contextualMismatch(
        [...carrier.path, "unit"],
        `phase-plane ${coordinate}-axis unit "${axisUnit}" is incompatible with ${carrier.label} in "${unit}". Every state-space carrier must be convertible onto the axis it inhabits.`
      ));
    }
  }
  return errors;
}
function bindUncertaintyUnit(errors, uncertainty, values, path, label) {
  const uncertaintyUnit = legalKnownUnit(uncertainty);
  const valueUnit = legalKnownUnit(values);
  if (uncertaintyUnit === void 0 || valueUnit === void 0 || unitsCanShareBoundAxis(uncertaintyUnit, valueUnit)) return;
  errors.push(contextualMismatch(
    [...path, "unit"],
    `${label} is in "${uncertaintyUnit}" but qualifies values in "${valueUnit}". A dispersion or interval bound has the same physical dimension as the estimate it qualifies.`
  ));
}
function traceUncertaintyContextualUnits(context) {
  const data = asRecord(context.request.data) ?? {};
  const parameters = asRecord(context.request.parameters) ?? {};
  const errors = [];
  if (context.skillId === "neuro.multisignal_trace") {
    const series = asArray(data.series) ?? [];
    for (let index = 0; index < series.length; index++) {
      const entry = asRecord(series[index]);
      bindUncertaintyUnit(
        errors,
        asRecord(entry?.uncertainty),
        asRecord(entry?.values),
        ["data", "series", index, "uncertainty"],
        `series ${index}'s uncertainty`
      );
    }
    return errors;
  }
  if (context.skillId === "network.synaptic_weight_trace") {
    const series = asArray(data.series) ?? [];
    for (let index = 0; index < series.length; index++) {
      const entry = asRecord(series[index]);
      bindUncertaintyUnit(
        errors,
        asRecord(entry?.uncertainty),
        asRecord(entry?.values),
        ["data", "series", index, "uncertainty"],
        `series ${index}'s uncertainty`
      );
    }
    const aggregate = asRecord(data.aggregate);
    bindUncertaintyUnit(
      errors,
      asRecord(aggregate?.uncertainty),
      asRecord(aggregate?.values),
      ["data", "aggregate", "uncertainty"],
      "aggregate uncertainty"
    );
    return errors;
  }
  if (context.skillId === "neuro.analog_trace" || context.skillId === "neuro.compartment_trace") {
    const uncertainty = asRecord(parameters.uncertainty);
    const series = asArray(data.series) ?? [];
    for (let index = 0; index < series.length; index++) {
      const previousErrorCount = errors.length;
      bindUncertaintyUnit(
        errors,
        uncertainty,
        asRecord(asRecord(series[index])?.values),
        ["parameters", "uncertainty"],
        `figure uncertainty for series ${index}`
      );
      if (errors.length > previousErrorCount) break;
    }
  }
  return errors;
}
function contextualUnitDimensionErrors(context) {
  return [
    ...timeAxisContextualUnits(context),
    ...weightTraceContextualUnits(context),
    ...weightDistributionContextualUnits(context),
    ...multisignalPanelContextualUnits(context),
    ...phasePlaneContextualUnits(context),
    ...traceUncertaintyContextualUnits(context)
  ];
}
var unitDimensionMatch = (context) => {
  const quantities = [];
  collectQuantities(context.request, [], quantities);
  const errors = [];
  for (const quantity of quantities) {
    errors.push(
      ...checkQuantityUnit(
        quantity.kind,
        quantity.unit,
        [...quantity.path, "unit"],
        "unit.dimension_match"
      )
    );
  }
  errors.push(...contextualUnitDimensionErrors(context));
  return errors;
};
var unitCanonicalCode = (context) => {
  const bare = [];
  collectBareUnits(context.request, [], bare);
  const errors = [];
  for (const entry of bare) {
    if (isKnownUnit(entry.unit)) continue;
    const at = entry.path.map((segment) => `/${String(segment).replace(/~/g, "~0").replace(/\//g, "~1")}`).join("");
    const canonical = resolveAlias(entry.unit);
    if (canonical !== void 0) {
      errors.push(
        makeError({
          code: "SCIENCE_UNIT_ALIAS_NOT_CANONICAL",
          stage: "science",
          instancePath: at,
          validatorId: "unit.canonical_code",
          message: `"${entry.unit}" is an accepted alias, not a canonical code. Use "${canonical}". Cortexel does not convert it silently: a conversion the caller never sees is a number the caller never checked.`,
          repair: {
            operation: "replace",
            path: at,
            value: canonical,
            reasonCode: "SCIENCE_UNIT_ALIAS_NOT_CANONICAL"
          }
        })
      );
    } else {
      errors.push(
        makeError({
          code: "SCHEMA_ENUM_MISMATCH",
          stage: "structural",
          instancePath: at,
          validatorId: "unit.canonical_code",
          message: `"${entry.unit}" is not a unit code in the registry.`
        })
      );
    }
  }
  return errors;
};

// src/core/semantics/structure.ts
var seriesEqualLength = (context) => {
  const groups = context.parameters?.groups;
  if (!Array.isArray(groups)) return [];
  const errors = [];
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    const present = [];
    for (const jsonPointer of group) {
      if (typeof jsonPointer !== "string") continue;
      const value = readPointer(context.request, jsonPointer);
      const array = asArray(value);
      if (array === void 0) continue;
      present.push({ path: jsonPointer, length: array.length });
    }
    if (present.length < 2) continue;
    const expected = present[0];
    for (const entry of present.slice(1)) {
      if (entry.length !== expected.length) {
        errors.push(
          makeError({
            code: "SEMANTIC_LENGTH_MISMATCH",
            stage: "semantic",
            instancePath: entry.path,
            validatorId: "series.equal_length",
            message: `this array has ${entry.length} entries but ${expected.path} has ${expected.length}. They describe the same observations, so they must have the same length; Cortexel does not pair values with times by best effort.`
          })
        );
      }
    }
  }
  return errors;
};
var idsUnique = (context) => {
  const pointers = context.parameters?.pointers;
  if (!Array.isArray(pointers)) return [];
  const errors = [];
  for (const jsonPointer of pointers) {
    if (typeof jsonPointer !== "string") continue;
    const array = asArray(readPointer(context.request, jsonPointer));
    if (array === void 0) continue;
    const seen = /* @__PURE__ */ new Map();
    for (let index = 0; index < array.length; index++) {
      const id = array[index];
      if (typeof id !== "string") continue;
      const first = seen.get(id);
      if (first !== void 0) {
        errors.push(
          makeError({
            code: "SEMANTIC_DUPLICATE_ID",
            stage: "semantic",
            instancePath: `${jsonPointer}/${index}`,
            validatorId: "ids.unique",
            message: `the id "${id}" already appears at index ${first}. An ambiguous identity must fail here, before selection or edge binding can resolve it two different ways.`
          })
        );
        continue;
      }
      seen.set(id, index);
    }
  }
  return errors;
};
function checkReferencesInUniverse(referenced, universe, referencedPath, validatorId, universeDescription) {
  const errors = [];
  const reported = /* @__PURE__ */ new Set();
  for (let index = 0; index < referenced.length; index++) {
    const id = referenced[index];
    if (typeof id !== "string" || universe.has(id) || reported.has(id)) continue;
    reported.add(id);
    errors.push(
      makeError({
        code: "SEMANTIC_UNKNOWN_REFERENCE",
        stage: "semantic",
        instancePath: pointer(...referencedPath, index),
        validatorId,
        message: `"${id}" is not in ${universeDescription}. Cortexel does not silently extend a universe you declared complete \u2014 a member that was supposedly not there cannot have produced an observation.`
      })
    );
    if (reported.size >= 8) break;
  }
  return errors;
}

// src/core/semantics/events.ts
function resolveBinEdges(spec) {
  if (!spec) return void 0;
  const mode = asString(spec.mode);
  if (mode === "edges") {
    const edges = asArray(spec.edges);
    if (!edges) return void 0;
    const numeric = edges.map(asNumber);
    return numeric.every((value) => value !== void 0) ? numeric : void 0;
  }
  if (mode === "width") {
    const width = asNumber(spec.width);
    const start = asNumber(spec.start);
    const stop = asNumber(spec.stop);
    if (width === void 0 || start === void 0 || stop === void 0) return void 0;
    if (!(width > 0) || !(stop > start)) return void 0;
    const result = materializeWidthBins(start, stop, width);
    return result.ok ? [...result.edges] : void 0;
  }
  return void 0;
}
function populationRateBinsBindWindow(context) {
  if (context.skillId !== "neuro.population_rate") return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const window = asRecord(data.window);
  const windowStart = asNumber(window?.start);
  const windowStop = asNumber(window?.stop);
  const windowUnit = asString(window?.unit);
  if (windowStart === void 0 || windowStop === void 0 || !windowUnit) return [];
  let firstEdge;
  let lastEdge;
  let binUnit;
  let firstPath;
  let lastPath;
  if (asString(data.mode) === "events") {
    const bins = asRecord(parameters.bins);
    binUnit = asString(bins?.unit);
    if (asString(bins?.mode) === "width") {
      firstEdge = asNumber(bins?.start);
      lastEdge = asNumber(bins?.stop);
      firstPath = ["parameters", "bins", "start"];
      lastPath = ["parameters", "bins", "stop"];
    } else {
      const edgeValues = asArray(bins?.edges);
      firstEdge = asNumber(edgeValues?.[0]);
      lastEdge = asNumber(edgeValues?.[Math.max(0, (edgeValues?.length ?? 1) - 1)]);
      firstPath = ["parameters", "bins", "edges", 0];
      lastPath = ["parameters", "bins", "edges", Math.max(0, (edgeValues?.length ?? 1) - 1)];
    }
  } else if (asString(data.mode) === "prebinned") {
    const binEdges = asRecord(data.binEdges);
    const edgeValues = asArray(binEdges?.edges);
    firstEdge = asNumber(edgeValues?.[0]);
    lastEdge = asNumber(edgeValues?.[Math.max(0, (edgeValues?.length ?? 1) - 1)]);
    binUnit = asString(binEdges?.unit);
    firstPath = ["data", "binEdges", "edges", 0];
    lastPath = ["data", "binEdges", "edges", Math.max(0, (edgeValues?.length ?? 1) - 1)];
  } else {
    return [];
  }
  if (firstEdge === void 0 || lastEdge === void 0 || !binUnit) return [];
  const errors = [];
  const checks = [
    {
      edge: firstEdge,
      windowValue: windowStart,
      windowName: "start",
      at: firstPath
    },
    {
      edge: lastEdge,
      windowValue: windowStop,
      windowName: "stop",
      at: lastPath
    }
  ];
  for (const check of checks) {
    let comparison;
    try {
      comparison = compareExactUnitSumToValue(
        [{ value: check.edge, unit: binUnit }],
        { value: check.windowValue, unit: windowUnit }
      );
    } catch {
      continue;
    }
    if (comparison === 0) continue;
    errors.push(
      makeError({
        code: "SCIENCE_BIN_EDGES_INVALID",
        stage: "science",
        instancePath: pointer(...check.at),
        validatorId: "bins.strictly_increasing",
        message: `population-rate bins must tile exactly the declared observation window: the ${check.windowName} bin edge ${check.edge} ${binUnit} is not exactly equal to window ${check.windowName} ${check.windowValue} ${windowUnit}. Rounded unit conversion is not sufficient because it can conceal a real boundary mismatch.`
      })
    );
  }
  return errors;
}
var binsStrictlyIncreasing = (context) => {
  const errors = [];
  const check = (edges, at) => {
    const array = asArray(edges);
    if (!array) return;
    for (let i = 0; i < array.length; i++) {
      const value = asNumber(array[i]);
      if (value === void 0) {
        errors.push(
          makeError({
            code: "SCIENCE_BIN_EDGES_INVALID",
            stage: "science",
            instancePath: pointer(...at, i),
            validatorId: "bins.strictly_increasing",
            message: "a bin edge must be a finite number."
          })
        );
        return;
      }
      if (i > 0) {
        const previous = asNumber(array[i - 1]);
        if (previous !== void 0 && !(value > previous)) {
          errors.push(
            makeError({
              code: "SCIENCE_BIN_EDGES_INVALID",
              stage: "science",
              instancePath: pointer(...at, i),
              validatorId: "bins.strictly_increasing",
              message: `bin edges must be strictly increasing: edge ${i} (${value}) is not greater than edge ${i - 1} (${previous}). A zero-width or inverted bin has no meaning.`
            })
          );
          return;
        }
      }
    }
  };
  const data = getData(context);
  const parameters = getParameters(context);
  check(asRecord(data.binEdges)?.edges, ["data", "binEdges", "edges"]);
  check(asRecord(parameters.bins)?.edges, ["parameters", "bins", "edges"]);
  for (const [container, at] of [
    [asRecord(parameters.bins), ["parameters", "bins"]]
  ]) {
    if (!container || asString(container.mode) !== "width") continue;
    const width = asNumber(container.width);
    const start = asNumber(container.start);
    const stop = asNumber(container.stop);
    if (width !== void 0 && !(width > 0)) {
      errors.push(
        makeError({
          code: "SCIENCE_BIN_EDGES_INVALID",
          stage: "science",
          instancePath: pointer(...at, "width"),
          validatorId: "bins.strictly_increasing",
          message: "the bin width must be positive."
        })
      );
    }
    if (start !== void 0 && stop !== void 0 && !(stop > start)) {
      errors.push(
        makeError({
          code: "SCIENCE_BIN_EDGES_INVALID",
          stage: "science",
          instancePath: pointer(...at, "stop"),
          validatorId: "bins.strictly_increasing",
          message: "the binned range must be non-empty: stop must be greater than start."
        })
      );
    }
    if (width !== void 0 && start !== void 0 && stop !== void 0 && width > 0 && stop > start) {
      const materialized = materializeWidthBins(start, stop, width);
      if (!materialized.ok) {
        errors.push(
          makeError({
            code: "SCIENCE_BIN_EDGES_INVALID",
            stage: "science",
            instancePath: pointer(...at, "width"),
            validatorId: "bins.strictly_increasing",
            message: `the width-mode specification cannot be materialized as at most ${MAX_MATERIALIZED_BINS} strictly increasing binary64 bins over the declared range. Increase the width or use explicit edges.`
          })
        );
      }
    }
  }
  errors.push(...populationRateBinsBindWindow(context));
  return errors;
};
var windowValid = (context) => {
  const at = asString(context.parameters?.pointer) ?? "/data/window";
  const window = asRecord(readPointer(context.request, at));
  if (!window) return [];
  const originRelative = asString(window.kind) === "nest_recording_device_origin_relative";
  const origin = asNumber(window.origin);
  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  const unit = asString(window.unit);
  const unitDimension = asString(context.parameters?.unitDimension);
  if (unit !== void 0 && isKnownUnit(unit) && unitDimension !== void 0 && dimensionOf(unit) !== unitDimension) {
    return [
      makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: `${at}/unit`,
        validatorId: "window.valid",
        message: `this interval requires unit dimension ${JSON.stringify(unitDimension)}; got ${JSON.stringify(unit)} with dimension ${JSON.stringify(dimensionOf(unit))}.`
      })
    ];
  }
  for (const [name, value] of [
    ...originRelative ? [["origin", window.origin]] : [],
    ["start", window.start],
    ["stop", window.stop]
  ]) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return [
        makeError({
          code: "SCIENCE_WINDOW_INVALID",
          stage: "science",
          instancePath: `${at}/${name}`,
          validatorId: "window.valid",
          message: `the observation-window ${name} must be finite.`
        })
      ];
    }
  }
  if (originRelative && origin === void 0) return [];
  if (start === void 0 || stop === void 0) return [];
  if (!(stop > start)) {
    return [
      makeError({
        code: "SCIENCE_WINDOW_INVALID",
        stage: "science",
        instancePath: `${at}/stop`,
        validatorId: "window.valid",
        message: `the observation window is empty or inverted (start ${start}, stop ${stop}). It must satisfy start < stop.`
      })
    ];
  }
  if (originRelative && unit) {
    try {
      const displayedStart = convertExactUnitSum(
        [
          { value: origin, unit },
          { value: start, unit }
        ],
        unit
      );
      const displayedStop = convertExactUnitSum(
        [
          { value: origin, unit },
          { value: stop, unit }
        ],
        unit
      );
      if (!Number.isFinite(displayedStart) || !Number.isFinite(displayedStop) || !(displayedStop > displayedStart)) {
        return [
          makeError({
            code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
            stage: "science",
            instancePath: `${at}/stop`,
            validatorId: "window.valid",
            message: `the exact NEST endpoints origin + start and origin + stop do not remain finite and strictly ordered when rounded once into ${unit} for display. Preserve a better-scaled clock segment; Cortexel will not draw a collapsed interval.`
          })
        ];
      }
    } catch (error) {
      if (dimensionOf(unit) !== "time") return [];
      const message = error instanceof Error ? error.message : "exact endpoint conversion failed";
      return [
        makeError({
          code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          stage: "science",
          instancePath: `${at}/stop`,
          validatorId: "window.valid",
          message: `the exact NEST endpoints origin + start and origin + stop cannot be represented as finite, strictly ordered ${unit} display values: ${message}`
        })
      ];
    }
  }
  return [];
};
var eventsWithinWindow = (context) => {
  const data = getData(context);
  const window = asRecord(data.window);
  if (!window) return [];
  const originRelative = asString(window.kind) === "nest_recording_device_origin_relative";
  const origin = asNumber(window.origin);
  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  if (start === void 0 || stop === void 0 || originRelative && origin === void 0) {
    return [];
  }
  if (!(stop > start)) return [];
  const eventTimes = asRecord(data.eventTimes);
  const times = asArray(eventTimes?.values);
  if (!times) return [];
  const eventUnit = legalKnownUnit(eventTimes);
  const windowUnit = asString(window.unit);
  if (!eventUnit || !windowUnit || !isKnownUnit(windowUnit) || dimensionOf(windowUnit) !== "time") return [];
  const lowerTerms = originRelative ? [
    { value: origin, unit: windowUnit },
    { value: start, unit: windowUnit }
  ] : [{ value: start, unit: windowUnit }];
  const upperTerms = originRelative ? [
    { value: origin, unit: windowUnit },
    { value: stop, unit: windowUnit }
  ] : [{ value: stop, unit: windowUnit }];
  const boundary = originRelative ? "(origin+start,origin+stop]" : asString(window.boundary);
  const openStart = boundary === "(start,stop]" || boundary === "(origin+start,origin+stop]";
  const closedStop = boundary === "[start,stop]" || boundary === "(start,stop]" || boundary === "(origin+start,origin+stop]";
  if (originRelative) {
    try {
      const displayedStart = convertExactUnitSum(lowerTerms, windowUnit);
      const displayedStop = convertExactUnitSum(upperTerms, windowUnit);
      if (!Number.isFinite(displayedStart) || !Number.isFinite(displayedStop) || !(displayedStop > displayedStart)) {
        return [];
      }
    } catch {
      return [];
    }
  }
  let outside = 0;
  let firstIndex = -1;
  for (let i = 0; i < times.length; i++) {
    const time = asNumber(times[i]);
    if (time === void 0) continue;
    let beforeStart;
    let beyondStop;
    try {
      const lowerComparedWithEvent = compareExactUnitSumToValue(
        lowerTerms,
        { value: time, unit: eventUnit }
      );
      const upperComparedWithEvent = compareExactUnitSumToValue(
        upperTerms,
        { value: time, unit: eventUnit }
      );
      beforeStart = openStart ? lowerComparedWithEvent >= 0 : lowerComparedWithEvent > 0;
      beyondStop = closedStop ? upperComparedWithEvent < 0 : upperComparedWithEvent <= 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : "event-time unit conversion failed";
      const numericResolution = message.includes("overflowed") || message.includes("underflowed");
      return [
        makeError({
          code: numericResolution ? "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE" : "SCIENCE_UNIT_DIMENSION_MISMATCH",
          stage: "science",
          instancePath: pointer("data", "eventTimes", "values", i),
          validatorId: "events.within_window",
          message: numericResolution ? `event ${i} cannot be converted from ${eventUnit} to ${windowUnit} without overflowing or underflowing finite binary64, so its window membership is not representable.` : `event times in ${eventUnit} cannot be compared with a window in ${windowUnit}: ${message}`
        })
      ];
    }
    if (beforeStart || beyondStop) {
      outside++;
      if (firstIndex < 0) firstIndex = i;
    }
  }
  if (outside === 0) return [];
  if (asString(getParameters(context).outOfWindowPolicy) === "exclude_and_disclose") return [];
  const windowDescription = originRelative ? `(origin ${origin} + start ${start}, origin ${origin} + stop ${stop}] ${windowUnit}` : `${boundary ?? "[start,stop)"} with start ${start}, stop ${stop} ${windowUnit}`;
  return [
    makeError({
      code: "SCIENCE_EVENT_OUT_OF_WINDOW",
      stage: "science",
      instancePath: pointer("data", "eventTimes", "values", firstIndex),
      validatorId: "events.within_window",
      message: `${outside} of ${times.length} events fall outside the declared window ${windowDescription} under exact comparison with the event clock in ${eventUnit}. Widen the window or choose exclude_and_disclose; Cortexel will not quietly ignore an observation you supplied.`
    })
  ];
};
var eventsSourceClockDeclared = (context) => {
  const data = getData(context);
  const window = asRecord(data.window);
  if (!window || asString(window.kind) !== "nest_recording_device_origin_relative") return [];
  const source = asRecord(context.request.source);
  const eventTimes = asRecord(data.eventTimes);
  const version = asString(source?.systemVersion);
  const digest = asString(source?.sourceDigest);
  const checks = [
    {
      valid: asString(source?.kind) === "simulation",
      path: ["source", "kind"],
      message: "a NEST origin-relative event clock requires source.kind = simulation."
    },
    {
      valid: asString(source?.system) === "NEST",
      path: ["source", "system"],
      message: "a NEST origin-relative event clock requires source.system = NEST exactly."
    },
    {
      valid: version !== void 0 && /^3\.(?:9|10)(?:\.[0-9]+)?$/u.test(version),
      path: ["source", "systemVersion"],
      message: "the revision-2 serialized clock profile admits only NEST 3.9, 3.9.x, 3.10, or 3.10.x without a prerelease suffix."
    },
    {
      valid: digest !== void 0 && /^sha256:[0-9a-f]{64}$/u.test(digest),
      path: ["source", "sourceDigest"],
      message: "the exported recorder object must be bound by a full lowercase sha256: sourceDigest."
    },
    {
      valid: asString(window.recordingBackend) === "memory",
      path: ["data", "window", "recordingBackend"],
      message: "revision 2 admits only the NEST memory recording backend."
    },
    {
      valid: asString(window.timeEncoding) === "native_binary64_ms",
      path: ["data", "window", "timeEncoding"],
      message: "revision 2 admits only native_binary64_ms (time_in_steps=false), not reconstructed step/offset clocks."
    },
    {
      valid: asString(eventTimes?.unit) === "ms",
      path: ["data", "eventTimes", "unit"],
      message: "a NEST native-binary64 memory clock must retain its serialized event unit ms."
    },
    {
      valid: asString(data.timeBase) === "absolute_clock",
      path: ["data", "timeBase"],
      message: "a NEST origin-relative recorder clock is an absolute source clock and cannot be relabelled trial_relative."
    }
  ];
  return checks.filter((check) => !check.valid).map(
    (check) => makeError({
      code: "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
      stage: "provenance",
      instancePath: pointer(...check.path),
      validatorId: "events.source_clock_declared",
      message: check.message
    })
  );
};
var eventsSenderUniverseDeclared = (context) => {
  const data = getData(context);
  const recorded = asArray(data.recordedSenderIds);
  const senders = asArray(data.eventSenderIds);
  if (recorded === void 0) return [];
  if (recorded.length === 0) {
    return [
      makeError({
        code: "SCIENCE_POPULATION_UNIVERSE_REQUIRED",
        stage: "science",
        instancePath: pointer("data", "recordedSenderIds"),
        validatorId: "events.sender_universe_declared",
        message: "the recorded-sender universe is empty. A per-neuron rate has no denominator without it, and Cortexel will not count the senders that happened to spike instead \u2014 a silent neuron is still a recorded neuron."
      })
    ];
  }
  if (!senders) return [];
  const universe = new Set(recorded.filter((id) => typeof id === "string"));
  return checkReferencesInUniverse(
    senders,
    universe,
    ["data", "eventSenderIds"],
    "events.sender_universe_declared",
    "the declared recorded-sender universe"
  );
};
var eventsTrialUniverseDeclared = (context) => {
  const data = getData(context);
  const declaredCount = asNumber(data.trialCount);
  const trialIds = asArray(data.trialIds);
  const eventTrialIds = asArray(data.eventTrialIds);
  if (declaredCount === void 0 && trialIds === void 0) {
    if (eventTrialIds !== void 0) {
      return [
        makeError({
          code: "SCIENCE_TRIAL_UNIVERSE_REQUIRED",
          stage: "science",
          instancePath: pointer("data"),
          validatorId: "events.trial_universe_declared",
          message: "events carry trial ids but no trial universe or count was declared. Cortexel does not infer the trial count from the observed ids: a trial with no events is still a trial, and omitting it inflates every per-trial value."
        })
      ];
    }
    return [];
  }
  if (trialIds !== void 0 && eventTrialIds !== void 0) {
    const universe = new Set(trialIds.filter((id) => typeof id === "string"));
    return checkReferencesInUniverse(
      eventTrialIds,
      universe,
      ["data", "eventTrialIds"],
      "events.trial_universe_declared",
      "the declared trial universe"
    );
  }
  return [];
};
var rateDenominatorPositive = (context) => {
  const data = getData(context);
  const count = asNumber(data.recordedSenderCount);
  if (count === void 0) return [];
  if (!Number.isSafeInteger(count) || count < 1) {
    return [
      makeError({
        code: "SCIENCE_DENOMINATOR_INVALID",
        stage: "science",
        instancePath: pointer("data", "recordedSenderCount"),
        validatorId: "rate.denominator_positive",
        message: `the recorded-sender count must be a positive safe integer; got ${count}. Counts above Number.MAX_SAFE_INTEGER cannot be represented as arbitrary exact JSON integers.`
      })
    ];
  }
  return [];
};
function histogramBinUnitIsIndividuallyLegal(context, binUnit) {
  if (binUnit === void 0 || !isKnownUnit(binUnit)) return false;
  if (context.skillId === "network.delay_distribution" || context.skillId === "neuro.isi_distribution") return dimensionOf(binUnit) === "time";
  if (context.skillId !== "network.weight_distribution") return true;
  const data = getData(context);
  if (asString(data.mode) === "prebinned") {
    const dimension = dimensionOf(binUnit);
    return dimension !== void 0 && kindAcceptsDimension("synaptic_weight", dimension);
  }
  const connections = asRecord(data.connections);
  const weightUnit = legalKnownUnit(asRecord(connections?.weights));
  return weightUnit !== void 0 && (weightUnit === binUnit || axesAreCompatible(weightUnit, binUnit));
}
var histogramNormalizationConsistent = (context) => {
  const data = getData(context);
  const parameters = getParameters(context);
  const normalization = asString(parameters.normalization);
  if (!normalization) return [];
  const values = asArray(data.values) ?? asArray(asRecord(data.histogram)?.values);
  const valuesAtHistogram = asArray(asRecord(data.histogram)?.values) !== void 0;
  const edges = asArray(asRecord(data.binEdges)?.edges) ?? resolveBinEdges(asRecord(parameters.bins));
  const binUnit = asString(asRecord(data.binEdges)?.unit) ?? asString(asRecord(parameters.bins)?.unit);
  const legalBinUnit = histogramBinUnitIsIndividuallyLegal(context, binUnit) ? binUnit : void 0;
  const histogramUnit = asString(asRecord(data.histogram)?.unit);
  const legalHistogramUnit = legalKnownUnit(asRecord(data.histogram));
  const valuePath = valuesAtHistogram ? ["data", "histogram", "values"] : ["data", "values"];
  if (!values || !edges || values.length === 0) return [];
  if (edges.length !== values.length + 1) return [];
  const errors = [];
  if (normalization === "count") {
    for (let i = 0; i < values.length; i++) {
      const value = asNumber(values[i]);
      if (value === void 0) continue;
      if (!Number.isSafeInteger(value) || value < 0) {
        errors.push(
          makeError({
            code: "SCIENCE_COUNT_NOT_INTEGER",
            stage: "science",
            instancePath: pointer(...valuePath, i),
            validatorId: "histogram.normalization_consistent",
            message: `a count must be an exact non-negative integer; got ${value}.`
          })
        );
      }
    }
    return errors;
  }
  if (normalization === "density" && legalBinUnit !== void 0 && reciprocalUnit(legalBinUnit) !== void 0 && histogramUnit !== void 0 && legalHistogramUnit !== void 0 && reciprocalUnit(legalBinUnit) !== legalHistogramUnit) {
    errors.push(
      makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("data", "histogram", "unit"),
        validatorId: "histogram.normalization_consistent",
        message: `a density over bins in ${legalBinUnit} must use the registered reciprocal unit ${String(reciprocalUnit(legalBinUnit))}; got ${histogramUnit}.`
      })
    );
  }
  const probabilities = [];
  let exactIntegralUnits = 0n;
  let anyValue = false;
  for (let i = 0; i < values.length; i++) {
    const value = asNumber(values[i]);
    if (value === void 0) continue;
    anyValue = true;
    if (value < 0) {
      errors.push(
        makeError({
          code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          stage: "science",
          instancePath: pointer(...valuePath, i),
          validatorId: "histogram.normalization_consistent",
          message: `${normalization} values must be non-negative; got ${value}.`
        })
      );
      continue;
    }
    if (normalization === "probability") {
      probabilities.push(value);
    } else {
      const lo = asNumber(edges[i]);
      const hi = asNumber(edges[i + 1]);
      if (lo === void 0 || hi === void 0) return errors;
      const widthUnits = finiteBinary64ToMinSubnormalUnits(hi) - finiteBinary64ToMinSubnormalUnits(lo);
      exactIntegralUnits += finiteBinary64ToMinSubnormalUnits(value) * widthUnits;
    }
  }
  if (!anyValue) return errors;
  let total;
  try {
    total = normalization === "probability" ? exactBinary64Sum(probabilities) : exactRationalToBinary64(exactIntegralUnits, 1n, -2148);
  } catch {
    errors.push(
      makeError({
        code: normalization === "density" ? "SCIENCE_DENSITY_DOES_NOT_INTEGRATE" : "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        stage: "science",
        instancePath: pointer(...valuePath),
        validatorId: "histogram.normalization_consistent",
        message: `the ${normalization} total is outside the finite binary64 range and cannot be verified.`
      })
    );
    return errors;
  }
  if (Math.abs(total - 1) > 1e-6) {
    errors.push(
      makeError({
        code: normalization === "density" ? "SCIENCE_DENSITY_DOES_NOT_INTEGRATE" : "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        stage: "science",
        instancePath: pointer(...valuePath),
        validatorId: "histogram.normalization_consistent",
        message: normalization === "density" ? `a density must integrate to 1 over its bin widths, but sum(value x binWidth) = ${total}. Note that this is NOT the same as sum(value): with unequal bin widths the two differ, and only the integral is the density.` : `a probability histogram must sum to 1, but these values sum to ${total}.`
      })
    );
  }
  return errors;
};

// src/core/semantics/spikes.ts
var psthAlignmentDeclared = (context) => {
  const data = getData(context);
  const parameters = getParameters(context);
  const errors = [];
  const alignment = data.alignmentTimes ?? parameters.alignmentTimes;
  if (alignment === void 0) {
    errors.push(
      makeError({
        code: "SCIENCE_TRIAL_UNIVERSE_REQUIRED",
        stage: "science",
        instancePath: pointer("data", "alignmentTimes"),
        validatorId: "psth.alignment_declared",
        message: "a PSTH needs an alignment reference per trial. Without it there is nothing for time zero to mean."
      })
    );
  }
  const trialCount = asNumber(data.trialCount) ?? asArray(data.trialIds)?.length;
  if (trialCount !== void 0 && trialCount < 1) {
    errors.push(
      makeError({
        code: "SCIENCE_DENOMINATOR_INVALID",
        stage: "science",
        instancePath: pointer("data", "trialCount"),
        validatorId: "psth.alignment_declared",
        message: "the trial count must be at least 1 to normalize per trial."
      })
    );
  }
  const alignmentUnit = asString(data.alignmentUnit);
  if (alignmentUnit !== void 0 && isKnownUnit(alignmentUnit) && dimensionOf(alignmentUnit) !== "time") {
    errors.push(
      makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("data", "alignmentUnit"),
        validatorId: "psth.alignment_declared",
        message: `PSTH alignment times require a registered time unit; got ${alignmentUnit}.`
      })
    );
  }
  const binUnit = asString(asRecord(parameters.bins)?.unit);
  if (binUnit !== void 0 && isKnownUnit(binUnit) && dimensionOf(binUnit) !== "time") {
    errors.push(
      makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("parameters", "bins", "unit"),
        validatorId: "psth.alignment_declared",
        message: `PSTH bin coordinates require a registered time unit; got ${binUnit}.`
      })
    );
  }
  return errors;
};
var correlogramLagRangeValid = (context) => {
  const parameters = getParameters(context);
  const errors = [];
  const lagRange = asRecord(parameters.lagRange);
  if (!lagRange) return [];
  const min = asNumber(lagRange.min);
  const max = asNumber(lagRange.max);
  const bins = asRecord(parameters.bins);
  const width = asNumber(bins?.width);
  const lagUnit = asString(lagRange.unit);
  const widthUnit = asString(bins?.unit);
  for (const [path, unit] of [
    [["parameters", "lagRange", "unit"], lagUnit],
    [["parameters", "bins", "unit"], widthUnit]
  ]) {
    if (unit === void 0 || !isKnownUnit(unit) || dimensionOf(unit) === "time") continue;
    errors.push(
      makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer(...path),
        validatorId: "correlogram.lag_range_valid",
        message: `correlogram lag coordinates require a registered time unit; got ${unit}.`
      })
    );
  }
  if (min !== void 0 && max !== void 0 && !(max > min)) {
    errors.push(
      makeError({
        code: "SCIENCE_LAG_RANGE_INVALID",
        stage: "science",
        instancePath: pointer("parameters", "lagRange", "max"),
        validatorId: "correlogram.lag_range_valid",
        message: `the lag range is empty or inverted (min ${min}, max ${max}).`
      })
    );
  }
  if (width !== void 0 && !(width > 0)) {
    errors.push(
      makeError({
        code: "SCIENCE_LAG_RANGE_INVALID",
        stage: "science",
        instancePath: pointer("parameters", "bins", "width"),
        validatorId: "correlogram.lag_range_valid",
        message: "the correlogram bin width must be positive."
      })
    );
  }
  if (min !== void 0 && max !== void 0 && width !== void 0 && max > min && width > 0 && lagUnit !== void 0 && widthUnit !== void 0 && dimensionOf(lagUnit) === "time" && dimensionOf(widthUnit) === "time") {
    try {
      const widthInLagUnit = widthUnit === lagUnit ? width : convert(width, widthUnit, lagUnit);
      const materialized = materializeCenteredLagBins(min, max, widthInLagUnit, 20001);
      if (materialized.ok) return errors;
      errors.push(
        makeError({
          code: "SCIENCE_LAG_RANGE_INVALID",
          stage: "science",
          instancePath: pointer("parameters", "bins", "width"),
          validatorId: "correlogram.lag_range_valid",
          message: "the correlogram lag centres must be symmetric about zero and tauMax/binWidth must be a positive integer producing at most 20001 centred bins with representable half-width outer edges."
        })
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unit conversion failed";
      errors.push(
        makeError({
          code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
          stage: "science",
          instancePath: pointer("parameters", "bins", "unit"),
          validatorId: "correlogram.lag_range_valid",
          message: `the correlogram bin width cannot be compared with the lag range: ${detail}.`
        })
      );
    }
  }
  return errors;
};
function rawCorrelogramTrains(data) {
  if (data.mode === "events_auto") {
    const train = asRecord(data.train);
    return train ? [{ path: ["data", "train"], value: train }] : [];
  }
  if (data.mode === "events_cross") {
    const reference = asRecord(data.referenceTrain);
    const target = asRecord(data.targetTrain);
    return [
      ...reference ? [{ path: ["data", "referenceTrain"], value: reference }] : [],
      ...target ? [{ path: ["data", "targetTrain"], value: target }] : []
    ];
  }
  return [];
}
function trainUniverse(data, name) {
  return asArray(asRecord(data[name])?.recordedSenderIds);
}
var correlogramEventTrainsValid = (context) => {
  const data = getData(context);
  const trains = rawCorrelogramTrains(data);
  if (trains.length === 0) return [];
  const window = asRecord(data.window);
  const start = asNumber(window?.start);
  const stop = asNumber(window?.stop);
  const windowUnit = asString(window?.unit);
  const boundary = asString(window?.boundary);
  const errors = [];
  for (const train of trains) {
    const at = train.path;
    const eventTimes = asRecord(train.value.eventTimes);
    const times = asArray(eventTimes?.values);
    const timeUnit = legalKnownUnit(eventTimes);
    const senders = asArray(train.value.eventSenderIds);
    const eventIds = asArray(train.value.eventIds);
    const recorded = asArray(train.value.recordedSenderIds);
    if (recorded !== void 0 && recorded.length === 0) {
      errors.push(
        makeError({
          code: "SCIENCE_POPULATION_UNIVERSE_REQUIRED",
          stage: "science",
          instancePath: pointer(...at, "recordedSenderIds"),
          validatorId: "correlogram.event_trains_valid",
          message: "a correlogram train must declare at least one recorded sender, including senders that were silent. The event list cannot establish the recorded universe."
        })
      );
    }
    if (times && senders && times.length !== senders.length) {
      errors.push(
        makeError({
          code: "SEMANTIC_LENGTH_MISMATCH",
          stage: "semantic",
          instancePath: pointer(...at, "eventSenderIds"),
          validatorId: "correlogram.event_trains_valid",
          message: `this train has ${times.length} event times but ${senders.length} event sender ids. Every event has exactly one declared sender; Cortexel never truncates or broadcasts either array.`
        })
      );
    }
    if (times && eventIds && times.length !== eventIds.length) {
      errors.push(
        makeError({
          code: "SEMANTIC_LENGTH_MISMATCH",
          stage: "semantic",
          instancePath: pointer(...at, "eventIds"),
          validatorId: "correlogram.event_trains_valid",
          message: `this train has ${times.length} event times but ${eventIds.length} event ids. Optional event identity, when supplied, is parallel to every event rather than a partial annotation.`
        })
      );
    }
    if (recorded) {
      const universe = /* @__PURE__ */ new Set();
      for (let index = 0; index < recorded.length; index++) {
        const id = recorded[index];
        if (typeof id !== "string") continue;
        if (universe.has(id)) {
          errors.push(
            makeError({
              code: "SEMANTIC_DUPLICATE_ID",
              stage: "semantic",
              instancePath: pointer(...at, "recordedSenderIds", index),
              validatorId: "correlogram.event_trains_valid",
              message: `sender id "${id}" appears more than once in this train's complete universe. A sender cannot occupy two denominator positions.`
            })
          );
          break;
        }
        universe.add(id);
      }
      if (senders) {
        for (let index = 0; index < senders.length; index++) {
          const id = senders[index];
          if (typeof id !== "string" || universe.has(id)) continue;
          errors.push(
            makeError({
              code: "SEMANTIC_UNKNOWN_REFERENCE",
              stage: "semantic",
              instancePath: pointer(...at, "eventSenderIds", index),
              validatorId: "correlogram.event_trains_valid",
              message: `event sender "${id}" is not in this train's complete recorded-sender universe. A third sender belongs to a correlogram only through an explicit train universe; Cortexel never assigns it to a role from event order.`
            })
          );
          break;
        }
      }
    }
    if (eventIds) {
      const seen = /* @__PURE__ */ new Map();
      for (let index = 0; index < eventIds.length; index++) {
        const id = eventIds[index];
        if (typeof id !== "string") continue;
        const first = seen.get(id);
        if (first !== void 0) {
          errors.push(
            makeError({
              code: "SEMANTIC_DUPLICATE_ID",
              stage: "semantic",
              instancePath: pointer(...at, "eventIds", index),
              validatorId: "correlogram.event_trains_valid",
              message: `event id "${id}" already identifies event ${first} in this train. Event ids are scoped to one train but must be unique within it, or self-pair identity is ambiguous.`
            })
          );
          break;
        }
        seen.set(id, index);
      }
    }
    if (!times || start === void 0 || stop === void 0 || windowUnit === void 0 || timeUnit === void 0 || !isKnownUnit(windowUnit) || dimensionOf(windowUnit) !== "time" || !(stop > start)) continue;
    const openStart = boundary === "(start,stop]";
    const closedStop = boundary === "[start,stop]" || boundary === "(start,stop]";
    for (let index = 0; index < times.length; index++) {
      const time = asNumber(times[index]);
      if (time === void 0) continue;
      try {
        const lowerVsEvent = compareExactUnitSumToValue(
          [{ value: start, unit: windowUnit }],
          { value: time, unit: timeUnit }
        );
        const upperVsEvent = compareExactUnitSumToValue(
          [{ value: stop, unit: windowUnit }],
          { value: time, unit: timeUnit }
        );
        const beforeStart = openStart ? lowerVsEvent >= 0 : lowerVsEvent > 0;
        const beyondStop = closedStop ? upperVsEvent < 0 : upperVsEvent <= 0;
        if (!beforeStart && !beyondStop) continue;
        errors.push(
          makeError({
            code: "SCIENCE_EVENT_OUT_OF_WINDOW",
            stage: "science",
            instancePath: pointer(...at, "eventTimes", "values", index),
            validatorId: "correlogram.event_trains_valid",
            message: `this event lies outside the shared ${boundary ?? "[start,stop)"} window ${start} to ${stop} ${windowUnit}. Raw correlogram numerators and denominators must describe the same observation window; events are never silently dropped.`
          })
        );
        break;
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unit comparison failed";
        errors.push(
          makeError({
            code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
            stage: "science",
            instancePath: pointer(...at, "eventTimes", "unit"),
            validatorId: "correlogram.event_trains_valid",
            message: `this train's event times cannot be compared with the shared observation window: ${detail}.`
          })
        );
        break;
      }
    }
  }
  return errors;
};
var correlogramRolesDisjoint = (context) => {
  const data = getData(context);
  const mode = asString(data.mode);
  const universes = mode === "prebinned_auto" ? trainUniverse(data, "train") ? [{ name: "train", value: trainUniverse(data, "train") }] : [] : mode === "prebinned_cross" ? [
    ...trainUniverse(data, "referenceTrain") ? [{ name: "referenceTrain", value: trainUniverse(data, "referenceTrain") }] : [],
    ...trainUniverse(data, "targetTrain") ? [{ name: "targetTrain", value: trainUniverse(data, "targetTrain") }] : []
  ] : [];
  for (const universe of universes) {
    const seen = /* @__PURE__ */ new Set();
    for (let index = 0; index < universe.value.length; index++) {
      const id = universe.value[index];
      if (typeof id !== "string") continue;
      if (!seen.has(id)) {
        seen.add(id);
        continue;
      }
      return [
        makeError({
          code: "SEMANTIC_DUPLICATE_ID",
          stage: "semantic",
          instancePath: pointer("data", universe.name, "recordedSenderIds", index),
          validatorId: "correlogram.roles_disjoint",
          message: `sender "${id}" appears twice in this pre-binned role's complete universe. A sender universe is a set, not a multiplicity-weighted denominator.`
        })
      ];
    }
  }
  if (data.mode !== "events_cross" && data.mode !== "prebinned_cross") return [];
  const reference = asRecord(data.referenceTrain);
  const target = asRecord(data.targetTrain);
  if (!reference || !target) return [];
  const referenceId = asString(reference.trainId);
  const targetId = asString(target.trainId);
  if (referenceId !== void 0 && targetId === referenceId) {
    return [
      makeError({
        code: "SEMANTIC_DUPLICATE_ID",
        stage: "semantic",
        instancePath: pointer("data", "targetTrain", "trainId"),
        validatorId: "correlogram.roles_disjoint",
        message: `cross roles both use train id "${referenceId}". Reference and target must be independently named containers; using one identity for both is an autocorrelogram, not a cross-correlogram.`
      })
    ];
  }
  const referenceUniverse = trainUniverse(data, "referenceTrain");
  const targetUniverse = trainUniverse(data, "targetTrain");
  if (!referenceUniverse || !targetUniverse) return [];
  const referenceSet = new Set(
    referenceUniverse.filter((id) => typeof id === "string")
  );
  for (let index = 0; index < targetUniverse.length; index++) {
    const id = targetUniverse[index];
    if (typeof id !== "string" || !referenceSet.has(id)) continue;
    return [
      makeError({
        code: "SEMANTIC_DUPLICATE_ID",
        stage: "semantic",
        instancePath: pointer("data", "targetTrain", "recordedSenderIds", index),
        validatorId: "correlogram.roles_disjoint",
        message: `sender "${id}" is declared in both cross-role universes. Its own event pairs would add an autocorrelation to a figure labelled cross-correlation, so the roles must be disjoint.`
      })
    ];
  }
  return [];
};
var correlogramPrebinnedAxisConsistent = (context) => {
  const data = getData(context);
  if (data.mode !== "prebinned_auto" && data.mode !== "prebinned_cross") return [];
  const parameters = getParameters(context);
  const binEdges = asRecord(data.binEdges);
  const edges = asArray(binEdges?.edges);
  const counts = asArray(data.pairCounts);
  const eligible = asArray(data.eligibleReferenceEventCounts);
  const errors = [];
  if (edges && counts && edges.length !== counts.length + 1) {
    errors.push(
      makeError({
        code: "SEMANTIC_LENGTH_MISMATCH",
        stage: "semantic",
        instancePath: pointer("data", "pairCounts"),
        validatorId: "correlogram.prebinned_axis_consistent",
        message: `${edges.length} lag edges define ${Math.max(0, edges.length - 1)} bins, but pairCounts has ${counts.length} entries. Every exact numerator belongs to exactly one declared bin.`
      })
    );
  }
  if (counts && eligible && counts.length !== eligible.length) {
    errors.push(
      makeError({
        code: "SEMANTIC_LENGTH_MISMATCH",
        stage: "semantic",
        instancePath: pointer("data", "eligibleReferenceEventCounts"),
        validatorId: "correlogram.prebinned_axis_consistent",
        message: `${counts.length} pair-count bins require ${counts.length} parallel eligible-reference denominators; got ${eligible.length}.`
      })
    );
  }
  for (const [name, values] of [
    ["pairCounts", counts],
    ["eligibleReferenceEventCounts", eligible]
  ]) {
    if (!values) continue;
    for (let index = 0; index < values.length; index++) {
      const value = asNumber(values[index]);
      if (value === void 0 || Number.isSafeInteger(value) && value >= 0) continue;
      errors.push(
        makeError({
          code: "SCIENCE_COUNT_NOT_INTEGER",
          stage: "science",
          instancePath: pointer("data", name, index),
          validatorId: "correlogram.prebinned_axis_consistent",
          message: `pre-binned count ${String(values[index])} is not an exact non-negative safe integer. A rounded or unsafe numerator/denominator cannot be audited exactly.`
        })
      );
      break;
    }
  }
  if (!edges || edges.length < 2) return errors;
  const numericEdges = edges.map(asNumber);
  if (!numericEdges.every((value) => value !== void 0)) return errors;
  for (let index = 1; index < numericEdges.length; index++) {
    if (numericEdges[index] > numericEdges[index - 1]) continue;
    errors.push(
      makeError({
        code: "SCIENCE_BIN_EDGES_INVALID",
        stage: "science",
        instancePath: pointer("data", "binEdges", "edges", index),
        validatorId: "correlogram.prebinned_axis_consistent",
        message: "pre-binned lag edges must be finite and strictly increasing."
      })
    );
    return errors;
  }
  const lag = asRecord(parameters.lagRange);
  const bins = asRecord(parameters.bins);
  const min = asNumber(lag?.min);
  const max = asNumber(lag?.max);
  const width = asNumber(bins?.width);
  const lagUnit = asString(lag?.unit);
  const widthUnit = asString(bins?.unit);
  const edgeUnit = asString(binEdges?.unit);
  if (min === void 0 || max === void 0 || width === void 0 || lagUnit === void 0 || widthUnit === void 0 || edgeUnit === void 0) return errors;
  if (!isKnownUnit(lagUnit) || dimensionOf(lagUnit) !== "time" || !isKnownUnit(widthUnit) || dimensionOf(widthUnit) !== "time" || !isKnownUnit(edgeUnit)) return errors;
  if (dimensionOf(edgeUnit) !== "time") {
    errors.push(
      makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("data", "binEdges", "unit"),
        validatorId: "correlogram.prebinned_axis_consistent",
        message: `pre-binned correlogram edges require a registered time unit; got ${edgeUnit}.`
      })
    );
    return errors;
  }
  try {
    const widthInLagUnit = widthUnit === lagUnit ? width : convert(width, widthUnit, lagUnit);
    const expected = materializeCenteredLagBins(min, max, widthInLagUnit, 20001);
    if (!expected.ok || expected.edges.length !== numericEdges.length) {
      errors.push(
        makeError({
          code: "SCIENCE_LAG_RANGE_INVALID",
          stage: "science",
          instancePath: pointer("data", "binEdges"),
          validatorId: "correlogram.prebinned_axis_consistent",
          message: "the supplied pre-binned edge count does not match the centred lag axis declared by lagRange and bins."
        })
      );
      return errors;
    }
    for (let index = 0; index < numericEdges.length; index++) {
      const actual = edgeUnit === lagUnit ? numericEdges[index] : convert(numericEdges[index], edgeUnit, lagUnit);
      if (actual === expected.edges[index] || binary64RelativeDifferenceWithinEpsilons(actual, expected.edges[index], 16)) continue;
      errors.push(
        makeError({
          code: "SCIENCE_LAG_RANGE_INVALID",
          stage: "science",
          instancePath: pointer("data", "binEdges", "edges", index),
          validatorId: "correlogram.prebinned_axis_consistent",
          message: `pre-binned edge ${index} converts to ${actual} ${lagUnit}, but the declared centred lag axis requires ${expected.edges[index]} ${lagUnit}. Cortexel will not relabel an existing histogram with a different axis.`
        })
      );
      break;
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unit conversion failed";
    errors.push(
      makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("data", "binEdges", "unit"),
        validatorId: "correlogram.prebinned_axis_consistent",
        message: `the pre-binned lag axis cannot be compared with lagRange and bins: ${detail}.`
      })
    );
  }
  return errors;
};
var correlogramStatisticDenominator = (context) => {
  const parameters = getParameters(context);
  const data = getData(context);
  const statistic = asString(parameters.statistic);
  const edgeCorrection = asString(parameters.edgeCorrection);
  const mode = asString(data.mode);
  const raw = mode === "events_auto" || mode === "events_cross";
  const prebinned = mode === "prebinned_auto" || mode === "prebinned_cross";
  if (statistic !== "raw_pair_count" && statistic !== "target_rate_per_reference_event") {
    return [
      makeError({
        code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
        stage: "science",
        instancePath: pointer("parameters", "statistic"),
        validatorId: "correlogram.statistic_denominator",
        message: "revision 2 renders only raw_pair_count and target_rate_per_reference_event. An unknown statistic is refused even if a structural gate was skipped."
      })
    ];
  }
  if (statistic === "raw_pair_count" && edgeCorrection !== "none" || statistic === "target_rate_per_reference_event" && edgeCorrection !== "none" && edgeCorrection !== "eligible_reference_events") {
    return [
      makeError({
        code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
        stage: "science",
        instancePath: pointer("parameters", "edgeCorrection"),
        validatorId: "correlogram.statistic_denominator",
        message: statistic === "raw_pair_count" ? "raw_pair_count has no denominator and requires edgeCorrection `none`." : "target_rate_per_reference_event requires `none` or exact `eligible_reference_events` correction."
      })
    ];
  }
  if (raw) {
    if (data.referenceEventCount !== void 0 || data.targetEventCount !== void 0 || data.eligibleReferenceEventCounts !== void 0) {
      return [
        makeError({
          code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
          stage: "science",
          instancePath: data.referenceEventCount !== void 0 ? pointer("data", "referenceEventCount") : data.targetEventCount !== void 0 ? pointer("data", "targetEventCount") : pointer("data", "eligibleReferenceEventCounts"),
          validatorId: "correlogram.statistic_denominator",
          message: "raw role counts and eligible-reference counts are derived from the explicit event arrays. A caller-supplied duplicate count would create a second authority."
        })
      ];
    }
    return [];
  }
  if (!prebinned) return [];
  const pairCounts = asArray(data.pairCounts);
  const referenceCount = asNumber(data.referenceEventCount);
  const targetCount = mode === "prebinned_auto" ? referenceCount : asNumber(data.targetEventCount);
  for (const [name, count] of [
    ["referenceEventCount", referenceCount],
    ["targetEventCount", targetCount]
  ]) {
    if (count !== void 0 && Number.isSafeInteger(count) && count >= 0) continue;
    return [
      makeError({
        code: "SCIENCE_DENOMINATOR_INVALID",
        stage: "science",
        instancePath: pointer("data", name),
        validatorId: "correlogram.statistic_denominator",
        message: `pre-binned pair accounting requires ${name} as an exact non-negative safe integer, including zero for a completely observed silent role.`
      })
    ];
  }
  if (pairCounts && referenceCount !== void 0 && targetCount !== void 0) {
    const exactCounts = pairCounts.map(asNumber);
    if (exactCounts.every(
      (value) => value !== void 0 && Number.isSafeInteger(value) && value >= 0
    )) {
      const counted = exactCounts.reduce((sum, value) => sum + BigInt(value), 0n);
      const candidate = BigInt(referenceCount) * BigInt(targetCount);
      const selfPairs = mode === "prebinned_auto" ? BigInt(referenceCount) : 0n;
      if (candidate > BigInt(Number.MAX_SAFE_INTEGER)) {
        return [
          makeError({
            code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
            stage: "science",
            instancePath: pointer(
              "data",
              mode === "prebinned_auto" ? "referenceEventCount" : "targetEventCount"
            ),
            validatorId: "correlogram.statistic_denominator",
            message: "the exact candidate role product exceeds the safe-integer JSON domain, so Cortexel cannot emit an exact pair-accounting receipt."
          })
        ];
      }
      const available = candidate - selfPairs;
      if (counted > available) {
        return [
          makeError({
            code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
            stage: "science",
            instancePath: pointer("data", "pairCounts"),
            validatorId: "correlogram.statistic_denominator",
            message: `exact pair conservation failed: ${candidate.toString()} candidate ordered pairs minus ${selfPairs.toString()} excluded same-event self-pairs cannot contain ${counted.toString()} counted in-range pairs. The implied out-of-range count would be negative.`
          })
        ];
      }
    }
  }
  const eligible = asArray(data.eligibleReferenceEventCounts);
  if (statistic === "raw_pair_count" || edgeCorrection === "none") {
    if (eligible === void 0) return [];
    return [
      makeError({
        code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
        stage: "science",
        instancePath: pointer("data", "eligibleReferenceEventCounts"),
        validatorId: "correlogram.statistic_denominator",
        message: statistic === "raw_pair_count" ? "raw_pair_count has no per-bin denominator, so eligibleReferenceEventCounts is a meaningless second authority." : "edgeCorrection `none` uses referenceEventCount for every lag; a parallel eligible-reference array would create two denominator authorities."
      })
    ];
  }
  if (!eligible || !pairCounts || eligible.length !== pairCounts.length) {
    return [
      makeError({
        code: "SEMANTIC_LENGTH_MISMATCH",
        stage: "semantic",
        instancePath: pointer("data", "eligibleReferenceEventCounts"),
        validatorId: "correlogram.statistic_denominator",
        message: "eligible_reference_events requires one exact eligible-reference denominator per pair-count bin."
      })
    ];
  }
  for (let index = 0; index < eligible.length; index++) {
    const eligibleCount = asNumber(eligible[index]);
    const pairCount = asNumber(pairCounts[index]);
    if (eligibleCount === void 0 || !Number.isSafeInteger(eligibleCount) || eligibleCount < 0) continue;
    if (referenceCount !== void 0 && eligibleCount > referenceCount) {
      return [
        makeError({
          code: "SCIENCE_DENOMINATOR_INVALID",
          stage: "science",
          instancePath: pointer("data", "eligibleReferenceEventCounts", index),
          validatorId: "correlogram.statistic_denominator",
          message: `eligible-reference count ${eligibleCount} exceeds the exact reference-event count ${referenceCount}.`
        })
      ];
    }
    if (eligibleCount === 0 && pairCount !== 0) {
      return [
        makeError({
          code: "SCIENCE_DENOMINATOR_INVALID",
          stage: "science",
          instancePath: pointer("data", "pairCounts", index),
          validatorId: "correlogram.statistic_denominator",
          message: "a zero eligible-reference denominator can produce no eligible ordered pair. The bin is valid only with pairCount 0 and compiles to null with status undefined_zero_eligible_reference_events."
        })
      ];
    }
  }
  return [];
};

// src/core/semantics/topology.ts
var topologyScopeDeclared = (context) => {
  const scope = asRecord(getData(context).scope);
  if (scope && asString(scope.kind) !== void 0) return [];
  return [
    makeError({
      code: "SCOPE_REQUIRED",
      stage: "scope",
      instancePath: pointer("data", "scope"),
      validatorId: "topology.scope_declared",
      message: "a network figure must declare its scope. A connection snapshot with no scope cannot be interpreted: nothing in the arrays distinguishes a complete network from one rank\u2019s view of it."
    })
  ];
};
var topologyScopeSupportsClaim = (context) => {
  const data = getData(context);
  const parameters = getParameters(context);
  const scope = asRecord(data.scope);
  if (!scope) return [];
  const kind = asString(scope.kind);
  const errors = [];
  if (kind === "mpi_target_rank_local") {
    const rank = asNumber(scope.rank);
    const worldSize = asNumber(scope.worldSize);
    if (rank !== void 0 && worldSize !== void 0 && rank >= worldSize) {
      errors.push(
        makeError({
          code: "SCOPE_MERGE_CONFLICT",
          stage: "scope",
          instancePath: pointer("data", "scope", "rank"),
          validatorId: "topology.scope_supports_claim",
          message: `rank ${rank} is not valid in a world of size ${worldSize}.`
        })
      );
    }
    const direction = asString(parameters.direction);
    if (context.skillId === "network.degree_distribution" && direction === "out") {
      errors.push(
        makeError({
          code: "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL",
          stage: "scope",
          instancePath: pointer("parameters", "direction"),
          validatorId: "topology.scope_supports_claim",
          message: "an out-degree cannot be computed from a target-rank-local snapshot. This rank holds the connections whose TARGET it owns, so the connections leaving a local source for a remote target are on another rank entirely. In-degree is complete here; out-degree is not merely incomplete, it is computed from the wrong set. Merge every rank and declare global_merged.",
          repair: {
            operation: "replace",
            path: pointer("parameters", "direction"),
            value: "in",
            reasonCode: "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL"
          }
        })
      );
    }
    if (scope.localTargetUniverseComplete === false && context.skillId === "network.degree_distribution") {
      errors.push(
        makeError({
          code: "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL",
          stage: "scope",
          instancePath: pointer("data", "scope", "localTargetUniverseComplete"),
          validatorId: "topology.scope_supports_claim",
          message: "the local target universe is declared incomplete, so even a local in-degree cannot be established: a target with no observed incoming connection may simply not have been captured."
        })
      );
    }
  }
  if (kind === "global_merged") {
    const worldSize = asNumber(scope.worldSize);
    const merged = asArray(scope.mergedRanks);
    if (worldSize !== void 0 && merged) {
      const numericRanks = merged.filter(
        (rank) => typeof rank === "number" && Number.isSafeInteger(rank)
      );
      const ranks = new Set(numericRanks);
      const inRange = [...ranks].filter((rank) => rank >= 0 && rank < worldSize);
      const outOfRange = [...ranks].filter((rank) => rank < 0 || rank >= worldSize);
      const missingCount = Math.max(0, worldSize - inRange.length);
      if (missingCount > 0) {
        const sorted = inRange.sort((a, b) => a - b);
        const missing = [];
        let expected = 0;
        for (const rank of sorted) {
          while (expected < rank && missing.length < 8) missing.push(expected++);
          expected = rank + 1;
          if (missing.length >= 8) break;
        }
        while (expected < worldSize && missing.length < 8) missing.push(expected++);
        errors.push(
          makeError({
            code: "SCOPE_MERGE_INCOMPLETE",
            stage: "scope",
            instancePath: pointer("data", "scope", "mergedRanks"),
            validatorId: "topology.scope_supports_claim",
            message: `this claims a global merge of a ${worldSize}-rank run, but ${missingCount} rank${missingCount === 1 ? " is" : "s are"} missing${missing.length > 0 ? ` (first: ${missing.join(", ")}${missingCount > missing.length ? ", ..." : ""})` : ""}. A partial rank set stays partial; it cannot be upgraded to a global claim by declaring one.`
          })
        );
      }
      if (ranks.size !== merged.length) {
        errors.push(
          makeError({
            code: "SCOPE_MERGE_CONFLICT",
            stage: "scope",
            instancePath: pointer("data", "scope", "mergedRanks"),
            validatorId: "topology.scope_supports_claim",
            message: "a rank appears more than once in the merge. Merging one rank twice would double-count every connection it owns."
          })
        );
      }
      if (outOfRange.length > 0) {
        errors.push(
          makeError({
            code: "SCOPE_MERGE_CONFLICT",
            stage: "scope",
            instancePath: pointer("data", "scope", "mergedRanks"),
            validatorId: "topology.scope_supports_claim",
            message: `${outOfRange.length} merged rank${outOfRange.length === 1 ? " is" : "s are"} outside the valid range 0..${worldSize - 1} (first: ${outOfRange.slice(0, 8).join(", ")}). Extra ranks are a merge conflict, not evidence of global coverage.`
          })
        );
      }
    }
  }
  if (kind === "sampled") {
    const source = asNumber(scope.sourceConnectionCount);
    const retained = asNumber(scope.retainedConnectionCount);
    if (source !== void 0 && retained !== void 0 && retained > source) {
      errors.push(
        makeError({
          code: "SCOPE_MERGE_CONFLICT",
          stage: "scope",
          instancePath: pointer("data", "scope", "retainedConnectionCount"),
          validatorId: "topology.scope_supports_claim",
          message: `a sample cannot retain more connections (${retained}) than its source had (${source}).`
        })
      );
    }
    if (context.skillId === "network.degree_distribution") {
      errors.push(
        makeError({
          code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
          stage: "scope",
          instancePath: pointer("data", "scope", "kind"),
          validatorId: "topology.scope_supports_claim",
          message: "a degree distribution cannot be computed from a sampled snapshot. Sampling removes edges, so every degree it reports is lower than the real one \u2014 and by an amount that depends on how the sample was drawn. This is refused rather than disclosed."
        })
      );
    }
  }
  return errors;
};
var topologyNodeUniverseDeclared = (context) => {
  const data = getData(context);
  const universe = asRecord(data.nodeUniverse);
  if (!universe) {
    return [
      makeError({
        code: "SCOPE_NODE_UNIVERSE_REQUIRED",
        stage: "scope",
        instancePath: pointer("data", "nodeUniverse"),
        validatorId: "topology.node_universe_declared",
        message: "this figure needs a declared node universe. An edge list can show that an edge exists but never that one does not: a node missing from it may have degree zero, or may simply not have been listed. Only the caller knows which."
      })
    ];
  }
  if (universe.complete === false) {
    return [
      makeError({
        code: "SCOPE_NODE_UNIVERSE_REQUIRED",
        stage: "scope",
        instancePath: pointer("data", "nodeUniverse", "complete"),
        validatorId: "topology.node_universe_declared",
        message: "the node universe is declared incomplete, so no zero-degree or isolate claim can be made from it."
      })
    ];
  }
  return [];
};
var topologyEdgeEndpointsInUniverse = (context) => {
  const data = getData(context);
  const ids = asArray(asRecord(data.nodeUniverse)?.ids);
  const connections = asRecord(data.connections);
  if (!ids || !connections) return [];
  const universe = new Set(ids.filter((id) => typeof id === "string"));
  const errors = [];
  const sources = asArray(connections.sourceIds);
  const targets = asArray(connections.targetIds);
  if (sources) {
    errors.push(
      ...checkReferencesInUniverse(
        sources,
        universe,
        ["data", "connections", "sourceIds"],
        "topology.edge_endpoints_in_universe",
        "the declared node universe"
      )
    );
  }
  if (targets) {
    errors.push(
      ...checkReferencesInUniverse(
        targets,
        universe,
        ["data", "connections", "targetIds"],
        "topology.edge_endpoints_in_universe",
        "the declared node universe"
      )
    );
  }
  return errors;
};
var topologyMultapseAggregationDeclared = (context) => {
  const data = getData(context);
  const parameters = getParameters(context);
  const connections = asRecord(data.connections);
  if (!connections) return [];
  const sources = asArray(connections.sourceIds);
  const targets = asArray(connections.targetIds);
  if (!sources || !targets) return [];
  const aggregation = asString(parameters.multapseAggregation);
  const cells = /* @__PURE__ */ new Map();
  let maxPerCell = 0;
  let exampleCell = "";
  for (let i = 0; i < Math.min(sources.length, targets.length); i++) {
    const source = sources[i];
    const target = targets[i];
    if (typeof source !== "string" || typeof target !== "string") continue;
    const key = `${target}\0${source}`;
    const next = (cells.get(key) ?? 0) + 1;
    cells.set(key, next);
    if (next > maxPerCell) {
      maxPerCell = next;
      exampleCell = `target "${target}", source "${source}"`;
    }
  }
  if (maxPerCell <= 1) return [];
  if (aggregation === void 0) {
    return [
      makeError({
        code: "SCIENCE_AGGREGATION_REQUIRED",
        stage: "science",
        instancePath: pointer("parameters", "multapseAggregation"),
        validatorId: "topology.multapse_aggregation_declared",
        message: `${maxPerCell} connections map to a single cell (${exampleCell}) and no aggregation was declared. These are multapses \u2014 real, distinct synapses \u2014 not duplicate rows. Declare sum, mean, min, or max. Cortexel never applies "last edge wins", because which edge is last depends only on array order.`
      })
    ];
  }
  if (aggregation === "no_aggregation") {
    return [
      makeError({
        code: "SCIENCE_AGGREGATION_REQUIRED",
        stage: "science",
        instancePath: pointer("parameters", "multapseAggregation"),
        validatorId: "topology.multapse_aggregation_declared",
        message: `"no_aggregation" asserts at most one connection per cell, but ${maxPerCell} connections map to one (${exampleCell}). The assertion is false, so it fails rather than silently discarding ${maxPerCell - 1} real synapses.`
      })
    ];
  }
  return [];
};
var topologyMatrixContract = (context) => {
  if (context.skillId !== "network.adjacency_matrix" && context.skillId !== "network.weight_matrix" && context.skillId !== "network.delay_matrix") return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const scope = asRecord(data.scope);
  const universeIds = asArray(asRecord(data.nodeUniverse)?.ids);
  const connections = asRecord(data.connections);
  const sourceIds = asArray(connections?.sourceIds);
  const targetIds = asArray(connections?.targetIds);
  if (!scope || !universeIds || !sourceIds || !targetIds) return [];
  const nodeIds = universeIds.filter((value) => typeof value === "string");
  const sources = sourceIds.filter((value) => typeof value === "string");
  const targets = targetIds.filter((value) => typeof value === "string");
  if (nodeIds.length !== universeIds.length || sources.length !== sourceIds.length || targets.length !== targetIds.length) return [];
  const kind = asString(scope.kind);
  const observedRaw = asArray(data.observedTargetIds);
  const observed = observedRaw?.filter((value) => typeof value === "string");
  const errors = [];
  if (kind === "mpi_target_rank_local") {
    if (scope.localTargetUniverseComplete !== true) {
      errors.push(makeError({
        code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
        stage: "scope",
        instancePath: pointer("data", "scope", "localTargetUniverseComplete"),
        validatorId: "topology.matrix_contract",
        message: "a rank-local matrix requires localTargetUniverseComplete: true. Otherwise even an owned target cell may be missing multapses, so multiplicity, weight, and delay aggregates are not established."
      }));
    }
    if (!observed || observed.length !== (observedRaw?.length ?? 0)) {
      errors.push(makeError({
        code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
        stage: "scope",
        instancePath: pointer("data", "observedTargetIds"),
        validatorId: "topology.matrix_contract",
        message: "a target-rank-local matrix requires the exact observedTargetIds set owned by this rank. The set may be empty; connection rows cannot reveal a locally owned target with zero incoming connections."
      }));
    } else {
      const universe = new Set(nodeIds);
      const owned = new Set(observed);
      for (let index = 0; index < observed.length && errors.length < 8; index++) {
        if (!universe.has(observed[index])) {
          errors.push(makeError({
            code: "SEMANTIC_UNKNOWN_REFERENCE",
            stage: "semantic",
            instancePath: pointer("data", "observedTargetIds", index),
            validatorId: "topology.matrix_contract",
            message: "an observed target is outside the declared ordered node universe. Cortexel never extends an axis from an observability claim."
          }));
        }
      }
      for (let index = 0; index < targets.length && errors.length < 8; index++) {
        if (!owned.has(targets[index])) {
          errors.push(makeError({
            code: "SCOPE_MERGE_CONFLICT",
            stage: "scope",
            instancePath: pointer("data", "connections", "targetIds", index),
            validatorId: "topology.matrix_contract",
            message: "a connection returned by a target-rank-local snapshot targets a node not declared as owned by this rank. The connection rows and target-ownership authority contradict each other."
          }));
        }
      }
    }
  } else if (observedRaw !== void 0) {
    errors.push(makeError({
      code: "SCOPE_MERGE_CONFLICT",
      stage: "scope",
      instancePath: pointer("data", "observedTargetIds"),
      validatorId: "topology.matrix_contract",
      message: "observedTargetIds is legal only for mpi_target_rank_local. Complete scopes derive every row as observed; sampled scope derives no empty row as observed, so a second caller-authored set would create conflicting authority."
    }));
  }
  if (kind === "sampled") {
    const retained = asNumber(scope.retainedConnectionCount);
    if (retained !== void 0 && retained !== sources.length) {
      errors.push(makeError({
        code: "SCOPE_MERGE_CONFLICT",
        stage: "scope",
        instancePath: pointer("data", "scope", "retainedConnectionCount"),
        validatorId: "topology.matrix_contract",
        message: `the sampled scope says it retained ${retained} connections, but the request contains ${sources.length} connection rows. The redundant conservation claim must agree exactly.`
      }));
    }
    if (context.skillId !== "network.adjacency_matrix" || asString(parameters.cellMode) !== "binary_presence") {
      errors.push(makeError({
        code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
        stage: "scope",
        instancePath: pointer("data", "scope", "kind"),
        validatorId: "topology.matrix_contract",
        message: "a sample can prove that a retained connection exists, but cannot establish a cell multiplicity or a complete weight/delay aggregate. Only adjacency binary_presence accepts sampled scope."
      }));
    }
    if (context.skillId === "network.adjacency_matrix" && asString(parameters.multapseAggregation) !== "sum") {
      errors.push(makeError({
        code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
        stage: "scope",
        instancePath: pointer("parameters", "multapseAggregation"),
        validatorId: "topology.matrix_contract",
        message: "sampled binary presence requires sum over retained rows. no_aggregation would claim that the full network cell has at most one connection, which an incomplete sample cannot establish even when it retained only one row."
      }));
    }
  }
  if (context.skillId === "network.adjacency_matrix") {
    const aggregation = asString(parameters.multapseAggregation);
    if (aggregation !== "sum" && aggregation !== "no_aggregation") {
      errors.push(makeError({
        code: "SCIENCE_AGGREGATION_REQUIRED",
        stage: "science",
        instancePath: pointer("parameters", "multapseAggregation"),
        validatorId: "topology.matrix_contract",
        message: "adjacency accepts only sum (exact connection-row multiplicity, with binary paint clamped to presence) or no_aggregation (an assertion of at most one row per cell). Mean, min, and max would be accepted fields with no distinct scientific role."
      }));
    }
  }
  if (context.skillId === "network.weight_matrix") {
    const colorScale = asRecord(parameters.colorScale);
    const center = asNumber(colorScale?.center);
    const weightsRaw = asArray(asRecord(connections?.weights)?.values);
    const aggregation = asString(parameters.multapseAggregation);
    const edgeIdsRaw = asArray(connections?.edgeIds);
    const modelsRaw = asArray(connections?.synapseModels);
    const edgeIds = edgeIdsRaw?.filter((value) => typeof value === "string");
    const models = modelsRaw?.filter((value) => typeof value === "string");
    const weights = weightsRaw?.filter(
      (value) => value === null || typeof value === "number" && Number.isFinite(value)
    );
    const supportedAggregation = aggregation === "sum" || aggregation === "mean" || aggregation === "min" || aggregation === "max" || aggregation === "no_aggregation";
    if (weights && weights.length === (weightsRaw?.length ?? -1) && supportedAggregation && sources.length === targets.length && weights.length === sources.length && (!edgeIdsRaw || edgeIds?.length === edgeIdsRaw.length) && (!modelsRaw || models?.length === modelsRaw.length)) {
      const matrixInput = {
        nodeIds,
        sourceIds: sources,
        targetIds: targets,
        ...edgeIds ? { edgeIds } : {},
        ...models ? { synapseModels: models } : {},
        scope,
        ...observed ? { observedTargetIds: observed } : {}
      };
      try {
        const matrix = deriveWeightMatrix(matrixInput, weights, aggregation);
        if (asString(colorScale?.class) === "diverging" && center !== void 0) {
          const aggregates = matrix.presentCells.flatMap((cell) => cell.aggregate === null ? [] : [cell.aggregate]);
          if (!aggregates.some((value) => value < center) || !aggregates.some((value) => value > center)) {
            errors.push(makeError({
              code: "RENDER_DIVERGING_SCALE_NO_CENTER",
              stage: "render",
              instancePath: pointer("parameters", "colorScale", "center"),
              validatorId: "topology.matrix_contract",
              message: "the complete valued cell aggregates do not lie strictly on both sides of the declared diverging centre. A hidden raw contributor on the other side cannot justify a two-sided colour claim when the painted aggregates are one-sided."
            }));
          }
        }
      } catch (error) {
        if (!(error instanceof MatrixDerivationError)) throw error;
        if (error.code === "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE" || error.code === "SCIENCE_AGGREGATION_REQUIRED") {
          errors.push(makeError({
            code: error.code,
            stage: "science",
            instancePath: error.code === "SCIENCE_AGGREGATION_REQUIRED" ? pointer("parameters", "multapseAggregation") : pointer("data", "connections", "weights", "values"),
            validatorId: "topology.matrix_contract",
            message: error.code === "SCIENCE_AGGREGATION_REQUIRED" ? error.message : `the requested cell aggregate is not representable as finite binary64: ${error.message}`
          }));
        }
      }
    }
  }
  return errors;
};
var spatialEqualAxisUnits = (context) => {
  const positions = asRecord(getData(context).positions);
  if (!positions) return [];
  const xUnit = legalKnownUnit(asRecord(positions.x));
  const yUnit = legalKnownUnit(asRecord(positions.y));
  if (!xUnit || !yUnit) return [];
  if (!axesAreCompatible(xUnit, yUnit)) {
    return [
      makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("data", "positions", "y", "unit"),
        validatorId: "spatial.equal_axis_units",
        message: `the x axis is in "${xUnit}" and the y axis in "${yUnit}". A spatial map is drawn with one equal scale on both axes; if they are not the same dimension, the distances on the page mean nothing.`
      })
    ];
  }
  return [];
};
var spatialPositionCoverageComplete = (context) => {
  const data = getData(context);
  const nodeUniverse = asRecord(data.nodeUniverse);
  const ids = asArray(nodeUniverse?.ids);
  const positions = asRecord(data.positions);
  if (!ids || !positions) return [];
  const positionIds = asArray(positions.nodeIds);
  const xs = asArray(asRecord(positions.x)?.values);
  if (!positionIds || !xs) return [];
  if (positionIds.length !== xs.length) return [];
  const universe = new Set(ids.filter((id) => typeof id === "string"));
  const errors = checkReferencesInUniverse(
    positionIds,
    universe,
    ["data", "positions", "nodeIds"],
    "spatial.position_coverage_complete",
    "the declared node universe"
  );
  const positioned = new Set(positionIds.filter((id) => typeof id === "string"));
  const missing = ids.filter((id) => typeof id === "string" && !positioned.has(id));
  if (missing.length > 0) {
    errors.push(
      makeError({
        code: "SCOPE_POSITION_COVERAGE_INCOMPLETE",
        stage: "scope",
        instancePath: pointer("data", "positions", "nodeIds"),
        validatorId: "spatial.position_coverage_complete",
        message: `${missing.length} of ${ids.length} nodes in the universe have no declared position (for example "${String(missing[0])}"). Supply them, or narrow the selection. A node with no position is never placed at the origin \u2014 that would invent a measurement.`
      })
    );
  }
  const groups = asArray(nodeUniverse?.groups);
  if (!groups) return errors;
  const seenGroupIds = /* @__PURE__ */ new Map();
  const memberGroup = /* @__PURE__ */ new Map();
  for (let groupIndex = 0; groupIndex < groups.length && errors.length < 16; groupIndex++) {
    const group = asRecord(groups[groupIndex]);
    if (!group) continue;
    const groupId = asString(group.id);
    if (groupId !== void 0) {
      const firstGroupIndex = seenGroupIds.get(groupId);
      if (firstGroupIndex !== void 0) {
        errors.push(makeError({
          code: "SEMANTIC_DUPLICATE_ID",
          stage: "semantic",
          instancePath: pointer("data", "nodeUniverse", "groups", groupIndex, "id"),
          validatorId: "spatial.position_coverage_complete",
          message: `group id "${groupId}" already appears at group index ${firstGroupIndex}. Group order, legend identity, and marker styling require unique group ids.`
        }));
      } else {
        seenGroupIds.set(groupId, groupIndex);
      }
    }
    const members = asArray(group.memberIds);
    if (!members) continue;
    for (let memberIndex = 0; memberIndex < members.length && errors.length < 16; memberIndex++) {
      const member = members[memberIndex];
      if (typeof member !== "string") continue;
      const memberPath = pointer(
        "data",
        "nodeUniverse",
        "groups",
        groupIndex,
        "memberIds",
        memberIndex
      );
      if (!universe.has(member)) {
        errors.push(makeError({
          code: "SEMANTIC_UNKNOWN_REFERENCE",
          stage: "semantic",
          instancePath: memberPath,
          validatorId: "spatial.position_coverage_complete",
          message: `group ${JSON.stringify(groupId)} names node "${member}", which is outside the declared node universe. Groups partition that universe; they never extend it.`
        }));
        continue;
      }
      const previous = memberGroup.get(member);
      if (previous) {
        errors.push(makeError({
          code: "SEMANTIC_DUPLICATE_ID",
          stage: "semantic",
          instancePath: memberPath,
          validatorId: "spatial.position_coverage_complete",
          message: previous.groupIndex === groupIndex ? `node "${member}" is repeated within group ${JSON.stringify(groupId)}. One group membership is one identity binding, not a multiplicity.` : `node "${member}" belongs to both group ${JSON.stringify(previous.groupId)} and group ${JSON.stringify(groupId)}. Group colour, marker shape, and legend membership require disjoint groups.`
        }));
      } else if (groupId !== void 0) {
        memberGroup.set(member, { groupId, groupIndex });
      }
    }
  }
  return errors;
};

// src/core/semantics/distributions.ts
function stringArray(value) {
  const array = asArray(value);
  if (!array || !array.every((entry) => typeof entry === "string")) return void 0;
  return array;
}
function numberArray(value) {
  const array = asArray(value);
  if (!array || !array.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return void 0;
  return array;
}
function nullableNumberArray(value) {
  const array = asArray(value);
  if (!array || !array.every((entry) => entry === null || typeof entry === "number" && Number.isFinite(entry))) return void 0;
  return array;
}
function stageForCode(code) {
  if (code.startsWith("SEMANTIC_")) return "semantic";
  if (code.startsWith("SCOPE_")) return "scope";
  if (code.startsWith("RESOURCE_")) return "budget";
  if (code.startsWith("RENDER_")) return "render";
  return "science";
}
function fromDerivationError(error, validatorId, base = []) {
  if (!(error instanceof DistributionDerivationError)) {
    const detail = error instanceof Error ? error.message : "unknown arithmetic failure";
    return [makeError({
      code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
      stage: "science",
      instancePath: pointer(...base),
      validatorId,
      message: `the exact distribution derivation could not be completed (${detail}).`
    })];
  }
  return [makeError({
    code: error.code,
    stage: stageForCode(error.code),
    instancePath: pointer(...base, ...error.path),
    validatorId,
    message: error.message
  })];
}
function resolveBins(spec, defaultFinalEdgeInclusive) {
  if (!spec) return void 0;
  const mode = asString(spec.mode);
  const unit = asString(spec.unit);
  if (!unit) return void 0;
  let edges;
  if (mode === "edges") edges = numberArray(spec.edges);
  if (mode === "width") {
    const start = asNumber(spec.start);
    const stop = asNumber(spec.stop);
    const width = asNumber(spec.width);
    if (start === void 0 || stop === void 0 || width === void 0) return void 0;
    const materialized = materializeWidthBins(start, stop, width);
    if (!materialized.ok) return void 0;
    edges = materialized.edges;
  }
  if (!edges) return void 0;
  return {
    edges,
    unit,
    finalEdgeInclusive: typeof spec.finalEdgeInclusive === "boolean" ? spec.finalEdgeInclusive : defaultFinalEdgeInclusive
  };
}
function exactOuterEdgesMatchWindow(bins, window, validatorId) {
  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  const unit = asString(window.unit);
  if (start === void 0 || stop === void 0 || !unit || bins.edges.length < 2) return [];
  const errors = [];
  for (const check of [
    { edge: bins.edges[0], value: start, name: "start", ordinal: 0 },
    {
      edge: bins.edges[bins.edges.length - 1],
      value: stop,
      name: "stop",
      ordinal: bins.edges.length - 1
    }
  ]) {
    try {
      const comparison = compareExactUnitSumToValue(
        [{ value: check.edge, unit: bins.unit }],
        { value: check.value, unit }
      );
      if (comparison !== 0) {
        errors.push(makeError({
          code: "SCIENCE_BIN_EDGES_INVALID",
          stage: "science",
          instancePath: pointer("parameters", "bins", "edges", check.ordinal),
          validatorId,
          message: `the ${check.name} bin edge must equal the observation-window ${check.name} exactly after registered-unit scaling.`
        }));
      }
    } catch (error) {
      return [makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("parameters", "bins", "unit"),
        validatorId,
        message: `the bin axis cannot be compared with the observation window (${error instanceof Error ? error.message : "unit failure"}).`
      })];
    }
  }
  return errors;
}
function exactCountSum(values) {
  let total = 0n;
  for (const value of values) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return void 0;
    total += BigInt(value);
  }
  return total;
}
function countError(validatorId, path, message) {
  return makeError({
    code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
    stage: "science",
    instancePath: pointer(...path),
    validatorId,
    message
  });
}
var rateVerifyNormalization = (context) => {
  if (context.skillId !== "neuro.population_rate") return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = "rate.verify_normalization";
  const errors = [];
  const window = asRecord(data.window);
  if (!window) return [];
  if ((asString(window.boundary) ?? "[start,stop)") !== "[start,stop)") {
    errors.push(makeError({
      code: "SCIENCE_WINDOW_INVALID",
      stage: "science",
      instancePath: pointer("data", "window", "boundary"),
      validatorId,
      message: "population-rate revision 2 uses exactly the half-open observation window [start,stop)."
    }));
  }
  if (asString(parameters.rateMode) !== "binned_count") {
    errors.push(makeError({
      code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
      stage: "science",
      instancePath: pointer("parameters", "rateMode"),
      validatorId,
      message: "kernel estimates are not accepted until a kernel, edge policy, table, summary, legend, and geometry are implemented as one contract branch."
    }));
    return errors;
  }
  const mode = asString(data.mode);
  const bins = mode === "events" ? resolveBins(asRecord(parameters.bins), false) : (() => {
    const node = asRecord(data.binEdges);
    const unit = asString(node?.unit);
    const edges = numberArray(node?.edges);
    return unit && edges ? { edges, unit, finalEdgeInclusive: false } : void 0;
  })();
  if (!bins) return errors;
  const windowUnit = asString(window.unit);
  if (windowUnit === void 0 || !isKnownUnit(windowUnit) || dimensionOf(windowUnit) !== "time" || !isKnownUnit(bins.unit)) return errors;
  if (dimensionOf(bins.unit) !== "time") {
    if (mode === "events") {
      errors.push(makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("parameters", "bins", "unit"),
        validatorId,
        message: `population-rate bin coordinates require a registered time unit; got ${bins.unit}.`
      }));
    }
    return errors;
  }
  if (bins.finalEdgeInclusive) {
    errors.push(makeError({
      code: "SCIENCE_BIN_EDGES_INVALID",
      stage: "science",
      instancePath: pointer("parameters", "bins", "finalEdgeInclusive"),
      validatorId,
      message: "population-rate bins tile [start,stop) exactly; an event at stop is outside the window and cannot enter the final bin."
    }));
  }
  errors.push(...exactOuterEdgesMatchWindow(bins, window, validatorId));
  if (errors.length > 0) return errors;
  const normalization = asString(parameters.normalization);
  if (normalization !== "mean_rate_per_recorded_sender" && normalization !== "total_event_rate") return errors;
  if (mode === "events") {
    const eventTimes = asRecord(data.eventTimes);
    const times = numberArray(eventTimes?.values);
    const eventUnit = legalKnownUnit(eventTimes);
    const senders = stringArray(data.eventSenderIds);
    const recorded2 = stringArray(data.recordedSenderIds);
    if (!times || !eventUnit || !senders || !recorded2) return errors;
    if (senders.length !== times.length) return errors;
    const senderSet = new Set(recorded2);
    for (let ordinal = 0; ordinal < senders.length; ordinal++) {
      if (!senderSet.has(senders[ordinal])) {
        errors.push(makeError({
          code: "SEMANTIC_UNKNOWN_REFERENCE",
          stage: "semantic",
          instancePath: pointer("data", "eventSenderIds", ordinal),
          validatorId,
          message: "an event sender is absent from the complete recorded-sender universe."
        }));
        break;
      }
    }
    try {
      derivePopulationRateCounts({
        eventTimes: times,
        eventUnit,
        bins,
        recordedSenderCount: recorded2.length,
        normalization
      });
    } catch (error) {
      errors.push(...fromDerivationError(error, validatorId, ["data"]));
    }
    return errors;
  }
  if (mode !== "prebinned") return errors;
  const counts = asArray(data.counts);
  const recorded = stringArray(data.recordedSenderIds);
  const recordedCount = asNumber(data.recordedSenderCount);
  const sourceEventCount = asNumber(data.sourceEventCount);
  if (!counts || !recorded || recordedCount === void 0 || sourceEventCount === void 0) {
    return errors;
  }
  if (new Set(recorded).size !== recorded.length) return errors;
  if (!Number.isSafeInteger(recordedCount) || recordedCount !== recorded.length) {
    errors.push(countError(
      validatorId,
      ["data", "recordedSenderCount"],
      `recordedSenderCount ${recordedCount} must equal the complete recordedSenderIds length ${recorded.length}.`
    ));
  }
  const sourceEventCountValid = Number.isSafeInteger(sourceEventCount) && sourceEventCount >= 0;
  if (!sourceEventCountValid) {
    errors.push(makeError({
      code: "SCIENCE_COUNT_NOT_INTEGER",
      stage: "science",
      instancePath: pointer("data", "sourceEventCount"),
      validatorId,
      message: "sourceEventCount must be an exact non-negative safe integer."
    }));
  }
  if (counts.length !== bins.edges.length - 1) {
    errors.push(makeError({
      code: "SEMANTIC_LENGTH_MISMATCH",
      stage: "semantic",
      instancePath: pointer("data", "counts"),
      validatorId,
      message: `counts has ${counts.length} entries for ${bins.edges.length - 1} bins.`
    }));
    return errors;
  }
  const sum = exactCountSum(counts);
  if (sum === void 0) {
    errors.push(makeError({
      code: "SCIENCE_COUNT_NOT_INTEGER",
      stage: "science",
      instancePath: pointer("data", "counts"),
      validatorId,
      message: "every pre-binned event count must be an exact non-negative safe integer."
    }));
    return errors;
  }
  if (sourceEventCountValid && sum !== BigInt(sourceEventCount)) {
    errors.push(countError(
      validatorId,
      ["data", "sourceEventCount"],
      `sum(counts) is ${sum}, not declared in-window sourceEventCount ${sourceEventCount}. No first, middle, or final bin may vanish.`
    ));
  }
  const ratesNode = asRecord(data.rates);
  const rates = numberArray(ratesNode?.values);
  const rateUnit = legalKnownUnit(ratesNode);
  if (rates && rateUnit) {
    if (rates.length !== counts.length) {
      errors.push(makeError({
        code: "SEMANTIC_LENGTH_MISMATCH",
        stage: "semantic",
        instancePath: pointer("data", "rates", "values"),
        validatorId,
        message: "supplied rate values must be parallel to exact counts."
      }));
    } else {
      for (let ordinal = 0; ordinal < rates.length; ordinal++) {
        const count = counts[ordinal];
        if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) continue;
        try {
          const divisor = normalization === "mean_rate_per_recorded_sender" ? recorded.length : 1;
          const expected = divideExactIntegerByConvertedDifference(
            count,
            divisor,
            bins.edges[ordinal],
            bins.edges[ordinal + 1],
            bins.unit,
            "s"
          );
          const actual = convert(rates[ordinal], rateUnit, "Hz");
          if (actual === 0 !== (expected === 0) || !binary64RelativeDifferenceWithinTolerance(actual, expected, 1e-9)) {
            errors.push(countError(
              validatorId,
              ["data", "rates", "values", ordinal],
              `supplied rate does not equal count/exposure for bin ${ordinal}; expected ${expected} Hz.`
            ));
            break;
          }
        } catch (error) {
          errors.push(countError(
            validatorId,
            ["data", "rates", "values", ordinal],
            `supplied rate could not be verified (${error instanceof Error ? error.message : "numeric failure"}).`
          ));
          break;
        }
      }
    }
  }
  return errors;
};
var isiWithinTrainOnly = (context) => {
  if (context.skillId !== "neuro.isi_distribution") return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = "isi.within_train_only";
  const window = asRecord(data.window);
  const bins = resolveBins(asRecord(parameters.bins), true);
  const recordedSenderIds = stringArray(data.recordedSenderIds);
  if (!window || !bins || !recordedSenderIds) return [];
  const boundary = asString(window.boundary) ?? "[start,stop)";
  if (boundary !== "[start,stop)") {
    return [makeError({
      code: "SCIENCE_WINDOW_INVALID",
      stage: "science",
      instancePath: pointer("data", "window", "boundary"),
      validatorId,
      message: "ISI revision 2 forms intervals only from the exact half-open event window [start,stop)."
    })];
  }
  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  const windowUnit = asString(window.unit);
  if (start === void 0 || stop === void 0 || !windowUnit) return [];
  if (!isKnownUnit(windowUnit) || dimensionOf(windowUnit) !== "time" || !isKnownUnit(bins.unit) || dimensionOf(bins.unit) !== "time") return [];
  const normalization = asString(parameters.normalization);
  const outOfRangePolicy = asString(parameters.outOfRangeIntervals);
  const zeroIntervalPolicy = asString(parameters.zeroIntervalPolicy);
  if (!normalization || !outOfRangePolicy || !zeroIntervalPolicy) {
    return [makeError({
      code: "SCIENCE_ZERO_INTERVAL_POLICY",
      stage: "science",
      instancePath: pointer("parameters", "zeroIntervalPolicy"),
      validatorId,
      message: "every ISI request declares how a same-train zero interval is handled."
    })];
  }
  const trialIds = stringArray(data.trialIds);
  try {
    if (asString(data.mode) === "events") {
      const eventTimesNode = asRecord(data.eventTimes);
      const eventTimes = numberArray(eventTimesNode?.values);
      const eventUnit = legalKnownUnit(eventTimesNode);
      const eventSenderIds = stringArray(data.eventSenderIds);
      const eventTrialIds = stringArray(data.eventTrialIds);
      if (!eventTimes || !eventUnit || !eventSenderIds) return [];
      deriveIsiFromEvents({
        eventTimes,
        eventSenderIds,
        ...eventTrialIds ? { eventTrialIds } : {},
        recordedSenderIds,
        ...trialIds ? { trialIds } : {},
        intervalUnit: eventUnit,
        window: { start, stop, unit: windowUnit, boundary },
        bins,
        normalization,
        zeroIntervalPolicy,
        outOfRangePolicy
      });
      return [];
    }
    if (asString(data.mode) === "intervals") {
      const intervalsNode = asRecord(data.intervals);
      const intervals = numberArray(intervalsNode?.values);
      const intervalUnit = legalKnownUnit(intervalsNode);
      const intervalSenderIds = stringArray(data.intervalSenderIds);
      const intervalTrialIds = stringArray(data.intervalTrialIds);
      const rawTrains = asArray(data.trains);
      if (!intervals || !intervalUnit || !intervalSenderIds || !rawTrains) return [];
      const trains = rawTrains.flatMap((entry) => {
        const train = asRecord(entry);
        const senderId = asString(train?.senderId);
        const trialId = asString(train?.trialId);
        const spikeCount = asNumber(train?.spikeCount);
        return senderId !== void 0 && spikeCount !== void 0 ? [{ senderId, ...trialId ? { trialId } : {}, spikeCount }] : [];
      });
      if (trains.length !== rawTrains.length) return [];
      deriveIsiFromIntervals({
        intervals,
        intervalSenderIds,
        ...intervalTrialIds ? { intervalTrialIds } : {},
        trains,
        recordedSenderIds,
        ...trialIds ? { trialIds } : {},
        intervalUnit,
        window: { start, stop, unit: windowUnit, boundary },
        bins,
        normalization,
        zeroIntervalPolicy,
        outOfRangePolicy
      });
    }
    return [];
  } catch (error) {
    return fromDerivationError(error, validatorId, ["data"]);
  }
};
var isiZeroIntervalPolicy = (context) => isiWithinTrainOnly(context).filter(
  (error) => error.code === "SCIENCE_ZERO_INTERVAL_POLICY"
);
function exactSameSet(left, right) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return rightSet.size === right.length && left.every((value) => rightSet.has(value));
}
var degreeCountingPolicyDeclared = (context) => {
  if (context.skillId !== "network.degree_distribution") return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = "degree.counting_policy_declared";
  const universe = asRecord(data.nodeUniverse);
  const nodeIds = stringArray(universe?.ids);
  if (!nodeIds) return [];
  const errors = [];
  if (universe?.complete !== true) {
    errors.push(makeError({
      code: "SCOPE_NODE_UNIVERSE_REQUIRED",
      stage: "scope",
      instancePath: pointer("data", "nodeUniverse", "complete"),
      validatorId,
      message: "degree enumeration requires a complete node universe, including every zero-degree node."
    }));
  }
  const scope = asRecord(data.scope);
  if (asString(scope?.kind) === "mpi_target_rank_local") {
    const observed = stringArray(data.observedTargetIds);
    if (!observed || !exactSameSet(nodeIds, observed)) {
      errors.push(makeError({
        code: "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL",
        stage: "scope",
        instancePath: pointer("data", "observedTargetIds"),
        validatorId,
        message: "a rank-local in-degree universe must equal the complete observed target-id authority exactly; silent owned targets cannot disappear."
      }));
    }
  }
  if (asString(scope?.kind) === "sampled") {
    errors.push(makeError({
      code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
      stage: "scope",
      instancePath: pointer("data", "scope", "kind"),
      validatorId,
      message: "a sampled edge set cannot establish exact degrees."
    }));
  }
  const direction = asString(parameters.direction);
  const countingPolicy = asString(parameters.countingPolicy);
  const autapsePolicy = asString(parameters.autapsePolicy);
  const normalization = asString(parameters.normalization);
  const binning = asRecord(parameters.binning);
  const binningMode = asString(binning?.mode);
  if (!direction || !countingPolicy || !autapsePolicy || !normalization || !binningMode) {
    return errors;
  }
  if (binningMode !== "per_integer_degree") {
    errors.push(makeError({
      code: "SCIENCE_BIN_EDGES_INVALID",
      stage: "science",
      instancePath: pointer("parameters", "binning", "mode"),
      validatorId,
      message: "revision 2 retains one integer degree per bin so sum(degree \xD7 nodeCount) remains independently recoverable from the returned table."
    }));
    return errors;
  }
  try {
    if (asString(data.mode) === "connections") {
      const connections = asRecord(data.connections);
      const sourceIds = stringArray(connections?.sourceIds);
      const targetIds = stringArray(connections?.targetIds);
      if (!sourceIds || !targetIds) return errors;
      deriveDegreeDistribution({
        nodeIds,
        sourceIds,
        targetIds,
        direction,
        countingPolicy,
        autapsePolicy,
        binning: { mode: "per_integer_degree" },
        normalization
      });
    } else if (asString(data.mode) === "node_degrees") {
      const supplied = asRecord(data.nodeDegrees);
      const suppliedNodeIds = stringArray(supplied?.nodeIds);
      const suppliedDegrees = numberArray(supplied?.degrees);
      const countedConnectionCount = asNumber(data.countedConnectionCount);
      const countedIncidenceCount = asNumber(data.countedIncidenceCount);
      const excludedAutapseCount = asNumber(data.excludedAutapseCount);
      if (!suppliedNodeIds || !suppliedDegrees || countedConnectionCount === void 0 || countedIncidenceCount === void 0) return errors;
      if (autapsePolicy === "exclude" && excludedAutapseCount === void 0) {
        errors.push(countError(
          validatorId,
          ["data", "excludedAutapseCount"],
          "supplied node degrees under autapse exclusion require the exact removed-row count."
        ));
      }
      if (autapsePolicy === "include" && excludedAutapseCount !== void 0) {
        errors.push(countError(
          validatorId,
          ["data", "excludedAutapseCount"],
          "excludedAutapseCount has no role when autapses are included."
        ));
      }
      deriveDegreeDistribution({
        nodeIds,
        suppliedNodeIds,
        suppliedDegrees,
        suppliedCountedConnectionCount: countedConnectionCount,
        suppliedCountedIncidenceCount: countedIncidenceCount,
        ...excludedAutapseCount !== void 0 ? { suppliedExcludedAutapseCount: excludedAutapseCount } : {},
        direction,
        countingPolicy,
        autapsePolicy,
        binning: { mode: "per_integer_degree" },
        normalization
      });
    }
  } catch (error) {
    errors.push(...fromDerivationError(error, validatorId, ["data"]));
  }
  return errors;
};
function rankLocalEdgeScopeErrors(input) {
  const data = getData(input.context);
  const scope = asRecord(data.scope);
  const kind = asString(scope?.kind);
  const errors = [];
  if (kind === "mpi_target_rank_local") {
    if (scope?.localTargetUniverseComplete !== true) {
      errors.push(makeError({
        code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
        stage: "scope",
        instancePath: pointer("data", "scope", "localTargetUniverseComplete"),
        validatorId: input.validatorId,
        message: "a target-rank-local edge distribution requires the complete local target rectangle."
      }));
    }
    const observed = stringArray(data.observedTargetIds);
    if (!observed || observed.length === 0) {
      errors.push(makeError({
        code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
        stage: "scope",
        instancePath: pointer("data", "observedTargetIds"),
        validatorId: input.validatorId,
        message: "rank-local edge evidence requires a complete non-empty observedTargetIds authority."
      }));
    } else {
      if (input.declaredTargets && !exactSameSet(observed, input.declaredTargets)) {
        errors.push(makeError({
          code: "SCOPE_MERGE_CONFLICT",
          stage: "scope",
          instancePath: pointer("data", "observedTargetIds"),
          validatorId: input.validatorId,
          message: "the declared target selection must equal the target ids this rank says it owns."
        }));
      }
      if (input.allowedTargets) {
        const allowed = new Set(input.allowedTargets);
        const outsideAuthority = observed.findIndex((target) => !allowed.has(target));
        if (outsideAuthority >= 0) {
          errors.push(makeError({
            code: "SCOPE_MERGE_CONFLICT",
            stage: "scope",
            instancePath: pointer("data", "observedTargetIds", outsideAuthority),
            validatorId: input.validatorId,
            message: "the rank-owned target authority must be contained in the declared endpoint universe."
          }));
        }
      }
      if (input.targetIds) {
        const owned = new Set(observed);
        const outside = input.targetIds.findIndex((target) => !owned.has(target));
        if (outside >= 0) {
          errors.push(makeError({
            code: "SCOPE_MERGE_CONFLICT",
            stage: "scope",
            instancePath: pointer("data", "connections", "targetIds", outside),
            validatorId: input.validatorId,
            message: "a rank-local connection targets a node absent from this rank\u2019s ownership authority."
          }));
        }
      }
    }
  }
  if (kind === "sampled") {
    const retained = asNumber(scope?.retainedConnectionCount);
    if (retained !== void 0 && retained !== input.consideredConnectionCount) {
      errors.push(countError(
        input.validatorId,
        ["data", "scope", "retainedConnectionCount"],
        `sampled scope retained ${retained} rows but the distribution accounts for ${input.consideredConnectionCount}.`
      ));
    }
    if (input.pairAggregation) {
      errors.push(makeError({
        code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
        stage: "scope",
        instancePath: pointer("data", "scope", "kind"),
        validatorId: input.validatorId,
        message: "a sampled subset cannot establish a complete multapse aggregate for an ordered pair."
      }));
    }
  }
  return errors;
}
function validatePrebinnedAccounting(input) {
  const counts = asArray(input.data.counts);
  const total = asNumber(input.data[input.totalField]);
  const under = asNumber(input.data[input.underField]);
  const over = asNumber(input.data[input.overField]);
  if (!counts || total === void 0 || under === void 0 || over === void 0) return [];
  const errors = [];
  let accountingScalarsValid = true;
  if (counts.length !== input.bins.edges.length - 1) {
    errors.push(makeError({
      code: "SEMANTIC_LENGTH_MISMATCH",
      stage: "semantic",
      instancePath: pointer("data", "counts"),
      validatorId: input.validatorId,
      message: `counts has ${counts.length} entries for ${input.bins.edges.length - 1} bins.`
    }));
    return errors;
  }
  const countSum = exactCountSum(counts);
  for (const [name, value] of [
    [input.totalField, total],
    [input.underField, under],
    [input.overField, over]
  ]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      accountingScalarsValid = false;
      errors.push(makeError({
        code: "SCIENCE_COUNT_NOT_INTEGER",
        stage: "science",
        instancePath: pointer("data", name),
        validatorId: input.validatorId,
        message: `${name} must be an exact non-negative safe integer.`
      }));
    }
  }
  if (countSum === void 0) {
    errors.push(makeError({
      code: "SCIENCE_COUNT_NOT_INTEGER",
      stage: "science",
      instancePath: pointer("data", "counts"),
      validatorId: input.validatorId,
      message: "every bin count must be an exact non-negative safe integer."
    }));
    return errors;
  }
  if (!accountingScalarsValid) return errors;
  if (countSum + BigInt(under) + BigInt(over) !== BigInt(total)) {
    errors.push(countError(
      input.validatorId,
      ["data", input.totalField],
      `sum(counts) + ${input.underField} + ${input.overField} must equal ${input.totalField} exactly.`
    ));
  }
  const policy = asString(
    input.parameters.outOfRangeDelays ?? input.parameters.outOfRangeWeights
  );
  if (policy === "reject" && (under !== 0 || over !== 0)) {
    errors.push(makeError({
      code: "SCIENCE_BIN_EDGES_INVALID",
      stage: "science",
      instancePath: pointer("data", under !== 0 ? input.underField : input.overField),
      validatorId: input.validatorId,
      message: "reject requires every accepted observation to lie inside the declared bin range."
    }));
  }
  const normalization = asString(input.parameters.normalization);
  const histogram = asRecord(input.data.histogram);
  const suppliedValues = numberArray(histogram?.values);
  const expectedKind = normalization === "density" ? "probability_density" : normalization;
  if (histogram && asString(histogram.kind) !== expectedKind) {
    errors.push(countError(
      input.validatorId,
      ["data", "histogram", "kind"],
      `histogram.kind must be ${expectedKind} for normalization ${normalization}.`
    ));
  }
  if (suppliedValues && normalization === "count") {
    if (suppliedValues.length !== counts.length || suppliedValues.some((value, ordinal) => value !== counts[ordinal])) {
      errors.push(countError(
        input.validatorId,
        ["data", "histogram", "values"],
        "count histogram values must equal the exact raw counts element for element."
      ));
    }
  }
  if (suppliedValues && (normalization === "probability" || normalization === "density")) {
    try {
      const mismatches = verifyHistogramValues({
        counts,
        suppliedValues,
        edges: input.bins.edges,
        unit: input.bins.unit,
        normalization
      });
      if (mismatches.length > 0) {
        errors.push(countError(
          input.validatorId,
          ["data", "histogram", "values", mismatches[0]],
          "supplied normalized value does not follow from its exact count and in-range denominator."
        ));
      }
    } catch (error) {
      errors.push(...fromDerivationError(error, input.validatorId, ["data"]));
    }
  }
  return errors;
}
var topologyDelayPositive = (context) => {
  if (context.skillId !== "network.delay_distribution") {
    const values = asArray(asRecord(asRecord(getData(context).connections)?.delays)?.values);
    if (!values) return [];
    const invalid = values.findIndex((value) => value !== null && (typeof value !== "number" || !Number.isFinite(value) || !(value > 0)));
    return invalid < 0 ? [] : [makeError({
      code: "SCIENCE_DELAY_NONPOSITIVE",
      stage: "science",
      instancePath: pointer("data", "connections", "delays", "values", invalid),
      validatorId: "topology.delay_positive",
      message: "a delay must be finite and strictly positive."
    })];
  }
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = "topology.delay_positive";
  const bins = resolveBins(asRecord(parameters.bins), true);
  if (!bins) return [];
  if (!isKnownUnit(bins.unit) || dimensionOf(bins.unit) !== "time") return [];
  const normalization = asString(parameters.normalization);
  const outOfRangePolicy = asString(parameters.outOfRangeDelays);
  const countingPolicy = asString(parameters.countingPolicy);
  if (!normalization || !outOfRangePolicy || !countingPolicy) return [];
  const errors = [];
  if (asString(data.mode) === "connections") {
    const connections = asRecord(data.connections);
    const sourceIds = stringArray(connections?.sourceIds);
    const targetIds = stringArray(connections?.targetIds);
    const delays = numberArray(asRecord(connections?.delays)?.values);
    const delayUnit = legalKnownUnit(asRecord(connections?.delays));
    const nodeIds = stringArray(asRecord(data.nodeUniverse)?.ids);
    const synapseModels = stringArray(connections?.synapseModels);
    const groupBy = asString(data.groupBy);
    const aggregation = asString(parameters.multapseAggregation);
    if (!sourceIds || !targetIds || !delays || !delayUnit || !nodeIds || !groupBy) return [];
    try {
      deriveDelayDistribution({
        sourceIds,
        targetIds,
        delayValues: delays,
        delayUnit,
        nodeUniverse: nodeIds,
        ...synapseModels ? { synapseModels } : {},
        groupBy,
        countingPolicy,
        ...aggregation ? { aggregation } : {},
        bins: { ...bins, edgeToleranceUlps: 8 },
        normalization,
        outOfRangePolicy
      });
    } catch (error) {
      errors.push(...fromDerivationError(error, validatorId, ["data", "connections"]));
    }
    errors.push(...rankLocalEdgeScopeErrors({
      context,
      validatorId,
      targetIds,
      allowedTargets: nodeIds,
      consideredConnectionCount: sourceIds.length,
      pairAggregation: countingPolicy === "per_ordered_pair"
    }));
    return errors;
  }
  if (asString(data.mode) !== "prebinned") return [];
  errors.push(...validatePrebinnedAccounting({
    data,
    parameters,
    bins,
    validatorId,
    totalField: "totalObservationCount",
    underField: "underRangeCount",
    overField: "overRangeCount"
  }));
  const considered = asNumber(data.consideredConnectionCount);
  const total = asNumber(data.totalObservationCount);
  if (considered !== void 0 && total !== void 0) {
    if (countingPolicy === "per_connection" && considered !== total) {
      errors.push(countError(
        validatorId,
        ["data", "totalObservationCount"],
        "per_connection requires exactly one delay observation per considered connection row."
      ));
    }
    if (countingPolicy === "per_ordered_pair") {
      const pairCount = asNumber(data.consideredOrderedPairCount);
      if (!Number.isSafeInteger(pairCount) || pairCount < 0 || pairCount !== total || pairCount > considered) {
        errors.push(countError(
          validatorId,
          ["data", "consideredOrderedPairCount"],
          "pre-binned per_ordered_pair requires an exact pair count equal to total observations and no greater than considered rows."
        ));
      }
    }
    if (asString(data.groupBy) !== "none") {
      errors.push(countError(
        validatorId,
        ["data", "groupBy"],
        "revision-2 pre-binned delay input has one count vector and therefore supports exactly groupBy: none."
      ));
    }
    errors.push(...rankLocalEdgeScopeErrors({
      context,
      validatorId,
      declaredTargets: stringArray(data.observedTargetIds),
      consideredConnectionCount: considered,
      pairAggregation: countingPolicy === "per_ordered_pair"
    }));
  }
  return errors;
};
function validateWeightZeroAxis(bins, signTreatment, validatorId) {
  const first = bins.edges[0];
  const last = bins.edges[bins.edges.length - 1];
  if (signTreatment === "magnitude" && first < 0) {
    return [makeError({
      code: "SCIENCE_BIN_EDGES_INVALID",
      stage: "science",
      instancePath: pointer("parameters", "bins"),
      validatorId,
      message: "magnitude observations are non-negative; a negative bin domain has no accepted role."
    })];
  }
  if (signTreatment === "preserve" && first < 0 && last > 0 && !bins.edges.some((edge) => edge === 0)) {
    return [makeError({
      code: "SCIENCE_BIN_EDGES_INVALID",
      stage: "science",
      instancePath: pointer("parameters", "bins"),
      validatorId,
      message: "a sign-preserving range that spans zero requires an exact binary64 edge at 0; no bin may conflate negative and non-negative weights."
    })];
  }
  return [];
}
function validateWeightComparability(parameters, models, validatorId) {
  const distinct = [...new Set(models)].sort();
  const claim = asRecord(parameters.weightComparability);
  const mode = asString(claim?.mode);
  if (mode === "single_synapse_model" && distinct.length !== 1) {
    return [makeError({
      code: "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
      stage: "science",
      instancePath: pointer("parameters", "weightComparability"),
      validatorId,
      message: `single_synapse_model was declared but ${distinct.length} distinct models contribute.`
    })];
  }
  if (mode === "declared_comparable_models") {
    const declared = stringArray(claim?.comparableModels);
    if (!declared || new Set(declared).size !== declared.length || !exactSameSet(distinct, declared)) {
      return [makeError({
        code: "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
        stage: "science",
        instancePath: pointer("parameters", "weightComparability", "comparableModels"),
        validatorId,
        message: "declared comparable models must equal the distinct contributing model set exactly once."
      })];
    }
  }
  if (asString(parameters.grouping) === "by_synapse_model" && distinct.length < 2) {
    return [makeError({
      code: "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
      stage: "science",
      instancePath: pointer("parameters", "grouping"),
      validatorId,
      message: "grouping one model is a redundant second encoding of the ungrouped figure."
    })];
  }
  return [];
}
var topologyWeightGroupCompatible = (context) => {
  if (context.skillId !== "network.weight_distribution") {
    const data2 = getData(context);
    const connections = asRecord(data2.connections);
    const models2 = stringArray(connections?.synapseModels);
    if (!models2 || new Set(models2).size <= 1 || asString(getParameters(context).synapseModelGroup)) {
      return [];
    }
    return [makeError({
      code: "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
      stage: "science",
      instancePath: pointer("data", "connections", "synapseModels"),
      validatorId: "topology.weight_group_compatible",
      message: "weights from multiple models require an explicit comparability/group declaration."
    })];
  }
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = "topology.weight_group_compatible";
  const mode = asString(data.mode);
  const bins = mode === "connections" ? resolveBins(asRecord(parameters.bins), true) : (() => {
    const node = asRecord(data.binEdges);
    const edges = numberArray(node?.edges);
    const unit = asString(node?.unit);
    return edges && unit ? { edges, unit, finalEdgeInclusive: true } : void 0;
  })();
  if (!bins) return [];
  if (!isKnownUnit(bins.unit)) return [];
  if (mode === "prebinned" && !kindAcceptsDimension("synaptic_weight", String(dimensionOf(bins.unit)))) return [];
  const errors = validateWeightZeroAxis(bins, asString(parameters.signTreatment), validatorId);
  const observationUnit = asString(parameters.observationUnit);
  const grouping = asString(parameters.grouping);
  const signTreatment = asString(parameters.signTreatment);
  const normalization = asString(parameters.normalization);
  const outOfRangePolicy = asString(parameters.outOfRangeWeights);
  const aggregation = asString(parameters.aggregation);
  if (!observationUnit || !grouping || !signTreatment || !normalization || !outOfRangePolicy) {
    return errors;
  }
  const sourceUniverseNode = asRecord(data.sourceUniverse);
  const targetUniverseNode = asRecord(data.targetUniverse);
  const sourceUniverse = stringArray(sourceUniverseNode?.ids);
  const targetUniverse = stringArray(targetUniverseNode?.ids);
  if (!sourceUniverse || !targetUniverse) return errors;
  if (sourceUniverseNode?.complete !== true || targetUniverseNode?.complete !== true) {
    errors.push(makeError({
      code: "SCOPE_NODE_UNIVERSE_REQUIRED",
      stage: "scope",
      instancePath: pointer("data", sourceUniverseNode?.complete !== true ? "sourceUniverse" : "targetUniverse", "complete"),
      validatorId,
      message: "the selected source \xD7 target rectangle requires complete declared endpoint universes."
    }));
  }
  if (mode === "connections") {
    const connections = asRecord(data.connections);
    const sourceIds = stringArray(connections?.sourceIds);
    const targetIds = stringArray(connections?.targetIds);
    const weights = nullableNumberArray(asRecord(connections?.weights)?.values);
    const weightUnit = legalKnownUnit(asRecord(connections?.weights));
    const models2 = stringArray(connections?.synapseModels);
    if (!sourceIds || !targetIds || !weights || !weightUnit || !models2) return errors;
    if (!(weightUnit === bins.unit || axesAreCompatible(weightUnit, bins.unit))) return errors;
    errors.push(...validateWeightComparability(parameters, models2, validatorId));
    try {
      const result = deriveWeightDistribution({
        sourceIds,
        targetIds,
        weightValues: weights,
        weightUnit,
        sourceUniverse,
        targetUniverse,
        synapseModels: models2,
        grouping,
        observationUnit,
        ...aggregation ? { aggregation } : {},
        signTreatment,
        bins,
        normalization,
        outOfRangePolicy
      });
      if (asString(parameters.xScale) === "log" && (bins.edges.some((edge) => !(edge > 0)) || result.minimumObservation === null || !(result.minimumObservation > 0))) {
        errors.push(makeError({
          code: "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
          stage: "render",
          instancePath: pointer("parameters", "xScale"),
          validatorId,
          message: "a logarithmic weight axis requires every edge and every formed observation to be strictly positive; missing values are not converted to zero."
        }));
      }
    } catch (error) {
      errors.push(...fromDerivationError(error, validatorId, ["data", "connections"]));
    }
    errors.push(...rankLocalEdgeScopeErrors({
      context,
      validatorId,
      targetIds,
      declaredTargets: targetUniverse,
      consideredConnectionCount: sourceIds.length,
      pairAggregation: observationUnit === "node_pair"
    }));
    return errors;
  }
  if (mode !== "prebinned") return errors;
  const models = stringArray(data.contributingSynapseModels);
  if (models) errors.push(...validateWeightComparability(parameters, models, validatorId));
  if (grouping !== "none") {
    errors.push(countError(
      validatorId,
      ["parameters", "grouping"],
      "revision-2 pre-binned input has one count vector and therefore supports exactly grouping: none."
    ));
  }
  errors.push(...validatePrebinnedAccounting({
    data,
    parameters,
    bins,
    validatorId,
    totalField: "totalObservationCount",
    underField: "excludedUnderRangeCount",
    overField: "excludedOverRangeCount"
  }));
  const sourceConnectionCount = asNumber(data.sourceConnectionCount);
  const missingWeightCount = asNumber(data.missingWeightCount);
  const missingObservationCount = asNumber(data.missingObservationCount);
  const totalObservationCount = asNumber(data.totalObservationCount);
  const zeroWeightCount = asNumber(data.zeroWeightCount);
  if (sourceConnectionCount !== void 0 && missingWeightCount !== void 0 && missingObservationCount !== void 0 && totalObservationCount !== void 0 && zeroWeightCount !== void 0) {
    let accountingScalarsValid = true;
    for (const [name, value] of [
      ["sourceConnectionCount", sourceConnectionCount],
      ["missingWeightCount", missingWeightCount],
      ["missingObservationCount", missingObservationCount],
      ["totalObservationCount", totalObservationCount],
      ["zeroWeightCount", zeroWeightCount]
    ]) {
      if (!Number.isSafeInteger(value) || value < 0) {
        accountingScalarsValid = false;
        errors.push(makeError({
          code: "SCIENCE_COUNT_NOT_INTEGER",
          stage: "science",
          instancePath: pointer("data", name),
          validatorId,
          message: `${name} must be an exact non-negative safe integer.`
        }));
      }
    }
    if (!accountingScalarsValid) return errors;
    if (zeroWeightCount > totalObservationCount) {
      errors.push(countError(
        validatorId,
        ["data", "zeroWeightCount"],
        "measured-zero observations cannot outnumber all formed observations."
      ));
    }
    if (observationUnit === "synapse") {
      if (missingObservationCount !== missingWeightCount || BigInt(totalObservationCount) + BigInt(missingObservationCount) !== BigInt(sourceConnectionCount)) {
        errors.push(countError(
          validatorId,
          ["data", "sourceConnectionCount"],
          "synapse mode requires missing observations to equal missing rows and every connection to be exactly one measured or missing observation."
        ));
      }
    } else {
      const pairCount = asNumber(data.sourceOrderedPairCount);
      if (!Number.isSafeInteger(pairCount) || pairCount < 0 || BigInt(totalObservationCount) + BigInt(missingObservationCount) !== BigInt(pairCount) || pairCount > sourceConnectionCount || missingObservationCount > missingWeightCount) {
        errors.push(countError(
          validatorId,
          ["data", "sourceOrderedPairCount"],
          "node_pair mode requires exact pair accounting: observed pairs + missing pairs = source ordered pairs <= connection rows."
        ));
      }
    }
    if (asString(parameters.xScale) === "log" && (bins.edges.some((edge) => !(edge > 0)) || zeroWeightCount > 0)) {
      errors.push(makeError({
        code: "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
        stage: "render",
        instancePath: pointer("parameters", "xScale"),
        validatorId,
        message: "a logarithmic axis cannot represent a measured zero or a non-positive bin edge."
      }));
    }
    errors.push(...rankLocalEdgeScopeErrors({
      context,
      validatorId,
      declaredTargets: targetUniverse,
      consideredConnectionCount: sourceConnectionCount,
      pairAggregation: observationUnit === "node_pair"
    }));
  }
  const histogram = asRecord(data.histogram);
  if (histogram) {
    const expectedUnit = normalization === "density" ? reciprocalUnit(bins.unit) : "1";
    if (expectedUnit === void 0 || asString(histogram.unit) !== expectedUnit) {
      errors.push(makeError({
        code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
        stage: "science",
        instancePath: pointer("data", "histogram", "unit"),
        validatorId,
        message: `the supplied normalized histogram requires unit ${String(expectedUnit)}.`
      }));
    }
  }
  return errors;
};

// src/core/semantics/uncertainty.ts
function findUncertainty(context) {
  const fromParameters = asRecord(getParameters(context).uncertainty);
  if (fromParameters) return { node: fromParameters, path: ["parameters", "uncertainty"] };
  const fromData = asRecord(getData(context).uncertainty);
  if (fromData) return { node: fromData, path: ["data", "uncertainty"] };
  return void 0;
}
function validateUncertaintyNode(node, path, validatorId = "uncertainty.valid") {
  const kind = asString(node.kind);
  if (!kind || kind === "none") return [];
  const errors = [];
  const level = asNumber(node.level);
  if (level !== void 0 && !(level > 0 && level < 1)) {
    errors.push(
      makeError({
        code: "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
        stage: "science",
        instancePath: pointer(...path, "level"),
        validatorId,
        message: `an interval level must lie strictly in (0, 1); got ${level}. A 95% interval is 0.95, not 95.`
      })
    );
  }
  if (kind === "standard_deviation" || kind === "standard_error") {
    const values = asArray(node.values);
    if (values) {
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value === null) continue;
        const numeric = asNumber(value);
        if (numeric !== void 0 && numeric < 0) {
          errors.push(
            makeError({
              code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
              stage: "science",
              instancePath: pointer(...path, "values", i),
              validatorId,
              message: `a ${kind.replace("_", " ")} cannot be negative; got ${numeric}. It is a distance.`
            })
          );
          break;
        }
      }
    }
    const sampleCounts2 = asArray(node.sampleCount);
    if (values && sampleCounts2) {
      for (let i = 0; i < Math.min(values.length, sampleCounts2.length); i++) {
        if (values[i] === null !== (sampleCounts2[i] === null)) {
          errors.push(
            makeError({
              code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
              stage: "science",
              instancePath: pointer(...path, "sampleCount", i),
              validatorId,
              message: `at index ${i}, ${kind.replace("_", " ")} and sampleCount must be present or missing together. A sample count cannot qualify an absent dispersion, and a dispersion without its required count is incomplete.`
            })
          );
          break;
        }
      }
    }
  }
  const lower = asArray(node.lower);
  const upper = asArray(node.upper);
  if (lower && upper) {
    if (lower.length !== upper.length) {
      errors.push(
        makeError({
          code: "SEMANTIC_LENGTH_MISMATCH",
          stage: "semantic",
          instancePath: pointer(...path, "upper"),
          validatorId,
          message: `the lower bounds have ${lower.length} entries and the upper bounds ${upper.length}. They describe the same points.`
        })
      );
    } else {
      for (let i = 0; i < lower.length; i++) {
        const lo = lower[i];
        const hi = upper[i];
        if (lo === null !== (hi === null)) {
          errors.push(
            makeError({
              code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
              stage: "science",
              instancePath: pointer(...path, hi === null ? "upper" : "lower", i),
              validatorId,
              message: `at index ${i}, lower and upper uncertainty bounds must be present or missing together. A one-sided value is not the declared two-sided interval.`
            })
          );
          break;
        }
        if (lo === null) continue;
        const loValue = asNumber(lo);
        const hiValue = asNumber(hi);
        if (loValue !== void 0 && hiValue !== void 0 && loValue > hiValue) {
          errors.push(
            makeError({
              code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
              stage: "science",
              instancePath: pointer(...path, "lower", i),
              validatorId,
              message: `at index ${i} the lower bound (${loValue}) exceeds the upper bound (${hiValue}).`
            })
          );
          break;
        }
      }
    }
  }
  const sampleCounts = asArray(node.sampleCount);
  if (lower && upper && sampleCounts) {
    for (let i = 0; i < Math.min(lower.length, upper.length, sampleCounts.length); i++) {
      const boundsMissing = lower[i] === null && upper[i] === null;
      if (boundsMissing !== (sampleCounts[i] === null)) {
        errors.push(
          makeError({
            code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
            stage: "science",
            instancePath: pointer(...path, "sampleCount", i),
            validatorId,
            message: `at index ${i}, interval bounds and sampleCount must share one missingness mask. A count cannot qualify an absent interval, and a counted interval cannot omit its count.`
          })
        );
        break;
      }
    }
  }
  if (sampleCounts) {
    for (let i = 0; i < sampleCounts.length; i++) {
      const count = sampleCounts[i];
      if (count === null) continue;
      const numeric = asNumber(count);
      if (numeric !== void 0 && (!Number.isSafeInteger(numeric) || numeric < 1)) {
        errors.push(
          makeError({
            code: "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
            stage: "science",
            instancePath: pointer(...path, "sampleCount", i),
            validatorId,
            message: `a sample count must be a positive safe integer; got ${numeric}. Binary64 cannot preserve exact cardinality outside the safe-integer domain, and an interval estimated from zero samples is not an interval.`
          })
        );
        break;
      }
    }
  }
  if (kind === "quantile_interval") {
    const lowerQuantile = asNumber(node.lowerQuantile);
    const upperQuantile = asNumber(node.upperQuantile);
    if (lowerQuantile !== void 0 && upperQuantile !== void 0 && !(lowerQuantile < upperQuantile)) {
      errors.push(
        makeError({
          code: "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
          stage: "science",
          instancePath: pointer(...path, "upperQuantile"),
          validatorId,
          message: `the lower quantile (${lowerQuantile}) must be below the upper quantile (${upperQuantile}).`
        })
      );
    }
  }
  return errors;
}
var uncertaintyValid = (context) => {
  const found = findUncertainty(context);
  return found === void 0 ? [] : validateUncertaintyNode(found.node, found.path);
};
var uncertaintySupportedVariant = (context) => {
  const found = findUncertainty(context);
  if (!found) return [];
  const { node, path } = found;
  const kind = asString(node.kind);
  if (!kind) return [];
  const catalog = SKILL_CATALOG[context.skillId];
  if (!catalog) return [];
  const supported = catalog.uncertaintySupport;
  const errors = [];
  if (!supported.includes(kind)) {
    errors.push(
      makeError({
        code: "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
        stage: "science",
        instancePath: pointer(...path, "kind"),
        validatorId: "uncertainty.supported_variant",
        skillId: context.skillId,
        message: `${context.skillId} cannot render a "${kind}" truthfully. It supports: ${supported.join(", ")}.`
      })
    );
  }
  return errors;
};
var traceDuplicateTimePolicy = (context) => {
  const data = getData(context);
  const parameters = getParameters(context);
  const policyNode = parameters.duplicateTimePolicy;
  const policy = asString(policyNode) ?? asString(asRecord(policyNode)?.policy);
  const candidates = [];
  const sharedTimes = asArray(asRecord(data.eventTimes)?.values);
  if (data.timeBase === "shared" && sharedTimes) {
    candidates.push({ times: sharedTimes, label: "the shared time base" });
  }
  const series = asArray(data.series);
  if (series) {
    for (let index = 0; index < series.length; index++) {
      const times = asArray(asRecord(asRecord(series[index])?.time)?.values);
      if (times) candidates.push({ times, label: `series ${index}` });
    }
  }
  for (const candidate of candidates) {
    const seen = /* @__PURE__ */ new Set();
    for (const time of candidate.times) {
      const value = asNumber(time);
      if (value === void 0) continue;
      if (seen.has(value)) {
        const declaration = policy === void 0 ? "no duplicate-time policy was declared" : `the declared policy is "${policy}", which requires duplicates to be absent`;
        if (policy === "keep_replicates" || policy === "aggregate") return [];
        return [
          makeError({
            code: "SCIENCE_DUPLICATE_TIME_POLICY",
            stage: "science",
            instancePath: pointer("parameters", "duplicateTimePolicy"),
            validatorId: "trace.duplicate_time_policy",
            message: `${candidate.label} has more than one sample at t = ${value}, and ${declaration}. Choose keep_replicates, or a named aggregate. Cortexel does not apply last-write-wins, because which sample survives would then depend on array order rather than on anything scientific.`
          })
        ];
      }
      seen.add(value);
    }
  }
  return [];
};
var traceAxisDimensionCompatible = (context) => {
  const series = asArray(getData(context).series);
  if (!series || series.length < 1) return [];
  const parameters = getParameters(context);
  const layout = asString(parameters.layout);
  if (layout === "small_multiples" || layout === "normalized_overlay") return [];
  const units = [];
  for (let i = 0; i < series.length; i++) {
    const values = asRecord(asRecord(series[i])?.values);
    const declaredUnit = asString(values?.unit);
    if (declaredUnit === void 0) continue;
    const unit = legalKnownUnit(values);
    if (unit === void 0) return [];
    units.push({ unit, index: i });
  }
  if (units.length < 1) return [];
  const targetUnit = asString(parameters.valueUnit);
  if (targetUnit !== void 0 && isKnownUnit(targetUnit)) {
    for (const entry of units) {
      if (!isKnownUnit(entry.unit) || entry.unit === targetUnit || axesAreCompatible(entry.unit, targetUnit)) continue;
      const simulatorDefined = dimensionOf(entry.unit) === "simulator_defined" || dimensionOf(targetUnit) === "simulator_defined";
      return [
        makeError({
          code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
          stage: "science",
          instancePath: pointer("parameters", "valueUnit"),
          validatorId: "trace.axis_dimension_compatible",
          message: simulatorDefined ? `valueUnit "${targetUnit}" cannot be a shared display unit for series ${entry.index}: different simulator-defined unit codes have no registered conversion relation.` : `valueUnit "${targetUnit}" cannot display series ${entry.index} in "${entry.unit}" because their registered dimensions differ. A shared axis may convert scale, never physical meaning.`
        })
      ];
    }
  }
  if (units.length < 2) return [];
  const errors = [];
  const first = units[0];
  if (context.skillId === "network.synaptic_weight_trace" && dimensionOf(first.unit) === "simulator_defined" && units.every((entry) => entry.unit === first.unit)) {
    return [];
  }
  for (const entry of units.slice(1)) {
    if (!axesAreCompatible(entry.unit, first.unit)) {
      const simulatorDefined = dimensionOf(entry.unit) === "simulator_defined" || dimensionOf(first.unit) === "simulator_defined";
      errors.push(
        makeError({
          code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
          stage: "science",
          instancePath: pointer("data", "series", entry.index, "values", "unit"),
          validatorId: "trace.axis_dimension_compatible",
          message: simulatorDefined ? `series ${entry.index} and series ${first.index} use simulator-defined units. Even an identical code cannot establish cross-series comparability because its physical meaning depends on the source model. Put each series on its own panel.` : `series ${entry.index} is in "${entry.unit}" but series ${first.index} is in "${first.unit}", and these are different dimensions. Overlaying them on one axis produces something that looks exactly like a comparison and is not one. Use layout "small_multiples".`,
          repair: {
            operation: "replace",
            path: pointer("parameters", "layout"),
            value: "small_multiples",
            reasonCode: "SCIENCE_UNIT_DIMENSION_MISMATCH"
          }
        })
      );
      break;
    }
  }
  return errors;
};
var responseCurveEstimatorDeclared = (context) => {
  const parameters = getParameters(context);
  const data = getData(context);
  const mode = asString(data.mode);
  const carrier = asRecord(
    mode === "aggregates" ? data.aggregates : data.observations
  );
  const response = asRecord(carrier?.response);
  const parameterMethod = asString(parameters.responseMethod);
  const responseMethod = asString(response?.method);
  const errors = [];
  let rateAuthority;
  let peakBasisVerification;
  const conditions = asRecord(data.conditions);
  if (asString(conditions?.axis) === "numeric") {
    const inputs = asArray(asRecord(conditions?.input)?.values);
    if (inputs) {
      const seen = /* @__PURE__ */ new Map();
      for (let index = 0; index < inputs.length; index++) {
        const value = asNumber(inputs[index]);
        if (value === void 0) continue;
        if (asString(asRecord(conditions?.input)?.scale) === "log10" && !(value > 0)) {
          errors.push(
            makeError({
              code: "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
              stage: "render",
              instancePath: pointer("data", "conditions", "input", "values", index),
              validatorId: "response_curve.estimator_declared",
              message: `a log10 response-curve input axis requires every declared value to be strictly positive; got ${value}.`
            })
          );
          break;
        }
        const prior = seen.get(value);
        if (prior !== void 0) {
          errors.push(
            makeError({
              code: "SCIENCE_RESPONSE_INPUT_DUPLICATE",
              stage: "science",
              instancePath: pointer("data", "conditions", "input", "values", index),
              validatorId: "response_curve.estimator_declared",
              message: `numeric input ${value} is declared by both condition indices ${prior} and ${index}. Overlapping them at one x coordinate would hide which condition owns a point or gap.`
            })
          );
          break;
        }
        seen.set(value, index);
      }
    }
  }
  if (parameterMethod === void 0) {
    errors.push(
      makeError({
        code: "SEMANTIC_LENGTH_MISMATCH",
        stage: "semantic",
        instancePath: pointer("parameters", "responseMethod"),
        validatorId: "response_curve.estimator_declared",
        message: "declare what the response VALUE is \u2014 a mean rate, a peak, a latency. It cannot be inferred from the name of the figure, and a curve whose y axis has no defined meaning is not a result."
      })
    );
  }
  if (responseMethod !== void 0 && parameterMethod !== responseMethod) {
    errors.push(
      makeError({
        code: "SCIENCE_RESPONSE_METHOD_MISMATCH",
        stage: "science",
        instancePath: pointer("parameters", "responseMethod"),
        validatorId: "response_curve.estimator_declared",
        message: `parameters.responseMethod is ${JSON.stringify(parameterMethod)} but the response values are typed as ${JSON.stringify(responseMethod)}. Relabelling the same numbers as a different scientific quantity is refused.`
      })
    );
  }
  const rateResponse = responseMethod === "mean_firing_rate" || responseMethod === "peak_firing_rate";
  const eventScope = verifyResponseEventScope(data.eventScope);
  if (!eventScope.ok) {
    errors.push(
      makeError({
        code: "SCIENCE_EVENT_SCOPE_UNVERIFIABLE",
        stage: "science",
        instancePath: `/data${eventScope.path}`,
        validatorId: "response_curve.estimator_declared",
        message: eventScope.message
      })
    );
  }
  if (rateResponse && eventScope.ok) {
    rateAuthority = verifyResponseRateAuthority(
      response?.rateNormalization,
      data.eventScope
    );
    if (!rateAuthority.ok) {
      const instancePath = rateAuthority.path === "/rateNormalization" ? pointer(
        "data",
        mode === "aggregates" ? "aggregates" : "observations",
        "response",
        "rateNormalization"
      ) : `/data${rateAuthority.path}`;
      errors.push(
        makeError({
          code: rateAuthority.path.startsWith("/eventScope") ? "SCIENCE_EVENT_SCOPE_UNVERIFIABLE" : "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          stage: "science",
          instancePath,
          validatorId: "response_curve.estimator_declared",
          message: rateAuthority.message
        })
      );
    }
  }
  if (responseMethod === "peak_firing_rate") {
    peakBasisVerification = verifyPeakBasisAgainstWindow(response?.basis, data.measurementWindow);
    if (!peakBasisVerification.ok) {
      const responseBase = pointer(
        "data",
        mode === "aggregates" ? "aggregates" : "observations",
        "response"
      );
      errors.push(
        makeError({
          code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          stage: "science",
          instancePath: peakBasisVerification.path === "/measurementWindow" ? pointer("data", "measurementWindow") : `${responseBase}${peakBasisVerification.path}`,
          validatorId: "response_curve.estimator_declared",
          message: peakBasisVerification.message
        })
      );
    }
  }
  const values = asArray(response?.values);
  if (responseMethod !== void 0 && values) {
    for (let index = 0; index < values.length; index++) {
      if (values[index] === null) continue;
      const value = asNumber(values[index]);
      if (value === void 0) continue;
      const instancePath = pointer(
        "data",
        mode === "aggregates" ? "aggregates" : "observations",
        "response",
        "values",
        index
      );
      if ((responseMethod === "mean_firing_rate" || responseMethod === "peak_firing_rate") && value < 0) {
        errors.push(
          makeError({
            code: "SCIENCE_RESPONSE_VALUE_INVALID",
            stage: "science",
            instancePath,
            validatorId: "response_curve.estimator_declared",
            message: `${responseMethod} is a firing rate and cannot be negative; got ${value}. A silent repeat is measured zero, not a negative rate.`
          })
        );
        break;
      }
      if (responseMethod === "first_spike_latency" && value < 0) {
        errors.push(
          makeError({
            code: "SCIENCE_RESPONSE_VALUE_INVALID",
            stage: "science",
            instancePath,
            validatorId: "response_curve.estimator_declared",
            message: `a defined first-spike latency must be non-negative; got ${value}. Zero means the first event occurred exactly at the included measurement-window start; use null only when no first spike occurred.`
          })
        );
        break;
      }
      if (responseMethod === "event_count") {
        if (mode === "repeats" && (!Number.isSafeInteger(value) || value < 0)) {
          errors.push(
            makeError({
              code: "SCIENCE_COUNT_NOT_INTEGER",
              stage: "science",
              instancePath,
              validatorId: "response_curve.estimator_declared",
              message: `a raw repeat event count must be an exact non-negative safe integer; got ${value}.`
            })
          );
          break;
        }
        if (mode === "aggregates" && value < 0) {
          errors.push(
            makeError({
              code: "SCIENCE_RESPONSE_VALUE_INVALID",
              stage: "science",
              instancePath,
              validatorId: "response_curve.estimator_declared",
              message: `an aggregate estimator over event counts may be fractional but cannot be negative; got ${value}.`
            })
          );
          break;
        }
      }
    }
  }
  if (responseMethod === "first_spike_latency" && asString(response?.latencyReference) !== "measurement_window_start") {
    errors.push(
      makeError({
        code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        stage: "science",
        instancePath: pointer(
          "data",
          mode === "aggregates" ? "aggregates" : "observations",
          "response",
          "latencyReference"
        ),
        validatorId: "response_curve.estimator_declared",
        message: "revision 2 supports first-spike latency only from measurement_window_start; stimulus onset has no typed coordinate relative to the window."
      })
    );
  }
  if (responseMethod === "first_spike_latency" && asString(response?.latencyReference) === "measurement_window_start" && values) {
    const window = asRecord(data.measurementWindow);
    const windowStart = asNumber(window?.start);
    const windowStop = asNumber(window?.stop);
    const windowUnit = asString(window?.unit);
    const responseUnit = asString(response?.unit);
    if (windowStart !== void 0 && windowStop !== void 0 && windowStop > windowStart && windowUnit !== void 0 && responseUnit !== void 0 && dimensionOf(windowUnit) === dimensionOf(responseUnit)) {
      const closedStop = asString(window?.boundary) === "[start,stop]";
      for (let index = 0; index < values.length; index++) {
        if (values[index] === null) continue;
        const latency = asNumber(values[index]);
        if (latency === void 0 || latency < 0) continue;
        const comparison = compareExactUnitArraySumToDifference(
          [latency],
          responseUnit,
          { value: windowStart, unit: windowUnit },
          { value: windowStop, unit: windowUnit }
        );
        if (comparison > 0 || comparison === 0 && !closedStop) {
          errors.push(
            makeError({
              code: "SCIENCE_LATENCY_OUTSIDE_WINDOW",
              stage: "science",
              instancePath: pointer(
                "data",
                mode === "aggregates" ? "aggregates" : "observations",
                "response",
                "values",
                index
              ),
              validatorId: "response_curve.estimator_declared",
              message: `first-spike latency ${latency} ${responseUnit} is referenced to the measurement-window start but does not lie inside the declared ${closedStop ? "closed" : "half-open"} window of exact duration (${windowStop} - ${windowStart}) ${windowUnit}.`
            })
          );
          break;
        }
      }
    }
  }
  if (mode === "aggregates" && values) {
    const sampleCounts = asArray(carrier?.sampleCounts);
    const excludedCounts = asArray(carrier?.excludedCounts);
    const trimmedCounts = asArray(carrier?.trimmedCounts);
    const estimator = asString(parameters.estimator);
    const trimFraction = asNumber(parameters.trimFraction);
    if (estimator === "trimmed_mean" && !trimmedCounts) {
      errors.push(
        makeError({
          code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          stage: "science",
          instancePath: pointer("data", "aggregates", "trimmedCounts"),
          validatorId: "response_curve.estimator_declared",
          message: "trimmed_mean aggregate input must declare how many defined observations were removed symmetrically from the two tails in each condition."
        })
      );
    } else if (estimator !== "trimmed_mean" && carrier?.trimmedCounts !== void 0) {
      errors.push(
        makeError({
          code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          stage: "science",
          instancePath: pointer("data", "aggregates", "trimmedCounts"),
          validatorId: "response_curve.estimator_declared",
          message: "trimmedCounts is an unused scientific claim unless the estimator is trimmed_mean."
        })
      );
    }
    for (const [field, entries] of [
      ["sampleCounts", sampleCounts],
      ["excludedCounts", excludedCounts],
      ...trimmedCounts ? [["trimmedCounts", trimmedCounts]] : []
    ]) {
      if (entries && entries.length !== values.length) {
        errors.push(
          makeError({
            code: "SEMANTIC_LENGTH_MISMATCH",
            stage: "semantic",
            instancePath: pointer("data", "aggregates", field),
            validatorId: "response_curve.estimator_declared",
            message: `aggregate response values and ${field} must have identical lengths.`
          })
        );
      }
    }
    if (sampleCounts && excludedCounts && sampleCounts.length === values.length && excludedCounts.length === values.length && (!trimmedCounts || trimmedCounts.length === values.length)) {
      let retainedTotal = 0n;
      let trimmedTotal = 0n;
      let excludedTotal = 0n;
      const maximum = BigInt(Number.MAX_SAFE_INTEGER);
      for (let index = 0; index < values.length; index++) {
        if (values[index] === null !== (sampleCounts[index] === null)) {
          errors.push(
            makeError({
              code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
              stage: "science",
              instancePath: pointer("data", "aggregates", "sampleCounts", index),
              validatorId: "response_curve.estimator_declared",
              message: `aggregate response and retained sample count must be present or missing together at condition index ${index}. A point cannot have n without an estimate, or an estimate without n.`
            })
          );
          break;
        }
        const rawSampleCount = sampleCounts[index];
        const sampleCount = rawSampleCount === null ? 0 : asNumber(rawSampleCount);
        const excludedCount = asNumber(excludedCounts[index]);
        const trimmedCount = trimmedCounts ? asNumber(trimmedCounts[index]) : 0;
        let invalidExactCount = false;
        for (const [field, value] of [
          ["sampleCounts", sampleCount],
          ["excludedCounts", excludedCount],
          ["trimmedCounts", trimmedCount]
        ]) {
          if (value !== void 0 && (!Number.isSafeInteger(value) || value < 0)) {
            errors.push(
              makeError({
                code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
                stage: "science",
                instancePath: pointer("data", "aggregates", field, index),
                validatorId: "response_curve.estimator_declared",
                message: `${field}[${index}] must be an exact non-negative safe integer for artifact accounting; got ${value}.`
              })
            );
            invalidExactCount = true;
            break;
          }
        }
        if (invalidExactCount) break;
        if (sampleCount === void 0 || excludedCount === void 0 || trimmedCount === void 0) {
          continue;
        }
        if (trimmedCount % 2 !== 0) {
          errors.push(
            makeError({
              code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
              stage: "science",
              instancePath: pointer("data", "aggregates", "trimmedCounts", index),
              validatorId: "response_curve.estimator_declared",
              message: "a symmetric two-tail trimmed count must be even."
            })
          );
          break;
        }
        if (rawSampleCount === null && trimmedCount !== 0) {
          errors.push(
            makeError({
              code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
              stage: "science",
              instancePath: pointer("data", "aggregates", "trimmedCounts", index),
              validatorId: "response_curve.estimator_declared",
              message: "a condition with no aggregate estimate cannot claim trimmed defined observations."
            })
          );
          break;
        }
        const pretrimDefined = sampleCount + trimmedCount;
        const attempted = pretrimDefined + excludedCount;
        if (!Number.isSafeInteger(pretrimDefined) || !Number.isSafeInteger(attempted)) {
          errors.push(
            makeError({
              code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
              stage: "science",
              instancePath: pointer("data", "aggregates"),
              validatorId: "response_curve.estimator_declared",
              message: `condition index ${index} has a pre-trim defined or attempted count outside the exact safe-integer range.`
            })
          );
          break;
        }
        if (asString(asRecord(parameters.uncertainty)?.reason) === "single_trial" && attempted > 1) {
          errors.push(
            makeError({
              code: "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA",
              stage: "science",
              instancePath: pointer("parameters", "uncertainty", "reason"),
              validatorId: "response_curve.estimator_declared",
              message: `uncertainty reason single_trial contradicts aggregate condition index ${index}, which declares ${attempted} attempted repeats.`
            })
          );
          break;
        }
        if (estimator === "trimmed_mean" && trimFraction !== void 0) {
          const expectedTrimmed = 2 * floorExactBinary64TimesSafeInteger(
            trimFraction,
            pretrimDefined
          );
          if (trimmedCount !== expectedTrimmed) {
            errors.push(
              makeError({
                code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                stage: "science",
                instancePath: pointer("data", "aggregates", "trimmedCounts", index),
                validatorId: "response_curve.estimator_declared",
                message: `trimmed count ${trimmedCount} does not equal 2 * floor_exact((${sampleCount} + ${trimmedCount}) * ${trimFraction}) = ${expectedTrimmed}.`
              })
            );
            break;
          }
        }
        if (responseMethod === "event_count" && values[index] !== null) {
          const estimate = asNumber(values[index]);
          const denominator = estimator === "median" ? sampleCount % 2 === 0 ? 2 : 1 : sampleCount;
          if (estimate !== void 0 && !isRoundedMeanOfSafeNonnegativeIntegers(estimate, denominator)) {
            errors.push(
              makeError({
                code: "SCIENCE_COUNT_ESTIMATOR_INCOHERENT",
                stage: "science",
                instancePath: pointer("data", "aggregates", "response", "values", index),
                validatorId: "response_curve.estimator_declared",
                message: `event-count estimate ${estimate} cannot be the correctly rounded ${estimator ?? "declared estimator"} of ${sampleCount} retained exact non-negative safe-integer counts.`
              })
            );
            break;
          }
        }
        retainedTotal += BigInt(sampleCount);
        trimmedTotal += BigInt(trimmedCount);
        excludedTotal += BigInt(excludedCount);
        if (retainedTotal > maximum || trimmedTotal > maximum || excludedTotal > maximum || retainedTotal + trimmedTotal + excludedTotal > maximum) {
          errors.push(
            makeError({
              code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
              stage: "science",
              instancePath: pointer("data", "aggregates"),
              validatorId: "response_curve.estimator_declared",
              message: "response-curve retained, trimmed, excluded, or attempted totals exceed the exact safe-integer range."
            })
          );
          break;
        }
      }
    }
  }
  if (mode === "repeats" && values) {
    const audit = asRecord(response?.audit);
    if (responseMethod === "peak_firing_rate" && peakBasisVerification?.ok === true && peakBasisVerification.kind === "binned_count" && rateAuthority?.ok === true) {
      const peakBinCounts = asArray(audit?.peakBinCounts);
      const basis = asRecord(response?.basis);
      const binWidth = asRecord(basis?.binWidth);
      const binWidthValue = asNumber(binWidth?.value);
      const binWidthUnit = asString(binWidth?.unit);
      const rateUnit = asString(response?.unit);
      if (!peakBinCounts) {
        errors.push(
          makeError({
            code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            stage: "science",
            instancePath: pointer(
              "data",
              "observations",
              "response",
              "audit",
              "peakBinCounts"
            ),
            validatorId: "response_curve.estimator_declared",
            message: "raw binned-count peaks require exact parallel peakBinCounts so repeat rates and condition estimators can be re-derived without mode-dependent rounding."
          })
        );
      } else if (peakBinCounts.length !== values.length) {
        errors.push(
          makeError({
            code: "SEMANTIC_LENGTH_MISMATCH",
            stage: "semantic",
            instancePath: pointer(
              "data",
              "observations",
              "response",
              "audit",
              "peakBinCounts"
            ),
            validatorId: "response_curve.estimator_declared",
            message: "response.audit.peakBinCounts must be parallel to raw binned-peak response values."
          })
        );
      } else if (binWidthValue !== void 0 && binWidthUnit !== void 0 && rateUnit !== void 0) {
        for (let index = 0; index < peakBinCounts.length; index++) {
          const count = peakBinCounts[index];
          const rate = values[index];
          if (count === null !== (rate === null)) {
            errors.push(
              makeError({
                code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                stage: "science",
                instancePath: pointer(
                  "data",
                  "observations",
                  "response",
                  "audit",
                  "peakBinCounts",
                  index
                ),
                validatorId: "response_curve.estimator_declared",
                message: "a peak-bin count must be null exactly where its raw binned-peak rate is null."
              })
            );
            break;
          }
          const numericCount = count === null ? void 0 : asNumber(count);
          if (numericCount !== void 0 && (!Number.isSafeInteger(numericCount) || numericCount < 0)) {
            errors.push(
              makeError({
                code: "SCIENCE_COUNT_NOT_INTEGER",
                stage: "science",
                instancePath: pointer(
                  "data",
                  "observations",
                  "response",
                  "audit",
                  "peakBinCounts",
                  index
                ),
                validatorId: "response_curve.estimator_declared",
                message: `peak-bin count ${numericCount} is not an exact non-negative safe integer.`
              })
            );
            break;
          }
          const numericRate = rate === null ? void 0 : asNumber(rate);
          if (numericCount !== void 0 && numericRate !== void 0) {
            let expectedRate;
            try {
              expectedRate = deriveExactAggregateCountRateInUnit(
                BigInt(numericCount),
                rateAuthority.integerDivisor,
                1,
                binWidthValue,
                binWidthUnit,
                rateUnit
              );
            } catch (error) {
              errors.push(
                makeError({
                  code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                  stage: "science",
                  instancePath: pointer(
                    "data",
                    "observations",
                    "response",
                    "values",
                    index
                  ),
                  validatorId: "response_curve.estimator_declared",
                  message: `raw binned-peak rate could not be re-derived from its exact max-bin count, divisor, typed bin width, and response unit (${error instanceof Error ? error.message : "numeric failure"}).`
                })
              );
              break;
            }
            if ((numericRate === 0 ? 0 : numericRate) !== expectedRate) {
              errors.push(
                makeError({
                  code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                  stage: "science",
                  instancePath: pointer(
                    "data",
                    "observations",
                    "response",
                    "values",
                    index
                  ),
                  validatorId: "response_curve.estimator_declared",
                  message: `raw binned-peak rate ${numericRate} ${rateUnit} does not equal the one-round exact rate ${expectedRate} ${rateUnit} derived from peak-bin count ${numericCount}, divisor ${rateAuthority.integerDivisor}, and bin width ${binWidthValue} ${binWidthUnit}.`
                })
              );
              break;
            }
          }
        }
      }
    }
    if (audit) {
      const eventCounts = asArray(audit.eventCounts);
      const measurementWindow = asRecord(data.measurementWindow);
      const windowStart = asNumber(measurementWindow?.start);
      const windowStop = asNumber(measurementWindow?.stop);
      const windowUnit = asString(measurementWindow?.unit);
      const responseUnit = asString(response?.unit);
      if (eventCounts) {
        if (eventCounts.length !== values.length) {
          errors.push(
            makeError({
              code: "SEMANTIC_LENGTH_MISMATCH",
              stage: "semantic",
              instancePath: pointer("data", "observations", "response", "audit", "eventCounts"),
              validatorId: "response_curve.estimator_declared",
              message: "response.audit.eventCounts must be parallel to response.values."
            })
          );
        } else {
          for (let index = 0; index < eventCounts.length; index++) {
            const count = eventCounts[index];
            const numericCount = count === null ? void 0 : asNumber(count);
            if (count !== null) {
              if (numericCount !== void 0 && (!Number.isSafeInteger(numericCount) || numericCount < 0)) {
                errors.push(
                  makeError({
                    code: "SCIENCE_COUNT_NOT_INTEGER",
                    stage: "science",
                    instancePath: pointer("data", "observations", "response", "audit", "eventCounts", index),
                    validatorId: "response_curve.estimator_declared",
                    message: `audited event count ${numericCount} is not an exact non-negative safe integer.`
                  })
                );
                break;
              }
            }
            if (count === null !== (values[index] === null)) {
              errors.push(
                makeError({
                  code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                  stage: "science",
                  instancePath: pointer("data", "observations", "response", "audit", "eventCounts", index),
                  validatorId: "response_curve.estimator_declared",
                  message: `audited event count and response value must be present or missing together at repeat index ${index}.`
                })
              );
              break;
            }
            const rate = values[index] === null ? void 0 : asNumber(values[index]);
            if (numericCount !== void 0 && Number.isSafeInteger(numericCount) && numericCount >= 0 && rate !== void 0 && rateAuthority?.ok === true && windowStart !== void 0 && windowStop !== void 0 && windowUnit !== void 0 && responseUnit !== void 0 && dimensionOf(windowUnit) === "time" && dimensionOf(responseUnit) === "frequency") {
              let expectedRate;
              try {
                expectedRate = deriveExactCountRateInUnit(
                  numericCount,
                  rateAuthority.integerDivisor,
                  windowStart,
                  windowStop,
                  windowUnit,
                  responseUnit
                );
              } catch (error) {
                const detail = error instanceof Error ? error.message : "numeric conversion failed";
                errors.push(
                  makeError({
                    code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                    stage: "science",
                    instancePath: pointer("data", "observations", "response", "values", index),
                    validatorId: "response_curve.estimator_declared",
                    message: `mean-rate audit could not be re-derived from its exact count, ${rateAuthority.normalization} divisor, typed measurement window, and response unit (${detail}).`
                  })
                );
                break;
              }
              if ((rate === 0 ? 0 : rate) !== expectedRate) {
                errors.push(
                  makeError({
                    code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                    stage: "science",
                    instancePath: pointer("data", "observations", "response", "values", index),
                    validatorId: "response_curve.estimator_declared",
                    message: `supplied mean rate ${rate} ${responseUnit} does not equal the one-round exact ${rateAuthority.normalization} derived from audited count ${numericCount}, integer divisor ${rateAuthority.integerDivisor}, and exact window [${windowStart}, ${windowStop}] ${windowUnit}; the derived value is ${expectedRate} ${responseUnit}.`
                  })
                );
                break;
              }
            }
          }
        }
      }
    }
  }
  if (mode === "repeats") {
    const conditionIds = asArray(asRecord(data.conditions)?.ids);
    const observationConditionIds = asArray(carrier?.conditionIds);
    const repeatIds = asArray(carrier?.repeatIds);
    const attemptedCounts = asArray(carrier?.attemptedCounts);
    if (conditionIds && conditionIds.length > 0 && observationConditionIds && repeatIds && observationConditionIds.length === repeatIds.length) {
      const declared = conditionIds.filter((value) => typeof value === "string");
      const declaredSet = new Set(declared);
      const repeatSets = new Map(declared.map((conditionId) => [conditionId, /* @__PURE__ */ new Set()]));
      const submittedCounts = new Map(declared.map((conditionId) => [conditionId, 0]));
      const definedValues = new Map(declared.map((conditionId) => [conditionId, []]));
      const rawBinnedPeakCounts = responseMethod === "peak_firing_rate" && peakBasisVerification?.ok === true && peakBasisVerification.kind === "binned_count" ? asArray(asRecord(response?.audit)?.peakBinCounts) : void 0;
      const definedPeakCountRows = new Map(declared.map((conditionId) => [
        conditionId,
        []
      ]));
      for (let index = 0; index < observationConditionIds.length; index++) {
        const conditionId = asString(observationConditionIds[index]);
        const repeatId = asString(repeatIds[index]);
        if (conditionId !== void 0 && repeatId !== void 0) {
          if (!declaredSet.has(conditionId)) {
            errors.push(
              makeError({
                code: "SEMANTIC_UNKNOWN_REFERENCE",
                stage: "semantic",
                instancePath: pointer("data", "observations", "conditionIds", index),
                validatorId: "response_curve.estimator_declared",
                message: `observation condition ${JSON.stringify(conditionId)} is absent from the declared condition universe. Cortexel never extends that universe implicitly.`
              })
            );
            continue;
          }
          submittedCounts.set(conditionId, submittedCounts.get(conditionId) + 1);
          const responseValue = values?.[index];
          if (responseValue !== null) {
            const numericValue = asNumber(responseValue);
            if (numericValue !== void 0) definedValues.get(conditionId).push(numericValue);
            const peakBinCount = rawBinnedPeakCounts?.[index];
            const numericPeakBinCount = peakBinCount === null ? void 0 : asNumber(peakBinCount);
            if (numericPeakBinCount !== void 0 && Number.isSafeInteger(numericPeakBinCount) && numericPeakBinCount >= 0) {
              definedPeakCountRows.get(conditionId).push({
                count: numericPeakBinCount,
                repeatId,
                sourceOrdinal: index
              });
            }
          }
          const seen = repeatSets.get(conditionId);
          if (seen.has(repeatId)) {
            errors.push(
              makeError({
                code: "SEMANTIC_DUPLICATE_ID",
                stage: "semantic",
                instancePath: pointer("data", "observations", "repeatIds", index),
                validatorId: "response_curve.estimator_declared",
                message: `repeat ${JSON.stringify(repeatId)} appears more than once in condition ${JSON.stringify(conditionId)}. A duplicate composite identity would double-weight one measurement.`
              })
            );
            continue;
          }
          seen.add(repeatId);
        }
      }
      if (!attemptedCounts || attemptedCounts.length !== declared.length) {
        errors.push(
          makeError({
            code: "SEMANTIC_LENGTH_MISMATCH",
            stage: "semantic",
            instancePath: pointer("data", "observations", "attemptedCounts"),
            validatorId: "response_curve.estimator_declared",
            message: "attemptedCounts must be parallel to the declared condition universe."
          })
        );
      } else {
        for (let ordinal = 0; ordinal < declared.length; ordinal++) {
          const declaredCount = asNumber(attemptedCounts[ordinal]);
          if (declaredCount === void 0 || !Number.isSafeInteger(declaredCount) || declaredCount < 0) {
            errors.push(
              makeError({
                code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
                stage: "science",
                instancePath: pointer("data", "observations", "attemptedCounts", ordinal),
                validatorId: "response_curve.estimator_declared",
                message: `attempted count must be an exact non-negative safe integer; got ${declaredCount}.`
              })
            );
            break;
          }
          const submitted = submittedCounts.get(declared[ordinal]) ?? 0;
          if (declaredCount !== submitted) {
            errors.push(
              makeError({
                code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                stage: "science",
                instancePath: pointer("data", "observations", "attemptedCounts", ordinal),
                validatorId: "response_curve.estimator_declared",
                message: `condition ${JSON.stringify(declared[ordinal])} declares ${declaredCount} attempted repeats but supplies ${submitted} rows.`
              })
            );
            break;
          }
        }
      }
      const estimator = asString(parameters.estimator);
      const trimFraction = asNumber(parameters.trimFraction);
      for (const conditionId of declared) {
        const conditionValues = definedValues.get(conditionId);
        if (conditionValues.length === 0) continue;
        try {
          const peakCountRows = definedPeakCountRows.get(conditionId);
          if (rawBinnedPeakCounts && peakCountRows.length === conditionValues.length && rateAuthority?.ok === true) {
            const ordered = [...peakCountRows].sort(
              (left, right) => left.count - right.count || (left.repeatId < right.repeatId ? -1 : left.repeatId > right.repeatId ? 1 : 0) || left.sourceOrdinal - right.sourceOrdinal
            );
            let selected = ordered;
            if (estimator === "median") {
              const middle = Math.floor(ordered.length / 2);
              selected = ordered.length % 2 === 1 ? [ordered[middle]] : [ordered[middle - 1], ordered[middle]];
            } else if (estimator === "trimmed_mean" && trimFraction !== void 0) {
              const perTail = floorExactBinary64TimesSafeInteger(
                trimFraction,
                ordered.length
              );
              selected = ordered.slice(perTail, ordered.length - perTail);
            }
            const basis = asRecord(response?.basis);
            const binWidth = asRecord(basis?.binWidth);
            const binWidthValue = asNumber(binWidth?.value);
            const binWidthUnit = asString(binWidth?.unit);
            const rateUnit = asString(response?.unit);
            if (selected.length > 0 && binWidthValue !== void 0 && binWidthUnit !== void 0 && rateUnit !== void 0) {
              const countTotal = selected.reduce(
                (total, row) => total + BigInt(row.count),
                0n
              );
              deriveExactAggregateCountRateInUnit(
                countTotal,
                rateAuthority.integerDivisor,
                selected.length,
                binWidthValue,
                binWidthUnit,
                rateUnit
              );
            }
          } else if (estimator === "mean") {
            exactBinary64Mean(conditionValues);
          } else {
            const ordered = [...conditionValues].sort((left, right) => left - right);
            if (estimator === "median" && ordered.length % 2 === 0) {
              const middle = ordered.length / 2;
              exactBinary64Mean([ordered[middle - 1], ordered[middle]]);
            } else if (estimator === "trimmed_mean" && trimFraction !== void 0) {
              const perTail = floorExactBinary64TimesSafeInteger(
                trimFraction,
                ordered.length
              );
              exactBinary64Mean(ordered.slice(perTail, ordered.length - perTail));
            }
          }
        } catch (error) {
          errors.push(
            makeError({
              code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
              stage: "science",
              instancePath: pointer("data", "observations", "response", "values"),
              validatorId: "response_curve.estimator_declared",
              message: `condition ${JSON.stringify(conditionId)} cannot be estimated without collapsing a non-zero exact result (${error instanceof Error ? error.message : "numeric failure"}).`
            })
          );
          break;
        }
      }
      if (asString(parameters.repeatDesign) === "paired") {
        const reference = repeatSets.get(declared[0]) ?? /* @__PURE__ */ new Set();
        for (let ordinal = 1; ordinal < declared.length; ordinal++) {
          const conditionId = declared[ordinal];
          const candidate = repeatSets.get(conditionId) ?? /* @__PURE__ */ new Set();
          const differs = reference.size !== candidate.size || [...reference].some((repeatId) => !candidate.has(repeatId));
          if (differs) {
            errors.push(
              makeError({
                code: "SCIENCE_PAIRED_REPEATS_INCOMPLETE",
                stage: "science",
                instancePath: pointer("data", "observations", "repeatIds"),
                validatorId: "response_curve.estimator_declared",
                message: `repeatDesign is "paired", but condition ${JSON.stringify(conditionId)} does not carry the same repeat-id set as ${JSON.stringify(declared[0])}. Every paired replicate must have a row at every condition, including a null response when its measurement is undefined.`
              })
            );
            break;
          }
        }
      }
      if (asString(asRecord(parameters.uncertainty)?.reason) === "single_trial") {
        const contradictingCondition = declared.find(
          (conditionId) => (submittedCounts.get(conditionId) ?? 0) > 1
        );
        if (contradictingCondition !== void 0) {
          errors.push(
            makeError({
              code: "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA",
              stage: "science",
              instancePath: pointer("parameters", "uncertainty", "reason"),
              validatorId: "response_curve.estimator_declared",
              message: `uncertainty reason single_trial contradicts condition ${JSON.stringify(contradictingCondition)}, which contains ${submittedCounts.get(contradictingCondition)} attempted repeats.`
            })
          );
        }
      }
    }
  }
  if (responseMethod === "peak_firing_rate" && peakBasisVerification?.ok === true && peakBasisVerification.kind === "binned_count" && rateAuthority?.ok === true && values && mode === "aggregates" && values.every(
    (value) => value === null || typeof value === "number" && Number.isFinite(value) && value >= 0
  )) {
    const lattice = verifyBinnedPeakValueLattice(
      values,
      response?.basis,
      response?.unit,
      rateAuthority.integerDivisor,
      mode,
      parameters.estimator,
      mode === "aggregates" ? carrier?.sampleCounts : void 0
    );
    if (!lattice.ok) {
      const responseBase = pointer(
        "data",
        mode === "aggregates" ? "aggregates" : "observations",
        "response"
      );
      const instancePath = lattice.path.startsWith("/values/") ? `${responseBase}${lattice.path}` : lattice.path.startsWith("/sampleCounts") ? `${pointer("data", "aggregates")}${lattice.path}` : lattice.path === "/estimator" ? pointer("parameters", "estimator") : `${responseBase}${lattice.path}`;
      errors.push(
        makeError({
          code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          stage: "science",
          instancePath,
          validatorId: "response_curve.estimator_declared",
          message: lattice.message
        })
      );
    }
  }
  return errors;
};
var phasePlaneDerivativeDimension = (context) => {
  const field = asRecord(getData(context).vectorField);
  if (!field) return [];
  const errors = [];
  for (const axis of ["dx", "dy"]) {
    const unit = asString(asRecord(field[axis])?.unit);
    const kind = asString(asRecord(field[axis])?.kind);
    if (unit === void 0 || kind === void 0) continue;
    if (kind !== "derivative") {
      errors.push(
        makeError({
          code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
          stage: "science",
          instancePath: pointer("data", "vectorField", axis, "kind"),
          validatorId: "phase_plane.derivative_dimension",
          message: `a vector-field component is a rate of change over time and must have kind "derivative"; got "${kind}".`
        })
      );
    }
  }
  return errors;
};

// src/core/semantics/weight-trace.ts
var VALIDATOR_ID = "weight_trace.observation_kind_declared";
var EFFECT_RELATIVE_EPSILON_MULTIPLES = 8;
var BoundedWeightTraceErrors = class extends Array {
  push(...items) {
    const remaining = Math.max(0, MAX_ERROR_RECORDS - this.length);
    if (remaining > 0) super.push(...items.slice(0, remaining));
    return this.length;
  }
};
function issue(code, stage, path, message) {
  return makeError({
    code,
    stage,
    instancePath: pointer(...path),
    validatorId: VALIDATOR_ID,
    message
  });
}
function records(value) {
  return (asArray(value) ?? []).flatMap((candidate) => {
    const record = asRecord(candidate);
    return record === void 0 ? [] : [record];
  });
}
function finiteNumbers(value) {
  return (asArray(value) ?? []).flatMap((candidate) => {
    const number = asNumber(candidate);
    return number === void 0 ? [] : [number];
  });
}
function quantityArrayWitnesses(values, unit, path) {
  if (unit === void 0) return [];
  return (asArray(values) ?? []).flatMap((candidate, index) => {
    const value = asNumber(candidate);
    return value === void 0 ? [] : [{ value, unit, path: [...path, index] }];
  });
}
function quantityScalarWitness(quantity, path) {
  const value = asNumber(quantity?.value);
  const unit = asString(quantity?.unit);
  return value === void 0 || unit === void 0 ? [] : [{ value, unit, path: [...path, "value"] }];
}
function convertScalar(value, unit, targetUnit, path, errors) {
  const sourceDimension = dimensionOf(unit);
  const targetDimension = dimensionOf(targetUnit);
  if (sourceDimension === void 0 || targetDimension === void 0) return void 0;
  if (unit === targetUnit) return value;
  if (sourceDimension !== targetDimension || sourceDimension === "simulator_defined") {
    return void 0;
  }
  try {
    return convertExactUnitSum([{ value, unit }], targetUnit);
  } catch {
    errors.push(
      issue(
        "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
        "science",
        path,
        `the declared ${unit} value cannot be converted once into ${targetUnit} as a finite nonzero binary64 value. Choose a better-scaled registered unit.`
      )
    );
    return void 0;
  }
}
function convertTimes(quantity, targetUnit, path, errors) {
  const unit = asString(quantity.unit);
  if (unit === void 0) return void 0;
  const values = finiteNumbers(quantity.values);
  const converted = [];
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    const result = convertScalar(value, unit, targetUnit, [...path, index], errors);
    if (result === void 0) return void 0;
    converted.push(result);
  }
  return converted;
}
function comparePhysicalTimes(left, right) {
  return compareExactUnitSumToValue(
    [{ value: left.value, unit: left.unit }],
    { value: right.value, unit: right.unit }
  );
}
function compareDeclaredQuantities(left, leftUnit, right, rightUnit) {
  if (leftUnit === rightUnit) return left < right ? -1 : left > right ? 1 : 0;
  const dimension = dimensionOf(leftUnit);
  if (dimension === void 0 || dimension === "simulator_defined" || dimensionOf(rightUnit) !== dimension) return void 0;
  try {
    return compareExactUnitSumToValue(
      [{ value: left, unit: leftUnit }],
      { value: right, unit: rightUnit }
    );
  } catch {
    return void 0;
  }
}
function validateDecisionTimeEmbedding(witnesses, targetUnit, errors) {
  const converted = [];
  for (const witness of witnesses) {
    const value = convertScalar(witness.value, witness.unit, targetUnit, witness.path, errors);
    if (value === void 0) return;
    converted.push({ witness, value });
  }
  converted.sort((left, right) => left.value < right.value ? -1 : left.value > right.value ? 1 : 0);
  for (let start = 0; start < converted.length; ) {
    let stop = start + 1;
    while (stop < converted.length && converted[stop].value === converted[start].value) stop++;
    const reference = converted[start].witness;
    for (let index = start + 1; index < stop; index++) {
      const candidate = converted[index].witness;
      let comparison;
      try {
        comparison = comparePhysicalTimes(reference, candidate);
      } catch {
        errors.push(
          issue(
            "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
            "science",
            candidate.path,
            `Cortexel could not compare this decision-critical time exactly with ${pointer(...reference.path)} after registered-unit conversion. Membership, recording, or window inclusion must not proceed without an exact ordering witness.`
          )
        );
        return;
      }
      if (comparison !== 0) {
        errors.push(
          issue(
            "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
            "science",
            candidate.path,
            `this decision-critical time is physically distinct from ${pointer(...reference.path)}, but both round to ${converted[start].value} ${targetUnit}. Membership, recording, or window inclusion would become representation-dependent; choose a better-scaled registered time unit.`
          )
        );
        return;
      }
    }
    start = stop;
  }
}
function validateTimeVectorFidelity(quantity, targetUnit, path, errors) {
  const sourceUnit = asString(quantity.unit);
  if (sourceUnit === void 0 || sourceUnit === targetUnit) return;
  const source = finiteNumbers(quantity.values);
  const pairs = [];
  for (let index = 0; index < source.length; index++) {
    const converted = convertScalar(source[index], sourceUnit, targetUnit, [...path, index], errors);
    if (converted === void 0) return;
    pairs.push({ source: source[index], converted, index });
  }
  pairs.sort((left, right) => left.source - right.source || left.converted - right.converted);
  for (let index = 1; index < pairs.length; index++) {
    const previous = pairs[index - 1];
    const current = pairs[index];
    if (!(current.source > previous.source)) continue;
    let expected;
    try {
      expected = convertDifference(previous.source, current.source, sourceUnit, targetUnit);
    } catch {
      errors.push(
        issue(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          "science",
          [...path, current.index],
          `the spacing from ${pointer(...path, previous.index)} cannot be represented exactly enough in ${targetUnit}. Choose a better-scaled registered time unit.`
        )
      );
      return;
    }
    const actual = current.converted - previous.converted;
    if (!(current.converted > previous.converted) || !Number.isFinite(actual) || !binary64RelativeDifferenceWithinEpsilons(
      expected,
      actual,
      EFFECT_RELATIVE_EPSILON_MULTIPLES
    )) {
      errors.push(
        issue(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          "science",
          [...path, current.index],
          `the distinct ${sourceUnit} times at ${pointer(...path, previous.index)} and ${pointer(...path, current.index)} are materially distorted after conversion to ${targetUnit}. Choose a better-scaled registered time unit.`
        )
      );
      return;
    }
  }
}
function legalSynapticWeightUnit(unit) {
  if (unit === void 0 || !isKnownUnit(unit)) return void 0;
  const dimension = dimensionOf(unit);
  return dimension !== void 0 && kindAcceptsDimension("synaptic_weight", dimension) ? unit : void 0;
}
function validateQuantityArrayFidelity(quantity, targetUnit, path, carrierLabel, errors) {
  const sourceUnit = asString(quantity?.unit);
  if (quantity === void 0 || sourceUnit === void 0 || targetUnit === void 0) return;
  const sourceDimension = dimensionOf(sourceUnit);
  const targetDimension = dimensionOf(targetUnit);
  if (sourceDimension === void 0 || targetDimension === void 0) return;
  const sourceKind = asString(quantity.kind);
  if (sourceKind !== void 0 && !kindAcceptsDimension(sourceKind, sourceDimension)) return;
  if (sourceUnit !== targetUnit && (sourceDimension !== targetDimension || sourceDimension === "simulator_defined")) {
    errors.push(
      issue(
        "SCIENCE_UNIT_DIMENSION_MISMATCH",
        "science",
        [...path.slice(0, -1), "unit"],
        `${carrierLabel} in ${sourceUnit} cannot be placed on the ${targetUnit} weight axis. Simulator-defined units are convertible only by exact code identity.`
      )
    );
    return;
  }
  const pairs = [];
  const values = asArray(quantity.values) ?? [];
  for (let index = 0; index < values.length; index++) {
    const source = asNumber(values[index]);
    if (source === void 0) continue;
    const converted = convertScalar(source, sourceUnit, targetUnit, [...path, index], errors);
    if (converted === void 0) return;
    pairs.push({ source, converted, index });
  }
  if (sourceUnit === targetUnit) return;
  pairs.sort((left, right) => left.source < right.source ? -1 : left.source > right.source ? 1 : 0);
  for (let index = 1; index < pairs.length; index++) {
    const previous = pairs[index - 1];
    const current = pairs[index];
    if (!(current.source > previous.source)) continue;
    let expected;
    try {
      expected = convertDifference(previous.source, current.source, sourceUnit, targetUnit);
    } catch {
      errors.push(
        issue(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          "science",
          [...path, current.index],
          `the ${carrierLabel} spacing from ${pointer(...path, previous.index)} cannot be represented in ${targetUnit}. Choose a better-scaled registered weight unit.`
        )
      );
      return;
    }
    const actual = current.converted - previous.converted;
    if (!(current.converted > previous.converted) || !Number.isFinite(actual) || !binary64RelativeDifferenceWithinEpsilons(
      expected,
      actual,
      EFFECT_RELATIVE_EPSILON_MULTIPLES
    )) {
      errors.push(
        issue(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          "science",
          [...path, current.index],
          `distinct ${sourceUnit} ${carrierLabel} values at ${pointer(...path, previous.index)} and ${pointer(...path, current.index)} collapse or are materially distorted on the ${targetUnit} display axis. Choose a better-scaled registered weight unit.`
        )
      );
      return;
    }
  }
}
function validateWeightScalarQuantity(quantity, targetUnit, path, carrierLabel, errors) {
  const value = asNumber(quantity?.value);
  const sourceUnit = asString(quantity?.unit);
  if (value === void 0 || sourceUnit === void 0 || targetUnit === void 0) return void 0;
  const sourceDimension = dimensionOf(sourceUnit);
  const targetDimension = dimensionOf(targetUnit);
  if (sourceDimension === void 0 || targetDimension === void 0) return void 0;
  const sourceKind = asString(quantity?.kind);
  if (sourceKind !== void 0 && !kindAcceptsDimension(sourceKind, sourceDimension)) {
    return void 0;
  }
  if (sourceUnit !== targetUnit && (sourceDimension !== targetDimension || sourceDimension === "simulator_defined")) {
    errors.push(
      issue(
        "SCIENCE_UNIT_DIMENSION_MISMATCH",
        "science",
        [...path, "unit"],
        `${carrierLabel} in ${sourceUnit} cannot be placed on the ${targetUnit} weight axis. Simulator-defined units are convertible only by exact code identity.`
      )
    );
    return void 0;
  }
  return convertScalar(value, sourceUnit, targetUnit, [...path, "value"], errors);
}
function validateUncertaintyAxisFidelity(uncertainty, targetUnit, path, errors) {
  const kind = asString(uncertainty?.kind);
  if (uncertainty === void 0 || kind === void 0 || kind === "none") return;
  const keys = kind === "standard_deviation" || kind === "standard_error" ? ["values"] : ["lower", "upper"];
  for (const key of keys) {
    validateQuantityArrayFidelity(
      { unit: uncertainty.unit, values: uncertainty[key] },
      targetUnit,
      [...path, key],
      `uncertainty ${key}`,
      errors
    );
  }
}
function validateWeightAxisEmbedding(witnesses, targetUnit, errors) {
  if (targetUnit === void 0 || witnesses.length < 2) return;
  const units = new Set(witnesses.map(({ unit }) => unit));
  if (units.size === 1 && units.has(targetUnit)) return;
  const converted = [];
  for (const witness of witnesses) {
    if (witness.unit !== targetUnit && (dimensionOf(witness.unit) !== dimensionOf(targetUnit) || dimensionOf(witness.unit) === "simulator_defined")) return;
    const value = convertScalar(
      witness.value,
      witness.unit,
      targetUnit,
      witness.path,
      errors
    );
    if (value === void 0) return;
    converted.push({ witness, value });
  }
  converted.sort((left, right) => left.value < right.value ? -1 : left.value > right.value ? 1 : 0);
  for (let index = 1; index < converted.length; index++) {
    const left = converted[index - 1];
    const right = converted[index];
    let exactOrder;
    try {
      exactOrder = compareExactUnitSumToValue(
        [{ value: left.witness.value, unit: left.witness.unit }],
        { value: right.witness.value, unit: right.witness.unit }
      );
    } catch {
      errors.push(
        issue(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          "science",
          right.witness.path,
          `Cortexel could not compare this weight-axis carrier exactly with ${pointer(...left.witness.path)}. The shared display axis must preserve cross-carrier ordering.`
        )
      );
      return;
    }
    if (exactOrder === 0) {
      if (right.value !== left.value) {
        errors.push(
          issue(
            "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
            "science",
            right.witness.path,
            `this carrier is physically equal to ${pointer(...left.witness.path)} but the two convert to different ${targetUnit} values. The shared axis would be representation-dependent.`
          )
        );
        return;
      }
      continue;
    }
    if (exactOrder > 0 || !(right.value > left.value)) {
      errors.push(
        issue(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          "science",
          right.witness.path,
          `this carrier and ${pointer(...left.witness.path)} have a different exact physical order than their ${targetUnit} axis values. Choose a better-scaled registered weight unit.`
        )
      );
      return;
    }
    let expected;
    try {
      expected = convertExactUnitSum([
        { value: right.witness.value, unit: right.witness.unit },
        { value: -left.witness.value, unit: left.witness.unit }
      ], targetUnit);
    } catch {
      errors.push(
        issue(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          "science",
          right.witness.path,
          `the exact physical spacing from ${pointer(...left.witness.path)} cannot be represented as a finite nonzero ${targetUnit} difference. Choose a better-scaled registered weight unit.`
        )
      );
      return;
    }
    const actual = right.value - left.value;
    if (!(expected > 0) || !Number.isFinite(actual) || !binary64RelativeDifferenceWithinEpsilons(
      expected,
      actual,
      EFFECT_RELATIVE_EPSILON_MULTIPLES
    )) {
      errors.push(
        issue(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          "science",
          right.witness.path,
          `the cross-carrier spacing from ${pointer(...left.witness.path)} is materially distorted on the ${targetUnit} axis. Choose a better-scaled registered weight unit.`
        )
      );
      return;
    }
  }
}
function convertOrderedInterval(start, stop, sourceUnit, targetUnit, path, errors) {
  const convertedStart = convertScalar(start, sourceUnit, targetUnit, [...path, "start"], errors);
  const convertedStop = convertScalar(stop, sourceUnit, targetUnit, [...path, "stop"], errors);
  if (convertedStart === void 0 || convertedStop === void 0) return void 0;
  let expectedWidth;
  try {
    expectedWidth = convertDifference(start, stop, sourceUnit, targetUnit);
  } catch {
    errors.push(
      issue(
        "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
        "science",
        path,
        `the positive ${sourceUnit} interval cannot be represented as one finite binary64 interval in ${targetUnit}. Choose a better-scaled registered time unit.`
      )
    );
    return void 0;
  }
  const actualWidth = convertedStop - convertedStart;
  if (!(expectedWidth > 0) || !(convertedStop > convertedStart) || !Number.isFinite(actualWidth) || !binary64RelativeDifferenceWithinEpsilons(
    expectedWidth,
    actualWidth,
    EFFECT_RELATIVE_EPSILON_MULTIPLES
  )) {
    errors.push(
      issue(
        "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
        "science",
        path,
        `the positive ${sourceUnit} interval collapses or is materially distorted after conversion to ${targetUnit}. Choose a better-scaled registered time unit.`
      )
    );
    return void 0;
  }
  return { start: convertedStart, stop: convertedStop };
}
function validateComparability(models, parameters, errors) {
  const comparability = asRecord(parameters.weightComparability) ?? {};
  const mode = asString(comparability.mode);
  const distinctModels = new Set(models);
  const declaredModels = (asArray(comparability.comparableModels) ?? []).flatMap((candidate) => typeof candidate === "string" ? [candidate] : []);
  const declaredSet = /* @__PURE__ */ new Set();
  for (let index = 0; index < declaredModels.length; index++) {
    if (declaredSet.has(declaredModels[index])) {
      errors.push(
        issue(
          "SEMANTIC_DUPLICATE_ID",
          "semantic",
          ["parameters", "weightComparability", "comparableModels", index],
          "comparableModels is an exact set claim and may name each synapse model only once."
        )
      );
    }
    declaredSet.add(declaredModels[index]);
  }
  const matches = models.length > 0 && (mode === "single_synapse_model" && distinctModels.size === 1 || mode === "declared_comparable_models" && declaredModels.length === declaredSet.size && declaredSet.size === distinctModels.size && [...distinctModels].every((model) => declaredSet.has(model)));
  if (!matches) {
    errors.push(
      issue(
        "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
        "science",
        ["parameters", "weightComparability"],
        "the comparability declaration must exactly match the distinct synapse models whose weights share this axis. Unit compatibility alone cannot establish model-level comparability."
      )
    );
  }
}
function validateNestedUncertainty(uncertainty, centralValues, path, errors) {
  if (uncertainty === void 0) return;
  errors.push(...validateUncertaintyNode(uncertainty, path, VALIDATOR_ID));
  const kind = asString(uncertainty.kind);
  if (kind === void 0 || kind === "none") return;
  if (kind === "credible_interval") {
    errors.push(
      issue(
        "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
        "science",
        [...path, "kind"],
        "credible intervals are refused because this contract has no independently verified posterior-attestation input."
      )
    );
  }
  const keys = kind === "standard_deviation" || kind === "standard_error" ? ["values", "sampleCount"] : ["lower", "upper", "sampleCount"];
  for (const key of keys) {
    const values = asArray(uncertainty[key]);
    if (values !== void 0 && values.length !== centralValues.length) {
      errors.push(
        issue(
          "SEMANTIC_LENGTH_MISMATCH",
          "semantic",
          [...path, key],
          `uncertainty.${key} has ${values.length} entries for ${centralValues.length} central observations.`
        )
      );
    }
  }
  for (let index = 0; index < centralValues.length; index++) {
    if (centralValues[index] !== null) continue;
    for (const key of keys) {
      const values = asArray(uncertainty[key]);
      if (values !== void 0 && index < values.length && values[index] !== null) {
        errors.push(
          issue(
            "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
            "science",
            [...path, key, index],
            `uncertainty.${key} cannot qualify a missing central observation; it must be null at the same index.`
          )
        );
        break;
      }
    }
  }
}
function validatePreaggregatedAggregateUncertainty(aggregate, uncertainty, errors) {
  const kind = asString(uncertainty?.kind);
  if (kind !== "ensemble_range" && kind !== "quantile_interval") return;
  const central = asArray(asRecord(aggregate.values)?.values) ?? [];
  const centralUnit = asString(asRecord(aggregate.values)?.unit);
  const lower = asArray(uncertainty?.lower) ?? [];
  const upper = asArray(uncertainty?.upper) ?? [];
  const sampleCount = asArray(uncertainty?.sampleCount) ?? [];
  const uncertaintyUnit = asString(uncertainty?.unit);
  const method = asString(aggregate.method);
  const lowerQuantile = asNumber(uncertainty?.lowerQuantile);
  const upperQuantile = asNumber(uncertainty?.upperQuantile);
  if (centralUnit === void 0 || uncertaintyUnit === void 0 || method === void 0) return;
  const reject = (index, key, law) => {
    errors.push(
      issue(
        "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
        "science",
        ["data", "aggregate", "uncertainty", key, index],
        `the caller-declared ${kind} contradicts the caller-declared ${method} aggregate at index ${index}: ${law}. Cortexel cannot re-derive omitted members, but mutually impossible summary claims must fail closed.`
      )
    );
  };
  const length = Math.min(central.length, lower.length, upper.length);
  for (let index = 0; index < length; index++) {
    const value = asNumber(central[index]);
    const lo = asNumber(lower[index]);
    const hi = asNumber(upper[index]);
    if (value === void 0 || lo === void 0 || hi === void 0) continue;
    const toLower = compareDeclaredQuantities(value, centralUnit, lo, uncertaintyUnit);
    const toUpper = compareDeclaredQuantities(value, centralUnit, hi, uncertaintyUnit);
    if (toLower === void 0 || toUpper === void 0) continue;
    if (sampleCount[index] === 1) {
      if (toLower !== 0) {
        reject(index, "lower", "with one contributing member, every aggregate and every empirical interval endpoint must equal that one member");
        return;
      }
      if (toUpper !== 0) {
        reject(index, "upper", "with one contributing member, every aggregate and every empirical interval endpoint must equal that one member");
        return;
      }
      continue;
    }
    if (kind === "ensemble_range") {
      if (method === "min" && toLower !== 0) {
        reject(index, "lower", "an observed ensemble range must begin at the declared minimum");
        return;
      }
      if (method === "max" && toUpper !== 0) {
        reject(index, "upper", "an observed ensemble range must end at the declared maximum");
        return;
      }
      if ((method === "mean" || method === "median") && toLower < 0) {
        reject(index, "lower", `a finite-sample ${method} cannot lie below the observed minimum`);
        return;
      }
      if ((method === "mean" || method === "median") && toUpper > 0) {
        reject(index, "upper", `a finite-sample ${method} cannot lie above the observed maximum`);
        return;
      }
      continue;
    }
    if (method === "min") {
      if (toLower > 0) {
        reject(index, "lower", "an empirical quantile cannot lie below the declared minimum");
        return;
      }
      if (lowerQuantile === 0 && toLower !== 0) {
        reject(index, "lower", "the Type-7 zero quantile must equal the declared minimum");
        return;
      }
    } else if (method === "max") {
      if (toUpper < 0) {
        reject(index, "upper", "an empirical quantile cannot lie above the declared maximum");
        return;
      }
      if (upperQuantile === 1 && toUpper !== 0) {
        reject(index, "upper", "the Type-7 unit quantile must equal the declared maximum");
        return;
      }
    } else if (method === "median" && lowerQuantile !== void 0 && upperQuantile !== void 0) {
      if (lowerQuantile === 0.5 && toLower !== 0) {
        reject(index, "lower", "the Type-7 0.5 quantile must equal the declared Type-7 median");
        return;
      }
      if (upperQuantile === 0.5 && toUpper !== 0) {
        reject(index, "upper", "the Type-7 0.5 quantile must equal the declared Type-7 median");
        return;
      }
      if (lowerQuantile < 0.5 && upperQuantile > 0.5 && toLower < 0) {
        reject(index, "lower", "a quantile interval straddling 0.5 cannot begin above the declared median");
        return;
      }
      if (lowerQuantile < 0.5 && upperQuantile > 0.5 && toUpper > 0) {
        reject(index, "upper", "a quantile interval straddling 0.5 cannot end below the declared median");
        return;
      }
      if (upperQuantile < 0.5 && toUpper < 0) {
        reject(index, "upper", "a quantile below 0.5 cannot exceed the declared median");
        return;
      }
      if (lowerQuantile > 0.5 && toLower > 0) {
        reject(index, "lower", "a quantile above 0.5 cannot be below the declared median");
        return;
      }
    } else if (method === "mean") {
      if (lowerQuantile === 0 && toLower < 0) {
        reject(index, "lower", "the observed minimum cannot exceed the finite-sample mean");
        return;
      }
      if (upperQuantile === 1 && toUpper > 0) {
        reject(index, "upper", "the observed maximum cannot be below the finite-sample mean");
        return;
      }
    }
  }
}
function validateIncreasingWindowTimes(times, window, path, errors) {
  for (let index = 1; index < times.length; index++) {
    if (!(times[index] > times[index - 1])) {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          [...path, index],
          "aggregate evaluation times must be strictly increasing after exact registered-unit conversion. Cortexel does not sort or deduplicate a caller-authored aggregate grid."
        )
      );
    }
  }
  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  const closedStop = asString(window.boundary) === "[start,stop]";
  if (start === void 0 || stop === void 0) return;
  for (let index = 0; index < times.length; index++) {
    const time = times[index];
    if (time < start || time > stop || !closedStop && time === stop) {
      errors.push(
        issue(
          "SCIENCE_EVENT_OUT_OF_WINDOW",
          "science",
          [...path, index],
          "an aggregate evaluation time lies outside the declared analysis window. It must be rejected, not silently filtered from the figure."
        )
      );
    }
  }
}
var weightTraceObservationKindDeclared = (context) => {
  if (context.skillId !== "network.synaptic_weight_trace") return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const mode = asString(data.mode);
  const display = asString(parameters.display);
  const window = asRecord(data.window) ?? {};
  const windowUnit = asString(window.unit);
  const errors = new BoundedWeightTraceErrors();
  if (mode === "preaggregated") {
    if (display !== "aggregate_declared") {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["parameters", "display"],
          "preaggregated input is accepted only with aggregate_declared display. It cannot be relabelled as a Cortexel-derived or individual view."
        )
      );
    }
    const aggregate2 = asRecord(data.aggregate) ?? {};
    const aggregateModel = asString(aggregate2.synapseModel);
    if (aggregateModel !== void 0) {
      validateComparability([aggregateModel], parameters, errors);
    }
    const observation2 = asRecord(aggregate2.observation) ?? {};
    if (observation2.kind === "interpolated_trajectory" && asString(observation2.interpolant) !== "linear") {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["data", "aggregate", "observation", "interpolant"],
          "revision 2 can render and authority-bind only a caller-supplied linear reconstruction. A non-linear interpolant must not be silently drawn as straight segments."
        )
      );
    }
    const intervalMethod = asString(aggregate2.intervalMethod);
    if (intervalMethod === "hold_last_observed" && observation2.kind !== "event_updated" || intervalMethod === "shared_sample_grid" && observation2.kind !== "point_sample") {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["data", "aggregate", "intervalMethod"],
          "the preaggregated interval method contradicts the declared observation kind: holds require event-updated values and a shared grid requires point samples."
        )
      );
    }
    const time = asRecord(aggregate2.time) ?? {};
    const rawTimeValues = asArray(time.values) ?? [];
    const rawAggregateValues = asArray(asRecord(aggregate2.values)?.values) ?? [];
    const rawMemberCounts = asArray(aggregate2.memberCounts) ?? [];
    const rawContributingCounts = asArray(aggregate2.contributingCounts) ?? [];
    const aggregateLengths = [
      rawTimeValues.length,
      rawAggregateValues.length,
      rawMemberCounts.length,
      rawContributingCounts.length
    ];
    if (aggregateLengths[0] === 0) {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["data", "aggregate", "time", "values"],
          "a caller-declared aggregate must contain at least one evaluation carrier. An empty array cannot produce a renderable or auditable aggregate figure."
        )
      );
    }
    if (!rawAggregateValues.some((value) => asNumber(value) !== void 0)) {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["data", "aggregate", "values", "values"],
          "a caller-declared aggregate must contain at least one finite displayed value. Revision 2 has no authority-bound empty-state figure for an all-missing aggregate."
        )
      );
    }
    if (aggregateLengths.some((length2) => length2 !== aggregateLengths[0])) {
      errors.push(
        issue(
          "SEMANTIC_LENGTH_MISMATCH",
          "semantic",
          ["data", "aggregate"],
          "preaggregated time, value, member-count, and contributing-count arrays must have identical lengths."
        )
      );
    }
    const declaredUncertainty = asRecord(aggregate2.uncertainty);
    validateNestedUncertainty(
      declaredUncertainty,
      rawAggregateValues,
      ["data", "aggregate", "uncertainty"],
      errors
    );
    validateUncertaintyAxisFidelity(
      declaredUncertainty,
      asString(asRecord(aggregate2.values)?.unit),
      ["data", "aggregate", "uncertainty"],
      errors
    );
    const aggregateValueUnit = legalSynapticWeightUnit(
      asString(asRecord(aggregate2.values)?.unit)
    );
    const aggregateUncertaintyUnit = asString(declaredUncertainty?.unit);
    validateWeightAxisEmbedding(
      [
        ...quantityArrayWitnesses(
          rawAggregateValues,
          aggregateValueUnit,
          ["data", "aggregate", "values", "values"]
        ),
        ...quantityArrayWitnesses(
          declaredUncertainty?.values,
          aggregateUncertaintyUnit,
          ["data", "aggregate", "uncertainty", "values"]
        ),
        ...quantityArrayWitnesses(
          declaredUncertainty?.lower,
          aggregateUncertaintyUnit,
          ["data", "aggregate", "uncertainty", "lower"]
        ),
        ...quantityArrayWitnesses(
          declaredUncertainty?.upper,
          aggregateUncertaintyUnit,
          ["data", "aggregate", "uncertainty", "upper"]
        )
      ],
      aggregateValueUnit,
      errors
    );
    if (observation2.kind === "interpolated_trajectory" && asString(declaredUncertainty?.kind) !== "none") {
      errors.push(
        issue(
          "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
          "science",
          ["data", "aggregate", "uncertainty", "kind"],
          "revision 2 does not define how uncertainty bounds are reconstructed between caller-supplied trajectory vertices. An interpolated trajectory therefore requires uncertainty:none."
        )
      );
    }
    if (windowUnit !== void 0) {
      const timeErrorCount = errors.length;
      validateTimeVectorFidelity(
        time,
        windowUnit,
        ["data", "aggregate", "time", "values"],
        errors
      );
      if (errors.length === timeErrorCount) {
        const converted = convertTimes(
          time,
          windowUnit,
          ["data", "aggregate", "time", "values"],
          errors
        );
        if (converted !== void 0) {
          validateIncreasingWindowTimes(
            converted,
            window,
            ["data", "aggregate", "time", "values"],
            errors
          );
        }
        const aggregateTimeUnit = asString(time.unit);
        const windowStart2 = asNumber(window.start);
        const windowStop2 = asNumber(window.stop);
        if (aggregateTimeUnit !== void 0 && windowStart2 !== void 0 && windowStop2 !== void 0) {
          validateDecisionTimeEmbedding(
            [
              ...finiteNumbers(time.values).map((value, index) => ({
                value,
                unit: aggregateTimeUnit,
                path: ["data", "aggregate", "time", "values", index]
              })),
              { value: windowStart2, unit: windowUnit, path: ["data", "window", "start"] },
              { value: windowStop2, unit: windowUnit, path: ["data", "window", "stop"] }
            ],
            windowUnit,
            errors
          );
        }
      }
    }
    const values = rawAggregateValues;
    const memberCounts = finiteNumbers(aggregate2.memberCounts);
    const contributingCounts = finiteNumbers(aggregate2.contributingCounts);
    const length = Math.min(values.length, memberCounts.length, contributingCounts.length);
    for (let index = 0; index < length; index++) {
      if (errors.length >= MAX_ERROR_RECORDS) break;
      const memberCount = memberCounts[index];
      const contributingCount = contributingCounts[index];
      if (!Number.isSafeInteger(memberCount) || memberCount < 0) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "aggregate", "memberCounts", index],
            "memberCount must be a non-negative safe integer. A rounded binary64 cardinality is not an auditable synapse count."
          )
        );
      }
      if (!Number.isSafeInteger(contributingCount) || contributingCount < 0) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "aggregate", "contributingCounts", index],
            "contributingCount must be a non-negative safe integer. A rounded binary64 cardinality cannot define an aggregate denominator."
          )
        );
      }
      if (contributingCount > memberCount) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "aggregate", "contributingCounts", index],
            "contributingCount cannot exceed memberCount. A denominator cannot contain synapses outside the declared group at that time."
          )
        );
      }
      const missing = values[index] === null;
      if (missing !== (contributingCount === 0)) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "aggregate", "values", "values", index],
            "for the offered aggregate methods, an aggregate value is null exactly when contributingCount is zero. Zero contributors cannot yield a measured zero, and positive contributors cannot yield an unexplained missing aggregate."
          )
        );
      }
    }
    const uncertaintyKind = asString(declaredUncertainty?.kind);
    if (uncertaintyKind === "standard_error") {
      errors.push(
        issue(
          "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
          "science",
          ["data", "aggregate", "uncertainty", "kind"],
          "standard error is inferential and is unsupported for an exact declared synapse ensemble. The request declares no sampling estimand, sampling design, exchangeability model, or repeat universe from which sampling variability could be derived."
        )
      );
    }
    if (uncertaintyKind === "confidence_interval") {
      errors.push(
        issue(
          "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
          "science",
          ["data", "aggregate", "uncertainty", "kind"],
          "a confidence interval is unsupported because this request carries no sampling estimand, sampling design, repeat universe, or coverage-generating procedure. Dispersion across the exact declared members is descriptive evidence, not a confidence procedure."
        )
      );
    }
    if (uncertaintyKind === "standard_deviation" && asString(aggregate2.method) !== "mean") {
      errors.push(
        issue(
          "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
          "science",
          ["data", "aggregate", "uncertainty", "kind"],
          "standard deviation is dispersion about the mean and revision 2 renders it as mean plus or minus one SD. Centering that carrier on a median, minimum, or maximum would fabricate endpoints with no declared statistical meaning."
        )
      );
    }
    if (uncertaintyKind === "quantile_interval" && asString(declaredUncertainty?.method) !== "empirical_type_7_linear") {
      errors.push(
        issue(
          "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
          "science",
          ["data", "aggregate", "uncertainty", "method"],
          "revision 2 validates and discloses only empirical Type-7 quantiles; uncertainty.method must be empirical_type_7_linear."
        )
      );
    }
    if (declaredUncertainty !== void 0 && uncertaintyKind !== void 0 && uncertaintyKind !== "none") {
      if (asString(declaredUncertainty.basis) !== "ensemble_members") {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "aggregate", "uncertainty", "basis"],
            "a declared aggregate uncertainty is dispersion across its contributing member synapses and must use the registered `ensemble_members` basis. Calling distinct synapses replicates would add an exchangeability claim the request does not establish."
          )
        );
      }
      const sampleCounts = asArray(declaredUncertainty.sampleCount);
      if (sampleCounts === void 0) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "aggregate", "uncertainty", "sampleCount"],
            "a declared aggregate uncertainty must carry sampleCount at every evaluation time so its dispersion denominator can be checked against contributingCounts."
          )
        );
      } else {
        if (sampleCounts.length !== rawAggregateValues.length) {
          errors.push(
            issue(
              "SEMANTIC_LENGTH_MISMATCH",
              "semantic",
              ["data", "aggregate", "uncertainty", "sampleCount"],
              `uncertainty.sampleCount has ${sampleCounts.length} entries for ${rawAggregateValues.length} aggregate observations.`
            )
          );
        }
        for (let index = 0; index < Math.min(sampleCounts.length, contributingCounts.length); index++) {
          if (errors.length >= MAX_ERROR_RECORDS) break;
          const minimumSampleCount = uncertaintyKind === "standard_deviation" ? 2 : 1;
          const expected = contributingCounts[index] < minimumSampleCount ? null : contributingCounts[index];
          if (sampleCounts[index] !== expected) {
            errors.push(
              issue(
                "SCIENCE_NORMALIZATION_UNVERIFIABLE",
                "science",
                ["data", "aggregate", "uncertainty", "sampleCount", index],
                `uncertainty.sampleCount must equal contributingCounts where the declared descriptive statistic is defined and be null otherwise; sample standard deviation requires at least two contributors, while empirical quantiles/ranges require one. Expected ${String(expected)} here.`
              )
            );
            break;
          }
        }
      }
    }
    validatePreaggregatedAggregateUncertainty(aggregate2, declaredUncertainty, errors);
    return errors;
  }
  if (mode !== "edges") return errors;
  if (display === "aggregate_declared") {
    errors.push(
      issue(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        "science",
        ["parameters", "display"],
        "raw edge observations cannot use aggregate_declared display. Use a derived aggregate display or preaggregated input."
      )
    );
  }
  const series = records(data.series);
  validateComparability(
    series.flatMap((entry) => {
      const model = asString(entry.synapseModel);
      return model === void 0 ? [] : [model];
    }),
    parameters,
    errors
  );
  const edgeIds = /* @__PURE__ */ new Set();
  const timeGrids = /* @__PURE__ */ new Map();
  const decisionWitnessesByEdge = /* @__PURE__ */ new Map();
  const recordedIntervalsByEdge = /* @__PURE__ */ new Map();
  const duplicateTimeEdges = /* @__PURE__ */ new Set();
  const excludedSourceTimeEdges = /* @__PURE__ */ new Set();
  const targetValueUnit = legalSynapticWeightUnit(
    asString(asRecord(series[0]?.values)?.unit)
  );
  const weightAxisWitnesses = [];
  for (let index = 0; index < series.length; index++) {
    if (errors.length >= MAX_ERROR_RECORDS) break;
    const edgeId = asString(series[index].edgeId);
    if (edgeId !== void 0 && edgeIds.has(edgeId)) {
      errors.push(
        issue(
          "SEMANTIC_DUPLICATE_ID",
          "semantic",
          ["data", "series", index, "edgeId"],
          "each synapse series must have one unique edgeId. Duplicate identity would make membership resolution order-dependent."
        )
      );
    }
    if (edgeId !== void 0) edgeIds.add(edgeId);
    const timeLength = asArray(asRecord(series[index].time)?.values)?.length;
    const valueLength = asArray(asRecord(series[index].values)?.values)?.length;
    if (timeLength !== void 0 && valueLength !== void 0 && timeLength !== valueLength) {
      errors.push(
        issue(
          "SEMANTIC_LENGTH_MISMATCH",
          "semantic",
          ["data", "series", index],
          "every synapse series must carry one weight entry for every time entry. This check applies to every series, not only the first catalog examples."
        )
      );
    }
    const eventKinds = asArray(series[index].eventKinds);
    if (eventKinds !== void 0 && timeLength !== void 0 && eventKinds.length !== timeLength) {
      errors.push(
        issue(
          "SEMANTIC_LENGTH_MISMATCH",
          "semantic",
          ["data", "series", index, "eventKinds"],
          `eventKinds has ${eventKinds.length} entries for ${timeLength} observation times. A missing event label cannot be shifted onto a different update.`
        )
      );
    }
    const valuesQuantity = asRecord(series[index].values);
    const valuesUnit = asString(valuesQuantity?.unit);
    const seriesUncertainty = asRecord(series[index].uncertainty);
    if (asString(seriesUncertainty?.kind) !== "none") {
      errors.push(
        issue(
          "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
          "science",
          ["data", "series", index, "uncertainty", "kind"],
          "revision 2 requires uncertainty:none on every identified raw edge. The request carries one synapse from one run but no aligned repeat universe, central estimator, or repeat-level values from which an SD, SE, interval, or bootstrap distribution could be verified."
        )
      );
    }
    validateNestedUncertainty(
      seriesUncertainty,
      asArray(valuesQuantity?.values) ?? [],
      ["data", "series", index, "uncertainty"],
      errors
    );
    validateQuantityArrayFidelity(
      valuesQuantity,
      targetValueUnit,
      ["data", "series", index, "values", "values"],
      "weight observation",
      errors
    );
    validateUncertaintyAxisFidelity(
      seriesUncertainty,
      targetValueUnit,
      ["data", "series", index, "uncertainty"],
      errors
    );
    weightAxisWitnesses.push(...quantityArrayWitnesses(
      valuesQuantity?.values,
      valuesUnit,
      ["data", "series", index, "values", "values"]
    ));
    const uncertaintyUnit = asString(seriesUncertainty?.unit);
    for (const key of ["values", "lower", "upper"]) {
      weightAxisWitnesses.push(...quantityArrayWitnesses(
        seriesUncertainty?.[key],
        uncertaintyUnit,
        ["data", "series", index, "uncertainty", key]
      ));
    }
    const time = asRecord(series[index].time);
    const timeUnit = asString(time?.unit);
    const sourceTimes = finiteNumbers(time?.values);
    if (time !== void 0 && windowUnit !== void 0) {
      validateTimeVectorFidelity(
        time,
        windowUnit,
        ["data", "series", index, "time", "values"],
        errors
      );
    }
    if (edgeId !== void 0) {
      const seenTimes = /* @__PURE__ */ new Set();
      for (const sourceTime of sourceTimes) {
        if (seenTimes.has(sourceTime)) duplicateTimeEdges.add(edgeId);
        seenTimes.add(sourceTime);
      }
    }
    const recorded = asRecord(series[index].recordedInterval);
    const start = asNumber(recorded?.start);
    const stop = asNumber(recorded?.stop);
    if (start !== void 0 && stop !== void 0 && !(start < stop)) {
      errors.push(
        issue(
          "SCIENCE_WINDOW_INVALID",
          "science",
          ["data", "series", index, "recordedInterval"],
          "a recorded interval must have start < stop. A reversed or empty observation span cannot silently become an empty trace."
        )
      );
    }
    const recordedUnit = asString(recorded?.unit);
    const windowStart2 = asNumber(window.start);
    const windowStop2 = asNumber(window.stop);
    let convertedRecordedStart;
    let convertedRecordedStop;
    if (start !== void 0 && stop !== void 0 && recordedUnit !== void 0 && windowUnit !== void 0 && windowStart2 !== void 0 && windowStop2 !== void 0 && start < stop) {
      const convertedRecorded = convertOrderedInterval(
        start,
        stop,
        recordedUnit,
        windowUnit,
        ["data", "series", index, "recordedInterval"],
        errors
      );
      convertedRecordedStart = convertedRecorded?.start;
      convertedRecordedStop = convertedRecorded?.stop;
      if (convertedRecordedStart !== void 0 && convertedRecordedStop !== void 0 && !(Math.min(windowStop2, convertedRecordedStop) > Math.max(windowStart2, convertedRecordedStart))) {
        errors.push(
          issue(
            "SCIENCE_WINDOW_INVALID",
            "science",
            ["data", "series", index, "recordedInterval"],
            "the recorded interval must have a positive-duration intersection with the analysis window. A trace cannot be compiled from a disjoint observation span."
          )
        );
      }
      if (edgeId !== void 0 && convertedRecordedStart !== void 0 && convertedRecordedStop !== void 0) {
        recordedIntervalsByEdge.set(edgeId, {
          start: convertedRecordedStart,
          stop: convertedRecordedStop
        });
      }
    }
    if (edgeId !== void 0 && timeUnit !== void 0 && recordedUnit !== void 0 && start !== void 0 && stop !== void 0 && windowUnit !== void 0 && windowStart2 !== void 0 && windowStop2 !== void 0) {
      const witnesses = [
        ...sourceTimes.map((value, timeIndex) => ({
          value,
          unit: timeUnit,
          path: ["data", "series", index, "time", "values", timeIndex]
        })),
        {
          value: start,
          unit: recordedUnit,
          path: ["data", "series", index, "recordedInterval", "start"]
        },
        {
          value: stop,
          unit: recordedUnit,
          path: ["data", "series", index, "recordedInterval", "stop"]
        },
        { value: windowStart2, unit: windowUnit, path: ["data", "window", "start"] },
        { value: windowStop2, unit: windowUnit, path: ["data", "window", "stop"] }
      ];
      validateDecisionTimeEmbedding(witnesses, windowUnit, errors);
    }
    if (edgeId !== void 0 && time !== void 0 && windowUnit !== void 0 && windowStart2 !== void 0 && windowStop2 !== void 0 && convertedRecordedStart !== void 0 && convertedRecordedStop !== void 0) {
      const convertedTimes = convertTimes(
        time,
        windowUnit,
        ["data", "series", index, "time", "values"],
        errors
      );
      if (convertedTimes !== void 0) {
        const recordedClosed = asString(recorded?.boundary) === "[start,stop]";
        for (let timeIndex = 0; timeIndex < convertedTimes.length; timeIndex++) {
          const candidate = convertedTimes[timeIndex];
          if (candidate < convertedRecordedStart || candidate > convertedRecordedStop || !recordedClosed && candidate === convertedRecordedStop) {
            errors.push(
              issue(
                "SCIENCE_EVENT_OUT_OF_WINDOW",
                "science",
                ["data", "series", index, "time", "values", timeIndex],
                "a source observation lies outside its declared recordedInterval. Analysis-window filtering cannot repair a contradiction about when this synapse was actually observed."
              )
            );
            break;
          }
        }
        const lower2 = Math.max(windowStart2, convertedRecordedStart);
        const upper2 = Math.min(windowStop2, convertedRecordedStop);
        const windowClosed2 = asString(window.boundary) === "[start,stop]";
        const effectiveUpperClosed = (upper2 !== windowStop2 || windowClosed2) && (upper2 !== convertedRecordedStop || recordedClosed);
        const acceptedAt = (candidate) => candidate >= lower2 && (candidate < upper2 || effectiveUpperClosed && candidate === upper2);
        const accepted = convertedTimes.filter(acceptedAt).sort((left, right) => left - right).filter((candidate, candidateIndex, all) => candidateIndex === 0 || candidate !== all[candidateIndex - 1]);
        timeGrids.set(edgeId, { index, values: accepted });
        if (convertedTimes.some((candidate) => !acceptedAt(candidate))) {
          excludedSourceTimeEdges.add(edgeId);
        }
        const sourceWitnesses = sourceTimes.map((value, timeIndex) => ({
          value,
          unit: timeUnit,
          path: ["data", "series", index, "time", "values", timeIndex]
        }));
        decisionWitnessesByEdge.set(edgeId, [
          ...sourceWitnesses,
          { value: start, unit: recordedUnit, path: ["data", "series", index, "recordedInterval", "start"] },
          { value: stop, unit: recordedUnit, path: ["data", "series", index, "recordedInterval", "stop"] },
          { value: windowStart2, unit: windowUnit, path: ["data", "window", "start"] },
          { value: windowStop2, unit: windowUnit, path: ["data", "window", "stop"] }
        ]);
      }
    }
    const lower = asRecord(asRecord(series[index].bounds)?.lower);
    const upper = asRecord(asRecord(series[index].bounds)?.upper);
    const lowerValue = asNumber(lower?.value);
    const upperValue = asNumber(upper?.value);
    const lowerUnit = asString(lower?.unit);
    const upperUnit = asString(upper?.unit);
    const initialQuantity = asRecord(asRecord(series[index].initialWeight)?.quantity);
    weightAxisWitnesses.push(
      ...quantityScalarWitness(
        initialQuantity,
        ["data", "series", index, "initialWeight", "quantity"]
      ),
      ...quantityScalarWitness(
        lower,
        ["data", "series", index, "bounds", "lower"]
      ),
      ...quantityScalarWitness(
        upper,
        ["data", "series", index, "bounds", "upper"]
      )
    );
    validateWeightScalarQuantity(
      initialQuantity,
      targetValueUnit,
      ["data", "series", index, "initialWeight", "quantity"],
      "declared initial weight",
      errors
    );
    const convertedLower = validateWeightScalarQuantity(
      lower,
      targetValueUnit,
      ["data", "series", index, "bounds", "lower"],
      "declared lower weight bound",
      errors
    );
    const convertedUpper = validateWeightScalarQuantity(
      upper,
      targetValueUnit,
      ["data", "series", index, "bounds", "upper"],
      "declared upper weight bound",
      errors
    );
    if (valuesUnit !== void 0 && lowerValue !== void 0 && upperValue !== void 0 && lowerUnit !== void 0 && upperUnit !== void 0) {
      let exactOrder;
      if (lowerUnit === upperUnit) {
        exactOrder = lowerValue < upperValue ? -1 : lowerValue > upperValue ? 1 : 0;
      } else if (dimensionOf(lowerUnit) !== void 0 && dimensionOf(lowerUnit) !== "simulator_defined" && dimensionOf(lowerUnit) === dimensionOf(upperUnit)) {
        try {
          exactOrder = compareExactUnitSumToValue(
            [{ value: lowerValue, unit: lowerUnit }],
            { value: upperValue, unit: upperUnit }
          );
        } catch {
          exactOrder = void 0;
        }
      }
      if (exactOrder === 1) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "series", index, "bounds"],
            "the declared lower reference bound exceeds the upper bound under exact registered-unit comparison. Rounded display conversion cannot erase this contradiction."
          )
        );
      } else if (exactOrder === -1 && convertedLower !== void 0 && convertedUpper !== void 0) {
        const physicalAxis = dimensionOf(targetValueUnit ?? valuesUnit) !== "simulator_defined";
        let expectedWidth;
        if (physicalAxis) {
          try {
            expectedWidth = convertExactUnitSum([
              { value: upperValue, unit: upperUnit },
              { value: -lowerValue, unit: lowerUnit }
            ], targetValueUnit ?? valuesUnit);
          } catch {
            expectedWidth = void 0;
          }
        }
        const actualWidth = convertedUpper - convertedLower;
        if (!(convertedUpper > convertedLower) || !Number.isFinite(actualWidth) || physicalAxis && expectedWidth === void 0 || expectedWidth !== void 0 && (!(expectedWidth > 0) || !binary64RelativeDifferenceWithinEpsilons(
          expectedWidth,
          actualWidth,
          EFFECT_RELATIVE_EPSILON_MULTIPLES
        ))) {
          errors.push(
            issue(
              "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
              "science",
              ["data", "series", index, "bounds"],
              `the exactly ordered reference bounds collapse or are materially distorted on the ${targetValueUnit ?? valuesUnit} display axis. Choose a better-scaled registered weight unit.`
            )
          );
        }
      }
    }
  }
  validateWeightAxisEmbedding(weightAxisWitnesses, targetValueUnit, errors);
  const observation = asRecord(data.observation) ?? {};
  const duplicatePolicy = asString(asRecord(parameters.duplicateTimePolicy)?.policy) ?? asString(parameters.duplicateTimePolicy);
  if (observation.kind === "interpolated_trajectory") {
    if (asString(observation.interpolant) !== "linear") {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["data", "observation", "interpolant"],
          "revision 2 can render and authority-bind only a caller-supplied linear reconstruction. A non-linear interpolant must not be silently drawn as straight segments."
        )
      );
    }
    const eventKindSeries = series.findIndex((entry) => asArray(entry.eventKinds) !== void 0);
    if (eventKindSeries >= 0) {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["data", "series", eventKindSeries, "eventKinds"],
          "interpolated trajectory points are caller reconstructions, not source events or observations. Their reconstruction carrier records method, interpolant, and author; eventKinds is forbidden rather than misrepresenting a reconstruction vertex as a source event."
        )
      );
    }
    if (excludedSourceTimeEdges.size > 0) {
      const seriesIndex = series.findIndex((entry) => excludedSourceTimeEdges.has(asString(entry.edgeId) ?? ""));
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["data", "series", Math.max(0, seriesIndex), "time", "values"],
          "revision 2 refuses to filter reconstruction vertices outside the effective analysis/recording window: an excluded linear knot can determine geometry inside the window. Pre-clip the trajectory upstream and declare the exact retained vertices."
        )
      );
    }
    if (duplicatePolicy === "keep_replicates" && duplicateTimeEdges.size > 0) {
      errors.push(
        issue(
          "SCIENCE_DUPLICATE_TIME_POLICY",
          "science",
          ["parameters", "duplicateTimePolicy"],
          "an interpolated trajectory must be a function of time. Two retained reconstruction vertices at one time cannot be kept as replicates; use a named duplicate aggregate or reject the request."
        )
      );
    }
  }
  if (duplicateTimeEdges.size > 0 && observation.kind === "event_updated") {
    errors.push(
      issue(
        "SCIENCE_DUPLICATE_TIME_POLICY",
        "science",
        ["parameters", "duplicateTimePolicy"],
        "revision 2 refuses every event-updated duplicate timestamp. A single global before/after discriminator cannot identify the side or sequential event represented by each same-time row, and stable array order alone is not a scientific event-order claim."
      )
    );
  }
  if (duplicateTimeEdges.size > 0 && observation.kind === "point_sample" && duplicatePolicy === "keep_replicates") {
    errors.push(
      issue(
        "SCIENCE_DUPLICATE_TIME_POLICY",
        "science",
        ["parameters", "duplicateTimePolicy"],
        "revision 2 cannot join repeated point samples at one time without inventing a within-time vertical trajectory or ordering. Collapse them by one named method or reject the figure; duplicate markers need a future explicit geometry carrier."
      )
    );
  }
  if (duplicatePolicy === "aggregate") {
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      const edgeId = asString(series[seriesIndex].edgeId);
      if (edgeId !== void 0 && duplicateTimeEdges.has(edgeId) && asString(asRecord(series[seriesIndex].uncertainty)?.kind) !== "none") {
        errors.push(
          issue(
            "SCIENCE_DUPLICATE_TIME_POLICY",
            "science",
            ["data", "series", seriesIndex, "uncertainty"],
            "a duplicate-time point aggregate cannot carry per-observation uncertainty: Cortexel has no declared model for propagating uncertainty from several source rows into the collapsed value."
          )
        );
        break;
      }
    }
  }
  const derived = display === "aggregate_derived" || display === "aggregate_derived_with_members";
  if (derived && observation.kind === "event_updated" && observation.updateSemantics === "value_before_update") {
    errors.push(
      issue(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        "science",
        ["parameters", "aggregate", "evaluation"],
        "revision 2 derives hold aggregates only for value_after_update. A value-before aggregate needs side-qualified terminal and denominator-transition carriers to bind its trailing interval without painting a future state backward; those carriers do not yet exist."
      )
    );
  }
  const membership = asRecord(data.membership);
  if (derived && membership === void 0) {
    errors.push(
      issue(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        "science",
        ["data", "membership"],
        "a derived aggregate requires the exact identified membership and its intervals."
      )
    );
    return errors;
  }
  if (!derived && membership !== void 0) {
    errors.push(
      issue(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        "science",
        ["data", "membership"],
        "membership is meaningful only for a derived aggregate display. An individual view must not carry an unused denominator claim."
      )
    );
  }
  if (membership === void 0) return errors;
  const members = records(membership.members);
  const membershipUnit = asString(membership.unit);
  const groupId = asString(membership.groupId);
  if (groupId !== void 0 && edgeIds.has(groupId)) {
    errors.push(
      issue(
        "SEMANTIC_DUPLICATE_ID",
        "semantic",
        ["data", "membership", "groupId"],
        "the aggregate groupId must not equal any member edgeId. Series identity is global within the figure table and geometry authority."
      )
    );
  }
  const memberIds = /* @__PURE__ */ new Set();
  const convertedMembershipByEdge = /* @__PURE__ */ new Map();
  const membershipWitnessesByEdge = /* @__PURE__ */ new Map();
  for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
    if (errors.length >= MAX_ERROR_RECORDS) break;
    const edgeId = asString(members[memberIndex].edgeId);
    if (edgeId !== void 0 && memberIds.has(edgeId)) {
      errors.push(
        issue(
          "SEMANTIC_DUPLICATE_ID",
          "semantic",
          ["data", "membership", "members", memberIndex, "edgeId"],
          "each aggregate member edgeId must appear exactly once. A Map overwrite is not a membership policy."
        )
      );
    }
    if (edgeId !== void 0) memberIds.add(edgeId);
    if (edgeId !== void 0 && !edgeIds.has(edgeId)) {
      errors.push(
        issue(
          "SEMANTIC_UNKNOWN_REFERENCE",
          "semantic",
          ["data", "membership", "members", memberIndex, "edgeId"],
          "an aggregate member must resolve to exactly one declared edge series."
        )
      );
    }
    const intervals = records(members[memberIndex].intervals);
    const convertedIntervals = [];
    const intervalWitnesses = [];
    let previousStop;
    for (let intervalIndex = 0; intervalIndex < intervals.length; intervalIndex++) {
      if (errors.length >= MAX_ERROR_RECORDS) break;
      const start = asNumber(intervals[intervalIndex].start);
      const stop = asNumber(intervals[intervalIndex].stop);
      if (start === void 0 || stop === void 0) continue;
      if (!(start < stop)) {
        errors.push(
          issue(
            "SCIENCE_WINDOW_INVALID",
            "science",
            ["data", "membership", "members", memberIndex, "intervals", intervalIndex],
            "membership intervals are half-open and must have start < stop. A reversed or empty interval cannot silently erase a member."
          )
        );
      }
      if (previousStop !== void 0 && start < previousStop) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "membership", "members", memberIndex, "intervals", intervalIndex],
            "membership intervals for one edge must be ordered and non-overlapping. Cortexel does not union or reorder caller-authored denominator spans."
          )
        );
      }
      if (membershipUnit !== void 0 && windowUnit !== void 0 && start < stop) {
        const intervalPath = [
          "data",
          "membership",
          "members",
          memberIndex,
          "intervals",
          intervalIndex
        ];
        const converted = convertOrderedInterval(
          start,
          stop,
          membershipUnit,
          windowUnit,
          intervalPath,
          errors
        );
        if (converted !== void 0) convertedIntervals.push(converted);
        intervalWitnesses.push(
          { value: start, unit: membershipUnit, path: [...intervalPath, "start"] },
          { value: stop, unit: membershipUnit, path: [...intervalPath, "stop"] }
        );
      }
      previousStop = stop;
    }
    if (edgeId !== void 0) {
      convertedMembershipByEdge.set(edgeId, convertedIntervals);
      membershipWitnessesByEdge.set(edgeId, intervalWitnesses);
    }
  }
  const unusedSeriesIds = [...edgeIds].filter((edgeId) => !memberIds.has(edgeId));
  if (unusedSeriesIds.length > 0 || memberIds.size !== edgeIds.size) {
    errors.push(
      issue(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        "science",
        ["data", "membership", "members"],
        `derived mode requires membership to select the exact data.series identity set. Unused raw series would enter the complete table and source-carrier counts without being drawn or influencing the aggregate${unusedSeriesIds.length > 0 ? `; unused ids: ${unusedSeriesIds.join(", ")}` : ""}.`
      )
    );
  }
  const aggregate = asRecord(parameters.aggregate) ?? {};
  const evaluation = asRecord(aggregate.evaluation) ?? {};
  const evaluationMode = asString(evaluation.mode);
  const selectedValueUnits = new Set(series.flatMap((entry) => {
    const edgeId = asString(entry.edgeId);
    const unit = asString(asRecord(entry.values)?.unit);
    return edgeId !== void 0 && memberIds.has(edgeId) && unit !== void 0 ? [unit] : [];
  }));
  if (selectedValueUnits.size > 1) {
    errors.push(
      issue(
        "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
        "science",
        ["parameters", "weightComparability"],
        `a derived aggregate requires one exact weight unit code across every selected member; got ${[...selectedValueUnits].join(", ")}. Independently rounding heterogeneous units before pooling can erase real variation or double-round the statistic. Convert upstream under an explicit recorded transform.`
      )
    );
  }
  const initialWeightCanEnterDerivedHold = observation.kind === "event_updated" && (evaluationMode === "hold_last_observed_at_union_times" || evaluationMode === "hold_last_observed_at_declared_times");
  if (initialWeightCanEnterDerivedHold) {
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      const entry = series[seriesIndex];
      const edgeId = asString(entry.edgeId);
      if (edgeId === void 0 || !memberIds.has(edgeId)) continue;
      const valueUnit = asString(asRecord(entry.values)?.unit);
      const initialUnit = asString(asRecord(asRecord(entry.initialWeight)?.quantity)?.unit);
      if (valueUnit !== void 0 && initialUnit !== void 0 && initialUnit !== valueUnit) {
        errors.push(
          issue(
            "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
            "science",
            ["data", "series", seriesIndex, "initialWeight", "quantity", "unit"],
            `a derived hold requires the declared initial weight to use the member series' exact unit code ${valueUnit}; got ${initialUnit}. Independently rounding an initial state before pooling can erase real variation or double-round the aggregate.`
          )
        );
        break;
      }
    }
  }
  const selectedDuplicateTime = [...memberIds].some((edgeId) => duplicateTimeEdges.has(edgeId));
  if (evaluationMode === "shared_sample_grid" && selectedDuplicateTime && duplicatePolicy === "keep_replicates") {
    errors.push(
      issue(
        "SCIENCE_DUPLICATE_TIME_POLICY",
        "science",
        ["parameters", "duplicateTimePolicy"],
        "shared_sample_grid has no cross-synapse replicate identity with which to pair repeated samples at one timestamp. Aggregate the within-synapse point replicates by a named method first, or reject them; Cortexel will not pair them by array ordinal."
      )
    );
  }
  const dispersion = asRecord(aggregate.dispersion);
  const dispersionKind = asString(dispersion?.kind);
  if (dispersionKind === "standard_error" || dispersionKind === "confidence_interval" || dispersionKind === "credible_interval") {
    errors.push(
      issue(
        "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
        "science",
        ["parameters", "aggregate", "dispersion", "kind"],
        `${dispersionKind} is inferential and is unsupported for an exact declared synapse ensemble. The request declares no sampling estimand, sampling design, exchangeability model, repeat universe, coverage procedure, or verified posterior from which that carrier could be derived.`
      )
    );
  }
  if (dispersionKind === "standard_deviation" && asString(aggregate.method) !== "mean") {
    errors.push(
      issue(
        "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
        "science",
        ["parameters", "aggregate", "dispersion", "kind"],
        "standard deviation is dispersion about the mean and revision 2 renders it as mean plus or minus one SD. Centering that carrier on a median, minimum, or maximum would fabricate endpoints with no declared statistical meaning."
      )
    );
  }
  if (asString(dispersion?.kind) === "quantile_interval") {
    const lowerQuantile = asNumber(dispersion?.lowerQuantile);
    const upperQuantile = asNumber(dispersion?.upperQuantile);
    if (lowerQuantile !== void 0 && upperQuantile !== void 0 && !(lowerQuantile < upperQuantile)) {
      errors.push(
        issue(
          "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
          "science",
          ["parameters", "aggregate", "dispersion", "upperQuantile"],
          `the lower aggregate quantile (${lowerQuantile}) must be strictly below the upper quantile (${upperQuantile}).`
        )
      );
    }
  }
  if ((evaluationMode === "hold_last_observed_at_union_times" || evaluationMode === "hold_last_observed_at_declared_times") && observation.kind !== "event_updated" || evaluationMode === "shared_sample_grid" && observation.kind !== "point_sample") {
    errors.push(
      issue(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        "science",
        ["parameters", "aggregate", "evaluation", "mode"],
        "the aggregate evaluation contradicts the observation kind: holds require event-updated values and shared_sample_grid requires point samples."
      )
    );
  }
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const edgeId = asString(series[seriesIndex].edgeId);
    if (!memberIds.has(edgeId ?? "")) continue;
    if ((evaluationMode === "hold_last_observed_at_union_times" || evaluationMode === "hold_last_observed_at_declared_times") && asString(asRecord(series[seriesIndex].recordedInterval)?.boundary) !== "[start,stop)") {
      errors.push(
        issue(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          "science",
          ["data", "series", seriesIndex, "recordedInterval", "boundary"],
          "a derived hold aggregate currently requires half-open recorded intervals. A closed recorded stop creates a left-sided availability transition that the aggregate step carrier cannot encode without drawing the post-boundary denominator backward."
        )
      );
    }
  }
  if (windowUnit !== void 0) {
    const declaredTime = asRecord(evaluation.times);
    const declaredTimeUnit = asString(declaredTime?.unit);
    const declaredTimeValues = finiteNumbers(declaredTime?.values);
    if (declaredTime !== void 0) {
      validateTimeVectorFidelity(
        declaredTime,
        windowUnit,
        ["parameters", "aggregate", "evaluation", "times", "values"],
        errors
      );
    }
    const globalWitnesses = [
      ...[...memberIds].flatMap((edgeId) => decisionWitnessesByEdge.get(edgeId) ?? []),
      ...[...memberIds].flatMap((edgeId) => membershipWitnessesByEdge.get(edgeId) ?? []),
      ...declaredTimeUnit === void 0 ? [] : declaredTimeValues.map((value, index) => ({
        value,
        unit: declaredTimeUnit,
        path: ["parameters", "aggregate", "evaluation", "times", "values", index]
      }))
    ];
    validateDecisionTimeEmbedding(globalWitnesses, windowUnit, errors);
  }
  const windowStart = asNumber(window.start);
  const windowStop = asNumber(window.stop);
  const windowClosed = asString(window.boundary) === "[start,stop]";
  const inAnalysisWindow = (value) => windowStart !== void 0 && windowStop !== void 0 && value >= windowStart && (value < windowStop || windowClosed && value === windowStop);
  const stateChangeTimes = [
    ...windowStart === void 0 ? [] : [windowStart],
    ...windowClosed && windowStop !== void 0 ? [windowStop] : [],
    ...[...memberIds].flatMap((edgeId) => timeGrids.get(edgeId)?.values ?? []),
    ...[...memberIds].flatMap((edgeId) => (convertedMembershipByEdge.get(edgeId) ?? []).flatMap((interval) => [interval.start, interval.stop])),
    ...[...memberIds].flatMap((edgeId) => {
      const interval = recordedIntervalsByEdge.get(edgeId);
      return interval === void 0 ? [] : [interval.start, interval.stop];
    })
  ].filter(inAnalysisWindow);
  const requiredStateChanges = [...new Set(stateChangeTimes)].sort((left, right) => left - right);
  if (evaluationMode === "shared_sample_grid" && edgeIds.size === series.length && memberIds.size > 0) {
    let reference;
    for (const member of members) {
      const edgeId = asString(member.edgeId);
      if (edgeId === void 0) continue;
      const grid = timeGrids.get(edgeId);
      if (grid === void 0) continue;
      if (reference === void 0) {
        reference = grid.values;
        continue;
      }
      if (grid.values.length !== reference.length || grid.values.some((value, index) => value !== reference?.[index])) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["data", "series", grid.index, "time", "values"],
            "shared_sample_grid requires every selected member to have an exact elementwise-identical accepted time grid after one registered-unit conversion and recorded/window filtering. Cortexel does not interpolate or align nearby samples."
          )
        );
        break;
      }
    }
  }
  if (evaluationMode === "hold_last_observed_at_declared_times" && windowUnit !== void 0) {
    const times = asRecord(evaluation.times) ?? {};
    const converted = convertTimes(
      times,
      windowUnit,
      ["parameters", "aggregate", "evaluation", "times", "values"],
      errors
    );
    if (converted !== void 0) {
      validateIncreasingWindowTimes(
        converted,
        window,
        ["parameters", "aggregate", "evaluation", "times", "values"],
        errors
      );
      const declaredSet = new Set(converted);
      const missingStateChange = requiredStateChanges.find((time) => !declaredSet.has(time));
      if (missingStateChange !== void 0) {
        errors.push(
          issue(
            "SCIENCE_NORMALIZATION_UNVERIFIABLE",
            "science",
            ["parameters", "aggregate", "evaluation", "times", "values"],
            `a declared hold grid must contain every in-window observation, membership, recording, and initial-state transition so the derived step cannot be held across an omitted change. The converted grid is missing ${missingStateChange} ${windowUnit}.`
          )
        );
      }
    }
  }
  return errors;
};

// src/core/semantics/compartment-trace.ts
var VALIDATOR_ID2 = "compartment_trace.series_identity_declared";
var compartmentTraceSeriesIdentityDeclared = (context) => {
  if (context.skillId !== "neuro.compartment_trace") return [];
  const data = getData(context);
  const compartmentIds = asArray(data.compartmentIds);
  const series = asArray(data.series);
  if (compartmentIds === void 0 || series === void 0) return [];
  const universe = /* @__PURE__ */ new Set();
  for (const compartmentId of compartmentIds) {
    if (typeof compartmentId === "string") universe.add(compartmentId);
  }
  const firstOrdinalByIdentity = /* @__PURE__ */ new Map();
  const errors = [];
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const entry = asRecord(series[seriesIndex]);
    if (entry === void 0) continue;
    const compartmentId = entry.compartmentId;
    const signalId = entry.signalId;
    if (typeof compartmentId !== "string" || typeof signalId !== "string") continue;
    if (!universe.has(compartmentId)) {
      errors.push(
        makeError({
          code: "SEMANTIC_UNKNOWN_REFERENCE",
          stage: "semantic",
          instancePath: pointer("data", "series", seriesIndex, "compartmentId"),
          validatorId: VALIDATOR_ID2,
          message: "this series refers to a compartmentId absent from data.compartmentIds. Cortexel does not add a recorded compartment to the declared row universe implicitly."
        })
      );
    }
    let firstOrdinalBySignal = firstOrdinalByIdentity.get(compartmentId);
    if (firstOrdinalBySignal === void 0) {
      firstOrdinalBySignal = /* @__PURE__ */ new Map();
      firstOrdinalByIdentity.set(compartmentId, firstOrdinalBySignal);
    }
    const firstOrdinal = firstOrdinalBySignal.get(signalId);
    if (firstOrdinal !== void 0) {
      errors.push(
        makeError({
          code: "SEMANTIC_DUPLICATE_ID",
          stage: "semantic",
          instancePath: pointer("data", "series", seriesIndex, "signalId"),
          validatorId: VALIDATOR_ID2,
          message: `this exact (compartmentId, signalId) identity already belongs to data.series/${firstOrdinal}. One scientific identity cannot name two recordings, because row, mark, and table binding would become ambiguous.`
        })
      );
    } else {
      firstOrdinalBySignal.set(signalId, seriesIndex);
    }
  }
  return errors;
};

// src/core/semantics/index.ts
var SEMANTIC_VALIDATORS = Object.freeze({
  "provenance.no_caller_assurance": provenanceNoCallerAssurance,
  "provenance.note_safe_display": provenanceNoteSafeDisplay,
  "unit.dimension_match": unitDimensionMatch,
  "unit.canonical_code": unitCanonicalCode,
  "series.equal_length": seriesEqualLength,
  "ids.unique": idsUnique,
  "bins.strictly_increasing": binsStrictlyIncreasing,
  "window.valid": windowValid,
  "events.source_clock_declared": eventsSourceClockDeclared,
  "events.within_window": eventsWithinWindow,
  "events.sender_universe_declared": eventsSenderUniverseDeclared,
  "events.trial_universe_declared": eventsTrialUniverseDeclared,
  "rate.denominator_positive": rateDenominatorPositive,
  "rate.verify_normalization": rateVerifyNormalization,
  "histogram.normalization_consistent": histogramNormalizationConsistent,
  "isi.within_train_only": isiWithinTrainOnly,
  "isi.zero_interval_policy": isiZeroIntervalPolicy,
  "psth.alignment_declared": psthAlignmentDeclared,
  "correlogram.event_trains_valid": correlogramEventTrainsValid,
  "correlogram.lag_range_valid": correlogramLagRangeValid,
  "correlogram.prebinned_axis_consistent": correlogramPrebinnedAxisConsistent,
  "correlogram.roles_disjoint": correlogramRolesDisjoint,
  "correlogram.statistic_denominator": correlogramStatisticDenominator,
  "topology.scope_declared": topologyScopeDeclared,
  "topology.scope_supports_claim": topologyScopeSupportsClaim,
  "topology.node_universe_declared": topologyNodeUniverseDeclared,
  "topology.edge_endpoints_in_universe": topologyEdgeEndpointsInUniverse,
  "topology.matrix_contract": topologyMatrixContract,
  "topology.multapse_aggregation_declared": topologyMultapseAggregationDeclared,
  "topology.delay_positive": topologyDelayPositive,
  "topology.weight_group_compatible": topologyWeightGroupCompatible,
  "degree.counting_policy_declared": degreeCountingPolicyDeclared,
  "spatial.position_coverage_complete": spatialPositionCoverageComplete,
  "spatial.equal_axis_units": spatialEqualAxisUnits,
  "uncertainty.valid": uncertaintyValid,
  "uncertainty.supported_variant": uncertaintySupportedVariant,
  "trace.duplicate_time_policy": traceDuplicateTimePolicy,
  "trace.axis_dimension_compatible": traceAxisDimensionCompatible,
  "compartment_trace.series_identity_declared": compartmentTraceSeriesIdentityDeclared,
  "phase_plane.derivative_dimension": phasePlaneDerivativeDimension,
  "weight_trace.observation_kind_declared": weightTraceObservationKindDeclared,
  "response_curve.estimator_declared": responseCurveEstimatorDeclared
});
function assertValidatorsImplemented() {
  const missing = SEMANTIC_VALIDATOR_IDS.filter(
    (id) => !Object.prototype.hasOwnProperty.call(SEMANTIC_VALIDATORS, id)
  );
  if (missing.length > 0) {
    throw new Error(
      `semantic validators registered in the contract but not implemented: ${missing.join(", ")}. A skill referencing one of these would skip the rule entirely.`
    );
  }
}
assertValidatorsImplemented();
function runSemanticValidators(request, skillId) {
  const catalog = SKILL_CATALOG[skillId];
  if (!catalog) return [];
  const errors = [];
  for (const declared of catalog.semanticValidators) {
    const validator = SEMANTIC_VALIDATORS[declared.id];
    if (!validator) continue;
    const context = {
      request,
      skillId,
      ...declared.parameters ? { parameters: declared.parameters } : {}
    };
    errors.push(...validator(context));
  }
  return finalizeErrors(errors);
}
function checkCallerAuthority(request) {
  return finalizeErrors([
    ...provenanceNoCallerAssurance({ request, skillId: "unknown" }),
    ...provenanceNoteSafeDisplay({ request, skillId: "unknown" })
  ]);
}

// src/core/request.ts
var VALIDATED = /* @__PURE__ */ Symbol("cortexel.validated");
var VALIDATED_REQUESTS = /* @__PURE__ */ new WeakSet();
function isValidatedRequest(value) {
  return typeof value === "object" && value !== null && VALIDATED_REQUESTS.has(value);
}
function resolveBudgetProfile(options) {
  let requested = DEFAULT_PROFILE;
  try {
    if (options !== null && options !== void 0) {
      if (typeof options !== "object") throw new Error("invalid options");
      const descriptor = Object.getOwnPropertyDescriptor(options, "budgetProfile");
      if (descriptor !== void 0) {
        if (!Object.prototype.hasOwnProperty.call(descriptor, "value")) {
          throw new Error("accessor-backed options");
        }
        requested = descriptor.value ?? DEFAULT_PROFILE;
      }
    }
  } catch {
    requested = null;
  }
  return {
    profile: typeof requested === "string" ? requested : "<invalid>",
    limits: tryGetBudgetLimits(requested)
  };
}
function invalidBudgetProfile(assurance) {
  return fail(
    [
      makeError({
        code: "RESOURCE_BUDGET_PROFILE_UNKNOWN",
        stage: "budget",
        message: "the selected budget profile is not in this build's closed registry. Unknown and inherited profile ids cannot disable resource limits."
      })
    ],
    assurance
  );
}
function requestedBudgetProfile(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PROFILE;
  const presentation = value.presentation;
  if (presentation === null || typeof presentation !== "object" || Array.isArray(presentation)) {
    return DEFAULT_PROFILE;
  }
  return Object.prototype.hasOwnProperty.call(presentation, "budgetProfile") ? presentation.budgetProfile : DEFAULT_PROFILE;
}
function assuranceFor(boundary, profile) {
  return {
    boundary,
    duplicateKeys: boundary === "raw_json_text" ? "rejected_before_materialization" : "not_observable_after_materialization",
    parserProfile: boundary === "raw_json_text" ? "cortexel-strict-json/1.0" : "cortexel-safe-snapshot/1.0",
    budgetProfile: typeof profile === "string" ? profile : "<invalid>"
  };
}
function fail(errors, assurance) {
  return { ok: false, errors: finalizeErrors([...errors]), inputAssurance: assurance };
}
function readSkillId(request) {
  const skill = request.skill;
  if (typeof skill !== "object" || skill === null || Array.isArray(skill)) return void 0;
  const id = skill.id;
  return typeof id === "string" ? id : void 0;
}
function checkIdentity(request) {
  const errors = [];
  const contract = request.contract;
  if (typeof contract !== "object" || contract === null || Array.isArray(contract)) {
    const expectedContract = {
      name: REQUEST_CONTRACT_IDENTITY.name,
      version: REQUEST_CONTRACT_IDENTITY.version
    };
    errors.push(
      makeError({
        code: "CONTRACT_MISSING",
        stage: "identity",
        instancePath: "/contract",
        message: `the request does not declare its contract. Add ${JSON.stringify({ contract: expectedContract })} \u2014 an undeclared contract is not a ${REQUEST_CONTRACT_IDENTITY.version} request.`,
        repair: {
          operation: "add",
          path: "/contract",
          value: expectedContract,
          reasonCode: "CONTRACT_MISSING"
        }
      })
    );
    return errors;
  }
  const record = contract;
  if (record.name !== REQUEST_CONTRACT_IDENTITY.name || record.version !== REQUEST_CONTRACT_IDENTITY.version) {
    errors.push(
      makeError({
        code: "CONTRACT_UNSUPPORTED_VERSION",
        stage: "identity",
        instancePath: "/contract",
        message: `this build implements ${REQUEST_CONTRACT}. Compare with getBuildIdentity(), then use migrateLegacyRequest() for a supported pre-1.0 request. The packaged CLI equivalents are \`cortexel identity --json\` and \`cortexel migrate ...\`; a repository checkout may run the same implementation through \`bun src/cli/main.ts ...\`.`
      })
    );
  }
  const digest = request.contractDigest;
  if (typeof digest === "string" && digest !== CONTRACT_DIGEST) {
    errors.push(
      makeError({
        code: "CONTRACT_DIGEST_MISMATCH",
        stage: "identity",
        instancePath: "/contractDigest",
        message: `the pinned contract digest does not match this build's (${CONTRACT_DIGEST}). The contract you validated against is not the contract in use; that is exactly what pinning is for.`
      })
    );
  }
  return errors;
}
function checkSkill(skillId) {
  if (skillId === void 0) {
    return [
      makeError({
        code: "SCHEMA_REQUIRED_PROPERTY_MISSING",
        stage: "structural",
        instancePath: "/skill/id",
        message: "the request does not name a skill."
      })
    ];
  }
  const entry = SKILL_CATALOG[skillId];
  if (entry && entry.status === "stable") return [];
  const legacy = LEGACY_SKILL_MAP[skillId];
  if (legacy) {
    return [
      makeError({
        code: "MIGRATION_LEGACY_ID_NOT_ACCEPTED",
        stage: "structural",
        instancePath: "/skill/id",
        message: `"${skillId}" is a pre-1.0 id. ${legacy.targetId ? `It maps to "${legacy.targetId}".` : ""} Use migrateLegacyRequest() or \`cortexel migrate\`. Legacy ids are never silently aliased: a silent alias would make the stored artifact ambiguous about which contract actually validated it.`,
        ...legacy.targetId ? {
          repair: {
            operation: "migrate",
            path: "/skill/id",
            value: legacy.targetId,
            reasonCode: "MIGRATION_LEGACY_ID_NOT_ACCEPTED"
          }
        } : {}
      })
    ];
  }
  if (entry && entry.status === "experimental") {
    return [
      makeError({
        code: "CAPABILITY_EXPERIMENTAL",
        stage: "structural",
        instancePath: "/skill/id",
        message: `"${skillId}" is experimental and cannot be selected through the stable entry point. Consult CAPABILITY_CATALOG and its availability field; no experimental FigureRequestV1 skill is currently callable, and a legacy experimental package export is not a replacement.`
      })
    ];
  }
  return [
    makeError({
      code: "SCHEMA_UNKNOWN_SKILL",
      stage: "structural",
      instancePath: "/skill/id",
      message: `"${skillId}" is not in the stable catalog. Read STABLE_SKILL_IDS or run \`cortexel catalog\`.`
    })
  ];
}
function canonicalizeRequest(request, resolvedSkillRevision) {
  const out = { ...request };
  out.skill = {
    ...request.skill,
    revision: resolvedSkillRevision
  };
  const presentation = out.presentation ?? {};
  out.presentation = {
    themeId: "light",
    width: 720,
    height: 440,
    budgetProfile: "standard",
    ...presentation
  };
  return out;
}
function validateSnapshot(value, assurance) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(
      [
        makeError({
          code: "SCHEMA_TYPE_MISMATCH",
          stage: "structural",
          message: "a figure request must be a JSON object."
        })
      ],
      assurance
    );
  }
  const request = value;
  const authorityErrors = checkCallerAuthority(request);
  if (authorityErrors.length > 0) return fail(authorityErrors, assurance);
  const identityErrors = checkIdentity(request);
  if (identityErrors.length > 0) return fail(identityErrors, assurance);
  const skillId = readSkillId(request);
  const skillErrors = checkSkill(skillId);
  if (skillErrors.length > 0 || skillId === void 0) return fail(skillErrors, assurance);
  const catalog = SKILL_CATALOG[skillId];
  const requestedRevision = request.skill.revision;
  if (typeof requestedRevision === "number" && requestedRevision !== catalog.revision) {
    return fail(
      [
        makeError({
          code: "CONTRACT_SKILL_REVISION_UNSUPPORTED",
          stage: "identity",
          instancePath: "/skill/revision",
          message: `this build provides ${skillId} revision ${catalog.revision}, not ${requestedRevision}. Omit the field to accept the installed revision.`
        })
      ],
      assurance
    );
  }
  const structural = validateStructure(request, skillId);
  if (!structural.ok) return fail(structural.errors, assurance);
  const semanticErrors = runSemanticValidators(request, skillId);
  const blocking = semanticErrors.filter((error) => error.severity === "error");
  if (blocking.length > 0) return fail(semanticErrors, assurance);
  const canonicalRequest = canonicalizeRequest(request, catalog.revision);
  const validated = deepFreeze({
    [VALIDATED]: true,
    skillId,
    skillRevision: catalog.revision,
    canonicalRequest,
    inputAssurance: assurance,
    requestDigest: canonicalDigest(canonicalRequest),
    warnings: semanticErrors.filter((error) => error.severity === "warning"),
    // This artifact field is the ordered set of registry rule identifiers, not an
    // invocation log. A contract may invoke one rule more than once with different
    // parameters (for example, validating both x and y domains). The validator still
    // executes every catalog entry above; summarize repeated rule kinds once so the
    // public `checkedRuleIds` set remains truthful and schema-valid.
    checkedValidatorIds: [
      ...new Set(catalog.semanticValidators.map((validator) => validator.id))
    ]
  });
  VALIDATED_REQUESTS.add(validated);
  return { ok: true, request: validated };
}
function parseAndValidateRequest(text, options = {}) {
  const host = resolveBudgetProfile(options);
  let assurance = assuranceFor("raw_json_text", host.profile);
  if (!host.limits) return invalidBudgetProfile(assurance);
  if (typeof text !== "string") {
    return fail(
      [
        makeError({
          code: "JSON_SYNTAX",
          stage: "parse",
          message: "the raw request boundary accepts a JSON text string only."
        })
      ],
      assurance
    );
  }
  let parsed = parseJsonStrict(text, { limits: host.limits });
  if (!parsed.ok) return fail(parsed.errors, assurance);
  const requested = requestedBudgetProfile(parsed.value);
  const effective = trySelectTighterBudgetProfile(host.profile, requested);
  assurance = assuranceFor("raw_json_text", effective?.profile ?? requested);
  if (!effective) return invalidBudgetProfile(assurance);
  if (effective.profile !== host.profile) {
    parsed = parseJsonStrict(text, { limits: effective.limits });
    if (!parsed.ok) return fail(parsed.errors, assurance);
  }
  return validateSnapshot(parsed.value, assurance);
}
function validateRequestValue(value, options = {}) {
  const host = resolveBudgetProfile(options);
  let assurance = assuranceFor("materialized_value", host.profile);
  if (!host.limits) return invalidBudgetProfile(assurance);
  let snapshot = snapshotValue(value, host.limits);
  if (!snapshot.ok) return fail(snapshot.errors, assurance);
  const requested = requestedBudgetProfile(snapshot.value);
  const effective = trySelectTighterBudgetProfile(host.profile, requested);
  assurance = assuranceFor("materialized_value", effective?.profile ?? requested);
  if (!effective) return invalidBudgetProfile(assurance);
  if (effective.profile !== host.profile) {
    snapshot = snapshotValue(value, effective.limits);
    if (!snapshot.ok) return fail(snapshot.errors, assurance);
  }
  return validateSnapshot(snapshot.value, assurance);
}
export {
  isValidatedRequest,
  parseAndValidateRequest,
  validateRequestValue
};
//# sourceMappingURL=request-capability.js.map