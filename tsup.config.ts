import path from 'node:path';

import { defineConfig, type Options } from 'tsup';

const REQUEST_CAPABILITY_SOURCE = path.resolve(import.meta.dirname, 'src/core/request.ts');
const REQUEST_CAPABILITY_SPECIFIER = '#cortexel-request-capability';
const KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SOURCE = path.resolve(
  import.meta.dirname,
  'react/knowledgeGraphPresentation.internal.ts',
);
const KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SPECIFIER =
  '#cortexel-knowledge-graph-presentation-capability';

/**
 * Validated requests and prepared graph presentations are identity capabilities,
 * each backed by a module-private WeakSet. Bundling either authority module into
 * public entries would create multiple registries (especially for CommonJS), so
 * every public bundle resolves those source imports to one package-private CommonJS
 * runtime module. ESM and CommonJS can both load the same CJS module-cache entry;
 * no forgeable global symbol is involved.
 */
const capabilityExternalizer: NonNullable<Options['esbuildPlugins']>[number] = {
  name: 'cortexel-shared-capabilities',
  setup(build) {
    build.onResolve({
      filter: /(?:request|knowledgeGraphPresentation\.internal)(?:\.js)?$/,
    }, (args) => {
      if (args.kind === 'entry-point' || args.importer.length === 0) return undefined;
      const typescriptPath = args.path.endsWith('.js')
        ? args.path.replace(/\.js$/u, '.ts')
        : `${args.path}.ts`;
      const sourcePath = path.resolve(
        path.dirname(args.importer),
        typescriptPath,
      );
      if (sourcePath === REQUEST_CAPABILITY_SOURCE) {
        return { path: REQUEST_CAPABILITY_SPECIFIER, external: true };
      }
      if (sourcePath === KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SOURCE) {
        return {
          path: KNOWLEDGE_GRAPH_PRESENTATION_CAPABILITY_SPECIFIER,
          external: true,
        };
      }
      return undefined;
    });
  },
};

// Legacy entry points remain byte-for-byte addressable while capability-named
// FigureRequestV1 entries are added alongside them. Peers are externalized — never
// bundled — and the pure/headless entries have package-smoke import-graph guards.
export default defineConfig({
  entry: {
    index: 'index.ts',
    'core/index': 'core/index.ts',
    'figure/index': 'src/figure/index.ts',
    'authoring/index': 'src/authoring/index.ts',
    'render-svg/index': 'src/render/index.ts',
    'adapters/nest/index': 'src/adapters/nest/index.ts',
    'knowledge-graph/index': 'src/knowledge-graph/index.ts',
    'cli/main': 'src/cli/main.ts',
    // One type-only nominal identity shared by import/require declaration graphs.
    'internal/validated-request-brand': 'src/core/validated-request-brand.ts',
    // Private runtime singleton: package `imports` points both module formats to
    // this CJS file, while the public `exports` map keeps it off the API surface.
    'internal/request-capability': 'src/core/request.ts',
    'internal/knowledge-graph-presentation-capability':
      'react/knowledgeGraphPresentation.internal.ts',
    'internal/knowledge-graph-presentation-brand':
      'src/core/knowledge-graph-presentation-brand.ts',
    'react/index': 'react/index.ts',
    // Canonical scientific charts are React + SVG only. Keep them on a
    // dependency-isolated subpath so an agent/report host does not need three,
    // r3f, or d3 merely to render a checked 2D figure.
    'react/charts': 'react/charts/index.ts',
    // The knowledge-graph scene is the only one needing d3-force-3d, so it ships
    // as its own subpath (cortexel/react/knowledge-graph) — keeps the base react
    // entry d3-free and the "optional" d3-force-3d peer honest.
    'react/knowledge-graph': 'react/knowledgeGraphPublic.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // The FigureRequest validator locates installed contract data relative to its
  // module. ESM needs tsup's import.meta.url-derived __dirname shim; CommonJS keeps
  // Node's native __dirname. This avoids a cwd-dependent or network schema lookup.
  shims: true,
  // Consumer bundlers still tree-shake (`sideEffects:false`). tsup's secondary
  // Rollup treeshake pass duplicates sourceMappingURL trailers on every output;
  // keeping the build at esbuild's module graph yields clean, equivalent files.
  treeshake: false,
  esbuildPlugins: [capabilityExternalizer],
  external: [
    '#cortexel-knowledge-graph-presentation-brand',
    '#cortexel-validated-request-brand',
    'react',
    'react/jsx-runtime',
    'three',
    '@react-three/fiber',
    'd3-force-3d',
    'zod',
  ],
});
