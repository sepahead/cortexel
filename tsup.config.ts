import { defineConfig } from 'tsup';

// Three entry points so consumers can pull the dependency-free `core` without
// dragging in three/react. Peers are externalized — never bundled.
export default defineConfig({
  entry: {
    index: 'index.ts',
    'core/index': 'core/index.ts',
    'react/index': 'react/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'react',
    'react/jsx-runtime',
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    'zod',
  ],
});
