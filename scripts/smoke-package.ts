// Verify the artifact consumers actually install, not just source imports.
// Runs in an isolated temp project: core first with only normal dependencies,
// then every React subpath after installing the documented optional peers.

import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  CORTEXEL_SKILL_VERSION,
  PARAM_CONSTRAINT_LANGUAGE,
} from '../core/skills/registry';
import { NEST_SKILL_IDS } from '../core/skills/skillIds';
import { CORTEXEL_SPEC_VERSION } from '../core/vizSpec';
import { serializeManifest } from './emit-manifest';

const root = resolve(import.meta.dirname, '..');
const temp = mkdtempSync(join(tmpdir(), 'cortexel-package-smoke-'));
const packDir = join(temp, 'pack');
const consumer = join(temp, 'consumer');

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

const runtimeAnalysisProbe = `
  const inclusiveLeft = core.spikeTrialsToPsthParams(
    [{ times: [19.9], senders: [1] }],
    {
      alignmentTimesMs: [20],
      windowMs: [-0.1, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'package smoke',
    },
  );
  const exclusiveRight = core.spikeTrialsToPsthParams(
    [{ times: [0.3], senders: [1] }],
    {
      alignmentTimesMs: [0.2],
      windowMs: [0, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'package smoke',
    },
  );
  const highIndex = core.spikeRecorderToPopulationRateParams(
    { times: [49998.99999], senders: [1] },
    {
      startMs: 0,
      stopMs: 50000,
      binWidthMs: 1,
      populations: [{ id: 'E', label: 'E', senderIds: [1] }],
      unassignedPolicy: 'reject',
    },
  );
  if (!inclusiveLeft.ok || inclusiveLeft.params.values[0] !== 1 ||
      !exclusiveRight.ok || exclusiveRight.params.values[0] !== 0 ||
      !highIndex.ok || highIndex.params.series[0].spike_counts[49998] !== 1 ||
      highIndex.params.series[0].spike_counts[49999] !== 0) {
    throw new Error('packed analysis boundary semantics are incorrect');
  }
`;

const runtimeTopologyProbe = `
  const scalarSnapshot = core.normalizeSynapseCollectionSnapshot({
    source: 1,
    target: 3,
    weight: 0,
    delay: 1.5,
    target_thread: 0,
    synapse_id: 7,
    port: 0,
  });
  const snapshot = {
    source: [1, 1, 2],
    target: [3, 3, 4],
    weight: [2, -2, 0],
    delay: [1, 2, 3],
  };
  const common = {
    sourceIds: [1, 2],
    targetIds: [3, 4],
    snapshotTimeMs: 0,
    snapshotScope: { kind: 'single_process_complete' },
  };
  const adjacency = core.synapseCollectionToAdjacencyMatrixParams(snapshot, common);
  const graph = core.synapseCollectionToConnectionGraphParams(snapshot, {
    ...common,
    weightUnits: 'pA',
    delayUnits: 'ms',
    samplePolicy: { kind: 'complete' },
  });
  const weights = core.synapseCollectionToWeightMatrixParams(snapshot, {
    ...common,
    weightUnits: 'pA',
    aggregation: 'sum',
  });
  const delays = core.synapseCollectionToDelayMatrixParams(snapshot, {
    ...common,
    delayUnits: 'ms',
    aggregation: 'mean',
  });
  const localInDegree = core.synapseCollectionToInDegreeDistributionParams(snapshot, {
    ...common,
    snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    normalization: 'count',
  });
  const localOutDegree = core.synapseCollectionToOutDegreeDistributionParams(snapshot, {
    ...common,
    snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    normalization: 'count',
  });
  const delayDistribution = core.synapseCollectionToDelayDistributionParams(snapshot, {
    ...common,
    delayUnits: 'ms',
    binWidthMs: 1,
    windowStartMs: 1,
    windowStopMs: 4,
    normalization: 'count',
  });
  const spatial = core.getPositionToSpatialMap2DParams(
    [[-5, 0], [5, 0]],
    {
      nodeIds: [1, 2],
      coordinateUnits: 'µm',
      extent: [10, 4],
      center: [0, 0],
      edgeWrap: false,
      positionScope: { kind: 'single_process_complete' },
    },
  );
  const largeOrigin = 1e9;
  const preciseDelay = core.synapseCollectionToDelayDistributionParams(
    { source: [1], target: [2], delay: [largeOrigin + 1 - 1e-6] },
    {
      sourceIds: [1],
      targetIds: [2],
      snapshotTimeMs: 0,
      snapshotScope: { kind: 'single_process_complete' },
      delayUnits: 'ms',
      binWidthMs: 1,
      windowStartMs: largeOrigin,
      windowStopMs: largeOrigin + 2,
      normalization: 'count',
    },
  );
  const meanUnderflow = core.synapseCollectionToWeightMatrixParams(
    { source: [1, 1], target: [3, 3], weight: [-5e-324, 0] },
    { ...common, weightUnits: 'pA', aggregation: 'mean' },
  );
  const densityOverflow = core.synapseCollectionToDelayDistributionParams(
    { source: [1, 1], target: [3, 3], delay: [1, 2] },
    {
      ...common,
      delayUnits: 'ms',
      binWidthMs: Number.MAX_VALUE,
      windowStartMs: 0,
      windowStopMs: Number.MAX_VALUE,
      normalization: 'probability_density',
    },
  );
  const spatialDrift = core.getPositionToSpatialMap2DParams(
    [[1e15 + 0.75, 1e15]],
    {
      nodeIds: [1], coordinateUnits: 'mm', extent: [1, 1], center: [1e15, 1e15],
      edgeWrap: false, positionScope: { kind: 'single_process_complete' },
    },
  );
  const falseIdentity = graph.ok
    ? core.ConnectionGraphParamsSchema.safeParse({
        ...graph.params,
        edges: [{ ...graph.params.edges[0], id: 'not-a-canonical-id' }, ...graph.params.edges.slice(1)],
      }).success
    : true;
  if (!scalarSnapshot.ok || scalarSnapshot.params.weights?.[0] !== 0 ||
      !adjacency.ok || adjacency.params.connection_count !== 3 ||
      adjacency.params.cells[0].connection_count !== 2 ||
      !graph.ok || graph.params.edges.length !== 3 ||
      graph.params.edge_identity !== 'canonical_sorted_ordinal' ||
      !weights.ok || weights.params.cells[0].value !== 0 ||
      weights.params.cells[0].connection_count !== 2 ||
      !delays.ok || delays.params.cells[0].value !== 1.5 ||
      !localInDegree.ok || localInDegree.params.connection_count !== 3 ||
      localOutDegree.ok || !delayDistribution.ok ||
      delayDistribution.params.delay_counts.join(',') !== '1,1,1' ||
      !spatial.ok || spatial.params.nodes.length !== 2 ||
      !preciseDelay.ok || preciseDelay.params.delay_counts.join(',') !== '1,0' ||
      meanUnderflow.ok || densityOverflow.ok || spatialDrift.ok || falseIdentity) {
    throw new Error('packed topology normalization or transform semantics are incorrect');
  }
`;

const runtimeManifestTopologyProbe = `
  for (const skill of manifest.skills) {
    if (skill.transform && typeof core[skill.transform.id] !== 'function') {
      throw new Error(\`manifest transform \${skill.transform.id} is not a packed core export\`);
    }
  }
  if (JSON.stringify(core.ROUTING_DISCRIMINATORS) !==
      JSON.stringify(manifest.routingDiscriminators)) {
    throw new Error('packed routing discriminators differ from the manifest');
  }
`;

try {
  mkdirSync(packDir);
  mkdirSync(consumer);
  const packed = JSON.parse(
    run(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir],
      root,
    ),
  ) as Array<{ filename: string }>;
  const tarball = join(packDir, packed[0].filename);

  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'cortexel-smoke-consumer', private: true, type: 'module' }),
  );
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
    consumer,
  );

  run(
    'node',
    [
      '--input-type=module',
      '-e',
      `
        const root = await import('cortexel');
        const core = await import('cortexel/core');
        const manifest = (await import('cortexel/skills.manifest.json', {
          with: { type: 'json' },
        })).default;
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('ESM core exports are incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
      `,
    ],
    consumer,
  );
  run(
    'node',
    [
      '-e',
      `
        const root = require('cortexel');
        const core = require('cortexel/core');
        const manifest = require('cortexel/skills.manifest.json');
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('CJS core exports are incomplete');
        }
        if (!Array.isArray(manifest.skills) || manifest.skills.length !== ${NEST_SKILL_IDS.length} ||
            manifest.manifestVersion !== '8' ||
            manifest.paramConstraintLanguage?.version !== ${JSON.stringify(PARAM_CONSTRAINT_LANGUAGE.version)} ||
            manifest.skillAxisVersion !== ${JSON.stringify(CORTEXEL_SKILL_VERSION)} ||
            manifest.specVersion !== ${JSON.stringify(CORTEXEL_SPEC_VERSION)} ||
            manifest.routingDiscriminators?.get_connections?.weight_matrix !== 'nest.weight_matrix' ||
            manifest.skills.find((skill) => skill.id === 'nest.connection_graph')?.transform?.id !==
              'synapseCollectionToConnectionGraphParams' ||
            manifest.skills.find((skill) => skill.id === 'nest.connectivity_matrix')?.deprecation?.replacement !==
              'nest.connection_graph') {
          throw new Error('manifest export is missing or incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
      `,
    ],
    consumer,
  );

  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      'react@^19',
      'react-dom@^19',
      'typescript@^5.9',
      '@types/node@^20',
      '@types/react@^19',
      '@types/react-dom@^19',
    ],
    consumer,
  );

  // The canonical chart subpath is intentionally React + SVG only. Exercise it
  // before installing three/r3f/d3 so an accidental heavyweight import fails.
  for (const mode of ['import', 'require'] as const) {
    const expression = mode === 'import'
      ? `
          const charts = await import('cortexel/react/charts');
          if (typeof charts.ReferenceVizSpecFigure !== 'function' ||
              typeof charts.ReferenceChartScene !== 'function' ||
              typeof charts.binnedStepPath !== 'function' ||
              typeof charts.boundedStemPointPaths !== 'function' ||
              typeof charts.matrixValueBucketPaths !== 'function' ||
              typeof charts.circleTopologyGeometry !== 'function' ||
              typeof charts.equalAspectDomains !== 'function' ||
              charts.REFERENCE_CHART_SKILLS?.length !== 19 ||
              !charts.REFERENCE_CHART_SKILLS.includes('nest.spatial_map_2d')) {
            throw new Error('ESM chart exports are incomplete');
          }
        `
      : `
          const charts = require('cortexel/react/charts');
          if (typeof charts.ReferenceVizSpecFigure !== 'function' ||
              typeof charts.ReferenceChartScene !== 'function' ||
              typeof charts.binnedStepPath !== 'function' ||
              typeof charts.boundedStemPointPaths !== 'function' ||
              typeof charts.matrixValueBucketPaths !== 'function' ||
              typeof charts.circleTopologyGeometry !== 'function' ||
              typeof charts.equalAspectDomains !== 'function' ||
              charts.REFERENCE_CHART_SKILLS?.length !== 19 ||
              !charts.REFERENCE_CHART_SKILLS.includes('nest.spatial_map_2d')) {
            throw new Error('CJS chart exports are incomplete');
          }
        `;
    run(
      'node',
      mode === 'import'
        ? ['--input-type=module', '-e', expression]
        : ['-e', expression],
      consumer,
    );
  }

  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      'three@>=0.184 <0.186',
      '@react-three/fiber@^9.6',
      'd3-force-3d@^3.0.5',
      '@types/three@^0.185',
    ],
    consumer,
  );

  for (const mode of ['import', 'require'] as const) {
    const expression =
      mode === 'import'
        ? `
            const react = await import('cortexel/react');
            const graph = await import('cortexel/react/knowledge-graph');
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function' ||
                typeof graph.KnowledgeGraphLegend !== 'function') {
              throw new Error('ESM React exports are incomplete');
            }
          `
        : `
            const react = require('cortexel/react');
            const graph = require('cortexel/react/knowledge-graph');
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function' ||
                typeof graph.KnowledgeGraphLegend !== 'function') {
              throw new Error('CJS React exports are incomplete');
            }
          `;
    run(
      'node',
      mode === 'import'
        ? ['--input-type=module', '-e', expression]
        : ['-e', expression],
      consumer,
    );
  }

  // Prove the published conditional declarations work in a real consumer, not
  // only under Cortexel's source tsconfig. .ts selects import types; .cts selects
  // require types under NodeNext.
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        jsx: 'react-jsx',
        types: ['node'],
      },
      include: ['consumer.ts', 'consumer.cts'],
    }),
  );
  writeFileSync(
    join(consumer, 'consumer.ts'),
    `
      import { buildVizSpec } from 'cortexel';
      import {
        correlationDetectorToCorrelogramParams,
        ROUTING_DISCRIMINATORS,
        getPositionToSpatialMap2DParams,
        normalizeSynapseCollectionSnapshot,
        spikeRecorderToIsiParams,
        spikeRecorderToPopulationRateParams,
        spikeTrialsToPsthParams,
        synapseCollectionToAdjacencyMatrixParams,
        synapseCollectionToConnectionGraphParams,
        synapseCollectionToDelayDistributionParams,
        synapseCollectionToDelayMatrixParams,
        synapseCollectionToInDegreeDistributionParams,
        synapseCollectionToOutDegreeDistributionParams,
        synapseCollectionToWeightMatrixParams,
        validateHostRendererSpec,
        type ConnectionGraphOptions,
        type DelayDistributionOptions,
        type NestTopologyResult,
        type SpatialMap2DOptions,
        type WeightMatrixParams,
      } from 'cortexel/core';
      import {
        NeuronA11yPager,
        PopulationA11yList,
        VizSpecRenderer,
        type RenderSceneArgs,
      } from 'cortexel/react';
      import {
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
        KnowledgeGraphLegend,
      } from 'cortexel/react/knowledge-graph';
      import {
        ReferenceVizSpecFigure,
        aggregateDegreeBins,
        aggregateUniformHistogramBins,
        binnedStepPath,
        boundedStemPointPaths,
        circleTopologyGeometry,
        equalAspectDomains,
        matrixValueBucketPaths,
      } from 'cortexel/react/charts';

      const authored = buildVizSpec({
        skill: 'nest.spike_raster',
        params: { times_ms: [1], senders: [1] },
        source: 'type-smoke',
      });
      const args = {} as RenderSceneArgs;
      const graphOptions = {} as ConnectionGraphOptions;
      const delayOptions = {} as DelayDistributionOptions;
      const spatialOptions = {} as SpatialMap2DOptions;
      const topologyResult = {} as NestTopologyResult<WeightMatrixParams>;
      void [
        authored,
        args.skill,
        validateHostRendererSpec,
        spikeRecorderToIsiParams,
        spikeTrialsToPsthParams,
        spikeRecorderToPopulationRateParams,
        correlationDetectorToCorrelogramParams,
        ROUTING_DISCRIMINATORS,
        graphOptions,
        delayOptions,
        spatialOptions,
        topologyResult,
        normalizeSynapseCollectionSnapshot,
        synapseCollectionToConnectionGraphParams,
        synapseCollectionToAdjacencyMatrixParams,
        synapseCollectionToWeightMatrixParams,
        synapseCollectionToDelayMatrixParams,
        synapseCollectionToInDegreeDistributionParams,
        synapseCollectionToOutDegreeDistributionParams,
        synapseCollectionToDelayDistributionParams,
        getPositionToSpatialMap2DParams,
        VizSpecRenderer,
        PopulationA11yList,
        NeuronA11yPager,
        ReferenceVizSpecFigure,
        binnedStepPath,
        boundedStemPointPaths,
        matrixValueBucketPaths,
        circleTopologyGeometry,
        aggregateDegreeBins,
        aggregateUniformHistogramBins,
        equalAspectDomains,
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
        KnowledgeGraphLegend,
      ];
    `,
  );
  writeFileSync(
    join(consumer, 'consumer.cts'),
    `
      import cortexel = require('cortexel');
      import core = require('cortexel/core');
      import react = require('cortexel/react');
      import charts = require('cortexel/react/charts');
      import graph = require('cortexel/react/knowledge-graph');
      const build: typeof cortexel.buildVizSpec = core.buildVizSpec;
      const graphOptions = {} as core.ConnectionGraphOptions;
      const delayOptions = {} as core.DelayDistributionOptions;
      const spatialOptions = {} as core.SpatialMap2DOptions;
      const topologyResult = {} as core.NestTopologyResult<core.WeightMatrixParams>;
      void [
        build,
        core.ROUTING_DISCRIMINATORS,
        graphOptions,
        delayOptions,
        spatialOptions,
        topologyResult,
        core.spikeRecorderToIsiParams,
        core.spikeTrialsToPsthParams,
        core.spikeRecorderToPopulationRateParams,
        core.correlationDetectorToCorrelogramParams,
        core.normalizeSynapseCollectionSnapshot,
        core.synapseCollectionToConnectionGraphParams,
        core.synapseCollectionToAdjacencyMatrixParams,
        core.synapseCollectionToWeightMatrixParams,
        core.synapseCollectionToDelayMatrixParams,
        core.synapseCollectionToInDegreeDistributionParams,
        core.synapseCollectionToOutDegreeDistributionParams,
        core.synapseCollectionToDelayDistributionParams,
        core.getPositionToSpatialMap2DParams,
        react.VizSpecRenderer,
        charts.ReferenceVizSpecFigure,
        charts.binnedStepPath,
        charts.boundedStemPointPaths,
        charts.matrixValueBucketPaths,
        charts.circleTopologyGeometry,
        charts.aggregateDegreeBins,
        charts.aggregateUniformHistogramBins,
        charts.equalAspectDomains,
        graph.KnowledgeGraph3DScene,
        graph.KnowledgeGraphLegend,
      ];
    `,
  );
  run(join(consumer, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.json'], consumer);

  // Guard that the packed manifest is the exact deterministic artifact emitted
  // by this source tree, not merely a version-compatible stale file.
  const installedManifest = readFileSync(
    join(consumer, 'node_modules/cortexel/dist/skills.manifest.json'),
    'utf8',
  );
  if (installedManifest !== serializeManifest()) {
    throw new Error('packed skills manifest differs from the deterministic source emit');
  }
  const packageJson = JSON.parse(
    readFileSync(join(consumer, 'node_modules/cortexel/package.json'), 'utf8'),
  ) as { version: string };
  console.log(`[cortexel] package smoke passed for ${packageJson.version}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
