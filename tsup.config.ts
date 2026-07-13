import { defineConfig } from 'tsup';

// Five entry points so consumers can pull the dependency-free `core` without
// dragging in three/react. Peers are externalized — never bundled.
export default defineConfig({
  entry: {
    index: 'index.ts',
    'core/index': 'core/index.ts',
    'react/index': 'react/index.ts',
    // Canonical scientific charts are React + SVG only. Keep them on a
    // dependency-isolated subpath so an agent/report host does not need three,
    // r3f, or d3 merely to render a checked 2D figure.
    'react/charts': 'react/charts/index.ts',
    // The knowledge-graph scene is the only one needing d3-force-3d, so it ships
    // as its own subpath (cortexel/react/knowledge-graph) — keeps the base react
    // entry d3-free and the "optional" d3-force-3d peer honest.
    'react/knowledge-graph': 'react/KnowledgeGraph3DScene.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Consumer bundlers still tree-shake (`sideEffects:false`). tsup's secondary
  // Rollup treeshake pass duplicates sourceMappingURL trailers on every output;
  // keeping the build at esbuild's module graph yields clean, equivalent files.
  treeshake: false,
  external: [
    'react',
    'react/jsx-runtime',
    'three',
    '@react-three/fiber',
    'd3-force-3d',
    'zod',
  ],
});
