// src/generated/identity.ts
var PACKAGE_VERSION = "0.10.0-dev.0";
var REQUEST_CONTRACT = "cortexel-figure-request/1.0";
var ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";
var CONTRACT_DIGEST = "sha256:a710ef28247ab8c3e49ebf80b30bfcbacc6c64768d8a836828f78eeb4cac597b";
var CATALOG_DIGEST = "sha256:e6ef9014ca56f4bd159f8b3545ba8d7cf0241550ff25b9de44b05fde826f0dd5";
var CATALOG_DIGEST_DOMAIN = "cortexel-public-stable-catalog.v2";
var STABLE_SKILL_COUNT = 19;
function getBuildIdentity() {
  return Object.freeze({
    packageVersion: PACKAGE_VERSION,
    requestContract: REQUEST_CONTRACT,
    artifactContract: ARTIFACT_CONTRACT,
    contractDigest: CONTRACT_DIGEST,
    catalogDigest: CATALOG_DIGEST,
    stableSkillCount: STABLE_SKILL_COUNT,
    sourceRevision: "unreleased-worktree",
    release: false
  });
}

export {
  PACKAGE_VERSION,
  REQUEST_CONTRACT,
  ARTIFACT_CONTRACT,
  CONTRACT_DIGEST,
  CATALOG_DIGEST,
  CATALOG_DIGEST_DOMAIN,
  STABLE_SKILL_COUNT,
  getBuildIdentity
};
//# sourceMappingURL=chunk-5FW7Q3ZT.js.map