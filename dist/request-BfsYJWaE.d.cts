import { C as CortexelError } from './errors-DUbFUu6n.cjs';

/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/registries/budget-profiles.v1.json.
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */
declare const BUDGET_PROFILE_IDS: readonly ["standard", "agent"];
type BudgetProfileId = (typeof BUDGET_PROFILE_IDS)[number];

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
 *   6. CANONICAL   — materialize documented defaults and the resolved skill revision.
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

/** How the request entered, and what that boundary could certify. */
interface InputAssurance {
    readonly boundary: 'raw_json_text' | 'materialized_value';
    readonly duplicateKeys: 'rejected_before_materialization' | 'not_observable_after_materialization';
    readonly parserProfile: string;
    readonly budgetProfile: string;
}
declare const VALIDATED: unique symbol;
/**
 * A request that has actually been through the pipeline.
 *
 * The private symbol prevents accidental TypeScript construction. Runtime authority is
 * stronger: only object identities minted by this module are entered in a private
 * `WeakSet`. A proxy cannot forge membership with a `get` trap, and a copied object has
 * a different identity. The whole token is deeply frozen before it is minted so the
 * request and its digest cannot diverge after validation.
 */
interface ValidatedRequest {
    readonly [VALIDATED]: true;
    readonly skillId: string;
    readonly skillRevision: number;
    readonly canonicalRequest: Record<string, unknown>;
    readonly inputAssurance: InputAssurance;
    readonly requestDigest: string;
    readonly warnings: readonly CortexelError[];
    readonly checkedValidatorIds: readonly string[];
}
declare function isValidatedRequest(value: unknown): value is ValidatedRequest;
type ValidationOutcome = {
    readonly ok: true;
    readonly request: ValidatedRequest;
} | {
    readonly ok: false;
    readonly errors: readonly CortexelError[];
    readonly inputAssurance: InputAssurance;
};
interface ValidateOptions {
    readonly budgetProfile?: BudgetProfileId;
}
/**
 * Validate raw JSON TEXT.
 *
 * This is the strong boundary: it can certify that no object member appeared twice.
 * `cortexel validate file.json` uses it, and the artifact records
 * `duplicateKeys: "rejected_before_materialization"`.
 */
declare function parseAndValidateRequest(text: string, options?: ValidateOptions): ValidationOutcome;
/**
 * Validate an already-materialized JavaScript value.
 *
 * This boundary is WEAKER, and says so. By the time a JavaScript object exists,
 * `JSON.parse` has already collapsed any duplicate member and one value silently
 * won. No amount of inspection can recover which. So the assurance records
 * `not_observable_after_materialization` rather than implying a check that did not
 * happen — the honest answer, not the flattering one.
 */
declare function validateRequestValue(value: unknown, options?: ValidateOptions): ValidationOutcome;

export { type BudgetProfileId as B, type InputAssurance as I, type ValidateOptions as V, type ValidatedRequest as a, type ValidationOutcome as b, isValidatedRequest as i, parseAndValidateRequest as p, validateRequestValue as v };
