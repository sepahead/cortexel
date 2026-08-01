/**
 * Deterministic, source-only inventory of selected pinned NEST documentation
 * source scopes.
 *
 * The builder reads exact content-addressed Git blobs from the reviewed commit.
 * It does not import PyNEST, execute a notebook or documentation script, invoke
 * Sphinx, or render an artifact. The resulting classifications are source
 * definitions and checked-in media only. They are not a Sphinx/CMake build-input
 * or visualization-definition denominator and deliberately carry no mapping,
 * renderer, parity, or certification state.
 */
import { createHash } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';

import {
  canonicalDigest,
  canonicalize,
  type JsonValue,
} from '../../src/core/canonicalize.js';
import {
  controlledGitCommandArguments,
  controlledGitEnvironment,
  requireOfflineGitReadAuthority,
  sameOfflineGitObjectDatabase,
  verifyOfflineGitObjectDatabase,
  type OfflineGitObjectDatabaseSnapshot,
  type VerifiedOfflineGitReadAuthority,
} from './offline-git-object-database.js';
import {
  processReviewedGitRuntime,
  readReviewedGitBlobBatch,
  runReviewedGitCommand,
  type ReviewedGitRuntime,
} from './reviewed-git-command.js';
import {
  PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
} from './nest-example-source-inventory.js';
import { parseJsonSourceStrict } from './strict-json-source.js';

const POSIX = path.posix;
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const MAX_GIT_OUTPUT_BYTES = 256 * 1024 * 1024;
const VERIFIED_ACQUISITION_CONTEXT = Symbol(
  'verified NEST documentation inventory acquisition context',
);
const VERIFIED_ACQUISITION_CONTEXTS = new WeakSet<object>();
const VERIFIED_ACQUISITION_SNAPSHOTS = new WeakMap<
  object,
  OfflineGitObjectDatabaseSnapshot
>();

export const NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY =
  'cortexel-nest-documentation-source-inventory.rfc8785-sha256.v1' as const;

/**
 * Closed declaration for the intended reviewed acquisition-harness procedure.
 * It identifies the procedure that the current generator requires; the retained
 * declaration is not an independent receipt that the procedure actually ran.
 */
export const NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE = Object.freeze({
  schema: 'cortexel-source-inventory-acquisition-producer-profile.v1',
  producer: 'scripts/generate-nest-documentation-source-inventory.ts',
  profile:
    'cortexel.nest-documentation.git-sha1-blobless-structural-137-raw-https-selected-784-reviewed-posix-opaque-offline-object-closure-batch-canonical-object-rehash.v4',
  harnessRevision: 4,
  executionEvidence: 'profile_declaration_not_independent_execution_receipt',
} as const);

const UNDECLARED_ACQUISITION_PRODUCER_PROFILE = Object.freeze({
  state: 'not_declared',
} as const);

/** Updated only after reviewing a regenerated canonical pinned artifact. */
export const PINNED_NEST_DOCUMENTATION_SOURCE_INVENTORY_DIGEST =
  'sha256:bbd9c3b77aac4d6ee64d7b185a5acd85eabeb40c621114126ff210bd7150fcc8' as const;

const FORMULA_NOTEBOOK_PNG_KEYS = Object.freeze([
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#6:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#8:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#11:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#13:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#16:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#19:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#22:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#23:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#27:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#28:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#30:0',
  'doc/htmldoc/model_details/noise_generator.ipynb#3:0',
] as const);

const PLOT_LIKE_NOTEBOOK_PNG_KEYS = Object.freeze([
  'doc/htmldoc/model_details/Brunel_Wang_2001_Model_Approximation.ipynb#8:0',
  'doc/htmldoc/model_details/Brunel_Wang_2001_Model_Approximation.ipynb#12:0',
  'doc/htmldoc/model_details/Brunel_Wang_2001_Model_Approximation.ipynb#16:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#30:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#33:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#37:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#40:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#45:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#51:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#55:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#62:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#64:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#65:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#66:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#71:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#75:0',
  'doc/htmldoc/model_details/HillTononiModels.ipynb#82:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#35:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#37:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#43:0',
  'doc/htmldoc/model_details/IAF_Integration_Singularity.ipynb#45:0',
  'doc/htmldoc/model_details/aeif_models_implementation.ipynb#16:0',
  'doc/htmldoc/model_details/aeif_models_implementation.ipynb#18:0',
  'doc/htmldoc/model_details/aeif_models_implementation.ipynb#22:0',
  'doc/htmldoc/model_details/aeif_models_implementation.ipynb#24:1',
  'doc/htmldoc/model_details/aeif_models_implementation.ipynb#26:0',
  'doc/htmldoc/model_details/noise_generator.ipynb#14:1',
  'doc/htmldoc/model_details/noise_generator.ipynb#17:1',
  'doc/htmldoc/model_details/noise_generator.ipynb#20:1',
  'doc/htmldoc/model_details/noise_generator.ipynb#22:1',
  'doc/htmldoc/model_details/noise_generator.ipynb#24:0',
  'doc/htmldoc/model_details/noise_generator.ipynb#28:0',
  'doc/htmldoc/model_details/noise_generator.ipynb#32:0',
  'doc/htmldoc/model_details/post_trace_computation.ipynb#13:0',
  'doc/htmldoc/model_details/siegert_neuron_integration.ipynb#3:0',
  'doc/htmldoc/model_details/siegert_neuron_integration.ipynb#5:0',
  'doc/htmldoc/model_details/siegert_neuron_integration.ipynb#8:0',
  'doc/htmldoc/model_details/siegert_neuron_integration.ipynb#9:0',
] as const);

const PUBLIC_VISUALIZATION_MODULES = Object.freeze([
  {
    path: 'pynest/nest/lib/hl_api_spatial.py',
    publicNames: [
      'PlotLayer',
      'PlotProbabilityParameter',
      'PlotSources',
      'PlotTargets',
    ],
  },
  {
    path: 'pynest/nest/raster_plot.py',
    publicNames: [
      'from_data',
      'from_device',
      'from_file',
      'from_file_numpy',
      'from_file_pandas',
    ],
  },
  {
    path: 'pynest/nest/visualization.py',
    publicNames: ['plot_network'],
  },
  {
    path: 'pynest/nest/voltage_trace.py',
    publicNames: ['from_device', 'from_file'],
  },
] as const);

const AUTHORED_DIAGRAM_DIRECTIVES = Object.freeze([
  {
    sourcePath: 'doc/htmldoc/testuml.rst',
    line: 20,
    kind: 'uml',
    target: null,
    directiveBlockSha256:
      'sha256:953588ab538af7fc7846562186841f8633e4c3865015fccb72a7d4432e0897b7',
  },
  {
    sourcePath: 'doc/htmldoc/testuml.rst',
    line: 11,
    kind: 'uml',
    target: null,
    directiveBlockSha256:
      'sha256:7c522eebaa624c46cef475683a3709afbe3b7455002efe4ded3c92863fb46b53',
  },
  {
    sourcePath: 'doc/htmldoc/nest_behavior/built-in_timers.rst',
    line: 77,
    kind: 'graphviz',
    target: '/simulation_run.dot',
    directiveBlockSha256:
      'sha256:e4768b80592b7e7c013c2b1f363ba164020e2d7e977cc77cbae303a798c0716d',
  },
  {
    sourcePath:
      'doc/htmldoc/developer_space/workflows/documentation_workflow/user_documentation_workflow.rst',
    line: 24,
    kind: 'mermaid',
    target: null,
    directiveBlockSha256:
      'sha256:1d14e101f759198fb2bd0224960347d671301d90f47c13a2e4fb0ee70fd7cfb8',
  },
] as const);

const UNSAVED_SCRIPT_FIGURES = Object.freeze([
  {
    family: 'layer1',
    sourcePath: 'doc/htmldoc/networks/scripts/layers.py',
    sourceMarker: '# { layer1 #}',
    constructionLiteral: 'fig = nest.PlotLayer(layer, nodesize=50)',
  },
] as const);

const SAVED_SCRIPT_FIGURES = Object.freeze([
  ...[
    'conn1',
    'conn2_a',
    'conn2_b',
    'conn2_c',
    'conn3',
    'conn4',
    'conn5',
    'conn6',
  ].map((family) => ({
    sourcePath: 'doc/htmldoc/networks/scripts/connections.py',
    family,
    literalSaveTarget: `../user_manual_figures/${family}.png`,
  })),
  ...[
    'layer2',
    'layer3',
    'layer3a',
    'layer4',
    'layer4_3d',
    'layer4_3d_b',
    'layer4b',
    'player',
    'vislayer',
  ].map((family) => ({
    sourcePath: 'doc/htmldoc/networks/scripts/layers.py',
    family,
    literalSaveTarget: `../user_manual_figures/${family}.png`,
  })),
] as const);

const EXCLUDED_SCRIPT_CANDIDATES = Object.freeze([
  {
    family: 'conn_3d',
    sourcePath: 'doc/htmldoc/networks/scripts/connections.py',
    sourceMarker: '# { conn_3d_a #}',
    reason:
      'empty_active_top_level_figure_with_branch_render_invocations_and_save_commented',
  },
] as const);

const BUILD_AUTHORITY = Object.freeze([
  {
    path: 'CMakeLists.txt',
    role: 'root_userdoc_option_and_doc_subdirectory_selector',
  },
  {
    path: 'cmake/ProcessOptions.cmake',
    role: 'userdoc_tool_discovery_and_build_state_selector',
  },
  {
    path: 'doc/CMakeLists.txt',
    role: 'sphinx_command_and_pre_post_processor_selector',
  },
  {
    path: 'doc/requirements.txt',
    role: 'recommended_unlocked_requirements_not_lock',
  },
  {
    path: 'doc/htmldoc/conf.py',
    role: 'sphinx_configuration_and_mutable_patch_boundary',
  },
  {
    path: 'doc/htmldoc/clean_source_dirs.py',
    role: 'sphinx_preprocessor',
  },
  {
    path: 'doc/htmldoc/resolve_includes.py',
    role: 'sphinx_postprocessor',
  },
  {
    path: 'doc/htmldoc/_ext/HoverXTooltip.py',
    role: 'configured_local_sphinx_extension',
  },
  {
    path: 'doc/htmldoc/_ext/VersionSyncRole.py',
    role: 'configured_local_sphinx_extension',
  },
  {
    path: 'doc/htmldoc/_ext/add_button_notebook.py',
    role: 'configured_local_sphinx_extension',
  },
  {
    path: 'doc/htmldoc/_ext/extract_api_functions.py',
    role: 'pynest_public_module_selector',
  },
  {
    path: 'doc/htmldoc/_ext/list_examples.py',
    role: 'example_gallery_source_selector',
  },
  {
    path: 'doc/htmldoc/_ext/model_tag_setup.py',
    role: 'model_and_kernel_userdocs_header_selector',
  },
] as const);

export interface NestDocumentationInventoryAuthority {
  readonly project: 'NEST Simulator';
  readonly release: string;
  readonly repository: string;
  readonly commit: string;
  readonly rootTreeGitSha1: string;
  readonly expected: {
    readonly documentationTreeLeafCount: number;
    readonly documentationRstCount: number;
    readonly documentationNotebookCount: number;
    readonly documentationPythonCount: number;
    readonly documentationMediaCount: number;
    readonly documentationSupportCount: number;
    readonly pynestPublicModuleCandidateCount: number;
    readonly userdocsHeaderCandidateCount: number;
    readonly userdocsBlockCount: number;
    readonly notebookPngCount: number;
    readonly notebookPlotPngCount: number;
    readonly notebookFormulaPngCount: number;
    readonly notebookTextLatexDataCount: number;
    readonly notebookTextPlainDataCount: number;
    readonly notebookStreamOutputCount: number;
    readonly userdocsFigureDirectiveCount: number;
    readonly scriptFigureFamilyCount: number;
    readonly scriptActiveSaveCount: number;
    readonly authoredDiagramSourceCount: number;
    readonly authoredDiagramDirectiveCount: number;
    readonly rstAssetReferenceDirectiveCount: number;
    readonly rstMathDirectiveCount: number;
    readonly publicVisualizationModuleCount: number;
    readonly recommendedDependencyRequirementCount: number;
    readonly uniqueBoundBlobCount: number;
  };
}

export const PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY:
  NestDocumentationInventoryAuthority = Object.freeze({
    project: 'NEST Simulator',
    release: 'v3.10',
    repository: 'https://github.com/nest/nest-simulator.git',
    commit: 'acca9704da248750219a027db99fec6cd1f9052a',
    rootTreeGitSha1: '7f6f4f0407c4000cded433b86d658191dd82cd79',
    expected: {
      documentationTreeLeafCount: 473,
      documentationRstCount: 142,
      documentationNotebookCount: 8,
      documentationPythonCount: 13,
      documentationMediaCount: 282,
      documentationSupportCount: 28,
      pynestPublicModuleCandidateCount: 29,
      userdocsHeaderCandidateCount: 278,
      userdocsBlockCount: 146,
      notebookPngCount: 50,
      notebookPlotPngCount: 38,
      notebookFormulaPngCount: 12,
      notebookTextLatexDataCount: 12,
      notebookTextPlainDataCount: 54,
      notebookStreamOutputCount: 19,
      userdocsFigureDirectiveCount: 2,
      scriptFigureFamilyCount: 18,
      scriptActiveSaveCount: 17,
      authoredDiagramSourceCount: 3,
      authoredDiagramDirectiveCount: 4,
      rstAssetReferenceDirectiveCount: 107,
      rstMathDirectiveCount: 53,
      publicVisualizationModuleCount: 4,
      recommendedDependencyRequirementCount: 33,
      uniqueBoundBlobCount: 784,
    },
  } as const);

interface GitLeaf {
  readonly mode: string;
  readonly type: string;
  readonly sha: string;
  readonly path: string;
  readonly pathBytesBase64: string;
}

export interface NestDocumentationSelectedSourceReference {
  readonly path: string;
  readonly gitBlobSha1: string;
}

export type DocumentationLeafClass =
  | 'rst_source'
  | 'notebook_source_with_stored_outputs'
  | 'python_source'
  | 'checked_in_media_source_asset'
  | 'non_media_support_source';

export interface NestDocumentationSourceBlob {
  readonly sourceId: string;
  readonly path: string;
  readonly pathBytesBase64: string;
  readonly gitMode: '100644' | '100755';
  readonly gitBlobSha1: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly scopeMembership: readonly (
    | 'documentation_tree'
    | 'pynest_public_module_scan'
    | 'userdocs_header_scan'
    | 'build_authority'
  )[];
  readonly documentationLeafClass: DocumentationLeafClass | null;
  readonly mediaExtension: 'gif' | 'ico' | 'jpg' | 'pdf' | 'png' | 'svg' | null;
}

export interface NestUserdocsBlock {
  readonly blockId: string;
  readonly sourceId: string;
  readonly path: string;
  readonly tags: readonly string[];
  readonly documentationByteLength: number;
  readonly documentationSha256: string;
  readonly buildSelection: 'first_and_only_begin_userdocs_block_in_header';
}

export interface NestNotebookPngAsset {
  readonly assetId: string;
  readonly sourceId: string;
  readonly path: string;
  readonly cellIndex: number;
  readonly outputIndex: number;
  readonly classification: 'plot_like_stored_output' | 'formula_render_stored_output';
  readonly byteLength: number;
  readonly sha256: string;
  readonly buildExecutionState:
    'stored_bytes_only_configured_never_not_executed';
}

export interface NestDocumentationScriptFigure {
  readonly figureId: string;
  readonly sourceId: string;
  readonly sourcePath: string;
  readonly family: string;
  readonly definitionState: 'active_source_definition_not_executed';
  readonly saveState: 'active_literal_save_call' | 'no_active_save_call';
  readonly literalSaveTarget: string | null;
  readonly saveTargetCwdAuthority: 'unbound_not_assessed' | 'not_applicable';
  readonly saveTargetResolutionState: 'not_assessed' | 'not_applicable';
}

export interface NestAuthoredDiagramDirective {
  readonly directiveId: string;
  readonly sourceId: string;
  readonly sourcePath: string;
  readonly line: number;
  readonly kind: 'graphviz' | 'mermaid' | 'uml';
  readonly target: string | null;
  readonly directiveBlockSha256: string;
  readonly definitionState: 'authored_source_not_built';
}

export interface NestPublicVisualizationModule {
  readonly moduleId: string;
  readonly sourceId: string;
  readonly path: string;
  readonly publicNames: readonly string[];
  readonly availabilityState: 'public_source_definition_not_imported';
}

export interface VerifiedNestDocumentationAcquisitionContext {
  readonly [VERIFIED_ACQUISITION_CONTEXT]: true;
  readonly repository: string;
  readonly temporaryRoot: string;
}

export interface NestDocumentationSourceInventory {
  readonly protocol: 'cortexel-nest-documentation-source-inventory';
  readonly protocolVersion: 1;
  readonly identityAlgorithm: typeof NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY;
  readonly upstream: {
    readonly project: 'NEST Simulator';
    readonly release: string;
    readonly repository: string;
    readonly commit: string;
    readonly rootTreeGitSha1: string;
  };
  readonly acquisition: {
    readonly producerProfile:
      | typeof NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE
      | typeof UNDECLARED_ACQUISITION_PRODUCER_PROFILE;
    readonly repositoryContext:
      | 'caller_supplied_repository_unverified'
      | 'temporary_repository_shape_verified';
    readonly upstreamCodeExecutedByInventoryBuilder: false;
    readonly inventoryReadAuthority:
      | 'not_asserted'
      | 'local_git_object_database_no_configured_remote_or_alternates';
    readonly temporaryRootDiscretionaryAuthority:
      | 'not_assessed'
      | 'current_uid_mode_0700_and_reviewed_non_authorizing_posix_acl_verified';
  };
  readonly linkedExampleSourceInventory: {
    readonly protocol: 'cortexel-nest-example-source-inventory';
    readonly protocolVersion: 2;
    readonly inventoryDigest: string;
    readonly evidenceTransfer: 'none';
  };
  readonly buildBoundary: {
    readonly sphinxGalleryExecution:
      'configured_literal_false_string_not_executed';
    readonly notebookExecution: 'configured_never_not_executed';
    readonly ambientPatchUrl: 'may_download_and_git_apply_before_build';
    readonly dependencySpecification: 'recommended_unlocked_requirements_not_lock';
    readonly dependencyResolutionAuthority: 'not_established';
    readonly networkIsolation: 'not_established';
    readonly buildInputClosure: 'not_established';
    readonly sourceMutationExclusion: 'not_established';
    readonly reproducibleBuildReceipt: 'not_run';
  };
  readonly buildAuthorityFiles: readonly {
    readonly sourceId: string;
    readonly path: string;
    readonly role: string;
  }[];
  readonly sourceBlobs: readonly NestDocumentationSourceBlob[];
  readonly userdocsBlocks: readonly NestUserdocsBlock[];
  readonly notebookPngAssets: readonly NestNotebookPngAsset[];
  readonly notebookStoredOutputCounts: {
    readonly imagePngDataCount: number;
    readonly textLatexDataCount: number;
    readonly textPlainDataCount: number;
    readonly streamOutputCount: number;
  };
  readonly userdocsDirectiveCounts: {
    readonly figureDirectivesExcludedFromRstSourceCount: number;
  };
  readonly documentationScriptFigures: readonly NestDocumentationScriptFigure[];
  readonly excludedScriptCandidates: readonly {
    readonly sourceId: string;
    readonly sourcePath: string;
    readonly family: string;
    readonly reason: string;
    readonly evidenceState: 'source_review_only_not_executed';
  }[];
  readonly authoredDiagramDirectives: readonly NestAuthoredDiagramDirective[];
  readonly publicVisualizationModules: readonly NestPublicVisualizationModule[];
  readonly rstDirectiveCounts: {
    readonly figureOrImageAssetReferences: number;
    readonly mathFormulaDirectives: number;
  };
  readonly evidenceAxes: readonly [
    {
      readonly id: 'documentation_selected_source_inventory';
      readonly state: 'complete';
    },
    { readonly id: 'documentation_build_execution'; readonly state: 'not_run' },
    {
      readonly id: 'execution_bound_visual_output_inventory';
      readonly state: 'not_established';
    },
    { readonly id: 'stable_contract_mapping'; readonly state: 'not_assessed' },
    { readonly id: 'packaged_adapter_implementation'; readonly state: 'not_assessed' },
    { readonly id: 'renderer_parity'; readonly state: 'not_assessed' },
    { readonly id: 'scientific_certification'; readonly state: 'not_run' },
  ];
  readonly summary: {
    readonly documentationTreeLeafCount: number;
    readonly documentationRstCount: number;
    readonly documentationNotebookCount: number;
    readonly documentationPythonCount: number;
    readonly documentationMediaCount: number;
    readonly documentationSupportCount: number;
    readonly pynestPublicModuleCandidateCount: number;
    readonly userdocsHeaderCandidateCount: number;
    readonly userdocsBlockCount: number;
    readonly uniqueBoundBlobCount: number;
    readonly notebookPngCount: number;
    readonly notebookPlotPngCount: number;
    readonly notebookFormulaPngCount: number;
    readonly notebookTextLatexDataCount: number;
    readonly notebookTextPlainDataCount: number;
    readonly notebookStreamOutputCount: number;
    readonly userdocsFigureDirectiveCount: number;
    readonly scriptFigureFamilyCount: number;
    readonly scriptActiveSaveCount: number;
    readonly authoredDiagramSourceCount: number;
    readonly authoredDiagramDirectiveCount: number;
    readonly publicVisualizationModuleCount: number;
    readonly admittedExecutionBoundVisualOutputCount: 0;
    readonly mappedVisualOutputCount: 0;
    readonly executableVisualOutputCount: 0;
    readonly renderedVisualOutputCount: 0;
    readonly certifiedVisualOutputCount: 0;
    readonly coverageClaim: 'none';
  };
  readonly inventoryDigest: string;
}

function fail(message: string): never {
  throw new Error(`NEST documentation source inventory: ${message}`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hash(algorithm: 'sha1' | 'sha256', bytes: Uint8Array): string {
  return createHash(algorithm).update(bytes).digest('hex');
}

function sha256(bytes: Uint8Array): string {
  return `sha256:${hash('sha256', bytes)}`;
}

function identity(domain: string, payload: JsonValue): string {
  return canonicalDigest({ domain, payload });
}

function utf8(bytes: Uint8Array, where: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail(`${where} is not well-formed UTF-8`);
  }
}

function assertCanonicalGitPath(value: string, where: string): void {
  if (
    value.length === 0 ||
    value.includes('\0') ||
    POSIX.isAbsolute(value) ||
    POSIX.normalize(value) !== value ||
    value.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    fail(`${where} is not a canonical repository-relative POSIX path`);
  }
}

function gitEnvironment(): NodeJS.ProcessEnv {
  return controlledGitEnvironment();
}

function gitBuffer(
  repository: string,
  args: readonly string[],
  reviewedGit: ReviewedGitRuntime,
  maxBuffer = MAX_GIT_OUTPUT_BYTES,
): Buffer {
  const result = runReviewedGitCommand(
    reviewedGit,
    repository,
    controlledGitCommandArguments(repository, args),
    {
      environment: gitEnvironment(),
      outputLimitBytes: maxBuffer,
      timeoutMs: 120_000,
    },
  );
  return result.stdout;
}

function gitText(
  repository: string,
  args: readonly string[],
  reviewedGit: ReviewedGitRuntime,
): string {
  return utf8(
    gitBuffer(repository, args, reviewedGit),
    `git ${args[0] ?? '<missing>'} output`,
  );
}

function parseLeafTree(buffer: Buffer): GitLeaf[] {
  const entries: GitLeaf[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    const end = buffer.indexOf(0, offset);
    if (end < 0) fail('git ls-tree output has an unterminated record');
    const record = buffer.subarray(offset, end);
    offset = end + 1;
    const tab = record.indexOf(0x09);
    if (tab < 0) fail('git ls-tree record has no path separator');
    const header = utf8(record.subarray(0, tab), 'git ls-tree header');
    const [mode, type, objectSha1, ...extra] = header.split(' ');
    if (!mode || !type || !objectSha1 || extra.length !== 0 || !SHA1.test(objectSha1)) {
      fail('git ls-tree record has a malformed header');
    }
    const pathBytes = record.subarray(tab + 1);
    const entryPath = utf8(pathBytes, 'git tree path');
    assertCanonicalGitPath(entryPath, 'git tree path');
    entries.push({
      mode,
      type,
      sha: objectSha1,
      path: entryPath,
      pathBytesBase64: pathBytes.toString('base64'),
    });
  }
  return entries.sort((left, right) => compareText(left.path, right.path));
}

function isDirectHeader(entryPath: string, directory: 'models' | 'nestkernel'): boolean {
  return (
    entryPath.startsWith(`${directory}/`) &&
    entryPath.endsWith('.h') &&
    entryPath.slice(directory.length + 1).includes('/') === false
  );
}

const MEDIA_EXTENSIONS = new Set(['gif', 'ico', 'jpg', 'pdf', 'png', 'svg']);

function documentationLeafClass(entryPath: string): {
  readonly leafClass: DocumentationLeafClass;
  readonly mediaExtension: NestDocumentationSourceBlob['mediaExtension'];
} {
  const extension = POSIX.extname(entryPath).slice(1).toLowerCase();
  if (extension === 'rst') return { leafClass: 'rst_source', mediaExtension: null };
  if (extension === 'ipynb') {
    return {
      leafClass: 'notebook_source_with_stored_outputs',
      mediaExtension: null,
    };
  }
  if (extension === 'py') return { leafClass: 'python_source', mediaExtension: null };
  if (MEDIA_EXTENSIONS.has(extension)) {
    return {
      leafClass: 'checked_in_media_source_asset',
      mediaExtension: extension as NestDocumentationSourceBlob['mediaExtension'],
    };
  }
  return { leafClass: 'non_media_support_source', mediaExtension: null };
}

function sourceIdentity(
  commit: string,
  entry: GitLeaf,
  bytes: Uint8Array,
): string {
  return identity('cortexel.nest-documentation.source.v1', {
    commit,
    path: entry.path,
    gitMode: entry.mode,
    gitBlobSha1: entry.sha,
    byteLength: bytes.byteLength,
    sha256: sha256(bytes),
  });
}

function countExact(actual: number, expected: number, where: string): void {
  if (actual !== expected) fail(`${where} drifted: expected ${expected}, received ${actual}`);
}

function assertLiteral(source: string, literal: string, where: string): void {
  if (!source.includes(literal)) fail(`${where} no longer contains ${JSON.stringify(literal)}`);
}

function parseUserdocsBlock(
  blob: NestDocumentationSourceBlob,
  bytes: Uint8Array,
): {
  readonly block: NestUserdocsBlock;
  readonly figureDirectiveCount: number;
} | null {
  const source = utf8(bytes, blob.path);
  const beginCount = [...source.matchAll(/BeginUserDocs:/gu)].length;
  const endCount = [...source.matchAll(/EndUserDocs/gu)].length;
  if (beginCount !== endCount || beginCount > 1) {
    fail(`${blob.path} has ambiguous BeginUserDocs/EndUserDocs marker cardinality`);
  }
  if (beginCount === 0) return null;
  const match = /BeginUserDocs:\s*((?:[\w -]+(?:,\s*)?)+)\n\n([\s\S]*?)(?=EndUserDocs)/u.exec(source);
  if (!match) fail(`${blob.path} does not match the configured model_tag_setup parser`);
  const tags = (match[1] ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length === 0 || new Set(tags).size !== tags.length) {
    fail(`${blob.path} has empty or duplicate UserDocs tags`);
  }
  const documentation = Buffer.from(match[2] ?? '', 'utf8');
  const core = {
    sourceId: blob.sourceId,
    path: blob.path,
    tags,
    documentationByteLength: documentation.byteLength,
    documentationSha256: sha256(documentation),
    buildSelection: 'first_and_only_begin_userdocs_block_in_header' as const,
  };
  return {
    block: {
      blockId: identity('cortexel.nest-documentation.userdocs-block.v1', core),
      ...core,
    },
    figureDirectiveCount:
      [...(match[2] ?? '').matchAll(/^\s*\.\.\s+figure::/gmu)].length,
  };
}

type NotebookRecord = Record<string, unknown>;

function record(value: unknown): NotebookRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as NotebookRecord
    : null;
}

function decodeNotebookPng(value: unknown, where: string): Buffer {
  const encoded = Array.isArray(value)
    ? value.every((entry) => typeof entry === 'string')
      ? value.join('')
      : fail(`${where} image/png array contains a non-string`)
    : typeof value === 'string'
      ? value
      : fail(`${where} image/png is not a string or string array`);
  const compact = encoded.replace(/[\t\n\r ]/gu, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(compact)) {
    fail(`${where} image/png is not canonical base64 data`);
  }
  const bytes = Buffer.from(compact, 'base64');
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    fail(`${where} image/png does not carry a PNG signature`);
  }
  return bytes;
}

interface NotebookStoredOutputCounts {
  readonly imagePngDataCount: number;
  readonly textLatexDataCount: number;
  readonly textPlainDataCount: number;
  readonly streamOutputCount: number;
}

function requireNotebookText(value: unknown, where: string): void {
  if (
    typeof value !== 'string' &&
    (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
  ) {
    fail(`${where} is not a string or string array`);
  }
}

function notebookStoredOutputs(
  blob: NestDocumentationSourceBlob,
  bytes: Uint8Array,
): {
  readonly pngAssets: readonly NestNotebookPngAsset[];
  readonly counts: NotebookStoredOutputCounts;
} {
  const notebook = record(parseJsonSourceStrict(bytes, blob.path));
  if (!notebook || !Array.isArray(notebook.cells)) fail(`${blob.path} is not a notebook object`);
  const assets: NestNotebookPngAsset[] = [];
  let textLatexDataCount = 0;
  let textPlainDataCount = 0;
  let streamOutputCount = 0;
  for (const [cellIndex, cellValue] of notebook.cells.entries()) {
    const cell = record(cellValue);
    if (!cell) fail(`${blob.path} cell ${cellIndex} is not an object`);
    if (cell.outputs === undefined) continue;
    if (!Array.isArray(cell.outputs)) fail(`${blob.path} cell ${cellIndex} outputs is not an array`);
    for (const [outputIndex, outputValue] of cell.outputs.entries()) {
      const output = record(outputValue);
      if (!output) fail(`${blob.path} output ${cellIndex}:${outputIndex} is not an object`);
      const data = record(output.data);
      const where = `${blob.path} output ${cellIndex}:${outputIndex}`;
      if (output.output_type === 'stream') {
        requireNotebookText(output.text, `${where} stream text`);
        streamOutputCount++;
      }
      if (data?.['text/latex'] !== undefined) {
        requireNotebookText(data['text/latex'], `${where} text/latex`);
        textLatexDataCount++;
      }
      if (data?.['text/plain'] !== undefined) {
        requireNotebookText(data['text/plain'], `${where} text/plain`);
        textPlainDataCount++;
      }
      if (!data || data['image/png'] === undefined) continue;
      const png = decodeNotebookPng(
        data['image/png'],
        where,
      );
      const key = `${blob.path}#${cellIndex}:${outputIndex}`;
      const isFormula = (FORMULA_NOTEBOOK_PNG_KEYS as readonly string[]).includes(key);
      const isPlotLike = (PLOT_LIKE_NOTEBOOK_PNG_KEYS as readonly string[]).includes(key);
      if (isFormula === isPlotLike) {
        fail(
          `${key} is ${isFormula ? 'multiply' : 'not'} classified by the closed notebook PNG allowlists`,
        );
      }
      const classification = isFormula
        ? 'formula_render_stored_output' as const
        : 'plot_like_stored_output' as const;
      const core = {
        sourceId: blob.sourceId,
        path: blob.path,
        cellIndex,
        outputIndex,
        classification,
        byteLength: png.byteLength,
        sha256: sha256(png),
        buildExecutionState:
          'stored_bytes_only_configured_never_not_executed' as const,
      };
      assets.push({
        assetId: identity('cortexel.nest-documentation.notebook-png.v1', core),
        ...core,
      });
    }
  }
  return {
    pngAssets: assets,
    counts: {
      imagePngDataCount: assets.length,
      textLatexDataCount,
      textPlainDataCount,
      streamOutputCount,
    },
  };
}

function activeSaveTargets(source: string, sourcePath: string): {
  readonly family: string;
  readonly literalSaveTarget: string;
}[] {
  const rows: { family: string; literalSaveTarget: string }[] = [];
  const save = /^\s*plt\.savefig\(\s*["']([^"']+)["']/gmu;
  for (const match of source.matchAll(save)) {
    const literalSaveTarget = match[1] ?? fail(`${sourcePath} has a malformed save target`);
    const extension = POSIX.extname(literalSaveTarget);
    if (extension !== '.png') fail(`${sourcePath} has a non-PNG active save target`);
    rows.push({
      family: POSIX.basename(literalSaveTarget, extension),
      literalSaveTarget,
    });
  }
  return rows;
}

function scriptFigures(
  sourceByPath: ReadonlyMap<string, NestDocumentationSourceBlob>,
  bytesByPath: ReadonlyMap<string, Uint8Array>,
): {
  readonly figures: NestDocumentationScriptFigure[];
  readonly exclusions: NestDocumentationSourceInventory['excludedScriptCandidates'];
} {
  const figures: NestDocumentationScriptFigure[] = [];
  for (const sourcePath of [
    'doc/htmldoc/networks/scripts/connections.py',
    'doc/htmldoc/networks/scripts/layers.py',
  ]) {
    const sourceBlob = sourceByPath.get(sourcePath) ?? fail(`${sourcePath} source row is absent`);
    const bytes = bytesByPath.get(sourcePath) ?? fail(`${sourcePath} bytes are absent`);
    const source = utf8(bytes, sourcePath);
    for (const save of activeSaveTargets(source, sourcePath)) {
      const core = {
        sourceId: sourceBlob.sourceId,
        sourcePath,
        family: save.family,
        definitionState: 'active_source_definition_not_executed' as const,
        saveState: 'active_literal_save_call' as const,
        literalSaveTarget: save.literalSaveTarget,
        saveTargetCwdAuthority: 'unbound_not_assessed' as const,
        saveTargetResolutionState: 'not_assessed' as const,
      };
      figures.push({
        figureId: identity('cortexel.nest-documentation.script-figure.v1', core),
        ...core,
      });
    }
  }
  for (const expected of UNSAVED_SCRIPT_FIGURES) {
    const sourceBlob = sourceByPath.get(expected.sourcePath) ??
      fail(`${expected.sourcePath} source row is absent`);
    const source = utf8(
      bytesByPath.get(expected.sourcePath) ?? fail(`${expected.sourcePath} bytes are absent`),
      expected.sourcePath,
    );
    assertLiteral(source, expected.sourceMarker, `${expected.family} source`);
    assertLiteral(source, expected.constructionLiteral, `${expected.family} source`);
    const core = {
      sourceId: sourceBlob.sourceId,
      sourcePath: expected.sourcePath,
      family: expected.family,
      definitionState: 'active_source_definition_not_executed' as const,
      saveState: 'no_active_save_call' as const,
      literalSaveTarget: null,
      saveTargetCwdAuthority: 'not_applicable' as const,
      saveTargetResolutionState: 'not_applicable' as const,
    };
    figures.push({
      figureId: identity('cortexel.nest-documentation.script-figure.v1', core),
      ...core,
    });
  }
  figures.sort((left, right) => compareText(left.figureId, right.figureId));

  const observedSavedFigures = figures
    .filter(({ saveState }) => saveState === 'active_literal_save_call')
    .map(({ sourcePath, family, literalSaveTarget }) => ({
      sourcePath,
      family,
      literalSaveTarget,
    }))
    .sort((left, right) =>
      compareText(`${left.sourcePath}\0${left.family}`, `${right.sourcePath}\0${right.family}`));
  const expectedSavedFigures = [...SAVED_SCRIPT_FIGURES]
    .sort((left, right) =>
      compareText(`${left.sourcePath}\0${left.family}`, `${right.sourcePath}\0${right.family}`));
  if (!canonicalMatches(observedSavedFigures, expectedSavedFigures)) {
    fail('active documentation script save definitions drifted from the closed allowlist');
  }

  const exclusions = EXCLUDED_SCRIPT_CANDIDATES.map((expected) => {
    const sourceBlob = sourceByPath.get(expected.sourcePath) ??
      fail(`${expected.sourcePath} source row is absent`);
    const source = utf8(
      bytesByPath.get(expected.sourcePath) ?? fail(`${expected.sourcePath} bytes are absent`),
      expected.sourcePath,
    );
    assertLiteral(source, expected.sourceMarker, `${expected.family} excluded candidate`);
    assertLiteral(
      source,
      "# plt.savefig('../user_manual_figures/conn_3d.png', bbox_inches='tight')",
      `${expected.family} excluded candidate`,
    );
    return {
      sourceId: sourceBlob.sourceId,
      sourcePath: expected.sourcePath,
      family: expected.family,
      reason: expected.reason,
      evidenceState: 'source_review_only_not_executed' as const,
    };
  });
  return { figures, exclusions };
}

function directiveIndent(line: string): number {
  const match = /^\s*/u.exec(line);
  return (match?.[0] ?? '').replace(/\t/gu, '        ').length;
}

function authoredDiagramDirectives(
  rstBlobs: readonly NestDocumentationSourceBlob[],
  bytesByPath: ReadonlyMap<string, Uint8Array>,
): NestAuthoredDiagramDirective[] {
  const directives: NestAuthoredDiagramDirective[] = [];
  for (const blob of rstBlobs) {
    const source = utf8(bytesByPath.get(blob.path) ?? fail(`${blob.path} bytes are absent`), blob.path);
    const lines = source.split('\n');
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index] ?? '';
      const match = /^\s*\.\.\s+(graphviz|mermaid|uml)::\s*(.*)$/u.exec(line);
      if (!match) continue;
      const kind = match[1] as NestAuthoredDiagramDirective['kind'];
      const target = (match[2] ?? '').trim() || null;
      const baseIndent = directiveIndent(line);
      let end = index + 1;
      while (end < lines.length) {
        const candidate = lines[end] ?? '';
        if (candidate.trim().length > 0 && directiveIndent(candidate) <= baseIndent) break;
        end++;
      }
      const directiveBlock = Buffer.from(lines.slice(index, end).join('\n'), 'utf8');
      const core = {
        sourceId: blob.sourceId,
        sourcePath: blob.path,
        line: index + 1,
        kind,
        target,
        directiveBlockSha256: sha256(directiveBlock),
        definitionState: 'authored_source_not_built' as const,
      };
      directives.push({
        directiveId: identity('cortexel.nest-documentation.rst-diagram.v1', core),
        ...core,
      });
    }
  }
  return directives.sort((left, right) => compareText(left.directiveId, right.directiveId));
}

function publicVisualizationModules(
  sourceByPath: ReadonlyMap<string, NestDocumentationSourceBlob>,
  bytesByPath: ReadonlyMap<string, Uint8Array>,
): NestPublicVisualizationModule[] {
  return PUBLIC_VISUALIZATION_MODULES.map((expected) => {
    const blob = sourceByPath.get(expected.path) ?? fail(`${expected.path} source row is absent`);
    const source = utf8(
      bytesByPath.get(expected.path) ?? fail(`${expected.path} bytes are absent`),
      expected.path,
    );
    for (const publicName of expected.publicNames) {
      assertLiteral(source, JSON.stringify(publicName), `${expected.path} public API`);
      assertLiteral(source, `def ${publicName}(`, `${expected.path} public API`);
    }
    const core = {
      sourceId: blob.sourceId,
      path: expected.path,
      publicNames: [...expected.publicNames],
      availabilityState: 'public_source_definition_not_imported' as const,
    };
    return {
      moduleId: identity('cortexel.nest-documentation.visual-module.v1', core),
      ...core,
    };
  }).sort((left, right) => compareText(left.path, right.path));
}

function verifyBuildBoundary(
  bytesByPath: ReadonlyMap<string, Uint8Array>,
  expectedDependencyCount: number,
): void {
  const root = utf8(bytesByPath.get('CMakeLists.txt') ?? fail('root CMake bytes are absent'), 'CMakeLists.txt');
  const processOptions = utf8(
    bytesByPath.get('cmake/ProcessOptions.cmake') ?? fail('ProcessOptions bytes are absent'),
    'cmake/ProcessOptions.cmake',
  );
  const docCmake = utf8(
    bytesByPath.get('doc/CMakeLists.txt') ?? fail('doc CMake bytes are absent'),
    'doc/CMakeLists.txt',
  );
  const conf = utf8(
    bytesByPath.get('doc/htmldoc/conf.py') ?? fail('Sphinx conf bytes are absent'),
    'doc/htmldoc/conf.py',
  );
  assertLiteral(root, 'set( with-userdoc OFF', 'root CMake authority');
  assertLiteral(root, 'add_subdirectory( doc )', 'root CMake authority');
  assertLiteral(processOptions, 'function( NEST_PROCESS_USERDOC )', 'ProcessOptions authority');
  assertLiteral(docCmake, '${SPHINX_EXECUTABLE} -b html . ${_SPHINX_BUILD_DIR}', 'doc CMake authority');
  assertLiteral(conf, '"plot_gallery": "False"', 'Sphinx gallery authority');
  assertLiteral(conf, 'nbsphinx_execute = "never"', 'notebook execution authority');
  assertLiteral(conf, 'patch_url = os.getenv("patch_url")', 'ambient patch authority');
  assertLiteral(conf, 'urlretrieve(patch_url, patch_file)', 'ambient patch authority');
  assertLiteral(conf, `subprocess.check_output(f"git apply '{patch_file}'"`, 'ambient patch authority');
  const requirements = utf8(
    bytesByPath.get('doc/requirements.txt') ?? fail('requirements bytes are absent'),
    'doc/requirements.txt',
  );
  const dependencyCount = requirements.split(/\r?\n/gu)
    .filter((line) => line.trim().length > 0 && !line.trimStart().startsWith('#')).length;
  countExact(dependencyCount, expectedDependencyCount, 'recommended dependency requirement count');
}

function expectedSummary(authority: NestDocumentationInventoryAuthority): NestDocumentationSourceInventory['summary'] {
  return {
    documentationTreeLeafCount: authority.expected.documentationTreeLeafCount,
    documentationRstCount: authority.expected.documentationRstCount,
    documentationNotebookCount: authority.expected.documentationNotebookCount,
    documentationPythonCount: authority.expected.documentationPythonCount,
    documentationMediaCount: authority.expected.documentationMediaCount,
    documentationSupportCount: authority.expected.documentationSupportCount,
    pynestPublicModuleCandidateCount: authority.expected.pynestPublicModuleCandidateCount,
    userdocsHeaderCandidateCount: authority.expected.userdocsHeaderCandidateCount,
    userdocsBlockCount: authority.expected.userdocsBlockCount,
    uniqueBoundBlobCount: authority.expected.uniqueBoundBlobCount,
    notebookPngCount: authority.expected.notebookPngCount,
    notebookPlotPngCount: authority.expected.notebookPlotPngCount,
    notebookFormulaPngCount: authority.expected.notebookFormulaPngCount,
    notebookTextLatexDataCount: authority.expected.notebookTextLatexDataCount,
    notebookTextPlainDataCount: authority.expected.notebookTextPlainDataCount,
    notebookStreamOutputCount: authority.expected.notebookStreamOutputCount,
    userdocsFigureDirectiveCount: authority.expected.userdocsFigureDirectiveCount,
    scriptFigureFamilyCount: authority.expected.scriptFigureFamilyCount,
    scriptActiveSaveCount: authority.expected.scriptActiveSaveCount,
    authoredDiagramSourceCount: authority.expected.authoredDiagramSourceCount,
    authoredDiagramDirectiveCount: authority.expected.authoredDiagramDirectiveCount,
    publicVisualizationModuleCount: authority.expected.publicVisualizationModuleCount,
    admittedExecutionBoundVisualOutputCount: 0,
    mappedVisualOutputCount: 0,
    executableVisualOutputCount: 0,
    renderedVisualOutputCount: 0,
    certifiedVisualOutputCount: 0,
    coverageClaim: 'none',
  };
}

function selectedSourceTree(
  repository: string,
  authority: NestDocumentationInventoryAuthority,
  reviewedGit: ReviewedGitRuntime,
): {
  readonly selectedLeaves: readonly GitLeaf[];
  readonly pynestModules: readonly GitLeaf[];
  readonly userdocsHeaders: readonly GitLeaf[];
  readonly buildAuthorityPaths: ReadonlySet<string>;
} {
  const resolvedCommit = gitText(
    repository,
    ['rev-parse', '--verify', `${authority.commit}^{commit}`],
    reviewedGit,
  ).trim();
  if (resolvedCommit !== authority.commit) fail('pinned commit does not resolve exactly');
  const rootTree = gitText(
    repository,
    ['rev-parse', '--verify', `${authority.commit}^{tree}`],
    reviewedGit,
  ).trim();
  if (rootTree !== authority.rootTreeGitSha1) {
    fail(`root tree drifted: expected ${authority.rootTreeGitSha1}, received ${rootTree}`);
  }

  const leaves = parseLeafTree(gitBuffer(
    repository,
    ['ls-tree', '-r', '-z', authority.commit],
    reviewedGit,
  ));
  const treePathSet = new Set(leaves.map((entry) => entry.path));
  const buildAuthorityPaths = new Set<string>(
    BUILD_AUTHORITY.map(({ path: entryPath }) => entryPath),
  );
  const documentationLeaves = leaves.filter((entry) =>
    entry.path.startsWith('doc/htmldoc/'));
  const pynestModules = leaves.filter((entry) =>
    entry.path.startsWith('pynest/nest/') && entry.path.endsWith('.py'));
  const userdocsHeaders = leaves.filter((entry) =>
    isDirectHeader(entry.path, 'models') || isDirectHeader(entry.path, 'nestkernel'));
  const selectedPaths = new Set([
    ...documentationLeaves.map((entry) => entry.path),
    ...pynestModules.map((entry) => entry.path),
    ...userdocsHeaders.map((entry) => entry.path),
    ...buildAuthorityPaths,
  ]);
  const selectedLeaves = leaves.filter((entry) => selectedPaths.has(entry.path));
  countExact(
    documentationLeaves.length,
    authority.expected.documentationTreeLeafCount,
    'documentation tree leaf count',
  );
  countExact(
    pynestModules.length,
    authority.expected.pynestPublicModuleCandidateCount,
    'PyNEST module candidate count',
  );
  countExact(
    userdocsHeaders.length,
    authority.expected.userdocsHeaderCandidateCount,
    'UserDocs header candidate count',
  );
  countExact(
    selectedLeaves.length,
    authority.expected.uniqueBoundBlobCount,
    'unique bound blob count',
  );
  if (
    selectedLeaves.some((entry) =>
      entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode))
  ) {
    fail('selected source inventory contains a non-regular Git blob');
  }
  for (const buildPath of buildAuthorityPaths) {
    if (!treePathSet.has(buildPath)) {
      fail(`build authority ${buildPath} is absent from the pinned tree`);
    }
  }
  return { selectedLeaves, pynestModules, userdocsHeaders, buildAuthorityPaths };
}

/**
 * Resolve the exact selected blob identities from the already-fetched pinned
 * commit/tree closure. This operation reads tree objects only; callers still
 * have to acquire and independently verify every returned blob before minting
 * an offline acquisition context.
 */
export function nestDocumentationSelectedSourceReferences(
  repositoryPath: string,
  authority: NestDocumentationInventoryAuthority =
    PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): readonly NestDocumentationSelectedSourceReference[] {
  if (!path.isAbsolute(repositoryPath)) fail('repository path must be absolute');
  const repositoryStat = lstatSync(repositoryPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('repository path must be a direct directory');
  }
  const repository = realpathSync(repositoryPath);
  const references = selectedSourceTree(repository, authority, reviewedGit).selectedLeaves.map(
    ({ path: entryPath, sha }) => Object.freeze({
      path: entryPath,
      gitBlobSha1: sha,
    }),
  );
  if (new Set(references.map(({ gitBlobSha1 }) => gitBlobSha1)).size !== references.length) {
    fail('selected source inventory contains duplicate Git blob identities');
  }
  return Object.freeze(references);
}

/**
 * Fetch-phase plumbing for a partial clone. It materializes and independently
 * verifies every blob in the exact selected scopes without a checkout. The
 * caller must remove the remote and mint a fresh offline context afterward.
 */
export function materializeNestDocumentationSelectedSourceBlobs(
  repositoryPath: string,
  offlineReadAuthority: VerifiedOfflineGitReadAuthority,
  authority: NestDocumentationInventoryAuthority =
    PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): { readonly blobCount: number; readonly totalByteLength: number } {
  const authorizedRepository = requireOfflineGitReadAuthority(
    offlineReadAuthority,
    'NEST documentation selected-source materialization precondition',
    reviewedGit,
  );
  if (!path.isAbsolute(repositoryPath)) fail('repository path must be absolute');
  const repositoryStat = lstatSync(repositoryPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('repository path must be a direct directory');
  }
  const repository = realpathSync(repositoryPath);
  if (authorizedRepository !== repository) {
    fail('offline Git read authority does not bind this documentation repository');
  }
  const { selectedLeaves } = selectedSourceTree(repository, authority, reviewedGit);
  const records = readReviewedGitBlobBatch(
    reviewedGit,
    repository,
    controlledGitCommandArguments(repository, ['cat-file', '--batch']),
    { ...gitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
    selectedLeaves.map((entry) => ({
      objectName: entry.sha,
      expectedGitBlobSha1: entry.sha,
    })),
    { outputLimitBytes: 512 * 1024 * 1024, timeoutMs: 600_000 },
  );
  const totalByteLength = records.reduce(
    (total, record) => total + record.byteLength,
    0,
  );
  requireOfflineGitReadAuthority(
    offlineReadAuthority,
    'NEST documentation selected-source materialization postcondition',
    reviewedGit,
  );
  return Object.freeze({ blobCount: selectedLeaves.length, totalByteLength });
}

export function buildNestDocumentationSourceInventory(
  repositoryPath: string,
  authority: NestDocumentationInventoryAuthority =
    PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
  acquisitionContext?: VerifiedNestDocumentationAcquisitionContext,
  acquisitionProducerProfile?:
    typeof NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): NestDocumentationSourceInventory {
  if (!path.isAbsolute(repositoryPath)) fail('repository path must be absolute');
  const repositoryStat = lstatSync(repositoryPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('repository path must be a direct directory');
  }
  const resolvedRepository = realpathSync(repositoryPath);
  let acquisitionSnapshot: OfflineGitObjectDatabaseSnapshot | undefined;
  if (acquisitionContext !== undefined) {
    acquisitionSnapshot = VERIFIED_ACQUISITION_SNAPSHOTS.get(acquisitionContext);
    if (
      !VERIFIED_ACQUISITION_CONTEXTS.has(acquisitionContext) ||
      !Object.isFrozen(acquisitionContext) ||
      acquisitionSnapshot === undefined ||
      acquisitionContext[VERIFIED_ACQUISITION_CONTEXT] !== true ||
      acquisitionContext.repository !== repositoryPath ||
      acquisitionContext.repository !== resolvedRepository ||
      acquisitionSnapshot.repository !== acquisitionContext.repository ||
      acquisitionSnapshot.temporaryRoot !== acquisitionContext.temporaryRoot
    ) {
      fail('verified acquisition context does not authorize this exact repository');
    }
    const currentSnapshot = verifyOfflineGitObjectDatabase(
      acquisitionContext.repository,
      acquisitionContext.temporaryRoot,
      'NEST documentation selected-source inventory acquisition',
      reviewedGit,
    );
    if (
      !sameOfflineGitObjectDatabase(acquisitionSnapshot, currentSnapshot) ||
      acquisitionSnapshot.inspectedObjectDatabaseEntryCount !==
        currentSnapshot.inspectedObjectDatabaseEntryCount
    ) {
      fail('verified acquisition repository identity changed before inventory reads');
    }
  }
  const verifiedAcquisition = acquisitionSnapshot !== undefined;
  if (
    acquisitionProducerProfile !== undefined &&
    (acquisitionProducerProfile !==
      NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE ||
      !verifiedAcquisition)
  ) {
    fail(
      'acquisition producer profile is unsupported or lacks verified repository authority',
    );
  }

  const {
    selectedLeaves,
    pynestModules,
    userdocsHeaders,
    buildAuthorityPaths,
  } = selectedSourceTree(resolvedRepository, authority, reviewedGit);

  const bytesByPath = new Map<string, Uint8Array>();
  const batchRecords = readReviewedGitBlobBatch(
    reviewedGit,
    resolvedRepository,
    controlledGitCommandArguments(resolvedRepository, ['cat-file', '--batch']),
    { ...gitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
    selectedLeaves.map((entry) => ({
      objectName: entry.sha,
      expectedGitBlobSha1: entry.sha,
    })),
    { outputLimitBytes: 512 * 1024 * 1024, timeoutMs: 600_000 },
  );
  const sourceBlobs = selectedLeaves.map((entry, index): NestDocumentationSourceBlob => {
    const record = batchRecords[index] ?? fail(`${entry.path} batch record is absent`);
    const bytes = record.copyBytes();
    bytesByPath.set(entry.path, bytes);
    const inDocumentation = entry.path.startsWith('doc/htmldoc/');
    const scopeMembership: NestDocumentationSourceBlob['scopeMembership'][number][] = [];
    if (inDocumentation) scopeMembership.push('documentation_tree');
    if (pynestModules.some((candidate) => candidate.path === entry.path)) {
      scopeMembership.push('pynest_public_module_scan');
    }
    if (userdocsHeaders.some((candidate) => candidate.path === entry.path)) {
      scopeMembership.push('userdocs_header_scan');
    }
    if (buildAuthorityPaths.has(entry.path)) scopeMembership.push('build_authority');
    const classification = inDocumentation
      ? documentationLeafClass(entry.path)
      : { leafClass: null, mediaExtension: null };
    return {
      sourceId: sourceIdentity(authority.commit, entry, bytes),
      path: entry.path,
      pathBytesBase64: entry.pathBytesBase64,
      gitMode: entry.mode as NestDocumentationSourceBlob['gitMode'],
      gitBlobSha1: entry.sha,
      byteLength: bytes.byteLength,
      sha256: sha256(bytes),
      scopeMembership,
      documentationLeafClass: classification.leafClass,
      mediaExtension: classification.mediaExtension,
    };
  });
  const sourceByPath = new Map(sourceBlobs.map((source) => [source.path, source]));

  const documentationRows = sourceBlobs.filter((source) =>
    source.scopeMembership.includes('documentation_tree'));
  const rowsOfClass = (leafClass: DocumentationLeafClass): NestDocumentationSourceBlob[] =>
    documentationRows.filter((source) => source.documentationLeafClass === leafClass);
  const rstBlobs = rowsOfClass('rst_source');
  const notebookBlobs = rowsOfClass('notebook_source_with_stored_outputs');
  countExact(rstBlobs.length, authority.expected.documentationRstCount, 'RST source count');
  countExact(notebookBlobs.length, authority.expected.documentationNotebookCount, 'notebook source count');
  countExact(rowsOfClass('python_source').length, authority.expected.documentationPythonCount, 'documentation Python count');
  countExact(rowsOfClass('checked_in_media_source_asset').length, authority.expected.documentationMediaCount, 'documentation media count');
  countExact(rowsOfClass('non_media_support_source').length, authority.expected.documentationSupportCount, 'documentation support count');

  verifyBuildBoundary(bytesByPath, authority.expected.recommendedDependencyRequirementCount);

  const parsedUserdocsBlocks = userdocsHeaders.flatMap((entry) => {
    const blob = sourceByPath.get(entry.path) ?? fail(`${entry.path} source row is absent`);
    const parsed = parseUserdocsBlock(
      blob,
      bytesByPath.get(entry.path) ?? fail(`${entry.path} bytes are absent`),
    );
    return parsed ? [parsed] : [];
  });
  const userdocsBlocks = parsedUserdocsBlocks
    .map(({ block }) => block)
    .sort((left, right) => compareText(left.path, right.path));
  const userdocsFigureDirectiveCount = parsedUserdocsBlocks.reduce(
    (sum, { figureDirectiveCount }) => sum + figureDirectiveCount,
    0,
  );
  countExact(userdocsBlocks.length, authority.expected.userdocsBlockCount, 'UserDocs block count');
  countExact(
    userdocsFigureDirectiveCount,
    authority.expected.userdocsFigureDirectiveCount,
    'UserDocs figure-directive count',
  );

  const notebookOutputs = notebookBlobs.map((blob) => notebookStoredOutputs(
    blob,
    bytesByPath.get(blob.path) ?? fail(`${blob.path} bytes are absent`),
  ));
  const pngAssets = notebookOutputs
    .flatMap(({ pngAssets: assets }) => assets)
    .sort((left, right) => compareText(left.assetId, right.assetId));
  const notebookStoredOutputCounts = notebookOutputs.reduce(
    (counts, output) => ({
      imagePngDataCount:
        counts.imagePngDataCount + output.counts.imagePngDataCount,
      textLatexDataCount:
        counts.textLatexDataCount + output.counts.textLatexDataCount,
      textPlainDataCount:
        counts.textPlainDataCount + output.counts.textPlainDataCount,
      streamOutputCount:
        counts.streamOutputCount + output.counts.streamOutputCount,
    }),
    {
      imagePngDataCount: 0,
      textLatexDataCount: 0,
      textPlainDataCount: 0,
      streamOutputCount: 0,
    },
  );
  countExact(pngAssets.length, authority.expected.notebookPngCount, 'stored notebook PNG count');
  countExact(
    pngAssets.filter(({ classification }) => classification === 'plot_like_stored_output').length,
    authority.expected.notebookPlotPngCount,
    'stored plot-like notebook PNG count',
  );
  countExact(
    pngAssets.filter(({ classification }) => classification === 'formula_render_stored_output').length,
    authority.expected.notebookFormulaPngCount,
    'stored formula notebook PNG count',
  );
  countExact(
    notebookStoredOutputCounts.textLatexDataCount,
    authority.expected.notebookTextLatexDataCount,
    'stored notebook text/latex data count',
  );
  countExact(
    notebookStoredOutputCounts.textPlainDataCount,
    authority.expected.notebookTextPlainDataCount,
    'stored notebook text/plain data count',
  );
  countExact(
    notebookStoredOutputCounts.streamOutputCount,
    authority.expected.notebookStreamOutputCount,
    'stored notebook stream-output count',
  );
  const observedFormulaKeys = pngAssets
    .filter(({ classification }) => classification === 'formula_render_stored_output')
    .map(({ path: sourcePath, cellIndex, outputIndex }) => `${sourcePath}#${cellIndex}:${outputIndex}`)
    .sort(compareText);
  const expectedFormulaKeys = [...FORMULA_NOTEBOOK_PNG_KEYS].sort(compareText);
  if (canonicalize(observedFormulaKeys) !== canonicalize(expectedFormulaKeys)) {
    fail('stored formula notebook PNG identities drifted');
  }
  const observedPlotLikeKeys = pngAssets
    .filter(({ classification }) => classification === 'plot_like_stored_output')
    .map(({ path: sourcePath, cellIndex, outputIndex }) =>
      `${sourcePath}#${cellIndex}:${outputIndex}`)
    .sort(compareText);
  const expectedPlotLikeKeys = [...PLOT_LIKE_NOTEBOOK_PNG_KEYS].sort(compareText);
  if (canonicalize(observedPlotLikeKeys) !== canonicalize(expectedPlotLikeKeys)) {
    fail('stored plot-like notebook PNG identities drifted');
  }

  const scripts = scriptFigures(sourceByPath, bytesByPath);
  countExact(scripts.figures.length, authority.expected.scriptFigureFamilyCount, 'documentation script figure-family count');
  countExact(
    scripts.figures.filter(({ saveState }) => saveState === 'active_literal_save_call').length,
    authority.expected.scriptActiveSaveCount,
    'documentation script active-save count',
  );

  const diagrams = authoredDiagramDirectives(rstBlobs, bytesByPath);
  countExact(diagrams.length, authority.expected.authoredDiagramDirectiveCount, 'authored diagram directive count');
  countExact(new Set(diagrams.map(({ sourcePath }) => sourcePath)).size, authority.expected.authoredDiagramSourceCount, 'authored diagram source count');

  const rstText = rstBlobs.map((blob) =>
    utf8(bytesByPath.get(blob.path) ?? fail(`${blob.path} bytes are absent`), blob.path));
  const rstAssetReferenceDirectiveCount = rstText.reduce(
    (sum, source) => sum + [...source.matchAll(/^\s*\.\.\s+(?:figure|image)::/gmu)].length,
    0,
  );
  const rstMathDirectiveCount = rstText.reduce(
    (sum, source) => sum + [...source.matchAll(/^\s*\.\.\s+math::/gmu)].length,
    0,
  );
  countExact(rstAssetReferenceDirectiveCount, authority.expected.rstAssetReferenceDirectiveCount, 'RST figure/image reference count');
  countExact(rstMathDirectiveCount, authority.expected.rstMathDirectiveCount, 'RST math directive count');

  const visualModules = publicVisualizationModules(sourceByPath, bytesByPath);
  countExact(visualModules.length, authority.expected.publicVisualizationModuleCount, 'public visualization module count');

  const buildAuthorityFiles = BUILD_AUTHORITY.map(({ path: sourcePath, role }) => ({
    sourceId: sourceByPath.get(sourcePath)?.sourceId ?? fail(`${sourcePath} source row is absent`),
    path: sourcePath,
    role,
  }));

  const core = {
    protocol: 'cortexel-nest-documentation-source-inventory' as const,
    protocolVersion: 1 as const,
    identityAlgorithm: NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY,
    upstream: {
      project: authority.project,
      release: authority.release,
      repository: authority.repository,
      commit: authority.commit,
      rootTreeGitSha1: authority.rootTreeGitSha1,
    },
    acquisition: {
      producerProfile: acquisitionProducerProfile ??
        UNDECLARED_ACQUISITION_PRODUCER_PROFILE,
      repositoryContext: verifiedAcquisition
        ? 'temporary_repository_shape_verified' as const
        : 'caller_supplied_repository_unverified' as const,
      upstreamCodeExecutedByInventoryBuilder: false as const,
      inventoryReadAuthority: verifiedAcquisition
        ? 'local_git_object_database_no_configured_remote_or_alternates' as const
        : 'not_asserted' as const,
      temporaryRootDiscretionaryAuthority: verifiedAcquisition
        ? 'current_uid_mode_0700_and_reviewed_non_authorizing_posix_acl_verified' as const
        : 'not_assessed' as const,
    },
    linkedExampleSourceInventory: {
      protocol: 'cortexel-nest-example-source-inventory' as const,
      protocolVersion: 2 as const,
      inventoryDigest: PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
      evidenceTransfer: 'none' as const,
    },
    buildBoundary: {
      sphinxGalleryExecution:
        'configured_literal_false_string_not_executed' as const,
      notebookExecution: 'configured_never_not_executed' as const,
      ambientPatchUrl: 'may_download_and_git_apply_before_build' as const,
      dependencySpecification: 'recommended_unlocked_requirements_not_lock' as const,
      dependencyResolutionAuthority: 'not_established' as const,
      networkIsolation: 'not_established' as const,
      buildInputClosure: 'not_established' as const,
      sourceMutationExclusion: 'not_established' as const,
      reproducibleBuildReceipt: 'not_run' as const,
    },
    buildAuthorityFiles,
    sourceBlobs,
    userdocsBlocks,
    notebookPngAssets: pngAssets,
    notebookStoredOutputCounts,
    userdocsDirectiveCounts: {
      figureDirectivesExcludedFromRstSourceCount:
        userdocsFigureDirectiveCount,
    },
    documentationScriptFigures: scripts.figures,
    excludedScriptCandidates: scripts.exclusions,
    authoredDiagramDirectives: diagrams,
    publicVisualizationModules: visualModules,
    rstDirectiveCounts: {
      figureOrImageAssetReferences: rstAssetReferenceDirectiveCount,
      mathFormulaDirectives: rstMathDirectiveCount,
    },
    evidenceAxes: [
      { id: 'documentation_selected_source_inventory', state: 'complete' },
      { id: 'documentation_build_execution', state: 'not_run' },
      { id: 'execution_bound_visual_output_inventory', state: 'not_established' },
      { id: 'stable_contract_mapping', state: 'not_assessed' },
      { id: 'packaged_adapter_implementation', state: 'not_assessed' },
      { id: 'renderer_parity', state: 'not_assessed' },
      { id: 'scientific_certification', state: 'not_run' },
    ] as const,
    summary: expectedSummary(authority),
  };
  const inventory = {
    ...core,
    inventoryDigest: canonicalDigest({
      domain: NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY,
      inventory: core,
    }),
  };
  if (acquisitionSnapshot !== undefined && acquisitionContext !== undefined) {
    const currentSnapshot = verifyOfflineGitObjectDatabase(
      acquisitionContext.repository,
      acquisitionContext.temporaryRoot,
      'NEST documentation selected-source inventory acquisition',
      reviewedGit,
    );
    if (
      !sameOfflineGitObjectDatabase(acquisitionSnapshot, currentSnapshot) ||
      acquisitionSnapshot.inspectedObjectDatabaseEntryCount !==
        currentSnapshot.inspectedObjectDatabaseEntryCount
    ) {
      fail('verified acquisition repository identity changed during inventory reads');
    }
  }
  return inventory;
}

export function canonicalNestDocumentationSourceInventory(
  inventory: NestDocumentationSourceInventory,
): string {
  return canonicalize(inventory);
}

export function verifyNestDocumentationOfflineAcquisitionContext(
  repositoryPath: string,
  temporaryRootPath: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): VerifiedNestDocumentationAcquisitionContext {
  const snapshot = verifyOfflineGitObjectDatabase(
    repositoryPath,
    temporaryRootPath,
    'NEST documentation selected-source inventory acquisition',
    reviewedGit,
  );
  const context = Object.freeze({
    [VERIFIED_ACQUISITION_CONTEXT]: true,
    repository: snapshot.repository,
    temporaryRoot: snapshot.temporaryRoot,
  } as const);
  VERIFIED_ACQUISITION_CONTEXTS.add(context);
  VERIFIED_ACQUISITION_SNAPSHOTS.set(context, snapshot);
  return context;
}

type UnknownRecord = Record<string, unknown>;

function unknownRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function records(
  value: unknown,
  label: string,
  problems: string[],
): UnknownRecord[] {
  if (!Array.isArray(value)) {
    problems.push(`${label} must be an array`);
    return [];
  }
  const rows: UnknownRecord[] = [];
  for (const [index, entry] of value.entries()) {
    const row = unknownRecord(entry);
    if (row === null) {
      problems.push(`${label}[${index}] must be a plain object row`);
    } else {
      rows.push(row);
    }
  }
  return rows;
}

function exactDataKeys(
  record: UnknownRecord,
  expectedKeys: readonly string[],
  label: string,
  problems: string[],
): boolean {
  let keys: readonly (string | symbol)[];
  try {
    keys = Reflect.ownKeys(record);
  } catch {
    problems.push(`${label} members cannot be inspected safely`);
    return false;
  }
  const actualStrings: string[] = [];
  for (const key of keys) {
    if (typeof key !== 'string') {
      problems.push(`${label} must not contain symbol members`);
      return false;
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(record, key);
    } catch {
      problems.push(`${label}.${key} cannot be inspected safely`);
      return false;
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      problems.push(`${label}.${key} must be an enumerable data property`);
      return false;
    }
    actualStrings.push(key);
  }
  const actual = actualStrings.sort();
  const expected = [...expectedKeys].sort();
  if (!canonicalMatches(actual, expected)) {
    problems.push(`${label} does not have its exact closed member set`);
    return false;
  }
  return true;
}

function canonicalMatches(left: unknown, right: unknown): boolean {
  try {
    return canonicalize(left as JsonValue) === canonicalize(right as JsonValue);
  } catch {
    return false;
  }
}

function validationIdentity(domain: string, payload: unknown): string | null {
  try {
    return identity(domain, payload as JsonValue);
  } catch {
    return null;
  }
}

function sortedUniqueBy(
  rows: readonly UnknownRecord[],
  field: string,
  label: string,
  problems: string[],
): void {
  let previous: string | null = null;
  for (const [index, row] of rows.entries()) {
    const value = row[field];
    if (typeof value !== 'string') {
      problems.push(`${label}[${index}].${field} is not a string`);
      continue;
    }
    if (previous !== null && previous >= value) {
      problems.push(`${label} must be strictly sorted and unique by ${field}`);
      return;
    }
    previous = value;
  }
}

function selectedSourceProjection(sourcePath: string): {
  readonly scopeMembership: NestDocumentationSourceBlob['scopeMembership'];
  readonly documentationLeafClass: DocumentationLeafClass | null;
  readonly mediaExtension: NestDocumentationSourceBlob['mediaExtension'];
} {
  const scopeMembership: NestDocumentationSourceBlob['scopeMembership'][number][] = [];
  const inDocumentationTree = sourcePath.startsWith('doc/htmldoc/');
  if (inDocumentationTree) scopeMembership.push('documentation_tree');
  if (sourcePath.startsWith('pynest/nest/') && sourcePath.endsWith('.py')) {
    scopeMembership.push('pynest_public_module_scan');
  }
  if (isDirectHeader(sourcePath, 'models') || isDirectHeader(sourcePath, 'nestkernel')) {
    scopeMembership.push('userdocs_header_scan');
  }
  if (BUILD_AUTHORITY.some(({ path: authorityPath }) => authorityPath === sourcePath)) {
    scopeMembership.push('build_authority');
  }
  const classification = inDocumentationTree
    ? documentationLeafClass(sourcePath)
    : { leafClass: null, mediaExtension: null };
  return {
    scopeMembership,
    documentationLeafClass: classification.leafClass,
    mediaExtension: classification.mediaExtension,
  };
}

function notebookAssetKey(asset: UnknownRecord): string | null {
  return typeof asset.path === 'string' &&
    Number.isSafeInteger(asset.cellIndex) && Number(asset.cellIndex) >= 0 &&
    Number.isSafeInteger(asset.outputIndex) && Number(asset.outputIndex) >= 0
    ? `${asset.path}#${String(asset.cellIndex)}:${String(asset.outputIndex)}`
    : null;
}

function sourceHasScope(source: UnknownRecord | undefined, scope: string): boolean {
  return Array.isArray(source?.scopeMembership) &&
    source.scopeMembership.includes(scope);
}

/**
 * Pure verification of the checked-in pinned artifact. Passing this validator
 * closes only the explicitly selected source scopes named by the protocol. It
 * does not close a Sphinx/CMake build-input or visualization denominator.
 */
export function validateNestDocumentationSourceInventory(value: unknown): readonly string[] {
  const problems: string[] = [];
  const inventory = unknownRecord(value);
  if (!inventory) return ['documentation source inventory root must be an object'];
  if (!exactDataKeys(inventory, [
    'protocol',
    'protocolVersion',
    'identityAlgorithm',
    'upstream',
    'acquisition',
    'linkedExampleSourceInventory',
    'buildBoundary',
    'buildAuthorityFiles',
    'sourceBlobs',
    'userdocsBlocks',
    'notebookPngAssets',
    'notebookStoredOutputCounts',
    'userdocsDirectiveCounts',
    'documentationScriptFigures',
    'excludedScriptCandidates',
    'authoredDiagramDirectives',
    'publicVisualizationModules',
    'rstDirectiveCounts',
    'evidenceAxes',
    'summary',
    'inventoryDigest',
  ], 'documentation source inventory root', problems)) {
    return problems;
  }
  const { inventoryDigest, ...core } = inventory;
  let recomputedDigest: string | null = null;
  try {
    recomputedDigest = canonicalDigest({
      domain: NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY,
      inventory: core as JsonValue,
    });
  } catch {
    problems.push('documentation source inventory is not RFC 8785 canonicalizable JSON');
  }
  if (inventoryDigest !== recomputedDigest) {
    problems.push('documentation source inventory digest does not bind its complete semantic projection');
  }
  if (inventoryDigest !== PINNED_NEST_DOCUMENTATION_SOURCE_INVENTORY_DIGEST) {
    problems.push('documentation source inventory digest does not equal the reviewed pinned NEST v3.10 inventory');
  }
  if (
    inventory.protocol !== 'cortexel-nest-documentation-source-inventory' ||
    inventory.protocolVersion !== 1 ||
    inventory.identityAlgorithm !== NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY
  ) {
    problems.push('documentation source inventory protocol identity is not the closed V1 identity');
  }
  if (!canonicalMatches(inventory.upstream, {
    project: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.project,
    release: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.release,
    repository: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.repository,
    commit: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit,
    rootTreeGitSha1: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.rootTreeGitSha1,
  })) {
    problems.push('documentation source inventory upstream authority does not equal the closed pin');
  }
  if (!canonicalMatches(inventory.acquisition, {
    producerProfile: NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
    repositoryContext: 'temporary_repository_shape_verified',
    upstreamCodeExecutedByInventoryBuilder: false,
    inventoryReadAuthority: 'local_git_object_database_no_configured_remote_or_alternates',
    temporaryRootDiscretionaryAuthority:
      'current_uid_mode_0700_and_reviewed_non_authorizing_posix_acl_verified',
  })) {
    problems.push(
      'documentation source inventory lacks the closed acquisition producer profile or verified offline acquisition shape',
    );
  }
  if (!canonicalMatches(inventory.linkedExampleSourceInventory, {
    protocol: 'cortexel-nest-example-source-inventory',
    protocolVersion: 2,
    inventoryDigest: PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
    evidenceTransfer: 'none',
  })) {
    problems.push('documentation source inventory example-artifact link drifted or transfers evidence');
  }
  if (!canonicalMatches(inventory.buildBoundary, {
    sphinxGalleryExecution: 'configured_literal_false_string_not_executed',
    notebookExecution: 'configured_never_not_executed',
    ambientPatchUrl: 'may_download_and_git_apply_before_build',
    dependencySpecification: 'recommended_unlocked_requirements_not_lock',
    dependencyResolutionAuthority: 'not_established',
    networkIsolation: 'not_established',
    buildInputClosure: 'not_established',
    sourceMutationExclusion: 'not_established',
    reproducibleBuildReceipt: 'not_run',
  })) {
    problems.push('documentation source inventory build boundary drifted or overclaims authority');
  }

  const sources = records(inventory.sourceBlobs, 'sourceBlobs', problems);
  sortedUniqueBy(sources, 'path', 'sourceBlobs', problems);
  const sourceById = new Map<string, UnknownRecord>();
  const sourceByPath = new Map<string, UnknownRecord>();
  const sourceCounts = {
    documentationTreeLeafCount: 0,
    documentationRstCount: 0,
    documentationNotebookCount: 0,
    documentationPythonCount: 0,
    documentationMediaCount: 0,
    documentationSupportCount: 0,
    pynestPublicModuleCandidateCount: 0,
    userdocsHeaderCandidateCount: 0,
  };
  for (const source of sources) {
    if (!exactDataKeys(source, [
      'sourceId',
      'path',
      'pathBytesBase64',
      'gitMode',
      'gitBlobSha1',
      'byteLength',
      'sha256',
      'scopeMembership',
      'documentationLeafClass',
      'mediaExtension',
    ], 'sourceBlobs row', problems)) continue;
    const sourcePath = source.path;
    const sourceIdValue = source.sourceId;
    if (typeof sourcePath !== 'string' || typeof sourceIdValue !== 'string') continue;
    if (sourceById.has(sourceIdValue) || sourceByPath.has(sourcePath)) {
      problems.push('documentation source inventory contains a duplicate source identity or path');
      continue;
    }
    sourceById.set(sourceIdValue, source);
    sourceByPath.set(sourcePath, source);
    try {
      assertCanonicalGitPath(sourcePath, 'validated source path');
    } catch {
      problems.push(`source ${JSON.stringify(sourcePath)} has a non-canonical path`);
    }
    const projection = selectedSourceProjection(sourcePath);
    if (projection.scopeMembership.length === 0) {
      problems.push(`source ${JSON.stringify(sourcePath)} is outside every closed selected scope`);
    }
    if (
      !canonicalMatches(source.scopeMembership, projection.scopeMembership) ||
      source.documentationLeafClass !== projection.documentationLeafClass ||
      source.mediaExtension !== projection.mediaExtension
    ) {
      problems.push(`source ${JSON.stringify(sourcePath)} has a mismatched scope or class projection`);
    }
    if (projection.scopeMembership.includes('documentation_tree')) {
      sourceCounts.documentationTreeLeafCount++;
      if (projection.documentationLeafClass === 'rst_source') {
        sourceCounts.documentationRstCount++;
      } else if (
        projection.documentationLeafClass === 'notebook_source_with_stored_outputs'
      ) {
        sourceCounts.documentationNotebookCount++;
      } else if (projection.documentationLeafClass === 'python_source') {
        sourceCounts.documentationPythonCount++;
      } else if (projection.documentationLeafClass === 'checked_in_media_source_asset') {
        sourceCounts.documentationMediaCount++;
      } else if (projection.documentationLeafClass === 'non_media_support_source') {
        sourceCounts.documentationSupportCount++;
      }
    }
    if (projection.scopeMembership.includes('pynest_public_module_scan')) {
      sourceCounts.pynestPublicModuleCandidateCount++;
    }
    if (projection.scopeMembership.includes('userdocs_header_scan')) {
      sourceCounts.userdocsHeaderCandidateCount++;
    }
    if (
      source.pathBytesBase64 !== Buffer.from(sourcePath, 'utf8').toString('base64') ||
      (source.gitMode !== '100644' && source.gitMode !== '100755') ||
      !SHA1.test(String(source.gitBlobSha1)) ||
      !SHA256.test(String(source.sha256)) ||
      !Number.isSafeInteger(source.byteLength) || Number(source.byteLength) < 0
    ) {
      problems.push(`source ${JSON.stringify(sourcePath)} has malformed byte authority`);
    }
    const expectedId = validationIdentity('cortexel.nest-documentation.source.v1', {
      commit: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit,
      path: sourcePath,
      gitMode: source.gitMode as JsonValue,
      gitBlobSha1: source.gitBlobSha1 as JsonValue,
      byteLength: source.byteLength as JsonValue,
      sha256: source.sha256 as JsonValue,
    });
    if (sourceIdValue !== expectedId) {
      problems.push(`source ${JSON.stringify(sourcePath)} has a mismatched identity`);
    }
  }
  if (
    !Array.isArray(inventory.sourceBlobs) ||
    inventory.sourceBlobs.length !==
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected.uniqueBoundBlobCount
  ) {
    problems.push('documentation source row cardinality does not equal the closed selected-source pin');
  }
  const expected = PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected;
  for (const [field, actual] of Object.entries(sourceCounts)) {
    if (actual !== expected[field as keyof typeof sourceCounts]) {
      problems.push(`documentation selected-source ${field} does not equal the closed pin`);
    }
  }

  const buildFiles = records(
    inventory.buildAuthorityFiles,
    'buildAuthorityFiles',
    problems,
  );
  for (const buildFile of buildFiles) {
    exactDataKeys(
      buildFile,
      ['sourceId', 'path', 'role'],
      'buildAuthorityFiles row',
      problems,
    );
  }
  if (
    buildFiles.length !== BUILD_AUTHORITY.length ||
    buildFiles.some((entry, index) =>
      entry.path !== BUILD_AUTHORITY[index]?.path ||
      entry.role !== BUILD_AUTHORITY[index]?.role ||
      sourceById.get(String(entry.sourceId))?.path !== entry.path ||
      !sourceHasScope(sourceById.get(String(entry.sourceId)), 'build_authority'))
  ) {
    problems.push('documentation build-authority file projection drifted');
  }

  const userdocs = records(inventory.userdocsBlocks, 'userdocsBlocks', problems);
  sortedUniqueBy(userdocs, 'path', 'userdocsBlocks', problems);
  for (const block of userdocs) {
    if (!exactDataKeys(block, [
      'blockId',
      'sourceId',
      'path',
      'tags',
      'documentationByteLength',
      'documentationSha256',
      'buildSelection',
    ], 'userdocsBlocks row', problems)) continue;
    const { blockId, ...payload } = block;
    const tags = Array.isArray(block.tags) ? block.tags : [];
    const boundSource = sourceById.get(String(block.sourceId));
    if (
      blockId !== validationIdentity('cortexel.nest-documentation.userdocs-block.v1', payload) ||
      boundSource?.path !== block.path ||
      !sourceHasScope(boundSource, 'userdocs_header_scan')
    ) {
      problems.push(`UserDocs block ${JSON.stringify(block.path)} has a mismatched identity`);
    }
    if (
      block.buildSelection !== 'first_and_only_begin_userdocs_block_in_header' ||
      !Number.isSafeInteger(block.documentationByteLength) ||
      Number(block.documentationByteLength) < 0 ||
      !SHA256.test(String(block.documentationSha256)) ||
      tags.length === 0 ||
      tags.some((tag) => typeof tag !== 'string' || tag.length === 0) ||
      new Set(tags).size !== tags.length
    ) {
      problems.push(`UserDocs block ${JSON.stringify(block.path)} has malformed semantics`);
    }
  }

  const notebookAssets = records(
    inventory.notebookPngAssets,
    'notebookPngAssets',
    problems,
  );
  sortedUniqueBy(notebookAssets, 'assetId', 'notebookPngAssets', problems);
  const notebookKeys = new Set<string>();
  let notebookPlotPngCount = 0;
  let notebookFormulaPngCount = 0;
  for (const asset of notebookAssets) {
    if (!exactDataKeys(asset, [
      'assetId',
      'sourceId',
      'path',
      'cellIndex',
      'outputIndex',
      'classification',
      'byteLength',
      'sha256',
      'buildExecutionState',
    ], 'notebookPngAssets row', problems)) continue;
    const { assetId, ...payload } = asset;
    const key = notebookAssetKey(asset);
    const isFormula = key !== null &&
      (FORMULA_NOTEBOOK_PNG_KEYS as readonly string[]).includes(key);
    const isPlotLike = key !== null &&
      (PLOT_LIKE_NOTEBOOK_PNG_KEYS as readonly string[]).includes(key);
    const boundSource = sourceById.get(String(asset.sourceId));
    if (
      assetId !== validationIdentity('cortexel.nest-documentation.notebook-png.v1', payload) ||
      boundSource?.path !== asset.path ||
      boundSource?.documentationLeafClass !== 'notebook_source_with_stored_outputs'
    ) {
      problems.push(`notebook PNG ${JSON.stringify(assetId)} has a mismatched identity`);
    }
    if (
      key === null ||
      notebookKeys.has(key) ||
      isFormula === isPlotLike ||
      asset.classification !== (isFormula
        ? 'formula_render_stored_output'
        : 'plot_like_stored_output') ||
      asset.buildExecutionState !==
        'stored_bytes_only_configured_never_not_executed' ||
      !Number.isSafeInteger(asset.byteLength) || Number(asset.byteLength) <= 0 ||
      !SHA256.test(String(asset.sha256))
    ) {
      problems.push(`notebook PNG ${JSON.stringify(key ?? assetId)} violates its closed classification`);
    }
    if (key !== null) notebookKeys.add(key);
    if (asset.classification === 'plot_like_stored_output') notebookPlotPngCount++;
    if (asset.classification === 'formula_render_stored_output') {
      notebookFormulaPngCount++;
    }
  }
  const expectedNotebookKeys = [...FORMULA_NOTEBOOK_PNG_KEYS, ...PLOT_LIKE_NOTEBOOK_PNG_KEYS];
  if (
    notebookKeys.size !== expectedNotebookKeys.length ||
    expectedNotebookKeys.some((key) => !notebookKeys.has(key))
  ) {
    problems.push('notebook PNG rows do not equal both closed classification allowlists');
  }

  const notebookStoredOutputCounts = unknownRecord(
    inventory.notebookStoredOutputCounts,
  ) ?? {};
  const expectedNotebookStoredOutputCounts = {
    imagePngDataCount:
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected.notebookPngCount,
    textLatexDataCount:
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected
        .notebookTextLatexDataCount,
    textPlainDataCount:
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected
        .notebookTextPlainDataCount,
    streamOutputCount:
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected
        .notebookStreamOutputCount,
  };
  if (!canonicalMatches(
    notebookStoredOutputCounts,
    expectedNotebookStoredOutputCounts,
  )) {
    problems.push('documentation notebook stored-output counts drifted');
  }
  const userdocsDirectiveCounts = unknownRecord(
    inventory.userdocsDirectiveCounts,
  ) ?? {};
  const expectedUserdocsDirectiveCounts = {
    figureDirectivesExcludedFromRstSourceCount:
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected
        .userdocsFigureDirectiveCount,
  };
  if (!canonicalMatches(
    userdocsDirectiveCounts,
    expectedUserdocsDirectiveCounts,
  )) {
    problems.push('documentation UserDocs directive counts drifted');
  }

  const figures = records(
    inventory.documentationScriptFigures,
    'documentationScriptFigures',
    problems,
  );
  sortedUniqueBy(figures, 'figureId', 'documentationScriptFigures', problems);
  const expectedFigureKeys = new Set([
    ...SAVED_SCRIPT_FIGURES.map(({ sourcePath, family }) => `${sourcePath}\0${family}`),
    ...UNSAVED_SCRIPT_FIGURES.map(({ sourcePath, family }) => `${sourcePath}\0${family}`),
  ]);
  const observedFigureKeys = new Set<string>();
  let activeSaveCount = 0;
  for (const figure of figures) {
    if (!exactDataKeys(figure, [
      'figureId',
      'sourceId',
      'sourcePath',
      'family',
      'definitionState',
      'saveState',
      'literalSaveTarget',
      'saveTargetCwdAuthority',
      'saveTargetResolutionState',
    ], 'documentationScriptFigures row', problems)) continue;
    const { figureId, ...payload } = figure;
    const sourcePath = typeof figure.sourcePath === 'string' ? figure.sourcePath : '';
    const family = typeof figure.family === 'string' ? figure.family : '';
    const figureKey = `${sourcePath}\0${family}`;
    const saved = SAVED_SCRIPT_FIGURES.find((candidate) =>
      candidate.sourcePath === sourcePath && candidate.family === family);
    const unsaved = UNSAVED_SCRIPT_FIGURES.find((candidate) =>
      candidate.sourcePath === sourcePath && candidate.family === family);
    const boundSource = sourceById.get(String(figure.sourceId));
    const expectedPayload = saved
      ? {
          sourceId: figure.sourceId,
          sourcePath,
          family,
          definitionState: 'active_source_definition_not_executed',
          saveState: 'active_literal_save_call',
          literalSaveTarget: saved.literalSaveTarget,
          saveTargetCwdAuthority: 'unbound_not_assessed',
          saveTargetResolutionState: 'not_assessed',
        }
      : unsaved
        ? {
            sourceId: figure.sourceId,
            sourcePath,
            family,
            definitionState: 'active_source_definition_not_executed',
            saveState: 'no_active_save_call',
            literalSaveTarget: null,
            saveTargetCwdAuthority: 'not_applicable',
            saveTargetResolutionState: 'not_applicable',
          }
        : null;
    if (
      figureId !== validationIdentity('cortexel.nest-documentation.script-figure.v1', payload) ||
      boundSource?.path !== figure.sourcePath ||
      boundSource?.documentationLeafClass !== 'python_source' ||
      expectedPayload === null ||
      !canonicalMatches(payload, expectedPayload)
    ) {
      problems.push(`documentation script figure ${JSON.stringify(figureId)} has a mismatched identity`);
    }
    if (observedFigureKeys.has(figureKey)) {
      problems.push('documentation script figures contain a duplicate source/family pair');
    }
    observedFigureKeys.add(figureKey);
    if (figure.saveState === 'active_literal_save_call') activeSaveCount++;
  }
  if (
    observedFigureKeys.size !== expectedFigureKeys.size ||
    [...expectedFigureKeys].some((key) => !observedFigureKeys.has(key))
  ) {
    problems.push('documentation script figures do not equal the closed source allowlist');
  }

  const exclusions = records(
    inventory.excludedScriptCandidates,
    'excludedScriptCandidates',
    problems,
  );
  for (const exclusion of exclusions) {
    exactDataKeys(exclusion, [
      'sourceId',
      'sourcePath',
      'family',
      'reason',
      'evidenceState',
    ], 'excludedScriptCandidates row', problems);
  }
  const expectedExclusions = EXCLUDED_SCRIPT_CANDIDATES.map((expectedExclusion) => ({
    sourceId: sourceByPath.get(expectedExclusion.sourcePath)?.sourceId,
    sourcePath: expectedExclusion.sourcePath,
    family: expectedExclusion.family,
    reason: expectedExclusion.reason,
    evidenceState: 'source_review_only_not_executed',
  }));
  if (!canonicalMatches(exclusions, expectedExclusions)) {
    problems.push('documentation script exclusion projection drifted');
  }

  const diagrams = records(
    inventory.authoredDiagramDirectives,
    'authoredDiagramDirectives',
    problems,
  );
  sortedUniqueBy(diagrams, 'directiveId', 'authoredDiagramDirectives', problems);
  const diagramLocations = new Set<string>();
  for (const diagram of diagrams) {
    if (!exactDataKeys(diagram, [
      'directiveId',
      'sourceId',
      'sourcePath',
      'line',
      'kind',
      'target',
      'directiveBlockSha256',
      'definitionState',
    ], 'authoredDiagramDirectives row', problems)) continue;
    const { directiveId, ...payload } = diagram;
    const boundSource = sourceById.get(String(diagram.sourceId));
    const location = `${String(diagram.sourcePath)}\0${String(diagram.line)}`;
    if (
      directiveId !== validationIdentity('cortexel.nest-documentation.rst-diagram.v1', payload) ||
      boundSource?.path !== diagram.sourcePath ||
      boundSource?.documentationLeafClass !== 'rst_source'
    ) {
      problems.push(`authored diagram ${JSON.stringify(directiveId)} has a mismatched identity`);
    }
    if (
      diagram.definitionState !== 'authored_source_not_built' ||
      !['graphviz', 'mermaid', 'uml'].includes(String(diagram.kind)) ||
      (!Number.isSafeInteger(diagram.line) || Number(diagram.line) <= 0) ||
      (diagram.target !== null && typeof diagram.target !== 'string') ||
      !SHA256.test(String(diagram.directiveBlockSha256)) ||
      diagramLocations.has(location)
    ) {
      problems.push(`authored diagram ${JSON.stringify(directiveId)} has malformed semantics`);
    }
    diagramLocations.add(location);
  }
  const expectedDiagrams = AUTHORED_DIAGRAM_DIRECTIVES.map((expected) => {
    const payload = {
      sourceId: sourceByPath.get(expected.sourcePath)?.sourceId,
      sourcePath: expected.sourcePath,
      line: expected.line,
      kind: expected.kind,
      target: expected.target,
      directiveBlockSha256: expected.directiveBlockSha256,
      definitionState: 'authored_source_not_built',
    };
    return {
      ...payload,
      directiveId: validationIdentity(
        'cortexel.nest-documentation.rst-diagram.v1',
        payload,
      ),
    };
  }).sort((left, right) => compareText(String(left.directiveId), String(right.directiveId)));
  if (!canonicalMatches(diagrams, expectedDiagrams)) {
    problems.push('authored diagram rows do not equal the closed source allowlist');
  }

  const modules = records(
    inventory.publicVisualizationModules,
    'publicVisualizationModules',
    problems,
  );
  sortedUniqueBy(modules, 'path', 'publicVisualizationModules', problems);
  for (const [index, module] of modules.entries()) {
    if (!exactDataKeys(module, [
      'moduleId',
      'sourceId',
      'path',
      'publicNames',
      'availabilityState',
    ], 'publicVisualizationModules row', problems)) continue;
    const { moduleId, ...payload } = module;
    const expectedModule = [...PUBLIC_VISUALIZATION_MODULES]
      .sort((left, right) => compareText(left.path, right.path))[index];
    const boundSource = sourceById.get(String(module.sourceId));
    const expectedPayload = expectedModule
      ? {
          sourceId: module.sourceId,
          path: expectedModule.path,
          publicNames: [...expectedModule.publicNames],
          availabilityState: 'public_source_definition_not_imported',
        }
      : null;
    if (
      moduleId !== validationIdentity('cortexel.nest-documentation.visual-module.v1', payload) ||
      boundSource?.path !== module.path ||
      !sourceHasScope(boundSource, 'pynest_public_module_scan') ||
      expectedPayload === null ||
      !canonicalMatches(payload, expectedPayload)
    ) {
      problems.push(`public visualization module ${JSON.stringify(module.path)} has a mismatched identity`);
    }
  }

  if (!canonicalMatches(inventory.rstDirectiveCounts, {
    figureOrImageAssetReferences:
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected.rstAssetReferenceDirectiveCount,
    mathFormulaDirectives:
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected.rstMathDirectiveCount,
  })) {
    problems.push('documentation RST directive counts drifted');
  }
  const expectedAxes = [
    ['documentation_selected_source_inventory', 'complete'],
    ['documentation_build_execution', 'not_run'],
    ['execution_bound_visual_output_inventory', 'not_established'],
    ['stable_contract_mapping', 'not_assessed'],
    ['packaged_adapter_implementation', 'not_assessed'],
    ['renderer_parity', 'not_assessed'],
    ['scientific_certification', 'not_run'],
  ];
  const axes = records(inventory.evidenceAxes, 'evidenceAxes', problems);
  for (const axis of axes) {
    exactDataKeys(axis, ['id', 'state'], 'evidenceAxes row', problems);
  }
  if (
    axes.length !== expectedAxes.length ||
    expectedAxes.some(([id, state], index) => axes[index]?.id !== id || axes[index]?.state !== state)
  ) {
    problems.push('documentation source inventory evidence axes drifted or transferred evidence');
  }
  const recomputedSummary: NestDocumentationSourceInventory['summary'] = {
    ...sourceCounts,
    userdocsBlockCount: userdocs.length,
    uniqueBoundBlobCount: sources.length,
    notebookPngCount: notebookAssets.length,
    notebookPlotPngCount,
    notebookFormulaPngCount,
    notebookTextLatexDataCount:
      Number.isSafeInteger(notebookStoredOutputCounts.textLatexDataCount)
        ? Number(notebookStoredOutputCounts.textLatexDataCount)
        : -1,
    notebookTextPlainDataCount:
      Number.isSafeInteger(notebookStoredOutputCounts.textPlainDataCount)
        ? Number(notebookStoredOutputCounts.textPlainDataCount)
        : -1,
    notebookStreamOutputCount:
      Number.isSafeInteger(notebookStoredOutputCounts.streamOutputCount)
        ? Number(notebookStoredOutputCounts.streamOutputCount)
        : -1,
    userdocsFigureDirectiveCount:
      Number.isSafeInteger(
        userdocsDirectiveCounts.figureDirectivesExcludedFromRstSourceCount,
      )
        ? Number(
          userdocsDirectiveCounts.figureDirectivesExcludedFromRstSourceCount,
        )
        : -1,
    scriptFigureFamilyCount: figures.length,
    scriptActiveSaveCount: activeSaveCount,
    authoredDiagramSourceCount: new Set(diagrams.map(({ sourcePath }) => sourcePath)).size,
    authoredDiagramDirectiveCount: diagrams.length,
    publicVisualizationModuleCount: modules.length,
    admittedExecutionBoundVisualOutputCount: 0,
    mappedVisualOutputCount: 0,
    executableVisualOutputCount: 0,
    renderedVisualOutputCount: 0,
    certifiedVisualOutputCount: 0,
    coverageClaim: 'none',
  };
  if (!canonicalMatches(inventory.summary, recomputedSummary)) {
    problems.push('documentation source inventory summary is not derived from its rows');
  }
  if (!canonicalMatches(
    recomputedSummary,
    expectedSummary(PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY),
  )) {
    problems.push('documentation selected-source row counts do not equal the closed pin');
  }
  if (
    userdocs.length !== expected.userdocsBlockCount ||
    notebookAssets.length !== expected.notebookPngCount ||
    notebookPlotPngCount !== expected.notebookPlotPngCount ||
    notebookFormulaPngCount !== expected.notebookFormulaPngCount ||
    recomputedSummary.notebookTextLatexDataCount !==
      expected.notebookTextLatexDataCount ||
    recomputedSummary.notebookTextPlainDataCount !==
      expected.notebookTextPlainDataCount ||
    recomputedSummary.notebookStreamOutputCount !==
      expected.notebookStreamOutputCount ||
    recomputedSummary.userdocsFigureDirectiveCount !==
      expected.userdocsFigureDirectiveCount ||
    figures.length !== expected.scriptFigureFamilyCount ||
    activeSaveCount !== expected.scriptActiveSaveCount ||
    diagrams.length !== expected.authoredDiagramDirectiveCount ||
    new Set(diagrams.map(({ sourcePath }) => sourcePath)).size !==
      expected.authoredDiagramSourceCount ||
    modules.length !== expected.publicVisualizationModuleCount
  ) {
    problems.push('documentation selected-source derived-row cardinalities do not equal the closed pin');
  }

  return [...new Set(problems)].sort().slice(0, 64);
}

/** Pure raw-record parsers exposed only for focused audit regression tests. */
export const nestDocumentationSourceInventoryTesting = Object.freeze({
  notebookStoredOutputs,
  parseUserdocsBlock,
});
