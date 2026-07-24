# Future Pearson lag-correlation skill — design record

**Status: exploratory; not release ready.** This record freezes a boundary for later
work. It does not add a capability, schema, validator, renderer, migration target, or
release claim. Revision 2 of `neuro.correlogram` accepts only exact pair counts and
target rate per reference event.

## Separate scientific product

A Pearson lag correlation answers a different question from an event-pair
correlogram. It operates on two explicitly binned count series and divides a centred
cross-product by overlap-specific variances. Pair counts cannot recover those
carriers or denominators. The future design must therefore use a separate skill id,
renderer contract, accessibility table, semantic validator, and capability record;
it must not be added as a statistic branch of `neuro.correlogram`.

## Frozen minimum shape

- Input carriers are two complete, parallel, exact non-negative integer binned-count
  series over one typed, exactly tiled observation window. Counts versus binarized
  occupancy must not be a caller switch in one product; if occupancy is ever
  supported it needs its own identified derivation.
- Lag rows are keyed by an integer shift, never by a floating-point lag. Physical lag
  is derived exactly once as `shift * binWidth` through the unit layer. Positive shift
  means the target series follows the reference series.
- Each shift uses only its valid overlapping index pairs. Zero padding is forbidden.
  The overlap size and the two overlap-specific means and sums of squared deviations
  are derivation receipts, not caller-supplied conclusions.
- A coefficient is a nullable value with a required closed status. The defined status
  requires at least two overlapping bins and two positive finite variance terms. An
  undefined row is `null` with one exact reason such as `insufficient_overlap`,
  `zero_reference_variance`, `zero_target_variance`, or `both_variances_zero`; it is
  never zero, `NaN`, or an omitted row.
- Partial definition is valid: one shift may be defined while another is null. The
  table and geometry must preserve every requested integer shift and visibly encode
  undefined rows without inventing a mark at zero.
- The output makes no event-pair, candidate-pair, out-of-range-pair, zero-lag
  self-pair, or same-event-exclusion claim. Those statements belong only to the
  ordered-event-pair algorithm and would be false provenance for binned-series
  Pearson correlation.

## Evidence required before release

Release requires an executable derivation independent of the renderer; exact
hand-computable vectors for constant, sparse, shifted, anti-correlated, asymmetric,
and partially undefined series; property tests for role-swap mirroring and affine
invariance where variance remains positive; fault injection for padding, shift-sign,
global-mean, global-variance, and zero-denominator substitutions; table/summary/mark
parity for null rows; deterministic cross-runtime vectors; and a reconciled external
oracle whose window, overlap, centring, variance convention, and units match exactly.
Until all of those gates exist, the product remains absent from the catalog.
