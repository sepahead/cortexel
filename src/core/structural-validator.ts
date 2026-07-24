/**
 * Structural validation: does the request have the right SHAPE?
 *
 * JSON Schema Draft 2020-12, compiled by Ajv in strict mode. Coercion, defaults,
 * property removal, and type conversion are all switched OFF. That matters more
 * than it sounds: with coercion on, the string `"5"` becomes the number `5`, and a
 * spike count that arrived as text would be silently accepted as a measurement.
 * Normalization is an explicit, recorded stage — it is not something a validator
 * does behind your back.
 *
 * Schemas are the ones in `contract/`. They are loaded from disk, not duplicated
 * here, so there is exactly one definition of what a request is.
 *
 * ---
 * On Ajv being a runtime dependency.
 *
 * The blueprint's stated target is `dependencies: {}`, with structural validators
 * precompiled ahead of time (Ajv's `standaloneCode`) so that no schema compiler —
 * and no `new Function` — reaches the runtime. That is the better architecture, and
 * it is not what the current development implementation does. Ajv 8 is a declared
 * runtime dependency; the development lockfile pins the exact version exercised by
 * this checkout. It appears in the SBOM, and the packed-artifact tests exercise it.
 *
 * The blueprint permits exactly this, provided the reason is written down rather
 * than glossed over, so: precompilation is a size-and-CSP optimization, not a
 * correctness one. The acceptance decisions are identical either way, and they are
 * pinned by the conformance corpus rather than by the validator's implementation.
 * It is recorded as a known limitation (docs/KNOWN_LIMITATIONS.md) and as an
 * unproven gate in the evidence ledger, not quietly omitted.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';

import { canonicalDigest, canonicalDigestExcluding } from './canonicalize.js';
import { finalizeErrors, makeError, type CortexelError } from './errors.js';
import { conversionReceipt, convert } from './units.js';

// `import.meta.url` works in native ESM source runners as well as tsup's ESM/CJS
// shims. `__dirname` is absent under tools such as tsx and made source execution fail
// before the CLI could even print its identity.
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locate `contract/` from either the source tree or the packed artifact. The
 * schemas ship WITH the package — a validator that cannot find its contract is a
 * validator that validates nothing.
 */
function findContractRoot(): string {
  const candidates = [
    // ESM code splitting may place shared validator code directly in dist/ rather
    // than beside the public entry that imports it.
    path.resolve(HERE, 'contract'),
    // Installed bundles live at dist/<entry>/index.{js,cjs}; the closest contract
    // directory must win even when a repository checkout also has contract/ above dist.
    path.resolve(HERE, '../contract'),
    // Source development loads this module from src/core/. The deeper adapters bundle
    // also reaches dist/contract through this candidate.
    path.resolve(HERE, '../../contract'),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'manifest.v1.json'))) return candidate;
  }
  throw new Error(
    'cannot locate the Cortexel contract directory; the package is incomplete or was not packed correctly',
  );
}

const CONTRACT_ROOT = findContractRoot();

function loadSchema(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(CONTRACT_ROOT, relative), 'utf8')) as Record<
    string,
    unknown
  >;
}

let ajv: Ajv2020 | undefined;
const compiled = new Map<string, ValidateFunction>();

function getAjv(): Ajv2020 {
  if (ajv) return ajv;

  const instance = new Ajv2020({
    strict: true,
    allErrors: true,

    // Every one of these is off on purpose.
    coerceTypes: false, // "5" must not become the number 5
    useDefaults: false, // a default is materialized in an explicit, recorded stage
    removeAdditional: false, // an unknown key must FAIL, not vanish
    allowUnionTypes: true,
    validateFormats: false, // no `format` keyword is load-bearing in the contract

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
    strictTypes: false,
  });

  // The shared $defs, plus the generated enums. Registering them by $id lets the
  // per-skill schemas $ref them without a network fetch — Cortexel never resolves a
  // schema over the wire.
  instance.addSchema(loadSchema('schemas/common.v1.schema.json'));
  instance.addSchema(loadSchema('schemas/generated/registry-enums.v1.schema.json'));
  instance.addSchema(loadSchema('schemas/validation-error.v1.schema.json'));
  const skillSchemaDirectory = path.join(CONTRACT_ROOT, 'schemas', 'skills');
  for (const filename of readdirSync(skillSchemaDirectory)
    .filter((name) => name.endsWith('.request.v1.schema.json'))
    .sort()) {
    instance.addSchema(loadSchema(path.join('schemas', 'skills', filename)));
  }
  instance.addSchema(loadSchema('schemas/stable-figure-request-union.v1.schema.json'));

  ajv = instance;
  return instance;
}

/** Compile (once) the request schema for a skill. */
function getSkillValidator(skillId: string): ValidateFunction | undefined {
  const existing = compiled.get(skillId);
  if (existing) return existing;

  const file = path.join(CONTRACT_ROOT, 'schemas', 'skills', `${skillId}.request.v1.schema.json`);
  if (!existsSync(file)) return undefined;

  const schema = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

  const registered = typeof schema.$id === 'string' ? getAjv().getSchema(schema.$id) : undefined;
  if (registered) {
    compiled.set(skillId, registered);
    return registered;
  }

  let validate: ValidateFunction;
  try {
    validate = getAjv().compile(schema);
  } catch (error) {
    // A schema that will not compile is a CONTRACT defect, and it must say so.
    // Swallowing it would be worse than useless: Ajv registers the $id before it
    // reports the error, so a second attempt fails with "schema already exists" —
    // which points at the cache and hides the actual broken keyword completely.
    throw new Error(
      `the request schema for "${skillId}" failed to compile: ${
        error instanceof Error ? error.message : String(error)
      }\nThis is a defect in contract/skills/${skillId}.v1.json, not in the request being validated.`,
      { cause: error },
    );
  }

  compiled.set(skillId, validate);
  return validate;
}

/**
 * Map one Ajv error to a stable Cortexel code.
 *
 * Tests assert on the CODE and the pointer, never on Ajv's prose — so Ajv can
 * change its wording without breaking a single consumer.
 */
function translate(error: ErrorObject, skillId: string): CortexelError {
  const instancePath = error.instancePath;
  const schemaPath = error.schemaPath;

  switch (error.keyword) {
    case 'additionalProperties': {
      const property = String((error.params as { additionalProperty?: string }).additionalProperty);
      return makeError({
        code: 'SCHEMA_UNKNOWN_PROPERTY',
        stage: 'structural',
        instancePath: `${instancePath}/${property.replace(/~/g, '~0').replace(/\//g, '~1')}`,
        schemaPath,
        skillId,
        message: `"${property}" is not a property this contract defines. Stable schemas are closed, so a mistyped scientific field fails here rather than being silently ignored.`,
        repair: {
          operation: 'remove',
          path: `${instancePath}/${property}`,
          reasonCode: 'SCHEMA_UNKNOWN_PROPERTY',
        },
      });
    }

    case 'required': {
      const property = String((error.params as { missingProperty?: string }).missingProperty);
      return makeError({
        code: 'SCHEMA_REQUIRED_PROPERTY_MISSING',
        stage: 'structural',
        instancePath: `${instancePath}/${property.replace(/~/g, '~0').replace(/\//g, '~1')}`,
        schemaPath,
        skillId,
        message: `"${property}" is required. Cortexel does not infer a scientific fact the source did not state.`,
      });
    }

    case 'type':
      return makeError({
        code: 'SCHEMA_TYPE_MISMATCH',
        stage: 'structural',
        instancePath,
        schemaPath,
        skillId,
        message: `expected ${String((error.params as { type?: string }).type)}. No type coercion is performed.`,
      });

    case 'enum':
    case 'const':
      return makeError({
        code: 'SCHEMA_ENUM_MISMATCH',
        stage: 'structural',
        instancePath,
        schemaPath,
        skillId,
        message: `the value is outside the closed set this field permits. ${error.message ?? ''}`.trim(),
      });

    default:
      return makeError({
        code: 'SCHEMA_VALIDATION_FAILED',
        stage: 'structural',
        instancePath,
        schemaPath,
        skillId,
        message: error.message ?? 'the value failed structural validation',
      });
  }
}

export interface StructuralResult {
  readonly ok: boolean;
  readonly errors: readonly CortexelError[];
}

let artifactValidator: ValidateFunction | undefined;
let artifactValidatorCompileError: Error | undefined;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function relationError(instancePath: string, message: string): CortexelError {
  return makeError({
    code: 'INTERNAL_INVARIANT_VIOLATED',
    stage: 'internal',
    instancePath,
    message:
      `${message} No output was returned; this is a Cortexel emission defect, not a caller repair target.`,
  });
}

function operationDigest(
  domain: string,
  suffix:
    | 'global-context'
    | 'series-input'
    | 'materialization-displayed'
    | 'operation-input'
    | 'operation-output',
  payload: unknown,
): string {
  return canonicalDigest({
    digestDomain: `${domain}/${suffix}`,
    payload,
  });
}

function requestWindow(data: JsonRecord): JsonRecord {
  const window = asRecord(data.window) ?? {};
  return {
    start: window.start,
    stop: window.stop,
    unit: window.unit,
    finalEdgeInclusive:
      typeof window.boundary === 'string' && window.boundary.endsWith(']'),
  };
}

function timeIsInsideWindow(time: unknown, window: JsonRecord): boolean {
  if (
    typeof time !== 'number' ||
    typeof window.start !== 'number' ||
    typeof window.stop !== 'number'
  ) return false;
  return time >= window.start &&
    time <= window.stop &&
    (time !== window.stop || window.finalEdgeInclusive === true);
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalDigest(left) === canonicalDigest(right);
}

function exactConversionReceiptOrNull(
  value: unknown,
): boolean {
  if (value === null) return true;
  const receipt = asRecord(value);
  if (
    !receipt ||
    typeof receipt.from !== 'string' ||
    typeof receipt.to !== 'string' ||
    receipt.from === receipt.to
  ) return false;
  return sameCanonical(
    receipt,
    conversionReceipt(receipt.from, receipt.to),
  );
}

interface ExpectedBatchCarrier {
  readonly identity: JsonRecord;
  readonly role: 'source_series' | 'declared_aggregate';
  readonly payload: unknown;
  readonly views: readonly {
    readonly kind: 'display' | 'state';
    readonly window: JsonRecord;
  }[];
  readonly transforms: JsonRecord;
  readonly painted?: boolean;
}

interface ExpectedBatchContext {
  readonly globalPayload: unknown;
  readonly carriers: readonly ExpectedBatchCarrier[];
}

function expectedConversion(
  from: unknown,
  to: unknown,
): JsonRecord | null {
  return typeof from === 'string' &&
    typeof to === 'string' &&
    from !== to
    ? conversionReceipt(from, to) as unknown as JsonRecord
    : null;
}

function expectedUncertaintyConversion(
  uncertainty: JsonRecord | undefined,
  targetUnit: unknown,
): JsonRecord | null {
  return uncertainty?.kind !== undefined && uncertainty.kind !== 'none'
    ? expectedConversion(uncertainty.unit, targetUnit)
    : null;
}

function expectedBatchContext(
  family: 'weight' | 'compartment',
  canonicalRequest: JsonRecord,
): ExpectedBatchContext | undefined {
  const skill = asRecord(canonicalRequest.skill) ?? {};
  const data = asRecord(canonicalRequest.data) ?? {};
  const parameters = asRecord(canonicalRequest.parameters) ?? {};
  const analysisWindow = requestWindow(data);

  if (family === 'compartment') {
    const series = asArray(data.series).map((candidate) => asRecord(candidate) ?? {});
    const targetValueUnit = asRecord(series[0]?.values)?.unit;
    return {
      globalPayload: {
        skillId: skill.id,
        dataContext: { ...data, series: null },
        parameters,
        analysisWindow,
        targetValueUnit,
      },
      carriers: series.map((entry) => ({
        identity: {
          kind: 'compartment_series',
          compartmentId: entry.compartmentId,
          signalId: entry.signalId,
        },
        role: 'source_series',
        payload: entry,
        views: [{ kind: 'display', window: analysisWindow }],
        transforms: {
          time: expectedConversion(
            asRecord(entry.time)?.unit,
            analysisWindow.unit,
          ),
          value: expectedConversion(
            asRecord(entry.values)?.unit,
            targetValueUnit,
          ),
          recordedInterval: null,
          initialValue: null,
          uncertainty: expectedUncertaintyConversion(
            asRecord(parameters.uncertainty),
            targetValueUnit,
          ),
          normalization: null,
          renderedLowerBound: null,
          renderedUpperBound: null,
        },
      })),
    };
  }

  if (data.mode === 'preaggregated') {
    const aggregate = asRecord(data.aggregate) ?? {};
    const values = asRecord(aggregate.values) ?? {};
    return {
      globalPayload: {
        skillId: skill.id,
        dataContext: { ...data, aggregate: null },
        parameters,
        analysisWindow,
        observation: aggregate.observation,
        targetValueUnit: values.unit,
      },
      carriers: [{
        identity: {
          kind: 'declared_weight_aggregate',
          groupId: aggregate.groupId,
        },
        role: 'declared_aggregate',
        payload: aggregate,
        views: [{ kind: 'display', window: analysisWindow }],
        transforms: {
          time: expectedConversion(
            asRecord(aggregate.time)?.unit,
            analysisWindow.unit,
          ),
          value: null,
          recordedInterval: null,
          initialValue: null,
          uncertainty: expectedUncertaintyConversion(
            asRecord(aggregate.uncertainty),
            values.unit,
          ),
          normalization: null,
          renderedLowerBound: null,
          renderedUpperBound: null,
        },
        painted: true,
      }],
    };
  }

  const series = asArray(data.series).map((candidate) => asRecord(candidate) ?? {});
  const display = parameters.display;
  const derivedDisplay =
    display === 'aggregate_derived' || display === 'aggregate_derived_with_members';
  const membershipIds = new Set(
    asArray(asRecord(data.membership)?.members).map((candidate) =>
      asRecord(candidate)?.edgeId),
  );
  const target = derivedDisplay
    ? series.find((candidate) => membershipIds.has(candidate.edgeId))
    : series[0];
  const targetValueUnit = asRecord(target?.values)?.unit;
  return {
    globalPayload: {
      skillId: skill.id,
      dataContext: { ...data, series: null },
      parameters,
      analysisWindow,
      observation: data.observation,
      targetValueUnit,
    },
    carriers: series.map((entry) => {
      const recordedInterval = asRecord(entry.recordedInterval) ?? {};
      const intervalUnit = recordedInterval.unit;
      const intervalStart = intervalUnit === analysisWindow.unit
        ? Number(recordedInterval.start)
        : convert(
          Number(recordedInterval.start),
          String(intervalUnit),
          String(analysisWindow.unit),
        );
      const intervalStop = intervalUnit === analysisWindow.unit
        ? Number(recordedInterval.stop)
        : convert(
          Number(recordedInterval.stop),
          String(intervalUnit),
          String(analysisWindow.unit),
        );
      const intervalFinalEdgeInclusive =
        typeof recordedInterval.boundary === 'string' &&
        recordedInterval.boundary.endsWith(']');
      const displayStart = Math.max(
        Number(analysisWindow.start),
        intervalStart,
      );
      const displayStop = Math.min(
        Number(analysisWindow.stop),
        intervalStop,
      );
      const displayFinalEdgeInclusive =
        (
          displayStop !== analysisWindow.stop ||
          analysisWindow.finalEdgeInclusive === true
        ) &&
        (
          displayStop !== intervalStop ||
          intervalFinalEdgeInclusive
        );
      const referenceRendered =
        parameters.showReferenceLines === true &&
        (
          display === 'individual' ||
          (
            display === 'aggregate_derived_with_members' &&
            membershipIds.has(entry.edgeId)
          )
        );
      const painted =
        display === 'individual' ||
        display === 'aggregate_derived_with_members';
      const bounds = asRecord(entry.bounds) ?? {};
      return {
        identity: {
          kind: 'weight_member',
          edgeId: entry.edgeId,
        },
        role: 'source_series' as const,
        payload: entry,
        views: [
          {
            kind: 'display' as const,
            window: {
              start: displayStart,
              stop: displayStop,
              unit: analysisWindow.unit,
              finalEdgeInclusive: displayFinalEdgeInclusive,
            },
          },
          {
            kind: 'state' as const,
            window: {
              start: intervalStart,
              stop: intervalStop,
              unit: analysisWindow.unit,
              finalEdgeInclusive: intervalFinalEdgeInclusive,
            },
          },
        ],
        transforms: {
          time: expectedConversion(
            asRecord(entry.time)?.unit,
            analysisWindow.unit,
          ),
          value: expectedConversion(
            asRecord(entry.values)?.unit,
            targetValueUnit,
          ),
          recordedInterval: expectedConversion(
            recordedInterval.unit,
            analysisWindow.unit,
          ),
          initialValue: expectedConversion(
            asRecord(asRecord(entry.initialWeight)?.quantity)?.unit,
            targetValueUnit,
          ),
          uncertainty: null,
          normalization: null,
          renderedLowerBound: referenceRendered
            ? expectedConversion(
              asRecord(bounds.lower)?.unit,
              targetValueUnit,
            )
            : null,
          renderedUpperBound: referenceRendered
            ? expectedConversion(
              asRecord(bounds.upper)?.unit,
              targetValueUnit,
            )
            : null,
        },
        painted,
      };
    }),
  };
}

function validateBatchRelations(
  operation: JsonRecord,
  operationIndex: number,
  family: 'weight' | 'compartment',
  canonicalRequest: JsonRecord,
): CortexelError[] {
  const basePath = `/derivation/operations/${operationIndex}`;
  const errors: CortexelError[] = [];
  const parameters = asRecord(operation.parameters) ?? {};
  const receipt = asRecord(operation.receipt) ?? {};
  const entries = asArray(receipt.seriesReceipts).map(
    (candidate) => asRecord(candidate) ?? {},
  );
  const domain = String(parameters.digestDomain);
  const expected = expectedBatchContext(family, canonicalRequest);

  if (receipt.seriesCount !== entries.length) {
    errors.push(relationError(
      `${basePath}/receipt/seriesCount`,
      'the preparation-batch series count does not equal the receipt-array length.',
    ));
  }
  if (expected && entries.length !== expected.carriers.length) {
    errors.push(relationError(
      `${basePath}/receipt/seriesReceipts`,
      'the preparation-batch receipt cardinality does not equal the canonical request carrier cardinality.',
    ));
  }

  if (expected) {
    const expectedGlobalContextDigest = operationDigest(
      domain,
      'global-context',
      expected.globalPayload,
    );
    if (receipt.globalContextDigest !== expectedGlobalContextDigest) {
      errors.push(relationError(
        `${basePath}/receipt/globalContextDigest`,
        'the preparation-batch global-context digest does not bind the exact canonical request context.',
      ));
    }
  }

  const identityDigests = new Set<string>();
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const entryPath = `${basePath}/receipt/seriesReceipts/${index}`;
    if (entry.sourceIndex !== index) {
      errors.push(relationError(
        `${entryPath}/sourceIndex`,
        'preparation-batch source indices are not contiguous canonical-request order.',
      ));
    }
    const identityDigest = canonicalDigest(entry.seriesIdentity);
    if (identityDigests.has(identityDigest)) {
      errors.push(relationError(
        `${entryPath}/seriesIdentity`,
        'the preparation batch repeats a structured series identity.',
      ));
    }
    identityDigests.add(identityDigest);

    const carrier = expected?.carriers[index];
    if (carrier) {
      if (
        entry.role !== carrier.role ||
        !sameCanonical(entry.seriesIdentity, carrier.identity)
      ) {
        errors.push(relationError(
          `${entryPath}/seriesIdentity`,
          'the preparation-batch role or structured identity does not match its canonical request carrier.',
        ));
      }
      const expectedInputDigest = operationDigest(domain, 'series-input', {
        globalContextDigest: receipt.globalContextDigest,
        sourceIndex: index,
        seriesIdentity: carrier.identity,
        role: carrier.role,
        inputPayload: carrier.payload,
      });
      if (entry.inputDigest !== expectedInputDigest) {
        errors.push(relationError(
          `${entryPath}/inputDigest`,
          'the series-input digest does not bind the corresponding canonical request carrier.',
        ));
      }
    }

    const views = asArray(entry.views).map((candidate) => asRecord(candidate) ?? {});
    const stateView = views.find((view) => view.kind === 'state');
    const transforms = asRecord(entry.transforms) ?? {};
    for (const [transformName, transform] of Object.entries(transforms)) {
      if (!exactConversionReceiptOrNull(transform)) {
        errors.push(relationError(
          `${entryPath}/transforms/${transformName}`,
          'the conversion receipt does not equal the registry-derived exact unit conversion.',
        ));
      }
    }
    if (carrier && !sameCanonical(transforms, carrier.transforms)) {
      errors.push(relationError(
        `${entryPath}/transforms`,
        'the preparation-batch transform inventory does not exactly match the unit changes implied by its canonical request carrier and presentation role.',
      ));
    }
    if (
      carrier &&
      (
        views.length !== carrier.views.length ||
        views.some((view, viewIndex) =>
          view.kind !== carrier.views[viewIndex]?.kind ||
          !sameCanonical(view.window, carrier.views[viewIndex]?.window))
      )
    ) {
      errors.push(relationError(
        `${entryPath}/views`,
        'the preparation-batch view kinds or exact applied windows do not match the canonical request carrier.',
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
      if (
        typeof window.start !== 'number' ||
        typeof window.stop !== 'number' ||
        !Number.isFinite(window.start) ||
        !Number.isFinite(window.stop) ||
        !(window.stop > window.start)
      ) {
        errors.push(relationError(
          `${viewPath}/window`,
          'the prepared-view window is not a finite strictly increasing interval.',
        ));
      }
      if (input !== retained + below + above) {
        errors.push(relationError(
          viewPath,
          'the prepared-view source counts do not conserve input = retained + below-window + above-window.',
        ));
      }
      if (output > retained || missing > retained) {
        errors.push(relationError(
          viewPath,
          'the prepared-view output or missing-source count exceeds retained source multiplicity.',
        ));
      }
      if (duplicateGroups > Math.floor(input / 2)) {
        errors.push(relationError(
          `${viewPath}/duplicateGroupCount`,
          'the number of duplicate-time groups exceeds the maximum possible for the input multiplicity.',
        ));
      }
    }

    for (let witnessIndex = 0; witnessIndex < asArray(entry.contextWitnesses).length; witnessIndex++) {
      const witness = asRecord(asArray(entry.contextWitnesses)[witnessIndex]) ?? {};
      if (
        !stateView ||
        typeof witness.stateObservationIndex !== 'number' ||
        witness.stateObservationIndex >= Number(stateView.outputRowCount)
      ) {
        errors.push(relationError(
          `${entryPath}/contextWitnesses/${witnessIndex}/stateObservationIndex`,
          'the context witness does not address an observation in this entry’s exact state view.',
        ));
      }
    }
    if (
      (entry.initialStatePainted === true ||
        entry.initialStateConsumedByDerivedAggregate === true) &&
      entry.materialization === null
    ) {
      errors.push(relationError(
        `${entryPath}/materialization`,
        'an initial event-held state flag is true without an event materialization receipt.',
      ));
    }
    const requestParameters = asRecord(canonicalRequest.parameters) ?? {};
    if (
      family === 'weight' &&
      requestParameters.display === 'individual'
    ) {
      if (entry.initialStateConsumedByDerivedAggregate !== false) {
        errors.push(relationError(
          `${entryPath}/initialStateConsumedByDerivedAggregate`,
          'an individual-only weight artifact has no derived aggregate that could consume an initial state.',
        ));
      }
      for (
        let witnessIndex = 0;
        witnessIndex < asArray(entry.contextWitnesses).length;
        witnessIndex++
      ) {
        const witness = asRecord(asArray(entry.contextWitnesses)[witnessIndex]) ?? {};
        if (witness.consultedByDerivedAggregate !== false) {
          errors.push(relationError(
            `${entryPath}/contextWitnesses/${witnessIndex}/consultedByDerivedAggregate`,
            'an individual-only weight artifact has no derived aggregate that could consult a context witness.',
          ));
        }
      }
    }
    const requestData = asRecord(canonicalRequest.data) ?? {};
    const requestObservation = requestData.mode === 'preaggregated'
      ? asRecord(asRecord(requestData.aggregate)?.observation)
      : asRecord(requestData.observation);
    if (
      family === 'weight' &&
      requestObservation?.kind === 'event_updated' &&
      entry.materialization === null
    ) {
      errors.push(relationError(
        `${entryPath}/materialization`,
        'an event-updated weight carrier must bind its full and displayed run materializations.',
      ));
    }
    if (
      family === 'weight' &&
      requestObservation?.kind !== 'event_updated'
    ) {
      if (
        asArray(entry.contextWitnesses).length !== 0 ||
        entry.materialization !== null ||
        entry.initialStatePainted !== false ||
        entry.initialStateConsumedByDerivedAggregate !== false
      ) {
        errors.push(relationError(
          entryPath,
          'a non-event weight carrier cannot have event-held-state witnesses, materialization, or initial-state consumption flags.',
        ));
      }
    }
    if (family === 'weight' && carrier?.painted === false) {
      if (entry.initialStatePainted !== false) {
        errors.push(relationError(
          `${entryPath}/initialStatePainted`,
          'an unpainted raw member cannot claim that its declared initial state was painted.',
        ));
      }
      if (
        asArray(entry.contextWitnesses).some((candidate) =>
          asRecord(candidate)?.consultedByDerivedAggregate !== true)
      ) {
        errors.push(relationError(
          `${entryPath}/contextWitnesses`,
          'an unpainted raw member may retain only context witnesses actually consulted by the derived aggregate.',
        ));
      }
      const materialization = asRecord(entry.materialization);
      const expectedNullDisplayDigest = operationDigest(
        domain,
        'materialization-displayed',
        {
          sourceIndex: index,
          seriesIdentity: entry.seriesIdentity,
          materialization: null,
        },
      );
      if (
        materialization &&
        materialization.displayedOutputDigest !== expectedNullDisplayDigest
      ) {
        errors.push(relationError(
          `${entryPath}/materialization/displayedOutputDigest`,
          'an unpainted raw member must bind the canonical null displayed-materialization preimage.',
        ));
      }
    }
    if (family === 'weight' && requestObservation?.kind === 'event_updated') {
      const requiredRole = requestObservation.updateSemantics === 'value_before_update'
        ? 'look_ahead'
        : 'carry_in';
      if (
        asArray(entry.contextWitnesses).some((candidate) =>
          asRecord(candidate)?.role !== requiredRole)
      ) {
        errors.push(relationError(
          `${entryPath}/contextWitnesses`,
          `event update semantics permit only ${requiredRole} context witnesses.`,
        ));
      }
    }
  }

  const expectedInputDigest = operationDigest(domain, 'operation-input', {
    globalContextDigest: receipt.globalContextDigest,
    seriesInputDigests: entries.map((entry) => entry.inputDigest),
  });
  if (operation.inputDigest !== expectedInputDigest) {
    errors.push(relationError(
      `${basePath}/inputDigest`,
      'the preparation-batch operation input digest does not bind its ordered series-input digests.',
    ));
  }
  const expectedOutputDigest = operationDigest(
    domain,
    'operation-output',
    receipt,
  );
  if (operation.outputDigest !== expectedOutputDigest) {
    errors.push(relationError(
      `${basePath}/outputDigest`,
      'the preparation-batch operation output digest does not bind its complete receipt.',
    ));
  }
  return errors;
}

function validateWeightAggregateRelations(
  operation: JsonRecord,
  operationIndex: number,
  precedingBatch: JsonRecord,
  canonicalRequest: JsonRecord,
): CortexelError[] {
  const basePath = `/derivation/operations/${operationIndex}`;
  const errors: CortexelError[] = [];
  const parameters = asRecord(operation.parameters) ?? {};
  const receipt = asRecord(operation.receipt) ?? {};
  const requestParameters = asRecord(canonicalRequest.parameters) ?? {};
  const requestAggregate = asRecord(requestParameters.aggregate) ?? {};
  const data = asRecord(canonicalRequest.data) ?? {};
  const membership = asRecord(data.membership) ?? {};
  const series = asArray(data.series).map((candidate) => asRecord(candidate) ?? {});
  const membershipIds = new Set(
    asArray(membership.members).map((candidate) => asRecord(candidate)?.edgeId),
  );
  const selectedSeries = series.filter((candidate) => membershipIds.has(candidate.edgeId));
  const selectedIds = selectedSeries.map((candidate) => candidate.edgeId);
  const preparationReceipt = asRecord(precedingBatch.receipt) ?? {};
  const preparationEntries = asArray(preparationReceipt.seriesReceipts).map(
    (candidate) => asRecord(candidate) ?? {},
  );
  const selectedPreparationEntries = preparationEntries.filter((entry) =>
    membershipIds.has(asRecord(entry.seriesIdentity)?.edgeId));
  const selectedDisplayRowCounts = selectedPreparationEntries.map((entry) => {
    const displayView = asArray(entry.views)
      .map((candidate) => asRecord(candidate) ?? {})
      .find((view) => view.kind === 'display');
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
    targetValueUnit,
  };
  const actualScientificParameters = {
    method: parameters.method,
    evaluation: parameters.evaluation,
    dispersion: parameters.dispersion,
    membershipUnit: parameters.membershipUnit,
    observation: parameters.observation,
    analysisWindow: parameters.analysisWindow,
    weightComparability: parameters.weightComparability,
    targetValueUnit: parameters.targetValueUnit,
  };
  if (!sameCanonical(actualScientificParameters, expectedScientificParameters)) {
    errors.push(relationError(
      `${basePath}/parameters`,
      'the weight aggregate parameters do not equal the scientific controls in the canonical request.',
    ));
  }
  if (!sameCanonical(receipt.selectedMemberIds, selectedIds)) {
    errors.push(relationError(
      `${basePath}/receipt/selectedMemberIds`,
      'the weight aggregate selected-member order does not equal canonical edge-series order filtered by declared membership.',
    ));
  }
  const expectedScientificInputDigest = canonicalDigest({
    membership,
    members: selectedSeries,
    observation: data.observation,
    analysisWindow,
    weightComparability: requestParameters.weightComparability,
    targetValueUnit,
  });
  if (receipt.scientificInputDigest !== expectedScientificInputDigest) {
    errors.push(relationError(
      `${basePath}/receipt/scientificInputDigest`,
      'the weight aggregate scientific-input digest does not bind the selected canonical request carriers.',
    ));
  }
  const expectedMembershipConversion = membership.unit === analysisWindow.unit
    ? null
    : conversionReceipt(String(membership.unit), String(analysisWindow.unit));
  const evaluation = asRecord(requestAggregate.evaluation) ?? {};
  const evaluationTimes = asRecord(evaluation.times);
  const expectedEvaluationConversion =
    evaluation.mode === 'hold_last_observed_at_declared_times' &&
    evaluationTimes?.unit !== analysisWindow.unit
      ? conversionReceipt(
        String(evaluationTimes?.unit),
        String(analysisWindow.unit),
      )
      : null;
  if (
    !sameCanonical(
      receipt.membershipTimeConversion,
      expectedMembershipConversion,
    ) ||
    !sameCanonical(
      receipt.evaluationTimeConversion,
      expectedEvaluationConversion,
    )
  ) {
    errors.push(relationError(
      `${basePath}/receipt/membershipTimeConversion`,
      'the aggregate time-conversion receipts do not equal the exact conversions required by the canonical request.',
    ));
  }
  const output = asRecord(receipt.output) ?? {};
  const outputEvaluationTimes = asArray(output.evaluationTimes);
  const aggregateValues = asArray(output.aggregateValues);
  const memberCounts = asArray(output.memberCounts);
  const contributingCounts = asArray(output.contributingCounts);
  const evaluationCount = Number(receipt.evaluationCount);
  const dispersion = asRecord(parameters.dispersion);
  if (
    outputEvaluationTimes.length !== evaluationCount ||
    aggregateValues.length !== evaluationCount ||
    memberCounts.length !== evaluationCount ||
    contributingCounts.length !== evaluationCount
  ) {
    errors.push(relationError(
      `${basePath}/receipt/output`,
      'the weight aggregate evaluation count does not equal every exact output-array length.',
    ));
  }
  if (
    outputEvaluationTimes.some((candidate, index) =>
      index > 0 && typeof candidate === 'number' &&
      typeof outputEvaluationTimes[index - 1] === 'number' &&
      candidate <= (outputEvaluationTimes[index - 1] as number))
  ) {
    errors.push(relationError(
      `${basePath}/receipt/output/evaluationTimes`,
      'the weight aggregate evaluation axis is not strictly increasing.',
    ));
  }
  if (outputEvaluationTimes.some((time) =>
    !timeIsInsideWindow(time, analysisWindow))) {
    errors.push(relationError(
      `${basePath}/receipt/output/evaluationTimes`,
      'a weight aggregate evaluation time lies outside the declared analysis window.',
    ));
  }
  if (evaluation.mode === 'hold_last_observed_at_union_times') {
    if (
      outputEvaluationTimes[0] !== analysisWindow.start ||
      (
        analysisWindow.finalEdgeInclusive === true &&
        outputEvaluationTimes.at(-1) !== analysisWindow.stop
      )
    ) {
      errors.push(relationError(
        `${basePath}/receipt/output/evaluationTimes`,
        'the union grid must include the analysis-window start and, for a closed window, its stop.',
      ));
    }
    const maximumPreparedRowCount = selectedDisplayRowCounts.length === 0
      ? 0
      : Math.max(...selectedDisplayRowCounts);
    if (evaluationCount < maximumPreparedRowCount) {
      errors.push(relationError(
        `${basePath}/receipt/evaluationCount`,
        'a union grid cannot contain fewer distinct evaluation times than any selected duplicate-free display view.',
      ));
    }
  }
  if (
    evaluation.mode === 'shared_sample_grid' &&
    selectedDisplayRowCounts.some((count) => count !== evaluationCount)
  ) {
    errors.push(relationError(
      `${basePath}/receipt/evaluationCount`,
      'a shared-sample grid must have exactly the same row count as every selected display view.',
    ));
  }
  if (evaluation.mode === 'hold_last_observed_at_declared_times') {
    const declaredValues = asArray(evaluationTimes?.values);
    const declaredUnit = String(evaluationTimes?.unit);
    const expectedEvaluationTimes = declaredValues.map((candidate) =>
      declaredUnit === analysisWindow.unit
        ? candidate
        : convert(
          Number(candidate),
          declaredUnit,
          String(analysisWindow.unit),
        ));
    if (!sameCanonical(outputEvaluationTimes, expectedEvaluationTimes)) {
      errors.push(relationError(
        `${basePath}/receipt/output/evaluationTimes`,
        'the aggregate evaluation axis does not exactly equal the caller-declared grid after one registered-unit conversion into the analysis-window unit.',
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
      return membership.unit === analysisWindow.unit
        ? { start, stop }
        : {
          start: convert(
            start,
            String(membership.unit),
            String(analysisWindow.unit),
          ),
          stop: convert(
            stop,
            String(membership.unit),
            String(analysisWindow.unit),
          ),
        };
    });
    let intervalIndex = 0;
    for (let timeIndex = 0; timeIndex < outputEvaluationTimes.length; timeIndex++) {
      const time = Number(outputEvaluationTimes[timeIndex]);
      while (
        intervalIndex < intervals.length &&
        time >= intervals[intervalIndex].stop
      ) intervalIndex++;
      const interval = intervals[intervalIndex];
      if (interval && time >= interval.start && time < interval.stop) {
        expectedMemberCounts[timeIndex]++;
      }
    }
  }
  if (!sameCanonical(memberCounts, expectedMemberCounts)) {
    errors.push(relationError(
      `${basePath}/receipt/output/memberCounts`,
      'the weight aggregate member counts do not equal the declared half-open membership intervals at each evaluation time.',
    ));
  }
  for (let index = 0; index < evaluationCount; index++) {
    const members = Number(memberCounts[index]);
    const contributors = Number(contributingCounts[index]);
    if (
      contributors > members ||
      members > selectedIds.length ||
      (contributors === 0) !== (aggregateValues[index] === null)
    ) {
      errors.push(relationError(
        `${basePath}/receipt/output/contributingCounts/${index}`,
        'the weight aggregate member/contributor counts or zero-contributor null result are inconsistent.',
      ));
      break;
    }
  }
  const uncertainty = asRecord(output.uncertainty) ?? {};
  const expectedDispersionKind = dispersion?.kind;
  if (
    uncertainty.kind !== expectedDispersionKind ||
    (
      uncertainty.kind === 'none' &&
      uncertainty.reason !== dispersion?.reason
    ) ||
    (
      uncertainty.kind !== 'none' &&
      uncertainty.unit !== targetValueUnit
    ) ||
    (
      uncertainty.kind === 'quantile_interval' &&
      (
        uncertainty.lowerQuantile !== dispersion?.lowerQuantile ||
        uncertainty.upperQuantile !== dispersion?.upperQuantile ||
        uncertainty.method !== 'empirical_type_7_linear'
      )
    )
  ) {
    errors.push(relationError(
      `${basePath}/receipt/output/uncertainty`,
      'the weight aggregate uncertainty carrier does not match the requested dispersion and output unit.',
    ));
  }
  const checkSpreadArrays = (
    lowerOrValue: readonly unknown[],
    upper: readonly unknown[] | undefined,
    sampleCounts: readonly unknown[],
    minimumContributors: number,
  ): void => {
    if (
      lowerOrValue.length !== evaluationCount ||
      (upper !== undefined && upper.length !== evaluationCount) ||
      sampleCounts.length !== evaluationCount
    ) {
      errors.push(relationError(
        `${basePath}/receipt/output/uncertainty`,
        'the descriptive-spread arrays do not align with the aggregate evaluation axis.',
      ));
      return;
    }
    for (let index = 0; index < evaluationCount; index++) {
      const contributors = Number(contributingCounts[index]);
      const expectedMissing = contributors < minimumContributors;
      const lowerMissing = lowerOrValue[index] === null;
      const upperMissing = upper === undefined ? lowerMissing : upper[index] === null;
      const count = sampleCounts[index];
      const lowerValue = lowerOrValue[index];
      const upperValue = upper?.[index];
      if (
        lowerMissing !== expectedMissing ||
        upperMissing !== expectedMissing ||
        (
          expectedMissing
            ? count !== null
            : count !== contributors
        ) ||
        (
          !expectedMissing &&
          upper !== undefined &&
          typeof lowerValue === 'number' &&
          typeof upperValue === 'number' &&
          lowerValue > upperValue
        ) ||
        (
          !expectedMissing &&
          uncertainty.kind === 'standard_deviation' &&
          typeof lowerValue === 'number' &&
          lowerValue < 0
        )
      ) {
        errors.push(relationError(
          `${basePath}/receipt/output/uncertainty`,
          'the descriptive-spread nullability, sample count, or bound order is inconsistent with contributor counts.',
        ));
        return;
      }
    }
  };
  if (uncertainty.kind === 'standard_deviation') {
    checkSpreadArrays(
      asArray(uncertainty.values),
      undefined,
      asArray(uncertainty.sampleCount),
      2,
    );
  } else if (
    uncertainty.kind === 'quantile_interval' ||
    uncertainty.kind === 'ensemble_range'
  ) {
    checkSpreadArrays(
      asArray(uncertainty.lower),
      asArray(uncertainty.upper),
      asArray(uncertainty.sampleCount),
      1,
    );
  }
  if (
    uncertainty.kind === 'ensemble_range' ||
    uncertainty.kind === 'quantile_interval'
  ) {
    const lower = asArray(uncertainty.lower);
    const upper = asArray(uncertainty.upper);
    for (let index = 0; index < evaluationCount; index++) {
      const contributors = Number(contributingCounts[index]);
      const aggregateValue = aggregateValues[index];
      const lowerValue = lower[index];
      const upperValue = upper[index];
      if (
        contributors < 1 ||
        typeof aggregateValue !== 'number' ||
        typeof lowerValue !== 'number' ||
        typeof upperValue !== 'number'
      ) continue;
      let inconsistent = false;
      if (uncertainty.kind === 'ensemble_range') {
        inconsistent =
          aggregateValue < lowerValue ||
          aggregateValue > upperValue ||
          (
            contributors === 1 &&
            (
              aggregateValue !== lowerValue ||
              aggregateValue !== upperValue
            )
          ) ||
          (parameters.method === 'min' && aggregateValue !== lowerValue) ||
          (parameters.method === 'max' && aggregateValue !== upperValue);
      } else {
        const lowerQuantile = Number(uncertainty.lowerQuantile);
        const upperQuantile = Number(uncertainty.upperQuantile);
        inconsistent =
          (
            contributors === 1 &&
            (
              aggregateValue !== lowerValue ||
              aggregateValue !== upperValue
            )
          ) ||
          (parameters.method === 'min' && aggregateValue > lowerValue) ||
          (parameters.method === 'max' && aggregateValue < upperValue) ||
          (
            parameters.method === 'median' &&
            lowerQuantile <= 0.5 &&
            upperQuantile >= 0.5 &&
            (
              aggregateValue < lowerValue ||
              aggregateValue > upperValue
            )
          ) ||
          (
            parameters.method === 'median' &&
            lowerQuantile === 0.5 &&
            aggregateValue !== lowerValue
          ) ||
          (
            parameters.method === 'median' &&
            upperQuantile === 0.5 &&
            aggregateValue !== upperValue
          ) ||
          (
            parameters.method === 'min' &&
            lowerQuantile === 0 &&
            aggregateValue !== lowerValue
          ) ||
          (
            parameters.method === 'max' &&
            upperQuantile === 1 &&
            aggregateValue !== upperValue
          );
      }
      if (inconsistent) {
        errors.push(relationError(
          `${basePath}/receipt/output/uncertainty`,
          'the aggregate center and descriptive interval violate a method-, quantile-, range-, or one-contributor identity.',
        ));
        break;
      }
    }
  }
  if (receipt.scientificOutputDigest !== canonicalDigest(output)) {
    errors.push(relationError(
      `${basePath}/receipt/scientificOutputDigest`,
      'the weight aggregate scientific-output digest does not bind its exact bounded output carrier.',
    ));
  }
  const outputUnits = asRecord(receipt.outputUnits) ?? {};
  if (
    outputUnits.timeUnit !== analysisWindow.unit ||
    outputUnits.valueUnit !== targetValueUnit
  ) {
    errors.push(relationError(
      `${basePath}/receipt/outputUnits`,
      'the weight aggregate output units do not match its analysis window and selected value carrier.',
    ));
  }
  const expectedInitialStateContributorIds = preparationEntries
    .filter((entry) =>
      entry.initialStateConsumedByDerivedAggregate === true)
    .map((entry) => asRecord(entry.seriesIdentity)?.edgeId);
  if (!sameCanonical(
    receipt.initialStateContributorIds,
    expectedInitialStateContributorIds,
  )) {
    errors.push(relationError(
      `${basePath}/receipt/initialStateContributorIds`,
      'the initial-state contributor list does not exactly equal the canonical batch entries marked as consumed by the derived aggregate.',
    ));
  }
  const expectedStateWitnessProjection = preparationEntries.flatMap((entry) =>
    asArray(entry.contextWitnesses)
      .map((candidate) => asRecord(candidate) ?? {})
      .filter((witness) =>
        witness.consultedByDerivedAggregate === true)
      .map((witness) => ({
        seriesIdentity: entry.seriesIdentity,
        role: witness.role,
        stateObservationIndex: witness.stateObservationIndex,
        observationDigest: witness.observationDigest,
      })));
  const expectedStateWitnessDigest = canonicalDigest({
    digestDomain:
      'cortexel.weight_trace.aggregate_members/v4/state-witnesses',
    payload: expectedStateWitnessProjection,
  });
  if (receipt.stateWitnessDigest !== expectedStateWitnessDigest) {
    errors.push(relationError(
      `${basePath}/receipt/stateWitnessDigest`,
      'the aggregate state-witness digest does not bind the normalized consulted-witness projection in the preceding preparation batch.',
    ));
  }
  if (
    dispersion?.kind === 'quantile_interval' &&
    !(
      typeof dispersion.lowerQuantile === 'number' &&
      typeof dispersion.upperQuantile === 'number' &&
      dispersion.lowerQuantile < dispersion.upperQuantile
    )
  ) {
    errors.push(relationError(
      `${basePath}/parameters/dispersion`,
      'the aggregate quantile interval is not strictly ordered.',
    ));
  }
  errors.push(...validateAggregateChainAndWrapper(
    operation,
    operationIndex,
    precedingBatch,
  ));
  return errors;
}

function validateCompartmentAggregateRelations(
  operation: JsonRecord,
  operationIndex: number,
  precedingBatch: JsonRecord,
  canonicalRequest: JsonRecord,
): CortexelError[] {
  const basePath = `/derivation/operations/${operationIndex}`;
  const errors: CortexelError[] = [];
  const parameters = asRecord(operation.parameters) ?? {};
  const receipt = asRecord(operation.receipt) ?? {};
  const requestParameters = asRecord(canonicalRequest.parameters) ?? {};
  const requestAggregate = asRecord(requestParameters.compartmentAggregate) ?? {};
  const data = asRecord(canonicalRequest.data) ?? {};
  const selectedIds = asArray(requestAggregate.compartmentIds);
  const series = asArray(data.series).map((candidate) => asRecord(candidate) ?? {});
  const selectedSeries = selectedIds.map((compartmentId) =>
    series.find((candidate) => candidate.compartmentId === compartmentId),
  );
  const selectedSeriesCounts = selectedIds.map((compartmentId) =>
    series.filter((candidate) => candidate.compartmentId === compartmentId).length,
  );
  const preparationEntries = asArray(
    asRecord(precedingBatch.receipt)?.seriesReceipts,
  ).map((candidate) => asRecord(candidate) ?? {});
  const selectedIdSet = new Set(selectedIds);
  const selectedDisplayRowCounts = preparationEntries
    .filter((entry) =>
      selectedIdSet.has(asRecord(entry.seriesIdentity)?.compartmentId))
    .map((entry) => {
      const displayView = asArray(entry.views)
        .map((candidate) => asRecord(candidate) ?? {})
        .find((view) => view.kind === 'display');
      return Number(displayView?.outputRowCount);
    });
  const weights = requestAggregate.weighting === 'declared'
    ? requestAggregate.weights
    : selectedIds.map(() => 1);
  const expectedScientificParameters: JsonRecord = {
    selectedCompartmentIds: selectedIds,
    method: requestAggregate.method,
    weighting: requestAggregate.weighting,
    weights,
    binary64Arithmetic: 'exact_products_and_cancellation_then_one_final_round',
    alignment: 'exact_accepted_time_only',
    duplicateReplicateAlignment: 'undefined_yields_missing',
    ...(requestAggregate.weightBasis !== undefined
      ? { weightBasis: requestAggregate.weightBasis }
      : {}),
  };
  const actualScientificParameters: JsonRecord = {
    selectedCompartmentIds: parameters.selectedCompartmentIds,
    method: parameters.method,
    weighting: parameters.weighting,
    weights: parameters.weights,
    binary64Arithmetic: parameters.binary64Arithmetic,
    alignment: parameters.alignment,
    duplicateReplicateAlignment: parameters.duplicateReplicateAlignment,
    ...(parameters.weightBasis !== undefined ? { weightBasis: parameters.weightBasis } : {}),
  };
  if (!sameCanonical(actualScientificParameters, expectedScientificParameters)) {
    errors.push(relationError(
      `${basePath}/parameters`,
      'the compartment aggregate parameters do not equal the explicit canonical-request selection and weighting controls.',
    ));
  }
  if (
    selectedSeries.some((candidate) => candidate === undefined) ||
    selectedSeriesCounts.some((count) => count !== 1) ||
    receipt.scientificInputDigest !== canonicalDigest(selectedSeries)
  ) {
    errors.push(relationError(
      `${basePath}/receipt/scientificInputDigest`,
      'the compartment aggregate scientific-input digest does not bind the explicitly selected canonical series.',
    ));
  }
  if (receipt.selectedCompartmentCount !== selectedIds.length) {
    errors.push(relationError(
      `${basePath}/receipt/selectedCompartmentCount`,
      'the selected compartment count does not equal the explicit selection length.',
    ));
  }
  const output = asRecord(receipt.output) ?? {};
  const outputTime = asRecord(output.time) ?? {};
  const outputValue = asRecord(output.value) ?? {};
  const times = asArray(outputTime.values);
  const values = asArray(outputValue.values);
  const expectedTimeUnit = requestWindow(data).unit;
  const expectedValueUnit = asRecord(series[0]?.values)?.unit;
  if (
    outputTime.unit !== expectedTimeUnit ||
    outputValue.unit !== expectedValueUnit
  ) {
    errors.push(relationError(
      `${basePath}/receipt/output`,
      'the compartment aggregate output axes do not use the canonical request time unit and selected value unit.',
    ));
  }
  if (
    receipt.evaluationCount !== times.length ||
    times.length !== values.length
  ) {
    errors.push(relationError(
      `${basePath}/receipt/evaluationCount`,
      'the compartment aggregate evaluation count does not equal both output-array lengths.',
    ));
  }
  const selectedPreparedRowSum = selectedDisplayRowCounts.reduce(
    (sum, count) => sum + count,
    0,
  );
  if (
    times.length > selectedPreparedRowSum ||
    (selectedPreparedRowSum === 0) !== (times.length === 0)
  ) {
    errors.push(relationError(
      `${basePath}/receipt/evaluationCount`,
      'the compartment union axis must be empty exactly when every selected prepared view is empty and cannot exceed their total row count.',
    ));
  }
  if (
    receipt.missingBecauseAbsentOrAmbiguousCount !==
      values.filter((candidate) => candidate === null).length
  ) {
    errors.push(relationError(
      `${basePath}/receipt/missingBecauseAbsentOrAmbiguousCount`,
      'the compartment aggregate missing count does not equal the null output count.',
    ));
  }
  if (
    times.some((candidate, index) =>
      index > 0 && typeof candidate === 'number' &&
      typeof times[index - 1] === 'number' &&
      candidate <= (times[index - 1] as number))
  ) {
    errors.push(relationError(
      `${basePath}/receipt/output/time/values`,
      'the compartment aggregate evaluation axis is not strictly increasing.',
    ));
  }
  const analysisWindow = requestWindow(data);
  if (times.some((time) => !timeIsInsideWindow(time, analysisWindow))) {
    errors.push(relationError(
      `${basePath}/receipt/output/time/values`,
      'a compartment aggregate evaluation time lies outside the declared analysis window.',
    ));
  }
  const expectedScientificOutputDigest = canonicalDigest({
    times,
    values,
    unit: outputValue.unit,
  });
  if (receipt.scientificOutputDigest !== expectedScientificOutputDigest) {
    errors.push(relationError(
      `${basePath}/receipt/scientificOutputDigest`,
      'the compartment aggregate scientific-output digest does not bind its exact emitted output arrays.',
    ));
  }
  const outputUnits = asRecord(receipt.outputUnits) ?? {};
  if (
    outputUnits.timeUnit !== outputTime.unit ||
    outputUnits.valueUnit !== outputValue.unit
  ) {
    errors.push(relationError(
      `${basePath}/receipt/outputUnits`,
      'the compartment aggregate output-unit receipt does not match its exact output carriers.',
    ));
  }
  errors.push(...validateAggregateChainAndWrapper(
    operation,
    operationIndex,
    precedingBatch,
  ));
  return errors;
}

function validateAggregateChainAndWrapper(
  operation: JsonRecord,
  operationIndex: number,
  precedingBatch: JsonRecord,
): CortexelError[] {
  const basePath = `/derivation/operations/${operationIndex}`;
  const errors: CortexelError[] = [];
  const parameters = asRecord(operation.parameters) ?? {};
  const receipt = asRecord(operation.receipt) ?? {};
  const batchOutputDigest = precedingBatch.outputDigest;
  if (
    parameters.preparationBatchOutputDigest !== batchOutputDigest ||
    receipt.preparationBatchOutputDigest !== batchOutputDigest
  ) {
    errors.push(relationError(
      `${basePath}/parameters/preparationBatchOutputDigest`,
      'the aggregate does not repeat the exact immediately preceding preparation-batch output digest in both chain carriers.',
    ));
  }
  const domain = String(parameters.digestDomain);
  const expectedInputDigest = operationDigest(domain, 'operation-input', {
    preparationBatchOutputDigest: batchOutputDigest,
    scientificInputDigest: receipt.scientificInputDigest,
  });
  if (operation.inputDigest !== expectedInputDigest) {
    errors.push(relationError(
      `${basePath}/inputDigest`,
      'the aggregate operation input digest does not bind its preparation batch and scientific input.',
    ));
  }
  const expectedOutputDigest = operationDigest(domain, 'operation-output', {
    scientificOutputDigest: receipt.scientificOutputDigest,
    outputUnits: receipt.outputUnits,
  });
  if (operation.outputDigest !== expectedOutputDigest) {
    errors.push(relationError(
      `${basePath}/outputDigest`,
      'the aggregate operation output digest does not bind its scientific output and output units.',
    ));
  }
  return errors;
}

/**
 * Bounded executable relations that Draft 2020-12 cannot express. This is part
 * of Cortexel's internal emission postcondition. It rebinds logical artifact
 * carriers and their published digest wrappers, but it does not inspect SVG
 * bytes and does not re-execute either trace aggregate's scientific calculation.
 */
function validateArtifactRelations(artifact: unknown): CortexelError[] {
  const root = asRecord(artifact) ?? {};
  const canonicalRequest = asRecord(root.canonicalRequest) ?? {};
  const provenance = asRecord(root.provenance) ?? {};
  const derivation = asRecord(root.derivation) ?? {};
  const operations = asArray(derivation.operations).map(
    (candidate) => asRecord(candidate) ?? {},
  );
  const errors: CortexelError[] = [];

  if (provenance.requestDigest !== canonicalDigest(canonicalRequest)) {
    errors.push(relationError(
      '/provenance/requestDigest',
      'the request digest does not bind the exact canonical request.',
    ));
  }

  const operationIds = new Set<string>();
  for (let index = 0; index < operations.length; index++) {
    const operation = operations[index];
    const id = operation.id;
    if (
      typeof id !== 'string' ||
      id.trim().length === 0 ||
      operationIds.has(id)
    ) {
      errors.push(relationError(
        `/derivation/operations/${index}/id`,
        'derivation operation ids must be nonblank and globally unique.',
      ));
    } else {
      operationIds.add(id);
    }
    if (operation.algorithm === 'cortexel.weight_trace.prepare_series_batch') {
      errors.push(...validateBatchRelations(
        operation,
        index,
        'weight',
        canonicalRequest,
      ));
    } else if (
      operation.algorithm === 'cortexel.compartment_trace.prepare_series_batch'
    ) {
      errors.push(...validateBatchRelations(
        operation,
        index,
        'compartment',
        canonicalRequest,
      ));
    } else if (
      operation.algorithm === 'cortexel.weight_trace.aggregate_members'
    ) {
      errors.push(...validateWeightAggregateRelations(
        operation,
        index,
        operations[index - 1] ?? {},
        canonicalRequest,
      ));
    } else if (
      operation.algorithm ===
        'cortexel.compartment_trace.aggregate_explicit_selection'
    ) {
      errors.push(...validateCompartmentAggregateRelations(
        operation,
        index,
        operations[index - 1] ?? {},
        canonicalRequest,
      ));
    }
  }

  if (
    root.artifactDigest !==
      canonicalDigestExcluding(root, 'artifactDigest')
  ) {
    errors.push(relationError(
      '/artifactDigest',
      'the artifact digest does not bind the complete logical artifact.',
    ));
  }
  return errors;
}

/**
 * Validate a library-generated FigureArtifactV1 before it can cross the render
 * boundary. JSON Schema closes every carrier; a bounded post-schema pass enforces
 * cross-carrier equalities and logical digest wrappers. This still is not detached
 * output verification because this function receives no SVG or table bytes.
 */
export function validateArtifactStructure(artifact: unknown): StructuralResult {
  if (artifactValidatorCompileError) {
    return {
      ok: false,
      errors: [relationError(
        '',
        `FigureArtifactV1 could not compile: ${artifactValidatorCompileError.message}.`,
      )],
    };
  }
  if (!artifactValidator) {
    try {
      artifactValidator = getAjv().compile(
        loadSchema('schemas/figure-artifact.v1.schema.json'),
      );
    } catch (error) {
      artifactValidatorCompileError = error instanceof Error
        ? error
        : new Error(String(error));
      return {
        ok: false,
        errors: [relationError(
          '',
          `FigureArtifactV1 could not compile: ${artifactValidatorCompileError.message}.`,
        )],
      };
    }
  }
  if (artifactValidator(artifact)) {
    try {
      const relationErrors = validateArtifactRelations(artifact);
      return relationErrors.length === 0
        ? { ok: true, errors: [] }
        : { ok: false, errors: finalizeErrors(relationErrors) };
    } catch (error) {
      return {
        ok: false,
        errors: [relationError(
          '',
          `FigureArtifactV1 relation evaluation failed closed: ${
            error instanceof Error ? error.message : String(error)
          }.`,
        )],
      };
    }
  }

  const errors = (artifactValidator.errors ?? []).map((error) =>
    makeError({
      code: 'INTERNAL_INVARIANT_VIOLATED',
      stage: 'internal',
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
      message:
        'the library assembled an artifact that violates FigureArtifactV1. No output was returned; this is an implementation defect, not a caller repair target.',
    }),
  );
  return { ok: false, errors: finalizeErrors(errors) };
}

/** Validate a request against its skill's composed schema. */
export function validateStructure(request: unknown, skillId: string): StructuralResult {
  const validate = getSkillValidator(skillId);

  if (!validate) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'SCHEMA_UNKNOWN_SKILL',
          stage: 'structural',
          instancePath: '/skill/id',
          message: `"${skillId}" is not a stable catalog id. Read STABLE_SKILL_IDS or run \`cortexel catalog\`.`,
        }),
      ],
    };
  }

  if (validate(request)) {
    return { ok: true, errors: [] };
  }

  const raw = validate.errors ?? [];
  const errors = raw
    // Ajv reports the failure of every oneOf branch plus the oneOf itself. The
    // branch failures are the useful ones; the "must match exactly one schema"
    // summary just tells the caller that something, somewhere, was wrong.
    .filter((error) => error.keyword !== 'oneOf' && error.keyword !== 'anyOf')
    .map((error) => translate(error, skillId));

  if (errors.length === 0 && raw.length > 0) {
    errors.push(translate(raw[0], skillId));
  }

  return { ok: false, errors };
}

/** The request envelope, for reading `skill.id` before dispatch. */
export function validateEnvelope(request: unknown): StructuralResult {
  const key = '__envelope__';
  let validate = compiled.get(key);
  if (!validate) {
    validate = getAjv().compile(loadSchema('schemas/figure-request.v1.schema.json'));
    compiled.set(key, validate);
  }
  if (validate(request)) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: (validate.errors ?? []).map((error) => translate(error, 'unknown')),
  };
}

export { CONTRACT_ROOT };
