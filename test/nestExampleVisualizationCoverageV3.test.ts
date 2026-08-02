import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { canonicalize } from '../src/core/canonicalize.js';
import { sha256DigestBytes } from '../src/core/sha256.js';
import { generatedNestExampleVisualizationCoverageV3Bytes } from '../scripts/generate-nest-example-visualization-coverage-v3.js';
import {
  generatedNestExampleVisualizationCoverageV3SchemaBytes,
  generatedNestExampleVisualizationOracleV1SchemaBytes,
} from '../scripts/generate-nest-example-visualization-schemas-v3.js';
import {
  PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_V3_DIGEST,
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_SHA256,
  PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_DIGEST,
  SEMANTIC_DEMAND_IDS_V3,
  buildNestExampleVisualizationCoverageV3,
  nestExampleVisualizationCoverageV3Digest,
  nestExampleVisualizationOracleDigest,
  validateNestExampleVisualizationCoverageV3,
  validateNestExampleVisualizationOracle,
} from '../scripts/lib/nest-example-visualization-coverage-v3.js';
import type { NestDocumentationSourceInventory } from '../scripts/lib/nest-documentation-source-inventory.js';
import type { NestExampleSourceInventory } from '../scripts/lib/nest-example-source-inventory.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');

function raw(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function json<T = JsonRecord>(relativePath: string): T {
  return JSON.parse(raw(relativePath)) as T;
}

const sourceInventory = json<NestExampleSourceInventory>(
  'docs/audit/nest-example-source-inventory.v2.json',
);
const documentationInventory = json<NestDocumentationSourceInventory>(
  'docs/audit/nest-documentation-source-inventory.v1.json',
);
const predecessorRaw = raw('docs/audit/nest-example-coverage.v2.json');
const predecessor = JSON.parse(predecessorRaw) as JsonRecord;
const oracleRaw = raw('docs/audit/nest-example-visualization-oracle.v1.json');
const oracle = JSON.parse(oracleRaw) as JsonRecord;
const oracleSchema = json('docs/audit/nest-example-visualization-oracle.v1.schema.json');
const coverageRaw = raw('docs/audit/nest-example-coverage.v3.json');
const coverage = JSON.parse(coverageRaw) as JsonRecord;
const coverageSchema = json('docs/audit/nest-example-coverage.v3.schema.json');

function validateOracle(candidate: unknown, candidateRaw?: string): readonly string[] {
  return validateNestExampleVisualizationOracle(
    candidate,
    oracleSchema,
    candidateRaw,
    readFileSync(path.join(ROOT, 'scripts/generate-nest-example-visualization-oracle.py')),
  );
}

function validateCoverage(candidate: unknown, candidateRaw?: string): readonly string[] {
  return validateNestExampleVisualizationCoverageV3(
    candidate,
    coverageSchema,
    sourceInventory,
    documentationInventory,
    predecessor,
    oracle,
    candidateRaw,
  );
}

function projection(row: JsonRecord): JsonRecord {
  return {
    semanticDemands: row.semanticDemands,
    presentationDemands: row.presentationDemands,
    visualOperations: row.visualOperations,
  };
}

function copyFixtureFiles(repositoryRoot: string): readonly string[] {
  const paths = [
    'docs/audit/nest-example-source-inventory.v2.json',
    'docs/audit/nest-documentation-source-inventory.v1.json',
    'docs/audit/nest-example-coverage.v2.json',
    'docs/audit/nest-example-coverage.v2.schema.json',
    'docs/audit/nest-example-visualization-oracle.v1.json',
    'scripts/lib/nest-example-visualization-coverage.ts',
    'scripts/generate-nest-example-visualization-coverage.ts',
    'scripts/generate-nest-example-visualization-oracle.py',
  ] as const;
  for (const relativePath of paths) {
    const destination = path.join(repositoryRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(path.join(ROOT, relativePath)));
  }
  return paths;
}

describe('pinned NEST example visualization coverage V3', () => {
  it('is the exact canonical, generated, schema-valid differential projection', () => {
    expect(validateOracle(oracle, oracleRaw)).toEqual([]);
    expect(validateCoverage(coverage, coverageRaw)).toEqual([]);
    expect(oracleRaw).toBe(`${canonicalize(oracle as never)}\n`);
    expect(coverageRaw).toBe(`${canonicalize(coverage as never)}\n`);
    expect(generatedNestExampleVisualizationCoverageV3Bytes()).toBe(coverageRaw);
    expect(generatedNestExampleVisualizationCoverageV3SchemaBytes()).toBe(
      raw('docs/audit/nest-example-coverage.v3.schema.json'),
    );
    expect(generatedNestExampleVisualizationOracleV1SchemaBytes()).toBe(
      raw('docs/audit/nest-example-visualization-oracle.v1.schema.json'),
    );
    expect(nestExampleVisualizationOracleDigest(oracle)).toBe(
      PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_DIGEST,
    );
    expect(sha256DigestBytes(Buffer.from(oracleRaw))).toBe(
      PINNED_NEST_EXAMPLE_VISUALIZATION_ORACLE_ARTIFACT_SHA256,
    );
    expect(nestExampleVisualizationCoverageV3Digest(coverage)).toBe(
      PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_V3_DIGEST,
    );
    const packageManifest = json<JsonRecord>('package.json');
    expect(packageManifest.scripts['check:nest-audit']).not.toMatch(/\bpython(?:3)?\b/u);
    expect(packageManifest.scripts['check:nest-oracle-python']).toContain('python -I -S -B');
  });

  it('keeps V2 immutable and changes exactly the oracle-derived 35-row union', () => {
    const immutableAuthorities = new Map([
      [
        'docs/audit/nest-example-coverage.v2.json',
        'sha256:f640d39b8394ec108065092c5e95c9692d5fcd07ec1f91fb5cb3870b518fc535',
      ],
      [
        'docs/audit/nest-example-coverage.v2.schema.json',
        'sha256:e62b5bab159dcc5922e325e931a2845dff39da52bfeb6dca78f12460f9d06f4a',
      ],
      [
        'scripts/lib/nest-example-visualization-coverage.ts',
        'sha256:4baf15ca72bdb14bf69c8f714af8a4b2d978d7b8f7fefef5b0bdf1d9b4405a68',
      ],
      [
        'scripts/generate-nest-example-visualization-coverage.ts',
        'sha256:229674bb397d0160d147271b34ac6d7015f48b41231c94beea8cb20ef5f3f1b6',
      ],
    ]);
    for (const [relativePath, digest] of immutableAuthorities) {
      expect(sha256DigestBytes(readFileSync(path.join(ROOT, relativePath))), relativePath).toBe(
        digest,
      );
    }

    const predecessorRows = new Map(
      (predecessor.canonicalExamples as JsonRecord[]).map((row) => [row.path as string, row]),
    );
    const v3Rows = coverage.canonicalExamples as JsonRecord[];
    const expectedRows = new Map(
      (oracle.expectedCanonicalProjections as JsonRecord[]).map((row) => [row.path as string, row]),
    );
    const changed = v3Rows.filter((row) =>
      canonicalize(projection(row) as never)
      !== canonicalize(projection(predecessorRows.get(row.path) ?? {}) as never));

    expect(v3Rows).toHaveLength(98);
    expect(changed).toHaveLength(35);
    expect(v3Rows.length - changed.length).toBe(63);
    expect(changed.map(({ path: sourcePath }) => sourcePath).sort()).toEqual(
      [...expectedRows.values()]
        .filter(({ classification }) => classification === 'corrected')
        .map(({ path: sourcePath }) => sourcePath)
        .sort(),
    );
    expect(oracle.correctionEvidence).toHaveLength(35);
    expect((oracle.correctionEvidence as JsonRecord[]).map(({ path: sourcePath }) => sourcePath))
      .toEqual(changed.map(({ path: sourcePath }) => sourcePath).sort());
    for (const evidence of oracle.correctionEvidence as JsonRecord[]) {
      expect(evidence.categories).toEqual(
        (evidence.astEvidence as JsonRecord[]).map(({ kind }) => kind),
      );
      expect((evidence.astEvidence as JsonRecord[]).every(
        ({ lineAnchors }) => Array.isArray(lineAnchors) && lineAnchors.length > 0,
      )).toBe(true);
    }
    for (const row of v3Rows) {
      expect(projection(row), row.path).toEqual(projection(expectedRows.get(row.path) ?? {}));
    }
  });

  it('binds raster-helper call sites and keeps active-sender normalization distinct', () => {
    const profiles = oracle.derivedPathSets.rasterPlotFromDeviceCallProfiles as JsonRecord[];
    const paths = oracle.derivedPathSets.rasterPlotFromDevicePaths as string[];
    const rows = new Map(
      (coverage.canonicalExamples as JsonRecord[]).map((row) => [row.path as string, row]),
    );
    expect(paths).toHaveLength(9);
    expect(profiles.map(({ path: sourcePath }) => sourcePath)).toEqual(paths);
    expect(profiles.filter(({ histogramArgument }) => histogramArgument === 'literal_true'))
      .toHaveLength(8);
    expect(profiles.filter(
      ({ histogramBinWidthMsLiteralValue }) => histogramBinWidthMsLiteralValue === '100.0',
    ).map(({ path: sourcePath }) => sourcePath)).toEqual([
      'pynest/examples/repeated_stimulation.py',
    ]);
    expect(profiles.find(({ histogramArgument }) => histogramArgument === 'helper_default_true'))
      .toMatchObject({ path: 'pynest/examples/sonata_example/sonata_network.py' });
    for (const sourcePath of paths) {
      const row = rows.get(sourcePath);
      expect(row, sourcePath).toBeDefined();
      expect(row?.semanticDemands, sourcePath).toContain('active_sender_normalized_rate');
      expect(row?.semanticDemands, sourcePath).toContain('spike_raster');
      expect(row?.presentationDemands, sourcePath).toContain('cross_capability_bundle');
      expect(row?.presentationDemands, sourcePath).toContain('multi_panel');
      expect(row?.visualOperations, sourcePath).toContain('histogram');
      expect(row?.visualOperations, sourcePath).toContain('raster');
      expect(row?.semanticDemands, sourcePath).not.toContain('population_rate');
      expect(row?.presentationDemands, sourcePath).not.toContain('single_panel');
    }
  });

  it('represents source meaning without inventing phase-plane or mixed-dimension semantics', () => {
    const rows = new Map(
      (coverage.canonicalExamples as JsonRecord[]).map((row) => [row.path as string, row]),
    );
    expect(rows.get('pynest/examples/hh_psc_alpha.py')).toMatchObject({
      semanticDemands: ['response_curve'],
      presentationDemands: ['single_panel'],
      visualOperations: ['line'],
    });
    const intrinsic = rows.get('pynest/examples/intrinsic_currents_subthreshold.py');
    expect(intrinsic?.semanticDemands).toEqual(['multisignal_trace']);
    expect(intrinsic?.presentationDemands).toEqual([
      'dual_y_axis',
      'same_axis_overlay',
      'single_panel',
    ]);
    expect(intrinsic?.visualOperations).toEqual(['line']);
    expect(intrinsic?.presentationDemands)
      .not.toContain('cross_capability_bundle');
    expect(SEMANTIC_DEMAND_IDS_V3).not.toContain('mixed_dimension_trace_bundle');

    const trajectory = (coverage.semanticDemandDefinitions as JsonRecord[])
      .find(({ id }) => id === 'trajectory_2d');
    expect(trajectory).toMatchObject({
      stableRepresentability: { state: 'no_stable_candidate', skillCandidates: [] },
      renderer: { state: 'none', rendererCandidates: [] },
    });
    expect(trajectory?.notes).toContain('not model-state dynamics');
  });

  it('separates the computed IF surface and proves its configured-population denominator', () => {
    expect(coverage.computedNonvisualOutputs).toEqual(oracle.computedNonvisualOutputs);
    expect(coverage.computedNonvisualOutputs).toEqual([
      expect.objectContaining({
        path: 'pynest/examples/if_curve.py',
        carrier: 'IF_curve.rate',
        value: 'configured_complete_population_mean_firing_rate_hz',
        denominator: 'configured_self_n_neurons_times_self_t_sim_ms',
        denominatorMeaning:
          'all_neurons_created_for_each_trial_not_only_senders_with_recorded_events',
        normalizationFormula:
          'n_events * 1000.0 / (1.0 * self.n_neurons * self.t_sim)',
        populationConnection:
          'nest.Connect(self.neuron,self.spike_recorder,all_to_all)',
        trialOrder: 'fresh_build_then_connect_then_simulate_then_read_n_events',
        coverageDenominator: 'separate_nonvisual_computed_output_not_a_visualization_body',
      }),
    ]);
    expect(coverage.summary.computedNonvisualOutputCount).toBe(1);
    expect(
      (coverage.canonicalExamples as JsonRecord[])
        .find(({ path: sourcePath }) => sourcePath === 'pynest/examples/if_curve.py'),
    ).toMatchObject({ visualizationStatus: 'no_visualization_operation' });
  });

  it('closes the corrected spatial, axis, trajectory, and aggregate denominators', () => {
    expect(oracle.derivedPathSets.rasterPlotFromDevicePaths).toHaveLength(9);
    expect(oracle.derivedPathSets.sharedXAxisPaths).toHaveLength(14);
    expect(oracle.derivedPathSets.sharedYAxisPaths).toHaveLength(6);
    expect(oracle.derivedPathSets.spatialReviewedPaths).toHaveLength(12);
    expect(oracle.derivedPathSets.spatialNeighborhoodMembershipPaths).toHaveLength(8);
    expect(oracle.derivedPathSets.spatialNodeMapPaths).toHaveLength(4);
    expect(oracle.derivedPathSets.spatialProbabilityFieldPaths).toHaveLength(1);
    expect(oracle.derivedPathSets.spatialMaskPaths).toHaveLength(6);
    expect(oracle.derivedPathSets.trajectory2dPaths).toHaveLength(2);
    expect(oracle.derivedPathSets.spatial2dCallProfiles).toHaveLength(12);
    expect((oracle.derivedPathSets.spatial2dCallProfiles as JsonRecord[]).every(
      ({ dimension, constructorLineAnchors, consumerLineAnchors, helperBranch }) =>
        dimension === 2
        && helperBranch === 'reviewed_2d_constructor_and_helper_branch_syntax'
        && Array.isArray(constructorLineAnchors)
        && constructorLineAnchors.length > 0
        && Array.isArray(consumerLineAnchors)
        && consumerLineAnchors.length > 0,
    )).toBe(true);
    expect(oracle.derivedPathSets.trajectory2dCallProfiles).toHaveLength(2);
    expect((oracle.derivedPathSets.trajectory2dCallProfiles as JsonRecord[]).every(
      ({ carrier, dimension, sourceLineAnchors }) =>
        carrier === 'two_component_readout_and_target_output_coordinates'
        && dimension === 2
        && Array.isArray(sourceLineAnchors)
        && sourceLineAnchors.length > 0,
    )).toBe(true);
    expect(coverage.summary.canonicalAggregateProjection).toEqual({
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
    expect((oracle.limitations as string[]).join(' ')).toContain(
      'not a complete Python alias, reflection, mutation, or control-flow proof',
    );
    expect((coverage.limitations as string[]).join(' ')).toContain(
      'not a complete Python alias, reflection, mutation, or control-flow proof',
    );
  });

  it('fails closed under property-generated projection and aggregate mutations', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 97 }),
      fc.constantFrom('semanticDemands', 'presentationDemands', 'visualOperations'),
      (index, field) => {
        const candidate = structuredClone(coverage) as JsonRecord;
        const row = candidate.canonicalExamples[index] as JsonRecord;
        const values = row[field] as string[];
        row[field] = values.length > 0 ? values.slice(1) : ['not_in_closed_vocabulary'];
        candidate.semanticBinding.semanticDigest =
          nestExampleVisualizationCoverageV3Digest(candidate);
        expect(validateCoverage(candidate).length).toBeGreaterThan(0);
      },
    ), { numRuns: 40 });

    const candidate = structuredClone(oracle) as JsonRecord;
    delete candidate.summary.aggregateExpectations.histogramOperationCount;
    candidate.semanticBinding.semanticDigest = nestExampleVisualizationOracleDigest(candidate);
    expect(validateOracle(candidate).some((problem) => problem.includes('authority failed'))).toBe(
      true,
    );
    expect(() => buildNestExampleVisualizationCoverageV3(
      sourceInventory,
      documentationInventory,
      predecessor,
      candidate,
    )).toThrow(/oracle semantic authority drifted/u);
  }, 20_000);

  it('rejects noncanonical bytes and stale exact dependencies at the generator boundary', () => {
    expect(validateOracle(oracle, ` ${oracleRaw}`)).toContain(
      'oracle-v1 artifact bytes are not exact canonical JSON plus one newline',
    );
    expect(validateCoverage(coverage, `${coverageRaw}\n`)).toContain(
      'coverage-v3 artifact bytes are not exact canonical JSON plus one newline',
    );

    const repository = realpathSync(
      mkdtempSync(path.join(tmpdir(), 'cortexel-v3-boundary-')),
    );
    try {
      const copied = copyFixtureFiles(repository);
      expect(copied).toHaveLength(8);
      expect(generatedNestExampleVisualizationCoverageV3Bytes(repository)).toBe(coverageRaw);

      const inventoryPath = path.join(
        repository,
        'docs/audit/nest-example-source-inventory.v2.json',
      );
      writeFileSync(inventoryPath, Buffer.concat([readFileSync(inventoryPath), Buffer.from('\n')]));
      expect(() => generatedNestExampleVisualizationCoverageV3Bytes(repository)).toThrow(
        /exact artifact byte authority drifted/u,
      );

      writeFileSync(inventoryPath, readFileSync(path.join(
        ROOT,
        'docs/audit/nest-example-source-inventory.v2.json',
      )));

      const oraclePath = path.join(
        repository,
        'docs/audit/nest-example-visualization-oracle.v1.json',
      );
      writeFileSync(oraclePath, Buffer.concat([readFileSync(oraclePath), Buffer.from('\n')]));
      expect(() => generatedNestExampleVisualizationCoverageV3Bytes(repository)).toThrow(
        /exact artifact byte authority drifted/u,
      );

      writeFileSync(oraclePath, readFileSync(path.join(
        ROOT,
        'docs/audit/nest-example-visualization-oracle.v1.json',
      )));
      const generatorPath = path.join(
        repository,
        'scripts/generate-nest-example-visualization-oracle.py',
      );
      const generatorBytes = readFileSync(generatorPath);
      generatorBytes[0] = generatorBytes[0]! ^ 1;
      writeFileSync(generatorPath, generatorBytes);
      expect(() => generatedNestExampleVisualizationCoverageV3Bytes(repository)).toThrow(
        /exact reviewed authority bytes drifted/u,
      );
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
