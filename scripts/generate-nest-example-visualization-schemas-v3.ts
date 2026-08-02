#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256DigestBytes } from '../src/core/sha256.js';
import {
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_BYTE_LENGTH,
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_BYTE_LENGTH,
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_SHA256,
  PRESENTATION_DEMAND_IDS_V3,
  SEMANTIC_DEMAND_IDS_V3,
  VISUAL_OPERATION_IDS_V3,
} from './lib/nest-example-visualization-coverage-v3.js';
import { readDirectRepositoryFile } from './lib/direct-repository-file.js';
import { publishNewExclusiveAuditFile } from './lib/exclusive-audit-publication.js';
import { parseJsonSourceStrict } from './lib/strict-json-source.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const V3_SCHEMA_PATH = path.join(ROOT, 'docs/audit/nest-example-coverage.v3.schema.json');
const ORACLE_SCHEMA_PATH = path.join(
  ROOT,
  'docs/audit/nest-example-visualization-oracle.v1.schema.json',
);

function strictObject(
  properties: JsonRecord,
  required: readonly string[] = Object.keys(properties),
): JsonRecord {
  return { type: 'object', properties, required: [...required], additionalProperties: false };
}

function integer(minimum = 0, maximum = 1_000_000): JsonRecord {
  return { type: 'integer', minimum, maximum };
}

function schemaBytes(schema: JsonRecord): string {
  return `${JSON.stringify(schema, null, 2)}\n`;
}

function readReviewedJson(relativePath: string, expectedSha256: string): JsonRecord {
  const bytes = readDirectRepositoryFile(ROOT, relativePath);
  if (sha256DigestBytes(bytes) !== expectedSha256) {
    throw new Error(`${relativePath}: exact reviewed schema bytes drifted`);
  }
  return parseJsonSourceStrict<JsonRecord>(bytes, relativePath);
}

export function buildNestExampleVisualizationCoverageV3Schema(): JsonRecord {
  const schema = structuredClone(
    readReviewedJson(
      'docs/audit/nest-example-coverage.v2.schema.json',
      'sha256:e62b5bab159dcc5922e325e931a2845dff39da52bfeb6dca78f12460f9d06f4a',
    ),
  );
  schema.$id = 'https://cortexel.dev/schema/audit/nest-example-coverage.v3.json';
  schema.title = 'Cortexel pinned NEST PyNEST-example visualization classification V3';
  schema.$defs.semanticDemandId.enum = [...SEMANTIC_DEMAND_IDS_V3];
  schema.$defs.presentationDemandId.enum = [...PRESENTATION_DEMAND_IDS_V3];
  schema.$defs.visualOperationId.enum = [...VISUAL_OPERATION_IDS_V3];
  schema.$defs.body.properties.semanticDemands.maxItems = SEMANTIC_DEMAND_IDS_V3.length;
  schema.$defs.body.properties.presentationDemands.maxItems = PRESENTATION_DEMAND_IDS_V3.length;
  schema.$defs.body.properties.visualOperations.maxItems = VISUAL_OPERATION_IDS_V3.length;
  schema.properties.protocolVersion.const = 3;
  schema.properties.semanticBinding.properties.identityAlgorithm.const =
    'cortexel-nest-example-visualization-coverage.semantic.rfc8785-sha256.v3';
  schema.properties.semanticDemandDefinitions.minItems = SEMANTIC_DEMAND_IDS_V3.length;
  schema.properties.semanticDemandDefinitions.maxItems = SEMANTIC_DEMAND_IDS_V3.length;

  const sha = { $ref: '#/$defs/sha256' };
  const nonEmpty = { $ref: '#/$defs/nonEmpty' };
  const sourceAuthority = strictObject({
    path: nonEmpty,
    protocol: nonEmpty,
    protocolVersion: integer(1, 16),
    inventoryDigest: sha,
    artifactSha256: sha,
    artifactByteLength: integer(1, 2_000_000),
  });
  schema.properties.authorities = strictObject({
    predecessor: strictObject({
      path: { const: 'docs/audit/nest-example-coverage.v2.json' },
      semanticDigest: sha,
      artifactSha256: sha,
      artifactByteLength: { const: 146_814 },
      schemaSha256: sha,
      implementationSha256: sha,
      generatorSha256: sha,
      evidenceTransfer: { const: 'exact_source_identity_and_predecessor_projection_only' },
    }),
    exampleSourceInventory: sourceAuthority,
    documentationSourceInventory: sourceAuthority,
    differentialSourceOracle: strictObject({
      path: { const: 'docs/audit/nest-example-visualization-oracle.v1.json' },
      protocol: { const: 'cortexel-nest-example-visualization-oracle' },
      protocolVersion: { const: 1 },
      semanticDigest: sha,
      artifactSha256: sha,
      artifactByteLength: {
        const: PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_BYTE_LENGTH,
      },
      method: { const: 'python_stdlib_ast_differential_no_import_no_execution' },
      reviewedGeneratorSourceSha256: {
        const: PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_SHA256,
      },
      reviewedGeneratorSourceByteLength: {
        const: PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_REVIEWED_SOURCE_BYTE_LENGTH,
      },
      generatorExecutionAuthority: { const: 'not_established' },
    }),
  });

  schema.$defs.alias = strictObject({
    aliasId: sha,
    aliasPath: nonEmpty,
    aliasSourceId: sha,
    canonicalSourceId: sha,
    classification: { const: 'alias_not_an_additional_python_body' },
    resolutionStatus: { const: 'resolved' },
    resolvedTargetPath: nonEmpty,
    targetLiteral: nonEmpty,
  });
  schema.properties.orchestrationAliases.items = { $ref: '#/$defs/alias' };
  schema.$defs.visualAsset = strictObject({
    assetId: sha,
    byteLength: integer(1, 10_000_000),
    evidenceState: { const: 'checked_in_source_asset_not_execution_bound_output' },
    extension: { enum: ['gif', 'png', 'svg'] },
    gitBlobSha1: { $ref: '#/$defs/gitSha1' },
    gitMode: { const: '100644' },
    path: nonEmpty,
    pathBytesBase64: nonEmpty,
    role: { const: 'checked_in_upstream_visual_asset' },
    scientificCertification: { const: 'not_run' },
    semanticMapping: { const: 'not_assessed' },
    sha256: sha,
    upstreamParity: { const: 'not_run' },
  });
  schema.properties.checkedInVisualAssets.items = { $ref: '#/$defs/visualAsset' };
  schema.properties.documentationSurfaces = strictObject({
    authoredDiagramDirectiveCount: integer(),
    denominator: {
      const: 'separate_selected_documentation_source_inventory_not_example_body_coverage',
    },
    documentationScriptActiveSaveCallCount: integer(),
    documentationScriptFigureDefinitionCount: integer(),
    evidenceState: {
      const: 'source_definitions_and_stored_assets_only_not_built_or_executed',
    },
    mappingState: { const: 'not_assessed_in_this_example_body_classification' },
    notebookPlotLikePngCount: integer(),
    notebookStoredPngCount: integer(),
    publicVisualizationModuleDefinitionCount: integer(),
    rstFigureOrImageReferenceCount: integer(),
    scientificCertification: { const: 'not_run' },
    selectedBoundBlobCount: integer(),
    upstreamParity: { const: 'not_run' },
  });
  schema.properties.computedNonvisualOutputs = {
    type: 'array',
    minItems: 1,
    maxItems: 1,
    items: strictObject({
      axes: {
        type: 'array',
        prefixItems: [{ const: 'I_mean' }, { const: 'I_std' }],
        minItems: 2,
        maxItems: 2,
      },
      carrier: { const: 'IF_curve.rate' },
      coverageDenominator: {
        const: 'separate_nonvisual_computed_output_not_a_visualization_body',
      },
      denominator: { const: 'configured_self_n_neurons_times_self_t_sim_ms' },
      denominatorMeaning: {
        const: 'all_neurons_created_for_each_trial_not_only_senders_with_recorded_events',
      },
      kind: { const: 'computed_response_surface_2d_no_visualization_operation' },
      normalizationFormula: {
        const: 'n_events * 1000.0 / (1.0 * self.n_neurons * self.t_sim)',
      },
      populationConnection: {
        const: 'nest.Connect(self.neuron,self.spike_recorder,all_to_all)',
      },
      path: { const: 'pynest/examples/if_curve.py' },
      sourceLineAnchors: {
        type: 'array',
        minItems: 1,
        maxItems: 32,
        uniqueItems: true,
        items: integer(1, 10_000),
      },
      sourceLineAnchorMeaning: {
        const: 'ast_derived_navigation_only_full_source_sha256_is_authority',
      },
      sourceSha256: sha,
      trialOrder: {
        const: 'fresh_build_then_connect_then_simulate_then_read_n_events',
      },
      value: { const: 'configured_complete_population_mean_firing_rate_hz' },
    }),
  };
  schema.properties.evidenceAxes.minItems = 8;
  schema.properties.evidenceAxes.maxItems = 8;

  const aggregateProperties = Object.fromEntries([
    'activeSenderNormalizedRateDemandCount',
    'analogTraceDemandCount',
    'crossCapabilityBundleDemandCount',
    'dualYAxisDemandCount',
    'equalXYScaleDemandCount',
    'histogramOperationCount',
    'imageOperationCountCanonicalOnly',
    'multiPanelDemandCount',
    'networkEdgesOperationCount',
    'populationRateDemandCount',
    'probabilityFieldOperationCount',
    'responseCurveDemandCount',
    'sharedXAxisDemandCount',
    'sharedYAxisDemandCount',
    'singlePanelDemandCount',
    'spatialMaskOperationCount',
    'spatialNeighborhoodMembershipDemandCount',
    'spatialNodeMapDemandCount',
    'spatialProbabilityFieldDemandCount',
    'trajectory2dDemandCount',
    'trajectory2dOperationCount',
  ].map((name) => [name, integer(0, 98)]));
  const summaryIntegerNames = [
    'canonicalActiveVisualizationBodyCount',
    'canonicalExampleBodyCount',
    'canonicalNoVisualizationBodyCount',
    'canonicalVisualizationImportOnlyBodyCount',
    'checkedInVisualAssetCount',
    'computedNonvisualOutputCount',
    'correctedCanonicalProjectionCount',
    'exampleSpecificExecutableAdapterMatchCount',
    'exampleSpecificMappedOutputCount',
    'executionBoundVisualOutputCount',
    'orchestrationAliasCount',
    'regularPythonActiveVisualizationBodyCount',
    'regularPythonBodyCount',
    'regularPythonNoVisualizationBodyCount',
    'regularPythonVisualizationImportOnlyBodyCount',
    'rendererUpstreamParityResultCount',
    'runnerTargetProfileCount',
    'scientificallyCertifiedOutputCount',
    'semanticDemandDefinitionCount',
    'supportOrCoordinatedActiveVisualizationBodyCount',
    'supportOrCoordinatedBodyCount',
    'supportOrCoordinatedNoVisualizationBodyCount',
    'supportOrCoordinatedVisualizationImportOnlyBodyCount',
    'unchangedCanonicalProjectionCount',
    'upstreamExecutedOutputCount',
  ];
  schema.properties.summary = strictObject({
    ...Object.fromEntries(summaryIntegerNames.map((name) => [name, integer(0, 1_000)])),
    canonicalAggregateProjection: strictObject(aggregateProperties),
    coverageClaim: { const: 'source_semantic_classification_only' },
  });
  schema.properties.limitations.minItems = 9;
  schema.properties.limitations.maxItems = 9;
  schema.required.push('computedNonvisualOutputs');
  return schema;
}

export function buildNestExampleVisualizationOracleV1Schema(): JsonRecord {
  const sha = { $ref: '#/$defs/sha256' };
  const nonEmpty = { $ref: '#/$defs/nonEmpty' };
  const pathArray = (maxItems: number): JsonRecord => ({
    type: 'array',
    minItems: maxItems,
    maxItems,
    uniqueItems: true,
    items: {
      type: 'string',
      pattern: '^pynest/examples/.+\\.py$',
      maxLength: 300,
    },
  });
  const semanticDemandIds = { enum: [...SEMANTIC_DEMAND_IDS_V3] };
  const presentationDemandIds = { enum: [...PRESENTATION_DEMAND_IDS_V3] };
  const visualOperationIds = { enum: [...VISUAL_OPERATION_IDS_V3] };
  const aggregateNames = [
    'activeSenderNormalizedRateDemandCount',
    'analogTraceDemandCount',
    'crossCapabilityBundleDemandCount',
    'dualYAxisDemandCount',
    'equalXYScaleDemandCount',
    'histogramOperationCount',
    'imageOperationCountCanonicalOnly',
    'multiPanelDemandCount',
    'networkEdgesOperationCount',
    'populationRateDemandCount',
    'probabilityFieldOperationCount',
    'responseCurveDemandCount',
    'sharedXAxisDemandCount',
    'sharedYAxisDemandCount',
    'singlePanelDemandCount',
    'spatialMaskOperationCount',
    'spatialNeighborhoodMembershipDemandCount',
    'spatialNodeMapDemandCount',
    'spatialProbabilityFieldDemandCount',
    'trajectory2dDemandCount',
    'trajectory2dOperationCount',
  ];
  const aggregate = strictObject(
    Object.fromEntries(aggregateNames.map((name) => [name, integer(0, 98)])),
  );
  const helperBase = {
    byteLength: integer(1, 100_000),
    path: nonEmpty,
    sha256: sha,
  };
  const rasterHelper = strictObject({
    ...helperBase,
    verifiedSemantics: strictObject({
      fromDeviceCall: { const: 'nest.raster_plot.from_device' },
      histogramBinWidthDefaultMs: { const: 5 },
      histogramDefault: { const: true },
      rateFormula: {
        const: '1000 * bin_event_count / (histogram_bin_width_ms * unique_plotted_sender_count)',
      },
      senderDenominator: { const: 'len(numpy.unique(neurons))' },
      senderDenominatorMeaning: {
        const: 'active_senders_present_in_unfiltered_timestamp_carrier',
      },
    }),
  });
  const spatialHelper = strictObject({
    ...helperBase,
    verifiedSemantics: strictObject({
      extentAspect: { const: 'equal_xy' },
      extentAspectCallChain: {
        const: 'PlotLayer_PlotTargets_PlotSources_to__draw_extent',
      },
      mask: { const: 'explicit_patch_geometry_when_supplied' },
      plotSources: { const: 'point_membership_no_endpoint_lines' },
      plotTargets: { const: 'point_membership_no_endpoint_lines' },
      probabilityParameter: { const: 'bounded_image_field_clamped_to_zero_one' },
    }),
  });
  const expectedProjection = strictObject({
    classification: { enum: ['corrected', 'semantic_projection_unchanged'] },
    path: {
      type: 'string',
      pattern: '^pynest/examples/.+\\.py$',
      maxLength: 300,
    },
    predecessorProjectionDigest: sha,
    presentationDemands: {
      type: 'array',
      maxItems: PRESENTATION_DEMAND_IDS_V3.length,
      uniqueItems: true,
      items: presentationDemandIds,
    },
    semanticDemands: {
      type: 'array',
      maxItems: SEMANTIC_DEMAND_IDS_V3.length,
      uniqueItems: true,
      items: semanticDemandIds,
    },
    sourceSha256: sha,
    v3ProjectionDigest: sha,
    visualOperations: {
      type: 'array',
      maxItems: VISUAL_OPERATION_IDS_V3.length,
      uniqueItems: true,
      items: visualOperationIds,
    },
  });
  const computedOutput = strictObject({
    axes: {
      type: 'array',
      prefixItems: [{ const: 'I_mean' }, { const: 'I_std' }],
      minItems: 2,
      maxItems: 2,
    },
    carrier: { const: 'IF_curve.rate' },
    coverageDenominator: {
      const: 'separate_nonvisual_computed_output_not_a_visualization_body',
    },
    denominator: { const: 'configured_self_n_neurons_times_self_t_sim_ms' },
    denominatorMeaning: {
      const: 'all_neurons_created_for_each_trial_not_only_senders_with_recorded_events',
    },
    kind: { const: 'computed_response_surface_2d_no_visualization_operation' },
    normalizationFormula: {
      const: 'n_events * 1000.0 / (1.0 * self.n_neurons * self.t_sim)',
    },
    populationConnection: {
      const: 'nest.Connect(self.neuron,self.spike_recorder,all_to_all)',
    },
    path: { const: 'pynest/examples/if_curve.py' },
    sourceLineAnchors: {
      type: 'array',
      minItems: 1,
      maxItems: 32,
      uniqueItems: true,
      items: integer(1, 10_000),
    },
    sourceLineAnchorMeaning: {
      const: 'ast_derived_navigation_only_full_source_sha256_is_authority',
    },
    sourceSha256: sha,
    trialOrder: {
      const: 'fresh_build_then_connect_then_simulate_then_read_n_events',
    },
    value: { const: 'configured_complete_population_mean_firing_rate_hz' },
  });
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://cortexel.dev/schema/audit/nest-example-visualization-oracle.v1.json',
    title: 'Differential pinned NEST visualization AST oracle V1',
    type: 'object',
    $defs: {
      sha256: { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' },
      nonEmpty: { type: 'string', minLength: 1, maxLength: 8000 },
    },
    properties: {
      protocol: { const: 'cortexel-nest-example-visualization-oracle' },
      protocolVersion: { const: 1 },
      description: nonEmpty,
      upstream: strictObject({
        commit: { const: 'acca9704da248750219a027db99fec6cd1f9052a' },
        exampleRoot: { const: 'pynest/examples' },
        project: { const: 'NEST Simulator' },
        release: { const: 'v3.10' },
        repository: { const: 'https://github.com/nest/nest-simulator.git' },
        rootTreeGitSha1: { type: 'string', pattern: '^[0-9a-f]{40}$' },
      }),
      authorities: strictObject({
        helperSources: {
          type: 'array',
          prefixItems: [rasterHelper, spatialHelper],
          minItems: 2,
          maxItems: 2,
        },
        predecessorCoverage: strictObject({
          artifactSha256: sha,
          evidenceTransfer: { const: 'exact_source_identity_and_predecessor_projection_only' },
          generatorSha256: sha,
          implementationSha256: sha,
          path: { const: 'docs/audit/nest-example-coverage.v2.json' },
          schemaSha256: sha,
          semanticDigest: sha,
        }),
        reviewedGeneratorSource: strictObject({
          byteLength: integer(1, 1_000_000),
          executionBinding: {
            const: 'not_established_path_bytes_read_after_interpreter_start',
          },
          path: { const: 'scripts/generate-nest-example-visualization-oracle.py' },
          profile: { const: 'python_stdlib_ast_differential_reviewed_source.v1' },
          sha256: sha,
        }),
        sourceInventory: strictObject({
          inventoryDigest: sha,
          path: { const: 'docs/audit/nest-example-source-inventory.v2.json' },
          verifiedRegularPythonBodyCount: { const: 109 },
          verifiedSourceLeafCount: { const: 112 },
          verifiedSymlinkLiteralCount: { const: 3 },
        }),
      }),
      method: strictObject({
        canonicalizationProfile: {
          const: 'ascii_object_keys_integer_string_boolean_null_rfc8785_subset_v1',
        },
        closedSetDerivation: { const: 'AST call_and_keyword_shapes_plus_exact_helper_semantics' },
        parser: { const: 'python_stdlib_ast_no_import_no_execution' },
        generatorExecutionAuthority: { const: 'not_established' },
        sourceVerification: {
          const: 'all_112_source_leaf_sha256_and_byte_lengths_against_v2_inventory',
        },
        taxonomyBasis: {
          const: 'v2_projection_inherited_with_ast_derived_closed_correction_sets',
        },
        upstreamTreeIdentity: {
          const: 'inherited_exact_v2_inventory_claim_not_independently_reverified_by_oracle',
        },
      }),
      derivedPathSets: strictObject({
        rasterPlotFromDeviceCallProfiles: {
          type: 'array',
          minItems: 9,
          maxItems: 9,
          uniqueItems: true,
          items: strictObject({
            histogramArgument: { enum: ['helper_default_true', 'literal_true'] },
            histogramBinWidthMsLiteralValue: {
              enum: ['helper_default_5.0', '100.0'],
            },
            lineAnchor: integer(1, 10_000),
            path: {
              type: 'string',
              pattern: '^pynest/examples/.+\\.py$',
              maxLength: 300,
            },
          }),
        },
        rasterPlotFromDevicePaths: pathArray(9),
        sharedXAxisPaths: pathArray(14),
        sharedYAxisPaths: pathArray(6),
        spatial2dCallProfiles: {
          type: 'array',
          minItems: 12,
          maxItems: 12,
          items: strictObject({
            constructorLineAnchors: {
              type: 'array', minItems: 1, maxItems: 16, uniqueItems: true,
              items: integer(1, 10_000),
            },
            consumerLineAnchors: {
              type: 'array', minItems: 1, maxItems: 32, uniqueItems: true,
              items: integer(1, 10_000),
            },
            dimension: { const: 2 },
            equalScaleLineAnchors: {
              type: 'array', minItems: 1, maxItems: 16, uniqueItems: true,
              items: integer(1, 10_000),
            },
            helperBranch: {
              const: 'reviewed_2d_constructor_and_helper_branch_syntax',
            },
            layerCreationLineAnchors: {
              type: 'array', minItems: 1, maxItems: 16, uniqueItems: true,
              items: integer(1, 10_000),
            },
            path: {
              type: 'string', pattern: '^pynest/examples/.+\\.py$', maxLength: 300,
            },
          }),
        },
        spatialMaskPaths: pathArray(6),
        spatialNeighborhoodMembershipPaths: pathArray(8),
        spatialNodeMapPaths: pathArray(4),
        spatialProbabilityFieldPaths: pathArray(1),
        spatialReviewedPaths: pathArray(12),
        trajectory2dCallProfiles: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: strictObject({
            carrier: { const: 'two_component_readout_and_target_output_coordinates' },
            dimension: { const: 2 },
            path: {
              type: 'string', pattern: '^pynest/examples/.+\\.py$', maxLength: 300,
            },
            sourceLineAnchors: {
              type: 'array', minItems: 1, maxItems: 32, uniqueItems: true,
              items: integer(1, 10_000),
            },
          }),
        },
        trajectory2dPaths: pathArray(2),
      }),
      correctionEvidence: {
        type: 'array',
        minItems: 35,
        maxItems: 35,
        items: strictObject({
          astEvidence: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: strictObject({
              kind: {
                enum: [
                  'equal_xy_trajectory',
                  'raster_helper_bundle',
                  'response_curve',
                  'shared_x_axis',
                  'shared_y_axis',
                  'single_panel_dual_dimension',
                  'spatial_mask',
                  'spatial_neighborhood_membership',
                  'spatial_node_map',
                  'spatial_probability_field',
                ],
              },
              lineAnchors: {
                type: 'array', minItems: 1, maxItems: 64, uniqueItems: true,
                items: integer(1, 10_000),
              },
            }),
          },
          categories: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            uniqueItems: true,
            items: {
              enum: [
                'equal_xy_trajectory',
                'raster_helper_bundle',
                'response_curve',
                'shared_x_axis',
                'shared_y_axis',
                'single_panel_dual_dimension',
                'spatial_mask',
                'spatial_neighborhood_membership',
                'spatial_node_map',
                'spatial_probability_field',
              ],
            },
          },
          path: {
            type: 'string', pattern: '^pynest/examples/.+\\.py$', maxLength: 300,
          },
          predecessorProjectionDigest: sha,
          v3ProjectionDigest: sha,
        }),
      },
      expectedCanonicalProjections: {
        type: 'array',
        minItems: 98,
        maxItems: 98,
        items: expectedProjection,
      },
      computedNonvisualOutputs: {
        type: 'array',
        minItems: 1,
        maxItems: 1,
        items: computedOutput,
      },
      summary: strictObject({
        aggregateExpectations: aggregate,
        canonicalExampleCount: { const: 98 },
        computedNonvisualOutputCount: { const: 1 },
        correctedCanonicalProjectionCount: { const: 35 },
        helperSourceSha256VerifiedCount: { const: 2 },
        imageOperationCountAllRegularBodies: { const: 4 },
        sourceLeafSha256VerifiedCount: { const: 112 },
        unchangedCanonicalProjectionCount: { const: 63 },
      }),
      limitations: {
        type: 'array',
        minItems: 7,
        maxItems: 7,
        uniqueItems: true,
        items: nonEmpty,
      },
      semanticBinding: strictObject({
        digestScope: { const: 'all_top_level_members_except_semanticBinding' },
        identityAlgorithm: {
          const: 'cortexel-nest-example-visualization-oracle.semantic.rfc8785-sha256.v1',
        },
        semanticDigest: sha,
      }),
    },
    required: [
      'protocol',
      'protocolVersion',
      'description',
      'upstream',
      'authorities',
      'method',
      'derivedPathSets',
      'correctionEvidence',
      'expectedCanonicalProjections',
      'computedNonvisualOutputs',
      'summary',
      'limitations',
      'semanticBinding',
    ],
    additionalProperties: false,
  };
}

export function generatedNestExampleVisualizationCoverageV3SchemaBytes(): string {
  return schemaBytes(buildNestExampleVisualizationCoverageV3Schema());
}

export function generatedNestExampleVisualizationOracleV1SchemaBytes(): string {
  return schemaBytes(buildNestExampleVisualizationOracleV1Schema());
}

function main(argv: readonly string[]): void {
  const outputs = {
    v3: {
      path: V3_SCHEMA_PATH,
      bytes: generatedNestExampleVisualizationCoverageV3SchemaBytes(),
    },
    oracle: {
      path: ORACLE_SCHEMA_PATH,
      bytes: generatedNestExampleVisualizationOracleV1SchemaBytes(),
    },
  } as const;
  if (argv.length === 1 && argv[0] === '--check') {
    for (const output of Object.values(outputs)) {
      if (readFileSync(output.path, 'utf8') !== output.bytes) {
        throw new Error(`checked-in NEST visualization schema drifted: ${output.path}`);
      }
    }
    return;
  }
  if (argv.length === 3 && argv[0] === '--output') {
    const kind = argv[1] as keyof typeof outputs;
    const requestedPath = argv[2];
    const output = outputs[kind];
    if (!output || requestedPath === undefined) {
      throw new Error('schema output kind/path is invalid');
    }
    publishNewExclusiveAuditFile(requestedPath, output.bytes);
    return;
  }
  throw new Error(
    'usage: generate-nest-example-visualization-schemas-v3.ts --check | --output <v3|oracle> <absent-path>',
  );
}

const isDirectExecution =
  process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) main(process.argv.slice(2));
