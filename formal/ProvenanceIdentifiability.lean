/-
Copyright (c) 2026 Cortexel contributors.

Two small non-identifiability results behind the legacy VizSpec provenance gate.
They are deliberately about information, not implementation:

* an adjacent-delta predicate is vacuously true for a one-sample time axis, so
  one timestamp cannot establish any sampling interval; and
* observed identifiers can be a strict subset of more than one source universe,
  so endpoints/events alone cannot establish the complete recorded universe.
* nevertheless, a positive aggregate connection count is inconsistent with a
  declared empty source or target universe.

The TypeScript gate therefore requires at least two strictly ordered timestamps
for a sampling-interval binding and classifies complete-universe identities as
external claims unless the checked payload carries that universe explicitly.
-/

namespace Cortexel.ProvenanceIdentifiability

/-- A mathematical model of checking one interval against every adjacent pair. -/
def regularWithInterval (interval : Nat) : List Nat → Prop
  | [] => True
  | [_] => True
  | left :: right :: rest =>
      right = left + interval ∧ regularWithInterval interval (right :: rest)

/--
Every candidate interval satisfies an adjacent-delta predicate on a singleton.
Consequently, accepting one timestamp as evidence would not identify an interval.
-/
theorem singleton_regular_for_every_interval (time interval : Nat) :
    regularWithInterval interval [time] := by
  simp [regularWithInterval]

/--
Two distinct positive intervals are observationally indistinguishable on a
singleton under the adjacent-delta predicate.
-/
theorem singleton_cannot_identify_interval
    (time first second : Nat)
    (different : first ≠ second) :
    regularWithInterval first [time] ∧
      regularWithInterval second [time] ∧
      first ≠ second := by
  exact ⟨singleton_regular_for_every_interval time first,
    singleton_regular_for_every_interval time second, different⟩

abbrev IdCollection := Nat → Prop

def compatibleUniverse (observed candidate : IdCollection) : Prop :=
  ∀ id, observed id → candidate id

def insertId (collection : IdCollection) (fresh : Nat) : IdCollection :=
  fun id => collection id ∨ id = fresh

/--
Whenever an identifier was not observed, both the observed set itself and its
strict extension by that identifier are compatible complete-universe candidates.
Observed events/endpoints therefore do not uniquely determine source membership.
-/
theorem observed_ids_do_not_determine_complete_universe
    (observed : IdCollection)
    (fresh : Nat)
    (notObserved : ¬ observed fresh) :
    ∃ first second : IdCollection,
      compatibleUniverse observed first ∧
      compatibleUniverse observed second ∧
      first ≠ second := by
  refine ⟨observed, insertId observed fresh, ?_, ?_, ?_⟩
  · intro id present
    exact present
  · intro id present
    exact Or.inl present
  · intro equalCollections
    have equalAtFresh := congrFun equalCollections fresh
    have insertedFresh : insertId observed fresh fresh := Or.inr rfl
    rw [← equalAtFresh] at insertedFresh
    exact notObserved insertedFresh

/--
The exact cardinality claim made by the portable
`nonempty_if_positive` relation: an empty evidence set imposes no lower bound,
while positive aggregate evidence requires at least one declared endpoint.
-/
def nonemptyIfPositive (evidenceCount endpointCount : Nat) : Prop :=
  evidenceCount = 0 ∨ 0 < endpointCount

/--
`nonemptyIfPositive` is equivalent to the implication exposed by the contract;
it neither requires endpoint identity nor overstates the endpoint count.
-/
theorem nonemptyIfPositive_iff
    (evidenceCount endpointCount : Nat) :
    nonemptyIfPositive evidenceCount endpointCount ↔
      (0 < evidenceCount → 0 < endpointCount) := by
  constructor
  · intro condition positiveEvidence
    rcases condition with noEvidence | nonemptyEndpoint
    · exact False.elim ((Nat.ne_of_gt positiveEvidence) noEvidence)
    · exact nonemptyEndpoint
  · intro implication
    rcases Nat.eq_zero_or_pos evidenceCount with noEvidence | positiveEvidence
    · exact Or.inl noEvidence
    · exact Or.inr (implication positiveEvidence)

/--
The contradiction closed by the runtime and portable manifest evaluators:
positive aggregate evidence cannot satisfy the relation with zero declared
endpoints.
-/
theorem positive_evidence_rejects_empty_endpoint
    (evidenceCount : Nat)
    (positiveEvidence : 0 < evidenceCount) :
    ¬ nonemptyIfPositive evidenceCount 0 := by
  rw [nonemptyIfPositive_iff]
  intro implication
  exact Nat.lt_irrefl 0 (implication positiveEvidence)

end Cortexel.ProvenanceIdentifiability
