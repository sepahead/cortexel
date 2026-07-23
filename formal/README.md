# Formal checks

The small proofs in this directory cover bounded arithmetic or state invariants
whose failure would invalidate a fail-closed resource decision. They complement,
but do not replace, executable property tests over the TypeScript implementation.

The repository pins Lean in [`../lean-toolchain`](../lean-toolchain). With `elan`
installed, run:

```sh
lean formal/WeightRowSaturation.lean
```

`WeightRowSaturation.lean` proves that folding non-negative carrier counts with
the returned-table sentinel `limit + 1` is extensionally equal to summing exact
counts and saturating once. It also proves that the sentinel absorbs every later
non-negative carrier contribution. Its explicit `RowCountResult` distinguishes
`exact n` (provably only `n <= limit`) from `overBudget` (provably every
`n > limit`): the numeric sentinel is never exposed as an accepted exact count.

These theorems concern natural-number arithmetic only. They do not establish that
the TypeScript compiler's six carrier classes are disjoint and exhaustive, that
its preparation pass terminates, or that binary64/JavaScript arithmetic implements
the same function. Executable property and parity tests must establish those
integration obligations under safe-integer guards.
