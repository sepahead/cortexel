import {
  binary64RelativeDifferenceWithinTolerance,
  compareExactUnitArraySumToDifference,
  compareExactUnitSumToValue,
  conversionReceipt,
  convert,
  divideExactIntegerByConvertedDifference,
  exactBinary64Mean,
  exactBinary64Sum,
  exactRationalToBinary64
} from "./chunk-6TQKFRP5.js";
import {
  canonicalDigest,
  canonicalDigestExcluding,
  finalizeErrors,
  makeError
} from "./chunk-22OHKNZ5.js";

// src/core/structural-validator.ts
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv2020 from "ajv/dist/2020.js";
var HERE = path.dirname(fileURLToPath(import.meta.url));
function findContractRoot() {
  const candidates = [
    // ESM code splitting may place shared validator code directly in dist/ rather
    // than beside the public entry that imports it.
    path.resolve(HERE, "contract"),
    // Installed bundles live at dist/<entry>/index.{js,cjs}; the closest contract
    // directory must win even when a repository checkout also has contract/ above dist.
    path.resolve(HERE, "../contract"),
    // Source development loads this module from src/core/. The deeper adapters bundle
    // also reaches dist/contract through this candidate.
    path.resolve(HERE, "../../contract")
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "manifest.v1.json"))) return candidate;
  }
  throw new Error(
    "cannot locate the Cortexel contract directory; the package is incomplete or was not packed correctly"
  );
}
var CONTRACT_ROOT = findContractRoot();
function loadSchema(relative) {
  return JSON.parse(readFileSync(path.join(CONTRACT_ROOT, relative), "utf8"));
}
var ajv;
var compiled = /* @__PURE__ */ new Map();
function getAjv() {
  if (ajv) return ajv;
  const instance = new Ajv2020({
    strict: true,
    allErrors: true,
    // Every one of these is off on purpose.
    coerceTypes: false,
    // "5" must not become the number 5
    useDefaults: false,
    // a default is materialized in an explicit, recorded stage
    removeAdditional: false,
    // an unknown key must FAIL, not vanish
    allowUnionTypes: true,
    validateFormats: false,
    // no `format` keyword is load-bearing in the contract
    // Two strict checks are switched off. Both are lints that cannot express an
    // exception the contract genuinely needs — so each is re-implemented in
    // scripts/generate-contract.ts, where the exception CAN be stated.
    //
    // `strictRequired` rejects a `required` naming a property not declared in the SAME
    // schema object. That is exactly what a conditional does:
    //
    //   { properties: { scope: {...} },
    //     if:   { properties: { kind: { const: "sampled" } } },
    //     then: { required: ["retainedConnectionCount"] } }
    //
    // The property lives in the enclosing schema; the `then` only says when it becomes
    // mandatory. With this on, the pattern cannot be expressed at all, so several
    // skills would have to drop their conditional requirements — making the contract
    // weaker, not stricter.
    strictRequired: false,
    // `strictTypes` rejects a type-specific keyword used without a `type`. The intent
    // is good — `{maxLength: 5}` applied to a number is silently ignored — but it
    // cannot be satisfied inside a `not`, where adding a type CHANGES THE MEANING:
    //
    //   not: { required: ["x"] }                 rejects any value carrying `x`
    //   not: { type: "object", required: ["x"] } rejects only an OBJECT carrying `x`,
    //                                            and now ACCEPTS a bare string
    //
    // Ajv cannot tell those apart, so satisfying it here would mean silently widening
    // several negative constraints. The generator performs the same check with a `not`
    // exemption instead, which is the version that is actually correct.
    strictTypes: false
  });
  instance.addSchema(loadSchema("schemas/common.v1.schema.json"));
  instance.addSchema(loadSchema("schemas/generated/registry-enums.v1.schema.json"));
  instance.addSchema(loadSchema("schemas/validation-error.v1.schema.json"));
  const skillSchemaDirectory = path.join(CONTRACT_ROOT, "schemas", "skills");
  for (const filename of readdirSync(skillSchemaDirectory).filter((name) => name.endsWith(".request.v1.schema.json")).sort()) {
    instance.addSchema(loadSchema(path.join("schemas", "skills", filename)));
  }
  instance.addSchema(loadSchema("schemas/stable-figure-request-union.v1.schema.json"));
  ajv = instance;
  return instance;
}
function getSkillValidator(skillId) {
  const existing = compiled.get(skillId);
  if (existing) return existing;
  const file = path.join(CONTRACT_ROOT, "schemas", "skills", `${skillId}.request.v1.schema.json`);
  if (!existsSync(file)) return void 0;
  const schema = JSON.parse(readFileSync(file, "utf8"));
  const registered = typeof schema.$id === "string" ? getAjv().getSchema(schema.$id) : void 0;
  if (registered) {
    compiled.set(skillId, registered);
    return registered;
  }
  let validate;
  try {
    validate = getAjv().compile(schema);
  } catch (error) {
    throw new Error(
      `the request schema for "${skillId}" failed to compile: ${error instanceof Error ? error.message : String(error)}
This is a defect in contract/skills/${skillId}.v1.json, not in the request being validated.`,
      { cause: error }
    );
  }
  compiled.set(skillId, validate);
  return validate;
}
function translate(error, skillId) {
  const instancePath = error.instancePath;
  const schemaPath = error.schemaPath;
  switch (error.keyword) {
    case "additionalProperties": {
      const property = String(error.params.additionalProperty);
      return makeError({
        code: "SCHEMA_UNKNOWN_PROPERTY",
        stage: "structural",
        instancePath: `${instancePath}/${property.replace(/~/g, "~0").replace(/\//g, "~1")}`,
        schemaPath,
        skillId,
        message: `"${property}" is not a property this contract defines. Stable schemas are closed, so a mistyped scientific field fails here rather than being silently ignored.`,
        repair: {
          operation: "remove",
          path: `${instancePath}/${property}`,
          reasonCode: "SCHEMA_UNKNOWN_PROPERTY"
        }
      });
    }
    case "required": {
      const property = String(error.params.missingProperty);
      return makeError({
        code: "SCHEMA_REQUIRED_PROPERTY_MISSING",
        stage: "structural",
        instancePath: `${instancePath}/${property.replace(/~/g, "~0").replace(/\//g, "~1")}`,
        schemaPath,
        skillId,
        message: `"${property}" is required. Cortexel does not infer a scientific fact the source did not state.`
      });
    }
    case "type":
      return makeError({
        code: "SCHEMA_TYPE_MISMATCH",
        stage: "structural",
        instancePath,
        schemaPath,
        skillId,
        message: `expected ${String(error.params.type)}. No type coercion is performed.`
      });
    case "enum":
    case "const":
      return makeError({
        code: "SCHEMA_ENUM_MISMATCH",
        stage: "structural",
        instancePath,
        schemaPath,
        skillId,
        message: `the value is outside the closed set this field permits. ${error.message ?? ""}`.trim()
      });
    default:
      return makeError({
        code: "SCHEMA_VALIDATION_FAILED",
        stage: "structural",
        instancePath,
        schemaPath,
        skillId,
        message: error.message ?? "the value failed structural validation"
      });
  }
}
var artifactValidator;
var artifactValidatorCompileError;
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function relationError(instancePath, message) {
  return makeError({
    code: "INTERNAL_INVARIANT_VIOLATED",
    stage: "internal",
    instancePath,
    message: `${message} No output was returned; this is a Cortexel emission defect, not a caller repair target.`
  });
}
function operationDigest(domain, suffix, payload) {
  return canonicalDigest({
    digestDomain: `${domain}/${suffix}`,
    payload
  });
}
function requestWindow(data) {
  const window = asRecord(data.window) ?? {};
  return {
    start: window.start,
    stop: window.stop,
    unit: window.unit,
    finalEdgeInclusive: typeof window.boundary === "string" && window.boundary.endsWith("]")
  };
}
function timeIsInsideWindow(time, window) {
  if (typeof time !== "number" || typeof window.start !== "number" || typeof window.stop !== "number") return false;
  return time >= window.start && time <= window.stop && (time !== window.stop || window.finalEdgeInclusive === true);
}
function sameCanonical(left, right) {
  return canonicalDigest(left) === canonicalDigest(right);
}
function exactConversionReceiptOrNull(value) {
  if (value === null) return true;
  const receipt = asRecord(value);
  if (!receipt || typeof receipt.from !== "string" || typeof receipt.to !== "string" || receipt.from === receipt.to) return false;
  return sameCanonical(
    receipt,
    conversionReceipt(receipt.from, receipt.to)
  );
}
function expectedConversion(from, to) {
  return typeof from === "string" && typeof to === "string" && from !== to ? conversionReceipt(from, to) : null;
}
function expectedUncertaintyConversion(uncertainty, targetUnit) {
  return uncertainty?.kind !== void 0 && uncertainty.kind !== "none" ? expectedConversion(uncertainty.unit, targetUnit) : null;
}
function expectedBatchContext(family, canonicalRequest) {
  const skill = asRecord(canonicalRequest.skill) ?? {};
  const data = asRecord(canonicalRequest.data) ?? {};
  const parameters = asRecord(canonicalRequest.parameters) ?? {};
  const analysisWindow = requestWindow(data);
  if (family === "compartment") {
    const series2 = asArray(data.series).map((candidate) => asRecord(candidate) ?? {});
    const targetValueUnit2 = asRecord(series2[0]?.values)?.unit;
    return {
      globalPayload: {
        skillId: skill.id,
        dataContext: { ...data, series: null },
        parameters,
        analysisWindow,
        targetValueUnit: targetValueUnit2
      },
      carriers: series2.map((entry) => ({
        identity: {
          kind: "compartment_series",
          compartmentId: entry.compartmentId,
          signalId: entry.signalId
        },
        role: "source_series",
        payload: entry,
        views: [{ kind: "display", window: analysisWindow }],
        transforms: {
          time: expectedConversion(
            asRecord(entry.time)?.unit,
            analysisWindow.unit
          ),
          value: expectedConversion(
            asRecord(entry.values)?.unit,
            targetValueUnit2
          ),
          recordedInterval: null,
          initialValue: null,
          uncertainty: expectedUncertaintyConversion(
            asRecord(parameters.uncertainty),
            targetValueUnit2
          ),
          normalization: null,
          renderedLowerBound: null,
          renderedUpperBound: null
        }
      }))
    };
  }
  if (data.mode === "preaggregated") {
    const aggregate2 = asRecord(data.aggregate) ?? {};
    const values = asRecord(aggregate2.values) ?? {};
    return {
      globalPayload: {
        skillId: skill.id,
        dataContext: { ...data, aggregate: null },
        parameters,
        analysisWindow,
        observation: aggregate2.observation,
        targetValueUnit: values.unit
      },
      carriers: [{
        identity: {
          kind: "declared_weight_aggregate",
          groupId: aggregate2.groupId
        },
        role: "declared_aggregate",
        payload: aggregate2,
        views: [{ kind: "display", window: analysisWindow }],
        transforms: {
          time: expectedConversion(
            asRecord(aggregate2.time)?.unit,
            analysisWindow.unit
          ),
          value: null,
          recordedInterval: null,
          initialValue: null,
          uncertainty: expectedUncertaintyConversion(
            asRecord(aggregate2.uncertainty),
            values.unit
          ),
          normalization: null,
          renderedLowerBound: null,
          renderedUpperBound: null
        },
        painted: true
      }]
    };
  }
  const series = asArray(data.series).map((candidate) => asRecord(candidate) ?? {});
  const display = parameters.display;
  const derivedDisplay = display === "aggregate_derived" || display === "aggregate_derived_with_members";
  const membershipIds = new Set(
    asArray(asRecord(data.membership)?.members).map((candidate) => asRecord(candidate)?.edgeId)
  );
  const target = derivedDisplay ? series.find((candidate) => membershipIds.has(candidate.edgeId)) : series[0];
  const targetValueUnit = asRecord(target?.values)?.unit;
  return {
    globalPayload: {
      skillId: skill.id,
      dataContext: { ...data, series: null },
      parameters,
      analysisWindow,
      observation: data.observation,
      targetValueUnit
    },
    carriers: series.map((entry) => {
      const recordedInterval = asRecord(entry.recordedInterval) ?? {};
      const intervalUnit = recordedInterval.unit;
      const intervalStart = intervalUnit === analysisWindow.unit ? Number(recordedInterval.start) : convert(
        Number(recordedInterval.start),
        String(intervalUnit),
        String(analysisWindow.unit)
      );
      const intervalStop = intervalUnit === analysisWindow.unit ? Number(recordedInterval.stop) : convert(
        Number(recordedInterval.stop),
        String(intervalUnit),
        String(analysisWindow.unit)
      );
      const intervalFinalEdgeInclusive = typeof recordedInterval.boundary === "string" && recordedInterval.boundary.endsWith("]");
      const displayStart = Math.max(
        Number(analysisWindow.start),
        intervalStart
      );
      const displayStop = Math.min(
        Number(analysisWindow.stop),
        intervalStop
      );
      const displayFinalEdgeInclusive = (displayStop !== analysisWindow.stop || analysisWindow.finalEdgeInclusive === true) && (displayStop !== intervalStop || intervalFinalEdgeInclusive);
      const referenceRendered = parameters.showReferenceLines === true && (display === "individual" || display === "aggregate_derived_with_members" && membershipIds.has(entry.edgeId));
      const painted = display === "individual" || display === "aggregate_derived_with_members";
      const bounds = asRecord(entry.bounds) ?? {};
      return {
        identity: {
          kind: "weight_member",
          edgeId: entry.edgeId
        },
        role: "source_series",
        payload: entry,
        views: [
          {
            kind: "display",
            window: {
              start: displayStart,
              stop: displayStop,
              unit: analysisWindow.unit,
              finalEdgeInclusive: displayFinalEdgeInclusive
            }
          },
          {
            kind: "state",
            window: {
              start: intervalStart,
              stop: intervalStop,
              unit: analysisWindow.unit,
              finalEdgeInclusive: intervalFinalEdgeInclusive
            }
          }
        ],
        transforms: {
          time: expectedConversion(
            asRecord(entry.time)?.unit,
            analysisWindow.unit
          ),
          value: expectedConversion(
            asRecord(entry.values)?.unit,
            targetValueUnit
          ),
          recordedInterval: expectedConversion(
            recordedInterval.unit,
            analysisWindow.unit
          ),
          initialValue: expectedConversion(
            asRecord(asRecord(entry.initialWeight)?.quantity)?.unit,
            targetValueUnit
          ),
          uncertainty: null,
          normalization: null,
          renderedLowerBound: referenceRendered ? expectedConversion(
            asRecord(bounds.lower)?.unit,
            targetValueUnit
          ) : null,
          renderedUpperBound: referenceRendered ? expectedConversion(
            asRecord(bounds.upper)?.unit,
            targetValueUnit
          ) : null
        },
        painted
      };
    })
  };
}
function validateBatchRelations(operation, operationIndex, family, canonicalRequest) {
  const basePath = `/derivation/operations/${operationIndex}`;
  const errors = [];
  const parameters = asRecord(operation.parameters) ?? {};
  const receipt = asRecord(operation.receipt) ?? {};
  const entries = asArray(receipt.seriesReceipts).map(
    (candidate) => asRecord(candidate) ?? {}
  );
  const domain = String(parameters.digestDomain);
  const expected = expectedBatchContext(family, canonicalRequest);
  if (receipt.seriesCount !== entries.length) {
    errors.push(relationError(
      `${basePath}/receipt/seriesCount`,
      "the preparation-batch series count does not equal the receipt-array length."
    ));
  }
  if (expected && entries.length !== expected.carriers.length) {
    errors.push(relationError(
      `${basePath}/receipt/seriesReceipts`,
      "the preparation-batch receipt cardinality does not equal the canonical request carrier cardinality."
    ));
  }
  if (expected) {
    const expectedGlobalContextDigest = operationDigest(
      domain,
      "global-context",
      expected.globalPayload
    );
    if (receipt.globalContextDigest !== expectedGlobalContextDigest) {
      errors.push(relationError(
        `${basePath}/receipt/globalContextDigest`,
        "the preparation-batch global-context digest does not bind the exact canonical request context."
      ));
    }
  }
  const identityDigests = /* @__PURE__ */ new Set();
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const entryPath = `${basePath}/receipt/seriesReceipts/${index}`;
    if (entry.sourceIndex !== index) {
      errors.push(relationError(
        `${entryPath}/sourceIndex`,
        "preparation-batch source indices are not contiguous canonical-request order."
      ));
    }
    const identityDigest = canonicalDigest(entry.seriesIdentity);
    if (identityDigests.has(identityDigest)) {
      errors.push(relationError(
        `${entryPath}/seriesIdentity`,
        "the preparation batch repeats a structured series identity."
      ));
    }
    identityDigests.add(identityDigest);
    const carrier = expected?.carriers[index];
    if (carrier) {
      if (entry.role !== carrier.role || !sameCanonical(entry.seriesIdentity, carrier.identity)) {
        errors.push(relationError(
          `${entryPath}/seriesIdentity`,
          "the preparation-batch role or structured identity does not match its canonical request carrier."
        ));
      }
      const expectedInputDigest2 = operationDigest(domain, "series-input", {
        globalContextDigest: receipt.globalContextDigest,
        sourceIndex: index,
        seriesIdentity: carrier.identity,
        role: carrier.role,
        inputPayload: carrier.payload
      });
      if (entry.inputDigest !== expectedInputDigest2) {
        errors.push(relationError(
          `${entryPath}/inputDigest`,
          "the series-input digest does not bind the corresponding canonical request carrier."
        ));
      }
    }
    const views = asArray(entry.views).map((candidate) => asRecord(candidate) ?? {});
    const stateView = views.find((view) => view.kind === "state");
    const transforms = asRecord(entry.transforms) ?? {};
    for (const [transformName, transform] of Object.entries(transforms)) {
      if (!exactConversionReceiptOrNull(transform)) {
        errors.push(relationError(
          `${entryPath}/transforms/${transformName}`,
          "the conversion receipt does not equal the registry-derived exact unit conversion."
        ));
      }
    }
    if (carrier && !sameCanonical(transforms, carrier.transforms)) {
      errors.push(relationError(
        `${entryPath}/transforms`,
        "the preparation-batch transform inventory does not exactly match the unit changes implied by its canonical request carrier and presentation role."
      ));
    }
    if (carrier && (views.length !== carrier.views.length || views.some((view, viewIndex) => view.kind !== carrier.views[viewIndex]?.kind || !sameCanonical(view.window, carrier.views[viewIndex]?.window)))) {
      errors.push(relationError(
        `${entryPath}/views`,
        "the preparation-batch view kinds or exact applied windows do not match the canonical request carrier."
      ));
    }
    for (let viewIndex = 0; viewIndex < views.length; viewIndex++) {
      const view = views[viewIndex];
      const viewPath = `${entryPath}/views/${viewIndex}`;
      const input = Number(view.inputSourceCount);
      const retained = Number(view.retainedSourceCount);
      const output = Number(view.outputRowCount);
      const below = Number(view.excludedBelowWindow);
      const above = Number(view.excludedAboveWindow);
      const missing = Number(view.missingRetainedSourceCount);
      const duplicateGroups = Number(view.duplicateGroupCount);
      const window = asRecord(view.window) ?? {};
      if (typeof window.start !== "number" || typeof window.stop !== "number" || !Number.isFinite(window.start) || !Number.isFinite(window.stop) || !(window.stop > window.start)) {
        errors.push(relationError(
          `${viewPath}/window`,
          "the prepared-view window is not a finite strictly increasing interval."
        ));
      }
      if (input !== retained + below + above) {
        errors.push(relationError(
          viewPath,
          "the prepared-view source counts do not conserve input = retained + below-window + above-window."
        ));
      }
      if (output > retained || missing > retained) {
        errors.push(relationError(
          viewPath,
          "the prepared-view output or missing-source count exceeds retained source multiplicity."
        ));
      }
      if (duplicateGroups > Math.floor(input / 2)) {
        errors.push(relationError(
          `${viewPath}/duplicateGroupCount`,
          "the number of duplicate-time groups exceeds the maximum possible for the input multiplicity."
        ));
      }
    }
    for (let witnessIndex = 0; witnessIndex < asArray(entry.contextWitnesses).length; witnessIndex++) {
      const witness = asRecord(asArray(entry.contextWitnesses)[witnessIndex]) ?? {};
      if (!stateView || typeof witness.stateObservationIndex !== "number" || witness.stateObservationIndex >= Number(stateView.outputRowCount)) {
        errors.push(relationError(
          `${entryPath}/contextWitnesses/${witnessIndex}/stateObservationIndex`,
          "the context witness does not address an observation in this entry\u2019s exact state view."
        ));
      }
    }
    if ((entry.initialStatePainted === true || entry.initialStateConsumedByDerivedAggregate === true) && entry.materialization === null) {
      errors.push(relationError(
        `${entryPath}/materialization`,
        "an initial event-held state flag is true without an event materialization receipt."
      ));
    }
    const requestParameters = asRecord(canonicalRequest.parameters) ?? {};
    if (family === "weight" && requestParameters.display === "individual") {
      if (entry.initialStateConsumedByDerivedAggregate !== false) {
        errors.push(relationError(
          `${entryPath}/initialStateConsumedByDerivedAggregate`,
          "an individual-only weight artifact has no derived aggregate that could consume an initial state."
        ));
      }
      for (let witnessIndex = 0; witnessIndex < asArray(entry.contextWitnesses).length; witnessIndex++) {
        const witness = asRecord(asArray(entry.contextWitnesses)[witnessIndex]) ?? {};
        if (witness.consultedByDerivedAggregate !== false) {
          errors.push(relationError(
            `${entryPath}/contextWitnesses/${witnessIndex}/consultedByDerivedAggregate`,
            "an individual-only weight artifact has no derived aggregate that could consult a context witness."
          ));
        }
      }
    }
    const requestData = asRecord(canonicalRequest.data) ?? {};
    const requestObservation = requestData.mode === "preaggregated" ? asRecord(asRecord(requestData.aggregate)?.observation) : asRecord(requestData.observation);
    if (family === "weight" && requestObservation?.kind === "event_updated" && entry.materialization === null) {
      errors.push(relationError(
        `${entryPath}/materialization`,
        "an event-updated weight carrier must bind its full and displayed run materializations."
      ));
    }
    if (family === "weight" && requestObservation?.kind !== "event_updated") {
      if (asArray(entry.contextWitnesses).length !== 0 || entry.materialization !== null || entry.initialStatePainted !== false || entry.initialStateConsumedByDerivedAggregate !== false) {
        errors.push(relationError(
          entryPath,
          "a non-event weight carrier cannot have event-held-state witnesses, materialization, or initial-state consumption flags."
        ));
      }
    }
    if (family === "weight" && carrier?.painted === false) {
      if (entry.initialStatePainted !== false) {
        errors.push(relationError(
          `${entryPath}/initialStatePainted`,
          "an unpainted raw member cannot claim that its declared initial state was painted."
        ));
      }
      if (asArray(entry.contextWitnesses).some((candidate) => asRecord(candidate)?.consultedByDerivedAggregate !== true)) {
        errors.push(relationError(
          `${entryPath}/contextWitnesses`,
          "an unpainted raw member may retain only context witnesses actually consulted by the derived aggregate."
        ));
      }
      const materialization = asRecord(entry.materialization);
      const expectedNullDisplayDigest = operationDigest(
        domain,
        "materialization-displayed",
        {
          sourceIndex: index,
          seriesIdentity: entry.seriesIdentity,
          materialization: null
        }
      );
      if (materialization && materialization.displayedOutputDigest !== expectedNullDisplayDigest) {
        errors.push(relationError(
          `${entryPath}/materialization/displayedOutputDigest`,
          "an unpainted raw member must bind the canonical null displayed-materialization preimage."
        ));
      }
    }
    if (family === "weight" && requestObservation?.kind === "event_updated") {
      const requiredRole = requestObservation.updateSemantics === "value_before_update" ? "look_ahead" : "carry_in";
      if (asArray(entry.contextWitnesses).some((candidate) => asRecord(candidate)?.role !== requiredRole)) {
        errors.push(relationError(
          `${entryPath}/contextWitnesses`,
          `event update semantics permit only ${requiredRole} context witnesses.`
        ));
      }
    }
  }
  const expectedInputDigest = operationDigest(domain, "operation-input", {
    globalContextDigest: receipt.globalContextDigest,
    seriesInputDigests: entries.map((entry) => entry.inputDigest)
  });
  if (operation.inputDigest !== expectedInputDigest) {
    errors.push(relationError(
      `${basePath}/inputDigest`,
      "the preparation-batch operation input digest does not bind its ordered series-input digests."
    ));
  }
  const expectedOutputDigest = operationDigest(
    domain,
    "operation-output",
    receipt
  );
  if (operation.outputDigest !== expectedOutputDigest) {
    errors.push(relationError(
      `${basePath}/outputDigest`,
      "the preparation-batch operation output digest does not bind its complete receipt."
    ));
  }
  return errors;
}
function validateWeightAggregateRelations(operation, operationIndex, precedingBatch, canonicalRequest) {
  const basePath = `/derivation/operations/${operationIndex}`;
  const errors = [];
  const parameters = asRecord(operation.parameters) ?? {};
  const receipt = asRecord(operation.receipt) ?? {};
  const requestParameters = asRecord(canonicalRequest.parameters) ?? {};
  const requestAggregate = asRecord(requestParameters.aggregate) ?? {};
  const data = asRecord(canonicalRequest.data) ?? {};
  const membership = asRecord(data.membership) ?? {};
  const series = asArray(data.series).map((candidate) => asRecord(candidate) ?? {});
  const membershipIds = new Set(
    asArray(membership.members).map((candidate) => asRecord(candidate)?.edgeId)
  );
  const selectedSeries = series.filter((candidate) => membershipIds.has(candidate.edgeId));
  const selectedIds = selectedSeries.map((candidate) => candidate.edgeId);
  const preparationReceipt = asRecord(precedingBatch.receipt) ?? {};
  const preparationEntries = asArray(preparationReceipt.seriesReceipts).map(
    (candidate) => asRecord(candidate) ?? {}
  );
  const selectedPreparationEntries = preparationEntries.filter((entry) => membershipIds.has(asRecord(entry.seriesIdentity)?.edgeId));
  const selectedDisplayRowCounts = selectedPreparationEntries.map((entry) => {
    const displayView = asArray(entry.views).map((candidate) => asRecord(candidate) ?? {}).find((view) => view.kind === "display");
    return Number(displayView?.outputRowCount);
  });
  const analysisWindow = requestWindow(data);
  const targetValueUnit = asRecord(selectedSeries[0]?.values)?.unit;
  const expectedScientificParameters = {
    method: requestAggregate.method,
    evaluation: requestAggregate.evaluation,
    dispersion: requestAggregate.dispersion,
    membershipUnit: membership.unit,
    observation: data.observation,
    analysisWindow,
    weightComparability: requestParameters.weightComparability,
    targetValueUnit
  };
  const actualScientificParameters = {
    method: parameters.method,
    evaluation: parameters.evaluation,
    dispersion: parameters.dispersion,
    membershipUnit: parameters.membershipUnit,
    observation: parameters.observation,
    analysisWindow: parameters.analysisWindow,
    weightComparability: parameters.weightComparability,
    targetValueUnit: parameters.targetValueUnit
  };
  if (!sameCanonical(actualScientificParameters, expectedScientificParameters)) {
    errors.push(relationError(
      `${basePath}/parameters`,
      "the weight aggregate parameters do not equal the scientific controls in the canonical request."
    ));
  }
  if (!sameCanonical(receipt.selectedMemberIds, selectedIds)) {
    errors.push(relationError(
      `${basePath}/receipt/selectedMemberIds`,
      "the weight aggregate selected-member order does not equal canonical edge-series order filtered by declared membership."
    ));
  }
  const expectedScientificInputDigest = canonicalDigest({
    membership,
    members: selectedSeries,
    observation: data.observation,
    analysisWindow,
    weightComparability: requestParameters.weightComparability,
    targetValueUnit
  });
  if (receipt.scientificInputDigest !== expectedScientificInputDigest) {
    errors.push(relationError(
      `${basePath}/receipt/scientificInputDigest`,
      "the weight aggregate scientific-input digest does not bind the selected canonical request carriers."
    ));
  }
  const expectedMembershipConversion = membership.unit === analysisWindow.unit ? null : conversionReceipt(String(membership.unit), String(analysisWindow.unit));
  const evaluation = asRecord(requestAggregate.evaluation) ?? {};
  const evaluationTimes = asRecord(evaluation.times);
  const expectedEvaluationConversion = evaluation.mode === "hold_last_observed_at_declared_times" && evaluationTimes?.unit !== analysisWindow.unit ? conversionReceipt(
    String(evaluationTimes?.unit),
    String(analysisWindow.unit)
  ) : null;
  if (!sameCanonical(
    receipt.membershipTimeConversion,
    expectedMembershipConversion
  ) || !sameCanonical(
    receipt.evaluationTimeConversion,
    expectedEvaluationConversion
  )) {
    errors.push(relationError(
      `${basePath}/receipt/membershipTimeConversion`,
      "the aggregate time-conversion receipts do not equal the exact conversions required by the canonical request."
    ));
  }
  const output = asRecord(receipt.output) ?? {};
  const outputEvaluationTimes = asArray(output.evaluationTimes);
  const aggregateValues2 = asArray(output.aggregateValues);
  const memberCounts = asArray(output.memberCounts);
  const contributingCounts = asArray(output.contributingCounts);
  const evaluationCount = Number(receipt.evaluationCount);
  const dispersion = asRecord(parameters.dispersion);
  if (outputEvaluationTimes.length !== evaluationCount || aggregateValues2.length !== evaluationCount || memberCounts.length !== evaluationCount || contributingCounts.length !== evaluationCount) {
    errors.push(relationError(
      `${basePath}/receipt/output`,
      "the weight aggregate evaluation count does not equal every exact output-array length."
    ));
  }
  if (outputEvaluationTimes.some((candidate, index) => index > 0 && typeof candidate === "number" && typeof outputEvaluationTimes[index - 1] === "number" && candidate <= outputEvaluationTimes[index - 1])) {
    errors.push(relationError(
      `${basePath}/receipt/output/evaluationTimes`,
      "the weight aggregate evaluation axis is not strictly increasing."
    ));
  }
  if (outputEvaluationTimes.some((time) => !timeIsInsideWindow(time, analysisWindow))) {
    errors.push(relationError(
      `${basePath}/receipt/output/evaluationTimes`,
      "a weight aggregate evaluation time lies outside the declared analysis window."
    ));
  }
  if (evaluation.mode === "hold_last_observed_at_union_times") {
    if (outputEvaluationTimes[0] !== analysisWindow.start || analysisWindow.finalEdgeInclusive === true && outputEvaluationTimes.at(-1) !== analysisWindow.stop) {
      errors.push(relationError(
        `${basePath}/receipt/output/evaluationTimes`,
        "the union grid must include the analysis-window start and, for a closed window, its stop."
      ));
    }
    const maximumPreparedRowCount = selectedDisplayRowCounts.length === 0 ? 0 : Math.max(...selectedDisplayRowCounts);
    if (evaluationCount < maximumPreparedRowCount) {
      errors.push(relationError(
        `${basePath}/receipt/evaluationCount`,
        "a union grid cannot contain fewer distinct evaluation times than any selected duplicate-free display view."
      ));
    }
  }
  if (evaluation.mode === "shared_sample_grid" && selectedDisplayRowCounts.some((count) => count !== evaluationCount)) {
    errors.push(relationError(
      `${basePath}/receipt/evaluationCount`,
      "a shared-sample grid must have exactly the same row count as every selected display view."
    ));
  }
  if (evaluation.mode === "hold_last_observed_at_declared_times") {
    const declaredValues = asArray(evaluationTimes?.values);
    const declaredUnit = String(evaluationTimes?.unit);
    const expectedEvaluationTimes = declaredValues.map((candidate) => declaredUnit === analysisWindow.unit ? candidate : convert(
      Number(candidate),
      declaredUnit,
      String(analysisWindow.unit)
    ));
    if (!sameCanonical(outputEvaluationTimes, expectedEvaluationTimes)) {
      errors.push(relationError(
        `${basePath}/receipt/output/evaluationTimes`,
        "the aggregate evaluation axis does not exactly equal the caller-declared grid after one registered-unit conversion into the analysis-window unit."
      ));
    }
  }
  const expectedMemberCounts = outputEvaluationTimes.map(() => 0);
  for (const candidate of asArray(membership.members)) {
    const member = asRecord(candidate) ?? {};
    const intervals = asArray(member.intervals).map((rawInterval) => {
      const interval = asRecord(rawInterval) ?? {};
      const start = Number(interval.start);
      const stop = Number(interval.stop);
      return membership.unit === analysisWindow.unit ? { start, stop } : {
        start: convert(
          start,
          String(membership.unit),
          String(analysisWindow.unit)
        ),
        stop: convert(
          stop,
          String(membership.unit),
          String(analysisWindow.unit)
        )
      };
    });
    let intervalIndex = 0;
    for (let timeIndex = 0; timeIndex < outputEvaluationTimes.length; timeIndex++) {
      const time = Number(outputEvaluationTimes[timeIndex]);
      while (intervalIndex < intervals.length && time >= intervals[intervalIndex].stop) intervalIndex++;
      const interval = intervals[intervalIndex];
      if (interval && time >= interval.start && time < interval.stop) {
        expectedMemberCounts[timeIndex]++;
      }
    }
  }
  if (!sameCanonical(memberCounts, expectedMemberCounts)) {
    errors.push(relationError(
      `${basePath}/receipt/output/memberCounts`,
      "the weight aggregate member counts do not equal the declared half-open membership intervals at each evaluation time."
    ));
  }
  for (let index = 0; index < evaluationCount; index++) {
    const members = Number(memberCounts[index]);
    const contributors = Number(contributingCounts[index]);
    if (contributors > members || members > selectedIds.length || contributors === 0 !== (aggregateValues2[index] === null)) {
      errors.push(relationError(
        `${basePath}/receipt/output/contributingCounts/${index}`,
        "the weight aggregate member/contributor counts or zero-contributor null result are inconsistent."
      ));
      break;
    }
  }
  const uncertainty = asRecord(output.uncertainty) ?? {};
  const expectedDispersionKind = dispersion?.kind;
  if (uncertainty.kind !== expectedDispersionKind || uncertainty.kind === "none" && uncertainty.reason !== dispersion?.reason || uncertainty.kind !== "none" && uncertainty.unit !== targetValueUnit || uncertainty.kind === "quantile_interval" && (uncertainty.lowerQuantile !== dispersion?.lowerQuantile || uncertainty.upperQuantile !== dispersion?.upperQuantile || uncertainty.method !== "empirical_type_7_linear")) {
    errors.push(relationError(
      `${basePath}/receipt/output/uncertainty`,
      "the weight aggregate uncertainty carrier does not match the requested dispersion and output unit."
    ));
  }
  const checkSpreadArrays = (lowerOrValue, upper, sampleCounts, minimumContributors) => {
    if (lowerOrValue.length !== evaluationCount || upper !== void 0 && upper.length !== evaluationCount || sampleCounts.length !== evaluationCount) {
      errors.push(relationError(
        `${basePath}/receipt/output/uncertainty`,
        "the descriptive-spread arrays do not align with the aggregate evaluation axis."
      ));
      return;
    }
    for (let index = 0; index < evaluationCount; index++) {
      const contributors = Number(contributingCounts[index]);
      const expectedMissing = contributors < minimumContributors;
      const lowerMissing = lowerOrValue[index] === null;
      const upperMissing = upper === void 0 ? lowerMissing : upper[index] === null;
      const count = sampleCounts[index];
      const lowerValue = lowerOrValue[index];
      const upperValue = upper?.[index];
      if (lowerMissing !== expectedMissing || upperMissing !== expectedMissing || (expectedMissing ? count !== null : count !== contributors) || !expectedMissing && upper !== void 0 && typeof lowerValue === "number" && typeof upperValue === "number" && lowerValue > upperValue || !expectedMissing && uncertainty.kind === "standard_deviation" && typeof lowerValue === "number" && lowerValue < 0) {
        errors.push(relationError(
          `${basePath}/receipt/output/uncertainty`,
          "the descriptive-spread nullability, sample count, or bound order is inconsistent with contributor counts."
        ));
        return;
      }
    }
  };
  if (uncertainty.kind === "standard_deviation") {
    checkSpreadArrays(
      asArray(uncertainty.values),
      void 0,
      asArray(uncertainty.sampleCount),
      2
    );
  } else if (uncertainty.kind === "quantile_interval" || uncertainty.kind === "ensemble_range") {
    checkSpreadArrays(
      asArray(uncertainty.lower),
      asArray(uncertainty.upper),
      asArray(uncertainty.sampleCount),
      1
    );
  }
  if (uncertainty.kind === "ensemble_range" || uncertainty.kind === "quantile_interval") {
    const lower = asArray(uncertainty.lower);
    const upper = asArray(uncertainty.upper);
    for (let index = 0; index < evaluationCount; index++) {
      const contributors = Number(contributingCounts[index]);
      const aggregateValue = aggregateValues2[index];
      const lowerValue = lower[index];
      const upperValue = upper[index];
      if (contributors < 1 || typeof aggregateValue !== "number" || typeof lowerValue !== "number" || typeof upperValue !== "number") continue;
      let inconsistent = false;
      if (uncertainty.kind === "ensemble_range") {
        inconsistent = aggregateValue < lowerValue || aggregateValue > upperValue || contributors === 1 && (aggregateValue !== lowerValue || aggregateValue !== upperValue) || parameters.method === "min" && aggregateValue !== lowerValue || parameters.method === "max" && aggregateValue !== upperValue;
      } else {
        const lowerQuantile = Number(uncertainty.lowerQuantile);
        const upperQuantile = Number(uncertainty.upperQuantile);
        inconsistent = contributors === 1 && (aggregateValue !== lowerValue || aggregateValue !== upperValue) || parameters.method === "min" && aggregateValue > lowerValue || parameters.method === "max" && aggregateValue < upperValue || parameters.method === "median" && lowerQuantile <= 0.5 && upperQuantile >= 0.5 && (aggregateValue < lowerValue || aggregateValue > upperValue) || parameters.method === "median" && lowerQuantile === 0.5 && aggregateValue !== lowerValue || parameters.method === "median" && upperQuantile === 0.5 && aggregateValue !== upperValue || parameters.method === "min" && lowerQuantile === 0 && aggregateValue !== lowerValue || parameters.method === "max" && upperQuantile === 1 && aggregateValue !== upperValue;
      }
      if (inconsistent) {
        errors.push(relationError(
          `${basePath}/receipt/output/uncertainty`,
          "the aggregate center and descriptive interval violate a method-, quantile-, range-, or one-contributor identity."
        ));
        break;
      }
    }
  }
  if (receipt.scientificOutputDigest !== canonicalDigest(output)) {
    errors.push(relationError(
      `${basePath}/receipt/scientificOutputDigest`,
      "the weight aggregate scientific-output digest does not bind its exact bounded output carrier."
    ));
  }
  const outputUnits = asRecord(receipt.outputUnits) ?? {};
  if (outputUnits.timeUnit !== analysisWindow.unit || outputUnits.valueUnit !== targetValueUnit) {
    errors.push(relationError(
      `${basePath}/receipt/outputUnits`,
      "the weight aggregate output units do not match its analysis window and selected value carrier."
    ));
  }
  const expectedInitialStateContributorIds = preparationEntries.filter((entry) => entry.initialStateConsumedByDerivedAggregate === true).map((entry) => asRecord(entry.seriesIdentity)?.edgeId);
  if (!sameCanonical(
    receipt.initialStateContributorIds,
    expectedInitialStateContributorIds
  )) {
    errors.push(relationError(
      `${basePath}/receipt/initialStateContributorIds`,
      "the initial-state contributor list does not exactly equal the canonical batch entries marked as consumed by the derived aggregate."
    ));
  }
  const expectedStateWitnessProjection = preparationEntries.flatMap((entry) => asArray(entry.contextWitnesses).map((candidate) => asRecord(candidate) ?? {}).filter((witness) => witness.consultedByDerivedAggregate === true).map((witness) => ({
    seriesIdentity: entry.seriesIdentity,
    role: witness.role,
    stateObservationIndex: witness.stateObservationIndex,
    observationDigest: witness.observationDigest
  })));
  const expectedStateWitnessDigest = canonicalDigest({
    digestDomain: "cortexel.weight_trace.aggregate_members/v4/state-witnesses",
    payload: expectedStateWitnessProjection
  });
  if (receipt.stateWitnessDigest !== expectedStateWitnessDigest) {
    errors.push(relationError(
      `${basePath}/receipt/stateWitnessDigest`,
      "the aggregate state-witness digest does not bind the normalized consulted-witness projection in the preceding preparation batch."
    ));
  }
  if (dispersion?.kind === "quantile_interval" && !(typeof dispersion.lowerQuantile === "number" && typeof dispersion.upperQuantile === "number" && dispersion.lowerQuantile < dispersion.upperQuantile)) {
    errors.push(relationError(
      `${basePath}/parameters/dispersion`,
      "the aggregate quantile interval is not strictly ordered."
    ));
  }
  errors.push(...validateAggregateChainAndWrapper(
    operation,
    operationIndex,
    precedingBatch
  ));
  return errors;
}
function validateCompartmentAggregateRelations(operation, operationIndex, precedingBatch, canonicalRequest) {
  const basePath = `/derivation/operations/${operationIndex}`;
  const errors = [];
  const parameters = asRecord(operation.parameters) ?? {};
  const receipt = asRecord(operation.receipt) ?? {};
  const requestParameters = asRecord(canonicalRequest.parameters) ?? {};
  const requestAggregate = asRecord(requestParameters.compartmentAggregate) ?? {};
  const data = asRecord(canonicalRequest.data) ?? {};
  const selectedIds = asArray(requestAggregate.compartmentIds);
  const series = asArray(data.series).map((candidate) => asRecord(candidate) ?? {});
  const selectedSeries = selectedIds.map(
    (compartmentId) => series.find((candidate) => candidate.compartmentId === compartmentId)
  );
  const selectedSeriesCounts = selectedIds.map(
    (compartmentId) => series.filter((candidate) => candidate.compartmentId === compartmentId).length
  );
  const preparationEntries = asArray(
    asRecord(precedingBatch.receipt)?.seriesReceipts
  ).map((candidate) => asRecord(candidate) ?? {});
  const selectedIdSet = new Set(selectedIds);
  const selectedDisplayRowCounts = preparationEntries.filter((entry) => selectedIdSet.has(asRecord(entry.seriesIdentity)?.compartmentId)).map((entry) => {
    const displayView = asArray(entry.views).map((candidate) => asRecord(candidate) ?? {}).find((view) => view.kind === "display");
    return Number(displayView?.outputRowCount);
  });
  const weights = requestAggregate.weighting === "declared" ? requestAggregate.weights : selectedIds.map(() => 1);
  const expectedScientificParameters = {
    selectedCompartmentIds: selectedIds,
    method: requestAggregate.method,
    weighting: requestAggregate.weighting,
    weights,
    binary64Arithmetic: "exact_products_and_cancellation_then_one_final_round",
    alignment: "exact_accepted_time_only",
    duplicateReplicateAlignment: "undefined_yields_missing",
    ...requestAggregate.weightBasis !== void 0 ? { weightBasis: requestAggregate.weightBasis } : {}
  };
  const actualScientificParameters = {
    selectedCompartmentIds: parameters.selectedCompartmentIds,
    method: parameters.method,
    weighting: parameters.weighting,
    weights: parameters.weights,
    binary64Arithmetic: parameters.binary64Arithmetic,
    alignment: parameters.alignment,
    duplicateReplicateAlignment: parameters.duplicateReplicateAlignment,
    ...parameters.weightBasis !== void 0 ? { weightBasis: parameters.weightBasis } : {}
  };
  if (!sameCanonical(actualScientificParameters, expectedScientificParameters)) {
    errors.push(relationError(
      `${basePath}/parameters`,
      "the compartment aggregate parameters do not equal the explicit canonical-request selection and weighting controls."
    ));
  }
  if (selectedSeries.some((candidate) => candidate === void 0) || selectedSeriesCounts.some((count) => count !== 1) || receipt.scientificInputDigest !== canonicalDigest(selectedSeries)) {
    errors.push(relationError(
      `${basePath}/receipt/scientificInputDigest`,
      "the compartment aggregate scientific-input digest does not bind the explicitly selected canonical series."
    ));
  }
  if (receipt.selectedCompartmentCount !== selectedIds.length) {
    errors.push(relationError(
      `${basePath}/receipt/selectedCompartmentCount`,
      "the selected compartment count does not equal the explicit selection length."
    ));
  }
  const output = asRecord(receipt.output) ?? {};
  const outputTime = asRecord(output.time) ?? {};
  const outputValue = asRecord(output.value) ?? {};
  const times = asArray(outputTime.values);
  const values = asArray(outputValue.values);
  const expectedTimeUnit = requestWindow(data).unit;
  const expectedValueUnit = asRecord(series[0]?.values)?.unit;
  if (outputTime.unit !== expectedTimeUnit || outputValue.unit !== expectedValueUnit) {
    errors.push(relationError(
      `${basePath}/receipt/output`,
      "the compartment aggregate output axes do not use the canonical request time unit and selected value unit."
    ));
  }
  if (receipt.evaluationCount !== times.length || times.length !== values.length) {
    errors.push(relationError(
      `${basePath}/receipt/evaluationCount`,
      "the compartment aggregate evaluation count does not equal both output-array lengths."
    ));
  }
  const selectedPreparedRowSum = selectedDisplayRowCounts.reduce(
    (sum, count) => sum + count,
    0
  );
  if (times.length > selectedPreparedRowSum || selectedPreparedRowSum === 0 !== (times.length === 0)) {
    errors.push(relationError(
      `${basePath}/receipt/evaluationCount`,
      "the compartment union axis must be empty exactly when every selected prepared view is empty and cannot exceed their total row count."
    ));
  }
  if (receipt.missingBecauseAbsentOrAmbiguousCount !== values.filter((candidate) => candidate === null).length) {
    errors.push(relationError(
      `${basePath}/receipt/missingBecauseAbsentOrAmbiguousCount`,
      "the compartment aggregate missing count does not equal the null output count."
    ));
  }
  if (times.some((candidate, index) => index > 0 && typeof candidate === "number" && typeof times[index - 1] === "number" && candidate <= times[index - 1])) {
    errors.push(relationError(
      `${basePath}/receipt/output/time/values`,
      "the compartment aggregate evaluation axis is not strictly increasing."
    ));
  }
  const analysisWindow = requestWindow(data);
  if (times.some((time) => !timeIsInsideWindow(time, analysisWindow))) {
    errors.push(relationError(
      `${basePath}/receipt/output/time/values`,
      "a compartment aggregate evaluation time lies outside the declared analysis window."
    ));
  }
  const expectedScientificOutputDigest = canonicalDigest({
    times,
    values,
    unit: outputValue.unit
  });
  if (receipt.scientificOutputDigest !== expectedScientificOutputDigest) {
    errors.push(relationError(
      `${basePath}/receipt/scientificOutputDigest`,
      "the compartment aggregate scientific-output digest does not bind its exact emitted output arrays."
    ));
  }
  const outputUnits = asRecord(receipt.outputUnits) ?? {};
  if (outputUnits.timeUnit !== outputTime.unit || outputUnits.valueUnit !== outputValue.unit) {
    errors.push(relationError(
      `${basePath}/receipt/outputUnits`,
      "the compartment aggregate output-unit receipt does not match its exact output carriers."
    ));
  }
  errors.push(...validateAggregateChainAndWrapper(
    operation,
    operationIndex,
    precedingBatch
  ));
  return errors;
}
function validateAggregateChainAndWrapper(operation, operationIndex, precedingBatch) {
  const basePath = `/derivation/operations/${operationIndex}`;
  const errors = [];
  const parameters = asRecord(operation.parameters) ?? {};
  const receipt = asRecord(operation.receipt) ?? {};
  const batchOutputDigest = precedingBatch.outputDigest;
  if (parameters.preparationBatchOutputDigest !== batchOutputDigest || receipt.preparationBatchOutputDigest !== batchOutputDigest) {
    errors.push(relationError(
      `${basePath}/parameters/preparationBatchOutputDigest`,
      "the aggregate does not repeat the exact immediately preceding preparation-batch output digest in both chain carriers."
    ));
  }
  const domain = String(parameters.digestDomain);
  const expectedInputDigest = operationDigest(domain, "operation-input", {
    preparationBatchOutputDigest: batchOutputDigest,
    scientificInputDigest: receipt.scientificInputDigest
  });
  if (operation.inputDigest !== expectedInputDigest) {
    errors.push(relationError(
      `${basePath}/inputDigest`,
      "the aggregate operation input digest does not bind its preparation batch and scientific input."
    ));
  }
  const expectedOutputDigest = operationDigest(domain, "operation-output", {
    scientificOutputDigest: receipt.scientificOutputDigest,
    outputUnits: receipt.outputUnits
  });
  if (operation.outputDigest !== expectedOutputDigest) {
    errors.push(relationError(
      `${basePath}/outputDigest`,
      "the aggregate operation output digest does not bind its scientific output and output units."
    ));
  }
  return errors;
}
function validateArtifactRelations(artifact) {
  const root = asRecord(artifact) ?? {};
  const canonicalRequest = asRecord(root.canonicalRequest) ?? {};
  const provenance = asRecord(root.provenance) ?? {};
  const derivation = asRecord(root.derivation) ?? {};
  const operations = asArray(derivation.operations).map(
    (candidate) => asRecord(candidate) ?? {}
  );
  const errors = [];
  if (provenance.requestDigest !== canonicalDigest(canonicalRequest)) {
    errors.push(relationError(
      "/provenance/requestDigest",
      "the request digest does not bind the exact canonical request."
    ));
  }
  const operationIds = /* @__PURE__ */ new Set();
  for (let index = 0; index < operations.length; index++) {
    const operation = operations[index];
    const id = operation.id;
    if (typeof id !== "string" || id.trim().length === 0 || operationIds.has(id)) {
      errors.push(relationError(
        `/derivation/operations/${index}/id`,
        "derivation operation ids must be nonblank and globally unique."
      ));
    } else {
      operationIds.add(id);
    }
    if (operation.algorithm === "cortexel.weight_trace.prepare_series_batch") {
      errors.push(...validateBatchRelations(
        operation,
        index,
        "weight",
        canonicalRequest
      ));
    } else if (operation.algorithm === "cortexel.compartment_trace.prepare_series_batch") {
      errors.push(...validateBatchRelations(
        operation,
        index,
        "compartment",
        canonicalRequest
      ));
    } else if (operation.algorithm === "cortexel.weight_trace.aggregate_members") {
      errors.push(...validateWeightAggregateRelations(
        operation,
        index,
        operations[index - 1] ?? {},
        canonicalRequest
      ));
    } else if (operation.algorithm === "cortexel.compartment_trace.aggregate_explicit_selection") {
      errors.push(...validateCompartmentAggregateRelations(
        operation,
        index,
        operations[index - 1] ?? {},
        canonicalRequest
      ));
    }
  }
  if (root.artifactDigest !== canonicalDigestExcluding(root, "artifactDigest")) {
    errors.push(relationError(
      "/artifactDigest",
      "the artifact digest does not bind the complete logical artifact."
    ));
  }
  return errors;
}
function validateArtifactStructure(artifact) {
  if (artifactValidatorCompileError) {
    return {
      ok: false,
      errors: [relationError(
        "",
        `FigureArtifactV1 could not compile: ${artifactValidatorCompileError.message}.`
      )]
    };
  }
  if (!artifactValidator) {
    try {
      artifactValidator = getAjv().compile(
        loadSchema("schemas/figure-artifact.v1.schema.json")
      );
    } catch (error) {
      artifactValidatorCompileError = error instanceof Error ? error : new Error(String(error));
      return {
        ok: false,
        errors: [relationError(
          "",
          `FigureArtifactV1 could not compile: ${artifactValidatorCompileError.message}.`
        )]
      };
    }
  }
  if (artifactValidator(artifact)) {
    try {
      const relationErrors = validateArtifactRelations(artifact);
      return relationErrors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors: finalizeErrors(relationErrors) };
    } catch (error) {
      return {
        ok: false,
        errors: [relationError(
          "",
          `FigureArtifactV1 relation evaluation failed closed: ${error instanceof Error ? error.message : String(error)}.`
        )]
      };
    }
  }
  const errors = (artifactValidator.errors ?? []).map(
    (error) => makeError({
      code: "INTERNAL_INVARIANT_VIOLATED",
      stage: "internal",
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
      message: "the library assembled an artifact that violates FigureArtifactV1. No output was returned; this is an implementation defect, not a caller repair target."
    })
  );
  return { ok: false, errors: finalizeErrors(errors) };
}
function validateStructure(request, skillId) {
  const validate = getSkillValidator(skillId);
  if (!validate) {
    return {
      ok: false,
      errors: [
        makeError({
          code: "SCHEMA_UNKNOWN_SKILL",
          stage: "structural",
          instancePath: "/skill/id",
          message: `"${skillId}" is not a stable catalog id. Read STABLE_SKILL_IDS or run \`cortexel catalog\`.`
        })
      ]
    };
  }
  if (validate(request)) {
    return { ok: true, errors: [] };
  }
  const raw = validate.errors ?? [];
  const errors = raw.filter((error) => error.keyword !== "oneOf" && error.keyword !== "anyOf").map((error) => translate(error, skillId));
  if (errors.length === 0 && raw.length > 0) {
    errors.push(translate(raw[0], skillId));
  }
  return { ok: false, errors };
}

// src/analysis/matrices.ts
var MATRIX_AXIS_ORDER = "target_rows_source_columns";
var MatrixDerivationError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "MatrixDerivationError";
  }
  code;
};
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
function assertUnique(values, label) {
  const seen = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (seen.has(value)) {
      throw new MatrixDerivationError(
        "SEMANTIC_DUPLICATE_ID",
        `${label} contains duplicate id ${JSON.stringify(value)}. Matrix identity cannot be resolved by last-write-wins.`
      );
    }
    seen.add(value);
  }
}
function assertParallelLength(expected, values, label) {
  if (values !== void 0 && values.length !== expected) {
    throw new MatrixDerivationError(
      "SEMANTIC_LENGTH_MISMATCH",
      `${label} has ${values.length} rows but the connection endpoint arrays have ${expected}.`
    );
  }
}
function cellKey(rowIndex, columnIndex) {
  return `${rowIndex}:${columnIndex}`;
}
function canonicalStrings(values) {
  if (values.length === 0) return null;
  return [...new Set(values)].sort(compareUnicodeCodePoints);
}
function aggregate(values, method) {
  if (values.length === 0) {
    throw new MatrixDerivationError(
      "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
      "an aggregate requires at least one finite measurement"
    );
  }
  switch (method) {
    case "sum":
      try {
        return exactBinary64Sum(values);
      } catch (error) {
        throw new MatrixDerivationError(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          error instanceof Error ? error.message : "the exact binary64 sum is not representable"
        );
      }
    case "mean":
      try {
        return exactBinary64Mean(values);
      } catch (error) {
        throw new MatrixDerivationError(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          error instanceof Error ? error.message : "the exact binary64 mean is not representable"
        );
      }
    case "min": {
      let minimum = values[0];
      for (let index = 1; index < values.length; index++) {
        if (values[index] < minimum) minimum = values[index];
      }
      return minimum === 0 ? 0 : minimum;
    }
    case "max": {
      let maximum = values[0];
      for (let index = 1; index < values.length; index++) {
        if (values[index] > maximum) maximum = values[index];
      }
      return maximum === 0 ? 0 : maximum;
    }
    case "no_aggregation":
      if (values.length !== 1) {
        throw new MatrixDerivationError(
          "SCIENCE_AGGREGATION_REQUIRED",
          `no_aggregation requires one connection per cell, but this cell has ${values.length}.`
        );
      }
      return values[0] === 0 ? 0 : values[0];
  }
}
function assertAggregateMatrixScope(input) {
  if (input.scope.kind === "sampled") {
    throw new MatrixDerivationError(
      "SCOPE_INCOMPATIBLE_WITH_SKILL",
      "a sampled connection set cannot establish a weight or delay aggregate for any cell"
    );
  }
  if (input.scope.kind === "mpi_target_rank_local" && input.scope.localTargetUniverseComplete !== true) {
    throw new MatrixDerivationError(
      "SCOPE_INCOMPATIBLE_WITH_SKILL",
      "a rank-local aggregate matrix requires the complete incoming connection set for every owned target"
    );
  }
}
function deriveMatrixTopology(input) {
  if (input.nodeIds.length < 1) {
    throw new MatrixDerivationError(
      "SEMANTIC_UNKNOWN_REFERENCE",
      "a matrix requires a non-empty declared node universe"
    );
  }
  assertUnique(input.nodeIds, "nodeIds");
  if (input.sourceIds.length !== input.targetIds.length) {
    throw new MatrixDerivationError(
      "SEMANTIC_LENGTH_MISMATCH",
      `sourceIds has ${input.sourceIds.length} rows but targetIds has ${input.targetIds.length}.`
    );
  }
  const connectionCount = input.sourceIds.length;
  assertParallelLength(connectionCount, input.edgeIds, "edgeIds");
  assertParallelLength(connectionCount, input.synapseModels, "synapseModels");
  if (input.edgeIds) assertUnique(input.edgeIds, "edgeIds");
  const nodeIndex = new Map(input.nodeIds.map((id, index) => [id, index]));
  let observedTargets;
  if (input.scope.kind === "mpi_target_rank_local") {
    if (!input.observedTargetIds) {
      throw new MatrixDerivationError(
        "SCOPE_INCOMPATIBLE_WITH_SKILL",
        "mpi_target_rank_local requires the exact set of rank-owned observedTargetIds (which may be empty)"
      );
    }
    assertUnique(input.observedTargetIds, "observedTargetIds");
    for (const id of input.observedTargetIds) {
      if (!nodeIndex.has(id)) {
        throw new MatrixDerivationError(
          "SEMANTIC_UNKNOWN_REFERENCE",
          `observed target ${JSON.stringify(id)} is outside the declared node universe`
        );
      }
    }
    observedTargets = new Set(input.observedTargetIds);
  } else {
    if (input.observedTargetIds !== void 0) {
      throw new MatrixDerivationError(
        "SCOPE_MERGE_CONFLICT",
        "observedTargetIds is caller authority only for mpi_target_rank_local; complete and sampled scopes derive observability from their discriminator"
      );
    }
    observedTargets = input.scope.kind === "sampled" ? /* @__PURE__ */ new Set() : new Set(input.nodeIds);
  }
  if (input.scope.kind === "sampled" && input.scope.retainedConnectionCount !== connectionCount) {
    throw new MatrixDerivationError(
      "SCOPE_MERGE_CONFLICT",
      `sampled.retainedConnectionCount is ${input.scope.retainedConnectionCount}, but the request contains ${connectionCount} connection rows`
    );
  }
  if (input.scope.kind === "sampled") {
    const { sourceConnectionCount, retainedConnectionCount } = input.scope;
    if (!Number.isSafeInteger(sourceConnectionCount) || sourceConnectionCount < 0 || !Number.isSafeInteger(retainedConnectionCount) || retainedConnectionCount < 0 || retainedConnectionCount > sourceConnectionCount) {
      throw new MatrixDerivationError(
        "SCOPE_MERGE_CONFLICT",
        `sampled connection counts must be exact non-negative safe integers with retainedConnectionCount <= sourceConnectionCount; got source=${sourceConnectionCount}, retained=${retainedConnectionCount}`
      );
    }
  }
  const contributors = /* @__PURE__ */ new Map();
  for (let ordinal = 0; ordinal < connectionCount; ordinal++) {
    const sourceId = input.sourceIds[ordinal];
    const targetId = input.targetIds[ordinal];
    const rowIndex = nodeIndex.get(targetId);
    const columnIndex = nodeIndex.get(sourceId);
    if (rowIndex === void 0 || columnIndex === void 0) {
      const missing = rowIndex === void 0 ? targetId : sourceId;
      throw new MatrixDerivationError(
        "SEMANTIC_UNKNOWN_REFERENCE",
        `connection row ${ordinal} references endpoint ${JSON.stringify(missing)} outside the declared node universe`
      );
    }
    if (input.scope.kind === "mpi_target_rank_local" && !observedTargets.has(targetId)) {
      throw new MatrixDerivationError(
        "SCOPE_MERGE_CONFLICT",
        `connection row ${ordinal} targets ${JSON.stringify(targetId)}, which is not declared as owned by this MPI rank`
      );
    }
    const key = cellKey(rowIndex, columnIndex);
    const existing = contributors.get(key);
    if (existing) existing.push(ordinal);
    else contributors.set(key, [ordinal]);
  }
  const connectionSetComplete = input.scope.kind !== "sampled" && (input.scope.kind !== "mpi_target_rank_local" || input.scope.localTargetUniverseComplete);
  const makeCell = (rowIndex, columnIndex) => {
    const targetId = input.nodeIds[rowIndex];
    const sourceId = input.nodeIds[columnIndex];
    const ordinals = contributors.get(cellKey(rowIndex, columnIndex)) ?? [];
    const observed = observedTargets.has(targetId) && connectionSetComplete;
    const state = ordinals.length > 0 ? "present" : observed ? "absent" : "not_observed";
    return {
      rowIndex,
      columnIndex,
      targetId,
      sourceId,
      state,
      contributingOrdinals: ordinals,
      retainedConnectionRows: ordinals.length,
      contributingConnectionCount: observed ? ordinals.length : null,
      contributingEdgeIds: input.edgeIds ? [...ordinals.map((ordinal) => input.edgeIds[ordinal])].sort(compareUnicodeCodePoints) : null,
      synapseModels: input.synapseModels ? canonicalStrings(ordinals.map((ordinal) => input.synapseModels[ordinal])) : null,
      isAutapse: targetId === sourceId,
      connectionSetComplete: observed
    };
  };
  const presentCells = [...contributors.keys()].map((key) => key.split(":").map(Number)).sort((left, right) => left[0] - right[0] || left[1] - right[1]).map(([rowIndex, columnIndex]) => makeCell(rowIndex, columnIndex));
  const totalCellCount = input.nodeIds.length * input.nodeIds.length;
  if (!Number.isSafeInteger(totalCellCount)) {
    throw new MatrixDerivationError(
      "RESOURCE_MATRIX_CELLS_EXCEEDED",
      "the declared matrix cell count exceeds the interoperable safe-integer range"
    );
  }
  const presentInObservedRows = presentCells.filter((cell) => observedTargets.has(cell.targetId)).length;
  const observedRowCount = connectionSetComplete ? observedTargets.size : 0;
  const absentCellCount = observedRowCount * input.nodeIds.length - presentInObservedRows;
  const notObservedCellCount = totalCellCount - presentCells.length - absentCellCount;
  const enumeration = input.enumeration ?? "present_cells_only";
  let tableCells = presentCells;
  if (enumeration === "dense") {
    const limit = input.maximumMaterializedCells ?? 500;
    if (!Number.isSafeInteger(limit) || limit < 1 || totalCellCount > limit) {
      throw new MatrixDerivationError(
        "RESOURCE_MATRIX_CELLS_EXCEEDED",
        `dense matrix evidence requires ${totalCellCount} rows, above the materialization limit ${limit}`
      );
    }
    const dense = [];
    for (let rowIndex = 0; rowIndex < input.nodeIds.length; rowIndex++) {
      for (let columnIndex = 0; columnIndex < input.nodeIds.length; columnIndex++) {
        dense.push(makeCell(rowIndex, columnIndex));
      }
    }
    tableCells = dense;
  }
  return {
    axisOrder: MATRIX_AXIS_ORDER,
    nodeIds: [...input.nodeIds],
    presentCells,
    tableCells,
    connectionCount,
    presentCellCount: presentCells.length,
    absentCellCount,
    notObservedCellCount,
    observedRowCount,
    totalCellCount
  };
}
function deriveAdjacencyMatrix(input, cellMode, multapseAggregation) {
  if (input.scope.kind === "mpi_target_rank_local" && input.scope.localTargetUniverseComplete !== true) {
    throw new MatrixDerivationError(
      "SCOPE_INCOMPATIBLE_WITH_SKILL",
      "a rank-local adjacency matrix requires complete incoming connections for every declared owned target"
    );
  }
  if (input.scope.kind === "sampled" && cellMode !== "binary_presence") {
    throw new MatrixDerivationError(
      "SCOPE_INCOMPATIBLE_WITH_SKILL",
      "a sampled connection set can prove binary presence but cannot establish cell multiplicity"
    );
  }
  if (input.scope.kind === "sampled" && multapseAggregation !== "sum") {
    throw new MatrixDerivationError(
      "SCOPE_INCOMPATIBLE_WITH_SKILL",
      "sampled binary presence requires sum over retained rows; an incomplete sample cannot prove the no_aggregation assertion for the full cell"
    );
  }
  const topology = deriveMatrixTopology(input);
  const mapCell = (cell) => {
    const count = cell.contributingOrdinals.length;
    if (multapseAggregation === "no_aggregation" && count > 1) {
      throw new MatrixDerivationError(
        "SCIENCE_AGGREGATION_REQUIRED",
        `no_aggregation is false for target ${JSON.stringify(cell.targetId)}, source ${JSON.stringify(cell.sourceId)}: ${count} rows map to the cell`
      );
    }
    return {
      ...cell,
      cellValue: cell.state === "not_observed" ? null : cellMode === "binary_presence" ? count > 0 ? 1 : 0 : count,
      multiplicity: cell.connectionSetComplete ? count : null
    };
  };
  return {
    ...topology,
    cellMode,
    multapseAggregation,
    presentCells: topology.presentCells.map(mapCell),
    tableCells: topology.tableCells.map(mapCell)
  };
}
function finiteMeasurementsAt(values, ordinals) {
  const finite = [];
  for (const ordinal of ordinals) {
    const value = values[ordinal];
    if (value === null) continue;
    if (!Number.isFinite(value)) {
      throw new MatrixDerivationError(
        "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
        `measurement at connection row ${ordinal} is not finite binary64`
      );
    }
    finite.push(value === 0 ? 0 : value);
  }
  return finite;
}
function deriveWeightMatrix(input, weights, aggregation) {
  assertAggregateMatrixScope(input);
  assertParallelLength(input.sourceIds.length, weights, "weights");
  const topology = deriveMatrixTopology(input);
  const mapCell = (cell) => {
    const finite = finiteMeasurementsAt(weights, cell.contributingOrdinals);
    if (aggregation === "no_aggregation" && cell.contributingOrdinals.length > 1) {
      throw new MatrixDerivationError(
        "SCIENCE_AGGREGATION_REQUIRED",
        `no_aggregation is false for target ${JSON.stringify(cell.targetId)}, source ${JSON.stringify(cell.sourceId)}`
      );
    }
    const missing = cell.state === "not_observed" ? null : cell.contributingOrdinals.length - finite.length;
    const state = cell.state === "absent" ? "absent" : cell.state === "not_observed" ? "not_observed" : finite.length === 0 ? "present_without_value" : finite.length < cell.contributingOrdinals.length ? "present_with_missing_value" : "valued";
    const aggregateValue = state === "valued" ? aggregate(finite, aggregation) : null;
    return {
      ...cell,
      state,
      aggregate: aggregateValue,
      contributingWeightCount: cell.state === "not_observed" ? null : finite.length,
      missingWeightCount: missing,
      weightMin: finite.length > 0 ? aggregate(finite, "min") : null,
      weightMax: finite.length > 0 ? aggregate(finite, "max") : null
    };
  };
  const presentCells = topology.presentCells.map(mapCell);
  return {
    ...topology,
    aggregation,
    presentCells,
    tableCells: topology.tableCells.map(mapCell),
    valuedCellCount: presentCells.filter((cell) => cell.state === "valued").length,
    presentWithMissingValueCellCount: presentCells.filter(
      (cell) => cell.state === "present_with_missing_value"
    ).length,
    presentWithoutValueCellCount: presentCells.filter(
      (cell) => cell.state === "present_without_value"
    ).length
  };
}
function deriveDelayMatrix(input, delays, aggregation, sourceUnit, displayUnit = sourceUnit) {
  assertAggregateMatrixScope(input);
  assertParallelLength(input.sourceIds.length, delays, "delays");
  for (let index = 0; index < delays.length; index++) {
    if (!Number.isFinite(delays[index]) || !(delays[index] > 0)) {
      throw new MatrixDerivationError(
        "SCIENCE_DELAY_NONPOSITIVE",
        `delay at connection row ${index} must be finite and strictly positive`
      );
    }
  }
  const topology = deriveMatrixTopology(input);
  const convertOnce = (value) => {
    if (sourceUnit === displayUnit) return value;
    try {
      return convert(value, sourceUnit, displayUnit);
    } catch (error) {
      throw new MatrixDerivationError(
        "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
        error instanceof Error ? error.message : "delay-unit conversion failed"
      );
    }
  };
  const mapCell = (cell) => {
    const finite = cell.contributingOrdinals.map((ordinal) => delays[ordinal]);
    if (aggregation === "no_aggregation" && finite.length > 1) {
      throw new MatrixDerivationError(
        "SCIENCE_AGGREGATION_REQUIRED",
        `no_aggregation is false for target ${JSON.stringify(cell.targetId)}, source ${JSON.stringify(cell.sourceId)}`
      );
    }
    const hasDelay = cell.state === "present";
    return {
      ...cell,
      delayAggregate: hasDelay ? convertOnce(aggregate(finite, aggregation)) : null,
      delayMin: hasDelay ? convertOnce(aggregate(finite, "min")) : null,
      delayMax: hasDelay ? convertOnce(aggregate(finite, "max")) : null,
      displayUnit,
      unitConversionCount: sourceUnit === displayUnit ? 0 : 1
    };
  };
  return {
    ...topology,
    aggregation,
    sourceUnit,
    displayUnit,
    presentCells: topology.presentCells.map(mapCell),
    tableCells: topology.tableCells.map(mapCell)
  };
}

// src/analysis/distributions.ts
var DistributionDerivationError = class extends Error {
  code;
  path;
  constructor(code, path2, message) {
    super(message);
    this.name = "DistributionDerivationError";
    this.code = code;
    this.path = path2;
  }
};
function fail(code, path2, message) {
  throw new DistributionDerivationError(code, path2, message);
}
function assertFinite(value, path2) {
  if (!Number.isFinite(value)) {
    fail("SCIENCE_NORMALIZATION_UNVERIFIABLE", path2, "a quantitative observation must be finite.");
  }
}
function assertSafeCount(value, path2) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(
      "SCIENCE_COUNT_NOT_INTEGER",
      path2,
      `a count must be an exact non-negative safe integer; got ${String(value)}.`
    );
  }
}
function checkedSafeNumber(value, path2) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail(
      "SCIENCE_COUNT_NOT_INTEGER",
      path2,
      "the exact integer total exceeds Number.MAX_SAFE_INTEGER and cannot be emitted as a JSON number."
    );
  }
  return Number(value);
}
function compareIdentifier(left, right) {
  const leftIterator = left[Symbol.iterator]();
  const rightIterator = right[Symbol.iterator]();
  while (true) {
    const leftNext = leftIterator.next();
    const rightNext = rightIterator.next();
    if (leftNext.done || rightNext.done) {
      if (leftNext.done && rightNext.done) return 0;
      return leftNext.done ? -1 : 1;
    }
    const leftCodePoint = leftNext.value.codePointAt(0);
    const rightCodePoint = rightNext.value.codePointAt(0);
    if (leftCodePoint !== rightCodePoint) return leftCodePoint < rightCodePoint ? -1 : 1;
  }
}
function compositeKey(parts) {
  return parts.map((part) => `${Array.from(part).length}:${part}`).join("");
}
function uniqueIds(values, path2) {
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < values.length; index++) {
    if (seen.has(values[index])) {
      fail(
        "SEMANTIC_DUPLICATE_ID",
        [...path2, index],
        `identifier ${JSON.stringify(values[index])} appears more than once.`
      );
    }
    seen.add(values[index]);
  }
  return values;
}
function assertParallel(expected, actual, path2) {
  if (actual !== expected) {
    fail(
      "SEMANTIC_LENGTH_MISMATCH",
      path2,
      `parallel array has ${actual} entries; expected ${expected}.`
    );
  }
}
function validateBins(bins) {
  if (bins.edgeToleranceUlps !== void 0 && (!Number.isSafeInteger(bins.edgeToleranceUlps) || bins.edgeToleranceUlps < 0 || bins.edgeToleranceUlps > 16)) {
    fail(
      "SCIENCE_BIN_EDGES_INVALID",
      ["bins", "edgeToleranceUlps"],
      "the edge allowance must be an integer from 0 through 16 binary64 ulps."
    );
  }
  if (bins.edges.length < 2) {
    fail("SCIENCE_BIN_EDGES_INVALID", ["bins", "edges"], "at least two bin edges are required.");
  }
  for (let index = 0; index < bins.edges.length; index++) {
    const edge = bins.edges[index];
    if (!Number.isFinite(edge)) {
      fail("SCIENCE_BIN_EDGES_INVALID", ["bins", "edges", index], "bin edges must be finite.");
    }
    if (index > 0 && !(edge > bins.edges[index - 1])) {
      fail(
        "SCIENCE_BIN_EDGES_INVALID",
        ["bins", "edges", index],
        "bin edges must be strictly increasing."
      );
    }
  }
}
function compareObservationToEdge(value, valueUnit, edge, bins) {
  let converted;
  try {
    converted = valueUnit === bins.unit ? value : convert(value, valueUnit, bins.unit);
  } catch (error) {
    fail(
      "SCIENCE_UNIT_DIMENSION_MISMATCH",
      ["valueUnit"],
      error instanceof Error ? error.message : "observation unit is not convertible to the bin unit."
    );
  }
  const toleranceUlps = bins.edgeToleranceUlps ?? 0;
  const tolerance = toleranceUlps * Number.EPSILON * Math.max(
    Number.MIN_VALUE,
    Math.abs(converted),
    Math.abs(edge)
  );
  if (Math.abs(converted - edge) <= tolerance) return 0;
  return converted < edge ? -1 : 1;
}
function exactUnitBinIndex(value, valueUnit, bins) {
  assertFinite(value, ["value"]);
  validateBins(bins);
  const finalIndex = bins.edges.length - 1;
  const againstFirst = compareObservationToEdge(value, valueUnit, bins.edges[0], bins);
  if (againstFirst < 0) return -1;
  const againstLast = compareObservationToEdge(
    value,
    valueUnit,
    bins.edges[finalIndex],
    bins
  );
  if (againstLast > 0) return -1;
  if (againstLast === 0) return bins.finalEdgeInclusive ? finalIndex - 1 : -1;
  let low = 0;
  let high = finalIndex;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    const comparison = compareObservationToEdge(
      value,
      valueUnit,
      bins.edges[middle],
      bins
    );
    if (comparison >= 0) low = middle;
    else high = middle - 1;
  }
  return low;
}
function exactUnitSumBinIndex(terms, bins) {
  validateBins(bins);
  const compare = (edge) => compareExactUnitSumToValue(
    terms,
    { value: edge, unit: bins.unit }
  );
  const finalIndex = bins.edges.length - 1;
  if (compare(bins.edges[0]) < 0) return -1;
  const againstLast = compare(bins.edges[finalIndex]);
  if (againstLast > 0 || againstLast === 0 && !bins.finalEdgeInclusive) return -1;
  if (againstLast === 0) return finalIndex - 1;
  let low = 0;
  let high = finalIndex;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    if (compare(bins.edges[middle]) >= 0) low = middle;
    else high = middle - 1;
  }
  return low;
}
function normalizedValues(counts, edges, unit, normalization, denominator) {
  if (normalization === "count") return [...counts];
  if (denominator < 1) {
    fail(
      "RENDER_NO_DATA",
      ["normalization"],
      `cannot form a ${normalization} histogram from zero in-range observations.`
    );
  }
  return counts.map((count, index) => {
    if (normalization === "probability") {
      return exactRationalToBinary64(BigInt(count), BigInt(denominator), 0);
    }
    return divideExactIntegerByConvertedDifference(
      count,
      denominator,
      edges[index],
      edges[index + 1],
      unit,
      unit
    );
  });
}
function deriveExactGroupedHistogram(input) {
  validateBins(input.bins);
  const groups = [...uniqueIds(input.groupIds, ["groupIds"])].sort(compareIdentifier);
  const groupSet = new Set(groups);
  const countsByGroup = /* @__PURE__ */ new Map();
  const underByGroup = /* @__PURE__ */ new Map();
  const overByGroup = /* @__PURE__ */ new Map();
  const observationsByGroup = /* @__PURE__ */ new Map();
  for (const groupId of groups) {
    countsByGroup.set(groupId, new Array(input.bins.edges.length - 1).fill(0));
    underByGroup.set(groupId, 0);
    overByGroup.set(groupId, 0);
    observationsByGroup.set(groupId, 0);
  }
  for (let ordinal = 0; ordinal < input.observations.length; ordinal++) {
    const observation = input.observations[ordinal];
    if (!groupSet.has(observation.groupId)) {
      fail(
        "SEMANTIC_UNKNOWN_REFERENCE",
        ["observations", ordinal, "groupId"],
        `group ${JSON.stringify(observation.groupId)} is absent from the declared group universe.`
      );
    }
    assertFinite(observation.value, ["observations", ordinal, "value"]);
    observationsByGroup.set(
      observation.groupId,
      (observationsByGroup.get(observation.groupId) ?? 0) + 1
    );
    const index = exactUnitBinIndex(observation.value, input.valueUnit, input.bins);
    if (index >= 0) {
      countsByGroup.get(observation.groupId)[index]++;
      continue;
    }
    const below = compareObservationToEdge(
      observation.value,
      input.valueUnit,
      input.bins.edges[0],
      input.bins
    ) < 0;
    if (below) {
      underByGroup.set(observation.groupId, (underByGroup.get(observation.groupId) ?? 0) + 1);
    } else {
      overByGroup.set(observation.groupId, (overByGroup.get(observation.groupId) ?? 0) + 1);
    }
  }
  const resultGroups = [];
  for (const groupId of groups) {
    const counts = countsByGroup.get(groupId);
    const underRangeCount = underByGroup.get(groupId);
    const overRangeCount = overByGroup.get(groupId);
    const observationCount = observationsByGroup.get(groupId);
    const binnedBig = counts.reduce((total, count) => total + BigInt(count), 0n);
    const classified = binnedBig + BigInt(underRangeCount) + BigInt(overRangeCount);
    if (classified !== BigInt(observationCount)) {
      fail(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        ["groups", groupId],
        "independent histogram classification did not conserve the observation count."
      );
    }
    if (input.outOfRangePolicy === "reject" && (underRangeCount !== 0 || overRangeCount !== 0)) {
      fail(
        "SCIENCE_BIN_EDGES_INVALID",
        ["bins"],
        `group ${JSON.stringify(groupId)} has ${underRangeCount} observations below and ${overRangeCount} above the declared range under reject.`
      );
    }
    const binnedObservationCount = checkedSafeNumber(binnedBig, ["groups", groupId, "counts"]);
    resultGroups.push({
      groupId,
      counts,
      values: normalizedValues(
        counts,
        input.bins.edges,
        input.bins.unit,
        input.normalization,
        binnedObservationCount
      ),
      observationCount,
      binnedObservationCount,
      underRangeCount,
      overRangeCount
    });
  }
  return {
    edges: [...input.bins.edges],
    binUnit: input.bins.unit,
    normalization: input.normalization,
    groups: resultGroups
  };
}
function derivePopulationRateCounts(input) {
  if (!Number.isSafeInteger(input.recordedSenderCount) || input.recordedSenderCount < 1) {
    fail(
      "SCIENCE_DENOMINATOR_INVALID",
      ["recordedSenderCount"],
      "the recorded-sender denominator must be a positive safe integer."
    );
  }
  const histogram = deriveExactGroupedHistogram({
    observations: input.eventTimes.map((value) => ({ groupId: "all", value })),
    groupIds: ["all"],
    valueUnit: input.eventUnit,
    bins: input.bins,
    normalization: "count",
    outOfRangePolicy: "reject"
  }).groups[0];
  const divisor = input.normalization === "mean_rate_per_recorded_sender" ? input.recordedSenderCount : 1;
  const ratesHz = histogram.counts.map(
    (count, index) => divideExactIntegerByConvertedDifference(
      count,
      divisor,
      input.bins.edges[index],
      input.bins.edges[index + 1],
      input.bins.unit,
      "s"
    )
  );
  return {
    counts: histogram.counts,
    ratesHz,
    recordedSenderCount: input.recordedSenderCount,
    sourceEventCount: input.eventTimes.length
  };
}
function trainKey(senderId, trialId) {
  return trialId === void 0 ? compositeKey(["sender", senderId]) : compositeKey(["sender-trial", senderId, trialId]);
}
function declaredTrainKeys(senders, trials, maximum) {
  uniqueIds(senders, ["recordedSenderIds"]);
  if (trials) uniqueIds(trials, ["trialIds"]);
  const count = BigInt(senders.length) * BigInt(trials?.length ?? 1);
  if (count > BigInt(maximum)) {
    fail(
      "RESOURCE_OBSERVATIONS_EXCEEDED",
      ["trialIds"],
      `the declared sender-by-trial train universe contains ${count} trains; maximum ${maximum}.`
    );
  }
  const keys = [];
  if (trials) {
    for (const sender of senders) for (const trial of trials) keys.push(trainKey(sender, trial));
  } else {
    for (const sender of senders) keys.push(trainKey(sender, void 0));
  }
  return keys;
}
function deriveIsiFromEvents(input) {
  assertParallel(input.eventTimes.length, input.eventSenderIds.length, ["eventSenderIds"]);
  if (input.eventTrialIds) {
    assertParallel(input.eventTimes.length, input.eventTrialIds.length, ["eventTrialIds"]);
    if (!input.trialIds) {
      fail(
        "SEMANTIC_UNKNOWN_REFERENCE",
        ["trialIds"],
        "event trial ids require a complete declared trial universe."
      );
    }
  } else if (input.trialIds) {
    fail(
      "SEMANTIC_LENGTH_MISMATCH",
      ["eventTrialIds"],
      "a declared multi-trial universe requires a trial id for every event."
    );
  }
  const keys = declaredTrainKeys(
    input.recordedSenderIds,
    input.trialIds,
    input.maximumTrainCount ?? 2e6
  );
  const keySet = new Set(keys);
  const timesByTrain = new Map(keys.map((key) => [key, []]));
  for (let ordinal = 0; ordinal < input.eventTimes.length; ordinal++) {
    const key = trainKey(input.eventSenderIds[ordinal], input.eventTrialIds?.[ordinal]);
    const train = timesByTrain.get(key);
    if (!train || !keySet.has(key)) {
      fail(
        "SEMANTIC_UNKNOWN_REFERENCE",
        ["eventSenderIds", ordinal],
        "an event references a train outside the declared sender-by-trial universe."
      );
    }
    assertFinite(input.eventTimes[ordinal], ["eventTimes", ordinal]);
    const lowerComparedWithEvent = compareExactUnitSumToValue(
      [{ value: input.window.start, unit: input.window.unit }],
      { value: input.eventTimes[ordinal], unit: input.intervalUnit }
    );
    const upperComparedWithEvent = compareExactUnitSumToValue(
      [{ value: input.window.stop, unit: input.window.unit }],
      { value: input.eventTimes[ordinal], unit: input.intervalUnit }
    );
    if (lowerComparedWithEvent > 0 || upperComparedWithEvent <= 0) {
      fail(
        "SCIENCE_EVENT_OUT_OF_WINDOW",
        ["eventTimes", ordinal],
        "an event lies outside the exact half-open observation window."
      );
    }
    train.push(input.eventTimes[ordinal]);
  }
  const observations = [];
  let trainsWithoutIntervalCount = 0;
  let zeroIntervalCount = 0;
  for (const key of keys) {
    const times = timesByTrain.get(key);
    times.sort((left, right) => left - right);
    if (times.length < 2) trainsWithoutIntervalCount++;
    for (let ordinal = 1; ordinal < times.length; ordinal++) {
      const interval = exactBinary64Sum([times[ordinal], -times[ordinal - 1]]);
      const exactIndex = exactUnitSumBinIndex(
        [
          { value: times[ordinal], unit: input.intervalUnit },
          { value: -times[ordinal - 1], unit: input.intervalUnit }
        ],
        input.bins
      );
      const roundedIndex = exactUnitBinIndex(interval, input.intervalUnit, input.bins);
      if (exactIndex !== roundedIndex) {
        fail(
          "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
          ["eventTimes"],
          "an exact within-train difference rounds across a declared bin boundary."
        );
      }
      if (interval < 0) {
        fail("SCIENCE_NEGATIVE_INTERVAL", ["eventTimes"], "sorting produced a negative interval.");
      }
      if (interval === 0) {
        zeroIntervalCount++;
        if (input.zeroIntervalPolicy === "reject") {
          fail(
            "SCIENCE_ZERO_INTERVAL_POLICY",
            ["zeroIntervalPolicy"],
            "a same-train zero interval is present under the reject policy."
          );
        }
      }
      observations.push({ groupId: "all", value: interval });
    }
  }
  const expectedIntervals = input.eventTimes.length - keys.reduce(
    (singletons, key) => singletons + Math.min(1, timesByTrain.get(key).length),
    0
  );
  if (observations.length !== expectedIntervals) {
    fail(
      "SCIENCE_NORMALIZATION_UNVERIFIABLE",
      ["eventTimes"],
      "the independently derived within-train interval identity did not conserve event counts."
    );
  }
  return {
    histogram: deriveExactGroupedHistogram({
      observations,
      groupIds: ["all"],
      valueUnit: input.intervalUnit,
      bins: input.bins,
      normalization: input.normalization,
      outOfRangePolicy: input.outOfRangePolicy
    }),
    intervalCount: observations.length,
    spikeCount: input.eventTimes.length,
    trainCount: keys.length,
    trainsWithoutIntervalCount,
    zeroIntervalCount
  };
}
function deriveIsiFromIntervals(input) {
  assertParallel(input.intervals.length, input.intervalSenderIds.length, ["intervalSenderIds"]);
  if (input.intervalTrialIds) {
    assertParallel(input.intervals.length, input.intervalTrialIds.length, ["intervalTrialIds"]);
    if (!input.trialIds) {
      fail("SEMANTIC_UNKNOWN_REFERENCE", ["trialIds"], "interval trial ids require a trial universe.");
    }
  } else if (input.trialIds) {
    fail(
      "SEMANTIC_LENGTH_MISMATCH",
      ["intervalTrialIds"],
      "a declared multi-trial universe requires a trial id for every interval."
    );
  }
  const keys = declaredTrainKeys(
    input.recordedSenderIds,
    input.trialIds,
    input.maximumTrainCount ?? 2e6
  );
  if (input.trains.length !== keys.length) {
    fail(
      "SEMANTIC_LENGTH_MISMATCH",
      ["trains"],
      `complete train table has ${input.trains.length} rows; expected ${keys.length}.`
    );
  }
  const expectedKeys = new Set(keys);
  const spikeCountByTrain = /* @__PURE__ */ new Map();
  for (let ordinal = 0; ordinal < input.trains.length; ordinal++) {
    const train = input.trains[ordinal];
    assertSafeCount(train.spikeCount, ["trains", ordinal, "spikeCount"]);
    const key = trainKey(train.senderId, train.trialId);
    if (!expectedKeys.has(key)) {
      fail(
        "SEMANTIC_UNKNOWN_REFERENCE",
        ["trains", ordinal],
        "train row is outside the declared sender-by-trial universe."
      );
    }
    if (spikeCountByTrain.has(key)) {
      fail("SEMANTIC_DUPLICATE_ID", ["trains", ordinal], "train composite identity is duplicated.");
    }
    spikeCountByTrain.set(key, train.spikeCount);
  }
  for (const key of keys) {
    if (!spikeCountByTrain.has(key)) {
      fail("SEMANTIC_UNKNOWN_REFERENCE", ["trains"], `declared train ${JSON.stringify(key)} is missing.`);
    }
  }
  const suppliedIntervalsByTrain = new Map(keys.map((key) => [key, 0]));
  const intervalValuesByTrain = new Map(keys.map((key) => [key, []]));
  const observations = [];
  let zeroIntervalCount = 0;
  for (let ordinal = 0; ordinal < input.intervals.length; ordinal++) {
    const key = trainKey(input.intervalSenderIds[ordinal], input.intervalTrialIds?.[ordinal]);
    if (!suppliedIntervalsByTrain.has(key)) {
      fail(
        "SEMANTIC_UNKNOWN_REFERENCE",
        ["intervalSenderIds", ordinal],
        "interval references a train outside the declared train table."
      );
    }
    const interval = input.intervals[ordinal];
    assertFinite(interval, ["intervals", ordinal]);
    if (interval < 0) {
      fail("SCIENCE_NEGATIVE_INTERVAL", ["intervals", ordinal], "an inter-spike interval cannot be negative.");
    }
    const durationComparedWithInterval = compareExactUnitSumToValue(
      [
        { value: input.window.stop, unit: input.window.unit },
        { value: -input.window.start, unit: input.window.unit }
      ],
      { value: interval, unit: input.intervalUnit }
    );
    if (durationComparedWithInterval < 0) {
      fail(
        "SCIENCE_EVENT_OUT_OF_WINDOW",
        ["intervals", ordinal],
        "an interval exceeds the exact observation-window duration."
      );
    }
    if (interval === 0) {
      zeroIntervalCount++;
      if (input.zeroIntervalPolicy === "reject") {
        fail(
          "SCIENCE_ZERO_INTERVAL_POLICY",
          ["intervals", ordinal],
          "a zero interval is present under the reject policy."
        );
      }
    }
    suppliedIntervalsByTrain.set(key, suppliedIntervalsByTrain.get(key) + 1);
    intervalValuesByTrain.get(key).push(interval);
    observations.push({ groupId: "all", value: interval });
  }
  let expectedTotal = 0n;
  let spikeTotal = 0n;
  let trainsWithoutIntervalCount = 0;
  for (const key of keys) {
    const spikeCount = spikeCountByTrain.get(key);
    const expected = Math.max(spikeCount - 1, 0);
    if (expected === 0) trainsWithoutIntervalCount++;
    if (suppliedIntervalsByTrain.get(key) !== expected) {
      fail(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        ["trains"],
        `train ${JSON.stringify(key)} supplies ${suppliedIntervalsByTrain.get(key)} intervals but ${spikeCount} in-window spikes require exactly ${expected}.`
      );
    }
    const spanComparison = compareExactUnitArraySumToDifference(
      intervalValuesByTrain.get(key),
      input.intervalUnit,
      { value: input.window.start, unit: input.window.unit },
      { value: input.window.stop, unit: input.window.unit }
    );
    if (spanComparison >= 0 && expected > 0) {
      fail(
        "SCIENCE_EVENT_OUT_OF_WINDOW",
        ["intervals"],
        `successive intervals of train ${JSON.stringify(key)} do not fit strictly inside the half-open observation window.`
      );
    }
    expectedTotal += BigInt(expected);
    spikeTotal += BigInt(spikeCount);
  }
  if (expectedTotal !== BigInt(input.intervals.length)) {
    fail(
      "SCIENCE_NORMALIZATION_UNVERIFIABLE",
      ["intervals"],
      "sum(max(spikeCount - 1, 0)) does not equal the supplied interval count."
    );
  }
  return {
    histogram: deriveExactGroupedHistogram({
      observations,
      groupIds: ["all"],
      valueUnit: input.intervalUnit,
      bins: input.bins,
      normalization: input.normalization,
      outOfRangePolicy: input.outOfRangePolicy
    }),
    intervalCount: input.intervals.length,
    spikeCount: checkedSafeNumber(spikeTotal, ["trains", "spikeCount"]),
    trainCount: keys.length,
    trainsWithoutIntervalCount,
    zeroIntervalCount
  };
}
function deriveDegreeDistribution(input) {
  uniqueIds(input.nodeIds, ["nodeIds"]);
  const universe = new Set(input.nodeIds);
  let degrees;
  let countedConnectionCount;
  let countedIncidenceCount;
  let excludedAutapseCount;
  if (input.sourceIds && input.targetIds) {
    const sourceIds = input.sourceIds;
    const targetIds = input.targetIds;
    assertParallel(sourceIds.length, targetIds.length, ["targetIds"]);
    degrees = new Array(input.nodeIds.length).fill(0);
    const index = new Map(input.nodeIds.map((id, ordinal) => [id, ordinal]));
    const neighbours = input.countingPolicy === "count_unique_neighbors" ? input.nodeIds.map(() => /* @__PURE__ */ new Set()) : void 0;
    let countedRows = 0n;
    let excluded = 0n;
    for (let ordinal = 0; ordinal < sourceIds.length; ordinal++) {
      const source = sourceIds[ordinal];
      const target = targetIds[ordinal];
      if (!universe.has(source)) {
        fail("SEMANTIC_UNKNOWN_REFERENCE", ["sourceIds", ordinal], "source is outside node universe.");
      }
      if (!universe.has(target)) {
        fail("SEMANTIC_UNKNOWN_REFERENCE", ["targetIds", ordinal], "target is outside node universe.");
      }
      if (source === target && input.autapsePolicy === "exclude") {
        excluded++;
        continue;
      }
      countedRows++;
      const countedId = input.direction === "in" ? target : source;
      const counterpart = input.direction === "in" ? source : target;
      const nodeIndex = index.get(countedId);
      if (neighbours) neighbours[nodeIndex].add(counterpart);
      else degrees[nodeIndex]++;
    }
    if (neighbours) {
      for (let ordinal = 0; ordinal < degrees.length; ordinal++) {
        degrees[ordinal] = neighbours[ordinal].size;
      }
    }
    countedConnectionCount = checkedSafeNumber(countedRows, ["countedConnectionCount"]);
    excludedAutapseCount = checkedSafeNumber(excluded, ["excludedAutapseCount"]);
    countedIncidenceCount = checkedSafeNumber(
      degrees.reduce((total, degree) => total + BigInt(degree), 0n),
      ["countedIncidenceCount"]
    );
  } else if (input.suppliedNodeIds && input.suppliedDegrees) {
    assertParallel(input.suppliedNodeIds.length, input.suppliedDegrees.length, ["suppliedDegrees"]);
    uniqueIds(input.suppliedNodeIds, ["suppliedNodeIds"]);
    if (input.suppliedNodeIds.length !== input.nodeIds.length) {
      fail(
        "SEMANTIC_LENGTH_MISMATCH",
        ["suppliedNodeIds"],
        "supplied degree rows must cover the complete node universe exactly once."
      );
    }
    const supplied = /* @__PURE__ */ new Map();
    for (let ordinal = 0; ordinal < input.suppliedNodeIds.length; ordinal++) {
      const id = input.suppliedNodeIds[ordinal];
      if (!universe.has(id)) {
        fail("SEMANTIC_UNKNOWN_REFERENCE", ["suppliedNodeIds", ordinal], "node is outside universe.");
      }
      const degree = input.suppliedDegrees[ordinal];
      assertSafeCount(degree, ["suppliedDegrees", ordinal]);
      const maximum = input.autapsePolicy === "exclude" ? Math.max(0, input.nodeIds.length - 1) : input.nodeIds.length;
      if (input.countingPolicy === "count_unique_neighbors" && degree > maximum) {
        fail(
          "SCIENCE_NORMALIZATION_UNVERIFIABLE",
          ["suppliedDegrees", ordinal],
          `unique-neighbour degree ${degree} exceeds the policy maximum ${maximum}.`
        );
      }
      supplied.set(id, degree);
    }
    degrees = input.nodeIds.map((id) => {
      const degree = supplied.get(id);
      if (degree === void 0) {
        fail("SEMANTIC_UNKNOWN_REFERENCE", ["suppliedNodeIds"], `node ${JSON.stringify(id)} is missing.`);
      }
      return degree;
    });
    const incidence = degrees.reduce((total, degree) => total + BigInt(degree), 0n);
    if (input.suppliedCountedConnectionCount === void 0 || input.suppliedCountedIncidenceCount === void 0) {
      fail(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        ["countedIncidenceCount"],
        "supplied degree mode requires both raw counted-connection and policy-incidence totals."
      );
    }
    assertSafeCount(input.suppliedCountedConnectionCount, ["countedConnectionCount"]);
    assertSafeCount(input.suppliedCountedIncidenceCount, ["countedIncidenceCount"]);
    if (incidence !== BigInt(input.suppliedCountedIncidenceCount)) {
      fail(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        ["countedIncidenceCount"],
        `sum(degrees) is ${incidence}, not declared counted incidence ${input.suppliedCountedIncidenceCount}.`
      );
    }
    if (input.countingPolicy === "count_edges" && input.suppliedCountedConnectionCount !== input.suppliedCountedIncidenceCount) {
      fail(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        ["countedConnectionCount"],
        "count_edges requires raw counted connections to equal counted incidence exactly."
      );
    }
    if (input.countingPolicy === "count_unique_neighbors" && input.suppliedCountedIncidenceCount > input.suppliedCountedConnectionCount) {
      fail(
        "SCIENCE_NORMALIZATION_UNVERIFIABLE",
        ["countedIncidenceCount"],
        "unique-neighbour incidence cannot exceed the counted connection rows."
      );
    }
    countedConnectionCount = input.suppliedCountedConnectionCount;
    countedIncidenceCount = input.suppliedCountedIncidenceCount;
    excludedAutapseCount = input.suppliedExcludedAutapseCount ?? 0;
    assertSafeCount(excludedAutapseCount, ["excludedAutapseCount"]);
  } else {
    fail(
      "SEMANTIC_LENGTH_MISMATCH",
      ["data"],
      "degree derivation requires either connection rows or one supplied degree per node."
    );
  }
  const maxDegree = degrees.reduce((maximum, degree) => Math.max(maximum, degree), 0);
  const degreeLow = [];
  const degreeHigh = [];
  const nodeCounts = [];
  if (input.binning.mode === "per_integer_degree") {
    for (let degree = 0; degree <= maxDegree; degree++) {
      degreeLow.push(degree);
      degreeHigh.push(degree);
      nodeCounts.push(0);
    }
  } else {
    if (!Number.isSafeInteger(input.binning.width) || input.binning.width < 2) {
      fail("SCIENCE_BIN_EDGES_INVALID", ["binning", "width"], "integer bin width must be at least 2.");
    }
    const binCount = Math.floor(maxDegree / input.binning.width) + 1;
    for (let ordinal = 0; ordinal < binCount; ordinal++) {
      degreeLow.push(ordinal * input.binning.width);
      degreeHigh.push((ordinal + 1) * input.binning.width - 1);
      nodeCounts.push(0);
    }
  }
  for (const degree of degrees) {
    const ordinal = input.binning.mode === "per_integer_degree" ? degree : Math.floor(degree / input.binning.width);
    nodeCounts[ordinal]++;
  }
  const enumerated = nodeCounts.reduce((total, count) => total + BigInt(count), 0n);
  if (enumerated !== BigInt(input.nodeIds.length)) {
    fail(
      "SCIENCE_NORMALIZATION_UNVERIFIABLE",
      ["nodeCounts"],
      "sum(nodeCounts) does not equal the complete node-universe cardinality."
    );
  }
  const histogramIncidence = nodeCounts.reduce((total, count, ordinal) => {
    if (degreeLow[ordinal] !== degreeHigh[ordinal]) return total;
    return total + BigInt(degreeLow[ordinal]) * BigInt(count);
  }, 0n);
  if (input.binning.mode === "per_integer_degree" && histogramIncidence !== BigInt(countedIncidenceCount)) {
    fail(
      "SCIENCE_NORMALIZATION_UNVERIFIABLE",
      ["nodeCounts"],
      "sum(degree * nodeCount) does not equal the independently derived counted incidence."
    );
  }
  const values = input.normalization === "count" ? [...nodeCounts] : nodeCounts.map((count) => exactRationalToBinary64(BigInt(count), BigInt(input.nodeIds.length), 0));
  return {
    nodeIds: [...input.nodeIds],
    degrees,
    degreeLow,
    degreeHigh,
    nodeCounts,
    values,
    countedConnectionCount,
    countedIncidenceCount,
    excludedAutapseCount
  };
}
function aggregateValues(values, aggregation, path2) {
  if (values.length === 0) {
    fail("SCIENCE_NORMALIZATION_UNVERIFIABLE", path2, "cannot aggregate an empty pair.");
  }
  if (aggregation === "no_aggregation") {
    if (values.length !== 1) {
      fail(
        "SCIENCE_AGGREGATION_REQUIRED",
        path2,
        `no_aggregation was declared but the ordered pair has ${values.length} rows.`
      );
    }
    return values[0];
  }
  const ordered = [...values].sort((left, right) => left - right);
  if (aggregation === "sum") return exactBinary64Sum(ordered);
  if (aggregation === "mean") return exactBinary64Mean(ordered);
  if (aggregation === "min") return ordered[0];
  return ordered[ordered.length - 1];
}
function validateEndpointRect(sourceIds, targetIds, sourceUniverse, targetUniverse) {
  uniqueIds(sourceUniverse, ["sourceUniverse"]);
  uniqueIds(targetUniverse, ["targetUniverse"]);
  const sources = new Set(sourceUniverse);
  const targets = new Set(targetUniverse);
  for (let ordinal = 0; ordinal < sourceIds.length; ordinal++) {
    if (!sources.has(sourceIds[ordinal])) {
      fail("SEMANTIC_UNKNOWN_REFERENCE", ["sourceIds", ordinal], "source is outside source universe.");
    }
    if (!targets.has(targetIds[ordinal])) {
      fail("SEMANTIC_UNKNOWN_REFERENCE", ["targetIds", ordinal], "target is outside target universe.");
    }
  }
}
function deriveDelayDistribution(input) {
  assertParallel(input.sourceIds.length, input.targetIds.length, ["targetIds"]);
  assertParallel(input.sourceIds.length, input.delayValues.length, ["delayValues"]);
  if (input.synapseModels) {
    assertParallel(input.sourceIds.length, input.synapseModels.length, ["synapseModels"]);
  }
  validateEndpointRect(
    input.sourceIds,
    input.targetIds,
    input.nodeUniverse,
    input.nodeUniverse
  );
  if (input.groupBy === "synapse_model" && !input.synapseModels) {
    fail(
      "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
      ["synapseModels"],
      "grouping by synapse model requires one model label per row."
    );
  }
  const groupIds = input.groupBy === "none" ? ["all"] : [...new Set(input.synapseModels)].sort(compareIdentifier);
  if (groupIds.length === 0) {
    fail(
      "RENDER_NO_DATA",
      ["synapseModels"],
      "grouping by synapse model cannot produce a figure from zero connection rows."
    );
  }
  if (groupIds.length > 8) {
    fail("RENDER_SERIES_LIMIT_EXCEEDED", ["synapseModels"], "at most eight groups are renderable.");
  }
  const rowCountByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const observations = [];
  if (input.countingPolicy === "per_connection") {
    if (input.aggregation !== void 0) {
      fail(
        "SCIENCE_AGGREGATION_REQUIRED",
        ["aggregation"],
        "per_connection preserves every multapse row and therefore forbids pair aggregation."
      );
    }
    for (let ordinal = 0; ordinal < input.delayValues.length; ordinal++) {
      const value = input.delayValues[ordinal];
      if (!(value > 0)) {
        fail("SCIENCE_DELAY_NONPOSITIVE", ["delayValues", ordinal], "a delay must be positive.");
      }
      const groupId = input.groupBy === "none" ? "all" : input.synapseModels[ordinal];
      rowCountByGroup.set(groupId, rowCountByGroup.get(groupId) + 1);
      observations.push({ groupId, value });
    }
  } else {
    if (!input.aggregation) {
      fail(
        "SCIENCE_AGGREGATION_REQUIRED",
        ["aggregation"],
        "per_ordered_pair requires a declared min, mean, max, or no_aggregation rule."
      );
    }
    const pairs = /* @__PURE__ */ new Map();
    for (let ordinal = 0; ordinal < input.delayValues.length; ordinal++) {
      const value = input.delayValues[ordinal];
      if (!(value > 0)) {
        fail("SCIENCE_DELAY_NONPOSITIVE", ["delayValues", ordinal], "a delay must be positive.");
      }
      const groupId = input.groupBy === "none" ? "all" : input.synapseModels[ordinal];
      rowCountByGroup.set(groupId, rowCountByGroup.get(groupId) + 1);
      const key = compositeKey([
        groupId,
        input.sourceIds[ordinal],
        input.targetIds[ordinal]
      ]);
      const pair = pairs.get(key);
      if (pair) pair.values.push(value);
      else pairs.set(key, { groupId, values: [value] });
    }
    for (const key of [...pairs.keys()].sort(compareIdentifier)) {
      const pair = pairs.get(key);
      observations.push({
        groupId: pair.groupId,
        value: aggregateValues(pair.values, input.aggregation, ["pairs", key])
      });
    }
  }
  const histogram = deriveExactGroupedHistogram({
    observations,
    groupIds,
    valueUnit: input.delayUnit,
    bins: input.bins,
    normalization: input.normalization,
    outOfRangePolicy: input.outOfRangePolicy
  });
  const groups = histogram.groups.map((group) => ({
    ...group,
    consideredConnectionCount: rowCountByGroup.get(group.groupId),
    missingConnectionCount: 0,
    missingObservationCount: 0,
    zeroObservationCount: 0
  }));
  const classifiedRows = groups.reduce(
    (total, group) => total + BigInt(group.consideredConnectionCount),
    0n
  );
  if (classifiedRows !== BigInt(input.sourceIds.length)) {
    fail(
      "SCIENCE_NORMALIZATION_UNVERIFIABLE",
      ["groups"],
      "synapse-model groups do not partition the connection rows exactly once."
    );
  }
  return {
    histogram,
    groups,
    sourceConnectionCount: input.sourceIds.length,
    observationCount: observations.length,
    missingConnectionCount: 0,
    missingObservationCount: 0,
    zeroObservationCount: 0,
    minimumObservation: observations.length === 0 ? null : observations.reduce((minimum, observation) => Math.min(minimum, observation.value), Infinity),
    maximumObservation: observations.length === 0 ? null : observations.reduce((maximum, observation) => Math.max(maximum, observation.value), -Infinity)
  };
}
function deriveWeightDistribution(input) {
  assertParallel(input.sourceIds.length, input.targetIds.length, ["targetIds"]);
  assertParallel(input.sourceIds.length, input.weightValues.length, ["weightValues"]);
  assertParallel(input.sourceIds.length, input.synapseModels.length, ["synapseModels"]);
  validateEndpointRect(
    input.sourceIds,
    input.targetIds,
    input.sourceUniverse,
    input.targetUniverse
  );
  const groupIds = input.grouping === "none" ? ["all"] : [...new Set(input.synapseModels)].sort(compareIdentifier);
  if (groupIds.length === 0) {
    fail(
      "RENDER_NO_DATA",
      ["synapseModels"],
      "grouping by synapse model cannot produce a figure from zero connection rows."
    );
  }
  if (groupIds.length > 8) {
    fail("RENDER_SERIES_LIMIT_EXCEEDED", ["synapseModels"], "at most eight groups are renderable.");
  }
  const rowCountByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const missingRowsByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const missingObservationsByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const zeroByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const observations = [];
  const transform = (value) => input.signTreatment === "magnitude" ? Math.abs(value) : value;
  if (input.observationUnit === "synapse") {
    if (input.aggregation !== void 0) {
      fail(
        "SCIENCE_AGGREGATION_REQUIRED",
        ["aggregation"],
        "synapse observations preserve every multapse and forbid pair aggregation."
      );
    }
    for (let ordinal = 0; ordinal < input.weightValues.length; ordinal++) {
      const groupId = input.grouping === "none" ? "all" : input.synapseModels[ordinal];
      rowCountByGroup.set(groupId, rowCountByGroup.get(groupId) + 1);
      const raw = input.weightValues[ordinal];
      if (raw === null) {
        missingRowsByGroup.set(groupId, missingRowsByGroup.get(groupId) + 1);
        missingObservationsByGroup.set(groupId, missingObservationsByGroup.get(groupId) + 1);
        continue;
      }
      assertFinite(raw, ["weightValues", ordinal]);
      const value = transform(raw);
      if (value === 0) zeroByGroup.set(groupId, zeroByGroup.get(groupId) + 1);
      observations.push({ groupId, value });
    }
  } else {
    if (!input.aggregation) {
      fail("SCIENCE_AGGREGATION_REQUIRED", ["aggregation"], "node_pair requires aggregation.");
    }
    const pairs = /* @__PURE__ */ new Map();
    for (let ordinal = 0; ordinal < input.weightValues.length; ordinal++) {
      const groupId = input.grouping === "none" ? "all" : input.synapseModels[ordinal];
      rowCountByGroup.set(groupId, rowCountByGroup.get(groupId) + 1);
      const key = compositeKey([
        groupId,
        input.sourceIds[ordinal],
        input.targetIds[ordinal]
      ]);
      const pair = pairs.get(key) ?? {
        groupId,
        values: [],
        missing: false,
        connectionCount: 0
      };
      pair.connectionCount++;
      const raw = input.weightValues[ordinal];
      if (raw === null) {
        pair.missing = true;
        missingRowsByGroup.set(groupId, missingRowsByGroup.get(groupId) + 1);
      } else {
        assertFinite(raw, ["weightValues", ordinal]);
        pair.values.push(raw);
      }
      pairs.set(key, pair);
    }
    for (const key of [...pairs.keys()].sort(compareIdentifier)) {
      const pair = pairs.get(key);
      if (input.aggregation === "no_aggregation" && pair.connectionCount !== 1) {
        fail(
          "SCIENCE_AGGREGATION_REQUIRED",
          ["pairs", key],
          `no_aggregation was declared but the ordered pair has ${pair.connectionCount} rows.`
        );
      }
      if (pair.missing) {
        missingObservationsByGroup.set(
          pair.groupId,
          missingObservationsByGroup.get(pair.groupId) + 1
        );
        continue;
      }
      const value = transform(aggregateValues(pair.values, input.aggregation, ["pairs", key]));
      if (value === 0) zeroByGroup.set(pair.groupId, zeroByGroup.get(pair.groupId) + 1);
      observations.push({ groupId: pair.groupId, value });
    }
  }
  const histogram = deriveExactGroupedHistogram({
    observations,
    groupIds,
    valueUnit: input.weightUnit,
    bins: input.bins,
    normalization: input.normalization,
    outOfRangePolicy: input.outOfRangePolicy
  });
  const groups = histogram.groups.map((group) => ({
    ...group,
    consideredConnectionCount: rowCountByGroup.get(group.groupId),
    missingConnectionCount: missingRowsByGroup.get(group.groupId),
    missingObservationCount: missingObservationsByGroup.get(group.groupId),
    zeroObservationCount: zeroByGroup.get(group.groupId)
  }));
  const classifiedRows = groups.reduce(
    (total, group) => total + BigInt(group.consideredConnectionCount),
    0n
  );
  const missingConnectionCount = groups.reduce(
    (total, group) => total + group.missingConnectionCount,
    0
  );
  if (classifiedRows !== BigInt(input.sourceIds.length)) {
    fail(
      "SCIENCE_NORMALIZATION_UNVERIFIABLE",
      ["groups"],
      "synapse-model groups do not partition every connection row exactly once."
    );
  }
  return {
    histogram,
    groups,
    sourceConnectionCount: input.sourceIds.length,
    observationCount: observations.length,
    missingConnectionCount,
    missingObservationCount: groups.reduce(
      (total, group) => total + group.missingObservationCount,
      0
    ),
    zeroObservationCount: groups.reduce(
      (total, group) => total + group.zeroObservationCount,
      0
    ),
    minimumObservation: observations.length === 0 ? null : observations.reduce((minimum, observation) => Math.min(minimum, observation.value), Infinity),
    maximumObservation: observations.length === 0 ? null : observations.reduce((maximum, observation) => Math.max(maximum, observation.value), -Infinity)
  };
}
function verifyHistogramValues(input) {
  assertParallel(input.counts.length, input.suppliedValues.length, ["suppliedValues"]);
  assertParallel(input.counts.length + 1, input.edges.length, ["edges"]);
  let denominatorBig = 0n;
  for (let ordinal = 0; ordinal < input.counts.length; ordinal++) {
    assertSafeCount(input.counts[ordinal], ["counts", ordinal]);
    denominatorBig += BigInt(input.counts[ordinal]);
  }
  const denominator = checkedSafeNumber(denominatorBig, ["counts"]);
  const expected = normalizedValues(
    input.counts,
    input.edges,
    input.unit,
    input.normalization,
    denominator
  );
  const mismatches = [];
  for (let ordinal = 0; ordinal < expected.length; ordinal++) {
    const actual = input.suppliedValues[ordinal];
    if (!Number.isFinite(actual) || actual === 0 !== (expected[ordinal] === 0) || !binary64RelativeDifferenceWithinTolerance(
      actual,
      expected[ordinal],
      input.tolerance ?? 1e-9
    )) {
      mismatches.push(ordinal);
    }
  }
  return mismatches;
}

export {
  validateArtifactStructure,
  validateStructure,
  MATRIX_AXIS_ORDER,
  MatrixDerivationError,
  deriveAdjacencyMatrix,
  deriveWeightMatrix,
  deriveDelayMatrix,
  DistributionDerivationError,
  derivePopulationRateCounts,
  deriveIsiFromEvents,
  deriveIsiFromIntervals,
  deriveDegreeDistribution,
  deriveDelayDistribution,
  deriveWeightDistribution,
  verifyHistogramValues
};
//# sourceMappingURL=chunk-TEVJHERV.js.map