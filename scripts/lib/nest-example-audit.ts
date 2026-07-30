/** Pure validation for the external, mutable NEST official-example audit ledger. */

import Ajv2020 from 'ajv/dist/2020.js';

type JsonRecord = Record<string, any>;

const EXPECTED_LAYER_IDS = Object.freeze([
  'upstream_source_inventory',
  'visual_output_inventory',
  'stable_contract_mapping',
  'packaged_adapter_implementation',
  'renderer_coverage',
  'upstream_execution',
  'scientific_certification',
] as const);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function duplicateStrings(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

/**
 * Validate both the closed zero-claim schema and relations whose arithmetic or
 * identity is clearer as code. This ledger is repository evidence, never package
 * semantics; callers decide where its bytes live.
 */
export function validateNestExampleAudit(
  parsed: unknown,
  schema: unknown,
): string[] {
  const problems: string[] = [];
  if (!isRecord(schema)) return ['NEST example audit schema root must be an object'];

  try {
    const validate = new Ajv2020({
      allErrors: true,
      strict: true,
      validateSchema: true,
    }).compile(schema);
    if (!validate(parsed)) {
      problems.push(...(validate.errors ?? []).slice(0, 64).map((error) =>
        `schema ${error.instancePath || '/'} ${error.message ?? error.keyword}`));
    }
  } catch {
    return ['NEST example audit schema is not strict-compilable'];
  }
  if (!isRecord(parsed)) return problems;

  const layers = Array.isArray(parsed.layers) ? parsed.layers : [];
  const layerIds = layers.flatMap((layer) =>
    isRecord(layer) && typeof layer.id === 'string' ? [layer.id] : []);
  for (const duplicate of duplicateStrings(layerIds)) {
    problems.push(`duplicate NEST example audit layer id ${JSON.stringify(duplicate)}`);
  }
  if (
    layerIds.length !== EXPECTED_LAYER_IDS.length ||
    EXPECTED_LAYER_IDS.some((id, index) => layerIds[index] !== id)
  ) {
    problems.push('NEST example audit layers must equal the closed ordered layer inventory');
  }

  const interfaces = Array.isArray(parsed.knownUnsupportedInterfaces)
    ? parsed.knownUnsupportedInterfaces
    : [];
  const interfaceIds = interfaces.flatMap((entry) =>
    isRecord(entry) && typeof entry.id === 'string' ? [entry.id] : []);
  for (const duplicate of duplicateStrings(interfaceIds)) {
    problems.push(
      `duplicate NEST example audit unsupported-interface id ${JSON.stringify(duplicate)}`,
    );
  }

  const upstream = isRecord(parsed.upstream) ? parsed.upstream : {};
  const expectedTreeApi =
    'https://api.github.com/repos/nest/nest-simulator/git/trees/' +
    `${String(upstream.commit)}?recursive=1`;
  if (upstream.treeApiUrl !== expectedTreeApi) {
    problems.push('NEST example audit treeApiUrl does not bind the pinned commit');
  }

  const universe = isRecord(parsed.sourceUniverse) ? parsed.sourceUniverse : {};
  if (
    universe.pythonPathEntryCount !==
    Number(universe.regularPythonFileCount) + Number(universe.pythonSymlinkCount)
  ) {
    problems.push(
      'NEST example audit pythonPathEntryCount must equal regular files plus symlinks',
    );
  }
  if (
    universe.regularPythonFileCount !==
    Number(universe.regularExecutablePythonFileCount) +
      Number(universe.regularNonExecutablePythonFileCount)
  ) {
    problems.push(
      'NEST example audit regularPythonFileCount must equal executable plus ' +
        'non-executable regular files',
    );
  }
  const assets = isRecord(universe.visualAssetCountsByExtension)
    ? universe.visualAssetCountsByExtension
    : {};
  if (
    universe.visualAssetPathEntryCount !==
    Number(assets.png) + Number(assets.gif) + Number(assets.svg)
  ) {
    problems.push(
      'NEST example audit visualAssetPathEntryCount must equal its PNG, GIF, and SVG counts',
    );
  }

  return problems;
}
