const require_identity = require('./identity-Dt42RQe6.cjs');

//#region src/core/contract-identity.ts
/** Internal named projections of the generated registry-owned contract identities. */
const CONTRACT_VALUE = /^([a-z][a-z0-9-]*)\/((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/u;
function splitContractIdentity(value, axis) {
	const match = CONTRACT_VALUE.exec(value);
	if (!match) throw new Error(`${axis} is not a canonical contract-name/major.minor identity`);
	return Object.freeze({
		value,
		name: match[1],
		version: match[2]
	});
}
const REQUEST_CONTRACT_IDENTITY = splitContractIdentity(require_identity.REQUEST_CONTRACT, "REQUEST_CONTRACT");
const ARTIFACT_CONTRACT_IDENTITY = splitContractIdentity(require_identity.ARTIFACT_CONTRACT, "ARTIFACT_CONTRACT");

//#endregion
Object.defineProperty(exports, 'ARTIFACT_CONTRACT_IDENTITY', {
  enumerable: true,
  get: function () {
    return ARTIFACT_CONTRACT_IDENTITY;
  }
});
Object.defineProperty(exports, 'REQUEST_CONTRACT_IDENTITY', {
  enumerable: true,
  get: function () {
    return REQUEST_CONTRACT_IDENTITY;
  }
});
//# sourceMappingURL=contract-identity-Cna7a4hn.cjs.map