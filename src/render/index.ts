/**
 * `cortexel/render-svg` — deterministic, headless figure rendering.
 *
 * This entry renders without React, without a browser, without WebGL, and without
 * network access. A server, a CI job, or an agent can turn a validated request into a
 * normative SVG plus a table and an artifact. Byte determinism is scoped to the
 * documented build/runtime tuple; cross-platform identity remains a separate release
 * evidence gate.
 * The package installs this implementation at the additive `cortexel/render-svg`
 * subpath; it does not replace any legacy React renderer.
 *
 * Only end-to-end builders are public. The raw RenderPlan model, resource accounting,
 * formatting/scaling primitives, and SVG serializer remain compiler-internal so a
 * caller cannot bypass validation or the final OutputAuthority translation gate.
 */

export {
  buildFigure,
  buildFigureFromJson,
  buildFigureFromValidated,
  type FigureResult,
  type FigureFailure,
} from './buildFigure.js';
