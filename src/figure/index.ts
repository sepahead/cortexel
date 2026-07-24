/**
 * `cortexel/figure` — the pure FigureRequestV1 contract and validation surface.
 *
 * This capability-named entry is additive. The package root and `cortexel/core`
 * continue to expose the pre-1.0 VizSpec API; callers opt into the versioned figure
 * contract explicitly through this subpath. It loads no React, Three, R3F, D3, browser,
 * or network module.
 */

export * from '../core/index.js';
