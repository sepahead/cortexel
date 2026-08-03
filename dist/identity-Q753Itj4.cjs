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
const CONTRACT_DIGEST = "sha256:61286a89091acaaee0ffb70b377b176cdea460f680d8ea0a7ef3f19da4da6dd0";
const CATALOG_DIGEST = "sha256:e6ef9014ca56f4bd159f8b3545ba8d7cf0241550ff25b9de44b05fde826f0dd5";
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
Object.defineProperty(exports, 'ARTIFACT_CONTRACT', {
  enumerable: true,
  get: function () {
    return ARTIFACT_CONTRACT;
  }
});
Object.defineProperty(exports, 'CATALOG_DIGEST', {
  enumerable: true,
  get: function () {
    return CATALOG_DIGEST;
  }
});
Object.defineProperty(exports, 'CATALOG_DIGEST_DOMAIN', {
  enumerable: true,
  get: function () {
    return CATALOG_DIGEST_DOMAIN;
  }
});
Object.defineProperty(exports, 'CONTRACT_DIGEST', {
  enumerable: true,
  get: function () {
    return CONTRACT_DIGEST;
  }
});
Object.defineProperty(exports, 'PACKAGE_VERSION', {
  enumerable: true,
  get: function () {
    return PACKAGE_VERSION;
  }
});
Object.defineProperty(exports, 'REQUEST_CONTRACT', {
  enumerable: true,
  get: function () {
    return REQUEST_CONTRACT;
  }
});
Object.defineProperty(exports, 'STABLE_SKILL_COUNT', {
  enumerable: true,
  get: function () {
    return STABLE_SKILL_COUNT;
  }
});
Object.defineProperty(exports, 'getBuildIdentity', {
  enumerable: true,
  get: function () {
    return getBuildIdentity;
  }
});
//# sourceMappingURL=identity-Q753Itj4.cjs.map