import { o as REQUEST_CONTRACT, t as ARTIFACT_CONTRACT } from "./identity-BD3MBqiL.js";

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
const REQUEST_CONTRACT_IDENTITY = splitContractIdentity(REQUEST_CONTRACT, "REQUEST_CONTRACT");
const ARTIFACT_CONTRACT_IDENTITY = splitContractIdentity(ARTIFACT_CONTRACT, "ARTIFACT_CONTRACT");

//#endregion
export { REQUEST_CONTRACT_IDENTITY as n, ARTIFACT_CONTRACT_IDENTITY as t };
//# sourceMappingURL=contract-identity-BBttDeUN.js.map