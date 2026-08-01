import { readFileSync } from 'node:fs';
import path from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SOURCE_ADAPTER_CATALOG, SOURCE_ADAPTER_IDS } from '../src/adapters/source-catalog.js';
import { canonicalize } from '../src/core/canonicalize.js';
import { generatedNestExampleVisualizationCoverageBytes } from '../scripts/generate-nest-example-visualization-coverage.js';
import {
  PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_DIGEST,
  SEMANTIC_DEMAND_IDS,
  buildNestExampleVisualizationCoverage,
  nestExampleVisualizationCoverageDigest,
  validateNestExampleVisualizationCoverage,
} from '../scripts/lib/nest-example-visualization-coverage.js';
import type { NestDocumentationSourceInventory } from '../scripts/lib/nest-documentation-source-inventory.js';
import type { NestExampleSourceInventory } from '../scripts/lib/nest-example-source-inventory.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');

function readJson<T = JsonRecord>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, relativePath), 'utf8')) as T;
}

const coverageRaw = readFileSync(
  path.join(ROOT, 'docs/audit/nest-example-coverage.v2.json'),
  'utf8',
);
const coverage = JSON.parse(coverageRaw) as JsonRecord;
const schema = readJson('docs/audit/nest-example-coverage.v2.schema.json');
const sourceInventory = readJson<NestExampleSourceInventory>(
  'docs/audit/nest-example-source-inventory.v2.json',
);
const documentationInventory = readJson<NestDocumentationSourceInventory>(
  'docs/audit/nest-documentation-source-inventory.v1.json',
);

function validate(candidate: unknown, rawUtf8?: string): readonly string[] {
  return validateNestExampleVisualizationCoverage(
    candidate,
    schema,
    sourceInventory,
    documentationInventory,
    rawUtf8,
  );
}

function rebind(candidate: JsonRecord): void {
  candidate.semanticBinding.semanticDigest =
    nestExampleVisualizationCoverageDigest(candidate);
}

describe('pinned NEST example visualization coverage v2', () => {
  it('is the exact canonical reviewed projection and passes its strict schema', () => {
    expect(validate(coverage, coverageRaw)).toEqual([]);
    expect(coverageRaw).toBe(`${canonicalize(coverage as never)}\n`);
    expect(generatedNestExampleVisualizationCoverageBytes()).toBe(coverageRaw);
    expect(nestExampleVisualizationCoverageDigest(coverage)).toBe(
      PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_DIGEST,
    );
    expect(coverage.semanticBinding.semanticDigest).toBe(
      PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_DIGEST,
    );
  });

  it('rejects noncanonical retained artifact bytes without changing semantic identity', () => {
    expect(validate(coverage, ` ${coverageRaw}`)).toContain(
      'coverage-v2 artifact bytes are not exact canonical JSON plus one newline',
    );
    expect(validate(coverage, `${coverageRaw}\n`)).toContain(
      'coverage-v2 artifact bytes are not exact canonical JSON plus one newline',
    );
  });

  it('closes every canonical and support body exactly once with reconciled totals', () => {
    const canonicalRows = coverage.canonicalExamples as JsonRecord[];
    const supportRows = coverage.supportAndCoordinatedBodies as JsonRecord[];
    const sourceEntrypointPaths = sourceInventory.entrypoints
      .map(({ canonicalPath }) => canonicalPath)
      .sort();
    const classifiedEntrypointPaths = canonicalRows
      .map(({ path: sourcePath }) => sourcePath as string)
      .sort();
    expect(classifiedEntrypointPaths).toEqual(sourceEntrypointPaths);
    expect(new Set(classifiedEntrypointPaths).size).toBe(98);

    const supportPaths = sourceInventory.sourcePaths
      .filter(
        ({ kind, role }) =>
          kind === 'regular_python' && role !== 'official_entrypoint',
      )
      .map(({ path: sourcePath }) => sourcePath)
      .sort();
    expect(supportRows.map(({ path: sourcePath }) => sourcePath).sort()).toEqual(
      supportPaths,
    );
    expect(new Set(supportPaths).size).toBe(11);

    const counts = (rows: readonly JsonRecord[]) => ({
      active: rows.filter(
        ({ visualizationStatus }) => visualizationStatus === 'active_visualization',
      ).length,
      importOnly: rows.filter(
        ({ visualizationStatus }) =>
          visualizationStatus === 'visualization_import_only',
      ).length,
      none: rows.filter(
        ({ visualizationStatus }) =>
          visualizationStatus === 'no_visualization_operation',
      ).length,
    });
    expect(counts(canonicalRows)).toEqual({ active: 84, importOnly: 1, none: 13 });
    expect(counts(supportRows)).toEqual({ active: 2, importOnly: 0, none: 9 });
    expect(coverage.summary).toMatchObject({
      canonicalExampleBodyCount: 98,
      regularPythonBodyCount: 109,
      regularPythonActiveVisualizationBodyCount: 86,
      regularPythonVisualizationImportOnlyBodyCount: 1,
      regularPythonNoVisualizationBodyCount: 22,
      orchestrationAliasCount: 3,
      runnerTargetProfileCount: 92,
      checkedInVisualAssetCount: 12,
    });

    const importOnlyRows = canonicalRows.filter(
      ({ visualizationStatus }) =>
        visualizationStatus === 'visualization_import_only',
    );
    expect(importOnlyRows.map(({ path: sourcePath }) => sourcePath)).toEqual([
      'pynest/examples/hpc_benchmark.py',
    ]);
    expect(importOnlyRows[0]?.sourceEvidence.lineAnchors).toEqual([98]);

    expect(
      supportRows
        .filter(
          ({ visualizationStatus }) =>
            visualizationStatus === 'active_visualization',
        )
        .map(({ path: sourcePath }) => sourcePath)
        .sort(),
    ).toEqual([
      'pynest/examples/EI_clustered_network/helper.py',
      'pynest/examples/sudoku/helpers_sudoku.py',
    ]);
  });

  it('keeps every demand used, closed, and internally consistent', () => {
    const rows = [
      ...(coverage.canonicalExamples as JsonRecord[]),
      ...(coverage.supportAndCoordinatedBodies as JsonRecord[]),
    ];
    const definitionIds = (coverage.semanticDemandDefinitions as JsonRecord[])
      .map(({ id }) => id as string)
      .sort();
    const usedIds = [
      ...new Set(
        rows.flatMap(({ semanticDemands }) => semanticDemands as string[]),
      ),
    ].sort();
    expect(definitionIds).toEqual([...SEMANTIC_DEMAND_IDS]);
    expect(usedIds).toEqual(definitionIds);

    for (const row of rows) {
      const isActive = row.visualizationStatus === 'active_visualization';
      expect(row.semanticDemands.length > 0, row.path).toBe(isActive);
      expect(row.presentationDemands.length > 0, row.path).toBe(isActive);
      expect(row.visualOperations.length > 0, row.path).toBe(isActive);
      expect(row.sourceEvidence.lineAnchors.length > 0, row.path).toBe(
        isActive || row.visualizationStatus === 'visualization_import_only',
      );
      if (isActive) {
        expect(
          row.presentationDemands.includes('single_panel') !==
            row.presentationDemands.includes('multi_panel'),
          row.path,
        ).toBe(true);
      }
      if (row.presentationDemands.includes('cross_capability_bundle')) {
        expect(row.semanticDemands.length, row.path).toBeGreaterThanOrEqual(2);
      }
      for (const member of [
        row.semanticDemands,
        row.presentationDemands,
        row.visualOperations,
      ] as readonly string[][]) {
        expect(member, row.path).toEqual([...new Set(member)].sort());
      }
    }
  });

  it('resolves stable candidates against current contract authority without transferring adapter or parity evidence', () => {
    const capabilities = readJson('contract/registries/capabilities.v1.json');
    const renderers = readJson('contract/registries/renderers.v1.json');
    const stableSkillIds = new Set(
      (capabilities.capabilities as JsonRecord[])
        .filter(({ kind, status }) => kind === 'skill' && status === 'stable')
        .map(({ id }) => id as string),
    );
    const rendererIds = new Set(
      (renderers.renderers as JsonRecord[]).map(({ id }) => id as string),
    );

    expect(SOURCE_ADAPTER_IDS).toEqual(['nest-spike-recorder']);
    expect(SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder']).toMatchObject({
      id: 'nest-spike-recorder',
      revision: 5,
      outputSkillId: 'neuro.spike_raster',
    });

    const adapterBearingDemands: string[] = [];
    for (const definition of coverage.semanticDemandDefinitions as JsonRecord[]) {
      for (const skillId of definition.stableRepresentability.skillCandidates as string[]) {
        expect(stableSkillIds.has(skillId), `${definition.id}/${skillId}`).toBe(true);
      }
      for (const rendererId of definition.renderer.rendererCandidates as string[]) {
        expect(rendererIds.has(rendererId), `${definition.id}/${rendererId}`).toBe(true);
      }
      expect(definition.upstreamParity, definition.id).toBe('not_run');
      expect(definition.scientificCertification, definition.id).toBe('not_run');
      if (definition.executableAdapter.state !== 'none') {
        adapterBearingDemands.push(definition.id as string);
        expect(definition.executableAdapter).toEqual({
          state: 'one_profile_available_no_example_match',
          adapterCandidates: ['nest-spike-recorder.v5'],
        });
      } else {
        expect(definition.executableAdapter.adapterCandidates).toEqual([]);
      }
    }
    expect(adapterBearingDemands).toEqual(['spike_raster']);
    expect(coverage.summary).toMatchObject({
      exampleSpecificMappedOutputCount: 0,
      exampleSpecificExecutableAdapterMatchCount: 0,
      rendererUpstreamParityResultCount: 0,
      upstreamExecutedOutputCount: 0,
      scientificallyCertifiedOutputCount: 0,
      coverageClaim: 'source_semantic_classification_only',
    });
  });

  it('keeps aliases, checked-in assets, and documentation surfaces outside the body denominator', () => {
    const canonicalPaths = new Set(
      (coverage.canonicalExamples as JsonRecord[]).map(({ path: sourcePath }) =>
        sourcePath as string),
    );
    expect(coverage.orchestrationAliases).toHaveLength(3);
    for (const alias of coverage.orchestrationAliases as JsonRecord[]) {
      expect(alias.classification).toBe('alias_not_an_additional_python_body');
      expect(canonicalPaths.has(alias.aliasPath as string)).toBe(false);
      expect(canonicalPaths.has(alias.resolvedTargetPath as string)).toBe(true);
    }

    expect(coverage.checkedInVisualAssets).toHaveLength(12);
    expect(
      (coverage.checkedInVisualAssets as JsonRecord[]).map(({ assetId }) => assetId),
    ).toEqual(sourceInventory.visualAssets.map(({ assetId }) => assetId));
    for (const asset of coverage.checkedInVisualAssets as JsonRecord[]) {
      expect(asset.evidenceState).toBe(
        'checked_in_source_asset_not_execution_bound_output',
      );
      expect(asset.semanticMapping).toBe('not_assessed');
      expect(asset.upstreamParity).toBe('not_run');
      expect(asset.scientificCertification).toBe('not_run');
    }

    expect(coverage.documentationSurfaces).toMatchObject({
      denominator:
        'separate_selected_documentation_source_inventory_not_example_body_coverage',
      selectedBoundBlobCount: 784,
      documentationScriptFigureDefinitionCount: 18,
      documentationScriptActiveSaveCallCount: 17,
      notebookStoredPngCount: 50,
      notebookPlotLikePngCount: 38,
      publicVisualizationModuleDefinitionCount: 4,
      evidenceState: 'source_definitions_and_stored_assets_only_not_built_or_executed',
      mappingState: 'not_assessed_in_this_example_body_classification',
      upstreamParity: 'not_run',
      scientificCertification: 'not_run',
    });
  });

  it('rejects source-identity drift for arbitrary canonical rows even after attacker-controlled rebinding', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 97 }),
        fc.constantFrom('sourceId', 'sha256', 'gitBlobSha1'),
        (index, member) => {
          const candidate = structuredClone(coverage);
          const row = candidate.canonicalExamples[index] as JsonRecord;
          row[member] = member === 'gitBlobSha1'
            ? '0'.repeat(40)
            : `sha256:${'0'.repeat(64)}`;
          rebind(candidate);
          expect(validate(candidate)).not.toEqual([]);
        },
      ),
      { numRuns: 24 },
    );
  }, 30_000);

  it('rejects evidence transfer, row-set drift, and schema widening even after rebinding', () => {
    const promoted = structuredClone(coverage);
    promoted.summary.upstreamExecutedOutputCount = 1;
    promoted.evidenceAxes[5].state = 'complete';
    rebind(promoted);
    expect(validate(promoted)).toContain(
      'coverage-v2 value drifted from the closed reviewed projection',
    );

    const deleted = structuredClone(coverage);
    deleted.canonicalExamples.pop();
    deleted.summary.canonicalExampleBodyCount = 97;
    rebind(deleted);
    expect(validate(deleted)).not.toEqual([]);

    const inventedAdapter = structuredClone(coverage);
    const analog = inventedAdapter.semanticDemandDefinitions.find(
      ({ id }: JsonRecord) => id === 'analog_trace',
    );
    analog.executableAdapter = {
      state: 'one_profile_available_no_example_match',
      adapterCandidates: ['nest-multimeter.v1'],
    };
    rebind(inventedAdapter);
    expect(validate(inventedAdapter)).not.toEqual([]);

    const widened = structuredClone(coverage);
    widened.unreviewedCoverageClaim = true;
    rebind(widened);
    expect(validate(widened)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('must NOT have additional properties'),
      ]),
    );
  });

  it('fails closed when either pinned authority loses its closed inventory shape', () => {
    const sourceDrift = structuredClone(sourceInventory) as JsonRecord;
    sourceDrift.entrypoints.pop();
    expect(() =>
      buildNestExampleVisualizationCoverage(
        sourceDrift as NestExampleSourceInventory,
        documentationInventory,
      )).toThrow(/invalid NEST example source inventory/u);

    const documentationDrift = structuredClone(documentationInventory) as JsonRecord;
    documentationDrift.summary.notebookPngCount = 49;
    expect(() =>
      buildNestExampleVisualizationCoverage(
        sourceInventory,
        documentationDrift as NestDocumentationSourceInventory,
      )).toThrow(/invalid NEST documentation source inventory/u);
  });
});
