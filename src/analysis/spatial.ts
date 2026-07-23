/**
 * Public analysis-surface re-export of the pure-core spatial numeric authority.
 *
 * The implementation lives in core so the independently derived output-authority model
 * and the renderer consume one registered endpoint/membership/routing algorithm without
 * importing one another.
 */
export * from '../core/spatial.js';
