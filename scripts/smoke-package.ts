// Verify the artifact consumers actually install, not just source imports.
// Runs in an isolated temp project: core first with only normal dependencies,
// then every React subpath after installing the documented optional peers.

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  CORTEXEL_SKILL_VERSION,
  PARAM_CONSTRAINT_LANGUAGE,
} from '../core/skills/registry';
import { NEST_SKILL_IDS } from '../core/skills/skillIds';
import { CORTEXEL_SPEC_VERSION } from '../core/vizSpec';
import { serializeManifest } from './emit-manifest';
import { packagedContractRelativeFiles } from './lib/contract-package';

const root = resolve(import.meta.dirname, '..');
const temp = mkdtempSync(join(tmpdir(), 'cortexel-package-smoke-'));
const packDir = join(temp, 'pack');
const consumer = join(temp, 'consumer');
const unrelated = join(temp, 'unrelated-working-directory');

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    timeout: 5 * 60_000,
  }).trim();
}

function runResult(command: string, args: string[], cwd: string): {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
} {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5 * 60_000,
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// npm still resolves omitted peers into its ideal tree. For a package with optional
// React/R3F peers that can traverse the React Native and Expo graphs before the
// core-only probe even starts. Ignore peers during installation here because each
// documented peer set is installed explicitly below and then exercised at runtime
// and through NodeNext declarations.
const NPM_INSTALL_FLAGS = [
  'install',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
  '--no-package-lock',
  '--legacy-peer-deps',
] as const;

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

const runtimeFigureContractProbe = `
  const renderSvgExportNames = Object.keys(renderSvg).sort();
  const expectedRenderSvgExportNames = [
    'buildFigure',
    'buildFigureFromJson',
    'buildFigureFromValidated',
  ];
  if (JSON.stringify(renderSvgExportNames) !== JSON.stringify(expectedRenderSvgExportNames)) {
    throw new Error('packed render-svg entry exposes raw plan or serializer authority: ' +
      JSON.stringify(renderSvgExportNames));
  }

  const identity = figure.getBuildIdentity();
  if (identity.requestContract !== 'cortexel-figure-request/1.0' ||
      identity.artifactContract !== 'cortexel-figure-artifact/1.0' ||
      identity.sourceRevision !== 'unreleased-worktree' || identity.release !== false ||
      identity.contractDigest !== contractManifest.contractDigest ||
      identity.catalogDigest !== contractManifest.catalogDigest ||
      identity.stableSkillCount !== contractManifest.stableSkillCount) {
    throw new Error('packed FigureRequest identity is incoherent');
  }

  const inventory = [];
  const stableSkillSources = [];
  for (const record of contractManifest.normativeSources) {
    if (!record.path.startsWith('contract/')) throw new Error('unsafe contract inventory path');
    const relative = record.path.slice('contract/'.length);
    if (relative.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error('unsafe contract inventory segment');
    }
    const value = JSON.parse(readFileSync(join(contractRoot, relative), 'utf8'));
    const digest = figure.sha256Digest(figure.canonicalize(value));
    if (digest !== record.digest) throw new Error('shipped contract file digest mismatch: ' + relative);
    inventory.push({ path: record.path, digest });
    if (relative.startsWith('skills/') && value.status === 'stable') stableSkillSources.push(value);
  }
  if (figure.sha256Digest(figure.canonicalize(inventory)) !== contractManifest.contractDigest) {
    throw new Error('shipped contract inventory does not reproduce contractDigest');
  }
  stableSkillSources.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  const catalogView = stableSkillSources.map((skill) => ({
    id: skill.id, revision: skill.revision, renderer: skill.renderer,
  }));
  if (figure.sha256Digest(figure.canonicalize(catalogView)) !== contractManifest.catalogDigest) {
    throw new Error('shipped skill bytes do not reproduce catalogDigest');
  }
  if (!contractManifest.stableSkills.every((skill) =>
      skill.availability === 'packaged' && skill.releaseReady === false)) {
    throw new Error('packaged availability was conflated with publication/release readiness');
  }

  const validated = figure.parseAndValidateRequest(JSON.stringify(spikeContract.examples.valid[0]));
  if (!validated.ok || validated.request.skillId !== 'neuro.spike_raster') {
    throw new Error('packed validator cannot validate a shipped living example');
  }
  const renderedValidated = validated.ok
    ? renderSvg.buildFigureFromValidated(validated.request)
    : null;
  if (!renderedValidated?.ok || !renderedValidated.svg.startsWith('<svg')) {
    throw new Error('packed renderer rejected a capability minted by the paired validator');
  }
  const rendered = renderSvg.buildFigure(spikeContract.examples.valid[0]);
  if (!rendered.ok || !rendered.svg.startsWith('<svg')) {
    throw new Error('packed headless renderer cannot render a shipped living example');
  }
  const adapted = nestAdapter.nestSpikeRecorderToRaster(
    {
      record_to: 'memory', time_in_steps: false, origin: 100.25, start: 0.5,
      stop: 10.75, n_events: 1, events: { senders: [1], times: [111] },
    },
    { recordedSenderIds: [1, 2], nestVersion: '3.10.0', runId: 'smoke', recorderId: 'sr' },
  );
  if (!adapted.ok || !figure.validateRequestValue(adapted.request).ok) {
    throw new Error('packed NEST adapter output does not pass the packed validator');
  }
  if (capabilityRegistry.registry !== 'cortexel-capabilities' ||
      requestSchema.$id !== 'https://sepahead.github.io/cortexel/schemas/v1/figure-request.v1.schema.json' ||
      packageMetadata.imports?.['#cortexel-request-capability'] !==
        './dist/internal/request-capability.cjs') {
    throw new Error('packaged registry/schema exports are incomplete');
  }
`;

try {
  mkdirSync(packDir);
  mkdirSync(consumer);
  mkdirSync(unrelated);
  const packed = JSON.parse(
    run(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir],
      root,
    ),
  ) as Array<{ filename: string; files: Array<{ path: string; mode: number }> }>;
  const tarball = join(packDir, packed[0].filename);

  const packedPaths = packed[0].files.map((file) => file.path.replace(/^package\//u, ''));
  for (const file of packed[0].files) {
    const packedPath = file.path.replace(/^package\//u, '');
    const expectedMode = packedPath === 'dist/cli/main.js' ? 0o755 : 0o644;
    if (file.mode !== expectedMode) {
      throw new Error(
        `tarball mode is not deterministic for ${packedPath}: ` +
        `expected ${expectedMode.toString(8)}, received ${file.mode.toString(8)}`,
      );
    }
  }
  const expectedContractFiles = packagedContractRelativeFiles(join(root, 'contract'))
    .map((relative) => `dist/contract/${relative}`);
  const actualContractFiles = packedPaths
    .filter((entry) => entry.startsWith('dist/contract/'))
    .sort();
  if (JSON.stringify(actualContractFiles) !== JSON.stringify(expectedContractFiles.sort())) {
    throw new Error('tarball contract tree differs from the closed normative package inventory');
  }
  const physicalContractManifests = packedPaths.filter(
    (entry) => entry.endsWith('contract/manifest.v1.json'),
  );
  if (physicalContractManifests.length !== 1 ||
      physicalContractManifests[0] !== 'dist/contract/manifest.v1.json') {
    throw new Error('tarball does not contain exactly one physical normative contract copy');
  }
  for (const entry of packedPaths) {
    if (
      /(^|\/)\.env(?:\.|$)/u.test(entry) ||
      /^(?:src|core|react|contract|scripts|test|python)\//u.test(entry)
    ) {
      throw new Error(`tarball contains a source or environment path: ${entry}`);
    }
  }
  if (!packedPaths.includes('package.json')) {
    throw new Error('tarball is missing package.json');
  }
  if (!packedPaths.includes('dist/internal/request-capability.cjs')) {
    throw new Error('tarball is missing the shared request-capability runtime');
  }

  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'cortexel-smoke-consumer', private: true, type: 'module' }),
  );
  run(
    'npm',
    [...NPM_INSTALL_FLAGS, tarball],
    consumer,
  );

  const installedRoot = join(consumer, 'node_modules', 'cortexel');
  for (const requiredNotice of [
    'THIRD_PARTY_NOTICES.md',
    'LICENSES/Apache-2.0.txt',
    'LICENSES/CC0-1.0.txt',
    'LICENSES/Matplotlib.txt',
    'LICENSES/PNNL-cividis.txt',
  ]) {
    if (!existsSync(join(installedRoot, requiredNotice))) {
      throw new Error(`packed package is missing required third-party notice ${requiredNotice}`);
    }
  }
  for (const forbiddenPeer of [
    'react',
    'react-dom',
    'three',
    '@react-three/fiber',
    'd3-force-3d',
  ]) {
    if (existsSync(join(consumer, 'node_modules', forbiddenPeer))) {
      throw new Error(`pure package probe unexpectedly installed optional peer ${forbiddenPeer}`);
    }
  }

  run(
    'node',
    [
      '--input-type=module',
      '-e',
      `
        const root = await import('cortexel');
        const core = await import('cortexel/core');
        const figure = await import('cortexel/figure');
        const renderSvg = await import('cortexel/render-svg');
        const nestAdapter = await import('cortexel/adapters/nest');
        const manifest = (await import('cortexel/skills.manifest.json', {
          with: { type: 'json' },
        })).default;
        const contractManifest = (await import('cortexel/contract/manifest.json', {
          with: { type: 'json' },
        })).default;
        const spikeContract = (await import(
          'cortexel/contract/skills/neuro.spike_raster.v1.json',
          { with: { type: 'json' } },
        )).default;
        const capabilityRegistry = (await import(
          'cortexel/contract/registries/capabilities.v1.json',
          { with: { type: 'json' } },
        )).default;
        const requestSchema = (await import(
          'cortexel/contract/schemas/figure-request.v1.schema.json',
          { with: { type: 'json' } },
        )).default;
        const packageMetadata = (await import('cortexel/package.json', {
          with: { type: 'json' },
        })).default;
        let deepRenderImportBlocked = false;
        try {
          await import('cortexel/dist/render-svg/index.js');
        } catch (error) {
          deepRenderImportBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!deepRenderImportBlocked) {
          throw new Error('ESM package exports did not encapsulate the render implementation');
        }
        const { readFileSync } = await import('node:fs');
        const { dirname, join } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const contractRoot = dirname(fileURLToPath(import.meta.resolve(
          'cortexel/contract/manifest.json',
        )));
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            typeof figure.parseAndValidateRequest !== 'function' ||
            typeof renderSvg.buildFigure !== 'function' ||
            typeof nestAdapter.nestSpikeRecorderToRaster !== 'function' ||
            packageMetadata.name !== 'cortexel' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('ESM core exports are incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
        ${runtimeFigureContractProbe}
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
        const figure = require('cortexel/figure');
        const renderSvg = require('cortexel/render-svg');
        const nestAdapter = require('cortexel/adapters/nest');
        const manifest = require('cortexel/skills.manifest.json');
        const contractManifest = require('cortexel/contract/manifest.json');
        const spikeContract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
        const capabilityRegistry = require('cortexel/contract/registries/capabilities.v1.json');
        const requestSchema = require('cortexel/contract/schemas/figure-request.v1.schema.json');
        const packageMetadata = require('cortexel/package.json');
        let deepRenderRequireBlocked = false;
        try {
          require('cortexel/dist/render-svg/index.cjs');
        } catch (error) {
          deepRenderRequireBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!deepRenderRequireBlocked) {
          throw new Error('CJS package exports did not encapsulate the render implementation');
        }
        const { readFileSync } = require('node:fs');
        const { dirname, join } = require('node:path');
        const contractRoot = dirname(require.resolve('cortexel/contract/manifest.json'));
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            typeof figure.parseAndValidateRequest !== 'function' ||
            typeof renderSvg.buildFigure !== 'function' ||
            typeof nestAdapter.nestSpikeRecorderToRaster !== 'function' ||
            packageMetadata.name !== 'cortexel' ||
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
        ${runtimeFigureContractProbe}
      `,
    ],
    consumer,
  );

  // One process can load either conditional public surface. Every producer/consumer
  // pairing must share the exact private WeakSet, including mixed module formats.
  writeFileSync(
    join(consumer, 'mixed-capability-probe.mjs'),
    `
      import { createRequire } from 'node:module';
      import * as esmFigure from 'cortexel/figure';
      import * as esmRenderer from 'cortexel/render-svg';
      const require = createRequire(import.meta.url);
      const cjsFigure = require('cortexel/figure');
      const cjsRenderer = require('cortexel/render-svg');
      // An export map is API encapsulation, not a sandbox against code already
      // executing in this process: createRequire can deliberately choose a parent
      // inside another package. Even through that unsupported route, the physical
      // singleton must expose only the same validating functions, never membership
      // mutation or the private WeakSet itself.
      const packageScopedRequire = createRequire(require.resolve('cortexel/package.json'));
      const internalCapability = packageScopedRequire('#cortexel-request-capability');
      const expectedInternalExports = [
        'isValidatedRequest',
        'parseAndValidateRequest',
        'validateRequestValue',
      ];
      if (JSON.stringify(Object.keys(internalCapability).sort()) !==
          JSON.stringify(expectedInternalExports) ||
          internalCapability.parseAndValidateRequest !== esmFigure.parseAndValidateRequest ||
          internalCapability.parseAndValidateRequest !== cjsFigure.parseAndValidateRequest) {
        throw new Error('shared request-capability runtime exposes excess authority or split identity');
      }
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const input = JSON.stringify(contract.examples.valid[0]);
      const esmValidated = esmFigure.parseAndValidateRequest(input);
      const cjsValidated = cjsFigure.parseAndValidateRequest(input);
      if (!esmValidated.ok || !cjsValidated.ok) {
        throw new Error('mixed-format probe could not mint validated requests');
      }
      const combinations = [
        ['ESM to ESM', esmRenderer.buildFigureFromValidated(esmValidated.request)],
        ['CJS to CJS', cjsRenderer.buildFigureFromValidated(cjsValidated.request)],
        ['ESM to CJS', cjsRenderer.buildFigureFromValidated(esmValidated.request)],
        ['CJS to ESM', esmRenderer.buildFigureFromValidated(cjsValidated.request)],
      ];
      for (const [label, result] of combinations) {
        if (!result.ok || !result.svg.startsWith('<svg')) {
          throw new Error(label + ' request-capability handoff failed');
        }
      }
      const copiedToken = { ...esmValidated.request };
      const proxiedToken = new Proxy(esmValidated.request, {});
      for (const [label, candidate] of [
        ['copied', copiedToken],
        ['proxied', proxiedToken],
      ]) {
        for (const renderer of [esmRenderer, cjsRenderer]) {
          const result = renderer.buildFigureFromValidated(candidate);
          if (result.ok || result.errors?.[0]?.code !== 'RENDER_UNVALIDATED_REQUEST') {
            throw new Error(label + ' request token forged the private WeakSet capability');
          }
        }
      }
      for (const specifier of [
        'cortexel/internal/request-capability',
        'cortexel/dist/internal/request-capability.cjs',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        try { require(specifier); } catch (error) {
          requireBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('private capability module escaped through package exports: ' + specifier);
        }
      }
      for (const specifier of [
        'cortexel/contract/../internal/request-capability.cjs',
        'cortexel/contract/%2e%2e/internal/request-capability.cjs',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_INVALID_MODULE_SPECIFIER';
        }
        try { require(specifier); } catch (error) {
          requireBlocked = error?.code === 'ERR_INVALID_MODULE_SPECIFIER';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('contract wildcard traversed into the private runtime: ' + specifier);
        }
      }
      let privateImportBlocked = false;
      let privateRequireBlocked = false;
      try { await import('#cortexel-request-capability'); } catch (error) {
        privateImportBlocked = error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED';
      }
      try { require('#cortexel-request-capability'); } catch (error) {
        privateRequireBlocked =
          error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED' || error?.code === 'MODULE_NOT_FOUND';
      }
      if (!privateImportBlocked || !privateRequireBlocked) {
        throw new Error('consumer reached Cortexel package-private import mapping');
      }
    `,
  );
  run('node', [join(consumer, 'mixed-capability-probe.mjs')], consumer);

  // Resolve the package from the probe module, then execute it from a directory with
  // no package.json, node_modules, or contract tree. Validation must locate schemas
  // relative to the installed bundle rather than process.cwd().
  writeFileSync(
    join(consumer, 'unrelated-cwd-probe.mjs'),
    `
      import * as figure from 'cortexel/figure';
      import * as renderSvg from 'cortexel/render-svg';
      import * as nestAdapter from 'cortexel/adapters/nest';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const result = figure.parseAndValidateRequest(JSON.stringify(contract.examples.valid[0]));
      if (!result.ok || typeof renderSvg.buildFigure !== 'function' ||
          typeof nestAdapter.nestSpikeRecorderToRaster !== 'function') {
        throw new Error('ESM validation failed from unrelated cwd');
      }
    `,
  );
  writeFileSync(
    join(consumer, 'unrelated-cwd-probe.cjs'),
    `
      const figure = require('cortexel/figure');
      const renderSvg = require('cortexel/render-svg');
      const nestAdapter = require('cortexel/adapters/nest');
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const result = figure.parseAndValidateRequest(JSON.stringify(contract.examples.valid[0]));
      if (!result.ok || typeof renderSvg.buildFigure !== 'function' ||
          typeof nestAdapter.nestSpikeRecorderToRaster !== 'function') {
        throw new Error('CJS validation failed from unrelated cwd');
      }
    `,
  );
  run('node', [join(consumer, 'unrelated-cwd-probe.mjs')], unrelated);
  run('node', [join(consumer, 'unrelated-cwd-probe.cjs')], unrelated);

  const installedCliEsm = join(installedRoot, 'dist', 'cli', 'main.js');
  const installedCliCjs = join(installedRoot, 'dist', 'cli', 'main.cjs');
  if (!readFileSync(installedCliEsm, 'utf8').startsWith('#!/usr/bin/env node\n')) {
    throw new Error('installed cortexel bin is missing #!/usr/bin/env node');
  }
  const executable = process.platform === 'win32'
    ? join(consumer, 'node_modules', '.bin', 'cortexel.cmd')
    : join(consumer, 'node_modules', '.bin', 'cortexel');
  if (!existsSync(executable)) throw new Error('npm did not install the cortexel bin');
  if (process.platform !== 'win32' && (statSync(executable).mode & 0o111) === 0) {
    throw new Error('installed cortexel bin is not executable');
  }

  writeFileSync(
    join(consumer, 'import-cli.mjs'),
    `await import(${JSON.stringify(pathToFileURL(installedCliEsm).href)});\nprocess.stdout.write('imported\\n');\n`,
  );
  writeFileSync(
    join(consumer, 'import-cli.cjs'),
    `require(${JSON.stringify(installedCliCjs)});\nprocess.stdout.write('imported\\n');\n`,
  );
  for (const importer of ['import-cli.mjs', 'import-cli.cjs']) {
    const imported = runResult('node', [join(consumer, importer)], unrelated);
    if (imported.status !== 0 || imported.stdout !== 'imported\n' || imported.stderr !== '') {
      throw new Error(`packed CLI import guard failed for ${importer}`);
    }
  }

  const identityResult = runResult(executable, ['identity', '--json'], unrelated);
  if (identityResult.status !== 0 || identityResult.stderr !== '') {
    throw new Error('packed CLI identity command failed');
  }
  const cliIdentity = JSON.parse(identityResult.stdout) as Record<string, unknown>;
  const installedContractManifest = JSON.parse(readFileSync(
    join(installedRoot, 'dist', 'contract', 'manifest.v1.json'),
    'utf8',
  )) as Record<string, unknown>;
  const installedPackage = JSON.parse(readFileSync(
    join(installedRoot, 'package.json'),
    'utf8',
  )) as Record<string, unknown>;
  if (installedPackage.main !== './dist/index.cjs') {
    throw new Error('legacy main entry was not retained alongside package exports');
  }
  if (
    cliIdentity.packageVersion !== installedPackage.version ||
    cliIdentity.contractDigest !== installedContractManifest.contractDigest ||
    cliIdentity.catalogDigest !== installedContractManifest.catalogDigest ||
    cliIdentity.sourceRevision !== 'unreleased-worktree' ||
    cliIdentity.release !== false
  ) {
    throw new Error('packed CLI identity differs from shipped package/contract bytes');
  }

  const validRequestPath = join(unrelated, 'valid.json');
  const malformedPath = join(unrelated, 'malformed.json');
  const structuralPath = join(unrelated, 'structural.json');
  const legacyPath = join(unrelated, 'legacy.json');
  const installedSpikeContract = JSON.parse(readFileSync(
    join(installedRoot, 'dist', 'contract', 'skills', 'neuro.spike_raster.v1.json'),
    'utf8',
  )) as { examples: { valid: unknown[] } };
  writeFileSync(validRequestPath, `${JSON.stringify(installedSpikeContract.examples.valid[0])}\n`);
  writeFileSync(malformedPath, '{');
  writeFileSync(structuralPath, '{}\n');
  writeFileSync(
    legacyPath,
    '{"skill":{"id":"nest.voltage_trace"},"data":{},"parameters":{}}\n',
  );
  const cliExitCases: Array<{ args: string[]; expected: number }> = [
    { args: [], expected: 2 },
    { args: ['validate', validRequestPath], expected: 0 },
    { args: ['validate', malformedPath], expected: 3 },
    { args: ['validate', structuralPath], expected: 4 },
    { args: ['migrate', legacyPath], expected: 5 },
    { args: ['validate', join(unrelated, 'absent.json')], expected: 7 },
  ];
  for (const testCase of cliExitCases) {
    const result = runResult(executable, testCase.args, unrelated);
    if (result.status !== testCase.expected) {
      throw new Error(
        `packed CLI exit mismatch: expected ${testCase.expected}, got ${result.status}`,
      );
    }
  }

  run(
    'npm',
    [
      ...NPM_INSTALL_FLAGS,
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
      ...NPM_INSTALL_FLAGS,
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
        getBuildIdentity,
        parseAndValidateRequest,
        type InputAssurance,
        type ValidatedRequest,
      } from 'cortexel/figure';
      import {
        buildFigure,
        buildFigureFromJson,
        buildFigureFromValidated,
        type FigureFailure,
        type FigureResult,
      } from 'cortexel/render-svg';
      import * as renderSvgSurface from 'cortexel/render-svg';
      import {
        nestSpikeRecorderToRaster,
        type NestSpikeExport,
        type NestSpikeOptions,
      } from 'cortexel/adapters/nest';
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
      const checkedRequest = parseAndValidateRequest('{}');
      if (checkedRequest.ok) buildFigureFromValidated(checkedRequest.request);
      const args = {} as RenderSceneArgs;
      const graphOptions = {} as ConnectionGraphOptions;
      const delayOptions = {} as DelayDistributionOptions;
      const spatialOptions = {} as SpatialMap2DOptions;
      const topologyResult = {} as NestTopologyResult<WeightMatrixParams>;
      const assurance = {} as InputAssurance;
      const validatedRequest = {} as ValidatedRequest;
      const figureResult = {} as FigureResult;
      const figureFailure = {} as FigureFailure;
      const nestExport = {} as NestSpikeExport;
      const nestOptions = {} as NestSpikeOptions;
      // @ts-expect-error the raw serializer is intentionally compiler-internal
      void renderSvgSurface.renderSvg;
      // @ts-expect-error resource accounting is intentionally compiler-internal
      void renderSvgSurface.countPlanResources;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatNumber;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatCoordinate;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatWithUnit;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvgSurface.linearScale;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvgSurface.linearTicks;
      // @ts-expect-error callers cannot import a plan-construction grammar
      type ForbiddenRenderPlan = import('cortexel/render-svg').RenderPlanV1;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenPanel = import('cortexel/render-svg').Panel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenMark = import('cortexel/render-svg').Mark;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAxis = import('cortexel/render-svg').Axis;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenTableModel = import('cortexel/render-svg').TableModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAccessibilityModel = import('cortexel/render-svg').AccessibilityModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenDisclosureBlock = import('cortexel/render-svg').DisclosureBlock;
      // @ts-expect-error callers cannot import the raw serializer report
      type ForbiddenSvgReport = import('cortexel/render-svg').SvgReport;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenLinearScale = import('cortexel/render-svg').LinearScale;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenTick = import('cortexel/render-svg').Tick;
      // @ts-expect-error the package export map encapsulates built implementation files
      type ForbiddenDeepRenderModule = typeof import('cortexel/dist/render-svg/index.js');
      // @ts-expect-error the shared capability registry is package-private
      type ForbiddenCapabilityModule = typeof import('cortexel/internal/request-capability');
      // @ts-expect-error package imports do not leak into the consumer package scope
      type ForbiddenPrivateImport = typeof import('#cortexel-request-capability');
      void [
        authored,
        getBuildIdentity,
        parseAndValidateRequest,
        buildFigure,
        buildFigureFromJson,
        buildFigureFromValidated,
        nestSpikeRecorderToRaster,
        assurance,
        validatedRequest,
        figureResult,
        figureFailure,
        nestExport,
        nestOptions,
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
      import figure = require('cortexel/figure');
      import renderSvg = require('cortexel/render-svg');
      import nestAdapter = require('cortexel/adapters/nest');
      import react = require('cortexel/react');
      import charts = require('cortexel/react/charts');
      import graph = require('cortexel/react/knowledge-graph');
      const build: typeof cortexel.buildVizSpec = core.buildVizSpec;
      const graphOptions = {} as core.ConnectionGraphOptions;
      const delayOptions = {} as core.DelayDistributionOptions;
      const spatialOptions = {} as core.SpatialMap2DOptions;
      const topologyResult = {} as core.NestTopologyResult<core.WeightMatrixParams>;
      const assurance = {} as figure.InputAssurance;
      const validatedRequest = {} as figure.ValidatedRequest;
      const figureResult = {} as renderSvg.FigureResult;
      const figureFailure = {} as renderSvg.FigureFailure;
      const nestExport = {} as nestAdapter.NestSpikeExport;
      const nestOptions = {} as nestAdapter.NestSpikeOptions;
      const checkedRequest = figure.parseAndValidateRequest('{}');
      if (checkedRequest.ok) renderSvg.buildFigureFromValidated(checkedRequest.request);
      // @ts-expect-error the raw serializer is intentionally compiler-internal
      void renderSvg.renderSvg;
      // @ts-expect-error resource accounting is intentionally compiler-internal
      void renderSvg.countPlanResources;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatNumber;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatCoordinate;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatWithUnit;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvg.linearScale;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvg.linearTicks;
      // @ts-expect-error callers cannot import a plan-construction grammar
      type ForbiddenRenderPlan = renderSvg.RenderPlanV1;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenPanel = renderSvg.Panel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenMark = renderSvg.Mark;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAxis = renderSvg.Axis;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenTableModel = renderSvg.TableModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAccessibilityModel = renderSvg.AccessibilityModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenDisclosureBlock = renderSvg.DisclosureBlock;
      // @ts-expect-error callers cannot import the raw serializer report
      type ForbiddenSvgReport = renderSvg.SvgReport;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenLinearScale = renderSvg.LinearScale;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenTick = renderSvg.Tick;
      // @ts-expect-error the package export map encapsulates built implementation files
      type ForbiddenDeepRenderModule = typeof import('cortexel/dist/render-svg/index.cjs');
      // @ts-expect-error the shared capability registry is package-private
      type ForbiddenCapabilityModule = typeof import('cortexel/internal/request-capability');
      // @ts-expect-error package imports do not leak into the consumer package scope
      type ForbiddenPrivateImport = typeof import('#cortexel-request-capability');
      void [
        build,
        figure.getBuildIdentity,
        figure.parseAndValidateRequest,
        renderSvg.buildFigure,
        renderSvg.buildFigureFromJson,
        renderSvg.buildFigureFromValidated,
        nestAdapter.nestSpikeRecorderToRaster,
        assurance,
        validatedRequest,
        figureResult,
        figureFailure,
        nestExport,
        nestOptions,
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
