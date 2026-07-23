/** Closed structural and semantic integrity checks for the numeric-policy registry. */

import { canonicalDigest, type JsonValue } from '../../src/core/canonicalize.js';

const ALGORITHM_ID = 'cortexel_binary64_nominal_interval_candidates_v1';
const ALGORITHM_SEMANTIC_ID =
  'cortexel_binary64_nominal_interval_candidates_semantics_v1';
const SPATIAL_ALGORITHM_ID = 'cortexel_binary64_spatial_domain_axis_v1';
const SPATIAL_ALGORITHM_SEMANTIC_ID =
  'cortexel_binary64_spatial_domain_axis_semantics_v1';
const SEMANTIC_VERSION = '1.0';
const SEMANTIC_STATUS = 'normative';
const EXPECTED_REGISTRY_DESCRIPTION_DIGEST =
  'sha256:f903d67e7de555bb5ce1e14332f719914fcdce476d4ff2fe3ba0acfffbea5db4';
const EXPECTED_ALGORITHM_PROSE_DIGEST =
  'sha256:d495009f265189d99a62497eeff696df0d0919f9f7f5931c8c43e3ea5e0b4e86';
const EXPECTED_SPATIAL_ALGORITHM_PROSE_DIGEST =
  'sha256:eda4a0e7c368d11829e832ba69b393d2e27305e5e912a95eb29e534daa58e00b';

const EXPECTED_SEMANTIC_AUTHORITY = {
  id: 'cortexel_numeric_semantics_registry_v1',
  version: SEMANTIC_VERSION,
  normativeFields: ['algorithms[].semantics', 'policies[].semantics'],
  proseRole: 'pinned_explanatory_mirror_only',
  changePolicy: 'change_semantic_id_or_version_before_changing_meaning',
} as const;

const EXPECTED_ALGORITHM_SEMANTIC_PARAMETERS = {
  numberFormat: 'ieee754_binary64',
  binary64Epsilon: Number.EPSILON,
  arithmeticRoundingMode: 'roundTiesToEven',
  coefficientEncoding: 'signed_integer_times_two_to_binary_exponent',
  coefficientBinaryExponent: -1074,
  negativeZeroPolicy: 'canonical_positive_zero',
  rangeRule: 'width_positive_and_stop_strictly_greater_than_start',
  quotientRule: 'round_exact_span_over_width_once_to_binary64',
  intervalCountRule: 'nearest_integer_ties_toward_positive_infinity',
  quotientToleranceEpsilonMultiplier: 8,
  quotientToleranceScale: 'max_one_abs_rounded_quotient',
  quotientToleranceArithmetic: 'binary64_left_to_right',
  maximumMaterializedIntervals: 100_000,
  maximumSafeInteger: Number.MAX_SAFE_INTEGER,
  internalEdgeRule: 'round_exact_start_plus_index_times_width_once_to_binary64',
  internalEdgeOrder: 'strictly_increasing_and_strictly_below_submitted_stop',
  nonzeroInternalEdgeUnderflowPolicy: 'refuse_unrepresentable',
  reconstructedStopRule: 'round_exact_start_plus_count_times_width_once_to_binary64',
  endpointToleranceEpsilonMultiplier: 8,
  endpointToleranceScale: 'max_one_abs_start_abs_stop_abs_reconstructed_stop',
  endpointToleranceArithmetic: 'binary64_left_to_right',
  finalEdgeAuthority: 'submitted_stop',
  exposureClaim: 'endpoint_pairs_authoritative_no_uniform_exposure',
  nonfiniteInputFailureClass: 'nonfinite',
  invalidRangeFailureClass: 'invalid_range',
  tilingMismatchFailureClass: 'non_tiling',
  budgetOrQuotientOverflowFailureClass: 'too_many',
  edgeRepresentationFailureClass: 'unrepresentable',
} as const;

const EXPECTED_SPATIAL_ALGORITHM_SEMANTIC_PARAMETERS = {
  numberFormat: 'ieee754_binary64',
  binary64Epsilon: Number.EPSILON,
  arithmeticRoundingMode: 'roundTiesToEven',
  coefficientEncoding: 'signed_integer_times_two_to_binary_exponent',
  coefficientBinaryExponent: -1074,
  negativeZeroPolicy: 'canonical_positive_zero',
  extentRule: 'finite_strictly_positive',
  endpointRule: 'round_exact_two_center_plus_or_minus_extent_over_two_once',
  endpointOrder: 'finite_strictly_increasing',
  endpointRoundingCapEpsilonMultiplier: 32,
  endpointRoundingCapScale: 'declared_extent_only',
  membershipBoundary: 'closed',
  membershipToleranceEpsilonMultiplier: 8,
  membershipToleranceScale: 'declared_extent_only',
  membershipAllowance: 'relative_tolerance_plus_exact_compared_endpoint_rounding_error',
  comparisonArithmetic: 'exact_min_subnormal_integer_cross_multiplication',
  absoluteOriginPolicy: 'never_scales_tolerance',
  nonfiniteInputFailureClass: 'nonfinite',
  invalidExtentFailureClass: 'invalid_extent',
  representationFailureClass: 'unrepresentable',
} as const;

const POLICY_BINDINGS = {
  cortexel_binary64_uniform_exposure_bins_v1: {
    algorithmId: ALGORITHM_ID,
    semanticId: 'cortexel_binary64_uniform_exposure_bins_semantics_v1',
    resultNoun: 'bin',
    boundary: '[start,stop)',
    partialIntervalPolicy: 'refuse_nominal_remainder_and_nonuniform_physical_exposure',
    intervalExposure: 'require_every_exact_physical_endpoint_difference_to_equal_original_typed_width',
    declaredCountBinding: 'must_equal_interval_count',
    coordinateSelection: 'all_adjacent_emitted_edge_pairs',
    exposureComparison: 'exact_registered_unit_rational_equality_without_conversion_rounding',
    exposureMismatchPolicy: 'reject_first_mismatch',
    proseDigest: 'sha256:4b67710ce92d1ae30814af7f6eca39bae6a6f560d0950e648b830f2db20b4190',
  },
  cortexel_binary64_nominal_steps_v1: {
    algorithmId: ALGORITHM_ID,
    semanticId: 'cortexel_binary64_nominal_steps_semantics_v1',
    resultNoun: 'sample step',
    boundary: '[start,stop)',
    partialIntervalPolicy: 'refuse_nominal_remainder',
    intervalExposure: 'emitted_coordinates_authoritative_no_equal_exposure_claim',
    declaredCountBinding: 'must_equal_interval_count',
    coordinateSelection: 'first_interval_count_emitted_edges_excluding_stop',
    exposureComparison: 'none',
    exposureMismatchPolicy: 'not_applicable',
    proseDigest: 'sha256:e39e677e17763d5ff88296ba38ff35fdfdce54f815618ac423b8930eefd7113a',
  },
  cortexel_binary64_spatial_domain_membership_v1: {
    algorithmId: SPATIAL_ALGORITHM_ID,
    semanticId: 'cortexel_binary64_spatial_domain_membership_semantics_v1',
    resultNoun: 'spatial axis membership',
    boundary: '[lower,upper]',
    partialIntervalPolicy: 'not_applicable',
    intervalExposure: 'extent_relative_membership_only_no_physical_resolution_claim',
    declaredCountBinding: 'not_applicable',
    coordinateSelection: 'each_position_against_materialized_axis',
    exposureComparison: 'exact_min_subnormal_integer_cross_multiplication',
    exposureMismatchPolicy: 'outside_closed_domain',
    proseDigest: 'sha256:07f30336f919e7e9c9a9a5ff3af222750b5bc79c130411a75ac900377cd833b0',
  },
} as const;

const FAILURE_CLASSES = [
  'nonfinite',
  'invalid_range',
  'non_tiling',
  'too_many',
  'unrepresentable',
] as const;
const failureClasses = new Set<string>(FAILURE_CLASSES);

const EXPECTED_CONSTANTS = {
  binary64MinSubnormalExponent: -1074,
  binary64Epsilon: Number.EPSILON,
  quotientToleranceEpsilonMultiplier: 8,
  endpointToleranceEpsilonMultiplier: 8,
  maximumMaterializedIntervals: 100_000,
  maximumSafeInteger: Number.MAX_SAFE_INTEGER,
  roundingMode: 'roundTiesToEven',
} as const;

const EXPECTED_SPATIAL_CONSTANTS = {
  binary64MinSubnormalExponent: -1074,
  binary64Epsilon: Number.EPSILON,
  membershipToleranceEpsilonMultiplier: 8,
  endpointRoundingCapEpsilonMultiplier: 32,
  roundingMode: 'roundTiesToEven',
  boundary: 'closed',
} as const;

const SPATIAL_FAILURE_CLASSES = ['nonfinite', 'invalid_extent', 'unrepresentable'] as const;
const spatialFailureClasses = new Set<string>(SPATIAL_FAILURE_CLASSES);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
  where: string,
  problems: string[],
): value is JsonRecord {
  if (!isRecord(value)) {
    problems.push(`${where}: expected an object`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length === wanted.length && actual.every((key, index) => key === wanted[index])) {
    return true;
  }
  const actualSet = new Set(actual);
  const wantedSet = new Set(wanted);
  const missing = wanted.filter((key) => !actualSet.has(key));
  const extra = actual.filter((key) => !wantedSet.has(key));
  problems.push(
    `${where}: object keys are not closed; missing [${missing.join(', ')}], extra [${extra.join(', ')}]`,
  );
  return false;
}

function validateLiteralRecord(
  value: unknown,
  expected: Readonly<Record<string, string | number>>,
  where: string,
  problems: string[],
): value is JsonRecord {
  if (!exactKeys(value, Object.keys(expected), where, problems)) return false;
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!Object.is(value[key], expectedValue)) {
      problems.push(
        `${where}.${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(value[key])}`,
      );
    }
  }
  return true;
}

function validatePinnedProse(
  value: unknown,
  expectedDigest: string,
  where: string,
  problems: string[],
): void {
  try {
    const actual = canonicalDigest(value as JsonValue);
    if (actual !== expectedDigest) {
      problems.push(
        `${where}: pinned explanatory prose changed without a reviewed semantic-id/version change`,
      );
    }
  } catch {
    problems.push(`${where}: explanatory prose is outside the canonical JSON domain`);
  }
}

function validateSemanticAuthority(value: unknown, problems: string[]): void {
  const where = 'numeric-policies.semanticAuthority';
  if (
    !exactKeys(
      value,
      ['id', 'version', 'normativeFields', 'proseRole', 'changePolicy'],
      where,
      problems,
    )
  ) return;

  for (const key of ['id', 'version', 'proseRole', 'changePolicy'] as const) {
    if (value[key] !== EXPECTED_SEMANTIC_AUTHORITY[key]) {
      problems.push(
        `${where}.${key}: expected ${JSON.stringify(EXPECTED_SEMANTIC_AUTHORITY[key])}`,
      );
    }
  }
  const fields = value.normativeFields;
  if (
    !Array.isArray(fields) ||
    fields.length !== EXPECTED_SEMANTIC_AUTHORITY.normativeFields.length ||
    fields.some((field, index) => field !== EXPECTED_SEMANTIC_AUTHORITY.normativeFields[index])
  ) {
    problems.push(
      `${where}.normativeFields: expected the closed ordered structured-authority paths`,
    );
  }
}

function validateAlgorithmSemantics(
  value: unknown,
  constants: unknown,
  where: string,
  problems: string[],
): void {
  if (!exactKeys(value, ['id', 'version', 'status', 'parameters'], where, problems)) return;
  if (value.id !== ALGORITHM_SEMANTIC_ID) {
    problems.push(`${where}.id: unimplemented algorithm semantic id ${JSON.stringify(value.id)}`);
  }
  if (value.version !== SEMANTIC_VERSION) {
    problems.push(`${where}.version: expected ${JSON.stringify(SEMANTIC_VERSION)}`);
  }
  if (value.status !== SEMANTIC_STATUS) {
    problems.push(`${where}.status: expected ${JSON.stringify(SEMANTIC_STATUS)}`);
  }
  const parameters = value.parameters;
  const parametersOk = validateLiteralRecord(
    parameters,
    EXPECTED_ALGORITHM_SEMANTIC_PARAMETERS,
    `${where}.parameters`,
    problems,
  );
  if (!parametersOk || !isRecord(constants)) return;

  const bindings = {
    binary64MinSubnormalExponent: 'coefficientBinaryExponent',
    binary64Epsilon: 'binary64Epsilon',
    quotientToleranceEpsilonMultiplier: 'quotientToleranceEpsilonMultiplier',
    endpointToleranceEpsilonMultiplier: 'endpointToleranceEpsilonMultiplier',
    maximumMaterializedIntervals: 'maximumMaterializedIntervals',
    maximumSafeInteger: 'maximumSafeInteger',
    roundingMode: 'arithmeticRoundingMode',
  } as const;
  for (const [constantKey, parameterKey] of Object.entries(bindings)) {
    if (!Object.is(constants[constantKey], parameters[parameterKey])) {
      problems.push(
        `${where}.parameters.${parameterKey}: contradicts constants.${constantKey}`,
      );
    }
  }
}

function validatePolicySemantics(
  value: unknown,
  policy: JsonRecord,
  binding: (typeof POLICY_BINDINGS)[keyof typeof POLICY_BINDINGS],
  where: string,
  problems: string[],
): void {
  if (!exactKeys(value, ['id', 'version', 'status', 'parameters'], where, problems)) return;
  if (value.id !== binding.semanticId) {
    problems.push(`${where}.id: unimplemented policy semantic id ${JSON.stringify(value.id)}`);
  }
  if (value.version !== SEMANTIC_VERSION) {
    problems.push(`${where}.version: expected ${JSON.stringify(SEMANTIC_VERSION)}`);
  }
  if (value.status !== SEMANTIC_STATUS) {
    problems.push(`${where}.status: expected ${JSON.stringify(SEMANTIC_STATUS)}`);
  }
  const expectedParameters = {
    candidateAlgorithm: binding.algorithmId,
    resultNoun: binding.resultNoun,
    boundary: binding.boundary,
    partialIntervalPolicy: binding.partialIntervalPolicy,
    intervalExposure: binding.intervalExposure,
    declaredCountBinding: binding.declaredCountBinding,
    coordinateSelection: binding.coordinateSelection,
    exposureComparison: binding.exposureComparison,
    exposureMismatchPolicy: binding.exposureMismatchPolicy,
  } as const;
  const parameters = value.parameters;
  const parametersOk = validateLiteralRecord(
    parameters,
    expectedParameters,
    `${where}.parameters`,
    problems,
  );
  if (!parametersOk) return;

  for (const key of [
    'resultNoun',
    'boundary',
    'partialIntervalPolicy',
    'intervalExposure',
  ] as const) {
    if (policy[key] !== parameters[key]) {
      problems.push(`${where}.parameters.${key}: contradicts the policy.${key} compatibility field`);
    }
  }
  if (policy.algorithm !== parameters.candidateAlgorithm) {
    problems.push(`${where}.parameters.candidateAlgorithm: contradicts policy.algorithm`);
  }
}

function duplicateStrings(
  values: readonly unknown[],
  where: string,
  problems: string[],
): Set<string> {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (typeof value !== 'string' || value.length === 0) {
      problems.push(`${where}[${index}]: expected a non-empty string`);
      continue;
    }
    if (seen.has(value)) problems.push(`${where}[${index}]: duplicate value "${value}"`);
    seen.add(value);
  }
  return seen;
}

function validateAcceptedResult(
  result: JsonRecord,
  where: string,
  problems: string[],
): void {
  const allowed = new Set(['accepted', 'intervalCount', 'edges', 'edgeAssertions']);
  const extra = Object.keys(result).filter((key) => !allowed.has(key));
  if (extra.length > 0) {
    problems.push(`${where}: object keys are not closed; missing [], extra [${extra.join(', ')}]`);
  }

  const intervalCount = result.intervalCount;
  if (
    typeof intervalCount !== 'number' ||
    !Number.isSafeInteger(intervalCount) ||
    intervalCount < 1 ||
    intervalCount > EXPECTED_CONSTANTS.maximumMaterializedIntervals
  ) {
    problems.push(`${where}.intervalCount: expected an integer in [1, 100000]`);
    return;
  }

  const hasEdges = Array.isArray(result.edges);
  const hasAssertions = Array.isArray(result.edgeAssertions);
  if (hasEdges === hasAssertions) {
    problems.push(`${where}: accepted results must provide exactly one of edges or edgeAssertions`);
    return;
  }

  if (hasEdges) {
    const edges = result.edges as unknown[];
    if (edges.length !== intervalCount + 1 || !edges.every(isFiniteNumber)) {
      problems.push(`${where}.edges: expected ${String(intervalCount + 1)} finite numbers`);
    }
    return;
  }

  const assertions = result.edgeAssertions as unknown[];
  if (assertions.length === 0) {
    problems.push(`${where}.edgeAssertions: expected at least the first and final edge`);
    return;
  }
  const seenIndices = new Set<number>();
  for (const [index, assertion] of assertions.entries()) {
    const assertionWhere = `${where}.edgeAssertions[${index}]`;
    if (!exactKeys(assertion, ['index', 'value'], assertionWhere, problems)) continue;
    const edgeIndex = assertion.index;
    if (
      typeof edgeIndex !== 'number' ||
      !Number.isSafeInteger(edgeIndex) ||
      edgeIndex < 0 ||
      edgeIndex > intervalCount
    ) {
      problems.push(`${assertionWhere}.index: expected an edge index within the result`);
    } else if (seenIndices.has(edgeIndex)) {
      problems.push(`${assertionWhere}.index: duplicate asserted edge index ${String(edgeIndex)}`);
    } else {
      seenIndices.add(edgeIndex);
    }
    if (!isFiniteNumber(assertion.value)) {
      problems.push(`${assertionWhere}.value: expected a finite binary64 number`);
    }
  }
  if (!seenIndices.has(0) || !seenIndices.has(intervalCount)) {
    problems.push(`${where}.edgeAssertions: compact results must assert the first and final edge`);
  }
}

function validateSpatialAlgorithm(
  algorithm: JsonRecord,
  where: string,
  problems: string[],
): string {
  if (algorithm.revision !== 1) {
    problems.push(`${where}.revision: expected revision 1`);
  }

  const semanticsWhere = `${where}.semantics`;
  if (
    exactKeys(
      algorithm.semantics,
      ['id', 'version', 'status', 'parameters'],
      semanticsWhere,
      problems,
    )
  ) {
    if (algorithm.semantics.id !== SPATIAL_ALGORITHM_SEMANTIC_ID) {
      problems.push(
        `${semanticsWhere}.id: unimplemented algorithm semantic id ${JSON.stringify(algorithm.semantics.id)}`,
      );
    }
    if (algorithm.semantics.version !== SEMANTIC_VERSION) {
      problems.push(`${semanticsWhere}.version: expected ${JSON.stringify(SEMANTIC_VERSION)}`);
    }
    if (algorithm.semantics.status !== SEMANTIC_STATUS) {
      problems.push(`${semanticsWhere}.status: expected ${JSON.stringify(SEMANTIC_STATUS)}`);
    }
    validateLiteralRecord(
      algorithm.semantics.parameters,
      EXPECTED_SPATIAL_ALGORITHM_SEMANTIC_PARAMETERS,
      `${semanticsWhere}.parameters`,
      problems,
    );
  }

  if (typeof algorithm.purpose !== 'string' || algorithm.purpose.trim() === '') {
    problems.push(`${where}.purpose: expected a non-empty string`);
  }
  if (
    exactKeys(
      algorithm.inputs,
      ['center', 'extent', 'values'],
      `${where}.inputs`,
      problems,
    )
  ) {
    for (const key of ['center', 'extent', 'values']) {
      if (typeof algorithm.inputs[key] !== 'string' || algorithm.inputs[key].trim() === '') {
        problems.push(`${where}.inputs.${key}: expected a non-empty string`);
      }
    }
  }
  if (
    exactKeys(
      algorithm.constants,
      Object.keys(EXPECTED_SPATIAL_CONSTANTS),
      `${where}.constants`,
      problems,
    )
  ) {
    for (const [key, expected] of Object.entries(EXPECTED_SPATIAL_CONSTANTS)) {
      if (!Object.is(algorithm.constants[key], expected)) {
        problems.push(
          `${where}.constants.${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(algorithm.constants[key])}`,
        );
      }
    }
  }
  if (
    !Array.isArray(algorithm.algorithm) ||
    algorithm.algorithm.length === 0 ||
    algorithm.algorithm.some((step) => typeof step !== 'string' || step.trim() === '')
  ) {
    problems.push(`${where}.algorithm: expected a non-empty array of non-empty strings`);
  }
  validatePinnedProse(
    {
      purpose: algorithm.purpose,
      inputs: algorithm.inputs,
      algorithm: algorithm.algorithm,
    },
    EXPECTED_SPATIAL_ALGORITHM_PROSE_DIGEST,
    `${where}.explanatoryProse`,
    problems,
  );

  if (!Array.isArray(algorithm.failureClasses)) {
    problems.push(`${where}.failureClasses: expected an array`);
  } else {
    const actual = duplicateStrings(
      algorithm.failureClasses,
      `${where}.failureClasses`,
      problems,
    );
    const missing = SPATIAL_FAILURE_CLASSES.filter((value) => !actual.has(value));
    const extra = [...actual].filter((value) => !spatialFailureClasses.has(value));
    if (missing.length > 0 || extra.length > 0) {
      problems.push(
        `${where}.failureClasses: closed set mismatch; missing [${missing.join(', ')}], extra [${extra.join(', ')}]`,
      );
    }
  }

  if (!Array.isArray(algorithm.conformanceVectors) || algorithm.conformanceVectors.length === 0) {
    problems.push(`${where}.conformanceVectors: expected a non-empty array`);
    return SPATIAL_ALGORITHM_ID;
  }
  const names = new Set<string>();
  const coveredFailures = new Set<string>();
  for (const [index, vector] of algorithm.conformanceVectors.entries()) {
    const vectorWhere = `${where}.conformanceVectors[${index}]`;
    if (!exactKeys(vector, ['name', 'input', 'result'], vectorWhere, problems)) continue;
    if (typeof vector.name !== 'string' || vector.name.trim() === '') {
      problems.push(`${vectorWhere}.name: expected a non-empty string`);
    } else if (names.has(vector.name)) {
      problems.push(`${vectorWhere}.name: duplicate conformance-vector name "${vector.name}"`);
    } else {
      names.add(vector.name);
    }
    if (
      exactKeys(
        vector.input,
        ['center', 'extent', 'values'],
        `${vectorWhere}.input`,
        problems,
      )
    ) {
      if (!isFiniteNumber(vector.input.center)) {
        problems.push(`${vectorWhere}.input.center: expected a finite binary64 number`);
      }
      if (!isFiniteNumber(vector.input.extent)) {
        problems.push(`${vectorWhere}.input.extent: expected a finite binary64 number`);
      }
      if (
        !Array.isArray(vector.input.values) ||
        !vector.input.values.every(isFiniteNumber)
      ) {
        problems.push(`${vectorWhere}.input.values: expected finite binary64 numbers`);
      }
    }
    if (!isRecord(vector.result) || typeof vector.result.accepted !== 'boolean') {
      problems.push(`${vectorWhere}.result: expected an object with boolean accepted`);
      continue;
    }
    if (vector.result.accepted) {
      if (
        !exactKeys(
          vector.result,
          ['accepted', 'lower', 'upper', 'membership'],
          `${vectorWhere}.result`,
          problems,
        )
      ) continue;
      if (!isFiniteNumber(vector.result.lower) || !isFiniteNumber(vector.result.upper)) {
        problems.push(`${vectorWhere}.result: endpoints must be finite binary64 numbers`);
      }
      if (
        !Array.isArray(vector.result.membership) ||
        !vector.result.membership.every((entry) => typeof entry === 'boolean') ||
        !isRecord(vector.input) ||
        !Array.isArray(vector.input.values) ||
        vector.result.membership.length !== vector.input.values.length
      ) {
        problems.push(`${vectorWhere}.result.membership: expected one boolean per input value`);
      }
      continue;
    }
    if (!exactKeys(vector.result, ['accepted', 'failureClass'], `${vectorWhere}.result`, problems)) {
      continue;
    }
    if (
      typeof vector.result.failureClass !== 'string' ||
      !spatialFailureClasses.has(vector.result.failureClass)
    ) {
      problems.push(`${vectorWhere}.result.failureClass: unknown numeric failure class`);
    } else {
      coveredFailures.add(vector.result.failureClass);
    }
  }
  for (const failureClass of SPATIAL_FAILURE_CLASSES) {
    if (failureClass !== 'nonfinite' && !coveredFailures.has(failureClass)) {
      problems.push(
        `${where}.conformanceVectors: no rejected vector covers failureClass "${failureClass}"`,
      );
    }
  }
  return SPATIAL_ALGORITHM_ID;
}

function validateAlgorithm(
  algorithm: unknown,
  index: number,
  problems: string[],
): string | undefined {
  const where = `numeric-policies.algorithms[${index}]`;
  if (
    !exactKeys(
      algorithm,
      [
        'id',
        'revision',
        'semantics',
        'purpose',
        'inputs',
        'constants',
        'algorithm',
        'failureClasses',
        'conformanceVectors',
      ],
      where,
      problems,
    )
  ) return undefined;

  const id = algorithm.id;
  if (typeof id !== 'string' || id.length === 0) {
    problems.push(`${where}.id: expected a non-empty string`);
  } else if (id === SPATIAL_ALGORITHM_ID) {
    return validateSpatialAlgorithm(algorithm, where, problems);
  } else if (id !== ALGORITHM_ID) {
    problems.push(`${where}.id: unimplemented numeric algorithm "${id}"`);
  }
  if (
    typeof algorithm.revision !== 'number' ||
    !Number.isSafeInteger(algorithm.revision) ||
    algorithm.revision !== 1
  ) {
    problems.push(`${where}.revision: expected revision 1`);
  }
  validateAlgorithmSemantics(
    algorithm.semantics,
    algorithm.constants,
    `${where}.semantics`,
    problems,
  );
  if (typeof algorithm.purpose !== 'string' || algorithm.purpose.trim() === '') {
    problems.push(`${where}.purpose: expected a non-empty string`);
  }
  if (exactKeys(algorithm.inputs, ['start', 'stop', 'width'], `${where}.inputs`, problems)) {
    for (const key of ['start', 'stop', 'width']) {
      const input = algorithm.inputs[key];
      if (typeof input !== 'string' || input.trim() === '') {
        problems.push(`${where}.inputs.${key}: expected a non-empty string`);
      }
    }
  }
  if (
    exactKeys(
      algorithm.constants,
      Object.keys(EXPECTED_CONSTANTS),
      `${where}.constants`,
      problems,
    )
  ) {
    for (const [key, expected] of Object.entries(EXPECTED_CONSTANTS)) {
      if (!Object.is(algorithm.constants[key], expected)) {
        problems.push(
          `${where}.constants.${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(algorithm.constants[key])}`,
        );
      }
    }
  }
  if (
    !Array.isArray(algorithm.algorithm) ||
    algorithm.algorithm.length === 0 ||
    algorithm.algorithm.some((step) => typeof step !== 'string' || step.trim() === '')
  ) {
    problems.push(`${where}.algorithm: expected a non-empty array of non-empty strings`);
  }
  validatePinnedProse(
    {
      purpose: algorithm.purpose,
      inputs: algorithm.inputs,
      algorithm: algorithm.algorithm,
    },
    EXPECTED_ALGORITHM_PROSE_DIGEST,
    `${where}.explanatoryProse`,
    problems,
  );

  if (!Array.isArray(algorithm.failureClasses)) {
    problems.push(`${where}.failureClasses: expected an array`);
  } else {
    const actual = duplicateStrings(algorithm.failureClasses, `${where}.failureClasses`, problems);
    const missing = FAILURE_CLASSES.filter((value) => !actual.has(value));
    const extra = [...actual].filter((value) => !failureClasses.has(value));
    if (missing.length > 0 || extra.length > 0) {
      problems.push(
        `${where}.failureClasses: closed set mismatch; missing [${missing.join(', ')}], extra [${extra.join(', ')}]`,
      );
    }
  }

  if (!Array.isArray(algorithm.conformanceVectors) || algorithm.conformanceVectors.length === 0) {
    problems.push(`${where}.conformanceVectors: expected a non-empty array`);
    return typeof id === 'string' ? id : undefined;
  }

  const vectorNames = new Set<string>();
  const coveredFailures = new Set<string>();
  for (const [vectorIndex, vector] of algorithm.conformanceVectors.entries()) {
    const vectorWhere = `${where}.conformanceVectors[${vectorIndex}]`;
    if (!exactKeys(vector, ['name', 'input', 'result'], vectorWhere, problems)) continue;

    if (typeof vector.name !== 'string' || vector.name.trim() === '') {
      problems.push(`${vectorWhere}.name: expected a non-empty string`);
    } else if (vectorNames.has(vector.name)) {
      problems.push(`${vectorWhere}.name: duplicate conformance-vector name "${vector.name}"`);
    } else {
      vectorNames.add(vector.name);
    }

    if (exactKeys(vector.input, ['start', 'stop', 'width'], `${vectorWhere}.input`, problems)) {
      for (const key of ['start', 'stop', 'width']) {
        if (!isFiniteNumber(vector.input[key])) {
          problems.push(`${vectorWhere}.input.${key}: expected a finite binary64 number`);
        }
      }
    }

    if (!isRecord(vector.result) || typeof vector.result.accepted !== 'boolean') {
      problems.push(`${vectorWhere}.result: expected an object with boolean accepted`);
      continue;
    }
    if (vector.result.accepted) {
      validateAcceptedResult(vector.result, `${vectorWhere}.result`, problems);
      continue;
    }
    if (!exactKeys(vector.result, ['accepted', 'failureClass'], `${vectorWhere}.result`, problems)) {
      continue;
    }
    if (
      typeof vector.result.failureClass !== 'string' ||
      !failureClasses.has(vector.result.failureClass)
    ) {
      problems.push(`${vectorWhere}.result.failureClass: unknown numeric failure class`);
    } else {
      coveredFailures.add(vector.result.failureClass);
    }
  }

  for (const failureClass of FAILURE_CLASSES) {
    // JSON cannot carry NaN or infinity. Both host implementations exercise
    // `nonfinite` directly; every JSON-representable failure must have a living vector.
    if (failureClass !== 'nonfinite' && !coveredFailures.has(failureClass)) {
      problems.push(
        `${where}.conformanceVectors: no rejected vector covers failureClass "${failureClass}"`,
      );
    }
  }
  return typeof id === 'string' ? id : undefined;
}

function validatePolicy(
  policy: unknown,
  index: number,
  algorithmIds: ReadonlySet<string>,
  problems: string[],
): string | undefined {
  const where = `numeric-policies.policies[${index}]`;
  if (
    !exactKeys(
      policy,
      [
        'id',
        'revision',
        'algorithm',
        'semantics',
        'resultNoun',
        'boundary',
        'partialIntervalPolicy',
        'intervalExposure',
        'description',
      ],
      where,
      problems,
    )
  ) return undefined;

  const id = policy.id;
  if (typeof id !== 'string' || id.length === 0) {
    problems.push(`${where}.id: expected a non-empty string`);
  }
  const binding =
    typeof id === 'string'
      ? POLICY_BINDINGS[id as keyof typeof POLICY_BINDINGS]
      : undefined;
  if (!binding) {
    problems.push(`${where}.id: unimplemented numeric policy "${String(id)}"`);
  }
  if (
    typeof policy.revision !== 'number' ||
    !Number.isSafeInteger(policy.revision) ||
    policy.revision !== 1
  ) {
    problems.push(`${where}.revision: expected revision 1`);
  }
  if (
    !binding ||
    policy.algorithm !== binding.algorithmId ||
    !algorithmIds.has(binding.algorithmId)
  ) {
    problems.push(
      `${where}.algorithm: dangling or unsupported binding "${String(policy.algorithm)}"`,
    );
  }
  if (binding && policy.resultNoun !== binding.resultNoun) {
    problems.push(`${where}.resultNoun: expected "${binding.resultNoun}"`);
  }
  if (binding && policy.boundary !== binding.boundary) {
    problems.push(`${where}.boundary: expected "${binding.boundary}"`);
  }
  if (binding && policy.partialIntervalPolicy !== binding.partialIntervalPolicy) {
    problems.push(
      `${where}.partialIntervalPolicy: expected "${binding.partialIntervalPolicy}"`,
    );
  }
  if (binding && policy.intervalExposure !== binding.intervalExposure) {
    problems.push(
      `${where}.intervalExposure: expected "${binding.intervalExposure}"`,
    );
  }
  if (typeof policy.description !== 'string' || policy.description.trim() === '') {
    problems.push(`${where}.description: expected a non-empty string`);
  }
  if (binding) {
    validatePolicySemantics(policy.semantics, policy, binding, `${where}.semantics`, problems);
    validatePinnedProse(
      policy.description,
      binding.proseDigest,
      `${where}.description`,
      problems,
    );
  }
  return typeof id === 'string' ? id : undefined;
}

/** Return every deterministic integrity problem; an empty array means publishable. */
export function numericPolicySourceProblems(value: unknown): string[] {
  const problems: string[] = [];
  if (
    !exactKeys(
      value,
      ['registry', 'version', 'description', 'semanticAuthority', 'algorithms', 'policies'],
      'numeric-policies',
      problems,
    )
  ) return problems;

  if (value.registry !== 'cortexel-numeric-policies') {
    problems.push('numeric-policies.registry: expected "cortexel-numeric-policies"');
  }
  if (value.version !== '1.0') {
    problems.push('numeric-policies.version: expected "1.0"');
  }
  if (typeof value.description !== 'string' || value.description.trim() === '') {
    problems.push('numeric-policies.description: expected a non-empty string');
  }
  validatePinnedProse(
    value.description,
    EXPECTED_REGISTRY_DESCRIPTION_DIGEST,
    'numeric-policies.description',
    problems,
  );
  validateSemanticAuthority(value.semanticAuthority, problems);
  if (!Array.isArray(value.algorithms) || value.algorithms.length === 0) {
    problems.push('numeric-policies.algorithms: expected a non-empty array');
    return problems;
  }
  if (!Array.isArray(value.policies) || value.policies.length === 0) {
    problems.push('numeric-policies.policies: expected a non-empty array');
    return problems;
  }

  const algorithmIds = value.algorithms
    .map((algorithm, index) => validateAlgorithm(algorithm, index, problems))
    .filter((id): id is string => id !== undefined);
  duplicateStrings(algorithmIds, 'numeric-policies algorithm ids', problems);
  const algorithmIdSet = new Set(algorithmIds);
  const expectedAlgorithmIds = new Set([ALGORITHM_ID, SPATIAL_ALGORITHM_ID]);
  if (
    algorithmIdSet.size !== expectedAlgorithmIds.size ||
    [...expectedAlgorithmIds].some((id) => !algorithmIdSet.has(id))
  ) {
    problems.push(
      `numeric-policies.algorithms: expected exactly the implemented ids "${[...expectedAlgorithmIds].join('", "')}"`,
    );
  }

  const policyIds = value.policies
    .map((policy, index) => validatePolicy(policy, index, algorithmIdSet, problems))
    .filter((id): id is string => id !== undefined);
  duplicateStrings(policyIds, 'numeric-policies policy ids', problems);
  const policyIdSet = new Set(policyIds);
  const expectedPolicyIds = Object.keys(POLICY_BINDINGS);
  const missingPolicies = expectedPolicyIds.filter((id) => !policyIdSet.has(id));
  const extraPolicies = [...policyIdSet].filter(
    (id) => !Object.prototype.hasOwnProperty.call(POLICY_BINDINGS, id),
  );
  if (missingPolicies.length > 0 || extraPolicies.length > 0) {
    problems.push(
      `numeric-policies.policies: closed id set mismatch; missing [${missingPolicies.join(', ')}], extra [${extraPolicies.join(', ')}]`,
    );
  }

  return problems;
}
