"""Elephant reference oracle for Cortexel golden vectors.

INDEPENDENCE IS THE POINT. This module must never import the Cortexel Python package,
never call the Node implementation, and never read a Cortexel-generated output. A
golden value produced by the code under test is a tautology, not evidence.

It is INTENTIONALLY not executed as part of this repository's tests. Producing real
vectors requires the pinned reference environment (Elephant 1.2.1 on the versions in
reference/README.md), which neither the 0.9.0 release record nor the current development
tree has executed. Until that environment runs, the corresponding evidence-ledger gates
stay NOT_RUN and no contract claims its oracle passed.

The bin-edge, t_stop, and normalization conventions below are written to MATCH
Cortexel's documented conventions parameter for parameter. A comparison against an
oracle configured differently would compare two different questions and prove nothing.
"""

from __future__ import annotations

# These imports are deliberately at module scope. If Elephant / Neo / Quantities are not
# installed, importing this module fails loudly — which is correct, because running the
# oracle without the pinned environment would silently produce meaningless "goldens".
try:
    import numpy as np
    import quantities as pq
    from neo.core import SpikeTrain
    from elephant.statistics import time_histogram, isi
    from elephant.spike_train_correlation import cross_correlation_histogram
    from elephant.conversion import BinnedSpikeTrain
except ImportError as exc:  # pragma: no cover - only meaningful in the pinned env
    raise SystemExit(
        "reference/oracles/elephant.py requires the pinned reference environment "
        "(Elephant 1.2.1, Neo 0.14.5, Quantities, NumPy). It is not run by the normal "
        "test suite; see reference/README.md."
    ) from exc


def rate_histogram(spike_times_ms, t_start_ms, t_stop_ms, bin_ms, recorded_sender_count):
    """Population rate via Elephant's time_histogram, matched to Cortexel's convention.

    Cortexel: half-open bins, mean-per-recorded-sender normalization, rate in Hz.
    Elephant's time_histogram returns counts; the per-sender Hz normalization is applied
    here explicitly so the comparison is like-for-like.
    """
    train = SpikeTrain(
        np.asarray(spike_times_ms) * pq.ms,
        t_start=t_start_ms * pq.ms,
        t_stop=t_stop_ms * pq.ms,
    )
    hist = time_histogram([train], bin_size=bin_ms * pq.ms, output="counts")
    counts = np.asarray(hist.magnitude).flatten().astype(int)
    bin_s = bin_ms / 1000.0
    rate_hz = counts / (recorded_sender_count * bin_s)
    return {"counts": counts.tolist(), "rate_hz": rate_hz.tolist()}


def isi_intervals(spike_times_ms):
    """Within-train ISIs. Elephant's isi() operates on ONE train, which is exactly the
    within-train property Cortexel enforces; a caller must group by sender first."""
    train = np.asarray(spike_times_ms) * pq.ms
    return np.asarray(isi(train).magnitude).tolist()


def cross_correlogram(ref_ms, tgt_ms, t_start_ms, t_stop_ms, bin_ms, window_bins):
    """Cross-correlation histogram, with Cortexel's lag orientation.

    Cortexel: lag = target - reference, positive lag means target follows reference.
    Elephant's CCH lag sign must be reconciled to that orientation when comparing.
    """
    ref = BinnedSpikeTrain(
        SpikeTrain(np.asarray(ref_ms) * pq.ms, t_start=t_start_ms * pq.ms, t_stop=t_stop_ms * pq.ms),
        bin_size=bin_ms * pq.ms,
    )
    tgt = BinnedSpikeTrain(
        SpikeTrain(np.asarray(tgt_ms) * pq.ms, t_start=t_start_ms * pq.ms, t_stop=t_stop_ms * pq.ms),
        bin_size=bin_ms * pq.ms,
    )
    cch, lags = cross_correlation_histogram(ref, tgt, window=[-window_bins, window_bins])
    return {
        "lags": np.asarray(lags).tolist(),
        "counts": np.asarray(cch.magnitude).flatten().tolist(),
        "note": "Elephant lag convention must be reconciled to target-minus-reference before comparison.",
    }
