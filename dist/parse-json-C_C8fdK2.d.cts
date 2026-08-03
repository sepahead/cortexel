import { r as Result } from "./errors-DLTGhSm-.cjs";
//#region src/core/parse-json.d.ts
/** A value inside the JSON domain, with objects null-prototyped. */
type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
interface JsonObject {
  [key: string]: JsonValue;
}
/**
 * The complete authority the raw JSON parser consumes.
 *
 * Keep this seven-field boundary independent from the generated visualization
 * budget registry. A public `BudgetLimits` value is a structural superset, while
 * private protocols can own a tighter parser profile without creating a runtime
 * dependency on generated contract output.
 */
interface JsonParseLimits {
  readonly rawInputBytes: number;
  readonly jsonDepth: number;
  readonly jsonTotalNodes: number;
  readonly jsonStringLength: number;
  readonly jsonNumberTokenLength: number;
  readonly jsonObjectKeys: number;
  readonly jsonArrayItems: number;
}
interface ParseOptions {
  readonly limits: JsonParseLimits;
  /** Reject a leading UTF-8 BOM. Identical in TypeScript and Python. */
  readonly allowBom?: boolean;
}
/**
 * Parse raw JSON text strictly.
 *
 * This is the ONLY entry point that can certify duplicate-member rejection, which
 * is why `cortexel validate file.json` uses it and why the resulting artifact
 * records `duplicateKeys: "rejected_before_materialization"`.
 */
declare function parseJsonStrict(text: string, options: ParseOptions): Result<JsonValue>;
//#endregion
export { parseJsonStrict as n, JsonValue as t };
