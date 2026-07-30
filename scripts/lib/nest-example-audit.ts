/** Pure validation for the external, mutable NEST official-example audit. */

import Ajv2020 from 'ajv/dist/2020.js';

import {
  canonicalNestExampleSourceInventory,
  NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
  PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
  validateNestExampleSourceInventory,
  type NestExampleSourceInventory,
} from './nest-example-source-inventory.js';
import { canonicalize } from '../../src/core/canonicalize.js';
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
  'docs/audit/nest-example-source-inventory.v1.json' as const;
export const NEST_EXAMPLE_SOURCE_ARTIFACT_BYTE_LENGTH = 196_576 as const;
export const NEST_EXAMPLE_SOURCE_ARTIFACT_SHA256 =
  'sha256:1d762db8c60e174f42371308093c0d091937bde2299ed8cfce4217c9e9179c1a' as const;

const EXPECTED_AXES = Object.freeze([
  ['upstream_source_inventory', 'complete'],
  ['visual_output_inventory', 'not_generated'],
  ['stable_contract_mapping', 'not_assessed'],
  ['packaged_adapter_implementation', 'not_assessed'],
  ['renderer_coverage', 'not_assessed'],
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
  canonicalEntrypointCount: 98,
  runnerTargetProfileCount: 92,
  checkedInVisualAssetCount: 12,
  inventoriedVisualOutputCount: 0,
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
  protocolVersion: 1,
  identityAlgorithm: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
  inventoryDigest: PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
  artifactByteLength: NEST_EXAMPLE_SOURCE_ARTIFACT_BYTE_LENGTH,
  artifactSha256: NEST_EXAMPLE_SOURCE_ARTIFACT_SHA256,
});

export interface NestExampleSourceArtifactEvidence {
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
  return [...new Set(problems)].sort().slice(0, MAX_PROBLEMS);
}

function schemaProblems(parsed: unknown, schema: unknown): string[] {
  if (!isRecord(schema)) {
    return ['NEST example audit schema root must be an object'];
  }
  try {
    const validate = new Ajv2020({
      allErrors: true,
      strict: true,
      validateSchema: true,
    }).compile(schema);
    if (validate(parsed)) return [];
    return (validate.errors ?? []).slice(0, MAX_PROBLEMS).map((error) =>
      `schema ${error.instancePath || '/'} ${error.message ?? error.keyword}`);
  } catch {
    return ['NEST example audit schema is not strict-compilable'];
  }
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
  };
  if (!canonicalEqual(ledgerCounts, expectedCounts)) {
    problems.push('NEST example audit source counts do not equal the bound artifact');
  }
  if (source.inventoryDigest !== artifact.inventoryDigest) {
    problems.push('NEST example audit inventory digest does not equal the bound artifact field');
  }
}

/**
 * Validate the closed V1 ledger and its separately stored canonical source
 * artifact. Passing source closure never authorizes a later evidence axis.
 */
export function validateNestExampleAudit(
  parsed: unknown,
  schema: unknown,
  sourceEvidence?: NestExampleSourceArtifactEvidence,
): string[] {
  const problems = schemaProblems(parsed, schema);
  if (!isRecord(parsed)) return finish(problems);

  if (!canonicalEqual(parsed.upstreamAuthority, PINNED_UPSTREAM)) {
    problems.push('NEST example audit upstream authority does not equal the closed pin');
  }
  validateAxes(parsed, problems);
  validateUnsupportedInterfaces(parsed, problems);
  validateSummary(parsed, problems);
  validateSourceArtifact(parsed, sourceEvidence, problems);
  return finish(problems);
}
