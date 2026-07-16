/**
 * The validation pipeline.
 *
 * Stages, in this order, and the order is load-bearing:
 *
 *   1. BOUNDARY    — raw JSON text, or a safe snapshot of a JS value.
 *   2. AUTHORITY   — did the caller try to author a conclusion? Checked FIRST, on
 *                    the raw request, so a forbidden field cannot hide behind a
 *                    schema error or be smuggled in through a default.
 *   3. IDENTITY    — is this request written against a contract we implement?
 *   4. STRUCTURAL  — JSON Schema. Does it have the right shape?
 *   5. SEMANTIC    — the named rules. Does it MEAN anything?
 *   6. CANONICAL   — materialize documented defaults, record every conversion.
 *
 * A failure at any stage stops the pipeline. There is no partial success and no
 * "valid enough": the output of this function is either a canonical request that
 * every later stage may rely on, or a list of reasons it is not one.
 *
 * The returned success value is BRANDED. Rendering accepts only that brand, so a
 * plain object that merely looks like a validated request cannot be rendered — the
 * type system and a runtime symbol both refuse it. That is what makes "no renderer
 * may bypass validation" a fact rather than a convention.
 */

import { canonicalDigest } from './canonicalize.js';
import { deepFreeze } from './deep-freeze.js';
import {
  finalizeErrors,
  makeError,
  type CortexelError,
} from './errors.js';
import {
  DEFAULT_PROFILE,
  tryGetBudgetLimits,
  trySelectTighterBudgetProfile,
  type BudgetProfileId,
  type BudgetLimits,
} from './limits.js';
import { parseJsonStrict, type JsonValue } from './parse-json.js';
import { snapshotValue } from './safe-snapshot.js';
import { checkCallerAuthority, runSemanticValidators } from './semantics/index.js';
import { validateStructure } from './structural-validator.js';
import { SKILL_CATALOG, LEGACY_SKILL_MAP } from '../generated/catalog.js';
import { CONTRACT_DIGEST, REQUEST_CONTRACT } from '../generated/identity.js';

/** How the request entered, and what that boundary could certify. */
export interface InputAssurance {
  readonly boundary: 'raw_json_text' | 'materialized_value';
  readonly duplicateKeys:
    | 'rejected_before_materialization'
    | 'not_observable_after_materialization';
  readonly parserProfile: string;
  readonly budgetProfile: string;
}

const VALIDATED = Symbol('cortexel.validated');
const VALIDATED_REQUESTS = new WeakSet<object>();

/**
 * A request that has actually been through the pipeline.
 *
 * The private symbol prevents accidental TypeScript construction. Runtime authority is
 * stronger: only object identities minted by this module are entered in a private
 * `WeakSet`. A proxy cannot forge membership with a `get` trap, and a copied object has
 * a different identity. The whole token is deeply frozen before it is minted so the
 * request and its digest cannot diverge after validation.
 */
export interface ValidatedRequest {
  readonly [VALIDATED]: true;
  readonly skillId: string;
  readonly skillRevision: number;
  readonly canonicalRequest: Record<string, unknown>;
  readonly inputAssurance: InputAssurance;
  readonly requestDigest: string;
  readonly warnings: readonly CortexelError[];
  readonly checkedValidatorIds: readonly string[];
}

export function isValidatedRequest(value: unknown): value is ValidatedRequest {
  return typeof value === 'object' && value !== null && VALIDATED_REQUESTS.has(value);
}

export type ValidationOutcome =
  | { readonly ok: true; readonly request: ValidatedRequest }
  | { readonly ok: false; readonly errors: readonly CortexelError[]; readonly inputAssurance: InputAssurance };

export interface ValidateOptions {
  readonly budgetProfile?: BudgetProfileId;
}

function resolveBudgetProfile(options: ValidateOptions): {
  readonly profile: string;
  readonly limits?: BudgetLimits;
} {
  let requested: unknown = DEFAULT_PROFILE;
  try {
    if (options !== null && options !== undefined) {
      if (typeof options !== 'object') throw new Error('invalid options');
      const descriptor = Object.getOwnPropertyDescriptor(options, 'budgetProfile');
      if (descriptor !== undefined) {
        if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
          throw new Error('accessor-backed options');
        }
        requested = descriptor.value ?? DEFAULT_PROFILE;
      }
    }
  } catch {
    // An accessor or throwing Proxy is not an omission. Preserve it as invalid without
    // invoking ordinary getters or granting inherited properties resource authority.
    requested = null;
  }

  return {
    profile: typeof requested === 'string' ? requested : '<invalid>',
    limits: tryGetBudgetLimits(requested),
  };
}

function invalidBudgetProfile(assurance: InputAssurance): ValidationOutcome {
  return fail(
    [
      makeError({
        code: 'RESOURCE_BUDGET_PROFILE_UNKNOWN',
        stage: 'budget',
        message:
          'the selected budget profile is not in this build\'s closed registry. Unknown and inherited profile ids cannot disable resource limits.',
      }),
    ],
    assurance,
  );
}

/** Read the request's profile only after it has been reduced to a plain JSON tree. */
function requestedBudgetProfile(value: JsonValue): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_PROFILE;
  const presentation = (value as Record<string, unknown>).presentation;
  if (presentation === null || typeof presentation !== 'object' || Array.isArray(presentation)) {
    return DEFAULT_PROFILE;
  }
  return Object.prototype.hasOwnProperty.call(presentation, 'budgetProfile')
    ? (presentation as Record<string, unknown>).budgetProfile
    : DEFAULT_PROFILE;
}

function assuranceFor(
  boundary: InputAssurance['boundary'],
  profile: unknown,
): InputAssurance {
  return {
    boundary,
    duplicateKeys:
      boundary === 'raw_json_text'
        ? 'rejected_before_materialization'
        : 'not_observable_after_materialization',
    parserProfile:
      boundary === 'raw_json_text'
        ? 'cortexel-strict-json/1.0'
        : 'cortexel-safe-snapshot/1.0',
    budgetProfile: typeof profile === 'string' ? profile : '<invalid>',
  };
}

function fail(errors: readonly CortexelError[], assurance: InputAssurance): ValidationOutcome {
  return { ok: false, errors: finalizeErrors([...errors]), inputAssurance: assurance };
}

/** Read `skill.id` without trusting anything else about the value yet. */
function readSkillId(request: Record<string, unknown>): string | undefined {
  const skill = request.skill;
  if (typeof skill !== 'object' || skill === null || Array.isArray(skill)) return undefined;
  const id = (skill as Record<string, unknown>).id;
  return typeof id === 'string' ? id : undefined;
}

function checkIdentity(request: Record<string, unknown>): CortexelError[] {
  const errors: CortexelError[] = [];

  const contract = request.contract;
  if (typeof contract !== 'object' || contract === null || Array.isArray(contract)) {
    errors.push(
      makeError({
        code: 'CONTRACT_MISSING',
        stage: 'identity',
        instancePath: '/contract',
        message:
          'the request does not declare its contract. Add {"contract":{"name":"cortexel-figure-request","version":"1.0"}} — an undeclared contract is not a 1.0 request.',
        repair: {
          operation: 'add',
          path: '/contract',
          value: { name: 'cortexel-figure-request', version: '1.0' },
          reasonCode: 'CONTRACT_MISSING',
        },
      }),
    );
    return errors;
  }

  const record = contract as Record<string, unknown>;
  if (record.name !== 'cortexel-figure-request' || record.version !== '1.0') {
    errors.push(
      makeError({
        code: 'CONTRACT_UNSUPPORTED_VERSION',
        stage: 'identity',
        instancePath: '/contract',
        message: `this build implements ${REQUEST_CONTRACT}. Run \`cortexel identity --json\` to compare, or \`cortexel migrate\` to convert.`,
      }),
    );
  }

  // A caller MAY pin the digest. It can only ever narrow what it accepts — it can
  // never assert a digest this build does not have.
  const digest = request.contractDigest;
  if (typeof digest === 'string' && digest !== CONTRACT_DIGEST) {
    errors.push(
      makeError({
        code: 'CONTRACT_DIGEST_MISMATCH',
        stage: 'identity',
        instancePath: '/contractDigest',
        message: `the pinned contract digest does not match this build's (${CONTRACT_DIGEST}). The contract you validated against is not the contract in use; that is exactly what pinning is for.`,
      }),
    );
  }

  return errors;
}

function checkSkill(skillId: string | undefined): CortexelError[] {
  if (skillId === undefined) {
    return [
      makeError({
        code: 'SCHEMA_REQUIRED_PROPERTY_MISSING',
        stage: 'structural',
        instancePath: '/skill/id',
        message: 'the request does not name a skill.',
      }),
    ];
  }

  const entry = SKILL_CATALOG[skillId];

  if (entry && entry.status === 'stable') return [];

  // A pre-1.0 id gets its own diagnostic. Telling an agent "unknown skill" when the
  // real answer is "that id was renamed and here is the command" wastes a round trip
  // and invites it to guess.
  const legacy = LEGACY_SKILL_MAP[skillId];
  if (legacy) {
    return [
      makeError({
        code: 'MIGRATION_LEGACY_ID_NOT_ACCEPTED',
        stage: 'structural',
        instancePath: '/skill/id',
        message: `"${skillId}" is a pre-1.0 id. ${legacy.targetId ? `It maps to "${legacy.targetId}".` : ''} Run \`cortexel migrate\`. Legacy ids are never silently aliased: a silent alias would make the stored artifact ambiguous about which contract actually validated it.`,
        ...(legacy.targetId
          ? {
              repair: {
                operation: 'migrate' as const,
                path: '/skill/id',
                value: legacy.targetId,
                reasonCode: 'MIGRATION_LEGACY_ID_NOT_ACCEPTED',
              },
            }
          : {}),
      }),
    ];
  }

  if (entry && entry.status === 'experimental') {
    return [
      makeError({
        code: 'CAPABILITY_EXPERIMENTAL',
        stage: 'structural',
        instancePath: '/skill/id',
        message: `"${skillId}" is experimental and cannot be selected through the stable entry point. Import its explicit experimental subpath; it carries no contract, determinism, or accessibility guarantee.`,
      }),
    ];
  }

  return [
    makeError({
      code: 'SCHEMA_UNKNOWN_SKILL',
      stage: 'structural',
      instancePath: '/skill/id',
      message: `"${skillId}" is not in the stable catalog. Run \`cortexel catalog\`.`,
    }),
  ];
}

/**
 * Canonicalize.
 *
 * Deliberately conservative. It materializes documented defaults and orders
 * map-like records — and that is ALL. It never sorts an event sequence, never
 * deduplicates a sample, never infers a missing population, and never drops a field
 * it does not recognize. Canonicalization makes a request comparable; it must not
 * make it different.
 */
function canonicalizeRequest(request: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...request };

  const presentation = (out.presentation ?? {}) as Record<string, unknown>;
  out.presentation = {
    themeId: 'light',
    width: 720,
    height: 440,
    budgetProfile: 'standard',
    ...presentation,
  };

  return out;
}

/** The core of both public entry points. */
function validateSnapshot(
  value: JsonValue,
  assurance: InputAssurance,
): ValidationOutcome {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(
      [
        makeError({
          code: 'SCHEMA_TYPE_MISMATCH',
          stage: 'structural',
          message: 'a figure request must be a JSON object.',
        }),
      ],
      assurance,
    );
  }

  const request = value as Record<string, unknown>;

  // STAGE 2 — authority, first, on the raw request.
  const authorityErrors = checkCallerAuthority(request);
  if (authorityErrors.length > 0) return fail(authorityErrors, assurance);

  // STAGE 3 — identity.
  const identityErrors = checkIdentity(request);
  if (identityErrors.length > 0) return fail(identityErrors, assurance);

  const skillId = readSkillId(request);
  const skillErrors = checkSkill(skillId);
  if (skillErrors.length > 0 || skillId === undefined) return fail(skillErrors, assurance);

  const catalog = SKILL_CATALOG[skillId];

  // A pinned skill revision this build does not provide is refused rather than
  // approximated: "close enough" is not a property a scientific contract can have.
  const requestedRevision = (request.skill as Record<string, unknown>).revision;
  if (typeof requestedRevision === 'number' && requestedRevision !== catalog.revision) {
    return fail(
      [
        makeError({
          code: 'CONTRACT_SKILL_REVISION_UNSUPPORTED',
          stage: 'identity',
          instancePath: '/skill/revision',
          message: `this build provides ${skillId} revision ${catalog.revision}, not ${requestedRevision}. Omit the field to accept the installed revision.`,
        }),
      ],
      assurance,
    );
  }

  // STAGE 4 — structure.
  const structural = validateStructure(request, skillId);
  if (!structural.ok) return fail(structural.errors, assurance);

  // STAGE 5 — meaning.
  const semanticErrors = runSemanticValidators(request, skillId);
  const blocking = semanticErrors.filter((error) => error.severity === 'error');
  if (blocking.length > 0) return fail(semanticErrors, assurance);

  // STAGE 6 — canonicalize.
  const canonicalRequest = canonicalizeRequest(request);

  const validated = deepFreeze<ValidatedRequest>({
    [VALIDATED]: true,
    skillId,
    skillRevision: catalog.revision,
    canonicalRequest,
    inputAssurance: assurance,
    requestDigest: canonicalDigest(canonicalRequest),
    warnings: semanticErrors.filter((error) => error.severity === 'warning'),
    checkedValidatorIds: catalog.semanticValidators.map((validator) => validator.id),
  });
  VALIDATED_REQUESTS.add(validated);

  return { ok: true, request: validated };
}

/**
 * Validate raw JSON TEXT.
 *
 * This is the strong boundary: it can certify that no object member appeared twice.
 * `cortexel validate file.json` uses it, and the artifact records
 * `duplicateKeys: "rejected_before_materialization"`.
 */
export function parseAndValidateRequest(
  text: string,
  options: ValidateOptions = {},
): ValidationOutcome {
  const host = resolveBudgetProfile(options);
  let assurance = assuranceFor('raw_json_text', host.profile);

  if (!host.limits) return invalidBudgetProfile(assurance);

  if (typeof text !== 'string') {
    return fail(
      [
        makeError({
          code: 'JSON_SYNTAX',
          stage: 'parse',
          message: 'the raw request boundary accepts a JSON text string only.',
        }),
      ],
      assurance,
    );
  }

  let parsed = parseJsonStrict(text, { limits: host.limits });
  if (!parsed.ok) return fail(parsed.errors, assurance);

  const requested = requestedBudgetProfile(parsed.value);
  const effective = trySelectTighterBudgetProfile(host.profile, requested);
  assurance = assuranceFor('raw_json_text', effective?.profile ?? requested);
  if (!effective) return invalidBudgetProfile(assurance);

  // A request may narrow its own authority. Re-run the raw boundary under that tighter
  // envelope so the recorded profile covers bytes, depth, nodes, strings, and arrays —
  // not merely the later derivation/render stages.
  if (effective.profile !== host.profile) {
    parsed = parseJsonStrict(text, { limits: effective.limits });
    if (!parsed.ok) return fail(parsed.errors, assurance);
  }

  return validateSnapshot(parsed.value, assurance);
}

/**
 * Validate an already-materialized JavaScript value.
 *
 * This boundary is WEAKER, and says so. By the time a JavaScript object exists,
 * `JSON.parse` has already collapsed any duplicate member and one value silently
 * won. No amount of inspection can recover which. So the assurance records
 * `not_observable_after_materialization` rather than implying a check that did not
 * happen — the honest answer, not the flattering one.
 */
export function validateRequestValue(
  value: unknown,
  options: ValidateOptions = {},
): ValidationOutcome {
  const host = resolveBudgetProfile(options);
  let assurance = assuranceFor('materialized_value', host.profile);

  if (!host.limits) return invalidBudgetProfile(assurance);

  let snapshot = snapshotValue(value, host.limits);
  if (!snapshot.ok) return fail(snapshot.errors, assurance);

  const requested = requestedBudgetProfile(snapshot.value);
  const effective = trySelectTighterBudgetProfile(host.profile, requested);
  assurance = assuranceFor('materialized_value', effective?.profile ?? requested);
  if (!effective) return invalidBudgetProfile(assurance);

  if (effective.profile !== host.profile) {
    snapshot = snapshotValue(value, effective.limits);
    if (!snapshot.ok) return fail(snapshot.errors, assurance);
  }

  return validateSnapshot(snapshot.value, assurance);
}
