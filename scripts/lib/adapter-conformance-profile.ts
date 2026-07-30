import { canonicalize } from '../../src/core/canonicalize.js';
import { sha256Hex } from '../../src/core/sha256.js';

export const ADAPTER_CONFORMANCE_PROFILE_DIGEST_ALGORITHM_V1 =
  'cortexel_adapter_conformance_profile_rfc8785_sha256_v1';
const ADAPTER_CONFORMANCE_PROFILE_DIGEST_DOMAIN_V1 =
  'cortexel.adapter-conformance-profile.v1';

export interface AdapterConformanceProfileIdentityV1 {
  readonly registry: 'cortexel-adapter-conformance-profiles.v1';
  readonly id: string;
  readonly digestAlgorithm:
    'cortexel_adapter_conformance_profile_rfc8785_sha256_v1';
  readonly digest: `sha256:${string}`;
}

export interface AdapterConformanceProfileProjectionV1 {
  readonly profile: Record<string, unknown> | null;
  readonly problems: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Canonical content identity of one profile, excluding its registry container. */
export function adapterConformanceProfileDigestV1(
  profile: Record<string, unknown>,
): `sha256:${string}` {
  return `sha256:${sha256Hex(canonicalize({
    domain: ADAPTER_CONFORMANCE_PROFILE_DIGEST_DOMAIN_V1,
    profile,
  } as never))}`;
}

/**
 * Resolve an implementation-owned profile identity against the normative registry.
 *
 * JSON Schema validates each record's shape. This helper owns the relations JSON
 * Schema cannot express: unique profile identity, exact lookup, and recomputation of
 * the non-circular canonical digest. A prose record with a copied digest therefore
 * cannot become executable certification authority.
 */
export function resolveAdapterConformanceProfileV1(
  identity: AdapterConformanceProfileIdentityV1,
  registryValue: unknown,
): AdapterConformanceProfileProjectionV1 {
  if (!isRecord(registryValue) || !Array.isArray(registryValue.profiles)) {
    return {
      profile: null,
      problems: ['adapter conformance profile registry is missing its profiles array'],
    };
  }

  const profilesById = new Map<string, Record<string, unknown>>();
  const problems: string[] = [];
  if (
    identity.digestAlgorithm !==
      ADAPTER_CONFORMANCE_PROFILE_DIGEST_ALGORITHM_V1
  ) {
    problems.push(
      `adapter conformance profile ${JSON.stringify(identity.id)} uses unknown digest algorithm ${JSON.stringify(identity.digestAlgorithm)}`,
    );
  }
  for (const [index, value] of registryValue.profiles.entries()) {
    if (!isRecord(value) || typeof value.id !== 'string') continue;
    if (profilesById.has(value.id)) {
      problems.push(
        `adapter conformance profiles[${index}]: duplicate id ${JSON.stringify(value.id)}`,
      );
      continue;
    }
    profilesById.set(value.id, value);
  }

  const profile = profilesById.get(identity.id);
  if (profile === undefined) {
    problems.push(
      `adapter conformance profile ${JSON.stringify(identity.id)} is missing from ${identity.registry}`,
    );
    return { profile: null, problems };
  }

  const actualDigest = adapterConformanceProfileDigestV1(profile);
  if (actualDigest !== identity.digest) {
    problems.push(
      `adapter conformance profile ${JSON.stringify(identity.id)} digest mismatch: expected ${identity.digest}, recomputed ${actualDigest}`,
    );
  }
  return { profile, problems };
}
