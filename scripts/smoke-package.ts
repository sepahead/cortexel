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
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function') {
          throw new Error('ESM core exports are incomplete');
        }
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
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function') {
          throw new Error('CJS core exports are incomplete');
        }
        if (!Array.isArray(manifest.skills) || manifest.skills.length !== 14 ||
            manifest.manifestVersion !== '4' || manifest.skillAxisVersion !== '1.2.0') {
          throw new Error('manifest export is missing or incomplete');
        }
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
      'three@>=0.184 <0.186',
      '@react-three/fiber@^9.6',
      'd3-force-3d@^3.0.5',
      'typescript@^5.9',
      '@types/node@^20',
      '@types/react@^19',
      '@types/react-dom@^19',
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
                typeof graph.KnowledgeGraph3DScene !== 'function') {
              throw new Error('ESM React exports are incomplete');
            }
          `
        : `
            const react = require('cortexel/react');
            const graph = require('cortexel/react/knowledge-graph');
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function') {
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
      import { validateHostRendererSpec } from 'cortexel/core';
      import {
        NeuronA11yPager,
        PopulationA11yList,
        VizSpecRenderer,
        type RenderSceneArgs,
      } from 'cortexel/react';
      import {
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
      } from 'cortexel/react/knowledge-graph';

      const authored = buildVizSpec({
        skill: 'nest.spike_raster',
        params: { times_ms: [1], senders: [1] },
        source: 'type-smoke',
      });
      const args = {} as RenderSceneArgs;
      void [
        authored,
        args.skill,
        validateHostRendererSpec,
        VizSpecRenderer,
        PopulationA11yList,
        NeuronA11yPager,
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
      ];
    `,
  );
  writeFileSync(
    join(consumer, 'consumer.cts'),
    `
      import cortexel = require('cortexel');
      import core = require('cortexel/core');
      import react = require('cortexel/react');
      import graph = require('cortexel/react/knowledge-graph');
      const build: typeof cortexel.buildVizSpec = core.buildVizSpec;
      void [build, react.VizSpecRenderer, graph.KnowledgeGraph3DScene];
    `,
  );
  run(join(consumer, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.json'], consumer);

  // Guard that the packed manifest is the built one we just exercised.
  const packageJson = JSON.parse(
    readFileSync(join(consumer, 'node_modules/cortexel/package.json'), 'utf8'),
  ) as { version: string };
  console.log(`[cortexel] package smoke passed for ${packageJson.version}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
