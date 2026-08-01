/** Pure validation for the external, mutable NEST PyNEST-example source audit. */

import Ajv2020 from 'ajv/dist/2020.js';

import {
  canonicalNestExampleSourceInventory,
  NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
  NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR,
  NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
  PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
  validateNestExampleSourceInventory,
  type NestExampleSourceInventory,
} from './nest-example-source-inventory.js';
import {
  canonicalNestDocumentationSourceInventory,
  NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
  NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY,
  PINNED_NEST_DOCUMENTATION_SOURCE_INVENTORY_DIGEST,
  validateNestDocumentationSourceInventory,
  type NestDocumentationSourceInventory,
} from './nest-documentation-source-inventory.js';
import { canonicalDigest, canonicalize } from '../../src/core/canonicalize.js';
import { sha256Digest, utf8ByteLength } from '../../src/core/sha256.js';

type JsonRecord = Record<string, any>;

const MAX_PROBLEMS = 64;

const PINNED_UPSTREAM = Object.freeze({
  project: 'NEST Simulator',
  release: 'v3.10',
  repository: 'https://github.com/nest/nest-simulator.git',
  commit: 'acca9704da248750219a027db99fec6cd1f9052a',
  rootTreeGitSha1: '7f6f4f0407c4000cded433b86d658191dd82cd79',
  documentationIndex: Object.freeze({
    path: 'doc/htmldoc/examples/index.rst',
    gitMode: '100644',
    gitBlobSha1: '2965669bd03f128478fa107779485ad5934b73c5',
  }),
  runner: Object.freeze({
    path: 'pynest/examples/run_examples.sh',
    gitMode: '100755',
    gitBlobSha1: '6b36df9dd356a419e12aa477b0d05611111052f7',
  }),
  orchestrationCmake: Object.freeze({
    path: 'pynest/examples/CMakeLists.txt',
    gitMode: '100644',
    gitBlobSha1: 'b1c834a050be5562edb54218d960fcf255ecd8ea',
    role: 'installs_run_examples_shell_only_not_entrypoint_authority',
  }),
  exampleTreePath: 'pynest/examples',
});

export const NEST_EXAMPLE_SOURCE_ARTIFACT_PATH =
  'docs/audit/nest-example-source-inventory.v2.json' as const;
export const NEST_EXAMPLE_SOURCE_ARTIFACT_BYTE_LENGTH = 228_211 as const;
export const NEST_EXAMPLE_SOURCE_ARTIFACT_SHA256 =
  'sha256:a8a7da4c62170a5405da3662dbef2602891c87cadbadd7f897196be6966928cd' as const;

export const NEST_DOCUMENTATION_SOURCE_ARTIFACT_PATH =
  'docs/audit/nest-documentation-source-inventory.v1.json' as const;
export const NEST_DOCUMENTATION_SOURCE_ARTIFACT_BYTE_LENGTH = 493_939 as const;
export const NEST_DOCUMENTATION_SOURCE_ARTIFACT_SHA256 =
  'sha256:d533a2f96046b484f192ed88ab70fa31d5620d48ebd647c72ec3008998f8f77c' as const;

export const NEST_EXAMPLE_AUDIT_SEMANTIC_IDENTITY =
  'cortexel-nest-official-example-coverage.semantic.rfc8785-sha256.v1' as const;
export const PINNED_NEST_EXAMPLE_AUDIT_SEMANTIC_DIGEST =
  'sha256:1ac8b2b440e333c8be8fe250545c4ab8e8525f7664a5448e5390135c41a090fc' as const;
const NEST_EXAMPLE_AUDIT_SEMANTIC_DIGEST_SCOPE =
  'all_top_level_members_except_semanticBinding' as const;
const NEST_EXAMPLE_AUDIT_SEMANTIC_DIGEST_DOMAIN =
  `${NEST_EXAMPLE_AUDIT_SEMANTIC_IDENTITY}\0` as const;
export const NEST_EXAMPLE_AUDIT_SCHEMA_IDENTITY =
  'cortexel-nest-official-example-coverage.schema.rfc8785-sha256.v1' as const;
export const PINNED_NEST_EXAMPLE_AUDIT_SCHEMA_DIGEST =
  'sha256:b5ae8c1cd39222a381edf62f7777d5f379e96e301591a82119383074d9af15f0' as const;
const NEST_EXAMPLE_AUDIT_SCHEMA_DIGEST_DOMAIN =
  `${NEST_EXAMPLE_AUDIT_SCHEMA_IDENTITY}\0` as const;

const EXPECTED_AXES = Object.freeze([
  ['upstream_source_inventory', 'complete'],
  ['documentation_selected_source_inventory', 'complete'],
  ['execution_bound_visual_output_inventory', 'not_established'],
  ['stable_contract_mapping', 'not_assessed'],
  ['packaged_adapter_implementation', 'not_assessed'],
  ['renderer_parity', 'not_assessed'],
  ['upstream_execution', 'not_run'],
  ['scientific_certification', 'not_run'],
] as const);

const EXPECTED_UNSUPPORTED_INTERFACE_IDS = Object.freeze([
  'figure_request_v1_connection_adapter',
  'figure_request_v1_multimeter_adapter',
  'figure_request_v1_position_adapter',
  'live_pynest_capture',
  'spike_recorder_nonmemory_backends',
  'spike_recorder_step_offset_clock',
] as const);

const EXPECTED_SUMMARY_COUNTS = Object.freeze({
  sourcePathCount: 112,
  exampleTreeLeafCount: 162,
  uniqueExampleTreeGitBlobCount: 159,
  auxiliaryLeafCount: 38,
  canonicalEntrypointCount: 98,
  runnerTargetProfileCount: 92,
  checkedInVisualAssetCount: 12,
  documentationSelectedSourceBoundBlobCount: 784,
  documentationScriptFigureDefinitionCount: 18,
  documentationStoredNotebookPngCount: 50,
  documentationPublicVisualizationModuleDefinitionCount: 4,
  admittedExecutionBoundVisualOutputCount: 0,
  mappedVisualOutputCount: 0,
  executableVisualOutputCount: 0,
  renderedVisualOutputCount: 0,
  upstreamExecutedVisualOutputCount: 0,
  certifiedVisualOutputCount: 0,
  coverageClaim: 'none',
});

const EXPECTED_ARTIFACT_METADATA = Object.freeze({
  path: NEST_EXAMPLE_SOURCE_ARTIFACT_PATH,
  protocol: 'cortexel-nest-example-source-inventory',
  protocolVersion: 2,
  identityAlgorithm: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
  predecessor: NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR,
  producerProfile: NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
  inventoryDigest: PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
  artifactByteLength: NEST_EXAMPLE_SOURCE_ARTIFACT_BYTE_LENGTH,
  artifactSha256: NEST_EXAMPLE_SOURCE_ARTIFACT_SHA256,
});

const EXPECTED_DOCUMENTATION_ARTIFACT_METADATA = Object.freeze({
  path: NEST_DOCUMENTATION_SOURCE_ARTIFACT_PATH,
  protocol: 'cortexel-nest-documentation-source-inventory',
  protocolVersion: 1,
  identityAlgorithm: NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY,
  producerProfile: NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
  inventoryDigest: PINNED_NEST_DOCUMENTATION_SOURCE_INVENTORY_DIGEST,
  artifactByteLength: NEST_DOCUMENTATION_SOURCE_ARTIFACT_BYTE_LENGTH,
  artifactSha256: NEST_DOCUMENTATION_SOURCE_ARTIFACT_SHA256,
});

const EXPECTED_SEMANTIC_BINDING = Object.freeze({
  identityAlgorithm: NEST_EXAMPLE_AUDIT_SEMANTIC_IDENTITY,
  digestScope: NEST_EXAMPLE_AUDIT_SEMANTIC_DIGEST_SCOPE,
  semanticDigest: PINNED_NEST_EXAMPLE_AUDIT_SEMANTIC_DIGEST,
});

export interface NestExampleSourceArtifactEvidence {
  readonly value: unknown;
  readonly rawUtf8: string;
  readonly predecessor?: NestExampleHistoricalSourceArtifactEvidence;
}

export interface NestExampleHistoricalSourceArtifactEvidence {
  readonly value: unknown;
  readonly rawUtf8: string;
}

export interface NestDocumentationSourceArtifactEvidence {
  readonly value: unknown;
  readonly rawUtf8: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalize(left as never) === canonicalize(right as never);
  } catch {
    return false;
  }
}

function finish(problems: readonly string[]): string[] {
  const unique = [...new Set(problems)].sort();
  const priorityPrefixes = [
    'NEST example audit',
    'NEST example source artifact',
    'NEST example historical',
    'NEST documentation source',
    'source inventory protocol identity',
    'source inventory digest',
    'source inventory upstream authority',
    'checked-in source inventory',
    'documentation source inventory protocol identity',
    'documentation source inventory digest',
    'documentation source inventory upstream authority',
  ] as const;
  const priority = unique.filter((problem) =>
    priorityPrefixes.some((prefix) => problem.startsWith(prefix)));
  const prioritized = new Set(priority);
  return [
    ...priority,
    ...unique.filter((problem) => !prioritized.has(problem)),
  ].slice(0, MAX_PROBLEMS);
}

/**
 * Bind the complete mutable audit value without making it package-normative.
 * The V1 preimage is UTF-8(domain + NUL + RFC8785(auditWithoutBinding)).
 */
export function nestExampleAuditSemanticDigest(value: unknown): string {
  if (!isRecord(value)) {
    throw new TypeError('NEST example audit root must be an object');
  }

  const payload: JsonRecord = Object.create(null) as JsonRecord;
  let keys: readonly (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch {
    throw new TypeError('NEST example audit members could not be inspected safely');
  }
  for (const key of keys) {
    if (typeof key === 'symbol') {
      throw new TypeError('NEST example audit symbol members are outside the JSON domain');
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      throw new TypeError('NEST example audit member could not be inspected safely');
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError('NEST example audit members must be enumerable data properties');
    }
    if (key !== 'semanticBinding') {
      Object.defineProperty(payload, key, {
        configurable: false,
        enumerable: true,
        value: descriptor.value,
        writable: false,
      });
    }
  }

  return sha256Digest(
    `${NEST_EXAMPLE_AUDIT_SEMANTIC_DIGEST_DOMAIN}${canonicalize(payload as never)}`,
  );
}

function validateSemanticBinding(parsed: JsonRecord, problems: string[]): void {
  const binding = isRecord(parsed.semanticBinding) ? parsed.semanticBinding : {};
  if (!canonicalEqual(binding, EXPECTED_SEMANTIC_BINDING)) {
    problems.push('NEST example audit semantic-binding metadata drifted');
  }

  try {
    const computed = nestExampleAuditSemanticDigest(parsed);
    if (
      computed !== PINNED_NEST_EXAMPLE_AUDIT_SEMANTIC_DIGEST ||
      binding.semanticDigest !== computed
    ) {
      problems.push('NEST example audit semantic narrative binding drifted');
    }
  } catch {
    problems.push('NEST example audit semantic narrative could not be canonically bound');
  }
}

function schemaProblems(parsed: unknown, schema: unknown): string[] {
  if (!isRecord(schema)) {
    return ['NEST example audit schema root must be an object'];
  }
  const problems: string[] = [];
  try {
    if (
      sha256Digest(
        `${NEST_EXAMPLE_AUDIT_SCHEMA_DIGEST_DOMAIN}${canonicalize(schema as never)}`,
      ) !== PINNED_NEST_EXAMPLE_AUDIT_SCHEMA_DIGEST
    ) {
      problems.push('NEST example audit schema semantic digest drifted');
    }
  } catch {
    problems.push('NEST example audit schema cannot be canonically bound');
  }
  try {
    const validate = new Ajv2020({
      allErrors: true,
      strict: true,
      validateSchema: true,
    }).compile(schema);
    if (!validate(parsed)) {
      problems.push(...(validate.errors ?? []).slice(0, MAX_PROBLEMS).map((error) =>
        `schema ${error.instancePath || '/'} ${error.message ?? error.keyword}`));
    }
  } catch {
    problems.push('NEST example audit schema is not strict-compilable');
  }
  return problems;
}

function validateAxes(parsed: JsonRecord, problems: string[]): void {
  const axes = Array.isArray(parsed.evidenceAxes)
    ? parsed.evidenceAxes.filter(isRecord)
    : [];
  if (
    axes.length !== EXPECTED_AXES.length ||
    EXPECTED_AXES.some(
      ([id, state], index) =>
        axes[index]?.id !== id || axes[index]?.state !== state,
    )
  ) {
    problems.push('NEST example audit evidence axes drifted or transferred evidence');
  }
}

function validateUnsupportedInterfaces(
  parsed: JsonRecord,
  problems: string[],
): void {
  const interfaces = Array.isArray(parsed.knownUnsupportedInterfaces)
    ? parsed.knownUnsupportedInterfaces.filter(isRecord)
    : [];
  const ids = interfaces.map((entry) => entry.id);
  if (
    ids.length !== EXPECTED_UNSUPPORTED_INTERFACE_IDS.length ||
    EXPECTED_UNSUPPORTED_INTERFACE_IDS.some((id, index) => ids[index] !== id) ||
    interfaces.some((entry) => entry.state !== 'unsupported')
  ) {
    problems.push('NEST example audit unsupported-interface inventory drifted');
  }
}

function validateSummary(parsed: JsonRecord, problems: string[]): void {
  const summary = isRecord(parsed.summary) ? parsed.summary : {};
  const projection = Object.fromEntries(
    Object.keys(EXPECTED_SUMMARY_COUNTS).map((key) => [key, summary[key]]),
  );
  if (!canonicalEqual(projection, EXPECTED_SUMMARY_COUNTS)) {
    problems.push('NEST example audit summary counts or coverage claim drifted');
  }
}

function validateSourceArtifact(
  parsed: JsonRecord,
  sourceEvidence: NestExampleSourceArtifactEvidence | undefined,
  problems: string[],
): void {
  const sourceInventory = isRecord(parsed.sourceInventory)
    ? parsed.sourceInventory
    : {};
  const artifact = isRecord(sourceInventory.artifact)
    ? sourceInventory.artifact
    : {};
  if (!canonicalEqual(artifact, EXPECTED_ARTIFACT_METADATA)) {
    problems.push('NEST example audit source-artifact metadata drifted');
  }
  if (sourceEvidence === undefined) {
    problems.push('NEST example audit source artifact was not supplied to the validator');
    return;
  }

  const predecessorEvidence = sourceEvidence.predecessor;
  if (predecessorEvidence === undefined) {
    problems.push('NEST example audit historical V1 predecessor artifact was not supplied');
  } else {
    const predecessor = NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR;
    if (
      utf8ByteLength(predecessorEvidence.rawUtf8) !==
      predecessor.artifactByteLength
    ) {
      problems.push('NEST example historical V1 artifact byte length drifted');
    }
    if (sha256Digest(predecessorEvidence.rawUtf8) !== predecessor.artifactSha256) {
      problems.push('NEST example historical V1 artifact bytes drifted');
    }
    try {
      if (canonicalize(predecessorEvidence.value as never) !== predecessorEvidence.rawUtf8) {
        problems.push('NEST example historical V1 artifact is not canonical JSON');
      }
    } catch {
      problems.push('NEST example historical V1 artifact cannot be canonically serialized');
    }
    if (!isRecord(predecessorEvidence.value)) {
      problems.push('NEST example historical V1 artifact is not an object');
    } else {
      const historical = predecessorEvidence.value;
      if (
        historical.protocol !== predecessor.protocol ||
        historical.protocolVersion !== predecessor.protocolVersion ||
        historical.identityAlgorithm !== predecessor.identityAlgorithm ||
        historical.inventoryDigest !== predecessor.inventoryDigest
      ) {
        problems.push('NEST example historical V1 semantic identity drifted');
      }
      const { inventoryDigest: _inventoryDigest, ...historicalCore } = historical;
      try {
        if (
          canonicalDigest({
            domain: predecessor.identityAlgorithm,
            inventory: historicalCore,
          }) !== predecessor.inventoryDigest
        ) {
          problems.push('NEST example historical V1 digest does not bind its semantic projection');
        }
      } catch {
        problems.push('NEST example historical V1 semantic projection is not canonicalizable');
      }
    }
  }

  if (
    utf8ByteLength(sourceEvidence.rawUtf8) !==
    NEST_EXAMPLE_SOURCE_ARTIFACT_BYTE_LENGTH
  ) {
    problems.push('NEST example source artifact byte length does not match its ledger authority');
  }
  if (sha256Digest(sourceEvidence.rawUtf8) !== NEST_EXAMPLE_SOURCE_ARTIFACT_SHA256) {
    problems.push('NEST example source artifact bytes do not match their ledger digest');
  }
  try {
    if (
      canonicalNestExampleSourceInventory(
        sourceEvidence.value as NestExampleSourceInventory,
      ) !== sourceEvidence.rawUtf8
    ) {
      problems.push('NEST example source artifact is not the exact canonical serialization');
    }
  } catch {
    problems.push('NEST example source artifact cannot be canonically serialized');
  }
  problems.push(...validateNestExampleSourceInventory(sourceEvidence.value));

  const source = isRecord(sourceEvidence.value) ? sourceEvidence.value : {};
  const summary = isRecord(source.summary) ? source.summary : {};
  const ledgerCounts = isRecord(sourceInventory.counts)
    ? sourceInventory.counts
    : {};
  const expectedCounts = {
    pythonPathEntryCount: summary.pythonPathEntryCount,
    regularPythonFileCount: summary.regularPythonFileCount,
    pythonSymlinkCount: summary.pythonSymlinkCount,
    canonicalEntrypointCount: summary.canonicalPrimaryBodyCount,
    runnerTargetProfileCount: summary.runnerAggProfileCount,
    checkedInVisualAssetCount: summary.visualAssetPathEntryCount,
    exampleTreeLeafCount: summary.exampleTreeLeafCount,
    uniqueExampleTreeGitBlobCount: summary.uniqueExampleTreeGitBlobCount,
    auxiliaryLeafCount: summary.auxiliaryLeafCount,
  };
  if (!canonicalEqual(ledgerCounts, expectedCounts)) {
    problems.push('NEST example audit source counts do not equal the bound artifact');
  }
  if (source.inventoryDigest !== artifact.inventoryDigest) {
    problems.push('NEST example audit inventory digest does not equal the bound artifact field');
  }
}

function validateDocumentationSourceArtifact(
  parsed: JsonRecord,
  sourceEvidence: NestDocumentationSourceArtifactEvidence | undefined,
  problems: string[],
): void {
  const inventory = isRecord(parsed.documentationSelectedSourceInventory)
    ? parsed.documentationSelectedSourceInventory
    : {};
  const artifact = isRecord(inventory.artifact) ? inventory.artifact : {};
  if (!canonicalEqual(artifact, EXPECTED_DOCUMENTATION_ARTIFACT_METADATA)) {
    problems.push('NEST documentation source-artifact metadata drifted');
  }
  if (sourceEvidence === undefined) {
    problems.push('NEST documentation source artifact was not supplied to the validator');
    return;
  }
  if (
    utf8ByteLength(sourceEvidence.rawUtf8) !==
    NEST_DOCUMENTATION_SOURCE_ARTIFACT_BYTE_LENGTH
  ) {
    problems.push('NEST documentation source artifact byte length does not match its ledger authority');
  }
  if (sha256Digest(sourceEvidence.rawUtf8) !== NEST_DOCUMENTATION_SOURCE_ARTIFACT_SHA256) {
    problems.push('NEST documentation source artifact bytes do not match their ledger digest');
  }
  try {
    if (
      canonicalNestDocumentationSourceInventory(
        sourceEvidence.value as NestDocumentationSourceInventory,
      ) !== sourceEvidence.rawUtf8
    ) {
      problems.push('NEST documentation source artifact is not the exact canonical serialization');
    }
  } catch {
    problems.push('NEST documentation source artifact cannot be canonically serialized');
  }
  problems.push(...validateNestDocumentationSourceInventory(sourceEvidence.value));

  const source = isRecord(sourceEvidence.value) ? sourceEvidence.value : {};
  const summary = isRecord(source.summary) ? source.summary : {};
  const counts = isRecord(inventory.counts) ? inventory.counts : {};
  const expectedCounts = {
    uniqueBoundBlobCount: summary.uniqueBoundBlobCount,
    documentationTreeLeafCount: summary.documentationTreeLeafCount,
    documentationRstCount: summary.documentationRstCount,
    documentationNotebookCount: summary.documentationNotebookCount,
    documentationPythonCount: summary.documentationPythonCount,
    documentationMediaCount: summary.documentationMediaCount,
    documentationSupportCount: summary.documentationSupportCount,
    pynestPublicModuleCandidateCount: summary.pynestPublicModuleCandidateCount,
    userdocsHeaderCandidateCount: summary.userdocsHeaderCandidateCount,
    userdocsBlockCount: summary.userdocsBlockCount,
    notebookStoredPngCount: summary.notebookPngCount,
    notebookPlotLikePngCount: summary.notebookPlotPngCount,
    notebookFormulaPngCount: summary.notebookFormulaPngCount,
    notebookTextLatexDataCount: summary.notebookTextLatexDataCount,
    notebookTextPlainDataCount: summary.notebookTextPlainDataCount,
    notebookStreamOutputCount: summary.notebookStreamOutputCount,
    userdocsFigureDirectiveCount: summary.userdocsFigureDirectiveCount,
    scriptFigureFamilyDefinitionCount: summary.scriptFigureFamilyCount,
    scriptActiveSaveCallCount: summary.scriptActiveSaveCount,
    authoredDiagramSourceCount: summary.authoredDiagramSourceCount,
    authoredDiagramDirectiveCount: summary.authoredDiagramDirectiveCount,
    rstFigureOrImageReferenceCount:
      isRecord(source.rstDirectiveCounts)
        ? source.rstDirectiveCounts.figureOrImageAssetReferences
        : undefined,
    rstMathDirectiveCount:
      isRecord(source.rstDirectiveCounts)
        ? source.rstDirectiveCounts.mathFormulaDirectives
        : undefined,
    publicVisualizationModuleDefinitionCount:
      summary.publicVisualizationModuleCount,
  };
  if (!canonicalEqual(counts, expectedCounts)) {
    problems.push('NEST documentation audit source counts do not equal the bound artifact');
  }
  if (source.inventoryDigest !== artifact.inventoryDigest) {
    problems.push('NEST documentation audit inventory digest does not equal the bound artifact field');
  }
}

/**
 * Validate the versioned coverage ledger and its separately stored canonical
 * source-inventory artifacts. Historical V1 bytes remain preserved evidence;
 * only the current closed identity may satisfy current gates. Passing source
 * closure never authorizes a later evidence axis.
 */
export function validateNestExampleAudit(
  parsed: unknown,
  schema: unknown,
  sourceEvidence?: NestExampleSourceArtifactEvidence,
  documentationSourceEvidence?: NestDocumentationSourceArtifactEvidence,
): string[] {
  const problems = schemaProblems(parsed, schema);
  if (!isRecord(parsed)) return finish(problems);

  validateSemanticBinding(parsed, problems);
  if (!canonicalEqual(parsed.upstreamAuthority, PINNED_UPSTREAM)) {
    problems.push('NEST example audit upstream authority does not equal the closed pin');
  }
  validateAxes(parsed, problems);
  validateUnsupportedInterfaces(parsed, problems);
  validateSummary(parsed, problems);
  validateSourceArtifact(parsed, sourceEvidence, problems);
  validateDocumentationSourceArtifact(
    parsed,
    documentationSourceEvidence,
    problems,
  );
  return finish(problems);
}
