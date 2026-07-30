// src/generated/identity.ts
var PACKAGE_VERSION = "0.10.0-dev.0";
var REQUEST_CONTRACT = "cortexel-figure-request/1.0";
var ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";
var CONTRACT_DIGEST = "sha256:0b8afcc2682f41339d8e01776c485444edb3d88a457196a7f18b018d1ca84a6e";
var CATALOG_DIGEST = "sha256:18fe441ad91d52651cbbe5efa063478a5c458560c29d20d541d63359722addd8";
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

// src/core/deep-freeze.ts
function deepFreeze(value, seen = /* @__PURE__ */ new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  const object = value;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(value)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}
function freezeGenerated(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeGenerated(item)));
  }
  const clone = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(value)) {
    clone[key] = freezeGenerated(value[key]);
  }
  return Object.freeze(clone);
}

export {
  PACKAGE_VERSION,
  REQUEST_CONTRACT,
  ARTIFACT_CONTRACT,
  CONTRACT_DIGEST,
  CATALOG_DIGEST,
  CATALOG_DIGEST_DOMAIN,
  STABLE_SKILL_COUNT,
  getBuildIdentity,
  deepFreeze,
  freezeGenerated
};
//# sourceMappingURL=chunk-PZCDM4HZ.js.map