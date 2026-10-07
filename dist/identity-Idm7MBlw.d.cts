//#region src/generated/identity.d.ts
/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/ (digest) and package.json (version).
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */
declare const PACKAGE_VERSION = "0.10.0-dev.0";
declare const REQUEST_CONTRACT = "cortexel-figure-request/1.0";
declare const ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";
declare const CONTRACT_DIGEST = "sha256:3c5c60c5a1751ce94c17a08601d49b94114b06c5fd50f5810e0ab354175c9bfc";
declare const CATALOG_DIGEST = "sha256:9db77ac767cf8b83c63ad9a67a07f9e7146541c3707bf7b0abb455421faf1e8e";
declare const CATALOG_DIGEST_DOMAIN = "cortexel-public-stable-catalog.v2";
declare const STABLE_SKILL_COUNT = 19;
interface BuildIdentity {
  readonly packageVersion: string;
  readonly requestContract: string;
  readonly artifactContract: string;
  readonly contractDigest: string;
  readonly catalogDigest: string;
  readonly stableSkillCount: number;
  readonly sourceRevision: string;
  readonly release: boolean;
}
/**
 * Every identity axis, named.
 *
 * `sourceRevision` is the literal 'unreleased-worktree' unless a release build
 * stamps it. A build that guessed at a release commit would be lying about its own
 * provenance, which is worse than having none.
 */
declare function getBuildIdentity(): BuildIdentity;
//#endregion
export { CONTRACT_DIGEST as a, STABLE_SKILL_COUNT as c, CATALOG_DIGEST_DOMAIN as i, getBuildIdentity as l, BuildIdentity as n, PACKAGE_VERSION as o, CATALOG_DIGEST as r, REQUEST_CONTRACT as s, ARTIFACT_CONTRACT as t };
