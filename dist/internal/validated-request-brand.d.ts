//#region src/core/validated-request-brand.d.ts
/**
 * One package-private nominal type identity for every conditional declaration graph.
 *
 * Runtime authority remains the request module's private WeakSet. This type-only
 * brand prevents accidental structural construction while ensuring ESM and CommonJS
 * consumers name the same nominal identity instead of minting one `unique symbol` per
 * generated declaration bundle.
 */
declare const VALIDATED_REQUEST_NOMINAL_IDENTITY: unique symbol;
interface ValidatedRequestNominalBrand {
  readonly [VALIDATED_REQUEST_NOMINAL_IDENTITY]: true;
}
//#endregion
export { ValidatedRequestNominalBrand };
