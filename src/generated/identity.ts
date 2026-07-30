/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/ (digest) and package.json (version).
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

export const PACKAGE_VERSION = "0.10.0-dev.0";
export const REQUEST_CONTRACT = "cortexel-figure-request/1.0";
export const ARTIFACT_CONTRACT = "cortexel-figure-artifact/1.0";
export const CONTRACT_DIGEST = "sha256:5fc7d5002259dc12b9195a086558a392e12032c6fda834ea3c4ec359b4b68004";
export const CATALOG_DIGEST = "sha256:e6779a03f2732831c3500df67b5a692d4348ed540f2cea744ad58cba9e615d6e";
export const CATALOG_DIGEST_DOMAIN = "cortexel-public-stable-catalog.v2";
export const STABLE_SKILL_COUNT = 19;

export interface BuildIdentity {
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
export function getBuildIdentity(): BuildIdentity {
  return Object.freeze({
    packageVersion: PACKAGE_VERSION,
    requestContract: REQUEST_CONTRACT,
    artifactContract: ARTIFACT_CONTRACT,
    contractDigest: CONTRACT_DIGEST,
    catalogDigest: CATALOG_DIGEST,
    stableSkillCount: STABLE_SKILL_COUNT,
    sourceRevision: 'unreleased-worktree',
    release: false,
  });
}
