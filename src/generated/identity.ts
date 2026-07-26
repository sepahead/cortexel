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
export const CONTRACT_DIGEST = "sha256:ba52f26842cfc452532936e39f78e63a8095fdaa7e401b5618ac0af25f1b553a";
export const CATALOG_DIGEST = "sha256:b267cf79a79862230d7f54e35b9f4b4bc54634fa21721ca1b8f3ef4a98d3f8af";
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
