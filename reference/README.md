# `reference/` — the independent scientific oracle

This directory generates golden vectors from established reference libraries so that
Cortexel's analysis can be certified against something OTHER than itself.

The independence is the entire point, and it is enforced structurally: this project
must never import the Cortexel Python package, never call the Node implementation, and
never read a Cortexel-generated output while producing an expected value. A "golden"
computed by the code under test is not a golden — it is a tautology.

## The three layers of evidence

1. **Hand vectors** (in `test/analysis.test.ts`) — arithmetic you can check on paper.
   Mandatory for every formula. Two libraries can share a convention error; hand
   arithmetic cannot. This is the floor.

2. **Independent library vectors** (here) — NEST and Elephant, pinned to exact
   versions. These catch a mistake in Cortexel that a hand vector was too small to
   reveal.

3. **Cross-implementation** — TypeScript and Python agree on the same corpus.

The layers stack. An external vector never replaces a hand vector.

## Honest current status (unchanged since 0.9.0)

**No pinned reference environment has been executed in this repository.**

The corresponding evidence-ledger gates are recorded as `NOT_RUN`, and every skill
contract's `evidence.externalOracle.status` is `not_run`. That is not an oversight; it
is the honest state. Producing these vectors requires installing NEST 3.10.0, Elephant
1.2.1, Neo 0.14.5, and PyNWB 4.0.0 in a clean, pinned environment and running the
generator below. Neither the `0.9.0` release record nor the current development tree
contains a receipt from that environment.

A generated vector must never be committed with a `passed` status until it was actually
produced by the pinned oracle and reviewed. Claiming an oracle passed without a receipt
is precisely the failure this whole project exists to prevent.

## Intended layout (to be populated when the environment is available)

```
reference/
├── pyproject.toml            # pins NEST 3.10.0, Elephant 1.2.1, Neo 0.14.5, PyNWB 4.0.0
├── requirements.lock         # fully locked transitive dependencies
├── generate_vectors.py       # one-way: writes test/golden/vectors/, never reads Cortexel
└── oracles/
    ├── elephant.py           # rate, histogram, ISI, PSTH, cross-correlation
    └── nest_topology.py       # single-rank and multi-rank connection snapshots
```

## Certification target versions (pin exactly; re-verify before any RC)

| Upstream | Target version | Role |
|---|---|---|
| NEST Simulator | 3.10.0 | Recorder / connection / MPI-scope fixtures |
| Elephant | 1.2.1 | Rate, histogram, ISI, PSTH, correlation |
| Neo | 0.14.5 | SpikeTrain / AnalogSignal object model |
| PyNWB | 4.0.0 | Units / TimeSeries |

These are the versions the blueprint observed current on 2026-07-14. They are
observations, not eternal ranges: pin, test, and publish the exact matrix, and
re-verify immediately before a release candidate.
