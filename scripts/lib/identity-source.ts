/** Pure, import-free closure checks for the normative identity registry. */

type JsonRecord = Record<string, any>;

export interface ContractIdentityAxis {
  readonly id: 'requestContract' | 'artifactContract';
  readonly value: string;
  readonly name: string;
  readonly version: string;
}

export interface ContractIdentitySource {
  readonly request: ContractIdentityAxis;
  readonly artifact: ContractIdentityAxis;
}

export interface ContractIdentityConsumers {
  readonly figureRequestSchema?: unknown;
  readonly figureArtifactSchema?: unknown;
  readonly skills?: readonly unknown[];
  readonly errorCodes?: unknown;
  readonly normativeSourceIncludes?: readonly string[];
}

const CONTRACT_VALUE = /^([a-z][a-z0-9-]*)\/((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/u;

const IDENTITY_AXIS_IDS = Object.freeze([
  'packageVersion',
  'requestContract',
  'artifactContract',
  'contractDigest',
  'catalogDigest',
  'skillRevision',
  'rendererRevision',
  'sourceRevision',
] as const);

const DIGEST_SOURCE_EXCLUSIONS = Object.freeze([
  'contract/manifest.v1.json — it cannot contain its own hash',
  'contract/conformance/** — vectors TEST the contract, they are not the contract',
  'contract/README.md — prose, not normative structure',
] as const);

const DIGEST_SOURCE_ALGORITHM = Object.freeze([
  'Canonicalize each JSON file with RFC 8785 (JSON Canonicalization Scheme).',
  'SHA-256 each canonical UTF-8 byte sequence.',
  'Sort entries by repository-relative path (UTF-8 byte order).',
  'SHA-256 the RFC 8785 canonical JSON of that sorted inventory.',
  'A short prefix may be DISPLAYED to a human. It is never an API value.',
] as const);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function contractAxis(
  value: unknown,
  id: ContractIdentityAxis['id'],
  problems: string[],
): ContractIdentityAxis | null {
  if (!isRecord(value) || !Array.isArray(value.axes)) return null;
  const matches = value.axes.filter((axis: unknown) => isRecord(axis) && axis.id === id);
  if (matches.length !== 1) {
    problems.push(`identity.axes: expected exactly one ${JSON.stringify(id)} axis`);
    return null;
  }
  const raw = matches[0].value;
  if (typeof raw !== 'string') {
    problems.push(`identity.axes.${id}.value: expected a string`);
    return null;
  }
  const match = CONTRACT_VALUE.exec(raw);
  if (!match) {
    problems.push(
      `identity.axes.${id}.value: expected a canonical lowercase contract-name/major.minor identity`,
    );
    return null;
  }
  return Object.freeze({ id, value: raw, name: match[1], version: match[2] });
}

function valueAt(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function assertExact(
  actual: unknown,
  expected: unknown,
  where: string,
  problems: string[],
): void {
  if (!jsonEqual(actual, expected)) {
    problems.push(`${where}: expected ${JSON.stringify(expected)}`);
  }
}

function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    // Parsed JSON arrays are dense and have no named enumerable members. Refuse a
    // sparse or decorated JavaScript array instead of accidentally treating a hole as
    // an exact match because Array#every skips absent indexes.
    if (Object.keys(left).length !== left.length || Object.keys(right).length !== right.length) {
      return false;
    }
    for (let index = 0; index < left.length; index++) {
      if (!jsonEqual(left[index], right[index])) return false;
    }
    return true;
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && jsonEqual(left[key], right[key]));
}

function requestEnvelopeProblems(
  request: unknown,
  identity: ContractIdentitySource,
  where: string,
  problems: string[],
): void {
  const contract = isRecord(request) ? request.contract : undefined;
  assertExact(
    contract,
    { name: identity.request.name, version: identity.request.version },
    `${where}.contract`,
    problems,
  );
}

/** Validate the registry itself and return its two executable contract axes. */
export function resolveContractIdentitySource(value: unknown): ContractIdentitySource {
  const problems: string[] = [];
  if (!isRecord(value)) {
    throw new Error('identity registry must contain an object');
  }
  if (value.registry !== 'cortexel-identity') {
    problems.push('identity.registry: expected "cortexel-identity"');
  }
  if (value.version !== '1.0') problems.push('identity.version: expected "1.0"');
  if (!Array.isArray(value.axes)) {
    problems.push('identity.axes: expected an array');
  } else {
    const ids = new Set<string>();
    value.axes.forEach((axis: unknown, index: number) => {
      if (!isRecord(axis) || typeof axis.id !== 'string' || axis.id.length === 0) {
        problems.push(`identity.axes[${index}].id: expected a non-empty string`);
        return;
      }
      if (ids.has(axis.id)) problems.push(`identity.axes: duplicate axis ${JSON.stringify(axis.id)}`);
      ids.add(axis.id);
    });
    for (const id of IDENTITY_AXIS_IDS) {
      if (!ids.has(id)) problems.push(`identity.axes: missing required v1 axis ${JSON.stringify(id)}`);
    }
    for (const id of ids) {
      if (!(IDENTITY_AXIS_IDS as readonly string[]).includes(id)) {
        problems.push(`identity.axes: unknown v1 axis ${JSON.stringify(id)}`);
      }
    }
  }
  assertExact(
    valueAt(value, ['digestSourceSet', 'exclude']),
    DIGEST_SOURCE_EXCLUSIONS,
    'identity.digestSourceSet.exclude',
    problems,
  );
  assertExact(
    valueAt(value, ['digestSourceSet', 'algorithm']),
    DIGEST_SOURCE_ALGORITHM,
    'identity.digestSourceSet.algorithm',
    problems,
  );
  const request = contractAxis(value, 'requestContract', problems);
  const artifact = contractAxis(value, 'artifactContract', problems);
  if (request && artifact && request.name === artifact.name) {
    problems.push('identity requestContract and artifactContract names must be distinct');
  }
  if (problems.length > 0 || !request || !artifact) {
    throw new Error(`invalid identity registry: ${problems.join('; ')}`);
  }
  return Object.freeze({ request, artifact });
}

/**
 * Close every normative source consumer over the registry-owned identities.
 *
 * Generated projections derive from the returned axes. The authored envelope/artifact
 * schemas and living examples cannot be derived without erasing their reviewable source,
 * so they are exact-asserted instead.
 */
export function contractIdentitySourceProblems(
  value: unknown,
  consumers: ContractIdentityConsumers = {},
): readonly string[] {
  let identity: ContractIdentitySource;
  try {
    identity = resolveContractIdentitySource(value);
  } catch (error) {
    return Object.freeze([error instanceof Error ? error.message : String(error)]);
  }

  const problems: string[] = [];
  if (consumers.normativeSourceIncludes !== undefined) {
    assertExact(
      valueAt(value, ['digestSourceSet', 'include']),
      consumers.normativeSourceIncludes,
      'identity.digestSourceSet.include',
      problems,
    );
  }
  if (consumers.figureRequestSchema !== undefined) {
    const schema = consumers.figureRequestSchema;
    assertExact(
      valueAt(schema, ['properties', 'contract', 'properties', 'name', 'const']),
      identity.request.name,
      'figure-request schema contract.name.const',
      problems,
    );
    assertExact(
      valueAt(schema, ['properties', 'contract', 'properties', 'version', 'enum']),
      [identity.request.version],
      'figure-request schema contract.version.enum',
      problems,
    );
  }

  if (consumers.figureArtifactSchema !== undefined) {
    const schema = consumers.figureArtifactSchema;
    assertExact(
      valueAt(schema, ['properties', 'artifact', 'properties', 'name', 'const']),
      identity.artifact.name,
      'figure-artifact schema artifact.name.const',
      problems,
    );
    assertExact(
      valueAt(schema, ['properties', 'artifact', 'properties', 'version', 'enum']),
      [identity.artifact.version],
      'figure-artifact schema artifact.version.enum',
      problems,
    );
    assertExact(
      valueAt(schema, ['properties', 'buildIdentity', 'properties', 'requestContract', 'const']),
      identity.request.value,
      'figure-artifact schema buildIdentity.requestContract.const',
      problems,
    );
    assertExact(
      valueAt(schema, ['properties', 'buildIdentity', 'properties', 'artifactContract', 'const']),
      identity.artifact.value,
      'figure-artifact schema buildIdentity.artifactContract.const',
      problems,
    );
  }

  consumers.skills?.forEach((skill, skillIndex) => {
    const source = isRecord(skill) ? skill : {};
    const label = typeof source.id === 'string' ? source.id : `index ${skillIndex}`;
    const valid = isRecord(source.examples) && Array.isArray(source.examples.valid)
      ? source.examples.valid
      : [];
    const invalid = isRecord(source.examples) && Array.isArray(source.examples.invalid)
      ? source.examples.invalid
      : [];
    valid.forEach((request: unknown, index: number) =>
      requestEnvelopeProblems(request, identity, `skill ${label} examples.valid[${index}]`, problems));
    invalid.forEach((example: unknown, index: number) =>
      requestEnvelopeProblems(
        isRecord(example) ? example.request : undefined,
        identity,
        `skill ${label} examples.invalid[${index}].request`,
        problems,
      ));
  });

  if (consumers.errorCodes !== undefined) {
    const codes = isRecord(consumers.errorCodes) && Array.isArray(consumers.errorCodes.codes)
      ? consumers.errorCodes.codes
      : [];
    const missing = codes.filter((code: unknown) => isRecord(code) && code.code === 'CONTRACT_MISSING');
    if (missing.length !== 1) {
      problems.push('error-codes: expected exactly one CONTRACT_MISSING record');
    } else {
      assertExact(
        missing[0].correctiveAction,
        `Add ${JSON.stringify({
          contract: { name: identity.request.name, version: identity.request.version },
        })}.`,
        'error-codes CONTRACT_MISSING.correctiveAction',
        problems,
      );
    }
  }

  return Object.freeze(problems);
}
