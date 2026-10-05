//#region src/generated/identity.ts
/**
* GENERATED FILE — DO NOT EDIT.
*
* Produced by scripts/generate-contract.ts from contract/ (digest) and package.json (version).
* Edit the normative source and run `bun run generate`.
* `bun run check:generated` fails if this file drifts from its source.
*/
const PACKAGE_VERSION = "0.10.0-dev.0";
const REQUEST_CONTRACT = "cortexel-figure-request/1.0";
const ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";
const CONTRACT_DIGEST = "sha256:3c5c60c5a1751ce94c17a08601d49b94114b06c5fd50f5810e0ab354175c9bfc";
const CATALOG_DIGEST = "sha256:9db77ac767cf8b83c63ad9a67a07f9e7146541c3707bf7b0abb455421faf1e8e";
const CATALOG_DIGEST_DOMAIN = "cortexel-public-stable-catalog.v2";
const STABLE_SKILL_COUNT = 19;
/**
* Every identity axis, named.
*
* `sourceRevision` is the literal 'unreleased-worktree' unless a release build
* stamps it. A build that guessed at a release commit would be lying about its own
* provenance, which is worse than having none.
*/
function getBuildIdentity() {
	return Object.freeze({
		packageVersion: PACKAGE_VERSION,
		requestContract: REQUEST_CONTRACT,
		artifactContract: ARTIFACT_CONTRACT,
		contractDigest: CONTRACT_DIGEST,
		catalogDigest: CATALOG_DIGEST,
		stableSkillCount: 19,
		sourceRevision: "unreleased-worktree",
		release: false
	});
}

//#endregion
export { PACKAGE_VERSION as a, getBuildIdentity as c, CONTRACT_DIGEST as i, CATALOG_DIGEST as n, REQUEST_CONTRACT as o, CATALOG_DIGEST_DOMAIN as r, STABLE_SKILL_COUNT as s, ARTIFACT_CONTRACT as t };
//# sourceMappingURL=identity-D1-zCPe8.js.map