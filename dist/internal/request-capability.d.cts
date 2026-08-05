import { t as BudgetProfileId } from "../budgets-DXJ69wrM.cjs";
import { t as CortexelError } from "../errors-DLTGhSm-.cjs";
import { h as StableSkillId } from "../catalog-Dp61sMhe.cjs";
import { ValidatedRequestNominalBrand } from "#cortexel-validated-request-brand";
//#region src/core/requestBoundary.internal.d.ts
interface InputAssurance {
  readonly boundary: 'raw_json_text' | 'materialized_value';
  readonly duplicateKeys: 'rejected_before_materialization' | 'not_observable_after_materialization';
  readonly parserProfile: string;
  readonly budgetProfile: string;
}
//#endregion
//#region src/core/request.d.ts
/**
 * A request that has actually been through the pipeline.
 *
 * One package-private nominal type identity prevents accidental TypeScript construction
 * across both conditional declaration graphs. Runtime authority is stronger: only
 * object identities minted by this module are entered in a private
 * `WeakSet`. A proxy cannot forge membership with a `get` trap, and a copied object has
 * a different identity. The whole token is deeply frozen before it is minted so the
 * request and its digest cannot diverge after validation.
 */
interface ValidatedRequest extends ValidatedRequestNominalBrand {
  readonly skillId: StableSkillId;
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
//#endregion
export { type InputAssurance, ValidateOptions, ValidatedRequest, ValidationOutcome, isValidatedRequest, parseAndValidateRequest, validateRequestValue };
