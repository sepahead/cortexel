/**
 * `cortexel/render-svg` — deterministic, headless figure rendering.
 *
 * This entry renders without React, without a browser, without WebGL, and without
 * network access. A server, a CI job, or an agent can turn a validated request into a
 * normative SVG plus a table and an artifact, and get the same bytes every time.
 */

export {
  buildFigure,
  buildFigureFromJson,
  buildFigureFromValidated,
  type FigureResult,
  type FigureFailure,
} from './buildFigure.js';

export { countPlanResources, renderSvg, type SvgReport } from './svg.js';

export type {
  RenderPlanV1,
  Panel,
  Mark,
  Axis,
  TableModel,
  AccessibilityModel,
  DisclosureBlock,
} from './model/renderPlan.js';

export { formatNumber, formatCoordinate, formatWithUnit } from './format.js';
export { linearScale, linearTicks, type LinearScale, type Tick } from './scale.js';
