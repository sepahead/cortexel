/**
 * Oracle-bound V3 correction of the pinned NEST 3.10 example visualization audit.
 *
 * V2 remains an immutable historical authority. V3 consumes the separately
 * implemented stdlib-Python differential AST oracle instead of restating a
 * TypeScript correction map. The 63 unchanged taxonomy rows remain inherited V2 work.
 */

import Ajv2020 from 'ajv/dist/2020.js';

import { canonicalize } from '../../src/core/canonicalize.js';
import { sha256Digest, sha256DigestBytes } from '../../src/core/sha256.js';
import {
  PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_DIGEST,
  SEMANTIC_DEMAND_DEFINITIONS,
  SEMANTIC_DEMAND_IDS,
  buildNestExampleVisualizationCoverage,
} from './nest-example-visualization-coverage.js';
import type { NestDocumentationSourceInventory } from './nest-documentation-source-inventory.js';
import type { NestExampleSourceInventory } from './nest-example-source-inventory.js';

type JsonRecord = Record<string, any>;

export const NEST_EXAMPLE_VISUALIZATION_COVERAGE_V3_IDENTITY =
  'cortexel-nest-example-visualization-coverage.semantic.rfc8785-sha256.v3' as const;
export const PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_V3_DIGEST =
  'sha256:3cfc711ce0edc062e6ee950fe547b037acf220a6f7305028eef99078f08438fd' as const;
export const NEST_EXAMPLE_VISUALIZATION_ORACLE_IDENTITY =
  'cortexel-nest-example-visualization-oracle.semantic.rfc8785-sha256.v1' as const;
export const PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_DIGEST =
  'sha256:8d278b5e82f3da501eb6c0a93a47bf9dabd6df6661c6968137b2a64f12ad32ac' as const;
export const PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_SHA256 =
  'sha256:888aaa16bfede4da54e59d80075c0e8cff7d43f6c9dd0e112c9e52cc0041bb58' as const;
export const PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_BYTE_LENGTH = 82_420;
export const PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_SHA256 =
  'sha256:2bc4ce5baf35c6ca52ce07978982fc3e90879cd942a6345cb538ed3eec4b062c' as const;
export const PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_BYTE_LENGTH = 88_910;

const DIGEST_DOMAIN = `${NEST_EXAMPLE_VISUALIZATION_COVERAGE_V3_IDENTITY}\0`;
const ORACLE_DIGEST_DOMAIN = `${NEST_EXAMPLE_VISUALIZATION_ORACLE_IDENTITY}\0`;

const NEW_SEMANTIC_DEMAND_IDS = Object.freeze([
  'active_sender_normalized_rate',
  'spatial_neighborhood_membership_2d',
  'spatial_node_map_2d',
  'spatial_probability_field_2d',
  'trajectory_2d',
] as const);

export const SEMANTIC_DEMAND_IDS_V3 = Object.freeze([
  ...SEMANTIC_DEMAND_IDS.filter((id) => id !== 'spatial_connectivity_2d'),
  ...NEW_SEMANTIC_DEMAND_IDS,
].sort());

export const PRESENTATION_DEMAND_IDS_V3 = Object.freeze([
  'animation_frames',
  'color_scale',
  'cross_capability_bundle',
  'dual_y_axis',
  'equal_xy_scale',
  'error_bars',
  'live_incremental_redraw',
  'multi_panel',
  'same_axis_overlay',
  'shared_x_axis',
  'shared_y_axis',
  'single_panel',
  'static_file_export',
  'uncertainty_band',
] as const);

export const VISUAL_OPERATION_IDS_V3 = Object.freeze([
  'bar',
  'error_bar',
  'filled_band',
  'heatmap',
  'histogram',
  'image',
  'line',
  'network_edges',
  'point',
  'probability_field',
  'raster',
  'spatial_mask',
  'spatial_points_2d',
  'spatial_points_3d',
  'step',
  'trajectory_2d',
  'vector_field',
] as const);

function noAdapter(): JsonRecord {
  return { state: 'none', adapterCandidates: [] };
}

function definition(
  id: (typeof NEW_SEMANTIC_DEMAND_IDS)[number],
  description: string,
  stableRepresentability: JsonRecord,
  renderer: JsonRecord,
  notes: string,
): JsonRecord {
  return {
    id,
    description,
    stableRepresentability,
    executableAdapter: noAdapter(),
    renderer,
    upstreamParity: 'not_run',
    scientificCertification: 'not_run',
    notes,
  };
}

const NO_OUTPUT_NOTE =
  'This is a pinned-source classification only. No example-specific adapter input, execution-bound output, upstream comparison, or scientific certification exists.';

const NEW_SEMANTIC_DEMAND_DEFINITIONS = Object.freeze([
  definition(
    'active_sender_normalized_rate',
    'A histogram rate whose denominator is the unique sender ids present in the plotted timestamp carrier, excluding every silent sender.',
    { state: 'no_stable_candidate', skillCandidates: [] },
    { state: 'none', rendererCandidates: [] },
    `The NEST raster helper computes this data-dependent denominator. It is not interchangeable with a declared complete population rate. ${NO_OUTPUT_NOTE}`,
  ),
  definition(
    'spatial_neighborhood_membership_2d',
    'Measured two-dimensional node positions with a selected source or target neighborhood encoded as point membership, not endpoint-connecting edges.',
    {
      state: 'partial_source_review_candidate',
      skillCandidates: ['network.spatial_map_2d'],
    },
    {
      state: 'partial_candidate_no_upstream_comparison',
      rendererCandidates: ['figure.spatial_map_2d'],
    },
    `The current spatial map can carry measured positions but has no complete source/target-neighborhood membership contract. ${NO_OUTPUT_NOTE}`,
  ),
  definition(
    'spatial_node_map_2d',
    'Measured two-dimensional node positions inside a declared spatial extent with equal x/y geometry.',
    {
      state: 'source_review_candidate',
      skillCandidates: ['network.spatial_map_2d'],
    },
    {
      state: 'packaged_candidate_no_upstream_comparison',
      rendererCandidates: ['figure.spatial_map_2d'],
    },
    NO_OUTPUT_NOTE,
  ),
  definition(
    'spatial_probability_field_2d',
    'A sampled two-dimensional connection-probability field with a bounded numeric color scale and declared spatial extent.',
    { state: 'no_stable_candidate', skillCandidates: [] },
    { state: 'none', rendererCandidates: [] },
    `A probability field is not a node map or an observed network-edge set. ${NO_OUTPUT_NOTE}`,
  ),
  definition(
    'trajectory_2d',
    'An ordered two-dimensional parametric trajectory with both coordinates carried as data and equal geometric scale.',
    { state: 'no_stable_candidate', skillCandidates: [] },
    { state: 'none', rendererCandidates: [] },
    `The reviewed learning examples plot readout or target output-coordinate paths, not model-state dynamics. Recasting them as a phase plane would add unsupported state, time, and direction semantics. ${NO_OUTPUT_NOTE}`,
  ),
]);

export const SEMANTIC_DEMAND_DEFINITIONS_V3: readonly JsonRecord[] = Object.freeze([
  ...SEMANTIC_DEMAND_DEFINITIONS.filter(({ id }) => id !== 'spatial_connectivity_2d'),
  ...NEW_SEMANTIC_DEMAND_DEFINITIONS,
].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0));

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function digestWithoutBinding(value: JsonRecord, domain: string): string {
  const preimage: JsonRecord = { ...value };
  delete preimage.semanticBinding;
  return sha256Digest(`${domain}${canonicalize(preimage as never)}`);
}

export function nestExampleVisualizationOracleDigest(value: unknown): string {
  if (!isRecord(value)) throw new TypeError('NEST visualization oracle root must be an object');
  return digestWithoutBinding(value, ORACLE_DIGEST_DOMAIN);
}

export function nestExampleVisualizationCoverageV3Digest(value: unknown): string {
  if (!isRecord(value)) throw new TypeError('NEST visualization coverage V3 root must be an object');
  return digestWithoutBinding(value, DIGEST_DOMAIN);
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalize(left as never) === canonicalize(right as never);
}

function validateOracleAuthority(oracle: unknown): asserts oracle is JsonRecord {
  if (!isRecord(oracle)) throw new Error('NEST visualization oracle root is not an object');
  if (
    oracle.protocol !== 'cortexel-nest-example-visualization-oracle'
    || oracle.protocolVersion !== 1
  ) {
    throw new Error('NEST visualization oracle protocol identity drifted');
  }
  const binding = isRecord(oracle.semanticBinding) ? oracle.semanticBinding : {};
  if (
    binding.identityAlgorithm !== NEST_EXAMPLE_VISUALIZATION_ORACLE_IDENTITY
    || binding.digestScope !== 'all_top_level_members_except_semanticBinding'
    || binding.semanticDigest !== PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_DIGEST
    || nestExampleVisualizationOracleDigest(oracle)
      !== PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_DIGEST
  ) {
    throw new Error('NEST visualization oracle semantic authority drifted');
  }
  if (
    !isRecord(oracle.summary)
    || oracle.summary.canonicalExampleCount !== 98
    || oracle.summary.correctedCanonicalProjectionCount !== 35
    || oracle.summary.unchangedCanonicalProjectionCount !== 63
    || oracle.summary.sourceLeafSha256VerifiedCount !== 112
    || oracle.summary.helperSourceSha256VerifiedCount !== 2
  ) {
    throw new Error('NEST visualization oracle closed denominator drifted');
  }
  const authorities = isRecord(oracle.authorities) ? oracle.authorities : {};
  const generator = isRecord(authorities.reviewedGeneratorSource)
    ? authorities.reviewedGeneratorSource
    : {};
  if (
    generator.path !== 'scripts/generate-nest-example-visualization-oracle.py'
    || generator.sha256 !== PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_SHA256
    || generator.byteLength !== PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_BYTE_LENGTH
    || generator.profile !== 'python_stdlib_ast_differential_reviewed_source.v1'
    || generator.executionBinding
      !== 'not_established_path_bytes_read_after_interpreter_start'
  ) {
    throw new Error('NEST visualization oracle reviewed generator source drifted');
  }
}

function oracleProjectionMap(oracle: JsonRecord): ReadonlyMap<string, JsonRecord> {
  if (!Array.isArray(oracle.expectedCanonicalProjections)) {
    throw new Error('NEST visualization oracle projections are absent');
  }
  const projections = new Map<string, JsonRecord>();
  for (const candidate of oracle.expectedCanonicalProjections) {
    if (!isRecord(candidate) || typeof candidate.path !== 'string') {
      throw new Error('NEST visualization oracle projection is malformed');
    }
    if (projections.has(candidate.path)) {
      throw new Error(`duplicate NEST visualization oracle path: ${candidate.path}`);
    }
    projections.set(candidate.path, candidate);
  }
  if (projections.size !== 98) {
    throw new Error('NEST visualization oracle must close exactly 98 canonical paths');
  }
  return projections;
}

function exactStringArray(value: unknown, allowed: ReadonlySet<string>, where: string): string[] {
  if (
    !Array.isArray(value)
    || !value.every((member) => typeof member === 'string' && allowed.has(member))
    || value.length !== new Set(value).size
    || !sameCanonical(value, [...value].sort())
  ) {
    throw new Error(`${where} is not a closed sorted unique string array`);
  }
  return [...value];
}

function countMember(rows: readonly JsonRecord[], field: string, member: string): number {
  return rows.filter((row) => Array.isArray(row[field]) && row[field].includes(member)).length;
}

const EXPECTED_CANONICAL_AGGREGATES = Object.freeze({
  activeSenderNormalizedRateDemandCount: 9,
  analogTraceDemandCount: 18,
  crossCapabilityBundleDemandCount: 30,
  dualYAxisDemandCount: 5,
  equalXYScaleDemandCount: 14,
  histogramOperationCount: 16,
  imageOperationCountCanonicalOnly: 3,
  multiPanelDemandCount: 43,
  networkEdgesOperationCount: 2,
  populationRateDemandCount: 4,
  probabilityFieldOperationCount: 1,
  responseCurveDemandCount: 3,
  sharedXAxisDemandCount: 14,
  sharedYAxisDemandCount: 6,
  singlePanelDemandCount: 41,
  spatialMaskOperationCount: 6,
  spatialNeighborhoodMembershipDemandCount: 8,
  spatialNodeMapDemandCount: 4,
  spatialProbabilityFieldDemandCount: 1,
  trajectory2dDemandCount: 2,
  trajectory2dOperationCount: 2,
});

function canonicalAggregates(rows: readonly JsonRecord[]): JsonRecord {
  return {
    activeSenderNormalizedRateDemandCount:
      countMember(rows, 'semanticDemands', 'active_sender_normalized_rate'),
    analogTraceDemandCount: countMember(rows, 'semanticDemands', 'analog_trace'),
    crossCapabilityBundleDemandCount:
      countMember(rows, 'presentationDemands', 'cross_capability_bundle'),
    dualYAxisDemandCount: countMember(rows, 'presentationDemands', 'dual_y_axis'),
    equalXYScaleDemandCount: countMember(rows, 'presentationDemands', 'equal_xy_scale'),
    histogramOperationCount: countMember(rows, 'visualOperations', 'histogram'),
    imageOperationCountCanonicalOnly: countMember(rows, 'visualOperations', 'image'),
    multiPanelDemandCount: countMember(rows, 'presentationDemands', 'multi_panel'),
    networkEdgesOperationCount: countMember(rows, 'visualOperations', 'network_edges'),
    populationRateDemandCount: countMember(rows, 'semanticDemands', 'population_rate'),
    probabilityFieldOperationCount: countMember(rows, 'visualOperations', 'probability_field'),
    responseCurveDemandCount: countMember(rows, 'semanticDemands', 'response_curve'),
    sharedXAxisDemandCount: countMember(rows, 'presentationDemands', 'shared_x_axis'),
    sharedYAxisDemandCount: countMember(rows, 'presentationDemands', 'shared_y_axis'),
    singlePanelDemandCount: countMember(rows, 'presentationDemands', 'single_panel'),
    spatialMaskOperationCount: countMember(rows, 'visualOperations', 'spatial_mask'),
    spatialNeighborhoodMembershipDemandCount:
      countMember(rows, 'semanticDemands', 'spatial_neighborhood_membership_2d'),
    spatialNodeMapDemandCount: countMember(rows, 'semanticDemands', 'spatial_node_map_2d'),
    spatialProbabilityFieldDemandCount:
      countMember(rows, 'semanticDemands', 'spatial_probability_field_2d'),
    trajectory2dDemandCount: countMember(rows, 'semanticDemands', 'trajectory_2d'),
    trajectory2dOperationCount: countMember(rows, 'visualOperations', 'trajectory_2d'),
  };
}

export function buildNestExampleVisualizationCoverageV3(
  sourceInventory: NestExampleSourceInventory,
  documentationInventory: NestDocumentationSourceInventory,
  predecessorCoverage: unknown,
  oracle: unknown,
): JsonRecord {
  const expectedPredecessor = buildNestExampleVisualizationCoverage(
    sourceInventory,
    documentationInventory,
  );
  if (!isRecord(predecessorCoverage) || !sameCanonical(predecessorCoverage, expectedPredecessor)) {
    throw new Error('immutable NEST visualization coverage V2 predecessor drifted');
  }
  if (
    nestExampleVisualizationCoverageV2Binding(predecessorCoverage)
      !== PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_DIGEST
  ) {
    throw new Error('immutable NEST visualization coverage V2 semantic digest drifted');
  }
  validateOracleAuthority(oracle);
  const projections = oracleProjectionMap(oracle);
  const semanticIds = new Set<string>(SEMANTIC_DEMAND_IDS_V3);
  const presentationIds = new Set<string>(PRESENTATION_DEMAND_IDS_V3);
  const operationIds = new Set<string>(VISUAL_OPERATION_IDS_V3);
  let correctedCount = 0;
  let unchangedCount = 0;

  const canonicalExamples = (predecessorCoverage.canonicalExamples as JsonRecord[]).map(
    (predecessorRow) => {
      const projection = projections.get(predecessorRow.path as string);
      if (!projection) throw new Error(`${predecessorRow.path}: oracle projection is absent`);
      if (projection.sourceSha256 !== predecessorRow.sha256) {
        throw new Error(`${predecessorRow.path}: oracle/source SHA-256 mismatch`);
      }
      const semanticDemands = exactStringArray(
        projection.semanticDemands,
        semanticIds,
        `${predecessorRow.path}: semanticDemands`,
      );
      const presentationDemands = exactStringArray(
        projection.presentationDemands,
        presentationIds,
        `${predecessorRow.path}: presentationDemands`,
      );
      const visualOperations = exactStringArray(
        projection.visualOperations,
        operationIds,
        `${predecessorRow.path}: visualOperations`,
      );
      const previousProjection = {
        semanticDemands: predecessorRow.semanticDemands,
        presentationDemands: predecessorRow.presentationDemands,
        visualOperations: predecessorRow.visualOperations,
      };
      const nextProjection = { semanticDemands, presentationDemands, visualOperations };
      const changed = !sameCanonical(previousProjection, nextProjection);
      if (
        projection.classification !== (changed ? 'corrected' : 'semantic_projection_unchanged')
      ) {
        throw new Error(`${predecessorRow.path}: oracle correction classification is inconsistent`);
      }
      correctedCount += Number(changed);
      unchangedCount += Number(!changed);
      return { ...predecessorRow, ...nextProjection };
    },
  );
  if (correctedCount !== 35 || unchangedCount !== 63) {
    throw new Error('V3 correction partition is not exactly 35 corrected plus 63 unchanged');
  }
  if (!sameCanonical(canonicalAggregates(canonicalExamples), EXPECTED_CANONICAL_AGGREGATES)) {
    throw new Error('V3 canonical aggregate projection drifted from the oracle contract');
  }
  if (
    !isRecord(oracle.summary)
    || !sameCanonical(
      oracle.summary.aggregateExpectations,
      EXPECTED_CANONICAL_AGGREGATES,
    )
  ) {
    throw new Error('oracle aggregate expectations drifted from its 98 projections');
  }
  if (!Array.isArray(oracle.computedNonvisualOutputs) || oracle.computedNonvisualOutputs.length !== 1) {
    throw new Error('oracle computed-output denominator must contain exactly one record');
  }

  const predecessorAuthorities = predecessorCoverage.authorities as JsonRecord;
  const root: JsonRecord = {
    ...predecessorCoverage,
    protocolVersion: 3,
    description:
      'Differential-oracle-bound V3 source-only visualization classification of all 98 canonical official PyNEST example bodies at pinned NEST 3.10. V3 corrects 35 semantic/presentation/operation projections and inherits 63 unchanged V2 taxonomy rows, while preserving computed-but-nonvisual output in a separate denominator. It transfers no execution, adapter-match, parity, or certification evidence.',
    authorities: {
      predecessor: {
        path: 'docs/audit/nest-example-coverage.v2.json',
        semanticDigest: PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_DIGEST,
        artifactSha256:
          'sha256:f640d39b8394ec108065092c5e95c9692d5fcd07ec1f91fb5cb3870b518fc535',
        artifactByteLength: 146_814,
        schemaSha256:
          'sha256:e62b5bab159dcc5922e325e931a2845dff39da52bfeb6dca78f12460f9d06f4a',
        implementationSha256:
          'sha256:4baf15ca72bdb14bf69c8f714af8a4b2d978d7b8f7fefef5b0bdf1d9b4405a68',
        generatorSha256:
          'sha256:229674bb397d0160d147271b34ac6d7015f48b41231c94beea8cb20ef5f3f1b6',
        evidenceTransfer: 'exact_source_identity_and_predecessor_projection_only',
      },
      exampleSourceInventory: predecessorAuthorities.exampleSourceInventory,
      documentationSourceInventory: predecessorAuthorities.documentationSourceInventory,
      differentialSourceOracle: {
        path: 'docs/audit/nest-example-visualization-oracle.v1.json',
        protocol: 'cortexel-nest-example-visualization-oracle',
        protocolVersion: 1,
        semanticDigest: PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_DIGEST,
        artifactSha256: PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_SHA256,
        artifactByteLength:
          PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_BYTE_LENGTH,
        method: 'python_stdlib_ast_differential_no_import_no_execution',
        reviewedGeneratorSourceSha256:
          PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_SHA256,
        reviewedGeneratorSourceByteLength:
          PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_BYTE_LENGTH,
        generatorExecutionAuthority: 'not_established',
      },
    },
    semanticDemandDefinitions: SEMANTIC_DEMAND_DEFINITIONS_V3,
    canonicalExamples,
    computedNonvisualOutputs: oracle.computedNonvisualOutputs,
    evidenceAxes: [
      { id: 'pinned_source_body_classification', state: 'complete' },
      { id: 'differential_pinned_source_ast_correction_oracle', state: 'complete' },
      { id: 'execution_bound_visual_output_inventory', state: 'not_established' },
      { id: 'example_specific_stable_mapping', state: 'not_established' },
      { id: 'example_specific_executable_adapter_match', state: 'not_established' },
      { id: 'renderer_upstream_parity', state: 'not_run' },
      { id: 'upstream_execution', state: 'not_run' },
      { id: 'scientific_certification', state: 'not_run' },
    ],
    summary: {
      ...predecessorCoverage.summary,
      semanticDemandDefinitionCount: SEMANTIC_DEMAND_DEFINITIONS_V3.length,
      correctedCanonicalProjectionCount: correctedCount,
      unchangedCanonicalProjectionCount: unchangedCount,
      computedNonvisualOutputCount: 1,
      canonicalAggregateProjection: EXPECTED_CANONICAL_AGGREGATES,
    },
    limitations: [
      'The review classifies exact pinned source bodies and exact helper semantics. Its explicit-binding AST checks are not a complete Python alias, reflection, mutation, or control-flow proof; they do not establish which branch executes, whether a figure is nonempty, or whether an example completes.',
      'V3 changes exactly 35 canonical semantic projections and retains 63 predecessor projections unchanged; it does not rewrite or withdraw the immutable V2 historical artifact.',
      'The NEST raster helper rate divides by unique senders present in its plotted timestamp carrier. It is not a complete-population rate and silently excludes every non-firing sender.',
      'NEST PlotTargets and PlotSources draw selected membership points, optional mask geometry, and an optional probability field. They do not draw endpoint-to-endpoint network edges.',
      'The if_curve source computes a complete-configured-population mean firing-rate surface and stores it without performing a visualization operation; it remains in a separate nonvisual computed-output denominator and does not inherit raster-helper active-sender semantics.',
      'A source-review stable skill candidate is not an admitted mapping. No example-specific FigureRequest, adapter input, output artifact, or custody receipt is present.',
      'The checked-in example-tree assets, support bodies, aliases, runner profiles, and selected documentation surfaces retain their separate V2 denominators.',
      'The oracle binds reviewed generator pathname bytes read after Python startup; it does not establish that those exact bytes were executed.',
      'Every example-specific adapter match, upstream execution, renderer parity, and scientific-certification count remains zero.',
    ],
  };
  const digest = nestExampleVisualizationCoverageV3Digest(root);
  root.semanticBinding = {
    identityAlgorithm: NEST_EXAMPLE_VISUALIZATION_COVERAGE_V3_IDENTITY,
    digestScope: 'all_top_level_members_except_semanticBinding',
    semanticDigest: digest,
  };
  return root;
}

function nestExampleVisualizationCoverageV2Binding(value: JsonRecord): unknown {
  return isRecord(value.semanticBinding) ? value.semanticBinding.semanticDigest : undefined;
}

function schemaProblems(value: unknown, schema: unknown, label: string): string[] {
  if (!isRecord(schema)) return [`${label} schema root must be an object`];
  try {
    const validate = new Ajv2020({
      allErrors: true,
      strict: true,
      validateSchema: true,
    }).compile(schema);
    if (validate(value)) return [];
    return (validate.errors ?? []).slice(0, 64).map(
      (error) => `${label} schema ${error.instancePath || '/'} ${error.message ?? error.keyword}`,
    );
  } catch {
    return [`${label} schema is not strict-compilable`];
  }
}

export function validateNestExampleVisualizationOracle(
  value: unknown,
  schema: unknown,
  rawUtf8?: string,
  reviewedGeneratorSourceBytes?: Uint8Array,
): readonly string[] {
  const problems = schemaProblems(value, schema, 'oracle-v1');
  if (!isRecord(value)) return [...new Set(problems)].sort().slice(0, 64);
  try {
    if (rawUtf8 !== undefined && rawUtf8 !== `${canonicalize(value as never)}\n`) {
      problems.push('oracle-v1 artifact bytes are not exact canonical JSON plus one newline');
    }
    if (
      rawUtf8 !== undefined
      && sha256DigestBytes(new TextEncoder().encode(rawUtf8))
        !== PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_SHA256
    ) {
      problems.push('oracle-v1 exact artifact SHA-256 drifted');
    }
    if (
      reviewedGeneratorSourceBytes !== undefined
      && (
        reviewedGeneratorSourceBytes.byteLength
          !== PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_BYTE_LENGTH
        || sha256DigestBytes(reviewedGeneratorSourceBytes)
          !== PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_SHA256
      )
    ) {
      problems.push('oracle-v1 reviewed generator source exact bytes drifted');
    }
    validateOracleAuthority(value);
  } catch (error) {
    problems.push(
      `oracle-v1 authority failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
  return [...new Set(problems)].sort().slice(0, 64);
}

export function validateNestExampleVisualizationCoverageV3(
  value: unknown,
  schema: unknown,
  sourceInventory: NestExampleSourceInventory,
  documentationInventory: NestDocumentationSourceInventory,
  predecessorCoverage: unknown,
  oracle: unknown,
  rawUtf8?: string,
): readonly string[] {
  const problems = schemaProblems(value, schema, 'coverage-v3');
  if (!isRecord(value)) return [...new Set(problems)].sort().slice(0, 64);
  try {
    if (rawUtf8 !== undefined && rawUtf8 !== `${canonicalize(value as never)}\n`) {
      problems.push('coverage-v3 artifact bytes are not exact canonical JSON plus one newline');
    }
    const expected = buildNestExampleVisualizationCoverageV3(
      sourceInventory,
      documentationInventory,
      predecessorCoverage,
      oracle,
    );
    if (!sameCanonical(value, expected)) {
      problems.push('coverage-v3 value drifted from the closed oracle-bound projection');
    }
    const computed = nestExampleVisualizationCoverageV3Digest(value);
    const binding = isRecord(value.semanticBinding) ? value.semanticBinding : {};
    if (binding.semanticDigest !== computed) {
      problems.push('coverage-v3 semantic binding does not match its canonical preimage');
    }
    if (computed !== PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_V3_DIGEST) {
      problems.push('coverage-v3 reviewed semantic digest drifted');
    }
  } catch (error) {
    problems.push(
      `coverage-v3 closed projection failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
  return [...new Set(problems)].sort().slice(0, 64);
}
