/-
Copyright (c) 2026 Cortexel contributors.

Formal core of the complete-returned-table row preflight.  `saturate limit n`
retains an exact row count through `limit` and uses `limit + 1` as the sole
over-budget sentinel.  The compiler may therefore stop after any carrier class
reaches the sentinel: adding later non-negative carrier counts cannot bring the
request back under budget, and incremental saturation is extensionally equal to
saturating the exact sum once.
-/

import Lean.Elab.Tactic.Omega

namespace Cortexel.WeightRowSaturation

def saturate (limit count : Nat) : Nat :=
  min count (limit + 1)

theorem saturate_le_sentinel (limit count : Nat) :
    saturate limit count ≤ limit + 1 := by
  simp only [saturate]
  omega

theorem saturate_preserves_iff_at_most_sentinel (limit count : Nat) :
    saturate limit count = count ↔ count ≤ limit + 1 := by
  simp only [saturate]
  omega

inductive RowCountResult where
  | exact (count : Nat)
  | overBudget
  deriving DecidableEq, Repr

def classify (limit count : Nat) : RowCountResult :=
  if count ≤ limit then .exact count else .overBudget

theorem classify_exact_iff (limit count exactCount : Nat) :
    classify limit count = .exact exactCount ↔ count = exactCount ∧ count ≤ limit := by
  unfold classify
  split
  case isTrue bounded => simp [bounded]
  case isFalse notBounded =>
    constructor
    · intro impossible
      cases impossible
    · rintro ⟨rfl, bounded⟩
      exact (notBounded bounded).elim

theorem classify_overBudget_iff (limit count : Nat) :
    classify limit count = .overBudget ↔ limit < count := by
  simp only [classify]
  split <;> simp_all

theorem saturate_is_sentinel_iff (limit count : Nat) :
    saturate limit count = limit + 1 ↔ limit < count := by
  simp only [saturate]
  omega

theorem classify_from_saturation (limit count : Nat) :
    classify limit count =
      if saturate limit count = limit + 1
        then .overBudget
        else .exact (saturate limit count) := by
  simp only [classify, saturate]
  split <;> split <;> simp_all <;> omega

theorem saturate_add_left (limit left right : Nat) :
    saturate limit (left + right) =
      saturate limit (saturate limit left + right) := by
  simp only [saturate]
  omega

theorem saturate_add_right (limit left right : Nat) :
    saturate limit (left + right) =
      saturate limit (left + saturate limit right) := by
  simp only [saturate]
  omega

theorem sentinel_absorbs_add (limit extra : Nat) :
    saturate limit (limit + 1 + extra) = limit + 1 := by
  simp [saturate]

/-!
Once the already-counted source carriers fit, handing the aggregate-grid
preflight exactly the remaining budget is neither stronger nor weaker than
checking the combined count.  The `sourceRows ≤ limit` hypothesis matters for
natural-number subtraction: without it, `limit - sourceRows` truncates to zero
after the request is already over budget.
-/
theorem grid_exceeds_remaining_iff_combined_exceeds
    (limit sourceRows gridRows : Nat)
    (sourceWithinBudget : sourceRows ≤ limit) :
    limit - sourceRows < gridRows ↔ limit < sourceRows + gridRows := by
  omega

def saturatedSum (limit : Nat) : List Nat → Nat
  | [] => 0
  | count :: rest => saturate limit (count + saturatedSum limit rest)

theorem saturatedSum_correct (limit : Nat) (counts : List Nat) :
    saturatedSum limit counts = saturate limit counts.sum := by
  induction counts with
  | nil => simp [saturatedSum, saturate]
  | cons count rest inductionHypothesis =>
      simp only [saturatedSum, List.sum_cons, inductionHypothesis]
      exact (saturate_add_right limit count rest.sum).symm

theorem saturated_partition_fold
    (limit sourceRows aggregateRows stateWitnessRows initialStateRows : Nat) :
    saturatedSum limit
      [sourceRows, aggregateRows, stateWitnessRows, initialStateRows] =
      saturate limit
        (sourceRows + aggregateRows + stateWitnessRows + initialStateRows) := by
  rw [saturatedSum_correct]
  simp only [List.sum_cons, List.sum_nil, Nat.add_zero]
  congr 1
  omega

theorem classify_saturatedSum_overBudget_iff (limit : Nat) (counts : List Nat) :
    classify limit counts.sum = .overBudget ↔
      saturatedSum limit counts = limit + 1 := by
  rw [classify_overBudget_iff, saturatedSum_correct, saturate_is_sentinel_iff]

end Cortexel.WeightRowSaturation
