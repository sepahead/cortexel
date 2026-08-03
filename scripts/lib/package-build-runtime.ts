/** Closed Node policy for source-only package construction. */

export const PACKAGE_BUILD_NODE_RANGE = '^22.18.0 || ^24.11.0 || ^26.0.0';

export interface PackageBuildRuntimeIdentity {
  readonly releaseName: unknown;
  readonly nodeVersion: unknown;
  readonly hasBunVersionMarker: unknown;
  readonly hasDenoVersionMarker: unknown;
}

const FINAL_CORE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/**
 * The packed runtime supports lower Node 22/24 floors than tsdown. Keep that
 * build-tool constraint out of published package metadata and enforce it only
 * immediately before source construction. Known compatibility-runtime markers
 * are a nominal fail-closed check, not runtime provenance or authentication.
 */
export function supportsPackageBuildNodeVersion(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = FINAL_CORE_VERSION.exec(value);
  if (match === null) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return (
    (major === 22 && minor >= 18)
    || (major === 24 && minor >= 11)
    || major === 26
  );
}

export function supportsPackageBuildRuntime(
  identity: PackageBuildRuntimeIdentity,
): boolean {
  return (
    identity.releaseName === 'node'
    && identity.hasBunVersionMarker === false
    && identity.hasDenoVersionMarker === false
    && supportsPackageBuildNodeVersion(identity.nodeVersion)
  );
}
