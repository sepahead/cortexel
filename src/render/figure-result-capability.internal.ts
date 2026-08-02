/**
 * One package-private built-figure capability surface.
 *
 * The package build externalizes every public producer/consumer import of this file
 * to one CommonJS module-cache entry. Only the complete checked builders can mint a
 * result; this module deliberately re-exports no unchecked registration function.
 */

export {
  assertLiveBuiltFigureResult,
  buildFigure,
  buildFigureFromJson,
  buildFigureFromValidated,
  isLiveBuiltFigureResult,
  type FigureFailure,
  type FigureResult,
} from './buildFigure.js';
