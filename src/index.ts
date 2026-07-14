/**
 * `cortexel` — the root entry.
 *
 * The root re-exports ONLY the pure core. A server-side `import "cortexel"` therefore
 * never reaches React, Three, D3, or a browser API. The rendering and experimental
 * surfaces live behind their own explicit subpaths (`cortexel/render-svg`,
 * `cortexel/react`, `cortexel/experimental/*`), so choosing them is deliberate rather
 * than accidental.
 */

export * from './core/index.js';
