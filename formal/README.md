# Formal checks

The small proofs in this directory cover bounded arithmetic or state invariants
whose failure would invalidate a fail-closed resource decision. They complement,
but do not replace, executable property tests over the TypeScript implementation.

The repository pins Lean in [`../lean-toolchain`](../lean-toolchain). With `elan`
installed, run:

```sh
bun run check:formal
```

The root [`lakefile.toml`](../lakefile.toml) names every formal module and the
committed [`lake-manifest.json`](../lake-manifest.json) fixes the dependency
closure (currently empty). The package publication lifecycle and CI's pinned
Lean setup action both run the same warning-fatal `lake build --wfail` command:
publication invokes it through `bun run check:formal`, while CI invokes the
underlying command directly.

`WeightRowSaturation.lean` proves that folding non-negative carrier counts with
the returned-table sentinel `limit + 1` is extensionally equal to summing exact
counts and saturating once. It also proves that the sentinel absorbs every later
non-negative carrier contribution. Its explicit `RowCountResult` distinguishes
`exact n` (provably only `n <= limit`) from `overBudget` (provably every
`n > limit`): the numeric sentinel is never exposed as an accepted exact count.

`ProvenanceIdentifiability.lean` proves two information limits and one consistency
law used by the legacy VizSpec gate: an adjacent-delta regularity predicate accepts every
candidate interval on a singleton time axis, and an observed identifier set is
compatible with both itself and a strict source-universe extension whenever an
unobserved identifier exists. These results justify requiring at least two
strictly ordered timestamps before binding a sampling interval and keeping
complete sender/source/target universes externally disclosed unless the checked
payload actually retains them. It also proves that a positive aggregate count is
inconsistent with a declared zero-cardinality endpoint universe without claiming
to recover any endpoint identity.

These theorems concern abstract natural-number observations only. They do not
establish that the TypeScript compiler's six carrier classes are disjoint and
exhaustive, that its preparation pass terminates, or that binary64/JavaScript
arithmetic implements the same function. Executable property and parity tests
must establish those integration obligations under safe-integer guards.
