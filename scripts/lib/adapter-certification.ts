export interface AdapterCertificationImplementation {
  readonly skillId: string;
  readonly mappingId: string;
  readonly certificationRequirement: AdapterCertificationRequirementV1;
}

export interface AdapterCertificationRequirementV1 {
  readonly ledger: 'cortexel-release-evidence-ledger.v1';
  readonly gate: {
    readonly id: string;
    readonly section: string;
    readonly requirement: string;
    readonly releaseBlocking: true;
  };
  readonly conformanceProfile: {
    readonly registry: 'cortexel-adapter-conformance-profiles.v1';
    readonly id: string;
    readonly digestAlgorithm:
      'cortexel_adapter_conformance_profile_rfc8785_sha256_v1';
    readonly digest: `sha256:${string}`;
  };
}

export interface AdapterCertificationProjection {
  readonly requirement: AdapterCertificationRequirementV1 | null;
  readonly problems: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Derive the immutable certification requirement an executable adapter may publish.
 *
 * Mutable gate status and evidence are intentionally ignored. Stable releases use a
 * tested candidate A followed by an evidence-only authorization B; copying status or
 * receipts into packaged contract semantics would make that construction impossible.
 * The complete ledger is validated before this function is called.
 */
export function deriveAdapterCertificationRequirementV1(
  implementation: AdapterCertificationImplementation,
  gateValue: unknown,
): AdapterCertificationProjection {
  const label = `${implementation.skillId}/${implementation.mappingId}`;
  const expected = implementation.certificationRequirement;
  if (!isRecord(gateValue)) {
    return {
      requirement: null,
      problems: [`${label}: certification gate ${expected.gate.id} is missing`],
    };
  }

  const gate = gateValue;
  if (
    gate.id !== expected.gate.id ||
    gate.section !== expected.gate.section ||
    gate.requirement !== expected.gate.requirement ||
    gate.releaseBlocking !== expected.gate.releaseBlocking
  ) {
    return {
      requirement: null,
      problems: [
        `${label}: certification gate ${expected.gate.id} does not exactly match the immutable implementation requirement`,
      ],
    };
  }

  return {
    requirement: expected,
    problems: [],
  };
}
