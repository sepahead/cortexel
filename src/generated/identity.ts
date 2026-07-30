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
export const CONTRACT_DIGEST = "sha256:0b8afcc2682f41339d8e01776c485444edb3d88a457196a7f18b018d1ca84a6e";
export const CATALOG_DIGEST = "sha256:18fe441ad91d52651cbbe5efa063478a5c458560c29d20d541d63359722addd8";
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
