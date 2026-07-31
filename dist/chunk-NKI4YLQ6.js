import {
  parseJsonStrict
} from "./chunk-DUFAYC5C.js";
import {
  snapshotValue
} from "./chunk-ZWGJHLFO.js";
import {
  DEFAULT_PROFILE,
  finalizeErrors,
  isSafeDisplayString,
  makeError,
  pointer,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile
} from "./chunk-WSSRXH4T.js";

// src/core/requestBoundary.internal.ts
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
function requestedBudgetProfile(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PROFILE;
  }
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
  return { ok: false, errors: finalizeErrors([...errors]), assurance };
}
function invalidBudgetProfile(assurance) {
  return fail([
    makeError({
      code: "RESOURCE_BUDGET_PROFILE_UNKNOWN",
      stage: "budget",
      message: "the selected budget profile is not in this build's closed registry. Unknown and inherited profile ids cannot disable resource limits."
    })
  ], assurance);
}
function captureRawRequestInput(text, options = {}) {
  const host = resolveBudgetProfile(options);
  let assurance = assuranceFor("raw_json_text", host.profile);
  if (!host.limits) return invalidBudgetProfile(assurance);
  if (typeof text !== "string") {
    return fail([
      makeError({
        code: "JSON_SYNTAX",
        stage: "parse",
        message: "the raw request boundary accepts a JSON text string only."
      })
    ], assurance);
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
  return { ok: true, value: parsed.value, assurance };
}
function captureMaterializedRequestInput(value, options = {}) {
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
    snapshot = snapshotValue(snapshot.value, effective.limits);
    if (!snapshot.ok) return fail(snapshot.errors, assurance);
  }
  return { ok: true, value: snapshot.value, assurance };
}

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
function isLibraryAuthoredField(value) {
  return LIBRARY_AUTHORED_FIELDS.has(value);
}
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
          message: `a declared source statement may be at most ${MAX_NOTE_LENGTH} characters; this one is ${value.length}.`
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
          message: "the declared source statement contains control, bidi-override, or zero-width characters. Rendered beside a mandatory disclosure, those can visually reorder or conceal it \u2014 so it is rejected rather than escaped."
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

export {
  captureRawRequestInput,
  captureMaterializedRequestInput,
  isLibraryAuthoredField,
  provenanceNoCallerAssurance,
  provenanceNoteSafeDisplay
};
//# sourceMappingURL=chunk-NKI4YLQ6.js.map